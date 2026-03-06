-- Fix Bug #8: Create/Replace match_rag_embeddings function
-- The function was either missing or had wrong signature (jsonb vs vector)
--
-- This function uses pgvector's native vector type and cosine distance operator (<=>)
-- which is much more efficient than manual JSONB array calculations

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
