# Spec 26: LoRA Adapter Detail Page — E02: Backend Inngest Layer

**Version:** 1.0
**Date:** 2026-03-03
**Prompt:** E02 of 5
**Prerequisites:** E01 complete — `pipeline_training_jobs.deployment_log`, `pipeline_training_jobs.adapter_status`, and `endpoint_restart_log` table must exist; `src/types/adapter-detail.ts` must exist
**Next:** E03 — API Layer

---

## What This Prompt Builds

This prompt makes surgical modifications to two existing Inngest functions and creates one new Inngest function:

1. **Modify `auto-deploy-adapter.ts`** (9 targeted changes, 3a–3i) — capture HF commit OID, clean up old adapters from LORA_MODULES, write `deployment_log` JSONB to DB, supersede old adapter records, delete old HF repos, pass `workbaseId` to the next event
2. **Modify `refresh-inference-workers.ts`** (7 targeted changes, 4a–4g) — consume `workbaseId` from event, create and update `endpoint_restart_log` rows at each of the 6 worker-cycling steps
3. **Create `restart-inference-workers.ts`** — new Inngest function for manual worker restart, triggered by `pipeline/endpoint.restart.requested`, mirrors the 6-step structure of `refreshInferenceWorkers`
4. **Update `src/inngest/functions/index.ts`** — register the new function

---

## Platform Context

**Project:** Bright Run LoRA Training Data Platform
**Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Inngest, RunPod (vLLM), shadcn/UI + Tailwind
**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**Adapter Deployment Pipeline (for context):**
```
pipeline_training_jobs UPDATE (status='completed', adapter_file_path set)
  → Supabase Database Webhook
    → POST /api/webhooks/training-complete
      → Inngest event: 'pipeline/adapter.ready'
        → autoDeployAdapter (Steps 1–7c)
          → Inngest event: 'pipeline/adapter.deployed'
            → refreshInferenceWorkers (Steps 1–6)
```

**Naming conventions (confirmed from production):**
- Adapter name: `adapter-{jobId.substring(0, 8)}`
- RunPod shared inference endpoint: `RUNPOD_INFERENCE_ENDPOINT_ID` env var (shared across all workbases)

**Key environment variables used in these files:**
- `RUNPOD_GRAPHQL_API_KEY` — for RunPod GraphQL API auth (query param, not Bearer)
- `GPU_CLUSTER_API_KEY` or `RUNPOD_API_KEY` — for RunPod inference API (Bearer header)
- `INFERENCE_API_URL` — RunPod inference endpoint base URL
- `RUNPOD_INFERENCE_ENDPOINT_ID` — the shared endpoint ID
- `HF_TOKEN` — HuggingFace access token
- `HF_REPO_PREFIX` — HuggingFace repo name prefix

---

## Critical Rules

1. **Read each file before editing.** `auto-deploy-adapter.ts` is ~691 lines; `refresh-inference-workers.ts` is ~273 lines. The changes are surgical — do not rewrite files.
2. **Preserve all existing logic.** Phase 3 and Phase 4 changes are additive.
3. **RunPod `saveEndpoint` is a full PUT.** Always fetch ALL endpoint fields first, modify only what you need, then save everything back. This pattern is already in the code — follow it exactly.
4. **RunPod GraphQL auth = query param.** `?api_key=${RUNPOD_GRAPHQL_API_KEY}` — NOT a Bearer header.
5. **RunPod inference API auth = Bearer header.** `Authorization: Bearer ${RUNPOD_API_KEY}` — only for `/health` and `/runsync`.
6. **Application code MUST use `createServerSupabaseAdminClient()` from `@/lib/supabase-server`** — never SAOL in application code.
7. **Inngest step outputs are cached.** Do not return full `deployment_log` objects from step returns — write to DB only.

---

========================

## EXECUTION PROMPT E02

You are implementing the backend Inngest layer for **Spec 26: LoRA Adapter Detail Page** in the Bright Run LoRA Training Data Platform.

**Prerequisites from E01:**
- DB columns `deployment_log` and `adapter_status` exist on `pipeline_training_jobs`
- Table `endpoint_restart_log` exists
- `src/types/adapter-detail.ts` exists with all required exports

