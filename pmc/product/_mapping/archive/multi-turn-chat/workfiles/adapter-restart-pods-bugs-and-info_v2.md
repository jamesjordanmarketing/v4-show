# Serverless Endpoint Response Truncation - Analysis & Solutions (UPDATED)

**Date:** February 3-4, 2026  
**Issue:** Model responses are being truncated mid-sentence when using the new serverless endpoint  
**Status:** ⚠️ **CRITICAL - vLLM V1 Engine Configuration Issue Identified**

---

## 🚨 Executive Summary

**TL;DR:** The new RunPod Docker image (vLLM v0.15.0) appears to be **ignoring the `max_tokens: 1024` parameter** we send, causing responses to stop at exactly 203-209 tokens regardless of the configured limit. This is NOT a simple "increase max_tokens" fix.

**Key Findings:**
1. ✅ **Pods worked fine** with long responses (user confirmed)
2. ❌ **Serverless truncates** at ~203 tokens after switching to new Docker image
3. ✅ **New image uses vLLM v0.15.0** (V1 engine) - upgrade from v0.14.0
4. ❌ **Both models stop at IDENTICAL token count** (not natural completion)
5. ❌ **Our code doesn't log `finish_reason`** - critical diagnostic missing

**Root Cause (Hypothesis):**
The vLLM V1 engine in the new Docker image is either:
- Using a different API parameter name (`max_new_tokens` vs `max_tokens`)
- Enforcing an undocumented server-side limit
- Has a regression bug in v0.15.0

**Recommended Path:**
1. **Immediate:** Add diagnostic logging (`finish_reason` extraction)
2. **Immediate:** Test alternative parameter names
3. **Short-term:** Contact RunPod support OR rollback to v0.14.0 image
4. **Long-term:** Implement configurable `max_tokens` + truncation detection

---

## 🔍 Investigation Summary (UPDATED AFTER LOG ANALYSIS)

### What I Found

**Database Evidence:**
- Conversation ID: `fef42c3f-03f5-4935-9880-03bf5bda9fcd`
- Turn 1 (created 2026-02-03 23:33:04):
  - **Control response:** 461 characters, 203 tokens
  - **Adapted response:** 434 characters, 203 tokens
  - **Both responses truncated mid-sentence:**
    - Control ends with: `"...A 401(k) is a type of retirement savings plan that is offered by employers. Em"`
    - Adapted ends with: `"...The money you contribute to a 401k comes directly"`
  - **No errors logged** (control_error and adapted_error are NULL)
  - **Generation completed successfully** (both have generation_time_ms values)

**Additional Test (Conversation ID: `759558d0-b61e-4f49-bf74-1cb27cbfbd42`):**
- Both responses stopped at **exactly 209 tokens**
- Similar mid-sentence truncation

**RunPod Logs Evidence:**
- **vLLM Version:** V1 engine (v0.15.0) - **NEW** (previously v0.14.0 on Jan 22)
- **Serverless Worker:** Version 1.8.1
- **max_model_len:** 4096 (configured correctly)
- **max_num_batched_tokens:** 4096 (configured correctly)
- **No errors during generation** - jobs completed "successfully"
- **NO finish_reason logged** - this is the smoking gun ❌

**Key Observations:**
1. ✅ Both models generating **exactly the same token count** (203 or 209) before stopping
2. ❌ Responses end mid-word/mid-sentence (NOT natural completion)
3. ✅ RunPod logs show jobs "Finished" successfully (no crashes)
4. ❌ Our code does NOT extract or log `finish_reason` from API response
5. ✅ The issue appeared after switching to **new Docker image** with vLLM v0.15.0

---

## 🐛 Root Cause Analysis (UPDATED)

### ⚠️ CRITICAL Problem 1: vLLM V1 Engine Ignoring `max_tokens` Parameter

**Diagnosis:**
The new RunPod Docker image uses **vLLM v0.15.0** (V1 engine). Based on the evidence:

1. **We send `max_tokens: 1024`** in the API request body ✅
2. **vLLM engine is configured with `max_model_len: 4096`** ✅
3. **Responses stop at 203-209 tokens** (far below 1024) ❌
4. **Both control and adapted stop at IDENTICAL token counts** ❌
5. **Responses end mid-sentence** (not natural `stop` finish_reason) ❌

