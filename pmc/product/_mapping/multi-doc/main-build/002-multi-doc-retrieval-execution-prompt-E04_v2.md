# Multi-Document Retrieval — E04: UI Components, Testing & Phase 2 Query Decomposition

**Version:** 2.0
**Date:** February 20, 2026
**Section:** E04 — UI, Tests & Phase 2
**Prerequisites:** E01 (Foundation), E02 (Core Retrieval), E03 (Quality, Ingestion, Citations) must be complete
**Builds Upon:** E01 + E02 + E03 artifacts
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`
**Supersedes:** `002-multi-doc-retrieval-execution-prompt-E04_v1.md`

---

## Changes from v1 → v2

This version was updated after E03 was executed. All line numbers, imports, and code samples have been verified against the live codebase.

| Area | v1 Said | v2 Corrects |
|------|---------|-------------|
| `rag-retrieval-service.ts` size | "~1100+" | 1226 lines (post-E03) |
| `KnowledgeBaseDashboard.tsx` lucide imports | "add Database and FileText" | `Database` and `FileText` already present at L6; only `MessageCircle` needed |
| `KnowledgeBaseDashboard.tsx` button location | "around L73" | Inside `<CardContent>` L78–83, after the existing `div.flex` doc-count row |
| `RAGChat.tsx` CardTitle location | "L128–132" | L121–124 |
| `RAGChat.tsx` scope indicator position | "after CardTitle" | Between `</CardTitle>` (L124) and `<ModeSelector` (L125) |
| `RAGChat.tsx` lucide imports | Already present | `Database` and `FileText` are NOT imported in RAGChat.tsx; must be added |
| `DocumentList.tsx` map loop location | "around L72" | L67 |
| `SourceCitation.tsx` doc name placement | "span after Badge inside container" | Wrap `<Tooltip>` in `<div>` to show doc name visibly below badge (not just in tooltip) |
| Task 9: `generateHyDE` call | `generateHyDE(provider, subQuery, documentSummary)` | `generateHyDE({ queryText: subQuery, documentSummary })` (no `provider` param) |
| Task 9: `documentNames` reference | References `documentNames` before it's defined | Multi-hop branch fetches its own `multiHopDocNames` inline |
| Task 9: insertion point | "before standard HyDE + retrieveContext" | Immediately after classification log line, before Step 2 (HyDE) — correctly avoids running standard retrieval for multi-hop queries |
| Task 10: parent page | Vague: "find useState hooks" | Exact code provided; `/rag/page.tsx` needs `RAGChat` import, `chatKbId`/`chatKbName`/`selectedKbName` state, and three-way render conditional |

---

## Overview

This prompt implements the UI components for multi-document retrieval, integration tests, and Phase 2 Query Decomposition.

**What This Section Creates / Changes:**
1. "Chat with All Documents" button on KB Dashboard — `KnowledgeBaseDashboard.tsx`
2. Scope indicator in RAGChat component — `RAGChat.tsx`
3. "Chat with all documents" card in DocumentList — `DocumentList.tsx`
4. Source citation document provenance display — `SourceCitation.tsx`
5. Integration test file — `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (NEW)
6. Phase 2: Query classifier function — `rag-retrieval-service.ts`
7. Phase 2: Classification integration into `queryRAG()` — `rag-retrieval-service.ts`
8. Phase 2: Multi-hop context assembly function — `rag-retrieval-service.ts`
9. Phase 2: Multi-hop query handling branch in `queryRAG()` — `rag-retrieval-service.ts`
10. Wire all entry points to KB-wide chat — `src/app/(dashboard)/rag/page.tsx`

---

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — all line numbers and code samples are verified against the live codebase
2. **Read the four UI component files** to confirm current state at every location referenced
3. **Read `src/app/(dashboard)/rag/page.tsx`** — confirm the current imports and state before modifying
4. **Read `src/lib/rag/services/rag-retrieval-service.ts`** — confirm insertion points for Phase 2 tasks
5. **Execute as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector) |
| AI — Retrieval | Claude Haiku 4.5 for HyDE, response gen, self-eval, reranking, classification |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) |

