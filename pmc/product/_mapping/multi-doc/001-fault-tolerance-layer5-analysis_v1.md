# Multi-Document Retrieval — Fault Tolerance Analysis (Layer 5)

**Date:** 2025-02-20
**Scope:** Every failure mode, edge case, and error pattern for multi-doc retrieval
**Source files verified:**
- `src/lib/rag/services/rag-retrieval-service.ts` (980 lines)
- `src/lib/rag/services/rag-embedding-service.ts` (300 lines)
- `src/types/rag.ts` (641 lines)
- `src/lib/rag/config.ts` (98 lines)
- `scripts/migrations/002-multi-doc-search.js` (190 lines)

---

## EXECUTIVE SUMMARY OF BLOCKERS

| # | Blocker | Severity | Current State |
|---|---------|----------|---------------|
| 1 | Guard clause throws on `!documentId` | **CRITICAL** | Line 667 — hard throw, no KB-wide queries possible |
| 2 | HyDE requires `documentSummary`, no KB-level summary exists | **HIGH** | `RAGKnowledgeBase` type has `description` only (no summary field, no topic taxonomy) |
| 3 | No btree index on `rag_embeddings.knowledge_base_id` | **HIGH** | Full table scan with cosine distance on every KB-wide query |
| 4 | `knowledge_base_id` can be NULL on embeddings | **HIGH** | Backfill ran once at migration; new ingestions may not set it |
| 5 | Context token limit has no enforcement | **MEDIUM** | `maxContextTokens: 100000` in config, but `assembleContext()` never checks it |
| 6 | Conversation history not scoped to chat session | **MEDIUM** | `getQueryHistory` returns last 3 queries by user+KB, not by session |

---

## CATEGORY A: RETRIEVAL FAILURES

### A1. KB-wide query returns 0 results
**Severity:** HIGH
**Current behavior:** Lines 783-812 — already have a zero-results handler that returns a friendly message ("I could not find relevant information") and stores `self_eval_passed: false, self_eval_score: 0`.
**Failure mode:** Works correctly for single-doc. For KB-wide: unreachable because guard clause (A0) throws first.
**Mitigation:**
- After removing guard clause, the existing zero-results path will work
- **Add to spec:** When zero results on KB-wide, the response MUST suggest: (a) trying a specific document, (b) rephrasing the query, (c) checking if documents have been fully processed

### A2. All results come from 1 document despite having multiple
**Severity:** MEDIUM
**Current behavior:** `balanceMultiDocCoverage()` (line 441) caps any single doc at `maxPerDocRatio = 0.6` (60%). If only 1 unique doc found, it returns results unmodified (`if (uniqueDocs.size <= 1) return results`).
**Failure mode:** If BM25 + vector search both score one doc higher for every fact, after capping at 60%, the remaining 40% slots may be EMPTY (no facts from other docs met threshold).
**Mitigation:**
- **Add to spec:** After `balanceMultiDocCoverage`, if result count dropped significantly (>30% reduction), log a warning and fall back to top-N by similarity without balancing
- The cap should be configurable in `RAG_CONFIG.retrieval.maxSingleDocRatio`
- Consider a "soft balance" that demotes over-represented docs by 0.1 similarity rather than hard-cutting

### A3. BM25 and vector search return completely disjoint results
**Severity:** LOW
**Current behavior:** `retrieveContext()` (lines 65-210) merges both into maps, keeping the higher similarity score per source ID. BM25 scores are normalized to `0.5 + (rank * 0.3)`.
**Failure mode:** Disjoint results are actually the POINT of hybrid search (each method catches what the other misses). But if they're fully disjoint, the result set is larger and the reranker becomes critical.
**Mitigation:**
- **Add to spec:** Log disjoint-ratio metric (`vectorOnly / bm25Only / overlap`) for tuning
- No code change needed — the reranker (Claude Haiku) will resolve relevance ranking post-merge

### A4. All similarity scores below threshold (0.4)
**Severity:** MEDIUM
**Current behavior:** `match_rag_embeddings_kb` RPC has `WHERE 1 - (e.embedding <=> query_embedding) > match_threshold`. If everything is below 0.4, returns empty → falls into zero-results path (A1).
**Failure mode:** KB-wide queries on broadly-worded topics may have lower per-document similarity than single-doc queries because the specificity anchor is weaker.
**Mitigation:**
- **Add to spec:** For KB-wide queries, lower the threshold to `0.3` (configurable as `RAG_CONFIG.retrieval.kbWideSimilarityThreshold`)
- Alternatively, if the first search returns 0 results and mode is KB-wide, retry with threshold lowered by 0.1
- Log the max similarity score found so operators can tune thresholds per KB

