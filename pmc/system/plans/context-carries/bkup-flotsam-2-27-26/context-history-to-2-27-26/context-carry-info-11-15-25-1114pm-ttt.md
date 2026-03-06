# Context Carryover: LoRA Pipeline - Serverless Endpoint Iteration with RunPod Support Guidance

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
3. ✅ **READ THE DUAL-MODE ARCHITECTURE DOC**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-load-re-enable-serverless_v1.md`
4. ✅ **READ THE SERVERLESS IMPLEMENTATION**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts`
5. ✅ **READ THE PODS IMPLEMENTATION**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-pods.ts`
6. ✅ **READ THE MODE SELECTOR**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts`
7. ✅ **UNDERSTAND RUNPOD SUPPORT FEEDBACK** (detailed in this document)
8. ✅ Review all debugging history from the previous session
9. ✅ **STOP and WAIT for explicit human instructions**

The human will tell you exactly what to do next. Do NOT assume or suggest actions.

---

## 📌 Active Development Focus

**Primary Task**: Iterate on RunPod Serverless vLLM implementation based on support feedback
**Current Phase**: Debugging vLLM V1 + LoRA engine crashes with concrete fixes from RunPod support
**Implementation Status**: Dual-mode architecture deployed (Pods working, Serverless needs fixes)

### Current Status: January 20, 2026

**Current Mode**: `INFERENCE_MODE=pods` ✅ WORKING
**Target Mode**: `INFERENCE_MODE=serverless` ⏳ NEEDS FIXES

**Why Pods**: vLLM V1 engine (v0.11.0) in `runpod/worker-v1-vllm:v2.11.2` crashes with `EngineDeadError` when LoRA is enabled.

**RunPod Support Feedback**: 2 concrete fixes to try (see below)

**Test Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
**Test Adapter**: `adapter-6fd5ac79` (emotional intelligence)
**Test URL**: https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test

---

## 🎯 RunPod Support Feedback (January 20, 2026)

### Context: Why We Contacted RunPod Support

We successfully configured RunPod Serverless vLLM with `ENABLE_LORA=true` and `LORA_MODULES` environment variables. The adapter loads successfully on worker startup. However, when we send inference requests, the vLLM V1 engine crashes with `EngineDeadError`.

**Worker Image**: `runpod/worker-v1-vllm:v2.11.2`
**vLLM Version**: v0.11.0 (V1 engine)
**Base Model**: `mistralai/mistral-7b-instruct-v0.2`
**Adapter**: `BrightHub2/lora-emotional-intelligence-6fd5ac79` (uploaded to HuggingFace)

### Support Response from Roman (RunPod)

**Two concrete things to try next**:

---

#### Fix 1: Set RAW_OPENAI_OUTPUT=1 (Not true/false)

**The Issue**:
> "In the failing logs, the worker code is parsing RAW_OPENAI_OUTPUT as an integer, then casting to bool. If it's set to true/false anywhere, it can hard fail with ValueError: invalid literal for int() with base 10: 'true'. The safest option is to explicitly set: RAW_OPENAI_OUTPUT=1"

**What This Means**:
- The RunPod worker expects `RAW_OPENAI_OUTPUT` to be an integer (`0` or `1`)
- If it's set to string `"true"` or `"false"`, the worker crashes during startup
- This could be preventing the worker from initializing correctly

**Current State**: We don't have `RAW_OPENAI_OUTPUT` set at all in our RunPod endpoint configuration.

**Action Required**:
1. Add `RAW_OPENAI_OUTPUT=1` to RunPod Serverless endpoint environment variables
2. Restart workers to apply the change
3. Test inference again

**Where to Configure**:
- RunPod Console → Serverless → `brightrun-inference-mistral-7b` endpoint
- Settings → Environment Variables
- Add: `RAW_OPENAI_OUTPUT=1`

---

#### Fix 2: Fix Chat Message Role Ordering

**The Issue**:
> "Your logs also show a chat template failure, where vLLM complains that roles must alternate correctly (optionally one system at the start, then user, assistant, user, assistant, etc.). When that happens, vLLM can return an error payload that does not match the OpenAI-style shape the worker expects, which can cascade into the AsyncLLM output_handler failed and EngineDeadError behavior you're seeing."

