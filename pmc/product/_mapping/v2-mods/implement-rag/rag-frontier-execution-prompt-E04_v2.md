# RAG Frontier - Execution Prompt E04: Expert Q&A & Retrieval Services

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E04 - Expert Q&A & Retrieval Services
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅, E03 (ingestion & embedding services) ✅ complete
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E03 complete), corrected provider method usage, updated context to match E03 implementation

---

## Overview

This prompt creates the Expert Q&A service (question presentation, answer integration, knowledge refinement) and the Retrieval service (multi-tier similarity search with HyDE, context assembly, Self-RAG evaluation).

**What This Section Creates:**
1. `src/lib/rag/services/rag-expert-qa-service.ts` — Expert question presentation, answer storage, knowledge refinement, re-embedding after answers
2. `src/lib/rag/services/rag-retrieval-service.ts` — Multi-tier retrieval with HyDE, context assembly, response generation with citations, Self-RAG evaluation
3. `src/lib/rag/services/index.ts` — Barrel export for all RAG services

**What This Section Does NOT Change:**
- No database schema changes (E01)
- No type definitions (E02)
- No provider implementations (E02)
- No ingestion or embedding services (E03)
- No API routes (E05-E06)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

### Required Environment Variables (Already Set)
**Confirmed in `.env.local`:**
- ✅ `ANTHROPIC_API_KEY` — Claude API access
- ✅ `OPENAI_API_KEY` — OpenAI embedding access  
- ✅ `DATABASE_URL` — PostgreSQL connection for SAOL operations
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — Admin DB access

### SAOL for Database Operations
**⚠️ Use SAOL for all database verification.** Service code uses `createServerSupabaseAdminClient()` for DB operations, matching existing service patterns.

---

========================


# EXECUTION PROMPT E04: Expert Q&A & Retrieval Services

## Your Mission

Create two services for the RAG Frontier module in a Next.js 14 / TypeScript / Supabase application:

1. **Expert Q&A Service** — Manages the expert-in-the-loop workflow where the system presents targeted clarification questions and integrates human expert answers back into the knowledge representation
2. **Retrieval Service** — Performs multi-tier similarity search with HyDE (Hypothetical Document Embeddings), assembles context, generates cited responses via Claude, and performs Self-RAG evaluation

---

## Context: Current State

### E03 Completion Status ✅

**Completed in This Session (February 11, 2026):**
- ✅ `src/lib/rag/services/rag-db-mappers.ts` — All 7 entity mappers (KB, document, section, fact, question, query, quality score)
- ✅ `src/lib/rag/services/rag-embedding-service.ts` — Embedding generation, batch generation, similarity search, delete
  - Exports: `generateAndStoreEmbedding()`, `generateAndStoreBatchEmbeddings()`, `searchSimilarEmbeddings()`, `deleteDocumentEmbeddings()`
- ✅ `src/lib/rag/services/rag-ingestion-service.ts` — Document upload, text extraction, LLM processing, knowledge storage
  - Exports: `createKnowledgeBase()`, `getKnowledgeBases()`, `createDocumentRecord()`, `extractDocumentText()`, `uploadDocumentFile()`, `processDocument()`, `getDocuments()`, `getDocument()`
- ✅ RPC functions: `match_rag_embeddings`, `increment_kb_doc_count`
- ✅ Dependencies installed: `pdf-parse`, `mammoth`, `@types/pdf-parse`

### E02 Completion Status ✅
- ✅ `src/types/rag.ts` — All entity types, request/response types, enums
- ✅ `src/lib/rag/config.ts` — RAG configuration constants
- ✅ `src/lib/rag/providers/llm-provider.ts` — LLM provider interface with methods:
  - `readDocument()` ✅
  - `generateContextualPreamble()` ✅
  - `refineKnowledge()` ✅
  - `generateHyDE()` ✅
  - `selfEvaluate()` ✅
  - `generateResponse()` ✅
  - `evaluateQuality()` ✅
  - `generateVerificationQuestions()` ✅
- ✅ `src/lib/rag/providers/claude-llm-provider.ts` — All methods implemented
- ✅ `src/lib/rag/providers/embedding-provider.ts` — Embedding provider interface
- ✅ `src/lib/rag/providers/openai-embedding-provider.ts` — OpenAI implementation

