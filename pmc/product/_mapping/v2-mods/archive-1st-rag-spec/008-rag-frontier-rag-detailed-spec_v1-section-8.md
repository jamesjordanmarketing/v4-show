# Section 8: UI Components & Pages

**Extension Status**: NEW — All components and pages in this section are new additions under `src/components/rag/` and `src/app/(dashboard)/rag/`.

---

## Overview

- Delivers the complete frontend for the Frontier RAG module: dashboard, upload, expert Q&A, chat, and quality views
- Provides the primary user-facing surfaces for document management, conversational retrieval, and quality monitoring
- Reuses existing shadcn/UI primitives (`Card`, `Badge`, `Button`, `Tabs`, `Progress`, `Collapsible`, `Tooltip`, `Checkbox`), Tailwind utility classes, Lucide icons, and `sonner` toasts — consistent with the rest of the application
- All components are client components (`'use client'`) following the established pattern

### User Value Delivered

- Users can upload documents, answer expert clarification questions, chat with their knowledge base in three modes, and monitor retrieval quality — all from a cohesive set of pages

### What Already Exists (Reused) vs. What Is Being Added (New)

| Reused | New |
|---|---|
| `@/components/ui/*` (shadcn primitives) | 10 new components in `src/components/rag/` |
| `@/components/empty-states` (`EmptyState`) | 5 new pages under `src/app/(dashboard)/rag/` |
| `lucide-react` icons | `RAGLayout` sidebar navigation |
| `sonner` toast notifications (via hooks) | `ModeSelector` three-way toggle |
| `recharts` (already in dependencies) | `RAGChatInterface` with citations |

---

## Dependencies

- **Codebase Prerequisites**: All shadcn/UI components must be installed (`card`, `badge`, `button`, `tabs`, `progress`, `collapsible`, `tooltip`, `checkbox`, `input`, `textarea`, `select`, `label`, `skeleton`). `recharts` must be in `package.json`. `lucide-react` must be available.
- **Previous Section Prerequisites**: Section 4 (Types — `RAGDocument`, `RAGMessage`, `ExpertQuestion`, `QualityMetrics`, `DocumentStatus`, `RAGMode`), Section 6 (API Routes), Section 7 (Hooks — `useRAGDocuments`, `useRAGDocument`, `useUploadDocument`, `useExpertQuestions`, `useSubmitAnswers`, `useRAGChat`, `useQualityMetrics`, `useQualityHistory`)

---

## Features & Requirements

---

### FR-8.1: RAG Dashboard Page (`/rag`)

**Type**: Page

**Description**: Main dashboard showing all uploaded documents with status, filtering, and navigation to document-specific views.

**Implementation Strategy**: NEW build

**File**: `src/app/(dashboard)/rag/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRAGDocuments } from '@/hooks/use-rag-documents';
import { DocumentCard } from '@/components/rag/DocumentCard';
import { RAGLayout } from '@/components/rag/RAGLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/empty-states';
import type { RAGDocument, DocumentStatus } from '@/types/rag';

export default function RAGDashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: documents, isLoading, error } = useRAGDocuments({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as DocumentStatus),
  });

  if (isLoading) {
    return (
      <RAGLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </RAGLayout>
    );
  }

  if (error) {
    return (
      <RAGLayout>
        <EmptyState
          icon={<AlertCircle className="h-16 w-16 text-destructive" />}
          title="Failed to load documents"
          description={error instanceof Error ? error.message : 'An unexpected error occurred'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </RAGLayout>
    );
  }

  const docs = documents || [];

  return (
    <RAGLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground mt-1">
              Manage your documents and knowledge sources
            </p>
          </div>
          <Button onClick={() => router.push('/rag/upload')}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="needs_questions">Needs Review</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Document Grid or Empty State */}
        {docs.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-16 w-16" />}
            title="No documents yet"
            description={
              search || statusFilter !== 'all'
                ? 'No documents match your filters. Try adjusting your search criteria.'
                : 'Upload your first document to build a knowledge base for RAG-powered conversations.'
            }
            action={
              !search && statusFilter === 'all'
                ? { label: 'Upload Document', onClick: () => router.push('/rag/upload') }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc: RAGDocument) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onClick={(d) => {
                  if (d.status === 'needs_questions') {
                    router.push(`/rag/documents/${d.id}/questions`);
                  } else if (d.status === 'ready') {
                    router.push(`/rag/chat?documentId=${d.id}`);
                  } else if (d.status === 'processing') {
                    router.push(`/rag/documents/${d.id}/questions`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </RAGLayout>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/datasets/page.tsx` — same header + filters + grid + empty state pattern.

**Acceptance Criteria**:
1. Page renders at `/rag` with auth guard from dashboard layout
2. Documents load via `useRAGDocuments` hook and display in a card grid
3. Search input filters documents by name
4. Status dropdown filters by document status
5. Empty state displays when no documents exist, with CTA to upload
6. Clicking a document navigates based on its status

