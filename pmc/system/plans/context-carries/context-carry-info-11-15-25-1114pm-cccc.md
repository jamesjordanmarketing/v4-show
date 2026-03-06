````markdown
# Context Carryover: v4-Show — Session 17+

**Last Updated:** March 5, 2026
**Document Version:** context-carry-info-11-15-25-1114pm-cccc
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files. DO NOT run any commands.**

Your job upon receiving this context is to:

1. Read and internalize this **entire** document fully — every section, every table, every file reference.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Pay special attention to the files listed in the **Key Files** sections below.
3. Read and internalize the **SAOL Fix document** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`. This is the SAOL DNS / connectivity fix diagnosed in Session 16. **The SAOL library is currently broken for all `transport: 'pg'` operations.** Fixes A, B, C, D have **NOT** yet been applied.
4. Read and internalize the **Spec 30 execution prompts** (E01, E02, E03) in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\`. **E01 Task 1 (DB migration) is the only E01 task completed.** E01 Tasks 2–6, all of E02, and all of E03 are NOT yet implemented.
5. Read and internalize the **RunPod Worker Restart Analysis** section below and the full analysis document at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` (appended sections 3+ cover root cause, solutions, and RunPod support letter). The **`refresh-inference-workers.ts`** and **`restart-inference-workers.ts`** Inngest functions are both **BROKEN** and need to be rewritten.
6. Read and internalize the **SAOL usage instructions** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`.
7. Understand the project stack, the SAOL DNS failure, the Spec 30 implementation plan, the RunPod worker restart bug, and the current state of each task.
8. Then **wait for the human to tell you what to do next**.

The human's most likely next actions are:
- Ask you to **fix the RunPod worker restart logic** in `refresh-inference-workers.ts` and `restart-inference-workers.ts` (the most immediate production issue)
- Ask you to **apply the SAOL fixes** documented in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md` (Fix A through Fix D)
- Ask you to **continue implementing Spec 30 E01** (Tasks 2–6: modify Inngest functions, update GET API, create bypass endpoint, validate TypeScript)
- Ask you to **implement Spec 30 E02 or E03** (Training Sets monitoring page, cross-page selection)
- Ask you to **fix bugs** or **analyze small upgrades** on the workbase UI

**Do not start anything until the human tells you what to do.**

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure.
2. **Enrichment Pipeline**: 5-stage validation and enrichment for quality assurance.
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL).
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations.
5. **Download System**: Export both raw and enriched JSON formats.
6. **LoRA Training Pipeline**: Database, API routes, UI, training engine & evaluation.
7. **Adapter Download System**: Download trained adapter files as tar.gz archives.
8. **Automated Adapter Testing**: RunPod Pods (working) + Serverless (preserved).
9. **Multi-Turn Chat Testing**: A/B testing, RQE evaluation, dual progress.
10. **RAG Frontier**: Knowledge base management, document upload, multi-doc context assembly, HyDE + hybrid search, self-evaluation.
11. **Automated Adapter Deployment**: (FULLY FUNCTIONAL as of Session 8) - Pushes trained adapters to Hugging Face and hot-loads them into RunPod serverless endpoints.
12. **Work Base Architecture (v4-show)**: Every operation is scoped to a `workbase` entity. Routes at `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`.

---

## 🚨 SAOL DNS Failure — Currently Blocking (Diagnosed Session 16)

### Problem Summary

The Supabase Agent Ops Library (SAOL) is **broken for all `transport: 'pg'` operations** — DDL migrations, schema introspection, index management, raw SQL execution, and maintenance ops all fail with an unhelpful `"DDL execution failed: Unknown error"`.

### Root Cause

Supabase removed the IPv4 A record for the direct database hostname `db.hqhtbxlgzysfbekexwku.supabase.co`. It now only has an IPv6 AAAA record, but this system has no external IPv6 connectivity. Node.js `dns.lookup()` gets `ENOTFOUND`, the `pg` Client throws a connection error, and SAOL's `mapDatabaseError()` has no mapping for DNS errors so it returns generic `ERR_FATAL`.

### What Still Works

- Supabase REST API (all app code, `@supabase/supabase-js`) — unaffected
- SAOL `transport: 'supabase'` operations (`agentQuery()`, `agentImportTool()`, `agentExportData()`, etc.) — unaffected
- The Supabase Connection Pooler (`aws-1-us-west-1.pooler.supabase.com:5432`) — **IPv4 available, tested and confirmed working for DDL**

