# 019 — RAG Embedding Gap: Full Investigation & Fix Spec

---

| Field | Value |
|-------|-------|
| **Date** | 2026-02-19 |
| **Author** | Claude Sonnet (claude-4.6-sonnet-medium-thinking) |
| **Based on** | 018-rag-multi-golden-current-state_v1.md (Issue 4) |
| **Scope** | Root cause analysis and fix spec for the 131-fact embedding gap |
| **Constraint** | ALL database operations MUST use SAOL |
| **SAOL Reference** | `pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md` |

---

## Executive Summary

The embedding gap — 131 of 1,131 facts (11.6%) never getting a tier-3 embedding — has a **single, definitive root cause**: the Supabase PostgREST API enforces a default row limit of **1,000 rows** on all SELECT queries that don't specify an explicit limit. When the Inngest embedding step queries `rag_facts` for a document, PostgREST silently caps the response at 1,000 rows. The 131 newest facts (created during later pipeline passes) are never returned, never added to the embedding batch, and never stored in `rag_embeddings`.

The gap detection code added in Change 7 (spec 017) **never fires** because it compares the fetched count (1,000) against itself rather than the true DB count (1,131). The system reports "100% coverage" and the warning is never shown.

The fix requires adding `.limit(10000)` to four unbounded `rag_facts` queries across three files. No schema changes, no migrations, no architectural changes.

---

## Data Baseline (SAOL Verified — 2026-02-19)

```
rag_facts total:                 1,131  rows
rag_embeddings tier-1:               1  row
rag_embeddings tier-2:              29  rows
rag_embeddings tier-3:           1,000  rows  ← PostgREST default cap
rag_embeddings total:            1,030  rows
─────────────────────────────────────────────
Facts with tier-3 embedding:     1,000
Facts WITHOUT tier-3 embedding:    131  (11.6% gap)
rag_sections total:                 29  sections
rag_embedding_runs.embedding_count: 1,030  (recorded vs. actual)
```

---

## Layer 1: Data Verification

### What SHOULD Exist vs. What IS Stored

| Item | Expected | Actual | Delta |
|------|----------|--------|-------|
| rag_facts | 1,131 | 1,131 | ✓ 0 |
| rag_embeddings (tier-3) | 1,131 | 1,000 | **131 missing** |
| rag_embeddings (all tiers) | 1,161 | 1,030 | **131 missing** |
| embedding_run.embedding_count | 1,161 | 1,030 | **Incorrect — records attempted, not stored** |

### Missing Facts by Type (SAOL Query)

```sql
SELECT f.fact_type, COUNT(*) as cnt
FROM rag_facts f
WHERE NOT EXISTS (
  SELECT 1 FROM rag_embeddings e
  WHERE e.source_id = f.id AND e.tier = 3
)
GROUP BY f.fact_type ORDER BY cnt DESC;
```

| fact_type | count | Impact |
|-----------|-------|--------|
| fact | 57 | General extracted facts — broad retrieval impact |
| narrative_fact | 22 | Implicit/prose facts — hardest to re-extract |
| limit | 15 | Dollar/percentage thresholds — high retrieval value |
| definition | 12 | Term definitions — medium retrieval value |
| policy_rule | 9 | Explicit policy rules — high retrieval value |
| cross_reference | 8 | Policy-to-policy links — structural |
| audit_field | 3 | Audit requirements — operational |
| entity | 2 | Named entities |
| policy_exception | 2 | Exception conditions — high value |
| required_document | 1 | Required documentation |
| **Total** | **131** | |

### Timing Evidence

```sql
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM rag_embeddings e WHERE e.source_id = f.id AND e.tier = 3) 
       THEN 'has_embedding' ELSE 'missing_embedding' END as status,
  MIN(f.created_at) as earliest,
  MAX(f.created_at) as latest,
  COUNT(*) as cnt
FROM rag_facts f GROUP BY status;
```

| Status | Earliest created_at | Latest created_at | Count |
|--------|--------------------|--------------------|-------|
| has_embedding | 2026-02-19T21:21:13Z | **2026-02-19T21:35:20Z** | 1,000 |
| missing_embedding | **2026-02-19T21:34:54Z** | 2026-02-19T21:38:34Z | 131 |

