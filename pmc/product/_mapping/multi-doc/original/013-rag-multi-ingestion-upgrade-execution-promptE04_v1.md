# 013 — RAG Multi-Pass Ingestion Upgrade: Execution Prompt E04

**Section:** E04 — Phase 2 Multi-Document Retrieval + Phase 3 Retrieval Quality  
**Version:** 1.0  
**Date:** February 16, 2026  
**Prerequisites:** E01 (Schema, Types, Config, Interface, Mappers) + E02 (6 Claude Methods) + E03 (Ingestion Service, Inngest Pipeline, Embedding Enrichment) complete  
**Builds Upon:** E01, E02 & E03  
**Next Section:** E05 (Phase 4 Operational Polish + Cleanup + Testing)

---

## Overview

This prompt implements the second database migration (multi-doc search infrastructure), updates the embedding service for KB-wide vector and text search, and upgrades the retrieval service with hybrid search, Claude Haiku reranking, cross-document dedup, balanced coverage, conversation context, and improved not-found responses.

**What This Section Creates / Modifies:**
1. `scripts/migrations/002-multi-doc-search.js` — SAOL migration:
   - `knowledge_base_id` column on `rag_embeddings` + backfill
   - `content_tsv` tsvector column on `rag_facts`
   - `text_tsv` tsvector column on `rag_sections`
   - `match_rag_embeddings_kb()` RPC function
   - `search_rag_text()` RPC function
2. `src/lib/rag/services/rag-embedding-service.ts` — MODIFY:
   - Update `searchSimilarEmbeddings()` for KB-wide search via `match_rag_embeddings_kb`
   - Add `searchTextContent()` for BM25 keyword search via `search_rag_text`
   - Add `knowledgeBaseId` to `generateAndStoreBatchEmbeddings()`
3. `src/lib/rag/services/rag-retrieval-service.ts` — MODIFY:
   - Update `retrieveContext()` for KB-wide + hybrid search (vector + text merge)
   - Add `rerankWithClaude()` — Haiku reranking
   - Add `deduplicateResults()` — cross-document dedup (>90% overlap removal)
   - Add `balanceMultiDocCoverage()` — max 60% from any single document
   - Update `queryRAG()` to use hybrid search + reranking pipeline
   - Add conversation context (last 3 Q&A pairs) to HyDE and response generation
   - Improve not-found response with suggestions
4. `src/app/api/rag/query/route.ts` — MODIFY: Support KB-wide queries (documentId optional)

**What This Section Does NOT Create:**
- Database schema for feedback (E05)
- UI changes, cleanup scripts, or regression tests (E05)
- Ingestion pipeline changes (already done in E03)

---

========================    


## Prompt E04: Phase 2 Multi-Document Retrieval + Phase 3 Retrieval Quality

You are implementing KB-wide multi-document retrieval and retrieval quality improvements for a RAG system. This is E04 of a 5-part implementation.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

### Prerequisites — What E01, E02, E03 Built

**E01 completed:**
- Database: `rag_facts` has provenance columns (`policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category`). `rag_documents` has `content_hash`, `document_type`.
- Types (`src/types/rag.ts`): `RAGFactType` (14 values), `RAGDocumentType`, `RAGFact` (5 provenance fields), 6 per-pass result interfaces.
- Config: Per-pass model routing + token budgets.
- DB Mappers: Updated with provenance fields.

**E02 completed:**
- `claude-llm-provider.ts` has 6 new extraction methods.

**E03 completed:**
- `rag-ingestion-service.ts` has 8 new helper functions (storeSectionsFromStructure, storeExtractedFacts, linkFactRelationships, etc.).
- `process-rag-document.ts` is a 12-step Inngest multi-pass pipeline.
- `rag-embedding-service.ts` has `buildEnrichedEmbeddingText()` function.
- Documents now have `content_hash` set during upload.

### Critical Rules