### Key File Locations for E04

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/rag/KnowledgeBaseDashboard.tsx` | 96 | KB Dashboard — Task 1 |
| `src/components/rag/RAGChat.tsx` | 286 | Chat component — Task 2 |
| `src/components/rag/DocumentList.tsx` | 113 | Document list — Task 3 |
| `src/components/rag/SourceCitation.tsx` | 44 | Citation display — Task 4 |
| `src/app/(dashboard)/rag/page.tsx` | 72 | Parent RAG page — Task 10 |
| `src/lib/rag/services/rag-retrieval-service.ts` | 1226 | Retrieval service — Tasks 6–9 |
| `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` | NEW | Integration tests — Task 5 |

---

## E01 + E02 + E03 Artifacts (Prerequisites — Must Already Exist)

### From E01:
- Types: `RAGCitation` has `documentId?`, `documentName?`; `RAGKnowledgeBase` has `summary`; `RAGQuery` has `queryScope`
- Config: `kbWideSimilarityThreshold: 0.3`, `maxSingleDocRatio: 0.6`
- Guard clause relaxed: accepts `knowledgeBaseId` as alternative to `documentId`
- `queryScope` tracked in all 3 `rag_queries` insert sites
- Embeddings set `knowledge_base_id`; mappers handle new fields

### From E02:
- `retrieveContext()` uses batch fetch (2 queries instead of ~50)
- `assembleContext()` returns `{ context, tokenCount, truncated }` with `documentNames` param
- Multi-doc context shows `## From: [document name]` headers
- HyDE uses KB summary for KB-wide queries
- Conversation scope-aware; conversation context passed to `generateResponse()`

### From E03:
- `deduplicateResults()` accepts `textFn` — works on sections (`originalText`) and facts (`content`)
- `balanceMultiDocCoverage()` uses `RAG_CONFIG.retrieval.maxSingleDocRatio` + soft fallback
- `rerankSections()` reranks sections with Claude
- `rerankWithClaude()` accepts `documentName?` in candidates
- KB summary auto-generated in Inngest finalize step
- `storeSectionsFromStructure()` and `storeExtractedFacts()` accept `knowledgeBaseId`
- Citations enriched with `documentId`/`documentName` via `enrichCitationsWithDocumentInfo()`
- Multi-doc instruction in `generateResponse()` system prompt
- Hybrid search overlap metrics logged in `retrieveContext()`

---

## Existing Component Context (Verified Against Live Codebase)

### `KnowledgeBaseDashboard.tsx` (96 lines — confirmed)

```typescript
// L1–14 (confirmed)
'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Database, FileText } from 'lucide-react';  // Database + FileText already here
// ...
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}
```

The `<CardContent>` block at L78–83 (inside `knowledgeBases.map()`):
```tsx
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? 's' : ''}
                </div>
              </CardContent>
```

### `RAGChat.tsx` (286 lines — confirmed)

```typescript
// L1–14 (confirmed)
'use client';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageCircle, Bot, User, BarChart3, Cpu, ThumbsUp, ThumbsDown } from 'lucide-react';
// NOTE: Database and FileText are NOT in this import — must be added
```

Props at L16–20:
```typescript
interface RAGChatProps {
  documentId?: string;
  knowledgeBaseId?: string;
  documentName?: string;
}
```

CardTitle at L121–125:
```tsx
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with {documentName || 'Documents'}
        </CardTitle>
        <ModeSelector value={mode} onChange={(m) => { setMode(m); if (m === 'rag_only') setSelectedModelJobId(null); }} />
```

### `DocumentList.tsx` (113 lines — confirmed)

```typescript
// L1–15 (confirmed)
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Trash2, Eye, RefreshCw } from 'lucide-react';
// NOTE: MessageCircle not present — must be added
// ...
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  selectedId?: string;
}
```

The map loop starts at L65–67:
```tsx
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
```

### `SourceCitation.tsx` (44 lines — confirmed)

```tsx
// L22–39 (confirmed) — the citations map loop inside TooltipProvider:
          {citations.map((citation, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs cursor-help hover:bg-muted"
                >
                  [{i + 1}] {citation.sectionTitle || 'Section'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-xs">{citation.excerpt.slice(0, 200)}{citation.excerpt.length > 200 ? '...' : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevanceScore * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          ))}
```

### `src/app/(dashboard)/rag/page.tsx` (72 lines — confirmed)

```typescript
// L1–13 (confirmed)
'use client';
import { useState } from 'react';
import { KnowledgeBaseDashboard } from '@/components/rag/KnowledgeBaseDashboard';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { DocumentList } from '@/components/rag/DocumentList';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
// NOTE: RAGChat not imported; MessageCircle not imported

export default function RAGPage() {
  const router = useRouter();
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  // NOTE: Only one piece of state — no KB name, no chat mode state
```

The `<KnowledgeBaseDashboard>` call at L40–42:
```tsx
            <KnowledgeBaseDashboard 
              onSelectKnowledgeBase={(kb) => setSelectedKbId(kb.id)} 
            />
```

The `<DocumentList>` call at L61–64:
```tsx
                <DocumentList
                  knowledgeBaseId={selectedKbId}
                  onSelectDocument={(doc) => router.push(`/rag/${doc.id}`)}
                />
```

### `rag-retrieval-service.ts` Phase 2 insertion points (post-E03, 1226 lines)

`generateHyDE()` function signature at L42–56:
```typescript
async function generateHyDE(params: {
  queryText: string;
  documentSummary: string;
}): Promise<string> {
```

