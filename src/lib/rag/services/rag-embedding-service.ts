import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { OpenAIEmbeddingProvider } from '@/lib/rag/providers';
import type { EmbeddingProvider } from '@/lib/rag/providers/embedding-provider';
import type { RAGEmbeddingSourceType, RAGEmbeddingTier, RAGFact } from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Embedding Service
// ============================================
// Handles embedding generation, storage, and similarity search.
// Pattern Source: src/lib/services/pipeline-service.ts

let embeddingProvider: EmbeddingProvider | null = null;

function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = new OpenAIEmbeddingProvider();
  }
  return embeddingProvider;
}

// ============================================
// Generate and Store Embeddings
// ============================================

export async function generateAndStoreEmbedding(params: {
  documentId: string;
  userId: string;
  sourceType: RAGEmbeddingSourceType;
  sourceId: string;
  contentText: string;
  tier: RAGEmbeddingTier;
  runId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; embeddingId?: string; error?: string }> {
  try {
    const { documentId, userId, sourceType, sourceId, contentText, tier, metadata } = params;
    const provider = getEmbeddingProvider();

    // Generate embedding vector
    const embedding = await provider.embed(contentText);

    // Store in database (embedding stored as jsonb array)
    const supabase = createServerSupabaseAdminClient();

    // Lookup workbase_id from document
    const { data: docRow } = await supabase
      .from('rag_documents')
      .select('workbase_id')
      .eq('id', documentId)
      .single();

    const { data, error } = await supabase
      .from('rag_embeddings')
      .insert({
        document_id: documentId,
        user_id: userId,
        workbase_id: docRow?.workbase_id || null,
        source_type: sourceType,
        source_id: sourceId,
        content_text: contentText,
        embedding: embedding, // Stored as jsonb array
        embedding_model: provider.getModelName(),
        tier,
        metadata: metadata || {},
        run_id: params.runId || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing embedding:', error);
      return { success: false, error: error.message };
    }

    return { success: true, embeddingId: data.id };
  } catch (err) {
    console.error('Exception generating embedding:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate embedding' };
  }
}

export async function generateAndStoreBatchEmbeddings(params: {
  documentId: string;
  userId: string;
  workbaseId?: string;  // Denormalized for KB-wide search
  runId?: string;
  items: Array<{
    sourceType: RAGEmbeddingSourceType;
    sourceId: string;
    contentText: string;
    tier: RAGEmbeddingTier;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { documentId, userId, items } = params;
    if (items.length === 0) return { success: true, count: 0 };

    const provider = getEmbeddingProvider();

    // Generate all embeddings in batch
    const texts = items.map(item => item.contentText);
    const embeddings = await provider.embedBatch(texts);

    // Prepare insert records
    const records = items.map((item, i) => ({
      document_id: documentId,
      user_id: userId,
      workbase_id: params.workbaseId || null,
      run_id: params.runId || null,
      source_type: item.sourceType,
      source_id: item.sourceId,
      content_text: item.contentText,
      embedding: embeddings[i], // Stored as jsonb array
      embedding_model: provider.getModelName(),
      tier: item.tier,
      metadata: item.metadata || {},
    }));

    // Store in database
    const supabase = createServerSupabaseAdminClient();
    const { error } = await supabase
      .from('rag_embeddings')
      .insert(records);

    if (error) {
      console.error('Error storing batch embeddings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: records.length };
  } catch (err) {
    console.error('Exception in batch embedding:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate batch embeddings' };
  }
}

// ============================================
// Similarity Search
// ============================================

export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  workbaseId?: string;  // For KB-wide search
  tier?: RAGEmbeddingTier;
  runId?: string;
  limit?: number;
  threshold?: number;
}): Promise<{ success: boolean; data?: Array<{ id: string; sourceType: string; sourceId: string; contentText: string; similarity: number; tier: number }>; error?: string }> {
  try {
    const { queryText, documentId, workbaseId, tier, limit = 10, threshold = RAG_CONFIG.retrieval.similarityThreshold } = params;
    const provider = getEmbeddingProvider();

    // Generate query embedding
    const queryEmbedding = await provider.embed(queryText);

    // Build the similarity search query using pgvector's cosine distance operator
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_knowledge_base_id: workbaseId || null,
      filter_document_id: documentId || null,
      filter_tier: tier || null,
      filter_run_id: params.runId || null,
    });

    if (error) {
      console.error('Error in similarity search:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((row: any) => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        contentText: row.content_text,
        similarity: row.similarity,
        tier: row.tier,
      })),
    };
  } catch (err) {
    console.error('Exception in similarity search:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to search embeddings' };
  }
}

// ============================================
// Hybrid Text Search (Phase 2)
// ============================================

/**
 * Search facts and sections by BM25 keyword matching (tsvector).
 * Used as the "text" leg of hybrid search — merged with vector results in retrieveContext().
 *
 * When runId is provided, restricts results to facts that have embeddings tagged with
 * that run, matching the vector-search leg's run isolation.
 */
export async function searchTextContent(params: {
  queryText: string;
  workbaseId?: string;
  documentId?: string;
  runId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: Array<{
    sourceType: string;
    sourceId: string;
    documentId: string;
    content: string;
    rank: number;
  }>;
  error?: string;
}> {
  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase.rpc('search_rag_text', {
    search_query: params.queryText,
    filter_knowledge_base_id: params.workbaseId || null,
    filter_document_id: params.documentId || null,
    filter_run_id: params.runId || null,
    match_count: params.limit || 10,
  });

  if (error) {
    console.error('[RAG Embedding] Error in text search:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data || []).map((row: any) => ({
      sourceType: row.source_type,
      sourceId: row.source_id,
      documentId: row.document_id,
      content: row.content,
      rank: row.rank,
    })),
  };
}

// ============================================
// Delete Embeddings for Document
// ============================================

export async function deleteDocumentEmbeddings(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { error } = await supabase
      .from('rag_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      console.error('Error deleting embeddings:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Exception deleting embeddings:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete embeddings' };
  }
}

// ============================================
// Enriched Embedding Text Builder (Phase 1)
// ============================================

/**
 * Build enriched embedding text for a fact by prepending provenance context.
 * This improves vector search precision by encoding policy/section/category context
 * into the embedding itself.
 *
 * Examples:
 *   "[Policy: BC-PROD-004] [Section: Jumbo Mortgage] [Category: rule] R4: DTI capped at 43%"
 *   "[Policy: BC-PROD-004] [Qualifies: R4] E1: High Liquidity Offset: DTI expanded to 45%"
 *   "[Category: limit] Max FDIC Coverage: $100,000,000 via sweep network"
 */
export function buildEnrichedEmbeddingText(fact: RAGFact): string {
  const parts: string[] = [];

  if (fact.policyId) {
    parts.push(`[Policy: ${fact.policyId}]`);
  }
  if (fact.subsection) {
    parts.push(`[Section: ${fact.subsection}]`);
  }
  if (fact.factCategory) {
    parts.push(`[Category: ${fact.factCategory}]`);
  }

  // For exceptions, include the qualifying rule context
  if (fact.factType === 'policy_exception' && fact.parentFactId) {
    const qualifies = (fact.metadata as any)?.qualifiesRule;
    if (qualifies) {
      parts.push(`[Qualifies: ${qualifies}]`);
    }
  }

  parts.push(fact.content);
  return parts.join(' ');
}
