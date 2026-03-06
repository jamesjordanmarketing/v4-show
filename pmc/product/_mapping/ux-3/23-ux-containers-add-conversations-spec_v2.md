# Spec 23: Fix "Add Conversations to Existing Training Set" in Workbase UX

**Version:** 2.0  
**Date:** 2026-03-03  
**Status:** Ready for Implementation  
**Supersedes:** `23-ux-containers-add-conversations-spec_v1.md`

---

## Changes from v1

| # | Change | Reason |
|---|--------|--------|
| **C-1** | Fixed critical URL mismatch in `addToTrainingSetMutation` | v1 called `/add-conversations` suffix that doesn't exist; the PATCH handler lives at `[tsId]/route.ts`, so the correct URL is `/api/workbases/${workbaseId}/training-sets/${trainingSetId}` with no suffix |
| **C-2** | Updated precise line numbers in `ConversationTable.tsx` to match actual file | v1 was off by 1 in several places; confirmed by reading the actual file |
| **C-3** | Updated `rebuild-training-set.ts` to exactly mirror `build-training-set.ts` patterns | Step naming, dataset insert pattern, error handling now identical to the proven existing function |
| **C-4** | Removed v1's conditional dataset update branch in the Inngest function | The existing `build-training-set.ts` always inserts a new dataset; keeping rebuild consistent avoids a code path that queried by `trainingSet.dataset_id`. The PATCH handler already calls this, so always inserting is the correct and simpler pattern. |
| **C-5** | Confirmed `conversations.workbase_id` column exists — no changes needed | Verified in `/api/conversations/route.ts` and `/api/conversations/generate/route.ts` |
| **C-6** | Note: Spec 22 was applied in the same session — no file conflicts with Spec 23 | Spec 22 touched `auto-deploy-adapter.ts`, `types/workbase.ts`, `api/workbases/[id]/route.ts`, and `chat/page.tsx` — none overlap with Spec 23 files |

---

## Agent Instructions

**Before starting any work, you MUST:**
1. Read this entire document — it contains pre-verified facts and explicit instructions
2. Read each file listed in the "Files Modified" section to confirm current content before editing
3. Execute the instructions and specifications as written — do not re-investigate what has already been verified

---

## Platform Background

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application for AI training data generation.

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| Storage | Supabase Storage |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query (React Query v5) |
| Background Jobs | Inngest |
| DB Operations | SAOL (`supa-agent-ops/`) — mandatory for agent-driven DB ops only |

**Design Token Rules — STRICT. All new/modified code MUST use:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary`, `text-primary-foreground`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` in new or modified code**

**Key Route Structure:**
- Workbase pages live under `/workbase/[id]/`
- Conversations page: `/workbase/[id]/fine-tuning/conversations`
- Workbase ID (`params.id`) scopes all data to that workbase

**Two Training Systems (both exist in codebase):**

| System | Table | API Route | Purpose |
|--------|-------|-----------|---------|
| Legacy | `training_files` | `/api/training-files` | Account-wide, pre-workbase |
| New (Workbase) | `training_sets` | `/api/workbases/[id]/training-sets` | Workbase-scoped, Inngest-driven |

The new workbase flow exclusively uses `training_sets`. The workbase UX must ONLY reference the `training_sets` system.

---

## Problem Statement

On the `/workbase/[id]/fine-tuning/conversations` page, users can select conversations and click "Build Training Set." The dropdown that appears shows only "Build New Training Set" — but **the option to add selected conversations to an existing training set is completely missing in the workbase flow**.

In v2 of the UX, users could select conversations and add them to any already-created JSON training file to build large adapter files. This critical functionality is broken in the new workbase UX.

---

## Root Cause Analysis — 5 Confirmed Bugs

All bugs were verified by reading the codebase. The relevant files are:
- `src/components/conversations/ConversationTable.tsx`
- `src/app/api/workbases/[id]/training-sets/route.ts`
- `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`
- `src/inngest/functions/build-training-set.ts`

### Bug 1: Wrong Data Source for Training Files in Workbase Mode

