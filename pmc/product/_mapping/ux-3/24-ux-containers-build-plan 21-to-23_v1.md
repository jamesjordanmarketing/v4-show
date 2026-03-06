# Build Plan: Specs 21–23 Execution Sequence

**Version:** 1.0  
**Date:** 2026-03-02  
**Author:** Senior Architect  
**Scope:** Specs 21 (Batch Watcher), 22 (Chat Fix), 23 (Add Conversations to Training Set)

---

## Executive Summary

Four distinct pieces of work must be coordinated. One of them (`Spec 22, Fix 2`) is a **critical production fix** that must be executed immediately via SAOL terminal commands — it restores a broken chat feature with zero code changes. The remaining work is organized into sequenced agent sessions, two of which can run **in parallel** because they touch completely separate files.

---

## Dependency Map

```
┌──────────────────────────────────────────────────────────────────┐
│  IMMEDIATELY (terminal only, no agent needed)                    │
│  Spec 22 Fix 2: SAOL data commands (~10 min)                    │
│  → marks endpoints ready, sets active_adapter_job_id            │
│  → restores /workbase/.../fine-tuning/chat IMMEDIATELY          │
└───────────────────────────┬──────────────────────────────────────┘
                            │ no code dependency — just do it first
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  SESSION 1 — Spec 21 E01 (one agent context window)             │
│  DB: add workbase_id to batch_jobs + backfill                    │
│  Backend: batch-job-service.ts, batch-generation-service.ts,    │
│           api/batch-jobs/route.ts                                │
│  Prompt: 21-ux-containers-batch-page-execution-prompt-E01_v1.md │
│  Duration: ~30 min                                               │
│  Blockers: None (can run immediately after Fix 2)               │
└───────────────────────────┬──────────────────────────────────────┘
                            │ E02 cannot start until E01 is done
          ┌─────────────────┼──────────────────────────┐
          │                 │                          │
          ▼                 ▼                          ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  SESSION 2A     │  │  SESSION 2B     │  │  SESSION 2C         │
│  Spec 21 E02    │  │  Spec 22 Fixes  │  │  Spec 23            │
│  UI Pages       │  │  1 + 3 + 4      │  │  Add Convs to       │
│  REQUIRES E01   │  │  INDEPENDENT    │  │  Training Set       │
│  ~45 min        │  │  ~45 min        │  │  INDEPENDENT        │
│                 │  │                 │  │  ~30 min            │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
          │                 │                          │
          └─────────────────┴──────────────────────────┘
                            │
                            ▼
                    DONE — TypeScript build
                    + smoke test all three features
```

---

## File Conflict Analysis

Before running sessions in parallel, confirm there are **zero file overlaps**:

| File | Spec 21 E01 | Spec 21 E02 | Spec 22 | Spec 23 |
|------|:-----------:|:-----------:|:-------:|:-------:|
| `src/lib/services/batch-job-service.ts` | ✏️ | | | |
| `src/lib/services/batch-generation-service.ts` | ✏️ | | | |
| `src/app/api/batch-jobs/route.ts` | ✏️ | | | |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | | ✏️ | | |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` | | ✏️ | | |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx` | | **NEW** | | |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | | **NEW** | | |
| `src/inngest/functions/auto-deploy-adapter.ts` | | | ✏️ | |
| `src/types/workbase.ts` | | | ✏️ | |
| `src/app/api/workbases/[id]/route.ts` | | | ✏️ | |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx` | | | ✏️ | |
| `src/components/pipeline/chat/MultiTurnChat.tsx` | | | ✏️ | |
| `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` | | | | ✏️ |
| `src/inngest/functions/rebuild-training-set.ts` | | | | **NEW** |
| `src/inngest/functions/index.ts` | | | | ✏️ |
| `src/components/conversations/ConversationTable.tsx` | | | | ✏️ |

**Result: Zero file overlap between Sessions 2A, 2B, and 2C. All three can run in parallel.**

---

## Execution Steps

---

### STEP 0 — Immediate Production Fix (You run this yourself, right now)

**What:** SAOL terminal commands only. No agent, no code changes.  
**Why first:** Chat is broken in production. This fixes it in ~10 minutes with two SQL updates.  
**Spec:** `22-ux-containers-chat-functions-specification_v1.md`, Section 4 "Fix 2"

#### 0.1 — Mark Inference Endpoints Ready

```bash
# Dry-run first
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE pipeline_inference_endpoints SET status = 'ready', ready_at = NOW() WHERE job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd' AND status = 'deploying'\",
    transport: 'pg',
    dryRun: true
  });
  console.log('Dry-run:', JSON.stringify(r, null, 2));
})();"