**Verification Steps**:
1. Navigate to `/rag` — page renders with header and upload button
2. With no documents, empty state shows "No documents yet" with upload CTA
3. Upload a document, return to dashboard — document card appears
4. Type in search field — grid filters in real-time
5. Select a status filter — grid shows only matching documents

---

### FR-8.2: Document Upload Page (`/rag/upload`)

**Type**: Page

**Description**: Upload interface with drag-and-drop, file validation, description input, fast mode toggle, and processing trigger.

**Implementation Strategy**: NEW build

**File**: `src/app/(dashboard)/rag/upload/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RAGLayout } from '@/components/rag/RAGLayout';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RAGUploadPage() {
  const router = useRouter();

  return (
    <RAGLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/rag')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
          <h1 className="text-3xl font-bold">Upload Document</h1>
          <p className="text-muted-foreground">
            Add a document to your knowledge base for RAG-powered conversations
          </p>
        </div>

        {/* Uploader Component */}
        <DocumentUploader
          onUploadComplete={(documentId) => {
            router.push(`/rag/documents/${documentId}/questions`);
          }}
        />
      </div>
    </RAGLayout>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/upload/page.tsx` — back button + header + upload component pattern.

**Acceptance Criteria**:
1. Page renders at `/rag/upload` with back navigation to `/rag`
2. `DocumentUploader` component handles the full upload flow
3. After successful upload, redirects to the questions page for the new document

**Verification Steps**:
1. Navigate to `/rag/upload` — page renders with back button and uploader
2. Click "Back to Knowledge Base" — navigates to `/rag`
3. Upload a file — on completion, redirects to `/rag/documents/[id]/questions`

---

### FR-8.3: Expert Q&A Page (`/rag/documents/[id]/questions`)

**Type**: Page

**Description**: Displays LLM-generated clarification questions for a document. Users answer questions to improve RAG quality, or skip them.

**Implementation Strategy**: NEW build

**File**: `src/app/(dashboard)/rag/documents/[id]/questions/page.tsx`

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRAGDocument } from '@/hooks/use-rag-documents';
import { useExpertQuestions, useSubmitAnswers } from '@/hooks/use-rag-questions';
import { RAGLayout } from '@/components/rag/RAGLayout';
import { ExpertQAChat } from '@/components/rag/ExpertQAChat';
import { ProcessingStatus } from '@/components/rag/ProcessingStatus';
import { VerificationPanel } from '@/components/rag/VerificationPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/empty-states';
import { useState } from 'react';

export default function ExpertQAPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const { data: document, isLoading: docLoading } = useRAGDocument(documentId);
  const { data: questions, isLoading: questionsLoading } = useExpertQuestions(documentId);
  const { mutateAsync: submitAnswers, isPending: isSubmitting } = useSubmitAnswers();

  const [showVerification, setShowVerification] = useState(false);

  const isLoading = docLoading || questionsLoading;

  if (isLoading) {
    return (
      <RAGLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-96" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </RAGLayout>
    );
  }

  if (!document) {
    return (
      <RAGLayout>
        <EmptyState
          icon={<AlertCircle className="h-16 w-16 text-destructive" />}
          title="Document not found"
          description="The document you are looking for does not exist or has been removed."
          action={{ label: 'Back to Knowledge Base', onClick: () => router.push('/rag') }}
        />
      </RAGLayout>
    );
  }

  // If document is still processing, show processing status
  if (document.status === 'pending' || document.status === 'processing') {
    return (
      <RAGLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => router.push('/rag')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
          <h1 className="text-3xl font-bold">{document.name}</h1>
          <ProcessingStatus documentId={documentId} />
        </div>
      </RAGLayout>
    );
  }

  // If document is ready, redirect to chat
  if (document.status === 'ready') {
    router.push(`/rag/chat?documentId=${documentId}`);
    return null;
  }

  const handleSubmitAll = async (answers: Record<string, string>) => {
    await submitAnswers({ documentId, answers });
    router.push(`/rag/chat?documentId=${documentId}`);
  };

  return (
    <RAGLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/rag')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
          <h1 className="text-3xl font-bold">{document.name}</h1>
          <p className="text-muted-foreground">
            Answer these questions to help the system better understand your document.
            You can skip any question.
          </p>
        </div>

        {/* Expert Q&A Chat */}
        {!showVerification ? (
          <ExpertQAChat
            questions={questions || []}
            onSubmitAll={handleSubmitAll}
            onVerify={() => setShowVerification(true)}
            isSubmitting={isSubmitting}
          />
        ) : (
          <VerificationPanel
            documentId={documentId}
            onBack={() => setShowVerification(false)}
            onConfirm={() => {
              router.push(`/rag/chat?documentId=${documentId}`);
            }}
          />
        )}
      </div>
    </RAGLayout>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/pipeline/jobs/[jobId]/page.tsx` — dynamic route with param extraction and status-dependent rendering.

**Acceptance Criteria**:
1. Page renders at `/rag/documents/[id]/questions` with the document's name as heading
2. If document is processing, shows `ProcessingStatus` component
3. If document is ready, redirects to chat
4. Displays questions from `useExpertQuestions` in chat-style layout
5. "Submit All Answers" triggers `useSubmitAnswers` mutation and redirects to chat
6. "Verify" button switches to `VerificationPanel`

**Verification Steps**:
1. Navigate to `/rag/documents/[id]/questions` for a processing document — shows processing status
2. For a document with status `needs_questions` — shows question list
3. Answer questions and click "Submit All Answers" — redirects to chat
4. Click "Verify" — shows verification samples

---

### FR-8.4: RAG Chat Page (`/rag/chat`)

**Type**: Page

**Description**: Main chat interface with three-way mode selector, message list with citations and quality indicators, and input bar.

**Implementation Strategy**: NEW build

**File**: `src/app/(dashboard)/rag/chat/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRAGChat } from '@/hooks/use-rag-chat';
import { RAGLayout } from '@/components/rag/RAGLayout';
import { RAGChatInterface } from '@/components/rag/RAGChatInterface';
import { ModeSelector } from '@/components/rag/ModeSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/empty-states';
import type { RAGMode } from '@/types/rag';

