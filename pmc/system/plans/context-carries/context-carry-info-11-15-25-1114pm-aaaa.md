# Context Carryover: v4-Show — Session 15

**Last Updated:** March 2, 2026
**Document Version:** context-carry-info-11-15-25-1114pm-aaaa
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully — every section, every table, every file reference.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Pay special attention to the files listed in the **Key Files** sections below.
3. Read and internalize the **Training Pipeline Integration Specification (Spec 20)** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md`. This is the **complete implementation specification** written in Session 15. It covers 3 phases, 11 files to modify, 18 acceptance criteria, and includes full code for the `buildTrainingSet` rewrite and Launch Tuning page.
4. Read and internalize the **Training Pipeline Discovery & Gap Analysis** document at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\19-ux-containers-training-discovery_v1.md`. This is the research from Session 14 that Spec 20 is built on.
5. Read and internalize the **UX Decisions spec** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\07-internal-ux-decisions_v4.md`. Focus on Decision D1 (Eliminate Data Shaping), the Page 3 spec (Launch Tuning), and the Training Set build flow.
6. Read and internalize the **SAOL usage instructions** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`.
7. Understand the full training pipeline — legacy flow, new workbase flow, gaps identified, the critical JSONL format mismatch, and the complete specification for closing all gaps.
8. Then **wait for the human to tell you what to do next**.

The human's most likely next actions are:
- Ask you to **implement Spec 20** (the training pipeline integration specification written in Session 15). This is a 3-phase implementation — the spec has full code, DDL commands, and acceptance criteria.
- Ask you to **fix bugs** or **analyze the current pathing and small upgrades** on the workbase UI
- Ask you to **continue QA** on the Conversations Module, Auto-Enrich, or Modal fixes

**Do not start anything until the human tells you what to do.**

---

## Project Functional Context

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

## Active Development Focus: Training Pipeline Integration (Spec 20 — Ready to Implement)

### What Session 15 Did

Session 15 was a **specification-writing session** — no code was written/modified. The agent:
1. Internalized the full codebase and all context documents (gap analysis, UX decisions, SAOL, project overview).
2. Wrote the complete **Implementation Specification (Spec 20)** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md`.

**Spec 20 is 1,444 lines** and covers:
- **Phase 1: Fix the Foundation** (3 tasks) — DDL for `dataset_id` column on `training_sets`, full rewrite of `buildTrainingSet` Inngest function to produce v4 JSONL via `TrainingFileService`, update `TrainingSet` type + API mappers.
- **Phase 2: Wire ConversationTable** (7 changes A-G) — Add `workbaseId` prop, new mutation for workbase training-sets API, conditional handler in bulk action, label changes ("Build Training Set" instead of "Create Training Files"), hide description field when in workbase context.
- **Phase 3: Complete Launch Tuning Page** (full rewrite) — Training set selector, 3 hyperparameter sliders, cost estimate card, "Train & Publish" wiring to `POST /api/pipeline/jobs`, inline progress polling, adapter history table filtered by workbase. Also covers backend changes: `pipeline-service.ts` (workbase_id insert + filter), `usePipelineJobs.ts` (workbaseId param), `pipeline/jobs/route.ts` (workbaseId query param), `types/pipeline.ts` (workbaseId on request type).

### What Session 14 Did (Research — Referenced by Spec 20)

Session 14 was a **research and discovery session** — no code was written. The focus was a comprehensive investigation of the legacy training pipeline vs. the new workbase UX to precisely identify every gap between "what works today" and "what the 07-decisions spec requires."

**Output document:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\19-ux-containers-training-discovery_v1.md`

### The Legacy Training Pipeline (How It Works Today)

The current working pipeline is a **6-step chain across 4 pages and 3 DB tables**:

```
1. Generate + Enrich Conversations → conversations table
2. "Create Training Files" → aggregates enriched JSONs → training.json + training.jsonl → training_files table
3. "Import from Training File" on /datasets/import → creates datasets row pointing to SAME .jsonl → datasets table
4. /pipeline/configure?datasetId=[id] → selects dataset, configures sliders, creates pipeline_training_jobs row
5. Inngest dispatches to RunPod GPU → trains adapter
6. Inngest auto-deploy → pushes to HuggingFace → updates LORA_MODULES on RunPod endpoint
```

**Key fact:** The "training file" produces TWO files (aggregated JSON + JSONL). The "dataset" is NOT a new file — it's a thin DB record pointing to the same JSONL, adding fields the pipeline needs (`training_ready`, `format`, `total_tokens`).

### The New Workbase Flow (As Designed in 07-Decisions, Specified in Spec 20)

The planned flow reduces the user experience to **TWO pages**:

```
1. /workbase/[id]/fine-tuning/conversations → Select conversations → "Build Training Set"
   (Behind the scenes: aggregate → JSONL → auto-create dataset record)
2. /workbase/[id]/fine-tuning/launch → Pick training set → Configure sliders → "Train & Publish"
   (Behind the scenes: create job → RunPod training → HuggingFace deploy → endpoint update)
```

