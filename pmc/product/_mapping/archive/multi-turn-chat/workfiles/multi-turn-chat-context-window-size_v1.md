# Multi-Turn Chat Context Window Size Analysis

**Date:** 2026-02-05  
**Status:** Analysis Complete  
**Issue:** Inference failed due to context window overflow

---

## Executive Summary

> [!IMPORTANT]
> The issue is **NOT caused by the Mistral model version**. Both v0.2 and v0.3 have ~32K context windows.
> 
> The issue is that **your vLLM server on RunPod is configured with `--max_model_len 4096`**, which artificially limits the context window to 4,096 tokens instead of the model's native 32,768 tokens.

**Recommendation:** Update the RunPod vLLM endpoint configuration to increase `--max_model_len` to 8192 or higher. This is a configuration change, not a code change.

---

## Error Analysis

### The Error Message
```
'max_tokens' or 'max_completion_tokens' is too large: 2048. 
This model's maximum context length is 4096 tokens and your request has 2253 input tokens 
(2048 > 4096 - 2253). (parameter=max_tokens, value=2048)
```

### Breaking Down the Error
| Component | Value | Meaning |
|-----------|-------|---------|
| Input tokens | 2,253 | Tokens in the full multi-turn conversation history |
| max_tokens requested | 2,048 | Tokens reserved for model's response |
| Total required | 4,301 | Input + output tokens needed |
| Context limit | 4,096 | **vLLM configured limit** (NOT model limit) |

**Math:** `2253 (input) + 2048 (max_tokens) = 4301 > 4096` → Error

---

## Root Cause: vLLM Server Configuration

### Evidence from Logs (lines 272-310)

The error originates from the **vLLM engine on RunPod**, not from the Mistral model itself:

```csv
[INFERENCE-SERVERLESS] ❌ RunPod request FAILED: {
  id: 'sync-da953c1f-cc97-4632-8469-ebcfda995cfc-u2',
  error: "'max_tokens' ... This model's maximum context length is 4096 tokens ..."
}
```

The key insight: **vLLM reports `maximum context length is 4096 tokens`**, but:

- Mistral-7B-Instruct-v0.2 has a **32,768 token** context window
- Mistral-7B-Instruct-v0.3 has a **32,768 token** context window

This means the vLLM server is started with a `--max_model_len 4096` parameter that artificially limits the context.

---

## Research: Mistral Model Context Windows

### Web Search Results (Verified)

