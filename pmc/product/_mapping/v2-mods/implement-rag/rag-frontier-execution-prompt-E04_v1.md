# RAG Frontier - Execution Prompt E04: Expert Q&A & Retrieval Services

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E04 - Expert Q&A & Retrieval Services
**Prerequisites:** E01 (database), E02 (types & providers), E03 (ingestion & embedding services) complete
**Status:** Ready for Execution

---

## Overview

This prompt creates the Expert Q&A service (question presentation, answer integration, knowledge refinement) and the Retrieval service (multi-tier similarity search with HyDE, context assembly, Self-RAG evaluation).

**What This Section Creates:**
1. `src/lib/rag/services/rag-expert-qa-service.ts` — Expert question presentation, answer storage, knowledge refinement, re-embedding after answers
2. `src/lib/rag/services/rag-retrieval-service.ts` — Multi-tier retrieval with HyDE, context assembly, response generation with citations, Self-RAG evaluation

**What This Section Does NOT Change:**
- No database schema changes (E01)
- No type definitions (E02)
- No ingestion or embedding services (E03)
- No API routes (E05-E06)

---

## Critical Instructions

### SAOL for Database Operations
**⚠️ Use SAOL for all database verification.** Service code uses `createServerSupabaseAdminClient()` for DB operations.

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

========================


# EXECUTION PROMPT E04: Expert Q&A & Retrieval Services

## Your Mission

Create two services for the RAG Frontier module in a Next.js 14 / TypeScript / Supabase application:

1. **Expert Q&A Service** — Manages the expert-in-the-loop workflow where the system presents targeted clarification questions and integrates human expert answers back into the knowledge representation
2. **Retrieval Service** — Performs multi-tier similarity search with HyDE (Hypothetical Document Embeddings), assembles context, generates cited responses via Claude, and performs Self-RAG evaluation

---

## Context: Current State

### What Exists (from E01-E03)
- **Database**: 8 RAG tables with pgvector, RLS policies, indexes. `match_rag_embeddings` and `increment_kb_doc_count` RPC functions exist.
- **Types**: `src/types/rag.ts` — All entity interfaces, row types, request/response types, display maps
- **Providers**: `src/lib/rag/providers/` — `ClaudeLLMProvider` (with `readDocument()`, `generateContextualPreamble()`, `generateExpertQuestions()` methods), `OpenAIEmbeddingProvider` (with `embed()`, `embedBatch()`)
- **Config**: `src/lib/rag/config.ts` — `RAG_CONFIG` object with retrieval settings, quality weights, storage config
- **Services**: `src/lib/rag/services/rag-embedding-service.ts` (embed, batch embed, similarity search, delete), `src/lib/rag/services/rag-ingestion-service.ts` (create doc, extract text, process document, upload file), `src/lib/rag/services/rag-db-mappers.ts` (all row→entity mappers)

### Existing Codebase Patterns
- **Supabase client**: `import { createServerSupabaseAdminClient } from '@/lib/supabase-server'` — sync function, bypasses RLS
- **Service pattern**: Functions return `Promise<{ success: boolean; data?: T; error?: string }>`. Try/catch with `console.error`. Use mapper functions for DB rows.
- **LLM Provider**: `import { ClaudeLLMProvider } from '@/lib/rag/providers'` — instantiate once, call methods

### Key Architecture Decisions
- **Expert Q&A**: System generates questions during document processing (E03). This service presents them to the user, stores answers, and refines knowledge based on expert input.
- **Retrieval**: Three-tier search (document→section→fact). HyDE generates a hypothetical answer to improve query embeddings. Self-RAG uses Claude to determine if the retrieved context is sufficient.
- **Quality**: RAG Quality Score formula: 0.30×Faithfulness + 0.25×AnswerRelevance + 0.20×ContextRelevance + 0.15×Completeness + 0.10×CitationAccuracy

---

## Phase 1: Expert Q&A Service

### Task 1: Create Expert Q&A Service

