# Spec 30 — E02: Training Sets Monitoring Page + UI Navigation

**Version:** 2.0  
**Date:** 2026-03-04  
**Section:** E02 — Training Sets Monitoring Page + UI Wiring  
**Prerequisites:** E01 (DB schema + Inngest + API endpoints) must be complete  
**Builds Upon:** E01 backend changes  
**Change log (v2):** Updated all "current" code blocks to match the actual post-E01 codebase. Fixed Task 2b button formatting (multi-line props, not compressed), Task 3a lucide imports (one-per-line format), Task 3c indentation (8-space inside queryFn). Corrected line counts. Confirmed E01 artifacts are live and verified.

---

## Overview

This prompt creates the Training Sets monitoring dashboard page and wires it into the existing UI. It adds a new page for viewing, managing, and recovering from failed training set builds. It also adds navigation from the conversations page and updates the ConversationTable dropdown to reflect `failed` training set status.

**What This Prompt Creates/Modifies:**
1. **New** Training Sets monitoring page — `training-sets/page.tsx`
2. Conversations page header — add "Training Sets" navigation button
3. ConversationTable dropdown — add `failed` state handling + new error fields mapping

**What This Prompt Does NOT Create:**
- Database changes (done in E01)
- Inngest function changes (done in E01)
- API endpoint changes (done in E01)
- Cross-page selection or sorting features (E03)

---

========================


# E02 Execution Prompt — Training Sets Monitoring Page + UI Navigation

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and exact code
2. **Verify file locations** by reading each file listed before editing
3. **Execute the instructions as written** — do not re-investigate what has been verified

---

## Platform Context

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) deployed on Vercel.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| Background Jobs | Inngest |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query v5 |
| Deployment | Vercel |

### Codebase Root
`C:\Users\james\Master\BrightHub\BRun\v4-show`

### Design Token Rules  
**MANDATORY:** Use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`. **NEVER** use `zinc-*`, `slate-*`, or hardcoded `gray-*` in any component.

### Relevant Codebase Structure
```
src/
├── app/
│   ├── api/
│   │   └── workbases/[id]/training-sets/
│   │       ├── route.ts                    ← GET returns lastBuildError + failedConversationIds (from E01)
│   │       └── [tsId]/
│   │           ├── route.ts                ← PATCH/DELETE handler (existing)
│   │           ├── reset/route.ts          ← POST reset stuck (existing)
│   │           └── bypass/route.ts         ← POST bypass (created in E01)
│   └── (dashboard)/workbase/[id]/fine-tuning/
│       ├── conversations/page.tsx          ← MODIFY (Task 2) — add "Training Sets" button
│       └── training-sets/page.tsx          ← NEW (Task 1) — monitoring dashboard
├── components/
│   ├── conversations/
│   │   └── ConversationTable.tsx           ← MODIFY (Task 3) — failed state in dropdown
│   └── ui/                                ← shadcn/UI base components (Button, Badge, Card, etc.)
└── stores/
    └── conversation-store.ts
```

---

## E01 Build Artifacts (Verified Complete)

These backend changes were implemented and verified in E01:

1. **DB columns on `training_sets`** (verified via SAOL introspection):
   - `last_build_error TEXT DEFAULT NULL`
   - `failed_conversation_ids TEXT[] DEFAULT '{}'`

2. **GET `/api/workbases/[id]/training-sets`** response now includes:
   - `lastBuildError: string | null`
   - `failedConversationIds: string[]`
   - File: `src/app/api/workbases/[id]/training-sets/route.ts` (157 lines)

3. **POST `/api/workbases/[id]/training-sets/[tsId]/bypass`** endpoint (109 lines):
   - Request: `{ conversationIdsToSkip: string[] }`
   - Response: `{ success, data: { id, name, skippedCount, remainingCount, status } }`
   - Only works on training sets with `status === 'failed'`

4. **POST `/api/workbases/[id]/training-sets/[tsId]/reset`** endpoint (pre-existing):
   - Resets stuck `processing` training sets

5. **DELETE `/api/workbases/[id]/training-sets/[tsId]`** endpoint (pre-existing):
   - Deletes a training set

6. **Inngest functions** (`rebuild-training-set.ts` 254 lines, `build-training-set.ts` 176 lines):
   - Catch blocks now parse failed conversation IDs via regex and write `last_build_error` + `failed_conversation_ids` to the DB
   - Success paths clear both fields to `null` / `[]`

7. **TypeScript compilation:** Verified clean — `tsc --noEmit` and VS Code diagnostics report zero errors across all modified files.

---

## Operating Principles

- Read ALL files listed before writing any code
- Do not use `window.confirm` or `window.alert` — use `AlertDialog` + `toast` (sonner)
- Use exact file paths from this prompt
- Do not rename or restructure existing files
- Design tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`

---

## Task 1: Create Training Sets Monitoring Page

**New file:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\training-sets\page.tsx`

**Route:** `/workbase/[id]/fine-tuning/training-sets`

**Features:**
1. Summary bar — total sets, total conversations, ready set count
2. Cards for each Training Set — name, status badge, conversation count, training pairs, timestamps, action buttons
3. Error panel (for `failed` sets) — expandable; shows failed conversation IDs, failure reason, what bypass will do
4. Bypass confirm dialog — `AlertDialog` with full skip list and remaining count
5. Reset button for stuck `processing` sets (stuck > 5 minutes)
6. Delete button with confirmation dialog
7. "Launch" button for `ready` sets — navigates to launch page
8. Auto-refresh every 5 seconds while any set is in `processing`

**Create the file with this exact content:**

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
              Select conversations and click &quot;Build Training Set&quot; to create one.
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

## Task 2: Add "Training Sets" Button to Conversations Page Header

**File to modify:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`  
**Lines:** 243 total

