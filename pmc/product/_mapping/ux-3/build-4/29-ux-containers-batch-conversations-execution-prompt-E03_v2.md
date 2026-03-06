# Spec 29 — E03: Batch Watcher Page — Convert to Pure Status Viewer

**Version:** 2.0  
**Date:** 2026-03-04  
**Section:** E03 — UX Page Migration  
**Prerequisites:** E01 (Backend Foundation) and E02 (API Routes & Deprecations) must be complete  
**Completes:** Spec 29 — Batch Conversation Pipeline Inngest Migration  
**Change log (v2):** Post-E02 verification pass. Updated E01/E02 completed artifacts table to include `batch/[id]` deprecation and test file cleanup. Removed confusing double-replacement pattern in Task 1 (now shows single correct import block). Fixed TypeScript compilation command to use `--project src/tsconfig.json` (matches E02). Updated Complete File Inventory to include all E02 artifacts. Verified all "current code" blocks against post-E02 codebase (756 lines). Minor wording tightened.

---

========================


## Agent Instructions

**Before starting any work, you MUST:**
1. Read this entire document — it contains pre-verified facts and explicit instructions
2. Read the file `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` (756 lines) in full to confirm the exact current state
3. Execute the instructions and specifications as written — do not re-investigate what has already been verified

---

## Platform Background

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application deployed on Vercel.

**Design Token Rules — STRICT. All new/modified code MUST use:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary`, `text-primary-foreground`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` in new or modified code**

---

## What E01 and E02 Already Completed

| Artifact | Status |
|----------|--------|
| `batch_jobs.inngest_event_id` column | ✅ Created via SAOL |
| `batch_items.processing_started_at` column | ✅ Created via SAOL |
| `src/inngest/client.ts` — 3 new event types | ✅ `batch/job.created`, `batch/job.cancel.requested`, `batch/enrich.requested` |
| `src/lib/services/batch-item-processor.ts` | ✅ Created — shared processing service |
| `src/inngest/functions/process-batch-job.ts` | ✅ Created — core Inngest function |
| `src/inngest/functions/batch-enrich-conversations.ts` | ✅ Created — chunked enrichment |
| `src/inngest/functions/index.ts` | ✅ 11 registered functions |
| `src/app/api/conversations/trigger-enrich/route.ts` | ✅ Created — Inngest-backed enrichment trigger |
| `src/app/api/conversations/generate-batch/route.ts` | ✅ Emits `batch/job.created` Inngest event |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | ✅ Emits `batch/job.cancel.requested` Inngest event |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | ✅ Returns 410 Gone |
| `src/app/api/conversations/bulk-enrich/route.ts` | ✅ Returns 410 Gone |
| `src/app/api/conversations/batch/[id]/route.ts` | ✅ Returns 410 Gone (PATCH pause/resume/cancel) |
| `src/lib/services/batch-generation-service.ts` | ✅ Dead code removed (pauseJob, resumeJob, processItem, etc.) |
| `src/lib/services/__tests__/batch-generation-service.test.ts` | ✅ Dead tests removed (pauseJob, resumeJob blocks) |

**All backend work is done.** This prompt focuses exclusively on the batch watcher page UI.

---

## What This Prompt Modifies

| # | Action | File |
|---|--------|------|
| 1 | Convert batch watcher page from processing driver to status viewer | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` |
| 2 | Verify TypeScript compilation | `npx tsc --noEmit --project src/tsconfig.json` |

---

## Problem Statement

The batch watcher page (`page.tsx`, 756 lines) currently drives batch processing via a browser-based `while` loop that calls `POST /api/batch-jobs/[id]/process-next`. This architecture breaks when:
- The browser tab is closed
- The user navigates away
- The browser sleeps (laptop lid close)
- Vercel redeploys kill in-flight functions

Now that E01 and E02 have moved all processing to Inngest, the page must become a **pure status viewer** that only polls for status and displays results. The processing loop is entirely removed.

**Routes the page currently calls and their post-E02 status:**
| Route | Method | Status | Action |
|-------|--------|--------|--------|
| `/api/conversations/batch/${jobId}/status` | GET | ✅ Active | Keep — status polling |
| `/api/conversations/batch/${jobId}/items` | GET | ✅ Active | Keep — fetch completed items for enrichment |
| `/api/batch-jobs/${jobId}/process-next` | POST | ❌ 410 Gone | Remove all calls |
| `/api/conversations/batch/${jobId}` | PATCH | ❌ 410 Gone | Remove all calls (pause/resume) |
| `/api/batch-jobs/${jobId}/cancel` | POST | ✅ Active | Keep — cancel now emits Inngest event |
| `/api/conversations/bulk-enrich` | POST | ❌ 410 Gone | Replace with `/api/conversations/trigger-enrich` |

---

## Implementation — All Sub-Tasks

The file to modify is:
**`src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`** (756 lines)

Read the entire file before starting. The changes below reference specific line numbers based on the current file state. If lines have shifted, locate the referenced code by content matching.

---

### Task 1: Clean Up Imports (Lines 10-22)

**Current lucide-react imports (lines 10-22):**

```tsx
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
```

**Replace with** (remove `Play` and `StopCircle` — no longer used; keep `Pause` because legacy jobs may still have `paused` status and the Progress Card header at line 460 uses `{isPaused && <Pause className="h-5 w-5 text-yellow-600" />}`):

```tsx
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Ban,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
```

---

### Task 2: Remove Processing State Variables (Lines 62-68)

**Current state declarations (lines 62-68):**

```tsx
  // Processing state — mirrors legacy page exactly
  const [processingActive, setProcessingActive] = useState(false);
  const processingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const didProcessRef = useRef(false);
  const autoEnrichTriggeredRef = useRef(false);
  const [lastItemError, setLastItemError] = useState<string | null>(null);
