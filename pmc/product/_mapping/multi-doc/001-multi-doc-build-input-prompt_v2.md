# Multi-Document Retrieval Specification — Build Input Prompt v2

**Version:** 2.0  
**Date:** 2025-07-17  
**Supersedes:** `001-multi-doc-build-input-prompt_v1.md`  
**Output:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v1.md`

---

## PURPOSE

You are a specification-writing agent. Your SOLE task is to produce one file:

```
C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v1.md
```

This specification will instruct a **coding agent** to implement multi-document retrieval into the existing BrightRun RAG module. The spec must be detailed enough that the coding agent can execute it without re-investigating the codebase.

**Do NOT implement code.** Write the specification only.

---

## SECTION 1: PROJECT CONTEXT

### 1.1 What This Application Does

**Bright Run LoRA Training Data Platform** is a Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models AND provides a document-grounded question answering system (RAG Frontier). The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets, execute GPU training jobs, and query documents using semantic search with citations.

### 1.2 Core Workflows

```
PATH 1 (LoRA Training):
Generate Conversations → Enrich & Validate → Create Training Files → 
Train LoRA Adapter → Deploy to Inference → Test & Evaluate

PATH 2 (RAG Frontier):
Upload Document → 6-Pass Multi-Pass Ingestion (Inngest) → Expert Verification → 
Multi-Tier Semantic Search + Embeddings → Chat with Citations → Quality Evaluation
```

### 1.3 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models) |
| AI — Ingestion | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) × 4 passes, Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) × 1 pass, Claude Opus 4.6 (`claude-opus-4-6`) × 1 pass |
| AI — Retrieval | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for HyDE, response gen, self-eval, reranking |
| AI — Evaluation | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for quality scoring |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) |
| Background Jobs | Inngest (12-step multi-pass document processing pipeline) |
| Deployment | Vercel (frontend + API routes) |
| Inference | RunPod Pods with vLLM (Mistral-7B + LoRA adapter) for RAG+LoRA mode |
| DB Operations | SAOL (Supabase Agent Ops Library) — **mandatory for ALL database changes** |

### 1.4 RAG Module File Map

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` | 980 | Query pipeline: HyDE → retrieve → rerank → assemble → generate → self-eval |
| `src/lib/rag/services/rag-embedding-service.ts` | ~300 | Embedding generation, vector search, BM25 text search |
| `src/lib/rag/services/rag-ingestion-service.ts` | 1050 | Document upload, text extraction, multi-pass processing support |
| `src/lib/rag/providers/claude-llm-provider.ts` | 953 | All 6 Claude extraction passes + retrieval-time Claude calls |
| `src/lib/rag/providers/llm-provider.ts` | ~50 | Provider interface (abstract class) |
| `src/lib/rag/config.ts` | 98 | Model names, retrieval thresholds, ingestion model config |
| `src/types/rag.ts` | 641 | All RAG types including multi-pass result types |
| `src/inngest/functions/process-rag-document.ts` | 586 | 12-step Inngest pipeline for document processing |
| `src/lib/rag/services/rag-quality-service.ts` | ~200 | Claude-as-Judge quality evaluation |
| `src/lib/rag/services/rag-db-mappers.ts` | ~150 | Row-to-object mappers |
| `src/lib/file-processing/text-extractor.ts` | ~200 | Robust text extraction (PDF, DOCX, HTML, TXT, MD, RTF) |
| `src/components/rag/RAGChat.tsx` | ~250 | Chat interface — already accepts `knowledgeBaseId?` prop |
| `src/components/rag/KnowledgeBaseDashboard.tsx` | ~200 | KB list and management UI |
| `src/components/rag/DocumentList.tsx` | ~200 | Document list per KB |
| `src/hooks/useRAGChat.ts` | ~150 | Chat hook — sends queries to `/api/rag/query` |
| `src/app/api/rag/query/route.ts` | ~100 | Query API — validates `documentId OR knowledgeBaseId` |

### 1.5 RAG Retrieval Config (exact values from `config.ts`)

```typescript
retrieval: {
  topSections: 10,
  topFacts: 20,
  similarityThreshold: 0.4,
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
}
```

---

## SECTION 2: VERIFIED FOUNDATION STATE

**All facts in this section have been verified against the live database and codebase on 2025-07-17.**

### 2.1 Database Schema — CONFIRMED COMPLETE

Both 013-spec migrations are fully applied:

| Table | Rows | Status |
|-------|------|--------|
| `rag_knowledge_bases` | 2 | Active |
| `rag_documents` | 2 | Both `status = 'ready'` |
| `rag_sections` | 58 | All linked to documents |
| `rag_facts` | 2,269 | 13 of 14 fact_type categories in use |
| `rag_embeddings` | 2,060 | All 3 tiers populated |
| `rag_queries` | 20 | Query history with quality scores |
| `rag_expert_questions` | exists | Expert Q&A flow functional |
| `rag_quality_scores` | exists | 5-metric evaluation stored per query |

**Applied schema features:**
- Enhanced fact provenance: `policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category` columns on `rag_facts`
- `fact_type` constraint covers all 14 types: `fact`, `entity`, `definition`, `relationship`, `table_row`, `policy_exception`, `policy_rule`, `limit`, `threshold`, `required_document`, `escalation_path`, `audit_field`, `cross_reference`, `narrative_fact`
- `content_hash` on `rag_documents` for dedup
- `content_tsv` generated tsvector column on `rag_facts` with GIN index
- `text_tsv` generated tsvector column on `rag_sections` with GIN index
- `knowledge_base_id` column on `rag_embeddings` (backfilled from documents)
- HNSW index on embeddings: `idx_rag_embeddings_hnsw`

**DB functions (RPCs) available:**
- `match_rag_embeddings_kb(query_embedding, match_threshold, match_count, filter_knowledge_base_id, filter_document_id, filter_tier)` — KB-wide vector search
- `search_rag_text(search_query, filter_knowledge_base_id, filter_document_id, match_count)` — BM25 hybrid text search
- Both support optional `run_id` filtering (from migration 004)

### 2.2 Ingestion Pipeline — CONFIRMED COMPLETE

The 6-pass multi-pass ingestion pipeline is **fully implemented and operational**:

| Pass | Model | File | Method |
|------|-------|------|--------|
| 1: Structure Analysis | Sonnet 4.5 | `claude-llm-provider.ts` | `analyzeDocumentStructure()` |
| 2: Policy Extraction | Sonnet 4.5 | `claude-llm-provider.ts` | `extractPoliciesForSection()` |
| 3: Table Extraction | Sonnet 4.5 | `claude-llm-provider.ts` | `extractTableData()` |
| 4: Glossary & Entities | Haiku 4.5 | `claude-llm-provider.ts` | `extractGlossaryAndRelationships()` |
| 5: Narrative Facts | Sonnet 4.5 | `claude-llm-provider.ts` | `extractNarrativeFacts()` |
| 6: Verification | Opus 4.6 | `claude-llm-provider.ts` | `verifyExtractionCompleteness()` |

The Inngest pipeline (`process-rag-document.ts`) orchestrates these as 12 steps:
`fetch-document → pass-1-structure → store-sections → pass-2-policy-{id} → pass-3-table-{idx} → pass-4-glossary → pass-5-narrative-{id} → pass-6-verify-{id} → link-relationships → store-expert-questions → generate-preamble-{id} → generate-embeddings → finalize`

### 2.3 Retrieval Pipeline — CONFIRMED COMPLETE (with one blocker)

The full retrieval pipeline exists and works for single-document queries:

```
queryRAG() → getDocSummary → getConversationContext(last 3 pairs) →
  generateHyDE(query + convContext + docSummary) → 
  retrieveContext(vector via match_rag_embeddings_kb + BM25 via search_rag_text) →
  rerankWithClaude(if >3 results) → deduplicateResults(Jaccard >0.9) →
  balanceMultiDocCoverage(if KB-wide, 60% cap) → assembleContext() →
  generateResponse(query + assembled context) → selfEvaluate() → 
  store in rag_queries
```

**Implemented multi-doc features already in the retrieval pipeline:**
- `balanceMultiDocCoverage()` — caps any single document at 60% of results (line 441)
- `deduplicateResults()` — Jaccard word similarity dedup (line 390)
- `match_rag_embeddings_kb` — accepts `filter_knowledge_base_id` for KB-wide search
- `search_rag_text` — accepts `filter_knowledge_base_id` for KB-wide BM25
- Context assembly already groups sections by document with headers

### 2.4 Frontend & API — CONFIRMED READY

- `RAGChat.tsx` interface: `{ documentId?: string; knowledgeBaseId?: string; documentName?: string }` — both optional
- `/api/rag/query` route: validates `documentId OR knowledgeBaseId` (either suffices)
- `useRAGChat.ts` hook: sends both `documentId` and `knowledgeBaseId` to API
- `KnowledgeBaseDashboard.tsx`: lists KBs with document counts
- `DocumentList.tsx`: lists documents per KB with status indicators
- 12 total RAG UI components in `src/components/rag/`
- 5 RAG hooks in `src/hooks/`

