# LoRA Chat Issues — Structured Investigation Findings

**Document**: `02-lora-chat-issues_v1.md`  
**Created**: 2026-02-26  
**Investigation Type**: 5-Layer Discovery (DB → Pipeline → Interface → Quality → Error)  
**Status**: Discovery complete — specification NOT included (next phase)

---

## Executive Summary

Testing the adapter A/B chat page (`/pipeline/jobs/[jobId]/test`) exposed a cluster of systemic issues around the adapter deployment → availability → testing pipeline. The immediate symptom was a 404 error for `adapter-bae71569`, but investigation reveals five distinct problem domains that compound each other:

1. **Worker lifecycle gap** — adapters are registered on the endpoint but workers don't pick them up until they cold-start; no mechanism flushes stale workers after a new adapter deployment
2. **No adapter readiness verification** — the UI marks endpoints as "ready" the moment the DB record is written, not when adapters are actually loaded on workers
3. **No adapter selector UI** — users can only test the adapter for the job they navigated from; there is no way to select or compare different adapters
4. **No multi-tenant adapter isolation** — all adapters from all users are registered on a single shared vLLM endpoint; the only isolation is app-layer filtering by `user_id` on DB queries, and some API routes don't even apply it
5. **vLLM config limitation** — `max_loras=1` prevents concurrent serving of multiple adapters, creating head-of-line blocking when switching between adapters

---

## Problem-by-Problem Findings

### Problem 1: Workers Serve Stale Adapter State After Deployment

**Severity**: High — prevents newly deployed adapters from working  
**Symptom**: `{'message': 'The model adapter-bae71569 does not exist.', 'type': 'NotFoundError', 'param': 'model', 'code': 404}` persisting 20+ minutes after auto-deploy completes  

**Evidence**:

- RunPod endpoint `780tauhj7c126b` LORA_MODULES correctly contains all 5 adapters including `adapter-bae71569` (verified via RunPod GraphQL API)
- RunPod health check shows `{"workers":{"idle":0,"initializing":2,"ready":0,"running":0}}` — workers in "initializing" state, not "ready"
- When a RunPod serverless worker cold-starts, vLLM reads LORA_MODULES at engine initialization time. If the LORA_MODULES env var was updated *after* the worker initialized, that worker will never see the new adapter
- The auto-deploy pipeline (Step 5: `vllm-hot-reload`) attempts a `/v1/load_lora_adapter` POST, but this fails for serverless because the serverless wrapper does not expose that vLLM route. The step is non-fatal by design

**Code references**:

- Auto-deploy hot-reload attempt: [auto-deploy-adapter.ts](src/inngest/functions/auto-deploy-adapter.ts#L482-L514) — catches errors but does not retry or escalate
- Comment on line 477: _"RunPod serverless endpoints do not natively expose /v1/load_lora_adapter"_
- Worker ready check: [inference-serverless.ts](src/lib/services/inference-serverless.ts#L639-L651) — `waitForReadyWorker()` only checks if *any* worker is ready, not whether that worker has the requested adapter

**Root cause chain**:
1. Auto-deploy updates LORA_MODULES on the endpoint ✅
2. Hot reload fails silently (expected) ✅ 
3. Existing workers keep running with old adapter list ❌
4. No mechanism to force-restart workers (missing)
5. `workersMin: 0` with `idleTimeout: 5` means workers *eventually* die and restart with new env — but only after all current requests drain and the idle timer expires

---

### Problem 2: Endpoint "Ready" Status Is Premature

**Severity**: High — misleads users into testing before adapters are actually available  
**Symptom**: UI shows green "Ready" badge, but inference returns 404  

**Evidence**:

- Auto-deploy Step 6 (`update-inference-endpoints-db`) writes `status: 'ready'` and `ready_at: now` to `pipeline_inference_endpoints` immediately after updating LORA_MODULES on RunPod
- No subsequent step verifies the adapter is actually loadable on a live worker
- The UI's `EndpointStatusBanner` reads this DB status and shows green checkmark
- `useAdapterWorkflow(jobId)` → `useAdapterTesting(jobId)` → `getEndpointStatus(jobId)` checks DB only, never pings RunPod

**Code references**:

- DB status is set at: [auto-deploy-adapter.ts](src/inngest/functions/auto-deploy-adapter.ts#L553-L557)
- UI reads it at: [page.tsx](src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx#L125-L132) via `workflow.bothReady`
- Status API: [status/route.ts](src/app/api/pipeline/adapters/status/route.ts) — returns `pipeline_inference_endpoints.status` without RunPod health validation

**Gap**: There is no "adapter existence verification" step — nothing ever calls RunPod to confirm vLLM can actually serve `model: "adapter-XXXXXXXX"`.

---

### Problem 3: No Adapter Selector UI

**Severity**: Medium — customer cannot test adapters from other training jobs  
**Symptom**: Test page and chat page only work with the adapter for the URL's `jobId`  

**Evidence**:

- Test page route: `/pipeline/jobs/[jobId]/test` — `jobId` comes from the URL, no dropdown/selector
- [page.tsx](src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx#L30-L32): `const jobId = params.jobId as string;` — directly passed to `ABTestingPanel`
- [ABTestingPanel.tsx](src/components/pipeline/ABTestingPanel.tsx): `useAdapterTesting(jobId)` — no adapter Override
- Chat page route: `/pipeline/jobs/[jobId]/chat` — same pattern
- [chat/page.tsx](src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx#L29-L31): queries `pipeline_training_jobs.eq('id', params.jobId)` — single job only
- **No "all my adapters" view exists anywhere in the app**

**Impact**: 
- User must know which job created the adapter they want to test
- No way to A/B test *between* two different LoRA adapters (only adapted vs base model)
- If user trained 5 adapters, they must navigate to 5 different URLs and mentally compare results

---

### Problem 4: No Multi-Tenant Adapter Isolation

**Severity**: Medium — adapter names are globally visible on the shared vLLM endpoint  
**Symptom**: Any authenticated user can theoretically invoke any adapter if they know the job ID  

**Evidence**:

- All 5 adapters are registered as LORA_MODULES on a single endpoint `780tauhj7c126b`:
  ```json
  [
    {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
    {"name":"adapter-4e48e3b4","path":"BrightHub2/lora-emotional-intelligence-4e48e3b4"},
    {"name":"adapter-308a26e9","path":"BrightHub2/lora-emotional-intelligence-308a26e9"},
    {"name":"adapter-e8fa481f","path":"BrightHub2/lora-emotional-intelligence-e8fa481f"},
    {"name":"adapter-bae71569","path":"BrightHub2/lora-emotional-intelligence-bae71569"}
  ]
  ```
- 11 of 12 training jobs belong to user `8d26cc10...`, 1 belongs to user `79c81162...` (adapter-6fd5ac79)
- The `/api/pipeline/adapters/test` API (POST handler) authenticates the user but does **not** verify the user owns the `jobId` being tested
- The GET handler for test history returns results by `jobId` without any `user_id` filter: [test/route.ts](src/app/api/pipeline/adapters/test/route.ts#L163-L181)
- `getEndpointStatus()` queries `pipeline_inference_endpoints.eq('job_id', jobId)` without `user_id` filtering

**Current isolation layers**:
- Jobs listing page (`/pipeline/jobs`) likely filters by authenticated user (standard Supabase RLS pattern)
- But if a user constructs the URL `/pipeline/jobs/FOREIGN_JOB_ID/test`, no server-side guard prevents access
- On the RunPod side: vLLM has zero concept of user ownership — any request with a valid adapter name is served

---

### Problem 5: `max_loras=1` Limits Concurrent Adapter Serving

**Severity**: Medium — causes contention when multiple concurrent users test different adapters  
**Symptom**: One adapter occupies the single LoRA slot; requests for a different adapter may fail or queue  

**Evidence**:

- RunPod endpoint engine args include `max_loras=1`
- From RunPod logs: only `adapter-6fd5ac79` was loaded when workers cold-started during testing
- vLLM with `max_loras=1` can only hold one LoRA in GPU memory at a time; dynamic swapping for each request adds significant latency
- The A/B test service runs Control and Adapted requests **sequentially** (not in parallel) precisely because of vLLM V1 engine crashes with concurrent different-model requests: [test-service.ts](src/lib/services/test-service.ts#L363-L365)
- But multi-turn chat service runs them in **parallel** via `Promise.allSettled`: [multi-turn-conversation-service.ts](src/lib/services/multi-turn-conversation-service.ts#L605-L621) — potential crash risk

**Config setting location**: RunPod endpoint environment variables (Dashboard → Endpoint → Docker env)

---

### Problem 6: `.env.local` RUNPOD_INFERENCE_ENDPOINT_ID Is Stale

**Severity**: Low (Vercel env is correct) — affects local development only  
**Symptom**: Local development auto-deploy would target wrong endpoint  

**Evidence**:

- `.env.local`: `RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlp` ← training endpoint
- Vercel env: `RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b` ← correct inference endpoint (fixed in prior session per context-carry-info-rrrr.md)
- `ei82ickpenoqlp` has **zero** LORA_MODULES (it's the training GPU: "brighthub-lora-trainer-qwen -fb")
- This was a known bug fixed on Vercel but never synced back to `.env.local`
- `scripts/restore-adapters.ts` hardcodes the correct ID: `const RUNPOD_INFERENCE_ENDPOINT_ID = "780tauhj7c126b";`

---

## Improvement Actions (Ranked by Impact)

> **Note**: These are scoped as discovery findings, not implementation specs. The specification phase will define the exact implementation approach.

| Rank | Action | Problem(s) Addressed | Complexity Estimate |
|------|--------|----------------------|---------------------|
| 1 | **Post-deploy worker refresh** — after LORA_MODULES update, trigger worker restart or leverage RunPod API to purge stale workers |P1, P2 | Medium |
| 2 | **Adapter readiness gate** — verify adapter is actually servable on a live worker before marking "ready" in DB | P2 | Medium |
| 3 | **Adapter selector UI** — dropdown or list of user's deployed adapters, accessible from the test and chat pages | P3 | Medium |
| 4 | **Increase `max_loras`** — raise to at least 3-5 to allow concurrent adapter serving without swapping | P5 | Low (config change) |
| 5 | **Fix `.env.local`** — sync `RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b` | P6 | Trivial |
| 6 | **User-scoped adapter access** — API-level `user_id` checks on test, chat, and status routes | P4 | Medium |
| 7 | **Adapter-vs-adapter comparison** — enable selecting two different adapters for comparison (not just adapted vs base) | P3 | High |

---

## Ruled Out Hypotheses

| Hypothesis | Why Ruled Out |
|------------|--------------|
| LORA_MODULES not updated on inference endpoint | Verified via RunPod GraphQL: `780tauhj7c126b` has all 5 adapters correctly registered |
| Auto-deploy targets wrong endpoint | True for `.env.local` but FALSE for Vercel production — Vercel env was fixed in prior session. Production auto-deploy correctly targets `780tauhj7c126b` |
| Adapter files not uploaded to HuggingFace | `hf_adapter_path` is populated for all 5 completed+deployed jobs. HF repos confirmed accessible |
| `inference-serverless.ts` constructs wrong adapter name | Code correctly builds `adapter-${jobId.substring(0, 8)}` matching the LORA_MODULES naming convention |
| Auth/RLS prevents users from reaching their own endpoints | Pipeline pages appear accessible; the issue is the opposite — not enough restriction on cross-user access |
| RunPod endpoint itself is unhealthy | Health check shows workers exist (initializing/ready states), endpoint is responding to API calls |

---

## Open Questions

1. **RunPod worker restart mechanism** — Does RunPod's serverless API expose a "restart all workers" or "purge workers" command? Or is the only option to set `workersMin=0`, wait for idle timeout, then scale back up?
**James' Response**: Yes that is confirmed as the best way. Set to 0 wait 1 minute then set back to 2.  
There is a "refresh_worker Flag" function that only works when the worker finishes a job and then if it has that flag it will die and a new one will start.
For us this is not ideal, as we would have to submit a "dummy" job to all workers with that flag on.

2. **vLLM hot-reload on serverless** — Is there a way to reach individual vLLM worker processes inside RunPod serverless to call `/v1/load_lora_adapter`? (Currently the serverless wrapper intercepts all HTTP and routes to `/runsync`, `/run`, `/health` only.)
**James' Response**: Why do we need to do this? I am not exactly what this means?
Is there a command to return all active worker ids, then use those ids?

3. **`max_loras` GPU memory impact** — At `max_loras=1` on a Mistral-7B with 16-rank LoRA adapters, how much additional VRAM does each additional LoRA slot consume? Need this to size the endpoint correctly.
**James' Response**: We can increase this and even increase the number of workers. Currently only 2 are usually active.

4. **Inter-adapter comparison** — Is comparing two LoRA adapters (A vs B, neither being base) a real product need, or is the comparison always adapted-vs-base-model?
**James' Response**: Not really needed. The chat can live in each ID of
`https://v4-show.vercel.app`/pipeline/jobs/[id]]/chat`.
But we will have to make sure that each LoRA adapter job created and pushed has it's unique adapter automatically chosen as the only adapter queried on that job's chat page. 
Same goes for every RAG Knowledge Base. Each will need it's own adapter.

5. **Parallel inference safety** — The multi-turn conversation service calls `Promise.allSettled` on control and adapted endpoints simultaneously. The A/B test service explicitly avoids this (sequential calls with comment: "vLLM V1 engine crashes when receiving two simultaneous requests with different model configurations"). Is the multi-turn service at risk of triggering EngineDeadError?
**James' Response**: I don't think so. It has been working without error for dozens of tests of adapted-vs-base-model

6. **Customer isolation architecture** — Long-term, should each customer get their own vLLM endpoint, or should adapter access be controlled at the app layer on a shared endpoint? This has significant cost implications.
**James' Response**: Question: Can we create vLLM endpoints programatically through the API? It would also need to be able to update all environment variables unless we can create "template" for the inference endpoint.
I also don't really understand the cost implications. I mean I am only charged for a serverless service when a worker is runnning. Having multiple endpoints only means more concurrent workers running, which is unavoidable (and is the point of) the workers.
Research if a serverless endpoint can be created by the API


7.**James' Response**: Scaling.
This proof of concept launch needs to work for lets say 10 concurrent users.
If we get that customer traction we can scale the capacity of the app right away.
So think of our multi tenants in that light. 
We also have a switch that switches the inference engine to an permanent Runpod.
This is much faster too, when it is already started. This can cost up to $5 an our. If we have paying customers $70 is an easy cost to position our app as faster and responsive. Confirm we can do that and confirm what the `INFERENCE_MODE` settings are. 

Question: How does the permanent Runpod use the adapters?

---

7.**James' Response**: Current Actions

Changes:
For this current iteration we will only (and must) implement:
set `workersMin=0`, wait 1 minute, then set back to 2.
This should occur automatically when the Adapter push to RunPod is marked successful.  Once it is successful a job should kick off to immediately that sets `workersMin=0`, wait 1 minute, then set back to 2 (or more).
The "Job" should not be in status "DONE" until the adapter is confirmed on the endpoint and all workers have stopped and restarted.

So figure out how to do that.
Run test scripts to set to 0 wait a minute then set to 2.  You can do this in an automated way before declaring it is working correct?
We will also want to test if setting workers to 0 kills all workers, even those "initializing". There is almost always at least one initializing. I think they cycle "responsibilities". This could be tested by sending a "Workers=0" immediately after sending "Workers=2".

Note: If someone submits multiple LoRA adapters at overlapping times...workers could crash into each other. I think we won't address that right now.

Further Investigation:
Find out if the API can create serveless LLM's using our template (or at least with our custom settings)

## Specification Readiness Checklist

| Criterion | Ready? | Notes |
|-----------|--------|-------|
| Root causes identified | ✅ | 6 problems documented with code references |
| Data/evidence gathered | ✅ | DB queries, RunPod API calls, code traces all complete |
| Ruled-out hypotheses documented | ✅ | 6 hypotheses tested and eliminated |
| Improvement actions ranked | ✅ | 7 actions ranked by impact |
| Open questions catalogued | ✅ | 6 questions needing product/infra decisions before spec |
| Ready for specification phase | ✅ | All discovery artifacts in place |

---

## Data Appendix

### Training Jobs Summary (12 records)

| Job ID (8ch) | Status | User (8ch) | HF Deployed? | Created |
|---|---|---|---|---|
| bae71569 | completed | 8d26cc10 | ✅ | 2026-02-25 23:18 |
| 308a26e9 | completed | 8d26cc10 | ✅ | 2026-02-25 22:37 |
| e8fa481f | completed | 8d26cc10 | ✅ | 2026-02-25 22:17 |
| b7a4d03c | completed | 8d26cc10 | ❌ | 2026-02-25 04:26 |
| 4e48e3b4 | completed | 8d26cc10 | ✅ | 2026-02-24 23:19 |
| f56bb46f | completed | 8d26cc10 | ❌ | 2026-02-24 21:36 |
| 608fbb9b | completed | 8d26cc10 | ❌ | 2026-02-24 02:21 |
| 3ec4241b | failed | 8d26cc10 | ❌ | 2026-02-24 01:24 |
| f1d7b55a | failed | 8d26cc10 | ❌ | 2026-02-24 01:04 |
| 592f4465 | failed | 8d26cc10 | ❌ | 2026-02-23 23:25 |
| 333de4f5 | failed | 8d26cc10 | ❌ | 2026-02-23 23:15 |
| 6fd5ac79 | completed | 79c81162 | ✅ (original) | 2026-01-13 22:20 |

### LORA_MODULES on `780tauhj7c126b` (at time of investigation)

```json
[
  {"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"},
  {"name":"adapter-4e48e3b4","path":"BrightHub2/lora-emotional-intelligence-4e48e3b4"},
  {"name":"adapter-308a26e9","path":"BrightHub2/lora-emotional-intelligence-308a26e9"},
  {"name":"adapter-e8fa481f","path":"BrightHub2/lora-emotional-intelligence-e8fa481f"},
  {"name":"adapter-bae71569","path":"BrightHub2/lora-emotional-intelligence-bae71569"}
]
```

### Environment Configuration

| Variable | `.env.local` | Vercel | Notes |
|----------|-------------|--------|-------|
| `INFERENCE_MODE` | `"serverless"` | `"serverless"` | Active mode |
| `INFERENCE_API_URL` | `https://api.runpod.ai/v2/780tauhj7c126b` | Same | Correct |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `ei82ickpenoqlp` ❌ | `780tauhj7c126b` ✅ | Local is stale |
| `INFERENCE_API_URL_ADAPTED` | `https://ral23o4knpcmeu-8001.proxy.runpod.net` | — | Legacy pods URL |

### RunPod Endpoint Configuration

| Setting | Value |
|---------|-------|
| Endpoint ID | `780tauhj7c126b` |
| Endpoint Name | `brightrun-inference-official-vllm -fb` |
| Workers Min | 0 |
| Workers Max | 2 |
| Idle Timeout | 5 seconds |
| `max_loras` | 1 |
| `enable_lora` | True |
| `max_lora_rank` | 16 |
| vLLM Version | 0.15.0 |
| Base Model | Mistral-7B-Instruct-v0.2 |
