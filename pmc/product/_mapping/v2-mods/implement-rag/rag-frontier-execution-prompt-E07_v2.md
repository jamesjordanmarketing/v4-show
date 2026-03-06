# RAG Frontier - Execution Prompt E07: React Hooks

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E07 - React Hooks
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅, E03 (ingestion & embedding) ✅, E04 (expert QA & retrieval) ✅, E05 (quality service & API routes Part 1) ✅, E06 (API routes Part 2) ✅ complete
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E06 complete), verified existing hook patterns from codebase, confirmed QueryClientProvider setup, added exact API route signatures from E06 implementation, noted toast usage pattern from existing hooks

---

## Overview

This prompt creates all React hooks for the RAG Frontier module using TanStack Query (React Query v5) for server state management.

**What This Section Creates:**
1. `src/hooks/useRAGKnowledgeBases.ts` — CRUD hooks for knowledge bases
2. `src/hooks/useRAGDocuments.ts` — Document management hooks (list, upload, process, delete)
3. `src/hooks/useExpertQA.ts` — Expert Q&A hooks (questions, answers, verify)
4. `src/hooks/useRAGChat.ts` — RAG query/chat hooks (query, history)
5. `src/hooks/useRAGQuality.ts` — Quality evaluation hooks (scores, evaluation)

**What This Section Does NOT Change:**
- No database, types, services, or API routes
- No components or pages (E08-E10)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`

### Existing Infrastructure (Confirmed)
- ✅ **React Query Provider**: `ReactQueryProvider` is set up in `src/app/layout.tsx` (line 25)
- ✅ **Toast Notifications**: Sonner toaster available (line 32)
- ✅ **Auth Context**: `AuthProvider` wraps application (line 26)

---

========================


# EXECUTION PROMPT E07: React Hooks

## Your Mission

Create all React hooks for the RAG Frontier module in a Next.js 14 / TypeScript application. These hooks use TanStack Query (React Query v5) to manage server state by calling the API routes created in E05-E06.

---

## Context: Current State

### E06 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**

#### Expert Q&A Routes
- ✅ `src/app/api/rag/documents/[id]/questions/route.ts`
  - **GET**: List questions for a document
    - Query param: `?includeAnswered=true` (optional)
    - Returns: `{ success: boolean; data?: RAGExpertQuestion[]; error?: string }`
  - **POST**: Submit answer or skip question
    - Body: `{ questionId: string; answerText?: string; skip?: boolean }`
    - Returns: `{ success: boolean; data?: RAGExpertQuestion; error?: string }`

- ✅ `src/app/api/rag/documents/[id]/verify/route.ts`
  - **POST**: Mark document as verified after Q&A
    - No body required (uses documentId from URL)
    - Returns: `{ success: boolean; data?: RAGDocument; error?: string }`

#### RAG Query Route
- ✅ `src/app/api/rag/query/route.ts`
  - **POST**: Query the RAG system
    - Body: `{ queryText: string; documentId?: string; knowledgeBaseId?: string; mode?: RAGQueryMode }`
    - Validates: At least one of `documentId` or `knowledgeBaseId` required
    - Defaults: `mode` defaults to `'rag_only'`
    - Valid modes: `'rag_only'`, `'lora_only'`, `'rag_and_lora'`
    - Returns: `{ success: boolean; data?: RAGQuery; error?: string }`
  - **GET**: Get query history
    - Query params: `?documentId=`, `?knowledgeBaseId=`, `?limit=` (default 50, max 100)
    - Returns: `{ success: boolean; data?: RAGQuery[]; error?: string }`

#### Quality Evaluation Route
- ✅ `src/app/api/rag/quality/route.ts`
  - **GET**: Get quality scores or summary
    - Mode 1 (list): `/api/rag/quality?documentId=xxx` (optional filter)
      - Returns: `{ success: boolean; data?: RAGQualityScore[]; error?: string }`
    - Mode 2 (summary): `/api/rag/quality?summary=true&documentId=xxx`
      - Returns: `{ success: boolean; data?: { averageComposite: number; queryCount: number; breakdown: Record<string, number> }; error?: string }`
  - **POST**: Evaluate a query's quality
    - Body: `{ queryId: string }`
    - Returns: `{ success: boolean; data?: RAGQualityScore; error?: string }`

### E05 Completion Status ✅

**API Routes Created:**
- ✅ `src/app/api/rag/knowledge-bases/route.ts`
  - **GET**: List knowledge bases → `{ success: boolean; data?: RAGKnowledgeBase[]; error?: string }`
  - **POST**: Create knowledge base → `{ success: boolean; data?: RAGKnowledgeBase; error?: string }`
    - Body: `{ name: string; description?: string }`

- ✅ `src/app/api/rag/documents/route.ts`
  - **GET**: List documents → `{ success: boolean; data?: RAGDocument[]; error?: string }`
    - Query param: `?knowledgeBaseId=xxx` (required)
  - **POST**: Create document record → `{ success: boolean; data?: RAGDocument; error?: string }`
    - Body: `{ knowledgeBaseId: string; fileName: string; fileType: string; description?: string; fastMode?: boolean }`

- ✅ `src/app/api/rag/documents/[id]/route.ts`
  - **GET**: Get document detail → `{ success: boolean; data?: { document: RAGDocument; sections: RAGSection[]; facts: RAGFact[] }; error?: string }`
  - **DELETE**: Delete document → `{ success: boolean; error?: string }`

- ✅ `src/app/api/rag/documents/[id]/upload/route.ts`
  - **POST**: Upload file (multipart/form-data) → `{ success: boolean; data?: { documentId: string; filePath: string; status: string }; error?: string }`
    - Body: FormData with `file` field
    - Returns HTTP 202 (Accepted) — async processing triggered

- ✅ `src/app/api/rag/documents/[id]/process/route.ts`
  - **POST**: Re-trigger processing → `{ success: boolean; data?: { documentId: string; status: string }; error?: string }`
    - Returns HTTP 202 (Accepted)

### E02 Completion Status ✅

**Types available from `@/types/rag`:**
- `RAGKnowledgeBase`, `RAGDocument`, `RAGSection`, `RAGFact`, `RAGExpertQuestion`, `RAGQuery`, `RAGQualityScore`
- `RAGDocumentStatus`: `'uploading'` | `'processing'` | `'awaiting_questions'` | `'ready'` | `'error'` | `'archived'`
- **CRITICAL**: `RAGQueryMode`: `'rag_only'` | `'lora_only'` | `'rag_and_lora'` (note: NOT `'rag_plus_lora'`)

### Existing Hook Patterns (MUST follow exactly)

**From `src/hooks/usePipelineJobs.ts` (lines 1-150):**

```typescript
// ============================================
// Query Key Factory Pattern
// ============================================

