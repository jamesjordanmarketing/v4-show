# New Model Deployment Guide: Adding Support for Additional Base Models

**Document Version:** 1.0  
**Date:** December 28, 2025  
**Purpose:** Guide for deploying new base models (DeepSeek, Llama, frontier models, etc.) to the LoRA training pipeline  
**Prerequisites:** Completed initial setup with Qwen3-Next-80B-A3B-Instruct

---

## Overview

This guide explains how to add support for **new base models** to your LoRA training infrastructure. You do NOT need to repeat the entire setup from scratch - most components are reusable.

### Frequency of Use

- **One-time setup** (already complete): RunPod account, Docker Hub account, Supabase project, application codebase
- **Per-model setup** (this guide): Add each new base model you want to support (e.g., DeepSeek-V3, Llama 4, Claude Haiku, Qwen2.5-VL)

---

## Architecture: One-Time vs Per-Model Components

### ✅ One-Time Setup (Already Complete)

These components are **shared across all models** and only need to be set up once:

| Component | Description | Reusable? |
|-----------|-------------|-----------|
| **Application Codebase** | Next.js app with E01-E03 (datasets, configuration, job creation) | ✅ Yes |
| **Database Schema** | `datasets`, `training_jobs`, `metrics_points`, etc. | ✅ Yes |
| **Supabase Storage** | `lora-datasets`, `lora-models` buckets | ✅ Yes |
| **Docker Worker Code** | `handler.py`, `train_lora.py` (with dynamic model loading) | ✅ Yes (with minor updates) |
| **RunPod Account** | Account, API keys, billing setup | ✅ Yes |
| **Docker Hub Account** | Registry for Docker images | ✅ Yes |

### 🔄 Per-Model Setup (Repeat for Each New Model)

These components are **model-specific** and need to be configured for each new base model:

| Component | Description | Per-Model? |
|-----------|-------------|------------|
| **Network Volume** | Storage for model weights (~50-200GB per model) | 🔄 Yes |
| **Model Download** | Download specific model weights from HuggingFace | 🔄 Yes |
| **Docker Image** | Build new image with model-specific config | 🔄 Maybe (see Strategy) |
| **RunPod Template** | Template with model-specific environment variables | 🔄 Yes |
| **RunPod Endpoint** | Serverless endpoint for this model | 🔄 Yes |
| **Application Config** | Update UI to offer this model as an option | 🔄 Yes |

---

## Deployment Strategies

### Strategy 1: Separate Endpoints per Model (Recommended)

**Use Case**: Supporting multiple distinct models (Qwen, DeepSeek, Llama, etc.)

**Advantages**:
- ✅ Clean separation of concerns
- ✅ Independent scaling per model
- ✅ Easy to deprecate old models
- ✅ Model-specific GPU selection (e.g., DeepSeek needs H100, Llama works on A100)

**Disadvantages**:
- ❌ Higher infrastructure cost (separate endpoints idle when not in use)
- ❌ More RunPod configuration to manage

**Architecture**:
```
Application
  ├─ Qwen Endpoint → qwen-model-cache volume → Qwen3-Next-80B-A3B-Instruct
  ├─ DeepSeek Endpoint → deepseek-model-cache volume → DeepSeek-V3-671B
  └─ Llama Endpoint → llama-model-cache volume → Llama-4-405B
```

### Strategy 2: Single Endpoint with Multiple Models (Advanced)

**Use Case**: Cost optimization when supporting many similar models

**Advantages**:
- ✅ Lower cost (one endpoint, auto-scales for all models)
- ✅ Simpler endpoint management

**Disadvantages**:
- ❌ Larger network volume needed (stores all models)
- ❌ More complex Docker worker logic (model selection)
- ❌ All models must fit on same GPU type

**Architecture**:
```
Application
  └─ Multi-Model Endpoint → shared-model-cache volume
       ├─ /models/qwen3-80b/
       ├─ /models/deepseek-v3/
       └─ /models/llama-4-405b/
```

**Note**: This guide focuses on **Strategy 1** as it's more maintainable and flexible.

---

## Initial Setup: First Model Deployment (Qwen)

This section covers the **complete initial setup** for deploying your first model (Qwen3-Next-80B-A3B-Instruct). After completing this once, you can follow the streamlined process in the next section to add additional models.

### Prerequisites Completed

Before starting these phases, ensure you have:
- ✅ RunPod account created
- ✅ Docker Hub account created  
- ✅ Docker Desktop installed locally
- ✅ Application codebase (Sections E01-E03b) deployed to production
- ✅ Docker worker files generated locally at `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\`

---

### Phase 1: Create Network Volume & Download Model

#### Step 1.1: Create Network Volume

1. Log into RunPod Console: https://runpod.io/console/storage
2. Click **Storage** in sidebar → **+ New Network Volume**
3. Configure:
   - **Name**: `qwen-model-cache`
   - **Size**: `240 GB` (84GB model + overhead + cache)
   - **Datacenter**: US-CA-2 (or your preferred region - remember this!)
4. Click **Create**
5. Note the **Volume ID** for reference

**Cost**: ~$2.40/month for storage

#### Step 1.2: Download Model Weights to Volume

1. Go to **Pods** → **+ Deploy**
2. Select a cheap pod (CPU is fine for downloads):
   - **GPU**: CPU Pod (cheapest)
   - **Template**: RunPod PyTorch
   - **Network Volume**: Attach `qwen-model-cache`
3. Deploy and wait for pod to start
4. Click **Connect** → **Web Terminal**
5. Run this in the terminal:

```bash
pip install huggingface_hub

