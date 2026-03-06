# Section 5: Retrieval Pipeline

**Parent Document:** `008-rag-frontier-rag-detailed-spec_v1-master.md`
**Section:** 5 of 10
**Focus:** HyDE, Multi-Tier Retrieval, Self-RAG / Corrective RAG Evaluation, Context Assembly, Response Generation
**Extension Status:** NEW service (`src/lib/services/rag/rag-retrieval-service.ts`) + 1 database function added to Section 1 migration

---

## Overview

This section implements the **complete retrieval-to-response pipeline** for the Frontier RAG module. When a user asks a question through the chat interface, this service orchestrates:

1. **HyDE** (Hypothetical Document Embeddings) -- generates a hypothetical answer to bridge the vocabulary gap between casual user questions and formal document language
2. **Multi-tier retrieval** -- searches document-level, section-level, and fact-level embeddings in pgvector to assemble relevant context
3. **Self-RAG / Corrective RAG** -- evaluates whether the retrieved context is sufficient before generating a response, and re-queries with broader parameters if it is not
4. **Context assembly and response generation** -- formats the retrieved context into a structured prompt and sends it to the appropriate model endpoint based on the three-way mode selector (RAG Only / LoRA Only / RAG + LoRA)

**User value delivered:** Users can ask natural-language questions about their uploaded document and receive accurate, cited, grounded responses. The three-way mode selector lets users compare RAG-only, LoRA-only, and RAG+LoRA responses side by side.

**What already exists (reused):**
- `callInferenceEndpoint` from `src/lib/services/inference-service.ts` (handles pods vs serverless routing, control vs adapted endpoints)
- `createServerSupabaseAdminClient` from `src/lib/supabase-server.ts` (Supabase client for database operations)
- LLM Provider abstraction from Section 2 (`src/lib/providers/llm-provider.ts`)
- Embedding Provider abstraction from Section 2 (`src/lib/providers/embedding-provider.ts`)
- `AppError`, `ErrorCode` from `src/lib/types/errors.ts`

**What is being added (new):**
- 1 new service file: `src/lib/services/rag/rag-retrieval-service.ts`
- 1 new database function: `match_rag_embeddings` (must be added to Section 1 migration SQL)

---

## Dependencies

### Codebase Prerequisites
- `src/lib/supabase-server.ts` -- `createServerSupabaseAdminClient()` for database queries
- `src/lib/services/inference-service.ts` -- `callInferenceEndpoint()` for sending prompts to control/adapted model endpoints
- `src/lib/types/errors.ts` -- `AppError`, `ErrorCode` for consistent error handling
- `src/lib/providers/llm-provider.ts` -- LLM Provider interface and Claude implementation (from Section 2)
- `src/lib/providers/embedding-provider.ts` -- Embedding Provider interface and OpenAI implementation (from Section 2)
- `src/types/rag.ts` -- All RAG TypeScript types (from Section 2)

