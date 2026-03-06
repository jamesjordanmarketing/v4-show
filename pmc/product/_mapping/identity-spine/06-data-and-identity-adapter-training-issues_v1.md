# BRun LoRA Adapter Training — Investigation & Implementation Specification

**Document:** `06-data-and-identity-adapter-training-issues_v1.md`  
**Date:** 2026-02-23  
**Status:** Specification — Ready for Implementation  
**Scope:** Complete adapter training pipeline fix for `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

---

## Part 1 — Investigation: How the Previous Working Adapter Was Created

### 1.1 Summary Finding

The previous working LoRA adapter training system is a **three-component pipeline**:

```
[Next.js POST /api/pipeline/jobs]
        ↓ Creates DB record (status: 'pending')
        ↓ Triggers Supabase Edge Function
[Supabase Edge Function: process-pipeline-jobs]
        ↓ Fetches pending jobs
        ↓ Gets signed URL for dataset file
        ↓ POSTs to RunPod Serverless endpoint /run
[RunPod Serverless: brightrun-lora-trainer-qwen]
        ↓ handler.py receives job
        ↓ train_lora.py runs QLoRA training
        ↓ Writes progress directly to Supabase DB
        ↓ Uploads adapter to Supabase Storage (lora-models bucket)
        ↓ Updates DB: status='completed', adapter_file_path='lora-models/adapters/{job_id}.tar.gz'
```

### 1.2 Component 1 — Next.js API Route: `POST /api/pipeline/jobs`

**File:** `src/app/api/pipeline/jobs/route.ts`  
**Status:** ✅ Exists and is correct. No changes needed.

**What it does:**
1. Authenticates the user via `requireAuth`
2. Validates `jobName` and `datasetId` are present
3. Calls `createPipelineJob(user.id, body)` from `pipeline-service.ts`
4. Returns HTTP 201 with the created job record

**What `createPipelineJob` does:**
- Converts lay-person params to technical hyperparameters via `convertToTechnicalParams`
- Looks up the dataset's `storage_path` and `storage_bucket` from the `datasets` table
- Inserts a row into `pipeline_training_jobs` with `status: 'pending'`
- Stores: `learning_rate`, `batch_size`, `epochs`, `rank`, `alpha`, `dropout`, `dataset_file_path` (from `datasets.storage_path`), `dataset_name`
- **Does NOT call RunPod** — that is the job of the Edge Function
- Returns the created job

**Critical gap confirmed:** The API route does **not** trigger the Edge Function after creating the job record. The Edge Function must be triggered externally.

### 1.3 Component 2 — Supabase Edge Function: `process-pipeline-jobs`

**File:** `supabase/functions/process-pipeline-jobs/index.ts`  
**Status:** ✅ Exists and is correct in logic. **NOT being triggered.**

**What it does:**
1. Queries `pipeline_training_jobs` for all rows with `status = 'pending'` (up to 5 at a time, FIFO)
2. For each pending job:
   a. Updates status to `'queued'`
   b. Gets a signed URL (1 hour expiry) for the dataset file from Supabase Storage
   c. Constructs the RunPod `input` payload (see exact format in §1.5)
   d. POSTs to `${GPU_CLUSTER_API_URL}/run` with `Authorization: Bearer ${GPU_CLUSTER_API_KEY}`
   e. If RunPod returns an `id`, updates job: `status='initializing'`, `runpod_job_id=<id>`, `runpod_endpoint_id=<endpointId>`
   f. If RunPod call fails, marks job `status='failed'` with error message

**Environment variables required (Supabase Edge Function secrets):**
```
SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/<endpoint-id>
GPU_CLUSTER_API_KEY=<runpod-api-key>
```

**How it was previously triggered:** The README for `brightrun-trainer` references:
> `supabase functions deploy process-training-jobs`

And the README says:
> "Update Supabase Edge Function Secrets" and "Deploy edge function"

The Edge Function is designed to be invoked via Supabase's scheduling (pg_cron or a Vercel cron endpoint that calls the edge function URL), OR it can be called directly via HTTP after job creation.

**Current problem:** The edge function exists and is deployed (it's in `supabase/functions/`) but **nothing is calling it**. The `vercel.json` has no cron for this, and `POST /api/pipeline/jobs` does not trigger it after job creation.

### 1.4 Component 3 — RunPod Serverless Worker: `brightrun-lora-trainer-qwen`

**Docker image:** `brighthub/brightrun-trainer:v19`  
**Source files:** `C:\Users\james\Master\BrightHub\BRun\brightrun-trainer\`

**Files:**
- `handler.py` — RunPod serverless entry point
- `train_lora.py` — QLoRA training logic
- `status_manager.py` — In-memory progress tracking

**What the worker does when invoked:**

| Stage | Progress | DB Update |
|-------|----------|-----------|
| Validation | 0% | Updates `status='failed'` if validation fails |
| Initializing | 0% | `status='initializing'` |
| Downloading dataset | 5% | `status='running', progress=5` |
| Preparing dataset | 10% | `status='running', progress=10` |
| Loading model | 15% | `status='running', progress=15` |
| Configuring LoRA | 20% | (in-memory only) |
| Training | 25–95% | `status='running', progress=N, current_epoch, current_step` every 30s |
| Saving adapter | 95% | `status='running', progress=95` |
| Uploading to Supabase | 97% | `status='running', progress=97` |
| Complete | 100% | `status='completed', final_loss, training_time_seconds, adapter_file_path='lora-models/adapters/{job_id}.tar.gz'` |
| Failed | — | `status='failed', error_message=<text>` |

**The worker writes directly to Supabase** using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` environment variables already configured in the RunPod endpoint. It does NOT rely on a callback URL for progress — it writes directly.

