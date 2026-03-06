// File: scripts/migrations/001-enhanced-rag-facts.js
// Execute from: v4-show//supa-agent-ops/

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- Add provenance columns to rag_facts
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS policy_id TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS rule_id TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS parent_fact_id UUID REFERENCES rag_facts(id);
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS subsection TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS fact_category TEXT;

  -- Drop old fact_type constraint if it exists
  ALTER TABLE rag_facts DROP CONSTRAINT IF EXISTS rag_facts_fact_type_check;

  -- Add updated fact_type constraint with all 14 types
  ALTER TABLE rag_facts ADD CONSTRAINT rag_facts_fact_type_check
    CHECK (fact_type IN (
      'fact', 'entity', 'definition', 'relationship',
      'table_row', 'policy_exception', 'policy_rule',
      'limit', 'threshold', 'required_document',
      'escalation_path', 'audit_field', 'cross_reference',
      'narrative_fact'
    ));

  -- Indexes for provenance-based retrieval
  CREATE INDEX IF NOT EXISTS idx_rag_facts_policy_id
    ON rag_facts(policy_id) WHERE policy_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_category
    ON rag_facts(fact_category) WHERE fact_category IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_parent
    ON rag_facts(parent_fact_id) WHERE parent_fact_id IS NOT NULL;

  -- Document fingerprint for duplicate detection
  ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
  CREATE INDEX IF NOT EXISTS idx_rag_documents_hash
    ON rag_documents(content_hash) WHERE content_hash IS NOT NULL;

  -- Document type classification (set during Pass 1)
  ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
`;

(async () => {
  // Step 1: Dry-run validation
  console.log('Running dry-run validation...');
  const dryRun = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run result:', dryRun.success ? 'PASS' : 'FAIL');
  if (!dryRun.success) {
    console.error('Validation failed:', dryRun.summary);
    process.exit(1);
  }

  // Step 2: Execute migration
  console.log('Executing migration...');
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration result:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', result.summary);

  // Step 3: Verify columns were added
  const verify = await saol.agentIntrospectSchema({
    table: 'rag_facts',
    includeColumns: true,
    includeIndexes: true,
    transport: 'pg'
  });

  const columnNames = verify.tables[0]?.columns.map(c => c.name) || [];
  const requiredColumns = ['policy_id', 'rule_id', 'parent_fact_id', 'subsection', 'fact_category'];
  const missing = requiredColumns.filter(c => !columnNames.includes(c));

  if (missing.length > 0) {
    console.error('MISSING COLUMNS:', missing);
    process.exit(1);
  }

  console.log('All columns verified. Migration complete.');

  // Step 4: Verify rag_documents columns
  const verifyDocs = await saol.agentIntrospectSchema({
    table: 'rag_documents',
    includeColumns: true,
    transport: 'pg'
  });

  const docCols = verifyDocs.tables[0]?.columns.map(c => c.name) || [];
  console.log('Has content_hash:', docCols.includes('content_hash'));
  console.log('Has document_type:', docCols.includes('document_type'));
})();
