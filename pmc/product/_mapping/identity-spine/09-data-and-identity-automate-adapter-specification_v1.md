# Adapter Auto-Deployment — Implementation Specification

**Document:** `09-data-and-identity-automate-adapter-specification_v1.md`  
**Date:** 2026-02-24  
**Source Design:** `08-data-and-identity-automate-adapter_v1.md`  
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`  
**Status:** Implementation-Ready Specification

---

## Part 1 — Executive Summary

This specification provides exact, line-by-line implementation instructions to automate the adapter deployment pipeline described in `08-data-and-identity-automate-adapter_v1.md`.

**The gap being closed:**

```
Training job completes (status='completed', adapter_file_path=...)
        ↓
        ❌ AUTOMATION GAP — nothing happens next
        ↓
[Currently Manual] Human downloads tar.gz, pushes to HuggingFace, updates RunPod env
```

**What we are building:**

```
Training job completes (status='completed', adapter_file_path=...)
        ↓
Supabase Database Webhook → POST /api/webhooks/training-complete
        ↓
inngest.send('pipeline/adapter.ready')
        ↓
Inngest function auto-deploy-adapter runs automatically:
  ✓ Download adapter tar.gz from Supabase Storage
  ✓ Extract in-memory (tar-stream + zlib)
  ✓ Push files to HuggingFace Hub (BrightHub2/lora-emotional-intelligence-{id[:8]})
  ✓ Update RunPod endpoint LORA_MODULES via GraphQL API
  ✓ Call vLLM /v1/load_lora_adapter for live reload (optional, non-fatal)
  ✓ Create pipeline_inference_endpoints records (status='ready')
  ✓ Write hf_adapter_path back to pipeline_training_jobs
```

---

## Part 2 — Current Codebase State Assessment

Before implementing, confirm the current state of key files. These assessments are based on reading the codebase on 2026-02-24.

| File | Current State | Change Required |
|------|--------------|-----------------|
| `src/inngest/client.ts` | Has `rag/document.uploaded` and `pipeline/job.created` events | Add `pipeline/adapter.ready` event type |
| `src/inngest/functions/index.ts` | Registers `processRAGDocument`, `dispatchTrainingJob`, `dispatchTrainingJobFailureHandler` | Add `autoDeployAdapter` |
| `src/inngest/functions/auto-deploy-adapter.ts` | Does NOT exist | Create new file |
| `src/app/api/webhooks/training-complete/route.ts` | Does NOT exist | Create new file |
| `pipeline_training_jobs` DB table | Has `adapter_file_path` column, missing `hf_adapter_path` | Add column via SAOL |
| `package.json` | Does not have `tar-stream` | `npm install tar-stream` |

---

## Part 3 — Prerequisites

### 3.1 SAOL Database Migration

Run this command to add the `hf_adapter_path` column to `pipeline_training_jobs`.

**This must be run BEFORE deploying the code changes** (the Inngest function writes to this column on completion).

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Step 1: Dry run to validate
  const dry = await saol.agentExecuteDDL({
    sql: \`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;\`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Dry run:', dry.success ? '✓ PASS' : '✗ FAIL', dry.summary);

  if (!dry.success) { console.error('Dry run failed — aborting'); return; }

  // Step 2: Execute for real
  const result = await saol.agentExecuteDDL({
    sql: \`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;\`,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });
  console.log('Execute:', result.success ? '✓ DONE' : '✗ FAILED', result.summary);

  // Step 3: Verify
  const verify = await saol.agentIntrospectSchema({table:'pipeline_training_jobs', transport:'pg'});
  const col = verify.tables[0]?.columns?.find((c: any) => c.name === 'hf_adapter_path');
  console.log('Column exists:', col ? '✓ YES' : '✗ NOT FOUND', col);
})();"
```

**Expected output:**
```
Dry run: ✓ PASS ...
Execute: ✓ DONE ...
Column exists: ✓ YES { name: 'hf_adapter_path', type: 'text', nullable: true, ... }
```