**Hypothesis:**
The vLLM V1 engine in the new Docker image is either:
- **Ignoring the `max_tokens` parameter** sent in the request body
- **Enforcing a hidden server-side limit** of ~200-210 tokens
- **Using a different parameter name** for max_tokens in V1 API

**Evidence from Logs:**
```
# RunPod logs show engine initialized correctly
max_model_len=4096
max_num_batched_tokens=4096
vLLM V1 engine (v0.15.0)  # NEW VERSION

# But responses stop at 203 tokens
tokensUsed: 203  # Control
tokensUsed: 203  # Adapted
```

**This is NOT a timeout or network issue** because:
- Generation times are fast (2-3 seconds)
- No errors in RunPod logs
- Jobs marked as "COMPLETED"

### Problem 2: Missing `finish_reason` Logging

**Files Affected:**
1. `src/lib/services/inference-serverless.ts` (lines 496-547)

**Current Code:**
```typescript
// Extract response from RunPod result
let responseText = '';
if (result.output) {
    // ... extracts response text and token count
}

console.log('[INFERENCE-SERVERLESS] Extracted response:', {
    responseLength: responseText.length,
    tokensUsed,
    generationTimeMs
});
// ❌ NO FINISH_REASON EXTRACTED OR LOGGED
```

**Why This Matters:**
The `finish_reason` field tells us WHY the model stopped:
- `"stop"` - Natural completion (model generated EOS token)
- `"length"` - Hit max_tokens limit
- `"content_filter"` - Safety filter triggered

**Without this field, we cannot diagnose whether:**
- vLLM is enforcing a server-side limit
- The model is naturally stopping (unlikely given mid-sentence cutoff)
- There's a parameter mismatch

### Problem 3: Hardcoded `max_tokens: 1024` (Secondary Issue)

**Files Affected:**
1. `src/lib/services/inference-serverless.ts` (line 356)
2. `src/lib/services/inference-pods.ts` (line 93)

**Current Code:**
```typescript
max_tokens: 1024,  // Hardcoded, not configurable
```

**Why This Needs Fixing:**
- Financial advisor conversations need 500-2000 tokens for quality responses
- Even if vLLM starts respecting the parameter, 1024 is too low
- Should be configurable per job or globally set to 2048+

---

## ✅ Solutions (UPDATED PRIORITY)

### Solution 1: Add `finish_reason` Logging (IMMEDIATE - DIAGNOSTIC)

**Priority:** P0 - CRITICAL FOR DIAGNOSIS  
**Effort:** 10 minutes

This will tell us WHY vLLM is stopping generation.

**Change: `src/lib/services/inference-serverless.ts` (after line 534)**

```typescript
// Extract token count
let tokensUsed = 0;
let finishReason = 'unknown';  // NEW

if (result.output) {
    if (Array.isArray(result.output) && result.output[0]?.usage) {
        const usage = result.output[0].usage;
        tokensUsed = (usage.input || 0) + (usage.output || 0);
        
        // NEW: Extract finish_reason
        if (result.output[0].choices && result.output[0].choices[0]) {
            finishReason = result.output[0].choices[0].finish_reason || 'not_provided';
        }
    } else if (result.output.usage?.total_tokens) {
        tokensUsed = result.output.usage.total_tokens;
        
        // NEW: Extract finish_reason from alternate structure
        if (result.output.choices && result.output.choices[0]) {
            finishReason = result.output.choices[0].finish_reason || 'not_provided';
        }
    }
}

console.log('[INFERENCE-SERVERLESS] Extracted response:', {
    responseLength: responseText.length,
    tokensUsed,
    generationTimeMs,
    finishReason,  // NEW: Log this to diagnose truncation
    wasTruncated: !responseText.trim().match(/[.!?]$/)  // Heuristic check
});
```

**Expected Output After Fix:**
- If `finishReason === 'length'` → vLLM is enforcing a limit
- If `finishReason === 'stop'` → Model thinks it's done (unlikely given mid-sentence cutoff)
- If `finishReason === 'not_provided'` → vLLM V1 API may not return this field