**Key finding:** The embedding run started at `21:40:01Z`. All 1,131 facts existed in the database **before** embedding ran. The 131 missing facts were created during later pipeline passes (Pass 5 narrative, Pass 6 verification) — they're the newest facts, created 21:34–21:38. The embedding step was responsible for including all of them, but only fetched 1,000.

### The "Exactly 1000" in the Dashboard

The DocumentDetail component fetches facts via `/api/rag/documents/[id]`, which runs the same uncapped query. This is why the UI header shows `Facts (1000)` instead of `Facts (1131)` — the API response is also truncated by PostgREST. The `factCount` field on `rag_documents` shows the correct count (1,131), creating a confusing discrepancy where the counter in the Facts panel header disagrees with the Metadata card.

---

## Layer 2: Pipeline Trace

### Inngest Multi-Pass Pipeline — Step-by-Step

```
21:21:13Z  Pass 2 begins: policy extraction, first facts stored
21:34:54Z  Pass 5/6 begins: narrative and verification facts stored
21:38:34Z  Last fact stored — 1,131 total facts now in rag_facts

                                       ↑ All 1,131 facts exist at this point

21:40:01Z  Step 11 'generate-embeddings' runs:
           └── deleteDocumentEmbeddings(documentId)                   ✓
           └── create embedding run record                             ✓
           └── supabase.from('rag_facts').select('*')
               .eq('document_id', documentId)
                                        ↑ PostgREST max_rows = 1,000
                                        ↑ Returns 1,000 of 1,131 facts
                                        ↑ 131 facts SILENTLY DROPPED
           └── embeddingItems built: 1 + 29 + 1000 = 1,030 items     ✗ (should be 1,161)
           └── generateAndStoreBatchEmbeddings(1,030 items)            ✓
           └── gap detection: factCount=1000, tier3Count=1000, gap=0  ✗ (false 0)
           └── embedding_run.embedding_count = 1,030                   ✗ (should be 1,161)

21:40:11Z  Embedding run marked 'completed'
```

### Gap Detection Code — Why It Never Fires

The gap detection code added in Change 7 (spec 017) is in `process-rag-document.ts` (lines 503–511):

```typescript
const factCount = currentFacts.length;          // 1,000 (PostgREST capped)
const tier3Count = embeddingItems.filter(e => e.tier === 3).length;
                                                 // 1,000 (derived from same capped data)
const gap = factCount - tier3Count;             // 0 — ALWAYS ZERO
if (gap > 0) {
  console.warn(`[RAG Embedding] WARNING: ${gap} facts have no embedding...`);
}
// This block NEVER executes
```

The gap detection is logically circular — it compares the count of facts that were fetched against the number of embeddings created from those same facts. It never compares against the ground truth (actual DB count). The warning was never shown in Vercel logs.

---

## Layer 3: Interface & Integration Points

### Root Cause: Supabase PostgREST Default Row Limit

Supabase uses PostgREST as its API layer. PostgREST enforces a server-side `max_rows` setting. In Supabase projects, this defaults to **1,000 rows**. Any `SELECT` query issued through the supabase-js client without an explicit `.limit()` will return at most 1,000 rows, silently truncating results.

The SAOL query for `postgrest.max_rows` returns NULL because SAOL uses a direct pg connection that bypasses PostgREST. The cap is enforced at the PostgREST layer, not the PostgreSQL layer.

### All Affected Queries

The following queries all use the same uncapped pattern and will silently return at most 1,000 facts:

| File | Line | Function | Impact |
|------|------|----------|--------|
| `src/inngest/functions/process-rag-document.ts` | 440–442 | `generate-embeddings` step | **PRIMARY** — causes embedding gap |
| `src/app/api/rag/documents/[id]/route.ts` | 43–45 | `GET` handler | **UI bug** — shows 1,000 instead of actual count |
| `src/lib/rag/services/rag-ingestion-service.ts` | 968–969 | `linkFactRelationships()` | Missing relationship links for 131 facts |
| `src/lib/rag/services/rag-expert-qa-service.ts` | 264–267 | Expert QA re-embedding | Would miss 131 facts during re-embed after expert Q&A |

**Retrieval service (not affected):** The retrieval queries at `rag-retrieval-service.ts:133-137` and `178-182` use `.single()` with a specific `id` filter — these are point lookups, not bulk fetches, and are not affected.

