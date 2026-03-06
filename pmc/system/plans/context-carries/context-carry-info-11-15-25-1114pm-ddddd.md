````markdown
# Context Carryover: v4-Show — Session 18+

**Last Updated:** March 4, 2026 (late session)
**Document Version:** context-carry-info-11-15-25-1114pm-dddd
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files. DO NOT run any commands.**

Your job upon receiving this context is to:

1. Read and internalize this **entire** document fully — every section, every table, every file reference.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Pay special attention to each file listed in the **Key Files** sections below. The most recently changed files are:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` (456 lines — fully rewritten in Session 18)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` (353 lines — fully rewritten in Session 18)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` (bug fixed in Session 18 — 2 return paths)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` (updated in Session 18 — poll timeout + error states)
3. Read and internalize the **SAOL Fix document** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`. This is the SAOL DNS / connectivity fix diagnosed in Session 16. **The SAOL library is currently broken for all `transport: 'pg'` operations.** Fixes A, B, C, D have **NOT** yet been applied.
4. Read and internalize the **Spec 30 execution prompts** (E01, E02, E03) in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\`. **E01 Task 1 (DB migration) is the only E01 task completed.** E01 Tasks 2–6, all of E02, and all of E03 are NOT yet implemented.
5. Read and internalize the **RunPod Worker Restart Analysis** section below and the full analysis document at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` (sections 3+ cover root cause, solutions, RunPod support letter, Session 18 failure analysis, and code fix details).
6. Read and internalize the **SAOL usage instructions** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`.
7. Understand the project stack, the SAOL DNS failure, the Spec 30 implementation plan, the RunPod worker restart bug, the Session 18 code fixes, and the current state of each task.
8. Then **wait for the human to tell you what to do next**.

The human's most likely next actions are:
- Ask you to **run SQL cleanup** in Supabase to clear stuck spinners for job `4222c6c1-531c-4142-b260-303f0ee5ebcc` (see SQL section below)
- Ask you to **help verify that the RunPod endpoint `workersMax` is reset** (currently `0` — must be ≥ 1 before testing)
- Ask you to **retest the adapter deploy / manual restart** after the above two prerequisites are done
- Ask you to **add an `onFailure` handler** to `refresh-inference-workers.ts` to auto-mark endpoints as `failed` in the DB on Inngest function crash
- Ask you to **fix bugs** or **analyze small upgrades** on the workbase UI
- Ask you to **apply the SAOL fixes** (Fix A through Fix D)
- Ask you to **continue implementing Spec 30 E01** (Tasks 2–6)

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

## 🚨 RunPod Worker Restart — Code Rewritten in Session 18 (Pending Verification)

### Current Status

Both `refresh-inference-workers.ts` and `restart-inference-workers.ts` were **fully rewritten** in Session 18 using a new `workersMax=0` toggle strategy. A critical JavaScript falsy-zero bug was also discovered during first-test and fixed. Code has been **pushed to GitHub** but **not yet successfully tested end-to-end**.

Two prerequisites must be completed before the next test run:
1. **Run SQL cleanup in Supabase** (stuck DB rows from failed test — see SQL section below)
2. **Set `workersMax = 2` (or ≥ 1) on RunPod endpoint `780tauhj7c126b`** via RunPod console (currently `workersMax=0`)

### Original Root Cause (from Session 17)

`saveEndpoint(workersMin: 0)` is a configuration change only — it does NOT force-terminate running workers. Step 2 polled `/health` every 5 seconds for 90 seconds waiting for `total workers === 0`. With 4 active workers (R:2 I:2), all 18 polls returned `total=4`. The function threw `Workers did not terminate within 90s` and returned HTTP 400 to Inngest.

### Session 18 Fix — New Worker Refresh Strategy

**Mechanism:**
1. Read and save `originalWorkersMax` from the RunPod endpoint config (from `pipeline_inference_endpoints` DB row).
2. Set `workersMax=0, idleTimeout=1` on the endpoint (kills autoscaler ceiling + forces rapid idle timeout).
3. POST to `/purge-queue` to clear any pending work so workers go idle faster.
4. Poll `/health` every 10s for up to 5 minutes waiting for `total workers === 0`.
5. In a `try/finally` block — **always** restore config (`workersMax=originalWorkersMax, workersMin=0, idleTimeout=300`) even if poll times out.
6. Wait for workers to be ready (polling for `ready > 0 || idle > 0`).
7. Verify adapter via test inference.
8. Update DB status to `ready`.

**`workersMin=0` is PERMANENT** on endpoint `780tauhj7c126b`. Workers only spin up on demand. `workersMin` is always saved back as `0` in all restore calls.

### Session 18 Bug — JavaScript Falsy Zero (FIXED)

**Root cause:** The user had manually set `workersMax=0` in the RunPod console before the test run. The original code used:
```ts
const savedWorkersMax = originalWorkersMax || ep.workersMax;
```
`0 || 0 = 0` — JavaScript treats `0` as falsy. The function restored `workersMax=0`, workers could never spin up, the 5-minute poll timed out, and Vercel's 300-second limit was hit before the internal timeout, leaving the DB in an intermediate state.

**Fix applied:**
```ts
const savedWorkersMax = Math.max(originalWorkersMax ?? ep.workersMax ?? 1, 1);
```
This ensures `savedWorkersMax` is always at least `1`, regardless of what value was stored before the deploy.

This same fix was applied in three places:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` — line ~162
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` — line ~149
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` — 2 return paths (lines ~416 and ~509)

