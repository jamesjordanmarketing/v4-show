# Multi-Document Retrieval — E03: Quality, Ingestion & Observability

**Version:** 1.0  
**Date:** February 20, 2026  
**Section:** E03 — Quality Pipeline, Ingestion, Citations & Observability  
**Prerequisites:** E01 (Foundation) and E02 (Core Retrieval Engine) must be complete  
**Builds Upon:** E01 + E02 artifacts  
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`

---

## Overview

This prompt implements the quality pipeline extensions (dedup/balance/rerank for sections), ingestion pipeline changes (KB summary generation, KB ID propagation), citation enrichment with document provenance, multi-doc response instructions, and observability logging.

**What This Section Creates / Changes:**
1. Extend deduplication to sections (not just facts) — `rag-retrieval-service.ts`
2. Extend balance and rerank to sections — `rag-retrieval-service.ts`
3. Soft-balance fallback when too many results dropped — `rag-retrieval-service.ts`
4. Reranker document provenance for KB-wide queries — `rag-retrieval-service.ts`
5. KB summary auto-generation on document finalization — `process-rag-document.ts`
6. Set `knowledge_base_id` on sections/facts during ingestion — `rag-ingestion-service.ts` + `process-rag-document.ts`
7. Citation enrichment with document provenance — `rag-retrieval-service.ts`
8. Multi-doc instruction in response generation prompt — `rag-retrieval-service.ts`
9. Hybrid search disjoint-ratio logging — `rag-retrieval-service.ts`

**What This Section Does NOT Create:**
- UI components (E04)
- Integration tests (E04)
- Phase 2 Query Decomposition (E04)

---

========================    


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Confirm E01 and E02 are complete** — verify that: the guard clause has been relaxed, types have multi-doc fields, config has `kbWideSimilarityThreshold`/`maxSingleDocRatio`, `retrieveContext()` uses batch fetch, `assembleContext()` returns `{ context, tokenCount, truncated }`, HyDE uses KB summary, conversation is scope-aware

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

| File | Lines (approx) | Purpose |
|------|-------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` | ~1000+ | Main retrieval service — Tasks 1-4, 7-9 |
| `src/lib/rag/services/rag-ingestion-service.ts` | ~1050 | Ingestion service — Task 6a |
| `src/inngest/functions/process-rag-document.ts` | ~586 | Inngest pipeline — Tasks 5, 6b |
| `src/lib/rag/config.ts` | ~98 | Config (modified in E01) |
| `src/types/rag.ts` | ~641+ | Types (modified in E01) |

---

## E01 + E02 Artifacts (Prerequisites — Must Already Exist)

### From E01:
- `RAGCitation` has `documentId?` and `documentName?` fields
- `RAGKnowledgeBase`/`RAGKnowledgeBaseRow` have `summary` field
- `RAGQuery` has `queryScope`; `RAGQueryRow` has `query_scope`
- `RAG_CONFIG.retrieval.kbWideSimilarityThreshold` = 0.3
- `RAG_CONFIG.retrieval.maxSingleDocRatio` = 0.6
- Guard clause relaxed to accept `knowledgeBaseId`
- `queryScope` tracked in all 3 `rag_queries` insert sites
- `generateAndStoreEmbedding()` sets `knowledge_base_id`
- Mappers handle `summary` and `queryScope`
- Database: `summary` column on `rag_knowledge_bases`, `query_scope` on `rag_queries`, `knowledge_base_id` on facts/sections, indexes created

### From E02:
- `retrieveContext()` uses batch fetch (2 queries instead of ~50)
- Non-ready documents filtered from KB-wide results
- `assembleContext()` returns `{ context, tokenCount, truncated }` with token budgets and accepts `documentNames` parameter
- `truncateAtSentence()` helper exists
- `documentNames` Map created before `assembleContext()` call in `queryRAG()`
- HyDE uses KB summary for KB-wide queries (falls back to description)
- Conversation history scope-aware (document-level or KB-level)
- Conversation context passed to `generateResponse()`

---

## Existing Code Context — Quality Pipeline

**Current state of dedup/balance/rerank in `queryRAG()` (Step 4, around lines 820-845):**

After `retrieveContext()` returns, the code currently does — approximately:

```typescript
// Step 4: Rerank + Dedup + Balance (currently FACTS ONLY)
let processedFacts = retrieved.facts;

// Rerank facts (only if >3 results)
if (processedFacts.length > 3) {
  const reranked = await rerankWithClaude({ ... facts ... });
  // apply reranked scores
}

// Dedup facts
processedFacts = deduplicateResults(processedFacts);

// Balance facts (KB-wide only)
if (!params.documentId) {
  processedFacts = balanceMultiDocCoverage(processedFacts);
}
```

