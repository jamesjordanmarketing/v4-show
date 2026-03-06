# Adapter Auto-Deployment — Execution Prompt E03
# Webhook Route + Human Actions + Final Verification

**Version:** 1.0  
**Date:** 2026-02-24  
**Section:** E03 — Webhook API Route, Human Actions, Deploy & End-to-End Verification  
**Prerequisites:** E01 and E02 must be complete  
**Final section:** This completes the full automated adapter deployment feature

---

## Overview

E03 creates the missing link between Supabase and Inngest: a Next.js API route that receives the Supabase Database Webhook and fires the `pipeline/adapter.ready` Inngest event.

It also documents all required human actions (Vercel env vars, Supabase webhook configuration, deploy) and provides end-to-end verification using SAOL.

**E03 creates/modifies:**
- `src/app/api/webhooks/training-complete/route.ts` (NEW FILE)

**E03 does NOT create:**
- Any Inngest functions (E02)
- Any database migrations (E01)
- Any UI changes

---

========================


## Context and Purpose

You are implementing the final step (E03) of a three-part feature: **Automated Adapter Deployment** for a LoRA training SaaS platform.

**What E01 and E02 already completed (do NOT redo):**
- **E01:** Added `hf_adapter_path TEXT` column to `pipeline_training_jobs`. Installed `tar-stream`. Added env var placeholders to `.env.local`.
- **E02:** Added `pipeline/adapter.ready` event type to `src/inngest/client.ts`. Created `src/inngest/functions/auto-deploy-adapter.ts` (the full 7-step function). Registered `autoDeployAdapter` in `src/inngest/functions/index.ts`.

**Your job in E03:**

1. **Create** `src/app/api/webhooks/training-complete/route.ts` — receives the Supabase Database Webhook and sends the `pipeline/adapter.ready` Inngest event
2. **Run** TypeScript verification across all modified files
3. **Document** all human actions needed before end-to-end testing
4. **Provide** SAOL verification queries to confirm the feature worked after a training job completes

**Target codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`  
**App URL:** `https://v4-show.vercel.app`

---

## Critical Rules

1. **Read the existing API route patterns before creating the new route.** The `src/app/api/` directory has established patterns for Next.js App Router routes. Match these patterns.
2. **The webhook route must NOT use `requireAuth()`.** It is not called by a browser session — it is called by Supabase's webhook system with a shared secret header.
3. **The shared secret validation must fail closed.** If `WEBHOOK_SECRET` is not configured, return HTTP 500. If the secret is wrong, return HTTP 401.
4. **Do not use SAOL in production TypeScript code.** SAOL is a CLI-only development tool. The webhook route uses the `inngest` client and returns early — it does not make direct DB calls.
5. **The Supabase webhook fires for ALL UPDATE events** on `pipeline_training_jobs`, not just `status=completed`. The route code must filter server-side.

---

## Step 1: Read Existing API Route Patterns

Before creating the new route, read a nearby existing route to understand the established patterns.