**Pass 6 per-section fetch (not affected):** The query at `process-rag-document.ts:299-302` filters by both `document_id` AND `section_id`. Since each section produces far fewer than 1,000 facts, this is safe.

### Why the Insert Succeeds but the Select Fails

The PostgREST `max_rows` limit applies to **SELECT** queries. INSERT operations are not subject to this row limit. This is why `generateAndStoreBatchEmbeddings` with 1,030 items works correctly — all 1,030 rows are inserted. The problem is entirely in the fetch phase.

### The `embedding_count` Discrepancy

The embedding run records `embedding_count = embeddingItems.length = 1,030`. This field was intended to track how many embeddings were generated, but it reflects the capped fetch count, not the true total. The actual correct value should be 1,161 (1 + 29 + 1,131). This field should be either:
- Calculated from the DB after insertion (actual count), or
- Removed and replaced by a real-time count query

---

## Layer 4: Quality & Calibration

### Impact on Retrieval Quality

The 131 missing facts represent **all types** of knowledge, not just low-value content. Among the missing:
- **15 `limit` facts** — dollar amounts, percentages, thresholds — exactly the kinds of facts users ask about
- **9 `policy_rule` facts** — explicit policy statements — high retrieval value
- **2 `policy_exception` facts** — exception conditions — high value for nuanced queries
- **22 `narrative_fact` facts** — implicit facts from prose — the hardest to extract again

These missing facts are also concentrated in **the later passes** (Pass 5 narrative, Pass 6 verification), which are the most refined and complete pass outputs. Pass 6 specifically adds facts that earlier passes missed — the "gap filler" facts are themselves ungapped from embeddings.

### How Retrieval is Affected

For any query topic where the correct answer happens to live primarily in one of the 131 missing facts:
- Vector search will find no relevant result for those facts
- The query may return a lower-quality answer from less precise facts
- The user cannot know which queries are affected

For the current golden test: with 90% pass rate despite the gap, the system is robust. But precision will improve measurably once all facts are embedded, particularly for edge-case or detail-heavy queries.

### Dashboard Misleads the User

The `DocumentDetail` component shows `Facts (1000)` in the Facts panel header (because the API is also capped), while the Metadata card shows `Facts: 1131` (from the `rag_documents.fact_count` column, set via a `count: 'exact'` HEAD query). This discrepancy is confusing and will increase as document size grows.

### Gap Detection Is Calibrated Wrong

The gap detection warning will never fire regardless of how large the gap is. A document with 5,000 facts would have 4,000 unembedded and the warning would still show 0. This is a reliability failure: a quality metric that silently reads as healthy even when severely broken.

---

## Layer 5: Error Analysis

### Error 1: PostgREST Row Truncation (Primary)

| Attribute | Detail |
|-----------|--------|
| **Error type** | Silent data truncation (no error thrown) |
| **Origin** | Supabase PostgREST default `max_rows = 1000` |
| **Surfaces as** | Query returns 1,000 rows instead of 1,131; no exception, no warning |
| **Did process complete?** | Yes — the system considers itself successful |
| **Output quality** | Partial — 1,030 of 1,161 embeddings generated (11.6% gap) |
| **Root cause** | Missing `.limit(n)` on 4 unbounded `rag_facts` SELECT queries |
| **Related to quality problems?** | Yes — missing embeddings mean 131 facts are invisible to vector search |

### Error 2: Gap Detection Logical Flaw (Secondary)

| Attribute | Detail |
|-----------|--------|
| **Error type** | Logic error — circular comparison produces false zero |
| **Origin** | `factCount = currentFacts.length` (capped) compared to `tier3Count` (derived from same capped data) |
| **Surfaces as** | Warning never triggered; Vercel logs show no gap warning |
| **Did process complete?** | Yes — no impact on execution |
| **Output quality** | Zero operational value — the metric does not measure what it claims |
| **Root cause** | Gap detection must compare against actual DB count, not fetched count |
| **Related to quality problems?** | Indirectly — prevents observability of the primary error |

### Error 3: Dashboard Fact Count Mismatch (Tertiary)

| Attribute | Detail |
|-----------|--------|
| **Error type** | UI inconsistency — two fact counts disagree |
| **Origin** | `GET /api/rag/documents/[id]` truncates `facts` to 1,000 rows |
| **Surfaces as** | `Facts (1000)` in panel header vs `1131` in Metadata card |
| **Did process complete?** | N/A — UI display only |
| **Root cause** | Same missing `.limit(n)` as Error 1, in the API route |
| **Related to quality problems?** | No, but damages user trust in data accuracy |

