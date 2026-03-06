import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/datasets/[id]/confirm - Confirm upload and trigger validation
 * From Section E02 - Dataset Upload
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication (from Section E01)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const datasetId = params.id;

    // Update dataset status to trigger validation
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .update({ status: 'validating' })
      .eq('id', datasetId)
      .eq('user_id', user.id)  // Ensure user owns this dataset (RLS policy)
      .select()
      .single();

    if (error || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { dataset },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

