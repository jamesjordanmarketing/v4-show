# Spec 26: LoRA Adapter Detail Page — E03: API Layer

**Version:** 1.0
**Date:** 2026-03-03
**Prompt:** E03 of 5
**Prerequisites:** E01 complete (DB schema + types), E02 complete (Inngest functions registered)
**Next:** E04 — Frontend Hook + Components

---

## What This Prompt Builds

Five new Next.js 14 App Router API routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/pipeline/jobs/[jobId]/deployment-log` | GET | Read `deployment_log` JSONB from a training job |
| `/api/pipeline/adapters/[jobId]/ping` | GET | Live RunPod status ping (LORA_MODULES check + inference test) |
| `/api/pipeline/adapters/[jobId]/restart` | POST | Trigger manual worker restart via Inngest |
| `/api/pipeline/adapters/[jobId]/restart-status` | GET | Poll latest restart log for a job |
| `/api/pipeline/adapters/[jobId]/remove` | POST | Remove adapter from RunPod LORA_MODULES |

---

## Platform Context

**Project:** Bright Run LoRA Training Data Platform
**Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Inngest, RunPod (vLLM)
**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**Auth pattern (established in codebase):**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

**Supabase admin client pattern:**
```typescript
const supabase = createServerSupabaseAdminClient();
```

**Existing API route directories (confirmed):**
- `src/app/api/pipeline/jobs/[jobId]/` — has `route.ts`, `cancel/`, `metrics/`, `download/`
- `src/app/api/pipeline/adapters/` — has `status/`, `test/`, `deploy/`, `rate/` (all static segments)

**Routing conflict analysis:**
- `[jobId]/ping`, `[jobId]/restart`, `[jobId]/restart-status`, `[jobId]/remove` are NEW nested under a dynamic `[jobId]` segment
- In Next.js 14, static segments (`status/`, `test/`, `deploy/`, `rate/`) take precedence over `[jobId]` — no conflict
- A UUID job ID (e.g. `550e8400-e29b-41d4-a716-446655440000`) will never match the static names

**Key environment variables:**
- `RUNPOD_GRAPHQL_API_KEY` — RunPod GraphQL auth (query param: `?api_key=`)
- `RUNPOD_INFERENCE_ENDPOINT_ID` — shared inference endpoint ID
- `GPU_CLUSTER_API_KEY` or `RUNPOD_API_KEY` — RunPod inference Bearer auth
- `INFERENCE_API_URL` — RunPod inference base URL (e.g. `https://api.runpod.ai/v2/780tauhj7c126b`)

---

## Critical Rules

1. **Read existing `route.ts` files** in `src/app/api/pipeline/` before creating new ones to confirm patterns.
2. **All auth via `requireAuth`.** Never expose endpoints without auth.
3. **Ownership checks are mandatory.** Every route verifies `job.user_id === user.id`.
4. **RunPod GraphQL = query param auth.** `?api_key=${RUNPOD_GRAPHQL_API_KEY}` — NOT Bearer.
5. **RunPod inference = Bearer auth.** `Authorization: Bearer ${RUNPOD_API_KEY}`.
6. **`saveEndpoint` is a full PUT.** Always fetch all endpoint fields first, then send everything back.
7. **Import `mapDbRowToRestartLog` from `@/types/adapter-detail`** in the restart-status route.

---

========================

## EXECUTION PROMPT E03

You are implementing the API layer for **Spec 26: LoRA Adapter Detail Page** in the Bright Run LoRA Training Data Platform.

**Prerequisites from E01:** `src/types/adapter-detail.ts` exists with `mapDbRowToRestartLog` export
**Prerequisites from E02:** `restartInferenceWorkers` Inngest function registered to `pipeline/endpoint.restart.requested`

**Files to create (all new — do not edit existing routes):**
1. `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts`
2. `src/app/api/pipeline/adapters/[jobId]/ping/route.ts`
3. `src/app/api/pipeline/adapters/[jobId]/restart/route.ts`
4. `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts`
5. `src/app/api/pipeline/adapters/[jobId]/remove/route.ts`

Before creating any files, read an existing API route to confirm the auth pattern:
- `src/app/api/pipeline/jobs/[jobId]/route.ts`

---

