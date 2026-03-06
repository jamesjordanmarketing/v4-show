#!/usr/bin/env node

/**
 * Fix Bug #8: Create/Replace match_rag_embeddings PostgreSQL function
 * 
 * The function either doesn't exist or has the wrong signature.
 * This script creates the correct function using pgvector's vector type.
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
-- Drop the old function if it exists (any signature)
DROP FUNCTION IF EXISTS match_rag_embeddings(jsonb, float, int, uuid, int);
DROP FUNCTION IF EXISTS match_rag_embeddings(vector, float, int, uuid, int);

-- Create the correct function using pgvector
CREATE OR REPLACE FUNCTION match_rag_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_document_id uuid DEFAULT NULL,
  filter_tier int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content_text text,
  tier int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.source_type,
    re.source_id,
    re.content_text,
    re.tier,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM rag_embeddings re
  WHERE
    (filter_document_id IS NULL OR re.document_id = filter_document_id)
    AND (filter_tier IS NULL OR re.tier = filter_tier)
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_rag_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION match_rag_embeddings TO service_role;
GRANT EXECUTE ON FUNCTION match_rag_embeddings TO anon;

COMMENT ON FUNCTION match_rag_embeddings IS 'Vector similarity search using pgvector cosine distance for RAG embeddings';
`;

async function fixFunction() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected');

    console.log('\nExecuting SQL to fix match_rag_embeddings function...');
    await client.query(sql);
    console.log('✓ Function created/updated successfully');

    console.log('\nVerifying function exists...');
    const result = await client.query(`
      SELECT proname, pronargs, pg_get_function_arguments(oid) as args
      FROM pg_proc
      WHERE proname = 'match_rag_embeddings'
    `);

    if (result.rows.length > 0) {
      console.log('✓ Function verified:');
      result.rows.forEach(row => {
        console.log(`  - ${row.proname}(${row.args})`);
      });
    } else {
      console.error('✗ Function not found after creation');
    }

    console.log('\nDone! The match_rag_embeddings function is now fixed.');
    console.log('RAG chat queries should now work.');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixFunction();
