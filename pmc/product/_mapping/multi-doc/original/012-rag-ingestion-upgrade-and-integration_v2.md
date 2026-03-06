# 012 — RAG Multi-Document Ingestion Upgrade & Integration Architecture v1.0

**Date:** February 16, 2026
**Author:** AI Assistant (Antigravity)
**Status:** ARCHITECTURE COMPLETE — READY FOR REVIEW
**Prerequisite:** `011-rag-ingestion-upgrade_v1.md` (5-pass ingestion pipeline spec)
**Scope:** Multi-document RAG capabilities layered on top of the 011 ingestion upgrade

---

# Part 1: Current State Assessment

## 1.1 Codebase Inventory

| Component | File | Lines | Role |
|-----------|------|-------|------|
| RAG Types | `src/types/rag.ts` | 530 | All interfaces, enums, request/response types |
| Ingestion Service | `src/lib/rag/services/rag-ingestion-service.ts` | 592 | Upload, text extraction, single-pass LLM processing |
| Retrieval Service | `src/lib/rag/services/rag-retrieval-service.ts` | 633 | HyDE, multi-tier search, context assembly, Claude/LoRA response |
| Embedding Service | `src/lib/rag/services/rag-embedding-service.ts` | 196 | OpenAI embeddings, pgvector similarity search |
| Quality Service | `src/lib/rag/services/rag-quality-service.ts` | 185 | Claude-as-Judge 5-dimension scoring |
| Expert Q&A Service | `src/lib/rag/services/rag-expert-qa-service.ts` | 355 | Expert-in-the-loop refinement |
| Claude LLM Provider | `src/lib/rag/providers/claude-llm-provider.ts` | 473 | Claude API calls for all LLM operations |
| OpenAI Embedding Provider | `src/lib/rag/providers/openai-embedding-provider.ts` | 69 | OpenAI text-embedding-3-small |
| Config | `src/lib/rag/config.ts` | 81 | All RAG configuration constants |
| DB Mappers | `src/lib/rag/services/rag-db-mappers.ts` | 186 | snake_case → camelCase row mappers |
| Inngest Function | `src/inngest/functions/process-rag-document.ts` | 98 | Background document processing trigger |
| **RAG Module Total** | | **~2,900** | |
| **Full Codebase** | 620 files | **~10,000** | Next.js app + all modules |

## 1.2 Current Architecture (Single-Document, Single-Pass)

```
User Upload → Supabase Storage → Inngest Event
                                      ↓
                              processDocument()
                                      ↓
                          Single Claude Haiku Call
                         (readDocument: full doc → JSON)
                                      ↓
                    ┌─────────────┬────────────────┐
                    ↓             ↓                ↓
               Sections(10)  Facts(109)    Expert Questions(5)
                    ↓             ↓
              Preamble Gen   Store Facts
              (Haiku × 10)
                    ↓
            3-Tier Embeddings (OpenAI)
            Tier 1: Document summary (1)
            Tier 2: Section preamble+summary (10)
            Tier 3: Fact content (109)
                    ↓
              Status → 'ready'
```

**Query Path (Current):**
```
User Query → HyDE (Haiku, ~500ms)
               ↓
           Embed query (OpenAI, ~200ms)
               ↓
           pgvector search: Tier 2 + Tier 3
           filter_document_id + filter_tier
           (~50ms)
               ↓
           Fetch full sections/facts from DB (~100ms)
               ↓
           Assemble context string
               ↓
      ┌────────┴────────┐
      ↓                 ↓
  RAG-only          RAG+LoRA
  Claude Haiku      RunPod endpoint
  (~2-3s)           (~5-15s)
      ↓                 ↓
      └────────┬────────┘
               ↓
           Self-RAG eval (Haiku, ~500ms)
               ↓
           Store query + score
```

**Key Constraint:** Current retrieval always scopes to a single `documentId`. There is no cross-document or KB-wide search path.

## 1.3 What 011 Proposes (Per-Document Ingestion Quality)

The 011 spec identifies that the single-pass ingestion captures only **26% of document content** (109 of ~417 extractable facts for the Sun Chip bank policy document). It proposes:

1. **5-pass extraction pipeline** (structure → policies → tables → glossary → narrative)
2. **Per-section LLM calls** instead of one monolithic call
3. **Enhanced fact schema** with `policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category`
4. **Enriched embedding text** with policy context prefixes
5. **Inngest multi-step workflow** with per-pass retry
6. **Relationship linking** (code-only, no LLM)

**011 is focused entirely on per-document extraction quality.** It does not address multi-document retrieval, cross-document search, or KB-wide operations.

---

# Part 2: Answers to the Seven Questions

## Q1: Should multi-doc functionality be built into the 011 ingestion pipeline iteration?

**Answer: YES for the storage/schema layer. NO for the retrieval layer — that's a separate iteration.**

The 011 ingestion upgrade **already lays the critical groundwork** for multi-document by:

| 011 Feature | Multi-Doc Benefit |
|-------------|-------------------|
| `policy_id` on facts | Enables metadata-filtered retrieval across documents |
| `fact_category` field | Enables category-scoped queries ("all limits across all docs") |
| `parent_fact_id` links | Enables cross-reference traversal |
| Enriched embedding text | Improves corpus-wide vector search precision |
| Structured extraction passes | Creates consistent data quality across all documents |

**What should be added to the 011 ingestion spec to enable multi-doc:**

1. **`knowledge_base_id` on embeddings table** — Currently embeddings link to `document_id` only. Add `knowledge_base_id` for efficient KB-wide queries without joins.
2. **Document fingerprinting** — Hash the `original_text` to detect re-uploads and prevent duplicates (the 7 Sun Chip copies problem).
3. **Embedding metadata enrichment** — Store `document_title`, `section_title`, and `fact_category` in the embedding metadata column so retrieval can filter without DB lookups.

These are small additions to 011 (< 50 lines of code) that prevent having to backfill later.

**What should NOT be in 011 (save for the retrieval iteration):**
- KB-wide search logic
- Multi-document result merging
- Cross-document deduplication
- Contradiction detection
- Document update/replace workflows

> **Recommendation:** Proceed with 011 as designed, adding only the 3 metadata/schema items listed above. Then build multi-doc retrieval as Phase 2.

---

## Q2: What functionality is missing that we haven't named?

Six significant capabilities are missing from the combined 011 + 012 feature lists:

### 2.1 Hybrid Search (BM25 + Vector)

**Gap:** The current system is purely vector search (pgvector cosine similarity). The 012 feature list mentions "semantic + literal matching" but doesn't specify how.

**Why it matters:** Vector search excels at semantic similarity but fails on exact keyword matches. If a user asks "What is the BCCC ceremony?" and the fact content says "Sun Chip Confirmation Ceremony (BCCC)", vector search may not rank this highest because the embedding focuses on semantic meaning, not the acronym.

**Solution:** Add Postgres `tsvector` full-text search alongside pgvector. Query both in parallel, merge results with weighted scoring:

```sql
-- Already possible in Supabase Postgres, no new tools needed
ALTER TABLE rag_facts ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX idx_rag_facts_tsv ON rag_facts USING gin(content_tsv);
```

**Estimated effort:** ~100 lines of code. Zero new dependencies.

### 2.2 Document Update/Replace Flow

**Gap:** No mechanism to update a document. Re-uploading creates a new record (causing the 7 Sun Chip duplicates). The feature list mentions "freshness + change handling" but the codebase has no implementation path.

**Why it matters:** Business documents get revised. Without an update flow, the KB accumulates stale duplicates.

**Solution:** Add a `replaceDocument` function that:
1. Archives the old document (status → 'archived')
2. Deletes old embeddings
3. Creates new document record with `version: oldDoc.version + 1`
4. Re-runs the ingestion pipeline