**Dataset format supported:**
1. OpenAI Chat format: `{"messages": [{"role": "user", "content": "..."}, ...]}`
2. BrightRun format: `{"system_prompt": "...", "current_user_input": "...", "target_response": "..."}`
3. Skips `_meta` header lines in JSONL

**Model path:** Uses `MODEL_PATH` env var (`/workspace/models/Qwen3-Next-80B-A3B-Instruct`) if it exists locally on the network volume, otherwise downloads from HuggingFace using the `base_model` hyperparameter.

**Adapter output:** Saves to Supabase Storage bucket `lora-models`, path `adapters/{job_id}.tar.gz`. Updates `pipeline_training_jobs.adapter_file_path = 'lora-models/adapters/{job_id}.tar.gz'`.

### 1.5 The Exact RunPod API Payload Contract

The Edge Function sends this payload to `${GPU_CLUSTER_API_URL}/run`:

```json
{
  "input": {
    "job_id": "<pipeline_training_jobs.id>",
    "dataset_url": "<signed-url-to-dataset-jsonl>",
    "hyperparameters": {
      "base_model": "mistralai/Mistral-7B-Instruct-v0.2",
      "learning_rate": <job.learning_rate>,
      "batch_size": <job.batch_size>,
      "epochs": <job.epochs>,
      "rank": <job.rank>,
      "alpha": <job.alpha || 32>,
      "dropout": <job.dropout || 0.05>
    },
    "gpu_config": {
      "type": "<job.gpu_type || 'NVIDIA A40'>",
      "count": <job.gpu_count || 1>
    }
  }
}
```

**RunPod response (async):**
```json
{
  "id": "<runpod-job-id>",
  "status": "IN_QUEUE"
}
```

**Note on `base_model`:** The Edge Function hardcodes `mistralai/Mistral-7B-Instruct-v0.2`. However, the RunPod worker uses the `MODEL_PATH` env var to find the locally cached Qwen model. The `base_model` field in the payload is used as a fallback only if the local path does not exist. Since the network volume has the Qwen model at `/workspace/models/Qwen3-Next-80B-A3B-Instruct`, the `base_model` in the payload is largely a label for logging. **This should be updated to `Qwen/Qwen3-Next-80B-A3B-Instruct` for accuracy**, but the current system works because the worker prioritizes the `MODEL_PATH` env var.

### 1.6 Dataset Path Resolution

The Edge Function resolves the dataset file using this priority:
1. `job.dataset_file_path` (set during job creation from `datasets.storage_path`)
2. Falls back to querying `datasets` table by `job.dataset_id` → `storage_path` + `storage_bucket`

Then creates a **Supabase signed URL** (1-hour expiry) and passes it as `dataset_url` to RunPod.

