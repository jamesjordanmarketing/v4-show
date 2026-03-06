# Multi-Document Retrieval — Implementation Specification

**Version:** 1.0
**Date:** 2025-07-17
**Source:** `001-multi-doc-build-input-prompt_v2.md`, `001-fault-tolerance-layer5-analysis_v1.md`
**Output for:** Coding agent (Claude Code)
**SAOL Required:** All database operations MUST use the Supabase Agent Ops Library

---

## 1. INTEGRATION SUMMARY

This specification describes how to enable **multi-document retrieval** within the existing BrightRun RAG Frontier module. The system already supports multi-pass document ingestion and single-document queries. This spec unlocks KB-wide (knowledge base-wide) queries that search across all `status = 'ready'` documents in a knowledge base.

**Approach:** EXTENSION of existing retrieval pipeline

**What We're Adding:**
- 6 database schema changes (columns, indexes, backfills)
- ~15 code changes across 6 existing files
- 3 UI enhancements to existing components
- 2 new config values

**What We're NOT Creating:**
- No new npm dependencies
- No new API routes
- No new database tables
- No new Inngest functions
- No GraphRAG, ColPali, agentic RAG, or cross-KB search
- No new deployment targets

**Key Principle:** The existing retrieval pipeline already supports multi-document search in its RPCs (`match_rag_embeddings_kb`, `search_rag_text`), deduplication, reranking, and multi-doc context assembly. There is exactly **one guard clause** (line 667 of `rag-retrieval-service.ts`) blocking KB-wide queries, plus several quality/performance gaps documented below.

---

## 2. DATABASE MIGRATIONS

All migrations use SAOL `agentExecuteDDL`. Execute each in order. **Always dry-run first.**

**SAOL Execution Pattern:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Step 1: Dry-run
  const dry = await saol.agentExecuteDDL({
    sql: \`<SQL_HERE>\`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Dry run:', dry.success ? 'PASS' : 'FAIL', dry.summary);

  // Step 2: Execute (only if dry-run passes)
  if (dry.success) {
    const result = await saol.agentExecuteDDL({
      sql: \`<SQL_HERE>\`,
      dryRun: false,
      transaction: true,
      transport: 'pg'
    });
    console.log('Execute:', result.success ? 'PASS' : 'FAIL', result.summary);
  }
})();
"
```

### Migration 1: KB Summary Field

**Purpose:** HyDE anchor for KB-wide queries. Without this, HyDE is skipped for KB-wide queries (the hardest retrieval task), causing ~15-25% recall loss.

```sql
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;
```

**Verification:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_knowledge_bases',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name);console.log('Has summary:',cols.includes('summary'));})();"
```

### Migration 2: Btree Index on `rag_embeddings.knowledge_base_id`

**Purpose:** KB-wide vector search currently does a full table scan on `knowledge_base_id`. This index is critical for performance.

```sql
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id
ON rag_embeddings (knowledge_base_id);
```

### Migration 3: Composite Index for Tier-Filtered KB Search

**Purpose:** KB-wide queries filter by both `knowledge_base_id` and `tier`. Composite index avoids double lookup.

```sql
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier
ON rag_embeddings (knowledge_base_id, tier);
```

### Migration 4: Query Scope Tracking

**Purpose:** Track whether a query was document-level or KB-level. Enables scope-aware conversation history filtering.

```sql
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT
  DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));
```

### Migration 5: Denormalize `knowledge_base_id` onto Facts and Sections

**Purpose:** BM25 search (`search_rag_text`) currently uses a subquery join to filter by KB. Denormalizing avoids this join.

```sql
-- Add columns
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;
ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

-- Backfill existing data
UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL;

UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL;
```

### Migration 6: Backfill NULL `knowledge_base_id` on Embeddings

**Purpose:** The `generateAndStoreEmbedding()` single-record function does NOT set `knowledge_base_id` at insert time. Any embeddings created via this function after the original migration have `knowledge_base_id = NULL` and are invisible to KB-wide search. Note: the batch function (`generateAndStoreBatchEmbeddings`) correctly sets it because the Inngest pipeline passes `knowledgeBaseId` explicitly.

```sql
UPDATE rag_embeddings e
SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d
WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;
```

**Verification:**
```sql
SELECT COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL;
-- Expected: 0 after backfill
```

---

## 3. FEATURE REQUIREMENTS

---

### FR-1.1: Remove Guard Clause — Accept `knowledgeBaseId` as Alternative to `documentId`

**Type:** Service Logic
**Priority:** Tier 1 — CRITICAL (blocks all KB-wide functionality)
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Lines 667-670 in `queryRAG()` function

**Current Code:**
```typescript
// Fail fast: documentId is required for all RAG modes to prevent cross-document contamination
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
}
```

**New Code:**
```typescript
// Validate: at least one scope identifier is required for RAG modes
if (!params.documentId && !params.knowledgeBaseId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId or knowledgeBaseId is required — cannot query without scope');
}
```

**Implementation Strategy:**
Replace the guard clause. The rest of the pipeline already supports KB-wide search:
- `match_rag_embeddings_kb` accepts `filter_knowledge_base_id`
- `search_rag_text` accepts `filter_knowledge_base_id`
- `balanceMultiDocCoverage()` caps single-doc at 60%
- `deduplicateResults()` handles cross-doc overlaps
- `assembleContext()` already groups by document when multi-doc

**Dependencies:** None — this is the root blocker

**Validation Criteria:**
- Calling `queryRAG({ queryText: 'test', knowledgeBaseId: '<valid-kb-id>', userId: '<user>' })` without `documentId` does NOT throw
- Response includes results from multiple documents in the KB
- Calling without both `documentId` and `knowledgeBaseId` still throws

---

### FR-1.2: Determine Query Scope and Set `query_scope`

**Type:** Service Logic
**Priority:** Tier 4 — Low
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `queryRAG()`, after the guard clause replacement (FR-1.1), before the `rag_queries` insert

**Implementation:**
Add scope determination logic and include `query_scope` in the insert:

```typescript
// Determine query scope
const queryScope = params.documentId ? 'document' : 'knowledge_base';
```

Then in BOTH insert calls (the no-results insert around line 797 and the main insert around line 875):

```typescript
.insert({
  // ...existing fields...
  query_scope: queryScope,
})
```

**Dependencies:** FR-1.1, Migration 4

**Validation Criteria:**
- KB-wide queries store `query_scope = 'knowledge_base'` in `rag_queries`
- Document-level queries store `query_scope = 'document'`

---

### FR-2.1: KB-Level HyDE Anchor

**Type:** Service Logic
**Priority:** Tier 2 — HIGH (HyDE improves recall by 15-25%)
**Estimated Size:** Medium (20-50 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Lines 742-770 in `queryRAG()`, inside the "Step 1: Get document summary for HyDE" block

**Current Code:**
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

**New Code:**
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

**Implementation Strategy:**
When `documentId` is absent, fetch the KB-level summary. Fall back to the KB `description` if no summary has been generated yet (e.g., first document still processing).

**Dependencies:** Migration 1 (summary column on `rag_knowledge_bases`)

**Validation Criteria:**
- KB-wide query with a populated `rag_knowledge_bases.summary` uses that summary for HyDE
- KB-wide query with NULL summary but non-null description uses description as fallback
- KB-wide query with both NULL summary and description still works (HyDE skipped, raw query used)

---

### FR-3.1: Token-Budgeted Context Assembly

**Type:** Service Logic
**Priority:** Tier 2 — HIGH (prevents Claude context overflow)
**Estimated Size:** Large (50+ lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** `assembleContext()` function (currently starts around line 215)

**Current Behavior:** Concatenates ALL retrieved sections and facts with no token limit. `RAG_CONFIG.retrieval.maxContextTokens = 100000` is defined but never enforced.

**New Implementation:**

Replace the `assembleContext` function with a token-budgeted version:

```typescript
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
}): { context: string; tokenCount: number; truncated: boolean } {
  const { sections, facts, documentSummary } = params;
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
      // Truncate summary at sentence boundary
      const truncatedSummary = truncateAtSentence(summaryText, headerBudget * 4);
      contextParts.push(truncatedSummary);
      usedTokens += estimateTokens(truncatedSummary);
      truncated = true;
    }
  }

  // Add sections in similarity order until budget used
  let sectionTokensUsed = 0;
  if (isMultiDoc) {
    // Multi-doc: group by document, add document headers
    const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
    for (const section of sections) {
      const existing = sectionsByDoc.get(section.documentId) || [];
      existing.push(section);
      sectionsByDoc.set(section.documentId, existing);
    }

    for (const [_docId, docSections] of Array.from(sectionsByDoc.entries())) {
      for (const section of docSections) {
        const preamble = section.contextualPreamble ? `${section.contextualPreamble}\n\n` : '';
        const sectionText = `### Section: ${section.title || 'Untitled'}\n${preamble}${section.originalText}`;
        const sectionTokens = estimateTokens(sectionText);

        if (sectionTokensUsed + sectionTokens > sectionBudget) {
          // Try to fit a truncated version
          const remaining = sectionBudget - sectionTokensUsed;
          if (remaining > 200) {
            const truncatedText = truncateAtSentence(sectionText, remaining * 4);
            contextParts.push(truncatedText);
            sectionTokensUsed += estimateTokens(truncatedText);
            truncated = true;
          }
          break;
        }

        contextParts.push(sectionText);
        sectionTokensUsed += sectionTokens;
      }
    }
  } else {
    // Single-doc: original pattern
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
          truncated = true;
        }
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
    const factText = `- [${fact.factType}] ${fact.content} (confidence: ${fact.confidence})`;
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

**Callers must be updated** in `queryRAG()`: the current call `assembleContext({ sections, facts, documentSummary })` returns a string. The new version returns `{ context, tokenCount, truncated }`. Update the call site (around line 835) to destructure:

```typescript
// Step 5: Assemble context
const { context: assembledContext, tokenCount, truncated } = assembleContext({
  sections: retrieved.sections,
  facts: balancedFacts,
  documentSummary,
});

if (truncated) {
  console.warn(`[RAG Retrieval] Context truncated to ${tokenCount} tokens for query "${params.queryText.slice(0, 50)}..."`);
}
```