### 2.3 Query Routing / Scope Detection

**Gap:** Currently the frontend forces the user to select a specific document to query. There is no automatic detection of whether a query should search one document, a subset, or the entire KB.

**Why it matters:** For non-technical users, having to pick the right document before asking a question is friction. The system should handle "Which policy covers wire transfers over $10M?" by searching the entire KB.

**Solution:** Default to KB-wide search. If the user has a document open in the UI, optionally scope to that document. Let the retrieval system find the right documents.

### 2.4 Cross-Encoder Reranking

**Gap:** Not mentioned in either spec. The vector search returns top-k results by cosine similarity, but cosine similarity is a rough proxy for relevance.

**Why it matters:** A cross-encoder reranker significantly improves retrieval precision by evaluating query-passage pairs jointly. This is the single highest-ROI improvement for retrieval quality.

**Solution:** Use Claude Haiku as a lightweight reranker (no new tool). After pgvector returns top-20 candidates, send them to Haiku with: "Rank these passages by relevance to the query." Cost: ~$0.001/query. Latency: +300-500ms.

### 2.5 Streaming Responses

**Gap:** The current query path waits for complete JSON from Claude before returning. The user sees nothing for 3-5 seconds.

**Why it matters:** Chat UX expects streaming. The perceived responsiveness difference between "wait 4 seconds" and "see tokens appear at 500ms" is massive for the non-technical persona.

**Solution:** Can be deferred to a later phase. The current JSON response format makes streaming harder (need to switch to text + structured citations). Mark as a future optimization. Yes, I James, agree with this deferrment.

### 2.6 Conversation Context in RAG Queries

**Gap:** Each RAG query is stateless. No memory of what was previously asked in the conversation.

**Why it matters:** Users naturally ask follow-up questions. "What's the DTI limit?" followed by "What about for high-liquidity clients?" — the second query needs context from the first.

**Solution:** Pass the last 2-3 query/response pairs as context in the HyDE and response generation prompts. No schema changes needed — just modify the prompt construction in `rag-retrieval-service.ts`.

---

## Q3: Will all functionality work with whole-document ingestion?

**Answer: YES.** Every feature in both the 011 pipeline and the multi-doc capability list is compatible with whole-document ingestion. Here is the analysis:

| Feature | Compatibility | Notes |
|---------|---------------|-------|
| 5-pass extraction | ✅ Full | Pass 1 processes the whole doc for structure; Passes 2-5 process sections individually |
| Corpus-scale querying | ✅ Full | pgvector indexes all embeddings regardless of source document size |
| Document-scoped retrieval | ✅ Full | Filter by `document_id` in pgvector search (already implemented) |
| Metadata filters | ✅ Full | Postgres WHERE clauses work on any column |
| Provenance + citations | ✅ Full | The 011 schema adds `policy_id`, `section_id`, `subsection` to every fact |
| Multi-doc coverage | ✅ Full | KB-wide search naturally returns results from multiple documents |
| De-duplication | ✅ Full | Compare embedding similarity between results; drop near-duplicates |
| Hybrid search | ✅ Full | `tsvector` indexes work on any text column |
| Hierarchical understanding | ✅ Full | 3-tier embedding hierarchy (doc → section → fact) already exists |
| Graceful not-found | ✅ Full | Self-RAG evaluation already returns `passed: false` for low-confidence |
| Permission-aware | ✅ Full | Supabase RLS already filters by `user_id`; KB-level RLS is straightforward |
| LoRA cooperation | ✅ Full | The `assembledContext` string is the same regardless of how many documents contributed to it |

**One edge case to handle:** Documents exceeding ~180K tokens (the `singlePassMaxTokens` config). For Pass 1 (structure analysis), the full document is sent to Claude. Solution:

- For docs ≤ 180K tokens (~135 pages): Single Pass 1 call as designed
- For docs > 180K tokens: Split into overlapping chunks for Pass 1, merge the structural maps, then proceed with Passes 2-5 per section as normal

This affects < 5% of business documents and can be deferred to after the core pipeline works. I James, agree with this deferrment.

---

## Q4: Should we do this in phases? How?

**Answer: Absolutely yes. Four phases.**

### Phase 1: Ingestion Quality (The 011 Upgrade)
**Goal:** Raise per-document extraction from 26% to 90%+
**Scope:**

| Task | Files Changed | New Lines | Priority |
|------|--------------|-----------|----------|
| Split `readDocument()` into 5 pass methods | `claude-llm-provider.ts` | ~400 | Critical |
| Update `processDocument()` for multi-pass | `rag-ingestion-service.ts` | ~200 | Critical |
| Inngest multi-step workflow | `process-rag-document.ts` | ~80 | Critical |
| Enhanced fact schema (DB migration) | New SQL migration | ~20 | Critical |
| Update TypeScript types | `types/rag.ts` | ~40 | Critical |
| Enriched embedding text | `rag-ingestion-service.ts` | ~30 | Critical |
| Relationship linking function | `rag-ingestion-service.ts` | ~60 | High |
| Document fingerprinting (de-dup uploads) | `rag-ingestion-service.ts` | ~30 | Medium |
| Add `knowledge_base_id` to embeddings | DB migration + embedding service | ~20 | Medium |
| Embed metadata enrichment | `rag-embedding-service.ts` | ~20 | Medium |
| **Phase 1 Total** | | **~900 lines** | |

**Estimated sessions:** 2-3
**Risk:** Low — changes are isolated to ingestion path; retrieval path unchanged
**Validation:** Reprocess Sun Chip document, compare fact count (target: 350+ vs current 109)

### Phase 2: Multi-Document Retrieval Foundation
**Goal:** Enable KB-wide search across all documents
**Scope:**

| Task | Files Changed | New Lines | Priority |
|------|--------------|-----------|----------|
| KB-wide pgvector search RPC | New SQL function | ~40 | Critical |
| Update `searchSimilarEmbeddings()` for KB scope | `rag-embedding-service.ts` | ~40 | Critical |
| Update `retrieveContext()` for multi-doc | `rag-retrieval-service.ts` | ~80 | Critical |
| Multi-doc context assembly | `rag-retrieval-service.ts` | ~60 | Critical |
| Hybrid search (tsvector + pgvector) | `rag-embedding-service.ts` + SQL | ~120 | High |
| Document update/replace flow | `rag-ingestion-service.ts` | ~80 | High |
| Update API routes for KB-wide queries | `api/rag/query/route.ts` | ~30 | High |
| Balanced multi-doc coverage logic | `rag-retrieval-service.ts` | ~50 | Medium |
| **Phase 2 Total** | | **~500 lines** | |

**Estimated sessions:** 2
**Risk:** Medium — changes the retrieval path, needs thorough testing
**Validation:** Query Sun Chip KB with multi-doc, verify results pull from correct documents

### Phase 3: Retrieval Quality
**Goal:** Improve answer accuracy and handle edge cases
**Scope:**

| Task | Files Changed | New Lines | Priority |
|------|--------------|-----------|----------|
| Claude Haiku reranking pass | `rag-retrieval-service.ts` | ~60 | High |
| Cross-document deduplication | `rag-retrieval-service.ts` | ~50 | High |
| Improved "not found" with suggestions | `rag-retrieval-service.ts` | ~40 | High |
| Conversation context (last 2-3 turns) | `rag-retrieval-service.ts` | ~40 | Medium |
| Contradiction surfacing | `rag-retrieval-service.ts` | ~60 | Medium |
| Query routing (auto-scope detection) | `rag-retrieval-service.ts` | ~50 | Medium |
| **Phase 3 Total** | | **~300 lines** | |

**Estimated sessions:** 1-2
**Risk:** Low-Medium — additive changes to retrieval path
**Validation:** Run the 20-question regression test suite (to be built)

