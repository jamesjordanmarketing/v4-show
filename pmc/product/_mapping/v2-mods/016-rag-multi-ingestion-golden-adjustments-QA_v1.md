# QA Analysis: Golden-Set Embedding Run Selector — Empty Dropdown

**Date:** 2026-02-18  
**Status:** Root Cause Found + Fix Applied

---

## 1. Git Push Verification

The latest commit `eb1063b` (2026-02-18 13:54:33 -0800, "adjustments fix B4: 016-rag-multi-ingestion-golden-adjustments_v1.md implemented") is confirmed pushed to `origin/main`. Running `git log origin/main..HEAD` returned empty output, meaning local HEAD equals remote HEAD. Vercel would have auto-deployed this commit.

**Conclusion: The code IS live on Vercel.**

---

## 2. Database State (SAOL Query Results)

### `rag_embedding_runs` — 1 row exists

| Field | Value |
|-------|-------|
| `id` | `5e3fd093-7939-468c-9a2b-4c23e4af6718` |
| `document_id` | `576b3a95-0976-4c05-95bc-dd7367f3bb60` |
| `status` | `completed` |
| `embedding_count` | `1030` |
| `pipeline_version` | `multi-pass` |
| `started_at` | `2026-02-18T09:33:16` |
| `completed_at` | `2026-02-18T09:33:28` |
| `metadata.document_file_name` | `Sun-Chip-Bank-Policy-Document-v2.0.md` |

**The completed run IS in the database.** The problem is in how the code queries it.

### `rag_documents` — 8 rows, most recent has the run

| `id` | `file_name` | `status` |
|------|------------|---------|
| `576b3a95` | `Sun-Chip-Bank-Policy-Document-v2.0.md` | `ready` ← has embedding run |
| `ceff906e` | `Sun-Chip-Bank-Policy-Document-v2.0.md` | `ready` ← CANONICAL_DOCUMENT_ID (no run!) |
| `a1ac26f4` | `Sun-Chip-Bank-Policy-Document-v2.0.md` | `archived` |
| … (5 more archived) | | |

### Old `CANONICAL_DOCUMENT_ID`

```typescript
export const CANONICAL_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';
```

This is the Feb 15 document. It has **zero rows** in `rag_embedding_runs`. The old `/runs` endpoint was always returning empty — even before our changes. The selector has never shown any runs.

---

## 3. Root Cause: Broken PostgREST Join

The `getEmbeddingRuns()` function was updated (Change 4 of spec 016) to use this query:

```typescript
.select(`
    *,
    rag_documents ( file_name )
`)
```

**This fails** with PostgREST error `PGRST200`:

```
Could not find a relationship between 'rag_embedding_runs' and 'rag_documents' 
in the schema cache.
```

PostgREST implicit joins require a **declared foreign key constraint** in PostgreSQL. Schema inspection via SAOL confirmed:

- `rag_embedding_runs.document_id` — `isForeignKey: false`, `foreignKeyTable: null`
- **No FK constraint exists** between `rag_embedding_runs.document_id` → `rag_documents.id`

The `try/catch` in `getEmbeddingRuns()` swallows this error silently and returns `[]`. This is why the dropdown is empty — the query fails on every page load but the UI sees an empty array and renders only "All embeddings (no filter)".

### Why the FK Was Missing

The `rag_embedding_runs` table was created in migration `004-embedding-runs-and-reports.js` (E010). Schema inspection shows only:
- `PRIMARY KEY (id)` constraint
- `CHECK (status IN ('running', 'completed', 'failed'))` constraint
- No FK constraint on `document_id`

The FK was not included in the migration.

---

## 4. Secondary Finding: Metadata Already Has the Filename

Both pipeline paths already store `document_file_name` in the `metadata` JSONB field at insert time:

**Multi-pass (Inngest):**
```typescript
metadata: {
    section_count: sections.length,
    document_file_name: doc.fileName,
}
```

