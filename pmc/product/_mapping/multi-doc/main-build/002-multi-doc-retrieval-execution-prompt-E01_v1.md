# Multi-Document Retrieval — E01: Foundation (Database + Types + Config + Critical Blockers)

**Version:** 1.0  
**Date:** February 20, 2026  
**Section:** E01 — Foundation Layer  
**Prerequisites:** None — this is the first prompt  
**Builds Upon:** Existing RAG Frontier module (E01-E10)  
**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`

---

## Overview

This prompt implements the foundation for multi-document retrieval: database migrations, TypeScript type updates, config additions, the critical guard clause removal, embedding KB ID fix, and mapper updates.

**What This Section Creates / Changes:**
1. 5 database schema migrations (via SAOL — human-executed)
2. TypeScript type updates in `src/types/rag.ts` (5 interface changes)
3. Config additions in `src/lib/rag/config.ts` (2 new values)
4. Critical guard clause removal in `src/lib/rag/services/rag-retrieval-service.ts`
5. Fix `generateAndStoreEmbedding()` in `src/lib/rag/services/rag-embedding-service.ts`
6. Mapper updates in `src/lib/rag/services/rag-db-mappers.ts`
7. Query scope tracking in `src/lib/rag/services/rag-retrieval-service.ts`

**What This Section Does NOT Create:**
- Retrieval engine changes (E02)
- Quality pipeline changes (E03)
- UI components (E04)

---

========================    


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | Status | Flow |
|------|--------|------|
| **LoRA Training** | Complete | Generate Conversations → Enrich → Training Files → Train LoRA → Deploy → Test & Evaluate |
| **RAG Frontier** | Active development | Upload Document → 6-Pass Ingestion (Inngest) → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

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
| Deployment | Vercel (frontend + API routes) |

### Codebase Structure

```
v4-show/
├── src/
│   ├── app/                          # App Router pages + API routes
│   │   ├── (dashboard)/              # Dashboard pages (pipeline/, rag/)
│   │   └── api/                      # API routes (pipeline/, rag/)
│   ├── components/                   # React components
│   │   ├── rag/                      # RAG Frontier components
│   │   └── ui/                       # shadcn/UI base components
│   ├── hooks/                        # Custom React hooks
│   ├── lib/
│   │   ├── rag/                      # RAG services, providers, config
│   │   │   ├── config.ts             # RAG configuration
│   │   │   ├── services/             # Core service files
│   │   │   └── providers/            # LLM + embedding providers
│   │   ├── services/                 # Business logic
│   │   └── supabase/                 # Supabase client
│   ├── inngest/functions/            # Background job pipelines
│   └── types/                        # TypeScript type definitions
├── supa-agent-ops/                   # SAOL library (dev tool only)
└── supabase/                         # Supabase config
```

---

## SAOL — Mandatory for All Database Operations

**The Supabase Agent Ops Library (SAOL) is a CLI-focused development tool only.** It is NOT imported into the codebase. It is used during local development for schema changes.

Full guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`

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

**Rules:**
1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY`
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **Do NOT import SAOL into the codebase** — it is a local dev CLI tool only

---

## What We're Building (Context)

Multi-document retrieval enables users to ask questions that span multiple documents within a single Knowledge Base. Instead of querying one document at a time, users can chat with an entire knowledge base.

### Current State

The RAG module is **fully built** with a 6-pass ingestion pipeline, multi-tier embeddings, HyDE, hybrid search (vector + BM25), Claude reranking, Self-RAG evaluation, and multi-document retrieval infrastructure coded but **unreachable** due to a guard clause.

### The Gap (What E01 Fixes)

1. **Guard clause at line 693 of `rag-retrieval-service.ts`** blocks KB-wide queries
2. **Types** lack multi-doc fields (`RAGCitation.documentId`, `RAGKnowledgeBase.summary`, `RAGQuery.queryScope`)
3. **Config** missing `kbWideSimilarityThreshold` and `maxSingleDocRatio`
4. **Mappers** don't handle `summary` on KB or `query_scope` on queries
5. **`generateAndStoreEmbedding()`** doesn't set `knowledge_base_id` on embeddings
6. **Database** needs schema additions (summary column, indexes, backfills)

---

## Implementation Tasks

### Task 1: Database Migrations (Human-Executed via SAOL)

Generate copy-paste ready SAOL commands for the human to execute. Create a verification script at the end.

**Migration 1 — KB Summary Field:**

Purpose: HyDE anchor for KB-wide queries. Without this, HyDE is skipped for KB-wide queries causing ~15-25% recall loss.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 2 — Btree Index on `rag_embeddings.knowledge_base_id`:**

Purpose: KB-wide vector search currently does a full table scan on `knowledge_base_id`. Critical for performance.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id ON rag_embeddings (knowledge_base_id);';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 3 — Composite Index for Tier-Filtered KB Search:**

Purpose: KB-wide queries filter by both `knowledge_base_id` and `tier`. Composite index avoids double lookup.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier ON rag_embeddings (knowledge_base_id, tier);';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 4 — Query Scope Tracking Column:**

Purpose: Track whether a query was document-level or KB-level. Enables scope-aware conversation history and analytics.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\"ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));\";const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success);}})();"
```