**Storage bucket:** The signed URL is generated from `training-files` bucket (hardcoded in the edge function's first path), or from `dataset.storage_bucket` in the fallback path.

**Important:** `datasets.storage_path` is the path **within** the bucket, not the full URL.

### 1.7 Why Training Was Previously Working (Root Cause of Current Failure)

The **Supabase Edge Function was deployed and being triggered**, but at some point the trigger was removed or never configured in the current `v2-modules` deployment. Specifically:

1. The edge function code exists at `supabase/functions/process-pipeline-jobs/index.ts`
2. The `POST /api/pipeline/jobs` route creates the DB record correctly
3. **But nothing calls the edge function** after job creation
4. Jobs sit permanently in `status: 'pending'`
5. There is no Vercel cron for this edge function in `vercel.json`

---

## Part 2 — Resource Inventory

### 2.1 What We Have

| Resource | Status | Location |
|----------|--------|----------|
| RunPod Serverless Endpoint | ✅ Active | `brightrun-lora-trainer-qwen` (Docker: `brighthub/brightrun-trainer:v19`) |
| RunPod Endpoint Environment Variables | ✅ Set | `MODEL_PATH`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `S3_*`, `NETWORK_VOLUME_ID` |
| Supabase Edge Function | ✅ Exists | `supabase/functions/process-pipeline-jobs/index.ts` |
| DB Table `pipeline_training_jobs` | ✅ Exists | With all required columns |
| DB Table `pipeline_training_metrics` | ✅ Exists | For progress tracking |
| Next.js job creation API | ✅ Exists | `src/app/api/pipeline/jobs/route.ts` |
| Pipeline service | ✅ Exists | `src/lib/services/pipeline-service.ts` |
| Hyperparameter utils | ✅ Exists | `src/lib/pipeline/hyperparameter-utils.ts` |
| UI: Configure page | ✅ Exists (fixed BUG-011) | `src/app/(dashboard)/pipeline/configure/page.tsx` |
| UI: Job detail page | ✅ Exists | `src/app/(dashboard)/pipeline/jobs/[jobId]/page.tsx` |
| Supabase Storage bucket `lora-models` | ✅ Exists | For adapter output |
| Supabase Storage bucket `training-files` | ✅ Exists | For dataset input |

### 2.2 What We Are Missing

| Resource | Status | What's Needed |
|----------|--------|---------------|
| **Trigger for Edge Function** | ❌ Missing | Something must call the edge function after job creation |
| **Vercel env vars** for edge function call | ❓ Unknown | `GPU_CLUSTER_API_URL` and `GPU_CLUSTER_API_KEY` in Vercel |
| **Supabase secrets** for edge function | ❓ Unknown | `GPU_CLUSTER_API_URL` and `GPU_CLUSTER_API_KEY` as Supabase secrets |
| `base_model` update in edge function | 🔧 Minor | Should be `Qwen/Qwen3-Next-80B-A3B-Instruct` not Mistral |

### 2.3 Everything Needed to Create a LoRA Adapter

| Element | Value / Location | Status |
|---------|-----------------|--------|
| **Training dataset** (JSONL) | Stored in Supabase Storage `training-files` bucket | ✅ |
| **Signed URL** for dataset | Generated by Edge Function (1-hour expiry) | ✅ |
| **Base model** | `Qwen/Qwen3-Next-80B-A3B-Instruct` on network volume at `/workspace/models/Qwen3-Next-80B-A3B-Instruct` | ✅ |
| **Hyperparameters** | `learning_rate`, `batch_size`, `epochs`, `rank`, `alpha`, `dropout` — computed by `hyperparameter-utils.ts`, stored in `pipeline_training_jobs` | ✅ |
| **GPU** | NVIDIA A100 80GB (configured in RunPod endpoint) | ✅ |
| **RunPod API key** | Must be set as env var `GPU_CLUSTER_API_KEY` | ❓ Verify in Vercel + Supabase |
| **RunPod endpoint ID/URL** | Must be set as env var `GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/<brightrun-lora-trainer-qwen-id>` | ❓ Verify in Vercel + Supabase |
| **Adapter output destination** | Supabase Storage `lora-models/adapters/{job_id}.tar.gz` | ✅ |
| **DB progress updates** | Worker writes directly via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | ✅ |

---

## Part 3 — Implementation Specification

### 3.1 Overview of Changes

The fix is **minimal and surgical**: the only missing piece is **triggering the Supabase Edge Function after job creation**. Rather than a complex new Inngest function or cron job, the cleanest solution is to **call the Edge Function directly from `POST /api/pipeline/jobs`** after the DB record is created. This is a fire-and-forget call that does not block the response.

Additionally, we add a Vercel cron endpoint as a safety net to catch any jobs that slip through (e.g., if the direct trigger fails due to a transient error).

### 3.2 Changes Required

#### Change 1: Update `POST /api/pipeline/jobs` to trigger Edge Function

**File:** `src/app/api/pipeline/jobs/route.ts`

After `createPipelineJob` succeeds and returns the job, fire a non-blocking HTTP request to the Supabase Edge Function URL. The response from the job creation is returned to the client immediately — the edge function call does not block it.

**New environment variable required:**
```
SUPABASE_EDGE_FUNCTION_URL=https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1
SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Or alternatively use the service role key:
```
SUPABASE_SERVICE_ROLE_KEY=<already set>
```

The edge function is called with:
```
POST https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/process-pipeline-jobs
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Important:** This call is **fire-and-forget** using `.catch(() => {})` — if it fails, the job record still exists in the DB at `status='pending'` and the cron fallback will pick it up.

#### Change 2: Add Vercel cron endpoint as safety net

**File:** `src/app/api/cron/dispatch-training-jobs/route.ts` (NEW)

This cron endpoint:
1. Calls the Supabase Edge Function `process-pipeline-jobs`
2. Runs every minute: `"* * * * *"` in `vercel.json`
3. Is protected by `CRON_SECRET` (already established pattern)

**vercel.json update:**
```json
{
  "crons": [
    {
      "path": "/api/cron/dispatch-training-jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

#### Change 3: Update `base_model` in Edge Function

**File:** `supabase/functions/process-pipeline-jobs/index.ts`

Change line 19:
```typescript
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
```
To:
```typescript
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
```

This ensures the `base_model` field in the RunPod payload accurately reflects the model being used, which helps with logging and fallback model download (if the network volume cache ever misses).

#### Change 4: Verify Supabase Edge Function secrets (manual step)

The following must be set as Supabase Edge Function secrets:
```bash
supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/<brightrun-lora-trainer-qwen-endpoint-id>
supabase secrets set GPU_CLUSTER_API_KEY=<runpod-api-key>
```

And in Vercel environment variables:
```
SUPABASE_EDGE_FUNCTION_URL=https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1
```
(The `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are already set.)

