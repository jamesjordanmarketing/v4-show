# Multi-Document Retrieval — Final Implementation Specification

**Version:** 3.0 (FINAL)  
**Date:** February 2026  
**Built From:** `002-multi-doc-retrieval-specification_v1.md` (Second), `002-multi-doc-retrieval-specification_v2.md` (First)  
**Validated Against:** Live codebase at `src/` as of February 20, 2026  
**Output For:** Coding agent (Claude Code)  
**SAOL Required:** ALL database operations MUST use the Supabase Agent Ops Library  
**Status:** READY TO BUILD

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Foundation Verification Report](#2-foundation-verification-report)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Migrations](#4-database-migrations)
5. [Feature Requirements — Core Pipeline](#5-feature-requirements--core-pipeline)
6. [Feature Requirements — Quality & Performance](#6-feature-requirements--quality--performance)
7. [Feature Requirements — Types, Config & Mappers](#7-feature-requirements--types-config--mappers)
8. [Feature Requirements — Ingestion Pipeline](#8-feature-requirements--ingestion-pipeline)
9. [Feature Requirements — UI](#9-feature-requirements--ui)
10. [Feature Requirements — Observability](#10-feature-requirements--observability)
11. [Phase 2 — Query Decomposition](#11-phase-2--query-decomposition)
12. [Phase 3 — GraphRAG Microservice (Optional)](#12-phase-3--graphrag-microservice-optional)
13. [Human Action Steps](#13-human-action-steps)
14. [Testing & Validation](#14-testing--validation)
15. [Excluded Scope](#15-excluded-scope)
16. [Risk Assessment & Mitigations](#16-risk-assessment--mitigations)
17. [Cost Projections](#17-cost-projections)
18. [Implementation Sequence](#18-implementation-sequence)
19. [Appendix: File Reference](#19-appendix-file-reference)

---

## 1. EXECUTIVE SUMMARY

### What We're Building

Multi-document retrieval enables users to ask questions that span multiple documents within a single Knowledge Base. Instead of querying one document at a time, users can chat with an entire knowledge base and receive answers that synthesize information from any and all documents it contains.

### Current State

The RAG Frontier module (E01-E10) is **fully built** with a 6-pass ingestion pipeline (Structure → Policies → Tables → Glossary → Narrative → Verification), multi-tier embeddings, HyDE, hybrid search (vector + BM25), Claude reranking, Self-RAG evaluation, and multi-document retrieval infrastructure coded but unreachable.

### The Gap

One guard clause in `rag-retrieval-service.ts` at **line 693** blocks KB-wide queries. All downstream infrastructure (KB-wide RPC search, multi-doc context assembly, deduplication, balanced coverage) is already implemented but unreachable. Beyond removing that blocker:

1. Several performance gaps (N+1 queries, no token budget enforcement)
2. Missing KB summary for HyDE in KB-wide queries
3. No UI entry point for KB-wide chat
4. Citations lack document provenance for cross-document results
5. Ingestion doesn't propagate `knowledge_base_id` to facts/sections
6. Single-embed function doesn't set `knowledge_base_id`

### Approach

**EXTENSION** of the existing RAG module — not a rewrite. Zero new npm dependencies, zero new API routes, zero new database tables (except optional entity tracking), zero new Inngest functions.

### What We're Adding

- 5 database schema changes (columns, indexes, backfills)
- ~20 code changes across 8 existing files
- 3 UI enhancements to existing components
- 2 new config values
- 0 new npm dependencies
- 0 new API routes
- 0 new Inngest functions

---

## 2. FOUNDATION VERIFICATION REPORT

### Verdict: ✅ FOUNDATION IS BUILT (with one critical blocker + quality gaps)

Every component required for multi-document retrieval exists in code. Below is the item-by-item verification against the live codebase:

| Component | File | Lines | Status | Evidence |
|-----------|------|-------|--------|----------|
| **Type System** | `src/types/rag.ts` | 641 | ✅ Complete | `RAGDocumentType` (4 types), `RAGFactType` (14 types), `RAGFact` with provenance fields (`policyId`, `ruleId`, `parentFactId`, `subsection`, `factCategory`), `RAGSection` with `documentId`, `RAGQueryMode` (3 modes) |
| **Config** | `src/lib/rag/config.ts` | 93 | ⚠️ Gaps | `retrieval` block has `similarityThreshold: 0.4`, `maxContextTokens: 100000` — but missing `kbWideSimilarityThreshold` and `maxSingleDocRatio` |
| **LLM Provider** | `src/lib/rag/providers/llm-provider.ts` | 180 | ✅ Complete | All 6 extraction method signatures |
| **Claude LLM Provider** | `src/lib/rag/providers/claude-llm-provider.ts` | 953 | ✅ Complete | Full implementation of all 6 extraction methods |
| **Ingestion Service** | `src/lib/rag/services/rag-ingestion-service.ts` | 1050 | ⚠️ Gaps | `storeSectionsFromStructure()` (L668) and `storeExtractedFacts()` (L911) do NOT accept or insert `knowledge_base_id` |
| **Embedding Service** | `src/lib/rag/services/rag-embedding-service.ts` | 257 | ⚠️ Gap | `searchSimilarEmbeddings()` (L116) uses `match_rag_embeddings_kb` RPC with `knowledgeBaseId` ✅; `searchTextContent()` (L161) uses `search_rag_text` with `knowledgeBaseId` ✅; **BUT** `generateAndStoreEmbedding()` (L28) does NOT set `knowledge_base_id` |
| **Retrieval Service** | `src/lib/rag/services/rag-retrieval-service.ts` | 980 | ⚠️ Blocker + Gaps | `assembleContext()` (L214) groups by `documentId` for multi-doc ✅; `deduplicateResults()` (L371) Jaccard >0.9 ✅; `balanceMultiDocCoverage()` (L415) 60% cap ✅; `rerankWithClaude()` (L298) 3 parsing strategies ✅. **BLOCKED by guard clause at line 693.** Gaps: N+1 fetches in `retrieveContext()` (~50+ individual queries), no token budget enforcement, dedup/balance/rerank only applied to facts not sections, conversation context not passed to `generateResponse()`, HyDE only fetches single-doc summary |
| **6-Pass Pipeline** | `src/inngest/functions/process-rag-document.ts` | 586 | ⚠️ Gap | All 12 steps work ✅; `generateAndStoreBatchEmbeddings()` correctly passes `knowledgeBaseId` (L488) ✅; BUT `storeSectionsFromStructure()` (L103) and `storeExtractedFacts()` (5 call sites) do NOT pass `knowledgeBaseId`; finalize step does NOT generate KB summary |
| **API Route** | `src/app/api/rag/query/route.ts` | 82 | ✅ Complete | Already validates "at least one of documentId or knowledgeBaseId required" (L26-30) ✅ |
| **DB Mappers** | `src/lib/rag/services/rag-db-mappers.ts` | 189 | ⚠️ Gaps | 7 mapper functions ✅; no `mapRowToCitation` (citations cast inline from JSONB); `mapRowToKnowledgeBase` missing `summary`; `mapRowToQuery` missing `queryScope` |

### The One Critical Blocker

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Line:** 693  
**Code:**

```typescript
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
}
```

**Impact:** This guard clause blocks ALL KB-wide queries from reaching the downstream infrastructure that already supports them. The API route (L26-30) already validates that at least one scope identifier is present — this service-level guard is now redundant and harmful.

### Key Architectural Facts (Codebase-Verified)

| Fact | Evidence |
|------|----------|
| **Citations are JSONB on `rag_queries`** | `rag-retrieval-service.ts` inserts `citations` as a JSON array in the `rag_queries` row (L880-895). There is NO separate `rag_citations` table. The `mapRowToQuery` mapper (L159 of rag-db-mappers.ts) casts: `citations: Array.isArray(row.citations) ? row.citations as RAGCitation[] : []` |
| **RPCs exist for KB-wide search** | `searchSimilarEmbeddings()` calls `match_rag_embeddings_kb` RPC (embedding-service L131); `searchTextContent()` calls `search_rag_text` RPC (embedding-service L175) |
| **`assembleContext()` multi-doc branch exists but is incomplete** | L222 checks `isMultiDoc = docIds.size > 1` and groups by `documentId` — BUT the document ID is captured and never used in the header. Section headers show `### Section: ${section.title}` without identifying which document |
| **Dedup, balance, rerank only applied to facts** | `deduplicateResults()` called on facts only (L835); `balanceMultiDocCoverage()` called on facts only (L841); `rerankWithClaude()` called on facts only (L824). Sections get NONE of these quality passes |
| **`generateResponse()` lacks conversation context** | Function at L448 accepts `{ queryText, assembledContext, mode }` only. Conversation history (fetched at L753) is only used for HyDE, never passed to response generation |
| **3 insert sites for `rag_queries`** | LoRA-only (L727), no-context (L793), main (L880). All insert identical field set, none include `query_scope` |
| **`getQueryHistory()` is scope-agnostic** | L934-968: filters by `userId` + optional `knowledgeBaseId`/`documentId`. Called at L753 with `{ knowledgeBaseId, userId, limit: 3 }` — does NOT filter by scope |

---

## 3. ARCHITECTURE OVERVIEW

### Current Architecture (Single-Document)

```
User asks question → Select ONE document →
  HyDE (uses document summary) →
  Vector Search (scoped to documentId) → BM25 Search (scoped to documentId) →
  [Per-result N+1 fetches] →
  Claude Reranking (facts only) → Dedup (facts only) →
  Context Assembly (no token budget) → Response Generation → Self-RAG Eval →
  Store query + JSONB citations on rag_queries
```

### Target Architecture (Multi-Document)

```
User asks question → Select Knowledge Base (or specific document) →
  Determine scope (document vs knowledge_base) →

  IF document-scoped:
    [Existing single-document path, identical behavior]

  IF KB-wide:
    HyDE (uses KB summary, fallback to KB description) →
    KB-wide Vector Search (match_rag_embeddings_kb) →
    KB-wide BM25 Search (search_rag_text) →
    [Batch fetch: 2 queries instead of ~50] →
    Filter non-ready documents →
    Deduplication (sections + facts) →
    Balanced Coverage (sections + facts, 60% max per doc) →
    Claude Reranking (sections + facts, with doc provenance) →
    Token-Budgeted Context Assembly (70% sections / 25% facts / 5% headers) →
    Response Generation (with conversation context) →
    Self-RAG Eval →
    Store query + enriched JSONB citations with document provenance
```

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                           │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐       │
│  │ RAGChat.tsx     │  │ DocumentList   │  │ KB Dashboard     │       │
│  │ (scope toggle)  │  │ (chat-all btn) │  │ (chat-KB btn)    │       │
│  └────────┬───────┘  └───────┬────────┘  └────────┬─────────┘       │
│           │                  │                     │                  │
│  ┌────────┴──────────────────┴─────────────────────┴──────────────┐  │
│  │              useRAGChat hook (useMutation → /api/rag/query)     │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │   /api/rag/query          │
                    │   (already validates      │
                    │    documentId OR kbId)     │
                    └────────────┬──────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────┐
│                         Backend Services                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              rag-retrieval-service.ts (980 lines)             │    │
│  │  queryRAG()                                                   │    │
│  │    → Scope determination (doc vs KB)                          │    │
│  │    → HyDE (doc summary or KB summary)                         │    │
│  │    → retrieveContext() [batch fetch]                           │    │
│  │    → Filter non-ready docs (KB-wide)                          │    │
│  │    → deduplicateResults() [sections + facts]                  │    │
│  │    → balanceMultiDocCoverage() [sections + facts]             │    │
│  │    → rerankWithClaude() [with doc provenance]                 │    │
│  │    → assembleContext() [token-budgeted]                        │    │
│  │    → generateResponse() [with conversation context]           │    │
│  │    → selfEvaluate()                                           │    │
│  │    → Store query + enriched JSONB citations                   │    │
│  └──────┬──────────────────────┬───────────────────┬────────────┘    │
│         │                      │                   │                  │
│  ┌──────┴──────┐      ┌───────┴───────┐   ┌──────┴──────────┐      │
│  │ embedding-  │      │ claude-llm-   │   │ ingestion-      │      │
│  │ service.ts  │      │ provider.ts   │   │ service.ts      │      │
│  │ (KB-wide    │      │ (HyDE, rerank │   │ (6-pass, now    │      │
│  │  RPC search)│      │  response)    │   │  sets KB ID)    │      │
│  └──────┬──────┘      └───────┬───────┘   └──────┬──────────┘      │
│         │                     │                   │                  │
│  ┌──────┴─────────────────────┴───────────────────┴──────────┐      │
│  │              Supabase PostgreSQL + pgvector                 │      │
│  │  rag_knowledge_bases (+ summary) │ rag_documents            │      │
│  │  rag_sections (+ knowledge_base_id)                         │      │
│  │  rag_facts (+ knowledge_base_id)                            │      │
│  │  rag_embeddings (backfilled knowledge_base_id)              │      │
│  │  rag_queries (+ query_scope)                                │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─────────────────────────┐                                        │
│  │  Inngest (6-pass jobs)  │  ← Now generates KB summary on         │
│  │  process-rag-document   │    document finalization                │
│  └─────────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. DATABASE MIGRATIONS

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

---

### Migration 1: KB Summary Field

**Purpose:** HyDE anchor for KB-wide queries. Without this, HyDE is skipped for KB-wide queries — the hardest retrieval task — causing ~15-25% recall loss.

```sql
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;
```

**Verification:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_knowledge_bases',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name);console.log('Has summary:',cols.includes('summary'));})();"
```

---

### Migration 2: Btree Index on `rag_embeddings.knowledge_base_id`

**Purpose:** KB-wide vector search currently does a full table scan on `knowledge_base_id`. This index is critical for performance.

```sql
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id
ON rag_embeddings (knowledge_base_id);
```

---

### Migration 3: Composite Index for Tier-Filtered KB Search

**Purpose:** KB-wide queries filter by both `knowledge_base_id` and `tier`. Composite index avoids double lookup.

```sql
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier
ON rag_embeddings (knowledge_base_id, tier);
```

---

### Migration 4: Query Scope Tracking

**Purpose:** Track whether a query was document-level or KB-level. Enables scope-aware conversation history filtering and analytics.

```sql
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT
  DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));
```

---

### Migration 5: Denormalize `knowledge_base_id` onto Facts and Sections + Backfill

**Purpose:** BM25 search (`search_rag_text`) currently uses a subquery join to filter by KB. Denormalizing avoids this join. Also backfills `NULL` `knowledge_base_id` on embeddings created by the single-embed function.

```sql
-- Add columns to facts and sections
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;
ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

-- Backfill facts
UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL;

-- Backfill sections
UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL;

-- Backfill embeddings (single-embed function did not set knowledge_base_id)
UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;
```

**Verification:**
```sql
SELECT 'rag_facts' AS tbl, COUNT(*) FROM rag_facts WHERE knowledge_base_id IS NULL
UNION ALL
SELECT 'rag_sections', COUNT(*) FROM rag_sections WHERE knowledge_base_id IS NULL
UNION ALL
SELECT 'rag_embeddings', COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL;
-- Expected: 0 for all three after backfill
```

---

### ⚠️ NOTE: No Migration for `rag_citations`

**IMPORTANT:** Citations are stored as **JSONB on `rag_queries.citations`**, NOT in a separate `rag_citations` table. Document provenance (`documentId`, `documentName`) is added to the `RAGCitation` TypeScript interface (FR-7.1) and automatically serialized into the JSONB column — no database migration needed for citation enrichment.

---

### Migration Verification: Confirm RPCs Exist

The following RPCs must exist (created during ingestion upgrade). Verify they are present:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('match_rag_embeddings_kb', 'search_rag_text')
ORDER BY routine_name;\`,transport:'pg'});
console.log('RPCs found:', JSON.stringify(r, null, 2));})();"
```

**Expected:** Both `match_rag_embeddings_kb` and `search_rag_text` appear. If either is missing, re-create from `013-rag-multi-ingestion-upgrade_v1.md` Section 7.2.

---

## 5. FEATURE REQUIREMENTS — CORE PIPELINE

---

### FR-1.1: Remove Guard Clause — Accept `knowledgeBaseId` as Alternative to `documentId`

**Type:** Service Logic  
**Priority:** Tier 1 — CRITICAL (blocks all KB-wide functionality)  
**Estimated Size:** Small (<10 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Line 693 in `queryRAG()` function

**Current Code (line 693):**
```typescript
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

**Why this is safe:** The downstream infrastructure already supports KB-wide search:
- `searchSimilarEmbeddings()` (embedding-service L131) calls `match_rag_embeddings_kb` with `filter_knowledge_base_id`
- `searchTextContent()` (embedding-service L175) calls `search_rag_text` with `filter_knowledge_base_id`
- `assembleContext()` (L222) checks `isMultiDoc = docIds.size > 1` and branches
- `deduplicateResults()` (L371) handles cross-document duplicates
- `balanceMultiDocCoverage()` (L415) caps single-doc at 60%

**Dependencies:** None — this is the root blocker

**Validation Criteria:**
- `queryRAG({ queryText: 'test', knowledgeBaseId: '<valid-kb-id>', userId: '<user>' })` without `documentId` does NOT throw
- Response includes results from multiple documents in the KB
- `queryRAG({ queryText: 'test', userId: '<user>' })` without BOTH identifiers still throws

---

### FR-1.2: Determine Query Scope and Set `query_scope`

**Type:** Service Logic  
**Priority:** Tier 4 — LOW  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, immediately after the guard clause replacement (FR-1.1), before any `rag_queries` insert

**Implementation:**

Add scope determination logic:
```typescript
// Determine query scope
const queryScope: 'document' | 'knowledge_base' = params.documentId ? 'document' : 'knowledge_base';
```

Then update ALL THREE insert sites (LoRA-only at ~L727, no-context at ~L793, main at ~L880) to include:
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
- All 3 insert paths include `query_scope`

---

### FR-2.1: KB-Level HyDE Anchor

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH (HyDE improves recall by 15-25%)  
**Estimated Size:** Medium (20-50 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Lines 737-742 in `queryRAG()`, inside the "Step 1: Get document summary for HyDE" block

**Current Code (L737-742):**
```typescript
const { data: docRow } = await supabase
  .from('rag_documents')
  .select('document_summary')
  .eq('id', params.documentId)
  .single();
documentSummary = docRow?.document_summary || '';
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
When `documentId` is absent, fetch the KB-level summary. Fall back to the KB `description` if no summary has been generated yet. HyDE is skipped entirely if both are empty (existing behavior — HyDE generation handles empty summary gracefully).

**Dependencies:** Migration 1 (summary column on `rag_knowledge_bases`)

**Validation Criteria:**
- KB-wide query with a populated `rag_knowledge_bases.summary` uses that summary for HyDE
- KB-wide query with NULL summary but non-null description uses description as fallback
- KB-wide query with both NULL summary and description still works (HyDE uses raw query only)

---

### FR-3.1: Token-Budgeted Context Assembly

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH (prevents Claude context overflow on large KBs)  
**Estimated Size:** Large (80+ lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `assembleContext()` function (lines 214-290)

**Current Behavior:** Returns a plain `string`. Concatenates ALL retrieved sections and facts with no token limit. `RAG_CONFIG.retrieval.maxContextTokens = 100000` is defined but never enforced. The multi-doc branch (L222) captures `docId` but never uses it in headers — sections are grouped by document but the document ID never appears in the output.

**New Implementation:**

Replace the `assembleContext` function. The return type changes from `string` to `{ context: string; tokenCount: number; truncated: boolean }`.

```typescript
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

**Callers must be updated.** In `queryRAG()` (around line 835), the current call returns a string. Update to destructure:

```typescript
// Step 5: Assemble context
const { context: assembledContext, tokenCount, truncated } = assembleContext({
  sections: retrieved.sections,
  facts: balancedFacts,
  documentSummary,
  documentNames,  // from document name resolution (see FR-3.2)
});

if (truncated) {
  console.warn(`[RAG Retrieval] Context truncated to ${tokenCount} tokens for query "${params.queryText.slice(0, 50)}..."`);
}
```

**Dependencies:** None

**Validation Criteria:**
- Context string never exceeds `maxContextTokens × 4` characters
- Multi-doc context shows `## From: [document name]` headers that identify each document
- When context is truncated, `truncated` is `true` and a warning is logged
- Sections are prioritized over facts (70% vs 25% budget)
- Facts include provenance annotations (`policyId`, `subsection`, `factCategory`)
- Truncation happens at sentence boundaries, not mid-word

---

### FR-3.2: Document Name Resolution for Multi-Doc Context

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, before the `assembleContext()` call (around line 830)

**Implementation:**

Add document name lookup for KB-wide queries:

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

Pass `documentNames` to `assembleContext()` and to `enrichCitationsWithDocumentInfo()` (FR-8.2).

**Dependencies:** None

**Validation Criteria:**
- Multi-doc context headers show human-readable file names, not UUIDs
- Single-doc queries do not fetch document names (unnecessary)

---

### FR-4.1: Batch-Fetch Sections and Facts (N+1 Fix)

**Type:** Service Logic (Performance)  
**Priority:** Tier 2 — HIGH (reduces ~50 queries → 2 queries)  
**Estimated Size:** Large (80+ lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `retrieveContext()` function (lines 68-208)

**Current Behavior:** For each embedding match, a separate `.select('*').eq('id', sourceId).single()` query fetches the full section/fact row. With 2 search texts (query + HyDE) × 2 tiers + hybrid text search = up to **~50+ individual DB queries** per user question.

**New Implementation:**

Replace the entire `retrieveContext()` function with a two-phase approach:

**Phase 1:** Collect all source IDs from vector + BM25 search results with their best similarity scores.

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

**Dependencies:** FR-7.3 (config additions — `kbWideSimilarityThreshold`)

**Validation Criteria:**
- Same retrieval results as before (sections and facts match)
- Only 2 DB queries for section/fact fetches (verify via console logs or query count)
- KB-wide queries use `kbWideSimilarityThreshold` (0.3) instead of `similarityThreshold` (0.4)

---

### FR-4.2: Filter Non-Ready Documents from KB-Wide Query Results

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH (prevents partially-ingested data in results)  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `retrieveContext()` (from FR-4.1), after the batch fetch, before returning

**Implementation:**

After batch-fetching sections and facts, filter out any that belong to non-ready documents:

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

  // Replace arrays (use splice + push since arrays are declared with const)
  sections.length = 0;
  sections.push(...filteredSections);
  facts.length = 0;
  facts.push(...filteredFacts);
}
```

**Dependencies:** FR-4.1

**Validation Criteria:**
- KB-wide query results contain NO sections/facts from documents with `status !== 'ready'`
- Single-document queries are unaffected (filter only runs when `!params.documentId`)

---

### FR-5.1: Fix `generateAndStoreEmbedding()` to Set `knowledge_base_id`

**Type:** Service Logic  
**Priority:** Tier 1 — CRITICAL (single-embed embeddings are invisible to KB-wide search)  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-embedding-service.ts`  
**Location:** `generateAndStoreEmbedding()` function (lines 28-65)

**Current Code — insert block (L46-56):**
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

**Note:** The batch function `generateAndStoreBatchEmbeddings()` (L67) already accepts and sets `knowledge_base_id` — the Inngest pipeline passes `doc.knowledgeBaseId` at L488 of `process-rag-document.ts`. This fix is only needed for the single-record function.

**Dependencies:** Migration 5 (backfill existing NULLs)

**Validation Criteria:**
- After fix, calling `generateAndStoreEmbedding()` produces embeddings with non-null `knowledge_base_id`
- Verify: `SELECT COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL` returns 0

---

### FR-5.2: Scope-Aware Conversation History

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, at the conversation context block (around line 753)

**Current Code (L753):**
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
- KB-level queries see previous KB-level queries for that KB
- Switching from doc to KB scope effectively starts a fresh conversation

---

### FR-5.3: Pass Conversation Context to Response Generation

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM (follow-up questions lose context without this)  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `generateResponse()` function (line 448) and its call site in `queryRAG()`

**Current `generateResponse()` signature (L448):**
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
}): Promise<{ responseText: string; citations: RAGCitation[] }>
```

**New signature:**
```typescript
async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
  conversationContext?: string;  // NEW
}): Promise<{ responseText: string; citations: RAGCitation[] }>
```

Inside `generateResponse()`, append conversation context to the assembled context:

```typescript
const contextSection = params.conversationContext
  ? `\n\nRecent conversation for context (use to understand follow-up references):\n${params.conversationContext}`
  : '';

// Use assembledContext + contextSection when building the prompt
const fullContext = params.assembledContext + contextSection;
```

Update the call site in `queryRAG()`:

```typescript
const claudeResult = await generateResponse({
  queryText: params.queryText,
  assembledContext,
  mode,
  conversationContext,  // NEW: pass the conversation context fetched at L753
});
```

**Dependencies:** None

**Validation Criteria:**
- Follow-up questions like "What about the exceptions to that policy?" produce coherent answers that reference the previous conversation
- The conversation context appears in the assembled context string sent to Claude

---

## 6. FEATURE REQUIREMENTS — QUALITY & PERFORMANCE

---

### FR-6.1: Apply Deduplication to Sections (Not Just Facts)

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Small (<10 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after `retrieveContext()` returns, around line 835

**Current Behavior:** `deduplicateResults()` (L371) is only called on facts (L835). Sections are never deduplicated, meaning KB-wide queries can return near-duplicate sections from overlapping document content.

**Implementation:**

Add deduplication call for sections alongside the existing facts deduplication:

```typescript
// Deduplicate both sections and facts
const dedupedSections = deduplicateResults(retrieved.sections);
const dedupedFacts = deduplicateResults(retrieved.facts);
```

**Note:** `deduplicateResults()` is a generic function (`<T extends { content: string; similarity: number }>`) that works on both types. For sections, the relevant text field is `originalText` — the function will need the `content` field mapped. Either:
- (a) Add a `content` getter/property to sections before passing, OR
- (b) Update `deduplicateResults` to accept a configurable text accessor: `textFn?: (item: T) => string`

Recommended approach (b):

```typescript
function deduplicateResults<T extends { similarity: number }>(
  results: T[],
  textFn: (item: T) => string = (item) => (item as any).content || ''
): T[] {
  // ... existing Jaccard dedup logic, using textFn(item) instead of item.content
}

// Call sites:
const dedupedSections = deduplicateResults(retrieved.sections, (s) => s.originalText);
const dedupedFacts = deduplicateResults(retrieved.facts, (f) => f.content);
```

**Dependencies:** None

**Validation Criteria:**
- Near-duplicate sections (>90% Jaccard overlap) are removed
- Higher-scored duplicate is kept

---

### FR-6.2: Apply Balance and Reranking to Sections (Not Just Facts)

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Medium (20-40 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after deduplication

**Current Behavior:**
- `balanceMultiDocCoverage()` (L415) is only applied to facts (L841), not sections
- `rerankWithClaude()` (L298) is only applied to facts (L824), not sections
- This means sections can come entirely from a single document in KB-wide queries

**Implementation:**

Apply balancing and reranking to both sections and facts:

```typescript
// Apply to sections
const balancedSections = !params.documentId
  ? balanceMultiDocCoverage(dedupedSections)
  : dedupedSections;

// Apply to facts
const balancedFacts = !params.documentId
  ? balanceMultiDocCoverage(dedupedFacts)
  : dedupedFacts;

// Rerank sections (only if >3 results)
const finalSections = balancedSections.length > 3
  ? await rerankSections(balancedSections, params.queryText)
  : balancedSections;

// Rerank facts (existing)
const finalFacts = balancedFacts.length > 3
  ? await rerankWithClaude({
      queryText: params.queryText,
      candidates: balancedFacts.map(f => ({
        id: f.id,
        content: f.content,
        similarity: f.similarity,
        documentName: documentNames.get(f.documentId) || undefined,
      })),
      topK: Math.min(balancedFacts.length, 15),
    }).then(reranked => /* apply reranked scores to balancedFacts */)
  : balancedFacts;
```

For section reranking, add a wrapper that maps sections to the reranker format:

```typescript
async function rerankSections(
  sections: Array<RAGSection & { similarity: number }>,
  queryText: string
): Promise<Array<RAGSection & { similarity: number }>> {
  const reranked = await rerankWithClaude({
    queryText,
    candidates: sections.map(s => ({
      id: s.id,
      content: s.originalText.slice(0, 500),  // Truncate for reranker
      similarity: s.similarity,
    })),
    topK: Math.min(sections.length, 10),
  });

  // Apply reranked scores
  const scoreMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
  return sections
    .map(s => ({ ...s, similarity: scoreMap.get(s.id) ?? s.similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}
```

**Dependencies:** FR-6.1 (deduplication on sections)

**Validation Criteria:**
- KB-wide queries balance sections across documents (60% max per doc)
- Sections are reranked by Claude alongside facts
- Single-document queries skip balancing (no-op when 1 document)

---

### FR-6.3: Soft-Balance Multi-Doc Coverage with Fallback

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<15 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `balanceMultiDocCoverage()` function (lines 415-439)

**Implementation:**

After balancing, check if too many results were dropped. If >30% were lost, fall back to original:

```typescript
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = RAG_CONFIG.retrieval.maxSingleDocRatio  // Was hardcoded 0.6
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

  // Soft fallback: if balancing dropped >30% of results, use original
  if (balanced.length < results.length * 0.7) {
    console.warn(`[RAG Retrieval] Balance dropped ${results.length - balanced.length}/${results.length} results — falling back to top-N by similarity`);
    return results;
  }

  return balanced;
}
```

**Dependencies:** FR-7.3 (config `maxSingleDocRatio`)

**Validation Criteria:**
- When balancing drops ≤30% of results, balanced results are returned
- When balancing drops >30%, original (unbalanced) results returned with warning log
- Uses configurable `maxSingleDocRatio` from config instead of hardcoded `0.6`

---

### FR-6.4: Reranker Document Provenance for KB-Wide Queries

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<20 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** `rerankWithClaude()` function (lines 298-370), candidate list building (~line 335)

**Current candidate format (L335):**
```typescript
const candidateList = params.candidates
  .map((c, i) => `[${i}] ${c.content.slice(0, 500)}`)
  .join('\n');
```

**New:** Add optional `documentName` to the reranker params and include it in candidate text:

```typescript
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number; documentName?: string }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
```

Update the candidate list builder:
```typescript
const candidateList = params.candidates
  .map((c, i) => {
    const docPrefix = c.documentName ? `[Doc: ${c.documentName}] ` : '';
    return `[${i}] ${docPrefix}${c.content.slice(0, 500)}`;
  })
  .join('\n');
```

**Dependencies:** FR-3.2 (document name map)

**Validation Criteria:**
- KB-wide reranker candidates include `[Doc: ...]` prefix
- Single-document reranker candidates have no prefix

---

## 7. FEATURE REQUIREMENTS — TYPES, CONFIG & MAPPERS

---

### FR-7.1: Type Updates for Multi-Document Support

**Type:** TypeScript Types  
**Priority:** Tier 1 — CRITICAL (blocks all type-dependent FRs)  
**Estimated Size:** Medium (~30 lines across interfaces)

**File:** `src/types/rag.ts`

**Change 1: `RAGCitation` interface (lines 207-212)**

Current:
```typescript
export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
}
```

New:
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

**Change 2: `RAGKnowledgeBase` interface (lines 83-92)**

Add `summary` field:
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

**Change 3: `RAGKnowledgeBaseRow` interface (lines 516-525)**

Add `summary` field:
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

**Change 4: `RAGQuery` interface (lines 185-205)**

Add `queryScope` field:
```typescript
export interface RAGQuery {
  // ...existing 18 fields...
  queryScope: 'document' | 'knowledge_base';  // NEW
}
```

**Change 5: `RAGQueryRow` interface (lines 614-633)**

Add `query_scope` field:
```typescript
export interface RAGQueryRow {
  // ...existing 18 fields...
  query_scope: string | null;  // NEW
}
```

**Dependencies:** None

**Validation Criteria:**
- TypeScript compilation succeeds with no errors after all type changes
- All 5 interfaces updated

---

### FR-7.2: Mapper Updates for New Fields

**Type:** DB Mappers  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Small (<15 lines)

**File:** `src/lib/rag/services/rag-db-mappers.ts`

**Change 1: `mapRowToKnowledgeBase()` (lines 33-43)**

Add `summary` mapping:
```typescript
export function mapRowToKnowledgeBase(row: RAGKnowledgeBaseRow): RAGKnowledgeBase {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    summary: row.summary || null,   // NEW
    status: row.status as RAGKnowledgeBaseStatus,
    documentCount: row.document_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Change 2: `mapRowToQuery()` (lines 147-167)**

Add `queryScope` mapping:
```typescript
// Inside mapRowToQuery(), add:
queryScope: (row.query_scope as 'document' | 'knowledge_base') || 'document',  // NEW
```

**Dependencies:** FR-7.1 (type changes)

**Validation Criteria:**
- `mapRowToKnowledgeBase()` maps `summary` correctly
- `mapRowToQuery()` maps `query_scope` correctly, defaulting to `'document'` for legacy rows

---

### FR-7.3: Config Additions

**Type:** Config  
**Priority:** Tier 2 — HIGH (used by FR-4.1 and FR-6.3)  
**Estimated Size:** Small (<10 lines)

**File:** `src/lib/rag/config.ts`  
**Location:** Inside the `retrieval` block (lines 60-66)

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
  kbWideSimilarityThreshold: 0.3,  // NEW: lower threshold for KB-wide queries (more recall needed)
  maxSingleDocRatio: 0.6,          // NEW: configurable cap for balanceMultiDocCoverage
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
},
```

**Rationale:** KB-wide queries search a larger corpus where the best matches may have lower absolute similarity scores. A lower threshold (0.3 vs 0.4) improves recall without overwhelming the reranker.

**Dependencies:** None

**Validation Criteria:**
- `RAG_CONFIG.retrieval.kbWideSimilarityThreshold` equals `0.3`
- `RAG_CONFIG.retrieval.maxSingleDocRatio` equals `0.6`
- Both values are used by FR-4.1 and FR-6.3 respectively

---

## 8. FEATURE REQUIREMENTS — INGESTION PIPELINE

---

### FR-8.1: KB Summary Auto-Generation on Document Finalization

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Medium (20-40 lines)

**File:** `src/inngest/functions/process-rag-document.ts`  
**Location:** Inside the `finalize` step (Step 12, around line 528), after the document status update

**Current Behavior:** The finalize step updates the document status to `'ready'` (or `'awaiting_questions'`) and stores metrics. Nothing happens after. No KB-level summary is generated.

**Implementation:**

Add KB summary regeneration after document status update:

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
    .update({ summary: kbSummary.slice(0, 10000) })  // Cap at ~2500 tokens
    .eq('id', doc.knowledgeBaseId);

  console.log(`[Inngest] KB summary updated (${readyDocs.length} docs, ${kbSummary.length} chars)`);
}
```

**Dependencies:** Migration 1 (summary column)

**Validation Criteria:**
- After processing a second document in a KB, `rag_knowledge_bases.summary` is non-null
- Summary contains excerpts from all ready documents, prefixed with file names
- Summary is capped at 10,000 characters
- Summary is regenerated each time a new document completes (includes all currently ready docs)

---

### FR-8.2: Set `knowledge_base_id` on Sections and Facts During Ingestion

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM (performance optimization for BM25)  
**Estimated Size:** Small (~30 lines across 2 files)

**File 1:** `src/lib/rag/services/rag-ingestion-service.ts`

**Change 1: `storeSectionsFromStructure()` (L668)**

Add `knowledgeBaseId` parameter:
```typescript
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult,
  knowledgeBaseId?: string  // NEW parameter
): Promise<RAGSection[]> {
```

Add to the section insert record (inside the `.map()` at L680-698):
```typescript
return {
  // ...existing fields...
  knowledge_base_id: knowledgeBaseId || null,  // NEW field
};
```

**Change 2: `storeExtractedFacts()` (L911)**

Add `knowledgeBaseId` parameter:
```typescript
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[],
  knowledgeBaseId?: string  // NEW parameter
): Promise<RAGFact[]> {
```

Add to the fact insert record (inside the `.map()` at L930-942):
```typescript
return {
  // ...existing fields...
  knowledge_base_id: knowledgeBaseId || null,  // NEW field
};
```

**File 2:** `src/inngest/functions/process-rag-document.ts`

Update all call sites to pass `doc.knowledgeBaseId`:

| Call Site | Line | Current | New |
|-----------|------|---------|-----|
| `storeSectionsFromStructure()` | L103 | 4 args | Add 5th: `doc.knowledgeBaseId` |
| `storeExtractedFacts()` — Pass 2 | L123 | 4 args | Add 5th: `doc.knowledgeBaseId` |
| `storeExtractedFacts()` — Pass 3 | L204 | 4 args | Add 5th: `doc.knowledgeBaseId` |
| `storeExtractedFacts()` — Pass 4 | L236 | 4 args | Add 5th: `doc.knowledgeBaseId` |
| `storeExtractedFacts()` — Pass 5 | L268 | 4 args | Add 5th: `doc.knowledgeBaseId` |
| `storeExtractedFacts()` — Pass 6 | L307 | 4 args | Add 5th: `doc.knowledgeBaseId` |

Example (store-sections step, L103):
```typescript
// Current:
const stored = await storeSectionsFromStructure(
  documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult
);

// New:
const stored = await storeSectionsFromStructure(
  documentId, doc.userId, doc.originalText, structure as StructureAnalysisResult, doc.knowledgeBaseId
);
```

**Dependencies:** Migration 5 (columns on facts/sections)

**Validation Criteria:**
- Newly ingested facts and sections have `knowledge_base_id` set at insert time
- Existing backfilled data also has `knowledge_base_id` set (via Migration 5)
- Old callers that don't pass the new param still work (param is optional)

---

### FR-8.3: Enrich Citations with Document Provenance

**Type:** Service Logic  
**Priority:** Tier 2 — HIGH (users can't tell which document a citation comes from)  
**Estimated Size:** Medium (30-40 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after response generation, before storing in `rag_queries`

**Implementation:**

Add a helper function to enrich citations with document provenance:

```typescript
function enrichCitationsWithDocumentInfo(
  citations: RAGCitation[],
  sections: Array<RAGSection & { similarity: number }>,
  documentNames: Map<string, string>
): RAGCitation[] {
  if (citations.length === 0) return citations;

  // Build section ID → document info map from retrieved sections
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

Call this after response generation in `queryRAG()`:

```typescript
// After generateResponse() or generateLoRAResponse():
const enrichedCitations = enrichCitationsWithDocumentInfo(
  claudeResult.citations,
  retrieved.sections,
  documentNames
);
```

Use `enrichedCitations` in the `rag_queries` insert instead of the raw citations.

**Note:** Because citations are stored as JSONB on `rag_queries.citations`, the new `documentId` and `documentName` fields are automatically persisted — no DB migration needed.

**Dependencies:** FR-7.1 (type changes), FR-3.2 (document names map)

**Validation Criteria:**
- KB-wide query citations include `documentId` and `documentName` for sections that were retrieved
- Single-document query citations also include document info (harmless, adds consistency)
- JSONB in `rag_queries.citations` includes the new fields

---

### FR-8.4: Multi-Doc Instruction in Response Generation Prompt

**Type:** Service Logic  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<10 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `generateResponse()` function (line 448), in the system prompt construction

**Implementation:**

Detect multi-doc from the assembled context and add citation instruction:

```typescript
const isMultiDoc = params.assembledContext.includes('## From:');
const multiDocInstruction = isMultiDoc
  ? '\n6. When citing information, mention which document it comes from using the document name shown in the "From:" headers.'
  : '';

// Append to existing system prompt
const systemPrompt = `You are a helpful knowledge assistant...${multiDocInstruction}`;
```

**Dependencies:** FR-3.1 (assembleContext includes `## From:` headers)

**Validation Criteria:**
- Multi-doc responses reference document names when citing
- Single-doc responses have no multi-doc citation instructions (unchanged behavior)

---

## 9. FEATURE REQUIREMENTS — UI

---

### FR-9.1: "Chat with All Documents" Button on KB Dashboard

**Type:** UI  
**Priority:** Tier 3 — MEDIUM (UX entry point)  
**Estimated Size:** Small (~20 lines)

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx` (95 lines)  
**Location:** Component interface (L11-14) and inside the KB card render (around L73)

**Current props interface:**
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  selectedId?: string;
}
```

**New props interface:**
```typescript
interface KnowledgeBaseDashboardProps {
  onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void;
  onChatWithKnowledgeBase?: (kb: RAGKnowledgeBase) => void;  // NEW
  selectedId?: string;
}
```

Add button inside each KB card's content, after the document count display:

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

Add `MessageCircle` to the Lucide import at the top of the file.

**Dependencies:** None

**Validation Criteria:**
- KBs with 2+ documents show the "Chat with All Documents" button
- KBs with 0-1 documents do NOT show the button
- Clicking the button fires `onChatWithKnowledgeBase` with the KB object

---

### FR-9.2: KB-Wide Scope Indicator in RAGChat

**Type:** UI  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<20 lines)

**File:** `src/components/rag/RAGChat.tsx` (233 lines)  
**Location:** CardTitle element (lines 112-114)

**Current Code (L112-114):**
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

Add `Database, FileText` to the Lucide import.

**Dependencies:** None

**Validation Criteria:**
- KB-wide chat shows "Searching across all documents in knowledge base"
- Document-level chat shows "Searching: [document name]"

---

### FR-9.3: "Chat with All Documents" Link in DocumentList

**Type:** UI  
**Priority:** Tier 3 — MEDIUM  
**Estimated Size:** Small (<25 lines)

**File:** `src/components/rag/DocumentList.tsx` (105 lines)  
**Location:** Props interface (L11-15) and before the document map loop (around L66)

**Current props interface:**
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  selectedId?: string;
}
```

**New props interface:**
```typescript
interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  onChatWithAll?: () => void;  // NEW
  selectedId?: string;
}
```

Add before the `documents.map()` call:

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

Add `MessageCircle` to the Lucide import.

**Dependencies:** None

**Validation Criteria:**
- "Chat with all documents" card appears when 2+ documents have `status === 'ready'`
- Does NOT appear with 0-1 ready documents
- Clicking triggers `onChatWithAll` callback

---

### FR-9.4: Source Citation Document Provenance Display

**Type:** UI  
**Priority:** Tier 2 — HIGH  
**Estimated Size:** Small (<10 lines)

**File:** `src/components/rag/SourceCitation.tsx` (46 lines)

**Implementation:**

Update the citation display to show source document name when available. After the existing `sectionTitle` display (around L32), add:

```tsx
{citation.documentName && (
  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
    📄 {citation.documentName}
  </span>
)}
```

**Dependencies:** FR-7.1 (RAGCitation type), FR-8.3 (citation enrichment)

**Validation Criteria:**
- Multi-doc citations show the document name badge
- Single-doc citations also show document name (consistent UX)
- Citations without `documentName` render as before (backwards compatible)

---

## 10. FEATURE REQUIREMENTS — OBSERVABILITY

---

### FR-10.1: Hybrid Search Disjoint-Ratio Logging

**Type:** Service Logic (Observability)  
**Priority:** Tier 4 — LOW  
**Estimated Size:** Small (<15 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `retrieveContext()` (from FR-4.1), after BM25 results are collected but BEFORE they're merged into the score maps

**Implementation:**

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

**Dependencies:** FR-4.1

**Validation Criteria:**
- Log line appears for every retrieval call with BM25 results
- Metrics are plausible (overlap ≤ min(vector, bm25))

---

## 11. PHASE 2 — QUERY DECOMPOSITION

> **Implement Phase 2 ONLY after Phase 1 (Sections 5-10) is complete and tested.** Phase 1 enables basic KB-wide retrieval. Phase 2 adds intelligent query routing for complex multi-hop questions.

---

### FR-11.1: Query Classifier

**Type:** Service Logic  
**Priority:** Phase 2  
**Estimated Size:** Medium (40 lines)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` (new function)

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
    return { type: 'simple' };
  }
}
```

---

### FR-11.2: Integrate Classification into queryRAG

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Inside `queryRAG()`, after initial setup and before HyDE generation

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

console.log(`[RAG Retrieval] Query classification: ${classification.type}`);
```

---

### FR-11.3: Handle Multi-Hop Queries

For `multi-hop` and `comparative` queries, run sub-queries in parallel, then synthesize:

```typescript
if (classification.type !== 'simple' && classification.subQueries?.length) {
  // Run sub-queries in parallel
  const subResults = await Promise.all(
    classification.subQueries.map(async (subQuery) => {
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
  const dedupedSections = deduplicateResults(allSections, s => s.originalText);
  const dedupedFacts = deduplicateResults(allFacts, f => f.content);
  const balancedSections = balanceMultiDocCoverage(dedupedSections);
  const balancedFacts = balanceMultiDocCoverage(dedupedFacts);

  // Assemble merged context with sub-query structure
  const multiHopContext = assembleMultiHopContext({
    originalQuery: params.queryText,
    subQueries: classification.subQueries,
    sections: balancedSections,
    facts: balancedFacts,
    documentNames,
  });

  // Continue with standard response generation using multiHopContext
  // ...
}
```

---

### FR-11.4: Multi-Hop Context Assembly Function

```typescript
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

## 12. PHASE 3 — GRAPHRAG MICROSERVICE (OPTIONAL)

> **Implement ONLY if Phase 1 + 2 prove insufficient for relationship-heavy queries** like "Which policies in Document A conflict with regulations in Document B?" For simpler cross-document synthesis, the existing infrastructure with query decomposition is sufficient.

### Decision Point

After implementing Phases 1-2, test with real multi-document queries. If users encounter relationship-heavy queries that the simpler approach can't handle, proceed with GraphRAG.

### Recommended Library: LightRAG

**Why LightRAG over Microsoft GraphRAG:**
- 60% less setup complexity
- No expensive community detection (saves $5-20/document in LLM calls)
- MIT licensed
- Supports incremental graph updates (new documents add to existing graph)
- API is simple: `insert(text)` and `query(question)`

### Microservice Architecture

```
┌──────────────────────────────────┐
│  Next.js API Route               │
│  /api/rag/query                  │
│                                  │
│  Calls GraphRAG microservice     │
│  when classification = 'multi-   │
│  hop' and GRAPH_RAG_SERVICE_URL  │
│  is configured                   │
└──────────┬───────────────────────┘
           │ HTTP POST
           ▼
┌──────────────────────────────────┐
│  Python Microservice (FastAPI)   │
│  Hosted on: RunPod Serverless    │
│  OR: Railway / Render / Fly.io   │
│                                  │
│  Endpoints:                      │
│  POST /index   - Index document  │
│  POST /query   - Graph query     │
│  GET  /health  - Health check    │
│                                  │
│  Uses: LightRAG + nano-vectordb  │
│  LLM:  Claude Haiku (via API)    │
└──────────────────────────────────┘
```

### Python Microservice Implementation

```python
# graph_rag_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from lightrag import LightRAG, QueryParam
from lightrag.llm import anthropic_complete
import os

app = FastAPI(title="BrightRun GraphRAG Service")

rag = LightRAG(
    working_dir="./graph_data",
    llm_model_func=anthropic_complete,
    llm_model_name="claude-haiku-4-5-20251001",
    llm_model_kwargs={"api_key": os.environ["ANTHROPIC_API_KEY"]},
)

class IndexRequest(BaseModel):
    knowledge_base_id: str
    document_id: str
    text: str

class QueryRequest(BaseModel):
    knowledge_base_id: str
    query: str
    mode: str = "hybrid"  # naive | local | global | hybrid

@app.post("/index")
async def index_document(req: IndexRequest):
    try:
        rag.insert(req.text)
        return {"success": True, "message": f"Indexed document {req.document_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_graph(req: QueryRequest):
    try:
        result = rag.query(req.query, param=QueryParam(mode=req.mode))
        return {"success": True, "answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### Integration with Existing Pipeline

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

```typescript
async function queryGraphRAG(params: {
  knowledgeBaseId: string;
  queryText: string;
}): Promise<string | null> {
  const graphRAGUrl = process.env.GRAPH_RAG_SERVICE_URL;
  if (!graphRAGUrl) return null;

  try {
    const response = await fetch(`${graphRAGUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knowledge_base_id: params.knowledgeBaseId,
        query: params.queryText,
        mode: 'hybrid',
      }),
      signal: AbortSignal.timeout(10000),  // 10 second timeout
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.answer || null;
  } catch {
    console.warn('[RAG Retrieval] GraphRAG service unavailable, falling back to standard retrieval');
    return null;
  }
}
```

### Indexing Integration (Inngest)

**File:** `src/inngest/functions/process-rag-document.ts`

After the final embedding step, optionally index in GraphRAG:

```typescript
// OPTIONAL: Index in GraphRAG service (only if configured)
const graphRAGUrl = process.env.GRAPH_RAG_SERVICE_URL;
if (graphRAGUrl) {
  await step.run('index-graph-rag', async () => {
    try {
      await fetch(`${graphRAGUrl}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_id: doc.knowledgeBaseId,
          document_id: documentId,
          text: doc.originalText,
        }),
      });
      console.log(`[Inngest] GraphRAG indexed document ${documentId}`);
    } catch (err) {
      console.warn(`[Inngest] GraphRAG indexing failed (non-blocking):`, err);
    }
  });
}
```

### Deployment Options

| Option | Platform | Cost | Complexity |
|--------|----------|------|-----------|
| **A** | RunPod Serverless | Pay-per-use | Medium (Docker + RunPod) |
| **B** | Railway.app | ~$5/mo | Low (Git push deploy) |
| **C** | Fly.io | Free tier | Low (CLI deploy) |

After deployment, set environment variable in Vercel:
```
GRAPH_RAG_SERVICE_URL=https://your-service-url.com
```

**Graceful degradation:** If `GRAPH_RAG_SERVICE_URL` is not set or service is unavailable, standard retrieval handles the query normally. GraphRAG is always opt-in.

---

## 13. HUMAN ACTION STEPS

All human-required actions consolidated. Copy-paste ready.

### Step H1: Execute Database Migrations

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
```

**Migration 1 — KB summary field:**
```bash
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 2 — Btree index on embeddings:**
```bash
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id ON rag_embeddings (knowledge_base_id);';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 3 — Composite index:**
```bash
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier ON rag_embeddings (knowledge_base_id, tier);';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 4 — Query scope column:**
```bash
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\"ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));\";const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 5 — Denormalize KB ID + backfills (run in low-traffic window):**
```bash
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL; UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL; UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success,r.summary);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success,x.summary);}})();"
```

### Step H2: Verify Migrations

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const kb=await saol.agentIntrospectSchema({table:'rag_knowledge_bases',includeColumns:true,transport:'pg'});
  const kbCols=kb.tables[0]?.columns.map(c=>c.name)||[];
  console.log('KB has summary:',kbCols.includes('summary'));

  const q=await saol.agentIntrospectSchema({table:'rag_queries',includeColumns:true,transport:'pg'});
  const qCols=q.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Queries has query_scope:',qCols.includes('query_scope'));

  const f=await saol.agentIntrospectSchema({table:'rag_facts',includeColumns:true,transport:'pg'});
  const fCols=f.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Facts has knowledge_base_id:',fCols.includes('knowledge_base_id'));

  const s=await saol.agentIntrospectSchema({table:'rag_sections',includeColumns:true,transport:'pg'});
  const sCols=s.tables[0]?.columns.map(c=>c.name)||[];
  console.log('Sections has knowledge_base_id:',sCols.includes('knowledge_base_id'));

  const nullCheck=await saol.agentQuery({table:'rag_embeddings',select:'id',where:[{column:'knowledge_base_id',operator:'is',value:null}],limit:1});
  console.log('Null KB embeddings remaining:',nullCheck.data?.length||0);
})();
"
```

### Step H3: Verify RPCs Exist

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('match_rag_embeddings_kb','search_rag_text');\",transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

### Step H4: Upload Test Documents

1. Open the BrightRun app at `http://localhost:3000`
2. Navigate to **RAG Frontier** → **Knowledge Bases**
3. Select a Knowledge Base (or create one)
4. Upload 2+ documents (PDF, DOCX, TXT, or MD)
5. Wait for all documents to reach `ready` status

### Step H5: Vercel Redeployment

After all code changes are merged, trigger a Vercel redeployment. No new environment variables required for Phase 1 — all changes use existing config.

### Step H6: No New Inngest Functions

No new Inngest functions are created. The existing `process-rag-document` function is modified (FR-8.1) to regenerate the KB summary on document finalization. Inngest auto-discovers function changes on deployment.

---

## 14. TESTING & VALIDATION

### 14.1 Manual Smoke Test Sequence

After implementing Phase 1:

1. **Single-document query still works (regression):**
   - Select a specific document → Chat → Ask a question
   - Verify: Response only cites that document
   - Verify: Behavior identical to before

2. **KB-wide query works:**
   - Open a KB with 2+ ready documents
   - Click "Chat with All Documents" (FR-9.1 or FR-9.3)
   - Ask: "What are the key policies across all documents?"
   - Verify: Response includes citations from multiple documents
   - Verify: Each citation shows document name (FR-9.4)
   - Verify: Scope indicator shows "Searching across all documents" (FR-9.2)

3. **Empty KB query fails gracefully:**
   - Query against KB with no completed documents
   - Verify: Friendly "I could not find..." message appears

4. **Conversation context persists:**
   - In KB-wide chat, ask "What is the refund policy?"
   - Follow up with "What are the exceptions to that?"
   - Verify: Follow-up references previous answer's topic

5. **Deduplication works:**
   - Upload the same document twice
   - Query the KB
   - Verify: No duplicate facts/sections in response

6. **Balance reweighting works:**
   - Upload documents of varying sizes
   - Verify: Response cites multiple documents, not just the largest

### 14.2 SAOL Verification Scripts

**Verify multi-doc data exists:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async () => {
  const kbs = await saol.agentQuery({ table: 'rag_knowledge_bases', select: 'id, name', limit: 10 });
  console.log('Knowledge Bases:', kbs.data);
  for (const kb of kbs.data) {
    const docs = await saol.agentQuery({
      table: 'rag_documents',
      where: [{ column: 'knowledge_base_id', operator: 'eq', value: kb.id }],
      select: 'id, file_name, status'
    });
    console.log(\`  KB \${kb.name}: \${docs.data.length} documents\`);
    docs.data.forEach(d => console.log(\`    - \${d.file_name} (\${d.status})\`));
  }
})();"
```

**Test KB-wide query via API:**
```bash
# Replace YOUR_KB_ID with an actual KB ID from the script above
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "What are the key policies?", "knowledgeBaseId": "YOUR_KB_ID", "mode": "rag_only"}'
```

### 14.3 Automated Integration Test

**File:** `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (new file)

```typescript
import { queryRAG } from '../services/rag-retrieval-service';

describe('Multi-Document Retrieval', () => {
  const TEST_KB_ID = process.env.TEST_KB_ID;
  const TEST_DOC_ID = process.env.TEST_DOC_ID;

  it('should accept knowledgeBaseId without documentId', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      knowledgeBaseId: TEST_KB_ID,
      userId: 'test-user',
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.responseText).toBeTruthy();
  });

  it('should still work with documentId specified', async () => {
    const result = await queryRAG({
      queryText: 'What is the main topic?',
      documentId: TEST_DOC_ID,
      userId: 'test-user',
      mode: 'rag_only',
    });
    expect(result.success).toBe(true);
  });

  it('should fail without both documentId and knowledgeBaseId', async () => {
    await expect(queryRAG({
      queryText: 'Test',
      userId: 'test-user',
      mode: 'rag_only',
    })).rejects.toThrow('documentId or knowledgeBaseId is required');
  });

  it('should include citations with document source info for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'What are the policies?',
      knowledgeBaseId: TEST_KB_ID,
      userId: 'test-user',
      mode: 'rag_only',
    });
    if (result.data?.citations?.length) {
      const withSource = result.data.citations.filter(c => c.documentName);
      expect(withSource.length).toBeGreaterThan(0);
    }
  });

  it('should store query_scope = knowledge_base for KB-wide queries', async () => {
    const result = await queryRAG({
      queryText: 'Overview of all documents',
      knowledgeBaseId: TEST_KB_ID,
      userId: 'test-user',
      mode: 'rag_only',
    });
    expect(result.data?.queryScope).toBe('knowledge_base');
  });
});
```

---

## 15. EXCLUDED SCOPE

| Excluded Item | Reason |
|---------------|--------|
| **GraphRAG / LazyGraphRAG** | Phase 3 — only if Phase 1+2 prove insufficient |
| **ColPali visual processing** | Not needed — current file types (PDF, DOCX, TXT, MD) are text-based |
| **Agentic RAG (multi-step reasoning)** | Overkill for KB-wide search over well-formatted documents |
| **Cross-KB search** | Each KB is an isolated search domain |
| **New document format support (XLSX, PPTX, OCR)** | Not needed for current use case |
| **New npm dependencies** | Zero new packages — all capabilities built with existing stack |
| **New deployment targets** | All changes deploy to existing Vercel + Supabase infrastructure |
| **New API routes** | Existing `/api/rag/query` already accepts both `documentId` and `knowledgeBaseId` |
| **New Inngest functions** | Existing pipeline modified, not replaced |
| **Separate `rag_citations` table** | Citations remain stored as JSONB on `rag_queries.citations` — no separate table needed |
| **`rag_document_relationships` table** | Deferred to Phase 3 if GraphRAG needed. Cross-document entity tracking is not required for basic multi-doc retrieval. |
| **HNSW index creation** | Already exists as `idx_rag_embeddings_hnsw` |

---

## 16. RISK ASSESSMENT & MITIGATIONS

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **RPC functions missing** from DB | KB-wide search fails | Low | Step H3 verification; re-create from ingestion upgrade if missing |
| **Token overflow** with many documents | Truncated or failed Claude API calls | Medium | FR-3.1 enforces token budget with 70/25/5 allocation + sentence-boundary truncation |
| **N+1 query performance** without batch fetch | Slow response times (~2-5 seconds overhead) | High (current state) | FR-4.1 reduces ~50 queries → 2 queries |
| **Slow queries** with large KBs (10+ docs) | Poor user experience | Medium | Migrations 2-3 add btree/composite indexes; FR-4.1 batch fetch |
| **Guard clause removal breaks single-doc** | Existing functionality regresses | Very Low | New guard only relaxes when `knowledgeBaseId` is present; single-doc path unchanged |
| **Context mixing** between scopes | Confusing follow-up answers | Medium | FR-5.2 scopes conversation history; FR-1.2 tracks `query_scope` |
| **Backfill migration** on large embedding table | Table lock during update | Low-Medium | `WHERE knowledge_base_id IS NULL` limits scope; run in low-traffic window |
| **Inconsistent citations** across documents | Confusing UX | Low | FR-8.3 adds explicit document provenance to citations; FR-9.4 displays it |
| **Supabase 8GB limit** with many embeddings | DB storage cap | Medium (at scale) | 1536-dim embeddings are efficient; ~100 docs before concern; monitor via dashboard |

---

## 17. COST PROJECTIONS

### Per-Query Cost (Multi-Document — Phase 1)

| Component | Model | Est. Cost per Query |
|-----------|-------|-------------------|
| HyDE generation | Claude Haiku 4.5 | ~$0.002 |
| Claude reranking (sections) | Claude Haiku 4.5 | ~$0.002 |
| Claude reranking (facts) | Claude Haiku 4.5 | ~$0.002 |
| Response generation | Claude Haiku 4.5 | ~$0.005 |
| Self-RAG evaluation | Claude Haiku 4.5 | ~$0.002 |
| OpenAI embedding | text-embedding-3-small | ~$0.0001 |
| **Total per simple query** | | **~$0.013** |

### Per-Query Cost with Query Decomposition (Phase 2)

| Component | Cost per Sub-Query |
|-----------|-------------------|
| Query classification | ~$0.001 |
| Additional HyDE + search + rerank per sub-query | ~$0.005 |
| Synthesis of 2-4 sub-queries | ~$0.008 |
| **Total per multi-hop query (3 sub-queries)** | **~$0.035** |

### Per-Document Ingestion Cost (Unchanged)

| Pass | Model | Est. Cost |
|------|-------|-----------|
| Pass 1 (Structure) | Claude Sonnet 4.5 | ~$0.15 |
| Pass 2 (Policies) | Claude Sonnet 4.5 | ~$0.30 |
| Pass 3 (Tables) | Claude Sonnet 4.5 | ~$0.10 |
| Pass 4 (Glossary) | Claude Haiku 4.5 | ~$0.02 |
| Pass 5 (Narrative) | Claude Sonnet 4.5 | ~$0.20 |
| Pass 6 (Verification) | Claude Opus 4.6 | ~$0.60 |
| Embeddings | OpenAI text-embedding-3-small | ~$0.01 |
| **Total per document** | | **~$1.38** |

---

## 18. IMPLEMENTATION SEQUENCE

Execute in this order to minimize dependencies and enable incremental testing:

### Phase 1: MVP Multi-Document Retrieval

**Timeline:** 2-3 days  
**Outcome:** Users can query across all documents in a Knowledge Base with quality results and document provenance

| Step | FRs | Description | Est. Time |
|------|-----|-------------|-----------|
| 1 | Migrations 1-5 | Run all database migrations via SAOL | 30 min (human) |
| 2 | FR-7.1, FR-7.3 | Types + Config additions (prerequisite for everything) | 30 min |
| 3 | FR-1.1, FR-5.1 | Remove guard clause + fix single-embed KB ID | 30 min |
| 4 | FR-7.2 | Mapper updates (summary, query_scope) | 15 min |
| 5 | FR-4.1, FR-4.2 | Batch fetch + filter non-ready docs (N+1 fix) | 2 hours |
| 6 | FR-3.1, FR-3.2 | Token-budgeted context assembly + doc name resolution | 2 hours |
| 7 | FR-2.1 | KB-level HyDE anchor | 30 min |
| 8 | FR-6.1, FR-6.2, FR-6.3, FR-6.4 | Dedup/balance/rerank for sections + soft fallback | 2 hours |
| 9 | FR-5.2, FR-5.3 | Scope-aware conversation history + pass to response gen | 1 hour |
| 10 | FR-8.1, FR-8.2 | KB summary auto-gen + ingestion KB ID propagation | 1 hour |
| 11 | FR-8.3, FR-8.4 | Citation enrichment + multi-doc response prompt | 1 hour |
| 12 | FR-9.1, FR-9.2, FR-9.3, FR-9.4 | UI: KB chat button, scope indicator, document list, citation display | 2 hours |
| 13 | FR-1.2, FR-10.1 | Query scope tracking + hybrid search logging | 30 min |
| 14 | Testing | Manual smoke tests + automated integration tests | 2 hours |

### Phase 2: Query Decomposition (After Phase 1 verified)

**Timeline:** 1-2 days  
**Outcome:** Complex multi-hop and comparative queries decomposed into sub-queries

| Step | FRs | Description | Est. Time |
|------|-----|-------------|-----------|
| 15 | FR-11.1 | Query classifier function | 1 hour |
| 16 | FR-11.2 | Integrate classification into queryRAG | 1 hour |
| 17 | FR-11.3, FR-11.4 | Multi-hop query handling + context assembly | 3 hours |
| 18 | Testing | Test with comparative and multi-hop queries | 1 hour |

### Phase 3: GraphRAG (Optional — after Phase 2 if needed)

**Timeline:** 2-3 days  
**Outcome:** Graph-based retrieval for relationship-heavy queries

| Step | Description | Est. Time |
|------|-------------|-----------|
| 19 | Build + deploy Python microservice | 4-6 hours |
| 20 | Integration with retrieval pipeline | 2 hours |
| 21 | Indexing integration with Inngest pipeline | 1 hour |
| 22 | Testing with real multi-document queries | 2 hours |

---

## 19. APPENDIX: FILE REFERENCE

### Existing Files Modified (Phase 1)

| # | File | Lines | Changes |
|---|------|-------|---------|
| 1 | `src/lib/rag/services/rag-retrieval-service.ts` | 980 | FR-1.1, FR-1.2, FR-2.1, FR-3.1, FR-3.2, FR-4.1, FR-4.2, FR-5.2, FR-5.3, FR-6.1, FR-6.2, FR-6.3, FR-6.4, FR-8.3, FR-8.4, FR-10.1 |
| 2 | `src/lib/rag/services/rag-embedding-service.ts` | 257 | FR-5.1 |
| 3 | `src/lib/rag/services/rag-ingestion-service.ts` | 1050 | FR-8.2 |
| 4 | `src/lib/rag/services/rag-db-mappers.ts` | 189 | FR-7.2 |
| 5 | `src/types/rag.ts` | 641 | FR-7.1 |
| 6 | `src/lib/rag/config.ts` | 93 | FR-7.3 |
| 7 | `src/inngest/functions/process-rag-document.ts` | 586 | FR-8.1, FR-8.2 (call sites) |
| 8 | `src/components/rag/KnowledgeBaseDashboard.tsx` | 95 | FR-9.1 |
| 9 | `src/components/rag/RAGChat.tsx` | 233 | FR-9.2 |
| 10 | `src/components/rag/DocumentList.tsx` | 105 | FR-9.3 |
| 11 | `src/components/rag/SourceCitation.tsx` | 46 | FR-9.4 |

### New Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` | Integration tests for KB-wide queries |

### Unchanged Files (Confirmed No Modifications Needed)

| File | Reason |
|------|--------|
| `src/app/api/rag/query/route.ts` | Already validates `documentId OR knowledgeBaseId` (L26-30). No changes needed. |
| `src/hooks/useRAGChat.ts` | Already passes `documentId` and `knowledgeBaseId` to API (L33-40). No changes needed. |
| `src/lib/rag/providers/claude-llm-provider.ts` | All extraction methods unchanged. |
| `src/lib/rag/providers/llm-provider.ts` | Interface unchanged. |
| `src/lib/rag/providers/embedding-provider.ts` | Interface unchanged. |

### Summary

| Metric | Count |
|--------|-------|
| **Total FRs (Phase 1)** | 23 |
| **Total FRs (Phase 2)** | 4 |
| **Total Migrations** | 5 |
| **Files Modified** | 11 |
| **New Files** | 1 |
| **New Dependencies** | 0 |
| **New API Routes** | 0 |
| **New Inngest Functions** | 0 |
| **New Database Tables** | 0 |

---

**Document Owner:** Product Management & Control (PMC)  
**Built from:** V1 spec (architecture, GraphRAG, cost projections, foundation verification, query decomposition) merged into V2 spec (FR system, exact file/line references, dependency tracking, validation criteria)  
**Validated against:** Live codebase as of February 20, 2026  
**Corrections from validation:** Guard clause at L693 (not L668); citations are JSONB on `rag_queries` (not separate table); dedup/balance/rerank currently only applied to facts; `assembleContext()` multi-doc branch doesn't show doc names; conversation context not passed to `generateResponse()`  

**END OF SPECIFICATION**