export const pipelineKeys = {
  all: ['pipeline'] as const,
  jobs: () => [...pipelineKeys.all, 'jobs'] as const,
  jobList: (filters?: { status?: string; limit?: number }) => 
    [...pipelineKeys.jobs(), 'list', filters] as const,
  job: (id: string) => [...pipelineKeys.jobs(), 'detail', id] as const,
};

// ============================================
// Standalone Fetch Functions
// ============================================

async function fetchPipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}): Promise<PipelineJobListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.status) params.set('status', options.status);
  
  const response = await fetch(`/api/pipeline/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch pipeline jobs');
  return response.json();
}

// ============================================
// useQuery Hook
// ============================================

export function usePipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}) {
  return useQuery({
    queryKey: pipelineKeys.jobList(options),
    queryFn: () => fetchPipelineJobs(options),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// useMutation Hook
// ============================================

export function useCreatePipelineJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPipelineJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.jobs() });
    },
  });
}
```

**From `src/hooks/useModels.ts` (lines 40-62) — Toast Usage in Mutations:**

```typescript
export function useDownloadModel() {
  return useMutation({
    mutationFn: async ({ modelId, files }: { modelId: string; files?: string[] }) => {
      const response = await fetch(`/api/models/${modelId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate download URLs');
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast.error('Download Error', {
        description: error.message,
      });
    },
  });
}
```

**Key conventions from existing codebase:**
- ✅ Hooks are in `src/hooks/` with camelCase filenames (e.g., `usePipelineJobs.ts`, `useModels.ts`)
- ✅ Query keys use factory pattern with hierarchical structure
- ✅ Fetch wrappers are standalone async functions at module level
- ✅ `useQuery` with `staleTime` in milliseconds (e.g., `30 * 1000` for 30 seconds)
- ✅ `useMutation` with `onSuccess` cache invalidation
- ✅ **Toast notifications CAN be used in hooks** (see `useModels.ts` line 56-60) — typically in `onError` handlers
- ✅ Every hook file starts with standard imports (no `'use client'` directive in existing hooks)
- ✅ All API routes return `{ success: boolean; data?: T; error?: string }`

---

## Phase 1: Knowledge Base Hooks

### Task 1: Create Knowledge Base Hooks

**File:** `src/hooks/useRAGKnowledgeBases.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGKnowledgeBase } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragKnowledgeBaseKeys = {
  all: ['rag-knowledge-bases'] as const,
  list: () => [...ragKnowledgeBaseKeys.all, 'list'] as const,
  detail: (id: string) => [...ragKnowledgeBaseKeys.all, 'detail', id] as const,
};