**File:** `src/lib/rag/services/rag-expert-qa-service.ts`

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings } from './rag-embedding-service';
import { mapRowToQuestion, mapRowToSection, mapRowToFact, mapRowToDocument } from './rag-db-mappers';
import type {
  RAGExpertQuestion,
  RAGSection,
  RAGFact,
  RAGDocument,
} from '@/types/rag';

// ============================================
// RAG Expert Q&A Service
// ============================================
// Manages the expert-in-the-loop workflow:
// 1. Present targeted questions to domain experts
// 2. Store expert answers
// 3. Refine knowledge based on answers
// 4. Re-embed refined sections/facts
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Get Questions for Document
// ============================================

export async function getQuestionsForDocument(params: {
  documentId: string;
  userId: string;
  includeAnswered?: boolean;
}): Promise<{ success: boolean; data?: RAGExpertQuestion[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    let query = supabase
      .from('rag_expert_questions')
      .select('*')
      .eq('document_id', params.documentId)
      .eq('user_id', params.userId)
      .order('sort_order', { ascending: true });

    if (!params.includeAnswered) {
      query = query.is('answered_at', null).eq('skipped', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQuestion) };
  } catch (err) {
    console.error('Exception fetching questions:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch questions' };
  }
}

// ============================================
// Submit Expert Answer
// ============================================

export async function submitExpertAnswer(params: {
  questionId: string;
  userId: string;
  answerText: string;
}): Promise<{ success: boolean; data?: RAGExpertQuestion; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('rag_expert_questions')
      .update({
        answer_text: params.answerText,
        answered_at: new Date().toISOString(),
      })
      .eq('id', params.questionId)
      .eq('user_id', params.userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error submitting answer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToQuestion(data) };
  } catch (err) {
    console.error('Exception submitting answer:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit answer' };
  }
}

// ============================================
// Skip Question
// ============================================