### 8 Gaps + 1 Critical Issue (All Addressed in Spec 20)

| Gap ID | Description | Severity | Spec 20 Phase |
|--------|-------------|----------|---------------|
| **CRITICAL** | `buildTrainingSet` Inngest produces OpenAI-format JSONL; must produce BrightRun v4 format | **Blocker** | Phase 1 (§3.2) |
| **GAP-2** | No auto-creation of `datasets` record after training set JSONL is built | High | Phase 1 (§3.2 step 3) |
| **GAP-2b** | `training_sets` table missing `dataset_id` column | High | Phase 1 (§3.1) |
| **GAP-1** | `ConversationTable` calls legacy `POST /api/training-files` instead of workbase API | High | Phase 2 (§4) |
| **GAP-3** | Launch page missing training parameter sliders | Medium | Phase 3 (§5) |
| **GAP-4** | Launch page missing cost estimate card | Medium | Phase 3 (§5) |
| **GAP-5** | "Train & Publish" button not wired to `POST /api/pipeline/jobs` | High | Phase 3 (§5) |
| **GAP-6** | No inline training progress on Launch page | Medium | Phase 3 (§5) |
| **GAP-7** | Adapter history not filtered by workbase | Low | Phase 3 (§5) |
| **GAP-8** | `pipeline_training_jobs.workbase_id` not populated from workbase flow | Medium | Phase 3 (§5) |

### The Critical JSONL Format Issue (Understand This)

Two different code paths produce JSONL in incompatible formats:

| | `TrainingFileService` (legacy, working) | `buildTrainingSet` Inngest (new, broken format) |
|---|---|---|
| **Source data** | Enriched JSON files from `conversation-files` Storage bucket | `conversation_turns` DB table |
| **Format** | BrightRun v4: `{ id, conversation_id, system_prompt, conversation_history, current_user_input, emotional_context, target_response, training_metadata }` | OpenAI fine-tuning: `{ messages: [{ role, content }] }` |
| **Granularity** | One line per training pair (turn) | One line per conversation (all turns) |
| **Metadata** | Rich: emotional_context, training_metadata, scaffolding | None: just role + content |

**The `buildTrainingSet` function must be rewritten to use `TrainingFileService` aggregation logic (fetch enriched JSONs from Storage, not conversation_turns from DB).** Spec 20 §3.2 contains the complete replacement code.

---

## Session 15 Summary (Current Session — Specification Writing)

Session 15 completed one major item:
1. **Spec 20 — Training Pipeline Integration Specification** (complete specification written) — File: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md`

**No code was written or modified. No DDL was executed. No files in `src/` were changed.**

The spec is the full blueprint for the next implementation session(s). It includes:
- Complete TypeScript code for the `buildTrainingSet` rewrite (§3.2)
- Complete TypeScript code for the Launch Tuning page rewrite (§5)
- 7 enumerated changes (A-G) for ConversationTable (§4)
- SAOL DDL commands for `dataset_id` column (§3.1)
- All type, hook, API, and service changes (§3.3, §5.x subsections)
- 18 acceptance criteria (§7)
- File modification summary table (§8)

---

## Session 13 Summary (Two Sessions Ago)

Session 13 completed three items:
1. **Spec 18 — Workbase Conversations Page Upgrade** (full implementation) — File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`
2. **Auto-Enrich After Batch Job Completion** — File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx`
3. **Modal Input Visibility Fix** — Files: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\dialog.tsx` and `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\alert-dialog.tsx`

**All three items are code-complete and pushed to git. Auto-Enrich and Modal fixes have NOT been fully QA-tested on the deployed build.**

---

## Current Codebase Architecture (v4-show)

The active Next.js 14 application lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Within `src/`:

```
src/
├── app/
│   ├── globals.css                       # Design token foundation (Session 11)
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard wrapper
│   │   ├── home/page.tsx                 # Home + workbase grid
│   │   ├── conversations/page.tsx        # Legacy conversations page (DO NOT TOUCH)
│   │   │                                 #   Uses <ConversationTable>, has transformStorageToConversation()
│   │   ├── training-files/page.tsx       # Legacy training files list page
│   │   ├── datasets/
│   │   │   ├── page.tsx                  # Legacy datasets page ("Import from Training File" button)
│   │   │   ├── import/page.tsx           # Legacy import page (creates datasets record from training file)
│   │   │   └── [id]/page.tsx             # Dataset detail
│   │   ├── pipeline/
│   │   │   ├── configure/page.tsx        # Legacy pipeline configure (dataset selector + sliders + job creation)
│   │   │   └── jobs/
│   │   │       ├── page.tsx              # Legacy jobs list
│   │   │       └── [jobId]/
│   │   │           ├── page.tsx          # Job detail (progress, metrics)
│   │   │           ├── results/page.tsx  # Job results
│   │   │           ├── chat/page.tsx     # Multi-turn chat with adapter
│   │   │           └── test/page.tsx     # Adapter testing
│   │   ├── batch-jobs/[id]/page.tsx      # ✅ Auto-enrich added (Session 13)
│   │   └── workbase/[id]/
│   │       ├── layout.tsx                # Sidebar nav (duck-blue active)
│   │       ├── page.tsx                  # Workbase overview
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx          # ✅ UPGRADED to full ConversationTable (Session 13 — Spec 18)
│   │       │   │   ├── generate/page.tsx # Bulk generator (created Session 12, DO NOT TOUCH)
│   │       │   │   └── [convId]/page.tsx # Conversation detail
│   │       │   ├── launch/page.tsx       # ⚠️ SCAFFOLD ONLY — needs full rewrite per Spec 20 Phase 3
│   │       │   └── chat/page.tsx
│   │       ├── fact-training/
│   │       │   ├── documents/page.tsx
│   │       │   ├── documents/[docId]/page.tsx
│   │       │   ├── chat/page.tsx
│   │       │   └── quality/page.tsx
│   │       └── settings/page.tsx
│   └── api/
│       ├── conversations/
│       │   ├── route.ts                  # GET /api/conversations (supports workbaseId param)
│       │   ├── generate/route.ts
│       │   ├── generate-batch/route.ts   # ✅ workbaseId plumbing added (Session 12)
│       │   └── bulk-enrich/route.ts      # POST — enriches array of conversation IDs (used by auto-enrich)
│       ├── training-files/
│       │   ├── route.ts                  # GET/POST /api/training-files (legacy — used by ConversationTable currently)
│       │   ├── [id]/download/route.ts    # Download training file as JSON or JSONL
│       │   └── available-for-import/route.ts  # Lists files available for dataset import
│       ├── datasets/
│       │   ├── route.ts                  # GET/POST /api/datasets
│       │   ├── import-from-training-file/route.ts  # POST — creates datasets record from training_file_id (legacy bridge)
│       │   └── [id]/route.ts             # GET single dataset
│       ├── workbases/
│       │   ├── route.ts                  # GET/POST workbases
│       │   └── [id]/
│       │       └── training-sets/
│       │           ├── route.ts          # GET/POST training sets for a workbase (emits training/set.created Inngest event)
│       │           └── [tsId]/route.ts   # DELETE individual training set
│       ├── pipeline/
│       │   └── jobs/
│       │       ├── route.ts              # GET/POST /api/pipeline/jobs (creates pipeline_training_jobs, emits pipeline/job.created)
│       │       └── [jobId]/route.ts      # GET single job
│       ├── batch-jobs/[id]/
│       │   └── process-next/route.ts     # ✅ writes workbase_id to conversation (Session 12)
│       └── rag/ ...
├── components/
│   ├── conversations/
│   │   ├── ConversationTable.tsx         # Full-featured sortable table (9 cols, actions, bulk "Create Training Files")
│   │   │                                 #   ⚠️ Currently calls POST /api/training-files (legacy) — Spec 20 Phase 2 fixes this
│   │   ├── ConversationDetailModal.tsx   # Store-driven detail modal
│   │   ├── ConfirmationDialog.tsx        # Store-driven delete confirmation
│   │   ├── ConversationDetailView.tsx
│   │   ├── conversation-actions.tsx      # Enrich/download actions per row
│   │   └── ... (other conversation components)
│   ├── pipeline/
│   │   ├── TrainingParameterSlider.tsx   # Existing component — Spec 20 Phase 3 wires to Launch page
│   │   ├── CostEstimateCard.tsx          # Existing component — Spec 20 Phase 3 wires to Launch page
│   │   ├── TrainingDataSummaryCard.tsx   # Existing component
│   │   ├── DatasetSelectorModal.tsx      # Existing component
│   │   └── chat/MultiTurnChat.tsx        # A/B testing chat
│   ├── datasets/DatasetCard.tsx
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   └── ui/
│       ├── dialog.tsx                    # ✅ Fixed: bg-card text-foreground border-border (Session 13)
│       ├── alert-dialog.tsx              # ✅ Fixed: bg-card text-foreground border-border (Session 13)
│       ├── button.tsx
│       ├── badge.tsx
│       ├── input.tsx                     # Uses bg-input-background, inherits text color from parent
│       ├── textarea.tsx                  # Uses bg-input-background, inherits text color from parent
│       └── ... (other shadcn components)
├── hooks/
│   ├── use-conversations.ts              # ✅ data.conversations fix (Session 12 Fix A)
│   │                                     #    Returns Conversation[] typed but actually StorageConversation[]
│   │                                     #    DO NOT change its return type — breaks other hooks
│   ├── use-filtered-conversations.ts     # Depends on Conversation type from use-conversations
│   ├── use-keyboard-shortcuts.ts         # Depends on Conversation type from use-conversations
│   ├── use-scaffolding-data.ts           # Used by generator page
│   ├── useWorkbases.ts
│   ├── useTrainingSets.ts                # Fetches training sets by workbaseId (used by Launch page)
│   ├── usePipelineJobs.ts                # Fetches pipeline jobs globally — ⚠️ Spec 20 Phase 3 adds workbase filter
│   └── useTrainingFileImport.ts          # Legacy dataset import hooks
├── inngest/
│   ├── client.ts                         # Inngest client + event type definitions (includes training/set.created)
│   └── functions/
│       ├── build-training-set.ts         # ⚠️ CRITICAL: produces OpenAI-format JSONL — Spec 20 Phase 1 rewrites this completely
│       ├── auto-deploy-adapter.ts        # Deploys adapter to HuggingFace + RunPod (working)
│       ├── dispatch-training-job.ts      # Dispatches to RunPod for GPU training (working)
│       └── index.ts                      # Function registry
├── lib/
│   ├── types/
│   │   ├── conversations.ts             # StorageConversation (snake_case) + Conversation (camelCase)
│   │   └── lora-training.ts             # Dataset, PipelineTrainingJob types
│   ├── services/
│   │   ├── training-file-service.ts     # ✅ WORKING: aggregation + v4-format JSONL conversion (920 lines)
│   │   │                                #    Key methods: createTrainingFile(), convertFullJSONToJSONL(), aggregateConversationsToFullJSON()
│   │   ├── pipeline-service.ts          # Creates pipeline_training_jobs, reads dataset.storage_path
│   │   ├── batch-generation-service.ts  # ✅ workbaseId in sharedParameters (Session 12 Fix B2)
│   │   ├── enrichment-pipeline-orchestrator.ts  # Used by bulk-enrich API
│   │   └── ...
│   └── pipeline/
│       └── hyperparameter-utils.ts      # convertToTechnicalParams, estimateTrainingCost
├── stores/
│   ├── conversation-store.ts            # Zustand store: selection, modals, filters
│   └── pipelineStore.ts                 # Zustand store: selected file, slider values, cost estimate
├── types/
│   ├── workbase.ts                      # Workbase, TrainingSet, ConversationComment types
│   └── pipeline.ts                      # CreatePipelineJobRequest, SENSITIVITY_OPTIONS, etc.
├── styles/
│   └── polish.css                       # Focus ring → sky blue
└── tailwind.config.js                   # Duck namespace + input-background
```

