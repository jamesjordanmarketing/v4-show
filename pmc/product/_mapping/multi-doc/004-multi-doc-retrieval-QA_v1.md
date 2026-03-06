# 004 — Multi-Document Retrieval QA: Root Cause & Fix Notes (v1)

**Date:** 2026-02-20  
**Author:** Copilot (senior RAG prompt engineer review)  
**Status:** Fixes implemented, awaiting retest  
**Triggered by:** User test — "Chat with all documents" returned only Sun Bank answer, ignored Moon Bank entirely  

---

## 1. Test Scenario

**Knowledge Base:** `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`  
**Documents uploaded:**

| Document | ID | Status |
|---|---|---|
| Sun-Chip-Bank-Policy-Document-v2.0.md | `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` | ready |
| Moon-Banc-Policy-Document-v1.0.md | `c29471f9-12c6-42e0-915d-78bdc2dab0ee` | ready (27 sections, 615 facts, 643 embeddings) |

**Query (verbatim):**  
> "I am absolutely insulted! I just noticed a massive, ridiculous maintenance fee charged to my account just because my portfolio dipped slightly during last month's market correction. Do you know who I am?! I demand to know the exact numerical minimum balance I am required to maintain, the specific name of the restricted status my account enters when it drops below that number, and exactly how much you are charging me for this absurd fee!"

**Expected answer:** Information from BOTH banks:
- **Sun Bank:** $10M minimum → "Warning Status" → $5,000 Sub-Tier Maintenance Fee
- **Moon Bank:** 25M CHF minimum → "Low-Orbit Mode" → 15,000 CHF Complexity Fee per quarter

**Actual answer:** Sun Bank only. Zero Moon Bank information.

**Query ID stored:** `05b7205f-9776-4070-b2e7-d68db241e42a`

---

## 2. Diagnostic Data Trail (via SAOL)

### 2.1 Retrieval — CORRECT

The vector + BM25 hybrid search found content from BOTH documents:

| Stage | Sun Bank | Moon Bank | Total |
|---|---|---|---|
| Sections retrieved | 6 | 5 | 11 |
| Facts retrieved | 20 | 9 | 29 |

**Verdict:** Retrieval pipeline is working. The `match_rag_embeddings_kb` RPC correctly searched KB-wide.

### 2.2 Balance check — PASSED

`balanceMultiDocCoverage` (60% max cap per document) did not trigger rebalancing because Sun Bank was at 55% (6/11 sections), which is under the 60% cap.

### 2.3 Assembled context — BIASED ORDERING

Total assembled context: **26,177 characters**.

| Document | Mentions | First appearance |
|---|---|---|
| Sun Bank | 26 | char 26 (top of context) |
| Moon Bank | 9 | char 17,581 (67% into context) |

The context DID contain Moon Bank info — but it was buried at the bottom because `assembleContext` grouped ALL Sun Bank sections first (they had higher similarity scores) before ANY Moon Bank sections.

### 2.4 Query classification — MISCLASSIFIED

```
Classification: "simple (3 sub-queries)"
Type: simple → sub-queries ignored
```

The query was classified as "simple" because it doesn't explicitly say "compare" or "contrast." But in a KB with two bank policy documents, asking "what is my minimum balance?" is inherently comparative — each bank has a different answer.

### 2.5 Response generation — SINGLE-DOC ONLY

The `generateResponse` system prompt only said:  
> "When citing information, mention which document it comes from using the document name shown in the 'From:' headers."

This tells the LLM to **cite** document names — but never tells it to **cover ALL documents**. Claude "solved" the question from Sun Bank content (which appeared first and was more prominent) and stopped.

### 2.6 Self-eval — FALSE PASS

Self-eval scored **0.95 (PASS)** because the Sun Bank answer IS factually grounded. The eval prompt only checked for hallucination, not for multi-document completeness. A correct answer from one document out of two is a **50% answer** that should have scored low.

---

## 3. Root Causes (4 Factors)

