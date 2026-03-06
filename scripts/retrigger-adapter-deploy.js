/**
 * Re-triggers the auto-deploy pipeline for a specific training job.
 *
 * Usage:
 *   node scripts/retrigger-adapter-deploy.js [jobId]
 *
 * If no jobId is passed, defaults to the last known test job.
 * Reads WEBHOOK_SECRET from .env.local — make sure it matches the Vercel env var.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const JOB_ID = process.argv[2] || '4e48e3b4-45c0-4ea6-90b2-725759fffce0';
const USER_ID = '8d26cc10-a3c1-4927-8708-667d37a3348b';
const ADAPTER_PATH = `lora-models/adapters/${JOB_ID}.tar.gz`;
const WEBHOOK_URL = 'https://v4-show.vercel.app/api/webhooks/training-complete';

const secret = process.env.WEBHOOK_SECRET;
if (!secret) {
  console.error('ERROR: WEBHOOK_SECRET not found in .env.local');
  process.exit(1);
}

const payload = {
  type: 'UPDATE',
  table: 'pipeline_training_jobs',
  schema: 'public',
  record: {
    id: JOB_ID,
    user_id: USER_ID,
    status: 'completed',
    adapter_file_path: ADAPTER_PATH,
    hf_adapter_path: null,
  },
};

console.log(`Triggering auto-deploy for job: ${JOB_ID}`);
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Secret length: ${secret.length} chars`);

fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': secret,
  },
  body: JSON.stringify(payload),
})
  .then(async (r) => {
    const body = await r.json();
    console.log(`\nHTTP ${r.status}:`, JSON.stringify(body, null, 2));
    if (r.status === 200 || r.status === 201) {
      console.log('\n✅ Webhook accepted — check Inngest Dashboard for the running function.');
    } else if (r.status === 401) {
      console.error('\n❌ Unauthorized — the WEBHOOK_SECRET in .env.local does not match the Vercel env var.');
      console.error('   Go to Vercel Dashboard → Settings → Environment Variables → copy WEBHOOK_SECRET → update .env.local');
    }
  })
  .catch((e) => console.error('Fetch error:', e.message));