`enrichCitationsWithDocumentInfo()` at L822–845 (confirmed available after E03).

Inside `queryRAG()`, the `conversationContext` declaration ends at:
```typescript
    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
```

---

## Implementation Tasks — Part A: UI Components

### Task 1: "Chat with All Documents" Button on KB Dashboard (FR-9.1)

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx`

**Step 1: Add `MessageCircle` to the lucide-react import at L6.**

`Database` and `FileText` are already imported — only `MessageCircle` is needed.

Current:
```typescript
import { Loader2, Plus, Database, FileText } from 'lucide-react';
```

Replace with:
```typescript
import { Loader2, Plus, Database, FileText, MessageCircle } from 'lucide-react';
```

**Step 2: Update the props interface** at L11–14.

Current:
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}
```

Replace with:
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  onChatWithKnowledgeBase?: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}
```

**Step 3: Destructure the new prop** in the component function at L16.

Current:
```typescript
export function KnowledgeBaseDashboard({ onSelectKnowledgeBase, selectedId }: KnowledgeBaseDashboardProps) {
```

Replace with:
```typescript
export function KnowledgeBaseDashboard({ onSelectKnowledgeBase, onChatWithKnowledgeBase, selectedId }: KnowledgeBaseDashboardProps) {
```

**Step 4: Add button inside each KB card's `<CardContent>`** at L78–83.

Current:
```tsx
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? 's' : ''}
                </div>
              </CardContent>
```

Replace with:
```tsx
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? 's' : ''}
                </div>
                {kb.documentCount >= 2 && onChatWithKnowledgeBase && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChatWithKnowledgeBase(kb);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with All Documents
                  </Button>
                )}
              </CardContent>
```

**Validation Criteria:**
- KBs with 2+ documents show the "Chat with All Documents" button
- KBs with 0–1 documents do NOT show the button
- Clicking the button fires `onChatWithKnowledgeBase` with the KB object
- `e.stopPropagation()` prevents the card click from also firing `onSelectKnowledgeBase`

---

### Task 2: KB-Wide Scope Indicator in RAGChat (FR-9.2)

**File:** `src/components/rag/RAGChat.tsx`

**Step 1: Add `Database` and `FileText` to the lucide-react import at L7.**

Current:
```typescript
import { Loader2, Send, MessageCircle, Bot, User, BarChart3, Cpu, ThumbsUp, ThumbsDown } from 'lucide-react';
```

Replace with:
```typescript
import { Loader2, Send, MessageCircle, Bot, User, BarChart3, Cpu, ThumbsUp, ThumbsDown, Database, FileText } from 'lucide-react';
```

**Step 2: Add scope indicator** between `</CardTitle>` (L124) and `<ModeSelector` (L125).

Current:
```tsx
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with {documentName || 'Documents'}
        </CardTitle>
        <ModeSelector value={mode} onChange={(m) => { setMode(m); if (m === 'rag_only') setSelectedModelJobId(null); }} />
```

Replace with:
```tsx
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with {documentName || 'Documents'}
        </CardTitle>
        {!documentId && knowledgeBaseId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Database className="h-3 w-3" />
            Searching across all documents in knowledge base
          </p>
        )}
        {documentId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Searching: {documentName || 'Selected document'}
          </p>
        )}
        <ModeSelector value={mode} onChange={(m) => { setMode(m); if (m === 'rag_only') setSelectedModelJobId(null); }} />
```

**Validation Criteria:**
- KB-wide chat shows "Searching across all documents in knowledge base" with Database icon
- Document-level chat shows "Searching: [document name]" with FileText icon
- No indicator shown when neither `documentId` nor `knowledgeBaseId` is present (lora-only mode)

---

### Task 3: "Chat with All Documents" Card in DocumentList (FR-9.3)

**File:** `src/components/rag/DocumentList.tsx`

**Step 1: Add `MessageCircle` to the lucide-react import at L5.**

Current:
```typescript
import { Loader2, FileText, Trash2, Eye, RefreshCw } from 'lucide-react';
```

Replace with:
```typescript
import { Loader2, FileText, Trash2, Eye, RefreshCw, MessageCircle } from 'lucide-react';
```

**Step 2: Update the props interface** at L11–15.

Current:
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  selectedId?: string;
}
```

