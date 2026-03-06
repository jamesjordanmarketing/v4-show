import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

const ImportRequestSchema = z.object({
  training_file_id: z.string().uuid(),
});

/**
 * POST /api/datasets/import-from-training-file
 * Import an existing training file as a dataset for the LoRA pipeline
 * From Section DATA-BRIDGE - Training Files to Datasets Migration
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const validation = ImportRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { training_file_id } = validation.data;
    const supabase = await createServerSupabaseClient();

    // Fetch training file record
    const { data: trainingFile, error: fetchError } = await supabase
      .from('training_files')
      .select('*')
      .eq('id', training_file_id)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !trainingFile) {
      return NextResponse.json(
        { error: 'Training file not found or access denied' },
        { status: 404 }
      );
    }

    // Check if already imported
    const { data: existingDataset } = await supabase
      .from('datasets')
      .select('id')
      .eq('user_id', user.id)
      .eq('storage_path', trainingFile.jsonl_file_path)
      .single();

    if (existingDataset) {
      return NextResponse.json(
        { 
          error: 'Already imported',
          details: 'This training file has already been imported as a dataset',
          dataset_id: existingDataset.id
        },
        { status: 409 }
      );
    }

    // Calculate statistics
    const totalTokens = (trainingFile.total_training_pairs || 0) * 200; // Estimate
    const avgTurnsPerConversation = trainingFile.conversation_count > 0
      ? parseFloat((trainingFile.total_training_pairs / trainingFile.conversation_count).toFixed(2))
      : 0;
    const avgTokensPerTurn = trainingFile.total_training_pairs > 0
      ? parseFloat((totalTokens / trainingFile.total_training_pairs).toFixed(2))
      : 0;

    // Extract file name from path
    const fileName = trainingFile.jsonl_file_path.split('/').pop() || 'training.jsonl';

    // Create dataset record
    const { data: dataset, error: insertError } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        name: trainingFile.name,
        description: trainingFile.description || `Imported from training file: ${trainingFile.name}`,
        format: 'brightrun_lora_v4',
        status: 'ready',
        storage_bucket: 'training-files', // IMPORTANT: Keep in original bucket
        storage_path: trainingFile.jsonl_file_path,
        file_name: fileName,
        file_size: trainingFile.jsonl_file_size || 0, // Default to 0 if not available
        total_training_pairs: trainingFile.total_training_pairs,
        total_validation_pairs: 0, // Training files don't have validation split
        total_tokens: totalTokens,
        avg_turns_per_conversation: avgTurnsPerConversation,
        avg_tokens_per_turn: avgTokensPerTurn,
        training_ready: true, // Training files are pre-validated
        validated_at: new Date().toISOString(),
        validation_errors: null,
        sample_data: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Dataset import error:', insertError);
      return NextResponse.json(
        { error: 'Failed to import training file', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dataset,
      message: `Successfully imported "${trainingFile.name}" as a dataset`,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import training file', details: error.message },
      { status: 500 }
    );
  }
}

