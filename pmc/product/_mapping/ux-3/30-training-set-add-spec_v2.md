# Spec 30: Training Set Build Visibility + Partial Processing Fix

**Version:** 2.0
**Date:** 2026-03-04
**Status:** Ready for implementation
**Implementing Agent:** Zero context — read this entire document before writing any code

---

## 1. Project Background (Required Context for New Agent)

**Bright Run LoRA Training Data Platform** — Next.js 14 App Router application deployed on Vercel at `https://v4-show.vercel.app/`.

**Relevant stack:**
- Framework: Next.js 14 (App Router), TypeScript
- Database: Supabase (PostgreSQL). **All agent DB operations must use SAOL** (see Operating Principles)
- Background jobs: Inngest (serverless function platform). Functions defined in `src/inngest/functions/`, registered at `src/app/api/inngest/route.ts`
- UI: shadcn/UI + Tailwind CSS. **Design token rules: use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`. No `zinc-*`, `slate-*`, or hardcoded `gray-*`**
- State: TanStack Query v5 (React Query) + Zustand (`src/stores/conversation-store.ts`)
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
- `src/lib/services/conversation-storage-service.ts` — `listConversations()` — handles DB queries, accepts `sortBy` as any column string
- `src/app/api/conversations/route.ts` — GET handler, accepts `sortBy` and `sortDirection` query params
- `src/app/api/workbases/[id]/training-sets/route.ts` — GET list + POST create
- `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` — PATCH add conversations + DELETE
- `src/app/api/workbases/[id]/training-sets/[tsId]/reset/route.ts` — POST reset stuck processing
- `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` — conversations list page; manages pagination state (`page`, `limit`, `total`), filters, and calls `loadConversations()`
- `src/components/conversations/ConversationTable.tsx` — table component; manages its own client-side sort state (`sortColumn: keyof Conversation`, `sortDirection`); uses `useConversationStore` for selection
- `src/stores/conversation-store.ts` — Zustand store; `selectedConversationIds` is session-only (NOT persisted to localStorage); `selectAllConversations(ids)` REPLACES the entire selection (root cause of cross-page selection loss)

**Critical architecture note — current sorting:**
The `ConversationTable.tsx` performs client-side in-memory sorting only. The `sortedConversations` useMemo sorts the current page's loaded data. Sort state is local to the table component (`useState`). The parent `conversations/page.tsx` does NOT pass sort state to the API — the `loadConversations()` function uses fixed `page` and `limit` only. The API and `listConversations()` service both accept `sortBy`/`sortDirection` but the frontend currently never sends them.

**Operating Principles:**
- Read ALL files listed above before writing any code
- Use exact file paths from this spec
- Do not rename or restructure existing files
- Do not use `window.confirm` or `window.alert` — use `AlertDialog` + `toast` (sonner)
- Background Inngest processing must continue to work as-is — do not break the existing pipeline

---

## 2. Root Cause Summary

### Training Set Build Failures

**Root cause (confirmed from Inngest logs):** The `validateConversationsForTraining()` method in `training-file-service.ts` uses ALL-OR-NOTHING validation. If any conversation in a batch has `enrichment_status ≠ 'completed'` or a null `enriched_file_path`, the entire batch is rejected and the training set status is set to `failed`. This leaves the set bricked with no UX recovery path.

**Why conversations appear unenriched:** The `enrichment_status` column renders as **"Pending"** for `not_started` status in the table — this label is ambiguous and makes it hard for users to identify which conversations are blocking their training set builds. Additionally, there is currently no way to sort or filter the conversation list by enrichment status, so users cannot identify all unenriched conversations in a single view.

**Why cross-page selections break:** In `conversation-store.ts`, the `selectAllConversations(ids)` action calls `set({ selectedConversationIds: ids })` — this **replaces** the entire selection array. When a user clicks "Select All" on page 2, the 25 IDs from page 1 are erased. Individual `toggleConversationSelection` works correctly across pages, but the select-all behavior does not merge.

**SQL to clear current failed state (run once in Supabase SQL Editor):**
```sql
UPDATE training_sets
SET status = 'ready', updated_at = NOW()
WHERE id = '47cd72c6-a8e5-4c0e-9d32-c8f1dd7a04d9'
  AND status = 'failed';