### Previous Section Prerequisites
- **Section 1 (Database Foundation):** All 8 `rag_*` tables must exist, pgvector extension must be enabled, the `match_rag_embeddings` function must be created (see FR-5.5 below for the function definition that must be added to Section 1's migration)
- **Section 2 (Types & Providers):** All RAG types, LLM Provider, and Embedding Provider must be implemented
- **Section 3 (Ingestion Pipeline):** Documents must be ingested with embeddings stored in `rag_embeddings` at all three tiers (document, section, fact)
- **Section 4 (Expert Q&A):** Expert answers should be available in `rag_expert_questions` for context enrichment (optional -- retrieval works without expert answers, but quality improves with them)

---

## Features & Requirements

### FR-5.1: HyDE (Hypothetical Document Embeddings) Service

**Type:** Service Function
**Description:** Generates a hypothetical answer to a user query before embedding, bridging the vocabulary gap between casual user questions and formal document language. This improves retrieval precision by up to 42%.
**Implementation Strategy:** NEW build

---

**File:** `src/lib/services/rag/rag-retrieval-service.ts`

```typescript
/**
 * RAG Retrieval Service
 *
 * Implements the complete retrieval-to-response pipeline:
 * - HyDE (Hypothetical Document Embeddings)
 * - Multi-tier retrieval (document -> section -> fact)
 * - Self-RAG / Corrective RAG evaluation
 * - Context assembly and response generation
 * - Three-way mode selector (RAG Only / LoRA Only / RAG + LoRA)
 *
 * Uses provider abstractions from Section 2 for LLM and embedding calls.
 * Uses existing inference service for LoRA model endpoints.
 */

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { callInferenceEndpoint, getEndpointStatus } from '@/lib/services/inference-service';
import { getLLMProvider } from '@/lib/providers/llm-provider';
import { getEmbeddingProvider } from '@/lib/providers/embedding-provider';
import { AppError, ErrorCode } from '@/lib/types/errors';
import type {
  RAGQueryMode,
  RAGQueryResponse,
  RetrievalResult,
  RetrievedSection,
  RetrievedFact,
  SelfRAGEvaluation,
  RAGCitation,
} from '@/types/rag';

// ============================================
// Constants
// ============================================

const HYDE_MAX_TOKENS = 300;
const HYDE_TEMPERATURE = 0.7;

const TIER1_MATCH_COUNT = 1;
const TIER1_MATCH_THRESHOLD = 0.3;

const TIER2_MATCH_COUNT = 5;
const TIER2_MATCH_THRESHOLD = 0.5;
const TIER2_BROAD_MATCH_COUNT = 10;
const TIER2_BROAD_MATCH_THRESHOLD = 0.3;

const TIER3_MATCH_COUNT = 10;
const TIER3_MATCH_THRESHOLD = 0.4;
const TIER3_BROAD_MATCH_COUNT = 20;
const TIER3_BROAD_MATCH_THRESHOLD = 0.25;

const SELF_RAG_PASS_THRESHOLD = 0.5;
const MAX_REQUERY_ATTEMPTS = 1;

// ============================================
// FR-5.1: HyDE - Hypothetical Document Embeddings
// ============================================

/**
 * Generate a hypothetical answer to a user query.
 *
 * This bridges the vocabulary gap between how users ask questions
 * (casual, informal language) and how documents are written
 * (formal, domain-specific language).
 *
 * The hypothetical answer uses vocabulary likely found in the actual
 * documents, improving embedding similarity matching by up to 42%.
 *
 * @param query - The user's natural language question
 * @returns A hypothetical 1-paragraph answer using document-like vocabulary
 */
export async function generateHypotheticalAnswer(query: string): Promise<string> {
  const startTime = Date.now();

  console.log('[RAG-RETRIEVAL] Generating HyDE hypothetical answer', {
    queryLength: query.length,
  });

  try {
    const llmProvider = getLLMProvider();

    const hypotheticalAnswer = await llmProvider.generateHypotheticalAnswer(query);

    console.log('[RAG-RETRIEVAL] HyDE generation complete', {
      answerLength: hypotheticalAnswer.length,
      durationMs: Date.now() - startTime,
    });

    return hypotheticalAnswer;
  } catch (error) {
    console.error('[RAG-RETRIEVAL] HyDE generation failed, falling back to raw query', {
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    });

    // Graceful degradation: if HyDE fails, return the original query.
    // Retrieval will still work, just without the vocabulary bridging benefit.
    return query;
  }
}
```

**Acceptance Criteria:**
1. Given a casual user question like "when should I talk to my boss about a client problem?", the function returns a formal paragraph using vocabulary like "supervisor escalation protocol" and "clinical consultation procedures"
2. If the LLM provider call fails, the function returns the original query string (graceful degradation)
3. The function logs timing information for performance monitoring

**Verification Steps:**
1. Call `generateHypotheticalAnswer("when should I talk to my boss about a problem?")` and verify the returned string is a coherent paragraph (not the raw query)
2. Simulate an LLM provider failure and verify the function returns the original query without throwing
3. Check console logs for `[RAG-RETRIEVAL] HyDE generation complete` with timing data

---

### FR-5.2: Multi-Tier Retrieval Service

**Type:** Service Function
**Description:** Implements the three-tier retrieval strategy: (1) document routing, (2) section retrieval using both direct query and HyDE embeddings, (3) fact enrichment. Uses pgvector cosine similarity via the `match_rag_embeddings` database function.
**Implementation Strategy:** NEW build

---

**File:** `src/lib/services/rag/rag-retrieval-service.ts` (continued)

```typescript
// ============================================
// FR-5.2: Multi-Tier Retrieval Service
// ============================================

/**
 * Search rag_embeddings using pgvector cosine similarity via RPC function.
 *
 * This is a helper that calls the match_rag_embeddings database function.
 * The function performs: 1 - (embedding <=> query_embedding) > threshold
 * and returns results ordered by similarity descending.
 *
 * @param embedding - The query embedding vector (number[])
 * @param tier - Which tier to search: 'document', 'section', or 'fact'
 * @param documentId - Scope search to a specific document
 * @param threshold - Minimum similarity score (0-1)
 * @param count - Maximum number of results to return
 * @returns Matching embeddings with similarity scores
 */
async function searchEmbeddings(
  embedding: number[],
  tier: 'document' | 'section' | 'fact',
  documentId: string,
  threshold: number,
  count: number
): Promise<Array<{
  id: string;
  source_id: string;
  source_type: string;
  content_text: string;
  similarity: number;
}>> {
  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase.rpc('match_rag_embeddings', {
    query_embedding: embedding,
    match_tier: tier,
    match_document_id: documentId,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) {
    console.error('[RAG-RETRIEVAL] Embedding search failed', {
      tier,
      documentId,
      error: error.message,
    });
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      `Embedding search failed for tier ${tier}: ${error.message}`,
      500,
      { tier, documentId }
    );
  }

  return data || [];
}

/**
 * Merge and deduplicate results from two embedding searches (direct query + HyDE).
 * Takes the union of results, keeping the higher similarity score for duplicates.
 *
 * @param resultsA - Results from direct query embedding search
 * @param resultsB - Results from HyDE embedding search
 * @returns Merged, deduplicated results sorted by similarity descending
 */
function mergeSearchResults(
  resultsA: Array<{ id: string; source_id: string; source_type: string; content_text: string; similarity: number }>,
  resultsB: Array<{ id: string; source_id: string; source_type: string; content_text: string; similarity: number }>
): Array<{ id: string; source_id: string; source_type: string; content_text: string; similarity: number }> {
  const merged = new Map<string, { id: string; source_id: string; source_type: string; content_text: string; similarity: number }>();

  for (const result of resultsA) {
    merged.set(result.id, result);
  }

  for (const result of resultsB) {
    const existing = merged.get(result.id);
    if (!existing || result.similarity > existing.similarity) {
      merged.set(result.id, result);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Fetch expert-answered questions for a document to enrich retrieval context.
 * Only includes questions that have been answered by the expert.
 *
 * @param documentId - The document to fetch expert answers for
 * @returns Array of expert Q&A pairs with question text and answer text
 */
async function fetchExpertAnnotations(
  documentId: string
): Promise<Array<{ question: string; answer: string }>> {
  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase
    .from('rag_expert_questions')
    .select('question_text, answer_text')
    .eq('document_id', documentId)
    .eq('status', 'answered')
    .not('answer_text', 'is', null);

  if (error) {
    console.warn('[RAG-RETRIEVAL] Failed to fetch expert annotations, continuing without them', {
      documentId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map(row => ({
    question: row.question_text,
    answer: row.answer_text,
  }));
}

/**
 * Retrieve relevant context from the knowledge base using multi-tier search.
 *
 * The multi-tier retrieval process:
 * 1. Generate HyDE: Create a hypothetical answer to improve search accuracy
 * 2. Embed query: Embed both the original query AND the hypothetical answer
 * 3. Tier 1 - Document routing: Find the top matching document
 * 4. Tier 2 - Section retrieval: Find top 5 sections using BOTH embeddings (union)
 * 5. Tier 3 - Fact enrichment: Find top 10 matching facts
 * 6. Assemble context: Combine sections + facts + expert annotations
 *
 * @param params.knowledgeBaseId - The knowledge base to search within
 * @param params.queryText - The user's question
 * @param params.userId - The authenticated user's ID (for RLS/logging)
 * @returns RetrievalResult with assembled context, sections, facts, and metadata
 */
export async function retrieveContext(params: {
  knowledgeBaseId: string;
  queryText: string;
  userId: string;
}): Promise<RetrievalResult> {
  const { knowledgeBaseId, queryText, userId } = params;
  const startTime = Date.now();

  console.log('[RAG-RETRIEVAL] Starting multi-tier retrieval', {
    knowledgeBaseId,
    queryLength: queryText.length,
    userId,
  });

  try {
    // -----------------------------------------------
    // Step 1: Generate HyDE hypothetical answer
    // -----------------------------------------------
    const hypotheticalAnswer = await generateHypotheticalAnswer(queryText);

    // -----------------------------------------------
    // Step 2: Embed both query and hypothetical answer
    // -----------------------------------------------
    const embeddingProvider = getEmbeddingProvider();

    const [queryEmbedding, hydeEmbedding] = await Promise.all([
      embeddingProvider.generateEmbedding(queryText),
      embeddingProvider.generateEmbedding(hypotheticalAnswer),
    ]);

    console.log('[RAG-RETRIEVAL] Embeddings generated', {
      queryEmbeddingDims: queryEmbedding.length,
      hydeEmbeddingDims: hydeEmbedding.length,
    });

    // -----------------------------------------------
    // Step 3: Tier 1 - Document routing
    // Find the most relevant document in this knowledge base.
    // Phase 1 = single document, but architecture supports multiple.
    // -----------------------------------------------
    const supabase = createServerSupabaseAdminClient();

    // First, get all document IDs in this knowledge base
    const { data: documents, error: docError } = await supabase
      .from('rag_documents')
      .select('id')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('status', 'ready');

    if (docError) {
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        `Failed to fetch documents for knowledge base: ${docError.message}`,
        500,
        { knowledgeBaseId }
      );
    }

    if (!documents || documents.length === 0) {
      console.warn('[RAG-RETRIEVAL] No ready documents found in knowledge base', {
        knowledgeBaseId,
      });
      return {
        sections: [],
        facts: [],
        expertAnnotations: [],
        assembledContext: '',
        documentId: null,
        retrievalTimeMs: Date.now() - startTime,
        tierResults: { tier1: [], tier2: [], tier3: [] },
      };
    }

    // For Phase 1 (single document), use the first ready document.
    // For multi-document (Phase 2+), search Tier 1 embeddings across all documents.
    let matchedDocumentId: string;

    if (documents.length === 1) {
      // Phase 1: single document, skip Tier 1 similarity search
      matchedDocumentId = documents[0].id;
    } else {
      // Phase 2+: search document-level embeddings to find best match
      // Search across all documents in this knowledge base
      let bestMatch: { documentId: string; similarity: number } | null = null;

      for (const doc of documents) {
        const tier1Results = await searchEmbeddings(
          queryEmbedding,
          'document',
          doc.id,
          TIER1_MATCH_THRESHOLD,
          TIER1_MATCH_COUNT
        );

        if (tier1Results.length > 0) {
          const topResult = tier1Results[0];
          if (!bestMatch || topResult.similarity > bestMatch.similarity) {
            bestMatch = { documentId: doc.id, similarity: topResult.similarity };
          }
        }
      }

      matchedDocumentId = bestMatch?.documentId || documents[0].id;

      console.log('[RAG-RETRIEVAL] Tier 1 document routing complete', {
        matchedDocumentId,
        similarity: bestMatch?.similarity || 'N/A (fallback to first)',
        totalDocuments: documents.length,
      });
    }

    // -----------------------------------------------
    // Step 4: Tier 2 - Section retrieval
    // Search section-level embeddings using BOTH query and HyDE embeddings.
    // Take the union of results for maximum recall.
    // -----------------------------------------------
    const [tier2QueryResults, tier2HydeResults] = await Promise.all([
      searchEmbeddings(
        queryEmbedding,
        'section',
        matchedDocumentId,
        TIER2_MATCH_THRESHOLD,
        TIER2_MATCH_COUNT
      ),
      searchEmbeddings(
        hydeEmbedding,
        'section',
        matchedDocumentId,
        TIER2_MATCH_THRESHOLD,
        TIER2_MATCH_COUNT
      ),
    ]);

    const tier2Merged = mergeSearchResults(tier2QueryResults, tier2HydeResults);

    console.log('[RAG-RETRIEVAL] Tier 2 section retrieval complete', {
      queryResults: tier2QueryResults.length,
      hydeResults: tier2HydeResults.length,
      mergedResults: tier2Merged.length,
    });

    // -----------------------------------------------
    // Step 5: Tier 3 - Fact enrichment
    // Search fact-level embeddings for specific factual queries.
    // -----------------------------------------------
    const tier3Results = await searchEmbeddings(
      queryEmbedding,
      'fact',
      matchedDocumentId,
      TIER3_MATCH_THRESHOLD,
      TIER3_MATCH_COUNT
    );

    console.log('[RAG-RETRIEVAL] Tier 3 fact enrichment complete', {
      factResults: tier3Results.length,
    });

    // -----------------------------------------------
    // Step 6: Fetch expert annotations for this document
    // -----------------------------------------------
    const expertAnnotations = await fetchExpertAnnotations(matchedDocumentId);

    // -----------------------------------------------
    // Step 7: Assemble context from all tiers
    // -----------------------------------------------
    const sections: RetrievedSection[] = tier2Merged.map((result, index) => ({
      id: result.source_id,
      embeddingId: result.id,
      sectionNumber: index + 1,
      content: result.content_text,
      similarity: result.similarity,
    }));

    const facts: RetrievedFact[] = tier3Results.map(result => ({
      id: result.source_id,
      embeddingId: result.id,
      content: result.content_text,
      similarity: result.similarity,
    }));

    const assembledContext = assembleContextString(sections, facts, expertAnnotations);

    const retrievalTimeMs = Date.now() - startTime;

    console.log('[RAG-RETRIEVAL] Multi-tier retrieval complete', {
      sections: sections.length,
      facts: facts.length,
      expertAnnotations: expertAnnotations.length,
      assembledContextLength: assembledContext.length,
      retrievalTimeMs,
    });

    return {
      sections,
      facts,
      expertAnnotations,
      assembledContext,
      documentId: matchedDocumentId,
      retrievalTimeMs,
      tierResults: {
        tier1: [{ documentId: matchedDocumentId, similarity: 1.0 }],
        tier2: tier2Merged.map(r => ({ id: r.id, similarity: r.similarity })),
        tier3: tier3Results.map(r => ({ id: r.id, similarity: r.similarity })),
      },
    };
  } catch (error) {
    const retrievalTimeMs = Date.now() - startTime;

    if (error instanceof AppError) {
      throw error;
    }

    console.error('[RAG-RETRIEVAL] Multi-tier retrieval failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      knowledgeBaseId,
      retrievalTimeMs,
    });

    throw new AppError(
      ErrorCode.AI_SERVICE_ERROR,
      `Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { knowledgeBaseId, retrievalTimeMs }
    );
  }
}

