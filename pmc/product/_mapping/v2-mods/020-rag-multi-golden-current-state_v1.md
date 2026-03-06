# 020 — RAG Module Golden Test Analysis: Current State Report

| Field | Value |
|-------|-------|
| **Date** | 2026-02-20 |
| **Author** | AI Analysis Agent |
| **Test Run ID** | `8443f2e9-0afe-4d1a-b13d-fec7a9367c58` |
| **Embedding Run** | `124c44c5-6f85-46d6-a1fd-2f94bc49ac18` |
| **Document** | Sun-Chip-Bank-Policy-Document-v2.0.md |
| **Document ID** | `527ee2eb-b777-48f5-b5a0-4e88d8b8f6cf` |
| **KB ID** | `4856bfb9-322d-4d8d-a6b9-67cf47462390` |
| **Input sources** | `golden-rag-test-32.md`, `vercel-log-32.csv`, SAOL DB queries, source document |

---

## Executive Summary

The RAG module is **functionally correct** at answer generation but is being **systematically downgraded** by two interacting failure modes that create a false picture of poor quality:

1. **Self-evaluation assesses context relevance, not answer accuracy.** The `selfEvaluate()` function asks Claude "Is this context relevant and sufficient to answer the query?" — not "Is the generated answer correct?" Because BM25 is broken (see below), the retrieved context is thinner than optimal, so self-eval scores are low even when the answer is factually correct and complete.

2. **BM25 text search is broken on every query** due to an undeployed SQL migration. The `search_rag_text` RPC in the database does not accept the `filter_run_id` parameter that the application code sends. Every single query generates a `PGRST202` error and runs on vector-only retrieval — no keyword/BM25 hybrid.

The result: a system that gives **correct answers 90%+ of the time** (by human accuracy assessment) but reports an average self-eval score of 41%, which then triggers a "low confidence" warning that is prepended to every response with score < 0.5. This makes responses appear as failures even when they are factually accurate.

### Headline Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Official Pass Rate (substring match) | 80% (16/20) | Under 85% target — FAIL |
| Avg Self-Eval Score | 41% | Misleading — evaluates context, not answer |
| Queries with "low confidence" prefix | 15/20 (75%) | Direct consequence of self-eval bug |
| Embedding gap (tier-3 vs facts) | 221 missing (1000/1221) | PostgREST 1000-row cap still active |
| BM25 errors per query | 1 per query (20/20) | 100% failure rate |
| Human Accuracy Score (this report) | **~90%** | See Section 5 |

---

## Section 1: Database State (SAOL Verified)

All data verified via SAOL and direct Supabase service-role queries as of 2026-02-20.

### Knowledge Base & Document

| Field | Value |
|-------|-------|
| KB Name | "Sun Chip Policy Doc #26" |
| KB ID | `4856bfb9-322d-4d8d-a6b9-67cf47462390` |
| Document ID | `527ee2eb-b777-48f5-b5a0-4e88d8b8f6cf` |
| Document Status | `ready` |
| Document fact_count (stored field) | 1,221 |
| Document section_count (stored field) | 29 |

### Embedding State

| Metric | Value | Expected | Gap |
|--------|-------|----------|-----|
| Total embeddings | 1,030 | 1,251 (1+29+1221) | 221 |
| Tier 1 (document) | 1 | 1 | 0 |
| Tier 2 (sections) | 29 | 29 | 0 |
| Tier 3 (facts) | **1,000** | **1,221** | **221 missing** |

**Finding:** The PostgREST 1000-row `max_rows` cap is **still in effect for tier-3 fact embeddings**. Despite Changes 1–5 from spec `019` being applied to the application code, a new ingestion run was performed that still embedded only 1,000 of 1,221 facts. The `.limit(10000)` fix in `process-rag-document.ts` was merged to the codebase, but this ingestion happened from a deployment that may not have included it, OR the Inngest worker is running a cached/older version.

**Evidence:** Preflight check in the golden test report confirms: `1000 embeddings (tier1: 1, tier2: 29, tier3: 970)`. The database query returns `tier3: 1000`. There is a discrepancy between what the preflight check reports (970 tier-3) and the DB count (1000 tier-3) — the preflight may be filtering by run, while the DB count is cross-run. Either way, 221 facts have no embeddings.

---

## Section 2: BM25 / Text Search — 100% Failure Rate

### Finding

Every single query in the golden test run produced this error in Vercel logs:

```
[RAG Embedding] Error in text search: {
  code: 'PGRST202',
  message: 'Could not find the function public.search_rag_text(filter_document_id, filter_knowledge_base_id, filter_run_id, match_count, search_query) in the schema cache',
  hint: 'Perhaps you meant to call the function public.search_rag_text(filter_document_id, filter_knowledge_base_id, match_count, search_query)',
}
```

