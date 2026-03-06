# Spec 29 — E02: API Routes, Event Emission, Deprecations & Dead Code Removal

**Version:** 1.0  
**Date:** 2026-03-03  
**Section:** E02 — API Routes & Cleanup  
**Prerequisites:** E01 (Database + Inngest Events + Shared Service + Inngest Functions) must be complete  
**Next:** E03 (UX Page Migration)

---

========================


## Agent Instructions

**Before starting any work, you MUST:**
1. Read this entire document — it contains pre-verified facts and explicit instructions
2. Read the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. Execute the instructions and specifications as written — do not re-investigate what has already been verified

---

## Platform Background

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application deployed on Vercel that generates high-quality AI training conversations for fine-tuning large language models.

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector) |
| Storage | Supabase Storage |
| AI — Generation | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) + Zustand |
| Background Jobs | Inngest (now 11 registered functions after E01) |
| Deployment | Vercel (frontend + API routes) |

**Key Route Structure:**
- Workbase pages live under `/workbase/[id]/`
- Batch generation page: `/workbase/[id]/fine-tuning/conversations/generate`
- Batch watcher page: `/workbase/[id]/fine-tuning/conversations/batch/[jobId]`

---

## What E01 Already Completed

E01 created the backend foundation. The following artifacts now exist:

| Artifact | Status |
|----------|--------|
| `batch_jobs.inngest_event_id` column | ✅ Created via SAOL |
| `batch_items.processing_started_at` column | ✅ Created via SAOL |
| `src/inngest/client.ts` — 3 new event types | ✅ `batch/job.created`, `batch/job.cancel.requested`, `batch/enrich.requested` |
| `src/lib/services/batch-item-processor.ts` | ✅ Shared processing service |
| `src/inngest/functions/process-batch-job.ts` | ✅ Core Inngest function |
| `src/inngest/functions/batch-enrich-conversations.ts` | ✅ Chunked enrichment function |
| `src/inngest/functions/index.ts` | ✅ 11 registered functions |

---

## What This Prompt Creates/Modifies

| # | Action | File |
|---|--------|------|
| 1 | Create `trigger-enrich` API route | `src/app/api/conversations/trigger-enrich/route.ts` (NEW) |
| 2 | Modify `generate-batch` route to emit Inngest event | `src/app/api/conversations/generate-batch/route.ts` |
| 3 | Modify `cancel` route to emit Inngest cancel event | `src/app/api/batch-jobs/[id]/cancel/route.ts` |
| 4 | Deprecate `process-next` route (return 410 Gone) | `src/app/api/batch-jobs/[id]/process-next/route.ts` |
| 5 | Deprecate `bulk-enrich` route (return 410 Gone) | `src/app/api/conversations/bulk-enrich/route.ts` |
| 6 | Remove dead code from batch-generation-service | `src/lib/services/batch-generation-service.ts` |
| 7 | Verify TypeScript compilation | `npx tsc --noEmit` |

