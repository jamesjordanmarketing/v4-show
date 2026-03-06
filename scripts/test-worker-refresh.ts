/**
 * Test Worker Refresh Cycle
 *
 * Usage: npx tsx scripts/test-worker-refresh.ts
 *
 * Validates:
 * 1. Fetching current endpoint state via GraphQL
 * 2. Setting workersMin=0 and waiting for termination
 * 3. Restoring workersMin and waiting for ready
 * 4. Rapid-fire test (0 then immediately 2)
 * 5. Endpoint creation research (dry-run only)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID || '780tauhj7c126b';
const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

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

async function getHealth() {
  try {
    const res = await fetch(`${INFERENCE_API_URL}/health`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    });
    return await res.json();
  } catch (err) {
    return { workers: { ready: 0, idle: 0, running: 0, initializing: 0 }, error: String(err) };
  }
}

function logWorkers(label: string, w: { ready: number; idle: number; running: number; initializing: number }) {
  console.log(`  ${label} Ready: ${w.ready}, Idle: ${w.idle}, Running: ${w.running}, Initializing: ${w.initializing}`);
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function setWorkersMin(endpointData: Record<string, unknown>, workersMin: number) {
  const mutation = `
    mutation SaveEndpointEnv($input: EndpointInput!) {
      saveEndpoint(input: $input) { id }
    }
  `;
  const ep = endpointData as any;
  const input = {
    id: ep.id,
    name: ep.name,
    gpuIds: ep.gpuIds,
    idleTimeout: ep.idleTimeout,
    locations: ep.locations,
    networkVolumeId: ep.networkVolumeId,
    scalerType: ep.scalerType,
    scalerValue: ep.scalerValue,
    workersMin,
    workersMax: ep.workersMax,
    templateId: ep.templateId,
    env: ep.env.map((e: { key: string; value: string }) => ({ key: e.key, value: e.value })),
  };
  return graphql(mutation, { input });
}

async function main() {
  console.log('=== Worker Refresh Test Script ===\n');

  // Step 1: Fetch endpoint state
  console.log('[1/6] Fetching current endpoint state...');
  const fetchQuery = `
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
  const fetchResult = await graphql(fetchQuery);
  const ep = fetchResult.data?.myself?.endpoint;
  if (!ep) {
    console.error('ERROR: Endpoint not found:', fetchResult);
    process.exit(1);
  }
  console.log(`  Endpoint: ${ep.name} (${ep.id})`);
  console.log(`  Current workersMin: ${ep.workersMin}, workersMax: ${ep.workersMax}`);
  const maxLoras = ep.env.find((e: any) => e.key === 'MAX_LORAS');
  console.log(`  Current MAX_LORAS: ${maxLoras?.value || 'not set'}`);

  const originalWorkersMin = ep.workersMin;

  // Step 2: Current worker state
  console.log('\n[2/6] Current worker state:');
  const health = await getHealth();
  logWorkers('', health.workers || { ready: 0, idle: 0, running: 0, initializing: 0 });

  // Step 3: Set workersMin=0
  console.log('\n[3/6] Setting workersMin=0...');
  await setWorkersMin(ep, 0);
  console.log('  workersMin set to 0');

  // Step 4: Poll until terminated
  console.log('\n[4/6] Polling until all workers terminated...');
  const start1 = Date.now();
  for (let i = 0; i < 18; i++) { // 90s max
    await sleep(5000);
    const h = await getHealth();
    const w = h.workers || { ready: 0, idle: 0, running: 0, initializing: 0 };
    const elapsed = Math.round((Date.now() - start1) / 1000);
    logWorkers(`[${elapsed}s]`, w);
    if (w.ready + w.idle + w.running + w.initializing === 0) {
      console.log(`  All workers terminated after ${elapsed}s`);
      break;
    }
  }

  // Step 5: Restore workersMin
  console.log(`\n[5/6] Setting workersMin=${originalWorkersMin || 2} (restoring)...`);
  await setWorkersMin(ep, originalWorkersMin || 2);
  console.log(`  workersMin set to ${originalWorkersMin || 2}`);

  // Step 6: Poll until ready
  console.log('\n[6/6] Polling until workers ready...');
  const start2 = Date.now();
  for (let i = 0; i < 36; i++) { // 180s max
    await sleep(5000);
    const h = await getHealth();
    const w = h.workers || { ready: 0, idle: 0, running: 0, initializing: 0 };
    const elapsed = Math.round((Date.now() - start2) / 1000);
    logWorkers(`[${elapsed}s]`, w);
    if (w.ready > 0 || w.idle > 0) {
      console.log(`  Workers ready after ${elapsed}s`);
      break;
    }
  }

  // Rapid-fire test
  console.log('\n[RAPID-FIRE TEST] Setting workersMin=0 then immediately workersMin=2...');
  await setWorkersMin(ep, 0);
  console.log('  Sent workersMin=0');
  await setWorkersMin(ep, 2);
  console.log('  Sent workersMin=2 (immediately after)');
  await sleep(10000);
  const rapidHealth = await getHealth();
  logWorkers('  After 10s:', rapidHealth.workers || { ready: 0, idle: 0, running: 0, initializing: 0 });

  // Restore to original
  await setWorkersMin(ep, originalWorkersMin);
  console.log(`\n  Restored workersMin to ${originalWorkersMin}`);

  // Research: endpoint creation
  console.log('\n[RESEARCH] Endpoint creation capability:');
  console.log(`  templateId: ${ep.templateId}`);
  console.log(`  Full env:`, ep.env.map((e: any) => `${e.key}=${e.value}`).join(', '));
  console.log(`  createEndpoint mutation would look like:`);
  console.log(`    mutation { createEndpoint(input: {`);
  console.log(`      name: "clone-of-${ep.name}",`);
  console.log(`      templateId: "${ep.templateId}",`);
  console.log(`      gpuIds: "${ep.gpuIds}",`);
  console.log(`      workersMin: ${ep.workersMin},`);
  console.log(`      workersMax: ${ep.workersMax},`);
  console.log(`      idleTimeout: ${ep.idleTimeout},`);
  console.log(`      env: [${ep.env.map((e: any) => `{key:"${e.key}",value:"${e.value}"}`).join(', ')}]`);
  console.log(`    }) { id } }`);

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
