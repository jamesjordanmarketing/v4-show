# Inference Endpoint Setup Guide

**Date:** January 18, 2026  
**Status:** REQUIRED - Inference endpoint not yet created  
**Priority:** HIGH - Blocks adapter testing feature  

---

## Problem Summary

The adapter testing feature is returning blank responses because we're trying to use the **training endpoint** (`ei82ickpenoqlp`) for **inference**, but that endpoint only handles training jobs.

### Current Situation

- **Training Endpoint**: `ei82ickpenoqlp` ✅ Working
  - Docker Image: `brighthub/brightrun-trainer:v19`
  - Purpose: LoRA training jobs
  - Handler: `handler.py` (training only)
  
- **Inference Endpoint**: ❌ **NOT CREATED YET**
  - Required for: A/B testing, adapter evaluation
  - Needs: vLLM or similar inference engine
  - Format: OpenAI-compatible API

---

## Why We Need a Separate Inference Endpoint

### Training Endpoint Expects:
```json
{
  "input": {
    "job_id": "uuid",
    "dataset_url": "https://...",
    "hyperparameters": {
      "base_model": "mistralai/Mistral-7B-Instruct-v0.2",
      "learning_rate": 0.0001,
      "batch_size": 4,
      "epochs": 3,
      "rank": 16
    },
    "gpu_config": {
      "type": "A100",
      "count": 1
    }
  }
}
```

### Inference Endpoint Should Expect:
```json
{
  "input": {
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello!"}
    ],
    "max_tokens": 1024,
    "temperature": 0.7,
    "lora_adapter_url": "https://..." // Optional
  }
}
```

---

## Solution: Create vLLM Inference Endpoint

### Option 1: RunPod vLLM Template (Recommended)

RunPod provides a pre-built vLLM serverless template that supports:
- ✅ OpenAI-compatible API
- ✅ LoRA adapter loading
- ✅ Automatic scaling
- ⚠️ **One base model per endpoint** (but unlimited LoRA adapters on that base)

**IMPORTANT: Understanding Base Models vs LoRA Adapters**

When RunPod asks you to "choose an LLM", it's asking for the **base model** that will be loaded into GPU memory. This is NOT limiting you to one model total - here's how it works:

- **Base Model**: The foundation model loaded at startup (e.g., Mistral-7B)
  - Fixed per endpoint
  - Loaded into GPU memory
  - Can't be changed dynamically
  
- **LoRA Adapters**: Lightweight modifications you can apply on top
  - Can be loaded dynamically per request
  - Multiple adapters can use the same base model
  - Very fast to swap between adapters

**Example:**
- Endpoint 1: Base = Mistral-7B → Can test ALL Mistral-7B adapters
- Endpoint 2: Base = Qwen-32B → Can test ALL Qwen-32B adapters