**What This Means**:
- vLLM V1 has strict chat template validation
- Messages must alternate: `system` (optional, once at start), then `user`, `assistant`, `user`, `assistant`, etc.
- If we violate this (e.g., two `user` messages in a row, or `assistant` before first `user`), vLLM returns a malformed error response
- The RunPod worker doesn't handle this error correctly, causing `EngineDeadError`

**Common Gotchas**:
- Two user messages back-to-back
- An assistant message before the first user
- A system message not in the first position

**Current State**: Our code sends:
```typescript
// From inference-serverless.ts:
const messages = [];
if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
}
messages.push({ role: 'user', content: prompt });
```

This SHOULD be correct (optional system first, then user). However, we need to verify:
1. No assistant messages are being added accidentally
2. System prompt (if provided) is always first
3. User prompt is always after system (or first if no system)

**Action Required**:
1. Review `inference-serverless.ts` message construction (lines ~275-279)
2. Add validation to ensure message roles are correct
3. Log the exact messages array being sent to RunPod
4. Verify no code path adds assistant messages before the first response

**Where to Fix**:
- File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts`
- Function: `_callInferenceEndpointInternal` (lines ~260-458)
- Add validation before sending request

---

### Support's Request for Further Debugging

If both fixes are applied and it still crashes, Roman requests:
1. **The exact first request payload** (full JSON body)
2. **First 50-100 lines after "Starting Serverless Worker"** from RunPod worker logs
3. **The crash section** from worker logs

This will help confirm whether it's a LoRA + V1 issue or a request formatting issue.

---

## 🏗️ Current Architecture: Dual-Mode Inference System

### Overview

We've implemented a **dual-mode architecture** that supports BOTH RunPod Pods and RunPod Serverless simultaneously. The mode is controlled by a single environment variable: `INFERENCE_MODE`.

**Key Benefits**:
- ✅ Easy switching between Pods and Serverless (just change env var)
- ✅ No code deletion - both implementations preserved
- ✅ Fast rollback if issues arise (< 5 minutes)
- ✅ Can A/B test performance and cost
- ✅ Iterate on Serverless while Pods stay running

### File Structure

```
src/lib/services/
├── inference-service.ts              # Main entry point with mode selector
├── inference-serverless.ts           # Serverless implementation (NEEDS FIXES)
└── inference-pods.ts                 # Pods implementation (CURRENT/WORKING)
```

### How Mode Switching Works

**1. Environment Variable**:
```
INFERENCE_MODE=pods         # Current (working)
INFERENCE_MODE=serverless   # Target (needs fixes)
```

**2. Mode Selector in `inference-service.ts`**:
```typescript
const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

export async function callInferenceEndpoint(...args) {
  if (INFERENCE_MODE === 'pods') {
    return await callInferenceEndpoint_Pods(...args);
  } else if (INFERENCE_MODE === 'serverless') {
    return await callInferenceEndpoint_Serverless(...args);
  } else {
    throw new Error(`Unknown INFERENCE_MODE: ${INFERENCE_MODE}`);
  }
}
```

**3. Shared Functions** (mode-agnostic):
- `deployAdapterEndpoints()` - Creates virtual endpoint records in database
- `getEndpointStatus()` - Checks endpoint status
- Both modes use the same database records

### Current Configuration

**Vercel Environment Variables**:
```
# Current mode
INFERENCE_MODE=pods

# Pods configuration (ACTIVE)
INFERENCE_API_URL=https://{pod-id}-8000.proxy.runpod.net
INFERENCE_API_URL_ADAPTED=https://{pod-id}-8001.proxy.runpod.net

# Serverless configuration (PRESERVED, not active)
GPU_CLUSTER_API_KEY={runpod-api-key}
```

**RunPod Resources**:
- **Pods** (RUNNING):
  - `brightrun-control-vllm` (base model)
  - `brightrun-adapted-vllm` (with LoRA)
  - Network volume: `brightrun-inference-engine`
- **Serverless** (CONFIGURED, but crashes on LoRA requests):
  - Endpoint: `fahi78leyxz36l` (`brightrun-inference-mistral-7b`)
  - Worker image: `runpod/worker-v1-vllm:v2.11.2`
  - Environment: `ENABLE_LORA=true`, `LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]`

---

## 📚 Key Implementation Files

### 1. `inference-service.ts` - Mode Selector (Entry Point)

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts`

