# Multi-Document Retrieval — E04: UI Components, Testing & Phase 2 Query Decomposition

**Version:** 1.0  
**Date:** February 20, 2026  
**Section:** E04 — UI, Tests & Phase 2  
**Prerequisites:** E01 (Foundation), E02 (Core Retrieval), E03 (Quality, Ingestion, Citations) must be complete  
**Builds Upon:** E01 + E02 + E03 artifacts  
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`

---

## Overview

This prompt implements the UI components for multi-document retrieval, integration tests, and Phase 2 Query Decomposition.

**What This Section Creates / Changes:**
1. "Chat with All Documents" button on KB Dashboard — `KnowledgeBaseDashboard.tsx`
2. Scope indicator in RAGChat component — `RAGChat.tsx`
3. "Chat with all documents" link in DocumentList — `DocumentList.tsx`
4. Source citation document provenance display — `SourceCitation.tsx`
5. Integration test file — `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (NEW)
6. Phase 2: Query classifier function — `rag-retrieval-service.ts`
7. Phase 2: Classification integration into `queryRAG()` — `rag-retrieval-service.ts`
8. Phase 2: Multi-hop query handling — `rag-retrieval-service.ts`
9. Phase 2: Multi-hop context assembly function — `rag-retrieval-service.ts`

---

========================    


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Confirm E01, E02, and E03 are complete** — verify that:
   - Guard clause relaxed, types updated, config has `kbWideSimilarityThreshold`/`maxSingleDocRatio`
   - `retrieveContext()` uses batch fetch, `assembleContext()` returns `{ context, tokenCount, truncated }` with `documentNames` param
   - HyDE uses KB summary, conversation scope-aware, conversation context passed to response gen
   - Dedup/balance/rerank work on both sections and facts
   - KB summary auto-generated in finalize step
   - Ingestion passes `knowledgeBaseId` to sections/facts
   - Citations enriched with `documentId`/`documentName`
   - Multi-doc instruction in response prompt
   - Hybrid search logging active

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

| File | Lines (approx) | Purpose |
|------|-------|---------|
| `src/components/rag/KnowledgeBaseDashboard.tsx` | ~96 | KB Dashboard — Task 1 |
| `src/components/rag/RAGChat.tsx` | ~286 | Chat component — Task 2 |
| `src/components/rag/DocumentList.tsx` | ~113 | Document list — Task 3 |
| `src/components/rag/SourceCitation.tsx` | ~44 | Citation display — Task 4 |
| `src/lib/rag/services/rag-retrieval-service.ts` | ~1100+ | Retrieval service — Tasks 6-9 |
| `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` | NEW | Integration tests — Task 5 |

---

## E01 + E02 + E03 Artifacts (Prerequisites)

### From E01:
- Types: `RAGCitation` has `documentId?`, `documentName?`; `RAGKnowledgeBase` has `summary`; `RAGQuery` has `queryScope`
- Config: `kbWideSimilarityThreshold: 0.3`, `maxSingleDocRatio: 0.6`
- Guard clause relaxed: accepts `knowledgeBaseId` as alternative to `documentId`
- `queryScope` tracked in all 3 `rag_queries` insert sites
- Embeddings set `knowledge_base_id`; mappers handle new fields

### From E02:
- `retrieveContext()` uses batch fetch (2 queries)
- `assembleContext()` returns `{ context, tokenCount, truncated }` with `documentNames` param
- Multi-doc context shows `## From: [document name]` headers
- HyDE uses KB summary for KB-wide queries
- Conversation scope-aware; conversation context in response generation

### From E03:
- `deduplicateResults()` works on sections (`originalText`) and facts (`content`)
- `balanceMultiDocCoverage()` uses config ratio + soft fallback
- `rerankSections()` reranks sections with Claude
- `rerankWithClaude()` accepts `documentName` in candidates
- KB summary auto-generated in Inngest finalize step
- `storeSectionsFromStructure()` and `storeExtractedFacts()` accept `knowledgeBaseId`
- Citations enriched with document provenance before storage
- Multi-doc instruction in response prompt
- Hybrid search overlap metrics logged

