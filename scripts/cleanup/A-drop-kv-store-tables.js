require('dotenv').config({ path: '../../.env.local' });
const saol = require('../../supa-agent-ops');

const KV_TABLES = [
  'kv_store_03a1393c', 'kv_store_07318469', 'kv_store_09344eeb',
  'kv_store_0b28297d', 'kv_store_145397cd', 'kv_store_2817f326',
  'kv_store_302d9cc9', 'kv_store_343e9cfc', 'kv_store_37208a88',
  'kv_store_390564ab', 'kv_store_441d0b93', 'kv_store_4f4f426a',
  'kv_store_59ff7219', 'kv_store_5e95744b', 'kv_store_6256688b',
  'kv_store_756e3c41', 'kv_store_7699b7f5', 'kv_store_87edc922',
  'kv_store_980c69a1', 'kv_store_9e3c16a7', 'kv_store_a7a27b87',
  'kv_store_a9be6573', 'kv_store_a9d7c19e', 'kv_store_adc245e5',
  'kv_store_ae300d0d', 'kv_store_b4534e71', 'kv_store_ba171cb4',
  'kv_store_c0b8a04e', 'kv_store_c54d9cb7', 'kv_store_ca5609f4',
  'kv_store_d138e5d5', 'kv_store_e2a43e9f', 'kv_store_e3a9c0cc',
  'kv_store_eefe95f0', 'kv_store_f681842d',
];

const dropSQL = KV_TABLES.map(t => `DROP TABLE IF EXISTS ${t};`).join('\n');

(async () => {
  console.log(`Dropping ${KV_TABLES.length} kv_store tables...`);
  const dry = await saol.agentExecuteDDL({ sql: dropSQL, dryRun: true, transaction: true, transport: 'pg' });
  console.log('Dry-run:', dry.success, dry.summary);
  if (!dry.success) { console.error('Dry-run failed. Abort.'); process.exit(1); }
  const result = await saol.agentExecuteDDL({ sql: dropSQL, transaction: true, transport: 'pg' });
  console.log('Applied:', result.success, result.summary);
})();
