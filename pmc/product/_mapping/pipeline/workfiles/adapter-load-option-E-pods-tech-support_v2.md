# RunPod Serverless + vLLM V1 + LoRA: Persistent EngineDeadError Issue

**To**: Roman (RunPod Technical Support)  
**From**: James (BrightHub Customer)  
**Date**: January 22, 2026  
**Endpoint**: `brightrun-inference-official-vllm` (ID: `780tauhj7c126b`)  
**Worker Image**: `runpod/worker-v1-vllm:v2.11.2`  
**vLLM Version**: v0.11.0 (V1 Engine)

---

## Executive Summary

We've implemented **all recommended fixes** from your previous guidance (explicit model field, message role validation, RAW_OPENAI_OUTPUT=1), but vLLM V1 Serverless workers with LoRA enabled consistently crash with `EngineDeadError` during the first inference request. Workers initialize successfully and load LoRA adapters correctly, but crash when processing requests.

This appears to be a **fundamental vLLM V1 + LoRA instability** in Serverless mode.

---

## Current Configuration

### Endpoint Environment Variables
```bash
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
MAX_MODEL_LEN=4096
GPU_MEMORY_UTILIZATION=0.95
ENABLE_LORA=true
MAX_LORAS=1
MAX_LORA_RANK=16
LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
HF_TOKEN=[REDACTED - See deployment-secrets.md]
TENSOR_PARALLEL_SIZE=1
MAX_NUM_SEQS=256
DISABLE_LOG_STATS=false
RAW_OPENAI_OUTPUT=1
OPENAI_RESPONSE_ROLE=assistant
DEFAULT_MAX_TOKENS=2048
MAX_TOKENS=2048
DISTRIBUTED_EXECUTOR_BACKEND=mp
```

### Request Format (Correct Per Your Guidance)
```json
{
  "input": {
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful financial advisor."
      },
      {
        "role": "user",
        "content": "I just inherited $250,000..."
      }
    ],
    "max_tokens": 1024,
    "temperature": 0.7
  }
}
```

**Note**: We explicitly specify `model` field even for base model requests (per your recommendation when LoRA is enabled).

---

## Implemented Fixes from Previous Guidance

### ✅ Fix 1: Message Role Validation
We implemented strict chat message role validation:
- Optional system message first
- Roles alternate: user → assistant → user → assistant
- No consecutive same roles

**Evidence**: Vercel log line 91 confirms validation passes:
```
[INFERENCE-SERVERLESS] ✅ Message roles validated: 
{ messageCount: 2, roles: [ 'system', 'user' ], hasSystem: true }
```

### ✅ Fix 2: Explicit Model Field
We always specify the `model` field in requests, even when using base model:

**Evidence**: Vercel log lines 92-95:
```
[INFERENCE-SERVERLESS] ⚪ Using base model explicitly: {
  model: 'mistralai/Mistral-7B-Instruct-v0.2',
  reason: 'LoRA enabled in worker - must specify model to avoid vLLM V1 confusion'
}
```

### ✅ Fix 3: RAW_OPENAI_OUTPUT=1
Changed from string `"true"` to integer `1` per your guidance.

---

## Crash Pattern: Multiple Test Runs

### Test Run 1 (Log 35) - Worker `gs2xnnxl94je7o`
- **Worker ID**: `gs2xnnxl94je7o`
- **Result**: `EngineDeadError` on first inference request
- **Worker Config**: `enable_lora=True`, adapter successfully loaded
- **Time**: 4+ minutes to crash

### Test Run 2 (Log 36) - Workers `gs2xnnxl94je7o` & `qxgsjkk7qg101r`
- **Worker ID**: `qxgsjkk7qg101r` (new worker, auto-scaled)
- **Result**: `EngineDeadError` on first inference request
- **Worker Config**: `enable_lora=True`, adapter successfully loaded
- **Time**: <2 seconds to crash

