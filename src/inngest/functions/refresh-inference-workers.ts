import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Refresh Inference Workers
 *
 * After autoDeployAdapter updates LORA_MODULES on RunPod, this function
 * cycles workers so they cold-start with the new env vars.
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
 * Concurrency: 1 (only one refresh at a time on the shared endpoint)
 * Retries: 1 (avoid infinite worker cycling)
 */
export const refreshInferenceWorkers = inngest.createFunction(
  {
    id: 'refresh-inference-workers',
    name: 'Refresh Inference Workers After Adapter Deploy',
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: 'pipeline/adapter.deployed' },
  async ({ event, step }) => {
    const {
      jobId,
      adapterName,
      endpointId,
      originalWorkersMax,
      workbaseId,
    } = event.data;

    const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
    const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
    const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

    // Helper: RunPod GraphQL request
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

    // Helper: Poll endpoint health
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

    // ========================================
    // Step 1: Record restart + set workersMax=0 + idleTimeout=1 + purge queue
    // ========================================
    const scaleDownResult = await step.run('scale-down-workers', async () => {
      const supabase = createServerSupabaseAdminClient();
      const now = new Date().toISOString();

      // Create endpoint_restart_log row (trigger_source='auto')
      let restartLogId: string | null = null;
      if (workbaseId) {
        const { data: logRow, error: logErr } = await supabase
          .from('endpoint_restart_log')
          .insert({
            workbase_id: workbaseId,
            job_id: jobId,
            adapter_name: adapterName,
            runpod_endpoint_id: endpointId,
            trigger_source: 'auto',
            status: 'scaling_down',
            scale_down_at: now,
          })
          .select('id')
          .single();

        if (!logErr && logRow) {
          restartLogId = logRow.id;
        } else {
          console.warn('[worker-refresh] Failed to create restart log (non-fatal):', logErr?.message);
        }
      }

      // Fetch current endpoint configuration
      const ep = await fetchEndpoint();

      // Record original values for restoration in finally block
      const originalIdleTimeout = ep.idleTimeout;
      // GUARD: Never restore workersMax to 0 — that would leave the endpoint permanently dead.
      // Use event value, fall back to current endpoint value, floor at 1.
      const savedWorkersMax = Math.max(originalWorkersMax ?? ep.workersMax ?? 1, 1);

      // Check if adapter is in LORA_MODULES before restart
      const loraEnv = (ep.env || []).find((e: { key: string }) => e.key === 'LORA_MODULES');
      let loraSnapshot: Array<{ name: string; path: string }> = [];
      let adapterInLoraModules = false;
      try {
        if (loraEnv?.value) {
          loraSnapshot = JSON.parse(loraEnv.value);
          adapterInLoraModules = loraSnapshot.some((m) => m.name === adapterName);
        }
      } catch { /* ignore parse errors */ }

      if (restartLogId) {
        await supabase
          .from('endpoint_restart_log')
          .update({
            adapter_in_lora_modules: adapterInLoraModules,
            lora_modules_snapshot: loraSnapshot,
            scale_down_success: true,
          })
          .eq('id', restartLogId);
      }

      // Set workersMax=0 + idleTimeout=1 to kill all flex workers
      // workersMin is ALWAYS 0 — never change it
      await graphql(SAVE_ENDPOINT_MUTATION, {
        input: buildSaveInput(ep, { workersMin: 0, workersMax: 0, idleTimeout: 1 }),
      });
      console.log('[worker-refresh] Set workersMax=0, idleTimeout=1 — draining workers');

      // Purge job queue so idle workers have nothing to pick up
      try {
        await fetch(`${INFERENCE_API_URL}/purge-queue`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        });
        console.log('[worker-refresh] Job queue purged');
      } catch (err) {
        console.warn('[worker-refresh] Failed to purge queue (non-fatal):', err);
      }

      return {
        restartLogId,
        originalIdleTimeout,
        savedWorkersMax,
      };
    });

    // ========================================
    // Step 2: Wait for all workers to drain to 0
    // (try/finally ensures config is ALWAYS restored)
    // ========================================
    const drainResult = await step.run('wait-for-workers-terminated', async () => {
      const startMs = Date.now();
      const timeoutMs = 300_000; // 5 minutes (generous — expect < 1 min for flex workers)
      const pollMs = 10_000;     // 10 seconds between polls
      let drained = false;

      try {
        while (Date.now() - startMs < timeoutMs) {
          const state = await getWorkerState();
          const total = state.ready + state.idle + state.running + state.initializing;
          console.log(`[worker-refresh] Draining: total=${total} (R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing})`);

          if (total === 0) {
            drained = true;
            const terminatedAt = new Date().toISOString();
            if (scaleDownResult.restartLogId) {
              const supabase = createServerSupabaseAdminClient();
              await supabase
                .from('endpoint_restart_log')
                .update({
                  status: 'workers_terminated',
                  workers_terminated_at: terminatedAt,
                })
                .eq('id', scaleDownResult.restartLogId);
            }
            break;
          }
          await new Promise(r => setTimeout(r, pollMs));
        }

        if (!drained) {
          console.warn('[worker-refresh] Workers did not drain to 0 within 5 min — proceeding with restore anyway');
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
          console.log(`[worker-refresh] Config restored: workersMax=${scaleDownResult.savedWorkersMax}, idleTimeout=${scaleDownResult.originalIdleTimeout}`);

          if (scaleDownResult.restartLogId) {
            const supabase = createServerSupabaseAdminClient();
            await supabase
              .from('endpoint_restart_log')
              .update({
                status: 'scaling_up',
                scale_up_at: new Date().toISOString(),
                scale_up_success: true,
              })
              .eq('id', scaleDownResult.restartLogId);
          }
        } catch (restoreErr) {
          console.error('[worker-refresh] CRITICAL: Failed to restore endpoint config!', restoreErr);
          // Record the failure in DB so manual recovery can find it
          if (scaleDownResult.restartLogId) {
            try {
              const supabase = createServerSupabaseAdminClient();
              await supabase
                .from('endpoint_restart_log')
                .update({
                  status: 'failed',
                  error_step: 'config-restore',
                  error_message: `CRITICAL: Failed to restore config. Manual fix needed: workersMax=${scaleDownResult.savedWorkersMax}, idleTimeout=${scaleDownResult.originalIdleTimeout}. Error: ${String(restoreErr)}`,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', scaleDownResult.restartLogId);
            } catch { /* best effort */ }
          }
          throw restoreErr; // Re-throw so Inngest retries
        }
      }

      return { drained, waitedMs: Date.now() - startMs };
    });

    // ========================================
    // Step 3: Wait for fresh workers to become ready
    // (new workers cold-start with updated LORA_MODULES)
    // ========================================
    await step.run('wait-for-workers-ready', async () => {
      const startMs = Date.now();
      const timeoutMs = 300_000; // 5 min — cold start = model download + load + LoRA init
      const pollMs = 10_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        console.log(`[worker-refresh] Waiting for ready: R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing}`);
        if (state.ready > 0 || state.idle > 0) {
          const workersReadyAt = new Date().toISOString();
          if (scaleDownResult.restartLogId) {
            const supabase = createServerSupabaseAdminClient();
            await supabase
              .from('endpoint_restart_log')
              .update({
                status: 'workers_ready',
                workers_ready_at: workersReadyAt,
                worker_state_after: state,
              })
              .eq('id', scaleDownResult.restartLogId);
          }
          return { waitedMs: Date.now() - startMs, state };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      console.warn('[worker-refresh] Workers did not reach ready state within 5 min — proceeding anyway');
      return { waitedMs: Date.now() - startMs, timedOut: true, state: null };
    });

    // ========================================
    // Step 4: Verify adapter is available (non-fatal)
    // ========================================
    const verifyResult = await step.run('verify-adapter-available', async () => {
      if (scaleDownResult.restartLogId) {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('endpoint_restart_log')
          .update({ status: 'verifying', verification_at: new Date().toISOString() })
          .eq('id', scaleDownResult.restartLogId);
      }

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
        if (data.status === 'COMPLETED') {
          return { verified: true, error: null };
        }
        console.warn(`[worker-refresh] Adapter verification returned status: ${data.status}`);
        return { verified: false, error: `Status: ${data.status}` };
      } catch (err) {
        console.warn('[worker-refresh] Adapter verification failed (non-fatal):', err);
        return { verified: false, error: String(err) };
      }
    });

    // ========================================
    // Step 5: Mark endpoints as ready in DB
    // ========================================
    await step.run('mark-endpoints-ready', async () => {
      const supabase = createServerSupabaseAdminClient();
      const completedAt = new Date().toISOString();

      // Mark pipeline_inference_endpoints as ready
      try {
        const { error } = await supabase
          .from('pipeline_inference_endpoints')
          .update({
            status: 'ready',
            ready_at: completedAt,
          })
          .eq('job_id', jobId);

        if (error) {
          console.warn('[worker-refresh] Failed to mark endpoints ready:', error.message);
        }
      } catch (err) {
        console.warn('[worker-refresh] DB update for endpoints failed (non-fatal):', err);
      }

      // Finalize endpoint_restart_log row
      if (scaleDownResult.restartLogId) {
        await supabase
          .from('endpoint_restart_log')
          .update({
            status: 'completed',
            completed_at: completedAt,
            adapter_verified: verifyResult.verified,
          })
          .eq('id', scaleDownResult.restartLogId);
      }

      // Update deployment_log.worker_refresh on the training job
      const workerRefreshData = {
        scale_down_at: completedAt,
        workers_terminated_at: completedAt,
        scale_up_at: completedAt,
        workers_ready_at: completedAt,
        verification_result: verifyResult.verified
          ? 'verified'
          : verifyResult.error
            ? 'unverified'
            : 'skipped',
        verification_error: verifyResult.error || null,
      };

      try {
        const { data: jobRow } = await supabase
          .from('pipeline_training_jobs')
          .select('deployment_log')
          .eq('id', jobId)
          .single();

        if (jobRow?.deployment_log) {
          const updatedLog = {
            ...jobRow.deployment_log,
            worker_refresh: workerRefreshData,
          };
          await supabase
            .from('pipeline_training_jobs')
            .update({ deployment_log: updatedLog })
            .eq('id', jobId);
        }
      } catch (err) {
        console.warn('[worker-refresh] Failed to update deployment_log worker_refresh (non-fatal):', err);
      }

      return { updated: true, adapterVerified: verifyResult.verified };
    });

    return {
      success: true,
      jobId,
      adapterName,
      endpointId,
      drained: drainResult.drained,
    };
  }
);