**Migration 5 — Denormalize `knowledge_base_id` onto Facts and Sections + Backfill:**

Purpose: BM25 search uses a subquery join to filter by KB. Denormalizing avoids this join. Also backfills NULL `knowledge_base_id` on embeddings created by the single-embed function. **Run in low-traffic window.**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql='ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID; UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL; UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL; UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;';const r=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});console.log('Dry:',r.success,r.summary);if(r.success){const x=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',x.success,x.summary);}})();"
```

**Verification Script — Run After All Migrations:**

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

**RPC Verification — Confirm required RPCs exist:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('match_rag_embeddings_kb','search_rag_text');\",transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

Expected: Both `match_rag_embeddings_kb` and `search_rag_text` appear.

**All migrations are human-executed.** Present the commands above to the user and await confirmation before proceeding with code changes.

---

### Task 2: TypeScript Type Updates (FR-7.1)

**File:** `src/types/rag.ts` (641 lines)

**Priority:** Tier 1 — CRITICAL (blocks all type-dependent FRs)

Make the following 5 changes:

**Change 1: `RAGCitation` interface (lines 210-215)**

Current (exact code at L210-L215):
```typescript
export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
}
```

Replace with:
```typescript
export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
  documentId?: string;      // Source document ID for multi-doc provenance
  documentName?: string;    // Source document name for display
}
```

**Change 2: `RAGKnowledgeBase` interface (lines 81-90)**

Add `summary` field after `description`:
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

**Change 3: `RAGKnowledgeBaseRow` interface (lines 506-515)**

Add `summary` field after `description`:
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

**Change 4: `RAGQuery` interface (lines 188-208)**

Add `queryScope` field at the end of the interface, before the closing brace:
```typescript
  queryScope: 'document' | 'knowledge_base';  // NEW: tracks whether query was doc-level or KB-level
```

**Change 5: `RAGQueryRow` interface (lines 575-595)**

Add `query_scope` field at the end of the interface, before the closing brace:
```typescript
  query_scope: string | null;  // NEW
```

**Validation:** After making all 5 changes, run `npx tsc --noEmit` to verify no type errors are introduced. You may see existing errors elsewhere — focus on ensuring no NEW errors from these type changes.

---

### Task 3: Config Additions (FR-7.3)

**File:** `src/lib/rag/config.ts` (98 lines)

**Location:** Inside the `retrieval` block (lines 66-72)

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

**Replace with:**
```typescript
  retrieval: {
    maxSectionsToRetrieve: 10,
    maxFactsToRetrieve: 20,
    similarityThreshold: 0.4,
    kbWideSimilarityThreshold: 0.3,  // Lower threshold for KB-wide queries (more recall needed)
    maxSingleDocRatio: 0.6,          // Max proportion of results from a single document
    selfEvalThreshold: 0.6,
    maxContextTokens: 100000,
  },
```

**Rationale:** KB-wide queries search a larger corpus where the best matches may have lower absolute similarity scores. A lower threshold (0.3 vs 0.4) improves recall without overwhelming the reranker.

---

### Task 4: Remove Guard Clause — Critical Blocker (FR-1.1)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` (980 lines)

