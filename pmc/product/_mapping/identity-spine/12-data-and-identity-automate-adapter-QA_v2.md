# 12 — Adapter Auto-Deployment: Follow-Up Q&A (v2)

**Date:** 2026-02-24  
**Context:** Follow-up questions after QA v1 findings and the Vercel env var fix for `RUNPOD_INFERENCE_ENDPOINT_ID`

---

## Question 1: Two `WEBHOOK_SECRET` Values — Do I Need the Old One?

**No. Delete the old one.** It is not used anywhere.

### What happened

The `.env.local` concatenation bug smashed `RUNPOD_INFERENCE_ENDPOINT_ID` and `WEBHOOK_SECRET` together on one line. When you split them apart, the orphaned value (`5f6c82...`) appeared as a separate `WEBHOOK_SECRET` entry. It was never a real, independently-set secret — it was a byproduct of the concatenation.

### Where `WEBHOOK_SECRET` is used

There is exactly **one consumer**: the webhook route at `src/app/api/webhooks/training-complete/route.ts`. It reads `process.env.WEBHOOK_SECRET` and compares it against the `x-webhook-secret` HTTP header sent by the Supabase Database Webhook.

```
Supabase DB Webhook → sends x-webhook-secret header → Vercel route compares to process.env.WEBHOOK_SECRET
```

The value in **Vercel** is the one that matters for production. Your `.env.local` value should match for local testing. Both of those are already set to the same correct value (the `85271e...` one).

The Supabase Dashboard webhook must also be configured with the same value in its HTTP Headers section. Since the real training run on Feb 24 succeeded in triggering the webhook (the Vercel logs show `[WebhookTrainingComplete] Fired pipeline/adapter.ready`), we know the Supabase header value already matches the Vercel env var.

### Action

- **Delete** the old `WEBHOOK_SECRET=5f6c82...` line from `.env.local` (the one under `#Old:`)
- **Keep** the correct `WEBHOOK_SECRET=85271e...` line
- **No changes needed** in Vercel or Supabase — they're already using the correct value

Nobody else in the codebase references `WEBHOOK_SECRET` — no RunPod endpoints, no Inngest functions, no other API routes.

---

## Question 2: `HF_TOKEN` Mismatch Between RunPod Inference Endpoint and `.env.local`

**These are two different tokens used by two different systems. The mismatch is fine — no changes needed.**

### Who uses which token

| Location | Token prefix | Used by | Purpose |
|----------|-------------|---------|---------|
| **Vercel / `.env.local`** | `hf_xWH...` | `auto-deploy-adapter.ts` (Inngest function) | **Write** to HuggingFace — creates repos, uploads adapter files to `BrightHub2/` org |
| **RunPod `780tauhj7c126b`** | `hf_Ike...` | vLLM worker at cold-start | **Read** from HuggingFace — downloads base model (`mistralai/Mistral-7B-Instruct-v0.2`) and LoRA adapter weights |

The Vercel token needs **write** access to the `BrightHub2` HuggingFace organization (to create repos and upload files).

The RunPod token needs **read** access to download models. Since the auto-deploy code creates adapter repos as `private: false` (public), the RunPod token doesn't even need org membership — any valid HF token (or no token at all) can download public repos. However, the base model `mistralai/Mistral-7B-Instruct-v0.2` may be gated, so the RunPod token needs to have accepted the Mistral license agreement on HuggingFace.

### Is the RunPod token valid?

Yes — the inference endpoint logs from Feb 21-22 show it successfully loaded both the base model and the existing adapter (`adapter-6fd5ac79`). If the token were invalid, model download would have failed.

### Action

**No changes needed.** Having different tokens in different locations is normal and expected. Each serves a different role with different permission requirements.

---

## Question 3: `LORA_MODULES` on the Inference Endpoint (`780tauhj7c126b`)

**It's correct. Leave it as-is.**

The current value:

