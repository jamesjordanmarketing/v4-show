# LoRA Training Pipeline: RunPod Implementation Instructions

**Date:** December 28, 2025
**Status:** Implementation Specification - Updated with Verified Commands
**Purpose:** Step-by-step instructions for setting up RunPod training infrastructure

**Model:** Qwen/Qwen3-Next-80B-A3B-Instruct (instruction-tuned, strong reasoning, fits A100 with 4-bit QLoRA)

---

## Document Structure

- **Section 1:** Manual RunPod setup steps (for the human engineer)
- **Section 2:** Autonomous coding agent prompt (for implementation)

---

# SECTION 1: Manual RunPod Setup (Human Engineer)

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] RunPod account (https://runpod.io)
- [ ] Docker Hub account (https://hub.docker.com)
- [ ] Docker Desktop installed locally
- [ ] Hugging Face account with approved access to Qwen3 models
- [ ] Your Supabase project URL and service role key

---

## Phase 1: Create Network Volume (Model Cache)

**Purpose:** Store the Qwen3-Next-80B-A3B-Instruct model weights (~80GB) to avoid re-downloading on each training run.

### Step 1.1: Create the Volume

1. Log into RunPod Console: https://runpod.io/console/pods
2. Click **Storage** in the left sidebar
3. Click **+ New Network Volume**
4. Configure:
   - **Name:** `qwen-model-cache`
   - **Size:** `200 GB`
   - **Datacenter:** Select one (remember this - endpoint must match!)
5. Click **Create**
6. Note the **Volume ID** (format: `vol_xxxxxx`)

### Step 1.2: Pre-populate with Model Weights

1. Go to **Pods** → **+ Deploy**
2. Select:
   - **GPU:** Any cheap GPU (even CPU is fine for download)
   - **Template:** RunPod PyTorch
   - **Network Volume:** Select `qwen-model-cache`
3. Deploy and wait for pod to start
4. Click **Connect** → **Web Terminal**
5. Run these commands in the RunPod Web Terminal:

```bash
# Install huggingface_hub (if not already installed)
pip install huggingface_hub

# Download Qwen model to the mounted volume (with progress bars)
cat << 'EOF' > /tmp/download_qwen.py
from huggingface_hub import snapshot_download

print("Starting Qwen model download...")
print("Model: Qwen/Qwen3-Next-80B-A3B-Instruct")
print("Destination: /workspace/models/Qwen3-Next-80B-A3B-Instruct")
print("-" * 60)

try:
    snapshot_download(
        'Qwen/Qwen3-Next-80B-A3B-Instruct',
        local_dir='/workspace/models/Qwen3-Next-80B-A3B-Instruct',
        resume_download=True,
        token='YOUR_HF_TOKEN_HERE'  # Replace with your Hugging Face token
    )
    print("\n" + "=" * 60)
    print("Download complete!")
    print("=" * 60)
except Exception as e:
    print(f"\nError: {e}")
    print("You can re-run this command to resume the download.")
EOF
python3 /tmp/download_qwen.py
```

**Note:** The download will show progress bars automatically for each file. You'll see download speed, percentage complete, and estimated time remaining.

6. Wait for download to complete (~80GB, may take 30-60 minutes depending on connection speed)
7. Verify download: `ls -lh /workspace/models/Qwen3-Next-80B-A3B-Instruct/`
   - You should see multiple `.safetensors` files and config files
   - Total size should be ~80GB
8. **Terminate the pod** (you're done with it - the model is now cached in the network volume)

---

## Phase 2: Build and Push Docker Image

### Step 2.1: Create Project Files Locally

Create a new directory on your local machine:

```bash
# Go to your projects directory (one level up from multi-chat)
cd C:\Users\james\Master\BrightHub\BRun
mkdir brightrun-trainer
cd brightrun-trainer
```

### Step 2.2: Generate the Code

You need to create these 5 files with actual code:

1. `handler.py` - RunPod serverless handler
2. `train_lora.py` - Training script with QLoRA implementation
3. `Dockerfile` - Container definition
4. `requirements.txt` - Python dependencies
5. `status_manager.py` - Job status tracking

**Two ways to get the code:**

**Method A (If using GitHub Copilot/Claude in VS Code):**
- Ask your AI agent: "Generate 5 production-ready Docker worker files in C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\ using the specification between the ==== and ++++ markers in Section 2 of this file. Create: handler.py (RunPod serverless handler), train_lora.py (QLoRA training with 4-bit quantization), Dockerfile (linux/amd64), requirements.txt (pinned versions), and status_manager.py (job status tracking). Use model path /workspace/models/Qwen3-Next-80B-A3B-Instruct."
- The AI will create all files directly in your directory

**Method B (If using ChatGPT/Claude web interface):**
- Copy the entire "AUTONOMOUS AGENT PROMPT" from Section 2 below (lines ~283-520)
- Paste it into a new chat with ChatGPT-4 or Claude
- The AI will generate all 5 files
- Copy each file's code into your local files

### Step 2.2: Build the Docker Image

```bash
# Build for Linux (RunPod requirement)
docker build --platform linux/amd64 -t brighthub/brightrun-trainer:v1 .

# Test locally (optional)
docker run --rm yourdockerhub/brightrun-trainer:v1 python -c "import runpod; print('OK')"
```

### Step 2.3: Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Push the image
docker push yourdockerhub/brightrun-trainer:v1
```

---

## Phase 3: Create Serverless Template

### Step 3.1: Create the Template

1. Go to RunPod Console → **Serverless** → **Templates**
2. Click **+ New Template**
3. Configure:

| Field | Value |
|-------|-------|
| **Template Name** | `BrightRun LoRA Trainer` |
| **Container Image** | `yourdockerhub/brightrun-trainer:v1` |
| **Docker Command** | (leave empty - uses Dockerfile CMD) |
| **Container Disk** | `20 GB` |
| **Volume Disk** | `0 GB` (we use Network Volume) |
| **Volume Mount Path** | `/workspace` |

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `HF_HOME` | `/workspace/.cache/huggingface` |
| `TRANSFORMERS_CACHE` | `/workspace/models` |
| `MODEL_PATH` | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...your-key` |

5. Click **Save Template**

---

## Phase 4: Deploy Serverless Endpoint

### Step 4.1: Create the Endpoint

1. Go to **Serverless** → **Endpoints**
2. Click **+ New Endpoint**
3. Configure:

| Field | Value |
|-------|-------|
| **Endpoint Name** | `brightrun-lora-trainer` |
| **Template** | Select `BrightRun LoRA Trainer` |
| **GPU** | `NVIDIA A100 80GB PCIe` (or H100 if available) |
| **Active Workers** | `0` |
| **Max Workers** | `2` |
| **Idle Timeout** | `60` seconds |
| **Execution Timeout** | `43200` seconds (12 hours) |
| **Network Volume** | Select `qwen-model-cache` |

4. Click **Deploy**
5. Wait for endpoint status to show **Ready**

### Step 4.2: Get Your API Credentials

1. Click on your new endpoint name
2. Copy the **Endpoint URL** (format: `https://api.runpod.ai/v2/abc123xyz`)
3. This is your `GPU_CLUSTER_API_URL`

For the API Key:
1. Go to RunPod Console → **Settings** (top right user menu)
2. Click **API Keys**
3. Click **+ Create API Key**
4. Name it: `BrightRun Training`
5. Copy the key (format: `rp_xxxxxxxxxxxxxxxx`)
6. This is your `GPU_CLUSTER_API_KEY`

---

## Phase 5: Configure Your Application

### Step 5.1: Update .env.local

Add to your `.env.local` file:

```bash
# GPU Cluster Configuration
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/your-endpoint-id
GPU_CLUSTER_API_KEY=rp_your-api-key-here
```

### Step 5.2: Update Supabase Edge Function Secrets

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on `process-training-jobs`
3. Go to **Secrets**
4. Add these secrets:

| Key | Value |
|-----|-------|
| `GPU_CLUSTER_API_URL` | `https://api.runpod.ai/v2/your-endpoint-id` |
| `GPU_CLUSTER_API_KEY` | `rp_your-api-key-here` |

### Step 5.3: Deploy Edge Function

```bash
supabase functions deploy process-training-jobs
```

---

## Phase 6: Verification

### Step 6.1: Test the Endpoint Directly

```bash
curl -X POST "https://api.runpod.ai/v2/your-endpoint-id/run" \
  -H "Authorization: Bearer rp_your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "job_id": "test-123",
      "dataset_url": "https://example.com/test.json",
      "hyperparameters": {
        "base_model": "Qwen/Qwen3-8B",
        "learning_rate": 0.0002,
        "batch_size": 4,
        "num_epochs": 1,
        "lora_rank": 16
      },
      "gpu_config": {
        "gpu_type": "H100",
        "num_gpus": 1
      }
    }
  }'
```

Expected response:
```json
{
  "id": "runpod-job-xxxxx",
  "status": "IN_QUEUE"
}
```

### Step 6.2: Test End-to-End via Your App

1. Create a test dataset in Supabase Storage
2. Create a training job via your API
3. Monitor the job status in your UI

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "404 Repository Not Found" during download | Verify exact model name on HuggingFace. Use `Qwen/Qwen3-Next-80B-A3B-Instruct` (not the base or GGUF versions) |
| Download shows no progress | Wait 10-20 seconds - progress bars appear once files start downloading |
| Endpoint shows "Unhealthy" | Check Docker logs in RunPod console |
| "No GPU available" | Try a different GPU type or datacenter |
| Model loading fails | Verify Network Volume is attached and model exists at `/workspace/models/Qwen3-Next-80B-A3B-Instruct` |
| Timeout errors | Increase execution timeout in endpoint settings |
| OOM (Out of Memory) | Ensure you're using QLoRA 4-bit quantization |

---

# SECTION 2: Autonomous Coding Agent Prompt

Copy and paste the following prompt to an autonomous coding agent (Claude, GPT-4, etc.) to implement the training infrastructure code:

---

## AUTONOMOUS AGENT PROMPT

====================
**START OF DOCKER WORKER SPECIFICATION**
====================

```markdown
# Task: Implement RunPod LoRA Training Worker

## Context

You are implementing the GPU training worker for a LoRA fine-tuning pipeline. The orchestration layer (Vercel + Supabase) is already built. You need to create the RunPod serverless worker that receives training jobs and executes them.

## Existing Infrastructure (DO NOT MODIFY)

The following components exist and expect specific API contracts:

1. **Edge Function** (`supabase/functions/process-training-jobs/index.ts`)
   - Submits jobs to: `POST ${GPU_CLUSTER_API_URL}/training/submit`
   - Polls status from: `GET ${GPU_CLUSTER_API_URL}/training/status/${external_job_id}`

2. **Expected Request Format** (from edge function):
```json
{
  "job_id": "uuid-string",
  "dataset_url": "https://signed-supabase-url/dataset.jsonl",
  "hyperparameters": {
    "base_model": "Qwen/Qwen3-Next-80B-A3B-Instruct",
    "learning_rate": 0.0002,
    "batch_size": 8,
    "num_epochs": 5,
    "lora_rank": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.1
  },
  "gpu_config": {
    "gpu_type": "H100",
    "num_gpus": 1,
    "gpu_memory_gb": 80,
    "cost_per_gpu_hour": 3.35
  },
  "callback_url": "https://project.supabase.co/functions/v1/training-callback"
}
```

3. **Expected Response Format** (job submission):
```json
{
  "external_job_id": "runpod-generated-id"
}
```

4. **Expected Status Response Format**:
```json
{
  "status": "running" | "completed" | "failed",
  "progress": 45.5,
  "current_epoch": 2,
  "current_step": 450,
  "stage": "training" | "saving" | "uploading",
  "metrics": {
    "training_loss": 1.234,
    "validation_loss": 1.456,
    "learning_rate": 0.0002,
    "throughput": 125.4,
    "gpu_utilization": 92.5,
    "gradient_norm": 0.5
  },
  "error_message": null
}
```

## Files to Create

Create the following files in a new directory `runpod-worker/`:

### 1. `runpod-worker/handler.py`

RunPod serverless handler that:
- Receives job input
- Validates parameters
- Calls train_lora.py
- Returns job ID and manages status
- Handles errors gracefully

Must follow RunPod handler pattern:
```python
import runpod

def handler(event):
    job_input = event["input"]
    # ... process ...
    return {"output": result}

runpod.serverless.start({"handler": handler})
```

### 2. `runpod-worker/train_lora.py`

Training script that:
- Loads base model from `/workspace/models/` (with 4-bit quantization)
- Downloads dataset from provided signed URL
- Configures LoRA adapters using PEFT
- Runs training with progress callbacks
- Saves adapter to temporary directory
- Uploads adapter to Supabase Storage
- Returns metrics throughout training

Key requirements:
- Use `BitsAndBytesConfig` for 4-bit quantization (QLoRA)
- Use `LoraConfig` with target modules for MoE: q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj
- Use `SFTTrainer` from `trl` library
- Implement progress callback that updates job status
- Handle CUDA errors gracefully

### 3. `runpod-worker/Dockerfile`

Based on `runpod/pytorch:2.1.0-py3.10-cuda11.8.0`, install:
- transformers
- peft
- accelerate
- bitsandbytes
- trl
- runpod
- supabase

### 4. `runpod-worker/requirements.txt`

Pin versions for reproducibility:
- transformers>=4.36.0
- peft>=0.7.0
- accelerate>=0.25.0
- bitsandbytes>=0.41.0
- trl>=0.7.0
- runpod>=1.6.0
- supabase>=2.0.0

### 5. `runpod-worker/status_manager.py`

Utility class that:
- Stores current job status in memory (per-worker state)
- Provides status retrieval endpoint
- Updates progress, metrics, and stage

## Implementation Requirements

### QLoRA Configuration (CRITICAL for 80B model)

```python
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True
)
```

### LoRA Configuration

```python
from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=config["lora_rank"],           # e.g., 16
    lora_alpha=config["lora_alpha"], # e.g., 32
    lora_dropout=config["lora_dropout"],
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    bias="none",
    task_type="CAUSAL_LM"
)
```

### Dataset Format Expected

JSONL format:
```json
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

### Progress Reporting

Implement a `TrainerCallback` that:
1. Updates status after each step/epoch
2. Records metrics (loss, learning rate, throughput)
3. Calculates GPU utilization via `nvidia-smi` or `pynvml`

### Adapter Upload

After training completes:
1. Save adapter with `model.save_pretrained()`
2. Create tar.gz archive
3. Upload to Supabase Storage `lora-models` bucket
4. Return storage path in final status

## Environment Variables Available

The RunPod worker will have these environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for uploads
- `HF_HOME` - Hugging Face cache location
- `TRANSFORMERS_CACHE` - Model cache location

## Error Handling

1. Catch CUDA OOM errors → Return descriptive message about reducing batch size
2. Catch download failures → Return with retry suggestion
3. Catch training NaN → Return with learning rate suggestion
4. Always update status to "failed" with error_message on any exception

## Testing

Create a test script `runpod-worker/test_locally.py` that:
1. Mocks RunPod event structure
2. Tests handler with sample input
3. Validates output format

## Output

Write all files with complete, production-ready code. Include:
- Comprehensive error handling
- Logging with timestamps
- Type hints
- Docstrings

Do NOT create placeholder code. All functions must be fully implemented.
```

++++++++++++++++++++
**END OF DOCKER WORKER SPECIFICATION**
++++++++++++++++++++

---

## Prompt Completion Checklist

After the agent completes, verify:

- [ ] `handler.py` follows RunPod serverless pattern
- [ ] `train_lora.py` implements QLoRA + PEFT correctly
- [ ] `Dockerfile` builds successfully
- [ ] Status reporting matches expected format
- [ ] Error handling covers OOM, NaN, download failures
- [ ] Adapter upload to Supabase works

---

## Quick Reference: API Contract

### Submit Job

**Request:**
```
POST https://api.runpod.ai/v2/{endpoint-id}/run
Authorization: Bearer {api-key}
Content-Type: application/json

{
  "input": {
    "job_id": "...",
    "dataset_url": "...",
    "hyperparameters": {...},
    "gpu_config": {...}
  }
}
```

**Response:**
```json
{
  "id": "runpod-job-id",
  "status": "IN_QUEUE"
}
```

### Get Status

**Request:**
```
GET https://api.runpod.ai/v2/{endpoint-id}/status/{job-id}
Authorization: Bearer {api-key}
```

**Response:**
```json
{
  "id": "runpod-job-id",
  "status": "COMPLETED",
  "output": {
    "status": "completed",
    "progress": 100,
    "metrics": {...},
    "adapter_path": "lora-models/adapters/job-xxx.tar.gz"
  }
}
```

---

## End of Implementation Specification