Sections go directly to `assembleContext()` without dedup, balance, or rerank. This is the gap E03 addresses.

**`deduplicateResults()` function (~L371):**
A generic function that uses Jaccard similarity (>0.9 threshold) to remove near-duplicates. Currently typed to expect items with a `content` property — sections use `originalText` instead. Needs either a text accessor parameter or generic update.

**`balanceMultiDocCoverage()` function (~L415):**
Generic function that caps results per document at `maxPerDocRatio` (currently hardcoded 0.6). Needs to use config value and add soft fallback.

**`rerankWithClaude()` function (~L298):**
Takes `{ queryText, candidates: Array<{ id, content, similarity }>, topK }`. Candidates don't include `documentName` — needs to be added for KB-wide provenance.

---

## Implementation Tasks

### Task 1: Extend Deduplication to Sections (FR-6.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Problem:** `deduplicateResults()` is only called on facts. Sections are never deduplicated. Also, the function expects items with `content` property but sections use `originalText`.

**Step 1: Update `deduplicateResults()` signature** to accept a configurable text accessor.

Find the `deduplicateResults` function (~L371). Update it to accept an optional `textFn` parameter:

Current signature (approximate):
```typescript
function deduplicateResults<T extends { content: string; similarity: number }>(
  results: T[]
): T[]
```

New signature:
```typescript
function deduplicateResults<T extends { similarity: number }>(
  results: T[],
  textFn: (item: T) => string = (item) => (item as any).content || ''
): T[]
```

Inside the function body, replace any references to `item.content` (or equivalent) with `textFn(item)`.

**Step 2: Update call sites in `queryRAG()`** — in the Step 4 block (around L820-845).

After `retrieveContext()` returns, add section deduplication alongside facts:

```typescript
    // Deduplicate both sections and facts
    const dedupedSections = deduplicateResults(retrieved.sections, (s) => s.originalText);
    const dedupedFacts = deduplicateResults(retrieved.facts, (f) => f.content);
```

Use `dedupedSections` (instead of `retrieved.sections`) going forward to balance, rerank, and context assembly.

**Validation Criteria:**
- Near-duplicate sections (>90% Jaccard overlap) are removed
- Higher-scored duplicate is kept

---

### Task 2: Extend Balance and Rerank to Sections (FR-6.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Step 4 in `queryRAG()`, after deduplication

**Step 1: Apply balancing to sections (not just facts):**

After deduplication (Task 1), add:
```typescript
    // Apply balanced coverage to sections (KB-wide only)
    const balancedSections = !params.documentId
      ? balanceMultiDocCoverage(dedupedSections)
      : dedupedSections;

    // Apply balanced coverage to facts (existing, update variable name)
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(dedupedFacts)
      : dedupedFacts;
```

**Step 2: Add a `rerankSections()` wrapper function:**

Add this new function somewhere in the file (near `rerankWithClaude`, around L298):

```typescript
/**
 * Rerank sections using Claude. Adapts section data to the reranker format.
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
      content: s.originalText.slice(0, 500),  // Truncate for reranker context
      similarity: s.similarity,
      documentName: documentNames?.get(s.documentId) || undefined,
    })),
    topK: Math.min(sections.length, 10),
  });

  // Apply reranked scores back to sections
  const scoreMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
  return sections
    .map(s => ({ ...s, similarity: scoreMap.get(s.id) ?? s.similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}
```

**Step 3: Call section reranking in Step 4:**

```typescript
    // Rerank sections (only if >3 results, similar to facts)
    const finalSections = balancedSections.length > 3
      ? await rerankSections(balancedSections, params.queryText, documentNames)
      : balancedSections;
```

**Step 4: Update the `assembleContext()` call** to use `finalSections` instead of `retrieved.sections`:

```typescript
    const { context: assembledContext, tokenCount, truncated } = assembleContext({
      sections: finalSections,       // was: retrieved.sections
      facts: finalFacts,             // use whatever the final facts variable is after rerank
      documentSummary,
      documentNames,
    });
```

**Validation Criteria:**
- KB-wide queries balance sections across documents (60% max per doc)
- Sections are reranked by Claude alongside facts
- Single-document queries skip balancing (no-op)

---

### Task 3: Soft-Balance Multi-Doc Coverage with Fallback (FR-6.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `balanceMultiDocCoverage()` function (~L415)

