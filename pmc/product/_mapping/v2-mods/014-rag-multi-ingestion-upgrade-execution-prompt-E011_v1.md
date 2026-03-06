# E011: Service Layer — runId Threading Through Embedding, Ingestion, and Retrieval

**Version:** 1.0  
**Date:** February 17, 2026  
**Section:** E011 — Service Layer runId Threading (2 of 4)  
**Prerequisites:** E010 must be complete (migration 004 run, types updated, error fixes applied)  
**Builds Upon:** E010 created `rag_embedding_runs` table, `run_id` column on `rag_embeddings`, updated `match_rag_embeddings_kb` RPC  
**Next Prompt:** E012 (Test Diagnostics + API Endpoints)

---

## Overview

This prompt threads the `runId` parameter through the three core service layers:

1. **Embedding Service** (`rag-embedding-service.ts`) — Add `runId` to `generateAndStoreEmbedding`, `generateAndStoreBatchEmbeddings`, and `searchSimilarEmbeddings`
2. **Ingestion Service** (`rag-ingestion-service.ts`) — Create embedding run record at ingestion time, pass `runId` to batch embeddings, update run status on completion
3. **Retrieval Service** (`rag-retrieval-service.ts`) — Add `runId` to `retrieveContext` and `queryRAG`, pass to `searchSimilarEmbeddings` calls

**What This Prompt Modifies:**
- `src/lib/rag/services/rag-embedding-service.ts` (3 function signatures + RPC call)
- `src/lib/rag/services/rag-ingestion-service.ts` (embedding run lifecycle)
- `src/lib/rag/services/rag-retrieval-service.ts` (runId threading)

**What This Prompt Does NOT Create:**
- API endpoints (E012)
- UI changes (E013)
- Test diagnostics changes (E012)

---

## Prompt 2 of 4: Service Layer — runId Threading

========================


## Context & Instructions

You are implementing Part 2 of 4 of the E09 Golden-Set Test Tool specification. This prompt adds `runId` support to the embedding, ingestion, and retrieval service layers.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

### Prerequisites (E010 Completed)

The following changes from E010 are already in place:
- `rag_embedding_runs` table exists in the database (11 columns: id, document_id, user_id, embedding_count, embedding_model, status, pipeline_version, started_at, completed_at, metadata, created_at)
- `rag_embeddings.run_id` column exists (UUID, nullable, indexed)
- `match_rag_embeddings_kb` RPC accepts `filter_run_id uuid DEFAULT NULL` as its 7th parameter
- `search_rag_text` UNION ORDER BY bug is fixed
- `TestRunSummary` in `golden-set-definitions.ts` has `embeddingRunId?: string` field
- `parseJsonResponse` log noise suppressed
- `rerankWithClaude` has multi-strategy extraction

### Critical Rules

1. **ALL new parameters MUST be optional** (with `undefined` or `null` defaults). Existing callers must NOT break.
2. **Embedding run tracking is non-fatal** — if the run record insert fails during ingestion, processing continues.
3. **DO NOT add npm dependencies.**
4. **Application code uses `createServerSupabaseAdminClient()`** — NOT SAOL.
5. **DO NOT modify function signatures beyond what is specified.**

### Key Files (Read These First)

Before making changes, read and understand the current state of these files:

- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts` (289 lines)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` (987 lines)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` (922 lines)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\config.ts` (98 lines) — contains `RAG_CONFIG.embedding.model`

---

## Task 1: Add `runId` to Embedding Service

### [MODIFY] `src/lib/rag/services/rag-embedding-service.ts`

#### 1a. Add `runId` to `generateAndStoreEmbedding`

**Current function signature (line 28):**

```typescript
export async function generateAndStoreEmbedding(params: {
  documentId: string;
  userId: string;
  sourceType: RAGEmbeddingSourceType;
  sourceId: string;
  contentText: string;
  tier: RAGEmbeddingTier;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; embeddingId?: string; error?: string }>
```

