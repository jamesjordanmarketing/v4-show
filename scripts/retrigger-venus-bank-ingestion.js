/**
 * Re-trigger processRAGDocument for Venus Bank document.
 *
 * Background:
 *   The ingestion started at 2026-03-01 06:02 UTC but the Inngest job
 *   crashed before creating any sections, facts, or embeddings.
 *   The document was manually set to status='error' via SAOL.
 *
 * This script is safe to run because:
 *   - original_text is stored (31,397 chars) — pipeline can run
 *   - 0 sections / 0 facts / 0 embeddings exist — no cleanup needed
 *   - The Inngest function resets status → 'processing' on Step 0
 *
 * Usage:
 *   node scripts/retrigger-venus-bank-ingestion.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { Inngest } = require('inngest');
const { createClient } = require('@supabase/supabase-js');

const DOCUMENT_ID = '714845cf-f241-4e39-9aba-4c3517d408c6';
const USER_ID = '8d26cc10-a3c1-4927-8708-667d37a3348b';

const inngest = new Inngest({
  id: 'brighthub-rag-frontier',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify current state before triggering
  const { data: doc } = await supabase
    .from('rag_documents')
    .select('id, file_name, status, processing_error')
    .eq('id', DOCUMENT_ID)
    .single();

  console.log('Current document state:', doc);

  if (!doc) {
    console.error('❌ Document not found — aborting.');
    process.exit(1);
  }

  if (doc.status === 'processing') {
    console.warn('⚠️  Document is already in "processing" state. A job may already be running.');
    console.warn('   Check the Inngest dashboard before re-triggering to avoid duplicate runs.');
    process.exit(1);
  }

  if (doc.status === 'ready' || doc.status === 'awaiting_questions') {
    console.warn(`⚠️  Document already has status="${doc.status}". Re-triggering will re-process.`);
    console.warn('   Delete existing sections/facts/embeddings first if you want a clean run.');
  }

  // Verify child record counts (should all be 0 for a clean re-trigger)
  const [{ count: sectionCount }, { count: factCount }, { count: embedCount }] = await Promise.all([
    supabase.from('rag_sections').select('*', { count: 'exact', head: true }).eq('document_id', DOCUMENT_ID),
    supabase.from('rag_facts').select('*', { count: 'exact', head: true }).eq('document_id', DOCUMENT_ID),
    supabase.from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', DOCUMENT_ID),
  ]);
  console.log(`Existing records — sections: ${sectionCount}, facts: ${factCount}, embeddings: ${embedCount}`);

  if ((sectionCount ?? 0) > 0 || (factCount ?? 0) > 0 || (embedCount ?? 0) > 0) {
    console.warn('⚠️  Existing child records found. The pipeline will overwrite embeddings but may');
    console.warn('   create duplicate sections/facts. Consider cleaning up first:');
    console.warn(`   supabase.from('rag_embeddings').delete().eq('document_id', '${DOCUMENT_ID}')`);
    console.warn(`   supabase.from('rag_facts').delete().eq('document_id', '${DOCUMENT_ID}')`);
    console.warn(`   supabase.from('rag_sections').delete().eq('document_id', '${DOCUMENT_ID}')`);
  }

  console.log('\nSending rag/document.uploaded event to Inngest...');
  await inngest.send({
    name: 'rag/document.uploaded',
    data: { documentId: DOCUMENT_ID, userId: USER_ID },
  });

  console.log('✅ Event sent.');
  console.log('   Monitor: https://app.inngest.com → Functions → process-rag-document');
  console.log('   Expected: 6 passes → sections → facts → embeddings → status=awaiting_questions');
  console.log(`   Document: Venus-Bank-Community-Financial-Inclusion-Manual_v3.0.md`);
})();
