# LoRA Training Infrastructure Module
**Product Abbreviation:** train  
**Version:** 2  
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

## Database Architecture

### New Tables Required

**training_jobs** (Master Records)
- `id`, `training_file_id`, `status` (queued → training → completed/failed)
- `runpod_pod_id`, `hyperparameters` (JSONB), `metrics` (JSONB)
- `current_step`, `total_steps`, `started_at`, `completed_at`
- `estimated_cost_usd`, `actual_cost_usd`, `lora_artifact_path`

**model_artifacts** (Trained Models)
- `id`, `training_job_id`, `artifact_type` (lora_adapter, checkpoint)
- `storage_path`, `file_size_bytes`, `base_model`
- `validation_loss`, `validation_perplexity`, `human_eval_score`
- `deployment_status` (stored, testing, production, archived)

**training_metrics_history** (For Charting)
- `id`, `training_job_id`, `step`, `epoch`
- `loss`, `learning_rate`, `grad_norm`, `recorded_at`

### New Storage Bucket
- `model-artifacts/` – LoRA adapters, training logs

---

## API Specifications

### Vercel API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/training/start-job` | POST | Start new training job |
| `/api/training/jobs` | GET | List all training jobs |
| `/api/training/jobs/[id]` | GET | Get job status/metrics |
| `/api/training/jobs/[id]` | DELETE | Cancel running job |
| `/api/training/webhook` | POST | Receive RunPod status updates |

### RunPod Internal API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/training/start` | POST | Initiate training |
| `/training/status/{job_id}` | GET | Get current status |
| `/training/stop/{job_id}` | POST | Abort training |

### Webhook Payload (RunPod → Vercel)
```json
{
  "job_id": "uuid",
  "status": "training",
  "step": 450,
  "total_steps": 1200,
  "metrics": { "loss": 0.847, "learning_rate": 0.00018 },
  "timestamp": "2025-12-13T10:30:00Z"
}
```

---

## Training Configuration

### LoRA Hyperparameters (Baseline)
```python
lora_config = {
    "r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    "task_type": "CAUSAL_LM"
}
```

### Training Arguments
```python
training_args = {
    "num_epochs": 3,
    "batch_size": 4,
    "learning_rate": 2e-4,
    "gradient_accumulation_steps": 4,
    "max_seq_length": 2048,
    "warmup_ratio": 0.03,
    "lr_scheduler_type": "cosine",
    "optim": "paged_adamw_32bit"
}
```

### Memory Budget (Llama 3 70B + QLoRA on H100 80GB)
| Component | Memory |
|-----------|--------|
| Base Model (INT4) | 35GB |
| LoRA Adapters (BF16) | 1GB |
| Optimizer States | 20GB |
| Activations | 15GB |
| Batch Processing | 10GB |
| **Total** | **~81GB** ✅ |

---

## User Interface Requirements

### Training Dashboard
- **Training Job Table:** ID, Status, Dataset, Progress, Started, Duration, Cost
- **Start Training Button:** Opens modal with hyperparameter configuration
- **Progress View:** Real-time step counter, loss chart, ETA
- **Download LoRA:** Button to get trained adapter files

### Job Detail View
- Training metrics chart (loss over steps)
- Hyperparameters used
- Error messages (if failed)
- Download artifacts

---

## Implementation Phases

### Phase 1: Database & Vercel APIs (Week 1)
- [ ] Create database migration (`training_jobs`, `model_artifacts`, `training_metrics_history`)
- [ ] Create `model-artifacts` storage bucket
- [ ] Implement `TrainingService` class
- [ ] Build API routes (`/start-job`, `/jobs`, `/jobs/[id]`, `/webhook`)
- **Milestone:** Can create training job record via API

### Phase 2: RunPod Docker Container (Week 2)
- [ ] Create Dockerfile (CUDA 12.1 + PyTorch + Hugging Face)
- [ ] Implement `training_orchestrator.py` (QLoRA training with SFTTrainer)
- [ ] Implement `dataset_preprocessor.py` (brightrun-v4 → Llama 3 format)
- [ ] Implement `api_server.py` (FastAPI for job management)
- [ ] Configure network volume (200GB for base model + adapters)
- **Milestone:** Can train model on RunPod manually

### Phase 3: Integration & Testing (Week 3)
- [ ] Wire Vercel → RunPod API communication
- [ ] Implement webhook flow (RunPod → Vercel status updates)
- [ ] Upload trained adapters to Supabase Storage
- [ ] End-to-end test with 242-conversation dataset
- **Milestone:** Full training cycle from "click button" to "download LoRA"

### Phase 4: Dashboard UI (Week 4)
- [ ] Training jobs table component
- [ ] Start training modal with hyperparameter config
- [ ] Real-time progress display
- [ ] Download trained model button
- **Milestone:** Non-technical user can start and monitor training

---

## Cost Analysis

### Per-Training Run
| Instance Type | Hourly Rate | Est. Duration | Cost |
|---------------|-------------|---------------|------|
| Spot H100 | $2.49-4.99 | 10-15 hours | $25-75 |
| On-Demand H100 | $7.99 | 10-15 hours | $80-120 |

### First 3 Months
| Item | Cost |
|------|------|
| Initial training runs | $50-150 |
| Hyperparameter testing (3-5 runs) | $75-375 |
| Storage (200GB × 3 months) | $60 |
| Contingency | $100 |
| **Total** | **$260-410** |

### ROI
- Dataset sale: $5k-10k
- Trained model sale: $15k-30k
- **Break-even after first trained model sale**

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

## Success Criteria

### Week 3 (Proof of Concept)
- ✅ Train model using 242-conversation dataset
- ✅ Obtain LoRA adapter file (200-500MB)
- ✅ Generate text with trained model
- ✅ Subjective improvement over base Llama 3

### Week 4 (Production Ready)
- ✅ Dashboard UI for training management
- ✅ Real-time progress tracking
- ✅ Predictable cost per training run
- ✅ Can train second model with same ease

### Month 3 (Client-Ready)
- ✅ 3-5 model variations trained and tested
- ✅ Before/after comparison data
- ✅ Client demo script ready
- ✅ Pricing model established

---

## Out of Scope (Phase 1)

- Custom hyperparameter tuning UI (use sensible defaults)
- A/B testing infrastructure for models
- Multi-model comparison dashboards
- Automated quality scoring
- Model deployment/hosting (just training + download)

---

## Key Reference Documents

| Document | Purpose |
|----------|---------|
| `iteration-5-LoRA-training-initial.md` | Full technical specification (2,139 lines) |
| `iteration-5-LoRA-training-initial-tldr.md` | Executive summary (616 lines) |
| `full-file-training-json-242-conversations.json` | Production dataset |
| `training-file-service.ts` | Existing service to extend |

---

## Conclusion

This module delivers the critical missing capability: the ability to train and validate models using our datasets. With 242 conversations already production-ready, we can prove our methodology works and unlock premium revenue from trained model sales.

**Recommended Next Step:** Approve $400 budget, create RunPod account, begin Phase 1 (Database & APIs).

---

**Document Version:** 2.0  
**Last Updated:** December 14, 2025  
**Status:** Product Seed Narrative  
**Dependencies:** Existing TrainingFileService, Supabase infrastructure
