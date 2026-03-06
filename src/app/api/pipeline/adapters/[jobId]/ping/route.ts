import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
  const RUNPOD_INFERENCE_ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID!;
  const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
  const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

  const supabase = createServerSupabaseAdminClient();

  // 1. Verify ownership and get job data
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

  const adapterId = `adapter-${params.jobId.substring(0, 8)}`;
  const checkedAt = new Date().toISOString();

  // 2. Get DB endpoint status
  const { data: endpoint } = await supabase
    .from('pipeline_inference_endpoints')
    .select('status')
    .eq('job_id', params.jobId)
    .eq('endpoint_type', 'adapted')
    .maybeSingle();

  const endpointDbStatus = endpoint?.status || null;

  // 3. GraphQL: Read LORA_MODULES from RunPod endpoint
  let registeredInLoraModules = false;
  let loraModulesSnapshot: Array<{ name: string; path: string }> = [];

  try {
    const fetchQuery = `
      query GetEndpointEnv($id: String!) {
        myself {
          endpoint(id: $id) {
            env { key value }
          }
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
    const envVars: Array<{ key: string; value: string }> =
      graphqlData?.data?.myself?.endpoint?.env || [];
    const loraEnv = envVars.find((e) => e.key === 'LORA_MODULES');
    if (loraEnv?.value) {
      loraModulesSnapshot = JSON.parse(loraEnv.value);
      registeredInLoraModules = loraModulesSnapshot.some((m) => m.name === adapterId);
    }
  } catch (err) {
    console.warn('[adapter-ping] GraphQL LORA_MODULES check failed:', err);
  }

  // 4. Health check: worker status
  let workerStatus = { ready: 0, idle: 0, running: 0, initializing: 0 };
  try {
    const healthResp = await fetch(`${INFERENCE_API_URL}/health`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    });
    const healthData = await healthResp.json();
    workerStatus = {
      ready: healthData.workers?.ready || 0,
      idle: healthData.workers?.idle || 0,
      running: healthData.workers?.running || 0,
      initializing: healthData.workers?.initializing || 0,
    };
  } catch (err) {
    console.warn('[adapter-ping] Health check failed:', err);
  }

  // 5. Inference ping (live GPU request — user-triggered only)
  let inferenceAvailable = false;
  let inferenceLatencyMs: number | null = null;
  let inferenceError: string | null = null;

  try {
    const startMs = Date.now();
    const inferenceResp = await fetch(`${INFERENCE_API_URL}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          openai_route: '/v1/chat/completions',
          openai_input: {
            model: adapterId,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          },
        },
      }),
    });
    const inferenceData = await inferenceResp.json();
    inferenceLatencyMs = Date.now() - startMs;

    if (inferenceData.status === 'COMPLETED') {
      inferenceAvailable = true;
    } else {
      inferenceError = `Status: ${inferenceData.status}`;
    }
  } catch (err: unknown) {
    inferenceError = err instanceof Error ? err.message : 'Inference request failed';
  }

  return NextResponse.json({
    success: true,
    data: {
      adapterId,
      hfPath: job.hf_adapter_path || null,
      registeredInLoraModules,
      loraModulesSnapshot,
      inferenceAvailable,
      inferenceLatencyMs,
      inferenceError,
      workerStatus,
      endpointDbStatus,
      checkedAt,
    },
  });
}
