# Multi-Document Retrieval — Build Specification

**Version:** 1.0  
**Date:** January 2025  
**Source Documents:** 001-multi-doc-build_v1.md, 013-rag-multi-ingestion-upgrade_v1.md, 012-rag-ingestion-upgrade-and-integration_v2.md, 004-multi-doc-environment-overview_v1.md, 006-multi-doc-explained_v1.md, 012-input-prompt-multi-doc-environment_v1.md  
**Codebase Basis:** `src/lib/rag/`, `src/types/rag.ts`, `src/inngest/functions/process-rag-document.ts`, `src/app/api/rag/`, `src/components/rag/`, `src/hooks/`  
**Status:** READY TO BUILD

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Foundation Verification Report](#2-foundation-verification-report)
3. [Answers to Outstanding Questions](#3-answers-to-outstanding-questions)
4. [Architecture Overview](#4-architecture-overview)
5. [Implementation Sections](#5-implementation-sections)
   - [Section A: Remove documentId Guard Clause (Critical Blocker)](#section-a-remove-documentid-guard-clause-critical-blocker)
   - [Section B: Database Migrations for Multi-Doc Support](#section-b-database-migrations-for-multi-doc-support)
   - [Section C: UI Changes — KB-Wide Chat Mode](#section-c-ui-changes--kb-wide-chat-mode)
   - [Section D: Query Routing & Cross-Document Query Decomposition](#section-d-query-routing--cross-document-query-decomposition)
   - [Section E: Multi-Document Context Assembly Enhancements](#section-e-multi-document-context-assembly-enhancements)
   - [Section F: Source Attribution & Cross-Document Citations](#section-f-source-attribution--cross-document-citations)
   - [Section G: GraphRAG Python Microservice (Optional Enhancement)](#section-g-graphrag-python-microservice-optional-enhancement)
   - [Section H: Testing & Validation](#section-h-testing--validation)
6. [Human Action Steps](#6-human-action-steps)
7. [Risk Assessment & Mitigations](#7-risk-assessment--mitigations)
8. [Cost Projections](#8-cost-projections)
9. [Implementation Sequence](#9-implementation-sequence)

---

## 1. EXECUTIVE SUMMARY

### What We're Building

Multi-document retrieval enables users to ask questions that span multiple documents within a single Knowledge Base. Instead of querying one document at a time, users can chat with an entire knowledge base and receive answers that synthesize information from any and all documents it contains.

### Current State

The RAG Frontier module (E01-E10) is **fully built** with a 6-pass ingestion pipeline, multi-tier embeddings, HyDE, hybrid search, Claude reranking, Self-RAG evaluation, and multi-document retrieval infrastructure. The foundation for multi-document retrieval was implemented during the ingestion upgrade phase.

### The Gap

One guard clause in `rag-retrieval-service.ts` line ~668 **blocks** KB-wide queries. All downstream infrastructure (KB-wide search, multi-doc assembly, deduplication, balanced coverage) is already implemented and ready. Beyond removing that blocker, the remaining work is:

1. UI support for KB-wide chat mode
2. Cross-document query decomposition for complex multi-hop questions
3. Enhanced source attribution showing which document each answer segment comes from
4. (Optional) GraphRAG Python microservice for relationship-heavy queries

### Approach

**EXTENSION** of the existing RAG module — not a rewrite. The majority of code already exists. This specification adds the final layer to unlock multi-document retrieval.

---

## 2. FOUNDATION VERIFICATION REPORT

### Verdict: ✅ FOUNDATION IS BUILT (with one critical blocker)

Every component required for multi-document retrieval has been implemented in code. Below is the item-by-item verification:

| Component | File | Status | Evidence |
|-----------|------|--------|----------|
| **Type System** | `src/types/rag.ts` (641 lines) | ✅ Complete | `RAGDocumentType`, `RAGFactType` (14 types), `RAGFact` with provenance fields (`policyId`, `ruleId`, `parentFactId`, `subsection`, `factCategory`), `StructureAnalysisResult`, `PolicyExtractionResult`, `TableExtractionResult`, `GlossaryExtractionResult`, `NarrativeExtractionResult`, `VerificationResult` |
| **Config** | `src/lib/rag/config.ts` (~95 lines) | ✅ Complete | `ingestionModels` mapping 6 passes to Claude models, per-pass `maxTokens` budgets, retrieval thresholds |
| **LLM Provider Interface** | `src/lib/rag/providers/llm-provider.ts` (180 lines) | ✅ Complete | All 6 extraction method signatures: `analyzeDocumentStructure`, `extractPoliciesForSection`, `extractTableData`, `extractGlossaryAndRelationships`, `extractNarrativeFacts`, `verifyExtractionCompleteness` |
| **Claude LLM Provider** | `src/lib/rag/providers/claude-llm-provider.ts` (953 lines) | ✅ Complete | Full implementation of all 6 extraction methods with detailed prompts, `parseJsonResponse<T>()` with markdown fence handling, 20-min timeout |
| **Ingestion Service** | `src/lib/rag/services/rag-ingestion-service.ts` (1050 lines) | ✅ Complete | `storeSectionsFromStructure`, `storeExtractedFacts` (with provenance + fact_type validation), `linkFactRelationships`, `policyResultToFacts`, `tableResultToFacts`, `glossaryResultToFacts`, `findTableRegions`, `generateContentHash` |
| **Embedding Service** | `src/lib/rag/services/rag-embedding-service.ts` (300 lines) | ✅ Complete | `searchSimilarEmbeddings` uses `match_rag_embeddings_kb` RPC with `knowledgeBaseId` filter, `searchTextContent` uses `search_rag_text` RPC, `buildEnrichedEmbeddingText` prefixes `[Policy:]`, `[Section:]`, `[Category:]`, `[Qualifies:]`, `generateAndStoreBatchEmbeddings` accepts `knowledgeBaseId` |
| **Retrieval Service** | `src/lib/rag/services/rag-retrieval-service.ts` (980 lines) | ⚠️ Blocker | `retrieveContext` passes `knowledgeBaseId` to all search functions; `assembleContext` groups results by `documentId` for multi-doc formatting; `deduplicateResults` (Jaccard >0.9); `balanceMultiDocCoverage` (60% max per doc); `rerankWithClaude` (3 parsing strategies). **BLOCKED by guard clause at line ~668** |
| **6-Pass Pipeline** | `src/inngest/functions/process-rag-document.ts` (586 lines) | ✅ Complete | Pass 1→6 with per-section checkpointing, relationship linking, expert questions, contextual preambles, enriched embeddings with `knowledgeBaseId` |
| **API Routes** | `src/app/api/rag/query/route.ts` | ✅ Complete | Accepts both `documentId` and `knowledgeBaseId`, validates "at least one required" |
| **DB Mappers** | `src/lib/rag/services/rag-db-mappers.ts` (196 lines) | ✅ Complete | All mappers handle `contentHash`, `documentType`, provenance fields |
| **Document Parsing** | `src/lib/rag/services/rag-ingestion-service.ts` | ✅ Complete | `pdf-parse` for PDF, `mammoth` for DOCX, native for TXT and MD |

### The One Critical Blocker

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Line:** ~668  
**Code:**

```typescript
// Fail fast: documentId is required for all RAG modes to prevent cross-document contamination
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
}
```

**Impact:** This guard clause was added during single-document development to prevent accidental cross-document contamination. It now prevents KB-wide multi-document queries from reaching the fully-implemented downstream infrastructure.

**Fix:** Relax the guard to allow queries when `knowledgeBaseId` is provided (see Section A).

---

## 3. ANSWERS TO OUTSTANDING QUESTIONS

### Q1: Do we need more document parsing, or was it already implemented?

**Answer: Already implemented. No additional parsing needed.**

The ingestion service (`rag-ingestion-service.ts` function `extractDocumentText`) handles:
- **PDF** → `pdf-parse` library (extracts text from all pages)
- **DOCX** → `mammoth` library (converts to plain text)
- **TXT** → native `Buffer.toString('utf-8')`
- **MD** → native `Buffer.toString('utf-8')`

These are the file types currently accepted by the upload route (`src/app/api/rag/documents/[id]/upload/route.ts`). If James wants to support additional formats in the future (e.g., XLSX, PPTX, HTML), that would be a separate enhancement — but for the current multi-document build, **no action is needed**.

### Q2: Is there another solution beyond LazyGraphRAG? Are there paid or open-source services?

**Answer: Yes — multiple alternatives exist, and the existing infrastructure may be sufficient without any graph layer.**

| Option | Type | Complexity | Cost | Notes |
|--------|------|-----------|------|-------|
| **Enable existing infrastructure** | Code change | **Trivial** | $0 | Remove guard clause + UI update. The current hybrid search + reranking + dedup + multi-doc balancing already provides strong multi-document retrieval. **Recommended as Phase 1.** |
| **Claude-as-Router** | Code addition | Low | ~$0.02/query | Use Claude to decompose complex multi-hop questions into sub-queries, route each to the right document, then synthesize. Can be added to the existing retrieval pipeline. **Recommended as Phase 2.** |
| **LightRAG** | Python lib | Medium | Hosting cost | Lightweight graph-based RAG (MIT license). Builds a simple entity-relationship graph. Lighter than Microsoft GraphRAG. |
| **Microsoft GraphRAG** | Python lib | Medium-High | Hosting + LLM calls | Full graph construction with community detection. Expensive to build graphs (~$5-20 per large document). |
| **Vectara** | Paid SaaS | Low (API) | $0.05/1K queries | Managed RAG service with built-in cross-document retrieval, reranking, and citations. |
| **Cohere Rerank + RAG** | Paid API | Low | $1/1K searches | Cross-encoder reranking. Can replace Claude Haiku reranking for potentially better accuracy. |
| **Pinecone + Assistant** | Paid SaaS | Low (API) | $70+/mo | Managed vector DB with built-in RAG assistant mode. |

**Recommendation:** Start with enabling the existing infrastructure (Phase 1), add Claude-as-Router for query decomposition (Phase 2), and only add GraphRAG as a Python microservice (Phase 3) if users encounter relationship-heavy queries that the simpler approach can't handle. The existing codebase already has deduplication, balanced multi-doc coverage, and reranking — these are the core multi-document primitives.

### Q3: Should GraphRAG run as a Python microservice?

**Answer: Yes, if implemented.** GraphRAG libraries (Microsoft GraphRAG, LightRAG) are Python-native. Running them as a separate service keeps the Next.js codebase clean and allows independent scaling. Deployment on RunPod Serverless or a small dedicated container is the right approach. This is specified in Section G as an optional enhancement.

---

## 4. ARCHITECTURE OVERVIEW

### Current Architecture (Single-Document)

```
User asks question → Select ONE document → 
  HyDE → Vector Search (scoped to documentId) → BM25 Search (scoped to documentId) →
  Claude Reranking → Context Assembly → Response Generation → Self-RAG Eval →
  Store query + citations
```

### Target Architecture (Multi-Document)

```
User asks question → Select Knowledge Base (or specific document) →
  Query Analysis (simple vs multi-hop) →
  
  IF simple query:
    HyDE → KB-wide Vector Search → KB-wide BM25 Search →
    Deduplication → Balanced Coverage → Claude Reranking →
    Multi-Doc Context Assembly → Response Generation → Self-RAG Eval →
    Store query + multi-doc citations
  
  IF multi-hop query (Phase 2):
    Claude decomposes into sub-queries →
    Each sub-query → HyDE → KB-wide Search → Reranking →
    Sub-answers synthesized → Final Response → Self-RAG Eval →
    Store query + cross-doc citations
```

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐    │
│  │ RAGChat.tsx     │  │ DocumentList   │  │ KB Dashboard    │    │
│  │ (KB-wide mode)  │  │ (multi-upload) │  │ (doc overview)  │    │
│  └────────┬───────┘  └───────┬────────┘  └────────┬────────┘    │
│           │                  │                     │              │
│  ┌────────┴──────────────────┴─────────────────────┴──────────┐  │
│  │              useRAGChat / useRAGDocuments hooks              │  │
│  └─────────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   /api/rag/query         │
                    │   /api/rag/documents     │
                    └────────────┬─────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────┐
│                         Backend Services                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              rag-retrieval-service.ts                         │    │
│  │  queryRAG() → HyDE → retrieveContext() → assembleContext()   │    │
│  │            → rerankWithClaude() → deduplicateResults()        │    │
│  │            → balanceMultiDocCoverage() → generateResponse()   │    │
│  │            → selfEvaluate()                                   │    │
│  └──────┬──────────────────────┬───────────────────┬────────────┘    │
│         │                      │                   │                  │
│  ┌──────┴──────┐      ┌───────┴───────┐   ┌──────┴──────────┐      │
│  │ embedding-  │      │ claude-llm-   │   │ ingestion-      │      │
│  │ service.ts  │      │ provider.ts   │   │ service.ts      │      │
│  │ (KB-wide    │      │ (HyDE, rerank │   │ (6-pass         │      │
│  │  search)    │      │  response)    │   │  pipeline)      │      │
│  └──────┬──────┘      └───────┬───────┘   └──────┬──────────┘      │
│         │                     │                   │                  │
│  ┌──────┴─────────────────────┴───────────────────┴──────────┐      │
│  │              Supabase PostgreSQL + pgvector                 │      │
│  │  rag_knowledge_bases │ rag_documents │ rag_sections         │      │
│  │  rag_facts │ rag_embeddings │ rag_queries │ rag_citations   │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌─────────────────────────┐                                        │
│  │  Inngest (6-pass jobs)  │  ← Triggered per document upload       │
│  └─────────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. IMPLEMENTATION SECTIONS

Each section below is a self-contained unit of work. Sections A-C are required for MVP multi-document retrieval. Sections D-F add progressive enhancements. Section G is optional.

---

### SECTION A: Remove documentId Guard Clause (Critical Blocker)

**Priority:** P0 — Must be done first  
**Estimated Effort:** 15 minutes  
**Files Modified:** 1

#### A.1 Problem

`queryRAG()` in `src/lib/rag/services/rag-retrieval-service.ts` throws an error when `documentId` is not provided for non-LoRA modes, even though all downstream functions already support `knowledgeBaseId`-only queries.

#### A.2 Change

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Replace** (approximately lines 666-669):

```typescript
// Fail fast: documentId is required for all RAG modes to prevent cross-document contamination
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
}
```

**With:**

```typescript
// Validate scope: at least one of documentId or knowledgeBaseId is required for RAG modes
if (!params.documentId && !params.knowledgeBaseId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] Either documentId or knowledgeBaseId is required — cannot query without scope');
}
```

#### A.3 Downstream Verification

All downstream functions already handle `knowledgeBaseId`:

- `searchSimilarEmbeddings()` — accepts `knowledgeBaseId`, calls `match_rag_embeddings_kb` RPC
- `searchTextContent()` — accepts `knowledgeBaseId`, calls `search_rag_text` RPC
- `retrieveContext()` — passes `knowledgeBaseId` to both search functions
- `assembleContext()` — groups results by `documentId` when multiple documents are present
- `deduplicateResults()` — removes cross-document duplicates (Jaccard >0.9)
- `balanceMultiDocCoverage()` — caps any single document at 60% of results

**No other code changes needed** for the basic plumbing to work.

#### A.4 Validation

After applying this change, the following should work:

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "queryText": "What is the training process?",
    "knowledgeBaseId": "<KB_UUID>",
    "mode": "rag_only"
  }'
```

This should return a response that searches across ALL documents in the knowledge base rather than throwing an error.

---

### SECTION B: Database Migrations for Multi-Doc Support

**Priority:** P1  
**Estimated Effort:** 30 minutes  
**Database Tables Modified:** 2 (new columns), 1 new table, 2 new RPCs

#### B.1 Overview

The existing database schema already supports multi-document operations (`rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_embeddings` all have proper foreign keys). However, several enhancements improve multi-doc query quality:

1. Add `document_name` to `rag_citations` for cross-document attribution
2. Add `query_scope` to `rag_queries` to track whether a query was document-scoped or KB-wide
3. Create a `rag_document_relationships` table for cross-document entity tracking
4. Update RPCs to ensure proper KB-wide search behavior

#### B.2 Migration: Add Multi-Doc Query Fields

**⚠️ HUMAN ACTION REQUIRED — Database Migration**

All database operations MUST use SAOL. Run the following from a terminal:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops"
```

**Step 1 — Dry-run the migration:**

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const result = await saol.agentExecuteDDL({
    sql: \`
      -- Add query_scope to rag_queries (tracks document vs KB-wide queries)
      ALTER TABLE rag_queries
      ADD COLUMN IF NOT EXISTS query_scope VARCHAR(20) DEFAULT 'document'
      CHECK (query_scope IN ('document', 'knowledge_base'));

      -- Add source_document_id and source_document_name to rag_citations
      ALTER TABLE rag_citations
      ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES rag_documents(id),
      ADD COLUMN IF NOT EXISTS source_document_name TEXT;

      -- Index for KB-wide query history
      CREATE INDEX IF NOT EXISTS idx_rag_queries_kb_scope
      ON rag_queries(knowledge_base_id, query_scope, created_at DESC)
      WHERE knowledge_base_id IS NOT NULL;
    \`,
    dryRun: true,
    transport: 'pg'
  });
  console.log('Dry-run result:', JSON.stringify(result, null, 2));
})();
"
```

**Step 2 — If dry-run succeeds, execute for real:**

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const result = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE rag_queries
      ADD COLUMN IF NOT EXISTS query_scope VARCHAR(20) DEFAULT 'document'
      CHECK (query_scope IN ('document', 'knowledge_base'));

      ALTER TABLE rag_citations
      ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES rag_documents(id),
      ADD COLUMN IF NOT EXISTS source_document_name TEXT;

      CREATE INDEX IF NOT EXISTS idx_rag_queries_kb_scope
      ON rag_queries(knowledge_base_id, query_scope, created_at DESC)
      WHERE knowledge_base_id IS NOT NULL;
    \`,
    transport: 'pg'
  });
  console.log('Migration result:', JSON.stringify(result, null, 2));
})();
"
```

#### B.3 Migration: Create Cross-Document Entity Tracking Table

This table enables tracking entities (people, organizations, policies, terms) that appear across multiple documents. This is a lightweight alternative to full GraphRAG.

**⚠️ HUMAN ACTION REQUIRED — Database Migration**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops"
```

**Step 1 — Dry-run:**

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const result = await saol.agentExecuteDDL({
    sql: \`
      -- Cross-document entity relationships
      CREATE TABLE IF NOT EXISTS rag_document_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,
        entity_name TEXT NOT NULL,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
          'person', 'organization', 'policy', 'term', 'concept',
          'regulation', 'product', 'location', 'date_reference', 'other'
        )),
        document_ids UUID[] NOT NULL,
        fact_ids UUID[],
        context_summary TEXT,
        mention_count INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for entity lookup
      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_kb
      ON rag_document_relationships(knowledge_base_id);

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_entity
      ON rag_document_relationships(knowledge_base_id, entity_name);

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_type
      ON rag_document_relationships(knowledge_base_id, entity_type);

      -- GIN index for array containment queries (find entities in a specific document)
      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_docs
      ON rag_document_relationships USING GIN (document_ids);

      -- RLS Policies
      ALTER TABLE rag_document_relationships ENABLE ROW LEVEL SECURITY;

      CREATE POLICY \"KB owners can view relationships\"
      ON rag_document_relationships FOR SELECT
      USING (
        knowledge_base_id IN (
          SELECT id FROM rag_knowledge_bases WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY \"KB owners can manage relationships\"
      ON rag_document_relationships FOR ALL
      USING (
        knowledge_base_id IN (
          SELECT id FROM rag_knowledge_bases WHERE user_id = auth.uid()
        )
      );
    \`,
    dryRun: true,
    transport: 'pg'
  });
  console.log('Dry-run result:', JSON.stringify(result, null, 2));
})();
"
```

**Step 2 — If dry-run succeeds, execute for real:**

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const result = await saol.agentExecuteDDL({
    sql: \`
      CREATE TABLE IF NOT EXISTS rag_document_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,
        entity_name TEXT NOT NULL,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
          'person', 'organization', 'policy', 'term', 'concept',
          'regulation', 'product', 'location', 'date_reference', 'other'
        )),
        document_ids UUID[] NOT NULL,
        fact_ids UUID[],
        context_summary TEXT,
        mention_count INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_kb
      ON rag_document_relationships(knowledge_base_id);

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_entity
      ON rag_document_relationships(knowledge_base_id, entity_name);

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_type
      ON rag_document_relationships(knowledge_base_id, entity_type);

      CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_docs
      ON rag_document_relationships USING GIN (document_ids);

      ALTER TABLE rag_document_relationships ENABLE ROW LEVEL SECURITY;

      CREATE POLICY \"KB owners can view relationships\"
      ON rag_document_relationships FOR SELECT
      USING (
        knowledge_base_id IN (
          SELECT id FROM rag_knowledge_bases WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY \"KB owners can manage relationships\"
      ON rag_document_relationships FOR ALL
      USING (
        knowledge_base_id IN (
          SELECT id FROM rag_knowledge_bases WHERE user_id = auth.uid()
        )
      );
    \`,
    transport: 'pg'
  });
  console.log('Migration result:', JSON.stringify(result, null, 2));
})();
"
```

#### B.4 Verify RPCs Exist

The following RPCs are already expected to exist (created during the ingestion upgrade). Verify they are present:

**⚠️ HUMAN ACTION REQUIRED — Verify RPCs**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops"
```

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const result = await saol.agentExecuteDDL({
    sql: \`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('match_rag_embeddings_kb', 'search_rag_text')
      ORDER BY routine_name;
    \`,
    transport: 'pg'
  });
  console.log('RPCs found:', JSON.stringify(result, null, 2));
})();
"
```

**Expected output:** Both `match_rag_embeddings_kb` and `search_rag_text` should appear. If either is missing, the RPC creation SQL from the ingestion upgrade must be re-applied (see `013-rag-multi-ingestion-upgrade_v1.md` Section 7.2 for the full RPC definitions).

---

### SECTION C: UI Changes — KB-Wide Chat Mode

**Priority:** P1  
**Estimated Effort:** 2 hours  
**Files Modified:** 4-5

#### C.1 Overview

Currently, `RAGChat.tsx` receives `documentId` and `knowledgeBaseId` as props from its parent component. The parent determines which document to chat with. To enable KB-wide chat, we need:

1. A way for users to switch between "Chat with Document" and "Chat with Knowledge Base" modes
2. When in KB-wide mode, `documentId` should be `undefined` and `knowledgeBaseId` should be passed
3. Response display should show which document each citation comes from

#### C.2 Current Component Tree

```
KnowledgeBaseDashboard.tsx
  └─ (user clicks a document)
     └─ DocumentDetail.tsx
        └─ RAGChat.tsx (receives documentId + knowledgeBaseId)
           └─ ModeSelector.tsx (rag_only / lora_only / rag_and_lora)
```

#### C.3 Changes to RAGChat.tsx

**File:** `src/components/rag/RAGChat.tsx`

**Add a scope toggle** that lets users switch between document-scoped and KB-wide chat:

```typescript
// New state for chat scope
const [chatScope, setChatScope] = useState<'document' | 'knowledge_base'>(
  props.documentId ? 'document' : 'knowledge_base'
);

// When scope is 'knowledge_base', pass documentId as undefined
const effectiveDocumentId = chatScope === 'document' ? props.documentId : undefined;
const effectiveKnowledgeBaseId = props.knowledgeBaseId;
```

**Add scope toggle UI** above the chat input:

```tsx
{/* Only show toggle when opened from a document context (not KB dashboard) */}
{props.documentId && props.knowledgeBaseId && (
  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
    <span className="text-sm text-muted-foreground">Search scope:</span>
    <button
      onClick={() => setChatScope('document')}
      className={cn(
        "text-sm px-3 py-1 rounded-full transition-colors",
        chatScope === 'document'
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80"
      )}
    >
      This Document
    </button>
    <button
      onClick={() => setChatScope('knowledge_base')}
      className={cn(
        "text-sm px-3 py-1 rounded-full transition-colors",
        chatScope === 'knowledge_base'
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80"
      )}
    >
      Entire Knowledge Base
    </button>
  </div>
)}
```

**Update the query mutation call** to use the effective IDs:

```typescript
// In the handleSendMessage function, update the queryRAG call:
queryRAG.mutate({
  queryText: message,
  documentId: effectiveDocumentId,    // undefined when KB-wide
  knowledgeBaseId: effectiveKnowledgeBaseId,
  mode: selectedMode,
  modelJobId: selectedModelJobId,
});
```

#### C.4 Changes to useRAGChat.ts

**File:** `src/hooks/useRAGChat.ts`

Update the `queryRAG` function to include `query_scope`:

```typescript
async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  mode?: string;
  modelJobId?: string;
}) {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      queryScope: params.documentId ? 'document' : 'knowledge_base',
    }),
  });
  // ... existing error handling
}
```

#### C.5 Changes to KnowledgeBaseDashboard.tsx

**File:** `src/components/rag/KnowledgeBaseDashboard.tsx`

Add a "Chat with KB" button that opens `RAGChat` in KB-wide mode (no `documentId`):

```tsx
{/* Add alongside existing KB actions */}
<Button
  variant="outline"
  onClick={() => setShowKBChat(true)}
  disabled={documentCount === 0}
>
  <MessageSquare className="w-4 h-4 mr-2" />
  Chat with Knowledge Base
</Button>

{/* Render RAGChat in KB-wide mode */}
{showKBChat && (
  <RAGChat
    knowledgeBaseId={knowledgeBase.id}
    documentName={knowledgeBase.name}
    /* documentId is intentionally omitted for KB-wide mode */
  />
)}
```

#### C.6 Changes to SourceCitation.tsx

**File:** `src/components/rag/SourceCitation.tsx`

Update the citation display to show source document name when available:

```tsx
{/* Add document source indicator for multi-doc results */}
{citation.sourceDocumentName && (
  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
    📄 {citation.sourceDocumentName}
  </span>
)}
```

#### C.7 Changes to Query API Route

**File:** `src/app/api/rag/query/route.ts`

Accept the new `queryScope` parameter and pass it through:

```typescript
const { queryText, documentId, knowledgeBaseId, mode, modelJobId, queryScope } = body;

// Pass queryScope to queryRAG for storage
const result = await queryRAG({
  queryText,
  documentId,
  knowledgeBaseId,
  userId: user.id,
  mode,
  modelJobId,
  queryScope: queryScope || (documentId ? 'document' : 'knowledge_base'),
});
```

---

### SECTION D: Query Routing & Cross-Document Query Decomposition

**Priority:** P2 (Enhancement — after basic multi-doc works)  
**Estimated Effort:** 3-4 hours  
**Files Modified:** 2-3

#### D.1 Overview

For simple factual queries ("What is the refund policy?"), the existing retrieval pipeline works well even across documents. For complex multi-hop queries ("Compare the HR policies in the employee handbook with the contractor agreement"), we need query decomposition.

#### D.2 Query Classifier

Add a lightweight query classifier that determines if decomposition is needed.

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

#### D.3 Integrate Classification into queryRAG

In `queryRAG()`, after the initial setup and before HyDE generation, add:

```typescript
// Count documents in KB for classification
let documentCount = 1;
if (!params.documentId && knowledgeBaseId) {
  const { count } = await supabase
    .from('rag_documents')
    .select('id', { count: 'exact', head: true })
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('status', 'completed');
  documentCount = count || 1;
}

// Classify query (only for KB-wide queries with multiple documents)
const classification = (!params.documentId && documentCount > 1)
  ? await classifyQuery({ queryText: params.queryText, documentCount })
  : { type: 'simple' as const };

console.log(`[RAG Retrieval] Query classification: ${classification.type}`);
```

#### D.4 Handle Multi-Hop Queries

For `multi-hop` and `comparative` queries, run sub-queries in parallel, then synthesize:

```typescript
if (classification.type !== 'simple' && classification.subQueries?.length) {
  // Run sub-queries in parallel
  const subResults = await Promise.all(
    classification.subQueries.map(async (subQuery) => {
      const hydeResult = await generateHyDE(provider, subQuery);
      const searchTexts = [subQuery, ...(hydeResult.hypotheticalAnswer ? [hydeResult.hypotheticalAnswer] : [])];
      return retrieveContext({
        supabase,
        searchTexts,
        documentId: undefined,
        knowledgeBaseId,
        queryText: subQuery,
        runId: params.runId,
      });
    })
  );

  // Merge and deduplicate all sub-query results
  const allSections = subResults.flatMap(r => r.sections);
  const allFacts = subResults.flatMap(r => r.facts);
  const dedupedSections = deduplicateResults(allSections);
  const dedupedFacts = deduplicateResults(allFacts);
  const balancedSections = balanceMultiDocCoverage(dedupedSections);

  // Assemble merged context with sub-query structure
  const context = assembleMultiHopContext({
    originalQuery: params.queryText,
    subQueries: classification.subQueries,
    sections: balancedSections,
    facts: dedupedFacts,
  });

  // Generate response from merged context
  // ... (continue with standard response generation path)
}
```

#### D.5 Multi-Hop Context Assembly Function

```typescript
function assembleMultiHopContext(params: {
  originalQuery: string;
  subQueries: string[];
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
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
    parts.push(`\n### Document: ${docId}`);
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

### SECTION E: Multi-Document Context Assembly Enhancements

**Priority:** P2  
**Estimated Effort:** 2 hours  
**Files Modified:** 2

#### E.1 Overview

The existing `assembleContext` function already handles multi-doc grouping. This section adds:

1. Document name resolution (so context includes human-readable document names, not just UUIDs)
2. Conversation context that spans across documents (the existing conversation context only stores the last 3 Q&A pairs; this is already document-agnostic)
3. Provenance enrichment in context assembly (using the provenance fields from the 6-pass pipeline)

#### E.2 Document Name Resolution

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

Add document name lookup in `queryRAG()` before context assembly:

```typescript
// Resolve document names for multi-doc context
const documentNames = new Map<string, string>();
if (!params.documentId && knowledgeBaseId) {
  const { data: docs } = await supabase
    .from('rag_documents')
    .select('id, name, file_name')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('status', 'completed');

  if (docs) {
    for (const doc of docs) {
      documentNames.set(doc.id, doc.name || doc.file_name || doc.id);
    }
  }
}
```

Then update `assembleContext` to accept and use `documentNames`:

```typescript
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
  documentNames?: Map<string, string>;  // NEW
}): string {
  // ... existing code ...

  if (isMultiDoc) {
    // Replace docId headers with human-readable names
    for (const [docId, docSections] of Array.from(sectionsByDoc.entries())) {
      const docName = params.documentNames?.get(docId) || docId;
      contextParts.push(`\n## From: ${docName}`);
      // ... rest of section assembly
    }
  }
}
```

#### E.3 Provenance-Enriched Facts

Update the fact assembly to include provenance information when available:

```typescript
// In assembleContext, replace fact text generation:
const factTexts = facts
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 20)
  .map(f => {
    const provenance = [];
    if (f.policyId) provenance.push(`Policy: ${f.policyId}`);
    if (f.subsection) provenance.push(`Section: ${f.subsection}`);
    if (f.factCategory) provenance.push(`Category: ${f.factCategory}`);
    const provenanceStr = provenance.length > 0 ? ` (${provenance.join(', ')})` : '';
    return `[${f.factType}] ${f.content}${provenanceStr} (confidence: ${f.confidence})`;
  });
```

---

### SECTION F: Source Attribution & Cross-Document Citations

**Priority:** P2  
**Estimated Effort:** 2-3 hours  
**Files Modified:** 3

#### F.1 Overview

When responses synthesize information from multiple documents, citations must indicate which document each piece of information came from. The current citation system already tracks `sectionId` and `sectionTitle` — we extend it with `sourceDocumentId` and `sourceDocumentName`.

#### F.2 Update Citation Storage

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

In the query storage section (where `rag_citations` rows are inserted), add the source document information:

```typescript
// When storing citations, resolve the source document for each
for (const citation of citations) {
  // Lookup which document this section belongs to
  let sourceDocId = null;
  let sourceDocName = null;
  if (citation.sectionId) {
    const { data: section } = await supabase
      .from('rag_sections')
      .select('document_id')
      .eq('id', citation.sectionId)
      .single();
    if (section) {
      sourceDocId = section.document_id;
      sourceDocName = documentNames.get(section.document_id) || null;
    }
  }

  await supabase.from('rag_citations').insert({
    query_id: queryRow.id,
    section_id: citation.sectionId,
    section_title: citation.sectionTitle,
    excerpt: citation.excerpt,
    relevance_score: citation.relevanceScore,
    source_document_id: sourceDocId,       // NEW
    source_document_name: sourceDocName,   // NEW
  });
}
```

#### F.3 Update Citation Type

**File:** `src/types/rag.ts`

Add the new fields to `RAGCitation`:

```typescript
export interface RAGCitation {
  id: string;
  queryId: string;
  sectionId: string;
  sectionTitle: string;
  excerpt: string;
  relevanceScore: number;
  sourceDocumentId?: string;     // NEW
  sourceDocumentName?: string;   // NEW
  createdAt: Date;
}
```

#### F.4 Update DB Mapper

**File:** `src/lib/rag/services/rag-db-mappers.ts`

Add the new fields to the citation mapper:

```typescript
export function mapRowToCitation(row: Record<string, unknown>): RAGCitation {
  return {
    id: row.id as string,
    queryId: row.query_id as string,
    sectionId: row.section_id as string,
    sectionTitle: row.section_title as string,
    excerpt: row.excerpt as string,
    relevanceScore: row.relevance_score as number,
    sourceDocumentId: row.source_document_id as string | undefined,       // NEW
    sourceDocumentName: row.source_document_name as string | undefined,   // NEW
    createdAt: new Date(row.created_at as string),
  };
}
```

#### F.5 Update Response Format Prompt

In `generateResponse()`, update the system prompt to request document attribution when multiple documents are present:

```typescript
// Add to the system prompt when assembleContext detected multi-doc:
const multiDocInstruction = isMultiDoc
  ? `\n6. When citing, include the document name: [Document: name, Section: title]`
  : '';

const systemPrompt = `You are a helpful knowledge assistant...${multiDocInstruction}`;
```

---

### SECTION G: GraphRAG Python Microservice (Optional Enhancement)

**Priority:** P3 (Optional — implement only if multi-hop queries need graph traversal)  
**Estimated Effort:** 8-12 hours  
**New Service:** Python Flask/FastAPI microservice

#### G.1 Overview

A Python microservice that builds and queries a lightweight knowledge graph from extracted entities. This is recommended ONLY if the basic multi-document retrieval (Sections A-F) proves insufficient for relationship-heavy queries.

**Decision Point:** After implementing Sections A-F, test with real multi-document queries. If users encounter queries like "Which policies in Document A conflict with regulations in Document B?", the graph layer adds value. For simpler cross-document synthesis, the existing infrastructure is sufficient.

#### G.2 Recommended Library: LightRAG

**Why LightRAG over Microsoft GraphRAG:**
- 60% less setup complexity
- No expensive community detection (saves $5-20/document in LLM calls)
- MIT licensed
- Supports incremental graph updates (new documents add to existing graph)
- API is simple: `insert(text)` and `query(question)`

#### G.3 Microservice Architecture

```
┌──────────────────────────────────┐
│  Next.js API Route               │
│  /api/rag/graph-query            │
│                                  │
│  Calls GraphRAG microservice     │
│  when query.type = 'multi-hop'   │
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

#### G.4 Python Microservice Implementation

```python
# graph_rag_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from lightrag import LightRAG, QueryParam
from lightrag.llm import anthropic_complete
import os

app = FastAPI(title="BrightRun GraphRAG Service")

# Initialize LightRAG with Claude
rag = LightRAG(
    working_dir="./graph_data",
    llm_model_func=anthropic_complete,
    llm_model_name="claude-haiku-4-5-20241022",
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

#### G.5 Integration with Existing Pipeline

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

Add a function to call the GraphRAG service when query classification returns `multi-hop`:

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

**Graceful degradation:** The GraphRAG service is optional. If `GRAPH_RAG_SERVICE_URL` is not set or the service is unavailable, the standard retrieval pipeline handles the query.

#### G.6 Indexing Integration (Inngest)

**File:** `src/inngest/functions/process-rag-document.ts`

After the final embedding step, optionally index the document in GraphRAG:

```typescript
// OPTIONAL: Index in GraphRAG service
const graphRAGUrl = process.env.GRAPH_RAG_SERVICE_URL;
if (graphRAGUrl) {
  await step.run('index-graph-rag', async () => {
    try {
      await fetch(`${graphRAGUrl}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_id: doc.knowledge_base_id,
          document_id: doc.id,
          text: rawText,
        }),
      });
      console.log(`[Inngest] GraphRAG indexed document ${doc.id}`);
    } catch (err) {
      console.warn(`[Inngest] GraphRAG indexing failed (non-blocking):`, err);
    }
  });
}
```

#### G.7 Deployment

**⚠️ HUMAN ACTION REQUIRED — GraphRAG Service Deployment**

**Option A: RunPod Serverless** (recommended — you already have RunPod)
```bash
# Dockerfile for GraphRAG service
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "graph_rag_service:app", "--host", "0.0.0.0", "--port", "8000"]
```

**requirements.txt:**
```
fastapi==0.109.0
uvicorn==0.27.0
lightrag-hku==0.1.2
anthropic==0.39.0
```

**Option B: Railway.app** (simpler, $5/mo)
1. Push the Python service to a GitHub repo
2. Connect Railway to the repo
3. It auto-deploys

**Option C: Fly.io** (free tier covers small workloads)
```bash
fly launch --name brightrun-graphrag
fly deploy
```

After deployment, set the environment variable:
```bash
# In Vercel project settings:
GRAPH_RAG_SERVICE_URL=https://your-service-url.com
```

---

### SECTION H: Testing & Validation

**Priority:** P1 (parallel with Sections A-C)  
**Estimated Effort:** 2-3 hours  
**Files Modified:** 2-3 new test files

#### H.1 Manual Testing Checklist

After implementing Sections A-C, validate:

1. **Single-document query still works** — Query with `documentId` specified should behave identically to before
2. **KB-wide query works** — Query with only `knowledgeBaseId` should search across all documents
3. **Empty KB query fails gracefully** — Query against KB with no completed documents should return helpful error
4. **Citation shows document name** — Multi-doc responses should include document names in citations
5. **Deduplication works** — Upload the same document twice; cross-KB queries should not return duplicate facts
6. **Balance reweighting works** — Upload 10 documents; query should not return results only from one document
7. **Conversation context persists** — Multi-turn KB-wide conversation should maintain context

#### H.2 Test Script (SAOL)

**⚠️ HUMAN ACTION REQUIRED — Testing**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops"
```

**Verify multi-doc data exists:**

```javascript
node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  // Find a KB with multiple documents
  const kbs = await saol.agentQuery({
    table: 'rag_knowledge_bases',
    select: 'id, name',
    limit: 10
  });
  console.log('Knowledge Bases:', kbs.data);

  for (const kb of kbs.data) {
    const docs = await saol.agentQuery({
      table: 'rag_documents',
      where: [{ column: 'knowledge_base_id', operator: 'eq', value: kb.id }],
      select: 'id, name, status, file_name'
    });
    console.log(\`  KB \${kb.name}: \${docs.data.length} documents\`);
    docs.data.forEach(d => console.log(\`    - \${d.name || d.file_name} (\${d.status})\`));
  }
})();
"
```

**Test KB-wide query via API:**

```javascript
node -e "
const KB_ID = 'YOUR_KB_ID_HERE';  // Replace with actual KB ID
(async () => {
  const response = await fetch('http://localhost:3000/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryText: 'What are the key policies in this knowledge base?',
      knowledgeBaseId: KB_ID,
      mode: 'rag_only'
    })
  });
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
})();
"
```

#### H.3 Automated Integration Test

**File:** `src/lib/rag/__tests__/multi-doc-retrieval.test.ts` (new file)

```typescript
import { queryRAG } from '../services/rag-retrieval-service';

describe('Multi-Document Retrieval', () => {
  const TEST_KB_ID = process.env.TEST_KB_ID;

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
      documentId: process.env.TEST_DOC_ID,
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
    })).rejects.toThrow('Either documentId or knowledgeBaseId is required');
  });

  it('should include citations with document source info', async () => {
    const result = await queryRAG({
      queryText: 'What are the policies?',
      knowledgeBaseId: TEST_KB_ID,
      userId: 'test-user',
      mode: 'rag_only',
    });
    if (result.data?.citations?.length) {
      // At least some citations should have source document info
      const withSource = result.data.citations.filter(c => c.sourceDocumentName);
      expect(withSource.length).toBeGreaterThan(0);
    }
  });
});
```

---

## 6. HUMAN ACTION STEPS

All human-required actions consolidated in one place for easy execution.

### Step 1: Run Database Migrations (Section B)

**⚠️ HUMAN ACTION — Copy/paste ready**

Open a terminal and run these commands sequentially:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops"
```

**Migration 1 — Add multi-doc columns (dry-run first):**

```javascript
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope VARCHAR(20) DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base')); ALTER TABLE rag_citations ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES rag_documents(id), ADD COLUMN IF NOT EXISTS source_document_name TEXT; CREATE INDEX IF NOT EXISTS idx_rag_queries_kb_scope ON rag_queries(knowledge_base_id, query_scope, created_at DESC) WHERE knowledge_base_id IS NOT NULL;\`,dryRun:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

If dry-run succeeds:

```javascript
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope VARCHAR(20) DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base')); ALTER TABLE rag_citations ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES rag_documents(id), ADD COLUMN IF NOT EXISTS source_document_name TEXT; CREATE INDEX IF NOT EXISTS idx_rag_queries_kb_scope ON rag_queries(knowledge_base_id, query_scope, created_at DESC) WHERE knowledge_base_id IS NOT NULL;\`,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

**Migration 2 — Create entity relationships table (dry-run first):**

```javascript
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`CREATE TABLE IF NOT EXISTS rag_document_relationships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE, entity_name TEXT NOT NULL, entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('person','organization','policy','term','concept','regulation','product','location','date_reference','other')), document_ids UUID[] NOT NULL, fact_ids UUID[], context_summary TEXT, mention_count INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_kb ON rag_document_relationships(knowledge_base_id); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_entity ON rag_document_relationships(knowledge_base_id, entity_name); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_type ON rag_document_relationships(knowledge_base_id, entity_type); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_docs ON rag_document_relationships USING GIN (document_ids); ALTER TABLE rag_document_relationships ENABLE ROW LEVEL SECURITY;\`,dryRun:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

If dry-run succeeds:

```javascript
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`CREATE TABLE IF NOT EXISTS rag_document_relationships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE, entity_name TEXT NOT NULL, entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('person','organization','policy','term','concept','regulation','product','location','date_reference','other')), document_ids UUID[] NOT NULL, fact_ids UUID[], context_summary TEXT, mention_count INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_kb ON rag_document_relationships(knowledge_base_id); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_entity ON rag_document_relationships(knowledge_base_id, entity_name); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_type ON rag_document_relationships(knowledge_base_id, entity_type); CREATE INDEX IF NOT EXISTS idx_rag_doc_rel_docs ON rag_document_relationships USING GIN (document_ids); ALTER TABLE rag_document_relationships ENABLE ROW LEVEL SECURITY;\`,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

### Step 2: Verify RPCs Exist

```javascript
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('match_rag_embeddings_kb','search_rag_text');\`,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

### Step 3: Upload Test Documents

To test multi-document retrieval, ensure at least 2 documents are uploaded to the same KB:

1. Open the BrightRun app at `http://localhost:3000`
2. Navigate to **RAG Frontier** → **Knowledge Bases**
3. Select a Knowledge Base (or create one)
4. Upload 2+ documents (PDF, DOCX, TXT, or MD)
5. Wait for processing to complete (check document status badges)

### Step 4: Test Multi-Doc Query

After code changes are deployed:

1. Open a Knowledge Base with 2+ processed documents
2. Click "Chat with Knowledge Base" (new button)
3. Ask a question that could be answered by either document
4. Verify the response includes citations from both documents

### Step 5: Deploy GraphRAG (Optional — Section G)

Only if needed after testing Sections A-F:

1. Choose deployment platform (RunPod Serverless, Railway, or Fly.io)
2. Deploy the Python microservice from Section G.4
3. Set `GRAPH_RAG_SERVICE_URL` in Vercel project settings
4. Redeploy the Next.js app

---

## 7. RISK ASSESSMENT & MITIGATIONS

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **RPC functions missing** from DB | KB-wide search fails | Low (they were created during ingestion upgrade) | Section B.4 verification step; re-create if missing |
| **Context window overflow** with many documents | Truncated or failed responses | Medium (100K token limit in config) | `maxContextTokens: 100000` already set; `balanceMultiDocCoverage` limits any single doc to 60% |
| **Slow queries** with large KBs (10+ docs) | Poor user experience | Medium | HyDE + reranking are already optimized; consider adding result count limits per tier |
| **Inconsistent citations** across documents | Confusing UX | Low | Section F adds explicit document attribution |
| **GraphRAG costs** for large document sets | Unexpected API costs | Low (optional, Claude Haiku is cheap) | LightRAG costs ~$0.05-0.10 per document; monitor via Anthropic dashboard |
| **Supabase 8GB limit** with many embeddings | DB storage cap | Medium (at scale) | 1536-dim embeddings are efficient; ~100 docs before concern; monitor via Supabase dashboard |

---

## 8. COST PROJECTIONS

### Per-Query Cost (Multi-Document)

| Component | Model | Est. Cost per Query |
|-----------|-------|-------------------|
| HyDE generation | Claude Haiku 4.5 | ~$0.002 |
| Query classification | Claude Haiku 4.5 | ~$0.001 |
| Claude reranking | Claude Haiku 4.5 | ~$0.002 |
| Response generation | Claude Haiku 4.5 | ~$0.005 |
| Self-RAG evaluation | Claude Haiku 4.5 | ~$0.002 |
| OpenAI embedding | text-embedding-3-small | ~$0.0001 |
| **Total per query** | | **~$0.012** |

### Sub-query decomposition (multi-hop, when triggered):

| Component | Cost per Sub-Query |
|-----------|-------------------|
| Additional HyDE + search + rerank per sub-query | ~$0.005 |
| Synthesis of 2-4 sub-queries | ~$0.008 |
| **Total per multi-hop query (3 sub-queries)** | **~$0.035** |

### Per-Document Ingestion Cost (unchanged)

| Pass | Model | Est. Cost |
|------|-------|-----------|
| Pass 1 (Structure) | Sonnet 4.5 | ~$0.15 |
| Pass 2 (Policies) | Sonnet 4.5 | ~$0.30 |
| Pass 3 (Tables) | Sonnet 4.5 | ~$0.10 |
| Pass 4 (Glossary) | Haiku | ~$0.02 |
| Pass 5 (Narrative) | Sonnet 4.5 | ~$0.20 |
| Pass 6 (Verification) | Opus 4.6 | ~$0.60 |
| Embeddings | OpenAI | ~$0.01 |
| **Total per document** | | **~$1.38** |

---

## 9. IMPLEMENTATION SEQUENCE

### Phase 1: MVP Multi-Document Retrieval (Sections A + B + C)

**Timeline:** 1-2 days  
**Outcome:** Users can query across all documents in a Knowledge Base

```
1. Section A: Remove guard clause              → 15 min
2. Section B: Run database migrations          → 30 min (human action)
3. Section C: UI scope toggle + KB chat button → 2 hours
4. Section H: Manual testing                   → 1 hour
```

### Phase 2: Enhanced Multi-Doc (Sections D + E + F)

**Timeline:** 2-3 days  
**Outcome:** Complex queries decomposed, better citations, provenance in context

```
5. Section D: Query classification + routing   → 3-4 hours
6. Section E: Context assembly enhancements    → 2 hours
7. Section F: Cross-document citations         → 2-3 hours
8. Section H: Integration tests                → 1 hour
```

### Phase 3: GraphRAG (Section G — Optional)

**Timeline:** 2-3 days  
**Outcome:** Graph-based retrieval for relationship-heavy queries

```
9. Section G: Python microservice + deploy     → 8-12 hours
10. Integration testing with real queries      → 2 hours
```

---

## APPENDIX: File Reference

| File | Purpose | Sections Affected |
|------|---------|------------------|
| `src/lib/rag/services/rag-retrieval-service.ts` | Main retrieval pipeline | A, D, E, F, G |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search (already supports KB-wide) | — (no changes) |
| `src/lib/rag/services/rag-ingestion-service.ts` | Document processing (already supports multi-doc) | G (GraphRAG indexing) |
| `src/lib/rag/services/rag-db-mappers.ts` | Database row mappers | F |
| `src/types/rag.ts` | TypeScript type definitions | F |
| `src/lib/rag/config.ts` | Configuration constants | — (no changes) |
| `src/lib/rag/providers/claude-llm-provider.ts` | Claude API calls | — (no changes) |
| `src/inngest/functions/process-rag-document.ts` | 6-pass ingestion pipeline | G (optional GraphRAG indexing step) |
| `src/app/api/rag/query/route.ts` | Query API endpoint | C |
| `src/components/rag/RAGChat.tsx` | Chat UI component | C |
| `src/components/rag/SourceCitation.tsx` | Citation display | C |
| `src/components/rag/KnowledgeBaseDashboard.tsx` | KB overview dashboard | C |
| `src/hooks/useRAGChat.ts` | Chat mutation hook | C |

---

**END OF SPECIFICATION**

*This specification was generated by analyzing the actual codebase state at `src/lib/rag/`, `src/types/rag.ts`, `src/inngest/functions/process-rag-document.ts`, `src/app/api/rag/`, `src/components/rag/`, and `src/hooks/`, cross-referenced with the multi-document reference documentation in `pmc/product/_mapping/multi-doc/original/`.*