### RC-1: `generateResponse` prompt lacks multi-doc completeness instruction (PRIMARY)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `generateResponse()`  
**Line:** ~632 (pre-fix)

The `multiDocInstruction` only instructs Claude to cite document names — it doesn't say "you MUST address every document." When the LLM encounters 26,000 chars of context dominated by Sun Bank at the top, it answers from the first adequate source and stops.

**Severity:** CRITICAL — this is the primary cause. Even with perfect context ordering, without an explicit completeness instruction, the LLM may still skip documents.

### RC-2: `classifyQuery` doesn't detect implicit comparisons

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `classifyQuery()`  
**Line:** ~840 (pre-fix)

The classification prompt defined "simple" as "Can be answered by searching across all documents (most queries)" and "comparative" as "Asks to compare, contrast, or reconcile information across documents." The test query doesn't use comparison language, so it was classified as "simple." 

But when a KB has multiple documents of the same type (bank policies), any question about specific values (fees, thresholds, penalties) is implicitly comparative because each document has different values.

**Severity:** HIGH — the "simple" classification skipped the multi-hop branch which would have run per-document sub-queries and produced structured evidence with explicit document headers.

### RC-3: `assembleContext` groups by document sequentially (primacy bias)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `assembleContext()`  
**Line:** ~284 (pre-fix)

The multi-doc branch used `Map.entries()` iteration which yields documents in insertion order. Sun Bank sections had higher similarity scores → inserted first → ALL Sun Bank sections appeared before ANY Moon Bank section. This creates a 17,581-character lead for Sun Bank, pushing Moon Bank to the tail where it gets less LLM attention.

**Severity:** MEDIUM — even with a good prompt, document ordering influences LLM attention. Round-robin interleaving ensures both documents get early attention.

### RC-4: `selfEvaluate` only checks hallucination, not completeness

**File:** `src/lib/rag/providers/claude-llm-provider.ts` → `selfEvaluate()`  
**Line:** ~392 (pre-fix)

The self-eval system prompt said "You are a RAG hallucination detector" and only evaluated factual grounding. It scored 0.95 for a response that correctly cited Sun Bank but completely ignored Moon Bank — which should have been a ~0.4 (incomplete answer).

**Severity:** MEDIUM — self-eval is a safety net. Even if the response is wrong, a low self-eval score can trigger retry logic or flag the answer as incomplete for the user.

---

## 4. Fixes Implemented

### Fix 1: `generateResponse` — Explicit multi-doc completeness instruction

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Function:** `generateResponse()`  
**Lines affected:** ~632-680 (post-fix)

**What was changed:**
1. Added regex extraction of document names from `## From:` headers in the assembled context
2. Replaced the single-line `multiDocInstruction` with a detailed CRITICAL instruction block that:
   - Lists ALL document names explicitly (e.g., `"Sun-Chip-Bank-Policy-Document-v2.0.md", "Moon-Banc-Policy-Document-v1.0.md"`)
   - Mandates addressing EACH document's information separately
   - Requires per-document labeling when answers differ
   - Requires structured response sections per document
   - Requires explicit statement when a document lacks relevant info
   - Frames omission as "incomplete answer"

**Design rationale:** At companies like OpenAI/Anthropic, multi-doc RAG prompts use **enumeration + obligation** patterns — listing the exact documents and making coverage mandatory. Saying "address each document" is weaker than "The context contains 2 documents: X and Y. You MUST address EACH." The latter creates a checklist the model can verify against itself.

**Key prompt engineering principles applied:**
- **Enumerate, don't abstract:** List the exact document names so the model can cross-check its response
- **Behavioral constraint framing:** "Failure to address all documents is considered an incomplete answer" — frames the completeness requirement as a hard constraint, not a suggestion
- **Structured output guidance:** "Structure your response with clear per-document sections when answers differ" — reduces ambiguity about what "addressing" means
- **Explicit negative case:** "If a document does not contain relevant information, explicitly state that" — prevents the model from silently skipping documents

### Fix 2: `classifyQuery` — Implicit comparison detection

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Function:** `classifyQuery()`  
**Lines affected:** ~882-910 (post-fix)

