# RAG Frontier - Execution Prompt E08: UI Components Part 1

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E08 - UI Components Part 1
**Prerequisites:** E01-E07 complete ✅ (database, types, services, API routes, hooks)
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E07 complete), verified all hook exports and signatures, confirmed shadcn/ui components available, corrected type constant name from `DOCUMENT_STATUS_DISPLAY` to `RAG_STATUS_DISPLAY`, added all hooks created in E07 (including useExpertQA, useRAGChat, useRAGQuality not mentioned in v1), noted useReprocessDocument hook availability

---

## Overview

This prompt creates the first set of UI components for the RAG Frontier module: knowledge base dashboard, document uploader, processing status, and document detail view.

**What This Section Creates:**
1. `src/components/rag/KnowledgeBaseDashboard.tsx` — Lists knowledge bases, create new, select active
2. `src/components/rag/CreateKnowledgeBaseDialog.tsx` — Modal dialog for creating a new KB
3. `src/components/rag/DocumentUploader.tsx` — File upload with drag-and-drop, progress, type validation
4. `src/components/rag/DocumentList.tsx` — List of documents with status badges and actions
5. `src/components/rag/DocumentStatusBadge.tsx` — Color-coded status badge component
6. `src/components/rag/DocumentDetail.tsx` — Document detail view with sections, facts, metadata

**What This Section Does NOT Change:**
- No database, types, services, API routes, or hooks
- No chat, Q&A, or quality components (E09)
- No pages or navigation (E10)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`

### Confirmed Infrastructure ✅
- **shadcn/ui components**: All required components already installed (dialog, switch, badge, textarea, label, button, card, input)
- **Icons**: lucide-react available
- **Toast**: sonner installed and working
- **React Query**: v5 configured in layout

---

========================


# EXECUTION PROMPT E08: UI Components Part 1

## Your Mission

Create the first batch of UI components for the RAG Frontier module in a Next.js 14 / TypeScript application using shadcn/ui + Tailwind CSS. These components handle knowledge base management, document upload, and document detail viewing. 

---

## Context: Current State

### E07 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**

#### All 5 Hook Files Created:

1. **`src/hooks/useRAGKnowledgeBases.ts`**
   - ✅ `ragKnowledgeBaseKeys` — Query key factory exported
   - ✅ `useRAGKnowledgeBases()` — Returns `{ data: RAGKnowledgeBase[], isLoading, error }`
   - ✅ `useCreateKnowledgeBase()` — Mutation hook, accepts `{ name: string; description?: string }`

2. **`src/hooks/useRAGDocuments.ts`**
   - ✅ `ragDocumentKeys` — Query key factory exported
   - ✅ `useRAGDocuments(knowledgeBaseId: string)` — Returns `{ data: RAGDocument[], isLoading, error }`
   - ✅ `useRAGDocumentDetail(documentId: string)` — Returns `{ data: { document: RAGDocument; sections: RAGSection[]; facts: RAGFact[] }, isLoading, error }`
   - ✅ `useCreateDocument()` — Mutation hook, accepts `{ knowledgeBaseId, fileName, fileType, description?, fastMode? }`
   - ✅ `useUploadDocument()` — Mutation hook, accepts `{ documentId: string; file: File }`
   - ✅ `useReprocessDocument()` — Mutation hook, accepts `documentId: string`
   - ✅ `useDeleteDocument(knowledgeBaseId: string)` — Mutation hook, accepts `documentId: string`

3. **`src/hooks/useExpertQA.ts`** (not needed for E08, but exists)
   - ✅ `expertQAKeys` — Query key factory exported
   - ✅ `useExpertQuestions(documentId, includeAnswered?)` — Returns `{ data: RAGExpertQuestion[], isLoading, error }`
   - ✅ `useSubmitAnswer(documentId)` — Mutation hook
   - ✅ `useSkipQuestion(documentId)` — Mutation hook
   - ✅ `useVerifyDocument()` — Mutation hook

4. **`src/hooks/useRAGChat.ts`** (not needed for E08, but exists)
   - ✅ `ragChatKeys` — Query key factory exported
   - ✅ `useRAGQuery()` — Mutation hook for RAG queries
   - ✅ `useRAGQueryHistory(documentId?, knowledgeBaseId?)` — Returns `{ data: RAGQuery[], isLoading, error }`

5. **`src/hooks/useRAGQuality.ts`** (not needed for E08, but exists)
   - ✅ `ragQualityKeys` — Query key factory exported
   - ✅ `useRAGQualityScores(documentId?)` — Returns `{ data: RAGQualityScore[], isLoading, error }`
   - ✅ `useRAGQualitySummary(documentId)` — Returns quality summary
   - ✅ `useEvaluateQuery()` — Mutation hook

### E02 Completion Status ✅

**Types available from `@/types/rag`:**
- ✅ `RAGKnowledgeBase` — Interface with `id`, `name`, `description`, `documentCount`, etc.
- ✅ `RAGDocument` — Interface with `id`, `fileName`, `fileType`, `status`, `documentSummary`, `topicTaxonomy`, `entityList`, `sectionCount`, `factCount`, `questionCount`, etc.
- ✅ `RAGSection` — Interface with `id`, `sectionIndex`, `title`, `summary`, `contextualPreamble`, etc.
- ✅ `RAGFact` — Interface with `id`, `factType`, `content`, `sourceText`, `confidence`, etc.
- ✅ `RAGDocumentStatus` — Type: `'uploading'` | `'processing'` | `'awaiting_questions'` | `'ready'` | `'error'` | `'archived'`
- ✅ `RAGDocumentFileType` — Type: `'pdf'` | `'docx'` | `'txt'` | `'md'`
- ✅ `RAGEntityItem` — Interface with `name: string; type: string; description: string`
- ✅ `RAG_STATUS_DISPLAY` — Constant: `Record<RAGDocumentStatus, string>` with display labels

**CRITICAL**: The constant is `RAG_STATUS_DISPLAY`, not `DOCUMENT_STATUS_DISPLAY`.

### Existing Component Patterns (MUST follow exactly)

From existing components in `src/components/`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Upload, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
```