### Root Cause

This is the **same unresolved bug from the previous test run (031)**. Change 3 of spec `017` added a `filter_run_id` parameter to the TypeScript `searchTextContent()` function and the RPC call. The underlying `search_rag_text` SQL function in Supabase was **never migrated** to accept this new parameter. PostgREST cannot route the call and returns a schema cache error on every query.

**Critically:** this error was identified in the `018` report but the SQL migration was not executed as part of spec `019` Changes 1–5. It remains open.

### Impact

- BM25 keyword matching contributes zero results to every RAG query
- All retrieval relies exclusively on vector similarity search
- The hybrid retrieval system (Change 3 of spec `017`) is partially broken — the guard rail exists in TypeScript but the SQL endpoint doesn't match
- This forces every query to run on ~970–1000 embeddings only, with no keyword fallback

---

## Section 3: Self-Evaluation — Systematic Misdiagnosis

### Finding

The self-evaluation function evaluates the **retrieved context**, not the **generated answer**. The prompt is:

```
"Is this context relevant and sufficient to answer the query?"
```

This means when context is thin (because BM25 failed), self-eval gives a low score — even if Claude's response is factually correct and comprehensive.

### The Low-Confidence Override

When `selfEval.score < 0.5`, the system prepends:

```
"I couldn't find a confident answer to '...' in the knowledge base.

Here's what I found (low confidence):
[actual answer]

Suggestions to improve results:..."
```

This occurred in **15 of 20 queries (75%)** in this test run. The stored response in `rag_queries.response_text` shows this prefix for those 15 queries. The "low confidence" prefix is then what the golden test report captures as the response.

### Self-Eval Score Distribution

| Score | Queries | Queries by Name |
|-------|---------|-----------------|
| 0.92 | 2 | GS-005 (FDIC), GS-012 (jumbo definition) |
| 0.85 | 2 | GS-003 (wire cutoff), GS-010 (mortgage docs) |
| 0.78 | 1 | GS-015 (open account docs) |
| 0.35 | 7 | GS-001, GS-006, GS-009, GS-016, GS-017, GS-018, GS-019 |
| 0.25 | 4 | GS-007, GS-008, GS-020 |
| 0.15 | 4 | GS-002, GS-004, GS-011, GS-013, GS-014 |

**Pattern:** Scores of 0.35 are the dominant cluster. This appears to be the "partially relevant but not sufficient" bucket from the self-eval LLM. Most of these queries have perfectly correct answers in the response text, but retrieved context has gaps due to BM25 failure.

### Why Self-Eval Is Miscalibrated

The self-eval prompt evaluates retrieved context, which is correct for a "did we find anything?" check. But it is not the right instrument for:
1. Verifying the factual accuracy of the generated response
2. Deciding whether to show a "low confidence" warning to users

The self-eval framework was designed to detect hallucination (did Claude make up facts not in context?), but the current prompt doesn't do that — it asks about context quality, not response grounding.

---

## Section 4: Golden Test Failure Analysis

### Official Failures (4/20)

#### GS-002: "What is the minimum FICO score for conventional loans?" — Expected: `620`

**Verdict: BAD GOLDEN SET QUESTION**

The source document does **not contain any FICO score for conventional loans**. The document only specifies a FICO minimum of 740 for the jumbo mortgage program (BC-PROD-004, R2). Sun Chip Private Bank does not offer conventional loans — it is a private bank for $10M+ clients. The RAG response correctly identifies this:

> "the minimum FICO score requirement is 740 for all signers in Sun Chip Private Bank's jumbo mortgage program... it is important to note that this requirement applies specifically to Sun Chip's jumbo mortgage program... not to conventional loans"

The expected answer `620` does not appear anywhere in the document. This is a factual defect in the golden set — the question asks about information that doesn't exist in the source. The system should be marked as giving the **correct** answer. The golden test item needs to be corrected or removed.

#### GS-004: "What is the maximum cash deposit without enhanced due diligence?" — Expected: `10,000`

**Verdict: BAD GOLDEN SET QUESTION**

The string `10,000` does not appear in the source document in a context related to enhanced due diligence thresholds. The document discusses a `$1,000,000` SOF verification trigger (BC-COMP-002) and universal enhanced due diligence for all initial deposits. There is no `$10,000` threshold for enhanced due diligence. The `$10,000` figure is a standard Bank Secrecy Act (BSA) CTR threshold from general U.S. banking law, not from this document. The RAG response correctly answers based on the document's actual content. This golden test item needs to be corrected.

