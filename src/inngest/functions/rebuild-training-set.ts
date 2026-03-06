import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { createTrainingFileService } from '@/lib/services/training-file-service';

/**
 * Rebuild Training Set JSONL (v4 Format)
 *
 * Triggered when conversations are added to an existing training_sets row
 * (PATCH /api/workbases/[id]/training-sets/[tsId] resets status to 'processing'
 * and emits this event).
 *
 * Strategy:
 *   - If the training set already has a linked training_files record (found via
 *     jsonl_file_path match), use the INCREMENTAL path:
 *       addConversationsToTrainingFile() downloads only the NEW conversations and
 *       merges them with the existing JSON already in Storage.
 *   - If no prior training_files record exists, fall back to a full build via
 *       createTrainingFile().
 *
 *   This keeps the download count to O(new conversations) instead of O(all conversations),
 *   preventing step timeouts on large accumulated sets.
 */
export const rebuildTrainingSet = inngest.createFunction(
  {
    id: 'rebuild-training-set',
    name: 'Rebuild Training Set JSONL (v4 Format)',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'training/set.updated' },
  async ({ event, step }) => {
    const { trainingSetId, workbaseId, conversationIds, userId } = event.data;

    // Step 1: Fetch the training set — name, current jsonl_path, and dataset_id
    const trainingSet = await step.run('fetch-training-set', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('training_sets')
        .select('id, name, dataset_id, jsonl_path')
        .eq('id', trainingSetId)
        .single();
      if (error || !data) throw new Error(`Training set not found: ${trainingSetId}`);
      return data;
    });

    // Step 2: Resolve the existing training_files record (if any) by matching jsonl_file_path.
    //   The jsonl_path stored on training_sets was written by a previous build and is unique
    //   (it contains a UUID folder), so this lookup is safe.
    const existingTrainingFile = await step.run('resolve-existing-training-file', async () => {
      if (!trainingSet.jsonl_path) return null;

      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('training_files')
        .select('id')
        .eq('jsonl_file_path', trainingSet.jsonl_path)
        .maybeSingle();

      if (error) {
        console.warn('[rebuild-training-set] Could not look up existing training_files record:', error.message);
        return null;
      }
      return data;
    });

    // Step 3: Build or incrementally update the training file
    const trainingFile = await step.run('rebuild-or-create-training-file', async () => {
      const supabase = createServerSupabaseAdminClient();
      const service = createTrainingFileService(supabase);

      try {
        if (existingTrainingFile?.id) {
          // ── Incremental path ──────────────────────────────────────────────────
          // Find which conversation IDs are genuinely new (not already linked to
          // the existing training_files record) so we only download those.
          const { data: existingAssocs } = await supabase
            .from('training_file_conversations')
            .select('conversation_id')
            .eq('training_file_id', existingTrainingFile.id);

          const existingConvIds = new Set(
            (existingAssocs || []).map((r: any) => r.conversation_id)
          );
          const newConversationIds = conversationIds.filter(
            (id: string) => !existingConvIds.has(id)
          );

          if (newConversationIds.length === 0) {
            // Nothing actually new — the training file is already current.
            // Fetch the existing record so Step 4 can still update training_sets correctly.
            const { data: tf } = await supabase
              .from('training_files')
              .select('id, jsonl_file_path, total_training_pairs, conversation_count')
              .eq('id', existingTrainingFile.id)
              .single();
            return {
              id: tf!.id,
              jsonlPath: tf!.jsonl_file_path,
              totalTrainingPairs: tf!.total_training_pairs,
              conversationCount: tf!.conversation_count,
            };
          }

          const result = await service.addConversationsToTrainingFile({
            training_file_id: existingTrainingFile.id,
            conversation_ids: newConversationIds,
            added_by: userId,
          });

          return {
            id: result.id,
            jsonlPath: result.jsonl_file_path,
            totalTrainingPairs: result.total_training_pairs,
            conversationCount: result.conversation_count,
          };
        } else {
          // ── Full build path (first build or no prior record found) ────────────
          const result = await service.createTrainingFile({
            name: trainingSet.name,
            description: `Rebuilt by workbase training set ${trainingSetId} (add-conversations)`,
            conversation_ids: conversationIds,
            created_by: userId,
          });
          return {
            id: result.id,
            jsonlPath: result.jsonl_file_path,
            totalTrainingPairs: result.total_training_pairs,
            conversationCount: result.conversation_count,
          };
        }
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();

        // Parse failed conversation IDs from the validation error message.
        // Format: "Conversation <uuid>: enrichment_status..." from validateConversationsForTraining()
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

        throw new Error(`Training file rebuild failed: ${err.message}`);
      }
    });

    if (!trainingFile || !trainingFile.jsonlPath) {
      return { success: false, reason: 'No JSONL produced during rebuild' };
    }

    // Step 4: Upsert the datasets record
    const dataset = await step.run('upsert-dataset', async () => {
      const supabase = createServerSupabaseAdminClient();

      const fileName = trainingFile.jsonlPath.split('/').pop() || 'training.jsonl';
      const totalTokens = (trainingFile.totalTrainingPairs || 0) * 200;
      const avgTurnsPerConversation =
        trainingFile.conversationCount > 0
          ? parseFloat(
            (trainingFile.totalTrainingPairs / trainingFile.conversationCount).toFixed(2)
          )
          : 0;
      const avgTokensPerTurn =
        trainingFile.totalTrainingPairs > 0
          ? parseFloat((totalTokens / trainingFile.totalTrainingPairs).toFixed(2))
          : 0;

      if (trainingSet.dataset_id) {
        const { data, error } = await supabase
          .from('datasets')
          .update({
            name: trainingSet.name,
            storage_path: trainingFile.jsonlPath,
            file_name: fileName,
            total_training_pairs: trainingFile.totalTrainingPairs,
            total_tokens: totalTokens,
            avg_turns_per_conversation: avgTurnsPerConversation,
            avg_tokens_per_turn: avgTokensPerTurn,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingSet.dataset_id)
          .select('id')
          .single();
        if (error) throw new Error(`Failed to update dataset: ${error.message}`);
        return { id: data.id };
      } else {
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
      }
    });

    // Step 5: Update training_sets record → status: 'ready'
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
      if (error) throw new Error(`Failed to update training set status: ${error.message}`);
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