### Fix Plan (4 Fixes — Detailed in SAOL Fix Doc)

| Step | Fix | Description | Status |
|------|-----|-------------|--------|
| 1 | **Fix A** | Update `DATABASE_URL` in `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` to pooler URL | **NOT YET APPLIED** |
| 2 | **Fix B** | Harden SSL in `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | **NOT YET APPLIED** |
| 3 | **Fix C** | Add connection error mappings to `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | **NOT YET APPLIED** |
| 4 | **Fix D** | Update SAOL docs + TROUBLESHOOTING.md with prerequisites and pooler info | **NOT YET APPLIED** |

**Full details:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`

### Pooler URL (Confirmed Working)

```
postgresql://postgres.hqhtbxlgzysfbekexwku:Fx4BTNR2mNKsN27Z@aws-1-us-west-1.pooler.supabase.com:5432/postgres
```

**Port 5432 = Session Mode** (supports DDL/transactions). Port 6543 = Transaction Mode (does NOT support DDL). Must use port 5432.

### SAOL `node_modules` Issue

`supa-agent-ops/node_modules/` and `supa-agent-ops/dist/` are `.gitignored`. After a fresh clone, agents must run:
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && npm install
```
The `dist/` folder may also need rebuilding: `npm run build`

---

## 🚨 RunPod Worker Restart Issue — Currently Broken (Diagnosed Session 17)

### Overview

The Inngest functions `refresh-inference-workers.ts` and `restart-inference-workers.ts` are **structurally broken** — they fail on every run when there are warm workers on the RunPod serverless endpoint. The root cause was fully diagnosed in Session 17 using production log analysis (`vercel-104.csv`, 7059 lines).

### Root Cause

**`saveEndpoint(workersMin: 0)` is a configuration change only — it does NOT force-terminate running workers.**

Step 1 of both functions calls the RunPod GraphQL mutation `saveEndpoint` with `workersMin: 0`. This updates the autoscaler configuration. Workers that are already running (`ready`, `idle`, `running`, `initializing`) continue to exist. The autoscaler will eventually scale to 0, but only after idle timeout expires (configurable, typically 5–60 seconds but RunPod may take 2–5 minutes to act on the change in practice).

Step 2 polls `/health` every 5 seconds for 90 seconds waiting for `total workers === 0`. With 4 active workers (R:2 I:2), all 18 polls returned `total=4`. The function threw `Error: Workers did not terminate within 90s` and returned HTTP 400 to Inngest.

### Production Evidence (from vercel-104.csv)

- `23:46:28` — `auto-deploy-adapter.ts` successfully updated `LORA_MODULES` (6 adapters). Correct.
- `23:48:30–23:49:51` — `refresh-inference-workers.ts` Step 2 ran 18 polls. All showed `total=4 (R:2 I:2 Ru:0 In:0)`.
- `23:50:01` — Threw `Workers did not terminate within 90s`. Function failed.
- `23:52:40–23:57:30` — Browser polled `/restart-status` endpoint 150 times (UI bug: no timeout on browser poll loop).

### Why vLLM Hot-Reload Does Not Work

`auto-deploy-adapter.ts` attempts `POST /v1/load_lora_adapter`. RunPod serverless proxy only exposes `/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream`. It returns 404. **Cold worker restart is the only path to pick up new env vars.** This is non-fatal and auto-deploy handles it gracefully and moves on.

### Why No Force-Terminate API Exists

RunPod GraphQL has no `forceTerminateWorkers` or `restartEndpoint` mutation for serverless endpoints. `podTerminate` exists for Pod instances only. Rolling updates (10% of `workersMax` per cycle) happen on RunPod's internal schedule.

### Broken Files

| File | Problem |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Step 2 timeout (90s) — workers never reach 0 because `saveEndpoint` doesn't force-kill. Function fails on every run with warm workers. Steps 3–6 never execute. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Same flawed approach as `refresh-inference-workers.ts` — manual trigger version, also fails with warm workers. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart-status\route.ts` | Browser polls this indefinitely with no stopping condition on failure. UI bug. |

### Current State of Step Logic (refresh-inference-workers.ts)

