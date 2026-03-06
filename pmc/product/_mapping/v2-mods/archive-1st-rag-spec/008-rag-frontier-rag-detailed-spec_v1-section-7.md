# Section 7: React Hooks & State Management

**Version:** 1.0
**Date:** February 9, 2026
**Parent Document:** `008-rag-frontier-rag-detailed-spec_v1-master.md`
**Phase:** Phase 1 Only (Single-Document Proof of Concept)

**Extension Status**: NEW hooks and store following existing React Query v5 + Zustand patterns established in `src/hooks/use-datasets.ts`, `src/hooks/use-conversations.ts`, and `src/stores/conversation-store.ts`.

---

## Overview

This section defines the complete client-side data fetching and state management layer for the Frontier RAG module. All server state (documents, questions, chat responses, quality metrics) is managed through React Query v5 hooks that call API routes defined in Section 6. Client-side UI state (selected document, chat mode, sidebar view, modal state) is managed through a single Zustand store.

**User value delivered:**
- Automatic caching, background refetching, and stale-while-revalidate for all RAG data
- Toast notifications for all mutations (success and error)
- Consistent loading/error state handling across all RAG views
- Persisted user preferences (chat mode, sidebar view) across sessions
- Transient session state (selected document, modals) that resets on page refresh

**What already exists (reused):**
- React Query v5 (TanStack Query) — `@tanstack/react-query` already installed and configured with `QueryClientProvider`
- Zustand with devtools + persist middleware — `zustand` already installed
- Toast notifications — `sonner` already installed and `toast` available
- Query/mutation patterns from `src/hooks/use-datasets.ts` and `src/hooks/use-conversations.ts`
- Store patterns from `src/stores/conversation-store.ts`

**What is being added (new):**
- `src/hooks/use-rag-documents.ts` — Document CRUD hooks (6 functions)
- `src/hooks/use-expert-qa.ts` — Expert Q&A flow hooks (3 functions)
- `src/hooks/use-rag-chat.ts` — Chat with retrieval hooks (2 exported, 1 internal)
- `src/hooks/use-rag-quality.ts` — Quality metrics hooks (2 functions)
- `src/stores/rag-store.ts` — RAG UI state store (5 state fields, 5 actions)

---

## Dependencies

### Codebase Prerequisites
- `@tanstack/react-query` — Already installed. Query client provider configured at app root.
- `zustand` — Already installed with `devtools` and `persist` middleware.
- `sonner` — Already installed. `toast` imported from `sonner`.
- `src/types/rag.ts` — Must exist (Section 2). Provides all RAG type definitions.

### Previous Section Prerequisites
- **Section 2** (TypeScript Types) — All RAG types and interfaces used by hooks
- **Section 6** (API Routes) — All endpoints that hooks call must be defined

---

## Features & Requirements

---

### FR-7.1: useRAGDocuments Hook

**Type**: React Hook (React Query v5)

**Description**: Provides all document CRUD operations — list, get, create, upload file, process, and delete. Each operation is a separate exported function following the established pattern from `use-datasets.ts`.

**Implementation Strategy**: NEW build, following existing pattern from `src/hooks/use-datasets.ts`

**File**: `src/hooks/use-rag-documents.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

/**
 * RAG Document as returned by the API.
 * Mirrors the rag_documents table with camelCase field names.
 */
export interface RAGDocument {
  id: string;
  userId: string;
  knowledgeBaseId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  status: 'uploaded' | 'extracting' | 'reading' | 'embedding' | 'ready' | 'error';
  extractedText: string | null;
  pageCount: number | null;
  wordCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RAGDocumentsResponse {
  success: boolean;
  data: {
    documents: RAGDocument[];
    total: number;
  };
}

export interface RAGDocumentResponse {
  success: boolean;
  data: {
    document: RAGDocument;
  };
}

export interface CreateRAGDocumentInput {
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateRAGDocumentResponse {
  success: boolean;
  data: {
    document: RAGDocument;
    uploadUrl: string;
    storagePath: string;
  };
}

export interface UploadDocumentFileInput {
  uploadUrl: string;
  file: File;
  mimeType: string;
}

export interface ProcessDocumentInput {
  documentId: string;
}

export interface RAGDocumentFilters {
  status?: string;
}

// =============================================================================
// Query Key Factory
// =============================================================================

export const ragDocumentKeys = {
  all: ['rag-documents'] as const,
  lists: () => [...ragDocumentKeys.all, 'list'] as const,
  list: (filters?: RAGDocumentFilters) => [...ragDocumentKeys.lists(), filters] as const,
  details: () => [...ragDocumentKeys.all, 'detail'] as const,
  detail: (id: string) => [...ragDocumentKeys.details(), id] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch all RAG documents for the current user with optional filters.
 *
 * @param filters - Optional status filter
 * @returns React Query result with documents array
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRAGDocuments({ status: 'ready' });
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useDatasets()
 */
export function useRAGDocuments(filters?: RAGDocumentFilters) {
  return useQuery<RAGDocumentsResponse>({
    queryKey: ragDocumentKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);

      const response = await fetch(`/api/rag/documents?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
        throw new Error(error.error || 'Failed to fetch documents');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single RAG document by ID.
 * Disabled when id is null (pass null to skip the query).
 *
 * @param id - Document UUID or null to disable
 * @returns React Query result with single document
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRAGDocument(selectedDocumentId);
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useDataset()
 */
