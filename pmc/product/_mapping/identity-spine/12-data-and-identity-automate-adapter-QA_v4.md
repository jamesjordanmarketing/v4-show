# Auto-Deploy Adapter Investigation — QA v4

**Date:** February 24, 2026  
**Job ID:** `4e48e3b4-45c0-4ea6-90b2-725759fffce0` (same job as QA v3, re-triggered after v3 fix)  
**User ID:** `8d26cc10-a3c1-4927-8708-667d37a3348b`  
**Inngest Function:** `auto-deploy-adapter`  
**Failed Step:** `download-and-push-to-huggingface`

---

## 1. Symptom

After the QA v3 fix (static imports for `stream`/`zlib`, `tar-stream` externalized), the step progressed further — download, repo creation, and tar extraction all succeeded. However, **all 8 file uploads to HuggingFace failed with HTTP 410**:

```
Failed to upload README.md: HTTP 410 — {"error":"This endpoint is deprecated and has been retired, use the commit endpoint instead. Upgrade your huggingface_hub library to use the new endpoint."}
Failed to upload adapter_config.json: HTTP 410 — (same)
Failed to upload adapter_model.safetensors: HTTP 410 — (same)
Failed to upload chat_template.jinja: HTTP 410 — (same)
Failed to upload special_tokens_map.json: HTTP 410 — (same)
Failed to upload tokenizer.json: HTTP 410 — (same)
Failed to upload tokenizer.model: HTTP 410 — (same)
Failed to upload tokenizer_config.json: HTTP 410 — (same)
```

Since all uploads failed and zero files succeeded, the step threw: `[AutoDeployAdapter] All file uploads failed: ...`

---

## 2. Root Cause

### Deprecated HuggingFace API

The code uploads files one at a time using:

```
POST https://huggingface.co/api/models/{org}/{repo}/upload/main/{filename}
```

HuggingFace has **retired this endpoint** and returns HTTP 410 (Gone). The error message instructs: *"use the commit endpoint instead."*

### The replacement: HuggingFace Commit API

HuggingFace now requires all file uploads to go through the **commit API**:

```
POST https://huggingface.co/api/models/{org}/{repo}/commit/main
Content-Type: multipart/form-data
```

This accepts a multipart request with:
1. A JSON header part describing the operations (file additions/deletions)
2. Each file as a separate part referenced by the header

This is actually a better design — it creates a single atomic commit with all files, rather than 8 separate commits (one per file).

---

## 3. Fix

Replace the stream-based per-file upload loop with a **two-pass approach**:

1. **Pass 1 (extraction):** Extract the tar.gz and collect all files into an in-memory array
2. **Pass 2 (commit):** Upload all files in a single HuggingFace commit API call using multipart/form-data

### Why the stream-based approach changes

The old code used a streaming tar extractor that uploaded each file as it was extracted (inside the `entry.on('end')` callback). With the commit API, we need all files before we can build the commit request. So we first collect all files, then make one API call.

This is safe for our use case — the adapter tar.gz is ~63 MB compressed, and the extracted files fit comfortably in Node.js memory on Vercel's serverless functions.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `src/inngest/functions/auto-deploy-adapter.ts` | Replace per-file upload loop with collect-then-commit approach using HuggingFace commit API |

No other files need changes.

---

## 5. Verification After Deploy

Same as QA v3 Section 7 — commit, push, Vercel redeploy, then re-trigger the webhook for job `4e48e3b4`. Monitor in Inngest Dashboard. Expected: all steps pass, `hf_adapter_path` written to DB.
