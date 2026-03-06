# Adapter QA Analysis: `adapter-bae71569` NotFoundError
**Date:** February 26, 2026  
**Session:** QA Testing — `/pipeline/jobs/[id]/test`  
**Job ID:** `bae71569-07b1-41ff-b258-f1e2c62c94b6`  
**Error:** `Inference failed: {'message': 'The model adapter-bae71569 does not exist.', 'type': 'NotFoundError', 'param': 'model', 'code': 404}`

---

## 1. Summary

The LoRA-adapted side of the A/B test failed with a vLLM `NotFoundError (404)`. The control side (base model, no adapter) succeeded. The failure was **not a code bug in the request path** — the request was formed correctly and routed correctly. The failure was a **RunPod worker state problem**: the workers that cold-started to serve the request were initialized with an incomplete `LORA_MODULES` snapshot that did not include `adapter-bae71569`.

---

## 2. Confirmed Evidence

### 2a. Control Side Succeeded
The control request (`useAdapter: false`, endpointId `virtual-inference-bae71569-control`) completed successfully:
- Poll count 16 → `COMPLETED`
- Response: 1,641 chars, 335 tokens, `finishReason: 'stop'`

### 2b. Adapted Side Failed Immediately
The adapted request (`useAdapter: true`, `adapterName: 'adapter-bae71569'`) failed:
- Poll count 16 → `FAILED`  
- `isRetryable: false` (correct — the Vercel wrapper correctly tagged a 404 as non-retryable)
- Error came from `serving.py:231` inside the RunPod vLLM worker

### 2c. RunPod Workers Only Had 1 Adapter at Cold-Start

From the RunPod log, both workers that initialized during this test showed **exactly 1 adapter registered**:

```
Worker 2gxhyt7t20flya (init ~00:04:59 UTC):
  LoRA mode: 1 adapter(s) will load on first request
  - adapter-6fd5ac79: BrightHub2/lora-emotional-intelligence-6fd5ac79

Worker z6c8i86rr3og04 (init ~00:05:00 UTC):
  ---Initialized adapter: {'name': 'adapter-6fd5ac79', 'path': 'BrightHub2/lora-emotional-intelligence-6fd5ac79'}
```

Neither worker had `adapter-bae71569` registered.

### 2d. Current RunPod State Has 5 Adapters

Verified by live query at time of analysis:
```json
[
  { "name": "adapter-6fd5ac79",  "path": "BrightHub2/lora-emotional-intelligence-6fd5ac79" },
  { "name": "adapter-4e48e3b4",  "path": "BrightHub2/lora-emotional-intelligence-4e48e3b4" },
  { "name": "adapter-308a26e9",  "path": "BrightHub2/lora-emotional-intelligence-308a26e9" },
  { "name": "adapter-e8fa481f",  "path": "BrightHub2/lora-emotional-intelligence-e8fa481f" },
  { "name": "adapter-bae71569",  "path": "BrightHub2/lora-emotional-intelligence-bae71569" }
]
```

`adapter-bae71569` **is now correctly deployed and in LORA_MODULES**. The auto-deploy Inngest function completed after the failing test was already in-flight.

---

## 3. Root Cause Analysis

### Primary Root Cause — Stale LORA_MODULES at Worker Cold-Start

**What happened (reconstructed timeline):**

| Time (UTC) | Event |
|---|---|
| ~23:54 | User opens test page for job `bae71569-...` |
| ~00:04 | `node scripts/retrigger-adapter-deploy.js` runs → fires Inngest auto-deploy for bae71569 |
| 00:04:37 | User sends A/B test turn request → 2 RunPod requests submitted (control + adapted) |
| 00:04:59 | RunPod cold-starts 2 workers (endpoint had scaled to 0 — `workersMin: 0`, `idleTimeout: 5 min`) |
| 00:04:59–00:05:00 | **Workers read LORA_MODULES env var at this exact moment → only `[adapter-6fd5ac79]` present** |
| 00:05 – 00:07:22 | Workers initialize vLLM engine (~2.5 min: model download + torch.compile + CUDA graph capture) |
| 00:07:22 | Worker `2gxhyt7t20flya` finishes init, dequeues both waiting jobs |
| 00:07:25 | **ERROR**: Request for `model: "adapter-bae71569"` → vLLM has no such adapter registered → `NotFoundError 404` |
| 00:07:27 | Worker completes. auto-deploy Inngest function finishes later, saves 5-adapter LORA_MODULES |