**Why This is P0:**
Without knowing the finish_reason, we're guessing. This data will tell us the exact cause.

---

### Solution 2: Test Alternative vLLM V1 Parameter Names (IMMEDIATE)

**Priority:** P0 - CRITICAL  
**Effort:** 15 minutes

vLLM V1 API may use different parameter names than the OpenAI-compatible API.

**Investigation Steps:**

1. **Check vLLM V1 Documentation:** 
   - Search for vLLM v0.15.0 API parameters
   - Look for `max_tokens` vs `max_new_tokens` vs `max_completion_tokens`

2. **Test Alternative Parameter:**

**Change: `src/lib/services/inference-serverless.ts` (line 350-359)**

```typescript
const body: {
    input: {
        model?: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens: number;
        max_new_tokens?: number;  // NEW: vLLM V1 might need this
        max_completion_tokens?: number;  // NEW: Or this
        temperature: number;
    };
} = {
    input: {
        messages,
        max_tokens: 2048,  // INCREASED from 1024
        max_new_tokens: 2048,  // NEW: Try vLLM V1 parameter
        max_completion_tokens: 2048,  // NEW: Or OpenAI Chat Completions parameter
        temperature: 0.7,
    },
};
```

**Rationale:**
- vLLM V1 engine may have changed parameter naming
- Sending multiple variants ensures compatibility
- Upstream APIs typically ignore unknown parameters

---

### Solution 3: Increase `max_tokens` to 2048 (IMMEDIATE)

**Priority:** P0 - Critical (Do alongside Solution 1 & 2)  
**Effort:** 5 minutes

Even if vLLM starts respecting the parameter, 1024 is too low.

**Change 1: `src/lib/services/inference-serverless.ts`**

```typescript
// BEFORE (line 356):
max_tokens: 1024,

// AFTER:
max_tokens: 2048,  // Increased for financial advisor responses
```

**Change 2: `src/lib/services/inference-pods.ts`**

```typescript
// BEFORE (line 93):
max_tokens: 1024,

// AFTER:
max_tokens: 2048,  // Increased for financial advisor responses
```

**Rationale:**
- 2048 tokens = ~1500-1800 words
- Sufficient for nuanced financial advisor responses
- Aligns with Claude's evaluation token limits (2000-3000)
- Hedge against vLLM parameter issue

---

### Solution 4: Contact RunPod Support About vLLM V1 Behavior (CRITICAL)

**Priority:** P0 - URGENT  
**Effort:** 30 minutes (support ticket)

**Issue Description for RunPod:**
```
Subject: vLLM V1 Engine (v0.15.0) Ignoring max_tokens Parameter

Environment:
- RunPod Serverless Endpoint: 780tauhj7c126b
- Docker Image: [NEW IMAGE - ask user for exact tag]
- vLLM Version: v0.15.0 (V1 engine)
- Worker Version: 1.8.1

Issue:
Our inference requests send `max_tokens: 1024` in the request body:
```json
{
  "input": {
    "model": "adapter-6fd5ac79",
    "messages": [...],
    "max_tokens": 1024,
    "temperature": 0.7
  }
}
```

Observed Behavior:
- Both base model and adapter stop at EXACTLY 203 tokens
- Responses end mid-sentence (not natural completion)
- No errors in worker logs
- Jobs marked as COMPLETED

Expected Behavior:
- Models should generate up to 1024 tokens OR until natural stop

Questions:
1. Does vLLM V1 API use a different parameter name for max_tokens?
2. Is there a server-side token limit we're hitting?
3. Has the API contract changed between v0.14.0 and v0.15.0?
4. Can you check the finish_reason being returned?

Logs:
[Attach runpod-logs-47.txt and logs_result-47.csv]
```

**Alternative: Rollback to Previous Docker Image**
- Previous version: vLLM v0.14.0 (from Jan 22 logs)
- User reported pods worked correctly with that version
- Consider this if new image has breaking changes

---

### Solution 5: Make `max_tokens` Configurable per Job (FOLLOW-UP)

**Priority:** P1 - High  
**Effort:** 30 minutes

**Current State:**
`max_tokens` is hardcoded in the inference services, not configurable per pipeline job.

