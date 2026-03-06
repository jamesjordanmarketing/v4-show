# E09: Golden-Set Test Tool — Full Embedding Run Selector, Historical Reports, Markdown Export & Error Fixes

**Version:** 1.0
**Date:** February 17, 2026
**Status:** Ready for execution
**Predecessor:** E08 (embedding visibility, markdown export, error fixes — all changes included here plus deferred features)
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

---

## Overview

This specification implements **everything** from E08 **plus** the two features that were deferred in E08:

1. **Embedding Run Selector** — Tag every embedding with a `run_id` at ingestion time. Create an `rag_embedding_runs` tracking table. Add a dropdown to the test UI to select which run to evaluate. Thread `runId` through `queryRAG` → `searchSimilarEmbeddings` → `match_rag_embeddings_kb` RPC.
2. **Historical Report Storage** — Save test reports to a new `rag_test_reports` database table. Add API endpoints and a history panel in the test UI for trend analysis.

Plus the original E08 changes:
3. **Embedding run visibility in preflight** (enhanced with actual run data now)
4. **Markdown report generation & download**
5. **Fix `search_rag_text` UNION ORDER BY bug**
6. **Suppress `parseJsonResponse` log noise**
7. **Improve reranking parse robustness**

---

## Problem Statement

### Issue 1 — No Embedding Run Isolation (DEFERRED FROM E08, NOW IMPLEMENTED)

The test tool evaluates ALL embeddings for `CANONICAL_DOCUMENT_ID` indiscriminately. If the document was re-embedded multiple times (old pipeline vs new multi-pass pipeline), old and new embeddings are mixed. The test operator cannot isolate which ingestion run produced the results.

**E08 approach:** Show diagnostic metadata in preflight. Operator must manually delete old embeddings.
**E09 approach:** Full run selector. Tag every embedding with `run_id` at ingestion time. Add a dropdown to select which run to evaluate.

### Issue 2 — No Historical Report Storage (DEFERRED FROM E08, NOW IMPLEMENTED)

Test reports vanish when the page is refreshed. There is no way to compare results across runs (e.g., "Did the multi-pass pipeline improve pass rate?").

**E09 approach:** Save complete test reports to a new `rag_test_reports` table. Add a history panel to the test UI showing past runs with trend data.

### Issue 3 — No Copy-Paste / Export (FROM E08)

The test report renders in React components with no copy functionality. The user needs downloadable plain-text reports.

### Issue 4 — Vercel Log Errors (FROM E08)

Three recurring errors in every test query:
- **Error A:** `search_rag_text` UNION ORDER BY clause bug
- **Error B:** `parseJsonResponse` direct parse failure log noise
- **Error C:** Reranking parse failure due to narrow regex

---

## Complete Change List

| # | Change | File(s) | Type | Origin |
|---|--------|---------|------|--------|
| 1 | Suppress `parseJsonResponse` log noise | `claude-llm-provider.ts` | Modify | E08 |
| 2 | Improve reranking parse robustness | `rag-retrieval-service.ts` | Modify | E08 |
| 3 | DB migration: embedding runs table, run_id column, test reports table, fix text search | `scripts/migrations/004-embedding-runs-and-reports.js` | Create | E09 NEW |
| 4 | Add `run_id` to embedding generation in ingestion service | `rag-ingestion-service.ts`, `rag-embedding-service.ts` | Modify | E09 NEW |
| 5 | Add `runId` parameter to retrieval pipeline | `rag-retrieval-service.ts`, `rag-embedding-service.ts` | Modify | E09 NEW |
| 6 | Enhance preflight with run data + run listing | `test-diagnostics.ts` | Modify | E08+E09 |
| 7 | Add embedding runs API endpoint | `src/app/api/rag/test/golden-set/runs/route.ts` | Create | E09 NEW |
| 8 | Add test reports API endpoints | `src/app/api/rag/test/golden-set/reports/route.ts` | Create | E09 NEW |
| 9 | Add markdown report generation API | `src/app/api/rag/test/golden-set/report/route.ts` | Create | E08 |
| 10 | Update golden-set test API to accept `runId` | `src/app/api/rag/test/golden-set/route.ts` | Modify | E09 NEW |
| 11 | Update test page UI: run selector, download, history, save | `page.tsx` | Modify | E08+E09 |
| 12 | Update type definitions | `golden-set-definitions.ts` | Modify | E09 NEW |

---

## Change 1: Suppress `parseJsonResponse` Log Noise

### [MODIFY] `src/lib/rag/providers/claude-llm-provider.ts`

**Location:** Lines 42–48 (the first `catch` block in `parseJsonResponse`)

**Current code:**
```typescript
try {
    return JSON.parse(cleaned) as T;
} catch (firstError) {
    // Log the first attempt failure for debugging
    console.log(`[parseJsonResponse] Direct parse failed (${context || 'unknown context'}):`,
      firstError instanceof Error ? firstError.message : String(firstError));
}
```

**Change to:**
```typescript
try {
    return JSON.parse(cleaned) as T;
} catch {
    // Direct parse failed — expected when Claude wraps JSON in ```json fences.
    // Fallback to brace/bracket boundary extraction below.
    // No logging here to avoid noise; failure is logged if the fallback also fails.
}
```

**Rationale:** The fallback parser handles markdown fences ~100% of the time. Logging the expected initial failure creates misleading noise in Vercel dashboard. The comprehensive error logging in the second `catch` block (line 80+) already handles the case where BOTH parse attempts fail.

---

## Change 2: Improve Reranking Parse Robustness

### [MODIFY] `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** `rerankWithClaude` function (lines 313–321)

**Current code:**
```typescript
const responseText = response.responseText || '';
const jsonMatch = responseText.match(/\[[\d,\s]+\]/);
if (!jsonMatch) {
    console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
}
const rankedIndices: number[] = JSON.parse(jsonMatch[0]);
```

**Change to:**
```typescript
const responseText = response.responseText || '';

// Try multiple extraction strategies for the ranked indices array
let rankedIndices: number[] | null = null;

// Strategy 1: Direct regex match for integer array (handles [3, 0, 5, 1])
const jsonMatch = responseText.match(/\[[\d,\s\n]+\]/);
if (jsonMatch) {
    try {
        rankedIndices = JSON.parse(jsonMatch[0]);
    } catch { /* try next strategy */ }
}

// Strategy 2: Extract JSON from markdown fences (handles ```json [3, 0, 5] ```)
if (!rankedIndices) {
    const fenceMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (fenceMatch) {
        try {
            rankedIndices = JSON.parse(fenceMatch[1]);
        } catch { /* try next strategy */ }
    }
}

// Strategy 3: Find any JSON array in the response
if (!rankedIndices) {
    const bracketStart = responseText.indexOf('[');
    const bracketEnd = responseText.lastIndexOf(']');
    if (bracketStart >= 0 && bracketEnd > bracketStart) {
        try {
            rankedIndices = JSON.parse(responseText.substring(bracketStart, bracketEnd + 1));
        } catch { /* give up */ }
    }
}

// Validate parsed indices
if (rankedIndices && Array.isArray(rankedIndices)) {
    rankedIndices = rankedIndices
        .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < params.candidates.length);
}

if (!rankedIndices || !Array.isArray(rankedIndices) || rankedIndices.length === 0) {
    console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
}
```

