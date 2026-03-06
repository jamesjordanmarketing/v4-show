# 12 — Adapter Auto-Deployment: QA v5 Analysis

**Date:** 2026-02-25  
**Run:** 68 (retrigger via `scripts/retrigger-adapter-deploy.js`)  
**Job:** `4e48e3b4-45c0-4ea6-90b2-725759fffce0`  
**Logs:** `Inngest-Log-68.txt`, `vercel-68.csv`

---

## What Happened

The webhook fired successfully (HTTP 200), confirming the secret mismatch from the first attempt is resolved. The Inngest function `auto-deploy-adapter` ran and retried 3 times (1 initial + 2 retries). All 3 attempts failed at the same step: `download-and-push-to-huggingface`.

### Timeline (from Vercel logs)

1. **05:03:16** — Webhook accepted: `Fired pipeline/adapter.ready for job 4e48e3b4`
2. **05:03:21** — Downloaded 66,462,106 bytes from Supabase Storage ✅
3. **05:03:21** — HuggingFace repo `BrightHub2/lora-emotional-intelligence-4e48e3b4` already existed ✅
4. **05:03:22** — Extracted 8 files from tar.gz ✅
5. **05:03:23** — **HuggingFace commit API failed: HTTP 400** ❌

Same sequence repeated at 05:03:39 (retry 1) and 05:04:14 (retry 2).

---

## Root Cause

**The manually constructed multipart/form-data body was not parsed correctly by HuggingFace's server.**

### Error
```
HTTP 400 — {"error":"✖ Invalid input: expected string, received undefined\n  → at value.summary"}
```

This is a Zod validation error from HF's API — it parsed the multipart request but could not find the `summary` field from the `header` part.

### Why

The QA v4 fix manually built a multipart body using raw `Buffer` concatenation with a hand-crafted boundary. While the `summary` field was present in the JSON payload, the manual multipart construction has two problems:

1. **Wrong file part naming**: We used `name="file"; filename="..."` (the old HuggingFace format). The current HF API expects indexed fields: `file.{i}.path` (text) and `file.{i}.content` (binary).

2. **Manual boundary construction is fragile**: Binary file content (e.g., `adapter_model.safetensors`) can interfere with boundary detection in edge cases, and the manual `Content-Type` + boundary coordination is error-prone.

### Correct Format (from HuggingFace's official `@huggingface/hub` JS library)

The HuggingFace commit API expects native `FormData` with:
- `header` — a `Blob` containing JSON with `{summary, description}`
- `file.0.path` — text string with the file path
- `file.0.content` — a `Blob` with the file bytes
- `file.1.path`, `file.1.content` — next file, etc.

```typescript
const formData = new FormData();
formData.set('header', new Blob([JSON.stringify({ summary: '...', description: '' })], { type: 'application/json' }));
for (let i = 0; i < files.length; i++) {
  formData.set(`file.${i}.path`, files[i].name);
  formData.set(`file.${i}.content`, new Blob([files[i].data]), files[i].name);
}
// fetch handles Content-Type + boundary automatically
```

---

## Fix Applied

Replaced the manual Buffer/boundary multipart construction (section 2d) with native `FormData` + `Blob`. This:
- Matches the official HuggingFace JS library approach
- Uses indexed file fields (`file.{i}.path`, `file.{i}.content`)
- Lets `fetch()` handle the `Content-Type` header and boundary automatically
- Eliminates all manual multipart construction

---

## Re-Test Steps

1. Commit + push the fix
2. Wait for Vercel redeploy
3. Run: `node scripts/retrigger-adapter-deploy.js`
4. Monitor Inngest Dashboard → `auto-deploy-adapter` → expect `download-and-push-to-huggingface` to succeed
5. Check remaining steps (Steps 4–7) for any new issues
