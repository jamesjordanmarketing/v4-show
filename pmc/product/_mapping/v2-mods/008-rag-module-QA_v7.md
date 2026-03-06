# 008 RAG Module QA — Round 7: Multi-Document LoRA Architectural Investigation

**Created**: February 22, 2026  
**Status**: Investigation Report & Specification — Ready for Implementation  
**Upstream**: `008-rag-module-QA_v5.md` (Round 6 — self-eval fixes; Fix A + Fix B)  
**Deployment Under Test**: `dpl_4vez6VtR8hVm8rNLsPQUZXdn6qhz`  
**Previous Deployment**: `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa`

---

## Executive Summary

Fix A (context parity) and Fix B (mode-aware self-evaluation) from Round 6 were deployed and tested with 3 queries. The results confirm that the self-evaluation is now correctly identifying bad LoRA responses (scores 0.35 and 0.50 instead of the biased 0.15), and RAG-only Claude produces excellent multi-document answers (score 0.92). However, **the LoRA model itself still produces single-document answers despite receiving multi-document context**.

This investigation identified **5 root causes** spanning vLLM configuration, context assembly format, model capability limits, self-eval parsing bugs, and observability gaps. The core finding is: even if you send a perfect multi-document context to a 7B LoRA model, the context structure actively prevents the model from knowing which section belongs to which document.

---

## 1. Test Results — Post-Fix A/B Deployment

### 1.1 Queries Executed (newest first)

| # | Query ID | Mode | Score | Passed | Time | Tokens | Key Finding |
|---|----------|------|-------|--------|------|--------|-------------|
| 1 | `d4081fe1` | `rag_only` | 0.92 | YES | 23s | — | Correct multi-doc answer. Claude references both Sun-Chip and Moon-Banc with accurate data. |
| 2 | `16c55a6c` | `rag_and_lora` | 0.35 | NO | 212s | 445 | Margin call query. LoRA only addresses Moon-Banc (60% LTV, 4 hours). Hallucinated "105% margin call threshold". Does NOT mention Sun-Chip. |
| 3 | `4990b81a` | `rag_and_lora` | 0.50 | NO | 215s | 410 | Bitcoin/custody query. LoRA only addresses Moon-Banc. Confuses Sun-Chip concepts (BCCC ceremony) with Moon-Banc. Says "max LTV is 30%". |

### 1.2 Comparison: Same Question, Two Modes

**Margin Call Query** — "My broker just called and said my global equities took a massive hit and I'm facing a margin call!"

| Aspect | RAG-Only (Claude) | LoRA (Mistral-7B) |
|--------|-------------------|-------------------|
| Documents referenced | Sun-Chip AND Moon-Banc | Moon-Banc ONLY |
| Sun-Chip LTV (50%) | Correct | Missing |
| Moon-Banc LTV (60%) | Correct | Correct |
| Sun-Chip cure time (24h) | Correct | Missing |
| Moon-Banc cure time (4h) | Correct | Correct |
| Hallucinations | None | "105% margin call threshold" |
| Response length | 2,794 chars | 1,882 chars |
| Response time | 23s | 212s |
| Self-eval score | 0.92 | 0.35 |

### 1.3 Key Observations

1. **Fix A works**: No `[LoRA-INFERENCE] Context too large` warnings in new deployment logs. Context assembly respects the 29,000-token budget. Bitcoin query: ~23,850 tokens assembled. Margin call query: ~20,682 tokens assembled.
2. **Fix B works**: Self-eval now correctly detects single-document answers. Margin call LoRA scored 0.35 (was 0.15 pre-fix). Self-eval reasoning: "The response contains multiple critical factual errors that directly contradict the retrieved context. (1) HALLUCINATION - LTV THRESHOLD: The response..."
3. **The problem is the LoRA model itself**: It receives multi-document context but produces single-document answers. The root causes are below.

---

## 2. Root Cause Analysis

### ROOT CAUSE 1 (CRITICAL): Context Assembly Structure Breaks Document–Section Association

**File**: `src/lib/rag/services/rag-retrieval-service.ts` lines 971–1087  
**Function**: `assembleMultiHopContext()`

