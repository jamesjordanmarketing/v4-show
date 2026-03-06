/**
 * Inngest Function: Auto-Deploy Adapter to Inference Endpoint
 *
 * Triggered by: 'pipeline/adapter.ready' event
 * Event is sent by: POST /api/webhooks/training-complete
 * That webhook is fired by: Supabase Database Webhook on pipeline_training_jobs UPDATE where status='completed'
 *
 * What this function does, in sequence:
 *   Step 1: Fetch and validate the completed job record
 *   Step 2+3 (merged): Download adapter tar.gz from Supabase Storage, extract in memory,
 *            and push all files to HuggingFace Hub (merged to avoid Inngest output_too_large
 *            — the 66 MB adapter must not be returned as step output; stays in-memory instead)
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
 *
 * Env vars used (all confirmed present in .env.local after E01):
 *   HF_TOKEN                    — HuggingFace write token
 *   HF_ORG                      — "BrightHub2"
 *   HF_ADAPTER_REPO_PREFIX      — "lora-emotional-intelligence"
 *   GPU_CLUSTER_API_KEY         — RunPod API key (used as RUNPOD_API_KEY)
 *   RUNPOD_INFERENCE_ENDPOINT_ID — RunPod serverless inference endpoint to update LORA_MODULES on
 *   INFERENCE_API_URL           — RunPod inference URL; used for vLLM hot reload (non-fatal)
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import { uploadFiles, createRepo, deleteRepo } from '@huggingface/hub';

// ============================================================
// Environment Variables
// ============================================================

const HF_TOKEN = process.env.HF_TOKEN!;
const HF_ORG = process.env.HF_ORG || 'BrightHub2';
const HF_REPO_PREFIX = process.env.HF_ADAPTER_REPO_PREFIX || 'lora-emotional-intelligence';
// Use a dedicated key for GraphQL operations that modify the endpoint
const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL || '';

// ============================================================
// Types
// ============================================================

interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
  hfCommitOid: string | null;
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
        .select('id, user_id, status, adapter_file_path, hf_adapter_path, workbase_id')
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
    // Step 2+3 (MERGED): Download adapter from Supabase Storage,
    // extract tar.gz in memory, and push all files to HuggingFace Hub.
    //
    // WHY MERGED: Inngest step outputs are JSON-serialized and capped at ~4 MB.
    // The adapter tar.gz is ~66 MB (~88 MB as base64). Returning it from one step
    // to pass to the next caused "output_too_large" failures. By doing the download,
    // extract, and upload in a single step.run(), the large data stays in local
    // memory and only small metadata (hfPath + file list) is returned as step output.
    //
    // tar-stream v3.1.7 is installed (ESM package, accessed via dynamic import)
    // =====================================================
    const hfUploadResult = await step.run('download-and-push-to-huggingface', async (): Promise<HFUploadResult> => {
      if (!HF_TOKEN) {
        throw new Error(
          '[AutoDeployAdapter] HF_TOKEN env var is not set — cannot push to HuggingFace Hub'
        );
      }

      // ---- 2a: Download adapter tar.gz from Supabase Storage ----
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

      const tarData = Buffer.from(await data.arrayBuffer());
      console.log(`[AutoDeployAdapter] Downloaded ${tarData.length} bytes from Supabase Storage`);

      // ---- 2b: Extract tar.gz and collect all files in memory ----

      // tar-stream v3.x is ESM-only — must use dynamic import from CJS context.
      // stream and zlib are imported statically at the top of the file to avoid
      // webpack mangling their exports during bundling (which caused
      // "Cannot read properties of undefined (reading 'from')" in production).
      const tarStream = await import('tar-stream');

      const extractedFiles: Array<{ name: string; data: Buffer }> = [];

      await new Promise<void>((resolve, reject) => {
        const extractor = tarStream.extract();
        const gunzip = createGunzip();
        const readable = Readable.from(tarData);

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

            extractedFiles.push({ name: fileName, data: Buffer.concat(chunks) });
            next();
          });

          entryStream.on('error', (err) => {
            console.warn(`[AutoDeployAdapter] Entry stream error for ${header.name}:`, err.message);
            next();
          });

          // Drain the entry stream — required for tar-stream to advance to next entry
          entryStream.resume();
        });

        extractor.on('finish', () => resolve());
        extractor.on('error', (err) =>
          reject(new Error(`[AutoDeployAdapter] tar extraction failed: ${err.message}`))
        );
        gunzip.on('error', (err) =>
          reject(new Error(`[AutoDeployAdapter] gzip decompression failed: ${err.message}`))
        );

        readable.pipe(gunzip).pipe(extractor);
      });

      if (extractedFiles.length === 0) {
        throw new Error(
          `[AutoDeployAdapter] No files were extracted from tar.gz — archive may be empty or corrupt`
        );
      }

      console.log(
        `[AutoDeployAdapter] Extracted ${extractedFiles.length} files from tar.gz: ${extractedFiles.map(f => f.name).join(', ')}`
      );

      const uploadedFileNames = extractedFiles.map(f => f.name);

      // ---- 2c: Upload all files to HuggingFace via JS Library (natively handles LFS chunking) ----
      const hfFiles = extractedFiles.map((file) => ({
        path: file.name,
        content: new Blob([new Uint8Array(file.data)])
      }));

      try {
        // Ensure the repository exists before trying to upload
        await createRepo({
          credentials: { accessToken: HF_TOKEN },
          repo: { type: 'model', name: hfPath },
        });
        console.log(`[AutoDeployAdapter] Created HuggingFace repo: ${hfPath} (or it already existed)`);
      } catch (err: any) {
        // HTTP 409 means "Repository already exists", which is fine
        if (err?.statusCode !== 409 && !err.message?.includes('already exists')) {
          console.warn(`[AutoDeployAdapter] createRepo failed (non-fatal if repo exists): ${err.message}`);
        }
      }

      try {
        const commitResult = await uploadFiles({
          credentials: { accessToken: HF_TOKEN },
          repo: { type: 'model', name: hfPath },
          commitTitle: `Auto-deploy adapter ${adapterName}`,
          files: hfFiles
        });

        const hfCommitOid = commitResult?.commit?.oid || null;
        console.log(
          `[AutoDeployAdapter] Committed ${uploadedFileNames.length} files to ${hfPath} ` +
          `(commit: ${hfCommitOid || 'unknown'})`
        );

        return { hfPath, uploadedFiles: uploadedFileNames, hfCommitOid };
      } catch (err: any) {
        throw new Error(`[AutoDeployAdapter] HuggingFace uploadFiles failed: ${err.message}`);
      }
    });

    // =====================================================
    // Step 4: Update RunPod inference endpoint LORA_MODULES via GraphQL API
    // Target endpoint: RUNPOD_INFERENCE_ENDPOINT_ID (should be the inference endpoint, e.g. 780tauhj7c126b)
    // =====================================================
    const loraModulesResult = await step.run('update-runpod-lora-modules', async () => {
      if (!RUNPOD_GRAPHQL_API_KEY) {
        throw new Error(
          '[AutoDeployAdapter] RUNPOD_GRAPHQL_API_KEY env var is not set — cannot update RunPod endpoint'
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
            endpoint(id: $id) {
              id
              name
              gpuIds
              idleTimeout
              locations
              networkVolumeId
              scalerType
              scalerValue
              workersMax
              workersMin
              templateId
              env {
                key
                value
              }
            }
          }
        }
      `;

      const fetchResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
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
        const errorText = await fetchResp.text();
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL fetch failed: HTTP ${fetchResp.status}. Details: ${errorText}`);
      }

      const fetchData = await fetchResp.json();
      if (fetchData.errors) {
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL returned errors: ${JSON.stringify(fetchData.errors)}`
        );
      }

      const endpoint = fetchData?.data?.myself?.endpoint;
      if (!endpoint) {
        throw new Error(
          `[AutoDeployAdapter] RunPod endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}' not found in GraphQL response`
        );
      }

      // env is returned as an array of {key, value} objects
      const currentEnv: Array<{ key: string; value: string }> = endpoint.env || [];

      // ---- 4b: Parse existing LORA_MODULES ----
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

      // ---- 4b-ii: Remove old adapters belonging to THIS workbase ----
      if (job.workbase_id) {
        const supabaseForCleanup = createServerSupabaseAdminClient();
        const { data: oldJobs } = await supabaseForCleanup
          .from('pipeline_training_jobs')
          .select('id')
          .eq('workbase_id', job.workbase_id)
          .not('hf_adapter_path', 'is', null)
          .neq('id', jobId);

        if (oldJobs && oldJobs.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldAdapterNames = oldJobs.map((j: any) => `adapter-${j.id.substring(0, 8)}`);
          const beforeCount = loraModules.length;
          loraModules = loraModules.filter((m) => !oldAdapterNames.includes(m.name));
          const removedCount = beforeCount - loraModules.length;
          if (removedCount > 0) {
            console.log(
              `[AutoDeployAdapter] Removed ${removedCount} superseded adapter(s) from LORA_MODULES for workbase ${job.workbase_id}`
            );
          }
        }
      }

      // ---- 4b-iii: Idempotency: only add if not already present ----
      if (!loraModules.find((m) => m.name === adapterName)) {
        loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
        console.log(
          `[AutoDeployAdapter] Adding '${adapterName}' to LORA_MODULES (total adapters: ${loraModules.length})`
        );
      } else {
        console.log(
          `[AutoDeployAdapter] Adapter '${adapterName}' already in LORA_MODULES — no change needed`
        );
        return {
          loraModules,
          noChange: true,
          originalWorkersMin: endpoint.workersMin,
          // GUARD: Floor at 1 so the refresh function never restores workersMax to 0
          originalWorkersMax: Math.max(endpoint.workersMax || 1, 1),
          runpodEndpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
          saveSuccess: true,
        };
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
            env {
              key
              value
            }
          }
        }
      `;

      // Extract all needed fields from the original fetch response to provide to the input
      const {
        id: _id,
        name,
        gpuIds,
        idleTimeout,
        locations,
        networkVolumeId,
        scalerType,
        scalerValue,
        workersMax,
        workersMin,
        templateId
      } = endpoint;

      const saveResp = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: saveMutation,
            variables: {
              input: {
                id: RUNPOD_INFERENCE_ENDPOINT_ID,
                name,
                gpuIds,
                idleTimeout,
                locations,
                networkVolumeId,
                scalerType,
                scalerValue,
                workersMax,
                workersMin,
                templateId,
                env: updatedEnv,
              },
            },
          }),
        }
      );

      if (!saveResp.ok) {
        const errorText = await saveResp.text();
        throw new Error(`[AutoDeployAdapter] RunPod GraphQL save failed: HTTP ${saveResp.status}. Details: ${errorText}`);
      }

      const saveData = await saveResp.json();
      if (saveData.errors) {
        throw new Error(
          `[AutoDeployAdapter] RunPod GraphQL save transaction returned errors: ${JSON.stringify(
            saveData.errors
          )}`
        );
      }

      console.log(
        `[AutoDeployAdapter] LORA_MODULES updated on endpoint '${RUNPOD_INFERENCE_ENDPOINT_ID}'. ` +
        `Adapters: ${loraModules.map((m) => m.name).join(', ')}`
      );

      const runpodSaveSuccess = !saveData.errors;
      return {
        loraModules,
        noChange: false,
        originalWorkersMin: workersMin,
        // GUARD: Floor at 1 so the refresh function never restores workersMax to 0
        originalWorkersMax: Math.max(workersMax || 1, 1),
        runpodEndpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
        saveSuccess: runpodSaveSuccess,
      };
    });

    // =====================================================
    // Step 4b: Trigger worker refresh cycle
    // =====================================================
    await step.run('emit-worker-refresh', async () => {
      // Skip if LORA_MODULES were not changed
      if (loraModulesResult.noChange) {
        return { emitted: false, reason: 'LORA_MODULES unchanged' };
      }

      await inngest.send({
        name: 'pipeline/adapter.deployed',
        data: {
          jobId: event.data.jobId,
          adapterName: `adapter-${event.data.jobId.slice(0, 8)}`,
          endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
          originalWorkersMin: loraModulesResult.originalWorkersMin,
          originalWorkersMax: loraModulesResult.originalWorkersMax,
          workbaseId: job.workbase_id || null,
        },
      });

      return { emitted: true };
    });

    // =====================================================
    // Step 5 (Optional / Non-Fatal): vLLM hot reload on live workers
    // Uses INFERENCE_API_URL = https://api.runpod.io/v2/780tauhj7c126b
    // Note: RunPod serverless endpoints do not natively expose /v1/load_lora_adapter —
    // this call will likely return a non-200 but that is acceptable since this step
    // is non-fatal. The adapter becomes available on the next worker cold start regardless.
    // If a direct vLLM worker URL is available in the future, set INFERENCE_API_URL to it.
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
              status: 'deploying',
              ready_at: null,
              health_check_url: healthCheckUrl,
            },
            {
              job_id: jobId,
              user_id: userId,
              endpoint_type: 'adapted',
              runpod_endpoint_id: virtualAdaptedId,
              base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
              adapter_path: hfUploadResult.hfPath,
              status: 'deploying',
              ready_at: null,
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
            status: 'deploying',
            ready_at: null,
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

      const deployedAt = new Date().toISOString();
      const deploymentLog = {
        adapter_name: adapterName,
        hf_path: hfUploadResult.hfPath,
        hf_commit_oid: hfUploadResult.hfCommitOid,
        hf_files_uploaded: hfUploadResult.uploadedFiles,
        runpod_endpoint_id: loraModulesResult.runpodEndpointId,
        runpod_save_success: loraModulesResult.saveSuccess,
        runpod_lora_modules_after: loraModulesResult.loraModules,
        worker_refresh: null,   // filled in later by refreshInferenceWorkers
        deployed_at: deployedAt,
        total_duration_ms: 0,   // approximate; updated by refreshInferenceWorkers
      };

      const { error } = await supabase
        .from('pipeline_training_jobs')
        .update({
          hf_adapter_path: hfUploadResult.hfPath,
          deployment_log: deploymentLog,
          adapter_status: 'active',
          updated_at: deployedAt,
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

    // =====================================================
    // Step 7a: Supersede old adapter records for this workbase
    // =====================================================
    if (job.workbase_id) {
      await step.run('supersede-old-adapters', async () => {
        const supabase = createServerSupabaseAdminClient();

        const { data: oldJobs, error: queryErr } = await supabase
          .from('pipeline_training_jobs')
          .select('id')
          .eq('workbase_id', job.workbase_id)
          .not('hf_adapter_path', 'is', null)
          .neq('id', jobId);

        if (queryErr || !oldJobs || oldJobs.length === 0) {
          console.log(`[AutoDeployAdapter] No old adapters to supersede for workbase ${job.workbase_id}`);
          return { superseded: 0 };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldJobIds = oldJobs.map((j: any) => j.id);

        await supabase
          .from('pipeline_training_jobs')
          .update({ adapter_status: 'superseded', updated_at: new Date().toISOString() })
          .in('id', oldJobIds);

        await supabase
          .from('pipeline_inference_endpoints')
          .update({ status: 'terminated', updated_at: new Date().toISOString() })
          .in('job_id', oldJobIds);

        console.log(
          `[AutoDeployAdapter] Superseded ${oldJobIds.length} old adapter(s) for workbase ${job.workbase_id}`
        );
        return { superseded: oldJobIds.length };
      });
    }

    // =====================================================
    // Step 7b: Update workbase.active_adapter_job_id
    // Links the completed deployment back to the workbase so the chat page
    // can resolve which inference endpoint to use.
    // Non-fatal: a failure here does not roll back the deployment.
    // =====================================================
    if (job.workbase_id) {
      await step.run('update-workbase-active-adapter', async () => {
        const supabase = createServerSupabaseAdminClient();
        const { error } = await supabase
          .from('workbases')
          .update({
            active_adapter_job_id: jobId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.workbase_id);

        if (error) {
          console.error(
            `[AutoDeployAdapter] Failed to update workbase ${job.workbase_id} active_adapter_job_id: ${error.message}`
          );
        } else {
          console.log(
            `[AutoDeployAdapter] ✓ Workbase ${job.workbase_id} active_adapter_job_id set to ${jobId}`
          );
        }
      });
    }

    // =====================================================
    // Step 7c: Delete old HuggingFace repos (non-fatal)
    // =====================================================
    if (job.workbase_id) {
      await step.run('delete-old-hf-repos', async () => {
        if (!HF_TOKEN) {
          console.log('[AutoDeployAdapter] HF_TOKEN not set — skipping HF cleanup');
          return { deleted: 0 };
        }

        const supabase = createServerSupabaseAdminClient();
        const { data: supersededJobs } = await supabase
          .from('pipeline_training_jobs')
          .select('id, hf_adapter_path')
          .eq('workbase_id', job.workbase_id)
          .eq('adapter_status', 'superseded')
          .not('hf_adapter_path', 'is', null);

        if (!supersededJobs || supersededJobs.length === 0) {
          return { deleted: 0 };
        }

        let deletedCount = 0;
        for (const oldJob of supersededJobs) {
          try {
            const oldRepoPath = oldJob.hf_adapter_path as string;
            await deleteRepo({
              repo: { type: 'model', name: oldRepoPath },
              credentials: { accessToken: HF_TOKEN },
            });

            await supabase
              .from('pipeline_training_jobs')
              .update({ adapter_status: 'deleted', updated_at: new Date().toISOString() })
              .eq('id', oldJob.id);

            deletedCount++;
            console.log(`[AutoDeployAdapter] Deleted HF repo: ${oldRepoPath}`);
          } catch (err: any) {
            console.warn(
              `[AutoDeployAdapter] Failed to delete HF repo ${oldJob.hf_adapter_path} (non-fatal):`,
              err.message
            );
          }
        }

        return { deleted: deletedCount };
      });
    }

    return {
      success: true,
      jobId,
      adapterName,
      hfPath: hfUploadResult.hfPath,
      filesUploaded: hfUploadResult.uploadedFiles.length,
      workbaseId: job.workbase_id || null,
    };
  }
);
