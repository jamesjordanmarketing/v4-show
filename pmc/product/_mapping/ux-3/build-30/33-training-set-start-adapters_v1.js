#!/usr/bin/env node
/**
 * 33-training-set-start-adapters_v1.js
 * =====================================
 * RunPod Worker Restart Test Script
 * 
 * PURPOSE: Directly tests the workersMax=0 drain + restore cycle that our
 * Inngest functions (refresh-inference-workers, restart-inference-workers)
 * perform during adapter deployment. This lets us validate the theory
 * WITHOUT going through the full UI/Inngest pipeline, and without leaving
 * any spinners or job blockers.
 * 
 * WHAT IT DOES:
 *   1. Reads current endpoint config (workersMax, workersMin, idleTimeout, etc.)
 *   2. Checks current worker health (ready, idle, running, initializing)
 *   3. Sets workersMax=0 + idleTimeout=1 to drain all workers
 *   4. Polls health until all workers are gone (or timeout)
 *   5. Purges the queue (clear any stuck requests)
 *   6. Restores workersMax to the original value (or 1, whichever is higher)
 *   7. Polls health until at least 1 worker comes back READY (or timeout)
 *   8. Final health check + summary
 * 
 * USAGE:
 *   cd C:\Users\james\Master\BrightHub\BRun\v4-show
 *   node pmc/product/_mapping/ux-3/build-30/33-training-set-start-adapters_v1.js
 * 
 * REQUIREMENTS:
 *   - .env.local must exist in the project root with:
 *       RUNPOD_GRAPHQL_API_KEY=rpa_...
 *       GPU_CLUSTER_API_KEY=rpa_...  (or RUNPOD_API_KEY)
 *       RUNPOD_INFERENCE_ENDPOINT_ID=780tauhj7c126b
 *       INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b
 * 
 * NOTE: This script does NOT modify LORA_MODULES or env vars — it only
 * cycles the workers. Safe to run multiple times.
 */

// ─── Load Environment ────────────────────────────────────────────────
require('../../../../../load-env.js');
// Path: build-30 → ux-3 → _mapping → product → pmc → v4-Show (5 levels up)
// Alternatively, hardcode: require('C:/Users/james/Master/BrightHub/BRun/v4-show/load-env.js');

const GRAPHQL_URL = `https://api.runpod.io/graphql?api_key=${process.env.RUNPOD_GRAPHQL_API_KEY}`;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL;
const BEARER_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID;

// ─── Configuration ───────────────────────────────────────────────────
const DRAIN_POLL_INTERVAL_MS = 5000;   // 5 seconds between drain checks
const DRAIN_TIMEOUT_MS = 120000;       // 2 minutes max to wait for drain
const READY_POLL_INTERVAL_MS = 10000;  // 10 seconds between ready checks
const READY_TIMEOUT_MS = 300000;       // 5 minutes max to wait for workers to come back

// ─── Logging ─────────────────────────────────────────────────────────
function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { INFO: '📋', WARN: '⚠️', ERROR: '❌', OK: '✅', STEP: '🔧' }[level] || '  ';
  console.log(`[${ts}] ${prefix} ${level}: ${msg}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ─── Preflight Checks ───────────────────────────────────────────────
function preflight() {
  const missing = [];
  if (!process.env.RUNPOD_GRAPHQL_API_KEY) missing.push('RUNPOD_GRAPHQL_API_KEY');
  if (!BEARER_KEY) missing.push('GPU_CLUSTER_API_KEY or RUNPOD_API_KEY');
  if (!ENDPOINT_ID) missing.push('RUNPOD_INFERENCE_ENDPOINT_ID');
  if (!INFERENCE_API_URL) missing.push('INFERENCE_API_URL');

  if (missing.length > 0) {
    log('ERROR', `Missing env vars: ${missing.join(', ')}`);
    log('ERROR', 'Ensure .env.local exists in the project root with these variables.');
    process.exit(1);
  }

  log('INFO', `Endpoint ID: ${ENDPOINT_ID}`);
  log('INFO', `Inference URL: ${INFERENCE_API_URL}`);
  log('INFO', `GraphQL URL: ${GRAPHQL_URL.replace(/api_key=.*/, 'api_key=***')}`);
}

// ─── RunPod GraphQL Helper ──────────────────────────────────────────
async function graphql(query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

// ─── Get Endpoint Config ────────────────────────────────────────────
async function getEndpointConfig() {
  const query = `
    query GetEndpoint {
      myself {
        endpoint(id: "${ENDPOINT_ID}") {
          id name gpuIds idleTimeout locations
          networkVolumeId scalerType scalerValue
          workersMin workersMax templateId
          env { key value }
        }
      }
    }
  `;

  const result = await graphql(query);
  const ep = result?.data?.myself?.endpoint;
  if (!ep) {
    throw new Error(`Endpoint ${ENDPOINT_ID} not found. Response: ${JSON.stringify(result)}`);
  }
  return ep;
}

// ─── Save Endpoint Config (full PUT) ────────────────────────────────
async function saveEndpoint(ep, overrides) {
  const input = {
    id: ep.id,
    name: ep.name,
    gpuIds: ep.gpuIds,
    idleTimeout: overrides.idleTimeout ?? ep.idleTimeout,
    locations: ep.locations,
    networkVolumeId: ep.networkVolumeId,
    scalerType: ep.scalerType,
    scalerValue: ep.scalerValue,
    workersMin: overrides.workersMin ?? ep.workersMin ?? 0,
    workersMax: overrides.workersMax ?? ep.workersMax,
    templateId: ep.templateId,
    env: (ep.env || []).map(e => ({ key: e.key, value: e.value })),
  };

  log('INFO', 'saveEndpoint input:', {
    workersMin: input.workersMin,
    workersMax: input.workersMax,
    idleTimeout: input.idleTimeout,
  });

  const mutation = `
    mutation SaveEndpointEnv($input: EndpointInput!) {
      saveEndpoint(input: $input) {
        id
      }
    }
  `;

  const result = await graphql(mutation, { input });
  return result;
}

// ─── Get Worker Health ──────────────────────────────────────────────
async function getWorkerHealth() {
  const res = await fetch(`${INFERENCE_API_URL}/health`, {
    headers: { Authorization: `Bearer ${BEARER_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Health check HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    ready: data.workers?.ready || 0,
    idle: data.workers?.idle || 0,
    running: data.workers?.running || 0,
    initializing: data.workers?.initializing || 0,
    raw: data,
  };
}

