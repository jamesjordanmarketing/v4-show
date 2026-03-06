/**
 * Expert Q&A Hooks
 * 
 * React Query hooks for expert question and answer operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGExpertQuestion, RAGDocument } from '@/types/rag';
import { ragDocumentKeys } from './useRAGDocuments';

// ============================================
// Query Key Factory
// ============================================

export const expertQAKeys = {
  all: ['rag-expert-qa'] as const,
  questions: (documentId: string) => [...expertQAKeys.all, 'questions', documentId] as const,
  allQuestions: (documentId: string) => [...expertQAKeys.all, 'all-questions', documentId] as const,
};

// ============================================
// Fetch Functions
// ============================================

async function fetchQuestions(documentId: string, includeAnswered = false): Promise<RAGExpertQuestion[]> {
  const url = `/api/rag/documents/${documentId}/questions${includeAnswered ? '?includeAnswered=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch questions');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch questions');
  return json.data;
}

async function submitAnswer(params: {
  documentId: string;
  questionId: string;
  answerText: string;
}): Promise<RAGExpertQuestion> {
  const res = await fetch(`/api/rag/documents/${params.documentId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: params.questionId, answerText: params.answerText }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to submit answer');
  return json.data;
}

async function skipQuestionApi(params: { documentId: string; questionId: string }): Promise<void> {
  const res = await fetch(`/api/rag/documents/${params.documentId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: params.questionId, skip: true }),
  });
  if (!res.ok) throw new Error('Failed to skip question');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to skip question');
}

async function verifyDocument(documentId: string): Promise<RAGDocument> {
  const res = await fetch(`/api/rag/documents/${documentId}/verify`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to verify document');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to verify document');
  return json.data;
}

// ============================================
// Hooks
// ============================================

export function useExpertQuestions(documentId: string, includeAnswered = false) {
  return useQuery({
    queryKey: includeAnswered ? expertQAKeys.allQuestions(documentId) : expertQAKeys.questions(documentId),
    queryFn: () => fetchQuestions(documentId, includeAnswered),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!documentId,
  });
}

export function useSubmitAnswer(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { questionId: string; answerText: string }) =>
      submitAnswer({ documentId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expertQAKeys.questions(documentId) });
      queryClient.invalidateQueries({ queryKey: expertQAKeys.allQuestions(documentId) });
    },
  });
}

export function useSkipQuestion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => skipQuestionApi({ documentId, questionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expertQAKeys.questions(documentId) });
    },
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyDocument,
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.detail(documentId) });
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.all });
    },
  });
}