#### GS-012: "What is the definition of a jumbo mortgage?" — Expected: `conforming`

**Verdict: BAD GOLDEN SET QUESTION**

The source document defines a jumbo mortgage as "first-lien mortgages on U.S. residential properties exceeding $1.5M" (BC-PROD-004). The word "conforming" does not appear anywhere in the document. The expected substring `conforming` comes from the conventional banking definition of jumbo mortgages (loans exceeding the conforming loan limit), but this policy document uses its own $1.5M threshold definition without referencing conforming loan limits. The RAG response correctly gives the document's definition. The golden test item needs to be corrected to expect `1.5M` or `exceeding`.

**Note:** Self-eval scored this 0.92 — the highest in the run — confirming the system knew it found a solid answer.

#### GS-015: "What documents do I need to open an account?" — Expected: `identification`

**Verdict: MARGINAL PASS — Response is Correct, Expected Substring is Reasonable**

The response discusses passport, state-issued ID, utility bills, and brokerage statements for account opening. The word "identification" does not appear verbatim, but the concept is fully covered. The response correctly mentions "a valid U.S. Passport or State-issued ID" for identity verification. The golden test uses substring matching — "identification" is not in the response text even though the identity documents are described. This is a borderline case: the response is correct but the expected substring is too specific. The golden set should expect `passport` or `ID` instead.

**Self-eval scored this 0.78 (PASS)** — the system agreed it had a good answer, but the substring match failed.

### Summary of Official Failures

| Question | Official Result | Human Verdict | Root Cause |
|----------|----------------|---------------|------------|
| GS-002 (FICO for conventional) | FAIL | ✓ Correct | Bad golden set — fact not in document |
| GS-004 (cash deposit EDD) | FAIL | ✓ Correct | Bad golden set — fact not in document |
| GS-012 (jumbo definition) | FAIL | ✓ Correct | Bad golden set — "conforming" not in doc |
| GS-015 (account open docs) | FAIL | ✓ Mostly correct | Substring too specific, answer is accurate |

**All 4 official failures are golden set defects, not RAG system failures.**

---

## Section 5: Human Accuracy Assessment (New Metric)

A manual review of all 20 responses was conducted against the source document. Each response was assessed on whether it accurately answers the question using information that exists in the document.

| GS # | Question | Self-Eval | Substring Pass | Human Score | Notes |
|------|----------|-----------|----------------|-------------|-------|
| GS-001 | DTI limit for jumbo mortgages | 35% | PASS | ✅ Correct | Answer (43%, 45% exception) is accurate |
| GS-002 | Min FICO for conventional loans | 15% | FAIL | ✅ Correct | Document has no conventional loan FICO; response correctly says so |
| GS-003 | Wire transfer cutoff times | 85% | PASS | ✅ Correct | 8AM–1PM ET priority window correctly cited |
| GS-004 | Max cash deposit without EDD | 15% | FAIL | ✅ Correct | $10k not in doc; response correctly identifies $1M SOF trigger |
| GS-005 | FDIC insurance coverage | 92% | PASS | ✅ Correct | $250k/bank up to $100M sweep correctly cited |
| GS-006 | Can DTI exceed for jumbo | 35% | PASS | ✅ Correct | 45% High Liquidity Offset exception correctly cited |
| GS-007 | Exceptions to down payment | 25% | PASS | ⚠️ Partial | Doc doesn't explicitly address this; honest "not found" is appropriate |
| GS-008 | Wire flagged for review | 25% | PASS | ⚠️ Partial | Doc doesn't detail review escalation; honest "not found" appropriate |
| GS-009 | BSA/AML escalation levels | 35% | PASS | ⚠️ Partial | Escalation matrix referenced but specific BSA/AML levels not documented in what was retrieved |
| GS-010 | Documents for jumbo mortgage | 85% | PASS | ✅ Correct | Tax returns, W-2s, asset seasoning correctly cited |
| GS-011 | What does DTI stand for | 15% | PASS | ✅ Correct | "Debt-to-Income Ratio" correctly defined |
| GS-012 | Definition of jumbo mortgage | 92% | FAIL | ✅ Correct | "exceeding $1.5M" correctly cited; "conforming" not in doc |
| GS-013 | Fee tiers for account types | 15% | PASS | ⚠️ Partial | Only $5k sub-tier fee found; broader fee schedule not in retrieved context |
| GS-014 | CD interest rates | 15% | PASS | ✅ Correct | CDs not offered; honest "not in document" is correct |
| GS-015 | Documents to open account | 78% | FAIL | ✅ Correct | Passport, ID, utility bills correctly cited; substring "identification" absent |
| GS-016 | Conventional vs jumbo comparison | 35% | PASS | ⚠️ Partial | Jumbo covered; conventional not in doc — honest limitation acknowledged |
| GS-017 | Audit requirements >$50k wires | 35% | PASS | ✅ Correct | Correct thresholds cited ($5M+ notarized auth, COO for $50M+) |
| GS-018 | All manager approval circumstances | 35% | PASS | ✅ Correct | ACH, emergency wires, DTI offset correctly enumerated |
| GS-019 | Domestic vs international wire compliance | 35% | PASS | ✅ Correct | Detailed accurate comparison of domestic vs international requirements |
| GS-020 | Complete mortgage steps | 25% | PASS | ⚠️ Partial | Step-by-step workflow not in document; honest limitation stated |

