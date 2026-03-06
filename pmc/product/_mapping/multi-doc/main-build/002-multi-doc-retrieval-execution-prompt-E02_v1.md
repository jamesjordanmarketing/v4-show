# Multi-Document Retrieval — E02: Core Retrieval Engine

**Version:** 1.0  
**Date:** February 20, 2026  
**Section:** E02 — Core Retrieval Engine  
**Prerequisites:** E01 (Database migrations, Types, Config, Guard clause removal, Embedding fix, Mappers) must be complete  
**Builds Upon:** E01 foundation artifacts  
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`

---

## Overview

This prompt implements the core retrieval pipeline changes for multi-document queries: batch-fetch optimization, token-budgeted context assembly, document name resolution, KB-level HyDE, scope-aware conversation history, and conversation context in response generation.

**What This Section Creates / Changes:**
1. Replace `retrieveContext()` with batch-fetch approach (N+1 → 2 queries) in `rag-retrieval-service.ts`
2. Add non-ready document filtering for KB-wide queries
3. Replace `assembleContext()` with token-budgeted version (return type changes from `string` to object)
4. Add `truncateAtSentence()` helper utility
5. Add document name resolution for multi-doc context headers
6. Update HyDE to use KB summary for KB-wide queries
7. Scope-aware conversation history
8. Pass conversation context to response generation

**What This Section Does NOT Create:**
- Quality pipeline changes — deduplication/balance/rerank for sections (E03)
- Ingestion pipeline changes (E03)
- UI components (E04)

---

========================    


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Confirm E01 is complete** — verify that the guard clause at line 693 of `rag-retrieval-service.ts` has been changed, types have the new fields, and config has the new values

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
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) |
| Background Jobs | Inngest |

### Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` | ~980 | Main retrieval service — ALL changes in E02 |
| `src/lib/rag/services/rag-embedding-service.ts` | ~300 | Embedding + search functions (called by retrieval) |
| `src/lib/rag/config.ts` | ~98 | RAG configuration (modified in E01) |
| `src/types/rag.ts` | ~641 | TypeScript types (modified in E01) |

---

## E01 Artifacts (Prerequisites — Must Already Exist)

The following changes from E01 MUST be in place. Verify before proceeding:

### Types (in `src/types/rag.ts`):
- `RAGCitation` has optional `documentId` and `documentName` fields
- `RAGKnowledgeBase` and `RAGKnowledgeBaseRow` have `summary` field
- `RAGQuery` has `queryScope` field; `RAGQueryRow` has `query_scope`

### Config (in `src/lib/rag/config.ts`):
- `retrieval.kbWideSimilarityThreshold` = `0.3`
- `retrieval.maxSingleDocRatio` = `0.6`

### Service (in `src/lib/rag/services/rag-retrieval-service.ts`):
- Guard clause at ~L693 now accepts `knowledgeBaseId` as alternative to `documentId`
- `queryScope` determination variable exists after guard clause
- All 3 `rag_queries` insert sites include `query_scope: queryScope`

### Embedding Service (in `src/lib/rag/services/rag-embedding-service.ts`):
- `generateAndStoreEmbedding()` looks up and sets `knowledge_base_id`

### Mappers (in `src/lib/rag/services/rag-db-mappers.ts`):
- `mapRowToKnowledgeBase()` maps `summary`
- `mapRowToQuery()` maps `query_scope` → `queryScope`

### Database:
- `rag_knowledge_bases.summary` column exists
- `rag_queries.query_scope` column exists
- `rag_facts.knowledge_base_id` and `rag_sections.knowledge_base_id` columns exist
- Indexes: `idx_rag_embeddings_kb_id`, `idx_rag_embeddings_kb_tier`
- RPCs: `match_rag_embeddings_kb`, `search_rag_text`

---

## Existing Code Context

**Critical understanding of the current `retrieveContext()` function (lines 67-208 of `rag-retrieval-service.ts`):**

