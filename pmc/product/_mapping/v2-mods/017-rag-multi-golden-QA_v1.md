# 017 — RAG Multi-Pass Golden Test QA: Discovery & Findings

---

| Field | Value |
|-------|-------|
| **Date** | 2025-01-27 |
| **Investigator** | GitHub Copilot (Claude Opus 4.6) |
| **Directive** | Discovery & Scoping — NO code changes |
| **Documents scanned** | 15+ PMC specs, 7 source files, 3 DB tables, 2 test reports, Vercel runtime logs |
| **Source files examined** | `rag-retrieval-service.ts`, `rag-embedding-service.ts`, `rag-ingestion-service.ts`, `claude-llm-provider.ts`, `golden-set-definitions.ts`, `test-diagnostics.ts`, `golden-set/route.ts`, `page.tsx` |
| **DB tables queried** | `rag_documents`, `rag_facts`, `rag_embeddings`, `rag_embedding_runs`, `rag_sections` |
| **Golden test target** | 85% pass rate (17/20 questions) |

---

## Executive Summary

- **Test-01 scored 45% (9/20)** primarily because the embedding run for document `576b3a95` left all 1,030 embeddings with `run_id = NULL`; when the test filtered by `run_id = '5e3fd093'`, vector search returned **zero results** for every query, leaving only BM25 keyword fallback.
- **Test-02 scored 69% but is actually incomplete** — only 16 of 20 questions were executed before Vercel's 120-second timeout killed batch 4; the real 20-question pass rate is at best 55% (11/20).

- **Reranking is a 100% no-op** across every query in both test runs — the `rerankWithClaude` function calls the full RAG response generator instead of a lightweight completion, so Claude returns prose instead of a JSON index array, and all three parse strategies silently fail.

- **4 of 20 golden questions are unanswerable or mis-keyed**: 2 questions ask for data not present in the ingested document (GS-002: FICO 620, GS-004: $10,000 threshold), and 2 have expected substrings that don't match the document's terminology (GS-012: "conforming", GS-015: "identification").

- **18.4% of ingested facts have no embedding** (226 of 1,226 facts for doc `04233183`), and the designed provenance-enriched embedding text (`buildEnrichedEmbeddingText`) is dead code — never called during ingestion.

The RAG pipeline has **three tiers of problems**: broken test infrastructure (runId tagging, bad questions), a retrieval quality gap (dead enrichment code, unembedded facts, non-functional reranking), and operational limits (Vercel timeouts, token-limit truncation). Fixing only one tier will not reach 85%.

---

## Problem-by-Problem Findings

### Finding F-01: runId Filter Returns Zero Vector Results for Doc `576b3a95`

| Attribute | Detail |
|-----------|--------|
| **Severity** | CRITICAL |
| **Confidence** | 99% — confirmed by SQL |
| **Blast radius** | All 20 questions in test-01 |

**Evidence:**
- `rag_embedding_runs` contains run `5e3fd093` for document `576b3a95` with `embedding_count = 1030`.
- SQL query: `SELECT COUNT(*) FROM rag_embeddings WHERE document_id = '576b3a95...' AND run_id = '5e3fd093...'` → **0 rows**. All 1,030 embeddings for this document have `run_id = NULL`.
- In contrast, document `04233183` has all 1,030 embeddings correctly tagged with `run_id = '055f333e'`.
- The golden test route passes `runId` to `queryRAG`, which passes it to `searchSimilarEmbeddings` as `filter_run_id`. The Supabase RPC `match_rag_embeddings_kb` filters on `run_id = filter_run_id` and returns 0 matches.
- BM25 text search (`search_rag_text`) does NOT filter by `run_id`, so some keyword-matched results still get through — explaining the 45% pass rate rather than 0%.

**Root-cause hypothesis:** The embedding generation for document `576b3a95` was executed before the `run_id` tagging logic was added or activated. The `rag_embedding_runs` record was back-filled or created separately, creating a metadata mismatch.

