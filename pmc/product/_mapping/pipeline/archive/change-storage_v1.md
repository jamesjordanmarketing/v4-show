# Storage Configuration Update Checklist

**New Storage Details:**
- **Bucket Name**: `4jw1fcocwl`
- **Endpoint URL**: `https://s3api-eu-ro-1.runpod.io`
- **Datacenter**: `EU-RO-1`

---

## ✅ Already Updated

1. **RunPod Serverless Endpoint** (`ei82ickpenoqlp`)
   - Network volume attached
   - Status: COMPLETE

---

## 🔴 CRITICAL - Must Update Now

### 1. RunPod Serverless Endpoint - Environment Variables

**Location**: https://console.runpod.io/serverless → endpoint `ei82ickpenoqlp` → Edit → Environment Variables

**Update these variables:**
```
S3_ENDPOINT_URL=https://s3api-eu-ro-1.runpod.io
NETWORK_VOLUME_ID=4jw1fcocwl
```

**Keep these unchanged:**
```
S3_ACCESS_KEY_ID=<same key from Step 3>
S3_SECRET_ACCESS_KEY=<same secret from Step 3>
```

### 2. Docker Worker Handler Code

**File**: `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\handler.py`

**Search for**: `s3_client = boto3.client`

**Verify environment variables are used** (should automatically pick up from RunPod):
```python
endpoint_url=os.environ.get('S3_ENDPOINT_URL')
# Should now be: https://s3api-eu-ro-1.runpod.io
```

**No code changes needed** - environment variables handle this.

### 3. Deployment Secrets Documentation

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\.secrets\deployment-secrets.md`

**Update lines 24-28:**

**OLD:**
```markdown
- **Network Volume**: `qwen-model-cache` (240GB, US-CA-2 region)
```

**NEW:**
```markdown
- **Network Volume**: Volume ID `4jw1fcocwl` (240GB, EU-RO-1 region)
- **S3 Endpoint**: `https://s3api-eu-ro-1.runpod.io`
- **S3 Bucket Name**: `4jw1fcocwl`
```

---

## 🟡 MEDIUM PRIORITY - Update for Documentation Accuracy

### 4. Context Carryover Document

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`

**Update lines 152-157:**

**OLD:**
```markdown
**Network Storage**: 240GB in US-IL-1 datacenter  
**Mount Path**: `/runpod-volume` (accessible to all workers)
```

**NEW:**
```markdown
**Network Storage**: 240GB in EU-RO-1 datacenter (Volume ID: 4jw1fcocwl)
**S3 Endpoint**: https://s3api-eu-ro-1.runpod.io
**Mount Path**: `/runpod-volume` (accessible to all workers)
```

### 5. Docker Deployment Instructions

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\docker-urls-and-edge-changes_v1.md`

**Update Step 4 - lines 39-48:**

**OLD:**
```markdown
S3_ENDPOINT_URL=https://s3api-us-il-1.runpod.io
```

**NEW:**
```markdown
S3_ENDPOINT_URL=https://s3api-eu-ro-1.runpod.io
NETWORK_VOLUME_ID=4jw1fcocwl
```

### 6. RunPod Configuration Documentation

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-post-build-section-X01-runpod-connect_v1.md`

**Update lines 10-16:**

**OLD:**
```markdown
| Network Storage | **US-IL-1** | 240GB created |
```

**NEW:**
```markdown
| Network Storage | **EU-RO-1** | 240GB created (Volume: 4jw1fcocwl, S3 enabled) |
```

---

## 🟢 LOW PRIORITY - No Changes Needed

### 7. Edge Functions
**Files**: 
- `supabase/functions/process-training-jobs/index.ts`
- `supabase/functions/create-model-artifacts/index.ts`

**Status**: No changes needed - these use RunPod API, not direct S3 access

### 8. Next.js Application
**File**: `.env.local`

**Status**: No changes needed - app doesn't directly access RunPod storage

---

## ⚡ Quick Update Commands

### Update Deployment Secrets
```bash
# Open in editor
code C:\Users\james\Master\BrightHub\BRun\v4-show\.secrets\deployment-secrets.md
```

### Update Context Document
```bash
# Open in editor
code C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md
```

### Update Instructions
```bash
# Open in editor
code C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\docker-urls-and-edge-changes_v1.md
```

---

## Verification Steps

After making updates:

1. **Check RunPod Environment Variables**:
   - Go to https://console.runpod.io/serverless
   - Click endpoint → Settings → Environment Variables
   - Verify `S3_ENDPOINT_URL=https://s3api-eu-ro-1.runpod.io`
   - Verify `NETWORK_VOLUME_ID=4jw1fcocwl`

2. **Test S3 Access** (after Docker image rebuilt):
   - Submit test training job
   - Check RunPod logs for S3 upload attempts
   - Should see successful uploads to `4jw1fcocwl` bucket

3. **Verify Worker Access**:
   - Go to https://console.runpod.io/serverless
   - Click endpoint → Workers
   - Check workers are running in EU-RO-1 datacenter
   - Check workers can access `/runpod-volume`

---

## Summary

**Must Update Now (Before Docker Build):**
1. RunPod endpoint environment variables
2. Deployment secrets file

**Should Update Soon (Documentation):**
3. Context carryover document
4. Docker instructions file
5. RunPod configuration docs

**No Action Needed:**
6. Edge Functions
7. Next.js app