cat << 'EOF' > /tmp/download_qwen.py
from huggingface_hub import snapshot_download

MODEL_ID = "Qwen/Qwen3-Next-80B-A3B-Instruct"
LOCAL_DIR = "/workspace/models/Qwen3-Next-80B-A3B-Instruct"

print(f"Starting {MODEL_ID} download...")
print(f"Destination: {LOCAL_DIR}")
print("-" * 60)

try:
    snapshot_download(
        MODEL_ID,
        local_dir=LOCAL_DIR,
        resume_download=True,
        token='YOUR_HF_TOKEN_HERE'  # Replace with your token
    )
    print("\n" + "=" * 60)
    print("Download complete!")
    print("=" * 60)
except Exception as e:
    print(f"\nError: {e}")
    print("You can re-run this command to resume.")
EOF

python3 /tmp/download_qwen.py
```

6. Wait for download (84GB, takes 30-90 minutes)
7. Verify: `ls -lh /workspace/models/Qwen3-Next-80B-A3B-Instruct/`
8. **Terminate the pod** (download complete, model cached in volume)

---

### Phase 2: Build and Push Docker Image

**Note**: This is done on your LOCAL Windows machine, not in RunPod.

#### Step 2.1: Verify Files Locally

Ensure these files exist in `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\`:
- `handler.py` (200 lines)
- `train_lora.py` (600 lines)  
- `status_manager.py` (200 lines)
- `Dockerfile` (40 lines)
- `requirements.txt` (25 lines)

#### Step 2.2: Build Docker Image

Open **PowerShell** or **Git Bash** on your local machine:

```bash
# Navigate to project directory
cd C:\Users\james\Master\BrightHub\BRun\brightrun-trainer

# Build for Linux (required for RunPod)
docker build --platform linux/amd64 -t brighthub/brightrun-trainer:v1 .
```

**Expected time**: 3-5 minutes  
**Expected output**: `Successfully built` and `Successfully tagged brighthub/brightrun-trainer:v1`

**Troubleshooting**:
- If "docker command not found": Ensure Docker Desktop is running
- If "500 Internal Server Error": Restart Docker Desktop
- If missing the `.` at the end: The dot is the build context (current directory)

#### Step 2.3: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

#### Step 2.4: Push Image to Docker Hub

```bash
docker push brighthub/brightrun-trainer:v1
```

**Expected time**: 10-20 minutes (uploading ~5-10GB image)  
**Success indicator**: Final line shows `v1: digest: sha256:...`

**Verify upload**: Visit `https://hub.docker.com/r/brighthub/brightrun-trainer` and confirm `v1` tag exists

---

### Phase 3: Create RunPod Serverless Template

Now configure RunPod to use your Docker image.

1. Go to RunPod Console → **Serverless** → **Templates**
2. Click **+ New Template**
3. Fill in the form:

| Field | Value |
|-------|-------|
| **Template Name** | `BrightRun LoRA Trainer - Qwen` |
| **Container Image** | `brighthub/brightrun-trainer:v1` |
| **Docker Command** | (leave empty - uses Dockerfile CMD) |
| **Container Disk** | `20 GB` |
| **Volume Mount Path** | `/workspace` ← **Critical: must match model path** |

4. Click **Environment Variables** section and add:

| Key | Value |
|-----|-------|
| `HF_HOME` | `/workspace/.cache/huggingface` |
| `TRANSFORMERS_CACHE` | `/workspace/models` |
| `MODEL_PATH` | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` |
| `SUPABASE_URL` | `https://hqhtbxlgzysfbekexwku.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` (your actual service role key) |

5. Click **Save Template**

**Critical Notes**:
- Volume mount path `/workspace` matches where the model is stored in the network volume
- `MODEL_PATH` points to the exact location where you downloaded the model in Phase 1
- `SUPABASE_SERVICE_ROLE_KEY` is needed for uploading trained adapters to Supabase Storage

---

### Phase 4: Deploy Serverless Endpoint

Create the actual GPU endpoint that will process training jobs.

1. Go to **Serverless** → **Endpoints**
2. Click **+ New Endpoint**
3. Configure:

| Field | Value |
|-------|-------|
| **Endpoint Name** | `,` |
| **Select Template** | `BrightRun LoRA Trainer - Qwen` (the one you just created) |
| **GPU Type** | `NVIDIA A100 80GB PCIe` |
| **Active Workers** | `0` (auto-scale from zero) |
| **Max Workers** | `2` (allows 2 concurrent training jobs) |
| **GPUs Per Worker** | `1` |
| **Idle Timeout** | `60` seconds (worker shuts down after 60s idle) |
| **Execution Timeout** | `43200` seconds (12 hours max per job) |
| **Select Network Volume** | `qwen-model-cache` ← **Must attach the volume!** |

4. Click **Deploy**
5. Wait for endpoint status to show **Ready** (may take 1-2 minutes)

**Cost Breakdown**:
- **Idle**: $0/hour (Active Workers = 0, no GPUs running)
- **Active**: ~$3.50/hour per A100 80GB GPU
- **Storage**: $0.24/month for network volume (240GB × $0.001/GB/month)

**FAQ**:
- **Q: Do I pay when idle?** No, with Active Workers = 0, you only pay when training jobs are running.
- **Q: Does the endpoint URL change?** No, the endpoint URL is permanent and configured once in your application.

