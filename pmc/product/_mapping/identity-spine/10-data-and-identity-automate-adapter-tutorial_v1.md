# Tutorial: Deploy a LoRA Adapter to HuggingFace and Update RunPod Serverless Endpoint

**Version:** 1.0  
**Date:** 2026-02-24  
**Scope:** Manual and automated deployment of a trained LoRA adapter to HuggingFace Hub, then updating the RunPod Serverless Inference Endpoint to load it  

---

## Overview

After a RunPod training job completes, the resulting LoRA adapter (a `.tar.gz` file) lives in Supabase Storage. To make it available for inference, two things must happen:

1. **Push the adapter files to HuggingFace Hub** — so they have a stable public URL that RunPod workers can download at cold-start
2. **Update the RunPod Inference Endpoint `LORA_MODULES` env var** — so the serverless endpoint knows about the new adapter and loads it on worker start

This tutorial covers both the **automated pipeline** (how the system does it automatically) and the **manual steps** (how to do it yourself if the automation fails or you need to debug).

---

## Part 1: Understanding the Automated Pipeline

The automated pipeline is fully implemented. Here is the end-to-end flow:

```
RunPod training worker completes job
  → writes pipeline_training_jobs SET status='completed', adapter_file_path='lora-models/adapters/{id}.tar.gz'
  ↓
Supabase Database Webhook fires (watches pipeline_training_jobs for UPDATE events)
  → POST https://v4-show.vercel.app/api/webhooks/training-complete
  → route validates x-webhook-secret header
  → route checks status='completed' AND adapter_file_path IS NOT NULL
  → route calls inngest.send('pipeline/adapter.ready')
  ↓
Inngest function autoDeployAdapter runs (src/inngest/functions/auto-deploy-adapter.ts):
  Step 1: Fetch job from DB, check not already deployed (idempotency guard on hf_adapter_path)
  Step 2: Download adapter tar.gz from Supabase Storage bucket 'lora-models'
  Step 3: Extract tar.gz in memory → upload each file to HuggingFace Hub
           → creates repo: BrightHub2/lora-emotional-intelligence-{jobId[:8]}
  Step 4: Read RunPod endpoint ei82ickpenoqlp env vars via GraphQL API
           → parse LORA_MODULES JSON array
           → append {"name":"adapter-{jobId[:8]}","path":"BrightHub2/lora-emotional-intelligence-{jobId[:8]}"}
           → write back via GraphQL mutation
  Step 5: (Non-fatal) Attempt vLLM /v1/load_lora_adapter hot reload
  Step 6: Insert pipeline_inference_endpoints rows (control + adapted, status='ready')
  Step 7: Write hf_adapter_path to pipeline_training_jobs (deployment complete signal)
```

### Key Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts` | Receives Supabase DB webhook, fires Inngest event |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | The 7-step Inngest function |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client + `pipeline/adapter.ready` event type |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` | Function registry |

### Naming Conventions (matching production)

Given a job with `id = 608fbb9b-2f05-450b-b38b-f029f2f2b70b`:

| Thing | Value |
|-------|-------|
| `jobId[:8]` | `608fbb9b` |
| vLLM adapter name | `adapter-608fbb9b` |
| HuggingFace repo name | `lora-emotional-intelligence-608fbb9b` |
| HuggingFace full path | `BrightHub2/lora-emotional-intelligence-608fbb9b` |
| DB virtual endpoint ID (control) | `virtual-inference-608fbb9b-control` |
| DB virtual endpoint ID (adapted) | `virtual-inference-608fbb9b-adapted` |

---

## Part 2: Required Environment Variables