---

## Part 4 — Detailed File Specifications

### 4.1 File: `src/app/api/pipeline/jobs/route.ts`

**Current state:** Creates job in DB, returns response. Does not trigger edge function.

**New state:** After successful job creation, fire-and-forget call to `process-pipeline-jobs` edge function.

**Full updated file:**

```typescript
/**
 * Pipeline Jobs API
 * 
 * GET  - List user's pipeline jobs
 * POST - Create new pipeline job, then trigger Edge Function dispatcher
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { createPipelineJob, listPipelineJobs } from '@/lib/services/pipeline-service';
import { CreatePipelineJobRequest } from '@/types/pipeline';

// ============================================
// Edge Function Dispatcher (fire-and-forget)
// ============================================

/**
 * Triggers the Supabase Edge Function that picks up pending jobs
 * and dispatches them to the RunPod training endpoint.
 * 
 * This is fire-and-forget — failures do not affect the API response.
 * The Vercel cron at /api/cron/dispatch-training-jobs provides a
 * safety-net fallback.
 */
async function triggerJobDispatcher(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[PIPELINE-JOBS] Cannot trigger dispatcher: missing Supabase env vars');
    return;
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-pipeline-jobs`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '(no body)');
      console.error(`[PIPELINE-JOBS] Dispatcher returned HTTP ${response.status}: ${text}`);
    } else {
      const data = await response.json().catch(() => ({}));
      console.log('[PIPELINE-JOBS] Dispatcher triggered successfully:', {
        processed: data.processed,
        results: data.results,
      });
    }
  } catch (err) {
    // Non-blocking — log and continue
    console.error('[PIPELINE-JOBS] Failed to trigger dispatcher (cron fallback will retry):', err);
  }
}

