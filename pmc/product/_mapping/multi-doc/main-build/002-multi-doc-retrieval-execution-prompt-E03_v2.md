# Multi-Document Retrieval — E03: Quality, Ingestion & Observability

**Version:** 2.0
**Date:** February 20, 2026
**Section:** E03 — Quality Pipeline, Ingestion, Citations & Observability
**Prerequisites:** E01 (Foundation) and E02 (Core Retrieval Engine) must be complete
**Builds Upon:** E01 + E02 artifacts
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`
**Supersedes:** `002-multi-doc-retrieval-execution-prompt-E03_v1.md`

---

## Changes from v1 → v2

This version was updated after E02 was executed. All line numbers, code samples, and variable names have been verified against the live codebase.

| Area | v1 Said | v2 Corrects |
|------|---------|-------------|
| `rag-retrieval-service.ts` size | "~1000+" | 1140 lines |
| `deduplicateResults()` location | "~L371" | L503–518 |
| `balanceMultiDocCoverage()` location | "~L415" | L550–574 |
| `rerankWithClaude()` location | "~L298" | L403–493; candidateList at L416–418 |
| `generateResponse()` location | "~L463" | L580–626; system prompt at L588–601 |
| Step 4 in `queryRAG()` | "~L820–845" | L955–986 |
| `documentNames` block location | N/A (not yet in file) | Now at L988–1001 post-E02 — **must move before Step 4** (new prerequisite for Tasks 2 and 4) |
| Task 2: Step 4 approach | Piecemeal insertions | Complete block replacement (cleaner, avoids partial state) |
| Task 4: fact reranker call site | Shown as separate edit | Folded into the Step 4 complete replacement |
| Task 6b call site count | "7 call sites" | 6 call sites (1× `storeSectionsFromStructure` + 5× `storeExtractedFacts`) |
| Task 6b line numbers | L104, L126, L174, L196, L247, L321 | L107, L132, L203, L234, L272, L322 |
| Task 7: citation source variable | `claudeResult.citations` | `citations` (the unified variable after the rag/lora if-else) |
| Task 7: sections variable | "finalSections" (ambiguous) | `finalSections` confirmed (output of Task 2 section reranking) |
| Task 9: insertion point | "after BM25 results but before merge" (vague) | Between L140 and L141 in new batch-fetch `retrieveContext()` |

---

## Overview

This prompt implements the quality pipeline extensions (dedup/balance/rerank for sections), ingestion pipeline changes (KB summary generation, KB ID propagation), citation enrichment with document provenance, multi-doc response instructions, and observability logging.

**What This Section Creates / Changes:**
1. `deduplicateResults()` accepts a text accessor — callable on sections (`originalText`) and facts (`content`)
2. `balanceMultiDocCoverage()` uses `RAG_CONFIG.retrieval.maxSingleDocRatio` + soft fallback
3. Add `rerankSections()` wrapper function
4. `rerankWithClaude()` accepts `documentName` in candidates + updates candidateList builder
5. Move `documentNames` block before Step 4 in `queryRAG()` (prerequisite for Tasks 2 and 4)
6. Replace entire Step 4 block: dedup → balance → rerank for both sections AND facts
7. Update `assembleContext()` call to use `finalSections` / `finalFacts`
8. KB summary auto-generation on document finalization (`process-rag-document.ts`)
9. `storeSectionsFromStructure()` + `storeExtractedFacts()` accept `knowledgeBaseId` (`rag-ingestion-service.ts`)
10. Update all 6 call sites in `process-rag-document.ts` to pass `doc.knowledgeBaseId`
11. `enrichCitationsWithDocumentInfo()` helper + call in `queryRAG()`
12. Multi-doc instruction in `generateResponse()` system prompt
13. Hybrid search disjoint-ratio logging in `retrieveContext()`

**What This Section Does NOT Create:**
- UI components (E04)
- Integration tests (E04)
- Phase 2 Query Decomposition (E04)

---

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — all line numbers and code samples are verified against the live codebase
2. **Read `src/lib/rag/services/rag-retrieval-service.ts`** — confirm current state at all locations referenced
3. **Read `src/inngest/functions/process-rag-document.ts`** — confirm finalize step location and call sites
4. **Read `src/lib/rag/services/rag-ingestion-service.ts`** — confirm function signatures before modifying
5. **Execute as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| AI — Retrieval | Claude Haiku 4.5 for HyDE, response gen, self-eval, reranking |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Background Jobs | Inngest |

### Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` | 1140 | Main retrieval service — Tasks 1–7, 12, 13 |
| `src/lib/rag/services/rag-ingestion-service.ts` | 1049 | Ingestion service — Task 9 |
| `src/inngest/functions/process-rag-document.ts` | 586 | Inngest pipeline — Tasks 8, 10 |
| `src/lib/rag/config.ts` | ~100 | Config (modified in E01) |
| `src/types/rag.ts` | ~647 | Types (modified in E01) |

---

## E01 + E02 Artifacts (Prerequisites — Must Already Exist)