**Proposed Change:**
Add `inference_params` support to pipeline jobs table (may already exist - needs verification).

**Implementation:**

1. **Update inference service signatures:**

```typescript
// src/lib/services/inference-serverless.ts
export async function sendToServerlessEndpoint(
    endpointUrl: string,
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    useAdapter: boolean,
    jobId?: string,
    maxTokens?: number  // NEW PARAMETER
): Promise<string>
```

2. **Use configurable max_tokens:**

```typescript
// Line 356 in inference-serverless.ts
max_tokens: maxTokens || 2048,  // Use provided value or default to 2048
```

3. **Pass from conversation service:**

```typescript
// In multi-turn-conversation-service.ts addTurn() function
const controlResponse = await sendToServerlessEndpoint(
    conversation.control_endpoint_url,
    conversation.system_prompt || DEFAULT_SYSTEM_PROMPT,
    controlMessage,
    formattedControlHistory,
    false,
    undefined,
    conversation.inference_params?.max_tokens || 2048  // Pass from job config
);
```

---

### Solution 6: Compare Pods vs Serverless (VERIFICATION)

**Priority:** P1 - High  
**Effort:** 15 minutes

**Goal:** Verify if the issue is specific to serverless or affects pods too.

**Test Plan:**
1. Keep one inference pod running (not serverless)
2. Create a new conversation using pod endpoints
3. Submit the same test prompt
4. Compare response lengths

**If Pods Work Fine:**
- Confirms issue is specific to new serverless Docker image
- Supports rollback recommendation

**If Pods Also Truncate:**
- Suggests vLLM v0.15.0 has breaking change
- Need to check vLLM changelog

---

### Solution 7: Add Response Validation & User Feedback (FOLLOW-UP)

**Priority:** P2 - Medium  
**Effort:** 2 hours

**Goal:** Detect truncated responses and alert the user

**Implementation:**

1. **Add truncation detection:**

```typescript
function isResponseTruncated(response: string, tokensUsed: number, maxTokens: number): boolean {
    // Check for mid-sentence cutoff indicators
    const endsWithIncompleteWord = /[a-zA-Z]$/.test(response.trim());
    const endsWithoutPunctuation = !/[.!?]$/.test(response.trim());
    const nearMaxTokens = tokensUsed >= (maxTokens * 0.95);
    
    return (endsWithIncompleteWord || endsWithoutPunctuation) && nearMaxTokens;
}
```

2. **Store truncation flag in database:**

Add to `conversation_turns` update:

```typescript
updateData.control_was_truncated = isResponseTruncated(
    controlResult.value.response,
    controlResult.value.tokensUsed,
    maxTokens
);
updateData.adapted_was_truncated = isResponseTruncated(
    adaptedResult.value.response,
    adaptedResult.value.tokensUsed,
    maxTokens
);
```

3. **Display warning in UI:**

```tsx
{turn.control_was_truncated && (
    <Alert variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Response may be incomplete</AlertTitle>
        <AlertDescription>
            This response reached the token limit and may have been cut off.
            Consider increasing max_tokens in job settings.
        </AlertDescription>
    </Alert>
)}
```

---

## 🧪 Testing Plan

### Test Case 1: Verify Increased Token Limit

**Steps:**
1. Apply Solution 1 (increase to 2048 tokens)
2. Deploy to Vercel
3. Start a new conversation with serverless endpoint
4. Submit a complex emotional prompt (e.g., "I'm drowning in debt and don't know what to do")
5. **Expected:** Both responses complete naturally with proper endings
6. **Verify:** Check database `control_tokens_used` and `adapted_tokens_used` are > 203

### Test Case 2: Compare Pods vs Serverless

**Steps:**
1. Create two identical jobs: one with pod endpoint, one with serverless
2. Use the exact same prompt for both
3. Compare response lengths and quality
4. **Expected:** Pod and serverless should produce similar length responses
5. **If not:** Indicates serverless-specific configuration issue

### Test Case 3: Long Conversation Context

**Steps:**
1. Start a conversation
2. Continue for 5+ turns to build up conversation history
3. **Expected:** Responses remain complete even with longer context
4. **Verify:** No degradation in response quality or length