**Location:** `src/components/conversations/ConversationTable.tsx`, lines 116–126

**Code (confirmed):**
```typescript
// Fetch training files for dropdown
const { data: trainingFiles } = useQuery({
  queryKey: ['training-files'],
  queryFn: async () => {
    const response = await fetch('/api/training-files');  // ← WRONG ENDPOINT
    if (!response.ok) throw new Error('Failed to fetch training files');
    const json = await response.json();
    return json.files;
  },
  enabled: selectedConversationIds.length > 0,
});
```

**Problem:** This always fetches from `/api/training-files` (the legacy `training_files` table). When `workbaseId` is set, it should fetch from `/api/workbases/${workbaseId}/training-sets` (the `training_sets` table).

---

### Bug 2: Existing Training Sets are Intentionally Hidden in Workbase Mode

**Location:** `src/components/conversations/ConversationTable.tsx`, line 458

**Code (confirmed):**
```typescript
{!workbaseId && trainingFiles && trainingFiles.length > 0 && (
  // Existing Files section — completely hidden when workbaseId is set
)}
```

**Problem:** The `!workbaseId` guard removes the entire "Existing Files" section from the dropdown when in workbase context. Even if data was correctly fetched, it would never be rendered.

---

### Bug 3: No API Endpoint to Add Conversations to an Existing Training Set

**Location:** `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`

**Current state:** Only a `DELETE` handler exists. There is no `PATCH` handler.

**Problem:** There is no backend route to add conversations to an existing `training_sets` record. The legacy `training_files` system has `/api/training-files/[id]/add-conversations`, but no equivalent exists for `training_sets`.

---

### Bug 4: The `addToTrainingFileMutation` Always Uses the Legacy Endpoint

**Location:** `src/components/conversations/ConversationTable.tsx`, lines 200–231

**Code (confirmed):**
```typescript
const addToTrainingFileMutation = useMutation({
  mutationFn: async ({ training_file_id, conversation_ids }) => {
    const response = await fetch(
      `/api/training-files/${training_file_id}/add-conversations`,  // ← LEGACY ONLY
      ...
    );
  },
});
```

**Problem:** Even if the correct training sets were shown in the dropdown, clicking one would call the legacy `training_files` endpoint, not the workbase `training_sets` endpoint.

---

### Bug 5: No Inngest Function to Rebuild a Training Set When Conversations Are Added

**Location:** `src/inngest/functions/` — no file handles `training/set.updated` event

**Problem:** The `build-training-set.ts` Inngest function handles `training/set.created`. When conversations are added to an existing training set, the JSONL must be regenerated. There is no Inngest function for this rebuild flow.

---

## Fix Architecture

### Overview of Changes

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `src/components/conversations/ConversationTable.tsx` | Modify | Fetch workbase training sets when `workbaseId` is set; show them in dropdown; wire correct mutation |
| 2 | `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` | Modify | Add `PATCH` handler to add conversations to existing training set |
| 3 | `src/inngest/functions/rebuild-training-set.ts` | Create | New Inngest function for `training/set.updated` event |
| 4 | `src/inngest/functions/index.ts` | Modify | Register new Inngest function |

---

## Detailed Implementation

---

### Fix 1: Update `ConversationTable.tsx`

**File:** `src/components/conversations/ConversationTable.tsx`

Read this file before editing. It has 720 lines. The relevant sections are at the exact lines cited below.

#### 1a — Replace training files query with a conditional dual-query

**Current code (lines 116–126):**
```typescript
  // Fetch training files for dropdown
  const { data: trainingFiles } = useQuery({
    queryKey: ['training-files'],
    queryFn: async () => {
      const response = await fetch('/api/training-files');
      if (!response.ok) throw new Error('Failed to fetch training files');
      const json = await response.json();
      return json.files;
    },
    enabled: selectedConversationIds.length > 0,
  });
```