### Phase 4: Operational Polish
**Goal:** Observability, feedback, and regression safety
**Scope:**

| Task | Files Changed | New Lines | Priority |
|------|--------------|-----------|----------|
| Query logging dashboard API | New API route | ~80 | Medium |
| Feedback hooks (thumbs up/down) | API + DB + service | ~100 | Medium |
| Document coverage visualization | API endpoint | ~60 | Low |
| Regression test suite (20+ Q&A pairs) | New test files | ~200 | High |
| Cleanup duplicate documents tool | Script/API | ~40 | Medium |
| **Phase 4 Total** | | **~480 lines** | |

**Estimated sessions:** 1-2

### Phase Summary

| Phase | New Lines | Sessions | Cumulative RAG Module Size |
|-------|-----------|----------|---------------------------|
| Current | — | — | ~2,900 lines |
| Phase 1 | ~900 | 2-3 | ~3,800 lines |
| Phase 2 | ~500 | 2 | ~4,300 lines |
| Phase 3 | ~300 | 1-2 | ~4,600 lines |
| Phase 4 | ~480 | 1-2 | ~5,100 lines |
| **Total** | **~2,180** | **6-9** | **~5,100 lines** |

> The RAG module grows from ~2,900 to ~5,100 lines — a 76% increase for 4× extraction coverage, multi-document search, hybrid retrieval, reranking, and operational observability. This keeps the RAG module proportional to the overall codebase (~10K lines).

---

## Q5: Chat Responsiveness Impact

### Ingestion Path (Background — No User-Facing Latency)

| Step | Current | After Phase 1 | Impact |
|------|---------|---------------|--------|
| Claude API calls | 1 Haiku call (~2-5 min) | ~18-20 Haiku + 2 Sonnet calls (~5-15 min) | **Background only — user doesn't wait** |
| Embedding generation | 120 embeddings | ~420 embeddings | **Background only** |
| Total time | 2-5 min | 5-15 min | **Zero impact on chat** |
| Total cost | ~$0.03/doc | ~$0.18/doc | Negligible for business customers |

All ingestion happens in Inngest. The user uploads a document and sees a progress indicator. They never wait synchronously.

### Query Path (User-Facing — Latency Matters)

| Step | Current (ms) | After Phase 2+3 (ms) | Delta |
|------|-------------|----------------------|-------|
| HyDE generation (Haiku) | ~500 | ~500 | 0 |
| Query embedding (OpenAI) | ~200 | ~200 | 0 |
| pgvector search | ~50 | ~80 (KB-wide, slightly more results) | +30 |
| tsvector search | — | ~30 (new, parallel with pgvector) | +30 |
| Merge + dedup results | — | ~5 (code-only) | +5 |
| **Reranking (Haiku)** | — | **~400** (new, optional) | **+400** |
| Section/fact DB lookups | ~100 | ~120 (slightly more results) | +20 |
| Context assembly | ~1 | ~5 | +4 |
| Claude response gen (Haiku) | ~2,500 | ~2,500 | 0 |
| Self-RAG eval (Haiku) | ~500 | ~500 | 0 |
| **Total (RAG-only)** | **~3,850** | **~4,340** | **+490ms** |

**Net impact: +490ms (+13%) for significantly better retrieval quality.** The reranking step alone is responsible for +400ms of that. If latency is critical, reranking can be made optional or applied only when the top results have similar scores (indicating ambiguity).

**RAG+LoRA path:** The RunPod endpoint call (5-15 seconds) dominates. The +490ms is absorbed into that wait time and is imperceptible.

### Optimization Levers (If Needed Later)

| Optimization | Saves | Effort |
|--------------|-------|--------|
| Skip HyDE for short/specific queries | ~500ms | Low |
| Cache common query embeddings | ~200ms | Low |
| Skip reranking when top-1 is high confidence | ~400ms | Low |
| Skip self-eval for high-confidence responses | ~500ms | Low |
| Streaming response (perceived latency) | "Feels instant" | Medium |

---

## Q6: What Should You Be Asking That You're Not?

### 6.1 "What is the expected document upload cadence?"

**Why it matters:** If customers upload 1-5 documents per month, the multi-pass ingestion cost ($0.18/doc) is irrelevant and you can use Sonnet for all passes for maximum quality. If they upload 100+ docs, you need batch processing optimization and should stick with Haiku.

**Recommendation:** Design for 1-20 docs/month initially. The Inngest concurrency limit (currently 5) is fine.
**James' Decision:** I James, agree with this recommendation.

### 6.2 "What is the query volume expectation?"

**Why it matters:** At 10 queries/day, the current approach (4 LLM calls per query: HyDE + response + self-eval + rerank) costs ~$0.01/query. At 1,000 queries/day, that's $10/day per customer. Caching and query deduplication become important.

**Recommendation:** Build the system for up to ~100 queries/day per customer without optimization. Add caching later if needed.
**James' Decision:** I James, agree with this recommendation.

### 6.3 "What document types are most common?"

**Why it matters:** The 011 extraction prompts are optimized for the Sun Chip bank policy (highly structured: policies, rules, exceptions, tables). Many business documents are unstructured (contracts, memos, reports, handbooks). The extraction prompts need to handle both gracefully.

**Recommendation:** Phase 1 should include a **document type detection** step in Pass 1 that classifies the document as "structured-policy", "tabular", "narrative", or "mixed". Passes 2-5 can then use type-specific prompts. This is ~30 lines of additional code.
**James' Decision:** I James, agree with this recommendation. How shall this be utilized in the 5-pass ingestion pipeline?

**How Document Type Detection Works in the Pipeline:**

**Detection happens inside Pass 1 (Structure Analysis) — no extra API call.** Pass 1 already sends the full document to Sonnet 4.5 for structure mapping. The response schema (already defined in section 3.2 as `StructureAnalysisResult`) includes a `documentType` field. Sonnet returns one of four classifications based on what it observes:

| Document Type | Detection Criteria (what Sonnet looks for) | Example Documents |
|---------------|-------------------------------------------|-------------------|
| `structured-policy` | Numbered rules (R1, R2), exception blocks (E1, E2), policy IDs (BC-PROD-004), formal section hierarchy | Bank policies, compliance manuals, regulatory standards |
| `tabular` | >50% of content is in markdown tables or structured lists, few narrative paragraphs | Rate sheets, fee schedules, comparison matrices, specifications |
| `narrative` | Predominantly prose paragraphs, minimal numbered rules or tables, conversational or descriptive tone | Employee handbooks, training guides, memos, reports, contracts |
| `mixed` | Combination of structured sections AND narrative sections AND/OR tables | Most real-world business documents |

**How each pass adapts based on `documentType`:**

**Pass 2: Policy Extraction (per-section)**

| Document Type | Pass 2 Behavior |
|---------------|-----------------|
| `structured-policy` | **Full activation** — extract rules (R1-R8), exceptions (E1-E2), limits, required documents, escalation paths, audit fields. Use structured prompt with explicit rule/exception patterns. |
| `tabular` | **Skipped** — no policy rules to extract. Pass 2 returns empty results. |
| `narrative` | **Adapted prompt** — instead of looking for labeled rules (R1, E1), look for *implicit requirements, obligations, and prohibitions*. Prompt says: "Extract any statements that describe what someone must do, cannot do, or is limited to, even if they aren't labeled as rules." |
| `mixed` | **Per-section routing** — Pass 1's section list marks each section as `isNarrative: true/false`. Policy sections get the structured prompt; narrative sections get the adapted prompt. |

**Pass 3: Table Extraction**