// ============================================
// GET /api/pipeline/jobs
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    
    const result = await listPipelineJobs(user.id, { 
      limit, 
      offset, 
      status: status as any 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/pipeline/jobs
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body: CreatePipelineJobRequest = await request.json();
    
    if (!body.jobName || !body.datasetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobName, datasetId' },
        { status: 400 }
      );
    }
    
    const result = await createPipelineJob(user.id, body);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    // Fire-and-forget: trigger the Edge Function dispatcher
    // This does NOT await — the HTTP 201 response is returned immediately.
    // If this trigger fails, the cron at /api/cron/dispatch-training-jobs
    // will pick up the pending job within 1 minute.
    triggerJobDispatcher().catch(() => {
      // Already logged inside triggerJobDispatcher — nothing more to do here
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 File: `src/app/api/cron/dispatch-training-jobs/route.ts` (NEW FILE)

**Purpose:** Vercel cron safety-net. Runs every minute. Calls the Supabase Edge Function to process any pending jobs that were not dispatched by the fire-and-forget trigger in `POST /api/pipeline/jobs`.

**Full file:**

```typescript
/**
 * Cron: Dispatch Training Jobs
 *
 * Runs every minute as a Vercel cron job.
 * Calls the Supabase Edge Function process-pipeline-jobs which picks up
 * pending pipeline_training_jobs records and submits them to RunPod.
 *
 * This is a safety-net for jobs that were not dispatched immediately
 * after creation (e.g., due to transient Edge Function errors).
 *
 * Schedule: Every minute (* * * * *)
 * Vercel cron secret: CRON_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CRON/dispatch-training-jobs] Missing Supabase environment variables');
    return NextResponse.json(
      { success: false, error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-pipeline-jobs`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(no body)');
      console.error('[CRON/dispatch-training-jobs] Edge function error:', {
        status: response.status,
        body: errorText,
      });
      return NextResponse.json(
        { success: false, error: `Edge function returned HTTP ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('[CRON/dispatch-training-jobs] Dispatch result:', data);

    return NextResponse.json({
      success: true,
      processed: data.processed || 0,
      results: data.results || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CRON/dispatch-training-jobs] Fetch error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

### 4.3 File: `vercel.json`

**Current state:**
```json
{
  "framework": "nextjs",
  "functions": {
    "app/api/**/*": {
      "maxDuration": 60
    },
    "app/api/rag/documents/*/upload": {
      "maxDuration": 300
    },
    "app/api/rag/documents/*/process": {
      "maxDuration": 300
    }
  }
}
```

**New state (add crons section):**
```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/dispatch-training-jobs",
      "schedule": "* * * * *"
    }
  ],
  "functions": {
    "app/api/**/*": {
      "maxDuration": 60
    },
    "app/api/rag/documents/*/upload": {
      "maxDuration": 300
    },
    "app/api/rag/documents/*/process": {
      "maxDuration": 300
    }
  }
}
```

### 4.4 File: `supabase/functions/process-pipeline-jobs/index.ts`

**Change:** Update `BASE_MODEL` constant from `mistralai/Mistral-7B-Instruct-v0.2` to `Qwen/Qwen3-Next-80B-A3B-Instruct`.

**Change only line 19:**
```typescript
// BEFORE:
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

// AFTER:
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
```

**Also:** The edge function must be redeployed after this change:
```bash
supabase functions deploy process-pipeline-jobs
```

---

## Part 5 — SAOL Database Verification

**SAOL must be used for ALL database verification steps.** Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

### 5.1 Verify `pipeline_training_jobs` table structure

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentIntrospectSchema({table:'pipeline_training_jobs'});
  console.log(JSON.stringify(r,null,2));
})();"
```

**Expected columns present:** `id`, `user_id`, `job_name`, `status`, `dataset_id`, `dataset_name`, `dataset_file_path`, `learning_rate`, `batch_size`, `epochs`, `rank`, `alpha`, `dropout`, `runpod_job_id`, `runpod_endpoint_id`, `progress`, `current_epoch`, `current_step`, `total_steps`, `final_loss`, `training_time_seconds`, `adapter_file_path`, `adapter_download_url`, `error_message`, `error_details`, `created_at`, `started_at`, `completed_at`, `updated_at`

### 5.2 Check for stuck pending jobs

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentQuery({
    table:'pipeline_training_jobs',
    where:[{column:'status',operator:'eq',value:'pending'}],
    select:'id,job_name,created_at,dataset_id,dataset_file_path,learning_rate',
    orderBy:{column:'created_at',ascending:true}
  });
  console.log('Stuck pending jobs:',r.data?.length);
  r.data?.forEach(j=>console.log(j.created_at,j.id.slice(0,8),j.job_name));
})();"
```

### 5.3 Verify datasets have storage_path set

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentExecuteSQL({
    sql:\`
      SELECT d.id, d.name, d.storage_path, d.storage_bucket,
             COUNT(ptj.id) AS job_count
      FROM datasets d
      LEFT JOIN pipeline_training_jobs ptj ON ptj.dataset_id = d.id
      GROUP BY d.id, d.name, d.storage_path, d.storage_bucket
      ORDER BY d.created_at DESC
      LIMIT 10
    \`,
    transport:'pg'
  });
  console.log(JSON.stringify(r.rows,null,2));
})();"
```

**Expected:** `storage_path` is not NULL for datasets being used in training. If NULL, the Edge Function will fall back to the `datasets` table lookup which also checks `storage_bucket`.

### 5.4 Verify the adapter output after a successful run

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentQuery({
    table:'pipeline_training_jobs',
    where:[{column:'status',operator:'eq',value:'completed'}],
    select:'id,job_name,adapter_file_path,final_loss,training_time_seconds,completed_at',
    orderBy:{column:'completed_at',ascending:false},
    limit:5
  });
  r.data?.forEach(j=>console.log(j.completed_at,j.id.slice(0,8),j.job_name,'adapter:',j.adapter_file_path));
})();"
```

---

## Part 6 — Environment Variables Required

### 6.1 Vercel Environment Variables (must be set in Vercel dashboard)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hqhtbxlgzysfbekexwku.supabase.co` | Already set — used for Edge Function URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Already set — used to authenticate Edge Function call |
| `CRON_SECRET` | `<random-string>` | Protects cron endpoint — may already be set |

### 6.2 Supabase Edge Function Secrets (must be set via Supabase CLI)