**Add `runId?: string;` to the params object, after `tier`:**

```typescript
export async function generateAndStoreEmbedding(params: {
  documentId: string;
  userId: string;
  sourceType: RAGEmbeddingSourceType;
  sourceId: string;
  contentText: string;
  tier: RAGEmbeddingTier;
  runId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; embeddingId?: string; error?: string }>
```

**And in the database insert record (around line 46), add `run_id` after the `metadata` line:**

```typescript
run_id: params.runId || null,
```

#### 1b. Add `runId` to `generateAndStoreBatchEmbeddings`

**Current function signature (line 73):**

```typescript
export async function generateAndStoreBatchEmbeddings(params: {
  documentId: string;
  userId: string;
  knowledgeBaseId?: string;
  items: Array<{
    sourceType: RAGEmbeddingSourceType;
    sourceId: string;
    contentText: string;
    tier: RAGEmbeddingTier;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<{ success: boolean; count?: number; error?: string }>
```

**Add `runId?: string;` to the top-level params, after `knowledgeBaseId?`:**

```typescript
export async function generateAndStoreBatchEmbeddings(params: {
  documentId: string;
  userId: string;
  knowledgeBaseId?: string;
  runId?: string;
  items: Array<{
    sourceType: RAGEmbeddingSourceType;
    sourceId: string;
    contentText: string;
    tier: RAGEmbeddingTier;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<{ success: boolean; count?: number; error?: string }>
```

**And in the records map (around line 95), add `run_id` after `knowledge_base_id`:**

Find the line that maps records (looks like `const records = items.map((item, i) => ({`). Add `run_id: params.runId || null,` after the `knowledge_base_id` line. The resulting map should include:

```typescript
const records = items.map((item, i) => ({
    document_id: documentId,
    user_id: userId,
    knowledge_base_id: params.knowledgeBaseId || null,
    run_id: params.runId || null,  // ← ADD THIS LINE
    source_type: item.sourceType,
    source_id: item.sourceId,
    content_text: item.contentText,
    embedding: embeddings[i],
    embedding_model: provider.getModelName(),
    tier: item.tier,
    metadata: item.metadata || {},
}));
```

#### 1c. Add `runId` to `searchSimilarEmbeddings`

**Current function signature (line 130):**

```typescript
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  tier?: RAGEmbeddingTier;
  limit?: number;
  threshold?: number;
}): Promise<...>
```

**Add `runId?: string;` after `tier?`:**

```typescript
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  tier?: RAGEmbeddingTier;
  runId?: string;
  limit?: number;
  threshold?: number;
}): Promise<...>
```

**And update the RPC call (around line 149) to pass the new parameter:**

**Current:**
```typescript
const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_knowledge_base_id: knowledgeBaseId || null,
    filter_document_id: documentId || null,
    filter_tier: tier || null,
});
```

**Change to:**
```typescript
const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_knowledge_base_id: knowledgeBaseId || null,
    filter_document_id: documentId || null,
    filter_tier: tier || null,
    filter_run_id: params.runId || null,
});
```

**Note:** `searchTextContent` does NOT need a `runId` parameter because BM25 text search is not affected by embedding runs.

---

## Task 2: Add Embedding Run Tracking to Ingestion Service

### [MODIFY] `src/lib/rag/services/rag-ingestion-service.ts`

This file (987 lines) contains `processDocument()` which is called by Inngest background jobs. We need to:
1. Create an embedding run record at the start of Step 8
2. Pass `runId` to `generateAndStoreBatchEmbeddings`
3. Update the run record after embeddings are generated

#### 2a. Create embedding run record at the start of Step 8

**Location:** Line 449 — the comment `// Step 8: Generate embeddings at all three tiers`

The current code around line 449 looks like:

```typescript
// Step 8: Generate embeddings at all three tiers
console.log('[RAG Ingestion] Step 8/9: Generating embeddings for document, sections, and facts...');
```

**After this log line and before the `embeddingItems` array construction, insert:**

```typescript
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
```

