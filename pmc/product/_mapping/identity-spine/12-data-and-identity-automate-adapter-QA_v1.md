# 12 — Adapter Auto-Deployment: Investigation & Root Cause Analysis

**Date:** 2026-02-24  
**Scope:** Full post-mortem of the first real training-to-deploy pipeline run  
**Job ID:** `f56bb46f-7e7c-4409-a22c-801f82d00941`  
**User ID:** `8d26cc10-a3c1-4927-8708-667d37a3348b`  
**Adapter File:** `lora-models/adapters/f56bb46f-7e7c-4409-a22c-801f82d00941.tar.gz` (66,460,906 bytes / ~63 MB)

---

## 1. Executive Summary

The first real training job completed successfully, producing a valid 63 MB adapter artifact. However, the subsequent automated deployment (Inngest function `auto-deploy-adapter`) **failed** before it could push the adapter to HuggingFace or update the RunPod inference endpoint.

**Two independent root causes were found:**

| # | Root Cause | Severity | Effect |
|---|-----------|----------|--------|
| 1 | **Inngest `output_too_large` error** — Step 2 returns a 66 MB file as base64 (~88 MB), exceeding Inngest's 4 MB step output limit | **BLOCKING** | Function crashes before reaching Step 3 (HuggingFace upload) |
| 2 | **Wrong RunPod endpoint ID** — `RUNPOD_INFERENCE_ENDPOINT_ID` is set to `ei82ickpenoqlp` (the *trainer*), not `780tauhj7c126b` (the *inference* endpoint) | **BLOCKING** | Even if #1 were fixed, Step 4 would update LORA_MODULES on the wrong endpoint |

Both must be fixed before the pipeline will work end-to-end.

---

## 2. Endpoint Map — Who Is Who

| Endpoint ID | RunPod Name | Role | Currently Has |
|-------------|-------------|------|---------------|
| `ei82ickpenoqlp` | `brightrun-lora-trainer-qwen` | **TRAINING** — runs LoRA fine-tuning jobs | `LORA_MODULES=[]` |
| `780tauhj7c126b` | `brightrun-inference-official-vllm` | **INFERENCE** — serves chat & LoRA queries via vLLM | `LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]` |

### Key relationships

```
Training flow:
  Supabase DB trigger → Webhook → Inngest dispatch-training-job → RunPod ei82ickpenoqlp (trainer)

Inference flow:
  User chat → Next.js API → inference-serverless.ts → RunPod 780tauhj7c126b (inference/vLLM)

Auto-deploy flow (intended):
  Training completes → DB webhook → Inngest auto-deploy-adapter → HuggingFace → RunPod INFERENCE endpoint
```

---

## 3. Log File Analysis

### 3.1 Inngest Log (`Inngest-Log-65.txt`)

| Timestamp | Event | Finding |
|-----------|-------|---------|
| 1:36:40 PM | `Dispatch Training Job` completed | Training dispatch worked |
| 1:40:14 PM | `pipeline/adapter.ready` event fired | Webhook chain working |
| 1:40:14 PM | `Auto-Deploy Adapter` function started | Function picked up the event |
| 1:41:51 PM | **Function FAILED** | `error.reason: "output_too_large"` |
| 1:41:53 PM | `inngest/function.failed` handler completed | Failure handler ran |

**Verdict:** The function ran Steps 1–2 but Step 2's return value (the base64-encoded 66 MB adapter) exceeded Inngest's step output serialization limit. Inngest killed the function with `output_too_large`.

### 3.2 Vercel Log (`vercel-65.csv`)

| Entry | Finding |
|-------|---------|
| `/api/webhooks/training-complete` POST 200 | Webhook fired successfully (multiple times due to Supabase pg_net retries) |
| `[WebhookTrainingComplete] Fired pipeline/adapter.ready for job f56bb46f-...` | Event was sent to Inngest |
| `[AutoDeployAdapter] Downloaded 66460906 bytes from Supabase Storage` | Step 2 downloaded the adapter 3 times (Inngest step retries) |
| Multiple `stepId=step` calls returning 206 | Normal Inngest step execution (partial responses) |
| `/api/pipeline/adapters/deploy` POST 200 | Adapter deploy API was called |
| `/api/pipeline/adapters/status` GET 200 `[INFERENCE-SERVICE] Mode selected: serverless` | Status check routing correctly |

**Verdict:** Vercel logs confirm the webhook chain worked, the adapter was downloaded successfully from Supabase Storage, but the function never progressed past Step 2 because the step output was too large to serialize.

### 3.3 RunPod `780tauhj7c126b` — Inference Endpoint (`run-pod-780tauhj7c126b-65.txt`)

