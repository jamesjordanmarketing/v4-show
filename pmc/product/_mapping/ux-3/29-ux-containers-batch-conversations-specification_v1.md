# Spec 29: Batch Conversation Pipeline — Inngest Migration

**Version:** 1.0  
**Date:** 2026-03-03  
**Status:** Ready for Implementation  
**Priority:** Critical  
**Related Requirements:** `pmc/product/_mapping/ux-3/29-ux-containers-batch-conversations_v2.md`

---

## Agent Instructions

**Before starting any work, you MUST:**
1. Read this entire document — it contains pre-verified facts and explicit instructions
2. Read the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. Execute the instructions and specifications as written — do not re-investigate what has already been verified

---

## Platform Background

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application deployed on Vercel that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets.

**Two Product Paths:**

| Path | User-Facing Name | Flow |
|------|-----------------|------|
| **LoRA Training** | "Fine Tuning" | Generate Conversations → Auto-Enrich → Aggregate Training Set → Train LoRA Adapter → Auto-Deploy → Worker Refresh → A/B Chat |
| **RAG Frontier** | "Fact Training" | Upload Document → 6-Pass Inngest Ingestion → Expert Q&A → Semantic Search → Chat with Citations |

**Technology Stack:**

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

**Design Token Rules — STRICT. All new/modified code MUST use:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary`, `text-primary-foreground`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` in new or modified code**

**Key Route Structure:**
- Workbase pages live under `/workbase/[id]/`
- Batch generation page: `/workbase/[id]/fine-tuning/conversations/generate`
- Batch watcher page: `/workbase/[id]/fine-tuning/conversations/batch/[jobId]`

---

## Problem Statement

The entire batch conversation generation and enrichment pipeline is currently **browser-driven**. The batch watcher page (`batch/[jobId]/page.tsx`) runs a `while` loop that calls `POST /api/batch-jobs/[id]/process-next` one item at a time, with a 500ms delay between calls. This architecture has critical flaws:

1. **Browser-dependent processing** — Closing the tab, navigating away, browser sleep, or laptop lid close immediately stops all processing with no recovery.
2. **Vercel redeployment vulnerability** — Every `git push` triggers a Vercel redeployment that kills all in-flight serverless functions. The browser must restart the loop.
3. **Enrichment hard limit (Bug #28)** — `POST /api/conversations/bulk-enrich` has `.max(100)` in its Zod schema. Batches with >100 conversations cannot be enriched.
4. **No auto-enrich during generation** — The `conversation/generation.completed` Inngest event is only emitted by the single-conversation `POST /api/conversations/generate` route. The batch `process-next` route does NOT emit it.
5. **Dead code** — `batch-generation-service.ts` contains `processJobInBackground`, `activeJobs` Map, `pauseJob`, and `resumeJob` — all dead or broken in Vercel's serverless environment.
6. **No concurrency** — The browser loop processes items one-at-a-time despite job config supporting `concurrentProcessing: 3`.

### Solution

Migrate the entire batch processing pipeline from browser-driven polling to **Inngest-managed background jobs**. The browser becomes a pure status viewer. Enrichment uses **chunked batch events** (25 conversations per Inngest event) to minimize event consumption (~96% reduction vs 1:1).

---

## Impact Analysis

### Files Created (4)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/inngest/functions/process-batch-job.ts` | Core Inngest function — processes all items in a batch job server-side |
| 2 | `src/inngest/functions/batch-enrich-conversations.ts` | Chunked enrichment — enriches up to 25 conversations per invocation |
| 3 | `src/lib/services/batch-item-processor.ts` | Shared item processing logic extracted from `process-next/route.ts` |
| 4 | `src/app/api/conversations/trigger-enrich/route.ts` | Fire chunked Inngest enrichment events (replaces `bulk-enrich`) |

### Files Modified (5)

| # | File | Changes |
|---|------|---------|
| 5 | `src/inngest/client.ts` | Add 3 new event types to `InngestEvents` |
| 6 | `src/inngest/functions/index.ts` | Register 2 new Inngest functions |
| 7 | `src/app/api/conversations/generate-batch/route.ts` | Add `inngest.send('batch/job.created')` after job creation |
| 8 | `src/app/api/batch-jobs/[id]/cancel/route.ts` | Add `inngest.send('batch/job.cancel.requested')` after DB cancellation |
| 9 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | Remove processing loop; convert to polling-only status viewer; rewire "Enrich All" |

### Files Deprecated (2 — keep but add deprecation notice)

| # | File | Reason |
|---|------|--------|
| 10 | `src/app/api/batch-jobs/[id]/process-next/route.ts` | Replaced by `processBatchJob` Inngest function; return 410 Gone |
| 11 | `src/app/api/conversations/bulk-enrich/route.ts` | Replaced by `trigger-enrich` + `batchEnrichConversations` |

### Dead Code Removed (1 file modified)

| # | File | Code Removed |
|---|------|-------------|
| 12 | `src/lib/services/batch-generation-service.ts` | `processJobInBackground` method (~L459-555), `activeJobs` Map (~L118), `pauseJob` method (~L281-297), `resumeJob` method (~L299-328) |

### Dependencies Touched

| Dependency | How It's Used |
|-----------|---------------|
| `batchJobService` (`src/lib/services/batch-job-service.ts`) | Existing singleton — used by new `processBatchJob` function for `getJobById`, `updateJobStatus`, `updateItemStatus`, `incrementProgress` |
| `ScaffoldingDataService` (`src/lib/services/scaffolding-data-service.ts`) | Existing class — used by new `batch-item-processor.ts` |
| `ParameterAssemblyService` (`src/lib/services/parameter-assembly-service.ts`) | Existing class — used by new `batch-item-processor.ts` |
| `TemplateSelectionService` (`src/lib/services/template-selection-service.ts`) | Existing class — used by new `batch-item-processor.ts` |
| `ConversationGenerationService` (`src/lib/services/conversation-generation-service.ts`) | Existing singleton via `getConversationGenerationService()` — used by `batch-item-processor.ts` |
| `EnrichmentPipelineOrchestrator` (`src/lib/services/enrichment-pipeline-orchestrator.ts`) | Existing singleton via `getPipelineOrchestrator()` — used by new `batchEnrichConversations` |
| `inngest` client (`src/inngest/client.ts`) | Extended with 3 new event types |

### Database Tables Touched

| Table | Operation | Details |
|-------|-----------|---------|
| `batch_jobs` | Read + Write | Status updates, progress tracking. **DDL: Add `inngest_event_id TEXT` column** |
| `batch_items` | Read + Write | Item status/progress updates. **DDL: Add `processing_started_at TIMESTAMPTZ` column** |
| `conversations` | Read + Write | Post-generation scaffold snapshot update, workbase_id association |
| `emotional_arcs` | Read | Arc key lookup for template auto-selection |
| `prompt_templates` | Read | Template matching by `emotional_arc_type` |

### Database Schema Changes (SAOL Required)

| Change | SQL |
|--------|-----|
| Add column to `batch_jobs` | `ALTER TABLE batch_jobs ADD COLUMN inngest_event_id TEXT DEFAULT NULL;` |
| Add column to `batch_items` | `ALTER TABLE batch_items ADD COLUMN processing_started_at TIMESTAMPTZ DEFAULT NULL;` |

### Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Inngest function timeout for very large batches (500+ items) | Medium | Each item is a separate `step.run()` — Inngest checkpoints after each step and resumes from last completed |
| Existing `autoEnrichConversation` breaks | None | Unchanged — continues to serve single-conversation generation |
| Batch watcher page UX regression | Low | Page retains all display components; only the processing driver changes |
| `process-next` route still called by old clients | Low | Return 410 Gone with clear error message directing to new flow |
| Cancel race condition | Low | Inngest's `cancelOn` config ensures clean cancellation matching on `data.jobId` |

---

## Detailed Implementation

---

### Change 1: Add New Event Types to Inngest Client

**File:** `src/inngest/client.ts`

**Current state (line 155):** The `InngestEvents` type ends after `'training/set.created'`.

**Action:** Add three new event type definitions inside the `InngestEvents` type, immediately after the `'training/set.created'` block (before the closing `};`):

```typescript
  /**
   * Fired when a batch generation job is created and ready for processing.
   * Triggers the processBatchJob function to process all items server-side.
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
   * The processBatchJob function's cancelOn config catches this.
   */
  'batch/job.cancel.requested': {
    data: {
      jobId: string;
      userId: string;
    };
  };

  /**
   * Fired to enrich a chunk of conversations (up to 25).
   * Each chunk is processed as a single Inngest function invocation.
   * Replaces per-conversation 'conversation/generation.completed' for batch enrichment.
   */
  'batch/enrich.requested': {
    data: {
      conversationIds: string[];
      userId: string;
      jobId: string | null;
    };
  };
```

> **IMPORTANT:** The existing `'conversation/generation.completed'` event and `autoEnrichConversation` function remain completely unchanged. They continue to serve single-conversation generation via `POST /api/conversations/generate`. The new `'batch/enrich.requested'` event is ONLY used for batch operations.

---

### Change 2: Create Shared Batch Item Processor

**File to create:** `src/lib/services/batch-item-processor.ts`

This file extracts the core item-processing logic from `src/app/api/batch-jobs/[id]/process-next/route.ts` (lines 240-461) into a reusable service. Both the new Inngest function and any future direct-invoke path can use this same code.

```typescript
/**
 * Batch Item Processor
 *
 * Extracted from process-next/route.ts to share between:
 * - Inngest processBatchJob function (new)
 * - process-next API route (deprecated, kept for backward compat)
 *
 * Handles a single batch item: validates params, resolves scaffolding,
 * auto-selects template, calls Claude API, stores conversation, updates progress.
 */

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';
import { getConversationGenerationService } from '@/lib/services/conversation-generation-service';
import { ScaffoldingDataService } from '@/lib/services/scaffolding-data-service';
import { ParameterAssemblyService } from '@/lib/services/parameter-assembly-service';
import { TemplateSelectionService } from '@/lib/services/template-selection-service';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface BatchItemProcessResult {
  success: boolean;
  conversationId?: string;
  error?: string;
  durationMs: number;
}

/**
 * Append log entry to batch job log file in Supabase Storage.
 * Silently catches errors to avoid failing the batch item on log failures.
 */
export async function appendBatchLog(jobId: string, message: string): Promise<void> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const logPath = `${jobId}/log.txt`;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    // Try to download existing log file
    const { data: existingData } = await supabase.storage
      .from('batch-logs')
      .download(logPath);

    let updatedContent = logEntry;
    if (existingData) {
      const existingText = await existingData.text();
      updatedContent = existingText + logEntry;
    }

    // Upload updated log file
    await supabase.storage
      .from('batch-logs')
      .upload(logPath, updatedContent, {
        contentType: 'text/plain',
        upsert: true,
      });
  } catch (error) {
    console.error(`[BatchLog] Failed to append log for job ${jobId}:`, error);
  }
}

/**
 * Auto-select a prompt template based on the emotional arc's arc_key.
 * Tries tier-specific first, then falls back to any-tier.
 *
 * Extracted from process-next/route.ts lines 70-122.
 */
export async function autoSelectTemplate(
  emotionalArcId: string,
  tier?: string
): Promise<string | null> {
  try {
    const supabase = createServerSupabaseAdminClient();

    // Get the arc_key from emotional_arcs table
    const { data: arcData, error: arcError } = await supabase
      .from('emotional_arcs')
      .select('arc_key')
      .eq('id', emotionalArcId)
      .single();

    if (arcError || !arcData) {
      console.log(`[BatchItemProcessor] Emotional arc not found: ${emotionalArcId}`);
      return null;
    }

    const arcType = arcData.arc_key;
    console.log(`[BatchItemProcessor] Looking for template with arc_type: ${arcType}, tier: ${tier}`);

    // Find a template with matching emotional_arc_type
    let query = supabase
      .from('prompt_templates')
      .select('id')
      .eq('emotional_arc_type', arcType);

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data: templateData, error: templateError } = await query.limit(1).single();

    if (templateError || !templateData) {
      // Try without tier filter
      const { data: anyTierData, error: anyTierError } = await supabase
        .from('prompt_templates')
        .select('id')
        .eq('emotional_arc_type', arcType)
        .limit(1)
        .single();

      if (anyTierError || !anyTierData) {
        console.warn(`[BatchItemProcessor] No template found for arc_type=${arcType}`);
        return null;
      }

      console.log(`[BatchItemProcessor] Auto-selected template ${anyTierData.id} (any tier) for arc ${arcType}`);
      return anyTierData.id;
    }

    console.log(`[BatchItemProcessor] Auto-selected template ${templateData.id} for arc ${arcType}, tier ${tier}`);
    return templateData.id;
  } catch (error) {
    console.error(`[BatchItemProcessor] Error auto-selecting template:`, error);
    return null;
  }
}

/**
 * Process a single batch item end-to-end.
 *
 * Steps:
 * 1. Update batch_item status to 'processing'
 * 2. Validate required parameters (persona_id, emotional_arc_id, training_topic_id)
 * 3. Initialize scaffolding services
 * 4. Resolve template ID (auto-select if NIL_UUID)
 * 5. Assemble parameters (resolve persona, arc, topic from DB)
 * 6. Call generationService.generateSingleConversation()
 * 7. Update conversation with scaffolding_snapshot + workbase_id
 * 8. Update batch_item progress via batchJobService.incrementProgress()
 * 9. Append batch log entry
 *
 * @param jobId - Batch job UUID
 * @param item - Batch item object (must have .id, .parameters, .tier)
 * @param userId - Authenticated user ID (job creator)
 * @param workbaseId - Optional workbase ID for scoping
 */
export async function processBatchItem(
  jobId: string,
  item: {
    id: string;
    parameters: Record<string, any>;
    tier?: string;
  },
  userId: string,
  workbaseId?: string | null
): Promise<BatchItemProcessResult> {
  const startTime = Date.now();

  try {
    // 1. Update item status to 'processing'
    await batchJobService.updateItemStatus(item.id, 'processing');

    // 2. Validate required parameters
    if (!item.parameters?.persona_id) {
      throw new Error('Missing required parameter: persona_id');
    }
    if (!item.parameters?.emotional_arc_id) {
      throw new Error('Missing required parameter: emotional_arc_id');
    }
    if (!item.parameters?.training_topic_id) {
      throw new Error('Missing required parameter: training_topic_id');
    }

    // 3. Initialize services for parameter resolution
    const supabase = createServerSupabaseAdminClient();
    const scaffoldingService = new ScaffoldingDataService(supabase);
    const templateSelectionService = new TemplateSelectionService(supabase);
    const parameterAssemblyService = new ParameterAssemblyService(
      scaffoldingService,
      templateSelectionService
    );

    // 4. Resolve template ID (manual override or auto-select)
    let templateId = item.parameters?.templateId;
    if (!templateId || templateId === NIL_UUID) {
      console.log(`[BatchItemProcessor] Auto-selecting template for item ${item.id}`);
      const autoSelectedId = await autoSelectTemplate(
        item.parameters.emotional_arc_id,
        item.tier
      );
      if (autoSelectedId) {
        templateId = autoSelectedId;
        console.log(`[BatchItemProcessor] Auto-selected template ${templateId}`);
      } else {
        throw new Error('No suitable template found for the emotional arc.');
      }
    }

    // 5. Assemble parameters - resolves scaffolding data (persona, arc, topic)
    console.log(`[BatchItemProcessor] Resolving scaffolding data for item ${item.id}...`);
    const assembled = await parameterAssemblyService.assembleParameters({
      persona_id: item.parameters.persona_id,
      emotional_arc_id: item.parameters.emotional_arc_id,
      training_topic_id: item.parameters.training_topic_id,
      tier: item.tier,
      template_id: templateId,
      created_by: userId,
    });

    console.log(
      `[BatchItemProcessor] ✓ Scaffolding resolved: ${assembled.conversation_params.persona.name}, ${assembled.conversation_params.emotional_arc.name}, ${assembled.conversation_params.training_topic.name}`
    );

    // 6. Generate conversation with RESOLVED parameters
    const generationService = getConversationGenerationService();
    const result = await generationService.generateSingleConversation({
      templateId,
      parameters: assembled.template_variables,
      tier: item.tier,
      userId,
      runId: jobId,
      scaffoldingIds: {
        personaId: item.parameters.persona_id,
        emotionalArcId: item.parameters.emotional_arc_id,
        trainingTopicId: item.parameters.training_topic_id,
      },
    });

    const durationMs = Date.now() - startTime;

    if (result.success) {
      const convId = result.conversation.id;

      // 7. Update conversation with scaffolding provenance + workbase association
      console.log(`[BatchItemProcessor] Updating conversation ${convId} with scaffolding data...`);
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          ...(workbaseId ? { workbase_id: workbaseId } : {}),
          persona_id: item.parameters.persona_id,
          emotional_arc_id: item.parameters.emotional_arc_id,
          training_topic_id: item.parameters.training_topic_id,
          scaffolding_snapshot: {
            persona: {
              id: assembled.conversation_params.persona.id,
              name: assembled.conversation_params.persona.name,
              persona_key: assembled.conversation_params.persona.persona_key,
              emotional_baseline: assembled.conversation_params.persona.emotional_baseline,
            },
            emotional_arc: {
              id: assembled.conversation_params.emotional_arc.id,
              name: assembled.conversation_params.emotional_arc.name,
              arc_key: assembled.conversation_params.emotional_arc.arc_key,
              starting_emotion: assembled.conversation_params.emotional_arc.starting_emotion,
              ending_emotion: assembled.conversation_params.emotional_arc.ending_emotion,
            },
            training_topic: {
              id: assembled.conversation_params.training_topic.id,
              name: assembled.conversation_params.training_topic.name,
              topic_key: assembled.conversation_params.training_topic.topic_key,
              complexity_level: assembled.conversation_params.training_topic.complexity_level,
            },
            generation_timestamp: new Date().toISOString(),
            scaffolding_version: '1.0',
            compatibility_score: assembled.metadata.compatibility_score,
            system_prompt: assembled.system_prompt,
          },
        })
        .eq('id', convId);

      if (updateError) {
        console.error(`[BatchItemProcessor] ⚠️ Failed to update conversation with scaffolding data:`, updateError);
        // Don't fail the batch item, just log the error
      } else {
        console.log(`[BatchItemProcessor] ✓ Conversation updated with scaffolding provenance`);
      }

      // 8. Record success
      await batchJobService.incrementProgress(jobId, item.id, 'completed', convId);

      console.log(`[BatchItemProcessor] Item ${item.id} completed in ${durationMs}ms: ${convId}`);

      // 9. Log success to storage
      await appendBatchLog(
        jobId,
        `✓ Item ${item.id.slice(0, 8)}... completed (conversation: ${convId.slice(0, 8)}...)`
      );

      return { success: true, conversationId: convId, durationMs };
    } else {
      // Generation failed
      await batchJobService.incrementProgress(
        jobId,
        item.id,
        'failed',
        undefined,
        result.error || 'Generation failed'
      );

      console.error(`[BatchItemProcessor] Item ${item.id} failed in ${durationMs}ms: ${result.error}`);
      await appendBatchLog(
        jobId,
        `✗ Item ${item.id.slice(0, 8)}... failed: ${result.error || 'Unknown error'}`
      );

      return { success: false, error: result.error || 'Generation failed', durationMs };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[BatchItemProcessor] Item ${item.id} error in ${durationMs}ms:`, error);
    await appendBatchLog(
      jobId,
      `✗ Error processing item ${item.id.slice(0, 8)}...: ${errorMessage}`
    );

    await batchJobService.incrementProgress(
      jobId,
      item.id,
      'failed',
      undefined,
      errorMessage
    );

    return { success: false, error: errorMessage, durationMs };
  }
}
```

**Why extract this?** The `process-next/route.ts` handler is 475 lines, with ~220 lines of core processing logic buried inside an HTTP handler. Extracting into a pure function makes the logic testable independently and callable from both the Inngest function and (temporarily) the deprecated route.

---

### Change 3: Create `processBatchJob` Inngest Function

**File to create:** `src/inngest/functions/process-batch-job.ts`

This is the core of the migration. It replaces the browser-driven polling loop with a server-side Inngest function that processes ALL items in a batch job, one `step.run()` per item (enabling Inngest checkpointing for resume-after-failure).

```typescript
/**
 * Inngest Function: Process Batch Conversation Generation Job
 *
 * Replaces the browser-driven polling loop (batch/[jobId]/page.tsx → process-next/route.ts).
 * Each batch item gets its own step.run() call for checkpointing — if the function is
 * interrupted (Vercel redeploy, timeout), Inngest resumes from the last completed step.
 *
 * Trigger: 'batch/job.created' (emitted by POST /api/conversations/generate-batch)
 * Cancel: 'batch/job.cancel.requested' (emitted by POST /api/batch-jobs/[id]/cancel)
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';
import {
  processBatchItem,
  appendBatchLog,
} from '@/lib/services/batch-item-processor';

export const processBatchJob = inngest.createFunction(
  {
    id: 'process-batch-job',
    name: 'Process Batch Conversation Generation Job',
    retries: 1,
    concurrency: { limit: 2 },
    cancelOn: [
      {
        event: 'batch/job.cancel.requested',
        match: 'data.jobId',
      },
    ],
  },
  { event: 'batch/job.created' },
  async ({ event, step }) => {
    const { jobId, userId, workbaseId } = event.data;

    // ─── Step 1: Fetch job and items ───────────────────────────────────────

    const jobData = await step.run('fetch-job-and-items', async () => {
      const job = await batchJobService.getJobById(jobId);

      if (!job) {
        throw new Error(`Batch job not found: ${jobId}`);
      }

      if (job.status === 'cancelled' || job.status === 'completed' || job.status === 'failed') {
        return { skip: true, reason: `Job already ${job.status}`, items: [], config: {} };
      }

      // Update job status to 'processing'
      await batchJobService.updateJobStatus(jobId, 'processing');

      // Optionally store the Inngest event ID on the job for debugging
      try {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('batch_jobs')
          .update({ inngest_event_id: event.id || null })
          .eq('id', jobId);
      } catch (e) {
        // Non-critical — log and continue
        console.warn(`[ProcessBatchJob] Failed to store inngest_event_id on job ${jobId}:`, e);
      }

      const queuedItems = (job.items || [])
        .filter((item: any) => item.status === 'queued')
        .map((item: any) => ({
          id: item.id,
          parameters: item.parameters,
          tier: item.tier,
          position: item.position,
        }));

      await appendBatchLog(
        jobId,
        `Inngest processBatchJob started — ${queuedItems.length} queued items`
      );

      return {
        skip: false,
        reason: undefined,
        items: queuedItems,
        config: job.configuration || {},
      };
    });

    if (jobData.skip) {
      return { skipped: true, reason: jobData.reason };
    }

    // ─── Steps 2..N: Process each item ─────────────────────────────────────
    //
    // CRITICAL: Each batch item MUST be its own step.run() call.
    // Inngest checkpoints after each step. If the function is interrupted
    // (Vercel redeploy, timeout, etc.), Inngest will resume from the last
    // completed step — it will NOT re-process already-completed items.

    const successfulConversationIds: string[] = [];
    let failedCount = 0;

    for (let i = 0; i < jobData.items.length; i++) {
      const item = jobData.items[i];

      const result = await step.run(`process-item-${i}`, async () => {
        // Record processing start time
        try {
          const supabase = createServerSupabaseAdminClient();
          await supabase
            .from('batch_items')
            .update({ processing_started_at: new Date().toISOString() })
            .eq('id', item.id);
        } catch (e) {
          // Non-critical
          console.warn(`[ProcessBatchJob] Failed to set processing_started_at for item ${item.id}`);
        }

        return processBatchItem(jobId, item, userId, workbaseId);
      });

      if (result.success && result.conversationId) {
        successfulConversationIds.push(result.conversationId);
      } else {
        failedCount++;
      }
    }

    // ─── Step N+1: Trigger enrichment (chunked) ────────────────────────────

    const enrichmentResult = await step.run('trigger-enrichment', async () => {
      if (successfulConversationIds.length === 0) {
        return { chunksEmitted: 0, totalConversations: 0 };
      }

      const ENRICH_CHUNK_SIZE = 25;
      const chunks: string[][] = [];

      for (let i = 0; i < successfulConversationIds.length; i += ENRICH_CHUNK_SIZE) {
        chunks.push(successfulConversationIds.slice(i, i + ENRICH_CHUNK_SIZE));
      }

      // Emit one event per chunk (NOT one per conversation)
      const events = chunks.map((chunk) => ({
        name: 'batch/enrich.requested' as const,
        data: {
          conversationIds: chunk,
          userId,
          jobId,
        },
      }));

      await inngest.send(events);

      await appendBatchLog(
        jobId,
        `Enrichment triggered: ${successfulConversationIds.length} conversations in ${chunks.length} chunks`
      );

      return {
        chunksEmitted: chunks.length,
        totalConversations: successfulConversationIds.length,
      };
    });

    // ─── Step N+2: Finalize job ────────────────────────────────────────────

    await step.run('finalize-job', async () => {
      const job = await batchJobService.getJobById(jobId);

      if (!job) {
        console.error(`[ProcessBatchJob] Job not found during finalization: ${jobId}`);
        return;
      }

      // Determine final status based on results
      // If ALL items failed, mark job as 'failed'
      // If job is still 'processing', mark as 'completed'
      if (job.status === 'processing') {
        const finalStatus =
          job.failedItems > 0 && job.failedItems === job.totalItems ? 'failed' : 'completed';
        await batchJobService.updateJobStatus(jobId, finalStatus);

        await appendBatchLog(
          jobId,
          `Batch job ${finalStatus} — ${job.successfulItems} successful, ${job.failedItems} failed`
        );
      }
    });

    return {
      success: true,
      jobId,
      processed: jobData.items.length,
      successful: successfulConversationIds.length,
      failed: failedCount,
      enrichmentChunks: enrichmentResult.chunksEmitted,
    };
  }
);
```

### Key Design Decisions:

1. **One `step.run()` per item** — Inngest checkpoints after each step. Resume-after-failure skips already-completed items.
2. **`cancelOn` with `match: 'data.jobId'`** — Inngest automatically cancels only the matching function instance when `batch/job.cancel.requested` is received.
3. **`concurrency: { limit: 2 }`** — Max 2 batch jobs running simultaneously to avoid overloading the Claude API.
4. **`retries: 1`** — Retry the individual step, not the entire function. Failed items are recorded individually.
5. **The `processBatchItem()` function never throws** — It catches all errors internally and returns `{ success: false }`. The step should never fail/retry for item-level errors.

---

### Change 4: Create `batchEnrichConversations` Inngest Function

**File to create:** `src/inngest/functions/batch-enrich-conversations.ts`

This function replaces per-conversation enrichment for batch operations. It receives a chunk of up to 25 conversation IDs and enriches each one in its own `step.run()`.

```typescript
/**
 * Inngest Function: Batch Enrich Conversations (Chunked)
 *
 * Receives up to 25 conversation IDs and enriches each one.
 * Each conversation gets its own step.run() for checkpointing.
 *
 * Trigger: 'batch/enrich.requested'
 * Emitter: processBatchJob (after all items complete) or trigger-enrich API route
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

export const batchEnrichConversations = inngest.createFunction(
  {
    id: 'batch-enrich-conversations',
    name: 'Batch Enrich Conversations (Chunked)',
    retries: 2,
    concurrency: { limit: 3 },
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

        // Check if conversation exists and needs enrichment
        // Try by conversation_id first (correct field)
        let actualConversationId = conversationId;

        const { data } = await supabase
          .from('conversations')
          .select('conversation_id, enrichment_status')
          .eq('conversation_id', conversationId)
          .single();

        if (!data) {
          // Fallback: try by id (database row ID) — handles legacy ID inconsistency
          const { data: byId } = await supabase
            .from('conversations')
            .select('conversation_id, enrichment_status')
            .eq('id', conversationId)
            .single();

          if (!byId) {
            console.error(`[BatchEnrich] Conversation not found: ${conversationId}`);
            return { status: 'failed' as const, error: 'Not found' };
          }

          if (byId.enrichment_status === 'completed') {
            return { status: 'skipped' as const };
          }

          actualConversationId = byId.conversation_id;
        } else {
          if (data.enrichment_status === 'completed') {
            return { status: 'skipped' as const };
          }
          actualConversationId = data.conversation_id;
        }

        // Run enrichment pipeline
        const { getPipelineOrchestrator } = await import(
          '@/lib/services/enrichment-pipeline-orchestrator'
        );
        await getPipelineOrchestrator().runPipeline(actualConversationId, userId);
        return { status: 'enriched' as const };
      });

      if (result.status === 'enriched') results.enriched++;
      else if (result.status === 'skipped') results.skipped++;
      else results.failed++;
    }

    return results;
  }
);
```

### Key Design Decisions:

1. **Dynamic import of `enrichment-pipeline-orchestrator`** — Matches the pattern used in `auto-enrich-conversation.ts`. Avoids module-level side effects inside step functions.
2. **Dual-lookup strategy** (by `conversation_id` then by `id`) — Matches the pattern in `bulk-enrich/route.ts` to handle legacy ID inconsistencies.
3. **`enrichment_status === 'completed'` check** — Idempotent; already-enriched conversations are skipped on retry.
4. **`concurrency: { limit: 3 }`** — Max 3 enrichment chunks running simultaneously.
5. **`retries: 2`** — More retries than batch processing because enrichment is cheaper.

---

### Change 5: Register New Inngest Functions

**File:** `src/inngest/functions/index.ts`

**Current content (34 lines):**
```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { restartInferenceWorkers } from './restart-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
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
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
};
```

**Replace with:**
```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { restartInferenceWorkers } from './restart-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';
import { buildTrainingSet } from './build-training-set';
import { rebuildTrainingSet } from './rebuild-training-set';
import { processBatchJob } from './process-batch-job';
import { batchEnrichConversations } from './batch-enrich-conversations';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
  processBatchJob,
  batchEnrichConversations,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  restartInferenceWorkers,
  autoEnrichConversation,
  buildTrainingSet,
  rebuildTrainingSet,
  processBatchJob,
  batchEnrichConversations,
};
```

This brings the total registered Inngest functions from 9 to 11.

---

### Change 6: Modify `generate-batch` Route to Emit Inngest Event

**File:** `src/app/api/conversations/generate-batch/route.ts` (153 lines)

**Action 6a — Add `inngest` import.**

Add after the existing imports (after line 5):

```typescript
import { inngest } from '@/inngest/client';
```

The existing imports are:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { getBatchGenerationService } from '@/lib/services';
import type { BatchGenerationRequest } from '@/lib/services';
```

Add `import { inngest } from '@/inngest/client';` after line 5 (after the `BatchGenerationRequest` import).

**Action 6b — Emit `batch/job.created` event after successful job creation.**

Inside the `POST` handler, after `const result = await batchService.startBatchGeneration(batchRequest);` succeeds (approximately line 91) and before the `return NextResponse.json(...)` response (approximately line 95), add:

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

**Replace** the existing `console.log` line (approximately line 93):
```typescript
    console.log(`🚀 Started batch generation job: ${result.jobId}`);
```

with the event emission and updated log line above.

> **Note:** The `startBatchGeneration()` call creates the `batch_jobs` and `batch_items` rows in the DB and returns `{ jobId, status, estimatedCost, estimatedTime }`. The Inngest event is emitted AFTER this succeeds, so if DB creation fails, no orphaned events exist.

---

### Change 7: Modify `cancel` Route to Emit Inngest Cancel Event

**File:** `src/app/api/batch-jobs/[id]/cancel/route.ts` (95 lines)

**Action 7a — Add `inngest` import.**

Add after the existing imports:

```typescript
import { inngest } from '@/inngest/client';
```

The existing imports are:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';
```

Add `import { inngest } from '@/inngest/client';` after line 3.

**Action 7b — Emit `batch/job.cancel.requested` event after DB cancellation.**

After the `await batchJobService.cancelJob(id, user.id);` call (approximately line 61) and before the `console.log` on the next line, add:

```typescript
    // Signal Inngest to cancel the running function
    await inngest.send({
      name: 'batch/job.cancel.requested',
      data: {
        jobId: id,
        userId: user.id,
      },
    });
```

The Inngest event triggers the `cancelOn` config in `processBatchJob`, which stops executing future steps for the matching `jobId`.

---

### Change 8: Create `trigger-enrich` API Route

**File to create:** `src/app/api/conversations/trigger-enrich/route.ts`

This replaces `POST /api/conversations/bulk-enrich` for triggering enrichment. Instead of processing conversations synchronously in a single HTTP request, it emits chunked Inngest events.

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

**Event efficiency:** 108 conversations → 5 events (chunks of 25, 25, 25, 25, 8). 500 conversations → 20 events. No upper limit on input size.

---

### Change 9: Simplify Batch Watcher Page (Status Viewer Only)

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` (756 lines)

This is the most complex change. The page must be converted from a **processing driver** to a **pure status viewer**. The processing loop is entirely removed; the page now only polls the status endpoint and displays results.

#### 9a — Remove Processing State and Refs

**Remove the following state/ref declarations** (approximately lines 62-68):

```typescript
  // Processing state — mirrors legacy page exactly
  const [processingActive, setProcessingActive] = useState(false);
  const processingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const didProcessRef = useRef(false);
  const autoEnrichTriggeredRef = useRef(false);
  const [lastItemError, setLastItemError] = useState<string | null>(null);
```

**Replace with:**

```typescript
  // Auto-enrich tracking
  const autoEnrichTriggeredRef = useRef(false);
```

#### 9b — Remove Processing Callbacks

**Remove the entire `processNextItem` callback** (approximately lines 100-148):

```typescript
  const processNextItem = useCallback(async (): Promise<boolean> => {
    // ... entire function body ...
  }, [jobId]);
```

**Remove the entire `startProcessing` callback** (approximately lines 150-169):

```typescript
  const startProcessing = useCallback(async () => {
    // ... entire function body ...
  }, [processNextItem, fetchStatus]);
```

**Remove the entire `stopProcessing` callback** (approximately lines 171-173):

```typescript
  const stopProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);
```

#### 9c — Replace Effects with Polling

**Remove the auto-start processing effect** (approximately lines 191-200):

```typescript
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

**Replace the auto-enrich effect** (approximately lines 202-216) with:

```typescript
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

**Add a polling effect** (add after the safety timer effect, approximately after line 189):

```typescript
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

#### 9d — Simplify `handleAction`

In the `handleAction` function (approximately lines 218-253), remove the `stopProcessing()` calls, the `startProcessing()` call, and the pause/resume branches. The cancel action now only needs to call the cancel API (which emits the Inngest cancel event server-side).

**Current code:**
```typescript
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

**Replace with:**
```typescript
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

> **Note:** Pause/resume is removed. The Inngest function processes items sequentially and cancellation is the only supported control action. If pause/resume is needed in the future, it can be added via a `batch/job.pause.requested` event, but this is out of scope for this migration.

#### 9e — Rewire `handleEnrichAll` to Use `trigger-enrich`

**Replace the entire `handleEnrichAll` function** (approximately lines 255-327) with:

```typescript
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

**Key changes from old `handleEnrichAll`:**
- Calls `/api/conversations/trigger-enrich` instead of `/api/conversations/bulk-enrich`
- No `.max(100)` limit — any number of conversations are accepted
- Returns immediately after queuing (Inngest processes asynchronously)
- `enrichResult` reflects queued count, not synchronous completion

#### 9f — Update Enrichment Result Display

The enrichment result display (in the Completion Card, approximately line 595-604) currently shows "X enriched, Y skipped, Z failed". Since enrichment is now async via Inngest, update the display to reflect the queued status.

**Current code:**
```typescript
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

**Replace with:**
```typescript
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

#### 9g — Update Actions Card (Remove Processing UI)

In the Actions Card (approximately lines 540-585), remove the processing-related buttons and badges:

**Remove:**
```typescript
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
```

**Replace with:**
```typescript
          {(status.status === 'processing' || status.status === 'queued') && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing in background...
            </Badge>
          )}
```

**Update the Cancel button condition** — remove `processingActive` guard:

**Current:**
```typescript
          {(isActive || isPaused) && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading || processingActive}
            >
```

**Replace with:**
```typescript
          {isActive && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
            >
```

#### 9h — Clean Up Unused Imports

After removing the processing logic, the following imports are no longer needed. Remove them:

- `Play` from lucide-react (was used for "Resume Processing" button)
- `Pause` from lucide-react (was used for pause state icon)
- `StopCircle` from lucide-react (was used for "Stop" button)

The `useRef` import should remain (still used for `autoEnrichTriggeredRef`).

---

### Change 10: Deprecate `process-next` Route

**File:** `src/app/api/batch-jobs/[id]/process-next/route.ts` (475 lines)

**Action:** Replace the entire `POST` handler body with a 410 Gone response. Keep the file so existing client code gets a clear error instead of 404.

Add at the top of the file, before the existing code:

```typescript
/**
 * @deprecated — Replaced by Inngest `processBatchJob` function.
 * Batch item processing now happens server-side via Inngest.
 * This route returns 410 Gone to inform any lingering clients.
 */
