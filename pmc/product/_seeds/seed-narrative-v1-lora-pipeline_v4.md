# LoRA Training Infrastructure Module
**Product Abbreviation:** train  
**Version:** 4  
**Date:** 2025-12-14  
**Category:** LoRA Fine-Tuning Pipeline  

**Two-Sentence Summary:**
The Bright Run Training Data Generation Module transforms the manual, console-based process of creating LoRA training conversations into an intuitive, UI-driven workflow that enables non-technical users to generate, review, and manage high-quality conversation datasets through intelligent prompt templates, dimensional filtering, and real-time progress tracking.

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
- **Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\_archive\full-file-training-json-242-conversations.json`
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

For detailed technical specifications on the recommended stack, LoRA hyperparameters, and dataset preprocessing logic, see `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: Training Framework).

**Core Dependencies:**
- transformers, peft, accelerate, bitsandbytes, datasets, trl
- PyTorch 2.1.2 (CUDA 12.1 compatible)

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

For complete conversion logic and implementation details, refer to `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: Dataset Preprocessing).

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

For complete API endpoint specifications, request/response schemas, and webhook authentication details, see `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: API Specifications).

**Key Endpoints:**
- `POST /api/training/start-job` - Initiate training job
- `GET /api/training/jobs/:id` - Get job status
- `POST /api/training/webhook` - Receive RunPod progress updates
- `DELETE /api/training/jobs/:id` - Cancel training job

---

## Part 3: Implementation Checklist

### Phase 1: Database & Storage Setup (Week 1 - Days 1-2)

For complete database schema with all table definitions, indexes, and storage bucket configuration, refer to `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: Database Schema Extensions).

**New Tables:**
- `training_jobs` - Tracks training runs with status, metrics, costs
- `model_artifacts` - Stores trained model metadata and paths
- `training_metrics_history` - Time-series data for charting

**Storage:**
- `model-artifacts` bucket for LoRA adapters and logs

**Deliverables:**
- [ ] Migration file: `C:\Users\james\Master\BrightHub\BRun\v4-show\supabase\migrations\add_training_infrastructure.sql`
- [ ] Migration applied to Supabase
- [ ] `model-artifacts` bucket created
- [ ] RLS policies configured

---

### Phase 2: Vercel API Development (Week 1 Days 3-5)

**Files to Create:**

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-service.ts` | Service class for training job orchestration |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\training\start-job\route.ts` | Start new training job |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\training\jobs\route.ts` | List all training jobs |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\training\jobs\[id]\route.ts` | Get/cancel specific job |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\training\webhook\route.ts` | Receive RunPod updates |

For complete TypeScript interfaces and service implementation details, see `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: Vercel API Development).

**Deliverables:**
- [ ] `training-service.ts` created
- [ ] API routes created (start-job, jobs, jobs/[id], webhook)
- [ ] Environment variables documented

---

### Phase 3: RunPod Docker Container (Week 2)

**Files to Create:**

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\runpod\Dockerfile` | Container image definition |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\runpod\training_orchestrator.py` | Main training workflow with webhook callbacks |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\runpod\dataset_preprocessor.py` | BrightRun v4 → Llama 3 format conversion |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\runpod\api_server.py` | FastAPI server for job management |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\runpod\config.py` | Environment configuration |

For complete Dockerfile specification and Python implementation details, refer to `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: RunPod Docker Container).

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

For complete hyperparameter configurations (conservative, balanced, aggressive) and troubleshooting guidance, see `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Section: Hyperparameter Tuning Guide).

**Recommended Starting Point:** Balanced configuration
- lora_r: 16, lora_alpha: 32, learning_rate: 2e-4
- num_epochs: 3, batch_size: 4

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

## User Interface Requirements

*Adapted from conversation generation module for LoRA training infrastructure context*

### Training Dashboard Experience

The main training dashboard must provide comprehensive control and visibility over LoRA training jobs:

**A. Training Jobs Table**
- One row per training job (historical and active)
- Columns: Job ID, Training File, Model, Status, Progress, Duration, Cost, Started, Actions
- Sortable by any column (most recent first by default)
- Multi-select checkboxes for batch operations (compare models, export metrics)
- Status badges with color coding:
  - **Queued** (gray) - Waiting to start
  - **Preprocessing** (blue) - Dataset preparation
  - **Model Loaded** (cyan) - Ready to train
  - **Training** (yellow) - Active training with progress %
  - **Completed** (green) - Successful completion
  - **Failed** (red) - Error occurred
  - **Cancelled** (orange) - User cancelled

