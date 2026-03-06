# Adapter Auto-Deployment — Execution Prompt E02
# Core Inngest Infrastructure: Event Type + Auto-Deploy Function

**Version:** 1.0  
**Date:** 2026-02-24  
**Section:** E02 — Inngest Event Type, Auto-Deploy Function, Function Registry  
**Prerequisite:** E01 must be complete (`hf_adapter_path` column added, `tar-stream` installed)  
**Next step:** E03 (Webhook Route + Human Actions)

---

## Overview

E02 creates the three core TypeScript changes that power the automation:

1. **`src/inngest/client.ts`** — add the `pipeline/adapter.ready` event type
2. **`src/inngest/functions/auto-deploy-adapter.ts`** — the new Inngest function (NEW FILE)
3. **`src/inngest/functions/index.ts`** — register the new function

**E02 creates/modifies:**
- `src/inngest/client.ts` (edit)
- `src/inngest/functions/auto-deploy-adapter.ts` (NEW)
- `src/inngest/functions/index.ts` (edit)

**E02 does NOT create:**
- The webhook API route (that is E03)
- Any Supabase Edge Functions
- Any UI components

---

========================


## Context and Purpose

You are implementing E02 of a three-part feature: **Automated Adapter Deployment** for a LoRA training SaaS platform.

**The problem being solved:**  
When a LoRA training job completes on RunPod, the adapter (tar.gz) is uploaded to Supabase Storage. Currently a human must manually extract it, push it to HuggingFace Hub, and update the RunPod inference endpoint's `LORA_MODULES` environment variable. E02 automates all of that through an Inngest background function.

**What E01 already completed (do NOT redo):**
- Added `hf_adapter_path TEXT` column to `pipeline_training_jobs`
- Installed `tar-stream` and `@types/tar-stream` npm packages
- Added env var placeholders to `.env.local`

**Your job in E02:**
1. Add the `pipeline/adapter.ready` event type to `src/inngest/client.ts`
2. Create the full `auto-deploy-adapter.ts` Inngest function
3. Register the new function in `src/inngest/functions/index.ts`
4. Verify TypeScript compiles without errors

**Target codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

---

## Critical Rules

1. **Read each file before editing it.** The current state must be verified before any change.
2. **Use `createServerSupabaseAdminClient()` for ALL Supabase DB operations** within the Inngest function. Never use `createServerSupabaseClient()` (the RLS client) in server-side background jobs — it requires session cookies which are not available in Inngest.
3. **Do NOT reference SAOL in TypeScript code.** SAOL is a CLI-only development tool. Production code uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server`.
4. **tar-stream extraction must handle errors correctly.** Call `next()` from inside the `stream.on('end')` callback — after the async upload completes. Never leave `next()` uncalled.
5. **Step 5 (vLLM hot reload) is non-fatal.** It must catch all errors and return a result object — never throw.
6. **Base64-encode the tar buffer** when returning it from a `step.run()` call. Inngest serializes step results to JSON; raw `Buffer` objects are not JSON-serializable.

---

## Step 1: Read Current File States

Before editing, read these files to confirm their current contents:

### 1a: Read `src/inngest/client.ts`

Read the file at: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts`

**What to confirm:**
- The file exports `inngest` (Inngest client instance)
- `InngestEvents` type includes `rag/document.uploaded` and `pipeline/job.created`
- `pipeline/adapter.ready` is **NOT yet present** (you will add it)

### 1b: Read `src/inngest/functions/index.ts`

Read the file at: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts`

**What to confirm:**
- It exports `inngestFunctions` array containing: `processRAGDocument`, `dispatchTrainingJob`, `dispatchTrainingJobFailureHandler`
- `autoDeployAdapter` is **NOT yet imported or registered**

### 1c: Check `src/inngest/functions/` directory

List the files in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\`

**What to confirm:**
- `auto-deploy-adapter.ts` does **NOT yet exist** (you will create it)

### 1d: Read `src/lib/supabase-server.ts`

Read the file at: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\supabase-server.ts`

**What to confirm:**
- `createServerSupabaseAdminClient()` function is exported and uses `SUPABASE_SERVICE_ROLE_KEY`
- This is the correct function to use in Inngest background jobs