**Replace with:**
```typescript
  // Fetch training files/sets for dropdown — workbase mode uses training_sets; legacy uses training_files
  const { data: trainingFiles } = useQuery({
    queryKey: workbaseId ? ['training-sets', workbaseId] : ['training-files'],
    queryFn: async () => {
      if (workbaseId) {
        // Workbase mode: fetch workbase-scoped training sets
        const response = await fetch(`/api/workbases/${workbaseId}/training-sets`);
        if (!response.ok) throw new Error('Failed to fetch training sets');
        const json = await response.json();
        // Normalize to a common shape: { id, name, conversation_count, status }
        return (json.data || []).map((ts: any) => ({
          id: ts.id,
          name: ts.name,
          conversation_count: ts.conversationCount,
          status: ts.status,
        }));
      } else {
        // Legacy mode: fetch account-wide training files
        const response = await fetch('/api/training-files');
        if (!response.ok) throw new Error('Failed to fetch training files');
        const json = await response.json();
        return json.files;
      }
    },
    enabled: selectedConversationIds.length > 0,
  });
```

#### 1b — Add new `addToTrainingSetMutation` for workbase mode

Add this mutation **immediately after** the closing `});` of the `addToTrainingFileMutation` block (after line 231):

```typescript
  // Add conversations to an existing workbase training set (new flow)
  const addToTrainingSetMutation = useMutation({
    mutationFn: async ({
      trainingSetId,
      conversationIds,
    }: {
      trainingSetId: string;
      conversationIds: string[];
    }) => {
      const response = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${trainingSetId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add conversations to training set');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Conversations added. Training set is rebuilding — check Launch Tuning for status.');
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
      clearSelection();
      setSelectedTrainingFileId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
```

> **URL note:** The mutation calls `PATCH /api/workbases/${workbaseId}/training-sets/${trainingSetId}` — this matches exactly where the PATCH handler lives in `[tsId]/route.ts`. There is no `/add-conversations` suffix.

#### 1c — Update `handleAddToExistingFile` to dispatch the correct mutation

**Current code (lines 380–390, confirmed):**
```typescript
  const handleAddToExistingFile = (fileId: string) => {
    if (selectedConversationIds.length === 0) {
      toast.error('No conversations selected');
      return;
    }
    
    addToTrainingFileMutation.mutate({
      training_file_id: fileId,
      conversation_ids: selectedConversationIds,
    });
  };
```

**Replace with:**
```typescript
  const handleAddToExistingFile = (fileId: string) => {
    if (selectedConversationIds.length === 0) {
      toast.error('No conversations selected');
      return;
    }

    if (workbaseId) {
      // Workbase mode: add to existing training set via PATCH
      addToTrainingSetMutation.mutate({
        trainingSetId: fileId,
        conversationIds: selectedConversationIds,
      });
    } else {
      // Legacy mode: add to existing training file
      addToTrainingFileMutation.mutate({
        training_file_id: fileId,
        conversation_ids: selectedConversationIds,
      });
    }
  };
```

#### 1d — Fix the dropdown to show existing training sets in workbase mode

**Current code (lines 458–480, confirmed):**
```typescript
              {!workbaseId && trainingFiles && trainingFiles.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Existing Files
                  </DropdownMenuLabel>
                  {trainingFiles.map((file: any) => (
                    <DropdownMenuItem
                      key={file.id}
                      onClick={() => handleAddToExistingFile(file.id)}
                      disabled={addToTrainingFileMutation.isPending}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.conversation_count} conversations
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
```

**Replace with:**
```typescript
              {trainingFiles && trainingFiles.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {workbaseId ? 'Add to Existing Training Set' : 'Existing Files'}
                  </DropdownMenuLabel>
                  {trainingFiles.map((file: any) => (
                    <DropdownMenuItem
                      key={file.id}
                      onClick={() => handleAddToExistingFile(file.id)}
                      disabled={
                        workbaseId
                          ? addToTrainingSetMutation.isPending
                          : addToTrainingFileMutation.isPending
                      }
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.conversation_count} conversation{file.conversation_count !== 1 ? 's' : ''}
                          {workbaseId && file.status && (
                            <span className="ml-1">· {file.status}</span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
```

---

### Fix 2: Add `PATCH` Handler to Training Sets Route