### From E01:
- `RAGCitation` has `documentId?` and `documentName?` fields
- `RAGKnowledgeBase`/`RAGKnowledgeBaseRow` have `summary` field
- `RAGQuery` has `queryScope`; `RAGQueryRow` has `query_scope`
- `RAG_CONFIG.retrieval.kbWideSimilarityThreshold = 0.3`
- `RAG_CONFIG.retrieval.maxSingleDocRatio = 0.6`
- Guard clause accepts `knowledgeBaseId`
- `queryScope` tracked in all 3 `rag_queries` insert sites
- `generateAndStoreEmbedding()` sets `knowledge_base_id`
- Mappers handle `summary` and `queryScope`
- Database: `summary` on `rag_knowledge_bases`, `query_scope` on `rag_queries`, `knowledge_base_id` on facts/sections, indexes created

### From E02:
- `retrieveContext()` uses batch fetch (2 queries instead of ~50), at L63–219
- Non-ready documents filtered from KB-wide results (inside `retrieveContext()`)
- `assembleContext()` returns `{ context, tokenCount, truncated }` with token budgets at L230–376
- `truncateAtSentence()` helper at L381–393
- `documentNames` Map created at L988–1001 — **currently between Step 4 and Step 5, must be moved to before Step 4 by Task 5**
- HyDE uses KB summary for KB-wide queries (falls back to description)
- Conversation history scope-aware (document-level or KB-level)
- Conversation context passed to `generateResponse()`

---

## Existing Code Context (Verified Against Live Codebase)

### Current `deduplicateResults()` (L503–518):

```typescript
function deduplicateResults<T extends { content: string; similarity: number }>(
  results: T[]
): T[] {
  const deduped: T[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(existing.content, result.content) > 0.9
    );
    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}
```

The `T extends { content: string }` constraint means it cannot be called on sections (which use `originalText`). E03 Task 1 adds a `textFn` parameter.

### Current `balanceMultiDocCoverage()` (L550–574):

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = 0.6    // hardcoded — should use RAG_CONFIG
): T[] {
  // ... no soft fallback ...
  return balanced;
}
```

Two issues: hardcoded 0.6 (not reading from config) and no soft-fallback when >30% of results are dropped. E03 Task 2 fixes both.

### Current `rerankWithClaude()` (L403–493):

Candidates type is `Array<{ id: string; content: string; similarity: number }>` — no `documentName`. The candidateList builder at L416–418 is:

```typescript
  const candidateList = params.candidates
    .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
    .join('\n');
```

E03 Task 4 adds `documentName?` and updates the candidateList builder.

### Current Step 4 in `queryRAG()` (L955–986) — FACTS ONLY:

```typescript
    // Step 4: Rerank + Dedup + Balance (Phase 3)
    let processedFacts = retrieved.facts;
    if (processedFacts.length > 3) {
      // Rerank with Claude Haiku
      const reranked = await rerankWithClaude({
        queryText: params.queryText,
        candidates: processedFacts.map(f => ({
          id: f.id,
          content: f.content,
          similarity: f.similarity,
        })),
        topK: Math.min(processedFacts.length, 15),
      });

      // Rebuild fact list in reranked order
      const rerankedFactMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
      processedFacts = processedFacts
        .filter(f => rerankedFactMap.has(f.id))
        .sort((a, b) => (rerankedFactMap.get(b.id) || 0) - (rerankedFactMap.get(a.id) || 0));
    }

    // Deduplicate cross-document overlaps
    const dedupedFacts = deduplicateResults(
      processedFacts.map(f => ({ ...f, content: f.content, similarity: f.similarity }))
    );

    // Balance multi-doc coverage (if KB-wide search)
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(
        dedupedFacts.map(f => ({ ...f, documentId: f.documentId }))
      )
      : dedupedFacts;
```

Sections go directly to `assembleContext()` without dedup, balance, or rerank. E03 fixes this.

### Current `documentNames` block (L988–1001) — currently between Step 4 and Step 5:

```typescript
    // Resolve document names for multi-doc context headers
    const documentNames = new Map<string, string>();
    if (!params.documentId && knowledgeBaseId) {
      const { data: docs } = await supabase
        .from('rag_documents')
        .select('id, file_name')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('status', 'ready');

      if (docs) {
        for (const doc of docs) {
          documentNames.set(doc.id, doc.file_name || doc.id);
        }
      }
    }
```

This block was created by E02 after Step 4. E03 Task 5 moves it to BEFORE Step 4 so that `documentNames` is available for section reranking (Task 6) and fact reranking (Task 6).

### Current `assembleContext()` call (L1004–1010):

```typescript
    const { context: assembledContext, tokenCount, truncated } = assembleContext({
      sections: retrieved.sections,   // ← will become finalSections after Task 7
      facts: balancedFacts,           // ← will become finalFacts after Task 7
      documentSummary,
      documentNames,
    });
```

### Current response generation block (L1016–1040):

```typescript
    let responseText: string;
    let citations: RAGCitation[];

    if (mode === 'rag_and_lora') {
      const loraResult = await generateLoRAResponse({ ... });
      responseText = loraResult.responseText;
      citations = loraResult.citations;
    } else {
      const claudeResult = await generateResponse({
        queryText: params.queryText,
        assembledContext,
        mode,
        conversationContext,
      });
      responseText = claudeResult.responseText;
      citations = claudeResult.citations;
    }