**Dependencies:** None

**Validation Criteria:**
- Context string never exceeds `maxContextTokens * 4` characters (100K tokens ≈ 400K chars)
- When context is truncated, `truncated` is `true` and a warning is logged
- Sections are prioritized over facts (70% vs 25% budget)
- Truncation happens at sentence boundaries, not mid-word

---

### FR-4.1: Batch-Fetch Sections and Facts (N+1 Fix)

**Type:** Service Logic (Performance)
**Priority:** Tier 2 — HIGH (60 queries → 2 queries)
**Estimated Size:** Large (50+ lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** `retrieveContext()` function, approximately lines 65-210

**Current Behavior:** For each embedding match, a separate `.select().eq('id', sourceId).single()` query fetches the full section/fact row. With 10 sections + 20 facts from both query and HyDE = up to 60 individual DB queries.

**New Implementation:**

Replace the per-result fetch pattern with a two-phase approach:

**Phase 1:** Collect all source IDs from vector + BM25 search results with their metadata (similarity scores, source types).

**Phase 2:** Batch-fetch all sections and facts in exactly 2 queries.

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

  // Collect source ID → best similarity score maps
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

  // --- BATCH FETCH (2 queries instead of up to 60) ---

  const allSectionIds = Array.from(sectionScores.keys());
  const allFactIds = Array.from(factScores.keys());

  // Fetch all sections in one query
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

  // Fetch all facts in one query
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

**Dependencies:** None

**Validation Criteria:**
- Same retrieval results as before (sections and facts match)
- Only 2 DB queries for section/fact fetches (verify via console logs)
- KB-wide queries use `kbWideSimilarityThreshold` (0.3) instead of `similarityThreshold` (0.4)

---

### FR-4.2: Filter Non-Ready Documents from KB-Wide Query Results

**Type:** Service Logic
**Priority:** Tier 2 — HIGH (prevents partial ingestion data in results)
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside the new `retrieveContext()` from FR-4.1, after the batch fetch

**Implementation:**

After batch-fetching sections and facts, filter out any that belong to non-ready documents. This is only needed for KB-wide queries because document-level queries are inherently scoped.

Add after the batch fetch block:

```typescript
// Filter out results from non-ready documents (KB-wide only)
if (!params.documentId && params.knowledgeBaseId) {
  // Get set of ready document IDs in this KB
  const { data: readyDocs } = await supabase
    .from('rag_documents')
    .select('id')
    .eq('knowledge_base_id', params.knowledgeBaseId)
    .eq('status', 'ready');

  const readyDocIds = new Set((readyDocs || []).map(d => d.id));

  // Filter sections and facts
  const filteredSections = sections.filter(s => readyDocIds.has(s.documentId));
  const filteredFacts = facts.filter(f => readyDocIds.has(f.documentId));

  if (filteredSections.length < sections.length || filteredFacts.length < facts.length) {
    console.warn(`[RAG Retrieval] Filtered out ${sections.length - filteredSections.length} sections and ${facts.length - filteredFacts.length} facts from non-ready documents`);
  }

  // Replace with filtered arrays
  sections.length = 0;
  sections.push(...filteredSections);
  facts.length = 0;
  facts.push(...filteredFacts);
}
```

Note: To make the `sections` and `facts` arrays mutable, declare them with `let` instead of `const` in FR-4.1, or use the splice/push pattern shown above.

**Dependencies:** FR-4.1

**Validation Criteria:**
- KB-wide query results contain NO sections/facts from documents with `status != 'ready'`
- Single-document queries are unaffected

---

### FR-5.1: Fix `generateAndStoreEmbedding()` to Set `knowledge_base_id`

**Type:** Service Logic
**Priority:** Tier 1 — CRITICAL (embeddings invisible to KB-wide search)
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-embedding-service.ts`
**Location:** `generateAndStoreEmbedding()` function, approximately lines 28-62

**Current Code (insert block):**
```typescript
const { data, error } = await supabase
  .from('rag_embeddings')
  .insert({
    document_id: documentId,
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    content_text: contentText,
    embedding: embedding,
    embedding_model: provider.getModelName(),
    tier,
    metadata: metadata || {},
    run_id: params.runId || null,
  })
  .select('id')
  .single();
```

**New Code:**
```typescript
// Lookup knowledge_base_id from document
const { data: docRow } = await supabase
  .from('rag_documents')
  .select('knowledge_base_id')
  .eq('id', documentId)
  .single();

const { data, error } = await supabase
  .from('rag_embeddings')
  .insert({
    document_id: documentId,
    user_id: userId,
    knowledge_base_id: docRow?.knowledge_base_id || null,
    source_type: sourceType,
    source_id: sourceId,
    content_text: contentText,
    embedding: embedding,
    embedding_model: provider.getModelName(),
    tier,
    metadata: metadata || {},
    run_id: params.runId || null,
  })
  .select('id')
  .single();
```

**Note:** The batch function `generateAndStoreBatchEmbeddings()` already accepts and sets `knowledge_base_id` (the Inngest pipeline passes `doc.knowledgeBaseId` at line 487 of `process-rag-document.ts`). This fix is only needed for the single-record function.

**Dependencies:** Migration 6 (backfill existing NULLs)

**Validation Criteria:**
- After fix, calling `generateAndStoreEmbedding()` produces embeddings with non-null `knowledge_base_id`
- Verify: `SELECT COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL` returns 0

---

### FR-6.1: KB Summary Auto-Generation on Document Finalization

**Type:** Service Logic
**Priority:** Tier 2 — HIGH
**Estimated Size:** Medium (20-50 lines)

**File:** `src/inngest/functions/process-rag-document.ts`
**Location:** Inside the `finalize` step (Step 12, around line 528)

**Implementation:**

After updating the document status to `ready`, regenerate the KB summary by concatenating the first 200 tokens (~800 chars) of each ready document's summary in the KB.

Add after the document status update in the `finalize` step:

```typescript
// Regenerate KB summary after document finalization
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
    .update({ summary: kbSummary.slice(0, 10000) }) // Cap at ~2500 tokens
    .eq('id', doc.knowledgeBaseId);

  console.log(`[Inngest] KB summary updated (${readyDocs.length} docs, ${kbSummary.length} chars)`);
}
```

**Dependencies:** Migration 1 (summary column)

**Validation Criteria:**
- After processing a second document in a KB, `rag_knowledge_bases.summary` is non-null
- Summary contains excerpts from both documents, prefixed with file names
- Summary is capped at 10,000 characters

---

### FR-6.2: Set `knowledge_base_id` on Facts and Sections During Ingestion

**Type:** Service Logic
**Priority:** Tier 3 — MEDIUM (performance optimization for BM25)
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-ingestion-service.ts`
**Location:** `storeSectionsFromStructure()` function (around line 668) and `storeExtractedFacts()` function