| Detail | Value |
|--------|-------|
| Log dates | Feb 21–22 ONLY — **NO Feb 24 entries** |
| vLLM version | v0.15.0 |
| Base model | `mistralai/Mistral-7B-Instruct-v0.2` |
| LoRA config | `enable_lora=True, max_loras=1, max_lora_rank=16` |
| Loaded adapter | `adapter-6fd5ac79` from `BrightHub2/lora-emotional-intelligence-6fd5ac79` ✅ |
| Worker health | Multiple restarts with ZMQ/AsyncLLM `__del__` errors (benign shutdown noise) |

**Verdict:** The inference endpoint was **never touched** by the Feb 24 auto-deploy attempt. The old adapter `adapter-6fd5ac79` is still loaded and working. This confirms the auto-deploy function failed before it could reach Step 4 (update LORA_MODULES). Even if it had reached Step 4, it would have updated the wrong endpoint (`ei82ickpenoqlp`).

### 3.4 RunPod `ei82ickpenoqlp` — Trainer Endpoint (`run-pod-ei82ickpenoqlp-65.txt.txt`)

| Detail | Value |
|--------|-------|
| Training date | Feb 24 |
| Dataset | 47 conversations |
| Config | 3 epochs, 36 steps, LoRA r=16, alpha=32, dropout=0.05 |
| Duration | 1.49 minutes |
| Final train_loss | 0.725 |
| Adapter size | 63.38 MB (tar.gz) |
| Upload to Supabase | ✅ Succeeded |
| Post-training warning | `handler.py:268 — Adapter path not found or invalid: lora-models/adapters/f56bb46f-...tar.gz` |

**Verdict:** Training completed successfully. The adapter was created and uploaded to Supabase Storage. The "Adapter path not found" warning appears to be the handler checking the Supabase storage path as if it were a local filesystem path — the upload itself succeeded (confirmed by the 66 MB download in Vercel logs). This warning is non-blocking but should be investigated in the trainer's `handler.py` when convenient.

---

## 4. Root Cause #1: Inngest `output_too_large`

### What happens

In `auto-deploy-adapter.ts`, Step 2 (`download-adapter`) does this:

```typescript
// Step 2 — lines 120-155
const tarBufferBase64 = await step.run('download-adapter', async () => {
  // ... downloads from Supabase Storage ...
  const buffer = Buffer.from(await data.arrayBuffer());
  console.log(`[AutoDeployAdapter] Downloaded ${buffer.length} bytes`);
  return buffer.toString('base64');  // ← 66 MB → ~88 MB base64
});
```

The base64 string is returned as the step's output. Inngest serializes all step outputs to JSON and stores them for durable execution. **Inngest's step output limit is 4 MB.** An 88 MB base64 string blows past this limit immediately.

The function then tries to use `tarBufferBase64` in Step 3 (`push-to-huggingface`) to extract the tar and upload files to HuggingFace Hub. This cross-step data passing is the architectural flaw.

### Why it downloaded 3 times

Vercel logs show the adapter was downloaded 3 times (the `Downloaded 66460906 bytes` message appears thrice). This is because Inngest retried Step 2 after each `output_too_large` failure (configured `retries: 2` = 1 initial + 2 retries = 3 total attempts). Each attempt downloaded the file, processed it, and then failed when trying to return the result.

### Fix: Merge Steps 2 and 3 into a single step

Instead of downloading the adapter in one step and uploading to HuggingFace in another, **combine them into a single `step.run()`**:

```typescript
// NEW: Single step that downloads from Supabase, extracts, and pushes to HuggingFace
const hfUploadResult = await step.run('download-and-push-to-huggingface', async () => {
  // Download from Supabase (same logic as current Step 2)
  const supabase = createServerSupabaseAdminClient();
  let storagePath = adapterFilePath;
  if (storagePath.startsWith('lora-models/')) {
    storagePath = storagePath.slice('lora-models/'.length);
  }
  const { data, error } = await supabase.storage.from('lora-models').download(storagePath);
  if (error || !data) throw new Error(`Download failed: ${error?.message}`);
  
  const tarData = Buffer.from(await data.arrayBuffer());
  console.log(`[AutoDeployAdapter] Downloaded ${tarData.length} bytes`);
  
  // Create HuggingFace repo (same logic as current Step 3a)
  // ... repo creation code ...
  
  // Extract and upload to HuggingFace (same logic as current Step 3b)
  // ... tar extraction and upload code ...
  
  // Return ONLY small metadata — NOT the file data
  return { hfPath, uploadedFiles };
});
```

This keeps the large data **inside the step's execution scope** and only returns a small JSON metadata object as the step output. The step output is just `{ hfPath: "BrightHub2/lora-emotional-intelligence-f56bb46f", uploadedFiles: ["adapter_config.json", ...] }` — a few hundred bytes.

---

## 5. Root Cause #2: Wrong RunPod Endpoint ID

### What's configured