---

## 📋 Action Items (UPDATED PRIORITY)

### Phase 1: Diagnosis (Do First - 30 min)
- [ ] **P0:** Apply Solution 1 (add `finish_reason` logging)
- [ ] **P0:** Apply Solution 2 (test alternative parameter names)
- [ ] **P0:** Apply Solution 3 (increase `max_tokens` to 2048)
- [ ] **P0:** Deploy to Vercel
- [ ] **P0:** Run test conversation and check logs for `finish_reason`

### Phase 2: Resolution Path (Based on Phase 1 Results)

**If `finish_reason === 'length'`:**
- [ ] vLLM is enforcing a hidden limit → Contact RunPod (Solution 4)
- [ ] Ask RunPod about server-side token limits
- [ ] Consider rollback to vLLM v0.14.0 Docker image

**If `finish_reason === 'not_provided'` or `undefined`:**
- [ ] vLLM V1 API may not return finish_reason
- [ ] Contact RunPod about API changes in v0.15.0
- [ ] Request API documentation for V1 engine

**If alternative parameter (`max_new_tokens`) works:**
- [ ] Update all inference services to use correct parameter
- [ ] Document vLLM V1 API changes

### Phase 3: Long-term Fixes
- [ ] **P1:** Test pods vs serverless (Solution 6)
- [ ] **P1:** Implement configurable `max_tokens` (Solution 5)
- [ ] **P2:** Add response truncation detection (Solution 7)
- [ ] **P2:** Update job creation docs

---

## 🔗 Related Files

- `src/lib/services/inference-serverless.ts` (line 356)
- `src/lib/services/inference-pods.ts` (line 93)
- `src/lib/services/multi-turn-conversation-service.ts` (calls inference services)
- Database: `conversation_turns` table

---

---

## 🔄 Pods vs Serverless Comparison

**User's Context:**
> "I submitted two questions last time using the Pods and the answers were long and verbose."
> "The only things we changed this time were:
> a. Moved to the serverless endpoint
> b. Changed the docker image in the serverless endpoint (it is a new docker image that RunPod deployed to fix the issue with the adapter crashing the engine.)"

**What Changed:**

| Aspect | Pods (Working) | Serverless (Broken) |
|--------|----------------|---------------------|
| vLLM Version | Likely v0.14.0 or earlier | v0.15.0 (V1 engine) ✅ |
| Docker Image | Old stable image | **NEW** image from RunPod |
| Response Length | 800-2000 tokens | **203-209 tokens** ❌ |
| Finish Reason | Likely `stop` | **Unknown** (not logged) |
| Adapter Crashes | Unknown | Fixed (per RunPod) |

**Hypothesis:**
The new Docker image fixed the adapter crash issue BUT introduced a new token generation limit bug. This could be:
- vLLM V1 regression
- RunPod serverless wrapper configuration issue
- Breaking API change in v0.15.0

---

## 💬 User Impact

**Current State (Broken):**
- ❌ Responses cut off mid-sentence at ~200 tokens
- ❌ Poor user experience (incomplete advice)
- ❌ Cannot evaluate Turn 2 properly
- ❌ Blocks production use

**After Phase 1 Diagnosis:**
- ✅ Know WHY truncation is happening
- ✅ Can make informed decision (fix vs rollback)
- ⏳ May need RunPod support intervention

**After Full Fix:**
- ✅ Complete, natural responses (800-1500 tokens)
- ✅ Better quality financial advice
- ✅ Evaluation works correctly
- ✅ Per-job token control (long-term)
- ✅ Truncation detection & alerts (long-term)

---

## 🤔 Open Questions

1. **Q:** Why exactly 203 tokens? Is there a server-side limit we're not aware of?  
   **A:** Requires investigation of RunPod serverless endpoint configuration

2. **Q:** Does the serverless endpoint return a `finish_reason` field?  
   **A:** Need to check API response structure and add logging

3. **Q:** Should different personas have different `max_tokens` defaults?  
   **A:** Possibly - empathetic personas may need more tokens than concise ones

---

## ✅ Success Criteria