The rest of the function (building `results` from `rankedIndices`) remains unchanged.

---

## Change 3: Database Migration — Embedding Runs, Test Reports, Text Search Fix

### [CREATE] `scripts/migrations/004-embedding-runs-and-reports.js`

This single migration handles all schema changes:
1. Create `rag_embedding_runs` table
2. Add `run_id` column to `rag_embeddings`
3. Create `rag_test_reports` table
4. Fix `search_rag_text` UNION ORDER BY bug
5. Update `match_rag_embeddings_kb` to support `filter_run_id`

```javascript
/**
 * Migration 004: Embedding Runs, Test Reports, and Text Search Fix
 *
 * 1. rag_embedding_runs — tracks each ingestion run (document_id, timestamp, counts)
 * 2. rag_embeddings.run_id — tags every embedding with its run
 * 3. rag_test_reports — stores golden-set test results for trend analysis
 * 4. search_rag_text — fixes ORDER BY rank DESC bug on UNION ALL
 * 5. match_rag_embeddings_kb — adds filter_run_id parameter
 *
 * Uses SAOL (agentExecuteDDL) as required by project standards.
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- ================================================
  -- 1. Embedding Runs table
  -- ================================================
  CREATE TABLE IF NOT EXISTS rag_embedding_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    embedding_count INT DEFAULT 0,
    embedding_model TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    pipeline_version TEXT DEFAULT 'single-pass',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_rag_embedding_runs_document
    ON rag_embedding_runs(document_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_rag_embedding_runs_status
    ON rag_embedding_runs(status);

  -- Enable RLS
  ALTER TABLE rag_embedding_runs ENABLE ROW LEVEL SECURITY;

  -- Allow authenticated users to read their own runs
  DO $$ BEGIN
    CREATE POLICY "Users can view own embedding runs"
      ON rag_embedding_runs FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    CREATE POLICY "Service role full access embedding runs"
      ON rag_embedding_runs FOR ALL
      USING (true)
      WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  -- ================================================
  -- 2. Add run_id to rag_embeddings
  -- ================================================
  ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS run_id UUID;

  CREATE INDEX IF NOT EXISTS idx_rag_embeddings_run_id
    ON rag_embeddings(run_id);

  -- ================================================
  -- 3. Test Reports table
  -- ================================================
  CREATE TABLE IF NOT EXISTS rag_test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    test_run_id TEXT NOT NULL,
    document_id UUID NOT NULL,
    embedding_run_id UUID,
    pass_rate NUMERIC(5,2) NOT NULL,
    meets_target BOOLEAN NOT NULL,
    total_passed INT NOT NULL,
    total_failed INT NOT NULL,
    total_errored INT NOT NULL,
    avg_response_time_ms INT NOT NULL,
    avg_self_eval_score NUMERIC(5,4) NOT NULL,
    total_duration_ms INT NOT NULL,
    breakdown JSONB NOT NULL,
    preflight JSONB NOT NULL,
    results JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_rag_test_reports_document
    ON rag_test_reports(document_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_rag_test_reports_user
    ON rag_test_reports(user_id, created_at DESC);

  -- Enable RLS
  ALTER TABLE rag_test_reports ENABLE ROW LEVEL SECURITY;

  DO $$ BEGIN
    CREATE POLICY "Users can view own test reports"
      ON rag_test_reports FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    CREATE POLICY "Service role full access test reports"
      ON rag_test_reports FOR ALL
      USING (true)
      WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  -- ================================================
  -- 4. Fix search_rag_text ORDER BY clause
  -- ================================================
  -- PostgreSQL does not allow ORDER BY alias on UNION ALL.
  -- rank is the 5th column positionally → ORDER BY 5 DESC.

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
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;

  -- ================================================
  -- 5. Update match_rag_embeddings_kb to support run_id filter
  -- ================================================
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL,
    filter_run_id uuid DEFAULT NULL
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
      AND (filter_run_id IS NULL OR e.run_id = filter_run_id)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
    console.log('Migration 004: Embedding Runs, Test Reports, and Text Search Fix');
    console.log('================================================================');

    // Dry run first
    const dryRun = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        dryRun: true,
        transaction: true,
        transport: 'pg'
    });

    console.log('Dry-run:', dryRun.success ? '✓ PASS' : '✗ FAIL');
    if (!dryRun.success) {
        console.error('Dry-run failed:', dryRun.summary);
        process.exit(1);
    }

    // Execute
    const result = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        transaction: true,
        transport: 'pg'
    });

    console.log('Execute:', result.success ? '✓ PASS' : '✗ FAIL');
    console.log('Summary:', result.summary);

    if (!result.success) {
        console.error('Migration failed:', result.error || result.summary);
        process.exit(1);
    }

    // Verify
    console.log('\nVerification:');

    const runsCheck = await saol.agentIntrospectSchema({
        table: 'rag_embedding_runs',
        includeColumns: true,
        transport: 'pg'
    });
    console.log('  rag_embedding_runs:', runsCheck.tables?.[0]?.columns?.length > 0 ? '✓ exists' : '✗ missing');

    const embedCheck = await saol.agentIntrospectSchema({
        table: 'rag_embeddings',
        includeColumns: true,
        transport: 'pg'
    });
    const embedCols = embedCheck.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('  rag_embeddings.run_id:', embedCols.includes('run_id') ? '✓' : '✗');

    const reportsCheck = await saol.agentIntrospectSchema({
        table: 'rag_test_reports',
        includeColumns: true,
        transport: 'pg'
    });
    console.log('  rag_test_reports:', reportsCheck.tables?.[0]?.columns?.length > 0 ? '✓ exists' : '✗ missing');

    console.log('\n✓ Migration 004 complete');
})();
```