```

**Replace with:**

```tsx
  // Auto-enrich tracking
  const autoEnrichTriggeredRef = useRef(false);
```

This removes:
- `processingActive` / `setProcessingActive` — no longer driving processing
- `processingRef` — no longer driving processing  
- `autoStartedRef` — no longer auto-starting browser loop
- `didProcessRef` — no longer tracking if page processed items
- `lastItemError` / `setLastItemError` — no longer showing per-item errors from browser loop (only referenced inside removed `processNextItem` callback)

---

### Task 3: Remove Processing Callbacks (Lines ~109-185)

**Remove the entire `processNextItem` callback** (approximately lines 108-160):

```tsx
  const processNextItem = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/batch-jobs/${jobId}/process-next`, {
        method: 'POST',
      });
      // ... entire function body ...
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing error';
      setLastItemError(errorMsg);
      return false;
    }
  }, [jobId]);
```

**Remove the entire `startProcessing` callback** (approximately lines 162-181):

```tsx
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
```

**Remove the entire `stopProcessing` callback** (approximately lines 183-185):

```tsx
  const stopProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);
```

Also remove the section comment above `processNextItem`:

```tsx
  // ─── Processing loop ───────────────────────────────────────────────────────
```

---

### Task 4: Replace Effects (Lines ~188-230)

#### 4a — Keep the initial fetchStatus effect (line ~189)

```tsx
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);
```

This stays unchanged.

#### 4b — Keep the safety timer effect (lines ~192-200)

```tsx
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
```

This stays unchanged.

#### 4c — Remove the auto-start processing effect (approximately lines 203-213)

**Delete this entire effect:**

```tsx
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
```

#### 4d — Replace the auto-enrich effect (approximately lines 216-228)

**Find the current auto-enrich effect:**

```tsx
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
```

**Replace with** (remove `processingActive` and `didProcessRef` guards — now triggers whenever batch completes regardless of which page processed it):

```tsx
  // Auto-enrich when batch completes (fire-and-forget via Inngest)
  useEffect(() => {
    if (
      status?.status === 'completed' &&
      status.progress.successful > 0 &&
      !autoEnrichTriggeredRef.current &&
      !enriching &&
      !enrichResult
    ) {
      autoEnrichTriggeredRef.current = true;
      handleEnrichAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status]);
```

#### 4e — Add polling effect (add AFTER the safety timer effect, BEFORE the auto-enrich effect)

Add a new effect right after the safety timer effect:

```tsx
  // Poll status every 3 seconds while job is active
  useEffect(() => {
    const isActive =
      status?.status === 'queued' ||
      status?.status === 'processing';

    if (!isActive) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [status?.status, fetchStatus]);
```

This replaces the browser processing loop as the mechanism for updating the UI. The page polls every 3 seconds while the job is active.

---

### Task 5: Simplify `handleAction` Function (Lines ~232-270)

**Find the current `handleAction` function:**

```tsx
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
```

**Replace with** (cancel-only, no pause/resume, no stopProcessing call, no PATCH to deprecated route):

```tsx
  const handleAction = async (action: 'cancel') => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/batch-jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel job');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };
```

---

### Task 6: Rewire `handleEnrichAll` to Use `trigger-enrich` (Lines ~279-320)

**Find the current `handleEnrichAll` function:**

```tsx
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
```

