# 25 — LoRA Adapters: Deployment Verification, Lifecycle Management & Status Tooling

## Discovery Document v1

**Date:** 2026-03-03  
**Scope:** Issues A, B, C from investigation prompt — adapter deployment confirmation, subsequent run behavior, and adapter status ping tool  
**Output:** Technical specifications for a new **Adapter Detail Page** linked from each Adapter History entry on `/workbase/[id]/fine-tuning/launch`

---

## Table of Contents

1. [Full Pipeline Trace](#1-full-pipeline-trace)
2. [Issue A — Deployment Report](#2-issue-a--deployment-report)
3. [Issue B — Subsequent LoRA Run Behavior](#3-issue-b--subsequent-lora-run-behavior)
4. [Issue C — Adapter Status Ping Tool](#4-issue-c--adapter-status-ping-tool)
5. [Unified Solution: Adapter Detail Page](#5-unified-solution-adapter-detail-page)
6. [Barrier Analysis](#6-barrier-analysis)

---

## 1. Full Pipeline Trace

### 1.1 Trigger Chain

```
pipeline_training_jobs UPDATE (status → 'completed', adapter_file_path set)
  → Supabase Database Webhook
    → POST /api/webhooks/training-complete
      → Inngest event: 'pipeline/adapter.ready'
        → autoDeployAdapter (7 steps)
          → Inngest event: 'pipeline/adapter.deployed'
            → refreshInferenceWorkers (6 steps)
```

### 1.2 autoDeployAdapter — Step-by-Step

| Step | Name | What It Does | Data Stored |
|------|------|-------------|-------------|
| 1 | `fetch-job` | Reads `pipeline_training_jobs` row; validates `status='completed'`, `adapter_file_path` exists; idempotency guard via `hf_adapter_path` | None |
| 2+3 | `download-and-push-to-huggingface` | Downloads tar.gz from Supabase Storage, extracts in memory, creates HF repo `BrightHub2/lora-emotional-intelligence-{jobId[:8]}`, uploads all files via `@huggingface/hub` | Returns `{ hfPath, uploadedFiles }` |
| 4 | `update-runpod-lora-modules` | Fetches RunPod endpoint via GraphQL, parses existing `LORA_MODULES` JSON array, **appends** new `{ name: "adapter-{jobId[:8]}", path: hfPath }`, saves via `saveEndpoint` mutation | Returns `{ loraModules, noChange, originalWorkersMin, originalWorkersMax }` |
| 4b | `emit-worker-refresh` | Emits `pipeline/adapter.deployed` event to trigger worker refresh | None (event only) |
| 5 | `vllm-hot-reload` | Attempts `POST /v1/load_lora_adapter` on `INFERENCE_API_URL` — **non-fatal**, expected to fail on serverless | None |
| 6 | `update-inference-endpoints-db` | Creates/updates `pipeline_inference_endpoints` rows for `control` and `adapted` endpoint types, status=`deploying` | DB rows in `pipeline_inference_endpoints` |
| 7 | `update-job-hf-path` | Writes `hf_adapter_path` and `updated_at` to `pipeline_training_jobs` — **idempotency signal** | `hf_adapter_path` column |
| 7b | `update-workbase-active-adapter` | Sets `workbases.active_adapter_job_id = jobId` — **overwrites** any previous value | `active_adapter_job_id` column |

### 1.3 refreshInferenceWorkers — Step-by-Step

| Step | Name | What It Does | Duration |
|------|------|-------------|----------|
| 1 | `scale-down-workers` | Sets `workersMin=0` via GraphQL `saveEndpoint` | Instant |
| 2 | `wait-for-workers-terminated` | Polls `INFERENCE_API_URL/health` every 5s until all workers = 0 | Up to 90s timeout |
| 3 | `scale-up-workers` | Restores `workersMin/workersMax` to original values, ensures `MAX_LORAS=5` env var | Instant |
| 4 | `wait-for-workers-ready` | Polls `/health` every 5s until `ready > 0` or `idle > 0` | Up to 180s timeout |
| 5 | `verify-adapter-available` | Sends test inference via `POST INFERENCE_API_URL/runsync` with `model: adapterName` | Non-fatal |
| 6 | `mark-endpoints-ready` | Updates `pipeline_inference_endpoints` rows to `status='ready'`, sets `ready_at` | Instant |

### 1.4 Key Source Files

| File | Purpose |
|------|---------|
| [auto-deploy-adapter.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/inngest/functions/auto-deploy-adapter.ts) | Main deployment Inngest function (691 lines) |
| [refresh-inference-workers.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/inngest/functions/refresh-inference-workers.ts) | Worker cycling Inngest function (273 lines) |
| [training-complete/route.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/api/webhooks/training-complete/route.ts) | Supabase webhook → Inngest event bridge |
| [inference-service.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/lib/services/inference-service.ts) | Deploy adapter endpoints service + inference routing |
| [launch/page.tsx](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx) | Launch page with Adapter History section (L371-408) |
| [pipeline-adapter.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/types/pipeline-adapter.ts) | TypeScript types for endpoints, test results, evaluations |
| [adapter-db-utils.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/lib/pipeline/adapter-db-utils.ts) | DB row ↔ TypeScript mappers |
| [useAdapterTesting.ts](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/hooks/useAdapterTesting.ts) | React Query hooks for adapter deployment and testing |

### 1.5 Key Database Tables

| Table | Key Columns for This Investigation |
|-------|-----------------------------------|
| `pipeline_training_jobs` | `id`, `workbase_id`, `status`, `adapter_file_path` (Supabase Storage path), `hf_adapter_path` (HuggingFace path, set after deploy), `job_name`, `created_at` |
| `pipeline_inference_endpoints` | `id`, `job_id`, `endpoint_type` ('control'/'adapted'), `status` ('pending'/'deploying'/'ready'/'failed'/'terminated'), `adapter_path`, `ready_at`, `error_message` |
| `workbases` | `id`, `active_adapter_job_id` (FK to `pipeline_training_jobs.id`, only one active per workbase) |

---

## 2. Issue A — Deployment Report

### 2.1 Core Question

> How do I know if the adapter is successfully pushed to the inference RunPod?

### 2.2 Data Verification

**What IS currently stored after deployment:**

| Data Point | Location | How Set |
|------------|----------|---------|
| `hf_adapter_path` | `pipeline_training_jobs.hf_adapter_path` | Step 7 of `autoDeployAdapter` — e.g. `BrightHub2/lora-emotional-intelligence-e8fa481f` |
| Endpoint status | `pipeline_inference_endpoints.status` | Step 6 sets `deploying`; `refreshInferenceWorkers` Step 6 sets `ready` |
| Endpoint `ready_at` | `pipeline_inference_endpoints.ready_at` | Set by `refreshInferenceWorkers` Step 6 |
| `active_adapter_job_id` | `workbases.active_adapter_job_id` | Step 7b overwrites to current jobId |
| Adapter verification | `refreshInferenceWorkers` Step 5 return value | **NOT stored in DB** — only returned as Inngest step output |

**What is NOT currently stored (gaps):**

| Missing Data Point | Available At | Why Not Stored |
|--------------------|-------------|---------------|
| RunPod GraphQL `saveEndpoint` response | Step 4 of `autoDeployAdapter` — `saveData` variable | Only logged to console, response parsed for errors but not persisted |
| HuggingFace commit OID | Step 2+3 — `commitResult?.commit?.oid` | Logged via `console.log`, not written to DB |
| Worker refresh timing | `refreshInferenceWorkers` Steps 2/4 return `waitedMs` | Returned as Inngest step output only |
| Adapter verification result | `refreshInferenceWorkers` Step 5 — `verified: true/false` | Returned as Inngest step output only |
| Full LORA_MODULES list after update | Step 4 — `loraModules` array | Returned as step output, not persisted |

### 2.3 Technical Specification: Deployment Report

**Goal:** For each Adapter History entry, show a deployment report with:
1. Adapter ID (e.g. `adapter-e8fa481f`)
2. HuggingFace path and commit info
3. RunPod response (success/failure of `saveEndpoint`)
4. Worker refresh outcome
5. Adapter verification result

**Implementation Approach:**

#### A. New Database Column — `deployment_log` (JSONB)

Add a `deployment_log` JSONB column to `pipeline_training_jobs`:

```sql
ALTER TABLE pipeline_training_jobs
ADD COLUMN deployment_log JSONB DEFAULT NULL;
```

**Schema for `deployment_log`:**

```typescript
interface DeploymentLog {
  adapter_name: string;           // "adapter-e8fa481f"
  hf_path: string;                // "BrightHub2/lora-emotional-intelligence-e8fa481f"
  hf_commit_oid: string | null;   // Git commit OID from HuggingFace
  hf_files_uploaded: string[];    // ["adapter_model.safetensors", "adapter_config.json", ...]
  
  runpod_endpoint_id: string;     // "780tauhj7c126b"
  runpod_save_success: boolean;   // true if saveEndpoint returned no errors
  runpod_lora_modules_after: Array<{ name: string; path: string }>;  // Full list after update
  
  worker_refresh: {
    scale_down_at: string;          // ISO timestamp
    workers_terminated_at: string;  // ISO timestamp
    scale_up_at: string;            // ISO timestamp
    workers_ready_at: string;       // ISO timestamp
    verification_result: 'verified' | 'unverified' | 'skipped';
    verification_error: string | null;
  } | null;  // null if refresh hasn't run yet
  
  deployed_at: string;             // ISO timestamp of final completion
  total_duration_ms: number;       // Total time from Step 1 to Step 7b
}
```

#### B. Code Changes to Persist Deployment Log

**File:** `src/inngest/functions/auto-deploy-adapter.ts`

1. After Step 2+3 (`download-and-push-to-huggingface`): Capture `commitResult.commit.oid` and return it alongside `hfPath` and `uploadedFiles`.

2. After Step 4 (`update-runpod-lora-modules`): Capture the full `loraModules` array and `saveData` success status. Include in return value.

3. After Step 7 (`update-job-hf-path`): In the same DB update, also write the assembled `deployment_log` JSON.

**File:** `src/inngest/functions/refresh-inference-workers.ts`

4. After Step 6 (`mark-endpoints-ready`): Write the worker refresh timing data back to `pipeline_training_jobs.deployment_log` via a DB update (append to existing JSONB object).

#### C. API Route for Reading Deployment Log

**New route:** `GET /api/pipeline/jobs/[jobId]/deployment-log`

```typescript
// Returns deployment_log JSONB from pipeline_training_jobs
// Auth: user must own the job
// Response: { success: boolean, data: DeploymentLog | null }
```

#### D. Frontend Display

On the new Adapter Detail Page (see [Section 5](#5-unified-solution-adapter-detail-page)):
- **Deployment Timeline:** Visual step-by-step with ✓/✗ for each phase (HF upload, RunPod update, worker refresh, verification)
- **Adapter ID badge:** Copy-to-clipboard `adapter-{jobId[:8]}`
- **HuggingFace link:** External link to `https://huggingface.co/{hf_path}`
- **LORA_MODULES snapshot:** Expandable JSON showing all adapters on the endpoint after this deployment

### 2.4 Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **Inngest step output limits** — the deployment_log JSON must be assembled across multiple steps and final-written; Inngest step outputs can't be modified retroactively | Medium | Accumulate log data in step return values, assemble final object before Step 7 DB write |
| **Worker refresh is a separate Inngest function** — `refreshInferenceWorkers` runs asynchronously after `autoDeployAdapter` completes; it doesn't have access to the deployment_log being assembled | Medium | Worker refresh function must independently update `pipeline_training_jobs.deployment_log` using a JSONB merge (e.g. `jsonb_set`) after its steps complete |
| **Retroactive data for past deployments** — existing deployed adapters have no `deployment_log` | Low | Accept null for historical records; only new deployments populate this field. Optionally, run a one-time backfill script querying Inngest step outputs via API |
| **Console logs are ephemeral** — current HF commit OID and RunPod responses are only in Vercel/Inngest console logs, not queryable | Low | The code changes capture this data going forward; past data is in Vercel/Inngest logs if needed |

---

## 3. Issue B — Subsequent LoRA Run Behavior

### 3.1 Core Questions

> i. Since we can only have one active adapter per Workbase, is the old one replaced by a subsequent run?  
> ii. Do subsequent runs remove the old (now defunct) adapter by deleting it from RunPod?

### 3.2 Data Verification — Current Behavior

**Answer to (i): Partially — at the workbase level, yes. At the RunPod level, NO.**

The `workbases.active_adapter_job_id` column is simply **overwritten** by Step 7b of `autoDeployAdapter`:

```typescript
// auto-deploy-adapter.ts L659-667
await supabase
  .from('workbases')
  .update({
    active_adapter_job_id: jobId,        // ← overwrites old adapter
    updated_at: new Date().toISOString(),
  })
  .eq('id', job.workbase_id);
```

This means:
- The workbase "points to" the latest adapter for chat purposes ✓
- The old adapter's DB records (`pipeline_training_jobs`, `pipeline_inference_endpoints`) remain untouched
- The old adapter is **still registered in LORA_MODULES** on RunPod

**Answer to (ii): NO — old adapters are never removed from RunPod.**

The `update-runpod-lora-modules` step (L291-472) uses **additive-only** logic:

```typescript
// auto-deploy-adapter.ts L377-378
if (!loraModules.find((m) => m.name === adapterName)) {
  loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
}
```

There is **zero** logic to:
- Remove old adapters from the `LORA_MODULES` array
- Delete old adapter repos from HuggingFace
- Clean up old `pipeline_inference_endpoints` records
- Mark old adapters as `terminated` or `superseded`

### 3.3 Pipeline Trace — What Happens on a Second Run

```
Run #2: New training job → completed → webhook → autoDeployAdapter fires

Step 1: Fetches NEW job (different jobId). Old job is untouched.
Step 2+3: Uploads NEW adapter to a NEW HuggingFace repo (different name).
Step 4: Reads LORA_MODULES → finds old adapter still there → APPENDS new adapter.
        LORA_MODULES now has BOTH: [old-adapter, new-adapter]
Step 4b: Emits worker refresh for NEW adapter.
Step 5: Hot reload attempt (non-fatal).
Step 6: Creates NEW pipeline_inference_endpoints rows for new jobId.
        Old endpoint rows remain with status='ready'.
Step 7: Writes hf_adapter_path to NEW job.
Step 7b: Overwrites workbases.active_adapter_job_id → new jobId.
         Old jobId is now orphaned from the workbase.
```

### 3.4 Consequences of No Cleanup

| Issue | Impact | Risk Level |
|-------|--------|------------|
| **LORA_MODULES bloat** — Each run adds ~1 adapter entry. vLLM `MAX_LORAS=5` will cap loaded adapters at 5, but the env var list grows unbounded | Medium — Eventually RunPod env var size limits could be hit (~64KB for env vars). At 5+ adapters, vLLM may refuse to load all | Medium |
| **HuggingFace repo accumulation** — Old repos remain permanently under `BrightHub2/` org | Low — Storage costs are free for public models; can be cleaned up manually | Low |
| **Orphaned DB records** — Old `pipeline_inference_endpoints` rows with `status='ready'` for a jobId that is no longer active | Low — Not user-visible currently, but could confuse future queries | Low |
| **Worker cold-start time** — More adapters in `LORA_MODULES` = slightly longer vLLM startup | Low — Sub-second impact per adapter | Low |

### 3.5 Technical Specification: Adapter Lifecycle Management

**Goal:** When a new adapter deploys for a workbase, the system should:
1. Mark old adapter records as `superseded` in the DB
2. Remove old adapter from `LORA_MODULES` on RunPod
3. Optionally delete old HuggingFace repo (user-configurable)

#### A. New Column — `pipeline_training_jobs.adapter_status`

```sql
ALTER TABLE pipeline_training_jobs
ADD COLUMN adapter_status TEXT DEFAULT 'active'
CHECK (adapter_status IN ('active', 'superseded', 'deleted'));
```

#### B. Code Changes to autoDeployAdapter

**Add a new step between Step 7 and Step 7b:**

```
Step 7a: "supersede-old-adapters"
```

Logic:
1. Query `pipeline_training_jobs` for all jobs in the same `workbase_id` that have `hf_adapter_path IS NOT NULL` AND `id != currentJobId`
2. For each old job:
   a. Update `adapter_status = 'superseded'`
   b. Update corresponding `pipeline_inference_endpoints` rows to `status = 'terminated'`

#### C. Code Changes to update-runpod-lora-modules (Step 4)

Enhance Step 4 to support **removal of old adapters**:

1. After reading current `LORA_MODULES`, identify adapters that belong to the same workbase but different jobIds
2. Filter these out of the `loraModules` array before appending the new adapter
3. The resulting `LORA_MODULES` contains only: (a) adapters from other workbases, and (b) the new adapter for this workbase

This requires knowing which adapters belong to which workbase. Two approaches:

**Approach A (Recommended): Query DB for workbase's old adapters**
- In Step 4, before modifying `LORA_MODULES`, query `pipeline_training_jobs` for all completed jobs with the same `workbase_id`
- Extract their adapter names (`adapter-{jobId[:8]}`)
- Remove matching entries from `loraModules` array

**Approach B: Naming convention**
- If adapter naming includes workbase ID, we could filter by prefix. Current naming (`adapter-{jobId[:8]}`) does NOT include workbase ID, so this approach would require a naming change.

→ **Recommendation: Approach A** (no naming changes required)
**James' Response**: I agree with Approach A. We will build this functionality.

#### D. Optional: HuggingFace Cleanup

Add a non-fatal step to delete old HuggingFace repos:

```typescript
import { deleteRepo } from '@huggingface/hub';

// Step 7c: delete-old-hf-repos (non-fatal)
for (const oldJob of supersededJobs) {
  try {
    const oldRepoName = `${HF_REPO_PREFIX}-${oldJob.id.substring(0, 8)}`;
    await deleteRepo({ repo: { type: 'model', name: `${HF_ORG}/${oldRepoName}` }, credentials: { accessToken: HF_TOKEN } });
  } catch (err) {
    console.warn(`[AutoDeployAdapter] Failed to delete old HF repo (non-fatal):`, err);
  }
}
```
**James' Response**: I agree with the "HuggingFace Cleanup". We will build this functionality.
### 3.6 Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **Multi-workbase adapter management** — The current system uses a single shared RunPod endpoint for all workbases. Removing an adapter for Workbase A's old run must not affect Workbase B's active adapter | High | The DB query in Approach A scopes removal to the same `workbase_id`, ensuring cross-workbase safety |
| **Race conditions** — Two workbases could deploy simultaneously; the `concurrency: { limit: 1 }` on `autoDeployAdapter` prevents this but adds the adapter removal step to serialized processing | Medium | Already mitigated by existing concurrency limit |
| **vLLM adapter unloading** — Removing from `LORA_MODULES` requires a worker restart to take effect; the adapter remains loaded in GPU memory on running workers until they cycle | Low | Already handled by `refreshInferenceWorkers` which cycles workers after env changes |
| **`deleteRepo` irreversibility** — HuggingFace repo deletion is permanent. If a user wants to re-activate an old adapter, the HF repo is gone | Medium | Make HF cleanup optional (e.g. only trigger after 30 days, or require explicit user action). Default: keep HF repos, only remove from RunPod `LORA_MODULES` |
| **Adapters referenced by test results** — `pipeline_inference_endpoints` rows are linked to `pipeline_test_results` via `job_id`. Marking old endpoints as `terminated` doesn't delete test history, but the adapted endpoint can no longer be used for new tests | Low | Expected behavior — old test results are read-only historical data |

---

## 4. Issue C — Adapter Status Ping Tool

### 4.1 Core Questions

> i. Display the adapter ID  
> ii. Send a ping to RunPod to check if the adapter is active on the inference endpoint

### 4.2 Data Verification — What's Available

**Adapter ID derivation:**
- From `pipeline_training_jobs.id`: `adapter-{jobId.substring(0, 8)}`
- This is deterministic and always available for any completed job
- Example: jobId `e8fa481f-...` → adapter name `adapter-e8fa481f`

**RunPod status check — Two verification methods available:**

| Method | Endpoint | What It Checks | Auth |
|--------|----------|---------------|------|
| **GraphQL query** | `https://api.runpod.io/graphql?api_key={key}` | Reads `env` vars from endpoint, parses `LORA_MODULES` JSON to check if adapter name exists | RunPod API key (query param) |
| **Inference ping** | `POST {INFERENCE_API_URL}/runsync` | Sends a 5-token inference request with `model: adapter-{jobId[:8]}` and checks for `COMPLETED` status | RunPod API key (Bearer header) |

**Method 1 (GraphQL) checks:** "Is this adapter registered in the endpoint configuration?"  
**Method 2 (Inference ping) checks:** "Can a live worker actually serve responses using this adapter?"

Both are needed for a complete picture — an adapter can be in `LORA_MODULES` but not loaded (workers haven't cycled), or loaded but not in `LORA_MODULES` (manual removal).

### 4.3 Technical Specification: Adapter Status Ping Tool

#### A. New API Route — `GET /api/pipeline/adapters/[jobId]/ping`

```typescript
interface AdapterPingResponse {
  success: boolean;
  data?: {
    adapterId: string;              // "adapter-e8fa481f"
    hfPath: string | null;          // "BrightHub2/lora-emotional-intelligence-e8fa481f"
    
    // Check 1: Is the adapter in LORA_MODULES config?
    registeredInLoraModules: boolean;
    loraModulesSnapshot: Array<{ name: string; path: string }>;  // Full current list
    
    // Check 2: Can workers serve inference with this adapter?
    inferenceAvailable: boolean;
    inferenceLatencyMs: number | null;
    inferenceError: string | null;
    
    // Check 3: Worker health
    workerStatus: {
      ready: number;
      idle: number;
      running: number;
      initializing: number;
    };
    
    // Endpoint status from DB
    endpointDbStatus: 'pending' | 'deploying' | 'ready' | 'failed' | 'terminated' | null;
    
    checkedAt: string;  // ISO timestamp
  };
  error?: string;
}
```

#### B. Implementation Logic

```
1. Read pipeline_training_jobs row for jobId
   → Derive adapterName = "adapter-{jobId[:8]}"
   → Get hf_adapter_path

2. Read pipeline_inference_endpoints for this jobId (endpoint_type='adapted')
   → Get DB status

3. GraphQL: Query RunPod endpoint env vars
   → Parse LORA_MODULES
   → Check if adapterName exists in list
   → Return full snapshot

4. Health check: GET {INFERENCE_API_URL}/health
   → Return worker counts

5. Inference ping: POST {INFERENCE_API_URL}/runsync
   → Send minimal request with model=adapterName
   → Measure latency
   → Check for COMPLETED status vs error
```

#### C. Frontend Component — `<AdapterStatusPing>`

Displays on the Adapter Detail Page:

```
┌─────────────────────────────────────────────┐
│ Adapter Status                              │
│                                             │
│ Adapter ID: adapter-e8fa481f [📋 Copy]      │
│                                             │
│ ✅ Registered in LORA_MODULES               │
│ ✅ Workers online (1 ready, 0 idle)         │
│ ✅ Inference verified (latency: 1,240ms)    │
│                                             │
│ Last checked: Mar 3, 2026 1:15 PM           │
│                                             │
│ [🔄 Refresh Status]                         │
└─────────────────────────────────────────────┘
```

States:
- **All green (✅✅✅):** Adapter is fully operational
- **Registered but inference fails (✅❌):** Workers may need cycling or adapter failed to load
- **Not registered (❌):** Adapter was removed from RunPod or deployment didn't complete
- **Workers offline (⚠️):** Endpoint is scaled to 0 — adapter can't serve until workers start

#### D. User-Triggered Ping (Not Auto-Polling)

The ping should be user-triggered (click "Refresh Status") rather than auto-polling because:
- The inference ping creates a billable RunPod job (~$0.01 per ping on serverless)
- GraphQL queries are rate-limited
- Auto-polling creates unnecessary load on RunPod's infrastructure

### 4.4 Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **Inference ping costs money** — Each ping runs a real GPU inference job ($0.01-0.02 per ping depending on GPU type and idle state) | Medium | User-triggered only (not auto-polling). Display last-checked timestamp. Optionally: use `max_tokens: 1` to minimize cost |
| **Cold-start latency** — If workers are scaled to 0, the inference ping will trigger a cold-start (~30-60s on serverless), which the user may interpret as failure | High | Show a "Workers are starting up..." intermediate state. Add a timeout of 90s for the ping with clear messaging |
| **API key exposure** — The ping API route must use server-side API keys (not exposed to client). The values `RUNPOD_GRAPHQL_API_KEY` and `GPU_CLUSTER_API_KEY` must be accessed server-side only | Low | Already mitigated — the API route runs server-side in Next.js |
| **RunPod rate limits** — RunPod GraphQL API has undocumented rate limits. Rapid pinging could trigger throttling | Low | User-triggered only eliminates this risk. Add a cooldown (min 10s between pings) |
| **Single endpoint, multiple adapters** — The system uses one RunPod endpoint for all adapters across all workbases. The LORA_MODULES snapshot shows ALL adapters, not just the one being pinged | Low | The UI should highlight which adapter in the list belongs to this job (bold/highlight) |
| **Pods vs Serverless mode** — In `INFERENCE_MODE=pods`, the health/inference endpoints may be different URLs. Current code uses `INFERENCE_API_URL` which may not support `/health` in pods mode | Medium | Branch logic based on `INFERENCE_MODE` env var — use the correct health check URL per mode |

---

## 5. Unified Solution: Adapter Detail Page

### 5.1 New Route

```
/workbase/[id]/fine-tuning/launch/adapter/[jobId]
```

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

### 5.2 Navigation — Link from Adapter History

The existing Adapter History section ([launch/page.tsx](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx#L371-L408)) needs modification:

**Current:** Each adapter history entry is a static `<div>` with name, date, cost, and status badge — no click-through.

**Change:** Wrap each entry in a `<Link>` or add "View Details" button. Only link jobs with `status='completed'`.

```diff
- <div
+ <div
+   className="cursor-pointer hover:bg-muted/80 transition-colors"
+   onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/launch/adapter/${job.id}`)}
    key={job.id}
    className="flex items-center justify-between p-3 bg-muted rounded-md"
  >
```

### 5.3 Adapter Detail Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Conversations > Launch Tuning > Adapter     │
│                                                         │
│ ═══════════════════════════════════════════════════════  │
│                                                         │
│ Adapter: "Emotional Intelligence v1.0"                  │
│ ID: adapter-e8fa481f  [📋]   Status: [Live] / [Retired]│
│                                                         │
│ ┌─────────────────────┐ ┌───────────────────────────┐   │
│ │ Deployment Report   │ │ Adapter Status Ping       │   │
│ │                     │ │                           │   │
│ │ ✅ HF Upload        │ │ Adapter: adapter-e8fa481f │   │
│ │    BrightHub2/lora..│ │ ✅ In LORA_MODULES        │   │
│ │    6 files uploaded  │ │ ✅ Workers online (1)     │   │
│ │                     │ │ ✅ Inference verified      │   │
│ │ ✅ RunPod Updated   │ │                           │   │
│ │    Endpoint: 780t...│ │ Last check: 5 min ago     │   │
│ │    3 total adapters │ │ [🔄 Refresh]              │   │
│ │                     │ │                           │   │
│ │ ✅ Workers Cycled   │ └───────────────────────────┘   │
│ │    Scale: 0→1→ready │                                 │
│ │    Duration: 45s    │                                 │
│ │                     │                                 │
│ │ ✅ Verified         │                                 │
│ │    Inference OK     │                                 │
│ └─────────────────────┘                                 │
│                                                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Training Configuration                             │  │
│ │                                                    │  │
│ │ Training Set: "EI v2"  (48 conversations)          │  │
│ │ Sensitivity: Medium | Progression: Medium          │  │
│ │ Repetition: 3 epochs | Cost: $1.42                 │  │
│ │ Duration: 12m 34s                                  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Lifecycle Actions                                  │  │
│ │                                                    │  │
│ │ This is the [Active / Superseded] adapter for      │  │
│ │ this Work Base.                                    │  │
│ │                                                    │  │
│ │ [Delete from HuggingFace]  [Remove from RunPod]    │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Data Sources for Each Section

| Section | Data Source | API Route |
|---------|-----------|-----------|
| Header (name, status) | `pipeline_training_jobs` row | `GET /api/pipeline/jobs/[jobId]` (existing) |
| Deployment Report | `pipeline_training_jobs.deployment_log` (new JSONB) | `GET /api/pipeline/jobs/[jobId]/deployment-log` (new) |
| Adapter Status Ping | Live RunPod queries | `GET /api/pipeline/adapters/[jobId]/ping` (new) |
| Training Configuration | `pipeline_training_jobs` row | `GET /api/pipeline/jobs/[jobId]` (existing) |
| Lifecycle Actions | DB updates + RunPod API | `POST /api/pipeline/adapters/[jobId]/remove` (new) |

### 5.5 New Files Required

| File | Type | Purpose |
|------|------|---------|
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx` | Page | Adapter Detail Page |
| `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts` | API Route | Read `deployment_log` JSONB |
| `src/app/api/pipeline/adapters/[jobId]/ping/route.ts` | API Route | Live RunPod ping + status check |
| `src/app/api/pipeline/adapters/[jobId]/remove/route.ts` | API Route | Remove adapter from RunPod `LORA_MODULES` |
| `src/hooks/useAdapterDetail.ts` | Hook | React Query hooks for detail page |
| `src/components/pipeline/AdapterStatusPing.tsx` | Component | Status ping widget |
| `src/components/pipeline/DeploymentTimeline.tsx` | Component | Deployment report visualization |

### 5.6 Database Changes Required

| Change | Table | Column/Constraint |
|--------|-------|--------------------|
| Add column | `pipeline_training_jobs` | `deployment_log JSONB DEFAULT NULL` |
| Add column | `pipeline_training_jobs` | `adapter_status TEXT DEFAULT 'active' CHECK (IN ('active', 'superseded', 'deleted'))` |

---

## 6. Barrier Analysis — Cross-Cutting Concerns

### 6.1 Inngest Observability

The biggest structural barrier across all three issues is that **Inngest step outputs are ephemeral**. The data needed for the deployment report (RunPod responses, worker refresh timing, verification results) currently exists only as Inngest step return values and console logs.

**Resolution:** Modify the Inngest functions to persist key data to the `deployment_log` JSONB column. This requires:
- 2 code changes in `auto-deploy-adapter.ts` (capture + write)
- 1 code change in `refresh-inference-workers.ts` (append worker refresh data)
- 1 SAOL migration for the new column

### 6.2 Single Shared Endpoint

All workbases share one RunPod inference endpoint (`780tauhj7c126b`). This means:
- The LORA_MODULES list is global, not per-workbase
- Adapter removal must be scoped carefully to avoid breaking other workbases
- Worker cycling affects ALL workbases, not just the one being deployed

**Resolution:** The adapter removal logic must query DB for all `active` adapters across ALL workbases and only remove the specific adapter being superseded, never touching adapters belonging to other workbases.

### 6.3 Cost Implications

| Action | Cost |
|--------|------|
| Inference ping (status check) | ~$0.01-0.02 per ping (GPU compute) |
| Worker cycling (adapter deploy) | ~$0.50-2.00 per cycle (cold starts) |
| HuggingFace storage | Free (public repos) |
| RunPod GraphQL queries | Free (no compute cost) |

### 6.4 Recommended Implementation Order

| Phase | Work | Dependencies |
|-------|------|-------------|
| **Phase 1** | DB migration (`deployment_log`, `adapter_status` columns) | SAOL |
| **Phase 2** | Modify `autoDeployAdapter` to capture and persist deployment data | Phase 1 |
| **Phase 3** | Build Adapter Detail Page with Deployment Report | Phase 2 |
| **Phase 4** | Build Adapter Status Ping API and component | Phase 1 |
| **Phase 5** | Implement adapter lifecycle management (supersede old adapters, remove from RunPod) | Phase 2 |
| **Phase 6** | Link Adapter History entries to detail page | Phase 3 |

---

## Appendix: Existing Conversation Reference

Related investigation from conversation `1a92c9f5-d99f-454f-84ff-8c0d1a3f7318` ("Verifying RunPod Adapters") confirmed that:
- `adapter-6fd5ac79` and `adapter-e8fa481f` are both present in RunPod `LORA_MODULES`
- The GraphQL query for reading endpoint env vars works correctly
- RunPod uses query param auth for GraphQL (`?api_key=`)