**What This Prompt Does NOT Do:**
- Modify the batch watcher page UI (that's E03)
- Create any Inngest functions (that was E01)
- Change any database schema (that was E01)

---

## Implementation Sequence

Execute in this exact order:

---

### Task 1: Create `trigger-enrich` API Route

**File to create:** `src/app/api/conversations/trigger-enrich/route.ts`

This replaces `POST /api/conversations/bulk-enrich` for triggering enrichment. Instead of processing conversations synchronously in a single HTTP request (with a `.max(100)` limit), it emits chunked Inngest events. No upper limit on input size.

Create this file with exactly the following content:

```typescript
/**
 * API Route: Trigger Chunked Enrichment via Inngest
 *
 * POST /api/conversations/trigger-enrich
 *
 * Accepts any number of conversation IDs (no .max() limit),
 * chunks them into groups of 25, and emits one Inngest
 * 'batch/enrich.requested' event per chunk.
 *
 * Replaces POST /api/conversations/bulk-enrich which had a
 * .max(100) limit and synchronous processing within a single
 * Vercel function timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

const TriggerEnrichSchema = z.object({
  conversationIds: z.array(z.string().uuid()).min(1), // No .max() limit!
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { conversationIds } = TriggerEnrichSchema.parse(body);

    // Chunk into groups of 25
    const CHUNK_SIZE = 25;
    const events = [];

    for (let i = 0; i < conversationIds.length; i += CHUNK_SIZE) {
      events.push({
        name: 'batch/enrich.requested' as const,
        data: {
          conversationIds: conversationIds.slice(i, i + CHUNK_SIZE),
          userId: user.id,
          jobId: null, // Manual trigger, no associated batch job
        },
      });
    }

    // Send all events (Inngest supports up to 400 events per call)
    await inngest.send(events);

    return NextResponse.json({
      success: true,
      queued: conversationIds.length,
      chunks: events.length,
      message: `${conversationIds.length} conversations queued for enrichment in ${events.length} chunks`,
    });
  } catch (error) {
    console.error('[TriggerEnrich] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger enrichment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Event efficiency:** 108 conversations → 5 events (chunks of 25, 25, 25, 25, 8). 500 conversations → 20 events.

---

### Task 2: Modify `generate-batch` Route to Emit Inngest Event

**File:** `src/app/api/conversations/generate-batch/route.ts` (153 lines)

This route currently creates the batch job in the database and returns 202. After E01, we have the `processBatchJob` Inngest function ready to process jobs. We need to emit the `batch/job.created` event after successful job creation so Inngest picks it up.

#### 2a — Add `inngest` import

The file currently has these imports (lines 1-12):

```typescript
/**
 * API Route: Batch Conversation Generation
 * 
 * POST /api/conversations/generate-batch
 * Creates a batch generation job and starts processing in background
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { getBatchGenerationService } from '@/lib/services';
import type { BatchGenerationRequest } from '@/lib/services';
```

**Add** the following import after line 12 (after the `BatchGenerationRequest` import):

```typescript
import { inngest } from '@/inngest/client';
```

#### 2b — Emit `batch/job.created` event after successful job creation

Find the `console.log` line (approximately line 93):

```typescript
    console.log(`🚀 Started batch generation job: ${result.jobId}`);
```

**Replace** that single line with:

```typescript
    // Fire Inngest event to start background processing
    await inngest.send({
      name: 'batch/job.created',
      data: {
        jobId: result.jobId,
        userId,
        workbaseId: validated.workbaseId || null,
      },
    });

    console.log(`🚀 Started batch generation job: ${result.jobId} — Inngest event emitted`);
```

**Context for the edit — the surrounding code looks like this:**

```typescript
    // Start batch generation (returns immediately with job ID)
    const result = await batchService.startBatchGeneration(batchRequest);
    
    console.log(`🚀 Started batch generation job: ${result.jobId}`);
    
    // Return 202 Accepted with job info
    return NextResponse.json(
```

After the edit it should look like:

```typescript
    // Start batch generation (returns immediately with job ID)
    const result = await batchService.startBatchGeneration(batchRequest);
    
    // Fire Inngest event to start background processing
    await inngest.send({
      name: 'batch/job.created',
      data: {
        jobId: result.jobId,
        userId,
        workbaseId: validated.workbaseId || null,
      },
    });

    console.log(`🚀 Started batch generation job: ${result.jobId} — Inngest event emitted`);
    
    // Return 202 Accepted with job info
    return NextResponse.json(
```

> **Note:** The `startBatchGeneration()` call creates the `batch_jobs` and `batch_items` rows in the DB and returns `{ jobId, status, estimatedCost, estimatedTime }`. The Inngest event is emitted AFTER this succeeds, so if DB creation fails, no orphaned events exist.

---

### Task 3: Modify `cancel` Route to Emit Inngest Cancel Event

**File:** `src/app/api/batch-jobs/[id]/cancel/route.ts` (95 lines)

This route currently cancels the job in the database. After E01, the `processBatchJob` Inngest function has `cancelOn` configured to listen for `batch/job.cancel.requested`. We need to emit this event so the running Inngest function stops.

#### 3a — Add `inngest` import

The file currently has these imports (lines 1-10):

```typescript
/**
 * API Route: Cancel Batch Job
 * 
 * POST /api/batch-jobs/[id]/cancel
 * Cancel an active batch job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';
```

**Add** the following import after line 10 (after the `batchJobService` import):

```typescript
import { inngest } from '@/inngest/client';
```

#### 3b — Emit `batch/job.cancel.requested` event after DB cancellation

Find the existing cancellation code (approximately lines 61-63):

```typescript
    // Cancel the job (ownership already verified above)
    await batchJobService.cancelJob(id, user.id);

    console.log(`[CancelJob] Job ${id} cancelled successfully`);
```

**Add** the Inngest event emission between the `cancelJob` call and the `console.log`:

```typescript
    // Cancel the job (ownership already verified above)
    await batchJobService.cancelJob(id, user.id);

    // Signal Inngest to cancel the running function
    await inngest.send({
      name: 'batch/job.cancel.requested',
      data: {
        jobId: id,
        userId: user.id,
      },
    });

    console.log(`[CancelJob] Job ${id} cancelled successfully — Inngest cancel event emitted`);
```

Replace the original `console.log` line with the updated version that mentions the Inngest event.

---

### Task 4: Deprecate `process-next` Route

**File:** `src/app/api/batch-jobs/[id]/process-next/route.ts` (475 lines)

This route is being replaced by the `processBatchJob` Inngest function (created in E01). Instead of deleting the file (which would cause 404 errors for any lingering browser tabs), we replace the handler body with a 410 Gone response.

**Replace the ENTIRE file content with:**

```typescript
/**
 * API Route: Process Next Batch Item
 *
 * POST /api/batch-jobs/[id]/process-next
 *
 * @deprecated — Replaced by Inngest `processBatchJob` function.
 * Batch item processing now happens server-side via Inngest.
 * This route returns 410 Gone to inform any lingering clients.
 *
 * Previously: Browser-driven polling loop called this route to process
 * one batch item at a time. Now the entire batch is processed by Inngest
 * in the background without browser involvement.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated. Batch processing is now handled by Inngest background jobs.',
      status: 'deprecated',
      remainingItems: 0,
      progress: { total: 0, completed: 0, successful: 0, failed: 0, percentage: 0 },
    },
    { status: 410 }
  );
}
```

This keeps the route file so existing clients get a clear 410 error instead of a 404. The response shape mimics the original for backward compatibility of any parsing logic.

---

### Task 5: Deprecate `bulk-enrich` Route

**File:** `src/app/api/conversations/bulk-enrich/route.ts` (190 lines)

This route is being replaced by `POST /api/conversations/trigger-enrich` (created in Task 1 above). The new route has no `.max(100)` limit and uses chunked Inngest events.

**Replace the ENTIRE file content with:**

```typescript
/**
 * API Route: Bulk Conversation Enrichment
 *
 * POST /api/conversations/bulk-enrich
 *
 * @deprecated — Replaced by POST /api/conversations/trigger-enrich.
 * Enrichment now uses chunked Inngest events with no conversation limit.
 * This route returns 410 Gone to inform any lingering clients.
 *
 * Previously: Synchronously enriched up to 100 conversations in a single
 * Vercel function invocation. Now enrichment is handled by the
 * batchEnrichConversations Inngest function in chunks of 25.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated. Use POST /api/conversations/trigger-enrich instead.',
    },
    { status: 410 }
  );
}
```

---

### Task 6: Remove Dead Code from `batch-generation-service.ts`

**File:** `src/lib/services/batch-generation-service.ts` (674 lines)

The following code is dead or broken in Vercel's serverless environment and has been replaced by the Inngest `processBatchJob` function (E01). Remove these sections:

#### 6a — Update class JSDoc (top of file)

Find the current class JSDoc comment at the top of the file (approximately lines 1-16):

```typescript
/**
 * Batch Generation Service
 * 
 * Orchestrates batch conversation generation with concurrent processing,
 * progress tracking, and error handling.
 * 
 * Features:
 * - Concurrent conversation generation
 * - Real-time progress tracking
 * - Pause/Resume/Cancel controls
 * - Automatic retry on failures
 * - Cost estimation
 * - Auto-selection of templates when nil UUID is provided
 * 
 * @module batch-generation-service
 */
```

**Replace with:**

```typescript
/**
 * Batch Generation Service
 *
 * Orchestrates batch conversation generation job CREATION and configuration.
 * Job PROCESSING is now handled by the Inngest `processBatchJob` function
 * (src/inngest/functions/process-batch-job.ts).
 *
 * Active methods:
 * - startBatchGeneration() — Creates batch_jobs + batch_items rows in DB
 * - getJobStatus() — Returns current job progress
 * - cancelJob() — Cancels a running job
 * - estimateCost() — Returns cost/time estimates
 *
 * @deprecated The following methods have been removed (replaced by Inngest):
 *   - processJobInBackground (replaced by Inngest processBatchJob)
 *   - pauseJob, resumeJob (replaced by Inngest cancelOn)
 *   - processItem (extracted to batch-item-processor.ts)
 *
 * @module batch-generation-service
 */
```

#### 6b — Remove `ActiveJob` interface and `activeJobs` Map

Find the `ActiveJob` interface (approximately lines 107-113):

```typescript
/**
 * Active batch job tracker
 */
interface ActiveJob {
  jobId: string;
  status: 'processing' | 'paused';
  cancelRequested: boolean;
  pauseRequested: boolean;
}
```

**Delete** this entire interface block.

Find the `activeJobs` class property (approximately line 118):

```typescript
  private activeJobs = new Map<string, ActiveJob>();
```

**Delete** this line.

#### 6c — Remove `pauseJob` method

Find the `pauseJob` method (approximately lines 286-298):

```typescript
  /**
   * Pause a running job
   * 
   * @param jobId - Batch job UUID
   */
  async pauseJob(jobId: string): Promise<BatchJobStatus> {
    console.log(`[BatchGeneration] Pausing job ${jobId}`);
    
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.pauseRequested = true;
      activeJob.status = 'paused';
    }
    
    await batchJobService.updateJobStatus(jobId, 'paused');
    return this.getJobStatus(jobId);
  }
