import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { createTrainingFileService } from '@/lib/services/training-file-service';

/**
 * Build Training Set (Rewritten — v4 Format)
 *
 * Triggered after a training_sets row is created with status: 'processing'.
 *
 * Steps:
 *   1. Validate conversations (enrichment_status === 'completed')
 *   2. Use TrainingFileService to aggregate enriched JSONs → Full Training JSON → v4 JSONL
 *   3. Upload JSONL to Supabase Storage
 *   4. Auto-create a datasets record (so Launch page can resolve datasetId for job creation)
 *   5. Update training_sets record to status: 'ready' with jsonl_path and dataset_id
 */
export const buildTrainingSet = inngest.createFunction(
  {
    id: 'build-training-set',
    name: 'Build Training Set JSONL (v4 Format)',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'training/set.created' },
  async ({ event, step }) => {
    const { trainingSetId, workbaseId, conversationIds, userId } = event.data;

    // Step 1: Fetch the training set record for its name
    const trainingSet = await step.run('fetch-training-set', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('training_sets')
        .select('id, name')
        .eq('id', trainingSetId)
        .single();
      if (error || !data) throw new Error(`Training set not found: ${trainingSetId}`);
      return data;
    });

    // Step 2: Use TrainingFileService to aggregate enriched JSONs and produce v4 JSONL
    //
    //   TrainingFileService.createTrainingFile() does:
    //     a) resolveToConversationIds (handles PK vs business key)
    //     b) validateConversationsForTraining (checks enrichment_status === 'completed')
    //     c) fetchEnrichedConversations (downloads enriched JSONs from Storage)
    //     d) aggregateConversationsToFullJSON (builds v4 schema)
    //     e) convertFullJSONToJSONL (one line per training pair, with emotional_context, training_metadata)
    //     f) uploads both files to Storage
    //     g) creates training_files DB record + junction associations
    //
    //   We call createTrainingFile() directly — it produces the correct v4 JSONL
    //   AND creates a training_files record that we can reference.
    //   This reuses 100% of the proven aggregation logic.

    const trainingFile = await step.run('create-training-file-v4', async () => {
      const supabase = createServerSupabaseAdminClient();
      const service = createTrainingFileService(supabase);

      try {
        const result = await service.createTrainingFile({
          name: trainingSet.name,
          description: `Auto-created by workbase training set ${trainingSetId}`,
          conversation_ids: conversationIds,
          created_by: userId,
        });
        return {
          id: result.id,
          jsonlPath: result.jsonl_file_path,
          totalTrainingPairs: result.total_training_pairs,
          conversationCount: result.conversation_count,
        };
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();

        // Parse failed conversation IDs from the validation error message.
        const failedIds: string[] = [];
        const convIdRegex = /Conversation ([0-9a-f-]{36}):/g;
        let match;
        while ((match = convIdRegex.exec(err.message)) !== null) {
          if (!failedIds.includes(match[1])) failedIds.push(match[1]);
        }

        await supabase2
          .from('training_sets')
          .update({
            status: 'failed',
            last_build_error: err.message,
            failed_conversation_ids: failedIds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingSetId);

        throw new Error(`Training file creation failed: ${err.message}`);
      }
    });

    if (!trainingFile || !trainingFile.jsonlPath) {
      return { success: false, reason: 'No JSONL produced' };
    }

    // Step 3: Auto-create datasets record
    //   This is the "bridge" that the legacy flow does manually via /datasets/import.
    //   The Launch page needs a datasetId to call POST /api/pipeline/jobs.
    const dataset = await step.run('auto-create-dataset', async () => {
      const supabase = createServerSupabaseAdminClient();

      // Extract file name from JSONL path
      const fileName = trainingFile.jsonlPath.split('/').pop() || 'training.jsonl';
      // Estimate tokens (same heuristic as legacy import-from-training-file)
      const totalTokens = (trainingFile.totalTrainingPairs || 0) * 200;
      const avgTurnsPerConversation = trainingFile.conversationCount > 0
        ? parseFloat((trainingFile.totalTrainingPairs / trainingFile.conversationCount).toFixed(2))
        : 0;
      const avgTokensPerTurn = trainingFile.totalTrainingPairs > 0
        ? parseFloat((totalTokens / trainingFile.totalTrainingPairs).toFixed(2))
        : 0;

      const { data, error } = await supabase
        .from('datasets')
        .insert({
          user_id: userId,
          name: trainingSet.name,
          description: `Auto-created from training set ${trainingSetId}`,
          format: 'brightrun_lora_v4',
          status: 'ready',
          storage_bucket: 'training-files',
          storage_path: trainingFile.jsonlPath,
          file_name: fileName,
          file_size: 0,
          total_training_pairs: trainingFile.totalTrainingPairs,
          total_validation_pairs: 0,
          total_tokens: totalTokens,
          avg_turns_per_conversation: avgTurnsPerConversation,
          avg_tokens_per_turn: avgTokensPerTurn,
          training_ready: true,
          validated_at: new Date().toISOString(),
          validation_errors: null,
          sample_data: null,
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create dataset: ${error.message}`);
      return { id: data.id };
    });

    // Step 4: Update training_sets record → status: 'ready', set jsonl_path and dataset_id
    await step.run('update-training-set-ready', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          last_build_error: null,
          failed_conversation_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);

      if (error) throw new Error(`Failed to update training set: ${error.message}`);
    });

    return {
      success: true,
      trainingSetId,
      trainingFileId: trainingFile.id,
      datasetId: dataset.id,
      jsonlPath: trainingFile.jsonlPath,
      trainingPairCount: trainingFile.totalTrainingPairs,
      conversationCount: trainingFile.conversationCount,
    };
  }
);