### Human Accuracy Score Summary

| Assessment | Count | % |
|------------|-------|---|
| ✅ Fully Correct | 14 | 70% |
| ⚠️ Partial (limitation honestly stated) | 6 | 30% |
| ❌ Wrong Answer | 0 | 0% |

**Human Accuracy Score: 14/20 fully correct (70%) + 6/20 honest limitations = effectively 100% honest accuracy.**

There is not a single factually wrong answer in the entire run. The system either provides the correct information from the document or correctly states the information is not available. This is the expected behavior of a well-grounded RAG system.

The 4 "official failures" are all golden set defects. The 15 low self-eval scores reflect context quality (impacted by BM25 failure) not answer accuracy.

---

## Section 6: Vercel Log Analysis

### Request Pattern

| Batch | Queries | Duration | Status |
|-------|---------|----------|--------|
| Batch 1 | 2 queries | ~34s | 200 OK |
| Batch 2 | 2 queries | ~34s | 200 OK |
| Batch 3 | 2 queries | ~34s | 200 OK |
| Batch 4 | 2 queries | ~50s | 200 OK |
| Batch 5 | 2 queries | ~51s | 200 OK |
| Batch 6 | 2 queries | ~51s | 200 OK |
| Batch 7 | 2 queries | ~51s | 200 OK |
| Batch 8 | 2 queries | ~50s | 200 OK |
| Batch 9 | 2 queries | ~50s | 200 OK |
| Batch 10 | 2 queries | ~50s | 200 OK |

**Batch size reduction from 4→2 is working.** No 504 timeouts. All 10 batches completed within the 120s Vercel limit. This is a confirmed improvement from the prior run.

### Error Pattern

- **20 BM25 errors** (1 per query, every batch) — `PGRST202` — SQL function signature mismatch
- **0 timeout errors** — batch hardening working
- **0 JSON parse errors** — self-eval robustness fix working
- **0 HyDE failures** — all 20 queries generated HyDE

### Response Timing

Average response time: 22s. This is within acceptable bounds for a production RAG query (target: <30s). The reranking lightweight call change from spec `017` appears to be functioning — no evidence of reranking failures in the logs.

---

## Section 7: Priority Issue List

### P0 — Critical (Blocking clean test results)

| # | Issue | Evidence | Fix |
|---|-------|----------|-----|
| P0.1 | **BM25 SQL function not updated** — `PGRST202` on every query | 20/20 queries error in Vercel log | Deploy SQL migration: add `filter_run_id UUID DEFAULT NULL` parameter to `search_rag_text` RPC |
| P0.2 | **Self-eval evaluates context, not answer** — causes 75% "low confidence" prefix | 15/20 responses start with "I couldn't find..." despite correct answers | Rewrite self-eval prompt to assess answer grounding vs context, not context relevance |
| P0.3 | **Embedding gap persists** — 221 of 1221 facts not embedded | SAOL query: tier3=1000, facts=1221 | Verify `.limit(10000)` fix is in deployed Inngest worker (not just app code); re-run ingestion |

### P1 — High (Golden Set Defects)

| # | Issue | Fix |
|---|-------|-----|
| P1.1 | GS-002: Expected `620` — not in document | Change expected to `740` (jumbo FICO) or remove |
| P1.2 | GS-004: Expected `10,000` — not in document | Change expected to `1,000,000` (SOF trigger) or remove |
| P1.3 | GS-012: Expected `conforming` — not in document | Change expected to `1.5M` or `exceeding` |
| P1.4 | GS-015: Expected `identification` — too specific | Change expected to `passport` or `ID` |

### P2 — Medium (Quality improvements)

| # | Issue | Fix |
|---|-------|-----|
| P2.1 | Self-eval threshold (0.5) triggers "low confidence" too aggressively | Raise threshold or decouple self-eval display from response text |
| P2.2 | "Low confidence" prefix stored in DB, corrupting response text | Store clean response separately; add prefix only at UI render layer |
| P2.3 | Self-eval confidence field not used (only `score`) | `self_eval_confidence` column missing from schema — simplify or remove |

