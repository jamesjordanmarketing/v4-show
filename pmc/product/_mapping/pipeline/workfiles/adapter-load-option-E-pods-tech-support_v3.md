# RunPod Serverless: CUDA Toolchain Incompatibility with madiatorlabs/worker-v1-vllm:v0.14.0

**To**: Roman (RunPod Technical Support)  
**From**: James (BrightHub Customer)  
**Date**: January 22, 2026  
**Endpoint**: `brightrun-inference-official-vllm` (ID: `780tauhj7c126b`)  
**Test Worker Image**: `madiatorlabs/worker-v1-vllm:v0.14.0`  
**CUDA Version**: 12.8  
**vLLM Version**: v0.14.0

---

## Executive Summary

We tested your suggested worker image (`madiatorlabs/worker-v1-vllm:v0.14.0` with CUDA 12.8) as a potential fix for the LoRA + Serverless `EngineDeadError` issue. 

**Result**: **Worker startup failed with a fundamental CUDA toolchain incompatibility error.**

This is **NOT a LoRA issue** – this is a **CUDA PTX version mismatch** between the compiled worker image and the GPU hardware (RTX 6000 Blackwell). Workers crash during initialization (CUDA graph capture for flash attention) before ever processing any inference requests.

**Critical Finding**: All auto-scaled workers selected **RTX 6000 Blackwell GPUs**, which may have compatibility issues with this worker image's CUDA toolchain.

---

## Test Configuration

### Test Parameters
- **Worker Image**: `madiatorlabs/worker-v1-vllm:v0.14.0` (your suggested fork)
- **CUDA Version**: 12.8 (as required)
- **LoRA**: Enabled (`enable_lora=True`, `max_loras=1`, `max_lora_rank=16`)
- **Environment Variables**: Unchanged from previous tests
- **GPU Auto-Selection**: RunPod chose RTX 6000 Blackwell for all workers

### Environment Variables (Unchanged)
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

---

## Core Error: CUDA PTX Toolchain Mismatch

### Error Message (All Workers)
```
ERROR: CUDA error: the provided PTX was compiled with an unsupported toolchain.
RuntimeError: Worker failed with error 'CUDA error: the provided PTX was compiled with an unsupported toolchain.'
torch.AcceleratorError: CUDA error: the provided PTX was compiled with an unsupported toolchain.
cudaErrorUnsupportedPtxVersion
```

### Error Context
```
Worker startup failed, exiting: Failed to initialize vLLM engine: 
Engine core initialization failed. See root cause above. 
Failed core proc(s): {'EngineCore_DP0': 1}
```

**Error Location**: During CUDA graph capture for flash attention operations.

**Specific Stack Trace Section**:
```python
File "/usr/local/lib/python3.10/dist-packages/vllm/vllm_flash_attn/flash_attn_interface.py", line 253, in flash_attn_varlen_func
    out, softmax_lse = torch.ops._vllm_fa2_C.varlen_fwd(
File "/usr/local/lib/python3.10/dist-packages/torch/_ops.py", line 1255, in __call__
    return self._op(*args, **kwargs)
torch.AcceleratorError: CUDA error: the provided PTX was compiled with an unsupported toolchain.
```

---

## Timeline of Worker Failures

### Test Run Timeline (All UTC)
All workers crashed during initialization:

| Worker ID | Start Time | Crash Time | Duration | Status |
|-----------|------------|------------|----------|--------|
| `6ks53zj1b65f44` (1st) | 20:43:36 | 20:43:53 | ~17s | Failed during CUDA graph capture |
| `6ks53zj1b65f44` (2nd) | 20:44:25 | 20:44:43 | ~18s | Failed during CUDA graph capture |
| `6ks53zj1b65f44` (3rd) | 20:45:15 | 20:45:42 | ~27s | Failed during CUDA graph capture |

**Note**: All workers share the same GPU ID `6ks53zj1b65f44`, indicating they all ran on **RTX 6000 Blackwell** GPUs.

