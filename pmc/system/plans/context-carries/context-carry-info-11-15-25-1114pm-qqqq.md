# Context Carryover: Automated Adapter Deployment — Session 6

**Last Updated:** February 24, 2026  
**Document Version:** context-carry-info-11-15-25-1114pm-qqqq  
**Implementation Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully
2. Read these key source files:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` — the merged Step 2+3 fix was applied this session
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts` — fallback URL was corrected this session
3. Read the investigation documents:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v1.md` — root cause analysis
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\12-data-and-identity-automate-adapter-QA_v2.md` — follow-up Q&A
4. Then **wait for the human to tell you what to do next**

The human's **next step is to continue testing the adapter automation pipeline**. The code fixes from this session need to be committed, pushed, deployed, and then the pipeline must be re-tested end-to-end.

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
11. **Automated Adapter Deployment** (E01-E03 CODED, FIXES APPLIED THIS SESSION — needs testing)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (pre-ES2015 target — use `Array.from()` for Set/Map iteration)
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Serverless with vLLM v0.15.0 (for LoRA+RAG mode) — `mistralai/Mistral-7B-Instruct-v0.2`

---

## 🎯 Current Focus: Testing Adapter Automation After Bug Fixes

### What Happened This Session

A **real training job** was run for the first time through the full automation pipeline. Training succeeded, but the auto-deploy Inngest function **failed**. A full investigation was conducted, uncovering **two independent blocking bugs** that have now been fixed:

| # | Root Cause | Fix Applied |
|---|-----------|-------------|
| 1 | **Inngest `output_too_large`** — Step 2 returned 66 MB adapter as base64 (~88 MB), exceeding Inngest's ~4 MB step output limit | Merged Steps 2+3 into single `download-and-push-to-huggingface` step; large data stays in-memory, only small metadata returned |
| 2 | **Wrong RunPod endpoint ID** — `RUNPOD_INFERENCE_ENDPOINT_ID` pointed to `ei82ickpenoqlp` (trainer) instead of `780tauhj7c126b` (inference) | Vercel env var changed by user; `.env.local` fixed; hardcoded fallback in `inference-serverless.ts` corrected |

### The Two RunPod Endpoints

| Endpoint ID | Name | Role | Status |
|-------------|------|------|--------|
| `ei82ickpenoqlp` | `brightrun-lora-trainer-qwen` | **TRAINING** — runs LoRA fine-tuning jobs | ✅ Working correctly |
| `780tauhj7c126b` | `brightrun-inference-official-vllm` | **INFERENCE** — serves chat & LoRA queries via vLLM | ✅ Working, has existing adapter `adapter-6fd5ac79` |

### Code Changes Made This Session (Not Yet Committed)

1. **`src/inngest/functions/auto-deploy-adapter.ts`**:
   - Merged the separate `download-adapter` and `push-to-huggingface` steps into a single `download-and-push-to-huggingface` step
   - The 66 MB adapter data stays in local memory within the step; only `{ hfPath, uploadedFiles }` is returned as step output (~200 bytes)
   - Updated header comments to document the merge reason and correct endpoint references
   - **Step name changed**: `download-adapter` + `push-to-huggingface` → `download-and-push-to-huggingface`

2. **`src/lib/services/inference-serverless.ts`**:
   - Changed hardcoded fallback URL from `ei82ickpenoqlp` to `780tauhj7c126b` (line 17)
   - This fallback is only used if `INFERENCE_API_URL` and `GPU_CLUSTER_API_URL` are both unset

### Env Var Changes Made This Session

| Change | Where | Status |
|--------|-------|--------|
| `RUNPOD_INFERENCE_ENDPOINT_ID` changed from `ei82ickpenoqlp` to `780tauhj7c126b` | Vercel Dashboard | ✅ Done by user |
| `.env.local` concatenation bug fixed (line 24) | Local file | ✅ Done by user |
| `.env.local` — old `WEBHOOK_SECRET` moved under `#Old:` | Local file | ✅ Done — should delete the old line |
| `.env.local` — `RUNPOD_INFERENCE_ENDPOINT_ID` set to `780tauhj7c126b` | Local file | ✅ Done by user |

