import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Restart Inference Workers (Manual Trigger)
 *
 * Triggered by: 'pipeline/endpoint.restart.requested'
 * Event data: { jobId, workbaseId, adapterName, restartLogId, endpointId, originalWorkersMin, originalWorkersMax }
 *
 * Strategy (workersMin=0 ALWAYS):
 *   1. Set workersMax=0 + idleTimeout=1 → kills all flex workers
 *   2. POST /purge-queue → clear pending work so workers go idle immediately
 *   3. Poll /health until total workers = 0 (5 min timeout, expect < 1 min)
 *   4. Restore workersMax + idleTimeout → fresh workers cold-start with new LORA_MODULES
 *   5. Wait for workers ready → verify adapter → mark complete
 *
 * CRITICAL: workersMin is ALWAYS 0. Never set it above 0.
 * The try/finally block guarantees config is restored even on error.
 *
 * Concurrency: { limit: 1 } — shared with refreshInferenceWorkers to prevent conflicts
 * Retries: 1 — avoid infinite worker cycling
 */
export const restartInferenceWorkers = inngest.createFunction(
  {
    id: 'restart-inference-workers',
    name: 'Restart Inference Workers (Manual)',
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: 'pipeline/endpoint.restart.requested' },
  async ({ event, step }) => {
    const {
      jobId,
      workbaseId,
      adapterName,
      restartLogId,
      endpointId,
      originalWorkersMax,
    } = event.data;

    const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
    const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
    const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

    // Helper: RunPod GraphQL request (auth via query param)
    async function graphql(query: string, variables?: Record<string, unknown>) {
      const res = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        }
      );
      return res.json();
    }

    // Helper: Poll endpoint health (auth via Bearer)
    async function getWorkerState(): Promise<{
      ready: number; idle: number; running: number; initializing: number;
    }> {
      try {
        const res = await fetch(`${INFERENCE_API_URL}/health`, {
          headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        });
        const data = await res.json();
        return {
          ready: data.workers?.ready || 0,
          idle: data.workers?.idle || 0,
          running: data.workers?.running || 0,
          initializing: data.workers?.initializing || 0,
        };
      } catch {
        return { ready: 0, idle: 0, running: 0, initializing: 0 };
      }
    }

    // Helper: Update restart log (non-fatal)
    async function updateLog(updates: Record<string, unknown>) {
      if (!restartLogId) return;
      try {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('endpoint_restart_log')
          .update(updates)
          .eq('id', restartLogId);
      } catch (err) {
        console.warn('[restart-workers] Failed to update restart log (non-fatal):', err);
      }
    }

    // Helper: Fetch full endpoint config from RunPod
    async function fetchEndpoint() {
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);
      return ep;
    }

    // Helper: Build saveEndpoint input (full PUT — must include all fields)
    function buildSaveInput(
      ep: Record<string, unknown>,
      overrides: { workersMin?: number; workersMax?: number; idleTimeout?: number; env?: Array<{ key: string; value: string }> }
    ) {
      return {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: overrides.idleTimeout ?? ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: overrides.workersMin ?? 0, // ALWAYS 0
        workersMax: overrides.workersMax ?? ep.workersMax,
        templateId: ep.templateId,
        env: (overrides.env ?? (ep.env as Array<{ key: string; value: string }>)).map(
          (e: { key: string; value: string }) => ({ key: e.key, value: e.value })
        ),
      };
    }

    const SAVE_ENDPOINT_MUTATION = `
      mutation SaveEndpointEnv($input: EndpointInput!) {
        saveEndpoint(input: $input) { id }
      }
    `;

    // =====================================================
    // Step 1: Read LORA_MODULES + set workersMax=0 + idleTimeout=1 + purge queue
    // =====================================================
    const scaleDownResult = await step.run('scale-down-workers', async () => {
      const ep = await fetchEndpoint();

      // Record original values for restoration
      const originalIdleTimeout = ep.idleTimeout;
      // GUARD: Never restore workersMax to 0 — that would leave the endpoint permanently dead.
      // Use event value, fall back to current endpoint value, floor at 1.
      const savedWorkersMax = Math.max(originalWorkersMax ?? ep.workersMax ?? 1, 1);

      // Check adapter presence in LORA_MODULES before restart
      const loraEnv = (ep.env || []).find((e: { key: string }) => e.key === 'LORA_MODULES');
      let loraSnapshot: Array<{ name: string; path: string }> = [];
      let adapterInLoraModules = false;
      try {
        if (loraEnv?.value) {
          loraSnapshot = JSON.parse(loraEnv.value);
          adapterInLoraModules = loraSnapshot.some((m) => m.name === adapterName);
        }
      } catch { /* ignore */ }

      await updateLog({
        status: 'scaling_down',
        scale_down_at: new Date().toISOString(),
        adapter_in_lora_modules: adapterInLoraModules,
        lora_modules_snapshot: loraSnapshot,
      });

      // Set workersMax=0 + idleTimeout=1 to kill all flex workers
      // workersMin is ALWAYS 0 — never change it
      await graphql(SAVE_ENDPOINT_MUTATION, {
        input: buildSaveInput(ep, { workersMin: 0, workersMax: 0, idleTimeout: 1 }),
      });
      console.log('[restart-workers] Set workersMax=0, idleTimeout=1 — draining workers');

      // Purge job queue so idle workers have nothing to pick up
      try {
        await fetch(`${INFERENCE_API_URL}/purge-queue`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        });
        console.log('[restart-workers] Job queue purged');
      } catch (err) {
        console.warn('[restart-workers] Failed to purge queue (non-fatal):', err);
      }

      await updateLog({ scale_down_success: true });

      return {
        originalIdleTimeout,
        savedWorkersMax,
      };
    });

    // =====================================================
    // Step 2: Wait for all workers to drain to 0
    // (try/finally ensures config is ALWAYS restored)
    // =====================================================
    const drainResult = await step.run('wait-for-workers-terminated', async () => {
      const startMs = Date.now();
      const timeoutMs = 300_000; // 5 minutes (generous — expect < 1 min for flex workers)
      const pollMs = 10_000;     // 10 seconds between polls
      let drained = false;

      try {
        while (Date.now() - startMs < timeoutMs) {
          const state = await getWorkerState();
          const total = state.ready + state.idle + state.running + state.initializing;
          console.log(`[restart-workers] Draining: total=${total} (R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing})`);

          if (total === 0) {
            drained = true;
            await updateLog({
              status: 'workers_terminated',
              workers_terminated_at: new Date().toISOString(),
            });
            break;
          }
          await new Promise(r => setTimeout(r, pollMs));
        }

        if (!drained) {
          console.warn('[restart-workers] Workers did not drain to 0 within 5 min — proceeding with restore anyway');
        }
      } finally {
        // CRITICAL: ALWAYS restore workersMax + idleTimeout, even on error
        // This prevents leaving the endpoint stuck at workersMax=0
        try {
          const ep = await fetchEndpoint();
          await graphql(SAVE_ENDPOINT_MUTATION, {
            input: buildSaveInput(ep, {
              workersMin: 0,
              workersMax: scaleDownResult.savedWorkersMax,
              idleTimeout: scaleDownResult.originalIdleTimeout,
            }),
          });
          console.log(`[restart-workers] Config restored: workersMax=${scaleDownResult.savedWorkersMax}, idleTimeout=${scaleDownResult.originalIdleTimeout}`);

          await updateLog({
            status: 'scaling_up',
            scale_up_at: new Date().toISOString(),
            scale_up_success: true,
          });
        } catch (restoreErr) {
          console.error('[restart-workers] CRITICAL: Failed to restore endpoint config!', restoreErr);
          await updateLog({
            status: 'failed',
            error_step: 'config-restore',
            error_message: `CRITICAL: Failed to restore config. Manual fix needed: workersMax=${scaleDownResult.savedWorkersMax}, idleTimeout=${scaleDownResult.originalIdleTimeout}. Error: ${String(restoreErr)}`,
            completed_at: new Date().toISOString(),
          });
          throw restoreErr; // Re-throw so Inngest retries
        }
      }

      return { drained, waitedMs: Date.now() - startMs };
    });

    // =====================================================
    // Step 3: Wait for fresh workers to become ready
    // (new workers cold-start with updated LORA_MODULES)
    // =====================================================
    await step.run('wait-for-workers-ready', async () => {
      const startMs = Date.now();
      const timeoutMs = 300_000; // 5 min — cold start = model download + load + LoRA init
      const pollMs = 10_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        console.log(`[restart-workers] Waiting for ready: R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing}`);
        if (state.ready > 0 || state.idle > 0) {
          await updateLog({
            status: 'workers_ready',
            workers_ready_at: new Date().toISOString(),
            worker_state_after: state,
          });
          return { waitedMs: Date.now() - startMs, state };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      console.warn('[restart-workers] Workers did not reach ready state within 5 min — proceeding anyway');
      return { waitedMs: Date.now() - startMs, timedOut: true, state: null };
    });

    // =====================================================
    // Step 4: Verify adapter via inference ping (non-fatal)
    // =====================================================
    const verifyResult = await step.run('verify-adapter-available', async () => {
      await updateLog({ status: 'verifying', verification_at: new Date().toISOString() });

      try {
        const res = await fetch(`${INFERENCE_API_URL}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              openai_route: '/v1/chat/completions',
              openai_input: {
                model: adapterName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5,
              },
            },
          }),
        });
        const data = await res.json();
        const verified = data.status === 'COMPLETED';
        return { verified, error: verified ? null : `Status: ${data.status}` };
      } catch (err) {
        return { verified: false, error: String(err) };
      }
    });

    // =====================================================
    // Step 5: Finalize restart log + mark endpoints ready
    // =====================================================
    await step.run('finalize-restart-log', async () => {
      const supabase = createServerSupabaseAdminClient();
      const completedAt = new Date().toISOString();

      await supabase
        .from('endpoint_restart_log')
        .update({
          status: 'completed',
          completed_at: completedAt,
          adapter_verified: verifyResult.verified,
        })
        .eq('id', restartLogId);

      // Mark pipeline_inference_endpoints as ready
      await supabase
        .from('pipeline_inference_endpoints')
        .update({ status: 'ready', ready_at: completedAt })
        .eq('job_id', jobId);

      return { completed: true, adapterVerified: verifyResult.verified };
    });

    return {
      success: true,
      jobId,
      adapterName,
      restartLogId,
      adapterVerified: verifyResult.verified,
      drained: drainResult.drained,
    };
  }
);