| Document Type | Pass 3 Behavior |
|---------------|-----------------|
| `structured-policy` | **Standard** — extract tables identified by Pass 1's `tables` array. |
| `tabular` | **Expanded** — treat the entire document as table content. Extract every table, every row. Increase output token budget since tables are the primary content. |
| `narrative` | **Skipped** — no tables to extract. Pass 3 returns empty results. |
| `mixed` | **Standard** — extract only the tables identified by Pass 1. |

**Pass 4: Glossary, Entities & Relationships**

| Document Type | Pass 4 Behavior |
|---------------|-----------------|
| `structured-policy` | **Standard** — extract glossary terms, entity definitions, cross-references between policies. |
| `tabular` | **Column-focused** — extract column headers as entity definitions, table metadata as relationships (e.g., "Rate applies to accounts with balance > $100K"). |
| `narrative` | **Entity-heavy** — prioritize named entity extraction (people, organizations, roles, processes mentioned in the text). Extract fewer formal definitions, more contextual entities. |
| `mixed` | **Standard** — run the full prompt. |

**Pass 5: Narrative Fact Extraction**

| Document Type | Pass 5 Behavior |
|---------------|-----------------|
| `structured-policy` | **Targeted** — only run on sections marked `isNarrative: true` by Pass 1 (e.g., Section 7 of the Sun Chip document). Most content was already captured by Pass 2. |
| `tabular` | **Minimal** — extract any introductory/explanatory text around tables (headers, footnotes, disclaimers). Usually very few narrative facts. |
| `narrative` | **Primary extraction pass** — this is where the bulk of facts come from for narrative documents. Use expanded prompt with higher output budget. Focus on: claims, requirements, conditions, definitions-in-context, temporal statements, quantitative assertions. |
| `mixed` | **Narrative sections only** — run on sections marked `isNarrative: true`. |

**Pass 6: Verification (Opus 4.6)**

| Document Type | Pass 6 Behavior |
|---------------|-----------------|
| All types | **Runs the same way regardless of type** — Opus receives the section text + extracted facts and finds what's missing. The document type is passed as context so Opus knows what patterns to look for (e.g., "this is a structured-policy document, look for missed limits and conditions"). |

**Implementation — how this flows in code:**

```typescript
// In process-rag-document.ts (Inngest pipeline)

// Pass 1 returns documentType as part of structure analysis
const structure = await step.run('pass-1-structure', async () => {
  return await analyzeDocumentStructure(documentId);
  // Returns: { sections: [...], tables: [...], documentType: 'structured-policy' }
});

// documentType is passed to each subsequent pass
const policyFacts = await step.run('pass-2-policies', async () => {
  if (structure.documentType === 'tabular') return []; // Skip
  return await extractPoliciesPerSection(documentId, structure);
  // Internally: uses structure.documentType to select prompt variant
});

const tableFacts = await step.run('pass-3-tables', async () => {
  if (structure.documentType === 'narrative') return []; // Skip
  return await extractTablesFromDocument(documentId, structure);
  // Internally: 'tabular' type gets expanded extraction
});

// ...etc for Passes 4, 5, 6
```

**Total code cost for document type routing:** ~30-50 lines of conditional logic in the Inngest function + ~20 lines of prompt variant selection in `claude-llm-provider.ts`. The prompt variants themselves are just different system prompt paragraphs (e.g., appending "This is a narrative document, look for implicit requirements" vs. "This is a structured policy, extract labeled rules R1-Rn").

**Key design principle:** Every document runs *all* passes — some just return empty results for inapplicable types. This keeps the pipeline uniform and avoids complex branching logic. The type-awareness is contained within the prompts, not the pipeline orchestration.


### 6.4 "Should users be able to query across knowledge bases?"

**Why it matters:** The current data model is: User → Knowledge Bases → Documents. A user might have "Banking Policies" and "Compliance Procedures" as separate KBs but want to ask "What are all the reporting requirements?" across both.

**Recommendation:** Design the retrieval layer to support `knowledgeBaseId: string | string[]`. Default to single-KB. Cross-KB search is a future feature toggle.

**Explanation of `6.4 "Should users be able to query across knowledge bases?"` in Detail:**

To clarify, this is **NOT** the same as "querying across all documents" — which is already the core goal of this entire spec. Here's why, explained using your actual data model:

**Your app's data hierarchy (from `rag.ts` and the database):**

```
James (User)
  ├── KB: "Banking Policies"          ← Knowledge Base #1
  │     ├── Doc: Sun Chip Bank Policy v2.0.md
  │     ├── Doc: Wire Transfer Addendum.pdf
  │     └── Doc: ACH Compliance Guide.md
  │
  └── KB: "HR Handbook"               ← Knowledge Base #2
        ├── Doc: Employee Onboarding.md
        └── Doc: Benefits & PTO Policy.pdf
```

**What this spec already covers (Phase 2 — multi-document retrieval):**
When James opens the "Banking Policies" KB and asks a question, the system searches across *all 3 documents inside that KB*. This is "multi-document search within a single KB" and it's the primary goal of this entire architecture.

**What 6.4 is asking about — a DIFFERENT, ADDITIONAL thing:**
What if James asks "What are all the reporting requirements?" and the answer is split across *both* KBs? The banking docs might say "Report all wires over $10K to FinCEN" and the HR docs might say "Report all workplace incidents within 24 hours." James would need the system to search across *both KBs simultaneously* to get a complete answer.

**In short:**
- Multi-doc search (already in scope) = "Search all documents **within** one KB"
- Cross-KB search (what 6.4 is asking about) = "Search all documents **across multiple** KBs"

**Why the original recommendation was to defer this:**
Cross-KB search is only useful if a user has organized their documents into multiple KBs and then wants to query across that organizational boundary. For most users with 1-5 documents in a single KB, this never comes up. It's a "nice to have" for power users who have categorized dozens of documents into separate KBs — and even then, they could just put all documents in one KB.

**Revised recommendation given your feedback:** Since you have one primary use case (non-technical business owners with a small number of documents), this feature is not needed for initial release. The system already searches all documents within the active KB, which covers the core need. If a future customer organizes content into multiple KBs and wants unified search, it's a straightforward extension: change the DB query filter from `WHERE knowledge_base_id = ?` to `WHERE knowledge_base_id IN (?, ?, ?)`. No architectural changes needed — just a UI toggle.

**Bottom line: You can safely ignore 6.4 for now.** The multi-document retrieval in Phase 2 already does what you need.

**James' Decision:** I James, agree with this recommendation.

### 6.5 "What is the target extraction accuracy?"

**Why it matters:** Going from 26% → 80% is achievable with the 011 multi-pass approach and modest prompt engineering. Going from 80% → 95% requires more sophisticated extraction (possibly Sonnet for key passes). Going from 95% → 99% requires human-in-the-loop verification and is disproportionately expensive.

**Recommendation:** Target 85-90% extraction for Phase 1. Use the Expert Q&A workflow (already built) to let domain experts flag what's missing. The combination of automated extraction + expert review can reach 95%+ without engineering the last 5% programmatically.

**Explanation of "6.5 What is the target extraction accuracy?" in Detail:**

The original recommendation assumed cost-sensitivity and suggested settling for 85-90% with Haiku + expert review to close the gap. Given that this is a premium product where the value proposition *is* the extraction quality, the approach changes significantly. Here's how to reach 95% programmatically, without requiring domain experts:

**Why the original 85-90% ceiling exists with Haiku:**

The 5-pass pipeline with Haiku will miss facts that require:
1. **Reasoning about implicit information** — e.g., "The DTI cap is 43%" is explicit, but "The minimum down payment is implied by the LTV cap of 80%" requires inference. Haiku often skips these.
2. **Complex table understanding** — nested headers, merged cells, tables with footnotes. Haiku reads them but occasionally misparses relationships between cells.
3. **Cross-reference resolution** — e.g., "See Section 4.2" in one section means a fact exists in 4.2 that qualifies a rule in the current section. Haiku doesn't chase these consistently.
4. **Subordinate-clause facts** — facts buried inside longer sentences as qualifiers, conditions, or asides. Haiku tends to extract the "main" fact and skip the qualifier.