**Implementation:**

In `storeSectionsFromStructure()`, add a `knowledgeBaseId` parameter and include it in the insert:

```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult,
  knowledgeBaseId?: string  // NEW parameter
): Promise<RAGSection[]> {
  // ...existing logic...
  const sectionRecords = structure.sections.map((section, index) => {
    // ...existing record building...
    return {
      // ...existing fields...
      knowledge_base_id: knowledgeBaseId || null, // NEW field
    };
  });
  // ...rest of function
}
```

Similarly, in `storeExtractedFacts()`, add `knowledgeBaseId` parameter and include it in the fact insert records:

```typescript
// In the insert record for each fact:
knowledge_base_id: knowledgeBaseId || null,
```

**Update callers** in `process-rag-document.ts` to pass `doc.knowledgeBaseId`:
- `storeSectionsFromStructure(documentId, doc.userId, doc.originalText, structure, doc.knowledgeBaseId)` (Step 2)
- All `storeExtractedFacts()` calls should pass `doc.knowledgeBaseId`

**Dependencies:** Migration 5 (columns on facts/sections)

**Validation Criteria:**
- New facts and sections have `knowledge_base_id` set at insert time
- Existing backfilled data also has `knowledge_base_id` set (via Migration 5)

---

### FR-7.1: "Chat with Knowledge Base" Button on Dashboard

**Type:** UI
**Priority:** Tier 3 — MEDIUM (UX entry point)
**Estimated Size:** Small (<20 lines)

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx`
**Location:** Inside the KB card render (around line 67-85)

**Implementation:**

Add a "Chat with KB" button to each KB card that has 2+ ready documents. The button should navigate to the RAG chat view with `knowledgeBaseId` set and no `documentId`.

Add an `onChatWithKB` callback prop to the component interface:

```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  onChatWithKnowledgeBase?: (kb: RAGKnowledgeBase) => void; // NEW
  selectedId?: string;
}
```

Inside the card's `<CardContent>` section (after the document count display, line 81):

```tsx
{kb.documentCount >= 2 && props.onChatWithKnowledgeBase && (
  <Button
    variant="outline"
    size="sm"
    className="mt-2 w-full"
    onClick={(e) => {
      e.stopPropagation();
      props.onChatWithKnowledgeBase!(kb);
    }}
  >
    <MessageCircle className="h-4 w-4 mr-2" />
    Chat with All Documents
  </Button>
)}
```

Add `MessageCircle` to the Lucide import at line 4.

**Dependencies:** None

**Validation Criteria:**
- KBs with 2+ documents show the "Chat with All Documents" button
- KBs with 0-1 documents do NOT show the button
- Clicking the button opens RAGChat with `knowledgeBaseId` set and no `documentId`

---

### FR-7.2: KB-Wide Scope Indicator in RAGChat

**Type:** UI
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<20 lines)

**File:** `src/components/rag/RAGChat.tsx`
**Location:** `<CardTitle>` element (line 122-124)

**Current Code:**
```tsx
<CardTitle className="text-base flex items-center gap-2">
  <MessageCircle className="h-5 w-5" />
  Chat with {documentName || 'Documents'}
</CardTitle>
```

**New Code:**
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
```

Add `Database, FileText` to the Lucide import at line 7.

**Dependencies:** None

**Validation Criteria:**
- KB-wide chat shows "Searching across all documents in knowledge base"
- Document-level chat shows "Searching: [document name]"

