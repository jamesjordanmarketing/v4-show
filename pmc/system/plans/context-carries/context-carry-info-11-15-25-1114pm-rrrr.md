# Context Carryover: Automated Adapter Deployment — Session 7

**Last Updated:** February 25, 2026  
**Document Version:** context-carry-info-11-15-25-1114pm-rrrr  
**Implementation Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully
2. Read the current source code:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` (~635 lines)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\next.config.js`
3. Read investigation documents (in order, most recent first):
   - `pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v5.md` — most recent analysis
   - `pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v4.md`
   - `pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v2.md`
   - `pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v1.md`
4. Then **wait for the human to tell you what to do next**

The human's **next step is to continue testing the adapter automation pipeline**. The most recent code fix (native FormData commit API approach) was pushed and deployed, retriggered, and **failed again** with the same HF error. The next agent needs to investigate why the native FormData approach still gives `"expected string, received undefined → at value.summary"`.

**Do not start anything until the human tells you what to do.**

---

## 📋 Project Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw and enriched JSON formats
6. **LoRA Training Pipeline** (E01-E04 COMPLETE): Database, API routes, UI, training engine & evaluation
7. **Adapter Download System** (COMPLETE): Download trained adapter files as tar.gz archives
8. **Automated Adapter Testing** (DUAL-MODE): RunPod Pods (working) + Serverless (preserved)
9. **Multi-Turn Chat Testing** (E01-E10 COMPLETE): A/B testing, RQE evaluation, dual progress
10. **RAG Frontier** (v9 fixes applied): Knowledge base management, document upload, multi-doc context assembly, HyDE + hybrid search, self-evaluation
11. **Automated Adapter Deployment** (E01-E03 CODED — HuggingFace commit upload still failing)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (pre-ES2015 target — use `Array.from()` for Set/Map iteration)
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Serverless with vLLM v0.15.0 (for LoRA+RAG mode) — `mistralai/Mistral-7B-Instruct-v0.2`
- **Build**: Node 20.x (pinned in `package.json` `engines`; Vercel's Node 24.x is overridden)

---

## 🎯 Current Focus: HuggingFace Commit API Upload — Still Failing

### The Blocking Problem

The auto-deploy pipeline downloads the adapter from Supabase Storage, extracts it, and attempts to push 8 files to HuggingFace. **Steps 1 (fetch-job), 2a (download), 2b (create repo), and 2c (tar extraction) all succeed.** Step 2d (upload via HF commit API) fails every time with:

```
HTTP 400 — {"error":"✖ Invalid input: expected string, received undefined\n  → at value.summary"}
```

This is a Zod validation error from HuggingFace's server. It means HF's API is not finding the `summary` field in our `header` part, even though it's in the JSON.

### What's Been Tried (All Failed)

| Attempt | Approach | Why It Failed |
|---------|----------|---------------|
| **QA v4** (Run 67) | Manual Buffer multipart with hand-crafted boundary | HF couldn't parse the multipart body — `summary` undefined |
| **QA v5** (Run 68) | Native `FormData` with `file.{i}.path`/`file.{i}.content` indexed fields + `formData.set()` | Same `summary` undefined error |
| **Build fix** | Changed `new Blob([file.data])` to `new Blob([new Uint8Array(file.data)])` | Fixed TS build error (Buffer vs BlobPart) but didn't fix the HF API issue |
| **Run 69** | Tried `@huggingface/hub` `createCommit()` — official JS library | Same `summary` error (FormData approach internally), plus webpack/TS build issues |
| **Run 70** | `@huggingface/hub` with dynamic import + webpack externals + `@ts-ignore` | `Cannot find module '@huggingface/hub'` at runtime — Vercel doesn't include externalized packages in serverless functions |
| **Run 71** | Native `FormData` with `formData.append('file', blob, filename)` — multiple parts sharing name "file" | Same `summary` undefined error |

### Current Code (Section 2d in auto-deploy-adapter.ts, lines 272–320)

```typescript
const formData = new FormData();

// Part 1: Header — commit metadata
formData.append(
  'header',
  new Blob(
    [JSON.stringify({ summary: `Auto-deploy adapter ${adapterName}`, description: '' })],
    { type: 'application/json' }
  )
);

// Parts 2–N: Each file as a separate "file" part
for (const file of extractedFiles) {
  formData.append('file', new Blob([new Uint8Array(file.data)]), file.name);
}

const commitResp = await fetch(
  `https://huggingface.co/api/models/${HF_ORG}/${hfRepoName}/commit/main`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    body: formData,
  }
);
```

### Hypothesis for Next Agent

The problem is likely one of:

1. **Node 20's native `FormData` sends `Blob` parts differently** than browser `FormData`. When a `Blob` is passed as a field to `FormData.append()`, Node 20 might not set `Content-Type: application/json` on the `header` part even though the Blob was created with `{ type: 'application/json' }`. HF's server might require that content-type on the header part to parse the JSON and find `summary`.

2. **The HF commit API may require the header to be a plain string** rather than a JSON Blob — i.e., `formData.append('header', JSON.stringify({summary:..., description:...}))` as a text field rather than a `Blob`.

3. **The Node 20 `Blob` polyfill might not properly convey MIME types** in the multipart encoding when used with native `FormData`.

**Suggestion for next agent**: Write a small standalone test script (like the existing `scripts/retrigger-adapter-deploy.js`) that hits the HF commit API directly with various FormData structures to isolate exactly what format HF accepts. This avoids the 3-minute Vercel deploy cycle per test. The script would:
- Create a tiny test file (e.g., a single `test.txt` with "hello")
- Try uploading it to `BrightHub2/lora-emotional-intelligence-4e48e3b4` using different FormData constructions
- Log the raw request and response to identify the exact issue

The test repo `BrightHub2/lora-emotional-intelligence-4e48e3b4` already exists on HuggingFace.

### Retrigger Script

A reusable trigger script exists at `scripts/retrigger-adapter-deploy.js`. Usage:
```bash
node scripts/retrigger-adapter-deploy.js
```
It reads `WEBHOOK_SECRET` from `.env.local` and POSTs to the Vercel webhook for job `4e48e3b4`.

---

## 🐛 Full Bug History (Sessions 6–7)

| # | Bug | Root Cause | Fix | Status |
|---|-----|-----------|-----|--------|
| 1 | Inngest `output_too_large` | Step 2 returned 66 MB base64 as step output (~88 MB), exceeding ~4 MB limit | Merged Steps 2+3 into single `download-and-push-to-huggingface` | ✅ Fixed |
| 2 | Wrong RunPod endpoint ID | `RUNPOD_INFERENCE_ENDPOINT_ID` pointed to trainer `ei82ickpenoqlp` not inference `780tauhj7c126b` | Vercel env var + `.env.local` + code fallback | ✅ Fixed |
| 3 | Webpack `TypeError: Cannot read properties of undefined (reading 'from')` | Webpack mangled `stream.Readable` and `zlib.createGunzip` dynamic requires | Static imports at top of file + `tar-stream` in `serverComponentsExternalPackages` | ✅ Fixed |
| 4 | HuggingFace HTTP 410 | Per-file upload API `/upload/main/{filename}` retired | Switched to commit API `/commit/main` with multipart FormData | ✅ Fixed (API changed) |
| 5 | HuggingFace HTTP 400 — `summary` undefined | Manual Buffer multipart body not parsed correctly | Tried native FormData with Blob | ❌ **STILL FAILING** |
| 5a | TS build: `Buffer` not assignable to `BlobPart` | `Buffer.buffer` is `ArrayBufferLike` not `ArrayBuffer` | Wrapped in `new Uint8Array(file.data)` | ✅ Fixed |
| 5b | Webpack: Can't resolve `@huggingface/hub` | Static import of ESM-only package | Dynamic import + webpack externals | ✅ Fixed (but abandoned this approach) |
| 5c | TS build: Can't find module `@huggingface/hub` | TS type-checks dynamic import strings | `@ts-ignore` | ✅ Fixed (but abandoned this approach) |
| 5d | Runtime: Cannot find module `@huggingface/hub` | Webpack externals means Vercel doesn't include it in serverless bundle | Abandoned `@huggingface/hub` entirely — uninstalled | ✅ Resolved by removal |
| 5e | HuggingFace HTTP 400 — `summary` undefined (native FormData) | Node 20 FormData + Blob may not preserve `Content-Type: application/json` on the header part | **Currently unsolved** | ❌ **ACTIVE BUG** |

### What IS Working

- ✅ Webhook fires correctly (`pipeline/adapter.ready` event)
- ✅ Inngest function starts and Step 1 (`fetch-job`) succeeds
- ✅ Adapter downloaded from Supabase Storage (66 MB)
- ✅ HuggingFace repo created (or already exists — 409 handled)
- ✅ Tar.gz extracted correctly (8 files)
- ❌ HuggingFace commit API upload — **blocked here**
- ⬜ Steps 4–7 untested (never reached)

---

## 🔧 Auto-Deploy Function Steps

| Step | Inngest Step Name | What It Does | Status |
|------|-------------------|-------------|--------|
| 1 | `fetch-job` | Validates job, checks status='completed', idempotency guard | ✅ Working |
| 2+3 | `download-and-push-to-huggingface` | Download from Supabase, create HF repo, extract tar, upload to HF | ❌ Failing at upload |
| 4 | `update-runpod-lora-modules` | Read/append/write LORA_MODULES on RunPod `780tauhj7c126b` via GraphQL | ⬜ Untested |
| 5 | `vllm-hot-reload` | `/v1/load_lora_adapter` call (non-fatal) | ⬜ Untested |
| 6 | `update-inference-endpoints-db` | Create `pipeline_inference_endpoints` rows | ⬜ Untested |
| 7 | `update-job-hf-path` | Write `hf_adapter_path` to job record | ⬜ Untested |

---

## 🔑 The Two RunPod Endpoints

| Endpoint ID | Name | Role | Status |
|-------------|------|------|--------|
| `ei82ickpenoqlp` | `brightrun-lora-trainer-qwen` | **TRAINING** — runs LoRA fine-tuning jobs | ✅ Working |
| `780tauhj7c126b` | `brightrun-inference-official-vllm` | **INFERENCE** — serves chat & LoRA queries via vLLM | ✅ Working, has adapter `adapter-6fd5ac79` |

---

## 🔑 Env Vars Reference

### In `.env.local` and Vercel (both confirmed correct)

| Variable | Value / Purpose |
|----------|----------------|
| `HF_TOKEN` | HuggingFace write token (for BrightHub2 org) |
| `HF_ORG` | `BrightHub2` |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `780tauhj7c126b` |
| `WEBHOOK_SECRET` | Matches Vercel and Supabase webhook header |
| `GPU_CLUSTER_API_KEY` | RunPod API key |
| `GPU_CLUSTER_API_URL` | `https://api.runpod.ai/v2/ei82ickpenoqlp` (training endpoint) |
| `INFERENCE_API_URL` | `https://api.runpod.ai/v2/780tauhj7c126b` (inference endpoint) |
| `INFERENCE_MODE` | `serverless` |

