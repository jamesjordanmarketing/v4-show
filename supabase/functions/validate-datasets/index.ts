import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Edge Function: validate-datasets
 * From Section E02 - Dataset Validation
 * 
 * Purpose: Background validation triggered by Cron (every 1 minute)
 * Validates JSONL format, calculates statistics, and updates database
 */

interface ValidationError {
  line: number;
  error: string;
  suggestion: string;
}

interface Conversation {
  conversation_id: string;
  turns: Array<{
    role: string;
    content: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch datasets pending validation
    const { data: datasets, error: fetchError } = await supabase
      .from('datasets')
      .select('*')
      .eq('status', 'validating')
      .limit(10); // Process up to 10 datasets per invocation

    if (fetchError) {
      console.error('Failed to fetch datasets:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!datasets || datasets.length === 0) {
      console.log('No datasets to validate');
      return new Response(JSON.stringify({ message: 'No datasets to validate' }), { status: 200 });
    }

    console.log(`Processing ${datasets.length} dataset(s)...`);

    for (const dataset of datasets) {
      try {
        console.log(`Validating dataset: ${dataset.id} - ${dataset.name}`);

        // Download dataset file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('lora-datasets')
          .download(dataset.storage_path);

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
        }

        // Parse and validate JSONL format
        const text = await fileData.text();
        const lines = text.split('\n').filter(l => l.trim());
        
        if (lines.length === 0) {
          throw new Error('File is empty');
        }

        let totalPairs = 0;
        let totalTokens = 0;
        const errors: ValidationError[] = [];
        const sampleData: Conversation[] = [];

        for (let i = 0; i < lines.length; i++) {
          try {
            const conversation = JSON.parse(lines[i]) as Conversation;
            
            // Validate structure
            if (!conversation.conversation_id) {
              errors.push({
                line: i + 1,
                error: 'Missing conversation_id',
                suggestion: 'Each conversation must have a conversation_id field',
              });
              continue;
            }

            if (!Array.isArray(conversation.turns)) {
              errors.push({
                line: i + 1,
                error: 'Invalid or missing turns array',
                suggestion: 'Each conversation must have a turns array',
              });
              continue;
            }

            if (conversation.turns.length === 0) {
              errors.push({
                line: i + 1,
                error: 'Empty turns array',
                suggestion: 'Conversation must have at least one turn',
              });
              continue;
            }

            // Validate turns
            for (let j = 0; j < conversation.turns.length; j++) {
              const turn = conversation.turns[j];
              if (!turn.role || !turn.content) {
                errors.push({
                  line: i + 1,
                  error: `Turn ${j + 1} missing role or content`,
                  suggestion: 'Each turn must have both role and content fields',
                });
              }
            }

            // Count training pairs
            totalPairs += conversation.turns.length;
            
            // Estimate tokens (rough estimation: ~1.3 tokens per word)
            totalTokens += conversation.turns.reduce((sum, turn) => {
              return sum + (turn.content?.split(' ').length || 0) * 1.3;
            }, 0);

            // Sample first 3 conversations for preview
            if (sampleData.length < 3) {
              sampleData.push(conversation);
            }
          } catch (parseError) {
            errors.push({
              line: i + 1,
              error: 'JSON parse error',
              suggestion: 'Ensure each line is valid JSON',
            });
          }
        }

        // Prepare update data
        const updateData: any = {
          validated_at: new Date().toISOString(),
        };

        if (errors.length > 0) {
          // Validation failed
          updateData.status = 'error';
          updateData.validation_errors = errors.slice(0, 10);  // First 10 errors
          updateData.training_ready = false;
          updateData.error_message = `Found ${errors.length} validation error(s)`;
          
          console.log(`Dataset ${dataset.id} failed validation with ${errors.length} error(s)`);
        } else {
          // Validation successful
          updateData.status = 'ready';
          updateData.training_ready = true;
          updateData.total_training_pairs = totalPairs;
          updateData.total_tokens = Math.round(totalTokens);
          updateData.sample_data = sampleData;
          updateData.avg_turns_per_conversation = totalPairs / lines.length;
          updateData.error_message = null;
          updateData.validation_errors = null;
          
          console.log(`Dataset ${dataset.id} validated successfully: ${totalPairs} pairs, ${Math.round(totalTokens)} tokens`);
        }

        // Update dataset in database
        const { error: updateError } = await supabase
          .from('datasets')
          .update(updateData)
          .eq('id', dataset.id);

        if (updateError) {
          console.error(`Failed to update dataset ${dataset.id}:`, updateError);
          continue;
        }

        // Create notification on success
        if (updateData.status === 'ready') {
          await supabase.from('notifications').insert({
            user_id: dataset.user_id,
            type: 'dataset_ready',
            title: 'Dataset Ready',
            message: `Your dataset "${dataset.name}" is ready for training`,
            priority: 'medium',
            action_url: `/datasets/${dataset.id}`,
          });
          console.log(`Created notification for dataset ${dataset.id}`);
        }
      } catch (error) {
        console.error(`Validation error for dataset ${dataset.id}:`, error);
        
        // Update dataset with error status
        await supabase
          .from('datasets')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Validation failed',
            training_ready: false,
            validated_at: new Date().toISOString(),
          })
          .eq('id', dataset.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: datasets.length,
        message: `Processed ${datasets.length} dataset(s)` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