### 2.5 Test Infrastructure — EXISTS

- Golden set: `src/lib/rag/testing/golden-set-definitions.ts` — 20 Q&A pairs
- Diagnostics: `src/lib/rag/testing/test-diagnostics.ts` — checks RPC functions
- API route: `/api/rag/test/golden-set` — POST for regression testing
- Test page: `src/app/(dashboard)/rag/test/page.tsx`

### 2.6 What Does NOT Exist

| Item | Status | Impact |
|------|--------|--------|
| `rag_citations` table | **Does not exist** — citations stored as JSONB on `rag_queries.citations` column | Types reference `RAGCitation` interface but no separate table |
| KB-wide chat entry point in UI | No "Chat with Knowledge Base" button exists | Need new UI entry point |
| btree index on `rag_embeddings.knowledge_base_id` | **Missing** | KB-wide queries do full table scan on this column |
| `summary` field on `rag_knowledge_bases` | **Missing** | HyDE has no KB-level anchor for KB-wide queries |
| `knowledge_base_id` set during embedding insertion | **NOT SET** — `generateAndStoreEmbedding()` only writes `document_id` | Post-migration embeddings invisible to KB-wide search |
| Token limit enforcement in `assembleContext()` | **Not implemented** — `maxContextTokens: 100000` defined but never checked | Risk of exceeding Claude context window |
| Conversation context in response generation | **Missing** — only passed to HyDE, not to `generateResponse()` | Follow-up questions lose context |

---

## SECTION 3: THE SOLE BLOCKER

There is exactly **one guard clause** that prevents KB-wide queries from working. Everything else downstream already supports multi-document retrieval.

**File:** `src/lib/rag/services/rag-retrieval-service.ts`  
**Location:** Lines 667-670

```typescript
// Fail fast: documentId is required for all RAG modes to prevent cross-document contamination
if (!params.documentId && params.mode !== 'lora_only') {
  throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
}
```

**This guard must be replaced** with logic that accepts `knowledgeBaseId` as a valid alternative to `documentId`. When `documentId` is absent but `knowledgeBaseId` is present, the query should search across all `status = 'ready'` documents in that KB.

---

## SECTION 4: WHAT THE SPECIFICATION MUST COVER

The specification you write (`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\002-multi-doc-retrieval-specification_v1.md`) must address these categories in order:

### 4.1 Database Migrations (via SAOL)

The spec must include exact SQL for these migrations, all executed via SAOL `agentExecuteDDL`:

| Migration | Purpose | SQL Required |
|-----------|---------|-------------|
| Add `summary` to `rag_knowledge_bases` | KB-level HyDE anchor | `ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;` |
| Add btree index on `rag_embeddings.knowledge_base_id` | Performance for KB-wide vector search | `CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id ON rag_embeddings (knowledge_base_id);` |
| Add composite index | Tier-filtered KB search | `CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier ON rag_embeddings (knowledge_base_id, tier);` |
| Add `query_scope` to `rag_queries` | Track document vs KB query scope | `ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));` |
| Denormalize `knowledge_base_id` onto facts/sections | BM25 perf — avoid subquery join | `ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;` + backfill |
| Backfill NULL `knowledge_base_id` embeddings | Fix invisible embeddings | `UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;` |
| Extend `RAGCitation` type | Multi-doc provenance in citations | Add `documentId`, `documentName` fields |

### 4.2 Core Code Changes (by file)

#### `rag-retrieval-service.ts` — Primary changes

