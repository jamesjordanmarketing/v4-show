/**
 * Migration 004: Embedding Runs, Test Reports, and Text Search Fix
 *
 * 1. rag_embedding_runs — tracks each ingestion/embedding run (document_id, timestamp, counts)
 * 2. rag_embeddings.run_id — tags every embedding with its run
 * 3. rag_test_reports — stores golden-set test results for trend analysis
 * 4. search_rag_text — fixes ORDER BY rank DESC bug on UNION ALL
 * 5. match_rag_embeddings_kb — adds filter_run_id parameter
 *
 * Uses SAOL (agentExecuteDDL) as required by project standards.
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- ================================================
  -- 1. Embedding Runs table
  -- ================================================
  CREATE TABLE IF NOT EXISTS rag_embedding_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    embedding_count INT DEFAULT 0,
    embedding_model TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    pipeline_version TEXT DEFAULT 'single-pass',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_rag_embedding_runs_document
    ON rag_embedding_runs(document_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_rag_embedding_runs_status
    ON rag_embedding_runs(status);

  -- Enable RLS
  ALTER TABLE rag_embedding_runs ENABLE ROW LEVEL SECURITY;

  -- Allow authenticated users to read their own runs
  DO $$ BEGIN
    CREATE POLICY "Users can view own embedding runs"
      ON rag_embedding_runs FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    CREATE POLICY "Service role full access embedding runs"
      ON rag_embedding_runs FOR ALL
      USING (true)
      WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  -- ================================================
  -- 2. Add run_id to rag_embeddings
  -- ================================================
  ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS run_id UUID;

  CREATE INDEX IF NOT EXISTS idx_rag_embeddings_run_id
    ON rag_embeddings(run_id);

  -- ================================================
  -- 3. Test Reports table
  -- ================================================
  CREATE TABLE IF NOT EXISTS rag_test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    test_run_id TEXT NOT NULL,
    document_id UUID NOT NULL,
    embedding_run_id UUID,
    pass_rate NUMERIC(5,2) NOT NULL,
    meets_target BOOLEAN NOT NULL,
    total_passed INT NOT NULL,
    total_failed INT NOT NULL,
    total_errored INT NOT NULL,
    avg_response_time_ms INT NOT NULL,
    avg_self_eval_score NUMERIC(5,4) NOT NULL,
    total_duration_ms INT NOT NULL,
    breakdown JSONB NOT NULL,
    preflight JSONB NOT NULL,
    results JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_rag_test_reports_document
    ON rag_test_reports(document_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_rag_test_reports_user
    ON rag_test_reports(user_id, created_at DESC);

  -- Enable RLS
  ALTER TABLE rag_test_reports ENABLE ROW LEVEL SECURITY;

  DO $$ BEGIN
    CREATE POLICY "Users can view own test reports"
      ON rag_test_reports FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  DO $$ BEGIN
    CREATE POLICY "Service role full access test reports"
      ON rag_test_reports FOR ALL
      USING (true)
      WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;

  -- ================================================
  -- 4. Fix search_rag_text ORDER BY clause
  -- ================================================
  -- PostgreSQL does not allow ORDER BY alias on UNION ALL.
  -- rank is the 5th column positionally → ORDER BY 5 DESC.

  CREATE OR REPLACE FUNCTION search_rag_text(
    search_query text,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    source_type text,
    source_id uuid,
    document_id uuid,
    content text,
    rank float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    (
      SELECT 'fact'::text, f.id, f.document_id, f.content,
             ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_facts f
      WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    UNION ALL
    (
      SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
             ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_sections s
      WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;

  -- ================================================
  -- 5. Update match_rag_embeddings_kb to support run_id filter
  -- ================================================
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL,
    filter_run_id uuid DEFAULT NULL
  )
  RETURNS TABLE (
    id uuid,
    document_id uuid,
    source_type text,
    source_id uuid,
    content_text text,
    similarity float,
    tier int,
    metadata jsonb
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
      AND (filter_run_id IS NULL OR e.run_id = filter_run_id)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
    console.log('Migration 004: Embedding Runs, Test Reports, and Text Search Fix');
    console.log('================================================================');

    // Dry run first
    const dryRun = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        dryRun: true,
        transaction: true,
        transport: 'pg'
    });

    console.log('Dry-run:', dryRun.success ? '✓ PASS' : '✗ FAIL');
    if (!dryRun.success) {
        console.error('Dry-run failed:', dryRun.summary);
        process.exit(1);
    }

    // Execute
    const result = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        transaction: true,
        transport: 'pg'
    });

    console.log('Execute:', result.success ? '✓ PASS' : '✗ FAIL');
    console.log('Summary:', result.summary);

    if (!result.success) {
        console.error('Migration failed:', result.error || result.summary);
        process.exit(1);
    }

    // Verify
    console.log('\nVerification:');

    const runsCheck = await saol.agentIntrospectSchema({
        table: 'rag_embedding_runs',
        includeColumns: true,
        transport: 'pg'
    });
    console.log('  rag_embedding_runs:', runsCheck.tables?.[0]?.columns?.length > 0 ? '✓ exists' : '✗ missing');

    const embedCheck = await saol.agentIntrospectSchema({
        table: 'rag_embeddings',
        includeColumns: true,
        transport: 'pg'
    });
    const embedCols = embedCheck.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('  rag_embeddings.run_id:', embedCols.includes('run_id') ? '✓' : '✗');

    const reportsCheck = await saol.agentIntrospectSchema({
        table: 'rag_test_reports',
        includeColumns: true,
        transport: 'pg'
    });
    console.log('  rag_test_reports:', reportsCheck.tables?.[0]?.columns?.length > 0 ? '✓ exists' : '✗ missing');

    console.log('\n✓ Migration 004 complete');
})();