1. **Read files before modifying.** Read `rag-embedding-service.ts` (196+ lines), `rag-retrieval-service.ts` (633 lines), and the API route before changing them.
2. **ALL database operations use the admin Supabase client:** `createServerSupabaseAdminClient()`.
3. **ALL database DDL uses SAOL:** `agentExecuteDDL()` via `require('../supa-agent-ops')` with `transport: 'pg'`.
4. **Import paths:** `@/lib/rag/services` for service functions, `@/types/rag` for types.
5. **Do NOT duplicate** code from E03. Reference `buildEnrichedEmbeddingText` etc. via imports.

---

### Task 1: Create Migration 2 — Multi-Doc Search Support

**File:** `scripts/migrations/002-multi-doc-search.js`

Create this NEW file:

```javascript
/**
 * Migration 002: Multi-Document Search Support
 *
 * Adds:
 * - knowledge_base_id on rag_embeddings (denormalized for KB-wide search without joins)
 * - tsvector columns on rag_facts and rag_sections for BM25 keyword search
 * - match_rag_embeddings_kb() RPC replaces match_rag_embeddings (supports KB + doc filters)
 * - search_rag_text() RPC for hybrid BM25 keyword search
 *
 * Prerequisites: Migration 001 (enhanced rag_facts) must be run first.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/migrations/002-multi-doc-search.js
 */

require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const MIGRATION_SQL = `
  -- ================================================
  -- 1. Add knowledge_base_id to rag_embeddings
  -- ================================================
  ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

  -- Backfill knowledge_base_id from documents
  UPDATE rag_embeddings e
  SET knowledge_base_id = d.knowledge_base_id
  FROM rag_documents d
  WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;

  -- ================================================
  -- 2. Full-text search columns (generated tsvectors)
  -- ================================================
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_tsv ON rag_facts USING gin(content_tsv);

  ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS text_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || original_text)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_sections_tsv ON rag_sections USING gin(text_tsv);

  -- ================================================
  -- 3. KB-wide embedding search RPC
  -- ================================================
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL
  )
  RETURNS TABLE (
    id uuid,
    document_id uuid,
    source_type text,
    source_id uuid,
    content_text text,
    similarity float,
    tier int,
    metadata jsonb
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

  -- ================================================
  -- 4. Hybrid text search RPC (BM25-style keyword search)
  -- ================================================
  CREATE OR REPLACE FUNCTION search_rag_text(
    search_query text,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    source_type text,
    source_id uuid,
    document_id uuid,
    content text,
    rank float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    (
      SELECT 'fact'::text, f.id, f.document_id, f.content,
             ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_facts f
      WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    UNION ALL
    (
      SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
             ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_sections s
      WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    ORDER BY rank DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
  console.log('Migration 002: Multi-Doc Search Support');
  console.log('========================================');

  // Dry run first
  const dryRun = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL');
  if (!dryRun.success) {
    console.error('Dry-run failed:', dryRun.summary);
    process.exit(1);
  }

  // Execute
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', result.summary);

  // Verify
  const embedCheck = await saol.agentIntrospectSchema({
    table: 'rag_embeddings',
    includeColumns: true,
    transport: 'pg'
  });
  const embedCols = embedCheck.tables?.[0]?.columns?.map(c => c.name) || [];
  console.log('\nVerification:');
  console.log('  rag_embeddings.knowledge_base_id:', embedCols.includes('knowledge_base_id') ? '✓' : '✗');

  const factCheck = await saol.agentIntrospectSchema({
    table: 'rag_facts',
    includeColumns: true,
    transport: 'pg'
  });
  const factCols = factCheck.tables?.[0]?.columns?.map(c => c.name) || [];
  console.log('  rag_facts.content_tsv:', factCols.includes('content_tsv') ? '✓' : '✗');

  const sectionCheck = await saol.agentIntrospectSchema({
    table: 'rag_sections',
    includeColumns: true,
    transport: 'pg'
  });
  const sectionCols = sectionCheck.tables?.[0]?.columns?.map(c => c.name) || [];
  console.log('  rag_sections.text_tsv:', sectionCols.includes('text_tsv') ? '✓' : '✗');
})();
```

**Run the migration:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node ../scripts/migrations/002-multi-doc-search.js
```

---

### Task 2: Update Embedding Service for KB-Wide Search

**File:** `src/lib/rag/services/rag-embedding-service.ts`

#### 2.1 Update `searchSimilarEmbeddings()` — Add KB-Wide Support

Find the `searchSimilarEmbeddings` function and update its parameter type and RPC call.

**Current parameter type** (approximately):
```typescript
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  // ...
```

**Replace with:**
```typescript
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;  // NEW: for KB-wide search
  tier?: number;
  limit?: number;
  threshold?: number;
```

Find the Supabase RPC call inside `searchSimilarEmbeddings` that calls `match_rag_embeddings` and replace it with the new KB-wide RPC:

**Replace the existing RPC call with:**
```typescript
    const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
      query_embedding: queryEmbedding,
      match_threshold: params.threshold ?? 0.3,
      match_count: params.limit ?? 20,
      filter_knowledge_base_id: params.knowledgeBaseId || null,
      filter_document_id: params.documentId || null,
      filter_tier: params.tier || null,
    });
```

**Important:** The old RPC name was `match_rag_embeddings`. The new one is `match_rag_embeddings_kb`. The old function still exists in the DB, so there is no breaking change.

#### 2.2 Add `searchTextContent()` — BM25 Keyword Search

Add this NEW function after `searchSimilarEmbeddings`:

```typescript
// ============================================
// Hybrid Text Search (Phase 2)
// ============================================

/**
 * Search facts and sections by BM25 keyword matching (tsvector).
 * Used as the "text" leg of hybrid search — merged with vector results in retrieveContext().
 */
export async function searchTextContent(params: {
  queryText: string;
  knowledgeBaseId?: string;
  documentId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: Array<{
    sourceType: string;
    sourceId: string;
    documentId: string;
    content: string;
    rank: number;
  }>;
  error?: string;
}> {
  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase.rpc('search_rag_text', {
    search_query: params.queryText,
    filter_knowledge_base_id: params.knowledgeBaseId || null,
    filter_document_id: params.documentId || null,
    match_count: params.limit || 10,
  });

  if (error) {
    console.error('[RAG Embedding] Error in text search:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data || []).map((row: any) => ({
      sourceType: row.source_type,
      sourceId: row.source_id,
      documentId: row.document_id,
      content: row.content,
      rank: row.rank,
    })),
  };
}
```

#### 2.3 Update `generateAndStoreBatchEmbeddings()` — Add `knowledgeBaseId`

Find the `generateAndStoreBatchEmbeddings` function. Update the params type to accept `knowledgeBaseId`:

```typescript
export async function generateAndStoreBatchEmbeddings(params: {
  documentId: string;
  userId: string;
  knowledgeBaseId?: string;  // NEW: denormalized for KB-wide search
  items: Array<{
    sourceType: 'document' | 'section' | 'fact';
    sourceId: string;
    contentText: string;
    tier: 1 | 2 | 3;
  }>;
```

And in the insert record construction, add `knowledge_base_id`:

```typescript
    // Inside the batch loop, when building the insert record:
    const record = {
      document_id: params.documentId,
      user_id: params.userId,
      knowledge_base_id: params.knowledgeBaseId || null,  // NEW
      source_type: item.sourceType,
      source_id: item.sourceId,
      content_text: item.contentText,
      embedding: embeddingVector,
      tier: item.tier,
      metadata: {},
    };
```

**Also update the Inngest pipeline's call** in `process-rag-document.ts` (E03's Step 11) to pass `knowledgeBaseId`:

In `process-rag-document.ts`, Step 11's call to `generateAndStoreBatchEmbeddings`:

```typescript
      const result = await generateAndStoreBatchEmbeddings({
        documentId,
        userId: doc.userId,
        knowledgeBaseId: doc.knowledgeBaseId || undefined,  // ADD THIS LINE
        items: embeddingItems,
      });
```

---

### Task 3: Update Retrieval Service for Hybrid Search + Reranking

**File:** `src/lib/rag/services/rag-retrieval-service.ts` (currently 633 lines)

This is the largest set of changes. Read the file first, then make these updates:

#### 3.1 Add Import for `searchTextContent`

Update the import from `./rag-embedding-service`:

```typescript
import { searchSimilarEmbeddings, searchTextContent } from './rag-embedding-service';
```

#### 3.2 Update `retrieveContext()` — Add KB-Wide + Hybrid Search

Update the `retrieveContext` function signature and implementation:

**Current signature (line ~63):**
```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  hydeText?: string;
}): Promise<{
```

**Replace with:**
```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;  // NEW: for KB-wide search
  hydeText?: string;
}): Promise<{
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  sectionIds: string[];
  factIds: string[];
}> {
```

Inside the function, update the calls to `searchSimilarEmbeddings` to pass `knowledgeBaseId`:

```typescript
  // Where searchSimilarEmbeddings is called, add knowledgeBaseId:
  const embeddingResult = await searchSimilarEmbeddings({
    queryText: text,
    documentId: params.documentId,
    knowledgeBaseId: params.knowledgeBaseId,  // ADD THIS
    // ...other existing params...
  });
```

**Add hybrid text search after the vector search loop:**

After the existing vector search results are collected (section/fact maps populated), add:

```typescript
  // ---- Hybrid text search (Phase 2) ----
  const textResults = await searchTextContent({
    queryText: params.queryText,
    documentId: params.documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    limit: 10,
  });

  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
      if (result.sourceType === 'section' && !allSectionIds.has(result.sourceId)) {
        allSectionIds.add(result.sourceId);
        // Fetch section data
        const { data: sectionRow } = await supabase
          .from('rag_sections')
          .select('*')
          .eq('id', result.sourceId)
          .single();
        if (sectionRow) {
          const section = mapRowToSection(sectionRow);
          sectionMap.set(result.sourceId, {
            section,
            similarity: 0.5 + (result.rank * 0.3),  // Normalize BM25 rank to similarity-like score
          });
        }
      } else if (result.sourceType === 'fact' && !allFactIds.has(result.sourceId)) {
        allFactIds.add(result.sourceId);
        const { data: factRow } = await supabase
          .from('rag_facts')
          .select('*')
          .eq('id', result.sourceId)
          .single();
        if (factRow) {
          const fact = mapRowToFact(factRow);
          factMap.set(result.sourceId, {
            fact,
            similarity: 0.5 + (result.rank * 0.3),
          });
        }
      }
    }
  }
```

#### 3.3 Add Reranking Function

Add this NEW function after `retrieveContext()`:

```typescript
// ============================================
// Claude Haiku Reranking (Phase 3)
// ============================================

/**
 * Rerank retrieved candidates using Claude Haiku for fast semantic relevance scoring.
 * Target latency: ~300-500ms.
 */
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
  if (params.candidates.length <= params.topK) {
    // No need to rerank if we have fewer candidates than topK
    return params.candidates.map(c => ({ id: c.id, relevanceScore: c.similarity }));
  }

  const provider = getLLMProvider();

  const candidateList = params.candidates
    .map((c, i) => `[${i}] ${c.content.slice(0, 200)}`)
    .join('\n');

  try {
    // Use Haiku for fast reranking
    const response = await provider.generateResponse({
      queryText: `Rank these passages by relevance to the query: "${params.queryText}"`,
      assembledContext: candidateList,
      systemPrompt: `You are a relevance ranker. Given a query and numbered passages, return ONLY a JSON array of passage indices ordered from most relevant to least relevant. Example output: [3, 0, 5, 1, 2, 4]`,
    });

    // Parse the ranking from Claude's response
    const responseText = response.responseText || '';
    const jsonMatch = responseText.match(/\[[\d,\s]+\]/);
    if (!jsonMatch) {
      console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
      return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
    }

    const rankedIndices: number[] = JSON.parse(jsonMatch[0]);
    const results: Array<{ id: string; relevanceScore: number }> = [];

    for (let rank = 0; rank < Math.min(rankedIndices.length, params.topK); rank++) {
      const idx = rankedIndices[rank];
      if (idx >= 0 && idx < params.candidates.length) {
        results.push({
          id: params.candidates[idx].id,
          // Blend original similarity with rank position
          relevanceScore: params.candidates[idx].similarity * 0.4 + (1 - rank / rankedIndices.length) * 0.6,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[RAG Retrieval] Reranking failed, using original order:', err);
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
  }
}
```

#### 3.4 Add Cross-Document Deduplication

Add this NEW function after `rerankWithClaude()`:

```typescript
// ============================================
// Cross-Document Deduplication (Phase 3)
// ============================================

/**
 * Remove near-duplicate results (>90% text overlap), keeping the higher-scored one.
 * This prevents the same fact from appearing multiple times when documents overlap.
 */
function deduplicateResults<T extends { content: string; similarity: number }>(
  results: T[]
): T[] {
  const deduped: T[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(existing.content, result.content) > 0.9
    );
    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}

/**
 * Simple text similarity using Jaccard coefficient of word sets.
 * Fast enough for dedup (~0.1ms per comparison).
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
```

#### 3.5 Add Balanced Multi-Doc Coverage

Add this NEW function after `deduplicateResults()`:

```typescript
// ============================================
// Balanced Multi-Doc Coverage (Phase 3)
// ============================================

/**
 * Ensure no single document dominates the results.
 * Max 60% of results can come from any single document.
 * Excess results from over-represented documents are dropped in favor of
 * lower-ranked results from under-represented documents.
 */
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = 0.6
): T[] {
  if (results.length === 0) return results;

  // Count unique documents
  const uniqueDocs = new Set(results.map(r => r.documentId));
  if (uniqueDocs.size <= 1) return results;  // Single doc — no balancing needed

  const maxPerDoc = Math.ceil(results.length * maxPerDocRatio);
  const docCounts = new Map<string, number>();
  const balanced: T[] = [];
  const overflow: T[] = [];

  // First pass: take up to maxPerDoc from each document (in similarity order)
  for (const result of results) {
    const count = docCounts.get(result.documentId) || 0;
    if (count < maxPerDoc) {
      balanced.push(result);
      docCounts.set(result.documentId, count + 1);
    } else {
      overflow.push(result);
    }
  }

  return balanced;
}
```

#### 3.6 Update `queryRAG()` — Integrate Hybrid Search + Reranking Pipeline

Find the section in `queryRAG()` where `retrieveContext` is called (approximately line 450-470 in the current file). Update it to:

1. Pass `knowledgeBaseId` to `retrieveContext()`
2. Add reranking after retrieval
3. Add dedup and balancing
4. Add conversation context

**Find the existing HyDE + retrieval section** (approximately):
```typescript
    // Step 1: HyDE
    // ... existing HyDE generation ...

    // Step 2: Retrieve context
    const retrieved = await retrieveContext({
      queryText: params.queryText,
      documentId: params.documentId,
      hydeText,
    });
```

**Replace with:**

```typescript
    // Step 1: HyDE (with conversation context)
    const recentQueries = await getQueryHistory({
      knowledgeBaseId: knowledgeBaseId || undefined,
      userId: params.userId,
      limit: 3,
    });

    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';

    let hydeText = '';
    if (documentSummary) {
      const hydeInput = conversationContext
        ? `${params.queryText}\n\nConversation context:\n${conversationContext}`
        : params.queryText;
      hydeText = await generateHyDE({
        queryText: hydeInput,
        documentSummary,
      });
    }

    // Step 2: Retrieve context (KB-wide hybrid search)
    const retrieved = await retrieveContext({
      queryText: params.queryText,
      documentId: params.documentId || undefined,
      knowledgeBaseId: !params.documentId ? knowledgeBaseId : undefined,
      hydeText,
    });

    // Step 2.5: Rerank + Dedup + Balance (Phase 3)
    let processedFacts = retrieved.facts;
    if (processedFacts.length > 3) {
      // Rerank with Claude Haiku
      const reranked = await rerankWithClaude({
        queryText: params.queryText,
        candidates: processedFacts.map(f => ({
          id: f.id,
          content: f.content,
          similarity: f.similarity,
        })),
        topK: Math.min(processedFacts.length, 15),
      });

      // Rebuild fact list in reranked order
      const rerankedFactMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
      processedFacts = processedFacts
        .filter(f => rerankedFactMap.has(f.id))
        .sort((a, b) => (rerankedFactMap.get(b.id) || 0) - (rerankedFactMap.get(a.id) || 0));
    }

    // Deduplicate cross-document overlaps
    const dedupedFacts = deduplicateResults(
      processedFacts.map(f => ({ ...f, content: f.content, similarity: f.similarity }))
    );

    // Balance multi-doc coverage (if KB-wide search)
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(
          dedupedFacts.map(f => ({ ...f, documentId: f.documentId }))
        )
      : dedupedFacts;
```

**Then update the context assembly call** to use the processed facts:

```typescript
    // Step 3: Assemble context (use balanced/reranked facts)
    const assembledContext = assembleContext({
      sections: retrieved.sections,
      facts: balancedFacts,
      documentSummary,
    });
```

#### 3.7 Update Context Assembly for Multi-Doc Headers

Find the `assembleContext` function. Add document title grouping when results span multiple documents:

After building the context string, add document source headers if multiple documents are represented:

```typescript
// At the start of assembleContext, check if we have multi-doc results:
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
}): string {
  // ... existing context assembly logic ...

  // For multi-doc: group sections by documentId and add headers
  const docIds = new Set(params.sections.map(s => s.documentId));
  const isMultiDoc = docIds.size > 1;

  if (isMultiDoc) {
    // Group sections by documentId
    const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
    for (const section of params.sections) {
      const existing = sectionsByDoc.get(section.documentId) || [];
      existing.push(section);
      sectionsByDoc.set(section.documentId, existing);
    }

    // Build context with document headers
    let contextParts: string[] = [];
    if (params.documentSummary) {
      contextParts.push(`Document Summary: ${params.documentSummary}\n`);
    }

    for (const [docId, sections] of sectionsByDoc) {
      for (const section of sections) {
        const preamble = section.contextualPreamble ? `${section.contextualPreamble}\n\n` : '';
        contextParts.push(`### Section: ${section.title || 'Untitled'}\n${preamble}${section.originalText}`);
      }
    }

    // Add facts
    const factTexts = params.facts
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20)
      .map(f => `[${f.factType}] ${f.content} (confidence: ${f.confidence})`);

    if (factTexts.length > 0) {
      contextParts.push(`\n### Relevant Facts\n${factTexts.join('\n')}`);
    }

    return contextParts.join('\n\n');
  }

  // ... existing single-doc context assembly continues ...
}
```

#### 3.8 Improve Not-Found Response with Suggestions

Find the section in `queryRAG()` after self-eval where it checks the score. Add improved not-found handling:

```typescript
    // After self-RAG evaluation:
    let finalResponseText = responseText;

    if (selfEval && selfEval.score < 0.5) {
      finalResponseText = `I couldn't find a confident answer to "${params.queryText}" in the knowledge base.\n\nHere's what I found (low confidence):\n${responseText}\n\nSuggestions to improve results:\n- Try more specific terms from the document\n- Ask about a specific policy or section by name\n- Rephrase using terminology from the document`;
    }