| Change | Lines | Description |
|--------|-------|-------------|
| Remove guard clause | 667-670 | Replace `throw` with logic accepting `knowledgeBaseId` as alternative. If neither `documentId` nor `knowledgeBaseId` provided AND mode ≠ `lora_only`, THEN throw. |
| KB-level HyDE | 742-770 | When no `documentId`: fetch KB summary from `rag_knowledge_bases.summary`. Fallback to `description`. Pass to `generateHyDE()` as anchor. |
| Scope conversation history | 751-760 | Filter `getQueryHistory` by `document_id` for doc-level queries, by `knowledge_base_id + document_id IS NULL` for KB-level queries. |
| Token-budgeted assembly | 215-310 | `assembleContext()` must count tokens (chars/4 estimate). Budget: 70% sections, 25% facts, 5% headers. Truncate at sentence boundary if exceeded. Return `tokenCount`. |
| Batch section/fact fetch | 100-130 | Replace N+1 `.single()` calls with batch `.in('id', allSourceIds)` — 2 queries instead of up to 60. |
| Reranker document provenance | 326-380 | For KB-wide queries, prepend `[Doc: {docName}]` to each reranker candidate. |
| Filter non-ready documents | 783-812 | Add `AND document_id IN (SELECT id FROM rag_documents WHERE status = 'ready')` to embedding search for KB-wide queries. |
| Lower KB-wide threshold | retrieval config | Use `0.3` similarity threshold for KB-wide queries vs `0.4` for single-doc. Add `kbWideSimilarityThreshold` to config. |
| Soft balance fallback | 441-470 | If `balanceMultiDocCoverage` drops >30% of results, fall back to top-N by similarity without balancing. Make ratio configurable in `RAG_CONFIG`. |
| Pass conversation context to response generation | 470-476 | Add `conversationHistory` parameter to `generateResponse()` so follow-up questions have context. |

#### `rag-embedding-service.ts` — Fix embedding insertion

| Change | Lines | Description |
|--------|-------|-------------|
| Set `knowledge_base_id` at insert | 28-62 | `generateAndStoreEmbedding()` must lookup `knowledge_base_id` from `rag_documents` and include it in the insert. |

#### `rag-ingestion-service.ts` — KB summary generation

| Change | Description |
|--------|-------------|
| Generate KB summary on document finalization | After a document finishes processing, regenerate the KB summary by concatenating first 200 tokens of each document summary in the KB. Store in `rag_knowledge_bases.summary`. |
| Set `knowledge_base_id` on facts and sections | When storing facts/sections during ingestion, include `knowledge_base_id` (lookup from document record). |

#### `src/types/rag.ts` — Type updates

| Change | Description |
|--------|-------------|
| Extend `RAGCitation` | Add `documentId?: string` and `documentName?: string` |
| Extend `RAGKnowledgeBase` | Add `summary?: string` |
| Add `query_scope` to `RAGQuery` | `queryScope: 'document' \| 'knowledge_base'` |

#### `src/lib/rag/config.ts` — Config additions

```typescript
retrieval: {
  // ...existing
  kbWideSimilarityThreshold: 0.3,  // NEW: lower threshold for KB-wide queries
  maxSingleDocRatio: 0.6,          // NEW: configurable (was hardcoded)
}
```

### 4.3 UI Changes

| Component | Change |
|-----------|--------|
| `KnowledgeBaseDashboard.tsx` | Add "Chat with Knowledge Base" button for each KB with ≥2 ready documents |
| `RAGChat.tsx` | Display document name on each citation when in KB-wide mode. Show scope indicator: "Searching: [Document Name]" vs "Searching: All documents in [KB Name]" |
| `DocumentList.tsx` | Show "Chat with all documents" link at top of document list when ≥2 ready documents |
| New: scope-switch UX | When user switches between doc-level and KB-level chat, start a new conversation session. Display a clear divider. |

### 4.4 Fault Tolerance Requirements

The spec MUST include these as mandatory requirements:

**Tier 1 — Critical (blocks functionality):**
1. Remove guard clause in `queryRAG()` — accept `knowledgeBaseId` as alternative to `documentId`
2. Fix `generateAndStoreEmbedding()` to set `knowledge_base_id` at insert time
3. Add backfill detection — on startup or via Inngest cron, identify and fix NULL `knowledge_base_id` embeddings
4. Add btree index on `rag_embeddings.knowledge_base_id`

**Tier 2 — High (quality/performance):**
5. Add KB-level summary field to `rag_knowledge_bases` (auto-generated from document summaries)
6. Implement token-budgeted `assembleContext()` with 100K limit enforcement
7. Filter out non-ready documents from query results (documents with `status != 'ready'` must not appear)
8. Batch-fetch sections/facts instead of N+1 pattern in `retrieveContext()`
9. Extend `RAGCitation` with `documentId` and `documentName` for multi-doc provenance

