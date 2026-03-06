# Option D: Official vLLM Worker with Pre-configured LoRA Adapter

**Created**: 2026-01-19  
**Purpose**: Set up a new RunPod serverless endpoint using the official `runpod/worker-v1-vllm` image to avoid the V1 Ray DAG crash issue.

---

## Background

The previous endpoint used a vLLM V1 engine that crashes when requests arrive during Ray compiled DAG initialization. The official RunPod vLLM worker image is properly maintained and should handle this correctly.

---

## Step-by-Step Setup Instructions

### Step 1: Go to RunPod Serverless Console
- Navigate to: https://www.runpod.io/console/serverless
- Click **"New Endpoint"**

### Step 2: Configure Container Image
- **Container Image**: `runpod/worker-v1-vllm:stable-cuda12.1.0`

> [!TIP]
> Check for latest tags at: https://hub.docker.com/r/runpod/worker-v1-vllm/tags

### Step 3: Configure GPU and Workers
| Setting | Value |
|---------|-------|
| GPU Type | 80GB VRAM (A100-80GB or H100) |
| Active Workers | `0` (save costs during testing) |
| Max Workers | `1` |
| Idle Timeout | `60` seconds |

### Step 4: Add Environment Variables

Copy-paste these values into the endpoint configuration:

---

## Required Environment Variables (Copy These)

```
MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.2
HF_TOKEN=<see .secrets/deployment-secrets.md>
MAX_MODEL_LEN=4096
GPU_MEMORY_UTILIZATION=0.95
ENABLE_LORA=true
MAX_LORAS=1
MAX_LORA_RANK=16
LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
TENSOR_PARALLEL_SIZE=1
MAX_NUM_SEQS=256
DISABLE_LOG_STATS=false
RAW_OPENAI_OUTPUT=true
OPENAI_RESPONSE_ROLE=assistant
DEFAULT_MAX_TOKENS=2048
MAX_TOKENS=2048
```

---

## Environment Variables Breakdown

### Core Model Settings
| Variable | Value | Description |
|----------|-------|-------------|
| `MODEL_NAME` | `mistralai/Mistral-7B-Instruct-v0.2` | Base model from HuggingFace |
| `HF_TOKEN` | See `.secrets/deployment-secrets.md` | Your HuggingFace access token |
| `MAX_MODEL_LEN` | `4096` | Maximum context length |
| `GPU_MEMORY_UTILIZATION` | `0.95` | Use 95% of GPU memory |
| `TENSOR_PARALLEL_SIZE` | `1` | Single GPU (no tensor parallelism) |

### LoRA Configuration
| Variable | Value | Description |
|----------|-------|-------------|
| `ENABLE_LORA` | `true` | Enable LoRA adapter support |
| `MAX_LORAS` | `1` | Maximum adapters loaded at once |
| `MAX_LORA_RANK` | `16` | Maximum LoRA rank supported |
| `LORA_MODULES` | (see below) | Pre-configured adapter(s) |

**LORA_MODULES value** (JSON format):
```json
[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

### Output Configuration
| Variable | Value | Description |
|----------|-------|-------------|
| `RAW_OPENAI_OUTPUT` | `true` | Return OpenAI-compatible response format |
| `OPENAI_RESPONSE_ROLE` | `assistant` | Role for assistant responses |
| `DEFAULT_MAX_TOKENS` | `2048` | Default max tokens if not specified |
| `MAX_TOKENS` | `2048` | Maximum tokens to generate |

### Performance
| Variable | Value | Description |
|----------|-------|-------------|
| `MAX_NUM_SEQS` | `256` | Maximum concurrent sequences |
| `DISABLE_LOG_STATS` | `false` | Keep stats logging enabled |

---

## Variables NOT Included (and Why)

The following variables from the old endpoint are **NOT needed**:

| Variable | Reason |
|----------|--------|
| `VLLM_USE_V1=0` | Causes crash - let the official image handle engine selection |
| `VLLM_USE_RAY_COMPILED_DAG=0` | Same - don't override |
| `VLLM_USE_RAY_SPMD_WORKER=0` | Same - don't override |
| `DISTRIBUTED_EXECUTOR_BACKEND` | Let image choose defaults |
| `WORKER_USE_RAY` | Let image choose defaults |
| Most other variables | Have sensible defaults in official image |

---

## Step 5: Name and Deploy
- **Endpoint Name**: `brightrun-inference-official-vllm`
- Click **"Create Endpoint"** or **"Deploy"**

---

## Step 6: Verify Deployment

1. Wait 2-3 minutes for worker to initialize
2. Check worker logs for these success indicators:
   - `Loaded new LoRA adapter: name 'adapter-6fd5ac79'`
   - `--- Starting Serverless Worker ---`
3. Confirm NO errors about `EngineDeadError` or Ray DAG

---

## Step 7: Get Endpoint ID

After deployment, copy the **Endpoint ID** from the RunPod console. It will look like: `abc123xyz789`

This ID is needed to update the application code.

---

## Testing the Endpoint

Once deployed, test with a simple curl request:

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "messages": [
        {"role": "user", "content": "Hello, how are you?"}
      ],
      "model": "adapter-6fd5ac79",
      "max_tokens": 100
    }
  }'
```

---

## Next Steps After Successful Test

1. Update `INFERENCE_ENDPOINT_ID` in the application environment
2. Test via the web UI at `/pipeline/jobs/{jobId}/test`
3. If successful, consider making this the primary inference endpoint

---

## Rollback Plan

If this doesn't work, the old endpoint `brightrun-inference-mistral-7b` is still available but has the V1 Ray DAG crash issue.
