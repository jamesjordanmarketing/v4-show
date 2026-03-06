# E01 QA Report — Multi-Document Retrieval: Foundation Layer

| Field | Value |
|-------|-------|
| **Date** | 2026-02-20 |
| **Auditor** | Agent (automated SAOL + codebase audit) |
| **Spec** | `002-multi-doc-retrieval-execution-prompt-E01_v1.md` |
| **DB State at audit** | Clean (full clear via `021-rag-multi-golden-clear-rag-SQL_v1.md` applied before audit) |
| **Vercel Log** | `vercel-log-35.csv` |
| **Overall Status** | ✅ COMPLETE — all E01 deliverables verified |

---

## Section 1: Lock / Contention Investigation

**Question:** Could the running Vercel ingestion job have blocked or partially failed any of the 5 DDL migrations?

**Method:** Vercel log scanned for `lock`, `blocked`, `timeout`, `canceled`, `abort` signals across all RAG-related requests during the migration window (22:48–22:49 UTC). SAOL `agentIntrospectSchema` and `agentManageIndex` used to confirm every expected object is present in live DB.

**Findings:**

- Zero lock/contention keywords found in the Vercel log for the migration time window.
- All 5 migrations completed in 105–683ms (sub-second), indicating no row-level lock waits.
- All DDL used `IF NOT EXISTS` guards — safe to re-run idempotently even if partially executed.
- Every expected schema object is confirmed present in the live DB (see Section 2).

**Verdict: No lock-related failures. All migrations completed successfully and fully.**

---

## Section 2: Full Database Audit

Audit executed live via SAOL against the production Supabase database after the data clear.

### 2.1 Column Additions

| Table | Column | Status | Notes |
|-------|--------|--------|-------|
| `rag_knowledge_bases` | `summary TEXT` | ✅ EXISTS | Migration 1 |
| `rag_queries` | `query_scope TEXT` | ✅ EXISTS | Migration 4 |
| `rag_facts` | `knowledge_base_id UUID` | ✅ EXISTS | Migration 5 |
| `rag_sections` | `knowledge_base_id UUID` | ✅ EXISTS | Migration 5 |
| `rag_embeddings` | `knowledge_base_id UUID` | ✅ EXISTS (pre-existing) | Backfill target |

### 2.2 Column Definitions

| Column | Default | Nullable | Constraint |
|--------|---------|----------|------------|
| `rag_queries.query_scope` | `'document'::text` | YES | `CHECK (query_scope IN ('document', 'knowledge_base'))` |

Both the DEFAULT and CHECK constraint are correctly set as specified. Nullable allows legacy rows without the field.

### 2.3 Index Additions

Verified via `agentManageIndex` list on `rag_embeddings`:

| Index | Type | Columns | Status |
|-------|------|---------|--------|
| `idx_rag_embeddings_kb_id` | btree | `knowledge_base_id` | ✅ EXISTS |
| `idx_rag_embeddings_kb_tier` | btree composite | `(knowledge_base_id, tier)` | ✅ EXISTS |

Full index list on `rag_embeddings` (8 total): `idx_rag_embeddings_doc`, `idx_rag_embeddings_kb_id`, `idx_rag_embeddings_kb_tier`, `idx_rag_embeddings_run_id`, `idx_rag_embeddings_source`, `idx_rag_embeddings_tier`, `idx_rag_embeddings_vector_hnsw`, `rag_embeddings_pkey`.

Note: The `idx_rag_embeddings_kb_tier` SAOL `columns` array listed `["tier", "knowledge_base_id"]` (alphabetical artefact), but the authoritative `indexDef` confirms: `USING btree (knowledge_base_id, tier)` — correct order per spec.

### 2.4 RPC Verification

Both required RPCs confirmed present (each appears as 2 overloads in `information_schema.routines` — normal PostgreSQL behaviour for functions with different argument signatures):

| RPC | Status |
|-----|--------|
| `match_rag_embeddings_kb` | ✅ EXISTS (×2 overloads) |
| `search_rag_text` | ✅ EXISTS (×2 overloads) |

### 2.5 Post-Clear Data Counts

