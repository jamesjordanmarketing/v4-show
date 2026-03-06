# Frontier RAG Module - Execution Prompt E08: UI Components & Pages

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E08 - UI Components & Pages
**Prerequisites:** E01-E07 complete (database, types, providers, services, API routes, hooks, store)
**Status:** Ready for Execution

---

## Overview

This prompt creates all 5 pages and 10+ components for the RAG module's user interface. This is the largest UI section, creating the complete visual experience: document dashboard, upload flow, expert Q&A interface, RAG chat with mode selector, and quality dashboard.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-8.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E08: UI Components & Pages - Complete RAG Interface

## Your Mission

You are creating the complete user interface for a Frontier RAG module in an existing Next.js 14 + shadcn/UI + Tailwind application. You will create:

**5 Pages:**
1. `/rag` -- RAG Dashboard (document grid with search/filter)
2. `/rag/upload` -- Document Upload page
3. `/rag/documents/[id]/questions` -- Expert Q&A page
4. `/rag/chat` -- RAG Chat page (with mode selector)
5. `/rag/quality` -- Quality Dashboard page

**10+ Components:**
1. `DocumentCard` -- Document status card
2. `DocumentUploader` -- Drag-and-drop upload with validation
3. `ExpertQAChat` -- Question list with answer inputs
4. `VerificationPanel` -- Sample Q&A verification
5. `RAGChatInterface` -- Chat message list with citations
6. `SourceCitation` -- Collapsible citation card
7. `ModeSelector` -- Three-way mode tabs (RAG Only / LoRA Only / RAG + LoRA)
8. `QualityScoreCard` -- Metric display with progress bar
9. `ProcessingStatus` -- Step indicator with polling
10. `RAGLayout` -- Sidebar navigation layout

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains ALL component and page implementations):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-8.md`

2. **Existing page patterns** (follow these layouts and data fetching patterns):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\app\(dashboard)\datasets\page.tsx`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\app\(dashboard)\upload\page.tsx`

3. **Existing component patterns** (follow these shadcn/UI, icon, and state patterns):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\components\pipeline\chat\ChatMain.tsx`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\components\conversations\ConversationTable.tsx`

4. **Available shadcn/UI components** (verify which are already installed):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\components\ui\`

---

## Step 1: Verify Prerequisites

Verify hook files and store exist (from E07):
- `src/hooks/use-rag-documents.ts`
- `src/hooks/use-expert-qa.ts`
- `src/hooks/use-rag-chat.ts`
- `src/hooks/use-rag-quality.ts`
- `src/stores/rag-store.ts`

If missing, STOP and inform the user to run E07 first.

---

## Step 2: Create Directory Structure

```
src/app/(dashboard)/rag/
src/app/(dashboard)/rag/upload/
src/app/(dashboard)/rag/documents/[id]/questions/
src/app/(dashboard)/rag/chat/
src/app/(dashboard)/rag/quality/
src/components/rag/
```

---

## Step 3: Create the RAG Layout

Create the `RAGLayout` component first -- it provides the sidebar navigation used by all RAG pages. The specification has the complete implementation.

Key features:
- Sidebar with 4 nav links (Dashboard, Upload, Chat, Quality)
- "Back to Main" link
- Active link highlighting using `usePathname()`
- Responsive mobile overlay with hamburger menu
- `'use client'` directive required

---

## Step 4: Create All Pages

Create all 5 page files exactly as specified. Each page:
- Uses `'use client'` directive
- Wraps content in `RAGLayout`
- Uses hooks from E07 for data fetching
- Has loading, error, and empty states
- Follows the existing dashboard page patterns

**Page file paths:**
```
src/app/(dashboard)/rag/page.tsx
src/app/(dashboard)/rag/upload/page.tsx
src/app/(dashboard)/rag/documents/[id]/questions/page.tsx
src/app/(dashboard)/rag/chat/page.tsx
src/app/(dashboard)/rag/quality/page.tsx
```

---

## Step 5: Create All Components

Create all 10+ components in `src/components/rag/`. Each component:
- Uses `'use client'` directive
- Uses shadcn/UI primitives (Card, Badge, Button, Tabs, Progress, etc.)
- Uses Lucide icons
- Uses `sonner` for toast notifications where needed
- Has proper TypeScript props interface

---

## Step 6: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

---

## Step 7: Visual Verification

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run dev
```

Open `http://localhost:3000/rag` in a browser. Verify:
- RAG Dashboard page loads with sidebar navigation
- Sidebar links navigate correctly
- Upload page renders the upload dropzone
- Chat page renders the mode selector and message input

---

## Success Criteria

- [ ] All 5 page files created under `src/app/(dashboard)/rag/`
- [ ] All 10+ component files created under `src/components/rag/`
- [ ] RAGLayout provides consistent sidebar navigation across all pages
- [ ] Every component uses `'use client'` directive
- [ ] Components use existing shadcn/UI primitives (not custom CSS for standard elements)
- [ ] ModeSelector implements three-way tabs (RAG Only / LoRA Only / RAG + LoRA)
- [ ] ProcessingStatus polls with `refetchInterval` for real-time updates
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] Pages render in the browser without JavaScript errors

---

## If Something Goes Wrong

### Missing shadcn/UI Components
If a component like `Progress` or `Collapsible` isn't installed:
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npx shadcn-ui@latest add progress collapsible
```

### Page Not Found (404) on /rag
- Verify the page file is at `src/app/(dashboard)/rag/page.tsx` (inside the `(dashboard)` group)
- The `(dashboard)` route group provides the authenticated layout wrapper

### Icon Import Errors
- All icons come from `lucide-react` (already installed)
- Common icons: `FileText`, `Upload`, `MessageSquare`, `BarChart3`, `ChevronRight`, `Loader2`, `Check`, `X`, `ArrowLeft`

### Hook Import Errors
- Hooks are imported from `@/hooks/use-rag-documents` etc.
- Store is imported from `@/stores/rag-store`

### recharts Import Errors
- Quality dashboard uses `recharts` for charts (already in `package.json`)
- Import: `import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'`

### Dynamic Route Parameter
- For `[id]` pages, the component receives `{ params }: { params: { id: string } }`
- Or use `useParams()` from `next/navigation` in client components

---

## What's Next

**E09** will create the Quality Measurement service (Claude-as-Judge evaluation).

---

**End of E08 Prompt**


+++++++++++++++++
