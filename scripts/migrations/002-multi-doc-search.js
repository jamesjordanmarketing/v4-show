/**
 * Migration 002: Multi-Document Search Support
 *
 * Adds:
 * - knowledge_base_id on rag_embeddings (denormalized for KB-wide search without joins)
 * - tsvector columns on rag_facts and rag_sections for BM25 keyword search
 * - match_rag_embeddings_kb() RPC replaces match_rag_embeddings (supports KB + doc filters)
 * - search_rag_text() RPC for hybrid BM25 keyword search
 *
 * Prerequisites: Migration 001 (enhanced rag_facts) must be run first.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/migrations/002-multi-doc-search.js
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- ================================================
  -- 1. Add knowledge_base_id to rag_embeddings
  -- ================================================
  ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

  -- Backfill knowledge_base_id from documents
  UPDATE rag_embeddings e
  SET knowledge_base_id = d.knowledge_base_id
  FROM rag_documents d
  WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;

  -- ================================================
  -- 2. Full-text search columns (generated tsvectors)
  -- ================================================
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_tsv ON rag_facts USING gin(content_tsv);

  ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS text_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || original_text)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_sections_tsv ON rag_sections USING gin(text_tsv);

  -- ================================================
  -- 3. KB-wide embedding search RPC
  -- ================================================
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL
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
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

  -- ================================================
  -- 4. Hybrid text search RPC (BM25-style keyword search)
  -- ================================================
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
    ORDER BY rank DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
    console.log('Migration 002: Multi-Doc Search Support');
    console.log('========================================');

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
    const embedCheck = await saol.agentIntrospectSchema({
        table: 'rag_embeddings',
        includeColumns: true,
        transport: 'pg'
    });
    const embedCols = embedCheck.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('\nVerification:');
    console.log('  rag_embeddings.knowledge_base_id:', embedCols.includes('knowledge_base_id') ? '✓' : '✗');

    const factCheck = await saol.agentIntrospectSchema({
        table: 'rag_facts',
        includeColumns: true,
        transport: 'pg'
    });
    const factCols = factCheck.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('  rag_facts.content_tsv:', factCols.includes('content_tsv') ? '✓' : '✗');

    const sectionCheck = await saol.agentIntrospectSchema({
        table: 'rag_sections',
        includeColumns: true,
        transport: 'pg'
    });
    const sectionCols = sectionCheck.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('  rag_sections.text_tsv:', sectionCols.includes('text_tsv') ? '✓' : '✗');
})();