### Test Run 3 (Log 37 - Latest) - Workers `9hms72xp58xpdz` & `k0nw5d1kanbbjp`
- **First Worker ID**: `9hms72xp58xpdz`
  - Initialized successfully with `enable_lora=True`
  - Adapter loaded: `'adapter-6fd5ac79'` from HuggingFace
  - **Crashed twice** with `EngineDeadError` during inference
  
- **Second Worker ID**: `k0nw5d1kanbbjp` (auto-scaled replacement)
  - Initialized successfully with `enable_lora=True`  
  - Adapter loaded successfully
  - Available KV cache: 74.29 GiB (plenty of memory)
  - **Never received a request** (our code gave up after previous failures)

---

## Detailed Log Analysis: Latest Run (Log 37)

### Worker `9hms72xp58xpdz` - First Crash
**Time**: `2026-01-22 07:52:45 UTC`

```
ERROR 01-22 07:52:45 [async_llm.py:480] AsyncLLM output_handler failed.
ERROR 01-22 07:52:45 [async_llm.py:480] vllm.v1.engine.exceptions.EngineDeadError: 
EngineCore encountered an issue. See stack trace (above) for the root cause.
```

**Worker Init Logs** (showing successful LoRA setup):
```
INFO 01-22 07:52:45 [serving_models.py:162] Loaded new LoRA adapter: 
name 'adapter-6fd5ac79', path 'BrightHub2/lora-emotional-intelligence-6fd5ac79'

engine.py :27 Engine args: enable_lora=True, max_loras=1, max_lora_rank=16
engine.py :167 Initialized vLLM engine in 247.82s
INFO 01-22 07:52:42 [loggers.py:147] Engine 000: 
vllm cache_config_info with initialization after num_gpu_blocks is: 31315
```

**Error Response**:
```
1 validation error for ErrorResponse
error
  Field required [type=missing, input_value={'message': 'EngineCore e...uestError', 
  'code': 400}, input_type=dict]
```

### Worker `k0nw5d1kanbbjp` - Initialized But Never Used
**Time**: `2026-01-22 07:54:40 UTC` (auto-scaled after previous crash)

```
INFO 01-22 07:54:40 [serving_models.py:162] Loaded new LoRA adapter: 
name 'adapter-6fd5ac79', path 'BrightHub2/lora-emotional-intelligence-6fd5ac79'

engine.py :27 Engine args: enable_lora=True, max_loras=1, max_lora_rank=16
engine.py :167 Initialized vLLM engine in 69.30s
INFO 01-22 07:54:38 [loggers.py:147] Engine 000: 
vllm cache_config_info with initialization after num_gpu_blocks is: 38034
[Worker pid=333] Available KV cache memory: 74.29 GiB
```

This worker initialized successfully but our code had already failed the test due to the previous worker's crash.

---

## Key Observations

### 1. **LoRA Initialization Works Perfectly**
- All workers successfully initialize with `enable_lora=True`
- All workers successfully load LoRA adapters from HuggingFace
- GPU memory allocation succeeds (31-38K GPU blocks, 61-74 GiB KV cache)
- CUDA graph capturing completes successfully

### 2. **Crash Happens During First Inference**
- Workers crash when processing the **first** inference request
- Crash occurs in `AsyncLLM.output_handler`
- Error: `vllm.v1.engine.exceptions.EngineDeadError`
- Message: "EngineCore encountered an issue" (no root cause visible in logs)

### 3. **Malformed Error Response**
The worker's error handling itself fails:
```
1 validation error for ErrorResponse
error
  Field required [type=missing, input_value={'message': 'EngineCore e...uestError'
```

This suggests vLLM V1's error response doesn't match the Pydantic model in `/src/utils.py:create_error_response()`.

### 4. **No Memory Issues**
- Worker `k0nw5d1kanbbjp`: 74.29 GiB available KV cache
- Worker `9hms72xp58xpdz`: 61.16 GiB available KV cache  
- Model size: 13.58 GiB
- Plenty of headroom

