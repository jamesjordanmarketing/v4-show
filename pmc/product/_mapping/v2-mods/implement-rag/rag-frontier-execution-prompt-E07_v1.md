# RAG Frontier - Execution Prompt E07: React Hooks

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E07 - React Hooks
**Prerequisites:** E01-E06 complete (database, types, services, all API routes)
**Status:** Ready for Execution

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

---

========================


# EXECUTION PROMPT E07: React Hooks

## Your Mission

Create all React hooks for the RAG Frontier module in a Next.js 14 / TypeScript application. These hooks use TanStack Query (React Query v5) to manage server state by calling the API routes created in E05-E06.

---

## Context: Current State

### What Exists (from E01-E06)
- **Types**: `src/types/rag.ts` — all entity interfaces: `RAGKnowledgeBase`, `RAGDocument`, `RAGSection`, `RAGFact`, `RAGExpertQuestion`, `RAGQuery`, `RAGQualityScore`, `RAGDocumentStatus`, `RAGQueryMode`
- **API Routes** (all require auth, return `{ success: boolean; data?: T; error?: string }`):
  - `GET/POST /api/rag/knowledge-bases`
  - `GET/POST /api/rag/documents?knowledgeBaseId=xxx`
  - `GET/DELETE /api/rag/documents/[id]`
  - `POST /api/rag/documents/[id]/upload` (multipart/form-data)
  - `POST /api/rag/documents/[id]/process`
  - `GET/POST /api/rag/documents/[id]/questions?includeAnswered=true`
  - `POST /api/rag/documents/[id]/verify`
  - `GET/POST /api/rag/query`
  - `GET/POST /api/rag/quality?documentId=xxx&summary=true`

### Existing Hook Patterns (MUST follow exactly)
From `src/hooks/useModels.ts` and `src/hooks/usePipelineJobs.ts`:

```typescript
// Query key factory pattern
const queryKeys = {
  all: ['resource'] as const,
  list: (params?: any) => [...queryKeys.all, 'list', params] as const,
  detail: (id: string) => [...queryKeys.all, 'detail', id] as const,
};

// Standalone fetch wrapper
async function fetchResource(): Promise<T[]> {
  const res = await fetch('/api/resource');
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed');
  return json.data;
}

// useQuery with staleTime
export function useResource() {
  return useQuery({
    queryKey: queryKeys.all,
    queryFn: fetchResource,
    staleTime: 30_000,
  });
}

// useMutation with cache invalidation
export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateData) => {
      const res = await fetch('/api/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}
```

**Key conventions:**
- Hooks are in `src/hooks/` with camelCase filenames
- Query keys use factory pattern
- Fetch wrappers are standalone async functions
- `useQuery` with `staleTime`
- `useMutation` with `onSuccess` invalidation
- Toast notifications are used in **components**, not hooks (hooks just throw errors)

---

## Phase 1: Knowledge Base Hooks

### Task 1: Create Knowledge Base Hooks

**File:** `src/hooks/useRAGKnowledgeBases.ts`

```typescript
'use client';

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
    staleTime: 30_000,
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

**Pattern Source**: `src/hooks/useModels.ts` — query key factory, fetch wrapper, useQuery/useMutation pattern

---

## Phase 2: Document Hooks

### Task 2: Create Document Hooks

**File:** `src/hooks/useRAGDocuments.ts`

```typescript
'use client';

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
    staleTime: 15_000,
    enabled: !!knowledgeBaseId,
  });
}

