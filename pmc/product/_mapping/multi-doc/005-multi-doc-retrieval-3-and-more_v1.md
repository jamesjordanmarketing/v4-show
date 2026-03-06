# 005 — Multi-Doc Retrieval: 3+ Documents Analysis

**Date:** February 28, 2026
**References:** `002-multi-doc-retrieval-specification_v3.md` (spec), codebase investigation of `src/lib/rag/`
**Question:** Can the current RAG system accurately answer queries that require referencing 3, 4, 5 or more documents? What are the upper limits?

---

## Short Answer

**Yes — there is no hardcoded limit on the number of documents in a workbase.** The system can and will query across 3, 4, 5 or more documents simultaneously. However, there are two distinct constraints that matter in practice:

1. **Retrieval ceiling** — a fixed pool of results per query (40 total chunks maximum) that must be shared across however many documents are in the workbase.
2. **Context window** — how many of those results fit in the prompt sent to Claude before content is truncated.

Neither is a hard failure. Both degrade gracefully as document count grows.

---

## How the Query Works (Simplified)

When a workbase-scoped query is made from the Fact Training Chat page:

1. The query text is embedded into a vector.
2. **`match_rag_embeddings_kb`** (pgvector cosine similarity) retrieves the closest matching **sections** and **facts** across ALL documents in the workbase — filtered only by `workbase_id`, not `document_id`.
3. **`search_rag_text`** (BM25 text search) runs in parallel for keyword coverage.
4. Results are scored, re-ranked, and de-duplicated.
5. A **diversity balancing step** enforces that no single document dominates.
6. The assembled context is sent to Claude with the original query.

Steps 2–4 are completely document-count-agnostic. Any document in the workbase that contains relevant embeddings will surface automatically.

---

## The Retrieval Ceiling

This is the binding constraint for multi-doc queries. The limits are hardcoded in `src/lib/rag/config.ts` and `src/lib/rag/services/rag-retrieval-service.ts`:

| Pool | Limit | Where |
|------|-------|-------|
| Sections (vector search) | **10** | `config.ts` line 64, `rag-retrieval-service.ts` line 98 |
| Facts (vector search) | **20** | `config.ts` line 65, `rag-retrieval-service.ts` line 118 |
| BM25 keyword results | **10** | `rag-retrieval-service.ts` line 136 |
| **Total distinct chunks** | **~40** | After dedup and merge |

These 40 chunks are all the system ever looks at per query, regardless of whether the workbase has 2 documents or 20.

### Diversity balancing

Two rules prevent a single document from monopolising the results:

- **`maxSingleDocRatio: 0.6`** — no document can account for more than 60% of retrieved results.
- **`MAX_SECTIONS_PER_DOC: 6`** — in multi-hop mode, maximum 6 sections drawn from any one document.

This means at least 40% of results (16+ chunks) are forced to come from other documents, even if one document is a near-perfect match.

---

## Document Count vs. Coverage Quality

The retrieval ceiling creates a coverage curve. With 40 total chunks and the 60% single-doc cap:

| Documents in Workbase | Avg chunks per doc (evenly relevant) | Notes |
|-----------------------|--------------------------------------|-------|
| **2** | 20 (but max 24 due to 60% cap) | Deep coverage of both docs. Tested and confirmed working. |
| **3** | ~13 | Good coverage. The balancing function distributes results. |
| **4** | ~10 | Solid. 10 sections per doc is the vector search ceiling anyway. |
| **5** | ~8 | Still good for most queries. Each doc gets ~8 relevant chunks. |
| **6–8** | 5–7 | Acceptable. A cross-document synthesis query will work if the answer exists in highly-ranked chunks. |
| **10** | ~4 | Thin. A document with a relevant answer buried below its top 4 results may be missed. |
| **15+** | 2–3 | Risky for comprehensive queries. Documents scoring lower in cosine similarity get very few chunks. |

**Key insight:** The degradation is not binary. The system will always return an answer. What degrades is *completeness* — less-relevant documents get fewer chunks represented, so a query like "compare all 5 documents" will answer well with 5 docs but may miss nuance with 12 docs because each document only contributes 3 chunks.

For queries that need depth from 1–2 specific documents (the common case), any number of total documents is fine — the vector similarity naturally surfaces the relevant ones.

---

## Context Window Budget

Retrieved chunks are assembled into the prompt context with a token budget:

| Budget | Limit | Notes |
|--------|-------|-------|
| Claude (rag_only, rag_and_lora mode) | **100,000 tokens** | ~300,000 words |
| LoRA (lora_only mode) | **29,000 tokens** | Mistral-7B vLLM constraint |
| Budget split | 5% headers / 70% sections / 25% facts | Lines 251–253 of retrieval service |

**In practice, the context window is not the bottleneck.** Even the maximum retrieval (40 chunks × ~400 tokens each) is only ~16,000 tokens — well within the 100K Claude budget. The token limit only becomes binding if individual chunks are unusually long (dense prose sections from large PDFs).

