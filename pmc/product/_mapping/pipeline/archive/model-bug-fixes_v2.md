# Senior LoRA Training Engineer Analysis v2

**Date**: January 2, 2026  
**Engineer**: Senior LoRA Training Analysis  
**Status**: Critical issues identified requiring immediate fixes

---

## Positive Observations

✅ **Dataset download is now working**: `0.2MB` downloaded successfully  
✅ **Handler validation passes**: All hyperparameters correctly validated  
✅ **Job metadata correct**: Job ID, GPU config, epochs, learning rate all correct

---

## Critical Issues Identified

### Issue #1: Dataset Format Mismatch (CRITICAL)

**Symptom**:
```
Line 1: Missing 'messages' field
Line 2: Missing 'messages' field
...
Line 15: Missing 'messages' field
Loaded 0 conversations
```

**Root Cause**: 
The `train_lora.py` script expects **OpenAI Chat Completion format**:
```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

But BrightRun produces **BrightRun LoRA v4 format**:
```jsonl
{"_meta": {"file_name": "...", "version": "brightrun-lora-v4"}}
{"id": "...", "system_prompt": "...", "current_user_input": "...", "target_response": "...", "conversation_history": [...]}
```

**Why this matters**:
- 15 training pairs exist in the dataset (15 lines failing)
- Zero are being loaded because format doesn't match
- Training cannot proceed without fixing this

---

### Issue #2: Wrong Base Model (MODERATE)

**Symptom**:
```
Base Model: mistralai/Mistral-7B-v0.1
```

**Root Cause**: 
The Edge Function `process-training-jobs/index.ts` **hardcodes** the base model at line 108:
```typescript
hyperparameters: {
  ...job.hyperparameters,
  base_model: 'mistralai/Mistral-7B-v0.1',  // ← HARDCODED
},
```

**Expected**: 
According to `deployment-secrets.md`, the cached model is:
```
Cached Model: Qwen3-Next-80B-A3B-Instruct (84GB)
Model Path: /workspace/models/Qwen3-Next-80B-A3B-Instruct
```

**Impact**:
- Even if dataset format is fixed, training will attempt to use Mistral-7B
- Mistral-7B is NOT cached on the network volume
- Would require downloading 14GB+ model on each job start
- Or worse: fail to find the model entirely

---

## Required Fixes

### Fix #1: Update train_lora.py Dataset Loading

**File**: `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\train_lora.py`

**Location**: ~lines 175-200 (dataset loading function)

**Replace** the dataset loading logic to handle both formats:

```python
def load_dataset(self, dataset_path: str) -> List[Dict]:
    """Load dataset supporting both OpenAI and BrightRun formats."""
    conversations = []
    line_num = 0
    
    with open(dataset_path, 'r', encoding='utf-8') as f:
        for line in f:
            line_num += 1
            line = line.strip()
            if not line:
                continue
                
            try:
                data = json.loads(line)
                
                # Skip metadata line
                if '_meta' in data:
                    logger.info(f"Line {line_num}: Skipping metadata header")
                    continue
                
                # OpenAI Chat format (standard)
                if 'messages' in data:
                    conversations.append(data)
                    continue
                
                # BrightRun format - convert to OpenAI format
                if 'target_response' in data and 'current_user_input' in data:
                    messages = []
                    
                    # Add system prompt if present
                    if data.get('system_prompt'):
                        messages.append({
                            "role": "system", 
                            "content": data['system_prompt']
                        })
                    
                    # Add conversation history (previous turns)
                    for msg in data.get('conversation_history', []):
                        messages.append({
                            "role": msg.get('role', 'user'),
                            "content": msg.get('content', '')
                        })
                    
                    # Add current exchange
                    messages.append({
                        "role": "user",
                        "content": data['current_user_input']
                    })
                    messages.append({
                        "role": "assistant", 
                        "content": data['target_response']
                    })
                    
                    conversations.append({"messages": messages})
                    continue
                
                # Unknown format
                logger.warning(f"Line {line_num}: Unknown format - skipping")
                
            except json.JSONDecodeError as e:
                logger.warning(f"Line {line_num}: Invalid JSON - {e}")
    
    logger.info(f"Loaded {len(conversations)} conversations from dataset")
    return conversations
```

---

### Fix #2: Update Edge Function Base Model

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\supabase\functions\process-training-jobs\index.ts`

**Location**: Line 108

**Current**:
```typescript
base_model: 'mistralai/Mistral-7B-v0.1',
```

**Options**:

**Option A**: Use cached Qwen model (if it matches training architecture):
```typescript
base_model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
```

**Option B**: Use user-selected base model from hyperparameters:
```typescript
base_model: job.hyperparameters.base_model || 'mistralai/Mistral-7B-v0.1',
```

**Option C**: Use environment variable for flexibility:
```typescript
base_model: Deno.env.get('DEFAULT_BASE_MODEL') || 'mistralai/Mistral-7B-v0.1',
```

**Recommendation**: 
For a production LoRA training pipeline, **Option B** is best. Allow users to select their base model during job configuration, with sensible defaults.

However, if all training is intended for Qwen, use **Option A** with the correct HuggingFace model identifier.

---

## Model Compatibility Warning

**Important consideration**: The cached model is `Qwen3-Next-80B-A3B-Instruct` at 84GB.

This is an **80B parameter model**. LoRA training on 80B requires:
- Minimum 80GB VRAM (A100-80GB adequate)
- QLoRA (4-bit quantization) to fit in memory
- Significant training time per epoch

**Verify the train_lora.py supports**:
- 4-bit quantization via bitsandbytes
- Flash attention for memory efficiency
- Gradient checkpointing

If training smaller datasets or need faster iteration, consider:
- Qwen2.5-7B-Instruct (7GB, fits in 24GB VRAM)
- Mistral-7B-Instruct-v0.3 (14GB, fits in 24GB VRAM)

---

## Deployment Steps

### Step 1: Fix train_lora.py (Dataset Format)
```bash
# Edit train_lora.py in brightrun-trainer directory
# Add BrightRun format handling as shown above
```

### Step 2: Rebuild Docker Image
```bash
cd C:\Users\james\Master\BrightHub\BRun\brightrun-trainer
docker build -t brighthub/brightrun-trainer:v5 .
docker push brighthub/brightrun-trainer:v5
```

### Step 3: Update RunPod Endpoint
1. Go to https://console.runpod.io/serverless
2. Click endpoint → Edit
3. Change Container Image to `:v5`
4. Save

### Step 4: Fix Edge Function (Base Model)
```bash
# Edit process-training-jobs/index.ts line 108
# Then redeploy:
cd C:\Users\james\Master\BrightHub\BRun\v4-show
supabase functions deploy process-training-jobs
```

### Step 5: Test
1. Submit new training job
2. Monitor worker logs
3. Should see: `Loaded N conversations from dataset`
4. Training should proceed to model loading step

---

## Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| Dataset format mismatch | **CRITICAL** - blocks all training | Medium | **#1** |
| Wrong base model | Moderate - uses wrong model | Low | **#2** |
| 80B model VRAM check | Low - may work on A100 | N/A | **#3** |

---

## Summary

1. **Dataset download is working** (0.2MB confirms data transfer)
2. **Format conversion needed** in train_lora.py
3. **Base model is wrong** - hardcoded as Mistral instead of Qwen
4. **Fix order**: Dataset format first, then base model, then test