**Purpose**: Routes requests to appropriate implementation

**Key Code**:
```typescript
// Line ~40
const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

// Line ~270
export async function callInferenceEndpoint(...) {
  if (INFERENCE_MODE === 'pods') {
    return await callInferenceEndpoint_Pods(...);
  } else {
    return await callInferenceEndpoint_Serverless(...);
  }
}
```

**Responsibilities**:
- Read `INFERENCE_MODE` environment variable
- Route to correct implementation
- Shared deployment functions (database operations)
- Shared types and interfaces

---

### 2. `inference-serverless.ts` - Serverless Implementation (NEEDS FIXES)

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts`

**Purpose**: RunPod Serverless vLLM communication (PRESERVED, needs fixes based on support feedback)

**Current State**: 
- ✅ Preserved intact from before Pods implementation
- ✅ Has comprehensive retry logic for engine crashes
- ✅ Has health checking and worker readiness polling
- ❌ Crashes with `EngineDeadError` when LoRA is enabled
- ⏳ Needs 2 fixes from RunPod support (see above)

**Key Functions**:
- `callInferenceEndpoint_Serverless()` - Main entry point (lines ~465-574)
- `_callInferenceEndpointInternal()` - Single inference attempt (lines ~261-458)
- `waitForReadyWorker()` - Polls until worker is ready (lines ~146-256)
- `checkEndpointHealth()` - Health check utility (lines ~73-141)

**Request Format** (RunPod wrapper):
```typescript
{
  input: {
    model?: "adapter-6fd5ac79",  // Optional: adapter name or omit for base model
    messages: [
      { role: "system", content: "..." },  // Optional
      { role: "user", content: "..." }
    ],
    max_tokens: 1024,
    temperature: 0.7
  }
}
```

**Where Fixes Are Needed**:

**Fix 1 Location**: RunPod Console (not code)
- Need to add `RAW_OPENAI_OUTPUT=1` to serverless endpoint environment variables

**Fix 2 Location**: Lines ~275-279 (message construction)
```typescript
// Current (should be correct, but needs validation):
const messages = [];
if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
}
messages.push({ role: 'user', content: prompt });
```

Add validation:
```typescript
// Validate message roles BEFORE sending
function validateMessageRoles(messages: Array<{ role: string; content: string }>): void {
    // Check: system (optional) must be first
    if (messages.length > 0 && messages[0].role === 'system') {
        // OK - system is first
        if (messages.length > 1 && messages[1].role !== 'user') {
            throw new Error('First non-system message must be user');
        }
    }
    
    // Check: no two consecutive same roles
    for (let i = 1; i < messages.length; i++) {
        if (messages[i].role === messages[i-1].role) {
            throw new Error(`Duplicate role detected: ${messages[i].role} appears twice in a row`);
        }
    }
    
    // Check: alternating pattern after system
    const startIdx = messages[0]?.role === 'system' ? 1 : 0;
    for (let i = startIdx; i < messages.length; i++) {
        const expectedRole = (i - startIdx) % 2 === 0 ? 'user' : 'assistant';
        if (messages[i].role !== expectedRole) {
            throw new Error(`Expected ${expectedRole} at position ${i}, got ${messages[i].role}`);
        }
    }
}

// Then call before fetch:
validateMessageRoles(messages);
```

**Enhanced Logging for Debugging**:
```typescript
// Add before fetch (line ~305):
console.log('[INFERENCE-SERVERLESS] REQUEST PAYLOAD:', {
    url: `${RUNPOD_API_URL}/runsync`,
    requestBody: JSON.stringify(body, null, 2),  // Full payload
    messageCount: body.input.messages.length,
    messageRoles: body.input.messages.map(m => m.role),
    modelSpecified: body.input.model || '(default base model)',
});
```

---

### 3. `inference-pods.ts` - Pods Implementation (CURRENT/WORKING)

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-pods.ts`

**Purpose**: RunPod Pods with direct OpenAI format (CURRENTLY ACTIVE)

**Current State**: ✅ WORKING CORRECTLY
- Uses direct OpenAI `/v1/chat/completions` format (no RunPod wrapper)
- Two separate endpoints: control vs adapted
- No authorization needed (public proxy URLs)
- Synchronous responses (no polling)

