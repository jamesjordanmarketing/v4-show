# 008 — RAG Module QA: Round 3 — LoRA Bypassed in Comparative Branch

**Date:** 2026-02-21  
**Author:** Copilot (senior RAG engineer)  
**Status:** Diagnosis complete — 1 fix needed  
**Context:** Round 2 fixes deployed (classifyQuery, LoRA multi-doc prompt, generateResponse strengthening). classifyQuery now correctly classifies as "comparative" — but this ironically bypasses the LoRA path entirely, because the comparative/multi-hop branch hardcodes Claude.

---

## 1. Test Results Summary (Round 3 — Deployment `dpl_x13KJLCW6cQWP9DF8XS3cK9y6ER3`)

All tests used KB `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` with 2 documents (Sun Bank + Moon Bank).

| # | Time (UTC) | Mode | Question | Self-Eval | Multi-Doc? | LoRA Called? |
|---|---|---|---|---|---|---|
| T1 | 19:14:53 | rag_only | Margin call / LTV | 0.92 PASS | YES — both banks | N/A (rag_only) |
| T2 | 19:16:54 | rag_and_lora | Margin call / LTV | 0.92 PASS | YES — both banks | **NO** |
| T3 | 19:17:18 | rag_and_lora | Margin call / LTV | 0.92 PASS | YES — both banks | **NO** |

### What's Working (v2 Fixes Confirmed)
- **classifyQuery** is now operational — all 3 queries correctly classified as `"comparative"` with 3 sub-queries
- **Multi-document coverage** is working — both banks addressed in all responses, score 0.92
- **Sub-query decomposition** working — generates focused sub-queries per topic
- **Multi-hop context assembly** working — evidence grouped by document

### What's Broken
- **LoRA model is NEVER called** — zero `[LoRA-INFERENCE]` log entries on the new deployment
- Both `rag_and_lora` queries (T2, T3) produce responses identical in tone to `rag_only` (T1) — no LoRA emotional intelligence, no trained personality
- The user correctly identified that the LoRA answer has no additional warmth or emotional intelligence compared to the RAG-only answer

---

## 2. Root Cause Analysis

### The Ironic Success-Failure

Fixing `classifyQuery` (Round 2, Fix 1) **created a new bypass path**. Here's the chain of events:

1. **Pre-Fix 1:** classifyQuery crashed → defaulted to `"simple"` → took the standard retrieval path (lines 1270–1410) → the standard path has a proper `if (mode === 'rag_and_lora')` branch at line 1397 → **LoRA was called**
2. **Post-Fix 1:** classifyQuery succeeds → returns `"comparative"` → takes the multi-hop/comparative branch (lines 1173–1268) → this branch **hardcodes `generateResponse()` (Claude) at line 1215** → **LoRA is never called**

### The Bug: Multi-hop branch ignores `mode`

In `rag-retrieval-service.ts`, lines 1191–1195:

```typescript
// Generate response using multi-hop context
const claudeResult = await generateResponse({
  queryText: params.queryText,
  assembledContext: multiHopContext,
  mode,
  conversationContext,
});
```

This always calls `generateResponse()` (Claude) regardless of whether `mode === 'rag_and_lora'`. The `mode` parameter is passed but it's only used inside `generateResponse()` for prompt construction — it doesn't route to the LoRA endpoint.

Compare to the **standard path** at lines 1397–1414 which correctly branches:

```typescript
if (mode === 'rag_and_lora') {
  const loraResult = await generateLoRAResponse({
    queryText: params.queryText,
    assembledContext,
    mode,
    jobId: params.modelJobId!,
  });
  responseText = loraResult.responseText;
  citations = loraResult.citations;
} else {
  const claudeResult = await generateResponse({ ... });
  responseText = claudeResult.responseText;
  citations = claudeResult.citations;
}
```

The multi-hop branch is missing this `if/else` routing entirely.

### Evidence from Vercel Logs

**T2 (`rag_and_lora`, request `5h27l`):**
```
19:16:54  [RAG Retrieval] Query: "My broker..." mode=rag_and_lora modelJobId=6fd5ac79...
19:16:56  [RAG Retrieval] Query classified as: comparative, subQueries: [...]
19:16:56  [RAG Retrieval] Running 3 sub-queries for comparative query
19:17:02  [RAG Retrieval] Hybrid search: vector=40, bm25=1, ...
19:17:22  [RAG Self-Eval] score=0.92 passed=true
19:17:22  [RAG Retrieval] Multi-hop query complete in 27775ms
```

**Missing log entries:**
- `[LoRA-INFERENCE] Calling endpoint for job 6fd5ac79` — **NEVER appears**
- `[INFERENCE-SERVICE] Mode selected: serverless` — **NEVER appears** for this request

The LoRA endpoint was never contacted. The response was generated entirely by Claude via `generateResponse()`.

### Comparison with Old (Pre-Fix) LoRA Call

From the old deployment (`dpl_75c1mBbkGcFJoJsZbQzZpDBJQJ6V`) at 05:24-05:27 (Tuscany lockout, `rag_and_lora`):
```
05:24:57  [RAG Retrieval] Query: "I am trying to log in from Tuscany..." mode=rag_and_lora
05:25:00  [RAG Retrieval] Query classification failed, defaulting to simple  ← classifyQuery crashed
05:25:10  [LoRA-INFERENCE] Calling endpoint for job 6fd5ac79, mode=rag_and_lora  ← LoRA WAS called
05:25:10  [INFERENCE-SERVICE] Routing to serverless implementation
05:27:47  [RAG Retrieval] Query complete in 169566ms, mode=rag_and_lora, self-eval: 0.42 (FAIL)
```

