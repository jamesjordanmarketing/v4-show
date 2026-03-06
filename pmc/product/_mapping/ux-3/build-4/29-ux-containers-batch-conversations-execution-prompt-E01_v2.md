# Spec 29 — E01: Backend Foundation (Database + Inngest Events + Shared Service + Inngest Functions)

**Version:** 2.0  
**Date:** 2026-03-04  
**Section:** E01 — Backend Foundation  
**Prerequisites:** Spec 30 (E01–E03) must be complete (training set monitoring, cross-page selection, enrichment filter — all applied)  
**Next:** E02 (API Routes & Deprecations), E03 (UX Page Migration)  
**Change log (v2):** Post-Spec-30 verification pass. Fixed `functions/index.ts` line count from 34 to 32. Fixed TypeScript compilation command to use `--project src/tsconfig.json` (no root tsconfig exists). Confirmed all service methods, types, import paths, and Inngest patterns match the current post-Spec-30 codebase. No code changes required — all "current code" blocks verified accurate.

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
| Background Jobs | Inngest (currently 9 registered functions) |
| Deployment | Vercel (frontend + API routes) |
| DB Operations | **SAOL (mandatory for agent terminal/script DB ops)** — `supa-agent-ops/` |

**Codebase Structure:**
```
v4-show/
├── src/
│   ├── app/                          # App Router pages + API routes
│   ├── components/                   # React components
│   ├── hooks/                        # Custom React hooks
│   ├── lib/services/                 # Business logic services
│   ├── inngest/                      # Inngest client + functions
│   │   ├── client.ts                 # Inngest client with event type definitions (155 lines)
│   │   └── functions/                # Background job functions
│   │       ├── index.ts              # Function registry (32 lines, 9 functions)
│   │       ├── process-rag-document.ts
│   │       ├── dispatch-training-job.ts
│   │       ├── auto-deploy-adapter.ts
│   │       ├── refresh-inference-workers.ts
│   │       ├── restart-inference-workers.ts
│   │       ├── auto-enrich-conversation.ts
│   │       ├── build-training-set.ts
│   │       └── rebuild-training-set.ts
│   └── types/                        # TypeScript type definitions
├── supa-agent-ops/                   # SAOL library for DB operations
└── supabase/                         # Supabase config
```

---

## SAOL — Mandatory for All Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL terminal/script database operations.**

```javascript
// Schema changes (DDL)
await agentExecuteDDL({
  sql: 'ALTER TABLE ... ;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first, then set false to apply
});
```

