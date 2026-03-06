# 008 — RAG Module QA: Round 4 — LoRA Was Never Invoked (Mode Mismatch)

**Date:** 2026-02-21  
**Author:** Copilot (senior RAG engineer)  
**Status:** Root cause identified — not a code bug, but a test execution issue  
**Context:** User retested Q4 (Bitcoin/collapsing banking system) on new deployment `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM`. Multi-doc coverage works (both banks addressed, score 0.92). However, LoRA does not appear to add emotional intelligence. Investigation reveals: **no `rag_and_lora` query was submitted on the new deployment — both Q4 tests were `rag_only`.**

---

## 1. Key Finding: No LoRA Query Was Submitted

### Evidence from Vercel Logs (vercel-53.csv)

On the **new deployment** (`dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM`), only TWO queries were logged:

| Time (UTC) | Request ID | Mode | modelJobId | Question | Self-Eval |
|---|---|---|---|---|---|
| 19:37:06 | `c7tb7` | **rag_only** | **none** | "With the global banking system collapsing..." | 0.92 PASS |
| 19:37:13 | `bvghc` | **rag_only** | **none** | "With the global banking system collapsing..." | 0.92 PASS |

**Critical observations:**
- Both queries show `mode=rag_only modelJobId=none` in the log
- **ZERO `[LoRA-INFERENCE]` log entries** exist on the new deployment
- The two queries appear to be the same submission hitting both Vercel domains (`v2-modules.vercel.app` and `v2-modules-ozna2sgbo-...vercel.app`)

### Evidence from Database (SAOL)

All 9 records for KB `4fc8fa25`:

| # | Timestamp | Mode | Score | Question |
|---|---|---|---|---|
| 1 | 04:30:52 | rag_only | 0.95 PASS | Fee complaint |
| 2 | 05:21:20 | rag_only | 0.92 PASS | Margin call |
| 3 | 05:27:47 | **rag_and_lora** | 0.42 FAIL | Tuscany lockout (OLD deployment — LoRA WAS called) |
| 4 | 05:32:03 | rag_only | 0.42 FAIL | Tuscany lockout |
| 5 | 19:15:23 | rag_only | 0.92 PASS | Margin call (Round 3, T1) |
| 6 | 19:17:22 | **rag_and_lora** | 0.92 PASS | Margin call (Round 3, T2 — LoRA **bypassed**, old deployment) |
| 7 | 19:17:48 | **rag_and_lora** | 0.92 PASS | Margin call (Round 3, T3 — LoRA **bypassed**, old deployment) |
| 8 | 19:37:48 | **rag_only** | 0.92 PASS | Bitcoin Q4 (NEW deployment) |
| 9 | 19:37:55 | **rag_only** | 0.92 PASS | Bitcoin Q4 (NEW deployment) |

**Records #8 and #9** (the user's Q4 tests) are both `rag_only`. There is **no `rag_and_lora` record** on the new deployment.

---

## 2. Why the Results Look Identical (No Emotional Intelligence Difference)