export async function skipQuestion(params: {
  questionId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { error } = await supabase
      .from('rag_expert_questions')
      .update({ skipped: true })
      .eq('id', params.questionId)
      .eq('user_id', params.userId);

    if (error) {
      console.error('Error skipping question:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception skipping question:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to skip question' };
  }
}

// ============================================
// Refine Knowledge After Expert Answers
// ============================================

export async function refineKnowledgeWithAnswers(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; refinedCount?: number; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const provider = getLLMProvider();

    // Fetch the document
    const { data: docRow, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', params.documentId)
      .single();

    if (docError || !docRow) {
      return { success: false, error: 'Document not found' };
    }

    const doc = mapRowToDocument(docRow);

    // Fetch all answered questions
    const { data: answeredRows, error: qError } = await supabase
      .from('rag_expert_questions')
      .select('*')
      .eq('document_id', params.documentId)
      .not('answered_at', 'is', null);

    if (qError) {
      return { success: false, error: 'Failed to fetch answered questions' };
    }

    const answeredQuestions = (answeredRows || []).map(mapRowToQuestion);
    if (answeredQuestions.length === 0) {
      return { success: true, refinedCount: 0 };
    }

    // Fetch existing sections
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', params.documentId)
      .order('section_index', { ascending: true });

    const sections = (sectionRows || []).map(mapRowToSection);

    // Fetch existing facts
    const { data: factRows } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', params.documentId);

    const facts = (factRows || []).map(mapRowToFact);

    // Build the refinement prompt
    const qaContext = answeredQuestions
      .map(q => `Q: ${q.questionText}\nA: ${q.answerText}`)
      .join('\n\n');

    const sectionSummaries = sections
      .map(s => `[${s.title || `Section ${s.sectionIndex}`}]: ${s.summary || s.originalText.slice(0, 300)}`)
      .join('\n');

    console.log(`[RAG Expert QA] Refining knowledge for document ${params.documentId} with ${answeredQuestions.length} answers...`);

    // Ask Claude to identify which sections/facts need refinement
    const refinementResponse = await provider.chat({
      systemPrompt: `You are a knowledge refinement assistant. Given expert Q&A answers about a document, identify which sections need their summaries updated and which new facts should be added. Return a JSON object with:
{
  "sectionUpdates": [{ "sectionId": "uuid", "newSummary": "refined summary text" }],
  "newFacts": [{ "factType": "atomic_fact|entity_definition|relationship|constraint", "content": "fact text", "sourceText": "which answer this came from", "confidence": 0.0-1.0 }]
}
Only include updates where the expert answers meaningfully change or add to the existing knowledge. Be conservative — don't change things the expert didn't address.`,
      userPrompt: `## Document Summary
${doc.documentSummary || 'No summary available'}

## Current Sections
${sectionSummaries}

## Expert Q&A
${qaContext}

Analyze the expert answers and return the refinement JSON.`,
    });

    // Parse refinement instructions
    let refinements: {
      sectionUpdates: Array<{ sectionId: string; newSummary: string }>;
      newFacts: Array<{ factType: string; content: string; sourceText: string; confidence: number }>;
    };

    try {
      const jsonMatch = refinementResponse.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      refinements = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.warn('[RAG Expert QA] Could not parse refinement response, skipping refinement');
      return { success: true, refinedCount: 0 };
    }

    let refinedCount = 0;

    // Apply section updates
    if (refinements.sectionUpdates && Array.isArray(refinements.sectionUpdates)) {
      for (const update of refinements.sectionUpdates) {
        const sectionExists = sections.find(s => s.id === update.sectionId);
        if (!sectionExists) continue;

        const { error: updateError } = await supabase
          .from('rag_sections')
          .update({ summary: update.newSummary, updated_at: new Date().toISOString() })
          .eq('id', update.sectionId);

        if (!updateError) refinedCount++;
      }
    }

    // Insert new facts from expert answers
    if (refinements.newFacts && Array.isArray(refinements.newFacts)) {
      const newFactRecords = refinements.newFacts.map(f => ({
        document_id: params.documentId,
        user_id: params.userId,
        fact_type: f.factType,
        content: f.content,
        source_text: f.sourceText,
        confidence: Math.min(1, Math.max(0, f.confidence)),
      }));

      if (newFactRecords.length > 0) {
        const { data: insertedFacts, error: factInsertError } = await supabase
          .from('rag_facts')
          .insert(newFactRecords)
          .select('*');

        if (!factInsertError && insertedFacts) {
          refinedCount += insertedFacts.length;

          // Update document fact count
          await supabase
            .from('rag_documents')
            .update({ fact_count: facts.length + insertedFacts.length })
            .eq('id', params.documentId);
        }
      }
    }

    // Re-generate embeddings for updated sections and new facts
    console.log(`[RAG Expert QA] Re-embedding after ${refinedCount} refinements...`);

    // Delete old embeddings and regenerate
    await deleteDocumentEmbeddings(params.documentId);

    // Re-fetch updated sections and facts
    const { data: updatedSectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', params.documentId)
      .order('section_index', { ascending: true });

    const { data: updatedFactRows } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', params.documentId);

    const updatedSections = (updatedSectionRows || []).map(mapRowToSection);
    const updatedFacts = (updatedFactRows || []).map(mapRowToFact);

    const embeddingItems: Array<{
      sourceType: 'document' | 'section' | 'fact';
      sourceId: string;
      contentText: string;
      tier: 1 | 2 | 3;
    }> = [];

    // Tier 1: Document-level
    embeddingItems.push({
      sourceType: 'document',
      sourceId: params.documentId,
      contentText: `${doc.documentSummary || ''}\n\nTopics: ${(doc.topicTaxonomy || []).join(', ')}`,
      tier: 1,
    });

    // Tier 2: Section-level
    for (const section of updatedSections) {
      const text = section.contextualPreamble
        ? `${section.contextualPreamble}\n\n${section.summary || section.originalText.slice(0, 2000)}`
        : section.summary || section.originalText.slice(0, 2000);
      embeddingItems.push({ sourceType: 'section', sourceId: section.id, contentText: text, tier: 2 });
    }

    // Tier 3: Fact-level
    for (const fact of updatedFacts) {
      embeddingItems.push({ sourceType: 'fact', sourceId: fact.id, contentText: fact.content, tier: 3 });
    }

    await generateAndStoreBatchEmbeddings({
      documentId: params.documentId,
      userId: params.userId,
      items: embeddingItems,
    });

    console.log(`[RAG Expert QA] Knowledge refinement complete: ${refinedCount} items refined`);
    return { success: true, refinedCount };
  } catch (err) {
    console.error('[RAG Expert QA] Exception in refineKnowledge:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Knowledge refinement failed' };
  }
}

// ============================================
// Mark Document Verified (All Questions Answered)
// ============================================

export async function markDocumentVerified(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    // Refine knowledge with all expert answers first
    const refinementResult = await refineKnowledgeWithAnswers(params);
    if (!refinementResult.success) {
      console.warn('[RAG Expert QA] Refinement had issues:', refinementResult.error);
      // Continue anyway — verification shouldn't block on refinement
    }

    // Update document status to ready
    const { data, error } = await supabase
      .from('rag_documents')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.documentId)
      .eq('user_id', params.userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error marking document verified:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception marking document verified:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to verify document' };
  }
}
```

**Pattern Source**: `src/lib/services/pipeline-service.ts` — function structure, error handling, Supabase admin client usage

---

## Phase 2: Retrieval Service

### Task 2: Create RAG Retrieval Service

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { searchSimilarEmbeddings } from './rag-embedding-service';
import { mapRowToSection, mapRowToFact, mapRowToDocument, mapRowToQuery } from './rag-db-mappers';
import type {
  RAGQuery,
  RAGSection,
  RAGFact,
  RAGCitation,
  RAGQueryMode,
} from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Retrieval Service
// ============================================
// Implements the full retrieval pipeline:
// 1. HyDE — generate a hypothetical answer to improve query embedding
// 2. Multi-tier retrieval — search documents, sections, and facts
// 3. Context assembly — build a coherent context from retrieved items
// 4. Response generation — Claude generates a cited answer
// 5. Self-RAG evaluation — Claude evaluates if the answer is supported
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// HyDE: Hypothetical Document Embeddings
// ============================================

async function generateHyDE(queryText: string): Promise<string> {
  const provider = getLLMProvider();
  const response = await provider.chat({
    systemPrompt: 'You are a helpful assistant. Given a question, write a short paragraph that would be a good answer to the question, as if it appeared in a well-written document. Do not say "I think" or hedge. Write as if you are stating facts from a source document.',
    userPrompt: queryText,
    maxTokens: 300,
  });
  return response.text;
}

// ============================================
// Multi-Tier Retrieval
// ============================================

async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  hydeText?: string;
}): Promise<{
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  sectionIds: string[];
  factIds: string[];
}> {
  const supabase = createServerSupabaseAdminClient();
  const { queryText, documentId, hydeText } = params;

  // Search with both original query and HyDE text for better recall
  const searchTexts = hydeText ? [queryText, hydeText] : [queryText];
  const allSectionIds = new Set<string>();
  const allFactIds = new Set<string>();
  const sectionMap = new Map<string, { section: RAGSection; similarity: number }>();
  const factMap = new Map<string, { fact: RAGFact; similarity: number }>();

  for (const searchText of searchTexts) {
    // Tier 2: Section-level search
    const sectionResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      tier: 2,
      limit: RAG_CONFIG.retrieval.maxSectionsRetrieved,
      threshold: RAG_CONFIG.retrieval.similarityThreshold,
    });

    if (sectionResults.success && sectionResults.data) {
      for (const result of sectionResults.data) {
        if (!sectionMap.has(result.sourceId) || sectionMap.get(result.sourceId)!.similarity < result.similarity) {
          allSectionIds.add(result.sourceId);
          // Fetch full section from DB
          const { data: sectionRow } = await supabase
            .from('rag_sections')
            .select('*')
            .eq('id', result.sourceId)
            .single();

          if (sectionRow) {
            sectionMap.set(result.sourceId, {
              section: mapRowToSection(sectionRow),
              similarity: result.similarity,
            });
          }
        }
      }
    }

    // Tier 3: Fact-level search
    const factResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      tier: 3,
      limit: RAG_CONFIG.retrieval.maxFactsRetrieved,
      threshold: RAG_CONFIG.retrieval.similarityThreshold,
    });

    if (factResults.success && factResults.data) {
      for (const result of factResults.data) {
        if (!factMap.has(result.sourceId) || factMap.get(result.sourceId)!.similarity < result.similarity) {
          allFactIds.add(result.sourceId);
          const { data: factRow } = await supabase
            .from('rag_facts')
            .select('*')
            .eq('id', result.sourceId)
            .single();

          if (factRow) {
            factMap.set(result.sourceId, {
              fact: mapRowToFact(factRow),
              similarity: result.similarity,
            });
          }
        }
      }
    }
  }

  // Sort by similarity descending
  const sections = Array.from(sectionMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ section, similarity }) => ({ ...section, similarity }));

  const facts = Array.from(factMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ fact, similarity }) => ({ ...fact, similarity }));

  return {
    sections,
    facts,
    sectionIds: Array.from(allSectionIds),
    factIds: Array.from(allFactIds),
  };
}

// ============================================
// Context Assembly
// ============================================

function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
}): string {
  const { sections, facts, documentSummary } = params;
  const parts: string[] = [];

  if (documentSummary) {
    parts.push(`## Document Overview\n${documentSummary}`);
  }

  if (sections.length > 0) {
    parts.push('## Relevant Sections');
    for (const section of sections) {
      const header = section.title || `Section ${section.sectionIndex}`;
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      parts.push(`### ${header} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`);
    }
  }

  if (facts.length > 0) {
    parts.push('## Relevant Facts');
    for (const fact of facts) {
      parts.push(`- [${fact.factType}] ${fact.content} (confidence: ${fact.confidence})`);
    }
  }

  return parts.join('\n\n');
}

