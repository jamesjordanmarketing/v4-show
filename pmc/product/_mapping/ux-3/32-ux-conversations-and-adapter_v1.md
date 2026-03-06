# Can I Run Fine-Tuning While a 108-Conversation Batch Job Is Running?

**Date:** 2026-03-04  
**Context:** Batch job `e52c4664` (108 conversations) running via Inngest. User wants to launch a new adapter build at `/workbase/[id]/fine-tuning/launch` and push to RunPod simultaneously.

---

## Short Answer

**Yes — go ahead.** They are completely independent pipelines that will not interfere with each other.

---

## Why They Don't Conflict

| Dimension | Batch Conversation Generation | Fine-Tuning / Adapter Build |
|-----------|-------------------------------|----------------------------|
| **AI provider** | Anthropic Claude API (`ANTHROPIC_API_KEY`) | RunPod Serverless GPU (`GPU_CLUSTER_API_KEY`) |
| **Inngest function** | `process-batch-job` (concurrency: 2) | `dispatch-training-job` (concurrency: 3) |
| **Concurrency pool** | Independent | Independent |
| **Rate limiter** | In-memory sliding-window for Claude only | None (RunPod handles its own) |
| **DB tables written** | `batch_jobs`, `batch_items`, `conversations` | `pipeline_training_jobs`, `datasets`, `training_sets` |
| **Storage bucket** | `batch-logs` | `training-files` |
| **API keys** | `ANTHROPIC_API_KEY` | `GPU_CLUSTER_API_KEY`, `HF_TOKEN`, `RUNPOD_GRAPHQL_API_KEY` |

They share the same Inngest client and the same Supabase project, but:

- **Inngest concurrency limits are per-function**, not global. One function's queue cannot starve another.
- **Supabase load** is negligible — batch generation does ~1 row insert per conversation sequentially; training dispatch does ~3–5 small updates total.
- **No shared locks, mutexes, or rate limiters** between the two paths.

---

## Will the Fine-Tuning Run Fine?

Yes. The launch page submits to `POST /api/pipeline/jobs`, which emits a `pipeline/job.created` Inngest event. Inngest dispatches the training job to RunPod Serverless GPU. The entire flow is independent of the Claude-based conversation generation pipeline.

## Will It Interrupt or Crash the 108-Conversation Batch Job?

No. The batch job is driven by the `process-batch-job` Inngest function calling the Anthropic Claude API. Launching a fine-tuning job touches completely different infrastructure (RunPod GPU, HuggingFace Hub). There is no shared resource that one could exhaust to block the other.

---

## Architecture Diagram (Simplified)

```
Browser
  │
  ├── POST /api/conversations/generate-batch
  │     └── Inngest: batch/job.created
  │           └── process-batch-job (concurrency: 2)
  │                 └── Anthropic Claude API ← ANTHROPIC_API_KEY
  │
  ├── POST /api/pipeline/jobs
  │     └── Inngest: pipeline/job.created
  │           └── dispatch-training-job (concurrency: 3)
  │                 └── RunPod Serverless GPU ← GPU_CLUSTER_API_KEY
  │                       └── auto-deploy-adapter (concurrency: 1)
  │                             └── HuggingFace Hub + RunPod Inference
  │
  └── Both share: Supabase DB (different tables), Inngest client (independent queues)
```

---

## Only Theoretical Risk

Under extreme load, both pipelines sharing the same Supabase project could theoretically exhaust the database connection pool. In practice this is a non-issue — conversation generation inserts rows sequentially (one at a time, 500ms apart) and training dispatch makes a handful of DB calls total.

**Bottom line: run both. They're safe.**

---

# Mid-Run Quality Assessment

**Timestamp:** 2026-03-04 ~23:40 UTC (log file: `vercel-103.csv`, 6142 lines)  
**Context:** Both jobs were launched after Inngest resync. Batch generation started ~23:18, adapter build dispatched at 23:38:34.

---

## Q1: Can I Close My Laptop?

**Yes.** Both jobs run entirely server-side:

- **Batch generation** is driven by the Inngest function `process-batch-job` executing on Vercel serverless. The browser is only used to view progress — it polls `GET /api/batch-jobs/[id]` every 3 seconds but does not drive processing.
- **Adapter build** was dispatched to RunPod Serverless GPU via the Inngest function `dispatch-training-job`. RunPod runs autonomously. Status polling from the browser (`GET /api/pipeline/jobs/[jobId]`) is read-only.

Closing the laptop stops the browser polling, but both pipelines continue uninterrupted. When you reopen, the batch watcher page and fine-tuning launch page will resume polling and show current status.

---

## Q2: Error Analysis — Are There Quality-Affecting Errors?

**No.** Every error in `vercel-103.csv` is either non-blocking or unrelated to the current jobs. Breakdown:

### Error Category Summary

| Category | Count | Severity | Affects Job Quality? |
|----------|------:|----------|---------------------|
| `Error logging generation` (Postgres 23503 FK violation) | 32 | Low | **No** |
| `non-array variables field: object` (template warning) | 13 | Low | **No** |
| `rebuild-training-set` failures (stale Inngest retries) | 132 | Medium | **No** — unrelated to current jobs |
| Batch items completed successfully | 16 | — | ✅ Healthy |
| Adapter dispatch errors | 0 | — | ✅ Clean |

### Detail: "Error logging generation" (32 occurrences)

- **What:** Postgres error code `23503` — foreign key violation on `generation_logs.conversation_id → conversations.conversation_id`.
- **Why:** The audit log insert in `generation-log-service.ts` races ahead of the conversation row insert. The `conversation_id` referenced doesn't exist in `conversations` yet at the moment the log is written.
- **Impact:** None. The error is caught in a try/catch in `claude-api-client.ts` (line ~181) that only calls `console.error`. The conversation itself is created successfully. The only side effect is that the `generation_logs` audit row is missing for those 32 calls — purely a logging gap, not a data gap.
- **Fix priority:** Low. A future fix would be to insert the log row after the conversation is committed, or remove the FK constraint on the audit table.

### Detail: "non-array variables field: object" (13 occurrences)

- **What:** Two templates (`3364cb0e…` and `4097016f…`) store their `variables` field as a JSON object instead of an array.
- **Impact:** None. The template rendering code handles this gracefully — it processes whatever variables are available. Conversations generated from these templates are correct.
- **Fix priority:** Low. Could normalize the `variables` column in those template rows.

### Detail: `rebuild-training-set` Failures (132 occurrences)

- **What:** The Inngest function `brighthub-rag-frontier-rebuild-training-set` is retrying repeatedly (since 18:05 UTC) because 4 old conversations have `enrichment_status: not_started`:
  - `1d0f4a67-5537-4b11-9feb-7a557f31f4db`
  - `87b3442d-71d3-44af-8b94-31d9c6fc5ffc`
  - `a18a698f-40c0-43bb-8a5d-0f4a28b37f4d`
  - `fe700ff4-203a-4919-83bb-517b22d70509`
- **Impact on current jobs:** Zero. This is a completely separate Inngest function from both `process-batch-job` and `dispatch-training-job`. It was triggered by an earlier operation (probably manual training-file rebuild) and has been retrying independently ever since.
- **Impact on Inngest:** Minimal. The retries consume function invocations but don't interfere with other functions' concurrency pools.
- **Fix:** Either enrich those 4 conversations or remove them from the training set that triggered the rebuild. This can wait until after both current jobs finish.

---

## Batch Generation Progress

| Metric | Value |
|--------|-------|
| **Total items** | 108 |
| **Completed (at log capture)** | 16 |
| **Failed** | 0 |
| **Progress** | ~15% |
| **Per-item time** | 46–91 seconds (avg ~71s) |
| **Throughput** | ~0.89 items/min (with concurrency 2) |
| **Estimated remaining** | ~103 minutes (~1.7 hours) |
| **First completion** | 23:21:49 (Item `5332823c`) |
| **Last completion in log** | 23:40:00 (Item `d98996ff`) |

All 16 completed items returned HTTP 206 (Inngest step success). Zero items have failed.

---

## Adapter Build Progress

| Metric | Value |
|--------|-------|
| **Pipeline job ID** | `3fa42082-2c57-44b5-902d-8075f5b2fb6c` |
| **RunPod job ID** | `3ce12f95-268e-453e-b3ed-aa9a2ab66296-u2` |
| **Dispatched at** | 23:38:39 |
| **Status at log capture** | `initializing` |
| **Dispatch errors** | 0 |
| **Status polling** | `GET /api/pipeline/jobs/[jobId]` → 200 |

RunPod accepted the training job cleanly. The `dispatch-training-job` Inngest function completed steps with HTTP 200/206 — no errors. The adapter build is running independently on RunPod GPU infrastructure.

---

## Verdict

| Job | Status | Action Needed |
|-----|--------|---------------|
| **108-conversation batch** | ✅ Running clean, 15% done, ~1.7h remaining | None |
| **Adapter build (RunPod)** | ✅ Dispatched, initializing on GPU | None |
| **Stale rebuild-training-set retries** | ⚠️ Retrying (harmless) | Fix after current jobs finish |
| **Close laptop** | ✅ Safe | Both jobs are server-side |

**Both jobs are healthy. No errors affect output quality. Safe to close laptop.**

---
---

# RunPod Worker Restart Failure — Root Cause Analysis

**Timestamp:** 2026-03-05 ~00:30 UTC  
**Log file:** `vercel-104.csv` (7,059 lines)  
**Endpoint:** `780tauhj7c126b` (RunPod Serverless GPU — vLLM with LoRA adapters)  
**Trigger:** Automatic worker refresh after adapter `adapter-3fa42082` deployment  
**Status:** ❌ FAILED — Workers never terminated within 90-second timeout

---

## What Happened — Event Timeline

