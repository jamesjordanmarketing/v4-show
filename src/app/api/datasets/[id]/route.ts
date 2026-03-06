import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/datasets/[id] - Get single dataset by ID
 * From Section E02 - Dataset Management
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication (from Section E01)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const datasetId = params.id;

    // Fetch dataset
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('user_id', user.id)  // Ensure user owns this dataset (RLS)
      .is('deleted_at', null)
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

/**
 * DELETE /api/datasets/[id] - Soft delete a dataset
 * From Section E02 - Dataset Management
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication (from Section E01)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const datasetId = params.id;

    // Soft delete dataset (set deleted_at timestamp)
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', datasetId)
      .eq('user_id', user.id)  // Ensure user owns this dataset (RLS)
      .is('deleted_at', null)  // Only delete if not already deleted
      .select()
      .single();

    if (error || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    // Note: File in storage is NOT deleted - user may want to restore
    // Future enhancement: Add hard delete with storage cleanup

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