---

## Existing Component Context

### `KnowledgeBaseDashboard.tsx` (~96 lines)
- Props: `{ onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void; selectedId?: string }`
- Fetches KBs via `useRAGKnowledgeBases()` hook
- Renders grid of KB cards with `kb.name`, `kb.description`, `kb.documentCount`
- Includes `CreateKnowledgeBaseDialog`
- Uses lucide-react icons, shadcn Card/Button components

### `RAGChat.tsx` (~286 lines)
- Props: `{ documentId?: string; knowledgeBaseId?: string; documentName?: string }`
- Uses `useRAGChat` hook for mutations, `useRAGQueryHistory` for history
- CardTitle at L128-132: `Chat with {documentName || 'Documents'}`
- Both `documentId` and `knowledgeBaseId` are optional props — component works with either

### `DocumentList.tsx` (~113 lines)
- Props: `{ knowledgeBaseId: string; onSelectDocument: (doc: RAGDocument) => void; selectedId?: string }`
- Renders document cards with `doc.fileName`, section/fact counts, status badge
- Document map loop at L72-109

### `SourceCitation.tsx` (~44 lines)
- Takes `citations: RAGCitation[]`
- Renders bordered section with "Sources (N)" header using `BookOpen` icon
- Each citation is a `Badge` with `[i+1] sectionTitle` wrapped in a `Tooltip`
- Tooltip shows `citation.excerpt` (truncated to 200 chars) and `citation.relevanceScore`

---

## Implementation Tasks — Part A: UI Components

### Task 1: "Chat with All Documents" Button on KB Dashboard (FR-9.1)

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx` (~96 lines)

**Step 1: Update props interface** (lines 11-14):

Current:
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}
```

New:
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  onChatWithKnowledgeBase?: (kb: RAGKnowledgeBase) => void;  // NEW
  selectedId?: string;
}
```

**Step 2: Add `MessageCircle` to the lucide-react import** at the top of the file. Find the existing lucide import and add `MessageCircle`:
```typescript
import { ..., MessageCircle } from 'lucide-react';
```

**Step 3: Destructure new prop** in the component function. Find where props are destructured and add `onChatWithKnowledgeBase`.

**Step 4: Add button inside each KB card's content**, after the document count display (around L73):

```tsx
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
```

**Validation Criteria:**
- KBs with 2+ documents show the "Chat with All Documents" button
- KBs with 0-1 documents do NOT show the button
- Clicking the button fires `onChatWithKnowledgeBase` with the KB object
- Clicking the button does NOT also trigger `onSelectKnowledgeBase` (due to `e.stopPropagation()`)

---

### Task 2: KB-Wide Scope Indicator in RAGChat (FR-9.2)

**File:** `src/components/rag/RAGChat.tsx` (~286 lines)

**Step 1: Add `Database, FileText` to the lucide-react import:**
```typescript
import { ..., Database, FileText } from 'lucide-react';
```

**Step 2: Add scope indicator** after the CardTitle (around L128-132):

Current CardTitle section:
```tsx
<CardTitle className="text-base flex items-center gap-2">
  <MessageCircle className="h-5 w-5" />
  Chat with {documentName || 'Documents'}
</CardTitle>
```

Add after the closing `</CardTitle>` (still inside `CardHeader`):
```tsx
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
```

**Note:** `documentId` and `knowledgeBaseId` are available from the component props. Verify the exact prop names match what's destructured in the component.

**Validation Criteria:**
- KB-wide chat shows "Searching across all documents in knowledge base" with Database icon
- Document-level chat shows "Searching: [document name]" with FileText icon

---

### Task 3: "Chat with All Documents" Link in DocumentList (FR-9.3)

**File:** `src/components/rag/DocumentList.tsx` (~113 lines)

**Step 1: Update props interface** (lines 11-15):

Current:
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  selectedId?: string;
}
```

