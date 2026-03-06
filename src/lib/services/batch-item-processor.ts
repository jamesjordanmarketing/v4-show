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
import type { TierType } from '@/lib/types';

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
    tier?: TierType;
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