The function has 6 steps. Only Step 1 ever completes:

| Step | Name | What it does | Status |
|------|------|-------------|--------|
| 1 | `scale-down-workers` | `saveEndpoint(workersMin: 0)`, writes `endpoint_restart_log` row | ✅ Runs (but misleading — doesn't actually kill workers) |
| 2 | `wait-for-workers-terminated` | Polls `/health` every 5s × 18 = 90s waiting for `total=0` | ❌ Always times out with warm workers |
| 3 | `scale-up-workers` | Restores `workersMin/Max`, updates `MAX_LORAS=5` | ❌ Never reached |
| 4 | `wait-for-workers-ready` | Polls until `ready > 0 \|\| idle > 0` (180s timeout, non-fatal) | ❌ Never reached |
| 5 | `verify-adapter-available` | POSTs test request to `/runsync` using adapter name | ❌ Never reached |
| 6 | `mark-endpoints-ready` | Updates `pipeline_inference_endpoints.status = 'ready'`, finalizes restart log | ❌ Never reached |

### Recommended Fix (Solution A + B Fallback)

Documented in full at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` (sections 3+).

**Primary approach (Solution A):** Drop the "wait for workers to reach 0" requirement. Instead:
1. Call `saveEndpoint(workersMin: 0, workersMax: 0, idleTimeout: 5)` — aggressive scale-down config.
2. Call `POST /purge-queue` — clears pending work so workers go idle faster.
3. Wait up to 5 minutes with generous polling interval (15s) for `total === 0`.
4. If still not 0 after 5 min, log and continue anyway (workers will eventually pick up new env vars via rolling update).
5. Restore config: `saveEndpoint(workersMin: original, workersMax: original, idleTimeout: original)`.
6. Wait for workers ready (180s, non-fatal).
7. Verify adapter via test inference.

**Fallback (Solution B):** If worker count is 0 before the function starts (cold endpoint), existing logic works. Add a guard at the top to check `total === 0` before attempting scale-down cycle.

**UI fix:** Add a timeout + error state to the browser's `/restart-status` poll loop in `EndpointRestartTool.tsx`. Stop polling after 10 minutes and show a "Restart took longer than expected — check RunPod console" message with a manual retry button.

### Immediate Production Workaround

`LORA_MODULES` was already updated by `auto-deploy-adapter.ts` at 23:46:28. Workers will pick up the new adapters on their next cold start (RunPod rolling update). To force this now: RunPod Console → endpoint `780tauhj7c126b` → Settings → click Save Endpoint (no changes needed). Wait 2–5 minutes.

---

## Active Development Focus: Spec 30 — Training Set Build Visibility + Partial Processing Fix

### What Session 17 Did

Session 17 worked across three areas:

**1. Spec 29 E03 — IMPLEMENTED & COMMITTED**
- Completed Spec 29 E03: batch watcher page converted to pure status viewer.
- Changes committed and pushed to GitHub.

**2. Batch Job Hanging Diagnosis**
- Diagnosed a hanging batch job via Inngest dashboard.
- Root cause: Inngest function resync needed (stale function registration).
- Resolved via Inngest dashboard resync (no code change).

**3. RunPod Worker Restart Root Cause Analysis**
- Analyzed 7059-line production log `vercel-104.csv` in full detail.
- Root cause identified: `saveEndpoint(workersMin: 0)` is config-only, does not kill workers.
- Written full analysis, 4 solution options, and RunPod support letter to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`.

**What was NOT done in Session 17:**
- ❌ SAOL fixes (A, B, C, D) still not applied
- ❌ Spec 30 E01 Tasks 2–6 still not started
- ❌ RunPod worker restart code not yet fixed (analysis done, fix not implemented)

### Spec 30 E01 — Task Status

| Task | Description | File(s) | Status |
|------|-------------|---------|--------|
| 1 | DB schema migration: add `last_build_error` + `failed_conversation_ids` | `training_sets` table | ✅ **DONE** (via direct pg, not SAOL) |
| 2 | Modify `rebuild-training-set.ts` — structured error catch + clear on success | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts` | ❌ Not started |
| 3 | Modify `build-training-set.ts` — structured error catch + clear on success | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts` | ❌ Not started |
| 4 | Update GET training-sets route — include `lastBuildError` + `failedConversationIds` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts` | ❌ Not started |
| 5 | Create bypass API endpoint | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\bypass\route.ts` (NEW) | ❌ Not started |
| 6 | Validate TypeScript compilation | — | ❌ Not started |

### Spec 30 E02 — Training Sets Monitoring Page (Not Started)

Creates the Training Sets monitoring dashboard page and wires it into the existing UI.
- **Spec:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md`
- **Prerequisites:** E01 must be complete first
- **Status:** ❌ Not started

### Spec 30 E03 — Cross-Page Selection + Server-Side Sorting (Not Started)

Cross-page conversation selection, page size selector, server-side enrichment sorting, enrichment filter.
- **Spec:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md`
- **Prerequisites:** E01 + E02 must be complete first
- **Status:** ❌ Not started

### Spec 30 Parent Spec

- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\30-training-set-add-spec_v2.md`

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| Background Jobs | Inngest |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query v5 + Zustand |
| Deployment | Vercel |
| GPU Inference | RunPod Serverless, endpoint `780tauhj7c126b` — vLLM + LoRA adapters |
| Database Ops (CLI) | SAOL (`supa-agent-ops/`) — **currently broken for pg transport, see SAOL Fix section** |

### Inngest Concurrency Limits (Important)

| Function | Concurrency | Notes |
|----------|-------------|-------|
| `process-batch-job` | 2 | Limits parallel batch jobs |
| `dispatch-training-job` | 3 | Limits parallel training dispatches |
| `auto-deploy-adapter` | 1 | Single-lane deployment |
| `refresh-inference-workers` | 1 | Single-lane worker refresh |

---

## Current Codebase Architecture (v4-show)

The active Next.js 14 application lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Key structure:

```
src/
├── app/
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── home/page.tsx
│   │   ├── conversations/page.tsx        # Legacy conversations page
│   │   ├── training-files/page.tsx       # Legacy training files page
│   │   ├── datasets/
│   │   ├── pipeline/
│   │   │   ├── configure/page.tsx        # Legacy pipeline configure
│   │   │   └── jobs/
│   │   ├── batch-jobs/[id]/page.tsx      # Auto-enrich added (Session 13)
│   │   └── workbase/[id]/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx          # Full ConversationTable (upgraded multiple times)
│   │       │   │   ├── generate/page.tsx
│   │       │   │   └── [convId]/page.tsx
│   │       │   ├── launch/page.tsx       # Launch Tuning page
│   │       │   ├── adapters/
│   │       │   │   ├── page.tsx          # Adapter list page (Spec 26)
│   │       │   │   └── [jobId]/page.tsx  # Adapter detail page (Spec 26)
│   │       │   └── chat/page.tsx
│   │       ├── fact-training/
│   │       └── settings/page.tsx
│   └── api/
│       ├── conversations/
│       │   ├── route.ts                  # GET /api/conversations (supports workbaseId)
│       │   ├── generate/route.ts
│       │   ├── generate-batch/route.ts
│       │   └── bulk-enrich/route.ts
│       ├── training-files/route.ts       # Legacy GET/POST
│       ├── datasets/
│       ├── workbases/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── training-sets/
│       │           ├── route.ts          # GET/POST training sets ← MODIFY (Spec 30 E01 Task 4)
│       │           └── [tsId]/
│       │               ├── route.ts      # PATCH/DELETE
│       │               ├── reset/route.ts
│       │               └── bypass/route.ts  ← NEW (Spec 30 E01 Task 5)
│       └── pipeline/
│           ├── jobs/route.ts
│           └── adapters/
│               └── [jobId]/
│                   ├── restart/route.ts        # Manual restart trigger
│                   └── restart-status/route.ts # Pure DB reader (UI polls this; has stop-polling bug)
├── components/
│   ├── conversations/
│   │   ├── ConversationTable.tsx         # Full-featured sortable table
│   │   ├── ConversationDetailModal.tsx
│   │   └── ConfirmationDialog.tsx
│   ├── pipeline/
│   │   ├── TrainingParameterSlider.tsx
│   │   ├── CostEstimateCard.tsx
│   │   ├── AdapterStatusPing.tsx         # New (Spec 26)
│   │   ├── DeploymentTimeline.tsx        # New (Spec 26)
│   │   ├── EndpointRestartTool.tsx       # New (Spec 26) ← UI poll loop bug (no timeout)
│   │   └── chat/MultiTurnChat.tsx
│   └── ui/ (shadcn components)
├── hooks/
│   ├── use-conversations.ts
│   ├── useTrainingSets.ts
│   ├── usePipelineJobs.ts
│   ├── useAdapterDetail.ts              # New (Spec 26)
│   └── ...
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── build-training-set.ts         # ← MODIFY (Spec 30 E01 Task 3)
│       ├── rebuild-training-set.ts       # ← MODIFY (Spec 30 E01 Task 2)
│       ├── auto-deploy-adapter.ts        # 838 lines — WORKING CORRECTLY
│       ├── dispatch-training-job.ts
│       ├── restart-inference-workers.ts  # ← BROKEN (RunPod worker restart) 338 lines
│       ├── refresh-inference-workers.ts  # ← BROKEN (RunPod worker refresh) 420 lines
│       └── index.ts
├── lib/
│   ├── types/
│   ├── services/
│   │   ├── training-file-service.ts      # Gold-standard v4 JSONL conversion
│   │   ├── pipeline-service.ts
│   │   └── batch-generation-service.ts
│   └── pipeline/hyperparameter-utils.ts
├── stores/
│   ├── conversation-store.ts
│   └── pipelineStore.ts
└── types/
    ├── workbase.ts
    ├── pipeline.ts
    └── adapter-detail.ts                 # RestartStatus state machine (Spec 26)
```

---

## Key Files for Spec 30 E01 (Immediate Spec Work)

| File | Role | Spec 30 E01 Task |
|------|------|-----------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts` | Inngest function: rebuilds training set JSONL on `training/set.updated` event. ~238 lines. | Task 2: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts` | Inngest function: builds training set JSONL on `training/set.created` event. ~161 lines. | Task 3: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts` | GET/POST training sets for a workbase. ~156 lines. | Task 4: Add `lastBuildError` + `failedConversationIds` to GET response mapping |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\bypass\route.ts` | **DOES NOT EXIST YET** — New file to create. | Task 5: Create POST bypass endpoint |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client + event type definitions. | Reference only (event names used by bypass endpoint) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\supabase-server.ts` | Exports `requireAuth`, `createServerSupabaseAdminClient`. | Reference only (imported by all API routes) |

---

## Key Files for RunPod Worker Restart Fix

| File | Role | Fix Needed |
|------|------|-----------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Auto-triggered worker refresh after `pipeline/adapter.deployed` event. 420 lines. 6 steps. | Step 2: Replace 90s timeout with extended poll (5 min, 15s interval) + `purge-queue` call + graceful fallback if workers never reach 0 |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Manual worker restart. 338 lines. | Same Step 2 fix pattern as above |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` | UI component that shows restart status and polls `/restart-status` route. | Add 10-minute timeout + error state + manual retry button to browser poll loop |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart-status\route.ts` | Pure DB reader — fetches latest `endpoint_restart_log` row. | No logic change needed; the UI polling fix is in `EndpointRestartTool.tsx` |

**Full solution details:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`

---

## Key Files for SAOL Fixes

| File | Fix | Change |
|------|-----|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` | Fix A | Replace `DATABASE_URL` value with pooler URL |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | Fix B | Harden SSL detection in `getPgClient()` — always enable SSL for Supabase hosts |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | Fix C | Add 3 connection error mappings (`ERR_CONNECTION_DNS`, `ERR_CONNECTION_REFUSED`, `ERR_CONNECTION_TIMEOUT`) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md` | Fix D | Add prerequisites section (`npm install` guard, pooler URL fallback) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\TROUBLESHOOTING.md` | Fix D | Add DNS/IPv4 troubleshooting section |

After code fixes (B, C): `cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && npm run build`

---

## RunPod Infrastructure Reference

| Item | Value |
|------|-------|
| Endpoint ID | `780tauhj7c126b` |
| Model | Mistral-7B-Instruct-v0.2 (base) + LoRA adapters via `LORA_MODULES` env var |
| `LORA_MODULES` format | JSON array: `[{"name":"adapter-name","path":"hf://user/repo"}]` |
| vLLM control | `LORA_MODULES` env var only; hot-reload via `/v1/load_lora_adapter` NOT available on serverless proxy |
| GraphQL API | `https://api.runpod.io/graphql?api_key=<RUNPOD_API_KEY>` |
| Inference API | `INFERENCE_API_URL` env var (serverless endpoint URL) |
| RunPod Console | `https://www.runpod.io/console/serverless` |
| Worker count at last check | 4 workers (R:2 I:2 Ru:0 In:0) — as of the Session 17 incident |

### RunPod GraphQL `saveEndpoint` Mutation Behavior
- Full PUT (not PATCH) — must include all fields or they default to null/zero
- Updates autoscaler configuration only
- Does NOT terminate currently running workers
- Workers drain naturally based on idle timeout + autoscaler cycle (can take 2–5 minutes)
- No `forceTerminateWorkers` mutation exists for serverless endpoints

---

## What Has Changed Since Session 16

### Session 17 Changes

| Item | Status |
|------|--------|
| **Spec 29 E03** (batch watcher page → status viewer) | ✅ Implemented, committed, pushed |
| **Batch job hanging** diagnosis (Inngest resync) | ✅ Resolved (no code change) |
| **Concurrency analysis** | ✅ Written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\31-ux-conversations-and-_v1.md` |
| **Mid-run quality assessment** | ✅ Written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` |
| **RunPod worker restart root cause analysis** | ✅ Full analysis + solutions + RunPod support letter appended to `32-ux-conversations-and-adapter_v1.md` |
| SAOL fixes (A, B, C, D) | ❌ Not applied |
| Spec 30 E01 Tasks 2–6 | ❌ Not started |
| RunPod worker restart code fix | ❌ Analysis done, code not yet written |

### Specs Implemented Across All Sessions (Since Session 15)

| Spec | What it did | Status |
|------|-------------|--------|
| **Spec 20** (Training Pipeline Integration) | Rewrote `build-training-set.ts` to use `TrainingFileService` (v4 JSONL), added `rebuild-training-set.ts`, wired `ConversationTable` | ✅ Done |
| **Spec 21** (Batch Page) | Workbase-scoped batch job watcher | ✅ Done |
| **Spec 23** (Add Conversations) | Add conversations to existing training sets | ✅ Done |
| **Spec 26** (LoRA Adapters) | Adapter list page, adapter detail page, status ping, deployment timeline, endpoint restart tool | ✅ Done |
| **Spec 28** (Enrich Bug) | Enrichment bug fixes | ✅ Done |
| **Spec 29 E03** (Batch Conversations) | Batch watcher page converted to pure status viewer | ✅ Done (Session 17) |
| **Bug batch (30 items)** | "30 antigravity bugs" — miscellaneous UI/UX fixes | ✅ Done |

---

## DB State (Current)

### `training_sets` Table Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `workbase_id` | uuid | FK to workbases |
| `user_id` | uuid | FK to auth.users |
| `name` | text | |
| `conversation_ids` | text[] | Array of conversation business keys |
| `conversation_count` | integer | |
| `training_pair_count` | integer | |
| `status` | text | `processing` / `ready` / `failed` |
| `jsonl_path` | text | Storage path to JSONL file |
| `dataset_id` | uuid | FK to datasets (added by Spec 20) |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `last_build_error` | text | **NEW — added Session 16** (Spec 30 E01 Task 1) |
| `failed_conversation_ids` | text[] | **NEW — added Session 16** (Spec 30 E01 Task 1) |

### `endpoint_restart_log` Table

Used by `refresh-inference-workers.ts` and `restart-inference-workers.ts` to track restart progress.

| Column | Notes |
|--------|-------|
| `id` | uuid PK |
| `adapter_in_lora_modules` | boolean |
| `lora_modules_snapshot` | jsonb |
| `scale_down_success` | boolean |
| `status` | RestartStatus state machine value |
| `workers_terminated_at` | timestamptz |
| `scale_up_at` | timestamptz |
| `scale_up_success` | boolean |
| `workers_ready_at` | timestamptz |
| `worker_state_after` | jsonb |
| `verification_at` | timestamptz |
| `completed_at` | timestamptz |
| `adapter_verified` | boolean |

**RestartStatus state machine** (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\adapter-detail.ts`):
`initiated` → `scaling_down` → `workers_terminated` → `scaling_up` → `workers_ready` → `verifying` → `completed` | `failed`

---

## Important Specifications & Documents

| Document | Path | Role |
|----------|------|------|
| **RunPod Worker Restart Analysis** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` | Full root cause analysis, 4 solution options (A–D), RunPod support letter. Sections 3+ added Session 17. |
| **Concurrency Analysis** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\31-ux-conversations-and-_v1.md` | Inngest concurrency limits analysis |
| **SAOL Fix (Session 16)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md` | Diagnosis + 4-fix plan for SAOL DNS failure |
| **Spec 30 E01 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md` | Backend: DB schema (DONE) + Inngest error storage + API endpoints (NOT DONE) |
| **Spec 30 E02 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md` | Training Sets monitoring page + UI navigation |
| **Spec 30 E03 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md` | Cross-page selection + server-side sorting + enrichment filter |
| **Spec 30 parent spec** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\30-training-set-add-spec_v2.md` | Full specification for Training Set Build Visibility + Partial Processing Fix |
| **SAOL usage instructions** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md` | How to use SAOL for all DB operations |
| **UX Decisions (master spec)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\07-internal-ux-decisions_v4.md` | D1 (eliminate data shaping), Page 3 (Launch Tuning), design tokens |

---

## Design Token System — How It Works

**The Token Chain:**
```
globals.css :root { --primary: 52 100% 50%; }
       ↓
tailwind.config.js { primary: "hsl(var(--primary))" }
       ↓
JSX: className="bg-primary" → CSS: background-color: hsl(52 100% 50%)
```

**Design Token Rules — Mandatory for all new/modified code:**
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` color classes permitted in any new or modified code**
- Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT design tokens

---

## Key IDs To Know

| Name | ID |
|------|----|
| User (James — primary) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| User (james+2-22-26@...) | `79c81162-6399-41d4-a968-996e0ca0df0c` |
| Workbase: rag-KB-v2_v1 (owned by primary user) | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 (owned by second user) | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| RunPod endpoint | `780tauhj7c126b` |
| Supabase project ref | `hqhtbxlgzysfbekexwku` |

---

## What Needs Doing Next (Priority Order)

### 1. Fix RunPod Worker Restart Logic (HIGH PRIORITY — Production Broken)

Both `refresh-inference-workers.ts` and `restart-inference-workers.ts` fail on every run with warm workers. `LORA_MODULES` is updated correctly by `auto-deploy-adapter.ts` but workers never pick it up via the refresh cycle. Full solution plan in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`.

| Fix | What | Files |
|-----|------|-------|
| **Step 2 rewrite** | Replace 90s poll with extended 5-min poll + `purge-queue` + non-fatal fallback | `refresh-inference-workers.ts`, `restart-inference-workers.ts` |
| **UI poll timeout** | Add 10-min timeout + error state + retry button to `EndpointRestartTool.tsx` | `EndpointRestartTool.tsx` |

### 2. Apply SAOL Fixes (Currently Blocking All SAOL `pg` Operations)

Until Fix A is applied, no SAOL `transport: 'pg'` operations will work. Full plan in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`.

| Fix | What | Effort |
|-----|------|--------|
| **A** | Update `DATABASE_URL` in `.env.local` to pooler URL | 30 seconds |
| **B** | Harden SSL in `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | 5 min |
| **C** | Add error mappings to `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | 10 min |
| **D** | Update docs (SAOL instructions + TROUBLESHOOTING.md) | 5 min |

### 3. Finish Spec 30 E01 Tasks 2–6 (Backend Error Storage + Bypass Endpoint)

Task 1 is done. Tasks 2–6 are code changes — full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md`.

### 4. Implement Spec 30 E02 (Training Sets Monitoring Page)

Requires E01 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md`.

### 5. Implement Spec 30 E03 (Cross-Page Selection + Sorting)

Requires E01 + E02 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md`.

### 6. Bug Fixes & Small UX Upgrades

As identified by the human.

---

## Important Lessons (For Future Debugging)

### RunPod Serverless Workers

1. `saveEndpoint()` via GraphQL is a **configuration-only operation**. It does NOT terminate running workers.
2. Workers drain based on idle timeout + autoscaler cycle. With 4 workers, this can take 2–5 minutes minimum.
3. There is no RunPod API to force-terminate serverless workers. `podTerminate` is for Pod instances only.
4. RunPod serverless proxy exposes only: `/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream`. Any other route (e.g., vLLM's `/v1/load_lora_adapter`) returns 404.
5. `LORA_MODULES` env var changes only take effect on cold worker start, not on hot-running workers.
6. Use `POST /purge-queue` to clear pending work so workers go idle faster — this is allowed and safe.
7. Always use generous polling intervals (15s+) and timeouts (5 min+) for `total workers === 0` checks.

### SAOL Library Setup

1. `supa-agent-ops/node_modules/` and `supa-agent-ops/dist/` are `.gitignored`. Run `npm install` after cloning.
2. The library requires `DATABASE_URL` for `transport: 'pg'`. As of March 4, 2026, the direct connection URL (`db.*.supabase.co`) no longer resolves on IPv4. Use the **pooler URL** (`aws-1-us-west-1.pooler.supabase.com:5432`, session mode).
3. SAOL's error mapping does not cover DNS/connection errors — it returns `"Unknown error"`. Fix C addresses this.
4. Always use `transport: 'pg'` for DDL operations. REST/supabase transport cannot execute DDL.

### Conversations Module — Type Architecture

1. `GET /api/conversations` returns `StorageConversation[]` (snake_case).
2. `useConversations()` hook is **typed** as `Conversation[]` but actually returns `StorageConversation[]`. Do NOT change the type.
3. All UI components expect camelCase `Conversation` objects — always apply `transformStorageToConversation()`.
4. The workbase conversations page uses direct `fetch()` instead of the hook, avoiding the type mismatch.

### Training Pipeline Architecture

1. `buildTrainingSet` and `rebuildTrainingSet` Inngest functions now use `TrainingFileService.createTrainingFile()` (correct v4 JSONL format). Fixed by Spec 20.
2. The `datasets` record is auto-created by these functions — no manual "Import from Training File" step needed.
3. `pipeline_training_jobs.workbase_id` is now populated from workbase flow.
4. Spec 30 adds structured error storage to these functions (parsing failed conversation IDs into `failed_conversation_ids` column).

### Inngest Resync

If Inngest functions appear stuck or not responding to events, try a manual resync via the Inngest dashboard (Apps → Sync). This resolves stale function registration without code changes.

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**You MUST use SAOL for ALL database operations.**

**Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

### Common Usage
```bash
# Query jobs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'e8fa481f-7507-4099-a58d-2778481429f5'}],
    select: '*'
  });
  console.log(r.data);
})();"
```

---

## Previous Session Context (Key Sessions)

### Session 17 (This Session — RunPod Diagnosis + Spec 29 E03 + Batch Fix)
Implemented Spec 29 E03 (batch watcher → status viewer), diagnosed batch job hanging (Inngest resync), analyzed RunPod worker restart failure root cause via production logs, wrote full analysis + solutions + support letter to `32-ux-conversations-and-adapter_v1.md`. No SAOL fixes or Spec 30 code changes.

### Session 16 (SAOL Diagnosis Session)
Attempted Spec 30 E01 execution. SAOL `transport: 'pg'` broken due to Supabase IPv4 deprecation. Diagnosed root cause, completed Task 1 via direct pg, wrote SAOL fix plan. No `src/` code changes made.

### Sessions Post-15 (Implementation Sessions)
Implemented Specs 20, 21, 23, 26, 28, 29, plus a 30-item bug fix batch. Major codebase changes: training pipeline rewrite, adapter pages, batch job improvements, conversation upgrades. 41 files changed, +4754/-259 lines in `src/`.

### Session 15: Training Pipeline Integration Specification (Spec 20 — Now Implemented)
Wrote the complete implementation specification. **This spec has now been fully implemented** — the `buildTrainingSet` rewrite, `ConversationTable` wiring, and Launch Tuning page are all done.

### Session 14: Training Pipeline Discovery & Gap Analysis
Research session. Identified 8 gaps + 1 critical JSONL format mismatch. All gaps addressed by Spec 20 (now implemented).

### Session 13: Spec 18 + Auto-Enrich + Modal Fix
Implemented Spec 18 (ConversationTable on workbase page), auto-enrichment, modal input visibility fix.

### Sessions 8–12: Foundation
Adapter deployment, v4-Show bug fixes, RAG pipeline, design palette, conversations module fixes.
````
