# LoRA Chat Fix + RAG Adapter Binding — Implementation Specification

**Document**: `03-lora-chat-fix-spec_v2.md`  
**Created**: 2026-02-25  
**Supersedes**: `03-lora-chat-fix-spec_v1.md`  
**Source**: James' Response sections in `02-lora-chat-issues_v1.md` + James' RAG/KB design direction  
**Scope**: Worker refresh cycle, Knowledge Base ↔ Adapter binding, `max_loras` increase, `INFERENCE_MODE` validation, research deliverables, first-customer-journey analysis

---

## 1. Summary

This spec addresses two interconnected problems:

**Problem A — Worker Lifecycle (from v1):** After an adapter is pushed to RunPod via the auto-deploy pipeline, stale continue serving old adapter lists — causing 404 errors when users test newly deployed adapters. The fix: automated worker refresh cycle (`workersMin=0` → wait → restore → verify → mark ready).

**Problem B — Shared Serverless Endpoint (new in v2):** The single RunPod serverless endpoint (`780tauhj7c126b`) is shared by both the Pipeline adapter testing system (`/pipeline/jobs/[jobId]/test` and `/chat`) **and** the RAG Frontier module (`/rag/[id]`). RAG currently lets users manually pick any deployed adapter from a global dropdown — there is no binding between a Knowledge Base and a specific adapter. This creates confusion, prevents deterministic adapter routing, and blocks the product story of "one KB = one LoRA + one RAG knowledge set."

**James' Design Direction:** _"This could potentially be solved by requiring all customers to create a new Knowledge Base as the foundational task of running BOTH LoRA adapters and RAG embedding. And you will only be able to have ONE of each LoRA & RAG processing in each Knowledge Base. That way each KB can be given its own dedicated adapter."_

**Combined Solution:**

1. **Worker refresh cycle** — After LORA_MODULES are updated, cycle workers (0 → wait → restore), then verify and mark ready. (Changes 1–7, carried from v1)
2. **KB ↔ Adapter 1:1 binding** — Add an `adapter_job_id` column to `rag_knowledge_bases`. When set, that KB's LoRA/RAG+LoRA queries automatically use that adapter — no manual dropdown selection. (Changes 10–15, new in v2)
3. **Increase `MAX_LORAS`** to 5. (Change 6, carried from v1)
4. **Research deliverables** — RunPod programmatic endpoint creation, `INFERENCE_MODE` documentation. (Changes 8–9, carried from v1)

**James' Response**: We are going to change the terminology "Knowledge Base" to "WorkBase"

#12 KB creation dialog + API accept optional adapter selection at creation time
---

## 2. Impact Analysis

### Files Created (4 files)
| File | Purpose |
|------|---------|
| `src/inngest/functions/refresh-inference-workers.ts` | New Inngest function: worker refresh cycle |
| `scripts/test-worker-refresh.ts` | Standalone test script to validate the 0→wait→2 cycle |
| `supabase/migrations/YYYYMMDDHHMMSS_add_kb_adapter_binding.sql` | Supabase migration: add `adapter_job_id` column to `rag_knowledge_bases` |
| `src/app/api/rag/knowledge-bases/[id]/adapter/route.ts` | New API route: bind/unbind adapter to a KB |

### Files Modified (11 files)
| File | Change |
|------|--------|
| `src/inngest/client.ts` | Add `pipeline/adapter.deployed` event type |
| `src/inngest/functions/index.ts` | Register `refreshInferenceWorkers` function |
| `src/inngest/functions/auto-deploy-adapter.ts` | Emit `pipeline/adapter.deployed` event after Step 4; change Step 6 status to `'deploying'` |
| `src/lib/services/inference-service.ts` | Add `INFERENCE_MODE` documentation comment block |
| `src/types/rag.ts` | Add `adapterJobId` field to `RAGKnowledgeBase` interface |
| `src/app/api/rag/knowledge-bases/route.ts` | Accept optional `adapterJobId` on KB creation; return it in response |
| `src/hooks/useRAGKnowledgeBases.ts` | Add `adapterJobId` to create mutation params |
| `src/components/rag/CreateKnowledgeBaseDialog.tsx` | Add optional adapter selector to KB creation dialog |
| `src/components/rag/RAGChat.tsx` | Auto-select KB's bound adapter; hide dropdown when adapter is bound |
| `src/lib/rag/services/rag-retrieval-service.ts` | In `generateLoRAResponse()`: resolve adapter from KB binding when `modelJobId` is not provided |
| `src/app/api/rag/query/route.ts` | Relax `modelJobId` requirement for LoRA modes when KB has a bound adapter |