---

## Key Files Reference

### Training Pipeline Files (Implementation Target — Spec 20)

| File | Role | Status | Spec 20 Action |
|------|------|--------|----------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\training-file-service.ts` | Aggregates enriched JSONs → Full Training JSON → JSONL (v4 format). 920 lines. The gold-standard JSONL conversion logic. | ✅ Working | DO NOT MODIFY — called by rewritten buildTrainingSet |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts` | Inngest function triggered by `training/set.created`. Builds JSONL from `conversation_turns` table. **Produces wrong format (OpenAI, not v4).** | ⚠️ Must rewrite | Phase 1 §3.2 — FULL REWRITE (code provided in spec) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts` | GET/POST for workbase training sets. POST creates row + emits Inngest event. | ✅ Working | Phase 1 §3.4 — add `datasetId` to mappers |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\training-files\route.ts` | Legacy GET/POST training files. Called by ConversationTable currently. | ✅ Working (legacy) | No changes |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\datasets\import-from-training-file\route.ts` | Legacy bridge: creates `datasets` row from `training_files` JSONL path. | ✅ Working (legacy) | No changes |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\route.ts` | Creates pipeline_training_jobs + emits `pipeline/job.created`. Requires `datasetId`. | ✅ Working | Phase 3 §5.x — add `workbaseId` query param |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\pipeline-service.ts` | Reads `datasets.storage_path` for the job's JSONL location. | ✅ Working | Phase 3 §5.x — add `workbase_id` insert + filter |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` | "Create Training Files" bulk action calls `POST /api/training-files` (legacy). Needs `workbaseId` prop. | ⚠️ Needs GAP-1 fix | Phase 2 §4 — 7 changes (A-G) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\launch\page.tsx` | Launch Tuning page scaffold. Shows training sets. Has TODO placeholders for sliders, cost, "Train & Publish". | ⚠️ Scaffold only | Phase 3 §5 — FULL REWRITE (code provided in spec) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\configure\page.tsx` | Legacy pipeline configure page. Has working sliders + cost + job creation. Components to reuse: `TrainingParameterSlider`, `CostEstimateCard`, `DatasetSelectorModal`. | ✅ Working (legacy, reuse components) | No changes (reference only) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useTrainingSets.ts` | React Query hook: fetches training sets from `GET /api/workbases/[id]/training-sets`. | ✅ Working | No changes |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\usePipelineJobs.ts` | React Query hook: fetches pipeline jobs globally. No workbase filter. | ⚠️ Needs workbase filter | Phase 3 §5.x — add `workbaseId` param |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\workbase.ts` | TrainingSet type definition (id, workbaseId, conversationIds, conversationCount, trainingPairCount, status, jsonlPath, isActive). | ✅ Defined | Phase 1 §3.3 — add `datasetId: string \| null` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\pipeline.ts` | CreatePipelineJobRequest, SENSITIVITY_OPTIONS, etc. | ✅ Defined | Phase 3 §5.x — add `workbaseId?: string` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\stores\pipelineStore.ts` | Zustand store: selectedFileId, slider values, jobName, getCostEstimate(), isConfigurationValid(). | ✅ Working | No changes |

### Session 13 Modified Files

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` | **COMPLETE REWRITE** — Spec 18. Full `<ConversationTable>`, direct `fetch()` with workbaseId, `transformStorageToConversation()`, filter dropdowns, pagination, store-driven modals |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx` | Added `didProcessRef` + `autoEnrichTriggeredRef` refs; auto-triggers `handleEnrichAll()` when batch completes |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\dialog.tsx` | `bg-zinc-900 text-zinc-50 border-zinc-700` → `bg-card text-foreground border-border` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\alert-dialog.tsx` | `bg-zinc-900 text-zinc-50 border-zinc-700` → `bg-card text-foreground border-border` |

### Important Components (Do Not Modify Unless Asked)

| File | Props / Usage |
|------|--------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` | `<ConversationTable conversations={ConversationWithEnrichment[]} isLoading={boolean} compactActions={boolean} />` — type `ConversationWithEnrichment` defined on line 60 |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailModal.tsx` | `<ConversationDetailModal />` — no props; reads from `useConversationStore` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConfirmationDialog.tsx` | `<ConfirmationDialog />` — no props; reads from `useConversationStore` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\bulk-enrich\route.ts` | `POST` with `{ conversationIds: string[] }` — enrichment pipeline for multiple conversations, sequential, idempotent (skips already-completed) |

### Critical Type Note

The `transformStorageToConversation()` function is the bridge between API data and UI components. It now exists in **two places** (both must remain identical):
1. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\conversations\page.tsx` (legacy page)
2. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` (workbase page — Session 13)

Do not modify either copy independently. If a change is needed in the transform logic, update both.

---

## Important Specifications & Documents

| Document | Path | Role |
|----------|------|------|
| **Training Pipeline Integration Spec (Session 15 output)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md` | **THE IMPLEMENTATION BLUEPRINT** — 3 phases, 11 files, 18 acceptance criteria, full code included |
| **Training Pipeline Discovery (Session 14 output)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\19-ux-containers-training-discovery_v1.md` | Gap analysis, legacy vs new pipeline, background research for Spec 20 |
| **UX Decisions (master spec)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\07-internal-ux-decisions_v4.md` | D1 (eliminate data shaping), D1b (conversation detail), Page 3 (Launch Tuning), D8 (auto-enrichment), D11 (worker refresh) |
| **Spec 18 (conversations page)** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md` | Spec 18 — implemented in Session 13. QA checklist in Section 11. |
| **SAOL Usage Instructions** | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md` | How to use SAOL for all DB operations |

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

