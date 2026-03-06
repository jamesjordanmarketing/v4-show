# Spec 21 — Workbase Batch Job Watcher: Execution Prompt E02
## Phase 3 (New Pages) + Phase 4 (Modified Pages)

**Version:** 2.0 | **Date:** 2026-03-03  
**Spec Source:** `21-ux-containers-batch-page-specification_v1.md`  
**Prerequisite:** E01 must be fully complete (DB column added, 4 backend/types files updated)  
**Builds:** 2 new pages + 2 modified pages  

### Changes from v1
- **Prerequisite check** now also verifies `src/lib/types/index.ts` (`workbaseId` on `BatchJob` type)
- **Task 5** updates the toast message (no longer says "running in background" since we redirect to the live watcher)
- **Task 6** build command corrected to run from `src/` where `tsconfig.json` lives
- **Task 8** git commit includes ALL E01 + E02 files (E01 was not committed) and updated commit message
- **Completion checklist** adds `types/index.ts` verification

---

========================    

## EXECUTION PROMPT E02 — UI Pages: Batch List, Batch Watcher, Nav Button, Generator Redirect

You are an expert Next.js 14 / TypeScript engineer. You will implement a precise set of UI changes to an existing production codebase. Read all instructions fully before writing any code. Execute each task in order.

---

## APPLICATION CONTEXT

**Bright Run LoRA Training Data Platform** — Next.js 14 App Router application. Users create "Work Bases" (workspaces) and generate AI training conversations in batches within each workbase.

**Active codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`  
**Framework:** Next.js 14, App Router, TypeScript, `'use client'` pages  
**Auth:** Supabase Auth via `@/lib/supabase-server`  
**UI Library:** shadcn/UI + Tailwind CSS — custom design token system (see below)  

---

## PREREQUISITE VERIFICATION

Before writing any code, verify that E01 was completed. Check these files:

1. `src/app/api/batch-jobs/route.ts` — confirm it parses `searchParams.get('workbaseId')` and passes it to `getAllJobs`
2. `src/lib/services/batch-job-service.ts` — confirm `getAllJobs` accepts `workbaseId` filter, `createJob` accepts `workbaseId`, and `getJobById` returns `workbaseId`
3. `src/lib/types/index.ts` — confirm `BatchJob` type includes `workbaseId?: string | null`

If these changes are NOT in place, E01 was not completed and you must stop.

---

## DESIGN TOKEN SYSTEM (MANDATORY — ENFORCE STRICTLY)

All new and modified UI code **MUST use these semantic Tailwind tokens only**. This is a hard rule — failure to follow it breaks the application's visual consistency.

| Token | Hex | Use For |
|-------|-----|---------|
| `bg-background` | `#FFFDF0` | Page backgrounds (`<div className="p-8 bg-background min-h-full">`) |
| `bg-card` | `#FFFFFF` | Card backgrounds |
| `bg-muted` | `#F5F5F0` | Subtle backgrounds (stats blocks, inline messages) |
| `text-foreground` | `#383838` | All primary text |
| `text-muted-foreground` | `#666666` | Secondary / helper text, labels |
| `border-border` | `#D1D5DB` | All borders |
| `text-duck-blue` | `#3AA1EC` | Brand accent text |
| `bg-duck-blue` | `#3AA1EC` | Brand accent backgrounds, progress fill |
| `bg-primary` | `#FFDE00` | Primary action button fill |
| `text-primary-foreground` | dark | Text on yellow button |

**ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` classes in any new or modified code.**

**Exception — status badges only** (intentional semantic colors):
- Success / green: `bg-green-100 text-green-700`, `border-green-200`, `bg-green-50`  
- Error / red: `bg-red-100 text-red-700`, `border-red-200`, `bg-red-50`  
- Active / blue: `bg-blue-100 text-blue-700`, `bg-blue-50`  
- Warning / yellow: `bg-yellow-100 text-yellow-700`  
- Neutral: `bg-gray-100 text-gray-700` (badge only)  

---

## EXISTING FILE STRUCTURE (workbase routing)

The workbase layout at `src/app/(dashboard)/workbase/[id]/layout.tsx` renders a fixed left sidebar. **Any page file placed inside `/workbase/[id]/` automatically inherits this sidebar.** You do not need to modify the layout.

Current workbase routes:
```
src/app/(dashboard)/workbase/[id]/
├── layout.tsx                                   ← DO NOT TOUCH
├── page.tsx                                     ← DO NOT TOUCH
├── fine-tuning/
│   ├── conversations/
│   │   ├── page.tsx                             ← MODIFY (Task 4 — add Batch Jobs button)
│   │   ├── generate/
│   │   │   └── page.tsx                         ← MODIFY (Task 5 — change redirect)
│   │   └── [convId]/
│   │       └── page.tsx                         ← DO NOT TOUCH
│   ├── launch/
│   │   └── page.tsx                             ← DO NOT TOUCH
│   └── chat/
│       └── page.tsx                             ← DO NOT TOUCH
```

**New directories and files you will create:**
```
│   │   ├── batch/
│   │   │   ├── page.tsx                         ← NEW (Task 2 — batch jobs list)
│   │   │   └── [jobId]/
│   │   │       └── page.tsx                     ← NEW (Task 3 — batch job watcher)
```

---

## EXISTING FILES TO READ BEFORE MAKING CHANGES

Read these files fully before making any edits:

1. `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` — for Task 4
2. `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` — for Task 5
3. `src/app/(dashboard)/batch-jobs/[id]/page.tsx` — reference implementation for Task 3 (read to understand the full processing logic before writing the workbase version)

---

## KEY API ROUTES USED BY THE NEW PAGES

These API routes already exist and work. Do not modify them.

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/batch-jobs?workbaseId=[id]` | GET | List batch jobs for a workbase (E01 added `workbaseId` filter) |
| `GET /api/conversations/batch/[jobId]/status` | GET | Poll job status — returns `{ jobId, status, progress: { total, completed, successful, failed, percentage }, estimatedTimeRemaining, startedAt, completedAt }` |
| `POST /api/batch-jobs/[jobId]/process-next` | POST | Process one queue item — returns `{ success, status, remainingItems, progress, itemId?, conversationId?, error? }`. `status` values: `'processed'`, `'job_completed'`, `'job_cancelled'`, `'no_items'`, `'error'` |
| `POST /api/batch-jobs/[jobId]/cancel` | POST | Cancel the job |
| `PATCH /api/conversations/batch/[jobId]` | PATCH | Pause/resume with `{ action: 'pause' \| 'resume' }` |
| `GET /api/conversations/batch/[jobId]/items?status=completed` | GET | Get completed items — returns `{ data: [{ conversation_id }] }` |
| `POST /api/conversations/bulk-enrich` | POST | `{ conversationIds: string[] }` — triggers enrichment pipeline |

---

## TASK 1 — Create Directory Structure

Create the following directories (they will hold the new page files from Tasks 2 and 3):

```
src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/
src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/
```

Next.js App Router automatically serves pages from `page.tsx` files in these directories. No additional configuration needed.

---

## TASK 2 — Create Batch Jobs List Page