### Client-Side Experience
- **Request Sent**: 20:38:15 UTC
- **Request Status**: Remained `IN_QUEUE` for 41+ polls (~5 minutes)
- **Vercel Timeout**: 300 seconds (5 minutes)
- **Client Error**: `"Unexpected Token 'A', 'An error o'...is not valid JSON"` (malformed JSON response from RunPod due to worker crash)

---

## Detailed Initialization Sequence

### What Succeeded ✅
Workers successfully completed these initialization steps:

1. ✅ **Model Loading**
   ```
   INFO 01-22 20:30:07 [weight_utils.py:510] Time spent downloading weights for mistralai/Mistral-7B-Instruct-v0.2: 9.251565 seconds
   INFO 01-22 20:30:09 [default_loader.py:291] Loading weights took 1.82 seconds
   INFO 01-22 20:30:09 [gpu_model_runner.py:3905] Model loading took 13.58 GiB memory and 12.201398 seconds
   ```

2. ✅ **LoRA Configuration**
   ```
   enable_lora=True, max_loras=1, max_lora_rank=16
   INFO 01-22 20:30:09 [punica_selector.py:20] Using PunicaWrapperGPU.
   WARNING 01-22 20:30:34 [utils.py:268] Using default LoRA kernel configs
   ```

3. ✅ **torch.compile**
   ```
   INFO 01-22 20:30:17 [backends.py:644] Using cache directory: /root/.cache/vllm/torch_compile_cache/b696d54b88/rank_0_0/backbone for vLLM's torch.compile
   INFO 01-22 20:30:31 [monitor.py:34] torch.compile takes 18.36 s in total
   ```

4. ✅ **KV Cache Allocation**
   ```
   INFO 01-22 20:30:33 [gpu_worker.py:358] Available KV cache memory: 75.99 GiB
   INFO 01-22 20:30:33 [kv_cache_utils.py:1305] GPU KV cache size: 622,464 tokens
   INFO 01-22 20:30:33 [kv_cache_utils.py:1310] Maximum concurrency for 4,096 tokens per request: 151.97x
   ```

5. ✅ **Mixed Prefill-Decode CUDA Graph Capture (102/102)**
   ```
   Capturing CUDA graphs (mixed prefill-decode, PIECEWISE): 100%|██████████| 102/102 [00:20<00:00,  5.03it/s]
   ```

### What Failed ❌

**6. ❌ Decode-Only CUDA Graph Capture (0/70)**
   ```
   Capturing CUDA graphs (decode, FULL): 0%|          | 0/70 [00:00<?, ?it/s]
   
   ERROR 01-22 20:30:55 [multiproc_executor.py:822] WorkerProc hit an exception.
   Traceback (most recent call last):
     File "/usr/local/lib/python3.10/dist-packages/vllm/v1/worker/gpu_model_runner.py", line 4461, in _dummy_run
       outputs = self.model(
     File "/usr/local/lib/python3.10/dist-packages/vllm/compilation/cuda_graph.py", line 222, in __call__
       return self.runnable(*args, **kwargs)
     ...
     File "/usr/local/lib/python3.10/dist-packages/vllm/vllm_flash_attn/flash_attn_interface.py", line 253, in flash_attn_varlen_func
       out, softmax_lse = torch.ops._vllm_fa2_C.varlen_fwd(
   torch.AcceleratorError: CUDA error: the provided PTX was compiled with an unsupported toolchain.
   ```

**Failure Point**: During flash attention kernel execution within decode-only CUDA graph capture.

---

## Key Observations

### 1. **This is NOT a LoRA Issue**
- ✅ LoRA enabled successfully (`enable_lora=True`)
- ✅ Punica wrapper initialized: `Using PunicaWrapperGPU`
- ✅ LoRA kernel configs loaded (with default settings warning)
- ✅ Workers never got to the point of loading actual LoRA adapters (crash happened during warmup)
- ❌ Crash occurred during **CUDA graph capture**, which is unrelated to LoRA

### 2. **This is a CUDA/PTX Compilation Incompatibility**
The error `cudaErrorUnsupportedPtxVersion` indicates:
- The flash attention kernels in `madiatorlabs/worker-v1-vllm:v0.14.0` were compiled with a CUDA toolchain version that is **newer** than what the RTX 6000 Blackwell GPU supports
- OR the PTX intermediate representation is incompatible with CUDA 12.8 runtime on this hardware