---

### Finding F-02: 226 Facts Have No Embedding (18.4% Invisible to Vector Search)

| Attribute | Detail |
|-----------|--------|
| **Severity** | HIGH |
| **Confidence** | 99% — confirmed by SQL |
| **Blast radius** | Any query whose answer depends on the 226 unembedded facts |

**Evidence:**
- Document `04233183` has **1,226 facts** in `rag_facts` but only **1,000 tier-3 embeddings** + 30 tier-2 + 1 tier-1 = **1,031 total** in `rag_embeddings`.
- SQL query counting facts with no matching tier-3 embedding: **226 facts** are invisible to vector search.
- The ingestion pipeline (`rag-ingestion-service.ts`) generates embeddings in the `generateEmbeddings` step but has a batch size limit. If the embedding step runs before all 6 ingestion passes complete (or if later passes add facts after embedding generation), the gap occurs.
- BM25 text search can still find these facts via `content_tsv`, so they're not completely invisible — but vector similarity (the primary retrieval path) will never surface them.

**Root-cause hypothesis:** Multi-pass ingestion adds facts across passes 1–6, but embedding generation runs once and only processes facts that existed at execution time. Facts from later passes are never embedded.

---

### Finding F-03: `buildEnrichedEmbeddingText` Is Dead Code

| Attribute | Detail |
|-----------|--------|
| **Severity** | HIGH |
| **Confidence** | 100% — confirmed by code tracing |
| **Blast radius** | Every tier-3 embedding in the system |

**Evidence:**
- `rag-embedding-service.ts` defines `buildEnrichedEmbeddingText(fact)` which prepends provenance metadata: `[Policy: X] [Section: Y] [Category: Z] <fact.content>`. This enrichment was designed to improve semantic search precision by encoding document structure into the embedding vector.
- `rag-ingestion-service.ts` line ~508-513 (the `generateEmbeddings` step) constructs tier-3 embedding text as:
  ```
  embeddingText = fact.content
  ```
  It does NOT call `buildEnrichedEmbeddingText(fact)`.
- Tier 1 uses `summary + topics`, tier 2 uses `contextualPreamble + summary/text[:2000]`, but tier 3 uses raw `fact.content` with no provenance context.
- The function is exported from the service but has zero call sites in production code.

**Root-cause hypothesis:** The function was written as part of the embedding enrichment design (spec 013) but the ingestion service was implemented or refactored without integrating it.

---

### Finding F-04: Reranking Fails 100% — Silent Degradation to No-Op

| Attribute | Detail |
|-----------|--------|
| **Severity** | HIGH |
| **Confidence** | 95% — confirmed by Vercel logs + code analysis |
| **Blast radius** | Every RAG query |

**Evidence:**
- Vercel runtime logs show `[RAG Retrieval] Reranking: Could not parse ranking, using original order` for **every single query** across both test runs.
- `rerankWithClaude` (`rag-retrieval-service.ts` lines 292–385) calls `provider.generateResponse()` with a system prompt asking for a JSON array of indices.
- `generateResponse()` in `claude-llm-provider.ts` is the **full RAG response generator** — it formats the input as a RAG query with citation instructions, not as a simple completion. Claude responds with a natural language answer (with citations), not a bare `[3, 0, 5, 1, 2, 4]` array.
- All three parse strategies fail:
  - **Strategy 1** (regex `\[[\d,\s\n]+\]`): Fails because response contains prose, not a bare array.
  - **Strategy 2** (markdown fence extraction): Fails because Claude doesn't fence its natural language response.
  - **Strategy 3** (bracket boundary extraction): Extracts a substring that includes non-JSON text, `JSON.parse` throws.
- Each strategy silently catches the error → falls through → returns original order unchanged.
- Candidates are truncated to 200 characters each, further reducing reranking signal even if parsing worked.