**Rules:**
1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY`
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **No raw SQL** — do not use `supabase-js` or direct PostgreSQL for schema changes

---

## What This Prompt Creates

This is the backend foundation for migrating batch conversation generation from browser-driven polling to Inngest-managed background jobs.

| # | Action | File |
|---|--------|------|
| 1 | Database DDL — add `inngest_event_id` to `batch_jobs` | SAOL terminal command |
| 2 | Database DDL — add `processing_started_at` to `batch_items` | SAOL terminal command |
| 3 | Add 3 new event types to Inngest client | `src/inngest/client.ts` |
| 4 | Create shared batch item processor service | `src/lib/services/batch-item-processor.ts` (NEW) |
| 5 | Create `processBatchJob` Inngest function | `src/inngest/functions/process-batch-job.ts` (NEW) |
| 6 | Create `batchEnrichConversations` Inngest function | `src/inngest/functions/batch-enrich-conversations.ts` (NEW) |
| 7 | Register 2 new functions in Inngest index | `src/inngest/functions/index.ts` |
| 8 | Verify TypeScript compilation | `npx tsc --noEmit --project src/tsconfig.json` |

**What This Prompt Does NOT Do:**
- Modify any API routes (that's E02)
- Modify the batch watcher page UI (that's E03)
- Deprecate any routes (that's E02)
- Remove dead code from batch-generation-service.ts (that's E02)

---

## Implementation Sequence

Execute in this exact order:

---

### Task 1: Database Schema Changes (SAOL)

#### 1a: Add `inngest_event_id` column to `batch_jobs`

Run this SAOL command in the terminal:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
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

#### 1b: Add `processing_started_at` column to `batch_items`

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops" && node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
(async () => {
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

#### 1c: Verify new columns exist

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

Verify that `batch_jobs` has the `inngest_event_id TEXT` column and `batch_items` has the `processing_started_at TIMESTAMPTZ` column in the output.

---

### Task 2: Add New Event Types to Inngest Client

**File:** `src/inngest/client.ts` (155 lines)

**Current state:** The `InngestEvents` type (starting at line ~49) ends with:

```typescript
  'training/set.created': {
    data: {
      trainingSetId: string;
      workbaseId: string;
      conversationIds: string[];
      userId: string;
    };
  };
};
```

The closing `};` for the `InngestEvents` type is at approximately **line 155**.

**Action:** Add three new event type definitions inside the `InngestEvents` type, immediately BEFORE the final `};` that closes the type definition. Insert the following block between the `'training/set.created'` block's closing `};` and the final `};`:

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

**IMPORTANT:** The existing `'conversation/generation.completed'` event and `autoEnrichConversation` function remain completely unchanged. They continue to serve single-conversation generation via `POST /api/conversations/generate`. The new `'batch/enrich.requested'` event is ONLY used for batch operations.

---

### Task 3: Create Shared Batch Item Processor

**File to create:** `src/lib/services/batch-item-processor.ts`

This file extracts the core item-processing logic from `src/app/api/batch-jobs/[id]/process-next/route.ts` into a reusable service. Both the new Inngest function and any future direct-invoke path can use this same code.

**Why extract this?** The `process-next/route.ts` handler is 475 lines, with ~220 lines of core processing logic buried inside an HTTP handler. Extracting into a pure function makes the logic testable independently and callable from both the Inngest function and (temporarily) the deprecated route.

Create this file with exactly the following content:

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

---

### Task 4: Create `processBatchJob` Inngest Function

**File to create:** `src/inngest/functions/process-batch-job.ts`

This is the core of the migration. It replaces the browser-driven polling loop with a server-side Inngest function that processes ALL items in a batch job, one `step.run()` per item (enabling Inngest checkpointing for resume-after-failure).

Create this file with exactly the following content:

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

**Key Design Decisions:**
1. **One `step.run()` per item** — Inngest checkpoints after each step. Resume-after-failure skips already-completed items.
2. **`cancelOn` with `match: 'data.jobId'`** — Inngest automatically cancels only the matching function instance when `batch/job.cancel.requested` is received.
3. **`concurrency: { limit: 2 }`** — Max 2 batch jobs running simultaneously to avoid overloading the Claude API.
4. **`retries: 1`** — Retry the individual step, not the entire function. Failed items are recorded individually.
5. **The `processBatchItem()` function never throws** — It catches all errors internally and returns `{ success: false }`. The step should never fail/retry for item-level errors.

---

### Task 5: Create `batchEnrichConversations` Inngest Function

**File to create:** `src/inngest/functions/batch-enrich-conversations.ts`

This function replaces per-conversation enrichment for batch operations. It receives a chunk of up to 25 conversation IDs and enriches each one in its own `step.run()`.

Create this file with exactly the following content:

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

**Key Design Decisions:**
1. **Dynamic import of `enrichment-pipeline-orchestrator`** — Matches the pattern used in `auto-enrich-conversation.ts`. Avoids module-level side effects inside step functions.
2. **Dual-lookup strategy** (by `conversation_id` then by `id`) — Matches the pattern in `bulk-enrich/route.ts` to handle legacy ID inconsistencies.
3. **`enrichment_status === 'completed'` check** — Idempotent; already-enriched conversations are skipped on retry.
4. **`concurrency: { limit: 3 }`** — Max 3 enrichment chunks running simultaneously.
5. **`retries: 2`** — More retries than batch processing because enrichment is cheaper.

---

### Task 6: Register New Inngest Functions

**File:** `src/inngest/functions/index.ts` (32 lines)

**Current content (confirmed by codebase read):**
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

**Replace the entire file with:**

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

### Task 7: Verify TypeScript Compilation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit --project src/tsconfig.json 2>&1 | head -60
```

Fix any TypeScript errors before proceeding to E02. Common issues to watch for:
- Import path mismatches (check `@/lib/services/batch-item-processor` resolves correctly)
- Missing type exports from `batch-job-service` (e.g., `updateItemStatus`, `incrementProgress`)
- The `inngest.createFunction` generic types should auto-infer from the updated `InngestEvents` type

---

## Success Criteria for E01

- [ ] `batch_jobs` table has `inngest_event_id TEXT` column
- [ ] `batch_items` table has `processing_started_at TIMESTAMPTZ` column
- [ ] `src/inngest/client.ts` has 3 new event types: `batch/job.created`, `batch/job.cancel.requested`, `batch/enrich.requested`
- [ ] `src/lib/services/batch-item-processor.ts` exists with `processBatchItem()`, `appendBatchLog()`, `autoSelectTemplate()` exports
- [ ] `src/inngest/functions/process-batch-job.ts` exists with `processBatchJob` export
- [ ] `src/inngest/functions/batch-enrich-conversations.ts` exists with `batchEnrichConversations` export
- [ ] `src/inngest/functions/index.ts` registers 11 functions (was 9)
- [ ] `npx tsc --noEmit --project src/tsconfig.json` passes with zero errors

---

## Files Created by E01

| File | Purpose |
|------|---------|
| `src/lib/services/batch-item-processor.ts` | Shared batch item processing logic |
| `src/inngest/functions/process-batch-job.ts` | Core Inngest function for batch processing |
| `src/inngest/functions/batch-enrich-conversations.ts` | Chunked enrichment Inngest function |

## Files Modified by E01

| File | Change |
|------|--------|
| `src/inngest/client.ts` | Added 3 new event type definitions |
| `src/inngest/functions/index.ts` | Added 2 new function registrations |

## Database Changes by E01

| Table | Column Added |
|-------|-------------|
| `batch_jobs` | `inngest_event_id TEXT DEFAULT NULL` |
| `batch_items` | `processing_started_at TIMESTAMPTZ DEFAULT NULL` |

---

**END OF E01 PROMPT — Proceed to E02 for API route wiring and deprecations.**


+++++++++++++++++