```

**Delete** this entire method.

#### 6d — Remove `resumeJob` method

Find the `resumeJob` method (approximately lines 304-328):

```typescript
  /**
   * Resume a paused job
   * 
   * @param jobId - Batch job UUID
   */
  async resumeJob(jobId: string): Promise<BatchJobStatus> {
    console.log(`[BatchGeneration] Resuming job ${jobId}`);
    
    const job = await batchJobService.getJobById(jobId);
    
    if (job.status !== 'paused') {
      throw new Error(`Job ${jobId} is not paused (current status: ${job.status})`);
    }
    
    await batchJobService.updateJobStatus(jobId, 'processing');
    
    // Restart processing
    const config = job.configuration || {};
    const configData = config as { concurrentProcessing?: number; errorHandling?: 'continue' | 'stop' };
    this.processJobInBackground(
      jobId,
      configData.concurrentProcessing || 3,
      configData.errorHandling || 'continue',
      '' // TODO: Add createdBy to BatchJob type
    ).catch(error => {
      console.error(`[BatchGeneration] Resume error for job ${jobId}:`, error);
    });
    
    return this.getJobStatus(jobId);
  }
```

**Delete** this entire method.

#### 6e — Remove `activeJobs` references from `cancelJob` method

Find the `cancelJob` method (approximately lines 330-350). It contains references to `this.activeJobs`:

```typescript
  async cancelJob(jobId: string): Promise<BatchJobStatus> {
    console.log(`[BatchGeneration] Cancelling job ${jobId}`);
    
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.cancelRequested = true;
    }
    
    // Cancel job (this also updates all pending items to cancelled)
    await batchJobService.cancelJob(jobId);
    
    this.activeJobs.delete(jobId);
    
    return this.getJobStatus(jobId);
  }