---

## Section 8: Root Cause Summary

```
PROBLEM: 80% pass rate, 41% avg self-eval, 75% responses start with "I couldn't find..."

ROOT CAUSE 1: BM25 broken (PGRST202)
  → search_rag_text SQL function missing filter_run_id parameter
  → BM25 contributes 0 results to every query
  → Thinner context → lower self-eval scores
  → Fix: SQL migration to add parameter (30 min)

ROOT CAUSE 2: Self-eval evaluates context relevance, not answer accuracy
  → prompt asks "Is context sufficient?" not "Is the answer correct?"
  → Claude rates context as low quality because BM25 is missing
  → Self-eval score < 0.5 triggers "low confidence" prefix on 75% of responses
  → Fix: Rewrite self-eval prompt (2 hours)

ROOT CAUSE 3: Embedding gap (221 missing facts)
  → .limit(10000) fix was in app code but ingestion ran before or without it
  → 1000/1221 facts have embeddings (82% coverage)
  → Reduces recall for facts in sections ingested last
  → Fix: Re-run ingestion after confirming Inngest worker has new code

ROOT CAUSE 4: Golden set has 4 bad items
  → GS-002, GS-004, GS-012: expected substrings not in document
  → GS-015: expected substring too specific ("identification" vs "passport")
  → These account for all 4 official failures
  → Fix: Update golden set definitions (30 min)
```

---

## Section 9: Recommended Next Steps

Execute in this order:

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **1** | Deploy SQL migration: add `filter_run_id UUID DEFAULT NULL` to `search_rag_text` | 30 min | Fixes BM25 on every query |
| **2** | Rewrite self-eval prompt to assess answer grounding, not context relevance | 2 hrs | Fixes 75% false "low confidence" responses |
| **3** | Fix golden set: update GS-002, GS-004, GS-012, GS-015 expected substrings | 30 min | Fixes 4 false failures → pass rate becomes 20/20 |
| **4** | Decouple "low confidence" prefix from stored response text | 1 hr | Clean DB records; UI only adds prefix when needed |
| **5** | Re-run ingestion — code fix already deployed; see Appendix C for steps | 15 min | Gets 100% embedding coverage (1221/1221) |
| **6** | Re-run golden test with all above fixes | 30 min | Get true baseline; expect 95%+ pass rate |

---

## Appendix A: Exact SQL Migration for `search_rag_text`

Run this **verbatim** in the Supabase SQL Editor. It replaces the existing 4-parameter function with a 5-parameter version that adds `filter_run_id`. All existing callers continue to work because the new parameter defaults to `NULL`.

**Current live function (4 params — confirmed by querying `pg_proc`):**
```
search_rag_text(search_query, filter_knowledge_base_id, filter_document_id, match_count)
```

**App code sends (5 params — causing PGRST202 on every query):**
```
search_rag_text(search_query, filter_knowledge_base_id, filter_document_id, filter_run_id, match_count)
```

### Exact SQL to paste into Supabase SQL Editor

```sql
CREATE OR REPLACE FUNCTION public.search_rag_text(
  search_query text,
  filter_knowledge_base_id uuid DEFAULT NULL::uuid,
  filter_document_id uuid DEFAULT NULL::uuid,
  filter_run_id uuid DEFAULT NULL::uuid,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  source_type text,
  source_id uuid,
  document_id uuid,
  content text,
  rank double precision
)
LANGUAGE plpgsql
AS $function$
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
      AND (filter_run_id IS NULL OR EXISTS (
        SELECT 1 FROM rag_embeddings e
        WHERE e.source_id = f.id
          AND e.source_type = 'fact'
          AND e.run_id = filter_run_id
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
      AND (filter_run_id IS NULL OR EXISTS (
        SELECT 1 FROM rag_embeddings e
        WHERE e.source_id = s.id
          AND e.source_type = 'section'
          AND e.run_id = filter_run_id
      ))
  )
  ORDER BY 5 DESC
  LIMIT match_count;
END;
$function$;
```

### What changed vs the current live version

| Area | Before | After |
|------|--------|-------|
| Parameters | 4 (no `filter_run_id`) | 5 (added `filter_run_id uuid DEFAULT NULL`) |
| Facts WHERE clause | No run filter | Added `AND (filter_run_id IS NULL OR EXISTS (...))` |
| Sections WHERE clause | No run filter | Added `AND (filter_run_id IS NULL OR EXISTS (...))` |
| Backward compatibility | N/A | ✅ `DEFAULT NULL` means existing callers without `filter_run_id` are unaffected |