**Key conventions:**
- `'use client'` directive on all components
- **Named exports** (not default)
- Props interface: `interface {ComponentName}Props { ... }`
- shadcn/ui imports from `@/components/ui/`
- Icons from `lucide-react`
- Toast from `sonner`
- Loading: `<Loader2 className="h-4 w-4 animate-spin" />`
- Tailwind only (no CSS modules)
- Container: `<div className="space-y-6">` for vertical layouts
- Grid: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`

---

## Phase 1: Status Badge

### Task 1: Create Document Status Badge

**File:** `src/components/rag/DocumentStatusBadge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import type { RAGDocumentStatus } from '@/types/rag';

interface DocumentStatusBadgeProps {
  status: RAGDocumentStatus;
}

const statusConfig: Record<RAGDocumentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploading: { label: 'Uploading', variant: 'outline' },
  processing: { label: 'Processing', variant: 'secondary' },
  awaiting_questions: { label: 'Awaiting Q&A', variant: 'default' },
  ready: { label: 'Ready', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'outline' },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className={status === 'ready' ? 'bg-green-600 hover:bg-green-700' : status === 'processing' ? 'bg-blue-600 hover:bg-blue-700 text-white' : status === 'awaiting_questions' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}>
      {config.label}
    </Badge>
  );
}
```

**Pattern Source**: `src/components/pipeline/` — Badge usage and status display pattern

**Note**: statusConfig includes all 6 status values (including `'archived'`).

---

## Phase 2: Knowledge Base Components

### Task 2: Create Knowledge Base Dashboard

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Database, FileText } from 'lucide-react';
import { useRAGKnowledgeBases } from '@/hooks/useRAGKnowledgeBases';
import type { RAGKnowledgeBase } from '@/types/rag';
import { CreateKnowledgeBaseDialog } from './CreateKnowledgeBaseDialog';

interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}

export function KnowledgeBaseDashboard({ onSelectKnowledgeBase, selectedId }: KnowledgeBaseDashboardProps) {
  const [showCreate, setShowCreate] = useState(false);
  const { data: knowledgeBases, isLoading, error } = useRAGKnowledgeBases();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading knowledge bases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load knowledge bases: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Bases</h3>
          <p className="text-sm text-muted-foreground">Select a knowledge base or create a new one</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Knowledge Base
        </Button>
      </div>

      {(!knowledgeBases || knowledgeBases.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No knowledge bases yet.</p>
            <p className="text-sm text-muted-foreground text-center mt-1">Create one to start uploading documents.</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Knowledge Base
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              className={`cursor-pointer transition-colors hover:border-primary ${selectedId === kb.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => onSelectKnowledgeBase(kb)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{kb.name}</CardTitle>
                {kb.description && (
                  <CardDescription className="text-sm">{kb.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateKnowledgeBaseDialog
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/` — Card grid layout, loading/error/empty states

---

### Task 3: Create Knowledge Base Dialog

**File:** `src/components/rag/CreateKnowledgeBaseDialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateKnowledgeBase } from '@/hooks/useRAGKnowledgeBases';

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKnowledgeBaseDialog({ open, onOpenChange }: CreateKnowledgeBaseDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateKnowledgeBase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success('Knowledge base created');
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create knowledge base');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              A knowledge base is a collection of documents that the RAG system can search and reason over.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kb-name">Name</Label>
              <Input
                id="kb-name"
                placeholder="e.g., Product Documentation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-description">Description (optional)</Label>
              <Textarea
                id="kb-description"
                placeholder="What kind of documents will this contain?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Pattern Source**: `src/components/` — Dialog usage pattern with form

---

## Phase 3: Document Components

### Task 4: Create Document Uploader

**File:** `src/components/rag/DocumentUploader.tsx`

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDocument, useUploadDocument } from '@/hooks/useRAGDocuments';

interface DocumentUploaderProps {
  knowledgeBaseId: string;
}

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
} as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploader({ knowledgeBaseId }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fastMode, setFastMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDoc = useCreateDocument();
  const uploadDoc = useUploadDocument();

  const getFileType = (file: File): string => {
    const mimeType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (mimeType) return mimeType;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['pdf', 'docx', 'txt', 'md'].includes(ext)) return ext;
    return '';
  };

  const validateFile = (file: File): string | null => {
    const fileType = getFileType(file);
    if (!fileType) return `Unsupported file type. Accepted: PDF, DOCX, TXT, MD`;
    if (file.size > MAX_FILE_SIZE) return `File too large. Maximum: 50MB`;
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;

    const fileType = getFileType(file);
    if (!fileType) {
      toast.error('Invalid file type');
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Create document record
      const doc = await createDoc.mutateAsync({
        knowledgeBaseId,
        fileName: file.name,
        fileType,
        description: description.trim() || undefined,
        fastMode,
      });

      // Step 2: Upload file and trigger processing
      await uploadDoc.mutateAsync({ documentId: doc.id, file });

      toast.success(`"${file.name}" uploaded and processing started`);
      setFile(null);
      setDescription('');
      setFastMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Drop a document here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, TXT, or MD — up to 50MB</p>
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = '';
        }}
      />

      {/* Options */}
      {file && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea
              id="doc-description"
              placeholder="Brief description of this document's content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fast-mode">Fast Mode</Label>
              <p className="text-xs text-muted-foreground">Skip expert Q&A — go straight to ready</p>
            </div>
            <Switch
              id="fast-mode"
              checked={fastMode}
              onCheckedChange={setFastMode}
            />
          </div>

          <Button onClick={handleUpload} disabled={isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Pattern Source**: `src/components/` — Form/upload pattern with shadcn/ui

**Note**: The upload is a two-step process: (1) create document record, (2) upload file. Both hooks return promises and can be awaited.

---

### Task 5: Create Document List

**File:** `src/components/rag/DocumentList.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Trash2, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRAGDocuments, useDeleteDocument, useReprocessDocument } from '@/hooks/useRAGDocuments';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { RAGDocument } from '@/types/rag';

interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  selectedId?: string;
}

export function DocumentList({ knowledgeBaseId, onSelectDocument, selectedId }: DocumentListProps) {
  const { data: documents, isLoading, error } = useRAGDocuments(knowledgeBaseId);
  const deleteMutation = useDeleteDocument(knowledgeBaseId);
  const reprocessMutation = useReprocessDocument();

  const handleDelete = async (e: React.MouseEvent, doc: RAGDocument) => {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast.success(`"${doc.fileName}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleReprocess = async (e: React.MouseEvent, doc: RAGDocument) => {
    e.stopPropagation();
    try {
      await reprocessMutation.mutateAsync(doc.id);
      toast.success(`Reprocessing "${doc.fileName}"...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reprocess');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-4">Failed to load documents: {error.message}</p>;
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No documents yet. Upload one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedId === doc.id ? 'border-primary bg-primary/5' : ''}`}
          onClick={() => onSelectDocument(doc)}
        >
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.sectionCount ?? 0} sections · {doc.factCount ?? 0} facts
                  {doc.description && ` · ${doc.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DocumentStatusBadge status={doc.status} />
              {doc.status === 'error' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleReprocess(e, doc)}
                  disabled={reprocessMutation.isPending}
                  title="Retry processing"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(e, doc)}
                disabled={deleteMutation.isPending}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/` — List with actions pattern

**Note**: Uses `useReprocessDocument()` hook created in E07 for retry button on error status.

---

### Task 6: Create Document Detail

**File:** `src/components/rag/DocumentDetail.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Layers, Lightbulb, Tags } from 'lucide-react';
import { useRAGDocumentDetail } from '@/hooks/useRAGDocuments';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const { data, isLoading, error } = useRAGDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive py-4">Failed to load document details.</p>;
  }

  const { document: doc, sections, facts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {doc.fileName}
          </h3>
          {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>

      {/* Summary */}
      {doc.documentSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Document Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{doc.documentSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Topics & Entities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doc.topicTaxonomy && doc.topicTaxonomy.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Tags className="h-4 w-4" /> Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {doc.topicTaxonomy.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {doc.entityList && doc.entityList.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Key Entities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {doc.entityList.slice(0, 10).map((entity, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{entity.name}</span>
                  <span className="text-muted-foreground ml-1">({entity.type})</span>
                </div>
              ))}
              {doc.entityList.length > 10 && (
                <p className="text-xs text-muted-foreground">+{doc.entityList.length - 10} more</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Layers className="h-4 w-4" /> Sections ({sections.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="border-l-2 border-muted pl-3">
                <p className="font-medium text-sm">{section.title || `Section ${section.sectionIndex}`}</p>
                {section.summary && (
                  <p className="text-sm text-muted-foreground mt-1">{section.summary}</p>
                )}
                {section.contextualPreamble && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                    Context: {section.contextualPreamble}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Facts */}
      {facts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Lightbulb className="h-4 w-4" /> Facts ({facts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {facts.slice(0, 20).map((fact) => (
              <div key={fact.id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  {fact.factType.replace('_', ' ')}
                </Badge>
                <span>{fact.content}</span>
              </div>
            ))}
            {facts.length > 20 && (
              <p className="text-xs text-muted-foreground">+{facts.length - 20} more facts</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Type</p>
              <p className="font-medium">{doc.fileType.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sections</p>
              <p className="font-medium">{doc.sectionCount ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Facts</p>
              <p className="font-medium">{doc.factCount ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Questions</p>
              <p className="font-medium">{doc.questionCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/` — Detail view pattern with cards

**Note**: `useRAGDocumentDetail` returns `{ document, sections, facts }` — destructure from `data`.

---

## Verification

### Step 1: Create Component Directory

```bash
mkdir -p src/components/rag
```

### Step 2: TypeScript Check (after creating components)

Since `npx tsc --noEmit` doesn't work directly, check for errors by attempting to import:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/components/rag/
```

**Expected 6 files:**
- `KnowledgeBaseDashboard.tsx`
- `CreateKnowledgeBaseDialog.tsx`
- `DocumentUploader.tsx`
- `DocumentList.tsx`
- `DocumentStatusBadge.tsx`
- `DocumentDetail.tsx`

### Step 3: Check Linter

Components won't be visible until pages are created in E10, but should have no linter errors.

---

## Success Criteria

- [ ] All 6 component files created in `src/components/rag/`
- [ ] All components use `'use client'` directive
- [ ] All components use named exports
- [ ] All components follow shadcn/ui + Tailwind patterns
- [ ] DocumentUploader supports drag-and-drop and file validation
- [ ] DocumentList shows status badges and action buttons (including reprocess button)
- [ ] DocumentDetail shows summary, topics, sections, facts, metadata
- [ ] No TypeScript or linter errors
- [ ] All imports from hooks match E07 exports exactly

---

## What's Next

**E09** will create the remaining components: ExpertQAPanel, RAGChat, SourceCitation, ModeSelector, and QualityDashboard.

---

## If Something Goes Wrong

### Missing shadcn/ui Components
- **SHOULD NOT HAPPEN** — All required components verified as installed: `dialog`, `switch`, `badge`, `textarea`, `label`, `button`, `card`, `input`
- If errors occur, list what's in `src/components/ui/` and verify imports

### Import Errors for Hooks
- Verify hook files from E07 exist in `src/hooks/`:
  - `useRAGKnowledgeBases.ts`
  - `useRAGDocuments.ts`
  - `useExpertQA.ts`
  - `useRAGChat.ts`
  - `useRAGQuality.ts`
- Check that hook exports match what components import

### Type Errors
- All types verified in `src/types/rag.ts`:
  - `RAGKnowledgeBase`, `RAGDocument`, `RAGSection`, `RAGFact`
  - `RAGDocumentStatus`, `RAGDocumentFileType`
  - `RAGEntityItem`
  - `RAG_STATUS_DISPLAY` (not `DOCUMENT_STATUS_DISPLAY`)

### DocumentStatusBadge Missing Status
- E08_v1 had incomplete statusConfig — only 5 statuses
- **FIXED in v2**: Added `'archived'` status to statusConfig

### FormData Upload Not Working
- Ensure `useUploadDocument` mutation receives `{ documentId, file }` object
- Do NOT set `Content-Type` header — browser sets it automatically with multipart boundary

---

## Notes for Agent

1. **Create the `src/components/rag/` directory first** — it doesn't exist yet.
2. **Create ALL 6 component files** in `src/components/rag/`.
3. **Toast notifications (`sonner`)** are used in components on mutation success/error.
4. **Loading/error/empty states** are required in every component that fetches data.
5. **Do NOT create pages** — those are E10.
6. **DocumentUploader** is a two-step upload: create document record, then upload file. Both are awaited in sequence.
7. **DocumentList** uses `useReprocessDocument()` hook (created in E07) for the retry button when status is 'error'.
8. **useRAGDocumentDetail** returns an object with `{ document, sections, facts }` — not `{ data: RAGDocument }`.
9. **All hooks return standard React Query shape**: `{ data, isLoading, error, ...}` — not `{ data: { success, data } }`.
10. **Mutation hooks** use `.mutateAsync()` for async/await pattern in try/catch blocks.
11. **Query key factories** were exported from all hook files in E07 — available for advanced cache operations if needed.
12. **Fast mode** in uploader skips expert Q&A — document goes straight from processing → ready.

---

**End of E08 Prompt v2**

+++++++++++++++++