### 5. **Request Format Is Correct**
Our logs show (Vercel log lines 96-138):
- ✅ Message roles validated
- ✅ Explicit model field: `"mistralai/Mistral-7B-Instruct-v0.2"`
- ✅ Proper JSON structure
- ✅ Reasonable parameters (1024 tokens, temp 0.7)

---

## Attached Logs

I'm providing three sets of logs for your analysis:

### 1. **Vercel Application Logs** (`logs_result-37.csv`)
- Shows our request preparation
- Confirms message role validation passes
- Confirms explicit model field is sent
- Shows RunPod response: FAILED with EngineDeadError

### 2. **RunPod Worker Logs** (`logs-brightrun-inference-official-vllm-fb-37.txt`)
- Complete worker initialization logs
- Shows successful LoRA adapter loading
- Shows EngineDeadError crashes
- Shows worker auto-scaling (new workers starting after crashes)

### 3. **Previous Run Logs** (for pattern comparison)
- `logs_result-35.csv` + `logs-brightrun-inference-official-vllm-fb-35.txt`
- `logs_result-36.csv` + `logs-brightrun-inference-official-vllm-fb-36.txt`
- All show identical crash pattern

---

## Comparison: Serverless vs Pods

**Important Context**: We have this **exact same setup working perfectly** in RunPod Pods mode:

### Pods Configuration (Working)
- **Same model**: `mistralai/Mistral-7B-Instruct-v0.2`
- **Same worker image**: `runpod/worker-v1-vllm:v2.11.2`
- **Same vLLM version**: v0.11.0 (V1 Engine)
- **Same LoRA settings**: `ENABLE_LORA=true`, `MAX_LORAS=1`, `MAX_LORA_RANK=16`
- **Same adapter**: `BrightHub2/lora-emotional-intelligence-6fd5ac79`
- **Same request format**: Identical JSON payload

### Pods vs Serverless Differences
| Aspect | Pods (✅ Working) | Serverless (❌ Failing) |
|--------|-----------------|------------------------|
| Worker Persistence | Dedicated, always running | Auto-scaled, ephemeral |
| GPU Type | RTX A5000 (24GB) | L40S (48GB) |
| Initialization | Once, stable | Multiple times, crashes |
| LoRA Adapter Loading | ✅ Works | ✅ Works |
| Inference Execution | ✅ Works | ❌ EngineDeadError |
| Cost | Higher ($0.79/hr) | Lower (pay-per-request) |

---

## Questions for RunPod Support

### 1. **Is vLLM V1 + LoRA officially supported in Serverless?**
- We've exhausted all client-side fixes
- Pods mode works perfectly with identical config
- Is this a known limitation?

### 2. **Are there additional Serverless-specific env vars we should set?**
- Any undocumented settings for LoRA in Serverless?
- Different CUDA graph settings?
- Memory or concurrency limits?

### 3. **Can we access the actual vLLM error stack trace?**
- Logs show "See stack trace (above) for the root cause"
- But no actual stack trace is visible in worker logs
- Is there a way to enable more verbose error logging?

### 4. **Is there a vLLM V2 worker image we can test?**
- vLLM V2 might have better LoRA stability
- Are any V2-based serverless workers available (even in beta)?

### 5. **What's the root cause of the malformed error response?**
```python
File "/src/utils.py", line 91, in create_error_response
    return ErrorResponse(message=message,
pydantic_core._pydantic_core.ValidationError: 1 validation error for ErrorResponse
error
  Field required [type=missing, ...
```

This suggests the worker's error handling code itself has a bug when LoRA is enabled.

---

## Temporary Workaround

We've fallen back to **Pods mode** for production use:
- ✅ Stable and reliable
- ✅ Same model and LoRA adapters work perfectly
- ❌ Higher cost ($0.79/hr vs pay-per-request)

However, we'd strongly prefer to use Serverless for:
- Cost efficiency for low-volume usage
- Better resource utilization
- Auto-scaling capability

---

## Request

