# Spec 26: LoRA Adapter Detail Page — Deployment Verification, Lifecycle Management & Status Tooling

**Version:** 1.0  
**Date:** 2026-03-03  
**Status:** Ready for Implementation  
**Source:** `25-ux-containers-lora-adapters-discovery_v2.md`

---

## Agent Instructions

**Before starting any work, you MUST:**
1. Read this entire document — it contains pre-verified facts and precise instructions
2. Read each file listed in "Files Modified" before editing it — confirm current content matches what this spec describes
3. Execute instructions as written — do not re-investigate what has already been verified
4. The SAOL constraint applies to schema changes ONLY. Application code (API routes, Inngest functions) MUST use `createServerSupabaseAdminClient()` from `@/lib/supabase-server` — never SAOL CLI in application code

---

## Platform Background

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | User-Facing Name | Status | Flow |
|------|-----------------|--------|------|
| **LoRA Training** | "Fine Tuning" | Complete | Generate Conversations → Auto-Enrich → Aggregate Training Set → Train LoRA Adapter → Auto-Deploy to HF + RunPod → Worker Refresh → A/B Chat |
| **RAG Frontier** | "Fact Training" | Complete | Upload Document → 6-Pass Inngest Ingestion → Expert Q&A → Semantic Search → Chat with Citations |

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| Storage | Supabase Storage |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query (React Query v5) |
| Background Jobs | Inngest |
| Inference | RunPod (vLLM, shared endpoint `780tauhj7c126b`) |
| DB Operations | **SAOL (mandatory for schema migrations only)** — application code uses `createServerSupabaseAdminClient()` |

**Design Token Rules — STRICT. All new/modified code MUST use:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary`, `text-primary-foreground`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` in new or modified code**

**Key Route Structure:**
- All workbase pages: `/workbase/[id]/`
- Launch Tuning page: `/workbase/[id]/fine-tuning/launch`
- **New:** Adapter Detail Page: `/workbase/[id]/fine-tuning/launch/adapter/[jobId]`

**Adapter Deployment Pipeline:**
```
pipeline_training_jobs UPDATE (status='completed', adapter_file_path set)
  → Supabase Database Webhook
    → POST /api/webhooks/training-complete
      → Inngest event: 'pipeline/adapter.ready'
        → autoDeployAdapter (Steps 1–7b, concurrency: 1)
          → Inngest event: 'pipeline/adapter.deployed'
            → refreshInferenceWorkers (Steps 1–6, concurrency: 1)
```

**Key DB Tables:**

| Table | Relevant Columns |
|-------|----------------|
| `pipeline_training_jobs` | `id`, `user_id`, `workbase_id`, `status`, `adapter_file_path`, `hf_adapter_path`, `job_name`, `created_at`, `updated_at`, `estimated_cost`, `training_time_seconds` |
| `pipeline_inference_endpoints` | `id`, `job_id`, `endpoint_type` ('control'/'adapted'), `status` ('pending'/'deploying'/'ready'/'failed'/'terminated'), `adapter_path`, `ready_at`, `error_message` |
| `workbases` | `id`, `active_adapter_job_id` |

**Naming Conventions (confirmed from production adapter `6fd5ac79`):**
- Adapter name: `adapter-{jobId.substring(0, 8)}`
- HF repo name: `{HF_REPO_PREFIX}-{jobId.substring(0, 8)}`
- RunPod virtual endpoint ID: `virtual-inference-{jobId.substring(0, 8)}-control` / `-adapted`

---

## Problem Statement

The `/workbase/[id]/fine-tuning/launch` page shows "Adapter History" — a list of training job entries — but they are static, non-clickable divs with no detail view. Users have no way to:

1. **Verify deployment** — confirm the adapter was pushed to HuggingFace and registered in RunPod's `LORA_MODULES`
2. **Check adapter lifecycle** — see whether a deployed adapter has been superseded by a newer run
3. **Ping adapter status** — actively verify the adapter is serving inference requests on RunPod
4. **Restart inference workers** — cycle RunPod workers to pick up a newly deployed adapter, with full progress tracking
5. **Clean up old adapters** — remove superseded adapters from RunPod's `LORA_MODULES` list (currently LORA_MODULES grows without bound)

---

## Files Affected

### New Files (Create)
| File | Type |
|------|------|
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx` | Page — Adapter Detail Page |
| `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts` | API Route — Read `deployment_log` JSONB |
| `src/app/api/pipeline/adapters/[jobId]/ping/route.ts` | API Route — Live RunPod ping |
| `src/app/api/pipeline/adapters/[jobId]/restart/route.ts` | API Route — Trigger manual worker restart |
| `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts` | API Route — Poll restart progress |
| `src/app/api/pipeline/adapters/[jobId]/remove/route.ts` | API Route — Remove adapter from RunPod |
| `src/inngest/functions/restart-inference-workers.ts` | Inngest Function — Manual restart with DB tracking |
| `src/hooks/useAdapterDetail.ts` | Hook — React Query hooks for detail page |
| `src/components/pipeline/DeploymentTimeline.tsx` | Component — Deployment report visualization |
| `src/components/pipeline/AdapterStatusPing.tsx` | Component — Status ping widget |
| `src/components/pipeline/EndpointRestartTool.tsx` | Component — Endpoint restart widget |
| `src/types/adapter-detail.ts` | Types — New types for detail page features |

### Modified Files (Edit)
| File | Change Summary |
|------|---------------|
| `src/inngest/functions/auto-deploy-adapter.ts` | Capture deployment data; clean up old adapters from LORA_MODULES; write `deployment_log` JSONB; supersede old jobs; delete old HF repos |
| `src/inngest/functions/refresh-inference-workers.ts` | Write restart progress to `endpoint_restart_log` at each step; add `workbaseId` to event data consumed |
| `src/inngest/functions/index.ts` | Register new `restartInferenceWorkers` function |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | Make Adapter History entries clickable links to the detail page |

### Database Schema Changes (SAOL Migrations)
| Change | Table | Details |
|--------|-------|---------|
| ADD COLUMN | `pipeline_training_jobs` | `deployment_log JSONB DEFAULT NULL` |
| ADD COLUMN | `pipeline_training_jobs` | `adapter_status TEXT DEFAULT 'active' CHECK (adapter_status IN ('active', 'superseded', 'deleted'))` |
| CREATE TABLE | `endpoint_restart_log` | Full schema below |

---

## Phase 1: Database Migrations (SAOL)

> **SAOL constraint:** Run these as CLI commands from `supa-agent-ops/` directory. Do NOT use raw SQL in application code. After running each migration, verify the column/table exists before proceeding to code changes.

### Migration 1: Add `deployment_log` column

```sql
ALTER TABLE pipeline_training_jobs
ADD COLUMN IF NOT EXISTS deployment_log JSONB DEFAULT NULL;
```

### Migration 2: Add `adapter_status` column

```sql
ALTER TABLE pipeline_training_jobs
ADD COLUMN IF NOT EXISTS adapter_status TEXT DEFAULT 'active'
  CHECK (adapter_status IN ('active', 'superseded', 'deleted'));
```

### Migration 3: Create `endpoint_restart_log` table

```sql
CREATE TABLE IF NOT EXISTS endpoint_restart_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbase_id UUID NOT NULL REFERENCES workbases(id),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id),
  adapter_name TEXT NOT NULL,
  runpod_endpoint_id TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'auto'
    CHECK (trigger_source IN ('auto', 'manual')),

  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN (
      'initiated', 'scaling_down', 'workers_terminated',
      'scaling_up', 'workers_ready', 'verifying',
      'completed', 'failed'
    )),

  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scale_down_at TIMESTAMPTZ,
  workers_terminated_at TIMESTAMPTZ,
  scale_up_at TIMESTAMPTZ,
  workers_ready_at TIMESTAMPTZ,
  verification_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,

  scale_down_success BOOLEAN,
  scale_up_success BOOLEAN,
  adapter_verified BOOLEAN,
  adapter_in_lora_modules BOOLEAN,
  lora_modules_snapshot JSONB,
  worker_state_after JSONB,

  error_message TEXT,
  error_step TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_restart_log_workbase_latest
  ON endpoint_restart_log (workbase_id, initiated_at DESC);

