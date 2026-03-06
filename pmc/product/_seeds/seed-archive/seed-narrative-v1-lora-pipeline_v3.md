# LoRA Training Infrastructure Module
**Product Abbreviation:** train  
**Version:** 3  
**Date:** 2025-12-14  
**Category:** LoRA Fine-Tuning Pipeline  

**One-Sentence Summary:**  
The LoRA Training Infrastructure Module extends the Bright Run platform with end-to-end capability to train custom Llama 3 70B LoRA models using our existing 242-conversation emotional intelligence dataset, orchestrated via Vercel APIs and executed on RunPod H100 GPUs.

---

## Module Vision: From Dataset Factory to AI Studio

This seed narrative defines the requirements for the LoRA Training Infrastructure Module. This module transforms Bright Run from a high-end data factory into a **full-service AI studio** capable of delivering trained, tested, and validated LoRA models to clients.

**The Pivot:**
- **Before:** We sell datasets ($5k-10k). Client asks: "How do I know it works?" → No proof.
- **After:** We sell trained models ($15k-30k). Client pitch: "Custom AI with 40% better emotional intelligence—proven."

**Key Insight:** We already have 242 conversations (1,567 training pairs) in `brightrun-lora-v4` format. The dataset is production-ready. What's missing is the infrastructure to train models on it.

---

## The Core Problem

We generate high-quality training conversations but cannot prove they work. Training a model requires:
- Specialized GPU hardware (H100 with 80GB VRAM)
- Complex Python/PyTorch stack (LoRA, QLoRA, Hugging Face)
- Orchestration between our app (Vercel), training compute (RunPod), and storage (Supabase)

Building this capability in-house gives us:
1. **Proof of concept** – Demonstrate dataset effectiveness with measurable metrics
2. **Premium offering** – Sell trained models at 3-5x dataset pricing
3. **Client differentiation** – Provide end-to-end AI development, not just data

---

## System Context & Architecture

### Current State: Dataset Management (WORKING)
- Next.js 14 application on Vercel
- Supabase PostgreSQL for metadata + Storage for files
- `TrainingFileService` aggregates conversations into JSON + JSONL
- Dashboard for conversation management and export

### Future State: Training Pipeline (TO BUILD)

```
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (Next.js Application)                                   │
│  - Dashboard UI: Start Training, View Progress, Download LoRA   │
│  - API Routes: /api/training/start-job, /jobs/:id, /webhook     │
│  - TrainingService: Orchestrates jobs, handles webhooks         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP POST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RUNPOD (GPU Training Environment - H100 PCIe 80GB)             │
│  - Docker container with CUDA 12.1 + PyTorch + Hugging Face     │
│  - Training Orchestrator: QLoRA training with SFTTrainer        │
│  - Dataset Preprocessor: brightrun-v4 → Llama 3 chat format     │
│  - FastAPI server for job management                            │
│  - Network Volume (200GB): base model, adapters, logs           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Upload artifacts
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (Storage & Database)                                  │
│  - Storage: model-artifacts/ bucket (LoRA adapters, logs)       │
│  - Database: training_jobs, model_artifacts, training_metrics   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Existing Assets

### Dataset (Production-Ready ✅)
- **Location:** `pmc/_archive/full-file-training-json-242-conversations.json`
- **Format:** `brightrun-lora-v4` (structured, rich metadata)
- **Contents:** 242 conversations, 1,567 training pairs
- **Scaffolding:** 3 personas × 7 emotional arcs × 20 financial topics
- **Consultant:** Elena Morales, CFP (consistent voice throughout)
- **Quality:** Superior to most open-source datasets (emotional context, conversation history)

### Application (Working ✅)
- Next.js 14 / TypeScript / Supabase
- `TrainingFileService` – aggregates conversations
- `ConversationGenerationService` – Claude API integration
- Existing API patterns and authentication

---

## Part 1: LoRA Training Technical Architecture

### What is LoRA?
Low-Rank Adaptation (LoRA) is a parameter-efficient fine-tuning technique that freezes the base model and trains small "adapter" matrices inserted into each transformer layer.

**Key Advantages for Llama 3 70B:**
```
Traditional Fine-Tuning:
├─ Trains all 70 billion parameters
├─ Requires 280GB VRAM (4 × FP32)
├─ Training time: 50-100 hours
├─ Cost: $400-800 (H100)
└─ Risk: Catastrophic forgetting