**Important notes:**
- `crypto` is already imported in this file (line 1: `import crypto from 'crypto'`)
- `RAG_CONFIG` is already imported (line 24 or thereabouts: `import { RAG_CONFIG } from '@/lib/rag/config'`)
- `supabase` is the admin client already created earlier in `processDocument()`
- `doc` is the document object fetched in Step 1
- `sections` and `facts` are from the processing steps above
- The embedding run record insert is intentionally non-fatal

#### 2b. Pass `runId` to `generateAndStoreBatchEmbeddings`

**Current call (around line 491):**

```typescript
const embeddingResult = await generateAndStoreBatchEmbeddings({
    documentId,
    userId: doc.userId,
    items: embeddingItems,
});
```

**Change to:**

```typescript
const embeddingResult = await generateAndStoreBatchEmbeddings({
    documentId,
    userId: doc.userId,
    runId: embeddingRunId,
    items: embeddingItems,
});
```

#### 2c. Update embedding run record after completion

**After the embedding result logging** (find the line around 500 that says something like `console.log('[RAG Ingestion] Step 8/9: ✓ Generated...')` or the line after the `if (!embeddingResult.success)` error handling), add:

```typescript
// Update embedding run record
await supabase
    .from('rag_embedding_runs')
    .update({
        embedding_count: embeddingItems.length,
        status: embeddingResult.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
    })
    .eq('id', embeddingRunId);
```

Place this AFTER the success/failure logging for the embedding result, and BEFORE Step 9 (final document status update). The exact position is after the block:

```typescript
} else {
    console.log(`[RAG Ingestion] Step 8/9: ✓ Generated ${embeddingItems.length} embeddings`);
}
```

---

## Task 3: Add `runId` to Retrieval Pipeline

### [MODIFY] `src/lib/rag/services/rag-retrieval-service.ts`

#### 3a. Add `runId` to `retrieveContext`

**Current signature (line 69):**

```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  hydeText?: string;
}): Promise<...>
```

**Change to:**

```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  runId?: string;
  hydeText?: string;
}): Promise<...>
```

#### 3b. Pass `runId` to `searchSimilarEmbeddings` calls

There are two calls to `searchSimilarEmbeddings` inside `retrieveContext`:

**Tier 2 call (around line 89):**

Find the call that includes `tier: 2`. Add `runId: params.runId,` to it:

```typescript
const sectionResults = await searchSimilarEmbeddings({
    queryText: searchText,
    documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    tier: 2,
    runId: params.runId,
    limit: RAG_CONFIG.retrieval.maxSectionsToRetrieve,
    threshold: RAG_CONFIG.retrieval.similarityThreshold,
});
```

**Tier 3 call (around line 115):**

Find the call that includes `tier: 3`. Add `runId: params.runId,` to it:

```typescript
const factResults = await searchSimilarEmbeddings({
    queryText: searchText,
    documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    tier: 3,
    runId: params.runId,
    limit: RAG_CONFIG.retrieval.maxFactsToRetrieve,
    threshold: RAG_CONFIG.retrieval.similarityThreshold,
});
```

#### 3c. Add `runId` to `queryRAG`

**Current signature (line 604):**

```typescript
export async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  userId: string;
  mode?: RAGQueryMode;
  modelJobId?: string;
}): Promise<...>
```

**Change to:**

```typescript
export async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  userId: string;
  mode?: RAGQueryMode;
  modelJobId?: string;
  runId?: string;
}): Promise<...>
```

#### 3d. Pass `runId` to `retrieveContext` inside `queryRAG`

**Find the call to `retrieveContext` inside `queryRAG`** (around line 718). It currently looks like:

```typescript
const retrieved = await retrieveContext({
    queryText: params.queryText,
    documentId: params.documentId || undefined,
    knowledgeBaseId: !params.documentId ? knowledgeBaseId : undefined,
    hydeText,
});
```

**Change to:**