### Dependencies Touched
| Dependency | Impact |
|------------|--------|
| RunPod GraphQL API (`saveEndpoint` mutation) | Worker refresh function uses same mutation with modified `workersMin` |
| RunPod REST API (`/health`) | Worker refresh function polls for worker state |
| Inngest event system | New event type: `pipeline/adapter.deployed` |
| `EndpointStatus` type (`src/types/pipeline-adapter.ts`) | No change needed — `'deploying'` already exists in the union type |
| Supabase schema (`rag_knowledge_bases`) | New nullable column: `adapter_job_id uuid REFERENCES pipeline_training_jobs(id)` |

### Database Tables
| Table | Operation | Details |
|-------|-----------|---------|
| `pipeline_inference_endpoints` | UPDATE | Status transitions: `deploying` → `ready` (on worker refresh success) or `deploying` → `failed` (on timeout) |
| `pipeline_training_jobs` | READ | Worker refresh reads `hf_adapter_path` to verify adapter name |
| `rag_knowledge_bases` | ALTER TABLE | Add `adapter_job_id uuid NULL REFERENCES pipeline_training_jobs(id)` |
| `rag_knowledge_bases` | READ/UPDATE | KB creation and adapter binding operations |

### Risk Areas
| Risk | Mitigation |
|------|------------|
| Setting `workersMin=0` kills workers mid-request | RunPod serverless drains active requests before terminating workers. The `idleTimeout: 5` means workers die 5s after their last request completes. |
| Worker refresh runs while another adapter deploy is in progress | Both `auto-deploy-adapter` and `refresh-inference-workers` have `concurrency: { limit: 1 }`, serializing all operations on the shared endpoint. |
| Timeout: workers never reach "ready" state | 3-minute timeout with fallback to set `workersMin` back to original value — never leaves the endpoint with 0 workers permanently. |
| `MAX_LORAS` change requires worker restart to take effect | The worker refresh cycle already restarts all workers, so env var changes are picked up automatically. |
| KB bound to an adapter whose job is deleted or failed | The FK is nullable. If the job is removed, the FK is preserved (no CASCADE). The `generateLoRAResponse()` function already validates that the endpoint is `status=ready` before calling — if the adapter is gone, it falls back to RAG-only with a user-facing warning. |
| RAG module query using a bound adapter while workers are cycling | The query will hit RunPod's cold-start queue or fail with a retry-able error. The RAG retrieval service already has retry logic in `callInferenceEndpoint()`. During the `deploying` status window, the UI should show a warning but not block RAG-only queries. |
| Two KBs bound to the same adapter | Allowed by design. Multiple KBs can reference the same `adapter_job_id`. The constraint is max 1 adapter per KB, not max 1 KB per adapter. |

---

## 3. Changes — Worker Refresh Cycle (carried from v1)

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
      originalWorkersMin: loraModulesResult.originalWorkersMin,
      originalWorkersMax: loraModulesResult.originalWorkersMax,
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

**RAG Impact**: This status change also affects the RAG models dropdown (`GET /api/rag/models`), which filters for `status: 'ready'`. During the `deploying` window, the adapter will not appear in the RAG model selector — this is correct behavior, since the adapter cannot serve requests yet.

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

