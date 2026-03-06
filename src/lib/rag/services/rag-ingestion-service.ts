import * as crypto from 'crypto';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings, buildEnrichedEmbeddingText } from './rag-embedding-service';
import { mapRowToDocument, mapRowToSection, mapRowToFact, mapRowToQuestion } from './rag-db-mappers';
import type {
  RAGDocument,
  RAGSection,
  RAGFact,
  RAGExpertQuestion,
  DocumentUnderstanding,
  // Multi-pass types (Phase 1)
  StructureAnalysisResult,
  PolicyExtractionResult,
  TableExtractionResult,
  GlossaryExtractionResult,
  FactExtraction,
  RAGFactType,
  RAGDocumentType,
} from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Ingestion Service
// ============================================
// Handles document upload, text extraction, LLM processing, and knowledge storage.
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Document Upload & Registration
// ============================================

export async function createDocumentRecord(params: {
  workbaseId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  filePath?: string;
  description?: string;
  fastMode?: boolean;
}): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('rag_documents')
      .insert({
        workbase_id: params.workbaseId,
        user_id: params.userId,
        file_name: params.fileName,
        file_type: params.fileType,
        file_size_bytes: params.fileSizeBytes || null,
        file_path: params.filePath || null,
        storage_bucket: RAG_CONFIG.storage.bucket,
        description: params.description || null,
        fast_mode: params.fastMode || false,
        status: 'uploading',
        section_count: 0,
        fact_count: 0,
        question_count: 0,
        version: 1,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating document record:', error);
      return { success: false, error: error.message };
    }

    await supabase.rpc('increment_kb_doc_count', { kb_id: params.workbaseId });

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception creating document record:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create document' };
  }
}

// ============================================
// Text Extraction
// ============================================

export async function extractDocumentText(params: {
  documentId: string;
  fileContent: Buffer | string;
  fileType: string;
}): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const { fileContent, fileType } = params;
    let text = '';

    switch (fileType) {
      case 'txt':
      case 'md':
        text = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
        break;

      case 'pdf': {
        // Use pdf-parse for PDF text extraction
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileContent);
        text = pdfData.text;
        break;
      }

      case 'docx': {
        // Use mammoth for DOCX text extraction
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileContent });
        text = result.value;
        break;
      }

      default:
        return { success: false, error: `Unsupported file type: ${fileType}` };
    }

    if (!text || text.trim().length === 0) {
      return { success: false, error: 'No text content could be extracted from the document' };
    }

    return { success: true, text: text.trim() };
  } catch (err) {
    console.error('Exception extracting text:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to extract text' };
  }
}

// ============================================
// Upload File to Storage
// ============================================

