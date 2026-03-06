# Frontier RAG System: Clarification Questions & Architectural Addendum

**Document Version**: v1
**Created**: February 8, 2026
**Status**: Architectural Addendum to 004-rag-frontier-overview_v1.md
**Prerequisite Reading**: 004-rag-frontier-overview_v1.md

---

## A. Technique-by-Technique Assessment

For each technique recommended in section 4 of document 004, the following assessment covers maturity, nature, overhead, compatibility, performance, cost, maintainability, security, accessibility, scalability, and compatibility.

---

### A.1 Contextual Retrieval (Anthropic, 2024)

**Your reply**: "Yes" — Confirmed for inclusion.

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **High.** Published by Anthropic in September 2024 with detailed benchmarks. Widely adopted across the industry within months. It is a preprocessing technique — it adds text to chunks before embedding. There are **no reports of it corrupting retrieval or storage** because it only prepends contextual text. The underlying data is never modified. The worst-case failure mode is a bad contextual preamble, which degrades quality slightly but never corrupts storage. |
| **b. What is it?** | **A pattern/technique, not a library.** Anthropic published the concept and benchmarks, not a software package. You implement it yourself: for each text section, you call an LLM with the full document + the section, asking it to write a 1-2 sentence contextual preamble. That preamble is prepended to the section before embedding. Any LLM can do this. Any embedding model can embed the result. |
| **c. Overhead** | **One-time cost at indexing.** One LLM call per section/chunk during ingestion. With Claude's prompt caching, this costs approximately $1.02 per million document tokens. For a 200-page document (~100K tokens), that's roughly $0.10. Zero overhead at query time — the embeddings are pre-computed and stored. |
| **d. Compatibility** | **Fully compatible.** It's a preprocessing step before embedding. It works with any embedding model, any vector store, any retrieval strategy. It adds zero new dependencies. It slots directly into our ingestion pipeline between "LLM reads document" and "embed sections." |
| **e. Performance** | **No query-time impact.** Indexing takes slightly longer (one LLM call per section). For a 200-page document with 20-40 sections, that adds 1-3 minutes to ingestion. Memory usage is negligibly higher (contextual preambles are 50-150 tokens each). |
| **f. Cost** | **Negligible.** ~$0.10 per 200-page document at indexing time. No ongoing costs. Storage increase is minimal (a few hundred extra tokens per section). |
| **g. Maintainability** | **Very easy.** It's a single prompt template + LLM call. If the preambles are bad, you adjust the prompt and re-run. No complex dependencies, no special configuration. Easy to A/B test (with vs. without contextual preambles). |
| **h. Security** | **No additional security concerns.** The contextual preambles are generated from your own documents by your own LLM. No external data enters the system. No new attack surface. |
| **i. Accessibility** | **Improves accessibility.** Better retrieval means better answers for all users, especially non-experts who use imprecise language. Completely invisible to the end user — they never see or interact with the preambles. |
| **j. Scalability** | **Scales linearly.** Cost and time scale linearly with document count. Can be parallelized (process multiple sections concurrently). No scalability bottlenecks. |
| **k. Compatibility** | **Universal compatibility.** Works with any embedding model (OpenAI, Jina, self-hosted). Works with any vector store (pgvector, Pinecone, etc.). Works alongside every other technique in this architecture. Easy to migrate — the preambles are just text. |

**Phase 1 recommendation**: **Include.** Low effort, high impact, no risk.

---

### A.2 RAPTOR — Hierarchical Summary Trees (Stanford, 2024)

**Your questions**: How mature? What is it? Overhead? Compatibility?

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **Moderate-High.** Published at ICLR 2024 (a top-tier AI venue) by Stanford researchers (Sarthi et al., January 2024). The official GitHub repository (parthsarthi03/raptor) has ~1,800 stars. It has been integrated into LangChain (as `RaptorRetriever`) and LlamaIndex. Growing production adoption, though most deployments are at companies doing advanced RAG rather than mainstream use. **No reports of corrupting retrieval or storage.** The only quality risk is that recursive summarization could introduce inaccuracies if the summarizing LLM hallucinates within a summary — but this is mitigable by using a high-quality LLM and can be verified. The original data is never modified; summaries are stored alongside, not in place of, the original text. |
| **b. What is it?** | **Both a pattern AND an open-source library.** The algorithm is: (1) chunk document, (2) embed chunks, (3) cluster similar chunks, (4) summarize each cluster, (5) embed the summaries, (6) repeat from step 3 on the summaries until no more meaningful clusters form. This builds a tree: leaves are original text, higher nodes are increasingly abstract summaries. At query time, you search across all levels. The official Python implementation is on GitHub. It is also available as components in LangChain and LlamaIndex. **However**: for our system, we don't need the exact RAPTOR library. Our architecture already implements the same principle — our multi-tier knowledge representation (document summary → section summaries → facts) IS a RAPTOR-style hierarchy, just built by intentional LLM comprehension rather than blind recursive clustering. |
| **c. Overhead** | **Indexing**: Significant. The recursive clustering + summarization process requires 2-5x more LLM calls than basic chunking. For a 200-page document, pure RAPTOR might take 5-15 minutes of LLM processing. **Storage**: ~1.5-2x more embeddings (original chunks + all summary levels). **Query time**: Negligible — it's just searching a slightly larger set of embeddings in the same vector store. |
| **d. Compatibility** | **Fully compatible.** RAPTOR produces embeddings that go into any vector store (pgvector works fine). It doesn't require any special infrastructure. The output is just more vectors alongside the original chunk vectors. No conflicts with Contextual Retrieval, HyDE, or any other technique. |
| **e. Performance** | **Indexing**: 3-10x slower than basic chunk-and-embed. **Query**: Negligible impact — searching 100 vectors vs. 60 vectors is effectively instant in pgvector. **Memory**: Proportional to the extra summary embeddings. |
| **f. Cost** | **Indexing**: 2-5x more LLM cost per document (due to summarization calls). For a 200-page document with Claude, this might be $0.50-$2.00 instead of $0.10-$0.20. **Storage**: ~1.5-2x more vector storage (still very cheap in pgvector). **Ongoing**: No additional query-time costs. |
| **g. Maintainability** | **Moderate complexity.** The tree structure adds a layer of abstraction to debug. If answers are wrong, you need to check: is the right summary being retrieved? Is the summary itself accurate? Updating a document requires rebuilding the tree for that document (but not the entire knowledge base). The LangChain/LlamaIndex integrations reduce implementation effort. |
| **h. Security** | **No additional security concerns.** Summaries are generated from your own documents. No new external dependencies or data flows. |
| **i. Accessibility** | **Significantly improves query handling.** Broad questions ("What is this document about?") get answered from high-level summaries. Specific questions ("What's the policy on X?") get answered from leaf-level detail. The user doesn't need to know the right level of specificity — the system handles it. |
| **j. Scalability** | **Scales well per-document.** Each document's tree is independent. Adding more documents adds more trees but doesn't increase the complexity of any individual tree. The main scalability concern is indexing time for large document collections (can be parallelized). |
| **k. Compatibility** | **High compatibility.** Works with any embedding model, any vector store. The LangChain/LlamaIndex integrations mean you can swap components easily. Can coexist with every other technique. |