// ============================================
// Response Generation with Citations
// ============================================

async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
}): Promise<{ responseText: string; citations: RAGCitation[] }> {
  const provider = getLLMProvider();

  const response = await provider.chat({
    systemPrompt: `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
1. Only use information from the provided context
2. Include citations in the format [Section: title] or [Fact: content_preview] for every claim
3. If the context doesn't contain enough information, say so clearly
4. Be comprehensive but concise
5. Never fabricate information not in the context

Return your response in this JSON format:
{
  "answer": "Your complete answer text with inline [citations]",
  "citations": [
    { "sourceType": "section|fact", "sourceId": "uuid or title", "text": "the cited text", "relevance": 0.0-1.0 }
  ]
}`,
    userPrompt: `## Question
${params.queryText}

## Source Context
${params.assembledContext}

Answer the question using only the source context above. Include citations for every claim.`,
    maxTokens: 2000,
  });

  // Parse the response
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        responseText: parsed.answer || response.text,
        citations: (parsed.citations || []).map((c: any) => ({
          sourceType: c.sourceType || 'section',
          sourceId: c.sourceId || '',
          text: c.text || '',
          relevance: typeof c.relevance === 'number' ? c.relevance : 0.8,
        })),
      };
    }
  } catch {
    // Fall back to raw text if JSON parsing fails
  }

  return { responseText: response.text, citations: [] };
}

