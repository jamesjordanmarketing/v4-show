# Context Carryover: v4-Show — Session 19+

**Last Updated:** March 4, 2026 (Session 19 complete)
**Document Version:** context-carry-info-11-15-25-1114pm-eeeee
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files. DO NOT run any commands.**

Your job upon receiving this context is to:

1. Read and internalize this **entire** document fully — every section, every table, every file reference.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Pay special attention to each file listed in the **Key Files** sections below. The most recently changed files are:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` (456 lines — fully rewritten in Session 18, **confirmed working** in Session 19)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` (353 lines — fully rewritten in Session 18, **confirmed working** in Session 19)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` (bug fixed in Session 18 — 2 return paths)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` (updated in Session 18 — poll timeout + error states)
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\multi-turn-conversation-service.ts` (relevant to fine-tuning chat — no system prompt sent by default)
3. Read and internalize the **SAOL Fix document** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`. The SAOL library is currently broken for all `transport: 'pg'` operations. Fixes A, B, C, D have **NOT** yet been applied.
4. Read and internalize the **Spec 30 execution prompts** (E01, E02, E03) in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\`. **E01 Task 1 (DB migration) is the only E01 task completed.** E01 Tasks 2–6, all of E02, and all of E03 are NOT yet implemented.
5. Read and internalize the **full analysis document** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` (1555 lines). Sessions 19, 19b, and 19c were appended in this session — covering: RunPod API test script, worker restart cycle confirmation, training set reuse analysis, training set duplicate behavior (3-layer dedup), and fine-tuning chat system prompt analysis.
6. Read and internalize the **Worker Restart Test Script** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js`. This script tests the RunPod drain+restore cycle directly via the API without going through Inngest.
7. Read and internalize the **SAOL usage instructions** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`.
8. Understand the project stack, the SAOL DNS failure, the Spec 30 implementation plan, the adapter deployment pipeline, and the current state of each task.
9. Then **wait for the human to tell you what to do next**.

The human's most likely next actions are:
- Ask you to **continue improving the adapter launch/restart functionality** (e.g., `onFailure` handler for `refresh-inference-workers`, UI improvements)
- Ask you to **run SQL cleanup** in Supabase to clear stuck spinners for job `4222c6c1-531c-4142-b260-303f0ee5ebcc` (see SQL section below — still not yet run)
- Ask you to **fix bugs** or **analyze small upgrades** on the workbase fine-tuning UI
- Ask you to **apply the SAOL fixes** (Fix A through Fix D)
- Ask you to **continue implementing Spec 30 E01** (Tasks 2–6)
- Ask you to **build a new training set or re-run adapter training** with the same or different data

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

## ✅ RunPod Worker Restart — CONFIRMED WORKING (Session 19)

### Current Status

**The full adapter deployment → worker restart → chat pipeline is confirmed working end-to-end.** In Session 19:
- User set `workersMax = 2` on RunPod endpoint `780tauhj7c126b`
- Test script (`33-training-set-start-adapters_v1.js`) ran successfully — workers drained and came back READY
- An adapter was loaded, workers restarted, and the fine-tuning chat page successfully used the adapter
- The adapter demonstrated strong emotional intelligence behavior — **confirmed to come from adapter weights, not any hardcoded system prompt**

### Remaining Cleanup Item

The SQL cleanup for the **old stuck job `4222c6c1`** has still **NOT been run**. It is not blocking anything now (the new test succeeded), but the stuck DB rows may cause cosmetic spinner issues on the adapter detail page for that specific old job. Run when convenient:

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

### Session 18 Fix Summary (Background — Now Confirmed Working)

**The `workersMax=0` toggle strategy** is in production and working:
1. Read and save `originalWorkersMax` from RunPod endpoint config
2. Set `workersMax=0, idleTimeout=1` (kills autoscaler ceiling + forces rapid idle eviction)
3. POST to `/purge-queue` to clear pending work
4. Poll `/health` every 10s up to 5 minutes for `total workers === 0`
5. In `try/finally` block — **always** restore `workersMax=Math.max(originalWorkersMax, 1), workersMin=0, idleTimeout=300`
6. Poll for `ready > 0 || idle > 0`
7. Verify adapter via test inference
8. Update DB status to `ready`

