/**
 * RAG Documents Hooks
 * 
 * React Query hooks for document management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGDocument, RAGSection, RAGFact } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragDocumentKeys = {
  all: ['rag-documents'] as const,
  list: (workbaseId: string) => [...ragDocumentKeys.all, 'list', workbaseId] as const,
  detail: (id: string) => [...ragDocumentKeys.all, 'detail', id] as const,
};

// ============================================
// Types
// ============================================

interface DocumentDetail {
  document: RAGDocument;
  sections: RAGSection[];
  facts: RAGFact[];
}

// ============================================
// Fetch Functions
// ============================================

async function fetchDocuments(workbaseId: string): Promise<RAGDocument[]> {
  const res = await fetch(`/api/rag/documents?workbaseId=${workbaseId}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch documents');
  return json.data;
}

async function fetchDocumentDetail(id: string): Promise<DocumentDetail> {
  const res = await fetch(`/api/rag/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch document');
  return json.data;
}

async function createDocument(data: {
  workbaseId: string;
  fileName: string;
  fileType: string;
  description?: string;
  fastMode?: boolean;
}): Promise<RAGDocument> {
  const res = await fetch('/api/rag/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create document');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to create document');
  return json.data;
}

async function uploadDocumentFile(params: { documentId: string; file: File }): Promise<{ documentId: string; filePath: string; status: string }> {
  const formData = new FormData();
  formData.append('file', params.file);

  const res = await fetch(`/api/rag/documents/${params.documentId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to upload file');
  return json.data;
}

async function reprocessDocument(documentId: string): Promise<{ documentId: string; status: string }> {
  const res = await fetch(`/api/rag/documents/${documentId}/process`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to process document');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to process document');
  return json.data;
}

async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`/api/rag/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete document');
}

// ============================================
// Hooks
// ============================================

export function useRAGDocuments(workbaseId: string) {
  return useQuery({
    queryKey: ragDocumentKeys.list(workbaseId),
    queryFn: () => fetchDocuments(workbaseId),
    staleTime: 15 * 1000, // 15 seconds
    enabled: !!workbaseId,
  });
}

export function useRAGDocumentDetail(documentId: string) {
  return useQuery({
    queryKey: ragDocumentKeys.detail(documentId),
    queryFn: () => fetchDocumentDetail(documentId),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!documentId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.list(variables.workbaseId) });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocumentFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.all });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reprocessDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.detail(data.documentId) });
    },
  });
}

export function useDeleteDocument(workbaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.list(workbaseId) });
    },
  });
}