```bash
supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/<brightrun-lora-trainer-qwen-endpoint-id>
supabase secrets set GPU_CLUSTER_API_KEY=<runpod-api-key>
```

To find the endpoint ID: RunPod Console → Serverless → Endpoints → Click `brightrun-lora-trainer-qwen` → copy the alphanumeric ID from the URL or endpoint details page.

### 6.3 RunPod Worker Environment Variables (already set in endpoint)

| Variable | Value | Purpose |
|----------|-------|---------|
| `HF_HOME` | `/workspace/.cache/huggingface` | HuggingFace cache |
| `TRANSFORMERS_CACHE` | `/workspace/models` | Model cache |
| `MODEL_PATH` | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` | Cached base model |
| `SUPABASE_URL` | `https://hqhtbxlgzysfbekexwku.supabase.co` | For direct DB writes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | For direct DB writes |
| `S3_ENDPOINT_URL` | `https://s3api-eu-ro-1.runpod.io` | RunPod S3 (supplemental) |
| `S3_ACCESS_KEY_ID` | `user_2yeQQ...` | RunPod S3 (supplemental) |
| `S3_SECRET_ACCESS_KEY` | `rps_9PN2B3...` | RunPod S3 (supplemental) |
| `NETWORK_VOLUME_ID` | `4jw1fcocwl` | RunPod S3 bucket name |

---

## Part 7 — Implementation Checklist

### Phase A: Pre-implementation verification (manual)

- [ ] **A1:** Log into RunPod Console → Serverless → Endpoints → Find `brightrun-lora-trainer-qwen` → Copy the endpoint ID (alphanumeric, e.g. `abc123xyz`)
- [ ] **A2:** Confirm `brightrun-lora-trainer-qwen` has Docker image `brighthub/brightrun-trainer:v19`
- [ ] **A3:** Confirm all environment variables listed in §6.3 are set on the RunPod endpoint
- [ ] **A4:** Get RunPod API key from RunPod Console → Settings → API Keys
- [ ] **A5:** Set Supabase secrets (requires Supabase CLI):
  ```bash
  supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/<endpoint-id>
  supabase secrets set GPU_CLUSTER_API_KEY=<api-key>
  ```
- [ ] **A6:** Redeploy Edge Function: `supabase functions deploy process-pipeline-jobs`

### Phase B: Code changes (agent implements)

- [ ] **B1:** Update `src/app/api/pipeline/jobs/route.ts` — add `triggerJobDispatcher` fire-and-forget call
- [ ] **B2:** Create `src/app/api/cron/dispatch-training-jobs/route.ts` — new cron endpoint
- [ ] **B3:** Update `vercel.json` — add cron schedule for dispatch-training-jobs
- [ ] **B4:** Update `supabase/functions/process-pipeline-jobs/index.ts` — change `BASE_MODEL`
- [ ] **B5:** Run `ReadLints` on all modified files

### Phase C: Verification (after deploy)

- [ ] **C1:** Navigate to `/pipeline/configure`, select a dataset, submit a job
- [ ] **C2:** Verify `pipeline_training_jobs` row created with `status='pending'` (via SAOL query §5.2)
- [ ] **C3:** Wait ~10 seconds; verify status changes to `'queued'` then `'initializing'` (edge function triggered)
- [ ] **C4:** Monitor RunPod Console → Jobs to confirm a new job appeared
- [ ] **C5:** Wait for training to complete; verify `status='completed'` and `adapter_file_path` is set (via SAOL query §5.4)
- [ ] **C6:** Navigate to `/pipeline/jobs/[jobId]` and verify the job shows progress, then completion

---

## Part 8 — Architecture Diagram