The user compared:
- **Q4 on new deployment** (#8/#9): `rag_only` → Claude generates response → formal, informational tone
- **Round 3 rag_and_lora** (#6/#7): Although mode was `rag_and_lora`, LoRA was **bypassed** due to the comparative branch bug (fixed in commit `52b63bf`) → Claude generated these too → same formal tone

Both sets of responses were generated **entirely by Claude**. Neither invoked the LoRA model. That's why there's no difference in emotional intelligence.

### Proof: Comparing Response Openings

| Record | Mode | Opening Text | Generator |
|---|---|---|---|
| #3 (old deploy, LoRA called) | rag_and_lora | "David, I can hear how frustrating this situation is, and I appreciate you reaching out." | **LoRA** ✅ (warm, empathetic, personalized) |
| #6 (Round 3, LoRA bypassed) | rag_and_lora | "I understand your urgent concern about the margin call. The critical details depend on **which bank you use**..." | **Claude** (formal, clinical) |
| #8 (Q4, new deploy) | rag_only | "I understand your concerns about Bitcoin security and coercion protection. However, I must provide you with critical information..." | **Claude** (formal, clinical) |

Record #3 is the only one that actually passed through the LoRA model — and it's visibly different in tone (warm, uses client name, empathetic language). Records #6 and #8 are both Claude responses and read identically in tone.

---

## 3. Code Fix Verification: Fix IS Deployed and Correct

The comparative branch in `rag-retrieval-service.ts` (lines 1217-1237) **does** contain the correct mode-aware routing:

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
  const claudeResult = await generateResponse({...});
  mhResponseText = claudeResult.responseText;
  mhCitations = claudeResult.citations;
}
```

The fix from commit `52b63bf` **is present** in the deployed code. The `generateLoRAResponse` function also includes:
- Multi-doc detection for both `## From:` and `### From:` headers (Fix 5)
- Multi-doc instruction injection into the LoRA system prompt (Fix 2)
- The `[LoRA-INFERENCE]` log line that would confirm invocation

### LoRA Endpoint Status: Ready

The inference endpoint record in `pipeline_inference_endpoints`:

| Field | Value |
|---|---|
| endpoint_type | `adapted` |
| status | `ready` |
| runpod_endpoint_id | `virtual-inference-6fd5ac79-adapted` |
| adapter_path | `lora-models/adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz` |

The endpoint is available and was previously verified working (Record #3 at 05:27:47 produced a LoRA response).

### Frontend Mode Chain: No Bug Found

The mode selection chain was traced end-to-end:
1. `RAGChat.tsx` → `useState<RAGQueryMode>('rag_only')` — initial state
2. `ModeSelector.tsx` → `ToggleGroup` with three options (rag_only, lora_only, rag_and_lora)
3. `handleSubmit` → `mutateAsync({ mode, modelJobId: ... })` — passes state directly
4. `useRAGChat.ts` → `JSON.stringify(params)` → no transformation
5. `route.ts` → validates mode, defaults to `rag_only` if invalid
6. `rag-retrieval-service.ts` → `params.mode || 'rag_only'` fallback

No path exists where `rag_and_lora` silently becomes `rag_only`. The user must explicitly select the mode and model in the UI.

---

## 4. Root Cause

**The user submitted both Q4 queries as `rag_only`.** The LoRA model was not selected in the UI before submitting the Bitcoin/collapsing banking system question. This is confirmed by:

1. Vercel logs: `mode=rag_only modelJobId=none` for both requests
2. Database: both records stored as `mode=rag_only`
3. No `[LoRA-INFERENCE]` log entries on `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM`

The perception that "LoRA doesn't add emotional intelligence" is correct **for these specific queries** — because LoRA was never called. The code fix from `52b63bf` is correct but has not yet been tested with an actual `rag_and_lora` submission on the new deployment.

---

## 5. What Needs to Happen: Actual Round 4 Retest

The Round 4 retest plan from the context-carry document has **not yet been executed**. Here's what is needed:

### Retest Instructions

1. **Navigate to the RAG Chat UI** at `v2-modules.vercel.app/rag`
2. **Select the knowledge base** (4fc8fa25-...)
3. **Select "Chat with all documents"** mode
4. **CRITICAL: In the Mode Selector, click "RAG + LoRA"** — ensure the toggle shows `rag_and_lora` as active
5. **Select the LoRA model** from the model dropdown (job `6fd5ac79-...`)
6. **Submit the test query**

### Test Q1: Margin call in `rag_and_lora`
> "My broker just called and said my global equities took a massive hit and I'm facing a margin call! I am hyperventilating, I cannot lose my collateral! What is the exact maximum Loan-to-Value (LTV) ratio..."

**Expected behavior:**
- Vercel log shows: `mode=rag_and_lora modelJobId=6fd5ac79-...`
- Vercel log shows: `[LoRA-INFERENCE] Calling endpoint for job 6fd5ac79`
- Response has warm, empathetic tone (e.g., "I can hear how concerned you are..." NOT "I understand your concern")
- Both Sun Bank AND Moon Bank policies addressed
- Self-eval score ≥ 0.8

### Test Q2: Bitcoin in `rag_and_lora`
> "With the global banking system collapsing, I need to move a massive portion of my wealth into Bitcoin..."

Same expectations as Q1.

### Verification Steps

After each test:
1. **Check Vercel logs** for `[LoRA-INFERENCE] Calling endpoint` — this MUST appear
2. **Compare tone** with the existing rag_only responses (#8/#9) — LoRA version should be noticeably warmer
3. **Check SAOL** for the new record: `mode=rag_and_lora` and response text contains empathetic language
4. **Both banks addressed** — multi-doc coverage should remain ≥ 0.9

---

## 6. Architecture State (Unchanged from v3)

```
Layer 1: classifyQuery        → FIXED ✅ (correctly classifies as "comparative")
Layer 2: balanceMultiDoc      → WORKING ✅ (applied in both paths)
Layer 3: assembleContext       → FIXED ✅ (interleaving in standard path)
Layer 3b: assembleMultiHopCtx → WORKING ✅ (per-document grouping in comparative path)
Layer 4: generateResponse      → FIXED ✅ (strengthened multi-doc prompt)
Layer 5: generateLoRAResponse  → FIXED ✅ (multi-doc + reachable in comparative branch)
Layer 6: selfEvaluate          → FIXED ✅ (correctly evaluates multi-doc completeness)
```

All code fixes from Rounds 1-3 are deployed. The only missing piece is an actual `rag_and_lora` test execution on the current deployment.

---

## 7. Potential Risk: LoRA + Multi-Hop Context Length

When the actual `rag_and_lora` test runs, there's one risk to monitor:

The multi-hop context is significantly longer than standard context (includes original question, sub-questions, and per-document grouped evidence). The LoRA model (which runs on a smaller vLLM instance on RunPod serverless) may:
- Take longer to respond (cold start + long context processing)
- Truncate or lose quality at the end of long outputs
- Not follow the multi-doc structure as well as Claude

If the LoRA response quality is poor on the first `rag_and_lora` test, the issue will be the model's ability to handle multi-hop context, not the routing. The `[LoRA-INFERENCE]` log will confirm the endpoint was called.

---

## 8. Summary

| Finding | Status |
|---|---|
| Code fix deployed (commit `52b63bf`) | ✅ Confirmed in source |
| LoRA endpoint available | ✅ status=ready |
| Frontend mode chain | ✅ No bugs found |
| Q4 submitted as `rag_and_lora` | ❌ **Both queries were `rag_only`** |
| LoRA called on new deployment | ❌ **Never invoked** |
| Multi-doc coverage working | ✅ Score 0.92, both banks |
| Round 4 retest completed | ❌ **Needs actual `rag_and_lora` submission** |

**Bottom line:** The fix is deployed and correct. The test needs to be re-run with `rag_and_lora` mode explicitly selected in the UI.

---

**Last Updated:** 2026-02-21  
**Next Action:** Re-run Q1 and Q2 with `rag_and_lora` mode selected, verify `[LoRA-INFERENCE]` appears in logs  
**Estimated Effort:** 5 minutes (test execution only, no code changes needed)  
**Risk Level:** Low — code fix verified, just needs validation