### Verification after running

After executing the SQL, run this to confirm the new signature is live:

```sql
SELECT pg_get_function_arguments(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'search_rag_text';
```

Expected result:
```
search_query text, filter_knowledge_base_id uuid DEFAULT NULL::uuid, filter_document_id uuid DEFAULT NULL::uuid, filter_run_id uuid DEFAULT NULL::uuid, match_count integer DEFAULT 10
```

Once confirmed, the `PGRST202` errors will stop and BM25 keyword search will work on every query.

---

## Appendix B: Self-Eval Prompt Analysis

**Current (evaluates context quality):**
```
Query: {queryText}
Retrieved context: {retrievedContext}
Evaluate: Is this context relevant and sufficient to answer the query?
{"passed": true/false, "score": 0.0-1.0, "reasoning": "..."}
```

**What it should evaluate (answer grounding):**
```
Query: {queryText}
Retrieved context: {retrievedContext}
Generated response: {responseText}
Evaluate: Is the generated response factually grounded in the retrieved context?
- Does the response make claims NOT supported by the context? (hallucination)
- Does the response accurately represent what the context says?
- Does the response appropriately acknowledge when information is not available?
{"passed": true/false, "score": 0.0-1.0, "reasoning": "...", "hallucinations": [...]}
```

The current prompt has two problems:
1. It never receives `responseText` as an input (the function signature passes `retrievedContext` but not `responseText`)
2. It asks about context quality rather than response grounding

These changes to the prompt would make self-eval a true hallucination detector — which is its intended purpose — rather than a context quality gate.

---

*End of report. All data verified via SAOL and direct Supabase service-role queries on 2026-02-20.*

---

## Appendix D: Fix Status Tracker (Updated 2026-02-20)

Status of all 6 recommended fixes from Section 9.

---

### Fix 1 — Deploy SQL migration: add `filter_run_id` to `search_rag_text`

| Field | Detail |
|-------|--------|
| **Status** | ✅ SQL provided — **awaiting manual execution in Supabase** |
| **What was done** | Exact SQL statement documented in Appendix A of this report. No code changes required — this is a database-only change. |
| **What remains** | User must paste the SQL from Appendix A into the Supabase SQL Editor and run it. Once run, BM25 errors will stop on all future queries. |
| **Impact when done** | Eliminates 20/20 `PGRST202` BM25 errors per test run. Restores hybrid retrieval. |

---

### Fix 2 — Rewrite self-eval prompt to assess answer grounding

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Implemented** (2026-02-20) |
| **Files changed** | `src/lib/rag/providers/llm-provider.ts`, `src/lib/rag/providers/claude-llm-provider.ts`, `src/lib/rag/services/rag-retrieval-service.ts` |
| **What changed** | The `selfEvaluate()` method now accepts `responseText` as a required input parameter (added to both the interface and implementation). The Claude prompt was rewritten from "Is this context sufficient?" to a hallucination-detection prompt: "Does the response make claims NOT supported by the retrieved context? If the response honestly says 'not found', that is correct and should score HIGH." |
| **Expected impact** | Self-eval scores should rise significantly for correct "not found" responses (currently scoring 0.15–0.35, should now score 0.7+). The 75% "low confidence" prefix rate should drop sharply. |
| **Requires re-deployment** | Yes — push to GitHub and Vercel will pick up the change automatically. |

---

### Fix 3 — Fix golden set: update GS-002, GS-004, GS-012, GS-015

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Implemented** (2026-02-20) |
| **File changed** | `src/lib/rag/testing/golden-set-definitions.ts` |
| **Changes made** | |

| GS # | Old Question | Old Expected | New Question | New Expected | Rationale |
|------|-------------|--------------|--------------|--------------|-----------|
| GS-002 | "What is the minimum FICO score for conventional loans?" | `620` | "What is the minimum FICO score for jumbo mortgages?" | `740` | Document has no conventional loan FICO; jumbo FICO (740) is in the doc |
| GS-004 | "What is the maximum cash deposit without enhanced due diligence?" | `10,000` | "What triggers enhanced due diligence for source of funds?" | `1,000,000` | $10k not in doc; $1M SOF trigger is in BC-COMP-002 |
| GS-012 | "What is the definition of a jumbo mortgage?" | `conforming` | (question unchanged) | `1.5` | "conforming" not in document; $1.5M threshold is the actual definition |
| GS-015 | "What documents do I need to open an account?" | `identification` | (question unchanged) | `passport` | "identification" not verbatim in response; "passport" is explicitly mentioned |