**JavaScript falsy-zero fix (in 3 files, 4 call sites):**
```typescript
// OLD (broken):
const savedWorkersMax = originalWorkersMax || ep.workersMax;
// NEW (fixed):
const savedWorkersMax = Math.max(originalWorkersMax ?? ep.workersMax ?? 1, 1);
```

**`workersMin=0` is PERMANENT** on endpoint `780tauhj7c126b`. Always saved back as `0` in all restore calls.

### Worker Restart Test Script

**Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js`

**Run with:**
```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
node pmc/product/_mapping/ux-3/build-30/33-training-set-start-adapters_v1.js
```

**What it does:** Reads current `workersMax` → sets to 0 (drain) → polls until workers gone → purges queue → restores `Math.max(original, 1)` → polls until workers READY. Full logging at each step. Expected runtime 3–6 minutes. Loads env vars from `.env.local` via `C:\Users\james\Master\BrightHub\BRun\v4-show\load-env.js`. No DB records or spinners are created — pure API test.

### Current RunPod Endpoint Config

| Setting | Value |
|---------|-------|
| `workersMax` | **2** (set by user in Session 19) |
| `workersMin` | **0** (permanent — cold-start-only endpoint) |
| `idleTimeout` | 300 (default, restored after each drain cycle) |
| Endpoint ID | `780tauhj7c126b` |

### Known Gap: `onFailure` Handler Not Yet Added

If the Inngest `refresh-inference-workers` function crashes hard (e.g., Vercel 300s timeout hits before the internal `try/finally` restores config), the DB is left in an intermediate state. An `onFailure` handler on the Inngest function definition could auto-set `pipeline_inference_endpoints.status = 'failed'` and write a final `endpoint_restart_log` row on crash. This is not yet implemented.

### Files Changed in Sessions 18–19

| File | Change | Status |
|------|--------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Fully rewritten (420→456 lines). `workersMax=0` toggle, `purge-queue`, `try/finally` restore, 5-min timeout, 10s polls, `Math.max` floor fix. | ✅ Written, pushed, zero TS errors, **confirmed working** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Fully rewritten (338→353 lines). Same strategy. `Math.max` floor fix. | ✅ Written, pushed, zero TS errors, **confirmed working** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | `Math.max` floor fix at 2 return paths (lines ~416 and ~509). | ✅ Fixed, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` | 10-min poll timeout, `useRef` start-time tracking, yellow warning box + "Resume Polling" button, red error box for `failed` status. | ✅ Updated, pushed, zero TS errors |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` | Sessions 19, 19b, 19c appended (1177 → 1555 lines) | ✅ Done |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js` | New: RunPod worker restart test script | ✅ Created, tested successfully |

---

## Session 19 Knowledge: Training Set & Fine-Tuning Chat Analysis

### Training Set Reuse: Same Training Set for a New Fine-Tuning Job

**Safe and expected.** Every fine-tuning job gets a **random UUID (v4)** from Postgres (`uuid_generate_v4()`). There are zero uniqueness constraints on `dataset_id`. Reusing a training set creates a completely separate, fully independent job:

| Aspect | First Job | Second Job (same training set) |
|--------|-----------|-------------------------------|
| `job_id` | `4222c6c1-531c-...` | New random UUID |
| `dataset_id` | `abc123` | `abc123` (same — no conflict) |
| Adapter name | `adapter-4222c6c1` | `adapter-{new8chars}` (unique) |
| HF repo | `lora-emotional-intelligence-4222c6c1` | Unique repo |
| DB records | Fully independent | Fully independent |

The new job will run through the full `auto-deploy-adapter` → `refresh-inference-workers` pipeline with the `Math.max` fix in place.

### Training Set Duplicate Behavior (75 requested, 25 already in file)

The system has **three independent deduplication layers**:

| Layer | Location | Behavior |
|-------|----------|----------|
| **1** | PATCH API route (`src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`) | Checks `training_sets.conversation_ids` array column. Silently drops 25 duplicates → passes 50 to Inngest. Returns `{ success: true, addedCount: 50 }` — no error, no warning. Only errors (HTTP 400) if **all** are duplicates. |
| **2** | Inngest `rebuild-training-set.ts` | Re-checks `training_file_conversations` junction table. Confirms 50 new IDs. |
| **3** | `TrainingFileService` (`src/lib/services/training-file-service.ts`) | Hard throw if any duplicates slip through (race condition guard). Inngest job fails cleanly — no file corruption. |

**Result:** 25 silently skipped, 50 added, JSONL file extended in-place. Status returns to `'ready'`.