LoRA Fine-Tuning:
├─ Trains 0.1-1% of parameters (70M-700M)
├─ Requires 80-100GB VRAM (with QLoRA)
├─ Training time: 10-20 hours
├─ Cost: $50-150 (H100)
└─ Benefit: Preserves base model knowledge, composable adapters
```

### QLoRA Optimization (Critical for 70B on Single H100)
QLoRA (Quantized LoRA) reduces memory by:
1. Loading base model in 4-bit quantization (INT4)
2. Training LoRA adapters in BF16 precision
3. Using paged optimizers (offload to CPU when needed)

**Memory Breakdown (Llama 3 70B + QLoRA):**
```
Base Model (INT4):        35GB   (70B params × 4 bits / 8)
LoRA Adapters (BF16):     1GB    (700M trainable params)
Optimizer States:         20GB   (AdamW with paged offload)
Activation Memory:        15GB   (gradient checkpointing)
Batch Processing:         10GB   (batch_size=4, seq_len=2048)
---------------------------------------------------------
Total:                    ~81GB  (fits in H100 80GB with margin)
```

### Training Framework: Hugging Face Ecosystem

**Recommended Stack:**
```python
# Core Dependencies
transformers==4.37.0        # Hugging Face Transformers
peft==0.8.0                 # Parameter-Efficient Fine-Tuning (LoRA implementation)
accelerate==0.26.0          # Training acceleration, multi-GPU
bitsandbytes==0.42.0        # 4-bit quantization (QLoRA)
datasets==2.16.0            # Dataset loading and processing
trl==0.7.10                 # Transformer Reinforcement Learning (SFTTrainer)

# Model Loading
torch==2.1.2                # PyTorch (CUDA 12.1 compatible)
```

### LoRA Hyperparameters

```python
lora_config = {
    "r": 16,                    # Rank (8, 16, 32) - higher = more capacity, slower
    "lora_alpha": 32,           # Scaling factor (typically 2×r)
    "lora_dropout": 0.05,       # Dropout rate (0.05-0.1 typical)
    "target_modules": [         # Which layers to adapt
        "q_proj",               # Query projection
        "k_proj",               # Key projection  
        "v_proj",               # Value projection
        "o_proj",               # Output projection
        "gate_proj",            # MLP gate (Llama 3)
        "up_proj",              # MLP up (Llama 3)
        "down_proj"             # MLP down (Llama 3)
    ],
    "bias": "none",             # Usually "none" for LoRA
    "task_type": "CAUSAL_LM"    # Causal language modeling
}
```

### Dataset Preprocessing: BrightRun → Llama 3 Format

**Llama 3 Chat Format:**
```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an emotionally intelligent financial planning chatbot representing Elena Morales, CFP...
<|eot_id|><|start_header_id|>user<|end_header_id|>
I'm really stressed about this upcoming compensation review...
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
Jennifer, first—take a breath. What you're experiencing right now is one of the most common...
<|eot_id|><|end_of_text|>
```

**Conversion Logic:**
```python
def convert_brightrun_to_llama3(brightrun_json_path):
    """
    Converts BrightRun v4 format to Llama 3 chat format.
    
    BrightRun Structure:
    - training_pairs[i].system_prompt → system message
    - training_pairs[i].conversation_history → previous turns
    - training_pairs[i].current_user_input → current user message
    - training_pairs[i].target_response → assistant response (training target)
    """
    examples = []
    
    for conversation in data['conversations']:
        for pair in conversation['training_pairs']:
            if pair.get('target_response') is None:
                continue  # Skip pairs without target
            
            messages = [
                {"role": "system", "content": pair['system_prompt']}
            ]
            
            # Add conversation history
            for turn in pair.get('conversation_history', []):
                messages.append({"role": turn['role'], "content": turn['content']})
            
            # Current exchange
            messages.append({"role": "user", "content": pair['current_user_input']})
            messages.append({"role": "assistant", "content": pair['target_response']})
            
            examples.append({"messages": messages, ...metadata...})
    
    # Apply Llama 3 chat template
    formatted = tokenizer.apply_chat_template(messages, tokenize=False)
    return formatted