```

Replace the `POST` export function body with:

```typescript
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

Keep the `appendBatchLog` and `autoSelectTemplate` helper functions in the file temporarily — they are also defined in the new `batch-item-processor.ts`. Once the deprecated route is fully removed in a future cleanup, this file can be deleted entirely.

> **Alternative:** If you prefer a clean break, move the utility functions to `batch-item-processor.ts` (already done in Change 2) and delete this entire file. However, returning 410 is safer for any cached clients or browser tabs still open during deployment.

---

### Change 11: Deprecate `bulk-enrich` Route

**File:** `src/app/api/conversations/bulk-enrich/route.ts` (190 lines)

**Action:** Add a deprecation notice and redirect to the new endpoint. Replace the `POST` handler body:

```typescript
/**
 * @deprecated — Replaced by POST /api/conversations/trigger-enrich.
 * Enrichment now uses chunked Inngest events with no conversation limit.
 */
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

Keep the file with imports intact for clean 410 responses.

---

### Change 12: Remove Dead Code from `batch-generation-service.ts`

**File:** `src/lib/services/batch-generation-service.ts` (674 lines)

Remove the following dead code sections. These are broken in Vercel's serverless environment and have been replaced by Inngest.

**12a — Remove `activeJobs` Map** (approximately line 118):
```typescript
  private activeJobs = new Map<string, ActiveJob>();