```

Task 11 inserts citation enrichment AFTER this block using the `citations` variable (not `claudeResult.citations`).

### Current `generateResponse()` system prompt (L588–601):

```typescript
  const systemPrompt = `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
1. Only use information from the provided context
2. Include citations in the format [Section: title] or [Fact: content_preview] for every claim
3. If the context doesn't contain enough information, say so clearly
4. Be comprehensive but concise
5. Never fabricate information not in the context

Return your response in this JSON format:
...`;
```

Task 12 detects multi-doc from `params.assembledContext` and appends instruction 6.

### BM25 merge block in `retrieveContext()` (L141–156):

```typescript
  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
      const normalizedScore = 0.5 + (result.rank * 0.3);
      // ... merge into sectionScores / factScores ...
    }
  }
```

Task 13 inserts logging between L140 (closing `}` of the textResults fetch) and L141 (opening of this `if` block).

---

## Implementation Tasks

### Task 1: Update `deduplicateResults()` to Accept Text Accessor (FR-6.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** L503–518

**Problem:** `T extends { content: string }` means it cannot accept sections (which use `originalText`).

Replace the function:

```typescript
function deduplicateResults<T extends { content: string; similarity: number }>(
  results: T[]
): T[] {
  const deduped: T[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(existing.content, result.content) > 0.9
    );
    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}
```

With:

```typescript
function deduplicateResults<T extends { similarity: number }>(
  results: T[],
  textFn: (item: T) => string = (item) => (item as unknown as { content: string }).content || ''
): T[] {
  const deduped: T[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(textFn(existing), textFn(result)) > 0.9
    );
    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}
```

**Validation Criteria:**
- Function compiles with `T extends { similarity: number }` (no longer requires `content`)
- Callers pass explicit `textFn` for both sections and facts

---

### Task 2: Update `balanceMultiDocCoverage()` with Config Ratio + Soft Fallback (FR-6.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** L550–574

Replace the entire function:

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = 0.6
): T[] {
  if (results.length === 0) return results;

  // Count unique documents
  const uniqueDocs = new Set(results.map(r => r.documentId));
  if (uniqueDocs.size <= 1) return results;  // Single doc — no balancing needed

  const maxPerDoc = Math.ceil(results.length * maxPerDocRatio);
  const docCounts = new Map<string, number>();
  const balanced: T[] = [];

  // First pass: take up to maxPerDoc from each document (in similarity order)
  for (const result of results) {
    const count = docCounts.get(result.documentId) || 0;
    if (count < maxPerDoc) {
      balanced.push(result);
      docCounts.set(result.documentId, count + 1);
    }
  }

  return balanced;
}
```

With:

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = RAG_CONFIG.retrieval.maxSingleDocRatio
): T[] {
  if (results.length === 0) return results;

  const uniqueDocs = new Set(results.map(r => r.documentId));
  if (uniqueDocs.size <= 1) return results;

  const maxPerDoc = Math.ceil(results.length * maxPerDocRatio);
  const docCounts = new Map<string, number>();
  const balanced: T[] = [];

  for (const result of results) {
    const count = docCounts.get(result.documentId) || 0;
    if (count < maxPerDoc) {
      balanced.push(result);
      docCounts.set(result.documentId, count + 1);
    }
  }

  // Soft fallback: if balancing dropped >30% of results, use original (similarity ordered)
  if (balanced.length < results.length * 0.7) {
    console.warn(`[RAG Retrieval] Balance dropped ${results.length - balanced.length}/${results.length} results — falling back to top-N by similarity`);
    return results;
  }

  return balanced;
}
```

**Validation Criteria:**
- Default `maxPerDocRatio` reads from `RAG_CONFIG.retrieval.maxSingleDocRatio` (0.6)
- When balancing drops ≤30% of results, balanced set is returned
- When balancing drops >30%, original (unbalanced) results returned with warning log

---

### Task 3: Add `rerankSections()` Wrapper Function (FR-6.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Insert immediately AFTER the closing `}` of `rerankWithClaude()` at L493, before the `// Cross-Document Deduplication` comment

Insert this new function between `rerankWithClaude()` and `deduplicateResults()`:

```typescript
/**
 * Rerank sections using Claude. Adapts section data to the reranker format.
 * Only called when >3 sections after balancing.
 */
async function rerankSections(
  sections: Array<RAGSection & { similarity: number }>,
  queryText: string,
  documentNames?: Map<string, string>
): Promise<Array<RAGSection & { similarity: number }>> {
  const reranked = await rerankWithClaude({
    queryText,
    candidates: sections.map(s => ({
      id: s.id,
      content: s.originalText.slice(0, 500),
      similarity: s.similarity,
      documentName: documentNames?.get(s.documentId) || undefined,
    })),
    topK: Math.min(sections.length, 10),
  });

  const scoreMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
  return sections
    .map(s => ({ ...s, similarity: scoreMap.get(s.id) ?? s.similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}
```

**Validation Criteria:**
- Function compiles without errors
- `documentName` passed from `documentNames` Map if available (provides `[Doc: ...]` prefix in the reranker prompt)

---