```

Use `finalResponseText` instead of `responseText` in the query record insert.

---

### Task 4: Update API Route for KB-Wide Queries

**File:** Find the RAG query API route (likely `src/app/api/rag/query/route.ts` or similar).

Read the file first. Then make these changes:

1. **Make `documentId` optional** in the request body validation. The user should be able to query without specifying a document (KB-wide search).

2. **Accept `knowledgeBaseId`** directly in the request body as an alternative:

```typescript
  const { queryText, documentId, knowledgeBaseId, mode, modelJobId } = await req.json();

  // Must have either a documentId or a knowledgeBaseId
  if (!queryText) {
    return NextResponse.json({ success: false, error: 'queryText is required' }, { status: 400 });
  }
  if (!documentId && !knowledgeBaseId) {
    return NextResponse.json({ success: false, error: 'Either documentId or knowledgeBaseId is required' }, { status: 400 });
  }
```

3. **Pass both to `queryRAG()`:**

```typescript
  const result = await queryRAG({
    queryText,
    documentId: documentId || undefined,
    knowledgeBaseId: knowledgeBaseId || undefined,
    userId: session.user.id,
    mode,
    modelJobId,
  });
```

---

### Verification Checklist

After completing all tasks, verify:

1. **Migration 002 ran successfully:**
   ```bash
   cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_embeddings',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name)||[];console.log('knowledge_base_id:',cols.includes('knowledge_base_id')?'✓':'✗');})();"
   ```

2. **TypeScript compilation:** Run `npx tsc --noEmit` — should have no errors.

3. **New exports from `rag-embedding-service.ts`:**
   - `searchTextContent` — new function
   - `searchSimilarEmbeddings` — now accepts `knowledgeBaseId`
   - `generateAndStoreBatchEmbeddings` — now accepts `knowledgeBaseId`

4. **New functions in `rag-retrieval-service.ts`:**
   - `rerankWithClaude` — Haiku-based reranking
   - `deduplicateResults` + `textSimilarity` — cross-doc dedup
   - `balanceMultiDocCoverage` — max 60% per doc

5. **`queryRAG()` now uses:**
   - Conversation context in HyDE
   - KB-wide retrieval when no documentId
   - Hybrid search (vector + text)
   - Reranking → dedup → balance pipeline
   - Improved not-found responses

6. **API route accepts KB-wide queries** (documentId optional when knowledgeBaseId provided).

---

### Files Modified in This Section

| File | Action | Description |
|------|--------|-------------|
| `scripts/migrations/002-multi-doc-search.js` | CREATE | SAOL migration: knowledge_base_id, tsvectors, 2 RPC functions |
| `src/lib/rag/services/rag-embedding-service.ts` | MODIFY | KB-wide search, text search, knowledgeBaseId on batch embeddings |
| `src/lib/rag/services/rag-retrieval-service.ts` | MODIFY | Hybrid search, reranking, dedup, balanced coverage, conversation context, not-found improvements |
| `src/inngest/functions/process-rag-document.ts` | MODIFY | Pass knowledgeBaseId to generateAndStoreBatchEmbeddings |
| `src/app/api/rag/query/route.ts` | MODIFY | Accept KB-wide queries (documentId optional) |

---

### What E05 Will Build On

E05 (Phase 4 Operational Polish + Cleanup + Testing) will:
- Add confidence display UI (using existing `selfEvalScore` from `RAGQuery`)
- Run Migration 3 (feedback columns on rag_queries)
- Add thumbs up/down feedback hooks
- Create query logging dashboard API route
- Create duplicate cleanup script for 6 Sun Chip documents
- Create golden-set regression test (20-30 Q&A pairs)
- All of these depend on the retrieval pipeline upgrades from E04


+++++++++++++++++