All tables empty after `021-rag-multi-golden-clear-rag-SQL_v1.md` was applied:

| Table | Rows |
|-------|------|
| `rag_knowledge_bases` | 0 |
| `rag_documents` | 0 |
| `rag_sections` | 0 |
| `rag_facts` | 0 |
| `rag_embeddings` | 0 |
| `rag_queries` | 0 |
| `rag_quality_scores` | 0 |
| `rag_expert_questions` | 0 |

DB is clean and ready for a fresh test cycle. The null-`knowledge_base_id` facts issue observed earlier (during the live job) is now moot — all data was deleted.

---

## Section 3: Codebase Audit

All 7 code tasks from the E01 spec verified against the live source files.

### 3.1 `src/types/rag.ts` — 5 Interface Changes

| Change | Interface | Field | Status |
|--------|-----------|-------|--------|
| +2 fields | `RAGCitation` | `documentId?: string`, `documentName?: string` | ✅ |
| +1 field | `RAGKnowledgeBase` | `summary: string \| null` | ✅ |
| +1 field | `RAGKnowledgeBaseRow` | `summary: string \| null` | ✅ |
| +1 field | `RAGQuery` | `queryScope: 'document' \| 'knowledge_base'` | ✅ |
| +1 field | `RAGQueryRow` | `query_scope: string \| null` | ✅ |

### 3.2 `src/lib/rag/config.ts` — 2 New Config Values

| Value | Setting | Status |
|-------|---------|--------|
| `kbWideSimilarityThreshold` | `0.3` | ✅ |
| `maxSingleDocRatio` | `0.6` | ✅ |

Both inserted inside the `retrieval` block in the correct position.

### 3.3 `src/lib/rag/services/rag-retrieval-service.ts` — Guard Clause + Scope Tracking

**Guard clause (FR-1.1):**

```typescript
// Before (blocked KB-wide queries):
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required...');
}

// After (allows KB-wide queries):
if (!params.documentId && !params.knowledgeBaseId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId or knowledgeBaseId is required...');
}
```
Status: ✅ CORRECT — confirmed at line 669–672.

**Query scope constant (FR-1.2):**

```typescript
const queryScope: 'document' | 'knowledge_base' = params.documentId ? 'document' : 'knowledge_base';
```
Status: ✅ CORRECT — inserted at line 675, immediately after guard clause.

**All 3 `rag_queries` insert sites updated with `query_scope: queryScope`:**

| Insert Site | Location | Status |
|-------------|----------|--------|
| LoRA-only mode | Line ~729 | ✅ `query_scope: queryScope` present |
| No-context early return | Line ~820 | ✅ `query_scope: queryScope` present |
| Main RAG path (Step 7) | Line ~912 | ✅ `query_scope: queryScope` present |

### 3.4 `src/lib/rag/services/rag-embedding-service.ts` — KB ID Fix (FR-5.1)

`generateAndStoreEmbedding()` now performs a pre-insert lookup:

```typescript
// Lookup knowledge_base_id from document
const { data: docRow } = await supabase
  .from('rag_documents')
  .select('knowledge_base_id')
  .eq('id', documentId)
  .single();
```

And sets it on the insert:
```typescript
knowledge_base_id: docRow?.knowledge_base_id || null,
```

Status: ✅ CORRECT — confirmed at lines 46–58.

### 3.5 `src/lib/rag/services/rag-db-mappers.ts` — Mapper Updates (FR-7.2)

| Function | Field Added | Status |
|----------|------------|--------|
| `mapRowToKnowledgeBase()` | `summary: row.summary \|\| null` | ✅ |
| `mapRowToQuery()` | `queryScope: (row.query_scope as 'document' \| 'knowledge_base') \|\| 'document'` | ✅ |

The `|| 'document'` default in `mapRowToQuery` correctly handles legacy rows with NULL `query_scope`.

---

## Section 4: Vercel Log Observations

The Vercel log (`vercel-log-35.csv`) was scanned for E01-related signals and pre-existing issues.

### 4.1 Ingestion Job — Normal Completion

