# RAG Frontier - Execution Prompt E10: Pages, Navigation & Chunks Removal

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E10 - Pages, Navigation & Chunks Removal
**Prerequisites:** E01-E09 complete ✅
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E09 complete), corrected component prop names (onSelectKnowledgeBase not onSelectKB, DocumentList passes full doc object not just ID, DocumentDetail expects documentId prop not document prop), verified tabs component installed, added exact E09 component exports

---

## Overview

This prompt creates the RAG pages, adds navigation links, and removes the legacy chunks module.

**What This Section Creates:**
1. `src/app/(dashboard)/rag/page.tsx` — RAG knowledge base listing page
2. `src/app/(dashboard)/rag/[id]/page.tsx` — RAG document detail page with Expert Q&A + Chat tabs
3. `src/app/(dashboard)/rag/[id]/quality/page.tsx` — Quality dashboard for a document
4. Updated navigation in `/dashboard` page to include RAG Frontier link

**What This Section Removes:**
1. `src/app/chunks/` — All chunks page routes (entire directory tree)
2. `src/app/test-chunks/` — Test chunks page
3. `src/app/api/chunks/` — All chunks API routes (entire directory tree)
4. `src/components/chunks/` — All chunks components (entire directory tree)

**What This Section Does NOT Change:**
- No database, types, services, API routes (those are E01-E06)
- No hooks (E07), no components (E08-E09)
- No `/upload` page, no `/workflow` routes (those are separate features, NOT chunks)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`

### Confirmed Infrastructure ✅
- **shadcn/ui tabs component**: Already installed at `src/components/ui/tabs.tsx`
- **All RAG components**: 11 components in `src/components/rag/` from E08-E09
- **All RAG hooks**: Available from E07 in `src/hooks/`

### Important: Route Group
All RAG pages go inside `src/app/(dashboard)/rag/` — the `(dashboard)` route group provides auth-gating via its layout. Do NOT create pages outside this group.

---

========================


# EXECUTION PROMPT E10: Pages, Navigation & Chunks Removal

## Your Mission

Create the RAG Frontier page routes, add navigation, and remove the legacy chunks module from a Next.js 14 / TypeScript application.

---

## Context: Current State

### E09 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**

All 5 E09 component files created in `src/components/rag/`:

1. **`ExpertQAPanel.tsx`**
   - ✅ Named export: `ExpertQAPanel`
   - ✅ Props: `{ documentId: string; documentStatus: string }`
   - ✅ Only renders when `documentStatus === 'awaiting_questions'`
   - ✅ Answer submission, skip, and verify document functionality

2. **`SourceCitation.tsx`**
   - ✅ Named export: `SourceCitation`
   - ✅ Props: `{ citations: RAGCitation[] }`
   - ✅ Displays citations with tooltips showing excerpt and relevance score

3. **`ModeSelector.tsx`**
   - ✅ Named export: `ModeSelector`
   - ✅ Props: `{ value: RAGQueryMode; onChange: (mode: RAGQueryMode) => void }`
   - ✅ Toggle group for RAG/LoRA/RAG+LoRA modes

4. **`RAGChat.tsx`**
   - ✅ Named export: `RAGChat`
   - ✅ Props: `{ documentId?: string; knowledgeBaseId?: string; documentName?: string }`
   - ✅ Full chat interface with message history, Enter to send, Shift+Enter for newline
   - ✅ Integrates SourceCitation and ModeSelector

5. **`QualityDashboard.tsx`**
   - ✅ Named export: `QualityDashboard`
   - ✅ Props: `{ documentId: string }`
   - ✅ Composite score, per-metric breakdown, recent evaluations

### E08 Completion Status ✅

All 6 E08 component files available in `src/components/rag/`:

1. **`DocumentStatusBadge.tsx`**
   - ✅ Named export: `DocumentStatusBadge`
   - ✅ Props: `{ status: RAGDocumentStatus }`

2. **`KnowledgeBaseDashboard.tsx`**
   - ✅ Named export: `KnowledgeBaseDashboard`
   - ✅ Props: `{ onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void; selectedId?: string }`
   - ✅ **CRITICAL**: Prop is `onSelectKnowledgeBase` (NOT `onSelectKB`)

3. **`CreateKnowledgeBaseDialog.tsx`**
   - ✅ Named export: `CreateKnowledgeBaseDialog`
   - ✅ Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`