---

## CATEGORY B: HyDE WITHOUT DOCUMENT SUMMARY

### B1. No document summary available for KB-wide queries
**Severity:** HIGH
**Current behavior:** Lines 742-770:
```typescript
let documentSummary = '';
if (params.documentId) {
  // Only fetches if documentId exists
  const { data: docRow } = await supabase
    .from('rag_documents')
    .select('document_summary')
    .eq('id', params.documentId)
    .single();
  documentSummary = docRow?.document_summary || '';
}
// ...
if (documentSummary) {
  hydeText = await generateHyDE({ queryText: hydeInput, documentSummary });
}
```
For KB-wide queries (`!params.documentId`), `documentSummary` stays empty → HyDE is skipped entirely → only raw query embedding used.
**Impact:** HyDE typically improves recall by 15-25%. Skipping it for KB-wide queries (the hardest retrieval task) is a significant quality loss.
**Mitigation strategy (prioritized):**

1. **KB-level composite summary** (preferred):
   - **Add `summary` column to `rag_knowledge_bases` table** (currently only has `name`, `description`, `status`, `document_count`)
   - Auto-generate on document ingestion: concatenate first 200 tokens of each document summary
   - Use this as HyDE anchor for KB-wide queries
   - **Add to spec as REQUIREMENT**

2. **Multi-doc summary fallback**:
   - Fetch top 3 document summaries from the KB
   - Concatenate them (with doc names) as a composite summary
   - Risk: adds 1 extra DB query per KB-wide request

3. **Skip HyDE, use query expansion instead**:
   - Generate 2-3 query variations using Claude Haiku
   - Embed all variations and merge results
   - Avoids needing any summary at all

4. **Minimum fallback** (always implement):
   - Use `rag_knowledge_bases.description` as HyDE context if no summary available
   - **Add to spec:** `generateHyDE` MUST accept a `kbDescription` fallback parameter

### B2. HyDE generates hallucinated facts for unknown KBs
**Severity:** MEDIUM
**Current behavior:** `generateHyDE` asks Claude to write a "hypothetical answer" given a summary. With a weak/absent summary, the hypothetical answer may contain fabricated details.
**Impact:** Fabricated embedding anchor may retrieve WRONG content (high similarity to hallucination, not to real facts).
**Mitigation:**
- **Add to spec:** If summary confidence is low (< 100 chars or absent), prefix the HyDE prompt with "This is a broad knowledge base query — generate a general hypothetical answer using only common domain terminology"
- Consider adding a `hyde_confidence` field to the query row for observability

---

## CATEGORY C: CONTEXT ASSEMBLY AT SCALE

### C1. Embedding volume explosion — 20 docs × 30 sections × 100 facts
**Severity:** HIGH
**Scale analysis:**
- Current: 2 docs, 58 sections, 2,269 facts, 2,060 embeddings
- Projected at 20 docs: ~600 sections, ~23,000 facts, ~20,000+ embeddings
- `match_rag_embeddings_kb` computes cosine distance against ALL embeddings matching filters
- pgvector `<=>` operator triggers sequential scan without an IVFFlat or HNSW index

**Mitigation:**
- **CRITICAL — Add to spec:** Create HNSW index on `rag_embeddings.embedding` column:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_rag_embeddings_hnsw
  ON rag_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- **Add btree index** on `knowledge_base_id`:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id
  ON rag_embeddings (knowledge_base_id);
  ```
- **Add composite partial index** for tier filtering:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier
  ON rag_embeddings (knowledge_base_id, tier);
  ```

### C2. No token counting in `assembleContext()`
**Severity:** HIGH
**Current behavior:** `assembleContext()` (line 215) concatenates ALL retrieved sections and up to 20 facts with no token limit check. `RAG_CONFIG.retrieval.maxContextTokens = 100000` is defined but NEVER enforced.
**Failure mode:** With 10 retrieved sections (some may be 10K+ tokens each from policy documents) + 20 facts, context could exceed 100K tokens → Claude API error or truncated response.
**Mitigation:**
- **Add to spec as REQUIREMENT:** `assembleContext()` MUST implement token counting:
  ```
  1. Estimate tokens (chars / 4 as rough estimate, or use tiktoken)
  2. Add sections in similarity order until 70% of budget used
  3. Add facts in similarity order until 95% of budget used
  4. Reserve 5% for document summary/headers
  5. If budget exceeded, truncate last item at sentence boundary
  ```
