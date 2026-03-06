# Deferred Pipeline Training Upgrades

**Version:** 1.0  
**Created:** January 11, 2026  
**Status:** Backlog - Deferred Enhancements  
**Context:** Improvements identified during initial pipeline testing session

---

## Overview

This document captures all improvements, fixes, and enhancements identified during the LoRA Training Pipeline implementation and testing phase. These items are not blocking for basic functionality but should be addressed for production readiness.

---

## 🔴 Priority 1: Critical for Production

### 1.1 HuggingFace Token for Gated Models

**Current State:**  
The edge function uses `NousResearch/Llama-2-7b-chat-hf` (non-gated community model) as a workaround because gated models like `meta-llama/Llama-3.1-8B-Instruct` require HuggingFace authentication.

**Problem:**  
Llama 3.1 is significantly better than Llama 2 for instruction-following tasks. Using Llama 2 limits training quality.

**Required Changes:**

1. **Add `HF_TOKEN` to RunPod Endpoint:**
   - Go to RunPod Dashboard → Endpoints → `ei82ickpenoqlp` → Settings
   - Add environment variable: `HF_TOKEN=hf_xxxxxxxxxxxxx`
   - Get token from: https://huggingface.co/settings/tokens

2. **Update Docker Worker** (`brightrun-trainer/train_lora.py`):
   ```python
   # Add token parameter to model loading
   hf_token = os.environ.get('HF_TOKEN')
   
   tokenizer = AutoTokenizer.from_pretrained(
       model_path, 
       trust_remote_code=True,
       token=hf_token
   )
   
   model = AutoModelForCausalLM.from_pretrained(
       model_path,
       quantization_config=quantization_config,
       device_map="auto",
       trust_remote_code=True,
       torch_dtype=torch.float16,
       token=hf_token
   )
   ```

3. **Update Edge Function** (`process-pipeline-jobs/index.ts`):
   ```typescript
   // Change back to Llama 3.1
   const BASE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
   ```

4. **Rebuild Docker Image:**
   ```bash
   cd brightrun-trainer
   docker build -t brighthub/brightrun-trainer:v15 .
   docker push brighthub/brightrun-trainer:v15
   ```

5. **Update RunPod Endpoint** to use v15 image

**Effort:** 2-3 hours  
**Impact:** High - Enables better model quality

---

### 1.2 Database Webhooks for Job Processing

**Current State:**  
Jobs are processed via pg_cron polling every minute. This introduces up to 60-second latency and wastes resources checking for jobs that may not exist.

**Problem:**  
- Latency: Jobs wait up to 60 seconds before processing starts
- Inefficiency: Cron runs even when no jobs are pending
- Scalability: Polling doesn't scale well with multiple concurrent users

**Required Changes:**

1. **Create Database Trigger:**
   ```sql
   -- Function to call edge function on new pending job
   CREATE OR REPLACE FUNCTION notify_new_pipeline_job()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Only trigger on INSERT with status='pending'
     IF NEW.status = 'pending' THEN
       PERFORM net.http_post(
         url := 'https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/process-pipeline-jobs',
         headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
         body := jsonb_build_object('job_id', NEW.id)
       );
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Create trigger
   CREATE TRIGGER on_pipeline_job_created
     AFTER INSERT ON pipeline_training_jobs
     FOR EACH ROW
     EXECUTE FUNCTION notify_new_pipeline_job();
   ```

2. **Update Edge Function** to accept optional `job_id` parameter for single-job processing

3. **Remove or Reduce Cron Frequency:**
   - Keep cron as fallback (every 5 minutes) for missed jobs
   - Primary processing via webhook

**Effort:** 3-4 hours  
**Impact:** High - Near-instant job processing

---

### 1.3 Job Status Webhook Updates

**Current State:**  
The UI polls for job status updates. RunPod job completion doesn't update the database.

**Problem:**  
- Jobs stuck in "initializing" even when RunPod completes/fails
- No automatic status sync between RunPod and database

**Required Changes:**

1. **Add RunPod Webhook Handler** (`/api/pipeline/webhook/runpod`):
   ```typescript
   // Receives RunPod job completion webhooks
   // Updates pipeline_training_jobs status
   // Triggers evaluation if training completed
   ```

2. **Configure RunPod Webhook:**
   - In RunPod endpoint settings, add webhook URL
   - Enable completion notifications

3. **Update Docker Handler** to report final status to Supabase directly

**Effort:** 4-5 hours  
**Impact:** High - Reliable job status tracking

---

## 🟡 Priority 2: Important Improvements

### 2.1 Model Selection in UI

**Current State:**  
Base model is hardcoded in edge function. Users cannot choose which model to fine-tune.

