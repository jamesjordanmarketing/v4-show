# Multi-Document Retrieval — E02: Core Retrieval Engine

**Version:** 2.0
**Date:** February 20, 2026
**Section:** E02 — Core Retrieval Engine
**Prerequisites:** E01 complete (verified)
**Builds Upon:** E01 foundation artifacts
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`
**Supersedes:** `002-multi-doc-retrieval-execution-prompt-E02_v1.md`

---

## Changes from v1 → v2

This version was updated after E01 was executed. All line numbers, variable names, and code descriptions have been verified against the live codebase. Key corrections:

| Area | v1 Said | v2 Corrects |
|------|---------|-------------|
| Guard clause location | "~L693" | L669–672 (E01 shifted lines) |
| `retrieveContext()` | "L67–208" | L63–209 |
| `assembleContext()` | "L217–290" | L215–284 |
| `generateResponse()` | "~L463" | L471–511 |
| HyDE step | "may fail when documentId undefined" | Already guarded with `if (params.documentId)` — no crash risk, just missing KB branch |
| `conversationContext` var | "trace the variable" | Already built at L765–767, just not passed to `generateResponse()` |
| `getQueryHistory()` | "needs documentId param" | Already accepts `documentId` at L953 — no signature change needed |
| File size | "~980 lines" | ~988 lines |
| `assembleContext()` call | "~L846" | L858–863 |
| Variables at call site | Ambiguous | `retrieved.sections`, `balancedFacts`, `documentSummary` |

---

## Overview

This prompt implements the core retrieval pipeline changes for multi-document queries: batch-fetch optimization, token-budgeted context assembly, document name resolution, KB-level HyDE, scope-aware conversation history, and conversation context in response generation.

**What This Section Creates / Changes:**
1. Replace `retrieveContext()` with batch-fetch approach (N+1 → 2 queries)
2. Add non-ready document filtering for KB-wide queries
3. Replace `assembleContext()` with token-budgeted version (return type changes `string` → object)
4. Add `truncateAtSentence()` helper
5. Add document name resolution for multi-doc context headers
6. Update HyDE to use KB summary for KB-wide queries
7. Scope-aware conversation history
8. Pass conversation context to response generation

**What This Section Does NOT Create:**
- Quality pipeline changes — deduplication/balance/rerank for sections (E03)
- Ingestion pipeline changes (E03)
- UI components (E04)

---

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — all line numbers and code samples are verified against the live codebase
2. **Read `src/lib/rag/services/rag-retrieval-service.ts`** to confirm the exact current state at the locations referenced
3. **Confirm E01 artifacts** are present (checklist in next section)
4. **Execute as written** — do not re-investigate what has already been verified

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
| `src/lib/rag/services/rag-retrieval-service.ts` | ~988 | Main retrieval service — ALL changes in E02 |
| `src/lib/rag/services/rag-embedding-service.ts` | ~300 | Embedding + search (called by retrieval) |
| `src/lib/rag/config.ts` | ~100 | RAG configuration (modified in E01) |
| `src/types/rag.ts` | ~645 | TypeScript types (modified in E01) |

---

## E01 Prerequisites Checklist

Verify each before proceeding:

### Types (`src/types/rag.ts`):
- [ ] `RAGCitation` has optional `documentId?: string` and `documentName?: string`
- [ ] `RAGKnowledgeBase` has `summary: string | null`
- [ ] `RAGKnowledgeBaseRow` has `summary: string | null`
- [ ] `RAGQuery` has `queryScope: 'document' | 'knowledge_base'`
- [ ] `RAGQueryRow` has `query_scope: string | null`

### Config (`src/lib/rag/config.ts`):
- [ ] `retrieval.kbWideSimilarityThreshold = 0.3`
- [ ] `retrieval.maxSingleDocRatio = 0.6`

### Service (`src/lib/rag/services/rag-retrieval-service.ts`):
- [ ] Guard clause at L669–672 checks `!params.documentId && !params.knowledgeBaseId`
- [ ] `queryScope` const at L675
- [ ] All 3 `rag_queries` insert sites include `query_scope: queryScope`

### Embedding Service (`src/lib/rag/services/rag-embedding-service.ts`):
- [ ] `generateAndStoreEmbedding()` looks up and sets `knowledge_base_id`

### Mappers (`src/lib/rag/services/rag-db-mappers.ts`):
- [ ] `mapRowToKnowledgeBase()` maps `summary`
- [ ] `mapRowToQuery()` maps `query_scope` → `queryScope`

### Database:
- [ ] `rag_knowledge_bases.summary` column
- [ ] `rag_queries.query_scope` column with DEFAULT `'document'` and CHECK constraint
- [ ] `rag_facts.knowledge_base_id` and `rag_sections.knowledge_base_id` columns
- [ ] Indexes: `idx_rag_embeddings_kb_id`, `idx_rag_embeddings_kb_tier`
- [ ] RPCs: `match_rag_embeddings_kb`, `search_rag_text`

---

## Existing Code Context (Verified Against Live Codebase)

### Imports at top of `rag-retrieval-service.ts` (L1–16):

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { searchSimilarEmbeddings, searchTextContent } from './rag-embedding-service';
import { mapRowToSection, mapRowToFact, mapRowToDocument, mapRowToQuery } from './rag-db-mappers';
import type { RAGQuery, RAGSection, RAGFact, RAGCitation, RAGQueryMode, HyDEResult, SelfEvalResult } from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';
import { callInferenceEndpoint } from '@/lib/services/inference-service';
```