Update the function to:
1. Use configurable `maxPerDocRatio` from `RAG_CONFIG` instead of hardcoded 0.6
2. Add soft fallback when >30% of results are dropped

Find the `balanceMultiDocCoverage` function and replace it:

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = RAG_CONFIG.retrieval.maxSingleDocRatio  // Configurable, default 0.6
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
- When balancing drops ≤30% of results, balanced results are returned
- When balancing drops >30%, original (unbalanced) results returned with warning log
- Uses `RAG_CONFIG.retrieval.maxSingleDocRatio` from config

---

### Task 4: Reranker Document Provenance for KB-Wide Queries (FR-6.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `rerankWithClaude()` function (~L298)

**Step 1: Update the function signature** to accept optional `documentName` in candidates:

Current candidates type (approximate):
```typescript
candidates: Array<{ id: string; content: string; similarity: number }>
```

New:
```typescript
candidates: Array<{ id: string; content: string; similarity: number; documentName?: string }>
```

**Step 2: Update the candidate list builder** inside `rerankWithClaude()` (around L335):

Find where candidates are formatted into a string for the Claude prompt. Currently it looks like:
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

**Step 3: Update the facts reranking call site** in `queryRAG()` Step 4 to pass `documentName`:

The existing fact reranking call passes candidates. Update it to include `documentName` from the `documentNames` map:

```typescript
    candidates: balancedFacts.map(f => ({
      id: f.id,
      content: f.content,
      similarity: f.similarity,
      documentName: documentNames.get(f.documentId) || undefined,  // NEW
    })),
```

**Validation Criteria:**
- KB-wide reranker candidates include `[Doc: ...]` prefix in Claude prompt
- Single-document reranker candidates have no prefix

---

### Task 5: KB Summary Auto-Generation on Document Finalization (FR-8.1)

**File:** `src/inngest/functions/process-rag-document.ts` (~586 lines)  
**Location:** Inside the `finalize` step (Step 12, around line 521-566), AFTER the document status update

**Add KB summary regeneration** after the document status is set to `'ready'` or `'awaiting_questions'`:

Find the finalize step (search for `step.run('finalize'` or the last `step.run` call). Inside it, after the `await supabase.from('rag_documents').update(...)` call, add:

```typescript
    // Regenerate KB summary after document finalization
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
          .map(d => `[${d.file_name}]: ${d.document_summary!.slice(0, 800)}`)
          .join('\n\n');

        await supabase
          .from('rag_knowledge_bases')
          .update({ summary: kbSummary.slice(0, 10000) })  // Cap at ~2500 tokens
          .eq('id', doc.knowledgeBaseId);

        console.log(`[Inngest] KB summary updated (${readyDocs.length} docs, ${kbSummary.length} chars)`);
      }
    } catch (err) {
      console.warn('[Inngest] Failed to update KB summary (non-blocking):', err);
    }
```

**Important:** This is wrapped in try/catch because KB summary generation is non-critical — it should not fail the entire finalization step if something goes wrong.

**Note:** `doc.knowledgeBaseId` is available in the Inngest function context — it's passed through the event data. Verify the exact property name by reading the event data shape at the top of the function.

**Validation Criteria:**
- After processing a second document in a KB, `rag_knowledge_bases.summary` is non-null
- Summary contains excerpts from all ready documents, prefixed with file names
- Summary is capped at 10,000 characters
- Summary is regenerated each time a new document completes

---

### Task 6: Set `knowledge_base_id` on Sections and Facts During Ingestion (FR-8.2)

This task has two parts: updating the service functions and updating all call sites.

#### Task 6a: Update Service Functions

**File:** `src/lib/rag/services/rag-ingestion-service.ts` (~1050 lines)

**Change 1: `storeSectionsFromStructure()` (~L668)**

Add `knowledgeBaseId` as an optional parameter:

Current signature:
```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult
): Promise<RAGSection[]>
```

New signature:
```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult,
  knowledgeBaseId?: string  // NEW parameter
): Promise<RAGSection[]>
```

Then in the section insert record (inside the `.map()` at ~L706), add:
```typescript
  knowledge_base_id: knowledgeBaseId || null,  // NEW field
```

**Change 2: `storeExtractedFacts()` (~L911)**

Add `knowledgeBaseId` as an optional parameter:

Current signature:
```typescript
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[]
): Promise<RAGFact[]>
```

New signature:
```typescript
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[],
  knowledgeBaseId?: string  // NEW parameter
): Promise<RAGFact[]>
```