// ============================================
// Self-RAG Evaluation
// ============================================

async function selfEvaluate(params: {
  queryText: string;
  responseText: string;
  assembledContext: string;
}): Promise<{ passed: boolean; score: number }> {
  const provider = getLLMProvider();

  try {
    const evalResponse = await provider.chat({
      systemPrompt: `You are a quality evaluator. Given a question, the retrieved context, and a generated answer, evaluate whether the answer is:
1. Faithful to the context (doesn't make up facts)
2. Relevant to the question
3. Complete (addresses the question fully)

Return a JSON object: { "passed": true/false, "score": 0.0-1.0, "reason": "brief explanation" }
A score >= 0.6 means passed.`,
      userPrompt: `Question: ${params.queryText}\n\nContext: ${params.assembledContext.slice(0, 3000)}\n\nAnswer: ${params.responseText}`,
      maxTokens: 200,
    });

    const jsonMatch = evalResponse.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        passed: result.passed ?? result.score >= 0.6,
        score: typeof result.score === 'number' ? result.score : 0.5,
      };
    }
  } catch (err) {
    console.warn('[RAG Retrieval] Self-evaluation failed:', err);
  }

  // Default: pass with moderate score if evaluation fails
  return { passed: true, score: 0.7 };
}

// ============================================
// Main Query Function
// ============================================