### Route 1: `GET /api/pipeline/jobs/[jobId]/deployment-log`

**File to create:** `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts`

> This sits under the existing `src/app/api/pipeline/jobs/[jobId]/` directory as a NEW sub-route `deployment-log/`. It does NOT conflict with the existing `route.ts` in that directory.

```typescript
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

  if (job.user_id !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: job.deployment_log || null,
  });
}
```

---

### Route 2: `GET /api/pipeline/adapters/[jobId]/ping`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/ping/route.ts`

This route performs three live checks against RunPod:
1. Reads `LORA_MODULES` from the endpoint via GraphQL to verify adapter registration
2. Calls `/health` to get worker counts
3. Calls `/runsync` with `max_tokens: 1` to verify inference (latency measurement)

```typescript
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

  if (job.user_id !== user.id) {
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
```

---

### Route 3: `POST /api/pipeline/adapters/[jobId]/restart`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/restart/route.ts`

This route:
1. Verifies job ownership and that the adapter has been deployed (`hf_adapter_path` is non-null)
2. Checks for any in-progress restart (returns 409 if one is active)
3. Fetches current `workersMin`/`workersMax` from RunPod
4. Creates an `endpoint_restart_log` row with `trigger_source='manual'`
5. Fires the `pipeline/endpoint.restart.requested` Inngest event
6. Returns the `restartLogId` for polling

```typescript
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

  if (job.user_id !== user.id) {
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
      user_id: user.id,
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
```

---

### Route 4: `GET /api/pipeline/adapters/[jobId]/restart-status`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts`

Returns the latest restart log for a job (or a specific log if `?logId=` is provided).

```typescript
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

  if (job.user_id !== user.id) {
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

  const { data: logs, error: logErr } = await queryBuilder;

  if (logErr) {
    return NextResponse.json({ success: false, error: logErr.message }, { status: 500 });
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
```

---

### Route 5: `POST /api/pipeline/adapters/[jobId]/remove`

**File to create:** `src/app/api/pipeline/adapters/[jobId]/remove/route.ts`

Removes a specific adapter from RunPod `LORA_MODULES` and marks the job as superseded in DB. Used by the Lifecycle Actions section of the Adapter Detail Page.

```typescript
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

  if (job.user_id !== user.id) {
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
```

---

### Step 6: TypeScript Validation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | grep -E "(error|src/app/api/pipeline)" | head -30
```

Fix any errors in the new route files. Pre-existing errors elsewhere are acceptable.

Common issues:
- `logErr` variable name conflict in `restart-status/route.ts` — rename the second declaration to `logFetchErr`
- `updated_at` may not exist in `pipeline_inference_endpoints` TypeScript type — use `as any` cast on the update object if needed and note it as a known workaround
- If `requireAuth` or `createServerSupabaseAdminClient` export names differ in `@/lib/supabase-server`, read that file first and use the correct names

---

### Completion Checklist

- [ ] `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts` created
- [ ] `src/app/api/pipeline/adapters/[jobId]/ping/route.ts` created
- [ ] `src/app/api/pipeline/adapters/[jobId]/restart/route.ts` created
- [ ] `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts` created
- [ ] `src/app/api/pipeline/adapters/[jobId]/remove/route.ts` created
- [ ] All 5 routes import `requireAuth` and `createServerSupabaseAdminClient` from `@/lib/supabase-server`
- [ ] `restart/route.ts` imports `inngest` from `@/inngest/client`
- [ ] `restart-status/route.ts` imports `mapDbRowToRestartLog` from `@/types/adapter-detail`
- [ ] No TypeScript errors in new files

**Artifacts produced by E03 (used by E04–E05):**
- `GET /api/pipeline/jobs/{jobId}/deployment-log` — returns `DeploymentLog | null`
- `GET /api/pipeline/adapters/{jobId}/ping` — returns `AdapterPingResult`
- `POST /api/pipeline/adapters/{jobId}/restart` — returns `{ restartLogId, adapterId, status, message }`
- `GET /api/pipeline/adapters/{jobId}/restart-status` — returns `EndpointRestartLog & { adapterId, hfPath } | null`
- `POST /api/pipeline/adapters/{jobId}/remove` — returns `{ adapterId, removed, loraModulesRemaining, message }`

+++++++++++++++++
