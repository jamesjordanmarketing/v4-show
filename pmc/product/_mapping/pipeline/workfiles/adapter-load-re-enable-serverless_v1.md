# Guide: Re-Enabling RunPod Serverless Inference

**Created**: January 20, 2026  
**Last Updated**: February 3, 2026  
**Version**: 1.1  
**Purpose**: Instructions for switching back to RunPod Serverless when V1 + LoRA issue is resolved

---

## ⚡ Quick Start: Testing New Docker Image

**RunPod's Experimental Fix**: `madiatorlabs/worker-v1-vllm:v0.15.0`

### Three Questions Answered:

**Q1: Which serverless endpoint should I use?**  
**A:** `brightrun-inference-official-vllm` (ID: `780tauhj7c126b`)  
This is the endpoint that was working for control (non-adapter) but crashed with LoRA adapters.

**Q2: Do I need to change anything in the codebase besides the Docker image?**  
**A:** **NO** - The codebase is already structured to support both Pods and Serverless modes:  
- ✅ `src/lib/services/inference-service.ts` - Routes based on `INFERENCE_MODE`  
- ✅ `src/lib/services/inference-serverless.ts` - Serverless implementation (preserved)  
- ✅ `src/lib/services/inference-pods.ts` - Pods implementation (current)  
- ✅ Just change the Docker image in RunPod Console, no code edits needed

**Q3: What do I need to do to test the serverless endpoint?**  
**A:** Four steps:
1. ✅ Update Docker image in RunPod Console to `madiatorlabs/worker-v1-vllm:v0.15.0`
2. ✅ Change **TWO** Vercel environment variables:
   - `INFERENCE_MODE=pods` → `INFERENCE_MODE=serverless`
   - `INFERENCE_API_URL` (change from Pod URL to) → `https://api.runpod.ai/v2/780tauhj7c126b`
3. ✅ Vercel will auto-redeploy (or trigger manually)
4. ✅ Test and monitor for errors

**Testing Checklist**:
- [ ] Update Docker image in RunPod Serverless endpoint settings
- [ ] Wait for worker to initialize (~2-3 minutes)
- [ ] Test control (no adapter) via RunPod Console
- [ ] Test adapted (with adapter) via RunPod Console  
- [ ] If both work → Change **TWO** Vercel env vars:
  - [ ] `INFERENCE_MODE=serverless`
  - [ ] `INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b`
- [ ] Test via your app
- [ ] Monitor for `EngineDeadError` crashes

---

## Executive Summary

This guide provides step-by-step instructions for re-enabling RunPod Serverless inference once RunPod resolves the vLLM V1 + LoRA incompatibility issue. The codebase is structured to support BOTH Pods and Serverless modes simultaneously, allowing easy switching via environment variables.

**When to Use This Guide**:
- RunPod support confirms V1 + LoRA issue is fixed
- New worker image version is available that supports LoRA
- You want to A/B test Serverless vs Pods performance
- Cost optimization requires switching to pay-per-request model

---

## Current State (February 2026)

### Why We're Using Pods

**Root Cause**: vLLM V1 engine (v0.11.0) in `runpod/worker-v1-vllm:v2.11.2` crashes with `EngineDeadError` when LoRA is enabled.

**RunPod's Fix (February 2026)**: Experimental Docker image `madiatorlabs/worker-v1-vllm:v0.15.0` - TESTING IN PROGRESS

**Test Results**:
| Configuration | ENABLE_LORA | Result |
|---------------|-------------|--------|
| V1 + LoRA | `true` | ❌ CRASHES |
| V1 without LoRA | `false` | ✅ WORKS |

**Solution**: Using RunPod Pods with manual vLLM setup (Option E v2) with persistent storage.

### Code Architecture

The codebase is structured to support **both** inference modes:

```
src/lib/services/
├── inference-service.ts              # Main entry point with mode selector
├── inference-serverless.ts           # Serverless implementation (PRESERVED)
└── inference-pods.ts                 # Pods implementation (CURRENT)
```