**Replace with** (uses new `trigger-enrich` endpoint instead of deprecated `bulk-enrich`):

```tsx
  const handleEnrichAll = async () => {
    if (!status || status.status !== 'completed') return;

    try {
      setEnriching(true);
      setEnrichResult(null);

      // Fetch all completed items to get conversation IDs
      const response = await fetch(
        `/api/conversations/batch/${jobId}/items?status=completed`
      );
      const items = await response.json();
      if (!response.ok) throw new Error(items.error || 'Failed to fetch batch items');

      const conversationIds =
        items.data
          ?.map((item: { conversation_id: string | null }) => item.conversation_id)
          .filter(Boolean) || [];

      if (conversationIds.length === 0) {
        setEnrichResult({ successful: 0, failed: 0, skipped: 0, total: 0 });
        return;
      }

      // Fire chunked Inngest events (no batch limit, no timeout risk)
      const enrichResponse = await fetch('/api/conversations/trigger-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds }),
      });

      const enrichData = await enrichResponse.json();
      if (!enrichResponse.ok) throw new Error(enrichData.error || 'Enrichment failed');

      setEnrichResult({
        successful: 0,
        failed: 0,
        skipped: 0,
        total: conversationIds.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };
```

**Key differences from the old version:**
- Calls `/api/conversations/trigger-enrich` instead of deprecated `/api/conversations/bulk-enrich`
- No `.max(100)` limit — any number of conversations are accepted
- Returns immediately after queuing (Inngest processes asynchronously)
- `enrichResult` reflects queued count, not synchronous completion

---

### Task 7: Update Actions Card JSX (Lines ~557-596)

**Find the Actions Card content block.** The current JSX inside `<CardContent>` looks like this:

```tsx
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
```

**Replace the entire `<CardContent>` with:**

```tsx
        <CardContent className="flex flex-wrap gap-3">
          {(status.status === 'processing' || status.status === 'queued') && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing in background...
            </Badge>
          )}

          {isActive && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
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
```

Changes:
- Removed "Processing..." badge that depended on `processingActive`
- Removed "Stop" button (no browser processing to stop)
- Removed "Resume Processing" button (no browser processing to restart)
- Added "Processing in background..." badge for active jobs (`queued` or `processing`)
- Removed `processingActive` guard from Cancel button's `disabled` prop
- Changed Cancel button condition from `isActive || isPaused` to just `isActive`

---

### Task 8: Update Enrichment Result Display (Lines ~623-633)

**Find the enrichment result display in the Completion Card:**

```tsx
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
```

**Replace with** (async-aware wording):

```tsx
            {enrichResult && (
              <div className="p-3 rounded-md bg-muted border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Enrichment Queued
                </p>
                <p className="text-xs text-muted-foreground">
                  {enrichResult.total} conversation{enrichResult.total !== 1 ? 's' : ''} queued for enrichment — processing in background
                </p>
              </div>
            )}
```

Since enrichment is now async via Inngest, we show "queued" status instead of "complete" counts.

---

