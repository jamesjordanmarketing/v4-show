/**
 * Delete RAG Document Jobs
 * ========================
 * Deletes the N most recently created RAG document jobs and ALL dependent
 * database records and Supabase Storage files. Leaves no orphaned data.
 *
 * Delete order (mirrors API DELETE /api/rag/documents/[id]):
 *   1. Supabase Storage file
 *   2. rag_quality_scores  (via query_ids for this document)
 *   3. rag_queries         (document_id = doc_id)
 *   4. rag_expert_questions
 *   5. rag_facts
 *   6. rag_embedding_runs
 *   7. rag_embeddings
 *   8. rag_sections
 *   9. rag_documents       (the row itself)
 *  10. workbases.document_count -= 1
 *
 * Usage:
 *   # Preview the last 3 documents (dry-run, no changes made)
 *   node scripts/delete-rag-jobs.js --count 3 --dry-run
 *
 *   # Delete the last 1 document (most recent)
 *   node scripts/delete-rag-jobs.js --count 1
 *
 *   # Delete the last 2 documents
 *   node scripts/delete-rag-jobs.js --count 2
 *
 *   # Delete specific document IDs
 *   node scripts/delete-rag-jobs.js --ids 714845cf-f241-4e39-9aba-4c3517d408c6
 *
 *   # Delete specific IDs (dry-run)
 *   node scripts/delete-rag-jobs.js --ids id1,id2 --dry-run
 *
 *   # Delete the 2nd-to-last document (skip the most recent 1, delete 1)
 *   node scripts/delete-rag-jobs.js --count 1 --skip 1
 *
 *   # Delete docs 3 and 4 from the end (skip 2 most recent, delete next 2)
 *   node scripts/delete-rag-jobs.js --count 2 --skip 2
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countArg = args.find(a => a.startsWith('--count'));
const idsArg = args.find(a => a.startsWith('--ids'));
const skipArg = args.find(a => a.startsWith('--skip'));

const count = countArg ? parseInt(args[args.indexOf(countArg) + 1] ?? countArg.split('=')[1] ?? '1') : null;
const specificIds = idsArg ? (args[args.indexOf(idsArg) + 1] ?? idsArg.split('=')[1] ?? '').split(',').filter(Boolean) : null;
const offset = skipArg ? parseInt(args[args.indexOf(skipArg) + 1] ?? skipArg.split('=')[1] ?? '0') : 0;

if (!count && !specificIds) {
  console.error('❌ Usage: node delete-rag-jobs.js --count N [--skip N] [--dry-run]');
  console.error('         node delete-rag-jobs.js --ids id1,id2 [--dry-run]');
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(msg); }
function warn(msg) { console.warn('⚠️ ', msg); }
function ok(msg) { console.log('✅', msg); }
function skip(msg) { console.log('  ↳ (dry-run) would', msg); }

async function deleteDocumentById(docId, docMeta) {
  const label = `[${docMeta.file_name}] (${docId})`;
  log(`\n${'─'.repeat(60)}`);
  log(`📄 ${label}`);
  log(`   Status: ${docMeta.status}  |  Created: ${new Date(docMeta.created_at).toUTCString()}`);
  log(`   Workbase ID: ${docMeta.workbase_id}`);
  log(`   Storage: ${docMeta.storage_bucket}/${docMeta.file_path}`);

  // 1. Get query IDs (for quality_scores cascade)
  const { data: queries } = await supabase
    .from('rag_queries')
    .select('id')
    .eq('document_id', docId);
  const queryIds = queries?.map(q => q.id) ?? [];

  // 2. Get child record counts for reporting
  const [
    { count: sectionCount },
    { count: factCount },
    { count: embedCount },
    { count: embedRunCount },
    { count: expertQCount },
    { count: qualityCount },
  ] = await Promise.all([
    supabase.from('rag_sections').select('*', { count: 'exact', head: true }).eq('document_id', docId),
    supabase.from('rag_facts').select('*', { count: 'exact', head: true }).eq('document_id', docId),
    supabase.from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', docId),
    supabase.from('rag_embedding_runs').select('*', { count: 'exact', head: true }).eq('document_id', docId),
    supabase.from('rag_expert_questions').select('*', { count: 'exact', head: true }).eq('document_id', docId),
    queryIds.length > 0
      ? supabase.from('rag_quality_scores').select('*', { count: 'exact', head: true }).in('query_id', queryIds)
      : Promise.resolve({ count: 0 }),
  ]);

  log(`   Records to delete:`);
  log(`     sections: ${sectionCount ?? 0}`);
  log(`     facts: ${factCount ?? 0}`);
  log(`     embeddings: ${embedCount ?? 0}`);
  log(`     embedding_runs: ${embedRunCount ?? 0}`);
  log(`     expert_questions: ${expertQCount ?? 0}`);
  log(`     queries: ${queryIds.length}`);
  log(`     quality_scores: ${qualityCount ?? 0}`);

  if (dryRun) {
    skip(`delete storage file: ${docMeta.storage_bucket}/${docMeta.file_path}`);
    skip(`delete ${qualityCount ?? 0} rag_quality_scores`);
    skip(`delete ${queryIds.length} rag_queries`);
    skip(`delete ${expertQCount ?? 0} rag_expert_questions`);
    skip(`delete ${factCount ?? 0} rag_facts`);
    skip(`delete ${embedRunCount ?? 0} rag_embedding_runs`);
    skip(`delete ${embedCount ?? 0} rag_embeddings`);
    skip(`delete ${sectionCount ?? 0} rag_sections`);
    skip(`delete rag_documents row`);
    skip(`decrement workbases.document_count for ${docMeta.workbase_id}`);
    return;
  }

  // ── 1. Storage file ──────────────────────────────────────────────────────────
  if (docMeta.file_path && docMeta.storage_bucket) {
    const { error: storageErr } = await supabase.storage
      .from(docMeta.storage_bucket)
      .remove([docMeta.file_path]);
    if (storageErr) warn(`Storage delete failed (non-fatal): ${storageErr.message}`);
    else ok(`Storage file deleted`);
  }

  // ── 2. rag_quality_scores ────────────────────────────────────────────────────
  if (queryIds.length > 0) {
    const { error } = await supabase.from('rag_quality_scores').delete().in('query_id', queryIds);
    if (error) warn(`rag_quality_scores delete error: ${error.message}`);
    else ok(`rag_quality_scores deleted (${qualityCount ?? 0})`);
  }

  // ── 3. rag_queries ───────────────────────────────────────────────────────────
  const { error: qErr } = await supabase.from('rag_queries').delete().eq('document_id', docId);
  if (qErr) warn(`rag_queries delete error: ${qErr.message}`);
  else ok(`rag_queries deleted (${queryIds.length})`);

  // ── 4. rag_expert_questions ──────────────────────────────────────────────────
  const { error: eqErr } = await supabase.from('rag_expert_questions').delete().eq('document_id', docId);
  if (eqErr) warn(`rag_expert_questions delete error: ${eqErr.message}`);
  else ok(`rag_expert_questions deleted`);

  // ── 5. rag_facts ─────────────────────────────────────────────────────────────
  const { error: fErr } = await supabase.from('rag_facts').delete().eq('document_id', docId);
  if (fErr) warn(`rag_facts delete error: ${fErr.message}`);
  else ok(`rag_facts deleted (${factCount ?? 0})`);

  // ── 6. rag_embedding_runs ────────────────────────────────────────────────────
  const { error: erErr } = await supabase.from('rag_embedding_runs').delete().eq('document_id', docId);
  if (erErr) warn(`rag_embedding_runs delete error: ${erErr.message}`);
  else ok(`rag_embedding_runs deleted`);

  // ── 7. rag_embeddings ────────────────────────────────────────────────────────
  const { error: emErr } = await supabase.from('rag_embeddings').delete().eq('document_id', docId);
  if (emErr) warn(`rag_embeddings delete error: ${emErr.message}`);
  else ok(`rag_embeddings deleted (${embedCount ?? 0})`);

  // ── 8. rag_sections ──────────────────────────────────────────────────────────
  const { error: secErr } = await supabase.from('rag_sections').delete().eq('document_id', docId);
  if (secErr) warn(`rag_sections delete error: ${secErr.message}`);
  else ok(`rag_sections deleted (${sectionCount ?? 0})`);

  // ── 9. rag_documents ─────────────────────────────────────────────────────────
  const { error: docErr } = await supabase.from('rag_documents').delete().eq('id', docId);
  if (docErr) {
    warn(`rag_documents delete FAILED: ${docErr.message}`);
    return;
  }
  ok(`rag_documents row deleted`);

  // ── 10. Decrement workbase document_count ────────────────────────────────────
  if (docMeta.workbase_id) {
    const { error: wbErr } = await pool.query(
      `UPDATE workbases SET document_count = GREATEST(0, document_count - 1), updated_at = now() WHERE id = $1`,
      [docMeta.workbase_id]
    );
    if (wbErr) warn(`workbases.document_count decrement failed: ${wbErr.message}`);
    else ok(`workbases.document_count decremented`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    log(dryRun ? '\n🔍 DRY RUN — no changes will be made\n' : '\n🗑️  LIVE RUN — deleting records\n');

    let docs;

    if (specificIds) {
      // Fetch specific docs by ID
      const { data, error } = await supabase
        .from('rag_documents')
        .select('id, file_name, status, created_at, workbase_id, file_path, storage_bucket')
        .in('id', specificIds);
      if (error) throw error;
      docs = data;
      const found = docs.map(d => d.id);
      const missing = specificIds.filter(id => !found.includes(id));
      if (missing.length) warn(`IDs not found: ${missing.join(', ')}`);
    } else {
      // Fetch last N by created_at DESC, with optional offset (--skip)
      const { data, error } = await supabase
        .from('rag_documents')
        .select('id, file_name, status, created_at, workbase_id, file_path, storage_bucket')
        .order('created_at', { ascending: false })
        .range(offset, offset + count - 1);
      if (error) throw error;
      docs = data;
    }

    if (!docs || docs.length === 0) {
      log('No RAG documents found to delete.');
      process.exit(0);
    }

    log(`Found ${docs.length} document(s) to delete:\n`);
    docs.forEach((d, i) => {
      log(`  ${i + 1}. [${d.status}] ${d.file_name}`);
      log(`     ID: ${d.id}`);
      log(`     Created: ${new Date(d.created_at).toUTCString()}`);
    });

    for (const doc of docs) {
      await deleteDocumentById(doc.id, doc);
    }

    log(`\n${'═'.repeat(60)}`);
    if (dryRun) {
      log(`Dry-run complete. ${docs.length} document(s) would have been deleted.`);
      log(`Re-run without --dry-run to execute.`);
    } else {
      log(`Done. ${docs.length} document(s) deleted.`);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