---

### FR-7.3: "Chat with All Documents" Link in DocumentList

**Type:** UI
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<20 lines)

**File:** `src/components/rag/DocumentList.tsx`
**Location:** Before the document map loop (around line 66)

**Implementation:**

Add an `onChatWithAll` callback prop and render a link at the top of the document list when there are 2+ ready documents:

```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  onChatWithAll?: () => void; // NEW
  selectedId?: string;
}
```

Add before the `documents.map()` call (around line 67):

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

Add `MessageCircle` to the Lucide import at line 5.

**Dependencies:** None

**Validation Criteria:**
- "Chat with all documents" card appears when 2+ documents have `status = 'ready'`
- Does NOT appear with 0-1 ready documents
- Clicking triggers `onChatWithAll` callback

---

### FR-8.1: Citation Provenance for Multi-Document Results

**Type:** Service Logic + Types
**Priority:** Tier 2 — HIGH (users can't tell which document a citation comes from)
**Estimated Size:** Medium (20-50 lines)

**File 1:** `src/types/rag.ts`
**Location:** `RAGCitation` interface (lines 208-213)

**Current Code:**
```typescript
export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
}
```

**New Code:**
```typescript
export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
  documentId?: string;      // NEW: source document ID for multi-doc provenance
  documentName?: string;    // NEW: source document name for display
}
```

**File 2:** `src/types/rag.ts`
**Location:** `RAGKnowledgeBase` interface (lines 76-85)

**Add `summary` field:**
```typescript
export interface RAGKnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  summary: string | null;     // NEW: auto-generated from document summaries
  status: RAGKnowledgeBaseStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**File 3:** `src/types/rag.ts`
**Location:** `RAGKnowledgeBaseRow` interface (lines 514-523)

**Add `summary` field:**
```typescript
export interface RAGKnowledgeBaseRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  summary: string | null;     // NEW
  status: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}