---

## Step 2: Edit `src/inngest/client.ts` — Add `pipeline/adapter.ready` Event Type

### What to change

The `InngestEvents` type currently ends after the `pipeline/job.created` entry. Add the `pipeline/adapter.ready` entry immediately after it, before the closing `};`.

### Exact Change

Find this exact block in `src/inngest/client.ts`:

```typescript
  'pipeline/job.created': {
    data: {
      jobId: string;
      userId: string;
    };
  };
};
```

Replace it with:

```typescript
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
   * - userId: UUID of the job owner (used when creating pipeline_inference_endpoints)
   * - adapterFilePath: Storage path e.g. "lora-models/adapters/608fbb9b-...tar.gz"
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

After making the edit, verify the file still exports a valid `InngestEvents` type and `inngest` client. The closing `};` of the type should appear exactly once.

---

## Step 3: Create `src/inngest/functions/auto-deploy-adapter.ts` (NEW FILE)

This is a new file. Create it at:
`C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts`

Write the **complete** file content exactly as follows:

```typescript
/**
 * Inngest Function: Auto-Deploy Adapter to Inference Endpoint
 *
 * Triggered by: 'pipeline/adapter.ready' event
 * Event is sent by: POST /api/webhooks/training-complete
 * That webhook is fired by: Supabase Database Webhook on pipeline_training_jobs UPDATE where status='completed'
 *
 * What this function does, in sequence:
 *   Step 1: Fetch and validate the completed job record
 *   Step 2: Download the adapter tar.gz from Supabase Storage (returns base64)
 *   Step 3: Extract the tar.gz in memory and push all files to HuggingFace Hub
 *   Step 4: Update RunPod inference endpoint LORA_MODULES via GraphQL API
 *   Step 5: (Optional, non-fatal) Call vLLM /v1/load_lora_adapter for hot reload on live workers
 *   Step 6: Create or update pipeline_inference_endpoints records in DB
 *   Step 7: Write hf_adapter_path back to pipeline_training_jobs (marks deployment complete)
 *
 * Concurrency: limit=1 — prevents LORA_MODULES read-modify-write race conditions
 *   if two jobs complete simultaneously.
 * Retries: 2 — handles transient HuggingFace and RunPod API failures.
 *
 * Naming conventions (matching the existing production adapter 6fd5ac79):
 *   Adapter name in vLLM:      adapter-{jobId[:8]}
 *   HuggingFace repo:          BrightHub2/lora-emotional-intelligence-{jobId[:8]}
 *   DB virtual endpoint ID:    virtual-inference-{jobId[:8]}-control / -adapted
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
        throw new Error(
          `[AutoDeployAdapter] Job ${jobId} has status '${data.status}', expected 'completed' — aborting`
        );
      }

      if (!data.adapter_file_path) {
        throw new Error(
          `[AutoDeployAdapter] Job ${jobId} is completed but has no adapter_file_path — ` +
          `training worker may not have uploaded the artifact`
        );
      }

      // Idempotency guard: if already deployed, skip the whole function
      if (data.hf_adapter_path) {
        console.log(
          `[AutoDeployAdapter] Job ${jobId} already deployed to ${data.hf_adapter_path} — skipping`
        );
        return null;
      }

      return data;
    });

    // Already deployed — nothing more to do
    if (!job) return { skipped: true, jobId, reason: 'already-deployed' };

    // =====================================================
    // Step 2: Download adapter tar.gz from Supabase Storage
    // Returns base64-encoded buffer (Inngest step results must be JSON-serializable)
    // =====================================================
    const tarBufferBase64 = await step.run('download-adapter', async () => {
      const supabase = createServerSupabaseAdminClient();

      // adapter_file_path example: "lora-models/adapters/608fbb9b-...tar.gz"
      // Supabase Storage download() path is relative to the bucket root:
      //   bucket='lora-models', path='adapters/608fbb9b-...tar.gz'
      let storagePath = adapterFilePath;
      if (storagePath.startsWith('lora-models/')) {
        storagePath = storagePath.slice('lora-models/'.length);
      }

      const { data, error } = await supabase.storage
        .from('lora-models')
        .download(storagePath);

      if (error || !data) {
        throw new Error(
          `[AutoDeployAdapter] Failed to download adapter from Storage path '${storagePath}': ${error?.message}`
        );
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      console.log(`[AutoDeployAdapter] Downloaded ${buffer.length} bytes from Supabase Storage`);
      return buffer.toString('base64');
    });

    // =====================================================
    // Step 3: Extract tar.gz in memory and push to HuggingFace Hub
    // =====================================================
    const hfUploadResult: HFUploadResult = await step.run('push-to-huggingface', async () => {
      if (!HF_TOKEN) {
        throw new Error(
          '[AutoDeployAdapter] HF_TOKEN env var is not set — cannot push to HuggingFace Hub'
        );
      }

      // ---- 3a: Create HuggingFace repository ----
      const createRepoResp = await fetch('https://huggingface.co/api/repos/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'model',
          name: hfRepoName,
          organization: HF_ORG,
          private: false, // RunPod workers must pull the adapter anonymously
        }),
      });

      // 409 = repo already exists — acceptable (expected on retries)
      if (!createRepoResp.ok && createRepoResp.status !== 409) {
        const errBody = await createRepoResp.text();
        throw new Error(
          `[AutoDeployAdapter] Failed to create HuggingFace repo '${hfPath}': ` +
          `HTTP ${createRepoResp.status} — ${errBody.slice(0, 300)}`
        );
      }

      const repoStatus = createRepoResp.status === 409 ? 'already existed' : 'created';
      console.log(`[AutoDeployAdapter] HuggingFace repo ${hfPath} ${repoStatus}`);

      // ---- 3b: Extract tar.gz and upload each file ----
      const tarData = Buffer.from(tarBufferBase64, 'base64');

      // Dynamic imports — these are Node.js built-ins available in Vercel Node.js runtime
      // The Inngest function runs in standard Node.js runtime (NOT Edge runtime)
      const zlib = await import('zlib');
      const streamModule = await import('stream');
      const tarStream = await import('tar-stream');

      const uploadedFiles: string[] = [];
      const uploadErrors: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const extractor = tarStream.extract();
        const gunzip = zlib.createGunzip();
        const readable = streamModule.Readable.from(tarData);

        extractor.on('entry', (header, entryStream, next) => {
          const chunks: Buffer[] = [];

          entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));

          entryStream.on('end', () => {
            // Skip directories, hidden files, and macOS metadata artefacts
            if (header.type !== 'file') {
              next();
              return;
            }

            // Strip leading directory: "adapter-name/file.json" → "file.json"
            const rawName = header.name.replace(/\\/g, '/');
            const fileName = rawName.includes('/')
              ? rawName.split('/').slice(1).join('/')
              : rawName;

            if (!fileName || fileName.startsWith('.') || fileName.startsWith('__MACOSX')) {
              next();
              return;
            }

            const fileData = Buffer.concat(chunks);

            // Upload asynchronously then call next() to advance the extractor
            fetch(
              `https://huggingface.co/api/models/${HF_ORG}/${hfRepoName}/upload/main/${encodeURIComponent(fileName)}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${HF_TOKEN}`,
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
                const msg = `Upload exception for ${fileName}: ${err.message}`;
                uploadErrors.push(msg);
                console.warn(`[AutoDeployAdapter] ${msg}`);
                next(); // Continue processing remaining entries even on individual upload failure
              });
          });

          entryStream.on('error', (err) => {
            console.warn(`[AutoDeployAdapter] Entry stream error for ${header.name}:`, err.message);
            next();
          });

          // Drain the entry stream — required for tar-stream to advance to next entry
          entryStream.resume();
        });

        extractor.on('finish', () => {
          if (uploadedFiles.length === 0 && uploadErrors.length > 0) {
            reject(
              new Error(
                `[AutoDeployAdapter] All file uploads failed: ${uploadErrors.join('; ')}`
              )
            );
          } else {
            resolve();
          }
        });

        extractor.on('error', (err) =>
          reject(new Error(`[AutoDeployAdapter] tar extraction failed: ${err.message}`))
        );
        gunzip.on('error', (err) =>
          reject(new Error(`[AutoDeployAdapter] gzip decompression failed: ${err.message}`))
        );

        readable.pipe(gunzip).pipe(extractor);
      });

      if (uploadedFiles.length === 0) {
        throw new Error(
          `[AutoDeployAdapter] No files were uploaded to HuggingFace — upload failed entirely`
        );
      }

      console.log(
        `[AutoDeployAdapter] Pushed ${uploadedFiles.length} files to ${hfPath} ` +
        `(${uploadErrors.length} warnings)`
      );

      return { hfPath, uploadedFiles };
    });

    // =====================================================
    // Step 4: Update RunPod inference endpoint LORA_MODULES via GraphQL API
    // =====================================================
    await step.run('update-runpod-lora-modules', async () => {
      if (!RUNPOD_API_KEY) {
        throw new Error(
          '[AutoDeployAdapter] GPU_CLUSTER_API_KEY env var is not set — cannot update RunPod endpoint'
        );
      }
      if (!RUNPOD_INFERENCE_ENDPOINT_ID) {
        throw new Error(
          '[AutoDeployAdapter] RUNPOD_INFERENCE_ENDPOINT_ID env var is not set'
        );
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
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL fetch failed: HTTP ${fetchResp.status}`
        );
      }

      const fetchData = await fetchResp.json();

      if (fetchData.errors) {
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL errors on fetch: ${JSON.stringify(fetchData.errors)}`
        );
      }

      const endpoints = fetchData?.data?.myself?.endpoints;
      if (!endpoints || endpoints.length === 0) {
        throw new Error(
          `[AutoDeployAdapter] RunPod endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}' not found in GraphQL response`
        );
      }

      // env is returned as an array of {key, value} objects
      const currentEnv: Array<{ key: string; value: string }> = endpoints[0].env || [];

      // ---- 4b: Parse existing LORA_MODULES and add new adapter ----
      const loraModulesEnv = currentEnv.find((e) => e.key === 'LORA_MODULES');
      let loraModules: LoraModule[] = [];

      if (loraModulesEnv?.value) {
        try {
          loraModules = JSON.parse(loraModulesEnv.value);
        } catch {
          console.warn(
            `[AutoDeployAdapter] Could not parse existing LORA_MODULES — starting fresh: ${loraModulesEnv.value}`
          );
        }
      }

      // Idempotency: only add if not already present
      if (!loraModules.find((m) => m.name === adapterName)) {
        loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
        console.log(
          `[AutoDeployAdapter] Adding '${adapterName}' to LORA_MODULES (total adapters: ${loraModules.length})`
        );
      } else {
        console.log(
          `[AutoDeployAdapter] Adapter '${adapterName}' already in LORA_MODULES — no change needed`
        );
        return { loraModules, noChange: true };
      }

      // ---- 4c: Build updated env array (preserve all other vars, replace LORA_MODULES) ----
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
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL save failed: HTTP ${saveResp.status}`
        );
      }

      const saveData = await saveResp.json();

      if (saveData.errors) {
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL errors on save: ${JSON.stringify(saveData.errors)}`
        );
      }

      console.log(
        `[AutoDeployAdapter] LORA_MODULES updated on endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}'. ` +
        `Adapters: ${loraModules.map((m) => m.name).join(', ')}`
      );

      return { loraModules };
    });

    // =====================================================
    // Step 5 (Optional / Non-Fatal): vLLM hot reload on live workers
    // Allows already-running workers to serve the new adapter without restarting.
    // If this fails the adapter will become available on the next worker cold start.
    // This step MUST NOT throw — non-fatal errors are returned as warning objects.
    // =====================================================
    await step.run('vllm-hot-reload', async () => {
      if (!INFERENCE_API_URL) {
        console.log(
          '[AutoDeployAdapter] INFERENCE_API_URL not set — skipping vLLM hot reload'
        );
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
          console.log(
            `[AutoDeployAdapter] vLLM hot reload succeeded for '${adapterName}'`
          );
          return { loaded: true };
        } else {
          const errBody = await loadResp.text();
          console.warn(
            `[AutoDeployAdapter] vLLM hot reload returned ${loadResp.status} (non-fatal): ${errBody.slice(0, 300)}`
          );
          return { loaded: false, warning: `HTTP ${loadResp.status}` };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[AutoDeployAdapter] vLLM hot reload threw (non-fatal):', message);
        return { loaded: false, warning: message };
      }
    });

    // =====================================================
    // Step 6: Create or update pipeline_inference_endpoints records
    // Creates both 'control' and 'adapted' endpoint records for the job.
    // These records are what the UI reads to enable the "Test Adapter" feature.
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
        .select('id')
        .eq('job_id', jobId)
        .eq('endpoint_type', 'adapted')
        .maybeSingle();

      if (!existing) {
        // First time — insert both control and adapted endpoint records
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
          // Log but do not throw — the adapter is deployed even if this record fails
          console.error(
            `[AutoDeployAdapter] Failed to insert pipeline_inference_endpoints: ${insertError.message}`
          );
        } else {
          console.log(
            `[AutoDeployAdapter] Created inference endpoint records for job ${jobId}`
          );
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
          console.error(
            `[AutoDeployAdapter] Failed to update pipeline_inference_endpoints: ${updateError.message}`
          );
        } else {
          console.log(
            `[AutoDeployAdapter] Updated adapted endpoint record for job ${jobId}`
          );
        }
      }
    });

    // =====================================================
    // Step 7: Write hf_adapter_path back to pipeline_training_jobs
    // This is the final step and serves as the idempotency signal.
    // Once hf_adapter_path is set, Step 1 will skip re-deployment on any future re-runs.
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
        throw new Error(
          `[AutoDeployAdapter] Failed to write hf_adapter_path to pipeline_training_jobs: ${error.message}`
        );
      }

      console.log(
        `[AutoDeployAdapter] ✓ Job ${jobId} fully deployed. hf_adapter_path = ${hfUploadResult.hfPath}`
      );
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

## Step 4: Edit `src/inngest/functions/index.ts` — Register the New Function

### Current expected content (verify this matches what you read in Step 1b)

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

### Replace the entire file with this content

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
 * Add new functions to this array to register them with Inngest on deployment.
 */
