# Training Dataset Format Mismatch Analysis

**Date**: January 2, 2026  
**Issue**: Training job fails with "Missing 'messages' field"

---

## Error Summary

```
train_lora.py:192  Line 1: Missing 'messages' field
train_lora.py:192  Line 2: Missing 'messages' field
...
train_lora.py:196  Loaded 0 conversations
train_lora.py:199  No valid conversations found in dataset
```

Additional concern:
- `Dataset downloaded successfully: 0.0MB` - File may be empty or download failed

---

## Root Cause Analysis

### Problem 1: Dataset Format Mismatch

**train_lora.py expects** (OpenAI Chat Format):
```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

**BrightRun app produces** (BrightRun LoRA v4 Format):
```jsonl
{"_meta": {"file_name": "...", "total_pairs": 18, "version": "brightrun-lora-v4"}}
{"id": "...", "conversation_id": "...", "turn_number": 1, "system_prompt": "...", "conversation_history": [...], "current_user_input": "...", "target_response": "...", "training_metadata": {...}}
```

### Problem 2: Possible Signed URL Expiration

The log shows `0.0MB` downloaded. This could mean:
1. Signed URL expired (24 hour expiry)
2. Storage path incorrect
3. File doesn't exist in bucket

---

## Required Fixes

### Fix 1: Update train_lora.py to Accept BrightRun Format

**Location**: `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\train_lora.py`

**Current code** (~line 180-200):
```python
# Expects 'messages' field
for line in f:
    data = json.loads(line)
    if 'messages' not in data:
        logger.warning(f"Line {line_num}: Missing 'messages' field")
        continue
    conversations.append(data)
```

**Updated code**:
```python
# Accept both OpenAI format ('messages') and BrightRun format ('training_pairs'/'target_response')
for line in f:
    data = json.loads(line)
    
    # Skip metadata line
    if '_meta' in data:
        continue
    
    # OpenAI format
    if 'messages' in data:
        conversations.append(data)
    # BrightRun format - convert to messages
    elif 'target_response' in data and 'current_user_input' in data:
        messages = []
        
        # Add system prompt if present
        if data.get('system_prompt'):
            messages.append({"role": "system", "content": data['system_prompt']})
        
        # Add conversation history
        for msg in data.get('conversation_history', []):
            messages.append({"role": msg['role'], "content": msg['content']})
        
        # Add current exchange
        messages.append({"role": "user", "content": data['current_user_input']})
        messages.append({"role": "assistant", "content": data['target_response']})
        
        conversations.append({"messages": messages})
    else:
        logger.warning(f"Line {line_num}: Unsupported format - missing 'messages' or 'target_response'")
        continue
```

### Fix 2: Alternative - Convert Dataset in Edge Function

**Location**: `supabase/functions/process-training-jobs/index.ts`

Add a conversion step before submitting to RunPod:
1. Download the dataset
2. Convert BrightRun format → OpenAI format
3. Re-upload as temporary file
4. Send new URL to RunPod

**Pros**: No Docker rebuild needed
**Cons**: More complex, adds latency

### Fix 3: Debug Signed URL / Download Issue

**Check 1**: Verify the signed URL is valid:
```bash
# Get signed URL from logs and try to download
curl -o test.jsonl "<signed-url-from-logs>"
```

**Check 2**: Verify dataset exists in Supabase Storage:
1. Go to https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku
2. Click **Storage** → `lora-datasets` bucket
3. Verify file exists at expected path

**Check 3**: Check Edge Function logs for signed URL generation:
```bash
supabase functions logs process-training-jobs --tail 50
```

---

## Recommended Solution Path

### Option A: Quick Fix (Recommended)

Update `train_lora.py` to accept BrightRun format (Fix 1):

1. Edit `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\train_lora.py`
2. Replace the dataset loading function to handle both formats
3. Rebuild Docker image: `docker build -t brighthub/brightrun-trainer:v4 .`
4. Push: `docker push brighthub/brightrun-trainer:v4`
5. Update RunPod endpoint to use `:v4`

### Option B: Full Pipeline Fix

1. Create a standard dataset export format in the app
2. Add conversion service in Next.js API
3. Ensure all datasets are in OpenAI format before upload

---

## BrightRun JSONL Format Reference

Each line (after metadata) contains:

| Field | Description |
|-------|-------------|
| `id` | Unique training pair ID |
| `conversation_id` | Parent conversation UUID |
| `turn_number` | Turn position in conversation |
| `system_prompt` | System instruction for AI |
| `conversation_history` | Array of `{role, content}` objects |
| `current_user_input` | User's message for this turn |
| `target_response` | AI's expected response (training target) |
| `emotional_context` | Emotional state metadata |
| `training_metadata` | Quality scores, tags, etc. |

---

## Test After Fix

1. Deploy updated Docker image
2. Submit new training job
3. Check worker logs for:
   - `Dataset downloaded successfully: X.XMB` (should be > 0)
   - `Loaded N conversations` (should be > 0)
4. Monitor training progress

---

## Files to Modify

| File | Action |
|------|--------|
| `brightrun-trainer/train_lora.py` | Update dataset loading to handle BrightRun format |
| (Optional) `supabase/functions/process-training-jobs/index.ts` | Add format conversion |

---

## Priority

1. **HIGH**: Fix train_lora.py dataset format handling
2. **MEDIUM**: Debug 0.0MB download issue
3. **LOW**: Consider long-term format standardization