```

---

## 3. What This Spec Builds

This spec adds **5 feature areas** across the codebase:

| # | Feature | Files Modified |
|---|---------|---------------|
| 3.1 | DB schema: structured error storage on `training_sets` | DB migration |
| 3.2 | Inngest: write structured errors to DB on failure | `rebuild-training-set.ts`, `build-training-set.ts` |
| 3.3–3.5 | API: bypass endpoint + updated GET response | 1 new file, 1 modified |
| 3.6–3.8 | Training Sets monitoring page + UI wiring | 3 files modified, 1 new file |
| 3.9 | Cross-page selection + page size selector | `conversation-store.ts`, `ConversationTable.tsx`, `conversations/page.tsx` |
| 3.10 | Enrichment column sorting (server-side) | `conversations/page.tsx`, `ConversationTable.tsx`, `conversation-storage-service.ts` |

---

### 3.1 Database Schema Changes

**Run via Supabase SQL Editor:**
```sql
ALTER TABLE training_sets
  ADD COLUMN IF NOT EXISTS last_build_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS failed_conversation_ids TEXT[] DEFAULT '{}';

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'training_sets'
  AND column_name IN ('last_build_error', 'failed_conversation_ids');
```

**Purpose:**
- `last_build_error` — stores the full error message from the most recent failed build. Populated by Inngest functions on failure; cleared on success.
- `failed_conversation_ids` — stores the array of `conversation_id` values that failed validation. Enables the UI to show which conversations blocked the build and what "bypass" will skip.

---

### 3.2 Inngest Functions — Store Structured Errors

#### 3.2.1 File: `src/inngest/functions/rebuild-training-set.ts`

Read this file in full before editing. Locate the `catch (err: any)` block inside the step that rebuilds the training file. Replace the entire catch block with the version below. Also update the success update at the end of that step or in the final update step to clear error fields.

**Replace the catch block** (currently sets `status: 'failed'` and re-throws) **with:**
```typescript
} catch (err: any) {
  const supabase2 = createServerSupabaseAdminClient();

  // Parse failed conversation IDs from the validation error message.
  // Format: "Validation failed: Conversation <uuid>: enrichment_status..."
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

**In the success path** (where status is set to `ready`), also clear error fields:
```typescript
await supabase
  .from('training_sets')
  .update({
    status: 'ready',
    jsonl_path: trainingFile.jsonlPath,
    training_pair_count: trainingFile.totalTrainingPairs,
    dataset_id: dataset.id,
    last_build_error: null,
    failed_conversation_ids: [],
    updated_at: new Date().toISOString(),
  })
  .eq('id', trainingSetId);
```

#### 3.2.2 File: `src/inngest/functions/build-training-set.ts`

Apply the **same two changes** (structured catch block + cleared error fields on success) to the equivalent locations in this file.

---

### 3.3 New API Endpoint — Bypass Failed Conversations

**New file:** `src/app/api/workbases/[id]/training-sets/[tsId]/bypass/route.ts`

**Route:** `POST /api/workbases/[id]/training-sets/[tsId]/bypass`

**Purpose:** Remove specified conversation IDs from the training set, reset to `processing`, and fire `training/set.updated` to trigger an async rebuild without the invalid conversations.

**Request body:**
```json
{
  "conversationIdsToSkip": ["uuid1", "uuid2"]
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

  // Verify workbase ownership
  const { data: wb } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch the training set
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
      { success: false, error: 'No conversations remain after bypass — all were in the skip list' },
      { status: 400 }
    );
  }

  // Update training set: remove skipped IDs, reset status, clear error fields
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

  // Trigger async rebuild
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

---

### 3.4 Updated GET Training Sets API — Include New Fields

**File to modify:** `src/app/api/workbases/[id]/training-sets/route.ts`

Read the file in full. Find the GET handler's `.map()` that builds the response shape. Add two new fields:

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

---

### 3.5 New Training Sets Monitoring Page

**New file:** `src/app/(dashboard)/workbase/[id]/fine-tuning/training-sets/page.tsx`

**Route:** `/workbase/[id]/fine-tuning/training-sets`

**Access:** Button on the conversations page (see section 3.7)

**Features:**
1. Summary bar — total sets, total conversations, ready set count
2. Cards for each Training Set — name, status badge, conversation count, training pairs, timestamps, action buttons
3. Error panel (for `failed` sets) — expandable; shows failed conversation IDs, why they failed, what bypass will do
4. Bypass confirm dialog — `AlertDialog` with full skip list and remaining count
5. Reset button for stuck `processing` sets (stuck > 5 min)
6. Delete button with confirmation dialog
7. "Launch" button for `ready` sets
8. Auto-refresh every 5s while any set is in `processing`

**Full implementation:**
```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  SkipForward,
  ExternalLink,
} from 'lucide-react';
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