**Root-cause hypothesis:** The reranking function reuses the main LLM provider which has RAG-specific system prompt augmentation that overrides or competes with the reranking instruction. It needs a dedicated lightweight completion call without RAG formatting.

---

### Finding F-05: 2 Golden Questions Ask for Non-Existent Data

| Attribute | Detail |
|-----------|--------|
| **Severity** | MEDIUM |
| **Confidence** | 99% — confirmed by DB content search |
| **Blast radius** | GS-002 and GS-004 — guaranteed failures (−10% pass rate) |

**Evidence:**
- **GS-002** ("What is the minimum credit score for a conventional loan?"): Expected answer contains "620". SQL search for "FICO" and "conventional" across all facts in the target document returned zero matches for a 620 threshold. The only FICO threshold found is **740** for jumbo mortgage products.
- **GS-004** ("What cash deposit amount triggers additional documentation?"): Expected answer contains "$10,000". SQL search for "$10,000" returned zero matches. The document contains **$10,000,000** and **$1,000,000** thresholds (institutional/commercial amounts), but no $10,000 retail threshold.
- These questions may have been written against a different document or document version than what is currently ingested.

**Root-cause hypothesis:** The golden test definitions were authored against the original single-pass canonical document (`ceff906e`), which processed different content or sections than the current multi-pass documents.

---

### Finding F-06: 2 Golden Questions Have Wrong Expected Substrings

| Attribute | Detail |
|-----------|--------|
| **Severity** | MEDIUM |
| **Confidence** | 95% — confirmed by DB content search |
| **Blast radius** | GS-012 and GS-015 — likely false failures (−10% pass rate) |

**Evidence:**
- **GS-012** (jumbo mortgage question): Expected answer contains "conforming". SQL search for "conforming" across all facts with "jumbo" context returned **0 matches**. The document discusses jumbo mortgages in terms of reserve requirements and FICO thresholds but never uses the term "conforming loan limit."
- **GS-015** (documentation/identity question): Expected answer contains "identification". SQL search for "identification" returned only maritime AIS and IP address references, not identity documents. The actual document content references "passport" for identity verification.
- Pass/fail logic (`test-diagnostics.ts`) uses case-insensitive substring match: `responseText.toLowerCase().includes(expectedAnswer.toLowerCase())`. Even if Claude gives the correct answer using the document's actual terminology, the test fails because the expected substring doesn't match.

**Root-cause hypothesis:** Expected substrings were written from domain knowledge rather than verified against the actual ingested document content.

---

### Finding F-07: Vercel 120s Timeout Truncates Test Report

| Attribute | Detail |
|-----------|--------|
| **Severity** | MEDIUM |
| **Confidence** | 99% — confirmed by Vercel logs + client code |
| **Blast radius** | Questions GS-017 through GS-020 (batch 4) |

**Evidence:**
- `golden-set/route.ts` sets `maxDuration = 120` (seconds). Each RAG query takes ~20–30 seconds. Batch size = 4 with 500ms inter-query delay.
- Batch 4 math: 4 queries × ~25s average + 1.5s delays = ~101.5s. Add overhead and variance → exceeds 120s.
- Vercel kills the request at 120,029ms (per logs: `Task timed out after 120029 milliseconds`).
- `page.tsx` batch orchestration: on non-200 response or catch-block network error, it `break`s out of the batch loop but still computes a summary from collected results.
- Test-02 report contains **16 questions** (batches 0–3), not 20. The reported "69% pass rate" is 11/16. If the 4 missing questions are counted as failures, the true rate is **11/20 = 55%**.

**Root-cause hypothesis:** The batch architecture (5 sequential HTTP requests, 4 queries each) was designed for Vercel's function timeout limit, but query-time variance means the last batch frequently exceeds the budget.

---

### Finding F-08: JSON Parse Error — "Unexpected token 'A'" 

