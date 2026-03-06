# Adapter Deployment Automation — Investigation & Implementation Spec

**Document:** `08-data-and-identity-automate-adapter_v1.md`  
**Date:** 2026-02-24  
**Status:** Analysis Complete — Ready for Implementation

---

## Part 1 — Investigation Findings

### 1.1 What the Lookback Revealed

The `lora-lookback` spec files (`adapter-load-re-enable-serverless_v1.md`, `adapter-load-option-E-pods_v2.md`) are the smoking gun. They document the full history of how adapters were loaded.

**The previous automated adapter loading process:**

1. After training, the adapter was extracted from tar.gz and pushed to **HuggingFace Hub** as:  
   `BrightHub2/lora-emotional-intelligence-{jobId[:8]}`

2. The RunPod inference serverless endpoint has an environment variable called `LORA_MODULES`:  
   ```json
   [{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
   ```
   This tells vLLM to pre-load the named adapter from the HuggingFace path at worker startup.

3. When the app calls inference with `useAdapter=true`, it sends `model: "adapter-{jobId[:8]}"` in the request, and vLLM routes it to the pre-loaded adapter.

**Why it became manual:** The team discovered that RunPod's serverless vLLM V1 engine crashed with `EngineDeadError` when `ENABLE_LORA=true` was set (documented Jan 20, 2026). They switched to RunPod Pods (`INFERENCE_MODE=pods`) as a workaround. With pods, the adapter was configured in the pod's startup script, which required manual pod setup each time.

**Current state:** The inference endpoint is running in **serverless mode** (the code default is `INFERENCE_MODE || 'serverless'`). The serverless endpoint `ei82ickpenoqlp` has `LORA_MODULES` configured with the old `adapter-6fd5ac79`. The V1 + LoRA crash may have been resolved (or is specific to that worker image version). Testing will confirm.

### 1.2 Current Adapter for the New Job

| Field | Value |
|-------|-------|
| Job ID | `608fbb9b-2f05-450b-b38b-f029f2f2b70b` |
| Job name | `Phase-2-training-random_v2-test-5-adapter_v2` |
| Status | `completed` |
| Adapter in Supabase Storage | `lora-models/adapters/608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz` |
| Adapter name the code expects | `adapter-608fbb9b` |
| Target HuggingFace path | `BrightHub2/lora-emotional-intelligence-608fbb9b` |
| Completed at | `2026-02-24T02:24:31Z` (3 minutes to train) |

---

## Part 2 — Manual Process (Do This NOW for Job 608fbb9b)

Follow these steps to make the new adapter testable today.

### Step M1 — Download the adapter from the app

Go to: `https://v4-show.vercel.app/pipeline/jobs/608fbb9b-2f05-450b-b38b-f029f2f2b70b`

Click **"Download Adapter"** button. This downloads:  
`608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz`

### Step M2 — Extract the adapter

```bash
mkdir adapter-608fbb9b
tar -xzf 608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz -C adapter-608fbb9b/

# Verify contents — should contain adapter_config.json and weights
ls adapter-608fbb9b/
```

Expected files: `adapter_config.json`, `adapter_model.safetensors` (or `.bin`), `tokenizer_config.json`, `special_tokens_map.json`.

If the tar extracts into a subfolder, `cd` into it first before pushing.

### Step M3 — Push to HuggingFace Hub

```bash
# Login (requires BrightHub2 account credentials)
huggingface-cli login

# Create the repo
huggingface-cli repo create lora-emotional-intelligence-608fbb9b \
  --type model \
  --organization BrightHub2

# Push the files
cd adapter-608fbb9b

# Initialize git-lfs and push
git init
git lfs install
huggingface-cli lfs-enable-largefiles .
git remote add origin https://huggingface.co/BrightHub2/lora-emotional-intelligence-608fbb9b
git add .
git commit -m "LoRA adapter 608fbb9b - Mistral-7B emotional intelligence"
git push origin main
```