**Files to modify:**
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` (~691 lines)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` (~273 lines)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts`

**Files to create:**
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts`

---

### Step 1: Read All Target Files

Before making any changes, read the full content of:
1. `src/inngest/functions/auto-deploy-adapter.ts` — identify exact line numbers for all change locations
2. `src/inngest/functions/refresh-inference-workers.ts` — identify exact line numbers for all change locations
3. `src/inngest/functions/index.ts` — confirm current exports

---

### Step 2: Modify `auto-deploy-adapter.ts` — 9 Surgical Changes

Apply changes 3a through 3i in order. After all changes are applied, verify the file compiles.

#### Change 3a: Add `deleteRepo` to HuggingFace import

Find the line that currently reads:
```typescript
import { uploadFiles, createRepo } from '@huggingface/hub';
```

Replace it with:
```typescript
import { uploadFiles, createRepo, deleteRepo } from '@huggingface/hub';
```

> Note: If `deleteRepo` is not available in the installed version of `@huggingface/hub`, replace the import with a guard: define a local no-op `deleteRepo` and log a warning. Check `node_modules/@huggingface/hub/dist/index.d.ts` to verify export availability first.

#### Change 3b: Update `HFUploadResult` interface

Find the current interface (approximately):
```typescript
interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
}
```

Replace with:
```typescript
interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
  hfCommitOid: string | null;
}
```

#### Change 3c: Capture HF commit OID in Step 2+3 return value

Find the section in Step 2+3 (upload to HuggingFace) that currently logs the commit and returns:
```typescript
      console.log(
        `[AutoDeployAdapter] Committed ${uploadedFileNames.length} files to ${hfPath} ` +
        `(commit: ${commitResult?.commit?.oid || 'unknown'})`
      );

      return { hfPath, uploadedFiles: uploadedFileNames };
```

Replace with:
```typescript
      const hfCommitOid = commitResult?.commit?.oid || null;
      console.log(
        `[AutoDeployAdapter] Committed ${uploadedFileNames.length} files to ${hfPath} ` +
        `(commit: ${hfCommitOid || 'unknown'})`
      );

      return { hfPath, uploadedFiles: uploadedFileNames, hfCommitOid };
```

#### Change 3d: Modify Step 4 — remove old adapters before appending new one

In Step 4 (`update-runpod-lora-modules`), find the section labeled `4b: Parse existing LORA_MODULES and add new adapter`. The current code parses LORA_MODULES and immediately does idempotency check. 

Replace the entire block from `// ---- 4b: Parse existing LORA_MODULES` through the closing of the idempotency else-branch with:

```typescript
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
          originalWorkersMax: endpoint.workersMax,
          runpodEndpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
          saveSuccess: true,
        };
      }
```

#### Change 3e: Update Step 4 return value

Find the final `return` statement at the end of Step 4 that currently reads:
```typescript
      return { loraModules, noChange: false, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

Replace with:
```typescript
      const runpodSaveSuccess = !saveData.errors;
      return {
        loraModules,
        noChange: false,
        originalWorkersMin: workersMin,
        originalWorkersMax: workersMax,
        runpodEndpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
        saveSuccess: runpodSaveSuccess,
      };
```

#### Change 3f: Add `workbaseId` to the `pipeline/adapter.deployed` Inngest event

Find the `await inngest.send` call that fires `pipeline/adapter.deployed` (in the Step 4b block after the worker cycling logic). Current code:
```typescript
      await inngest.send({
        name: 'pipeline/adapter.deployed',
        data: {
          jobId: event.data.jobId,
          adapterName: `adapter-${event.data.jobId.slice(0, 8)}`,
          endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
          originalWorkersMin: loraModulesResult.originalWorkersMin,
          originalWorkersMax: loraModulesResult.originalWorkersMax,
        },
      });