/**
 * Assemble retrieved sections, facts, and expert annotations into
 * a structured context string for the LLM prompt.
 *
 * Format follows the context assembly template defined in the architecture:
 * - Sections ordered by relevance with [Section N] labels
 * - Facts as a bulleted list
 * - Expert annotations as Q&A pairs
 */
function assembleContextString(
  sections: RetrievedSection[],
  facts: RetrievedFact[],
  expertAnnotations: Array<{ question: string; answer: string }>
): string {
  const parts: string[] = [];

  // Add sections
  if (sections.length > 0) {
    parts.push('DOCUMENT CONTEXT:');
    for (const section of sections) {
      parts.push('---');
      parts.push(`[Section ${section.sectionNumber}]`);
      parts.push(section.content);
    }
    parts.push('---');
  }

  // Add facts
  if (facts.length > 0) {
    parts.push('');
    parts.push('RELEVANT FACTS:');
    for (const fact of facts) {
      parts.push(`- ${fact.content}`);
    }
  }

  // Add expert annotations
  if (expertAnnotations.length > 0) {
    parts.push('');
    parts.push('EXPERT-PROVIDED CONTEXT:');
    for (const annotation of expertAnnotations) {
      parts.push(`- Q: ${annotation.question}`);
      parts.push(`  A: ${annotation.answer}`);
    }
  }

  return parts.join('\n');
}
```

**Pattern Source:** `searchEmbeddings` follows the Supabase RPC pattern used in the existing codebase. `mergeSearchResults` uses the same Map-based deduplication pattern found in `multi-turn-conversation-service.ts`.

**Acceptance Criteria:**
1. Given a knowledge base with ingested documents, `retrieveContext` returns sections ordered by relevance score
2. Both the direct query embedding and HyDE embedding are used for Tier 2 section search, with results merged (union, highest similarity wins)
3. Tier 3 fact enrichment returns up to 10 relevant facts
4. Expert annotations are included when available (questions with status='answered')
5. The assembled context string follows the documented format with `[Section N]` labels
6. If the knowledge base has no ready documents, an empty result is returned (not an error)
7. All operations are logged with timing information

**Verification Steps:**
1. Upload and process a test document through the ingestion pipeline
2. Call `retrieveContext({ knowledgeBaseId, queryText: "test question", userId })` and verify:
   - `sections` array is non-empty with similarity scores between 0 and 1
   - `assembledContext` string contains `DOCUMENT CONTEXT:` and `[Section 1]` markers
   - `retrievalTimeMs` is populated
3. Verify Tier 2 uses both embeddings by checking logs for both `queryResults` and `hydeResults` counts
4. Test with a knowledge base that has no documents and verify an empty result (not an error)

---

### FR-5.3: Self-RAG / Corrective RAG Evaluation

**Type:** Service Function
**Description:** After retrieving context, evaluates whether it is sufficient to answer the user's query. If the context scores below the threshold, triggers a broader re-query to improve recall. This prevents hallucination by catching insufficient context before response generation.
**Implementation Strategy:** NEW build

---

**File:** `src/lib/services/rag/rag-retrieval-service.ts` (continued)

```typescript
// ============================================
// FR-5.3: Self-RAG / Corrective RAG Evaluation
// ============================================

