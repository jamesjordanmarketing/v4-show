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