When classifyQuery **crashed** → defaulted to `simple` → standard path → LoRA was called (but failed on multi-doc).
When classifyQuery **succeeds** → comparative → multi-hop branch → LoRA bypassed.

---

## 3. Why Fix 2 (LoRA Multi-Doc Prompt) Also Didn't Help

The Round 2 Fix 2 added multi-doc awareness to `generateLoRAResponse()`. This fix is **correct code** but it's **unreachable** because:

1. The only call site for `generateLoRAResponse()` in the standard path is at line 1397
2. With classifyQuery now working, KB-wide queries with 2+ documents **always** hit the comparative branch (line 1173) which returns early
3. The standard path (line 1270+) is never reached for these queries
4. Therefore `generateLoRAResponse()` with the new multi-doc prompt injection is **dead code** for comparative queries

---

## 4. Recommended Fix

### Fix: Add LoRA mode routing to the multi-hop/comparative branch

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Lines ~1189-1198 (inside the `if (classification.type !== 'simple' && classification.subQueries?.length)` block)

**Current code (broken):**
```typescript
// Generate response using multi-hop context
const claudeResult = await generateResponse({
  queryText: params.queryText,
  assembledContext: multiHopContext,
  mode,
  conversationContext,
});
```

**Proposed fix:**
```typescript
// Generate response — branch on mode (LoRA vs Claude)
let mhResponseText: string;
let mhCitations: RAGCitation[];

if (mode === 'rag_and_lora' && params.modelJobId) {
  // LoRA + RAG: Send multi-hop context to LoRA endpoint
  const loraResult = await generateLoRAResponse({
    queryText: params.queryText,
    assembledContext: multiHopContext,
    mode,
    jobId: params.modelJobId,
  });
  mhResponseText = loraResult.responseText;
  mhCitations = loraResult.citations;
} else {
  // RAG Only: Use Claude
  const claudeResult = await generateResponse({
    queryText: params.queryText,
    assembledContext: multiHopContext,
    mode,
    conversationContext,
  });
  mhResponseText = claudeResult.responseText;
  mhCitations = claudeResult.citations;
}
```

Then update the downstream references (currently `claudeResult.responseText` and `claudeResult.citations`) to use `mhResponseText` and `mhCitations` instead.

### Secondary Consideration: Multi-hop context format compatibility

The multi-hop context uses a **different format** from the standard context:
- Standard: `## From:` headers + interleaved `[DocName] SectionTitle` sections
- Multi-hop: `## Original Question` + `## Sub-Questions Investigated` + `### From: DocName` per-document grouping

The LoRA multi-doc prompt injection (Fix 2) detects multi-doc via `assembledContext.includes('## From:')`. The multi-hop format uses `### From:` (3 hashes, not 2). Two options:

**Option A (minimal):** Change the detection regex in `generateLoRAResponse()` from `'## From:'` to also match `'### From:'`:
```typescript
const isLoRAMultiDoc = assembledContext.includes('## From:') || assembledContext.includes('### From:');
```

**Option B (thorough):** Normalize the multi-hop context to use the same `## From:` header format as the standard context. This requires changes to `assembleMultiHopContext()`.

**Recommendation:** Option A — minimal change, handles both formats.

---

## 5. Architecture State After Fix

```
Layer 1: classifyQuery        → FIXED ✅ (correctly classifies as comparative)
Layer 2: balanceMultiDoc      → WORKING (applied in multi-hop branch)
Layer 3: assembleContext       → FIXED ✅ (interleaving in standard path)
Layer 3b: assembleMultiHopCtx → WORKING (per-document grouping in comparative path)
Layer 4: generateResponse      → FIXED ✅ (strengthened multi-doc prompt)
Layer 5: generateLoRAResponse  → FIXED ✅ (multi-doc prompt added) BUT UNREACHABLE in comparative branch
Layer 6: selfEvaluate          → FIXED ✅ (correctly evaluates multi-doc completeness)
```

**After this fix:**
- Layer 5 becomes reachable in the comparative branch
- The LoRA model receives the multi-hop assembled context with multi-doc instruction
- The LoRA's trained emotional intelligence / personality is applied to the response

---

## 6. Retest Plan (After Fix)

1. **Deploy fix** (push to main)
2. **Submit margin call (Q1) in `rag_and_lora` mode** — verify:
   - `[LoRA-INFERENCE] Calling endpoint` log appears
   - Response has LoRA's emotional tone (warmer, more empathetic)
   - Both banks still addressed
3. **Submit Tuscany lockout (Q2) in `rag_and_lora` mode** — verify same
4. **Submit Q1 in `rag_only` mode** — regression check (should still use Claude, score 0.92)
5. **Compare Q1 `rag_only` vs `rag_and_lora` responses** — LoRA version should be noticeably warmer
6. **SAOL query** — confirm new records have mode=rag_and_lora and contain LoRA-style language

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| LoRA model may struggle with multi-hop context format (longer, more structured) | MEDIUM | The multi-hop context includes clear `### From:` headers and sub-question structure — most LLMs handle this well |
| LoRA response may not parse citations as cleanly as Claude | LOW | `parseCitationsFromText()` already handles best-effort citation extraction from LoRA output |
| RunPod serverless cold start may increase response time | LOW | Already handled — existing 300s Vercel timeout is sufficient |
| Multi-doc prompt injection (Fix 2) needs regex update for `### From:` | HIGH if not fixed | Include Option A regex fix alongside the routing fix |

---

**Last Updated:** 2026-02-21  
**Next Action:** Implement the mode-aware routing fix in the multi-hop branch + Option A regex update  
**Estimated Complexity:** Small — ~20 lines changed in one file  
**Risk Level:** Low — adds an existing code pattern (LoRA routing) to an existing branch