export default function RAGChatPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');
  const [mode, setMode] = useState<RAGMode>('rag_only');

  const {
    messages,
    sendMessage,
    isLoading,
    isSending,
    error,
  } = useRAGChat({ documentId: documentId || undefined, mode });

  if (!documentId) {
    return (
      <RAGLayout>
        <EmptyState
          icon={<MessageSquare className="h-16 w-16" />}
          title="No document selected"
          description="Select a document from the Knowledge Base to start a conversation."
          action={{ label: 'Go to Knowledge Base', onClick: () => window.location.href = '/rag' }}
        />
      </RAGLayout>
    );
  }

  if (isLoading) {
    return (
      <RAGLayout>
        <div className="flex flex-col h-full space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex-1 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-3/4" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </RAGLayout>
    );
  }

  if (error) {
    return (
      <RAGLayout>
        <EmptyState
          icon={<AlertCircle className="h-16 w-16 text-destructive" />}
          title="Failed to load chat"
          description={error instanceof Error ? error.message : 'An unexpected error occurred'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </RAGLayout>
    );
  }

  return (
    <RAGLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Mode Selector */}
        <div className="pb-4 border-b">
          <ModeSelector value={mode} onChange={setMode} />
        </div>

        {/* Chat Interface */}
        <RAGChatInterface
          messages={messages}
          onSendMessage={(text) => sendMessage({ query: text, mode })}
          isSending={isSending}
        />
      </div>
    </RAGLayout>
  );
}
```

**Pattern Source**: `src/components/pipeline/chat/ChatMain.tsx` — flex column layout with header, message list, and input.

**Acceptance Criteria**:
1. Page renders at `/rag/chat?documentId=xxx`
2. Without `documentId`, shows empty state directing to Knowledge Base
3. Mode selector at top allows switching between RAG Only / LoRA Only / RAG + LoRA
4. Messages display with citations and quality score indicators
5. Input bar at bottom sends messages via `useRAGChat` hook
6. Loading and error states render appropriately

**Verification Steps**:
1. Navigate to `/rag/chat` without documentId — shows "No document selected" empty state
2. Navigate to `/rag/chat?documentId=xxx` — loads chat interface
3. Switch modes via selector — mode state updates
4. Type a message and send — message appears in list, assistant response follows
5. Assistant response shows expandable citations and quality dot

---

### FR-8.5: Quality Dashboard Page (`/rag/quality`)

**Type**: Page

**Description**: Quality monitoring dashboard with overall score, per-metric breakdown, mode comparison charts, query history, and trend lines.

**Implementation Strategy**: NEW build

**File**: `src/app/(dashboard)/rag/quality/page.tsx`

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useQualityMetrics, useQualityHistory } from '@/hooks/use-rag-quality';
import { RAGLayout } from '@/components/rag/RAGLayout';
import { QualityScoreCard } from '@/components/rag/QualityScoreCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/empty-states';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const METRIC_LABELS: Record<string, string> = {
  faithfulness: 'Faithfulness',
  relevance: 'Relevance',
  completeness: 'Completeness',
  coherence: 'Coherence',
  conciseness: 'Conciseness',
};

function scoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number): string {
  if (score >= 0.8) return 'bg-green-100 text-green-800';
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export default function QualityDashboardPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const { data: metrics, isLoading: metricsLoading } = useQualityMetrics(
    documentId || undefined
  );
  const { data: history, isLoading: historyLoading } = useQualityHistory(
    documentId || undefined
  );

  const isLoading = metricsLoading || historyLoading;

  if (isLoading) {
    return (
      <RAGLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </RAGLayout>
    );
  }

  if (!metrics) {
    return (
      <RAGLayout>
        <EmptyState
          icon={<TrendingUp className="h-16 w-16" />}
          title="No quality data yet"
          description="Quality metrics will appear after you start chatting with your documents."
          action={{ label: 'Start Chatting', onClick: () => window.location.href = '/rag' }}
        />
      </RAGLayout>
    );
  }

  const overallScore = metrics.overall_score ?? 0;
  const metricEntries = Object.entries(metrics.per_metric || {});

  // Build mode comparison data for bar chart
  const modeComparison = metrics.mode_comparison
    ? Object.entries(metrics.mode_comparison).map(([mode, scores]) => ({
        mode: mode === 'rag_only' ? 'RAG Only' : mode === 'lora_only' ? 'LoRA Only' : 'RAG + LoRA',
        ...(scores as Record<string, number>),
      }))
    : [];

  // Build trend data for line chart
  const trendData = (history || []).map((entry: any) => ({
    date: new Date(entry.created_at).toLocaleDateString(),
    score: entry.overall_score,
  }));

  // Query history table data
  const queryHistory = (history || []).slice(0, 20);

  return (
    <RAGLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Quality Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor retrieval and response quality across your knowledge base
          </p>
        </div>

        {/* Overall Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Overall Quality</p>
                <p className={`text-5xl font-bold ${scoreColor(overallScore)}`}>
                  {(overallScore * 100).toFixed(0)}%
                </p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      overallScore >= 0.8 ? 'bg-green-500' : overallScore >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${overallScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Metric Breakdown */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {metricEntries.map(([key, value]) => (
            <QualityScoreCard
              key={key}
              name={METRIC_LABELS[key] || key}
              score={value as number}
            />
          ))}
        </div>

        {/* Mode Comparison Bar Chart */}
        {modeComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mode Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modeComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mode" />
                  <YAxis domain={[0, 1]} />
                  <RechartsTooltip />
                  <Legend />
                  {Object.keys(METRIC_LABELS).map((metric, idx) => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      name={METRIC_LABELS[metric]}
                      fill={['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][idx]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Quality Trend Line Chart */}
        {trendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Quality Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 1]} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Query History Table */}
        {queryHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Query</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Mode</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Score</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryHistory.map((entry: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pr-4 max-w-xs truncate">{entry.query}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {entry.mode === 'rag_only' ? 'RAG' : entry.mode === 'lora_only' ? 'LoRA' : 'RAG+LoRA'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge className={scoreBg(entry.overall_score)}>
                            {(entry.overall_score * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RAGLayout>
  );
}
```