```
USER clicks "Start Training"
         │
         ▼
POST /api/pipeline/jobs (Vercel Serverless, <1s)
  1. requireAuth(request)  — get user.id
  2. createPipelineJob(user.id, body)
     ├── convertToTechnicalParams(lay-person params)
     ├── GET datasets WHERE id=datasetId → storage_path, storage_bucket
     └── INSERT pipeline_training_jobs {status:'pending', learning_rate, ...}
  3. triggerJobDispatcher() [fire-and-forget, ~200ms, does NOT block response]
  4. Return HTTP 201 { success:true, data: { id, status:'pending', ... } }
         │
         ▼ (non-blocking, ~200ms after response returned to user)
POST supabase/functions/v1/process-pipeline-jobs (Supabase Edge Function, Deno)
  1. SELECT * FROM pipeline_training_jobs WHERE status='pending' LIMIT 5
  2. For each job:
     a. UPDATE status='queued'
     b. GET signed URL (1hr) from Supabase Storage → dataset_url
     c. POST https://api.runpod.ai/v2/<endpoint-id>/run
        { input: { job_id, dataset_url, hyperparameters, gpu_config } }
     d. UPDATE status='initializing', runpod_job_id=<id>
         │
         ▼ (async, RunPod picks up from queue)
RunPod Serverless Worker (brightrun-lora-trainer-qwen, Docker: brightrun-trainer:v19)
  handler.py → train_lora.py
  1. Validate input (job_id, dataset_url, hyperparameters, gpu_config)
  2. UPDATE pipeline_training_jobs SET status='running', progress=5  [direct Supabase]
  3. Download dataset from signed URL → /tmp/dataset.jsonl
  4. Load Qwen model from /workspace/models/Qwen3-Next-80B-A3B-Instruct (network volume)
  5. Configure QLoRA (rank=16, alpha=32, dropout=0.05, target_modules=[q,k,v,o,gate,up,down]_proj)
  6. Train with SFTTrainer (every 30s: UPDATE progress, current_epoch, current_step)
  7. Save adapter → /tmp/adapter/
  8. Create tar.gz archive → /tmp/{job_id}.tar.gz
  9. Upload to Supabase Storage: lora-models/adapters/{job_id}.tar.gz
  10. UPDATE pipeline_training_jobs SET status='completed', adapter_file_path='lora-models/adapters/{job_id}.tar.gz',
        final_loss, training_time_seconds, progress=100
         │
         ▼
UI polls GET /api/pipeline/jobs/{jobId} every 5s
  Reads status, progress, current_epoch, error_message from pipeline_training_jobs
  TrainingProgressPanel shows live progress bar
         │
         ▼ (on completion)
User sees "Training Complete" card
Deploy adapter → pipeline_inference_endpoints records created
```

---

## Part 9 — Bug Log Update

The following entries should be appended to `05-data-and-identity-spine-test-log_v1.md`:

### BUG-013 Update — Root Cause Confirmed

**Date:** 2026-02-23 (updated)  
**Previous Status:** Investigated — partial fix applied  
**New Status:** Root cause confirmed, specification written, ready for implementation

**Root Cause (confirmed):**  
The Supabase Edge Function `process-pipeline-jobs` exists at `supabase/functions/process-pipeline-jobs/index.ts` and contains complete, correct dispatch logic. The problem is that **nothing triggers it**. `POST /api/pipeline/jobs` creates the DB record but does not call the edge function. There is no Vercel cron for it.

**Fix:** See specification at `pmc/product/_mapping/identity-spine/06-data-and-identity-adapter-training-issues_v1.md`.

### New Pattern: P10 — Dead Edge Function (Trigger Missing)

| Pattern | Description | Tables / Files |
|---------|-------------|----------------|
| **P10: Dead Edge Function** | Supabase Edge Function exists and has correct logic but has no trigger. A background process (cron, webhook, or direct call) exists in code but is never invoked. Results in records permanently stuck in intermediate states (e.g., `pending`). | `supabase/functions/process-pipeline-jobs/`, `src/app/api/pipeline/jobs/route.ts`, `pipeline_training_jobs` |

---

## Part 10 — Notes on Identity Spine Compliance

The Supabase Edge Function uses the Supabase client directly (not SAOL), which is acceptable because:
1. It runs in Deno (not Node.js) so SAOL cannot be used
2. It uses the service role key so RLS is bypassed
3. All writes to `pipeline_training_jobs` correctly include `user_id` (the value is preserved from the original row, never re-set by the edge function — only `status` and operational fields are updated)

The RunPod worker's `update_job_status_in_db` function in `train_lora.py` only updates `status`, `progress`, `current_epoch`, `current_step`, `final_loss`, `training_time_seconds`, `adapter_file_path`, `error_message`, `started_at`, `completed_at`, `updated_at`. It does **not** update `user_id` or `created_by`. This is correct — those fields are immutable once set by the original INSERT.

**No identity spine violations in this implementation.**

---

## Part 11 — Clarifications & Architectural Decision (Session 4 Follow-up)

**Date:** 2026-02-23  
**Questions from:** Human review of what was implemented

---

### Q1: Why did it work in the lookback? We know an adapter was created.

**Answer: The adapter was created through a completely different code path.**

The lookback codebase investigation reveals:

| Item | Lookback Version | Current Version |
|------|-----------------|-----------------|
| `supabase/functions/process-pipeline-jobs/` | ❌ Does NOT exist | ✅ Exists |
| `/api/pipeline/jobs/route.ts` triggers Edge Function | ❌ No | ❌ No |
| Vercel cron for dispatch | ❌ Not in vercel.json | ❌ Was not in vercel.json |
| `training_jobs` table (legacy) | ✅ Used by `/api/jobs/route.ts` | ❌ Not used |
| `pipeline_training_jobs` table (current) | ✅ Created but unused for dispatch | ✅ Used by `/api/pipeline/jobs/route.ts` |