```
And the `ActiveJob` interface it uses (search for `interface ActiveJob`).

**12b — Remove `pauseJob` method** (approximately lines 281-297):
```typescript
  async pauseJob(jobId: string): Promise<BatchJobStatus> { ... }
```

**12c — Remove `resumeJob` method** (approximately lines 299-328):
```typescript
  async resumeJob(jobId: string): Promise<BatchJobStatus> { ... }
```

**12d — Remove `processJobInBackground` method** (approximately lines 459-555):
```typescript
  private async processJobInBackground(...): Promise<void> { ... }
```

**12e — Remove `processItem` method** (approximately lines 560-650) — this is the private method called by `processJobInBackground`:
```typescript
  private async processItem(jobId: string, item: any, userId: string): Promise<void> { ... }
```

**12f — Add deprecation note to the class JSDoc**, at the top of the file:

```typescript
/**
 * Batch Generation Service
 *
 * Orchestrates batch conversation generation job CREATION and configuration.
 * Job PROCESSING is now handled by the Inngest `processBatchJob` function.
 *
 * @deprecated The following methods are no longer functional and have been removed:
 *   - processJobInBackground (replaced by Inngest processBatchJob)
 *   - pauseJob, resumeJob (replaced by Inngest cancelOn)
 *   - processItem (extracted to batch-item-processor.ts)
 */
