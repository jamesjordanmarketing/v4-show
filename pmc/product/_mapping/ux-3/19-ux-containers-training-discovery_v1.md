# 19 — Training Pipeline Discovery & Gap Analysis

**Version:** 1.0 | **Date:** 2026-03-02  
**Purpose:** Comprehensive investigation of the legacy training pipeline vs. the new workbase UX, with precise gap identification and implementation solutions.

---

## Table of Contents

1. [Answer: Legacy Pipeline Confirmation](#1-answer-legacy-pipeline-confirmation)
2. [Answer: Difference Between Training Files and Datasets](#2-answer-difference-between-training-files-and-datasets)
3. [Answer: New Functionality Confirmation](#3-answer-new-functionality-confirmation)
4. [Current State: What Exists Today](#4-current-state-what-exists-today)
5. [Gap Analysis: What's Missing](#5-gap-analysis-whats-missing)
6. [Implementation Plan](#6-implementation-plan)
7. [Database State Reference](#7-database-state-reference)

---

## 1. Answer: Legacy Pipeline Confirmation

**Yes — your description of the legacy pipeline is correct.** Here is the full chain:

```
STEP 1: Generate Conversations
  Route: /conversations (legacy) or /workbase/[id]/fine-tuning/conversations/generate (new)
  Action: Claude API generates multi-turn conversations → stored in Supabase Storage as individual JSON files
  DB:     conversations table (one row per conversation)
  
STEP 2: Enrich Conversations  
  Action: 5-stage enrichment pipeline runs on each conversation → creates enriched JSON + training_pairs
  DB:     conversations.enrichment_status = 'completed', conversations.enriched_file_path set
  
STEP 3: Create Training File (the "aggregation" step)
  Route:  /training-files (legacy) — files displayed here
  Trigger: "Create Training Files" button on /conversations page (or the workbase conversations page)
  Action: POST /api/training-files → TrainingFileService.createTrainingFile()
    1. Fetches enriched JSONs from Supabase Storage for all selected conversations
    2. Aggregates them into a FULL TRAINING JSON (v4 schema with metadata, consultant_profile, conversations array)
    3. Converts to JSONL — one line per training pair (turn), skipping null target_responses
    4. Uploads BOTH files to Supabase Storage bucket "training-files"
    5. Creates training_files DB record with metadata (conversation_count, total_training_pairs, quality stats, scaffolding distribution)
  DB:     training_files table, training_file_conversations junction table
  Output: TWO files → training.json (full aggregated JSON) + training.jsonl (LoRA-ready JSONL)
  
STEP 4: Import Training File as Dataset (the "bridge" step)
  Route:  /datasets/import (legacy)
  Trigger: "Import from Training File" button on /datasets page
  Action: POST /api/datasets/import-from-training-file → takes a training_file_id
    1. Reads the training_files row
    2. Creates a datasets row pointing to the SAME storage_path (the .jsonl file)
    3. Sets training_ready: true, format: 'brightrun_lora_v4'
    4. Calculates estimated token counts
  DB:     datasets table 
  Output: A "dataset" record that wraps the JSONL file, adding schema for the pipeline to consume

STEP 5: Configure & Launch Training Job
  Route:  /pipeline/configure?datasetId=[id] (legacy)
  Trigger: "Start Training" button on /datasets page, or direct navigation
  Action: User picks a dataset, sets 3 lay-person sliders (Sensitivity, Progression, Repetition), names the job
    1. POST /api/pipeline/jobs → createPipelineJob()
    2. Looks up datasets row by datasetId to get storage_path
    3. Creates pipeline_training_jobs row
    4. Emits Inngest event 'pipeline/job.created'
    5. Inngest dispatches to RunPod for GPU training
  DB:     pipeline_training_jobs table

STEP 6: Training Completes → Auto-Deploy Adapter
  Action: RunPod finishes training → adapter file stored → Inngest auto-deploy function triggers
    1. Downloads adapter from RunPod job output
    2. Pushes to Hugging Face repo
    3. Updates RunPod endpoint LORA_MODULES env var
    4. Creates pipeline_inference_endpoints records
  DB:     pipeline_training_jobs.status = 'completed', pipeline_inference_endpoints created
```

**The legacy pipeline is a 6-step chain across 4 separate pages and 3 database tables (training_files → datasets → pipeline_training_jobs).**

---

## 2. Answer: Difference Between Training Files and Datasets

This is the critical distinction you were asking about:

### Training File (created by "Create Training Files" button)

| Attribute | Value |
|-----------|-------|
| **DB Table** | `training_files` |
| **Created by** | `POST /api/training-files` via `TrainingFileService.createTrainingFile()` |
| **Contains** | TWO files stored in Supabase Storage bucket `training-files`: |
| | 1. **training.json** — Full aggregated JSON (v4 schema). Contains: `training_file_metadata`, `consultant_profile`, and a `conversations[]` array with each conversation's `conversation_metadata` + `training_pairs[]` |
| | 2. **training.jsonl** — Line-delimited JSON. One line per training pair (turn). Each line has: `system_prompt`, `conversation_history`, `current_user_input`, `emotional_context`, `target_response`, `training_metadata` |
| **Purpose** | Human-reviewable aggregate (the JSON) + machine-readable training input (the JSONL) |
| **Metadata tracked** | `conversation_count`, `total_training_pairs`, quality scores (avg/min/max), `scaffolding_distribution` (persona/arc/topic breakdowns) |

### Dataset (created by "Import from Training File")

| Attribute | Value |
|-----------|-------|
| **DB Table** | `datasets` |
| **Created by** | `POST /api/datasets/import-from-training-file` |
| **Contains** | **No new file.** Points to the SAME `.jsonl` file from the training file (same `storage_path`) |
| **Purpose** | A thin metadata wrapper that the pipeline configuration page (`/pipeline/configure`) can select from. Adds fields required by the pipeline: `format`, `training_ready`, `validated_at`, `total_tokens`, `avg_turns_per_conversation`, `avg_tokens_per_turn` |
| **Key difference** | The dataset is a **pointer + metadata envelope**, not a new file. The `datasets.storage_path` literally references the training file's JSONL path (e.g., `6fe6c561-4a4c-44e3-b811-c13c06c7d205/training.jsonl`) |

### The Flow Summarized

```
Individual Enriched Conversations (Supabase Storage: conversation-files bucket)
       ↓  "Create Training Files" (aggregation + JSONL conversion)
Training File (Supabase Storage: training-files bucket → training.json + training.jsonl)
       ↓  "Import from Training File" (metadata wrapper — NO new file created)
Dataset (DB record pointing to same .jsonl → training_ready: true)
       ↓  "Configure Training" (pipeline reads dataset.storage_path to get the JSONL)
Pipeline Training Job → RunPod GPU → Adapter → HuggingFace → Endpoint
```

**The dataset is NOT a different file format.** It's the same JSONL file, just registered in the `datasets` table so the pipeline can find and consume it.

---

## 3. Answer: New Functionality Confirmation

**Yes — your understanding of the planned new functionality is correct, and it is documented in `07-internal-ux-decisions_v4.md` (Decision D1).**

Here is the precise mapping:

### Your Statement (a): ✅ CORRECT

> "Create Training Files" button automatically also creates the LoRA ready-to-be-adapted file that was previously executed by `/datasets` + "Import from Training File"

**07-decisions spec says (D1, "What Happens Under the Hood"):**
> "Step 3: Auto-create a dataset record (or merge the concept entirely)"

The intent is that clicking "Build Training Set" (the renamed button) on the Conversations page should:
1. Aggregate conversations into JSON ✅ (existing logic in `TrainingFileService`)
2. Convert to JSONL ✅ (existing logic in `TrainingFileService`)
3. Store both files ✅ (existing logic)
4. **AND automatically create the dataset record** — eliminating the manual "Import from Training File" step

### Your Statement (b): ✅ CORRECT

> This LoRA-ready file would show on `/workbase/[id]/fine-tuning/launch` which would confirm readiness and serve as kickoff for the full training pipeline

**07-decisions spec says (Page 3: Launch Tuning):**
> - Section A: Training Input — Card showing "Training Set: {name}", auto-selects latest Ready set
> - Section B: Training Settings — 3 lay-person sliders (existing from `/pipeline/configure`)
> - Section C: Cost & Launch — CTA: "Train & Publish" → inline progress → HuggingFace → endpoint → worker refresh

**The Launch Tuning page replaces FOUR legacy pages:** `/pipeline/configure` + `/pipeline/jobs` + `/pipeline/jobs/[id]` + `/pipeline/jobs/[id]/results`

---

## 4. Current State: What Exists Today

### What's BUILT and WORKING

| Component | Status | Notes |
|-----------|--------|-------|
| `POST /api/training-files` | ✅ Working | Creates training.json + training.jsonl, stores in Supabase Storage |
| `TrainingFileService` | ✅ Working | Full aggregation + JSONL conversion + metadata calculation |
| `POST /api/datasets/import-from-training-file` | ✅ Working | Creates dataset record pointing to same JSONL |
| `POST /api/pipeline/jobs` | ✅ Working | Creates pipeline job, emits Inngest event |
| `/pipeline/configure` (legacy page) | ✅ Working | Dataset selector, sliders, cost estimate, job creation |
| Inngest `pipeline/job.created` handler | ✅ Working | Dispatches to RunPod |
| Inngest `auto-deploy-adapter` | ✅ Working | HuggingFace push + LORA_MODULES update |
| `ConversationTable` "Create Training Files" action | ✅ Working | Calls `POST /api/training-files` (legacy route) |
| `training_sets` DB table | ✅ Exists | Has columns: `workbase_id`, `conversation_ids`, `jsonl_path`, `status`, `is_active` |
| `POST /api/workbases/[id]/training-sets` | ✅ Working | Creates training_sets row with status 'processing', emits `training/set.created` |
| `useTrainingSets` hook | ✅ Working | Fetches training sets by workbase |
| `buildTrainingSet` Inngest function | ✅ Working | Triggered by `training/set.created`, builds JSONL from `conversation_turns`, uploads to Storage |
| `/workbase/[id]/fine-tuning/launch` page | ✅ Scaffold exists | Shows training sets, has placeholder cards for settings / cost / history |

### What's NOT Built

| Component | Status | Gap ID |
|-----------|--------|--------|
| ConversationTable calling `POST /api/workbases/[id]/training-sets` instead of `POST /api/training-files` | ❌ Missing | GAP-1 |
| Auto-creation of `datasets` record after training set JSONL is built | ❌ Missing | GAP-2 |
| Launch Tuning page: Training parameter sliders | ❌ TODO placeholder | GAP-3 |
| Launch Tuning page: Cost estimate card | ❌ TODO placeholder | GAP-4 |
| Launch Tuning page: "Train & Publish" wired to `POST /api/pipeline/jobs` | ❌ Missing | GAP-5 |
| Launch Tuning page: Inline progress display | ❌ Missing | GAP-6 |
| Launch Tuning page: Adapter history (workbase-scoped) | ⚠️ Partial | GAP-7 |
| `pipeline_training_jobs.workbase_id` populated when creating jobs from workbase flow | ❌ All existing jobs have `workbase_id = NULL` | GAP-8 |

---

## 5. Gap Analysis: What's Missing

### GAP-1: ConversationTable calls legacy API instead of workbase training-sets API

**Current behavior:**  
`ConversationTable.tsx` line 138 calls `POST /api/training-files` (the legacy route). This creates a `training_files` record with no `workbase_id` (all 7 existing records have `workbase_id = NULL`).

**Required behavior:**  
When used on the workbase conversations page, it should call `POST /api/workbases/[id]/training-sets` to create a `training_sets` record scoped to the workbase.

**Solution options:**
1. **Option A (Prop-based routing):** Add an optional `workbaseId` prop to `ConversationTable`. When present, the "Create Training Files" action calls the workbase training-sets API. When absent (legacy page), it calls the legacy API.
2. **Option B (Replace entirely):** Change ConversationTable to always use the new training-sets API and require a `workbaseId` prop. Update the legacy page to pass it.

**Recommendation:** Option A — maintains backward compatibility with the legacy `/conversations` page.

---

### GAP-2: No auto-creation of `datasets` record after training set is built

**Current behavior:**  
The `buildTrainingSet` Inngest function (in `src/inngest/functions/build-training-set.ts`) does:
1. Fetches `conversation_turns` for the selected conversations
2. Builds JSONL in OpenAI fine-tuning format (NOT BrightRun v4 format — see **CRITICAL ISSUE** below)
3. Uploads JSONL to `training-files` storage bucket
4. Updates `training_sets.status = 'ready'` and `training_sets.jsonl_path`

It does **NOT** create a `datasets` record afterward.

**Required behavior:**  
After the training set JSONL is built, automatically create a `datasets` record pointing to the same JSONL — so the Launch Tuning page can use it for `POST /api/pipeline/jobs` (which requires a `datasetId`).

**Solution:** Add a Step 5 to `buildTrainingSet` Inngest function:
```
Step 5: Create datasets record
  - Insert into datasets with:
    - user_id, name (from training_sets), storage_bucket: 'training-files'
    - storage_path: jsonl_path (from Step 3)
    - format: 'brightrun_lora_v4'
    - total_training_pairs: trainingPairCount
    - training_ready: true
    - validated_at: NOW()
  - Also update training_sets.dataset_id (new column — see GAP-2b)
```

**GAP-2b — New column needed:** `training_sets` needs a `dataset_id` column (UUID, nullable, FK to datasets.id) so the Launch Tuning page can resolve from training set → dataset → pipeline job.

---

### ⚠️ CRITICAL ISSUE: JSONL Format Mismatch

**The `buildTrainingSet` Inngest function produces a DIFFERENT JSONL format than `TrainingFileService.convertFullJSONToJSONL()`.**

| | `TrainingFileService` (legacy) | `buildTrainingSet` (new) |
|---|---|---|
| **Format** | BrightRun v4: `{ id, conversation_id, turn_number, system_prompt, conversation_history, current_user_input, emotional_context, target_response, training_metadata }` | OpenAI fine-tuning: `{ messages: [{ role, content }, ...] }` |
| **Source data** | Enriched JSON files from `conversation-files` Storage bucket | `conversation_turns` DB table |
| **Granularity** | One line per training pair (turn) | One line per conversation (all turns) |
| **Metadata** | Rich: includes `emotional_context`, `training_metadata`, `scaffolding` | None: just `role` + `content` |

**This is a real problem.** The RunPod training engine (`dispatchTrainingJob` Inngest function) was built to consume BrightRun v4 format JSONL. If the new flow produces OpenAI-format JSONL, the training job may fail or produce inferior results because all the emotional context and training metadata is stripped.

**Solution:** The `buildTrainingSet` function must be rewritten to use the same `TrainingFileService` logic:
1. Fetch enriched JSONs from Supabase Storage (not conversation_turns from DB)
2. Aggregate using `aggregateConversationsToFullJSON()`
3. Convert using `convertFullJSONToJSONL()`
4. This produces v4-format JSONL with full metadata

**Alternatively:** Extract the aggregation + conversion logic from `TrainingFileService` into a shared utility that both code paths can call.

---

### GAP-3: Launch page missing training parameter sliders

**Current state:** Placeholder text: "Training parameter configuration coming soon."

**Solution:** Import `TrainingParameterSlider` from `@/components/pipeline` and wire to local state (or `usePipelineStore`). The existing component + constants (`SENSITIVITY_OPTIONS`, `PROGRESSION_OPTIONS`, `REPETITION_OPTIONS`) are fully functional.

---

### GAP-4: Launch page missing cost estimate card

**Current state:** Placeholder. No cost calculation.

**Solution:** Import `CostEstimateCard` from `@/components/pipeline`. Wire `getCostEstimate()` from `usePipelineStore()`.

---

### GAP-5: "Train & Publish" not wired to job creation

**Current state:** The button exists but has no `onClick` handler that calls `POST /api/pipeline/jobs`.

**Solution:** 
1. Import `useCreatePipelineJob` from `@/hooks/usePipelineJobs`
2. On click: call `createJob.mutateAsync({ jobName, datasetId, trainingSensitivity, trainingProgression, trainingRepetition })`
3. The `datasetId` comes from the selected training set's auto-created dataset (see GAP-2)
4. After creation, show inline progress (GAP-6) instead of redirecting to `/pipeline/jobs/[id]`

---

### GAP-6: No inline training progress on Launch page

**Current state:** No progress display.

**Solution:** After job creation, poll `GET /api/pipeline/jobs/[jobId]` and display:
- Progress bar (percentage)
- Current step: Training → Storing on HuggingFace → Updating endpoint → Refreshing workers
- Metrics: loss, epoch, tokens/sec

This replaces the separate `/pipeline/jobs/[id]` page for the workbase flow.

---

### GAP-7: Adapter history not workbase-scoped

**Current state:** `usePipelineJobs({ limit: 10 })` returns all jobs globally — no workbase filter.

**Solution:** `pipeline_training_jobs` already has a `workbase_id` column. Add a `workbaseId` parameter to `usePipelineJobs` and filter server-side.

---

### GAP-8: Pipeline jobs not linked to workbase

**Current state:** All 10 existing `pipeline_training_jobs` records have `workbase_id = NULL`.

**Solution:** When creating a job from the Launch page, include `workbase_id` in the `POST /api/pipeline/jobs` request body. Update `createPipelineJob()` in `pipeline-service.ts` to accept and store it. Also update `workbases.active_adapter_job_id` on successful deployment.

---

## 6. Implementation Plan

### Phase 1: Fix the Foundation (JSONL format + auto-dataset)

| # | Task | Files Affected |
|---|------|----------------|
| 1.1 | Rewrite `buildTrainingSet` Inngest function to use `TrainingFileService` aggregation logic (produce v4-format JSONL with full metadata) | `src/inngest/functions/build-training-set.ts` |
| 1.2 | Add auto-creation of `datasets` record as Step 5 in `buildTrainingSet` | `src/inngest/functions/build-training-set.ts` |
| 1.3 | Add `dataset_id` column to `training_sets` table | DB DDL via SAOL |
| 1.4 | Update `POST /api/workbases/[id]/training-sets` to optionally accept `workbaseId` for the datasets record | `src/app/api/workbases/[id]/training-sets/route.ts` |

### Phase 2: Wire ConversationTable to workbase flow

| # | Task | Files Affected |
|---|------|----------------|
| 2.1 | Add optional `workbaseId` prop to `ConversationTable` | `src/components/conversations/ConversationTable.tsx` |
| 2.2 | When `workbaseId` is present, "Create Training Files" calls `POST /api/workbases/[id]/training-sets` instead of `POST /api/training-files` | `src/components/conversations/ConversationTable.tsx` |
| 2.3 | Pass `workbaseId` from workbase conversations page to `ConversationTable` | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` |

### Phase 3: Complete Launch Tuning Page

| # | Task | Files Affected |
|---|------|----------------|
| 3.1 | Add training parameter sliders (import existing `TrainingParameterSlider` + constants) | `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` |
| 3.2 | Add cost estimate card (import existing `CostEstimateCard`) | Same file |
| 3.3 | Wire "Train & Publish" to `POST /api/pipeline/jobs` with `workbaseId` + `datasetId` (from selected training set's auto-created dataset) | Same file |
| 3.4 | Add `workbaseId` parameter to `createPipelineJob` and `POST /api/pipeline/jobs` | `src/lib/services/pipeline-service.ts`, `src/app/api/pipeline/jobs/route.ts` |
| 3.5 | Add inline training progress display (poll job status) | `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` |
| 3.6 | Add workbase filter to `usePipelineJobs` hook | `src/hooks/usePipelineJobs.ts` |
| 3.7 | After successful adapter deployment, update `workbases.active_adapter_job_id` | `src/inngest/functions/auto-deploy-adapter.ts` |

### Dependency Chain

```
Phase 1 (Foundation)    → Phase 2 (ConversationTable routing) → Phase 3 (Launch page)
  1.1 (JSONL fix)             2.1-2.3 (prop + routing)             3.1-3.2 (UI components)
  1.2 (auto-dataset)                                                3.3-3.4 (job creation wiring)
  1.3 (DDL)                                                         3.5 (progress display)
  1.4 (API update)                                                  3.6-3.7 (history + active adapter)
```

---

## 7. Database State Reference

### training_files (7 records, all workbase_id = NULL)

| Name | Conversations | Training Pairs | Status | Created |
|------|--------------|----------------|--------|---------|
| first-trainer-JSON-3 convos | 3 | 21 | active | 2026-03-02 |
| Phase-3-training-12-convo_v1 | 12 | 77 | active | 2026-02-25 |
| Phase-2-training-random_v2-test-6 | 15 | 98 | active | 2026-02-24 |
| Phase-2-training-random_v2-test-5 | 13 | 82 | active | 2026-02-23 |
| Phase-2-training-random_v2-test-4 | 7 | 44 | active | 2026-02-23 |
| Phase-2-training-random_v2-test-3 | 3 | 18 | active | 2026-02-23 |
| Batch 6- 12 conversations #1 | 242 | 1567 | active | 2025-12-05 |

### training_sets (0 records)

No training sets have been created through the new workbase flow yet. The `buildTrainingSet` Inngest function has never been triggered.

### datasets (5 records — all imported from training_files)

| Name | Format | Pairs | Ready | Storage Path (= training file JSONL) |
|------|--------|-------|-------|--------------------------------------|
| Phase-3-training-12-convo_v1 | brightrun_lora_v4 | 77 | true | a00fab3a.../training.jsonl |
| Phase-2-training-random_v2-test-6 | brightrun_lora_v4 | 98 | true | 6fe6c561.../training.jsonl |
| Phase-2-training-random_v2-test-5 | brightrun_lora_v4 | 57 | true | d42c5bfe.../training.jsonl |
| Phase-2-training-random_v2-test-3 | brightrun_lora_v4 | 12 | true | 187598dc.../training.jsonl |
| Batch 6- 12 conversations #1 | brightrun_lora_v4 | 1567 | true | 7dc19882.../training.jsonl |

### pipeline_training_jobs (10 records — all workbase_id = NULL)

| Name | Status | Dataset | Adapter | HF Path |
|------|--------|---------|---------|---------|
| Phase-3-training-12-convo-adapter_v1 | completed | Phase-3-training-12-convo_v1 | ✅ | BrightHub2/lora-emotional-intelligence-bae71569 |
| Phase-2-training-random_v2-test-3-adapter_v4 | completed | Phase-2-training-random_v2-test-3 | ✅ | BrightHub2/lora-emotional-intelligence-308a26e9 |
| Phase-2-training-random_v2-test-6-adapter_v4 | completed | Phase-2-training-random_v2-test-6 | ✅ | BrightHub2/lora-emotional-intelligence-e8fa481f |
| Phase-2-training-random_v2-test-6-adapter_v3 | completed | Phase-2-training-random_v2-test-6 | ✅ | — |
| Phase-2-training-random_v2-test-6-adapter-v2 | completed | Phase-2-training-random_v2-test-6 | ✅ | BrightHub2/lora-emotional-intelligence-4e48e3b4 |
| Phase-2-training-random_v2-test-6-adapter | completed | Phase-2-training-random_v2-test-6 | ✅ | — |
| Phase-2-training-random_v2-test-5-adapter_v2 | completed | Phase-2-training-random_v2-test-5 | ✅ | — |
| Phase-2-training_v2-test-3-create-adapter_v2 | failed | Phase-2-training-random_v2-test-5 | — | — |
| Phase-2-training-random_v2-test-5-adapter (x2) | failed | Phase-2-training-random_v2-test-5 | — | — |

### Key Schema Notes

| Table | Has `workbase_id`? | Populated? |
|-------|-------------------|------------|
| `training_files` | ✅ Column exists | ❌ All NULL (legacy flow doesn't set it) |
| `training_sets` | ✅ Column exists | N/A (0 records) |
| `datasets` | ❌ Column does NOT exist | — |
| `pipeline_training_jobs` | ✅ Column exists | ❌ All NULL (legacy flow doesn't set it) |

**Note:** The `datasets` table has no `workbase_id` column. This may need to be added for workbase-scoped dataset visibility, OR the chain `training_sets.dataset_id → datasets.id` is sufficient for resolution.

---

## Summary: The Complete New Flow (After Gaps Are Filled)

```
WORKBASE CONVERSATIONS PAGE
  User selects conversations → clicks "Build Training Set"
       ↓
POST /api/workbases/[id]/training-sets
  Creates training_sets row (status: 'processing')
  Emits Inngest event: training/set.created
       ↓
Inngest: buildTrainingSet (REWRITTEN — Phase 1)
  Step 1: Fetch enriched JSONs from Storage (not conversation_turns)
  Step 2: Aggregate → Full Training JSON (v4 schema)  
  Step 3: Convert → JSONL (v4 format with full metadata)
  Step 4: Upload JSONL to Storage
  Step 5: Create datasets record (training_ready: true)  ← NEW
  Step 6: Update training_sets (status: 'ready', dataset_id: datasets.id)  ← MODIFIED
       ↓
LAUNCH TUNING PAGE
  Shows training set as "Ready" with conversation count + pair count
  User adjusts 3 sliders (Sensitivity, Progression, Repetition)
  User names the job → clicks "Train & Publish"
       ↓
POST /api/pipeline/jobs (with workbaseId + datasetId)
  Creates pipeline_training_jobs row
  Emits Inngest event: pipeline/job.created
       ↓
Inngest: dispatchTrainingJob → RunPod GPU training
       ↓
Inngest: autoDeployAdapter → HuggingFace + LORA_MODULES
       ↓ (future: D11 worker refresh)
Pipeline inference endpoints → Adapter LIVE
workbases.active_adapter_job_id updated
       ↓
BEHAVIOR CHAT PAGE — adapter available for chat
```

**End result: The user touches ONLY TWO PAGES (Conversations → Launch Tuning). Everything between is automated.**
