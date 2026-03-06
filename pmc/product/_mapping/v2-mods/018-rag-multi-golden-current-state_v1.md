# 018 — RAG Module Current State Analysis

---

| Field | Value |
|-------|-------|
| **Date** | 2026-02-19 |
| **Author** | Claude Opus 4.6 (Agent) |
| **Based on** | Golden Test Report (golden-rag-test-03.md), Vercel Log (vercel-log-31.csv), SAOL database query, Source document (Sun-Chip-Bank-Policy-Document-v2.0.md), Codebase inspection |
| **Test Run ID** | `b1eaa397-985b-4701-9eb7-de9709949156` |
| **Embedding Run ID** | `07ed97b4-50b2-49d3-bc9e-ade27165aa4f` |
| **Document** | Sun-Chip-Bank-Policy-Document-v2.0.md |

---

## Executive Summary

The RAG module is functionally working. The clean-run golden test passed at **90% (18/20)**, exceeding the 85% target. Data is isolated: one clean KB, one document, one embedding run — the hardening changes from spec 017 are in effect.

However, four significant issues were identified during this analysis:

| # | Severity | Issue |
|---|----------|-------|
| 1 | 🔴 Critical | BM25 text search is silently broken on every query — the `search_rag_text` SQL function was never updated to accept `filter_run_id` |
| 2 | 🔴 Critical | Self-evaluation gives low scores to factually correct responses, then degrades the response in live chat — the evaluator measures context noise, not answer quality |
| 3 | 🟡 Medium | Two golden test failures are golden set defects, not RAG defects — invalid test questions |
| 4 | 🟡 Medium | Embedding gap persists: 131/1131 facts (11.6%) have no tier-3 embedding |

---

## 1. Data State (SAOL Verification)

Queried via SAOL at 2026-02-19T22:29Z. State is clean and isolated.

### Database Counts

| Table | Count | Notes |
|-------|-------|-------|
| `rag_knowledge_bases` | **1** | Single clean KB ("Sun Chip Policy Doc #25") |
| `rag_documents` | **1** | Sun-Chip-Bank-Policy-Document-v2.0.md |
| `rag_embedding_runs` | **1** | Run `07ed97b4`, completed 2026-02-19T21:40 |
| `rag_embeddings` | **1,030** | Tier-1: 1, Tier-2: 29, Tier-3: 1,000 |
| `rag_sections` | **29** | Matches tier-2 embedding count ✓ |
| `rag_facts` | **1,131** | Document metadata says 1,131 ✓ |
| `rag_queries` | **20** | Exactly the 20 golden test queries |
| `rag_quality_scores` | **0** | No quality scoring run yet |
| `rag_test_reports` | **0** | ⚠️ The golden test run was NOT persisted to DB |

### Embedding Gap

```
Facts:               1,131
Tier-3 embeddings:   1,000
Gap:                   131 facts (11.6%) with no embedding
```

This represents a partial fix from Change 7. The previous gap was 226/1,226 (18.4%). The gap is smaller but not eliminated. Later-pass facts from passes 4–6 are likely still being missed.

> **Note:** The golden test preflight reported "970 tier-3 embeddings" but SAOL SQL count shows 1,000. The preflight query likely hit a row limit.

### Test Report Not Saved

`rag_test_reports` has 0 rows. The golden test run from `b1eaa397` was not persisted to the database. The report was only generated as a markdown file in the UI. This is acceptable for now but means historical comparison from the DB is unavailable.
**James Note** This is working. Once I hit the "Save" button it creates a entry in `rag_test_reports`

---

## 2. Golden Test Results

### Summary

| Metric | Value | Status |
|--------|-------|--------|
| Pass Rate | **90%** (18/20) | ✅ PASS (target ≥85%) |
| Avg Self-Eval Score | **31%** | ⚠️ Misleading — see Section 4 |
| Avg Response Time | **22s** | ✅ No timeouts |
| Duration | **454 seconds** | ✅ All 10 batches completed |
| Errored | **0** | ✅ No infrastructure failures |

### Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| Easy | 4 | 5 | 80% |
| Medium | 8 | 9 | 89% |
| Hard | 6 | 6 | 100% |

Hard questions scoring 100% demonstrates the hybrid retrieval + cross-section synthesis capability is working well for complex, multi-part questions.

---

## 3. The Two Failures: Root Cause Analysis

Both failures are **golden set defects** — the expected substring is not present in the source document. They are not RAG retrieval failures.

### GS-002: FAIL — "What is the minimum FICO score for conventional loans?" (expected: `620`)

**Root cause: Invalid test question for this document.**

The Sun Chip Private Bank document is exclusively about institutional private banking for ultra-high-net-worth clients ($10M+ minimum). It has **no conventional loan program**. The FICO 620 threshold is a generic industry standard for conventional mortgage lending (e.g., Fannie Mae guidelines) — it is nowhere in this document.

The document does have one FICO requirement: **740 minimum** for its Jumbo Mortgage Program (BC-PROD-004, R2). The RAG system correctly answered this:

> *"The provided context does not contain information about minimum FICO score requirements for conventional loans... The document is specifically focused on Sun Chip Private Bank's institutional sovereign banking program... While the context includes references to FICO score requirements (740 minimum per signer) in relation to the Jumbo Mortgage Program..."*

**This response is factually correct and complete.** The system accurately identified that the document does not cover conventional loans, cited the relevant FICO threshold it does contain, and explained why. The test is wrong — GS-002 should be fixed or removed.

**Fix:** Change expected substring to `740` or delete the question.

---

### GS-012: FAIL — "What is the definition of a jumbo mortgage?" (expected: `conforming`)

**Root cause: Expected substring not in source document.**

The standard industry definition of a jumbo mortgage refers to loans "above the conforming loan limit" set by FHFA/Fannie Mae. However, Sun Chip's policy document defines jumbo mortgages in its own terms:

> *"First-lien mortgages on U.S. residential properties exceeding $1.5M"* — BC-PROD-004 Scope

The word "conforming" does not appear in this document. The RAG response was accurate and complete:

> *"A jumbo mortgage at Sun Chip Private Bank is defined as [Section: BC-PROD-004] a first-lien mortgage on U.S. residential properties exceeding $1.5M, designed to facilitate the purchase of high-value primary residences..."*

**This response is factually correct for this document.** The test expectation is derived from generic industry definition, not document content.

**Fix:** Change expected substring to `1.5M` or `1,500,000`.

---

## 4. 🔴 Critical Finding: BM25 Text Search is Completely Broken

**Every single query in this run silently failed its BM25 text search path.**

### The Error (from vercel-log-31.csv)

This error appeared on **all 20 queries**:

```
[RAG Embedding] Error in text search: {
  code: 'PGRST202',
  details: 'Searched for the function public.search_rag_text with parameters 
    filter_document_id, filter_knowledge_base_id, filter_run_id, match_count, 
    search_query or with a single unnamed json/jsonb parameter, but no matches 
    were found in the schema cache.',
  hint: 'Perhaps you meant to call the function 
    public.search_rag_text(filter_document_id, filter_knowledge_base_id, 
    match_count, search_query)',
```

### Root Cause

Change 3 (from spec 017) added a `filter_run_id` parameter to the TypeScript `searchTextContent()` function in `rag-embedding-service.ts`, and it now passes `filter_run_id` to the `search_rag_text` Postgres RPC call.

**However, the actual SQL function `search_rag_text` in the Supabase database was never updated to accept this new parameter.**

The database function still has the old signature:
```sql
search_rag_text(filter_document_id, filter_knowledge_base_id, match_count, search_query)
```

The application is calling it with:
```sql
search_rag_text(filter_document_id, filter_knowledge_base_id, filter_run_id, match_count, search_query)
```

Supabase's PostgREST can't find a matching overload → PGRST202 error → BM25 returns empty → hybrid retrieval silently falls back to vector-only.

### Impact

