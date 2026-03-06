/**
 * Create training_sets table in Supabase (Gap 2 from spec left-to-do)
 */

require('dotenv').config({ path: '.env.local' });
const { agentExecuteDDL, agentIntrospectSchema } = require('../supa-agent-ops/dist/index');

async function main() {
  console.log('=== Creating training_sets table ===\n');

  // Check if table already exists
  const check = await agentIntrospectSchema({ table: 'training_sets' });
  if (check.success && check.tables[0]?.exists) {
    console.log('training_sets table already exists. Skipping creation.');
    return;
  }

  const ddl = `
CREATE TABLE IF NOT EXISTS training_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workbase_id UUID NOT NULL REFERENCES workbases(id),
  name TEXT NOT NULL,
  conversation_ids UUID[] NOT NULL DEFAULT '{}',
  conversation_count INTEGER NOT NULL DEFAULT 0,
  training_pair_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  jsonl_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_sets_select_own" ON training_sets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "training_sets_insert_own" ON training_sets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "training_sets_update_own" ON training_sets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "training_sets_delete_own" ON training_sets FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "training_sets_service_all" ON training_sets FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_training_sets_workbase_id ON training_sets(workbase_id);
CREATE INDEX IF NOT EXISTS idx_training_sets_user_id ON training_sets(user_id);
  `;

  console.log('Executing DDL to create training_sets table...');
  const result = await agentExecuteDDL({ sql: ddl, dryRun: false });

  if (result.success) {
    console.log('✅ training_sets table created successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } else {
    console.error('❌ Failed to create training_sets table:');
    console.error(result.error || result);
    process.exit(1);
  }

  // Verify
  const verify = await agentIntrospectSchema({ table: 'training_sets', includeColumns: true, includePolicies: true });
  if (verify.success && verify.tables[0]?.exists) {
    const t = verify.tables[0];
    console.log(`\n✅ Verified: training_sets exists`);
    console.log(`   Columns: ${t.columns?.length}`);
    console.log(`   RLS: ${t.rlsEnabled}`);
  } else {
    console.error('❌ Verification failed — table does not appear to exist after creation');
  }
}

main().catch(console.error);