### Session 18 Test Run Failure Detail (adapter-4222c6c1)

- `adapter-4222c6c1` test run triggered at ~5:28 PM
- `originalWorkersMax: 0` in the Inngest event data (user had set this manually)
- Old `||` code restored `workersMax=0`
- 29 consecutive polls: `[worker-refresh] Waiting for ready: R:0 I:0 Ru:0 In:0`
- Vercel Runtime Timeout (hard 300s limit) hit at `01:44:20`
- DB left with `pipeline_inference_endpoints.status = 'deploying'` and an in-progress `endpoint_restart_log` row

### SQL Cleanup Required (Not Yet Run)

Run these two UPDATE statements in the Supabase SQL editor **before the next test**:

```sql
-- 1. Clear stuck spinner on pipeline_inference_endpoints
UPDATE pipeline_inference_endpoints
SET
  status = 'ready',
  updated_at = now()
WHERE status = 'deploying'
  AND id = (
    SELECT endpoint_id
    FROM pipeline_training_jobs
    WHERE id = '4222c6c1-531c-4142-b260-303f0ee5ebcc'
  );

-- 2. Mark the stuck restart log row as failed
UPDATE endpoint_restart_log
SET
  status = 'failed',
  completed_at = now()
WHERE status NOT IN ('completed', 'failed')
  AND job_id = '4222c6c1-531c-4142-b260-303f0ee5ebcc';
```

### RunPod UI vs API Discrepancy (Documented)

