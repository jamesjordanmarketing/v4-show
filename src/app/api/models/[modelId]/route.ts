import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/models/[modelId] - Get single model artifact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();
    const { modelId } = params;

    // Fetch model with related data
    const { data: model, error } = await supabase
      .from('model_artifacts')
      .select(`
        *,
        dataset:datasets!dataset_id(id, name, format, total_training_pairs),
        job:training_jobs!job_id(id, preset_id, created_at, started_at, completed_at)
      `)
      .eq('id', modelId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !model) {
      return NextResponse.json(
        { error: 'Model not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