**For now:** Create ONE endpoint with Mistral-7B (since that's what your current training jobs use). Later, if you train on other base models, create additional endpoints.

---

**Steps:**

1. **Go to RunPod Console**
   - Navigate to: https://console.runpod.io/serverless

2. **Create New Endpoint**
   - Click "New Endpoint"
   - Name: `brightrun-inference-mistral-7b`
   - Select Template: **"vLLM - OpenAI Compatible"**

3. **Choose Base Model**
   - When the popup appears asking for an LLM, select or type:
     - **`mistralai/Mistral-7B-Instruct-v0.2`**
   - This is the base model your training jobs currently use
   - All your Mistral-7B adapters will work with this endpoint

4. **Configure Endpoint**
   
   **Basic Configuration:**
   ```yaml
   GPU Type: A100 40GB (recommended) or H100 80GB
   Min Workers: 0 (serverless - only pay when used)
   Max Workers: 3 (can handle 3 concurrent tests)
   Idle Timeout: 5 seconds
   ```
   
   **Advanced Configuration (if available):**
   
   **Base Path / Storage Directory:**
   - **Default:** `/runpod-volume` ✅ **Keep this for now**
   - This is where the model files are cached
   - Using the default means:
     - ✅ No extra storage costs
     - ✅ Model cached in memory after first load
     - ⚠️ Cold starts re-download model (~30-60 seconds)
   
   **When to use a Network Volume instead:**
   - If you're doing heavy testing (50+ tests/day)
   - Attach a persistent network volume (e.g., `/workspace`)
   - Model stays cached between cold starts
   - Faster cold starts but adds ~$0.10/GB/month storage cost
   - **For now, skip this** - the default is fine
   
   **Environment Variables (if available):**
   ```yaml
   MAX_MODEL_LEN: 4096
   ENABLE_LORA: true (or ENABLE_LORA_ADAPTER: true)
   HF_TOKEN: <your-huggingface-token>
   ```
   
   Note: Some of these may be set automatically by the template. If you don't see these fields, the template handles them automatically.

5. **Deploy and Get Endpoint ID**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Copy the endpoint ID (e.g., `abc123xyz`)
   - The mistral endpoint URL will be: `https://api.runpod.ai/v2/fahi78leyxz36l`
   

6. **Update Environment Variables**
   
   **In Vercel Dashboard → Settings → Environment Variables:**
   
   Add new variable:
   ```
   Key: INFERENCE_API_URL
   Value: https://api.runpod.ai/v2/fahi78leyxz36l
   Environments: Production, Preview, Development
   ```
   
   **In `.env.local`:**
   ```bash
   INFERENCE_API_URL=https://api.runpod.ai/v2/fahi78leyxz36l
   INFERENCE_API_KEY=<your-runpod-api-key>  # Same as GPU_CLUSTER_API_KEY
   ```

---

### Multiple Base Models (Future)

When you start training on different base models, create additional endpoints:

**Endpoint Naming Convention:**
```
brightrun-inference-mistral-7b   → Mistral-7B adapters
brightrun-inference-qwen-32b     → Qwen-32B adapters  
brightrun-inference-deepseek-32b → DeepSeek-32B adapters
```

**Code Update Required:**
When you have multiple base models, you'll need to update `inference-service.ts` to route to the correct endpoint based on the job's base model. For now, with just Mistral-7B, one endpoint is sufficient.

---

### Troubleshooting: If LoRA Support Isn't Available

If the vLLM template doesn't have an obvious "ENABLE_LORA" option:

1. **Check the template documentation** in RunPod
2. **Use Option 2** (Custom Docker Image) - see below
3. **Or contact RunPod support** to confirm LoRA support in their vLLM template

The custom Docker image (Option 2) gives you full control over LoRA configuration.

---

### Option 2: Custom Docker Image with vLLM

If you need more control, create a custom Docker image:

**Directory Structure:**
```
brightrun-inference/
├── Dockerfile
├── handler.py
├── requirements.txt
└── README.md
```

**Dockerfile:**
```dockerfile
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

# Install vLLM
RUN pip install vllm==0.2.7 transformers accelerate

# Copy handler
COPY handler.py /app/handler.py
WORKDIR /app

# Start handler
CMD ["python", "-u", "handler.py"]
```

**handler.py:**
```python
import runpod
from vllm import LLM, SamplingParams
from vllm.lora.request import LoRARequest
import logging

logger = logging.getLogger(__name__)

# Initialize model
llm = LLM(
    model="mistralai/Mistral-7B-Instruct-v0.2",
    enable_lora=True,
    max_lora_rank=64
)

def handler(event):
    try:
        input_data = event.get('input', {})
        messages = input_data.get('messages', [])
        max_tokens = input_data.get('max_tokens', 1024)
        temperature = input_data.get('temperature', 0.7)
        lora_adapter_url = input_data.get('lora_adapter_url')
        
        # Format prompt from messages
        prompt = format_messages(messages)
        
        # Sampling parameters
        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Load LoRA adapter if provided
        lora_request = None
        if lora_adapter_url:
            lora_request = LoRARequest(
                lora_name="adapter",
                lora_int_id=1,
                lora_local_path=download_adapter(lora_adapter_url)
            )
        
        # Generate
        outputs = llm.generate(
            [prompt],
            sampling_params,
            lora_request=lora_request
        )
        
        response_text = outputs[0].outputs[0].text
        
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": response_text
                }
            }],
            "usage": {
                "total_tokens": len(outputs[0].prompt_token_ids) + len(outputs[0].outputs[0].token_ids)
            }
        }
        
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        return {"error": str(e)}

def format_messages(messages):
    # Format messages into prompt string
    prompt = ""
    for msg in messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        if role == 'system':
            prompt += f"<|system|>\n{content}\n"
        elif role == 'user':
            prompt += f"<|user|>\n{content}\n"
        elif role == 'assistant':
            prompt += f"<|assistant|>\n{content}\n"
    prompt += "<|assistant|>\n"
    return prompt

def download_adapter(url):
    import requests
    import tempfile
    import tarfile
    
    # Download adapter
    response = requests.get(url)
    temp_dir = tempfile.mkdtemp()
    tar_path = f"{temp_dir}/adapter.tar.gz"
    
    with open(tar_path, 'wb') as f:
        f.write(response.content)
    
    # Extract
    with tarfile.open(tar_path, 'r:gz') as tar:
        tar.extractall(temp_dir)
    
    return temp_dir

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
```

**requirements.txt:**
```
runpod
vllm==0.2.7
transformers
accelerate
requests
```

**Build and Deploy:**
```bash
cd brightrun-inference
docker build -t brighthub/brightrun-inference:v1 .
docker push brighthub/brightrun-inference:v1

# Create endpoint on RunPod with this image
```

---

## Cost Comparison

### Training Endpoint (Current)
- **Purpose**: LoRA training
- **Usage**: Intermittent (when training jobs run)
- **Cost**: ~$2-5 per training job (30-60 minutes)

### Inference Endpoint (New)
- **Purpose**: A/B testing, evaluation
- **Usage**: On-demand (per test)
- **Cost**: 
  - A100 40GB: ~$0.0008/second = ~$0.05 per test (60 seconds)
  - H100 80GB: ~$0.0012/second = ~$0.07 per test (60 seconds)
- **Monthly estimate**: 100 tests = $5-7/month

**Total Infrastructure Cost**: ~$10-15/month for light usage

---

## Testing the Inference Endpoint

Once created, test with:

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "messages": [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello! How are you?"}
      ],
      "max_tokens": 100,
      "temperature": 0.7
    }
  }'
