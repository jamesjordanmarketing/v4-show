# 20 — Training Pipeline Integration: Implementation Specification

**Version:** 1.0 | **Date:** 2026-03-02  
**Prerequisite:** `19-ux-containers-training-discovery_v1.md` (gap analysis)  
**Spec for:** `07-internal-ux-decisions_v4.md` Decision D1 (Eliminate Data Shaping)

---

## Table of Contents

1. [Background Context](#1-background-context)
2. [Objective](#2-objective)
3. [Phase 1: Fix the Foundation](#3-phase-1-fix-the-foundation)
4. [Phase 2: Wire ConversationTable](#4-phase-2-wire-conversationtable)
5. [Phase 3: Complete Launch Tuning Page](#5-phase-3-complete-launch-tuning-page)
6. [Implementation Sequence & Dependencies](#6-implementation-sequence--dependencies)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Files Modified Summary](#8-files-modified-summary)

---

## 1. Background Context

### Platform

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application. Generates AI training conversations, enriches them, aggregates into JSONL, trains LoRA adapters on RunPod GPUs, and auto-deploys to Hugging Face + RunPod inference endpoints.

**Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Storage), Inngest (background jobs), TanStack Query v5, Zustand, shadcn/UI + Tailwind CSS, RunPod (GPU training + inference), Hugging Face Hub (adapter hosting).

**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

### What This Spec Implements

The application has a working **legacy training pipeline** spanning 4 pages and 3 DB tables. A new **workbase-scoped UX** reduces this to 2 pages. The backend logic exists but the two flows are not connected. This spec bridges 8 identified gaps + 1 critical JSONL format mismatch to complete the integration.

### The Legacy Pipeline (Working — Do Not Break)

```
1. ConversationTable → "Create Training Files" → POST /api/training-files
   → TrainingFileService.createTrainingFile() → aggregated JSON + v4-format JSONL
   → training_files table
2. /datasets/import → POST /api/datasets/import-from-training-file
   → datasets table (thin metadata wrapper pointing to same JSONL)
3. /pipeline/configure → POST /api/pipeline/jobs → pipeline_training_jobs row
   → Inngest dispatches to RunPod GPU
4. Auto-deploy → Hugging Face + RunPod LORA_MODULES update
```

### The New Workbase Flow (Target — What This Spec Builds)

```
1. /workbase/[id]/fine-tuning/conversations → Select conversations → "Build Training Set"
   → POST /api/workbases/[id]/training-sets → Inngest buildTrainingSet
   → v4-format JSONL + auto-create datasets record
2. /workbase/[id]/fine-tuning/launch → Pick training set → Sliders → "Train & Publish"
   → POST /api/pipeline/jobs (with workbaseId) → GPU training → auto-deploy
```

### SAOL Requirement

**ALL agent-driven database operations (DDL, queries, inserts) MUST use SAOL** (Supabase Agent Ops Library) at `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Dry-run first, then set dryRun: false
  const r = await saol.agentExecuteDDL({
    sql: 'ALTER TABLE training_sets ADD COLUMN dataset_id UUID;',
    transport: 'pg',
    transaction: true,
    dryRun: true
  });
  console.log(r);
})();"
```

**Rules:** Always `dryRun: true` first, then `dryRun: false` to apply. Always `transport: 'pg'` for DDL. Application code (API routes, Inngest functions) uses `createServerSupabaseAdminClient()` — NOT SAOL.

Full SAOL guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

### Design Token Rules

All new/modified UI code MUST use the application's semantic design tokens:
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` classes in any new or modified code**
- Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT tokens

---

## 2. Objective

Close 8 gaps + 1 critical format mismatch to deliver the complete 2-page workbase training flow:

| Gap | Description | Phase |
|-----|-------------|-------|
| **CRITICAL** | `buildTrainingSet` Inngest produces OpenAI-format JSONL; must produce BrightRun v4 format | 1 |
| **GAP-2** | No auto-creation of `datasets` record after training set JSONL is built | 1 |
| **GAP-2b** | `training_sets` table missing `dataset_id` column | 1 |
| **GAP-1** | `ConversationTable` calls legacy `POST /api/training-files` instead of workbase API | 2 |
| **GAP-3** | Launch page missing training parameter sliders | 3 |
| **GAP-4** | Launch page missing cost estimate card | 3 |
| **GAP-5** | "Train & Publish" button not wired to `POST /api/pipeline/jobs` | 3 |
| **GAP-6** | No inline training progress on Launch page | 3 |
| **GAP-7** | Adapter history not filtered by workbase | 3 |
| **GAP-8** | `pipeline_training_jobs.workbase_id` not populated from workbase flow | 3 |

---

## 3. Phase 1: Fix the Foundation

### 3.1 — DDL: Add `dataset_id` Column to `training_sets`

**Action:** Add a nullable UUID column `dataset_id` to the `training_sets` table. This links a training set to its auto-created `datasets` record so the Launch page can resolve from training set → dataset → pipeline job.

**SAOL commands (run in terminal):**

```bash
# Step 1: Validate current schema
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentIntrospectSchema({table:'training_sets',transport:'pg'});
  console.log(JSON.stringify(r.tables[0].columns.map(c=>c.column_name),null,2));
})();"

# Step 2: Dry-run the DDL
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: 'ALTER TABLE training_sets ADD COLUMN IF NOT EXISTS dataset_id UUID REFERENCES datasets(id);',
    transport: 'pg',
    transaction: true,
    dryRun: true
  });
  console.log('Dry-run result:', JSON.stringify(r, null, 2));
})();"