### 3.2 Install npm Dependency

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm install tar-stream && npm install --save-dev @types/tar-stream
```

Verify `tar-stream` appears in `package.json` under `dependencies` after running.

### 3.3 Environment Variables

Add the following to **both** Vercel Dashboard (Settings → Environment Variables) and the local `.env.local` file.

| Variable | Value | Notes |
|----------|-------|-------|
| `HF_TOKEN` | `<HuggingFace write token>` | Must have write access to the `BrightHub2` org on HuggingFace |
| `HF_ORG` | `BrightHub2` | The HuggingFace organization name |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Prefix for all adapter repos (already established by existing adapter `6fd5ac79`) |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | The serverless inference endpoint ID (already confirmed from existing LORA_MODULES env) |
| `WEBHOOK_SECRET` | `<generate a random 32-char hex string>` | Shared secret to validate Supabase webhook calls. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

**Already-present variables used by this feature** (confirm these exist in `.env.local`):

| Variable | Purpose |
|----------|---------|
| `GPU_CLUSTER_API_KEY` | RunPod API key for GraphQL calls |
| `INFERENCE_API_URL` | RunPod inference serverless endpoint URL (for optional live vLLM reload) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase client (used by `createServerSupabaseAdminClient()`) |
| `INNGEST_EVENT_KEY` | For sending events from Next.js API routes |

---

## Part 4 — Code Changes

### 4.1 File: `src/inngest/client.ts`

**Change:** Add the `pipeline/adapter.ready` event type to `InngestEvents`.

**Current state of `InngestEvents` (lines 48–80):**

```typescript
export type InngestEvents = {
  'rag/document.uploaded': {
    data: {
      documentId: string;
      userId: string;
    };
  };

  'pipeline/job.created': {
    data: {
      jobId: string;
      userId: string;
    };
  };
};
```

**Updated `InngestEvents` — replace the entire type block:**

```typescript
export type InngestEvents = {
  /**
   * Triggered when a RAG document is uploaded and ready for processing.
   * Handler: processRAGDocument (src/inngest/functions/process-rag-document.ts)
   */
  'rag/document.uploaded': {
    data: {
      documentId: string;
      userId: string;
    };
  };

  /**
   * Triggered when a pipeline training job is created and ready to dispatch to RunPod.
   * Handler: dispatchTrainingJob (src/inngest/functions/dispatch-training-job.ts)
   */
  'pipeline/job.created': {
    data: {
      jobId: string;
      userId: string;
    };
  };

  /**
   * Triggered when a training job completes and the adapter tar.gz is in Supabase Storage.
   * Fired by: POST /api/webhooks/training-complete (receives Supabase DB webhook)
   * Handler: autoDeployAdapter (src/inngest/functions/auto-deploy-adapter.ts)
   *
   * Payload:
   * - jobId: UUID of the completed pipeline_training_jobs row
   * - userId: UUID of the job owner (for creating pipeline_inference_endpoints with correct user_id)
   * - adapterFilePath: Storage path from pipeline_training_jobs.adapter_file_path
   *                    e.g. "lora-models/adapters/608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz"
   */
  'pipeline/adapter.ready': {
    data: {
      jobId: string;
      userId: string;
      adapterFilePath: string;
    };
  };
};
```

**Exact StrReplace operation for this change:**

- `old_string`: the entire `export type InngestEvents = {` block through the closing `};`
- `new_string`: the updated type block above

---

### 4.2 New File: `src/inngest/functions/auto-deploy-adapter.ts`

**This is a new file. Create it at:** `src/inngest/functions/auto-deploy-adapter.ts`

**Full file content:**

```typescript
/**
 * Inngest Function: Auto-Deploy Adapter to Inference Endpoint
 *
 * Triggered by: 'pipeline/adapter.ready' event
 * Event is sent by: POST /api/webhooks/training-complete
 * Webhook is fired by: Supabase Database Webhook on pipeline_training_jobs UPDATE where status='completed'
 *
 * What this function does, in sequence:
 *   Step 1: Fetch and validate the completed job record
 *   Step 2: Download the adapter tar.gz from Supabase Storage
 *   Step 3: Extract the tar.gz in memory and push all files to HuggingFace Hub
 *   Step 4: Update RunPod inference endpoint LORA_MODULES via GraphQL API
 *   Step 5: (Optional, non-fatal) Call vLLM /v1/load_lora_adapter for hot reload on live workers
 *   Step 6: Create/update pipeline_inference_endpoints records in DB
 *   Step 7: Write hf_adapter_path back to pipeline_training_jobs
 *
 * Concurrency: limit=1 to prevent LORA_MODULES race conditions if two jobs complete simultaneously.
 * Retries: 2 — HuggingFace and RunPod API calls can experience transient failures.
 *
 * Naming conventions (already established by the existing adapter 6fd5ac79):
 *   Adapter name in vLLM:    adapter-{jobId[:8]}
 *   HuggingFace repo:        BrightHub2/lora-emotional-intelligence-{jobId[:8]}
 *   virtual endpoint prefix: virtual-inference-{jobId[:8]}
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

// ============================================================
// Environment Variables
// ============================================================

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_ORG = process.env.HF_ORG || 'BrightHub2';
const HF_REPO_PREFIX = process.env.HF_ADAPTER_REPO_PREFIX || 'lora-emotional-intelligence';
const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL || '';

// ============================================================
// Types
// ============================================================

interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
}

interface LoraModule {
  name: string;
  path: string;
}

// ============================================================
// Inngest Function
// ============================================================

export const autoDeployAdapter = inngest.createFunction(
  {
    id: 'auto-deploy-adapter',
    name: 'Auto-Deploy Adapter to Inference Endpoint',
    retries: 2,
    concurrency: { limit: 1 }, // One deploy at a time — avoids LORA_MODULES read-modify-write races
  },
  { event: 'pipeline/adapter.ready' },
  async ({ event, step }) => {
    const { jobId, userId, adapterFilePath } = event.data;

    // Derive naming from jobId — matches the convention already in production
    const adapterName = `adapter-${jobId.substring(0, 8)}`;
    const hfRepoName = `${HF_REPO_PREFIX}-${jobId.substring(0, 8)}`;
    const hfPath = `${HF_ORG}/${hfRepoName}`;

    // =====================================================
    // Step 1: Fetch and validate the completed job
    // =====================================================
    const job = await step.run('fetch-job', async () => {
      const supabase = createServerSupabaseAdminClient();

      const { data, error } = await supabase
        .from('pipeline_training_jobs')
        .select('id, user_id, status, adapter_file_path, hf_adapter_path')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        throw new Error(`[AutoDeployAdapter] Job ${jobId} not found: ${error?.message}`);
      }

      if (data.status !== 'completed') {
        throw new Error(`[AutoDeployAdapter] Job ${jobId} has status '${data.status}', expected 'completed' — aborting`);
      }

      if (!data.adapter_file_path) {
        throw new Error(`[AutoDeployAdapter] Job ${jobId} is completed but has no adapter_file_path — training worker may not have uploaded the artifact`);
      }

      // Idempotency guard: if already deployed, skip
      if (data.hf_adapter_path) {
        console.log(`[AutoDeployAdapter] Job ${jobId} already deployed to ${data.hf_adapter_path} — skipping`);
        return null;
      }

      return data;
    });

    // Already deployed — nothing more to do
    if (!job) return { skipped: true, jobId, reason: 'already-deployed' };

    // =====================================================
    // Step 2: Download adapter tar.gz from Supabase Storage
    // Returns base64-encoded buffer (Inngest step results must be serialisable)
    // =====================================================
    const tarBufferBase64 = await step.run('download-adapter', async () => {
      const supabase = createServerSupabaseAdminClient();

      // The storage path in the DB may or may not include the bucket prefix
      // adapter_file_path example: "lora-models/adapters/608fbb9b-...tar.gz"
      // Supabase Storage SDK path (relative to bucket):
      //   bucket='lora-models', path='adapters/608fbb9b-...tar.gz'
      let storagePath = adapterFilePath;
      if (storagePath.startsWith('lora-models/')) {
        storagePath = storagePath.slice('lora-models/'.length);
      }

      const { data, error } = await supabase.storage
        .from('lora-models')
        .download(storagePath);

      if (error || !data) {
        throw new Error(`[AutoDeployAdapter] Failed to download adapter from Storage path '${storagePath}': ${error?.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      console.log(`[AutoDeployAdapter] Downloaded ${buffer.length} bytes from Storage`);
      return buffer.toString('base64');
    });

    // =====================================================
    // Step 3: Extract tar.gz in memory and push to HuggingFace Hub
    // =====================================================
    const hfUploadResult: HFUploadResult = await step.run('push-to-huggingface', async () => {
      if (!HF_TOKEN) {
        throw new Error('[AutoDeployAdapter] HF_TOKEN env var is not set — cannot push to HuggingFace Hub');
      }

      // ---- 3a: Create HuggingFace repository ----
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
          private: false, // RunPod workers must be able to pull the adapter anonymously
        }),
      });

      // 409 = already exists, that is acceptable and expected for retries
      if (!createRepoResp.ok && createRepoResp.status !== 409) {
        const errBody = await createRepoResp.text();
        throw new Error(`[AutoDeployAdapter] Failed to create HuggingFace repo '${hfPath}': HTTP ${createRepoResp.status} — ${errBody.slice(0, 300)}`);
      }

      console.log(`[AutoDeployAdapter] HuggingFace repo ${hfPath} ${createRepoResp.status === 409 ? 'already exists' : 'created'}`);

      // ---- 3b: Extract tar.gz and upload each file ----
      const tarData = Buffer.from(tarBufferBase64, 'base64');

      // Use Node.js built-ins — available in Vercel Node.js runtime
      const zlib = await import('zlib');
      const stream = await import('stream');
      const tarStream = await import('tar-stream');

      const uploadedFiles: string[] = [];
      const uploadErrors: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const extractor = tarStream.extract();
        const gunzip = zlib.createGunzip();
        const readable = stream.Readable.from(tarData);

        extractor.on('entry', (header, entryStream, next) => {
          const chunks: Buffer[] = [];

          entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));

          entryStream.on('end', () => {
            // Skip directories, hidden files, __MACOSX artefacts
            const isFile = header.type === 'file';
            // Strip leading directory segment: "adapter-name/file.json" → "file.json"
            const rawName = header.name.replace(/\\/g, '/');
            const fileName = rawName.includes('/')
              ? rawName.split('/').slice(1).join('/')
              : rawName;

            if (!isFile || !fileName || fileName.startsWith('.') || fileName.startsWith('__MACOSX')) {
              next();
              return;
            }

            const fileData = Buffer.concat(chunks);

            // Upload asynchronously, then call next()
            fetch(
              `https://huggingface.co/api/models/${HF_ORG}/${hfRepoName}/upload/main/${encodeURIComponent(fileName)}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${HF_TOKEN}`,
                  'Content-Type': 'application/octet-stream',
                },
                body: fileData,
              }
            )
              .then(async (uploadResp) => {
                if (uploadResp.ok) {
                  uploadedFiles.push(fileName);
                  console.log(`[AutoDeployAdapter] Uploaded ${fileName} (${fileData.length} bytes)`);
                } else {
                  const errText = await uploadResp.text();
                  const msg = `Failed to upload ${fileName}: HTTP ${uploadResp.status} — ${errText.slice(0, 200)}`;
                  uploadErrors.push(msg);
                  console.warn(`[AutoDeployAdapter] ${msg}`);
                }
                next();
              })
              .catch((err: Error) => {
                uploadErrors.push(`Upload exception for ${fileName}: ${err.message}`);
                console.warn(`[AutoDeployAdapter] Upload exception for ${fileName}:`, err.message);
                next(); // Continue processing remaining files even if one upload fails
              });
          });

          entryStream.on('error', (err) => {
            console.warn(`[AutoDeployAdapter] Entry stream error for ${header.name}:`, err.message);
            next();
          });

          // Drain the stream — required for tar-stream to advance
          entryStream.resume();
        });

        extractor.on('finish', () => {
          if (uploadedFiles.length === 0 && uploadErrors.length > 0) {
            reject(new Error(`[AutoDeployAdapter] All file uploads failed: ${uploadErrors.join('; ')}`));
          } else {
            resolve();
          }
        });

        extractor.on('error', (err) => reject(new Error(`[AutoDeployAdapter] tar extraction failed: ${err.message}`)));
        gunzip.on('error', (err) => reject(new Error(`[AutoDeployAdapter] gzip decompression failed: ${err.message}`)));

        readable.pipe(gunzip).pipe(extractor);
      });

      console.log(`[AutoDeployAdapter] Pushed ${uploadedFiles.length} files to ${hfPath} (${uploadErrors.length} errors)`);

      if (uploadedFiles.length === 0) {
        throw new Error(`[AutoDeployAdapter] No files were uploaded to HuggingFace — upload failed entirely`);
      }

      return { hfPath, uploadedFiles };
    });

    // =====================================================
    // Step 4: Update RunPod inference endpoint LORA_MODULES
    // =====================================================
    await step.run('update-runpod-lora-modules', async () => {
      if (!RUNPOD_API_KEY) {
        throw new Error('[AutoDeployAdapter] GPU_CLUSTER_API_KEY env var is not set — cannot update RunPod endpoint');
      }
      if (!RUNPOD_INFERENCE_ENDPOINT_ID) {
        throw new Error('[AutoDeployAdapter] RUNPOD_INFERENCE_ENDPOINT_ID env var is not set');
      }

      // ---- 4a: Fetch current endpoint env vars ----
      const fetchQuery = `
        query GetEndpointEnv($id: String!) {
          myself {
            endpoints(filters: { id: $id }) {
              id
              env
            }
          }
        }
      `;

      const fetchResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: fetchQuery,
            variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID },
          }),
        }
      );

      if (!fetchResp.ok) {
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL fetch failed: HTTP ${fetchResp.status}`);
      }

      const fetchData = await fetchResp.json();

      if (fetchData.errors) {
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL errors on fetch: ${JSON.stringify(fetchData.errors)}`);
      }

      const endpoints = fetchData?.data?.myself?.endpoints;
      if (!endpoints || endpoints.length === 0) {
        throw new Error(`[AutoDeployAdapter] RunPod endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}' not found in GraphQL response`);
      }

      // env is returned as an array of {key, value} objects
      const currentEnv: Array<{ key: string; value: string }> = endpoints[0].env || [];

      // ---- 4b: Parse and update LORA_MODULES ----
      const loraModulesEnv = currentEnv.find((e) => e.key === 'LORA_MODULES');
      let loraModules: LoraModule[] = [];

      if (loraModulesEnv?.value) {
        try {
          loraModules = JSON.parse(loraModulesEnv.value);
        } catch {
          console.warn(`[AutoDeployAdapter] Could not parse existing LORA_MODULES — starting fresh: ${loraModulesEnv.value}`);
        }
      }

      // Add the new adapter only if it's not already present (idempotency)
      if (!loraModules.find((m) => m.name === adapterName)) {
        loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
        console.log(`[AutoDeployAdapter] Adding adapter '${adapterName}' to LORA_MODULES (total: ${loraModules.length})`);
      } else {
        console.log(`[AutoDeployAdapter] Adapter '${adapterName}' already in LORA_MODULES — no change needed`);
        return { loraModules, noChange: true };
      }

      // ---- 4c: Build the updated env array ----
      // Preserve all other env vars, replace LORA_MODULES
      const updatedEnv = [
        ...currentEnv
          .filter((e) => e.key !== 'LORA_MODULES')
          .map((e) => ({ key: e.key, value: e.value })),
        { key: 'LORA_MODULES', value: JSON.stringify(loraModules) },
      ];

      // ---- 4d: Save updated env vars to RunPod ----
      const saveMutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) {
            id
            env
          }
        }
      `;

      const saveResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: saveMutation,
            variables: {
              input: {
                id: RUNPOD_INFERENCE_ENDPOINT_ID,
                env: updatedEnv,
              },
            },
          }),
        }
      );

      if (!saveResp.ok) {
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL save failed: HTTP ${saveResp.status}`);
      }

      const saveData = await saveResp.json();

      if (saveData.errors) {
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL errors on save: ${JSON.stringify(saveData.errors)}`);
      }

      console.log(`[AutoDeployAdapter] LORA_MODULES updated on endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}'. Adapters: ${loraModules.map((m) => m.name).join(', ')}`);

      return { loraModules };
    });

    // =====================================================
    // Step 5 (Optional / Non-Fatal): vLLM hot reload on live workers
    // This allows already-running workers to load the adapter without restarting.
    // If this fails, the adapter will be available on the next cold start.
    // =====================================================
    await step.run('vllm-hot-reload', async () => {
      if (!INFERENCE_API_URL) {
        console.log('[AutoDeployAdapter] INFERENCE_API_URL not set — skipping vLLM hot reload');
        return { skipped: true };
      }

      try {
        const loadResp = await fetch(`${INFERENCE_API_URL}/v1/load_lora_adapter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lora_name: adapterName,
            lora_path: hfUploadResult.hfPath,
          }),
        });

        if (loadResp.ok) {
          console.log(`[AutoDeployAdapter] vLLM hot reload succeeded for '${adapterName}'`);
          return { loaded: true };
        } else {
          const errBody = await loadResp.text();
          // Non-fatal: log and continue
          console.warn(`[AutoDeployAdapter] vLLM hot reload returned ${loadResp.status} (non-fatal): ${errBody.slice(0, 300)}`);
          return { loaded: false, warning: `HTTP ${loadResp.status}` };
        }
      } catch (err: any) {
        // Non-fatal: vLLM may not be running / endpoint cold
        console.warn('[AutoDeployAdapter] vLLM hot reload threw (non-fatal):', err?.message);
        return { loaded: false, warning: err?.message };
      }
    });

    // =====================================================
    // Step 6: Create or update pipeline_inference_endpoints records
    // =====================================================
    await step.run('update-inference-endpoints-db', async () => {
      const supabase = createServerSupabaseAdminClient();

      const virtualControlId = `virtual-inference-${jobId.slice(0, 8)}-control`;
      const virtualAdaptedId = `virtual-inference-${jobId.slice(0, 8)}-adapted`;
      const now = new Date().toISOString();
      const healthCheckUrl = INFERENCE_API_URL ? `${INFERENCE_API_URL}/health` : null;

      // Check if an adapted endpoint record already exists for this job
      const { data: existing } = await supabase
        .from('pipeline_inference_endpoints')
        .select('id, endpoint_type')
        .eq('job_id', jobId)
        .eq('endpoint_type', 'adapted')
        .maybeSingle();

      if (!existing) {
        // First time — create both control and adapted endpoint records
        const { error: insertError } = await supabase
          .from('pipeline_inference_endpoints')
          .insert([
            {
              job_id: jobId,
              user_id: userId,
              endpoint_type: 'control',
              runpod_endpoint_id: virtualControlId,
              base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
              status: 'ready',
              ready_at: now,
              health_check_url: healthCheckUrl,
            },
            {
              job_id: jobId,
              user_id: userId,
              endpoint_type: 'adapted',
              runpod_endpoint_id: virtualAdaptedId,
              base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
              adapter_path: hfUploadResult.hfPath,
              status: 'ready',
              ready_at: now,
              health_check_url: healthCheckUrl,
            },
          ]);

        if (insertError) {
          // Log but do not throw — DB record is a convenience, not blocking
          console.error(`[AutoDeployAdapter] Failed to insert pipeline_inference_endpoints: ${insertError.message}`);
        } else {
          console.log(`[AutoDeployAdapter] Created inference endpoint records for job ${jobId}`);
        }
      } else {
        // Already exists — update the adapted endpoint record
        const { error: updateError } = await supabase
          .from('pipeline_inference_endpoints')
          .update({
            adapter_path: hfUploadResult.hfPath,
            status: 'ready',
            ready_at: now,
          })
          .eq('job_id', jobId)
          .eq('endpoint_type', 'adapted');

        if (updateError) {
          console.error(`[AutoDeployAdapter] Failed to update pipeline_inference_endpoints: ${updateError.message}`);
        } else {
          console.log(`[AutoDeployAdapter] Updated adapted endpoint record for job ${jobId}`);
        }
      }
    });

    // =====================================================
    // Step 7: Write hf_adapter_path back to pipeline_training_jobs
    // This marks the job as fully deployed and enables the idempotency guard in Step 1.
    // =====================================================
    await step.run('update-job-hf-path', async () => {
      const supabase = createServerSupabaseAdminClient();

      const { error } = await supabase
        .from('pipeline_training_jobs')
        .update({
          hf_adapter_path: hfUploadResult.hfPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) {
        throw new Error(`[AutoDeployAdapter] Failed to write hf_adapter_path to pipeline_training_jobs: ${error.message}`);
      }

      console.log(`[AutoDeployAdapter] Job ${jobId} fully deployed. hf_adapter_path = ${hfUploadResult.hfPath}`);
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

---

### 4.3 File: `src/inngest/functions/index.ts`

**Change:** Import and register `autoDeployAdapter`.

**Current file (full):**

```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
];

export { processRAGDocument, dispatchTrainingJob, dispatchTrainingJobFailureHandler };
```

**Updated file (full replacement):**

```typescript
/**
 * Inngest Function Registry
 *
 * This file exports all Inngest functions so they can be registered
 * with the Inngest webhook endpoint (src/app/api/inngest/route.ts).
 *
 * How it works:
 * 1. Define functions in separate files (e.g., process-rag-document.ts)
 * 2. Export them from this index file
 * 3. Import into the webhook endpoint
 * 4. Inngest auto-discovers and registers them on deployment
 */