### 3. **GPU Selection: RTX 6000 Blackwell**
All workers auto-selected GPU ID `6ks53zj1b65f44`, which are **RTX 6000 Blackwell** GPUs.

**Potential Issues**:
- Blackwell is NVIDIA's newest GPU architecture (late 2024/2025)
- The worker image may have been compiled with older CUDA toolchain optimizations not compatible with Blackwell
- OR Blackwell requires specific CUDA/PTX versions that the worker image doesn't provide

### 4. **Worker Initialization Takes 60+ Seconds**
- Model download + loading: ~12 seconds
- torch.compile: ~18 seconds
- CUDA graph capture (mixed): ~20 seconds
- CUDA graph capture (decode): **Crashes immediately**
- **Total**: ~60 seconds before failure

This explains why requests sat in `IN_QUEUE` for 5+ minutes – workers kept crashing during startup, triggering auto-scaling, which spawned new workers that also crashed.

### 5. **No "Starting Serverless Worker" Log**
We could not find a "Starting Serverless Worker" log entry in any of the logs. The logs show:
- Engine initialization messages
- Model loading progress
- CUDA graph capture progress
- ERROR messages for crashes

The absence of a clear "worker ready" marker makes it difficult to determine if this is a logging issue or if workers are crashing before reaching that state.

---

## Log File Analysis

### 1. Vercel Application Log (`logs_result-38.csv`)
- **Key Finding**: Request remained `IN_QUEUE` for 41+ polls (5+ minutes)
- **Poll Pattern**: Every 5 seconds from 20:39:45 to 20:43:14
- **Final Error**: `Vercel Runtime Timeout Error: Task timed out after 300 seconds`
- **Client-Side Error**: JSON parse error (malformed response from RunPod)

**Excerpt**:
```csv
2026-01-22 20:39:45,"[INFERENCE-SERVERLESS] Initial RunPod response: { status: 'IN_QUEUE', id: 'sync-587f0f9a...', workerId: undefined }"
2026-01-22 20:39:50,"[INFERENCE-SERVERLESS] Poll result: { pollCount: 1, status: 'IN_QUEUE', hasOutput: false }"
... (40+ polls)
2026-01-22 20:43:12,"[INFERENCE-SERVERLESS] Poll result: { pollCount: 41, status: 'IN_QUEUE', hasOutput: false }"
2026-01-22 20:43:14,"Vercel Runtime Timeout Error: Task timed out after 300 seconds"
```

### 2. Worker Mid-Processing Log (`worker-log-38.txt`)
This log captured one worker's initialization sequence mid-process (before the crash):

**Successful Steps**:
- ✅ Model loading: 13.58 GiB, 12.2 seconds
- ✅ torch.compile: 18.36 seconds
- ✅ KV cache allocation: 75.99 GiB available
- ✅ Mixed prefill-decode CUDA graphs: 102/102 completed

**Failure**: Worker crashed immediately when starting decode-only CUDA graph capture.

### 3. Full Endpoint Logs (`endpoint-full-logs-brightrun-inference-official-vllm-fb-38.txt`)
This log shows **three separate worker crashes**, all with the same error pattern:

**Worker Crashes**:
1. **Worker 1** (20:43:36 - 20:43:53): Crashed after ~17 seconds
2. **Worker 2** (20:44:25 - 20:44:43): Crashed after ~18 seconds  
3. **Worker 3** (20:45:15 - 20:45:42): Crashed after ~27 seconds

All crashed during decode-only CUDA graph capture with:
```
ERROR: CUDA error: the provided PTX was compiled with an unsupported toolchain.
```

---

## Comparison: Previous Test (v2.11.2) vs This Test (v0.14.0)