Read this file: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\route.ts`

**What to confirm:**
- Routes use `NextRequest` and `NextResponse` from `next/server`
- Auth uses `requireAuth(request)` from `@/lib/supabase-server` (but note: the webhook route does NOT use this)
- Error responses use `NextResponse.json({ error: '...' }, { status: xxx })`
- The `inngest` client is imported from `@/inngest/client` and called as `await inngest.send({...})`

---

## Step 2: Create Directory Structure

Verify the `webhooks` directory does not already exist, then note that creating the file will create it.

Check if this path exists: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\`

If it does not exist, it will be created automatically when you write the route file.

---

## Step 3: Create `src/app/api/webhooks/training-complete/route.ts` (NEW FILE)

Create this file at:
`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\webhooks\training-complete\route.ts`

Write the **complete** file content exactly as follows:

```typescript
/**
 * Webhook Route: Training Complete
 *
 * Route: POST /api/webhooks/training-complete
 *
 * Receives:
 *   Supabase Database Webhook for table=pipeline_training_jobs, event=UPDATE
 *
 * Behaviour:
 *   - Validates the request using a shared secret in the 'x-webhook-secret' header
 *   - Ignores updates where status !== 'completed' or adapter_file_path is null
 *   - Fires Inngest event 'pipeline/adapter.ready' for qualifying updates
 *
 * This triggers:
 *   autoDeployAdapter (src/inngest/functions/auto-deploy-adapter.ts)
 *   which orchestrates the full adapter deployment to HuggingFace + RunPod
 *
 * Supabase webhook payload format:
 * {
 *   "type": "UPDATE",
 *   "table": "pipeline_training_jobs",
 *   "schema": "public",
 *   "record": { ...updated row columns... },
 *   "old_record": { ...previous row values... }
 * }
 *
 * Security:
 *   The Supabase webhook is configured to send 'x-webhook-secret: <WEBHOOK_SECRET>'
 *   as a custom header. Requests without this exact secret are rejected.
 *   The WEBHOOK_SECRET env var must match the value configured in Supabase Dashboard.
 *
 * Note:
 *   Supabase Database Webhooks fire on ALL UPDATE events for the table.
 *   This route intentionally receives all of them and filters server-side.
 *   Only rows with status='completed' AND adapter_file_path IS NOT NULL trigger the event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  // ---- Security: validate shared secret ----
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('[WebhookTrainingComplete] WEBHOOK_SECRET env var is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured on server' },
      { status: 500 }
    );
  }

  const incomingSecret = request.headers.get('x-webhook-secret');

  if (incomingSecret !== secret) {
    console.warn('[WebhookTrainingComplete] Rejected request with invalid or missing webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Parse Supabase webhook payload ----
  let payload: {
    type?: string;
    table?: string;
    schema?: string;
    record?: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const record = payload?.record;

  // Guard: log and ignore any update that does not represent a completed job with an adapter
  if (!record) {
    return NextResponse.json({ ok: true, message: 'Ignored — no record in payload' });
  }

  if (record.status !== 'completed' || !record.adapter_file_path) {
    return NextResponse.json({
      ok: true,
      message: 'Ignored — conditions not met (status or adapter_file_path)',
      receivedStatus: record.status,
      hasAdapterPath: Boolean(record.adapter_file_path),
    });
  }

  // Guard: require user_id (identity spine requirement — all records must have user_id)
  if (!record.user_id) {
    console.error(
      `[WebhookTrainingComplete] Job ${record.id} has no user_id — cannot fire adapter.ready event`
    );
    return NextResponse.json(
      { error: 'Record missing user_id — cannot dispatch event' },
      { status: 422 }
    );
  }

  // ---- Fire Inngest event ----
  try {
    await inngest.send({
      name: 'pipeline/adapter.ready',
      data: {
        jobId: record.id as string,
        userId: record.user_id as string,
        adapterFilePath: record.adapter_file_path as string,
      },
    });

    console.log(
      `[WebhookTrainingComplete] Fired pipeline/adapter.ready for job ${record.id}`
    );

    return NextResponse.json({
      ok: true,
      jobId: record.id,
      message: 'pipeline/adapter.ready event sent to Inngest',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[WebhookTrainingComplete] Failed to send Inngest event for job ${record.id}:`,
      message
    );
    return NextResponse.json(
      { error: 'Failed to send event to Inngest' },
      { status: 500 }
    );
  }
}
```

---

## Step 4: TypeScript Verification

Run the TypeScript compiler on all files modified or created across E01, E02, and E03:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit 2>&1 | head -60
```

**Expected output:** Exit code 0, no errors.

**Common errors and fixes:**

| Error message | Cause | Fix |
|---------------|-------|-----|
| `Cannot find module 'tar-stream'` | npm package not installed | Run `npm install tar-stream @types/tar-stream` |
| `Property 'pipeline/adapter.ready' does not exist on type 'InngestEvents'` | E02 edit to `client.ts` incomplete | Re-read `src/inngest/client.ts` and verify the event type was added |
| `Module has no exported member 'autoDeployAdapter'` | E02 file creation incomplete | Re-read `src/inngest/functions/auto-deploy-adapter.ts` — ensure `export const autoDeployAdapter` exists |
| `Property 'send' does not exist on type 'Inngest...'` | Wrong inngest import | Confirm `inngest` is imported from `@/inngest/client` |

---

## Step 5: Lint Check

Run ReadLints on the new webhook route:
- `src/app/api/webhooks/training-complete/route.ts`

Fix any errors. Do not fix pre-existing lint warnings.

---

## Step 6: Git Commit

Stage and commit all changes from E01, E02, and E03:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
git add src/inngest/client.ts
git add src/inngest/functions/auto-deploy-adapter.ts
git add src/inngest/functions/index.ts
git add src/app/api/webhooks/training-complete/route.ts
git add package.json package-lock.json
git status
```

Verify the staged files look correct (only the files listed above should be staged), then commit:

```bash
git commit -m "feat: auto-deploy adapter to HuggingFace and RunPod after training completes

- Add hf_adapter_path column to pipeline_training_jobs (SAOL migration)
- Add pipeline/adapter.ready event type to Inngest client
- Create auto-deploy-adapter Inngest function (7 steps: download, extract, HF push, RunPod update, vLLM reload, DB records)
- Register autoDeployAdapter in Inngest function registry
- Create webhook route /api/webhooks/training-complete to receive Supabase DB webhook
- Install tar-stream for in-memory tar.gz extraction"
```

Then push:

```bash
git push origin main
```

---

## Step 7: Human Actions Required Before End-to-End Testing

The following steps require human action in external dashboards. They cannot be automated by code.

### Human Action H1 — Add Vercel Environment Variables

In Vercel Dashboard → Project `v2-modules` → Settings → Environment Variables, add the following for **Production** and **Preview** environments:

| Variable | Value | How to get the value |
|----------|-------|----------------------|
| `HF_TOKEN` | HuggingFace API token | HuggingFace → Settings → Access Tokens → New token (write permission, access to `BrightHub2` org) |
| `HF_ORG` | `BrightHub2` | Confirmed — this is the existing HF org used for the existing adapter `6fd5ac79` |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Confirmed — matches existing repos `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | Confirmed — this is the existing inference endpoint with `LORA_MODULES` already configured |
| `WEBHOOK_SECRET` | (generate below) | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — copy the output |

**Important:** `GPU_CLUSTER_API_KEY`, `INFERENCE_API_URL`, `INNGEST_EVENT_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` should already be set in Vercel from previous work. Verify they exist.

After adding all variables, trigger a new Vercel deployment (or wait for the git push from Step 6 to trigger one automatically).

### Human Action H2 — Configure Supabase Database Webhook

After the Vercel deployment from Step 6 has completed (so the `/api/webhooks/training-complete` route exists at your URL), configure the webhook in Supabase:

**Location:** Supabase Dashboard → Project `hqhtbxlgzysfbekexwku` → Database → Webhooks → Create a new webhook

**Configuration:**

| Field | Value |
|-------|-------|
| **Webhook name** | `pipeline-adapter-ready` |
| **Table** | `pipeline_training_jobs` |
| **Events** | `UPDATE` (check this box only — not INSERT or DELETE) |
| **URL** | `https://v4-show.vercel.app/api/webhooks/training-complete` |
| **HTTP method** | POST |
| **HTTP headers** | Add custom header: Key = `x-webhook-secret`, Value = the same value you set for `WEBHOOK_SECRET` in H1 |

**Note:** Supabase Database Webhooks do not support column-level filter conditions in the UI. All UPDATE events on the table will be sent to the route. The route code handles the filtering — only `status=completed AND adapter_file_path IS NOT NULL` triggers the Inngest event.

**Click Save** after configuring.

### Human Action H3 — Verify Inngest Function Registration

After the Vercel deployment completes:

1. Go to the Inngest Dashboard (`https://app.inngest.com`)
2. Navigate to Functions
3. Confirm `auto-deploy-adapter` appears in the registered functions list alongside `dispatch-training-job`, `process-rag-document`, and `dispatch-training-job-failure`

If `auto-deploy-adapter` does not appear:
- Go to Inngest Dashboard → Apps → your app
- Click "Sync" to manually re-sync with the Vercel deployment
- Check that `src/inngest/functions/index.ts` correctly exports `autoDeployAdapter` in the `inngestFunctions` array

---

## Step 8: End-to-End Verification

### Step 8a: Test the Webhook Route Directly

After deployment, test the webhook route using curl to confirm it is reachable and validates the secret correctly:

```bash
# Test 1: Missing secret — should return 401
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"completed","adapter_file_path":"test.tar.gz","user_id":"test"}}' \
  | head -c 200

# Test 2: Wrong secret — should return 401
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wrong-secret" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"completed","adapter_file_path":"test.tar.gz","user_id":"test"}}' \
  | head -c 200
```

**Expected output for both:** `{"error":"Unauthorized"}` with HTTP 401.

```bash
# Test 3: Correct secret but pending status — should return 200 with "Ignored" message
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET_HERE" \
  -d '{"type":"UPDATE","record":{"id":"test","status":"running","adapter_file_path":null,"user_id":"test"}}' \
  | head -c 200
```

**Expected output:** `{"ok":true,"message":"Ignored — conditions not met..."}`

### Step 8b: SAOL Verification — Check Current DB State

Confirm the `hf_adapter_path` column exists and see which jobs (if any) have been auto-deployed:

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

### Step 8c: Trigger Auto-Deploy for Existing Completed Job

If job `608fbb9b-2f05-450b-b38b-f029f2f2b70b` is completed and `hf_adapter_path` is null, you can trigger the auto-deploy manually by simulating the Supabase webhook.

First, get the actual `user_id` for the job:

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
  console.log('job_id:', job.id);
  console.log('user_id:', job.user_id);
  console.log('status:', job.status);
  console.log('adapter_file_path:', job.adapter_file_path);
  console.log('hf_adapter_path:', job.hf_adapter_path || '(null — auto-deploy not yet run)');
})();"
```

Then trigger the webhook (replace `YOUR_WEBHOOK_SECRET` and `ACTUAL_USER_ID` with real values):

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

**Expected output:** `{"ok":true,"jobId":"608fbb9b-...","message":"pipeline/adapter.ready event sent to Inngest"}`

### Step 8d: Monitor Inngest Run

After the curl trigger in Step 8c:

1. Go to Inngest Dashboard → Runs
2. Look for a new run of `auto-deploy-adapter`
3. Watch the steps execute in sequence (fetch-job, download-adapter, push-to-huggingface, update-runpod-lora-modules, vllm-hot-reload, update-inference-endpoints-db, update-job-hf-path)
4. Confirm all steps show green (success)

### Step 8e: SAOL Post-Deployment Verification

After the Inngest run completes successfully, verify the database was updated:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Check hf_adapter_path was written
  const jobs = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'id, hf_adapter_path, updated_at'
  });
  const job = jobs.data[0];
  console.log('pipeline_training_jobs.hf_adapter_path:', job?.hf_adapter_path || '✗ null (auto-deploy may have failed)');

  // Check inference endpoint records were created
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

**Expected output:**
```
pipeline_training_jobs.hf_adapter_path: BrightHub2/lora-emotional-intelligence-608fbb9b

pipeline_inference_endpoints records: 2
 - control | ready | (no adapter)
 - adapted | ready | BrightHub2/lora-emotional-intelligence-608fbb9b
```

---

## E03 Success Criteria

Confirm ALL of the following before declaring the feature complete:

- [ ] `src/app/api/webhooks/training-complete/route.ts` created with correct content
- [ ] `npx tsc --noEmit` returns exit code 0
- [ ] ReadLints on the webhook route shows no errors
- [ ] Code committed and pushed to git
- [ ] Vercel deployment succeeded (check Vercel dashboard)
- [ ] All 5 env vars added to Vercel (H1)
- [ ] Supabase Database Webhook configured pointing at the deployed URL (H2)
- [ ] `auto-deploy-adapter` appears in Inngest Dashboard Functions list (H3)
- [ ] Webhook route rejects requests with wrong/missing secret (Step 8a)
- [ ] SAOL confirms `hf_adapter_path` is populated after Inngest run (Step 8e)
- [ ] SAOL confirms `pipeline_inference_endpoints` records were created (Step 8e)

---

## Complete Feature Summary

The full automated adapter deployment pipeline is now operational:

```
Training job completes on RunPod
        ↓
RunPod worker writes: pipeline_training_jobs.status = 'completed', adapter_file_path = 'lora-models/adapters/{id}.tar.gz'
        ↓
Supabase Database Webhook fires (UPDATE on pipeline_training_jobs)
        ↓
POST /api/webhooks/training-complete
  - Validates x-webhook-secret header
  - Checks status='completed' AND adapter_file_path IS NOT NULL
  - Calls inngest.send('pipeline/adapter.ready')
        ↓
Inngest autoDeployAdapter function runs (~2 min):
  Step 1: Fetch + validate job (idempotency: skip if hf_adapter_path already set)
  Step 2: Download tar.gz from Supabase Storage → base64
  Step 3: Extract tar.gz in memory → push files to HuggingFace Hub
          → creates BrightHub2/lora-emotional-intelligence-{id[:8]}
  Step 4: Update RunPod endpoint ei82ickpenoqlp LORA_MODULES via GraphQL API
          → appends {"name":"adapter-{id[:8]}","path":"BrightHub2/lora-..."}
  Step 5: (Non-fatal) vLLM /v1/load_lora_adapter — hot reload on live workers
  Step 6: Create pipeline_inference_endpoints records (control + adapted, status='ready')
  Step 7: Write hf_adapter_path to pipeline_training_jobs (deployment complete signal)
        ↓
User visits /pipeline/jobs/{id}/results
"Test Adapter" button is enabled — A/B test runs immediately
No manual steps required
```

---

## All Files Modified Across E01, E02, E03

| File | Change | Section |
|------|--------|---------|
| `pipeline_training_jobs` (Supabase DB) | Added `hf_adapter_path TEXT` column | E01 |
| `package.json` | Added `tar-stream` dependency | E01 |
| `.env.local` | Added 5 new env var placeholders | E01 |
| `src/inngest/client.ts` | Added `pipeline/adapter.ready` event type | E02 |
| `src/inngest/functions/auto-deploy-adapter.ts` | **NEW FILE** — 7-step auto-deploy function | E02 |
| `src/inngest/functions/index.ts` | Registered `autoDeployAdapter` | E02 |
| `src/app/api/webhooks/training-complete/route.ts` | **NEW FILE** — Supabase webhook receiver | E03 |

+++++++++++++++++
