require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const saol = require('../supa-agent-ops');
const { createClient } = require('@supabase/supabase-js');

const TARGET_WORKBASE_ID = '232bea74-b987-4629-afbc-a21180fe6e84';
const TARGET_USER_ID     = '8d26cc10-a3c1-4927-8708-667d37a3348b';

const SQL = `
  UPDATE conversations
  SET workbase_id = '${TARGET_WORKBASE_ID}'
  WHERE workbase_id IS NULL
    AND user_id = '${TARGET_USER_ID}';
`;

(async () => {
  console.log('Backfill: assign NULL workbase_id conversations to rag-KB-v2_v1');
  console.log('Target workbase:', TARGET_WORKBASE_ID);

  // Dry run
  const dry = await saol.agentExecuteDDL({ sql: SQL, dryRun: true, transaction: true, transport: 'pg' });
  console.log('Dry-run:', dry.success ? '✓ PASS' : '✗ FAIL');
  if (!dry.success) { console.error(dry.summary); process.exit(1); }

  // Execute
  const result = await saol.agentExecuteDDL({ sql: SQL, dryRun: false, transaction: true, transport: 'pg' });
  console.log('Result:', result.success ? '✅ SUCCESS' : '❌ FAILED', result.summary || '');

  // Verify
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count: remaining } = await supabase
    .from('conversations').select('*', { count: 'exact', head: true }).is('workbase_id', null);
  console.log(`\nConversations still with NULL workbase_id: ${remaining} (expected 0)`);
})();