These are precisely the gaps that Sonnet 4.5 and Opus 4.6 handle well because of their stronger reasoning and instruction-following.

**The 3-Stage Path to 95% (All Within Phase 1):**

| Stage | What Changes | Expected Accuracy | Cumulative Cost/Doc |
|-------|-------------|-------------------|---------------------|
| Stage A: Multi-pass pipeline with Haiku | Build the 5-pass pipeline (Passes 1-5 as designed) | ~85% | ~$0.12 |
| Stage B: Premium model upgrade | Upgrade extraction passes to Sonnet 4.5 | ~90-92% | ~$0.45 |
| Stage C: Automated verification pass | Add Pass 6 — a "gap finder" using Opus 4.6 | ~95% | ~$0.75 |

**Stage A — Build the Pipeline (Phase 1, Sessions 1-2):**
No changes to the existing plan. Build the 5-pass pipeline with Haiku to validate the architecture works end-to-end. Use Haiku for speed during development and debugging. This is the infrastructure foundation.

**Stage B — Upgrade to Sonnet 4.5 (Phase 1, Session 3):**
Once the pipeline is working, upgrade the model for each extraction pass. This is a **config change only** — swap the model ID in the provider call. No code logic changes.

| Pass | Current Model | Upgraded Model | Rationale |
|------|--------------|----------------|-----------|
| Pass 1: Structure Analysis | Sonnet (already) | **Sonnet 4.5** | Structure detection benefits from stronger reasoning |
| Pass 2: Policy Extraction | Haiku | **Sonnet 4.5** | Critical pass — rules, exceptions, limits, docs. Premium model ensures nothing is missed |
| Pass 3: Table Extraction | Haiku | **Sonnet 4.5** | Tables with complex headers/footnotes need stronger parsing |
| Pass 4: Glossary & Entities | Haiku | **Haiku** (keep) | Glossaries are explicitly labeled — Haiku handles this fine |
| Pass 5: Narrative Facts | Sonnet (already) | **Sonnet 4.5** | Implicit/inferential facts in unstructured text are exactly where Sonnet 4.5 excels |

This gets extraction to ~90-92% by catching the implicit facts, complex tables, and subordinate-clause qualifiers that Haiku misses.

**Stage C — Automated Verification Pass (Phase 1, Session 3):**
Add a **new Pass 6: Completeness Verification** that runs *after* all extraction is complete. This pass:

1. Takes the **original document text** (section by section) and the **list of already-extracted facts** for that section
2. Asks Opus 4.6: *"Here is the original text of this section. Here are the facts already extracted from it. Identify any facts, rules, limits, conditions, exceptions, cross-references, or implicit requirements that were MISSED. Return only the missing facts."*
3. Stores any newly-found facts with `factCategory: 'verification_recovery'`

This is the "second pair of eyes" pattern — the strongest available model reviews what the extraction passes produced and catches the gaps. It's particularly effective because:
- Opus sees both the source text AND what was already extracted, so it focuses only on what's missing
- It doesn't need to re-extract everything — just find the holes
- Running it per-section keeps each call within a reasonable token budget

**Pass 6 Implementation Detail:**

```typescript
// New method in claude-llm-provider.ts
async verifyExtractionCompleteness(params: {
  sectionText: string;
  sectionTitle: string;
  existingFacts: FactExtraction[];
  documentType: string;
}): Promise<FactExtraction[]> {
  // Model: Opus 4.6
  // Prompt: "Review this section. Here are the facts already extracted.
  //          Find any MISSING facts. Focus on:
  //          - Implicit limits, thresholds, conditions
  //          - Facts in subordinate clauses
  //          - Cross-references to other sections/policies
  //          - Qualifiers or conditions on existing rules
  //          - Numeric values not yet captured
  //          Return ONLY newly found facts, not duplicates."
}
```

**Updated Cost Per Document (with Premium Models):**

| Pass | Model | Input Tokens | Output Tokens | Cost |
|------|-------|-------------|---------------|------|
| 1: Structure | Sonnet 4.5 | ~18K | ~2K | ~$0.08 |
| 2: Policies (×10 sections) | Sonnet 4.5 | ~15K total | ~10K total | ~$0.10 |
| 3: Tables (×5 tables) | Sonnet 4.5 | ~5K total | ~3K total | ~$0.03 |
| 4: Glossary | Haiku | ~18K | ~3K | ~$0.008 |
| 5: Narrative | Sonnet 4.5 | ~5K | ~3K | ~$0.03 |
| **6: Verification (×10 sections)** | **Opus 4.6** | **~25K total** | **~5K total** | **~$0.45** |
| Preambles (×10) | Haiku | ~10K total | ~1K total | ~$0.004 |
| Embeddings (×420) | OpenAI | ~200K total | — | ~$0.004 |
| **Total** | | | | **~$0.72/doc** |

**Cost comparison:**

| Approach | Cost/Doc | Extraction Rate | Cost per Fact |
|----------|----------|----------------|---------------|
| Current (single Haiku pass) | $0.03 | 26% (~109 facts) | $0.00028 |
| Phase 1 with Haiku only | $0.12 | ~85% (~354 facts) | $0.00034 |
| Phase 1 with Sonnet 4.5 + Opus verification | $0.72 | ~95% (~396 facts) | $0.0018 |

At $0.72/document for a premium product, this is **well within acceptable range**. A customer uploading 20 documents/month incurs ~$14.40 in extraction costs. For context, a single page of a lawyer reviewing these same documents costs $200-500.

**When This Should Be Done:**
All three stages happen within **Phase 1** of the existing plan:

| Session | Work | Target |
|---------|------|--------|
| Session 1 | Schema migration + pipeline infrastructure + Pass 1 | Get pipeline running end-to-end |
| Session 2 | Passes 2-5 with Haiku, relationship linking | ~85% extraction (validate architecture) |
| Session 3 | Upgrade Passes 1/2/3/5 to Sonnet 4.5 + build Pass 6 (Opus verification) + golden-set test | **95% extraction** |

This means **95% extraction is the Phase 1 exit criterion**, not a future phase. Phase 1 is complete only when the golden-set test confirms ≥95% of facts from the Sun Chip document are captured.

**Updated Phase 1 goal line:** ~~"Raise per-document extraction from 26% to 90%+"~~ → **"Raise per-document extraction from 26% to 95% using premium models with automated verification."**

**James' Decision:** I James, agree with the updated Phase 1 goal line.

### 6.6 "How will you regression-test retrieval quality?"

**Why it matters:** Without a test suite, every code change is a gamble. You won't know if a prompt tweak helped or hurt until a customer reports wrong answers.

**Recommendation:** Build a "golden set" of 20-30 question-answer pairs for the Sun Chip document as part of Phase 1. Run this suite after every ingestion or retrieval change. Target: >85% of answers rated "correct" by the Claude-as-Judge evaluator.
**James' Decision:** I James, agree with this recommendation.

### 6.7 "What is the migration path for existing documents?"

**Why it matters:** There are already 7 Sun Chip document records in the database (6 duplicates + 1 "good" one with 109 facts). When the new pipeline ships, these need to be handled.

**Recommendation:**
1. Phase 1 includes a cleanup script to archive the 6 duplicate documents
2. Add a "Reprocess Document" button in the UI that re-runs the new pipeline on existing documents
3. Do NOT auto-reprocess — let users opt in, since reprocessing deletes old embeddings
**James' Decision:** I agree with: Phase 1 includes a cleanup script to archive the 6 duplicate documents