```

**File 4:** `src/lib/rag/services/rag-db-mappers.ts`
**Location:** The `mapRowToKnowledgeBase` function

**Add summary mapping:**
```typescript
// In mapRowToKnowledgeBase(), add:
summary: row.summary || null,
```

**File 5:** `src/types/rag.ts`
**Location:** `RAGQuery` interface (lines 187-206)

**Add `queryScope` field:**
```typescript
export interface RAGQuery {
  // ...existing fields...
  queryScope: 'document' | 'knowledge_base';  // NEW
}
```

**File 6:** `src/types/rag.ts`
**Location:** `RAGQueryRow` interface (lines 605-624)

**Add `query_scope` field:**
```typescript
export interface RAGQueryRow {
  // ...existing fields...
  query_scope: string | null;  // NEW
}
```

**Dependencies:** Migrations 1, 4

**Validation Criteria:**
- `RAGCitation` type has `documentId` and `documentName` optional fields
- `RAGKnowledgeBase` type has `summary` field
- `RAGQuery` type has `queryScope` field
- TypeScript compilation succeeds with no errors

---

### FR-8.2: Populate Citation `documentId` and `documentName` in Response Generation

**Type:** Service Logic
**Priority:** Tier 2 — HIGH
**Estimated Size:** Medium (20-50 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `queryRAG()`, after response generation, before storing in `rag_queries`

**Implementation:**

After `generateResponse()` or `generateLoRAResponse()` returns citations, enrich them with document provenance by looking up the section's `document_id` and the document's `file_name`.

Add a helper function:

```typescript
async function enrichCitationsWithDocumentInfo(
  citations: RAGCitation[],
  sections: Array<RAGSection & { similarity: number }>
): Promise<RAGCitation[]> {
  if (citations.length === 0) return citations;

  // Build section ID → document info map from retrieved sections
  const sectionDocMap = new Map<string, { documentId: string }>();
  for (const section of sections) {
    sectionDocMap.set(section.id, { documentId: section.documentId });
  }

  // Get unique document IDs
  const docIds = [...new Set(sections.map(s => s.documentId))];
  if (docIds.length === 0) return citations;

  // Batch-fetch document names
  const supabase = createServerSupabaseAdminClient();
  const { data: docs } = await supabase
    .from('rag_documents')
    .select('id, file_name')
    .in('id', docIds);

  const docNameMap = new Map((docs || []).map(d => [d.id, d.file_name]));

  // Enrich citations
  return citations.map(citation => {
    const sectionInfo = sectionDocMap.get(citation.sectionId);
    if (sectionInfo) {
      return {
        ...citation,
        documentId: sectionInfo.documentId,
        documentName: docNameMap.get(sectionInfo.documentId) || undefined,
      };
    }
    return citation;
  });
}
```

Call this after response generation in `queryRAG()`:

```typescript
// After generateResponse() or generateLoRAResponse():
citations = await enrichCitationsWithDocumentInfo(citations, retrieved.sections);
```

**Dependencies:** FR-8.1 (type changes)

**Validation Criteria:**
- KB-wide query citations include `documentId` and `documentName` for sections that were retrieved
- Single-document query citations also include document info (harmless, adds consistency)

---

### FR-9.1: Scope-Aware Conversation History

**Type:** Service Logic
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside `queryRAG()`, at the "Step 1.5: Conversation context" block (around lines 755-765)

**Current Code:**
```typescript
const recentQueries = await getQueryHistory({
  knowledgeBaseId: knowledgeBaseId || undefined,
  userId: params.userId,
  limit: 3,
});
```

**New Code:**
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

**Rationale:** Document-level queries should see document-level conversation history. KB-level queries should see KB-level history. Mixing scopes degrades HyDE quality because the conversation context references a different search domain.

**Dependencies:** None

**Validation Criteria:**
- Document-level queries only see previous queries for that specific document
- KB-level queries only see previous KB-level queries
- Switching from doc to KB scope effectively starts a fresh conversation

---

### FR-9.2: Pass Conversation Context to Response Generation

**Type:** Service Logic
**Priority:** Tier 3 — MEDIUM (follow-up questions lose context without this)
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** `generateResponse()` function (around line 480) and its call site in `queryRAG()`

**Current Behavior:** Conversation context is only passed to HyDE generation, NOT to `generateResponse()`. This means follow-up questions like "What about the exceptions?" have no context about what "the" refers to.

**Implementation:**

Add `conversationContext` parameter to `generateResponse()`:

```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
  conversationContext?: string; // NEW
}): Promise<{ responseText: string; citations: RAGCitation[] }> {
```

In the system prompt inside `generateResponse()`, append:

```typescript
const contextSection = params.conversationContext
  ? `\n\nRecent conversation for context (use to understand follow-up references):\n${params.conversationContext}`
  : '';

// In the generateResponse call:
const result = await provider.generateResponse({
  queryText: params.queryText,
  assembledContext: params.assembledContext + contextSection,
  systemPrompt,
});
```

Update the call site in `queryRAG()`:

```typescript
const claudeResult = await generateResponse({
  queryText: params.queryText,
  assembledContext,
  mode,
  conversationContext, // NEW: pass conversation context
});
```

**Dependencies:** None

**Validation Criteria:**
- Follow-up questions like "What about the exceptions to that policy?" produce coherent answers that reference the previous conversation
- The conversation context appears in the assembled context string sent to Claude

---

### FR-10.1: Config Additions

**Type:** Config
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<10 lines)

**File:** `src/lib/rag/config.ts`
**Location:** Inside the `retrieval` block (lines 63-69)

**Current Code:**
```typescript
retrieval: {
  maxSectionsToRetrieve: 10,
  maxFactsToRetrieve: 20,
  similarityThreshold: 0.4,
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
},
```

**New Code:**
```typescript
retrieval: {
  maxSectionsToRetrieve: 10,
  maxFactsToRetrieve: 20,
  similarityThreshold: 0.4,
  kbWideSimilarityThreshold: 0.3,  // NEW: lower threshold for KB-wide queries
  maxSingleDocRatio: 0.6,          // NEW: configurable (was hardcoded in balanceMultiDocCoverage)
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
},
```

**Also update** `balanceMultiDocCoverage()` to use the config value:

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = RAG_CONFIG.retrieval.maxSingleDocRatio // Was hardcoded 0.6
): T[] {
```

**Dependencies:** None

**Validation Criteria:**
- `RAG_CONFIG.retrieval.kbWideSimilarityThreshold` equals `0.3`
- `RAG_CONFIG.retrieval.maxSingleDocRatio` equals `0.6`
- `balanceMultiDocCoverage()` uses the config value instead of hardcoded `0.6`

---

### FR-10.2: Soft-Balance Multi-Doc Coverage with Fallback

**Type:** Service Logic
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** `balanceMultiDocCoverage()` function (around line 441)

**Implementation:**

After balancing, check if the result count dropped significantly. If >30% of results were dropped, fall back to the original unbalanced results:

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

  // Soft fallback: if balancing dropped >30% of results, use original top-N
  if (balanced.length < results.length * 0.7) {
    console.warn(`[RAG Retrieval] Balance dropped ${results.length - balanced.length}/${results.length} results — falling back to top-N by similarity`);
    return results;
  }

  return balanced;
}
```

**Dependencies:** FR-10.1 (config value)

**Validation Criteria:**
- When balancing drops ≤30% of results, balanced results are returned
- When balancing drops >30%, original results are returned with a warning log
- Log message includes the count of dropped results

---

### FR-10.3: Reranker Document Provenance for KB-Wide Queries

**Type:** Service Logic
**Priority:** Tier 3 — MEDIUM
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** `rerankWithClaude()` function, in the candidate list building (around line 335)

**Current Code:**
```typescript
const candidateList = params.candidates
  .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
  .join('\n');
```

**New Code:**

Add an optional `documentNames` map to the params:

```typescript
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number; documentName?: string }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
```

And update the candidate list:

```typescript
const candidateList = params.candidates
  .map((c, i) => {
    const docPrefix = c.documentName ? `[Doc: ${c.documentName}] ` : '';
    return `[${i}] ${docPrefix}${c.content.slice(0, 500)}`;
  })
  .join('\n');
