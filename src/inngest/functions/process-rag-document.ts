/**
 * Inngest Function: Process RAG Document (Multi-Pass Pipeline)
 *
 * 6-Pass extraction pipeline:
 *   Pass 1: Structure Analysis (Sonnet 4.5) — document type + section map
 *   Pass 2: Policy Extraction (Sonnet 4.5) — rules, exceptions, limits per section
 *   Pass 3: Table Extraction (Sonnet 4.5) — structured table data
 *   Pass 4: Glossary & Entities (Haiku) — definitions, entities, relationships
 *   Pass 5: Narrative Facts (Sonnet 4.5) — implicit facts from prose sections
 *   Pass 6: Verification (Opus 4.6) — find missed facts per section
 *
 * After extraction:
 *   - Relationship linking (code-only)
 *   - Expert questions storage
 *   - Contextual preamble generation (Haiku)
 *   - Enriched 3-tier embedding generation (OpenAI)
 *   - Status update
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import {
  storeSectionsFromStructure,
  storeExtractedFacts,
  linkFactRelationships,
  findTableRegions,
  policyResultToFacts,
  tableResultToFacts,
  glossaryResultToFacts,
} from '@/lib/rag/services/rag-ingestion-service';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings, buildEnrichedEmbeddingText } from '@/lib/rag/services/rag-embedding-service';
import { mapRowToDocument, mapRowToSection, mapRowToFact } from '@/lib/rag/services/rag-db-mappers';
import { RAG_CONFIG } from '@/lib/rag/config';
import type { FactExtraction, StructureAnalysisResult } from '@/types/rag';

export const processRAGDocument = inngest.createFunction(
  {
    id: 'process-rag-document',
    name: 'Process RAG Document (Multi-Pass)',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'rag/document.uploaded' },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;
    const supabase = createServerSupabaseAdminClient();
    const provider = new ClaudeLLMProvider();

    console.log(`[Inngest] Starting multi-pass pipeline for ${documentId}`);

    // ========================================
    // Step 0: Fetch document and validate
    // ========================================
    const doc = await step.run('fetch-document', async () => {
      const { data: docRow, error } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !docRow) throw new Error('Document not found');

      // Verify document ownership before processing
      if (docRow.user_id !== userId) {
        throw new Error(`[Inngest] Document ${documentId} does not belong to user ${userId} — aborting`);
      }

      const doc = mapRowToDocument(docRow);
      if (!doc.originalText) throw new Error('Document has no extracted text');

      // Update status
      await supabase
        .from('rag_documents')
        .update({ status: 'processing', processing_started_at: new Date().toISOString() })
        .eq('id', documentId);

      return {
        id: doc.id,
        userId: doc.userId,
        fileName: doc.fileName,
        originalText: doc.originalText,
        workbaseId: doc.workbaseId,
        fastMode: doc.fastMode,
      };
    });

    // ========================================
    // Step 1: Pass 1 — Structure Analysis (Sonnet 4.5)
    // ========================================
    const structure = await step.run('pass-1-structure', async () => {
      console.log(`[Inngest] Pass 1: Analyzing document structure...`);
      const result = await provider.analyzeDocumentStructure({
        documentText: doc.originalText,
        fileName: doc.fileName,
      });

      // Store document type
      await supabase
        .from('rag_documents')
        .update({ document_type: result.documentType })
        .eq('id', documentId);

      console.log(`[Inngest] Pass 1 complete: ${result.sections.length} sections, type=${result.documentType}`);
      return result;
    });

    // ========================================
    // Step 2: Store sections from structure
    // ========================================
    const sections = await step.run('store-sections', async () => {
      console.log(`[Inngest] Storing ${structure.sections.length} sections...`);
      const stored = await storeSectionsFromStructure(
        documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult, doc.workbaseId
      );
      console.log(`[Inngest] Stored ${stored.length} sections`);
      return stored.map(s => ({ id: s.id, title: s.title, originalText: s.originalText, sectionMetadata: s.sectionMetadata }));
    });

    // ========================================
    // Step 3: Pass 2 — Policy Extraction (Sonnet 4.5)
    // One step.run() per section — each is independently checkpointed.
    // ========================================
    const policyFacts: FactExtraction[] = [];
    if (structure.documentType !== 'tabular') {
      console.log(`[Inngest] Pass 2: Extracting policies from ${sections.length} sections...`);
      for (const section of sections) {
        const sectionFacts = await step.run(`pass-2-policy-${section.id}`, async () => {
          const policyId = (section.sectionMetadata as any)?.policyId || null;
          try {
            const result = await provider.extractPoliciesForSection({
              sectionText: section.originalText,
              sectionTitle: section.title || 'Untitled',
              policyId,
              documentType: structure.documentType,
            });
            const facts = policyResultToFacts(result, section.title || 'Untitled');
            await storeExtractedFacts(documentId, doc.userId, section.id, facts, doc.workbaseId);
            console.log(`[Inngest] Pass 2: ${section.title}: ${facts.length} facts`);
            return facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 2 error for "${section.title}":`, err);
            return [] as FactExtraction[];
          }
        });
        policyFacts.push(...(sectionFacts as FactExtraction[]));
      }
      console.log(`[Inngest] Pass 2 complete: ${policyFacts.length} total policy facts`);
    } else {
      console.log(`[Inngest] Pass 2: Skipped (tabular document)`);
    }

    // ========================================
    // Step 4: Pass 3 — Table Extraction (Sonnet 4.5)
    // One step.run() per table — each is independently checkpointed.
    // allTableRegions is computed outside steps (pure function, no LLM).
    // ========================================
    const tableFacts: FactExtraction[] = [];
    if (structure.documentType !== 'narrative') {
      // Compute table regions outside any step — pure deterministic function
      const detectedTables = findTableRegions(doc.originalText);
      const allTableRegions = [
        ...structure.tables,
        ...detectedTables.filter(dt =>
          !structure.tables.some(st =>
            Math.abs(st.startLine - dt.startLine) < 3
          )
        ),
      ];

      console.log(`[Inngest] Pass 3: Extracting ${allTableRegions.length} tables...`);
      const lines = doc.originalText.split('\n');

      for (let tableIdx = 0; tableIdx < allTableRegions.length; tableIdx++) {
        const table = allTableRegions[tableIdx];
        const tableLines = lines.slice(
          Math.max(0, table.startLine - 1),
          Math.min(lines.length, table.endLine)
        );
        const tableText = tableLines.join('\n');
        const contextBefore = lines.slice(
          Math.max(0, table.startLine - 6),
          Math.max(0, table.startLine - 1)
        ).join('\n');
        const contextAfter = lines.slice(
          Math.min(lines.length, table.endLine),
          Math.min(lines.length, table.endLine + 5)
        ).join('\n');

        const tblFacts = await step.run(`pass-3-table-${tableIdx}`, async () => {
          // Guard: skip empty or near-empty table content to avoid wasted LLM calls
          const rawContent = tableText?.trim() ?? '';
          if (rawContent.length < 10) {
            console.log(
              `[Inngest] Pass 3: Table ${tableIdx} at line ${table.startLine} — ` +
              `empty content (${rawContent.length} chars), skipping LLM call`
            );
            return [] as FactExtraction[];
          }

          try {
            const result = await provider.extractTableData({
              tableText,
              surroundingContext: `${contextBefore}\n[TABLE]\n${contextAfter}`,
              documentType: structure.documentType,
            });
            const facts = tableResultToFacts(result);
            const sectionId = findSectionForLine(sections as any, structure as any, table.startLine);
            await storeExtractedFacts(documentId, doc.userId, sectionId, facts, doc.workbaseId);
            console.log(`[Inngest] Pass 3: Table "${result.tableName}": ${facts.length} rows`);
            return facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 3 error for table at line ${table.startLine}:`, err);
            return [] as FactExtraction[];
          }
        });
        tableFacts.push(...(tblFacts as FactExtraction[]));
      }
      console.log(`[Inngest] Pass 3 complete: ${tableFacts.length} total table facts`);
    } else {
      console.log(`[Inngest] Pass 3: Skipped (narrative document)`);
    }

    // ========================================
    // Step 5: Pass 4 — Glossary & Entities (Haiku)
    // ========================================
    const glossaryFacts = await step.run('pass-4-glossary', async () => {
      console.log(`[Inngest] Pass 4: Extracting glossary, entities, relationships...`);

      try {
        const result = await provider.extractGlossaryAndRelationships({
          documentText: doc.originalText,
          existingSections: structure.sections.map(s => ({
            title: s.title,
            policyId: s.policyId,
          })),
        });

        const facts = glossaryResultToFacts(result);
        await storeExtractedFacts(documentId, doc.userId, null, facts, doc.workbaseId);

        console.log(`[Inngest] Pass 4 complete: ${result.definitions.length} definitions, ${result.entities.length} entities, ${result.relationships.length} relationships`);
        return facts;
      } catch (err) {
        console.error(`[Inngest] Pass 4 FAILED (glossary extraction) — skipping and continuing pipeline:`, err instanceof Error ? err.message : String(err));
        console.warn(`[Inngest] Pass 4: Returning empty glossary facts. Retrieval quality may be reduced.`);
        return [] as FactExtraction[];
      }
    });

    // ========================================
    // Step 6: Pass 5 — Narrative Facts (Sonnet 4.5)
    // One step.run() per narrative section — each is independently checkpointed.
    // narrativeSections filter is computed outside steps (pure logic).
    // ========================================

    // Determine which sections get narrative extraction (pure logic, no LLM)
    const narrativeSections = sections.filter(s => {
      const meta = s.sectionMetadata as any;
      if (structure.documentType === 'narrative') return true;
      if (structure.documentType === 'structured-policy') return meta?.isNarrative === true;
      if (structure.documentType === 'mixed') return meta?.isNarrative === true;
      if (structure.documentType === 'tabular') return false;
      return false;
    });

    const narrativeFacts: FactExtraction[] = [];
    if (narrativeSections.length > 0) {
      console.log(`[Inngest] Pass 5: Extracting narrative facts from ${narrativeSections.length} sections...`);
      for (const section of narrativeSections) {
        const sectionFacts = await step.run(`pass-5-narrative-${section.id}`, async () => {
          try {
            const result = await provider.extractNarrativeFacts({
              sectionText: section.originalText,
              sectionTitle: section.title || 'Untitled',
              documentType: structure.documentType,
            });
            await storeExtractedFacts(documentId, doc.userId, section.id, result.facts, doc.workbaseId);
            console.log(`[Inngest] Pass 5: "${section.title}": ${result.facts.length} narrative facts`);
            return result.facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 5 error for "${section.title}":`, err);
            return [] as FactExtraction[];
          }
        });
        narrativeFacts.push(...(sectionFacts as FactExtraction[]));
      }
      console.log(`[Inngest] Pass 5 complete: ${narrativeFacts.length} total narrative facts`);
    } else {
      console.log(`[Inngest] Pass 5: No narrative sections to process`);
    }

    // ========================================
    // Step 7: Pass 6 — Verification (Opus 4.6)
    // One step.run() per section — each is independently checkpointed.
    // Each step queries DB for existing facts and runs Opus 4.6 verification.
    // ========================================
    console.log(`[Inngest] Pass 6: Running Opus 4.6 verification on ${sections.length} sections...`);
    const verificationFacts: FactExtraction[] = [];

    for (const section of sections) {
      const sectionFacts = await step.run(`pass-6-verify-${section.id}`, async () => {
        // Gather all facts already extracted for this section
        const { data: existingFactRows } = await supabase
          .from('rag_facts')
          .select('*')
          .eq('document_id', documentId)
          .eq('section_id', section.id);

        const existingFacts: FactExtraction[] = (existingFactRows || []).map(row => ({
          factType: row.fact_type as any,
          content: row.content,
          sourceText: row.source_text || '',
          confidence: row.confidence,
          factCategory: row.fact_category || undefined,
          subsection: row.subsection || undefined,
        }));

        try {
          const result = await provider.verifyExtractionCompleteness({
            sectionText: section.originalText,
            sectionTitle: section.title || 'Untitled',
            existingFacts,
            documentType: structure.documentType,
          });

          if (result.missingFacts.length > 0) {
            await storeExtractedFacts(documentId, doc.userId, section.id, result.missingFacts, doc.workbaseId);
            console.log(`[Inngest] Pass 6: "${section.title}": found ${result.missingFacts.length} missed facts (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
            return result.missingFacts;
          } else {
            console.log(`[Inngest] Pass 6: "${section.title}": complete (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
            return [] as FactExtraction[];
          }
        } catch (err) {
          console.warn(`[Inngest] Pass 6 error for "${section.title}":`, err);
          return [] as FactExtraction[];
        }
      });
      verificationFacts.push(...(sectionFacts as FactExtraction[]));
    }

    console.log(`[Inngest] Pass 6 complete: ${verificationFacts.length} recovery facts`);

    // ========================================
    // Step 8: Relationship Linking (code-only)
    // ========================================
    await step.run('link-relationships', async () => {
      console.log(`[Inngest] Linking fact relationships...`);
      await linkFactRelationships(documentId);
    });

    // ========================================
    // Step 9: Expert Questions Storage
    // ========================================
    await step.run('store-expert-questions', async () => {
      if (structure.expertQuestions.length === 0) return;
      console.log(`[Inngest] Storing ${structure.expertQuestions.length} expert questions...`);

      const records = structure.expertQuestions.map((q, index) => ({
        document_id: documentId,
        user_id: doc.userId,
        question_text: q.questionText,
        question_reason: q.questionReason,
        impact_level: q.impactLevel,
        sort_order: index,
        skipped: false,
      }));

      await supabase.from('rag_expert_questions').insert(records);
    });

    // ========================================
    // Step 10: Contextual Preambles (Haiku)
    // One step.run() per section — each is independently checkpointed.
    // ========================================
    console.log(`[Inngest] Generating contextual preambles for ${sections.length} sections...`);

    for (const section of sections) {
      await step.run(`generate-preamble-${section.id}`, async () => {
        try {
          const preambleResult = await provider.generateContextualPreamble({
            documentSummary: structure.summary,
            sectionText: section.originalText.slice(0, 2000),
            sectionTitle: section.title || undefined,
          });

          await supabase
            .from('rag_sections')
            .update({ contextual_preamble: preambleResult.preamble })
            .eq('id', section.id);
        } catch (err) {
          console.warn(`[Inngest] Preamble error for "${section.title}":`, err);
        }
      });
    }

    // ========================================
    // Step 11: Generate Enriched Embeddings
    // ========================================
    const embeddingCount = await step.run('generate-embeddings', async () => {
      console.log(`[Inngest] Generating enriched 3-tier embeddings...`);

      // Delete any existing embeddings (handles retry — clear previous attempt's embeddings)
      await deleteDocumentEmbeddings(documentId);

      // Mark any previous in-progress embedding run records as failed (handles retry)
      await supabase
        .from('rag_embedding_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('document_id', documentId)
        .eq('status', 'running');

      // Create new embedding run record
      const embeddingRunId = crypto.randomUUID();
      const { error: runCreateError } = await supabase
        .from('rag_embedding_runs')
        .insert({
          id: embeddingRunId,
          document_id: documentId,
          user_id: doc.userId,
          embedding_count: 0,
          embedding_model: RAG_CONFIG.embedding.model,
          status: 'running',
          pipeline_version: 'multi-pass',
          started_at: new Date().toISOString(),
          metadata: {
            section_count: sections.length,
            document_file_name: doc.fileName,
          },
        });

      if (runCreateError) {
        console.warn('[Inngest] Failed to create embedding run record:', runCreateError);
        // Non-fatal — continue without run tracking (matches pattern in rag-ingestion-service.ts)
      }

      // Fetch all current sections and facts
      const { data: sectionRows } = await supabase
        .from('rag_sections')
        .select('*')
        .eq('document_id', documentId);
      const currentSections = (sectionRows || []).map(mapRowToSection);

      const { data: factRows } = await supabase
        .from('rag_facts')
        .select('*')
        .eq('document_id', documentId)
        .limit(10000);
      const currentFacts = (factRows || []).map(mapRowToFact);

      const embeddingItems: Array<{
        sourceType: 'document' | 'section' | 'fact';
        sourceId: string;
        contentText: string;
        tier: 1 | 2 | 3;
      }> = [];

      // Tier 1: Document-level
      embeddingItems.push({
        sourceType: 'document',
        sourceId: documentId,
        contentText: `${structure.summary}\n\nTopics: ${structure.topicTaxonomy.join(', ')}`,
        tier: 1,
      });

      // Tier 2: Section-level (contextual preamble + summary)
      for (const section of currentSections) {
        const embeddingText = section.contextualPreamble
          ? `${section.contextualPreamble}\n\n${section.summary || section.originalText.slice(0, 2000)}`
          : section.summary || section.originalText.slice(0, 2000);
        embeddingItems.push({
          sourceType: 'section',
          sourceId: section.id,
          contentText: embeddingText,
          tier: 2,
        });
      }

      // Tier 3: Fact-level (enriched with provenance context)
      for (const fact of currentFacts) {
        embeddingItems.push({
          sourceType: 'fact',
          sourceId: fact.id,
          contentText: buildEnrichedEmbeddingText(fact),
          tier: 3,
        });
      }

      const result = await generateAndStoreBatchEmbeddings({
        documentId,
        userId: doc.userId,
        workbaseId: doc.workbaseId || undefined,
        runId: embeddingRunId,
        items: embeddingItems,
      });

      // Update embedding run record with final status
      if (!runCreateError) {
        await supabase
          .from('rag_embedding_runs')
          .update({
            embedding_count: embeddingItems.length,
            status: result.success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', embeddingRunId);
      }

      // Gap detection: compare tier-3 embeddings against actual DB count (not fetched count)
      const { count: actualFactCount } = await supabase
        .from('rag_facts')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);
      const tier3Count = embeddingItems.filter(e => e.tier === 3).length;
      const actualGap = (actualFactCount ?? 0) - tier3Count;
      if (actualGap > 0) {
        console.warn(
          `[RAG Embedding] WARNING: ${actualGap} facts have no embedding ` +
          `(${actualFactCount} total facts, ${tier3Count} tier-3 embeddings generated). ` +
          `Check that fact fetch uses .limit(10000).`
        );
      } else {
        console.log(`[Inngest] Embedding coverage: ${actualFactCount} facts → ${tier3Count} tier-3 embeddings (100%)`);
      }

      console.log(`[Inngest] Generated ${embeddingItems.length} embeddings (run: ${embeddingRunId.slice(0, 8)})`);
      return embeddingItems.length;
    });

    // ========================================
    // Step 12: Finalize
    // ========================================
    await step.run('finalize', async () => {
      // Count facts
      const { count: factCount } = await supabase
        .from('rag_facts')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const { count: sectionCount } = await supabase
        .from('rag_sections')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      // Only mark as ready/awaiting_questions if embeddings were generated.
      // embeddingCount is 0 when the generate-embeddings step failed or was skipped.
      const finalStatus = embeddingCount === 0
        ? 'processing'
        : (doc.fastMode ? 'ready' : 'awaiting_questions');

      await supabase
        .from('rag_documents')
        .update({
          status: finalStatus,
          processing_completed_at: new Date().toISOString(),
          document_summary: structure.summary,
          topic_taxonomy: structure.topicTaxonomy,
          ambiguity_list: structure.ambiguities,
          section_count: sectionCount || 0,
          fact_count: factCount || 0,
          question_count: structure.expertQuestions.length,
          total_tokens_estimated: Math.ceil(doc.originalText.length / 4),
        })
        .eq('id', documentId);

      console.log(`[Inngest] ========================================`);
      console.log(`[Inngest] PIPELINE COMPLETE: ${doc.fileName}`);
      console.log(`[Inngest]   Status: ${finalStatus}`);
      console.log(`[Inngest]   Sections: ${sectionCount}`);
      console.log(`[Inngest]   Facts: ${factCount}`);
      console.log(`[Inngest]   Embeddings: ${embeddingCount}`);
      console.log(`[Inngest] ========================================`);
    });

    return { success: true, documentId };
  }
);

/**
 * Find the section ID that contains a given line number.
 */
function findSectionForLine(
  sections: Array<{ id: string; sectionMetadata: any }>,
  structure: StructureAnalysisResult,
  lineNumber: number
): string | null {
  for (let i = 0; i < structure.sections.length; i++) {
    const s = structure.sections[i];
    if (lineNumber >= s.startLine && lineNumber <= s.endLine) {
      return sections[i]?.id || null;
    }
  }
  return null;
}