export function useRAGDocumentDetail(documentId: string) {
  return useQuery({
    queryKey: ragDocumentKeys.detail(documentId),
    queryFn: () => fetchDocumentDetail(documentId),
    staleTime: 10_000,
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

**Pattern Source**: `src/hooks/usePipelineJobs.ts` — CRUD hooks pattern

---

## Phase 3: Expert QA Hooks

### Task 3: Create Expert QA Hooks

**File:** `src/hooks/useExpertQA.ts`

```typescript
'use client';

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
    staleTime: 10_000,
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

**Pattern Source**: `src/hooks/usePipelineJobs.ts`

---

## Phase 4: RAG Chat Hooks

### Task 4: Create RAG Chat Hooks

**File:** `src/hooks/useRAGChat.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RAGQuery, RAGQueryMode } from '@/types/rag';

// ============================================
// Query Key Factory
// ============================================

export const ragChatKeys = {
  all: ['rag-chat'] as const,
  history: (documentId?: string) => [...ragChatKeys.all, 'history', documentId] as const,
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
      queryClient.invalidateQueries({ queryKey: ragChatKeys.history(data.documentId || undefined) });
    },
  });
}

export function useRAGQueryHistory(documentId?: string, knowledgeBaseId?: string) {
  return useQuery({
    queryKey: ragChatKeys.history(documentId),
    queryFn: () => fetchQueryHistory({ documentId, knowledgeBaseId }),
    staleTime: 10_000,
    enabled: !!(documentId || knowledgeBaseId),
  });
}
```

**Pattern Source**: `src/hooks/usePipelineJobs.ts`

---

## Phase 5: Quality Hooks

### Task 5: Create Quality Hooks

**File:** `src/hooks/useRAGQuality.ts`

```typescript
'use client';

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
    staleTime: 30_000,
  });
}

export function useRAGQualitySummary(documentId: string) {
  return useQuery({
    queryKey: ragQualityKeys.summary(documentId),
    queryFn: () => fetchQualitySummary(documentId),
    staleTime: 30_000,
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

**Pattern Source**: `src/hooks/usePipelineJobs.ts`

---

## Verification

### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit
```

**Expected:** Exit code 0, no TypeScript errors.

### Step 2: Verify All Hook Files Exist

```bash
ls -la src/hooks/useRAG* src/hooks/useExpertQA.ts
```

Confirm 5 files:
- `useRAGKnowledgeBases.ts`
- `useRAGDocuments.ts`
- `useExpertQA.ts`
- `useRAGChat.ts`
- `useRAGQuality.ts`

---

## Success Criteria

- [ ] `useRAGKnowledgeBases.ts` — `useRAGKnowledgeBases`, `useCreateKnowledgeBase`
- [ ] `useRAGDocuments.ts` — `useRAGDocuments`, `useRAGDocumentDetail`, `useCreateDocument`, `useUploadDocument`, `useReprocessDocument`, `useDeleteDocument`
- [ ] `useExpertQA.ts` — `useExpertQuestions`, `useSubmitAnswer`, `useSkipQuestion`, `useVerifyDocument`
- [ ] `useRAGChat.ts` — `useRAGQuery`, `useRAGQueryHistory`
- [ ] `useRAGQuality.ts` — `useRAGQualityScores`, `useRAGQualitySummary`, `useEvaluateQuery`
- [ ] All hooks use query key factories
- [ ] All mutations invalidate relevant query caches
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

**E08** will create the first set of UI components: KnowledgeBaseDashboard, DocumentUploader, ModeSelector, and SourceCitation.

---

## If Something Goes Wrong

### React Query Not Available
- Ensure `@tanstack/react-query` is installed: `npm install @tanstack/react-query`
- Verify `QueryClientProvider` is in the app's root layout

### Import Circular Dependencies
- Hooks import types from `@/types/rag` — not from services
- Hooks call API routes via `fetch` — they do NOT import services directly

### Cache Not Invalidating
- Check that `queryKey` in `invalidateQueries` matches the key factory

---

## Notes for Agent

1. **Create ALL 5 hook files** in `src/hooks/`.
2. **Hooks call API routes via `fetch`** — they do NOT import service functions directly.
3. **Toast notifications** are NOT in hooks — they're used in components that call these hooks.
4. **Every hook file** starts with `'use client'` directive.
5. **Do NOT create components or pages** — those are E08-E10.
6. **Export query key factories** — components may need them for manual cache operations.

---

**End of E07 Prompt**


+++++++++++++++++