**Tier 3 — Medium (quality refinements):**
10. Lower similarity threshold for KB-wide queries (0.3 vs 0.4)
11. Soft-balance multi-doc coverage with fallback (don't hard-cut when it drops >30% of results)
12. HyDE fallback — use KB description when no summary available
13. Reranker document provenance — prepend doc name to candidates
14. Scope-aware conversation history — filter by doc vs KB scope
15. Atomic document re-processing — delete old sections/facts/embeddings + re-extract, not incremental
16. Pass conversation context to `generateResponse()` for follow-up question coherence

**Tier 4 — Low (observability):**
17. Log hybrid search disjoint-ratio metric (vectorOnly / bm25Only / overlap)
18. Log orphaned embedding references
19. Add `query_scope` column to `rag_queries`

### 4.5 What is NOT in Scope

The spec must explicitly EXCLUDE these:

| Excluded | Reason |
|----------|--------|
| GraphRAG / LazyGraphRAG | Phase 2+ — cross-KB queries. The existing multi-tier hierarchy (doc → section → fact) + BM25 hybrid + Claude reranking achieves most benefits for single-KB queries. |
| ColPali visual processing | Phase 3+ — current supported file types (PDF, DOCX, TXT, MD) are text-based. |
| Agentic RAG (multi-step reasoning) | Phase 3+ — overkill for KB-wide search over well-formatted documents. |
|Cross-KB search | Phase 2+ — each KB is an isolated search domain for now. |
| New document format support (XLSX, PPTX, OCR) | Not needed for current use case. |
| New npm dependencies | Zero new packages. All capabilities built with existing stack. |
| New deployment targets | All changes deploy to existing Vercel + Supabase infrastructure. |

### 4.6 Human Action Steps

The spec must clearly delineate any steps requiring human action (copy-paste ready, not buried in prose):

- SAOL migration execution (dry-run first, then apply)
- Any environment variable additions
- Vercel redeployment if needed
- Inngest function registration (if new functions added)

---

## SECTION 5: SPECIFICATION FORMAT REQUIREMENTS

### 5.1 Use the FR (Feature Requirement) Format

Structure the specification using numbered Feature Requirements, following the pattern in:  
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md`

Each FR must include:
- **FR-X.Y: Title**
- **Type:** (Data Model | Service Logic | API | UI | Config)
- **Description:** What to build
- **Implementation Strategy:** How it integrates with existing code
- **Dependencies:** What must exist before this FR
- **Exact file paths** and line references where changes go
- **Code snippets** showing the change (TypeScript, SQL, or JSX as appropriate)
- **Validation criteria:** How to verify the FR is correctly implemented

### 5.2 Section Structure

```
1. INTEGRATION SUMMARY (what we're adding, what we're NOT creating)
2. DATABASE MIGRATIONS (exact SQL, SAOL execution instructions)
3. FEATURE REQUIREMENTS (FR-1.1 through FR-N.N)
   - FR-1.x: Guard clause removal + KB-wide query support
   - FR-2.x: HyDE KB-level anchor
   - FR-3.x: Token-budgeted context assembly
   - FR-4.x: Performance optimizations (batch fetch, indexes)
   - FR-5.x: Embedding insertion fix
   - FR-6.x: KB summary auto-generation
   - FR-7.x: UI entry points for KB-wide chat
   - FR-8.x: Citation provenance for multi-doc
   - FR-9.x: Conversation scope management
   - FR-10.x: Config changes
4. HUMAN ACTION STEPS (clearly delineated, copy-paste ready)
5. TESTING & VALIDATION (golden set expansion, regression tests)
6. EXCLUDED SCOPE (explicit list of what this spec does NOT cover)
7. RISK ASSESSMENT
```

### 5.3 Style Requirements

- Every code snippet must include the **exact file path** and **line numbers** where it goes
- Every SQL migration must include SAOL execution syntax
- Human steps must be in clearly visible callout blocks
- Do not ask the coding agent to "investigate" or "determine" anything — all facts are pre-verified
- Do not include conditional language ("if this exists", "check whether") — state definitively
- Include estimated line counts for each change (small: <20 lines, medium: 20-50, large: 50+)

---

## SECTION 6: SAOL REQUIREMENTS

**All database operations MUST use the Supabase Agent Ops Library (SAOL).**

Full SAOL documentation:  
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\workfiles\supabase-agent-ops-library-use-instructions.md`

### Quick Reference

```javascript
// DDL operations (schema changes)
const result = await agentExecuteDDL({
  sql: 'ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first
});

// DML operations (data changes)
const result = await agentExecuteDDL({
  sql: `UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id 
        FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;`,
  transport: 'pg',
  transaction: true,
  dryRun: true,
});
```

### Key Rules
1. **Use Service Role Key** — operations require admin privileges
2. **Always dry-run first** — `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use the pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **No raw SQL** — do not use `supabase-js` or direct PostgreSQL for schema changes

---

## SECTION 7: REFERENCE DOCUMENTS

These documents contain the architectural rationale and design decisions. The spec-writing agent should reference them for context but does NOT need to re-verify their claims — all facts have been pre-verified in Section 2.

| Document | Contains |
|----------|----------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\004-multi-doc-environment-overview_v1.md` | Frontier RAG architecture overview, 7 technique assessments |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\006-multi-doc-explained_v1.md` | Technique-by-technique assessment with maturity/compatibility ratings |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\013-rag-multi-ingestion-upgrade_v1.md` | Full implementation spec for multi-pass ingestion (2823 lines) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\012-rag-ingestion-upgrade-and-integration_v2.md` | Architecture + James' decisions on phases/costs |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\original\012-input-prompt-multi-doc-environment_v1.md` | Multi-doc environment discussion |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md` | **Example of effective specification format** (FR pattern, 4127 lines) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\001-fault-tolerance-layer5-analysis_v1.md` | Complete fault tolerance analysis with 22 failure modes and mitigation matrix |

---

## SECTION 8: KEY DECISIONS (PRE-MADE BY JAMES)

These decisions are final. The spec must incorporate them without re-debating:

| Decision | Resolution |
|----------|-----------|
| Multi-doc scope | Each KB supports multiple documents; queries search across all `status = 'ready'` docs in the KB |
| GraphRAG | Deferred to Phase 2+. Not in this spec. |
| Document parsing | Already implemented (pdf-parse + mammoth). Consolidation is out of scope for this spec. |
| Cost per document | ~$0.72/doc for ingestion (6 passes). Acceptable. |
| Extraction target | 95% fact extraction coverage via 6-pass pipeline. Already achieved. |
| Document volume | 1-20 documents per KB per month. ~100 queries/day per KB. |
| Cross-KB search | Deferred. Each KB is isolated. |
| New dependencies | Zero. Everything built with existing stack. |
| Balance ratio | 60% max from any single document (configurable). Already implemented. |
| LoRA integration | Zero changes. LoRA endpoint receives assembled context string — it doesn't know/care about source doc count. `maxContextTokens: 100000` already caps context size. |
| Conversation context | Last 3 turns. Currently only fed to HyDE — spec must fix this to also feed to response generation. |

---

## SECTION 9: GETTING STARTED

### Before Writing the Specification

1. **Read this entire document** — it contains all pre-verified facts
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations
3. **Read the example spec** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md` to understand the FR format
4. **Read the SAOL guide** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\workfiles\supabase-agent-ops-library-use-instructions.md`
5. **Read the fault tolerance analysis** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\001-fault-tolerance-layer5-analysis_v1.md`

### Key Directories

```
v4-show//
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── rag/                  # RAG pages (dashboard, document, test)
│   │   └── api/
│   │       └── rag/                  # RAG API routes (12+ routes)
│   ├── components/
│   │   ├── rag/                      # 12 RAG UI components ⭐
│   │   └── ui/                       # shadcn/UI base components
│   ├── hooks/                        # 5 RAG hooks ⭐
│   ├── lib/
│   │   ├── rag/                      # RAG services + providers ⭐
│   │   │   ├── services/             # retrieval, embedding, ingestion, quality, db-mappers
│   │   │   ├── providers/            # claude-llm-provider, llm-provider interface
│   │   │   ├── testing/              # golden-set, diagnostics
│   │   │   └── config.ts             # Model names + retrieval thresholds
│   │   ├── file-processing/          # Text extraction (pdf-parse, mammoth)
│   │   └── supabase/                 # Supabase client
│   ├── inngest/
│   │   └── functions/
│   │       └── process-rag-document.ts  # 12-step pipeline ⭐
│   └── types/
│       └── rag.ts                    # All RAG types ⭐
├── pmc/                              # Product Management & Control
│   └── product/_mapping/
│       └── multi-doc/                # THIS spec lives here
├── supa-agent-ops/                   # SAOL library
├── scripts/                          # Utility + migration scripts
└── supabase/                         # Supabase config
```

### Write the Specification

Output the complete specification to:
```
C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v1.md
```

Ensure:
- All human action steps are clearly delineated with copy-paste commands
- All code changes include exact file paths and line references
- All SQL includes SAOL execution syntax
- The spec is self-contained — the coding agent should not need to read any other documents
- Every FR has validation criteria

---

**Document Owner:** Product Management & Control (PMC)  
**Prepared by:** 5-layer codebase investigation (database verification, pipeline trace, interface audit, quality calibration, fault tolerance analysis)