The assembled context sent to LoRA has a **fatal structural flaw**: document headers are disconnected from their sections.

**What the code produces:**
```
## Evidence from Documents

### From: Sun-Chip Bank

### From: Moon-Banc

#### Maximum LTV Ratio for Equities [similarity: 0.889]
Context: Margin lending policies for Sun-Chip Bank...
The maximum LTV ratio for equities is 50%...

#### Margin Call Policies [similarity: 0.876]
Context: Moon-Banc margin call procedures...
The maximum LTV ratio for equities is 60%...

#### Cure Period for Margin Calls [similarity: 0.854]
Context: Sun-Chip Bank liquidation timelines...
Clients have 24 hours to cure a margin call...

#### Forced Liquidation Triggers [similarity: 0.841]
Context: Moon-Banc enforcement policies...
Clients have 4 hours to cure a margin call...
```

**The problem**: The `### From:` headers are emitted as a block (lines 1030–1034), then ALL sections are emitted in round-robin order (lines 1037–1052). **Sections have no per-section document attribution**. The model cannot determine which section came from which document.

**Code evidence** (lines 1028–1054):
```typescript
// Emit per-doc headers first (DISCONNECTED from sections!)
for (const [docId] of docEntries) {
    const docName = params.documentNames.get(docId) || docId;
    const docHeader = `\n### From: ${docName}`;
    sectionParts.push(docHeader);
}