### Task 4: Update `rerankWithClaude()` Candidates Type and Candidatelist Builder (FR-6.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Function signature at L403–407; candidateList builder at L416–418

**Step 1:** Update the function signature to add `documentName?` to the candidates type.

Current signature:
```typescript
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
```

Replace with:
```typescript
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number; documentName?: string }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
```

**Step 2:** Update the candidateList builder at L416–418.

Current:
```typescript
  const candidateList = params.candidates
    .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
    .join('\n');
```

Replace with:
```typescript
  const candidateList = params.candidates
    .map((c, i) => {
      const docPrefix = c.documentName ? `[Doc: ${c.documentName}] ` : '';
      return `[${i}] ${docPrefix}${c.content.slice(0, 500)}`;
    })
    .join('\n');
```

**Validation Criteria:**
- KB-wide reranker candidates show `[Doc: file_name]` prefix in Claude prompt
- Single-document reranker candidates have no prefix (no `documentName` passed)

---

### Task 5: Move `documentNames` Block Before Step 4 (Prerequisite)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Problem:** `documentNames` (created in E02 at L988–1001) is currently placed AFTER Step 4. Tasks 3 and the new Step 4 both need `documentNames` to pass to `rerankSections()` and `rerankWithClaude()`. It must be moved before Step 4.

**Remove** the documentNames block from its current location (between the Step 4 close and Step 5):

```typescript
    // Resolve document names for multi-doc context headers
    const documentNames = new Map<string, string>();
    if (!params.documentId && knowledgeBaseId) {
      const { data: docs } = await supabase
        .from('rag_documents')
        .select('id, file_name')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('status', 'ready');

      if (docs) {
        for (const doc of docs) {
          documentNames.set(doc.id, doc.file_name || doc.id);
        }
      }
    }

    // Step 5: Assemble context
```

Replace with just the Step 5 comment (documentNames block is moved):

```typescript
    // Step 5: Assemble context
```

Then **insert** the documentNames block BEFORE Step 4. Find the no-context early-return block's closing brace followed immediately by the Step 4 comment:

```typescript
      return { success: true, data: mapRowToQuery(queryRow) };
    }

    // Step 4: Rerank + Dedup + Balance (Phase 3)
```

Replace with:

```typescript
      return { success: true, data: mapRowToQuery(queryRow) };
    }

    // Resolve document names — needed for section/fact reranking and context assembly
    const documentNames = new Map<string, string>();
    if (!params.documentId && knowledgeBaseId) {
      const { data: docs } = await supabase
        .from('rag_documents')
        .select('id, file_name')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('status', 'ready');

      if (docs) {
        for (const doc of docs) {
          documentNames.set(doc.id, doc.file_name || doc.id);
        }
      }
    }

    // Step 4: Rerank + Dedup + Balance (Phase 3)
```

