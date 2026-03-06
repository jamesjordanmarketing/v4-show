/**
 * Re-trigger processRAGDocument for Sun Bank document (77115c6f).
 * Run AFTER migration 005 is confirmed working.
 *
 * The Sun Bank document has sections and facts stored but zero embeddings.
 * The generate-embeddings step calls deleteDocumentEmbeddings first, so re-triggering is safe.
 *
 * Optionally uncomment the cleanup block below to delete existing sections/facts/embeddings
 * before re-triggering (avoids duplicates if the full pipeline re-runs).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { Inngest } = require('inngest');
const { createClient } = require('@supabase/supabase-js');

const DOCUMENT_ID = '77115c6f-b987-4784-985a-afb4c45d02b6';
const USER_ID     = '8d26cc10-a3c1-4927-8708-667d37a3348b';

const inngest = new Inngest({
  id: 'brighthub-rag-frontier',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Optional cleanup: delete existing data to avoid duplicates on full re-run.
  // Uncomment if you want a clean slate before re-triggering.
  //
  // console.log('Cleaning up existing sections, facts, and embeddings...');
  // await supabase.from('rag_embeddings').delete().eq('document_id', DOCUMENT_ID);
  // await supabase.from('rag_facts').delete().eq('document_id', DOCUMENT_ID);
  // await supabase.from('rag_sections').delete().eq('document_id', DOCUMENT_ID);
  // console.log('Cleanup complete.');

  // Verify current embedding count before triggering
  const { count: currentEmbeds } = await supabase
    .from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', DOCUMENT_ID);
  console.log(`Current embeddings for Sun Bank: ${currentEmbeds}`);

  console.log('Re-triggering processRAGDocument for Sun Bank:', DOCUMENT_ID);
  await inngest.send({
    name: 'rag/document.uploaded',
    data: { documentId: DOCUMENT_ID, userId: USER_ID },
  });

  console.log('✅ Event sent. Monitor Inngest dashboard for process-rag-document function execution.');
  console.log('   Expected: 29 sections already stored; generate-embeddings step will run.');
  console.log('   Expected result: ~1298 embeddings generated for Sun Bank document.');
})();