**Current Mode**: `INFERENCE_MODE=pods` (set in Vercel environment variables)

---

## When to Re-Enable Serverless

### Trigger Conditions

Re-enable serverless when ANY of these conditions are met:

1. **✅ RunPod Support Resolution**
   - RunPod support confirms V1 + LoRA issue is fixed
   - New worker image version recommended
   - Official communication about fix

2. **✅ New Worker Image Available**
   - Older v2.x image with LoRA support (e.g., `v2.8.0`, `v2.9.0`)
   - Newer v2.x image with V1 + LoRA fix
   - Alternative vLLM version that works

3. **✅ Cost Optimization**
   - Serverless becomes more cost-effective than Pods
   - Need pay-per-request billing instead of hourly
   - Want automatic scaling to zero during idle

4. **✅ Testing/Validation**
   - Want to verify fix works in production
   - A/B testing between Pods and Serverless
   - Performance comparison

### Verification Checklist

Before switching, verify:
- [ ] RunPod confirms issue is resolved
- [ ] New worker image supports `LORA_MODULES` environment variable
- [ ] Test results show adapter loads successfully
- [ ] No `EngineDeadError` crashes on first request
- [ ] Response quality matches Pods output

---

## Code Organization Strategy

### File Structure

#### 1. Main Entry Point: `inference-service.ts`

**Purpose**: Mode selector and shared utilities

**Location**: `src/lib/services/inference-service.ts`

**Key Responsibilities**:
- Read `INFERENCE_MODE` environment variable
- Route to appropriate implementation (Serverless or Pods)
- Shared types, interfaces, and helper functions
- Deployment management (database operations)

**Structure**:
```typescript
// Feature flag
const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

// Import implementations
import { callInferenceEndpoint_Serverless } from './inference-serverless';
import { callInferenceEndpoint_Pods } from './inference-pods';

// Public API - routes to appropriate implementation
export async function callInferenceEndpoint(...args) {
  if (INFERENCE_MODE === 'pods') {
    return await callInferenceEndpoint_Pods(...args);
  } else if (INFERENCE_MODE === 'serverless') {
    return await callInferenceEndpoint_Serverless(...args);
  } else {
    throw new Error(`Unknown INFERENCE_MODE: ${INFERENCE_MODE}`);
  }
}

// Shared deployment functions (mode-agnostic)
export async function deployAdapterEndpoints(...) { ... }
export async function getEndpointStatus(...) { ... }
```

#### 2. Serverless Implementation: `inference-serverless.ts`

**Purpose**: RunPod Serverless-specific code

**Location**: `src/lib/services/inference-serverless.ts`

**Key Responsibilities**:
- RunPod `/runsync` API calls
- RunPod request/response format handling
- Polling for IN_QUEUE status
- EngineDeadError retry logic
- Worker health checks

**Key Functions**:
```typescript
export async function callInferenceEndpoint_Serverless(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<InferenceResult> {
  // RunPod Serverless implementation
  // Uses: /runsync endpoint
  // Format: {input: {model, messages, ...}}
  // Polling: Handles IN_QUEUE status
}
```

**Environment Variables Used**:
```
RUNPOD_API_KEY
INFERENCE_API_URL (e.g., https://api.runpod.ai/v2/780tauhj7c126b)
```

#### 3. Pods Implementation: `inference-pods.ts`

**Purpose**: RunPod Pods-specific code

**Location**: `src/lib/services/inference-pods.ts`

**Key Responsibilities**:
- Direct OpenAI-compatible API calls
- Simplified request/response format
- Synchronous responses (no polling)
- Proxy URL handling

**Key Functions**:
```typescript
export async function callInferenceEndpoint_Pods(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<InferenceResult> {
  // Pods implementation
  // Uses: /v1/chat/completions endpoint
  // Format: Direct OpenAI {model, messages, ...}
  // Response: Synchronous, no polling
}
```