**Request Format** (Direct OpenAI):
```typescript
{
  model: "adapter-6fd5ac79",  // OR "/workspace/models/mistralai/Mistral-7B-Instruct-v0.2"
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  max_tokens: 1024,
  temperature: 0.7
}
```

**Note**: This implementation works correctly. Use as reference for correct behavior.

---

### 4. `test-service.ts` - Sequential Inference Calls (CRITICAL FIX)

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`

**Critical Change**: Changed from parallel to sequential inference calls

**Why**:
> "vLLM V1 engine crashes when receiving two simultaneous requests with different model configurations (base model vs adapter). We must run them sequentially to avoid EngineDeadError."

**Code Change** (lines ~197-237):
```typescript
// BEFORE (parallel):
const [controlResult, adaptedResult] = await Promise.all([
    callInferenceEndpoint(...),  // Control
    callInferenceEndpoint(...),  // Adapted
]);

// AFTER (sequential):
console.log('[TEST-SERVICE] Step 1/2: Running control (base model) inference...');
const controlResult = await callInferenceEndpoint(...);

console.log('[TEST-SERVICE] Step 2/2: Running adapted (LoRA) inference...');
const adaptedResult = await callInferenceEndpoint(...);
```

**Impact**: This fix is **mode-agnostic** - applies to both Pods and Serverless implementations.

**Result**: ✅ Pods now work correctly with sequential calls.

---

## 🐛 Debugging History: What We've Learned

### Session 1: Option A → Option C Migration (January 19, 2026)

**Goal**: Get adapter testing working with RunPod Serverless

**Journey**:
1. **Attempted Option A**: Dynamic adapter loading via `/v1/load_lora_adapter` API
   - Result: ❌ API doesn't exist on RunPod Serverless
   
2. **Pivoted to Option C**: Pre-load adapters via `LORA_MODULES` environment variable
   - Result: ✅ Adapters load successfully on startup
   
3. **Fixed 6 Critical Bugs**:
   - HuggingFace packaging (tar.gz → individual files)
   - RunPod worker configuration (Min Workers = 1)
   - Model name case sensitivity (`Mistral-7B-Instruct` → `mistral-7b-instruct-v0.2`)
   - vLLM V1 model parameter handling (omit for base model, specify for adapter)
   - Worker dead state requiring restart
   - Parallel requests causing crashes (changed to sequential)

4. **Final Issue**: `EngineDeadError` persists when LoRA is enabled
   - Contacted RunPod support
   - Received concrete fixes to try (see above)

### Session 2: Pods Workaround + Dual-Mode Architecture (January 20, 2026)

**Goal**: Get adapter testing working ASAP while debugging Serverless

**Solution**: Implemented dual-mode architecture
1. Created `inference-pods.ts` - Direct vLLM on RunPod Pods
2. Preserved `inference-serverless.ts` intact for future
3. Created `inference-service.ts` mode selector
4. Set `INFERENCE_MODE=pods` to use working implementation
5. Documented re-enablement process in `adapter-load-re-enable-serverless_v1.md`

**Result**: ✅ Adapter testing now works via Pods

**Next Step**: Fix Serverless based on RunPod support feedback, then switch back

---

## 🎯 Next Steps: Implementing RunPod Support Fixes

### Phase 1: Apply RunPod Support Fixes

#### Step 1.1: Add RAW_OPENAI_OUTPUT=1 to RunPod Endpoint

**Action**: Manual configuration in RunPod console

**Where**:
1. Go to: https://www.runpod.io/console/serverless
2. Find endpoint: `brightrun-inference-mistral-7b` (ID: `fahi78leyxz36l`)
3. Click "..." menu → "Edit"
4. Go to "Environment Variables" section

**Add**:
```
Name: RAW_OPENAI_OUTPUT
Value: 1
```

**CRITICAL**: Use `1` (integer), NOT `"true"` (string)

**Why**: Worker parses this as `int()` then casts to `bool`. String values cause crash.

5. Click "Save"
6. Restart workers: "..." menu → "Restart Workers"
7. Wait 2-3 minutes for workers to initialize

---

#### Step 1.2: Add Message Role Validation to Serverless Code

**Action**: Code changes to `inference-serverless.ts`

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts`

