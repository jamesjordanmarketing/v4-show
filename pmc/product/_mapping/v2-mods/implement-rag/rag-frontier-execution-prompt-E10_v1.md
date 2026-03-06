# RAG Frontier - Execution Prompt E10: Pages, Navigation & Chunks Removal

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E10 - Pages, Navigation & Chunks Removal
**Prerequisites:** E01-E09 complete
**Status:** Ready for Execution

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

### Important: Route Group
All RAG pages go inside `src/app/(dashboard)/rag/` — the `(dashboard)` route group provides auth-gating via its layout. Do NOT create pages outside this group.

---

========================


# EXECUTION PROMPT E10: Pages, Navigation & Chunks Removal

## Your Mission

Create the RAG Frontier page routes, add navigation, and remove the legacy chunks module from a Next.js 14 / TypeScript application.

---

## Context: Current State

### What Exists (from E01-E09)
- **Database**: 8 RAG tables, storage bucket, RPC functions (E01)
- **Types**: `src/types/rag.ts` (E02)
- **Services**: `src/lib/rag/` — ingestion, embedding, expert-qa, retrieval, quality, providers (E03-E04)
- **API Routes**: `src/app/api/rag/` — knowledge-bases, documents, query, quality (E05-E06)
- **Hooks**: `src/hooks/` — useRAGKnowledgeBases, useRAGDocuments, useExpertQA, useRAGChat, useRAGQuality (E07)
- **Components**: `src/components/rag/` — 11 component files (E08-E09)

### Navigation Pattern
The app uses a **header-button navigation** pattern inside `src/app/(dashboard)/dashboard/page.tsx`. Navigation links are rendered as `<Button>` elements calling `router.push()`.

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
            <KnowledgeBaseDashboard onSelectKB={setSelectedKbId} />
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
                  onSelectDocument={(docId) => router.push(`/rag/${docId}`)}
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

  const { data: document, isLoading, error } = useRAGDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
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
                <h1 className="text-xl font-bold">{document.name}</h1>
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
            <DocumentDetail document={document} />
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
              <RAGChat documentId={documentId} documentName={document.name} />
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

**Action**: Locate the group of `<Button>` elements that use `router.push()` for navigation (Conversations, Training Files, Upload Documents, LoRA Datasets, etc.). Add the following button in the group:

```typescript
<Button
  variant="outline"
  onClick={() => router.push('/rag')}
  className="flex items-center gap-2"
>
  <BookOpen className="h-4 w-4" />
  RAG Frontier
</Button>
```

**Also add the import** at the top of the file with the existing lucide-react imports:

```typescript
import { BookOpen } from 'lucide-react';
```

**Important**: Do NOT rewrite the entire dashboard page. Only add the button and import. Read the existing file first, find the button group, and insert the new button. The `BookOpen` import may need to be merged with an existing lucide-react import line.

---

## Phase 3: Remove Chunks Module

### Task 5: Delete Chunks Directories

Delete the following directories and ALL their contents:

```bash
# Remove chunks page routes
rm -rf src/app/chunks/

# Remove test-chunks page
rm -rf src/app/test-chunks/

# Remove chunks API routes
rm -rf src/app/api/chunks/

# Remove chunks components
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

### shadcn/ui Tabs Not Installed
```bash
npx shadcn-ui@latest add tabs
```

### Dashboard Page Structure Changed
If the dashboard page structure doesn't match the expected button group, manually add the RAG Frontier button wherever navigation buttons are rendered.

### Chunks Module Has Dependencies Elsewhere
If deleting chunks directories causes imports to break in non-chunks files:
1. Search: `grep -rn "@/components/chunks\|@/app/chunks\|/api/chunks" src/ --include="*.ts" --include="*.tsx"`
2. Remove or comment out the imports
3. If a page references chunks components, remove those usages

---

## Notes for Agent

1. **Create all 3 page files** inside `src/app/(dashboard)/rag/`.
2. **Update the dashboard page** — ADD a button, do NOT rewrite the page.
3. **Delete 4 directories** — `src/app/chunks/`, `src/app/test-chunks/`, `src/app/api/chunks/`, `src/components/chunks/`.
4. **Verify no broken imports** after deletion.
5. **Do NOT delete** `/upload`, `/workflow`, or `/dashboard` pages — those are NOT part of the chunks module.

---

**End of E10 Prompt**


+++++++++++++++++