Verify: `https://huggingface.co/BrightHub2/lora-emotional-intelligence-608fbb9b` should exist.

### Step M4 — Update RunPod endpoint LORA_MODULES

In RunPod Dashboard → Serverless → your inference endpoint (`ei82ickpenoqlp`) → Edit → Environment Variables:

Update `LORA_MODULES` to include both adapters (keeping old, adding new):

```json
[
  {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name":"adapter-608fbb9b","path":"BrightHub2/lora-emotional-intelligence-608fbb9b"}
]
```

Also confirm `ENABLE_LORA=true` and `MAX_LORAS=4` (or higher) are set.

### Step M5 — Restart workers

Scale workers to 0 then back up to force reload with new `LORA_MODULES`. Or click "Restart Workers" if that option is available in the dashboard.

### Step M6 — Test in the app

Go to: `https://v4-show.vercel.app/pipeline/jobs/608fbb9b-2f05-450b-b38b-f029f2f2b70b/results`

Click **"Deploy & Test Adapter"** → then run an A/B test prompt in the test UI.

---

## Part 3 — Architecture Analysis: Why This is Manual

The current pipeline has a gap between training completion and inference availability:

```
Training job created
        ↓
Inngest dispatches to RunPod Serverless (brightrun-lora-trainer-qwen)
        ↓
RunPod worker trains model, uploads tar.gz to Supabase Storage
        ↓
Worker updates pipeline_training_jobs: status='completed', adapter_file_path=...
        ↓
        ❌ AUTOMATION GAP — nothing happens next
        ↓
[Manual] Human downloads tar.gz, extracts, pushes to HuggingFace
        ↓
[Manual] Human updates RunPod LORA_MODULES env var
        ↓
[Manual] Human restarts workers
        ↓
Adapter is testable via /pipeline/jobs/[id]/results
```

**The gap exists because:**
1. No code watches for `status='completed'` on `pipeline_training_jobs`
2. No Supabase webhook sends an event when the status changes
3. The HuggingFace push step was never automated
4. Updating RunPod endpoint configuration was never wired to app events

**What we need to close the gap:**
1. A trigger: detect when training completes
2. An extractor: untar the adapter from Supabase Storage
3. A publisher: push adapter files to HuggingFace Hub (or store accessibly)
4. A configurator: update RunPod endpoint LORA_MODULES via RunPod API
5. A loader: optionally call vLLM's dynamic LoRA loading API to avoid worker restart
6. A notifier: update `pipeline_inference_endpoints` records so the UI knows it's ready

---

## Part 4 — Automation Design

### 4.1 Overview

The automation involves four new components and one DB change:

| Component | What it does |
|-----------|-------------|
| Supabase DB webhook | Fires when `pipeline_training_jobs.status` → `'completed'` |
| Inngest event `pipeline/adapter.ready` | Received from webhook, triggers deployment |
| Inngest function `auto-deploy-adapter` | Orchestrates the full deploy flow |
| RunPod API call | Updates endpoint LORA_MODULES env var |
| HuggingFace Hub API call | Uploads extracted adapter files |

### 4.2 Trigger: Supabase Database Webhook → Inngest

Supabase supports Database Webhooks (under Project Settings → Webhooks). Configure one:

- **Table:** `pipeline_training_jobs`
- **Events:** `UPDATE`
- **Filter:** `status=completed`
- **URL:** `https://inn.gs/e/v1/{inngest-key}` (or via your Next.js `/api/inngest` route)
- **Payload:** The updated row

This fires an Inngest event automatically whenever the RunPod worker marks a job as completed.

### 4.3 The Inngest Function: `auto-deploy-adapter`

Triggered by: `pipeline/adapter.ready` event (or directly by watching `pipeline/job.created` with a polling step).

The function does in sequence:

```
Step 1: Validate job is completed with adapter_file_path
Step 2: Download adapter tar.gz from Supabase Storage (signed URL)
Step 3: Extract tar.gz in memory → get adapter files
Step 4: Push files to HuggingFace Hub via HF Hub API
Step 5: Update RunPod endpoint LORA_MODULES via RunPod GraphQL API
Step 6: (Optional) Call vLLM /v1/load_lora_adapter for live reload
Step 7: Create/update pipeline_inference_endpoints record in DB
Step 8: Update pipeline_training_jobs with hf_adapter_path
```

### 4.4 HuggingFace Hub API

HuggingFace has a REST API for file uploads:

```
POST https://huggingface.co/api/repos/create
PUT  https://huggingface.co/api/models/{org}/{repo}/upload/{branch}/{filepath}
```

Requires: `HF_TOKEN` env var (write permission to `BrightHub2` org).

The naming convention is already established: `BrightHub2/lora-emotional-intelligence-{jobId[:8]}`.

### 4.5 RunPod API for LORA_MODULES Update

RunPod uses a GraphQL API. The mutation to update a serverless endpoint's env vars:

```graphql
mutation UpdateEndpointTemplate($endpointId: String!, $envVars: [EnvVarInput!]) {
  updateEndpointTemplate(
    endpointId: $endpointId
    envVars: $envVars
  ) {
    id
    env
  }
}
```

Requires: `RUNPOD_API_KEY` (already in env vars).

After updating LORA_MODULES, workers on next cold start will include the new adapter. For hot reload, vLLM supports:

```
POST {INFERENCE_API_URL}/v1/load_lora_adapter
{"lora_name": "adapter-608fbb9b", "lora_path": "BrightHub2/lora-emotional-intelligence-608fbb9b"}
```

### 4.6 New DB Column

Add `hf_adapter_path` to `pipeline_training_jobs` to track the HuggingFace location after deployment:

```sql
ALTER TABLE pipeline_training_jobs 
ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;
```

---

## Part 5 — Step-by-Step Implementation

