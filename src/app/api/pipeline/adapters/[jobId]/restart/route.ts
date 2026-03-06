import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;

  const supabase = createServerSupabaseAdminClient();

  // Verify job ownership and deployment status
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id, job_name')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user!.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  if (!job.hf_adapter_path) {
    return NextResponse.json(
      { success: false, error: 'Adapter has not been deployed yet. Wait for deployment to complete before restarting.' },
      { status: 400 }
    );
  }

  // Check for any in-progress restart to prevent concurrent cycling
  if (job.workbase_id) {
    const { data: inProgress } = await supabase
      .from('endpoint_restart_log')
      .select('id, status')
      .eq('workbase_id', job.workbase_id)
      .in('status', ['initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'])
      .maybeSingle();

    if (inProgress) {
      return NextResponse.json(
        { success: false, error: 'A restart is already in progress. Wait for it to complete before triggering another.' },
        { status: 409 }
      );
    }
  }

  // Fetch current endpoint workers to know original scale for restoration
  let originalWorkersMin = 1;
  let originalWorkersMax = 1;
  try {
    const fetchQuery = `
      query GetEndpoint($id: String!) {
        myself {
          endpoint(id: $id) { workersMin workersMax }
        }
      }
    `;
    const graphqlResp = await fetch(
      `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fetchQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
      }
    );
    const graphqlData = await graphqlResp.json();
    const ep = graphqlData?.data?.myself?.endpoint;
    if (ep) {
      originalWorkersMin = ep.workersMin || 1;
      originalWorkersMax = ep.workersMax || 1;
    }
  } catch (err) {
    console.warn('[restart-api] Could not fetch endpoint workers (using defaults):', err);
  }

  const adapterName = `adapter-${params.jobId.substring(0, 8)}`;

  // Create restart log row with 'initiated' status
  const { data: logRow, error: logErr } = await supabase
    .from('endpoint_restart_log')
    .insert({
      workbase_id: job.workbase_id,
      job_id: params.jobId,
      adapter_name: adapterName,
      runpod_endpoint_id: RUNPOD_INFERENCE_ENDPOINT_ID,
      trigger_source: 'manual',
      status: 'initiated',
      user_id: user!.id,
    })
    .select('id')
    .single();

  if (logErr || !logRow) {
    return NextResponse.json(
      { success: false, error: 'Failed to create restart log' },
      { status: 500 }
    );
  }

  // Fire Inngest event — restartInferenceWorkers will pick this up
  await inngest.send({
    name: 'pipeline/endpoint.restart.requested',
    data: {
      jobId: params.jobId,
      workbaseId: job.workbase_id,
      adapterName,
      restartLogId: logRow.id,
      endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
      originalWorkersMin,
      originalWorkersMax,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      restartLogId: logRow.id,
      adapterId: adapterName,
      status: 'initiated',
      message: 'Worker restart initiated. This takes 45–270 seconds. Poll restart-status for progress.',
    },
  });
}