| Location | Variable | Current Value | Correct Value |
|----------|----------|---------------|---------------|
| **Vercel env vars** | `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` ❌ | `780tauhj7c126b` ✅ |
| **.env.local line 24** | `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlpWEBHOOK_SECRET=5f6c82...` ❌ (concatenation bug) | `780tauhj7c126b` ✅ |

### What would have happened

If the `output_too_large` error were fixed but the endpoint ID stayed wrong, Step 4 (`update-runpod-lora-modules`) would:

1. Query `ei82ickpenoqlp` (the trainer) for its env vars via RunPod GraphQL
2. Find `LORA_MODULES=[]` (trainer doesn't have adapters)
3. Add `{"name":"adapter-f56bb46f","path":"BrightHub2/lora-emotional-intelligence-f56bb46f"}`
4. Save the updated env vars back to `ei82ickpenoqlp` (the trainer)

The trainer doesn't run vLLM and doesn't serve inference. Setting LORA_MODULES on it is meaningless. The inference endpoint `780tauhj7c126b` would never receive the new adapter.

### Fix

**In Vercel Dashboard:**
- Go to Settings → Environment Variables
- Change `RUNPOD_INFERENCE_ENDPOINT_ID` from `ei82ickpenoqlp` to `780tauhj7c126b`
- Redeploy

**In `.env.local`:**
- Fix the concatenation bug on line 24
- Change:
  ```
  RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlpWEBHOOK_SECRET=5f6c82d49e1a3b7f2c8d5e9a4b1c7f3d8e2a1b5c4d9f6e3a2b7c1d8e5f9a4b2c
  ```
- To:
  ```
  RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b
  ```
  (The `WEBHOOK_SECRET` on line 25 already has its own correct entry)

### Bonus: Hardcoded fallback in `inference-serverless.ts`

Line 17 of `src/lib/services/inference-serverless.ts`:
```typescript
const RUNPOD_API_URL = process.env.INFERENCE_API_URL || process.env.GPU_CLUSTER_API_URL || 'https://api.runpod.ai/v2/ei82ickpenoqlp';
```

The final fallback URL points to the trainer endpoint. This doesn't cause issues currently because `INFERENCE_API_URL` is correctly set to `https://api.runpod.ai/v2/780tauhj7c126b`. However, it should be updated so the fallback is also correct:
```typescript
const RUNPOD_API_URL = process.env.INFERENCE_API_URL || process.env.GPU_CLUSTER_API_URL || 'https://api.runpod.ai/v2/780tauhj7c126b';
```

---

## 6. Answers to Your Three Questions

### i. Did we set up the wrong serverless endpoint to receive the adapter?

**YES.** `RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlp` points to the **trainer** endpoint. The auto-deploy function's Step 4 uses this ID to update `LORA_MODULES` via RunPod's GraphQL API. This means it would register adapters on the trainer — which doesn't run vLLM inference and ignores LORA_MODULES entirely.

The correct endpoint for receiving adapter configurations is `780tauhj7c126b` (`brightrun-inference-official-vllm`), which is the one running vLLM with `enable_lora=True` and serving user chat requests.

### ii. What is `ei82ickpenoqlp` used for? Is it just the trainer? Is it working after our changes?

**`ei82ickpenoqlp` is the TRAINING endpoint only.** It runs the `brightrun-lora-trainer-qwen` worker — its sole job is:

1. Receive a training job (dispatched by `dispatch-training-job.ts`)
2. Download training data from Supabase
3. Run LoRA fine-tuning on the base model
4. Upload the resulting adapter archive to Supabase Storage
5. Update the `pipeline_training_jobs` record to `status=completed`

**It IS working correctly.** The Feb 24 training run completed successfully:
- 47 conversations, 3 epochs, 36 steps
- Train loss: 0.725
- Duration: 1.49 minutes
- Adapter: 63.38 MB tar.gz uploaded to Supabase Storage ✅

The only concern is the non-blocking warning `"Adapter path not found or invalid"` logged by the handler after upload — this doesn't prevent the pipeline from continuing but suggests a minor validation bug in `handler.py` (it appears to check the Supabase Storage path as a local filesystem path).

**None of our auto-deploy code changes affected the trainer.** The trainer's behavior comes from its RunPod worker Docker image (`handler.py`), not from the Vercel application. Our changes only touched the Inngest function that runs on Vercel after training completes.

### iii. Should `780tauhj7c126b` receive the adapter config? Do we need to change anything on it?

**YES, `780tauhj7c126b` is the correct target.** This is already confirmed by the fact that the existing production adapter (`adapter-6fd5ac79`) is loaded and working on this endpoint.

**What needs to happen on `780tauhj7c126b`:**
- The auto-deploy function's Step 4 should update its `LORA_MODULES` env var to include the new adapter alongside the existing one
- After the env var update, the next cold-start worker will pick up the new adapter automatically
- No manual changes needed on the endpoint itself — the auto-deploy function handles everything once the env var fix is applied

**Current state of `780tauhj7c126b`:**
```json
LORA_MODULES=[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

**After a successful auto-deploy, it should become:**
```json
LORA_MODULES=[
  {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name":"adapter-f56bb46f","path":"BrightHub2/lora-emotional-intelligence-f56bb46f"}
]
```

Note: The endpoint currently has `MAX_LORAS=1`, which means vLLM will only keep 1 adapter loaded in GPU memory at a time. This is fine for now (vLLM will swap adapters on demand), but if you want both adapters loaded simultaneously in the future, you'd need to increase `MAX_LORAS=2`.

---

## 7. Complete Fix Plan

### Fix A: Merge Steps 2+3 in `auto-deploy-adapter.ts` (Code Change)

**Priority:** CRITICAL — must be done first  
**What:** Combine the `download-adapter` and `push-to-huggingface` steps into a single `step.run()` so the 66 MB adapter data stays in-memory within one step and is never serialized as step output.  
**Estimated effort:** ~30 min code change + test

### Fix B: Change `RUNPOD_INFERENCE_ENDPOINT_ID` (Env Var Change)

**Priority:** CRITICAL — must be done alongside Fix A  
**What:**
1. **Vercel Dashboard** → Settings → Environment Variables → Change `RUNPOD_INFERENCE_ENDPOINT_ID` from `ei82ickpenoqlp` to `780tauhj7c126b`
2. **`.env.local` line 24** → Fix concatenation bug and set correct value:
   ```
   RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b
   ```
3. Redeploy after both changes

### Fix C: Update hardcoded fallback in `inference-serverless.ts` (Code Change)

**Priority:** LOW — not causing current issues but should be corrected  
**What:** Change line 17 fallback from `ei82ickpenoqlp` to `780tauhj7c126b`

### Fix D: (Optional) Investigate trainer `handler.py` warning

**Priority:** LOW — non-blocking  
**What:** The "Adapter path not found or invalid" warning after successful upload suggests the trainer's `handler.py` has a validation check comparing a Supabase Storage path against the local filesystem. This doesn't block the pipeline but creates misleading log noise.

---

## 8. Re-Run Strategy

After applying Fixes A and B:

1. **Git commit and push** the code change
2. **Verify Vercel redeploys** with the new code and env var
3. **Re-run the pipeline** by either:
   - Starting a new training job (will trigger the full chain)
   - OR manually setting the existing job `f56bb46f` back to `status='completed'` with `hf_adapter_path=NULL` in `pipeline_training_jobs`, which will re-trigger the Supabase DB webhook
4. **Monitor in Inngest Dashboard** — the function should now complete all 7 steps
5. **Verify on RunPod** — check that `780tauhj7c126b` has the new adapter in its LORA_MODULES

---

## 9. Architecture Diagram — Corrected Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Supabase DB                                                      │
│  pipeline_training_jobs.status → 'completed'                      │
│        │                                                          │
│        ▼ (DB Webhook)                                             │
│  POST /api/webhooks/training-complete                             │
│        │                                                          │
│        ▼ (Inngest Event: pipeline/adapter.ready)                  │
│  auto-deploy-adapter function                                     │
│        │                                                          │
│        ├─ Step 1: Validate job record                             │
│        ├─ Step 2+3 (MERGED): Download from Supabase → Push to HF │
│        ├─ Step 4: Update LORA_MODULES on 780tauhj7c126b ← FIXED  │
│        ├─ Step 5: vLLM hot reload (non-fatal)                     │
│        ├─ Step 6: Create DB endpoint records                      │
│        └─ Step 7: Write hf_adapter_path (idempotency marker)      │
│                                                                    │
│  Result: New adapter available on inference endpoint               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Appendix: Environment Variable Summary

### Vercel (Production) — Changes Required

| Variable | Current | Should Be | Action |
|----------|---------|-----------|--------|
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | `780tauhj7c126b` | **CHANGE** |
| `INFERENCE_API_URL` | `https://api.runpod.ai/v2/780tauhj7c126b` | Same | No change needed |
| `GPU_CLUSTER_API_KEY` | (set) | Same | No change needed |
| `HF_TOKEN` | (set) | Same | No change needed |
| `HF_ORG` | `BrightHub2` | Same | No change needed |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Same | No change needed |

### `.env.local` (Local Dev) — Fix Required

**Line 24 currently (concatenation bug):**
```
RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlpWEBHOOK_SECRET=5f6c82d49e1a3b7f2c8d5e9a4b1c7f3d8e2a1b5c4d9f6e3a2b7c1d8e5f9a4b2c
```

**Should be:**
```
RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b
```

(Line 25 `WEBHOOK_SECRET=85271e3ef571...` already has the correct separate entry)