### 6.8 "Should the system explain its confidence?"

**Why it matters:** When the system returns a low-confidence answer, should it say "I found partial information" vs. just giving the best answer it has? Non-technical users need clear signals about reliability.

**Recommendation:** The self-eval score already exists. Surface it in the UI:
- Score > 0.8: Show answer normally
- Score 0.5-0.8: Show answer with "Based on available information..." qualifier
- Score < 0.5: Show "I couldn't find a confident answer. Here's what I found..." + suggest more specific queries

This is a UI change, not a backend change. The data is already there.
**James' Decision:** I James, agree with this recommendation.
---

## Q7: Limitations Analysis

### 7.1 No Expensive Tools (Pinecone, etc.)

| Capability | Tool Used | Why It's Sufficient |
|-----------|-----------|-------------------|
| Vector search | Supabase pgvector | Built into Supabase Pro; IVFFlat indexes handle 1M+ vectors |
| Full-text search | Postgres tsvector | Native to Postgres; no external service needed |
| Embeddings | OpenAI text-embedding-3-small | $0.02/1M tokens; already integrated |
| LLM extraction | Claude Haiku 4.5 | Already integrated; $0.25/1M input, $1.25/1M output |
| LLM reranking | Claude Haiku 4.5 | Same provider; ~100 tokens per passage evaluation |
| Background jobs | Inngest | Already integrated; free tier sufficient |
| Storage | Supabase Storage | Already integrated |
| Inference | RunPod | Already integrated for LoRA |

**Nothing new is required.** Every capability is implemented with tools already in the stack. The only marginal cost increases are:
- Ingestion: +$0.15/document (more LLM calls for multi-pass)
- Retrieval: +$0.001/query (reranking call)
- Storage: More rows in rag_facts and rag_embeddings (Supabase Pro 8GB is adequate for thousands of documents)

**James' Decision:** We can use Sonnet 4.5 and/or Opus 4.6 for extraction as needed.

### 7.2 LoRA Adapter Cooperation

**Current behavior (preserved):**
```
RAG+LoRA mode:
  1. RAG retrieves context (sections + facts) → assembledContext string
  2. assembledContext is sent as prompt context to RunPod LoRA endpoint
  3. LoRA model generates response using its trained personality + RAG context
```

**After multi-doc upgrade:**
```
RAG+LoRA mode (unchanged flow):
  1. RAG retrieves context from multiple documents → assembledContext string
  2. Same assembledContext is sent to RunPod LoRA endpoint
  3. LoRA model generates response (sees richer, multi-source context)
```

The LoRA endpoint receives a context string. It doesn't know or care whether that string came from 1 document or 10. **Zero changes to the LoRA integration code.**

The only consideration: if multi-doc retrieval returns significantly more context, the LoRA prompt may exceed the Mistral model's context window. Mitigation: cap `assembledContext` at the current `maxContextTokens: 100000` (already configured in `RAG_CONFIG`).

### 7.3 No Complex Customer Configuration

Every feature in this architecture is **zero-configuration for the end user**:

| Feature | Customer Action Required | Configuration |
|---------|------------------------|---------------|
| Multi-pass ingestion | None — happens automatically on upload | None |
| Multi-doc retrieval | None — queries automatically search the KB | None |
| Hybrid search | None — both vector and keyword run in parallel | None |
| Reranking | None — automatic on every query | None |
| Provenance/citations | None — shown in the response UI | None |
| Not-found handling | None — automatic when confidence is low | None |
| Document updates | Click "Replace Document" | Single button |
| Expert Q&A | Answer questions when prompted (existing flow) | None |

The only customer-visible change is that the system gets better answers.

### 7.4 Sweet Spot: Functionality vs. Development Complexity

**Codebase growth analysis:**

| Metric | Current | After All Phases | Growth |
|--------|---------|------------------|--------|
| RAG module lines | 2,900 | ~5,100 | +76% |
| RAG service files | 6 | 6 (same files, expanded) | +0 files |
| New SQL migrations | 0 | 2-3 | Minimal |
| New API routes | 0 | 1 (feedback) | Minimal |
| New npm dependencies | 0 | 0 | **Zero** |
| Total codebase lines | ~10,000 | ~12,200 | +22% |

The ~2,200 new lines deliver:
- 4× extraction coverage (26% → 90%+)
- Multi-document search
- Hybrid retrieval (vector + keyword)
- Cross-encoder reranking
- Deduplication + contradiction awareness
- Graceful "not found" behavior
- Conversation context
- Operational observability

**Complexity budget:** Each phase adds 300-900 lines to existing files. No new architectural concepts. No new dependencies. No new deployment targets. The patterns (Supabase queries, Claude API calls, Inngest steps) are already established.

### 7.5 Acceptable Trade-offs (Slightly Less Robust = Reasonable Code)

| "Enterprise" Feature | Our Approach | Trade-off |
|---------------------|-------------|-----------|
| Dedicated vector DB (Pinecone) | pgvector in Supabase | Slower at 10M+ vectors; fine for our scale (thousands) |
| Dedicated reranker model (Cohere) | Claude Haiku as reranker | Slightly less precise; saves a new API integration |
| Real-time index updates | Rebuild embeddings on update | Stale for ~seconds during reindex; acceptable |
| Semantic chunking (LangChain) | Section-based chunking from LLM | May miss optimal chunk boundaries; good enough with multi-pass |
| Distributed embedding pipeline | Sequential OpenAI batch calls | Slower for 1000+ embeddings; fine for our doc sizes |
| MLOps-grade observability | Query logs + quality scores in Postgres | No Grafana dashboards; Inngest dashboard + DB queries suffice |

---

# Part 3: Technical Architecture

## 3.1 Database Schema Changes

### Phase 1 Migration: Enhanced Facts

```sql
-- Migration: 001_enhanced_rag_facts.sql

-- Add provenance columns to rag_facts
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS policy_id TEXT;
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS rule_id TEXT;
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS parent_fact_id UUID REFERENCES rag_facts(id);
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS subsection TEXT;
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS fact_category TEXT;

-- Update fact_type constraint to include new types
ALTER TABLE rag_facts DROP CONSTRAINT IF EXISTS rag_facts_fact_type_check;
ALTER TABLE rag_facts ADD CONSTRAINT rag_facts_fact_type_check
  CHECK (fact_type IN (
    'fact', 'entity', 'definition', 'relationship',
    'table_row', 'policy_exception', 'policy_rule',
    'limit', 'threshold', 'required_document',
    'escalation_path', 'audit_field', 'cross_reference',
    'narrative_fact'
  ));

-- Index for policy-scoped queries
CREATE INDEX IF NOT EXISTS idx_rag_facts_policy_id ON rag_facts(policy_id) WHERE policy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_facts_category ON rag_facts(fact_category) WHERE fact_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_facts_parent ON rag_facts(parent_fact_id) WHERE parent_fact_id IS NOT NULL;

-- Document fingerprint for dedup
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_rag_documents_hash ON rag_documents(content_hash) WHERE content_hash IS NOT NULL;
```

### Phase 2 Migration: Multi-Doc Search Support