```

**Replace with** (remove all `activeJobs` references):

```typescript
  async cancelJob(jobId: string): Promise<BatchJobStatus> {
    console.log(`[BatchGeneration] Cancelling job ${jobId}`);
    
    // Cancel job (this also updates all pending items to cancelled)
    await batchJobService.cancelJob(jobId);
    
    return this.getJobStatus(jobId);
  }
```

#### 6f — Remove `processJobInBackground` method

Find the `processJobInBackground` method (approximately lines 467-555):

```typescript
  private async processJobInBackground(
    jobId: string, 
    concurrency: number, 
    errorHandling: 'stop' | 'continue',
    userId: string
  ): Promise<void> {
    // ... entire method body (approximately 88 lines) ...
  }
```

**Delete** this entire method (from the JSDoc comment above it through the closing `}`).

#### 6g — Remove `processItem` method

Find the `processItem` method (approximately lines 564-670):

```typescript
  private async processItem(jobId: string, item: any, userId: string): Promise<void> {
    // ... entire method body ...
  }
```

**Delete** this entire method (from the JSDoc comment above it through the closing `}`).

#### 6h — Clean up imports

After removing the dead code, check if the following imports at the top of the file are still needed:
- `getConversationGenerationService` — Still used? Check if `startBatchGeneration` references it. If not, remove the import.
- `TruncatedResponseError`, `UnexpectedStopReasonError` — Only used in `processItem` which was removed. **Delete** these imports.
- `conversationService` — Check if still used. If only used in dead code, remove.

The imports to keep:
- `batchJobService` — still used for job creation, status, cancel
- `createServerSupabaseAdminClient` — may still be used in remaining methods
- `TierType` — still used in type definitions

---

### Task 7: Verify TypeScript Compilation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit
```