**Brand Palette (MotherDuck-inspired):**

| Name | Hex | HSL Triplet | Tailwind Class |
|------|-----|-------------|----------------|
| Soft Cream | `#FFFDF0` | `52 100% 97%` | `bg-background` |
| Deep Charcoal | `#383838` | `0 0% 22%` | `text-foreground` |
| White | `#FFFFFF` | `0 0% 100%` | `bg-card`, `bg-popover` |
| Vibrant Yellow | `#FFDE00` | `52 100% 50%` | `bg-primary` |
| Muted Cream | `#F5F5F0` | `60 33% 95%` | `bg-secondary`, `bg-muted`, `bg-accent` |
| Soft Gray | `#666666` | `0 0% 40%` | `text-muted-foreground` |
| Light Gray | `#D1D5DB` | `216 12% 84%` | `border-border`, `border-input` |
| Sky Blue | `#3AA1EC` | `205 82% 58%` | `bg-duck-blue`, `ring-ring` |
| Soft Orange | `#FF9538` | `28 100% 61%` | `bg-duck-orange` |

**Design Token Rules — Mandatory for all new/modified code:**
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` color classes permitted in any new or modified code**
- Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT design tokens

---

## DB State (as of Session 15 end, 2026-03-02)

### Live Data from SAOL Queries

**training_files (7 records — all `workbase_id = NULL`):**

| Name | Conversations | Training Pairs | Status |
|------|--------------|----------------|--------|
| first-trainer-JSON-3 convos | 3 | 21 | active |
| Phase-3-training-12-convo_v1 | 12 | 77 | active |
| Phase-2-training-random_v2-test-6 | 15 | 98 | active |
| Phase-2-training-random_v2-test-5 | 13 | 82 | active |
| Phase-2-training-random_v2-test-4 | 7 | 44 | active |
| Phase-2-training-random_v2-test-3 | 3 | 18 | active |
| Batch 6- 12 conversations #1 | 242 | 1567 | active |

**training_sets (0 records):** No training sets have been created through the workbase flow yet.

**datasets (5 records — all imported from training_files via legacy bridge):**

| Name | Format | Pairs | Ready | Storage Path |
|------|--------|-------|-------|--------------|
| Phase-3-training-12-convo_v1 | brightrun_lora_v4 | 77 | true | a00fab3a.../training.jsonl |
| Phase-2-training-random_v2-test-6 | brightrun_lora_v4 | 98 | true | 6fe6c561.../training.jsonl |
| Phase-2-training-random_v2-test-5 | brightrun_lora_v4 | 57 | true | d42c5bfe.../training.jsonl |
| Phase-2-training-random_v2-test-3 | brightrun_lora_v4 | 12 | true | 187598dc.../training.jsonl |
| Batch 6- 12 conversations #1 | brightrun_lora_v4 | 1567 | true | 7dc19882.../training.jsonl |

**pipeline_training_jobs (10 records — all `workbase_id = NULL`):** 7 completed, 3 failed. Most recent completed: `Phase-3-training-12-convo-adapter_v1` with HF path `BrightHub2/lora-emotional-intelligence-bae71569`.

**Schema notes:**

| Table | Has `workbase_id`? | Populated? | Notes |
|-------|-------------------|------------|-------|
| `training_files` | ✅ Column exists | ❌ All NULL | |
| `training_sets` | ✅ Column exists | N/A (0 records) | ⚠️ Missing `dataset_id` column — Spec 20 Phase 1 adds it |
| `datasets` | ❌ Column does NOT exist | — | Spec 20 auto-creates records from buildTrainingSet |
| `pipeline_training_jobs` | ✅ Column exists | ❌ All NULL | Spec 20 Phase 3 populates from workbase flow |

### Other Entity State

| Entity | State |
|--------|-------|
| `workbases` (active) | At least 2 active: `232bea74` (`rag-KB-v2_v1`) owned by user `8d26cc10`; `4fc8fa25` (`Sun Chip Policy Doc #30`) owned by user `79c81162` |
| `conversations` | 66+ with `workbase_id = '232bea74-...'` (user `8d26cc10`). Additional conversations in workbase `4fc8fa25` (user `79c81162`). |
| Sun Bank doc `77115c6f` | Was at 0 embeddings — **re-trigger script NOT yet run** |
| PG functions | `match_rag_embeddings_kb` and `search_rag_text` fixed (Session 9) |
| RAG pipeline | FULLY WORKING (confirmed Session 10) |