| Time (UTC) | Event | Source |
|------------|-------|--------|
| 23:46:28 | `[AutoDeployAdapter]` updates `LORA_MODULES` on endpoint `780tauhj7c126b` via `saveEndpoint` GraphQL mutation. New value contains 6 adapters including `adapter-3fa42082`. | `auto-deploy-adapter.ts` |
| 23:46:29 | vLLM hot-reload attempted via `POST /v1/load_lora_adapter` → **404** (expected — vLLM serverless doesn't expose this endpoint) | `auto-deploy-adapter.ts` |
| 23:46:31–56 | Auto-deploy completes all remaining steps: inference endpoint records created, job status set to `deployed`, old adapters superseded, workbase `active_adapter` updated | `auto-deploy-adapter.ts` |
| 23:46:56 | Inngest event `pipeline/adapter.deployed` emitted → triggers `refresh-inference-workers` | `auto-deploy-adapter.ts` |
| 23:48:28 | **Step 1 (scale-down-workers):** Fetches current endpoint config. Calls `saveEndpoint(workersMin: 0)`. Creates `endpoint_restart_log` row with status `scaling_down`. | `refresh-inference-workers.ts` |
| 23:48:30 | **Step 2 (wait-for-workers-terminated):** Begins polling `GET ${INFERENCE_API_URL}/health` every 5 seconds. | `refresh-inference-workers.ts` |
| 23:48:30 | First health poll: `total=4 (R:2 I:2 Ru:0 In:0)` — 2 Ready, 2 Idle, 0 Running, 0 Initializing | health endpoint |
| 23:48:35 | Poll #2: `total=4 (R:2 I:2 Ru:0 In:0)` — **unchanged** | health endpoint |
| 23:48:40 | Poll #3: `total=4 (R:2 I:2 Ru:0 In:0)` — **unchanged** | health endpoint |
| ... | **18 consecutive polls over 81 seconds** — workers NEVER decrease | health endpoint |
| 23:49:51 | Poll #18: `total=4 (R:2 I:2 Ru:0 In:0)` — still 4 workers alive | health endpoint |
| **23:50:01** | **TIMEOUT:** `Error: Workers did not terminate within 90s` — HTTP 400 returned to Inngest | `refresh-inference-workers.ts` |
| 23:52:40 | Browser starts polling `GET /api/pipeline/adapters/[jobId]/restart-status` every 5 seconds | Browser → API route |
| 23:52:40–23:57:30 | **150 consecutive polls** to `/restart-status` — all return HTTP 200 with last-known DB state (likely `scaling_down` or `failed`) | Browser → API route |
| 23:57:30 | Last log entry in `vercel-104.csv`. Browser still polling. UI stuck showing "Workers Cycling" spinner. | Browser |

---

## Root Cause

**`saveEndpoint(workersMin: 0)` does NOT force-terminate existing RunPod serverless workers.**

The `saveEndpoint` GraphQL mutation is a **configuration change**, not an operational command. It tells RunPod's autoscaler: "from now on, don't spin up workers below this minimum." But it does **not** send a kill signal to already-running workers.

RunPod's own documentation confirms this behavior:

> **Active workers:** "Always on" workers that eliminate cold start delays. **They never scale down**, so you are charged as long as they are active.

> **Outdated:** The system marks the worker for replacement **after endpoint updates**. It continues processing current jobs during **rolling updates (10% of max workers at a time)**.

The 4 workers (2 Ready, 2 Idle) continued running because:

1. **Active workers don't scale down.** If `workersMin` was ≥ 1, those workers were "active" (warm) workers. Reducing `workersMin` to 0 via the API changes the *configuration* but doesn't terminate workers that were already spun up as active.

2. **RunPod autoscaler timing.** Even for flex workers, RunPod's autoscaler evaluates on its own schedule — not immediately when a config change is received. Workers remain alive until their idle timeout expires AND the autoscaler decides they're no longer needed.

3. **The idle timeout is separate from workersMin.** A worker with `idle` status will terminate after `idleTimeout` seconds (default: 5s) — but only when the autoscaler runs its next evaluation cycle, and only if the worker isn't being held alive by the `workersMin` floor.

4. **The code polls for 90 seconds, but RunPod's rolling update operates at 10% of max workers at a time.** With `workersMax=4`, that's ~1 worker per cycle. If each cycle takes 30–60 seconds (cold boot + model load), a full replacement could take 2–4 minutes — well beyond the 90-second timeout.

### Why This Is a Recurring Failure

This issue is not intermittent — it is **structurally guaranteed to fail** any time there are ≥ 1 warm workers. The `saveEndpoint(workersMin=0)` approach has a fundamental mismatch with RunPod's serverless architecture. RunPod serverless endpoints don't expose a "kill all workers now" API.

---

## Why vLLM Hot-Reload Doesn't Work

The code attempts vLLM hot-reload as a first-pass solution:
```
POST ${INFERENCE_API_URL}/v1/load_lora_adapter
```

This returns **404** on RunPod Serverless because:

1. **RunPod Serverless proxies a job queue**, not a direct HTTP connection to vLLM. The `/v1/load_lora_adapter` endpoint exists on vLLM's internal HTTP server, but RunPod's serverless proxy only exposes `/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, and `/stream`.
2. **Each worker is a separate vLLM instance.** Even if hot-reload worked, you'd need to send it to every individual worker — and there's no way to address individual workers through the RunPod serverless API.

This means the **only way** to get workers to pick up new `LORA_MODULES` is a **cold restart** — workers must terminate and be replaced by new workers that read the updated env var on boot.

---

## Current Code Architecture (What Failed)

```
auto-deploy-adapter.ts                     refresh-inference-workers.ts
───────────────────                        ────────────────────────────
saveEndpoint({                             Step 1: saveEndpoint({workersMin: 0})
  env: [LORA_MODULES=...updated...]           ↓ Config change sent to RunPod
})                                         Step 2: Poll /health every 5s for 90s
    ↓                                         ↓ Expecting total workers = 0
emit pipeline/adapter.deployed                ↓ Workers NEVER reach 0
    ↓                                         ↓ ❌ TIMEOUT after 90s
triggers refresh-inference-workers         Step 3: (never reached) saveEndpoint({
                                              workersMin: original, workersMax: original})
                                           Step 4: (never reached) Poll for ready
                                           Step 5: (never reached) Verify adapter
                                           Step 6: (never reached) Mark endpoints ready
```

---

## RunPod API Findings from Documentation Research

### What the GraphQL API Exposes

| Feature | Available? | Notes |
|---------|-----------|-------|
| `saveEndpoint` mutation | ✅ | Full PUT — must resend all fields. Updates env vars, workersMin/Max, idleTimeout, etc. |
| Force-terminate individual workers | ❌ | No mutation exists. `podTerminate` works for Pods, NOT for serverless workers. |
| Force-restart all workers | ❌ | No API endpoint. The RunPod console has no "restart workers" button for serverless either. |
| Rolling update (automatic) | ✅ | Triggered when endpoint config changes. Workers marked "Outdated" and replaced at 10% of max workers/cycle. |
| Worker state via GraphQL | ✅ | `Endpoint.workerState` returns `{time, initializing, idle, running, throttled, unhealthy}` per granularity. |
| `idleTimeout` setting | ✅ | Configurable per endpoint. Default 5s. Minimum not documented explicitly (likely 1s or 0s). |
| `/health` HTTP endpoint | ✅ | Returns `{workers: {idle, running}, jobs: {completed, failed, inProgress, inQueue, retried}}`. |
| `/purge-queue` HTTP endpoint | ✅ | Clears pending jobs but does NOT kill workers. |

### Critical Missing Capability

**There is no RunPod API to force-terminate serverless workers.** The `podTerminate` mutation only works for Pod-type instances, not for the ephemeral workers behind a serverless endpoint. This is a platform limitation, not a bug in our code.

---

## Recommended Solutions (Ranked)

### Solution A: Trust RunPod's Rolling Update + Poll WorkerState (RECOMMENDED)

**Principle:** Don't fight the platform. RunPod already handles worker cycling on env var changes. Work *with* it.

**How it works:**
1. `auto-deploy-adapter.ts` already calls `saveEndpoint` with updated `LORA_MODULES`. This triggers RunPod's built-in rolling update.
2. Instead of trying to scale workers to 0, poll RunPod's `Endpoint.workerState` GraphQL field or the `/health` endpoint to detect when all workers have been cycled.
3. After the rolling update completes (all workers are fresh), verify the adapter via `/runsync`.

**Implementation sketch:**
```typescript
// Step 1: Env vars already updated by auto-deploy-adapter
// Step 2: Bump endpoint version to force rolling update
await saveEndpoint({
  ...currentConfig,
  // Touch a field to ensure RunPod triggers rolling update
  // idleTimeout or any field change signals an update
});

// Step 3: Poll until workers are fresh
// The rolling update runs at ~10% of maxWorkers per cycle
// With maxWorkers=4, expect ~2-5 minutes total
const maxWait = 600_000; // 10 minutes
const pollInterval = 15_000; // 15 seconds
let elapsed = 0;
while (elapsed < maxWait) {
  const health = await fetchHealth();
  // If workers are ready and the adapter model responds, we're done
  if (health.workers.idle > 0 || health.workers.running > 0) {
    const verified = await testAdapterInference();
    if (verified) break;
  }
  await sleep(pollInterval);
  elapsed += pollInterval;
}
```

**Pros:**
- Works WITH RunPod's platform, not against it
- No risk of leaving the endpoint in a broken state (min=0 forever)
- Zero downtime — rolling update replaces workers while some continue serving
- No timing race conditions

**Cons:**
- Rolling update takes time (2–5 minutes typical)
- Requires detecting "fresh" workers vs stale — verification via test inference is the most reliable
- During the rolling update, SOME workers may still have old LORA_MODULES (requests may hit stale workers)

---

### Solution B: IdleTimeout Trick — Set to Minimum, Wait, Restore

**Principle:** Force workers to terminate by making them EXTREMELY impatient.

**How it works:**
1. Set `workersMin=0` AND `idleTimeout=1` (or the minimum allowed value) AND `workersMax=0` simultaneously via `saveEndpoint`.
2. Workers that are idle will terminate within 1 second (instead of the normal 5+ seconds).
3. Workers processing jobs will finish their current job, go idle for 1 second, then terminate.
4. Purge the job queue to ensure no pending work keeps workers alive.
5. Poll `/health` for up to 5 minutes (not 90 seconds).
6. Once workers = 0, restore `workersMin`, `workersMax`, and `idleTimeout` to original values.

**Implementation sketch:**
```typescript
// Step 1: Aggressively scale down
await saveEndpoint({
  ...currentConfig,
  workersMin: 0,
  workersMax: 0,        // Also set max to 0 to prevent new workers
  idleTimeout: 1,       // 1 second idle timeout
});

// Step 2: Purge any queued jobs to ensure no work keeps workers alive
await fetch(`${INFERENCE_API_URL}/purge-queue`, { method: 'POST', ... });

// Step 3: Poll with generous timeout
const maxWait = 300_000; // 5 minutes
// ... poll health until workers.idle + workers.running === 0

// Step 4: Restore configuration
await saveEndpoint({
  ...currentConfig,
  workersMin: originalMin,
  workersMax: originalMax,
  idleTimeout: originalIdleTimeout,
});

// Step 5: Wait for workers to come back with new env vars
```

**Pros:**
- Most aggressive approach available without a force-kill API
- Setting `workersMax=0` prevents new workers from spawning during teardown
- Adding `purge-queue` ensures no queued jobs keep workers alive

**Cons:**
- Still relies on RunPod's autoscaler respecting the config change promptly
- **Risk:** If the function fails between Step 1 and Step 4, the endpoint is left at `workersMin=0, workersMax=0, idleTimeout=1` — effectively dead. Need robust error handling / finally blocks.
- Causes total downtime during the cycling window (no workers available)

---

### Solution C: Longer Timeout + Accept Eventual Consistency

**Principle:** The simplest fix — just wait longer.

**How it works:**
1. Keep the current approach but increase the termination timeout from 90 seconds to 5–10 minutes.
2. Between the `saveEndpoint(workersMin=0)` call and the timeout, RunPod's rolling update mechanism should eventually cycle all workers.

**Pros:** Minimal code change (one constant)

**Cons:**
- May still fail if RunPod's rolling update takes longer than expected
- Does not address the fundamental issue — the approach is still wrong
- Users must wait 5–10 minutes for every adapter deployment

---

### Solution D: Two-Endpoint Blue/Green Strategy

**Principle:** Create a new endpoint instead of trying to restart workers on the existing one.

**How it works:**
1. When a new adapter is deployed, create a NEW RunPod endpoint with the updated `LORA_MODULES`.
2. Wait for the new endpoint to have healthy workers.
3. Update the `pipeline_inference_endpoints` table to point to the new endpoint.
4. Delete the old endpoint.

**Pros:**
- Guaranteed to work — new endpoint starts with correct env vars
- Zero-downtime transition (old endpoint serves until new one is ready)

**Cons:**
- Most complex solution — requires managing endpoint lifecycle
- RunPod may charge for both endpoints during transition
- Need to handle edge cases (what if new endpoint fails to start?)

---

### My Recommendation

**Start with Solution A (trust rolling update) as the primary approach, with Solution B (idleTimeout trick with `workersMax=0` and `purge-queue`) as the fallback if the adapter test inference fails after the rolling update window.**

The combined approach:
1. After `saveEndpoint` updates `LORA_MODULES`, poll for 5 minutes checking if the adapter responds correctly via test inference.
2. If after 5 minutes the adapter still isn't available (stale workers persisting), THEN fall back to the aggressive approach: set `workersMin=0, workersMax=0, idleTimeout=1`, purge queue, wait for total termination, restore config.
3. This gives the platform the chance to handle it gracefully first, then forces the issue if needed.

---

## Immediate Workaround (Right Now)

Until the code is fixed, the adapter can be made available by:

1. **Manual restart via RunPod Console:** Go to the RunPod Serverless dashboard → endpoint `780tauhj7c126b` → Settings → Save Endpoint (without changing anything). This triggers a rolling update.
2. **Wait 2–5 minutes:** RunPod will cycle workers with the already-updated `LORA_MODULES` (the env var was successfully updated at 23:46:28 — the workers just haven't been cycled to pick it up).
3. **Verify:** Test with a `/runsync` call specifying the new adapter model name.

---

## UI Problem: Infinite Polling

A secondary issue: the browser entered an infinite polling loop on `/restart-status` (150 requests over 5 minutes with no stopping condition). The frontend needs:

1. **A maximum poll count or timeout** (e.g., stop after 10 minutes regardless)
2. **Detection of the `failed` restart status** to show an error message instead of spinning forever
3. **A "Retry" or "Manual Restart" button** that appears on failure

---

---

# Letter to RunPod Support

**Subject:** Feature Request — API to Force-Restart Serverless Endpoint Workers After Environment Variable Update

---

Dear RunPod Support Team,

We are running a production vLLM serverless endpoint (ID: `780tauhj7c126b`) serving Mistral-7B-Instruct-v0.2 with multiple LoRA adapters configured via the `LORA_MODULES` environment variable. Our automated pipeline frequently deploys new LoRA adapters, which requires updating `LORA_MODULES` and ensuring workers pick up the new configuration.

### The Problem

After updating environment variables via the `saveEndpoint` GraphQL mutation, existing workers continue running with the **old** environment variable values. There is no API available to force-restart or force-terminate serverless workers so they cold-start with the updated configuration.

Our current approach — setting `workersMin` to 0 via `saveEndpoint` and polling `/health` until all workers terminate — **does not work**. Workers remain alive (2 Ready, 2 Idle) for the entire 90-second polling window and never reach 0. The `saveEndpoint` mutation correctly updates the configuration, but existing workers are not terminated.

We understand that RunPod performs rolling updates when endpoint configuration changes, marking workers as "Outdated" and replacing them at ~10% of max workers per cycle. However:

1. **There is no API visibility into the "Outdated" worker state.** The `/health` endpoint and `Endpoint.workerState` GraphQL field do not report outdated worker counts.
2. **There is no way to expedite the rolling update.** We cannot tell RunPod "replace all workers now" — it happens on RunPod's internal schedule.
3. **There is no force-terminate API for serverless workers.** The `podTerminate` mutation only applies to Pod instances, not serverless workers.

### What We Need

Any of the following would solve our use case:

1. **A `restartEndpointWorkers` GraphQL mutation** that forces all workers to terminate and cold-start with the latest configuration. This is the most direct solution.

2. **An "Outdated" count in the `/health` response or `workerState` GraphQL field.** If we could see `{workers: {idle: 2, running: 0, outdated: 2}}`, we could poll until `outdated` reaches 0 to know when the rolling update is complete.

3. **A `forceRollingUpdate` parameter on `saveEndpoint`** that immediately cycles all workers rather than waiting for RunPod's internal schedule.

4. **Documentation on the exact behavior of `saveEndpoint` regarding worker lifecycle.** Specifically: when env vars are updated, are existing workers terminated? If so, on what timeline? Is there a way to control this?

### Our Environment

- **Endpoint type:** Queue-based Serverless (vLLM)
- **GPU:** 48GB tier (L40/L40S/6000 Ada)
- **Workers:** Min 1, Max 4
- **Use case:** Production inference with dynamically-deployed LoRA adapters
- **Update frequency:** Several times per week (each adapter training cycle produces a new adapter)
- **Impact:** After each adapter deployment, the new adapter is unusable until all workers restart. Currently this requires manual intervention via the RunPod console.

### Reproduction Steps

1. Create a serverless endpoint with `workersMin=1`, `workersMax=4`
2. Wait for workers to be ready (e.g., 2 idle workers)
3. Call `saveEndpoint` mutation to update environment variables
4. Call `saveEndpoint` mutation with `workersMin=0`
5. Poll `GET /health` — **workers never reach 0**

We appreciate RunPod's excellent platform and understand that serverless worker lifecycle management is complex. We'd welcome any guidance on the best approach to achieve reliable environment variable updates on running serverless endpoints, or any plans to add force-restart capabilities to the API.

Thank you for your time.

Best regards,  
BrightRun Development Team

---

## Summary of All Findings

| Finding | Detail |
|---------|--------|
| **Root cause** | `saveEndpoint(workersMin: 0)` is a config change, not a kill command. Workers persist. |
| **Why hot-reload fails** | RunPod serverless proxy doesn't expose vLLM's `/v1/load_lora_adapter` (returns 404). |
| **Why 90s is too short** | RunPod rolling updates run at 10% of maxWorkers per cycle. With 4 workers, full replacement takes 2–5 minutes. |
| **Missing API** | No `forceTerminateWorkers` or `restartEndpoint` mutation exists in RunPod GraphQL. |
| **Worker state visibility** | No "Outdated" count exposed via `/health` or GraphQL `workerState`. |
| **Recommended fix** | Trust rolling update + verify via test inference (5 min timeout). Fall back to idleTimeout=1 + workersMax=0 + purge-queue if needed. |
| **Immediate workaround** | Re-save endpoint in RunPod console (triggers rolling update). Wait 2–5 minutes. Test adapter. |
| **UI bug** | Browser polls `/restart-status` indefinitely on failure — needs timeout and error detection. |

---
---

# Revised Solution: `workersMin=0` Always + `workersMax=0` Toggle

**Timestamp:** 2026-03-05 ~01:15 UTC  
**Context:** User feedback on original Solution A–D recommendations. User observed an "Outdated" worker stuck for 1+ hour on endpoint `780tauhj7c126b`, confirming Solution A (trust rolling update) is unacceptable. User proposes `workersMin=0` permanently with `workersMax=0` toggle for adapter refresh.

---

## User's Proposal

1. Set `workersMin = 0` **permanently** on the endpoint. Never change it. Cold starts are acceptable — the system does not require always-on warm workers.
2. When deploying a new adapter, toggle `workersMax = 0` to force all workers down.
3. Set `idleTimeout = 1` simultaneously to make workers terminate almost instantly when idle.
4. Wait for all workers to drain to zero.
5. Restore `workersMax` and `idleTimeout` to normal values. New requests trigger cold worker starts with the updated `LORA_MODULES`.

---

## Analysis: Will This Work?

**Yes. This is the correct approach and I recommend it.** Here's why:

### Why `workersMin=0` permanently changes everything

The observed failure — 4 workers refusing to terminate for 90+ seconds and an "Outdated" worker stuck for 1+ hour — is almost certainly caused by **active workers** (workers held alive by `workersMin ≥ 1`).

RunPod has two classes of serverless workers:

| Worker Type | Created By | Behavior | Terminates When |
|-------------|-----------|----------|-----------------|
| **Active** ("always-on") | `workersMin ≥ 1` | RunPod keeps them alive to meet the minimum. Eliminates cold starts. | Only removed during rolling updates, on RunPod's schedule. **User cannot force termination.** |
| **Flex** (on-demand) | Autoscaler, in response to job queue depth | Scale up based on demand, scale down when idle. | `idleTimeout` expires AND no queued work AND autoscaler decides to remove |

The current code sets `workersMin = 1` during normal operation, creating at least 1 active worker. When it toggles to `workersMin = 0` for refresh, that active worker doesn't behave like a flex worker — RunPod still treats the rolling update cycle as the mechanism for replacing it, not the idle timeout. This is why the "Outdated" worker sat there for an hour.

**With `workersMin = 0` permanently, ALL workers are flex workers.** Flex workers:
- Respect `idleTimeout` properly
- Can scale to 0 when there's no demand
- Will terminate when `workersMax` is set to 0 (autoscaler target = 0, no minimum floor)

### Why `workersMax = 0` is the kill switch

Setting `workersMax = 0` tells the autoscaler: "the maximum number of workers you can have is zero." Combined with `workersMin = 0`:
- No new workers can spin up
- The autoscaler's target is 0
- Existing flex workers must drain

### Why `idleTimeout = 1` accelerates the drain

RunPod `idleTimeout` is measured in **seconds** (confirmed by RunPod docs: "Time in seconds an idle worker will be kept alive"). Default is 5 seconds. Setting to 1 means:
- A worker that finishes its current job waits 1 second for a new job
- If no new job arrives in 1 second, the worker terminates
- Combined with `purge-queue` (clears the job queue), there will be no new jobs to pick up

### What about workers actively processing a request?

Workers that are `running` (actively processing an inference request) will:
1. Finish their current request (this is safe — we don't want to interrupt a user's inference)
2. Go idle
3. Wait 1 second (the new `idleTimeout`)
4. No new work arrives (queue is purged, `workersMax = 0` prevents new scaling)
5. Terminate

This means the drain time = max(time remaining on longest active request) + 1 second. For inference requests (typically 5–30 seconds), total drain should be under 1 minute.

---

## The Complete Solution

### Permanent Configuration (one-time, manual or code)

Set `workersMin = 0` on endpoint `780tauhj7c126b` and **never change it again**. This can be done once in the RunPod console and then enforced by always passing `workersMin: 0` in all `saveEndpoint` calls.

### Adapter Refresh Flow (code changes)

```
auto-deploy-adapter.ts                     refresh-inference-workers.ts (REWRITTEN)
───────────────────                        ─────────────────────────────────────────
saveEndpoint({                             Step 1: SAVE original workersMax + idleTimeout
  env: [LORA_MODULES=...updated...]                 saveEndpoint({
})                                                    workersMin: 0,     (always)
    ↓                                                 workersMax: 0,     (kill switch)
emit pipeline/adapter.deployed                        idleTimeout: 1     (fast drain)
    ↓                                               })
triggers refresh-inference-workers                   POST /purge-queue   (clear job queue)
                                           
                                           Step 2: POLL /health until total workers = 0
                                                   Timeout: 5 minutes, poll every 10s
                                                   Expected: < 1 minute for flex workers
                                           
                                           Step 3: RESTORE config
                                                   saveEndpoint({
                                                     workersMin: 0,     (always)
                                                     workersMax: original,
                                                     idleTimeout: original
                                                   })
                                           
                                           Step 4: WAIT for workers ready
                                                   Poll /health until ready > 0 || idle > 0
                                                   These will be FRESH workers with new env
                                                   Timeout: 5 minutes (cold start = model load)
                                           
                                           Step 5: VERIFY adapter
                                                   POST /runsync with adapter model name
                                           
                                           Step 6: MARK complete in DB
```

### Step-by-Step Implementation Detail

**Step 1: Aggressive scale-down + queue purge**
```typescript
// Save original config for later restore
const originalWorkersMax = ep.workersMax;
const originalIdleTimeout = ep.idleTimeout;

// Set workersMax=0, idleTimeout=1 (workersMin is ALREADY 0, permanently)
await graphql(saveEndpointMutation, {
  input: {
    ...fullEndpointConfig,
    workersMin: 0,
    workersMax: 0,
    idleTimeout: 1,
  }
});

// Purge job queue so idle workers have nothing to pick up
await fetch(`${INFERENCE_API_URL}/purge-queue`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
});
```

**Step 2: Poll until all workers are gone**
```typescript
const maxWaitMs = 300_000; // 5 minutes (generous — expect < 1 min)
const pollIntervalMs = 10_000; // 10 seconds
const startMs = Date.now();