The current function iterates over search texts (query + optional HyDE), performs Tier 2 (sections) and Tier 3 (facts) vector search via `searchSimilarEmbeddings`, then runs hybrid BM25 text search via `searchTextContent`. Results are deduplicated via Maps keyed by `sourceId`, keeping the highest similarity score. **However**, it then does individual `.select('*').eq('id', sourceId).single()` queries for EACH match — this is the N+1 problem that causes ~50+ queries per user question.

**Critical understanding of the current `assembleContext()` function (lines 217-290):**

Returns a plain `string`. Concatenates ALL retrieved sections and facts with no token limit. `RAG_CONFIG.retrieval.maxContextTokens = 100000` is defined but never enforced. The multi-doc branch (L222) captures `docId` but never uses it in section headers.

**Critical understanding of `queryRAG()` flow (starts ~L681):**

1. Guard clause (E01 fixed)
2. Fetch `knowledgeBaseId` from document if not provided (~L704)
3. MODE: lora_only branch (~L716)
4. Step 1: Fetch document summary for HyDE (~L756)
5. Step 1.5: Conversation context (~L765)
6. Step 2: Generate HyDE (~L773)
7. Step 3: `retrieveContext()` (~L781)
8. No-context early return (~L790)
9. Step 4: Rerank + Dedup + Balance (~L820) — currently only on facts
10. Step 5: `assembleContext()` (~L846)
11. Step 5b: Generate response (~L851)
12. Step 6: Self-eval (~L870)
13. Step 7: Insert to `rag_queries` (~L877)

**Existing helper functions used:**
- `searchSimilarEmbeddings()` — from `rag-embedding-service.ts`, L127. Takes `queryText, documentId?, knowledgeBaseId?, tier?, runId?, limit?, threshold?`
- `searchTextContent()` — from `rag-embedding-service.ts`, L188. Takes `queryText, knowledgeBaseId?, documentId?, runId?, limit?`
- `mapRowToSection()` — from `rag-db-mappers.ts`. Maps DB row to `RAGSection`
- `mapRowToFact()` — from `rag-db-mappers.ts`. Maps DB row to `RAGFact`
- `createServerSupabaseAdminClient()` — from `src/lib/supabase/` — creates admin Supabase client

---

## Implementation Tasks

### Task 1: Replace `retrieveContext()` with Batch-Fetch (FR-4.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `retrieveContext()` function (lines 67-208)

**Priority:** Tier 2 — HIGH (reduces ~50 queries → 2 queries)

Replace the ENTIRE `retrieveContext()` function with this new implementation. The function signature stays the same, but the implementation changes from individual fetches to a two-phase approach:

**Phase 1:** Collect all source IDs from vector + BM25 search results with their best similarity scores using Maps.  
**Phase 2:** Batch-fetch all sections and facts in exactly 2 queries using `.in('id', [...ids])`.