**Validation Criteria:**
- `documentNames` is declared before Step 4 and is accessible for reranking calls
- `assembleContext()` call can still read `documentNames` (it's in the same function scope)

---

### Task 6: Replace Entire Step 4 Block — Sections and Facts (FR-6.1, FR-6.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** The Step 4 block at L955–986 (after the documentNames move from Task 5, it will have shifted slightly)

**Find and replace the entire Step 4 block.** The exact old code to match:

```typescript
    // Step 4: Rerank + Dedup + Balance (Phase 3)
    let processedFacts = retrieved.facts;
    if (processedFacts.length > 3) {
      // Rerank with Claude Haiku
      const reranked = await rerankWithClaude({
        queryText: params.queryText,
        candidates: processedFacts.map(f => ({
          id: f.id,
          content: f.content,
          similarity: f.similarity,
        })),
        topK: Math.min(processedFacts.length, 15),
      });

      // Rebuild fact list in reranked order
      const rerankedFactMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
      processedFacts = processedFacts
        .filter(f => rerankedFactMap.has(f.id))
        .sort((a, b) => (rerankedFactMap.get(b.id) || 0) - (rerankedFactMap.get(a.id) || 0));
    }

    // Deduplicate cross-document overlaps
    const dedupedFacts = deduplicateResults(
      processedFacts.map(f => ({ ...f, content: f.content, similarity: f.similarity }))
    );

    // Balance multi-doc coverage (if KB-wide search)
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(
        dedupedFacts.map(f => ({ ...f, documentId: f.documentId }))
      )
      : dedupedFacts;
```

Replace with:

```typescript
    // Step 4: Dedup → Balance → Rerank (sections and facts)

    // Dedup: remove near-identical content (>90% Jaccard overlap)
    const dedupedSections = deduplicateResults(retrieved.sections, (s) => s.originalText);
    const dedupedFacts    = deduplicateResults(retrieved.facts,    (f) => f.content);

    // Balance: cap single-document dominance for KB-wide queries
    const balancedSections = !params.documentId
      ? balanceMultiDocCoverage(dedupedSections)
      : dedupedSections;
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(dedupedFacts)
      : dedupedFacts;

    // Rerank sections (Claude Haiku) — only if >3, passes documentNames for [Doc:] prefix
    const finalSections = balancedSections.length > 3
      ? await rerankSections(balancedSections, params.queryText, documentNames)
      : balancedSections;

    // Rerank facts (Claude Haiku) — only if >3, passes documentName for [Doc:] prefix
    let finalFacts = balancedFacts;
    if (balancedFacts.length > 3) {
      const reranked = await rerankWithClaude({
        queryText: params.queryText,
        candidates: balancedFacts.map(f => ({
          id: f.id,
          content: f.content,
          similarity: f.similarity,
          documentName: documentNames.get(f.documentId) || undefined,
        })),
        topK: Math.min(balancedFacts.length, 15),
      });
      const rerankedFactMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
      finalFacts = balancedFacts
        .filter(f => rerankedFactMap.has(f.id))
        .sort((a, b) => (rerankedFactMap.get(b.id) || 0) - (rerankedFactMap.get(a.id) || 0));
    }
```

**Validation Criteria:**
- KB-wide queries dedup, balance, and rerank BOTH sections and facts
- Single-document queries skip balance (no-op — single-doc `balanceMultiDocCoverage` returns early)
- `finalSections` and `finalFacts` are available for the `assembleContext()` call

---

### Task 7: Update `assembleContext()` Call to Use `finalSections` / `finalFacts` (FR-6.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** The `assembleContext()` call just below Step 4

**Current:**
```typescript
    const { context: assembledContext, tokenCount, truncated } = assembleContext({
      sections: retrieved.sections,
      facts: balancedFacts,
      documentSummary,
      documentNames,
    });
```

**Replace with:**
```typescript
    const { context: assembledContext, tokenCount, truncated } = assembleContext({
      sections: finalSections,
      facts: finalFacts,
      documentSummary,
      documentNames,
    });
```

**Validation Criteria:**
- `assembleContext()` receives the fully processed sections and facts
- `retrieved.sections` and `balancedFacts` are no longer referenced at the assembly step

---

### Task 8: KB Summary Auto-Generation on Document Finalization (FR-8.1)

**File:** `src/inngest/functions/process-rag-document.ts`
**Location:** Inside the `finalize` step at L528–564, immediately AFTER the `rag_documents` update at L542–555

The finalize step currently ends its document update at:
```typescript
        .eq('id', documentId);

      console.log(`[Inngest] ========================================`);
```

Insert the KB summary block between the `.eq('id', documentId)` close and the log line:

Find this exact block:
```typescript
        .eq('id', documentId);

      console.log(`[Inngest] ========================================`);
      console.log(`[Inngest] PIPELINE COMPLETE: ${doc.fileName}`);
```

Replace with:
```typescript
        .eq('id', documentId);

      // Regenerate KB summary after document finalization (non-blocking)
      try {
        const { data: readyDocs } = await supabase
          .from('rag_documents')
          .select('document_summary, file_name')
          .eq('knowledge_base_id', doc.knowledgeBaseId)
          .eq('status', 'ready')
          .order('created_at', { ascending: true });

        if (readyDocs && readyDocs.length > 0) {
          const kbSummary = readyDocs
            .filter(d => d.document_summary)
            .map(d => `[${d.file_name}]: ${(d.document_summary as string).slice(0, 800)}`)
            .join('\n\n');

          if (kbSummary.length > 0) {
            await supabase
              .from('rag_knowledge_bases')
              .update({ summary: kbSummary.slice(0, 10000) })
              .eq('id', doc.knowledgeBaseId);

            console.log(`[Inngest] KB summary updated (${readyDocs.length} docs, ${kbSummary.length} chars)`);
          }
        }
      } catch (err) {
        console.warn('[Inngest] Failed to update KB summary (non-blocking):', err);
      }

      console.log(`[Inngest] ========================================`);
      console.log(`[Inngest] PIPELINE COMPLETE: ${doc.fileName}`);
```

**Note:** `doc.knowledgeBaseId` is confirmed available at L77 of the file: `knowledgeBaseId: doc.knowledgeBaseId`.

**Note:** The `document_summary` column returns `string | null` from Supabase — the cast `(d.document_summary as string)` is used inside the `.filter(d => d.document_summary)` guard, so it is safe.

**Validation Criteria:**
- After processing a document in a KB with existing ready docs, `rag_knowledge_bases.summary` is non-null
- Summary contains `[file_name]: excerpt` entries for all ready documents
- Summary is capped at 10,000 characters
- KB summary regenerated after each document finalizes (regardless of `fastMode`)
- Failure does NOT abort the finalization step (wrapped in try/catch)

---

### Task 9: Add `knowledgeBaseId` to Ingestion Service Functions (FR-8.2)

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

#### Change 1: `storeSectionsFromStructure()` — signature at L668–673

Current signature:
```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult
): Promise<RAGSection[]> {
```

Replace with:
```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult,
  knowledgeBaseId?: string
): Promise<RAGSection[]> {
```

Then inside the `sectionRecords` map at L677 (the `return { ... }` object), add `knowledge_base_id` after `section_metadata`:

Current record (L685–699):
```typescript
    return {
      document_id: documentId,
      user_id: userId,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
    };
```

Replace with:
```typescript
    return {
      document_id: documentId,
      user_id: userId,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
      knowledge_base_id: knowledgeBaseId || null,
    };
```

#### Change 2: `storeExtractedFacts()` — signature at L911–915

Current signature:
```typescript
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[]
): Promise<RAGFact[]> {
```

Replace with:
```typescript
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[],
  knowledgeBaseId?: string
): Promise<RAGFact[]> {
```

Then inside the `records` map at L930–943, add `knowledge_base_id` after `fact_category`:

Current record (L930–943):
```typescript
  const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    fact_type: ALLOWED_RAG_FACT_TYPES.has(fact.factType) ? fact.factType : 'fact',
    content: fact.content,
    source_text: fact.sourceText,
    confidence: fact.confidence,
    metadata: {},
    policy_id: fact.policyId || null,
    rule_id: fact.ruleId || null,
    subsection: fact.subsection || null,
    fact_category: fact.factCategory || null,
  }));
```

Replace with:
```typescript
  const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    fact_type: ALLOWED_RAG_FACT_TYPES.has(fact.factType) ? fact.factType : 'fact',
    content: fact.content,
    source_text: fact.sourceText,
    confidence: fact.confidence,
    metadata: {},
    policy_id: fact.policyId || null,
    rule_id: fact.ruleId || null,
    subsection: fact.subsection || null,
    fact_category: fact.factCategory || null,
    knowledge_base_id: knowledgeBaseId || null,
  }));
```

**Validation Criteria:**
- Newly ingested facts and sections have `knowledge_base_id` set at insert time
- Existing callers that do not pass the new param still work (parameter is optional → defaults `undefined` → inserts `null`)

---

### Task 10: Update All 6 Inngest Call Sites to Pass `doc.knowledgeBaseId` (FR-8.2)

**File:** `src/inngest/functions/process-rag-document.ts`

There are exactly **6 call sites** to update. `doc.knowledgeBaseId` is confirmed at L77.

| Call Site | Line | Step | Current Last Arg | New Last Arg |
|-----------|------|------|-----------------|--------------|
| `storeSectionsFromStructure` | L107–109 | Step 2 store-sections | `structure as StructureAnalysisResult` | Add `, doc.knowledgeBaseId` |
| `storeExtractedFacts` (Pass 2) | L132 | Pass 2 policy extraction loop | `section.id, facts` | Add `, doc.knowledgeBaseId` |
| `storeExtractedFacts` (Pass 3) | L203 | Pass 3 table extraction | `sectionId, facts` | Add `, doc.knowledgeBaseId` |
| `storeExtractedFacts` (Pass 4) | L234 | Pass 4 glossary | `null, facts` | Add `, doc.knowledgeBaseId` |
| `storeExtractedFacts` (Pass 5) | L272 | Pass 5 narrative loop | `section.id, result.facts` | Add `, doc.knowledgeBaseId` |
| `storeExtractedFacts` (Pass 6) | L322 | Pass 6 verification loop | `section.id, result.missingFacts` | Add `, doc.knowledgeBaseId` |

**Call site 1 — `storeSectionsFromStructure` at L107–109:**

Current:
```typescript
      const stored = await storeSectionsFromStructure(
        documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult
      );
```

Replace with:
```typescript
      const stored = await storeSectionsFromStructure(
        documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult, doc.knowledgeBaseId
      );
```

**Call site 2 — Pass 2 policy, `storeExtractedFacts` at L132:**

Current:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, facts);
```

Replace with:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, facts, doc.knowledgeBaseId);
```