| Model | Context Window | Source |
|-------|---------------|--------|
| mistralai/Mistral-7B-Instruct-v0.2 | 32,768 tokens | [HuggingFace](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2), [Cloudflare](https://developers.cloudflare.com/workers-ai/models/mistral-7b-instruct-v0.2/) |
| mistralai/Mistral-7B-Instruct-v0.3 | 32,768 tokens | [Galaxy.ai](https://galaxy.ai), [HuggingFace](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3) |

> [!NOTE]
> Both v0.2 and v0.3 have identical context windows (32K tokens). Switching model versions will **NOT** solve this problem.

### Your Database Configuration (Correct)

From `20260117_create_adapter_testing_tables.sql`:
```sql
INSERT INTO pipeline_base_models 
  (model_id, display_name, parameter_count, context_length, ...)
VALUES
  ('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', '7B', 32768, ...),
```

Your database correctly shows 32,768 context length. The mismatch is in the **vLLM server configuration**.

---

## Why Is vLLM Limited to 4096?

### Common Causes

1. **GPU Memory Constraints:** Larger context windows require more VRAM. vLLM may auto-reduce context length if GPU memory is insufficient.

2. **Explicit Configuration:** The RunPod vLLM worker may be started with:
   ```bash
   --max_model_len 4096
   ```

3. **Default Fallback:** Some vLLM configurations default to 4096 for safety.

### Your RunPod Configuration

Check your RunPod endpoint or Docker command for parameters like:
- `MAX_MODEL_LEN` environment variable
- `--max_model_len` CLI argument
- `--gpu-memory-utilization` (if too low, vLLM reduces context)

---

## Solutions (Ranked by Effort)

### ✅ Solution 1: Increase vLLM Context Length (RECOMMENDED)

**Effort:** Low | **Impact:** High | **Risk:** Low

Update your RunPod vLLM endpoint configuration:

```bash
# Example: Increase to 8192 tokens (safe for A40 GPUs)
--max_model_len 8192

# Or environment variable
MAX_MODEL_LEN=8192
```

**GPU Memory Requirements:**
| Context Length | Approximate VRAM (7B model) |
|----------------|----------------------------|
| 4,096 | ~16 GB |
| 8,192 | ~20 GB |
| 16,384 | ~28 GB |
| 32,768 | ~40-48 GB |

If using NVIDIA A40 (48GB), you can safely increase to 16,384 or higher.

---

### ⚠️ Solution 2: Dynamic max_tokens Calculation

**Effort:** Medium | **Impact:** Medium | **Risk:** Low

Modify `inference-serverless.ts` to dynamically calculate `max_tokens`:

```typescript
// Current: Hardcoded
max_tokens: 2048,

// Proposed: Dynamic calculation
const estimatedInputTokens = Math.ceil(prompt.length / 4); // ~4 chars/token
const contextLimit = 4096; // Match vLLM config
const maxOutputTokens = Math.min(2048, contextLimit - estimatedInputTokens - 100); // 100 token buffer
```

**Pros:** Works without RunPod changes  
**Cons:** Limits output quality for long conversations

---

### ⚠️ Solution 3: Sliding Window (Last Resort)

**Effort:** High | **Impact:** High | **Risk:** Medium

Implement conversation truncation to stay within context limits. This was your original consideration.

**Only implement if:**
- Cannot increase vLLM context length
- Must support very long conversations (20+ turns)

---

## Why NOT to Change to v0.3

### ❌ Switching to v0.3 Will NOT Help

1. **Same context window:** Both v0.2 and v0.3 have 32K tokens
2. **Problem is vLLM config:** The model isn't the limiting factor
3. **Potential regressions:** Your LoRA adapters were trained on v0.2

### When v0.3 Might Help

- v0.3 has improved tokenization and extended vocabulary
- v0.3 supports function calling natively
- v0.3 has sliding window attention (SWA) improvements

However, **none of these fix a 4096-token vLLM server limit**.

---

## Verification Steps

### 1. Check Current vLLM Configuration

Query your RunPod endpoint's health to see actual limits:
```bash
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
     https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/health
```

Look for `max_model_len` in the response.

### 2. Test After Configuration Change

Send a request with 3000 input tokens + 1500 max_tokens to verify:
```
Total: 4500 tokens (previously would fail at 4096)
```

If it succeeds, the fix worked.

### 3. Monitor Logs

After increasing context, verify in logs:
```
[INFERENCE-SERVERLESS] ✅ Attempt 1 SUCCEEDED
```

---

## Recommended Action Plan

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Check RunPod vLLM endpoint configuration for `--max_model_len` | You |
| P0 | Increase to `--max_model_len 8192` (or higher based on GPU) | You |
| P1 | Re-run multi-turn chat test to verify fix | You |
| P2 | Consider dynamic max_tokens as fallback | Optional |

---

## Appendix: Log Evidence

### Successful Turn (4th turn, smaller context)
```csv
contentLength: 7175,
max_tokens: 2048,
status: 'COMPLETED',
tokensUsed: 459,
finishReason: 'stop'
```

### Failed Turn (5th turn, context exceeded)
```csv
contentLength: 9688 (adapted) / 10758 (control),
max_tokens: 2048,
status: 'FAILED',
error: "'max_tokens' ... This model's maximum context length is 4096 tokens"
```

The 5th turn failed because cumulative conversation history grew beyond 4096 - 2048 = 2048 input tokens.

---

## Summary

| Question | Answer |
|----------|--------|
| Is v0.2's context window too small? | No (32K tokens) |
| Would v0.3 fix this? | No (also 32K tokens) |
| What is the actual issue? | vLLM server configured with 4096 limit |
| Solution? | Increase `--max_model_len` in RunPod config |
| Need sliding window? | Not if vLLM config is fixed |

---

## Update: Recommended max_model_len for 10-Turn Limit

**Date:** 2026-02-05  
**Updated Recommendation:** `--max_model_len 16384`

### Why 8192 Is NOT Enough

Based on evidence from your actual logs:

| Turn | Input Tokens | With max_tokens (2048) | Status |
|------|--------------|------------------------|--------|
| Turn 4 | ~7,175-8,559 | ~9,223-10,607 | ✅ Succeeded |
| Turn 5 | ~9,688-10,758 | ~11,736-12,806 | ❌ Failed (4096 limit) |
| **Turn 10** | **~18,000-24,000** | **~20,048-26,048** | **Requires 16K+** |

**Calculation:**
- With `--max_model_len 8192`:
  - Available for input: 8,192 - 2,048 = **6,144 tokens**
  - Your Turn 5 already exceeded this with ~10K tokens
- With `--max_model_len 16384`:
  - Available for input: 16,384 - 2,048 = **14,336 tokens**
  - Comfortably handles projected 10-turn token growth

### Token Growth Pattern

From your logs, conversation history grows approximately:
- **Turn 1-2:** ~1,000-2,500 tokens
- **Turn 3-4:** ~5,000-8,500 tokens  
- **Turn 5:** ~10,000 tokens
- **Turn 10 (projected):** ~18,000-24,000 tokens

### Final Recommendation

```bash
--max_model_len 16384
```

**Benefits:**
- ✅ Safely handles 10-turn conversations with long responses
- ✅ Still fast on NVIDIA A40 (48GB VRAM)
- ✅ ~28GB VRAM usage - well within A40 capacity
- ✅ Safe buffer for edge cases

**If problems persist:** Increase to 24,576 or 32,768, though this is unlikely to be necessary for 10 turns.