---

## 🚀 What Needs to Happen Next (Testing the Pipeline)

### Pre-Test Checklist

- [ ] **Delete** the old `WEBHOOK_SECRET=5f6c82...` line from `.env.local` (the one under `#Old:`)
- [ ] **Git commit and push** the code changes (merged steps fix + inference-serverless fallback fix)
- [ ] **Verify Vercel redeploys** successfully with the new code
- [ ] **Re-sync Inngest functions** — Inngest Dashboard → Apps → Sync (the step name changed from `download-adapter` + `push-to-huggingface` to `download-and-push-to-huggingface`)

### Testing Options

There are two ways to re-test the automation:

#### Option A: Reset the existing job and re-trigger
The Feb 24 training job (`f56bb46f-7e7c-4409-a22c-801f82d00941`) completed successfully and its adapter is in Supabase Storage. To re-run auto-deploy:

1. Clear the `hf_adapter_path` on the job record (so the idempotency guard doesn't skip it):
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentUpdate({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'f56bb46f-7e7c-4409-a22c-801f82d00941'}],
    data: { hf_adapter_path: null }
  });
  console.log('Updated:', r);
})();"
```

2. Manually trigger the webhook:
```bash
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET_HERE" \
  -d '{
    "type": "UPDATE",
    "table": "pipeline_training_jobs",
    "schema": "public",
    "record": {
      "id": "f56bb46f-7e7c-4409-a22c-801f82d00941",
      "user_id": "8d26cc10-a3c1-4927-8708-667d37a3348b",
      "status": "completed",
      "adapter_file_path": "lora-models/adapters/f56bb46f-7e7c-4409-a22c-801f82d00941.tar.gz",
      "hf_adapter_path": null
    }
  }'
```

3. Watch: Inngest Dashboard → Runs → `auto-deploy-adapter`

#### Option B: Start a new training job
Run a new training job through the UI. When it completes, the Supabase DB webhook will fire automatically and trigger the full chain.

### Post-Deploy Verification

After the auto-deploy function completes successfully, verify:

```bash
# Check hf_adapter_path was written
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'f56bb46f-7e7c-4409-a22c-801f82d00941'}],
    select: 'id, hf_adapter_path, updated_at'
  });
  console.log('hf_adapter_path:', r.data[0]?.hf_adapter_path || 'null');
})();"

# Check inference endpoint records were created
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    where: [{column:'job_id', operator:'eq', value:'f56bb46f-7e7c-4409-a22c-801f82d00941'}],
    select: 'job_id, endpoint_type, status, adapter_path, ready_at'
  });
  console.log('Records:', r.data.length);
  r.data.forEach(e => console.log(' -', e.endpoint_type, '|', e.status, '|', e.adapter_path || '(no adapter)'));
})();"
```

Expected after successful deployment:
```
hf_adapter_path: BrightHub2/lora-emotional-intelligence-f56bb46f

Records: 2
 - control | ready | (no adapter)
 - adapted | ready | BrightHub2/lora-emotional-intelligence-f56bb46f
