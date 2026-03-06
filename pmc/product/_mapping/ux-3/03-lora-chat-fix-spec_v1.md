# LoRA Chat Fix — Implementation Specification

**Document**: `03-lora-chat-fix-spec_v1.md`  
**Created**: 2026-02-25  
**Source**: James' Response sections in `02-lora-chat-issues_v1.md`  
**Scope**: Worker refresh cycle, `max_loras` increase, `INFERENCE_MODE` validation, research deliverables

---

## 1. Summary

After an adapter is pushed to RunPod via the auto-deploy pipeline, stale workers continue serving old adapter lists — causing 404 errors when users test newly deployed adapters. This spec adds an automated worker refresh cycle to the auto-deploy function: after LORA_MODULES are updated, the system sets `workersMin=0`, waits for all workers to terminate, sets `workersMin` back, then verifies the adapter is available before marking the job as "ready." Additionally, `MAX_LORAS` is increased to 5 via the same GraphQL API, and the `INFERENCE_MODE` switch for pods is documented.

---

## 2. Impact Analysis

### Files Created
| File | Purpose |
|------|---------|
| `src/inngest/functions/refresh-inference-workers.ts` | New Inngest function: worker refresh cycle |
| `scripts/test-worker-refresh.ts` | Standalone test script to validate the 0→wait→2 cycle |

### Files Modified
| File | Change |
|------|--------|
| `src/inngest/client.ts` | Add `pipeline/adapter.deployed` event type |
| `src/inngest/functions/index.ts` | Register `refreshInferenceWorkers` function |
| `src/inngest/functions/auto-deploy-adapter.ts` | Emit `pipeline/adapter.deployed` event after Step 4 succeeds; change Step 6 to write `status: 'deploying'` instead of `'ready'` |

### Dependencies Touched
| Dependency | Impact |
|------------|--------|
| RunPod GraphQL API (`saveEndpoint` mutation) | Worker refresh function uses same mutation with modified `workersMin` |
| RunPod REST API (`/health`) | Worker refresh function polls for worker state |
| Inngest event system | New event type: `pipeline/adapter.deployed` |
| `EndpointStatus` type (`src/types/pipeline-adapter.ts`) | No change needed — `'deploying'` already exists in the union type |

### Database Tables
| Table | Operation | Details |
|-------|-----------|---------|
| `pipeline_inference_endpoints` | UPDATE | Status transitions: `deploying` → `ready` (on worker refresh success) or `deploying` → `failed` (on timeout) |
| `pipeline_training_jobs` | READ | Worker refresh reads `hf_adapter_path` to verify adapter name |

### Risk Areas
| Risk | Mitigation |
|------|------------|
| Setting `workersMin=0` kills workers mid-request | RunPod serverless drains active requests before terminating workers. The `idleTimeout: 5` means workers die 5s after their last request completes. |
| Worker refresh function runs while another adapter deploy is in progress | The `auto-deploy-adapter` has `concurrency: { limit: 1 }`. Worker refresh also uses `concurrency: { limit: 1 }` and waits for workers to fully cycle, so the next deploy cannot start until refresh completes. |
| Timeout: workers never reach "ready" state | 3-minute timeout with fallback to set `workersMin` back to original value — never leaves the endpoint with 0 workers permanently. |
| `MAX_LORAS` change requires worker restart to take effect | The worker refresh cycle already restarts all workers, so env var changes are picked up automatically. |

---

## 3. Changes

### Change 1: New Inngest Event Type — `pipeline/adapter.deployed`

**What**: Add a new event type to the Inngest client that fires after the auto-deploy function successfully updates LORA_MODULES on RunPod.

**Where**: `src/inngest/client.ts` — append to the `InngestEvents` type definition

**Why**: Decouples the "adapter pushed to RunPod" step from the "workers refreshed and verified" step. The auto-deploy function fires this event at the end; a new Inngest function handles the worker refresh.

**Implementation**:

Add to the `InngestEvents` type in `src/inngest/client.ts`:

```typescript
/**
 * Fired after auto-deploy-adapter successfully updates LORA_MODULES on RunPod.
 * Triggers worker refresh cycle to ensure new adapters are loaded.
 * Handler: refreshInferenceWorkers (src/inngest/functions/refresh-inference-workers.ts)
 */
'pipeline/adapter.deployed': {
  data: {
    jobId: string;
    userId: string;
    adapterName: string;       // e.g. "adapter-bae71569"
    endpointId: string;        // e.g. "780tauhj7c126b"
    originalWorkersMin: number; // original value to restore
    originalWorkersMax: number; // for reference during polling
  };
};
```

**Acceptance Criteria**:

- GIVEN the `InngestEvents` type in `src/inngest/client.ts`
- WHEN a developer references `'pipeline/adapter.deployed'`
- THEN TypeScript provides type-safe access to `data.jobId`, `data.adapterName`, `data.endpointId`, `data.originalWorkersMin`, `data.originalWorkersMax`

---

### Change 2: Auto-Deploy Emits `pipeline/adapter.deployed` Event

**What**: After the `update-runpod-lora-modules` step (Step 4) completes successfully, emit the new event. This replaces the reliance on Step 5 (hot reload) which always fails on serverless.

**Where**: `src/inngest/functions/auto-deploy-adapter.ts` — add a new step between current Step 4 and Step 5

**Why**: The worker refresh must happen after LORA_MODULES are updated but before the UI marks endpoints as "ready."

**Implementation**:

Insert a new Inngest step `emit-worker-refresh` after the existing `update-runpod-lora-modules` step:

```typescript
// =====================================================
// Step 4b: Trigger worker refresh cycle
// Fires pipeline/adapter.deployed event which triggers the
// refreshInferenceWorkers function to cycle workers.
// =====================================================
await step.run('emit-worker-refresh', async () => {
  // Only emit if LORA_MODULES were actually changed (not idempotent skip)
  if (loraModulesResult?.noChange) {
    console.log('[AutoDeployAdapter] LORA_MODULES unchanged — skipping worker refresh');
    return { skipped: true };
  }

  await inngest.send({
    name: 'pipeline/adapter.deployed',
    data: {
      jobId,
      userId,
      adapterName,
      endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
      originalWorkersMin: loraModulesResult.originalWorkersMin, // captured from Step 4
      originalWorkersMax: loraModulesResult.originalWorkersMax, // captured from Step 4
    },
  });

  console.log(`[AutoDeployAdapter] Emitted pipeline/adapter.deployed for ${adapterName}`);
  return { emitted: true };
});
```

Additionally, the `update-runpod-lora-modules` step (Step 4) must return `originalWorkersMin` and `originalWorkersMax` from the fetched endpoint data:

In the return statement of Step 4 (after the `saveEndpoint` mutation succeeds), change:

```typescript
// Current:
return { loraModules };

// New:
return { loraModules, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

And for the idempotent skip path:

```typescript
// Current:
return { loraModules, noChange: true };