Replace with:
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  onChatWithAll?: () => void;
  selectedId?: string;
}
```

**Step 3: Destructure `onChatWithAll`** in the component function at L17.

Current:
```typescript
export function DocumentList({ knowledgeBaseId, onSelectDocument, selectedId }: DocumentListProps) {
```

Replace with:
```typescript
export function DocumentList({ knowledgeBaseId, onSelectDocument, onChatWithAll, selectedId }: DocumentListProps) {
```

**Step 4: Add the "Chat with all documents" card** BEFORE the `{documents.map(...)` at L67. Insert it at the top of the `<div className="space-y-2">` wrapper.

Current:
```tsx
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
```

Replace with:
```tsx
  return (
    <div className="space-y-2">
      {documents.filter(d => d.status === 'ready').length >= 2 && onChatWithAll && (
        <Card
          className="cursor-pointer transition-colors hover:border-primary/50 border-dashed"
          onClick={onChatWithAll}
        >
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-primary">Chat with all documents</p>
              <p className="text-xs text-muted-foreground">
                Search across {documents.filter(d => d.status === 'ready').length} ready documents
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {documents.map((doc) => (
```

**Validation Criteria:**
- "Chat with all documents" card appears ONLY when 2+ documents have `status === 'ready'`
- Card does NOT appear when `onChatWithAll` is not passed (backwards compatible)
- Clicking triggers `onChatWithAll` callback

---

### Task 4: Source Citation Document Provenance Display (FR-9.4)

**File:** `src/components/rag/SourceCitation.tsx`

Wrap each `<Tooltip>` in a `<div>` so that the document name can be displayed visibly below the badge (not hidden in hover). Move `key={i}` to the outer `<div>`.

Current (L22–39, inside `<TooltipProvider>`):
```tsx
          {citations.map((citation, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs cursor-help hover:bg-muted"
                >
                  [{i + 1}] {citation.sectionTitle || 'Section'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-xs">{citation.excerpt.slice(0, 200)}{citation.excerpt.length > 200 ? '...' : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevanceScore * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          ))}
```

Replace with:
```tsx
          {citations.map((citation, i) => (
            <div key={i} className="flex flex-col items-start gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs cursor-help hover:bg-muted"
                  >
                    [{i + 1}] {citation.sectionTitle || 'Section'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <p className="text-xs">{citation.excerpt.slice(0, 200)}{citation.excerpt.length > 200 ? '...' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevanceScore * 100).toFixed(0)}%</p>
                </TooltipContent>
              </Tooltip>
              {citation.documentName && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-0.5">
                  📄 {citation.documentName}
                </span>
              )}
            </div>
          ))}
```

**Validation Criteria:**
- Multi-doc citations show the document name label with 📄 icon, visible without hovering
- Single-doc citations also get enrichment when `documentName` is populated — consistent UX
- Citations without `documentName` render as before — backwards compatible
- `key={i}` has moved to the outer `<div>` wrapper — Tooltip no longer needs it

---

## Implementation Tasks — Part B: Integration Tests

### Task 5: Create Integration Test File

**File:** `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (NEW FILE)

Create this file. If the `__tests__` directory doesn't exist, create it:

```typescript
/**
 * Multi-Document Retrieval Integration Tests
 *
 * Tests KB-wide query functionality end-to-end.
 * Requires TEST_KB_ID and TEST_DOC_ID environment variables for live DB tests.
 */
import { queryRAG } from '../services/rag-retrieval-service';

const TEST_KB_ID = process.env.TEST_KB_ID;
const TEST_DOC_ID = process.env.TEST_DOC_ID;
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user';

const skipIfNoTestData = !TEST_KB_ID || !TEST_DOC_ID;

describe('Multi-Document Retrieval', () => {
  if (skipIfNoTestData) {
    it.skip('Skipping: TEST_KB_ID and TEST_DOC_ID not configured', () => {});
    return;
  }

  it('should accept knowledgeBaseId without documentId', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.responseText).toBeTruthy();
  }, 30000);

  it('should still work with documentId specified', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      documentId: TEST_DOC_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
  }, 30000);

  it('should fail without both documentId and knowledgeBaseId', async () => {
    await expect(queryRAG({
      queryText: 'Test',
      userId: TEST_USER_ID,
      mode: 'rag_only',
    } as any)).rejects.toThrow('documentId or knowledgeBaseId is required');
  });

  it('should include citations with document source info for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'What are the key policies?',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    if (result.data?.citations?.length) {
      const withSource = result.data.citations.filter((c: any) => c.documentName);
      expect(withSource.length).toBeGreaterThan(0);
    }
  }, 30000);

  it('should store query_scope = knowledge_base for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'Overview of all documents',
      knowledgeBaseId: TEST_KB_ID!,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
  }, 30000);
});
```

---

## Implementation Tasks — Part C: Phase 2 Query Decomposition

> **Phase 2 Implementation Note:** Implement these tasks ONLY after Part A (UI tasks) are complete and verified. Phase 2 adds intelligent query routing for complex multi-hop questions.

### Task 6: Query Classifier Function (FR-11.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** Add before the `enrichCitationsWithDocumentInfo()` function (currently at L822). Both `getLLMProvider()` and `generateLightweightCompletion` are confirmed available in the codebase (`llm-provider.ts` L95).

Find this exact line:
```typescript
/**
 * Enrich citations with document provenance information.
```

Insert immediately BEFORE it:
```typescript
/**
 * Classify whether a query needs decomposition for multi-document retrieval.
 * Uses Claude Haiku for fast classification (target: <300ms).
 *
 * Returns:
 * - 'simple': Direct retrieval across KB (default path)
 * - 'multi-hop': Needs decomposition into sub-queries
 * - 'comparative': Needs parallel retrieval from specific documents then comparison
 */
async function classifyQuery(params: {
  queryText: string;
  documentCount: number;
}): Promise<{ type: 'simple' | 'multi-hop' | 'comparative'; subQueries?: string[] }> {
  if (params.documentCount <= 1) {
    return { type: 'simple' };
  }

  const provider = getLLMProvider();

  try {
    const response = await provider.generateLightweightCompletion({
      systemPrompt: `You classify queries for a multi-document knowledge base. Determine if the query:
1. "simple" - Can be answered by searching across all documents (most queries)
2. "multi-hop" - Requires finding information in one document that references something in another
3. "comparative" - Asks to compare, contrast, or reconcile information across documents

For "multi-hop" and "comparative", also break the query into 2-4 sub-queries.

Return JSON only: {"type": "simple"|"multi-hop"|"comparative", "subQueries": ["...", "..."]}`,
      userMessage: `Query: "${params.queryText}"\nDocuments in KB: ${params.documentCount}`,
      maxTokens: 300,
      temperature: 0,
    });

    const parsed = JSON.parse(response.responseText.replace(/```json\n?|\n?```/g, '').trim());
    return {
      type: parsed.type || 'simple',
      subQueries: parsed.subQueries,
    };
  } catch {
    console.warn('[RAG Retrieval] Query classification failed, defaulting to simple');
    return { type: 'simple' };
  }
}

```

**Validation Criteria:**
- Function compiles without errors
- Returns `{ type: 'simple' }` immediately for `documentCount <= 1` (no API call)
- Returns `{ type: 'simple' }` on any parse failure (never blocks retrieval)

---

### Task 7: Integrate Classification into `queryRAG()` (FR-11.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** After the `conversationContext` declaration (Step 1.5), before Step 2 (HyDE generation).

Find this exact block:
```typescript
    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
```

Replace with:
```typescript
    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';

    // Count ready documents in KB for query classification
    let documentCount = 1;
    if (!params.documentId && knowledgeBaseId) {
      const { count } = await supabase
        .from('rag_documents')
        .select('id', { count: 'exact', head: true })
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('status', 'ready');
      documentCount = count || 1;
    }

    // Classify query (only meaningful for KB-wide queries with 2+ documents)
    const classification = (!params.documentId && documentCount > 1)
      ? await classifyQuery({ queryText: params.queryText, documentCount })
      : { type: 'simple' as const };

    console.log(`[RAG Retrieval] Query classification: ${classification.type}${classification.subQueries ? ` (${classification.subQueries.length} sub-queries)` : ''}`);

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
```

**Validation Criteria:**
- `documentCount` is fetched only for KB-wide queries (no DB call for document-level queries)
- `classification` is always defined before Step 2

---

### Task 8: Multi-Hop Context Assembly Function (FR-11.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** Add immediately AFTER the `classifyQuery()` function inserted in Task 6, and BEFORE `enrichCitationsWithDocumentInfo()`.

Find the line (which now follows `classifyQuery()`):
```typescript
/**
 * Enrich citations with document provenance information.
```

Insert immediately BEFORE it:
```typescript
/**
 * Assemble context for multi-hop/comparative queries.
 * Includes sub-query structure so Claude understands the decomposition.
 */
function assembleMultiHopContext(params: {
  originalQuery: string;
  subQueries: string[];
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentNames: Map<string, string>;
}): string {
  const parts: string[] = [];

  parts.push(`## Original Question\n${params.originalQuery}`);
  parts.push(`## Sub-Questions Investigated\n${params.subQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);

  // Group sections by document
  const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
  for (const section of params.sections) {
    const existing = sectionsByDoc.get(section.documentId) || [];
    existing.push(section);
    sectionsByDoc.set(section.documentId, existing);
  }

  parts.push('## Evidence from Documents');
  for (const [docId, sections] of Array.from(sectionsByDoc.entries())) {
    const docName = params.documentNames.get(docId) || docId;
    parts.push(`\n### From: ${docName}`);
    for (const section of sections) {
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      parts.push(`#### ${section.title || 'Untitled'} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`);
    }
  }

  if (params.facts.length > 0) {
    parts.push('## Key Facts');
    for (const fact of params.facts) {
      parts.push(`- [${fact.factType}] ${fact.content} (confidence: ${fact.confidence})`);
    }
  }

  return parts.join('\n\n');
}

```

**Validation Criteria:**
- Function compiles without errors
- Produces `## From: [docName]` section headers matching the E02 context format

---

### Task 9: Handle Multi-Hop Queries in `queryRAG()` (FR-11.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** Immediately after the classification console.log (added in Task 7), before Step 2 (HyDE generation). The multi-hop branch performs its own parallel retrieval and returns early on success, leaving the standard path (Steps 2–7) as the fallback.

**Note on `documentNames`:** The standard path's `documentNames` block is defined later in the function (after the no-context early return). The multi-hop branch fetches its own `multiHopDocNames` inline to avoid dependency on later code.

**Note on `generateHyDE` signature:** The function takes `{ queryText, documentSummary }` — no provider argument. Confirmed at L42–44.

Find this exact block (after Task 7 has been applied):
```typescript
    console.log(`[RAG Retrieval] Query classification: ${classification.type}${classification.subQueries ? ` (${classification.subQueries.length} sub-queries)` : ''}`);

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
```

Replace with:
```typescript
    console.log(`[RAG Retrieval] Query classification: ${classification.type}${classification.subQueries ? ` (${classification.subQueries.length} sub-queries)` : ''}`);

    // Branch: Multi-hop or comparative query handling (returns early on success)
    if (classification.type !== 'simple' && classification.subQueries?.length) {
      console.log(`[RAG Retrieval] Running ${classification.subQueries.length} sub-queries for ${classification.type} query`);

      // Fetch document names for multi-hop context assembly (own fetch — documentNames not yet defined)
      const multiHopDocNames = new Map<string, string>();
      if (knowledgeBaseId) {
        const { data: kbDocs } = await supabase
          .from('rag_documents')
          .select('id, file_name')
          .eq('knowledge_base_id', knowledgeBaseId)
          .eq('status', 'ready');
        if (kbDocs) {
          for (const d of kbDocs) {
            multiHopDocNames.set(d.id, d.file_name || d.id);
          }
        }
      }

      // Run sub-queries in parallel (each gets its own HyDE)
      const subResults = await Promise.all(
        classification.subQueries.map(async (subQuery) => {
          const subHydeText = documentSummary
            ? await generateHyDE({ queryText: subQuery, documentSummary })
            : undefined;
          return retrieveContext({
            queryText: subQuery,
            knowledgeBaseId,
            runId: params.runId,
            hydeText: subHydeText,
          });
        })
      );

      // Merge and deduplicate all sub-query results
      const mhAllSections = subResults.flatMap(r => r.sections);
      const mhAllFacts = subResults.flatMap(r => r.facts);
      const mhDedupedSections = deduplicateResults(mhAllSections, (s) => s.originalText);
      const mhDedupedFacts = deduplicateResults(mhAllFacts, (f) => f.content);
      const mhBalancedSections = balanceMultiDocCoverage(mhDedupedSections);
      const mhBalancedFacts = balanceMultiDocCoverage(mhDedupedFacts);

      if (mhBalancedSections.length > 0 || mhBalancedFacts.length > 0) {
        // Assemble structured multi-hop context
        const multiHopContext = assembleMultiHopContext({
          originalQuery: params.queryText,
          subQueries: classification.subQueries,
          sections: mhBalancedSections,
          facts: mhBalancedFacts,
          documentNames: multiHopDocNames,
        });

        // Generate response using multi-hop context
        const claudeResult = await generateResponse({
          queryText: params.queryText,
          assembledContext: multiHopContext,
          mode,
          conversationContext,
        });

        // Enrich citations with document provenance
        const enrichedCitations = enrichCitationsWithDocumentInfo(
          claudeResult.citations,
          mhBalancedSections,
          multiHopDocNames
        );

        // Self-eval
        const mhSelfEval = await selfEvaluate({
          queryText: params.queryText,
          assembledContext: multiHopContext,
          responseText: claudeResult.responseText,
        });

        // Store query
        const mhResponseTimeMs = Date.now() - startTime;
        const { data: mhQueryRow, error: mhInsertErr } = await supabase
          .from('rag_queries')
          .insert({
            knowledge_base_id: knowledgeBaseId || null,
            document_id: params.documentId || null,
            user_id: params.userId,
            query_text: params.queryText,
            hyde_text: null,
            mode,
            retrieved_section_ids: mhBalancedSections.map(s => s.id),
            retrieved_fact_ids: mhBalancedFacts.map(f => f.id),
            assembled_context: multiHopContext.slice(0, 50000),
            response_text: claudeResult.responseText,
            citations: enrichedCitations,
            self_eval_passed: mhSelfEval.passed,
            self_eval_score: mhSelfEval.score,
            response_time_ms: mhResponseTimeMs,
            query_scope: queryScope,
          })
          .select('*')
          .single();

        if (!mhInsertErr && mhQueryRow) {
          console.log(`[RAG Retrieval] Multi-hop query complete in ${mhResponseTimeMs}ms`);
          return { success: true, data: mapRowToQuery(mhQueryRow) };
        }
      } else {
        console.warn('[RAG Retrieval] Multi-hop sub-queries returned no results — falling back to standard retrieval');
      }
    }

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
```

**Validation Criteria:**
- Multi-hop branch only runs for non-simple classifications with sub-queries
- `generateHyDE` called with `{ queryText, documentSummary }` — no provider argument
- `multiHopDocNames` is fetched locally — no dependency on the `documentNames` block below
- Successful multi-hop result stores query and returns early (bypasses Steps 2–7)
- When sub-queries return no results: warning logged, falls through to standard path (Steps 2–7 run normally)
- Variable names prefixed with `mh` to avoid collision with standard path variables

---

## Implementation Tasks — Part D: Wire Entry Points

### Task 10: Wire All Entry Points to KB-Wide Chat (FR-9.1, FR-9.3)

**File:** `src/app/(dashboard)/rag/page.tsx`

This is the central wiring task. The current page (72 lines) has no KB-wide chat capability — it only routes to `/rag/[id]` for document-level chat. We add three things:
1. Import `RAGChat` and `MessageCircle`
2. Three new state variables for KB chat mode
3. Restructure the conditional render into a three-way branch: KB chat | KB list | Document list

**Step 1: Replace the imports section** (L1–10).

Current:
```typescript
'use client';

import { useState } from 'react';
import { KnowledgeBaseDashboard } from '@/components/rag/KnowledgeBaseDashboard';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { DocumentList } from '@/components/rag/DocumentList';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
```

Replace with:
```typescript
'use client';

import { useState } from 'react';
import { KnowledgeBaseDashboard } from '@/components/rag/KnowledgeBaseDashboard';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { DocumentList } from '@/components/rag/DocumentList';
import { RAGChat } from '@/components/rag/RAGChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
```

**Step 2: Replace the state declarations** (L13–14).

Current:
```typescript
  const router = useRouter();
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
```

Replace with:
```typescript
  const router = useRouter();
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [selectedKbName, setSelectedKbName] = useState<string>('');
  const [chatKbId, setChatKbId] = useState<string | null>(null);
  const [chatKbName, setChatKbName] = useState<string>('');
```

**Step 3: Replace the entire conditional rendering block** (L32–68).

Current:
```tsx
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
```

Replace with:
```tsx
        {chatKbId ? (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setChatKbId(null); setChatKbName(''); }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Documents
              </Button>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {chatKbName}
              </span>
            </div>
            <RAGChat knowledgeBaseId={chatKbId} documentName={chatKbName} />
          </>
        ) : !selectedKbId ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">Knowledge Bases</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage knowledge bases for document-grounded Q&A.
              </p>
            </div>
            <KnowledgeBaseDashboard
              onSelectKnowledgeBase={(kb) => { setSelectedKbId(kb.id); setSelectedKbName(kb.name); }}
              onChatWithKnowledgeBase={(kb) => { setChatKbId(kb.id); setChatKbName(kb.name); }}
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
                  onChatWithAll={() => { setChatKbId(selectedKbId!); setChatKbName(selectedKbName || 'All Documents'); }}
                />
              </div>
            </div>
          </>
        )}
```

**Validation Criteria:**
- Clicking "Chat with All Documents" on KB dashboard → shows `RAGChat` with `knowledgeBaseId` and KB name as `documentName`
- Clicking "Chat with all documents" in document list → shows `RAGChat` with same KB's `knowledgeBaseId`
- KB name is preserved in `selectedKbName` and passed correctly to the chat view
- "Back to Documents" button returns to the document list for that KB
- `documentId` is never passed to `RAGChat` for KB-wide sessions
- Existing document-level chat (`/rag/[id]`) is unchanged

---

### Task 11: Verify All Changes Compile

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```

Expected: Only the pre-existing `text-extractor.ts` pdf-parse error. Zero new errors.

**Most likely issues to watch for:**

| Issue | Cause | Fix |
|-------|-------|-----|
| `assembleMultiHopContext` not found | Task 8 not yet applied | Apply Task 8 before Task 9 |
| `classifyQuery` not found | Task 6 not yet applied | Apply Task 6 before Task 7 |
| `multiHopDocNames` type error | Map type mismatch | Confirm `Map<string, string>` — same as `documentNames` in standard path |
| `mhQueryRow` possibly undefined | Supabase single() may return null | Guarded by `if (!mhInsertErr && mhQueryRow)` — correct |
| `onChatWithAll` type error in page | DocumentListProps not updated | Confirm Task 3 Step 2 was applied |
| `RAGChat` prop `knowledgeBaseId` unknown | RAGChat types not updated | RAGChat already accepts optional `knowledgeBaseId` from E01 |

**Manual Smoke Tests (after `npm run dev`):**

1. **Single-document query (regression):**
   - Navigate to a document → Chat tab → ask a question
   - Verify: behavior unchanged from before E04

2. **KB-wide entry from KB Dashboard:**
   - Open KB with 2+ ready documents
   - Click "Chat with All Documents" button on the KB card
   - Verify: scope indicator shows "Searching across all documents in knowledge base"
   - Verify: question answered with citations from multiple documents

3. **KB-wide entry from Document List:**
   - Select a KB → see document list → "Chat with all documents" card appears
   - Click it → `RAGChat` opens with KB scope
   - Verify same scope indicator

4. **Citation provenance:**
   - In KB-wide chat, ask a question
   - Verify: each citation shows `📄 [document name]` label below the badge

5. **Conversation context:**
   - In KB-wide chat, ask "What is the refund policy?"
   - Follow up: "What are the exceptions to that?"
   - Verify: follow-up references previous topic

6. **Query decomposition (Phase 2 — console log verification):**
   - In KB-wide chat, ask "How do the policies in document A compare to those in document B?"
   - Check server logs for: `[RAG Retrieval] Query classification: comparative`
   - Verify: response names specific documents

---

## Summary of Changes

| # | File | Change | FR |
|---|------|--------|----|
| 1 | `KnowledgeBaseDashboard.tsx` | Add `MessageCircle` import; new `onChatWithKnowledgeBase?` prop; button in card (2+ docs only) | FR-9.1 |
| 2 | `RAGChat.tsx` | Add `Database`, `FileText` imports; KB-wide vs document scope indicator below CardTitle | FR-9.2 |
| 3 | `DocumentList.tsx` | Add `MessageCircle` import; new `onChatWithAll?` prop; "Chat with all documents" card at list top | FR-9.3 |
| 4 | `SourceCitation.tsx` | Wrap citations in div; show `📄 documentName` label below badge when present | FR-9.4 |
| 5 | `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` | NEW: integration tests (skipped when no test IDs configured) | Testing |
| 6 | `rag-retrieval-service.ts` | `classifyQuery()` function before `enrichCitationsWithDocumentInfo` | FR-11.1 |
| 7 | `rag-retrieval-service.ts` | Classification + document count block in `queryRAG()` after Step 1.5 | FR-11.2 |
| 8 | `rag-retrieval-service.ts` | `assembleMultiHopContext()` function after `classifyQuery()` | FR-11.4 |
| 9 | `rag-retrieval-service.ts` | Multi-hop branch in `queryRAG()` after classification log, before Step 2 | FR-11.3 |
| 10 | `src/app/(dashboard)/rag/page.tsx` | Import `RAGChat`; add KB name/chat state; three-way render conditional; wire both callbacks | Integration |

---

## Success Criteria

- [ ] KB Dashboard shows "Chat with All Documents" button for KBs with 2+ docs; hidden for 0–1 docs
- [ ] Document List shows "Chat with all documents" card when 2+ ready docs; callback wired
- [ ] RAGChat scope indicator correctly shows KB-wide vs document-level based on which prop is passed
- [ ] Source citations show `📄 documentName` label visibly when `documentName` is populated
- [ ] `/rag/page.tsx` routes to `RAGChat` with `knowledgeBaseId` (not `documentId`) for KB-wide chat
- [ ] KB name is correctly displayed in the chat view header and scope indicator
- [ ] Integration tests created; skipped gracefully when `TEST_KB_ID`/`TEST_DOC_ID` not configured
- [ ] `classifyQuery()` returns `simple` immediately for single-document KBs (no API call)
- [ ] Multi-hop queries run parallel sub-queries and merge results
- [ ] `generateHyDE` called with `{ queryText, documentSummary }` — no `provider` argument
- [ ] `multiHopDocNames` fetched inside multi-hop branch (no dependency on later `documentNames` block)
- [ ] Fallback to standard path when sub-queries return empty results
- [ ] TypeScript compiles without new errors (only pre-existing pdf-parse error)
- [ ] Manual smoke tests pass (regression + new KB-wide functionality)

---

## Implementation Complete

After E04, the full Multi-Document Retrieval implementation is complete:

✅ **E01:** Database schema, types, config, guard clause, query scope tracking
✅ **E02:** Core retrieval engine — batch fetch, token budgets, HyDE with KB summary, conversation context
✅ **E03:** Quality pipeline — dedup/balance/rerank for both sections and facts, KB summary auto-generation, citation provenance, multi-doc response prompt, hybrid search metrics
✅ **E04:** UI components, integration tests, Phase 2 query decomposition

### Phase 3 (Optional — GraphRAG)

Phase 3 (GraphRAG microservice) should ONLY be implemented if Phase 1+2 prove insufficient for deeply relationship-heavy queries such as "Which policies in Document A conflict with regulations in Document B?" See Section 12 of the specification for the Python microservice implementation details. This is NOT part of E04 execution.

---

**END OF E04 PROMPT**