export async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  userId: string;
  mode?: RAGQueryMode;
}): Promise<{ success: boolean; data?: RAGQuery; error?: string }> {
  const startTime = Date.now();

  try {
    const supabase = createServerSupabaseAdminClient();
    const mode = params.mode || 'rag_only';

    console.log(`[RAG Retrieval] Query: "${params.queryText.slice(0, 100)}..." mode=${mode}`);

    // Step 1: Generate HyDE hypothetical answer
    let hydeText: string | undefined;
    try {
      hydeText = await generateHyDE(params.queryText);
    } catch (hydeError) {
      console.warn('[RAG Retrieval] HyDE generation failed, continuing without it:', hydeError);
    }

    // Step 2: Multi-tier retrieval
    const retrieved = await retrieveContext({
      queryText: params.queryText,
      documentId: params.documentId,
      hydeText,
    });

    if (retrieved.sections.length === 0 && retrieved.facts.length === 0) {
      // No relevant context found
      const { data: queryRow, error: insertError } = await supabase
        .from('rag_queries')
        .insert({
          knowledge_base_id: params.knowledgeBaseId || null,
          document_id: params.documentId || null,
          user_id: params.userId,
          query_text: params.queryText,
          hyde_text: hydeText || null,
          mode,
          retrieved_section_ids: [],
          retrieved_fact_ids: [],
          assembled_context: '',
          response_text: 'I could not find relevant information in the knowledge base to answer this question.',
          citations: [],
          self_eval_passed: false,
          self_eval_score: 0,
          response_time_ms: Date.now() - startTime,
        })
        .select('*')
        .single();

      if (insertError) {
        return { success: false, error: 'Failed to log query' };
      }

      return { success: true, data: mapRowToQuery(queryRow) };
    }

    // Step 3: Get document summary for context
    let documentSummary: string | undefined;
    if (params.documentId) {
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('document_summary')
        .eq('id', params.documentId)
        .single();
      documentSummary = docRow?.document_summary || undefined;
    }

    // Step 4: Assemble context
    const assembledContext = assembleContext({
      sections: retrieved.sections,
      facts: retrieved.facts,
      documentSummary,
    });

    // Step 5: Generate response
    const { responseText, citations } = await generateResponse({
      queryText: params.queryText,
      assembledContext,
      mode,
    });

    // Step 6: Self-RAG evaluation
    const selfEval = await selfEvaluate({
      queryText: params.queryText,
      responseText,
      assembledContext,
    });

    // Step 7: Store query and results
    const responseTimeMs = Date.now() - startTime;

    const { data: queryRow, error: insertError } = await supabase
      .from('rag_queries')
      .insert({
        knowledge_base_id: params.knowledgeBaseId || null,
        document_id: params.documentId || null,
        user_id: params.userId,
        query_text: params.queryText,
        hyde_text: hydeText || null,
        mode,
        retrieved_section_ids: retrieved.sectionIds,
        retrieved_fact_ids: retrieved.factIds,
        assembled_context: assembledContext,
        response_text: responseText,
        citations,
        self_eval_passed: selfEval.passed,
        self_eval_score: selfEval.score,
        response_time_ms: responseTimeMs,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[RAG Retrieval] Error storing query:', insertError);
      return { success: false, error: 'Failed to store query results' };
    }

    console.log(`[RAG Retrieval] Query complete in ${responseTimeMs}ms, self-eval: ${selfEval.score.toFixed(2)} (${selfEval.passed ? 'PASS' : 'FAIL'})`);

    return { success: true, data: mapRowToQuery(queryRow) };
  } catch (err) {
    console.error('[RAG Retrieval] Exception in queryRAG:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Query failed' };
  }
}

// ============================================
// Get Query History
// ============================================

export async function getQueryHistory(params: {
  documentId?: string;
  knowledgeBaseId?: string;
  userId: string;
  limit?: number;
}): Promise<{ success: boolean; data?: RAGQuery[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    let query = supabase
      .from('rag_queries')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.documentId) {
      query = query.eq('document_id', params.documentId);
    }
    if (params.knowledgeBaseId) {
      query = query.eq('knowledge_base_id', params.knowledgeBaseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching query history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQuery) };
  } catch (err) {
    console.error('Exception fetching query history:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch query history' };
  }
}
```

**Pattern Source**: `src/lib/services/pipeline-service.ts` — service function structure; `src/lib/services/evaluation-service.ts` — LLM-based evaluation pattern

---

## Phase 3: Service Barrel Export

### Task 3: Create Services Barrel Export

**File:** `src/lib/rag/services/index.ts`

```typescript
// RAG Services - Barrel Export
export * from './rag-db-mappers';
export * from './rag-embedding-service';
export * from './rag-ingestion-service';
export * from './rag-expert-qa-service';
export * from './rag-retrieval-service';
```

---

## Verification

### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit
```

