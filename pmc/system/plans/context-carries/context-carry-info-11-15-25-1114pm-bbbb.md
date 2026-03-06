# Context Carryover: v4-Show — Session 16+

**Last Updated:** March 4, 2026
**Document Version:** context-carry-info-11-15-25-1114pm-bbbb
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files. DO NOT run any commands.**

Your job upon receiving this context is to:

1. Read and internalize this **entire** document fully — every section, every table, every file reference.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Pay special attention to the files listed in the **Key Files** sections below.
3. Read and internalize the **SAOL Fix document** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`. This is the SAOL DNS / connectivity fix diagnosed in this session. **The SAOL library is currently broken for all `transport: 'pg'` operations.** Fix A (`.env.local` DATABASE_URL update) has NOT yet been applied — three additional code fixes (B, C, D) also need to be done.
4. Read and internalize the **Spec 30 execution prompts** (E01, E02, E03) in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\`. These are the next implementation prompts. **E01 Task 1 (DB migration) was already completed during this session** — the `last_build_error` and `failed_conversation_ids` columns now exist on `training_sets`. E01 Tasks 2–6, all of E02, and all of E03 are NOT yet implemented.
5. Read and internalize the **SAOL usage instructions** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`.
6. Understand the project stack, the SAOL DNS failure, the Spec 30 implementation plan, and the current state of each task.
7. Then **wait for the human to tell you what to do next**.

The human's most likely next actions are:
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

## 🚨 SAOL DNS Failure — Currently Blocking (Diagnosed This Session)

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

## Active Development Focus: Spec 30 — Training Set Build Visibility + Partial Processing Fix

### What This Session Did (Session 16 — Diagnosis Session)

This session attempted to execute Spec 30 E01 (Backend: DB Schema + Inngest Error Storage + API Endpoints). During Task 1 (DB migration via SAOL), the SAOL library failed with `"Unknown error"` for all `transport: 'pg'` operations.

**Diagnosis result:**
- Root cause: Supabase IPv4 deprecation (DNS `ENOTFOUND` for `db.*.supabase.co`)
- SAOL error mapping gap (no pattern for connection/DNS errors → generic `ERR_FATAL`)
- Missing `node_modules` in `supa-agent-ops/` (`.gitignored`, not installed)

**What was accomplished:**
1. ✅ **Spec 30 E01 Task 1 COMPLETE** — The `last_build_error TEXT` and `failed_conversation_ids TEXT[]` columns were successfully added to the `training_sets` table via direct `pg` Client using the pooler URL (bypassing SAOL).
2. ✅ **SAOL Fix Plan written** — Full diagnostic doc with 4 fixes at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`
3. ❌ **Spec 30 E01 Tasks 2–6 NOT started** — No code changes were made to `src/`
4. ❌ **SAOL fixes NOT applied** — `.env.local` and SAOL source code were not modified

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
| Database Ops (CLI) | SAOL (`supa-agent-ops/`) — **currently broken for pg transport, see SAOL Fix section** |

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
│           └── jobs/route.ts
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
│   │   ├── EndpointRestartTool.tsx       # New (Spec 26)
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
│       ├── auto-deploy-adapter.ts
│       ├── dispatch-training-job.ts
│       ├── restart-inference-workers.ts  # New
│       ├── refresh-inference-workers.ts
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
    └── adapter-detail.ts                 # New (Spec 26)
```

---

## Key Files for Spec 30 E01 (Immediate Implementation Target)

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

## What Has Changed Since the Previous Carryover (Session 15)

The previous carryover was written after Session 15 (spec-writing session, no code changes). Since then, **significant implementation work was done across Sessions 16+ (multiple implementation sessions)**. Key changes:

### Specs Implemented Since Session 15