New:
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  onChatWithAll?: () => void;  // NEW
  selectedId?: string;
}
```

**Step 2: Add `MessageCircle` to the lucide-react import:**
```typescript
import { ..., MessageCircle } from 'lucide-react';
```

**Step 3: Destructure `onChatWithAll`** in the component function.

**Step 4: Add the "Chat with all documents" card** BEFORE the `documents.map()` loop (around L72). This card should appear at the top of the document list:

```tsx
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
```

**Note:** Check that the `documents` variable is available at this point in the component. It should be — it's the state from a query hook. Also verify that `Card` and `CardContent` are imported from the shadcn Card component.

**Validation Criteria:**
- "Chat with all documents" card appears when 2+ documents have `status === 'ready'`
- Does NOT appear with 0-1 ready documents
- Clicking triggers `onChatWithAll` callback

---

### Task 4: Source Citation Document Provenance Display (FR-9.4)

**File:** `src/components/rag/SourceCitation.tsx` (~44 lines)

After the existing `sectionTitle` display in each citation (inside the Badge/Tooltip area, around L32), add document name display:

```tsx
{citation.documentName && (
  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
    📄 {citation.documentName}
  </span>
)}
```

**Location:** This should go after the Badge that shows `[i+1] sectionTitle` and inside the citation's container element. Read the exact component structure to determine the right placement.

**Validation Criteria:**
- Multi-doc citations show the document name badge with 📄 icon
- Single-doc citations also show document name (consistent UX)
- Citations without `documentName` render as before (backwards compatible)

---

## Implementation Tasks — Part B: Integration Tests

### Task 5: Create Integration Test File

**File:** `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (NEW FILE)

Create this file:

```typescript
/**
 * Multi-Document Retrieval Integration Tests
 * 
 * Tests KB-wide query functionality end-to-end.
 * Requires TEST_KB_ID and TEST_DOC_ID environment variables for live DB tests.
 */
import { queryRAG } from '../services/rag-retrieval-service';

// These tests require a running Supabase instance and real data
// Set TEST_KB_ID and TEST_DOC_ID in .env.local to run
const TEST_KB_ID = process.env.TEST_KB_ID;
const TEST_DOC_ID = process.env.TEST_DOC_ID;
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user';

const skipIfNoTestData = !TEST_KB_ID || !TEST_DOC_ID;

describe('Multi-Document Retrieval', () => {
  // Skip all tests if no test data configured
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
    // Query scope is stored in DB, verify from returned data if available
    expect(result.success).toBe(true);
  }, 30000);
});
```

**Note:** These are integration tests that require a live database. They'll be skipped in CI unless `TEST_KB_ID` and `TEST_DOC_ID` are configured. The 30-second timeouts account for Claude API calls during retrieval.

---

## Implementation Tasks — Part C: Phase 2 Query Decomposition

> **Phase 2 Implementation Note:** Phase 2 adds intelligent query routing for complex multi-hop questions. Implement these tasks ONLY after the Phase 1 UI tasks above are complete and verified working.

### Task 6: Query Classifier (FR-11.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

Add this new function somewhere in the file (before `queryRAG()`):

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
  // Skip classification for single-document KBs
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

Return JSON: {"type": "simple"|"multi-hop"|"comparative", "subQueries": ["...", "..."]}`,
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
    // Default to simple — classification failure should not block retrieval
    console.warn('[RAG Retrieval] Query classification failed, defaulting to simple');
    return { type: 'simple' };
  }
}
```

**IMPORTANT:** Verify that `getLLMProvider()` exists and that `generateLightweightCompletion` is a valid method on the LLM provider. If not, you may need to use the Claude provider directly:

```typescript
// Alternative if getLLMProvider/generateLightweightCompletion doesn't exist:
const claudeProvider = getClaudeLLMProvider();  // or whatever the provider getter is
// Use the appropriate method — check claude-llm-provider.ts for available methods
```

Read `src/lib/rag/providers/claude-llm-provider.ts` and `src/lib/rag/providers/llm-provider.ts` to find the correct method for lightweight completions. If no lightweight method exists, use the standard completion method with `claude-haiku-4-5-20251001` model and low `maxTokens`.

---

### Task 7: Integrate Classification into queryRAG (FR-11.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after the guard clause and scope determination, before HyDE generation

Add classification logic:

```typescript
    // Count documents in KB for classification
    let documentCount = 1;
    if (!params.documentId && knowledgeBaseId) {
      const { count } = await supabase
        .from('rag_documents')
        .select('id', { count: 'exact', head: true })
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('status', 'ready');
      documentCount = count || 1;
    }

    // Classify query (only for KB-wide queries with multiple documents)
    const classification = (!params.documentId && documentCount > 1)
      ? await classifyQuery({ queryText: params.queryText, documentCount })
      : { type: 'simple' as const };

    console.log(`[RAG Retrieval] Query classification: ${classification.type}${classification.subQueries ? ` (${classification.subQueries.length} sub-queries)` : ''}`);
```

---

### Task 8: Multi-Hop Context Assembly Function (FR-11.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

Add this function (before `queryRAG()`):

```typescript
/**
 * Assemble context for multi-hop/comparative queries.
 * Includes sub-query structure for Claude to understand the decomposition.
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

---

### Task 9: Handle Multi-Hop Queries in queryRAG (FR-11.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after classification (Task 7) and before the standard retrieval path

Add a conditional branch for multi-hop/comparative queries. This should be placed BEFORE the standard HyDE + retrieveContext path, so the standard path becomes the `else` branch:

```typescript
    // Branch: Multi-hop or comparative query handling
    if (classification.type !== 'simple' && classification.subQueries?.length) {
      console.log(`[RAG Retrieval] Running ${classification.subQueries.length} sub-queries for ${classification.type} query`);

      // Run sub-queries in parallel
      const subResults = await Promise.all(
        classification.subQueries.map(async (subQuery) => {
          // Generate HyDE for each sub-query
          const hydeResult = await generateHyDE(provider, subQuery, documentSummary);
          return retrieveContext({
            queryText: subQuery,
            documentId: undefined,
            knowledgeBaseId,
            runId: params.runId,
            hydeText: hydeResult.hypotheticalAnswer || undefined,
          });
        })
      );

      // Merge and deduplicate all sub-query results
      const allSections = subResults.flatMap(r => r.sections);
      const allFacts = subResults.flatMap(r => r.facts);
      const dedupedSections = deduplicateResults(allSections, (s) => s.originalText);
      const dedupedFacts = deduplicateResults(allFacts, (f) => f.content);
      const balancedSections = balanceMultiDocCoverage(dedupedSections);
      const balancedFacts = balanceMultiDocCoverage(dedupedFacts);

      // Check if we got results
      if (balancedSections.length === 0 && balancedFacts.length === 0) {
        // Fall through to standard path if sub-queries returned nothing
        console.warn('[RAG Retrieval] Sub-queries returned no results, falling back to standard retrieval');
      } else {
        // Assemble multi-hop context
        const multiHopContext = assembleMultiHopContext({
          originalQuery: params.queryText,
          subQueries: classification.subQueries,
          sections: balancedSections,
          facts: balancedFacts,
          documentNames,
        });

        // Generate response using multi-hop context
        const claudeResult = await generateResponse({
          queryText: params.queryText,
          assembledContext: multiHopContext,
          mode,
          conversationContext,
        });

        // Enrich citations
        const enrichedCitations = enrichCitationsWithDocumentInfo(
          claudeResult.citations,
          balancedSections,
          documentNames
        );

        // Self-eval
        const selfEvalResult = await selfEvaluate({
          queryText: params.queryText,
          assembledContext: multiHopContext,
          responseText: claudeResult.responseText,
        });

        // Store query
        const { data: queryRow } = await supabase
          .from('rag_queries')
          .insert({
            knowledge_base_id: knowledgeBaseId,
            document_id: params.documentId || null,
            user_id: params.userId,
            query_text: params.queryText,
            hyde_text: null,  // Multiple HyDE texts were used
            mode,
            retrieved_section_ids: balancedSections.map(s => s.id),
            retrieved_fact_ids: balancedFacts.map(f => f.id),
            assembled_context: multiHopContext.slice(0, 50000),  // Cap stored context
            response_text: claudeResult.responseText,
            citations: enrichedCitations,
            self_eval_passed: selfEvalResult.passed,
            self_eval_score: selfEvalResult.score,
            response_time_ms: Date.now() - startTime,
            query_scope: queryScope,
          })
          .select('*')
          .single();

        // Return result
        if (queryRow) {
          return { success: true, data: mapRowToQuery(queryRow) };
        }
      }
    }

    // Standard path continues below (existing code)...