These must be set in both `.env.local` (for local dev/testing) and in the **Vercel Dashboard** (for production).

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `HF_TOKEN` | HuggingFace write token | HuggingFace → Settings → Access Tokens → New Token (write access to BrightHub2 org) |
| `HF_ORG` | `BrightHub2` | Fixed — the HuggingFace org that owns the repos |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Fixed — prefix for all adapter repos |
| `GPU_CLUSTER_API_KEY` | RunPod API key | RunPod Dashboard → Settings → API Keys |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | RunPod Dashboard → Serverless → Endpoints → your endpoint ID |
| `INFERENCE_API_URL` | RunPod inference URL | RunPod Dashboard → your endpoint → the endpoint URL |
| `WEBHOOK_SECRET` | A long random secret string | Generated once — same value in `.env.local` and Supabase webhook header |
| `INNGEST_EVENT_KEY` | Inngest event key | Inngest Dashboard → your app → Event Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Project Settings → API → service_role key |

### How to Update Environment Variables in Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on the **v2-modules** project
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)
5. For each variable:
   - If it already exists: click the variable name → edit the value → Save
   - If it is new: click **Add New** → enter the Key name → enter the Value → select **Production** and **Preview** environments → Save
6. After saving all variables, you must **redeploy** for them to take effect:
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - OR push a new commit to `main` (this triggers a new deployment automatically)

> **Important:** Vercel does not automatically re-deploy when you change env vars. You must trigger a new deployment.

---

## Part 3: Configuring the Supabase Database Webhook

This is a one-time setup that connects Supabase to the webhook route on Vercel.

### Steps

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the project (`hqhtbxlgzysfbekexwku`)
3. In the left sidebar: **Database** → **Webhooks**
4. Click **Create a new webhook**
5. Fill in:

| Field | Value |
|-------|-------|
| **Webhook name** | `pipeline-adapter-ready` |
| **Table** | `pipeline_training_jobs` |
| **Events** | `UPDATE` only (uncheck INSERT and DELETE) |
| **URL** | `https://v4-show.vercel.app/api/webhooks/training-complete` |
| **HTTP method** | POST |
| **HTTP headers** | See detailed steps below — add one custom header |
| **HTTP parameters** | Leave empty — not needed |

6. Click **Save**

#### HTTP Headers — Detailed Steps

Supabase shows a pre-existing `Content-Type: application/json` header. **Leave it there — do not remove or modify it.**

To add the authentication header, click **Add header** (or the `+` button next to the headers section):

- **First box** (the header name/key — may be unlabeled in the UI): type `x-webhook-secret`
- **Second box** (the value): paste your `WEBHOOK_SECRET` value from `.env.local` — no backticks, no quotes, just the raw secret string

You will end up with two headers total:

| Name | Value |
|------|-------|
| `Content-Type` | `application/json` ← pre-existing, leave as-is |
| `x-webhook-secret` | `your_secret_value_here` ← the one you are adding |

No other fields (parameters, etc.) need to be filled in.

> **Note:** Supabase Database Webhooks fire on ALL UPDATE events for the table. The route code filters server-side — only `status='completed' AND adapter_file_path IS NOT NULL` actually triggers the Inngest event.

---

## Part 4: Manual Deployment (Step-by-Step)

Use this if the automated pipeline fails or you need to deploy an adapter manually.

### Prerequisites

- The adapter `.tar.gz` file exists in Supabase Storage bucket `lora-models` at path `adapters/{jobId}.tar.gz`
- You have `HF_TOKEN`, `GPU_CLUSTER_API_KEY`, and `RUNPOD_INFERENCE_ENDPOINT_ID` available

---

### Step 4.1 — Download the Adapter from Supabase Storage

```bash
# Using the SAOL tool to verify the file exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'YOUR_JOB_ID_HERE'}],
    select: 'id, status, adapter_file_path, hf_adapter_path'
  });
  const job = r.data[0];
  console.log('status:', job.status);
  console.log('adapter_file_path:', job.adapter_file_path);
  console.log('hf_adapter_path:', job.hf_adapter_path || '(null — not yet deployed)');
})();"
```

To download the file from Supabase Storage:
1. Go to Supabase Dashboard → Storage → `lora-models` bucket
2. Navigate to `adapters/`
3. Click on the `.tar.gz` file and download it

OR use the Supabase JS client directly (the automated code does this in Step 2 of the Inngest function).

---

### Step 4.2 — Create a HuggingFace Repository