### On RunPod `780tauhj7c126b` (Inference)

| Variable | Value |
|----------|-------|
| `MODEL_NAME` | `mistralai/Mistral-7B-Instruct-v0.2` |
| `ENABLE_LORA` | `true` |
| `MAX_LORAS` | `1` |
| `MAX_LORA_RANK` | `16` |
| `LORA_MODULES` | `[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]` |

---

## 📊 Test Job Reference

### Current Test Job (Being Used for Retriggers)

| Field | Value |
|-------|-------|
| Job ID | `4e48e3b4-45c0-4ea6-90b2-725759fffce0` |
| User ID | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| Adapter file | `lora-models/adapters/4e48e3b4-45c0-4ea6-90b2-725759fffce0.tar.gz` |
| Adapter size | 66,462,106 bytes (~63 MB) |
| Files in adapter | `README.md`, `adapter_config.json`, `adapter_model.safetensors`, `chat_template.jinja`, `special_tokens_map.json`, `tokenizer.json`, `tokenizer.model`, `tokenizer_config.json` (8 files) |
| HF repo target | `BrightHub2/lora-emotional-intelligence-4e48e3b4` (already exists on HF) |
| `hf_adapter_path` in DB | `NULL` (auto-deploy never completed) |
| Status | `completed` |

### Existing Production Adapter