```json
[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

This is the existing production adapter that is already loaded and working. The auto-deploy code (Step 4 in `auto-deploy-adapter.ts`) is designed to **read** this value, **append** the new adapter, and **write back** the full array. After a successful auto-deploy, it will become:

```json
[
  {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name":"adapter-f56bb46f","path":"BrightHub2/lora-emotional-intelligence-f56bb46f"}
]
```

The escaped quotes (backslashes) in the RunPod Dashboard display are just how the UI renders a JSON string inside a JSON env var — that's normal and correct. The vLLM worker parses it correctly as demonstrated by the logs showing `adapter-6fd5ac79` loaded successfully.

### Note on `MAX_LORAS=1`

Your inference endpoint currently has `MAX_LORAS=1`, which means vLLM keeps only 1 LoRA adapter loaded in GPU memory at a time. With 2 adapters registered, vLLM will **swap** between them on demand (evicting one from GPU memory when the other is requested). This is fine for now — the swap adds a small latency bump (~100ms) on the first request to a cold adapter. If you want both adapters loaded simultaneously later, increase `MAX_LORAS` to `2`.

### Action

**No changes needed.**

---

## Question 4: `LORA_MODULES` on the Trainer Endpoint (`ei82ickpenoqlp`)

**Leave it as `[]`. No changes needed.**

The trainer endpoint runs a completely different workload — it runs your LoRA fine-tuning training script (`handler.py`), not vLLM inference. The trainer:

- Receives training job requests (conversations + config)
- Downloads training data from Supabase
- Runs LoRA fine-tuning on the base model
- Uploads the resulting adapter `.tar.gz` back to Supabase Storage
- Updates the `pipeline_training_jobs` DB record

It never loads or serves adapters for inference. The `LORA_MODULES=[]` value on the trainer is harmless — the training script likely ignores it entirely. You don't need to set it to anything else, and you don't need to remove it either.

### Action

**No changes needed.**

---

## Question 5: Code Fix for Root Cause #1 — Inngest `output_too_large`

**Yes — the fix has been applied.** Here's what was changed:

### The problem

The old code had two separate Inngest steps:

- **Step 2** (`download-adapter`): Downloaded the 66 MB adapter from Supabase Storage and returned it as a base64 string (~88 MB) as the step's output
- **Step 3** (`push-to-huggingface`): Received the base64 string and uploaded files to HuggingFace

Inngest serializes every step's return value to JSON for durable execution. The step output limit is ~4 MB. An 88 MB base64 string blew past this immediately, causing the `"output_too_large"` error on every attempt (3 tries total = 1 initial + 2 retries).

### The fix applied  

Steps 2 and 3 are now **merged into a single `step.run()`** called `download-and-push-to-huggingface`. The adapter data stays in local memory within the single step execution. Only a small metadata object is returned:

```typescript
return { hfPath, uploadedFiles };  // ~200 bytes, well under the 4 MB limit
```

### Files changed

1. **`src/inngest/functions/auto-deploy-adapter.ts`**:
   - Merged the `download-adapter` step and `push-to-huggingface` step into a single `download-and-push-to-huggingface` step
   - Updated header comments to document the merge and the reason
   - Updated the Step 4 comment to remove the old hardcoded endpoint ID reference
   - Updated the file-level env var documentation to remove the old hardcoded endpoint ID

2. **`src/lib/services/inference-serverless.ts`**:
   - Updated the hardcoded fallback URL on line 17 from `ei82ickpenoqlp` to `780tauhj7c126b`
   - This fallback is only used if `INFERENCE_API_URL` and `GPU_CLUSTER_API_URL` are both unset (they are set, so this is cosmetic, but it's correct to fix)

### What the merged step does (in order)

1. Downloads the adapter `.tar.gz` from Supabase Storage into a `Buffer`
2. Creates the HuggingFace repository (or confirms it already exists)
3. Extracts the tar.gz using `tar-stream` + `zlib`
4. Uploads each extracted file to HuggingFace via their upload API
5. Returns `{ hfPath: "BrightHub2/lora-emotional-intelligence-XXXXXXXX", uploadedFiles: [...] }`

### What you need to do

1. **Commit and push** the code changes to git
2. **Verify Vercel redeploys** with the updated code
3. **Confirm** `RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b` is set in Vercel (you said this is done ✅)
4. **Re-run the pipeline** — either start a new training job, or reset the existing job's `hf_adapter_path` to `NULL` in `pipeline_training_jobs` to re-trigger the webhook
5. **Monitor in Inngest Dashboard** — the function should now complete all steps without `output_too_large`

---

## Summary: Action Items Checklist

| # | Action | Where | Status |
|---|--------|-------|--------|
| 1 | Change `RUNPOD_INFERENCE_ENDPOINT_ID` to `780tauhj7c126b` | Vercel env vars | ✅ Done |
| 2 | Fix `.env.local` concatenation bug | Local `.env.local` | ✅ Done |
| 3 | Delete old `WEBHOOK_SECRET=5f6c82...` line | Local `.env.local` | **Do now** |
| 4 | `HF_TOKEN` mismatch | — | No action needed |
| 5 | `LORA_MODULES` on inference endpoint | RunPod `780tauhj7c126b` | No action needed |
| 6 | `LORA_MODULES` on trainer endpoint | RunPod `ei82ickpenoqlp` | No action needed |
| 7 | Merge Steps 2+3 in auto-deploy code | `src/inngest/functions/auto-deploy-adapter.ts` | ✅ Code fix applied |
| 8 | Update fallback URL in inference-serverless | `src/lib/services/inference-serverless.ts` | ✅ Code fix applied |
| 9 | Git commit + push | Terminal | **Do now** |
| 10 | Verify Vercel rebuild | Vercel Dashboard | After push |
| 11 | Re-sync Inngest functions | Inngest Dashboard | After Vercel deploys |
| 12 | Re-run pipeline test | Inngest Dashboard or new training job | After sync |