**Phase 1 recommendation**: **Our multi-tier architecture already captures the RAPTOR principle.** We don't need the literal RAPTOR library — our LLM-driven document → sections → facts hierarchy achieves the same goal with better control. If we want pure RAPTOR on top of that, it's a Phase 3 enhancement.

**Critical clarification**: RAPTOR the algorithm is a good idea that we've already incorporated into our design. RAPTOR the specific library is optional and additive, not required.

---

### A.3 LazyGraphRAG (Microsoft, 2025)

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **Moderate.** Part of Microsoft's GraphRAG project, which has been in production at Microsoft since 2024. LazyGraphRAG (the "lazy" cost-optimized variant) was published in late 2024/early 2025. The main GraphRAG library has ~25,000+ GitHub stars and active development. LazyGraphRAG is newer but builds on the same battle-tested foundation. **No reports of corrupting data.** The graph is built from extracted entities and relationships — the original documents are never modified. |
| **b. What is it?** | **An open-source Python library** from Microsoft (github.com/microsoft/graphrag). It extracts entities and relationships from text, builds a knowledge graph, detects communities (clusters of related entities), and can answer queries that require understanding relationships across documents. "Lazy" means it defers expensive community summarization to query time instead of pre-computing everything. |
| **c. Overhead** | **Indexing**: Low for LazyGraphRAG (comparable to standard vector RAG). The "lazy" approach extracts entities and relationships but doesn't pre-summarize communities. **Query**: Higher than standard RAG — each query triggers on-demand community summarization (an LLM call). **Storage**: Graph storage (entities + relationships) in addition to vector embeddings. |
| **d. Compatibility** | **Partially compatible with caveats.** The GraphRAG library is Python-based. Our stack is Next.js/TypeScript. Integration options: (1) run GraphRAG as a separate Python microservice, (2) port the concepts to TypeScript, (3) use it as a batch processing step. It adds architectural complexity — it's not a drop-in component. |
| **e. Performance** | **Indexing**: Fast (entity extraction + relationship mapping). **Query**: Slower than vector-only RAG (on-demand summarization adds 2-5 seconds per query). **Memory**: Graph storage is moderate. |
| **f. Cost** | **Indexing**: 1% of full GraphRAG cost (the whole point of "lazy"). **Query**: Higher per query (LLM call for on-demand summarization). For a proof of concept with light query volume, this is affordable. At scale, query costs compound. |
| **g. Maintainability** | **Higher complexity.** Requires understanding graph data structures. A Python microservice adds a deployment dependency. Debugging requires inspecting the graph, entity extraction quality, and community detection results. Microsoft provides the library and documentation. |
| **h. Security** | **Moderate consideration.** The knowledge graph explicitly maps entity relationships. If the graph is exposed, it reveals the structure of your domain knowledge. Access control on graph data is important. No new external attack surface if self-hosted. |
| **i. Accessibility** | **Excellent for multi-document queries.** Users can ask questions that span multiple documents ("Which departments have overlapping policies?"). For single-document use, it adds less value. |
| **j. Scalability** | **Good for indexing, moderate for queries.** Graph size grows with document count. Query cost grows with graph complexity (more entities = more to summarize on demand). |
| **k. Compatibility** | **Requires Python.** This is the main compatibility concern. If your infrastructure is TypeScript-only, LazyGraphRAG needs a separate service or conceptual port. The entity/relationship data itself is portable (JSON, stored in PostgreSQL). |

**Phase 1 recommendation**: **Skip for Phase 1.** Single-document proof of concept doesn't need cross-document entity mapping. Add in Phase 2+ when multi-document support is built.

---

### A.4 ColPali — Visual Document Understanding (2024-2025)

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **Early-Moderate.** Published in 2024 by Illuin Technology and HuggingFace researchers. Models available on HuggingFace (vidore/colpali-v1.2). Active development with a growing research community (ECIR 2026 workshop dedicated to multi-vector retrieval). Production adoption is early-stage. **No corruption reports** — it's a retrieval model, not a storage system. The risk is lower-quality retrieval on certain document types, not data corruption. |
| **b. What is it?** | **A model + a retrieval pattern.** The model (based on PaliGemma-3B) is a vision-language model that processes document page images and produces multi-vector embeddings. You need: (1) the ColPali model (available on HuggingFace), (2) a multi-vector storage backend (VectorChord 0.3 for PostgreSQL, or Milvus/Weaviate), (3) GPU for inference. It uses the ColBERT-style late interaction pattern with MaxSim scoring. |
| **c. Overhead** | **Significant.** Requires GPU for processing document images (the vision model needs ~3-4GB VRAM). Processing speed is ~1-3 pages per second on a modern GPU. Storage is ~128 vectors per page (multi-vector representation), which is significantly more than single-vector approaches. Query time requires MaxSim computation across multi-vectors. |
| **d. Compatibility** | **Adds complexity.** Requires: GPU infrastructure for the vision model, multi-vector storage capability (standard pgvector only does single-vector; VectorChord 0.3 adds multi-vector support to PostgreSQL but is newer), image processing pipeline. This is a meaningful addition to the architecture. |
| **e. Performance** | **Indexing**: 1-3 pages/second on GPU. A 200-page document takes ~1-3 minutes. **Query**: MaxSim multi-vector matching is slower than single-vector cosine similarity but still fast (sub-second for reasonable collection sizes). **Memory**: Multi-vector storage is 50-100x larger per page than single-vector. |
| **f. Cost** | **GPU cost** for indexing and potentially for query-time model inference. Storage cost is higher (multi-vector). For a proof of concept, RunPod GPU instances could handle this for a few dollars per document. |
| **g. Maintainability** | **Higher complexity.** Vision model management, multi-vector storage, image processing pipeline — all new components compared to text-only RAG. The model itself is relatively self-contained but requires GPU infrastructure. |
| **h. Security** | **Document images processed.** Need to handle sensitive visual content appropriately. The model runs locally or on your GPU infrastructure — no external API calls for the vision processing. |
| **i. Accessibility** | **Excellent for complex documents.** Tables, charts, forms, multi-column layouts — all handled without any user effort. The user just uploads the PDF. For well-formatted text-only documents, it provides no advantage over text extraction. |
| **j. Scalability** | **GPU-bound.** Indexing throughput limited by GPU availability. Storage grows faster than text-only approaches. Good for moderate collections (hundreds of documents), may need optimization for thousands. |
| **k. Compatibility** | **Requires additional infrastructure.** GPU, multi-vector storage, potentially a separate processing service. Doesn't conflict with text-based RAG — can run alongside it (hybrid approach). |