**What was changed:**
1. Made the "simple" definition much more restrictive: "A factual lookup that would have the SAME answer regardless of which document it comes from"
2. Added an "IMPORTANT — Implicit comparison detection" section with concrete examples
3. Established the principle: "When a KB contains multiple documents of the SAME TYPE, questions about specific values/thresholds/fees/rules are ALMOST ALWAYS comparative"
4. Added the escape hatch: "Only classify as simple when confident the answer would be identical across all documents, or when the query explicitly names a single document"
5. Passed `documentCount` into the system prompt string so the classifier knows the KB size

**Design rationale:** The original classifier used definitions that any NLP engineer would recognize as correct in isolation — but they failed on the most common real-world pattern: same-type documents with different domain values. The fix uses **exemplar-based prompting** (concrete examples of implicit comparisons) because LLMs classify better with examples than definitions alone.

**Expected behavior change for the test query:**
- Before: `{"type": "simple"}` → sub-queries ignored, standard retrieval
- After: `{"type": "comparative", "subQueries": ["What is the minimum balance required?", "What restricted status does the account enter?", "What maintenance fee is charged?"]}` → multi-hop branch with per-document sub-queries

### Fix 3: `assembleContext` — Round-robin section interleaving

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Function:** `assembleContext()`  
**Lines affected:** ~284-354 (post-fix)

**What was changed:**
1. Replaced sequential document grouping with round-robin interleaving
2. Each document's sections are still internally sorted by similarity (best first)
3. The interleaving order alternates: `DocA§1 → DocB§1 → DocA§2 → DocB§2 → ...`
4. Document `## From:` headers are pre-emitted at the top so the LLM sees the full document list immediately
5. Each interleaved section carries a `[DocName]` prefix in its heading for attribution

**Algorithm:**
```
Input: [SunA(0.81), SunB(0.79), SunC(0.75), MoonA(0.64), MoonB(0.64)]

Step 1: Group by doc → Sun: [A, B, C], Moon: [A, B]
Step 2: Sort each internally → already sorted
Step 3: Round-robin:
  Round 0: Sun.A(0.81), Moon.A(0.64)
  Round 1: Sun.B(0.79), Moon.B(0.64)
  Round 2: Sun.C(0.75)

Output context order:
  ## From: Sun-Chip-Bank-Policy-Document-v2.0.md
  ## From: Moon-Banc-Policy-Document-v1.0.md
  ### [Sun-Chip] SunA [0.81]
  ### [Moon-Banc] MoonA [0.64]
  ### [Sun-Chip] SunB [0.79]
  ### [Moon-Banc] MoonB [0.64]
  ### [Sun-Chip] SunC [0.75]
```

**Design rationale:** LLMs exhibit **primacy bias** — content at the beginning of the context window gets more attention than content at the end (documented in "Lost in the Middle" — Liu et al., 2023). By interleaving sections, Moon Bank's best section appears at position 2 instead of position 7, dramatically increasing the probability it's incorporated into the response.

**Per-section doc attribution:** Each section heading now includes `[DocName]` (e.g., `### [Moon-Banc-Policy-Document-v1.0.md] MB-ELIG-001: Minimum Asset...`) so even without the global `## From:` headers, the model can see which document each section belongs to. This is especially important in the interleaved layout where sections from different documents are adjacent.

### Fix 4: `selfEvaluate` — Multi-document completeness check

**File:** `src/lib/rag/providers/claude-llm-provider.ts`  
**Function:** `selfEvaluate()`  
**Lines affected:** ~392-440 (post-fix)

**What was changed:**
1. System prompt updated from "hallucination detector" to "hallucination and completeness detector"
2. Added evaluation criterion #4: **MULTI-DOCUMENT COMPLETENESS CHECK**
3. Instructions to count `## From:` headers and verify the response addresses all N documents
4. Explicit scoring band for completeness failures: 0.3-0.5 for single-doc answers when multi-doc context is present
5. Proportional deduction: if N docs in context but response references fewer than N, deduct proportionally
6. Revised scoring rubric:
   - 0.8-1.0: Well-grounded AND addresses all documents
   - 0.5-0.7: Factually correct but incomplete (missing document perspectives)
   - 0.3-0.5: Only addresses single document when multiple present with different relevant info
   - 0.0-0.3: Hallucination or contradiction