Fix any TypeScript errors. Common issues to watch for:
- Removed methods still referenced elsewhere (search codebase for `pauseJob`, `resumeJob`, `processJobInBackground` to confirm no other callers)
- Import cleanups in `batch-generation-service.ts`
- The `inngest` import in modified routes matching the path `@/inngest/client`

---

## Success Criteria for E02

- [ ] `POST /api/conversations/trigger-enrich` accepts any number of conversation IDs and emits chunked Inngest events
- [ ] `POST /api/conversations/generate-batch` emits `batch/job.created` Inngest event after DB job creation
- [ ] `POST /api/batch-jobs/[id]/cancel` emits `batch/job.cancel.requested` Inngest event after DB cancellation
- [ ] `POST /api/batch-jobs/[id]/process-next` returns 410 Gone with deprecation message
- [ ] `POST /api/conversations/bulk-enrich` returns 410 Gone with deprecation message
- [ ] `batch-generation-service.ts` has no dead code (`activeJobs`, `pauseJob`, `resumeJob`, `processJobInBackground`, `processItem` all removed)
- [ ] `npx tsc --noEmit` passes with zero errors

---

## Files Created by E02

| File | Purpose |
|------|---------|
| `src/app/api/conversations/trigger-enrich/route.ts` | Chunked enrichment trigger via Inngest events |

## Files Modified by E02

| File | Change |
|------|--------|
| `src/app/api/conversations/generate-batch/route.ts` | Added inngest import + emit `batch/job.created` event |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | Added inngest import + emit `batch/job.cancel.requested` event |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | Replaced with 410 Gone deprecation response |
| `src/app/api/conversations/bulk-enrich/route.ts` | Replaced with 410 Gone deprecation response |
| `src/lib/services/batch-generation-service.ts` | Removed dead code: `ActiveJob`, `activeJobs`, `pauseJob`, `resumeJob`, `processJobInBackground`, `processItem` |

---

**END OF E02 PROMPT — Proceed to E03 for UX page migration.**


+++++++++++++++++