// Round-robin emission — sections NOT nested under doc headers
const emittedSections: string[] = [];
for (let round = 0; round < maxRounds && !truncated; round++) {
    for (const [, docSections] of docEntries) {
        // ... sections pushed to flat emittedSections array
    }
}
sectionParts.push(...emittedSections);  // All sections after all headers
```

**Impact**: Even a capable model would struggle with this structure. For Mistral-7B (a 7B model), it's virtually impossible to map sections to documents without explicit attribution. The model defaults to treating all context as a single source and picks the first set of facts it encounters.

**Fix**: Restructure output to nest sections under their document headers, OR add `[Source: DocName]` tags to each section.

---

### ~~ROOT CAUSE 2~~: vLLM MAX_MODEL_LEN — **RESOLVED / CONFIRMED CORRECT**

**Status**: ✅ Verified by user on Feb 22, 2026. Not a root cause.

**User-provided RunPod env vars confirm:**
```
MAX_MODEL_LEN=32768
GPU_MEMORY_UTILIZATION=0.96
MAX_TOKENS=2048
DEFAULT_MAX_TOKENS=2048
```

**RunPod log evidence** (`runpod-log-v7.txt`) confirms both latest workers operate at 32768:
```
Worker 5kukcbiwidus2b: max_model_len=32768, max_seq_len=32768
Worker im6p1h4tcwsjl9: max_model_len=32768, max_seq_len=32768
GPU KV cache: 480,080 tokens (plenty)
Maximum concurrency for 32,768 tokens per request: 14.65x
```

**Historical progression** from the log:
- Feb 18–21: `max_model_len=16384` (older workers)
- Feb 22 (latest): `max_model_len=32768` ✅

The earlier `runpod-logs-48.txt` showing `4096` was from Feb 3 and is obsolete.

**Sliding window observation**: All workers show `disable_sliding_window=False`. Mistral-7B uses sliding window attention (4096-token window per layer). This is the model's native architecture and works for 20K+ context through layer stacking (32 layers × 4096 = 131K effective receptive field). Not a blocking issue, but adding `DISABLE_SLIDING_WINDOW=true` to the RunPod env vars would give slightly better long-range attention at the cost of higher KV cache memory usage.

**Conclusion**: Root Causes 1 (context structure) and 3 (model capability) are the primary issues.

---

### ROOT CAUSE 3 (SIGNIFICANT): Mistral-7B LoRA Lacks Multi-Document Synthesis Capability

**Fundamental capability gap:**

| Capability | Claude Haiku 4.5 | Mistral-7B-Instruct-v0.2 + LoRA |
|-----------|-------------------|----------------------------------|
| Parameters | ~20B+ | 7B |
| Context window (native) | 200K tokens | 32K (sliding window) |
| Long-context accuracy | Excellent to ~100K | Degrades significantly after ~4K |
| Multi-doc synthesis | Native capability | Not trained for this |
| Instruction following | Strong | Moderate — may ignore complex prompts |
| Training data | Multi-doc comparisons included | Single-document conversations only |

**Key research finding**: 7B models suffer severely from the "lost in the middle" problem (Liu et al., 2023). Information placed in the middle of long contexts is often ignored. With 20K+ tokens of context and round-robin interleaved sections, the model likely attends primarily to the beginning (system prompt + first few sections) and the end (question portion), missing critical middle sections.

**Training data mismatch**: The LoRA adapter was fine-tuned on conversation data generated from individual documents. The training examples never included multi-document comparative tasks like "Compare Bank A's margin call policy with Bank B's." The model has no learned behavior for structured cross-document comparisons.

**Evidence**: Even with the `CRITICAL: You MUST address EACH document` system prompt instruction, the LoRA model consistently ignores it and addresses only one document. This is characteristic of instruction-following limitations in smaller models, especially when the instruction competes with the dominant pattern in the fine-tuning data (single-document responses).

---

### ROOT CAUSE 4 (MODERATE): Self-Eval JSON Parse Failure

**File**: `src/lib/rag/providers/claude-llm-provider.ts` → `parseJsonResponse()`  
**File**: `src/lib/rag/services/rag-retrieval-service.ts` line 893

**Bitcoin query self-eval** (request ID `575zz`) failed with:
```
[RAG Retrieval] Self-eval JSON parse failed, returning default low-confidence result: 
Error: Failed to parse JSON response from Claude (selfEvaluate). 
Error: Unexpected token '`', "```json
```

**Expected behavior**: `parseJsonResponse()` has a fallback that finds the first `{` and last `}` in the response, which should strip markdown code fences. But this fallback also failed.

**Possible causes**:
1. Claude returned a truncated JSON response (self-eval `max_tokens: 800` may have been insufficient for a complex LoRA evaluation with long reasoning)
2. Claude returned JSON wrapped in triple backticks with no actual `{` inside (an edge case where Claude narrates rather than outputs JSON)
3. The response contained nested backticks or other characters that confused the boundary extraction

**Impact**: The Bitcoin LoRA query received a default `score: 0.50` instead of a real evaluation. This means we don't know its true self-eval score. If the evaluator had succeeded, it likely would have scored lower given the single-document answer with cross-document entity confusion.

**Fallback behavior** (line 893):
```typescript
catch (parseErr) {
    console.warn('[RAG Retrieval] Self-eval JSON parse failed...', parseErr);
    return { passed: false, score: 0.5 };
}
```

---

### ROOT CAUSE 5 (MODERATE): No Visibility Into vLLM Input Truncation

**File**: `src/lib/services/inference-serverless.ts` line 555

```typescript
tokensUsed = usage.completion_tokens || usage.output || 0;
```

The code only tracks **completion tokens** — the output generated by the model. It does NOT track `prompt_tokens` (how many input tokens vLLM actually processed).

**Impact**: We cannot determine whether vLLM truncated the input. The logged `tokensUsed: 445` for the margin call query tells us the model generated 445 output tokens, but we have no idea whether vLLM processed all 20,682 input tokens or silently truncated to a fraction.

**Missing data**: If `usage.prompt_tokens` were tracked and logged, we would immediately know:
- Whether vLLM is receiving the full context
- Whether vLLM is truncating (prompt_tokens << estimated input tokens)
- The actual token ratio between input and output

---

## 3. Secondary Issues

### ISSUE A: LoRA Generates Fewer Tokens Than Needed

| Metric | LoRA (Margin Call) | Claude (Margin Call) |
|--------|-------------------|---------------------|
| Completion tokens | 445 | ~700 (estimated) |
| Response chars | 1,882 | 2,794 |
| Documents covered | 1 | 2 |

The LoRA model stops generating well before `max_tokens: 2048`. This isn't a configuration problem — Mistral-7B's fine-tuned behavior produces concise, single-topic responses. A comprehensive multi-document answer requires more tokens than the model naturally generates.

### ISSUE B: `wasPotentiallyTruncated` Not Propagated

**File**: `src/lib/services/inference-serverless.ts` lines 561–569

The truncation detection flag is computed and logged but NOT returned to the calling code:

```typescript
const wasPotentiallyTruncated = !endsWithSentenceTerminator || finishReason === 'length';
// ... logged but return type is { response, generationTimeMs, tokensUsed } — no truncation flag
```

If the LoRA output hits `max_tokens`, the pipeline has no mechanism to detect, retry, or warn the user.

### ISSUE C: 200+ Second Latency for LoRA Queries

RunPod serverless cold-start → queue → processing pipeline:
```
00:46:08  Request submitted
00:47:38  Initial response: IN_QUEUE (90s delay to RunPod)
00:47:43  Poll 1: IN_QUEUE
  ... 18 polls IN_QUEUE (90 seconds)
00:49:14  Poll 19: IN_PROGRESS (worker processing)
00:49:24  Poll 21: COMPLETED
```

Total: **196 seconds from submission to completion** (+ 16 seconds of app-level overhead = 212s total).

By comparison, RAG-only Claude completes in **23 seconds**. The LoRA path is **9x slower** with worse results.

---

## 4. Fixes — Prioritized Implementation Plan

### Fix 1 (CRITICAL): Restructure Context Assembly for Document Attribution

**File**: `src/lib/rag/services/rag-retrieval-service.ts`  
**Function**: `assembleMultiHopContext()` lines 1028–1054

**Problem**: Sections are emitted in a flat list after disconnected document headers.

**Solution**: Nest sections under their document headers. Group round-robin output by document.

**New output structure:**
```
## Evidence from Documents

### From: Sun-Chip Bank

#### Maximum LTV Ratio for Equities [similarity: 0.889]
Context: Margin lending policies for Sun-Chip Bank...
The maximum LTV ratio for equities is 50%...

#### Cure Period for Margin Calls [similarity: 0.854]
Context: Sun-Chip Bank liquidation timelines...
Clients have 24 hours to cure a margin call...

### From: Moon-Banc

#### Margin Call Policies [similarity: 0.876]
Context: Moon-Banc margin call procedures...
The maximum LTV ratio for equities is 60%...

#### Forced Liquidation Triggers [similarity: 0.841]
Context: Moon-Banc enforcement policies...
Clients have 4 hours to cure a margin call...
```

**Implementation approach**:
1. Keep the round-robin selection (for balanced truncation under budget)
2. But accumulate selected sections into **per-document buckets** instead of a flat list
3. Emit sections grouped under their document header
4. Additionally tag each section with `[Source: DocName]` as a redundant signal

**Code change** (conceptual):
```typescript
// After round-robin selection, group by document for emission
const selectedByDoc = new Map<string, string[]>();
for (let round = 0; round < maxRounds && !truncated; round++) {
    for (const [docId, docSections] of docEntries) {
        if (round >= docSections.length) continue;
        const section = docSections[round];
        const docName = params.documentNames.get(docId) || docId;
        const sectionText = `#### ${section.title} [Source: ${docName}] [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
        // ... budget check ...
        const existing = selectedByDoc.get(docId) || [];
        existing.push(sectionText);
        selectedByDoc.set(docId, existing);
    }
}

// Emit grouped under headers
for (const [docId, sections] of selectedByDoc.entries()) {
    const docName = params.documentNames.get(docId) || docId;
    sectionParts.push(`\n### From: ${docName}`);
    sectionParts.push(...sections);
}
```

**Effort**: Small (1 function, ~30 lines changed)  
**Impact**: HIGH — this is the only fix that directly addresses why the model answers from one document only

---

### Fix 2: ~~Verify and Update vLLM MAX_MODEL_LEN~~ — **RESOLVED**

**Status**: ✅ Confirmed `MAX_MODEL_LEN=32768` on Feb 22, 2026. No action needed.

**Optional optimization**: Add `DISABLE_SLIDING_WINDOW=true` to RunPod env vars to give the model full attention over the entire context instead of 4096-token sliding windows per layer. This uses more KV cache but improves long-range attention. Your A40 with 480K KV cache tokens has ample headroom.

---

### Fix 3 (IMPORTANT): Track and Log Prompt Tokens

**File**: `src/lib/services/inference-serverless.ts` line 555

**Current:**
```typescript
tokensUsed = usage.completion_tokens || usage.output || 0;
```

**New:**
```typescript
const promptTokens = usage.prompt_tokens || 0;
const completionTokens = usage.completion_tokens || usage.output || 0;
tokensUsed = completionTokens; // Keep existing field for backward compat

console.log('[INFERENCE-SERVERLESS] Token usage:', {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedInputTokens: messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0),
    inputRatio: promptTokens > 0 
        ? `${((promptTokens / messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)) * 100).toFixed(1)}%`
        : 'unknown',
});
```

Also update the return type to include `promptTokens`:
```typescript
return {
    response: responseText,
    generationTimeMs,
    tokensUsed,
    promptTokens, // NEW: enables upstream truncation detection
};
```

**Effort**: Small (5 lines)  
**Impact**: HIGH for diagnostics — immediately reveals whether vLLM is truncating input

---

### Fix 4 (IMPORTANT): Harden Self-Eval JSON Parsing

**File**: `src/lib/rag/providers/claude-llm-provider.ts` → `parseJsonResponse()`

**Add explicit markdown code fence stripping before the fast-path parse:**

```typescript
function parseJsonResponse<T>(text: string, context?: string): T {
    let cleaned = text.trim();
    
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    cleaned = cleaned.trim();
    
    // Fast path: try direct JSON.parse
    try { return JSON.parse(cleaned) as T; } catch { /* fallback */ }
    
    // ... existing boundary extraction fallback ...
}
```

Also increase `max_tokens` for self-eval from 800 to 1200 to prevent truncated JSON from complex evaluations:

```typescript
// In selfEvaluate(), line ~458:
maxTokens: 1200,  // Was 800 — increase for complex LoRA multi-doc evaluations
```

**Effort**: Small (3 lines)  
**Impact**: Eliminates false 0.50 default scores from parse failures

---

### Fix 5 (MODERATE): Propagate Truncation Detection

**File**: `src/lib/services/inference-serverless.ts`

Return `wasPotentiallyTruncated` from the inference call:

```typescript
return {
    response: responseText,
    generationTimeMs,
    tokensUsed,
    promptTokens,
    wasPotentiallyTruncated,  // NEW
};
```

**File**: `src/lib/rag/services/rag-retrieval-service.ts` → `generateLoRAResponse()`

When `wasPotentiallyTruncated` is true, log a warning and optionally append a note:

```typescript
if (result.wasPotentiallyTruncated) {
    console.warn('[LoRA-INFERENCE] Response may be truncated — model may not address all documents');
}
```

**Effort**: Small  
**Impact**: Better observability; future foundation for retry logic

---

## 5. Architectural Recommendations (Longer-Term)

### 5.1 Claude Post-Processing for LoRA Responses

Given Mistral-7B's fundamental limitations with multi-document synthesis, consider a **hybrid architecture**:

1. LoRA generates its response (single-document, with fine-tuned personality/tone)
2. Claude receives the LoRA response + full multi-document context
3. Claude enriches/corrects the LoRA response, filling in missing document perspectives while preserving the LoRA's trained communication style

This preserves the LoRA's value (trained tone, institutional knowledge) while leveraging Claude's superior reasoning for multi-document tasks.

**Trade-off**: Additional latency (~5s for Claude call) and cost, but dramatically better multi-doc coverage.

### 5.2 Multi-Document LoRA Fine-Tuning Data

If the LoRA model needs to handle multi-document queries natively:

1. Generate synthetic training examples that include multi-document contexts
2. Include "Compare Document A with Document B" style Q&A pairs
3. Include examples with the exact `### From: DocName` + nested section format
4. Re-train the LoRA adapter with this augmented dataset

**Trade-off**: Requires training pipeline changes and GPU time, but produces a model that natively handles multi-doc queries.

### 5.3 Dynamic Context Budget Based on vLLM Configuration

Instead of hard-coding `loraMaxContextTokens: 29000`, query the vLLM endpoint for its `max_model_len` at startup:

```typescript
// Pseudo-code
const vllmConfig = await fetch(`${RUNPOD_API_URL}/health`);
const maxModelLen = vllmConfig.max_model_len || 4096;
const effectiveBudget = maxModelLen - 2048 - 500; // output + system + overhead
RAG_CONFIG.retrieval.loraMaxContextTokens = effectiveBudget;
```

This prevents the mismatch between app-level budget (29,000) and vLLM-level limit (potentially 4,096).

### 5.4 Reduce LoRA Context Budget for Model Effectiveness

Even if vLLM accepts 29,000 tokens, Mistral-7B doesn't effectively use them. Research suggests 7B models perform best with 2,000–8,000 tokens of context. Consider:

- Setting `loraMaxContextTokens` to 8,000 (still multi-doc, but within the model's effective range)
- Increasing section relevance threshold to send fewer, higher-quality sections
- Prioritizing breadth (at least 1 section per document) over depth (many sections from one document)

---

## 6. Implementation Priority Matrix

| # | Fix | Effort | Impact | Priority | Status |
|---|-----|--------|--------|----------|--------|
| 1 | Restructure context assembly (nest sections under doc headers) | Small | Critical | P0 | ✅ IMPLEMENTED |
| 2 | ~~Verify/update vLLM MAX_MODEL_LEN~~ | Config only | Critical | P0 | ✅ RESOLVED (32768 confirmed) |
| 3 | Track prompt_tokens from vLLM | Small | High (diagnostics) | P1 | ✅ IMPLEMENTED |
| 4 | Harden self-eval JSON parsing | Small | Medium | P1 — Do with Fix 1 |  |
| 5 | Propagate wasPotentiallyTruncated | Small | Medium | P2 — Follow-up |  |
| 6 | Claude post-processing for LoRA (hybrid) | Medium | High | P2 — After measuring Fix 1 |  |
| 7 | Multi-doc LoRA training data | Large | High | P3 — Long-term |  |
| 8 | Dynamic context budget from vLLM | Medium | Medium | P3 — Long-term |  |

**Recommended next deployment**: Fix 1 + Fix 3 + Fix 4 (all small code changes, no config dependency). Then test again. Fix 2 requires the user to verify/update RunPod configuration.

---

## 7. Diagnostic Data Reference

### 7.1 Vercel Log Entries (New Deployment)

**Margin Call LoRA Query** (request `4nqb9`, query `16c55a6c`):
```
00:46:00  [RAG Retrieval] Query mode=rag_and_lora
00:46:01  Query classified as: comparative (3 sub-queries)
00:46:07  Hybrid search: vector=40, bm25=1
00:46:08  [assembleMultiHopContext] Assembled ~20682 tokens (budget: 29000)  ← NO truncation
00:46:08  [LoRA-INFERENCE] Calling endpoint for job 6fd5ac79
00:46:08  Message roles validated: { messageCount: 2, roles: ['system', 'user'] }
00:46:08  Using pre-loaded adapter: adapter-6fd5ac79
00:47:38  Initial RunPod response: IN_QUEUE
00:47:43–00:49:09  Polls 1–18: IN_QUEUE (90 seconds waiting)
00:49:14  Poll 19: IN_PROGRESS
00:49:24  Poll 21: COMPLETED
00:49:24  Extracted response: { responseLength: 1882, tokensUsed: 445, wasPotentiallyTruncated: false }
00:49:31  [RAG Self-Eval] score=0.35 passed=false reasoning="...critical factual errors..."
00:49:32  Multi-hop query complete in 211907ms
```

**Bitcoin LoRA Query** (request `575zz`, query `4990b81a`):
```
00:41:35  [RAG Retrieval] Query mode=rag_and_lora
00:41:36  Query classified as: comparative (3 sub-queries)
00:41:42  [assembleMultiHopContext] Assembled ~23850 tokens (budget: 29000)  ← NO truncation
00:41:42  [LoRA-INFERENCE] Calling endpoint for job 6fd5ac79
00:44:58  Extracted response: { responseLength: 1752, tokensUsed: 410, wasPotentiallyTruncated: false }
00:45:07  [RAG Retrieval] Self-eval JSON parse failed ← BUG: Claude returned ```json fenced response
00:45:07  Multi-hop query complete in 214955ms
```

**RAG-Only Margin Call** (request `zhkjf`, query `d4081fe1`):
```
00:50:48  [RAG Retrieval] Query mode=rag_only
00:50:50  Query classified as: comparative (3 sub-queries)
00:50:55  [assembleMultiHopContext] Assembled ~18531 tokens (budget: unlimited)
00:51:11  [RAG Self-Eval] score=0.92 passed=true reasoning="well-grounded...addresses both documents"
00:51:11  Multi-hop query complete in 23126ms
```

### 7.2 vLLM Configuration — CONFIRMED

**RunPod env vars** (user-confirmed Feb 22, 2026):
```
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
MAX_MODEL_LEN=32768
GPU_MEMORY_UTILIZATION=0.96
ENABLE_LORA=true
MAX_LORAS=1
MAX_LORA_RANK=16
TENSOR_PARALLEL_SIZE=1
MAX_NUM_SEQS=256
DEFAULT_MAX_TOKENS=2048
MAX_TOKENS=2048
```

**RunPod log** (`runpod-log-v7.txt`) confirms:
- Latest workers: `max_model_len=32768`, `max_seq_len=32768`
- GPU KV cache: 480,080 tokens
- `disable_sliding_window=False` (Mistral's native sliding window active)
- vLLM v0.15.0, A40 48GB, torch.bfloat16

Old `runpod-logs-48.txt` (Feb 3) showing `max_model_len=4096` is obsolete.

### 7.3 LoRA Response Analysis

**Bitcoin query response** (score 0.50):
- Mentions Moon Banc only
- Incorrectly attributes Sun Chip's "Bitcoin Collateral Confirmation Ceremony (BCCC)" TO Moon Banc
- States "maximum LTV is 30%" (Moon Banc data only)
- Does NOT mention Sun-Chip Bank AT ALL
- Evidence of cross-document entity confusion (model can't distinguish document boundaries)

**Margin call query response** (score 0.35):
- States "maximum LTV ratio for equities is 60%" (Moon Banc only — Sun Chip's is 50%)
- States "4 hours to cure" (Moon Banc only — Sun Chip allows 24 hours)
- Hallucinated "105% margin call threshold" (not in any document)
- Does NOT mention that policies differ between banks
- Does NOT mention Sun-Chip Bank at all

---

## 8. Files Modified in This Round

**Round 7 code changes (implemented):**
- `src/lib/rag/services/rag-retrieval-service.ts` — **Fix 1**: Restructured `assembleMultiHopContext()` to nest sections under their document headers instead of emitting disconnected headers then flat sections
- `src/lib/services/inference-serverless.ts` — **Fix 3**: Added prompt token tracking and logging

**Round 7 config resolution:**
- RunPod serverless endpoint — **Fix 2**: Confirmed `MAX_MODEL_LEN=32768` (no change needed)

**Files modified in Round 6 (Fix A + Fix B):**
- `src/lib/rag/config.ts` — `loraMaxContextTokens: 29000`
- `src/lib/rag/services/rag-retrieval-service.ts` — effectiveContext return, mode passing
- `src/lib/rag/providers/claude-llm-provider.ts` — mode-aware selfEvaluate, Array.from fix
- `src/lib/rag/providers/llm-provider.ts` — interface `mode?: string` param

**Files to modify for Round 7 fixes:**
- `src/lib/rag/services/rag-retrieval-service.ts` — Fix 1 (context assembly restructure)
- `src/lib/services/inference-serverless.ts` — Fix 3 (prompt token tracking), Fix 5 (truncation propagation)
- `src/lib/rag/providers/claude-llm-provider.ts` — Fix 4 (JSON parsing hardening)
- RunPod serverless template — Fix 2 (MAX_MODEL_LEN verification/update)