**Priority:** Tier 1 — CRITICAL (blocks all KB-wide functionality)

**Location:** Line 693 in `queryRAG()` function

**Current Code (exact, at line 693):**
```typescript
    if (!params.documentId && params.mode !== 'lora_only') {
      throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
    }
```

**Replace with:**
```typescript
    // Validate: at least one scope identifier is required for RAG modes
    if (!params.documentId && !params.knowledgeBaseId && params.mode !== 'lora_only') {
      throw new Error('[RAG Retrieval] documentId or knowledgeBaseId is required — cannot query without scope');
    }
```

**Why this is safe:** The downstream infrastructure already supports KB-wide search:
- `searchSimilarEmbeddings()` (embedding-service L127) calls `match_rag_embeddings_kb` with `knowledgeBaseId`
- `searchTextContent()` (embedding-service L188) calls `search_rag_text` with `knowledgeBaseId`
- `assembleContext()` (L217) checks `isMultiDoc = docIds.size > 1` and groups by documentId
- `deduplicateResults()` handles cross-document duplicates
- `balanceMultiDocCoverage()` caps single-doc at 60%
- The API route `src/app/api/rag/query/route.ts` already validates "at least one of documentId or knowledgeBaseId required" (L12-48)

**Validation Criteria:**
- `queryRAG({ queryText: 'test', knowledgeBaseId: '<valid-kb-id>', userId: '<user>' })` without `documentId` does NOT throw
- `queryRAG({ queryText: 'test', userId: '<user>' })` without BOTH identifiers still throws

---

### Task 5: Query Scope Determination and Tracking (FR-1.2)

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** Inside `queryRAG()`, immediately after the guard clause (Task 4)

**Add scope determination logic right after the guard clause:**
```typescript
    // Determine query scope for tracking
    const queryScope: 'document' | 'knowledge_base' = params.documentId ? 'document' : 'knowledge_base';
```

**Then update ALL THREE `rag_queries` insert sites** to include `query_scope: queryScope`:

**Insert Site 1 — LoRA-only mode (around line 727-746):**
Find the `.insert({` block in the `lora_only` branch and add `query_scope: queryScope,` to the insert object.

**Insert Site 2 — No-context early return (around line 798-815):**
Find the `.insert({` block in the no-context-found branch and add `query_scope: queryScope,` to the insert object.

**Insert Site 3 — Main RAG/RAG+LoRA insert (around line 877-893):**
Find the `.insert({` block in the main path and add `query_scope: queryScope,` to the insert object.

**Validation Criteria:**
- KB-wide queries store `query_scope = 'knowledge_base'` in `rag_queries`
- Document-level queries store `query_scope = 'document'`
- All 3 insert paths include `query_scope`

---

### Task 6: Fix `generateAndStoreEmbedding()` to Set `knowledge_base_id` (FR-5.1)

**File:** `src/lib/rag/services/rag-embedding-service.ts` (300 lines)

**Priority:** Tier 1 — CRITICAL (single-embed embeddings are invisible to KB-wide search)

**Location:** `generateAndStoreEmbedding()` function ~ lines 28-73, specifically the insert block at lines 48-62

**Current insert block (L48-62):**
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

**New code — add `knowledge_base_id` lookup before the insert:**

Insert this BEFORE the `.from('rag_embeddings').insert(...)` call:
```typescript
    // Lookup knowledge_base_id from document
    const { data: docRow } = await supabase
      .from('rag_documents')
      .select('knowledge_base_id')
      .eq('id', documentId)
      .single();
```