- GIVEN a user opens RAG Chat and selects LoRA mode while this adapter is deploying
- WHEN `GET /api/rag/models` executes filtering `status = 'ready'`
- THEN the deploying adapter does NOT appear in the dropdown (correct — it can't serve yet)

---

### Change 4: New Inngest Function — `refreshInferenceWorkers`

**What**: A new Inngest function that handles the full worker refresh lifecycle: set `workersMin=0` → poll until all workers are terminated → set `workersMin` back → poll until at least one worker is `ready` or `idle` → verify the adapter is loadable → update DB status to `'ready'`.

**Where**: New file `src/inngest/functions/refresh-inference-workers.ts`

**Why**: This is the core fix demanded by James: _"set `workersMin=0`, wait 1 minute, then set back to 2. The 'Job' should not be in status 'DONE' until the adapter is confirmed on the endpoint and all workers have stopped and restarted."_

**Shared Endpoint Consideration**: Because the same RunPod endpoint serves BOTH Pipeline adapter testing and RAG LoRA queries, cycling workers affects ALL users and ALL adapters. The `concurrency: { limit: 1 }` ensures only one refresh cycle runs at a time, and the 90s scale-down + 180s scale-up timeouts account for the shared nature of the endpoint.

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

Note: This uses Supabase admin client (same as auto-deploy-adapter). This is server-side code running inside an Inngest function — SAOL is not applicable here because SAOL is for agent-driven terminal operations, not application code.

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

**Why**: James confirmed: _"We can increase this and even increase the number of workers."_ Doing it during worker refresh means the new value takes effect when workers cold-start with the updated env. With `MAX_LORAS=5`, up to 5 different adapters can be loaded simultaneously on each worker — supporting up to 5 KBs with distinct adapters before needing a second endpoint.

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

## 4. Changes — Research Deliverables (carried from v1)

### Change 8: Research Deliverable — RunPod Programmatic Endpoint Creation

**What**: Research and document whether the RunPod API can create new serverless endpoints programmatically, including with custom templates and env vars.

**Where**: Add findings as a comment block at the top of `scripts/test-worker-refresh.ts`, or as console output in a separate section of the test script

**Why**: James asked: _"Research if a serverless endpoint can be created by the API"_ and _"Find out if the API can create serverless LLMs using our template (or at least with our custom settings)"_

**Future Relevance to RAG**: If each customer eventually needs an isolated serverless endpoint (for strong tenant isolation), programmatic endpoint creation becomes critical. The research deliverable should document the full `createEndpoint` mutation signature, template cloning capabilities, and per-endpoint env var injection — this directly feeds into the scaling plan for >10 customers.

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
 *   - Shared by BOTH Pipeline adapter testing AND RAG LoRA queries
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

## 5. Changes — Knowledge Base ↔ Adapter Binding (new in v2)

### Change 10: Database Migration — `adapter_job_id` on `rag_knowledge_bases`

**What**: Add a nullable `adapter_job_id` column to `rag_knowledge_bases` that references `pipeline_training_jobs.id`. This creates the 1:1 binding between a Knowledge Base and a LoRA adapter.

**Where**: New Supabase migration file `supabase/migrations/YYYYMMDDHHMMSS_add_kb_adapter_binding.sql`

**Why**: James' design direction: _"You will only be able to have ONE of each LoRA & RAG processing in each Knowledge Base. That way each KB can be given its own dedicated adapter."_ The nullable FK means:
- `NULL` → KB uses RAG-only (no adapter bound)
- Set → KB always uses this adapter for LoRA/RAG+LoRA modes

**Implementation**:

```sql
-- Add adapter binding column to knowledge bases
-- Each KB can optionally be bound to exactly one LoRA adapter (training job)
ALTER TABLE public.rag_knowledge_bases
  ADD COLUMN adapter_job_id uuid NULL
  REFERENCES public.pipeline_training_jobs(id)
  ON DELETE SET NULL;

-- Index for lookups: "which KBs use this adapter?"
CREATE INDEX idx_rag_kb_adapter_job_id 
  ON public.rag_knowledge_bases(adapter_job_id) 
  WHERE adapter_job_id IS NOT NULL;

-- Unique constraint: each KB can have at most one adapter
-- (enforced by being a single column, but explicit for documentation)
COMMENT ON COLUMN public.rag_knowledge_bases.adapter_job_id IS 
  'The pipeline training job whose LoRA adapter is bound to this knowledge base. NULL = RAG-only KB. Each KB can have at most one adapter.';
```

**Note**: No unique constraint on `adapter_job_id` across KBs — multiple KBs can share the same adapter. The 1:1 constraint is per-KB (one KB → zero or one adapter), not global.

**Acceptance Criteria**:

- GIVEN the migration runs against the Supabase database
- WHEN `rag_knowledge_bases` is queried
- THEN it includes a nullable `adapter_job_id` column that is a valid FK to `pipeline_training_jobs`

- GIVEN a KB has `adapter_job_id = 'abc-123'`
- WHEN the referenced pipeline_training_jobs row is deleted
- THEN `adapter_job_id` is set to NULL (ON DELETE SET NULL)

---

### Change 11: Update `RAGKnowledgeBase` TypeScript Interface

**What**: Add the `adapterJobId` field to the `RAGKnowledgeBase` interface and the row mapper.

**Where**: `src/types/rag.ts` — `RAGKnowledgeBase` interface

**Implementation**:

```typescript
export interface RAGKnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  summary: string | null;
  status: RAGKnowledgeBaseStatus;
  documentCount: number;
  adapterJobId: string | null;    // NEW — bound LoRA adapter's training job ID
  createdAt: string;
  updatedAt: string;
}
```

Also update the `mapRowToKnowledgeBase` function (used in `src/app/api/rag/knowledge-bases/route.ts`) to include:

```typescript
adapterJobId: row.adapter_job_id ?? null,
```

**Acceptance Criteria**:

- GIVEN a KB row has `adapter_job_id = 'abc-123'` in the database
- WHEN the API returns the mapped `RAGKnowledgeBase` object
- THEN `adapterJobId === 'abc-123'`

---

### Change 12: KB Creation Accepts Optional `adapterJobId`

**What**: Extend the KB creation dialog and API to accept an optional `adapterJobId` at creation time. This is optional because users may create RAG-only KBs (no adapter needed until one is trained).

**Where**:
- `src/app/api/rag/knowledge-bases/route.ts` — POST handler
- `src/components/rag/CreateKnowledgeBaseDialog.tsx` — form UI
- `src/hooks/useRAGKnowledgeBases.ts` — mutation params

**Why**: Users should be able to associate an adapter when creating a KB, or add one later via the bind/unbind API (Change 13).

**Implementation — API (`POST /api/rag/knowledge-bases`)**:

Accept optional `adapterJobId` in the request body:

```typescript
const { name, description, adapterJobId } = await request.json();
```

If `adapterJobId` is provided:
1. Validate it exists in `pipeline_training_jobs` with `user_id = user.id`
2. Validate the associated `pipeline_inference_endpoints` entry has `status = 'ready'`
3. Insert into `rag_knowledge_bases` with `adapter_job_id = adapterJobId`

If not provided:
- Insert with `adapter_job_id = NULL` (existing behavior)

**Implementation — UI (`CreateKnowledgeBaseDialog.tsx`)**:

Add an optional "LoRA Adapter" dropdown below the description field:

```tsx
{/* Optional: Bind a LoRA adapter to this Knowledge Base */}
<div className="space-y-2">
  <Label htmlFor="adapter">LoRA Adapter (Optional)</Label>
  <p className="text-sm text-muted-foreground">
    Bind a trained adapter to enable LoRA and RAG+LoRA modes in this KB's chat.
  </p>
  <Select 
    value={adapterJobId} 
    onValueChange={setAdapterJobId}
  >
    <SelectTrigger>
      <SelectValue placeholder="None — RAG only" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">None — RAG only</SelectItem>
      {deployedModels?.map(model => (
        <SelectItem key={model.jobId} value={model.jobId}>
          {model.jobName || `Adapter ${model.jobId.substring(0, 8)}`}
          {model.datasetName && ` (${model.datasetName})`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

The dropdown is populated by `useDeployedModels()` (same hook already used by `RAGChat`).

**Implementation — Hook (`useRAGKnowledgeBases.ts`)**:

Update the create mutation to accept and pass `adapterJobId`:

```typescript
interface CreateKBParams {
  name: string;
  description?: string;
  adapterJobId?: string;  // NEW
}

async function createKnowledgeBase(params: CreateKBParams) {
  const res = await fetch('/api/rag/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // ...
}
```

**Acceptance Criteria**:

- GIVEN a user opens the "New Knowledge Base" dialog
- WHEN they provide a name and select an adapter from the dropdown
- THEN the created KB has `adapter_job_id` set to the selected job ID

- GIVEN a user opens the "New Knowledge Base" dialog
- WHEN they provide a name but leave the adapter dropdown as "None — RAG only"
- THEN the created KB has `adapter_job_id = NULL`

- GIVEN a user selects an adapter that belongs to a different user
- WHEN the API validates ownership
- THEN it returns 403 Forbidden

---

### Change 13: New API Route — Bind/Unbind Adapter to KB

**What**: Create a new API route that allows binding or unbinding an adapter to/from an existing KB after creation.

**Where**: New file `src/app/api/rag/knowledge-bases/[id]/adapter/route.ts`

**Why**: Users may train an adapter after creating their KB, or want to swap adapters. This route supports both `PUT` (bind) and `DELETE` (unbind) operations.

**Implementation**:

```typescript
// PUT /api/rag/knowledge-bases/[id]/adapter
// Body: { adapterJobId: string }
// Binds the specified adapter to this KB. Replaces any existing binding.

// DELETE /api/rag/knowledge-bases/[id]/adapter
// Unbinds the current adapter from this KB. KB reverts to RAG-only.
```

PUT handler:
1. Auth: `requireAuth(request)` — get `user.id`
2. Validate KB exists and `user_id = user.id`
3. Validate `adapterJobId` exists in `pipeline_training_jobs` with `user_id = user.id`
4. Validate the adapter's `pipeline_inference_endpoints` entry has `status = 'ready'`
5. Update: `UPDATE rag_knowledge_bases SET adapter_job_id = $adapterJobId WHERE id = $kbId AND user_id = $userId`
6. Return updated KB

DELETE handler:
1. Auth: `requireAuth(request)`
2. Validate KB exists and `user_id = user.id`
3. Update: `UPDATE rag_knowledge_bases SET adapter_job_id = NULL WHERE id = $kbId AND user_id = $userId`
4. Return updated KB

**Acceptance Criteria**:

- GIVEN a KB with no adapter bound
- WHEN `PUT /api/rag/knowledge-bases/{id}/adapter` with `{ adapterJobId: "abc-123" }`
- THEN the KB's `adapter_job_id` is set to `abc-123`

- GIVEN a KB with adapter `abc-123` bound
- WHEN `DELETE /api/rag/knowledge-bases/{id}/adapter`
- THEN the KB's `adapter_job_id` is set to NULL

- GIVEN a KB with adapter `abc-123` bound
- WHEN `PUT /api/rag/knowledge-bases/{id}/adapter` with `{ adapterJobId: "def-456" }`
- THEN the KB's `adapter_job_id` is updated to `def-456` (swap)

---

### Change 14: RAG Chat Auto-Selects KB's Bound Adapter

**What**: When a KB has a bound adapter, the RAG Chat component should auto-select it and hide the manual dropdown. When there is no bound adapter, the current manual selection behavior remains.

**Where**: `src/components/rag/RAGChat.tsx`

**Why**: James' direction: _"Each job's chat page should auto-use that job's adapter."_ For RAG, the KB is the organizing unit, so each KB's chat should auto-use that KB's bound adapter.

**Implementation**:

The `RAGChat` component receives props `documentId?` and `knowledgeBaseId?`. To resolve the KB's adapter:

1. When `knowledgeBaseId` is provided directly (KB-level chat), use it to look up the KB's `adapterJobId`.
2. When only `documentId` is provided (document-level chat), the component already resolves the KB internally. Use the resolved KB's `adapterJobId`.

In the component:

```typescript
// Get the KB to check for a bound adapter
const { data: knowledgeBase } = useRAGKnowledgeBase(resolvedKbId);
const boundAdapterJobId = knowledgeBase?.adapterJobId ?? null;

// If KB has a bound adapter, lock the adapter selection
useEffect(() => {
  if (boundAdapterJobId) {
    setSelectedModelJobId(boundAdapterJobId);
  }
}, [boundAdapterJobId]);

const isAdapterLocked = !!boundAdapterJobId;
```

In the JSX — mode selector and model dropdown:

```tsx
{/* Mode selector: all 3 modes available when adapter is bound or manually selected */}
<ModeSelector value={mode} onChange={(m) => { 
  setMode(m); 
  if (m === 'rag_only') setSelectedModelJobId(null); 
  else if (isAdapterLocked) setSelectedModelJobId(boundAdapterJobId);
}} />

{/* Model dropdown: hidden when adapter is locked by KB binding */}
{needsModel && !isAdapterLocked && (
  <Select ...>  {/* existing dropdown */}
  </Select>
)}

{/* When adapter is locked, show info badge instead of dropdown */}
{needsModel && isAdapterLocked && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Badge variant="outline">
      {deployedModels?.find(m => m.jobId === boundAdapterJobId)?.jobName 
        || `Adapter ${boundAdapterJobId.substring(0, 8)}`}
    </Badge>
    <span>Bound to this Knowledge Base</span>
  </div>
)}
```

**Acceptance Criteria**:

- GIVEN a KB with `adapter_job_id = 'abc-123'`
- WHEN a user opens RAG Chat for that KB
- THEN the mode selector shows RAG / LoRA / RAG+LoRA, but the model dropdown is hidden
- AND the adapter `abc-123` is automatically used for LoRA and RAG+LoRA modes

- GIVEN a KB with `adapter_job_id = NULL`
- WHEN a user opens RAG Chat for that KB
- THEN the existing behavior is preserved: mode selector + manual adapter dropdown

- GIVEN a KB with a bound adapter
- WHEN the user selects "RAG Only" mode
- THEN the adapter is NOT used (pure RAG via Claude)
- AND when the user switches back to "LoRA" or "RAG+LoRA," the bound adapter is re-selected automatically

---

### Change 15: RAG Query API Resolves Adapter from KB Binding

**What**: When a RAG query is submitted in `lora_only` or `rag_and_lora` mode without an explicit `modelJobId`, and the query targets a KB with a bound adapter, automatically resolve and use that adapter.

**Where**:
- `src/app/api/rag/query/route.ts` — relax the `modelJobId` required check
- `src/lib/rag/services/rag-retrieval-service.ts` — in `queryRAG()` and `generateLoRAResponse()`, resolve adapter from KB when `modelJobId` is not provided

**Why**: The UI (Change 14) hides the manual adapter dropdown when a KB has a bound adapter — so `modelJobId` may not be explicitly sent. The API must resolve it from the KB's `adapter_job_id`.

**Implementation — API route**:

In `src/app/api/rag/query/route.ts`, change the validation:

```typescript
// Current:
if ((mode === 'lora_only' || mode === 'rag_and_lora') && !modelJobId) {
  return NextResponse.json({ error: 'modelJobId required for LoRA modes' }, { status: 400 });
}

// New:
// modelJobId is optional when KB has a bound adapter — resolved in queryRAG()
if ((mode === 'lora_only' || mode === 'rag_and_lora') && !modelJobId && !knowledgeBaseId) {
  return NextResponse.json(
    { error: 'modelJobId or knowledgeBaseId with bound adapter required for LoRA modes' }, 
    { status: 400 }
  );
}
```

**Implementation — Retrieval service**:

In `queryRAG()` (around line 1210 of `rag-retrieval-service.ts`), before the mode branching logic:

```typescript
// Resolve modelJobId from KB binding if not explicitly provided
let resolvedModelJobId = modelJobId;
if (!resolvedModelJobId && (mode === 'lora_only' || mode === 'rag_and_lora')) {
  const supabase = createServerSupabaseAdminClient();
  const { data: kb } = await supabase
    .from('rag_knowledge_bases')
    .select('adapter_job_id')
    .eq('id', resolvedKnowledgeBaseId)
    .single();
  
  if (kb?.adapter_job_id) {
    resolvedModelJobId = kb.adapter_job_id;
    console.log(`[RAG] Resolved adapter from KB binding: ${resolvedModelJobId}`);
  } else {
    throw new Error(
      'LoRA mode requested but no adapter bound to this Knowledge Base. ' +
      'Bind an adapter in KB settings or select one manually.'
    );
  }
}
```

Then pass `resolvedModelJobId` to `generateLoRAResponse()` instead of `modelJobId`.

**Acceptance Criteria**:

- GIVEN a KB with `adapter_job_id = 'abc-123'`
- WHEN a RAG query is submitted with `mode: 'rag_and_lora'` and `knowledgeBaseId` but NO `modelJobId`
- THEN the query succeeds, using adapter `abc-123` from the KB binding

- GIVEN a KB with `adapter_job_id = NULL`
- WHEN a RAG query is submitted with `mode: 'lora_only'` and NO `modelJobId`
- THEN the API returns a 400 error: "LoRA mode requested but no adapter bound to this Knowledge Base"

- GIVEN a KB with `adapter_job_id = 'abc-123'`
- WHEN a RAG query is submitted with `mode: 'rag_and_lora'` AND `modelJobId = 'def-456'` (explicit override)
- THEN the query uses adapter `def-456` (explicit `modelJobId` takes precedence over KB binding)

---

## 6. Testing Checkpoints

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

### Checkpoint 5: KB Adapter Binding

1. Run the Supabase migration
2. Create a new KB via the dialog, selecting an adapter from the dropdown
3. Verify `rag_knowledge_bases.adapter_job_id` is set in the DB
4. Open RAG Chat for that KB — confirm the adapter badge shows ("Bound to this Knowledge Base")
5. Submit a query in RAG+LoRA mode — confirm it uses the bound adapter
6. Submit a query in RAG-only mode — confirm it uses Claude (no adapter)

### Checkpoint 6: KB Without Adapter — Manual Selection Preserved

1. Create a new KB without selecting an adapter
2. Open RAG Chat — confirm the manual adapter dropdown appears
3. Select an adapter and submit a LoRA query — confirm it works
4. Verify the per-query manual selection is preserved (existing behavior)

### Checkpoint 7: Adapter Bind/Unbind API

1. Create a KB without an adapter
2. `PUT /api/rag/knowledge-bases/{id}/adapter` with `{ adapterJobId: "..." }` — verify binding
3. Open RAG Chat — confirm adapter is auto-selected
4. `DELETE /api/rag/knowledge-bases/{id}/adapter` — verify unbinding
5. Refresh RAG Chat — confirm manual dropdown reappears

---

## 7. Warnings

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

10. **Do NOT enforce a UNIQUE constraint on `adapter_job_id` across KBs** — Multiple KBs CAN share the same adapter. The constraint is "max 1 adapter per KB," not "max 1 KB per adapter." A customer who trains one adapter and uploads multiple document sets should be able to bind that adapter to multiple KBs.
**James' Response** This is incorrect. We can leave the adapter drop down for now...but there are two many pitfalls with asking customers to choose the adapter. If we want we can have a "global" workspace that has the drop downs of every adapter and RAG.

But for this iteration:
1. A RAG MUST live inside a Knowledge Base
2. A There can only be ONE LoRA implementation in a KB
3. There can be multiple RAG's in the KB
4. All RAGS and the single LoRA must live within one KB and have one adapter

11. **Do NOT remove the manual adapter dropdown entirely from RAGChat** — It must remain as fallback for KBs with no bound adapter. Only HIDE it when the KB has a binding.

12. **Do NOT auto-create KB adapter bindings retroactively** — Existing KBs will have `adapter_job_id = NULL` after the migration. Users must explicitly bind adapters. No migration script should guess which adapter belongs to which KB.

---

## 8. First Customer Journey — Investigation, Scope Discovery, and Recommendations

### 8.1 Current State of the Product

Based on a complete audit of the codebase, here is what BrightRun currently offers:

| Module | Route | Status | Maturity |
|--------|-------|--------|----------|
| **Conversations** | `/conversations` | Functional | Core workflow — AI generates training conversations from templates |
| **Datasets** | `/datasets` | Functional | Compiles conversations into training-ready JSONL |
| **Training Files** | `/training-files` | Functional | Export layer for fine-tuning data |
| **Pipeline** | `/pipeline/jobs` | Functional | RunPod LoRA adapter training, auto-deploy, A/B testing |
| **RAG Frontier** | `/rag` | Functional | Document ingestion, Expert Q&A, RAG/LoRA/RAG+LoRA chat |
| **Batch Jobs** | `/batch-jobs` | Functional | Batch conversation generation monitoring |

**What does NOT exist yet:**
- No onboarding flow or getting-started wizard
- No billing, payment, or subscription system (no Stripe, no pricing page)
- No usage quotas or rate limiting per user
- No user roles or access tiers
- No persistent sidebar/navigation (just a module card grid)
- No edit/delete for Knowledge Bases (create-only)
- No adapter-to-KB binding (addressed in this spec, Changes 10–15)
- No customer-facing documentation or help system

### 8.2 Defining the "First Win" (Time-to-Value / Aha Moment)

The term James is looking for is **"Aha Moment"** (also called "Time-to-Value" or "Activation Event") — the point where a new user first experiences the core value of the product and thinks: _"Oh, this is why I'm paying for this."_

**Recommended Aha Moment for BrightRun:**

> **A customer uploads their domain document, asks a question about it in RAG Chat, and sees a knowledgeable answer grounded in their own data — all within 15 minutes of signing up.**

Why this specific moment:

1. **It's fast.** RAG document upload, processing, and chat are the shortest path to value. No training job needed (those take 30–60+ minutes). The customer sees their own knowledge reflected back immediately.
2. **It's tangible.** The customer asks a question about THEIR document and gets a precise, cited answer. This is viscerally different from generic ChatGPT.
3. **It's the hook for everything else.** Once they see RAG working, the natural next question is: _"What if it was even better with a fine-tuned model?"_ — which leads to the Pipeline (training → adapter → RAG+LoRA).
4. **It proves the "complicated LLM features made easy"** story. They uploaded a document and got an AI expert on it. No infrastructure, no prompting, no MLOps.

**The Aha Moment flow:**

```
Sign Up → Create KB → Upload Document → [wait ~2-5 min for processing] → 
Expert Q&A (optional) → RAG Chat → "Holy shit, it knows my document" → 
AHA MOMENT ✓
```

### 8.3 What the "Endpoint of Functionality" Should Be

The question is: what is the full scope of what must work end-to-end before charging customers? Here is the recommended **Minimum Paid Product** (MPP) — the complete set of features that justifies a customer paying:

#### Tier 1: Must Work (Launch Blockers)

These are non-negotiable for the first 10 customers:

| Feature | Current Status | Gap |
|---------|---------------|-----|
| **Sign up / Sign in** | Works (Supabase Auth) | No gap |
| **Create Knowledge Base** | Works | No edit/delete — add at minimum a rename capability |
| **Upload documents to KB** | Works (PDF, DOCX, TXT, MD) | No gap |
| **RAG Chat (RAG-only mode)** | Works | No gap — this is the Aha Moment |
| **Train LoRA adapter** | Works (RunPod pipeline) | Need worker refresh (this spec) to stop 404s |
| **RAG+LoRA Chat** | Works but adapter selection is manual | This spec's KB binding (Changes 10–15) fixes this |
| **A/B Testing (adapted vs control)** | Works (Pipeline chat) | Need worker refresh to stop false 404s |
| **Payment** | Does NOT exist | **LAUNCH BLOCKER** — need Stripe integration |
| **Usage visibility** | Does NOT exist | Need at minimum a "your usage" page showing jobs run, queries made, compute cost |

#### Tier 2: Should Work (First-Month Features)

These aren't launch blockers but make the difference between a customer staying vs. churning:

| Feature | Priority | Reasoning |
|---------|----------|-----------|
| **Onboarding wizard** | High | Guide new users through: Create KB → Upload Doc → Chat. Without this, customers will stare at 6 module cards and not know where to start |
| **KB edit/delete** | High | Customers WILL make mistakes during exploration |
| **Template gallery** | Medium | James' directive: "I want them to feel that I can create templates for them pretty quickly." Pre-built templates per industry (insurance, healthcare, legal, HR) that customers can fork |
| **Persistent navigation** | Medium | The current card-grid-only navigation is fine for demos but frustrating for daily use |
| **Multi-turn RAG conversations** | Medium | RAG Chat is currently stateless (query/response pairs). Real conversations need memory |
| **Usage quotas / soft limits** | Medium | Prevent a single customer from consuming all RunPod compute |

#### Tier 3: Nice to Have (Quarter 1)

| Feature | Reasoning |
|---------|-----------|
| Per-customer isolated endpoints | RunPod endpoint creation via API (Change 8 research) |
| Custom model selection | Beyond Mistral-7B — let customers choose base models |
| Batch RAG evaluation | Run a test suite against a KB to measure retrieval quality |
| Export/download trained adapters | Customers take their trained weights elsewhere |
| Team/org features | Multiple users under one account with shared KBs |

### 8.4 Recommended Pricing Model for First 10 Customers

Given James' constraints:
- _"I DO want them to pay"_
- _"I DO want them to see it as a product test"_
- _"Ideally they will be in their own proof of concept phase and have a budget to figure it out"_

**Recommendation: Flat Monthly + Compute Pass-Through**

| Component | Price | What It Covers |
|-----------|-------|----------------|
| **Platform Access** | $99/month | Dashboard access, KB creation, RAG chat, unlimited document uploads |
| **LoRA Training** | ~$5–15/job pass-through | RunPod GPU compute cost for each training run, marked up 2x |
| **Inference Compute** | ~$0.10/minute pass-through | RunPod serverless compute for LoRA/RAG+LoRA queries, marked up 2x |
| **RAG-only Chat** | Included in platform fee | Claude API costs absorbed by platform (they're small — ~$0.01–0.05/query) |

Why this structure:
1. **$99/month is low enough for exploration budgets** — most enterprise teams have discretionary spending up to $500/month without procurement approval.
2. **Compute pass-through is transparent** — customers see exactly what their experiments cost. This aligns with "experimental/discovery phase."
3. **RAG-only is free** — this ensures the Aha Moment has zero friction. The paywall kicks in when they want LoRA fine-tuning (the premium feature).
4. **The 2x markup on compute** covers infrastructure management, Supabase hosting, Vercel, and development time.

### 8.5 What to Build Before Charging (Critical Path)

Given the current state, the **minimum additional work** before the first paying customer:

```
1. This spec (worker refresh + KB binding)     ← you are here
2. Stripe integration (subscription + metering)  ← LAUNCH BLOCKER
3. Onboarding flow (3-step wizard)               ← HIGH PRIORITY
4. Usage dashboard page                          ← required for billing transparency
5. KB edit/rename capability                     ← table-stakes UX
```

Estimated effort: 2–3 weeks of focused development.

### 8.6 The Customer's Journey (Detailed Walkthrough)

Here is the recommended end-to-end journey for the first 10 customers:

**Day 0: Discovery**
- Customer finds BrightRun (referral, LinkedIn, demo call with James)
- Sees value prop: "Make your company's knowledge AI-searchable and train custom AI models on your processes — no ML expertise needed"

**Day 1: Sign Up + Aha Moment (15 minutes)**
1. Sign up (email/password)
2. Onboarding wizard launches: "Let's set up your first AI Knowledge Base"
3. Name their KB (e.g., "Claims Processing Manual")
4. Upload their first document (e.g., a 50-page claims processing PDF)
5. Wait for processing (~2–5 minutes, progress bar shown)
6. Wizard: "Your document is ready! Ask it a question."
7. Customer asks: "What is the maximum coverage for flood damage?"
8. RAG response: Precise, cited answer from THEIR document
9. **AHA MOMENT** — "This thing actually knows my document"

**Day 2–7: Exploration (free trial or first billing cycle)**
- Upload more documents to the KB
- Try Expert Q&A if they want to refine the AI's understanding
- Experiment with different questions, compare against their internal search tools
- James offers to build custom conversation templates for their use case

**Day 7–14: LoRA Training (upsell to compute)**
- James explains: "Your RAG answers are good, but with a fine-tuned model, they can be even better — the AI will speak your company's language"
- Customer configures a training job using the conversation templates James built
- Training runs (~30–60 min)
- Adapter deploys automatically (this spec ensures it works)
- Customer binds adapter to their KB (Change 12)
- RAG+LoRA chat: The answers improve — domain-specific tone, terminology, reasoning

**Day 14–30: Validation + Expansion**
- Customer runs A/B tests (control vs adapted) to measure improvement
- Uploads additional documents (multiple doc support in KB)
- Creates a second KB for a different department/use case
- Reports findings to their team: "This works for our use case, here's the cost"

**Month 2+: Ongoing Value**
- Customer integrates RAG Chat into their workflow
- Retrains adapters as processes change
- Requests additional templates from James
- Potentially invites team members (Tier 3 feature)

### 8.7 Summary of Recommendations

| Category | Recommendation |
|----------|---------------|
| **Aha Moment** | "Upload doc → RAG Chat → accurate answer" in 15 minutes |
| **Endpoint of Functionality** | RAG + LoRA training + A/B testing + KB adapter binding, with Stripe billing |
| **Pricing** | $99/month platform + compute pass-through (2x markup) |
| **Critical Path Before First Customer** | This spec → Stripe → Onboarding wizard → Usage dashboard → KB edit |
| **Timeline** | 2–3 weeks to minimally shippable paid product |
| **Target Customer** | Enterprise teams in proof-of-concept phase, with budget for AI investigation |
| **James' Differentiator** | Hands-on template creation + the simplicity of the platform make it personal and accessible |

### 8.8 More Questions