**Required Changes:**

1. Add `base_model` field to `pipeline_training_jobs` table
2. Add model selector dropdown in job creation wizard
3. Provide recommended models with descriptions:
   - `meta-llama/Llama-3.1-8B-Instruct` (Best quality, requires HF auth)
   - `mistralai/Mistral-7B-Instruct-v0.2` (Good quality, open)
   - `NousResearch/Llama-2-7b-chat-hf` (Baseline, open)

**Effort:** 2-3 hours  
**Impact:** Medium - User flexibility

---

### 2.2 Dataset Validation Before Job Creation

**Current State:**  
Jobs can be created with any dataset, even if the dataset file doesn't exist or is malformed.

**Required Changes:**

1. Validate dataset exists and is accessible before job creation
2. Check dataset format compatibility (JSONL structure)
3. Show dataset preview/stats in job creation wizard
4. Prevent job creation with invalid datasets

**Effort:** 2-3 hours  
**Impact:** Medium - Prevents wasted GPU time

---

### 2.3 Signed URL Expiry Handling

**Current State:**  
Dataset signed URLs expire after 1 hour. If GPU takes longer to spin up, download fails.

**Required Changes:**

1. Increase signed URL expiry to 4 hours (14400 seconds)
2. Or: Have Docker worker fetch fresh signed URL from Supabase
3. Or: Use Supabase service role key in Docker for direct storage access

**Effort:** 1-2 hours  
**Impact:** Medium - Prevents download failures

---

### 2.4 Real-time Training Progress

**Current State:**  
Training progress is reported by Docker worker but not synced to UI in real-time.

**Required Changes:**

1. Docker worker → Supabase Realtime channel for progress updates
2. UI subscribes to realtime channel for job
3. Show live loss curves, epoch progress, GPU utilization

**Effort:** 4-5 hours  
**Impact:** Medium - Better user experience

---

### 2.5 Cost Tracking & Billing

**Current State:**  
Estimated cost shown in UI but actual cost not tracked.

**Required Changes:**

1. Track actual GPU runtime from RunPod
2. Update `actual_cost` field on job completion
3. Show cost summary in job details
4. Aggregate user cost history

**Effort:** 3-4 hours  
**Impact:** Medium - Cost visibility

---

## 🟢 Priority 3: Nice-to-Have Enhancements

### 3.1 Job Queue Management

**Features:**
- View queue position
- Cancel pending jobs
- Pause/resume training
- Priority queue for premium users

**Effort:** 5-6 hours

---

### 3.2 Training Configuration Presets

**Features:**
- Save hyperparameter configurations
- Load preset for new jobs
- Share presets between users
- Recommended presets per use case

**Effort:** 3-4 hours

---

### 3.3 A/B Model Comparison

**Features:**
- Run same evaluation on multiple trained models
- Side-by-side comparison UI
- Statistical significance testing
- Automated best-model selection

**Effort:** 6-8 hours

---

### 3.4 Training History & Analytics

**Features:**
- Historical training runs dashboard
- Loss curves comparison across runs
- Training efficiency metrics
- Hyperparameter impact analysis

**Effort:** 4-5 hours

---

### 3.5 Multi-GPU Training Support

**Features:**
- Distributed training across multiple GPUs
- Automatic batch size scaling
- GPU selection in UI
- Cost/time tradeoff calculator

**Effort:** 8-10 hours

---

### 3.6 Model Versioning & Registry

**Features:**
- Version control for trained adapters
- Model registry with metadata
- Rollback to previous versions
- Model comparison tools

**Effort:** 5-6 hours

---

### 3.7 Export & Deployment Options

**Features:**
- Download adapter files
- One-click deploy to inference endpoint
- GGUF/GGML format conversion
- Integration with vLLM/TGI

**Effort:** 6-8 hours

---

## 📋 Implementation Order Recommendation

### Phase 1: Production Readiness (Week 1)
1. ✅ 1.1 - HuggingFace Token (2-3h)
2. ✅ 1.3 - Job Status Webhooks (4-5h)
3. ✅ 2.3 - Signed URL Expiry (1-2h)

### Phase 2: Core Improvements (Week 2)
1. ✅ 1.2 - Database Webhooks (3-4h)
2. ✅ 2.1 - Model Selection UI (2-3h)
3. ✅ 2.2 - Dataset Validation (2-3h)

### Phase 3: Enhanced UX (Week 3)
1. ✅ 2.4 - Real-time Progress (4-5h)
2. ✅ 2.5 - Cost Tracking (3-4h)
3. ✅ 3.2 - Training Presets (3-4h)

### Phase 4: Advanced Features (Future)
- All Priority 3 items based on user feedback