Then update the insert block to include `knowledge_base_id`:
```typescript
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

**Note:** The batch function `generateAndStoreBatchEmbeddings()` (~L67) already accepts and sets `knowledge_base_id` correctly — the Inngest pipeline passes `doc.knowledgeBaseId`. This fix is only for the single-record function.

**Validation Criteria:**
- After fix, calling `generateAndStoreEmbedding()` produces embeddings with non-null `knowledge_base_id`
- Run: `SELECT COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL` — should eventually return 0 (after backfill in Migration 5)

---

### Task 7: Mapper Updates (FR-7.2)

**File:** `src/lib/rag/services/rag-db-mappers.ts` (196 lines)

**Change 1: `mapRowToKnowledgeBase()` (lines 32-43)**

Add `summary` mapping. Find the return object and add `summary: row.summary || null,` after the `description` line.

The full function should become:
```typescript
export function mapRowToKnowledgeBase(row: RAGKnowledgeBaseRow): RAGKnowledgeBase {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    summary: row.summary || null,   // NEW: KB summary for multi-doc HyDE
    status: row.status as RAGKnowledgeBaseStatus,
    documentCount: row.document_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Change 2: `mapRowToQuery()` (lines 150-175)**

Add `queryScope` mapping. Find the return object and add the `queryScope` line:
```typescript
    queryScope: (row.query_scope as 'document' | 'knowledge_base') || 'document',  // NEW: defaults to 'document' for legacy rows
```

---

### Task 8: Verify All Changes Compile

Run TypeScript compilation check:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
```

Fix any compilation errors that arise from the type changes. The most likely issue is that existing code may not yet provide the new `queryScope` field in places where `RAGQuery` objects are constructed — these should be addressed by adding the default value in the mapper (Task 7).

---

## Summary of Changes

| # | File | Change | FR |
|---|------|--------|-----|
| 1 | DB (via SAOL) | 5 migrations: summary col, 2 indexes, query_scope col, KB ID backfill | Migrations 1-5 |
| 2 | `src/types/rag.ts` | 5 interface updates: RAGCitation +2 fields, RAGKnowledgeBase +summary, RAGKnowledgeBaseRow +summary, RAGQuery +queryScope, RAGQueryRow +query_scope | FR-7.1 |
| 3 | `src/lib/rag/config.ts` | 2 new config values: kbWideSimilarityThreshold, maxSingleDocRatio | FR-7.3 |
| 4 | `src/lib/rag/services/rag-retrieval-service.ts` | Guard clause relaxed to accept knowledgeBaseId | FR-1.1 |
| 5 | `src/lib/rag/services/rag-retrieval-service.ts` | queryScope determination + 3 insert site updates | FR-1.2 |
| 6 | `src/lib/rag/services/rag-embedding-service.ts` | generateAndStoreEmbedding now sets knowledge_base_id | FR-5.1 |
| 7 | `src/lib/rag/services/rag-db-mappers.ts` | mapRowToKnowledgeBase adds summary; mapRowToQuery adds queryScope | FR-7.2 |

## Success Criteria

- [ ] All 5 migrations executed and verified via SAOL
- [ ] Both RPCs (`match_rag_embeddings_kb`, `search_rag_text`) confirmed present
- [ ] `RAGCitation` has `documentId` and `documentName` optional fields
- [ ] `RAGKnowledgeBase` and `RAGKnowledgeBaseRow` have `summary` field
- [ ] `RAGQuery` has `queryScope` field; `RAGQueryRow` has `query_scope`
- [ ] Config has `kbWideSimilarityThreshold: 0.3` and `maxSingleDocRatio: 0.6`
- [ ] Guard clause now accepts `knowledgeBaseId` as alternative to `documentId`
- [ ] All 3 `rag_queries` insert sites include `query_scope`
- [ ] `generateAndStoreEmbedding()` looks up and sets `knowledge_base_id`
- [ ] Mappers updated for `summary` and `queryScope`
- [ ] TypeScript compiles without new errors (`npx tsc --noEmit`)

## What E02 Will Build On

E02 (Core Retrieval Engine) assumes all E01 artifacts are in place:
- Database has `summary`, `query_scope`, `knowledge_base_id` columns + indexes
- Types include multi-doc fields
- Config has `kbWideSimilarityThreshold` and `maxSingleDocRatio`
- Guard clause allows KB-wide queries
- Single-embed function sets `knowledge_base_id`
- Mappers handle new fields

E02 will implement: batch-fetch (N+1 fix), token-budgeted context assembly, document name resolution, KB-level HyDE, scope-aware conversation history, and conversation context in response generation.

+++++++++++++++++