```bash
# Replace YOUR_HF_TOKEN and YOUR_JOB_SHORT_ID (first 8 chars of job UUID)
curl -X POST https://huggingface.co/api/repos/create \
  -H "Authorization: Bearer YOUR_HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "model",
    "name": "lora-emotional-intelligence-YOUR_JOB_SHORT_ID",
    "organization": "BrightHub2",
    "private": false
  }'
```

**Expected response:** `{"type":"model","url":"https://huggingface.co/BrightHub2/lora-emotional-intelligence-YOUR_JOB_SHORT_ID"}`

If you get HTTP 409, the repo already exists — that is fine, continue to Step 4.3.

---

### Step 4.3 — Extract and Upload Adapter Files to HuggingFace

The adapter tar.gz contains files like `adapter_config.json`, `adapter_model.safetensors`, etc.

**Extract the tar.gz:**
```bash
mkdir /tmp/adapter-extract
tar -xzf adapter-608fbb9b.tar.gz -C /tmp/adapter-extract
ls /tmp/adapter-extract/
```

**Upload each file to HuggingFace:**
```bash
# Repeat for each file in the extracted directory
HF_TOKEN="your_token"
HF_ORG="BrightHub2"
HF_REPO="lora-emotional-intelligence-608fbb9b"
FILE_PATH="/tmp/adapter-extract/adapter_config.json"
FILE_NAME="adapter_config.json"

curl -X POST \
  "https://huggingface.co/api/models/${HF_ORG}/${HF_REPO}/upload/main/${FILE_NAME}" \
  -H "Authorization: Bearer ${HF_TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"${FILE_PATH}"
```

After all files are uploaded, verify the repo at:
`https://huggingface.co/BrightHub2/lora-emotional-intelligence-608fbb9b`

---

### Step 4.4 — Update RunPod Endpoint LORA_MODULES

The RunPod inference endpoint's `LORA_MODULES` env var tells the vLLM worker which LoRA adapters to load at start. It is a JSON array of `{name, path}` objects.

**Step 4.4a — Fetch current LORA_MODULES:**

```bash
RUNPOD_API_KEY="your_api_key"
ENDPOINT_ID="ei82ickpenoqlp"

curl -X POST "https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetEndpointEnv($id: String!) { myself { endpoints(filters: { id: $id }) { id env } } }",
    "variables": { "id": "'"${ENDPOINT_ID}"'" }
  }'
```

**Example response:**
```json
{
  "data": {
    "myself": {
      "endpoints": [{
        "id": "ei82ickpenoqlp",
        "env": [
          {"key": "MODEL_NAME", "value": "mistralai/Mistral-7B-Instruct-v0.2"},
          {"key": "LORA_MODULES", "value": "[{\"name\":\"adapter-6fd5ac79\",\"path\":\"BrightHub2/lora-emotional-intelligence-6fd5ac79\"}]"}
        ]
      }]
    }
  }
}
```

**Step 4.4b — Build updated LORA_MODULES with your new adapter appended:**

Take the current value and add the new entry:
```json
[
  {"name": "adapter-6fd5ac79", "path": "BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name": "adapter-608fbb9b", "path": "BrightHub2/lora-emotional-intelligence-608fbb9b"}
]
```

**Step 4.4c — Save the updated env vars back to RunPod:**

```bash
RUNPOD_API_KEY="your_api_key"
ENDPOINT_ID="ei82ickpenoqlp"

# Build the full updated env array — include ALL existing vars plus the updated LORA_MODULES
curl -X POST "https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation SaveEndpointEnv($input: EndpointInput!) { saveEndpoint(input: $input) { id env } }",
    "variables": {
      "input": {
        "id": "ei82ickpenoqlp",
        "env": [
          {"key": "MODEL_NAME", "value": "mistralai/Mistral-7B-Instruct-v0.2"},
          {"key": "LORA_MODULES", "value": "[{\"name\":\"adapter-6fd5ac79\",\"path\":\"BrightHub2/lora-emotional-intelligence-6fd5ac79\"},{\"name\":\"adapter-608fbb9b\",\"path\":\"BrightHub2/lora-emotional-intelligence-608fbb9b\"}]"}
        ]
      }
    }
  }'
```