---

## 🔧 Technical Debt

### Items Identified

1. **Cron Job Cleanup:**
   - Multiple old cron jobs exist (IDs 1, 2, 4, 6, 7, 8)
   - Should consolidate to single job ID

2. **Error Message Propagation:**
   - RunPod errors not consistently synced to database
   - Need unified error handling strategy

3. **Duplicate Pipeline Systems:**
   - Legacy system (`training_jobs` table) still exists
   - New pipeline (`pipeline_training_jobs` table) is primary
   - Should plan migration/deprecation of legacy

4. **Edge Function Environment Variables:**
   - Service role key hardcoded in cron job SQL
   - Should use Supabase secrets management

5. **TypeScript Strict Mode:**
   - Some `any` types in pipeline components
   - Should add proper typing

---

## 📝 Notes

- This document should be updated as new issues are discovered
- Priority levels may change based on user feedback
- Effort estimates are rough and should be refined during planning
- Some items may be consolidated or split during implementation

---

## 🔥 Priority 0: Model Compatibility Issues (Discovered Jan 12, 2026)

### Background: Failed Training Attempts

During testing, multiple training jobs failed due to model compatibility issues:

| Job Name | Model Attempted | Error |
|----------|-----------------|-------|
| First Test #2 | `meta-llama/Llama-3.1-8B-Instruct` | HuggingFace authentication required (gated model) |
| First Test #3 | `NousResearch/Llama-2-7b-chat-hf` | `Cannot use chat template functions because tokenizer.chat_template is not set` |
| First Test #4 | `mistralai/Mistral-7B-Instruct-v0.2` | ✅ Working (current production model) |

**Current Workaround:**  
Using `mistralai/Mistral-7B-Instruct-v0.2` as the base model. This model:
- Is fully open (no authentication required)
- Has proper `tokenizer.chat_template` support
- Produces good quality fine-tuned outputs

---

### 0.1 Chat Template Compatibility Issue

**Problem:**  
The Axolotl training framework requires models to have `tokenizer.chat_template` defined. Many older models (especially Llama 2 variants) don't have this set in their tokenizer config.

**Error Message:**
```
Cannot use chat template functions because tokenizer.chat_template is not set 
and no template argument was passed. For information about writing templates 
and setting the tokenizer.chat_template attribute, please see the documentation 
at https://huggingface.co/docs/transformers/main/en/chat_templating
```

**Models Affected:**
- `NousResearch/Llama-2-7b-chat-hf` ❌
- `meta-llama/Llama-2-7b-chat-hf` ❌  
- Most Llama 2 variants ❌

**Models That Work:**
- `mistralai/Mistral-7B-Instruct-v0.2` ✅ (current)
- `meta-llama/Meta-Llama-3-70B-Instruct` ✅ (but gated)
- `meta-llama/Llama-3.1-8B-Instruct` ✅ (but gated)
- Most Llama 3+ models ✅

**Solutions:**

1. **Option A: Stick with Mistral for ungated training**
   - Continue using `mistralai/Mistral-7B-Instruct-v0.2`
   - No code changes required
   - Trade-off: Mistral architecture, not Llama

2. **Option B: Provide explicit chat template in Axolotl config**
   ```yaml
   # axolotl_config.yaml
   chat_template: "llama2"  # or provide explicit Jinja template
   ```
   
   Update `brightrun-trainer/train_lora.py`:
   ```python
   # When model lacks chat_template, inject one
   if tokenizer.chat_template is None:
       tokenizer.chat_template = LLAMA2_CHAT_TEMPLATE
   ```

3. **Option C: Use models with native chat_template support**
   - Llama 3+ family (requires HF auth)
   - Mistral family (open)
   - Qwen family (open)

**Recommended:** Option A for now (Mistral), Option C with HF auth for production

---

### 0.2 Training Mistral to Create Llama-Compatible Adapters

**Question:** Can we train on Mistral and apply the adapter to Llama?

**Answer:** **No.** LoRA adapters are architecture-specific.

**Why This Doesn't Work:**
- LoRA adapters modify specific weight matrices by name
- Mistral uses different layer names than Llama (e.g., `o_proj` vs different attention patterns)
- Adapter dimensions must match base model exactly
- Attempting to load a Mistral adapter on Llama will fail with shape mismatch errors

**Cross-Model Training Strategy:**
If you need a Llama-compatible adapter:
1. You MUST train on a Llama base model
2. Use a Llama model with chat_template (Llama 3+)
3. Configure HuggingFace authentication for gated models

---

### 0.3 Complete Requirements for `meta-llama/Meta-Llama-3-70B-Instruct`

This is the target frontier model referenced in the Emotional Arc specification. Using this model requires significant infrastructure changes.