Read this file in full before editing.

### 2a. Add `Layers` to the lucide-react import

The current import (line 18):
```typescript
import { Plus, ListTodo } from 'lucide-react';
```

**Replace with:**
```typescript
import { Plus, ListTodo, Layers } from 'lucide-react';
```

### 2b. Add the "Training Sets" button between "Batch Jobs" and "New Conversation"

The current header button group (~lines 108–128):
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
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
```

**Replace with (add Training Sets button in the middle):**
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

## Task 3: Update ConversationTable Dropdown — Handle `failed` Training Sets

**File to modify:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx`  
**Lines:** 843 total

Read this file in full before editing.

### 3a. Add `ExternalLink` to lucide-react imports

The current lucide-react import (lines 23–39):
```typescript
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  Download, 
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FileJson,
  Plus,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
```

**Replace with (add `ExternalLink`):**
```typescript
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  Download, 
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FileJson,
  Plus,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
```

### 3b. Add `useRouter` import and hook

`useRouter` is **not** currently imported in this file. Add this import near the top, after the existing `next/navigation` or React imports (around line 2):

```typescript
import { useRouter } from 'next/navigation';
```

Inside the `ConversationTable` component function body (~line 101, right after the `React.memo` function signature opens), add this **before** the `useConversationStore` destructure:

```typescript
  const router = useRouter();
```

### 3c. Update training sets query mapping to include new error fields

The current `useQuery` for `trainingFiles` (~lines 128–134) has this `.map()`:
```typescript
        return (json.data || []).map((ts: any) => ({
          id: ts.id,
          name: ts.name,
          conversation_count: ts.conversationCount,
          status: ts.status,
          updatedAt: ts.updatedAt,
        }));
```

**Replace with (add `lastBuildError` and `failedConversationIds`):**
```typescript
        return (json.data || []).map((ts: any) => ({
          id: ts.id,
          name: ts.name,
          conversation_count: ts.conversationCount,
          status: ts.status,
          updatedAt: ts.updatedAt,
          lastBuildError: ts.lastBuildError || null,
          failedConversationIds: ts.failedConversationIds || [],
        }));
```

### 3d. Add `failed` state handling in the dropdown

In the `trainingFiles.map()` block inside the "Add to Existing Training Set" dropdown (~lines 552–558), the current code starts:

```typescript
                  {trainingFiles.map((file: any) => {
                    const isStuck =
                      workbaseId &&
                      file.status === 'processing' &&
                      Date.now() - new Date(file.updatedAt || 0).getTime() > 5 * 60 * 1000;

                    if (isStuck) {
```

**Replace the beginning of the map callback** (everything before `if (isStuck)`) **and add the `isFailed` check BEFORE the `isStuck` check:**

```typescript
                  {trainingFiles.map((file: any) => {
                    const isFailed = workbaseId && file.status === 'failed';
                    const isStuck =
                      workbaseId &&
                      file.status === 'processing' &&
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
```

The rest of the existing `isStuck` block and the normal training set item remain **unchanged**.

---

## Task 4: Validate TypeScript Compilation

After completing all changes, run:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit --project src/tsconfig.json 2>&1 | head -60
```

Fix any TypeScript errors before proceeding.

---

## Verification Checklist

- [ ] Training Sets monitoring page loads at `/workbase/[id]/fine-tuning/training-sets` without errors
- [ ] Summary bar shows correct total sets, total conversations, and ready set count
- [ ] All training sets for the workbase are listed with correct status badges
- [ ] A `failed` set shows "Build failed" alert with "Show details" toggle
- [ ] Error details panel shows: failed conversation IDs, why they failed, what bypass will do
- [ ] "Bypass & Rebuild" button opens `AlertDialog` with skip list and remaining count
- [ ] Confirming bypass triggers rebuild and shows toast
- [ ] A `processing` set stuck > 5 min shows "Reset Stuck" button
- [ ] "Launch" button on `ready` sets navigates to launch page
- [ ] Delete button opens confirmation dialog and removes the set
- [ ] Page auto-refreshes every 5s when any set is in `processing`
- [ ] "Training Sets" button is visible in the conversations page header
- [ ] Clicking "Training Sets" navigates to the monitoring page
- [ ] ConversationTable dropdown shows failed training sets with red indicator
- [ ] Clicking a failed training set in dropdown navigates to the Training Sets page
- [ ] TypeScript compiles without errors

---

## Build Artifacts for E03

E03 will use these artifacts from this prompt:
- **Training Sets monitoring page** — fully functional at `/workbase/[id]/fine-tuning/training-sets`
- **"Training Sets" button** in conversations page header — navigation path established
- **ConversationTable dropdown** — now shows `failed` state with navigation to monitoring page

E03 will modify these files further:
- `conversations/page.tsx` — add page size selector, server sort state, enrichment filter
- `ConversationTable.tsx` — add cross-page selection, server sort props, enrichment column sort, label fix
- `conversation-store.ts` — add two new selection actions
- `conversation-storage-service.ts` — add enrichment_status filter
- `conversations/route.ts` — pass enrichment_status

---

**END OF E02 PROMPT**

+++++++++++++++++
