/**
 * RAG Quality Hooks
 * 
 * React Query hooks for quality evaluation operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGQualityScore } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragQualityKeys = {
  all: ['rag-quality'] as const,
  scores: (documentId?: string) => [...ragQualityKeys.all, 'scores', documentId] as const,
  summary: (documentId: string) => [...ragQualityKeys.all, 'summary', documentId] as const,
};

// ============================================
// Types
// ============================================

interface QualitySummary {
  averageComposite: number;
  queryCount: number;
  breakdown: Record<string, number>;
}

// ============================================
// Fetch Functions
// ============================================

async function fetchQualityScores(documentId?: string): Promise<RAGQualityScore[]> {
  const url = documentId ? `/api/rag/quality?documentId=${documentId}` : '/api/rag/quality';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch quality scores');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch quality scores');
  return json.data;
}

async function fetchQualitySummary(documentId: string): Promise<QualitySummary> {
  const res = await fetch(`/api/rag/quality?documentId=${documentId}&summary=true`);
  if (!res.ok) throw new Error('Failed to fetch quality summary');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch quality summary');
  return json.data;
}

async function evaluateQuery(queryId: string): Promise<RAGQualityScore> {
  const res = await fetch('/api/rag/quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryId }),
  });
  if (!res.ok) throw new Error('Failed to evaluate query');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Evaluation failed');
  return json.data;
}

// ============================================
// Hooks
// ============================================

export function useRAGQualityScores(documentId?: string) {
  return useQuery({
    queryKey: ragQualityKeys.scores(documentId),
    queryFn: () => fetchQualityScores(documentId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRAGQualitySummary(documentId: string) {
  return useQuery({
    queryKey: ragQualityKeys.summary(documentId),
    queryFn: () => fetchQualitySummary(documentId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!documentId,
  });
}

export function useEvaluateQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: evaluateQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragQualityKeys.all });
    },
  });
}