| Field | Value |
|-------|-------|
| Job ID | `6fd5ac79-c54b-4927-8138-ca159108bcae` |
| Adapter name | `adapter-6fd5ac79` |
| HF path | `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| Status | Loaded and working on `780tauhj7c126b` ✅ |

---

## 📁 Key File Paths

### Adapter Automation Files

| File | Purpose |
|------|---------|
| `src/inngest/functions/auto-deploy-adapter.ts` (~635 lines) | Inngest function — download, HF upload, RunPod update, DB records. **ACTIVELY BEING DEBUGGED** |
| `src/app/api/webhooks/training-complete/route.ts` | POST route: receives Supabase DB webhook, validates secret, fires Inngest event |
| `src/inngest/client.ts` | Inngest client + `InngestEvents` type |
| `src/inngest/functions/index.ts` | Function registry |
| `src/lib/services/inference-serverless.ts` | Serverless inference client |
| `src/next.config.js` | Webpack config — `tar-stream` in externals + `serverComponentsExternalPackages` |
| `scripts/retrigger-adapter-deploy.js` | Utility to retrigger the webhook for job `4e48e3b4` |

### Documentation (Investigation History)

| File | Purpose |
|------|---------|
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v1.md` | Root cause analysis — `output_too_large`, endpoint mismatch |
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v2.md` | Follow-up Q&A — secrets, tokens, LORA_MODULES, code fix details |
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v3.md` | Webpack stream/zlib fix |
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v4.md` | HF per-file upload retired (HTTP 410) → commit API |
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v5.md` | HF commit API `summary` undefined — FormData Blob analysis |