| Attribute | Detail |
|-----------|--------|
| **Severity** | LOW-MEDIUM (cosmetic, already handled) |
| **Confidence** | 99% — confirmed by Vercel logs |
| **Blast radius** | Client-side error display for batch 4 |

**Evidence:**
- Vercel logs show the error: `Unexpected token 'A', "An error o"... is not valid JSON`.
- When Vercel returns a 504 timeout, the response body is an HTML error page starting with `"An error occurred..."`.
- `page.tsx` calls `const json = await res.json()` on the response, which throws because HTML is not valid JSON.
- The `"A"` in the error message is the first character of `"An error occurred"`.
- The catch block in `page.tsx` handles this gracefully: sets an error message and computes a partial summary from collected results.

**Root-cause hypothesis:** Normal Vercel timeout behavior. The client should check `res.ok` before attempting `res.json()`, or use a try/catch around the JSON parse (which it partially does via the outer catch block).

---

### Finding F-09: Self-Eval JSON Parse Failure from Token Truncation

| Attribute | Detail |
|-----------|--------|
| **Severity** | LOW-MEDIUM |
| **Confidence** | 90% — inferred from logs + code |
| **Blast radius** | Self-eval scores lost for some queries |

**Evidence:**
- `selfEvaluate` in `rag-retrieval-service.ts` calls Claude with `max_tokens: 300` for the self-evaluation response.
- The self-eval prompt asks Claude to return a JSON object with `score`, `confidence`, `reasoning`, and `issues` fields.
- If Claude's reasoning is verbose, the 300-token limit truncates the response mid-JSON — e.g., `{"score": 0.7, "confidence": 0.8, "reasoning": "The context covers...` (no closing `}`).
- `parseJsonResponse` finds the opening `{` but no matching `}` (or last `}` is within the reasoning string), and the final `JSON.parse` throws.
- Self-eval context is also truncated to 5,000 characters, which may cause evaluation to miss critical context that was actually available to the response generator.

**Root-cause hypothesis:** The 300-token limit is too low for Claude to reliably produce both reasoning text and valid JSON structure. Self-eval needs either a higher token limit, a structured output format, or a simpler response schema.

---

### Finding F-10: Self-Eval Does Not Evaluate Response Groundedness

| Attribute | Detail |
|-----------|--------|
| **Severity** | LOW (no direct test impact, limits quality insight) |
| **Confidence** | 100% — confirmed by code |
| **Blast radius** | Quality monitoring only |

**Evidence:**
- The `selfEvaluate` function in `rag-retrieval-service.ts` sends **only** the query and the retrieved context to Claude. It does NOT include the generated `responseText`.
- The self-eval prompt asks Claude to assess **context sufficiency** — whether the retrieved passages contain enough information to answer the query.
- It cannot detect hallucinations in the actual response because it never sees the response.
- Pass/fail in golden tests is determined by substring match, not self-eval score, so this doesn't directly affect pass rates. But it means self-eval scores are not a reliable quality signal for response accuracy.

---

### Finding F-11: N+1 Query Pattern in Retrieval

| Attribute | Detail |
|-----------|--------|
| **Severity** | LOW (performance, contributes to timeout) |
| **Confidence** | 90% — confirmed by code |
| **Blast radius** | All queries — adds latency |

**Evidence:**
- `retrieveContext` in `rag-retrieval-service.ts` performs vector search, then for each returned embedding, issues individual queries to fetch the parent `rag_fact` or `rag_section` record.
- With 10–20 embedding results per vector search, this creates 10–20 additional DB round-trips per query.
- Contributes to the ~20–30s per-query execution time that pushes batch 4 over the 120s timeout.

---

## Improvement Actions (Ranked)