### Execution

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node scripts/migrations/004-embedding-runs-and-reports.js
```

### Schema Summary

#### `rag_embedding_runs` (NEW)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `document_id` | UUID | NOT NULL | The document these embeddings belong to |
| `user_id` | UUID | NOT NULL | User who triggered the run |
| `embedding_count` | INT | 0 | Number of embeddings in this run |
| `embedding_model` | TEXT | NOT NULL | e.g. "text-embedding-3-small" |
| `status` | TEXT | 'running' | running, completed, failed |
| `pipeline_version` | TEXT | 'single-pass' | Which pipeline version produced these embeddings |
| `started_at` | TIMESTAMPTZ | NOW() | When the run started |
| `completed_at` | TIMESTAMPTZ | NULL | When the run finished |
| `metadata` | JSONB | '{}' | Additional info (fact count, section count, etc.) |
| `created_at` | TIMESTAMPTZ | NOW() | Row creation time |

#### `rag_test_reports` (NEW)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who ran the test |
| `test_run_id` | TEXT | Client-generated UUID for this test run |
| `document_id` | UUID | Document tested |
| `embedding_run_id` | UUID | Which embedding run was used (NULL = all) |
| `pass_rate` | NUMERIC(5,2) | e.g. 85.00 |
| `meets_target` | BOOLEAN | pass_rate >= 85 |
| `total_passed` | INT | Count of passed tests |
| `total_failed` | INT | Count of failed tests |
| `total_errored` | INT | Count of errored tests |
| `avg_response_time_ms` | INT | Average response time |
| `avg_self_eval_score` | NUMERIC(5,4) | Average self-eval score |
| `total_duration_ms` | INT | Total test duration |
| `breakdown` | JSONB | `{ easy: { passed, total }, medium: ..., hard: ... }` |
| `preflight` | JSONB | Full preflight result |
| `results` | JSONB | Full array of TestResult objects |
| `notes` | TEXT | Optional operator notes |
| `created_at` | TIMESTAMPTZ | Row creation time |

#### `rag_embeddings` (MODIFIED)

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | UUID | (NEW) References `rag_embedding_runs.id`. NULL for legacy embeddings. |

#### `match_rag_embeddings_kb` (MODIFIED)

New parameter: `filter_run_id uuid DEFAULT NULL`. When provided, only embeddings from that run are searched.

#### `search_rag_text` (FIXED)

`ORDER BY rank DESC` → `ORDER BY 5 DESC` (5th column = rank positionally).

---

## Change 4: Add `run_id` to Embedding Generation in Ingestion

### [MODIFY] `src/lib/rag/services/rag-embedding-service.ts`

#### 4a. Add `runId` to `generateAndStoreEmbedding` parameters

**Current function signature (line 26):**
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

**Change to:**
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

**And in the insert record (line 46), add:**
```typescript
run_id: params.runId || null,
```

after the `metadata` line.

#### 4b. Add `runId` to `generateAndStoreBatchEmbeddings` parameters

**Current function signature (line 72):**
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

**Change to (add `runId` to the top-level params):**
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

**And in the records map (line 95), add `run_id`:**
```typescript
const records = items.map((item, i) => ({
    document_id: documentId,
    user_id: userId,
    knowledge_base_id: params.knowledgeBaseId || null,
    run_id: params.runId || null,  // ← ADD
    source_type: item.sourceType,
    source_id: item.sourceId,
    content_text: item.contentText,
    embedding: embeddings[i],
    embedding_model: provider.getModelName(),
    tier: item.tier,
    metadata: item.metadata || {},
}));
```

#### 4c. Add `runId` to `searchSimilarEmbeddings`

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

**Change to (add `runId`):**
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

**And update the RPC call (line 147) to pass the new parameter:**
```typescript
const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_knowledge_base_id: knowledgeBaseId || null,
    filter_document_id: documentId || null,
    filter_tier: tier || null,
    filter_run_id: params.runId || null,  // ← ADD
});
```

#### 4d. Add `runId` to `searchTextContent`

This function does not use embeddings (it uses tsvector BM25 search), so it does **NOT** need a `runId` parameter. No change needed.

### [MODIFY] `src/lib/rag/services/rag-ingestion-service.ts`

#### 4e. Create an embedding run record at the start of embedding generation

**Location:** Inside `processDocument()`, at the start of Step 8 (line 449). Currently:

```typescript
// Step 8: Generate embeddings at all three tiers
console.log('[RAG Ingestion] Step 8/9: Generating embeddings for document, sections, and facts...');
```

**Change to:**
```typescript
// Step 8: Generate embeddings at all three tiers
console.log('[RAG Ingestion] Step 8/9: Generating embeddings for document, sections, and facts...');

// Create an embedding run record
const embeddingRunId = crypto.randomUUID();
const embeddingProvider = new (await import('@/lib/rag/providers')).OpenAIEmbeddingProvider();
const { error: runCreateError } = await supabase
    .from('rag_embedding_runs')
    .insert({
        id: embeddingRunId,
        document_id: documentId,
        user_id: doc.userId,
        embedding_count: 0,
        embedding_model: embeddingProvider.getModelName(),
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

**IMPORTANT:** The `import` of `OpenAIEmbeddingProvider` is needed only to call `getModelName()`. However, the ingestion service already imports from the providers. To avoid a dynamic import, we can use a simpler approach.

**Cleaner alternative:** Use the model name from config directly:

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
}
```

**Use this cleaner approach.** `RAG_CONFIG` is already imported in `rag-ingestion-service.ts` (line 23).

#### 4f. Pass `runId` to `generateAndStoreBatchEmbeddings`

**Current call (line 491):**
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

#### 4g. Update the embedding run record after completion

**After the embedding result check (after line 501), add:**
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

Insert this right after the existing `console.log` on line 500:
```typescript
} else {
    console.log(`[RAG Ingestion] Step 8/9: ✓ Generated ${embeddingItems.length} embeddings`);
}

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

---

## Change 5: Add `runId` to Retrieval Pipeline

### [MODIFY] `src/lib/rag/services/rag-retrieval-service.ts`

#### 5a. Add `runId` to `retrieveContext`

**Current signature (line 63):**
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

#### 5b. Pass `runId` to `searchSimilarEmbeddings` calls inside `retrieveContext`

There are two calls to `searchSimilarEmbeddings` inside `retrieveContext` (tier 2 at line 86 and tier 3 at line 117). Add `runId` to both:

**Tier 2 call (line 86):**
```typescript
const sectionResults = await searchSimilarEmbeddings({
    queryText: searchText,
    documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    tier: 2,
    runId: params.runId,  // ← ADD
    limit: RAG_CONFIG.retrieval.maxSectionsToRetrieve,
    threshold: RAG_CONFIG.retrieval.similarityThreshold,
});
```

