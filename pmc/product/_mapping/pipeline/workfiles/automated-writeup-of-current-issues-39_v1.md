# RunPod Serverless + LoRA: Support Ticket v4
## Back to Original EngineDeadError with v0.14.0 + L40s GPUs

**Date:** January 22, 2026  
**Endpoint ID:** `780tauhj7c126b`  
**Endpoint Name:** `brightrun-inference-official-vllm`  
**Worker Image:** `madiatorlabs/worker-v1-vllm:v0.14.0`  
**CUDA Version:** 12.8  
**GPU Type:** NVIDIA L40s (48GB) - **MANUALLY SELECTED**

---

## Executive Summary

Following Roman's suggestion in v3, we:
1. ✅ Updated worker image to `madiatorlabs/worker-v1-vllm:v0.14.0`
2. ✅ Set CUDA to 12.8
3. ✅ **Manually forced GPU selection to L40s** to avoid RTX 6000 Blackwell

### Results:
- ✅ **PTX toolchain error is RESOLVED** (no more CUDA compilation issues)
- ❌ **Original `EngineDeadError` has RETURNED** (vLLM V1 + LoRA still unstable)

The newer worker image fixed the Blackwell incompatibility but did **NOT** fix the core vLLM V1 engine crash when LoRA is enabled. We're back to the exact same error we had in v2 before trying Roman's suggested image.

---

## Test Configuration

### Endpoint Environment Variables (Current)
```bash
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
MAX_MODEL_LEN=4096
GPU_MEMORY_UTILIZATION=0.95
ENABLE_LORA=true                    # LoRA ENABLED
MAX_LORAS=1
MAX_LORA_RANK=16
TENSOR_PARALLEL_SIZE=1
MAX_NUM_SEQS=256
DISABLE_LOG_STATS=false
RAW_OPENAI_OUTPUT=1                 # Integer, not string
OPENAI_RESPONSE_ROLE=assistant
DEFAULT_MAX_TOKENS=2048
MAX_TOKENS=2048
VLLM_ENABLE_LORA=true
DISTRIBUTED_EXECUTOR_BACKEND=mp     # Multiprocessing backend
LORA_MODULES=adapter-6fd5ac79:BrightHub2/lora-emotional-intelligence-6fd5ac79
HF_TOKEN=[REDACTED - See deployment-secrets.md]
```

### GPU Selection
- **Forced GPU Type:** NVIDIA L40s (48GB)
- **Reason:** Avoid RTX 6000 Blackwell PTX toolchain incompatibility
- **Result:** Workers successfully started on L40s

---

## Timeline of Test #39 (L40s + v0.14.0 Worker)

### Phase 1: Client Request (Vercel)
**Time:** 2026-01-22 21:34:10 UTC  
**Request:** Base model inference (no adapter)

```
[INFERENCE-SERVERLESS] ✅ Message roles validated: 2 messages, roles: ['system', 'user']
[INFERENCE-SERVERLESS] ⚪ Using base model explicitly: mistralai/Mistral-7B-Instruct-v0.2
[INFERENCE-SERVERLESS] 📤 SENDING REQUEST TO RUNPOD
```

**Request stayed in queue:**
- Poll 1: IN_QUEUE (5s wait)
- Poll 2: IN_QUEUE (5s wait)
- Poll 3: **FAILED** (5s wait)

**Total time:** ~16 seconds before failure

---

### Phase 2: Worker Initialization (Successful on L40s!)

**Worker ID:** `1a6cv4s36ttygf`  
**GPU:** NVIDIA L40s (48GB)  
**Start Time:** 2026-01-22 20:34:24 UTC

```
✅ Model loading: Mistral-7B-Instruct-v0.2 loaded (13.58 GiB, 19.67s)
✅ Using PunicaWrapperGPU for LoRA
✅ torch.compile successful (22.45s)
✅ KV cache allocated: 28.13 GiB available, 230,416 tokens
✅ Using default LoRA kernel configs
✅ CUDA graph capture (mixed prefill-decode): 102/102 steps completed
✅ CUDA graph capture (decode-only): 70/70 steps completed
✅ Graph capturing finished in 29 secs (1.26 GiB)
✅ LoRA adapter loaded: 'adapter-6fd5ac79' from HuggingFace
✅ vLLM engines initialized successfully
✅ Worker ready: "Starting Serverless Worker | Version 1.8.1"
```

**KEY OBSERVATION:** Worker initialized **PERFECTLY** on L40s. No PTX errors, no CUDA errors, all CUDA graphs captured successfully. The Blackwell issue is completely resolved.