---

## Implementation Specification

### Change 1 — Fix Primary: Add Explicit Limit to Embedding Fact Fetch

**File:** `src/inngest/functions/process-rag-document.ts`  
**Line:** 439–442 (`generate-embeddings` step)

**Current:**
```typescript
const { data: factRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId);
```

**Change to:**
```typescript
const { data: factRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId)
  .limit(10000);
```

**Rationale:** 10,000 is a safe upper bound — no realistic policy document will produce 10,000 facts. This overrides PostgREST's `max_rows = 1000` default and returns all facts. If future documents exceed 10,000 facts, a pagination approach will be needed (but this is not a concern for current use).

---

### Change 2 — Fix Gap Detection: Compare Against Real DB Count

**File:** `src/inngest/functions/process-rag-document.ts`  
**Lines:** 503–511 (after `generateAndStoreBatchEmbeddings` call)

**Current:**
```typescript
const factCount = currentFacts.length;
const tier3Count = embeddingItems.filter(e => e.tier === 3).length;
const gap = factCount - tier3Count;
if (gap > 0) {
  console.warn(`[RAG Embedding] WARNING: ${gap} facts have no embedding (${factCount} facts, ${tier3Count} tier-3 embeddings)`);
} else {
  console.log(`[Inngest] Embedding coverage: ${factCount} facts → ${tier3Count} tier-3 embeddings (100%)`);
}
```

**Change to:**
```typescript
// Verify embedding coverage against actual DB count (not just fetched count)
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
    `This may indicate a PostgREST row limit issue — check that fetch uses .limit(10000).`
  );
} else {
  console.log(`[Inngest] Embedding coverage: ${actualFactCount} facts → ${tier3Count} tier-3 embeddings (100%)`);
}
```

**Rationale:** `select('*', { count: 'exact', head: true })` executes a `COUNT(*)` query and is not subject to `max_rows` truncation (it returns a single integer, not rows). This gives the true ground-truth count. If the gap detection fires after this fix, something else is wrong.

---

### Change 3 — Fix UI: Uncap Document Detail Fact Fetch

**File:** `src/app/api/rag/documents/[id]/route.ts`  
**Lines:** 42–45

**Current:**
```typescript
const { data: factRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId);
```

**Change to:**
```typescript
const { data: factRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId)
  .limit(10000);
```

**Rationale:** The DocumentDetail component shows `Facts ({facts.length})`. This should match the true count. Additionally, the document detail page renders the first 20 facts with a `+N more` message — if only 1,000 facts are fetched, the `+N more` count understates the true fact count.

---

### Change 4 — Fix Relationship Linking: Uncap linkFactRelationships Fetch

**File:** `src/lib/rag/services/rag-ingestion-service.ts`  
**Lines:** 965–971 (`linkFactRelationships` function)

**Current:**
```typescript
const { data: factRows, error } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId);
```

**Change to:**
```typescript
const { data: factRows, error } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId)
  .limit(10000);
```

**Rationale:** `linkFactRelationships` builds a rule-to-exception relationship map. If 131 facts are missing from the fetch, those facts will have no `parent_fact_id` set, even if a qualifying rule exists. Relationship links are used for contextual display and exception-tracking.

---

### Change 5 — Fix Expert QA Re-embedding: Uncap Fact Fetch

**File:** `src/lib/rag/services/rag-expert-qa-service.ts`  
**Lines:** 264–267

**Current:**
```typescript
const { data: updatedFactRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', params.documentId);
```

**Change to:**
```typescript
const { data: updatedFactRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', params.documentId)
  .limit(10000);
```

**Rationale:** This is the re-embedding path triggered after expert Q&A is verified. Without the fix, any document with >1,000 facts that goes through expert Q&A verification will produce the same embedding gap.

---

### Change 6 — Also Fix Single-Pass Ingestion (rag-ingestion-service.ts)

The `processDocument` function in `rag-ingestion-service.ts` (the non-Inngest path) does not fetch facts from the DB for embedding — it uses the in-memory `facts` array from the insert result. However, the `linkFactRelationships` call (Change 4) IS invoked from here in some flows.