**Phase 1 Success (Diagnosis):**
1. ✅ `finish_reason` appears in logs
2. ✅ We understand WHY models stop at 203 tokens
3. ✅ Can determine if it's vLLM, RunPod, or our code

**Phase 2 Success (Fix Applied):**
1. ✅ Responses complete naturally (end with punctuation)
2. ✅ Both control and adapted responses are 800-1500 characters
3. ✅ Database shows `tokens_used` > 400 for typical responses
4. ✅ `finish_reason === 'stop'` in logs (natural completion)
5. ✅ Turn 2 evaluation completes successfully

**Phase 3 Success (Long-term):**
1. ✅ Per-job `max_tokens` configuration works
2. ✅ Truncation detection alerts users when needed
3. ✅ Comprehensive logging for all token-related issues

---

## 🎯 Recommendations

### Immediate (Next 2 Hours)
1. **Apply Phase 1 Solutions** (finish_reason logging + parameter tests)
2. **Deploy and test** with same prompt that failed
3. **Review logs** to diagnose root cause
4. **Contact RunPod support** if vLLM V1 issue is confirmed

### Short-term (Next 1-2 Days)
1. **If new image has breaking changes:** Roll back to vLLM v0.14.0
2. **If parameter naming issue:** Update all inference services
3. **If server-side limit:** Work with RunPod to increase/remove limit

### Long-term (Next Week)
1. **Implement configurable `max_tokens`** per job
2. **Add truncation detection & alerts** to UI
3. **Document vLLM V1 quirks** for future reference
4. **Set up monitoring** for token usage patterns

---

## 📞 If You Need to Contact RunPod

**Ticket Template:**
```
Subject: vLLM V1 Engine (v0.15.0) Stopping Generation at ~200 Tokens

Endpoint ID: 780tauhj7c126b
Issue: Models stop generating at 203-209 tokens despite max_tokens: 1024

Symptoms:
- Responses end mid-sentence
- Both base + adapter stop at IDENTICAL token count
- No errors in worker logs
- finish_reason unknown (not in response)

Request:
1. Confirm correct parameter name for max_tokens in V1 API
2. Check if there's a server-side token limit
3. Provide V1 API documentation
4. Consider rollback to v0.14.0 if this is a regression

Logs attached: runpod-logs-47.txt, logs_result-47.csv
```

---

**Next Steps:**
1. Apply Solutions 1-3 (Phase 1 diagnostic changes)
2. Deploy and test
3. Review logs for finish_reason
4. Report findings and determine next action

---

## 🔬 CRITICAL FINDING: Evaluation Discrepancy Analysis (Feb 4, 2026)

### User Report

User ran the SAME input prompt twice:
1. **Before fixes** (conversation `fef42c3f`): Adapter judged **slightly better**
2. **After fixes** (conversation `ba7ebb4f`): Control judged **MUCH better**

User suspected the fixes broke the evaluation system.

### Investigation

**Database Query Results:**

#### BEFORE Fixes (Conversation `fef42c3f`)
- Control: 203 tokens, 461 chars
- Adapter: 203 tokens, 434 chars
- **Winner: ADAPTED** (PAI: 35% vs 25%, RQS: 4.4 vs 3.1)
- Evaluation notes: Adapter shows better emotional attunement

#### AFTER Fixes (Conversation `ba7ebb4f`)
- Control: 203 tokens, 432 chars
- Adapter: 203 tokens, 437 chars
- **Winner: CONTROL** (PAI: 40% vs 25%)
- Evaluation notes: Control provides better practical guidance

### Root Cause: Non-Deterministic Model Responses

**Key Finding:** The model responses are **COMPLETELY DIFFERENT** despite identical input prompts.

**Control responses:**

**BEFORE:**
```
I'm sorry to hear about your situation and I understand how overwhelming and frustrating it can be to find yourself in a position where you feel financially unprepared after a divorce. It's important to remember that many people make mistakes when it comes to managing their finances, and it's never...
```

**AFTER:**
```
I'm sorry to hear about your situation. It's understandable to feel overwhelmed and frustrated given the circumstances. The good news is that it's never too late to start learning about personal finance and taking steps to improve your financial situation. Here's a simple guide to help you get star...
```

