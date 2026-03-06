# Context Carryover: Automated Adapter Deployment — Session 5

**Last Updated:** February 24, 2026  
**Document Version:** context-carry-info-11-15-25-1114pm-ooo  
**Implementation Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully
2. Read the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to understand the current state
3. Pay particular attention to these files:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts`
4. Read the adapter deployment tutorial at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\10-data-and-identity-automate-adapter-tutorial_v1.md`
5. Then **wait for the human to tell you what to do next**

You are continuing active development on the **BRun v4-show/** platform, specifically the **Automated Adapter Deployment** pipeline. The human may ask you to:
- Debug failures in the adapter deployment Inngest function
- Analyze Vercel logs or Inngest run logs
- Help complete remaining human-action setup steps (Vercel env vars, Supabase webhook, Inngest sync)
- Guide them through manual deployment of an adapter if automation fails

**Do not start anything until the human tells you what to do.**

---

## 🎯 Current Project Focus: Automated Adapter Deployment (E01–E03)

A three-part feature — **Automated Adapter Deployment** — has been fully coded and deployed to production. The code is live on Vercel. However, several **human-action setup steps** (H1, H2, H3) have not yet been completed, and the end-to-end flow has not yet been tested.

### What the Feature Does

When a RunPod training job completes:
1. RunPod writes `status='completed'` and `adapter_file_path` to `pipeline_training_jobs`
2. Supabase Database Webhook fires → `POST /api/webhooks/training-complete`
3. The route validates the request and fires Inngest event `pipeline/adapter.ready`
4. Inngest function `autoDeployAdapter` runs (~2 min):
   - Downloads adapter `.tar.gz` from Supabase Storage
   - Extracts and pushes all files to HuggingFace Hub (`BrightHub2/lora-emotional-intelligence-{jobId[:8]}`)
   - Updates RunPod endpoint `ei82ickpenoqlp` `LORA_MODULES` env var via GraphQL API
   - (Non-fatal) Attempts vLLM hot reload
   - Creates `pipeline_inference_endpoints` rows (control + adapted, status='ready')
   - Writes `hf_adapter_path` back to `pipeline_training_jobs`
5. User visits `/pipeline/jobs/{id}/results` → "Test Adapter" button is now enabled

---

## 📦 What Was Built (This Session — E01–E03)

All three parts are committed and pushed. No E0x work needs to be redone.

### Commit History for This Feature

| Commit | What it contains |
|--------|-----------------|
| `543ed9fe` | E01 + E02: DB migration (`hf_adapter_path` column), `tar-stream` install, env vars, Inngest `pipeline/adapter.ready` event type, `auto-deploy-adapter.ts` (7-step function), registered in `index.ts` |
| `78d9265` | E03: Created `src/app/api/webhooks/training-complete/route.ts` |
| `da0d942` | **Bugfix:** Added `tar-stream` and `@types/tar-stream` to `src/package.json` (they were installed to root node_modules but not saved to the Next.js app's package.json — caused Vercel build failure `Cannot resolve 'tar-stream'`) |

### Files Created/Modified

| File | Status | What Changed |
|------|--------|-------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\package.json` | Modified | Added `tar-stream: ^3.1.7` (dependencies) and `@types/tar-stream: ^3.1.4` (devDependencies) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Modified | Added `pipeline/adapter.ready` event type to `InngestEvents` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | **NEW FILE** | 7-step Inngest function for full adapter deployment |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` | Modified | Imported and registered `autoDeployAdapter` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts` | **NEW FILE** | POST route that receives Supabase DB webhook and fires Inngest event |
| `pipeline_training_jobs` (Supabase DB) | Migration done | Added `hf_adapter_path TEXT` column |

---

## ⚠️ Human Actions Required (NOT YET DONE)

These steps **cannot be automated** — they require manual action in external dashboards. The code will not work end-to-end until these are completed.

### H1 — Add/Verify Vercel Environment Variables

**Location:** Vercel Dashboard → Project `v4-show/` → Settings → Environment Variables

For **Production** and **Preview** environments, verify/add:

| Variable | Value | Notes |
|----------|-------|-------|
| `HF_TOKEN` | HuggingFace write token | **May already exist** — it was in `.env.local` before this work. Verify in Vercel; only add if missing. Must have write access to `BrightHub2` org. |
| `HF_ORG` | `BrightHub2` | Likely new — add if missing |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Likely new — add if missing |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | Likely new — add if missing |
| `WEBHOOK_SECRET` | value from `.env.local` | Likely new — use the same value that was generated in E01 and saved to `.env.local`. Must match the Supabase webhook header. |

**Already set in Vercel (verify they exist):** `GPU_CLUSTER_API_KEY`, `INFERENCE_API_URL`, `INNGEST_EVENT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**How to update Vercel env vars — step by step:**
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click the **v4-show/** project
3. Click **Settings** → **Environment Variables**
4. For each variable: if it exists, click to edit; if new, click **Add New**
5. Select both **Production** and **Preview** environments when adding
6. After saving, redeploy (push a commit or click Redeploy on the Deployments tab)

### H2 — Configure Supabase Database Webhook

**Location:** Supabase Dashboard → Project `hqhtbxlgzysfbekexwku` → Database → Webhooks → Create

| Field | Value |
|-------|-------|
| **Webhook name** | `pipeline-adapter-ready` |
| **Table** | `pipeline_training_jobs` |
| **Events** | `UPDATE` only |
| **URL** | `https://v4-show.vercel.app/api/webhooks/training-complete` |
| **HTTP method** | POST |
| **HTTP headers** | Key = `x-webhook-secret`, Value = your `WEBHOOK_SECRET` from H1 |

> Supabase webhooks fire on ALL UPDATE events. The route code filters — only `status='completed' AND adapter_file_path IS NOT NULL` triggers the Inngest event.

### H3 — Verify Inngest Function Registration

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Navigate to **Functions**
3. Confirm `auto-deploy-adapter` appears alongside `dispatch-training-job`, `process-rag-document`, and `dispatch-training-job-failure`
4. If not: go to **Apps** → your app → click **Sync**

---

## 🧪 End-to-End Testing (After H1–H3 Are Complete)

### Test 1: Verify the Webhook Route is Reachable

```bash
# Should return 401 — missing secret
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"completed","adapter_file_path":"test.tar.gz","user_id":"test"}}' \
  | head -c 200

# Should return 401 — wrong secret
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wrong-secret" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"completed","adapter_file_path":"test.tar.gz","user_id":"test"}}' \
  | head -c 200
```

Expected: `{"error":"Unauthorized"}` with HTTP 401 for both.

### Test 2: Check DB State

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
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
    console.log('  adapter_file_path:', j.adapter_file_path ? '✓ set' : '✗ null');
    console.log('  hf_adapter_path:', j.hf_adapter_path ? '✓ ' + j.hf_adapter_path : '✗ null (not yet auto-deployed)');
  });
})();"
```

### Test 3: Manually Trigger Auto-Deploy for Existing Job

First get the `user_id` for job `608fbb9b-2f05-450b-b38b-f029f2f2b70b`:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'id, user_id, status, adapter_file_path, hf_adapter_path'
  });
  const job = r.data[0];
  if (!job) { console.log('Job not found'); return; }
  console.log('user_id:', job.user_id);
  console.log('status:', job.status);
  console.log('adapter_file_path:', job.adapter_file_path);
  console.log('hf_adapter_path:', job.hf_adapter_path || '(null)');
})();"
```

Then fire the webhook manually:

```bash
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "type": "UPDATE",
    "table": "pipeline_training_jobs",
    "schema": "public",
    "record": {
      "id": "608fbb9b-2f05-450b-b38b-f029f2f2b70b",
      "user_id": "ACTUAL_USER_ID",
      "status": "completed",
      "adapter_file_path": "lora-models/adapters/608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz",
      "hf_adapter_path": null
    }
  }'
```

Expected: `{"ok":true,"jobId":"608fbb9b-...","message":"pipeline/adapter.ready event sent to Inngest"}`

Then watch the Inngest run at [https://app.inngest.com](https://app.inngest.com) → Runs → `auto-deploy-adapter`.

### Test 4: Post-Deployment DB Verification

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const jobs = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'id, hf_adapter_path, updated_at'
  });
  const job = jobs.data[0];
  console.log('hf_adapter_path:', job?.hf_adapter_path || '✗ null');

  const endpoints = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    where: [{column:'job_id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'job_id, endpoint_type, status, adapter_path, ready_at'
  });
  console.log('\\npipeline_inference_endpoints records:', endpoints.data.length);
  endpoints.data.forEach(e => {
    console.log(' -', e.endpoint_type, '|', e.status, '|', e.adapter_path || '(no adapter)');
  });
})();"
```

Expected:
```
hf_adapter_path: BrightHub2/lora-emotional-intelligence-608fbb9b

pipeline_inference_endpoints records: 2
 - control | ready | (no adapter)
 - adapted | ready | BrightHub2/lora-emotional-intelligence-608fbb9b
```

---

## 🐛 Known Bugs Fixed This Session

| Bug | What happened | Fix |
|-----|--------------|-----|
| Vercel build: `Cannot resolve 'tar-stream'` | `tar-stream` was installed to repo root `node_modules` but not saved to `src/package.json`. Vercel's clean install had no record of it. | Added `tar-stream: ^3.1.7` to `dependencies` and `@types/tar-stream: ^3.1.4` to `devDependencies` in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\package.json` (commit `da0d942`) |

---

## 🔑 Env Vars Reference — What Lives Where

### In `.env.local` (confirmed present)

| Variable | Purpose |
|----------|---------|
| `HF_TOKEN` | HuggingFace write token — was already present before E01 |
| `HF_ORG` | `BrightHub2` — added in E01 |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` — added in E01 |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` — added in E01 |
| `WEBHOOK_SECRET` | generated in E01 — use this value in Vercel and Supabase webhook config |

### In Vercel (must be added/verified — see H1 above)

Same 5 vars as above, plus the pre-existing: `GPU_CLUSTER_API_KEY`, `INFERENCE_API_URL`, `INNGEST_EVENT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### How to get the `WEBHOOK_SECRET` value from `.env.local`

The `.env.local` file lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`. It is git-ignored. To read the `WEBHOOK_SECRET` value, open the file in a text editor and find the `WEBHOOK_SECRET=` line. Use that exact value in both Vercel and the Supabase webhook custom header.

---

## 📁 Key File Paths (All Full Paths) — This Feature

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts` | POST route: receives Supabase DB webhook, validates secret, fires Inngest event |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | 7-step Inngest function — the full adapter deployment pipeline |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client + `InngestEvents` type (includes `pipeline/adapter.ready`) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` | Function registry — `autoDeployAdapter` is registered here |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\package.json` | Next.js app package.json — `tar-stream` is now in dependencies |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\10-data-and-identity-automate-adapter-tutorial_v1.md` | Full tutorial: manual + automated deployment, env vars, debugging |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\09-data-and-identity-automate-adapter-execution-promopts-E03_v2.md` | E03 execution prompt — webhook route specification |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\09-data-and-identity-automate-adapter-specification_v1.md` | Full feature specification |

---

## 📋 Previous Session Context: Identity Spine Bug Fixes (Sessions 1–4)

Before this session, work focused on fixing **Identity Spine** bugs (P1 pattern: missing `user_id` on DB inserts). All those bugs are fixed. The previous carryover context for that work is at:

`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`

### Bug Pattern Registry (from Sessions 1–4)

| Pattern | Description | Trigger |
|---------|-------------|---------|
| **P1: Missing `user_id` on Insert** | Services set `created_by` but not `user_id`. E04 added NOT NULL constraints. Any insert without `user_id` throws PostgreSQL error `23502`. | `null value in column "user_id" of relation "X" violates not-null constraint` |
| **P2: Cascading NULL failure** | INSERT fails due to P1, then `.single()` on non-existent row throws. | `Cannot coerce the result to a single JSON object` |
| **P3: Wrong column in ownership lookup** | Route queries by `id` but URL carries `conversation_id`. | 404 on download routes despite record existing |
| **P4: Feature gap** | UI buttons disabled for enrichment states where enrichment could be triggered. | Button grayed out |
| **P5: Unwanted UX behavior** | Row click opens modal with no value. | Unexpected modal overlay |

### Bugs Fixed (Sessions 1–4, all committed)

| Bug | Pattern | File Fixed |
|-----|---------|-----------|
| BUG-001 | P1 | `conversation-storage-service.ts` — `storeRawResponse()` |
| BUG-002 | P1 | `generation-log-service.ts` — `logGeneration()` |
| BUG-003 | P1 | `batch-job-service.ts` — `createJob()` |
| BUG-004 | P1 | `failed-generation-service.ts` — `storeFailedGeneration()` |
| BUG-005 | P1 | `conversation-storage-service.ts` — `createConversation()` |
| BUG-006 | P3 | `src\app\api\conversations\[id]\download\raw\route.ts` |
| BUG-007 | P3 | `src\app\api\conversations\[id]\download\enriched\route.ts` |
| BUG-008 | P4 | `src\components\conversations\conversation-actions.tsx` |
| BUG-009 | P1 | `training-file-service.ts` — `createTrainingFile()` |
| BUG-010 | P5 | `src\components\conversations\ConversationTable.tsx` |

### Services NOT Yet Audited for P1 (potential future bugs)

| Service / File | Table Written To | Risk |
|---------------|-----------------|------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\conversation-service.ts` | `conversations` | High |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\batch-generation-service.ts` | `conversations`, `batch_jobs` | High |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\pipeline-service.ts` | `pipeline_training_jobs` | Medium |

---

## 🔄 Workflow for Debugging Adapter Deployment Issues

When the human reports a failure in the adapter automation:

1. **Identify the failure point** — ask which step failed (or look at Inngest run logs)
2. **Check Inngest run** — go to Inngest Dashboard → Runs → find the `auto-deploy-adapter` run
3. **Look at the step output** — each step is labeled: `fetch-job`, `download-adapter`, `push-to-huggingface`, `update-runpod-lora-modules`, `vllm-hot-reload`, `update-inference-endpoints-db`, `update-job-hf-path`
4. **Common causes per step:**
   - `fetch-job`: DB connectivity, job not found, wrong jobId
   - `download-adapter`: Supabase Storage path wrong, `SUPABASE_SERVICE_ROLE_KEY` missing
   - `push-to-huggingface`: `HF_TOKEN` missing or invalid, HF API error
   - `update-runpod-lora-modules`: `GPU_CLUSTER_API_KEY` missing, wrong `RUNPOD_INFERENCE_ENDPOINT_ID`, GraphQL schema mismatch
   - `update-inference-endpoints-db`: DB insert error, missing `user_id`
   - `update-job-hf-path`: DB update error

5. **For missing env vars:** Guide human to add them in Vercel Dashboard (see H1 section above for step-by-step)
6. **For Supabase webhook not firing:** Verify H2 is configured; check Supabase Dashboard → Database → Webhooks → `pipeline-adapter-ready`
7. **For Inngest function not appearing:** Trigger a sync (Inngest Dashboard → Apps → Sync)

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
# Query RAG queries for this KB (most recent first)
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, query_text, mode, self_eval_score, self_eval_passed, response_time_ms',orderBy:{column:'created_at',ascending:false},limit:10});r.data.forEach(q=>console.log(q.created_at,q.mode,q.self_eval_score,q.self_eval_passed?'PASS':'FAIL'));})();"

# Query documents in KB
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, file_name, status'});r.data.forEach(d=>console.log(d.id, d.file_name, d.status));})();"

# Read a query response by ID
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'id',operator:'eq',value:'QUERY_ID_HERE'}],select:'response_text, assembled_context'});console.log(r.data[0].response_text);})();"

# Compare rag_and_lora vs rag_only scores for recent queries
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});var saol=require('.');(async function(){var r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, mode, self_eval_score, self_eval_passed, query_text',orderBy:{column:'created_at',ascending:false},limit:15});r.data.forEach(function(q){console.log(q.created_at,q.mode,'score='+q.self_eval_score,q.query_text.slice(0,50));});});})();"
```

### SAOL for DDL/Migrations
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## 📋 Project Functional Context

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
10. **RAG Frontier** (ACTIVE DEVELOPMENT — self-eval fix in progress):
    - Knowledge base management, document upload, processing pipeline
    - Multi-document chat ("Chat with all documents" mode)
    - HyDE + hybrid search (vector + BM25) + Claude reranking
    - Self-evaluation with multi-doc completeness check
    - Inngest background job processing
    - Golden-Set Regression Test (20 Q&A pairs)
    - **LoRA+RAG multi-doc inference working** — context budget fixed
    - **Self-evaluation mode-awareness** — specification ready, implementation pending

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Pods with vLLM (for LoRA+RAG mode) — **16,384 token context window**

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1635 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()`, `assembleMultiHopContext()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits, `loraMaxContextTokens` |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs — `match_rag_embeddings_kb`, `search_rag_text` |
| `src/components/rag/RAGChat.tsx` | Chat UI — `getConfidenceDisplay()` renders green/amber/red badges based on self-eval score |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
- **LoRA Endpoint**: `virtual-inference-6fd5ac79-adapted` (status: ready, adapter_path: `lora-models/adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz`)
- **Latest Deployment**: `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa` (with context budget fix)