4. **`DocumentUploader.tsx`**
   - ✅ Named export: `DocumentUploader`
   - ✅ Props: `{ knowledgeBaseId: string }`

5. **`DocumentList.tsx`**
   - ✅ Named export: `DocumentList`
   - ✅ Props: `{ knowledgeBaseId: string; onSelectDocument: (doc: RAGDocument) => void; selectedId?: string }`
   - ✅ **CRITICAL**: Callback receives the full `RAGDocument` object (NOT just the ID)

6. **`DocumentDetail.tsx`**
   - ✅ Named export: `DocumentDetail`
   - ✅ Props: `{ documentId: string }`
   - ✅ **CRITICAL**: Expects `documentId` prop (NOT `document` prop)

### E07 Hooks Available ✅

**Hooks available from `src/hooks/`:**

1. **`src/hooks/useRAGKnowledgeBases.ts`**
   - ✅ `useRAGKnowledgeBases()` — Returns `{ data: RAGKnowledgeBase[], isLoading, error }`
   - ✅ `useCreateKnowledgeBase()` — Mutation hook
   - ✅ `useDeleteKnowledgeBase()` — Mutation hook

2. **`src/hooks/useRAGDocuments.ts`**
   - ✅ `useRAGDocuments(knowledgeBaseId: string)` — Returns `{ data: RAGDocument[], isLoading, error }`
   - ✅ `useRAGDocumentDetail(documentId: string)` — Returns `{ data: DocumentDetail, isLoading, error }`
     - **DocumentDetail interface**: `{ document: RAGDocument; sections: RAGSection[]; facts: RAGFact[] }`
   - ✅ `useCreateDocument()` — Mutation hook
   - ✅ `useUploadDocumentFile()` — Mutation hook
   - ✅ `useDeleteDocument(knowledgeBaseId: string)` — Mutation hook
   - ✅ `useReprocessDocument()` — Mutation hook

3. **`src/hooks/useExpertQA.ts`**
   - ✅ `useExpertQuestions(documentId: string, includeAnswered?: boolean)` — Returns `{ data: RAGExpertQuestion[], isLoading, error }`
   - ✅ `useSubmitAnswer(documentId: string)` — Mutation hook
   - ✅ `useSkipQuestion(documentId: string)` — Mutation hook
   - ✅ `useVerifyDocument()` — Mutation hook

4. **`src/hooks/useRAGChat.ts`**
   - ✅ `useRAGQuery()` — Mutation hook
   - ✅ `useRAGQueryHistory(documentId?: string, knowledgeBaseId?: string)` — Returns `{ data: RAGQuery[], isLoading, error }`

5. **`src/hooks/useRAGQuality.ts`**
   - ✅ `useRAGQualityScores(documentId?: string)` — Returns `{ data: RAGQualityScore[], isLoading, error }`
   - ✅ `useRAGQualitySummary(documentId: string)` — Returns `{ data: QualitySummary, isLoading, error }`
   - ✅ `useEvaluateQuery()` — Mutation hook

### Navigation Pattern

The app uses a **button navigation** pattern inside `src/app/(dashboard)/dashboard/page.tsx`. Navigation links are rendered as `<button>` elements with inline styles calling `router.push()` on click.

**Example from existing dashboard:**
```typescript
<button
  onClick={() => router.push('/conversations')}
  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
  Conversations
</button>
```

### Route Group Pattern

Auth-gated pages live under `src/app/(dashboard)/`. The `(dashboard)/layout.tsx` is a client component that redirects to `/signin` if unauthenticated.