```sql
-- Migration: 002_multi_doc_search.sql

-- Add knowledge_base_id to embeddings for KB-wide search
ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

-- Backfill from documents
UPDATE rag_embeddings e
SET knowledge_base_id = d.knowledge_base_id
FROM rag_documents d
WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;

-- Full-text search on facts
ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS idx_rag_facts_tsv ON rag_facts USING gin(content_tsv);

-- Full-text search on sections
ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS text_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || original_text)) STORED;
CREATE INDEX IF NOT EXISTS idx_rag_sections_tsv ON rag_sections USING gin(text_tsv);

-- KB-wide embedding search RPC
CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_knowledge_base_id uuid DEFAULT NULL,
  filter_document_id uuid DEFAULT NULL,
  filter_tier int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  source_type text,
  source_id uuid,
  content_text text,
  similarity float,
  tier int,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_id,
    e.source_type,
    e.source_id,
    e.content_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.tier,
    e.metadata
  FROM rag_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
    AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
    AND (filter_tier IS NULL OR e.tier = filter_tier)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid text search RPC
CREATE OR REPLACE FUNCTION search_rag_text(
  search_query text,
  filter_knowledge_base_id uuid DEFAULT NULL,
  filter_document_id uuid DEFAULT NULL,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  source_type text,
  source_id uuid,
  document_id uuid,
  content text,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 'fact'::text, f.id, f.document_id, f.content,
           ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
    FROM rag_facts f
    WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
      AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
      AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
        SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
      ))
  )
  UNION ALL
  (
    SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
           ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
    FROM rag_sections s
    WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
      AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
      AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
        SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
      ))
  )
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;
```

## 3.2 Updated TypeScript Types (Phase 1)

```typescript
// Additions to src/types/rag.ts

export type RAGFactType =
  | 'fact' | 'entity' | 'definition' | 'relationship'
  | 'table_row' | 'policy_exception' | 'policy_rule'
  | 'limit' | 'threshold' | 'required_document'
  | 'escalation_path' | 'audit_field' | 'cross_reference'
  | 'narrative_fact';

// Enhanced fact interface
export interface RAGFact {
  id: string;
  documentId: string;
  sectionId: string | null;
  userId: string;
  factType: RAGFactType;
  content: string;
  sourceText: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
  // New provenance fields
  policyId: string | null;
  ruleId: string | null;
  parentFactId: string | null;
  subsection: string | null;
  factCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

// Enhanced fact extraction (from LLM)
export interface FactExtraction {
  factType: RAGFactType;
  content: string;
  sourceText: string;
  confidence: number;
  // New provenance fields
  policyId?: string;
  ruleId?: string;
  qualifiesRule?: string;  // For exceptions: which rule this qualifies
  factCategory?: string;
  subsection?: string;
}

// New: Per-pass LLM response types
export interface StructureAnalysisResult {
  summary: string;
  sections: Array<{
    title: string;
    startLine: number;
    endLine: number;
    summary: string;
    policyId: string | null;
    isNarrative: boolean;
  }>;
  tables: Array<{
    startLine: number;
    endLine: number;
    nearestSection: string;
  }>;
  topicTaxonomy: string[];
  ambiguities: string[];
  expertQuestions: ExpertQuestionGeneration[];
  documentType: 'structured-policy' | 'tabular' | 'narrative' | 'mixed';
}

export interface PolicyExtractionResult {
  policyId: string;
  rules: Array<{
    ruleId: string;
    content: string;
    conditions: string[];
    amounts: string[];
    timeframes: string[];
  }>;
  exceptions: Array<{
    exceptionId: string;
    content: string;
    qualifiesRule: string;
    conditions: string[];
  }>;
  limits: Array<{ name: string; value: string; unit: string; window: string }>;
  requiredDocuments: Array<{ scenario: string; documents: string[] }>;
  escalations: Array<{ trigger: string; levels: string[] }>;
  auditFields: Array<{ fieldName: string; description: string }>;
  relatedPolicies: Array<{ policyId: string; relationship: string }>;
  definitions: Array<{ term: string; definition: string }>;
}

export interface TableExtractionResult {
  tableName: string;
  tableContext: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface GlossaryExtractionResult {
  definitions: Array<{ term: string; definition: string; policyContext: string }>;
  entities: Array<{ name: string; type: string; description: string }>;
  relationships: Array<{ from: string; to: string; type: string; description: string }>;
}
```

## 3.3 Enhanced Inngest Pipeline (Phase 1)

```typescript
// Updated: src/inngest/functions/process-rag-document.ts

export const processRAGDocument = inngest.createFunction(
  {
    id: 'process-rag-document',
    name: 'Process RAG Document (Multi-Pass)',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'rag/document.uploaded' },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;

    // Step 1: Structure Analysis (Claude Sonnet — higher quality for structure)
    const structure = await step.run('pass-1-structure', async () => {
      return await analyzeDocumentStructure(documentId);
    });

    // Step 2: Store sections from structure (code-only, fast)
    const sections = await step.run('store-sections', async () => {
      return await storeSectionsFromStructure(documentId, structure);
    });

    // Step 3: Policy Extraction (Claude Haiku × N policy sections)
    const policyFacts = await step.run('pass-2-policies', async () => {
      return await extractPoliciesPerSection(documentId, structure, sections);
    });

    // Step 4: Table Extraction (Claude Haiku × N tables)
    const tableFacts = await step.run('pass-3-tables', async () => {
      return await extractTablesFromDocument(documentId, structure);
    });

    // Step 5: Glossary, Entities & Relationships (Claude Haiku)
    const glossaryFacts = await step.run('pass-4-glossary', async () => {
      return await extractGlossaryAndRelationships(documentId);
    });

    // Step 6: Narrative Facts for narrative sections (Claude Sonnet)
    const narrativeFacts = await step.run('pass-5-narrative', async () => {
      return await extractNarrativeFacts(documentId, structure);
    });

    // Step 7: Relationship Linking (code-only, no LLM)
    await step.run('link-relationships', async () => {
      return await linkFactRelationships(documentId);
    });

    // Step 8: Generate Contextual Preambles (Claude Haiku × N sections)
    await step.run('generate-preambles', async () => {
      return await generateSectionPreambles(documentId);
    });

    // Step 9: Generate Enriched Embeddings
    await step.run('generate-embeddings', async () => {
      return await generateEnrichedEmbeddings(documentId, userId);
    });

    // Step 10: Update document status
    await step.run('finalize', async () => {
      return await finalizeDocument(documentId);
    });
  }
);
```

## 3.4 Enriched Embedding Strategy

```typescript
// Updated embedding text construction

function buildEmbeddingText(fact: RAGFact): string {
  const parts: string[] = [];

  // Policy context prefix
  if (fact.policyId) {
    parts.push(`[Policy: ${fact.policyId}]`);
  }
  if (fact.subsection) {
    parts.push(`[Section: ${fact.subsection}]`);
  }
  if (fact.factCategory) {
    parts.push(`[Category: ${fact.factCategory}]`);
  }

  // For exceptions, include the qualifying rule context
  if (fact.factType === 'policy_exception' && fact.metadata?.qualifiesRule) {
    parts.push(`[Qualifies: ${fact.metadata.qualifiesRule}]`);
  }

  parts.push(fact.content);

  return parts.join(' ');
}

// Example outputs:
// "[Policy: BC-PROD-004] [Section: Jumbo Mortgage] [Category: rule] R4: DTI capped at 43%"
// "[Policy: BC-PROD-004] [Qualifies: R4 - DTI cap] High Liquidity Offset: DTI expanded to 45%"
// "[Category: limit] Max FDIC Coverage: $100,000,000 via sweep network"
```

## 3.5 Multi-Document Retrieval Architecture (Phase 2)

```
User Query → HyDE (Haiku, ~500ms)
                ↓
            Embed query (OpenAI, ~200ms)
                ↓
        ┌───────┴──────────┐
        ↓                  ↓
    pgvector search     tsvector search
    (KB-wide)           (keyword match)
    top-20              top-10
        ↓                  ↓
        └───────┬──────────┘
                ↓
          Merge + Deduplicate
          (weighted: 0.7 vector + 0.3 text)
                ↓
          Balanced Multi-Doc Coverage
          (max 60% from any single doc)
                ↓
          Rerank with Haiku (top-15 → top-8)
                ↓
          Fetch full sections/facts
                ↓
          Assemble context
          (with document source labels)
                ↓
        ┌───────┴──────────┐
        ↓                  ↓
    RAG-only           RAG+LoRA
    Claude Haiku       RunPod endpoint
        ↓                  ↓
        └───────┬──────────┘
                ↓
          Self-RAG eval
                ↓
          Store query + scores
```