#### Step 4.1: Get Endpoint Credentials

Once deployed:

1. Click on your endpoint name in the list
2. **Copy the Endpoint URL**: Format is `https://api.runpod.ai/v2/{endpoint-id}`
   - Save this as `GPU_CLUSTER_API_URL` for later
3. Go to RunPod **Settings** (top right user menu) → **API Keys**
4. Click **+ Create API Key**
   - **Name**: `BrightRun Training`
   - **Scope**: Leave default (full access)
5. **Copy the API key**: Format is `rp_xxxxxxxxxx`
   - Save this as `GPU_CLUSTER_API_KEY` for later

**Security Note**: The API key has full access to your RunPod account. Store it securely (use environment variables, never commit to git).

---

### Phase 5: Configure Application

Update your Next.js application to use the RunPod endpoint.

#### Step 5.1: Update Local Environment

Edit `C:\Users\james\Master\BrightHub\BRun\lora-pipeline\.env.local`:

```bash
# Add these lines (replace with your actual values)
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/your-endpoint-id-here
GPU_CLUSTER_API_KEY=rp_your-api-key-here
```

**Example**:
```bash
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/abc123xyz
GPU_CLUSTER_API_KEY=rp_12345678901234567890
```

#### Step 5.2: Update Supabase Edge Function Secrets

Your Edge Function needs these credentials to submit training jobs.

**Via Supabase Dashboard**:
1. Go to Supabase Dashboard → **Edge Functions**
2. Find `process-training-jobs` function
3. Go to **Secrets** tab
4. Add two secrets:
   - Key: `GPU_CLUSTER_API_URL`, Value: `https://api.runpod.ai/v2/your-endpoint-id`
   - Key: `GPU_CLUSTER_API_KEY`, Value: `rp_your-api-key-here`

**Via Supabase CLI**:
```bash
cd C:\Users\james\Master\BrightHub\BRun\lora-pipeline

supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/your-endpoint-id
supabase secrets set GPU_CLUSTER_API_KEY=rp_your-api-key-here
```

#### Step 5.3: Deploy Edge Function (If Not Already Deployed)

```bash
supabase functions deploy process-training-jobs
```

---

### Phase 6: End-to-End Testing

Test the complete pipeline from UI to GPU training.

#### Step 6.1: Test Endpoint Directly (Optional)

Verify the RunPod endpoint responds:

```bash
curl -X POST "https://api.runpod.ai/v2/your-endpoint-id/run" \
  -H "Authorization: Bearer rp_your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "job_id": "test-123",
      "dataset_url": "https://example.com/test.jsonl",
      "hyperparameters": {
        "base_model": "Qwen/Qwen3-Next-80B-A3B-Instruct",
        "learning_rate": 0.0002,
        "batch_size": 4,
        "num_epochs": 1,
        "lora_rank": 16
      },
      "gpu_config": {
        "gpu_type": "A100-80GB",
        "num_gpus": 1
      }
    }
  }'
```

**Expected response**:
```json
{
  "id": "sync-xxxxx-xxxx",
  "status": "IN_QUEUE"
}
```

#### Step 6.2: Test via Application UI

1. **Create a test dataset**:
   - Go to `/datasets` in your application
   - Upload a small JSONL file (5-10 training pairs)
   - Wait for validation to complete

2. **Create a training job**:
   - Go to `/training/configure`
   - Select your test dataset
   - Choose **Fast** preset
   - Set epochs to 1 (for quick test)
   - Click **Create Training Job**

3. **Monitor the job**:
   - Go to `/training/jobs`
   - Watch status progress: `queued` → `initializing` → `running` → `completed`
   - Check that progress updates in real-time

4. **Verify output**:
   - Check Supabase Storage `lora-models` bucket
   - Confirm adapter files were uploaded
   - Download and inspect the adapter

**Expected total time for test**: 10-20 minutes (small dataset, 1 epoch)

---

### Phase 7: Production Readiness Checklist

Before using in production, verify:

- [ ] RunPod endpoint shows status "Ready"
- [ ] Network volume attached to endpoint correctly
- [ ] Model loads successfully (check first job logs)
- [ ] Training completes without errors
- [ ] Adapter uploads to Supabase Storage
- [ ] Cost tracking matches expectations
- [ ] Job cancellation works
- [ ] Edge Function processes queued jobs automatically
- [ ] Real-time progress updates work in UI
- [ ] Notifications sent to users correctly

**Common Issues**:
- **"Model not found"**: Verify `MODEL_PATH` matches download location (`/workspace/models/...`)
- **"Out of memory"**: Ensure using A100 80GB, verify QLoRA 4-bit quantization in code
- **Slow training**: Check GPU utilization (should be >80%), verify batch size isn't too small
- **Adapter upload fails**: Check `SUPABASE_SERVICE_ROLE_KEY` in template environment variables

---

## Step-by-Step: Adding a New Model

### Example: Adding DeepSeek-V3-671B Support

Let's walk through adding DeepSeek-V3 as a second supported model.

---

### Phase 1: Model Research & Planning

Before starting, research the model:

**Questions to Answer**:
1. **Model ID**: What's the HuggingFace model ID? (e.g., `deepseek-ai/DeepSeek-V3`)
2. **Model Size**: How large are the weights? (e.g., 671B params = ~1.3TB FP16, ~335GB 4-bit)
3. **Architecture**: What's the model architecture? (affects target_modules for LoRA)
4. **Context Length**: What's the max sequence length? (affects memory requirements)
5. **Quantization**: Does it support 4-bit quantization? (QLoRA requirement)
6. **License**: Is it permissible for your use case? (commercial vs research)
7. **GPU Requirement**: What GPU does it need? (671B needs H100 80GB even with 4-bit)

**DeepSeek-V3 Example**:
- **Model ID**: `deepseek-ai/DeepSeek-V3`
- **Size**: ~335GB (4-bit quantized)
- **Architecture**: MoE (Mixture of Experts) Transformer
- **Context**: 128K tokens
- **Quantization**: Supports 4-bit (bitsandbytes compatible)
- **License**: MIT (permissive for commercial use)
- **GPU**: H100 80GB minimum (MoE architecture is memory-intensive)

**Decision**: Proceed with deployment on H100 GPUs with 4-bit QLoRA.

---

### Phase 2: Create Network Volume & Download Model

#### Step 2.1: Create New Network Volume

1. Log into RunPod Console: https://runpod.io/console/storage
2. Click **+ New Network Volume**
3. Configure:
   - **Name**: `deepseek-v3-cache` (use descriptive name)
   - **Size**: `400 GB` (335GB model + 20% overhead)
   - **Datacenter**: Same as your other volumes for consistency (e.g., US-CA-2)
4. Click **Create**
5. Note the **Volume ID**

**Naming Convention**: `{model-name}-cache` (lowercase, hyphenated)

#### Step 2.2: Download Model Weights

1. Go to **Pods** → **+ Deploy**
2. Select:
   - **GPU**: CPU pod (cheapest option for downloads)
   - **Template**: RunPod PyTorch
   - **Network Volume**: Select `deepseek-v3-cache`
3. Deploy pod
4. Click **Connect** → **Web Terminal**
5. Run download script:

```bash
pip install huggingface_hub

cat << 'EOF' > /tmp/download_model.py
from huggingface_hub import snapshot_download

MODEL_ID = "deepseek-ai/DeepSeek-V3"
LOCAL_DIR = "/workspace/models/DeepSeek-V3"

print(f"Starting {MODEL_ID} download...")
print(f"Destination: {LOCAL_DIR}")
print("-" * 60)

try:
    snapshot_download(
        MODEL_ID,
        local_dir=LOCAL_DIR,
        resume_download=True,
        token='YOUR_HF_TOKEN_HERE'  # Replace with your token
    )
    print("\n" + "=" * 60)
    print("Download complete!")
    print("=" * 60)
except Exception as e:
    print(f"\nError: {e}")
    print("You can re-run this command to resume.")
EOF

python3 /tmp/download_model.py
```

6. Wait for download (335GB may take 1-3 hours)
7. Verify: `ls -lh /workspace/models/DeepSeek-V3/`
8. **Terminate pod** (download complete)

**Critical**: Always use `/workspace/models/{MODEL_NAME}/` path format for consistency.

---

### Phase 3: Update Docker Worker (If Needed)

**When to Update Docker Worker**:

- ✅ **Skip update if**: Model uses same architecture as existing (e.g., both are decoder-only transformers with similar target modules)
- 🔄 **Update required if**: Model has different architecture (different target_modules for LoRA)

#### Step 3.1: Check Target Modules

Different architectures require different LoRA target modules:

**Standard Transformer (Qwen, Llama, Mistral)**:
```python
target_modules = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj"
]
```

**DeepSeek-V3 (MoE - Mixture of Experts)**:
```python
target_modules = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
    # MoE-specific (if present):
    "gate",  # Expert routing gate
]
```

**Other Architectures** (consult model docs):
- **Vision-Language Models**: May include vision encoder projections
- **Encoder-Decoder Models** (T5, BART): Include encoder attention layers

#### Step 3.2: Update train_lora.py (If Needed)

If target modules differ, update `train_lora.py`:

```python
# Make target_modules dynamic based on model architecture
def get_target_modules(model_name: str) -> list[str]:
    """Get LoRA target modules based on model architecture."""
    
    if "deepseek" in model_name.lower():
        return [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
            "gate"  # MoE routing
        ]
    elif "qwen" in model_name.lower() or "llama" in model_name.lower():
        return [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ]
    else:
        # Default to standard transformer modules
        return [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ]

# In LoraConfig:
lora_config = LoraConfig(
    r=config["lora_rank"],
    lora_alpha=config["lora_alpha"],
    lora_dropout=config["lora_dropout"],
    target_modules=get_target_modules(config["base_model"]),
    bias="none",
    task_type="CAUSAL_LM"
)
```

#### Step 3.3: Rebuild Docker Image (If Updated)

If you modified `train_lora.py`:

```bash
cd C:\Users\james\Master\BrightHub\BRun\brightrun-trainer

# Increment version number
docker build --platform linux/amd64 -t yourdockerhub/brightrun-trainer:v2 .
docker push yourdockerhub/brightrun-trainer:v2
```

**Note**: If no changes to Docker worker, skip this step and reuse existing image.

---

### Phase 4: Create RunPod Template for New Model

1. Go to RunPod Console → **Serverless** → **Templates**
2. Click **+ New Template**
3. Configure:

| Field | Value |
|-------|-------|
| **Template Name** | `BrightRun LoRA Trainer - DeepSeek-V3` |
| **Container Image** | `yourdockerhub/brightrun-trainer:v1` (or v2 if updated) |
| **Container Disk** | `20 GB` |
| **Volume Mount Path** | `/runpod-volume` |