**Changes**:

1. **Add validation function** (insert around line ~260, before `_callInferenceEndpointInternal`):

```typescript
/**
 * Validate chat message roles for vLLM V1 strict chat template.
 * 
 * Rules:
 * - Optional system message MUST be first
 * - Roles must alternate: user, assistant, user, assistant, ...
 * - No two consecutive same roles
 * 
 * Throws error if validation fails.
 */
function validateMessageRoles(messages: Array<{ role: string; content: string }>): void {
    if (messages.length === 0) {
        throw new Error('Messages array cannot be empty');
    }

    // Check if first message is system
    const hasSystem = messages[0].role === 'system';
    const firstNonSystemIdx = hasSystem ? 1 : 0;

    // If system exists and there's only system, that's invalid
    if (hasSystem && messages.length === 1) {
        throw new Error('Cannot have only system message - need at least one user message');
    }

    // First non-system message MUST be user
    if (firstNonSystemIdx < messages.length && messages[firstNonSystemIdx].role !== 'user') {
        throw new Error(
            `First non-system message must be 'user', got '${messages[firstNonSystemIdx].role}'`
        );
    }

    // Check alternating pattern: user, assistant, user, assistant, ...
    for (let i = firstNonSystemIdx; i < messages.length; i++) {
        const expectedRole = (i - firstNonSystemIdx) % 2 === 0 ? 'user' : 'assistant';
        const actualRole = messages[i].role;

        if (actualRole !== expectedRole) {
            throw new Error(
                `Message at index ${i} violates alternating pattern. ` +
                `Expected '${expectedRole}', got '${actualRole}'. ` +
                `Full sequence: [${messages.map(m => m.role).join(', ')}]`
            );
        }
    }

    console.log('[INFERENCE-SERVERLESS] ✅ Message roles validated:', {
        messageCount: messages.length,
        roles: messages.map(m => m.role),
        hasSystem,
    });
}
```

2. **Add validation call** (in `_callInferenceEndpointInternal`, after messages array construction, around line ~280):

```typescript
const messages = [];
if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
}
messages.push({ role: 'user', content: prompt });

// VALIDATE MESSAGE ROLES (vLLM V1 strict chat template)
try {
    validateMessageRoles(messages);
} catch (error) {
    const validationError = error instanceof Error ? error.message : String(error);
    console.error('[INFERENCE-SERVERLESS] ❌ Message role validation FAILED:', {
        error: validationError,
        messages: messages.map(m => ({ role: m.role, contentLength: m.content.length })),
    });
    throw new Error(`Invalid message roles: ${validationError}`);
}
```

3. **Enhanced request logging** (before fetch call, around line ~305):

```typescript
console.log('[INFERENCE-SERVERLESS] 📤 SENDING REQUEST TO RUNPOD:', {
    url: `${RUNPOD_API_URL}/runsync`,
    timestamp: new Date().toISOString(),
    requestBody: {
        input: {
            model: body.input.model || '(default base model - omitted)',
            messages: body.input.messages.map((m, i) => ({
                index: i,
                role: m.role,
                contentLength: m.content.length,
                contentPreview: m.content.substring(0, 50),
            })),
            max_tokens: body.input.max_tokens,
            temperature: body.input.temperature,
        }
    },
    // FULL PAYLOAD for debugging:
    fullPayloadJSON: JSON.stringify(body, null, 2),
});
```

---

### Phase 2: Test Serverless with Fixes Applied

#### Step 2.1: Switch to Serverless Mode (Local Testing First)

**Action**: Update local environment

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`

**Change**:
```bash
# FROM:
INFERENCE_MODE=pods

# TO:
INFERENCE_MODE=serverless
```

**Also ensure** (should already be set):
```bash
GPU_CLUSTER_API_KEY=<your-runpod-api-key>
INFERENCE_API_URL=https://api.runpod.ai/v2/fahi78leyxz36l
```

---

#### Step 2.2: Run Local Test

**Action**: Start dev server and test

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Open browser
# Navigate to: http://localhost:3000/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test

# Submit test prompt:
"I'm anxious about my financial future. What should I do?"

# Watch console logs for:
# [INFERENCE-SERVICE] Routing to serverless implementation
# [INFERENCE-SERVERLESS] Message roles validated
# [INFERENCE-SERVERLESS] SENDING REQUEST TO RUNPOD
# [INFERENCE-SERVERLESS] (success or error messages)
```