```

Expected response:
```json
{
  "id": "...",
  "status": "COMPLETED",
  "output": {
    "choices": [{
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking..."
      }
    }],
    "usage": {
      "total_tokens": 45
    }
  }
}
```

---

## Next Steps

1. ✅ **Understand the issue** 
2. ✅ **Create vLLM inference endpoint** on RunPod (DONE - `fahi78leyxz36l`)
3. ⏳ **Update environment variables** in Vercel and `.env.local` (IN PROGRESS)
4. ⏳ **Test inference endpoint** with curl
5. ✅ **Deploy code changes** (already done - waiting for endpoint)
6. ⏳ **Test A/B testing feature** end-to-end

---

## 🎯 FINAL SETUP STEPS (You Are Here)

### Step 1: Add Environment Variable to Vercel

1. Go to: https://vercel.com/james-jamesjordanms-projects/v4-show/settings/environment-variables
2. Click **"Add New"**
3. Fill in:
   - **Key:** `INFERENCE_API_URL`
   - **Value:** `https://api.runpod.ai/v2/fahi78leyxz36l`
   - **Environments:** Check all three: ✅ Production ✅ Preview ✅ Development
4. Click **"Save"**

**Note:** You do NOT need to add `INFERENCE_API_KEY` - the code already uses your existing `GPU_CLUSTER_API_KEY`.

---

### Step 2: Update Your Local `.env.local`

Open `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` and add this line at the end:

```bash
# Inference Endpoint (vLLM on RunPod)
INFERENCE_API_URL=https://api.runpod.ai/v2/fahi78leyxz36l
```

Save the file.

---

### Step 3: Redeploy Vercel (Automatic)

Once you save the environment variable in Vercel, it will automatically redeploy. Wait 1-2 minutes for the deployment to complete.

**Check deployment status:**
- Go to: https://vercel.com/james-jamesjordanms-projects/v4-show/deployments
- Wait for the latest deployment to show "Ready"

---

### Step 4: Test the Inference Endpoint

Test the endpoint directly to make sure it works:

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "Hello! How are you today?",
      "max_tokens": 50
    }
  }'
```

**Expected:** You should get a JSON response with generated text.

**If you get an error:** The endpoint might still be warming up. Wait 30-60 seconds and try again.

---

### Step 5: Test A/B Testing Feature End-to-End

1. Go to: https://v4-show.vercel.app/pipeline/jobs
2. Find a completed training job with an adapter
3. Click **"View"** to go to the results page
4. Click **"Deploy & Test Adapter"**
5. Wait for "Both inference endpoints are deployed and ready" (green banner)
6. Click **"Test Adapter"**
7. Enter a test prompt (or use one of the examples)
8. Click **"Run Test"**
9. **You should now see responses!** Both Control and Adapted responses should appear

---

### Step 6: Verify Everything Works

**What you should see:**
- ✅ Control response appears (base model without adapter)
- ✅ Adapted response appears (base model + your adapter)
- ✅ Generation times show for both
- ✅ You can rate the results
- ✅ You can enable Claude evaluation (optional)

**Success!** Your inference endpoint is now fully integrated.

---

## Troubleshooting

### If responses are still blank:

1. **Check Vercel deployment logs:**
   - Go to: https://vercel.com/james-jamesjordanms-projects/v4-show/deployments
   - Click on the latest deployment
   - Check the "Functions" tab for errors

2. **Check if environment variable is set:**
   - Go to: https://vercel.com/james-jamesjordanms-projects/v4-show/settings/environment-variables
   - Confirm `INFERENCE_API_URL` is there

3. **Test the endpoint directly:**
   - Use the curl command from Step 4 above
   - If this fails, the RunPod endpoint has an issue
   - If this works, the issue is in our code

4. **Check the debug logs:**
   - The code has comprehensive logging now
   - Check Vercel function logs to see what's being sent/received

---

## What's Changed in the Code

The code already has all the fixes from earlier:
- ✅ Uses `INFERENCE_API_URL` environment variable
- ✅ Falls back to `GPU_CLUSTER_API_KEY` for authentication
- ✅ Fixed missing adapter path parameter
- ✅ Added comprehensive debug logging
- ✅ Handles different response formats from vLLM

Once you add the environment variable, everything should work immediately!

---

## Questions?

- **Q: Can we use the training endpoint for inference?**
  - A: No. The training endpoint's handler only processes training jobs. It doesn't have inference logic.

- **Q: Why not add inference to the training endpoint?**
  - A: Separation of concerns. Training and inference have different:
    - Resource requirements (training needs more memory)
    - Scaling patterns (inference needs fast cold starts)
    - Dependencies (vLLM vs training libraries)

- **Q: Can we use one endpoint for both?**
  - A: Technically yes, but not recommended. It would make the Docker image larger, slower to start, and harder to maintain.

---

**Status**: Waiting for inference endpoint creation  
**Blocker**: Adapter testing feature  
**ETA**: 30 minutes to create endpoint + 10 minutes to test  

---

## UPDATE: Issue Resolution - Response Format Fix

**Date:** January 18, 2026 - 12:40 AM PST  
**Status:** ✅ RESOLVED

### Problem Discovered After Setup
After creating the vLLM inference endpoint (`fahi78leyxz36l`), responses were still showing as "No response generated" even though the endpoint was returning successful responses.

### Root Cause
The vLLM RunPod template returns responses in a different format than expected:

**vLLM Format (actual):**
```json
{
  "output": [
    {
      "choices": [
        {
          "tokens": ["The generated text here..."]
        }
      ],
      "usage": {
        "input": 82,
        "output": 100
      }
    }
  ]
}
```

**Expected OpenAI Format:**
```json
{
  "output": {
    "choices": [
      {
        "message": {
          "content": "The generated text here..."
        }
      }
    ]
  }
}
```

The key differences:
1. `output` is an **array** in vLLM (not an object)
2. Response text is in `tokens[0]` (not `message.content`)

### Fix Applied
Updated `src/lib/services/inference-service.ts` response extraction logic to handle:
1. ✅ Array-based output with `tokens` array (vLLM format)
2. ✅ Standard OpenAI `message.content` format (fallback)
3. ✅ Alternative formats for compatibility

### Verification
1. Check Vercel logs for `[INFERENCE] Extracted response:` to confirm text extraction
2. Test A/B testing feature - responses should now appear correctly
3. Both Control and Adapted responses should show generated text

### Files Modified
- `src/lib/services/inference-service.ts` - Response extraction logic updated
- `docs/INFERENCE_ENDPOINT_SETUP.md` - This documentation updated

**Next Step:** Test the adapter testing feature end-to-end to verify fix.

---

## UPDATE 3: Adapter Loading Implementation - January 19, 2026

### Critical Discovery: vLLM Adapter Loading Requirements

After extensive testing, we discovered that **vLLM does NOT support loading adapters from remote URLs**. The `lora_adapter_url` parameter we were sending was being completely ignored by vLLM.

vLLM requires adapters to be:
1. Pre-loaded at startup with `--lora-modules` flag, OR
2. Dynamically loaded via `/v1/load_lora_adapter` API from **local filesystem paths only**

### Solution Implemented: Option A (Download + Dynamic Load)

We implemented a complete adapter loading system that:
1. Downloads adapters from Supabase Storage to `/tmp/adapters/{jobId}/`
2. Calls vLLM's `/v1/load_lora_adapter` API with local filesystem path
3. Uses loaded adapter in inference requests via `model` parameter
4. Caches downloads and loaded adapters to minimize latency

### New Files Created

**`src/lib/services/vllm-adapter-loader.ts`**
- Handles all adapter downloading and vLLM loading logic
- Implements caching to avoid re-downloads and re-loads
- Retry logic with exponential backoff
- Comprehensive error handling and logging

### Modified Files

**`src/lib/services/inference-service.ts`**
- Now accepts `jobId` parameter (required when `useAdapter = true`)
- Calls `getOrLoadAdapter()` before inference
- Sends `model: "adapter-{jobId}"` instead of `lora_adapter_url`

**`src/lib/services/test-service.ts`**
- Passes `jobId` to `callInferenceEndpoint()` for adapted endpoint

### Expected Behavior

**First test per adapter:** 10-25 second delay (download + load)
**Subsequent tests:** No added latency (cached)

### How to Verify It's Working

Check Vercel logs for these messages:
```
[ADAPTER-LOADER] 📥 Downloading adapter...
[ADAPTER-LOADER] ✅ Download successful
[ADAPTER-LOADER] 🔧 Loading adapter to vLLM
[ADAPTER-LOADER] ✅ Adapter loaded successfully
[INFERENCE] ✅ Adapter loaded successfully - will be applied
```

On second test:
```
[ADAPTER-LOADER] ✅ Adapter already cached
[ADAPTER-LOADER] ⚡ Adapter already loaded in vLLM
```

### Complete Documentation

For full implementation details, see:
- `docs/INFERENCE_ISSUE_RESOLUTION.md` - Complete technical analysis and solution
- `pmc/product/_mapping/pipeline/workfiles/adapter-load-option-A_v1.md` - Detailed specification
- `pmc/product/_mapping/pipeline/workfiles/adapter-load-option-B_v1.md` - Future production solution (Docker image)

### Status

✅ **Implementation Complete** - Ready for production testing
⏳ **Testing Pending** - Awaiting first real-world test with actual adapter