**The core mechanics:**

vLLM's OpenAI-compatible server registers LoRA adapters from the `--lora-modules` CLI flag **at startup only**. This flag is built from `LORA_MODULES` env var when the RunPod container starts. Once running, the worker cannot learn about new adapters. Any request referencing an unregistered adapter name returns a `404 NotFoundError` from `serving.py`.

When the workers cold-started at 00:04:59, `LORA_MODULES` contained only `adapter-6fd5ac79`. Therefore:
- `adapter-bae71569` was never registered with vLLM in these workers
- Every request for `model: "adapter-bae71569"` was a guaranteed 404

### Why Did LORA_MODULES Only Have 1 Adapter at Cold-Start?

One of the following occurred:

**Most Likely — Option A: Transient state during auto-deploy execution**  
The Inngest auto-deploy function runs these steps sequentially:
1. Download adapter from Supabase storage (~66MB)
2. Upload to Hugging Face (via `uploadFiles()` with LFS chunking — time-consuming)
3. Fetch current `LORA_MODULES` from RunPod GraphQL
4. Build new array (existing + new entry)
5. Call `saveEndpoint` to write updated LORA_MODULES

The workers cold-started (step 00:04:59) before the Inngest function reached step 5. At that exact moment, LORA_MODULES on the endpoint reflected the state **before** the current auto-deploy wrote its result. If the endpoint had previously been reset/partially updated to only `[adapter-6fd5ac79]`, that's what the workers read.

**Possible — Option B: Prior accidental LORA_MODULES wipe**  
A previous auto-deploy run or manual operation may have accidentally reduced LORA_MODULES to only `[adapter-6fd5ac79]` between Session 8 and this session. The auto-deploy for bae71569 then ran cleanly and built the correct 5-adapter array from scratch. But by then, the workers had already frozen at the 1-adapter state.

---

### Secondary Issue — `max_loras=1` in the Docker Image

The RunPod worker's vLLM engine is configured with `max_loras=1` (visible in both workers' engine args). This means:

- vLLM pre-allocates GPU memory for **only 1 concurrent LoRA adapter per batch**
- `max_cpu_loras` defaults to the same value (1), meaning only 1 LoRA is cached in CPU memory at a time
- With 5 adapters in `--lora-modules` but `max_loras=1`, vLLM can still serve different adapters across sequential requests (it swaps the adapter in/out per request), but **cannot serve 2 different LoRA adapters in the same batch simultaneously**

**Current impact:** This is NOT the direct cause of this failure (the 404 is a registration issue, not a capacity issue). However, as the adapter count grows, this will cause problems:
- The A/B test fires one control request + one adapter request simultaneously to the same endpoint
- Both may land on the same worker
- With `max_loras=1`, only one LoRA request can be in-flight at a time; the second will queue behind the first rather than being processed concurrently
- Performance degrades as more adapters are added

---

## 4. Solutions

### Solution 1 (Critical — Immediate Fix): Post-Deploy Worker Refresh
**Problem:** Updated `LORA_MODULES` only take effect when new workers cold-start. Workers that started before the update have frozen, stale adapter registrations.

**Fix in `auto-deploy-adapter.ts`:** After `saveEndpoint` succeeds, purge idle workers from the RunPod endpoint by calling the `/purge-queue` endpoint. This forces the endpoint to drain stale workers. On next request, fresh workers cold-start with the updated `LORA_MODULES`.