### Multi-Doc Coverage Balancing

```typescript
function balanceMultiDocCoverage(
  results: Array<{ documentId: string; similarity: number; sourceId: string }>,
  maxPerDocRatio: number = 0.6
): Array<{ documentId: string; similarity: number; sourceId: string }> {
  const docCounts = new Map<string, number>();
  const total = results.length;
  const maxPerDoc = Math.ceil(total * maxPerDocRatio);
  const balanced: typeof results = [];

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

---

# Part 4: Cost & Performance Projections

## 4.1 Per-Document Ingestion Cost

| Pass | Model | Input Tokens | Output Tokens | Cost |
|------|-------|-------------|---------------|------|
| 1: Structure | Sonnet | ~18K | ~2K | ~$0.05 |
| 2: Policies (×10) | Haiku | ~15K total | ~10K total | ~$0.02 |
| 3: Tables (×5) | Haiku | ~5K total | ~3K total | ~$0.005 |
| 4: Glossary | Haiku | ~18K | ~3K | ~$0.008 |
| 5: Narrative | Sonnet | ~5K | ~3K | ~$0.025 |
| Preambles (×10) | Haiku | ~10K total | ~1K total | ~$0.004 |
| Embeddings (×400) | OpenAI | ~200K total | — | ~$0.004 |
| **Total** | | | | **~$0.12/doc** |

vs. Current: ~$0.03/doc (6.7× cost for ~4× more facts)

## 4.2 Per-Query Cost

| Step | Model | Tokens | Cost |
|------|-------|--------|------|
| HyDE | Haiku | ~500 out | ~$0.001 |
| Embedding | OpenAI | ~100 in | ~$0.00001 |
| Reranking | Haiku | ~3K in, 200 out | ~$0.001 |
| Response | Haiku | ~5K in, 1K out | ~$0.003 |
| Self-eval | Haiku | ~2K in, 100 out | ~$0.001 |
| **Total** | | | **~$0.006/query** |

vs. Current: ~$0.005/query (+20% for reranking)

## 4.3 Storage Projections (Supabase Pro 8GB)

| Component | Per Document | 100 Documents | 1,000 Documents |
|-----------|-------------|---------------|-----------------|
| Document text | ~70KB | 7MB | 70MB |
| Sections (×10) | ~100KB | 10MB | 100MB |
| Facts (×400) | ~200KB | 20MB | 200MB |
| Embeddings (×420 × 1536 dims) | ~2.5MB | 250MB | 2.5GB |
| Indexes | ~1MB | 100MB | 1GB |
| **Total** | ~3.9MB | ~390MB | **~3.9GB** |

**At 1,000 documents, storage is ~3.9GB — within the 8GB Supabase Pro allocation.** For growth beyond that, Supabase charges ~$0.125/GB/month.

---

# Part 5: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Multi-pass extraction takes too long | Low | Low | Inngest has no timeout; 15 min is acceptable for background job |
| Pass prompts produce inconsistent JSON | Medium | Medium | Use `parseJsonResponse()` with robust error handling (already built) |
| pgvector search slows at scale | Low | Medium | IVFFlat index rebuilds; Supabase Pro handles 1M+ vectors |
| Enriched embeddings don't improve retrieval | Low | Medium | A/B test against current embeddings; easy to revert |
| Reranking adds too much latency | Low | Low | Make reranking optional; skip for high-confidence top-1 results |
| Multi-doc coverage imbalance | Medium | Medium | The balancing function caps any single doc at 60% of results |
| LoRA model confused by multi-doc context | Low | Medium | Context format unchanged; LoRA receives same string shape |
| Existing documents incompatible | Low | Low | Migration adds nullable columns; old data works unchanged |

---

# Part 6: Implementation Sequence (First Phase Detail)

## Phase 1, Session 1: Schema + Structure Pass

1. Run DB migration (enhanced rag_facts columns)
2. Update `RAGFactType` and `RAGFact` interface in `types/rag.ts`
3. Update `mapRowToFact` in `rag-db-mappers.ts`
4. Implement `analyzeDocumentStructure()` in `claude-llm-provider.ts`
5. Add document fingerprinting to `createDocumentRecord()`

## Phase 1, Session 2: Extraction Passes 2-5

6. Implement `extractPoliciesPerSection()` — Haiku per policy section
7. Implement `extractTablesFromDocument()` — programmatic table detection + Haiku per table
8. Implement `extractGlossaryAndRelationships()` — Haiku on glossary + cross-references
9. Implement `extractNarrativeFacts()` — Sonnet on narrative sections

## Phase 1, Session 3: Assembly + Testing

10. Implement `linkFactRelationships()` — code-only relationship linking
11. Update `generateEnrichedEmbeddings()` — enriched embedding text
12. Update Inngest function for multi-step pipeline
13. Reprocess Sun Chip document and validate extraction coverage
14. Build initial golden-set test (10 questions)

---

# Appendix A: Decision Log

| Decision | Chosen Option | Alternatives Considered | Rationale |
|----------|--------------|------------------------|-----------|
| Reranker | Claude Haiku | Cohere Rerank, self-hosted cross-encoder | No new API integration; Haiku is fast enough; saves complexity |
| Hybrid search | Postgres tsvector | Elasticsearch, Typesense | Already in Supabase; zero new infrastructure |
| Embedding model | Keep OpenAI text-embedding-3-small | Cohere embed-v3, self-hosted on RunPod | Already integrated; performance is adequate; switching gains are marginal |
| Structure Pass model | Claude Sonnet | Claude Haiku | Structure analysis benefits from higher reasoning quality; it's only 1 call |
| Narrative Pass model | Claude Sonnet | Claude Haiku | Unstructured text extraction needs stronger reasoning |
| Other passes model | Claude Haiku | Claude Sonnet | Structured extraction (rules, tables) doesn't need Sonnet; Haiku is 4.5× faster |
| Multi-doc balance | 60% cap per document | Equal distribution, no cap | 60% allows a dominant relevant doc while ensuring others get represented |
| Conversation context | Last 2-3 turns | Full history, RAG over past queries | Simple, low-cost, handles 90% of follow-up patterns |

---

# Appendix B: File Change Map

| File | Phase | Changes |
|------|-------|---------|
| `src/types/rag.ts` | 1 | Add new types, extend RAGFactType, add provenance fields |
| `src/lib/rag/config.ts` | 1 | Add multi-pass model config (Sonnet for Pass 1/5) |
| `src/lib/rag/providers/claude-llm-provider.ts` | 1 | Add 5 new extraction methods |
| `src/lib/rag/providers/llm-provider.ts` | 1 | Add method signatures to interface |
| `src/lib/rag/services/rag-ingestion-service.ts` | 1 | Update processDocument for multi-pass; add document fingerprinting |
| `src/lib/rag/services/rag-db-mappers.ts` | 1 | Update mapRowToFact for new columns |
| `src/lib/rag/services/rag-embedding-service.ts` | 1,2 | Enriched text builder; KB-wide search; hybrid search |
| `src/inngest/functions/process-rag-document.ts` | 1 | Multi-step pipeline |
| `src/lib/rag/services/rag-retrieval-service.ts` | 2,3 | Multi-doc retrieval, hybrid merge, reranking, dedup, conversation context |
| `src/app/api/rag/query/route.ts` | 2 | Support KB-wide queries |
| Supabase SQL migration | 1,2 | Schema changes, new RPC functions, indexes |