**Pattern Source**: `src/components/conversations/ConversationDashboard.tsx` — stats cards + table layout. `recharts` usage follows existing chart patterns in the codebase.

**Acceptance Criteria**:
1. Page renders at `/rag/quality` with overall score prominently displayed
2. Five metric cards show individual scores with color coding
3. Mode comparison bar chart renders when data is available
4. Quality trend line chart renders when sufficient history exists
5. Query history table shows recent queries with scores
6. Empty state when no quality data exists

**Verification Steps**:
1. Navigate to `/rag/quality` with no data — shows empty state
2. After chatting, navigate to `/rag/quality` — overall score and metric cards appear
3. After using multiple modes, bar chart shows mode comparison
4. After multiple queries, trend line and history table populate

---

### FR-8.6: DocumentCard Component

**Type**: UI Component

**Description**: Card displaying document information with status badge, file type icon, and click navigation.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/DocumentCard.tsx`

```tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileType,
  File,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { RAGDocument, DocumentStatus } from '@/types/rag';

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  needs_questions: {
    label: 'Needs Review',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <HelpCircle className="h-3 w-3" />,
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-red-500" />,
  docx: <FileType className="h-5 w-5 text-blue-500" />,
  txt: <File className="h-5 w-5 text-gray-500" />,
  md: <FileText className="h-5 w-5 text-purple-500" />,
};