The log shows `Sun-Chip-Bank-Policy-Document-v2.0.md` completing all 6 passes normally:
- Pass 2 (Policy Extraction): extracting facts per section ✅
- Pass 3 (Table Extraction): tables found ✅
- Pass 6 (Verification): coverage 95–100% per section ✅

No errors or crashes during the ingestion run. Status HTTP 206 throughout (Inngest step execution).

### 4.2 Pre-Existing Issues (NOT E01-related)

Two pre-existing issues noted — neither related to E01 changes:

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| `[RAG Embedding] WARNING: 48 facts have no embedding (1048 total facts, 1000 tier-3 embeddings generated). Check that fact fetch uses .limit(10000).` | Inngest pipeline | ⚠️ Warning | Pre-existing fact fetch limit in embedding pipeline. Tier-3 facts capped at 1000 due to `.limit()` call. Out of E01 scope. |
| `[Cron] Daily maintenance failed: TypeError: Cannot read properties of null (reading 'rpc')` | `/api/cron/daily-maintenance` | ⚠️ Warning | Pre-existing null guard issue in daily cron. Unrelated to RAG E01. |

---

## Section 5: E01 Success Criteria — Final Checklist

| Criterion | Status |
|-----------|--------|
| All 5 migrations executed and verified via SAOL | ✅ |
| Both RPCs (`match_rag_embeddings_kb`, `search_rag_text`) confirmed present | ✅ |
| `RAGCitation` has `documentId` and `documentName` optional fields | ✅ |
| `RAGKnowledgeBase` and `RAGKnowledgeBaseRow` have `summary` field | ✅ |
| `RAGQuery` has `queryScope` field; `RAGQueryRow` has `query_scope` | ✅ |
| Config has `kbWideSimilarityThreshold: 0.3` and `maxSingleDocRatio: 0.6` | ✅ |
| Guard clause now accepts `knowledgeBaseId` as alternative to `documentId` | ✅ |
| All 3 `rag_queries` insert sites include `query_scope` | ✅ |
| `generateAndStoreEmbedding()` looks up and sets `knowledge_base_id` | ✅ |
| Mappers updated for `summary` and `queryScope` | ✅ |
| TypeScript compiles without new errors (`npx tsc --noEmit`) | ✅ (only pre-existing `pdf-parse` error in `text-extractor.ts`) |
| DB clean and ready for fresh test cycle | ✅ |
| No lock/contention issues from migrations running during live job | ✅ |

---

## Section 6: Action Items Before E02

### Required

1. **Re-backfill `rag_facts.knowledge_base_id` after next ingestion run.**
   The ingestion pipeline does not set `knowledge_base_id` on facts during insert (out of E01 scope). After each ingestion job completes, run:
   ```bash
   cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
   require('dotenv').config({path:'../.env.local'});
   const saol=require('.');
   (async()=>{
     const sql = 'UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL;';
     const r = await saol.agentExecuteDDL({sql, dryRun:true, transaction:true, transport:'pg'});
     console.log('Dry:', r.success);
     if(r.success){ const x = await saol.agentExecuteDDL({sql, transaction:true, transport:'pg'}); console.log('Execute:', x.success, x.summary); }
   })();
   "
   ```
   This also applies to `rag_sections` if any sections are added without `knowledge_base_id`. Re-backfill is a one-liner and takes < 1 second.

### Optional / Future

2. **Pre-existing embedding warning:** `[RAG Embedding] WARNING: 48 facts have no embedding`. The fact fetch in the Tier-3 embedding step uses `.limit(1000)` or similar, capping at 1000 embeddings for large documents. This reduces retrieval quality on large documents. Fix is in the embedding pipeline (increase or remove the limit). Not in E01 scope but should be addressed before golden set testing.

3. **Daily maintenance cron null guard:** `TypeError: Cannot read properties of null (reading 'rpc')`. Pre-existing, low priority, not affecting RAG functionality.

---

## Conclusion

**E01 is complete.** All database schema changes, indexes, RPCs, TypeScript types, configuration, guard clause removal, embedding fix, and mapper updates are in place and verified against both the live database and source code. No lock-related migration failures occurred. The database is clean and ready for the next test cycle. E02 can begin.