### Test Logs

All test logs are in `pmc/product/_mapping/identity-spine/test-data/`:
- `Inngest-Log-67.txt` / `vercel-67.csv` — Run 67 (HTTP 410 per-file upload)
- `Inngest-Log-68.txt` / `vercel-68.csv` — Run 68 (HTTP 400 summary undefined, manual Buffer)
- `Inngest-Log-69.txt` / `vercel-69.csv` — Run 69 (HTTP 400 summary undefined, FormData+set)
- `Inngest-Log-70.txt` / `vercel-70.csv` — Run 70 (Cannot find module @huggingface/hub)
- `Inngest-Log-71.txt` / `vercel-71.csv` — Run 71 (HTTP 400 summary undefined, FormData+append)

---

## 🔄 Testing Workflow

### How to Retrigger the Pipeline

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show"
node scripts/retrigger-adapter-deploy.js
```

This reads `WEBHOOK_SECRET` from `.env.local` and POSTs to the Vercel webhook, firing the Inngest function for job `4e48e3b4`.

### After Code Changes

1. Commit + push to git
2. Wait for Vercel to redeploy (check Vercel Dashboard)
3. Run `node scripts/retrigger-adapter-deploy.js`
4. Monitor Inngest Dashboard → Runs → `auto-deploy-adapter`
5. Check Vercel Runtime Logs for `[AutoDeployAdapter]` messages

### Post-Deploy Verification (Once All Steps Pass)

```bash
# Check hf_adapter_path was written
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'4e48e3b4-45c0-4ea6-90b2-725759fffce0'}],
    select: 'id, hf_adapter_path, updated_at'
  });
  console.log('hf_adapter_path:', r.data[0]?.hf_adapter_path || 'null');
})();"

# Check inference endpoint records
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    where: [{column:'job_id', operator:'eq', value:'4e48e3b4-45c0-4ea6-90b2-725759fffce0'}],
    select: 'job_id, endpoint_type, status, adapter_path, ready_at'
  });
  console.log('Records:', r.data.length);
  r.data.forEach(e => console.log(' -', e.endpoint_type, '|', e.status, '|', e.adapter_path || '(no adapter)'));
})();"
```

---

## 🚨 CRITICAL: SAOL Tool Usage (MUST READ)

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**  
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases.

**Library Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`  
**Quick Start:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`  
**Full Instructions:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`  
**Troubleshooting:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\TROUBLESHOOTING.md`

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query completed training jobs
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'status', operator:'eq', value:'completed'}],
    select: 'id, job_name, adapter_file_path, hf_adapter_path, completed_at',
    orderBy: [{column:'completed_at', asc:false}],
    limit: 5
  });
  console.log('=== Completed jobs ===');
  r.data.forEach(j => {
    console.log('Job:', j.id?.slice(0,8), '|', j.job_name?.slice(0,30));
    console.log('  adapter_file_path:', j.adapter_file_path ? 'set' : 'null');
    console.log('  hf_adapter_path:', j.hf_adapter_path || 'null (not yet auto-deployed)');
  });
})();"

# Query inference endpoint records for a job
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    where: [{column:'job_id', operator:'eq', value:'JOB_ID_HERE'}],
    select: 'job_id, endpoint_type, status, adapter_path, ready_at'
  });
  console.log('Records:', r.data.length);
  r.data.forEach(e => console.log(' -', e.endpoint_type, '|', e.status, '|', e.adapter_path || '(no adapter)'));
})();"
```

### SAOL for DDL/Migrations
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## 📋 Previous Session Context

### RAG v9 Fixes (Applied in Session 6)
- Fixed `assembleMultiHopContext()` in `rag-retrieval-service.ts` — 4 issues corrected
- TypeScript Set/Map iteration errors fixed with `Array.from()`

### Identity Spine Bug Fixes (Sessions 1–4)
All P1 (missing `user_id`) bugs fixed.

### Test Environment
- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19`
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee`
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