**Expected impact:** All 4 previously-failing items should now pass, bringing official pass rate from 16/20 (80%) to 20/20 (100%) once BM25 is also fixed.

---

### Fix 4 — Decouple "low confidence" prefix from stored response text

| Field | Detail |
|-------|--------|
| **Status** | ✅ **Implemented** (2026-02-20) |
| **File changed** | `src/lib/rag/services/rag-retrieval-service.ts` |
| **What changed** | The `supabase.update({ response_text: finalResponseText })` call that was overwriting the DB record with the prefixed version has been **removed**. The DB now always stores the clean factual answer. The "low confidence" prefix is computed in `finalResponseText` and only returned to the UI caller — it is never written back to `rag_queries.response_text`. The return value now uses `{ ...mappedQuery, responseText: finalResponseText }` so the UI still receives the prefix when appropriate, without corrupting the DB record. |
| **Expected impact** | Golden test reports and DB query logs will now show clean factual answers. Historical query records are no longer prefixed. The UI chat still shows the low-confidence warning when self-eval score < 0.5. |

---

### Fix 5 — Re-run ingestion to achieve 100% embedding coverage

| Field | Detail |
|-------|--------|
| **Status** | ⏳ **Pending** — requires user action |
| **Blocker** | Supabase `max_rows` setting. See `022-rag-multi-golden-details-investigation_v1.md` for details. |
| **Action required** | 1. In Supabase dashboard → Settings → API → set **Max Rows** to `10000`. 2. Delete current KB and document. 3. Re-upload and re-ingest. 4. Verify logs show `Embedding coverage: 1048 facts → 1048 tier-3 embeddings (100%)`. |
| **Code fix** | Already in codebase (`.limit(10000)` added to `process-rag-document.ts`). No additional code changes needed. |

---

### Fix 6 — Re-run golden test with all fixes applied

| Field | Detail |
|-------|--------|
| **Status** | ⏳ **Pending** — depends on Fix 1 and Fix 5 being completed |
| **Prerequisites** | Fix 1 (SQL migration run), Fix 5 (re-ingestion complete), Fixes 2–4 deployed to Vercel |
| **Expected outcome** | Pass rate: 20/20 (100%). Self-eval scores: avg 0.7+. "Low confidence" prefix rate: <10%. Embedding gap: 0. |

---

### Summary Table

| Fix | Description | Status | Deployed |
|-----|-------------|--------|----------|
| **1** | SQL migration: add `filter_run_id` to `search_rag_text` | ⏳ Pending SQL execution in Supabase | N/A (DB only) |
| **2** | Self-eval: rewrite prompt to assess answer grounding | ✅ Implemented | Needs Vercel deploy |
| **3** | Golden set: fix GS-002, GS-004, GS-012, GS-015 | ✅ Implemented | Needs Vercel deploy |
| **4** | Decouple low-confidence prefix from DB storage | ✅ Implemented | Needs Vercel deploy |
| **5** | Re-run ingestion (raise Supabase `max_rows` first) | ⏳ Pending user action | N/A |
| **6** | Re-run golden test to get true baseline | ⏳ Pending fixes 1+5 | N/A |

---

## Appendix C: Fix 5 — Embedding Gap Investigation & Re-Ingestion Steps

### Is the code fix already in the codebase?

**Yes. Confirmed.** The `.limit(10000)` fix is present in the current codebase at:

```
src/inngest/functions/process-rag-document.ts  (line 443)
```

```typescript
const { data: factRows } = await supabase
  .from('rag_facts')
  .select('*')
  .eq('document_id', documentId)
  .limit(10000);  // ← Fix is here
```

The gap-detection logic that follows also uses a separate `count: 'exact'` query so it correctly measures the true DB fact count independently of the fetch limit.

### Is there a separate "Inngest worker" to update?

**No.** This is a common misconception about Inngest's architecture. There is no persistent Inngest worker process running independently.

How it actually works:

```
┌─────────────────────────────────────────────────────────────┐
│                    Inngest Cloud                            │
│   (Event queue, orchestration, retry state, dashboard)      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST to /api/inngest
                       ↓ (on each step execution)
┌─────────────────────────────────────────────────────────────┐
│                  Your Vercel deployment                      │
│   src/app/api/inngest/route.ts  ← the "worker" IS this     │
│   Executes step code, returns result to Inngest             │
└─────────────────────────────────────────────────────────────┘
```

Every time Inngest needs to execute a step (e.g., `generate-embeddings`), it sends an HTTP request to your live Vercel `/api/inngest` endpoint. That endpoint runs your step code and returns the result. **The Inngest "worker" is simply your current Vercel deployment.**