CREATE INDEX IF NOT EXISTS idx_restart_log_job
  ON endpoint_restart_log (job_id);
```

---

## Phase 2: New TypeScript Types

**File to create:** `src/types/adapter-detail.ts`

```typescript
/**
 * Types for Adapter Detail Page features:
 * - DeploymentLog: JSONB stored in pipeline_training_jobs.deployment_log
 * - EndpointRestartLog: DB record in endpoint_restart_log table
 * - AdapterPingResult: Response from GET /api/pipeline/adapters/[jobId]/ping
 */

// ============================================================
// Deployment Log
// ============================================================

export interface DeploymentLog {
  adapter_name: string;              // "adapter-e8fa481f"
  hf_path: string;                   // "BrightHub2/lora-emotional-intelligence-e8fa481f"
  hf_commit_oid: string | null;      // Git commit OID from HuggingFace
  hf_files_uploaded: string[];       // ["adapter_model.safetensors", "adapter_config.json", ...]

  runpod_endpoint_id: string;        // "780tauhj7c126b"
  runpod_save_success: boolean;
  runpod_lora_modules_after: Array<{ name: string; path: string }>;

  worker_refresh: {
    scale_down_at: string;
    workers_terminated_at: string;
    scale_up_at: string;
    workers_ready_at: string;
    verification_result: 'verified' | 'unverified' | 'skipped';
    verification_error: string | null;
  } | null;

  deployed_at: string;
  total_duration_ms: number;
}

// ============================================================
// Endpoint Restart Log
// ============================================================

export type RestartStatus =
  | 'initiated'
  | 'scaling_down'
  | 'workers_terminated'
  | 'scaling_up'
  | 'workers_ready'
  | 'verifying'
  | 'completed'
  | 'failed';

export type RestartTrigger = 'auto' | 'manual';

export interface EndpointRestartLog {
  id: string;
  workbaseId: string;
  jobId: string;
  adapterName: string;
  runpodEndpointId: string;
  triggerSource: RestartTrigger;
  status: RestartStatus;
  initiatedAt: string;
  scaleDownAt: string | null;
  workerTerminatedAt: string | null;
  scaleUpAt: string | null;
  workersReadyAt: string | null;
  verificationAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
  scaleDownSuccess: boolean | null;
  scaleUpSuccess: boolean | null;
  adapterVerified: boolean | null;
  adapterInLoraModules: boolean | null;
  loraModulesSnapshot: Array<{ name: string; path: string }> | null;
  workerStateAfter: {
    ready: number;
    idle: number;
    running: number;
    initializing: number;
  } | null;
  errorMessage: string | null;
  errorStep: string | null;
}

// ============================================================
// Adapter Ping Result
// ============================================================

export interface AdapterPingResult {
  adapterId: string;
  hfPath: string | null;
  registeredInLoraModules: boolean;
  loraModulesSnapshot: Array<{ name: string; path: string }>;
  inferenceAvailable: boolean;
  inferenceLatencyMs: number | null;
  inferenceError: string | null;
  workerStatus: {
    ready: number;
    idle: number;
    running: number;
    initializing: number;
  };
  endpointDbStatus: 'pending' | 'deploying' | 'ready' | 'failed' | 'terminated' | null;
  checkedAt: string;
}

// ============================================================
// Restart Verdict (computed from EndpointRestartLog)
// ============================================================

export type VerdictSeverity = 'success' | 'warning' | 'error';

export interface RestartVerdict {
  verdict: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'TIMING_ERROR' | 'IN_PROGRESS';
  reason: string;
  severity: VerdictSeverity;
  action?: string;
}

export function getRestartVerdict(log: EndpointRestartLog): RestartVerdict {
  const inProgressStatuses: RestartStatus[] = [
    'initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'
  ];

  if (inProgressStatuses.includes(log.status)) {
    return { verdict: 'IN_PROGRESS', reason: 'Restart is currently in progress', severity: 'warning' };
  }

  if (log.status === 'failed') {
    return {
      verdict: 'FAILED',
      reason: `Restart failed at step: ${log.errorStep || 'unknown'}`,
      severity: 'error',
    };
  }

  if (!log.adapterInLoraModules) {
    return {
      verdict: 'TIMING_ERROR',
      reason: 'Adapter was not in LORA_MODULES when restart began — deploy may not have completed',
      severity: 'warning',
      action: 'Check Deployment Report. If deployment is complete, restart again.',
    };
  }

  if (log.adapterVerified) {
    return {
      verdict: 'SUCCESS',
      reason: 'Adapter is active and verified on inference endpoint',
      severity: 'success',
    };
  }

  return {
    verdict: 'PARTIAL',
    reason: 'Restart completed but adapter inference verification failed',
    severity: 'warning',
    action: 'Workers may still be loading the adapter. Wait 60s and use "Adapter Status Ping" to re-check.',
  };
}

// ============================================================
// DB Row Mappers
// ============================================================

export function mapDbRowToRestartLog(row: any): EndpointRestartLog {
  return {
    id: row.id,
    workbaseId: row.workbase_id,
    jobId: row.job_id,
    adapterName: row.adapter_name,
    runpodEndpointId: row.runpod_endpoint_id,
    triggerSource: row.trigger_source,
    status: row.status,
    initiatedAt: row.initiated_at,
    scaleDownAt: row.scale_down_at,
    workerTerminatedAt: row.workers_terminated_at,
    scaleUpAt: row.scale_up_at,
    workersReadyAt: row.workers_ready_at,
    verificationAt: row.verification_at,
    completedAt: row.completed_at,
    totalDurationMs: row.total_duration_ms,
    scaleDownSuccess: row.scale_down_success,
    scaleUpSuccess: row.scale_up_success,
    adapterVerified: row.adapter_verified,
    adapterInLoraModules: row.adapter_in_lora_modules,
    loraModulesSnapshot: row.lora_modules_snapshot,
    workerStateAfter: row.worker_state_after,
    errorMessage: row.error_message,
    errorStep: row.error_step,
  };
}
```

---

## Phase 3: Modify `auto-deploy-adapter.ts`

**File:** `src/inngest/functions/auto-deploy-adapter.ts`

Read this file before editing. It is 691 lines. The changes below are surgical — preserve all existing logic and only add/modify what is listed.

### Change 3a: Add `deleteRepo` to the HuggingFace import

**Current line 40:**
```typescript
import { uploadFiles, createRepo } from '@huggingface/hub';
```

**Replace with:**
```typescript
import { uploadFiles, createRepo, deleteRepo } from '@huggingface/hub';
```

### Change 3b: Capture HF commit OID in Step 2+3 return value

**Current code (around line 278–284):**
```typescript
      console.log(
        `[AutoDeployAdapter] Committed ${uploadedFileNames.length} files to ${hfPath} ` +
        `(commit: ${commitResult?.commit?.oid || 'unknown'})`
      );

      return { hfPath, uploadedFiles: uploadedFileNames };
```

**Replace with:**
```typescript
      const hfCommitOid = commitResult?.commit?.oid || null;
      console.log(
        `[AutoDeployAdapter] Committed ${uploadedFileNames.length} files to ${hfPath} ` +
        `(commit: ${hfCommitOid || 'unknown'})`
      );

      return { hfPath, uploadedFiles: uploadedFileNames, hfCommitOid };