#### 0.3.1 HuggingFace Authentication (Required)

**Status:** Partially documented in Section 1.1

**Steps:**
1. Create HuggingFace account at https://huggingface.co
2. Accept Llama 3 license at https://huggingface.co/meta-llama/Meta-Llama-3-70B-Instruct
3. Generate access token at https://huggingface.co/settings/tokens
4. Add `HF_TOKEN` environment variable to:
   - RunPod endpoint environment
   - Docker container environment
   - Any local development environment

**Docker Worker Changes:**
```python
# brightrun-trainer/train_lora.py
import os
from huggingface_hub import login

hf_token = os.environ.get('HF_TOKEN')
if hf_token:
    login(token=hf_token)

# All model loading calls need token parameter
tokenizer = AutoTokenizer.from_pretrained(model_path, token=hf_token)
model = AutoModelForCausalLM.from_pretrained(model_path, token=hf_token, ...)
```

#### 0.3.2 GPU Memory Requirements (Critical)

**Meta-Llama-3-70B-Instruct is a 70 billion parameter model.**

| Precision | VRAM Required | Suitable GPUs |
|-----------|---------------|---------------|
| FP16 | ~140GB | 2-4x A100 80GB |
| INT8 | ~70GB | 1x A100 80GB |
| INT4 (QLoRA) | ~35-40GB | 1x A100 40GB or 1x A6000 48GB |

**Current Infrastructure:**
- Edge function requests single GPU: `gpu_config: { type: "A100", count: 1 }`
- Default is 40GB A100, which is NOT sufficient for 70B at FP16

**Required Changes:**

1. **Update GPU Request in Edge Function:**
   ```typescript
   // process-pipeline-jobs/index.ts
   const gpu_config = {
     type: "A100-80GB",  // Must be 80GB variant
     count: 1  // For INT4/QLoRA
     // count: 2  // For INT8
   };
   ```

2. **Enable QLoRA in Training Config (Recommended):**
   ```yaml
   # axolotl_config.yaml for 70B
   load_in_4bit: true
   bnb_4bit_quant_type: nf4
   bnb_4bit_compute_dtype: bfloat16
   ```

3. **Update RunPod Endpoint:**
   - Must support A100-80GB or multi-GPU configurations
   - May need endpoint reconfiguration or new endpoint

#### 0.3.3 Training Time Estimates

| Model Size | GPU Config | Epochs | Est. Time | Est. Cost |
|------------|------------|--------|-----------|-----------|
| 7B (Mistral) | 1x A100 40GB | 3 | 2-4 hours | $4-8 |
| 8B (Llama 3.1) | 1x A100 40GB | 3 | 3-5 hours | $6-10 |
| 70B (Llama 3) | 1x A100 80GB | 3 | 12-24 hours | $36-72 |
| 70B (Llama 3) | 2x A100 80GB | 3 | 6-12 hours | $36-72 |

**Implication:** 70B training will be 6-10x more expensive than 7B training.

#### 0.3.4 Storage Requirements

**Model Download Size:**
- `Meta-Llama-3-70B-Instruct`: ~140GB (FP16 safetensors)
- Download time on fast connection: 15-30 minutes
- Signed URL must remain valid for model download

**Required Changes:**
1. Increase signed URL expiry from 1h to 4h (covers download + training)
2. Consider caching base model on RunPod persistent storage
3. Output adapter size: ~1-5GB (vs ~200MB for 7B)

#### 0.3.5 Axolotl Configuration for 70B

```yaml
# Full axolotl_config.yaml for Meta-Llama-3-70B-Instruct

base_model: meta-llama/Meta-Llama-3-70B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

# Memory optimization (REQUIRED for 70B)
load_in_4bit: true
bnb_4bit_quant_type: nf4
bnb_4bit_use_double_quant: true
bnb_4bit_compute_dtype: bfloat16

# LoRA configuration (adjusted for 70B)
adapter: qlora
lora_r: 32          # Can use higher rank for 70B
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# Training efficiency
gradient_checkpointing: true
gradient_accumulation_steps: 8
micro_batch_size: 1   # May need to reduce for 70B

# Flash Attention (REQUIRED for memory efficiency)
flash_attention: true

# DeepSpeed (optional but recommended for 70B)
deepspeed: deepspeed_configs/zero2.json
```

#### 0.3.6 Application Changes Summary

| Component | Change Required | Priority |
|-----------|-----------------|----------|
| Edge Function | Add `HF_TOKEN` to payload, increase GPU config | High |
| Docker Worker | Add HuggingFace login, token to model loading | High |
| RunPod Endpoint | Add `HF_TOKEN` env var, enable A100-80GB | High |
| Database | Update cost estimates for 70B training | Medium |
| UI | Add model size warnings, extended time estimates | Medium |
| Training Config | Create 70B-specific Axolotl template | High |
| Storage | Increase signed URL expiry to 4h | Medium |