```

> **Keep the `startBatchGeneration()` method** — it is still actively used by `generate-batch/route.ts` to create the `batch_jobs` and `batch_items` DB records. Only the processing/execution methods are dead code.

---

## Database Changes (SAOL)

> **CRITICAL:** All schema changes below MUST be executed using SAOL (`agentExecuteDDL`) with `dryRun: true` first, then `dryRun: false` to apply.

### DDL 1: Add `inngest_event_id` Column to `batch_jobs`

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  // Step 1: Dry-run
  const dryRun = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE batch_jobs
      ADD COLUMN IF NOT EXISTS inngest_event_id TEXT DEFAULT NULL;

      COMMENT ON COLUMN batch_jobs.inngest_event_id IS
        'Inngest event ID that triggered processing. Used for debugging and status correlation.';
    \`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL', dryRun.summary || dryRun.error);

  // Step 2: Execute if validation passed
  if (dryRun.success) {
    const result = await saol.agentExecuteDDL({
      sql: \`
        ALTER TABLE batch_jobs
        ADD COLUMN IF NOT EXISTS inngest_event_id TEXT DEFAULT NULL;

        COMMENT ON COLUMN batch_jobs.inngest_event_id IS
          'Inngest event ID that triggered processing. Used for debugging and status correlation.';
      \`,
      transaction: true,
      transport: 'pg'
    });
    console.log('Execute:', result.success ? 'SUCCESS' : 'FAIL', result.summary || result.error);
  }
})();
"
```