```

### Change 3c: Add HFUploadResult type update

**Current interface (around line 58–61):**
```typescript
interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
}
```

**Replace with:**
```typescript
interface HFUploadResult {
  hfPath: string;
  uploadedFiles: string[];
  hfCommitOid: string | null;
}
```

### Change 3d: Modify Step 4 (`update-runpod-lora-modules`) — remove old adapters for same workbase before appending new one

**Current code (around line 362–388) — the section that parses LORA_MODULES and appends the new adapter:**

```typescript
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
        return { loraModules, noChange: true, originalWorkersMin: endpoint.workersMin, originalWorkersMax: endpoint.workersMax };
      }
```

**Replace with:**
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

      // ---- 4b-ii: Remove old adapters belonging to THIS workbase (Approach A: DB query) ----
      // Query for all OTHER completed jobs in the same workbase that have been deployed.
      // Their adapter names are deterministic: adapter-{id.substring(0,8)}
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

### Change 3e: Update Step 4 return value to capture RunPod data

**Current code (line 471 approximately) — the final `return` at the end of step 4:**
```typescript
      return { loraModules, noChange: false, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

**Replace with:**
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

### Change 3f: Include `workbaseId` in the `pipeline/adapter.deployed` event (Step 4b)

**Current code (around line 483–495):**
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

**Replace with:**
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

### Change 3g: Add `deployment_log` write to Step 7 (`update-job-hf-path`)

**Current Step 7 DB update (around line 633–645):**
```typescript
      const { error } = await supabase
        .from('pipeline_training_jobs')
        .update({
          hf_adapter_path: hfUploadResult.hfPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
```

**Replace with:**
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

### Change 3h: Add Step 7a — `supersede-old-adapters` (between Step 7 and Step 7b)

Add this entire step **after the closing `});` of Step 7 (`update-job-hf-path`) and BEFORE the `if (job.workbase_id)` block that starts Step 7b:**

```typescript
    // =====================================================
    // Step 7a: Supersede old adapter records for this workbase
    // Marks all OTHER deployed jobs for this workbase as 'superseded'
    // and marks their pipeline_inference_endpoints as 'terminated'.
    // =====================================================
    if (job.workbase_id) {
      await step.run('supersede-old-adapters', async () => {
        const supabase = createServerSupabaseAdminClient();

        // Find all other deployed jobs for this workbase
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

        // Mark old jobs as 'superseded'
        await supabase
          .from('pipeline_training_jobs')
          .update({ adapter_status: 'superseded', updated_at: new Date().toISOString() })
          .in('id', oldJobIds);

        // Mark their inference endpoints as 'terminated'
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

### Change 3i: Add Step 7c — `delete-old-hf-repos` (non-fatal, after Step 7b)

Add this entire step **after the closing `});` of Step 7b (`update-workbase-active-adapter`):**

```typescript
    // =====================================================
    // Step 7c: Delete old HuggingFace repos (non-fatal)
    // Removes superseded adapters' HF model repos to keep
    // the BrightHub2 org clean. Failure does not block deployment.
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

            // Mark as 'deleted' in DB
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

## Phase 4: Modify `refresh-inference-workers.ts`

**File:** `src/inngest/functions/refresh-inference-workers.ts`

Read this file before editing. It is 273 lines. Changes add `endpoint_restart_log` writes at each step and consume the new `workbaseId` from the event.

### Change 4a: Add `workbaseId` to destructured event data

**Current code (around line 27–30):**
```typescript
    const {
      jobId,
      adapterName,
      endpointId,
      originalWorkersMin,
      originalWorkersMax,
    } = event.data;
```

**Replace with:**
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

### Change 4b: Replace Step 1 (`scale-down-workers`) to create restart log and scale down

**Current Step 1 code (lines 71–113):**
```typescript
    void (await step.run('scale-down-workers', async () => {
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
      return { previousWorkersMin: ep.workersMin, allEnv: ep.env };
    }));
```

**Replace with:**
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

      // Update log with pre-restart LORA_MODULES check
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

### Change 4c: Update Step 2 (`wait-for-workers-terminated`) to write to restart log

**After the `if (total === 0) return { waitedMs: Date.now() - startMs };` line in Step 2, update the return to include timing. Then after the step, add a DB update.**

Replace the entire Step 2:

```typescript
    // ========================================
    // Step 2: Wait for all workers to terminate
    // ========================================
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

### Change 4d: Update Step 3 (`scale-up-workers`) to write to restart log

Replace the entire Step 3:

```typescript
    // ========================================
    // Step 3: Scale up workers with MAX_LORAS=5
    // ========================================
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

### Change 4e: Update Step 4 (`wait-for-workers-ready`) to write to restart log

Replace the entire Step 4:

```typescript
    // ========================================
    // Step 4: Wait for workers to become ready
    // ========================================
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

### Change 4f: Update Step 5 (`verify-adapter-available`) to write to restart log

Replace the entire Step 5:

```typescript
    // ========================================
    // Step 5: Verify adapter is available (non-fatal)
    // ========================================
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

### Change 4g: Update Step 6 (`mark-endpoints-ready`) to write completion to restart log and update `deployment_log`

Replace the entire Step 6:

```typescript
    // ========================================
    // Step 6: Mark endpoints as ready in DB + finalize restart log
    // ========================================
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
        scale_down_at: completedAt,          // approximate; actual stored in restart log
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
        // Use jsonb_set to merge worker_refresh into the existing deployment_log
        // This avoids overwriting the deployment_log built by autoDeployAdapter.
        // Since we can't use raw SQL in application code, we fetch and update:
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

---

## Phase 5: Create `restart-inference-workers.ts` (New Inngest Function)

**File to create:** `src/inngest/functions/restart-inference-workers.ts`

This function handles **manual** worker restarts triggered by `POST /api/pipeline/adapters/[jobId]/restart`. It follows the same 6-step structure as `refreshInferenceWorkers` but consumes a pre-created `restartLogId` from the event and writes detailed progress to the restart log.

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

    // Helper: RunPod GraphQL request
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

    // Helper: Poll endpoint health
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

    // Helper: Update restart log
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

      // Scale down to 0
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

      await updateLog({ status: 'failed', error_step: 'wait-for-workers-terminated', error_message: 'Workers did not terminate within 90s', completed_at: new Date().toISOString() });
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

      await updateLog({ status: 'failed', error_step: 'wait-for-workers-ready', error_message: 'Workers did not reach ready state within 180s', completed_at: new Date().toISOString() });
      throw new Error('Workers did not reach ready state within 180s');
    });

    // =====================================================
    // Step 5: Verify adapter via inference ping
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
    // Step 6: Finalize restart log
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

      // Also mark pipeline_inference_endpoints as ready
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

## Phase 6: Update `src/inngest/functions/index.ts`

**File:** `src/inngest/functions/index.ts`

**Current content (confirmed — already has rebuildTrainingSet from Spec 23):**
```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';
```

**Replace with (add restartInferenceWorkers):**
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

---

## Phase 7: New API Routes

### Route 7.1: `GET /api/pipeline/jobs/[jobId]/deployment-log/route.ts`

**File to create:** `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts`

> Note: The `[jobId]` segment here is a sub-folder under the existing `src/app/api/pipeline/jobs/[jobId]/` directory that already has `route.ts`. The `deployment-log/` subfolder is a new nested route and does NOT conflict with the existing `route.ts`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  const { data: job, error } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, deployment_log, hf_adapter_path, adapter_status')
    .eq('id', params.jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: job.deployment_log || null,
  });
}
```

### Route 7.2: `GET /api/pipeline/adapters/[jobId]/ping/route.ts`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/ping/route.ts`