---

### 0.4 Complete Requirements for `meta-llama/Llama-3.1-8B-Instruct` (Recommended Production Model)

This is the recommended production model - it offers the best quality/cost ratio and uses the Llama architecture required for compatibility with frontier models.

#### 0.4.1 Model Overview

| Property | Value |
|----------|-------|
| Model Name | `meta-llama/Llama-3.1-8B-Instruct` |
| Parameters | 8 billion |
| Architecture | LlamaForCausalLM |
| Context Length | 128K tokens |
| License | Llama 3.1 Community License |
| Gated | ✅ Yes (requires HuggingFace auth) |
| Chat Template | ✅ Native support |
| Release Date | July 2024 |

#### 0.4.2 Why Llama 3.1-8B Over Mistral 7B?

| Factor | Mistral 7B | Llama 3.1-8B | Winner |
|--------|------------|--------------|--------|
| Quality | Good | Better | Llama 3.1 |
| Context Length | 32K | 128K | Llama 3.1 |
| Architecture Compatibility | Mistral | Llama (same as 70B) | Llama 3.1 |
| Adapter Portability | Only Mistral models | All Llama 3.x models | Llama 3.1 |
| Auth Required | No | Yes | Mistral |
| Cost | ~$4-8 | ~$6-10 | Mistral |
| Training Time | 2-4 hours | 3-5 hours | Mistral |

**Key Advantage:** Adapters trained on Llama 3.1-8B share architecture with Llama 3.1-70B. While adapters aren't directly transferable, the training data format, chat templates, and tokenizer are identical - making it easier to scale up later.

#### 0.4.3 HuggingFace Authentication Setup

**Step 1: Create HuggingFace Account**
- Go to https://huggingface.co/join
- Complete registration

**Step 2: Accept Llama 3.1 License**
- Navigate to https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct
- Click "Access repository" 
- Read and accept the Llama 3.1 Community License Agreement
- Wait for approval (usually instant, sometimes 1-2 hours)

**Step 3: Generate Access Token**
- Go to https://huggingface.co/settings/tokens
- Click "New token"
- Name: `brightrun-training`
- Type: `Read` (sufficient for model downloads)
- Copy the token (starts with `hf_`)

**Step 4: Configure RunPod Endpoint**
- Go to RunPod Dashboard → Endpoints → `ei82ickpenoqlp`
- Click "Edit Endpoint"
- Under "Environment Variables", add:
  ```
  HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Save changes

#### 0.4.4 Docker Worker Changes

**File:** `brightrun-trainer/train_lora.py`

```python
# Add at top of file
import os
from huggingface_hub import login

# Add before model loading
def setup_huggingface_auth():
    """Authenticate with HuggingFace for gated model access."""
    hf_token = os.environ.get('HF_TOKEN')
    if hf_token:
        login(token=hf_token)
        print("✅ HuggingFace authentication successful")
    else:
        print("⚠️ No HF_TOKEN found - gated models will not be accessible")

# Call early in handler
setup_huggingface_auth()

# Update model loading (if using direct transformers, not Axolotl)
hf_token = os.environ.get('HF_TOKEN')

tokenizer = AutoTokenizer.from_pretrained(
    model_path,
    trust_remote_code=True,
    token=hf_token
)

model = AutoModelForCausalLM.from_pretrained(
    model_path,
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True,
    torch_dtype=torch.float16,
    token=hf_token
)
```

**File:** `brightrun-trainer/requirements.txt`
```
# Ensure huggingface_hub is included
huggingface_hub>=0.20.0
```

#### 0.4.5 Edge Function Changes

**File:** `supabase/functions/process-pipeline-jobs/index.ts`

```typescript
// Update the BASE_MODEL constant
const BASE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

// GPU config remains the same - 8B fits comfortably on A100 40GB
const gpu_config = {
  type: "A100",
  count: 1
};
```

#### 0.4.6 Axolotl Configuration for Llama 3.1-8B

```yaml
# axolotl_config_llama31_8b.yaml

base_model: meta-llama/Llama-3.1-8B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

# Llama 3.1 uses native chat template - no need to specify
# chat_template is automatically detected

# Quantization (QLoRA for memory efficiency)
load_in_4bit: true
bnb_4bit_quant_type: nf4
bnb_4bit_use_double_quant: true
bnb_4bit_compute_dtype: bfloat16

