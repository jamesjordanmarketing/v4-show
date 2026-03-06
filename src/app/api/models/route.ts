import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/models - List user's model artifacts
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 12)
 * - sort: 'created_at' | 'quality' (default: 'created_at')
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'created_at';

    // Build query
    let query = supabase
      .from('model_artifacts')
      .select(`
        *,
        dataset:datasets!dataset_id(name),
        job:training_jobs!job_id(preset_id, created_at)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Apply sorting
    if (sort === 'quality') {
      query = query.order('quality_metrics->overall_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: models, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch models', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        models: models || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