**B. Training Configuration Panel**
- Training file selector (dropdown of available datasets)
- Base model selector (Llama 3 70B Instruct, others in future)
- Hyperparameter controls with presets:
  - Preset selector: Conservative / Balanced / Aggressive
  - Advanced toggle for manual hyperparameter adjustment
  - LoRA configuration: rank (r), alpha, dropout, target modules
  - Training parameters: epochs, batch size, learning rate
  - Resource configuration: GPU type, instance type (spot/on-demand)
- Cost estimator showing:
  - Estimated duration: 10-15 hours
  - Estimated cost: $25-75 (updates based on configuration)
  - Storage cost: $0.50/month for adapters
- "Start Training" button with confirmation dialog

**C. Progress Monitoring Dashboard** (For Active Training Jobs)
- Live progress bar: "Training: 450 / 1200 steps (37.5%)"
- Current stage indicator: "Stage 3: Training - Epoch 1.5 / 3"
- Real-time metrics display:
  - **Loss chart** (line graph, last 200 steps)
  - **Learning rate** (current value with decay curve)
  - **Gradient norm** (stability indicator)
  - **Estimated time remaining** (dynamic calculation)
- Webhook event log (expandable):
  - Timestamp, stage, status, metrics
  - Error messages with stack traces if failed
- "Cancel Training" button with warning dialog

**D. Model Artifact Download Interface**
- Triggered when training status = "Completed"
- Display summary:
  - Final loss: 0.847
  - Training duration: 12h 34m
  - Actual cost: $48.50
  - Adapter size: 427 MB
- Download options:
  - **LoRA Adapters Only** (adapter_model.bin, adapter_config.json)
  - **Full Training Package** (adapters + logs + metrics + config)
  - **Deployment Package** (adapters + inference script + README)
- Copy storage path button (for direct Supabase access)
- "Deploy to Test Environment" button (future enhancement)

**E. Job Management Controls**
- **"New Training Job" button** - Opens configuration panel
- **"Compare Models" button** (when 2+ jobs selected) - Side-by-side metrics
- **"Export Metrics" button** - Download training history as CSV/JSON
- **"Retry Failed Job" button** - Restart with same configuration
- **Filter controls:**
  - Status: All / Active / Completed / Failed
  - Date range selector
  - Training file filter
  - Model filter

**F. Cost Tracking Dashboard**
- Summary cards:
  - **Total Spent This Month:** $142.50
  - **Budget Remaining:** $257.50 / $400
  - **Active Training Cost:** $23.75 (running)
  - **Average Cost Per Job:** $47.50
- Cost breakdown table (by training job)
- Monthly trend chart
- Budget alert configuration (email when >80% budget used)

### Styling & UX Requirements
- Modern, clean design using **shadcn/ui** components
- Consistent with existing Bright Run application style
- Responsive design (desktop primary, mobile-friendly for monitoring)
- **Loading states:**
  - Skeleton loaders for table rows during fetch
  - Shimmer effect for metrics during live updates
  - Spinner overlays for long operations
- **Toast notifications:**
  - Training started: "Training job #1234 started successfully"
  - Training completed: "Model training complete! Download ready."
  - Training failed: "Training failed - see error log"
  - Budget alert: "Warning: 85% of monthly training budget used"
- **Confirmation dialogs:**
  - Start training (with cost estimate)
  - Cancel active training (warn about wasted cost)
  - Delete completed job (warn about losing artifacts)
- **Real-time updates:**
  - WebSocket or polling (every 5 seconds) for active training jobs
  - Automatic table refresh when webhook received
  - Progress bar smooth animation (not jumpy)

### Accessibility Requirements
- Keyboard navigation support (tab through controls)
- Screen reader friendly (aria labels on all interactive elements)
- Color-blind safe status indicators (use icons + colors)
- Sufficient contrast ratios (WCAG AA compliance)

---

## Integration with Existing Modules

*Adapted from conversation generation module for LoRA training infrastructure context*

### Integration with TrainingFileService

**Purpose:** Leverage existing dataset management infrastructure

**Integration Points:**
1. **Dataset Selection Interface**
   - Training dashboard queries `training_files` table via existing `TrainingFileService`
   - Displays available datasets in training job configuration panel
   - Shows metadata: conversation count, training pairs, quality scores
   - Validates selected dataset before starting training