Then in the fact insert record (inside the `.map()` at ~L944), add:
```typescript
  knowledge_base_id: knowledgeBaseId || null,  // NEW field
```

#### Task 6b: Update All Call Sites in Inngest Pipeline

**File:** `src/inngest/functions/process-rag-document.ts` (~586 lines)

Update ALL call sites to pass `doc.knowledgeBaseId` (verify the exact property name from the event data):

| Call Site | Approx Line | Function | New 5th Arg |
|-----------|------------|----------|-------------|
| Step 2 store-sections | L104 | `storeSectionsFromStructure(...)` | Add `doc.knowledgeBaseId` |
| Pass 2 policy facts | L126 | `storeExtractedFacts(...)` | Add `doc.knowledgeBaseId` |
| Pass 3 table facts | L174 | `storeExtractedFacts(...)` | Add `doc.knowledgeBaseId` |
| Pass 4 glossary | L196 | `storeExtractedFacts(...)` | Add `doc.knowledgeBaseId` |
| Pass 5 narrative facts | L247 | `storeExtractedFacts(...)` | Add `doc.knowledgeBaseId` |
| Pass 6 verification missed facts | L321 | `storeExtractedFacts(...)` | Add `doc.knowledgeBaseId` |

**Example update for storeSectionsFromStructure (L104):**

Current (approximate):
```typescript
const stored = await storeSectionsFromStructure(
  documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult
);
```

New:
```typescript
const stored = await storeSectionsFromStructure(
  documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult, doc.knowledgeBaseId
);
```

**Example update for storeExtractedFacts (L126):**

Current (approximate):
```typescript
const stored = await storeExtractedFacts(documentId, doc.userId, section.id, facts);
```

New:
```typescript
const stored = await storeExtractedFacts(documentId, doc.userId, section.id, facts, doc.knowledgeBaseId);
```

**Apply the same pattern to ALL 6 call sites.** The new parameter is always `doc.knowledgeBaseId` as the last argument.

**Validation Criteria:**
- Newly ingested facts and sections have `knowledge_base_id` set at insert time
- Old callers that don't pass the new param still work (param is optional)

---

### Task 7: Citation Enrichment with Document Provenance (FR-8.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after response generation, BEFORE storing in `rag_queries`

**Step 1: Add enrichment helper function** (anywhere in the file, before the `queryRAG` export):

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

  // Build section ID → document ID map from retrieved sections
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

**Step 2: Call the enrichment function** in `queryRAG()` after `generateResponse()` returns.

Find the point where `claudeResult` (or equivalent variable) is available after response generation (around L851-870). Add:

```typescript
    // Enrich citations with document provenance
    const enrichedCitations = enrichCitationsWithDocumentInfo(
      claudeResult.citations,
      finalSections,    // Use the final processed sections from Step 4
      documentNames
    );
```

**Step 3: Use `enrichedCitations` in the `rag_queries` insert** (the main insert at ~L877-893):

Replace the `citations` field in the insert from `claudeResult.citations` to `enrichedCitations`:

```typescript
    citations: enrichedCitations,  // Was: claudeResult.citations
```

**Note:** Because citations are stored as JSONB on `rag_queries.citations`, the new `documentId` and `documentName` fields are automatically persisted — no DB migration needed.

**Validation Criteria:**
- KB-wide query citations include `documentId` and `documentName` for sections that were retrieved
- Single-document query citations also include document info (consistent)
- JSONB in `rag_queries.citations` includes the new fields

---

### Task 8: Multi-Doc Instruction in Response Generation Prompt (FR-8.4)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `generateResponse()` function (~L463), in the system prompt construction

Detect multi-doc from the assembled context and add citation instruction.

Find where the system prompt is constructed inside `generateResponse()`. Add:

```typescript
    const isMultiDoc = params.assembledContext.includes('## From:');
    const multiDocInstruction = isMultiDoc
      ? '\n6. When citing information, mention which document it comes from using the document name shown in the "From:" headers.'
      : '';
```

Then append `multiDocInstruction` to the system prompt string. The exact location depends on how the system prompt is built — find the prompt template and add it to the instruction list.

**Validation Criteria:**
- Multi-doc responses reference document names when citing
- Single-doc responses have no multi-doc citation instructions (unchanged behavior)

---

### Task 9: Hybrid Search Disjoint-Ratio Logging (FR-10.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `retrieveContext()` (from E02), after BM25 results are collected but BEFORE they're merged into the score maps