The Inngest flow (which is the main production path) is the primary fix target. But for completeness and to prevent future regressions, add the same `.limit(10000)` pattern as a house rule for any future fact fetches added to this file.

---

## Summary of Changes

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `process-rag-document.ts:440` | Add `.limit(10000)` to fact fetch in `generate-embeddings` | **Fixes 131 missing embeddings** |
| 2 | `process-rag-document.ts:503` | Fix gap detection to use `count: 'exact'` HEAD query | **Makes gap detection accurate** |
| 3 | `route.ts:43` | Add `.limit(10000)` to fact fetch in document detail API | **Fixes UI showing 1000 instead of 1131** |
| 4 | `rag-ingestion-service.ts:968` | Add `.limit(10000)` to fact fetch in `linkFactRelationships` | **Fixes relationship linking for 131 facts** |
| 5 | `rag-expert-qa-service.ts:264` | Add `.limit(10000)` to fact fetch in expert QA re-embed | **Prevents same gap after expert Q&A** |

---

## Acceptance Criteria

**AC-1: All facts embedded after ingestion**
- GIVEN a document with >1,000 facts is ingested through the Inngest multi-pass pipeline
- WHEN the `generate-embeddings` step completes
- THEN `COUNT(*) FROM rag_embeddings WHERE tier = 3` equals `COUNT(*) FROM rag_facts` for the document (zero gap)

**AC-2: Gap detection fires when gap exists**
- GIVEN the gap detection code runs after embedding
- WHEN there IS a gap (tier-3 count < fact count)
- THEN a `[RAG Embedding] WARNING: N facts have no embedding` log line appears in Vercel

**AC-3: Gap detection does NOT fire when no gap**
- GIVEN the gap detection code runs after embedding
- WHEN tier-3 count = fact count
- THEN the log shows `Embedding coverage: N facts → N tier-3 embeddings (100%)`

**AC-4: UI shows correct fact count**
- GIVEN a document with 1,131 facts is viewed in the DocumentDetail panel
- WHEN the Facts section renders
- THEN the header shows `Facts (1131)`, not `Facts (1000)`

**AC-5: Relationship linking covers all facts**
- GIVEN a document has 1,131 facts including policy exceptions that qualify rules
- WHEN `linkFactRelationships` runs
- THEN exception facts beyond the 1,000th have `parent_fact_id` set if a matching rule exists

**AC-6: Expert QA re-embedding covers all facts**
- GIVEN expert Q&A is completed for a document with >1,000 facts
- WHEN the re-embedding step executes
- THEN all facts receive updated embeddings (same zero-gap requirement as AC-1)

---

## Execution Order

| Step | Action |
|------|--------|
| **1** | Apply Changes 1–5 to codebase |
| **2** | Run the cleanup script to wipe all existing RAG data |
| **3** | Re-upload and re-ingest the Sun Chip Bank Policy document |
| **4** | After ingestion, verify gap = 0 via SAOL: `SELECT COUNT(*) FROM rag_facts` and `SELECT COUNT(*) FROM rag_embeddings WHERE tier = 3` |
| **5** | Verify Vercel logs show "Embedding coverage: N facts → N tier-3 embeddings (100%)" |
| **6** | Verify DocumentDetail UI shows the correct fact count |
| **7** | Run the golden test and compare results to the 90% baseline |

---

## Out of Scope

| Item | Why Deferred |
|------|--------------|
| Pagination for documents >10,000 facts | Current max is ~1,200. A `.limit(10000)` hardcode is sufficient and safe. |
| Fixing the `embedding_count` column to reflect actual DB count | Low priority — the gap detection improvement (Change 2) gives accurate real-time logging. |
| Investigating whether OpenAI has a batch limit for 1,161 embeddings | OpenAI's `text-embedding-3-small` supports up to 2,048 inputs per request. 1,161 is well within this. |
| Fixing the `rag_embedding_runs.embedding_count` to store actual stored count | Minor — the metric is slightly misleading but does not affect retrieval. |

---

## Root Cause in One Sentence

> The Inngest embedding step fetches `rag_facts` via Supabase's PostgREST API without specifying `.limit()`, causing PostgREST's default `max_rows = 1000` to silently truncate the result, leaving 131 facts permanently invisible to vector search — and the gap detection code never fires because it compares the truncated count against itself.

---

*End of investigation spec.*
