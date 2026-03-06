# 29 — Batch Conversation Pipeline: Inngest Migration Requirements

## v2 — Requirements Document

**Date:** 2026-03-04  
**Scope:** Migrate the entire batch conversation generation and enrichment pipeline from browser-driven polling to Inngest-managed background jobs  
**Priority:** Critical — current architecture causes data loss on page close, browser sleep, and Vercel redeployments  
**Related:** [28 — Enrich Bug Analysis](file:///C:/Users/james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\28-ux-containers-enrich-bug_v1.md)

> [!IMPORTANT]
> **v2 Change (from v1):** Enrichment now uses **chunked batch events** (25 conversations per Inngest event) instead of 1 event per conversation. This reduces Inngest event count by ~96% (e.g., 108 conversations = 5 events instead of 108). See [Section 7](#7-enrichment-strategy-chunked-batch-model) for details.

---

## Table of Contents

1. [Application Context](#1-application-context)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Identified Problems](#3-identified-problems)
4. [Proposed Architecture](#4-proposed-architecture)
5. [New Inngest Event Definitions](#5-new-inngest-event-definitions)
6. [New Inngest Function: `processBatchJob`](#6-new-inngest-function-processbatchjob)
7. [Enrichment Strategy: Chunked Batch Model](#7-enrichment-strategy-chunked-batch-model)
8. [API Route Changes](#8-api-route-changes)
9. [Frontend Changes](#9-frontend-changes)
10. [Database Changes (SAOL)](#10-database-changes-saol)
11. [Files to Modify and Create](#11-files-to-modify-and-create)
12. [Verification Plan](#12-verification-plan)
13. [Inngest Event Budget Analysis](#13-inngest-event-budget-analysis)

---

## 1. Application Context

**Bright Run LoRA Training Data Platform** — A Next.js 14 (App Router) application deployed on Vercel that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector) |
| Storage | Supabase Storage |
| AI — Generation | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) + Zustand |
| Background Jobs | Inngest (currently 9 registered functions) |
| Deployment | Vercel (frontend + API routes) |
| DB Operations | **SAOL (mandatory for agent terminal/script DB ops)** — `supa-agent-ops/` |

### SAOL Rules

All database schema changes (DDL) MUST use the Supabase Agent Ops Library:

- **Library location:** `C:\Users\james\Master\BrightHub\BRun\train-data\supa-agent-ops\`
- **Reference docs:** `QUICK_START.md`, `EXAMPLES.md`
- Always `dryRun: true` first, then `dryRun: false` to apply
- Transport: `'pg'` for DDL operations
- SAOL is for agent terminal/script ops only — application code (Inngest, API routes) uses `createServerSupabaseAdminClient()`

### Codebase Structure (Relevant Paths)

```
v4-show/src/
├── app/
│   ├── (dashboard)/workbase/[id]/fine-tuning/conversations/
│   │   ├── generate/page.tsx                   # Batch configuration UI
│   │   └── batch/
│   │       ├── page.tsx                         # Batch job list page
│   │       └── [jobId]/page.tsx                 # Batch job watcher (756 lines)
│   └── api/
│       ├── batch-jobs/
│       │   ├── route.ts                         # List batch jobs
│       │   └── [id]/
│       │       ├── cancel/route.ts              # Cancel batch job
│       │       └── process-next/route.ts        # Process ONE item (475 lines)
│       ├── conversations/
│       │   ├── generate/route.ts                # Single conversation generation
│       │   ├── generate-batch/route.ts          # Create batch job (no processing)
│       │   ├── bulk-enrich/route.ts             # Bulk enrichment (HAS .max(100) BUG)
│       │   └── batch/[jobId]/
│       │       ├── status/route.ts              # Get batch job status
│       │       └── items/route.ts               # Get batch items
│       └── inngest/route.ts                     # Inngest webhook (serves all functions)
├── inngest/
│   ├── client.ts                                # Inngest client + event type definitions
│   └── functions/
│       ├── index.ts                             # 9 registered functions
│       ├── auto-enrich-conversation.ts          # Per-conversation enrichment (62 lines)
│       ├── auto-deploy-adapter.ts
│       ├── build-training-set.ts
│       ├── dispatch-training-job.ts
│       ├── process-rag-document.ts
│       ├── rebuild-training-set.ts
│       ├── refresh-inference-workers.ts
│       └── restart-inference-workers.ts
├── lib/services/
│   ├── batch-generation-service.ts              # Batch orchestrator (674 lines) — DEAD CODE
│   ├── batch-job-service.ts                     # DB CRUD for batch_jobs/batch_items (685 lines)
│   ├── conversation-generation-service.ts       # Claude API orchestrator (989 lines)
│   ├── conversation-enrichment-service.ts       # Field enrichment (691 lines)
│   ├── enrichment-pipeline-orchestrator.ts      # 5-stage enrichment (305 lines)
│   ├── conversation-storage-service.ts          # Supabase Storage I/O
│   ├── scaffolding-data-service.ts              # Persona/Arc/Topic DB lookups
│   ├── parameter-assembly-service.ts            # Resolve scaffolding → template vars
│   └── template-selection-service.ts            # Auto-select prompt templates
└── types/
    └── bulk-generator.types.ts                  # ParameterSet type definition
```

### Existing Database Tables

| Table | Purpose |
|-------|---------|
| `batch_jobs` | Batch job metadata (status, progress, configuration) |
| `batch_items` | Individual items within a batch (status, parameters, conversation_id FK) |
| `conversations` | Generated conversations (raw JSON path, enrichment status) |
| `prompt_templates` | Templates used for Claude API calls |
| `emotional_arcs` | Emotional journey definitions |
| `client_personas` | Client personality profiles |
| `training_topics` | Conversation topic definitions |

### Existing Inngest Functions (9 registered)

| Function | Event Trigger | Purpose |
|----------|--------------|---------|
| `processRAGDocument` | `rag/document.uploaded` | 6-pass RAG ingestion |
| `dispatchTrainingJob` | `pipeline/job.created` | Send training to RunPod |
| `dispatchTrainingJobFailureHandler` | (failure handler) | Handle training failures |
| `autoDeployAdapter` | `pipeline/adapter.ready` | Deploy adapter to RunPod |
| `refreshInferenceWorkers` | `pipeline/adapter.deployed` | Cycle workers after deploy |
| `restartInferenceWorkers` | `pipeline/endpoint.restart.requested` | Manual worker restart |
| `autoEnrichConversation` | `conversation/generation.completed` | Enrich single conversation |
| `buildTrainingSet` | `training/set.created` | Aggregate JSONL training set |
| `rebuildTrainingSet` | (variant of above) | Rebuild existing training set |

---

## 2. Current Architecture Analysis

### The Flow (Browser-Driven)

```
┌─────────────────┐     ┌─────────────────────────┐
│  Generate Page   │────▶│ POST /api/conversations/ │
│  (generate/      │     │ generate-batch           │
│   page.tsx)      │     └───────────┬─────────────┘
└─────────────────┘                 │
                                     ▼
                          ┌─────────────────────┐
                          │ batch-generation-    │
                          │ service.ts           │
                          │ .startBatchGeneration│
                          │                     │
                          │ Creates batch_jobs + │
                          │ batch_items rows     │
                          │ Returns job ID       │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │ Router navigates to  │
                          │ batch/[jobId]/       │
                          │ page.tsx             │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │    CLIENT-SIDE while LOOP       │
                    │    (L160-182 of page.tsx)       │
                    │                                 │
                    │  while (hasMore && iterations   │
                    │  < 1000) {                      │
                    │    POST /api/batch-jobs/[id]/   │
                    │    process-next                 │
                    │    await sleep(500ms)           │
                    │  }                              │
                    └────────────────┬────────────────┘
                                     │ (per item)
                    ┌────────────────▼────────────────┐
                    │  process-next/route.ts          │
                    │  (475 lines per invocation)     │
                    │                                 │
                    │  1. Get next queued batch_item  │
                    │  2. Resolve scaffolding data    │
                    │  3. Auto-select template        │
                    │  4. Call Claude API             │
                    │  5. Parse response              │
                    │  6. Store raw JSON              │
                    │  7. Update batch_item status    │
                    │  8. Return progress             │
                    └────────────────┬────────────────┘
                                     │ (after ALL items)
                    ┌────────────────▼───────────────────┐
                    │  Auto-enrich effect (L220-234)     │
                    │  OR manual "Enrich All" button     │
                    │                                    │
                    │  → POST /api/conversations/        │
                    │    bulk-enrich                      │
                    │    (.max(100) — BUG #28)            │
                    └────────────────────────────────────┘
```

### Key Properties of Current Architecture

| Property | Current State | Problem |
|----------|--------------|---------|
| **Processing driver** | Browser `while` loop | Stops when page closes, browser sleeps, or tab changes |
| **Processing per request** | 1 item per HTTP call | Massive overhead: auth + DB fetch + template lookup per item |
| **State management** | In-memory `Map<string, ActiveJob>` in `BatchGenerationService` | Lost on cold start (Vercel serverless) |
| **Pause/Resume** | Sets `pauseRequested` flag in memory | Flag is lost on cold start — resume restarts from scratch |
| **Enrichment trigger** | Client-side auto-trigger after all items complete | Misses if page closed before completion |
| **Error recovery** | None — must manually restart | No retry logic, no checkpointing |
| **Deployment resilience** | Zero | Vercel redeployment kills all in-flight functions |
| **Progress tracking** | Client polls + updates UI | Accurate only while page is open |
| **Max batch size** | Unlimited (items), 100 (enrich) | Enrichment hard-fails at >100 conversations |

### Critical Code Locations

**`batch-generation-service.ts` L222-228 — Developer comments confirm the problem:**
```typescript
// NOTE: We no longer start background processing here!
// Instead, the client must poll /api/batch-jobs/[id]/process-next
// This is required because Vercel serverless functions terminate
// after sending the HTTP response, killing any background promises.
//
// The old code that doesn't work in Vercel:
// this.processJobInBackground(batchJob.id, ...).catch(...);
```

**`batch/[jobId]/page.tsx` L160-182 — The browser processing loop:**
```typescript
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

---

## 3. Identified Problems

### Problem 1: Browser-Dependent Processing

The entire batch generation pipeline runs through a browser `while` loop that calls `POST /api/batch-jobs/[id]/process-next` one item at a time. This fails when:

- **User closes the tab** — processing stops immediately with no recovery
- **Browser goes to sleep** — macOS/Windows power management suspends the tab
- **User navigates away** — the component unmounts, stopping the loop
- **Laptop lid closed** — all network activity suspends
- **4+ hour pauses** — as experienced by the user in the reported bug

### Problem 2: Vercel Redeployment Vulnerability

Every `git push` triggers a Vercel redeployment that kills all in-flight serverless function instances. Since the `process-next` route handles one item per call (~12-30s each), any deployment during batch processing kills the current item and the browser must restart the loop.

### Problem 3: Enrichment Hard Limit (Bug #28)

The `POST /api/conversations/bulk-enrich` route has `.max(100)` in its Zod schema (L19 of `bulk-enrich/route.ts`). Batches with >100 conversations cannot be enriched via the "Enrich All" button. Additionally, the enrichment processes all conversations synchronously in a single HTTP request with a 60s Vercel timeout.

### Problem 4: No Auto-Enrich During Batch Generation

The `conversation/generation.completed` Inngest event is ONLY emitted in the single `POST /api/conversations/generate` route (L103-106 of `generate/route.ts`). The batch `process-next/route.ts` does NOT emit this event — so individually-generated batch items never trigger auto-enrichment during batch processing. Enrichment only happens after the batch completes (via the client-side effect or manual button).

### Problem 5: Dead Code and Architectural Confusion

`batch-generation-service.ts` contains a `processJobInBackground` method (L459-555) that is dead code — it cannot work in Vercel's serverless environment. The active job tracking (`Map<string, ActiveJob>`) at L118 is also useless since Vercel cold-starts create new instances. The `resumeJob` method at L299-328 still tries to call `processJobInBackground`, which would silently fail.

### Problem 6: No Concurrency Control

The browser loop processes items one-at-a-time (sequential). The `process-next` route grabs the first queued item and processes it. There is no parallelism despite the batch job configuration supporting it (`concurrentProcessing: 3`).

### Problem 7: Inngest Event Quota Risk (v1 Design Flaw)

The v1 spec proposed emitting 1 `conversation/generation.completed` Inngest event per conversation for enrichment. For a batch of 108 conversations, this would consume 108 events just for enrichment. In a production environment with multiple customers generating batches, this scales linearly and could rapidly exhaust Inngest event quotas.

---

## 4. Proposed Architecture

### Design Principles

1. **All batch processing moves to Inngest** — the browser becomes purely a status viewer
2. **Enrichment uses chunked batches** — 1 Inngest event processes up to 25 conversations (not 1:1)
3. **Events are a precious resource** — minimize event count while maintaining reliability

```
┌──────────────────┐    ┌──────────────────────────┐
│  Generate Page   │───▶│ POST /api/conversations/  │
│  (unchanged)     │    │ generate-batch             │
└──────────────────┘    └───────────┬──────────────┘
                                    │
                          ┌─────────▼─────────────┐
                          │ Creates batch_jobs +   │
                          │ batch_items rows       │
                          │                        │
                          │ inngest.send(          │
                          │ 'batch/job.created')   │  ← 1 event
                          └─────────┬─────────────┘
                                    │
                          ┌─────────▼─────────────────────────┐
                          │  Inngest: processBatchJob          │
                          │  (NEW FUNCTION)                    │
                          │                                    │
                          │  Step 1: Fetch job + items         │
                          │  Step 2..N: Process items          │
                          │    ├─ Resolve scaffolding          │
                          │    ├─ Auto-select template         │
                          │    ├─ Call Claude API              │
                          │    ├─ Store conversation           │
                          │    └─ Update batch_item status     │
                          │  Step N+1: Emit enrichment events  │
                          │    └─ 1 event per 25 conversations │ ← chunked
                          │  Step N+2: Mark job complete       │
                          └─────────┬─────────────────────────┘
                                    │ (per chunk of ≤25)
                          ┌─────────▼────────────────────────┐
                          │  Inngest: batchEnrichConversations│
                          │  (NEW — replaces autoEnrich 1:1) │
                          │                                   │
                          │  Receives ≤25 conversation IDs    │
                          │  Processes each in its own        │
                          │  step.run() for checkpointing     │
                          └───────────────────────────────────┘

┌──────────────────────────────────────┐
│  Batch Watcher Page                  │
│  (SIMPLIFIED — status viewer only)   │
│                                      │
│  Polls GET /api/conversations/       │
│  batch/[jobId]/status                │
│  every 3 seconds                     │
│                                      │
│  No processing loop                  │
│  No process-next calls               │
│  Shows progress from DB              │
│  Cancel button → PATCH job status    │
└──────────────────────────────────────┘
```

### Key Benefits

| Property | Before | After |
|----------|--------|-------|
| Processing driver | Browser `while` loop | Inngest server-side |
| Survives page close | ❌ | ✅ |
| Survives Vercel deploy | ❌ | ✅ (Inngest retries) |
| Survives browser sleep | ❌ | ✅ |
| Auto-enrichment | Only after entire batch | Batched after generation completes |
| Retry on failure | None | Inngest built-in (configurable) |
| Concurrency | 1 (sequential HTTP calls) | Configurable (1-5) |
| Status tracking | Client-side only | Server-side (DB) + client polling |
| Maximum batch size | Unbounded but timeouts | Unbounded, Inngest handles pagination |
| **Inngest events per 108 convos** | **108 (v1)** | **~6 (v2): 1 job + ~5 enrich chunks** |

---

## 5. New Inngest Event Definitions

### Add to `src/inngest/client.ts`

Add inside the `InngestEvents` type:

```typescript
/**
 * Fired when a batch generation job is created and ready for processing.
 * Triggers the processBatchJob function.
 */
'batch/job.created': {
  data: {
    jobId: string;
    userId: string;
    workbaseId: string | null;
  };
};

/**
 * Fired to request cancellation of a running batch job.
 * The processBatchJob function checks for this between items.
 */
'batch/job.cancel.requested': {
  data: {
    jobId: string;
    userId: string;
  };
};

/**
 * Fired to enrich a chunk of conversations (up to 25).
 * Replaces per-conversation 'conversation/generation.completed' for batch enrichment.
 * Each chunk is processed as a single Inngest function invocation.
 */
'batch/enrich.requested': {
  data: {
    conversationIds: string[];
    userId: string;
    jobId: string | null;  // null when triggered manually via "Enrich All" button
  };
};
```

> [!IMPORTANT]
> The existing `conversation/generation.completed` event and `autoEnrichConversation` function remain unchanged. They continue to serve single-conversation generation via `POST /api/conversations/generate`. The new `batch/enrich.requested` event is ONLY used for batch operations.

---

## 6. New Inngest Function: `processBatchJob`

### File: `src/inngest/functions/process-batch-job.ts` [NEW]

This is the core of the migration — a new Inngest function that replaces the browser-driven polling loop.

### Function Configuration

```typescript
export const processBatchJob = inngest.createFunction(
  {
    id: 'process-batch-job',
    name: 'Process Batch Conversation Generation Job',
    retries: 1,                    // Retry the individual step, not the entire function
    concurrency: { limit: 2 },     // Max 2 batch jobs running simultaneously
    cancelOn: [
      {
        event: 'batch/job.cancel.requested',
        match: 'data.jobId',        // Cancel only the matching job
      },
    ],
  },
  { event: 'batch/job.created' },
  async ({ event, step }) => { ... }
);
```

### Function Logic (Step-by-Step)

**Step 1: `fetch-job-and-items`**
- Fetch the batch job from `batch_jobs` table
- Fetch all batch items from `batch_items` table where `status = 'queued'`
- Update job status to `'processing'`
- Return item list and job configuration

**Step 2..N: `process-item-{index}` (one Inngest step per batch item)**

For each queued item, create a separate Inngest step:

```typescript
const successfulConversationIds: string[] = [];

for (let i = 0; i < queuedItems.length; i++) {
  const item = queuedItems[i];

  const result = await step.run(`process-item-${i}`, async () => {
    // 1. Update batch_item status to 'processing'
    // 2. Initialize services:
    //    - ScaffoldingDataService
    //    - TemplateSelectionService
    //    - ParameterAssemblyService
    //    - ConversationGenerationService
    // 3. Resolve template ID (auto-select if NIL_UUID)
    // 4. Assemble parameters (resolve persona, arc, topic)
    // 5. Call generationService.generateSingleConversation()
    // 6. On success:
    //    - Update conversation with scaffolding_snapshot + workbase_id
    //    - Call batchJobService.incrementProgress(jobId, item.id, 'completed', convId)
    //    - Return { success: true, conversationId: convId }
    // 7. On failure:
    //    - Call batchJobService.incrementProgress(jobId, item.id, 'failed', undefined, error)
    //    - Log to batch log storage
    //    - Return { success: false }
  });

  if (result.success && result.conversationId) {
    successfulConversationIds.push(result.conversationId);
  }
}
```

> [!IMPORTANT]
> **Each batch item MUST be its own `step.run()` call.** This is critical because Inngest checkpoints after each step. If the function is interrupted (Vercel redeploy, timeout, etc.), Inngest will resume from the last completed step — it will NOT re-process already-completed items. This is the fundamental difference from the browser loop approach.

**Step N+1: `trigger-enrichment` — Emit CHUNKED enrichment events**

After all items are processed, emit enrichment events in chunks of 25:

```typescript
await step.run('trigger-enrichment', async () => {
  if (successfulConversationIds.length === 0) return { chunksEmitted: 0 };

  const ENRICH_CHUNK_SIZE = 25;
  const chunks: string[][] = [];

  for (let i = 0; i < successfulConversationIds.length; i += ENRICH_CHUNK_SIZE) {
    chunks.push(successfulConversationIds.slice(i, i + ENRICH_CHUNK_SIZE));
  }

  // Emit one event per chunk (NOT one per conversation)
  const events = chunks.map(chunk => ({
    name: 'batch/enrich.requested' as const,
    data: {
      conversationIds: chunk,
      userId: event.data.userId,
      jobId: event.data.jobId,
    },
  }));

  await inngest.send(events);

  return { chunksEmitted: chunks.length, totalConversations: successfulConversationIds.length };
});
```

**Step N+2: `finalize-job`**
- Fetch final job state from DB
- Update job status to `'completed'` or `'failed'` based on item results
- Log completion summary to batch-logs storage

### Cancellation Handling

The `cancelOn` configuration handles cancellation automatically. When a `batch/job.cancel.requested` event is sent with a matching `jobId`, Inngest will:
1. Stop executing future steps
2. The function exits cleanly
3. A separate step or the cancel API route updates the job status to `'cancelled'`
4. Already-queued items remain as `'queued'` — they can be resumed later if needed

### Implementation Source

The processing logic for each item should be extracted from the existing **`process-next/route.ts`** (L247-461). Specifically:

1. **Parameter validation** (L249-257): Check `persona_id`, `emotional_arc_id`, `training_topic_id`
2. **Service initialization** (L259-266): `ScaffoldingDataService`, `TemplateSelectionService`, `ParameterAssemblyService`
3. **Template resolution** (L268-279): Auto-select if NIL_UUID
4. **Parameter assembly** (L281-290): Resolve scaffolding data
5. **Conversation generation** (L295-308): Call `generateSingleConversation()`
6. **Post-generation DB update** (L320-362): Update conversation with scaffolding snapshot + workbase_id
7. **Progress tracking** (L364-369): `batchJobService.incrementProgress()`
8. **Batch logging** (L374): `appendBatchLog()`

> [!TIP]
> Extract the item processing logic from `process-next/route.ts` into a shared utility function (e.g., `src/lib/services/batch-item-processor.ts`) so both the Inngest function and any future direct-invoke path can use the same code.

---

## 7. Enrichment Strategy: Chunked Batch Model

### Why Not 1 Event Per Conversation?

| Approach | Events for 108 conversations | Events for 500 | Events for 1000 |
|----------|------------------------------|----------------|-----------------|
| **v1: 1 event per conversation** | 108 | 500 | 1000 |
| **v2: Chunks of 25** | 5 | 20 | 40 |
| **Reduction** | **95%** | **96%** | **96%** |

In a production environment with multiple customers, event budgets matter. Chunking reduces event consumption by ~96% with no functional trade-off.

### New Inngest Function: `batchEnrichConversations`

**File:** `src/inngest/functions/batch-enrich-conversations.ts` [NEW]

This function replaces `autoEnrichConversation` for batch operations. It receives a chunk of up to 25 conversation IDs and enriches each one.

```typescript
export const batchEnrichConversations = inngest.createFunction(
  {
    id: 'batch-enrich-conversations',
    name: 'Batch Enrich Conversations (Chunked)',
    retries: 2,
    concurrency: { limit: 3 },       // Max 3 enrichment chunks running simultaneously
  },
  { event: 'batch/enrich.requested' },
  async ({ event, step }) => {
    const { conversationIds, userId } = event.data;

    const results = { enriched: 0, skipped: 0, failed: 0 };

    // Each conversation gets its own step for checkpointing
    for (let i = 0; i < conversationIds.length; i++) {
      const conversationId = conversationIds[i];

      const result = await step.run(`enrich-${i}`, async () => {
        const supabase = createServerSupabaseAdminClient();

        // Check if already enriched (idempotent)
        const { data } = await supabase
          .from('conversations')
          .select('enrichment_status')
          .eq('conversation_id', conversationId)
          .single();

        if (!data) {
          // Fallback: try by id (database row ID)
          const { data: byId } = await supabase
            .from('conversations')
            .select('conversation_id, enrichment_status')
            .eq('id', conversationId)
            .single();

          if (!byId) return { status: 'failed', error: 'Not found' };
          if (byId.enrichment_status === 'completed') return { status: 'skipped' };
          // Use actual conversation_id for pipeline
          const actualId = byId.conversation_id;
          const { getPipelineOrchestrator } = await import(
            '@/lib/services/enrichment-pipeline-orchestrator'
          );
          await getPipelineOrchestrator().runPipeline(actualId, userId);
          return { status: 'enriched' };
        }

        if (data.enrichment_status === 'completed') return { status: 'skipped' };

        const { getPipelineOrchestrator } = await import(
          '@/lib/services/enrichment-pipeline-orchestrator'
        );
        await getPipelineOrchestrator().runPipeline(conversationId, userId);
        return { status: 'enriched' };
      });

      if (result.status === 'enriched') results.enriched++;
      else if (result.status === 'skipped') results.skipped++;
      else results.failed++;
    }

    return results;
  }
);
```

### Risk Analysis: Batching Enrichments

| Risk | Severity | Mitigation |
|------|----------|-----------|
| One failure kills whole batch | ❌ Not a risk | Each conversation is in its own `step.run()` — failures are isolated |
| Retry re-processes completed items | ❌ Not a risk | `enrichment_status === 'completed'` check skips already-enriched conversations |
| Timeout for large chunks | ⚠️ Low | 25 × ~2s = ~50s. Inngest steps have their own timeout. Keep chunk size at 25 or lower |
| Ordering dependency | ❌ Not a risk | Enrichment is fully independent per conversation — no ordering needed |
| Data corruption on partial failure | ❌ Not a risk | Enrichment marks `enrichment_status` per conversation, never leaves DB in inconsistent state |

### Existing `autoEnrichConversation` — Unchanged

The existing `autoEnrichConversation` function continues to handle single-conversation enrichment triggered by the non-batch `POST /api/conversations/generate` route. No changes needed to this function.

---

## 8. API Route Changes

### 8.1 MODIFY: `POST /api/conversations/generate-batch` → Emit Inngest Event

**File:** `src/app/api/conversations/generate-batch/route.ts`

After `batchService.startBatchGeneration(batchRequest)` succeeds, add:

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
```

This replaces the need for the client to poll `process-next`.

### 8.2 MODIFY: `POST /api/batch-jobs/[id]/cancel` → Emit Inngest Cancel Event

**File:** `src/app/api/batch-jobs/[id]/cancel/route.ts`

After updating the job status in the database, add:

```typescript
// Signal Inngest to cancel the running function
await inngest.send({
  name: 'batch/job.cancel.requested',
  data: {
    jobId,
    userId: user.id,
  },
});
```

### 8.3 DEPRECATE: `POST /api/batch-jobs/[id]/process-next`

**File:** `src/app/api/batch-jobs/[id]/process-next/route.ts`

This route becomes unused after migration. Options:
- **Option A (recommended):** Keep it but add a deprecation log and return a 410 Gone response pointing to the Inngest-based approach
- **Option B:** Delete immediately

### 8.4 DELETE: `POST /api/conversations/bulk-enrich`

**File:** `src/app/api/conversations/bulk-enrich/route.ts`

This route is no longer needed. Enrichment is handled by `batchEnrichConversations` via `batch/enrich.requested` events. The "Enrich All" button fires chunked events through the new `trigger-enrich` endpoint (Section 8.5).

### 8.5 NEW: `POST /api/conversations/trigger-enrich`

**File:** `src/app/api/conversations/trigger-enrich/route.ts` [NEW]

Replacement for `bulk-enrich` that fires chunked Inngest events:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIds } = z.object({
    conversationIds: z.array(z.string().uuid()).min(1),  // No .max() limit!
  }).parse(body);

  // Chunk into groups of 25
  const CHUNK_SIZE = 25;
  const events = [];

  for (let i = 0; i < conversationIds.length; i += CHUNK_SIZE) {
    events.push({
      name: 'batch/enrich.requested' as const,
      data: {
        conversationIds: conversationIds.slice(i, i + CHUNK_SIZE),
        userId: user.id,
        jobId: null,  // Manual trigger, no associated batch job
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
}
```

**Event efficiency example:** 108 conversations → 5 `batch/enrich.requested` events (chunks of 25, 25, 25, 25, 8).

---

## 9. Frontend Changes

### 9.1 MODIFY: Batch Watcher Page → Status Viewer Only

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`

Remove the entire processing loop system. The page becomes a pure status viewer:

**Remove (approximately L51-235):**
- `processingActive` state
- `processingRef`, `autoStartedRef`, `didProcessRef`, `autoEnrichTriggeredRef` refs
- `processNextItem` callback
- `startProcessing` callback
- `stopProcessing` callback
- Auto-start processing `useEffect` (L206-217)
- Auto-enrich `useEffect` (L220-234)
- `lastItemError` state

**Replace with:**
- Polling `GET /api/conversations/batch/${jobId}/status` every 3 seconds via `setInterval`
- Stop polling when status is terminal (`completed`, `failed`, `cancelled`)
- Show real-time progress from the polling response (the DB is the source of truth now)

**Keep unchanged:**
- `fetchStatus` callback (polling mechanism)
- `handleAction` for cancel
- Status display cards
- "Enrich All" button (but rewire to use `trigger-enrich` — see 9.2)
- Progress bar and stats grid

### 9.2 MODIFY: "Enrich All" Button → Use Chunked Inngest Events

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`

Replace `handleEnrichAll` (L278-322) to call the new `trigger-enrich` endpoint:

```typescript
const handleEnrichAll = async () => {
  if (!status || status.status !== 'completed') return;

  try {
    setEnriching(true);
    setEnrichResult(null);

    // Fetch all completed items
    const response = await fetch(
      `/api/conversations/batch/${jobId}/items?status=completed`
    );
    const items = await response.json();
    if (!response.ok) throw new Error(items.error || 'Failed to fetch batch items');

    const conversationIds = items.data
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
      queued: true,
      message: `${conversationIds.length} conversations queued for enrichment in ${enrichData.chunks} chunks`,
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Enrichment failed');
  } finally {
    setEnriching(false);
  }
};
```

### 9.3 MODIFY: Generate Page — No Changes Needed

The generate page (`generate/page.tsx`) needs no changes. It already calls `POST /api/conversations/generate-batch` which creates the DB records and returns the job ID. The only change is that the API route now also emits the Inngest event (handled server-side in Section 8.1).

---

## 10. Database Changes (SAOL)

> [!IMPORTANT]
> All schema changes below MUST be executed using SAOL (`agentExecuteDDL`) with `dryRun: true` first.

### 10.1 Add `inngest_event_id` Column to `batch_jobs`

Track the Inngest function execution for debugging:

```sql
ALTER TABLE batch_jobs
ADD COLUMN inngest_event_id TEXT DEFAULT NULL;

COMMENT ON COLUMN batch_jobs.inngest_event_id IS 
'Inngest event ID that triggered processing. Used for debugging and status correlation.';
```

### 10.2 Add `processing_started_at` Column to `batch_items`

Track per-item timing:

```sql
ALTER TABLE batch_items
ADD COLUMN processing_started_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN batch_items.processing_started_at IS 
'Timestamp when Inngest started processing this item. Used for duration tracking.';
```

### 10.3 No Other DB Changes Required

The existing `batch_jobs` and `batch_items` table structure is sufficient:
- `batch_jobs.status` already supports `queued`, `processing`, `paused`, `completed`, `failed`, `cancelled`
- `batch_items.status` already supports `queued`, `processing`, `completed`, `failed`
- `batch_items.conversation_id` FK already links to generated conversations
- `batch_items.error_message` already stores failure details
- `batch_jobs.configuration` JSONB already stores concurrency and error handling settings

---

## 11. Files to Modify and Create

### New Files

| File | Purpose |
|------|---------|
| `src/inngest/functions/process-batch-job.ts` | **Core Inngest function** — processes all items in a batch job |
| `src/inngest/functions/batch-enrich-conversations.ts` | **Chunked enrichment function** — enriches up to 25 conversations per invocation |
| `src/lib/services/batch-item-processor.ts` | Shared item processing logic (extracted from `process-next/route.ts`) |
| `src/app/api/conversations/trigger-enrich/route.ts` | Fire chunked Inngest enrichment events |

### Modified Files

| File | Changes |
|------|---------|
| `src/inngest/client.ts` | Add `batch/job.created`, `batch/job.cancel.requested`, and `batch/enrich.requested` event types |
| `src/inngest/functions/index.ts` | Register `processBatchJob` and `batchEnrichConversations` functions |
| `src/app/api/conversations/generate-batch/route.ts` | Add `inngest.send('batch/job.created')` after job creation |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | Add `inngest.send('batch/job.cancel.requested')` |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | Remove processing loop, convert to status-only viewer, rewire "Enrich All" |

### Deprecated Files (Keep but Add Deprecation Notice)

| File | Reason |
|------|--------|
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | Replaced by `processBatchJob` Inngest function |
| `src/app/api/conversations/bulk-enrich/route.ts` | Replaced by `trigger-enrich` + `batchEnrichConversations` |

### Dead Code to Remove

| File | Code to Remove |
|------|---------------|
| `src/lib/services/batch-generation-service.ts` | `processJobInBackground` method (L459-555), `activeJobs` Map (L118), `pauseJob` method (L281-297), `resumeJob` method (L299-328) |

---

## 12. Verification Plan

### Automated Tests

1. **Unit test `processBatchJob`:**
   - Mock `batchJobService`, `generationService`, `inngest.send`
   - Verify items are processed sequentially with `step.run` per item
   - Verify enrichment events are emitted in chunks of 25
   - Verify job status updates correctly on completion
   - Verify cancellation stops processing

2. **Unit test `batchEnrichConversations`:**
   - Verify it processes up to 25 conversations per invocation
   - Verify already-enriched conversations are skipped
   - Verify failures are isolated (one failure doesn't stop others)
   - Verify dual-lookup (by `conversation_id` then `id`)

3. **Unit test `trigger-enrich` route:**
   - Verify it accepts any number of conversation IDs (no `.max()`)
   - Verify it chunks into groups of 25
   - Verify correct number of `batch/enrich.requested` events are emitted

4. **Integration test full pipeline:**
   - Create a batch job with 3 items
   - Verify `processBatchJob` processes all 3
   - Verify 1 `batchEnrichConversations` function triggers (3 ≤ 25, so 1 chunk)
   - Verify all 3 conversations are enriched
   - Verify final job status is `'completed'`

### Manual Verification

1. **Submit a batch of 5 conversations** from the generate page
2. **Close the browser tab immediately** after navigating to the batch watcher
3. **Reopen the tab** after 2 minutes and verify:
   - The batch job has progressed (conversations were generated despite tab being closed)
   - Enrichment is happening/completed for generated conversations
4. **Submit a batch of 110+ conversations** and verify:
   - No "Invalid request" error
   - All conversations are generated and enriched
   - Only ~5 enrichment events were emitted (110 ÷ 25 = 5 chunks)
5. **Cancel a running batch** and verify:
   - Processing stops within ~30 seconds
   - Already-generated conversations are preserved
   - Already-enriched conversations are preserved

### Inngest Dashboard Verification

1. Verify `process-batch-job` function appears in the Inngest dashboard
2. Verify `batch-enrich-conversations` function appears in the Inngest dashboard
3. Verify step-level progress is visible in the function run details
4. Verify enrichment events are chunked (not 1:1)
5. Verify cancellation via `batch/job.cancel.requested` works

---

## 13. Inngest Event Budget Analysis

### Event Count Comparison (Per Batch Job)

| Scenario | v1 Events | v2 Events | Savings |
|----------|-----------|-----------|---------|
| 10 conversations | 1 + 10 = **11** | 1 + 1 = **2** | 82% |
| 50 conversations | 1 + 50 = **51** | 1 + 2 = **3** | 94% |
| 108 conversations | 1 + 108 = **109** | 1 + 5 = **6** | 94% |
| 200 conversations | 1 + 200 = **201** | 1 + 8 = **9** | 96% |
| 500 conversations | 1 + 500 = **501** | 1 + 20 = **21** | 96% |
| 1000 conversations | 1 + 1000 = **1001** | 1 + 40 = **41** | 96% |

> [!NOTE]
> Event formula: `1 (batch/job.created) + ceil(successful_conversations / 25) (batch/enrich.requested)`

### Production Scenario (Multi-Tenant)

Assume 5 customers, each generating 2 batches of 100 conversations per week:

| Metric | v1 (per week) | v2 (per week) |
|--------|---------------|---------------|
| Batch events | 10 | 10 |
| Enrichment events | 1,000 | 40 |
| **Total events** | **1,010** | **50** |
| **Monthly projection** | **~4,040** | **~200** |

### Can the Chunk Size Be Tuned?

Yes. The `ENRICH_CHUNK_SIZE` constant can be adjusted:

| Chunk Size | Events for 108 convos | Risk Level |
|-----------|----------------------|-----------|
| 10 | 11 | None — very safe |
| **25 (recommended)** | **5** | **None — safe, good balance** |
| 50 | 3 | Low — 50 × 2s = 100s, needs `maxDuration` tuning |
| 100 | 2 | Medium — approaching Inngest step limits |

25 is the recommended default because:
- 25 × ~2s = ~50s total enrichment time — well within Inngest step timeouts
- Each conversation is its own `step.run()` within the function, so individual failures are isolated
- The checkpoint granularity is fine enough for reliable retry
- 96% event reduction is already excellent

---

## Summary of Changes

| Category | Count | Details |
|----------|-------|---------|
| **New Inngest functions** | 2 | `processBatchJob`, `batchEnrichConversations` |
| **New Inngest events** | 3 | `batch/job.created`, `batch/job.cancel.requested`, `batch/enrich.requested` |
| **New API routes** | 1 | `trigger-enrich` |
| **Modified API routes** | 2 | `generate-batch` + `cancel` (emit Inngest events) |
| **Deprecated API routes** | 2 | `process-next` + `bulk-enrich` |
| **Modified frontend pages** | 1 | Batch watcher (remove processing loop) |
| **New service files** | 1 | `batch-item-processor.ts` (extracted logic) |
| **DB schema changes** | 2 | Add `inngest_event_id` + `processing_started_at` columns |
| **Dead code removed** | ~200 lines | `processJobInBackground`, `activeJobs`, `pauseJob`, `resumeJob` |
| **Existing functions unchanged** | 1 | `autoEnrichConversation` — still handles single-conversation generation |
