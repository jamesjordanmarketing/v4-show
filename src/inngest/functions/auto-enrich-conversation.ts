import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Auto-Enrich Conversation (D8)
 *
 * Triggered after a conversation is generated and saved.
 * Runs the enrichment pipeline automatically instead of requiring
 * a manual "Enrich All" button click.
 *
 * Concurrency: 3 (allow parallel enrichment of different conversations)
 */
export const autoEnrichConversation = inngest.createFunction(
  {
    id: 'auto-enrich-conversation',
    name: 'Auto-Enrich Generated Conversation',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'conversation/generation.completed' },
  async ({ event, step }) => {
    const { conversationId, userId } = event.data;

    // Step 1: Fetch conversation and verify it needs enrichment
    const conversation = await step.run('fetch-conversation', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('conversations')
        .select('id, enrichment_status, status')
        .eq('id', conversationId)
        .single();

      if (error || !data) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Skip if already enriched
      if (data.enrichment_status === 'completed') {
        return { skip: true, reason: 'already enriched' };
      }

      return { skip: false, reason: undefined, conversation: data };
    });

    if (conversation.skip) {
      return { skipped: true, reason: conversation.reason };
    }

    // Step 2: Run enrichment
    await step.run('run-enrichment', async () => {
      const { getPipelineOrchestrator } = await import(
        '@/lib/services/enrichment-pipeline-orchestrator'
      );
      const orchestrator = getPipelineOrchestrator();
      await orchestrator.runPipeline(conversationId, userId);
      return { enriched: true };
    });

    return { success: true, conversationId };
  }
);