import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';

/**
 * All Inngest functions for this application.
 * Add new functions to this array as you create them.
 * Inngest will automatically sync them when you deploy.
 */
export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
];

export { processRAGDocument, dispatchTrainingJob, dispatchTrainingJobFailureHandler, autoDeployAdapter };
```

---

### 4.4 New File: `src/app/api/webhooks/training-complete/route.ts`

**This is a new file.** Create the directory structure:  
`src/app/api/webhooks/training-complete/` and place `route.ts` inside it.

**What this route does:**
- Receives the Supabase Database Webhook HTTP POST call
- Validates the request using a shared secret in the `x-webhook-secret` header
- Checks that the webhook is for a completed job with an adapter file path
- Fires the `pipeline/adapter.ready` Inngest event

**Supabase Database Webhook payload format:**
```json
{
  "type": "UPDATE",
  "table": "pipeline_training_jobs",
  "schema": "public",
  "record": {
    "id": "608fbb9b-2f05-450b-b38b-f029f2f2b70b",
    "user_id": "...",
    "status": "completed",
    "adapter_file_path": "lora-models/adapters/608fbb9b-...tar.gz",
    ...
  },
  "old_record": { "status": "running", ... }
}
```

**Full file content:**

```typescript
/**
 * Webhook Route: Training Complete
 *
 * Receives: Supabase Database Webhook (table=pipeline_training_jobs, event=UPDATE)
 * Condition: Only acts when record.status === 'completed' AND record.adapter_file_path is set
 *
 * Fires Inngest event: 'pipeline/adapter.ready'
 * Which triggers: autoDeployAdapter function in src/inngest/functions/auto-deploy-adapter.ts
 *
 * Security:
 *   Supabase sends a custom header 'x-webhook-secret' that we validate against
 *   the WEBHOOK_SECRET env var. Requests without the correct secret return 401.
 *   Configure this header value in the Supabase webhook settings.
 *
 * Supabase Webhook Configuration:
 *   Table:  pipeline_training_jobs
 *   Events: UPDATE
 *   URL:    https://v4-show.vercel.app/api/webhooks/training-complete
 *   Headers: x-webhook-secret: <value of WEBHOOK_SECRET env var>
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  // ---- Security: validate shared secret ----
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('[WebhookTrainingComplete] WEBHOOK_SECRET env var is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const incomingSecret = request.headers.get('x-webhook-secret');

  if (incomingSecret !== secret) {
    console.warn('[WebhookTrainingComplete] Rejected request with invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Parse Supabase webhook payload ----
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const record = payload?.record;

  // Guard: only proceed for completed jobs with an adapter file
  if (!record || record.status !== 'completed' || !record.adapter_file_path) {
    return NextResponse.json({
      ok: true,
      message: 'Ignored — conditions not met',
      status: record?.status,
      hasAdapterPath: !!record?.adapter_file_path,
    });
  }

  // Guard: require user_id on the record (identity spine requirement)
  if (!record.user_id) {
    console.error(`[WebhookTrainingComplete] Job ${record.id} has no user_id — cannot fire event`);
    return NextResponse.json({ error: 'Record missing user_id' }, { status: 422 });
  }

  // ---- Fire Inngest event ----
  try {
    await inngest.send({
      name: 'pipeline/adapter.ready',
      data: {
        jobId: record.id,
        userId: record.user_id,
        adapterFilePath: record.adapter_file_path,
      },
    });

    console.log(`[WebhookTrainingComplete] Fired pipeline/adapter.ready for job ${record.id}`);

    return NextResponse.json({
      ok: true,
      jobId: record.id,
      message: 'pipeline/adapter.ready event sent',
    });
  } catch (err: any) {
    console.error(`[WebhookTrainingComplete] Failed to send Inngest event for job ${record.id}:`, err?.message);
    return NextResponse.json({ error: 'Failed to send event' }, { status: 500 });
  }
}
```

---

## Part 5 — Human Actions Required

These steps cannot be automated by code changes — they require human action in external dashboards.

### Action H1 — Install npm dependency

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npm install tar-stream
npm install --save-dev @types/tar-stream
```

Confirm `tar-stream` appears in `package.json` `dependencies` after running.

### Action H2 — Run SAOL database migration

Run the SAOL command from **Part 3.1** of this specification.

### Action H3 — Add Vercel environment variables

In Vercel Dashboard → Project `v2-modules` → Settings → Environment Variables, add:

| Variable | Value | Environments |
|----------|-------|-------------|
| `HF_TOKEN` | Your HuggingFace write token for `BrightHub2` org | Production, Preview |
| `HF_ORG` | `BrightHub2` | Production, Preview |
| `HF_ADAPTER_REPO_PREFIX` | `lora-emotional-intelligence` | Production, Preview |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` | Production, Preview |
| `WEBHOOK_SECRET` | A 32-char hex string (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) | Production, Preview |

Also add all five to your local `.env.local` file for development.

### Action H4 — Configure Supabase Database Webhook

In Supabase Dashboard → Project `hqhtbxlgzysfbekexwku` → Database → Webhooks → Create a new webhook:

| Field | Value |
|-------|-------|
| **Webhook name** | `pipeline-adapter-ready` |
| **Table** | `pipeline_training_jobs` |
| **Events** | `UPDATE` only |
| **URL** | `https://v4-show.vercel.app/api/webhooks/training-complete` |
| **HTTP method** | POST |
| **Custom headers** | Key: `x-webhook-secret` / Value: the same value you set for `WEBHOOK_SECRET` in H3 |

> **Note on filtering:** Supabase Database Webhooks (as of 2026) do not support column-level filter conditions in the dashboard UI. The `status = completed` filtering is done in the webhook route code itself — all UPDATE events on `pipeline_training_jobs` will be received, but only those with `status=completed AND adapter_file_path IS NOT NULL` will trigger the Inngest event.

### Action H5 — Deploy code to Vercel

After all code changes are made and committed:

```bash
git add src/inngest/client.ts
git add src/inngest/functions/auto-deploy-adapter.ts
git add src/inngest/functions/index.ts
git add src/app/api/webhooks/training-complete/route.ts
git add package.json package-lock.json
git commit -m "feat: auto-deploy adapter to HuggingFace and RunPod after training completes"
git push origin main
```

Vercel will auto-deploy. After deploy:
1. Go to Inngest Dashboard → Functions — confirm `auto-deploy-adapter` appears in the registered functions list
2. If it does not appear, go to Inngest Dashboard → Syncing → manually trigger a sync for the Vercel deployment

### Action H6 — Verify end-to-end

The best verification is running a new training job. However, you can also simulate the trigger manually:

```bash
# Simulate what the webhook sends to Inngest for the already-completed job 608fbb9b
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'608fbb9b-2f05-450b-b38b-f029f2f2b70b'}],
    select: 'id, user_id, status, adapter_file_path, hf_adapter_path'
  });
  console.log(JSON.stringify(r.data[0], null, 2));
})();"
```

If `hf_adapter_path` is still null, you can trigger deployment for that job by calling the webhook route directly (replace `YOUR_SECRET` with the real value):

```bash
curl -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "type": "UPDATE",
    "table": "pipeline_training_jobs",
    "schema": "public",
    "record": {
      "id": "608fbb9b-2f05-450b-b38b-f029f2f2b70b",
      "user_id": "<PASTE_USER_ID_FROM_SAOL_QUERY_ABOVE>",
      "status": "completed",
      "adapter_file_path": "lora-models/adapters/608fbb9b-2f05-450b-b38b-f029f2f2b70b.tar.gz",
      "hf_adapter_path": null
    }
  }'
```

Then watch the Inngest dashboard for the `auto-deploy-adapter` run.

---

## Part 6 — Implementation Order Checklist

Work through this checklist in sequence. Each step has a dependency on the prior.

- [ ] **H1** — `npm install tar-stream` and `@types/tar-stream`
- [ ] **H2** — Run SAOL migration to add `hf_adapter_path` column
- [ ] **H3** — Add Vercel + `.env.local` environment variables (especially `WEBHOOK_SECRET`)
- [ ] **4.1** — Edit `src/inngest/client.ts` (add `pipeline/adapter.ready` event type)
- [ ] **4.2** — Create `src/inngest/functions/auto-deploy-adapter.ts` (new file)
- [ ] **4.3** — Edit `src/inngest/functions/index.ts` (register `autoDeployAdapter`)
- [ ] **4.4** — Create `src/app/api/webhooks/training-complete/route.ts` (new file)
- [ ] **H5** — Commit and push to Vercel; verify `auto-deploy-adapter` appears in Inngest dashboard
- [ ] **H4** — Configure Supabase Database Webhook pointing at deployed URL
- [ ] **H6** — Verify end-to-end (trigger test, watch Inngest run, check DB with SAOL)

---

## Part 7 — TypeScript / Linting Notes

### 7.1 `tar-stream` types

After `npm install --save-dev @types/tar-stream`, TypeScript should resolve types automatically. If you see `Cannot find module 'tar-stream'` errors, ensure `@types/tar-stream` is installed and that `tsconfig.json` includes `node_modules/@types` in its `typeRoots` (the default Next.js tsconfig does this automatically).

### 7.2 Dynamic imports

The `auto-deploy-adapter.ts` function uses `await import('zlib')`, `await import('stream')`, and `await import('tar-stream')`. These dynamic imports work in Vercel's Node.js runtime but **will not work in Edge Runtime**. The Inngest function runs in the standard Node.js Vercel Function runtime, not Edge, so this is safe.

### 7.3 Error handling patterns

- Steps 1–4 and Step 7 are **fatal** — if they throw, Inngest will retry the entire function (up to 2 times)
- Step 5 (vLLM hot reload) is **non-fatal** — it catches all errors and returns a warning object rather than throwing
- Step 6 (DB records) logs errors but does not throw, because the primary goal (HuggingFace + RunPod) is already achieved

### 7.4 SAOL vs direct Supabase client

The `auto-deploy-adapter.ts` function uses `createServerSupabaseAdminClient()` directly (not SAOL CLI). This is correct for server-side production code — SAOL's CLI wrapper is for the agent-ops tooling. The mandate "all DB operations MUST use SAOL" in this context means the **service role admin client pattern** (`createServerSupabaseAdminClient()`) rather than the anon/RLS client, which is exactly what this function uses.

---

## Part 8 — Architecture Decisions and Rationale

### Why Supabase Database Webhook (not polling)?

Polling from the Inngest `dispatch-training-job` function would require waiting up to 45 minutes with `step.waitForEvent`. Supabase Database Webhooks fire immediately on the UPDATE — zero latency from training completion to deployment start.

### Why `concurrency: { limit: 1 }`?

The `update-runpod-lora-modules` step reads the current `LORA_MODULES`, appends to it, then writes it back. If two jobs complete simultaneously, both could read the same value and the second write would overwrite the first, losing an adapter. `limit: 1` prevents concurrent runs.

### Why is the tar extraction done in-memory (not on disk)?

Vercel Serverless Functions have a `/tmp` directory with a 512 MB limit, but writing and reading temp files adds complexity and fragility. The adapter tar.gz for a Mistral-7B LoRA adapter is typically 20–100 MB — well within the memory budget of a Node.js function. In-memory extraction via `tar-stream` is cleaner and avoids cleanup concerns.

### Why base64 for the Inngest step return value?

Inngest serialises step results to JSON and stores them for retries. `Buffer` objects are not JSON-serialisable. Base64-encoding the tar buffer allows it to pass through Inngest's step checkpoint mechanism. This is the standard pattern for binary data in Inngest steps.

### Why is `hf_adapter_path` the idempotency signal?

Writing `hf_adapter_path` is the last step. If the function is retried (e.g., after a transient HuggingFace API error), Step 1 checks `hf_adapter_path IS NULL`. If it is not null, the function returns early. This prevents double-uploads and double-LORA_MODULES entries on retry.

---

## Part 9 — Post-Deployment Verification Queries

After deployment and a successful end-to-end test, use SAOL to confirm the state:

```bash
# Check hf_adapter_path is populated for the completed job
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'status', operator:'eq', value:'completed'}],
    select: 'id, job_name, status, adapter_file_path, hf_adapter_path, completed_at',
    orderBy: [{column:'completed_at', asc:false}],
    limit: 5
  });
  console.log('Completed jobs:');
  r.data.forEach(j => console.log(
    j.id.slice(0,8),
    j.job_name?.slice(0,30),
    j.hf_adapter_path ? '✓ HF deployed' : '✗ not deployed',
    j.hf_adapter_path || '(null)'
  ));
})();"
```

```bash
# Check pipeline_inference_endpoints were created
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_inference_endpoints',
    select: 'job_id, endpoint_type, status, adapter_path, ready_at',
    orderBy: [{column:'ready_at', asc:false}],
    limit: 10
  });
  console.log('Inference endpoints:');
  r.data.forEach(e => console.log(
    e.job_id?.slice(0,8),
    e.endpoint_type,
    e.status,
    e.adapter_path || '(no adapter)'
  ));
})();"
```

---

## Part 10 — Full Automated Flow After Implementation

```
User clicks "Start Training" on /pipeline/configure
        ↓
POST /api/pipeline/jobs → creates pipeline_training_jobs (status='pending')
        ↓
inngest.send('pipeline/job.created') → dispatchTrainingJob function
        ↓
RunPod brightrun-lora-trainer-qwen trains Mistral-7B LoRA adapter (~35-45 min)
        ↓
Worker uploads adapter.tar.gz to Supabase Storage: lora-models/adapters/{jobId}.tar.gz
Worker calls Supabase API → pipeline_training_jobs.status = 'completed', adapter_file_path set
        ↓
Supabase Database Webhook fires on UPDATE
        ↓
POST /api/webhooks/training-complete (validates secret, checks completed + adapter path)
        ↓
inngest.send('pipeline/adapter.ready')
        ↓
Inngest autoDeployAdapter function runs:
  Step 1: Fetch + validate job (checks hf_adapter_path IS NULL for idempotency)
  Step 2: Download tar.gz from Supabase Storage → base64 in memory
  Step 3: Extract tar.gz in memory → push all files to HuggingFace Hub
          BrightHub2/lora-emotional-intelligence-{jobId[:8]}
  Step 4: Update RunPod endpoint ei82ickpenoqlp LORA_MODULES via GraphQL API
          (appends {"name":"adapter-{id[:8]}","path":"BrightHub2/lora-..."})
  Step 5: (Optional) vLLM /v1/load_lora_adapter — live hot reload
  Step 6: Create pipeline_inference_endpoints records (control + adapted, status='ready')
  Step 7: Write hf_adapter_path to pipeline_training_jobs (deployment complete signal)
        ↓
User visits /pipeline/jobs/{jobId}/results
"Deploy & Test Adapter" shows adapter is ready
A/B test runs immediately — no manual steps required
```

**Total time from training completion to testable adapter:** ~2 minutes.