**Expected:** Exit code 0, no TypeScript errors.

### Step 2: Verify All Service Files Exist

```bash
ls -la src/lib/rag/services/
```

Confirm these files:
- `rag-db-mappers.ts`
- `rag-embedding-service.ts`
- `rag-ingestion-service.ts`
- `rag-expert-qa-service.ts`
- `rag-retrieval-service.ts`
- `index.ts`

---

## Success Criteria

- [ ] `rag-expert-qa-service.ts` exports: `getQuestionsForDocument`, `submitExpertAnswer`, `skipQuestion`, `refineKnowledgeWithAnswers`, `markDocumentVerified`
- [ ] `rag-retrieval-service.ts` exports: `queryRAG`, `getQueryHistory`
- [ ] `src/lib/rag/services/index.ts` barrel exports all service modules
- [ ] HyDE generates hypothetical answers to improve query embeddings
- [ ] Multi-tier retrieval searches sections (tier 2) and facts (tier 3)
- [ ] Response generation includes structured citations
- [ ] Self-RAG evaluation scores each response
- [ ] Expert answer refinement triggers re-embedding
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

**E05** will create the Quality Service (Claude-as-Judge evaluation) and the first set of API routes (`/api/rag/documents` and `/api/rag/documents/[id]/process`).

---

## If Something Goes Wrong

### Claude API Errors
- Verify `ANTHROPIC_API_KEY` is set in `.env.local`
- Check rate limits — add retry logic if hitting 429 errors
- Ensure the Claude model name in the provider matches an available model

### Embedding Search Returns Empty
- Verify embeddings were stored during document processing (E03)
- Check the `match_rag_embeddings` RPC function exists
- Lower the similarity threshold temporarily: `RAG_CONFIG.retrieval.similarityThreshold`

### JSON Parse Errors in LLM Responses
- Claude sometimes wraps JSON in markdown code blocks — the `match(/\{[\s\S]*\}/)` regex handles this
- If responses are truncated, increase `maxTokens` in the provider call

---

## Notes for Agent

1. **Create ALL files listed above.** Both services go in `src/lib/rag/services/`.
2. **The retrieval service uses HyDE** — this is a deliberate architectural choice, not optional.
3. **Self-RAG evaluation** runs on every query. It's cheap (haiku-class model) and critical for quality metrics.
4. **Expert Q&A refinement re-embeds the entire document** — this is simpler and more correct than incremental updates.
5. **Do NOT create API routes** — those come in E05-E06.
6. **The barrel export file** (`index.ts`) must include all service modules from E03 and E04.

---

**End of E04 Prompt**


+++++++++++++++++
