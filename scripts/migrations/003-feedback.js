/**
 * Migration 003: Query Feedback Support
 *
 * Adds user_feedback and feedback_at columns to rag_queries
 * for thumbs up/down tracking.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/migrations/003-feedback.js
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- Add feedback columns to rag_queries
  ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS user_feedback TEXT;
  -- Values: 'positive', 'negative', null
  ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

  -- Index for dashboard queries
  CREATE INDEX IF NOT EXISTS idx_rag_queries_feedback
    ON rag_queries (user_feedback)
    WHERE user_feedback IS NOT NULL;
`;

(async () => {
    console.log('Migration 003: Query Feedback Support');
    console.log('=====================================');

    // Dry run first
    const dryRun = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        dryRun: true,
        transaction: true,
        transport: 'pg'
    });

    console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL');
    if (!dryRun.success) {
        console.error('Dry-run failed:', dryRun.summary);
        process.exit(1);
    }

    // Execute
    const result = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        dryRun: false,
        transaction: true,
        transport: 'pg'
    });

    console.log('Migration:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('Summary:', result.summary);

    // Verify
    const check = await saol.agentIntrospectSchema({
        table: 'rag_queries',
        includeColumns: true,
        transport: 'pg'
    });
    const cols = check.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('\nVerification:');
    console.log('  user_feedback:', cols.includes('user_feedback') ? '✓' : '✗');
    console.log('  feedback_at:', cols.includes('feedback_at') ? '✓' : '✗');
})();