```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  runId?: string;
  hydeText?: string;
}): Promise<{
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  sectionIds: string[];
  factIds: string[];
}> {
  const supabase = createServerSupabaseAdminClient();
  const documentId = params.documentId || undefined;

  // Phase 1: Collect source ID → best similarity score maps
  const sectionScores = new Map<string, number>();
  const factScores = new Map<string, number>();

  const searchTexts = [params.queryText];
  if (params.hydeText) searchTexts.push(params.hydeText);

  for (const searchText of searchTexts) {
    // Tier 2: Section-level vector search
    const sectionResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      knowledgeBaseId: params.knowledgeBaseId,
      tier: 2,
      runId: params.runId,
      limit: RAG_CONFIG.retrieval.maxSectionsToRetrieve,
      threshold: params.knowledgeBaseId && !params.documentId
        ? RAG_CONFIG.retrieval.kbWideSimilarityThreshold
        : RAG_CONFIG.retrieval.similarityThreshold,
    });

    if (sectionResults.success && sectionResults.data) {
      for (const result of sectionResults.data) {
        const existing = sectionScores.get(result.sourceId) || 0;
        if (result.similarity > existing) {
          sectionScores.set(result.sourceId, result.similarity);
        }
      }
    }

    // Tier 3: Fact-level vector search
    const factResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      knowledgeBaseId: params.knowledgeBaseId,
      tier: 3,
      runId: params.runId,
      limit: RAG_CONFIG.retrieval.maxFactsToRetrieve,
      threshold: params.knowledgeBaseId && !params.documentId
        ? RAG_CONFIG.retrieval.kbWideSimilarityThreshold
        : RAG_CONFIG.retrieval.similarityThreshold,
    });

    if (factResults.success && factResults.data) {
      for (const result of factResults.data) {
        const existing = factScores.get(result.sourceId) || 0;
        if (result.similarity > existing) {
          factScores.set(result.sourceId, result.similarity);
        }
      }
    }
  }

  // Hybrid text search (BM25)
  const textResults = await searchTextContent({
    queryText: params.queryText,
    documentId: params.documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    runId: params.runId,
    limit: 10,
  });

  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
      const normalizedScore = 0.5 + (result.rank * 0.3);
      if (result.sourceType === 'section') {
        const existing = sectionScores.get(result.sourceId) || 0;
        if (normalizedScore > existing) {
          sectionScores.set(result.sourceId, normalizedScore);
        }
      } else if (result.sourceType === 'fact') {
        const existing = factScores.get(result.sourceId) || 0;
        if (normalizedScore > existing) {
          factScores.set(result.sourceId, normalizedScore);
        }
      }
    }
  }

  // Phase 2: BATCH FETCH (2 queries instead of ~50)
  const allSectionIds = Array.from(sectionScores.keys());
  const allFactIds = Array.from(factScores.keys());

  const sections: Array<RAGSection & { similarity: number }> = [];
  if (allSectionIds.length > 0) {
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .in('id', allSectionIds);

    if (sectionRows) {
      for (const row of sectionRows) {
        const section = mapRowToSection(row);
        const similarity = sectionScores.get(row.id) || 0;
        sections.push({ ...section, similarity });
      }
    }
  }

  const facts: Array<RAGFact & { similarity: number }> = [];
  if (allFactIds.length > 0) {
    const { data: factRows } = await supabase
      .from('rag_facts')
      .select('*')
      .in('id', allFactIds);

    if (factRows) {
      for (const row of factRows) {
        const fact = mapRowToFact(row);
        const similarity = factScores.get(row.id) || 0;
        facts.push({ ...fact, similarity });
      }
    }
  }

  // Sort by similarity descending
  sections.sort((a, b) => b.similarity - a.similarity);
  facts.sort((a, b) => b.similarity - a.similarity);

  return { sections, facts, sectionIds: allSectionIds, factIds: allFactIds };
}
```

**IMPORTANT:** Confirm that the existing imports (`searchSimilarEmbeddings`, `searchTextContent`, `mapRowToSection`, `mapRowToFact`, `createServerSupabaseAdminClient`, `RAG_CONFIG`) are already present at the top of the file. If any are missing, add them.

**Validation Criteria:**
- Same retrieval results as before (sections and facts match by content)
- Only 2 DB queries for section/fact fetches (verify via console.log count)
- KB-wide queries use `kbWideSimilarityThreshold` (0.3) instead of `similarityThreshold` (0.4)

---

### Task 2: Filter Non-Ready Documents (FR-4.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside the new `retrieveContext()` from Task 1, after the batch fetch (Phase 2), BEFORE the final sort and return

Add this block after the batch fetch sections and facts, before the sort:

```typescript
  // Filter out results from non-ready documents (KB-wide only)
  if (!params.documentId && params.knowledgeBaseId) {
    const { data: readyDocs } = await supabase
      .from('rag_documents')
      .select('id')
      .eq('knowledge_base_id', params.knowledgeBaseId)
      .eq('status', 'ready');

    const readyDocIds = new Set((readyDocs || []).map(d => d.id));

    const filteredSections = sections.filter(s => readyDocIds.has(s.documentId));
    const filteredFacts = facts.filter(f => readyDocIds.has(f.documentId));

    if (filteredSections.length < sections.length || filteredFacts.length < facts.length) {
      console.warn(`[RAG Retrieval] Filtered out ${sections.length - filteredSections.length} sections and ${facts.length - filteredFacts.length} facts from non-ready documents`);
    }

    // Replace arrays
    sections.length = 0;
    sections.push(...filteredSections);
    facts.length = 0;
    facts.push(...filteredFacts);
  }
```

**Note:** This goes right before the `sections.sort(...)` and `facts.sort(...)` calls, because we want to filter first, then sort.

**Validation Criteria:**
- KB-wide query results contain NO sections/facts from documents with `status !== 'ready'`
- Single-document queries are unaffected (filter only runs when `!params.documentId`)

---

### Task 3: Replace `assembleContext()` with Token-Budgeted Version (FR-3.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `assembleContext()` function (lines 217-290)

**CRITICAL CHANGE:** The return type changes from `string` to `{ context: string; tokenCount: number; truncated: boolean }`. All callers must be updated.

Replace the ENTIRE `assembleContext()` function AND add the `truncateAtSentence()` helper:

```typescript
/**
 * Assemble retrieved context with token budget enforcement.
 * Budget allocation: 5% headers/summary, 70% sections, 25% facts.
 * Multi-doc context includes document name headers for provenance.
 */
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
  documentNames?: Map<string, string>;
}): { context: string; tokenCount: number; truncated: boolean } {
  const { sections, facts, documentSummary, documentNames } = params;
  const maxTokens = RAG_CONFIG.retrieval.maxContextTokens; // 100000

  // Token estimation: chars / 4 (conservative estimate)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  // Budget allocation
  const headerBudget = Math.floor(maxTokens * 0.05);   // 5% for headers/summary
  const sectionBudget = Math.floor(maxTokens * 0.70);   // 70% for sections
  const factBudget = Math.floor(maxTokens * 0.25);      // 25% for facts

  let usedTokens = 0;
  let truncated = false;
  const contextParts: string[] = [];

  // Check if results span multiple documents
  const docIds = new Set(sections.map(s => s.documentId));
  const isMultiDoc = docIds.size > 1;

  // Add document/KB summary (within header budget)
  if (documentSummary) {
    const summaryText = isMultiDoc
      ? `Knowledge Base Overview: ${documentSummary}`
      : `Document Overview: ${documentSummary}`;
    const summaryTokens = estimateTokens(summaryText);
    if (summaryTokens <= headerBudget) {
      contextParts.push(summaryText);
      usedTokens += summaryTokens;
    } else {
      const truncatedSummary = truncateAtSentence(summaryText, headerBudget * 4);
      contextParts.push(truncatedSummary);
      usedTokens += estimateTokens(truncatedSummary);
      truncated = true;
    }
  }

  // Add sections in similarity order until budget used
  let sectionTokensUsed = 0;
  if (isMultiDoc) {
    // Multi-doc: group by document, add document name headers
    const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
    for (const section of sections) {
      const existing = sectionsByDoc.get(section.documentId) || [];
      existing.push(section);
      sectionsByDoc.set(section.documentId, existing);
    }

    for (const [docId, docSections] of Array.from(sectionsByDoc.entries())) {
      const docName = documentNames?.get(docId) || docId;
      const docHeader = `\n## From: ${docName}`;
      const headerTokens = estimateTokens(docHeader);

      if (sectionTokensUsed + headerTokens > sectionBudget) {
        truncated = true;
        break;
      }
      contextParts.push(docHeader);
      sectionTokensUsed += headerTokens;

      for (const section of docSections) {
        const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
        const sectionText = `### ${section.title || 'Untitled'} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
        const sectionTokens = estimateTokens(sectionText);

        if (sectionTokensUsed + sectionTokens > sectionBudget) {
          const remaining = sectionBudget - sectionTokensUsed;
          if (remaining > 200) {
            const truncatedText = truncateAtSentence(sectionText, remaining * 4);
            contextParts.push(truncatedText);
            sectionTokensUsed += estimateTokens(truncatedText);
          }
          truncated = true;
          break;
        }

        contextParts.push(sectionText);
        sectionTokensUsed += sectionTokens;
      }
    }
  } else {
    // Single-doc: original pattern with similarity scores
    contextParts.push('## Relevant Sections');
    for (const section of sections) {
      const header = section.title || `Section ${section.sectionIndex}`;
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      const sectionText = `### ${header} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
      const sectionTokens = estimateTokens(sectionText);

      if (sectionTokensUsed + sectionTokens > sectionBudget) {
        const remaining = sectionBudget - sectionTokensUsed;
        if (remaining > 200) {
          const truncatedText = truncateAtSentence(sectionText, remaining * 4);
          contextParts.push(truncatedText);
          sectionTokensUsed += estimateTokens(truncatedText);
        }
        truncated = true;
        break;
      }

      contextParts.push(sectionText);
      sectionTokensUsed += sectionTokens;
    }
  }
  usedTokens += sectionTokensUsed;

  // Add facts in similarity order until budget used
  let factTokensUsed = 0;
  const factTexts: string[] = [];
  for (const fact of facts.sort((a, b) => b.similarity - a.similarity)) {
    const provenance = [];
    if (fact.policyId) provenance.push(`Policy: ${fact.policyId}`);
    if (fact.subsection) provenance.push(`Section: ${fact.subsection}`);
    if (fact.factCategory) provenance.push(`Category: ${fact.factCategory}`);
    const provenanceStr = provenance.length > 0 ? ` (${provenance.join(', ')})` : '';
    const factText = `- [${fact.factType}] ${fact.content}${provenanceStr} (confidence: ${fact.confidence})`;
    const factTokens = estimateTokens(factText);

    if (factTokensUsed + factTokens > factBudget) {
      truncated = true;
      break;
    }

    factTexts.push(factText);
    factTokensUsed += factTokens;
  }

  if (factTexts.length > 0) {
    contextParts.push(`## Relevant Facts\n${factTexts.join('\n')}`);
  }
  usedTokens += factTokensUsed;

  if (truncated) {
    console.warn(`[RAG Retrieval] Context truncated at ${usedTokens} estimated tokens (budget: ${maxTokens})`);
  }

  return {
    context: contextParts.join('\n\n'),
    tokenCount: usedTokens,
    truncated,
  };
}