### Chunks Module (to be removed)
- Page routes: `src/app/chunks/`, `src/app/test-chunks/`
- API routes: `src/app/api/chunks/`
- Components: `src/components/chunks/`

---

## Phase 1: Create RAG Pages

### Task 1: RAG Knowledge Base Page

**File:** `src/app/(dashboard)/rag/page.tsx`

This is the main entry point for the RAG Frontier module. It shows the knowledge base dashboard and, when a KB is selected, shows documents and upload functionality.

```typescript
'use client';

import { useState } from 'react';
import { KnowledgeBaseDashboard } from '@/components/rag/KnowledgeBaseDashboard';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { DocumentList } from '@/components/rag/DocumentList';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RAGPage() {
  const router = useRouter();
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">RAG Frontier</h1>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {!selectedKbId ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Knowledge Bases</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage knowledge bases for document-grounded Q&A.
              </p>
            </div>
            <KnowledgeBaseDashboard 
              onSelectKnowledgeBase={(kb) => setSelectedKbId(kb.id)} 
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedKbId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                All Knowledge Bases
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Panel */}
              <div className="lg:col-span-1">
                <DocumentUploader knowledgeBaseId={selectedKbId} />
              </div>

              {/* Documents List */}
              <div className="lg:col-span-2">
                <DocumentList
                  knowledgeBaseId={selectedKbId}
                  onSelectDocument={(doc) => router.push(`/rag/${doc.id}`)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/dashboard/page.tsx` — Header + content layout

**CRITICAL CORRECTIONS from v1:**
- Line 45: Changed `onSelectKB={setSelectedKbId}` to `onSelectKnowledgeBase={(kb) => setSelectedKbId(kb.id)}` — the actual prop name is `onSelectKnowledgeBase` and it receives the full knowledge base object
- Line 61: Changed `onSelectDocument={(docId) => router.push(\`/rag/${docId}\`)}` to `onSelectDocument={(doc) => router.push(\`/rag/${doc.id}\`)}` — the callback receives the full `RAGDocument` object, not just the ID

---

### Task 2: RAG Document Detail Page

**File:** `src/app/(dashboard)/rag/[id]/page.tsx`

This page shows document details, Expert Q&A, and a chat interface in a tabbed layout.