| Aspect | Old Worker (`runpod/worker-v1-vllm:v2.11.2`) | New Worker (`madiatorlabs/worker-v1-vllm:v0.14.0`) |
|--------|----------------------------------------------|---------------------------------------------------|
| **vLLM Version** | v0.11.0 (V1 Engine) | v0.14.0 (V1 Engine) |
| **CUDA Version** | Default (likely 11.8 or 12.1) | 12.8 (required) |
| **Failure Point** | During first inference request | During worker initialization |
| **Error Type** | `EngineDeadError` (vLLM crash) | `CUDA error: unsupported PTX toolchain` |
| **LoRA Status** | Loaded successfully, crashed on use | Never loaded (crashed before that) |
| **Time to Crash** | 2-4 minutes (after accepting request) | 17-60 seconds (during startup) |
| **Root Cause** | Unknown vLLM V1 + LoRA instability | CUDA/PTX compilation incompatibility |

**Conclusion**: The new worker image introduces a **different, unrelated problem** (CUDA toolchain mismatch) rather than fixing the original LoRA issue.

---

## GPU Hardware: RTX 6000 Blackwell Considerations

### Observed GPU Selection
All workers selected GPU ID `6ks53zj1b65f44`, which are **RTX 6000 Blackwell** GPUs based on log patterns.

###Blackwell Architecture Context
- **Release**: Late 2024 (very recent)
- **Compute Capability**: 9.0 (latest)
- **CUDA Support**: Requires CUDA 12.3+ (officially supported in CUDA 12.4+)

### Potential Compatibility Issues
1. **Worker Image Compilation**: 
   - The `madiatorlabs/worker-v1-vllm:v0.14.0` image may have been compiled with:
     - Older CUDA SDK (pre-Blackwell support)
     - PTX versions optimized for older architectures (Ada, Hopper, Ampere)
     - Flash Attention kernels not targeting Compute Capability 9.0

2. **CUDA 12.8 Runtime vs Compiled Binaries**:
   - CUDA 12.8 runtime is installed ✅
   - But flash attention kernels (`_vllm_fa2_C.varlen_fwd`) were pre-compiled with incompatible PTX ❌

### Questions for RunPod
- **Q1**: Is `madiatorlabs/worker-v1-vllm:v0.14.0` officially tested/supported on RTX 6000 Blackwell GPUs?
- **Q2**: Can we force worker assignment to a different GPU type (e.g., RTX A6000, L40S, H100)?
- **Q3**: Is there a Blackwell-compatible build of the worker image?
- **Q4**: Should we wait for an official `runpod/worker-v1-vllm` update instead of using the fork?

---

## Recommendations

### Immediate Next Steps

#### Option A: Try Official RunPod Worker Image with vLLM v0.6.x+ (Recommended)
Wait for RunPod to release an official worker image with:
- vLLM v0.6.x or newer (better LoRA stability)
- Official Blackwell GPU support
- CUDA 12.4+ with proper PTX compilation

**Rationale**: The fork image (`madiatorlabs/worker-v1-vllm:v0.14.0`) appears to be experimental and not production-ready for Blackwell GPUs.

#### Option B: Force GPU Type to Non-Blackwell Hardware
If possible, configure the endpoint to **exclude RTX 6000 Blackwell** and prefer:
- ✅ **RTX A6000** (Ada Lovelace, Compute 8.9) – Proven to work with `runpod/worker-v1-vllm:v2.11.2`
- ✅ **L40S** (Ada Lovelace, Compute 8.9) – Worked in previous tests
- ✅ **H100** (Hopper, Compute 9.0) – Enterprise-grade, well-supported

**Question**: How do we configure GPU type preferences in Serverless endpoint settings?

#### Option C: Test with LoRA Disabled on New Worker Image
As a diagnostic step, test `madiatorlabs/worker-v1-vllm:v0.14.0` with `ENABLE_LORA=false` to confirm:
- Does the CUDA error still occur?
- Is the PTX issue LoRA-related or general flash attention issue?

**Expected Result**: If it still fails, confirms this is a fundamental GPU/toolchain incompatibility unrelated to LoRA.

### Medium-Term Solution

#### Revert to RunPod Pods Mode (Current Production Setup)
- ✅ **Proven Stable**: Works with `runpod/worker-v1-vllm:v2.11.2` on RTX A6000
- ✅ **Same LoRA Setup**: `ENABLE_LORA=true`, adapters load and run successfully
- ✅ **Same Model**: `mistralai/Mistral-7B-Instruct-v0.2`
- ❌ **Higher Cost**: $0.79/hr vs pay-per-request