- Return `tokenCount` alongside the assembled context string
- Log a warning if context was truncated

### C3. Reranker overloaded with many-doc candidates
**Severity:** MEDIUM
**Current behavior:** `rerankWithClaude()` (line 326) sends up to 15 candidates, each truncated to 500 chars. It asks Claude Haiku to return a ranked JSON array of indices.
**Failure mode:** With KB-wide search returning candidates from 10+ documents, the 500-char truncation may remove crucial cross-document distinguishing information. The reranker may not understand document provenance.
**Mitigation:**
- **Add to spec:** Prepend document name/ID to each candidate in the reranker prompt: `"[Doc: {docName}] {content_truncated}"`
- Increase content slice to 700 chars for KB-wide queries (still well within Haiku's context)
- Add `documentId` to the reranker's returned relevance score metadata

### C4. Cross-document deduplication false positives
**Severity:** LOW
**Current behavior:** `deduplicateResults()` (line 390) uses Jaccard word similarity > 0.9 threshold. Two facts from different documents using similar boilerplate language (common in policy documents) may be incorrectly deduplicated.
**Mitigation:**
- **Add to spec:** Before deduplication, check `documentId` — only deduplicate across documents (same doc with same text is already handled by embedding dedup). Two facts from different documents with >0.9 overlap should be marked as `cross_reference` rather than dropped.
- Log deduplicated items for observability

---

## CATEGORY D: CONCURRENT OPERATIONS

### D1. User queries KB while document is being ingested
**Severity:** HIGH
**Current behavior:** Document ingestion is a 12-step Inngest pipeline (retries: 3, concurrency: 5). Embeddings are written incrementally per section/fact. No transaction isolation between ingestion and query.
**Failure mode:**
- Partial results: user may see facts from sections 1-5 of a 10-section document
- `knowledge_base_id` backfill runs ONCE at migration time — new embeddings inserted during ingestion may have `knowledge_base_id = NULL` until the ingestion step that sets it
- Document status is `processing` during ingestion → if queried, the partial doc's facts appear in results

**Mitigation:**
- **Add to spec as REQUIREMENT:** `match_rag_embeddings_kb` MUST filter out embeddings from documents with status != 'ready':
  ```sql
  AND e.document_id IN (
    SELECT d.id FROM rag_documents d WHERE d.status = 'ready'
  )
  ```
- Alternative: add `is_searchable` boolean on embeddings, set to `true` only when document processing completes
- **Add to spec:** Display a UI indicator when a document in the KB is still processing

### D2. Two documents ingested simultaneously to same KB
**Severity:** MEDIUM
**Current behavior:** Inngest concurrency limit is 5. Two documents CAN be processed in parallel. Each runs independently.
**Failure mode:** No data integrity issue per se (each document writes to its own document_id rows). But `document_count` on `rag_knowledge_bases` may have a race condition if both increment simultaneously.
**Mitigation:**
- **Add to spec:** Use `UPDATE rag_knowledge_bases SET document_count = (SELECT COUNT(*) FROM rag_documents WHERE knowledge_base_id = $1 AND status = 'ready')` rather than `document_count + 1` increment

### D3. Race condition in `knowledge_base_id` backfill on embeddings
**Severity:** HIGH
**Current behavior:** `generateAndStoreEmbedding()` (line 28-62) writes embeddings with `document_id` but does NOT set `knowledge_base_id`. The backfill was a one-time migration operation:
```sql
UPDATE rag_embeddings e SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;
```
**Failure mode:** Every embedding created AFTER the migration has `knowledge_base_id = NULL` → invisible to KB-wide searches via `match_rag_embeddings_kb(filter_knowledge_base_id = X)`.
**Mitigation:**
- **CRITICAL — Add to spec as REQUIREMENT:** `generateAndStoreEmbedding()` MUST set `knowledge_base_id` at insert time:
  ```typescript
  // Lookup KB ID from document
  const { data: doc } = await supabase
    .from('rag_documents')
    .select('knowledge_base_id')
    .eq('id', documentId)
    .single();
  
  // Insert with KB ID
  .insert({
    ...existing_fields,
    knowledge_base_id: doc?.knowledge_base_id || null,
  })
  ```
- Add a scheduled job (or Inngest cron) to backfill any NULL `knowledge_base_id` rows daily as a safety net

---

## CATEGORY E: DATA INTEGRITY

### E1. Embedding with `knowledge_base_id = NULL`
**Severity:** CRITICAL
**Root cause:** See D3 above. `generateAndStoreEmbedding()` never writes `knowledge_base_id`.
**Impact:** ALL embeddings created after the 002 migration are invisible to KB-wide queries. This is the MOST CRITICAL bug.
**Verification query:**
```sql
SELECT COUNT(*) FROM rag_embeddings WHERE knowledge_base_id IS NULL;
```
**Mitigation:** Same as D3 — fix at insert time + add backfill cron

### E2. Document deleted mid-query
**Severity:** LOW
**Current behavior:** `retrieveContext()` fetches full section/fact rows by ID after embedding search. If the document was deleted between embedding search and section/fact fetch, the `.single()` call returns null.
**Failure mode:** The null check doesn't exist — `sectionMap.set(result.sourceId, { section: mapRowToSection(sectionRow), ... })` would fail if `sectionRow` is null.
**Wait — code check:** Line 111: `if (sectionRow) { sectionMap.set(...) }` — the null check EXISTS. Same at line 128 for facts.
**Residual risk:** Embedding search returns IDs, but the sections/facts they point to are gone. Results will have fewer items than expected, but won't crash.
**Mitigation:**
- **Add to spec:** Log a warning when an embedding references a deleted section/fact (orphan embedding indicator)
- Add a cleanup job: when a document is deleted, also delete its embeddings (already exists in `deleteDocumentEmbeddings()`)

### E3. Facts reference sections that have been re-extracted
**Severity:** MEDIUM
**Current behavior:** Facts have `section_id` FK. If a document is re-processed (version increment), old sections are presumably replaced.
**Failure mode:** If old sections are deleted but old facts remain, facts point to non-existent sections. If old sections remain alongside new ones, duplicate/conflicting facts appear in results.
**Mitigation:**
- **Add to spec:** Document re-processing MUST:
  1. Delete old embeddings (`deleteDocumentEmbeddings()` — exists)
  2. Delete old facts
  3. Delete old sections
  4. Re-extract everything
  5. Re-generate embeddings
  - This is an atomic replace pattern, not an incremental update

---

## CATEGORY F: UI/UX EDGE CASES

### F1. Switching from single-doc to KB-wide chat
**Severity:** MEDIUM
**Current behavior:** `getQueryHistory()` filters by `documentId` OR `knowledgeBaseId`. If user switches from doc-level to KB-level, conversation history includes doc-specific Q&A that may be confusing in KB-wide context.
**Mitigation:**
- **Add to spec:** When switching scope (doc → KB or KB → doc), start a new conversation session. Display a clear divider in UI: "Switched to Knowledge Base-wide search"
- Add a `scope` field to `rag_queries`: `'document' | 'knowledge_base'` so history can be filtered properly

### F2. Citation display spanning multiple documents
**Severity:** MEDIUM
**Current behavior:** Citations are `RAGCitation[]` with `sectionId, sectionTitle, excerpt, relevanceScore`. There is NO `documentId` or `documentName` field on citations.
**Failure mode:** When results come from multiple documents, citations show `[Section: Jumbo Mortgage]` but user can't tell WHICH document that section belongs to.
**Mitigation:**
- **Add to spec as REQUIREMENT:** Extend `RAGCitation` type:
  ```typescript
  export interface RAGCitation {
    sectionId: string;
    sectionTitle: string;
    excerpt: string;
    relevanceScore: number;
    documentId?: string;      // NEW
    documentName?: string;    // NEW
  }
  ```
- Response generation prompt MUST include document name in citations: `[Doc: BC-PROD-004, Section: Jumbo Mortgage]`

### F3. Conversation history when switching scope
**Severity:** LOW
**Current behavior:** Lines 751-760 — `getQueryHistory` fetches last 3 queries for the user+KB, regardless of document scope. This means:
- Doc-level chat sees KB-level history as conversation context
- KB-level chat sees doc-level history
**Impact:** HyDE quality may degrade if conversation context mixes scopes.
**Mitigation:**
- **Add to spec:** Filter conversation history by `document_id` when querying at document level, and by `knowledge_base_id` (with `document_id IS NULL`) when querying at KB level
- Add `query_scope` column to `rag_queries` table

---

## CATEGORY G: PERFORMANCE & LATENCY (Not in original request, but critical)

### G1. N+1 query pattern in `retrieveContext()`
**Severity:** HIGH
**Current behavior:** Lines 100-130 — For EACH embedding match, a separate `.select().eq('id', sourceId).single()` query fetches the full section/fact row. With 10 sections + 20 facts from both query AND HyDE text = up to 60 individual DB queries.
**Mitigation:**
- **Add to spec:** Batch fetch: collect all `sourceId`s first, then do ONE query with `.in('id', allSourceIds)`
- Expected improvement: 60 queries → 2 queries (sections + facts)

### G2. BM25 search on KB-filtered facts uses subquery join
**Severity:** MEDIUM
**Current behavior:** `search_rag_text` RPC filters KB via subquery:
```sql
WHERE f.document_id IN (
  SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = $1
)
```
**Mitigation:**
- **Add to spec:** Add `knowledge_base_id` directly to `rag_facts` and `rag_sections` tables (denormalized, like `rag_embeddings`) to avoid the join
- Or create a view/materialized view for KB-scoped facts

---

## COMPLETE MITIGATION MATRIX

| ID | Failure Mode | Severity | Mitigation | Must be in V2 Prompt? |
|----|-------------|----------|------------|----------------------|
| A0 | Guard clause blocks KB-wide queries | CRITICAL | Remove throw, allow `knowledgeBaseId` as alternative to `documentId` | **YES** |
| A1 | KB-wide returns 0 results | HIGH | Existing handler works; add scope-specific suggestions | YES |
| A2 | Single-doc dominates results | MEDIUM | Soft balance with fallback; configurable ratio | YES |
| A3 | BM25/vector disjoint | LOW | Log metric for tuning | No |
| A4 | All scores below threshold | MEDIUM | Lower threshold for KB-wide; retry with lower threshold | YES |
| B1 | No HyDE anchor for KB-wide | HIGH | Add `summary` to `rag_knowledge_bases`; fallback to description | **YES** |
| B2 | HyDE hallucinations without summary | MEDIUM | Constrain HyDE prompt for weak-summary cases | YES |
| C1 | Embedding volume at scale | HIGH | HNSW index + btree index on `knowledge_base_id` | **YES** |
| C2 | No token limit in assembleContext | HIGH | Token-budgeted context assembly | **YES** |
| C3 | Reranker without doc provenance | MEDIUM | Prepend doc name to reranker candidates | YES |
| C4 | Cross-doc dedup false positives | LOW | Check documentId before dedup | No |
| D1 | Query during ingestion | HIGH | Filter embeddings by document status='ready' | **YES** |
| D2 | Concurrent ingestion | MEDIUM | Use COUNT subquery for document_count | No |
| D3 | knowledge_base_id not set on insert | CRITICAL | Fix `generateAndStoreEmbedding()` to include KB ID | **YES** |
| E1 | NULL knowledge_base_id embeddings | CRITICAL | Same fix as D3 + backfill cron | **YES** |
| E2 | Document deleted mid-query | LOW | Already handled; add orphan logging | No |
| E3 | Re-extracted sections orphan facts | MEDIUM | Atomic replace pattern for re-processing | YES |
| F1 | Scope switching confusion | MEDIUM | New conversation session on scope change; scope field | YES |
| F2 | Citations missing document identity | MEDIUM | Extend RAGCitation with documentId/documentName | **YES** |
| F3 | Mixed-scope conversation history | LOW | Filter history by query_scope | YES |
| G1 | N+1 queries in retrieveContext | HIGH | Batch fetch with `.in('id', ids)` | **YES** |
| G2 | BM25 KB filter uses subquery | MEDIUM | Denormalize knowledge_base_id onto facts/sections | YES |

---

## REQUIREMENTS THAT MUST BE IN THE V2 PROMPT

The v2 prompt MUST instruct the spec-writing agent to include these as mandatory requirements:

### Tier 1 — CRITICAL (blocks functionality)
1. **Remove guard clause** in `queryRAG()` — accept `knowledgeBaseId` as alternative to `documentId`
2. **Fix `generateAndStoreEmbedding()`** to set `knowledge_base_id` at insert time
3. **Add backfill detection** — on startup or via cron, identify and fix NULL `knowledge_base_id` embeddings
4. **Add btree index** on `rag_embeddings.knowledge_base_id`

### Tier 2 — HIGH (significant quality/perf impact)
5. **Add KB-level summary** field to `rag_knowledge_bases` (auto-generated from document summaries)
6. **Implement token-budgeted `assembleContext()`** with 100K limit enforcement
7. **Add HNSW index** on `rag_embeddings.embedding` for vector search performance at scale
8. **Filter out non-ready documents** from query results
9. **Batch-fetch sections/facts** instead of N+1 pattern in `retrieveContext()`
10. **Extend `RAGCitation`** with `documentId` and `documentName`

### Tier 3 — MEDIUM (quality refinements)
11. **Lower similarity threshold** for KB-wide queries (0.3 vs 0.4)
12. **Soft-balance** multi-doc coverage with fallback
13. **HyDE fallback** — use KB description when no summary available
14. **Reranker document provenance** — prepend doc name to candidates
15. **Scope-aware conversation history** — filter by doc vs KB scope
16. **Atomic document re-processing** — delete old + re-extract, not incremental update
17. **Denormalize `knowledge_base_id`** onto `rag_facts` and `rag_sections` for BM25 perf

### Tier 4 — LOW (observability & edge cases)
18. Log hybrid search disjoint-ratio metric
19. Log orphaned embedding references
20. Log cross-document dedup decisions
21. Add `query_scope` column to `rag_queries`

---

## DATABASE MIGRATION REQUIREMENTS

The spec MUST include these SQL migrations:

```sql
-- 1. KB summary field
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. Btree index for KB-wide embedding search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_id
ON rag_embeddings (knowledge_base_id);

-- 3. Composite index for tier-filtered KB search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_kb_tier
ON rag_embeddings (knowledge_base_id, tier);

-- 4. HNSW index for vector search at scale (run in low-traffic window)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_hnsw
ON rag_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Query scope tracking
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_scope TEXT
  DEFAULT 'document' CHECK (query_scope IN ('document', 'knowledge_base'));

-- 6. Backfill any NULL knowledge_base_id embeddings
UPDATE rag_embeddings e
SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d
WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;

-- 7. Denormalize KB ID onto facts and sections for BM25 perf
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;
ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

UPDATE rag_facts f SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE f.document_id = d.id AND f.knowledge_base_id IS NULL;

UPDATE rag_sections s SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d WHERE s.document_id = d.id AND s.knowledge_base_id IS NULL;
```

---

## FUNCTION-LEVEL CHANGE MAP

| Function | File | Line | Change Required |
|----------|------|------|----------------|
| `queryRAG()` | rag-retrieval-service.ts | 667 | Remove guard clause; accept `knowledgeBaseId` without `documentId` |
| `queryRAG()` | rag-retrieval-service.ts | 742-750 | Fetch KB summary when no documentId; fallback to description |
| `queryRAG()` | rag-retrieval-service.ts | 762-770 | Use KB summary or description for HyDE when no doc summary |
| `queryRAG()` | rag-retrieval-service.ts | 751-760 | Scope conversation history by query_scope |
| `retrieveContext()` | rag-retrieval-service.ts | 100-130 | Batch-fetch sections/facts instead of N+1 |
| `assembleContext()` | rag-retrieval-service.ts | 215-310 | Add token budget enforcement |
| `balanceMultiDocCoverage()` | rag-retrieval-service.ts | 441-470 | Add soft-balance fallback when hard cap drops too many results |
| `rerankWithClaude()` | rag-retrieval-service.ts | 326-380 | Prepend document name to candidates for KB-wide queries |
| `generateAndStoreEmbedding()` | rag-embedding-service.ts | 28-62 | Add `knowledge_base_id` lookup and set at insert time |
| `searchSimilarEmbeddings()` | rag-embedding-service.ts | 130-180 | Accept lower threshold for KB-wide queries |
| `generateHyDE()` | rag-retrieval-service.ts | 42-58 | Accept optional `kbSummary` / `kbDescription` as HyDE anchor |
| `RAGCitation` (type) | rag.ts | ~180 | Add `documentId`, `documentName` fields |
| `RAGKnowledgeBase` (type) | rag.ts | 76-84 | Add `summary` field |
| `match_rag_embeddings_kb` | 002 migration | SQL RPC | Add document status filter |
| `search_rag_text` | 002 migration | SQL RPC | Use denormalized `knowledge_base_id` on facts/sections |