The RunPod console always shows the **original** `LORA_MODULES` value from weeks ago — it never updates after API changes. This is likely because the UI reads from a different store or has a caching bug. A formal letter to RunPod support was written and appended to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`.

**Conclusion:** The RunPod UI showing stale `LORA_MODULES` is a display issue only. The API (`saveEndpoint` mutation and inference requests) correctly uses the latest env var values. Do not use the RunPod console to validate `LORA_MODULES` content.

### Files Changed in Session 18

| File | Change | Status |
|------|--------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Fully rewritten (420→456 lines). `workersMax=0` toggle strategy, `purge-queue`, `try/finally` restore, 5-min timeout, 10s polls. `Math.max` floor fix. | ✅ Written, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Fully rewritten (338→353 lines). Same strategy. Preserves `updateLog()` helper and pre-created `restartLogId`. `Math.max` floor fix. | ✅ Written, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | `Math.max` floor fix at 2 return paths (lines ~416 and ~509). | ✅ Fixed, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` | 10-minute poll timeout; `useRef` to track start time; yellow warning box + "Resume Polling" button after timeout; red error box for `failed` status; "Retry Restart" button label when failed. Imports: `useState, useEffect, useRef, useCallback` + `AlertTriangle`. Constants: `POLL_INTERVAL_MS = 10_000`, `POLL_TIMEOUT_MS = 600_000`. | ✅ Updated, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` | 3 new sections appended: "Revised Solution: workersMin=0 Always + workersMax=0 Toggle", "Letter to RunPod Support — API vs UI Configuration Discrepancy", "Test Run Failure Analysis — adapter-4222c6c1 (2026-03-05)" | ✅ Done |

### Known Gap: `onFailure` Handler Not Yet Added

If the Inngest `refresh-inference-workers` function crashes hard (e.g., Vercel 300s timeout hits before the internal `try/finally` restores config), the DB is left in an intermediate state. An `onFailure` handler on the Inngest function definition could auto-set `pipeline_inference_endpoints.status = 'failed'` and write a final `endpoint_restart_log` row on crash. This is not yet implemented.

---

## Active Development Focus: Spec 30 — Training Set Build Visibility + Partial Processing Fix

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
| `restart-inference-workers` | 1 | Single-lane manual restart |

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
│                   └── restart-status/route.ts # Pure DB reader (UI polls this)
├── components/
│   ├── conversations/
│   │   ├── ConversationTable.tsx
│   │   ├── ConversationDetailModal.tsx
│   │   └── ConfirmationDialog.tsx
│   ├── pipeline/
│   │   ├── TrainingParameterSlider.tsx
│   │   ├── CostEstimateCard.tsx
│   │   ├── AdapterStatusPing.tsx
│   │   ├── DeploymentTimeline.tsx
│   │   ├── EndpointRestartTool.tsx       # ← UPDATED (Session 18): poll timeout + error states
│   │   └── chat/MultiTurnChat.tsx
│   └── ui/ (shadcn components)
├── hooks/
│   ├── use-conversations.ts
│   ├── useTrainingSets.ts
│   ├── usePipelineJobs.ts
│   ├── useAdapterDetail.ts
│   └── ...
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── build-training-set.ts         # ← MODIFY (Spec 30 E01 Task 3)
│       ├── rebuild-training-set.ts       # ← MODIFY (Spec 30 E01 Task 2)
│       ├── auto-deploy-adapter.ts        # ← Math.max floor fix applied (Session 18)
│       ├── dispatch-training-job.ts
│       ├── restart-inference-workers.ts  # ← FULLY REWRITTEN (Session 18) — pending test
│       ├── refresh-inference-workers.ts  # ← FULLY REWRITTEN (Session 18) — pending test
│       └── index.ts
├── lib/
│   ├── types/
│   ├── services/
│   │   ├── training-file-service.ts
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

## Key Files for RunPod Worker Restart (Session 18 — Rewritten, Pending Test)

| File | Role | Session 18 Status |
|------|------|------------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Auto-triggered worker refresh after `pipeline/adapter.deployed` event. 456 lines. | ✅ Fully rewritten. `workersMax=0` toggle, `purge-queue`, 5-min drain, `Math.max` floor fix. Pushed. Zero TS errors. **Not yet passing end-to-end test.** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Manual worker restart (event: `pipeline/endpoint.restart.requested`). 353 lines. | ✅ Fully rewritten. Same strategy. `Math.max` floor fix. Pushed. Zero TS errors. **Not yet passing end-to-end test.** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | Deploys adapter, updates `LORA_MODULES`, emits `pipeline/adapter.deployed`. | ✅ `Math.max` floor fix at both return paths. Pushed. Zero TS errors. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` | UI component showing restart step progress on adapter detail page. Polls `/restart-status`. | ✅ Updated. 10-min poll timeout, `pollTimedOut` state, `pollStartRef` ref, "Resume Polling" button, red error box for `failed` status. Pushed. Zero TS errors. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart\route.ts` | API route for manual restart trigger. | No changes this session. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart-status\route.ts` | Pure DB reader for UI polling. | No changes needed. |

**Full solution details + test failure analysis:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`

---

## Key Files for Spec 30 E01 (Next Spec Work)

| File | Role | Spec 30 E01 Task |
|------|------|-----------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts` | Inngest function: rebuilds training set JSONL on `training/set.updated` event. ~238 lines. | Task 2: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts` | Inngest function: builds training set JSONL on `training/set.created` event. ~161 lines. | Task 3: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts` | GET/POST training sets for a workbase. ~156 lines. | Task 4: Add `lastBuildError` + `failedConversationIds` to GET response mapping |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\bypass\route.ts` | **DOES NOT EXIST YET** — New file to create. | Task 5: Create POST bypass endpoint |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client + event type definitions. | Reference only (event names used by bypass endpoint) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\supabase-server.ts` | Exports `requireAuth`, `createServerSupabaseAdminClient`. | Reference only (imported by all API routes) |

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
| `workersMin` | **0 — PERMANENT** (cold-start-only endpoint; never restored to any other value) |
| `workersMax` | **Currently 0 in RunPod console** — must be set to ≥ 1 before next test |
| vLLM control | `LORA_MODULES` env var only; hot-reload via `/v1/load_lora_adapter` NOT available on serverless proxy |
| GraphQL API | `https://api.runpod.io/graphql?api_key=<RUNPOD_API_KEY>` |
| Inference API | `INFERENCE_API_URL` env var (serverless endpoint URL) |
| RunPod Console | `https://www.runpod.io/console/serverless` |