// ============================================
// Fetch Functions
// ============================================

async function fetchKnowledgeBases(): Promise<RAGKnowledgeBase[]> {
  const res = await fetch('/api/rag/knowledge-bases');
  if (!res.ok) throw new Error('Failed to fetch knowledge bases');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch knowledge bases');
  return json.data;
}

async function createKnowledgeBase(data: { name: string; description?: string }): Promise<RAGKnowledgeBase> {
  const res = await fetch('/api/rag/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create knowledge base');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to create knowledge base');
  return json.data;
}

// ============================================
// Hooks
// ============================================

export function useRAGKnowledgeBases() {
  return useQuery({
    queryKey: ragKnowledgeBaseKeys.list(),
    queryFn: fetchKnowledgeBases,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKnowledgeBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragKnowledgeBaseKeys.all });
    },
  });
}
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts` — query key factory, fetch wrapper, useQuery/useMutation pattern

---

## Phase 2: Document Hooks

### Task 2: Create Document Hooks

**File:** `src/hooks/useRAGDocuments.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGDocument, RAGSection, RAGFact } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragDocumentKeys = {
  all: ['rag-documents'] as const,
  list: (knowledgeBaseId: string) => [...ragDocumentKeys.all, 'list', knowledgeBaseId] as const,
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

async function fetchDocuments(knowledgeBaseId: string): Promise<RAGDocument[]> {
  const res = await fetch(`/api/rag/documents?knowledgeBaseId=${knowledgeBaseId}`);
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
  knowledgeBaseId: string;
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

export function useRAGDocuments(knowledgeBaseId: string) {
  return useQuery({
    queryKey: ragDocumentKeys.list(knowledgeBaseId),
    queryFn: () => fetchDocuments(knowledgeBaseId),
    staleTime: 15 * 1000, // 15 seconds
    enabled: !!knowledgeBaseId,
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
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.list(variables.knowledgeBaseId) });
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

export function useDeleteDocument(knowledgeBaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.list(knowledgeBaseId) });
    },
  });
}
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts` — CRUD hooks pattern with FormData upload

---

## Phase 3: Expert QA Hooks

### Task 3: Create Expert QA Hooks

**File:** `src/hooks/useExpertQA.ts`

```typescript
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
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts` with cross-module query key import

---

## Phase 4: RAG Chat Hooks

### Task 4: Create RAG Chat Hooks

**File:** `src/hooks/useRAGChat.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGQuery, RAGQueryMode } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragChatKeys = {
  all: ['rag-chat'] as const,
  history: (documentId?: string, knowledgeBaseId?: string) => 
    [...ragChatKeys.all, 'history', { documentId, knowledgeBaseId }] as const,
};

// ============================================
// Fetch Functions
// ============================================

