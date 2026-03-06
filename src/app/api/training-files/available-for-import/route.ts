import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/training-files/available-for-import
 * List training files that haven't been imported as datasets yet
 * From Section DATA-BRIDGE - Training Files to Datasets Migration
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();

    // Get all user's training files
    const { data: trainingFiles, error: filesError } = await supabase
      .from('training_files')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { error: 'Failed to fetch training files', details: filesError.message },
        { status: 500 }
      );
    }

    // Get all user's imported datasets (by storage_path)
    const { data: datasets, error: datasetsError } = await supabase
      .from('datasets')
      .select('storage_path')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (datasetsError) {
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: datasetsError.message },
        { status: 500 }
      );
    }

    // Create set of imported storage paths for fast lookup
    const importedPaths = new Set(datasets?.map(d => d.storage_path) || []);

    // Filter training files that haven't been imported
    const availableForImport = (trainingFiles || []).filter(
      tf => !importedPaths.has(tf.jsonl_file_path)
    );

    // Add import status to all files
    const enrichedFiles = (trainingFiles || []).map(tf => ({
      ...tf,
      is_imported: importedPaths.has(tf.jsonl_file_path),
      can_import: !importedPaths.has(tf.jsonl_file_path),
    }));

    return NextResponse.json({
      success: true,
      data: {
        available_for_import: availableForImport,
        all_training_files: enrichedFiles,
        summary: {
          total_training_files: trainingFiles?.length || 0,
          already_imported: importedPaths.size,
          available_for_import: availableForImport.length,
        },
      },
    });

  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training files', details: error.message },
      { status: 500 }
    );
  }
}