```

Replace with:
```typescript
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
```

#### Change 3g: Write `deployment_log` in Step 7 (`update-job-hf-path`)

Find the DB update in Step 7 that currently reads:
```typescript
      const { error } = await supabase
        .from('pipeline_training_jobs')
        .update({
          hf_adapter_path: hfUploadResult.hfPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
```

Replace with:
```typescript
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
```

#### Change 3h: Add Step 7a — `supersede-old-adapters`

Add this entire Inngest step **after the closing `});` of Step 7 (`update-job-hf-path`) and BEFORE the `if (job.workbase_id)` block that starts Step 7b (`update-workbase-active-adapter`)**:

```typescript
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
```

#### Change 3i: Add Step 7c — `delete-old-hf-repos`

Add this entire Inngest step **after the closing `});` of Step 7b (`update-workbase-active-adapter`)**:

```typescript
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
```

---

### Step 3: Modify `refresh-inference-workers.ts` — 7 Surgical Changes

Apply changes 4a through 4g in order. This file is ~273 lines. Changes add DB writes at each step without altering the core worker-cycling logic.

#### Change 4a: Add `workbaseId` to destructured event data

Find the current destructuring (around line 27–30):
```typescript
    const {
      jobId,
      adapterName,
      endpointId,
      originalWorkersMin,
      originalWorkersMax,
    } = event.data;
```

Replace with:
```typescript
    const {
      jobId,
      adapterName,
      endpointId,
      originalWorkersMin,
      originalWorkersMax,
      workbaseId,
    } = event.data;
```

#### Change 4b: Replace Step 1 (`scale-down-workers`) — create restart log and scale down

Replace the entire `step.run('scale-down-workers', ...)` block with:

```typescript
    const scaleDownResult = await step.run('scale-down-workers', async () => {
      const supabase = createServerSupabaseAdminClient();
      const now = new Date().toISOString();

      // Create endpoint_restart_log row (trigger_source='auto')
      let restartLogId: string | null = null;
      if (workbaseId) {
        const { data: logRow, error: logErr } = await supabase
          .from('endpoint_restart_log')
          .insert({
            workbase_id: workbaseId,
            job_id: jobId,
            adapter_name: adapterName,
            runpod_endpoint_id: endpointId,
            trigger_source: 'auto',
            status: 'scaling_down',
            scale_down_at: now,
          })
          .select('id')
          .single();

        if (!logErr && logRow) {
          restartLogId = logRow.id;
        } else {
          console.warn('[worker-refresh] Failed to create restart log (non-fatal):', logErr?.message);
        }
      }

      // Scale down workers to 0
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      // Check if adapter is in LORA_MODULES before restart
      const loraEnv = (ep.env || []).find((e: { key: string }) => e.key === 'LORA_MODULES');
      let loraSnapshot: Array<{ name: string; path: string }> = [];
      let adapterInLoraModules = false;
      try {
        if (loraEnv?.value) {
          loraSnapshot = JSON.parse(loraEnv.value);
          adapterInLoraModules = loraSnapshot.some((m) => m.name === adapterName);
        }
      } catch { /* ignore parse errors */ }

      if (restartLogId) {
        await supabase
          .from('endpoint_restart_log')
          .update({
            adapter_in_lora_modules: adapterInLoraModules,
            lora_modules_snapshot: loraSnapshot,
            scale_down_success: true,
          })
          .eq('id', restartLogId);
      }

      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: 0,
        workersMax: ep.workersMax,
        templateId: ep.templateId,
        env: ep.env.map((e: { key: string; value: string }) => ({
          key: e.key,
          value: e.value,
        })),
      };

      await graphql(mutation, { input });
      return { previousWorkersMin: ep.workersMin, allEnv: ep.env, restartLogId };
    });