/**
 * Evaluate whether the retrieved context is sufficient to answer the query.
 *
 * Uses the LLM Provider (Claude Haiku for speed and cost) to score the
 * relevance and sufficiency of the assembled context relative to the query.
 *
 * Self-RAG evaluation catches bad retrievals before they lead to
 * hallucinated responses. This is critical for building user trust,
 * especially with non-technical users who cannot evaluate answer quality.
 *
 * @param query - The user's original question
 * @param assembledContext - The context string assembled from retrieval results
 * @returns SelfRAGEvaluation with score (0-1), pass/fail, and reasoning
 */
export async function evaluateRetrieval(
  query: string,
  assembledContext: string
): Promise<SelfRAGEvaluation> {
  const startTime = Date.now();

  console.log('[RAG-RETRIEVAL] Starting Self-RAG evaluation', {
    queryLength: query.length,
    contextLength: assembledContext.length,
  });

  // If there is no context at all, fail immediately
  if (!assembledContext || assembledContext.trim().length === 0) {
    console.log('[RAG-RETRIEVAL] Self-RAG: No context available, evaluation failed');
    return {
      score: 0,
      passed: false,
      reasoning: 'No context was retrieved from the knowledge base.',
      evaluationTimeMs: Date.now() - startTime,
    };
  }

  try {
    const llmProvider = getLLMProvider();

    const evaluation = await llmProvider.evaluateRetrieval(query, assembledContext);

    const passed = evaluation.score >= SELF_RAG_PASS_THRESHOLD;

    console.log('[RAG-RETRIEVAL] Self-RAG evaluation complete', {
      score: evaluation.score,
      passed,
      durationMs: Date.now() - startTime,
    });

    return {
      score: evaluation.score,
      passed,
      reasoning: evaluation.reasoning,
      evaluationTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[RAG-RETRIEVAL] Self-RAG evaluation failed, defaulting to pass', {
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    });

    // Graceful degradation: if evaluation fails, assume context is sufficient
    // and proceed with generation. Better to potentially hallucinate than to
    // block all responses due to an evaluation service failure.
    return {
      score: 0.6,
      passed: true,
      reasoning: 'Self-RAG evaluation failed; proceeding with available context.',
      evaluationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Re-query with broader search parameters when Self-RAG evaluation fails.
 *
 * This is the "corrective" part of Corrective RAG. When the initial
 * retrieval produces insufficient context, this function:
 * - Lowers the similarity threshold (more permissive matching)
 * - Expands result counts (top 10 sections instead of top 5)
 * - Returns the expanded context for re-evaluation
 *
 * @param params.knowledgeBaseId - The knowledge base to search within
 * @param params.queryText - The user's question
 * @param params.userId - The authenticated user's ID
 * @param params.previousResults - The previous retrieval result (used to avoid re-fetching identical data)
 * @returns RetrievalResult with expanded context from broader search
 */
export async function reQueryWithBroaderSearch(params: {
  knowledgeBaseId: string;
  queryText: string;
  userId: string;
  previousResults: RetrievalResult;
}): Promise<RetrievalResult> {
  const { knowledgeBaseId, queryText, userId, previousResults } = params;
  const startTime = Date.now();

  console.log('[RAG-RETRIEVAL] Re-querying with broader search parameters', {
    knowledgeBaseId,
    previousSections: previousResults.sections.length,
    previousFacts: previousResults.facts.length,
  });

  try {
    // Use the same document from the previous search
    const documentId = previousResults.documentId;

    if (!documentId) {
      console.warn('[RAG-RETRIEVAL] No document ID from previous results, cannot re-query');
      return previousResults;
    }

    // Re-embed query (reuse from cache if provider supports it)
    const embeddingProvider = getEmbeddingProvider();
    const queryEmbedding = await embeddingProvider.generateEmbedding(queryText);

    // Also generate HyDE for broader search
    const hypotheticalAnswer = await generateHypotheticalAnswer(queryText);
    const hydeEmbedding = await embeddingProvider.generateEmbedding(hypotheticalAnswer);

    // Broader Tier 2 search: lower threshold, more results
    const [broadQueryResults, broadHydeResults] = await Promise.all([
      searchEmbeddings(
        queryEmbedding,
        'section',
        documentId,
        TIER2_BROAD_MATCH_THRESHOLD,
        TIER2_BROAD_MATCH_COUNT
      ),
      searchEmbeddings(
        hydeEmbedding,
        'section',
        documentId,
        TIER2_BROAD_MATCH_THRESHOLD,
        TIER2_BROAD_MATCH_COUNT
      ),
    ]);

    const tier2Merged = mergeSearchResults(broadQueryResults, broadHydeResults);

    // Broader Tier 3 search: lower threshold, more results
    const tier3Results = await searchEmbeddings(
      queryEmbedding,
      'fact',
      documentId,
      TIER3_BROAD_MATCH_THRESHOLD,
      TIER3_BROAD_MATCH_COUNT
    );

    // Fetch expert annotations (same as initial retrieval)
    const expertAnnotations = await fetchExpertAnnotations(documentId);

    // Assemble expanded context
    const sections: RetrievedSection[] = tier2Merged.map((result, index) => ({
      id: result.source_id,
      embeddingId: result.id,
      sectionNumber: index + 1,
      content: result.content_text,
      similarity: result.similarity,
    }));

    const facts: RetrievedFact[] = tier3Results.map(result => ({
      id: result.source_id,
      embeddingId: result.id,
      content: result.content_text,
      similarity: result.similarity,
    }));

    const assembledContext = assembleContextString(sections, facts, expertAnnotations);

    const retrievalTimeMs = Date.now() - startTime;

    console.log('[RAG-RETRIEVAL] Broader re-query complete', {
      sections: sections.length,
      facts: facts.length,
      assembledContextLength: assembledContext.length,
      retrievalTimeMs,
    });

    return {
      sections,
      facts,
      expertAnnotations,
      assembledContext,
      documentId,
      retrievalTimeMs,
      tierResults: {
        tier1: previousResults.tierResults.tier1,
        tier2: tier2Merged.map(r => ({ id: r.id, similarity: r.similarity })),
        tier3: tier3Results.map(r => ({ id: r.id, similarity: r.similarity })),
      },
    };
  } catch (error) {
    console.error('[RAG-RETRIEVAL] Broader re-query failed, returning previous results', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Graceful degradation: return the previous results rather than failing
    return previousResults;
  }
}
```

**Pattern Source:** Error handling follows `AppError` pattern from `src/lib/types/errors.ts`. Graceful degradation pattern follows the existing `callInferenceEndpoint` approach where service failures return fallback values rather than propagating errors that would break the user experience.

**Acceptance Criteria:**
1. `evaluateRetrieval` returns a score between 0 and 1 with a boolean `passed` flag
2. If score < 0.5, `passed` is false; if score >= 0.5, `passed` is true
3. If no context is provided (empty string), the function immediately returns score 0 with `passed: false`
4. If the LLM evaluation call fails, the function defaults to `passed: true` (score 0.6) for graceful degradation
5. `reQueryWithBroaderSearch` uses lower thresholds (0.3 for sections, 0.25 for facts) and higher result counts (10 sections, 20 facts)
6. If re-query fails, the previous results are returned rather than throwing an error

**Verification Steps:**
1. Call `evaluateRetrieval("What is the refund policy?", assembledContextFromRetrieval)` with relevant context and verify score > 0.5
2. Call `evaluateRetrieval("What is quantum physics?", assembledContextAboutRefunds)` with irrelevant context and verify score < 0.5
3. Call `evaluateRetrieval("anything", "")` and verify immediate score 0 with `passed: false`
4. Call `reQueryWithBroaderSearch` and verify the returned sections count is larger than the initial retrieval
5. Check logs for `[RAG-RETRIEVAL] Broader re-query complete` with expanded result counts

---

### FR-5.4: Context Assembly and Response Generation

**Type:** Service Function
**Description:** The main orchestrator function that combines retrieval, Self-RAG evaluation, context assembly, and response generation. Handles the three-way mode selector (RAG Only / LoRA Only / RAG + LoRA) by routing to the appropriate model endpoint.
**Implementation Strategy:** NEW build (integrates with EXISTING `callInferenceEndpoint` from `src/lib/services/inference-service.ts`)

---

**File:** `src/lib/services/rag/rag-retrieval-service.ts` (continued)

```typescript
// ============================================
// FR-5.4: Context Assembly and Response Generation
// ============================================

/**
 * Build the system prompt for RAG-augmented queries.
 *
 * Instructs the model to:
 * - Answer based ONLY on the provided context
 * - Cite specific sections using [Section N] format
 * - Acknowledge when context is insufficient
 * - Be concise and direct
 */
function buildRAGSystemPrompt(assembledContext: string): string {
  return `You are answering questions about a document. Use ONLY the following context to answer.
If the context does not contain sufficient information, say "I don't have enough information to answer this question based on the available document."

${assembledContext}

Cite your sources using [Section N] format. Be concise and direct.`;
}

/**
 * Build the system prompt for uncertainty responses (when Self-RAG fails).
 */
function buildUncertaintySystemPrompt(assembledContext: string): string {
  return `You are answering questions about a document, but the system determined that the available context may not be sufficient to fully answer this question.

${assembledContext}

Answer as best you can using the available context, but clearly indicate what you are uncertain about. Use [Section N] citations where possible. If you cannot provide a meaningful answer, say so directly.`;
}

/**
 * Extract citation references from a model response.
 *
 * Parses [Section N] markers from the response text and creates
 * structured citation objects linking back to retrieved sections.
 *
 * @param responseText - The model's generated response
 * @param sections - The retrieved sections used as context
 * @returns Array of RAGCitation objects
 */
function extractCitations(
  responseText: string,
  sections: RetrievedSection[]
): RAGCitation[] {
  const citations: RAGCitation[] = [];
  const citationRegex = /\[Section\s+(\d+)\]/g;
  let match: RegExpExecArray | null;

  const seenSectionNumbers = new Set<number>();

  while ((match = citationRegex.exec(responseText)) !== null) {
    const sectionNumber = parseInt(match[1], 10);

    // Deduplicate citations
    if (seenSectionNumbers.has(sectionNumber)) {
      continue;
    }
    seenSectionNumbers.add(sectionNumber);

    const section = sections.find(s => s.sectionNumber === sectionNumber);
    if (section) {
      citations.push({
        sectionNumber,
        sectionId: section.id,
        content: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : ''),
        similarity: section.similarity,
      });
    }
  }

  return citations;
}

/**
 * Log a RAG query to the rag_queries table for analytics and quality tracking.
 *
 * @param params - Query details to log
 */
async function logQuery(params: {
  knowledgeBaseId: string;
  documentId: string | null;
  userId: string;
  queryText: string;
  mode: RAGQueryMode;
  responseText: string;
  citations: RAGCitation[];
  retrievalTimeMs: number;
  generationTimeMs: number;
  selfRAGScore: number;
  selfRAGPassed: boolean;
  sectionsRetrieved: number;
  factsRetrieved: number;
}): Promise<string | null> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('rag_queries')
      .insert({
        knowledge_base_id: params.knowledgeBaseId,
        document_id: params.documentId,
        user_id: params.userId,
        query_text: params.queryText,
        mode: params.mode,
        response_text: params.responseText,
        citations: params.citations,
        retrieval_time_ms: params.retrievalTimeMs,
        generation_time_ms: params.generationTimeMs,
        self_rag_score: params.selfRAGScore,
        self_rag_passed: params.selfRAGPassed,
        sections_retrieved: params.sectionsRetrieved,
        facts_retrieved: params.factsRetrieved,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[RAG-RETRIEVAL] Failed to log query, continuing without logging', {
        error: error.message,
      });
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.warn('[RAG-RETRIEVAL] Query logging exception, continuing', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Query the knowledge base - main entry point for the retrieval + generation pipeline.
 *
 * This is the top-level orchestrator that handles the complete flow:
 *
 * 1. If mode is 'lora_only': Skip retrieval, send query directly to adapted model
 * 2. If mode is 'rag_only' or 'rag_lora':
 *    a. Call retrieveContext() to get relevant sections and facts
 *    b. Call evaluateRetrieval() for Self-RAG check
 *    c. If Self-RAG fails: call reQueryWithBroaderSearch(), re-evaluate
 *    d. If still fails: generate response acknowledging uncertainty
 *    e. Assemble final prompt with context, citations, and system instructions
 *    f. If mode is 'rag_only': Send to inference service with endpointType='control'
 *    g. If mode is 'rag_lora': Send to inference service with endpointType='adapted'
 * 3. Parse response, extract citations
 * 4. Log the query in rag_queries table
 * 5. Return response with citations and metadata
 *
 * @param params.knowledgeBaseId - The knowledge base to query
 * @param params.queryText - The user's question
 * @param params.userId - The authenticated user's ID
 * @param params.mode - 'rag_only' | 'lora_only' | 'rag_lora'
 * @param params.jobId - The training job ID (required for LoRA modes to resolve endpoints)
 * @param params.endpointId - The inference endpoint ID (required for sending inference requests)
 * @param params.adapterPath - The adapter file path (required for adapted endpoint in serverless mode)
 * @returns RAGQueryResponse with response text, citations, quality metadata
 */
export async function queryKnowledgeBase(params: {
  knowledgeBaseId: string;
  queryText: string;
  userId: string;
  mode: RAGQueryMode;
  jobId?: string;
  endpointId?: string;
  adapterPath?: string;
}): Promise<RAGQueryResponse> {
  const {
    knowledgeBaseId,
    queryText,
    userId,
    mode,
    jobId,
    endpointId,
    adapterPath,
  } = params;

  const startTime = Date.now();

  console.log('[RAG-RETRIEVAL] Starting knowledge base query', {
    knowledgeBaseId,
    mode,
    queryLength: queryText.length,
    userId,
    hasJobId: !!jobId,
    hasEndpointId: !!endpointId,
  });

  try {
    // -----------------------------------------------
    // MODE: lora_only - Skip retrieval entirely
    // -----------------------------------------------
    if (mode === 'lora_only') {
      return await handleLoRAOnlyQuery({
        queryText,
        userId,
        knowledgeBaseId,
        jobId,
        endpointId,
        adapterPath,
        startTime,
      });
    }

    // -----------------------------------------------
    // MODES: rag_only or rag_lora - Full retrieval pipeline
    // -----------------------------------------------

    // Step 1: Retrieve context
    let retrievalResult = await retrieveContext({
      knowledgeBaseId,
      queryText,
      userId,
    });

    // Step 2: Self-RAG evaluation
    let selfRAGResult = await evaluateRetrieval(queryText, retrievalResult.assembledContext);

    // Step 3: If Self-RAG fails, try broader search
    let requeryAttempts = 0;
    if (!selfRAGResult.passed && requeryAttempts < MAX_REQUERY_ATTEMPTS) {
      console.log('[RAG-RETRIEVAL] Self-RAG failed, attempting broader search', {
        score: selfRAGResult.score,
        reasoning: selfRAGResult.reasoning,
      });

      retrievalResult = await reQueryWithBroaderSearch({
        knowledgeBaseId,
        queryText,
        userId,
        previousResults: retrievalResult,
      });

      // Re-evaluate with expanded context
      selfRAGResult = await evaluateRetrieval(queryText, retrievalResult.assembledContext);
      requeryAttempts++;

      console.log('[RAG-RETRIEVAL] Broader search re-evaluation', {
        score: selfRAGResult.score,
        passed: selfRAGResult.passed,
        attempt: requeryAttempts,
      });
    }

    // Step 4: Build the system prompt
    const isUncertain = !selfRAGResult.passed;
    const systemPrompt = isUncertain
      ? buildUncertaintySystemPrompt(retrievalResult.assembledContext)
      : buildRAGSystemPrompt(retrievalResult.assembledContext);

    // Step 5: Send to the appropriate model endpoint
    const useAdapter = mode === 'rag_lora';
    const generationStartTime = Date.now();

    let responseText: string;
    let generationTimeMs: number;
    let tokensUsed: number;

    if (endpointId) {
      // Use existing inference service (for LoRA-capable models on RunPod)
      const inferenceResult = await callInferenceEndpoint(
        endpointId,
        queryText,
        systemPrompt,
        useAdapter,
        adapterPath,
        jobId
      );

      responseText = inferenceResult.response;
      generationTimeMs = inferenceResult.generationTimeMs;
      tokensUsed = inferenceResult.tokensUsed;
    } else {
      // Fallback: Use LLM provider directly (Claude API for RAG-only mode
      // when no inference endpoint is configured)
      const llmProvider = getLLMProvider();
      const llmResult = await llmProvider.generateResponse(
        systemPrompt,
        queryText
      );

      responseText = llmResult.response;
      generationTimeMs = Date.now() - generationStartTime;
      tokensUsed = llmResult.tokensUsed || 0;
    }

    console.log('[RAG-RETRIEVAL] Response generated', {
      mode,
      responseLength: responseText.length,
      generationTimeMs,
      tokensUsed,
      isUncertain,
    });

    // Step 6: Extract citations from the response
    const citations = extractCitations(responseText, retrievalResult.sections);

    // Step 7: Log the query
    const totalTimeMs = Date.now() - startTime;

    const queryId = await logQuery({
      knowledgeBaseId,
      documentId: retrievalResult.documentId,
      userId,
      queryText,
      mode,
      responseText,
      citations,
      retrievalTimeMs: retrievalResult.retrievalTimeMs,
      generationTimeMs,
      selfRAGScore: selfRAGResult.score,
      selfRAGPassed: selfRAGResult.passed,
      sectionsRetrieved: retrievalResult.sections.length,
      factsRetrieved: retrievalResult.facts.length,
    });

    console.log('[RAG-RETRIEVAL] Query complete', {
      queryId,
      mode,
      totalTimeMs,
      citations: citations.length,
      isUncertain,
    });

    // Step 8: Return the complete response
    return {
      queryId,
      responseText,
      citations,
      mode,
      isUncertain,
      selfRAGScore: selfRAGResult.score,
      selfRAGPassed: selfRAGResult.passed,
      selfRAGReasoning: selfRAGResult.reasoning,
      retrievalMetadata: {
        documentId: retrievalResult.documentId,
        sectionsRetrieved: retrievalResult.sections.length,
        factsRetrieved: retrievalResult.facts.length,
        expertAnnotationsUsed: retrievalResult.expertAnnotations.length,
        retrievalTimeMs: retrievalResult.retrievalTimeMs,
        generationTimeMs,
        totalTimeMs,
        tokensUsed,
        requeryAttempts,
      },
    };
  } catch (error) {
    const totalTimeMs = Date.now() - startTime;

    if (error instanceof AppError) {
      throw error;
    }

    console.error('[RAG-RETRIEVAL] Knowledge base query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      knowledgeBaseId,
      mode,
      totalTimeMs,
    });

    throw new AppError(
      ErrorCode.AI_SERVICE_ERROR,
      `Knowledge base query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { knowledgeBaseId, mode, totalTimeMs }
    );
  }
}

/**
 * Handle LoRA-only mode queries.
 *
 * In LoRA-only mode, no retrieval is performed. The query is sent
 * directly to the adapted model (with LoRA weights applied).
 * This allows users to see the LoRA model's responses without
 * any RAG context for comparison purposes.
 */
async function handleLoRAOnlyQuery(params: {
  queryText: string;
  userId: string;
  knowledgeBaseId: string;
  jobId?: string;
  endpointId?: string;
  adapterPath?: string;
  startTime: number;
}): Promise<RAGQueryResponse> {
  const {
    queryText,
    userId,
    knowledgeBaseId,
    jobId,
    endpointId,
    adapterPath,
    startTime,
  } = params;

  console.log('[RAG-RETRIEVAL] LoRA-only mode: skipping retrieval');

  if (!endpointId) {
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      'LoRA-only mode requires an inference endpoint. Please ensure a training job with deployed endpoints is selected.',
      400,
      { mode: 'lora_only' }
    );
  }

  const generationStartTime = Date.now();

  // Send directly to adapted endpoint (useAdapter = true)
  const inferenceResult = await callInferenceEndpoint(
    endpointId,
    queryText,
    undefined, // No system prompt with RAG context
    true,      // Use LoRA adapter
    adapterPath,
    jobId
  );

  const generationTimeMs = inferenceResult.generationTimeMs;
  const totalTimeMs = Date.now() - startTime;

  // Log the query (no retrieval data)
  const queryId = await logQuery({
    knowledgeBaseId,
    documentId: null,
    userId,
    queryText,
    mode: 'lora_only',
    responseText: inferenceResult.response,
    citations: [],
    retrievalTimeMs: 0,
    generationTimeMs,
    selfRAGScore: 1.0, // No retrieval to evaluate
    selfRAGPassed: true,
    sectionsRetrieved: 0,
    factsRetrieved: 0,
  });

  console.log('[RAG-RETRIEVAL] LoRA-only query complete', {
    queryId,
    totalTimeMs,
    tokensUsed: inferenceResult.tokensUsed,
  });

  return {
    queryId,
    responseText: inferenceResult.response,
    citations: [],
    mode: 'lora_only',
    isUncertain: false,
    selfRAGScore: 1.0,
    selfRAGPassed: true,
    selfRAGReasoning: 'LoRA-only mode: no retrieval evaluation needed.',
    retrievalMetadata: {
      documentId: null,
      sectionsRetrieved: 0,
      factsRetrieved: 0,
      expertAnnotationsUsed: 0,
      retrievalTimeMs: 0,
      generationTimeMs,
      totalTimeMs,
      tokensUsed: inferenceResult.tokensUsed,
      requeryAttempts: 0,
    },
  };
}
```

**Pattern Source:** `callInferenceEndpoint` usage matches the pattern in `src/lib/services/multi-turn-conversation-service.ts` (lines 606-612) and `src/lib/services/test-service.ts` (lines 370-385). Query logging follows the insert pattern from the existing `rag_queries` table design in Section 1.

**Acceptance Criteria:**
1. `queryKnowledgeBase` with mode `'lora_only'` skips retrieval and sends the query directly to the adapted endpoint
2. `queryKnowledgeBase` with mode `'rag_only'` retrieves context and sends to the control endpoint (base model without LoRA)
3. `queryKnowledgeBase` with mode `'rag_lora'` retrieves context and sends to the adapted endpoint (base model with LoRA)
4. If Self-RAG evaluation fails on initial retrieval, a broader re-query is attempted (once)
5. If Self-RAG still fails after re-query, the response is generated with an uncertainty system prompt and `isUncertain: true` in the response
6. Citations are extracted from `[Section N]` markers in the response text and mapped back to retrieved sections
7. Every query is logged in the `rag_queries` table with all metadata (retrieval time, generation time, Self-RAG scores, sections/facts counts)
8. If no inference endpoint is provided for `'rag_only'` mode, the LLM provider is used directly (Claude API) as a fallback
9. If no inference endpoint is provided for `'lora_only'` mode, a clear error is thrown (LoRA requires an endpoint)
10. The response includes complete metadata: timing, token usage, retrieval details, Self-RAG evaluation results

**Verification Steps:**
1. **RAG Only mode:** Call `queryKnowledgeBase` with `mode: 'rag_only'` and verify:
   - Response contains `[Section N]` citations
   - `citations` array is non-empty
   - `retrievalMetadata.sectionsRetrieved > 0`
   - Query is logged in `rag_queries` table with `mode = 'rag_only'`
2. **LoRA Only mode:** Call `queryKnowledgeBase` with `mode: 'lora_only'` and verify:
   - No retrieval occurs (check logs for "LoRA-only mode: skipping retrieval")
   - `citations` array is empty
   - `retrievalMetadata.sectionsRetrieved === 0`
   - Query is logged with `mode = 'lora_only'`
3. **RAG + LoRA mode:** Call `queryKnowledgeBase` with `mode: 'rag_lora'` and verify:
   - Response contains citations AND uses adapted model
   - Logs show `useAdapter: true` in inference call
4. **Self-RAG failure handling:** Test with a query unrelated to the document content and verify:
   - Self-RAG evaluation returns `passed: false`
   - Broader re-query is attempted (check logs)
   - Response includes `isUncertain: true`
   - Response text includes uncertainty language
5. **Error handling:** Call `queryKnowledgeBase` with `mode: 'lora_only'` and no `endpointId` and verify an `AppError` with `INVALID_INPUT` code is thrown
6. **Query logging:** After any successful query, verify a new row exists in `rag_queries` with all expected fields populated

---

### FR-5.5: Database Function for Vector Similarity Search

**Type:** Database Function (SQL)
**Description:** The `match_rag_embeddings` PostgreSQL function that powers all pgvector similarity searches in the retrieval pipeline. This function must be added to the Section 1 migration SQL.
**Implementation Strategy:** NEW build (database function)

---

> **IMPORTANT: Section 1 Migration Addition**
>
> The following SQL function MUST be added to the Section 1 database migration (in `008-rag-frontier-rag-detailed-spec_v1-section-1.md`, as part of FR-1.1). It is included here because it is defined by the retrieval pipeline's requirements, but it must be executed as part of the initial database setup before this service can function.

**File:** Add to Section 1 migration SQL (after the `rag_embeddings` table and its indexes)

```sql
-- ============================================
-- FR-5.5: Vector similarity search function
-- Used by rag-retrieval-service.ts for multi-tier retrieval
-- ============================================

CREATE OR REPLACE FUNCTION match_rag_embeddings(
  query_embedding vector(1536),
  match_tier text,
  match_document_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  source_type text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.source_id,
    re.source_type,
    re.content_text,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM rag_embeddings re
  WHERE re.tier = match_tier
    AND re.document_id = match_document_id
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users (for RPC calls via Supabase client)
GRANT EXECUTE ON FUNCTION match_rag_embeddings(vector(1536), text, uuid, float, int)
  TO authenticated;

-- Grant execute permission to service_role (for admin client calls)
GRANT EXECUTE ON FUNCTION match_rag_embeddings(vector(1536), text, uuid, float, int)
  TO service_role;
```

**How this function works:**

1. **Input:** A query embedding vector (1536 dimensions for OpenAI text-embedding-3-small), the tier to search ('document', 'section', or 'fact'), the document ID to scope the search, a minimum similarity threshold, and a maximum result count.

2. **Similarity calculation:** Uses pgvector's `<=>` operator (cosine distance). Cosine distance ranges from 0 (identical) to 2 (opposite). We convert to similarity with `1 - distance`, giving a range of -1 to 1 (where 1 = identical).

3. **Filtering:** Only returns results where similarity exceeds the threshold, scoped to the specified tier and document.

4. **Ordering:** Results are ordered by ascending cosine distance (= descending similarity), limited to `match_count` results.

5. **Supabase RPC:** This function is called via `supabase.rpc('match_rag_embeddings', { ... })` from the TypeScript service.

**Acceptance Criteria:**
1. The function is created in the database as part of the Section 1 migration
2. It accepts a 1536-dimension vector, tier string, document UUID, threshold float, and count integer
3. It returns rows with id, source_id, source_type, content_text, and similarity columns
4. Results are filtered by tier and document_id
5. Only results with similarity above the threshold are returned
6. Results are ordered by similarity descending, limited to match_count
7. Both `authenticated` and `service_role` roles can execute the function

**Verification Steps:**
1. After running the Section 1 migration, execute this test query in Supabase SQL Editor:
   ```sql
   SELECT * FROM match_rag_embeddings(
     '[0.1, 0.2, ...]'::vector(1536),  -- test vector
     'section',
     'some-document-uuid'::uuid,
     0.5,
     5
   );
   ```
   Verify it returns results (or empty set if no matching data exists)
2. Verify the function exists: `SELECT proname FROM pg_proc WHERE proname = 'match_rag_embeddings';`
3. Test from the TypeScript service using `supabase.rpc('match_rag_embeddings', { ... })` and verify no permission errors

---

## Types Referenced

The following types are used by this service and must be defined in `src/types/rag.ts` (Section 2, FR-2.1). They are listed here for completeness and cross-reference:

```typescript
/**
 * Types used by the retrieval pipeline.
 * These MUST be defined in src/types/rag.ts as part of Section 2.
 */

/** Three-way mode selector for RAG queries */
export type RAGQueryMode = 'rag_only' | 'lora_only' | 'rag_lora';

/** A retrieved section from Tier 2 search */
export interface RetrievedSection {
  id: string;           // source_id from rag_embeddings (maps to rag_sections.id)
  embeddingId: string;  // id from rag_embeddings
  sectionNumber: number; // position in the assembled context (1-indexed)
  content: string;       // content_text from rag_embeddings
  similarity: number;    // cosine similarity score (0-1)
}

/** A retrieved fact from Tier 3 search */
export interface RetrievedFact {
  id: string;           // source_id from rag_embeddings (maps to rag_facts.id)
  embeddingId: string;  // id from rag_embeddings
  content: string;       // content_text from rag_embeddings
  similarity: number;    // cosine similarity score (0-1)
}

/** Result of the Self-RAG / Corrective RAG evaluation */
export interface SelfRAGEvaluation {
  score: number;          // 0-1 relevance/sufficiency score
  passed: boolean;        // true if score >= 0.5
  reasoning: string;      // LLM's explanation of the evaluation
  evaluationTimeMs: number;
}

/** A citation reference in a RAG response */
export interface RAGCitation {
  sectionNumber: number;  // [Section N] reference number
  sectionId: string;      // rag_sections.id for linking
  content: string;        // Truncated section content for display
  similarity: number;     // Similarity score from retrieval
}

/** Complete result from the retrieval stage (before generation) */
export interface RetrievalResult {
  sections: RetrievedSection[];
  facts: RetrievedFact[];
  expertAnnotations: Array<{ question: string; answer: string }>;
  assembledContext: string;
  documentId: string | null;
  retrievalTimeMs: number;
  tierResults: {
    tier1: Array<{ documentId: string; similarity: number }>;
    tier2: Array<{ id: string; similarity: number }>;
    tier3: Array<{ id: string; similarity: number }>;
  };
}

/** Complete response from queryKnowledgeBase */
export interface RAGQueryResponse {
  queryId: string | null;
  responseText: string;
  citations: RAGCitation[];
  mode: RAGQueryMode;
  isUncertain: boolean;
  selfRAGScore: number;
  selfRAGPassed: boolean;
  selfRAGReasoning: string;
  retrievalMetadata: {
    documentId: string | null;
    sectionsRetrieved: number;
    factsRetrieved: number;
    expertAnnotationsUsed: number;
    retrievalTimeMs: number;
    generationTimeMs: number;
    totalTimeMs: number;
    tokensUsed: number;
    requeryAttempts: number;
  };
}
```

---

## Section Summary

**What Was Added:**

| Artifact | Path | Description |
|----------|------|-------------|
| RAG Retrieval Service | `src/lib/services/rag/rag-retrieval-service.ts` | Complete retrieval-to-response pipeline with HyDE, multi-tier search, Self-RAG, and three-way mode selector |
| Database Function | Section 1 migration SQL | `match_rag_embeddings` function for pgvector cosine similarity search via Supabase RPC |
| Type Definitions | `src/types/rag.ts` (Section 2) | `RAGQueryMode`, `RetrievedSection`, `RetrievedFact`, `SelfRAGEvaluation`, `RAGCitation`, `RetrievalResult`, `RAGQueryResponse` |

**What Was Reused:**

| Artifact | Path | How Used |
|----------|------|----------|
| Inference Service | `src/lib/services/inference-service.ts` | `callInferenceEndpoint()` routes to control (base) or adapted (LoRA) model endpoints |
| Supabase Admin Client | `src/lib/supabase-server.ts` | `createServerSupabaseAdminClient()` for database queries bypassing RLS |
| Error Classes | `src/lib/types/errors.ts` | `AppError`, `ErrorCode` for consistent error handling |
| LLM Provider | `src/lib/providers/llm-provider.ts` | `getLLMProvider()` for HyDE generation and Self-RAG evaluation |
| Embedding Provider | `src/lib/providers/embedding-provider.ts` | `getEmbeddingProvider()` for query and HyDE embedding generation |

**Integration Points:**

| Integration | Direction | Description |
|-------------|-----------|-------------|
| Section 1 (Database) | This section reads from | Queries `rag_documents`, `rag_embeddings`, `rag_expert_questions` tables; writes to `rag_queries` table |
| Section 2 (Types & Providers) | This section depends on | Uses all RAG types, LLM Provider (for HyDE + Self-RAG), Embedding Provider (for query embedding) |
| Section 3 (Ingestion) | This section reads data created by | Searches embeddings created during ingestion at all three tiers |
| Section 4 (Expert Q&A) | This section reads data created by | Includes expert answers in assembled context for enrichment |
| Section 6 (API Routes) | This section is called by | The `/api/rag/query` route handler calls `queryKnowledgeBase()` |
| Section 9 (Quality) | This section provides data to | Query logs in `rag_queries` are used for quality evaluation and dashboard metrics |
| Inference Service (existing) | This section calls | `callInferenceEndpoint()` for LoRA model inference in `lora_only` and `rag_lora` modes |

**Exported Functions Summary:**

| Function | Purpose | Called By |
|----------|---------|-----------|
| `generateHypotheticalAnswer(query)` | HyDE: Generate hypothetical answer for vocabulary bridging | `retrieveContext()` internally |
| `retrieveContext(params)` | Multi-tier retrieval: document routing + section search + fact enrichment | `queryKnowledgeBase()` internally |
| `evaluateRetrieval(query, context)` | Self-RAG: Evaluate if retrieved context is sufficient | `queryKnowledgeBase()` internally |
| `reQueryWithBroaderSearch(params)` | Corrective RAG: Re-query with broader parameters | `queryKnowledgeBase()` internally |
| `queryKnowledgeBase(params)` | **Main entry point**: Full retrieval + generation pipeline with mode selector | Section 6 API route handler |

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-5.md`
**Status:** COMPLETE
**Line Count:** ~870 lines (within 1500-line limit)