### DDL 2: Add `processing_started_at` Column to `batch_items`

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  // Step 1: Dry-run
  const dryRun = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE batch_items
      ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ DEFAULT NULL;

      COMMENT ON COLUMN batch_items.processing_started_at IS
        'Timestamp when Inngest started processing this item. Used for duration tracking.';
    \`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL', dryRun.summary || dryRun.error);

  // Step 2: Execute if validation passed
  if (dryRun.success) {
    const result = await saol.agentExecuteDDL({
      sql: \`
        ALTER TABLE batch_items
        ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ DEFAULT NULL;

        COMMENT ON COLUMN batch_items.processing_started_at IS
          'Timestamp when Inngest started processing this item. Used for duration tracking.';
      \`,
      transaction: true,
      transport: 'pg'
    });
    console.log('Execute:', result.success ? 'SUCCESS' : 'FAIL', result.summary || result.error);
  }
})();
"
```

### Verification: Confirm New Columns Exist

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
  const result = await saol.agentIntrospectSchema({
    tables: ['batch_jobs', 'batch_items'],
    transport: 'pg'
  });
  console.log(JSON.stringify(result, null, 2));
})();
"
```

---

## Implementation Sequence

Execute in this exact order:

| Step | Action | Depends On |
|------|--------|-----------|
| 1 | **Run DDL 1 and DDL 2** (database schema changes via SAOL) | Nothing |
| 2 | **Create `src/lib/services/batch-item-processor.ts`** (Change 2) | Nothing |
| 3 | **Create `src/inngest/functions/process-batch-job.ts`** (Change 3) | Step 2 (imports `batch-item-processor`) |
| 4 | **Create `src/inngest/functions/batch-enrich-conversations.ts`** (Change 4) | Nothing |
| 5 | **Update `src/inngest/client.ts`** (Change 1) — add 3 new event types | Nothing |
| 6 | **Update `src/inngest/functions/index.ts`** (Change 5) — register 2 new functions | Steps 3, 4 |
| 7 | **Create `src/app/api/conversations/trigger-enrich/route.ts`** (Change 8) | Step 5 (uses `inngest` client) |
| 8 | **Update `src/app/api/conversations/generate-batch/route.ts`** (Change 6) | Step 5 |
| 9 | **Update `src/app/api/batch-jobs/[id]/cancel/route.ts`** (Change 7) | Step 5 |
| 10 | **Update batch watcher page** (Change 9 — all sub-changes 9a-9h) | Step 7 (uses `trigger-enrich`) |
| 11 | **Deprecate `process-next/route.ts`** (Change 10) | Step 3 (replacement is ready) |
| 12 | **Deprecate `bulk-enrich/route.ts`** (Change 11) | Step 7 (replacement is ready) |
| 13 | **Remove dead code from `batch-generation-service.ts`** (Change 12) | Nothing (independent) |
| 14 | **Run `npx tsc --noEmit`** to validate TypeScript compilation | All previous steps |

---

## Acceptance Criteria

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

### AC3: Enrichment Works for Large Batches

1. Submit a batch of 110+ conversations
2. Wait for batch to complete
3. **Expected:** Auto-enrich triggers successfully — no "Invalid request" or "max 100" errors
4. **Expected:** Enrichment processes via Inngest in the background
5. **Expected:** Total Inngest events: 1 (batch/job.created) + ceil(110/25) = 1 + 5 = 6 events

### AC4: Cancel Works via Inngest

1. Submit a batch of 50 conversations
2. While processing, click "Cancel Job"
3. **Expected:** Processing stops within ~30 seconds (current item finishes, no new items start)
4. **Expected:** Already-generated conversations are preserved in the database
5. **Expected:** Job status shows "CANCELLED"

### AC5: Inngest Dashboard Verification

1. Open the Inngest dashboard (dev or production)
2. **Expected:** `process-batch-job` function is registered
3. **Expected:** `batch-enrich-conversations` function is registered
4. **Expected:** Total registered functions = 11
5. **Expected:** Step-level progress is visible in function run details for `process-batch-job`

### AC6: Deprecated Endpoints Return 410

1. Call `POST /api/batch-jobs/{id}/process-next`
2. **Expected:** 410 Gone with deprecation message
3. Call `POST /api/conversations/bulk-enrich`
4. **Expected:** 410 Gone with deprecation message

### AC7: Single Conversation Generation Unchanged

1. Generate a single conversation via `POST /api/conversations/generate`
2. **Expected:** `conversation/generation.completed` event is still emitted
3. **Expected:** `autoEnrichConversation` function still runs for single conversations
4. **Expected:** No change to existing single-generation behavior

### AC8: TypeScript Compiles Clean

1. Run `npx tsc --noEmit`
2. **Expected:** Zero type errors related to these changes

---

## Warnings — Things the Implementing Agent Must NOT Do

1. **Do NOT modify `autoEnrichConversation`** (`src/inngest/functions/auto-enrich-conversation.ts`). It remains unchanged for single-conversation generation.

2. **Do NOT reference SAOL in application code.** SAOL is CLI-only for agent-driven terminal/script DB operations. Application code (Inngest functions, API routes) uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server`. All code in this spec follows this pattern.