/**
 * Truncate text at the last sentence boundary before maxChars.
 */
function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('! ')
  );
  return lastSentenceEnd > maxChars * 0.5
    ? truncated.slice(0, lastSentenceEnd + 1)
    : truncated + '...';
}
```

**CRITICAL: Update the caller in `queryRAG()`**

The `assembleContext()` call in `queryRAG()` (around line 846) currently expects a string return value. Update it to destructure the new return type.

Find the `assembleContext()` call site around line 846. It currently looks something like:
```typescript
const assembledContext = assembleContext({
  sections: ...,
  facts: ...,
  documentSummary,
});
```

Replace with:
```typescript
const { context: assembledContext, tokenCount, truncated } = assembleContext({
  sections: retrieved.sections,
  facts: processedFacts,  // or whatever the variable is named at this point (may be balancedFacts)
  documentSummary,
  documentNames,  // from Task 4 document name resolution
});

if (truncated) {
  console.warn(`[RAG Retrieval] Context truncated to ${tokenCount} tokens for query "${params.queryText.slice(0, 50)}..."`);
}
```

**Note:** The variable names (`retrieved.sections`, `processedFacts`, etc.) may differ from the spec depending on E01's exact implementation. Read the current code to get the exact variable names used at the call site.

**Also:** If `assembledContext` was previously a `string` variable passed directly to `generateResponse()` and self-eval, it still works because we destructure `context` into `assembledContext`.

**Validation Criteria:**
- Context string never exceeds `maxContextTokens × 4` characters
- Multi-doc context shows `## From: [document name]` headers
- When context is truncated, `truncated` is `true` and a warning is logged
- Sections are prioritized over facts (70% vs 25% budget)
- Truncation happens at sentence boundaries