### RunPod GraphQL `saveEndpoint` Mutation Behavior
- Full PUT (not PATCH) — must include all fields or they default to null/zero
- Updates autoscaler configuration only
- Does NOT terminate currently running workers
- Workers drain naturally based on idle timeout + autoscaler cycle (can take 2–5 minutes)
- No `forceTerminateWorkers` mutation exists for serverless endpoints

### RunPod Serverless Exposed Routes
`/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream` — any other route returns 404.

---

## What Has Changed — Session History

### Session 18 Changes (This Session)

| Item | Status |
|------|--------|
| `refresh-inference-workers.ts` — full rewrite with `workersMax=0` toggle strategy | ✅ Done, pushed |
| `restart-inference-workers.ts` — full rewrite, same strategy | ✅ Done, pushed |
| `auto-deploy-adapter.ts` — `Math.max` floor fix at 2 return paths | ✅ Done, pushed |
| `EndpointRestartTool.tsx` — poll timeout + error states | ✅ Done, pushed |
| All 4 files: zero TypeScript errors confirmed | ✅ Confirmed |
| RunPod UI vs API discrepancy letter written, appended to `32-ux-conversations-and-adapter_v1.md` | ✅ Done |
| Session 18 failure analysis (adapter-4222c6c1) written, appended to `32-ux-conversations-and-adapter_v1.md` | ✅ Done |
| Code pushed to GitHub | ✅ Done (`git push` exit code 0) |
| SQL cleanup for job `4222c6c1` stuck DB rows | ❌ **NOT YET RUN** |
| RunPod endpoint `workersMax` reset to ≥ 1 | ❌ **NOT YET DONE** (currently `workersMax=0`) |
| End-to-end test of rewritten functions | ❌ Not yet done (prerequisites above must be completed first) |
| `onFailure` handler for `refresh-inference-workers` | ❌ Not started |
| SAOL fixes (A, B, C, D) | ❌ Not applied |
| Spec 30 E01 Tasks 2–6 | ❌ Not started |

### Session 17 Changes

| Item | Status |
|------|--------|
| Spec 29 E03 (batch watcher page → status viewer) | ✅ Implemented, committed, pushed |
| Batch job hanging diagnosis (Inngest resync) | ✅ Resolved (no code change) |
| RunPod worker restart root cause analysis (vercel-104.csv, 7059 lines) | ✅ Full analysis + 4 solutions + RunPod support letter written to `32-ux-conversations-and-adapter_v1.md` |
| Concurrency analysis | ✅ Written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\31-ux-conversations-and-_v1.md` |
| SAOL fixes (A, B, C, D) | ❌ Not applied |
| Spec 30 E01 Tasks 2–6 | ❌ Not started |
| RunPod worker restart code fix | ❌ Analysis done only — code written in Session 18 |

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

### Stuck Rows from Session 18 Test (Job `4222c6c1`)

- `pipeline_inference_endpoints` has `status = 'deploying'` for the endpoint associated with job `4222c6c1-531c-4142-b260-303f0ee5ebcc`
- `endpoint_restart_log` has an in-progress row for that job (status not `completed` or `failed`)
- Both will show as stuck spinners in the UI until the SQL cleanup (above) is run

---

## What Needs Doing Next (Priority Order)

### 0. Pre-Test Cleanup (IMMEDIATE — Before Anything Else)

| Action | Where | Notes |
|--------|-------|-------|
| Run SQL cleanup | Supabase SQL editor (`https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku/sql`) | 2 UPDATE statements — see SQL section above |
| Set `workersMax = 2` on endpoint | RunPod Console → endpoint `780tauhj7c126b` → Template Settings | Currently `0` — workers cannot spin up |

### 1. Retest Adapter Deploy / Manual Restart

After SQL cleanup + RunPod `workersMax` reset + wait for current Vercel deployment to finish:
- Trigger a new adapter deploy OR click "Restart Workers" on any adapter detail page
- Watch Inngest dashboard for `refresh-inference-workers` or `restart-inference-workers` run
- Watch `EndpointRestartTool.tsx` UI for progress steps

### 2. Consider `onFailure` Handler for `refresh-inference-workers`

If Vercel hits its 300s hard limit before the Inngest `try/finally` block completes, the DB is left dirty. A small `onFailure` handler on the Inngest function definition would auto-set `pipeline_inference_endpoints.status = 'failed'` and write a terminal `endpoint_restart_log` row.

### 3. Apply SAOL Fixes (Currently Blocking All SAOL `pg` Operations)

Until Fix A is applied, no SAOL `transport: 'pg'` operations will work. Full plan in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`.