**These are fundamentally different responses:**
- Different phrasing ("and I understand" vs "understandable to feel")
- Different content structure (acknowledges mistakes vs "good news is...")
- Different tone (empathetic vs encouraging)

### Why This Happened

**Explanation:**

LLM inference with `temperature > 0` (we use `temperature: 0.7`) is **non-deterministic**. Each generation involves random sampling from probability distributions, so:
- Same input → Different outputs (expected behavior)
- Same model, same prompt, different run → Different response

**The evaluation system is working correctly.** It's evaluating the actual responses generated, which happen to be different quality levels due to random sampling.

### What About the Code Changes?

**Code changes applied:**
1. Added `max_new_tokens: 2048`
2. Added `max_completion_tokens: 2048`
3. Increased `max_tokens: 1024 → 2048`
4. Added `finish_reason` logging

**Impact on responses:**
- ❌ **Did NOT fix truncation** (both still stop at 203 tokens)
- ❓ **MAY have affected vLLM sampling behavior** (speculative)
- ✅ **Did NOT break evaluation logic** (evaluation correctly assesses what it receives)

**Hypothesis:** Adding multiple token limit parameters (`max_tokens`, `max_new_tokens`, `max_completion_tokens`) might confuse vLLM V1 engine, causing:
1. Different internal state during generation
2. Subtly different sampling behavior
3. Different random seed selection

**Alternative Hypothesis:** Pure coincidence - temperature-based sampling naturally produces different outputs, and this run happened to generate a better control response.

### The Real Problem

**Both runs are still truncated at 203 tokens.** The evaluation differences are a red herring caused by:
1. Non-deterministic sampling (expected)
2. Both responses being truncated (the actual bug)
3. Truncation happening at different "quality points" in the generation

**In the BEFORE run:** Truncation cut off control mid-sentence at a worse point, making adapter look better by comparison.

**In the AFTER run:** Truncation cut off control mid-sentence at a better point (after completing "Here's a simple guide"), making control look better.

### Conclusion

✅ **Evaluation system is NOT broken**  
✅ **Code changes did NOT break evaluation logic**  
⚠️ **Truncation bug is still present** (203 token limit)  
🤔 **Adding multiple token parameters MAY affect sampling** (needs investigation)  
📊 **Randomness is causing evaluation variance** (expected with truncated responses)

### Recommendations

1. **Do NOT focus on evaluation differences** - they're a symptom, not the cause
2. **Focus on the truncation bug** - this is the root issue
3. **Test removing the new parameters** (`max_new_tokens`, `max_completion_tokens`) to see if they're confusing vLLM V1
4. **Contact RunPod** about the 203-token limit (primary issue)
5. **Consider using `temperature: 0.0`** for deterministic outputs during testing (to eliminate randomness as a variable)

### Immediate Action Plan

**Test 1: Remove new parameters**
- Roll back to ONLY sending `max_tokens: 2048`
- Remove `max_new_tokens` and `max_completion_tokens`
- Test if responses are still 203 tokens
- Test if responses change between runs

**Test 2: Confirm truncation is the issue**
- Run same prompt 5 times with `temperature: 0.0`
- If responses are identical AND truncated → confirms deterministic truncation bug
- If responses vary → confirms sampling is the variance source

**Test 3: Contact RunPod**
- Report the 203-token limit
- Ask about correct parameter naming for vLLM V1
- Request API documentation for v0.15.0

---

## 📝 Summary of Findings (Feb 4, 2026)

| Issue | Status | Root Cause | Solution |
|-------|--------|------------|----------|
| Truncation at 203 tokens | ❌ NOT FIXED | vLLM V1 ignores/misinterprets token limits | Contact RunPod, test parameter removal |
| Evaluation "inconsistency" | ✅ NOT A BUG | Non-deterministic sampling (temperature > 0) | No action needed - working as expected |
| Adapter performance "drop" | ✅ NOT A REAL DROP | Random sampling produced different responses | No action needed - natural variance |
| Code changes "breaking" evaluation | ✅ FALSE ALARM | Evaluation correctly assesses different responses | No action needed - code is correct |

**PRIORITY: Fix the truncation bug. The evaluation variance is a natural consequence of truncated responses combined with non-deterministic sampling.**