**Single-pass (rag-ingestion-service):**
```typescript
metadata: {
    section_count: sections.length,
    fact_count: facts.length,
    document_file_name: doc.fileName,
}
```

The DB row confirms this: `metadata.document_file_name = "Sun-Chip-Bank-Policy-Document-v2.0.md"`.

**This means the join is unnecessary.** The `documentName` can be read directly from `row.metadata?.document_file_name`.

---

## 5. Fix Plan

### Fix 1 — Code: Remove the broken join, use metadata instead

**File:** `src/lib/rag/testing/test-diagnostics.ts`  
**Change:** In `getEmbeddingRuns()`, replace the join select with `'*'` and map `documentName` from `row.metadata?.document_file_name`.

### Fix 2 — Schema: Add FK constraint to `rag_embedding_runs`

Add the FK constraint that was missing from the original migration. This enables PostgREST joins in the future and enforces referential integrity.

**SQL:**
```sql
ALTER TABLE rag_embedding_runs 
ADD CONSTRAINT rag_embedding_runs_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE;
```

Fix 1 is the immediate code fix that makes the selector work today. Fix 2 is the data integrity fix applied via SAOL DDL.

---

## 6. Implementation

Both fixes applied — details below.

---

## 7. Fix 1 Applied — Code: `getEmbeddingRuns()` uses metadata instead of join

**File:** `src/lib/rag/testing/test-diagnostics.ts`

Changed the select from:
```typescript
.select(`
    *,
    rag_documents ( file_name )
`)
```
To:
```typescript
.select('*')
```

And changed `documentName` mapping from:
```typescript
documentName: row.rag_documents?.file_name || row.document_id.slice(0, 8),
```
To:
```typescript
documentName: row.metadata?.document_file_name || row.document_id.slice(0, 8),
```

Both single-pass (`rag-ingestion-service.ts`) and multi-pass (`process-rag-document.ts`) pipelines store `document_file_name` in the `metadata` JSONB field at insert time. Confirmed in the DB: `metadata.document_file_name = "Sun-Chip-Bank-Policy-Document-v2.0.md"`.

---

## 8. Fix 2 Applied — Schema: FK Constraint Added via SAOL

**SQL executed:**
```sql
ALTER TABLE rag_embedding_runs 
ADD CONSTRAINT rag_embedding_runs_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE;
```

**SAOL result:** `SUCCESS — Command: ALTER, Rows: 0, executionTimeMs: 167ms`

This fixes the missing FK that was preventing PostgREST joins and establishes proper referential integrity. PostgREST join (`rag_documents(file_name)`) now works too, confirmed via direct supabase-js test.

---

## 9. Verification Results

After both fixes, tested directly against the live DB:

| Test | Result |
|------|--------|
| PostgREST join `rag_embedding_runs + rag_documents(file_name)` | ✅ Returns 1 row |
| Plain select + `metadata.document_file_name` (what fixed code uses) | ✅ Returns 1 row |
| TypeScript compilation | ✅ 0 errors |

The run that will now appear in the dropdown:
- **Doc:** `Sun-Chip-Bank-Policy-Document-v2.0.md`
- **Status:** `completed`
- **Embeddings:** 1030
- **Pipeline:** `multi-pass`
- **Date:** Feb 18, 2026, 09:33 UTC

---

## 10. Why the Selector Was Always Empty (Full Timeline)

| Phase | What happened |
|-------|--------------|
| Before 016 changes | `/runs` filtered to `CANONICAL_DOCUMENT_ID` (`ceff906e`) which has **zero** embedding runs → always empty |
| After 016 changes (broken) | `/runs` now fetches all runs but `getEmbeddingRuns()` uses a PostgREST join that requires a FK → `PGRST200` error → `catch` returns `[]` → still empty |
| After this QA fix | `/runs` uses `metadata.document_file_name` (no join needed, no FK needed) → 1 run returned → dropdown populated |