# Step 3: Apply (set dryRun: false)
# (Same command with dryRun: false)

# Step 4: Verify
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentIntrospectSchema({table:'training_sets',transport:'pg'});
  const col = r.tables[0].columns.find(c=>c.column_name==='dataset_id');
  console.log('dataset_id column:', col ? 'EXISTS' : 'MISSING', col);
})();"
```

### 3.2 — Rewrite `buildTrainingSet` Inngest Function (CRITICAL)

**File:** `src/inngest/functions/build-training-set.ts`

**Problem:** The current function reads from `conversation_turns` DB table and produces OpenAI-format JSONL (`{ messages: [{ role, content }] }`). The RunPod training engine expects BrightRun v4 format JSONL with `emotional_context`, `training_metadata`, `scaffolding`, etc.

**Solution:** Rewrite to use `TrainingFileService` aggregation logic — fetch enriched JSONs from Supabase Storage, aggregate them, and convert to v4-format JSONL.

**Complete replacement for `src/inngest/functions/build-training-set.ts`:**

```typescript
import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { createTrainingFileService } from '@/lib/services/training-file-service';

/**
 * Build Training Set (Rewritten — v4 Format)
 *
 * Triggered after a training_sets row is created with status: 'processing'.
 *
 * Steps:
 *   1. Validate conversations (enrichment_status === 'completed')
 *   2. Use TrainingFileService to aggregate enriched JSONs → Full Training JSON → v4 JSONL
 *   3. Upload JSONL to Supabase Storage
 *   4. Auto-create a datasets record (so Launch page can resolve datasetId for job creation)
 *   5. Update training_sets record to status: 'ready' with jsonl_path and dataset_id
 */