All required imports are already present. No new imports needed for E02.

### Current `retrieveContext()` (L63–209) — N+1 Problem Confirmed:

The function uses `sectionMap` and `factMap` with individual `.single()` fetches inside loops. For every vector search result, there is one `supabase.from('rag_sections').select('*').eq('id', result.sourceId).single()` call and one equivalent for facts. With 10 sections + 20 facts + BM25 results, this generates ~50 individual DB queries per user question.

Additionally, the current function uses `RAG_CONFIG.retrieval.similarityThreshold` for ALL searches — it never uses `kbWideSimilarityThreshold`. E02 fixes this.

### Current `assembleContext()` (L215–284) — Issues Confirmed:

- Returns plain `string` (no token budget enforcement)
- `RAG_CONFIG.retrieval.maxContextTokens = 100000` is defined but never used
- Multi-doc branch (L226–257): groups by `docId` but headers say `### Section: title` — document names are NOT shown
- Facts hardcoded `slice(0, 20)` in multi-doc branch, no limit in single-doc branch
- No `truncateAtSentence()` helper exists

### Current `generateResponse()` (L471–511):

Signature: `params: { queryText: string; assembledContext: string; mode: RAGQueryMode }` — no `conversationContext`.

The `conversationContext` string IS already assembled at L765–767 and currently used ONLY for HyDE (L772–773). It is NOT passed to `generateResponse()`.

### Current `queryRAG()` — Verified Flow:

| Step | Lines | Description |
|------|-------|-------------|
| Guard + scope | L669–675 | E01-updated: checks both documentId and knowledgeBaseId |
| Fetch KB ID | L683–689 | Derives knowledgeBaseId from document if not provided |
| LoRA-only branch | L699–740 | Returns early for lora_only mode |
| Step 1: HyDE summary | L747–756 | Fetches `document_summary` if `params.documentId` set — KB branch MISSING |
| Step 1.5: Conversation | L758–767 | Fetches history (KB-scoped only) + builds `conversationContext` string |
| Step 2: HyDE | L769–779 | Skipped for KB-wide queries (no `documentSummary`) |
| Step 3: Retrieve | L781–788 | Calls `retrieveContext()` |
| No-context return | L790–822 | Early return with empty result |
| Step 4: Rerank+Dedup+Balance | L825–856 | Applied to `facts` only, not sections |
| Step 5: Assemble | L858–863 | `assembleContext({ sections: retrieved.sections, facts: balancedFacts, documentSummary })` |
| Step 5b: Generate | L865–888 | Branches on mode; `generateResponse()` does NOT receive `conversationContext` |
| Step 6: Self-eval | L890–895 | Uses `assembledContext` string |
| Step 7: Store | L897–920 | Inserts to `rag_queries` with `assembled_context: assembledContext` |

### `getQueryHistory()` (L953–987):

Already accepts `documentId?: string` and `knowledgeBaseId?: string` parameters. No signature change needed for Task 6.

---

## Implementation Tasks

### Task 1: Replace `retrieveContext()` with Batch-Fetch (FR-4.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Replace entire function from L63 to L209 (inclusive)

**Priority:** Tier 2 — HIGH (reduces ~50 queries → 2 queries per user question)