---

### Task 4: Document Name Resolution for Multi-Doc Context (FR-3.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, BEFORE the `assembleContext()` call (around line 830-846)

Add document name lookup for KB-wide queries. This should go right before the assembleContext call:

```typescript
    // Resolve document names for multi-doc context
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

**Note:** `documentNames` is passed to `assembleContext()` (Task 3) and will also be used by E03's citation enrichment.

**Validation Criteria:**
- Multi-doc context headers show human-readable file names, not UUIDs
- Single-doc queries do not fetch document names (unnecessary)

---

### Task 5: KB-Level HyDE Anchor (FR-2.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Lines ~756 in `queryRAG()`, inside the "Step 1: Get document summary for HyDE" block

The current code (around L756) looks like:
```typescript
    const { data: docRow } = await supabase
      .from('rag_documents')
      .select('document_summary')
      .eq('id', params.documentId)
      .single();
    documentSummary = docRow?.document_summary || '';
```

**NOTE:** This may fail when `params.documentId` is undefined (KB-wide queries). Replace the entire HyDE summary fetch with:

```typescript
    // Step 1: Get summary for HyDE (document-level or KB-level)
    let documentSummary = '';
    if (params.documentId) {
      // Document-level: use document summary
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('document_summary')
        .eq('id', params.documentId)
        .single();
      documentSummary = docRow?.document_summary || '';
    } else if (knowledgeBaseId) {
      // KB-level: use KB summary, fallback to KB description
      const { data: kbRow } = await supabase
        .from('rag_knowledge_bases')
        .select('summary, description')
        .eq('id', knowledgeBaseId)
        .single();
      documentSummary = kbRow?.summary || kbRow?.description || '';
    }
```

**Important:** The variable `knowledgeBaseId` should already be available at this point in the flow (it's fetched around L704 — either from `params.knowledgeBaseId` or derived from the document's knowledge base).

**Validation Criteria:**
- KB-wide query with a populated `rag_knowledge_bases.summary` uses that summary for HyDE
- KB-wide query with NULL summary but non-null description uses description as fallback
- KB-wide query with both NULL summary and description still works (HyDE uses raw query)

---

### Task 6: Scope-Aware Conversation History (FR-5.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, at the conversation context block (around line 765)

The current code (around L765) looks like:
```typescript
    const recentQueries = await getQueryHistory({
      knowledgeBaseId: knowledgeBaseId || undefined,
      userId: params.userId,
      limit: 3,
    });
```

Replace with scope-aware version:

```typescript
    // Scope conversation history to match current query scope
    const recentQueries = params.documentId
      ? await getQueryHistory({
          documentId: params.documentId,
          userId: params.userId,
          limit: 3,
        })
      : await getQueryHistory({
          knowledgeBaseId: knowledgeBaseId || undefined,
          userId: params.userId,
          limit: 3,
        });
```

**Rationale:** Document-level queries should see document-level conversation history. KB-level queries should see KB-level history. Mixing scopes degrades HyDE quality.

**Validation Criteria:**
- Document-level queries only see previous queries for that specific document
- KB-level queries see previous KB-level queries for that KB

---

### Task 7: Pass Conversation Context to Response Generation (FR-5.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `generateResponse()` function (~line 463) and its call site in `queryRAG()`

**Step 1: Update `generateResponse()` signature** (~L463):

Current signature:
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
}): Promise<{ responseText: string; citations: RAGCitation[] }>
```