```

**Update the call site** in `queryRAG()` where `rerankWithClaude` is called (around line 855). Build a document name map from retrieved sections:

```typescript
// Build doc name lookup for reranker
const docNameMap = new Map<string, string>();
for (const section of retrieved.sections) {
  if (!docNameMap.has(section.documentId)) {
    // Will be populated after we add batch doc name fetch
    docNameMap.set(section.documentId, section.documentId.slice(0, 8));
  }
}

// In the reranker call:
const reranked = await rerankWithClaude({
  queryText: params.queryText,
  candidates: processedFacts.map(f => ({
    id: f.id,
    content: f.content,
    similarity: f.similarity,
    documentName: docNameMap.get(f.documentId) || undefined,
  })),
  topK: Math.min(processedFacts.length, 15),
});
```

Note: For a more complete solution, fetch document names from DB alongside the batch section/fact fetch in FR-4.1. For now, using the first 8 chars of the document ID as a short identifier is sufficient.

**Dependencies:** None

**Validation Criteria:**
- KB-wide reranker candidates include `[Doc: ...]` prefix
- Single-document reranker candidates do NOT include the prefix (no `documentName` set)

---

### FR-10.4: Hybrid Search Disjoint-Ratio Logging

**Type:** Service Logic (Observability)
**Priority:** Tier 4 — LOW
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`
**Location:** Inside the new `retrieveContext()` from FR-4.1, after collecting all IDs from vector and BM25 search

**Implementation:**

Add logging after BM25 results are merged:

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

Note: This logging should be added BEFORE the BM25 results are merged into the score maps (so `vectorIds` represents vector-only results). Adjust placement in FR-4.1 accordingly.

**Dependencies:** FR-4.1

**Validation Criteria:**
- Log line appears for every retrieval call
- Metrics are plausible (overlap ≤ min(vector, bm25))

---

## 4. HUMAN ACTION STEPS

> **These steps require human execution. They cannot be automated by the coding agent.**

### Step H1: Execute Database Migrations

Run each migration in order using SAOL. **Always dry-run first.**

```bash
# Navigate to SAOL directory
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"

# Migration 1: KB summary field
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;\",dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql:\"ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;\",transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"

# Migration 2: Btree index
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id ON rag_embeddings (knowledge_base_id);\",dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql:\"CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id ON rag_embeddings (knowledge_base_id);\",transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"

# Migration 3: Composite index
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier ON rag_embeddings (knowledge_base_id, tier);\",dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql:\"CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier ON rag_embeddings (knowledge_base_id, tier);\",transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"

# Migration 4: Query scope column
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));\",dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql:\"ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));\",transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"

# Migration 5: Denormalize KB ID onto facts/sections + backfill
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL; UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"

# Migration 6: Backfill NULL knowledge_base_id on embeddings
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success,r.summary);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success,x.summary);}})();"
```

### Step H2: Verify Migrations

```bash
# Verify all migrations applied
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Check KB summary column
  const kb=await saol.agentIntrospectSchema({table:'rag_knowledge_bases',includeColumns:true,transport:'pg'});
  const kbCols=kb.tables[0]?.columns.map(c=>c.name)||[];
  console.log('KB has summary:',kbCols.includes('summary'));

  // Check query_scope column
  const q=await saol.agentIntrospectSchema({table:'rag_queries',includeColumns:true,transport:'pg'});
  const qCols=q.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Queries has query_scope:',qCols.includes('query_scope'));

  // Check facts KB ID column
  const f=await saol.agentIntrospectSchema({table:'rag_facts',includeColumns:true,transport:'pg'});
  const fCols=f.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Facts has knowledge_base_id:',fCols.includes('knowledge_base_id'));

  // Check sections KB ID column
  const s=await saol.agentIntrospectSchema({table:'rag_sections',includeColumns:true,transport:'pg'});
  const sCols=s.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Sections has knowledge_base_id:',sCols.includes('knowledge_base_id'));

  // Check NULL embeddings
  const nullCheck=await saol.agentQuery({table:'rag_embeddings',select:'id',where:[{column:'knowledge_base_id',operator:'is',value:null}],limit:1});
  console.log('Null KB embeddings remaining:',nullCheck.data?.length||0);
})();
"
```

### Step H3: Vercel Redeployment

After all code changes are merged, trigger a Vercel redeployment. No new environment variables are required — all changes use existing config.

### Step H4: No New Inngest Functions

No new Inngest functions are created. The existing `process-rag-document` function is modified (FR-6.1) to regenerate the KB summary on document finalization. Inngest auto-discovers function changes on deployment.

---

## 5. TESTING & VALIDATION

### 5.1 Manual Smoke Test Sequence

1. **Test KB-wide query (primary):**
   - Navigate to a KB with 2+ ready documents
   - Click "Chat with All Documents" (FR-7.1 or FR-7.3)
   - Ask: "What are the key policies across all documents?"
   - Verify: Response includes citations from multiple documents
   - Verify: Each citation shows document name (FR-8.1, FR-8.2)
   - Verify: Scope indicator shows "Searching across all documents" (FR-7.2)

2. **Test single-document query (regression):**
   - Select a specific document
   - Ask the same question
   - Verify: Response only cites that document
   - Verify: Scope indicator shows document name