**Tier 3 call (line 117):**
```typescript
const factResults = await searchSimilarEmbeddings({
    queryText: searchText,
    documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    tier: 3,
    runId: params.runId,  // ← ADD
    limit: RAG_CONFIG.retrieval.maxFactsToRetrieve,
    threshold: RAG_CONFIG.retrieval.similarityThreshold,
});
```

#### 5c. Add `runId` to `queryRAG`

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

#### 5d. Pass `runId` to `retrieveContext` call inside `queryRAG`

**Current call (line 718):**
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

## Change 6: Enhance Preflight with Run Data

### [MODIFY] `src/lib/rag/testing/test-diagnostics.ts`

#### 6a. Update imports

Add `GOLDEN_SET` to the import from `golden-set-definitions.ts` (not currently imported, but not needed — we just need the document ID which is already passed as parameter).

No import changes needed.

#### 6b. Enhance "Check 2: Embeddings exist" block

**Current code (lines 67–96):**
```typescript
// Check 2: Embeddings exist for this document
try {
    const supabase = createServerSupabaseAdminClient();
    const { data: embeddings, error } = await supabase
        .from('rag_embeddings')
        .select('id, tier')
        .eq('document_id', documentId);
    // ... count and tier breakdown ...
```

**Change to:**
```typescript
// Check 2: Embeddings exist for this document
try {
    const supabase = createServerSupabaseAdminClient();
    const { data: embeddings, error } = await supabase
        .from('rag_embeddings')
        .select('id, tier, created_at, run_id')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

    if (error) {
        checks.push({
            name: 'Embeddings Exist',
            passed: false,
            detail: `Query error: ${error.message}`,
            severity: 'critical',
        });
    } else {
        const count = embeddings?.length || 0;
        const tier1 = embeddings?.filter((e: any) => e.tier === 1).length || 0;
        const tier2 = embeddings?.filter((e: any) => e.tier === 2).length || 0;
        const tier3 = embeddings?.filter((e: any) => e.tier === 3).length || 0;

        // Determine embedding creation time range
        let timeRange = '';
        if (count > 0) {
            const oldest = embeddings![0]?.created_at;
            const newest = embeddings![embeddings!.length - 1]?.created_at;
            const oldestDate = oldest ? new Date(oldest) : null;
            const newestDate = newest ? new Date(newest) : null;

            if (oldestDate && newestDate) {
                const spanMs = newestDate.getTime() - oldestDate.getTime();
                const spanHours = Math.round(spanMs / (1000 * 60 * 60));

                if (spanHours < 1) {
                    timeRange = ` | single run ~${oldestDate.toISOString().slice(0, 16)}Z`;
                } else {
                    timeRange = ` | span: ${oldestDate.toISOString().slice(0, 16)}Z → ${newestDate.toISOString().slice(0, 16)}Z (${spanHours}h — may include multiple runs)`;
                }
            }

            // Count distinct run_ids
            const runIds = new Set(embeddings!.map((e: any) => e.run_id).filter(Boolean));
            const untaggedCount = embeddings!.filter((e: any) => !e.run_id).length;
            if (runIds.size > 0 || untaggedCount > 0) {
                const parts: string[] = [];
                if (runIds.size > 0) parts.push(`${runIds.size} tagged run(s)`);
                if (untaggedCount > 0) parts.push(`${untaggedCount} untagged (legacy)`);
                timeRange += ` | ${parts.join(', ')}`;
            }
        }

        checks.push({
            name: 'Embeddings Exist',
            passed: count > 0,
            detail: count > 0
                ? `${count} embeddings (tier1: ${tier1}, tier2: ${tier2}, tier3: ${tier3})${timeRange}`
                : 'No embeddings found for this document',
            severity: count > 0 ? 'info' : 'critical',
        });
    }
} catch (err) {
    checks.push({
        name: 'Embeddings Exist',
        passed: false,
        detail: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
        severity: 'critical',
    });
}
```

#### 6c. Add `runId` to `runSingleTest`

**Current signature (line 191):**
```typescript
export async function runSingleTest(
    item: GoldenSetItem,
    userId: string,
    documentId: string,
): Promise<TestResult>
```

**Change to:**
```typescript
export async function runSingleTest(
    item: GoldenSetItem,
    userId: string,
    documentId: string,
    runId?: string,
): Promise<TestResult>
```

**And update the `queryRAG` call (line 208):**
```typescript
const result = await queryRAG({
    queryText: item.question,
    documentId,
    userId,
    mode: 'rag_only',
    runId,  // ← ADD
});
```

#### 6d. Add `getEmbeddingRuns` function

At the bottom of `test-diagnostics.ts`, add a new exported function:

```typescript
// ---- Embedding Run Listing ----

export interface EmbeddingRunInfo {
    id: string;
    documentId: string;
    embeddingCount: number;
    embeddingModel: string;
    status: string;
    pipelineVersion: string;
    startedAt: string;
    completedAt: string | null;
    metadata: Record<string, unknown>;
}

export async function getEmbeddingRuns(documentId: string): Promise<EmbeddingRunInfo[]> {
    try {
        const supabase = createServerSupabaseAdminClient();
        const { data, error } = await supabase
            .from('rag_embedding_runs')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.warn('[Test Diagnostics] Failed to fetch embedding runs:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            documentId: row.document_id,
            embeddingCount: row.embedding_count,
            embeddingModel: row.embedding_model,
            status: row.status,
            pipelineVersion: row.pipeline_version,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            metadata: row.metadata || {},
        }));
    } catch (err) {
        console.warn('[Test Diagnostics] Error fetching embedding runs:', err);
        return [];
    }
}
```

---

## Change 7: Embedding Runs API Endpoint

### [CREATE] `src/app/api/rag/test/golden-set/runs/route.ts`

```typescript
/**
 * Embedding Runs API — List available embedding runs for a document
 *
 * GET — Returns all embedding runs for the canonical document
 *       plus a count of untagged (legacy) embeddings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getEmbeddingRuns } from '@/lib/rag/testing/test-diagnostics';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CANONICAL_DOCUMENT_ID } from '@/lib/rag/testing/golden-set-definitions';

export async function GET(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const runs = await getEmbeddingRuns(CANONICAL_DOCUMENT_ID);

        // Also count untagged (legacy) embeddings
        const supabase = createServerSupabaseAdminClient();
        const { data: untagged } = await supabase
            .from('rag_embeddings')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', CANONICAL_DOCUMENT_ID)
            .is('run_id', null);

        return NextResponse.json({
            success: true,
            data: {
                runs,
                untaggedCount: untagged?.length ?? 0,
                documentId: CANONICAL_DOCUMENT_ID,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch runs' },
            { status: 500 }
        );
    }
}
```