> Note: This sits under `src/app/api/pipeline/adapters/[jobId]/`. The existing flat routes (`status/`, `test/`, `deploy/`, `rate/`) are static segments that take routing precedence over `[jobId]` in Next.js. A UUID-format jobId will never match those static names. No routing conflict.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
  const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
  const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

  const supabase = createServerSupabaseAdminClient();

  // 1. Verify ownership and get job data
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const adapterId = `adapter-${params.jobId.substring(0, 8)}`;
  const checkedAt = new Date().toISOString();

  // 2. Get DB endpoint status
  const { data: endpoint } = await supabase
    .from('pipeline_inference_endpoints')
    .select('status')
    .eq('job_id', params.jobId)
    .eq('endpoint_type', 'adapted')
    .maybeSingle();

  const endpointDbStatus = endpoint?.status || null;

  // 3. GraphQL: Read LORA_MODULES from RunPod endpoint
  let registeredInLoraModules = false;
  let loraModulesSnapshot: Array<{ name: string; path: string }> = [];

  try {
    const fetchQuery = `
      query GetEndpointEnv($id: String!) {
        myself {
          endpoint(id: $id) {
            env { key value }
          }
        }
      }
    `;
    const graphqlResp = await fetch(
      `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fetchQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
      }
    );
    const graphqlData = await graphqlResp.json();
    const envVars: Array<{ key: string; value: string }> =
      graphqlData?.data?.myself?.endpoint?.env || [];
    const loraEnv = envVars.find((e) => e.key === 'LORA_MODULES');
    if (loraEnv?.value) {
      loraModulesSnapshot = JSON.parse(loraEnv.value);
      registeredInLoraModules = loraModulesSnapshot.some((m) => m.name === adapterId);
    }
  } catch (err) {
    console.warn('[adapter-ping] GraphQL LORA_MODULES check failed:', err);
  }

  // 4. Health check: worker status
  let workerStatus = { ready: 0, idle: 0, running: 0, initializing: 0 };
  try {
    const healthResp = await fetch(`${INFERENCE_API_URL}/health`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    });
    const healthData = await healthResp.json();
    workerStatus = {
      ready: healthData.workers?.ready || 0,
      idle: healthData.workers?.idle || 0,
      running: healthData.workers?.running || 0,
      initializing: healthData.workers?.initializing || 0,
    };
  } catch (err) {
    console.warn('[adapter-ping] Health check failed:', err);
  }

  // 5. Inference ping
  let inferenceAvailable = false;
  let inferenceLatencyMs: number | null = null;
  let inferenceError: string | null = null;

  try {
    const startMs = Date.now();
    const inferenceResp = await fetch(`${INFERENCE_API_URL}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          openai_route: '/v1/chat/completions',
          openai_input: {
            model: adapterId,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          },
        },
      }),
    });
    const inferenceData = await inferenceResp.json();
    inferenceLatencyMs = Date.now() - startMs;

    if (inferenceData.status === 'COMPLETED') {
      inferenceAvailable = true;
    } else {
      inferenceError = `Status: ${inferenceData.status}`;
    }
  } catch (err: any) {
    inferenceError = err.message || 'Inference request failed';
  }

  return NextResponse.json({
    success: true,
    data: {
      adapterId,
      hfPath: job.hf_adapter_path || null,
      registeredInLoraModules,
      loraModulesSnapshot,
      inferenceAvailable,
      inferenceLatencyMs,
      inferenceError,
      workerStatus,
      endpointDbStatus,
      checkedAt,
    },
  });
}
```

### Route 7.3: `POST /api/pipeline/adapters/[jobId]/restart/route.ts`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/restart/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;

  const supabase = createServerSupabaseAdminClient();

  // Verify job ownership and deployment status
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id, job_name')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  if (!job.hf_adapter_path) {
    return NextResponse.json(
      { success: false, error: 'Adapter has not been deployed yet. Wait for deployment to complete before restarting.' },
      { status: 400 }
    );
  }

  // Check for any in-progress restart
  if (job.workbase_id) {
    const { data: inProgress } = await supabase
      .from('endpoint_restart_log')
      .select('id, status')
      .eq('workbase_id', job.workbase_id)
      .in('status', ['initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'])
      .maybeSingle();

    if (inProgress) {
      return NextResponse.json(
        { success: false, error: 'A restart is already in progress. Wait for it to complete before triggering another.' },
        { status: 409 }
      );
    }
  }

  // Fetch current endpoint workers to know originalWorkersMin/Max for scaling back up
  let originalWorkersMin = 1;
  let originalWorkersMax = 1;
  try {
    const fetchQuery = `
      query GetEndpoint($id: String!) {
        myself {
          endpoint(id: $id) { workersMin workersMax }
        }
      }
    `;
    const graphqlResp = await fetch(
      `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fetchQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
      }
    );
    const graphqlData = await graphqlResp.json();
    const ep = graphqlData?.data?.myself?.endpoint;
    if (ep) {
      originalWorkersMin = ep.workersMin || 1;
      originalWorkersMax = ep.workersMax || 1;
    }
  } catch (err) {
    console.warn('[restart-api] Could not fetch endpoint workers (using defaults):', err);
  }

  const adapterName = `adapter-${params.jobId.substring(0, 8)}`;

  // Create restart log row
  const { data: logRow, error: logErr } = await supabase
    .from('endpoint_restart_log')
    .insert({
      workbase_id: job.workbase_id,
      job_id: params.jobId,
      adapter_name: adapterName,
      runpod_endpoint_id: RUNPOD_INFERENCE_ENDPOINT_ID,
      trigger_source: 'manual',
      status: 'initiated',
      user_id: user.id,
    })
    .select('id')
    .single();

  if (logErr || !logRow) {
    return NextResponse.json(
      { success: false, error: 'Failed to create restart log' },
      { status: 500 }
    );
  }

  // Fire Inngest event
  await inngest.send({
    name: 'pipeline/endpoint.restart.requested',
    data: {
      jobId: params.jobId,
      workbaseId: job.workbase_id,
      adapterName,
      restartLogId: logRow.id,
      endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
      originalWorkersMin,
      originalWorkersMax,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      restartLogId: logRow.id,
      adapterId: adapterName,
      status: 'initiated',
      message: 'Worker restart initiated. This takes 45–270 seconds. Poll restart-status for progress.',
    },
  });
}
```

### Route 7.4: `GET /api/pipeline/adapters/[jobId]/restart-status/route.ts`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapDbRowToRestartLog } from '@/types/adapter-detail';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const logId = searchParams.get('logId'); // optional: get specific log; defaults to latest

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Fetch restart log — either specific or latest for this job
  let query = supabase
    .from('endpoint_restart_log')
    .select('*')
    .eq('job_id', params.jobId)
    .order('initiated_at', { ascending: false })
    .limit(1);

  if (logId) {
    query = supabase
      .from('endpoint_restart_log')
      .select('*')
      .eq('id', logId)
      .eq('job_id', params.jobId)
      .limit(1);
  }

  const { data: logs, error: logErr } = await query;

  if (logErr) {
    return NextResponse.json({ success: false, error: logErr.message }, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({ success: true, data: null });
  }

  const log = mapDbRowToRestartLog(logs[0]);
  const adapterId = `adapter-${params.jobId.substring(0, 8)}`;

  return NextResponse.json({
    success: true,
    data: {
      ...log,
      adapterId,
      hfPath: job.hf_adapter_path || null,
    },
  });
}
```

### Route 7.5: `POST /api/pipeline/adapters/[jobId]/remove/route.ts`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/remove/route.ts`