Find where the BM25 text search results are processed in `retrieveContext()`. Right BEFORE the loop that merges BM25 results into `sectionScores`/`factScores`, add:

```typescript
  // Log hybrid search overlap metrics
  if (textResults.success && textResults.data && textResults.data.length > 0) {
    const vectorIds = new Set([...sectionScores.keys(), ...factScores.keys()]);
    const bm25Ids = new Set(textResults.data.map(r => r.sourceId));
    const overlap = [...vectorIds].filter(id => bm25Ids.has(id)).length;
    const vectorOnly = vectorIds.size - overlap;
    const bm25Only = bm25Ids.size - overlap;
    console.log(`[RAG Retrieval] Hybrid search: vector=${vectorIds.size}, bm25=${bm25Ids.size}, overlap=${overlap}, vectorOnly=${vectorOnly}, bm25Only=${bm25Only}`);
  }
```

This goes BEFORE the `if (textResults.success && textResults.data) { for (const result of textResults.data) { ... merging loop ... } }` block.

**Validation Criteria:**
- Log line appears for every retrieval call with BM25 results
- Metrics are plausible (overlap ≤ min(vector, bm25))

---

### Task 10: Verify All Changes Compile

Run TypeScript compilation check:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
```

Fix any compilation errors. Common issues:
- Missing `RAGCitation` import in new `enrichCitationsWithDocumentInfo` function
- Variable name mismatches between spec and actual code (especially `finalSections` vs actual variable name)
- Type narrowing issues with the generic `deduplicateResults` update

---

## Summary of Changes

| # | File | Change | FR |
|---|------|--------|-----|
| 1 | `src/lib/rag/services/rag-retrieval-service.ts` | `deduplicateResults()` accepts text accessor; called on sections too | FR-6.1 |
| 2 | `src/lib/rag/services/rag-retrieval-service.ts` | Balance and rerank applied to sections; `rerankSections()` wrapper added | FR-6.2 |
| 3 | `src/lib/rag/services/rag-retrieval-service.ts` | `balanceMultiDocCoverage()` uses config ratio + soft fallback | FR-6.3 |
| 4 | `src/lib/rag/services/rag-retrieval-service.ts` | `rerankWithClaude()` accepts `documentName` in candidates | FR-6.4 |
| 5 | `src/inngest/functions/process-rag-document.ts` | KB summary auto-generated in finalize step | FR-8.1 |
| 6a | `src/lib/rag/services/rag-ingestion-service.ts` | `storeSectionsFromStructure()` + `storeExtractedFacts()` accept `knowledgeBaseId` | FR-8.2 |
| 6b | `src/inngest/functions/process-rag-document.ts` | All 7 call sites pass `doc.knowledgeBaseId` | FR-8.2 |
| 7 | `src/lib/rag/services/rag-retrieval-service.ts` | `enrichCitationsWithDocumentInfo()` helper + used in queryRAG | FR-8.3 |
| 8 | `src/lib/rag/services/rag-retrieval-service.ts` | Multi-doc instruction appended to response prompt | FR-8.4 |
| 9 | `src/lib/rag/services/rag-retrieval-service.ts` | Hybrid search disjoint-ratio logged | FR-10.1 |

## Success Criteria

- [ ] `deduplicateResults()` works on both sections (`originalText`) and facts (`content`)
- [ ] Sections are balanced, deduplicated, and reranked for KB-wide queries
- [ ] Soft fallback activates when balance drops >30% of results (with console warning)
- [ ] Reranker candidates include `[Doc: name]` prefix for KB-wide queries
- [ ] KB summary auto-generated when document finalization completes (non-blocking)
- [ ] `storeSectionsFromStructure()` and `storeExtractedFacts()` accept and store `knowledgeBaseId`
- [ ] All 7 Inngest call sites pass `doc.knowledgeBaseId`
- [ ] Citations enriched with `documentId` and `documentName` before storage
- [ ] Multi-doc response prompt includes document citation instruction
- [ ] Hybrid search overlap metrics logged
- [ ] TypeScript compiles without new errors

## What E04 Will Build On

E04 (UI + Testing + Phase 2) assumes all E03 artifacts are in place:
- Full quality pipeline works for both sections and facts
- KB summary is auto-generated on document finalization
- Citations include document provenance
- Multi-doc queries return properly balanced, deduplicated, reranked results with document context

E04 will implement: KB Dashboard chat button, RAGChat scope indicator, DocumentList chat-all link, SourceCitation document badge, integration tests, and Phase 2 Query Decomposition.

+++++++++++++++++