```

---

## Part 2: End-to-End Pipeline Architecture

### Workflow: Training Job Lifecycle

```
┌──────────────┐
│   USER       │
│  (Dashboard) │
└──────┬───────┘
       │ 1. Select training_file_id, configure hyperparameters
       ▼
┌────────────────────────────────────────────┐
│  Vercel API: POST /api/training/start-job  │
│  - Validates training_file exists          │
│  - Creates training_jobs row (status=queued)│
│  - Initiates RunPod pod (if not running)   │
│  - Sends dataset URL + config to RunPod    │
└──────┬─────────────────────────────────────┘
       │ 2. HTTP POST to RunPod API
       ▼
┌────────────────────────────────────────────┐
│  RunPod API: POST /training/start          │
│  - Receives: training_file download URL    │
│  - Receives: hyperparameters (JSON)        │
│  - Returns: job_id (UUID)                  │
└──────┬─────────────────────────────────────┘
       │ 3. Background async training starts
       ▼
┌────────────────────────────────────────────┐
│  Training Orchestrator (Python async)      │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 1: Dataset Preparation         │ │
│  │ - Download from Supabase             │ │
│  │ - Convert brightrun-v4 → Llama 3     │ │
│  │ - Tokenize and cache                 │ │
│  │ ✅ Webhook: status=preprocessing     │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 2: Model Loading               │ │
│  │ - Load Llama 3 70B (4-bit QLoRA)     │ │
│  │ - Prepare for k-bit training         │ │
│  │ - Configure LoRA adapters            │ │
│  │ ✅ Webhook: status=model_loaded      │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 3: Training                    │ │
│  │ - SFTTrainer.train()                 │ │
│  │ - Log metrics every 10 steps         │ │
│  │ - Checkpoint every 100 steps         │ │
│  │ ✅ Webhook every 50 steps:           │ │
│  │    status=training, metrics={...}    │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 4: Finalization                │ │
│  │ - Save LoRA adapters                 │ │
│  │ - Run validation set (optional)      │ │
│  │ - Zip artifacts                      │ │
│  │ - Upload to Supabase Storage         │ │
│  │ ✅ Webhook: status=completed         │ │
│  │    lora_path=model-artifacts/...     │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
       │ 4. Webhook updates to Vercel API
       ▼
┌────────────────────────────────────────────┐
│  Vercel API: POST /api/training/webhook    │
│  - Receives status updates from RunPod     │
│  - Updates training_jobs table             │
│  - Stores metrics in JSONB column          │
│  - On completion: creates model_artifacts  │
└────────────────────────────────────────────┘
```

### API Specifications

#### Vercel API: Start Training Job

**Endpoint:** `POST /api/training/start-job`

**Request:**
```typescript
{
  "training_file_id": "uuid",
  "hyperparameters": {
    "num_epochs": 3,
    "batch_size": 4,
    "learning_rate": 2e-4,
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "warmup_ratio": 0.03
  },
  "runpod_config": {
    "gpu_type": "H100_PCIE",
    "instance_type": "spot",
    "max_duration_hours": 24
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "training_job_id": "uuid",
  "status": "queued",
  "runpod_pod_id": "xyz123",
  "estimated_duration_minutes": 600,
  "estimated_cost_usd": 50
}
```

#### Webhook Payload (RunPod → Vercel)

```typescript
{
  "job_id": "uuid",
  "status": "training",  // preprocessing, model_loaded, training, completed, failed
  "step": 450,
  "total_steps": 1200,
  "metrics": {
    "loss": 0.847,
    "learning_rate": 0.00018,
    "grad_norm": 0.23,
    "epoch": 1.5
  },
  "timestamp": "2025-12-13T10:30:00Z"
}
```

**Webhook Authentication:**
```typescript
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

headers: { 'X-Webhook-Signature': signature }
```

---

## Part 3: Implementation Checklist

### Phase 1: Database & Storage Setup (Week 1 - Days 1-2)

**Database Schema Extensions:**
```sql
-- Training Jobs Table
CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_file_id UUID REFERENCES training_files(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'preprocessing', 'model_loaded', 'training', 'completed', 'failed', 'cancelled')),
  
  -- RunPod Integration
  runpod_pod_id TEXT,
  runpod_endpoint_url TEXT,
  
  -- Hyperparameters (JSONB for flexibility)
  hyperparameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Training Metrics (updated via webhooks)
  metrics JSONB DEFAULT '{}'::jsonb,
  current_step INT DEFAULT 0,
  total_steps INT,
  current_epoch NUMERIC(4,2) DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Cost Tracking
  estimated_cost_usd NUMERIC(10,2),
  actual_cost_usd NUMERIC(10,2),
  gpu_hours NUMERIC(10,2),
  
  -- Artifacts
  lora_artifact_path TEXT,
  training_log_path TEXT,
  
  -- Error Handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model Artifacts Table