Could you please:

1. **Investigate the vLLM V1 + LoRA instability** in Serverless workers
2. **Provide guidance** on whether this is fixable or a known limitation
3. **Suggest alternatives** (e.g., vLLM V2 worker, different configuration)
4. **Consider documenting** this as a known issue if it's not fixable

We're happy to provide additional logs, test specific configurations, or help debug this issue further.

---

## Technical Contact

**James Jordan**  
BrightHub  
Email: [Provide your email]  
GitHub: jamesjordanmarketing  
RunPod Account: [Your account ID]

Thank you for your continued excellent technical support!

---

## Appendix: Complete Request/Response Cycle

### Client Request (Vercel → RunPod)
```http
POST https://api.runpod.ai/v2/780tauhj7c126b/runsync
Authorization: Bearer [RUNPOD_API_KEY]
Content-Type: application/json

{
  "input": {
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "messages": [
      {"role": "system", "content": "You are a helpful financial advisor."},
      {"role": "user", "content": "I just inherited $250,000 from my grandmother..."}
    ],
    "max_tokens": 1024,
    "temperature": 0.7
  }
}
```

### RunPod Response
```json
{
  "status": "FAILED",
  "id": "sync-331405af-fa63-4579-86e9-ffae21161854-u1",
  "workerId": "9hms72xp58xpdz",
  "error": "handler: 1 validation error for ErrorResponse\nerror\n  Field required..."
}
```

### Worker Internal Error
```
vllm.v1.engine.exceptions.EngineDeadError: EngineCore encountered an issue.
```

---

**Log Files Attached**:
- `logs_result-37.csv` (Vercel application logs)
- `logs-brightrun-inference-official-vllm-fb-37.txt` (RunPod worker logs)

---

## UPDATE: Roman's Response & Testing Plan (Jan 22, 2026)

### Roman's Diagnosis

Roman confirmed our analysis: **This is very likely a bug in the vLLM V1 LoRA path itself**, compounded by a worker-side error handling bug where the error payload doesn't match the `ErrorResponse` Pydantic model.

**Key Points from Roman's Response**:
1. ✅ Confirmed: LoRA off works, LoRA on crashes
2. ✅ Confirmed: Roles are valid, RAW_OPENAI_OUTPUT is fixed, mp backend is in use
3. ⚠️ The "validation error for ErrorResponse" is extra noise on top of the real engine crash
4. 🔍 The actual useful exception is getting swallowed in the engine logs

### Recommended Next Steps

Roman suggests testing a **newer vLLM-based worker image** to see if newer vLLM changes alter the behavior:

**Worker Image**: `madiatorlabs/worker-v1-vllm:v0.14.0`
- This is Roman's personal fork with a newer vLLM version
- **Critical Requirement**: This image requires **CUDA 12.8** to be set on the endpoint
- If CUDA 12.8 is not selected, it may fail to start or behave unpredictably

---

## Testing Procedure for New Worker Image

### Step 1: Update Endpoint Configuration in RunPod Console ✅ DONE

**Endpoint**: `brightrun-inference-official-vllm` (ID: `780tauhj7c126b`)