export const buildTrainingSet = inngest.createFunction(
  {
    id: 'build-training-set',
    name: 'Build Training Set JSONL (v4 Format)',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'training/set.created' },
  async ({ event, step }) => {
    const { trainingSetId, workbaseId, conversationIds, userId } = event.data;

    // Step 1: Fetch the training set record for its name
    const trainingSet = await step.run('fetch-training-set', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('training_sets')
        .select('id, name')
        .eq('id', trainingSetId)
        .single();
      if (error || !data) throw new Error(`Training set not found: ${trainingSetId}`);
      return data;
    });

    // Step 2: Use TrainingFileService to aggregate enriched JSONs and produce v4 JSONL
    //
    //   TrainingFileService.createTrainingFile() does:
    //     a) resolveToConversationIds (handles PK vs business key)
    //     b) validateConversationsForTraining (checks enrichment_status === 'completed')
    //     c) fetchEnrichedConversations (downloads enriched JSONs from Storage)
    //     d) aggregateConversationsToFullJSON (builds v4 schema)
    //     e) convertFullJSONToJSONL (one line per training pair, with emotional_context, training_metadata)
    //     f) uploads both files to Storage
    //     g) creates training_files DB record + junction associations
    //
    //   We call createTrainingFile() directly — it produces the correct v4 JSONL
    //   AND creates a training_files record that we can reference.
    //   This reuses 100% of the proven aggregation logic.

    const trainingFile = await step.run('create-training-file-v4', async () => {
      const supabase = createServerSupabaseAdminClient();
      const service = createTrainingFileService(supabase);

      try {
        const result = await service.createTrainingFile({
          name: trainingSet.name,
          description: `Auto-created by workbase training set ${trainingSetId}`,
          conversation_ids: conversationIds,
          created_by: userId,
        });
        return {
          id: result.id,
          jsonlPath: result.jsonl_file_path,
          totalTrainingPairs: result.total_training_pairs,
          conversationCount: result.conversation_count,
        };
      } catch (err: any) {
        // If validation fails (e.g. conversations not enriched), mark training set as failed
        const supabase2 = createServerSupabaseAdminClient();
        await supabase2
          .from('training_sets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', trainingSetId);
        throw new Error(`Training file creation failed: ${err.message}`);
      }
    });

    if (!trainingFile || !trainingFile.jsonlPath) {
      return { success: false, reason: 'No JSONL produced' };
    }

    // Step 3: Auto-create datasets record
    //   This is the "bridge" that the legacy flow does manually via /datasets/import.
    //   The Launch page needs a datasetId to call POST /api/pipeline/jobs.
    const dataset = await step.run('auto-create-dataset', async () => {
      const supabase = createServerSupabaseAdminClient();

      const { data, error } = await supabase
        .from('datasets')
        .insert({
          user_id: userId,
          name: trainingSet.name,
          description: `Auto-created from training set ${trainingSetId}`,
          source_type: 'training_file',
          source_id: trainingFile.id,
          storage_bucket: 'training-files',
          storage_path: trainingFile.jsonlPath,
          format: 'brightrun_lora_v4',
          total_training_pairs: trainingFile.totalTrainingPairs,
          training_ready: true,
          validated_at: new Date().toISOString(),
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create dataset: ${error.message}`);
      return { id: data.id };
    });

    // Step 4: Update training_sets record → status: 'ready', set jsonl_path and dataset_id
    await step.run('update-training-set-ready', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);

      if (error) throw new Error(`Failed to update training set: ${error.message}`);
    });

    return {
      success: true,
      trainingSetId,
      trainingFileId: trainingFile.id,
      datasetId: dataset.id,
      jsonlPath: trainingFile.jsonlPath,
      trainingPairCount: trainingFile.totalTrainingPairs,
      conversationCount: trainingFile.conversationCount,
    };
  }
);
```

**Key design decisions:**
- Delegates to `TrainingFileService.createTrainingFile()` which is the proven, 920-line aggregation engine. This ensures identical JSONL output to the legacy flow.
- Also creates a `training_files` record as a side effect — this keeps the legacy training files list consistent and provides the `jsonl_file_path` we need.
- Auto-creates a `datasets` record — eliminating the manual "Import from Training File" step.
- Writes `dataset_id` back to `training_sets` — so the Launch page can resolve the chain.

### 3.3 — Update `TrainingSet` TypeScript Type

**File:** `src/types/workbase.ts`

**Change:** Add `datasetId` field to the `TrainingSet` interface.

**Current (line ~97):**
```typescript
export interface TrainingSet {
  id: string;
  workbaseId: string;
  userId: string;
  name: string;
  conversationIds: string[];
  conversationCount: number;
  trainingPairCount: number;
  status: TrainingSetStatus;
  jsonlPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Replace with:**
```typescript
export interface TrainingSet {
  id: string;
  workbaseId: string;
  userId: string;
  name: string;
  conversationIds: string[];
  conversationCount: number;
  trainingPairCount: number;
  status: TrainingSetStatus;
  jsonlPath: string | null;
  datasetId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 — Update Training Sets API Route Mapper

**File:** `src/app/api/workbases/[id]/training-sets/route.ts`

**Change:** Include `datasetId` in the camelCase mapping for both GET and POST responses.

In the GET handler's `mapped` array (around line 42), add `datasetId`:

**Current:**
```typescript
const mapped = (data || []).map((row: any) => ({
    id: row.id,
    workbaseId: row.workbase_id,
    userId: row.user_id,
    name: row.name,
    conversationIds: row.conversation_ids || [],
    conversationCount: row.conversation_count,
    trainingPairCount: row.training_pair_count || 0,
    status: row.status,
    jsonlPath: row.jsonl_path,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
```

**Replace with:**
```typescript
const mapped = (data || []).map((row: any) => ({
    id: row.id,
    workbaseId: row.workbase_id,
    userId: row.user_id,
    name: row.name,
    conversationIds: row.conversation_ids || [],
    conversationCount: row.conversation_count,
    trainingPairCount: row.training_pair_count || 0,
    status: row.status,
    jsonlPath: row.jsonl_path,
    datasetId: row.dataset_id || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
```

In the POST handler's response object (around line 137), add `datasetId`:

**Current:**
```typescript
      data: {
        id: ts.id,
        workbaseId: ts.workbase_id,
        userId: ts.user_id,
        name: ts.name,
        conversationIds: ts.conversation_ids || [],
        conversationCount: ts.conversation_count,
        trainingPairCount: ts.training_pair_count || 0,
        status: ts.status,
        jsonlPath: ts.jsonl_path,
        isActive: ts.is_active,
        createdAt: ts.created_at,
        updatedAt: ts.updated_at,
      },
```

**Replace with:**
```typescript
      data: {
        id: ts.id,
        workbaseId: ts.workbase_id,
        userId: ts.user_id,
        name: ts.name,
        conversationIds: ts.conversation_ids || [],
        conversationCount: ts.conversation_count,
        trainingPairCount: ts.training_pair_count || 0,
        status: ts.status,
        jsonlPath: ts.jsonl_path,
        datasetId: ts.dataset_id || null,
        isActive: ts.is_active,
        createdAt: ts.created_at,
        updatedAt: ts.updated_at,
      },
```

---

## 4. Phase 2: Wire ConversationTable

### 4.1 — Add `workbaseId` Prop to ConversationTable

**File:** `src/components/conversations/ConversationTable.tsx`

**Goal:** When `workbaseId` is provided, the "Create Training Files" action calls `POST /api/workbases/[id]/training-sets` instead of `POST /api/training-files`. When `workbaseId` is absent (legacy page), behavior is unchanged.

**Change A — Update the props interface (line ~93):**

**Current:**
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
}
```

**Replace with:**
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
  workbaseId?: string; // When set, "Build Training Set" calls workbase API
}
```

**Change B — Destructure the new prop in the component signature (line ~95):**

**Current:**
```typescript
export const ConversationTable = React.memo(function ConversationTable({ conversations, isLoading, compactActions = true }: ConversationTableProps) {
```

**Replace with:**
```typescript
export const ConversationTable = React.memo(function ConversationTable({ conversations, isLoading, compactActions = true, workbaseId }: ConversationTableProps) {
```

**Change C — Add a workbase training set mutation (after the existing `createTrainingFileMutation` around line 125):**

Add this mutation right after the `createTrainingFileMutation` block (after its `onError` callback, around line 160):

```typescript
  // Create training set via workbase API (new flow)
  const createTrainingSetMutation = useMutation({
    mutationFn: async ({
      name,
      conversationIds,
    }: {
      name: string;
      conversationIds: string[];
    }) => {
      const response = await fetch(`/api/workbases/${workbaseId}/training-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, conversationIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create training set');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Training set is being built. Check Launch Tuning for status.');
      queryClient.invalidateQueries({ queryKey: ['training-sets'] });
      clearSelection();
      setShowCreateTrainingFileDialog(false);
      setNewFileName('');
      setNewFileDescription('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
```

**Change D — Replace the `handleCreateNewFile` handler to route by `workbaseId`:**

Find the handler function `handleCreateNewFile`. It is called from the dialog's submit button. Replace (or add alongside) the logic:

The current `handleCreateNewFile` is invoked on dialog submit. It currently calls `createTrainingFileMutation.mutate(...)`. We need it to conditionally call the workbase mutation when `workbaseId` is present.

Search for the existing `handleCreateNewFile` function or the dialog's submit `onClick`. The dialog's "Create Training File" button (around line 490) calls:

```typescript
onClick={handleCreateNewFile}
```

Where `handleCreateNewFile` does:
```typescript
createTrainingFileMutation.mutate({
  name: newFileName.trim(),
  description: newFileDescription.trim() || undefined,
  conversation_ids: selectedConversationIds,
});
```

**Replace the body of `handleCreateNewFile` with:**

```typescript
const handleCreateNewFile = () => {
  if (workbaseId) {
    createTrainingSetMutation.mutate({
      name: newFileName.trim(),
      conversationIds: selectedConversationIds,
    });
  } else {
    createTrainingFileMutation.mutate({
      name: newFileName.trim(),
      description: newFileDescription.trim() || undefined,
      conversation_ids: selectedConversationIds,
    });
  }
};
```

> **Finding the existing function:** Search for `handleCreateNewFile` in `ConversationTable.tsx`. It is likely an inline function or a `const` around line 200-210. Locate it and replace its body with the conditional above.

**Change E — Update the bulk action button label and conditionally hide "Add to Existing" when in workbase mode:**

In the bulk selection bar (around line 392-440), make these changes:

1. Change the button label: When `workbaseId` is set, the button should say **"Build Training Set"** instead of "Create Training Files".

2. When `workbaseId` is set, hide the "Existing Files" dropdown section (the legacy "Add to existing training file" makes no sense in workbase flow — training sets are workbase-scoped).

Find the button text (approximately line 403):
```tsx
                Create Training Files
```
Replace with:
```tsx
                {workbaseId ? 'Build Training Set' : 'Create Training Files'}
```

Find the existing files dropdown section (around line 408-432 — the `{trainingFiles && trainingFiles.length > 0 && (` block). Wrap it in a condition:

```tsx
              {!workbaseId && trainingFiles && trainingFiles.length > 0 && (
                // ... existing "Existing Files" dropdown items ...
              )}
```

**Change F — Update dialog labels when in workbase mode:**

In the Dialog for creating a new file (around line 446-500):

Change the `DialogTitle`:
```tsx
<DialogTitle>{workbaseId ? 'Build Training Set' : 'Create New Training File'}</DialogTitle>
```

Change the `DialogDescription`:
```tsx
<DialogDescription>
  {workbaseId
    ? `Build a training set from ${selectedConversationIds.length} selected conversations`
    : `Create a new LoRA training file with ${selectedConversationIds.length} selected conversations`}
</DialogDescription>
```

Change the submit button text:
```tsx
{(workbaseId ? createTrainingSetMutation.isPending : createTrainingFileMutation.isPending) ? 'Building...' : (workbaseId ? 'Build Training Set' : 'Create Training File')}
```

And update the `disabled` prop:
```tsx
disabled={(workbaseId ? createTrainingSetMutation.isPending : createTrainingFileMutation.isPending) || !newFileName.trim()}
```

**Change G — Hide description field when in workbase mode:**

The training sets API does not accept a description field. Wrap the description `<Textarea>` section (around line 470-478) in:
```tsx
{!workbaseId && (
  <div>
    <Label htmlFor="description">Description (optional)</Label>
    <Textarea ... />
  </div>
)}
```

### 4.2 — Pass `workbaseId` from Workbase Conversations Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

**Change:** Find where `<ConversationTable>` is rendered and add the `workbaseId` prop.

Find the JSX (search for `<ConversationTable`):
```tsx
<ConversationTable
  conversations={transformedConversations}
  isLoading={isLoading}
  compactActions={true}
/>
```

**Replace with:**
```tsx
<ConversationTable
  conversations={transformedConversations}
  isLoading={isLoading}
  compactActions={true}
  workbaseId={workbaseId}
/>
```

Where `workbaseId` is already available as a `const` from `useParams()` at the top of the component.

**Critical:** The legacy conversations page (`src/app/(dashboard)/conversations/page.tsx`) does NOT pass `workbaseId` — this is intentional. The legacy page continues to call the legacy API.

---

## 5. Phase 3: Complete Launch Tuning Page

### 5.1 — Add `workbaseId` Parameter to Pipeline Job Creation

**File:** `src/types/pipeline.ts`

**Change:** Add optional `workbaseId` to `CreatePipelineJobRequest` (around line 250).

**Current:**
```typescript
export interface CreatePipelineJobRequest {
  jobName: string;
  datasetId: string;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  gpuType?: string;
  gpuCount?: number;
}
```

**Replace with:**
```typescript
export interface CreatePipelineJobRequest {
  jobName: string;
  datasetId: string;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  gpuType?: string;
  gpuCount?: number;
  workbaseId?: string;
}
```

### 5.2 — Pass `workbaseId` Through to DB Insert

**File:** `src/lib/services/pipeline-service.ts`

In the `createPipelineJob` function (around line 76-135), the `.insert({...})` call currently does not include `workbase_id`.

Find the insert object (around line 100):
```typescript
      .insert({
        user_id: userId,
        job_name: request.jobName,
        status: 'pending',
        ...
        gpu_count: request.gpuCount || 1,
        estimated_cost: costEstimate.totalCost,
      })
```

**Add this field to the insert object:**
```typescript
        workbase_id: request.workbaseId || null,
```

Place it after the `user_id` line for clarity:
```typescript
      .insert({
        user_id: userId,
        workbase_id: request.workbaseId || null,
        job_name: request.jobName,
        ...
```

### 5.3 — Add Workbase Filter to `usePipelineJobs` Hook

**File:** `src/hooks/usePipelineJobs.ts`

**Change A — Update the `fetchPipelineJobs` function to accept `workbaseId`:**

**Current (around line 33):**
```typescript
async function fetchPipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}): Promise<PipelineJobListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.status) params.set('status', options.status);
  
  const response = await fetch(`/api/pipeline/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch pipeline jobs');
  return response.json();
}
```

**Replace with:**
```typescript
async function fetchPipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
  workbaseId?: string;
}): Promise<PipelineJobListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.status) params.set('status', options.status);
  if (options?.workbaseId) params.set('workbaseId', options.workbaseId);
  
  const response = await fetch(`/api/pipeline/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch pipeline jobs');
  return response.json();
}
```

**Change B — Update the `usePipelineJobs` hook signature:**

**Current (around line 107):**
```typescript
export function usePipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}) {
```

**Replace with:**
```typescript
export function usePipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
  workbaseId?: string;
}) {
```

### 5.4 — Add Server-Side `workbaseId` Filter to Pipeline Jobs API

**File:** `src/app/api/pipeline/jobs/route.ts`

In the GET handler, add parsing of the `workbaseId` query param and pass it through to `listPipelineJobs`.

**Current GET handler (around line 16-20):**
```typescript
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    
    const result = await listPipelineJobs(user.id, { 
      limit, 
      offset, 
      status: status as any 
    });
```

**Replace with:**
```typescript
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    const workbaseId = searchParams.get('workbaseId') || undefined;
    
    const result = await listPipelineJobs(user.id, { 
      limit, 
      offset, 
      status: status as any,
      workbaseId,
    });
```

**File:** `src/lib/services/pipeline-service.ts`

Update `listPipelineJobs` function signature and query (around line 174):

**Current:**
```typescript
export async function listPipelineJobs(
  userId: string,
  options?: { limit?: number; offset?: number; status?: PipelineJobStatus }
): Promise<{ success: boolean; data?: PipelineTrainingJob[]; count?: number; error?: string }> {
```

**Replace with:**
```typescript
export async function listPipelineJobs(
  userId: string,
  options?: { limit?: number; offset?: number; status?: PipelineJobStatus; workbaseId?: string }
): Promise<{ success: boolean; data?: PipelineTrainingJob[]; count?: number; error?: string }> {
```

And add the filter to the query builder (after the `.eq('user_id', userId)` line, around line 185):

**Current block:**
```typescript
    if (options?.status) {
      query = query.eq('status', options.status);
    }
```

**Add after that block:**
```typescript
    if (options?.workbaseId) {
      query = query.eq('workbase_id', options.workbaseId);
    }
```

### 5.5 — Rewrite Launch Tuning Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

**Complete replacement.** This page goes from a scaffold with TODO placeholders to a fully functional Launch Tuning page with:
- Section A: Training Input (auto-selects latest ready training set)
- Section B: Training Settings (3 lay-person sliders using existing `TrainingParameterSlider`)
- Section C: Cost & Launch (using existing `CostEstimateCard` + "Train & Publish" button)
- Section D: Adapter History (workbase-scoped pipeline jobs)
- Inline progress display when a job is running

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { useTrainingSets } from '@/hooks/useTrainingSets';
import { usePipelineJobs, usePipelineJob, useCreatePipelineJob } from '@/hooks/usePipelineJobs';
import { usePipelineStore } from '@/stores/pipelineStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrainingParameterSlider } from '@/components/pipeline/TrainingParameterSlider';
import { CostEstimateCard } from '@/components/pipeline/CostEstimateCard';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Rocket,
  FileJson,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  SENSITIVITY_OPTIONS,
  PROGRESSION_OPTIONS,
  REPETITION_OPTIONS,
} from '@/types/pipeline';
import type { TrainingSet } from '@/types/workbase';
import type { TrainingSensitivity, TrainingProgression, TrainingRepetition } from '@/types/pipeline';

// Tooltip content for lay-person sliders (same as legacy /pipeline/configure)
const SENSITIVITY_TOOLTIP = {
  explanation: 'Controls how quickly your AI adapts to your training examples.',
  lowImpact: 'Slower learning, very stable. Good for refining existing behavior.',
  highImpact: 'Faster learning, more reactive. Good for teaching new behaviors.',
  technicalNote: 'Maps to learning rate (0.00001 - 0.001)',
};

const PROGRESSION_TOOLTIP = {
  explanation: 'Controls how deeply the AI analyzes each example before moving on.',
  lowImpact: 'More thorough analysis per example, slower overall. Best for complex conversations.',
  highImpact: 'Broader pattern recognition, faster overall. Best for varied training data.',
  technicalNote: 'Maps to batch size (2 - 16)',
};

const REPETITION_TOOLTIP = {
  explanation: 'How many times the AI reviews all your training examples.',
  lowImpact: 'Quick training, good for testing. May not fully learn patterns.',
  highImpact: 'Thorough training, better retention. Takes longer and costs more.',
  technicalNote: 'Maps directly to training epochs',
};

const JOB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  queued: { label: 'Queued', color: 'bg-yellow-100 text-yellow-700' },
  initializing: { label: 'Initializing', color: 'bg-blue-100 text-blue-700' },
  running: { label: 'Training', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

export default function LaunchTuningPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  // Data fetching
  const { data: workbase } = useWorkbase(workbaseId);
  const { data: trainingSets = [] } = useTrainingSets(workbaseId);
  const { data: jobsData } = usePipelineJobs({ limit: 20, workbaseId });

  // Local state
  const [selectedTrainingSetId, setSelectedTrainingSetId] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [trainingSensitivity, setTrainingSensitivity] = useState<TrainingSensitivity>('medium');
  const [trainingProgression, setTrainingProgression] = useState<TrainingProgression>('medium');
  const [trainingRepetition, setTrainingRepetition] = useState<TrainingRepetition>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createJob = useCreatePipelineJob();

  // Poll active job for inline progress
  const { data: activeJobData } = usePipelineJob(activeJobId);
  const activeJob = activeJobData?.data || null;

  // Derived data
  const hasAdapter = !!workbase?.activeAdapterJobId;
  const readySets = trainingSets.filter((ts: TrainingSet) => ts.status === 'ready');
  const recentJobs = (jobsData as any)?.data || [];

  // Auto-select latest ready training set
  const selectedSet = useMemo(() => {
    if (selectedTrainingSetId) {
      return readySets.find((ts: TrainingSet) => ts.id === selectedTrainingSetId) || null;
    }
    return readySets.length > 0 ? readySets[0] : null;
  }, [selectedTrainingSetId, readySets]);

  // Cost estimate (reuses the same utility as legacy configure page)
  const costEstimate = useMemo(() => {
    const { estimateTrainingCost } = require('@/lib/pipeline/hyperparameter-utils');
    return estimateTrainingCost({ trainingSensitivity, trainingProgression, trainingRepetition });
  }, [trainingSensitivity, trainingProgression, trainingRepetition]);

  const isValid = !!selectedSet?.datasetId && jobName.trim().length > 0;

  // Handle job submission
  const handleTrainAndPublish = async () => {
    if (!isValid || !selectedSet?.datasetId) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createJob.mutateAsync({
        jobName: jobName.trim(),
        datasetId: selectedSet.datasetId,
        trainingSensitivity,
        trainingProgression,
        trainingRepetition,
        workbaseId,
      });

      if (result.success && result.data) {
        setActiveJobId(result.data.id);
        setJobName('');
      } else {
        setSubmitError((result as any).error || 'Failed to start training job.');
      }
    } catch (error: any) {
      console.error('Failed to create job:', error);
      setSubmitError(error?.message || 'Failed to start training job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there's an active (non-terminal) job
  const isActiveJobRunning = activeJob && ['pending', 'queued', 'initializing', 'running'].includes(activeJob.status);
  const isActiveJobComplete = activeJob && activeJob.status === 'completed';
  const isActiveJobFailed = activeJob && activeJob.status === 'failed';

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <span
          className="cursor-pointer hover:text-foreground"
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
        >
          Conversations
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className="text-duck-blue font-medium">Launch Tuning</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">Launch Tuning</h1>

      {/* Adapter Status Banner */}
      <div className="mb-6 p-3 rounded-md bg-muted border border-border">
        <div className="flex items-center gap-3">
          <Badge variant={hasAdapter ? 'default' : 'secondary'}>
            {hasAdapter ? 'Live' : 'Not Launched'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {hasAdapter
              ? 'Your adapter is deployed and active.'
              : 'No adapter launched yet. Configure and train below.'}
          </span>
        </div>
      </div>

      {readySets.length === 0 ? (
        /* Empty state — no ready training sets */
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Build a Training Set from your conversations first.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
            >
              Go to Conversations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section A: Training Input */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-duck-blue" />
                  Training Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readySets.length === 1 ? (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium text-foreground">{selectedSet?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSet?.conversationCount} conversations · {selectedSet?.trainingPairCount} training pairs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Training Set</Label>
                    <Select
                      value={selectedSet?.id || ''}
                      onValueChange={(id) => setSelectedTrainingSetId(id)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a training set" />
                      </SelectTrigger>
                      <SelectContent>
                        {readySets.map((ts: TrainingSet) => (
                          <SelectItem key={ts.id} value={ts.id}>
                            {ts.name} ({ts.conversationCount} convos, {ts.trainingPairCount} pairs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedSet && !selectedSet.datasetId && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This training set has no associated dataset. It may still be processing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Section B: Training Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Training Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Job Name */}
                <div className="space-y-2">
                  <Label htmlFor="jobName">Training Job Name</Label>
                  <Input
                    id="jobName"
                    placeholder="e.g., Emotional Intelligence v1.0"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </div>

                {/* Sliders */}
                <TrainingParameterSlider
                  id="sensitivity"
                  label="Training Sensitivity"
                  description="How quickly your AI learns from examples"
                  tooltipContent={SENSITIVITY_TOOLTIP}
                  options={SENSITIVITY_OPTIONS}
                  value={trainingSensitivity}
                  onChange={(v) => setTrainingSensitivity(v as TrainingSensitivity)}
                />

                <TrainingParameterSlider
                  id="progression"
                  label="Training Progression"
                  description="How deeply each example is analyzed"
                  tooltipContent={PROGRESSION_TOOLTIP}
                  options={PROGRESSION_OPTIONS}
                  value={trainingProgression}
                  onChange={(v) => setTrainingProgression(v as TrainingProgression)}
                />

                <TrainingParameterSlider
                  id="repetition"
                  label="Training Repetition"
                  description="How many times all examples are reviewed"
                  tooltipContent={REPETITION_TOOLTIP}
                  options={REPETITION_OPTIONS}
                  value={trainingRepetition}
                  onChange={(v) => setTrainingRepetition(v as TrainingRepetition)}
                />
              </CardContent>
            </Card>

            {/* Inline Progress (when job is active) */}
            {activeJob && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    {isActiveJobRunning && <Loader2 className="h-5 w-5 animate-spin text-duck-blue" />}
                    {isActiveJobComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {isActiveJobFailed && <AlertCircle className="h-5 w-5 text-red-600" />}
                    Training Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground font-medium">{activeJob.jobName}</span>
                    <Badge className={JOB_STATUS_LABELS[activeJob.status]?.color || 'bg-gray-100 text-gray-700'}>
                      {JOB_STATUS_LABELS[activeJob.status]?.label || activeJob.status}
                    </Badge>
                  </div>

                  {isActiveJobRunning && (
                    <>
                      <Progress value={activeJob.progress || 0} className="h-2" />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress</span>
                          <p className="font-medium text-foreground">{activeJob.progress || 0}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Epoch</span>
                          <p className="font-medium text-foreground">{activeJob.currentEpoch || 0}/{activeJob.trainingRepetition || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Loss</span>
                          <p className="font-medium text-foreground">{activeJob.currentLoss?.toFixed(4) || '-'}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {isActiveJobComplete && (
                    <div className="p-4 bg-green-50 rounded-md border border-green-200">
                      <p className="text-sm text-green-800 font-medium">
                        Adapter trained and deployed successfully!
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/chat`)}
                      >
                        Open Behavior Chat
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </div>
                  )}

                  {isActiveJobFailed && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {activeJob.errorMessage || 'Training failed. Please try again.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section D: Adapter History */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Adapter History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Past adapter launches will appear here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentJobs.map((job: any) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div>
                          <span className="text-sm text-foreground font-medium">
                            {job.jobName || job.id.slice(0, 8)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(job.createdAt).toLocaleDateString()} · 
                            {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
                          </p>
                        </div>
                        <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-gray-100 text-gray-700'}>
                          {JOB_STATUS_LABELS[job.status]?.label || job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Cost & Launch */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Section C: Cost Estimate */}
              <CostEstimateCard
                computeCost={costEstimate.computeCost}
                evaluationCost={costEstimate.evaluationCost}
                totalCost={costEstimate.totalCost}
                estimatedDuration={costEstimate.estimatedDuration}
              />

              {/* Train & Publish Button */}
              <Button
                size="lg"
                className="w-full"
                disabled={!isValid || isSubmitting || !!isActiveJobRunning}
                onClick={handleTrainAndPublish}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : isActiveJobRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Training in Progress
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Train &amp; Publish
                  </>
                )}
              </Button>

              {!isValid && !isActiveJobRunning && (
                <p className="text-sm text-muted-foreground text-center">
                  {!selectedSet?.datasetId
                    ? 'Waiting for training set to finish processing...'
                    : 'Enter a job name to continue'}
                </p>
              )}

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Implementation Sequence & Dependencies

Execute phases in strict order. Each phase depends on the previous.

```
Phase 1 (Foundation)
  1.1  DDL: Add dataset_id column (SAOL)          ← no code dependency
  1.2  Rewrite buildTrainingSet Inngest function   ← depends on 1.1
  1.3  Update TrainingSet type                     ← depends on 1.1
  1.4  Update training-sets API route mapper       ← depends on 1.3
       
Phase 2 (ConversationTable)
  2.1  Add workbaseId prop to ConversationTable    ← depends on Phase 1 (API exists)
  2.2  Pass prop from workbase conversations page  ← depends on 2.1

Phase 3 (Launch Page)
  3.1  Add workbaseId to CreatePipelineJobRequest  ← no dependency
  3.2  Pass workbaseId through pipeline-service    ← depends on 3.1
  3.3  Add workbaseId filter to usePipelineJobs    ← no dependency
  3.4  Add server-side workbaseId filter           ← depends on 3.3
  3.5  Rewrite Launch Tuning page                  ← depends on 3.1-3.4 + Phase 1 + Phase 2
```

**Build & deploy after all 3 phases.** Run `npm run build` to verify no TypeScript errors. Push to git → Vercel auto-deploys.

---

## 7. Acceptance Criteria

### Phase 1 Verification

| # | Test | Expected |
|---|------|----------|
| P1-1 | SAOL: `agentIntrospectSchema({ table: 'training_sets' })` | Shows `dataset_id` column (uuid, nullable) |
| P1-2 | On workbase conversations page, select enriched conversations → "Build Training Set" → Check Inngest dashboard | `training/set.created` event fires → `build-training-set` function runs → completes |
| P1-3 | SAOL: Query `training_sets` for the new record | `status: 'ready'`, `jsonl_path` populated, `dataset_id` populated (not null) |
| P1-4 | SAOL: Query `datasets` for the auto-created record | `training_ready: true`, `format: 'brightrun_lora_v4'`, `storage_path` matches training file JSONL |
| P1-5 | SAOL: Query `training_files` for the side-effect record | New record exists with matching name, correct `conversation_count` and `total_training_pairs` |
| P1-6 | Download the JSONL from Storage and inspect first data line | Must contain `system_prompt`, `conversation_history`, `emotional_context`, `target_response`, `training_metadata` (v4 format — NOT `{ messages: [...] }`) |

### Phase 2 Verification

| # | Test | Expected |
|---|------|----------|
| P2-1 | Workbase conversations page: select conversations → bulk action button | Shows "Build Training Set" (NOT "Create Training Files") |
| P2-2 | Click "Build Training Set" → fill name → submit | Calls `POST /api/workbases/[id]/training-sets` (check Network tab), NOT `/api/training-files` |
| P2-3 | Legacy `/conversations` page: same action | Still shows "Create Training Files", calls `POST /api/training-files` (unchanged) |
| P2-4 | Workbase "Build Training Set" dialog | No description field shown. Dialog title says "Build Training Set". |

### Phase 3 Verification

| # | Test | Expected |
|---|------|----------|
| P3-1 | Navigate to `/workbase/[id]/fine-tuning/launch` with a ready training set | Shows training input card with set name, conversation count, pair count |
| P3-2 | 3 sliders visible and functional | Sensitivity, Progression, Repetition sliders render and respond to interaction |
| P3-3 | Cost estimate card updates when sliders change | Cost recalculates in real-time |
| P3-4 | Enter job name + click "Train & Publish" | `POST /api/pipeline/jobs` fires with `workbaseId` in body. Check Network tab. |
| P3-5 | SAOL: Query `pipeline_training_jobs` for the new job | `workbase_id` is populated (not null) |
| P3-6 | After job starts, inline progress card appears | Shows status badge, progress bar, epoch, loss metrics (polls every 5s) |
| P3-7 | Adapter History section | Shows only jobs for this workbase (not all global jobs) |
| P3-8 | No training set ready → empty state | Shows "Build a Training Set from your conversations first" with CTA |

---

## 8. Files Modified Summary

| # | File | Change Type | Phase |
|---|------|------------|-------|
| 1 | `training_sets` table (via SAOL DDL) | Add `dataset_id UUID` column | 1 |
| 2 | `src/inngest/functions/build-training-set.ts` | **Full rewrite** — v4 JSONL + auto-create dataset | 1 |
| 3 | `src/types/workbase.ts` | Add `datasetId` field to `TrainingSet` interface | 1 |
| 4 | `src/app/api/workbases/[id]/training-sets/route.ts` | Add `datasetId` to GET/POST response mappers | 1 |
| 5 | `src/components/conversations/ConversationTable.tsx` | Add `workbaseId` prop, conditional API routing, label updates | 2 |
| 6 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Pass `workbaseId` to `<ConversationTable>` | 2 |
| 7 | `src/types/pipeline.ts` | Add `workbaseId?` to `CreatePipelineJobRequest` | 3 |
| 8 | `src/lib/services/pipeline-service.ts` | Pass `workbase_id` in job insert; add `workbaseId` filter to `listPipelineJobs` | 3 |
| 9 | `src/hooks/usePipelineJobs.ts` | Add `workbaseId` param to `fetchPipelineJobs` and `usePipelineJobs` | 3 |
| 10 | `src/app/api/pipeline/jobs/route.ts` | Parse `workbaseId` query param, pass to `listPipelineJobs` | 3 |
| 11 | `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | **Full rewrite** — sliders, cost, job creation, progress, history | 3 |

**Files NOT modified (preserved as-is):**
- `src/app/(dashboard)/conversations/page.tsx` — legacy page, unchanged
- `src/app/(dashboard)/pipeline/configure/page.tsx` — legacy configure, unchanged
- `src/lib/services/training-file-service.ts` — gold-standard service, called by new `buildTrainingSet` but not modified
- `src/inngest/functions/index.ts` — already imports `buildTrainingSet`, no change needed
- `src/inngest/client.ts` — already has `training/set.created` event type defined