- BM25 keyword search (text matching) is returning **zero results** for every query
- All retrieval is pure vector search only — the hybrid path is non-functional
- The retrieval stats in the test report (e.g., "Facts retrieved: 20–40") reflect **vector-only** results
- Despite this, 90% pass rate was achieved — demonstrating strong vector search quality

### Why the System Didn't Crash

The `searchTextContent` function catches the PostgREST error gracefully and returns empty results, so retrieval continues with vector results only. The system degrades silently rather than failing hard.

### Fix Required

Apply a database migration to add `filter_run_id UUID DEFAULT NULL` to the `search_rag_text` function signature, and add the corresponding WHERE clause:

```sql
CREATE OR REPLACE FUNCTION search_rag_text(
  search_query TEXT,
  filter_knowledge_base_id UUID DEFAULT NULL,
  filter_document_id UUID DEFAULT NULL,
  filter_run_id UUID DEFAULT NULL,  -- ADD THIS
  match_count INT DEFAULT 10
)
RETURNS TABLE (...)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT f.*, ... 
    FROM rag_facts f
    WHERE
      ...existing filters...
      AND (filter_run_id IS NULL OR EXISTS (
        SELECT 1 FROM rag_embeddings e
        WHERE e.source_id = f.id
          AND e.source_type = 'fact'
          AND e.run_id = filter_run_id
      ))
    ...;
END;
$$;
```

This migration must be applied in Supabase SQL editor before the next test run.

---

## 5. 🔴 Critical Finding: Self-Evaluation is Measuring the Wrong Thing

### The Problem in One Sentence

The self-eval prompt evaluates **retrieved context quality** (is the context relevant?), but the system uses that score to **decide whether to show or replace the actual response** — so factually correct answers get replaced with "I couldn't find a confident answer" in live chat.

### Evidence from the Data

Self-eval scores from the 20 queries (from SAOL):

| Score | Count | self_eval_passed |
|-------|-------|-----------------|
| 0.05 | 2 queries (GS-002, GS-011) | false |
| 0.15 | 8 queries | false |
| 0.35 | 7 queries | false |
| 0.72 | 1 query (GS-017) | true |
| 0.85 | 2 queries (GS-003, GS-005) | true |

**Result: 17/20 queries return `self_eval_passed = false`**, yet 18/20 responses are factually correct and pass the golden test. The self-eval score is inversely correlated with correctness for ~85% of queries.

### The Self-Eval Prompt (Current Code)

```typescript
// rag-retrieval-service.ts → calls provider.selfEvaluate with:
result = await provider.selfEvaluate({
  queryText: params.queryText,
  retrievedContext: params.assembledContext,  // NOT the response text
});

// claude-llm-provider.ts → selfEvaluate:
system: 'Evaluate retrieval quality. Output valid JSON only.'
user: `Query: ${queryText}
Retrieved context:
${retrievedContext.slice(0, 5000)}
Evaluate: Is this context relevant and sufficient to answer the query?
{"passed": true/false, "score": 0.0-1.0, "reasoning": "..."}`
```

**Critical observations:**

1. **The response is not evaluated.** The `selfEvaluate` function receives `assembledContext` but NOT `responseText`. Claude is asked "is the context good?" — not "is the answer correct?"

2. **The context is too noisy to score well.** Each query assembles 20–40 facts and 10+ sections from across the document. For GS-011 "What does DTI stand for?" — the assembled context includes facts about wire transfers, FICO scores, FDIC insurance, etc. Claude correctly observes that most of this context is not relevant to the DTI acronym question, and scores it low.