# Apply (dryRun: false)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE pipeline_inference_endpoints SET status = 'ready', ready_at = NOW() WHERE job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd' AND status = 'deploying'\",
    transport: 'pg',
    dryRun: false
  });
  console.log('Applied:', JSON.stringify(r, null, 2));
})();"
```

#### 0.2 — Set Workbase `active_adapter_job_id`

```bash
# Dry-run first
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE workbases SET active_adapter_job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd', updated_at = NOW() WHERE id = '232bea74-b987-4629-afbc-a21180fe6e84'\",
    transport: 'pg',
    dryRun: true
  });
  console.log('Dry-run:', JSON.stringify(r, null, 2));
})();"

# Apply (dryRun: false)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE workbases SET active_adapter_job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd', updated_at = NOW() WHERE id = '232bea74-b987-4629-afbc-a21180fe6e84'\",
    transport: 'pg',
    dryRun: false
  });
  console.log('Applied:', JSON.stringify(r, null, 2));
})();"
```

#### 0.3 — Verify

Navigate to `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/chat` in the browser.  
**Expected:** Chat interface loads. "No adapter available" message is gone.

---

### STEP 1 — Session 1: Spec 21 E01 (One Agent Context Window)

**When:** After Step 0 completes (or simultaneously — no conflict)  
**Agent prompt:** Cut and paste from `21-ux-containers-batch-page-execution-prompt-E01_v1.md`  
**Duration:** ~30 minutes  

**What this session does:**
- Verifies `batch_jobs` schema via SAOL
- Adds `workbase_id UUID` column to `batch_jobs`
- Creates index `idx_batch_jobs_workbase_id`
- Backfills `workbase_id` from `shared_parameters->>'workbaseId'` for all existing rows
- Updates `batch-job-service.ts`: `createJob` signature, insert, `getAllJobs` filter, `getJobById` return
- Updates `batch-generation-service.ts`: passes `workbaseId` to `createJob`
- Updates `api/batch-jobs/route.ts`: parses `workbaseId` query param
- Runs `npx tsc --noEmit` to verify zero type errors

**Gate:** E02 (Session 2A) cannot start until **all items on the E01 completion checklist are green**. The E01 prompt ends with a checklist — confirm every item before proceeding.

**Verification signal:** `batch_jobs.workbase_id` column exists AND `npx tsc --noEmit` shows zero errors in the three modified files.

---

### STEP 2 — Sessions 2A, 2B, 2C (Three Parallel Agent Context Windows)

Open three separate Claude context windows simultaneously. They touch zero overlapping files.

---

#### Session 2A — Spec 21 E02: Batch UI Pages

**When:** After Session 1 (E01) is fully complete  
**Agent prompt:** Cut and paste from `21-ux-containers-batch-page-execution-prompt-E02_v1.md`  
**Duration:** ~45 minutes  

**What this session does:**
- Creates `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx`
  - Lists all batch jobs for the current workbase (fetches from `/api/batch-jobs?workbaseId=...`)
  - Each row is clickable, navigates to the batch watcher
- Creates `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`
  - Full-featured batch job watcher (processing loop, progress bar, cancel/pause/resume, auto-enrich)
  - Workbase-scoped navigation (back to batch list, CTAs to conversations + generator)
  - All design tokens enforced (no `zinc-*`)
- Modifies `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`
  - Adds "Batch Jobs" outline button alongside "New Conversation" button
- Modifies `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx`
  - Changes post-submission redirect from `/conversations` → `/conversations/batch/[jobId]`
- Runs `npx tsc --noEmit`
- Runs manual smoke test checklist (5 flows)
- Git commit

---

#### Session 2B — Spec 22 Code Changes (Fixes 1, 3, 4)

**When:** Can start immediately — does NOT depend on Session 1 or 2A  
**Agent prompt:** Construct from `22-ux-containers-chat-functions-specification_v1.md`, Sections 3, 5, 6  
**Duration:** ~45 minutes  

**What this session does:**

*Fix 1 — Prevent recurrence of broken chat (Inngest):*
- Modifies `src/inngest/functions/auto-deploy-adapter.ts`
  - Adds `workbase_id` to Step 1 `.select(...)`
  - Adds new Step 7b: updates `workbases.active_adapter_job_id` after adapter deployment
  - Updates return value to include `workbaseId`

*Fix 3 — API type safety:*
- Modifies `src/types/workbase.ts`
  - Adds `activeAdapterJobId?: string | null` to `UpdateWorkbaseRequest`
- Modifies `src/app/api/workbases/[id]/route.ts`
  - Accepts and applies `activeAdapterJobId` in PATCH handler

*Fix 4 — Chat page hardening:*
- **Rewrites** `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx`
  - Fallback adapter resolution: when `activeAdapterJobId` is null, queries `usePipelineJobs({ workbaseId })` for latest completed job
  - Auto-deploys endpoints when job exists but no endpoint records found
  - Explicit state machine: `loading | empty | no_adapter | deploying | endpoints_not_ready | ready`
  - All design tokens enforced
- Modifies `src/components/pipeline/chat/MultiTurnChat.tsx`
  - Replaces `text-zinc-500` with `text-muted-foreground`

- Runs `npx tsc --noEmit`
- Git commit

**Note for the agent running Session 2B:** The SAOL data fix (Step 0 above) must already be run before testing Fix 4. If it hasn't been run, the chat page will still show "No adapter" even after the code fix. The data fix is independent of the code changes.

---

#### Session 2C — Spec 23: Add Conversations to Existing Training Set

**When:** Can start immediately — does NOT depend on Session 1 or 2A  
**Agent prompt:** Construct from `23-ux-containers-add-conversations-spec_v1.md`  
**Duration:** ~30 minutes  

**What this session does:**
- Creates `src/inngest/functions/rebuild-training-set.ts`
  - New Inngest function listening for `training/set.updated`
  - Rebuilds full JSONL from merged conversation IDs
  - Updates or creates `datasets` record
  - Sets training set status back to `ready`
- Modifies `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`
  - Adds `PATCH` handler (alongside existing `DELETE`)
  - Adds `inngest` import
  - Validates conversations belong to workbase
  - Merges new IDs into `conversation_ids`, deduplicates
  - Resets status to `processing`
  - Emits `training/set.updated` Inngest event
- Modifies `src/inngest/functions/index.ts`
  - Imports and registers `rebuildTrainingSet`
- Modifies `src/components/conversations/ConversationTable.tsx`
  - Replaces hard-coded `/api/training-files` query with conditional: workbase mode → `/api/workbases/${workbaseId}/training-sets`; legacy mode → `/api/training-files`
  - Adds `addToTrainingSetMutation` for workbase mode
  - Updates `handleAddToExistingFile` to dispatch the correct mutation by mode
  - Removes `!workbaseId &&` guard on the "Existing Files" dropdown section
- Runs `npx tsc --noEmit`
- Git commit

---

## Summary Timeline

```
NOW         Step 0 (you): SAOL data fix — 10 min
            → Chat restored immediately in production

