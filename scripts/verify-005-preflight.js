require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

async function run() {
  console.log('=== Pre-Flight Verification ===\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Confirm rag_sections has workbase_id column
  const { data: sectionRow } = await supabase.from('rag_sections').select('*').limit(1);
  const sectionCols = sectionRow && sectionRow.length > 0 ? Object.keys(sectionRow[0]) : [];
  console.log('rag_sections.workbase_id column:', sectionCols.includes('workbase_id') ? '✅ EXISTS' : '❌ MISSING');
  console.log('rag_sections.knowledge_base_id column:', sectionCols.includes('knowledge_base_id') ? '⚠️  STILL EXISTS' : '✅ RENAMED/REMOVED');

  const { data: factRow } = await supabase.from('rag_facts').select('*').limit(1);
  const factCols = factRow && factRow.length > 0 ? Object.keys(factRow[0]) : [];
  console.log('rag_facts.workbase_id column:', factCols.includes('workbase_id') ? '✅ EXISTS' : '❌ MISSING');

  // 2. Confirm conversations workbase_id state
  const { count } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
  const { count: withWB } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).not('workbase_id', 'is', null);
  console.log(`\nconversations total: ${count}, with workbase_id: ${withWB}, NULL: ${(count ?? 0) - (withWB ?? 0)}`);

  // 3. Confirm Sun Bank embedding state
  const { count: sunEmbeds } = await supabase.from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', '77115c6f-b987-4784-985a-afb4c45d02b6');
  console.log(`\nSun Bank (77115c6f) embeddings: ${sunEmbeds} (expected 0)`);

  // 4. Confirm workbases exist
  const { data: wbs } = await supabase.from('workbases').select('id, name, status').eq('status', 'active');
  console.log(`\nActive workbases (${wbs?.length ?? 0}):`);
  wbs?.forEach(w => console.log(`  ${w.id.slice(0, 8)} | ${w.name}`));

  console.log('\n=== Pre-Flight Complete ===');
}
run().catch(console.error);