const STATUS_CONFIG: Record<
  TrainingSetStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }
> = {
  ready: { label: 'Ready', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: {
    label: 'Processing',
    variant: 'secondary',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
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

  const {
    data: trainingSets,
    isLoading,
    refetch,
  } = useQuery<TrainingSet[]>({
    queryKey: ['training-sets', workbaseId],
    queryFn: async () => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets`);
      if (!res.ok) throw new Error('Failed to fetch training sets');
      const json = await res.json();
      return (json.data || []) as TrainingSet[];
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = (data || []).some((ts) => ts.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}/reset`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Reset to ${data.data?.status}. You can now add more conversations.`);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bypassMutation = useMutation({
    mutationFn: async ({ tsId, idsToSkip }: { tsId: string; idsToSkip: string[] }) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}/bypass`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationIdsToSkip: idsToSkip }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Bypass started. ${data.data?.skippedCount} conversations skipped. Rebuilding with ${data.data?.remainingCount}…`
      );
      setBypassTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setBypassTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Training set deleted.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  const totalConversations = (trainingSets || []).reduce(
    (sum, ts) => sum + ts.conversationCount,
    0
  );

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isStuckProcessing = (ts: TrainingSet) =>
    ts.status === 'processing' &&
    Date.now() - new Date(ts.updatedAt || 0).getTime() > 5 * 60 * 1000;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() =>
            router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
          }
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Conversations
        </button>
      </div>

      {/* Header */}
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
              <p className="text-2xl font-bold text-foreground">
                {trainingSets?.length || 0}
              </p>
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

      {/* Loading */}
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
              onClick={() =>
                router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
              }
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
                        onClick={() =>
                          router.push(`/workbase/${workbaseId}/fine-tuning/launch`)
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Launch
                      </Button>
                    )}
                    {ts.status === 'processing' && stuck && (
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
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Conversations</p>
                    <p className="font-medium text-foreground">{ts.conversationCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Training Pairs</p>
                    <p className="font-medium text-foreground">
                      {ts.trainingPairCount || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="font-medium text-foreground">
                      {new Date(ts.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {ts.status === 'processing' && !stuck && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-3 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Building JSONL file in background — auto-refreshing…</span>
                  </div>
                )}

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
                              <span className="flex items-center gap-1">
                                <ChevronUp className="h-3 w-3" />
                                Hide details
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <ChevronDown className="h-3 w-3" />
                                Show details
                              </span>
                            )}
                          </button>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {errorExpanded && (
                      <div className="bg-muted rounded-md p-4 text-xs space-y-3">
                        {ts.failedConversationIds.length > 0 && (
                          <div>
                            <p className="font-semibold text-foreground mb-1">
                              {ts.failedConversationIds.length} conversation
                              {ts.failedConversationIds.length !== 1 ? 's' : ''} blocked
                              the build:
                            </p>
                            <ul className="space-y-1">
                              {ts.failedConversationIds.map((cid) => (
                                <li
                                  key={cid}
                                  className="font-mono text-destructive flex items-center gap-1"
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {cid}
                                </li>
                              ))}
                            </ul>
                            <p className="text-muted-foreground mt-2">
                              These conversations have{' '}
                              <code>enrichment_status ≠ &apos;completed&apos;</code> or a missing{' '}
                              <code>enriched_file_path</code>. They must be enriched before
                              inclusion in a training set.
                            </p>
                          </div>
                        )}

                        {ts.failedConversationIds.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">
                              What &quot;Bypass &amp; Rebuild&quot; will do:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>
                                Remove {ts.failedConversationIds.length} unenriched conversation
                                {ts.failedConversationIds.length !== 1 ? 's' : ''} from this set
                              </li>
                              <li>
                                Rebuild the JSONL with the remaining{' '}
                                {ts.conversationCount - ts.failedConversationIds.length}{' '}
                                conversations
                              </li>
                              <li>
                                Skipped conversations are NOT deleted — they remain in the
                                Conversations library and can be added again once enriched
                              </li>
                              <li>
                                This set will be set to <code>processing</code>, then{' '}
                                <code>ready</code> if the rebuild succeeds
                              </li>
                            </ul>
                          </div>
                        )}

                        {ts.lastBuildError && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">
                              Raw error log:
                            </p>
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
      <AlertDialog
        open={!!bypassTarget}
        onOpenChange={(open) => {
          if (!open) setBypassTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bypass &amp; Rebuild Training Set?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  The following {bypassTarget?.failedConversationIds.length} conversation
                  {bypassTarget?.failedConversationIds.length !== 1 ? 's' : ''} will be{' '}
                  <strong>permanently removed</strong> from this training set:
                </p>
                <ul className="font-mono text-xs space-y-1 bg-muted p-3 rounded-md max-h-40 overflow-auto">
                  {(bypassTarget?.failedConversationIds || []).map((cid) => (
                    <li key={cid} className="text-destructive">
                      {cid}
                    </li>
                  ))}
                </ul>
                <p>
                  The training set will be rebuilt with the remaining{' '}
                  <strong>
                    {(bypassTarget?.conversationCount || 0) -
                      (bypassTarget?.failedConversationIds.length || 0)}
                  </strong>{' '}
                  conversations.
                </p>
                <p className="text-muted-foreground">
                  Skipped conversations are NOT deleted — they remain in the Conversations
                  library and can be enriched and added to a new training set later.
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and its
              associated dataset record. The source conversations will NOT be deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
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

---

### 3.6 Add "Training Sets" Button to Conversations Page

**File to modify:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Read the file in full first. Currently the header has two buttons: "Batch Jobs" and "New Conversation". Add a third button "Training Sets" between them.

**Add `Layers` to the existing lucide-react import:**
```typescript
import { Plus, ListTodo, Layers } from 'lucide-react';
```

**Replace the `<div className="flex gap-2">` button group:**
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

---

### 3.7 Update ConversationTable Dropdown — Reflect `failed` Status

**File to modify:** `src/components/conversations/ConversationTable.tsx`

Read the file in full first.

#### 3.7.1 Add new fields to training sets query mapping

In the `useQuery` for `trainingFiles`, update the `.map()` to include the new error fields:

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

#### 3.7.2 Add `useRouter` import and hook

Add `useRouter` to the `next/navigation` import and instantiate it:
```typescript
import { useRouter } from 'next/navigation';
// ...inside component:
const router = useRouter();
```

Check whether `useRouter` is already imported/used before adding it.

#### 3.7.3 Add `ExternalLink` to lucide-react imports

Add `ExternalLink` to the existing lucide-react import line.

#### 3.7.4 Add `failed` state handling in the dropdown

In the `trainingFiles.map()` block inside the "Add to Existing Training Set" dropdown, add a `failed` check BEFORE the existing `isStuck` check:

```tsx
const isFailed = workbaseId && file.status === 'failed';
const isStuck = workbaseId && file.status === 'processing' &&
  Date.now() - new Date(file.updatedAt || 0).getTime() > 5 * 60 * 1000;

if (isFailed) {
  return (
    <DropdownMenuItem
      key={file.id}
      onClick={() =>
        router.push(`/workbase/${workbaseId}/fine-tuning/training-sets`)
      }
      className="text-destructive focus:text-destructive"
    >
      <AlertTriangle className="h-4 w-4 mr-2 text-destructive shrink-0" />
      <div className="flex-1">
        <div className="font-medium">{file.name}</div>
        <div className="text-xs">
          ✗ Failed —{' '}
          {file.failedConversationIds?.length || 0} blocked conversation
          {file.failedConversationIds?.length !== 1 ? 's' : ''} · click to fix
        </div>
      </div>
      <ExternalLink className="h-3 w-3 ml-1 shrink-0" />
    </DropdownMenuItem>
  );
}

if (isStuck) {
  // ... existing isStuck block unchanged ...
}
```

---

### 3.8 Cross-Page Selection + Page Size Selector

**Problem:** When a user selects conversations on page 1 and navigates to page 2, clicking "Select All" on page 2 replaces the page 1 selections because `selectAllConversations(ids)` in the store calls `set({ selectedConversationIds: ids })` (replaces, does not merge). Individual checkboxes work across pages, but the "Select All" header checkbox does not.

**Stability impact:** LOW. The changes are additive — two new store actions, one behavior change in `handleSelectAll`, and a page size UI control. No API, database, or service changes required.

#### 3.8.1 Add New Actions to Conversation Store

**File to modify:** `src/stores/conversation-store.ts`

Add two new actions to the `ConversationState` interface:
```typescript
/**
 * Add multiple conversations to the existing selection (merge, do not replace)
 */
addConversationsToSelection: (ids: string[]) => void;

/**
 * Remove specific conversations from the selection (deselect page without clearing other pages)
 */
deselectConversations: (ids: string[]) => void;
```

Add implementations inside `create()`:
```typescript
addConversationsToSelection: (ids: string[]) =>
  set((state) => ({
    selectedConversationIds: [
      ...state.selectedConversationIds,
      ...ids.filter((id) => !state.selectedConversationIds.includes(id)),
    ],
  }), false, 'addConversationsToSelection'),

deselectConversations: (ids: string[]) => {
  const removeSet = new Set(ids);
  return set((state) => ({
    selectedConversationIds: state.selectedConversationIds.filter(
      (id) => !removeSet.has(id)
    ),
  }), false, 'deselectConversations');
},
```

Note: The `deselectConversations` implementation uses a closure — write it as:
```typescript
deselectConversations: (ids: string[]) =>
  set((state) => {
    const removeSet = new Set(ids);
    return {
      selectedConversationIds: state.selectedConversationIds.filter(
        (id) => !removeSet.has(id)
      ),
    };
  }, false, 'deselectConversations'),
```

#### 3.8.2 Update `handleSelectAll` in ConversationTable

**File to modify:** `src/components/conversations/ConversationTable.tsx`

Destructure the new actions from the store:
```typescript
const {
  selectedConversationIds,
  toggleConversationSelection,
  addConversationsToSelection, // NEW
  deselectConversations,       // NEW
  clearSelection,
  showConfirm,
} = useConversationStore();
```

Replace the `handleSelectAll` function:
```typescript
const handleSelectAll = () => {
  const currentPageIds = conversations.map((c) => c.conversationId);
  if (allSelected) {
    // Deselect only the current page — keep selections on other pages
    deselectConversations(currentPageIds);
  } else {
    // Merge current page into existing selection — do not replace
    addConversationsToSelection(currentPageIds);
  }
};
```

Also update the selection banner text to show total selected across all pages:
```tsx
<span className="text-sm text-muted-foreground">
  {selectedConversationIds.length} conversation
  {selectedConversationIds.length !== 1 ? 's' : ''} selected
  {selectedConversationIds.length > conversations.length && (
    <span className="text-xs ml-1 text-duck-blue">
      (across multiple pages)
    </span>
  )}
</span>
```

#### 3.8.3 Add Page Size Selector to Conversations Page

**File to modify:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Add a page size `Select` control to the pagination footer. The current footer has "Previous" / "Next" buttons and a count label.

Add the `Select` import if not already present (it is already imported in this file).

Replace the pagination footer with:
```tsx
{/* Pagination */}
<div className="mt-4 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="text-sm text-muted-foreground">
      {pagination.total > 0
        ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
            pagination.page * pagination.limit,
            pagination.total
          )} of ${pagination.total} conversations`
        : loading
        ? 'Loading...'
        : 'No conversations found'}
    </div>
    {/* Page size selector */}
    <Select
      value={pagination.limit.toString()}
      onValueChange={(value) => {
        setPagination((prev) => ({ ...prev, limit: parseInt(value), page: 1 }));
      }}
    >
      <SelectTrigger className="w-[110px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="25">25 per page</SelectItem>
        <SelectItem value="50">50 per page</SelectItem>
        <SelectItem value="75">75 per page</SelectItem>
        <SelectItem value="100">100 per page</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="flex gap-2">
    <Button
      variant="outline"
      disabled={pagination.page === 1 || loading}
      onClick={() =>
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
      }
    >
      Previous
    </Button>
    <Button
      variant="outline"
      disabled={
        pagination.page * pagination.limit >= pagination.total || loading
      }
      onClick={() =>
        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
      }
    >
      Next
    </Button>
  </div>
</div>
```

**Important:** When `limit` changes, reset `page` to 1 (already shown above). Also add `pagination.limit` to the `useEffect` dependency array so that `loadConversations()` re-fires when the page size changes:

```typescript
useEffect(() => {
  loadConversations();
}, [filters, pagination.page, pagination.limit, workbaseId]); // add pagination.limit
```

---

### 3.9 Enrichment Column Server-Side Sorting

**Problem:** The Enrichment column in `ConversationTable.tsx` has no sort handler. The current sorting architecture is client-side only (sorts the current page's in-memory data). For enrichment sorting to be useful — allowing users to surface all unenriched conversations — it must be **server-side** so the full dataset is sorted across all pages. The API and `listConversations` service already support `sortBy`/`sortDirection` parameters but the page never sends them.

This spec also fixes the enrichment label "Pending" (for `not_started` status) to "Not Enriched" — which is the actual user-meaningful state.

**Stability impact:** LOW-MEDIUM. This lifts sort state from `ConversationTable` to `conversations/page.tsx` for the enrichment column specifically. All other columns retain their existing client-side sort. No DB migration, no API changes.

**Architecture decision — hybrid approach:**
- The enrichment column sort is server-side (sorts the full dataset, fetches from API)
- All other existing columns retain their current client-side sort behavior
- The table receives an optional `serverSortBy`/`serverSortDirection`/`onServerSort` prop contract; when the enrichment header is clicked, it calls `onServerSort`
- This is the safest change: no breaking modifications to existing sort behavior

#### 3.9.1 Add Sort Filter to Conversations API call

**File to modify:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Add sort state above the pagination state:
```typescript
const [serverSort, setServerSort] = useState<{
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}>({ sortBy: 'created_at', sortDirection: 'desc' });
```

Update `loadConversations()` to pass sort params:
```typescript
const queryParams = new URLSearchParams({
  page: pagination.page.toString(),
  limit: pagination.limit.toString(),
  workbaseId,
  sortBy: serverSort.sortBy,
  sortDirection: serverSort.sortDirection,
  ...(filters.status !== 'all' && { status: filters.status }),
  ...(filters.tier !== 'all' && { tier: filters.tier }),
  ...(filters.quality_min !== 'all' && { quality_min: filters.quality_min }),
});
```

Add `serverSort` to the `useEffect` dependency array:
```typescript
useEffect(() => {
  loadConversations();
}, [filters, pagination.page, pagination.limit, serverSort, workbaseId]);
```

Add an `onServerSort` callback:
```typescript
const handleServerSort = (column: string) => {
  setServerSort((prev) => ({
    sortBy: column,
    sortDirection:
      prev.sortBy === column && prev.sortDirection === 'asc' ? 'desc' : 'asc',
  }));
  setPagination((prev) => ({ ...prev, page: 1 })); // reset to page 1 on sort change
};
```

Pass `serverSort` and `handleServerSort` to `ConversationTable`:
```tsx
<ConversationTable
  conversations={transformedConversations}
  isLoading={loading}
  compactActions={false}
  workbaseId={workbaseId}
  serverSortBy={serverSort.sortBy}
  serverSortDirection={serverSort.sortDirection}
  onServerSort={handleServerSort}
/>
```

#### 3.9.2 Add Server Sort Props to ConversationTable

**File to modify:** `src/components/conversations/ConversationTable.tsx`

Update `ConversationTableProps`:
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
  workbaseId?: string;
  serverSortBy?: string;            // NEW — column currently sorted server-side
  serverSortDirection?: 'asc' | 'desc'; // NEW
  onServerSort?: (column: string) => void; // NEW — called when a server-sort column header is clicked
}
```

Destructure the new props:
```typescript
export const ConversationTable = React.memo(function ConversationTable({
  conversations,
  isLoading,
  compactActions = true,
  workbaseId,
  serverSortBy,
  serverSortDirection,
  onServerSort,
}: ConversationTableProps) {
```

#### 3.9.3 Add Sort Click Handler and Icon to Enrichment Column Header

In the `<TableHeader>` section, replace the current static Enrichment header:
```tsx
// BEFORE (line ~706):
<TableHead>Enrichment</TableHead>

// AFTER:
<TableHead
  className={onServerSort ? 'cursor-pointer' : ''}
  onClick={() => onServerSort?.('enrichment_status')}
>
  <div className="flex items-center gap-2">
    Enrichment
    {onServerSort && (
      serverSortBy === 'enrichment_status'
        ? (serverSortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)
        : <ArrowUpDown className="h-4 w-4" />
    )}
  </div>
</TableHead>
```

#### 3.9.4 Fix Enrichment Status Label — "Not Enriched" for `not_started`

In `ConversationTable.tsx`, update `formatEnrichmentStatus`:
```typescript
const formatEnrichmentStatus = (status: string): string => {
  if (!status || status === 'not_started') return 'Not Enriched'; // was: 'Pending'
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
```

#### 3.9.5 Add Enrichment Filter to Conversations Page (Optional — Recommended)

**File to modify:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Add an enrichment status filter to the filters section. This is the most direct way to find unenriched conversations (filter to `not_started`). Add to the filters state:

```typescript
const [filters, setFilters] = useState({
  status: 'all',
  tier: 'all',
  quality_min: 'all',
  enrichment_status: 'all', // NEW
});
```

Add to `loadConversations()` query params:
```typescript
...(filters.enrichment_status !== 'all' && { enrichment_status: filters.enrichment_status }),
```

Add the filter dropdown to the filters section in the JSX:
```tsx
<Select
  value={filters.enrichment_status}
  onValueChange={(value) =>
    setFilters((prev) => ({ ...prev, enrichment_status: value }))
  }
>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Filter by enrichment" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Enrichment</SelectItem>
    <SelectItem value="not_started">Not Enriched</SelectItem>
    <SelectItem value="enrichment_in_progress">In Progress</SelectItem>
    <SelectItem value="completed">Enriched</SelectItem>
    <SelectItem value="failed">Enrichment Failed</SelectItem>
  </SelectContent>
</Select>
```

**Also update `conversation-storage-service.ts`** to support enrichment status filtering:

In `listConversations()`, add a filter block after the existing `quality_max` filter:
```typescript
// In StorageConversationFilters interface (add field):
enrichment_status?: string;

// In listConversations() query building:
if (filters?.enrichment_status) {
  query = query.eq('enrichment_status', filters.enrichment_status);
}
```

**And update `conversations/route.ts`** to extract and pass the new filter:
```typescript
const enrichment_status = searchParams.get('enrichment_status') || undefined;

// Add to service.listConversations() call:
const result = await service.listConversations(
  {
    status,
    tier,
    persona_id,
    emotional_arc_id,
    training_topic_id,
    workbase_id,
    quality_min,
    quality_max,
    enrichment_status, // NEW
    created_by: user.id,
  },
  { page, limit, sortBy: sortBy as any, sortDirection }
);
```

---

## 4. Complete File Change Summary

| File | Action | Change |
|------|--------|--------|
| DB migration | New columns | Add `last_build_error TEXT` and `failed_conversation_ids TEXT[]` to `training_sets` |
| `src/inngest/functions/rebuild-training-set.ts` | Modify | Parse and store failed conversation IDs in catch block; clear error fields on success |
| `src/inngest/functions/build-training-set.ts` | Modify | Same catch block enhancement as `rebuild-training-set.ts` |
| `src/app/api/workbases/[id]/training-sets/route.ts` | Modify | Add `lastBuildError` and `failedConversationIds` to GET mapping |
| `src/app/api/workbases/[id]/training-sets/[tsId]/bypass/route.ts` | **New file** | POST endpoint for bypassing failed conversations and triggering rebuild |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/training-sets/page.tsx` | **New file** | Training Sets monitoring dashboard |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Modify | Add "Training Sets" button; add page size selector; add server sort state; add enrichment filter |
| `src/components/conversations/ConversationTable.tsx` | Modify | Map new error fields; add `failed` state dropdown handling; add server sort props; add enrichment column sort; update "Not Enriched" label; update `handleSelectAll` for cross-page merge |
| `src/stores/conversation-store.ts` | Modify | Add `addConversationsToSelection` and `deselectConversations` actions |
| `src/lib/services/conversation-storage-service.ts` | Modify | Add `enrichment_status` filter support to `listConversations()` and `StorageConversationFilters` |
| `src/app/api/conversations/route.ts` | Modify | Extract and pass `enrichment_status` filter to service |

---

## 5. Implementation Order

Execute in this order to maintain a working build at each step:

1. **Run the DB migration** (add columns to `training_sets`) — Supabase SQL Editor
2. **Modify `rebuild-training-set.ts`** — update catch block and success path
3. **Modify `build-training-set.ts`** — same catch block update
4. **Modify `src/app/api/workbases/[id]/training-sets/route.ts`** — add new fields to GET mapping
5. **Create `bypass/route.ts`** — new API endpoint
6. **Create `training-sets/page.tsx`** — new monitoring page
7. **Modify `conversations/page.tsx`** — add Training Sets button, page size selector, server sort state, enrichment filter
8. **Modify `conversation-storage-service.ts`** — add `enrichment_status` filter
9. **Modify `conversations/route.ts`** — extract and pass `enrichment_status`
10. **Modify `conversation-store.ts`** — add two new selection actions
11. **Modify `ConversationTable.tsx`** — all changes (failed state, server sort, cross-page select, label)
12. **Run TypeScript validation:** `cd src && npx tsc --noEmit -p tsconfig.json 2>&1 | head -60`
13. **Deploy to Vercel** — push to main branch

---

## 6. Acceptance Criteria

### 6.1 Training Sets Monitoring Page
- [ ] Page loads at `/workbase/[id]/fine-tuning/training-sets` without errors
- [ ] Summary bar shows correct total sets, total conversations, and ready set count
- [ ] All training sets for the workbase are listed with correct status badges
- [ ] A `failed` set shows "Build failed" alert with "Show details" toggle
- [ ] Error details panel shows: failed conversation IDs, why they failed, what bypass will do
- [ ] "Bypass & Rebuild" button opens `AlertDialog` with skip list and remaining count
- [ ] Confirming bypass triggers rebuild and shows toast with skipped/remaining counts
- [ ] After bypass: training set moves to `processing` then `ready`
- [ ] A `processing` set stuck > 5 min shows "Reset Stuck" button
- [ ] "Launch" button on `ready` sets navigates to launch page
- [ ] Delete button opens confirmation dialog and removes the set
- [ ] Page auto-refreshes every 5s when any set is in `processing`

### 6.2 Conversations Page Header
- [ ] "Training Sets" button is visible in the header next to "Batch Jobs"
- [ ] Clicking "Training Sets" navigates to `/workbase/[id]/fine-tuning/training-sets`

### 6.3 ConversationTable Dropdown
- [ ] A `failed` training set shows a red indicator with failed conversation count
- [ ] Clicking a `failed` set item navigates to the Training Sets page (does not try to add)
- [ ] A `processing` stuck set still shows "⚠ Stuck — click to reset"

### 6.4 Error Storage (Inngest)
- [ ] After a failed build, `training_sets.last_build_error` contains the full error text
- [ ] After a failed build, `training_sets.failed_conversation_ids` contains the blocked IDs
- [ ] After a successful build, both fields are cleared (`null` / `[]`)

### 6.5 Cross-Page Selection
- [ ] Selecting conversations on page 1 and navigating to page 2 retains page 1 selections
- [ ] Clicking "Select All" on page 2 ADDS page 2 conversations to the existing selection (does not replace page 1)
- [ ] Clicking "Select All" again on page 2 (when all page 2 are selected) removes page 2 selections only (page 1 still selected)
- [ ] Selection banner shows total across all pages, with "(across multiple pages)" indicator when > current page size
- [ ] "Build Training Set" includes all selected conversations across pages

### 6.6 Page Size Selector
- [ ] Page size dropdown shows in the pagination footer with options: 25, 50, 75, 100
- [ ] Changing page size reloads the conversation list with the new limit and resets to page 1
- [ ] Pagination counter updates correctly (e.g. "Showing 1–50 of 200")

### 6.7 Enrichment Column Sorting
- [ ] Enrichment column header shows sort icon (`↕`) when not sorted by enrichment
- [ ] Clicking Enrichment header triggers a server-side reload with `sortBy=enrichment_status`
- [ ] Sort cycles: first click = ascending (Not Enriched first), second click = descending
- [ ] Sort icon updates to `↑` or `↓` based on direction
- [ ] Sorting is across all pages — navigating to page 2 shows the next batch in sort order

### 6.8 Enrichment Filter
- [ ] Enrichment filter dropdown shows in the filters row
- [ ] Selecting "Not Enriched" filters to conversations with `enrichment_status = 'not_started'`
- [ ] Selecting "Enrichment Failed" filters to conversations with `enrichment_status = 'failed'`
- [ ] Filter resets to page 1 on change

### 6.9 Enrichment Label
- [ ] Conversations with `enrichment_status = 'not_started'` now display "Not Enriched" (was "Pending")
- [ ] All other enrichment statuses remain unchanged

---

## 7. TypeScript Notes

When modifying `ConversationTable.tsx` for enrichment sorting, note that `sortColumn` state is typed as `keyof Conversation`. The `enrichment_status` field is NOT on the `Conversation` interface — it's on `ConversationWithEnrichment` (via `Partial<Pick<StorageConversation, 'enrichment_status' | ...>>`). The enrichment sort is **server-side** so the local `sortedConversations` useMemo does not need to handle it. No type change to `sortColumn` is required.

When adding `enrichment_status` to `StorageConversationFilters`, check the existing interface definition in `conversation-storage-service.ts` to find the exact interface shape and add the field consistently.