### Task 9: Verify TypeScript Compilation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit --project src/tsconfig.json 2>&1 | head -60
```

Common errors to fix:
- References to `processingActive` in JSX that were missed
- References to `stopProcessing` or `startProcessing` in JSX that were missed
- `Play` or `StopCircle` still in imports but removed from JSX (or vice versa)
- `handleAction` type parameter change from `'pause' | 'resume' | 'cancel'` to `'cancel'`

If you see remaining references to removed variables, search the entire file for:
- `processingActive`
- `processingRef`
- `autoStartedRef`
- `didProcessRef`
- `lastItemError`
- `processNextItem`
- `startProcessing`
- `stopProcessing`

All of these should have NO references remaining in the file.

---

## Summary of All Changes to page.tsx

| Area | What Changed |
|------|-------------|
| Imports | Removed `Play`, `StopCircle` from lucide-react (kept `Pause` for legacy paused-state rendering) |
| State | Removed 5 state/ref variables (`processingActive`, `processingRef`, `autoStartedRef`, `didProcessRef`, `lastItemError`), kept only `autoEnrichTriggeredRef` |
| Callbacks | Removed `processNextItem`, `startProcessing`, `stopProcessing` |
| Effects | Removed auto-start effect; simplified auto-enrich effect; added 3s polling effect |
| `handleAction` | Simplified to cancel-only (removed pause/resume branches, removed `stopProcessing` call) |
| `handleEnrichAll` | Rewired to `/api/conversations/trigger-enrich` (was `/api/conversations/bulk-enrich`) |
| Actions Card | Replaced processing UI with "Processing in background..." badge; removed Stop/Resume buttons |
| Enrichment display | Changed from "Enrichment Complete" to "Enrichment Queued" with conversation count |

---

## Success Criteria for E03

- [ ] Page has NO references to `processNextItem`, `startProcessing`, `stopProcessing`
- [ ] Page has NO references to `processingActive`, `processingRef`, `autoStartedRef`, `didProcessRef`, `lastItemError`
- [ ] Page does NOT import `Play` or `StopCircle` from lucide-react
- [ ] Page polls every 3 seconds while job is `queued` or `processing`
- [ ] "Processing in background..." badge shown for active jobs
- [ ] Only "Cancel Job" button visible (no "Stop", "Resume Processing")
- [ ] "Enrich All" calls `/api/conversations/trigger-enrich` (not `/api/conversations/bulk-enrich`)
- [ ] Enrichment result displays "Enrichment Queued" with conversation count
- [ ] Auto-enrich triggers on completion without requiring `didProcessRef`
- [ ] `npx tsc --noEmit --project src/tsconfig.json` passes with zero errors

---

## Acceptance Criteria — Full E2E Verification

After completing E01, E02, and E03, verify:

### AC1: Batch Generation Works Without Browser
1. Navigate to `/workbase/[id]/fine-tuning/conversations/generate`
2. Select personas, arcs, and topics — submit a batch of 5 conversations
3. After navigating to the batch watcher page, **close the browser tab immediately**
4. Wait 2 minutes, then reopen the batch watcher page
5. **Expected:** The batch job has progressed — conversations were generated despite the tab being closed
6. **Expected:** Job status shows accurate progress from DB (not stale client state)

### AC2: Batch Watcher is Status-Only
1. Open the batch watcher page for a running job
2. **Expected:** No "Stop" or "Resume Processing" buttons — only "Cancel Job" for active jobs
3. **Expected:** "Processing in background..." badge shown for active jobs
4. **Expected:** Progress bar updates every 3 seconds via polling
5. **Expected:** When job completes, auto-enrich fires automatically

### AC3: Cancel Works via Inngest
1. Start a batch job (5+ items)
2. While it's processing (check Inngest dashboard), click "Cancel Job"
3. **Expected:** Job transitions to cancelled state
4. **Expected:** No further items are processed after cancellation

### AC4: Enrichment Has No Limit
1. Complete a batch job with 100+ conversations
2. Click "Enrich All" (or let auto-enrich trigger)
3. **Expected:** All conversations are queued for enrichment (no .max(100) error)
4. **Expected:** Enrichment result shows "X conversations queued for enrichment — processing in background"

---

## Files Modified by E03

| File | Change |
|------|--------|
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | Removed processing loop; converted to polling-only status viewer; rewired enrichment |

---

## Complete Spec 29 File Inventory

### Files Created (4)

| File | Created In |
|------|-----------|
| `src/lib/services/batch-item-processor.ts` | E01 |
| `src/inngest/functions/process-batch-job.ts` | E01 |
| `src/inngest/functions/batch-enrich-conversations.ts` | E01 |
| `src/app/api/conversations/trigger-enrich/route.ts` | E02 |

### Files Modified (9)

| File | Modified In | Change |
|------|------------|--------|
| `src/inngest/client.ts` | E01 | Added 3 event types |
| `src/inngest/functions/index.ts` | E01 | 11 registered functions |
| `src/app/api/conversations/generate-batch/route.ts` | E02 | Emits `batch/job.created` Inngest event |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | E02 | Emits `batch/job.cancel.requested` Inngest event |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | E02 | Deprecated → 410 Gone |
| `src/app/api/conversations/bulk-enrich/route.ts` | E02 | Deprecated → 410 Gone |
| `src/app/api/conversations/batch/[id]/route.ts` | E02 | Deprecated → 410 Gone (PATCH pause/resume/cancel) |
| `src/lib/services/batch-generation-service.ts` | E02 | Dead code removed |
| `src/lib/services/__tests__/batch-generation-service.test.ts` | E02 | Dead tests removed |

### File Modified by E03 (1)

| File | Modified In | Change |
|------|------------|--------|
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | E03 | Converted from processing driver to polling status viewer |

### Database Changes (2)

| Table | Column | Created In |
|-------|--------|-----------|
| `batch_jobs` | `inngest_event_id TEXT` | E01 |
| `batch_items` | `processing_started_at TIMESTAMPTZ` | E01 |

---

**END OF E03 PROMPT — Spec 29 implementation is complete after this epoch.**


+++++++++++++++++