~5 min      Session 1: Spec 21 E01 — DB + backend — 30 min
            → E01 completion checklist must be green before 2A starts

~35 min     ┌─ Session 2A: Spec 21 E02 — UI pages — 45 min
            ├─ Session 2B: Spec 22 Fixes 1+3+4 — code — 45 min
            └─ Session 2C: Spec 23 — Add convs to training sets — 30 min
               (all three run in parallel)

~80 min     All sessions complete
            Final verification: npx tsc --noEmit from repo root
```

---

## Risk Notes

### Spec 21 E01 — DB Migration Risk: LOW
The column is added as `NULLABLE` with `ADD COLUMN IF NOT EXISTS` — no existing rows break.  
Backfill is a plain UPDATE from JSONB → UUID cast. If the cast fails on any row (malformed UUID in `shared_parameters`), that row is simply skipped (the `WHERE ... IS NOT NULL` clause prevents errors).

### Spec 22 Fix 4 — Chat Page Rewrite Risk: MEDIUM
The chat page is fully rewritten. The `usePipelineJobs` hook is used with a `workbaseId` filter — confirm this filter is supported by reading `src/hooks/usePipelineJobs.ts` before executing. If the hook doesn't support `workbaseId`, the fallback query must be written inline as a plain `fetch` call instead.

The agent running Session 2B should read `usePipelineJobs.ts` before writing the new chat page.

### Spec 23 — Inngest Rebuild Risk: LOW
The `rebuild-training-set.ts` function reuses `TrainingFileService.createTrainingFile()` — the same proven path used by the original `build-training-set.ts`. New code surface is minimal: just the PATCH route and the Inngest registration.

### Parallelism Risk: NONE
Sessions 2A, 2B, 2C share zero files. If two sessions happen to run git commits at the same time, a simple `git pull --rebase` resolves it.

---

## Completion Gate

All three specs are done when:

- [ ] Step 0: SAOL commands executed, chat loads at `/workbase/.../fine-tuning/chat`
- [ ] Session 1: E01 completion checklist all green, `batch_jobs.workbase_id` column exists
- [ ] Session 2A: E02 completion checklist all green, smoke tests 1–5 pass, git commit done
- [ ] Session 2B: `auto-deploy-adapter.ts` has Step 7b, chat page rewritten, `npx tsc --noEmit` clean, git commit done
- [ ] Session 2C: `rebuild-training-set.ts` exists, PATCH route added, `ConversationTable.tsx` shows existing training sets in workbase mode, `npx tsc --noEmit` clean, git commit done
- [ ] Final: `npx tsc --noEmit` from repo root — zero errors across all modified files

---

## Spec Reference Quick Links

| Spec | File | Agent Prompt |
|------|------|-------------|
| 21 E01 | `21-ux-containers-batch-page-execution-prompt-E01_v1.md` | Ready — cut and paste |
| 21 E02 | `21-ux-containers-batch-page-execution-prompt-E02_v1.md` | Ready — cut and paste |
| 22 | `22-ux-containers-chat-functions-specification_v1.md` | Sections 3+5+6 (Fixes 1, 3, 4) |
| 23 | `23-ux-containers-add-conversations-spec_v1.md` | Full document |