# LoRA configuration
adapter: qlora
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# Dataset configuration
dataset_prepared_path: ./prepared_data
val_set_size: 0.05
sequence_len: 2048  # Can increase up to 8192 for longer conversations

# Training configuration
micro_batch_size: 2
gradient_accumulation_steps: 4
num_epochs: 3
learning_rate: 2e-4
lr_scheduler: cosine
warmup_ratio: 0.03
optimizer: adamw_torch

# Memory optimization
gradient_checkpointing: true
flash_attention: true

# Output
output_dir: ./outputs
logging_steps: 10
save_steps: 100
eval_steps: 100

# Weights & Biases (optional)
# wandb_project: brightrun-lora
# wandb_run_id: ${job_id}
```

#### 0.4.7 GPU & Memory Requirements

| Configuration | VRAM Required | Batch Size | Training Speed |
|---------------|---------------|------------|----------------|
| FP16 (full precision) | ~32GB | 1 | Fastest |
| INT8 | ~16GB | 2 | Fast |
| INT4 (QLoRA) | ~10GB | 4 | Standard |

**Recommended:** INT4/QLoRA on A100 40GB
- Fits comfortably with room for larger batch sizes
- Good balance of speed and memory efficiency
- Same configuration works on A6000 (48GB) or even RTX 4090 (24GB)

#### 0.4.8 Training Time & Cost Estimates

| Dataset Size | Epochs | Est. Time | Est. Cost (A100) |
|--------------|--------|-----------|------------------|
| 50 samples | 3 | 30-45 min | $1-2 |
| 200 samples | 3 | 1-2 hours | $2-4 |
| 500 samples | 3 | 2-4 hours | $4-8 |
| 1000 samples | 3 | 4-6 hours | $8-12 |
| 2500 samples | 3 | 8-12 hours | $16-24 |

**Note:** Times assume `sequence_len: 2048`. Longer sequences (4096, 8192) will increase time proportionally.

#### 0.4.9 Inference with Trained Adapter

After training, the LoRA adapter can be loaded for inference:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Load base model
base_model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    torch_dtype=torch.float16,
    device_map="auto",
    token=os.environ.get('HF_TOKEN')
)

# Load trained adapter
model = PeftModel.from_pretrained(
    base_model,
    "path/to/trained/adapter"
)

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    token=os.environ.get('HF_TOKEN')
)

# Generate response using Llama 3.1 chat format
messages = [
    {"role": "system", "content": "You are a helpful financial advisor."},
    {"role": "user", "content": "What's the difference between HSA and FSA?"}
]

prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

outputs = model.generate(
    **inputs,
    max_new_tokens=512,
    temperature=0.7,
    do_sample=True
)

response = tokenizer.decode(outputs[0], skip_special_tokens=True)
```

#### 0.4.10 Llama 3.1 Chat Template Format

Llama 3.1 uses this chat format (handled automatically by `apply_chat_template`):

```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{system_message}<|eot_id|><|start_header_id|>user<|end_header_id|>

{user_message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{assistant_message}<|eot_id|>
```

**Training Data Format:** Your JSONL training data should use the standard messages format:

```json
{
  "messages": [
    {"role": "system", "content": "You are Elena Morales, a financial planning consultant..."},
    {"role": "user", "content": "I'm confused about retirement accounts..."},
    {"role": "assistant", "content": "I completely understand that confusion..."}
  ]
}
```

Axolotl will automatically apply the Llama 3.1 chat template during training.

#### 0.4.11 Implementation Checklist for Llama 3.1-8B

**Phase 1: HuggingFace Setup (30 min)**
- [ ] Create HuggingFace account
- [ ] Accept Llama 3.1 license agreement
- [ ] Generate read access token
- [ ] Add `HF_TOKEN` to RunPod endpoint environment

**Phase 2: Docker Worker Update (1-2 hours)**
- [ ] Add `huggingface_hub` import
- [ ] Add `login()` call with token
- [ ] Update model/tokenizer loading with `token=` parameter
- [ ] Test locally with small model first
- [ ] Rebuild Docker image as v15
- [ ] Push to Docker Hub

**Phase 3: Edge Function Update (30 min)**
- [ ] Change `BASE_MODEL` to `meta-llama/Llama-3.1-8B-Instruct`
- [ ] Deploy updated edge function
- [ ] Test with new training job

**Phase 4: Validation (1-2 hours)**
- [ ] Create test training job with small dataset
- [ ] Verify model downloads successfully
- [ ] Verify training completes
- [ ] Test inference with trained adapter
- [ ] Compare output quality to Mistral baseline

**Total Estimated Effort:** 3-5 hours

---

### 0.5 Recommended Model Strategy

Based on testing results and infrastructure requirements:

#### For Development/Testing
- **Model:** `mistralai/Mistral-7B-Instruct-v0.2`
- **Why:** Open, fast, cheap, no auth required
- **Cost:** $4-8 per training run

#### For Production (Standard) ⭐ RECOMMENDED
- **Model:** `meta-llama/Llama-3.1-8B-Instruct`
- **Why:** Best quality/cost ratio, Llama architecture, same tokenizer as 70B
- **Requirements:** HF auth only
- **Cost:** $6-10 per training run

#### For Frontier/Research
- **Model:** `meta-llama/Meta-Llama-3-70B-Instruct`
- **Why:** Maximum capability, best for emotional arc training
- **Requirements:** HF auth, A100-80GB GPU, longer training time
- **Cost:** $36-72 per training run

---

### 0.6 Implementation Checklist for Llama 3 70B Support

**Phase 1: Enable HuggingFace Auth (2-3 hours)**
- [ ] Get HF_TOKEN from user/organization
- [ ] Add HF_TOKEN to RunPod endpoint environment
- [ ] Update Docker worker with `huggingface_hub.login()`
- [ ] Test with Llama-3.1-8B first

**Phase 2: Enable 70B Model Support (4-6 hours)**
- [ ] Configure RunPod for A100-80GB GPUs
- [ ] Create 70B-specific Axolotl config template
- [ ] Update edge function GPU config for large models
- [ ] Update signed URL expiry to 4 hours
- [ ] Test with small dataset (5-10 samples)

**Phase 3: UI/UX Updates (3-4 hours)**
- [ ] Add model selector to training wizard
- [ ] Show GPU requirements per model
- [ ] Update cost/time estimates per model
- [ ] Add warnings for 70B resource requirements

**Phase 4: Validation (2-3 hours)**
- [ ] Run full 70B training on test dataset
- [ ] Verify adapter quality
- [ ] Measure actual cost vs estimate
- [ ] Document any issues

**Total Estimated Effort:** 11-16 hours

---

**Last Updated:** January 12, 2026  
**Author:** Development Session - Pipeline Testing Phase

---

## 🔴 Issue 1 Investigation: Status Webhook Not Updating Database

**Investigation Date:** January 12, 2026  
**Status:** Root Cause Identified - Fix Specification Complete

### Problem Statement

Jobs show "initializing" in the app UI even after training completes successfully on RunPod.

**Evidence:**
- Job `8905f705-034d-4873-ab7d-5d81e63f4acb` completed with `status: success` on RunPod
- Database still showed `status: initializing` until manually updated
- RunPod execution time: 138,643ms (~2.3 minutes)

### Root Cause Analysis

After examining the code flow, **THREE critical gaps** were identified:

#### Gap 1: Edge Function Missing `callback_url` in Payload

**File:** `supabase/functions/process-pipeline-jobs/index.ts`

The Edge Function sends jobs to RunPod but does NOT include a `callback_url`:

```typescript
// Lines 93-124 - Current payload structure
body: JSON.stringify({
  input: {
    job_id: job.id,
    dataset_url: datasetUrl,
    hyperparameters: { ... },
    gpu_config: { ... },
    // ❌ MISSING: callback_url
  },
}),
```

**Compare to legacy Edge Function** (`process-training-jobs/index.ts`):
```typescript
// Line 112 - Legacy includes callback_url
callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/training-callback`,
```

#### Gap 2: Docker Worker Never Calls Webhook

**File:** `brightrun-trainer/train_lora.py`

The function signature accepts `callback_url` but never uses it:

```python
# Line 410 - Accepts parameter
def train_lora_model(
    job_id: str,
    dataset_url: str,
    hyperparameters: Dict[str, Any],
    gpu_config: Dict[str, Any],
    callback_url: Optional[str],  # ← Received but never used!
    status_manager
) -> Dict[str, Any]:
```

- No HTTP calls are made to `callback_url` anywhere in the file
- Status updates only go to in-memory `status_manager`
- The `status_manager` has no network capabilities

#### Gap 3: StatusManager is In-Memory Only

**File:** `brightrun-trainer/status_manager.py`

```python
class StatusManager:
    """
    Manages job status in memory.
    
    This is a simple in-memory store for per-worker job state.
    RunPod serverless workers are ephemeral, so this state only
    exists for the duration of a single job execution.
    """