3. **The threshold is wrong.** The code applies a `< 0.5` threshold to replace responses:
   ```typescript
   if (selfEval && selfEval.score < 0.5) {
     finalResponseText = `I couldn't find a confident answer to "${params.queryText}"...`
   }
   ```
   Since context assemblies routinely score 0.05–0.35 due to noise, **85% of live chat responses are being replaced** with the degraded "low confidence" message — even when the RAG answer is correct.

4. **Scores are discrete, not continuous.** The scoring clusters at `{0.05, 0.15, 0.35, 0.72, 0.85}`, suggesting Claude is making qualitative judgments rather than truly calibrated 0–1 scores. This makes threshold tuning unreliable.

### Why Golden Test Still Passed (Despite Low Self-Eval)

The golden test route calls `queryRAG` which returns `{ success: true, data: mapRowToQuery(queryRow) }` using the original `queryRow` from the initial INSERT — **before** the conditional update that replaces the response with the degraded message. So the golden test correctly evaluates the original RAG response. The chat UI, however, reads the response from the DB after the update, and shows the degraded version.

### Self-Eval Validation Against Document

For GS-001 ("What is the DTI limit for jumbo mortgages?"):
- **Self-eval score: 0.15 (FAIL)**
- **Actual response:** "The Debt-to-Income (DTI) limit for jumbo mortgages... is capped at 43% as the standard requirement. However, there is an exception... DTI expanded to 45% if they hold 60 or more months of PITI reserves"
- **Source document (BC-PROD-004, R4):** "Debt-to-Income (DTI) ratio is capped at 43%"
- **Verdict:** The response is perfectly correct. Self-eval of 15% is wrong.

For GS-011 ("What does DTI stand for?"):
- **Self-eval score: 0.05 (FAIL)**
- **Actual response:** "DTI stands for [Fact: Debt-to-Income]... the 'Ratio of total debt obligations to gross income'"
- **Source document (Glossary 1.3.1):** Not explicitly in glossary, but BC-PROD-004 defines "Debt-to-Income (DTI)"
- **Verdict:** The response is correct. Self-eval of 5% is nonsensical.

For GS-003 ("What are the wire transfer cutoff times?") — self-eval 85%:
- The context happened to be dominated by wire transfer facts, making the context tightly focused → high score

### The Self-Eval Design Problem

The current design conflates two different evaluation questions:
- **What the code asks:** "Is the retrieved context sufficient to answer the query?"
- **What it should ask:** "Does the generated response accurately answer the query based on the context?"

A context can be noisy but still contain the right answer. A response can be accurate even if only 2 of 30 retrieved facts were relevant. Measuring context purity doesn't measure answer quality.

### Fix Required: Rewrite Self-Eval Prompt

The self-eval should evaluate the **response**, not the context:

```typescript
// Pass responseText (currently ignored in selfEvaluate)
result = await provider.selfEvaluate({
  queryText: params.queryText,
  retrievedContext: params.assembledContext,
  responseText: params.responseText,  // ADD THIS
});