**File:** `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`

**Current state (confirmed):** This file has only a `DELETE` handler and two imports:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
```

Add the `inngest` import at the top of the file (after the existing two imports) and then add the `PATCH` handler after the `DELETE` export.

**Full file after changes:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIds } = body;

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIds array is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch the existing training set
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, conversation_ids, conversation_count, status')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  // Validate that new conversations belong to this workbase
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('workbase_id', params.id);

  if (convErr || !convs || convs.length !== conversationIds.length) {
    return NextResponse.json(
      { success: false, error: 'One or more conversations not found in this workbase' },
      { status: 400 }
    );
  }

  // Deduplicate: only add IDs not already in the set
  const existingIds: string[] = ts.conversation_ids || [];
  const newIds = conversationIds.filter((id: string) => !existingIds.includes(id));

  if (newIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'All selected conversations are already in this training set' },
      { status: 400 }
    );
  }

  const mergedIds = [...existingIds, ...newIds];

  // Update the training set — reset to 'processing' so Inngest will rebuild the JSONL
  const { data: updated, error: updateErr } = await supabase
    .from('training_sets')
    .update({
      conversation_ids: mergedIds,
      conversation_count: mergedIds.length,
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.tsId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  // Trigger async JSONL rebuild via Inngest
  await inngest.send({
    name: 'training/set.updated',
    data: {
      trainingSetId: params.tsId,
      workbaseId: params.id,
      conversationIds: mergedIds,
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      workbaseId: updated.workbase_id,
      name: updated.name,
      conversationCount: updated.conversation_count,
      status: updated.status,
      addedCount: newIds.length,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Delete the training set (ownership enforced by user_id filter)
  const { error } = await supabase
    .from('training_sets')
    .delete()
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

---

### Fix 3: Create New Inngest Function `rebuild-training-set.ts`

**File to create:** `src/inngest/functions/rebuild-training-set.ts`

This function is structurally identical to `build-training-set.ts` — it reuses the same `createTrainingFileService` pattern and step structure. The only differences are:
- It listens to `training/set.updated` (not `training/set.created`)
- Step 1 also selects `dataset_id` (to link the rebuilt JSONL to the existing dataset record if one exists)
- The dataset step uses `upsert` — updating the existing `datasets` record when the training set already has a `dataset_id`, or inserting a new one otherwise

```typescript
import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { createTrainingFileService } from '@/lib/services/training-file-service';

/**
 * Rebuild Training Set JSONL (v4 Format)
 *
 * Triggered when conversations are added to an existing training_sets row
 * (PATCH /api/workbases/[id]/training-sets/[tsId] resets status to 'processing'
 * and emits this event).
 *
 * Steps:
 *   1. Fetch the training set (name + current dataset_id for upsert)
 *   2. Use TrainingFileService to regenerate Full Training JSON + v4 JSONL from all conversation IDs
 *   3. Upsert the datasets record — update if dataset_id already exists, insert if new
 *   4. Update training_sets record to status: 'ready' with new jsonl_path, dataset_id, training_pair_count
 */
