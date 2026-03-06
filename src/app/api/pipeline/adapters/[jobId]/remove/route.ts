import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: job, error: jobErr } = await supabase
    .from('pipeline_training_jobs')
    .select('id, user_id, hf_adapter_path, workbase_id, adapter_status')
    .eq('id', params.jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (job.user_id !== user!.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const adapterName = `adapter-${params.jobId.substring(0, 8)}`;

  // 1. Fetch ALL endpoint fields from RunPod (saveEndpoint is a full PUT)
  const fetchQuery = `
    query GetEndpointEnv($id: String!) {
      myself {
        endpoint(id: $id) {
          id name gpuIds idleTimeout locations networkVolumeId
          scalerType scalerValue workersMin workersMax templateId
          env { key value }
        }
      }
    }
  `;

  const fetchResp = await fetch(
    `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fetchQuery, variables: { id: RUNPOD_INFERENCE_ENDPOINT_ID } }),
    }
  );

  const fetchData = await fetchResp.json();
  const ep = fetchData?.data?.myself?.endpoint;
  if (!ep) {
    return NextResponse.json({ success: false, error: 'RunPod endpoint not found' }, { status: 500 });
  }

  // 2. Remove adapter from LORA_MODULES
  const currentEnv: Array<{ key: string; value: string }> = ep.env || [];
  const loraEnv = currentEnv.find((e) => e.key === 'LORA_MODULES');
  let loraModules: Array<{ name: string; path: string }> = [];

  if (loraEnv?.value) {
    try {
      loraModules = JSON.parse(loraEnv.value);
    } catch { /* ignore */ }
  }

  const beforeCount = loraModules.length;
  loraModules = loraModules.filter((m) => m.name !== adapterName);
  const removed = beforeCount - loraModules.length;

  if (removed === 0) {
    return NextResponse.json(
      { success: false, error: 'Adapter is not in LORA_MODULES — may have already been removed' },
      { status: 400 }
    );
  }

  // 3. Save ALL fields back to RunPod with updated LORA_MODULES
  const updatedEnv = [
    ...currentEnv.filter((e) => e.key !== 'LORA_MODULES').map((e) => ({ key: e.key, value: e.value })),
    { key: 'LORA_MODULES', value: JSON.stringify(loraModules) },
  ];

  const saveMutation = `
    mutation SaveEndpointEnv($input: EndpointInput!) {
      saveEndpoint(input: $input) { id }
    }
  `;

  const saveResp = await fetch(
    `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: saveMutation,
        variables: {
          input: {
            id: RUNPOD_INFERENCE_ENDPOINT_ID,
            name: ep.name,
            gpuIds: ep.gpuIds,
            idleTimeout: ep.idleTimeout,
            locations: ep.locations,
            networkVolumeId: ep.networkVolumeId,
            scalerType: ep.scalerType,
            scalerValue: ep.scalerValue,
            workersMin: ep.workersMin,
            workersMax: ep.workersMax,
            templateId: ep.templateId,
            env: updatedEnv,
          },
        },
      }),
    }
  );

  const saveData = await saveResp.json();
  if (saveData.errors) {
    return NextResponse.json(
      { success: false, error: `RunPod save failed: ${JSON.stringify(saveData.errors)}` },
      { status: 500 }
    );
  }

  // 4. Update DB — mark adapter as superseded
  await supabase
    .from('pipeline_training_jobs')
    .update({
      adapter_status: 'superseded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.jobId);

  // 5. Mark inference endpoints as terminated
  await supabase
    .from('pipeline_inference_endpoints')
    .update({ status: 'terminated', updated_at: new Date().toISOString() })
    .eq('job_id', params.jobId);

  return NextResponse.json({
    success: true,
    data: {
      adapterId: adapterName,
      removed: true,
      loraModulesRemaining: loraModules.length,
      message: `${adapterName} removed from RunPod LORA_MODULES. Workers will need to restart to unload it from GPU memory.`,
    },
  });
}
