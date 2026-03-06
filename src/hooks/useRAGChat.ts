/**
 * RAG Chat Hooks
 * 
 * React Query hooks for RAG query and chat operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGQuery, RAGQueryMode, RAGDeployedModel } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragChatKeys = {
  all: ['rag-chat'] as const,
  history: (documentId?: string, workbaseId?: string) =>
    [...ragChatKeys.all, 'history', { documentId, workbaseId }] as const,
};

// ============================================
// Fetch Functions
// ============================================

async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  workbaseId?: string;
  mode?: RAGQueryMode;
  modelJobId?: string;
}): Promise<RAGQuery> {
  const res = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to query RAG');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Query failed');
  return json.data;
}

async function fetchQueryHistory(params: {
  documentId?: string;
  workbaseId?: string;
  limit?: number;
}): Promise<RAGQuery[]> {
  const searchParams = new URLSearchParams();
  if (params.documentId) searchParams.set('documentId', params.documentId);
  if (params.workbaseId) searchParams.set('workbaseId', params.workbaseId);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(`/api/rag/query?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch query history');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch history');
  return json.data;
}

// ============================================
// Deployed Models Fetch
// ============================================

async function fetchDeployedModels(): Promise<RAGDeployedModel[]> {
  const res = await fetch('/api/rag/models');
  if (!res.ok) throw new Error('Failed to fetch deployed models');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch models');
  return json.data;
}

// ============================================
// Hooks
// ============================================

export function useRAGQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: queryRAG,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ragChatKeys.history(data.documentId || undefined, data.workbaseId || undefined)
      });
    },
  });
}

export function useRAGQueryHistory(documentId?: string, workbaseId?: string) {
  return useQuery({
    queryKey: ragChatKeys.history(documentId, workbaseId),
    queryFn: () => fetchQueryHistory({ documentId, workbaseId }),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!(documentId || workbaseId),
  });
}

// ============================================
// Deployed Models Hook (for LoRA model selector)
// ============================================

export function useDeployedModels() {
  return useQuery({
    queryKey: ['rag-deployed-models'],
    queryFn: fetchDeployedModels,
    staleTime: 30 * 1000, // 30 seconds — models don't change frequently
  });
}