```

The `StatusManager` class:
- Stores status in a local dictionary (`self._status_store`)
- Never makes any HTTP calls
- Data is lost when the RunPod container terminates

### Solution Recommendation

#### Recommended Approach: Direct Supabase Updates from Docker Worker

**Why this approach:**
1. Most reliable - direct database connection
2. Real-time updates (not just completion)
3. Matches the existing Supabase integration pattern for file uploads
4. No additional Edge Function required

#### Implementation Plan

**Phase 1: Add Supabase Status Updates to Docker Worker (2-3 hours)**

**File:** `brightrun-trainer/train_lora.py`

Add a new function to update job status directly in Supabase:

```python
def update_job_status_in_db(
    job_id: str,
    status: str,
    progress: Optional[float] = None,
    current_epoch: Optional[int] = None,
    current_step: Optional[int] = None,
    error_message: Optional[str] = None,
    final_loss: Optional[float] = None,
    training_time_seconds: Optional[int] = None
) -> bool:
    """Update job status directly in Supabase database."""
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.warning("Supabase credentials not found - status update skipped")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if progress is not None:
            update_data['progress'] = progress
        if current_epoch is not None:
            update_data['current_epoch'] = current_epoch
        if current_step is not None:
            update_data['current_step'] = current_step
        if error_message is not None:
            update_data['error_message'] = error_message
        if final_loss is not None:
            update_data['final_loss'] = final_loss
        if training_time_seconds is not None:
            update_data['training_time_seconds'] = training_time_seconds
        if status == 'completed':
            update_data['completed_at'] = datetime.utcnow().isoformat()
        if status == 'running' and progress and progress < 30:
            update_data['started_at'] = datetime.utcnow().isoformat()
        
        supabase.table('pipeline_training_jobs').update(update_data).eq('id', job_id).execute()
        logger.info(f"Updated job {job_id[:8]} status to {status}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to update job status in DB: {e}")
        return False
```

**Integration Points in `train_lora.py`:**

| Location | Status | Progress | Notes |
|----------|--------|----------|-------|
| After dataset download | `running` | 10% | Stage: downloading |
| After model loading | `running` | 20% | Stage: loading_model |
| During training (callback) | `running` | 25-95% | Updated every 10 steps |
| After adapter save | `running` | 95% | Stage: saving |
| After upload complete | `completed` | 100% | Include final_loss, training_time |
| On error | `failed` | - | Include error_message |

**Phase 2: Modify ProgressCallback to Update Database (1 hour)**

Update the `ProgressCallback` class to also call `update_job_status_in_db`:

```python
class ProgressCallback(TrainerCallback):
    def __init__(self, status_manager, job_id: str, total_steps: int):
        self.status_manager = status_manager
        self.job_id = job_id
        self.total_steps = total_steps
        self.start_time = time.time()
        self.last_db_update = 0  # Throttle DB updates
        
    def on_step_end(self, args, state, control, **kwargs):
        # ... existing status_manager code ...
        
        # Update database every 30 seconds to avoid excessive writes
        current_time = time.time()
        if current_time - self.last_db_update >= 30:
            update_job_status_in_db(
                job_id=self.job_id,
                status='running',
                progress=progress,
                current_epoch=current_epoch,
                current_step=current_step
            )
            self.last_db_update = current_time
```

**Phase 3: Ensure RunPod Environment Has Supabase Credentials (30 min)**

Verify these environment variables are set in RunPod endpoint:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If not, add them via RunPod Dashboard → Endpoints → Settings → Environment Variables.

**Phase 4: Rebuild and Deploy Docker Image (1 hour)**

```bash
cd brightrun-trainer
docker build -t brighthub/brightrun-trainer:v19 .
docker push brighthub/brightrun-trainer:v19
# Update RunPod endpoint to use v19
# Scale workers to 0, then back to 2
```

### Alternative Approach: Add `callback_url` Support

If direct Supabase access is not preferred, implement callback URL approach:

1. Add `callback_url` to Edge Function payload
2. Create `training-callback` Edge Function to receive updates
3. Implement HTTP POST calls in Docker worker to send status

**Pros:** Decoupled architecture
**Cons:** More complex, additional Edge Function, network latency

### Verification Plan

1. Create a new test training job
2. Monitor `pipeline_training_jobs` table for status updates during training
3. Verify status transitions: `pending` → `queued` → `initializing` → `running` → `completed`
4. Confirm progress percentage updates in real-time
5. Verify final metrics (final_loss, training_time_seconds) are populated

### Implementation Checklist

- [ ] Add `update_job_status_in_db` function to `train_lora.py`
- [ ] Integrate status updates at key training stages
- [ ] Modify `ProgressCallback` to update database
- [ ] Verify Supabase credentials in RunPod environment
- [ ] Rebuild Docker image as v19
- [ ] Push to Docker Hub
- [ ] Update RunPod endpoint to use v19
- [ ] Test with new training job
- [ ] Verify database updates during training
- [ ] Document changes

**Total Estimated Effort:** 4-5 hours