```

#### Change 4c: Replace Step 2 (`wait-for-workers-terminated`) — write to restart log on completion

Replace the entire `step.run('wait-for-workers-terminated', ...)` block with:

```typescript
    await step.run('wait-for-workers-terminated', async () => {
      const startMs = Date.now();
      const timeoutMs = 90_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        const total = state.ready + state.idle + state.running + state.initializing;
        console.log(`[worker-refresh] Waiting for termination: total=${total} (R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing})`);
        if (total === 0) {
          const terminatedAt = new Date().toISOString();
          if (scaleDownResult.restartLogId) {
            const supabase = createServerSupabaseAdminClient();
            await supabase
              .from('endpoint_restart_log')
              .update({
                status: 'workers_terminated',
                workers_terminated_at: terminatedAt,
              })
              .eq('id', scaleDownResult.restartLogId);
          }
          return { waitedMs: Date.now() - startMs };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      throw new Error(`Workers did not terminate within ${timeoutMs / 1000}s`);
    });
```

#### Change 4d: Replace Step 3 (`scale-up-workers`) — write to restart log

Replace the entire `step.run('scale-up-workers', ...)` block with:

```typescript
    await step.run('scale-up-workers', async () => {
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      let updatedEnv = ep.env.map((e: { key: string; value: string }) =>
        e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : { key: e.key, value: e.value }
      );
      if (!updatedEnv.some((e: { key: string }) => e.key === 'MAX_LORAS')) {
        updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
      }

      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: originalWorkersMin,
        workersMax: originalWorkersMax,
        templateId: ep.templateId,
        env: updatedEnv,
      };

      await graphql(mutation, { input });

      const scaleUpAt = new Date().toISOString();
      if (scaleDownResult.restartLogId) {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('endpoint_restart_log')
          .update({
            status: 'scaling_up',
            scale_up_at: scaleUpAt,
            scale_up_success: true,
          })
          .eq('id', scaleDownResult.restartLogId);
      }

      return { restoredWorkersMin: originalWorkersMin, maxLoras: 5 };
    });