// New prompt:
system: 'Evaluate RAG response quality. Output valid JSON only.'
user: `Query: "${queryText}"

Response given:
${responseText}

Supporting context:
${retrievedContext.slice(0, 3000)}

Evaluate: Does the response accurately and completely answer the query using only information found in the supporting context?
Return: {"passed": true/false, "score": 0.0-1.0, "reasoning": "one sentence"}`
```

Additionally, remove or significantly raise the threshold that replaces responses with the "low confidence" message. A reasonable threshold to explore is 0.3 (only degrade if Claude explicitly says the response doesn't answer the query) or remove the auto-replacement entirely and use self-eval as a monitoring metric only.

---

## 6. Retrieval Performance Analysis

### Vector Search (Working)

Despite BM25 being broken, the vector search performed well across all queries. Facts and sections retrieved were generally relevant:

- GS-001 (DTI 43%): 23 facts, correct answer found ✓
- GS-003 (wire cutoffs): 27 facts, direct answer found ✓
- GS-005 (FDIC): 27 facts, correct $250,000 per bank found ✓
- GS-017 (wire audit): 35 facts, detailed answer found ✓
- GS-019 (domestic vs international wires): 31 facts, comprehensive comparison found ✓

The vector embeddings using `buildEnrichedEmbeddingText` (Change 6 from spec 017) appear to be providing good semantic recall.

### HyDE Performance

HyDE (Hypothetical Document Embeddings) was generated for all 20 queries ("HyDE generated: yes"). This is working correctly and contributing to retrieval quality.

### Retrieval Volume

Typical queries retrieved 20–40 facts and 10–12 sections. This is fairly large — the context window sent to self-eval contains a lot of off-topic material, which is the primary driver of the low self-eval scores.

Tuning the retrieval count (reducing from 20–40 facts to 10–15 focused facts) might improve both quality and self-eval scores simultaneously, but this is separate from fixing the self-eval measurement problem.

---

## 7. Embedding Gap Analysis

### Current State

```
Facts in document:       1,131
Tier-3 embeddings:       1,000
Gap:                       131 facts (11.6%)
```

### Progress vs. Prior State

| Run | Facts | Embeddings | Gap | Gap % |
|-----|-------|------------|-----|-------|
| Previous (pre-017) | 1,226 | 1,000 | 226 | 18.4% |
| Current (post-017) | 1,131 | 1,000 | 131 | 11.6% |

The gap reduced but didn't reach zero. Change 7 from spec 017 added gap detection logging but the root cause of later-pass facts not being embedded may not have been fully resolved.

**Note:** The embedding run's own metadata records `embedding_count: 1030` (= 1 + 29 + 1000 = 1030), confirming this count. So 1000 tier-3 embeddings is confirmed, and 131 facts are genuinely missing embeddings.

---

## 8. Positive Findings

1. **Clean data state confirmed** — single KB, single document, single embedding run, no cross-contamination ✓
2. **No timeouts** — all 10 batches completed, Change 8 (batch size reduction) worked ✓
3. **No JSON parse crashes** — Change 9 (self-eval fallback) prevented crashes ✓
4. **documentId isolation** — Changes 2 & 4 are working; no CANONICAL_DOCUMENT_ID fallbacks ✓
5. **Reranking fix** — Change 5 (lightweight LLM call) appears working; no parse failure logs ✓
6. **Hard questions 100%** — 6/6 cross-section synthesis questions passed, showing strong vector retrieval ✓
7. **90% pass rate** — exceeds 85% target even without BM25 ✓

---

## 9. Priority Fix List

Listed in order of impact:

### P0 — Database Migration: Fix `search_rag_text` Function

**Impact:** BM25 is completely broken for every query. Fixing this enables hybrid retrieval and likely improves scores for data-dense queries.

**Action:** Run a Supabase SQL migration to add `filter_run_id UUID DEFAULT NULL` to the `search_rag_text` function signature and add the corresponding EXISTS subquery filter. This is a pure SQL change — no TypeScript changes required.

---

### P0 — Fix Self-Evaluation: Evaluate Response, Not Context

**Impact:** 85% of live chat responses are being incorrectly replaced with "I couldn't find a confident answer" even when the RAG answer is factually correct. This is the most damaging active bug for real-world user experience.

**Two-part fix:**

**Part A — Rewrite self-eval prompt** to evaluate the response against the context (not the context alone). Pass `responseText` to `selfEvaluate`.

**Part B — Remove or gate the response-replacement logic** in `queryRAG`:
```typescript
// Current — replaces response for ANY score < 0.5 (too aggressive):
if (selfEval && selfEval.score < 0.5) {
  finalResponseText = `I couldn't find a confident answer...`
}

// Better — only replace if score is very low (< 0.2) AND passed=false:
if (selfEval && selfEval.score < 0.2 && !selfEval.passed) {
  finalResponseText = `I couldn't find a confident answer...`
}