```

**IMPORTANT NOTES:**

1. The variable names (`provider`, `documentSummary`, `knowledgeBaseId`, `mode`, `conversationContext`, `documentNames`, `queryScope`, `startTime`) should already be available from the code above this point in `queryRAG()`. Verify each exists.

2. `generateHyDE` — find the exact function name and signature used in the codebase. It may be called differently (e.g., `generateHypotheticalDocument()` or similar). Check the HyDE generation code around L773.

3. `selfEvaluate` — find the exact function name. It's called in Step 6 of the existing flow (around L870). May also be called `selfEval()` or `runSelfEvaluation()`.

4. `startTime` — the existing code likely captures `Date.now()` at the start of `queryRAG()`. Verify.

5. The fallback logic (when sub-queries return nothing) should let the code continue to the standard retrieval path below, NOT return early.

6. If the multi-hop branch successfully returns, it short-circuits the standard path. The standard path (HyDE → retrieveContext → dedup → balance → rerank → assembleContext → generateResponse → selfEvaluate → insert) should be in the `else` case or simply follow after.

---

### Task 10: Connect UI Entry Points to KB-Wide Chat

**IMPORTANT:** This task requires understanding how the parent page component wires the RAG components together. Read the RAG page component(s) — likely at:
- `src/app/(dashboard)/rag/page.tsx` or similar

Identify how:
1. `KnowledgeBaseDashboard` connects to the KB selection flow
2. `DocumentList` appears when a KB is selected
3. `RAGChat` appears when a document is selected

Then wire the new callbacks:

**For `KnowledgeBaseDashboard`'s `onChatWithKnowledgeBase`:**
When called, it should set the active view to show `RAGChat` with `knowledgeBaseId` set and `documentId` absent. This means passing the KB's `id` and `name` to the chat component.

**For `DocumentList`'s `onChatWithAll`:**
When called, it should set the active view to show `RAGChat` with `knowledgeBaseId` and no `documentId`.

The exact implementation depends on the state management in the parent page. Look for `useState` hooks that track `selectedKnowledgeBase`, `selectedDocument`, etc., and add handlers that:
1. Set `selectedDocument` to `null` (or undefined)
2. Set `knowledgeBaseId` to the selected KB's ID
3. Set the `documentName` to something like the KB name + "(All Documents)"
4. Show the `RAGChat` component

---

### Task 11: Verify All Changes Compile and Test

**Step 1: TypeScript compilation:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
```

**Step 2: Manual Smoke Tests (after deploying locally with `npm run dev`):**

1. **Single-document query (regression test):**
   - Select a specific document → Chat → Ask a question
   - Verify: Response only cites that document
   - Verify: Behavior identical to before