**Expected Outcomes**:

**If successful** ✅:
- No `EngineDeadError` in logs
- Responses generated for both control and adapted
- Adapted response shows emotional intelligence improvement

**If still fails** ❌:
- Capture FULL request payload from logs
- Capture worker logs from RunPod console
- Provide to RunPod support as requested

---

### Phase 3: Deploy to Production (If Tests Pass)

#### Step 3.1: Commit Code Changes

```bash
git add src/lib/services/inference-serverless.ts
git commit -m "feat: add message role validation and enhanced logging for serverless inference

- Add validateMessageRoles() to enforce vLLM V1 chat template rules
- Enhanced request logging with full payload dump
- Based on RunPod support feedback (RAW_OPENAI_OUTPUT + role validation)
"
git push origin main
```

---

#### Step 3.2: Update Vercel Environment Variable

**Action**: Switch mode in Vercel

**Where**: Vercel Dashboard → Settings → Environment Variables

**Change**:
```
Name: INFERENCE_MODE
Value: serverless  (was: pods)
```

Click "Save" → Vercel will auto-redeploy

---

#### Step 3.3: Production Testing

**After deployment** (wait ~2 minutes):

1. Go to: https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test
2. Submit test prompt
3. Check Vercel deployment logs: `vercel logs --follow`
4. Watch for success or errors

**If successful**:
- Monitor for 24-48 hours
- Track success rate (should be >95%)
- Verify no `EngineDeadError` occurrences
- Compare response quality to Pods

**If still fails**:
- Immediately rollback: Change `INFERENCE_MODE=pods` in Vercel
- Gather full debugging info as requested by RunPod support
- Contact support with new findings

---

## 🔄 Rollback Plan (If Fixes Don't Work)

### Immediate Rollback (< 5 minutes)

If serverless still fails after applying fixes:

1. **Revert Vercel environment variable**:
   ```
   INFERENCE_MODE=pods
   ```

2. **Redeploy** (or wait for auto-deploy):
   ```bash
   vercel --prod
   ```

3. **Verify**: Test within 5 minutes - should work immediately (Pods are still running)

**No code rollback needed** - mode selector automatically routes to working Pods implementation.

---

## 📊 Cost Analysis: Pods vs Serverless

### Current Costs (Pods - Running 24/7)

| Resource | Specs | Hourly Cost | Daily Cost | Monthly Cost |
|----------|-------|-------------|------------|--------------|
| Control Pod | RTX A4000 | $0.74/hr | $17.76 | $533 |
| Adapted Pod | RTX A4000 | $0.74/hr | $17.76 | $533 |
| Network Volume | 250GB | - | $0.33 | $10 |
| **TOTAL** | | | **$35.85/day** | **$1,076/month** |

### Projected Costs (Serverless - Pay-per-request)

**Assumptions**:
- 100 test requests per day
- 2 seconds average per request
- 2 GPU-seconds per request
- $0.0002 per GPU-second

| Usage | Calculation | Daily Cost | Monthly Cost |
|-------|-------------|------------|--------------|
| 100 tests | 100 tests × 2 requests × 2s × $0.0002 | $0.08 | $2.40 |

**Savings**: ~$1,073/month (99.8% reduction)

**Break-even point**: 178 requests per day

**Conclusion**: Serverless is dramatically cheaper for low-moderate usage. Worth fixing!

---

## 📋 Debugging Checklist for RunPod Support

If fixes don't work, provide to support:

### Required Information

1. **Exact first request payload**:
   ```json
   {
     "input": {
       "model": "adapter-6fd5ac79",
       "messages": [
         {"role": "system", "content": "..."},
         {"role": "user", "content": "..."}
       ],
       "max_tokens": 1024,
       "temperature": 0.7
     }
   }
   ```

2. **First 50-100 lines after "Starting Serverless Worker"** from RunPod logs

3. **The crash section** with full stack trace

### How to Gather

**Request Payload**: Check Vercel logs or console output (we added enhanced logging)