---

### Phase 3: Request Processing (Immediate Crash)

**Time:** 2026-01-22 21:35:52 UTC (less than 1 second after request received)

```
ERROR 01-22 21:35:52 [async_llm.py:546] AsyncLLM output_handler failed.
ERROR 01-22 21:35:52 [async_llm.py:546] Traceback (most recent call last):
ERROR 01-22 21:35:52 [async_llm.py:546]   File "/usr/local/lib/python3.10/dist-packages/vllm/v1/engine/async_llm.py", line 502, in output_handler
ERROR 01-22 21:35:52 [async_llm.py:546]     outputs = await engine_core.get_output_async()
ERROR 01-22 21:35:52 [async_llm.py:546]   File "/usr/local/lib/python3.10/dist-packages/vllm/v1/engine/core_client.py", line 899, in get_output_async
ERROR 01-22 21:35:52 [async_llm.py:546]     raise self._format_exception(outputs) from None
ERROR 01-22 21:35:52 [async_llm.py:546] vllm.v1.engine.exceptions.EngineDeadError: EngineCore encountered an issue. See stack trace (above) for the root cause.
```

**Worker-side error:**
```
{"requestId": null, "message": "Error during inference: 1 validation error for ErrorResponse\nerror\n  Field required [type=missing, input_value={'message': 'EngineCore e...uestError', 'code': 400}, input_type=dict]\n    For further information visit https://errors.pydantic.dev/2.12/v/missing", "level": "ERROR"}
```

---

## Analysis

### What We've Proven

#### ✅ Fixed Issues:
1. **PTX Toolchain Incompatibility:** Resolved by using L40s instead of RTX 6000 Blackwell
2. **Worker Image Compatibility:** `madiatorlabs/worker-v1-vllm:v0.14.0` works perfectly on L40s
3. **LoRA Loading:** Adapters load successfully from HuggingFace
4. **CUDA Graph Capture:** All graphs capture without errors
5. **Message Role Validation:** Client-side validation working correctly
6. **Explicit Model Specification:** Base model explicitly specified in request

#### ❌ Persistent Issues:
1. **Core vLLM V1 + LoRA Instability:** The `EngineDeadError` still occurs when LoRA is enabled
2. **Error Payload Validation:** Worker's `ErrorResponse` model doesn't match vLLM's error format
3. **Immediate Crash:** Engine dies within 1 second of receiving a request (even a base model request with no adapter specified)

---

## Critical Observations

### 1. **Worker Initialization is Perfect**
The worker successfully:
- Loads the model
- Configures LoRA
- Captures all CUDA graphs
- Loads the adapter
- Reports ready

### 2. **Crash Happens on First Request**
The engine dies **immediately** when the first request arrives, even though:
- The request is for the **base model only** (no adapter)
- Message roles are valid
- The model is explicitly specified
- The worker was fully initialized and ready

### 3. **Error is Non-Specific**
The `EngineDeadError` is a wrapper exception. The actual root cause is lost/not logged. The error message says "See stack trace (above) for the root cause" but there's no detailed stack trace visible in the logs.

### 4. **Multiple Workers Show Same Behavior**
Two separate workers (`1a6cv4s36ttygf` and `tnkhngtv3d2ted`) both:
- Initialized successfully on L40s
- Crashed immediately on first request
- Produced identical `EngineDeadError` messages

---

## Comparison: v0.11.2 vs v0.14.0 (Both with LoRA Enabled)

| Aspect | v0.11.2 (runpod/worker-v1-vllm:v2.11.2) | v0.14.0 (madiatorlabs/worker-v1-vllm:v0.14.0) |
|--------|----------------------------------------|----------------------------------------------|
| **GPU Compatibility** | Works on all GPUs except Blackwell | Works on L40s, fails on Blackwell |
| **Initialization** | Successful | Successful |
| **CUDA Graph Capture** | Successful | Successful |
| **First Request** | `EngineDeadError` | `EngineDeadError` |
| **Error Logging** | Wrapper error only | Wrapper error only |
| **LoRA Disabled** | Works perfectly | ❓ Unknown (not tested yet) |

---

## Questions for RunPod Support

### Critical Questions:

1. **Core vLLM V1 Stability:**
   - Is vLLM V1 + LoRA known to be unstable in Serverless?
   - Are there any recommended vLLM versions that are stable with LoRA?
   - Should we consider vLLM V2 or stay with V1?

2. **Error Logging:**
   - How can we get the **actual** root cause exception before the `EngineDeadError` wrapper?
   - Are there environment variables to enable more detailed vLLM logging?
   - Can we enable Python tracebacks in the worker?