export function useRAGDocument(id: string | null) {
  return useQuery<RAGDocumentResponse>({
    queryKey: ragDocumentKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/rag/documents/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Document not found' }));
        throw new Error(error.error || 'Document not found');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute — single document changes less frequently
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new RAG document record and receive a signed upload URL.
 * Does NOT upload the file — use useUploadDocumentFile() for that.
 *
 * On success:
 * - Invalidates all document list queries
 * - Displays success toast
 * - Returns the document record + signed upload URL
 *
 * @returns Mutation with CreateRAGDocumentInput as variables
 *
 * @example
 * ```tsx
 * const createDoc = useCreateRAGDocument();
 * const result = await createDoc.mutateAsync({
 *   title: 'My Document',
 *   fileName: 'doc.pdf',
 *   fileSize: 1024000,
 *   mimeType: 'application/pdf',
 * });
 * // result.data.uploadUrl — use with useUploadDocumentFile()
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useCreateDataset()
 */
export function useCreateRAGDocument() {
  const queryClient = useQueryClient();

  return useMutation<CreateRAGDocumentResponse, Error, CreateRAGDocumentInput>({
    mutationFn: async (data: CreateRAGDocumentInput) => {
      const response = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create document' }));
        throw new Error(error.error || 'Failed to create document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.all });
      toast.success('Document created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Upload a file directly to the Supabase Storage signed URL.
 * This is NOT an API route call — it is a direct PUT to the signed URL
 * returned by useCreateRAGDocument().
 *
 * On success:
 * - Displays success toast
 *
 * On error:
 * - Displays error toast
 *
 * @returns Mutation with UploadDocumentFileInput as variables
 *
 * @example
 * ```tsx
 * const upload = useUploadDocumentFile();
 * await upload.mutateAsync({
 *   uploadUrl: result.data.uploadUrl,
 *   file: fileInput.files[0],
 *   mimeType: 'application/pdf',
 * });
 * ```
 *
 * Pattern Source: Direct storage upload (no existing pattern — new for RAG)
 */
export function useUploadDocumentFile() {
  return useMutation<void, Error, UploadDocumentFileInput>({
    mutationFn: async ({ uploadUrl, file, mimeType }: UploadDocumentFileInput) => {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    },
    onSuccess: () => {
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

/**
 * Trigger document processing (text extraction, LLM reading, embedding).
 * Calls POST /api/rag/documents/[id]/process.
 *
 * On success:
 * - Invalidates the specific document query (so status refreshes)
 * - Invalidates all document list queries
 * - Displays "Document processing started" toast
 *
 * @returns Mutation with ProcessDocumentInput as variables
 *
 * @example
 * ```tsx
 * const process = useProcessDocument();
 * await process.mutateAsync({ documentId: 'uuid-here' });
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useConfirmDatasetUpload()
 */
export function useProcessDocument() {
  const queryClient = useQueryClient();

  return useMutation<RAGDocumentResponse, Error, ProcessDocumentInput>({
    mutationFn: async ({ documentId }: ProcessDocumentInput) => {
      const response = await fetch(`/api/rag/documents/${documentId}/process`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to start processing' }));
        throw new Error(error.error || 'Failed to start processing');
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.detail(variables.documentId) });
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.lists() });
      toast.success('Document processing started');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Delete a RAG document and its associated data.
 * Calls DELETE /api/rag/documents/[id].
 *
 * On success:
 * - Invalidates all document queries
 * - Displays "Document deleted" toast
 *
 * @returns Mutation with document ID string as variables
 *
 * @example
 * ```tsx
 * const deleteDoc = useDeleteRAGDocument();
 * await deleteDoc.mutateAsync('uuid-here');
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useDeleteDataset()
 */
export function useDeleteRAGDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/rag/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete document' }));
        throw new Error(error.error || 'Failed to delete document');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.all });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

**Acceptance Criteria**:
1. `useRAGDocuments()` returns document list with loading/error states and respects status filter
2. `useRAGDocuments({ status: 'ready' })` only fetches documents with status `ready`
3. `useRAGDocument(id)` returns single document; returns no data when `id` is `null`
4. `useCreateRAGDocument()` posts to API, invalidates list cache, shows success toast
5. `useUploadDocumentFile()` PUTs file blob directly to signed URL, shows success/error toast
6. `useProcessDocument()` posts to process endpoint, invalidates both detail and list caches
7. `useDeleteRAGDocument()` deletes via API, invalidates all document caches, shows toast

**Verification Steps**:
1. Call `useRAGDocuments()` in a component — confirm it fetches from `/api/rag/documents` and renders documents
2. Call `useRAGDocuments({ status: 'ready' })` — confirm URL includes `?status=ready`
3. Call `useRAGDocument(null)` — confirm no network request is made (enabled: false)
4. Call `useRAGDocument('valid-id')` — confirm it fetches from `/api/rag/documents/valid-id`
5. Execute `useCreateRAGDocument().mutateAsync(...)` — confirm POST request, toast appears, document list refetches
6. Execute `useUploadDocumentFile().mutateAsync(...)` — confirm PUT to signed URL with correct Content-Type
7. Execute `useProcessDocument().mutateAsync(...)` — confirm POST to `/api/rag/documents/[id]/process`, toast appears
8. Execute `useDeleteRAGDocument().mutateAsync(...)` — confirm DELETE request, toast appears, list refetches

---

### FR-7.2: useExpertQA Hook

**Type**: React Hook (React Query v5)

**Description**: Manages the expert question-and-answer flow. Provides hooks for fetching generated questions, submitting expert answers, and triggering verification sample generation.

**Implementation Strategy**: NEW build, following existing mutation patterns

**File**: `src/hooks/use-expert-qa.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ragDocumentKeys } from './use-rag-documents';

// =============================================================================
// Types
// =============================================================================

export interface ExpertQuestion {
  id: string;
  documentId: string;
  questionText: string;
  questionType: 'clarification' | 'depth' | 'edge_case' | 'application';
  sectionReference: string | null;
  priority: number;
  status: 'pending' | 'answered' | 'skipped';
  answerText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertQuestionsResponse {
  success: boolean;
  data: {
    questions: ExpertQuestion[];
    total: number;
    answeredCount: number;
    pendingCount: number;
  };
}

export interface SubmitAnswerItem {
  questionId: string;
  answerText: string | null;
  status: 'answered' | 'skipped';
}

export interface SubmitAnswersInput {
  documentId: string;
  answers: SubmitAnswerItem[];
}

export interface SubmitAnswersResponse {
  success: boolean;
  data: {
    accepted: number;
    skipped: number;
  };
}

export interface VerificationSample {
  id: string;
  question: string;
  expectedAnswer: string;
  sourceSection: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface VerificationResponse {
  success: boolean;
  data: {
    samples: VerificationSample[];
  };
}

// =============================================================================
// Query Key Factory
// =============================================================================

export const expertQAKeys = {
  all: ['rag-questions'] as const,
  questions: (documentId: string) => [...expertQAKeys.all, documentId] as const,
  verification: (documentId: string) => [...expertQAKeys.all, 'verification', documentId] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch expert questions for a specific document.
 * Disabled when documentId is null.
 *
 * Questions are generated by the LLM after document reading (Section 4).
 * Returns questions grouped by type with answer status.
 *
 * @param documentId - Document UUID or null to disable
 * @returns React Query result with questions array and counts
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useExpertQuestions(documentId);
 * const questions = data?.data.questions ?? [];
 * const pending = data?.data.pendingCount ?? 0;
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useDataset() (conditional query)
 */
export function useExpertQuestions(documentId: string | null) {
  return useQuery<ExpertQuestionsResponse>({
    queryKey: expertQAKeys.questions(documentId!),
    queryFn: async () => {
      const response = await fetch(`/api/rag/documents/${documentId}/questions`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch questions' }));
        throw new Error(error.error || 'Failed to fetch questions');
      }
      return response.json();
    },
    enabled: !!documentId,
    staleTime: 60 * 1000, // 1 minute — questions rarely change after generation
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Submit expert answers for a batch of questions.
 * Calls POST /api/rag/documents/[id]/questions with an answers array.
 *
 * On success:
 * - Invalidates the questions query (to refresh answer status)
 * - Invalidates the document detail query (status may change to "ready")
 * - Invalidates all document list queries (status column update)
 * - Displays "Answers submitted, refining knowledge..." toast
 *
 * @returns Mutation with SubmitAnswersInput as variables
 *
 * @example
 * ```tsx
 * const submit = useSubmitAnswers();
 * await submit.mutateAsync({
 *   documentId: 'uuid-here',
 *   answers: [
 *     { questionId: 'q1', answerText: 'The process involves...', status: 'answered' },
 *     { questionId: 'q2', answerText: null, status: 'skipped' },
 *   ],
 * });
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useCreateDataset() (mutation with multi-query invalidation)
 */
export function useSubmitAnswers() {
  const queryClient = useQueryClient();

  return useMutation<SubmitAnswersResponse, Error, SubmitAnswersInput>({
    mutationFn: async ({ documentId, answers }: SubmitAnswersInput) => {
      const response = await fetch(`/api/rag/documents/${documentId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to submit answers' }));
        throw new Error(error.error || 'Failed to submit answers');
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      // Refresh questions to show updated answer status
      queryClient.invalidateQueries({ queryKey: expertQAKeys.questions(variables.documentId) });
      // Refresh document detail (status may have changed)
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.detail(variables.documentId) });
      // Refresh document list (status column update)
      queryClient.invalidateQueries({ queryKey: ragDocumentKeys.lists() });
      toast.success('Answers submitted, refining knowledge...');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Generate verification samples for a document.
 * Calls POST /api/rag/documents/[id]/verify.
 *
 * This is a mutation (one-time generation), not a query, because it triggers
 * LLM work server-side. However, results can be cached for re-display.
 *
 * On success:
 * - Returns verification samples
 * - Displays "Verification samples generated" toast
 *
 * On error:
 * - Displays error toast
 *
 * @returns Mutation with documentId string as variables
 *
 * @example
 * ```tsx
 * const verify = useGenerateVerification();
 * const result = await verify.mutateAsync('document-uuid');
 * const samples = result.data.samples;
 * ```
 *
 * Pattern Source: Custom (one-time generation treated as mutation)
 */
export function useGenerateVerification() {
  const queryClient = useQueryClient();

  return useMutation<VerificationResponse, Error, string>({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/rag/documents/${documentId}/verify`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate verification' }));
        throw new Error(error.error || 'Failed to generate verification');
      }
      return response.json();
    },
    onSuccess: (data, documentId) => {
      // Cache the verification result for re-display without re-generating
      queryClient.setQueryData(expertQAKeys.verification(documentId), data);
      toast.success('Verification samples generated');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

**Acceptance Criteria**:
1. `useExpertQuestions(documentId)` fetches questions from correct endpoint with counts
2. `useExpertQuestions(null)` makes no network request
3. `useSubmitAnswers()` posts answers array, invalidates questions + document queries, shows toast
4. `useGenerateVerification()` posts to verify endpoint, caches result, shows toast
5. All error states produce descriptive error messages via toast

**Verification Steps**:
1. Call `useExpertQuestions('valid-doc-id')` — confirm GET to `/api/rag/documents/valid-doc-id/questions`
2. Call `useExpertQuestions(null)` — confirm no network activity
3. Execute `useSubmitAnswers().mutateAsync(...)` — confirm POST with answers body, confirm three cache invalidations fire
4. Execute `useGenerateVerification().mutateAsync('doc-id')` — confirm POST to `/api/rag/documents/doc-id/verify`, confirm result is cached under verification key
5. Simulate API error (500) — confirm error toast appears with message

---

### FR-7.3: useRAGChat Hook

**Type**: React Hook (React Query v5 + React useState)

**Description**: The main chat hook for the RAG query interface. Manages local message history, sends queries to the retrieval API, handles loading state per message, and supports mode selection (rag_only / lora_only / rag_lora). Messages are kept in local React state (not server-cached) since chat is ephemeral per session.

**Implementation Strategy**: NEW build. Combines React Query mutation for API calls with local state for message history. Follows the pattern established in `src/hooks/useDualChat.ts` for chat state management.

**File**: `src/hooks/use-rag-chat.ts`

```typescript
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export type RAGMode = 'rag_only' | 'lora_only' | 'rag_lora';

export interface Citation {
  sectionId: string;
  sectionTitle: string;
  content: string;
  relevanceScore: number;
  pageNumber: number | null;
  tier: 'document' | 'section' | 'fact';
}

export interface QualityScore {
  faithfulness: number;
  relevance: number;
  completeness: number;
  coherence: number;
  harmlessness: number;
  composite: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  qualityScore: QualityScore | null;
  mode: RAGMode;
  timestamp: string;
}

export interface SendRAGQueryInput {
  knowledgeBaseId: string;
  query: string;
  mode: RAGMode;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface SendRAGQueryResponse {
  success: boolean;
  data: {
    response: string;
    citations: Citation[];
    qualityScore: QualityScore | null;
    retrievalMetadata: {
      chunksRetrieved: number;
      hydeUsed: boolean;
      selfRagFiltered: number;
      retrievalTimeMs: number;
      generationTimeMs: number;
    };
  };
}

export interface UseRAGChatReturn {
  /** Current message history for this chat session */
  messages: ChatMessage[];
  /** Send a new user message and receive assistant response */
  sendMessage: (text: string) => void;
  /** Whether a message is currently being processed */
  isLoading: boolean;
  /** Current retrieval mode */
  mode: RAGMode;
  /** Change the retrieval mode */
  setMode: (mode: RAGMode) => void;
  /** Clear all messages and start a fresh chat */
  clearMessages: () => void;
  /** Error from the last failed message, if any */
  error: Error | null;
}

// =============================================================================
// Internal Mutation Hook
// =============================================================================

/**
 * Internal mutation that calls POST /api/rag/query.
 * Not exported directly — used by useRAGChat internally.
 *
 * @returns Mutation with SendRAGQueryInput as variables
 */
function useSendRAGQuery() {
  return useMutation<SendRAGQueryResponse, Error, SendRAGQueryInput>({
    mutationFn: async (input: SendRAGQueryInput) => {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeBaseId: input.knowledgeBaseId,
          query: input.query,
          mode: input.mode,
          conversationHistory: input.conversationHistory,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Query failed' }));
        throw new Error(error.error || 'Query failed');
      }
      return response.json();
    },
  });
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Generate a unique message ID.
 * Uses crypto.randomUUID when available, falls back to timestamp-based ID.
 */
function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Main Chat Hook
// =============================================================================

/**
 * Main chat hook for the RAG query interface.
 *
 * Manages a local message history (ephemeral, not persisted to server).
 * Each call to sendMessage:
 * 1. Appends a user message to the local messages array
 * 2. Sends the query to POST /api/rag/query via useSendRAGQuery()
 * 3. On success, appends the assistant response with citations and quality score
 * 4. On error, shows a toast and sets the error state
 *
 * The conversationHistory parameter sent to the API includes the last 10
 * messages for multi-turn context (configurable via MAX_HISTORY_MESSAGES).
 *
 * @param knowledgeBaseId - The knowledge base UUID to query against
 * @returns Chat state and controls
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading, mode, setMode, clearMessages } = useRAGChat(kbId);
 *
 * return (
 *   <div>
 *     <ModeSelector mode={mode} onModeChange={setMode} />
 *     {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
 *     <ChatInput onSend={sendMessage} disabled={isLoading} />
 *   </div>
 * );
 * ```
 *
 * Pattern Source: src/hooks/useDualChat.ts (local state + API calls for chat)
 */
export function useRAGChat(knowledgeBaseId: string): UseRAGChatReturn {
  const MAX_HISTORY_MESSAGES = 10;

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<RAGMode>('rag_lora');
  const [error, setError] = useState<Error | null>(null);

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------
  const sendQuery = useSendRAGQuery();

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (sendQuery.isPending) return; // Prevent double-send while loading

      // Clear any previous error
      setError(null);

      // 1. Create and append the user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: text.trim(),
        citations: null,
        qualityScore: null,
        mode,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // 2. Build conversation history for multi-turn context
      //    Include the new user message in history
      const allMessages = [...messages, userMessage];
      const recentHistory = allMessages
        .slice(-MAX_HISTORY_MESSAGES)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      // 3. Send query to API
      sendQuery.mutate(
        {
          knowledgeBaseId,
          query: text.trim(),
          mode,
          conversationHistory: recentHistory,
        },
        {
          onSuccess: (response) => {
            // 4. Append assistant response
            const assistantMessage: ChatMessage = {
              id: generateMessageId(),
              role: 'assistant',
              content: response.data.response,
              citations: response.data.citations,
              qualityScore: response.data.qualityScore,
              mode,
              timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
          },
          onError: (err: Error) => {
            setError(err);
            toast.error(`Query failed: ${err.message}`);

            // Remove the user message that failed (optional UX choice — keeps chat clean)
            // Uncomment the next line if you want failed messages removed:
            // setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          },
        }
      );
    },
    [knowledgeBaseId, messages, mode, sendQuery]
  );

  // ---------------------------------------------------------------------------
  // Clear Messages
  // ---------------------------------------------------------------------------
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    messages,
    sendMessage,
    isLoading: sendQuery.isPending,
    mode,
    setMode,
    clearMessages,
    error,
  };
}
```

**Acceptance Criteria**:
1. `useRAGChat(kbId)` returns messages array, sendMessage function, isLoading, mode, setMode, clearMessages
2. Calling `sendMessage('text')` immediately appends a user message to the messages array
3. On API success, an assistant message with citations and quality score is appended
4. On API error, a toast is shown and the error state is set
5. `isLoading` is `true` while the API call is in progress, `false` otherwise
6. `setMode('rag_only')` changes the mode for subsequent messages
7. `clearMessages()` resets the messages array to empty
8. Conversation history sent to API is capped at 10 messages
9. Empty or whitespace-only text is ignored by sendMessage
10. Double-sends are prevented while a query is in progress

**Verification Steps**:
1. Mount component with `useRAGChat('kb-id')` — confirm initial state: messages=[], isLoading=false, mode='rag_lora'
2. Call `sendMessage('What is X?')` — confirm user message appears immediately, isLoading becomes true
3. Wait for API response — confirm assistant message appears, isLoading becomes false
4. Inspect assistant message — confirm citations array and qualityScore are populated from API response
5. Call `setMode('rag_only')` then `sendMessage('...')` — confirm the API request body has `mode: 'rag_only'`
6. Call `clearMessages()` — confirm messages array is empty
7. Call `sendMessage('')` — confirm nothing happens (no message, no API call)
8. Call `sendMessage('test')` while `isLoading` is true — confirm it is ignored
9. Simulate API error — confirm toast appears, error state is set, messages array still contains the user message

---

### FR-7.4: useRAGQuality Hook

**Type**: React Hook (React Query v5)

**Description**: Provides hooks for fetching aggregated quality metrics and query history with quality scores. These power the Quality Dashboard page (Section 8).

**Implementation Strategy**: NEW build, following existing query patterns

**File**: `src/hooks/use-rag-quality.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface QualityMetrics {
  faithfulness: { average: number; min: number; max: number; count: number };
  relevance: { average: number; min: number; max: number; count: number };
  completeness: { average: number; min: number; max: number; count: number };
  coherence: { average: number; min: number; max: number; count: number };
  harmlessness: { average: number; min: number; max: number; count: number };
  composite: { average: number; min: number; max: number; count: number };
}

export interface QualityByMode {
  rag_only: QualityMetrics | null;
  lora_only: QualityMetrics | null;
  rag_lora: QualityMetrics | null;
}

export interface QualityResponse {
  success: boolean;
  data: {
    metrics: QualityMetrics;
    byMode: QualityByMode;
    totalQueries: number;
    period: {
      from: string;
      to: string;
    };
  };
}

export interface QualityParams {
  knowledgeBaseId?: string;
  mode?: string;
  fromDate?: string;
  toDate?: string;
}

export interface QueryLogEntry {
  id: string;
  query: string;
  mode: string;
  qualityScore: {
    faithfulness: number;
    relevance: number;
    completeness: number;
    coherence: number;
    harmlessness: number;
    composite: number;
  } | null;
  retrievalTimeMs: number;
  generationTimeMs: number;
  chunksRetrieved: number;
  createdAt: string;
}

export interface QueryHistoryParams {
  knowledgeBaseId?: string;
  limit?: number;
}

export interface QueryHistoryResponse {
  success: boolean;
  data: {
    queries: QueryLogEntry[];
    total: number;
  };
}

// =============================================================================
// Query Key Factory
// =============================================================================

export const ragQualityKeys = {
  all: ['rag-quality'] as const,
  metrics: (params?: QualityParams) => [...ragQualityKeys.all, 'metrics', params] as const,
  history: (params?: QueryHistoryParams) => [...ragQualityKeys.all, 'history', params] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch aggregated quality metrics for RAG queries.
 * Returns per-metric stats (average, min, max, count) overall and by mode.
 *
 * @param params - Optional filters: knowledgeBaseId, mode, date range
 * @returns React Query result with aggregated quality metrics
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRAGQuality({ knowledgeBaseId: kbId });
 * const composite = data?.data.metrics.composite.average;
 * const ragOnlyScore = data?.data.byMode.rag_only?.composite.average;
 * ```
 *
 * Pattern Source: src/hooks/use-conversations.ts — useConversationStats()
 */
export function useRAGQuality(params?: QualityParams) {
  return useQuery<QualityResponse>({
    queryKey: ragQualityKeys.metrics(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.knowledgeBaseId) searchParams.set('knowledgeBaseId', params.knowledgeBaseId);
      if (params?.mode) searchParams.set('mode', params.mode);
      if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
      if (params?.toDate) searchParams.set('toDate', params.toDate);

      const response = await fetch(`/api/rag/quality?${searchParams.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch quality metrics' }));
        throw new Error(error.error || 'Failed to fetch quality metrics');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute — metrics don't change rapidly
    refetchOnWindowFocus: false, // Don't refetch on tab focus (expensive aggregation)
  });
}

/**
 * Fetch recent query history with quality scores.
 * Returns individual query log entries ordered by most recent.
 *
 * @param params - Optional filters: knowledgeBaseId, limit (default 50)
 * @returns React Query result with query log entries
 *
 * @example
 * ```tsx
 * const { data } = useRAGQueryHistory({ knowledgeBaseId: kbId, limit: 20 });
 * const queries = data?.data.queries ?? [];
 * ```
 *
 * Pattern Source: src/hooks/use-datasets.ts — useDatasets() (list with filters)
 */
export function useRAGQueryHistory(params?: QueryHistoryParams) {
  return useQuery<QueryHistoryResponse>({
    queryKey: ragQualityKeys.history(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('view', 'history');
      if (params?.knowledgeBaseId) searchParams.set('knowledgeBaseId', params.knowledgeBaseId);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/rag/quality?${searchParams.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch query history' }));
        throw new Error(error.error || 'Failed to fetch query history');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds — history updates more frequently during active use
  });
}
```

**Acceptance Criteria**:
1. `useRAGQuality()` fetches aggregated metrics from `/api/rag/quality` with correct params
2. `useRAGQuality({ knowledgeBaseId: 'kb-1', mode: 'rag_only' })` passes both params in URL
3. `useRAGQueryHistory()` fetches from `/api/rag/quality?view=history` with correct params
4. `useRAGQueryHistory({ limit: 10 })` includes `limit=10` in URL params
5. Stale times are appropriate: 60s for metrics, 30s for history
6. Metrics query does not refetch on window focus (refetchOnWindowFocus: false)

**Verification Steps**:
1. Call `useRAGQuality()` — confirm GET to `/api/rag/quality` with no params
2. Call `useRAGQuality({ knowledgeBaseId: 'kb-1' })` — confirm URL includes `?knowledgeBaseId=kb-1`
3. Call `useRAGQueryHistory({ limit: 20 })` — confirm URL includes `?view=history&limit=20`
4. Wait 60 seconds after initial load — confirm metrics query is marked stale and refetches on next access
5. Switch browser tabs and return — confirm metrics do NOT refetch, but history does

---

### FR-7.5: RAG Zustand Store

**Type**: Zustand Store (with devtools + persist middleware)

**Description**: Client-side UI state store for the RAG module. Manages ephemeral UI state (selected document, modal state, processing state) and persisted user preferences (chat mode, sidebar view). Follows the exact pattern established in `src/stores/conversation-store.ts`.

**Implementation Strategy**: NEW build, following existing pattern from `src/stores/conversation-store.ts`

**File**: `src/stores/rag-store.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export type RAGChatMode = 'rag_only' | 'lora_only' | 'rag_lora';
export type RAGSidebarView = 'documents' | 'quality';

interface RAGStoreState {
  // ==========================================================================
  // Session State (NOT persisted — resets on page refresh)
  // ==========================================================================

  /** Currently selected document ID in the sidebar/document list */
  selectedDocumentId: string | null;

  /** Whether the upload modal is currently open */
  uploadModalOpen: boolean;

  /** Document ID currently being processed (for progress display) */
  processingDocumentId: string | null;

  // ==========================================================================
  // User Preferences (persisted in localStorage)
  // ==========================================================================

  /** Current chat retrieval mode */
  chatMode: RAGChatMode;

  /** Current sidebar view tab */
  sidebarView: RAGSidebarView;

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Set the selected document ID.
   * Pass null to deselect.
   */
  setSelectedDocumentId: (id: string | null) => void;

  /**
   * Set the chat retrieval mode.
   * Persisted across sessions.
   */
  setChatMode: (mode: RAGChatMode) => void;

  /**
   * Set the sidebar view tab.
   * Persisted across sessions.
   */
  setSidebarView: (view: RAGSidebarView) => void;

  /**
   * Open or close the upload modal.
   */
  setUploadModalOpen: (open: boolean) => void;

  /**
   * Set the ID of the document currently being processed.
   * Pass null when processing completes or is cancelled.
   */
  setProcessingDocumentId: (id: string | null) => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * RAG Module Zustand Store
 *
 * Manages client-side UI state for the RAG module interface.
 * Separates concerns between:
 * - Server state (managed by React Query hooks in use-rag-*.ts)
 * - Client state (managed here with Zustand)
 *
 * Persisted State (survives page refresh):
 * - chatMode: User's preferred retrieval mode
 * - sidebarView: User's preferred sidebar tab
 *
 * Session State (resets on page refresh):
 * - selectedDocumentId: Currently viewed document
 * - uploadModalOpen: Modal visibility
 * - processingDocumentId: Active processing indicator
 *
 * Pattern Source: src/stores/conversation-store.ts — useConversationStore
 */
export const useRAGStore = create<RAGStoreState>()(
  devtools(
    persist(
      (set) => ({
        // ======================================================================
        // Initial State — Session (not persisted)
        // ======================================================================

        selectedDocumentId: null,
        uploadModalOpen: false,
        processingDocumentId: null,

        // ======================================================================
        // Initial State — User Preferences (persisted)
        // ======================================================================

        chatMode: 'rag_lora',
        sidebarView: 'documents',

        // ======================================================================
        // Actions
        // ======================================================================

        setSelectedDocumentId: (id: string | null) =>
          set({ selectedDocumentId: id }, false, 'setSelectedDocumentId'),

        setChatMode: (mode: RAGChatMode) =>
          set({ chatMode: mode }, false, 'setChatMode'),

        setSidebarView: (view: RAGSidebarView) =>
          set({ sidebarView: view }, false, 'setSidebarView'),

        setUploadModalOpen: (open: boolean) =>
          set({ uploadModalOpen: open }, false, 'setUploadModalOpen'),

        setProcessingDocumentId: (id: string | null) =>
          set({ processingDocumentId: id }, false, 'setProcessingDocumentId'),
      }),
      {
        name: 'rag-storage',
        // Only persist user preferences, not session-specific state
        partialize: (state) => ({
          chatMode: state.chatMode,
          sidebarView: state.sidebarView,
        }),
      }
    ),
    {
      name: 'RAGStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// =============================================================================
// Selector Hooks (optimized rendering — subscribe to specific slices)
// =============================================================================

/**
 * Subscribe to the currently selected document ID only.
 * Components using this will only re-render when selectedDocumentId changes.
 */
export const useSelectedDocumentId = () =>
  useRAGStore((state) => state.selectedDocumentId);

/**
 * Subscribe to the current chat mode only.
 */
export const useChatMode = () =>
  useRAGStore((state) => state.chatMode);

/**
 * Subscribe to the current sidebar view only.
 */
export const useSidebarView = () =>
  useRAGStore((state) => state.sidebarView);

/**
 * Subscribe to the upload modal open state only.
 */
export const useUploadModalOpen = () =>
  useRAGStore((state) => state.uploadModalOpen);

/**
 * Subscribe to the processing document ID only.
 */
export const useProcessingDocumentId = () =>
  useRAGStore((state) => state.processingDocumentId);
```

**Acceptance Criteria**:
1. Store initializes with correct defaults: selectedDocumentId=null, chatMode='rag_lora', sidebarView='documents', uploadModalOpen=false, processingDocumentId=null
2. `setChatMode('rag_only')` updates chatMode and persists to localStorage
3. `setSidebarView('quality')` updates sidebarView and persists to localStorage
4. `setSelectedDocumentId('uuid')` updates state but is NOT persisted
5. `setUploadModalOpen(true)` updates state but is NOT persisted
6. `setProcessingDocumentId('uuid')` updates state but is NOT persisted
7. On page refresh, chatMode and sidebarView are restored from localStorage
8. On page refresh, selectedDocumentId, uploadModalOpen, and processingDocumentId are reset to defaults
9. DevTools integration is enabled in development mode only
10. Selector hooks re-render only when their specific slice changes

**Verification Steps**:
1. Open React DevTools or Zustand DevTools — confirm store appears as "RAGStore"
2. Call `useRAGStore.getState()` in console — confirm all fields match defaults
3. Call `useRAGStore.getState().setChatMode('lora_only')` — confirm chatMode updates
4. Check `localStorage.getItem('rag-storage')` — confirm it contains `chatMode` and `sidebarView` but NOT `selectedDocumentId`
5. Refresh the page — confirm chatMode is restored from localStorage
6. Call `useRAGStore.getState().setSelectedDocumentId('test')` — confirm it updates
7. Refresh the page — confirm selectedDocumentId is back to null
8. Use `useSelectedDocumentId()` in two components — confirm only the relevant component re-renders when selectedDocumentId changes

---

## Section Summary

**What Was Added**:

| File | Type | Functions/Exports |
|------|------|-------------------|
| `src/hooks/use-rag-documents.ts` | React Query Hook | `useRAGDocuments`, `useRAGDocument`, `useCreateRAGDocument`, `useUploadDocumentFile`, `useProcessDocument`, `useDeleteRAGDocument`, `ragDocumentKeys` |
| `src/hooks/use-expert-qa.ts` | React Query Hook | `useExpertQuestions`, `useSubmitAnswers`, `useGenerateVerification`, `expertQAKeys` |
| `src/hooks/use-rag-chat.ts` | React Query + useState Hook | `useRAGChat` (exports: messages, sendMessage, isLoading, mode, setMode, clearMessages, error) |
| `src/hooks/use-rag-quality.ts` | React Query Hook | `useRAGQuality`, `useRAGQueryHistory`, `ragQualityKeys` |
| `src/stores/rag-store.ts` | Zustand Store | `useRAGStore`, `useSelectedDocumentId`, `useChatMode`, `useSidebarView`, `useUploadModalOpen`, `useProcessingDocumentId` |

**Total**: 5 new files, 13 exported hooks/functions, 5 selector hooks, 3 query key factories

**What Was Reused**:
- `@tanstack/react-query` — useQuery, useMutation, useQueryClient (already installed)
- `zustand` — create, devtools, persist (already installed)
- `sonner` — toast (already installed)
- React Query patterns from `src/hooks/use-datasets.ts` (query/mutation structure)
- React Query patterns from `src/hooks/use-conversations.ts` (query key factory, conditional queries)
- Zustand patterns from `src/stores/conversation-store.ts` (devtools + persist + partialize)

**Integration Points**:
- **Section 2** (Types): Hooks reference types from `src/types/rag.ts`. The hook files define their own API response types inline for self-containment, but domain types (like the full RAGDocument shape from the database) should be imported from `src/types/rag.ts` if the Section 2 types diverge from the inline definitions here.
- **Section 6** (API Routes): Every hook calls an API route defined in Section 6. The route paths and request/response shapes must match exactly.
- **Section 8** (UI Components): Components import these hooks directly to manage data fetching and state. The Zustand store is used for cross-component communication (e.g., sidebar selection updating the main panel).
- **Section 9** (Quality System): Quality hooks (`useRAGQuality`, `useRAGQueryHistory`) display data produced by the quality measurement system.

---

**Pattern Source Summary**:
| Pattern | Source File |
|---------|------------|
| Query with filters | `src/hooks/use-datasets.ts` — `useDatasets()` |
| Conditional query (enabled) | `src/hooks/use-datasets.ts` — `useDataset()` |
| Mutation with cache invalidation | `src/hooks/use-datasets.ts` — `useCreateDataset()` |
| Mutation with toast | `src/hooks/use-datasets.ts` — `useDeleteDataset()` |
| Query key factory | `src/hooks/use-conversations.ts` — `conversationKeys` |
| Multi-query invalidation | `src/hooks/use-conversations.ts` — `useUpdateConversation()` |
| Zustand + devtools + persist | `src/stores/conversation-store.ts` — `useConversationStore` |
| Partialize (selective persistence) | `src/stores/conversation-store.ts` — partialize config |
| Selector hooks | `src/stores/conversation-store.ts` — `useSelectedConversationIds()` |
| Action naming in devtools | `src/stores/conversation-store.ts` — third arg to `set()` |