#### 1.1 Set CUDA Version to 12.8
1. Go to [RunPod Console → Serverless → Endpoints](https://www.runpod.io/console/serverless)
2. Click on `brightrun-inference-official-vllm` endpoint
3. Click **"Edit"** or **"Settings"**
4. Look for **"CUDA Version"** dropdown or **"Runtime Configuration"** section
5. Select **CUDA 12.8** from the dropdown
6. **Save** the configuration

**⚠️ Critical**: The new worker image will fail or behave unpredictably without CUDA 12.8

#### 1.2 Update Docker Image ✅ ALREADY DONE
- Changed Docker image to: `madiatorlabs/worker-v1-vllm:v0.14.0`
- This has already been updated in the RunPod console

#### 1.3 Keep All Environment Variables the Same
**Do NOT change** the existing environment variables:
```bash
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
MAX_MODEL_LEN=4096
GPU_MEMORY_UTILIZATION=0.95
ENABLE_LORA=true
MAX_LORAS=1
MAX_LORA_RANK=16
LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
HF_TOKEN=[REDACTED - See deployment-secrets.md]
TENSOR_PARALLEL_SIZE=1
MAX_NUM_SEQS=256
DISABLE_LOG_STATS=false
RAW_OPENAI_OUTPUT=1
OPENAI_RESPONSE_ROLE=assistant
DEFAULT_MAX_TOKENS=2048
MAX_TOKENS=2048
DISTRIBUTED_EXECUTOR_BACKEND=mp
```

### Step 2: Terminate Existing Workers

After changing CUDA version and Docker image:
1. Go to **Endpoint → Workers** tab in RunPod Console
2. **Terminate all running workers** to force fresh restart with new configuration
3. Workers will auto-restart with:
   - New Docker image: `madiatorlabs/worker-v1-vllm:v0.14.0`
   - CUDA 12.8 runtime
   - Same environment variables

### Step 3: Run Test Request

**Test URL**: `https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test`

1. Navigate to the test page
2. Click **"Run Test"** or submit the test prompt
3. **Monitor the test** (it may take 2-10 minutes depending on worker cold start)

**Expected Behavior**:
- New worker starts with CUDA 12.8
- Worker initializes vLLM engine with LoRA enabled
- Worker attempts to process the inference request

### Step 4: Collect Logs Immediately After Test

**What to Capture**:
- **Vercel Application Log**: Save the CSV from Vercel console (as before)
- **RunPod Worker Log**: 
  - Go to RunPod Console → Endpoint → Logs
  - Find the section from **"Starting Serverless Worker"** through the crash (or success)
  - Save this specific section to a new file

**Naming Convention** (suggested):
- `logs_result-38-cuda128.csv` (Vercel log)
- `logs-brightrun-inference-official-vllm-fb-38-cuda128.txt` (RunPod log)

### Step 5: Analysis & Next Steps

#### Scenario A: Test Succeeds ✅
- LoRA + vLLM V1 works in newer vLLM version
- The issue was fixed in the newer vLLM build
- **Action**: Keep using `madiatorlabs/worker-v1-vllm:v0.14.0` + CUDA 12.8 for production
- **Report to Roman**: Confirm the newer image fixed the issue

#### Scenario B: Test Fails with Different Error 🔍
- Worker crashes but with a **more specific traceback** (better than generic "EngineDeadError")
- Errors might be related to:
  - LoRA load issues
  - LoRA apply issues
  - Tokenizer/template issues
  - CUDA graph assertion failures
- **Action**: Capture the full stack trace and send to Roman
- This is a **positive outcome** because it reveals the actual root cause

#### Scenario C: Test Fails with Same Generic Error ❌
- Worker still crashes with generic "EngineDeadError: EngineCore encountered an issue"
- No additional diagnostic information
- **Conclusion**: Strong evidence that "V1 + LoRA on Serverless" is currently unstable
- **Action**: 
  - Report to Roman that newer image didn't resolve the issue
  - Discuss alternatives:
    - Pin a known-good worker/vLLM combo (if one exists)
    - Move to a different serving approach for LoRA in Serverless
    - Continue using Pods mode until Serverless + LoRA is stable

#### Scenario D: Worker Fails to Start ⚠️
- Worker crashes during initialization (before processing any request)
- Likely cause: CUDA 12.8 not properly configured, or image incompatibility
- **Action**: 
  - Verify CUDA 12.8 is selected in endpoint settings
  - Check worker initialization logs for CUDA version mismatch errors
  - Report initialization failure to Roman

---

## Configuration Checklist

Before running the test, verify:

- [ ] Endpoint `brightrun-inference-official-vllm` (ID: `780tauhj7c126b`)
- [ ] Docker image set to: `madiatorlabs/worker-v1-vllm:v0.14.0` ✅
- [ ] CUDA version set to: **12.8** (⚠️ VERIFY THIS IN CONSOLE)
- [ ] All environment variables unchanged (especially `ENABLE_LORA=true`)
- [ ] Existing workers terminated to force fresh restart
- [ ] `INFERENCE_MODE=serverless` set in Vercel environment variables
- [ ] Test page ready: `https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test`

---

## What Roman Is Looking For

If the test still fails, Roman specifically wants to see:
- The section from **"Starting Serverless Worker"** through the crash
- Any **specific traceback** (not just "EngineDeadError: EngineCore encountered an issue")
- Evidence of whether the newer vLLM version surfaces a more detailed error

This will help determine:
1. Whether this is fixable with configuration changes
2. Whether this is a fundamental limitation of V1 + LoRA + Serverless
3. What the actual root cause is (LoRA load, apply, tokenizer, CUDA graph, etc.)

---

## Questions & Clarifications

### How to Set CUDA 12.8 in RunPod Console?

**Location**: RunPod Console → Serverless → Endpoints → (Select Endpoint) → Edit/Settings

**What to Look For**:
- A dropdown labeled **"CUDA Version"** or **"Runtime Configuration"**
- Options typically include: CUDA 11.8, CUDA 12.1, CUDA 12.4, **CUDA 12.8**
- Select **CUDA 12.8**
- **Save** the configuration

**If you cannot find the CUDA version setting**:
- Check under **"Advanced Settings"** or **"Runtime Settings"**
- Look for a section called **"Container Configuration"** or **"GPU Configuration"**
- The setting might be labeled **"CUDA Toolkit Version"** or **"CUDA Runtime"**

**If the setting is not visible**:
- Contact RunPod support to ask where CUDA version is configured for Serverless endpoints
- Alternatively, check if CUDA version is automatically detected from the Docker image

### What Else Do We Need to Do?

**Client-Side (Vercel/Application)**:
- ✅ No changes needed
- Our application code already has all fixes (message role validation, explicit model field)
- `INFERENCE_MODE=serverless` is already set in Vercel
- Request format is correct

**Server-Side (RunPod)**:
1. ⚠️ **Verify CUDA 12.8 is set** in endpoint configuration
2. ✅ Docker image already updated to `madiatorlabs/worker-v1-vllm:v0.14.0`
3. ⚠️ **Terminate existing workers** to force fresh restart
4. ✅ Environment variables are correct (no changes needed)

**Testing**:
1. Run the test from the web UI
2. Wait for completion (2-10 minutes)
3. Immediately capture logs
4. Analyze results

**Reporting**:
- Send Roman the specific log section he requested (worker start → crash)
- Include analysis of what changed (if anything) compared to previous tests
- Note whether the error is more specific or still generic

---

## Next Actions Required

### Immediate (Before Testing):
1. **VERIFY** CUDA 12.8 is set in RunPod endpoint configuration (this is the critical unknown)
2. **TERMINATE** all running workers for the endpoint
3. **WAIT** for workers to restart with new configuration

### During Test:
1. **RUN** test from `https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test`
2. **MONITOR** test progress (may take several minutes for cold start)
3. **OBSERVE** whether behavior differs from previous tests

### After Test:
1. **COLLECT** Vercel application log
2. **COLLECT** RunPod worker log (specifically: "Starting Serverless Worker" → crash/completion)
3. **ANALYZE** results against the 4 scenarios above
4. **REPORT** findings to Roman with the specific log section he requested

---

## Expected Timeline

- **Configuration**: 5-10 minutes (verify CUDA 12.8, terminate workers)
- **Worker Cold Start**: 2-5 minutes (vLLM engine initialization + LoRA loading)
- **Test Execution**: 1-3 minutes (if it gets to inference)
- **Log Collection**: 2-5 minutes (download and organize logs)
- **Total**: ~15-25 minutes for complete test cycle

---

**Status**: Awaiting CUDA 12.8 configuration verification before running test.