export const rebuildTrainingSet = inngest.createFunction(
  {
    id: 'rebuild-training-set',
    name: 'Rebuild Training Set JSONL (v4 Format)',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'training/set.updated' },
  async ({ event, step }) => {
    const { trainingSetId, workbaseId, conversationIds, userId } = event.data;

    // Step 1: Fetch the training set record for its name and current dataset_id
    const trainingSet = await step.run('fetch-training-set', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('training_sets')
        .select('id, name, dataset_id')
        .eq('id', trainingSetId)
        .single();
      if (error || !data) throw new Error(`Training set not found: ${trainingSetId}`);
      return data;
    });

    // Step 2: Rebuild the training file using TrainingFileService
    //   createTrainingFile() handles: validate → fetch enriched JSONs → aggregate → JSONL → upload → DB record
    const trainingFile = await step.run('rebuild-training-file-v4', async () => {
      const supabase = createServerSupabaseAdminClient();
      const service = createTrainingFileService(supabase);

      try {
        const result = await service.createTrainingFile({
          name: trainingSet.name,
          description: `Rebuilt by workbase training set ${trainingSetId} (add-conversations)`,
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
        const supabase2 = createServerSupabaseAdminClient();
        await supabase2
          .from('training_sets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', trainingSetId);
        throw new Error(`Training file rebuild failed: ${err.message}`);
      }
    });

    if (!trainingFile || !trainingFile.jsonlPath) {
      return { success: false, reason: 'No JSONL produced during rebuild' };
    }

    // Step 3: Upsert datasets record
    //   If this training set already has a dataset (was built before), update it.
    //   If not (training set was created then abandoned before first build), insert new.
    const dataset = await step.run('upsert-dataset', async () => {
      const supabase = createServerSupabaseAdminClient();

      const fileName = trainingFile.jsonlPath.split('/').pop() || 'training.jsonl';
      const totalTokens = (trainingFile.totalTrainingPairs || 0) * 200;
      const avgTurnsPerConversation =
        trainingFile.conversationCount > 0
          ? parseFloat(
              (trainingFile.totalTrainingPairs / trainingFile.conversationCount).toFixed(2)
            )
          : 0;
      const avgTokensPerTurn =
        trainingFile.totalTrainingPairs > 0
          ? parseFloat((totalTokens / trainingFile.totalTrainingPairs).toFixed(2))
          : 0;

      if (trainingSet.dataset_id) {
        // Update existing dataset record
        const { data, error } = await supabase
          .from('datasets')
          .update({
            name: trainingSet.name,
            storage_path: trainingFile.jsonlPath,
            file_name: fileName,
            total_training_pairs: trainingFile.totalTrainingPairs,
            total_tokens: totalTokens,
            avg_turns_per_conversation: avgTurnsPerConversation,
            avg_tokens_per_turn: avgTokensPerTurn,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingSet.dataset_id)
          .select('id')
          .single();
        if (error) throw new Error(`Failed to update dataset: ${error.message}`);
        return { id: data.id };
      } else {
        // Insert new dataset record
        const { data, error } = await supabase
          .from('datasets')
          .insert({
            user_id: userId,
            name: trainingSet.name,
            description: `Auto-created from training set ${trainingSetId}`,
            format: 'brightrun_lora_v4',
            status: 'ready',
            storage_bucket: 'training-files',
            storage_path: trainingFile.jsonlPath,
            file_name: fileName,
            file_size: 0,
            total_training_pairs: trainingFile.totalTrainingPairs,
            total_validation_pairs: 0,
            total_tokens: totalTokens,
            avg_turns_per_conversation: avgTurnsPerConversation,
            avg_tokens_per_turn: avgTokensPerTurn,
            training_ready: true,
            validated_at: new Date().toISOString(),
            validation_errors: null,
            sample_data: null,
          })
          .select('id')
          .single();
        if (error) throw new Error(`Failed to create dataset: ${error.message}`);
        return { id: data.id };
      }
    });

    // Step 4: Update training_sets record → status: 'ready'
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
      if (error) throw new Error(`Failed to update training set status: ${error.message}`);
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

---

### Fix 4: Register the New Inngest Function

**File:** `src/inngest/functions/index.ts`

**Current content (confirmed):**
```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
};
```

**Replace with:**
```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
};
```

---

## No Database Schema Changes Required

The `training_sets` table already has all necessary columns:
- `id`, `user_id`, `workbase_id` — identity and ownership
- `name` — display name
- `conversation_ids UUID[]` — array of conversation IDs
- `conversation_count INT` — count of conversations
- `training_pair_count INT` — JSONL training pair count
- `status TEXT` — `'processing'` | `'ready'` | `'failed'`
- `jsonl_path TEXT` — storage path of generated JSONL file
- `dataset_id UUID` — FK to `datasets` table (for Launch Tuning)
- `is_active BOOL`
- `created_at`, `updated_at`

The `conversations` table has a `workbase_id UUID` column — confirmed in use at `src/app/api/conversations/route.ts` and `src/app/api/conversations/generate/route.ts`. The PATCH handler uses this column to validate that submitted conversation IDs belong to the target workbase.

No DDL changes are required.

---

## Implementation Sequence

Execute in this exact order:

1. **Create `src/inngest/functions/rebuild-training-set.ts`** (Fix 3) — create this file first since Fix 4 imports it
2. **Update `src/inngest/functions/index.ts`** (Fix 4) — register the new function
3. **Update `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts`** (Fix 2) — add the `inngest` import and `PATCH` handler; preserve the existing `DELETE` handler exactly as-is
4. **Update `src/components/conversations/ConversationTable.tsx`** (Fix 1) — all four sub-changes in order:
   - 1a: Replace the `trainingFiles` query (lines 116–126)
   - 1b: Add `addToTrainingSetMutation` after `addToTrainingFileMutation` (after line 231)
   - 1c: Update `handleAddToExistingFile` (lines 380–390)
   - 1d: Fix the dropdown rendering condition (lines 458–480)

---

## Acceptance Criteria

After implementation, verify the following behaviors manually:

### Happy Path — Add to Existing Training Set
1. Navigate to `/workbase/[id]/fine-tuning/conversations`
2. Select 1 or more conversations using the checkboxes
3. The "Build Training Set" button appears in the action bar
4. Click "Build Training Set" dropdown
5. **Expected:** An "Add to Existing Training Set" section appears below "Build New Training Set", listing all existing training sets for this workbase
6. Click an existing training set from the list
7. **Expected:** Toast: "Conversations added. Training set is rebuilding — check Launch Tuning for status."
8. Navigate to `/workbase/[id]/fine-tuning/launch`
9. **Expected:** The training set status shows "processing" briefly, then transitions to "ready" once Inngest completes the rebuild

### Happy Path — No Existing Training Sets
1. Navigate to a fresh workbase with no training sets yet
2. Select conversations and click "Build Training Set"
3. **Expected:** Only "Build New Training Set" appears in the dropdown (the "Add to Existing" section is conditionally rendered only when `trainingFiles.length > 0`)

### Happy Path — Create New Training Set (Regression Check)
1. Select conversations, click "Build Training Set" → "Build New Training Set"
2. Enter a name and click "Build Training Set"
3. **Expected:** Toast: "Training set is being built. Check Launch Tuning for status."
4. This flow must continue to work exactly as before.

### Edge Case — All Conversations Already Present
1. Select conversations already in a training set, try to add them again
2. **Expected:** Toast error: "All selected conversations are already in this training set"

### Edge Case — Workbase Isolation
1. Training sets from one workbase must NOT appear in the dropdown for another workbase
2. **Expected:** Each workbase's dropdown only shows its own training sets (enforced by the `workbase_id` filter in the API)

---

## Notes for the Executing Agent

- **Do NOT reference SAOL in application code.** SAOL is a CLI-only tool for local DB ops. Application code must use `createServerSupabaseAdminClient()` from `@/lib/supabase-server`. All API routes in this spec already follow this pattern.
- **Read each file before modifying it.** Confirm the file contents match what this spec describes before making changes.
- **URL is critical:** The `addToTrainingSetMutation` calls `PATCH /api/workbases/${workbaseId}/training-sets/${trainingSetId}`. There is NO `/add-conversations` suffix. The PATCH handler lives directly in `[tsId]/route.ts`.
- **TypeScript build validation:** After all changes, run `npx tsc --noEmit` (from the `src/` directory where `tsconfig.json` lives) and resolve any type errors before considering the implementation complete.
- **The `training_sets` API response shape** (from `GET /api/workbases/[id]/training-sets`) returns `json.data` (an array of camelCase objects with `id`, `name`, `conversationCount`, `status`). The updated query in Fix 1a already normalizes this.
- **Deduplication is server-side:** The `PATCH` handler deduplicates conversation IDs. The client does not need to pre-filter.
- **`rebuild-training-set.ts` mirrors `build-training-set.ts`:** If `build-training-set.ts` has been modified since this spec was written, align `rebuild-training-set.ts` with those changes for consistency.