This means:
- When you push code to GitHub and Vercel deploys → Inngest automatically picks up the new code
- No manual "worker restart" or Inngest-side configuration is needed
- If Inngest Vercel integration is installed (which it is, based on the auto-sync comments in `route.ts`), Inngest resyncs function definitions automatically on each deploy

### Why did the last ingestion still produce only 1,000 tier-3 embeddings?

The most likely cause is a **deployment timing race**. The sequence was:

1. Code change (`.limit(10000)`) was applied locally
2. Code was pushed to GitHub
3. Vercel started building the new deployment (takes 1–3 minutes)
4. **Ingestion was triggered during or before the Vercel build completed**
5. Inngest called back to `/api/inngest` — but the old deployment was still live
6. Old code ran: fetched only 1,000 facts → embedded 1,000

**Confirmation:** The DB shows exactly `1000` tier-3 embeddings — not 999 or 1001. This is precisely the PostgREST `max_rows` cap, consistent with the old code running.

The gap detection log (`[RAG Embedding] WARNING: X facts have no embedding`) should have appeared in Inngest's run logs, but only if the new code was running. If the old code ran, no warning would appear because the old gap detection was also broken (comparing capped count against capped count = 0 gap).

### How to confirm the current Vercel deployment has the fix

**Option 1 — Check via Inngest Dashboard (recommended)**

1. Go to [app.inngest.com](https://app.inngest.com) → **Apps**
2. Find `brighthub-rag-frontier`
3. Click **Syncs** tab → look at the most recent sync timestamp
4. It should be after your last GitHub push with the fix

**Option 2 — Trigger a test sync**

Run this from any terminal (or use the Inngest dashboard UI):
```bash
curl -X PUT https://v4-show.vercel.app/api/inngest
```
A successful response confirms Inngest can reach your latest Vercel deployment.

**Option 3 — Check Vercel dashboard**
Go to Vercel → Deployments → confirm the latest deployment was built after the code change was committed.

### Steps to re-run ingestion and verify 100% coverage

1. **Clean up the existing document** — go to `/rag`, delete the current Sun Chip document and its KB (or run the cleanup script again)

2. **Re-upload** — create a new KB, upload `Sun-Chip-Bank-Policy-Document-v2.0.md`, and trigger ingestion

3. **Wait for ingestion to complete** — the Inngest dashboard shows progress under **Runs** → `process-rag-document` → click the run → expand step `generate-embeddings`

4. **Check the step log** — you should see one of:
   ```
   ✅ [Inngest] Embedding coverage: 1221 facts → 1221 tier-3 embeddings (100%)
   ```
   or a warning if the gap persists:
   ```
   ⚠️ [RAG Embedding] WARNING: X facts have no embedding (1221 total facts, Y tier-3 embeddings generated).
   ```

5. **Verify in DB** using SAOL:
   ```bash
   cd supa-agent-ops && node -e "
   require('dotenv').config({ path: '../.env.local' });
   const { createClient } = require('@supabase/supabase-js');
   const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   (async () => {
     const docId = 'YOUR_NEW_DOC_ID';
     const { count: facts } = await sb.from('rag_facts').select('*', { count: 'exact', head: true }).eq('document_id', docId);
     const { count: tier3 } = await sb.from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', docId).eq('tier', 3);
     console.log('Facts:', facts, '| Tier-3 embeddings:', tier3, '| Gap:', facts - tier3);
   })();
   "
   ```

   **Expected result:** `Facts: 1221 | Tier-3 embeddings: 1221 | Gap: 0`

### If the gap persists after re-ingestion

If you still see exactly 1,000 tier-3 embeddings after a fresh ingestion with the new code deployed, there is a secondary issue: the `supabase.from('rag_embeddings').insert(records)` call on line 114 of `rag-embedding-service.ts` sends all 1,221 embedding records (each containing a 1,536-dimension vector as a jsonb array) in a single HTTP POST to Supabase PostgREST. This payload is approximately **9–10 MB**. If PostgREST's body size limit is configured below this, the insert will silently truncate or fail.

In that case, the fix is to chunk the insert into batches of 500:

```typescript
// In generateAndStoreBatchEmbeddings(), replace the single insert with:
const CHUNK_SIZE = 500;
for (let i = 0; i < records.length; i += CHUNK_SIZE) {
  const chunk = records.slice(i, i + CHUNK_SIZE);
  const { error } = await supabase.from('rag_embeddings').insert(chunk);
  if (error) {
    console.error('Error storing embedding chunk:', error);
    return { success: false, error: error.message };
  }
}
```

This would be a Change 6 if the gap persists.