**Worker Logs**:
1. Go to: https://www.runpod.io/console/serverless
2. Find endpoint: `brightrun-inference-mistral-7b`
3. Click "Logs" tab
4. Find most recent worker startup
5. Copy first 100 lines + crash section

**Vercel Logs**:
```bash
vercel logs --follow
# OR: Vercel Dashboard → Deployments → Latest → Runtime Logs
```

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### Setup & Usage

**Installation**: Already available in project
```bash
# SAOL is installed and configured
# Located in supa-agent-ops/ directory
```

**CRITICAL: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path:** supa-agent-ops
**Quick Start:** QUICK_START.md (READ THIS FIRST)
**Troubleshooting:** TROUBLESHOOTING.md

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query pipeline training jobs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',select:'id,job_name,status,adapter_file_path,final_loss,training_time_seconds,created_at',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Pipeline Jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.job_name,'/',j.status));})();"

# Query inference endpoints
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_inference_endpoints',select:'*',limit:10});console.log('Endpoints:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query test results
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'adapter_test_results',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Test Results:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"
```

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment process for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw (minimal) and enriched (complete) JSON formats
6. **LoRA Training Pipeline** (SECTIONS E01-E04 COMPLETE):
   - **Section E01 (COMPLETE)**: Database foundation (4 tables, RLS policies, types)
   - **Section E02 (COMPLETE)**: API routes (engines, jobs, datasets, hyperparameters)
   - **Section E03 (COMPLETE)**: UI components (dashboard, wizard, monitoring, evaluation)
   - **Section E04 (COMPLETE)**: Training engine & evaluation system (Claude-as-Judge)
7. **Adapter Download System** (COMPLETE):
   - Download trained adapter files as tar.gz archives
   - On-demand generation (no URL expiry)
   - Intelligent handling of file vs folder storage formats
8. **Manual Adapter Testing** (COMPLETE):
   - Deployed adapter to RunPod text-generation-webui
   - Validated emotional intelligence training effectiveness
   - Documented A/B comparison results
9. **Automated Adapter Testing System** (DUAL-MODE ARCHITECTURE):
   - **Pods Mode** (CURRENT): RunPod Pods with direct vLLM OpenAI API ✅ WORKING
   - **Serverless Mode** (TARGET): RunPod Serverless with wrapper format ⏳ NEEDS FIXES
   - **A/B testing interface** with side-by-side comparison
   - **Claude-as-Judge evaluation** with detailed metrics
   - **User rating system** and test history
   - **Real-time status updates** with polling
   - **Easy mode switching** via environment variable

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models)
- **AI**: 
  - Claude API (Anthropic) - `claude-sonnet-4-20250514` (for evaluation)
  - Claude API (Anthropic) - `claude-sonnet-4-5-20250929` (for conversation generation)
- **UI**: Shadcn/UI + Tailwind CSS
- **State Management**: React Query v5 (TanStack Query)
- **Deployment**: Vercel (frontend + API routes)
- **GPU Training**: RunPod Serverless (endpoint: `ei82ickpenoqlp`)
- **Training Framework**: Transformers + PEFT + TRL 0.16+ + bitsandbytes (QLoRA 4-bit)
- **Inference**: 
  - **Pods** (current): 2x RunPod Pods with vLLM (control + adapted)
  - **Serverless** (target): RunPod Serverless vLLM (endpoint: `fahi78leyxz36l`)
- **Adapter Storage**: HuggingFace Hub (public repositories) + Supabase Storage
- **Testing Environment**: RunPod Pods (for manual testing when needed)

### Database Schema Overview

**Core Tables** (Existing - Legacy System):
- `conversations` - Conversation metadata and status
- `training_files` - Aggregated training file metadata
- `training_file_conversations` - Junction table linking conversations to training files
- `personas` - Client personality profiles
- `emotional_arcs` - Emotional progression patterns
- `training_topics` - Subject matter configuration
- `prompt_templates` - Generation templates
- `batch_jobs` - Batch generation job tracking
- `batch_items` - Individual items in batch jobs
- `failed_generations` - Failed generation error records

**Pipeline Tables** (Sections E01-E04):
- `pipeline_training_engines` - Training engine configurations
- `pipeline_training_jobs` - NEW pipeline job tracking
- `pipeline_evaluation_runs` - Evaluation run metadata
- `pipeline_evaluation_results` - Individual scenario evaluation results

**Inference Tables** (E01 - CREATED & DEPLOYED):
- `pipeline_inference_endpoints` - Serverless endpoint tracking (Control + Adapted)
- `adapter_test_results` - A/B test history with evaluations and ratings
- `base_models` - Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

---

## ✅ What Was Accomplished in Previous Session

### Session Summary (January 19-20, 2026)

**Primary Achievement**: Implemented **dual-mode inference architecture** allowing easy switching between Pods and Serverless

**Why This Matters**:
- Pods work NOW (can test adapters immediately)
- Serverless code preserved for iteration (no work lost)
- Easy switching when Serverless is fixed (just change env var)
- No code deletion or refactoring needed to switch modes

**Key Accomplishments**:

1. ✅ **Created dual-mode architecture**:
   - `inference-service.ts` - Mode selector
   - `inference-serverless.ts` - Preserved serverless code
   - `inference-pods.ts` - New pods implementation
   
2. ✅ **Pods implementation working**:
   - Two separate pods (control + adapted)
   - Direct OpenAI format
   - Sequential requests (not parallel)
   - Full responses, correct behavior
   
3. ✅ **Serverless preserved**:
   - Code intact from before
   - Ready for fixes
   - Has retry logic, health checks, worker polling
   
4. ✅ **Changed parallel to sequential**:
   - vLLM V1 crashes on simultaneous requests
   - Now runs control first, then adapted
   - Fixes applied to both modes
   
5. ✅ **Documented everything**:
   - `adapter-load-re-enable-serverless_v1.md` - Full re-enablement guide
   - Complete mode switching instructions
   - Rollback procedures

---

## 🎯 Current Task Summary for Next Agent

### Your Mission

**Implement RunPod support fixes to get Serverless mode working, then switch from Pods to Serverless.**

**Why**: Serverless is ~99.8% cheaper than Pods for our usage pattern.

**Current State**: Pods working, Serverless crashes with `EngineDeadError` when LoRA enabled.

**What You'll Do**:

1. **Apply Fix 1**: Add `RAW_OPENAI_OUTPUT=1` to RunPod endpoint (manual config)
2. **Apply Fix 2**: Add message role validation to `inference-serverless.ts` (code changes)
3. **Add enhanced logging**: Full request payload dump for debugging
4. **Test locally**: Switch to `INFERENCE_MODE=serverless` and test
5. **If successful**: Deploy to production
6. **If still fails**: Gather debugging info for RunPod support

**Success Criteria**:
- ✅ No `EngineDeadError` in logs
- ✅ Responses generated for both control and adapted
- ✅ Adapter responses show improvement over control
- ✅ Success rate > 95% over 24 hours

**Rollback Plan**: If anything fails, immediately switch `INFERENCE_MODE=pods` in Vercel (< 5 minute rollback)

---

## 📂 Critical Files Reference

### Must Read Files (in order):

1. **This document** - Complete context
2. `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-load-re-enable-serverless_v1.md` - Dual-mode architecture guide
3. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts` - Mode selector
4. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts` - Where fixes go
5. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-pods.ts` - Working reference
6. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts` - Sequential calls

### Documentation Files:

- `C:\Users\james\Master\BrightHub\BRun\v4-show\docs\INFERENCE_ISSUE_RESOLUTION.md` - Complete debugging history
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-load-option-C_v1.md` - HuggingFace + LORA_MODULES approach

---

## 🚫 Final Reminder

**DO NOT start implementing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Understand the dual-mode architecture
3. ✅ Understand the RunPod support fixes
4. ✅ Understand where and how to apply fixes
5. ✅ **WAIT** for human to tell you what to do next

The human will likely ask you to:
- Explain the fixes in detail
- Guide them through manual RunPod configuration
- Implement code changes to `inference-serverless.ts`
- Test the changes
- Deploy if successful
- Debug further if still fails

**Do not assume. Wait for instructions.**

---

**Last Updated**: January 20, 2026
**Session Focus**: Serverless endpoint iteration with RunPod support guidance
**Current Mode**: `INFERENCE_MODE=pods` (working)
**Target Mode**: `INFERENCE_MODE=serverless` (needs 2 fixes)
**Document Version**: context-carry-info-11-15-25-1114pm-ttt
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Test URL**: https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test
