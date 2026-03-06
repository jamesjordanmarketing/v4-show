require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const saol = require('../../supa-agent-ops');

const MIGRATION_SQL = `
  -- ============================================================
  -- Fix match_rag_embeddings_kb: e.knowledge_base_id -> e.workbase_id
  -- ============================================================
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
      AND (filter_knowledge_base_id IS NULL OR e.workbase_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
      AND (filter_run_id IS NULL OR e.run_id = filter_run_id)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

  -- ============================================================
  -- Fix search_rag_text: d.knowledge_base_id -> d.workbase_id (two occurrences)
  -- ============================================================
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
          SELECT d.id FROM rag_documents d WHERE d.workbase_id = filter_knowledge_base_id
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
          SELECT d.id FROM rag_documents d WHERE d.workbase_id = filter_knowledge_base_id
        ))
    )
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
  console.log('Migration 005: Fix knowledge_base_id -> workbase_id in stored functions');
  console.log('=======================================================================');

  // Dry run
  const dry = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg',
  });
  console.log('Dry-run:', dry.success ? '✓ PASS' : '✗ FAIL', dry.summary || '');
  if (!dry.success) { console.error('Dry-run failed — aborting.', dry); process.exit(1); }

  // Execute
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg',
  });
  console.log('Migration:', result.success ? '✅ SUCCESS' : '❌ FAILED', result.summary || '');
  if (!result.success) { console.error(result); process.exit(1); }

  console.log('\nVerification: Upload a new test document to confirm ingestion pipeline works.');
  console.log('Expected: rag_sections INSERT no longer throws knowledge_base_id schema error.');
})();
