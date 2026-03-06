import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { mapRowToQualityScore, mapRowToQuery } from './rag-db-mappers';
import type { RAGQualityScore, RAGQuery, QualityEvaluation } from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Quality Service
// ============================================
// Claude-as-Judge evaluation for RAG query quality.
// Composite RAG Quality Score:
//   0.30 × Faithfulness
//   0.25 × Answer Relevance
//   0.20 × Context Relevance
//   0.15 × Answer Completeness
//   0.10 × Citation Accuracy
// Pattern Source: src/lib/services/evaluation-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Evaluate a Single Query
// ============================================

export async function evaluateQueryQuality(params: {
  queryId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGQualityScore; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    // Fetch the query
    const { data: queryRow, error: queryError } = await supabase
      .from('rag_queries')
      .select('*')
      .eq('id', params.queryId)
      .single();

    if (queryError || !queryRow) {
      return { success: false, error: 'Query not found' };
    }

    const query = mapRowToQuery(queryRow);
    const provider = getLLMProvider();

    console.log(`[RAG Quality] Evaluating query ${params.queryId}...`);

    // Use the provider's evaluateQuality method
    let evaluation: QualityEvaluation;
    try {
      evaluation = await provider.evaluateQuality({
        queryText: query.queryText,
        retrievedContext: query.assembledContext || '',
        responseText: query.responseText,
        citations: query.citations || [],
      });
    } catch (evalError) {
      console.warn('[RAG Quality] Evaluation failed, using defaults:', evalError);
      // Fallback to moderate scores if evaluation fails
      evaluation = {
        faithfulness: 0.5,
        answerRelevance: 0.5,
        contextRelevance: 0.5,
        answerCompleteness: 0.5,
        citationAccuracy: 0.5,
        composite: 0.5,
        details: { error: 'Evaluation failed', reason: String(evalError) },
      };
    }

    // Store the quality score
    const { data: scoreRow, error: insertError } = await supabase
      .from('rag_quality_scores')
      .insert({
        query_id: params.queryId,
        user_id: params.userId,
        faithfulness_score: evaluation.faithfulness,
        answer_relevance_score: evaluation.answerRelevance,
        context_relevance_score: evaluation.contextRelevance,
        answer_completeness_score: evaluation.answerCompleteness,
        citation_accuracy_score: evaluation.citationAccuracy,
        composite_score: Math.round(evaluation.composite * 1000) / 1000,
        evaluation_model: RAG_CONFIG.llm.evaluationModel,
        evaluation_details: evaluation.details,
        evaluated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[RAG Quality] Error storing score:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[RAG Quality] Score: ${evaluation.composite.toFixed(3)} (f:${evaluation.faithfulness.toFixed(2)} ar:${evaluation.answerRelevance.toFixed(2)} cr:${evaluation.contextRelevance.toFixed(2)} c:${evaluation.answerCompleteness.toFixed(2)} ca:${evaluation.citationAccuracy.toFixed(2)})`);

    return { success: true, data: mapRowToQualityScore(scoreRow) };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Quality evaluation failed' };
  }
}

// ============================================
// Get Quality Scores for Document
// ============================================

export async function getQualityScores(params: {
  documentId?: string;
  userId: string;
  limit?: number;
}): Promise<{ success: boolean; data?: RAGQualityScore[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    let query = supabase
      .from('rag_quality_scores')
      .select('*, rag_queries!inner(document_id)')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.documentId) {
      query = query.eq('rag_queries.document_id', params.documentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RAG Quality] Error fetching scores:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQualityScore) };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch quality scores' };
  }
}

// ============================================
// Get Average Quality for Document
// ============================================

export async function getAverageQuality(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; data?: { averageComposite: number; queryCount: number; breakdown: Record<string, number> }; error?: string }> {
  try {
    const result = await getQualityScores({ documentId: params.documentId, userId: params.userId, limit: 100 });
    if (!result.success || !result.data || result.data.length === 0) {
      return { success: true, data: { averageComposite: 0, queryCount: 0, breakdown: {} } };
    }

    const scores = result.data;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      success: true,
      data: {
        averageComposite: Math.round(avg(scores.map(s => s.compositeScore)) * 1000) / 1000,
        queryCount: scores.length,
        breakdown: {
          faithfulness: Math.round(avg(scores.map(s => s.faithfulnessScore)) * 1000) / 1000,
          answerRelevance: Math.round(avg(scores.map(s => s.answerRelevanceScore)) * 1000) / 1000,
          contextRelevance: Math.round(avg(scores.map(s => s.contextRelevanceScore)) * 1000) / 1000,
          answerCompleteness: Math.round(avg(scores.map(s => s.answerCompletenessScore)) * 1000) / 1000,
          citationAccuracy: Math.round(avg(scores.map(s => s.citationAccuracyScore)) * 1000) / 1000,
        },
      },
    };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to get average quality' };
  }
}