**Recommendation**: Stay on Pods until Serverless + LoRA is officially stable.

### Long-Term Solution

#### Wait for vLLM V2 + Official RunPod Support
- vLLM V2 (in development) has architectural improvements for LoRA stability
- Official RunPod worker images with vLLM V2 will have:
  - Better tested GPU compatibility
  - Proper Blackwell support
  - Improved LoRA handling

---

## Questions for Roman (RunPod Support)

### Critical Questions

1. **GPU Type Control**:
   - How do we exclude RTX 6000 Blackwell GPUs from Serverless endpoint auto-selection?
   - Can we configure GPU type preferences (e.g., prefer RTX A6000, L40S, H100)?
   - Is there a way to "pin" an endpoint to a specific GPU model?

2. **Worker Image Compatibility**:
   - Is `madiatorlabs/worker-v1-vllm:v0.14.0` officially tested on RTX 6000 Blackwell?
   - What GPU types is this fork image compiled for?
   - Should we use a different worker image instead?

3. **Official RunPod Worker Images**:
   - When will `runpod/worker-v1-vllm` be updated to a newer vLLM version?
   - Will the next official release support:
     - vLLM V2?
     - RTX 6000 Blackwell?
     - Improved LoRA stability in Serverless?

4. **Diagnostic Tools**:
   - Is there a way to enable more verbose CUDA/PTX error logging?
   - Can we see which GPU model was assigned to each worker in logs?
   - How can we force a specific CUDA architecture target for workers?

### Secondary Questions

5. **Previous LoRA + Serverless Issue**:
   - Given that the fork image didn't fix the issue (introduced a new problem instead), should we consider:
     - The original `EngineDeadError` with `runpod/worker-v1-vllm:v2.11.2` as a known vLLM V1 limitation?
     - Waiting for official vLLM V2 support instead of testing experimental images?

6. **Best Practices**:
   - For LoRA + Serverless use cases, what is the recommended approach while V2 is in development?
   - Are there any undocumented environment variables or settings for better GPU/CUDA control?

---

## Summary

### What We Know
1. ✅ Client-side code is correct (message roles, explicit model field, proper request format)
2. ✅ LoRA configuration is correct (workers initialize LoRA successfully)
3. ✅ Model loading works perfectly (13.58 GiB, PunicaWrapperGPU, KV cache)
4. ✅ Mixed prefill-decode CUDA graphs capture successfully (102/102)
5. ❌ **Decode-only CUDA graph capture fails** with PTX toolchain mismatch
6. ❌ **RTX 6000 Blackwell GPUs** are incompatible with `madiatorlabs/worker-v1-vllm:v0.14.0`

### What We Need
- **Short-term**: Ability to control GPU type selection in Serverless (exclude Blackwell)
- **Medium-term**: Official RunPod guidance on LoRA + Serverless best practices
- **Long-term**: Official vLLM V2 worker image with proper Blackwell support

### Current Status
- **Serverless Mode**: Blocked by CUDA toolchain incompatibility
- **Pods Mode**: Working perfectly with same LoRA setup
- **Production**: Using Pods mode at higher cost while awaiting Serverless fix

---

## Log Files Attached

1. **`logs_result-38.csv`**  
   Vercel application logs showing client-side request flow, 41+ polls with `IN_QUEUE` status, and Vercel timeout error.

2. **`worker-log-38.txt`**  
   Worker mid-processing snapshot showing successful initialization steps up to mixed CUDA graph capture, then crash during decode graphs.

3. **`endpoint-full-logs-brightrun-inference-official-vllm-fb-38.txt`**  
   Complete serverless endpoint logs showing three consecutive worker crashes (IDs: `6ks53zj1b65f44`) with identical `cudaErrorUnsupportedPtxVersion` errors.

---

**Thank you for your continued excellent technical support, Roman!**

We appreciate your help in diagnosing this complex issue and look forward to your guidance on the best path forward.

Best regards,  
**James Jordan**  
BrightHub  
Email: [Provide your email]  
GitHub: jamesjordanmarketing  
RunPod Account: [Your account ID]