**Note on `untaggedCount`:** The Supabase query with `{ count: 'exact', head: true }` returns the count in the response headers but an empty data array. We need to adjust:

```typescript
const { count: untaggedCount } = await supabase
    .from('rag_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', CANONICAL_DOCUMENT_ID)
    .is('run_id', null);
```

And use `untaggedCount ?? 0` in the response.

---

## Change 8: Test Reports API Endpoints

### [CREATE] `src/app/api/rag/test/golden-set/reports/route.ts`

```typescript
/**
 * Test Reports API — Save and list golden-set test reports
 *
 * POST — Save a completed test report
 * GET  — List historical reports for the canonical document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CANONICAL_DOCUMENT_ID } from '@/lib/rag/testing/golden-set-definitions';
import type { TestRunSummary } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const body = await request.json();
        const summary: TestRunSummary = body.summary;
        const embeddingRunId: string | null = body.embeddingRunId || null;
        const notes: string | null = body.notes || null;

        if (!summary || !summary.runId) {
            return NextResponse.json(
                { success: false, error: 'Missing summary or runId' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseAdminClient();

        const { data, error } = await supabase
            .from('rag_test_reports')
            .insert({
                user_id: user!.id,
                test_run_id: summary.runId,
                document_id: CANONICAL_DOCUMENT_ID,
                embedding_run_id: embeddingRunId,
                pass_rate: summary.passRate,
                meets_target: summary.meetsTarget,
                total_passed: summary.totalPassed,
                total_failed: summary.totalFailed,
                total_errored: summary.totalErrored,
                avg_response_time_ms: summary.avgResponseTimeMs,
                avg_self_eval_score: summary.avgSelfEvalScore,
                total_duration_ms: summary.totalDurationMs,
                breakdown: summary.breakdown,
                preflight: summary.preflight,
                results: summary.results,
                notes,
            })
            .select('id, created_at')
            .single();

        if (error) {
            console.error('[Test Reports] Error saving report:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { reportId: data.id, savedAt: data.created_at },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to save report' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const supabase = createServerSupabaseAdminClient();

        // Return summary fields only (not the full results JSONB — that's big)
        const { data, error } = await supabase
            .from('rag_test_reports')
            .select(`
                id,
                test_run_id,
                document_id,
                embedding_run_id,
                pass_rate,
                meets_target,
                total_passed,
                total_failed,
                total_errored,
                avg_response_time_ms,
                avg_self_eval_score,
                total_duration_ms,
                notes,
                created_at
            `)
            .eq('document_id', CANONICAL_DOCUMENT_ID)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}
```

---

## Change 9: Markdown Report Generation API

### [CREATE] `src/app/api/rag/test/golden-set/report/route.ts`

This is the same as E08 Change 2, unchanged. It accepts a `TestRunSummary` JSON payload and returns a downloadable Markdown file.

```typescript
/**
 * Golden-Set Test Report — Markdown Generator
 *
 * POST — Accepts TestRunSummary JSON, returns plain-text Markdown report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import type { TestRunSummary, TestResult } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const summary: TestRunSummary = await request.json();
        const markdown = generateMarkdownReport(summary);

        return new NextResponse(markdown, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="golden-set-report-${summary.runId.slice(0, 8)}.md"`,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Report generation failed' },
            { status: 500 }
        );
    }
}

function generateMarkdownReport(summary: TestRunSummary): string {
    const lines: string[] = [];

    lines.push('# RAG Golden-Set Regression Test Report');
    lines.push('');
    lines.push(`**Run ID:** ${summary.runId}`);
    lines.push(`**Started:** ${summary.startedAt}`);
    lines.push(`**Completed:** ${summary.completedAt}`);
    lines.push(`**Duration:** ${Math.round(summary.totalDurationMs / 1000)}s`);
    lines.push(`**Result:** ${summary.meetsTarget ? 'PASS' : 'FAIL'} (target: >=85%)`);
    if ((summary as any).embeddingRunId) {
        lines.push(`**Embedding Run:** ${(summary as any).embeddingRunId}`);
    }
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Pass Rate | ${summary.passRate}% |`);
    lines.push(`| Passed | ${summary.totalPassed} |`);
    lines.push(`| Failed | ${summary.totalFailed} |`);
    lines.push(`| Errored | ${summary.totalErrored} |`);
    lines.push(`| Avg Response Time | ${Math.round(summary.avgResponseTimeMs / 1000)}s |`);
    lines.push(`| Avg Self-Eval Score | ${Math.round(summary.avgSelfEvalScore * 100)}% |`);
    lines.push('');

    lines.push('## Difficulty Breakdown');
    lines.push('');
    lines.push('| Difficulty | Passed | Total | Rate |');
    lines.push('|------------|--------|-------|------|');
    for (const [level, data] of Object.entries(summary.breakdown)) {
        const rate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        lines.push(`| ${level} | ${data.passed} | ${data.total} | ${rate}% |`);
    }
    lines.push('');

    lines.push('## Preflight Checks');
    lines.push('');
    lines.push(`**Overall:** ${summary.preflight.passed ? 'PASSED' : 'FAILED'}`);
    lines.push('');
    for (const check of summary.preflight.checks) {
        const icon = check.passed ? '[PASS]' : check.severity === 'warning' ? '[WARN]' : '[FAIL]';
        lines.push(`- ${icon} **${check.name}** — ${check.detail}`);
    }
    lines.push('');

    lines.push('## Individual Results');
    lines.push('');

    const passed = summary.results.filter(r => r.passed);
    const failed = summary.results.filter(r => !r.passed && !r.error);
    const errored = summary.results.filter(r => r.error !== null);

    if (errored.length > 0) {
        lines.push(`### Errored (${errored.length})`);
        lines.push('');
        for (const r of errored) lines.push(...formatResult(r));
    }

    if (failed.length > 0) {
        lines.push(`### Failed (${failed.length})`);
        lines.push('');
        for (const r of failed) lines.push(...formatResult(r));
    }

    if (passed.length > 0) {
        lines.push(`### Passed (${passed.length})`);
        lines.push('');
        for (const r of passed) lines.push(...formatResult(r));
    }

    return lines.join('\n');
}