**Call site 3 — Pass 3 table, `storeExtractedFacts` at L203:**

Current:
```typescript
            await storeExtractedFacts(documentId, doc.userId, sectionId, facts);
```

Replace with:
```typescript
            await storeExtractedFacts(documentId, doc.userId, sectionId, facts, doc.knowledgeBaseId);
```

**Call site 4 — Pass 4 glossary, `storeExtractedFacts` at L234:**

Current:
```typescript
        await storeExtractedFacts(documentId, doc.userId, null, facts);
```

Replace with:
```typescript
        await storeExtractedFacts(documentId, doc.userId, null, facts, doc.knowledgeBaseId);
```

**Call site 5 — Pass 5 narrative, `storeExtractedFacts` at L272:**

Current:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, result.facts);
```

Replace with:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, result.facts, doc.knowledgeBaseId);
```

**Call site 6 — Pass 6 verification, `storeExtractedFacts` at L322:**

Current:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, result.missingFacts);
```

Replace with:
```typescript
            await storeExtractedFacts(documentId, doc.userId, section.id, result.missingFacts, doc.knowledgeBaseId);
```

**Validation Criteria:**
- All 6 call sites updated
- TypeScript compiles (no signature mismatch — `knowledgeBaseId` is `string | undefined`, `doc.knowledgeBaseId` is `string | undefined`)

---

### Task 11: Citation Enrichment with Document Provenance (FR-8.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Step 1: Add `enrichCitationsWithDocumentInfo()` helper function** anywhere in the file before `queryRAG`. Place it just before the `// Main Query Function` comment:

```typescript
/**
 * Enrich citations with document provenance information.
 * Maps section IDs to their source document ID and name.
 */
function enrichCitationsWithDocumentInfo(
  citations: RAGCitation[],
  sections: Array<RAGSection & { similarity: number }>,
  documentNames: Map<string, string>
): RAGCitation[] {
  if (citations.length === 0) return citations;

  const sectionDocMap = new Map<string, string>();
  for (const section of sections) {
    sectionDocMap.set(section.id, section.documentId);
  }

  return citations.map(citation => {
    const documentId = sectionDocMap.get(citation.sectionId);
    if (documentId) {
      return {
        ...citation,
        documentId,
        documentName: documentNames.get(documentId) || undefined,
      };
    }
    return citation;
  });
}
```

**Step 2: Call the enrichment function in `queryRAG()`** immediately AFTER the response generation if/else block (after `citations = claudeResult.citations` / `citations = loraResult.citations`).

Find the closing of the response generation block:
```typescript
      responseText = claudeResult.responseText;
      citations = claudeResult.citations;
    }

    // Step 6: Self-RAG evaluation
```

Replace with:
```typescript
      responseText = claudeResult.responseText;
      citations = claudeResult.citations;
    }

    // Enrich citations with document provenance (adds documentId + documentName)
    citations = enrichCitationsWithDocumentInfo(citations, finalSections, documentNames);

    // Step 6: Self-RAG evaluation
```

**Note:** `citations` is typed `RAGCitation[]` and `enrichCitationsWithDocumentInfo` returns `RAGCitation[]`, so the reassignment is type-safe. The `citations` variable is already used at the `rag_queries` insert below — no change needed there.

**Validation Criteria:**
- KB-wide citations include `documentId` and `documentName` fields
- Single-document citations also get enrichment (consistent behavior, `documentNames` may be empty Map for single-doc, `sectionDocMap.get()` returns the doc ID from the section)
- JSONB in `rag_queries.citations` includes the new fields automatically

---

### Task 12: Multi-Doc Instruction in Response Generation Prompt (FR-8.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `generateResponse()` at L580–626, system prompt at L588–601

Find the system prompt construction. The current prompt text ends with item 5 before the JSON block:

```typescript
  const systemPrompt = `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
1. Only use information from the provided context
2. Include citations in the format [Section: title] or [Fact: content_preview] for every claim
3. If the context doesn't contain enough information, say so clearly
4. Be comprehensive but concise
5. Never fabricate information not in the context

Return your response in this JSON format:
{
  "responseText": "Your complete answer text with inline [citations]",
  "citations": [
    { "sectionId": "section-uuid", "sectionTitle": "section title", "excerpt": "cited text excerpt", "relevanceScore": 0.9 }
  ]
}`;
```

Replace with:

```typescript
  const isMultiDoc = params.assembledContext.includes('## From:');
  const multiDocInstruction = isMultiDoc
    ? '\n6. When citing information, mention which document it comes from using the document name shown in the "From:" headers.'
    : '';

  const systemPrompt = `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
1. Only use information from the provided context
2. Include citations in the format [Section: title] or [Fact: content_preview] for every claim
3. If the context doesn't contain enough information, say so clearly
4. Be comprehensive but concise
5. Never fabricate information not in the context${multiDocInstruction}

Return your response in this JSON format:
{
  "responseText": "Your complete answer text with inline [citations]",
  "citations": [
    { "sectionId": "section-uuid", "sectionTitle": "section title", "excerpt": "cited text excerpt", "relevanceScore": 0.9 }
  ]
}`;
```

**Note:** `params.assembledContext.includes('## From:')` is reliable because E02 `assembleContext()` emits `## From: [docName]` headers for all multi-doc queries. Single-doc queries never contain this pattern.

**Validation Criteria:**
- Multi-doc responses mention document names when citing
- Single-doc responses have no multi-doc citation instructions (no change in behavior)

---

### Task 13: Hybrid Search Disjoint-Ratio Logging (FR-10.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `retrieveContext()`, between L140 (closing `}` of the `searchTextContent` call) and L141 (the `if (textResults.success && textResults.data) {` merge loop)

The exact boundary to insert between is:

```typescript
  });

  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
```

Replace with:

```typescript
  });

  // Log hybrid search overlap metrics for observability
  if (textResults.success && textResults.data && textResults.data.length > 0) {
    const vectorIds = new Set([...sectionScores.keys(), ...factScores.keys()]);
    const bm25Ids = new Set(textResults.data.map(r => r.sourceId));
    const overlap = [...vectorIds].filter(id => bm25Ids.has(id)).length;
    const vectorOnly = vectorIds.size - overlap;
    const bm25Only = bm25Ids.size - overlap;
    console.log(`[RAG Retrieval] Hybrid search: vector=${vectorIds.size}, bm25=${bm25Ids.size}, overlap=${overlap}, vectorOnly=${vectorOnly}, bm25Only=${bm25Only}`);
  }

  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
```

**Note:** This uses `sectionScores` and `factScores` which are already populated at this point (vector search loop completed above). `bm25Ids` represents the BM25 result set before merging — this is the correct point to compute the disjoint ratio.

**Validation Criteria:**
- Log line appears for every retrieval call that has BM25 results
- Metrics are plausible: `overlap ≤ min(vectorIds.size, bm25Ids.size)`

---