while (Date.now() - startMs < maxWaitMs) {
  const state = await getWorkerState(); // GET /health
  const total = state.ready + state.idle + state.running + state.initializing;
  if (total === 0) break;
  console.log(`[worker-refresh] Draining: total=${total} (R:${state.ready} I:${state.idle} Ru:${state.running})`);
  await new Promise(r => setTimeout(r, pollIntervalMs));
}
// If still not 0 after 5 min, log warning but proceed with restore anyway
```

**Step 3: Restore config**
```typescript
await graphql(saveEndpointMutation, {
  input: {
    ...fullEndpointConfig,
    workersMin: 0,          // Always zero
    workersMax: originalWorkersMax,
    idleTimeout: originalIdleTimeout,
  }
});
```

**Step 4: Wait for fresh workers (cold start)**
```typescript
// New workers will cold-start with the updated LORA_MODULES
const readyMaxWaitMs = 300_000; // 5 minutes
// vLLM cold start = download model + load weights + initialize LoRA adapters
// Expect 60-120 seconds for Mistral-7B + 6 LoRA adapters
```

**Step 5: Verify adapter via test inference**
```typescript
const res = await fetch(`${INFERENCE_API_URL}/runsync`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
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
```

---

## Risk Analysis

### Risk 1: Function crashes between Step 1 and Step 3

**Scenario:** After setting `workersMax=0`, the Inngest function fails (Vercel timeout, network error, unhandled exception). The endpoint is stuck at `workersMax=0` — completely dead.

**Mitigation:** Use a `try/finally` block. The `finally` block ALWAYS restores `workersMax` and `idleTimeout`, even on error. This is critical. Also, add a Supabase row that records the "original config" BEFORE Step 1, so a manual recovery script can restore it even if the Inngest function dies completely.

```typescript
try {
  // Step 1: Scale down
  // Step 2: Poll
} finally {
  // Step 3: ALWAYS restore, even on error
  await graphql(saveEndpointMutation, {
    input: { ...config, workersMin: 0, workersMax: originalMax, idleTimeout: originalTimeout }
  });
}
```

**Severity:** Medium. The `finally` block makes this very unlikely to cause lasting damage.

### Risk 2: Inference requests during the blackout window

**Scenario:** While `workersMax=0`, any inference requests will queue and eventually time out. Users hitting the chat page during this window will get errors.

**Duration:** Expected blackout = drain time (< 1 min) + cold start time (60–120s) = roughly **2–3 minutes**.

**Mitigation:** 
- This is acceptable per the user (cold starts are fine, no always-on requirement).
- The UI should show "Workers refreshing — new adapter being loaded" during this window.
- The `endpoint_restart_log` DB row tracks status in real time for the UI.

### Risk 3: `idleTimeout=1` is TOO aggressive

**Scenario:** After restoring `workersMax`, new workers spin up, serve one request, then die after 1 second because we forgot to restore `idleTimeout`.

**Mitigation:** The `idleTimeout` is restored to its original value in Step 3 (same `saveEndpoint` call that restores `workersMax`). As long as Steps 1 and 3 are atomic, this is not a risk.

### Risk 4: RunPod doesn't respect `workersMax=0` immediately

**Scenario:** Even with `workersMax=0` and `idleTimeout=1`, RunPod's autoscaler takes a few cycles to act on the change.

**Likelihood:** Low with flex workers (which is what all workers are when `workersMin=0`). The idle timeout is enforced per-worker — it doesn't wait for an autoscaler cycle.

**Mitigation:** The 5-minute polling window in Step 2 provides generous buffer. If workers still haven't drained in 5 minutes, log a warning and proceed with config restore anyway (the next cold start will still pick up the new env vars).

---

## Why Solution A (Trust Rolling Update) Is Rejected

Evidence from production: an "Outdated" worker has been stuck on endpoint `780tauhj7c126b` for **over 1 hour**. Rolling updates are unreliable for active workers maintained by `workersMin ≥ 1`. The user needs adapters available to querying users within minutes of deployment, not hours. Rolling updates are a background optimization, not a reliable deployment mechanism.

---

## Solution D (Blue/Green) — Complexity Analysis

The user asked: "What are the risks with managing endpoint lifecycle? Why is it complex?"

### What Blue/Green Would Require

1. **Create new endpoint** via `createEndpoint` GraphQL mutation with the new `LORA_MODULES` in `env`.
2. **Wait for new endpoint** to have healthy workers (cold start: 60–120s).
3. **Update all references** — every place in the codebase and database that stores endpoint ID `780tauhj7c126b` must be atomically switched to the new endpoint ID.
4. **Delete old endpoint** via `deleteEndpoint` GraphQL mutation.

### Where the Complexity Lives

| Concern | Detail |
|---------|--------|
| **Cost** | Two endpoints running simultaneously during the transition window (2–3 minutes). Both consume GPU resources. With L40S at ~$0.69/hr, this adds ~$0.02 per deployment. Trivial cost, but RunPod may charge differently for endpoint provisioning. |
| **Endpoint ID sprawl** | Every deployment creates a new endpoint ID. Code currently has `780tauhj7c126b` hardcoded or stored in `RUNPOD_ENDPOINT_ID` env var, in `pipeline_inference_endpoints` DB rows, and in `INFERENCE_API_URL`. All must be updated atomically. |
| **Template management** | `createEndpoint` requires the full template configuration (Docker image, GPU type, env vars, volume mounts, scaling config). Currently this is configured once in the RunPod console. With blue/green, the code must know the complete endpoint template — any console-only settings would be lost. |
| **GPU availability** | Creating a new endpoint requires GPU resources. If RunPod's L40S capacity is low, the new endpoint may queue for an unknown time before getting a GPU. The old endpoint can't be deleted until the new one is confirmed healthy. |
| **Failure recovery** | If `createEndpoint` succeeds but workers never become healthy (bad template, GPU error, vLLM crash on new adapter), the old endpoint was already serving correctly and must be kept. Need rollback logic. |
| **Cleanup reliability** | If `deleteEndpoint` fails after the switch (network error, API hiccup), you accumulate dead endpoints consuming resources. Need a cleanup sweep. |
| **Network volume** | The endpoint uses a network volume (`networkVolumeId`). Can two endpoints share the same volume? If not, adapter files must be available on both. |
| **Race during transition** | During the 2–3 second window between "update DB to new endpoint" and "users hit new endpoint," some requests may still route to the old endpoint. Not a data integrity issue, but users may get stale adapter responses. |
| **Inngest event plumbing** | `auto-deploy-adapter.ts` and `refresh-inference-workers.ts` reference the endpoint ID. The event payload carries it. Both would need to dynamically resolve the "current active endpoint" from DB instead of using a static env var. |
| **Vercel env var update** | If `RUNPOD_ENDPOINT_ID` and `INFERENCE_API_URL` are Vercel env vars, changing them requires a Vercel redeploy or at minimum a serverless function restart. This can't be done programmatically from within the app. A DB lookup is the only viable approach. |

### Blue/Green Verdict

Blue/green is the **most reliable** approach (guaranteed fresh workers, zero-downtime transition) but introduces significant infrastructure management complexity. It's the right strategy if `workersMax=0` toggle doesn't work — but given that `workersMin=0` permanently + `workersMax=0` + `idleTimeout=1` + `purge-queue` should handle flex workers correctly, blue/green is overkill.

**Recommendation: Hold blue/green as the Plan B.** If the `workersMax=0` toggle approach fails in testing (workers still don't drain), revisit blue/green. The implementation would take ~2 hours: endpoint creation/deletion logic, DB-based endpoint ID resolution, cleanup sweep, and rollback handling.

---

## Final Recommendation

### Implement the `workersMax=0` Toggle Approach

| Action | Detail |
|--------|--------|
| **1. Permanent config change** | Set `workersMin = 0` on endpoint `780tauhj7c126b` in RunPod console RIGHT NOW. Verify in code that all `saveEndpoint` calls always pass `workersMin: 0`. |
| **2. Rewrite `refresh-inference-workers.ts`** | Replace the current 6-step logic with: save original config → set `workersMax=0` + `idleTimeout=1` → purge queue → poll until 0 (5 min) → restore config → wait for ready → verify adapter → mark complete. Wrap Steps 1–2 in `try/finally` to guarantee config restoration. |
| **3. Rewrite `restart-inference-workers.ts`** | Same pattern as above for the manual restart trigger. |
| **4. Fix `EndpointRestartTool.tsx`** | Add 10-minute poll timeout + error state + retry button. |
| **5. Test in production** | Deploy the next adapter, observe whether all flex workers drain to 0 within the 5-minute window. |

### If `workersMax=0` fails to drain workers

Escalate to Solution D (blue/green). The `workersMax=0` approach should work for flex workers — but if RunPod's autoscaler has bugs or undocumented behavior with serverless workers, we have a fallback.

---

## Quick Reference: `idleTimeout` Units

RunPod documentation confirms: **`idleTimeout` is in seconds.**

From RunPod's `EndpointInput` GraphQL schema:
> `idleTimeout: Int` — Time in seconds a worker will stay alive after completing a job. Default: 5.

Setting `idleTimeout: 1` = worker terminates 1 second after going idle. This is the minimum practical value (0 may be interpreted as "use default" — untested, safer to use 1).

---
---

# Letter to RunPod Support — API vs UI Configuration Discrepancy

**Date:** 2026-03-05  
**Subject:** Serverless Endpoint UI Does Not Reflect API-Set Configuration — Clarification Needed on Source of Truth  
**Endpoint:** `780tauhj7c126b`

---

## Background

We manage a production vLLM serverless endpoint (ID: `780tauhj7c126b`) via the `saveEndpoint` GraphQL mutation. Our automated pipeline updates the `LORA_MODULES` environment variable multiple times per week as new LoRA adapters are trained and deployed. The pipeline reads the current endpoint config via a GraphQL query, modifies the `env` array, and writes it back via `saveEndpoint` — a full PUT that includes all fields (`id`, `name`, `gpuIds`, `idleTimeout`, `locations`, `networkVolumeId`, `scalerType`, `scalerValue`, `workersMin`, `workersMax`, `templateId`, `env`).

**The API calls work correctly.** We have confirmed via:
1. The `saveEndpoint` mutation response echoes back the updated `env` array with the correct values.
2. A subsequent GraphQL query for the endpoint returns the updated `LORA_MODULES` with all 5–6 adapters.
3. Workers that cold-start after the API update correctly load all adapters from `LORA_MODULES`.

---

## The Problem

**The RunPod web UI does not reflect changes made via the GraphQL API.**

When we navigate to the endpoint's settings page in the RunPod console (Serverless → Endpoint → `780tauhj7c126b` → Edit Endpoint → Environment Variables), the `LORA_MODULES` field shows:

```json
[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

This is the **very first value** we set manually in the UI weeks ago, when we had only one adapter. It has **never** updated to reflect the subsequent API calls that added 5 additional adapters. The API-side value (confirmed by GraphQL query) is a 5–6 element array. The UI still shows the original 1-element array.

This is not a browser caching issue. We have verified by:
- Hard-refreshing (Ctrl+Shift+R)
- Clearing browser cache and cookies
- Opening the endpoint settings in an incognito/private browsing window
- Testing in a different browser entirely
- Waiting days between checks

The stale value persists in all cases.

---

## Our Critical Concern

The `saveEndpoint` mutation is a **full PUT operation** — it requires sending ALL endpoint fields, not just the ones being changed. If a field is omitted, RunPod resets it to a default value. We have verified this behavior firsthand (omitting `env` wipes all environment variables).

**This creates a dangerous ambiguity when using the UI:**

### Scenario We Need Clarified

1. Our API sets `LORA_MODULES` to a 6-adapter array via `saveEndpoint`. ✅ Confirmed working via API response.
2. We open the RunPod UI to adjust a different setting (e.g., `Max Workers`).
3. The UI shows `LORA_MODULES` as the old 1-adapter value.
4. We change `Max Workers` from 4 to 2 and click "Save" in the UI.

**Question: Does the UI save operation overwrite `LORA_MODULES` back to the stale 1-adapter value shown in the UI?**

If yes, every manual UI edit silently destroys our API-configured environment variables. This would make it impossible to safely use both the API and the UI on the same endpoint.

If no — if the UI save is somehow a partial update that only writes the fields the user explicitly changed — then:
- **Why does the UI display stale values?** Showing incorrect data is misleading and erodes trust in the configuration.
- **What is the actual source of truth?** Is there one canonical config store, or do the API and UI maintain separate state?
- **How does the UI decide what to send on save?** Does it send all fields (like the API's full PUT), or only changed fields?

### Additional Observations

This discrepancy may not be limited to environment variables. We also manage `workersMin`, `workersMax`, and `idleTimeout` via the API. We cannot verify whether the UI reflects those API changes accurately, because unlike the multi-adapter `LORA_MODULES` value, numeric fields are harder to distinguish as "stale" vs "current."

It is also unclear whether the reverse is true: **if we change a value in the UI, does the API query reflect that change immediately?** We believe so (the API reads seem to be the source of truth), but we have not exhaustively tested this.

---

## What We Need

### 1. Confirmation of Source of Truth

Is there one canonical configuration store for a serverless endpoint, or do the API and UI maintain separate state? Specifically:

- When `saveEndpoint` is called via GraphQL, does it write to the same store that the UI reads from?
- When the UI "Save" button is clicked, does it write to the same store that the GraphQL query reads from?
- If both write to the same store, why does the UI display stale values?

### 2. UI Save Behavior

When a user edits an endpoint in the UI and clicks "Save":

- Does the UI send ALL fields (full PUT, like the API), including the stale values shown in the UI editor?
- Or does the UI send only the fields the user explicitly modified (partial update / PATCH)?
- If it's a full PUT with stale values, is there any protection against overwriting API-configured settings?

### 3. Known Issue or Bug?

Is this a known issue with the RunPod dashboard? Is there a fix planned? If this is expected behavior, what is the recommended workflow for teams that manage endpoints via both the API and the UI?

### 4. Safe Workflow Recommendation

Given this discrepancy, what is the safest way to manage an endpoint that is primarily configured via the API but occasionally needs manual UI adjustments (e.g., changing GPU type, adjusting max workers)?

Our current workaround is to **never touch the UI** after initial setup — all changes go through the API. But this makes it impossible to use console-only features or quickly adjust settings during debugging sessions without risking a silent config overwrite.

---

## Reproduction Steps

1. Create a serverless endpoint via the RunPod console. Set an environment variable `TEST_VAR` = `"original_value"`. Save.
2. Via GraphQL API, call `saveEndpoint` with the full endpoint config, changing `TEST_VAR` to `"api_updated_value"`. Confirm the response echoes `"api_updated_value"`.
3. Query the endpoint via GraphQL — `TEST_VAR` should show `"api_updated_value"`. ✅
4. Open the endpoint's Edit page in the RunPod console UI.
5. **Observe:** Does `TEST_VAR` show `"api_updated_value"` or `"original_value"`?
6. Without changing `TEST_VAR`, modify a different field (e.g., `Max Workers`) and click Save.
7. Query the endpoint via GraphQL again. **Check:** Is `TEST_VAR` still `"api_updated_value"`, or has it been reverted to `"original_value"`?

Step 5 and Step 7 are the critical observations. In our experience, Step 5 shows the stale value, and we have been too cautious to execute Steps 6–7 for fear of destroying our production configuration.

---

## Our Environment

- **Endpoint ID:** `780tauhj7c126b`
- **Endpoint type:** Queue-based Serverless (vLLM)
- **API usage:** `saveEndpoint` GraphQL mutation, authenticated via `api_key` query parameter
- **Environment variables managed via API:** `LORA_MODULES`, `MAX_LORAS` (others set once via UI and not changed)
- **Scaling settings managed via API:** `workersMin`, `workersMax`, `idleTimeout`
- **Frequency of API updates:** Multiple times per week (each adapter deployment cycle)
- **UI usage:** Occasional manual checks, debugging, GPU type changes

---

## Impact

This issue affects our ability to:

1. **Trust the UI for endpoint inspection.** We cannot use the console to verify our endpoint's current configuration — the displayed values may be stale.
2. **Safely make manual UI changes.** We avoid using the UI "Save" button entirely because we cannot determine whether it will overwrite API-set values.
3. **Debug configuration issues.** When something goes wrong (e.g., a worker doesn't load an adapter), we cannot tell from the UI whether the environment variables are correct. We must always query the API separately.
4. **Onboard team members.** New team members naturally look at the RunPod console to understand endpoint configuration. The stale values in the UI are actively misleading.

We appreciate any clarification or documentation on this behavior. If this is a known bug with a timeline for a fix, that information alone would be very helpful for our planning.

Thank you for your time.

Best regards,  
BrightRun Development Team

---
---

# Test Run Failure Analysis — adapter-4222c6c1 (2026-03-05)

**Timestamp:** 2026-03-05 ~01:30–04:15 UTC  
**Log files:** `vercel-log-105.csv` (11,082 lines), `Inngest-Log-105.txt` (58 lines)  
**Adapter:** `adapter-4222c6c1` (job `4222c6c1-531c-4142-b260-303f0ee5ebcc`)  
**Endpoint:** `780tauhj7c126b`  
**Status:** ❌ FAILED — Workers never came back. Endpoint stuck at `workersMax=0`. Both UI spinners stuck indefinitely.

---

## Symptoms

1. **Adapter detail page** (`/workbase/.../adapter/4222c6c1-...`): Endpoint Restart tool showing spinning progress indefinitely.
2. **Behavior Chat page** (`/workbase/.../fine-tuning/chat`): "Your adapter is being deployed. Workers are cycling. This takes 2–3 minutes." — stuck for hours. Chat completely blocked.
3. **RunPod console:** 0 workers for 1+ hour after the job ran. `workersMax=0` still set.

---

## Root Cause

**The `workersMax=0` floor bug.** The code faithfully restored `workersMax` to the value it was set to at deploy time — which was 0.

### Event Timeline

| Time (UTC) | Event |
|------------|-------|
| ~01:13 | `auto-deploy-adapter` runs for `adapter-4222c6c1`. Reads endpoint config: `workersMax=0` (user had set this manually). Emits `pipeline/adapter.deployed` with `originalWorkersMax: 0`. |
| ~01:33 | `refresh-inference-workers` (NEW code, first deployment) starts. Step 1 (`scale-down-workers`): `savedWorkersMax = originalWorkersMax \|\| ep.workersMax` → `0 \|\| 0` → **0**. Sets `workersMax=0, idleTimeout=1`. |
| ~01:33 | Step 2 (`wait-for-workers-terminated`): Workers already at 0 (they were never up — `workersMax` was already 0). Drain succeeds immediately. `finally` block restores `workersMax=0, idleTimeout=original`. |
| 01:39:20 | Step 3 (`wait-for-workers-ready`): Starts polling `/health`. Workers: `R:0 I:0 Ru:0 In:0`. Workers **can never spin up** because `workersMax=0`. |
| 01:39:30–01:43:52 | 29 consecutive polls, every 10 seconds: `R:0 I:0 Ru:0 In:0` — no change. |
| 01:44:20 | **Vercel Runtime Timeout:** `Task timed out after 300 seconds` (5-minute Vercel serverless limit). HTTP 504 returned to Inngest. |
| 01:44:20 | Function terminates. `endpoint_restart_log` stuck in an in-progress state. `pipeline_inference_endpoints` stuck at `deploying`. |
| ~01:45 onward | Inngest retries (retries: 1). Second attempt hits same bug: `originalWorkersMax=0` from the event payload, same result. FUNCTION_INVOCATION_TIMEOUT again at 5:33:44 PM. |
| 04:15+ | Browser still polling `/api/pipeline/adapters/status` and `/restart-status` every few seconds. Both pages stuck in spinner state. |

### The Bug: `originalWorkersMax || ep.workersMax`

Line 162 of `refresh-inference-workers.ts`:
```typescript
const savedWorkersMax = originalWorkersMax || ep.workersMax;
```

JavaScript `||` treats `0` as falsy. When `originalWorkersMax=0` AND `ep.workersMax=0`:
- `0 || 0` evaluates to `0`
- `savedWorkersMax = 0`
- The `finally` block restores `workersMax=0` — endpoint is permanently dead

**Same bug existed in `restart-inference-workers.ts` line 149.**

### Secondary Issue: Vercel 300-Second Timeout

The `wait-for-workers-ready` step has a 5-minute loop (`300_000ms`), but Vercel serverless functions also have a 300-second hard timeout on the Pro plan. The internal loop timeout and the Vercel timeout race each other. The Vercel timeout killed the function at exactly 300 seconds, before the internal loop could complete and log a graceful timeout message.

This means the function never reached Steps 4 (verify adapter) or 5 (mark complete). The DB rows were never updated to terminal states.

---

## Prior Run: adapter-3fa42082

The Inngest log also shows a **prior** run for `adapter-3fa42082` (event timestamp: `1772667989855`, error at 3:46:29 PM):

```
originalWorkersMax: 2
originalWorkersMin: 0
Error: Workers did not terminate within 90s
```

This was the **OLD code** (pre-rewrite, deployed before the `workersMax=0` toggle approach). It failed because the old code only set `workersMin=0` without touching `workersMax` or `idleTimeout`, and only waited 90 seconds — the original root cause from the earlier analysis.

This confirms the Vercel deployment that included our rewritten code was active by the time `adapter-4222c6c1` ran (the logs show `[worker-refresh]` prefix and 10-second poll intervals, which are from the new code).

---

## Code Fix Applied

**Three files patched:**

### 1. `refresh-inference-workers.ts` — line 162

```typescript
// BEFORE (buggy):
const savedWorkersMax = originalWorkersMax || ep.workersMax;

// AFTER (fixed):
// GUARD: Never restore workersMax to 0 — that would leave the endpoint permanently dead.
// Use event value, fall back to current endpoint value, floor at 1.
const savedWorkersMax = Math.max(originalWorkersMax ?? ep.workersMax ?? 1, 1);
```

### 2. `restart-inference-workers.ts` — line 149

Same fix applied.

### 3. `auto-deploy-adapter.ts` — both return paths

```typescript
// BEFORE (buggy):
originalWorkersMax: workersMax,    // could be 0

// AFTER (fixed):
// GUARD: Floor at 1 so the refresh function never restores workersMax to 0
originalWorkersMax: Math.max(workersMax || 1, 1),
```

Both the normal path and the early-return (adapter already in LORA_MODULES) path were fixed.

### Why `Math.max(..., 1)` instead of `|| 1`

- `|| 1` would also work for the 0 case, but `??` is semantically correct (only falls through on `null`/`undefined`, not on `0`)
- `Math.max(..., 1)` is the final safety net — even if both `originalWorkersMax` and `ep.workersMax` are somehow 0, the floor ensures workers can always spin up
- This is a **defense-in-depth** approach: the auto-deploy emitter guards at the source, and the consumer guards at the destination

---

## Database Cleanup SQL

Two tables need updating to clear the stuck spinners:

### 1. Clear the Chat Page Spinner

The chat page (`/workbase/.../fine-tuning/chat`) checks `pipeline_inference_endpoints.status`. Two rows (control + adapted) are stuck at `'deploying'` because the refresh function never reached Step 5 to mark them `'ready'`.

```sql
-- Clear the Chat Page spinner: mark both inference endpoints as ready
UPDATE pipeline_inference_endpoints
SET status = 'ready',
    ready_at = NOW(),
    updated_at = NOW()
WHERE job_id = '4222c6c1-531c-4142-b260-303f0ee5ebcc'
  AND status != 'ready';
```

### 2. Clear the Endpoint Restart Spinner

The adapter detail page checks `endpoint_restart_log` for in-progress status. The restart log row is stuck in an intermediate state (likely `scaling_up` or `workers_ready`) because the Vercel function timed out before finalizing.

```sql
-- Clear the Endpoint Restart spinner: mark any in-progress restart logs as failed
UPDATE endpoint_restart_log
SET status = 'failed',
    error_step = 'manual-override',
    error_message = 'Manually cleared: workersMax=0 bug caused infinite wait. See 32-doc analysis.',
    completed_at = NOW()
WHERE job_id = '4222c6c1-531c-4142-b260-303f0ee5ebcc'
  AND status IN ('initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying');
```

### 3. Critical: Set workersMax Back to a Usable Value

Before re-testing, the RunPod endpoint `workersMax` must be set to a non-zero value. **This must be done in the RunPod console OR via API:**

- Set `workersMax = 2` (or desired value) on endpoint `780tauhj7c126b`
- Verify `workersMin = 0` (should already be 0)
- Verify `idleTimeout` is at a reasonable value (5 or more)

---

## Lessons Learned

| Issue | Lesson |
|-------|--------|
| `0 \|\| 0 = 0` | Never use `\|\|` for numeric fallbacks where 0 is a valid input. Use `??` (nullish coalescing) + `Math.max()` for safety floors. |
| User sets workersMax=0 before deploy | The code must defend against this. No matter what the user configures externally, the restore path must produce a valid working endpoint. |
| Vercel 300s timeout vs internal 300s timeout | These race each other. The Vercel timeout kills the function ungracefully, leaving DB in intermediate state. Consider splitting long-running steps into separate Inngest steps to avoid the timeout. |
| `deployed` status never cleared on failure | Need an `onFailure` handler or a cleanup mechanism to set `pipeline_inference_endpoints.status = 'failed'` when the refresh function dies. |

---

## Next Steps

1. ✅ Code fix applied — `Math.max(..., 1)` floor in all three files
2. ⬜ Run the SQL cleanup above to clear both spinners
3. ⬜ Set `workersMax >= 1` on endpoint `780tauhj7c126b` in RunPod console
4. ⬜ Push code, wait for Vercel deployment
5. ⬜ Re-deploy the adapter (or trigger a manual restart) to test the fix
6. ⬜ Consider adding an `onFailure` handler to `refresh-inference-workers` that marks endpoints as `'failed'` in the DB, preventing infinite spinner on crash
---

# Session 19 — Worker Restart Retest & Training Set Reuse Analysis

**Date:** 2026-03-04  
**Context:** workersMax has been manually set to 2 in RunPod console. Code fixes (`Math.max(..., 1)`) are deployed. Ready to retest the worker drain+restore cycle.

---

## Q1: Worker Restart Test Script

### Script Location
`pmc/product/_mapping/ux-3/build-30/33-training-set-start-adapters_v1.js`

### How to Run
```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
node pmc/product/_mapping/ux-3/build-30/33-training-set-start-adapters_v1.js
```

### What the Script Does (Step by Step)

| Step | Action | Details |
|------|--------|---------|
| 1 | **Read endpoint config** | GraphQL query to get current `workersMax`, `workersMin`, `idleTimeout`, env vars, etc. Stores `originalWorkersMax`. |
| 2 | **Check worker health** | REST call to `/health` endpoint. Logs `ready`, `idle`, `running`, `initializing` counts. |
| 3 | **Drain workers** | Sets `workersMax=0` + `idleTimeout=1` via `saveEndpoint` mutation. This tells RunPod to terminate all workers ASAP. |
| 4 | **Poll until drained** | Polls `/health` every 5s for up to 2 minutes. Waits until all worker counts hit 0. |
| 5 | **Purge queue** | POST to `/purge-queue` to clear any stuck inference requests. |
| 6 | **Restore config** | Re-reads endpoint config (since `saveEndpoint` is full PUT), then sets `workersMax = Math.max(originalWorkersMax, 1)` and `idleTimeout = originalIdleTimeout`. This is the exact same logic our code fix applies. |
| 7 | **Poll until READY** | Polls `/health` every 10s for up to 5 minutes. Waits until at least 1 worker reports `ready > 0`. |
| 8 | **Final summary** | Prints a results table showing original vs restored values, drain timing, and final worker state. |

### Script Format Choice: Node.js (not curl)

A Node.js script was chosen over curl/bash because:
- The RunPod GraphQL API requires `POST` with JSON body — clumsy in curl, especially on Windows
- `saveEndpoint` is a **full PUT** — we must read-then-write all fields, which requires parsing the GraphQL response and constructing the mutation input
- Polling loops with timing, conditional logic, and structured logging are far easier in JS
- The script uses the project's `load-env.js` to automatically load `.env.local` — no manual env var copying
- Node.js `fetch` is available in Node 18+ (which this project uses)

### Understanding Confirmation

> *"read & store the amount of workers currently set in maxWorkers, set workers to 0 to clear old workers, then set maxWorkers to whatever the prior value stored is or 1 whichever is higher"*

**Yes, your understanding is correct.** The script does exactly this:

```
originalWorkersMax = ep.workersMax    // Step 1: read & store
saveEndpoint({ workersMax: 0 })       // Step 3: set to 0
safeWorkersMax = Math.max(original, 1) // Step 6: restore (floor of 1)
saveEndpoint({ workersMax: safe })     // Step 6: apply
```

### What Else the Script Does (Beyond Minimum)

| Extra | Why |
|-------|-----|
| `idleTimeout=1` during drain | Accelerates worker eviction (RunPod reclaims idle workers faster) |
| Re-reads config before restore | `saveEndpoint` is full PUT — stale fields would clobber recent changes |
| Purge queue between drain and restore | Prevents old requests from hitting fresh workers during cold start |
| Poll with timeout logging | We can see exactly how long drain and restore take, useful for tuning Inngest step timeouts |
| Detects `workersMax=0` bug condition | Warns if the current config has the exact state that caused the original failure |

### Expected Behavior

If workers are currently at 2:
1. **Drain** should take 30-90 seconds (RunPod needs to terminate 2 GPU workers)
2. **Queue purge** is instant
3. **Restore to 2** (or 1 floor) — RunPod begins cold-starting new workers
4. **Workers READY** — vLLM + LoRA cold start typically takes 2-4 minutes

Total expected runtime: **3-6 minutes**.

If the script times out on Step 7, it's not necessarily a failure — vLLM cold start can take 5+ minutes. The script will print instructions for manual health check via curl.

---

## Q2: Can I Reuse the Same Training Set for a New Fine-Tuning Job?

### Short Answer: **Yes, absolutely. It's safe and expected.**

### How Adapter IDs Are Generated

Every fine-tuning job gets a **random UUID (v4)** generated by Postgres at insert time:

```sql
-- From supabase/migrations/20260110_create_pipeline_tables.sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

The adapter name is derived from the **first 8 characters of the job UUID**:

```typescript
// From auto-deploy-adapter.ts
const adapterName = `adapter-${jobId.substring(0, 8)}`;
const hfRepoName  = `${HF_REPO_PREFIX}-${jobId.substring(0, 8)}`;
```

So each job gets a completely unique adapter name like `adapter-b3a7c1ef`, regardless of which training set was used.

### No Uniqueness Constraints on Dataset Reuse

The `pipeline_training_jobs` table has **no unique constraint on `dataset_id`**:

```sql
dataset_id UUID REFERENCES datasets(id),  -- FK only, no UNIQUE
```

The `createPipelineJob()` function in `pipeline-service.ts` does **zero duplicate checking** — it simply inserts a new row.

### What Happens Concretely

| Aspect | First Job (e.g., `4222c6c1`) | Second Job (e.g., `b3a7c1ef`) |
|--------|------|------|
| `job_id` | `4222c6c1-531c-...` | `b3a7c1ef-9d82-...` (new random UUID) |
| `dataset_id` | `abc123` | `abc123` (same dataset — no conflict) |
| Adapter name | `adapter-4222c6c1` | `adapter-b3a7c1ef` (unique) |
| HF repo | `lora-emotional-intelligence-4222c6c1` | `lora-emotional-intelligence-b3a7c1ef` (unique) |
| Storage path | `lora-models/adapters/4222c6c1-...tar.gz` | `lora-models/adapters/b3a7c1ef-...tar.gz` (unique) |
| LORA_MODULES entry | `adapter-4222c6c1=BrightHub2/...` | `adapter-b3a7c1ef=BrightHub2/...` (separate entry) |
| DB records | Completely independent | Completely independent |

### Is a Duplicate Adapter Good or Bad?

It's not a duplicate — it's a **completely separate adapter** that happens to use the same training data. This is actually useful:
- **Reproducibility testing** — train twice with the same data to compare results
- **Different hyperparameters** — if you change epochs, learning rate, etc.
- **Clean slate** — your old job (`4222c6c1`) had a stuck deployment state; a new job starts fresh with no baggage

The only consideration: both adapters will end up in `LORA_MODULES` on the inference endpoint. vLLM loads each adapter independently, so having 2 adapters trained on the same data costs some VRAM but is functionally harmless. You can remove the old one later via the adapter detail page's "Remove" action.

### Recommendation

**Yes, create a new fine-tuning job with the same training set.** This is the cleanest way to retest the full pipeline because:
1. The new job will have a fresh UUID — no collision with the stuck `4222c6c1` records
2. The `auto-deploy-adapter` → `refresh-inference-workers` flow will run with the `Math.max(..., 1)` fix
3. You can compare the new job's behavior against the old failure logs

Before creating the new job, run the SQL cleanup from the previous section to clear the stuck spinners from job `4222c6c1`.

---

## Testing Strategy — Recommended Order

### Phase 1: Isolated API Test (Script)
```bash
node pmc/product/_mapping/ux-3/build-30/33-training-set-start-adapters_v1.js
```
This validates that the RunPod API drain+restore cycle works correctly, independent of Inngest, Vercel, or the UI. If this fails, we know the issue is at the RunPod API level.

### Phase 2: SQL Cleanup (Clear Old Spinners)
```sql
-- Clear stuck deployment status
UPDATE pipeline_inference_endpoints 
SET status = 'failed', updated_at = NOW()
WHERE job_id = '4222c6c1-531c-4142-b260-303f0ee5ebcc' 
  AND status = 'deploying';

-- Clear stuck restart log
UPDATE endpoint_restart_log 
SET status = 'failed', completed_at = NOW(), error_message = 'Manually cleared — workersMax=0 bug'
WHERE job_id = '4222c6c1-531c-4142-b260-303f0ee5ebcc' 
  AND status IN ('initiated', 'scaling_down', 'purging_queue', 'workers_terminated', 'restoring_config', 'waiting_ready');
```

### Phase 3: Full Pipeline Test (New Job via UI)
1. Go to the workbase → Fine-Tuning → New Job
2. Select the same training set
3. Start training
4. Wait for training to complete (RunPod GPU side)
5. On completion, `auto-deploy-adapter` fires → `refresh-inference-workers` fires
6. Watch the adapter detail page — spinner should resolve within 5-6 minutes
7. Test the behavior chat page — should load without spinner

### Phase 4: Verify in Logs
- Check Inngest dashboard for the `pipeline/adapter.deployed` event
- Verify `originalWorkersMax` in the event payload is **not 0** (should be 2, the current setting)
- Verify `refresh-inference-workers` completes successfully
- Check `pipeline_inference_endpoints.status` transitions to `'ready'`

---

## Updated Next Steps

1. ✅ Code fix applied — `Math.max(..., 1)` floor in all three files
2. ✅ workersMax set to 2 in RunPod console
3. ✅ Test script written (`33-training-set-start-adapters_v1.js`)
4. ⬜ Run test script (Phase 1) to validate API-level drain+restore
5. ⬜ Run SQL cleanup (Phase 2) to clear stuck spinners from job `4222c6c1`
6. ⬜ Create new fine-tuning job with same training set (Phase 3) to test full pipeline
7. ⬜ Verify in Inngest logs (Phase 4)
8. ⬜ Add `onFailure` handler to `refresh-inference-workers`

---

# Session 19b — Build Training Set: Duplicate Conversation Behavior

**Date:** 2026-03-04  
**Question:** If I add 75 conversations to an existing training set file and 25 of them are already in the file, what happens?

---

## Short Answer

**The 25 duplicates are silently skipped. No error. No duplicates written. The file is extended by exactly 50 new entries.**

---

## How It Works: Three Deduplication Layers

### Layer 1 — API Route PATCH (synchronous)

File: `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`

Compares incoming IDs against the `conversation_ids` array column in the `training_sets` DB row.  
The 25 duplicates are **silently discarded** — `newIds` = 50 only.  
Only returns HTTP 400 if **all** requested conversations are duplicates (not the case here).  
Response: `{ success: true, addedCount: 50 }` — no warning about the skipped 25.

### Layer 2 — Inngest `rebuild-training-set` function (async)

File: `src/inngest/functions/rebuild-training-set.ts`

Queries the `training_file_conversations` junction table (the authoritative record of what is in the JSONL file).  
Filters the merged list (75) again — passes only the 50 genuinely new IDs to the file service.  
This catches race conditions where Layer 1 may have been stale.

### Layer 3 — TrainingFileService (hard guard)

File: `src/lib/services/training-file-service.ts`

Throws an error if any duplicates somehow reach this layer (e.g. concurrent requests).  
If this fires, the Inngest job fails with status `'failed'` in the DB — no silent file corruption possible.

---

## Step-by-Step for the 75/25 Scenario

| Step | What happens |
|------|--------------|
| User requests Add 75 conversations | UI sends PATCH with 75 IDs |
| Layer 1 filter | 25 already in DB → silently dropped → `newIds` = 50 |
| API response | `{ success: true, addedCount: 50 }` — UI shows success |
| DB update | `conversation_count` = previous + 50. `status = 'processing'` |
| Inngest fires | `training/set.updated` with `conversationIds = mergedIds` (all previous + 50 new) |
| Layer 2 filter | Checks `training_file_conversations` junction table → confirms 50 new IDs |
| File service | Downloads existing .json from Storage, merges 50 new conversations, regenerates JSONL in-place |
| Counts updated | Junction table and `training_file` row updated |
| Status → ready | Training set returns to ready state |

---

## File Format

| File | Format | Notes |
|------|--------|-------|
| `{uuid}/training.jsonl` | JSONL | One line per **training pair** (not per conversation). First line is `_meta` header. |
| `{uuid}/training.json` | JSON | Full aggregated JSON with metadata header + conversations array |

A single conversation can produce **multiple JSONL lines** (one per turn used as a training pair). Adding 50 conversations may add 100–300+ JSONL rows depending on conversation length.

---

## Duplicate Identification Key

Conversations are identified by **`conversation_id`** (UUID string), not by content hash. The service calls `resolveToConversationIds()` first to normalize PK vs business-key formats before any dedup check.

---

## Edge Cases

| Scenario | Behavior |
|---------|----------|
| All 75 are duplicates | HTTP 400: `All selected conversations are already in this training set` |
| 50 are duplicates, 25 new | 25 added, 50 silently skipped, success response |
| Two concurrent requests with overlap | One succeeds; Layer 3 throws on the second — one Inngest job fails |
| Conversation deleted after being added | ID stays in junction table — safe, produces no JSONL rows for that ID |


---

# Session 19c — Fine-Tuning Chat Page: System Prompt Analysis

**Date:** 2026-03-04
**Route:** `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/chat`
**Question:** Are there any system prompt instructions (especially emotional intelligence language) baked into either chat box on this page?

---

## The Two Chat Boxes

The page renders a side-by-side comparison via the `MultiTurnChat` component:

| Chat Box | Endpoint Type | Description |
|----------|--------------|-------------|
| **Control** | `control` | Base Mistral 7B Instruct v0.2 — NO LoRA adapter |
| **Adapted** | `adapted` | Same base model WITH the LoRA adapter applied |

Both boxes share the **same** system prompt (set once per conversation at creation time).

---

## Full Request Chain

```
Page (fine-tuning/chat/page.tsx)
  └─ <MultiTurnChat workbaseId jobId />
       └─ useDualChat hook
            ├─ POST /api/pipeline/conversations          (create conversation, systemPrompt = "")
            └─ POST /api/pipeline/conversations/[id]/turn
                 └─ multi-turn-conversation-service.ts
                      ├─ buildMessagesForEndpoint()     (system message skipped if null)
                      ├─ callInferenceEndpoint() → control endpoint (no adapter)
                      └─ callInferenceEndpoint() → adapted endpoint (with LoRA adapter)
```

---

## System Prompt for Each Chat Box

| Chat Box | Default System Prompt | How It Gets Set |
|----------|-----------------------|-----------------|
| **Control** | **None** (null) | `conversation.system_prompt` stored as `null` in DB |
| **Adapted** | **None** (null) | Same conversation record — both boxes share it |

The `systemPrompt` state in `MultiTurnChat` initializes to `''` (empty string). When `createConversation` is called, it stores `system_prompt = request.systemPrompt || null` → **`null`**.

In `buildMessagesForEndpoint()` (`multi-turn-conversation-service.ts`):

```typescript
if (systemPrompt) {
  messages.push({ role: 'system', content: systemPrompt });
}
// systemPrompt is null/undefined → this block is SKIPPED
```

**What is actually sent to the LLM (both boxes):**

```json
{
  "messages": [
    { "role": "user", "content": "<user message>" },
    { "role": "assistant", "content": "<prior response if multi-turn>" },
    { "role": "user", "content": "<current message>" }
  ],
  "max_tokens": 2048,
  "temperature": 0.7
}
```

No `system` message is included at all.

---

## EI Language Search Results

EI-related strings **do** exist in the codebase, but in completely separate pipelines:

| File | EI Content | Used By |
|------|-----------|---------|
| `conversation-enrichment-service.ts` | "You are an emotionally intelligent financial planning chatbot..." | **Training data enrichment** pipeline only — not inference |
| `parameter-assembly-service.ts` | "Money is emotional - Acknowledge feelings before facts in EVERY response" | **Batch training data generation** only — not inference |

`multi-turn-conversation-service.ts` imports **neither** of these services. They are completely out of scope for live inference on the fine-tuning chat page.

---

## Verdict

**There are zero hardcoded emotional intelligence instructions in the system prompt for either chat box.** Both default to no system message at all.

The emotional intelligence behavior you observed is coming entirely from the **fine-tuned LoRA adapter weights** — the adapter was trained on enriched conversations that included EI-style responses, and that learned behavior is baked into the model weights, not injected via a prompt at runtime.

This is the expected and correct result: **the adapter is doing its job**.

> **Note:** A user can in theory provide a custom system prompt via the conversation creation API, but the fine-tuning chat page does not currently render a text input for this (the prop exists in the component interface but is not exposed as a visible field in the UI).