### Step 1 — Add DB Column

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentExecuteDDL({
    sql:\`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;\`,
    dryRun:false,
    transaction:true,
    transport:'pg'
  });
  console.log(JSON.stringify(r,null,2));
})();"
```

### Step 2 — Add Environment Variables to Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

```
HF_TOKEN=<HuggingFace write token for BrightHub2 org>
HF_ORG=BrightHub2
HF_ADAPTER_REPO_PREFIX=lora-emotional-intelligence
RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlp
```

Add to `.env.local` for local development.

### Step 3 — Add Inngest Event Type

**File: `src/inngest/client.ts`**

Add to `InngestEvents`:

```typescript
'pipeline/adapter.ready': {
  data: {
    jobId: string;
    userId: string;
    adapterFilePath: string;
  };
};
```

### Step 4 — Create the Auto-Deploy Inngest Function

**New file: `src/inngest/functions/auto-deploy-adapter.ts`**

```typescript
/**
 * Inngest Function: Auto-Deploy Adapter to Inference Endpoint
 *
 * Triggered by: 'pipeline/adapter.ready' event
 * (fired by Supabase webhook when pipeline_training_jobs.status → 'completed')
 *
 * Steps:
 *   1. Fetch completed job and validate adapter exists
 *   2. Download adapter tar.gz from Supabase Storage
 *   3. Extract tar.gz in memory
 *   4. Push adapter files to HuggingFace Hub
 *   5. Update RunPod endpoint LORA_MODULES via GraphQL API
 *   6. Optionally call vLLM dynamic load endpoint
 *   7. Update pipeline_inference_endpoints record
 *   8. Save hf_adapter_path back to pipeline_training_jobs
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_ORG = process.env.HF_ORG || 'BrightHub2';
const HF_REPO_PREFIX = process.env.HF_ADAPTER_REPO_PREFIX || 'lora-emotional-intelligence';
const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

export const autoDeployAdapter = inngest.createFunction(
  {
    id: 'auto-deploy-adapter',
    name: 'Auto-Deploy Adapter to Inference Endpoint',
    retries: 2,
    concurrency: { limit: 1 }, // Only one deploy at a time to avoid LORA_MODULES race
  },
  { event: 'pipeline/adapter.ready' },
  async ({ event, step }) => {
    const { jobId, userId, adapterFilePath } = event.data;

    // =====================================================
    // Step 1: Fetch and validate job
    // =====================================================
    const job = await step.run('fetch-job', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('pipeline_training_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      if (error || !data) throw new Error(`Job ${jobId} not found`);
      if (data.status !== 'completed' || !data.adapter_file_path) {
        throw new Error(`Job ${jobId} not completed or missing adapter_file_path`);
      }
      return data;
    });

    const adapterName = `adapter-${jobId.substring(0, 8)}`;
    const hfRepoName = `${HF_REPO_PREFIX}-${jobId.substring(0, 8)}`;
    const hfPath = `${HF_ORG}/${hfRepoName}`;

    // =====================================================
    // Step 2: Download adapter tar.gz from Supabase Storage
    // =====================================================
    const tarBuffer = await step.run('download-adapter', async () => {
      const supabase = createServerSupabaseAdminClient();
      let storagePath = adapterFilePath;
      if (storagePath.startsWith('lora-models/')) {
        storagePath = storagePath.replace('lora-models/', '');
      }
      const { data, error } = await supabase.storage
        .from('lora-models')
        .download(storagePath);
      if (error || !data) throw new Error(`Failed to download adapter: ${error?.message}`);
      return Buffer.from(await data.arrayBuffer()).toString('base64');
    });

    // =====================================================
    // Step 3: Extract tar.gz and push to HuggingFace Hub
    // =====================================================
    const hfUploadResult = await step.run('push-to-huggingface', async () => {
      // Dynamically import tar extraction (works in Node.js on Vercel)
      const { extract } = await import('tar-stream');
      const zlib = await import('zlib');
      const { Readable } = await import('stream');

      // Decode base64 buffer
      const tarData = Buffer.from(tarBuffer, 'base64');

      // Step 3a: Create HuggingFace repo
      const createRepoResp = await fetch('https://huggingface.co/api/repos/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'model',
          name: hfRepoName,
          organization: HF_ORG,
          private: false, // RunPod needs to access it
        }),
      });
      if (!createRepoResp.ok && createRepoResp.status !== 409) {
        // 409 = already exists, that's fine
        const err = await createRepoResp.text();
        throw new Error(`Failed to create HF repo: ${err}`);
      }

      // Step 3b: Extract tar and upload each file
      const uploadedFiles: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const gunzip = zlib.createGunzip();
        const extractor = extract();
        const readable = Readable.from(tarData);

        extractor.on('entry', async (header, stream, next) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', async () => {
            if (header.type === 'file') {
              const fileData = Buffer.concat(chunks);
              // Strip leading directory from tar path
              const fileName = header.name.replace(/^[^/]+\//, '');
              if (fileName && !fileName.startsWith('.')) {
                try {
                  const uploadResp = await fetch(
                    `https://huggingface.co/api/models/${HF_ORG}/${hfRepoName}/upload/main/${fileName}`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${HF_TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                      },
                      body: fileData,
                    }
                  );
                  if (uploadResp.ok) uploadedFiles.push(fileName);
                  else console.warn(`Failed to upload ${fileName}: ${uploadResp.status}`);
                } catch (e) {
                  console.warn(`Upload error for ${fileName}:`, e);
                }
              }
            }
            next();
          });
          stream.resume();
        });

        extractor.on('finish', () => resolve());
        extractor.on('error', reject);
        readable.pipe(gunzip).pipe(extractor);
      });

      console.log(`[AutoDeployAdapter] Uploaded ${uploadedFiles.length} files to ${hfPath}`);
      return { hfPath, uploadedFiles };
    });

    // =====================================================
    // Step 4: Update RunPod LORA_MODULES via GraphQL API
    // =====================================================
    await step.run('update-runpod-lora-modules', async () => {
      // Fetch current endpoint configuration to get existing LORA_MODULES
      const configQuery = `
        query GetEndpoint($id: String!) {
          myself {
            serverlessDiscount { discountFactor }
            endpoints(filters: { id: $id }) {
              env
            }
          }
        }
      `;

      const configResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: configQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
        }
      );
      const configData = await configResp.json();
      const currentEnv: Array<{key: string; value: string}> = configData?.data?.myself?.endpoints?.[0]?.env || [];

      // Parse existing LORA_MODULES
      const loraModulesEnv = currentEnv.find(e => e.key === 'LORA_MODULES');
      let loraModules: Array<{name: string; path: string}> = [];
      if (loraModulesEnv?.value) {
        try { loraModules = JSON.parse(loraModulesEnv.value); } catch {}
      }

      // Add new adapter if not already present
      if (!loraModules.find(m => m.name === adapterName)) {
        loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
      }

      // Build updated env array
      const updatedEnv = currentEnv
        .filter(e => e.key !== 'LORA_MODULES')
        .map(e => ({ key: e.key, value: e.value }));
      updatedEnv.push({ key: 'LORA_MODULES', value: JSON.stringify(loraModules) });

      // Mutation to update endpoint env vars
      const updateMutation = `
        mutation SaveEndpoint(
          $id: String!
          $env: [EnvironmentVariableInput]
        ) {
          saveEndpoint(input: {
            id: $id
            env: $env
          }) {
            id
            env
          }
        }
      `;

      const updateResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: updateMutation,
            variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID, env: updatedEnv },
          }),
        }
      );
      const updateData = await updateResp.json();
      if (updateData.errors) {
        throw new Error(`RunPod GraphQL error: ${JSON.stringify(updateData.errors)}`);
      }
      console.log(`[AutoDeployAdapter] Updated LORA_MODULES for endpoint ${RUNPOD_INFERENCE_ENDPOINT_ID}`);
      return { loraModules };
    });

    // =====================================================
    // Step 5 (Optional): vLLM dynamic load for live workers
    // =====================================================
    await step.run('vllm-dynamic-load', async () => {
      if (!INFERENCE_API_URL) {
        console.log('[AutoDeployAdapter] INFERENCE_API_URL not set, skipping dynamic load');
        return { skipped: true };
      }
      try {
        const loadResp = await fetch(`${INFERENCE_API_URL}/v1/load_lora_adapter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lora_name: adapterName, lora_path: hfUploadResult.hfPath }),
        });
        if (loadResp.ok) {
          console.log(`[AutoDeployAdapter] vLLM dynamic load succeeded for ${adapterName}`);
          return { loaded: true };
        } else {
          // Non-fatal — adapter will load on next cold start via LORA_MODULES
          const err = await loadResp.text();
          console.warn(`[AutoDeployAdapter] vLLM dynamic load failed (non-fatal): ${err}`);
          return { loaded: false, warning: err };
        }
      } catch (e) {
        console.warn('[AutoDeployAdapter] vLLM dynamic load error (non-fatal):', e);
        return { loaded: false };
      }
    });

    // =====================================================
    // Step 6: Update database records
    // =====================================================
    await step.run('update-database', async () => {
      const supabase = createServerSupabaseAdminClient();

      // Save HF path to training job
      await supabase
        .from('pipeline_training_jobs')
        .update({ hf_adapter_path: hfUploadResult.hfPath })
        .eq('id', jobId);

      // Create or update pipeline_inference_endpoints record (adapted)
      const virtualEndpointId = `virtual-inference-${jobId.slice(0, 8)}`;
      const inferenceApiUrl = process.env.INFERENCE_API_URL || '';

      const { data: existing } = await supabase
        .from('pipeline_inference_endpoints')
        .select('id')
        .eq('job_id', jobId)
        .eq('endpoint_type', 'adapted')
        .single();

      if (!existing) {
        // Create new endpoint records
        await supabase.from('pipeline_inference_endpoints').insert([
          {
            job_id: jobId,
            user_id: userId,
            endpoint_type: 'control',
            runpod_endpoint_id: `${virtualEndpointId}-control`,
            base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
            status: 'ready',
            ready_at: new Date().toISOString(),
            health_check_url: inferenceApiUrl ? `${inferenceApiUrl}/health` : null,
          },
          {
            job_id: jobId,
            user_id: userId,
            endpoint_type: 'adapted',
            runpod_endpoint_id: `${virtualEndpointId}-adapted`,
            base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
            adapter_path: hfUploadResult.hfPath,
            status: 'ready',
            ready_at: new Date().toISOString(),
            health_check_url: inferenceApiUrl ? `${inferenceApiUrl}/health` : null,
          },
        ]);
      } else {
        // Update existing adapted endpoint
        await supabase
          .from('pipeline_inference_endpoints')
          .update({
            adapter_path: hfUploadResult.hfPath,
            status: 'ready',
            ready_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('endpoint_type', 'adapted');
      }

      console.log(`[AutoDeployAdapter] DB updated for job ${jobId}`);
    });

    return {
      success: true,
      jobId,
      adapterName,
      hfPath: hfUploadResult.hfPath,
      filesUploaded: hfUploadResult.uploadedFiles.length,
    };
  }
);
```

### Step 5 — Register Function in Inngest Index

**File: `src/inngest/functions/index.ts`**

Add:
```typescript
import { autoDeployAdapter } from './auto-deploy-adapter';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,  // NEW
];
```

### Step 6 — Fire the Event When Training Completes

The training worker (`handler.py`) updates Supabase directly. We need to detect that and fire `pipeline/adapter.ready`.

**Two options (choose one):**

#### Option A: Supabase Database Webhook (Recommended)

In Supabase Dashboard → Project Settings → Webhooks → Create new webhook:

| Field | Value |
|-------|-------|
| Name | `pipeline-adapter-ready` |
| Table | `pipeline_training_jobs` |
| Events | `UPDATE` |
| Conditions | `status = 'completed' AND adapter_file_path IS NOT NULL` |
| URL | `https://v4-show.vercel.app/api/inngest` |
| HTTP method | POST |
| Payload | Row data (default) |

Then update `/api/inngest/route.ts` (or `src/app/api/inngest/route.ts`) to handle the Supabase webhook format and convert it to an Inngest event.

Alternatively, create a dedicated webhook route:

**New file: `src/app/api/webhooks/training-complete/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const record = payload.record; // Supabase webhook sends {record: {...}, old_record: {...}}

  if (record?.status === 'completed' && record?.adapter_file_path) {
    await inngest.send({
      name: 'pipeline/adapter.ready',
      data: {
        jobId: record.id,
        userId: record.user_id,
        adapterFilePath: record.adapter_file_path,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
```

Point the Supabase webhook to: `https://v4-show.vercel.app/api/webhooks/training-complete`

#### Option B: Poll from dispatch-training-job Inngest function

Simpler but adds latency. Add a polling step at the end of the existing `dispatch-training-job` function that waits for completion:

```typescript
// In dispatch-training-job.ts — add after the RunPod dispatch step:
const completedJob = await step.waitForEvent('wait-for-completion', {
  event: 'pipeline/job.completed', // You'd need to fire this from somewhere
  timeout: '2h',
  match: 'data.jobId',
});

if (completedJob?.data.adapterFilePath) {
  await step.sendEvent('trigger-deploy', {
    name: 'pipeline/adapter.ready',
    data: {
      jobId: event.data.jobId,
      userId: event.data.userId,
      adapterFilePath: completedJob.data.adapterFilePath,
    },
  });
}
```

**Recommendation: Use Option A (Supabase webhook).** It's event-driven, zero latency on completion, and doesn't require changes to the training dispatch function.

### Step 7 — Add tar-stream dependency

The `auto-deploy-adapter` function uses `tar-stream` and Node.js built-ins to extract the tar.gz.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm install tar-stream
```

TypeScript types (if needed):
```bash
npm install --save-dev @types/tar-stream
```

### Step 8 — Deploy and Verify

```bash
# Push to GitHub/Vercel
git add .
git commit -m "feat: auto-deploy adapter to inference endpoint after training"
git push origin main
```

Verify in Inngest dashboard that `auto-deploy-adapter` function appears registered.

Test by running a new training job — after it completes, check Inngest dashboard to confirm `pipeline/adapter.ready` event fires and the function runs successfully.

---

## Part 6 — Environment Variables Checklist

| Variable | Where Set | Value |
|----------|-----------|-------|
| `HF_TOKEN` | Vercel + .env.local | HuggingFace write token for BrightHub2 org |
| `HF_ORG` | Vercel + .env.local | `BrightHub2` |
| `HF_ADAPTER_REPO_PREFIX` | Vercel + .env.local | `lora-emotional-intelligence` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | Vercel + .env.local | `ei82ickpenoqlp` |
| `GPU_CLUSTER_API_KEY` | Already set | RunPod API key |
| `INFERENCE_API_URL` | Already set | RunPod serverless endpoint URL |
| `INNGEST_EVENT_KEY` | Already set | Inngest key |

---

## Part 7 — Full Automated Flow (After Implementation)

```
User clicks "Start Training" on /pipeline/configure
        ↓
POST /api/pipeline/jobs → creates pipeline_training_jobs record (status='pending')
        ↓
Inngest fires 'pipeline/job.created' → dispatch-training-job
        ↓
Job sent to RunPod brightrun-lora-trainer-qwen (Mistral-7B, ~35-45 min)
        ↓
Worker completes, writes adapter to Supabase Storage
Worker calls Supabase API: status='completed', adapter_file_path='lora-models/adapters/{id}.tar.gz'
        ↓
Supabase Database Webhook fires (pipeline_training_jobs UPDATE where status='completed')
        ↓
POST /api/webhooks/training-complete → inngest.send('pipeline/adapter.ready')
        ↓
Inngest auto-deploy-adapter function runs:
  ✓ Downloads tar.gz from Supabase Storage
  ✓ Extracts adapter files
  ✓ Pushes to HuggingFace: BrightHub2/lora-emotional-intelligence-{id[:8]}
  ✓ Updates RunPod LORA_MODULES via GraphQL API
  ✓ Calls vLLM /v1/load_lora_adapter (live workers get adapter immediately)
  ✓ Creates pipeline_inference_endpoints records (status='ready')
  ✓ Saves hf_adapter_path to pipeline_training_jobs
        ↓
User goes to /pipeline/jobs/{id}/results
"Deploy & Test Adapter" button shows "Test Adapter ✓" (endpoints already ready)
        ↓
A/B test runs immediately — no manual steps required
```

**Total time from training completion to testable:** ~2 minutes (the Inngest function run time).

---

## Part 8 — Implementation Order

| Step | Action | Effort |
|------|--------|--------|
| 1 | Add `hf_adapter_path` column (SAOL) | 5 min |
| 2 | Add env vars to Vercel | 5 min |
| 3 | `npm install tar-stream` | 2 min |
| 4 | Add event type to `inngest/client.ts` | 5 min |
| 5 | Create `auto-deploy-adapter.ts` Inngest function | 30 min |
| 6 | Register in `inngest/functions/index.ts` | 5 min |
| 7 | Create webhook route `api/webhooks/training-complete/route.ts` | 15 min |
| 8 | Configure Supabase DB webhook in dashboard | 10 min |
| 9 | Deploy and verify | 10 min |

**Total estimated implementation time: ~90 minutes**

---