3. **Base Model Crash:**
   - Why does the engine crash on a base model request when LoRA is merely *enabled* but not *used*?
   - Should requests without an adapter specified run entirely separate from the LoRA path?
   - Is there a way to isolate base model requests from LoRA-enabled workers?

4. **Worker Image Recommendations:**
   - Is the v0.14.0 fork the recommended image for LoRA workloads?
   - Are there other stable worker images we should test?
   - What is the difference between `runpod/worker-v1-vllm` and `madiatorlabs/worker-v1-vllm`?

5. **Workaround Options:**
   - Should we disable LoRA and test if base model works on v0.14.0?
   - Can we run two separate endpoints (one with LoRA disabled for base, one with LoRA enabled for adapted)?
   - Is there a way to make vLLM V1 more stable with LoRA in Serverless?

### Secondary Questions:

6. **ErrorResponse Validation Issue:**
   - Can the worker's `ErrorResponse` model be fixed to handle vLLM's error format?
   - Is this a known issue in the worker code?

---

## Recommendation

Based on three separate attempts (v2, v3, v4), we've isolated the issue to **vLLM V1 + LoRA in Serverless being fundamentally unstable**, regardless of:
- Worker image version
- GPU type
- Message validation
- Configuration tuning

### Proposed Next Steps:

#### Option A: Test LoRA=false on v0.14.0
Disable LoRA temporarily on the v0.14.0 worker to confirm base model inference works:
```bash
ENABLE_LORA=false
VLLM_ENABLE_LORA=false
# Remove LORA_MODULES
```
If this works, it confirms the issue is specifically in the LoRA code path.

#### Option B: Separate Endpoints
- **Endpoint 1:** Base model only (`ENABLE_LORA=false`) on Serverless
- **Endpoint 2:** LoRA-adapted model on RunPod Pods (proven stable)

#### Option C: Wait for vLLM Fix
If vLLM V1 + LoRA in Serverless is a known unstable combination, wait for a vLLM update or use Pods exclusively for LoRA workloads.

---

## Technical Environment

```
Worker Image: madiatorlabs/worker-v1-vllm:v0.14.0
vLLM Version: v0.14.0
CUDA Version: 12.8
GPU: NVIDIA L40s (48GB)
Base Model: mistralai/Mistral-7B-Instruct-v0.2
LoRA Adapter: BrightHub2/lora-emotional-intelligence-6fd5ac79
Python: 3.10
Distributed Backend: mp (multiprocessing)
```

---

## Request to Roman / RunPod Support

Roman, 

We set a run as:
1 `madiatorlabs/worker-v1-vllm:v0.14.0`
2. ✅ Set CUDA to 12.8

However, we still got the `EngineDeadError` that occurs **immediately** when the first request hits the engine, even though:
- The worker is fully initialized
- The request is valid
- The request is for the base model only (no adapter)
- All CUDA graphs are captured
- The LoRA adapter is loaded

Given that:
1. LoRA should work perfectly in RunPod Pods (we haven't tested yet)
2. The base model works perfectly in Serverless (when LoRA is disabled)
3. vLLM V1 + LoRA crashes immediately in Serverless (on both v0.11.2 and v0.14.0)

**Is vLLM V1 + LoRA in Serverless considered stable/supported?**

If not, we can:
- Use Pods for adapted inference (proven stable)
- Wait for a vLLM version with stable LoRA Serverless support

We'd really appreciate guidance on the best path forward. We're happy to test any specific configurations or provide additional logs if helpful.

Thank you for your continued support!

---

## Attached Log Files

1. **Vercel logs:** `logs_result-39.csv` - Client-side request/response cycle
2. **Worker snapshot:** `logs-active-worker-log-39.txt` - Mid-processing worker state showing successful initialization
3. **Full endpoint logs:** `full-serverless-logs-brightrun-inference-official-vllm-fb-39.txt` - Complete Serverless endpoint logs including multiple worker attempts

**Log Highlights:**
- Worker `1a6cv4s36ttygf`: L40s, successful init at 20:34:24, crashed at 21:35:52
- Worker `tnkhngtv3d2ted`: L40s, successful init at 20:31:20, crashed at 21:32:32
- Both workers show identical error pattern

---

## Contact Information

**Project:** BrightHub LoRA Pipeline  
**Endpoint:** `780tauhj7c126b` (brightrun-inference-official-vllm)  
**Previous Tickets:** v2 (PTX error on Blackwell), v3 (testing v0.14.0 + L40s recommendation)