### Task 14: Verify All Changes Compile

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```

Expected: Only the pre-existing error in `lib/file-processing/text-extractor.ts` (pdf-parse type issue). Zero new errors.

**Most likely issues to watch for:**

| Issue | Cause | Fix |
|-------|-------|-----|
| `deduplicateResults` type error | Old call site still passes `T extends { content: string }` | Ensure all call sites use new `textFn` parameter |
| `finalSections` / `finalFacts` undeclared | Task 6 not yet applied | Apply Task 6 before Task 7 |
| `enrichCitationsWithDocumentInfo` missing import | N/A — it's in the same file | No import needed |
| `doc.knowledgeBaseId` possibly undefined | Inngest call sites | `doc.knowledgeBaseId` is `string | undefined` — matches optional param signature |

---

## Summary of Changes

All changes are in three files.

| # | File | Location | Change | FR |
|---|------|----------|--------|----|
| 1 | `rag-retrieval-service.ts` | `deduplicateResults()` L503 | Accept `textFn` accessor; remove `content` constraint | FR-6.1 |
| 2 | `rag-retrieval-service.ts` | `balanceMultiDocCoverage()` L550 | Use `RAG_CONFIG.retrieval.maxSingleDocRatio`; add soft-fallback | FR-6.3 |
| 3 | `rag-retrieval-service.ts` | After `rerankWithClaude()` | Add `rerankSections()` wrapper function | FR-6.2 |
| 4 | `rag-retrieval-service.ts` | `rerankWithClaude()` L403, L416 | Candidates accept `documentName?`; candidateList adds `[Doc:]` prefix | FR-6.4 |
| 5 | `rag-retrieval-service.ts` | `queryRAG()` | Move `documentNames` block from after Step 4 to before Step 4 | FR-6.2 |
| 6 | `rag-retrieval-service.ts` | Step 4 in `queryRAG()` | Replace entire Step 4: dedup→balance→rerank for both sections AND facts | FR-6.1, FR-6.2, FR-6.4 |
| 7 | `rag-retrieval-service.ts` | `assembleContext()` call | Use `finalSections` / `finalFacts` instead of `retrieved.sections` / `balancedFacts` | FR-6.2 |
| 8 | `process-rag-document.ts` | Finalize step L528 | KB summary auto-generated from ready-document summaries (non-blocking) | FR-8.1 |
| 9a | `rag-ingestion-service.ts` | `storeSectionsFromStructure()` L668 | Add `knowledgeBaseId?` param; add `knowledge_base_id` to insert record | FR-8.2 |
| 9b | `rag-ingestion-service.ts` | `storeExtractedFacts()` L911 | Add `knowledgeBaseId?` param; add `knowledge_base_id` to insert record | FR-8.2 |
| 10 | `process-rag-document.ts` | L107, L132, L203, L234, L272, L322 | All 6 call sites pass `doc.knowledgeBaseId` as last argument | FR-8.2 |
| 11 | `rag-retrieval-service.ts` | Before `queryRAG` + inside Step 5b | Add `enrichCitationsWithDocumentInfo()` helper; call after response generation | FR-8.3 |
| 12 | `rag-retrieval-service.ts` | `generateResponse()` L588 | Add multi-doc citation instruction to system prompt when context has `## From:` headers | FR-8.4 |
| 13 | `rag-retrieval-service.ts` | `retrieveContext()` L140–141 | Add hybrid search overlap metrics logging before BM25 merge loop | FR-10.1 |

---

## Success Criteria

- [ ] `deduplicateResults()` works on sections (`(s) => s.originalText`) and facts (`(f) => f.content`)
- [ ] Sections are deduplicated, balanced, and reranked for KB-wide queries (not just facts)
- [ ] Soft-fallback activates when balance drops >30% of results (console warning emitted)
- [ ] Reranker candidateList includes `[Doc: name]` prefix for KB-wide queries
- [ ] `documentNames` available in scope before Step 4 reranking calls
- [ ] `finalSections` and `finalFacts` passed to `assembleContext()` (not `retrieved.sections`)
- [ ] KB summary auto-generated on document finalization, capped at 10,000 chars, non-blocking
- [ ] `storeSectionsFromStructure()` and `storeExtractedFacts()` accept and store `knowledgeBaseId`
- [ ] All 6 Inngest call sites pass `doc.knowledgeBaseId`
- [ ] Citations enriched with `documentId` and `documentName` before storage
- [ ] Multi-doc response prompt includes document citation instruction (item 6)
- [ ] Hybrid search overlap metrics logged for every `retrieveContext()` call with BM25 results
- [ ] TypeScript compiles without new errors

---

## What E04 Will Build On

E04 (UI + Testing + Phase 2) assumes all E03 artifacts are in place:
- Full quality pipeline for both sections and facts (dedup + balance + rerank)
- `finalSections` and `finalFacts` are the source of truth for context assembly
- KB summary auto-generated — HyDE (from E02) will pick it up for KB-wide queries
- Citations include `documentId` and `documentName` for multi-doc provenance display
- `knowledge_base_id` set on new sections/facts for direct KB-scoped embedding queries

E04 will implement: KB Dashboard chat button, RAGChat scope indicator, DocumentList chat-all link, SourceCitation document badge, integration tests, and Phase 2 Query Decomposition.
