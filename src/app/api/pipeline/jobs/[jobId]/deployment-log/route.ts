import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  const { data: job, error } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, deployment_log, hf_adapter_path, adapter_status')
    .eq('id', params.jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user!.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: job.deployment_log || null,
  });
}