**Environment Variables Used**:
```
INFERENCE_API_URL (e.g., https://{pod-id}-8000.proxy.runpod.net)
INFERENCE_API_URL_ADAPTED (for dual-pod setup)
```

---

## Step-by-Step Re-Enablement Process

### Phase 1: Pre-Switch Preparation

#### 1.1: Verify RunPod Serverless Fix

**Test on RunPod Console** (not production):

1. Create test endpoint with new worker image:
   ```
   Image: runpod/worker-v1-vllm:v2.XX.X  (new version)
   ```

2. Configure environment variables:
   ```
   MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
   ENABLE_LORA=true
   MAX_LORAS=1
   MAX_LORA_RANK=16
   LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
   HF_TOKEN=<your-token>
   ```

3. Wait for worker to initialize (~2 minutes)

4. Send test request via RunPod console or curl:
   ```bash
   curl -X POST "https://api.runpod.ai/v2/{endpoint-id}/runsync" \
     -H "Authorization: Bearer $RUNPOD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "input": {
         "model": "adapter-6fd5ac79",
         "messages": [{"role": "user", "content": "Test with LoRA adapter"}],
         "max_tokens": 100
       }
     }'
   ```

5. **Success Criteria**:
   - ✅ No `EngineDeadError`
   - ✅ Response generated successfully
   - ✅ Adapter loads without crashes
   - ✅ Response quality is good (not generic)

#### 1.2: Document Endpoint Details

Record the working endpoint configuration:

```
Endpoint ID: _______________________
Worker Image: runpod/worker-v1-vllm:v2.XX.X
vLLM Version: vX.X.X
Environment Variables:
  - MODEL_NAME: _______________________
  - ENABLE_LORA: true
  - LORA_MODULES: [...]
  - Other settings: _______________________

Test Results:
  - First request: ✅ Success / ❌ Failed
  - Response quality: Good / Poor
  - Latency: _____ ms
  - Notes: _______________________
```

### Phase 2: Code Preparation

#### 2.1: Verify Current Code Structure

Check that code is already organized for dual-mode:

```bash
# From project root
ls -la src/lib/services/

# Expected:
# inference-service.ts       (main entry point)
# inference-serverless.ts    (serverless implementation)
# inference-pods.ts          (pods implementation)
```

**If files don't exist** (first-time setup):

```bash
# Create implementation files
cd src/lib/services

# 1. Extract serverless code to separate file
# (See Section "Phase 2.2" below for detailed code)

# 2. Create pods implementation file
# (See Section "Phase 2.3" below)

# 3. Update main inference-service.ts with mode selector
# (See Section "Phase 2.4" below)
```

#### 2.2: Create Serverless Implementation File

**File**: `src/lib/services/inference-serverless.ts`

