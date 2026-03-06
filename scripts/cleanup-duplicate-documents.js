/**
 * Cleanup Duplicate Sun Chip Documents
 *
 * The database currently has ~6 duplicate Sun Chip Bank documents.
 * Keep only ceff906e (the one with the most facts: 109).
 * Archives the rest (sets status='archived') and deletes their embeddings.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/cleanup-duplicate-documents.js
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const saol = require(saolDir);

const KEEP_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';

(async () => {
    console.log('Duplicate Document Cleanup');
    console.log('==========================\n');

    // Find all Sun Chip documents
    const result = await saol.agentQuery({
        table: 'rag_documents',
        select: 'id,file_name,status,section_count,fact_count',
        where: [
            { column: 'file_name', operator: 'ilike', value: '%Sun%Chip%' }
        ],
        transport: 'pg',
    });

    if (!result.success || !result.data) {
        console.error('Failed to query documents:', result.error);
        process.exit(1);
    }

    console.log(`Found ${result.data.length} Sun Chip documents:\n`);
    for (const doc of result.data) {
        const isKeep = doc.id === KEEP_DOCUMENT_ID;
        console.log(`  ${isKeep ? '✓ KEEP   ' : '✗ ARCHIVE'} ${doc.id.slice(0, 8)}... | status=${doc.status} | sections=${doc.section_count || 0} | facts=${doc.fact_count || 0} | ${doc.file_name}`);
    }

    // Identify duplicates
    const duplicateIds = result.data
        .filter(d => d.id !== KEEP_DOCUMENT_ID)
        .map(d => d.id);

    if (duplicateIds.length === 0) {
        console.log('\nNo duplicates to archive. All clean!');
        return;
    }

    console.log(`\nArchiving ${duplicateIds.length} duplicate documents...\n`);

    for (const id of duplicateIds) {
        // Archive the document (don't delete — preserves audit trail)
        const archiveResult = await saol.agentExecuteSQL({
            sql: `UPDATE rag_documents SET status = 'archived' WHERE id = '${id}'`,
            transport: 'pg',
            transaction: true,
        });

        if (!archiveResult.success) {
            console.error(`  ✗ Failed to archive ${id.slice(0, 8)}:`, archiveResult.error);
            continue;
        }

        // Delete embeddings for archived documents (saves storage + prevents stale search results)
        const embedResult = await saol.agentExecuteSQL({
            sql: `DELETE FROM rag_embeddings WHERE document_id = '${id}'`,
            transport: 'pg',
            transaction: true,
        });

        const deletedCount = embedResult.rowCount || 0;
        console.log(`  ✓ Archived ${id.slice(0, 8)} — deleted ${deletedCount} embeddings`);
    }

    // Verify final state
    console.log('\n--- Verification ---');
    const verifyResult = await saol.agentQuery({
        table: 'rag_documents',
        select: 'id,status,fact_count',
        where: [
            { column: 'file_name', operator: 'ilike', value: '%Sun%Chip%' }
        ],
        transport: 'pg',
    });

    if (verifyResult.success) {
        const active = verifyResult.data.filter(d => d.status !== 'archived');
        const archived = verifyResult.data.filter(d => d.status === 'archived');
        console.log(`  Active documents: ${active.length}`);
        console.log(`  Archived documents: ${archived.length}`);
        if (active.length === 1 && active[0].id === KEEP_DOCUMENT_ID) {
            console.log('\n✓ Cleanup complete — only the canonical document remains active.');
        } else {
            console.log('\n⚠ Unexpected state — please verify manually.');
        }
    }
})();