The new implementation uses a two-phase approach:
- **Phase 1:** Collect all source IDs with their best similarity scores into plain `Map<string, number>` objects
- **Phase 2:** Batch-fetch all sections and facts with exactly 2 `.in('id', [...ids])` queries

Replace the ENTIRE `retrieveContext()` function with:

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

  // Use lower threshold for KB-wide queries to improve recall across a larger corpus
  const threshold = params.knowledgeBaseId && !params.documentId
    ? RAG_CONFIG.retrieval.kbWideSimilarityThreshold
    : RAG_CONFIG.retrieval.similarityThreshold;

  for (const searchText of searchTexts) {
    // Tier 2: Section-level vector search
    const sectionResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      knowledgeBaseId: params.knowledgeBaseId,
      tier: 2,
      runId: params.runId,
      limit: RAG_CONFIG.retrieval.maxSectionsToRetrieve,
      threshold,
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
      threshold,
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

  // Phase 2: BATCH FETCH — 2 queries instead of ~50
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
        sections.push({ ...mapRowToSection(row), similarity: sectionScores.get(row.id) || 0 });
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
        facts.push({ ...mapRowToFact(row), similarity: factScores.get(row.id) || 0 });
      }
    }
  }

  // Task 2 insert point: non-ready document filter goes here (before sort)

  // Sort by similarity descending
  sections.sort((a, b) => b.similarity - a.similarity);
  facts.sort((a, b) => b.similarity - a.similarity);

  return { sections, facts, sectionIds: allSectionIds, factIds: allFactIds };
}
```

**Validation Criteria:**
- Retrieval results are equivalent to before
- Exactly 2 DB queries for section/fact fetches (not ~50)
- KB-wide queries use `kbWideSimilarityThreshold` (0.3)

---

### Task 2: Filter Non-Ready Documents (FR-4.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside the new `retrieveContext()` from Task 1, replacing the `// Task 2 insert point` comment

Add the following block in place of the `// Task 2 insert point: non-ready document filter goes here (before sort)` comment:

```typescript
  // Filter out results from non-ready documents (KB-wide queries only)
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

    // Replace array contents in-place (arrays are const, but mutable)
    sections.length = 0;
    sections.push(...filteredSections);
    facts.length = 0;
    facts.push(...filteredFacts);
  }
```

**Validation Criteria:**
- KB-wide query results contain NO sections/facts from documents where `status !== 'ready'`
- Single-document queries are unaffected (guard `!params.documentId`)

---

### Task 3: Replace `assembleContext()` with Token-Budgeted Version (FR-3.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Replace entire function L215–284

**CRITICAL CHANGE:** Return type changes from `string` to `{ context: string; tokenCount: number; truncated: boolean }`. The caller at L858 must also be updated (see below).

Replace the ENTIRE `assembleContext()` function AND add the `truncateAtSentence()` helper immediately after it:

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
  const headerBudget  = Math.floor(maxTokens * 0.05);  // 5%  for headers/summary
  const sectionBudget = Math.floor(maxTokens * 0.70);  // 70% for sections
  const factBudget    = Math.floor(maxTokens * 0.25);  // 25% for facts

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
    // Multi-doc: group by document, add human-readable document name headers
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
    const provenance: string[] = [];
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

**Update the caller in `queryRAG()` at L858–863:**

Current code:
```typescript
    // Step 5: Assemble context
    const assembledContext = assembleContext({
      sections: retrieved.sections,
      facts: balancedFacts,
      documentSummary,
    });
```