| Spec | What it did | Status |
|------|-------------|--------|
| **Spec 20** (Training Pipeline Integration) | Rewrote `build-training-set.ts` to use `TrainingFileService` (v4 JSONL), added `rebuild-training-set.ts`, auto-creates `datasets` records, added `dataset_id` to `training_sets`, wired `ConversationTable` to workbase API | ✅ Implemented |
| **Spec 21** (Batch Page) | Workbase-scoped batch job watcher | ✅ Implemented |
| **Spec 23** (Add Conversations) | Add conversations to existing training sets | ✅ Implemented |
| **Spec 26** (LoRA Adapters) | Adapter list page, adapter detail page with status ping, deployment timeline, endpoint restart tool | ✅ Implemented |
| **Spec 28** (Enrich Bug) | Enrichment bug fixes | ✅ Implemented |
| **Spec 29** (Batch Conversations) | Batch conversation improvements | ✅ Implemented |
| **Bug batch (30 items)** | "30 antigravity bugs" — miscellaneous UI/UX fixes | ✅ Implemented |

### Key New Files (Since Session 15)

- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts` — Inngest function for incremental rebuilds
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\restart-inference-workers.ts` — Worker restart function
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\route.ts` — PATCH/DELETE for individual training sets
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\reset\route.ts` — POST reset handler
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\AdapterStatusPing.tsx`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\DeploymentTimeline.tsx`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\EndpointRestartTool.tsx`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useAdapterDetail.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\adapter-detail.ts`

### DB Schema Changes (Since Session 15)

- `training_sets.dataset_id` column — added (Spec 20)
- `training_sets.last_build_error TEXT` column — added **this session** (Spec 30 E01, Task 1)
- `training_sets.failed_conversation_ids TEXT[]` column — added **this session** (Spec 30 E01, Task 1)

### Training Pipeline State (Current)

The `buildTrainingSet` and `rebuildTrainingSet` Inngest functions now use `TrainingFileService.createTrainingFile()` to produce correct v4-format JSONL, and auto-create `datasets` records. The legacy "Import from Training File" manual step is eliminated for workbase flows. **The critical JSONL format mismatch from Session 14's discovery is resolved.**

However, the error handling in both functions is still basic — Spec 30 E01 Tasks 2–3 add structured error storage (parsing failed conversation IDs from error messages and writing them to the new DB columns).

---

## DB State (Current — as of March 4, 2026)

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
| `last_build_error` | text | **NEW — added this session** (Spec 30 E01 Task 1) |
| `failed_conversation_ids` | text[] | **NEW — added this session** (Spec 30 E01 Task 1) |

---

## Important Specifications & Documents

| Document | Path | Role |
|----------|------|------|
| **SAOL Fix (this session)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md` | Diagnosis + 4-fix plan for SAOL DNS failure. Fix A = update DATABASE_URL; Fix B = harden SSL; Fix C = add error mappings; Fix D = update docs. |
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

### 1. Apply SAOL Fixes (HIGHEST PRIORITY — Currently Blocking)

Until Fix A is applied, no SAOL `transport: 'pg'` operations will work. Full plan in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md`.

| Fix | What | Effort |
|-----|------|--------|
| **A** | Update `DATABASE_URL` in `.env.local` to pooler URL | 30 seconds |
| **B** | Harden SSL in `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\core\client.ts` | 5 min |
| **C** | Add error mappings to `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\errors\codes.ts` | 10 min |
| **D** | Update docs (SAOL instructions + TROUBLESHOOTING.md) | 5 min |

### 2. Finish Spec 30 E01 Tasks 2–6 (Backend Error Storage + Bypass Endpoint)

Task 1 is done. Tasks 2–6 are code changes — full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E01_v1.md`.

### 3. Implement Spec 30 E02 (Training Sets Monitoring Page)

Requires E01 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E02_v1.md`.

### 4. Implement Spec 30 E03 (Cross-Page Selection + Sorting)

Requires E01 + E02 complete. Full details in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\build-30\30-training-set-add-execution-prompts-E03_v1.md`.

### 5. Bug Fixes & Small UX Upgrades

As identified by the human.

---

## Important Lessons (For Future Debugging)

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

1. `buildTrainingSet` and `rebuildTrainingSet` Inngest functions now use `TrainingFileService.createTrainingFile()` (correct v4 JSONL format). This was fixed by Spec 20 implementation.
2. The `datasets` record is auto-created by these functions — no manual "Import from Training File" step needed.
3. `pipeline_training_jobs.workbase_id` is now populated from workbase flow.
4. Spec 30 adds structured error storage to these functions (parsing failed conversation IDs into `failed_conversation_ids` column).

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

### Session 16 (This Session — SAOL Diagnosis)
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