```typescript
const retrieved = await retrieveContext({
    queryText: params.queryText,
    documentId: params.documentId || undefined,
    knowledgeBaseId: !params.documentId ? knowledgeBaseId : undefined,
    runId: params.runId,
    hydeText,
});
```

---

## Data Flow After E011

After these changes, the `runId` flows through the system like this:

### Ingestion (Embedding Creation)

```
processDocument(documentId)
  ├── Steps 1-7: Claude processing, sections, facts, questions
  └── Step 8: Embedding generation
        ├── INSERT rag_embedding_runs (id=embeddingRunId, status='running')
        ├── generateAndStoreBatchEmbeddings({runId: embeddingRunId, items})
        │     └── INSERT rag_embeddings (run_id=embeddingRunId, ...) × N rows
        └── UPDATE rag_embedding_runs (status='completed', count=N)
```

### Retrieval (Query with Run Filter)

```
queryRAG({..., runId})
  └── retrieveContext({..., runId})
        ├── searchSimilarEmbeddings({tier: 2, runId})
        │     └── RPC match_rag_embeddings_kb(filter_run_id = runId)
        ├── searchSimilarEmbeddings({tier: 3, runId})
        │     └── RPC match_rag_embeddings_kb(filter_run_id = runId)
        └── searchTextContent({...}) ← no runId (BM25 not affected)
```

---

## Verification Checklist

After completing all 3 tasks, verify:

1. **TypeScript compilation passes:**
   ```bash
   cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit
   ```

2. **Files modified (3 files):**
   - `src/lib/rag/services/rag-embedding-service.ts` — `runId` added to 3 function signatures + RPC call
   - `src/lib/rag/services/rag-ingestion-service.ts` — embedding run lifecycle (create, pass, update)
   - `src/lib/rag/services/rag-retrieval-service.ts` — `runId` added to `retrieveContext`, `queryRAG`, passed to search calls

3. **Backward compatibility verified:**
   - All new parameters are optional (`runId?: string`)
   - Existing callers of `queryRAG`, `searchSimilarEmbeddings`, `generateAndStoreBatchEmbeddings` still work without `runId`
   - When `runId` is undefined/null, `filter_run_id` is NULL in the RPC call, meaning ALL embeddings are searched (no filter)

4. **Non-fatal run tracking:**
   - If `rag_embedding_runs` insert fails, `console.warn` is logged and processing continues
   - The `embeddingRunId` variable still exists (as a UUID string) even if the DB insert failed, so `generateAndStoreBatchEmbeddings` still receives it and tags the embeddings

**After this prompt completes, proceed to E012 for test diagnostics and API endpoints.**


+++++++++++++++++



---

## Files Changed Summary (E011)

| File | Action | Changes |
|------|--------|---------|
| `src/lib/rag/services/rag-embedding-service.ts` | Modify | `runId` param in 3 signatures + `filter_run_id` in RPC |
| `src/lib/rag/services/rag-ingestion-service.ts` | Modify | Embedding run record lifecycle (create → pass → update) |
| `src/lib/rag/services/rag-retrieval-service.ts` | Modify | `runId` in `retrieveContext` + `queryRAG` signatures |

---

## Success Criteria

- [ ] `generateAndStoreEmbedding` accepts optional `runId` and writes `run_id` to DB
- [ ] `generateAndStoreBatchEmbeddings` accepts optional `runId`, passes to all insert records
- [ ] `searchSimilarEmbeddings` accepts optional `runId`, passes `filter_run_id` to RPC
- [ ] `processDocument` creates an `rag_embedding_runs` record at Step 8 start
- [ ] `processDocument` passes `embeddingRunId` to `generateAndStoreBatchEmbeddings`
- [ ] `processDocument` updates the run record with final count and status
- [ ] `retrieveContext` accepts optional `runId`, passes to both `searchSimilarEmbeddings` calls
- [ ] `queryRAG` accepts optional `runId`, passes to `retrieveContext`
- [ ] TypeScript compiles without errors
- [ ] Existing callers (no `runId`) continue to work unchanged