// New:
return { loraModules, noChange: true, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

Capture the return value with a variable:

```typescript
const loraModulesResult = await step.run('update-runpod-lora-modules', async () => { ... });
```

**Acceptance Criteria**:

- GIVEN a new adapter is pushed (LORA_MODULES changed on RunPod)
- WHEN the `update-runpod-lora-modules` step completes successfully
- THEN a `pipeline/adapter.deployed` event is emitted with `adapterName`, `endpointId`, `originalWorkersMin`, `originalWorkersMax`

- GIVEN the adapter already exists in LORA_MODULES (idempotent re-run)
- WHEN the `update-runpod-lora-modules` step returns `noChange: true`
- THEN the `emit-worker-refresh` step is skipped (no event emitted)

---

### Change 3: Change Step 6 Status from `'ready'` to `'deploying'`

**What**: The `update-inference-endpoints-db` step (Step 6) currently writes `status: 'ready'` to `pipeline_inference_endpoints` immediately. Change this to `status: 'deploying'` so the UI doesn't show the adapter as ready before workers have restarted.

**Where**: `src/inngest/functions/auto-deploy-adapter.ts` — Step 6 (`update-inference-endpoints-db`)

**Why**: The adapter is not actually servable until workers restart with the updated LORA_MODULES. Showing "ready" prematurely causes the 404 that triggered this investigation.

**Implementation**:

In the INSERT path of Step 6, change:

```typescript
// Current:
status: 'ready',
ready_at: now,

// New:
status: 'deploying',
ready_at: null,
```

In the UPDATE path of Step 6, change:

```typescript
// Current:
status: 'ready',
ready_at: now,

// New:
status: 'deploying',
ready_at: null,
```

**Acceptance Criteria**:

- GIVEN a new adapter deployment completes the LORA_MODULES update
- WHEN Step 6 writes to `pipeline_inference_endpoints`
- THEN both `control` and `adapted` records have `status = 'deploying'` and `ready_at = null`

- GIVEN the UI reads `pipeline_inference_endpoints` for this job
- WHEN the status is `'deploying'`
- THEN the `EndpointStatusBanner` shows "deploying" (not green "ready") and the Run Test button is disabled

---

### Change 4: New Inngest Function — `refreshInferenceWorkers`

**What**: A new Inngest function that handles the full worker refresh lifecycle: set `workersMin=0` → poll until all workers are terminated → set `workersMin` back → poll until at least one worker is `ready` or `idle` → verify the adapter is loadable → update DB status to `'ready'`.

**Where**: New file `src/inngest/functions/refresh-inference-workers.ts`

**Why**: This is the core fix demanded by James: _"set `workersMin=0`, wait 1 minute, then set back to 2. The 'Job' should not be in status 'DONE' until the adapter is confirmed on the endpoint and all workers have stopped and restarted."_

**Implementation**:

```
Function ID: refresh-inference-workers
Trigger: pipeline/adapter.deployed
Concurrency: { limit: 1 }
Retries: 1 (only 1 retry — avoid infinite worker cycling)
```

**Step sequence**:

| Step Name | Action | Timeout | Fatal on Error? |
|-----------|--------|---------|-----------------|
| `scale-down-workers` | GraphQL `saveEndpoint` with `workersMin: 0` | 30s | Yes |
| `wait-for-workers-terminated` | Poll `GET /health` every 5s until `workers.ready + workers.idle + workers.running + workers.initializing === 0` | 90s | Yes (with cleanup) |
| `scale-up-workers` | GraphQL `saveEndpoint` with `workersMin: originalWorkersMin` (from event data) | 30s | Yes |
| `wait-for-workers-ready` | Poll `GET /health` every 5s until `workers.ready > 0 \|\| workers.idle > 0` | 180s | Yes (with warning) |
| `verify-adapter-available` | Send a lightweight inference request using the adapter name to confirm it does not 404 | 60s | No (non-fatal, log warning) |
| `mark-endpoints-ready` | UPDATE `pipeline_inference_endpoints` SET `status = 'ready'`, `ready_at = NOW()` WHERE `job_id = jobId` | 10s | No (non-fatal) |

**Environment variables used** (same as auto-deploy-adapter — no new env vars):
- `RUNPOD_GRAPHQL_API_KEY` — for `saveEndpoint` mutation
- `GPU_CLUSTER_API_KEY` / `RUNPOD_API_KEY` — for `/health` polling (Bearer auth)
- `INFERENCE_API_URL` — base URL for health polling

**GraphQL mutation** (reuse exact same `saveEndpoint` mutation from auto-deploy-adapter Step 4):

For scale-down:
```graphql
mutation SaveEndpointEnv($input: EndpointInput!) {
  saveEndpoint(input: $input) { id }
}
```
Input: all original endpoint fields from the fetch query, but with `workersMin: 0`. **Do not change `env`** — pass it through unchanged.

For scale-up:
Same mutation but with `workersMin: originalWorkersMin` (from event data).

**Health polling logic** (reuse pattern from `inference-serverless.ts` `checkEndpointHealth`):

```typescript
async function pollWorkerState(
  endpointUrl: string, 
  apiKey: string, 
  condition: (workers: WorkerState) => boolean, 
  maxWaitMs: number, 
  pollIntervalMs: number = 5000
): Promise<{ met: boolean; finalState: WorkerState; waitedMs: number }>
```

**Cleanup on failure**: If any step fails, the function must ensure `workersMin` is restored to the original value. Use a try/catch wrapper around the scale-down → wait → scale-up sequence, and if the scale-up step hasn't run yet, run it in the catch block.

**Adapter verification** (Step 5 — `verify-adapter-available`):

Send a minimal inference request to `POST ${INFERENCE_API_URL}/runsync`:
```json
{
  "input": {
    "openai_route": "/v1/chat/completions",
    "openai_input": {
      "model": "<adapterName>",
      "messages": [{"role": "user", "content": "Hello"}],
      "max_tokens": 5,
      "temperature": 0.0
    }
  }
}
```

If the response status is `COMPLETED`, the adapter is verified. If `FAILED` with a 404/NotFoundError, log a warning but do not fail the step — the adapter may load on the next request. The key constraint is that workers have restarted (they will have the adapter in their LORA_MODULES).

**DB update** (Step 6 — `mark-endpoints-ready`):

```typescript
const supabase = createServerSupabaseAdminClient();
await supabase
  .from('pipeline_inference_endpoints')
  .update({ status: 'ready', ready_at: new Date().toISOString() })
  .eq('job_id', jobId);
```

Note: This uses Supabase admin client (same as auto-deploy-adapter). This is server-side code running inside an Inngest function — SAOL is not applicable here because SAOL is for agent-driven terminal operations, not application code. The existing auto-deploy-adapter already uses `createServerSupabaseAdminClient()` for all its DB operations — this follows the same pattern.

**Acceptance Criteria**:

- GIVEN the auto-deploy-adapter emits `pipeline/adapter.deployed` with `endpointId: "780tauhj7c126b"` and `originalWorkersMin: 0`
- WHEN `refreshInferenceWorkers` runs
- THEN `workersMin` is set to 0 on the endpoint, the function polls `/health` until all workers are gone, `workersMin` is restored to 0 (original value), workers restart, and `pipeline_inference_endpoints.status` is updated to `'ready'`

- GIVEN `workersMin` was 2 before the deploy
- WHEN `refreshInferenceWorkers` receives `originalWorkersMin: 2`
- THEN after the cycle, `workersMin` is restored to 2

- GIVEN the scale-down step succeeds but `wait-for-workers-terminated` times out at 90s
- WHEN the timeout occurs
- THEN `workersMin` is restored to the original value (cleanup) and the function throws an error (Inngest retries once)

- GIVEN the `verify-adapter-available` step sends a test inference
- WHEN the adapter returns a 404 NotFoundError
- THEN the step logs a warning but does NOT fail — the endpoints are still marked `'ready'` because worker restart guarantees LORA_MODULES are loaded

---

### Change 5: Register the New Function

**What**: Add `refreshInferenceWorkers` to the Inngest function registry.

**Where**: `src/inngest/functions/index.ts`

**Implementation**:

Add import:
```typescript
import { refreshInferenceWorkers } from './refresh-inference-workers';
```

Add to the `inngestFunctions` array:
```typescript
export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,  // NEW
];
```

Add to the named exports:
```typescript
export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,  // NEW
};
```

**Acceptance Criteria**:

- GIVEN the Inngest serve endpoint at `POST /api/inngest`
- WHEN Inngest syncs functions
- THEN `refresh-inference-workers` appears in the registered functions list

---

### Change 6: Increase `MAX_LORAS` to 5 via Worker Refresh

**What**: During the first worker refresh cycle's `scale-up-workers` step, update the `MAX_LORAS` env var from `1` to `5` alongside restoring `workersMin`.

**Where**: `src/inngest/functions/refresh-inference-workers.ts` — inside the `scale-up-workers` step

**Why**: James confirmed: _"We can increase this and even increase the number of workers."_ Doing it during worker refresh means the new value takes effect when workers cold-start with the updated env.

**Implementation**:

In the `scale-up-workers` step, after fetching the current endpoint state (needed to pass all fields to `saveEndpoint`), modify the `env` array:

```typescript
const updatedEnv = currentEnv.map(e => 
  e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : e
);
```

Then pass `env: updatedEnv` along with `workersMin: originalWorkersMin` to the `saveEndpoint` mutation.

If `MAX_LORAS` is not in the env array (shouldn't happen, but defensively), append it:

```typescript
if (!updatedEnv.some(e => e.key === 'MAX_LORAS')) {
  updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
}
```

**Acceptance Criteria**:

- GIVEN the RunPod endpoint has `MAX_LORAS=1` in its env vars
- WHEN the `scale-up-workers` step runs
- THEN the endpoint's `MAX_LORAS` env var is set to `5`

- GIVEN the endpoint already has `MAX_LORAS=5` (subsequent runs)
- WHEN the `scale-up-workers` step runs
- THEN `MAX_LORAS` remains `5` (idempotent)

---

### Change 7: Test Script — `scripts/test-worker-refresh.ts`

**What**: Create a standalone script that validates the worker refresh cycle end-to-end outside of Inngest.

**Where**: New file `scripts/test-worker-refresh.ts`

**Why**: James asked: _"Run test scripts to set to 0 wait a minute then set to 2. You can do this in an automated way before declaring it is working correct?"_ and _"We will also want to test if setting workers to 0 kills all workers, even those 'initializing'."_

**Implementation**:

The script should:

1. Load env vars from `.env.local` (`dotenv`)
2. Fetch current endpoint state via RunPod GraphQL (same query as auto-deploy Step 4a)
3. Log current worker count from `/health`
4. Set `workersMin: 0` via `saveEndpoint` mutation
5. Poll `/health` every 3s, logging worker state each poll, until all worker counts reach 0 (or 90s timeout)
6. **Key test**: Immediately after setting `workersMin: 0`, also test setting `workersMin: 2` right away, to verify if RunPod honors the 0→2 sequence (James' question: _"This could be tested by sending a 'Workers=0' immediately after sending 'Workers=2'"_)
7. Wait for workers to come back to `ready` or `idle` state
8. Log final worker state
9. Restore original `workersMin` value

**Environment variables**:
- `RUNPOD_GRAPHQL_API_KEY`
- `GPU_CLUSTER_API_KEY` or `RUNPOD_API_KEY`
- `RUNPOD_INFERENCE_ENDPOINT_ID` (or use hardcoded `780tauhj7c126b`)
- `INFERENCE_API_URL`

**Run command**: `npx tsx scripts/test-worker-refresh.ts`

**Acceptance Criteria**:

- GIVEN the script is run with valid env vars
- WHEN `workersMin` is set to 0
- THEN the script logs the worker count decreasing over time until all workers are terminated (including any that were "initializing")

- GIVEN workers are at 0
- WHEN `workersMin` is set back to 2
- THEN new workers initialize and eventually reach "ready" or "idle" state

- GIVEN the 0→2 rapid fire test
- WHEN `workersMin=0` is sent immediately followed by `workersMin=2`
- THEN the script logs whether RunPod processed both in sequence or if the second overrode the first

---

### Change 8: Research Deliverable — RunPod Programmatic Endpoint Creation

**What**: Research and document whether the RunPod API can create new serverless endpoints programmatically, including with custom templates and env vars.

**Where**: Add findings as a comment block at the top of `scripts/test-worker-refresh.ts`, or as console output in a separate section of the test script

**Why**: James asked: _"Research if a serverless endpoint can be created by the API"_ and _"Find out if the API can create serverless LLMs using our template (or at least with our custom settings)"_

**Implementation**:

The RunPod GraphQL API exposes a `createEndpoint` mutation (documented at `https://graphql-spec.runpod.io`). The test script should include a dry-run section that:

1. Queries the existing endpoint `780tauhj7c126b` for its full configuration (template, GPU IDs, env vars)
2. Logs the template ID and all settings
3. Documents the `createEndpoint` mutation signature
4. Does NOT actually create an endpoint — just logs what the mutation call would look like

**Acceptance Criteria**:

- GIVEN the test script runs
- WHEN the "endpoint creation research" section executes
- THEN it logs the current endpoint's `templateId`, full `env` array, and a sample `createEndpoint` mutation that could be used to create a clone

---

### Change 9: Document `INFERENCE_MODE` Pods Behavior

**What**: Add a documentation comment in `inference-service.ts` explaining how pods mode uses adapters, confirming it works for permanent RunPod instances.

**Where**: `src/lib/services/inference-service.ts` — existing mode switch comment block

**Why**: James asked: _"Confirm we can do that and confirm what the `INFERENCE_MODE` settings are"_ and _"How does the permanent Runpod use the adapters?"_

**Implementation**:

Add/expand the comment block at the top of `inference-service.ts`:

```typescript
/**
 * INFERENCE_MODE Configuration
 * 
 * "serverless" (default):
 *   - Uses RunPod Serverless vLLM endpoints
 *   - Workers auto-scale (workersMin/workersMax)
 *   - Adapters loaded via LORA_MODULES env var at worker cold-start
 *   - Cost: pay per second of active compute
 *   - Endpoint URL: INFERENCE_API_URL (e.g. https://api.runpod.ai/v2/780tauhj7c126b)
 * 
 * "pods" (permanent instance):
 *   - Uses dedicated RunPod Pods with direct OpenAI-compatible API
 *   - Requires two separate pods: one for base model, one with adapter loaded
 *   - Adapters loaded via vLLM CLI args (--lora-modules) at pod startup
 *   - Cost: ~$0.50-5.00/hour continuous (GPU-dependent), faster cold-start
 *   - Endpoint URLs: INFERENCE_API_URL (control) + INFERENCE_API_URL_ADAPTED (adapted)
 *   - To add new adapters: restart the adapted pod with updated --lora-modules
 * 
 * Switching: Set INFERENCE_MODE env var in Vercel + .env.local
 */
```

**Acceptance Criteria**:

- GIVEN a developer reads `inference-service.ts`
- WHEN they look at the mode configuration
- THEN they understand both modes, their cost implications, and how adapters are loaded in each

---

## 4. Testing Checkpoints

### Checkpoint 1: Test Script Validates Worker Cycle

Run: `npx tsx scripts/test-worker-refresh.ts`

Expected output:
```
[1/6] Fetching current endpoint state...
  Endpoint: brightrun-inference-official-vllm -fb (780tauhj7c126b)
  Current workersMin: 0, workersMax: 2
  Current MAX_LORAS: 1

[2/6] Current worker state:
  Ready: 0, Idle: 1, Running: 0, Initializing: 0

[3/6] Setting workersMin=0...
  ✅ workersMin set to 0

[4/6] Polling until all workers terminated...
  [5s]  Ready: 0, Idle: 1, Running: 0, Initializing: 0
  [10s] Ready: 0, Idle: 0, Running: 0, Initializing: 0
  ✅ All workers terminated after 10s

[5/6] Setting workersMin=2 (restoring)...
  ✅ workersMin set to 2

[6/6] Polling until workers ready...
  [5s]  Ready: 0, Idle: 0, Running: 0, Initializing: 2
  [30s] Ready: 0, Idle: 0, Running: 0, Initializing: 2
  [60s] Ready: 1, Idle: 0, Running: 0, Initializing: 1
  ✅ Workers ready after 60s

[RAPID-FIRE TEST] Setting workersMin=0 then immediately workersMin=2...
  (results logged)

[RESEARCH] Endpoint creation capability:
  templateId: <logged>
  createEndpoint mutation: <logged>
```

### Checkpoint 2: Inngest Function Fires After Deploy

1. Trigger a test deploy via `node scripts/retrigger-adapter-deploy.js`
2. Watch Inngest dashboard: `auto-deploy-adapter` should complete Steps 1–7
3. New step `emit-worker-refresh` should emit `pipeline/adapter.deployed`
4. `refresh-inference-workers` function should appear and run its 6 steps
5. `pipeline_inference_endpoints` status should transition: `deploying` → `ready`

### Checkpoint 3: UI Shows Correct Status During Deploy

1. Navigate to `/pipeline/jobs/[jobId]/test` while a deploy is in progress
2. `EndpointStatusBanner` should show "deploying" (not green "ready")
3. After `refresh-inference-workers` completes, the status should flip to "ready"
4. The adapted chat should work without 404

### Checkpoint 4: Verify `MAX_LORAS=5` Applied

After the first worker refresh cycle runs, check the endpoint env vars:
```bash
# Use RunPod GraphQL to verify
node -e "
  require('dotenv').config({path:'.env.local'});
  fetch('https://api.runpod.io/graphql?api_key='+process.env.RUNPOD_GRAPHQL_API_KEY, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query:'{ myself { endpoint(id:\"780tauhj7c126b\") { env { key value } } } }'})
  }).then(r=>r.json()).then(d=>{
    const ml = d.data.myself.endpoint.env.find(e=>e.key==='MAX_LORAS');
    console.log('MAX_LORAS:', ml?.value);
  });
"
```
Expected: `MAX_LORAS: 5`

---

## 5. Warnings

### Do NOT:

1. **Do NOT use SAOL for application DB operations** — The Inngest functions run as server-side TypeScript in the Vercel runtime. They use `createServerSupabaseAdminClient()` from `@/lib/supabase-server` for DB access, NOT SAOL. SAOL is for agent-driven terminal scripts only.

2. **Do NOT change the RunPod GraphQL URL or auth pattern** — The existing code uses `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}` (API key as query param, no Authorization header). Do not switch to Bearer auth — the RunPod GraphQL API uses query param auth.

3. **Do NOT set `workersMin` to a hardcoded value** — Always use `originalWorkersMin` from the event data. Currently it's 0, but it could be changed in the future.

4. **Do NOT make the adapter verification step fatal** — The adapter may take a few seconds to load on the first request after worker restart. A 404 at verification time does not mean the adapter is missing — it means the worker hasn't finished loading it yet. Log a warning and move on.

5. **Do NOT remove Step 5 (vllm-hot-reload) from auto-deploy-adapter** — Keep it as-is (non-fatal). It serves as a future-proofing mechanism for when RunPod adds direct vLLM access on serverless.

6. **Do NOT run the GraphQL `saveEndpoint` mutation without passing ALL original endpoint fields** — The RunPod API replaces the entire endpoint config on each `saveEndpoint` call. If you omit `gpuIds`, `idleTimeout`, `locations`, `templateId`, etc., they will be reset to defaults. Always fetch the current endpoint state first, then pass all fields back with only the changed values modified.

7. **Do NOT attempt to increase `workersMax` beyond 2 in this iteration** — James specified we're keeping the current scale for the proof of concept. `workersMax` stays at its current value.

8. **Do NOT address overlapping adapter deployments** — James noted: _"If someone submits multiple LoRA adapters at overlapping times...workers could crash into each other. I think we won't address that right now."_ The existing `concurrency: { limit: 1 }` on `auto-deploy-adapter` serializes deploys, and the same limit on `refresh-inference-workers` serializes refreshes. This is sufficient for now.

9. **Do NOT create the endpoint programmatically in this iteration** — The research deliverable (Change 8) is documentation only. Do not call `createEndpoint`. Just log what it would look like.