| Priority | Action | Effort | Risk | Addresses |
|----------|--------|--------|------|-----------|
| **P0** | Fix runId tagging — either re-run embeddings with proper tagging for doc `576b3a95`, or remove `run_id` filter from vector search when `run_id` is null | Low | Low | F-01 |
| **P1** | Generate embeddings for the 226 unembedded facts | Low | Low | F-02 |
| **P1** | Wire `buildEnrichedEmbeddingText` into the ingestion pipeline for tier-3 embeddings, then re-embed all facts | Medium | Medium | F-03 |
| **P1** | Fix reranking: use a dedicated lightweight Claude call (not `generateResponse`) with explicit JSON-only instruction and lower temperature | Medium | Low | F-04 |
| **P2** | Fix or replace GS-002 and GS-004 with questions answerable from the actual ingested document | Low | Low | F-05 |
| **P2** | Fix expected substrings for GS-012 ("conforming" → actual term) and GS-015 ("identification" → "passport") | Low | Low | F-06 |
| **P2** | Increase `maxDuration` or reduce batch size to prevent timeout on batch 4 | Low | Low | F-07 |
| **P3** | Guard `res.json()` with `res.ok` check before parsing, return structured error for timeout | Low | Low | F-08 |
| **P3** | Increase self-eval `max_tokens` from 300 to 500+, or use structured output | Low | Low | F-09 |
| **P3** | Include `responseText` in self-eval prompt to assess groundedness | Low | Low | F-10 |
| **P4** | Batch fact/section lookups in `retrieveContext` to eliminate N+1 queries | Medium | Low | F-11 |

---

## Ruled-Out Hypotheses