```typescript
/**
 * RunPod Serverless Inference Implementation
 * 
 * This file contains the ORIGINAL serverless code that was working
 * before the V1 + LoRA issue. It is preserved intact for re-enablement
 * when RunPod fixes the issue.
 */

// Constants
const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'https://api.runpod.ai/v2/780tauhj7c126b';

export interface InferenceResult {
  response: string;
  generationTimeMs: number;
  tokensUsed: number;
}

/**
 * Call RunPod Serverless endpoint with RunPod wrapper format
 */
export async function callInferenceEndpoint_Serverless(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<InferenceResult> {
  const startTime = Date.now();

  // Build messages array
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Build RunPod request body
  const body: {
    input: {
      model?: string;
      messages: Array<{ role: string; content: string }>;
      max_tokens: number;
      temperature: number;
    };
  } = {
    input: {
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    },
  };

  // Specify adapter if using LoRA
  if (useAdapter && jobId) {
    const adapterName = `adapter-${jobId.substring(0, 8)}`;
    body.input.model = adapterName;
    console.log('[SERVERLESS] Using adapter:', adapterName);
  } else {
    delete body.input.model;
    console.log('[SERVERLESS] Using base model');
  }

  // Call RunPod /runsync endpoint
  const response = await fetch(`${INFERENCE_API_URL}/runsync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serverless inference failed: ${response.status} - ${errorText}`);
  }

  let result = await response.json();

  // Handle FAILED status
  if (result.status === 'FAILED') {
    throw new Error(`Inference failed: ${result.error || 'Unknown error'}`);
  }

  // Handle IN_QUEUE status (poll for completion)
  if (result.status === 'IN_QUEUE' && result.id) {
    console.log('[SERVERLESS] Request queued, polling...');
    const maxPolls = 60;
    let pollCount = 0;

    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      pollCount++;

      const statusResponse = await fetch(`${INFERENCE_API_URL}/status/${result.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
      });

      if (statusResponse.ok) {
        result = await statusResponse.json();
        if (result.status === 'COMPLETED' && result.output) break;
        if (result.status === 'FAILED') {
          throw new Error(`Inference failed: ${result.error}`);
        }
      }
    }

    if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
      throw new Error('Inference timed out after 5 minutes');
    }
  }

  // Extract response from RunPod result
  let responseText = '';
  if (result.output) {
    if (typeof result.output === 'string') {
      responseText = result.output;
    } else if (Array.isArray(result.output) && result.output[0]) {
      const firstOutput = result.output[0];
      if (firstOutput.choices?.[0]) {
        const choice = firstOutput.choices[0];
        responseText = choice.tokens?.[0] || choice.message?.content || choice.text || '';
      }
    } else if (result.output.choices?.[0]) {
      const choice = result.output.choices[0];
      responseText = choice.tokens?.[0] || choice.message?.content || choice.text || '';
    }
  }

  // Extract token count
  let tokensUsed = 0;
  if (result.output) {
    if (Array.isArray(result.output) && result.output[0]?.usage) {
      const usage = result.output[0].usage;
      tokensUsed = (usage.input || 0) + (usage.output || 0);
    } else if (result.output.usage?.total_tokens) {
      tokensUsed = result.output.usage.total_tokens;
    }
  }

  return {
    response: responseText,
    generationTimeMs: Date.now() - startTime,
    tokensUsed,
  };
}
```

#### 2.3: Create Pods Implementation File

**File**: `src/lib/services/inference-pods.ts`

```typescript
/**
 * RunPod Pods Inference Implementation
 * 
 * This file contains the Pods-specific code for direct vLLM OpenAI-compatible
 * API calls. Used when INFERENCE_MODE=pods.
 */

const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

export interface InferenceResult {
  response: string;
  generationTimeMs: number;
  tokensUsed: number;
}

/**
 * Call RunPod Pods endpoint with OpenAI-compatible format
 */