3. **Do NOT remove the `startBatchGeneration()` method** from `batch-generation-service.ts`. It is still used by `generate-batch/route.ts` to create DB records. Only remove the dead processing/execution methods listed in Change 12.

4. **Do NOT emit `conversation/generation.completed`** from the `processBatchJob` function. Batch enrichment uses the new `batch/enrich.requested` event with chunking. Emitting per-conversation events would defeat the 96% event reduction goal.

5. **Do NOT add a `.max()` limit** to the `trigger-enrich` Zod schema. The old `.max(100)` limit in `bulk-enrich` was the bug. Chunking handles any input size.

6. **Do NOT use hardcoded colors** (`zinc-*`, `slate-*`, `gray-*`) in any new or modified code. Use design tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-duck-blue`.

7. **Do NOT create a PATCH route for pause/resume.** The existing `PATCH /api/conversations/batch/${jobId}` route for pause/resume is no longer needed. Cancellation is the only supported control action. If a batch is cancelled, the user can regenerate.

8. **Do NOT change the generate page** (`generate/page.tsx`). It already calls `POST /api/conversations/generate-batch` and navigates to the watcher. No changes needed.

9. **Read each file before modifying it.** This spec was written against the current state of the codebase, but confirm file contents before editing. The codebase may have evolved.

10. **Use `Promise<{ id: string }>` for route params** in new/modified routes that use Next.js 15 async params pattern (matching `cancel/route.ts` and `process-next/route.ts`). The `status` and `items` routes use the older synchronous pattern — do not change those.

11. **The `batch_items` table uses `conversation_id` as an FK referencing `conversations.id` (the PK, not the business key).** When storing the conversation ID after generation, use `result.conversation.id` (the PK), not `result.conversation.conversation_id` (the business key). This is already handled correctly in the extracted `batch-item-processor.ts`.

---

## Summary of All Changes

| Category | Count | Details |
|----------|-------|---------|
| **New Inngest functions** | 2 | `processBatchJob`, `batchEnrichConversations` |
| **New Inngest events** | 3 | `batch/job.created`, `batch/job.cancel.requested`, `batch/enrich.requested` |
| **New API routes** | 1 | `trigger-enrich` |
| **New service files** | 1 | `batch-item-processor.ts` (extracted logic) |
| **Modified API routes** | 2 | `generate-batch` + `cancel` (emit Inngest events) |
| **Modified Inngest config** | 2 | `client.ts` (events) + `index.ts` (registrations) |
| **Modified frontend pages** | 1 | Batch watcher (remove processing loop → status viewer) |
| **Deprecated API routes** | 2 | `process-next` + `bulk-enrich` → 410 Gone |
| **Dead code removed** | ~200 lines | From `batch-generation-service.ts` |
| **DB schema changes** | 2 columns | `inngest_event_id` on `batch_jobs`, `processing_started_at` on `batch_items` |
| **Existing functions unchanged** | 1 | `autoEnrichConversation` — still handles single-conversation generation |
| **Total registered Inngest functions** | 11 | Up from 9 |

### Inngest Event Budget (Per Batch Job)

| Conversations | v1 Events (1:1) | v2 Events (Chunked) | Savings |
|--------------|-----------------|---------------------|---------|
| 10 | 11 | 2 | 82% |
| 50 | 51 | 3 | 94% |
| 108 | 109 | 6 | 94% |
| 500 | 501 | 21 | 96% |
| 1000 | 1001 | 41 | 96% |

Formula: `1 (batch/job.created) + ceil(successful_conversations / 25) (batch/enrich.requested)`
