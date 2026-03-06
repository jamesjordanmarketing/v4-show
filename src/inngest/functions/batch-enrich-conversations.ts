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