export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
};
```

---

## Step 5: TypeScript Verification

Run the TypeScript compiler in no-emit mode to verify there are no type errors:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit 2>&1 | head -50
```

**Expected output:** No errors. The command should return with exit code 0 and no error messages.

**Common errors and fixes:**

| Error | Fix |
|-------|-----|
| `Cannot find module 'tar-stream'` | Run `npm install tar-stream @types/tar-stream` (E01 step) |
| `Property 'pipeline/adapter.ready' does not exist on type 'InngestEvents'` | Verify the edit to `client.ts` was saved correctly |
| `Module '"../client"' has no exported member 'InngestEvents'` | Not required — `inngest` is the only import needed from `client.ts` |
| `Type 'null' is not assignable to type 'string'` | Review the `createServerSupabaseAdminClient()` import path |

---

## Step 6: Lint Check on Modified Files

Run lints on the three modified/created files:

Check `src/inngest/client.ts`, `src/inngest/functions/auto-deploy-adapter.ts`, and `src/inngest/functions/index.ts` using the ReadLints tool.

Fix any errors introduced by your changes. Do not fix pre-existing lint warnings that were present before your edits.

---

## E02 Success Criteria

Before proceeding to E03, confirm ALL of the following:

- [ ] `src/inngest/client.ts` contains `pipeline/adapter.ready` event type with `jobId`, `userId`, `adapterFilePath` fields
- [ ] `src/inngest/functions/auto-deploy-adapter.ts` exists and exports `autoDeployAdapter`
- [ ] `src/inngest/functions/index.ts` imports and registers `autoDeployAdapter` in `inngestFunctions` array
- [ ] `npx tsc --noEmit` returns exit code 0 (no errors)
- [ ] ReadLints on the three modified files returns no new errors

**Once all criteria are met, proceed to E03.**

---

## Files Modified in E02

| File | Change |
|------|--------|
| `src/inngest/client.ts` | Added `pipeline/adapter.ready` event type to `InngestEvents` |
| `src/inngest/functions/auto-deploy-adapter.ts` | **NEW FILE** — full 7-step auto-deploy Inngest function |
| `src/inngest/functions/index.ts` | Imported and registered `autoDeployAdapter` |

+++++++++++++++++