```

Also verify on RunPod Dashboard that `780tauhj7c126b` has the new adapter in LORA_MODULES:
```json
[
  {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name":"adapter-f56bb46f","path":"BrightHub2/lora-emotional-intelligence-f56bb46f"}
]
```

---

## 🔧 What the Auto-Deploy Function Does (Updated Step Names)

When `pipeline/adapter.ready` event fires, the Inngest function `auto-deploy-adapter` runs these steps:

| Step | Inngest Step Name | What It Does |
|------|-------------------|-------------|
| 1 | `fetch-job` | Validates the job record, checks status='completed', idempotency guard (skips if `hf_adapter_path` already set) |
| **2+3** | **`download-and-push-to-huggingface`** | Downloads adapter from Supabase Storage, creates HuggingFace repo, extracts tar.gz, uploads all files to HF. Returns small metadata only (`{ hfPath, uploadedFiles }`). **MERGED THIS SESSION to fix output_too_large.** |
| 4 | `update-runpod-lora-modules` | Reads current LORA_MODULES from RunPod `780tauhj7c126b` via GraphQL, appends new adapter, writes back |
| 5 | `vllm-hot-reload` | Attempts `/v1/load_lora_adapter` call (non-fatal — adapter loads on next cold start regardless) |
| 6 | `update-inference-endpoints-db` | Creates `pipeline_inference_endpoints` rows (control + adapted) with `status='ready'` |
| 7 | `update-job-hf-path` | Writes `hf_adapter_path` to `pipeline_training_jobs` — serves as idempotency marker |

---

## 🔑 Env Vars Reference — Current State

### In `.env.local` (confirmed correct after this session's fixes)

| Variable | Value / Purpose |
|----------|----------------|
| `HF_TOKEN` | HuggingFace write token (for creating repos and uploading adapter files to BrightHub2 org) |
| `HF_ORG` | `BrightHub2` |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `780tauhj7c126b` ← **FIXED this session** (was `ei82ickpenoqlp`) |
| `WEBHOOK_SECRET` | The value matching Vercel and Supabase webhook header |
| `GPU_CLUSTER_API_KEY` | RunPod API key |
| `GPU_CLUSTER_API_URL` | `https://api.runpod.ai/v2/ei82ickpenoqlp` (training endpoint — used by dispatch-training-job) |
| `INFERENCE_API_URL` | `https://api.runpod.ai/v2/780tauhj7c126b` (inference endpoint) |
| `INFERENCE_MODE` | `serverless` |

### In Vercel (confirmed set)

Same variables as `.env.local`, with `RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b` already updated by user this session.

### On RunPod `780tauhj7c126b` (Inference)

| Variable | Value |
|----------|-------|
| `MODEL_NAME` | `mistralai/Mistral-7B-Instruct-v0.2` |
| `ENABLE_LORA` | `true` |
| `MAX_LORAS` | `1` |
| `MAX_LORA_RANK` | `16` |
| `LORA_MODULES` | `[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]` |
| `HF_TOKEN` | (different token from Vercel — for reading/downloading models, which is correct) |

### On RunPod `ei82ickpenoqlp` (Trainer)

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | (set) |
| `S3_ENDPOINT_URL` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | RunPod S3 storage |
| `LORA_MODULES` | `[]` (irrelevant — trainer doesn't serve inference) |

---

## 📁 Key File Paths

### Adapter Automation Files

| File | Purpose |
|------|---------|
| `src/inngest/functions/auto-deploy-adapter.ts` | Inngest function — download, HF upload, RunPod update, DB records. **MODIFIED this session** |
| `src/app/api/webhooks/training-complete/route.ts` | POST route: receives Supabase DB webhook, validates secret, fires Inngest event |
| `src/inngest/client.ts` | Inngest client + `InngestEvents` type (includes `pipeline/adapter.ready`) |
| `src/inngest/functions/index.ts` | Function registry — `autoDeployAdapter` is registered here |
| `src/lib/services/inference-serverless.ts` | Serverless inference client — fallback URL **corrected this session** |

### Documentation (This Investigation)

| File | Purpose |
|------|---------|
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v1.md` | Root cause analysis — full log investigation, endpoint mismatch, `output_too_large` |
| `pmc/product/_mapping/identity-spine/12-data-and-identity-automate-adapter-QA_v2.md` | Follow-up Q&A — WEBHOOK_SECRET, HF_TOKEN, LORA_MODULES, code fix details |
| `pmc/product/_mapping/identity-spine/11-data-and-identity-automate-adapter-meta-questions_v1.md` | Architecture Q&A — endpoint config, multi-tenant design, LORA_MODULES setup |
| `pmc/product/_mapping/identity-spine/10-data-and-identity-automate-adapter-tutorial_v1.md` | Full setup tutorial |

### Other Key Files

| File | Purpose |
|------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1694 lines) | Main RAG retrieval pipeline (v9 fixes applied) |
| `src/lib/rag/providers/claude-llm-provider.ts` | Claude API calls |
| `src/lib/rag/config.ts` | RAG configuration |
| `src/package.json` | Next.js app package.json — `tar-stream` in dependencies |

---

## 📊 Training Job Reference

### Most Recent Training Job (Feb 24, 2026)

| Field | Value |
|-------|-------|
| Job ID | `f56bb46f-7e7c-4409-a22c-801f82d00941` |
| User ID | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| Adapter file | `lora-models/adapters/f56bb46f-7e7c-4409-a22c-801f82d00941.tar.gz` |
| Adapter size | 66,460,906 bytes (~63 MB) |
| Training config | 47 conversations, 3 epochs, 36 steps, LoRA r=16, alpha=32, dropout=0.05 |
| Training duration | 1.49 minutes |
| Train loss | 0.725 |
| Status | `completed` — adapter in Supabase Storage ✅, auto-deploy failed ❌ (but fixed now) |
| `hf_adapter_path` | `NULL` (auto-deploy never completed — this is what we're testing next) |

### Existing Production Adapter

| Field | Value |
|-------|-------|
| Job ID | `6fd5ac79-c54b-4927-8138-ca159108bcae` |
| Adapter name | `adapter-6fd5ac79` |
| HF path | `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| Status | Loaded and working on `780tauhj7c126b` ✅ |

---

## 🐛 Bugs Found & Fixed This Session

| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| Inngest `output_too_large` | Step 2 returned 66 MB adapter as base64 (~88 MB) as step output, exceeding Inngest's ~4 MB limit | Merged Steps 2+3 into single `download-and-push-to-huggingface` step; data stays in-memory | ✅ Code fix applied |
| Wrong `RUNPOD_INFERENCE_ENDPOINT_ID` | Set to `ei82ickpenoqlp` (trainer) instead of `780tauhj7c126b` (inference) | Vercel env var changed, `.env.local` fixed | ✅ Fixed |
| `.env.local` concatenation bug | `RUNPOD_INFERENCE_ENDPOINT_ID` and `WEBHOOK_SECRET` were on one line without newline | Split into separate lines | ✅ Fixed |
| Hardcoded fallback URL in `inference-serverless.ts` | Fallback pointed to `ei82ickpenoqlp` (trainer) | Changed to `780tauhj7c126b` | ✅ Code fix applied |
| Duplicate `WEBHOOK_SECRET` in `.env.local` | Old value from concatenation bug orphaned as separate entry | Moved under `#Old:` comment — should be deleted | ⚠️ Delete the old line |

---

## 🔄 Debugging Workflow — If Auto-Deploy Fails Again

1. **Check Inngest Dashboard** → Runs → find the `auto-deploy-adapter` run
2. **Look at step output** — steps are now: `fetch-job`, `download-and-push-to-huggingface`, `update-runpod-lora-modules`, `vllm-hot-reload`, `update-inference-endpoints-db`, `update-job-hf-path`
3. **Common failure causes per step:**
   - `fetch-job`: Job not found, status not 'completed', already deployed (has `hf_adapter_path`)
   - `download-and-push-to-huggingface`: Supabase Storage download failed, HF_TOKEN invalid, HF API error, tar extraction error
   - `update-runpod-lora-modules`: `GPU_CLUSTER_API_KEY` invalid, RunPod GraphQL error, endpoint not found
   - `update-inference-endpoints-db`: DB insert error, missing `user_id`
   - `update-job-hf-path`: DB update error

4. **Check Vercel logs** for detailed `[AutoDeployAdapter]` console output
5. **If `output_too_large` appears again**: Something else is returning large data — check what the failing step returns

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

### RAG v9 Fixes (Applied Earlier This Session)
- Fixed `assembleMultiHopContext()` in `rag-retrieval-service.ts` — 4 issues corrected
- TypeScript Set/Map iteration errors fixed with `Array.from()`
- All RAG fixes committed and deployed

### Identity Spine Bug Fixes (Sessions 1–4)
All P1 (missing `user_id`) bugs fixed. Previous carryover:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`

### Test Environment
- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19`
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee`
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