> **Critical:** The `saveEndpoint` mutation replaces the ENTIRE env array. Always include ALL existing env vars in the payload, not just the updated `LORA_MODULES`. The automated code in `auto-deploy-adapter.ts` does this correctly (see Step 4c in the code: it preserves all existing vars and only replaces `LORA_MODULES`).

---

### Step 4.5 — Update the Database

After the adapter is deployed, update the database so the UI knows and shows the "Test Adapter" button.

**Update `pipeline_training_jobs.hf_adapter_path`:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentUpdate({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    data: { hf_adapter_path: 'BrightHub2/lora-emotional-intelligence-608fbb9b' }
  });
  console.log('Updated:', r);
})();"
```

**Insert `pipeline_inference_endpoints` records (control + adapted):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const now = new Date().toISOString();
  const r = await saol.agentInsert({
    table: 'pipeline_inference_endpoints',
    data: [
      {
        job_id: '608fbb9b-2f05-450b-b38b-f029f2f2b70b',
        user_id: 'YOUR_USER_ID_HERE',
        endpoint_type: 'control',
        runpod_endpoint_id: 'virtual-inference-608fbb9b-control',
        base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
        status: 'ready',
        ready_at: now
      },
      {
        job_id: '608fbb9b-2f05-450b-b38b-f029f2f2b70b',
        user_id: 'YOUR_USER_ID_HERE',
        endpoint_type: 'adapted',
        runpod_endpoint_id: 'virtual-inference-608fbb9b-adapted',
        base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
        adapter_path: 'BrightHub2/lora-emotional-intelligence-608fbb9b',
        status: 'ready',
        ready_at: now
      }
    ]
  });
  console.log('Inserted:', r);
})();"
```

---

## Part 5: Verification

### 5.1 — Verify the HuggingFace Repository

Visit the repo directly:
`https://huggingface.co/BrightHub2/lora-emotional-intelligence-608fbb9b`

You should see the adapter files: `adapter_config.json`, `adapter_model.safetensors` (or `.bin`), and `tokenizer_config.json` or similar.

### 5.2 — Verify RunPod LORA_MODULES

Run the fetch query from Step 4.4a and confirm your adapter appears in the `LORA_MODULES` array.

### 5.3 — Verify the Database

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
  console.log('hf_adapter_path:', job?.hf_adapter_path || 'NULL — not yet deployed');

  const endpoints = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    where: [{column:'job_id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'job_id, endpoint_type, status, adapter_path, ready_at'
  });
  console.log('\\nInference endpoint records:', endpoints.data.length);
  endpoints.data.forEach(e => {
    console.log(' -', e.endpoint_type, '|', e.status, '|', e.adapter_path || '(no adapter)');
  });
})();"
```

**Expected output:**
```
hf_adapter_path: BrightHub2/lora-emotional-intelligence-608fbb9b

Inference endpoint records: 2
 - control | ready | (no adapter)
 - adapted | ready | BrightHub2/lora-emotional-intelligence-608fbb9b
```

### 5.4 — Manually Trigger the Automated Pipeline (for a completed job)

If the Supabase webhook was not configured yet when the job completed, you can simulate it:

```bash
# First get the actual user_id for the job
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'id, user_id, adapter_file_path'
  });
  console.log(r.data[0]);
})();"

# Then fire the webhook manually (replace YOUR_WEBHOOK_SECRET, ACTUAL_USER_ID)
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

**Expected:** `{"ok":true,"jobId":"608fbb9b-...","message":"pipeline/adapter.ready event sent to Inngest"}`