**The adapter that exists in the database (`6fd5ac79-c54b-4927-8138-ca159108bcae`) was created through the legacy E01 path** — `/api/jobs/route.ts` → `training_jobs` table — **not** through the current E08 pipeline UI at `/pipeline/configure`. This legacy route inserted jobs directly into the `training_jobs` table with `status: 'queued'`.

The `process-pipeline-jobs` Edge Function was written as part of the **E08 pipeline redesign** and has never been triggered end-to-end in production. It was new code that was never wired up. **The pipeline UI at `/pipeline/configure` has never successfully dispatched a training job to RunPod.** The adapter was created before that UI existed, by a different mechanism.

This is confirmed by the fact that the lookback's `supabase/functions/` directory contains only a generic Hono server stub — there was no dispatch Edge Function in the lookback at all.

---

### Q2: What was just implemented, and is the cron job approach brittle?

**What was implemented (Part 6–8 of this spec):**

1. `triggerJobDispatcher()` in `POST /api/pipeline/jobs` — after creating a DB record, immediately calls the Supabase Edge Function via HTTP (fire-and-forget)
2. `src/app/api/cron/dispatch-training-jobs/route.ts` — a Vercel Cron GET endpoint that calls the same Edge Function on a schedule
3. `vercel.json` — added `"* * * * *"` (every minute) cron schedule
4. `supabase/functions/process-pipeline-jobs/index.ts` — updated `BASE_MODEL` to Qwen

**Is the cron brittle? Yes.** The human is right to question this. Specific problems:

- Vercel Cron jobs can be accidentally deleted, overwritten by config changes, or silently disabled by Vercel plan changes
- The minimum interval is 1 minute — so a failed direct trigger means at minimum a 1-minute delay before retry
- Vercel Cron requires Vercel Pro (no issue here, but a constraint)
- The cron adds a recurring HTTP call every 60 seconds even when there are no pending jobs — unnecessary load
- Two separate trigger paths (direct + cron) create confusion about which one "did the work"

The direct trigger (`triggerJobDispatcher()`) is sound — it fires immediately when a job is created. The cron is the weak part.

---

### Q3: Is there a better version that creates exactly the same adapter configurations?

**Yes. Replace the cron safety net with Inngest.**

The app already uses Inngest for RAG background processing. Inngest is the correct tool for this because:

- **Event-driven, not polling** — no cron needed, no 1-minute delay
- **Automatic retry** — if the Edge Function call fails, Inngest retries with exponential backoff
- **Durable** — Inngest jobs survive Vercel cold starts and function timeouts
- **Observable** — Inngest dashboard shows every job event, retry, and failure
- **Not deletable by admins** — it's code, not a Vercel config entry

**Proposed architecture (Inngest replacement):**

```
[POST /api/pipeline/jobs]
        ↓ Creates DB record (status: 'pending')
        ↓ inngest.send({ name: 'pipeline/job.created', data: { jobId } })
[Inngest Function: dispatch-training-job]
        ↓ Calls Supabase Edge Function process-pipeline-jobs via HTTP
        ↓ OR: Directly generates signed URL + POSTs to RunPod (eliminating Edge Function entirely)
        ↓ Retries automatically on failure (3 retries, exponential backoff)
[RunPod Serverless: brightrun-lora-trainer-qwen]
        ↓ handler.py / train_lora.py (unchanged)
        ↓ Writes progress directly to Supabase DB (unchanged)
        ↓ Updates status to 'completed', writes adapter_file_path (unchanged)
```

**Files to change:**

| File | Change |
|------|--------|
| `src/app/api/pipeline/jobs/route.ts` | Replace `triggerJobDispatcher()` with `inngest.send('pipeline/job.created', { jobId })` |
| `src/inngest/functions/dispatch-training-job.ts` | **New file** — Inngest function that receives the event and calls the Edge Function (or RunPod directly) |
| `src/inngest/client.ts` | Register new function (already exists for RAG) |
| `vercel.json` | Remove the `"* * * * *"` cron entry |
| `src/app/api/cron/dispatch-training-jobs/route.ts` | Delete — no longer needed |

**The RunPod payload, hyperparameters, dataset signed URL logic, and all DB status updates remain identical.** The only change is the trigger mechanism: Inngest event instead of HTTP fetch + cron.

**Recommendation:** Implement the Inngest version. Remove the cron. The current direct-trigger implementation (`triggerJobDispatcher`) can stay as a temporary bridge until Inngest is wired up, or be replaced entirely.

---
