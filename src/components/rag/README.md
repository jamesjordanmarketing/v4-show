# RAG Frontier UI Components - Part 1

**Created:** February 11, 2026
**Section:** E08 - UI Components Part 1
**Status:** ✅ Complete

## Components Created

### 1. DocumentStatusBadge.tsx
- Color-coded status badges for RAG documents
- Supports all 6 status values: `uploading`, `processing`, `awaiting_questions`, `ready`, `error`, `archived`
- Custom styling for `ready` (green), `processing` (blue), and `awaiting_questions` (amber)

### 2. KnowledgeBaseDashboard.tsx
- Lists all knowledge bases in a grid layout
- Handles empty state with call-to-action
- Integrates with CreateKnowledgeBaseDialog
- Shows document count per knowledge base
- Selection state with visual feedback

### 3. CreateKnowledgeBaseDialog.tsx
- Modal dialog for creating new knowledge bases
- Form with name (required) and description (optional)
- Loading states during creation
- Toast notifications on success/error
- Form validation

### 4. DocumentUploader.tsx
- Drag-and-drop file upload zone
- File type validation (PDF, DOCX, TXT, MD)
- File size validation (50MB max)
- Optional description field
- Fast mode toggle (skip expert Q&A)
- Two-step upload process:
  1. Create document record
  2. Upload file and trigger processing
- Visual feedback for upload progress

### 5. DocumentList.tsx
- Lists all documents in a knowledge base
- Shows status badges and metadata (sections, facts)
- Action buttons:
  - Delete (with confirmation)
  - Reprocess (retry on error status)
- Empty state handling
- Selection state with visual feedback

### 6. DocumentDetail.tsx
- Comprehensive document detail view
- Sections displayed:
  - Document summary
  - Topic taxonomy (badges)
  - Key entities (top 10)
  - Sections with summaries and contextual preambles
  - Facts (top 20) with fact type badges
  - Metadata grid (file type, counts)
- Handles optional fields gracefully

## Architecture

### Dependencies
- **UI Components:** shadcn/ui (dialog, switch, badge, textarea, label, button, card, input)
- **Icons:** lucide-react
- **Toast:** sonner
- **State Management:** React Query v5

### Hooks Used
- `useRAGKnowledgeBases` - List and create knowledge bases
- `useRAGDocuments` - List, create, upload, delete, reprocess documents
- `useRAGDocumentDetail` - Fetch document with sections and facts

### Type System
All components use types from `@/types/rag`:
- `RAGKnowledgeBase`
- `RAGDocument`
- `RAGSection`
- `RAGFact`
- `RAGDocumentStatus`
- `RAGDocumentFileType`
- `RAGEntityItem`

## Component Patterns

### Common Conventions
- ✅ `'use client'` directive on all components
- ✅ Named exports (not default)
- ✅ Props interface: `interface {ComponentName}Props`
- ✅ shadcn/ui imports from `@/components/ui/`
- ✅ Icons from `lucide-react`
- ✅ Toast from `sonner`
- ✅ Loading: `<Loader2 className="h-4 w-4 animate-spin" />`
- ✅ Tailwind CSS only (no CSS modules)

### State Management
- Loading states with spinners
- Error states with destructive styling
- Empty states with call-to-action
- Selection states with visual feedback
- Mutation states with disabled buttons

### File Upload Flow
1. User selects file via drag-and-drop or file picker
2. Client-side validation (type, size)
3. User optionally adds description and enables fast mode
4. Create document record via `useCreateDocument`
5. Upload file via `useUploadDocument`
6. Processing starts automatically on backend
7. Toast notification on success/error

## What's Next

**E09** will create the remaining components:
- ExpertQAPanel (Q&A interface)
- RAGChat (chat interface)
- SourceCitation (citation display)
- ModeSelector (mode toggle)
- QualityDashboard (quality metrics)

**E10** will create the pages and navigation to integrate all components.

## Verification

✅ All 6 component files created in `src/components/rag/`
✅ All components use `'use client'` directive
✅ All components use named exports
✅ All components follow shadcn/ui + Tailwind patterns
✅ DocumentUploader supports drag-and-drop and file validation
✅ DocumentList shows status badges and action buttons (including reprocess)
✅ DocumentDetail shows summary, topics, sections, facts, metadata
✅ No TypeScript or linter errors
✅ All imports from hooks match E07 exports exactly