export async function uploadDocumentFile(params: {
  userId: string;
  documentId: string;
  file: Buffer;
  fileName: string;
  fileType: string;
}): Promise<{ success: boolean; filePath?: string; text?: string; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const filePath = `${params.userId}/${params.documentId}/${params.fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(RAG_CONFIG.storage.bucket)
      .upload(filePath, params.file, {
        contentType: getContentType(params.fileType),
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Extract text
    const extraction = await extractDocumentText({
      documentId: params.documentId,
      fileContent: params.file,
      fileType: params.fileType,
    });

    if (!extraction.success || !extraction.text) {
      return { success: false, error: extraction.error || 'Failed to extract text' };
    }

    // Update document record with file path, extracted text, AND content hash
    const contentHash = generateContentHash(extraction.text);
    await supabase
      .from('rag_documents')
      .update({
        file_path: filePath,
        file_size_bytes: params.file.length,
        original_text: extraction.text,
        content_hash: contentHash,
        status: 'processing',
      })
      .eq('id', params.documentId);

    return { success: true, filePath, text: extraction.text };
  } catch (err) {
    console.error('Exception uploading file:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to upload file' };
  }
}

function getContentType(fileType: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  return types[fileType] || 'application/octet-stream';
}

// ============================================
// Full Document Processing Pipeline
// ============================================

export async function processDocument(documentId: string): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  const supabase = createServerSupabaseAdminClient();

  try {
    // Step 1: Get document record
    const { data: docRow, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !docRow) {
      return { success: false, error: 'Document not found' };
    }

    const doc = mapRowToDocument(docRow);

    if (!doc.originalText) {
      return { success: false, error: 'Document has no extracted text. Upload the file first.' };
    }

    // Step 2: Update status to processing
    await supabase
      .from('rag_documents')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('id', documentId);

    const docLengthChars = doc.originalText.length;
    const estimatedTokens = Math.ceil(docLengthChars / 4);

    console.log(`[RAG Ingestion] Processing document: ${doc.fileName} (${documentId})`);
    console.log(`[RAG Ingestion] Document size: ${docLengthChars} chars, ~${estimatedTokens} tokens`);

    // Warn if document is very large
    if (estimatedTokens > 150000) {
      console.warn(`[RAG Ingestion] WARNING: Document is very large (${estimatedTokens} tokens). Processing may take 2-5 minutes.`);
    }

    // Step 3: Send to LLM for document understanding
    console.log(`[RAG Ingestion] Step 3/9: Calling Claude LLM for document understanding...`);
    const provider = getLLMProvider();
    let understanding: DocumentUnderstanding;

    try {
      understanding = await provider.readDocument({
        documentText: doc.originalText,
        fileName: doc.fileName,
        description: doc.description || undefined,
      });
    } catch (llmError) {
      const errorMessage = llmError instanceof Error ? llmError.message : 'LLM processing failed';
      console.error('[RAG Ingestion] LLM processing failed:', errorMessage);
      console.error('[RAG Ingestion] Full error object:', llmError);

      // Store detailed error information in the database
      await supabase
        .from('rag_documents')
        .update({
          status: 'error',
          processing_error: errorMessage,
          // Store additional debug info in document_metadata if available
          document_metadata: {
            error_timestamp: new Date().toISOString(),
            error_type: 'llm_processing_error',
            error_details: errorMessage,
            document_length: doc.originalText?.length || 0,
          },
        })
        .eq('id', documentId);

      return {
        success: false,
        error: `LLM document processing failed: ${errorMessage}. Check Vercel logs for full Claude response.`
      };
    }

    console.log(`[RAG Ingestion] Step 3/9: ✓ Claude response received. Sections: ${understanding.sections.length}, Facts: ${understanding.facts.length}`);

    // Step 4: Store sections
    console.log(`[RAG Ingestion] Step 4/9: Storing ${understanding.sections.length} sections in database...`);
    const sectionRecords = understanding.sections.map((section, index) => ({
      document_id: documentId,
      user_id: doc.userId,
      section_index: index,
      title: section.title,
      original_text: section.originalText,
      summary: section.summary,
      token_count: section.tokenCount,
      section_metadata: {},
    }));

    const { data: insertedSections, error: sectionError } = await supabase
      .from('rag_sections')
      .insert(sectionRecords)
      .select('*');

    if (sectionError) {
      console.error('[RAG Ingestion] Error storing sections:', sectionError);
      await supabase.from('rag_documents').update({ status: 'error', processing_error: 'Failed to store sections' }).eq('id', documentId);
      return { success: false, error: 'Failed to store document sections' };
    }

    const sections = (insertedSections || []).map(mapRowToSection);
    console.log(`[RAG Ingestion] Step 4/9: ✓ Stored ${sections.length} sections`);

    // Step 5: Generate contextual preambles for each section (Contextual Retrieval)
    console.log(`[RAG Ingestion] Step 5/9: Generating contextual preambles for ${sections.length} sections...`);
    for (const section of sections) {
      try {
        const preambleResult = await provider.generateContextualPreamble({
          documentSummary: understanding.summary,
          sectionText: section.originalText,
          sectionTitle: section.title || undefined,
        });

        await supabase
          .from('rag_sections')
          .update({ contextual_preamble: preambleResult.preamble })
          .eq('id', section.id);

        section.contextualPreamble = preambleResult.preamble;
      } catch (preambleError) {
        console.warn(`[RAG Ingestion] Preamble generation failed for section ${section.id}:`, preambleError);
        // Continue — preambles are enhancement, not critical
      }
    }

    console.log(`[RAG Ingestion] Step 5/9: ✓ Generated preambles for ${sections.length} sections`);

    // Step 6: Store facts
    console.log(`[RAG Ingestion] Step 6/9: Storing ${understanding.facts.length} facts...`);
    const factRecords = understanding.facts.map(fact => ({
      document_id: documentId,
      user_id: doc.userId,
      fact_type: fact.factType,
      content: fact.content,
      source_text: fact.sourceText,
      confidence: fact.confidence,
      metadata: {},
    }));

    const { data: insertedFacts, error: factError } = await supabase
      .from('rag_facts')
      .insert(factRecords)
      .select('*');

    if (factError) {
      console.warn('[RAG Ingestion] Error storing facts:', factError);
      // Continue — facts enhance quality but aren't critical
    }

    const facts = (insertedFacts || []).map(mapRowToFact);
    console.log(`[RAG Ingestion] Step 6/9: ✓ Stored ${facts.length} facts`);

    // Step 7: Store expert questions
    console.log(`[RAG Ingestion] Step 7/9: Storing ${understanding.expertQuestions.length} expert questions...`);
    const questionRecords = understanding.expertQuestions.map((q, index) => ({
      document_id: documentId,
      user_id: doc.userId,
      question_text: q.questionText,
      question_reason: q.questionReason,
      impact_level: q.impactLevel,
      sort_order: index,
      skipped: false,
    }));

    const { error: questionError } = await supabase
      .from('rag_expert_questions')
      .insert(questionRecords);

    if (questionError) {
      console.warn('[RAG Ingestion] Error storing questions:', questionError);
    }

    console.log(`[RAG Ingestion] Step 7/9: ✓ Stored ${understanding.expertQuestions.length} questions`);

    // Step 8: Generate embeddings at all three tiers
    console.log('[RAG Ingestion] Step 8/9: Generating embeddings for document, sections, and facts...');

    // Create an embedding run record
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
        pipeline_version: 'single-pass',
        started_at: new Date().toISOString(),
        metadata: {
          section_count: sections.length,
          fact_count: facts.length,
          document_file_name: doc.fileName,
        },
      });

    if (runCreateError) {
      console.warn('[RAG Ingestion] Failed to create embedding run record:', runCreateError);
      // Non-fatal — continue without run tracking
    }

    const embeddingItems: Array<{
      sourceType: 'document' | 'section' | 'fact';
      sourceId: string;
      contentText: string;
      tier: 1 | 2 | 3;
    }> = [];

    // Tier 1: Document-level embedding (summary + taxonomy)
    embeddingItems.push({
      sourceType: 'document',
      sourceId: documentId,
      contentText: `${understanding.summary}\n\nTopics: ${understanding.topicTaxonomy.join(', ')}`,
      tier: 1,
    });

    // Tier 2: Section-level embeddings (contextual preamble + summary)
    for (const section of sections) {
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

    // Tier 3: Fact-level embeddings (enriched with provenance context for better precision)
    for (const fact of facts) {
      embeddingItems.push({
        sourceType: 'fact',
        sourceId: fact.id,
        contentText: buildEnrichedEmbeddingText(fact),
        tier: 3,
      });
    }

    const embeddingResult = await generateAndStoreBatchEmbeddings({
      documentId,
      userId: doc.userId,
      runId: embeddingRunId,
      items: embeddingItems,
    });

    if (!embeddingResult.success) {
      console.warn('[RAG Ingestion] Embedding generation had errors:', embeddingResult.error);
    } else {
      console.log(`[RAG Ingestion] Step 8/9: ✓ Generated ${embeddingItems.length} embeddings`);
    }

    // Gap detection: verify every fact got a tier-3 embedding
    const factCount = facts.length;
    const tier3Count = embeddingItems.filter(e => e.tier === 3).length;
    const embeddingGap = factCount - tier3Count;
    if (embeddingGap > 0) {
      console.warn(`[RAG Embedding] WARNING: ${embeddingGap} facts have no embedding (${factCount} facts, ${tier3Count} tier-3 embeddings)`);
    }

    // Update embedding run record with final status
    await supabase
      .from('rag_embedding_runs')
      .update({
        embedding_count: embeddingItems.length,
        status: embeddingResult.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', embeddingRunId);

    // Step 9: Update document with processing results
    console.log('[RAG Ingestion] Step 9/9: Updating document status to completed...');
    const finalStatus = doc.fastMode ? 'ready' : 'awaiting_questions';

    const { data: updatedDoc, error: updateError } = await supabase
      .from('rag_documents')
      .update({
        status: finalStatus,
        processing_completed_at: new Date().toISOString(),
        document_summary: understanding.summary,
        topic_taxonomy: understanding.topicTaxonomy,
        entity_list: understanding.entities,
        ambiguity_list: understanding.ambiguities,
        section_count: sections.length,
        fact_count: facts.length,
        question_count: understanding.expertQuestions.length,
        total_tokens_estimated: Math.ceil(doc.originalText.length / 4),
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[RAG Ingestion] Error updating document:', updateError);
      return { success: false, error: 'Failed to update document status' };
    }

    console.log(`[RAG Ingestion] Step 9/9: ✓ Document processing complete!`);
    console.log(`[RAG Ingestion] ========================================`);
    console.log(`[RAG Ingestion] SUCCESS: ${doc.fileName}`);
    console.log(`[RAG Ingestion]   Status: ${finalStatus}`);
    console.log(`[RAG Ingestion]   Sections: ${sections.length}`);
    console.log(`[RAG Ingestion]   Facts: ${facts.length}`);
    console.log(`[RAG Ingestion]   Questions: ${understanding.expertQuestions.length}`);
    console.log(`[RAG Ingestion]   Embeddings: ${embeddingItems.length}`);
    console.log(`[RAG Ingestion] ========================================`);
    return { success: true, data: mapRowToDocument(updatedDoc) };
  } catch (err) {
    console.error('[RAG Ingestion] Exception in processDocument:', err);
    await supabase
      .from('rag_documents')
      .update({ status: 'error', processing_error: err instanceof Error ? err.message : 'Unknown error' })
      .eq('id', documentId);
    return { success: false, error: err instanceof Error ? err.message : 'Document processing failed' };
  }
}

// ============================================
// Get Documents for Knowledge Base
// ============================================

export async function getDocuments(params: {
  workbaseId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGDocument[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('workbase_id', params.workbaseId)
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToDocument) };
  } catch (err) {
    console.error('Exception fetching documents:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch documents' };
  }
}

// ============================================
// Get Document by ID
// ============================================

export async function getDocument(
  documentId: string,
  userId: string
): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Document not found' };
    }

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception fetching document:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch document' };
  }
}

// ============================================
// Document Fingerprinting (Phase 1)
// ============================================

/**
 * Generate SHA-256 content hash for duplicate detection.
 */
function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ============================================
// Multi-Pass Ingestion Helpers (Phase 1)
// ============================================

/**
 * Store sections by slicing the original document text using Pass 1 line boundaries.
 * This is the KEY optimization: sections are sliced from the source text,
 * NOT echoed back by the LLM, saving ~18K output tokens.
 *
 * NOTE: Uses workbase_id (renamed from knowledge_base_id).
 * Build fingerprint: 2026-03-01T09:32Z — forces chunk recompile.
 */
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult,
  workbaseId?: string
): Promise<RAGSection[]> {
  console.log(`[RAG Ingestion] storeSectionsFromStructure: inserting ${structure.sections.length} sections with workbase_id=${workbaseId || 'null'} (build: 2026-03-01)`);
  const supabase = createServerSupabaseAdminClient();
  const lines = originalText.split('\n');

  const sectionRecords = structure.sections.map((section, index) => {
    // Slice original text using line boundaries from Pass 1
    const sectionLines = lines.slice(
      Math.max(0, section.startLine - 1),  // 1-indexed to 0-indexed
      Math.min(lines.length, section.endLine)
    );
    const sectionText = sectionLines.join('\n');

    return {
      document_id: documentId,
      user_id: userId,
      workbase_id: workbaseId || null,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
    };
  });

  const { data: insertedSections, error } = await supabase
    .from('rag_sections')
    .insert(sectionRecords)
    .select('*');

  if (error) {
    console.error('[RAG Ingestion] Error storing sections:', error);
    throw new Error(`Failed to store sections: ${error.message}`);
  }

  return (insertedSections || []).map(mapRowToSection);
}

/**
 * Convert PolicyExtractionResult into flat FactExtraction array for storage.
 */
export function policyResultToFacts(
  result: PolicyExtractionResult,
  sectionTitle: string
): FactExtraction[] {
  const facts: FactExtraction[] = [];

  for (const rule of result.rules) {
    facts.push({
      factType: 'policy_rule',
      content: `${rule.ruleId}: ${rule.content}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      ruleId: rule.ruleId,
      factCategory: 'rule',
      subsection: sectionTitle,
    });

    // Extract limits as separate facts from rule amounts
    for (const amount of rule.amounts) {
      facts.push({
        factType: 'limit',
        content: `${rule.ruleId} amount: ${amount}`,
        sourceText: `From ${sectionTitle} (${result.policyId}), ${rule.ruleId}`,
        confidence: 0.95,
        policyId: result.policyId,
        ruleId: rule.ruleId,
        factCategory: 'limit',
        subsection: sectionTitle,
      });
    }
  }

  for (const exc of result.exceptions) {
    facts.push({
      factType: 'policy_exception',
      content: `${exc.exceptionId}: ${exc.content}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      qualifiesRule: exc.qualifiesRule,
      factCategory: 'exception',
      subsection: sectionTitle,
    });
  }

  for (const limit of result.limits) {
    facts.push({
      factType: 'limit',
      content: `${limit.name}: ${limit.value} ${limit.unit} (${limit.window})`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'limit',
      subsection: sectionTitle,
    });
  }

  for (const doc of result.requiredDocuments) {
    facts.push({
      factType: 'required_document',
      content: `${doc.scenario}: ${doc.documents.join(', ')}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'required_document',
      subsection: sectionTitle,
    });
  }

  for (const esc of result.escalations) {
    facts.push({
      factType: 'escalation_path',
      content: `${esc.trigger}: ${esc.levels.join(' → ')}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'escalation',
      subsection: sectionTitle,
    });
  }

  for (const af of result.auditFields) {
    facts.push({
      factType: 'audit_field',
      content: `${af.fieldName}: ${af.description}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.90,
      policyId: result.policyId,
      factCategory: 'audit_field',
      subsection: sectionTitle,
    });
  }

  for (const rel of result.relatedPolicies) {
    facts.push({
      factType: 'cross_reference',
      content: `${result.policyId} → ${rel.policyId}: ${rel.relationship}`,
      sourceText: `From ${sectionTitle}`,
      confidence: 0.90,
      policyId: result.policyId,
      factCategory: 'cross_reference',
      subsection: sectionTitle,
    });
  }

  for (const def of result.definitions) {
    facts.push({
      factType: 'definition',
      content: `${def.term}: ${def.definition}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'definition',
      subsection: sectionTitle,
    });
  }

  return facts;
}

/**
 * Convert TableExtractionResult into flat FactExtraction array.
 */
export function tableResultToFacts(result: TableExtractionResult): FactExtraction[] {
  return result.rows.map(row => {
    const content = result.columns
      .map(col => `${col}: ${row[col] || ''}`)
      .join(', ');

    return {
      factType: 'table_row' as RAGFactType,
      content,
      sourceText: `From table "${result.tableName}" (${result.tableContext})`,
      confidence: 0.95,
      factCategory: 'table_entry',
      subsection: result.tableContext,
    };
  });
}

/**
 * Convert GlossaryExtractionResult into flat FactExtraction array.
 */
export function glossaryResultToFacts(result: GlossaryExtractionResult): FactExtraction[] {
  const facts: FactExtraction[] = [];

  for (const def of result.definitions) {
    facts.push({
      factType: 'definition',
      content: `${def.term}: ${def.definition}`,
      sourceText: `Glossary — ${def.policyContext}`,
      confidence: 0.95,
      factCategory: 'definition',
    });
  }

  for (const entity of result.entities) {
    facts.push({
      factType: 'entity',
      content: `${entity.name} (${entity.type}): ${entity.description}`,
      sourceText: 'Entity extraction',
      confidence: 0.90,
      factCategory: 'entity',
    });
  }

  for (const rel of result.relationships) {
    facts.push({
      factType: 'relationship',
      content: `${rel.from} → ${rel.to} (${rel.type}): ${rel.description}`,
      sourceText: 'Relationship extraction',
      confidence: 0.85,
      factCategory: 'cross_reference',
    });
  }

  return facts;
}

// Allowed fact_type values matching the rag_facts_fact_type_check DB constraint.
// Must stay in sync with RAGFactType in src/types/rag.ts and the DB constraint.
const ALLOWED_RAG_FACT_TYPES = new Set<string>([
  'fact', 'entity', 'definition', 'relationship', 'table_row',
  'policy_exception', 'policy_rule', 'limit', 'threshold',
  'required_document', 'escalation_path', 'audit_field',
  'cross_reference', 'narrative_fact',
]);

/**
 * Store extracted facts with provenance fields.
 * Replaces the simple fact insertion in the current processDocument().
 */
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[],
  workbaseId?: string
): Promise<RAGFact[]> {
  if (facts.length === 0) return [];

  const invalidFacts = facts.filter(f => !ALLOWED_RAG_FACT_TYPES.has(f.factType));
  if (invalidFacts.length > 0) {
    console.warn(
      `[RAG Ingestion] storeExtractedFacts: ${invalidFacts.length} facts had invalid factType ` +
      `and were normalized to "fact": ` +
      invalidFacts.map(f => `"${f.factType}"`).join(', ')
    );
  }

  const supabase = createServerSupabaseAdminClient();

  const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    workbase_id: workbaseId || null,
    fact_type: ALLOWED_RAG_FACT_TYPES.has(fact.factType) ? fact.factType : 'fact',
    content: fact.content,
    source_text: fact.sourceText,
    confidence: fact.confidence,
    metadata: {},
    policy_id: fact.policyId || null,
    rule_id: fact.ruleId || null,
    subsection: fact.subsection || null,
    fact_category: fact.factCategory || null,
  }));

  const { data: insertedFacts, error } = await supabase
    .from('rag_facts')
    .insert(records)
    .select('*');

  if (error) {
    console.warn('[RAG Ingestion] Error storing facts:', error);
    return [];
  }

  return (insertedFacts || []).map(mapRowToFact);
}

/**
 * Pass 6.5 (code-only): Link related facts by matching rule IDs.
 * - Exceptions → their qualifying rules (via qualifiesRule → ruleId match)
 * No LLM calls — pure database operations.
 */
export async function linkFactRelationships(documentId: string): Promise<void> {
  const supabase = createServerSupabaseAdminClient();

  // Fetch all facts for this document
  const { data: factRows, error } = await supabase
    .from('rag_facts')
    .select('*')
    .eq('document_id', documentId)
    .limit(10000);

  if (error || !factRows) {
    console.warn('[RAG Ingestion] Could not fetch facts for linking:', error);
    return;
  }

  const facts = factRows.map(mapRowToFact);

  // Build lookup: policyId + ruleId → factId
  const ruleMap = new Map<string, string>();
  for (const fact of facts) {
    if (fact.factType === 'policy_rule' && fact.policyId && fact.ruleId) {
      ruleMap.set(`${fact.policyId}::${fact.ruleId}`, fact.id);
    }
  }

  // Link exceptions to their qualifying rules
  for (const fact of facts) {
    if (fact.factType === 'policy_exception' && fact.policyId) {
      // Extract qualifiesRule from metadata or content
      const qualifiesRule = (fact.metadata as any)?.qualifiesRule || extractQualifiesRule(fact.content);
      if (qualifiesRule) {
        const parentId = ruleMap.get(`${fact.policyId}::${qualifiesRule}`);
        if (parentId) {
          await supabase
            .from('rag_facts')
            .update({ parent_fact_id: parentId })
            .eq('id', fact.id);
        }
      }
    }
  }

  console.log(`[RAG Ingestion] Linked relationships for ${facts.length} facts`);
}

/**
 * Extract the rule ID that an exception qualifies from the exception content.
 * E.g., "E1: High Liquidity Offset (qualifies R4)" → "R4"
 */
function extractQualifiesRule(content: string): string | null {
  const match = content.match(/qualifies\s+(R\d+)/i)
    || content.match(/modifies\s+(R\d+)/i)
    || content.match(/exception\s+to\s+(R\d+)/i);
  return match ? match[1] : null;
}

/**
 * Find markdown table regions in text by detecting | delimiters.
 * Returns line ranges for each detected table.
 */
export function findTableRegions(text: string): Array<{ startLine: number; endLine: number }> {
  const lines = text.split('\n');
  const tables: Array<{ startLine: number; endLine: number }> = [];
  let tableStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableLine = line.startsWith('|') && line.endsWith('|');

    if (isTableLine && tableStart === -1) {
      tableStart = i + 1; // 1-indexed
    } else if (!isTableLine && tableStart !== -1) {
      if ((i + 1) - tableStart >= 3) {
        // At least header + separator + 1 row
        tables.push({ startLine: tableStart, endLine: i }); // i is 1-indexed end
      }
      tableStart = -1;
    }
  }

  // Handle table at end of text
  if (tableStart !== -1 && (lines.length + 1) - tableStart >= 3) {
    tables.push({ startLine: tableStart, endLine: lines.length });
  }

  return tables;
}