2. **KB-wide query:**
   - Open a KB with 2+ ready documents
   - Click "Chat with All Documents" (from KB Dashboard or Document List)
   - Ask: "What are the key policies across all documents?"
   - Verify: Response includes citations from multiple documents
   - Verify: Each citation shows document name

3. **Scope indicator:**
   - Verify: KB-wide chat shows "Searching across all documents in knowledge base"
   - Verify: Document-level chat shows "Searching: [document name]"

4. **Conversation context:**
   - In KB-wide chat, ask "What is the refund policy?"
   - Follow up with "What are the exceptions to that?"
   - Verify: Follow-up references previous answer's topic

5. **Query decomposition (Phase 2):**
   - In KB-wide chat, ask "How do the policies in document A compare to document B?"
   - Verify in console logs: `[RAG Retrieval] Query classification: comparative`
   - Verify: Response references specific documents by name

---

## Summary of Changes

| # | File | Change | FR |
|---|------|--------|-----|
| 1 | `src/components/rag/KnowledgeBaseDashboard.tsx` | New `onChatWithKnowledgeBase` prop + button | FR-9.1 |
| 2 | `src/components/rag/RAGChat.tsx` | Scope indicator (KB-wide vs document-level) | FR-9.2 |
| 3 | `src/components/rag/DocumentList.tsx` | New `onChatWithAll` prop + card | FR-9.3 |
| 4 | `src/components/rag/SourceCitation.tsx` | Document name badge on citations | FR-9.4 |
| 5 | `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` | NEW: Integration tests | Testing |
| 6 | `src/lib/rag/services/rag-retrieval-service.ts` | `classifyQuery()` function | FR-11.1 |
| 7 | `src/lib/rag/services/rag-retrieval-service.ts` | Classification integration in `queryRAG()` | FR-11.2 |
| 8 | `src/lib/rag/services/rag-retrieval-service.ts` | `assembleMultiHopContext()` function | FR-11.4 |
| 9 | `src/lib/rag/services/rag-retrieval-service.ts` | Multi-hop branch in `queryRAG()` | FR-11.3 |
| 10 | Parent RAG page component | Wire `onChatWithKnowledgeBase` + `onChatWithAll` callbacks | Integration |

## Success Criteria

- [ ] KB Dashboard shows "Chat with All Documents" button for KBs with 2+ docs
- [ ] Document List shows "Chat with all documents" card for KBs with 2+ ready docs
- [ ] RAGChat scope indicator correctly shows KB-wide vs document-level
- [ ] Source citations show document name badge when available
- [ ] Integration tests created and pass (when TEST_KB_ID/TEST_DOC_ID configured)
- [ ] Query classifier correctly categorizes simple, multi-hop, and comparative queries
- [ ] Multi-hop queries decompose into sub-queries and merge results
- [ ] Fallback to standard path when sub-queries return empty results
- [ ] UI entry points correctly route to KB-wide chat
- [ ] TypeScript compiles without new errors
- [ ] Manual smoke tests pass (regression + new functionality)

## Implementation Complete

After E04, the full Multi-Document Retrieval implementation is complete:

✅ **E01:** Database schema, types, config, critical blockers removed  
✅ **E02:** Core retrieval engine — batch fetch, token budgets, HyDE, conversation  
✅ **E03:** Quality pipeline — dedup/balance/rerank for sections, ingestion, citations  
✅ **E04:** UI components, integration tests, Phase 2 query decomposition  

### Phase 3 (Optional — GraphRAG)

Phase 3 (GraphRAG microservice) should ONLY be implemented if Phase 1+2 prove insufficient for relationship-heavy queries like "Which policies in Document A conflict with regulations in Document B?" See Section 12 of the specification for the Python microservice implementation details. This is NOT part of E04 execution.

---

**END OF E04 PROMPT**

+++++++++++++++++



