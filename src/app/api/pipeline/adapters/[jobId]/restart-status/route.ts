import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapDbRowToRestartLog } from '@/types/adapter-detail';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const logId = searchParams.get('logId'); // optional: specific log; defaults to latest

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user!.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Fetch restart log
  let queryBuilder = supabase
    .from('endpoint_restart_log')
    .select('*')
    .eq('job_id', params.jobId)
    .order('initiated_at', { ascending: false })
    .limit(1);

  if (logId) {
    queryBuilder = supabase
      .from('endpoint_restart_log')
      .select('*')
      .eq('id', logId)
      .eq('job_id', params.jobId)
      .limit(1);
  }

  const { data: logs, error: logFetchErr } = await queryBuilder;

  if (logFetchErr) {
    return NextResponse.json({ success: false, error: logFetchErr.message }, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({ success: true, data: null });
  }

  const log = mapDbRowToRestartLog(logs[0]);
  const adapterId = `adapter-${params.jobId.substring(0, 8)}`;

  return NextResponse.json({
    success: true,
    data: {
      ...log,
      adapterId,
      hfPath: job.hf_adapter_path || null,
    },
  });
}
