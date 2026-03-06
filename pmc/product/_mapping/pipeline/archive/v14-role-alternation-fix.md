# Docker v14 - Role Alternation Fix

**Date**: January 4, 2026  
**Version**: v14  
**Status**: ✅ Built and Pushed to Docker Hub  
**Docker Image**: `brighthub/brightrun-trainer:v14`

---

## 🔍 Problem Identified

The v13 error logs showed:
```
Error: After the optional system message, conversation roles must alternate user/assistant/user/assistant/...
```

### Root Cause
TRL 0.16+ `SFTTrainer` validates that conversation messages strictly alternate between `user` and `assistant` roles (with optional leading `system` message). The BrightRun dataset format includes `conversation_history` which could contain consecutive messages with the same role, violating this requirement.

---

## ✅ Solution Implemented

### 1. New Function: `ensure_alternating_roles()`

Added a comprehensive role alternation fixer at **lines 293-347** in `train_lora.py`:

**Key Features:**
- Extracts and preserves system message (if present, must be first)
- Merges consecutive messages with the same role (joins with `\n\n`)
- Ensures strict alternation: user → assistant → user → assistant
- Validates training conversations end with assistant message
- Skips messages that break the pattern

### 2. Applied to Both Format Conversions

**BrightRun Format Conversion** (lines ~264):
```python
# Fix role alternation (TRL 0.16+ requirement)
messages = ensure_alternating_roles(messages)
```

**OpenAI Format Loading** (lines ~210):
```python
# Fix role alternation for OpenAI format too
fixed_messages = ensure_alternating_roles(data['messages'])
```

### 3. Validation Enhanced

Both format paths now verify at least 2 valid messages (user+assistant pair) after role fixing.

---

## 🔧 Technical Details

### Role Alternation Algorithm

```
1. Extract system message (if first message has role='system')
2. For remaining messages:
   - If same role as previous → merge content
   - If different role → add as new message
3. Enforce alternation pattern:
   - Must start with 'user'
   - Must alternate user/assistant
   - Must end with 'assistant'
4. Return: [optional system] + [user, assistant, user, assistant, ...]
```

### Example Fix

**Before (Invalid):**
```json
[
  {"role": "system", "content": "You are helpful"},
  {"role": "user", "content": "Hello"},
  {"role": "user", "content": "Are you there?"},
  {"role": "assistant", "content": "Yes"}
]
```

**After (Valid):**
```json
[
  {"role": "system", "content": "You are helpful"},
  {"role": "user", "content": "Hello\n\nAre you there?"},
  {"role": "assistant", "content": "Yes"}
]
```

---

## 📦 Deployment Steps

### Step 1: Verify Docker Image ✅ COMPLETE
```bash
docker push brighthub/brightrun-trainer:v14
docker push brighthub/brightrun-trainer:latest
```

**Status**: ✅ Both tags pushed successfully  
**Digest**: `sha256:d1abf97d3ce3147613f69e353635cd0f23f24322980cda60a0b8ef77b3cafe59`

### Step 2: Update RunPod Endpoint ⚠️ REQUIRED

1. Go to: https://console.runpod.io/serverless
2. Click endpoint: `ei82ickpenoqlp`
3. Click **Edit Endpoint** or **Edit Template**
4. Find **Container Image** field
5. Change to: `brighthub/brightrun-trainer:v14`
6. Click **Save**
7. Wait 2-5 minutes for workers to update

### Step 3: Test Training Job ⚠️ PENDING

1. Submit a training job from the application
2. Monitor RunPod logs for the job
3. Verify:
   - ✅ No role alternation errors
   - ✅ Training completes successfully
   - ✅ Model artifacts uploaded to S3
   - ✅ Presigned URLs returned

---

## 🎯 Expected Behavior

### Successful Training Flow
```
1. Dataset downloaded ✅
2. BrightRun format converted ✅
3. Role alternation fixed ✅ NEW
4. Model loading ✅
5. LoRA configuration ✅
6. Data formatting (ChatML fallback if needed) ✅
7. SFTTrainer validation ✅ SHOULD PASS NOW
8. Training execution ⏳ TO BE TESTED
9. Model upload to S3 ⏳ TO BE TESTED
10. Presigned URLs returned ⏳ TO BE TESTED
```

### What Changed Since v13

| Version | Issue | Status |
|---------|-------|--------|
| v13 | Role alternation error from SFTTrainer | ❌ Failed |
| v14 | Fixed with `ensure_alternating_roles()` | ✅ Should Work |

---

## 📋 Files Modified

**Single File Change:**
- `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\train_lora.py`
  - Lines 293-347: New `ensure_alternating_roles()` function
  - Line ~210: Applied to OpenAI format
  - Line ~264: Applied to BrightRun format

---

## 🔄 Rollback Plan (If Needed)

If v14 encounters issues:
```bash
# Revert RunPod endpoint to v13
Container Image: brighthub/brightrun-trainer:v13
```

Or build v15 with additional fixes.

---

## 📊 Testing Checklist

- [ ] RunPod endpoint updated to v14
- [ ] Workers refreshed (check status in console)
- [ ] Test job submitted from app
- [ ] No role alternation errors in logs
- [ ] Training completes without errors
- [ ] Model files uploaded to S3
- [ ] Presigned URLs returned in response
- [ ] create-model-artifacts downloads files
- [ ] Model artifacts stored in Supabase

---

## 🚀 Next Steps

1. **Update RunPod Endpoint** → Use v14 image
2. **Submit Test Job** → Verify fix works
3. **Monitor Logs** → Check for any new errors
4. **Document Results** → Update context carryover

---

**Status**: ✅ Code Fixed, Built, and Pushed  
**Awaiting**: RunPod endpoint update + testing