### E01 Completion Status ✅
- ✅ pgvector extension enabled
- ✅ All 8 RAG tables created with RLS and indexes
- ✅ Storage bucket `rag-documents` created
- ✅ `rag_embeddings` table stores embedding as `jsonb` (not native vector type for compatibility)

### Existing Codebase Patterns
- **Supabase client**: `import { createServerSupabaseAdminClient } from '@/lib/supabase-server'` — sync function, bypasses RLS
- **Service pattern**: Functions return `Promise<{ success: boolean; data?: T; error?: string }>`. Try/catch with `console.error`. Use mapper functions for DB rows.
- **LLM Provider**: `import { ClaudeLLMProvider } from '@/lib/rag/providers'` — instantiate once, call methods
- **Embedding Provider**: `import { OpenAIEmbeddingProvider } from '@/lib/rag/providers'` — instantiate once, call methods

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
  KnowledgeRefinement,
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

    console.log(`[RAG Expert QA] Refining knowledge for document ${params.documentId} with ${answeredQuestions.length} answers...`);

    // Use the provider's refineKnowledge method
    let refinements: KnowledgeRefinement;
    try {
      refinements = await provider.refineKnowledge({
        documentText: doc.originalText || '',
        currentSummary: doc.documentSummary || '',
        questions: answeredQuestions,
        sections,
      });
    } catch (refinementError) {
      console.warn('[RAG Expert QA] Knowledge refinement failed:', refinementError);
      return { success: true, refinedCount: 0 };
    }

    let refinedCount = 0;

    // Apply section updates
    if (refinements.updatedSections && Array.isArray(refinements.updatedSections)) {
      for (const update of refinements.updatedSections) {
        const section = sections[update.sectionIndex];
        if (!section) continue;

        const { error: updateError } = await supabase
          .from('rag_sections')
          .update({ summary: update.updatedSummary, updated_at: new Date().toISOString() })
          .eq('id', section.id);

        if (!updateError) refinedCount++;
      }
    }

    // Insert new facts from expert answers
    if (refinements.updatedFacts && Array.isArray(refinements.updatedFacts)) {
      const newFactRecords = refinements.updatedFacts.map(f => ({
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

          // Fetch current fact count
          const { data: currentFacts } = await supabase
            .from('rag_facts')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', params.documentId);

          // Update document fact count
          await supabase
            .from('rag_documents')
            .update({ fact_count: (currentFacts?.length || 0) + insertedFacts.length })
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
  HyDEResult,
  SelfEvalResult,
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

async function generateHyDE(params: {
  queryText: string;
  documentSummary: string;
}): Promise<string> {
  const provider = getLLMProvider();
  try {
    const result: HyDEResult = await provider.generateHyDE({
      queryText: params.queryText,
      documentSummary: params.documentSummary,
    });
    return result.hypotheticalAnswer;
  } catch (err) {
    console.warn('[RAG Retrieval] HyDE generation failed:', err);
    return '';
  }
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

  const systemPrompt = `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
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
}`;

  try {
    const result = await provider.generateResponse({
      queryText: params.queryText,
      assembledContext: params.assembledContext,
      systemPrompt,
    });

    return {
      responseText: result.responseText,
      citations: result.citations,
    };
  } catch (err) {
    console.error('[RAG Retrieval] Response generation failed:', err);
    return {
      responseText: 'I encountered an error generating a response. Please try again.',
      citations: [],
    };
  }
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
    const result: SelfEvalResult = await provider.selfEvaluate({
      queryText: params.queryText,
      retrievedContext: params.assembledContext,
    });

    return {
      passed: result.passed,
      score: result.score,
    };
  } catch (err) {
    console.warn('[RAG Retrieval] Self-evaluation failed:', err);
    // Default: pass with moderate score if evaluation fails
    return { passed: true, score: 0.7 };
  }
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

    // Step 1: Get document summary for HyDE
    let documentSummary = '';
    if (params.documentId) {
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('document_summary')
        .eq('id', params.documentId)
        .single();
      documentSummary = docRow?.document_summary || '';
    }

    // Step 2: Generate HyDE hypothetical answer
    let hydeText: string | undefined;
    if (documentSummary) {
      hydeText = await generateHyDE({
        queryText: params.queryText,
        documentSummary,
      });
    }

    // Step 3: Multi-tier retrieval
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

### Step 1: Verify All Service Files Exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/lib/rag/services/
```

Confirm these files:
- `rag-db-mappers.ts` (E03) ✅
- `rag-embedding-service.ts` (E03) ✅
- `rag-ingestion-service.ts` (E03) ✅
- `rag-expert-qa-service.ts` (E04) — NEW
- `rag-retrieval-service.ts` (E04) — NEW
- `index.ts` (E04) — NEW

### Step 2: Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx next lint 2>&1 | head -n 20
```

**Expected:** No errors in the new service files.

### Step 3: Verify Imports

Check that all imports resolve correctly:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && node -e "try { require('./src/lib/rag/services/index.ts'); console.log('✅ Imports OK'); } catch(e) { console.error('❌ Import error:', e.message); }"
```

---

## Success Criteria

- [ ] `rag-expert-qa-service.ts` exports: `getQuestionsForDocument`, `submitExpertAnswer`, `skipQuestion`, `refineKnowledgeWithAnswers`, `markDocumentVerified`
- [ ] `rag-retrieval-service.ts` exports: `queryRAG`, `getQueryHistory`
- [ ] `src/lib/rag/services/index.ts` barrel exports all 5 service modules
- [ ] HyDE uses `provider.generateHyDE()` with correct signature
- [ ] Multi-tier retrieval searches sections (tier 2) and facts (tier 3)
- [ ] Response generation uses `provider.generateResponse()` with correct signature
- [ ] Self-RAG evaluation uses `provider.selfEvaluate()` with correct signature
- [ ] Expert answer refinement uses `provider.refineKnowledge()` with correct signature
- [ ] Expert answer refinement triggers re-embedding
- [ ] No TypeScript/linter errors

---

## What's Next

**E05** will create the Quality Service (Claude-as-Judge evaluation using `provider.evaluateQuality()`) and the first set of API routes (`/api/rag/knowledge-bases`, `/api/rag/documents`, `/api/rag/documents/[id]/process`).

---

## If Something Goes Wrong

### Claude API Errors
- Verify `ANTHROPIC_API_KEY` is set in `.env.local`
- Check rate limits — add retry logic if hitting 429 errors
- Ensure the Claude model name in `RAG_CONFIG.llm.model` matches an available model

### Embedding Search Returns Empty
- Verify embeddings were stored during document processing (E03)
- Check the `match_rag_embeddings` RPC function exists: Query the database with `SELECT proname FROM pg_proc WHERE proname = 'match_rag_embeddings'`
- Lower the similarity threshold temporarily: Edit `RAG_CONFIG.retrieval.similarityThreshold` in `src/lib/rag/config.ts`

### JSON Parse Errors in LLM Responses
- The provider methods handle JSON parsing internally and return typed results
- If responses are truncated, check `RAG_CONFIG.llm.maxTokens`
- Provider methods throw errors on parse failures — these are caught and logged

### Import Errors
- Ensure all E03 files exist: `rag-db-mappers.ts`, `rag-embedding-service.ts`, `rag-ingestion-service.ts`
- Check that `@/lib/supabase-server` exports `createServerSupabaseAdminClient`
- Verify `@/lib/rag/providers` exports `ClaudeLLMProvider` and `OpenAIEmbeddingProvider`
- Confirm `@/types/rag` exports all required types

### Refinement Doesn't Update Sections
- Check that the `provider.refineKnowledge()` method returns `KnowledgeRefinement` with `updatedSections` array
- Verify section IDs match between the refinement response and database
- Check that answered questions have `answerText` populated

---

## Notes for Agent

1. **Create ALL three files listed above.** Two services and one barrel export go in `src/lib/rag/services/`.
2. **Use the correct provider methods** — NO `provider.chat()` method exists. Use:
   - `provider.refineKnowledge()` for expert Q&A refinement
   - `provider.generateHyDE()` for hypothetical document embeddings
   - `provider.selfEvaluate()` for Self-RAG evaluation
   - `provider.generateResponse()` for response generation with citations
3. **The retrieval service uses HyDE** — this is a deliberate architectural choice, not optional.
4. **Self-RAG evaluation** runs on every query. It's cheap (uses the model from RAG_CONFIG) and critical for quality metrics.
5. **Expert Q&A refinement re-embeds the entire document** — this is simpler and more correct than incremental updates.
6. **Do NOT create API routes** — those come in E05-E06.
7. **The barrel export file** (`index.ts`) must include all service modules from E03 and E04.
8. **All provider methods return typed results** — no manual JSON parsing needed in service code.

---

**End of E04 Prompt v2**


+++++++++++++++++