Add `conversationContext` optional parameter:
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
  conversationContext?: string;  // NEW: recent conversation for follow-up context
}): Promise<{ responseText: string; citations: RAGCitation[] }>
```

**Step 2: Inside `generateResponse()`**, append conversation context to the assembled context before sending to Claude:

Find where the function builds the prompt/context for Claude and add:
```typescript
    const contextSection = params.conversationContext
      ? `\n\nRecent conversation for context (use to understand follow-up references):\n${params.conversationContext}`
      : '';

    // Use assembledContext + contextSection when building the prompt
    const fullContext = params.assembledContext + contextSection;
```

Then use `fullContext` wherever `params.assembledContext` was used in the prompt sent to Claude.

**Step 3: Update the call site in `queryRAG()`** (~L851):

Find the `generateResponse()` call in `queryRAG()` and add the conversation context. The conversation context is already being fetched (around L765, Step 1.5) and formatted — find the variable name and pass it:

```typescript
    const claudeResult = await generateResponse({
      queryText: params.queryText,
      assembledContext,
      mode,
      conversationContext,  // NEW: pass the conversation context fetched earlier
    });
```

**Note:** You'll need to trace the exact variable that holds the formatted conversation context string. It's likely built from the `recentQueries` variable around L765-773.

**Validation Criteria:**
- Follow-up questions like "What about the exceptions to that?" reference the previous conversation
- The conversation context appears in the full context string sent to Claude

---

### Task 8: Verify All Changes Compile

Run TypeScript compilation check:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
```

Fix any compilation errors. The most common issue will be:
- Missing imports for new types used
- Variable name mismatches between the spec and actual code
- The `assembleContext()` return type change cascading to callers

---

## Summary of Changes

| # | File | Change | FR |
|---|------|--------|-----|
| 1 | `src/lib/rag/services/rag-retrieval-service.ts` | Replace `retrieveContext()` with batch-fetch (N+1 → 2 queries) | FR-4.1 |
| 2 | `src/lib/rag/services/rag-retrieval-service.ts` | Add non-ready document filtering in `retrieveContext()` | FR-4.2 |
| 3 | `src/lib/rag/services/rag-retrieval-service.ts` | Replace `assembleContext()` with token-budgeted version + `truncateAtSentence()` | FR-3.1 |
| 4 | `src/lib/rag/services/rag-retrieval-service.ts` | Add document name resolution before `assembleContext()` call | FR-3.2 |
| 5 | `src/lib/rag/services/rag-retrieval-service.ts` | KB-level HyDE anchor (summary from KB instead of doc) | FR-2.1 |
| 6 | `src/lib/rag/services/rag-retrieval-service.ts` | Scope-aware conversation history | FR-5.2 |
| 7 | `src/lib/rag/services/rag-retrieval-service.ts` | Pass conversation context to `generateResponse()` | FR-5.3 |

## Success Criteria

- [ ] `retrieveContext()` uses batch fetch (2 DB queries for sections/facts, not ~50)
- [ ] KB-wide queries use `kbWideSimilarityThreshold` (0.3)
- [ ] Non-ready documents filtered from KB-wide results
- [ ] `assembleContext()` returns `{ context, tokenCount, truncated }` — not plain string
- [ ] Token budget enforced (70% sections, 25% facts, 5% headers)
- [ ] Multi-doc context shows `## From: [document name]` headers
- [ ] HyDE uses KB summary for KB-wide queries, falls back to KB description
- [ ] Conversation history scoped to document or KB level
- [ ] Conversation context passed to `generateResponse()`
- [ ] TypeScript compiles without new errors

## What E03 Will Build On

E03 (Quality, Ingestion & Observability) assumes all E02 artifacts are in place:
- `retrieveContext()` returns batch-fetched sections and facts with similarity scores
- `assembleContext()` accepts `documentNames` parameter and returns structured object
- HyDE works at KB level
- Conversation is scope-aware

E03 will implement: deduplication for sections (not just facts), balanced coverage for sections, section reranking, soft-balance fallback, reranker document provenance, KB summary auto-generation, ingestion KB ID propagation, citation enrichment, multi-doc response prompt instruction, and hybrid search logging.

+++++++++++++++++