interface DocumentCardProps {
  document: RAGDocument;
  onClick?: (document: RAGDocument) => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const statusInfo = STATUS_CONFIG[document.status] || STATUS_CONFIG.pending;
  const fileExtension = document.file_type?.toLowerCase() || 'txt';
  const fileIcon = FILE_TYPE_ICONS[fileExtension] || FILE_TYPE_ICONS.txt;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(document)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {fileIcon}
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{document.name}</CardTitle>
              <CardDescription className="text-sm">
                {fileExtension.toUpperCase()} document
              </CardDescription>
            </div>
          </div>
          <Badge className={statusInfo.className}>
            {statusInfo.icon}
            <span className="ml-1">{statusInfo.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {document.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {document.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(document.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Pattern Source**: `src/components/datasets/DatasetCard.tsx` — card with status badge, icon, description, and click handler.

**Acceptance Criteria**:
1. Renders document name, file type icon, status badge, description, and date
2. Status badge shows correct color and icon for each of the 5 statuses
3. Click handler fires with the document object
4. Long names truncate gracefully

---

### FR-8.7: DocumentUploader Component

**Type**: UI Component

**Description**: Drag-and-drop upload zone with file validation, description input, fast mode checkbox, and upload progress.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/DocumentUploader.tsx`

```tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useUploadDocument } from '@/hooks/use-rag-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Upload, FileText, X, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface DocumentUploaderProps {
  onUploadComplete: (documentId: string) => void;
}

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fastMode, setFastMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadDocument, isPending: isUploading } = useUploadDocument();

  const validateFile = useCallback((f: File): boolean => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error('Invalid file type', {
        description: `Accepted formats: PDF, DOCX, TXT, MD`,
      });
      return false;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 50 MB',
      });
      return false;
    }
    return true;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      if (validateFile(f)) {
        setFile(f);
      }
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleProcess = async () => {
    if (!file) return;

    try {
      setUploadProgress(10);
      const result = await uploadDocument({
        file,
        description: description || undefined,
        fastMode,
      });
      setUploadProgress(100);
      toast.success('Document uploaded', {
        description: 'Processing has started automatically.',
      });
      onUploadComplete(result.documentId);
    } catch (err) {
      setUploadProgress(0);
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${file ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setUploadProgress(0);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">
              Drop your document here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, DOCX, TXT, MD (max 50 MB)
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Progress value={uploadProgress} className="h-2" />
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          placeholder="Brief description of this document..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUploading}
        />
      </div>

      {/* Fast Mode */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="fastMode"
          checked={fastMode}
          onCheckedChange={(checked) => setFastMode(checked === true)}
          disabled={isUploading}
        />
        <Label htmlFor="fastMode" className="text-sm cursor-pointer">
          Fast mode
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            Skip expert review questions for faster processing. Slightly lower quality but good for rapid prototyping.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Process Button */}
      <Button
        onClick={handleProcess}
        disabled={!file || isUploading}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Process Document
          </>
        )}
      </Button>
    </div>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/upload/page.tsx` — drag-and-drop + file validation + progress pattern.

**Acceptance Criteria**:
1. Drag-and-drop zone accepts PDF, DOCX, TXT, MD files
2. File picker button opens file dialog with correct filters
3. Selected file shows name and size; can be removed
4. Description input is optional
5. Fast mode checkbox with tooltip explanation
6. "Process" button triggers upload and calls `onUploadComplete` with document ID
7. Progress bar shows during upload

---

### FR-8.8: ExpertQAChat Component

**Type**: UI Component

**Description**: Chat-style question-and-answer interface for the expert review flow.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/ExpertQAChat.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send, SkipForward, CheckCircle, Loader2 } from 'lucide-react';
import type { ExpertQuestion } from '@/types/rag';

const IMPACT_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: 'High Impact', className: 'bg-red-100 text-red-700' },
  medium: { label: 'Medium Impact', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low Impact', className: 'bg-blue-100 text-blue-700' },
};

interface ExpertQAChatProps {
  questions: ExpertQuestion[];
  onSubmitAll: (answers: Record<string, string>) => Promise<void>;
  onVerify: () => void;
  isSubmitting: boolean;
}

export function ExpertQAChat({ questions, onSubmitAll, onVerify, isSubmitting }: ExpertQAChatProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k].trim().length > 0
  ).length;
  const skippedCount = skipped.size;
  const totalCount = questions.length;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSkip = (questionId: string) => {
    setSkipped((prev) => new Set(prev).add(questionId));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleSubmitAll = async () => {
    const nonEmptyAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (v.trim()) nonEmptyAnswers[k] = v.trim();
    }
    await onSubmitAll(nonEmptyAnswers);
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{answeredCount} answered</span>
        <span>{skippedCount} skipped</span>
        <span>{totalCount - answeredCount - skippedCount} remaining</span>
        <div className="flex-1" />
        <span className="font-medium text-foreground">
          {answeredCount + skippedCount} / {totalCount}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((answeredCount + skippedCount) / Math.max(totalCount, 1)) * 100}%` }}
        />
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {questions.map((question) => {
          const impactInfo = IMPACT_CONFIG[question.impact] || IMPACT_CONFIG.medium;
          const isSkippedQ = skipped.has(question.id);
          const hasAnswer = (answers[question.id] || '').trim().length > 0;

          return (
            <Card
              key={question.id}
              className={isSkippedQ ? 'opacity-50' : ''}
            >
              <CardContent className="pt-4 space-y-3">
                {/* Question bubble (left-aligned, LLM style) */}
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={impactInfo.className}>
                        {impactInfo.label}
                      </Badge>
                      {hasAnswer && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{question.question}</p>
                    {question.context && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {question.context}
                      </p>
                    )}
                  </div>
                </div>

                {/* Answer input (right-aligned, user style) */}
                {!isSkippedQ && (
                  <div className="pl-4">
                    <Textarea
                      placeholder="Type your answer..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-[60px] resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Skip button */}
                <div className="flex justify-end gap-2">
                  {!isSkippedQ ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSkip(question.id)}
                      disabled={isSubmitting}
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSkipped((prev) => {
                          const next = new Set(prev);
                          next.delete(question.id);
                          return next;
                        });
                      }}
                      disabled={isSubmitting}
                    >
                      Unskip
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-4">
        <Button
          variant="outline"
          onClick={onVerify}
          disabled={isSubmitting || answeredCount === 0}
        >
          Verify Samples
        </Button>
        <Button
          onClick={handleSubmitAll}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit All Answers
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/chat/ChatInput.tsx` — textarea + button pattern with disabled states.

**Acceptance Criteria**:
1. Renders each question with impact badge, question text, and context
2. Each question has a text area for the user's answer
3. Skip button marks question as skipped (dimmed)
4. Progress bar shows completion (answered + skipped) / total
5. "Submit All Answers" fires `onSubmitAll` with non-empty answers
6. "Verify Samples" button triggers verification flow

---

### FR-8.9: VerificationPanel Component

**Type**: UI Component

**Description**: Shows sample Q&A pairs for user verification before finalizing expert answers.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/VerificationPanel.tsx`

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface VerificationSample {
  question: string;
  proposedAnswer: string;
}

interface VerificationPanelProps {
  documentId: string;
  onBack: () => void;
  onConfirm: () => void;
}

// TODO: Phase 1 — verification samples are generated server-side.
// For now, this uses placeholder data or fetches from the verification endpoint.
export function VerificationPanel({ documentId, onBack, onConfirm }: VerificationPanelProps) {
  const [verdicts, setVerdicts] = useState<Record<number, 'correct' | 'needs_improvement'>>({});

  // Placeholder samples — in production these come from an API call
  const samples: VerificationSample[] = [
    {
      question: 'Based on the document, what is the primary topic covered?',
      proposedAnswer: 'The system will generate this answer from your document and expert responses.',
    },
    {
      question: 'What are the key entities mentioned in the document?',
      proposedAnswer: 'The system will generate this answer from your document and expert responses.',
    },
    {
      question: 'How does the document describe the main process or workflow?',
      proposedAnswer: 'The system will generate this answer from your document and expert responses.',
    },
  ];

  const allReviewed = Object.keys(verdicts).length === samples.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Questions
        </Button>
        <h2 className="text-xl font-semibold">Verify Sample Responses</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Review these sample question-answer pairs generated from your document and expert answers.
        Mark each as correct or needing improvement.
      </p>

      <div className="space-y-4">
        {samples.map((sample, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Sample {idx + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Question</p>
                <p className="text-sm">{sample.question}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Proposed Answer</p>
                <p className="text-sm bg-muted p-3 rounded-md">{sample.proposedAnswer}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={verdicts[idx] === 'correct' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVerdicts((prev) => ({ ...prev, [idx]: 'correct' }))}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Looks Correct
                </Button>
                <Button
                  variant={verdicts[idx] === 'needs_improvement' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setVerdicts((prev) => ({ ...prev, [idx]: 'needs_improvement' }))}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Needs Improvement
                </Button>
                {verdicts[idx] && (
                  <Badge variant="outline" className="ml-2">
                    {verdicts[idx] === 'correct' ? 'Approved' : 'Flagged'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={onConfirm} disabled={!allReviewed} className="w-full">
        Confirm and Continue to Chat
      </Button>
    </div>
  );
}
```

**Acceptance Criteria**:
1. Shows 2-3 sample Q&A pairs
2. Each sample has "Looks Correct" and "Needs Improvement" buttons
3. Verdict state tracked per sample
4. "Confirm" button disabled until all samples reviewed
5. Back button returns to questions view

---

### FR-8.10: RAGChatInterface Component

**Type**: UI Component

**Description**: Chat message list with user/assistant messages, citations, quality indicators, and auto-scroll.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/RAGChatInterface.tsx`

```tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SourceCitation } from '@/components/rag/SourceCitation';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import type { RAGMessage } from '@/types/rag';

function QualityDot({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;
  const color =
    score >= 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      title={`Quality: ${(score * 100).toFixed(0)}%`}
    />
  );
}

interface RAGChatInterfaceProps {
  messages: RAGMessage[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

export function RAGChatInterface({
  messages,
  onSendMessage,
  isSending,
}: RAGChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isSending && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3" />
            <p className="text-sm">Ask a question about your document</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {/* Message text */}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Assistant extras */}
              {msg.role === 'assistant' && (
                <div className="mt-2 space-y-2">
                  {/* Quality score dot */}
                  <div className="flex items-center gap-2">
                    <QualityDot score={msg.quality_score} />
                    {msg.quality_score !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {(msg.quality_score * 100).toFixed(0)}% quality
                      </span>
                    )}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Sources:</p>
                      {msg.citations.map((citation, cidx) => (
                        <SourceCitation key={cidx} citation={citation} index={cidx + 1} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Sending indicator */}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your document..."
            disabled={isSending}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="default"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/chat/ChatMain.tsx` + `ChatInput.tsx` + `ChatMessageList.tsx` — message list with scroll + input bar + send button pattern.

**Acceptance Criteria**:
1. User messages right-aligned with primary color, assistant messages left-aligned with muted background
2. Auto-scrolls to bottom on new messages
3. Animated dots indicator while response is generating
4. Empty state shows "Ask a question about your document"
5. Enter sends message, Shift+Enter adds newline
6. Assistant messages show quality dot and expandable citations
7. Input disabled while sending

---

### FR-8.11: SourceCitation Component

**Type**: UI Component

**Description**: Collapsible citation card showing source section title and text snippet.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/SourceCitation.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Citation {
  section_title?: string;
  content: string;
  section_number?: number;
}

interface SourceCitationProps {
  citation: Citation;
  index: number;
}

export function SourceCitation({ citation, index }: SourceCitationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const snippet =
    citation.content.length > 120
      ? citation.content.slice(0, 120) + '...'
      : citation.content;

  return (
    <div
      className="border rounded-md p-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-2">
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {citation.section_number ?? index}
        </Badge>
        <span className="font-medium truncate">
          {citation.section_title || `Source ${index}`}
        </span>
      </div>
      {isExpanded ? (
        <p className="mt-2 text-muted-foreground whitespace-pre-wrap pl-5">
          {citation.content}
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground truncate pl-5">{snippet}</p>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
1. Shows section number badge, section title, and text snippet when collapsed
2. Clicking expands to show full content
3. Collapsed state truncates long content with ellipsis

---

### FR-8.12: ModeSelector Component

**Type**: UI Component

**Description**: Three-way segmented control for selecting RAG mode.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/ModeSelector.tsx`

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Database, Cpu, Layers } from 'lucide-react';
import type { RAGMode } from '@/types/rag';

const MODE_CONFIG: Record<RAGMode, { label: string; icon: React.ReactNode; tooltip: string }> = {
  rag_only: {
    label: 'RAG Only',
    icon: <Database className="h-4 w-4" />,
    tooltip: 'Retrieve answers from your document using vector search and contextual retrieval.',
  },
  lora_only: {
    label: 'LoRA Only',
    icon: <Cpu className="h-4 w-4" />,
    tooltip: 'Use a fine-tuned model trained on your document. No retrieval — relies on learned knowledge.',
  },
  rag_plus_lora: {
    label: 'RAG + LoRA',
    icon: <Layers className="h-4 w-4" />,
    tooltip: 'Combine retrieval with a fine-tuned model for the highest quality answers.',
  },
};

interface ModeSelectorProps {
  value: RAGMode;
  onChange: (mode: RAGMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as RAGMode)}>
      <TabsList>
        {(Object.keys(MODE_CONFIG) as RAGMode[]).map((mode) => {
          const config = MODE_CONFIG[mode];
          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <TabsTrigger value={mode} className="gap-2">
                  {config.icon}
                  {config.label}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">{config.tooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
```

**Pattern Source**: `src/components/ui/tabs.tsx` — uses the existing shadcn Tabs component for segmented control.

**Acceptance Criteria**:
1. Three tabs: "RAG Only", "LoRA Only", "RAG + LoRA"
2. Each tab has an icon and label
3. Tooltips explain each mode on hover
4. `onChange` fires with the selected `RAGMode` value
5. Active tab visually highlighted

---

### FR-8.13: QualityScoreCard Component

**Type**: UI Component

**Description**: Displays a single quality metric name and score with color coding and progress bar.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/QualityScoreCard.tsx`

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface QualityScoreCardProps {
  name: string;
  score: number;
  comparisonScores?: Record<string, number>;
}

export function QualityScoreCard({ name, score, comparisonScores }: QualityScoreCardProps) {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.8 ? 'text-green-600' : score >= 0.5 ? 'text-yellow-600' : 'text-red-600';
  const barColor =
    score >= 0.8
      ? '[&_[data-slot=progress-indicator]]:bg-green-500'
      : score >= 0.5
        ? '[&_[data-slot=progress-indicator]]:bg-yellow-500'
        : '[&_[data-slot=progress-indicator]]:bg-red-500';

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">{name}</p>
        <p className={`text-2xl font-bold ${color}`}>{percentage}%</p>
        <Progress value={percentage} className={`h-2 ${barColor}`} />
        {comparisonScores && (
          <div className="space-y-1 pt-1">
            {Object.entries(comparisonScores).map(([mode, s]) => (
              <div key={mode} className="flex justify-between text-xs text-muted-foreground">
                <span>{mode}</span>
                <span>{Math.round(s * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria**:
1. Shows metric name and score as percentage
2. Color coded: green >= 80%, yellow >= 50%, red < 50%
3. Progress bar visually represents the score
4. Optional comparison mode shows per-mode scores

---

### FR-8.14: ProcessingStatus Component

**Type**: UI Component

**Description**: Shows document processing progress with animated step indicator and polling.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/ProcessingStatus.tsx`

```tsx
'use client';

import { useRAGDocument } from '@/hooks/use-rag-documents';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Circle } from 'lucide-react';

const STEPS = [
  { key: 'uploading', label: 'Uploading document' },
  { key: 'reading', label: 'Reading document' },
  { key: 'extracting', label: 'Extracting knowledge' },
  { key: 'embedding', label: 'Generating embeddings' },
  { key: 'ready', label: 'Ready' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 2;
    case 'needs_questions':
      return 3;
    case 'ready':
      return 4;
    case 'error':
      return -1;
    default:
      return 0;
  }
}

interface ProcessingStatusProps {
  documentId: string;
}

export function ProcessingStatus({ documentId }: ProcessingStatusProps) {
  // Poll every 3 seconds while processing
  const { data: document } = useRAGDocument(documentId, {
    refetchInterval: 3000,
  });

  const currentStep = getStepIndex(document?.status || 'pending');
  const isError = document?.status === 'error';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {isError ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Circle className="h-6 w-6 text-red-500" />
              </div>
              <p className="font-medium text-red-600">Processing failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                {document?.error_message || 'An error occurred during processing.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {STEPS.map((step, idx) => {
                const isComplete = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isComplete
                          ? 'text-muted-foreground line-through'
                          : isCurrent
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground/50'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Pattern Source**: `src/components/progress-indicator.tsx` — step-based progress display pattern.

**Acceptance Criteria**:
1. Shows 5 steps: Uploading, Reading, Extracting, Generating embeddings, Ready
2. Completed steps show green checkmark and strikethrough
3. Current step shows spinning loader and bold text
4. Future steps are dimmed
5. Polls document status every 3 seconds via `useRAGDocument` with `refetchInterval`
6. Error state shows error message

---

### FR-8.15: RAGLayout Component

**Type**: UI Component

**Description**: Sidebar navigation layout for the RAG section with responsive design.

**Implementation Strategy**: NEW build

**File**: `src/components/rag/RAGLayout.tsx`

```tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Upload,
  MessageSquare,
  BarChart3,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

const NAV_ITEMS = [
  { href: '/rag', label: 'Dashboard', icon: BookOpen, exact: true },
  { href: '/rag/upload', label: 'Upload', icon: Upload, exact: true },
  { href: '/rag/chat', label: 'Chat', icon: MessageSquare, exact: false },
  { href: '/rag/quality', label: 'Quality', icon: BarChart3, exact: false },
];

interface RAGLayoutProps {
  children: React.ReactNode;
}

export function RAGLayout({ children }: RAGLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const sidebarContent = (
    <nav className="space-y-1 p-4">
      {/* Back to main app */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="w-full justify-start mb-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Main Dashboard
        </Button>
      </Link>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        Knowledge Base
      </p>

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={active ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start',
                active ? '' : 'text-muted-foreground'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-56 border-r flex-shrink-0">
          {sidebarContent}
        </aside>

        {/* Mobile Menu Button */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative w-56 bg-background border-r h-full">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/components/conversations/DashboardLayout.tsx` — layout wrapper pattern with sidebar.

**Acceptance Criteria**:
1. Sidebar with 4 navigation links: Dashboard, Upload, Chat, Quality
2. Active link visually highlighted (default variant)
3. "Main Dashboard" back link at top of sidebar
4. Responsive: sidebar hidden on mobile, replaced with hamburger menu
5. Mobile overlay closes on backdrop click or nav link click
6. Content area fills remaining space

---

## Section Summary

**What Was Added**:
- 5 new pages: `src/app/(dashboard)/rag/page.tsx`, `src/app/(dashboard)/rag/upload/page.tsx`, `src/app/(dashboard)/rag/documents/[id]/questions/page.tsx`, `src/app/(dashboard)/rag/chat/page.tsx`, `src/app/(dashboard)/rag/quality/page.tsx`
- 10 new components: `DocumentCard.tsx`, `DocumentUploader.tsx`, `ExpertQAChat.tsx`, `VerificationPanel.tsx`, `RAGChatInterface.tsx`, `SourceCitation.tsx`, `ModeSelector.tsx`, `QualityScoreCard.tsx`, `ProcessingStatus.tsx`, `RAGLayout.tsx`

**What Was Reused**:
- All shadcn/UI primitives (`Card`, `Badge`, `Button`, `Tabs`, `Progress`, `Collapsible`, `Tooltip`, `Checkbox`, `Input`, `Textarea`, `Select`, `Label`, `Skeleton`)
- `EmptyState` component from `@/components/empty-states`
- `lucide-react` icons
- `sonner` toast notifications
- `recharts` for charts (BarChart, LineChart)
- Dashboard layout auth guard from `src/app/(dashboard)/layout.tsx`
- `cn` utility from `@/components/ui/utils`

**Integration Points**:
- Pages consume hooks from Section 7 (`useRAGDocuments`, `useRAGDocument`, `useUploadDocument`, `useExpertQuestions`, `useSubmitAnswers`, `useRAGChat`, `useQualityMetrics`, `useQualityHistory`)
- Hooks call API routes from Section 6
- Types from Section 4 (`RAGDocument`, `RAGMessage`, `ExpertQuestion`, `QualityMetrics`, `DocumentStatus`, `RAGMode`)
- All pages rendered within the `(dashboard)` route group, inheriting auth protection
- `RAGLayout` provides sidebar navigation across all RAG pages