function formatResult(r: TestResult): string[] {
    const lines: string[] = [];
    const status = r.error ? 'ERROR' : r.passed ? 'PASS' : 'FAIL';

    lines.push(`#### ${r.item.id}: ${status} [${r.item.difficulty}]`);
    lines.push('');
    lines.push(`**Question:** ${r.item.question}`);
    lines.push(`**Expected substring:** \`${r.item.expectedAnswer}\``);
    lines.push(`**Self-eval:** ${r.selfEvalScore !== null ? `${Math.round(r.selfEvalScore * 100)}%` : 'N/A'}`);
    lines.push(`**Response time:** ${Math.round(r.responseTimeMs / 1000)}s`);
    lines.push(`**Category:** ${r.item.category}`);
    lines.push('');

    if (r.error) {
        lines.push(`**Error:** ${r.error}`);
        lines.push('');
    }

    if (r.responseText) {
        lines.push('**Response (first 500 chars):**');
        lines.push('');
        lines.push('```');
        lines.push(r.responseText);
        lines.push('```');
        lines.push('');
    }

    lines.push('**Diagnostics:**');
    lines.push(`- HyDE generated: ${r.diagnostics.hydeGenerated ? 'yes' : 'no'}`);
    lines.push(`- Sections retrieved: ${r.diagnostics.sectionsRetrieved}`);
    lines.push(`- Facts retrieved: ${r.diagnostics.factsRetrieved}`);
    if (r.diagnostics.errorPhase) lines.push(`- Error phase: ${r.diagnostics.errorPhase}`);
    if (r.diagnostics.errorStack) lines.push(`- Error stack: ${r.diagnostics.errorStack}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
}
```

---

## Change 10: Update Golden-Set Test API to Accept `runId`

### [MODIFY] `src/app/api/rag/test/golden-set/route.ts`

#### 10a. Accept `runId` from POST body

**Current code (line 41):**
```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
```

**Change to:**
```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
const runId: string | undefined = body.runId || undefined;
```

#### 10b. Pass `runId` to `runSingleTest`

**Current call (line 76):**
```typescript
const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID);
```

**Change to:**
```typescript
const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID, runId);
```

---

## Change 11: Update Test Page UI

### [MODIFY] `src/app/(dashboard)/rag/test/page.tsx`

This is the largest UI change. The page gains:
- **Embedding Run Selector** — dropdown populated by `GET /api/rag/test/golden-set/runs`
- **Download Report** button — calls `POST /api/rag/test/golden-set/report`
- **Save Report** button — calls `POST /api/rag/test/golden-set/reports`
- **History Panel** — lists past saved reports from `GET /api/rag/test/golden-set/reports`

#### 11a. Add imports

**Current imports (lines 8–18):**
```typescript
import {
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Bug,
    Zap,
} from 'lucide-react';
```

**Change to:**
```typescript
import {
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Bug,
    Zap,
    Download,
    Save,
    History,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
```

#### 11b. Add state variables

After the existing state declarations (lines 81–86), add:

```typescript
const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
const [embeddingRuns, setEmbeddingRuns] = useState<any[]>([]);
const [untaggedCount, setUntaggedCount] = useState<number>(0);
const [historicalReports, setHistoricalReports] = useState<any[]>([]);
const [showHistory, setShowHistory] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState<string | null>(null);
```

#### 11c. Add `useEffect` to fetch embedding runs and history

After state declarations, add:

```typescript
// Fetch embedding runs and historical reports on mount
useState(() => {
    // Fetch runs
    fetch('/api/rag/test/golden-set/runs')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setEmbeddingRuns(json.data.runs || []);
                setUntaggedCount(json.data.untaggedCount || 0);
            }
        })
        .catch(() => {});

    // Fetch history
    fetch('/api/rag/test/golden-set/reports')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setHistoricalReports(json.data || []);
            }
        })
        .catch(() => {});
});
```

**IMPORTANT:** Using `useState` with an initializer is incorrect. Use `useEffect` instead:

```typescript
import { useState, useEffect } from 'react';
```

Then add the effect:

```typescript
useEffect(() => {
    fetch('/api/rag/test/golden-set/runs')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setEmbeddingRuns(json.data.runs || []);
                setUntaggedCount(json.data.untaggedCount || 0);
            }
        })
        .catch(() => {});

    fetch('/api/rag/test/golden-set/reports')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setHistoricalReports(json.data || []);
            }
        })
        .catch(() => {});
}, []);
```

#### 11d. Update `runTest` to pass `runId`

In the `runTest` function, update the fetch call (line 118):

**Current:**
```typescript
const res = await fetch('/api/rag/test/golden-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch }),
});
```

**Change to:**
```typescript
const res = await fetch('/api/rag/test/golden-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, runId: selectedRunId }),
});
```

#### 11e. Add `downloadReport` function

After `runTest`, add:

```typescript
const downloadReport = async () => {
    if (!summary) return;
    try {
        const res = await fetch('/api/rag/test/golden-set/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary),
        });
        if (!res.ok) { setError('Failed to generate report'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `golden-set-report-${summary.runId.slice(0, 8)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Report download failed');
    }
};
```

#### 11f. Add `saveReport` function

```typescript
const saveReport = async () => {
    if (!summary) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
        const res = await fetch('/api/rag/test/golden-set/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary,
                embeddingRunId: selectedRunId || null,
            }),
        });
        const json = await res.json();
        if (json.success) {
            setSaveMessage('Report saved successfully');
            // Refresh history
            const histRes = await fetch('/api/rag/test/golden-set/reports');
            const histJson = await histRes.json();
            if (histJson.success) setHistoricalReports(histJson.data || []);
        } else {
            setSaveMessage(`Failed to save: ${json.error}`);
        }
    } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
        setIsSaving(false);
    }
};
```

#### 11g. Add Embedding Run Selector to the header

In the header section (before the "Run Test" button), add a run selector dropdown. Insert after the `<Button variant="outline" onClick={() => router.push('/rag')}>` and before the Run Test button:

```tsx
{/* Embedding Run Selector */}
<select
    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    value={selectedRunId || ''}
    onChange={(e) => setSelectedRunId(e.target.value || undefined)}
    disabled={isRunning}