Removes a specific adapter from RunPod `LORA_MODULES` and optionally marks it as deleted in DB. Used by the Lifecycle Actions section of the Adapter Detail Page.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id, adapter_status')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const adapterName = `adapter-${params.jobId.substring(0, 8)}`;

  // 1. Fetch current LORA_MODULES from RunPod
  const fetchQuery = `
    query GetEndpointEnv($id: String!) {
      myself {
        endpoint(id: $id) {
          id name gpuIds idleTimeout locations networkVolumeId
          scalerType scalerValue workersMin workersMax templateId
          env { key value }
        }
      }
    }
  `;

  const fetchResp = await fetch(
    `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fetchQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
    }
  );

  const fetchData = await fetchResp.json();
  const ep = fetchData?.data?.myself?.endpoint;
  if (!ep) {
    return NextResponse.json({ success: false, error: 'RunPod endpoint not found' }, { status: 500 });
  }

  // 2. Remove adapter from LORA_MODULES
  const currentEnv: Array<{ key: string; value: string }> = ep.env || [];
  const loraEnv = currentEnv.find((e) => e.key === 'LORA_MODULES');
  let loraModules: Array<{ name: string; path: string }> = [];

  if (loraEnv?.value) {
    try {
      loraModules = JSON.parse(loraEnv.value);
    } catch { /* ignore */ }
  }

  const beforeCount = loraModules.length;
  loraModules = loraModules.filter((m) => m.name !== adapterName);
  const removed = beforeCount - loraModules.length;

  if (removed === 0) {
    return NextResponse.json(
      { success: false, error: 'Adapter is not in LORA_MODULES — may have already been removed' },
      { status: 400 }
    );
  }

  // 3. Save updated LORA_MODULES to RunPod
  const updatedEnv = [
    ...currentEnv.filter((e) => e.key !== 'LORA_MODULES').map((e) => ({ key: e.key, value: e.value })),
    { key: 'LORA_MODULES', value: JSON.stringify(loraModules) },
  ];

  const saveMutation = `
    mutation SaveEndpointEnv($input: EndpointInput!) {
      saveEndpoint(input: $input) { id }
    }
  `;

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
            name: ep.name,
            gpuIds: ep.gpuIds,
            idleTimeout: ep.idleTimeout,
            locations: ep.locations,
            networkVolumeId: ep.networkVolumeId,
            scalerType: ep.scalerType,
            scalerValue: ep.scalerValue,
            workersMin: ep.workersMin,
            workersMax: ep.workersMax,
            templateId: ep.templateId,
            env: updatedEnv,
          },
        },
      }),
    }
  );

  const saveData = await saveResp.json();
  if (saveData.errors) {
    return NextResponse.json(
      { success: false, error: `RunPod save failed: ${JSON.stringify(saveData.errors)}` },
      { status: 500 }
    );
  }

  // 4. Update DB — mark adapter_status
  await supabase
    .from('pipeline_training_jobs')
    .update({
      adapter_status: 'superseded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.jobId);

  // 5. Mark inference endpoints as terminated
  await supabase
    .from('pipeline_inference_endpoints')
    .update({ status: 'terminated', updated_at: new Date().toISOString() })
    .eq('job_id', params.jobId);

  return NextResponse.json({
    success: true,
    data: {
      adapterId: adapterName,
      removed: true,
      loraModulesRemaining: loraModules.length,
      message: `${adapterName} removed from RunPod LORA_MODULES. Workers will need to restart to unload it from GPU memory.`,
    },
  });
}
```

---

## Phase 8: New React Hook `useAdapterDetail.ts`

**File to create:** `src/hooks/useAdapterDetail.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DeploymentLog, AdapterPingResult, EndpointRestartLog } from '@/types/adapter-detail';
import { mapDbRowToRestartLog } from '@/types/adapter-detail';

// ============================================================
// Query Keys
// ============================================================

export const adapterDetailKeys = {
  all: ['adapter-detail'] as const,
  deployment: (jobId: string) => ['adapter-detail', 'deployment', jobId] as const,
  ping: (jobId: string) => ['adapter-detail', 'ping', jobId] as const,
  restartStatus: (jobId: string) => ['adapter-detail', 'restart-status', jobId] as const,
};

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch deployment_log for a job.
 * Returns null if no deployment log exists yet (adapter not yet deployed).
 */
export function useDeploymentLog(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.deployment(jobId || ''),
    queryFn: async (): Promise<DeploymentLog | null> => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/deployment-log`);
      if (!res.ok) throw new Error('Failed to fetch deployment log');
      const json = await res.json();
      return json.data;
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch adapter status ping — user-triggered only.
 * `enabled: false` by default; call `refetch()` to trigger.
 */
export function useAdapterPing(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.ping(jobId || ''),
    queryFn: async (): Promise<AdapterPingResult> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/ping`);
      if (!res.ok) throw new Error('Failed to ping adapter');
      const json = await res.json();
      return json.data;
    },
    enabled: false, // user-triggered only
    staleTime: 0,   // always re-fetch when triggered
    retry: false,
  });
}

/**
 * Fetch latest restart status — can be used for polling during active restarts.
 */
export function useRestartStatus(
  jobId: string | null,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: adapterDetailKeys.restartStatus(jobId || ''),
    queryFn: async (): Promise<(EndpointRestartLog & { adapterId: string; hfPath: string | null }) | null> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart-status`);
      if (!res.ok) throw new Error('Failed to fetch restart status');
      const json = await res.json();
      if (!json.data) return null;
      return json.data;
    },
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 5 * 1000,
  });
}

/**
 * Trigger a manual endpoint restart.
 */
export function useTriggerRestart(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to trigger restart');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.restartStatus(jobId || '') });
    },
  });
}

/**
 * Remove adapter from RunPod LORA_MODULES.
 */