async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  mode?: RAGQueryMode;
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
  knowledgeBaseId?: string;
  limit?: number;
}): Promise<RAGQuery[]> {
  const searchParams = new URLSearchParams();
  if (params.documentId) searchParams.set('documentId', params.documentId);
  if (params.knowledgeBaseId) searchParams.set('knowledgeBaseId', params.knowledgeBaseId);
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(`/api/rag/query?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch query history');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch history');
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
        queryKey: ragChatKeys.history(data.documentId || undefined, data.knowledgeBaseId || undefined) 
      });
    },
  });
}

export function useRAGQueryHistory(documentId?: string, knowledgeBaseId?: string) {
  return useQuery({
    queryKey: ragChatKeys.history(documentId, knowledgeBaseId),
    queryFn: () => fetchQueryHistory({ documentId, knowledgeBaseId }),
    staleTime: 10 * 1000, // 10 seconds
    enabled: !!(documentId || knowledgeBaseId),
  });
}
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts` with URLSearchParams pattern

---

## Phase 5: Quality Hooks

### Task 5: Create Quality Hooks

**File:** `src/hooks/useRAGQuality.ts`

```typescript
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
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts` with conditional URL building

---

## Verification

### Step 1: TypeScript Build Check

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit 2>&1 | grep -E "(error|src/hooks/useRAG|src/hooks/useExpertQA)" | head -n 20
```

**Expected:** No TypeScript errors related to the new hook files.

### Step 2: Verify All Hook Files Exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/hooks/useRAG* src/hooks/useExpertQA.ts 2>/dev/null
```

**Expected 5 files:**
- `useRAGKnowledgeBases.ts`
- `useRAGDocuments.ts`
- `useExpertQA.ts`
- `useRAGChat.ts`
- `useRAGQuality.ts`

### Step 3: Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx next lint 2>&1 | grep -E "(useRAG|useExpertQA)" | head -n 10
```

**Expected:** No ESLint errors in hook files.

---

## Success Criteria

- [ ] `useRAGKnowledgeBases.ts` — Exports: `useRAGKnowledgeBases`, `useCreateKnowledgeBase`, `ragKnowledgeBaseKeys`
- [ ] `useRAGDocuments.ts` — Exports: `useRAGDocuments`, `useRAGDocumentDetail`, `useCreateDocument`, `useUploadDocument`, `useReprocessDocument`, `useDeleteDocument`, `ragDocumentKeys`
- [ ] `useExpertQA.ts` — Exports: `useExpertQuestions`, `useSubmitAnswer`, `useSkipQuestion`, `useVerifyDocument`, `expertQAKeys`
- [ ] `useRAGChat.ts` — Exports: `useRAGQuery`, `useRAGQueryHistory`, `ragChatKeys`
- [ ] `useRAGQuality.ts` — Exports: `useRAGQualityScores`, `useRAGQualitySummary`, `useEvaluateQuery`, `ragQualityKeys`
- [ ] All hooks use query key factories with proper hierarchical structure
- [ ] All mutations invalidate relevant query caches
- [ ] TypeScript build succeeds with zero errors
- [ ] All hooks follow existing codebase patterns (no `'use client'` directive, consistent import structure)

---

## What's Next

**E08** will create the first set of UI components: `KnowledgeBaseDashboard`, `DocumentUploader`, `ModeSelector`, and `SourceCitation`.

---

## If Something Goes Wrong

### React Query Import Errors
- All hooks import from `@tanstack/react-query` (not `react-query` — that's v4)
- If errors occur, verify `ReactQueryProvider` is in `src/app/layout.tsx`

### Import Circular Dependencies
- Hooks import types from `@/types/rag` — not from services
- Hooks call API routes via `fetch` — they do NOT import services directly
- Cross-hook imports are allowed (e.g., `useExpertQA` imports `ragDocumentKeys` from `useRAGDocuments`)

### Cache Not Invalidating
- Check that `queryKey` in `invalidateQueries` matches the key factory structure exactly
- Use broader invalidation (e.g., `ragDocumentKeys.all`) to catch all related queries

### RAGQueryMode Type Error
- **CRITICAL**: Valid values are `'rag_only'` | `'lora_only'` | `'rag_and_lora'`
- Note: It's `'rag_and_lora'` NOT `'rag_plus_lora'` (common mistake from v1)

### FormData Upload Issues
- `useUploadDocument` uses FormData — do NOT set `Content-Type` header (browser sets it automatically with boundary)
- File must be appended as: `formData.append('file', fileObject)`

### Query History Key Mismatch
- `ragChatKeys.history()` includes both `documentId` and `knowledgeBaseId` in the key
- When invalidating, pass the same params: `ragChatKeys.history(data.documentId || undefined, data.knowledgeBaseId || undefined)`

---

## Notes for Agent

1. **Create ALL 5 hook files** in `src/hooks/`.
2. **Hooks call API routes via `fetch`** — they do NOT import service functions directly.
3. **Do NOT add `'use client'` directive** — existing hooks in the codebase don't use it (see `usePipelineJobs.ts`, `useModels.ts`).
4. **Export query key factories** — components may need them for manual cache operations or cross-hook references.
5. **Do NOT create components or pages** — those are E08-E10.
6. **Follow staleTime pattern** from existing hooks: Use `staleTime: 30 * 1000` (30 seconds) format, not just `30_000`.
7. **All API routes return `{ success, data, error }`** — check both `!res.ok` and `!json.success`.
8. **Toast notifications are optional** — only add them if meaningful error context is needed (see `useModels.ts` example).
9. **Query history hook** needs both `documentId` and `knowledgeBaseId` in the key factory for proper cache discrimination.
10. **Upload hook** returns data with `{ documentId, filePath, status }` — useful for tracking async processing.

---

**End of E07 Prompt v2**


+++++++++++++++++