**New file:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx`

This page lists all batch jobs belonging to the current workbase. It lives inside the workbase layout so the sidebar renders automatically.

**Key behaviors:**
- Fetches `GET /api/batch-jobs?workbaseId=[id]` on mount and on refresh
- Each job row is clickable and navigates to `./batch/[jobId]`
- Shows name, status badge, progress bar (% complete), item counts, start/complete time
- Empty state with "Generate Conversations" CTA
- Refresh button
- Back navigation to conversations page

**Create this exact file:**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Ban,
  AlertTriangle,
  List,
} from 'lucide-react';

interface BatchJobSummary {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  completedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType; spin?: boolean }
> = {
  queued:     { label: 'Queued',     badgeClass: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'Processing', badgeClass: 'bg-blue-100 text-blue-700',    icon: Loader2, spin: true },
  paused:     { label: 'Paused',     badgeClass: 'bg-yellow-100 text-yellow-700', icon: Pause },
  completed:  { label: 'Completed',  badgeClass: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Failed',     badgeClass: 'bg-red-100 text-red-700',      icon: XCircle },
  cancelled:  { label: 'Cancelled',  badgeClass: 'bg-gray-100 text-gray-700',    icon: Ban },
};

export default function WorkbaseBatchJobsListPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const [jobs, setJobs] = useState<BatchJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/batch-jobs?workbaseId=${workbaseId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch batch jobs');
      }
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch jobs');
    } finally {
      setLoading(false);
    }
  }, [workbaseId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getProgressPercentage = (job: BatchJobSummary) => {
    if (job.totalItems === 0) return 0;
    return Math.round((job.completedItems / job.totalItems) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Conversations
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Batch Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Generation jobs for this Work Base
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No batch jobs found for this Work Base.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                router.push(
                  `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                )
              }
            >
              Generate Conversations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
            const StatusIcon = config.icon;
            const pct = getProgressPercentage(job);

            return (
              <Card
                key={job.id}
                className="bg-card border-border hover:border-duck-blue/40 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch/${job.id}`
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">
                          {job.name}
                        </p>
                        <Badge className={`${config.badgeClass} shrink-0`}>
                          <StatusIcon
                            className={`h-3 w-3 mr-1 ${config.spin ? 'animate-spin' : ''}`}
                          />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {job.id.slice(0, 8)}...
                      </p>

                      {/* Progress bar */}
                      {job.totalItems > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>
                              {job.completedItems} / {job.totalItems} items
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-duck-blue rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {(job.successfulItems > 0 || job.failedItems > 0) && (
                            <div className="flex gap-3 mt-1 text-xs">
                              {job.successfulItems > 0 && (
                                <span className="text-green-700">
                                  {job.successfulItems} successful
                                </span>
                              )}
                              {job.failedItems > 0 && (
                                <span className="text-red-700">
                                  {job.failedItems} failed
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      {job.completedAt ? (
                        <span>Completed {formatDate(job.completedAt)}</span>
                      ) : job.startedAt ? (
                        <span>Started {formatDate(job.startedAt)}</span>
                      ) : (
                        <span>Queued</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## TASK 3 — Create Workbase Batch Job Detail/Watcher Page

**New file:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`

This is the main deliverable — the full-featured workbase-scoped batch job watcher. It is a port of the legacy `src/app/(dashboard)/batch-jobs/[id]/page.tsx` with three categories of changes:

1. **Routing params:** Reads `workbaseId` from `params.id` AND `jobId` from `params.jobId`
2. **Navigation:** "Back" goes to `/workbase/[id]/fine-tuning/conversations/batch`; CTAs go to workbase routes
3. **Design tokens:** Uses the design token system (no `dark:` variants, no `zinc-*`/`slate-*`)

The **processing logic is identical** to the legacy page. Copy it exactly:
- `fetchStatus` — polls `GET /api/conversations/batch/[jobId]/status`
- `processNextItem` — calls `POST /api/batch-jobs/[jobId]/process-next`, returns `boolean` (continue? yes/no)
- `startProcessing` — while loop calling `processNextItem`, 500ms delay between items, max 1000 iterations
- `stopProcessing` — sets `processingRef.current = false`
- All `useRef` guards: `processingRef`, `autoStartedRef`, `didProcessRef`, `autoEnrichTriggeredRef`
- `useEffect` auto-start: triggers `startProcessing()` when `status?.status === 'queued'`
- `useEffect` auto-enrich: triggers `handleEnrichAll()` when `status?.status === 'completed'` + `didProcessRef.current` + not already enriched
- `handleAction` — cancel calls `POST /api/batch-jobs/[jobId]/cancel`; pause/resume calls `PATCH /api/conversations/batch/[jobId]`
- `handleEnrichAll` — fetches completed items, then calls `POST /api/conversations/bulk-enrich`

**Create this exact file:**

```tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  Ban,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  StopCircle,
} from 'lucide-react';

interface BatchJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number;
  startedAt?: string;
  completedAt?: string;
}

export default function WorkbaseBatchJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<BatchJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    successful: number;
    failed: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Processing state — mirrors legacy page exactly
  const [processingActive, setProcessingActive] = useState(false);
  const processingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const didProcessRef = useRef(false);
  const autoEnrichTriggeredRef = useRef(false);
  const [lastItemError, setLastItemError] = useState<string | null>(null);

  // ─── Status fetching ───────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/conversations/batch/${jobId}/status`, {
        signal: controller.signal,
        credentials: 'same-origin',
      });
      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please sign in.');
      }
      if (response.redirected) {
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please refresh the page.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // ─── Processing loop ───────────────────────────────────────────────────────

  const processNextItem = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/batch-jobs/${jobId}/process-next`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process item');
      }

      if (data.progress) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: data.progress,
                status:
                  data.status === 'job_completed'
                    ? 'completed'
                    : data.status === 'job_cancelled'
                    ? 'cancelled'
                    : data.status === 'processed'
                    ? 'processing'
                    : prev.status,
              }
            : null
        );
      }

      if (data.success && data.conversationId) {
        setLastItemError(null);
      } else if (data.itemId) {
        setLastItemError(data.error || 'Unknown error');
      }

      if (
        data.status === 'job_completed' ||
        data.status === 'job_cancelled' ||
        data.status === 'no_items'
      ) {
        return false;
      }

      return data.status === 'processed' && data.remainingItems > 0;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing error';
      setLastItemError(errorMsg);
      return false;
    }
  }, [jobId]);

  const startProcessing = useCallback(async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    didProcessRef.current = true;
    setProcessingActive(true);

    let hasMore = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (hasMore && processingRef.current && iterations < maxIterations) {
      iterations++;
      hasMore = await processNextItem();
      if (hasMore && processingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    processingRef.current = false;
    setProcessingActive(false);
    await fetchStatus();
  }, [processNextItem, fetchStatus]);

  const stopProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Safety: force loading=false after 5s if still stuck
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Failed to load job status. Please try refreshing.');
      }
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [loading]);

  // Auto-start processing when queued
  useEffect(() => {
    if (
      status?.status === 'queued' &&
      !processingActive &&
      !processingRef.current &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      startProcessing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, processingActive]);

  // Auto-enrich when batch completes after processing on this page visit
  useEffect(() => {
    if (
      status?.status === 'completed' &&
      status.progress.successful > 0 &&
      !processingActive &&
      didProcessRef.current &&
      !autoEnrichTriggeredRef.current &&
      !enriching &&
      !enrichResult
    ) {
      autoEnrichTriggeredRef.current = true;
      handleEnrichAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, processingActive]);

  // ─── Job control actions ───────────────────────────────────────────────────

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionLoading(true);

      if (action === 'cancel') {
        stopProcessing();
        const response = await fetch(`/api/batch-jobs/${jobId}/cancel`, {
          method: 'POST',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to cancel job');
        }
      } else {
        const response = await fetch(`/api/conversations/batch/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${action} job`);
        }
        if (action === 'pause') {
          stopProcessing();
        } else if (action === 'resume') {
          startProcessing();
        }
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Bulk enrich ───────────────────────────────────────────────────────────

  const handleEnrichAll = async () => {
    if (!status || status.status !== 'completed') return;

    try {
      setEnriching(true);
      setEnrichResult(null);

      const response = await fetch(
        `/api/conversations/batch/${jobId}/items?status=completed`
      );
      const items = await response.json();

      if (!response.ok) {
        throw new Error(items.error || 'Failed to fetch batch items');
      }

      const conversationIds =
        items.data
          ?.map((item: { conversation_id: string | null }) => item.conversation_id)
          .filter(Boolean) || [];

      if (conversationIds.length === 0) {
        setEnrichResult({ successful: 0, failed: 0, skipped: 0, total: 0 });
        return;
      }

      const enrichResponse = await fetch('/api/conversations/bulk-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds }),
      });

      const enrichData = await enrichResponse.json();

      if (!enrichResponse.ok) {
        throw new Error(enrichData.error || 'Enrichment failed');
      }

      setEnrichResult(enrichData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // ─── Formatters ────────────────────────────────────────────────────────────

  const formatTimeRemaining = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'Calculating...';
    if (seconds <= 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}m`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  // ─── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-8 max-w-2xl mx-auto bg-background">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error Loading Batch Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => fetchStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch`
                  )
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Batch Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.status === 'processing' || status.status === 'queued';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isPaused = status.status === 'paused';
  const isCancelled = status.status === 'cancelled';

  const statusBadgeClass: Record<string, string> = {
    completed:  'bg-green-100 text-green-700',
    failed:     'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    paused:     'bg-yellow-100 text-yellow-700',
    cancelled:  'bg-gray-100 text-gray-700',
    queued:     'bg-muted text-muted-foreground',
  };

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
          onClick={() =>
            router.push(
              `/workbase/${workbaseId}/fine-tuning/conversations/batch`
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Batch Jobs
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch Job</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 break-all">
              {jobId}
            </p>
          </div>
          <Badge
            className={
              statusBadgeClass[status.status] ||
              'bg-muted text-muted-foreground'
            }
          >
            {status.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {isActive && (
              <Loader2 className="h-5 w-5 animate-spin text-duck-blue" />
            )}
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            {isPaused && <Pause className="h-5 w-5 text-yellow-600" />}
            {isCancelled && (
              <Ban className="h-5 w-5 text-muted-foreground" />
            )}
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {status.progress.completed} / {status.progress.total} completed
              </span>
              <span className="font-medium text-foreground">
                {Math.round(status.progress.percentage)}%
              </span>
            </div>
            <Progress value={status.progress.percentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">
                {status.progress.successful}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-2xl font-bold text-red-700">
                {status.progress.failed}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">
                {status.progress.total - status.progress.completed}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <div className="p-3 rounded-lg bg-muted border border-border">
              <p className="text-2xl font-bold text-foreground">
                {status.progress.total}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Time Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {status.startedAt && (
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(status.startedAt)}
                </p>
              </div>
            )}
            {isActive && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Estimated remaining</p>
                  <p className="font-medium text-foreground">
                    {formatTimeRemaining(status.estimatedTimeRemaining)}
                  </p>
                </div>
              </div>
            )}
            {status.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(status.completedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {processingActive && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing...
            </Badge>
          )}

          {processingActive && (
            <Button
              variant="outline"
              onClick={stopProcessing}
              disabled={actionLoading}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}

          {(status.status === 'processing' || status.status === 'paused') &&
            !processingActive &&
            status.progress.completed < status.progress.total && (
              <Button onClick={startProcessing} disabled={actionLoading}>
                <Play className="mr-2 h-4 w-4" />
                Resume Processing
              </Button>
            )}

          {(isActive || isPaused) && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading || processingActive}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Cancel Job
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Completion Card */}
      {isCompleted && (
        <Card className="mb-6 bg-card border-border border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Batch Complete!
            </CardTitle>
            <CardDescription className="text-green-600">
              Successfully generated {status.progress.successful} conversation
              {status.progress.successful !== 1 ? 's' : ''}
              {status.progress.failed > 0 &&
                ` (${status.progress.failed} failed)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrichResult && (
              <div className="p-3 rounded-md bg-muted border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Enrichment Complete
                </p>
                <p className="text-xs text-muted-foreground">
                  {enrichResult.successful} enriched, {enrichResult.skipped}{' '}
                  skipped, {enrichResult.failed} failed
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!enrichResult && status.progress.successful > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleEnrichAll}
                  disabled={enriching}
                >
                  {enriching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enriching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enrich All
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations`
                  )
                }
              >
                View Conversations
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Generate More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Card */}
      {isFailed && (
        <Card className="mb-6 bg-card border-border border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Batch Failed
            </CardTitle>
            <CardDescription className="text-red-600">
              {status.progress.failed} conversation
              {status.progress.failed !== 1 ? 's' : ''} failed to generate
              {status.progress.successful > 0 &&
                ` (${status.progress.successful} succeeded)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Successful Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Card */}
      {isCancelled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Ban className="h-5 w-5" />
              Batch Cancelled
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Job was cancelled.{' '}
              {status.progress.successful > 0
                ? `${status.progress.successful} conversation${
                    status.progress.successful !== 1 ? 's were' : ' was'
                  } generated before cancellation.`
                : 'No conversations were generated.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Start New Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## TASK 4 — Modify Conversations Page: Add "Batch Jobs" Button

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Read the file fully first. Make exactly these two changes:

### Change 4A — Add `ListTodo` to the imports

Find the existing import from `'lucide-react'`. It currently imports `Plus`. Add `ListTodo`:

**Before:**
```tsx
import { Plus } from 'lucide-react';
```

**After:**
```tsx
import { Plus, ListTodo } from 'lucide-react';
```

### Change 4B — Update the page header JSX

Find the header `<div className="mb-6 flex justify-between items-start">` block. It currently contains a single `<Button>` for "New Conversation".

**Replace the single button with a flex row of TWO buttons:**

The header currently looks like:
```tsx
<div className="mb-6 flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
    <p className="text-muted-foreground mt-1">
      Manage training conversations for this Work Base
    </p>
  </div>
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

**Replace with:**
```tsx
<div className="mb-6 flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
    <p className="text-muted-foreground mt-1">
      Manage training conversations for this Work Base
    </p>
  </div>
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
</div>
```

**Everything else in this file remains unchanged.**

---

## TASK 5 — Modify Generator Page: Redirect to Batch Watcher After Submission

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx`

Read the file fully first. Find the `handleSubmit` function. Inside it, after a successful batch submission, there are currently these two blocks:

```tsx
toast.success(
  `Batch of ${estimate.conversationCount} conversation${estimate.conversationCount !== 1 ? 's' : ''} submitted — generation running in background`
);
router.push(`/workbase/${workbaseId}/fine-tuning/conversations`);
```

**Replace both lines with:**
```tsx
toast.success(
  `Batch of ${estimate.conversationCount} conversation${estimate.conversationCount !== 1 ? 's' : ''} submitted — opening batch watcher`
);
router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch/${result.jobId}`);
```

> The `result` object at that point in the code is the parsed JSON from the `POST /api/conversations/generate-batch` response. It has shape `{ success: boolean, jobId: string, status: string, estimatedCost: number, estimatedTime: number }`. The `result.jobId` field is the UUID of the newly created batch job.

**Everything else in this file remains unchanged.**

---

## TASK 6 — Build Verification

Run TypeScript compilation to confirm zero errors. **Note:** the `tsconfig.json` is in `src/`, not the project root.

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\src" && npx tsc --noEmit 2>&1 | head -60
```

**If there are errors:**
- `Cannot find module '@/components/ui/progress'` — this component exists at `src/components/ui/progress.tsx`. Verify the import path.
- `Property 'jobId' does not exist on type ...` — ensure the `result` variable in the generate page is not over-typed. It comes from `await response.json()` so it has type `any` by default.
- Any import errors in the new pages — double-check the import paths match what's in other pages in the workbase tree.

---

## TASK 7 — Manual Smoke Test Checklist

After build passes, verify the following navigation flows work in the browser:

### Flow 1: Generator → Batch Watcher
1. Navigate to `/workbase/[id]/fine-tuning/conversations`
2. Click "New Conversation" button
3. Select any persona, arc, and topic
4. Click "Generate N Conversations"
5. **Expected:** After submission, page redirects to `/workbase/[id]/fine-tuning/conversations/batch/[jobId]`
6. **Expected:** Processing auto-starts immediately — progress bar begins updating

### Flow 2: Conversations → Batch Jobs List
1. Navigate to `/workbase/[id]/fine-tuning/conversations`
2. **Expected:** Header shows both "Batch Jobs" (outline) and "New Conversation" (filled) buttons
3. Click "Batch Jobs"
4. **Expected:** Navigates to `/workbase/[id]/fine-tuning/conversations/batch`
5. **Expected:** List shows only batch jobs for this workbase — not all account jobs

### Flow 3: Batch List → Batch Detail
1. On the batch jobs list page, click any job row
2. **Expected:** Navigates to `/workbase/[id]/fine-tuning/conversations/batch/[jobId]`
3. **Expected:** Workbase sidebar is visible on the left

### Flow 4: Batch Watcher — Back Navigation
1. On the batch detail page, click "All Batch Jobs"
2. **Expected:** Returns to `/workbase/[id]/fine-tuning/conversations/batch`

### Flow 5: Scope Isolation (Critical)
1. Log in as a user who has workbases
2. On the batch jobs list page for workbase A
3. **Expected:** Only shows jobs created for workbase A, NOT jobs from workbase B or legacy jobs with no workbase

---

## TASK 8 — Git Commit

Once all tasks pass and the smoke test checklist is complete. This commit includes both E01 (DB + backend) and E02 (UI) changes since E01 was not separately committed:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show"
git add src/lib/types/index.ts
git add src/lib/services/batch-job-service.ts
git add src/lib/services/batch-generation-service.ts
git add src/app/api/batch-jobs/route.ts
git add src/app/(dashboard)/workbase/
git status
git commit -m "Add workbase-scoped batch job watcher (Spec 21 E01+E02)

E01 — DB Schema + Backend:
- Add workbase_id UUID column to batch_jobs with FK to workbases
- Add idx_batch_jobs_workbase_id index
- Backfill existing records from shared_parameters JSONB
- batch-job-service: createJob accepts workbaseId, getAllJobs filters by it
- batch-job-service: getJobById and getAllJobs return workbaseId in mapping
- batch-generation-service: passes workbaseId to createJob
- API route GET /api/batch-jobs: parses workbaseId query param
- Add workbaseId to BatchJob type in types/index.ts

E02 — UI Pages:
- New batch jobs list page at /workbase/[id]/fine-tuning/conversations/batch
- New batch job watcher at /workbase/[id]/fine-tuning/conversations/batch/[jobId]
- Add Batch Jobs button to conversations page header
- Generator redirect now goes to batch watcher after submission"
```

---

## COMPLETION CHECKLIST

- [ ] `batch/page.tsx` created — lists workbase-scoped batch jobs
- [ ] `batch/[jobId]/page.tsx` created — full-featured job watcher
- [ ] Both new pages use only design tokens (no `zinc-*`, `slate-*`, `gray-*`)
- [ ] Both new pages sit inside workbase layout (sidebar renders automatically)
- [ ] Conversations page header has "Batch Jobs" outline button + "New Conversation" filled button
- [ ] `ListTodo` imported from `lucide-react` in conversations page
- [ ] Generator page redirect goes to `/batch/${result.jobId}` instead of `/conversations`
- [ ] Generator page toast updated to say "opening batch watcher" instead of "running in background"
- [ ] `src/lib/types/index.ts` includes `workbaseId?: string | null` on `BatchJob` type
- [ ] `npx tsc --noEmit` (from `src/` dir) — zero type errors
- [ ] Flow 1: Generator submission → lands on batch watcher, processing auto-starts
- [ ] Flow 2: Conversations "Batch Jobs" button → batch list page
- [ ] Flow 3: Batch list row click → batch detail page with sidebar
- [ ] Flow 4: Batch watcher "All Batch Jobs" back link → batch list page
- [ ] Flow 5: Workbase scope isolation — list only shows jobs for the current workbase
- [ ] Git commit complete (includes both E01 + E02 files)

+++++++++++++++++