export function useRemoveAdapter(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/remove`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove adapter');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.ping(jobId || '') });
    },
  });
}
```

---

## Phase 9: New Components

### Component 9.1: `DeploymentTimeline.tsx`

**File to create:** `src/components/pipeline/DeploymentTimeline.tsx`

```typescript
'use client';

import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import type { DeploymentLog } from '@/types/adapter-detail';

interface DeploymentTimelineProps {
  deploymentLog: DeploymentLog | null;
  isLoading: boolean;
}

function TimelineStep({
  success,
  label,
  detail,
}: {
  success: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = success === null
    ? Clock
    : success
      ? CheckCircle2
      : XCircle;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
          success === null
            ? 'text-muted-foreground'
            : success
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export function DeploymentTimeline({ deploymentLog, isLoading }: DeploymentTimelineProps) {
  const [showLoraModules, setShowLoraModules] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading deployment report...
        </CardContent>
      </Card>
    );
  }

  if (!deploymentLog) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No deployment data available. This adapter may have been deployed before deployment logging was added.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wr = deploymentLog.worker_refresh;
  const verificationResult = wr?.verification_result;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Adapter ID:</span>
          <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
            {deploymentLog.adapter_name}
          </code>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <TimelineStep
            success={true}
            label="HuggingFace Upload"
            detail={`${deploymentLog.hf_files_uploaded.length} files · ${deploymentLog.hf_path}${deploymentLog.hf_commit_oid ? ` · commit ${deploymentLog.hf_commit_oid.substring(0, 8)}` : ''}`}
          />

          <TimelineStep
            success={deploymentLog.runpod_save_success}
            label="RunPod LORA_MODULES Updated"
            detail={`Endpoint: ${deploymentLog.runpod_endpoint_id} · ${deploymentLog.runpod_lora_modules_after.length} total adapter(s) after update`}
          />

          <TimelineStep
            success={!!wr}
            label="Workers Cycled"
            detail={wr ? `Scale: 0→${1}→ready` : 'Pending worker refresh...'}
          />

          <TimelineStep
            success={verificationResult === 'verified' ? true : verificationResult === 'unverified' ? false : null}
            label="Inference Verified"
            detail={
              verificationResult === 'verified'
                ? 'Adapter responded successfully to test inference'
                : verificationResult === 'unverified'
                  ? wr?.verification_error || 'Inference verification failed'
                  : verificationResult === 'skipped'
                    ? 'Verification was skipped'
                    : 'Pending...'
            }
          />
        </div>

        {/* HuggingFace link */}
        <a
          href={`https://huggingface.co/${deploymentLog.hf_path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-duck-blue hover:underline"
        >
          View on HuggingFace
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* Expandable LORA_MODULES snapshot */}
        {deploymentLog.runpod_lora_modules_after.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground p-0 h-auto"
              onClick={() => setShowLoraModules(!showLoraModules)}
            >
              {showLoraModules ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              LORA_MODULES snapshot ({deploymentLog.runpod_lora_modules_after.length})
            </Button>
            {showLoraModules && (
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto text-foreground">
                {JSON.stringify(deploymentLog.runpod_lora_modules_after, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Component 9.2: `AdapterStatusPing.tsx`

**File to create:** `src/components/pipeline/AdapterStatusPing.tsx`

```typescript
'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { AdapterPingResult } from '@/types/adapter-detail';

interface AdapterStatusPingProps {
  jobId: string;
  adapterId: string;
  pingData: AdapterPingResult | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}

function StatusRow({
  checked,
  label,
  detail,
}: {
  checked: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = checked === null ? AlertTriangle : checked ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2">
      <Icon
        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
          checked === null
            ? 'text-yellow-500'
            : checked
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function AdapterStatusPing({
  jobId,
  adapterId,
  pingData,
  isFetching,
  onRefresh,
}: AdapterStatusPingProps) {
  const [lastCooldown, setLastCooldown] = useState(0);

  const handleRefresh = () => {
    const now = Date.now();
    if (now - lastCooldown < 10_000) {
      toast.error('Please wait 10 seconds between pings.');
      return;
    }
    setLastCooldown(now);
    onRefresh();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(adapterId);
    toast.success('Adapter ID copied');
  };

  const workersOnline =
    pingData
      ? pingData.workerStatus.ready + pingData.workerStatus.idle > 0
      : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Adapter Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID */}
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 text-foreground">
            {adapterId}
          </code>
          <Button variant="ghost" size="sm" onClick={handleCopyId} className="px-2">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {pingData ? (
          <div className="space-y-3">
            <StatusRow
              checked={pingData.registeredInLoraModules}
              label="Registered in LORA_MODULES"
              detail={
                pingData.registeredInLoraModules
                  ? `${pingData.loraModulesSnapshot.length} adapter(s) total on endpoint`
                  : 'Adapter not found in endpoint configuration'
              }
            />
            <StatusRow
              checked={workersOnline}
              label={
                workersOnline
                  ? `Workers online (${pingData.workerStatus.ready} ready, ${pingData.workerStatus.idle} idle)`
                  : 'Workers offline — endpoint is scaled to 0'
              }
            />
            <StatusRow
              checked={pingData.inferenceAvailable}
              label={
                pingData.inferenceAvailable
                  ? `Inference verified (latency: ${pingData.inferenceLatencyMs?.toLocaleString()}ms)`
                  : 'Inference unavailable'
              }
              detail={pingData.inferenceError || undefined}
            />

            <p className="text-xs text-muted-foreground">
              Last checked:{' '}
              {new Date(pingData.checkedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click Refresh Status to check adapter health.
            <br />
            <span className="text-xs">Note: Each ping runs a live inference request (~$0.01–$0.02).</span>
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Checking...' : 'Refresh Status'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Component 9.3: `EndpointRestartTool.tsx`

**File to create:** `src/components/pipeline/EndpointRestartTool.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useRestartStatus, useTriggerRestart } from '@/hooks/useAdapterDetail';
import { getRestartVerdict } from '@/types/adapter-detail';
import type { EndpointRestartLog } from '@/types/adapter-detail';

const IN_PROGRESS_STATUSES = [
  'initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'
];

const STEP_LABELS: Record<string, string> = {
  initiated: 'Initiating restart...',
  scaling_down: 'Scaling workers down...',
  workers_terminated: 'Workers terminated',
  scaling_up: 'Scaling workers up...',
  workers_ready: 'Workers ready',
  verifying: 'Verifying adapter...',
  completed: 'Complete',
  failed: 'Failed',
};

interface StepItemProps {
  label: string;
  status: 'done' | 'active' | 'pending' | 'failed';
  timestamp?: string | null;
}

function StepItem({ label, status, timestamp }: StepItemProps) {
  const Icon =
    status === 'done' ? CheckCircle2
    : status === 'failed' ? XCircle
    : status === 'active' ? Loader2
    : Clock;

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          status === 'done' ? 'text-green-600'
          : status === 'failed' ? 'text-destructive'
          : status === 'active' ? 'text-duck-blue animate-spin'
          : 'text-muted-foreground'
        }`}
      />
      <span className={`text-sm ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </span>
      {timestamp && (
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function getStepStatus(
  log: EndpointRestartLog,
  targetStatus: string
): 'done' | 'active' | 'pending' | 'failed' {
  const order = [
    'initiated', 'scaling_down', 'workers_terminated',
    'scaling_up', 'workers_ready', 'verifying', 'completed'
  ];
  const currentIdx = order.indexOf(log.status);
  const targetIdx = order.indexOf(targetStatus);

  if (log.status === 'failed') {
    // All steps before the failed step are done; the failed step is failed; rest are pending
    const failedStepIdx = order.indexOf(log.errorStep || '');
    if (targetIdx < failedStepIdx) return 'done';
    if (targetIdx === failedStepIdx) return 'failed';
    return 'pending';
  }

  if (targetIdx < currentIdx) return 'done';
  if (targetIdx === currentIdx) return 'active';
  return 'pending';
}

interface EndpointRestartToolProps {
  jobId: string;
  adapterId: string;
}

export function EndpointRestartTool({ jobId, adapterId }: EndpointRestartToolProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch restart status — poll every 5s when active
  const { data: restartLog, refetch } = useRestartStatus(jobId, {
    refetchInterval: undefined, // managed manually below
  });

  const isActive = restartLog && IN_PROGRESS_STATUSES.includes(restartLog.status);

  // Auto-poll when restart is active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => { refetch(); }, 5000);
    return () => clearInterval(interval);
  }, [isActive, refetch]);

  const restartMutation = useTriggerRestart(jobId);

  const handleConfirmRestart = async () => {
    setShowConfirm(false);
    try {
      await restartMutation.mutateAsync();
      toast.success('Restart initiated. This will take 1–4 minutes.');
      // Start polling
      const interval = setInterval(async () => {
        const updated = await refetch();
        if (updated.data && !IN_PROGRESS_STATUSES.includes(updated.data.status)) {
          clearInterval(interval);
        }
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger restart');
    }
  };

  const verdict = restartLog ? getRestartVerdict(restartLog) : null;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Endpoint Restart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!restartLog ? (
            <p className="text-sm text-muted-foreground">
              No restart history for this adapter. If the adapter was deployed but workers
              haven't picked it up, use the button below to cycle inference workers.
            </p>
          ) : isActive ? (
            /* In Progress */
            <div className="space-y-3">
              <p className="text-sm font-medium text-duck-blue">
                <Loader2 className="h-4 w-4 inline animate-spin mr-1" />
                Restart in progress...
              </p>
              <div className="space-y-2">
                <StepItem label="Scale workers down" status={getStepStatus(restartLog, 'scaling_down')} timestamp={restartLog.scaleDownAt} />
                <StepItem label="Workers terminated" status={getStepStatus(restartLog, 'workers_terminated')} timestamp={restartLog.workerTerminatedAt} />
                <StepItem label="Scale workers up" status={getStepStatus(restartLog, 'scaling_up')} timestamp={restartLog.scaleUpAt} />
                <StepItem label="Workers ready" status={getStepStatus(restartLog, 'workers_ready')} timestamp={restartLog.workersReadyAt} />
                <StepItem label="Verify adapter" status={getStepStatus(restartLog, 'verifying')} timestamp={restartLog.verificationAt} />
              </div>
            </div>
          ) : (
            /* Completed or Failed */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Last Restart:{' '}
                  <span className="text-foreground">
                    {new Date(restartLog.initiatedAt).toLocaleString()}
                  </span>
                  {' '}
                  <Badge variant="outline" className="text-xs ml-1">
                    {restartLog.triggerSource}
                  </Badge>
                </p>
                {restartLog.totalDurationMs && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(restartLog.totalDurationMs / 1000)}s
                  </span>
                )}
              </div>

              {/* Verdict */}
              {verdict && (
                <div className={`p-3 rounded-md text-sm ${
                  verdict.severity === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                  verdict.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                  'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{verdict.reason}</p>
                  {verdict.action && (
                    <p className="text-xs mt-1 opacity-80">{verdict.action}</p>
                  )}
                </div>
              )}

              {/* Step results */}
              <div className="space-y-2">
                <StepItem
                  label={restartLog.scaleDownSuccess ? 'Workers scaled down' : 'Scale down failed'}
                  status={restartLog.scaleDownSuccess ? 'done' : 'failed'}
                  timestamp={restartLog.scaleDownAt}
                />
                <StepItem
                  label={restartLog.scaleUpSuccess ? 'Workers restarted and ready' : 'Workers failed to start'}
                  status={restartLog.scaleUpSuccess ? 'done' : restartLog.status === 'failed' ? 'failed' : 'pending'}
                  timestamp={restartLog.workersReadyAt}
                />
                <StepItem
                  label={
                    restartLog.adapterVerified
                      ? `Adapter ${adapterId} verified active`
                      : `Adapter ${adapterId} NOT verified`
                  }
                  status={restartLog.adapterVerified ? 'done' : 'failed'}
                  timestamp={restartLog.verificationAt}
                />
                <StepItem
                  label={
                    restartLog.adapterInLoraModules
                      ? `Adapter confirmed in LORA_MODULES (${restartLog.loraModulesSnapshot?.length || 0} total)`
                      : 'Adapter NOT in LORA_MODULES at restart time'
                  }
                  status={restartLog.adapterInLoraModules ? 'done' : 'failed'}
                />
              </div>

              {restartLog.errorMessage && (
                <p className="text-xs text-destructive bg-red-50 p-2 rounded">
                  Error: {restartLog.errorMessage}
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowConfirm(true)}
            disabled={!!isActive || restartMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isActive ? 'Restart in Progress...' : 'Restart Endpoint Workers'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Inference Workers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will briefly interrupt ALL adapter inference across ALL Work Bases
              (approximately 45–270 seconds of downtime).
              <br /><br />
              Worker restart costs approximately $0.50–$2.00 per cycle on RunPod.
              <br /><br />
              Use this if the adapter was deployed but workers haven't picked it up yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestart}>
              Restart Workers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## Phase 10: New Adapter Detail Page

**File to create:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import {
  useDeploymentLog,
  useAdapterPing,
} from '@/hooks/useAdapterDetail';
import { DeploymentTimeline } from '@/components/pipeline/DeploymentTimeline';
import { AdapterStatusPing } from '@/components/pipeline/AdapterStatusPing';
import { EndpointRestartTool } from '@/components/pipeline/EndpointRestartTool';

export default function AdapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const adapterId = `adapter-${jobId.substring(0, 8)}`;

  // Data fetching
  const { data: jobData, isLoading: isJobLoading } = usePipelineJob(jobId);
  const job = jobData?.data || null;

  const { data: deploymentLog, isLoading: isDeploymentLoading } = useDeploymentLog(jobId);

  const {
    data: pingData,
    isFetching: isPinging,
    refetch: triggerPing,
  } = useAdapterPing(jobId);

  // Loading state
  if (isJobLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Adapter not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isActive = (job as any).workbaseId
    ? (job as any).hfAdapterPath !== null
    : false;

  const adapterStatusLabel = (job as any).adapterStatus === 'superseded'
    ? 'Superseded'
    : (job as any).adapterStatus === 'deleted'
      ? 'Deleted'
      : 'Active';

  const adapterStatusVariant =
    (job as any).adapterStatus === 'active' ? 'default' as const
    : 'secondary' as const;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/launch`)}
          className="hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Launch Tuning
        </button>
        <span>›</span>
        <span className="text-foreground font-medium">{job.jobName || adapterId}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground">
            {job.jobName || 'Adapter Details'}
          </h1>
          <Badge variant={adapterStatusVariant}>{adapterStatusLabel}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-sm font-mono text-muted-foreground">{adapterId}</code>
          {(job as any).hfAdapterPath && (
            <a
              href={`https://huggingface.co/${(job as any).hfAdapterPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-duck-blue hover:underline"
            >
              View on HuggingFace →
            </a>
          )}
        </div>
      </div>

      {/* Main grid — Deployment Report + Status + Restart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Deployment Timeline */}
        <DeploymentTimeline
          deploymentLog={deploymentLog || null}
          isLoading={isDeploymentLoading}
        />

        {/* Right: Status Ping + Restart */}
        <div className="space-y-6">
          <AdapterStatusPing
            jobId={jobId}
            adapterId={adapterId}
            pingData={pingData}
            isFetching={isPinging}
            onRefresh={() => triggerPing()}
          />

          <EndpointRestartTool
            jobId={jobId}
            adapterId={adapterId}
          />
        </div>
      </div>

      {/* Training Configuration */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Training Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sensitivity</p>
              <p className="font-medium text-foreground capitalize">{job.trainingSensitivity || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Progression</p>
              <p className="font-medium text-foreground capitalize">{job.trainingProgression || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Repetition</p>
              <p className="font-medium text-foreground">{job.trainingRepetition ? `${job.trainingRepetition} epochs` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cost</p>
              <p className="font-medium text-foreground">
                {job.estimatedCost ? `$${job.estimatedCost.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
          {job.trainingTimeSeconds && (
            <p className="text-xs text-muted-foreground mt-3">
              Training duration: {Math.floor(job.trainingTimeSeconds / 60)}m {job.trainingTimeSeconds % 60}s
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Lifecycle Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This adapter is{' '}
            <span className="text-foreground font-medium">{adapterStatusLabel.toLowerCase()}</span>{' '}
            for this Work Base.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm(`Remove ${adapterId} from RunPod LORA_MODULES? Workers will need to restart to unload it.`)) return;
                const res = await fetch(`/api/pipeline/adapters/${jobId}/remove`, { method: 'POST' });
                const json = await res.json();
                if (json.success) {
                  alert(json.data.message);
                } else {
                  alert(json.error);
                }
              }}
            >
              Remove from RunPod
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Removing an adapter from RunPod does not delete it from HuggingFace.
            Workers will need to restart before the adapter is fully unloaded.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Phase 11: Modify `launch/page.tsx` — Link Adapter History Entries

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

Read this file before editing. The Adapter History section is at lines 371–408. Make the following two targeted changes:

### Change 11a: Make adapter history entries clickable

**Current code (lines 386–408):**
```typescript
                  <div className="space-y-2">
                    {recentJobs.map((job: any) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div>
                          <span className="text-sm text-foreground font-medium">
                            {job.jobName || job.id.slice(0, 8)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(job.createdAt).toLocaleDateString()} · 
                            {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
                          </p>
                        </div>
                        <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-muted text-muted-foreground'}>
                          {JOB_STATUS_LABELS[job.status]?.label || job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
```

**Replace with:**
```typescript
                  <div className="space-y-2">
                    {recentJobs.map((job: any) => {
                      const isCompleted = job.status === 'completed';
                      return (
                        <div
                          key={job.id}
                          className={`flex items-center justify-between p-3 bg-muted rounded-md transition-colors ${
                            isCompleted ? 'cursor-pointer hover:bg-muted/80' : ''
                          }`}
                          onClick={() => {
                            if (isCompleted) {
                              router.push(`/workbase/${workbaseId}/fine-tuning/launch/adapter/${job.id}`);
                            }
                          }}
                        >
                          <div>
                            <span className="text-sm text-foreground font-medium">
                              {job.jobName || job.id.slice(0, 8)}
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(job.createdAt).toLocaleDateString()} · 
                              {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
                              {isCompleted && (
                                <span className="ml-1 text-duck-blue">· View details →</span>
                              )}
                            </p>
                          </div>
                          <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-muted text-muted-foreground'}>
                            {JOB_STATUS_LABELS[job.status]?.label || job.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
```

---

## Implementation Sequence

Execute in this exact order:

1. **Run SAOL migrations** (Phase 1) — add `deployment_log`, `adapter_status` columns and create `endpoint_restart_log` table
2. **Create `src/types/adapter-detail.ts`** (Phase 2) — type definitions used by all other phases
3. **Modify `src/inngest/functions/auto-deploy-adapter.ts`** (Phase 3) — changes 3a through 3i
4. **Modify `src/inngest/functions/refresh-inference-workers.ts`** (Phase 4) — changes 4a through 4g
5. **Create `src/inngest/functions/restart-inference-workers.ts`** (Phase 5)
6. **Update `src/inngest/functions/index.ts`** (Phase 6) — register new function
7. **Create API routes** (Phase 7) — routes 7.1 through 7.5
8. **Create `src/hooks/useAdapterDetail.ts`** (Phase 8)
9. **Create components** (Phase 9) — DeploymentTimeline, AdapterStatusPing, EndpointRestartTool
10. **Create Adapter Detail Page** (Phase 10)
11. **Modify `launch/page.tsx`** (Phase 11)
12. **Run TypeScript validation:** `cd src && npx tsc --noEmit` — resolve all type errors

---

## Acceptance Criteria

### Adapter History Click-Through
1. Navigate to `/workbase/[id]/fine-tuning/launch`
2. In the Adapter History section, find a job with status "Completed"
3. **Expected:** The entry is visually clickable (cursor-pointer, hover:bg-muted/80) with "· View details →" text
4. Click the entry
5. **Expected:** Navigates to `/workbase/[id]/fine-tuning/launch/adapter/{jobId}`

### Deployment Report (New Deployments)
1. Trigger a new training job that completes and deploys
2. Open the Adapter Detail Page for that job
3. **Expected:** DeploymentTimeline shows ✓ for HF Upload, ✓ for RunPod Updated, ✓ for Workers Cycled, ✓ for Inference Verified
4. HuggingFace link is present and correct

### Deployment Report (Historical Deployments)
1. Open the Adapter Detail Page for a job deployed BEFORE this spec was implemented
2. **Expected:** "No deployment data available" message shown (graceful null handling)

### Adapter Status Ping
1. On the Adapter Detail Page, click "Refresh Status"
2. **Expected:** Button shows "Checking..." with spinner, then displays results within 30s
3. **Expected:** Three status rows: Registered in LORA_MODULES, Workers online, Inference verified
4. If adapter is active: all three rows show ✓

### Manual Worker Restart
1. Click "Restart Endpoint Workers"
2. **Expected:** Confirmation dialog appears with cross-workbase warning
3. Confirm restart
4. **Expected:** Toast "Restart initiated. This will take 1–4 minutes."
5. **Expected:** EndpointRestartTool shows step-by-step progress with spinner
6. After completion: **Expected:** Verdict card shows ✅ "Adapter is active and verified" (if adapter is in LORA_MODULES and inference succeeds)

### Adapter Lifecycle — Old Adapter Cleanup on New Deploy
1. Deploy a second training job for a workbase that already has a deployed adapter
2. After deployment completes:
   - **Expected:** Old adapter's `pipeline_training_jobs.adapter_status` = `'superseded'`
   - **Expected:** Old adapter's `pipeline_inference_endpoints.status` = `'terminated'`
   - **Expected:** RunPod LORA_MODULES no longer contains the old adapter's name
   - **Expected:** Old adapter's HuggingFace repo is deleted (or marked `deleted` in DB)

### Edge Case — No Restart History
1. Open Adapter Detail Page for a newly deployed adapter with no restart history
2. **Expected:** EndpointRestartTool shows "No restart history for this adapter" message

### Edge Case — Concurrent Restart Prevention
1. While a restart is in progress, click "Restart Endpoint Workers" again
2. **Expected:** API returns 409; toast shows "A restart is already in progress"

---

## Warnings

### Do NOT reference SAOL in application code
SAOL is a CLI tool for running DB migrations locally. All application code (API routes, Inngest functions, hooks) MUST use `createServerSupabaseAdminClient()` from `@/lib/supabase-server`.

### Read `auto-deploy-adapter.ts` before editing — it's 691 lines
The changes in Phase 3 are surgical. Do not rewrite the file. Identify the exact sections by step name (Step 1, Step 2+3, etc.) and apply changes in-place.

### The `refreshInferenceWorkers` changes are additive — preserve all existing logic
Phase 4 adds DB writes at each step without changing the core worker-cycling logic. The function must continue to work exactly as before for production adapter deployments.

### RunPod `saveEndpoint` is a full PUT — always fetch ALL fields first
Every RunPod mutation must first fetch the complete endpoint object, modify only the target fields, then save ALL fields back. Never construct a partial `saveEndpoint` input — this resets unspecified fields to null. This pattern is already established in the existing code; preserve it.

### RunPod GraphQL uses query param auth — NOT Bearer header
All RunPod GraphQL calls: `?api_key=${RUNPOD_GRAPHQL_API_KEY}`. The Bearer header is used for RunPod inference API calls only (`Authorization: Bearer ${RUNPOD_API_KEY}`). Do not mix these.

### The inference ping is user-triggered only — never auto-poll
`useAdapterPing` has `enabled: false` by default. Never change this. Each ping runs a live GPU inference job ($0.01–0.02). Auto-polling would be costly.

### The manual restart affects ALL workbases
The warning in the confirmation dialog is non-negotiable. Worker cycling takes the shared inference endpoint offline for all workbases. The dialog text must convey this clearly.

### No routing conflict with existing `[jobId]` segment
The new `src/app/api/pipeline/adapters/[jobId]/` directory coexists with the existing flat routes (`status/`, `test/`, `deploy/`, `rate/`). In Next.js, static segments take precedence over dynamic segments. Existing routes are unaffected.

### `deleteRepo` requires `@huggingface/hub` version that exports it
The existing code imports `uploadFiles` and `createRepo` from `@huggingface/hub`. Verify `deleteRepo` is available in the installed version before using it. If unavailable, skip the HF deletion step and log a warning.

### Inngest step outputs are cached — do not put sensitive data in step returns
Step return values are stored by Inngest for replay. The `deployment_log` assembled in `auto-deploy-adapter.ts` step 7 is only written to the DB, not returned as the step output. Do not return the full deployment_log from the step.

### Historical deployments have `deployment_log = null`
All jobs deployed before this spec was implemented will have `deployment_log = null`. The DeploymentTimeline component handles this with a "No deployment data available" message. Do not attempt a backfill.
