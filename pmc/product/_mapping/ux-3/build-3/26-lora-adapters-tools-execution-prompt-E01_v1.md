# Spec 26: LoRA Adapter Detail Page — E01: Foundation
## Database Migrations + TypeScript Types

**Version:** 1.0
**Date:** 2026-03-03
**Prompt:** E01 of 5
**Prerequisites:** None — this is the foundation prompt
**Next:** E02 — Backend Inngest Layer

---

## What This Prompt Builds

This prompt establishes the complete foundation for Spec 26 implementation:

1. **Three database schema migrations** (run via SAOL CLI) — adds two columns to `pipeline_training_jobs` and creates a new `endpoint_restart_log` table
2. **TypeScript types file** — `src/types/adapter-detail.ts` — defines all types used by every subsequent prompt (E02–E05)

**E02–E05 depend on the artifacts created here.** Do not proceed to E02 until all migrations are verified and the types file is created.

---

## Platform Context

**Project:** Bright Run LoRA Training Data Platform
**Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Inngest, RunPod (vLLM), shadcn/UI + Tailwind
**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**Key DB Tables involved in this spec:**
- `pipeline_training_jobs` — training jobs; receives 2 new columns
- `pipeline_inference_endpoints` — endpoint records per job
- `workbases` — workbase records; `endpoint_restart_log` references this
- `endpoint_restart_log` — NEW table created in this prompt

**DB constraint:** All schema changes MUST use SAOL CLI. Application code uses `createServerSupabaseAdminClient()`. Never mix the two.

---

## Critical Rules

1. **SAOL for schema only.** Run SAOL commands from `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\` directory.
2. **Always dry-run first.** Every SAOL DDL must be run with `dryRun: true` then `dryRun: false`.
3. **Verify after each migration** using `agentIntrospectSchema` before proceeding.
4. **Do NOT reference SAOL in any application code** — it is a CLI-only tool.
5. **Read each file before editing it.**

---

========================

## EXECUTION PROMPT E01

You are implementing the database foundation and TypeScript types for **Spec 26: LoRA Adapter Detail Page — Deployment Verification, Lifecycle Management & Status Tooling** in the Bright Run LoRA Training Data Platform.

**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`
**Task file output:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\adapter-detail.ts`

### Step 0: Verify Existing State

Before running any migrations, verify the current schema state using SAOL. Run these commands from `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`:

**Check existing columns on `pipeline_training_jobs`:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const r = await saol.agentIntrospectSchema({ table: 'pipeline_training_jobs' });
  console.log(JSON.stringify(r.data, null, 2));
})();
"
```

**Check if `endpoint_restart_log` already exists:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  try {
    const r = await saol.agentIntrospectSchema({ table: 'endpoint_restart_log' });
    console.log('Table exists:', JSON.stringify(r.data, null, 2));
  } catch(e) {
    console.log('Table does not exist yet (expected):', e.message);
  }
})();
"
```

Only run the migrations for objects that do not yet exist. If `deployment_log` column already exists on `pipeline_training_jobs`, skip Migration 1. Same for `adapter_status` and Migration 2. If `endpoint_restart_log` table exists, skip Migration 3.

---

### Step 1: Migration 1 — Add `deployment_log` Column

**Purpose:** Stores a JSONB deployment report on each training job after successful auto-deployment. Written by `autoDeployAdapter` and updated by `refreshInferenceWorkers`.

Run dry-run first, then apply:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const sql = \`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS deployment_log JSONB DEFAULT NULL;\`;

  // Dry run first
  const dry = await saol.agentExecuteDDL({ sql, dryRun: true, transaction: true, transport: 'pg' });
  console.log('DRY RUN:', dry.success ? 'PASS' : 'FAIL', dry);

  if (dry.success) {
    const result = await saol.agentExecuteDDL({ sql, dryRun: false, transaction: true, transport: 'pg' });
    console.log('APPLY:', result.success ? 'SUCCESS' : 'FAILED', result);
  }
})();
"
```