// ─── Purge Queue ────────────────────────────────────────────────────
async function purgeQueue() {
  const res = await fetch(`${INFERENCE_API_URL}/purge-queue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER_KEY}` },
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }

  return { status: res.status, body: json };
}

// ─── Sleep Helper ───────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Poll Until Condition ───────────────────────────────────────────
async function pollWorkers(description, checkFn, intervalMs, timeoutMs) {
  const start = Date.now();
  let iteration = 0;

  while (true) {
    iteration++;
    const elapsed = Math.round((Date.now() - start) / 1000);
    const health = await getWorkerHealth();
    const total = health.ready + health.idle + health.running + health.initializing;

    log('INFO', `[Poll ${iteration}] ${description} — elapsed ${elapsed}s — ` +
      `R:${health.ready} I:${health.idle} Ru:${health.running} In:${health.initializing} (total: ${total})`);

    if (checkFn(health, total)) {
      log('OK', `${description} — condition met after ${elapsed}s`);
      return { success: true, health, elapsed };
    }

    if (Date.now() - start > timeoutMs) {
      log('WARN', `${description} — TIMED OUT after ${elapsed}s`);
      return { success: false, health, elapsed, timedOut: true };
    }

    await sleep(intervalMs);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ─── MAIN ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(' RunPod Worker Restart Test Script');
  console.log(' 33-training-set-start-adapters_v1.js');
  console.log('═'.repeat(70) + '\n');

  preflight();

  // ── Step 1: Read current endpoint config ──────────────────────────
  log('STEP', '━━━ STEP 1: Read current endpoint config ━━━');
  const ep = await getEndpointConfig();
  const originalWorkersMax = ep.workersMax;
  const originalIdleTimeout = ep.idleTimeout;
  const safeWorkersMax = Math.max(originalWorkersMax ?? 1, 1);

  log('INFO', 'Current endpoint config:', {
    id: ep.id,
    name: ep.name,
    workersMin: ep.workersMin,
    workersMax: ep.workersMax,
    idleTimeout: ep.idleTimeout,
    scalerType: ep.scalerType,
    scalerValue: ep.scalerValue,
    gpuIds: ep.gpuIds,
    templateId: ep.templateId,
  });

  log('INFO', `Stored workersMax: ${originalWorkersMax}`);
  log('INFO', `Safe restore value (Math.max(${originalWorkersMax}, 1)): ${safeWorkersMax}`);

  if (originalWorkersMax === 0) {
    log('WARN', '⚡ workersMax is currently 0! This is the exact bug condition.');
    log('WARN', 'The test will restore to Math.max(0, 1) = 1 to prevent the bug.');
  }

  // ── Step 2: Check current worker health ───────────────────────────
  log('STEP', '━━━ STEP 2: Check current worker health ━━━');
  const initialHealth = await getWorkerHealth();
  log('INFO', 'Current workers:', initialHealth);

  const initialTotal = initialHealth.ready + initialHealth.idle +
    initialHealth.running + initialHealth.initializing;

  if (initialTotal === 0) {
    log('WARN', 'No workers currently active. Drain step will be fast/no-op.');
  }

  // ── Step 3: Set workersMax=0 + idleTimeout=1 (drain) ─────────────
  log('STEP', '━━━ STEP 3: Set workersMax=0 + idleTimeout=1 to drain workers ━━━');
  const drainResult = await saveEndpoint(ep, {
    workersMax: 0,
    workersMin: 0,
    idleTimeout: 1,
  });
  log('OK', 'Drain config saved:', drainResult?.data?.saveEndpoint);

  // ── Step 4: Poll until all workers are gone ───────────────────────
  log('STEP', '━━━ STEP 4: Polling until all workers drain (timeout: ${DRAIN_TIMEOUT_MS/1000}s) ━━━');
  const drainPoll = await pollWorkers(
    'Waiting for workers to drain',
    (health, total) => total === 0,
    DRAIN_POLL_INTERVAL_MS,
    DRAIN_TIMEOUT_MS
  );

  if (!drainPoll.success) {
    log('WARN', 'Workers did not fully drain. Continuing anyway — restore will still work.');
    log('INFO', 'Remaining workers:', drainPoll.health);
  }

  // ── Step 5: Purge the queue ───────────────────────────────────────
  log('STEP', '━━━ STEP 5: Purge queue ━━━');
  const purgeResult = await purgeQueue();
  log('INFO', 'Purge result:', purgeResult);

  // ── Step 6: Restore workersMax (Math.max(original, 1)) ───────────
  log('STEP', `━━━ STEP 6: Restore workersMax=${safeWorkersMax}, idleTimeout=${originalIdleTimeout} ━━━`);

  // Re-read config to make sure we have the latest (important because saveEndpoint is full PUT)
  const epAfterDrain = await getEndpointConfig();
  const restoreResult = await saveEndpoint(epAfterDrain, {
    workersMax: safeWorkersMax,
    workersMin: 0,
    idleTimeout: originalIdleTimeout,
  });
  log('OK', 'Config restored:', restoreResult?.data?.saveEndpoint);

  // ── Step 7: Poll until at least 1 worker is READY ────────────────
  log('STEP', `━━━ STEP 7: Polling until workers come back READY (timeout: ${READY_TIMEOUT_MS / 1000}s) ━━━`);
  const readyPoll = await pollWorkers(
    'Waiting for workers to come READY',
    (health) => health.ready > 0,
    READY_POLL_INTERVAL_MS,
    READY_TIMEOUT_MS
  );

  // ── Step 8: Final Summary ─────────────────────────────────────────
  log('STEP', '━━━ STEP 8: Final Summary ━━━');
  const finalHealth = await getWorkerHealth();
  const finalEp = await getEndpointConfig();

  console.log('\n' + '─'.repeat(70));
  console.log(' TEST RESULTS');
  console.log('─'.repeat(70));
  console.log(`  Original workersMax:  ${originalWorkersMax}`);
  console.log(`  Restored workersMax:  ${finalEp.workersMax}`);
  console.log(`  Safe floor applied:   ${originalWorkersMax === 0 ? 'YES (0 → 1)' : 'No (value >= 1)'}`);
  console.log(`  Original idleTimeout: ${originalIdleTimeout}`);
  console.log(`  Restored idleTimeout: ${finalEp.idleTimeout}`);
  console.log(`  Drain completed:      ${drainPoll.success ? 'YES' : 'NO (timed out)'} (${drainPoll.elapsed}s)`);
  console.log(`  Workers came READY:   ${readyPoll.success ? 'YES' : 'NO (timed out)'} (${readyPoll.elapsed}s)`);
  console.log(`  Final workers:        R:${finalHealth.ready} I:${finalHealth.idle} Ru:${finalHealth.running} In:${finalHealth.initializing}`);
  console.log('─'.repeat(70));

  if (readyPoll.success) {
    log('OK', '🎉 TEST PASSED — Workers drained and came back successfully!');
  } else if (finalHealth.initializing > 0) {
    log('WARN', 'Workers are still initializing — they are coming up but not READY yet.');
    log('INFO', 'This is normal — vLLM + LoRA cold start can take 3-5 minutes.');
    log('INFO', 'Run this to check health manually:');
    log('INFO', `  curl -s -H "Authorization: Bearer ***" ${INFERENCE_API_URL}/health | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).workers))"`);
  } else {
    log('WARN', 'Workers did not reach READY state within the timeout.');
    log('INFO', 'Check RunPod console for worker errors or GPU availability issues.');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

// ─── Run ─────────────────────────────────────────────────────────────
main().catch(err => {
  log('ERROR', 'Script failed with error:', { message: err.message, stack: err.stack });
  process.exit(1);
});