```typescript
// After saveEndpoint (step 5), add this step 6:
const purgeResponse = await fetch(
  `https://api.runpod.ai/v2/${endpointId}/purge-queue`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` }
  }
);
console.log('[AUTO-DEPLOY] Purged RunPod queue to force worker refresh:', await purgeResponse.json());
```

Note: This clears in-flight queued jobs. Only run it after confirming no production traffic is active. Alternatively, use RunPod's `updateEndpoint` to temporarily set `workersMin: 0` + `workersMax: 0`, wait 30 seconds, then restore to original, forcing all workers to cycle.

---

### Solution 2 (Critical — Immediate): Deployment Gate in the Test UI
**Problem:** The test page fires `model: "adapter-{jobId}"` with no check that the adapter has actually been registered in RunPod's `LORA_MODULES`.

**Fix:** Before enabling the adapted-side test request, add a pre-flight check that:
1. Queries `pipeline_training_jobs` to check `adapter_deployed_at` or equivalent status field
2. Verifies `adapter-{jobId}` exists in the live RunPod `LORA_MODULES` (via a new API route or checking a DB flag set by the auto-deploy function at completion)
3. Shows a "Awaiting adapter deployment..." UI state if not yet deployed

**Immediate workaround (no code changes):** Always wait for the auto-deploy Inngest function to fully complete before testing. The auto-deploy takes 2–10 minutes depending on network speed. After the Inngest run is confirmed completed in the Inngest dashboard, trigger a fresh test.

---

### Solution 3 (Important): Increase `max_loras` in the Docker Image
**Problem:** `max_loras=1` limits the vLLM engine to 1 concurrent LoRA adapter per batch. With 5 adapters and A/B testing firing simultaneous requests, this will cause queuing and latency issues.

**Fix:** Update the RunPod Docker image (or `docker-compose.yml` / startup script) to set:
```bash
--max-loras 8 \
--max-cpu-loras 8
```

Set these to the maximum number of adapters you expect to maintain (safe upper bound). This pre-allocates GPU/CPU memory for all adapters to be served concurrently.

This requires rebuilding and redeploying the RunPod Docker image — this is a medium-term fix.

---

### Solution 4 (Defense-in-Depth): Add Deployment Status Tracking to the DB

Add an `adapter_status` field to `pipeline_training_jobs` (or a related table) that tracks:
- `pending_deploy` — auto-deploy has been triggered but not confirmed
- `deploying` — Inngest function in-flight
- `deployed` — `saveEndpoint` succeeded, `LORA_MODULES` updated, worker refresh triggered
- `deploy_failed` — error in any step

The auto-deploy Inngest function writes to this field at each step. The test page reads this field and gates the adapter-side test on `status === 'deployed'`.

---

## 5. Recommended Immediate Action Plan

1. **Right now:** The LORA_MODULES currently has all 5 adapters. DO NOT test `adapter-bae71569` until you verify a fresh worker has cold-started with the updated config.

   Run this check:
   ```bash
   node -e "
   require('dotenv').config({path:'.env.local'});
   fetch('https://api.runpod.ai/v2/780tauhj7c126b/health',{
     headers:{'Authorization':'Bearer '+process.env.RUNPOD_API_KEY}
   }).then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)))"
   ```
   Look at `workers.running` and `workers.ready`. If any workers are still running (not from a fresh cold-start since the last LORA_MODULES update), the test will fail again.

2. **Ensure stale workers are gone:** The idleTimeout is 5 minutes. If the endpoint has been idle for 5+ minutes since the last update, all workers have scaled down. The next test will cold-start fresh workers that read the current 5-adapter LORA_MODULES.

3. **Re-run the test.** It should succeed now that bae71569 is in LORA_MODULES and no stale workers are running.

4. **Implement Solution 1 and Solution 2** before the next adapter deployment cycle.

---

## 6. Confidence Level

| Issue | Confidence | Evidence |
|---|---|---|
| Workers cold-started before deploy completed | **High** | Both workers log "1 adapter(s)" = only adapter-6fd5ac79. Current LORA_MODULES has 5. Timeline confirms overlap. |
| vLLM `--lora-modules` is static at startup | **Definitive** | Standard vLLM behavior; confirmed by `serving.py:231` being the error source — this is the OpenAI API layer, not runtime loading code. |
| `max_loras=1` will cause future concurrency issues | **High** | Confirmed in engine args in both worker logs. A/B test fires simultaneous requests. |
| Solution: purge + fresh worker will fix it | **High** | Confirmed bae71569 is now in LORA_MODULES. Fresh workers will register it. |
