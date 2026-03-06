# Model Storage Decision: Network Volume vs Runtime Download

**Date**: January 2, 2026  
**Purpose**: Help decide between caching Qwen on network storage vs using Mistral for testing

---

## Your Specific Situation

1. **Goal now**: Test pipeline end-to-end
2. **Goal soon**: Run ACTUAL training on production datasets
3. **Final deployment**: Apply LoRA adapters to Qwen on your local drive
4. **Question**: Does training model matter for adapter quality?

---

## Critical Answer: YES, Training Model Matters

> **LoRA adapters are model-specific. An adapter trained on Mistral-7B CANNOT be used on Qwen-80B.**

**Why?**
- LoRA modifies specific weight matrices inside the model
- Different models have different architectures, layer counts, hidden dimensions
- Mistral-7B has 32 layers, 4096 hidden dim
- Qwen-80B has 80 layers, 8192 hidden dim
- The adapter weights simply won't match

**Bottom line**: If you want to use adapters on Qwen, you MUST train on Qwen.

---

## Comparison: Network Storage vs Runtime Download

### Option A: Qwen on Network Storage

| Aspect | Details |
|--------|---------|
| **Setup time** | ~2-4 hours to download 84GB to network volume |
| **Training startup** | ~5-10 minutes (load from local SSD) |
| **Cost per job** | Lower (no download time billed) |
| **Storage cost** | ~$15-30/month for 240GB volume |
| **Model flexibility** | Must pre-download any model you want to use |

**Pros:**
- Fast training startup (model already cached)
- Consistent performance across jobs
- No internet dependency during training
- Cost-effective for repeated training runs

**Cons:**
- Initial setup time to download model
- Locked to specific datacenter (EU-RO-1)
- Must manage storage space
- Changing models requires downloading new ones

---

### Option B: Mistral-7B Downloaded at Runtime

| Aspect | Details |
|--------|---------|  
| **Setup time** | Zero |
| **Training startup** | ~10-15 minutes (download 14GB + load) |
| **Cost per job** | Higher (download time billed) |
| **Storage cost** | $0 (no network volume needed for model) |
| **Model flexibility** | Can switch models by changing config |

**Pros:**
- Quick to start testing (no setup)
- No storage management
- Easy to switch between models
- Good for initial pipeline validation

**Cons:**
- ⚠️ **Adapters won't work on Qwen**
- Re-downloads model every cold start
- Higher per-job cost
- Internet dependency

---

## Recommendation for Your Workflow

### Phase 1: Pipeline Testing (NOW)

**Use Mistral-7B temporarily** to validate:
- Edge Functions work correctly
- Job submission/polling works
- Dataset loading works ✅ (already confirmed!)
- Model loading works
- Training loop executes
- Adapter saving works
- S3 upload works
- Artifact creation works

**Why**: Fast iteration, no setup, just testing the plumbing.

**Important**: These test adapters are throwaway - can't use on Qwen.

---

### Phase 2: Production Training (SOON)

**Cache Qwen on network storage** for real training:

1. Download Qwen to network volume (one-time ~2-4hr)
2. Configure `MODEL_PATH` environment variable
3. Train on real datasets
4. Adapters will be compatible with your local Qwen

**Why**: 
- Training on Qwen = adapters work on Qwen
- Cached model = faster, cheaper training
- Production quality results

---

## Implementation Steps

### For Phase 1 (Testing with Mistral)

**1. Update Edge Function** (already done, just change default):

```typescript
// process-training-jobs/index.ts line 108
base_model: job.hyperparameters.base_model || 'mistralai/Mistral-7B-v0.1',
```

**2. Update train_lora.py** to download from HuggingFace:

```python
# Add fallback to download if local not found
model_path = hyperparameters.get('base_model', 'mistralai/Mistral-7B-v0.1')
logger.info(f"Loading model from HuggingFace: {model_path}")
```

**3. Deploy and test** - model downloads automatically.

---

### For Phase 2 (Production with Qwen)

**1. Download Qwen to network volume** (via SSH to worker or one-time job):

```python
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="Qwen/Qwen3-Next-80B-A3B-Instruct",
    local_dir="/runpod-volume/models/Qwen3-Next-80B-A3B-Instruct",
    local_dir_use_symlinks=False
)
```

**2. Set environment variable** in RunPod:
```
MODEL_PATH=/runpod-volume/models/Qwen3-Next-80B-A3B-Instruct
```

**3. Update Edge Function** to default to Qwen:
```typescript
base_model: job.hyperparameters.base_model || 'Qwen/Qwen3-Next-80B-A3B-Instruct',
```

---

## Cost Comparison (Per Training Job)

| Scenario | Time | Cost @ $1.99/hr |
|----------|------|-----------------|
| **Mistral runtime download** | +15 min download | +$0.50 |
| **Mistral cached on volume** | +5 min load | +$0.16 |
| **Qwen runtime download** | +60 min (84GB) | +$2.00 |
| **Qwen cached on volume** | +10 min load | +$0.33 |

**For 10 training jobs:**
- Mistral runtime: ~$5 extra download time
- Qwen runtime: ~$20 extra download time
- Cached model: ~$3 total

**Verdict**: Caching is always more cost-effective for repeated training.

---

## About Your Local Qwen Setup

You mentioned having Qwen on another drive. For deployment:

1. **Train on RunPod** with Qwen (adapters saved to Supabase/S3)
2. **Download adapter files** from your app
3. **Apply adapter to local Qwen** using PEFT:

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM

# Load your local base model
base_model = AutoModelForCausalLM.from_pretrained("/your/local/qwen/path")

# Apply LoRA adapter
model = PeftModel.from_pretrained(base_model, "/path/to/downloaded/adapter")

# Now use for inference
```

As long as both use the **exact same Qwen model version**, the adapter will work.

---

## My Recommendation

```
TODAY: Use Mistral-7B for pipeline testing
   ↓
ONCE PIPELINE WORKS: Download Qwen to network volume
   ↓
PRODUCTION: Train on Qwen, download adapters, use on local Qwen
```

This approach:
- Gets you testing immediately (no setup wait)
- Validates the entire pipeline works
- Then invests time in proper Qwen setup
- Ensures production adapters are compatible with your target model

---

## Summary Table

| Phase | Model | Where | Purpose |
|-------|-------|-------|---------|
| Testing | Mistral-7B | Runtime download | Validate pipeline |
| Production | Qwen-80B | Network volume | Real training |
| Deployment | Your Qwen | Local drive | Apply adapters |
