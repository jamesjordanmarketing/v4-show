/**
 * RAG Module Full Cleanup Script
 *
 * Purges ALL RAG data: run data, containers, and uploaded storage files.
 * Run this to get a completely clean slate before a fresh test cycle.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/rag-cleanup.js
 *
 * What gets deleted (FK-safe order, leaf → root):
 *   1. rag_quality_scores   — FK → rag_queries
 *   2. rag_queries          — FK → rag_knowledge_bases, rag_documents
 *   3. rag_test_reports     — no formal FK
 *   4. rag_embedding_runs   — no formal FK
 *   5. rag_embeddings       — FK → rag_documents
 *   6. rag_expert_questions — FK → rag_documents
 *   7. rag_facts            — FK → rag_documents, rag_sections
 *   8. rag_sections         — FK → rag_documents
 *   9. rag_documents        — FK → rag_knowledge_bases
 *  10. rag_knowledge_bases  — root container
 *  11. rag-documents bucket — all uploaded PDF/DOCX files
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const saol = require('../supa-agent-ops/dist/index.js');

(async () => {
  console.log('=== RAG Module Full Cleanup ===\n');

  // Tables to delete in FK-safe order (leaf → root)
  const tablesToDelete = [
    'rag_quality_scores',    // 1 — FK → rag_queries
    'rag_queries',           // 2 — FK → rag_knowledge_bases, rag_documents
    'rag_test_reports',      // 3 — no formal FK
    'rag_embedding_runs',    // 4 — no formal FK
    'rag_embeddings',        // 5 — FK → rag_documents
    'rag_expert_questions',  // 6 — FK → rag_documents
    'rag_facts',             // 7 — FK → rag_documents, rag_sections
    'rag_sections',          // 8 — FK → rag_documents
    'rag_documents',         // 9 — FK → rag_knowledge_bases
    'rag_knowledge_bases',   // 10 — root table
  ];

  console.log('--- Deleting database records ---');
  for (const table of tablesToDelete) {
    try {
      const result = await saol.agentExecuteSQL({
        sql: `DELETE FROM ${table};`,
        transaction: true,
        transport: 'pg',
      });
      const status = result.success ? '✓ cleared' : '✗ FAILED';
      const detail = result.success ? '' : ` — ${result.error || result.message || ''}`;
      console.log(`  ${table}: ${status}${detail}`);
    } catch (err) {
      console.log(`  ${table}: ✗ EXCEPTION — ${err.message}`);
    }
  }

  // Step 11: Clear storage bucket
  console.log('\n--- Clearing rag-documents storage bucket ---');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: topLevel, error: listError } = await supabase.storage
      .from('rag-documents')
      .list('', { limit: 1000 });

    if (listError) {
      console.log(`  rag-documents bucket: ✗ LIST FAILED — ${listError.message}`);
    } else if (!topLevel || topLevel.length === 0) {
      console.log('  rag-documents bucket: ✓ already empty');
    } else {
      for (const item of topLevel) {
        if (item.id === null) {
          // It's a folder (user_id prefix) — list its contents and delete recursively
          const { data: subItems } = await supabase.storage
            .from('rag-documents')
            .list(item.name, { limit: 1000 });

          if (subItems && subItems.length > 0) {
            // Handle one more level of nesting (user_id/doc_id/filename)
            for (const subItem of subItems) {
              if (subItem.id === null) {
                // Another folder level (doc_id prefix)
                const { data: deepItems } = await supabase.storage
                  .from('rag-documents')
                  .list(`${item.name}/${subItem.name}`, { limit: 1000 });

                if (deepItems && deepItems.length > 0) {
                  const paths = deepItems.map(f => `${item.name}/${subItem.name}/${f.name}`);
                  const { error: delError } = await supabase.storage
                    .from('rag-documents')
                    .remove(paths);
                  console.log(`  ${item.name}/${subItem.name}/: ${delError ? `✗ FAILED — ${delError.message}` : `✓ ${paths.length} file(s) removed`}`);
                }
              } else {
                // File directly in user_id folder
                const path = `${item.name}/${subItem.name}`;
                const { error: delError } = await supabase.storage
                  .from('rag-documents')
                  .remove([path]);
                console.log(`  ${path}: ${delError ? `✗ FAILED — ${delError.message}` : '✓ removed'}`);
              }
            }
          } else {
            console.log(`  ${item.name}/: ✓ already empty`);
          }
        } else {
          // File at root level
          const { error: delError } = await supabase.storage
            .from('rag-documents')
            .remove([item.name]);
          console.log(`  ${item.name}: ${delError ? `✗ FAILED — ${delError.message}` : '✓ removed'}`);
        }
      }
    }
  } catch (storageErr) {
    console.log(`  rag-documents bucket: ✗ ERROR — ${storageErr.message}`);
    console.log('  Manual cleanup may be needed via Supabase Storage dashboard.');
  }

  // Verification: all tables should be empty
  console.log('\n--- Verification ---');
  for (const table of tablesToDelete) {
    try {
      const result = await saol.agentQuery({ table, select: 'id', limit: 1 });
      const isEmpty = result.success && result.data && result.data.length === 0;
      console.log(`  ${table}: ${isEmpty ? '✓ empty' : '✗ NOT EMPTY — CHECK MANUALLY'}`);
    } catch (err) {
      console.log(`  ${table}: ✗ VERIFICATION ERROR — ${err.message}`);
    }
  }

  console.log('\n=== Cleanup Complete ===');
  console.log('Next step: Re-create a Knowledge Base, upload your document, and run ingestion.');
  process.exit(0);
})();