**Verify:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const r = await saol.agentQuery({ table: 'pipeline_training_jobs', limit: 1, select: 'id, deployment_log' });
  console.log('Verify deployment_log column:', JSON.stringify(r, null, 2));
})();
"
```

Expected: query succeeds (returns a row or empty array with no error). If it throws "column deployment_log does not exist", the migration failed — do not proceed.

---

### Step 2: Migration 2 — Add `adapter_status` Column

**Purpose:** Tracks lifecycle state of a deployed adapter: `active` (currently serving), `superseded` (replaced by a newer deploy on the same workbase), `deleted` (HF repo removed).

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const sql = \`ALTER TABLE pipeline_training_jobs
ADD COLUMN IF NOT EXISTS adapter_status TEXT DEFAULT 'active'
  CHECK (adapter_status IN ('active', 'superseded', 'deleted'));\`;

  const dry = await saol.agentExecuteDDL({ sql, dryRun: true, transaction: true, transport: 'pg' });
  console.log('DRY RUN:', dry.success ? 'PASS' : 'FAIL', dry);

  if (dry.success) {
    const result = await saol.agentExecuteDDL({ sql, dryRun: false, transaction: true, transport: 'pg' });
    console.log('APPLY:', result.success ? 'SUCCESS' : 'FAILED', result);
  }
})();
"
```

**Verify:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const r = await saol.agentQuery({ table: 'pipeline_training_jobs', limit: 1, select: 'id, adapter_status' });
  console.log('Verify adapter_status column:', JSON.stringify(r, null, 2));
})();
"
```

---

### Step 3: Migration 3 — Create `endpoint_restart_log` Table

**Purpose:** Tracks every worker restart event (both automatic post-deploy and manual user-triggered) with full per-step timestamps and outcomes.

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const sql = \`
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
);\`;

  const dry = await saol.agentExecuteDDL({ sql, dryRun: true, transaction: true, transport: 'pg' });
  console.log('DRY RUN:', dry.success ? 'PASS' : 'FAIL', dry);

  if (dry.success) {
    const result = await saol.agentExecuteDDL({ sql, dryRun: false, transaction: true, transport: 'pg' });
    console.log('APPLY:', result.success ? 'SUCCESS' : 'FAILED', result);
  }
})();
"
```

**Create indexes:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const sql = \`
CREATE INDEX IF NOT EXISTS idx_restart_log_workbase_latest
  ON endpoint_restart_log (workbase_id, initiated_at DESC);

CREATE INDEX IF NOT EXISTS idx_restart_log_job
  ON endpoint_restart_log (job_id);
\`;

  const dry = await saol.agentExecuteDDL({ sql, dryRun: true, transaction: true, transport: 'pg' });
  console.log('INDEXES DRY RUN:', dry.success ? 'PASS' : 'FAIL');

  if (dry.success) {
    const result = await saol.agentExecuteDDL({ sql, dryRun: false, transaction: true, transport: 'pg' });
    console.log('INDEXES APPLY:', result.success ? 'SUCCESS' : 'FAILED');
  }
})();
"
```

**Verify the full table structure:**
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const r = await saol.agentIntrospectSchema({ table: 'endpoint_restart_log' });
  console.log('endpoint_restart_log schema:', JSON.stringify(r.data, null, 2));
})();
"
```

Expected: 28+ columns including `id`, `workbase_id`, `job_id`, `adapter_name`, `runpod_endpoint_id`, `trigger_source`, `status`, all timestamp columns, all boolean columns, JSONB columns, `error_message`, `error_step`, `user_id`.

---

### Step 4: Create `src/types/adapter-detail.ts`

Read the existing type files first to understand patterns:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\pipeline.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\pipeline-adapter.ts`

Then create the following file exactly as specified:

**File to create:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\adapter-detail.ts`

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

export function mapDbRowToRestartLog(row: Record<string, unknown>): EndpointRestartLog {
  return {
    id: row.id as string,
    workbaseId: row.workbase_id as string,
    jobId: row.job_id as string,
    adapterName: row.adapter_name as string,
    runpodEndpointId: row.runpod_endpoint_id as string,
    triggerSource: row.trigger_source as RestartTrigger,
    status: row.status as RestartStatus,
    initiatedAt: row.initiated_at as string,
    scaleDownAt: row.scale_down_at as string | null,
    workerTerminatedAt: row.workers_terminated_at as string | null,
    scaleUpAt: row.scale_up_at as string | null,
    workersReadyAt: row.workers_ready_at as string | null,
    verificationAt: row.verification_at as string | null,
    completedAt: row.completed_at as string | null,
    totalDurationMs: row.total_duration_ms as number | null,
    scaleDownSuccess: row.scale_down_success as boolean | null,
    scaleUpSuccess: row.scale_up_success as boolean | null,
    adapterVerified: row.adapter_verified as boolean | null,
    adapterInLoraModules: row.adapter_in_lora_modules as boolean | null,
    loraModulesSnapshot: row.lora_modules_snapshot as Array<{ name: string; path: string }> | null,
    workerStateAfter: row.worker_state_after as EndpointRestartLog['workerStateAfter'],
    errorMessage: row.error_message as string | null,
    errorStep: row.error_step as string | null,
  };
}
```

---

### Step 5: TypeScript Validation

After creating the types file, run:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | head -50
```

Expected: No errors in `src/types/adapter-detail.ts`. Any errors in other files that pre-existed are acceptable — do not fix pre-existing errors unless they are in the new file.

---

### Step 6: Record Completion State

Before finishing E01, verify the following are all true:

- [ ] `pipeline_training_jobs.deployment_log` column exists (JSONB, nullable)
- [ ] `pipeline_training_jobs.adapter_status` column exists (TEXT, default 'active', CHECK constraint)
- [ ] `endpoint_restart_log` table exists with all 28 columns
- [ ] `idx_restart_log_workbase_latest` index exists
- [ ] `idx_restart_log_job` index exists
- [ ] `src/types/adapter-detail.ts` created with no TypeScript errors

**Artifacts produced by E01 (used by E02–E05):**
- DB column: `pipeline_training_jobs.deployment_log` (JSONB)
- DB column: `pipeline_training_jobs.adapter_status` (TEXT)
- DB table: `endpoint_restart_log`
- Type file: `src/types/adapter-detail.ts` — exports `DeploymentLog`, `EndpointRestartLog`, `AdapterPingResult`, `RestartVerdict`, `getRestartVerdict()`, `mapDbRowToRestartLog()`

+++++++++++++++++



---

## Reference: New DB Schema Summary

### `pipeline_training_jobs` additions

| Column | Type | Default | Constraint |
|--------|------|---------|-----------|
| `deployment_log` | JSONB | NULL | nullable |
| `adapter_status` | TEXT | 'active' | CHECK IN ('active', 'superseded', 'deleted') |

### `endpoint_restart_log` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | gen_random_uuid() |
| `workbase_id` | UUID FK | → workbases(id) |
| `job_id` | UUID FK | → pipeline_training_jobs(id) |
| `adapter_name` | TEXT | e.g. "adapter-e8fa481f" |
| `runpod_endpoint_id` | TEXT | shared endpoint ID |
| `trigger_source` | TEXT | 'auto' or 'manual' |
| `status` | TEXT | 8-value enum |
| `initiated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `scale_down_at` | TIMESTAMPTZ | nullable |
| `workers_terminated_at` | TIMESTAMPTZ | nullable |
| `scale_up_at` | TIMESTAMPTZ | nullable |
| `workers_ready_at` | TIMESTAMPTZ | nullable |
| `verification_at` | TIMESTAMPTZ | nullable |
| `completed_at` | TIMESTAMPTZ | nullable |
| `total_duration_ms` | INTEGER | nullable |
| `scale_down_success` | BOOLEAN | nullable |
| `scale_up_success` | BOOLEAN | nullable |
| `adapter_verified` | BOOLEAN | nullable |
| `adapter_in_lora_modules` | BOOLEAN | nullable |
| `lora_modules_snapshot` | JSONB | nullable |
| `worker_state_after` | JSONB | nullable |
| `error_message` | TEXT | nullable |
| `error_step` | TEXT | nullable |
| `error_details` | JSONB | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `user_id` | UUID FK | → auth.users(id), nullable |
