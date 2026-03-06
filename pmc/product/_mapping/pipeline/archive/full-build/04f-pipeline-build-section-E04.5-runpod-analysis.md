# LoRA Training Pipeline: RunPod Architecture Analysis & Recommendations

**Date:** December 27, 2025
**Status:** Final Analysis
**Audience:** Early-career software engineers (non-ML background)
**Purpose:** Answer all architecture questions for the BrightRun LoRA training pipeline

---

## Executive Summary

Your codebase already has a **complete training infrastructure** built and ready. The missing piece is:

1. A **RunPod Serverless Endpoint** with your custom training Docker image
2. The **API credentials** (`GPU_CLUSTER_API_URL` and `GPU_CLUSTER_API_KEY`) from that endpoint

**Bottom Line Recommendation:**

| Component | Recommendation |
|-----------|----------------|
| **Training** | RunPod Serverless Custom Worker (auto-shutdown eliminates idle costs) |
| **Inference** | RunPod Serverless with vLLM (autoscaling for production traffic) |
| **Model Caching** | RunPod Network Volume (critical for fast cold starts) |
| **GPU Type** | H100 80GB for Qwen 80B (QLoRA 4-bit to fit in VRAM) |

---

## Table of Contents

1. [Question 1: Serverless vs Private Pod](#question-1-serverless-vs-private-pod)
2. [Question 2: Do We Train the "Alive" Model Directly?](#question-2-do-we-train-the-alive-model-directly)
3. [Question 3: Best Architecture for Qwen 80B Training](#question-3-best-architecture-for-qwen-80b-training)
4. [Question 4: Training Multiple Models & Frontier Models](#question-4-training-multiple-models--frontier-models)
5. [Question 5: Additional Considerations](#question-5-additional-considerations)
6. [Question 6: How to Get GPU_CLUSTER_API_URL and GPU_CLUSTER_API_KEY](#question-6-how-to-get-gpu_cluster_api_url-and-gpu_cluster_api_key)
7. [Question 7: Cost Analysis](#question-7-cost-analysis)
8. [Question 8: Who Creates train_lora.py and Docker Image?](#question-8-who-creates-train_lorapy-and-docker-image)
9. [Question 9: Can You Connect to a Private Pod via API?](#question-9-can-you-connect-to-a-private-pod-via-api)
10. [Question 10: LoRA Support for Qwen3-Next-80B-A3B](#question-10-lora-support-for-qwen3-next-80b-a3b)
11. [Conflicting Guidance Resolution](#conflicting-guidance-resolution)
12. [Your Current Codebase Analysis](#your-current-codebase-analysis)

---

## Question 1: Serverless vs Private Pod

### The Short Answer

**Use Serverless Custom Workers for your automated training pipeline.**

### Why This Is Confusing

The confusion comes from two different use cases that have opposite recommendations:

| Use Case | Best Choice | Why |
|----------|-------------|-----|
| **Automated pipeline** (your Vercel app triggers training) | Serverless | Zero idle cost risk, programmatic API, auto-shutdown |
| **Interactive development** (SSH into machine, run experiments) | Pods | Cheaper hourly rate, full control, persistent workspace |

### How Serverless Works for Training

Think of it like this:

1. Your Vercel app sends a "Start Training" signal (HTTP POST request)
2. RunPod spins up a GPU container with your custom Docker image
3. Your `train_lora.py` script runs for 2-8 hours
4. When training finishes, the container automatically shuts down
5. You pay **only for those 2-8 hours of actual GPU time**

The "serverless" name is misleading - it doesn't mean "short tasks only." It means "no server management" and "auto-shutdown when done."

### Real-World Validation

Civitai (a major AI art platform) trains **868,000+ LoRAs per month** on RunPod Serverless. This proves the architecture works for production training workloads at scale.

**Source:** [Civitai RunPod Case Study](https://www.runpod.io/case-studies/civitai-runpod-case-study)

---

## Question 2: Do We Train the "Alive" Model Directly?

### The Short Answer

**No.** You never modify the running inference model directly.

### How LoRA Actually Works (Simplified)

Think of it like adding a plugin to software:

```
Traditional Fine-Tuning:
Original Model (80GB) → Modify All Weights → Modified Model (80GB)
(Expensive, risky, can break the model)

LoRA Fine-Tuning:
Original Model (80GB) → FROZEN (unchanged)
                     ↘
                      Your Dataset → LoRA Adapter (200-500MB)
                      (Small "plugin" with new knowledge)
```

**At inference time:**
```
User Query → Base Model + LoRA Adapter → Response with custom knowledge
```

### Why This Is Better

1. **Safety:** You can't corrupt the base model (it never changes)
2. **Multi-tenant:** One base model + 50 different adapters for 50 clients
3. **Fast switching:** Swap adapters in milliseconds vs. reloading 80GB model
4. **Cheap storage:** Adapters are ~500MB vs. full model copies at 80GB each

### What Your Pipeline Actually Does

```
Step 1: User uploads dataset to Supabase Storage
Step 2: Your Vercel app triggers training on RunPod
Step 3: RunPod loads base model + runs train_lora.py
Step 4: Training produces adapter file (adapter_model.safetensors)
Step 5: Adapter uploaded to Supabase Storage (lora-models bucket)
Step 6: Your inference server loads base model + adapter
Step 7: Client queries get customized responses
```

---

## Question 3: Best Architecture for Qwen 80B Training

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     HTTP POST      ┌──────────────────────┐  │
│   │   Vercel    │ ──────────────────▶│  RunPod Serverless   │  │
│   │  (Next.js)  │     /training      │  (Training Worker)   │  │
│   │             │      /submit       │                      │  │
│   │  • UI       │                    │  • train_lora.py     │  │
│   │  • API      │                    │  • PEFT/QLoRA        │  │
│   │  • Auth     │                    │  • H100 80GB GPU     │  │
│   └──────┬──────┘                    └──────────┬───────────┘  │
│          │                                      │               │
│          │ SQL/Storage                          │ Model Cache   │
│          ▼                                      ▼               │
│   ┌─────────────┐                    ┌──────────────────────┐  │
│   │  Supabase   │                    │  RunPod Network      │  │
│   │             │                    │  Volume              │  │
│   │  • datasets │                    │                      │  │
│   │  • jobs     │                    │  • Qwen 80B base     │  │
│   │  • metrics  │                    │    (~50GB quantized) │  │
│   │  • adapters │                    │                      │  │
│   └─────────────┘                    └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Controller** | Vercel + Next.js | UI, authentication, job management, API routes |
| **Training Worker** | RunPod Serverless | GPU container that runs train_lora.py |
| **Database** | Supabase PostgreSQL | Store jobs, metrics, user data |
| **Dataset Storage** | Supabase Storage | Store training datasets (lora-datasets bucket) |
| **Adapter Storage** | Supabase Storage | Store trained adapters (lora-models bucket) |
| **Model Cache** | RunPod Network Volume | Store frozen base model (avoid re-downloading) |
| **Inference** | RunPod Serverless + vLLM | Serve the trained model to end users |

### Hardware Requirements for Qwen 80B

**The Problem:** Qwen3-Next-80B has ~160GB of weights in half-precision. This won't fit on any single GPU.

**The Solution:** Use **QLoRA (4-bit quantization)** which compresses the model to ~48GB, fitting on a single H100 80GB GPU.

| GPU | VRAM | Qwen 80B Support | Price (Pod) | Price (Serverless) |
|-----|------|------------------|-------------|---------------------|
| H100 PCIe | 80GB | Yes (with QLoRA) | ~$2.39/hr | ~$3.35/hr |
| A100 80GB | 80GB | Yes (with QLoRA) | ~$1.19/hr | ~$2.17/hr |
| A100 40GB | 40GB | No (too small) | - | - |

**Recommendation:** Use **H100 80GB** for faster training, or **A100 80GB** for cost savings.

---

## Question 4: Training Multiple Models & Frontier Models

### Multi-Model Support

Your codebase already supports multiple models through the `hyperparameters.base_model` field:

```typescript
// From your types (src/lib/types/lora-training.ts)
export interface HyperparameterConfig {
  base_model: string;  // e.g., 'mistralai/Mistral-7B-v0.1'
  learning_rate: number;
  batch_size: number;
  // ...
}
```

To train different models, simply pass a different `base_model` value:
- `Qwen/Qwen3-Next-80B-A3B`
- `mistralai/Mistral-7B-v0.1`
- `meta-llama/Llama-3-8B`

### Frontier Models (AWS/GCP)

For even larger training (multi-node, 100B+ models), you can:

1. **AWS SageMaker:** Managed training with multiple GPUs
2. **AWS Trainium:** Use `optimum-neuron` for Qwen3 training
3. **GCP Vertex AI:** Similar to SageMaker

**How to integrate:** Your architecture already abstracts the GPU provider:

```typescript
// Your edge function already calls:
await fetch(`${GPU_CLUSTER_API_URL}/training/submit`, { ... })
```

To add AWS, create a second endpoint and route based on model size:
- Models < 100B → RunPod
- Models > 100B → AWS SageMaker

---

## Question 5: Additional Considerations

### Security & Privacy

1. **Secure Cloud:** Use RunPod Secure Cloud (not Community Cloud) for client data
2. **Signed URLs:** Your code already uses 24-hour expiring signed URLs for datasets
3. **RLS Policies:** Your Supabase tables have Row Level Security enabled

### Versioning

Your `model_artifacts` table already tracks:
- `version` field
- `training_summary` JSONB (hyperparameters, dataset info)
- `quality_metrics` JSONB

### Monitoring

Your infrastructure includes:
- `metrics_points` table for loss curves, throughput, GPU utilization
- Real-time polling (every 5 seconds for active jobs)
- Notifications for job start, completion, failure

---

## Question 6: How to Get GPU_CLUSTER_API_URL and GPU_CLUSTER_API_KEY

### The Direct Answer

You don't "obtain" these from RunPod directly. You **create them** by deploying your custom Docker image.

### Step-by-Step (High Level)

1. **Write** `train_lora.py` and `Dockerfile`
2. **Build** Docker image: `docker build -t yourname/qwen-trainer:v1 .`
3. **Push** to Docker Hub: `docker push yourname/qwen-trainer:v1`
4. **Create Template** in RunPod Console → Serverless → Templates
5. **Create Endpoint** in RunPod Console → Serverless → Endpoints
6. **Copy URL:** The endpoint URL is your `GPU_CLUSTER_API_URL`
7. **Create API Key:** RunPod Settings → API Keys → New Key

**Example Values:**
```bash
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/abc123-your-endpoint-id
GPU_CLUSTER_API_KEY=rp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Question 7: Cost Analysis

### The Confusion Explained

You noticed:
- Serverless H100: ~$3.35/hr
- Pod H100: ~$2.39/hr

"Isn't the Pod always cheaper?"

**No.** Here's why:

### Scenario A: Training with Pods

```
1. You spin up Pod at 9:00 AM
2. Training runs for 3 hours
3. You forget to shut down Pod
4. Pod runs idle for 21 hours
5. You shut down at 9:00 AM next day

Cost: 24 hours × $2.39/hr = $57.36
Actual training: 3 hours
Waste: $50.00+
```

### Scenario B: Training with Serverless

```
1. Vercel triggers training at 9:00 AM
2. Serverless worker spins up automatically
3. Training runs for 3 hours
4. Worker shuts down automatically at 12:00 PM
5. You pay nothing overnight

Cost: 3 hours × $3.35/hr = $10.05
Actual training: 3 hours
Waste: $0.00
```

### When to Use Each

| Scenario | Best Choice | Reasoning |
|----------|-------------|-----------|
| Automated pipeline (your case) | **Serverless** | Zero idle risk, programmatic triggering |
| Interactive experiments | Pods | SSH access, cheaper if you're careful |
| High-volume production | Serverless with Active Workers | 20-30% discount, always warm |
| One-time setup | Pod (temp) | Download model to Network Volume once |

### FLEX vs ACTIVE Workers

- **FLEX:** Scales to zero when idle. Higher per-second rate. Perfect for training (cold start doesn't matter for 3-hour jobs).
- **ACTIVE:** Always running, 20-30% discount. Better for inference with traffic.

**Recommendation:** Use FLEX for training, ACTIVE for high-traffic inference.

---

## Question 8: Who Creates train_lora.py and Docker Image?

### Skills Required

| Asset | Skill Domain | Libraries/Tools |
|-------|--------------|-----------------|
| `train_lora.py` | ML Engineering | transformers, peft, accelerate, trl |
| `Dockerfile` | DevOps/MLOps | Docker, CUDA, PyTorch |
| RunPod Handler | Backend Dev | runpod-python SDK |

### What train_lora.py Does

```python
# Pseudocode - the actual script would be ~100-200 lines
def train_lora(config):
    # 1. Load base model in 4-bit (QLoRA)
    model = AutoModelForCausalLM.from_pretrained(
        "Qwen/Qwen3-Next-80B-A3B",
        quantization_config=BitsAndBytesConfig(load_in_4bit=True)
    )

    # 2. Attach LoRA adapters
    model = get_peft_model(model, LoraConfig(
        r=16,           # Low-rank dimension
        lora_alpha=32,  # Scaling factor
        target_modules=["q_proj", "v_proj"]  # Which layers to adapt
    ))

    # 3. Load dataset from signed URL
    dataset = load_dataset("json", data_files=config["dataset_url"])

    # 4. Train
    trainer = SFTTrainer(model=model, dataset=dataset, ...)
    trainer.train()

    # 5. Save adapter
    model.save_pretrained("/output/adapter")

    # 6. Upload to Supabase
    upload_to_supabase("/output/adapter")
```

### Dockerfile Structure

```dockerfile
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0

# Install dependencies
RUN pip install transformers peft accelerate bitsandbytes trl runpod

# Copy training script
COPY train_lora.py /app/train_lora.py
COPY handler.py /app/handler.py

# RunPod entry point
CMD ["python", "-u", "/app/handler.py"]
```

---

## Question 9: Can You Connect to a Private Pod via API?

### Yes, Multiple Ways

1. **RunPod GraphQL API:** Start/stop/manage pods programmatically
2. **RunPod REST API:** For serverless endpoints (your current approach)
3. **SSH + Scripts:** Run commands on pods via SSH

### Your Current Implementation

Your codebase uses the **Serverless REST API** approach:

```typescript
// From supabase/functions/process-training-jobs/index.ts
await fetch(`${GPU_CLUSTER_API_URL}/training/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}` },
  body: JSON.stringify(gpuJobPayload),
});
```

This is the recommended approach for production pipelines.

---

## Question 10: LoRA Support for Qwen3-Next-80B-A3B

### The Short Answer

**Yes, Qwen3-Next-80B-A3B CAN be fine-tuned with LoRA.**

### Conflicting Information Explained

One agent told you:
> "Official docs mention full SFT but not PEFT/LoRA support yet"

This was **outdated or incomplete information**. Here's the current state (as of December 2025):

### Evidence That LoRA Works on Qwen3-80B

1. **ms-swift Framework:** Explicitly supports Qwen3, Qwen3-MoE for PEFT/LoRA training
   Source: [ms-swift GitHub](https://github.com/modelscope/ms-swift)

2. **Knowledge Distillation Project:** Successfully used LoRA (rank=16, alpha=32) with Qwen3-Next-80B-A3B on H100 GPUs
   Source: [Medium Article](https://medium.com/ai-simplified-in-plain-english/knowledge-distillation-of-qwen3-next-80b-a3b-instruct-into-mistral-7b-v0-1-2328900a67b3)

3. **Hugging Face PEFT:** Standard LoRA works with any HuggingFace-compatible model

4. **AWS Trainium:** Official tutorial for Qwen3 fine-tuning with NeuronSFTTrainer
   Source: [HuggingFace optimum-neuron](https://huggingface.co/docs/optimum-neuron/en/training_tutorials/finetune_qwen3)

### Recommended LoRA Configuration for Qwen3-80B

```python
LoraConfig(
    r=16,                  # Rank (8-64, higher = more capacity)
    lora_alpha=32,         # Scaling factor (usually 2x rank)
    lora_dropout=0.05,     # Regularization
    target_modules=[       # Which layers to adapt
        "q_proj", "k_proj", "v_proj", "o_proj",  # Attention
        "gate_proj", "up_proj", "down_proj"       # MLP (MoE experts)
    ],
    bias="none",
    task_type="CAUSAL_LM"
)
```

### Key Technical Requirement: QLoRA

For Qwen 80B on a single H100 (80GB VRAM), you **must** use 4-bit quantization:

```python
BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4"
)
```

This compresses the model from ~160GB to ~48GB, fitting in 80GB VRAM with room for activations.

---

## Conflicting Guidance Resolution

### Gemini vs Perplexity Recommendations

| Topic | Gemini Said | Perplexity Said | Resolution |
|-------|-------------|-----------------|------------|
| **Training Infrastructure** | Serverless for training | Pods for training | **Both valid.** Serverless better for automation; Pods cheaper for manual work |
| **LoRA on Qwen 80B** | Not directly addressed | Confirmed works with QLoRA | **LoRA works** with PEFT library |
| **Cost Analysis** | Serverless avoids idle costs | Pods cheaper per hour | **Serverless wins** for pipelines due to zero idle risk |

### Final Recommendation

For your specific use case (automated pipeline from Vercel), **Gemini's Serverless recommendation is correct**. The key insight is that:

1. **You're building a pipeline** (programmatic, automated)
2. **Not an interactive workbench** (SSH, manual experiments)

Serverless eliminates the #1 cost risk in AI projects: **accidental idle GPU time**.

---

## Your Current Codebase Analysis

### What Already Exists

Your codebase at `src/` has a **complete training infrastructure**:

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | Built | `supabase/migrations/20241223_create_lora_training_tables.sql` |
| Type Definitions | Built | `src/lib/types/lora-training.ts` |
| Job Creation API | Built | `src/app/api/jobs/route.ts` |
| Job Cancellation API | Built | `src/app/api/jobs/[jobId]/cancel/route.ts` |
| Cost Estimation API | Built | `src/app/api/jobs/estimate/route.ts` |
| Job Processor | Built | `supabase/functions/process-training-jobs/index.ts` |
| React Hooks | Built | `src/hooks/useTrainingConfig.ts` |
| Monitoring UI | Built | `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` |

### What's Missing

| Component | Status | What You Need |
|-----------|--------|---------------|
| Docker Image | Not Built | Create Dockerfile + train_lora.py |
| RunPod Endpoint | Not Deployed | Deploy image to RunPod Serverless |
| API Credentials | Not Set | Set GPU_CLUSTER_API_URL and GPU_CLUSTER_API_KEY in .env.local |
| Network Volume | Not Created | Create volume and cache Qwen model |

### API Contract (What Your Code Expects)

Your edge function expects the GPU cluster to respond to:

**POST `/training/submit`**
```json
// Request
{
  "job_id": "uuid",
  "dataset_url": "https://signed-url...",
  "hyperparameters": { "base_model": "...", "learning_rate": 0.0002, ... },
  "gpu_config": { "gpu_type": "H100", "num_gpus": 1, ... },
  "callback_url": "https://your-supabase.co/functions/v1/training-callback"
}

// Response
{
  "external_job_id": "runpod-job-abc123"
}
```

**GET `/training/status/{external_job_id}`**
```json
// Response
{
  "status": "running",
  "progress": 45.2,
  "current_epoch": 2,
  "current_step": 450,
  "stage": "training",
  "metrics": {
    "training_loss": 1.234,
    "validation_loss": 1.456,
    "learning_rate": 0.0002,
    "throughput": 125.4,
    "gpu_utilization": 92.5
  }
}
```

---

## Summary & Next Steps

### Recommended Path Forward

1. **Create Docker Image** with train_lora.py + RunPod handler
2. **Create Network Volume** on RunPod (200GB, same datacenter as endpoint)
3. **Download Qwen Model** to Network Volume once (use temp Pod)
4. **Deploy Serverless Endpoint** with your custom image
5. **Copy Credentials** to `.env.local` and Supabase Edge Function secrets
6. **Test End-to-End** with a small dataset

### Estimated Costs (Per Training Run)

| Item | Cost |
|------|------|
| H100 Serverless, 4 hours | ~$13.40 |
| Network Volume (200GB/month) | ~$14.00 |
| Supabase Storage (10GB) | ~$0.25 |
| **Total per run** | **~$13.65** |

---

## Sources

- [RunPod Serverless vs Pods](https://www.runpod.io/articles/comparison/serverless-gpu-deployment-vs-pods)
- [RunPod LoRA Fine-Tuning Guide](https://www.runpod.io/articles/guides/maximizing-efficiency-fine-tuning-large-language-models-with-lora-and-qlora-on-runpod)
- [Civitai Case Study](https://www.runpod.io/case-studies/civitai-runpod-case-study)
- [RunPod Custom Workers](https://docs.runpod.io/serverless/workers/custom-worker)
- [RunPod Network Volumes](https://docs.runpod.io/serverless/storage/network-volumes)
- [RunPod Pricing](https://www.runpod.io/pricing)
- [ms-swift Framework](https://github.com/modelscope/ms-swift)
- [Qwen3 Fine-Tuning Guide](https://www.datacamp.com/tutorial/fine-tuning-qwen3)
- [HuggingFace optimum-neuron](https://huggingface.co/docs/optimum-neuron/en/training_tutorials/finetune_qwen3)


---

# ADDENDUM: Template Creation UI Corrections (December 29, 2025)

## Issues Discovered During Implementation

While creating the RunPod serverless template, discovered discrepancies between documentation and actual UI.

### Issue 1: Template Navigation
**Documented**: Serverless → Templates → New Template  
**Actual**: Main Menu → Templates → New Template → Select "Serverless"

### Issue 2: Volume Mount Path in Template
**Documented**: Set "Volume Mount Path: /workspace" in template creation  
**Actual**: No "Volume Mount Path" field in template form

**Resolution**: Volume mounting happens at endpoint deployment, NOT template creation.

### Issue 3: Container Disk vs Network Volume
**Container Disk** (in template): Temporary storage, erased between jobs. Set to 20GB.  
**Network Volume** (in endpoint): Persistent storage. Attach qwen-model-cache at endpoint creation.

---

## Questions Answered

### Q1: Does creating a template cost money?
**NO** - Templates are FREE. Only charged when endpoint processes jobs.

### Q2: Where to create templates?
Main Menu → Templates → New Template → Select "Serverless"

### Q3: Where is "Volume Mount Path"?
It's in endpoint deployment (Phase 7), NOT template creation (Phase 6).

### Q4: What is "Container Disk"?
Temporary workspace (20GB) for dataset downloads and adapter output during jobs.

---

## Corrected Template Creation Steps

### Configuration

| Field | Value |
|-------|-------|
| Template Name | BrightRun LoRA Trainer |
| Template Type | Serverless |
| Container Image | brighthub/brightrun-trainer:v1 |
| Container Disk | 20 GB |

### Environment Variables (5 required)

| Variable | Value |
|----------|-------|
| HF_HOME | /workspace/.cache/huggingface |
| TRANSFORMERS_CACHE | /workspace/models |
| MODEL_PATH | /workspace/models/Qwen3-Next-80B-A3B-Instruct |
| SUPABASE_URL | https://hqhtbxlgzysfbekexwku.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | (from .env.local) |

---

## Next Phase: Deploy Endpoint (Where Volume Mounting Happens)

After template is saved:
1. Serverless → Endpoints → New Endpoint
2. Select template: BrightRun LoRA Trainer
3. Choose GPU: A100 80GB
4. **Attach Network Volume**: qwen-model-cache ← THIS IS WHERE VOLUME MOUNTS
5. Set timeouts and workers

---

## Summary

✅ Templates are free  
✅ Navigate: Main Menu → Templates  
✅ Container Disk = 20GB temporary storage  
✅ Network Volume = attached at endpoint deployment (next phase)  
✅ Two-step process: Template (Phase 6) → Endpoint (Phase 7)