```

#### Change 4e: Replace Step 4 (`wait-for-workers-ready`) — write to restart log

Replace the entire `step.run('wait-for-workers-ready', ...)` block with:

```typescript
    const workersReadyResult = await step.run('wait-for-workers-ready', async () => {
      const startMs = Date.now();
      const timeoutMs = 180_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        console.log(`[worker-refresh] Waiting for ready: R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing}`);
        if (state.ready > 0 || state.idle > 0) {
          const workersReadyAt = new Date().toISOString();
          if (scaleDownResult.restartLogId) {
            const supabase = createServerSupabaseAdminClient();
            await supabase
              .from('endpoint_restart_log')
              .update({
                status: 'workers_ready',
                workers_ready_at: workersReadyAt,
                worker_state_after: state,
              })
              .eq('id', scaleDownResult.restartLogId);
          }
          return { waitedMs: Date.now() - startMs, state };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      console.warn('[worker-refresh] Workers did not reach ready state within timeout — proceeding anyway');
      return { waitedMs: 180_000, timedOut: true, state: null };
    });
```

#### Change 4f: Replace Step 5 (`verify-adapter-available`) — write to restart log

Replace the entire `step.run('verify-adapter-available', ...)` block with:

```typescript
    const verifyResult = await step.run('verify-adapter-available', async () => {
      if (scaleDownResult.restartLogId) {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('endpoint_restart_log')
          .update({ status: 'verifying', verification_at: new Date().toISOString() })
          .eq('id', scaleDownResult.restartLogId);
      }

      try {
        const res = await fetch(`${INFERENCE_API_URL}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              openai_route: '/v1/chat/completions',
              openai_input: {
                model: adapterName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5,
              },
            },
          }),
        });
        const data = await res.json();
        if (data.status === 'COMPLETED') {
          return { verified: true, error: null };
        }
        console.warn(`[worker-refresh] Adapter verification returned status: ${data.status}`);
        return { verified: false, error: `Status: ${data.status}` };
      } catch (err) {
        console.warn('[worker-refresh] Adapter verification failed (non-fatal):', err);
        return { verified: false, error: String(err) };
      }
    });
```

#### Change 4g: Replace Step 6 (`mark-endpoints-ready`) — finalize restart log and update `deployment_log`

Replace the entire `step.run('mark-endpoints-ready', ...)` block with:

```typescript
    await step.run('mark-endpoints-ready', async () => {
      const supabase = createServerSupabaseAdminClient();
      const completedAt = new Date().toISOString();

      // Mark pipeline_inference_endpoints as ready
      try {
        const { error } = await supabase
          .from('pipeline_inference_endpoints')
          .update({
            status: 'ready',
            ready_at: completedAt,
          })
          .eq('job_id', jobId);

        if (error) {
          console.warn('[worker-refresh] Failed to mark endpoints ready:', error.message);
        }
      } catch (err) {
        console.warn('[worker-refresh] DB update for endpoints failed (non-fatal):', err);
      }

      // Finalize endpoint_restart_log row
      if (scaleDownResult.restartLogId) {
        await supabase
          .from('endpoint_restart_log')
          .update({
            status: 'completed',
            completed_at: completedAt,
            adapter_verified: verifyResult.verified,
          })
          .eq('id', scaleDownResult.restartLogId);
      }

      // Update deployment_log.worker_refresh on the training job
      const workerRefreshData = {
        scale_down_at: completedAt,
        workers_terminated_at: completedAt,
        scale_up_at: completedAt,
        workers_ready_at: completedAt,
        verification_result: verifyResult.verified
          ? 'verified'
          : verifyResult.error
            ? 'unverified'
            : 'skipped',
        verification_error: verifyResult.error || null,
      };

      try {
        const { data: jobRow } = await supabase
          .from('pipeline_training_jobs')
          .select('deployment_log')
          .eq('id', jobId)
          .single();

        if (jobRow?.deployment_log) {
          const updatedLog = {
            ...jobRow.deployment_log,
            worker_refresh: workerRefreshData,
          };
          await supabase
            .from('pipeline_training_jobs')
            .update({ deployment_log: updatedLog })
            .eq('id', jobId);
        }
      } catch (err) {
        console.warn('[worker-refresh] Failed to update deployment_log worker_refresh (non-fatal):', err);
      }

      return { updated: true, adapterVerified: verifyResult.verified };
    });
```

Also verify that `createServerSupabaseAdminClient` is imported from `@/lib/supabase-server` at the top of `refresh-inference-workers.ts`. If it is not already imported, add it.

---

### Step 4: Create `restart-inference-workers.ts`

**File to create:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts`

This is a NEW file. Create it with the following complete content:

```typescript
import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Restart Inference Workers (Manual Trigger)
 *
 * Triggered by: 'pipeline/endpoint.restart.requested'
 * Event data: { jobId, workbaseId, adapterName, restartLogId, endpointId, originalWorkersMin, originalWorkersMax }
 *
 * Identical worker cycle to refreshInferenceWorkers, but:
 * - Pre-created restartLogId is provided (created by the API route)
 * - Writes detailed progress to endpoint_restart_log at each step
 * - Reads LORA_MODULES pre-restart to verify adapter presence
 *
 * Concurrency: { limit: 1 } — shared with refreshInferenceWorkers to prevent conflicts
 * Retries: 1 — avoid infinite worker cycling
 */
export const restartInferenceWorkers = inngest.createFunction(
  {
    id: 'restart-inference-workers',
    name: 'Restart Inference Workers (Manual)',
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: 'pipeline/endpoint.restart.requested' },
  async ({ event, step }) => {
    const {
      jobId,
      workbaseId,
      adapterName,
      restartLogId,
      endpointId,
      originalWorkersMin,
      originalWorkersMax,
    } = event.data;

    const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
    const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
    const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

    // Helper: RunPod GraphQL request (auth via query param)
    async function graphql(query: string, variables?: Record<string, unknown>) {
      const res = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        }
      );
      return res.json();
    }

    // Helper: Poll endpoint health (auth via Bearer)
    async function getWorkerState(): Promise<{
      ready: number; idle: number; running: number; initializing: number;
    }> {
      try {
        const res = await fetch(`${INFERENCE_API_URL}/health`, {
          headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        });
        const data = await res.json();
        return {
          ready: data.workers?.ready || 0,
          idle: data.workers?.idle || 0,
          running: data.workers?.running || 0,
          initializing: data.workers?.initializing || 0,
        };
      } catch {
        return { ready: 0, idle: 0, running: 0, initializing: 0 };
      }
    }

    // Helper: Update restart log (non-fatal)
    async function updateLog(updates: Record<string, unknown>) {
      if (!restartLogId) return;
      try {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('endpoint_restart_log')
          .update(updates)
          .eq('id', restartLogId);
      } catch (err) {
        console.warn('[restart-workers] Failed to update restart log (non-fatal):', err);
      }
    }

    // =====================================================
    // Step 1: Read current LORA_MODULES + pre-restart check + scale down
    // =====================================================
    await step.run('scale-down-workers', async () => {
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      // Check adapter presence in LORA_MODULES before restart
      const loraEnv = (ep.env || []).find((e: { key: string }) => e.key === 'LORA_MODULES');
      let loraSnapshot: Array<{ name: string; path: string }> = [];
      let adapterInLoraModules = false;
      try {
        if (loraEnv?.value) {
          loraSnapshot = JSON.parse(loraEnv.value);
          adapterInLoraModules = loraSnapshot.some((m) => m.name === adapterName);
        }
      } catch { /* ignore */ }

      const scaleDownAt = new Date().toISOString();
      await updateLog({
        status: 'scaling_down',
        scale_down_at: scaleDownAt,
        adapter_in_lora_modules: adapterInLoraModules,
        lora_modules_snapshot: loraSnapshot,
      });

      // Scale down to 0 — must send ALL endpoint fields back (RunPod saveEndpoint is full PUT)
      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: 0,
        workersMax: ep.workersMax,
        templateId: ep.templateId,
        env: ep.env.map((e: { key: string; value: string }) => ({
          key: e.key,
          value: e.value,
        })),
      };

      await graphql(mutation, { input });
      await updateLog({ scale_down_success: true });
      return { previousWorkersMin: ep.workersMin };
    });

    // =====================================================
    // Step 2: Wait for workers to terminate
    // =====================================================
    await step.run('wait-for-workers-terminated', async () => {
      const startMs = Date.now();
      const timeoutMs = 90_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        const total = state.ready + state.idle + state.running + state.initializing;
        if (total === 0) {
          await updateLog({
            status: 'workers_terminated',
            workers_terminated_at: new Date().toISOString(),
          });
          return { waitedMs: Date.now() - startMs };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      await updateLog({
        status: 'failed',
        error_step: 'wait-for-workers-terminated',
        error_message: 'Workers did not terminate within 90s',
        completed_at: new Date().toISOString(),
      });
      throw new Error('Workers did not terminate within 90s');
    });

    // =====================================================
    // Step 3: Scale up workers with MAX_LORAS=5
    // =====================================================
    await step.run('scale-up-workers', async () => {
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      let updatedEnv = ep.env.map((e: { key: string; value: string }) =>
        e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : { key: e.key, value: e.value }
      );
      if (!updatedEnv.some((e: { key: string }) => e.key === 'MAX_LORAS')) {
        updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
      }

      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: originalWorkersMin,
        workersMax: originalWorkersMax,
        templateId: ep.templateId,
        env: updatedEnv,
      };

      await graphql(mutation, { input });
      await updateLog({
        status: 'scaling_up',
        scale_up_at: new Date().toISOString(),
        scale_up_success: true,
      });
      return { restoredWorkersMin: originalWorkersMin };
    });

    // =====================================================
    // Step 4: Wait for workers to become ready
    // =====================================================
    await step.run('wait-for-workers-ready', async () => {
      const startMs = Date.now();
      const timeoutMs = 180_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        if (state.ready > 0 || state.idle > 0) {
          await updateLog({
            status: 'workers_ready',
            workers_ready_at: new Date().toISOString(),
            worker_state_after: state,
          });
          return { waitedMs: Date.now() - startMs, state };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      await updateLog({
        status: 'failed',
        error_step: 'wait-for-workers-ready',
        error_message: 'Workers did not reach ready state within 180s',
        completed_at: new Date().toISOString(),
      });
      throw new Error('Workers did not reach ready state within 180s');
    });

    // =====================================================
    // Step 5: Verify adapter via inference ping (non-fatal)
    // =====================================================
    const verifyResult = await step.run('verify-adapter-available', async () => {
      await updateLog({ status: 'verifying', verification_at: new Date().toISOString() });

      try {
        const res = await fetch(`${INFERENCE_API_URL}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              openai_route: '/v1/chat/completions',
              openai_input: {
                model: adapterName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5,
              },
            },
          }),
        });
        const data = await res.json();
        const verified = data.status === 'COMPLETED';
        return { verified, error: verified ? null : `Status: ${data.status}` };
      } catch (err) {
        return { verified: false, error: String(err) };
      }
    });

    // =====================================================
    // Step 6: Finalize restart log + mark endpoints ready
    // =====================================================
    await step.run('finalize-restart-log', async () => {
      const supabase = createServerSupabaseAdminClient();
      const completedAt = new Date().toISOString();

      await supabase
        .from('endpoint_restart_log')
        .update({
          status: 'completed',
          completed_at: completedAt,
          adapter_verified: verifyResult.verified,
        })
        .eq('id', restartLogId);

      // Mark pipeline_inference_endpoints as ready
      await supabase
        .from('pipeline_inference_endpoints')
        .update({ status: 'ready', ready_at: completedAt })
        .eq('job_id', jobId);

      return { completed: true, adapterVerified: verifyResult.verified };
    });

    return {
      success: true,
      jobId,
      adapterName,
      restartLogId,
      adapterVerified: verifyResult.verified,
    };
  }
);
```

---

### Step 5: Update `src/inngest/functions/index.ts`

Read the current file. It should currently import from these modules:
- `process-rag-document`
- `dispatch-training-job`
- `auto-deploy-adapter`
- `refresh-inference-workers`
- `auto-enrich-conversation`
- `build-training-set`
- `rebuild-training-set`

Replace the entire file content with the following (add `restartInferenceWorkers` import and export):

```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { restartInferenceWorkers } from './restart-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
};
```

> Note: If the existing `index.ts` does not use a named `inngestFunctions` array export, preserve the existing export pattern and simply add `restartInferenceWorkers` to it. The key requirement is that `restartInferenceWorkers` is registered in the Inngest serve handler.

---

### Step 6: TypeScript Validation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | grep -E "(error|src/inngest)" | head -30
```

Fix any TypeScript errors introduced by the changes in this prompt. Pre-existing errors in other files are acceptable. Focus on:
- `src/inngest/functions/auto-deploy-adapter.ts`
- `src/inngest/functions/refresh-inference-workers.ts`
- `src/inngest/functions/restart-inference-workers.ts`
- `src/inngest/functions/index.ts`

Common fixes needed:
- If `loraModulesResult` return type doesn't include `runpodEndpointId` or `saveSuccess`, TypeScript will complain — verify the `noChange: true` early-return branch in Change 3d also includes these fields
- If `workersReadyResult` is declared but not used, either use it or suppress with `void`

---

### Completion Checklist

- [ ] `auto-deploy-adapter.ts`: `deleteRepo` imported from `@huggingface/hub` (or guarded)
- [ ] `auto-deploy-adapter.ts`: `HFUploadResult.hfCommitOid` field added
- [ ] `auto-deploy-adapter.ts`: `hfCommitOid` captured and returned in Step 2+3
- [ ] `auto-deploy-adapter.ts`: Old adapters removed from LORA_MODULES in Step 4 (Change 3d)
- [ ] `auto-deploy-adapter.ts`: Step 4 return includes `runpodEndpointId` and `saveSuccess`
- [ ] `auto-deploy-adapter.ts`: `workbaseId` included in `pipeline/adapter.deployed` event
- [ ] `auto-deploy-adapter.ts`: `deployment_log` written to DB in Step 7
- [ ] `auto-deploy-adapter.ts`: Step 7a `supersede-old-adapters` added
- [ ] `auto-deploy-adapter.ts`: Step 7c `delete-old-hf-repos` added
- [ ] `refresh-inference-workers.ts`: `workbaseId` destructured from event
- [ ] `refresh-inference-workers.ts`: Step 1 creates `endpoint_restart_log` row
- [ ] `refresh-inference-workers.ts`: Steps 2–5 update the log at each stage
- [ ] `refresh-inference-workers.ts`: Step 6 finalizes log and updates `deployment_log.worker_refresh`
- [ ] `restart-inference-workers.ts` created with all 6 steps
- [ ] `index.ts` exports `restartInferenceWorkers`
- [ ] No TypeScript errors in modified/created files

**Artifacts produced by E02 (used by E03–E05):**
- Inngest function `restartInferenceWorkers` registered to event `pipeline/endpoint.restart.requested`
- `pipeline_training_jobs.deployment_log` is now written by `autoDeployAdapter` and updated by `refreshInferenceWorkers`
- `endpoint_restart_log` rows are created by both `refreshInferenceWorkers` (auto) and `restartInferenceWorkers` (manual)

+++++++++++++++++