Then monitor the Inngest run at [https://app.inngest.com](https://app.inngest.com) → Runs.

---

## Part 6: Common Failures and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Webhook returns 401 | Wrong or missing `x-webhook-secret` header | Confirm `WEBHOOK_SECRET` in Vercel matches the header value configured in Supabase |
| Webhook returns 500 "not configured" | `WEBHOOK_SECRET` env var missing from Vercel | Add `WEBHOOK_SECRET` to Vercel env vars and redeploy |
| Inngest function not appearing in dashboard | Function not synced after deploy | Go to Inngest Dashboard → Apps → Sync |
| Step 3 fails: `Cannot find module 'tar-stream'` | `tar-stream` missing from `package.json` | Ensure `tar-stream` is in `src/package.json` dependencies (was fixed in commit `da0d942`) |
| Step 3 fails: `HF_TOKEN not set` | Missing env var on Vercel | Add `HF_TOKEN` to Vercel → Settings → Environment Variables |
| Step 4 fails: `GPU_CLUSTER_API_KEY not set` | Missing env var | Add `GPU_CLUSTER_API_KEY` to Vercel env vars |
| Step 4 fails: RunPod endpoint not found | Wrong `RUNPOD_INFERENCE_ENDPOINT_ID` | Verify endpoint ID in RunPod Dashboard → Serverless → Endpoints |
| Step 6 fails: DB insert error | Missing `user_id` on `pipeline_inference_endpoints` | The `userId` from the event payload must be present — check webhook route passes `user_id` from the DB record |
| Adapter appears in LORA_MODULES but vLLM won't use it | Workers still running old config | Workers pick up new LORA_MODULES on next cold-start (not hot reload for serverless) |

---

## Part 7: Monitoring via Inngest Dashboard

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Navigate to **Functions** — confirm `auto-deploy-adapter` is listed
3. Navigate to **Runs** — after triggering, a new run appears
4. Click the run to see each step:
   - `fetch-job` → `download-adapter` → `push-to-huggingface` → `update-runpod-lora-modules` → `vllm-hot-reload` → `update-inference-endpoints-db` → `update-job-hf-path`
5. Green = success, Red = failed (click to see error message and stack trace)
6. Failed steps are retried automatically up to 2 times with exponential backoff

---

## Part 8: The Existing Production Adapter (Reference)

The existing deployed adapter is the reference implementation. When debugging, compare new deployments against it:

| Property | Value |
|----------|-------|
| Job ID | `6fd5ac79-c54b-4927-8138-ca159108bcae` |
| HuggingFace path | `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| vLLM adapter name | `adapter-6fd5ac79` |
| RunPod endpoint | `ei82ickpenoqlp` |
| DB endpoint ID (control) | `virtual-inference-6fd5ac79-control` |
| DB endpoint ID (adapted) | `virtual-inference-6fd5ac79-adapted` |

## Summary from Chat Box

Both files are written. Here's a summary of what was produced:

---

**Tutorial** (`10-data-and-identity-automate-adapter-tutorial_v1.md`) covers:

- **Part 1:** How the automated pipeline works end-to-end (the full flow from RunPod job completion to "Test Adapter" button enabling)
- **Part 2:** All required environment variables, with instructions for how to add/update them in Vercel step-by-step
- **Part 3:** How to configure the Supabase Database Webhook
- **Part 4:** Full manual deployment walkthrough — HuggingFace repo creation, file extraction and upload, RunPod GraphQL API calls to read/update `LORA_MODULES`, and database record creation
- **Part 5:** Verification queries (DB + HF repo check) and how to manually trigger the pipeline for existing jobs
- **Part 6:** Common failure modes and their fixes
- **Part 7:** How to monitor runs in Inngest Dashboard
- **Part 8:** The existing production adapter as a reference

---

**Carryover document** (`context-carry-info-11-15-25-1114pm-ooo.md`) updates include:

- Strong "do not touch anything, wait for instructions" opening
- Full summary of what E01–E03 built and the commit history (`543ed9fe`, `78d9265`, `da0d942`)
- The `tar-stream` build bug fix documented
- The three outstanding **human actions** (H1 Vercel env vars, H2 Supabase webhook, H3 Inngest sync) written as clear step-by-step guides
- All end-to-end test commands ready to copy-paste
- Vercel and Supabase environment variable guidance
- Previous Identity Spine bug history preserved for context
- SAOL Quick Reference and Project Functional Context sections kept verbatim