Replace with (Task 4's `documentNames` variable is declared just before this — see Task 4):
```typescript
    // Step 5: Assemble context
    const { context: assembledContext, tokenCount, truncated } = assembleContext({
      sections: retrieved.sections,
      facts: balancedFacts,
      documentSummary,
      documentNames,
    });

    if (truncated) {
      console.warn(`[RAG Retrieval] Context truncated to ${tokenCount} tokens for query "${params.queryText.slice(0, 50)}..."`);
    }
```

**Note:** `assembledContext` is used at L873, L883, L894, and L911 (`assembled_context: assembledContext` in DB insert). All of these continue to work correctly since we destructure `context` into `assembledContext` — no other changes needed at those sites.

**Validation Criteria:**
- Context string never exceeds `maxContextTokens × 4` characters
- Multi-doc context shows `## From: [document name]` headers (not `### Section: ...` without provenance)
- When truncated, `true` is returned and a warning logged
- 70% budget for sections, 25% for facts
- Truncation at sentence boundaries

---

### Task 4: Document Name Resolution for Multi-Doc Context (FR-3.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `queryRAG()`, immediately BEFORE the `// Step 5: Assemble context` comment at L858

Insert this block between the `balancedFacts` assignment (end of Step 4, ~L856) and the `assembleContext()` call (L858):

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

**Note:** `documentNames` is an empty `Map` for single-doc queries — `assembleContext()` handles this correctly (the `documentNames?.get(docId)` call is only reached in the `isMultiDoc` branch).

**Validation Criteria:**
- Multi-doc context shows human-readable file names, not raw UUIDs in `## From:` headers
- Single-doc queries do not fetch document names (guard `!params.documentId`)

---

### Task 5: KB-Level HyDE Anchor (FR-2.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** L747–756 — the "Step 1: Get document summary for HyDE" block

**Current code at L747–756:**
```typescript
    // Step 1: Get document summary for HyDE
    let documentSummary = '';
    if (params.documentId) {
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('document_summary')
        .eq('id', params.documentId)
        .single();
      documentSummary = docRow?.document_summary || '';
    }
```

The current code correctly guards with `if (params.documentId)` so KB-wide queries won't crash — they simply skip the fetch and `documentSummary` stays `''`. The missing piece is the KB branch: without it, KB-wide queries skip HyDE entirely (because `documentSummary` is empty and the HyDE guard at L771 is `if (documentSummary)`), losing ~15–25% recall.

**Replace with:**
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
      // KB-level: use KB summary (set via E03 auto-generation), fallback to description
      const { data: kbRow } = await supabase
        .from('rag_knowledge_bases')
        .select('summary, description')
        .eq('id', knowledgeBaseId)
        .single();
      documentSummary = kbRow?.summary || kbRow?.description || '';
    }
```

**Note:** `knowledgeBaseId` is already available at this point in the flow — it was set at L683–689 (either from `params.knowledgeBaseId` or derived from the document).

**Note:** `rag_knowledge_bases.summary` will be `null` for all KBs until E03 implements auto-generation. The fallback to `description` ensures HyDE still works with whatever the user typed as KB description.

**Validation Criteria:**
- KB-wide query with populated `rag_knowledge_bases.summary` uses it for HyDE
- KB-wide query with `null` summary but non-null `description` uses description
- KB-wide query with both null falls back gracefully (HyDE skipped, raw query used)
- Document-level queries unchanged

---

### Task 6: Scope-Aware Conversation History (FR-5.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** L758–763 — the "Step 1.5: Conversation context" block

**Current code at L758–763:**
```typescript
    // Step 1.5: Conversation context (last 3 Q&A pairs)
    const recentQueries = await getQueryHistory({
      knowledgeBaseId: knowledgeBaseId || undefined,
      userId: params.userId,
      limit: 3,
    });
```

The current code always fetches KB-level history regardless of query scope. For document-level queries, this returns all queries against the KB (including queries about other documents), which degrades HyDE context quality.

`getQueryHistory()` already accepts `documentId` at L953 — no signature change needed.

**Replace with:**
```typescript
    // Step 1.5: Conversation context — scoped to match current query type
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

**Validation Criteria:**
- Document-level queries see only previous queries for that specific document
- KB-level queries see previous KB-level queries (all docs in KB)

---

### Task 7: Pass Conversation Context to Response Generation (FR-5.3)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

The `conversationContext` string is already built at L765–767:
```typescript
    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';
```

It is currently passed to HyDE only (L772–773). It is NOT passed to `generateResponse()`.

**Step 1: Update `generateResponse()` signature at L471:**

