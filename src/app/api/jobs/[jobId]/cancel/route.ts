import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/jobs/[jobId]/cancel - Cancel running job
 * From Section E04 - Training Execution & Monitoring
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('training_jobs')
      .select('*')
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Check if job can be cancelled
    if (!['queued', 'initializing', 'running'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled', details: `Job status is '${job.status}'` },
        { status: 400 }
      );
    }

    // If job has external ID, call GPU cluster to cancel
    if (job.external_job_id) {
      const GPU_CLUSTER_API_URL = process.env.GPU_CLUSTER_API_URL;
      const GPU_CLUSTER_API_KEY = process.env.GPU_CLUSTER_API_KEY;

      const cancelResponse = await fetch(
        `${GPU_CLUSTER_API_URL}/training/cancel/${job.external_job_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!cancelResponse.ok) {
        console.error('GPU cluster cancel failed:', await cancelResponse.text());
        // Continue with local cancellation even if GPU cluster fails
      }
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('training_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        final_cost: job.current_cost,
      })
      .eq('id', params.jobId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel job', details: updateError.message },
        { status: 500 }
      );
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'job_cancelled',
      title: 'Job Cancelled',
      message: 'Your training job was cancelled',
      priority: 'medium',
      action_url: `/training/jobs/${params.jobId}`,
      metadata: { job_id: params.jobId },
    });

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error: any) {
    console.error('Job cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job', details: error.message },
      { status: 500 }
    );
  }
}