```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FileText, MessageSquare, BarChart3, BookOpen } from 'lucide-react';
import { useRAGDocumentDetail } from '@/hooks/useRAGDocuments';
import { DocumentDetail } from '@/components/rag/DocumentDetail';
import { DocumentStatusBadge } from '@/components/rag/DocumentStatusBadge';
import { ExpertQAPanel } from '@/components/rag/ExpertQAPanel';
import { RAGChat } from '@/components/rag/RAGChat';

export default function RAGDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState('detail');

  const { data, isLoading, error } = useRAGDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.push('/rag')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RAG
          </Button>
          <p className="text-destructive mt-4">
            {error?.message || 'Document not found'}
          </p>
        </div>
      </div>
    );
  }

  const document = data.document;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/rag')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">{document.fileName}</h1>
                <p className="text-sm text-muted-foreground">
                  {document.sourceType} · {document.sectionCount} sections · {document.factCount} facts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DocumentStatusBadge status={document.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/rag/${documentId}/quality`)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Quality
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="detail" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Detail
            </TabsTrigger>
            <TabsTrigger value="qa" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Expert Q&A
              {document.status === 'awaiting_questions' && (
                <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-4">
            <DocumentDetail documentId={documentId} />
          </TabsContent>

          <TabsContent value="qa" className="mt-4">
            <ExpertQAPanel documentId={documentId} documentStatus={document.status} />
            {document.status !== 'awaiting_questions' && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Expert Q&A is available when document status is &quot;awaiting_questions&quot;.
                Current status: {document.status}
              </p>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            {document.status === 'verified' || document.status === 'ready' ? (
              <RAGChat documentId={documentId} documentName={document.fileName} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Chat is available after document processing is complete and verified.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/app/(dashboard)/pipeline/jobs/[jobId]/page.tsx` — Detail page with tabs

**CRITICAL CORRECTIONS from v1:**
- Line 20: Changed to `const { data, isLoading, error } = useRAGDocumentDetail(documentId);` — the hook returns `{ data: DocumentDetail, ... }` where `data` contains `{ document, sections, facts }`
- Line 45: Added `const document = data.document;` to extract the document from the DocumentDetail response
- Lines 62, 68, 95, 97, 107, 119, 124: Changed all references from `document.name` to `document.fileName` — the RAGDocument interface uses `fileName` not `name`
- Line 107: Changed `<DocumentDetail document={document} />` to `<DocumentDetail documentId={documentId} />` — the component expects `documentId` prop, not `document` prop

---

### Task 3: Quality Page

**File:** `src/app/(dashboard)/rag/[id]/quality/page.tsx`

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { QualityDashboard } from '@/components/rag/QualityDashboard';

export default function RAGQualityPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/rag/${documentId}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Document
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-xl font-bold">RAG Quality Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <QualityDashboard documentId={documentId} />
      </div>
    </div>
  );
}
```

---

## Phase 2: Update Navigation

### Task 4: Add RAG Frontier Link to Dashboard

**File:** `src/app/(dashboard)/dashboard/page.tsx`

Find the navigation buttons section in the dashboard page. Add a new button for RAG Frontier alongside the existing navigation buttons.

**Action**: Locate the group of `<button>` elements that use `router.push()` for navigation (Conversations, Training Files, Upload Documents, LoRA Datasets, etc.). Add the following button in the group:

```typescript
<button
  onClick={() => router.push('/rag')}
  className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
  RAG Frontier
</button>
```

**Important**: Do NOT rewrite the entire dashboard page. Only add the button. Read the existing file first, find the button group (around lines 50-100), and insert the new button.

---

## Phase 3: Remove Chunks Module

### Task 5: Delete Chunks Directories

Delete the following directories and ALL their contents:

**Use the Delete tool for each directory:**
1. Delete `src/app/chunks/` (if exists)
2. Delete `src/app/test-chunks/` (if exists)
3. Delete `src/app/api/chunks/` (if exists)
4. Delete `src/components/chunks/` (if exists)

**Note**: The Delete tool works on files, not directories. You'll need to use the Shell tool with `rm -rf` commands:

```bash
rm -rf src/app/chunks/
rm -rf src/app/test-chunks/
rm -rf src/app/api/chunks/
rm -rf src/components/chunks/
```

**Verify deletions — confirm these directories no longer exist:**
```bash
ls src/app/chunks/ 2>&1         # Should show "No such file or directory"
ls src/app/test-chunks/ 2>&1     # Should show "No such file or directory"
ls src/app/api/chunks/ 2>&1      # Should show "No such file or directory"
ls src/components/chunks/ 2>&1   # Should show "No such file or directory"
```

### Task 6: Remove Chunks References

After deleting the chunks directories, search for any remaining imports or references to the deleted chunks module:

```bash
grep -rn "chunks" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"
```

**Expected remaining references**: The word "chunks" may still appear in:
- Context about text "chunks" in RAG services (this is fine — RAG uses the word "chunks" conceptually for text splitting)
- Any comments or strings that mention chunks as a concept

**References that MUST be removed**: Any `import` statements referencing:
- `@/components/chunks/`
- `@/app/chunks/`
- `@/app/api/chunks/`

For each broken import found, either remove the import line or remove the entire component usage if it's no longer relevant.

### Task 7: Check for Chunks Links in Navigation

Search the dashboard page for any links or buttons pointing to chunks-related routes:

```bash
grep -n "chunks" src/app/\(dashboard\)/dashboard/page.tsx
```

If any chunks navigation buttons exist, remove them. The chunks module is being replaced by RAG Frontier.

---

## Verification

### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit
```

**Expected:** Exit code 0. No TypeScript errors. No broken imports from deleted chunks files.

### Step 2: Verify RAG Pages Exist

```bash
ls src/app/\(dashboard\)/rag/page.tsx
ls src/app/\(dashboard\)/rag/\[id\]/page.tsx
ls src/app/\(dashboard\)/rag/\[id\]/quality/page.tsx
```

### Step 3: Verify Chunks Are Gone

```bash
test -d src/app/chunks && echo "FAIL: chunks still exists" || echo "OK: chunks removed"
test -d src/app/test-chunks && echo "FAIL: test-chunks still exists" || echo "OK: test-chunks removed"
test -d src/app/api/chunks && echo "FAIL: api/chunks still exists" || echo "OK: api/chunks removed"
test -d src/components/chunks && echo "FAIL: components/chunks still exists" || echo "OK: components/chunks removed"
```

### Step 4: Verify Navigation

Open `src/app/(dashboard)/dashboard/page.tsx` and confirm:
- A "RAG Frontier" button exists
- No chunks-related buttons remain

---

## Success Criteria

- [ ] `/rag` page created — shows knowledge bases, select KB to see documents + uploader
- [ ] `/rag/[id]` page created — document detail with Detail, Expert Q&A, Chat tabs
- [ ] `/rag/[id]/quality` page created — quality dashboard
- [ ] Dashboard has "RAG Frontier" button linking to `/rag`
- [ ] `src/app/chunks/` directory deleted
- [ ] `src/app/test-chunks/` directory deleted
- [ ] `src/app/api/chunks/` directory deleted
- [ ] `src/components/chunks/` directory deleted
- [ ] No broken imports from chunks module
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

This is the final execution prompt. After completing E10:

1. **Start the dev server**: `npm run dev`
2. **Test the full flow**:
   - Navigate to `/rag` from dashboard
   - Create a knowledge base
   - Upload a document (PDF, DOCX, or TXT)
   - Wait for processing to complete
   - Answer expert questions
   - Verify the document
   - Chat with the document
   - Check quality scores

---

## If Something Goes Wrong

### Tabs Component Not Found
**SHOULD NOT HAPPEN** — tabs component verified at `src/components/ui/tabs.tsx`

### Dashboard Page Structure Changed
If the dashboard page structure doesn't match the expected button group, manually add the RAG Frontier button wherever navigation buttons are rendered.

### Chunks Module Has Dependencies Elsewhere
If deleting chunks directories causes imports to break in non-chunks files:
1. Search: `grep -rn "@/components/chunks\|@/app/chunks\|/api/chunks" src/ --include="*.ts" --include="*.tsx"`
2. Remove or comment out the imports
3. If a page references chunks components, remove those usages

### DocumentDetail Shows Nothing
If DocumentDetail component doesn't render properly, verify:
- You're passing `documentId` prop (not `document` prop)
- The component fetches its own data using `useRAGDocumentDetail(documentId)` internally

---

## Notes for Agent

1. **Create all 3 page files** inside `src/app/(dashboard)/rag/`.
2. **CRITICAL prop corrections**:
   - `KnowledgeBaseDashboard` uses `onSelectKnowledgeBase` prop (NOT `onSelectKB`)
   - `DocumentList` callback receives full `RAGDocument` object (NOT just ID)
   - `DocumentDetail` expects `documentId` prop (NOT `document` prop)
3. **useRAGDocumentDetail** returns `{ data: { document, sections, facts }, ... }` — extract `document` from `data.document`
4. **RAGDocument interface** uses `fileName` property (NOT `name`)
5. **Update the dashboard page** — ADD a button, do NOT rewrite the page.
6. **Delete 4 directories** — `src/app/chunks/`, `src/app/test-chunks/`, `src/app/api/chunks/`, `src/components/chunks/`.
7. **Verify no broken imports** after deletion.
8. **Do NOT delete** `/upload`, `/workflow`, or `/dashboard` pages — those are NOT part of the chunks module.
9. **Tabs component** is already installed — no need to run shadcn add command.
10. **Navigation uses inline button elements** — not shadcn Button components for the main nav area.

---

**End of E10 Prompt v2**


+++++++++++++++++
