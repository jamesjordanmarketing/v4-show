# Spec 30: Training Set Build Visibility + Partial Processing Fix

**Version:** 1.0
**Date:** 2026-03-04
**Status:** Ready for implementation
**Implementing Agent:** Zero context — read this entire document before writing any code

---

## 1. Project Background (Required Context for New Agent)

**Bright Run LoRA Training Data Platform** — Next.js 14 App Router application deployed on Vercel.

**Relevant stack:**
- Framework: Next.js 14 (App Router), TypeScript
- Database: Supabase (PostgreSQL). **All agent DB operations must use SAOL** (see Operating Principles)
- Background jobs: Inngest (serverless function platform). Functions defined in `src/inngest/functions/`, registered at `src/app/api/inngest/route.ts`
- UI: shadcn/UI + Tailwind CSS. **Design token rules: use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`. No `zinc-*`, `slate-*`, or hardcoded `gray-*`**
- State: TanStack Query v5 (React Query) + Zustand
- Deployment: Vercel (production: `https://v4-show.vercel.app/`)
- **Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**The LoRA Training Pipeline (this spec's context):**
1. User generates conversations at `/workbase/[id]/fine-tuning/conversations/generate`
2. Conversations are auto-enriched via Inngest (`autoEnrichConversation` function) — sets `enrichment_status = 'completed'` and `enriched_file_path` when done
3. User selects enriched conversations at `/workbase/[id]/fine-tuning/conversations` and clicks "Build Training Set" to aggregate them into a JSONL file
4. The "Build Training Set" action creates a `training_sets` DB record (status: `processing`) and fires an Inngest event (`training/set.created` or `training/set.updated`)
5. Inngest runs `buildTrainingSet` or `rebuildTrainingSet` — downloads enriched JSON files from Supabase Storage, aggregates, uploads JSONL, creates a `datasets` record, and sets training set status to `ready`
6. The `ready` Training Set is visible on `/workbase/[id]/fine-tuning/launch` as the data source for running a LoRA fine-tuning job

**Key DB tables in scope:**
- `conversations` — `conversation_id` (business key), `id` (PK), `enrichment_status` (`not_started`/`enrichment_in_progress`/`completed`/`failed`), `enriched_file_path`, `workbase_id`
- `training_sets` — `id`, `workbase_id`, `user_id`, `name`, `conversation_ids TEXT[]`, `conversation_count`, `training_pair_count`, `status` (`processing`/`ready`/`failed`), `jsonl_path`, `dataset_id`, `is_active`, `created_at`, `updated_at`
- `training_files` — actual JSON/JSONL file metadata; linked to `training_sets` via `jsonl_file_path` match
- `training_file_conversations` — junction table: `training_file_id`, `conversation_id`

**Key source files for this spec:**
- `src/inngest/functions/rebuild-training-set.ts` — handles `training/set.updated` event
- `src/inngest/functions/build-training-set.ts` — handles `training/set.created` event
- `src/lib/services/training-file-service.ts` — `validateConversationsForTraining()`, `addConversationsToTrainingFile()`, `createTrainingFile()`
- `src/app/api/workbases/[id]/training-sets/route.ts` — GET list + POST create
- `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` — PATCH add conversations + DELETE
- `src/app/api/workbases/[id]/training-sets/[tsId]/reset/route.ts` — POST reset stuck processing
- `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` — conversations list page
- `src/components/conversations/ConversationTable.tsx` — includes "Build Training Set" dropdown

**Operating Principles:**
- Read ALL files listed above before writing any code
- Use exact file paths from this spec
- Do not rename or restructure existing files
- Do not use `window.confirm` or `window.alert` — use `AlertDialog` + `toast` (sonner)
- Background Inngest processing must continue to work as-is — do not break the existing pipeline

---

## 2. Issue Analysis & Investigation Results

### Issue 1: Does Inngest Need Manual Sync?

**Answer: NO.** The `rebuild-training-set` Inngest function IS registered and executing correctly on the production Vercel deployment.

**Evidence from logs:** The Vercel log shows `fnId=brighthub-rag-frontier-rebuild-training-set` executing at `dpl_D8qg6Zy644mQ5SxCDJvHo8Ru38Rs`. The function ran, reached the `rebuild-or-create-training-file` step, and returned a `400` error — meaning the function was invoked, processed the event, and intentionally threw a validation error.

**Inngest is synced and functional.** No manual action on the Inngest dashboard is needed for function registration.

**However:** As part of the fix in this spec, the `rebuild-training-set` function will be enhanced to store structured error data in the database. After that change is deployed to Vercel, Inngest will automatically pick up the updated function on the next request to `/api/inngest` (Inngest re-reads the function definitions from the endpoint on each invocation). **No manual Inngest sync step is needed.**

---

### Issue 3: Current Job Failure — Root Cause

**Training Set ID:** `47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9`
**Workbase ID:** `232bea74-b987-4629-afbc-a21180fe6e84`

**Root cause:** 4 conversations in the batch of 100 new conversations had `enrichment_status = 'not_started'` — they had never been run through the enrichment pipeline. The `validateConversationsForTraining()` method in `training-file-service.ts` requires ALL conversations to have `enrichment_status = 'completed'` and a non-null `enriched_file_path`. Since this is an ALL-OR-NOTHING check, all 4 failures caused the **entire batch of 100 to be rejected**.

**Failed conversation IDs:**
1. `1d0f4a67-5537-4b11-9feb-7a557f31f4db` — `enrichment_status: not_started`, `enriched_file_path: null`
2. `87b3442d-71d3-44af-8b94-31d9c6fc5ffc` — `enrichment_status: not_started`, `enriched_file_path: null`
3. `a18a698f-40c0-43bb-8a5d-0f4a28b37f4d` — `enrichment_status: not_started`, `enriched_file_path: null`
4. `fe700ff4-203a-4919-83bb-517b22d70509` — `enrichment_status: not_started`, `enriched_file_path: null`

**Why it's blocking further additions:** The training set is now in `failed` status. The UI's "Add to Existing Training Set" dropdown shows `· failed` and the `addToTrainingSetMutation.isPending` guard is the only disable — but a `failed` set receives no special treatment in the PATCH route. Users CAN technically PATCH a `failed` set, but there's no UX guidance or error recovery path.

**The design flaw this spec fixes:** The system currently performs ALL-OR-NOTHING validation. If any conversation is unenriched, the entire batch is rejected and the training set is bricked. This spec adds:
1. **Structured error storage** — `training_sets.last_build_error` and `training_sets.failed_conversation_ids`
2. **Bypass/skip capability** — remove the invalid conversations and rebuild with the rest
3. **Visibility page** — the Training Sets management page so users can see what failed and why

**SQL to clear the current failed state (run in Supabase SQL Editor):**

```sql
-- Verify the stuck training set
SELECT id, name, status, conversation_count, jsonl_path, updated_at
FROM training_sets
WHERE id = '47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9';

-- Reset to 'ready' since a valid JSONL exists from the prior successful batch of 50 conversations
UPDATE training_sets
SET 
  status = 'ready',
  updated_at = NOW()
WHERE id = '47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9'
  AND status = 'failed';

-- Verify
SELECT id, name, status, conversation_count, jsonl_path, updated_at
FROM training_sets
WHERE id = '47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9';
```

**After running this SQL:**
- The training set is restored to `ready` (the 50-conversation JSONL from the previous successful build is still valid)
- You can retry adding the third batch BUT must exclude the 4 unenriched conversations listed above
- Alternatively, use the new "Bypass" feature once this spec is implemented

**Note on the 4 unenriched conversations:** These conversations exist in the DB but were never enriched. They should be enriched before including them. The enrichment pipeline is triggered by the `autoEnrichConversation` Inngest function via the `conversation/generation.completed` event — but for existing conversations that missed enrichment, they need to be manually triggered or excluded.

---

## 3. What This Spec Builds

### 3.1 Database Schema Changes (2 new columns on `training_sets`)

```sql
-- Run via SAOL or Supabase SQL Editor
ALTER TABLE training_sets
  ADD COLUMN IF NOT EXISTS last_build_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS failed_conversation_ids TEXT[] DEFAULT '{}';

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'training_sets'
  AND column_name IN ('last_build_error', 'failed_conversation_ids');
```

**Purpose:**
- `last_build_error` — stores the human-readable error message from the most recent failed build. Populated by `rebuild-training-set.ts` / `build-training-set.ts` when they catch a validation error. Cleared when a build succeeds.
- `failed_conversation_ids` — stores the array of `conversation_id` values that failed validation in the last build attempt. Enables the UI to display which conversations need attention and what "bypass" would skip.

### 3.2 New Inngest Function Behavior — Store Structured Errors

**File to modify:** `src/inngest/functions/rebuild-training-set.ts`

In the `catch` block of Step 3 (`rebuild-or-create-training-file`), parse the error message to extract the failed conversation IDs and store them alongside the error.

**Current catch block (lines 131–139):**
```typescript
} catch (err: any) {
  const supabase2 = createServerSupabaseAdminClient();
  await supabase2
    .from('training_sets')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', trainingSetId);
  throw new Error(`Training file rebuild failed: ${err.message}`);
}
```

**Replace with:**
```typescript
} catch (err: any) {
  const supabase2 = createServerSupabaseAdminClient();

  // Extract failed conversation IDs from validation error message.
  // The error message format is: "Validation failed: Conversation <id>: enrichment_status..."
  const failedIds: string[] = [];
  const convIdRegex = /Conversation ([0-9a-f-]{36}):/g;
  let match;
  while ((match = convIdRegex.exec(err.message)) !== null) {
    if (!failedIds.includes(match[1])) failedIds.push(match[1]);
  }

  await supabase2
    .from('training_sets')
    .update({
      status: 'failed',
      last_build_error: err.message,
      failed_conversation_ids: failedIds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trainingSetId);

  throw new Error(`Training file rebuild failed: ${err.message}`);
}
```

**Apply the same change to** `src/inngest/functions/build-training-set.ts` in its equivalent catch block (the inner `catch (err: any)` inside `step.run('create-training-file-v4', ...)`).

Also update the success path in Step 5 (`update-training-set-ready`) to clear the error fields on success:
```typescript
await supabase
  .from('training_sets')
  .update({
    status: 'ready',
    jsonl_path: trainingFile.jsonlPath,
    training_pair_count: trainingFile.totalTrainingPairs,
    dataset_id: dataset.id,
    last_build_error: null,           // clear on success
    failed_conversation_ids: [],      // clear on success
    updated_at: new Date().toISOString(),
  })
  .eq('id', trainingSetId);
```

### 3.3 New API Endpoint — Bypass Failed Conversations

**New file:** `src/app/api/workbases/[id]/training-sets/[tsId]/bypass/route.ts`

**Route:** `POST /api/workbases/[id]/training-sets/[tsId]/bypass`

**Purpose:** Removes specified conversation IDs from the training set's `conversation_ids` array, resets status to `processing`, and fires `training/set.updated` to trigger a rebuild without the invalid conversations.

**Request body:**
```json
{
  "conversationIdsToSkip": ["uuid1", "uuid2", ...]
}
```

**Full implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIdsToSkip } = body;

  if (!conversationIdsToSkip || !Array.isArray(conversationIdsToSkip) || conversationIdsToSkip.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIdsToSkip array is required and must be non-empty' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: wb } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch existing training set
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, conversation_ids, status, name')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  if (ts.status !== 'failed') {
    return NextResponse.json(
      { success: false, error: `Bypass only allowed on failed training sets (current status: ${ts.status})` },
      { status: 400 }
    );
  }

  // Remove the skipped IDs
  const skipSet = new Set(conversationIdsToSkip);
  const cleanedIds: string[] = (ts.conversation_ids || []).filter(
    (id: string) => !skipSet.has(id)
  );

  if (cleanedIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No conversations remain after bypass — all conversations were in the skip list' },
      { status: 400 }
    );
  }

  // Update training set: remove skipped IDs, reset to processing, clear error state
  const { data: updated, error: updateErr } = await supabase
    .from('training_sets')
    .update({
      conversation_ids: cleanedIds,
      conversation_count: cleanedIds.length,
      status: 'processing',
      last_build_error: null,
      failed_conversation_ids: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.tsId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  // Trigger async rebuild via Inngest
  await inngest.send({
    name: 'training/set.updated',
    data: {
      trainingSetId: params.tsId,
      workbaseId: params.id,
      conversationIds: cleanedIds,
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      skippedCount: conversationIdsToSkip.length,
      remainingCount: cleanedIds.length,
      status: updated.status,
    },
  });
}
```

### 3.4 Updated GET Training Sets API — Include New Fields

**File to modify:** `src/app/api/workbases/[id]/training-sets/route.ts`

The GET handler's mapping must include the two new columns:
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
  lastBuildError: row.last_build_error || null,            // NEW
  failedConversationIds: row.failed_conversation_ids || [], // NEW
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));
```

### 3.5 New Training Sets Monitoring Page

**New file:** `src/app/(dashboard)/workbase/[id]/fine-tuning/training-sets/page.tsx`

**Route:** `/workbase/[id]/fine-tuning/training-sets`

**Access:** Button on the conversations page (see section 3.6)

**Page Features:**
1. **Summary bar** — shows total Training Sets and total conversations across all sets for this workbase
2. **Training Set list** — cards for each Training Set showing: name, status badge, conversation count, training pair count, created/updated dates, actions
3. **Error panel** (for `failed` sets) — shows the full error message, lists each failed conversation with its ID, explains what bypass will do (skip N conversations, rebuild with M remaining)
4. **Bypass confirm dialog** — uses `AlertDialog` with full details before executing
5. **Reset button** (for `processing` sets stuck > 5 min) — calls the existing reset endpoint
6. **Delete button** — calls DELETE on the training set
7. **"View in Launch"** link for `ready` sets — navigates to the launch page

**Complete page implementation:**

```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp, SkipForward, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type TrainingSetStatus = 'processing' | 'ready' | 'failed';

interface TrainingSet {
  id: string;
  name: string;
  status: TrainingSetStatus;
  conversationCount: number;
  trainingPairCount: number;
  jsonlPath: string | null;
  datasetId: string | null;
  lastBuildError: string | null;
  failedConversationIds: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<TrainingSetStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
  ready: { label: 'Ready', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: 'Processing', variant: 'secondary', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  failed: { label: 'Failed', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

export default function TrainingSetsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const queryClient = useQueryClient();

  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [bypassTarget, setBypassTarget] = useState<TrainingSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSet | null>(null);

  // Fetch all training sets for this workbase
  const { data: trainingSets, isLoading, refetch } = useQuery<TrainingSet[]>({
    queryKey: ['training-sets', workbaseId],
    queryFn: async () => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets`);
      if (!res.ok) throw new Error('Failed to fetch training sets');
      const json = await res.json();
      return (json.data || []) as TrainingSet[];
    },
    refetchInterval: (data) => {
      // Auto-refresh every 5s while any set is in processing state
      const hasProcessing = (data || []).some((ts) => ts.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });

  // Reset stuck training set
  const resetMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets/${tsId}/reset`, { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Reset to ${data.data?.status}. You can now add more conversations.`);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Bypass failed conversations
  const bypassMutation = useMutation({
    mutationFn: async ({ tsId, idsToSkip }: { tsId: string; idsToSkip: string[] }) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets/${tsId}/bypass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIdsToSkip: idsToSkip }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Bypass started. ${data.data?.skippedCount} conversations skipped. Rebuilding with ${data.data?.remainingCount}…`);
      setBypassTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => { toast.error(err.message); setBypassTarget(null); },
  });

  // Delete training set
  const deleteMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets/${tsId}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Training set deleted.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => { toast.error(err.message); setDeleteTarget(null); },
  });

  const totalConversations = (trainingSets || []).reduce((sum, ts) => sum + ts.conversationCount, 0);

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isStuckProcessing = (ts: TrainingSet) =>
    ts.status === 'processing' &&
    Date.now() - new Date(ts.updatedAt || 0).getTime() > 5 * 60 * 1000;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Conversations
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training Sets</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage training data builds for this Work Base
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary bar */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Sets</p>
              <p className="text-2xl font-bold text-foreground">{trainingSets?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Conversations</p>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Ready Sets</p>
              <p className="text-2xl font-bold text-foreground">
                {(trainingSets || []).filter((ts) => ts.status === 'ready').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!trainingSets || trainingSets.length === 0) && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No training sets yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Select conversations and click "Build Training Set" to create one.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
            >
              Go to Conversations
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Training Set cards */}
      <div className="space-y-4">
        {(trainingSets || []).map((ts) => {
          const cfg = STATUS_CONFIG[ts.status] || STATUS_CONFIG.failed;
          const stuck = isStuckProcessing(ts);
          const errorExpanded = expandedErrors.has(ts.id);

          return (
            <Card key={ts.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-foreground text-base">{ts.name}</CardTitle>
                      <Badge variant={cfg.variant} className="flex items-center gap-1">
                        {cfg.icon}
                        {stuck ? 'Stuck' : cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: <code className="font-mono">{ts.id}</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ts.status === 'ready' && ts.datasetId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/launch`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Launch
                      </Button>
                    )}
                    {(ts.status === 'processing' && stuck) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetMutation.mutate(ts.id)}
                        disabled={resetMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset Stuck
                      </Button>
                    )}
                    {ts.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBypassTarget(ts)}
                        disabled={ts.failedConversationIds.length === 0}
                      >
                        <SkipForward className="h-3 w-3 mr-1" />
                        Bypass &amp; Rebuild
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(ts)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Conversations</p>
                    <p className="font-medium text-foreground">{ts.conversationCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Training Pairs</p>
                    <p className="font-medium text-foreground">{ts.trainingPairCount || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="font-medium text-foreground">
                      {new Date(ts.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Processing indicator */}
                {ts.status === 'processing' && !stuck && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-3 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Building JSONL file in background — auto-refreshing…</span>
                  </div>
                )}

                {/* Error panel for failed sets */}
                {ts.status === 'failed' && (
                  <div className="mt-2">
                    <Alert variant="destructive" className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <span className="font-medium">Build failed</span>
                          <button
                            className="text-xs underline ml-2 shrink-0"
                            onClick={() => toggleError(ts.id)}
                          >
                            {errorExpanded ? (
                              <span className="flex items-center gap-1"><ChevronUp className="h-3 w-3" />Hide details</span>
                            ) : (
                              <span className="flex items-center gap-1"><ChevronDown className="h-3 w-3" />Show details</span>
                            )}
                          </button>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {errorExpanded && (
                      <div className="bg-muted rounded-md p-4 text-xs space-y-3">
                        {/* Failed conversations */}
                        {ts.failedConversationIds.length > 0 && (
                          <div>
                            <p className="font-semibold text-foreground mb-1">
                              {ts.failedConversationIds.length} conversation{ts.failedConversationIds.length !== 1 ? 's' : ''} blocked the build:
                            </p>
                            <ul className="space-y-1">
                              {ts.failedConversationIds.map((cid) => (
                                <li key={cid} className="font-mono text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {cid}
                                </li>
                              ))}
                            </ul>
                            <p className="text-muted-foreground mt-2">
                              These conversations have <code>enrichment_status ≠ 'completed'</code> or a missing <code>enriched_file_path</code>.
                              They must be enriched before they can be included in a training set.
                            </p>
                          </div>
                        )}

                        {/* What bypass does */}
                        {ts.failedConversationIds.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">What "Bypass &amp; Rebuild" will do:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>Remove {ts.failedConversationIds.length} unenriched conversation{ts.failedConversationIds.length !== 1 ? 's' : ''} from this set</li>
                              <li>Rebuild the JSONL with the remaining {ts.conversationCount - ts.failedConversationIds.length} conversations</li>
                              <li>The skipped conversations will NOT be lost — they remain in the Conversations library and can be added again once enriched</li>
                              <li>This training set will be set to <code>processing</code> and then <code>ready</code> if the rebuild succeeds</li>
                            </ul>
                          </div>
                        )}

                        {/* Raw error log */}
                        {ts.lastBuildError && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">Raw error log:</p>
                            <pre className="text-muted-foreground whitespace-pre-wrap break-all overflow-auto max-h-48">
                              {ts.lastBuildError}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bypass Confirmation Dialog */}
      <AlertDialog open={!!bypassTarget} onOpenChange={(open) => { if (!open) setBypassTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bypass &amp; Rebuild Training Set?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  The following {bypassTarget?.failedConversationIds.length} conversation{bypassTarget?.failedConversationIds.length !== 1 ? 's' : ''} will be <strong>permanently removed</strong> from this training set:
                </p>
                <ul className="font-mono text-xs space-y-1 bg-muted p-3 rounded-md max-h-40 overflow-auto">
                  {(bypassTarget?.failedConversationIds || []).map((cid) => (
                    <li key={cid} className="text-destructive">{cid}</li>
                  ))}
                </ul>
                <p>
                  The training set will be rebuilt with the remaining{' '}
                  <strong>{(bypassTarget?.conversationCount || 0) - (bypassTarget?.failedConversationIds.length || 0)}</strong>{' '}
                  conversations.
                </p>
                <p className="text-muted-foreground">
                  The skipped conversations are NOT deleted — they remain in the Conversations library and can be enriched and added to a new training set later.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bypassTarget) {
                  bypassMutation.mutate({
                    tsId: bypassTarget.id,
                    idsToSkip: bypassTarget.failedConversationIds,
                  });
                }
              }}
            >
              Bypass &amp; Rebuild
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and its associated dataset record.
              The source conversations will NOT be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### 3.6 Add "Training Sets" Button to Conversations Page

**File to modify:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Add a third button to the header button group. Currently there are two buttons: "Batch Jobs" and "New Conversation". Add a new "Training Sets" button between them.

Add the `Database` import from lucide-react (or use `Layers` if `Database` is not available in the current icon set — check what's imported):

```typescript
// Add to existing imports from 'lucide-react':
import { Plus, ListTodo, Layers } from 'lucide-react';
```

Update the button group:
```tsx
<div className="flex gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={() =>
      router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch`)
    }
  >
    <ListTodo className="h-4 w-4 mr-2" />
    Batch Jobs
  </Button>
  {/* NEW */}
  <Button
    size="sm"
    variant="outline"
    onClick={() =>
      router.push(`/workbase/${workbaseId}/fine-tuning/training-sets`)
    }
  >
    <Layers className="h-4 w-4 mr-2" />
    Training Sets
  </Button>
  <Button
    size="sm"
    onClick={() =>
      router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
    }
  >
    <Plus className="h-4 w-4 mr-2" />
    New Conversation
  </Button>
</div>
```

### 3.7 Update ConversationTable Dropdown — Reflect `failed` Status

**File to modify:** `src/components/conversations/ConversationTable.tsx`

The existing dropdown normalization for workbase training sets (lines ~126–131) should include the `lastBuildError` and `failedConversationIds` fields that the API now returns:

```typescript
return (json.data || []).map((ts: any) => ({
  id: ts.id,
  name: ts.name,
  conversation_count: ts.conversationCount,
  status: ts.status,
  updatedAt: ts.updatedAt,
  lastBuildError: ts.lastBuildError || null,             // NEW
  failedConversationIds: ts.failedConversationIds || [], // NEW
}));
```

In the dropdown item rendering, add handling for `failed` status (similar to the `isStuck` case already present). A `failed` set should show a red indicator and direct the user to the Training Sets page instead of trying to add more:

```tsx
// In the trainingFiles.map() inside the dropdown:
const isFailed = workbaseId && file.status === 'failed';

if (isFailed) {
  return (
    <DropdownMenuItem
      key={file.id}
      onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/training-sets`)}
      className="text-destructive focus:text-destructive"
    >
      <AlertTriangle className="h-4 w-4 mr-2 text-destructive shrink-0" />
      <div className="flex-1">
        <div className="font-medium">{file.name}</div>
        <div className="text-xs">
          ✗ Failed — {file.failedConversationIds?.length || 0} blocked conversation{file.failedConversationIds?.length !== 1 ? 's' : ''} · click to fix
        </div>
      </div>
      <ExternalLink className="h-3 w-3 ml-1 shrink-0" />
    </DropdownMenuItem>
  );
}
```

Note: `ExternalLink` needs to be added to the lucide-react imports in `ConversationTable.tsx`.

Also add a `useRouter` hook import and usage to `ConversationTable.tsx` if not already present, for navigating to the training sets page.

---

## 4. Complete File Change Summary

| File | Action | Change |
|------|--------|--------|
| DB migration | New columns | Add `last_build_error TEXT` and `failed_conversation_ids TEXT[]` to `training_sets` |
| `src/inngest/functions/rebuild-training-set.ts` | Modify | Parse and store failed conv IDs in catch block; clear error fields on success |
| `src/inngest/functions/build-training-set.ts` | Modify | Same catch block enhancement as above |
| `src/app/api/workbases/[id]/training-sets/route.ts` | Modify | Add `lastBuildError` and `failedConversationIds` to GET mapping |
| `src/app/api/workbases/[id]/training-sets/[tsId]/bypass/route.ts` | **New file** | POST endpoint for bypassing failed conversations |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/training-sets/page.tsx` | **New file** | Training Sets monitoring dashboard page |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Modify | Add "Training Sets" button to header |
| `src/components/conversations/ConversationTable.tsx` | Modify | Map new fields; add `failed` state handling in dropdown |

---

## 5. Implementation Order

Execute in this order to avoid breaking dependencies:

1. **Run the DB migration** (add columns to `training_sets`) — can do in Supabase SQL Editor
2. **Modify `rebuild-training-set.ts`** — update catch block and success path
3. **Modify `build-training-set.ts`** — same catch block update
4. **Modify `src/app/api/workbases/[id]/training-sets/route.ts`** — add new fields to GET mapping
5. **Create `bypass/route.ts`** — new API endpoint
6. **Create `training-sets/page.tsx`** — new monitoring page
7. **Modify `conversations/page.tsx`** — add Training Sets button
8. **Modify `ConversationTable.tsx`** — add failed state handling
9. **Run TypeScript validation:** `cd src && npx tsc --noEmit -p tsconfig.json 2>&1 | head -40`
10. **Deploy to Vercel** — push to main branch

---

## 6. Acceptance Criteria

### Training Sets Monitoring Page
- [ ] Page loads at `/workbase/[id]/fine-tuning/training-sets` without errors
- [ ] Summary bar shows correct total sets, total conversations, and ready set count
- [ ] All training sets for the workbase are listed with correct status badges
- [ ] A `failed` training set shows an error panel with "Show details" / "Hide details" toggle
- [ ] Error details show: list of failed conversation IDs, explanation of why they failed, what "Bypass & Rebuild" will do
- [ ] "Bypass & Rebuild" button opens an `AlertDialog` with the skip list and remaining count
- [ ] Confirming bypass: removes skipped IDs, triggers rebuild, shows toast
- [ ] After bypass: training set moves to `processing` then (if successful) `ready`
- [ ] A `processing` set stuck > 5 min shows "Reset Stuck" button
- [ ] "Launch" button on `ready` sets navigates to launch page
- [ ] Delete button opens confirmation dialog and removes the set
- [ ] Page auto-refreshes every 5s when any set is in `processing`

### Conversations Page
- [ ] "Training Sets" button is visible in the header next to "Batch Jobs"
- [ ] Clicking "Training Sets" navigates to `/workbase/[id]/fine-tuning/training-sets`

### Dropdown (ConversationTable)
- [ ] A `failed` training set in the dropdown shows a red indicator with failed conversation count
- [ ] Clicking a `failed` set item navigates to the Training Sets page (not tries to add)

### Error Storage
- [ ] After a failed build, `training_sets.last_build_error` is populated with the error text
- [ ] After a failed build, `training_sets.failed_conversation_ids` contains the array of blocked conv IDs
- [ ] After a successful build, both fields are cleared to null/empty

---

## 7. Immediate Action (Before Deployment)

Run this SQL in the Supabase dashboard to clear the current stuck state so testing can continue:

```sql
UPDATE training_sets
SET 
  status = 'ready',
  updated_at = NOW()
WHERE id = '47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9'
  AND status = 'failed';
```

After running, the training set will be `ready` again. You can add more conversations — but **do not include** these 4 unenriched conversations in the next batch until they have been enriched:

- `1d0f4a67-5537-4b11-9feb-7a557f31f4db`
- `87b3442d-71d3-44af-8b94-31d9c6fc5ffc`
- `a18a698f-40c0-43bb-8a5d-0f4a28b37f4d`
- `fe700ff4-203a-4919-83bb-517b22d70509`

To check and trigger enrichment on these conversations, go to the Conversations page, find them by ID, and verify their enrichment status.