// Or: Remove the replacement entirely and use self-eval as a monitoring metric only.
```

---

### P1 — Fix Two Golden Set Defects

**Impact:** Recover 2 failing test cases to reach 100% pass rate.

| Question ID | Fix |
|-------------|-----|
| GS-002 | Change `expectedAnswer` from `620` to `740` (jumbo FICO), OR delete the question (conventional loans aren't in this doc) |
| GS-012 | Change `expectedAnswer` from `conforming` to `1.5M` or `1,500,000` |

File: `src/lib/rag/testing/golden-set-definitions.ts`

---

### P2 — Investigate Embedding Gap (131 Missing Facts)

**Impact:** 11.6% of facts have no embedding. These facts are invisible to vector search. Fixing this may improve retrieval for topics that happen to have missing embeddings.

**Action:** Check the multi-pass Inngest pipeline to confirm embedding generation runs after pass 6. Specifically, add a log or audit query post-ingestion to confirm the gap is 0 after a fresh run.

---

## 10. Summary Table

| Finding | Type | Severity | Fix Complexity |
|---------|------|----------|----------------|
| BM25 broken (PGRST202 — `filter_run_id` not in SQL) | Bug | 🔴 Critical | Low — 1 SQL migration |
| Self-eval evaluates context, not response — degrades 85% of chat answers | Design flaw | 🔴 Critical | Medium — prompt rewrite + threshold change |
| GS-002 invalid (conventional loans not in doc) | Test defect | 🟡 Medium | Low — change one expectedAnswer string |
| GS-012 invalid ("conforming" not in doc) | Test defect | 🟡 Medium | Low — change one expectedAnswer string |
| Embedding gap: 131/1131 facts missing tier-3 embeddings | Bug | 🟡 Medium | Medium — pipeline investigation |
| `rag_test_reports` not being populated | Feature gap | 🟢 Low | Low — add DB insert in golden test route |

---

## Appendix A: Full Self-Eval Score Map

| Question ID | Question (abbreviated) | Actual Answer Quality | Self-Eval Score | Pass |
|-------------|------------------------|----------------------|-----------------|------|
| GS-001 | DTI limit for jumbo? | ✅ Correct (43%, 45% exception) | 0.15 | ❌ |
| GS-002 | Min FICO for conventional? | ✅ Correct (not in doc) | 0.05 | ❌ |
| GS-003 | Wire cutoff times? | ✅ Correct | 0.85 | ✅ |
| GS-004 | Max cash deposit without EDD? | ✅ Correct (not in doc as stated) | 0.15 | ❌ |
| GS-005 | FDIC coverage limit? | ✅ Correct ($250K per bank) | 0.85 | ✅ |
| GS-006 | Can DTI be exceeded? | ✅ Correct (45% with exception) | 0.15 | ❌ |
| GS-007 | Exceptions to down payment req? | ✅ Correct (none documented) | 0.15 | ❌ |
| GS-008 | Wire flagged for review? | ✅ Correct (escalation described) | 0.35 | ❌ |
| GS-009 | BSA/AML escalation levels? | ✅ Correct (compliance ref) | 0.35 | ❌ |
| GS-010 | Documents for jumbo mortgage? | ✅ Correct (tax returns etc.) | 0.35 | ❌ |
| GS-011 | What does DTI stand for? | ✅ Correct (Debt-to-Income) | 0.05 | ❌ |
| GS-012 | Definition of jumbo mortgage? | ✅ Correct for doc (no "conforming") | 0.35 | ❌ |
| GS-013 | Fee tiers for account types? | ✅ Correct ($5K/month sub-tier) | 0.15 | ❌ |
| GS-014 | CD interest rates? | ✅ Correct (not in doc) | 0.15 | ❌ |
| GS-015 | Documents to open account? | ✅ Correct (passport, utility bill) | 0.35 | ❌ |
| GS-016 | Compare conventional vs jumbo? | ✅ Correct (conventional not in doc) | 0.15 | ❌ |
| GS-017 | Wire audit req >$50K? | ✅ Correct (detailed audit fields) | 0.72 | ✅ |
| GS-018 | All circumstances for approval? | ✅ Correct (manager approval list) | 0.35 | ❌ |
| GS-019 | Domestic vs international wires? | ✅ Correct (near-prohibition) | 0.35 | ❌ |
| GS-020 | Complete mortgage process? | ✅ Correct (partial info in doc) | 0.15 | ❌ |

**Pattern:** The 3 queries with `self_eval_passed=true` (GS-003, GS-005, GS-017) are all queries where the retrieved context happened to be **dominated** by directly relevant wire/FDIC facts, making the context appear more focused to the evaluator. All other queries assembled a broad mix of document-wide facts, which the evaluator correctly identified as noisy — but incorrectly used to disqualify otherwise-correct responses.

---

*End of report.*