Note: A single conversation can produce **multiple JSONL lines** (one per turn). Adding 50 conversations may produce 100–300+ JSONL rows.

### Fine-Tuning Chat Page System Prompts (`/workbase/[id]/fine-tuning/chat`)

**There are zero hardcoded system prompts on this page for either chat box.**

The page (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\chat\page.tsx`) renders a `MultiTurnChat` component with two boxes:

| Chat Box | Endpoint | System Prompt |
|----------|----------|---------------|
| **Control** | Base Mistral 7B (no adapter) | **None** — `conversation.system_prompt` is `null` in DB |
| **Adapted** | Same base model + LoRA adapter | **None** — same conversation record, same `null` |

The `systemPrompt` state initializes to `''`. In `multi-turn-conversation-service.ts`:
```typescript
if (systemPrompt) {
  messages.push({ role: 'system', content: systemPrompt });
}
// skipped — systemPrompt is null/undefined
```

What gets sent to the LLM is only the raw conversation turns — no `system` message.

**EI language exists in the codebase but only in training data pipelines:**
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\conversation-enrichment-service.ts` — "You are an emotionally intelligent financial planning chatbot..." — training data enrichment only
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\parameter-assembly-service.ts` — "Money is emotional - Acknowledge feelings before facts" — batch training generation only

Neither of these is imported by `multi-turn-conversation-service.ts`.

**Conclusion:** The emotional intelligence observed in the chat is **100% from the fine-tuned LoRA adapter weights** — proof the training worked correctly.

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
C:\Users\james\Master\BrightHub\BRun\v4-show\src\
├── app/
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── home/page.tsx
│   │   ├── conversations/page.tsx
│   │   ├── training-files/page.tsx
│   │   ├── datasets/
│   │   ├── pipeline/
│   │   └── workbase/[id]/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── generate/page.tsx
│   │       │   │   └── [convId]/page.tsx
│   │       │   ├── launch/page.tsx
│   │       │   ├── adapters/
│   │       │   │   ├── page.tsx
│   │       │   │   └── [jobId]/page.tsx
│   │       │   └── chat/page.tsx          ← fine-tuning chat (NO system prompt by default)
│   │       ├── fact-training/
│   │       └── settings/page.tsx
│   └── api/
│       ├── conversations/
│       ├── training-files/route.ts
│       ├── datasets/
│       ├── workbases/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── training-sets/
│       │           ├── route.ts           ← GET/POST ← MODIFY (Spec 30 E01 Task 4)
│       │           └── [tsId]/
│       │               ├── route.ts       ← PATCH adds convs (3-layer dedup)
│       │               ├── reset/route.ts
│       │               └── bypass/route.ts  ← NEW (Spec 30 E01 Task 5)
│       └── pipeline/
│           ├── jobs/route.ts
│           └── adapters/
│               └── [jobId]/
│                   ├── restart/route.ts
│                   └── restart-status/route.ts
├── components/
│   ├── conversations/
│   ├── pipeline/
│   │   ├── TrainingParameterSlider.tsx
│   │   ├── CostEstimateCard.tsx
│   │   ├── AdapterStatusPing.tsx
│   │   ├── DeploymentTimeline.tsx
│   │   ├── EndpointRestartTool.tsx        ← UPDATED (Session 18): poll timeout + error states
│   │   └── chat/MultiTurnChat.tsx         ← systemPrompt defaults to '' → null
│   └── ui/
├── hooks/
│   ├── use-conversations.ts
│   ├── useTrainingSets.ts
│   ├── usePipelineJobs.ts
│   ├── useAdapterDetail.ts
│   └── useDualChat.ts                     ← drives both chat boxes on fine-tuning/chat
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── build-training-set.ts          ← MODIFY (Spec 30 E01 Task 3)
│       ├── rebuild-training-set.ts        ← MODIFY (Spec 30 E01 Task 2)
│       ├── auto-deploy-adapter.ts         ← Math.max floor fix applied
│       ├── dispatch-training-job.ts
│       ├── restart-inference-workers.ts   ← FULLY REWRITTEN, CONFIRMED WORKING
│       ├── refresh-inference-workers.ts   ← FULLY REWRITTEN, CONFIRMED WORKING
│       └── index.ts
├── lib/
│   ├── types/
│   ├── services/
│   │   ├── training-file-service.ts
│   │   ├── multi-turn-conversation-service.ts  ← no system prompt on fine-tuning chat
│   │   ├── pipeline-service.ts
│   │   ├── conversation-enrichment-service.ts  ← EI prompts here (training data only)
│   │   ├── parameter-assembly-service.ts       ← EI prompts here (training data only)
│   │   └── batch-generation-service.ts
│   └── pipeline/hyperparameter-utils.ts
├── stores/
│   ├── conversation-store.ts
│   └── pipelineStore.ts
└── types/
    ├── workbase.ts
    ├── pipeline.ts
    └── adapter-detail.ts                  ← RestartStatus state machine
```

---

## Key Files for RunPod Worker Restart (Sessions 18–19 — Rewritten and Confirmed Working)

| File | Role | Status |
|------|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\refresh-inference-workers.ts` | Auto-triggered worker refresh after `pipeline/adapter.deployed` event. 456 lines. | ✅ Fully rewritten. `workersMax=0` toggle, `purge-queue`, 5-min drain, `Math.max` floor. **CONFIRMED WORKING.** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` | Manual worker restart (event: `pipeline/endpoint.restart.requested`). 353 lines. | ✅ Fully rewritten. Same strategy. **CONFIRMED WORKING.** |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\auto-deploy-adapter.ts` | Deploys adapter, updates `LORA_MODULES`, emits `pipeline/adapter.deployed`. | ✅ `Math.max` floor fix at both return paths. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx` | UI component showing restart step progress on adapter detail page. Polls `/restart-status`. | ✅ 10-min poll timeout, `pollTimedOut` state, "Resume Polling" button, red error box. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart\route.ts` | API route for manual restart trigger. | No changes. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\[jobId]\restart-status\route.ts` | Pure DB reader for UI polling. | No changes. |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js` | Standalone Node.js test script for RunPod drain+restore cycle. | ✅ Created Session 19, tested successfully. |

**Full solution details + run history:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md`

---

## Key Files for Spec 30 E01 (Next Spec Work)

| File | Role | Spec 30 E01 Task |
|------|------|-----------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts` | Inngest function: rebuilds training set JSONL on `training/set.updated` event. ~238 lines. | Task 2: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts` | Inngest function: builds training set JSONL on `training/set.created` event. ~161 lines. | Task 3: Replace catch block with structured error storage + clear errors on success path |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts` | GET/POST training sets for a workbase. ~156 lines. | Task 4: Add `lastBuildError` + `failedConversationIds` to GET response mapping |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\bypass\route.ts` | **DOES NOT EXIST YET** — New file to create. | Task 5: Create POST bypass endpoint |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client + event type definitions. | Reference only |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\supabase-server.ts` | Exports `requireAuth`, `createServerSupabaseAdminClient`. | Reference only |

---

## Key Files for SAOL Fixes

| File | Fix | Change |
|------|-----|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` | Fix A | Replace `DATABASE_URL` value with pooler URL |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | Fix B | Harden SSL detection in `getPgClient()` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | Fix C | Add 3 connection error mappings |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md` | Fix D | Add prerequisites section |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\TROUBLESHOOTING.md` | Fix D | Add DNS/IPv4 troubleshooting section |

After code fixes (B, C): `cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && npm run build`

---

## RunPod Infrastructure Reference

| Item | Value |
|------|-------|
| Endpoint ID | `780tauhj7c126b` |
| Current `workersMax` | **2** (set by user in Session 19) |
| Current `workersMin` | **0** (permanent) |
| Model | Mistral-7B-Instruct-v0.2 (base) + LoRA adapters via `LORA_MODULES` env var |
| `LORA_MODULES` format | JSON array: `[{"name":"adapter-name","path":"hf://user/repo"}]` |
| vLLM adapter control | `LORA_MODULES` env var only; hot-reload NOT available on serverless proxy |
| GraphQL API URL | `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}` |
| GraphQL auth | Query param `?api_key=` — NOT a Bearer header |
| Inference API base URL | `INFERENCE_API_URL` env var = `https://api.runpod.ai/v2/780tauhj7c126b` |
| Inference auth | `Authorization: Bearer ${GPU_CLUSTER_API_KEY}` |
| Health check | `GET ${INFERENCE_API_URL}/health` |
| Purge queue | `POST ${INFERENCE_API_URL}/purge-queue` |
| RunPod Console | `https://www.runpod.io/console/serverless` |

### RunPod Env Vars

| Env var | Purpose |
|---------|---------|
| `RUNPOD_GRAPHQL_API_KEY` | GraphQL mutations/queries (endpoint config) |
| `GPU_CLUSTER_API_KEY` | Serverless Bearer auth (inference + training) |
| `RUNPOD_API_KEY` | Fallback for `GPU_CLUSTER_API_KEY` |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | Inference endpoint ID (`780tauhj7c126b`) |
| `INFERENCE_API_URL` | Full serverless base URL |
| `GPU_CLUSTER_API_URL` | Training endpoint base URL |

### RunPod GraphQL `saveEndpoint` Mutation Behavior

- Full PUT (not PATCH) — must include all fields or they default to null/zero
- Always read full endpoint config first, then send all fields back with only the desired overrides changed
- Does NOT terminate running workers — workers drain based on idle timeout + autoscaler cycle
- No `forceTerminateWorkers` mutation exists for serverless endpoints
- RunPod console shows stale `LORA_MODULES` — display issue only; API state is authoritative

### RunPod Serverless Exposed Routes

`/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream` — any other route returns 404.

---

## What Has Changed — Session History

### Session 19 Changes (This Session)

| Item | Status |
|------|--------|
| Worker restart test script (`33-training-set-start-adapters_v1.js`) — written and tested | ✅ Done, script at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js` |
| RunPod `workersMax` set to 2 by user | ✅ Done |
| Worker drain+restore cycle confirmed working via test script | ✅ Confirmed |
| Adapter loaded, workers restarted, chat page used adapter — full pipeline confirmed | ✅ Confirmed |
| EI behavior confirmed from adapter weights — no hardcoded system prompt | ✅ Confirmed |
| Training set reuse analysis (same dataset = new UUID job, no collision) | ✅ Documented in 32-doc Session 19 |
| Training set duplicate behavior (75 requested, 25 already in file → 50 silently added) | ✅ Documented in 32-doc Session 19b |
| Fine-tuning chat system prompt analysis (no EI in either chat box) | ✅ Documented in 32-doc Session 19c |
| SQL cleanup for job `4222c6c1` stuck rows | ❌ **NOT YET RUN** (not blocking — new test worked) |
| `onFailure` handler for `refresh-inference-workers` | ❌ Not started |
| SAOL fixes (A, B, C, D) | ❌ Not applied |
| Spec 30 E01 Tasks 2–6 | ❌ Not started |

### Session 18 Changes

| Item | Status |
|------|--------|
| `refresh-inference-workers.ts` — full rewrite | ✅ Done, pushed |
| `restart-inference-workers.ts` — full rewrite | ✅ Done, pushed |
| `auto-deploy-adapter.ts` — `Math.max` floor fix | ✅ Done, pushed |
| `EndpointRestartTool.tsx` — poll timeout + error states | ✅ Done, pushed |
| JavaScript falsy-zero bug found and fixed in 3 files (4 call sites) | ✅ Done |
| RunPod UI vs API discrepancy letter written to `32-ux-conversations-and-adapter_v1.md` | ✅ Done |
| Session 18 failure analysis (adapter `4222c6c1`) written to `32-ux-conversations-and-adapter_v1.md` | ✅ Done |

### Session 17 Changes

Spec 29 E03 (batch watcher → status viewer) implemented. RunPod worker restart root cause analysis (vercel-104.csv). Concurrency analysis written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\31-ux-conversations-and-_v1.md`.

### Session 16

SAOL `transport: 'pg'` broken — diagnosed root cause. Spec 30 E01 Task 1 completed via direct pg. SAOL fix plan written.

### Sessions Post-15

Specs 20, 21, 23, 26, 28, 29, plus 30-item bug fix batch. Major codebase changes: training pipeline rewrite, adapter pages, batch improvements, conversation upgrades. 41 files changed.

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
| `dataset_id` | uuid | FK to datasets |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `last_build_error` | text | **NEW — added Session 16** (Spec 30 E01 Task 1) |
| `failed_conversation_ids` | text[] | **NEW — added Session 16** (Spec 30 E01 Task 1) |

### `pipeline_training_jobs` Table (Key Columns)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK — `DEFAULT uuid_generate_v4()` — **random, not derived from dataset** |
| `dataset_id` | UUID | FK to `datasets(id)` — no UNIQUE constraint, many jobs can share same dataset |
| `adapter_status` | text | |
| `adapter_file_path` | text | |
| `hf_adapter_path` | text | |

### `endpoint_restart_log` Table

Used by `refresh-inference-workers.ts` and `restart-inference-workers.ts`.

**RestartStatus state machine** (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\adapter-detail.ts`):
`initiated` → `scaling_down` → `workers_terminated` → `scaling_up` → `workers_ready` → `verifying` → `completed` | `failed`

### Stuck Rows from Session 18 Test (Job `4222c6c1`) — Low Priority

- `pipeline_inference_endpoints` may still show `status = 'deploying'` for job `4222c6c1-531c-4142-b260-303f0ee5ebcc`
- `endpoint_restart_log` may have an in-progress row for that job
- Run the SQL cleanup above when convenient (not urgent — new tests work fine)

---

## What Needs Doing Next (Priority Order)

### 1. Adapter Launch Functionality — Improvements (as directed by human)

The full pipeline now works end-to-end. Potential next improvements:
- **`onFailure` handler** for `refresh-inference-workers` — prevents stuck spinners on hard crash
- **UI feedback improvements** on the adapter detail page
- **Bug fixes** as identified during use

### 2. SQL Cleanup for Job `4222c6c1` (Low Priority — Not Blocking)

Run the 2 UPDATE statements in Supabase SQL editor (`https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku/sql`). See SQL section above.

### 3. Apply SAOL Fixes (Currently Blocking All SAOL `pg` Operations)

| Fix | What | Effort |
|-----|------|--------|
| **A** | Update `DATABASE_URL` in `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` to pooler URL | 30 seconds |
| **B** | Harden SSL in `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | 5 min |
| **C** | Add error mappings to `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | 10 min |
| **D** | Update SAOL docs | 5 min |

### 4. Spec 30 E01 Tasks 2–6

Task 1 done. Tasks 2–6 are code changes. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md`.

### 5. Spec 30 E02, E03

Require E01 complete first.

---

## Important Specifications & Documents

| Document | Path | Role |
|----------|------|------|
| **RunPod Worker Restart + Session 18/19 Analysis** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\32-ux-conversations-and-adapter_v1.md` | Full root cause, solutions, RunPod letter, Session 18 failure, Session 19 confirmations, training set reuse/duplicate/chat-system-prompt analysis (1555 lines) |
| **Worker Restart Test Script** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\33-training-set-start-adapters_v1.js` | Node.js script for isolated RunPod drain+restore API test |
| **Concurrency Analysis** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\31-ux-conversations-and-_v1.md` | Inngest concurrency limits analysis |
| **SAOL Fix (Session 16)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md` | Diagnosis + 4-fix plan for SAOL DNS failure |
| **Spec 30 E01 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md` | Backend: DB schema (DONE) + Inngest error storage + API endpoints (NOT DONE) |
| **Spec 30 E02 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md` | Training Sets monitoring page |
| **Spec 30 E03 execution prompt** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md` | Cross-page selection + server-side sorting |
| **Spec 30 parent spec** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\30-training-set-add-spec_v2.md` | Full specification |
| **SAOL usage instructions** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md` | How to use SAOL |
| **UX Decisions (master spec)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\07-internal-ux-decisions_v4.md` | D1 (eliminate data shaping), design tokens |

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
| Workbase: rag-KB-v2_v1 (primary user) | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 (second user) | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| RunPod inference endpoint | `780tauhj7c126b` |
| Supabase project ref | `hqhtbxlgzysfbekexwku` |
| Old stuck test job (SQL cleanup pending) | `4222c6c1-531c-4142-b260-303f0ee5ebcc` |

---

## Important Lessons (For Future Debugging)

### RunPod Serverless Workers

1. `saveEndpoint()` via GraphQL is **configuration-only**. It does NOT terminate running workers.
2. Workers drain based on idle timeout + autoscaler cycle. With 4 workers, this can take 2–5 minutes.
3. There is no RunPod API to force-terminate serverless workers. `podTerminate` is for Pod instances only.
4. RunPod serverless proxy exposes only: `/runsync`, `/run`, `/health`, `/status`, `/cancel`, `/purge-queue`, `/stream`. Any other route returns 404.
5. `LORA_MODULES` env var changes only take effect on cold worker start, not on hot-running workers.
6. Use `POST /purge-queue` to clear pending work so workers go idle faster.
7. Always use generous polling intervals (10s+) and timeouts (5 min+) for `total workers === 0` checks.
8. **`workersMax=0` via `saveEndpoint` stops new workers from spinning up.** Combined with `idleTimeout=1`, existing workers terminate quickly. Use this as the drain mechanism.
9. **JavaScript falsy zero trap:** `0 || fallback` evaluates to `fallback`. Always use `??` (nullish coalescing) or `Math.max(..., 1)` when the value could legitimately be `0`.
10. **RunPod UI shows stale `LORA_MODULES`** — console display does not reflect API state. Trust the API.
11. **`workersMin=0` is permanent on endpoint `780tauhj7c126b`.** Never restore it to any other value.
12. Vercel serverless functions have a hard 300-second execution limit. Inngest steps doing extended polling must complete within this. If not, break into separate Inngest steps.
13. **`saveEndpoint` is full PUT** — always read all fields first, then send them all back with only desired overrides.

### Fine-Tuning Chat (`/workbase/[id]/fine-tuning/chat`)

1. Both chat boxes (control + adapted) use the same `null` system prompt by default.
2. No system message is sent to the LLM at all in the default flow.
3. EI language in the codebase lives exclusively in training data generation pipelines — not in inference.
4. Observed EI behavior from the adapted model comes from the LoRA adapter weights, not from prompting.

### Training Set Behavior

1. Adding conversations to an existing training set has 3-layer dedup — duplicates silently skipped.
2. Only errors (HTTP 400) if ALL requested conversations are already in the set.
3. A single conversation can produce multiple JSONL lines (one per training turn).
4. Training set files: `{uuid}/training.jsonl` and `{uuid}/training.json` in Supabase Storage `training-files` bucket.
5. Reusing a training set for a new fine-tuning job is safe — each job gets independent UUID, no collision.

### SAOL Library Setup

1. `supa-agent-ops/node_modules/` and `supa-agent-ops/dist/` are `.gitignored`. Run `npm install` after cloning.
2. The library requires `DATABASE_URL` for `transport: 'pg'`. The direct connection URL no longer resolves on IPv4. Use the pooler URL (`aws-1-us-west-1.pooler.supabase.com:5432`, session mode).
3. Always use `transport: 'pg'` for DDL operations. REST/supabase transport cannot execute DDL.

### Conversations Module — Type Architecture

1. `GET /api/conversations` returns `StorageConversation[]` (snake_case).
2. `useConversations()` hook is typed as `Conversation[]` but returns `StorageConversation[]`. Do NOT change the type.
3. All UI components expect camelCase `Conversation` objects — always apply `transformStorageToConversation()`.

### Inngest Resync

If Inngest functions appear stuck, try manual resync via Inngest dashboard (Apps → Sync). Resolves stale function registration without code changes.

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

### Session 19 (This Session — Worker Restart Confirmation + Training Set & Chat Analysis)
Worker restart test script written (`33-training-set-start-adapters_v1.js`) and confirmed working. Full adapter deployment pipeline confirmed end-to-end: adapter loaded, workers restarted, fine-tuning chat used the adapter and demonstrated EI behavior (from adapter weights, not system prompt). Training set reuse analysis documented. Training set duplicate behavior (3-layer dedup, 25 silently skipped) documented. Fine-tuning chat system prompt analysis documented (no EI hardcoded). Three new sections appended to `32-ux-conversations-and-adapter_v1.md`.

### Session 18 (RunPod Code Rewrite + Bug Fix)
Fully rewrote `refresh-inference-workers.ts` + `restart-inference-workers.ts` with `workersMax=0` toggle strategy. Fixed JavaScript falsy-zero bug (`0 || 0 = 0`) with `Math.max` in 3 files. Updated `EndpointRestartTool.tsx` poll timeout + error states. First test run (adapter `4222c6c1`) failed due to falsy-zero bug + Vercel 300s timeout. All code pushed.

### Session 17 (RunPod Diagnosis + Spec 29 E03)
Spec 29 E03 implemented. RunPod worker restart root cause analyzed from production logs.

### Session 16 (SAOL Diagnosis)
SAOL broken — IPv4 deprecation. Spec 30 E01 Task 1 completed via direct pg. SAOL fix plan written.

### Sessions Post-15
Specs 20, 21, 23, 26, 28, 29, plus 30-item bug fix batch. 41 files changed in `src/`.