4. Add **Environment Variables**:

| Key | Value (DeepSeek-V3 Specific) |
|-----|------------------------------|
| `HF_HOME` | `/runpod-volume/.cache/huggingface` |
| `TRANSFORMERS_CACHE` | `/runpod-volume/models` |
| `MODEL_PATH` | `/runpod-volume/models/DeepSeek-V3` ← **Change this** |
| `SUPABASE_URL` | `https://hqhtbxlgzysfbekexwku.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (your service role key) |

5. Click **Save Template**

**Key Change**: Only `MODEL_PATH` changes per model. All other environment variables stay the same.

---

### Phase 5: Deploy RunPod Endpoint for New Model

1. Go to **Serverless** → **Endpoints**
2. Click **+ New Endpoint**
3. Configure:

| Field | Value (DeepSeek-V3) |
|-------|---------------------|
| **Endpoint Name** | `brightrun-lora-trainer-deepseek-v3` |
| **Template** | Select `BrightRun LoRA Trainer - DeepSeek-V3` |
| **GPU** | `NVIDIA H100 80GB` ← **DeepSeek requires H100** |
| **Active Workers** | `0` (auto-scale) |
| **Max Workers** | `1` (expensive model, limit concurrency) |
| **Idle Timeout** | `60` seconds |
| **Execution Timeout** | `43200` seconds (12 hours) |
| **Network Volume** | Select `deepseek-v3-cache` ← **Important** |

4. Click **Deploy**
5. Wait for status: **Ready**

#### Step 5.1: Get Endpoint Credentials

1. Click endpoint name
2. Copy **Endpoint URL**: `https://api.runpod.ai/v2/{deepseek-endpoint-id}`
3. Note this as `GPU_CLUSTER_API_URL_DEEPSEEK`

**API Key**: Use the same RunPod API key as Qwen (keys are account-level, not endpoint-specific)

---

### Phase 6: Update Application Configuration

Now make the new model available in your application.

#### Step 6.1: Update .env.local

Add new endpoint configuration:

```bash
# GPU Cluster Configuration - Qwen (existing)
GPU_CLUSTER_API_URL_QWEN=https://api.runpod.ai/v2/qwen-endpoint-id
GPU_CLUSTER_API_KEY=rp_your-api-key-here

# GPU Cluster Configuration - DeepSeek V3 (new)
GPU_CLUSTER_API_URL_DEEPSEEK=https://api.runpod.ai/v2/deepseek-endpoint-id
# Same API key for all endpoints
```

#### Step 6.2: Update Backend Logic

**File**: `src/app/api/jobs/route.ts` (or similar)

Add model selection logic:

```typescript
// Map model to endpoint
function getEndpointForModel(modelName: string): string {
  if (modelName.includes('qwen')) {
    return process.env.GPU_CLUSTER_API_URL_QWEN!;
  } else if (modelName.includes('deepseek')) {
    return process.env.GPU_CLUSTER_API_URL_DEEPSEEK!;
  } else {
    throw new Error(`Unsupported model: ${modelName}`);
  }
}

// In job creation endpoint:
const endpointUrl = getEndpointForModel(hyperparameters.base_model);
```

#### Step 6.3: Update Frontend UI

**File**: `src/app/(dashboard)/training/configure/page.tsx`

Add model selection to configuration form:

```typescript
// Add model selector before GPU configuration
<div className="space-y-2">
  <Label>Base Model</Label>
  <Select value={selectedModel} onValueChange={setSelectedModel}>
    <SelectTrigger>
      <SelectValue placeholder="Select base model" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Qwen/Qwen3-Next-80B-A3B-Instruct">
        Qwen3-Next-80B (80B params, A100 compatible)
      </SelectItem>
      <SelectItem value="deepseek-ai/DeepSeek-V3">
        DeepSeek-V3 (671B params, H100 required)
      </SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### Step 6.4: Update Cost Estimation

**File**: `src/app/api/jobs/estimate/route.ts`

Update GPU pricing to reflect H100 requirement for DeepSeek:

```typescript
// GPU pricing map
const GPU_PRICING = {
  'A100-80GB': { hourly: 3.50, throughput: 1800 },
  'A100-40GB': { hourly: 2.80, throughput: 1500 },
  'H100-80GB': { hourly: 4.20, throughput: 2200 },  // For DeepSeek
  'V100-32GB': { hourly: 2.10, throughput: 1200 },
};

// Restrict GPU selection based on model
function getCompatibleGPUs(modelName: string): string[] {
  if (modelName.includes('deepseek-v3')) {
    return ['H100-80GB'];  // DeepSeek V3 requires H100
  } else if (modelName.includes('qwen')) {
    return ['A100-80GB', 'A100-40GB', 'H100-80GB'];  // Qwen works on A100 or H100
  }
  return ['A100-80GB', 'H100-80GB'];  // Default
}
```

#### Step 6.5: Update Database Schema (Optional)

If you want to track which model was used:

```sql
-- Add model_name column to training_jobs table
ALTER TABLE training_jobs 
ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'Qwen/Qwen3-Next-80B-A3B-Instruct';