>
    <option value="">All embeddings (no filter)</option>
    {embeddingRuns.map((run: any) => (
        <option key={run.id} value={run.id}>
            {new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {run.embeddingCount} embeddings ({run.pipelineVersion})
        </option>
    ))}
    {untaggedCount > 0 && (
        <option value="__untagged__" disabled>
            {untaggedCount} untagged (legacy) — cannot filter
        </option>
    )}
</select>
```

**Note:** The `__untagged__` option is disabled — legacy embeddings can't be filtered because they have no `run_id`. The operator can either select a specific tagged run or "All embeddings".

#### 11h. Update `SummaryCard` to include download and save buttons

**Current `SummaryCard` signature (line 372):**
```typescript
function SummaryCard({ summary }: { summary: TestRunSummary }) {
```

**Change to:**
```typescript
function SummaryCard({ summary, onDownloadReport, onSaveReport, isSaving, saveMessage }: {
    summary: TestRunSummary;
    onDownloadReport: () => void;
    onSaveReport: () => void;
    isSaving: boolean;
    saveMessage: string | null;
}) {
```

**Replace the duration/runId `<p>` tag (line 404) with:**
```tsx
<div className="flex items-center justify-between mt-3">
    <p className="text-xs text-muted-foreground">
        Duration: {Math.round(summary.totalDurationMs / 1000)}s | Run ID: {summary.runId.slice(0, 8)}...
    </p>
    <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadReport}>
            <Download className="h-3 w-3 mr-1" />
            Download .md
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveReport} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save Report
        </Button>
    </div>
</div>
{saveMessage && (
    <p className={`text-xs mt-1 ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
        {saveMessage}
    </p>
)}
```

**Update the SummaryCard rendering (line 247):**

**Current:**
```tsx
{summary && summary.results.length > 0 && (
    <SummaryCard summary={summary} />
)}
```

**Change to:**
```tsx
{summary && summary.results.length > 0 && (
    <SummaryCard
        summary={summary}
        onDownloadReport={downloadReport}
        onSaveReport={saveReport}
        isSaving={isSaving}
        saveMessage={saveMessage}
    />
)}
```

#### 11i. Add History Panel

Add a History toggle button in the header area and a history panel after the summary card. After the Pre-Flight Checks section and before the Summary Card, add:

```tsx
{/* History Toggle */}
<div className="flex justify-end">
    <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHistory(!showHistory)}
    >
        <History className="h-4 w-4 mr-1" />
        History ({historicalReports.length})
    </Button>
</div>

{/* History Panel */}
{showHistory && historicalReports.length > 0 && (
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Test History
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                {historicalReports.map((report: any) => (
                    <div
                        key={report.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                    >
                        <div className="flex items-center gap-3">
                            {report.meets_target ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <div>
                                <div className="font-medium">
                                    {new Date(report.created_at).toLocaleDateString()}{' '}
                                    {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {report.total_passed}/{report.total_passed + report.total_failed} passed
                                    {report.notes && ` — ${report.notes}`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={report.meets_target ? 'default' : 'destructive'}>
                                {report.pass_rate}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {Math.round(report.total_duration_ms / 1000)}s
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
)}
```

Place this in the `<div className="container mx-auto px-4 py-6 space-y-6">` section, **after** the preflight panel and **before** the summary card.

---

## Change 12: Update Type Definitions

### [MODIFY] `src/lib/rag/testing/golden-set-definitions.ts`

No structural changes to existing types. The `TestRunSummary` interface already has all the fields needed for saving. However, add an optional `embeddingRunId` field so it can be carried through:

**After line 49 (`runId: string;`), add:**
```typescript
embeddingRunId?: string;  // Which embedding run was tested (null = all)
```

This makes the TestRunSummary carry the run context for report storage.

---

## Files Changed Summary

| # | File | Action | Lines (est.) | Category |
|---|------|--------|-------------|----------|
| 1 | `src/lib/rag/providers/claude-llm-provider.ts` | Modify | ~5 | Error fix |
| 2 | `src/lib/rag/services/rag-retrieval-service.ts` | Modify | ~40 | Error fix + runId |
| 3 | `scripts/migrations/004-embedding-runs-and-reports.js` | **Create** | ~160 | DB migration |
| 4 | `src/lib/rag/services/rag-embedding-service.ts` | Modify | ~15 | runId support |
| 5 | `src/lib/rag/services/rag-ingestion-service.ts` | Modify | ~25 | Embedding run tracking |
| 6 | `src/lib/rag/testing/test-diagnostics.ts` | Modify | ~80 | Enhanced preflight + runs |
| 7 | `src/app/api/rag/test/golden-set/runs/route.ts` | **Create** | ~50 | API endpoint |
| 8 | `src/app/api/rag/test/golden-set/reports/route.ts` | **Create** | ~120 | API endpoint |
| 9 | `src/app/api/rag/test/golden-set/report/route.ts` | **Create** | ~180 | API endpoint |
| 10 | `src/app/api/rag/test/golden-set/route.ts` | Modify | ~5 | Pass runId |
| 11 | `src/app/(dashboard)/rag/test/page.tsx` | Modify | ~120 | UI changes |
| 12 | `src/lib/rag/testing/golden-set-definitions.ts` | Modify | ~2 | Type addition |

**New files:** 4
**Modified files:** 8
**No new npm dependencies.**
**2 new database tables.** 1 new column on existing table. 2 RPC functions updated.

---

## Constraints

1. **ALL database operations in migration scripts MUST use SAOL** (`agentExecuteDDL` via `supa-agent-ops`).
2. **Application code uses `createServerSupabaseAdminClient()`** — SAOL is CLI-only, NOT used in deployed application code.
3. **DO NOT add npm dependencies.**
4. **DO NOT break existing `queryRAG` behavior.** The `runId` parameter is optional with `undefined` default. Existing callers are unaffected.
5. **DO NOT break existing `processDocument` behavior.** The embedding run tracking is additive (non-fatal if the run record insert fails).
6. **Backward compatibility:** Legacy embeddings with `run_id = NULL` continue to work. The `match_rag_embeddings_kb` function's new `filter_run_id` parameter defaults to `NULL` (no filter), so existing queries are unaffected.
7. **DO NOT change the golden-set questions or expected answers** — those are stable regression test data.

---

## Execution Order

1. **Change 1** — Suppress `parseJsonResponse` log noise (smallest, safest)
2. **Change 2** — Improve reranking parse robustness (small, contained)
3. **Change 12** — Update type definitions (dependency for other changes)
4. **Change 3** — Run migration 004 (database schema changes — must be done before code that references new tables/columns)
5. **Change 4** — Add `runId` to embedding service (depends on migration for `run_id` column)
6. **Change 5** — Add `runId` to retrieval service (depends on updated RPC function from migration)
7. **Change 6** — Enhance test diagnostics (depends on embedding service changes)
8. **Change 7** — Create embedding runs API endpoint (depends on diagnostics)
9. **Change 8** — Create test reports API endpoints (depends on migration for `rag_test_reports` table)
10. **Change 9** — Create markdown report API endpoint (standalone)
11. **Change 10** — Update golden-set test API route (depends on test diagnostics changes)
12. **Change 11** — Update page UI (depends on all API endpoints being created)

---

## Verification Plan

### TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit
```

### Migration Verification

After running `004-embedding-runs-and-reports.js`:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
    // Check rag_embedding_runs
    const runs = await saol.agentIntrospectSchema({table:'rag_embedding_runs',includeColumns:true,transport:'pg'});
    console.log('rag_embedding_runs:', runs.tables?.[0]?.columns?.length, 'columns');

    // Check rag_embeddings.run_id
    const embed = await saol.agentIntrospectSchema({table:'rag_embeddings',includeColumns:true,transport:'pg'});
    const embedCols = embed.tables?.[0]?.columns?.map(c=>c.name) || [];
    console.log('rag_embeddings.run_id:', embedCols.includes('run_id') ? 'YES' : 'NO');

    // Check rag_test_reports
    const reports = await saol.agentIntrospectSchema({table:'rag_test_reports',includeColumns:true,transport:'pg'});
    console.log('rag_test_reports:', reports.tables?.[0]?.columns?.length, 'columns');
})();
"
```

### Vercel Log Verification (Post-Deploy)

After deploying with all changes:
- Run the golden-set test via `/rag/test`
- Check Vercel logs:
  - **NO** more `[RAG Embedding] Error in text search: invalid UNION/INTERSECT/EXCEPT ORDER BY clause`
  - **NO** more `[parseJsonResponse] Direct parse failed` at INFO level
  - **Significantly fewer** `[RAG Retrieval] Reranking: Could not parse ranking` warnings
  - Better self-eval scores (text search now contributing to hybrid retrieval)

### Embedding Run Selector Test

1. Upload and process a document (should create an embedding run record)
2. Visit `/rag/test`
3. Check the dropdown — should show the new run with timestamp, count, pipeline version
4. Select the run and click "Run Test"
5. Verify that the test queries only use embeddings from the selected run
6. Verify preflight shows run-specific metadata

### Report Download Test

1. Run the golden-set test
2. Click "Download .md"
3. Verify the downloaded file opens as clean Markdown
4. Verify it contains: summary table, difficulty breakdown, preflight checks, all 20 individual results

### Report Save Test

1. Run the golden-set test
2. Click "Save Report"
3. Verify success message appears
4. Click "History" toggle
5. Verify the saved report appears in the history list with correct pass rate and timestamp

### Historical Reports Test

1. Save multiple reports (with different embedding runs if available)
2. Verify the history panel shows all saved reports in reverse chronological order
3. Verify each entry shows: date, pass/fail badge, pass rate, duration

### Backward Compatibility Test

1. Run `queryRAG()` without a `runId` parameter (existing code paths)
2. Verify normal RAG chat continues to work (searches all embeddings)
3. Verify existing embeddings (with `run_id = NULL`) are still returned in searches

---

## Data Flow Diagrams

### Embedding Run Creation (During Ingestion)

```
processDocument(documentId)
  ├── Steps 1-7: Claude processing, sections, facts, questions
  └── Step 8: Embedding generation
        ├── INSERT rag_embedding_runs (id=runId, status=running)
        ├── generateAndStoreBatchEmbeddings({runId, items})
        │     └── INSERT rag_embeddings (run_id=runId, ...)  ← N rows
        └── UPDATE rag_embedding_runs (status=completed, count=N)
```

### Test with Run Selector

```
page.tsx
  ├── useEffect: GET /api/rag/test/golden-set/runs
  │     └── Returns: [{id, embeddingCount, startedAt, ...}]
  ├── User selects run from dropdown (selectedRunId)
  └── Run Test → POST /api/rag/test/golden-set {batch, runId}
        └── runSingleTest(item, userId, docId, runId)
              └── queryRAG({..., runId})
                    └── retrieveContext({..., runId})
                          ├── searchSimilarEmbeddings({..., runId})
                          │     └── RPC match_rag_embeddings_kb(filter_run_id)
                          └── searchTextContent({...})  ← no runId (BM25 not affected)
```

### Report Storage Flow

```
page.tsx
  ├── Test completes → summary displayed
  ├── Click "Save Report"
  │     └── POST /api/rag/test/golden-set/reports {summary, embeddingRunId}
  │           └── INSERT rag_test_reports (pass_rate, results JSONB, ...)
  ├── Click "Download .md"
  │     └── POST /api/rag/test/golden-set/report (summary JSON → markdown text)
  └── History panel
        └── GET /api/rag/test/golden-set/reports
              └── SELECT from rag_test_reports ORDER BY created_at DESC
```

---

## Impact Analysis

### Functions Modified (with signatures)

| Function | File | Change |
|----------|------|--------|
| `parseJsonResponse<T>()` | `claude-llm-provider.ts` | Remove `console.log` from first catch |
| `rerankWithClaude()` | `rag-retrieval-service.ts` | Multi-strategy JSON extraction |
| `generateAndStoreEmbedding()` | `rag-embedding-service.ts` | Add `runId` param |
| `generateAndStoreBatchEmbeddings()` | `rag-embedding-service.ts` | Add `runId` param |
| `searchSimilarEmbeddings()` | `rag-embedding-service.ts` | Add `runId` param, pass to RPC |
| `processDocument()` | `rag-ingestion-service.ts` | Create run record, pass `runId` to embeddings |
| `retrieveContext()` | `rag-retrieval-service.ts` | Add `runId` param, pass to search |
| `queryRAG()` | `rag-retrieval-service.ts` | Add `runId` param, pass to retrieval |
| `runPreflightChecks()` | `test-diagnostics.ts` | Enhanced embedding metadata |
| `runSingleTest()` | `test-diagnostics.ts` | Add `runId` param, pass to queryRAG |

### Functions NOT Modified

| Function | File | Reason |
|----------|------|--------|
| `searchTextContent()` | `rag-embedding-service.ts` | BM25 search is not affected by embedding runs |
| `generateHyDE()` | `rag-retrieval-service.ts` | Not related to embeddings |
| `selfEvaluate()` | `rag-retrieval-service.ts` | Not related to embeddings |
| `generateResponse()` | `rag-retrieval-service.ts` | Not related to embeddings |
| `assembleContext()` | `rag-retrieval-service.ts` | Not related to embeddings |
| `readDocument()` | `claude-llm-provider.ts` | Ingestion, not retrieval |
| `uploadDocumentFile()` | `rag-ingestion-service.ts` | Upload, not embeddings |

### Database Functions Modified

| Function | Change |
|----------|--------|
| `match_rag_embeddings_kb()` | New `filter_run_id` parameter (defaults to NULL — backward compatible) |
| `search_rag_text()` | `ORDER BY rank DESC` → `ORDER BY 5 DESC` (bug fix) |

### No Breaking Changes

All changes are additive:
- New parameters are optional with sensible defaults
- New tables are independent
- New columns have `NULL` defaults
- RPC function changes are backward compatible (new params have `DEFAULT NULL`)
- Existing callers of `queryRAG`, `searchSimilarEmbeddings`, `processDocument`, etc. continue to work without modification