2. **Dataset Download for RunPod**
   - Training job uses `TrainingFileService.getDownloadUrl()` to generate signed URL
   - Passes URL to RunPod for dataset download
   - Ensures proper permissions (service role key)

3. **Storage Path Conventions**
   - Training files stored in: `training-files/{fileId}/training.json`
   - Model artifacts stored in: `model-artifacts/jobs/{jobId}/lora_adapters/`
   - Maintains consistent Supabase Storage structure

**Code Location:**
- Existing service: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-file-service.ts`
- New service: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-service.ts`
- Shared types: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\training.ts`

### Integration with ConversationGenerationService

**Purpose:** Consistent API patterns and error handling

**Integration Points:**
1. **API Route Patterns**
   - Follow existing `/api/conversations/*` structure
   - New routes: `/api/training/*` (parallel structure)
   - Consistent request/response formats
   - Same error handling middleware

2. **Supabase Client Configuration**
   - Reuse existing Supabase client initialization
   - Share service role key authentication
   - Consistent connection pooling

3. **Webhook Patterns**
   - Similar to enrichment pipeline webhooks
   - Signature verification using same pattern
   - HMAC-SHA256 with shared secret

**Code Location:**
- Reference implementation: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\conversation-generation-service.ts`
- API pattern reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\route.ts`

### Integration with Database Schema

**Purpose:** Extend existing schema without breaking changes

**Integration Points:**
1. **New Tables Link to Existing Tables**
   - `training_jobs.training_file_id` → `training_files(id)` (foreign key)
   - `training_jobs.created_by` → `auth.users(id)` (foreign key)
   - Maintains referential integrity

2. **Consistent Naming Conventions**
   - Snake_case for columns (matches existing schema)
   - UUID primary keys (consistent with `conversations`, `training_files`)
   - `created_at`, `updated_at` timestamps (standard pattern)

3. **Migration Strategy**
   - New migration file: `C:\Users\james\Master\BrightHub\BRun\v4-show\supabase\migrations\add_training_infrastructure.sql`
   - Follows existing migration pattern
   - Includes rollback instructions

**Database Location:**
- Schema reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\supabase\migrations\`
- Types generation: Use Supabase CLI to regenerate types after migration

### Integration with UI Component Library

**Purpose:** Consistent user interface and styling

**Integration Points:**
1. **Shared Component Usage**
   - Reuse existing shadcn/ui components (Table, Button, Card, Badge, etc.)
   - Follow component composition patterns from conversations dashboard
   - Consistent spacing and layout grid

2. **Theme and Styling**
   - Use existing Tailwind configuration
   - Follow color palette from `C:\Users\james\Master\BrightHub\BRun\v4-show\src\index.css`
   - Maintain design system consistency

3. **Navigation Integration**
   - Add "Training" section to main navigation
   - Parallel to existing "Conversations" and "Training Files" sections
   - Same navigation component structure

**UI Location:**
- Component library: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\`
- Dashboard reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\dashboard\`

### Integration with Environment Configuration

**Purpose:** Centralized configuration management

**Integration Points:**
1. **New Environment Variables**
   - Add to `.env.local` (development)
   - Add to Vercel project settings (production)
   - Document in `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.example`

2. **Required New Variables:**
   ```bash
   # RunPod Integration
   RUNPOD_API_KEY=your_api_key_here
   RUNPOD_ENDPOINT_URL=https://api.runpod.io/v2
   
   # Webhook Security
   TRAINING_WEBHOOK_SECRET=random_secret_256_bits
   ```

3. **Existing Variables (Reused):**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Configuration Location:**
- Environment template: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.example`
- Type definitions: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\env.ts`

### Authentication & Authorization

**Purpose:** Consistent security model

**Integration Points:**
1. **User Authentication**
   - Reuse existing Supabase Auth
   - Same session management
   - Training jobs associated with `created_by` user ID

2. **API Route Protection**
   - Apply same middleware as conversation APIs
   - Require authenticated user for all training operations
   - Service role key for RunPod → Vercel webhooks

3. **Row Level Security (RLS)**
   - Users can only see their own training jobs
   - Same pattern as conversations table
   - Admin users can see all jobs (future enhancement)

---

## Quality Assurance & Success Criteria

*Adapted from conversation generation module for LoRA training infrastructure context*

### Training Job Quality Targets

**Job Completion Success Rate:**
- **95% Completion Rate:** 95 of 100 training jobs complete without errors
- **Checkpoint Recovery:** 100% of interrupted jobs can resume from checkpoints
- **Dataset Validation:** 100% of datasets validated before training starts (prevent format errors)
- **Webhook Reliability:** 98%+ of webhook deliveries successful (with retry mechanism)

**Model Quality Targets:**
- **Perplexity Improvement:** Trained models show ≤30% perplexity vs. baseline on validation set
- **Emotional Intelligence Metrics:** Human evaluators rate trained model ≥15% better than baseline
- **No Catastrophic Forgetting:** Trained model retains ≥95% of baseline financial knowledge
- **Consistency:** Response style matches Elena Morales voice profile in ≥85% of test cases

### System Performance Targets

**Training Job Management:**
- **Job Start Latency:** Training job starts within 60 seconds of API call
- **RunPod Pod Spin-up:** GPU pod ready within 120 seconds (cold start)
- **Dataset Download Speed:** 10MB dataset downloads in <30 seconds to RunPod
- **Webhook Delivery Time:** Status updates received within 5 seconds of event

**Training Performance:**
- **Training Speed:** Averages 8-12 hours for 242-conversation dataset (3 epochs, balanced config)
- **Checkpoint Frequency:** Checkpoints saved every 100 steps (every 5-10 minutes)
- **Memory Efficiency:** QLoRA configuration uses ≤78GB VRAM (2GB margin on H100 80GB)
- **Cost Predictability:** Actual cost within ±15% of estimated cost (account for spot pricing variance)

**Dashboard Performance:**
- **Initial Load Time:** Training jobs table loads in <2 seconds (50 jobs)
- **Real-time Updates:** Progress bar updates within 5 seconds of webhook (WebSocket or polling)
- **Metric Chart Rendering:** Loss/learning rate charts render in <500ms
- **Download Speed:** LoRA adapter download (500MB) initiates within 1 second

### User Experience Targets

**Clarity and Transparency:**
- **Status Visibility:** Users always know current training stage (preprocessing, training, etc.)
- **Error Messages:** 100% of failures include actionable error message ("Out of memory → reduce batch_size to 2")
- **Cost Transparency:** Estimated cost displayed before starting, actual cost shown after completion
- **Progress Accuracy:** Progress indicator reflects actual training state (not just time elapsed)

**Ease of Use:**
- **Configuration Time:** Users can configure and start training job in <3 minutes
- **Preset Effectiveness:** Balanced preset works for ≥80% of use cases (minimal tweaking needed)
- **Artifact Download:** Trained model available for download within 60 seconds of completion
- **Retry Simplicity:** Failed jobs can be retried with 1 click (same config)

**Feedback and Notifications:**
- **Real-time Feedback:** All user actions (start, cancel, download) show feedback within 1 second
- **Completion Notification:** Users notified when training completes (toast + optional email)
- **Error Recovery:** Clear instructions provided for common errors (OOM, webhook timeout, etc.)
- **Budget Alerts:** Users warned when approaching budget limit (at 80% and 95%)

### Data Integrity Targets

**Storage Reliability:**
- **Artifact Persistence:** 100% of completed training jobs have downloadable artifacts
- **Backup Strategy:** LoRA adapters automatically backed up to Supabase Storage
- **Version Tracking:** Each training job creates unique versioned artifact (no overwrites)
- **Metadata Completeness:** All training jobs have complete metadata (hyperparameters, metrics, costs)

**Audit Trail:**
- **Training History:** Full audit log of all training jobs (who started, when, configuration)
- **Metric History:** Time-series data preserved in `training_metrics_history` table
- **Error Logging:** Failed jobs include full error stack trace and context
- **Cost Tracking:** Actual GPU hours and costs recorded for accounting

### Testing and Validation

**Pre-deployment Testing:**
- **Local Docker Testing:** Train on small subset (10 conversations) locally to verify setup
- **Staging Environment:** Complete end-to-end test on staging before production deployment
- **Load Testing:** Verify system handles 5 concurrent training jobs
- **Failure Simulation:** Test recovery from spot instance interruption, webhook failure, OOM

**Production Monitoring:**
- **Health Checks:** RunPod API health endpoint checked every 60 seconds
- **Cost Monitoring:** Alert if single job exceeds $200 (runaway cost protection)
- **Quality Sampling:** Random sample of 10% of completed models manually reviewed
- **User Feedback:** Collect user ratings on trained model quality

---

## Principles & Constraints

*Adapted from conversation generation module for LoRA training infrastructure context*

### Design Principles

1. **Human Oversight and Control**
   - Automation serves humans, not replaces them
   - Users must have visibility into training progress at all times
   - Users can start, monitor, cancel training jobs at any point
   - No "black box" training - all hyperparameters, metrics, and costs visible
   - Default configurations are safe and proven, but users can override

2. **Incremental and Flexible Workflow**
   - Users can train one model at a time (manual experimentation)
   - Users can queue multiple training jobs (batch testing)
   - Users can compare different hyperparameter configurations
   - System supports both quick iteration and long-running training
   - Checkpoint-based training allows resumption after interruption

3. **Quality Over Speed**
   - Better to train one high-quality model slowly than rush to production
   - Proper dataset validation before training starts (prevent garbage in)
   - Human evaluation of sample outputs before declaring success
   - Cost consciousness: prefer spot instances even if slower (50-80% savings)
   - Iterative improvement: test small changes, measure impact, iterate

4. **Transparency and Predictability**
   - Users always know current training stage and estimated time remaining
   - Cost estimates provided upfront, actual costs tracked and displayed
   - Error messages are actionable ("reduce batch_size" not just "OOM error")
   - Training metrics (loss, learning rate) updated in real-time
   - Webhook events logged for debugging and audit

5. **Fault Tolerance and Recovery**
   - Failures don't lose data - checkpoints saved every 100 steps
   - Spot instance interruptions handled gracefully (resume from checkpoint)
   - Webhook failures trigger retry logic (exponential backoff)
   - Users can retry failed jobs with 1 click
   - Failed jobs preserved for analysis (not auto-deleted)

6. **Cost Consciousness**
   - Default to spot instances (50-80% cheaper than on-demand)
   - Automatic shutdown after training completes (no idle GPU billing)
   - Budget tracking and alerts (warn at 80%, 95% of monthly budget)
   - Cost estimates before starting (prevent surprise bills)
   - Document cost-saving strategies (reduce epochs, use conservative config)

### Technical Constraints

1. **GPU Hardware Limitations**
   - **H100 80GB VRAM:** Maximum model size is Llama 3 70B with QLoRA (4-bit)
   - **Memory Management:** Must use gradient checkpointing, paged optimizers
   - **Batch Size Cap:** Maximum batch_size = 4 with gradient_accumulation_steps = 4
   - **Quantization Required:** Cannot load 70B in FP16 (would require 140GB)
   - **Single GPU Training:** Multi-GPU support deferred to future (adds complexity)

2. **RunPod Platform Constraints**
   - **Spot Instance Interruption:** Spot instances can be preempted (10-30% chance over 10 hours)
   - **Network Volume Latency:** Persistent storage has 5-10ms latency vs. local SSD
   - **API Rate Limits:** RunPod API calls limited to 100/minute (affects startup/shutdown)
   - **Docker Image Size:** Maximum 10GB image size (optimize layer caching)
   - **Webhook Timeout:** Must respond to webhooks within 30 seconds

3. **Dataset Constraints**
   - **Minimum Size:** Requires ≥500 training pairs for meaningful LoRA fine-tuning
   - **Maximum Size:** Single training run limited to ≤10,000 pairs (memory constraints)
   - **Format Validation:** brightrun-v4 format must be strictly validated (malformed JSON breaks training)
   - **Preprocessing Time:** Large datasets (5,000+ pairs) may take 5-10 minutes to preprocess
   - **Storage Limits:** Dataset must fit in network volume (max 200GB total storage)

4. **Cost and Budget Constraints**
   - **Spot Pricing Volatility:** Spot instance costs vary 50-100% based on availability
   - **$400 Monthly Budget:** Default budget cap to prevent runaway costs
   - **Per-Job Cost Ceiling:** Single training job should not exceed $150 (safety limit)
   - **Storage Costs:** Each LoRA adapter (500MB) costs ~$0.05/month to store
   - **Webhook Costs:** Vercel serverless function invocations (minimal but non-zero)

5. **Training Time Constraints**
   - **Maximum Duration:** Single training run capped at 24 hours (prevent infinite loops)
   - **User Patience:** Users expect results within 12-16 hours for standard dataset
   - **Spot Interruption Risk:** Longer runs (>15 hours) have higher preemption risk
   - **Checkpoint Overhead:** Saving checkpoints adds 1-2% to total training time
   - **Validation Time:** Post-training validation adds 30-60 minutes

### Business Constraints

1. **Timeline and Scope**
   - **4-Week MVP:** Must deliver working end-to-end system in 4 weeks (phased approach)
   - **Prioritize Core Workflow:** Start training, monitor progress, download model (all else deferred)
   - **Dashboard UI:** Must be functional but can be basic (polish in Phase 2)
   - **Testing Framework:** Deferred to separate module (focus on infrastructure first)
   - **Multi-User Support:** RLS and permissions deferred (single user/team initially)

2. **Integration Complexity**
   - **Existing Codebase:** Must integrate with Next.js 14 + Supabase (no separate deployment)
   - **Database Migrations:** Must be backward compatible (no breaking changes to existing tables)
   - **API Patterns:** Must follow existing /api/* structure and authentication
   - **UI Components:** Must use existing shadcn/ui library (no new component system)
   - **Deployment:** Must deploy to Vercel (no separate infrastructure)

3. **User Training and Documentation**
   - **Intuitive UI:** Dashboard must be usable without extensive documentation
   - **Preset Configurations:** Provide 3 proven presets (conservative, balanced, aggressive)
   - **Error Messages:** Must be self-explanatory (users can fix issues independently)
   - **Cost Transparency:** Users must understand costs before starting training
   - **In-App Tooltips:** Key controls have inline help text

4. **Scalability Requirements**
   - **Current Scope:** Support single user/team with ≤10 concurrent training jobs
   - **Future Scope:** Architecture must support 100+ concurrent jobs (multi-tenant)
   - **Database Schema:** Design for future scale (proper indexing, efficient queries)
   - **Cost Model:** Per-job costs must remain predictable as volume scales
   - **Storage Growth:** Plan for 50-100 trained models stored long-term

5. **Risk Mitigation**
   - **Phased Go/No-Go:** Weekly checkpoints with explicit success criteria
   - **Budget Controls:** Hard limits prevent runaway spending
   - **Rollback Plan:** Database migrations include rollback scripts
   - **Monitoring:** CloudWatch/Sentry error tracking from day one
   - **Documentation:** Implementation notes for future developers

### Regulatory and Compliance Constraints (Future)

*Not in scope for initial implementation, but documented for future reference:*

1. **Data Privacy:** Training data may contain sensitive financial information (future: encryption at rest)
2. **Model Licensing:** Llama 3 license allows commercial use (verify terms for client deployments)
3. **Cost Attribution:** Track costs per client for billing purposes (future multi-tenant feature)
4. **Audit Logs:** Maintain training history for compliance (already implemented via `training_jobs` table)
5. **Model Versioning:** Track which dataset version produced which model (important for reproducibility)

---

## Next Steps for Specification Development

*Adapted from conversation generation module for LoRA training infrastructure context*

This seed narrative document serves as the foundation for creating detailed technical specifications, user stories, and design artifacts for the LoRA Training Infrastructure Module.

### 1. Detailed User Stories

**Using:** Prompt template at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_tools\02-product-user-stories-prompt-template-v2-wf.md`

User stories should comprehensively cover:

**Stakeholder Roles:**
- **AI Engineer** Primary user who configures and runs training jobs
- **Business Owner** Reviews costs and model quality metrics
- **End Client:** Eventually uses trained models (indirect stakeholder)

**Main Workflows:**
- **Start Training Job:** Select dataset, configure hyperparameters, estimate costs, initiate training
- **Monitor Progress:** View real-time metrics, check status, review logs, cancel if needed
- **Download Model:** Access completed LoRA adapters, verify quality, deploy to test environment
- **Compare Models:** Compare multiple training runs, analyze metric differences, choose best model
- **Manage Costs:** Track spending, set budget limits, optimize configurations for cost

**UI Interactions:**
- Training jobs table (sort, filter, select, view details)
- Configuration panel (preset selection, manual hyperparameter tuning, cost estimation)
- Progress dashboard (real-time metrics, loss charts, time remaining)
- Artifact download (select format, copy storage path, deploy)
- Error handling (retry failed jobs, view error logs, get troubleshooting guidance)

**Quality and Performance Expectations:**
- 95% training job success rate
- <2 second dashboard load time
- Real-time progress updates (<5 second latency)
- Clear, actionable error messages
- Accurate cost estimates (±15%)

**Error Handling and Edge Cases:**
- Out of memory errors (suggest configuration adjustments)
- Spot instance interruption (automatic checkpoint recovery)
- Webhook delivery failure (retry logic + polling fallback)
- Invalid dataset format (validation before training starts)
- Budget exceeded (prevent job start, show warning)

### 2. Comprehensive Functional Requirements

**Using:** Template at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_tools\3a-preprocess-functional-requirements-prompt_v1.md`

Functional requirements should specify:

**Database Schema:**
- Complete SQL for `training_jobs`, `model_artifacts`, `training_metrics_history` tables
- All columns with types, constraints, defaults, indexes
- Foreign key relationships to existing tables (`training_files`, `auth.users`)
- RLS policies for row-level security
- Migration script with rollback instructions
- **Reference:** See `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (Database Schema section)

**API Endpoint Definitions:**
- `POST /api/training/start-job` - Request/response schemas, validation rules, error codes
- `GET /api/training/jobs` - List training jobs with filtering and pagination
- `GET /api/training/jobs/:id` - Get single job with full metrics history
- `DELETE /api/training/jobs/:id` - Cancel active job or delete completed job
- `POST /api/training/webhook` - Receive RunPod status updates, signature verification
- **Reference:** See `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (API Specifications section)

**Service Layer Specifications:**
- `TrainingService` class methods, interfaces, error handling
- RunPod API client (job creation, status polling, cancellation)
- Webhook signature verification and payload validation
- Cost calculation logic (estimate vs. actual)
- Artifact upload to Supabase Storage
- **Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-service.ts`

**RunPod Container Specifications:**
- Complete Dockerfile with all dependencies
- Training orchestrator workflow (dataset prep, model loading, training, finalization)
- Dataset preprocessor (brightrun-v4 → Llama 3 format converter)
- FastAPI server for job management
- Webhook callback implementation
- **Reference:** See `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` (RunPod Docker Container section)

**UI Component Specifications:**
- Training jobs table component (columns, sorting, filtering, actions)
- Configuration modal (form fields, validation, presets)
- Progress dashboard (real-time updates, metric charts)
- Artifact download interface (format options, storage paths)
- Error display and retry controls
- Budget tracking display

**Performance Requirements:**
- API endpoint response times (<200ms for GET, <5s for POST)
- Database query optimization (indexed columns, efficient joins)
- Real-time update mechanism (WebSocket vs. polling trade-offs)
- Dashboard load time (<2s for 50 jobs)
- Artifact download initiation time (<1s)

**Acceptance Criteria:**
- All training job statuses must be tested (queued → completed, queued → failed, etc.)
- Webhook retry logic must handle 3 consecutive failures
- Cost estimates must be within ±15% of actual costs
- Checkpoint recovery must work on spot interruption
- Dashboard must work on desktop and mobile (responsive)

### 3. FIGMA Wireframe Specifications

Using functional requirements to create detailed wireframes for:

**Main Training Dashboard:**
- Layout: Header + sidebar + main content area
- Training jobs table with all columns and actions
- Status badges with color coding
- Filter controls (status, date range, training file)
- "New Training Job" button prominent in header

**Training Configuration Modal:**
- Multi-step wizard (Select Dataset → Configure Hyperparameters → Review & Start)
- Preset selector with visual cards (Conservative / Balanced / Aggressive)
- Advanced settings accordion (collapsed by default)
- Cost estimator sidebar (updates as configuration changes)
- "Cancel" and "Start Training" buttons

**Progress Monitoring Dashboard:**
- Split view: left = job details, right = live metrics
- Progress bar with percentage and step count
- Stage indicator (visual stepper: Preprocessing → Loading → Training → Finalizing)
- Loss chart (line graph, zoomable, shows last 200 steps)
- Learning rate chart (overlaid with loss)
- Event log (scrollable, color-coded by event type)
- "Cancel Training" button (red, with warning icon)

**Model Download Interface:**
- Modal triggered on job completion
- Summary cards (final loss, duration, cost, adapter size)
- Download format selector (radio buttons: Adapters Only / Full Package / Deployment Package)
- Primary "Download" button (green)
- Secondary actions: "Copy Storage Path", "View Full Metrics", "Start New Job with Same Config"

**Error Display and Retry:**
- Error banner (red background, error icon, error message)
- Expandable stack trace (for debugging)
- Suggested actions (e.g., "Try reducing batch_size to 2")
- "Retry with Suggested Config" button (auto-fills adjusted parameters)
- "Retry with Same Config" button
- "View Similar Issues" link (knowledge base, future enhancement)

### 4. Testing and Validation Plan

**Unit Tests:**
- `TrainingService` methods (mock Supabase, mock RunPod API)
- Webhook signature verification
- Cost calculation logic
- Dataset preprocessor edge cases

**Integration Tests:**
- End-to-end flow: start job → monitor progress → download artifact
- Webhook delivery and database update
- Checkpoint save and resume
- Spot interruption simulation

**User Acceptance Testing:**
- Business owner can start training job without engineering help
- Dashboard clearly shows training progress
- Cost estimates are accurate and understandable
- Error messages are actionable

**Performance Testing:**
- Load 100 training jobs in table (<3 seconds)
- Real-time updates don't cause UI lag
- Concurrent training jobs don't interfere with each other

**Reference Files:**
- Test specifications: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\__tests__\training-service.test.ts` (to be created)
- Test data: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\examples\test-training-job.json` (to be created)

---

## Key Reference Documents

The following documents provide essential context and technical details for implementation:

### Primary Technical Specification

**Deep Specification Document:**
- **File:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md`
- **Purpose:** Complete technical specification with code examples, Docker configurations, API schemas
- **Sections:** Executive summary, dataset assessment, technical architecture, RunPod setup, decision framework
- **Lines:** 2,758 lines of detailed implementation guidance

### Process & Methodology

**LoRA Training Initial Specification:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md`
- **Purpose:** Full technical roadmap with database schemas, API specifications, Docker container design
- **Lines:** 2,139 lines

**LoRA Training Executive Summary:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial-tldr.md`
- **Purpose:** Non-technical business case and ROI analysis
- **Lines:** 616 lines

**Testing Framework Specification:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-5-LoRA-emotional-training-measuring.md`
- **Purpose:** Comprehensive testing methodology for proving dataset effectiveness
- **Lines:** 1,687 lines

**Experimental Design Analysis:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-5-LoRA-emotional-training-measurement-viability_v1.md`
- **Purpose:** Analysis of testing framework and validation of dataset readiness
- **Lines:** 1,083 lines

### Data Structures

**Production Dataset:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\_archive\full-file-training-json-242-conversations.json`
- **Purpose:** 242 conversations, 1,567 training pairs in brightrun-lora-v4 format
- **Size:** 133,539 lines, ~14 MB

**Context Carryover Document:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`
- **Purpose:** Active development focus, implementation status, and next steps
- **Lines:** 778 lines

### Implementation References

**Existing TrainingFileService:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-file-service.ts`
- **Purpose:** Reference implementation for service patterns, Supabase integration, API structure
- **Lines:** 924 lines

**Existing API Routes:**
- **Directory:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\`
- **Purpose:** Reference for API route structure, error handling, authentication patterns

**Database Schema:**
- **Directory:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supabase\migrations\`
- **Purpose:** Existing migration files showing database structure and naming conventions

### Product Context

**Product Overview:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\01-bmo-overview-full-brun-product.md`
- **Purpose:** Overall Bright Run platform vision and architecture

**Seed Narrative Template:**
- **File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_seeds\seed-narrative-v1.md`
- **Purpose:** Reference template for seed narrative structure (source of adapted sections)

### Technical References (External)

**Research Papers:**
- LoRA: [Low-Rank Adaptation of Large Language Models (Hu et al., 2021)](https://arxiv.org/abs/2106.09685)
- QLoRA: [Efficient Fine-tuning of Quantized LLMs (Dettmers et al., 2023)](https://arxiv.org/abs/2305.14314)

**Documentation:**
- [Hugging Face PEFT Documentation](https://huggingface.co/docs/peft)
- [RunPod Documentation](https://docs.runpod.io/)
- [Llama 3 Model Card](https://huggingface.co/meta-llama/Meta-Llama-3-70B-Instruct)

---

## Environment Variables Required

```bash
# RunPod Integration
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_URL=https://api.runpod.io/v2

# Webhook Security
TRAINING_WEBHOOK_SECRET=

# Existing (Reused)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Configuration File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.example`

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

**Document Version:** 4.0  
**Last Updated:** December 14, 2025  
**Status:** Product Seed Narrative (Detailed - Adapted Sections Integrated)  
**Dependencies:** Existing TrainingFileService, Supabase infrastructure  
**Adaptations:** User Interface Requirements, Integration with Existing Modules, Quality Assurance & Success Criteria, Principles & Constraints, Next Steps for Specification Development, and Key Reference Documents adapted from `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_seeds\seed-narrative-v1.md`  
**Note on Reference Files:** The file `detailed-v1-multi-chat-reference_v1.md` referenced in the original request does not exist. All technical detail references point to `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\pmct\iteration-5-LoRA-training-initial.md` instead.