---

## Key IDs To Know

| Name | ID |
|------|----|
| User (James — primary) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| User (james+2-22-26@...) | `79c81162-6399-41d4-a968-996e0ca0df0c` |
| Workbase: rag-KB-v2_v1 (owned by primary user) | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 (owned by second user) | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| Sun Bank document (needs re-trigger) | `77115c6f-b987-4784-985a-afb4c45d02b6` |
| Batch job (Session 13) | `91c985f9-5167-4ba8-ae16-608bd17952c1` |
| RunPod endpoint | `780tauhj7c126b` |

---

## What Needs Doing Next (Priority Order)

### 1. Implement Spec 20 — Training Pipeline Integration (HIGHEST PRIORITY)

**The complete specification is ready at:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md`

Implementation order (must be sequential — dependencies exist between phases):

**Phase 1: Fix the Foundation**
1. Run DDL via SAOL to add `dataset_id` column to `training_sets` (§3.1 — SAOL commands provided)
2. Rewrite `build-training-set.ts` — complete replacement code in §3.2
3. Update `TrainingSet` TypeScript type in `types/workbase.ts` — add `datasetId` field (§3.3)
4. Update training-sets API route mappers to include `datasetId` (§3.4)

**Phase 2: Wire ConversationTable**
5. Apply 7 changes (A-G) to `ConversationTable.tsx` (§4) — add `workbaseId` prop, new mutation, conditional handler, label changes

**Phase 3: Complete Launch Tuning Page**
6. Rewrite `launch/page.tsx` — complete replacement code in §5
7. Update `pipeline-service.ts` — add `workbase_id` to insert + `workbaseId` filter to list (§5.x)
8. Update `usePipelineJobs.ts` — add `workbaseId` param (§5.x)
9. Update `pipeline/jobs/route.ts` — add `workbaseId` query param parsing (§5.x)
10. Update `types/pipeline.ts` — add `workbaseId` to request type (§5.x)

**Acceptance criteria:** 18 items listed in §7 of the spec.

### 2. QA Tests (Still Pending from Session 13)

| Test | Description | Status |
|------|-------------|--------|
| Spec 18 full QA | Conversations page filters, sorting, pagination, row actions, scope isolation | User said "much better" but full QA checklist not run |
| Auto-Enrich test | Run new batch job → verify enrichment starts automatically | NOT yet tested |
| Modal input visibility | Verify dark charcoal text in "Create New Training File" modal | NOT yet tested on deployed build |

### 3. Bug Fixes & Pathing Analysis

Analyze current routing, identify small UX issues, and fix bugs as identified by the human.

### 4. Remaining Session 9 Tests (Still Pending)

| Test | Description | Status |
|------|-------------|--------|
| **T9** | Run Sun Bank re-trigger script → ~1298 embeddings → chat returns answers | Not yet run |
| **T6** | `/home` "+" card → opens wizard → creates workbase | Not yet UI-tested |
| **T7** | Settings archive → AlertDialog (not browser confirm) → redirect | Not yet UI-tested |
| **T8** | `/home` archived section → Restore works | Not yet UI-tested |

### 5. Known Limitations

| Limitation | Notes |
|-----------|-------|
| Row click does not open detail modal | `ConversationTable` does not fire `openConversationDetail` on row click |
| Text search removed | `ConversationTable` does not have inline search |
| "Training Sets" card removed from conversations page | New page uses ConversationTable's "Create Training Files" action (currently calls legacy API — fixed by Spec 20 Phase 2) |
| One remaining `zinc-*` in non-modal code | `text-zinc-500` in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\chat\MultiTurnChat.tsx` — low priority |