**Expected behavior change for the original test:**
- Before: score=0.95, passed=true (Sun Bank answer is factually correct)
- After: score≈0.35-0.45, passed=false (correct single-doc answer but Moon Bank completely missing)

**Design rationale:** Self-eval functions as the last safety net in the RAG pipeline. If the generation prompt fails to produce a multi-doc response, the self-eval should catch it and flag it as incomplete. A future enhancement could use this low score to trigger automatic retry with an enhanced prompt — but for now, the signal itself (low score + reasoning mentioning missing documents) provides diagnostic value and prevents false confidence.

---

## 5. Files Modified

| File | Functions Changed | Lines (approx) |
|---|---|---|
| `src/lib/rag/services/rag-retrieval-service.ts` | `generateResponse()`, `classifyQuery()`, `assembleContext()` | ~632-680, ~882-910, ~284-354 |
| `src/lib/rag/providers/claude-llm-provider.ts` | `selfEvaluate()` | ~392-440 |

**Total lines changed:** ~120 lines of prompt/logic across 2 files  
**No new dependencies or schema changes**  
**No changes to function signatures or return types**  
**Zero compile errors after all edits**

---

## 6. Retest Plan

### 6.1 Rerun the exact same query

Use the same KB (`4fc8fa25...`) with both documents and submit the same angry maintenance fee question. Expected:
- **Classification:** `comparative` with 3 sub-queries
- **Multi-hop branch:** Activated (sub-queries run in parallel)
- **Response:** Addresses BOTH banks with per-bank sections
- **Self-eval:** 0.8+ if both banks addressed; 0.3-0.5 if one is still missing (safety net working)

### 6.2 Verify single-doc queries still work

Submit a query in single-document mode to confirm the changes don't affect single-doc behavior:
- Select one document → chat → confirm no `## From:` headers → confirm `multiDocInstruction` is empty → confirm standard response

### 6.3 Verify simple KB-wide queries still work

Submit a query that IS genuinely simple across a multi-doc KB (e.g., "What is the purpose of this knowledge base?") and confirm it still classifies as "simple" and follows the standard path.

### 6.4 Context ordering verification

After retest, run SAOL query on the new `assembled_context` and verify:
- Moon Bank content appears interleaved with Sun Bank (not all at the end)
- First Moon Bank section appears within the first 30% of context

---

## 7. Risk Assessment

| Change | Risk | Mitigation |
|---|---|---|
| Stronger multiDocInstruction prompt | Low — only activates when `## From:` detected | Single-doc path unchanged |
| Stricter classifyQuery | Medium — may over-classify as "comparative" | Added escape hatch for explicitly-named single documents; "simple" still available |
| Round-robin interleaving | Low — same content, different order | Internal sections still sorted by similarity; token budget enforcement unchanged |
| Completeness-aware selfEvaluate | Low — only affects scoring, not response | Scoring is advisory; no retry logic depends on it yet |

**Biggest risk:** The `classifyQuery` change may classify some genuinely simple KB-wide queries as "comparative," triggering the multi-hop branch unnecessarily. This has a latency cost (multiple sub-queries) but no correctness cost — the multi-hop branch produces valid results for simple queries too, just with more overhead. Monitor classification distribution after deployment.

---

## 8. Architecture Note

These four fixes address the **symptom layer** (LLM not addressing all documents). The deeper architectural question is whether `balanceMultiDocCoverage` should be more aggressive — the 60% cap allowed Sun Bank to have 55% of sections (6/11) and 69% of facts (20/29). A stricter 50% cap would force true balance. However, that's a retrieval-layer change that should be evaluated separately from these generation-layer fixes.