Current:
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
}): Promise<{ responseText: string; citations: RAGCitation[] }> {
```

Replace with:
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
  conversationContext?: string;  // recent Q&A pairs for follow-up awareness
}): Promise<{ responseText: string; citations: RAGCitation[] }> {
```

**Step 2: Inside `generateResponse()`, build `fullContext` before the `provider.generateResponse()` call at L494:**

Current code at L493–498:
```typescript
  try {
    const result = await provider.generateResponse({
      queryText: params.queryText,
      assembledContext: params.assembledContext,
      systemPrompt,
    });
```

Replace with:
```typescript
  try {
    const contextSection = params.conversationContext
      ? `\n\nRecent conversation for context (use to understand follow-up references):\n${params.conversationContext}`
      : '';
    const fullContext = params.assembledContext + contextSection;

    const result = await provider.generateResponse({
      queryText: params.queryText,
      assembledContext: fullContext,
      systemPrompt,
    });
```

**Step 3: Update the `generateResponse()` call site in `queryRAG()` at L881–885:**

Current:
```typescript
      const claudeResult = await generateResponse({
        queryText: params.queryText,
        assembledContext,
        mode,
      });
```

Replace with:
```typescript
      const claudeResult = await generateResponse({
        queryText: params.queryText,
        assembledContext,
        mode,
        conversationContext,
      });
```

**Validation Criteria:**
- Follow-up questions that reference prior answers are handled correctly
- The `conversationContext` section appears appended to `assembledContext` before Claude sees it
- When `conversationContext` is empty string (no history), `fullContext === assembledContext` (no change)

---

### Task 8: Verify All Changes Compile

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```

Expected: Only the pre-existing error in `lib/file-processing/text-extractor.ts` (pdf-parse type issue, not related to E02). Zero new errors.

**Most likely issues to watch for:**
- Return type of `assembleContext()` changed from `string` to object — if any other call sites exist beyond L858 they will break (verify with grep)
- The `truncated` and `tokenCount` variables declared from the destructure — TypeScript may warn if unused (they're used in the `if (truncated)` warn block)
- `documentNames` typed as `Map<string, string>` — `assembleContext()` expects `Map<string, string> | undefined`, which matches

---

## Summary of Changes

All changes are in `src/lib/rag/services/rag-retrieval-service.ts` only.

| # | Location | Change | FR |
|---|----------|--------|----|
| 1 | `retrieveContext()` L63–209 | Replace entire function: batch-fetch (N+1 → 2 queries), use `kbWideSimilarityThreshold` for KB queries | FR-4.1 |
| 2 | Inside new `retrieveContext()` | Add non-ready document filter for KB-wide queries | FR-4.2 |
| 3 | `assembleContext()` L215–284 | Replace entire function: token budget, `## From:` headers, `truncateAtSentence()` helper; return type `string` → `{ context, tokenCount, truncated }` | FR-3.1 |
| 4 | Caller at L858–863 | Destructure new return type; add `documentNames` param | FR-3.2 |
| 5 | Before L858 | Add document name resolution for multi-doc queries | FR-3.2 |
| 6 | L747–756 | Add KB summary branch to HyDE fetch (else-if knowledgeBaseId) | FR-2.1 |
| 7 | L758–763 | Scope conversation history to document or KB level | FR-5.2 |
| 8 | `generateResponse()` L471 + L494; call site L881 | Add `conversationContext` param, build `fullContext`, pass at call site | FR-5.3 |

---

## Success Criteria

- [ ] `retrieveContext()` uses batch fetch — 2 DB queries for sections/facts (not ~50)
- [ ] KB-wide queries use `kbWideSimilarityThreshold` (0.3), not `similarityThreshold` (0.4)
- [ ] Non-ready documents filtered from KB-wide results
- [ ] `assembleContext()` returns `{ context, tokenCount, truncated }` — not plain string
- [ ] Token budget enforced: 70% sections, 25% facts, 5% headers
- [ ] Multi-doc context shows `## From: [file_name]` headers, not raw UUIDs or missing provenance
- [ ] HyDE uses KB summary for KB-wide queries (falls back to KB description, then skips)
- [ ] Conversation history scoped to document level for doc queries, KB level for KB queries
- [ ] `conversationContext` passed to `generateResponse()` and appended to context
- [ ] TypeScript compiles without new errors

---

## What E03 Will Build On

E03 (Quality, Ingestion & Observability) assumes all E02 artifacts are in place:
- `retrieveContext()` returns batch-fetched sections and facts with similarity scores
- `assembleContext()` accepts `documentNames` and returns structured `{ context, tokenCount, truncated }`
- HyDE works at KB level
- Conversation history is scope-aware
- `documentNames` Map is available in `queryRAG()` scope for E03's citation enrichment

E03 will implement: section deduplication/balance/rerank (currently only applied to facts), KB summary auto-generation on document ingestion, ingestion pipeline KB ID propagation for facts/sections, citation enrichment with `documentId`/`documentName`, multi-doc response prompt instruction, and hybrid search observability logging.