CREATE TABLE model_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('lora_adapter', 'merged_model', 'checkpoint')),
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  -- Model Info
  base_model TEXT DEFAULT 'meta-llama/Meta-Llama-3-70B-Instruct',
  lora_config JSONB,
  
  -- Quality Metrics
  validation_loss NUMERIC(10,6),
  validation_perplexity NUMERIC(10,4),
  human_eval_score NUMERIC(3,2),
  
  -- Deployment
  deployment_status TEXT CHECK (deployment_status IN ('stored', 'testing', 'production', 'archived')),
  deployed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Training Metrics History (for charting)
CREATE TABLE training_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  step INT NOT NULL,
  epoch NUMERIC(4,2),
  loss NUMERIC(10,6),
  learning_rate NUMERIC(10,8),
  grad_norm NUMERIC(10,6),
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_training_file ON training_jobs(training_file_id);
CREATE INDEX idx_training_jobs_created_at ON training_jobs(created_at DESC);
CREATE INDEX idx_model_artifacts_training_job ON model_artifacts(training_job_id);
CREATE INDEX idx_training_metrics_job_step ON training_metrics_history(training_job_id, step);
```

**Storage Bucket:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-artifacts', 'model-artifacts', false);

CREATE POLICY "Authenticated users can read model artifacts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'model-artifacts');
```

**Deliverables:**
- [ ] Migration file: `supabase/migrations/add_training_infrastructure.sql`
- [ ] Migration applied to Supabase
- [ ] `model-artifacts` bucket created
- [ ] RLS policies configured

---

### Phase 2: Vercel API Development (Week 1 Days 3-5)

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/lib/services/training-service.ts` | Service class for training job orchestration |
| `src/app/api/training/start-job/route.ts` | Start new training job |
| `src/app/api/training/jobs/route.ts` | List all training jobs |
| `src/app/api/training/jobs/[id]/route.ts` | Get/cancel specific job |
| `src/app/api/training/webhook/route.ts` | Receive RunPod updates |

**TrainingService Interface:**
```typescript
interface StartTrainingJobInput {
  training_file_id: string;
  hyperparameters: {
    num_epochs: number;
    batch_size: number;
    learning_rate: number;
    lora_r: number;
    lora_alpha: number;
    lora_dropout: number;
    warmup_ratio: number;
    gradient_accumulation_steps: number;
    max_seq_length: number;
  };
  runpod_config: {
    gpu_type: 'H100_PCIE' | 'A100_80GB';
    instance_type: 'spot' | 'on_demand';
    max_duration_hours: number;
  };
  created_by: string;
}