When context is truncated, it happens gracefully at sentence boundaries with logging. It does not produce an error.

---

## Per-File and Aggregate Size Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **Max file size** | **50 MB** per document | `config.ts` line 55 |
| **Max document pages** | **500 pages** per document | `config.ts` line 56 |
| **Aggregate workbase size** | **No limit** | No cap across all documents |
| **Embedding storage** | No limit | pgvector rows in `rag_embeddings` |

**How size affects retrieval quality:**
A 50MB PDF will produce many hundreds of sections and facts in `rag_embeddings`. But per query, only the top 10 sections and 20 facts are retrieved (by cosine similarity to the query). So a 50MB document does not flood the results — it simply has more chunks competing for the 10 section slots, and irrelevant ones lose out.

---

## Multi-Hop / Comparative Queries

For queries like "what does document A say about X vs. document B?", the system has a multi-hop path:

- The query is decomposed into **2–4 sub-queries** by an LLM call.
- Each sub-query runs through the full retrieval pipeline.
- Results are assembled and synthesised.
- `MAX_SECTIONS_PER_DOC = 6` per sub-query prevents one document dominating.

This path works well across 3–8 documents for explicit comparative queries. The 2–4 sub-query limit means queries that span more than 4 conceptually distinct areas may get partial coverage.

---

## The Practical Upper Limit

Based on the retrieval math, the system performs well up to approximately:

| Scenario | Upper Limit | Reasoning |
|----------|-------------|-----------|
| **Point queries** ("what is X?") | Unlimited | Only the top-ranked document matters; doc count is irrelevant. |
| **Cross-doc synthesis** ("summarise across all docs") | **8–10 documents** | Below this, each doc gets 4–5 chunks — enough for a coherent answer. Above this, thin coverage risks missing key content. |
| **Explicit comparison** ("compare doc A and doc B") | Any count | The query scopes naturally to the relevant documents. |
| **Total workbase MB** | No hard limit | Per-file is 50 MB; aggregate is unlimited. |

---

## Configuration Levers (If Limits Need Raising)

All retrieval limits are in `src/lib/rag/config.ts` and can be raised without breaking the system:

```typescript
// src/lib/rag/config.ts

retrieval: {
  maxSectionsToRetrieve: 10,    // Raise to 20 for better multi-doc coverage
  maxFactsToRetrieve: 20,       // Raise to 40 for denser fact retrieval
  maxSingleDocRatio: 0.6,       // Lower to 0.4 to force more diversity
  maxContextTokens: 100000,     // Already at the practical Claude ceiling
  ...
}
```

And in `rag-retrieval-service.ts`:
```typescript
const MAX_SECTIONS_PER_DOC = 6;  // Line 1008 — raise to 10 for more per-doc depth
```

Raising `maxSectionsToRetrieve` from 10 to 20 would double coverage for multi-doc queries. The main trade-off is latency (more vector DB rows to rank and rerank).

---

## Summary

| Question | Answer |
|----------|--------|
| Can it query 3, 4, 5+ documents simultaneously? | **Yes — no document count limit exists.** |
| What is the upper limit on document count? | **No hard limit.** Practical quality ceiling: ~8–10 docs for comprehensive synthesis queries. |
| What is the limit on total MB across a workbase? | **No aggregate limit.** Per-file: 50 MB, 500 pages. |
| What happens when there are many documents? | **Graceful degradation** — fewer chunks per document, but no errors. |
| What is the binding constraint? | **40 total chunks per query** shared across all documents. |
| Context window bottleneck? | **No** — 40 chunks ≈ 16K tokens, far below the 100K Claude budget. |

---

## File Reference

| Finding | File | Lines |
|---------|------|-------|
| Retrieval limits | `src/lib/rag/config.ts` | 62–74 |
| `maxSectionsToRetrieve: 10` | `src/lib/rag/services/rag-retrieval-service.ts` | 98 |
| `maxFactsToRetrieve: 20` | `src/lib/rag/services/rag-retrieval-service.ts` | 118 |
| BM25 limit: 10 | `src/lib/rag/services/rag-retrieval-service.ts` | 136 |
| Diversity balancing (60% cap) | `src/lib/rag/services/rag-retrieval-service.ts` | 413–418 |
| `MAX_SECTIONS_PER_DOC: 6` | `src/lib/rag/services/rag-retrieval-service.ts` | 1008 |
| Context budget split | `src/lib/rag/services/rag-retrieval-service.ts` | 251–253 |
| Token truncation logic | `src/lib/rag/services/rag-retrieval-service.ts` | 335–346 |
| File size limits | `src/lib/rag/config.ts` | 52–59 |
| pgvector SQL function | `scripts/migrations/002-multi-doc-search.js` | 66–84 |
| `match_rag_embeddings_kb` call | `src/lib/rag/services/rag-embedding-service.ts` | 159–168 |

---

*End of analysis*
