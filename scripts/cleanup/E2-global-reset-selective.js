require('dotenv').config({ path: '../../.env.local' });
const saol = require('../../supa-agent-ops');

const PRESERVE_TF_ID  = 'e57e3266-3acc-4252-8b92-b165993076fb';
const PRESERVE_DS_ID  = '8ec1aba1-6618-45ad-b10c-1970ee95b9ec';
const PRESERVE_JOB_ID = '6fd5ac79-c54b-4927-8138-ca159108bcae';

async function exec(sql, label) {
  const r = await saol.agentExecuteSQL({ sql, transport: 'pg' });
  console.log(` [OK] ${label}`);
  return r;
}

(async () => {
  // --- Verify preserved records ---
  console.log('\n=== VERIFYING PRESERVED RECORDS EXIST ===');
  const check = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_file' AS type, name AS label FROM training_files WHERE id = '${PRESERVE_TF_ID}'
    UNION ALL SELECT 'dataset', name FROM datasets WHERE id = '${PRESERVE_DS_ID}'
    UNION ALL SELECT 'pipeline_job', job_name FROM pipeline_training_jobs WHERE id = '${PRESERVE_JOB_ID}'
  `, transport: 'pg' });
  if (check.rows.length < 3) {
    console.error('ERROR: One or more preserved records not found. Aborting.');
    process.exit(1);
  }
  check.rows.forEach(r => console.log(` ${r.type}: ${r.label} (ID verified)`));

  const linkedConvCount = await saol.agentExecuteSQL({ sql: `
    SELECT COUNT(*) AS cnt FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}'
  `, transport: 'pg' });
  console.log(` conversations to preserve: ${linkedConvCount.rows[0].cnt}`);

  // --- Identity Spine check ---
  const idCheck = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_file' AS type, COUNT(*) FILTER (WHERE user_id IS NULL) AS null_user_id
    FROM training_files WHERE id = '${PRESERVE_TF_ID}'
    UNION ALL
    SELECT 'dataset', COUNT(*) FILTER (WHERE user_id IS NULL)
    FROM datasets WHERE id = '${PRESERVE_DS_ID}'
    UNION ALL
    SELECT 'pipeline_job', COUNT(*) FILTER (WHERE user_id IS NULL)
    FROM pipeline_training_jobs WHERE id = '${PRESERVE_JOB_ID}'
    UNION ALL
    SELECT 'linked_conversations', COUNT(*) FILTER (WHERE c.user_id IS NULL)
    FROM conversations c
    INNER JOIN training_file_conversations tfc ON tfc.conversation_id = c.id
    WHERE tfc.training_file_id = '${PRESERVE_TF_ID}'
  `, transport: 'pg' });

  console.log('\n=== IDENTITY SPINE CHECK (null_user_id must be 0 for all) ===');
  idCheck.rows.forEach(r => console.log(` ${r.type}: null_user_id = ${r.null_user_id}`));

  const hasNullUserId = idCheck.rows.some(r => parseInt(r.null_user_id) > 0);
  if (hasNullUserId) {
    console.error('\nWARNING: Some preserved records have null user_id. E04 NOT NULL constraint will fail for these rows.');
    console.error('Proceeding with reset — but fix user_id before E04.');
  } else {
    console.log('\n All preserved records have valid user_id — Identity Spine safe.');
  }

  console.log('\n10 second abort window — CTRL+C to cancel...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('\n=== EXECUTING SELECTIVE RESET ===');

  // Pipeline data (preserve job + its results)
  await exec(`TRUNCATE _orphaned_records`, 'TRUNCATE _orphaned_records');
  await exec(`DELETE FROM pipeline_test_results WHERE job_id != '${PRESERVE_JOB_ID}'`, 'pipeline_test_results');
  await exec(`DELETE FROM pipeline_evaluation_results WHERE run_id NOT IN (SELECT id FROM pipeline_evaluation_runs WHERE job_id = '${PRESERVE_JOB_ID}')`, 'pipeline_evaluation_results');
  await exec(`DELETE FROM pipeline_evaluation_runs WHERE job_id != '${PRESERVE_JOB_ID}'`, 'pipeline_evaluation_runs');
  await exec(`DELETE FROM pipeline_training_metrics WHERE job_id != '${PRESERVE_JOB_ID}'`, 'pipeline_training_metrics');
  await exec(`DELETE FROM model_artifacts`, 'model_artifacts');
  await exec(`DELETE FROM training_jobs`, 'training_jobs');
  await exec(`DELETE FROM pipeline_training_jobs WHERE id != '${PRESERVE_JOB_ID}'`, 'pipeline_training_jobs');
  await exec(`DELETE FROM pipeline_inference_endpoints WHERE job_id != '${PRESERVE_JOB_ID}'`, 'pipeline_inference_endpoints');

  // Training data (preserve TF + DS)
  await exec(`DELETE FROM training_file_conversations WHERE training_file_id != '${PRESERVE_TF_ID}'`, 'training_file_conversations (non-preserved)');
  await exec(`DELETE FROM datasets WHERE id != '${PRESERVE_DS_ID}'`, 'datasets (non-preserved)');
  await exec(`DELETE FROM training_files WHERE id != '${PRESERVE_TF_ID}'`, 'training_files (non-preserved)');

  // Batch + generation data
  await exec(`DELETE FROM batch_checkpoints`, 'batch_checkpoints');
  await exec(`DELETE FROM batch_items`, 'batch_items');
  await exec(`DELETE FROM batch_jobs`, 'batch_jobs');
  await exec(`DELETE FROM generation_logs`, 'generation_logs');
  await exec(`DELETE FROM failed_generations`, 'failed_generations');

  // Conversations (preserve the 242 linked ones)
  await exec(`DELETE FROM conversation_turns WHERE conversation_id NOT IN (SELECT conversation_id FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}')`, 'conversation_turns (non-preserved)');
  await exec(`DELETE FROM legacy_conversation_turns`, 'legacy_conversation_turns');
  await exec(`DELETE FROM multi_turn_conversations`, 'multi_turn_conversations');
  await exec(`DELETE FROM conversations WHERE id NOT IN (SELECT conversation_id FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}')`, 'conversations (non-preserved)');

  // Logs, monitoring, misc
  await exec(`DELETE FROM api_response_logs`, 'api_response_logs');
  await exec(`DELETE FROM notifications`, 'notifications');
  await exec(`DELETE FROM edge_cases`, 'edge_cases');
  await exec(`DELETE FROM scenarios`, 'scenarios');
  await exec(`DELETE FROM error_logs`, 'error_logs');
  await exec(`DELETE FROM query_performance_logs`, 'query_performance_logs');
  await exec(`DELETE FROM index_usage_snapshots`, 'index_usage_snapshots');
  await exec(`DELETE FROM table_bloat_snapshots`, 'table_bloat_snapshots');
  await exec(`DELETE FROM performance_alerts`, 'performance_alerts');
  await exec(`DELETE FROM maintenance_operations`, 'maintenance_operations');
  await exec(`DELETE FROM metrics_points`, 'metrics_points');
  await exec(`DELETE FROM schema_migrations`, 'schema_migrations');
  await exec(`DELETE FROM orphaned_conversations`, 'orphaned_conversations');
  await exec(`DELETE FROM backup_exports`, 'backup_exports');
  await exec(`DELETE FROM cost_records`, 'cost_records');
  await exec(`DELETE FROM export_logs`, 'export_logs');
  await exec(`DELETE FROM template_analytics`, 'template_analytics');
  await exec(`DELETE FROM documents`, 'documents');

  // --- Final verification ---
  console.log('\n=== POST-RESET VERIFICATION ===');
  const verify = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_files'                AS t, COUNT(*) AS rows FROM training_files
    UNION ALL SELECT 'datasets',                COUNT(*) FROM datasets
    UNION ALL SELECT 'pipeline_training_jobs',  COUNT(*) FROM pipeline_training_jobs
    UNION ALL SELECT 'conversations (total)',    COUNT(*) FROM conversations
    UNION ALL SELECT 'training_file_convs',      COUNT(*) FROM training_file_conversations
    UNION ALL SELECT 'documents',               COUNT(*) FROM documents
  `, transport: 'pg' });
  verify.rows.forEach(r => console.log(` ${r.t}: ${r.rows} rows`));
  console.log('\nExpected: training_files=1, datasets=1, pipeline_training_jobs=1, conversations=242, training_file_convs=242, documents=0');
  console.log('\nDone.');
})();
