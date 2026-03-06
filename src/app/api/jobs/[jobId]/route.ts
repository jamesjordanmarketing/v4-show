import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/jobs/[jobId] - Get job details with metrics
 * From Section E04 - Training Execution & Monitoring
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();

    // Fetch job with dataset info
    const { data: job, error: jobError } = await supabase
      .from('training_jobs')
      .select(`
        *,
        dataset:datasets(id, name, format, total_training_pairs, total_tokens)
      `)
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch recent metrics (last 100 points for chart)
    const { data: metrics } = await supabase
      .from('metrics_points')
      .select('*')
      .eq('job_id', params.jobId)
      .order('timestamp', { ascending: true })
      .limit(100);

    // Fetch cost records
    const { data: costRecords } = await supabase
      .from('cost_records')
      .select('*')
      .eq('job_id', params.jobId)
      .order('recorded_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        job,
        metrics: metrics || [],
        cost_records: costRecords || [],
      },
    });
  } catch (error: any) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details', details: error.message },
      { status: 500 }
    );
  }
}