3. **Test follow-up questions:**
   - In KB-wide chat, ask a follow-up: "What are the exceptions to that?"
   - Verify: Response references the previous answer's topic (FR-9.2)

4. **Test scope switching:**
   - Switch from document-level to KB-level chat
   - Verify: Conversation history resets (FR-9.1)

5. **Test no-results scenario:**
   - Ask a completely unrelated question
   - Verify: Friendly "I could not find..." message appears
   - Verify: Query stored with `self_eval_score: 0`

### 5.2 Golden Set Expansion

Add 5 KB-wide test questions to the golden set at `src/lib/rag/testing/golden-set-definitions.ts`:

```typescript
// Add to the existing golden set array:
{
  question: 'What are the key differences between the two documents in the knowledge base?',
  expectedScope: 'knowledge_base',
  expectedDocCount: 2, // Should reference both docs
},
{
  question: 'What policies apply to jumbo mortgages?',
  expectedScope: 'knowledge_base',
  expectedMinCitations: 1,
},
// ...3 more domain-specific questions
```

### 5.3 Regression Checks

- All 20 existing golden set questions still pass at their previous quality scores
- Single-document queries produce identical results to before (guard clause removal is the only change that affects them, and it doesn't change single-doc behavior)
- Self-eval scores for KB-wide queries are logged and reviewed

---

## 6. EXCLUDED SCOPE

| Excluded Item | Reason |
|---------------|--------|
| GraphRAG / LazyGraphRAG | Phase 2+ — cross-KB queries. Existing multi-tier hierarchy + hybrid search + Claude reranking achieves most benefits for single-KB queries. |
| ColPali visual processing | Phase 3+ — current supported file types (PDF, DOCX, TXT, MD) are text-based. |
| Agentic RAG (multi-step reasoning) | Phase 3+ — overkill for KB-wide search over well-formatted documents. |
| Cross-KB search | Phase 2+ — each KB is an isolated search domain. |
| New document format support (XLSX, PPTX, OCR) | Not needed for current use case. |
| New npm dependencies | Zero new packages. All capabilities built with existing stack. |
| New deployment targets | All changes deploy to existing Vercel + Supabase infrastructure. |
| New API routes | Existing `/api/rag/query` already accepts both `documentId` and `knowledgeBaseId`. |
| New Inngest functions | Existing pipeline modified, not replaced. |
| `rag_citations` table | Citations remain stored as JSONB on `rag_queries.citations`. No separate table needed. |
| HNSW index creation | Already exists as `idx_rag_embeddings_hnsw` (confirmed in Section 2.1 of build input prompt). |

---

## 7. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token overflow on KB-wide queries | Medium | High (Claude API error) | FR-3.1 enforces token budget with 70/25/5 allocation |
| Performance degradation at 20+ documents | Low | Medium | Btree + composite indexes (Migrations 2-3), batch fetch (FR-4.1) |
| HyDE hallucination with weak KB summary | Medium | Low (slightly worse recall) | FR-2.1 falls back to KB description; HyDE skipped entirely if no summary |
| Guard clause removal breaks single-doc queries | Very Low | High | New guard only removes the throw when `knowledgeBaseId` is present; single-doc path unchanged |
| Conversation context mixing between scopes | Medium | Low (confusing but not wrong) | FR-9.1 scopes conversation history; FR-1.2 adds `query_scope` column |
| Backfill migration on large embedding table | Low | Medium (lock time) | Use `WHERE knowledge_base_id IS NULL` to limit scope; run in low-traffic window |

---

## 8. IMPLEMENTATION ORDER

Execute FRs in this order to minimize dependencies and enable incremental testing:

| Phase | FRs | What It Enables |
|-------|-----|-----------------|
| 1. Migrations | Migrations 1-6 | Database ready for all code changes |
| 2. Critical fixes | FR-1.1, FR-5.1 | Guard clause removed, embeddings visible |
| 3. Types & Config | FR-8.1, FR-10.1 | Types compiled, config available |
| 4. Core pipeline | FR-4.1, FR-4.2, FR-3.1, FR-2.1 | Full retrieval pipeline functional for KB-wide |
| 5. Quality | FR-10.2, FR-10.3, FR-9.1, FR-9.2, FR-8.2 | Balanced results, provenance, conversation scope |
| 6. Ingestion | FR-6.1, FR-6.2 | KB summary auto-generated, denormalized IDs |
| 7. UI | FR-7.1, FR-7.2, FR-7.3 | User-facing entry points |
| 8. Observability | FR-1.2, FR-10.4 | Logging and scope tracking |

---

**Document Owner:** Product Management & Control (PMC)
**Prepared by:** Specification-writing agent from 001-multi-doc-build-input-prompt_v2.md
**Total FRs:** 19
**Total Migrations:** 6
**Estimated Files Modified:** 7 (rag-retrieval-service.ts, rag-embedding-service.ts, rag-ingestion-service.ts, process-rag-document.ts, rag.ts, config.ts, rag-db-mappers.ts) + 3 UI files
**New Files:** 0
**New Dependencies:** 0