| Fix | What | Effort |
|-----|------|--------|
| **A** | Update `DATABASE_URL` in `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` to pooler URL | 30 seconds |
| **B** | Harden SSL in `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | 5 min |
| **C** | Add error mappings to `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | 10 min |
| **D** | Update docs (SAOL instructions + TROUBLESHOOTING.md) | 5 min |

### 4. Finish Spec 30 E01 Tasks 2–6 (Backend Error Storage + Bypass Endpoint)

Task 1 is done. Tasks 2–6 are code changes — full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md`.

### 5. Implement Spec 30 E02 (Training Sets Monitoring Page)

Requires E01 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md`.

### 6. Implement Spec 30 E03 (Cross-Page Selection + Sorting)

Requires E01 + E02 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md`.

### 7. Bug Fixes & Small UX Upgrades

As identified by the human.

---

## Important Specifications & Documents

| Document | Path | Role |
|----------|------|------|
| **RunPod Worker Restart Analysis + Session 18 Failure Report** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` | Full root cause analysis, 4 solution options, RunPod support letter, Session 18 test failure timeline, `Math.max` fix details, SQL cleanup statements |
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
| Stuck test job (needs SQL cleanup) | `4222c6c1-531c-4142-b260-303f0ee5ebcc` |

---

## Important Lessons (For Future Debugging)

### RunPod Serverless Workers

1. `saveEndpoint()` via GraphQL is a **configuration-only operation**. It does NOT terminate running workers.
2. Workers drain based on idle timeout + autoscaler cycle. With 4 workers, this can take 2–5 minutes minimum.
3. There is no RunPod API to force-terminate serverless workers. `podTerminate` is for Pod instances only.
4. RunPod serverless proxy exposes only: `/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream`. Any other route (e.g., vLLM's `/v1/load_lora_adapter`) returns 404.
5. `LORA_MODULES` env var changes only take effect on cold worker start, not on hot-running workers.
6. Use `POST /purge-queue` to clear pending work so workers go idle faster — this is allowed and safe.
7. Always use generous polling intervals (10s+) and timeouts (5 min+) for `total workers === 0` checks.
8. **`workersMax=0` via `saveEndpoint` stops new workers from spinning up.** Combined with `idleTimeout=1`, existing workers go idle and terminate quickly. Use this as the drain mechanism.
9. **JavaScript falsy zero trap:** `0 || fallback` evaluates to `fallback`. Always use `?? ` (nullish coalescing) or `Math.max(..., 1)` when the value could legitimately be `0`.
10. **RunPod UI shows stale `LORA_MODULES`** — the console display does not reliably reflect API state. Do not use it to validate env var content. Trust the API.
11. **`workersMin=0` is permanent on endpoint `780tauhj7c126b`.** Never restore it to any other value.
12. Vercel serverless functions have a hard 300-second execution limit. Inngest steps that do extended polling must complete well within this. If not, break into separate Inngest steps (retry-safe).

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

### Session 18 (This Session — RunPod Code Rewrite + Bug Fix + RunPod Letter)
Fully rewrote `refresh-inference-workers.ts` (420→456 lines) and `restart-inference-workers.ts` (338→353 lines) with `workersMax=0` toggle strategy + `purge-queue`. Fixed `EndpointRestartTool.tsx` poll timeout + error states. Discovered and fixed JavaScript falsy-zero bug (`0 || 0 = 0`) in `Math.max` at 3 files (4 call sites total). Wrote RunPod UI vs API discrepancy letter to `32-ux-conversations-and-adapter_v1.md`. Analyzed first test failure (adapter `4222c6c1` — Vercel 300s timeout due to falsy-zero bug). Pushed all code. Zero TypeScript errors. SQL cleanup and RunPod `workersMax` reset still pending.

### Session 17 (RunPod Diagnosis + Spec 29 E03 + Batch Fix)
Implemented Spec 29 E03 (batch watcher → status viewer), diagnosed batch job hanging (Inngest resync), analyzed RunPod worker restart failure root cause via production logs (vercel-104.csv, 7059 lines), wrote full analysis + solutions + support letter to `32-ux-conversations-and-adapter_v1.md`. No SAOL fixes or Spec 30 code changes.

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