---

## Important Lessons (For Future Debugging)

### Conversations Module — Type Architecture

1. `GET /api/conversations` always returns `StorageConversation[]` (snake_case fields).
2. `useConversations()` hook is **typed** as returning `Conversation[]` but actually returns `StorageConversation[]`. Do NOT change this type — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-filtered-conversations.ts` and `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-keyboard-shortcuts.ts` depend on the `Conversation` shape.
3. All rich UI components (`ConversationTable`, `ConversationDetailView`, etc.) expect **camelCase `Conversation`** objects. Always apply `transformStorageToConversation()` before passing data to these components.
4. The **workbase** conversations page (Session 13) uses direct `fetch()` instead of `useConversations` hook, avoiding the type mismatch entirely.

### Two-User Situation

The DB has conversations assigned to `workbase_id = 232bea74-...` which is owned by user `8d26cc10-...`. If you are logged in as user `79c81162-...`, you will only see workbase `4fc8fa25-...` in the UI and it will correctly show only conversations from that workbase. This is not a bug. To see the 66+ conversations, log in as `8d26cc10-...`.

### Design Token System (Session 11 + Session 13 Modal Fix)

1. CSS vars MUST hold HSL triplets (e.g., `52 100% 50%`) — NOT hex, NOT oklch. The `hsl(var(--*))` wrapper in tailwind.config.js requires this exact format.
2. The `@theme inline` block is dead code (Tailwind v4 feature). Do not modify it.
3. The `.dark` block is preserved but unused. Do not remove it.
4. `src/styles/globals.css` was deleted in Session 11 — it was a dead duplicate.
5. Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT converted to design tokens.
6. **Zero `zinc-*` classes should remain in dashboard/workbase/modal pages.** Session 13 fixed the last two offenders: `dialog.tsx` and `alert-dialog.tsx`.
7. `<Input>` and `<Textarea>` components inherit text color from their parent. If a parent sets white text (like the old dark-theme modals did), input text becomes invisible on light backgrounds. The fix is always to use `text-foreground` on the container.

### Batch Job Auto-Enrich Flow (Session 13)

The enrichment auto-trigger depends on:
1. The batch-jobs page component (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx`) running the processing loop
2. `didProcessRef.current` being set to `true` during `startProcessing()`
3. A `useEffect` watching for `status?.status === 'completed'` + `!processingActive`
4. The existing `handleEnrichAll()` function calling `POST /api/conversations/bulk-enrich`
5. The bulk-enrich API (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\bulk-enrich\route.ts`) processing each conversation through the `enrichment-pipeline-orchestrator`

If auto-enrich fails or doesn't trigger, the manual "Enrich All" button still appears as a fallback (it's only hidden when `enrichResult` is set).

### Training Pipeline Architecture (Session 14 Discovery + Session 15 Spec)

1. The legacy pipeline has **TWO separate JSONL code paths** — `TrainingFileService.convertFullJSONToJSONL()` (v4 format, working) and `buildTrainingSet` Inngest function (OpenAI format, wrong).
2. The `datasets` table has **no `workbase_id` column**. The `training_sets` table has no `dataset_id` column. These are the key missing links.
3. `ConversationTable` currently hardcodes `POST /api/training-files` — it needs to accept a `workbaseId` prop to call the workbase training-sets API instead.
4. The Launch Tuning page at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\launch\page.tsx` is a scaffold with TODO placeholders — all the needed components exist in the codebase but aren't wired yet.
5. `pipeline_training_jobs` table has a `workbase_id` column but no existing jobs populate it. Job creation from the Launch page must set this field.
6. **Spec 20 addresses ALL of these.** The rewritten `buildTrainingSet` delegates to `TrainingFileService.createTrainingFile()` (reusing 100% of the proven aggregation logic) and also auto-creates a `datasets` record, eliminating the manual "Import from Training File" step entirely.

### RAG Pipeline Debugging (Session 10)

If the RAG pipeline fails:
1. Run `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\test-postgrest-schema-cache.js` — if Test 1 fails, PostgREST cache or PG functions are stale.
2. Use diagnostic endpoint `POST https://v4-show.vercel.app/api/rag/test-section-insert`.
3. If Inngest keeps failing despite correct build — force re-sync: Dashboard → Syncs → Resync.

---

## Supabase Agent Ops Library (SAOL) Quick Reference

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

## Previous Session Context (Sessions 8–15)

### Session 8: Automated Adapter Deployment (COMPLETE)
Fully resolved the automated adapter deployment pipeline: RunPod GraphQL `saveEndpoint`, Hugging Face `createRepo()` + `uploadFiles()`. Adapter `e8fa481f` deployed on HF (`BrightHub2/lora-emotional-intelligence-e8fa481f`) and RunPod endpoint `780tauhj7c126b`.

### Session 9: v4-Show Bug Fixes (COMPLETE)
10 bug fixes: DB migration for stale PG functions, `workbase_id` threading through services/API/UI, conversation generator Sheet (later replaced in Session 12), "+" card on home, archive restore flow. Sun Bank re-trigger script created but NOT yet run.

### Session 10: RAG Embedding Pipeline Debug (COMPLETE)
Diagnosed persistent RAG embedding failure across 5 failed Inngest runs. Root cause: stale Vercel build cache + Inngest cached old deployment URLs. Fixed by cache clear + Inngest re-sync. Created diagnostic endpoint and test script.

### Session 11: Design Palette Overhaul (COMPLETE)
Comprehensive redesign using MotherDuck-inspired brand palette. Fixed CSS token chain, applied HSL triplets, re-themed all workbase pages from `zinc-*` to semantic tokens. Fixed copy/paste and keyboard shortcuts. Specification: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\14-ux-containers-design-implementation-A_v1.md`

### Session 12: Conversations Module Bug Fixes (COMPLETE)
Implemented all 6 fixes from spec 16 (Fix A: API key fix; Fix B: workbaseId plumbing through batch pipeline; Fix C: Sheet replaced with dedicated generator page). Diagnosed routing confusion and type mismatch issues. Wrote check-up doc (17) and next spec (18).

### Session 13: Spec 18 + Auto-Enrich + Modal Fix (COMPLETE)
Implemented Spec 18 (full ConversationTable on workbase conversations page). Added auto-enrichment after batch job completion. Fixed invisible text in modal inputs by replacing `zinc-*` classes with design tokens in `dialog.tsx` and `alert-dialog.tsx`.

### Session 14: Training Pipeline Discovery & Gap Analysis (COMPLETE — Research Only)
Investigated the full legacy training pipeline (training_files → datasets → pipeline_training_jobs) vs. the new workbase flow (training_sets → Launch Tuning). Identified 8 gaps + 1 critical JSONL format mismatch. Produced comprehensive discovery document with 3-phase implementation plan. **No code was written.** Output: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\19-ux-containers-training-discovery_v1.md`

### Session 15: Training Pipeline Integration Specification (COMPLETE — Specification Only)
Wrote the complete implementation specification (Spec 20) for bridging all 8 gaps + the critical JSONL format mismatch. The spec is 1,444 lines and covers 3 phases, 11 files to modify, 18 acceptance criteria, with full code for the `buildTrainingSet` rewrite and Launch Tuning page rewrite. **No code was written or modified. No DDL was executed.** Output: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\20-ux-containers-training-specification_v1.md`

### How to verify live RunPod status:
```bash
node -e '
require("dotenv").config({path:".env.local"});
fetch(`https://api.runpod.io/graphql?api_key=${process.env.RUNPOD_GRAPHQL_API_KEY}`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "{ myself { endpoint(id: \"780tauhj7c126b\") { env { key value } } } }" })
}).then(r => r.json()).then(d => {
  const envVars = d.data.myself.endpoint.env;
  console.log(JSON.stringify(JSON.parse(envVars.find(e => e.key === "LORA_MODULES").value), null, 3));
})}'
```