-- Add index for filtering by model
CREATE INDEX IF NOT EXISTS idx_training_jobs_model_name 
ON training_jobs(model_name);
```

---

### Phase 7: Testing & Verification

#### Step 7.1: Test Endpoint Directly

```bash
curl -X POST "https://api.runpod.ai/v2/deepseek-endpoint-id/run" \
  -H "Authorization: Bearer rp_your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "job_id": "test-deepseek-001",
      "dataset_url": "https://signed-url/test.jsonl",
      "hyperparameters": {
        "base_model": "deepseek-ai/DeepSeek-V3",
        "learning_rate": 0.0001,
        "batch_size": 2,
        "num_epochs": 1,
        "lora_rank": 16
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

#### Step 7.2: Test End-to-End in Application

1. Create test dataset (small, ~10 training pairs)
2. Go to `/training/configure`
3. Select **DeepSeek-V3** as base model
4. Configure with minimal settings (batch_size=2, epochs=1)
5. Create training job
6. Monitor job execution
7. Verify adapter uploaded to Supabase Storage

#### Step 7.3: Monitor Costs

- Watch RunPod billing dashboard
- Verify H100 hourly rate matches expectations (~$4.20/hr)
- Check job duration vs estimated duration

---

## Model-Specific Considerations

### GPU Memory Requirements

| Model Size | Quantization | Minimum GPU | Recommended GPU |
|------------|--------------|-------------|-----------------|
| 7-13B | 4-bit | A100 40GB | A100 80GB |
| 30-80B | 4-bit | A100 80GB | A100 80GB or H100 |
| 180-400B | 4-bit | H100 80GB | H100 80GB (2x for faster training) |
| 400B+ (MoE) | 4-bit | H100 80GB | H100 80GB (may need multi-GPU) |

### Network Volume Sizing

**Formula**: `volume_size = model_size_4bit × 1.2 + 50GB`

- **50GB**: Base overhead (HuggingFace cache, temp files)
- **1.2x**: 20% buffer for checkpoints during download

**Examples**:
- **Qwen3-80B**: 84GB × 1.2 + 50 = ~150GB → Use 200GB volume
- **DeepSeek-V3-671B**: 335GB × 1.2 + 50 = ~450GB → Use 500GB volume
- **Llama-4-405B**: 200GB × 1.2 + 50 = ~290GB → Use 350GB volume

### Model Architecture Target Modules

**Standard Decoder-Only (GPT-style)**:
```python
target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
```

**MoE (Mixture of Experts) - DeepSeek, Mixtral**:
```python
target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj", "gate"]
```

**Vision-Language (Qwen-VL, LLaVA)**:
```python
target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj", "vision_proj"]
```

**Encoder-Decoder (T5, BART)**:
```python
target_modules = [
    # Encoder
    "encoder.q", "encoder.k", "encoder.v", "encoder.o",
    # Decoder
    "decoder.q", "decoder.k", "decoder.v", "decoder.o",
    "decoder.cross_attn_q", "decoder.cross_attn_k", "decoder.cross_attn_v"
]
```

**Finding Target Modules**:
1. Check model's HuggingFace page → Model card → Architecture section
2. Load model locally and print: `print(model.named_modules())`
3. Check PEFT examples: https://github.com/huggingface/peft/tree/main/examples

---

## Checklist: Adding a New Model

Use this checklist each time you add a new model:

### Pre-Deployment
- [ ] Research model: size, architecture, license, GPU requirements
- [ ] Verify HuggingFace access (if gated model)
- [ ] Calculate network volume size needed
- [ ] Identify target modules for LoRA
- [ ] Verify quantization compatibility (4-bit)

### RunPod Setup
- [ ] Create network volume with appropriate size
- [ ] Download model weights to volume (`/workspace/models/{MODEL_NAME}/`)
- [ ] Verify download completion
- [ ] Terminate download pod

### Docker Worker (If Needed)
- [ ] Update `train_lora.py` with new target modules (if different architecture)
- [ ] Test updated code locally (if possible)
- [ ] Rebuild Docker image with new version tag
- [ ] Push to Docker Hub

### RunPod Endpoint
- [ ] Create new template with model-specific `MODEL_PATH`
- [ ] Deploy new endpoint with correct GPU type
- [ ] Attach correct network volume
- [ ] Verify endpoint status shows "Ready"
- [ ] Copy endpoint URL

### Application Integration
- [ ] Add endpoint URL to `.env.local`
- [ ] Update backend model routing logic
- [ ] Add model to frontend UI selector
- [ ] Update cost estimation for model-specific GPU requirements
- [ ] Update database schema (if tracking model names)
- [ ] Deploy updated application

### Testing
- [ ] Test endpoint directly with curl
- [ ] Create test dataset
- [ ] Run end-to-end training job
- [ ] Verify adapter upload
- [ ] Monitor costs and duration
- [ ] Document any model-specific quirks

---

## Cost Optimization Strategies

### Strategy 1: Shared Network Volumes

If models are similar sizes and architectures:

```
single-model-cache (500GB)
  ├─ /models/qwen3-80b/       (84GB)
  ├─ /models/llama-4-70b/     (70GB)
  └─ /models/mistral-8x7b/    (47GB)
```

**Savings**: One 500GB volume ($5/month) vs three 200GB volumes ($15/month)

**Trade-off**: All endpoints must use same datacenter and volume

### Strategy 2: On-Demand Volume Mounting

For rarely-used models:
- Keep model weights in RunPod storage (archived)
- Only mount volume when job is active
- Unmount after job completes

**Use Case**: Supporting 10+ models but only 2-3 actively trained

### Strategy 3: Auto-Scaling Configuration

```yaml
# For expensive models (H100)
Active Workers: 0
Max Workers: 1
Idle Timeout: 30 seconds  # Faster spin-down

# For cheap models (A100)
Active Workers: 0
Max Workers: 3
Idle Timeout: 60 seconds
```

**Savings**: Minimize idle time on expensive GPUs

---

## Troubleshooting New Model Deployments

### Issue: Model Fails to Load

**Symptoms**: Error during model initialization, OOM even with quantization

**Possible Causes**:
1. Model too large for GPU (even with 4-bit)
2. Incorrect quantization config
3. Model architecture not supported by bitsandbytes

**Solutions**:
- Use larger GPU (H100 instead of A100)
- Check model's recommended quantization settings
- Enable gradient checkpointing: `model.gradient_checkpointing_enable()`

### Issue: Training Runs But No Improvement

**Symptoms**: Loss stays flat or increases, no learning

**Possible Causes**:
1. Incorrect target modules (LoRA not applied to right layers)
2. Learning rate too high/low for model size
3. Dataset format incompatible with model's tokenizer

**Solutions**:
- Verify target modules with `print(model.named_modules())`
- Reduce learning rate for larger models (1e-5 for 400B+ models)
- Check tokenizer output: `tokenizer.decode(tokenized_input["input_ids"])`

### Issue: Endpoint Shows "Unhealthy"

**Symptoms**: RunPod endpoint status = "Unhealthy", jobs fail immediately

**Possible Causes**:
1. MODEL_PATH incorrect (model not found in volume)
2. Volume not attached to endpoint
3. Docker image has dependency issues

**Solutions**:
- Check Docker logs in RunPod console
- Verify volume attachment: SSH into active worker and `ls /runpod-volume/models/`
- Test Docker image locally: `docker run -it yourdockerhub/brightrun-trainer:v1 /bin/bash`

---

## Future: Frontier Models

### Preparing for Next-Gen Models (2025-2026)

**Claude 4, GPT-5, Gemini 2 Ultra, Qwen 3.5**:

These models will likely:
- Be **larger** (1T+ parameters)
- Require **multiple H100s** or next-gen GPUs (B100, H200)
- Have **multimodal** capabilities (text, image, audio)
- Use **new architectures** (may need custom LoRA implementations)

**Preparation Steps**:
1. **Monitor releases**: Subscribe to model provider updates
2. **Test early**: Use preview/beta access to test compatibility
3. **Budget for compute**: Frontier models may cost $10-20/hr
4. **Update Docker worker**: New architectures may need PEFT updates
5. **Consider alternatives**: Distilled models (e.g., Claude 4 Haiku) may suffice

### Multi-GPU Training

For models >1TB parameters:

**Docker Worker Update** (`train_lora.py`):
```python
# Enable multi-GPU training
if torch.cuda.device_count() > 1:
    model = torch.nn.DataParallel(model)
    
# Or use DeepSpeed for better efficiency
from transformers import TrainingArguments
training_args = TrainingArguments(
    ...,
    deepspeed="./ds_config.json",  # DeepSpeed config
    per_device_train_batch_size=1,
    gradient_accumulation_steps=16
)
```

**RunPod Endpoint**:
- Select multi-GPU option (2x H100, 4x H100, 8x H100)
- Adjust batch size and gradient accumulation accordingly
- Update cost estimation (multi-GPU is linear: 2x H100 = 2x cost)

---

## SSH Key Setup for Running Pods

**Use Case**: When you need to upload files to an **already-running RunPod pod** using SCP (e.g., uploading Docker worker files after generating them locally)

**Background**: If your pod is already running when you add your SSH key to RunPod account settings, the key won't be automatically injected into the pod. You need to manually inject it via the web terminal.

### Step-by-Step: Enable SSH Access on Running Pod

#### Step 1: Get Your Local SSH Public Key

On your **local machine** (Windows with Git Bash/WSL, macOS, or Linux), run:

```bash
cat ~/.ssh/id_ed25519.pub
```

**Example output**:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK7tX6a3E+OMqahKJICS4n5 james@jamesjordanmarketing.com
```

**Copy the entire output** - this is your public key (starts with `ssh-ed25519`, followed by key data, followed by email/comment).

**Note**: If you don't have an ed25519 key, generate one first:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter for default location (~/.ssh/id_ed25519)
# Press Enter for no passphrase (or set a passphrase if preferred)
```

#### Step 2: Open RunPod Web Terminal

1. Go to RunPod Console → **Pods**
2. Find your running pod
3. Click **Connect** → **Web Terminal**
4. Wait for terminal to connect

#### Step 3: Inject SSH Public Key into Pod

In the **RunPod web terminal**, run these commands:

```bash
# Replace the entire string in quotes with YOUR public key from Step 1
export PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK7tX6a3E+OMqahKJICS4n5 james@jamesjordanmarketing.com"

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Write public key to authorized_keys (overwrites existing keys)
echo "$PUBLIC_KEY" > ~/.ssh/authorized_keys

# Set correct permissions (required for SSH to work)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Important**: 
- Use `>` (overwrites) not `>>` (appends) if you're fixing a mismatched key
- The `chmod` commands are **critical** - SSH will reject keys with incorrect permissions

#### Step 4: Get Pod SSH Connection Details

In the RunPod dashboard, click on your pod and find the **SSH over exposed TCP** section.

**Example**:
```
ssh root@203.57.40.107 -p 10032 -i ~/.ssh/id_ed25519
```

From this, extract:
- **IP Address**: `203.57.40.107`
- **Port**: `10032`

#### Step 5: Upload Files via SCP

On your **local machine**, run the SCP command to upload files:

```bash
scp -P 10032 -i ~/.ssh/id_ed25519 \
  "C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\handler.py" \
  "C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\train_lora.py" \
  "C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\status_manager.py" \
  "C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\Dockerfile" \
  "C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\requirements.txt" \
  root@203.57.40.107:/workspace/v4-show/
```

**Replace**:
- `10032` → Your pod's SSH port
- `203.57.40.107` → Your pod's IP address
- File paths → Your local file locations
- `/workspace/v4-show/` → Target directory on pod

**Windows Path Note**: If using PowerShell and backslash continuation doesn't work, put the entire command on one line.

#### Step 6: Verify Upload

Test SSH connection and verify files:

```bash
ssh root@203.57.40.107 -p 10032 -i ~/.ssh/id_ed25519 "ls -la /workspace/v4-show/"
```

Expected output:
```
total 1065
drwxr-xr-x  2 root root    4096 Dec 28 17:20 .
drwxr-xr-x 10 root root    4096 Dec 28 16:45 ..
-rw-r--r--  1 root root    1234 Dec 28 17:20 Dockerfile
-rw-r--r--  1 root root   15678 Dec 28 17:20 handler.py
-rw-r--r--  1 root root     567 Dec 28 17:20 requirements.txt
-rw-r--r--  1 root root   12345 Dec 28 17:20 status_manager.py
-rw-r--r--  1 root root   45678 Dec 28 17:20 train_lora.py
```

✅ **Success** - All 5 files uploaded and ready for Docker build!

### Troubleshooting

#### Problem: SCP Still Asks for Password

**Cause**: SSH keys don't match (private key on local machine doesn't match public key on pod)

**Solution**: 
1. Verify you copied the **entire** public key output (including `ssh-ed25519` prefix and email suffix)
2. Re-run Step 3 with the correct public key
3. Use `>` not `>>` to **overwrite** the old key
4. Verify key was written: `cat ~/.ssh/authorized_keys` in RunPod terminal

#### Problem: Permission Denied (publickey)

**Cause**: Incorrect file permissions on `~/.ssh/authorized_keys`

**Solution**: Re-run the `chmod` commands:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### Problem: "No such file or directory" on Upload

**Cause**: Target directory doesn't exist on pod

**Solution**: Create directory first via web terminal:
```bash
mkdir -p /workspace/brightrun-trainer
```

#### Problem: Connection Refused

**Cause**: Pod's SSH port may have changed or pod restarted

**Solution**: 
1. Check RunPod dashboard for updated port/IP
2. If pod restarted, you may need to re-inject SSH key (Steps 2-3)

### Alternative: Fresh Pod Creation (Easier Method)

If you're repeatedly having SSH issues with a running pod, it's often **faster** to:

1. **Terminate the current pod** (model cache in network volume is safe)
2. **Create a new pod** with the network volume attached
3. SSH keys added to your RunPod account **before pod creation** will be automatically injected
4. No manual key injection needed

**When to Use**:
- Multiple failed SSH attempts
- Pod has been running for days and accumulated configuration drift
- You just added SSH key to RunPod account settings

**When NOT to Use**:
- Pod has hours of download progress (would lose progress)
- Pod is actively training a job (would interrupt job)

---

## Summary: Repeatable vs One-Time

### You'll Follow the Full E04.5 Guide:
**Once** - Initial setup with Qwen3-Next-80B-A3B-Instruct (already complete)

### You'll Follow This New Model Guide:
**For each new base model** you want to support:
- DeepSeek-V3
- Llama 4
- Claude 4 (if/when available for self-hosting)
- Qwen 3.5
- Mistral Large
- Any other models

### Repeatable Steps (Per Model):
1. ✅ Download model weights (30-60 min)
2. ✅ Create RunPod template (5 min)
3. ✅ Deploy endpoint (5 min)
4. ✅ Update application config (15 min)
5. ✅ Test end-to-end (30 min)

**Total time per new model**: ~2 hours (mostly waiting for download)

### Non-Repeatable (One-Time):
- ❌ Application codebase development (E01-E03)
- ❌ Docker worker creation (E04.5 Section 2)
- ❌ Database schema setup
- ❌ Supabase project setup
- ❌ RunPod/Docker Hub accounts

---

## Appendix: Model Support Matrix

| Model | Size | 4-bit Size | Min GPU | Cost/Hr | Network Volume | Status |
|-------|------|------------|---------|---------|----------------|--------|
| Qwen3-Next-80B-A3B-Instruct | 80B | 84GB | A100 80GB | $3.50 | 200GB | ✅ Deployed |
| DeepSeek-V3 | 671B | 335GB | H100 80GB | $4.20 | 500GB | 📋 Example |
| Llama-4-405B | 405B | 200GB | H100 80GB | $4.20 | 300GB | ⏳ Pending |
| Mistral-Large-2 | 123B | 62GB | A100 80GB | $3.50 | 150GB | ⏳ Pending |
| Qwen2.5-VL-72B | 72B | 75GB | A100 80GB | $3.50 | 200GB | ⏳ Pending |

---

**Document Version**: 1.0  
**Last Updated**: December 28, 2025  
**Maintainer**: BrightRun Infrastructure Team  
**Next Review**: When adding 3rd model (validate this guide's accuracy)