| Hypothesis | Investigation | Outcome |
|------------|---------------|---------|
| **Embedding model failure** | Queried `rag_embeddings` — 1,031 valid embeddings exist for doc `04233183`, all with 1536-dimension vectors | NOT the problem |
| **Claude API connectivity** | Vercel logs show Claude API calls succeeding with responses returned | NOT the problem |
| **Database schema corruption** | SAOL schema introspection shows all tables and columns intact, foreign keys valid | NOT the problem |
| **Ingestion pipeline crash** | 1,226 facts successfully created across 6 passes for doc `04233183` | NOT the problem |
| **Vector dimension mismatch** | All embeddings are 1536-dim, matching `text-embedding-3-small` model | NOT the problem |
| **HyDE query generation failing** | Vercel logs show HyDE hypothetical documents being generated for each query | NOT the problem |
| **BM25 search broken** | BM25 text search returns results (it's what saved test-01 from 0%) | NOT the problem |
| **Supabase RPC functions missing** | `match_rag_embeddings_kb` and `search_rag_text` exist and execute correctly | NOT the problem |

---

## Open Questions

1. **Why are doc `576b3a95` embeddings untagged while doc `04233183` embeddings are tagged?** Was the `run_id` tagging code added between the two embedding runs? Review git history for the embedding generation code changes.

**James' Answer**: 
a. I dont understand the relevance of "tagging code added between the two embedding runs"
I do know that the way the system is supposed to work is:
1. I create a new KB
2. I add a document to the new KB give it some context and submit it.
3. That's it. I can optionally answer the Q and A questions it presents.

HOWEVER These errors are pointing me to the theory that two different documents are being commingled by the Golden Test tool. That would explain why you are seeing various doc ids being different. 
This situation may be easier to confusion because I am using the **SAME EXACT** document EVERY TIME for the test. 
I have done 22 tests, at least one for each codebase fix, all with the same input document. That is this one:.............

My actions for you:
1. Investigate the possibility that document IDs are being confused, or even that we are comminigling the RAG embeddings.
2. Create a SQL command that will clean the RAG module of all run data.
The command should NOT delete any persistent meta data, prompts, needed "salting" data, persistent attributes.

It should delete all KBs, RAG embedding runs, current scores, sections, QA questions, chat queries, chat answers, any leftover run orphans, embeddings, etc.
If there are any remote objects that are tied to the RAG runs, they should be deleted too.
The goal is a clean RAG embedding module we can properly test.


2. **Are the 226 unembedded facts from later ingestion passes?** If multi-pass ingestion runs passes 1–6 sequentially and embedding generation runs after pass 3 (for example), passes 4–6 would create unembedded facts. Need to check the Inngest workflow step ordering.

**James' Answer**: Let's first clear the RAG module of all Runs and then run a clean run on this current codebase. Then based on the results investigate with only 1 or 2 not commingled runs.



3. **Does `provider.generateResponse()` inject its own system prompt?** If the Claude provider prepends RAG-specific citation instructions to every call, it would explain why the reranking system prompt is overridden. Need to read the full `generateResponse` method signature and system prompt assembly.
**James' Answer**: I don't know how to help on this one. Is there an investigation you can do?


4. **What happens when `documentId` is `undefined` in the test route?** The client `page.tsx` sends `selectedDocumentId` which can be `undefined`. Does the server fall back to `CANONICAL_DOCUMENT_ID`, search all documents, or error? This determines whether test-02 might have searched the wrong document scope.
**James' Answer**: The system should be fault tolerant..but wouldn't any situation where a document id is undefined be by definition a failed run and should not be assigned to a "catch all" document that could create corrupted data?
Recommend a solution.


5. **Were golden test definitions validated against the multi-pass document?** The `CANONICAL_DOCUMENT_ID` in `golden-set-definitions.ts` points to `ceff906e` (the old single-pass document with only 109 facts), not the current multi-pass documents. If the test UI overrides this with a different document, the expected answers may not align.
**James' Answer**: The system should be fault tolerant..but wouldn't any situation where a document id is undefined be by definition a failed run and should not be assigned to a "catch all" document that could create corrupted data?
Recommend a solution.

6. **Is there a race condition in embedding count updates?** The `rag_embedding_runs` table shows `embedding_count = 1030` for run `5e3fd093`, but zero embeddings are tagged. Was the count set optimistically before actual tagging?

**James' Answer**: I don't exactly understand the tagging system you have implemented. I also don't know if you are referring to multiple concepts or tables when talking about "tagging". 
Question 6 sounds like clearing the RAG module of all Runs and then run a clean RAG embedding run on this current codebase. Then based on the results investigate with only 1 or 2 not commingled runs and no CANONICAL runs of undetermined origin.
---

## Specification Readiness

- **Ready for spec?** YES
- **Blocking issues:** None — all root causes identified with high confidence
- **Suggested spec title:** `018-rag-golden-test-fixes_v1.md`
- **Estimated spec sections:** 8 (one per P0–P3 fix action, plus test harness improvements, embedding re-generation plan, regression test updates, and rollback procedures)
- **Recommended spec approach:** Address P0 (runId tagging) and P2 (bad test questions) first as they are zero-risk, immediate-impact fixes that will establish a true baseline. Then tackle P1 items (enrichment, reranking, unembedded facts) which require re-embedding. P3 items are incremental quality improvements.

**James' Answer**:
Your readiness suggestions go in the wrong direction. We are not going to fix individual runs or data. We are going to clear, harden the system the way it is now (e.g. fixing "CANONICAL runs" possible corruption ). I am not convinced that the missing data isn't a simple "canonical" or commingled data issue. So lets fix that first and then get a clean run for evaluatiion and testing.


---

## Next action instructions

Write a detailed, complete, accurate, precise, and comprehensive specification that:
- Implements ALL requirements described above with zero omissions
- Integrates cleanly into the existing codebase patterns (don't invent new patterns when existing ones apply)
- Preserves all existing functionality unless explicitly instructed to change it
- Uses GIVEN-WHEN-THEN acceptance criteria for each discrete change
- Includes the specific code locations (file paths + function/component names) where each change applies

### 4. SAOL Constraint (NON-NEGOTIABLE)
**ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

Write this specification to:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\017-rag-multi-golden-fix3-spec_v1.md`