**Phase 1 recommendation**: **Skip for Phase 1.** You confirmed that Phase 1 will use well-formatted, self-selected demo documents. ColPali's value is for messy, complex PDFs — not needed until real-world documents enter the system. Phase 3 or Phase 4.

---

### A.5 Self-RAG / Corrective RAG — Self-Healing Retrieval (2024-2025)

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **Moderate-High.** Self-RAG published October 2023 (Asai et al., University of Washington), presented at ICLR 2024. Corrective RAG (CRAG) published January 2024 (Yan et al., Rutgers). Both are well-cited and actively built upon. LangGraph provides production-ready CRAG templates. **No corruption reports** — this is an evaluation/correction layer that sits on top of retrieval, never modifying stored data. The worst failure mode is over-correcting (rejecting good results and re-querying), which adds latency but doesn't corrupt anything. |
| **b. What is it?** | **A pattern/technique.** Self-RAG is also a fine-tuned model (available on HuggingFace) but the concept can be implemented with any LLM. Corrective RAG is implemented as a workflow in LangGraph (LangChain's agent framework). The core idea: after retrieving context, use an LLM to evaluate whether the context is relevant and sufficient. If not, re-query with a refined strategy or acknowledge uncertainty. You can implement this as a simple post-retrieval evaluation step using Claude or any LLM — no special library required. |
| **c. Overhead** | **1-2 extra LLM calls per query** (one to evaluate retrieval quality, possibly one more for re-retrieval). Adds 1-4 seconds of latency per query. No indexing overhead. No storage overhead. |
| **d. Compatibility** | **Fully compatible.** It's an additional evaluation step in the query pipeline. Works with any retrieval strategy, any vector store, any LLM. Slots in between "context retrieved" and "response generated." |
| **e. Performance** | **Query latency increases by 1-4 seconds** (evaluation LLM call). In worst case (re-retrieval needed), doubles the query time. For a proof of concept where response quality matters more than speed, this is acceptable. Memory impact is negligible. |
| **f. Cost** | **1-2 extra LLM calls per query.** Using Claude Haiku for evaluation keeps this cheap (~$0.001 per query). Using a full Claude Sonnet call is more expensive but higher quality. No indexing or storage costs. |
| **g. Maintainability** | **Easy.** It's an if/else evaluation step with a clear prompt: "Is this context relevant to this query? Score 0-1." Easy to tune the threshold, easy to debug (evaluation scores are visible), easy to A/B test (with vs. without self-evaluation). |
| **h. Security** | **No additional security concerns.** The evaluation step processes the same data already in the pipeline. No new external calls or dependencies. |
| **i. Accessibility** | **Significantly improves user trust.** When the system can't find a good answer, it says so instead of hallucinating. This is especially important for non-technical users who can't evaluate answer quality themselves. |
| **j. Scalability** | **Scales linearly with query volume.** Each query adds a fixed overhead (1-2 LLM calls). No compounding effects. |
| **k. Compatibility** | **Universal.** Works with every other technique. Can use any LLM for evaluation. Can be turned on/off per query. |

**Phase 1 recommendation**: **Include.** Medium effort, high quality impact, critical for building user trust in a proof of concept. Use Claude Haiku for the evaluation step to keep it fast and cheap.

---

### A.6 HyDE — Hypothetical Document Embeddings (Evolved, 2025)

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **High.** Originally published December 2022 (Gao et al., Carnegie Mellon). One of the most established advanced RAG techniques. Integrated into LangChain (as `HypotheticalDocumentEmbedder`), LlamaIndex, and Haystack as standard components. Widely used in production. Well-understood strengths and limitations. **No corruption reports** — it only affects the query side, never touches stored data. Known limitation: for very specific factual queries (exact names, numbers), HyDE can sometimes degrade results because the hypothetical answer may not contain the exact terms. Easily mitigable with a hybrid approach (HyDE + direct search). |
| **b. What is it?** | **A pattern/technique** available as components in major frameworks. Not a standalone library. The implementation is simple: (1) receive user query, (2) ask LLM to generate a hypothetical answer (1 paragraph), (3) embed that hypothetical answer, (4) search the vector store with that embedding instead of the raw query embedding. The idea: the hypothetical answer uses vocabulary and framing closer to what's in the actual documents than the user's casual question. |
| **c. Overhead** | **One LLM call per query** (to generate the hypothetical document). Adds 1-3 seconds of latency. No indexing overhead. No storage overhead. |
| **d. Compatibility** | **Fully compatible.** It's a query preprocessing step. Works with any embedding model, any vector store, any retrieval strategy. Can be combined with Contextual Retrieval, Self-RAG, RAPTOR — all at the same time. |
| **e. Performance** | **Adds 1-3 seconds per query** (LLM call for hypothetical generation). No memory impact. No impact on indexing. |
| **f. Cost** | **One LLM call per query.** Using Claude Haiku for hypothesis generation: ~$0.001 per query. Using Sonnet: ~$0.005 per query. No indexing or storage costs. |
| **g. Maintainability** | **Very easy.** Single prompt template: "Given this question, write a paragraph that would answer it." Easy to tune, easy to debug (you can inspect the generated hypothetical), easy to A/B test. |
| **h. Security** | **No additional security concerns.** The hypothetical answer is generated internally, never stored, never exposed to the user. No new attack surface. |
| **i. Accessibility** | **Directly improves the non-technical user experience.** The #1 problem with RAG for non-experts: they ask questions in casual language that doesn't match formal document terminology. HyDE bridges this gap automatically. A user asking "when should I talk to my boss about a client problem?" gets matched to the formal document section about "supervisor escalation protocols." |
| **j. Scalability** | **Scales linearly with query volume.** Fixed cost per query. No compounding effects. |
| **k. Compatibility** | **Universal.** Works with everything. No dependencies. No conflicts. Can be turned on/off per query. |

**Phase 1 recommendation**: **Include.** Very low effort, meaningful impact, especially valuable for your target audience of non-technical users.

---

### A.7 Agentic RAG — Autonomous Retrieval Planning (2025)

| Dimension | Assessment |
|-----------|-----------|
| **a. Maturity** | **Early-Moderate.** The concept was formalized in survey papers in January 2025 (arXiv:2501.09136). Multiple frameworks support it (LangGraph, CrewAI, AutoGen). Production deployments exist but architectures vary significantly — there's no single "standard" Agentic RAG implementation. The maturity of the concept is high; the maturity of specific implementations is moderate. **No corruption reports** — agents only read from the knowledge base, never write to it during query time. The risk is unpredictable agent behavior (over-querying, circular reasoning), which affects response quality and latency but not data integrity. |
| **b. What is it?** | **A design pattern** implemented through agent frameworks. Not a single library. The concept: instead of a fixed retrieve-then-generate pipeline, an AI agent plans a multi-step retrieval strategy. It decomposes complex questions, searches multiple times, evaluates intermediate results, synthesizes, and iterates. Frameworks: LangGraph (most mature for production), CrewAI, AutoGen, custom implementations. |
| **c. Overhead** | **Significant.** 5-20 LLM calls per complex query (planning, multiple retrievals, evaluation, synthesis). Query latency: 10-60 seconds for complex multi-step queries. No indexing overhead. No storage overhead. The overhead is entirely at query time. |
| **d. Compatibility** | **Compatible but adds architectural complexity.** Requires an agent orchestration layer (LangGraph or custom). Adds a new component to the query pipeline. Works with any retrieval backend. |
| **e. Performance** | **Significantly slower per query.** 10-60 seconds for complex queries (vs. 2-5 seconds for standard RAG). For simple questions, it's overkill. Best used selectively: route complex queries to the agent, route simple queries to standard retrieval. |
| **f. Cost** | **Highest per-query cost** of all techniques. 5-20x more LLM calls per query. For a proof of concept with light query volume, this is manageable. At scale, it needs selective routing (only complex queries go through the agent). |
| **g. Maintainability** | **Most complex.** Agent behavior can be unpredictable. Debugging requires tracing multi-step reasoning chains. Testing requires diverse query types. Framework choice (LangGraph vs. custom) affects long-term maintainability. |
| **h. Security** | **Requires guardrails.** Agents with tool access (search, web access) need boundaries to prevent prompt injection from manipulating the agent's retrieval strategy. For a closed system (only searching your own knowledge base), the risk is low. |
| **i. Accessibility** | **Excellent for complex queries.** Users can ask multi-part questions naturally. The agent handles decomposition. For simple questions, it adds unnecessary delay. |
| **j. Scalability** | **Most expensive per query.** Should be reserved for queries that genuinely need multi-step reasoning. Selective routing is essential at scale. |
| **k. Compatibility** | **Framework-dependent.** LangGraph is Python-based (same concern as LazyGraphRAG — needs a Python service or TypeScript port). The pattern itself is framework-agnostic. |

**Phase 1 recommendation**: **Skip for Phase 1.** Single-document proof of concept with well-formatted documents doesn't need multi-step agent reasoning. Add in Phase 3 or Phase 4 when the system handles complex, multi-document queries.

---

### A — Summary: What Goes into Phase 1

| Technique | Phase 1? | Rationale |
|-----------|----------|-----------|
| **Contextual Retrieval** | **Yes** | Low effort, high impact, no risk |
| **RAPTOR** | **Principle yes, library no** | Our multi-tier architecture already implements the concept |
| **LazyGraphRAG** | **No** | Single-document POC doesn't need cross-document graphs |
| **ColPali** | **No** | Phase 1 uses well-formatted demo documents |
| **Self-RAG / Corrective RAG** | **Yes** | Critical for user trust, medium effort |
| **HyDE** | **Yes** | Very easy, directly helps non-technical users |
| **Agentic RAG** | **No** | Overkill for single-document POC |

---

## B. What Exactly Will We Build in Phase 1?

You said: "I want it to be 100% functional and high quality. It should not add additional steps that create more friction for the user."

Here is the exact scope of Phase 1, designed as a functional proof of concept for investors and customers.

### B.1 What the User Sees (The Product)

**Screen 1: Knowledge Base Dashboard**
- Clean page showing the user's knowledge base
- In Phase 1, this supports one document (architected for multiple)
- Shows: document name, status (processing / ready / needs questions), date uploaded
- "Add Document" button

**Screen 2: Document Upload**
- Drag-and-drop or file picker
- Accepts: PDF, DOCX, TXT, Markdown
- Optional one-line description field ("What is this document?")
- "Process" button
- Progress indicator: "Reading your document..." → "Ready"
- **Fast mode checkbox**: "Skip expert review (faster, slightly lower quality)"

**Screen 3: Expert Q&A** (skipped in fast mode)
- Chat-like interface
- System presents 3-8 ranked questions about the document
- User answers in natural language
- "Skip" button per question
- "Done" button to finish
- Progress: "Refining understanding..." → "Knowledge base ready"

**Screen 4: Verification** (optional, skipped in fast mode)
- System shows 2-3 sample questions and its proposed answers
- User confirms or corrects
- "Looks good" or "Try again" buttons

**Screen 5: Chat Interface**
- Clean chat interface with the knowledge base
- **Mode selector** (three options): "RAG Only" / "LoRA Only" / "RAG + LoRA"
- Source citations displayed with each response (expandable)
- Confidence indicator per response
- Quality scores visible (see Section D below)

### B.2 What the System Does (The Engine)

**Ingestion Pipeline**:
1. Store uploaded document in Supabase Storage
2. Extract text (pdf-parse for PDFs, mammoth for DOCX, direct read for TXT/MD)
3. Send full document text to Claude (200K context) with a structured prompt requesting:
   - Document summary (500-1000 words)
   - Section breakdown with section summaries
   - Key entities and definitions
   - Key facts as atomic statements
   - Topic taxonomy
   - Ambiguity list
   - 3-8 expert questions ranked by impact
4. Store all generated knowledge artifacts in Supabase PostgreSQL
5. Apply Contextual Retrieval: for each section, generate and prepend contextual preamble
6. Embed: document summary (Tier 1), each contextualized section (Tier 2), key facts (Tier 3)
7. Store all embeddings in pgvector
8. If fast mode: skip steps 5 (expert Q&A) and 6 (verification) of the user flow — go straight to "ready"

**Expert Q&A Loop** (when not in fast mode):
1. Present generated questions to user
2. Collect answers
3. Send answers back to Claude with the original document for knowledge refinement
4. Update section summaries, entity definitions, and fact list with expert context
5. Regenerate affected embeddings
6. Optionally run verification (sample Q&A)

**Retrieval Pipeline**:
1. Receive user query
2. Apply HyDE: generate hypothetical answer, embed it
3. Search Tier 1 (document-level) to confirm the right document
4. Search Tier 2 (section-level) to find relevant sections
5. Search Tier 3 (fact-level) for specific factual queries
6. Assemble context from matching sections + relevant facts + expert annotations
7. Apply Self-RAG evaluation: is the assembled context relevant? Sufficient?
8. If evaluation passes: generate response with the selected mode (RAG only / LoRA only / RAG + LoRA)
9. If evaluation fails: refine query and re-search, or acknowledge uncertainty
10. Return response with source citations and quality scores

**Quality Measurement** (built in from day one — see Section D):
1. Log every query, retrieval, and response
2. Auto-evaluate each response on faithfulness, relevance, and completeness
3. Track retrieval precision and recall
4. Dashboard showing quality metrics over time

### B.3 What Gets Built (The Components)

**New Database Tables** (multi-tenant from the start):
- `rag_knowledge_bases` — Knowledge base metadata (one per user/tenant in future)
- `rag_documents` — Document metadata, status, processing artifacts
- `rag_sections` — Extracted sections with summaries and contextual preambles
- `rag_facts` — Extracted atomic facts and entity definitions
- `rag_expert_questions` — Generated questions and expert answers
- `rag_embeddings` — Embeddings at all three tiers (linked to sections/facts/documents)
- `rag_queries` — Query log with retrieval results and quality scores
- `rag_quality_scores` — Per-response quality evaluation results

**New Services**:
- `rag-ingestion-service.ts` — Document reading, knowledge extraction, embedding
- `rag-expert-qa-service.ts` — Question generation, answer integration, refinement
- `rag-retrieval-service.ts` — Multi-tier retrieval with HyDE and self-evaluation
- `rag-quality-service.ts` — Automated quality evaluation (Claude-as-Judge)
- `rag-embedding-service.ts` — Embedding generation with provider abstraction layer

**New API Routes**:
- `/api/rag/documents` — Upload, list, delete documents
- `/api/rag/documents/[id]/process` — Trigger document processing
- `/api/rag/documents/[id]/questions` — Get/answer expert questions
- `/api/rag/documents/[id]/verify` — Run verification samples
- `/api/rag/query` — Query the knowledge base
- `/api/rag/quality` — Get quality metrics

**New UI Components**:
- `KnowledgeBaseDashboard` — Document list and status
- `DocumentUploader` — Upload with progress
- `ExpertQAChat` — Chat-style Q&A interface
- `VerificationPanel` — Sample question verification
- `RAGChat` — Chat with mode selector and citations
- `SourceCitation` — Expandable citation card
- `QualityDashboard` — Quality metrics display
- `ModeSelector` — RAG / LoRA / RAG+LoRA toggle

**New Hooks**:
- `useRAGDocuments` — Document management
- `useExpertQA` — Expert Q&A flow
- `useRAGChat` — Chat with RAG retrieval
- `useRAGQuality` — Quality metrics

### B.4 What Phase 1 Does NOT Include

- Multi-document support (architected for it, not built)
- ColPali visual processing (well-formatted demo docs only)
- LazyGraphRAG knowledge graphs (single document)
- Agentic RAG multi-step reasoning (simple queries sufficient)
- Complex document parsing (tables, images, scanned docs)
- Production-grade performance optimization
- Gemini integration (Claude only for Phase 1)

---

## C. Self-Hosted LLM Options

You said: "Another of our product lines is 100% certifiable siloed self-hosted self-managed self-run. What models would be adequate for processing the data in the self-hosted version?"

### C.1 Self-Hosted Models for Document Understanding

The document understanding step (reading a full document, generating summaries, extracting entities, generating questions) is the most demanding task. Here are the viable self-hosted options:

| Model | Parameters | Context Window | Min GPU Setup | Quality vs Claude | Processing Time (200-page doc) |
|-------|-----------|---------------|---------------|-------------------|-------------------------------|
| **Llama 3.1 405B** | 405B | 128K tokens (~96 pages) | 8x A100 80GB or 4x H100 | ~85-90% of Claude quality | ~10-20 minutes |
| **DeepSeek V3** | 671B (MoE, 37B active) | 128K tokens | 4x A100 80GB (quantized) | ~85-90% of Claude quality | ~8-15 minutes |
| **Qwen 2.5 72B** | 72B | 128K tokens | 2x A100 80GB or 4x A6000 48GB | ~80-85% of Claude quality | ~5-10 minutes |
| **Llama 3.3 70B** | 70B | 128K tokens | 2x A100 80GB or 4x A6000 48GB | ~80-85% of Claude quality | ~5-10 minutes |
| **Qwen 2.5-1M 7B** | 7B | 1M tokens (~750 pages) | 1x A100 80GB | ~60-70% of Claude quality | ~15-25 minutes (due to huge context) |
| **Mistral Large 2 123B** | 123B | 128K tokens | 4x A100 80GB | ~80-85% of Claude quality | ~8-15 minutes |

**Key observations**:

1. **No self-hosted model matches Claude's 200K context window reliably.** Most top models support 128K tokens (~96 pages). For documents exceeding this, you'll need the windowed processing approach (read in overlapping windows, synthesize).

2. **Qwen 2.5-1M supports 1M tokens** but it's a 7B model — significantly less capable at comprehension tasks. The context window is huge but the model's ability to reason over all that context is lower.

3. **Quality gap is real but manageable.** The best open-source models (Llama 3.1 405B, DeepSeek V3) achieve 85-90% of Claude's quality on document understanding. This means slightly less accurate summaries, occasionally missing nuances, and less sophisticated question generation. For most business documents, this is adequate.

4. **Processing time is 5-20x slower** than the API version. Claude API processes a 200-page document in 30-90 seconds. Self-hosted models on typical GPU setups take 5-20 minutes. This is a one-time cost per document (not per query) so it's acceptable.

### C.2 Practical Self-Hosted Recommendation

**Tier 1 (Best quality, most expensive hardware)**:
- **DeepSeek V3** or **Llama 3.1 405B** on 4-8x A100/H100 GPUs
- Quality: ~85-90% of Claude
- Best for: organizations that need the highest self-hosted quality

**Tier 2 (Good quality, reasonable hardware)**:
- **Qwen 2.5 72B** or **Llama 3.3 70B** on 2x A100 or 4x A6000 GPUs
- Quality: ~80-85% of Claude
- Best for: most self-hosted deployments, good balance of quality and cost

**Tier 3 (Adequate quality, minimal hardware)**:
- **Qwen 2.5 32B** or **Mistral Small 22B** on 1x A100 or 2x A6000 GPUs
- Quality: ~70-75% of Claude
- Best for: cost-sensitive deployments where "good enough" is acceptable

### C.3 Self-Hosted Embedding Models

| Model | Dimensions | Max Input | GPU Needed? | Quality vs OpenAI text-embedding-3-small |
|-------|-----------|-----------|-------------|------------------------------------------|
| **BGE-M3 (BAAI)** | 1024 | 8K tokens | Recommended (can run on CPU) | ~95-98% — essentially equivalent |
| **E5-Mistral-7B-Instruct** | 4096 | 32K tokens | Yes (7B model) | ~98-100% — matches or exceeds |
| **Nomic-embed-text v1.5** | 768 | 8K tokens | No (CPU-friendly) | ~90-95% — very good |
| **Jina Embeddings v3** | 1024 | 8K tokens | Recommended | ~95-98% — near equivalent |
| **GTE-Qwen2-7B-Instruct** | 3584 | 32K tokens | Yes (7B model) | ~98-100% — top tier |

**Recommendation for self-hosted embedding**: **BGE-M3** — near-identical quality to OpenAI's embeddings, can run on CPU for small workloads, widely adopted, multilingual support, easy to deploy.

### C.4 Architecture for API-to-Self-Hosted Portability

To make Phase 1 (API-based) easily upgradeable to Self Hosted for Phase 5. We will build phase 1-4 using frontier models and APIs. 

**Build an abstraction layer for each external service:**

1. **LLM Provider Interface**: Define a standard interface for document understanding calls. Phase 1 implements it with Claude API. Phase 5 adds a self-hosted implementation (vLLM serving Qwen 72B or Llama 70B). A configuration setting switches between them.

2. **Embedding Provider Interface**: Define a standard interface for embedding generation. Phase 1 implements it with OpenAI API. Phase 5 adds a self-hosted implementation (BGE-M3 via a local embedding server). Same configuration switch.

3. **Both implementations produce identical outputs** (text summaries, vector embeddings). The rest of the system doesn't know or care which provider is active.

This is the same pattern you already use with `INFERENCE_MODE=pods` vs `INFERENCE_MODE=serverless` in the existing codebase. Apply the same pattern to the RAG module.

---

## D. RAG Quality Measurement

You asked: "How do we measure the quality of the RAG system? What metrics will we use? Can we build in the measurability into the system we build in Phase 1?"

### D.1 Yes — Build Measurability into Phase 1 From Day One

This is one of the most important things to get right early. If you can't measure quality, you can't prove quality to investors or improve the system over time. You already have Claude-as-Judge in your stack for the LoRA evaluation system. The same pattern applies to RAG.

### D.2 The RAG Quality Metrics

There are two categories: **Retrieval Quality** (did the system find the right information?) and **Response Quality** (did the system generate a good answer from that information?).

#### Retrieval Quality Metrics

| Metric | What It Measures | How to Compute |
|--------|-----------------|----------------|
| **Context Relevance** | Are the retrieved sections actually relevant to the query? | LLM-as-Judge: "On a scale of 0-1, how relevant is this retrieved context to this query?" |
| **Context Precision** | Of the sections retrieved, what percentage are relevant? | Count of relevant sections / total sections retrieved |
| **Context Sufficiency** | Does the retrieved context contain enough information to answer the query? | LLM-as-Judge: "Does this context contain sufficient information to fully answer this query? 0-1" |

#### Response Quality Metrics

| Metric | What It Measures | How to Compute |
|--------|-----------------|----------------|
| **Faithfulness** (Groundedness) | Is the response grounded in the retrieved context? (No hallucination) | LLM-as-Judge: "Does every claim in this response have support in the provided context? 0-1" |
| **Answer Relevance** | Does the response actually answer the question? | LLM-as-Judge: "How well does this response address the original query? 0-1" |
| **Answer Completeness** | Does the response capture all key information from the relevant context? | LLM-as-Judge: "Does this response include all important points from the context that are relevant to the query? 0-1" |
| **Citation Accuracy** | Are the source citations correct? | Automated: verify that cited sections actually contain the referenced information |

#### End-to-End Quality Score

Combine the above into a single composite score:

```
RAG Quality Score = (
  0.30 × Faithfulness +
  0.25 × Answer Relevance +
  0.20 × Context Relevance +
  0.15 × Answer Completeness +
  0.10 × Citation Accuracy
)
```

This gives a 0-1 score per response that can be tracked over time, compared across modes (RAG vs LoRA vs RAG+LoRA), and shown to investors.

### D.3 How It Works in Practice

**For every query in Phase 1, the system automatically:**

1. **Logs** the query, retrieved context (section IDs + text), and generated response
2. **Evaluates** using Claude-as-Judge (Claude Haiku for speed):
   - Sends: query + retrieved context + generated response
   - Receives: scores for faithfulness, relevance, completeness, context relevance
3. **Stores** all scores in `rag_quality_scores` table
4. **Displays** a quality indicator on each response (e.g., green/yellow/red dot)
5. **Aggregates** into a dashboard showing average quality over time

**Cost**: One Claude Haiku call per query for evaluation (~$0.001 per evaluation). Negligible.

### D.4 What the Quality Dashboard Shows

For the proof of concept, the dashboard should display:

- **Overall quality score** (average across all queries): "Your knowledge base is performing at 87% quality"
- **Per-metric breakdown**: Faithfulness 92%, Relevance 88%, Completeness 81%, etc.
- **Mode comparison**: Side-by-side quality scores for RAG Only vs LoRA Only vs RAG+LoRA
- **Query history**: Each query with its quality scores, ability to drill into details
- **Trend line**: Quality over time (shows improvement after expert Q&A answers are provided)
- **Low-quality flags**: Queries where quality dropped below threshold (for investigation)

### D.5 Evaluation Frameworks Considered

| Framework | What It Does | Recommendation |
|-----------|-------------|----------------|
| **RAGAS** | Open-source RAG evaluation framework. Computes context relevance, faithfulness, answer relevance, context precision/recall. Uses LLM-as-Judge. | Well-established, widely used, Python-based. Could be used as a reference but we'll implement natively in TypeScript to stay in-stack. |
| **DeepEval** | Open-source evaluation framework with RAG metrics. | Good alternative to RAGAS. Python-based. |
| **TruLens** | RAG evaluation with the "RAG Triad" (context relevance, groundedness, answer relevance). | Good conceptual framework. Python-based. |
| **Custom (Claude-as-Judge)** | Implement evaluation directly using Claude API calls with structured prompts. | **Recommended for Phase 1.** Stays in your TypeScript stack, uses Claude you already have, full control, no Python dependency. You already know how to do this from the LoRA evaluation system. |

**Recommendation**: Build custom evaluation using the Claude-as-Judge pattern you already have. The metrics are well-defined, the implementation is straightforward, and it keeps everything in TypeScript without adding Python dependencies.

---

## E. Multi-Document Knowledge Bases Explained

You asked: "What exactly is multi-document knowledge bases with cross-document intelligence? Explain it to me like I am a non-technical business owner."

### E.1 The Simple Explanation

Imagine you just hired a brilliant new employee. On their first day, you hand them one manual — your Clinical Practice Guide. After reading it thoroughly, they can answer any question about clinical practices. That's **single-document RAG** (Phase 1).

Now imagine instead of one manual, you hand them your entire filing cabinet:
- Clinical Practice Guide
- Employee Handbook
- Insurance Policy Manual
- State Licensing Regulations
- Client Intake Procedures
- Training Certification Requirements

After reading everything, this employee can do something remarkable: **they can connect information across documents.**

A simple question like *"Can our new hire Maria start seeing clients next week?"* actually requires information from **four different documents**:
1. **Employee Handbook**: What's the onboarding period? (2 weeks minimum)
2. **Training Certification**: Is Maria's certification valid? (Needs verification)
3. **State Licensing Regulations**: Does she need state-specific approval? (Yes, 30-day registration)
4. **Client Intake Procedures**: What paperwork must be completed first? (3 forms)

The answer isn't in any single document. It's in the **connections between them**. That's cross-document intelligence.

### E.2 Why This Matters for Your Business

**Without cross-document intelligence**: The user has to know which document to ask about. They ask one question per document, get fragmented answers, and have to synthesize the answer themselves.

**With cross-document intelligence**: The user asks one natural question and gets a complete, synthesized answer that pulls from all relevant sources, with citations showing where each piece of information came from.

For investors: this is the difference between a "fancy search engine" and a "digital expert who has read everything and understands how it all connects."

### E.3 What's Most Important in the Proof of Concept

**Get one document working perfectly first.** Here's why:

1. **If single-document quality is poor, multi-document will be worse.** Bad retrieval from one document multiplied across six documents = six times worse.

2. **The proof of concept needs to impress with quality, not breadth.** An investor who sees one document answered flawlessly is more impressed than one who sees six documents answered poorly.

3. **The hard problems are in the foundation.** Getting the LLM to understand a document well, generating good questions, embedding effectively, retrieving accurately, and measuring quality — these are the same problems whether you have one document or fifty. Solve them once, and adding more documents is incremental.

4. **Multi-document is mostly "more of the same" plus routing.** Once single-document works, adding multi-document support requires: (a) handling multiple documents in the knowledge base, (b) adding a document routing step at query time ("which document(s) are relevant?"), and (c) synthesizing answers from multiple sources. Steps (a) and (b) are straightforward. Step (c) is where cross-document intelligence gets sophisticated.

**Phase 1 proves the engine works. Phase 2 expands the garage to hold more cars.**

---

## F. Replies to Open Questions (Section 11 of Doc 004)

### F.1 — LLM for Document Understanding

**Your reply**: "Claude is fine for this version, can we add Gemini as an option in Phase 1? What are our options for self hosting?"

**Answer**: Yes, we can architect Phase 1 to support multiple LLM providers with Claude as the default. Here's how:

**Phase 1 Implementation**:
- Build an **LLM Provider Interface** (abstract class/interface in TypeScript)
- Implement `ClaudeLLMProvider` as the default (uses Claude API, 200K context)
- The interface defines standard methods: `readDocument()`, `generateQuestions()`, `refineKnowledge()`, `evaluate()`
- Adding Gemini = implementing `GeminiLLMProvider` against the same interface
- Configuration setting selects which provider to use

**Gemini in Phase 1**: Adding Gemini is a moderate effort (~2-3 days of implementation). The main benefit is the 1M+ token context window for very large documents. The trade-off is a new API dependency (Google AI Studio or Vertex AI). **Recommendation**: Build the interface in Phase 1, implement Claude, add Gemini as an optional provider if time permits. The abstraction costs almost nothing to build.

**Self-hosting options**: See Section C above. The same interface pattern means self-hosted providers (vLLM serving Qwen 72B, Llama 70B, etc.) can be added as additional implementations.

### F.2 — Embedding Model with Upgrade Path

**Your reply**: "Phase 1 should use the best available models. Phase 5 should be easily upgradeable to privately hosted. How do you recommend we do that?"

**And**: "Help me understand what the embedding model is."

**What is an embedding model?**

An embedding model is a translator between human language and mathematics. It converts text into a list of numbers (called a "vector") that represents the *meaning* of that text.

Think of it this way: if you could plot every sentence on a map, sentences with similar meanings would be close together, and sentences with different meanings would be far apart. An embedding model creates that map.

**When is it used?**

| When | What Happens |
|------|-------------|
| **At indexing time** (when you add a document) | Each section of your document is converted into a vector and stored |
| **At query time** (when someone asks a question) | The question is converted into a vector and compared against all stored section vectors |
| **Every time** | The embedding model is needed at both stages. It's not a one-time "training" step — it's an ongoing translator |

**Important**: The same embedding model must be used for both indexing and querying. You can't embed documents with Model A and query with Model B — the "languages" wouldn't match.

**How to build for upgrade path**:

Same pattern as the LLM provider:
- Build an **Embedding Provider Interface**
- Phase 1 implements `OpenAIEmbeddingProvider` (text-embedding-3-small)
- Phase 2 adds `SelfHostedEmbeddingProvider` (BGE-M3 running on local GPU)
- Configuration setting selects which provider to use

**Critical caveat**: If you switch embedding models, you must re-embed all existing documents. The vectors from OpenAI and BGE-M3 are not compatible (different dimensions, different semantic space). This is a one-time migration cost when switching providers. Build the system so re-embedding a knowledge base is a single button click.

### F.3 — ColPali

**Your reply**: "Phase 1 is a proof of concept. We can self-select well formatted input documents for this phase."

**Answer**: Confirmed. ColPali deferred to Phase 3 or Phase 4. Phase 1 uses standard text extraction (pdf-parse, mammoth). This is the right decision — it removes significant complexity from the proof of concept.

### F.4 — Knowledge Graph Depth

**Your reply**: "Phase 1 is a proof of concept. We can self-select well formatted input documents for this phase."

**Answer**: Confirmed. Phase 1 uses embeddings only (no knowledge graph). The lightweight entity extraction we do as part of the LLM document reading (key entities, key facts) provides basic entity awareness without a formal graph structure. LazyGraphRAG deferred to Phase 2+.

### F.5 — Document Types

**Your reply**: "We will create our own demo documents for this phase and format them as needed."

**Answer**: Perfect. This means Phase 1 can use the simplest parsing pipeline (pdf-parse for PDF, mammoth for DOCX, direct read for TXT/MD). No need for OCR, complex table extraction, or image processing. Recommend creating demo documents in **Markdown or well-formatted PDF** for maximum parsing reliability.

### F.6 — Document Count

**Your reply**: "We can self select well formatted input documents for this phase."

**Answer**: Phase 1 designed for 1 document per knowledge base. The database schema and architecture support multiple documents (multi-tenant, multi-document from the start), but the UI and retrieval logic are optimized for the single-document experience. Adding more documents = Phase 2 scope.

### F.7 — LoRA Toggle

**Your reply**: "For Phase 1 users should be able to use RAG alone, Adapter alone, or both together based on a user selection."

**Answer**: This is a clean three-way mode selector in the chat interface:

| Mode | What Happens |
|------|-------------|
| **RAG Only** | Query → Retrieve context → Send to base model (Mistral-7B without LoRA) with RAG context → Response |
| **LoRA Only** | Query → Send to adapted model (Mistral-7B + EI LoRA) without RAG context → Response |
| **RAG + LoRA** | Query → Retrieve context → Send to adapted model (Mistral-7B + EI LoRA) with RAG context → Response |

This is the existing A/B testing infrastructure with one addition: an optional RAG context injection step before inference. The mode selector determines: (a) whether to retrieve RAG context, and (b) which model endpoint to send to (control vs adapted).

This three-way comparison is actually an **excellent demo feature** — it visually proves the value of each component and their combination.

### F.8 — Multi-Tenancy

**Your reply**: "Architect the system for multi-tenancy from the start. Align with the current app."

**Answer**: All RAG database tables will include a `user_id` column (matching the existing app pattern). Row-Level Security (RLS) policies will be applied to all tables, ensuring users can only access their own knowledge bases, documents, and queries. The current app's Supabase client and authentication patterns will be reused.

In Phase 1, this means:
- Data is isolated per user even if there's only one user
- The schema is ready for multi-tenant deployment
- No refactoring needed when multi-tenancy goes live
- Consistent with how the rest of the Bright Run app works

### F.9 — Phase 1 Done

**Your reply**: "Yes, lets focus on upload one document, answer questions, ask questions and get good answers."

**Answer**: Confirmed. Phase 1 definition of done:

1. A user can upload one document (PDF, DOCX, TXT, or MD)
2. The system reads and understands the document (using Claude)
3. The system generates expert questions (or skips them in fast mode)
4. The expert can answer questions in a chat interface
5. The system refines its understanding with the answers
6. The user can ask questions about the document and get good, cited answers
7. The user can switch between RAG Only, LoRA Only, and RAG + LoRA modes
8. Quality metrics are automatically computed and displayed
9. The entire flow works end-to-end, is visually polished, and can be demoed

### F.10 — Fast Mode

**Your reply**: "Yes, the system also support a 'fast mode' that skips expert questions for rapid prototyping."

**Answer**: Fast mode skips the Expert Q&A and Verification steps. The flow becomes:

Upload → LLM reads document → Generate knowledge representation → Embed → Ready to chat

Total time from upload to chatting: **2-5 minutes** (depending on document size).

The quality difference between fast mode and full mode (with expert Q&A) becomes a measurable data point that you can show investors: "With expert input, quality improves from X to Y."

---

## G. Additional Considerations for Phase 1

You asked: "Do my questions above and the discussion we are having make you think of anything else we should consider?"

Yes. Given that Phase 1 is a proof of concept for investors and customers, here are additional considerations:

### G.1 Demo Script / Golden Path

Create a specific demo script with:
- A purpose-built demo document (clear, well-structured, with intentional ambiguities for the Q&A loop to discover)
- 5-10 pre-tested questions that showcase different capabilities (factual lookup, contextual understanding, multi-section synthesis)
- A rehearsed flow: upload → fast mode → ask questions → show quality → then: switch to full mode → answer expert questions → show quality improvement → switch between RAG/LoRA/RAG+LoRA modes → show the difference

This script should be designed and tested before any demo. The demo document should be crafted to make the system shine.

### G.2 Quality Comparison as the Hero Feature

The three-way mode comparison (RAG / LoRA / RAG+LoRA) is your strongest selling point. Design the UI so this comparison is front and center:
- Side-by-side response comparison (like your existing A/B testing)
- Quality scores visible for each mode
- Source citations visible for RAG modes
- The LoRA-only response shows emotional intelligence without domain knowledge
- The RAG-only response shows domain knowledge without emotional intelligence
- The RAG+LoRA response shows both — the "this is why you need our platform" moment

### G.3 Error States for Non-Technical Users

The proof of concept will encounter edge cases. Design error messages for non-technical users:
- "I couldn't find enough information in your document to answer this question. Try rephrasing or answering the expert questions to improve my understanding."
- "I found some relevant information but I'm not confident in my answer. Here's what I found: [citation]. You may want to verify this directly."
- "This question seems to be about something not covered in your document."

Never show technical errors (API timeouts, embedding failures, etc.) to the user. Translate them into human language.

### G.4 Processing Time Expectations

Document processing (reading + understanding + embedding) will take 2-5 minutes for a typical 50-200 page document. Set expectations in the UI:
- "Reading your document... This typically takes 2-5 minutes for a document this size."
- Progress bar or step indicators
- Email/notification when processing is complete (so the user doesn't have to watch)

### G.5 Document Size Limits for Phase 1

Claude's 200K context window handles ~150 pages comfortably. For Phase 1, set a clear limit:
- Documents up to 150 pages: processed in a single LLM call (best quality)
- Documents 150-500 pages: processed in overlapping windows with synthesis (slightly lower quality, longer processing)
- Documents 500+ pages: "This document is very large. For best results, consider splitting it into sections."

For the proof of concept, recommend using documents under 150 pages for the cleanest demo experience.

### G.6 Data Retention and Privacy Considerations

Even for a proof of concept, be clear about:
- Where the document content is stored (Supabase — your infrastructure)
- What gets sent to external APIs (document text to Claude for understanding, section text to OpenAI for embedding)
- What stays local (all database records, all embeddings after generation)

This matters for investor conversations and becomes critical for the self-hosted version.

### G.7 Versioning From the Start

When a user re-uploads a document or updates their expert answers, the system should:
- Keep a history (version tracking on knowledge representations)
- Re-embed affected sections
- Allow rollback ("the answers were better before I updated the document")
- This doesn't need to be fancy in Phase 1 — just a `version` column and a "reprocess" button

### G.8 The Most Important Thing to Get Right

You asked this in question E, and it bears repeating here as the final consideration:

**The single most important thing in Phase 1 is response quality from a single document.**

If the system can read a document, understand it, and answer questions about it accurately — with citations, with confidence scores, and with measurable quality — then everything else (multi-document, knowledge graphs, visual processing, agentic RAG) is an incremental upgrade to an already-impressive foundation.

If response quality is mediocre, no amount of additional features will save the demo.

Focus 80% of effort on:
1. The quality of the LLM's document understanding (the ingestion prompts)
2. The quality of retrieval (getting the right sections for each query)
3. The quality of response generation (grounded, cited, complete answers)
4. The quality measurement system (proving all of the above with numbers)

---

## Summary of Decisions Made

| Decision | Resolution |
|----------|-----------|
| **Phase 1 techniques** | Contextual Retrieval + HyDE + Self-RAG (include); RAPTOR concept built-in; ColPali/LazyGraphRAG/Agentic deferred |
| **Phase 1 scope** | Single document, full pipeline, three-way mode selector, quality measurement |
| **Fast mode** | Yes — skips expert Q&A for rapid prototyping |
| **LLM for understanding** | Claude (default), Gemini (optional, via abstraction layer) |
| **Embedding model** | OpenAI text-embedding-3-small (Phase 1), self-hosted BGE-M3 (Phase 2 upgrade) |
| **Provider abstraction** | Yes — LLM Provider Interface + Embedding Provider Interface for upgrade path |
| **Self-hosted quality** | 80-90% of Claude with top-tier open models (Llama 405B, DeepSeek V3, Qwen 72B) |
| **Self-hosted embedding** | BGE-M3 — near-equivalent to OpenAI, CPU-capable |
| **Multi-tenancy** | Architected from start, consistent with existing app |
| **Document format** | Phase 1: well-formatted text (PDF, DOCX, TXT, MD). Complex formats deferred. |
| **Quality measurement** | Built into Phase 1. Claude-as-Judge. 5 metrics. Dashboard. |
| **ColPali** | Phase 3/4 |
| **Knowledge graph** | Phase 2+ (lightweight entities extracted in Phase 1 via LLM, no formal graph) |
| **Three-way comparison** | RAG Only / LoRA Only / RAG + LoRA — hero feature for demos |
| **Phase 1 done** | Upload → understand → Q&A → chat → quality scores → demo-ready |

---

**Document Owner**: Project Management & Control (PMC)
**File Location**: `pmc/product/_mapping/v2-mods/006-rag-frontier-questions_v1.md`
