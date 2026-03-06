# Context Carryover: Automated Adapter Deployment — Session 6

**Last Updated:** February 24, 2026  
**Document Version:** context-carry-info-11-15-25-1114pm-pppp  
**Implementation Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully
2. Understand the current pipeline state from the **Status Summary** section below
3. Pay particular attention to these files:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\10-data-and-identity-automate-adapter-tutorial_v1.md`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\11-data-and-identity-automate-adapter-meta-questions_v1.md`
4. Then **wait for the human to tell you what to do next**

You are continuing active development on the **BRun v4-show/** platform, specifically the **Automated Adapter Deployment** pipeline. The human is actively testing the end-to-end flow.

**Do not start anything until the human tells you what to do.**

---

## 🎯 Current Project Focus: Testing Adapter Auto-Deployment

The automated adapter deployment pipeline is **fully coded, committed, and deployed to Vercel**. The human has completed all the setup steps (Vercel env vars, Supabase webhook). The **immediate goal is to test the end-to-end automation**.

### What the Pipeline Does

When a RunPod training job completes:
1. RunPod writes `status='completed'` and `adapter_file_path` to `pipeline_training_jobs`
2. Supabase Database Webhook fires → `POST /api/webhooks/training-complete`
3. Route validates `x-webhook-secret`, fires Inngest event `pipeline/adapter.ready`
4. Inngest function `autoDeployAdapter` runs 7 steps:
   - **Step 1** `fetch-job`: Reads job from DB, checks `hf_adapter_path` is null (idempotency guard)
   - **Step 2** `download-adapter`: Downloads `.tar.gz` from Supabase Storage
   - **Step 3** `push-to-huggingface`: Extracts tar, pushes all files to `BrightHub2/lora-emotional-intelligence-{jobId[:8]}`
   - **Step 4** `update-runpod-lora-modules`: Reads `LORA_MODULES` from RunPod endpoint via GraphQL, appends new adapter, writes back
   - **Step 5** `vllm-hot-reload`: Attempts vLLM hot reload on RunPod endpoint (non-fatal if fails)
   - **Step 6** `update-inference-endpoints-db`: Creates 2 rows in `pipeline_inference_endpoints` (control + adapted, status='ready')
   - **Step 7** `update-job-hf-path`: Writes `hf_adapter_path` back to `pipeline_training_jobs`
5. User's "Test Adapter" button becomes enabled in the UI

---

## ✅ Completed Setup Steps

### H1 — Vercel Environment Variables
**STATUS: COMPLETE**

All required env vars are confirmed added to Vercel Production + Preview:

| Variable | Value |
|----------|-------|
| `HF_TOKEN` | HuggingFace write token (was pre-existing, verified) |
| `HF_ORG` | `BrightHub2` |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` |
| `WEBHOOK_SECRET` | (from `.env.local`) |
| `GPU_CLUSTER_API_KEY` | (pre-existing, verified) |
| `INFERENCE_API_URL` | (pre-existing, verified) |
| `INNGEST_EVENT_KEY` | (pre-existing, verified) |
| `SUPABASE_SERVICE_ROLE_KEY` | (pre-existing, verified) |

### H2 — Supabase Database Webhook
**STATUS: COMPLETE**

Webhook `pipeline-adapter-ready` was configured in Supabase Dashboard → Project `hqhtbxlgzysfbekexwku` → Database → Webhooks:

| Field | Value |
|-------|-------|
| Webhook name | `pipeline-adapter-ready` |
| Table | `pipeline_training_jobs` |
| Events | `UPDATE` only |
| URL | `https://v4-show.vercel.app/api/webhooks/training-complete` |
| HTTP method | POST |
| HTTP headers — pre-existing | `Content-Type: application/json` (leave as-is) |
| HTTP headers — added | Key = `x-webhook-secret`, Value = raw WEBHOOK_SECRET (no quotes/backticks) |

### H3 — Inngest Function Registration
**STATUS: UNKNOWN — NEEDS VERIFICATION**

After the last Vercel deploy, Inngest may or may not have been synced. The human needs to:
1. Go to [https://app.inngest.com](https://app.inngest.com) → Apps → their app → click **Sync**
2. Confirm `auto-deploy-adapter` appears in the Functions list alongside `dispatch-training-job`, `process-rag-document`, `dispatch-training-job-failure`

---

## ⚠️ RunPod Endpoint Changes Required (NOT YET CONFIRMED DONE)

These changes to RunPod endpoint `ei82ickpenoqlp` were documented in the Q&A doc but **may not have been applied yet**. The human needs to confirm and apply these before testing:

### Change 1: Update the "Model" Field
**From:** `https://huggingface.co/qwen/qwen3-next-80b-a3b-instruct:...`  
**To:** `mistralai/Mistral-7B-Instruct-v0.2`

The entire pipeline is built on Mistral-7B. The Qwen model is incompatible with the LoRA adapters (different architecture) and far too large for the GPU allocation.

### Change 2: Remove These Environment Variables
| Variable | Action | Reason |
|----------|--------|--------|
| `NETWORK_VOLUME_ID` | **Remove** | Serverless endpoints don't use network volumes |
| `MODEL_PATH` | **Remove** | Points to Qwen on a volume that no longer applies |
| `TRANSFORMERS_CACHE` | **Remove** | Points to non-existent volume path |
| `HF_HOME` | **Remove** | Points to non-existent volume path |

### Change 3: Add LORA_MODULES
| Key | Value |
|-----|-------|
| `LORA_MODULES` | `[]` |

Or seed with the existing production adapter:
```json
[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

---

## 🧪 Testing Plan — Next Session

### Test 0: Verify Inngest Sync
1. Go to [https://app.inngest.com](https://app.inngest.com) → Apps → your app → click **Sync**
2. Confirm `auto-deploy-adapter` is listed under Functions

### Test 1: Verify the Webhook Route is Reachable

```bash
# Should return 401 — missing secret
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"completed","adapter_file_path":"test.tar.gz","user_id":"test"}}' \
  | head -c 200
```

Expected: `{"error":"Unauthorized"}` with HTTP 401.

### Test 2: Check DB State for Known Job

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

### Test 3: Get user_id for the Known Completed Job

Job ID for testing: `608fbb9b-2f05-450b-b38b-f029f2f2b70b`

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
  console.log('hf_adapter_path:', job.hf_adapter_path || '(null — good, not yet deployed)');
})();"
```

### Test 4: Manually Trigger Auto-Deploy via Webhook

Replace `YOUR_WEBHOOK_SECRET` and `ACTUAL_USER_ID` with real values:

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

Expected response: `{"ok":true,"jobId":"608fbb9b-...","message":"pipeline/adapter.ready event sent to Inngest"}`

Then immediately watch the Inngest Dashboard → Runs → look for a new `auto-deploy-adapter` run.

### Test 5: Post-Deployment DB Verification

After the Inngest run completes (~30–90 seconds):

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
  console.log('hf_adapter_path:', job?.hf_adapter_path || '✗ null — not yet deployed');

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

## 🔧 Debugging Guide — Common Failure Points

When a step fails in the Inngest Dashboard, here's where to look:

| Failing Step | Likely Cause | Fix |
|-------------|-------------|-----|
| `fetch-job` | Job not found, or `hf_adapter_path` already set (idempotency guard triggers) | Check DB — if already deployed, try a different job; if null check job ID |
| `download-adapter` | Supabase Storage path wrong, `SUPABASE_SERVICE_ROLE_KEY` missing/invalid | Verify env var in Vercel; check `adapter_file_path` format in DB |
| `push-to-huggingface` | `HF_TOKEN` missing/expired, token lacks write access to `BrightHub2` org | Re-generate HF token with write access; update in Vercel |
| `update-runpod-lora-modules` | `GPU_CLUSTER_API_KEY` invalid, `RUNPOD_INFERENCE_ENDPOINT_ID` wrong, GraphQL error | Confirm `ei82ickpenoqlp` is correct endpoint ID; verify GPU_CLUSTER_API_KEY |
| `vllm-hot-reload` | Non-fatal — RunPod model still loading is normal | Can be ignored; workers pick up updated LORA_MODULES on cold-start |
| `update-inference-endpoints-db` | DB insert error, missing required column value | Check Inngest error for column name; likely `user_id` missing from job |
| `update-job-hf-path` | DB update error | Check Inngest stack trace for Supabase error code |

---

## 📦 Completed Code Work (This Multi-Session Arc)

### Automated Adapter Deployment (E01–E03) — COMPLETE

All code is committed and deployed. Commits:

| Commit | Contents |
|--------|---------|
| `543ed9fe` | E01 + E02: DB migration (`hf_adapter_path`), `tar-stream` install, env vars, Inngest event type, `auto-deploy-adapter.ts`, registered in `index.ts` |
| `78d9265` | E03: `src/app/api/webhooks/training-complete/route.ts` |
| `da0d942` | Bugfix: added `tar-stream` to `src/package.json` (Vercel build fix) |

### RAG Module v9 Fixes — COMPLETE

Applied to `src/lib/rag/services/rag-retrieval-service.ts`:

| Fix | What Changed |
|-----|-------------|
| **Fix A: Interleaved output** | `assembleMultiHopContext()` now outputs round-robin `### [DocName] SectionTitle` sections, not grouped by document |
| **Fix B: Similarity floor** | Added `ASSEMBLY_SIMILARITY_FLOOR = 0.55` filter with safeguard (if all sections filtered, keep top 2) |
| **Fix C: Per-doc cap** | Added `MAX_SECTIONS_PER_DOC = 6` limit per document |
| **Fix D: Facts first** | Key Facts now appear before sections in assembled context |
| **TypeScript compat** | `new Set(...)` → `Array.from(new Set(...))` and `sectionsByDoc.entries()` → `Array.from(sectionsByDoc.entries())` (project targets pre-ES2015) |
| **Downstream detection** | Updated multi-doc header detection regex in `generateLoRAResponse()` and `generateResponse()` to match new `### [DocName]` format |

**Verified working:** User confirmed "Every answer references both banks when the question asks for the data about multiple accounts or banks."

---

## 🔑 Key Reference Values

| Item | Value |
|------|-------|
| RunPod inference endpoint | `ei82ickpenoqlp` |
| HuggingFace org | `BrightHub2` |
| HF adapter repo prefix | `lora-emotional-intelligence` |
| Supabase project | `hqhtbxlgzysfbekexwku` |
| Vercel app URL | `https://v4-show.vercel.app` |
| Webhook route | `POST https://v4-show.vercel.app/api/webhooks/training-complete` |
| Known completed job (for testing) | `608fbb9b-2f05-450b-b38b-f029f2f2b70b` |
| Known completed job (reference, older) | `6fd5ac79-c54b-4927-8138-ca159108bcae` |
| HF path for older adapter | `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| RAG test KB | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| WEBHOOK_SECRET location | `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` |

---

## 📁 Key File Paths

| File | Purpose |
|------|---------|
| `src\app\api\webhooks\training-complete\route.ts` | POST route: receives Supabase DB webhook, validates x-webhook-secret, fires Inngest event |
| `src\inngest\functions\auto-deploy-adapter.ts` | 7-step Inngest function — full adapter deployment pipeline |
| `src\inngest\client.ts` | Inngest client + `InngestEvents` type (includes `pipeline/adapter.ready`) |
| `src\inngest\functions\index.ts` | Function registry — `autoDeployAdapter` registered here |
| `src\lib\rag\services\rag-retrieval-service.ts` | Core RAG service — `assembleMultiHopContext()` v9 fixes in here |
| `pmc\product\_mapping\identity-spine\10-data-and-identity-automate-adapter-tutorial_v1.md` | Full adapter deployment tutorial (Parts 1–5) |
| `pmc\product\_mapping\identity-spine\11-data-and-identity-automate-adapter-meta-questions_v1.md` | Q&A: RunPod config, multi-tenancy, monitoring progress, Inngest sync |

---

## 🔄 Workflow for Debugging (If Testing Fails)

1. **Check Inngest Dashboard first** — [https://app.inngest.com](https://app.inngest.com) → Runs → `auto-deploy-adapter`
2. Click the run to see each step. Green = success, Red = failed (click to see error + stack trace)
3. If the run doesn't appear at all: the webhook fired but Inngest never got the event → check `x-webhook-secret` header value is correct and Inngest is synced
4. If the webhook curl returns non-200: check Vercel Function Logs → `training-complete` route for the error
5. Use SAOL queries (see section below) to inspect DB state before/after

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
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',where:[{column:'status',operator:'eq',value:'completed'}],select:'id, job_name, adapter_file_path, hf_adapter_path, completed_at',orderBy:{column:'completed_at',ascending:false},limit:5});r.data.forEach(j=>console.log(j.id?.slice(0,8),'|',j.job_name?.slice(0,30),'| hf_path:', j.hf_adapter_path||'null'));})();"

# Check inference endpoints for a job
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_inference_endpoints',where:[{column:'job_id',operator:'eq',value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],select:'job_id, endpoint_type, status, adapter_path, ready_at'});r.data.forEach(e=>console.log(e.endpoint_type,'|',e.status,'|',e.adapter_path||'(no adapter)'));})();"

# Query RAG queries for the test KB
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, query_text, mode, self_eval_score, self_eval_passed, response_time_ms',orderBy:{column:'created_at',ascending:false},limit:10});r.data.forEach(q=>console.log(q.created_at,q.mode,q.self_eval_score,q.self_eval_passed?'PASS':'FAIL'));})();"
```

### SAOL for DDL/Migrations
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

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
6. **LoRA Training Pipeline** (E01–E04 COMPLETE): Database, API routes, UI, training engine & evaluation
7. **Adapter Download System** (COMPLETE): Download trained adapter files as tar.gz archives
8. **Automated Adapter Testing** (DUAL-MODE): RunPod Pods (working) + Serverless (preserved)
9. **Multi-Turn Chat Testing** (E01–E10 COMPLETE): A/B testing, RQE evaluation, dual progress
10. **RAG Frontier** (ACTIVE — v9 fixes deployed):
    - Knowledge base management, document upload, processing pipeline
    - Multi-document chat ("Chat with all documents" mode)
    - HyDE + hybrid search (vector + BM25) + Claude reranking
    - Self-evaluation with multi-doc completeness check
    - Inngest background job processing
    - Golden-Set Regression Test (20 Q&A pairs)
    - **LoRA+RAG multi-doc inference working** — v9 interleaved context confirmed working
    - **Automated Adapter Deployment** (E01–E03 COMPLETE — actively testing)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (targets pre-ES2015 — do NOT use `for...of Set/Map`, use `Array.from()`)
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Serverless endpoint `ei82ickpenoqlp` with vLLM, Mistral-7B-Instruct-v0.2 base, multi-LoRA adapter serving

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1694 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()`, `assembleMultiHopContext()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits, `loraMaxContextTokens = 29000` |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs |
| `src/components/rag/RAGChat.tsx` | Chat UI — `getConfidenceDisplay()` renders green/amber/red badges |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
- **Test job for automation**: `608fbb9b-2f05-450b-b38b-f029f2f2b70b`

### Bug Pattern Registry (Identity Spine, Sessions 1–4 — all fixed)

| Pattern | Description |
|---------|-------------|
| **P1: Missing `user_id` on Insert** | Services set `created_by` but not `user_id`. Throws: `null value in column "user_id"` |
| **P2: Cascading NULL failure** | INSERT fails due to P1, then `.single()` on non-existent row throws |
| **P3: Wrong column in ownership lookup** | Route queries by `id` but URL carries `conversation_id` |
| **P4: Feature gap** | UI buttons disabled for valid enrichment states |
| **P5: Unwanted UX behavior** | Row click opens empty modal |

All P1–P5 bugs (BUG-001 through BUG-010) are fixed and committed.