export async function callInferenceEndpoint_Pods(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<InferenceResult> {
  const startTime = Date.now();

  // Build messages array
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Determine model name
  let modelName: string;
  if (useAdapter && jobId) {
    modelName = `adapter-${jobId.substring(0, 8)}`;
    console.log('[PODS] Using adapter:', modelName);
  } else {
    modelName = 'mistralai/Mistral-7B-Instruct-v0.2';
    console.log('[PODS] Using base model');
  }

  // Direct OpenAI format (no RunPod wrapper)
  const body = {
    model: modelName,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  };

  // Call vLLM OpenAI endpoint directly
  const response = await fetch(`${INFERENCE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization needed for RunPod proxy URLs
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pods inference failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Extract response (OpenAI format)
  const responseText = result.choices?.[0]?.message?.content || '';
  const tokensUsed = result.usage?.total_tokens || 0;

  return {
    response: responseText,
    generationTimeMs: Date.now() - startTime,
    tokensUsed,
  };
}
```

#### 2.4: Update Main Service File with Mode Selector

**File**: `src/lib/services/inference-service.ts`

Add at the top:

```typescript
// ============================================
// FEATURE FLAG: Inference Mode Selector
// ============================================

const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

console.log(`[INFERENCE] Mode: ${INFERENCE_MODE}`);

// Import implementations
import { callInferenceEndpoint_Serverless, InferenceResult as ServerlessResult } from './inference-serverless';
import { callInferenceEndpoint_Pods, InferenceResult as PodsResult } from './inference-pods';

// Unified result type
export type InferenceResult = ServerlessResult | PodsResult;
```

Replace the main `callInferenceEndpoint` function:

```typescript
/**
 * Call inference endpoint (mode-agnostic)
 * Routes to appropriate implementation based on INFERENCE_MODE
 */
export async function callInferenceEndpoint(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<InferenceResult> {
  
  console.log(`[INFERENCE] Routing to ${INFERENCE_MODE} implementation`);

  if (INFERENCE_MODE === 'pods') {
    return await callInferenceEndpoint_Pods(
      endpointId, prompt, systemPrompt, useAdapter, adapterPath, jobId
    );
  } else if (INFERENCE_MODE === 'serverless') {
    return await callInferenceEndpoint_Serverless(
      endpointId, prompt, systemPrompt, useAdapter, adapterPath, jobId
    );
  } else {
    throw new Error(
      `Unknown INFERENCE_MODE: ${INFERENCE_MODE}. Must be 'serverless' or 'pods'.`
    );
  }
}
```

### Phase 3: Environment Configuration

#### 3.1: Update Vercel Environment Variables

Go to: Vercel Dashboard → Project → Settings → Environment Variables

**Current (Pods) Configuration**:
```
INFERENCE_MODE=pods
INFERENCE_API_URL=https://{pod-id}-8000.proxy.runpod.net
INFERENCE_API_URL_ADAPTED=https://{pod-id}-8001.proxy.runpod.net
```

**New (Serverless) Configuration**:
```
INFERENCE_MODE=serverless
INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b
RUNPOD_API_KEY={your-api-key}
```

**⚠️ CRITICAL**: You MUST change **BOTH** variables:
1. `INFERENCE_MODE=pods` → `INFERENCE_MODE=serverless`
2. `INFERENCE_API_URL` from Pod URL → `https://api.runpod.ai/v2/780tauhj7c126b`

**Why Both?** Serverless uses different API format (`/v2/[endpoint-id]`) vs Pods (`proxy.runpod.net`). The mode selector routes to different code, but both need the correct URL.

**For Dual-Mode Testing** (recommended first):
```
# Keep both configurations, switch mode only
INFERENCE_MODE=serverless  # Change this line only

# Serverless endpoints
INFERENCE_API_URL_SERVERLESS=https://api.runpod.ai/v2/780tauhj7c126b
RUNPOD_API_KEY={your-api-key}

# Pods endpoints (keep for rollback)
INFERENCE_API_URL_PODS=https://{pod-id}-8000.proxy.runpod.net
INFERENCE_API_URL_PODS_ADAPTED=https://{pod-id}-8001.proxy.runpod.net
```

Update code to use correct URL:
```typescript
const INFERENCE_API_URL = INFERENCE_MODE === 'pods' 
  ? process.env.INFERENCE_API_URL_PODS 
  : process.env.INFERENCE_API_URL_SERVERLESS;
```

#### 3.2: Update Local Environment (.env.local)

For local testing:

```bash
# Add to .env.local
INFERENCE_MODE=serverless

# Serverless config
INFERENCE_API_URL_SERVERLESS=https://api.runpod.ai/v2/780tauhj7c126b
RUNPOD_API_KEY=your-api-key-here

# Pods config (for rollback)
INFERENCE_API_URL_PODS=https://{pod-id}-8000.proxy.runpod.net
```

### Phase 4: Testing

#### 4.1: Local Testing

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to test page**:
   ```
   http://localhost:3000/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test
   ```

3. **Submit test prompt**:
   - Control: "Hello, respond with: CONTROL_SERVERLESS_TEST"
   - Adapted: "Hello, respond with: ADAPTED_SERVERLESS_TEST"

4. **Verify responses**:
   - ✅ No errors in console
   - ✅ Responses generated successfully
   - ✅ Adapter responses differ from control
   - ✅ No `EngineDeadError` or crash loops

#### 4.2: Staging Testing

1. **Deploy to staging** (if available):
   ```bash
   vercel --prod false
   ```

2. **Set staging environment variables**:
   ```
   INFERENCE_MODE=serverless
   ```

3. **Run integration tests**:
   - Submit multiple prompts
   - Test both control and adapted endpoints
   - Monitor for crashes or errors
   - Check response quality

#### 4.3: Production Deployment

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Enable serverless inference mode"
   git push origin main
   ```

2. **Update Vercel production environment variables**:
   ```
   INFERENCE_MODE=serverless
   ```

3. **Verify deployment**:
   - Check Vercel deployment logs
   - Test inference endpoint
   - Monitor error rates in Vercel analytics

### Phase 5: Monitoring and Validation

#### 5.1: Monitor for Issues

**First 24 Hours**:
- Check Vercel logs every 2 hours
- Monitor for `EngineDeadError` occurrences
- Track success/failure rates
- Verify adapter responses differ from control

**Metrics to Track**:
```typescript
// Add logging to inference-serverless.ts
console.log('[SERVERLESS-METRICS]', {
  timestamp: new Date().toISOString(),
  useAdapter,
  success: true/false,
  latencyMs: result.generationTimeMs,
  error: error?.message,
});
```

**Key Indicators**:
- ✅ Success rate > 95%
- ✅ No `EngineDeadError` crashes
- ✅ Latency < 5 seconds (p95)
- ✅ Adapter quality meets expectations

#### 5.2: Cost Comparison

Track costs for 7 days:

| Metric | Pods | Serverless | Difference |
|--------|------|------------|------------|
| Daily requests | 100 | 100 | - |
| Avg request time | 2s | 2s | - |
| GPU hours used | 24h | 0.06h | -99.75% |
| Daily cost | $47.76 | $0.24 | -$47.52 |
| Monthly cost (projected) | $1,433 | $7.20 | -$1,426 |

**Decision Point**: If serverless costs are significantly lower and quality is good, shut down Pods.

### Phase 6: Pods Shutdown (After Verification)

Once serverless is stable (7-14 days):

#### 6.1: Stop Pods

1. Go to RunPod console: https://www.runpod.io/console/pods
2. Find pods:
   - `brightrun-control-vllm`
   - `brightrun-adapted-vllm`
3. Click **"Stop"** on each pod
4. **DO NOT DELETE** - keep for quick restart if needed

#### 6.2: Keep Volume

**DO NOT DELETE** the network volume `brightrun-inference-engine`:
- Volume cost: ~$10/month
- Allows instant Pods restart if serverless fails
- Models already downloaded and cached

#### 6.3: Update Documentation

Update context carryover document:
```markdown
## Current State: Serverless Re-Enabled

**Date Switched**: [Date]
**Serverless Endpoint**: 780tauhj7c126b
**Worker Image**: runpod/worker-v1-vllm:v2.XX.X
**Status**: ✅ Working with LoRA

**Pods Status**: Stopped (available for quick restart)
**Volume**: brightrun-inference-engine (preserved)

**Rollback Plan**: If issues arise, can restart Pods in < 5 minutes
```

---

## Rollback Plan

If serverless fails after re-enablement:

### Immediate Rollback (< 5 minutes)

1. **Restart Pods**:
   ```
   RunPod Console → Pods → brightrun-control-vllm → Start
   RunPod Console → Pods → brightrun-adapted-vllm → Start
   ```

2. **Switch Vercel environment variable**:
   ```
   INFERENCE_MODE=pods
   ```

3. **Redeploy Vercel** (or wait for auto-deploy):
   ```bash
   vercel --prod
   ```

4. **Verify**: Test inference within 5 minutes

### If Pods Also Fail

1. **Check volume is mounted**: `/workspace` should have models
2. **Restart vLLM services**:
   ```bash
   # SSH to pod
   screen -r vllm-control
   # If crashed, restart:
   /workspace/scripts/start-control.sh
   ```

3. **Check logs**:
   ```bash
   tail -f /workspace/logs/control-*.log
   ```

---

## Troubleshooting

### Issue: Mode Selector Not Working

**Symptoms**: Code doesn't switch between modes

**Solution**:
```bash
# Verify environment variable is set
echo $INFERENCE_MODE  # Should show "serverless" or "pods"

# Check Vercel deployment logs
vercel logs

# Verify code logs mode on startup
# Should see: [INFERENCE] Mode: serverless
```

### Issue: Serverless Code Not Found

**Symptoms**: `Cannot find module './inference-serverless'`

**Solution**:
```bash
# Verify file exists
ls src/lib/services/inference-serverless.ts

# If missing, create it using Phase 2.2 instructions
```

### Issue: Serverless Still Crashes

**Symptoms**: `EngineDeadError` returns after re-enabling

**Solution**:
1. Verify worker image version matches tested version
2. Check LORA_MODULES environment variable format
3. Contact RunPod support with new logs
4. **Rollback to Pods immediately**

### Issue: Environment Variables Not Applied

**Symptoms**: Changes don't take effect

**Solution**:
1. Redeploy after changing Vercel env vars
2. Clear build cache: `vercel --force`
3. Wait 2-3 minutes for propagation
4. Check deployment logs confirm new values

---

## Quick Reference

### Current Endpoint Details (February 2026)

**Serverless Endpoint**:
- Name: `brightrun-inference-official-vllm`
- ID: `780tauhj7c126b`
- URL: `https://api.runpod.ai/v2/780tauhj7c126b`
- Docker Image (NEW): `madiatorlabs/worker-v1-vllm:v0.15.0`
- Status: Testing experimental LoRA fix

### Environment Variables

| Variable | Serverless Value | Pods Value |
|----------|-----------------|------------|
| `INFERENCE_MODE` | `serverless` | `pods` |
| `INFERENCE_API_URL` | `https://api.runpod.ai/v2/780tauhj7c126b` | `https://{pod-id}-8000.proxy.runpod.net` |
| `RUNPOD_API_KEY` | Required | Not required |

**⚠️ To Switch Modes**: Change ONLY `INFERENCE_MODE` variable, keep all others for rollback

### File Locations

| File | Purpose |
|------|---------|
| `src/lib/services/inference-service.ts` | Mode selector |
| `src/lib/services/inference-serverless.ts` | Serverless implementation |
| `src/lib/services/inference-pods.ts` | Pods implementation |

### Testing Checklist

- [ ] Local testing passes
- [ ] Staging testing passes (if applicable)
- [ ] Production deployment successful
- [ ] No `EngineDeadError` in first 24 hours
- [ ] Success rate > 95%
- [ ] Adapter quality meets expectations
- [ ] Cost tracking shows expected savings
- [ ] Rollback plan tested and works

---

## Summary

This guide ensures:
1. ✅ Serverless code is preserved and ready for re-enablement
2. ✅ Easy switching via environment variables
3. ✅ No code deletion - both modes supported
4. ✅ Clear testing and validation process
5. ✅ Fast rollback if issues arise (< 5 minutes)
6. ✅ Cost optimization when serverless works

**Next Steps**:
1. Wait for RunPod support confirmation
2. Test new worker image
3. Follow Phase 1-6 when ready
4. Monitor for 7-14 days
5. Shut down Pods if stable

---

**Document Version**: 1.0  
**Last Updated**: January 20, 2026  
**Status**: Ready for Use When RunPod Fix Confirmed