interface TrainingJob {
  id: string;
  training_file_id: string;
  status: 'queued' | 'preprocessing' | 'model_loaded' | 'training' | 'completed' | 'failed' | 'cancelled';
  runpod_pod_id: string | null;
  hyperparameters: object;
  metrics: object;
  current_step: number;
  total_steps: number | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost_usd: number | null;
  lora_artifact_path: string | null;
  error_message: string | null;
}
```

**Deliverables:**
- [ ] `training-service.ts` created
- [ ] API routes created (start-job, jobs, jobs/[id], webhook)
- [ ] Environment variables documented

---

### Phase 3: RunPod Docker Container (Week 2)

**Dockerfile:**
```dockerfile
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    python3.10 python3-pip git wget curl vim \
    && rm -rf /var/lib/apt/lists/*

# PyTorch with CUDA 12.1
RUN pip install torch==2.1.2 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Hugging Face ecosystem
RUN pip install \
    transformers==4.37.0 peft==0.8.0 accelerate==0.26.0 \
    bitsandbytes==0.42.0 datasets==2.16.0 trl==0.7.10

# API server
RUN pip install fastapi==0.109.0 uvicorn[standard]==0.27.0 pydantic==2.5.0 httpx==0.26.0

WORKDIR /app
COPY ./training_orchestrator.py ./dataset_preprocessor.py ./api_server.py /app/

EXPOSE 8000
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Files to Create:**

| File | Purpose |
|------|---------|
| `runpod/Dockerfile` | Container image definition |
| `runpod/training_orchestrator.py` | Main training workflow with webhook callbacks |
| `runpod/dataset_preprocessor.py` | BrightRun v4 → Llama 3 format conversion |
| `runpod/api_server.py` | FastAPI server for job management |
| `runpod/config.py` | Environment configuration |

**Deliverables:**
- [ ] Dockerfile created and tested
- [ ] Training orchestrator with webhook callbacks
- [ ] Dataset preprocessor with validation
- [ ] FastAPI server with health check
- [ ] Docker image pushed to registry
- [ ] RunPod template configured

---

### Phase 4: Integration & Dashboard (Week 3-4)

**Integration Tasks:**
- [ ] Wire Vercel → RunPod API communication
- [ ] Implement webhook flow with signature verification
- [ ] Upload trained adapters to Supabase Storage
- [ ] End-to-end test with 242-conversation dataset

**Dashboard Components:**
- [ ] Training jobs table (ID, Status, Progress, Duration, Cost)
- [ ] Start training modal with hyperparameter config
- [ ] Real-time progress display with loss chart
- [ ] Download trained model button
- [ ] Error display and retry functionality

---

## Part 4: Cost Analysis & ROI

### RunPod Pricing (Dec 2025)

| Instance Type | GPU | Hourly Rate | Use Case |
|---------------|-----|-------------|----------|
| On-Demand H100 PCIe | 1x H100 (80GB) | $7.99/hr | Production, guaranteed |
| Spot H100 PCIe | 1x H100 (80GB) | $2.49-4.99/hr | Cost-optimized (interruptible) |

### Estimated Training Costs

| Scenario | Duration | Instance | Cost |
|----------|----------|----------|------|
| Initial Training (Full) | 10-15 hours | Spot H100 | $25-75 |
| Initial Training (Safe) | 10-15 hours | On-Demand | $80-120 |
| Fine-tuning Iteration | 3-5 hours | Spot H100 | $7-25 |
| Hyperparameter Testing | 2h × 5 runs | Spot H100 | $25-50 |

### Storage Costs
- Network Volume: $0.10/GB/month
- Base model (Llama 3 70B): ~70GB (INT8/QLoRA)
- LoRA adapters: 200MB-1GB per run
- **Estimated:** $20-30/month for 200GB volume

### First 3 Months Budget

| Item | Cost |
|------|------|
| Initial training runs | $50-150 |
| Hyperparameter testing (3-5 runs) | $75-375 |
| Storage (200GB × 3 months) | $60 |
| Contingency | $100 |
| **Total** | **$260-410** |

### ROI Comparison

**Traditional ML Consultancy:**
- Hiring LoRA engineer: $150-250/hr
- 40 hours setup: $6,000-10,000
- Each iteration: $1,500-2,500

**Self-Implemented:**
- Your time: 160 hours
- Cost per iteration: $50-150
- **Savings after 5 iterations: ~$7,500-12,000**

---

## Part 5: Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| RunPod spot interruption | Medium | Medium | Checkpointing every 100 steps, restart from checkpoint |
| OOM errors | Low-Medium | High | QLoRA optimizations, reduce batch_size, gradient checkpointing |
| Dataset format issues | Low | Medium | Preprocessing validation, dry-run on 10 examples |
| Webhook delivery failures | Medium | Low | Retry logic, polling fallback |
| LoRA doesn't improve quality | Medium | High | Start with proven hyperparameters, iterate systematically |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Model doesn't match human quality | Medium | High | Human evaluation pipeline, iterative improvement |
| Competition implements similar | High | Medium | Speed to market (4 weeks), vertical expertise |
| Time investment doesn't yield results | Low | High | Phased approach - validate PoC before full build |

---

## Part 6: Hyperparameter Tuning Guide

### Recommended Starting Points

```python
# Conservative (safe, slower training)
conservative_config = {
    "lora_r": 8,
    "lora_alpha": 16,
    "lora_dropout": 0.05,
    "learning_rate": 1e-4,
    "num_epochs": 2,
    "batch_size": 2,
    "gradient_accumulation_steps": 8,
}

# Balanced (recommended default)
balanced_config = {
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "learning_rate": 2e-4,
    "num_epochs": 3,
    "batch_size": 4,
    "gradient_accumulation_steps": 4,
}

# Aggressive (higher capacity, longer training)
aggressive_config = {
    "lora_r": 32,
    "lora_alpha": 64,
    "lora_dropout": 0.1,
    "learning_rate": 3e-4,
    "num_epochs": 4,
    "batch_size": 4,
    "gradient_accumulation_steps": 4,
}
```

**If Training Fails:**
- OOM error → Reduce `batch_size` to 2, increase `gradient_accumulation_steps`
- Loss not decreasing → Increase `learning_rate` or `lora_r`
- Overfitting → Add `weight_decay=0.01`, reduce `num_epochs`

---

## Part 7: Success Criteria & Decision Points

### Decision Point 1: After Week 1 (Database Setup)

**Go Criteria:**
- [ ] Database tables created successfully
- [ ] Can query and insert training_jobs via API
- [ ] Supabase Storage configured for model artifacts

**No-Go:** Reassess technical approach, consider alternative storage

### Decision Point 2: After Week 2 (RunPod Container)

**Go Criteria:**
- [ ] Docker image builds successfully
- [ ] FastAPI server responds to /health endpoint
- [ ] Can run container locally (test imports)

**No-Go:** Simplify Docker image, reduce dependencies

### Decision Point 3: After Week 3 (First Training Run)

**Go Criteria:**
- [ ] Training completes without errors
- [ ] LoRA adapters saved successfully
- [ ] Can load adapters and generate text
- [ ] Output quality subjectively "better than baseline"

**No-Go:** Debug systematically:
1. Check dataset format
2. Validate hyperparameters
3. Review training logs
4. Consider increasing training data

### Success Metrics

**Phase 1 (Proof of Concept):**
- [ ] Train LoRA adapter on 242-conversation dataset
- [ ] Training completes in < 24 hours
- [ ] Cost < $150
- [ ] Adapters saved and downloadable

**Phase 2 (Quality Validation):**
- [ ] Test on 10-20 held-out examples
- [ ] Responses feel "on-brand" for Elena Morales
- [ ] Emotional intelligence preserved
- [ ] No catastrophic forgetting

**Phase 3 (Production Ready):**
- [ ] Dashboard UI operational
- [ ] Automated error recovery
- [ ] Cost tracking and alerts
- [ ] Model versioning capability

---

## Environment Variables Required

```bash
# RunPod Integration
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_URL=

# Webhook Security
TRAINING_WEBHOOK_SECRET=

# Existing
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Key Reference Documents

| Document | Purpose |
|----------|---------|
| `iteration-5-LoRA-training-initial.md` | Full technical specification |
| `iteration-5-LoRA-training-initial-tldr.md` | Executive summary |
| `full-file-training-json-242-conversations.json` | Production dataset |
| `training-file-service.ts` | Existing service to extend |

### Technical References
- [LoRA Paper (Hu et al., 2021)](https://arxiv.org/abs/2106.09685)
- [QLoRA Paper (Dettmers et al., 2023)](https://arxiv.org/abs/2305.14314)
- [Hugging Face PEFT Documentation](https://huggingface.co/docs/peft)
- [RunPod Documentation](https://docs.runpod.io/)

---

## Conclusion

This module delivers the critical missing capability: the ability to train and validate models using our datasets. With 242 conversations already production-ready, we can prove our methodology works and unlock premium revenue from trained model sales.

**Key Advantages:**
1. ✅ Dataset is excellent quality (structured, emotionally intelligent, well-scaffolded)
2. ✅ Existing app can be extended (not starting from scratch)
3. ✅ RunPod + QLoRA makes 70B training feasible on single H100
4. ✅ Cost-effective ($50-150 per run vs $6k-10k outsourcing)
5. ✅ Phased approach minimizes risk (validate PoC before scaling)

**Recommended Next Step:** Approve $400 budget, create RunPod account, begin Phase 1 (Database & APIs).

---

**Document Version:** 3.0  
**Last Updated:** December 14, 2025  
**Status:** Product Seed Narrative (Detailed)  
**Dependencies:** Existing TrainingFileService, Supabase infrastructure
