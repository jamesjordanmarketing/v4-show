# RAG + LoRA Adapter Integration Overview

**Document Version**: v1  
**Created**: February 8, 2026  
**Status**: Overview / Feasibility Analysis

---

## Executive Summary

This document analyzes the feasibility and approach for adding a Retrieval-Augmented Generation (RAG) system to work **concurrently** with the existing Emotional Intelligence (EI) LoRA adapter on the Bright Run platform.

**Key Finding**: ✅ **Yes, this is fully possible** with your current technology stack.

---

## 1. Is It Possible?

**✅ Yes, absolutely.**

The current architecture supports this integration with minimal disruption:

| Component | RAG Compatibility |
|-----------|-------------------|
| **Supabase PostgreSQL** | Native `pgvector` extension support |
| **vLLM (RunPod)** | Supports RAG context injection + LoRA adapters simultaneously |
| **Next.js / Vercel** | LangChain/LlamaIndex work seamlessly in API routes |
| **Existing LoRA Adapter** | No modifications required |

**The key insight**: RAG and LoRA serve **different purposes** and operate at **different layers**:

- **RAG**: Retrieves relevant context → injects into the **prompt**
- **LoRA**: Modifies model **weights** → changes how the model responds

They can operate together—the model receives RAG-augmented prompts while the LoRA adapter shapes response style.

---

## 2. Broad Strokes of Implementation

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. EMBEDDING                                                │   │
│  │     - Convert user query → vector embedding                  │   │
│  │     - Using: OpenAI text-embedding-3-small OR                │   │
│  │              Sentence Transformers (local)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. RETRIEVAL (Supabase pgvector)                           │   │
│  │     - Similarity search against knowledge base              │   │
│  │     - Return top-K relevant documents/chunks                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. PROMPT AUGMENTATION                                      │   │
│  │     - Inject retrieved context into system/user prompt       │   │
│  │     - Format: "Based on this context: {docs}..."             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. INFERENCE (RunPod vLLM)                                  │   │
│  │     - Augmented prompt → Mistral-7B + EI LoRA adapter        │   │
│  │     - Model responds with domain knowledge + EI style        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **Ingest**: Domain documents → chunked → embedded → stored in Supabase
2. **Query**: User question → embedded → similarity search → retrieve chunks
3. **Augment**: Retrieved chunks + user question → formatted prompt
4. **Generate**: Augmented prompt → vLLM (base model + LoRA) → response

---

## 3. Implementation Process

### Phase 1: Core Infrastructure (1-2 weeks)

1. **Enable pgvector in Supabase**
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Create embeddings table with vector column
   - Set up similarity search function (RPC)

2. **Create Embedding Service**
   - New service: `src/lib/services/embedding-service.ts`
   - Choose embedding model (see Section 5)
   - Implement embed/search functions

3. **Build Ingestion Pipeline**
   - Document upload UI
   - Text extraction (PDF, TXT, Markdown)
   - Chunking strategy (512-1024 tokens, 10-20% overlap)
   - Batch embedding and storage

### Phase 2: RAG Query Pipeline (1 week)

4. **Create RAG Service**
   - New service: `src/lib/services/rag-service.ts`
   - Query embedding + retrieval
   - Context formatting for prompts

5. **Integrate with Inference**
   - Modify `inference-pods.ts` to accept RAG context
   - Prompt template with context injection
   - Toggle RAG on/off per request

### Phase 3: UI and Management (1-2 weeks)

6. **Document Management UI**
   - Upload interface
   - Knowledge base browser
   - Chunk preview and editing

7. **Chat Integration**
   - RAG toggle in chat interface
   - Source citation display
   - Relevance score indicators

### Phase 4: Testing and Optimization (1 week)

8. **Quality Evaluation**
   - RAG-only vs RAG+LoRA comparison
   - Retrieval accuracy metrics
   - Response quality assessment

---

## 4. Internal Building Blocks Needed

### New Components to Build

| Component | Purpose | Location |
|-----------|---------|----------|
| `embedding-service.ts` | Generate and manage embeddings | `src/lib/services/` |
| `rag-service.ts` | Retrieval and context assembly | `src/lib/services/` |
| `document-service.ts` | Document ingestion and chunking | `src/lib/services/` |
| `useRAG.ts` | React hook for RAG features | `src/hooks/` |
| Embeddings table | Store document vectors | Supabase migration |
| Documents table | Store source document metadata | Supabase migration |
| Chunks table | Store individual text chunks | Supabase migration |

### Modified Components

| Component | Modification |
|-----------|--------------|
| `inference-pods.ts` | Add optional `ragContext` parameter to prompt building |
| `multi-turn-conversation-service.ts` | Support RAG context in conversation history |
| Chat UI components | Add RAG toggle and source display |

### Leverage Existing Components

| Component | Reuse For |
|-----------|-----------|
| `supabase-client.ts` | Database and storage access |
| SAOL | Database operations for new tables |
| Claude API client | Potentially for summarization during ingestion |
| Existing storage buckets | Store source documents (new bucket: `rag-documents`) |

---

## 5. External Building Blocks / Tools

### Required (Must Have)

| Tool | Purpose | Cost |
|------|---------|------|
| **pgvector** (Supabase extension) | Vector similarity search | Free (built into Supabase) |
| **Embedding Model** (see options below) | Convert text → vectors | See options |

### Embedding Model Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **OpenAI text-embedding-3-small** | High quality, easy setup | $0.02/1M tokens, API dependency | ✅ Recommended for simplicity |
| **OpenAI text-embedding-3-large** | Highest quality | $0.13/1M tokens | For premium use cases |
| **Sentence Transformers (local)** | Free, no API calls | Slower, requires hosting | For cost-sensitive/privacy needs |
| **Voyage AI** | Good for code/technical docs | $0.10/1M tokens | If heavy code documentation |

### Optional (Nice to Have)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **LangChain** | RAG orchestration framework | If building complex pipelines |
| **LlamaIndex** | Alternative RAG framework | If needing advanced retrieval patterns |
| **Unstructured.io** | PDF/doc parsing | For complex document formats |
| **Pinecone/Weaviate** | Dedicated vector DB | Only if pgvector becomes bottleneck |

### Not Required

- ❌ **New LLM provider** - Use existing Mistral-7B
- ❌ **New GPU infrastructure** - Same RunPod pods
- ❌ **New cloud provider** - Stays on Vercel + Supabase

---

## 6. Will It Be High Quality?

### Quality Assessment

| Factor | Assessment | Notes |
|--------|------------|-------|
| **Retrieval Quality** | ✅ High | pgvector with good embeddings matches dedicated vector DBs |
| **Response Quality** | ✅ High | RAG context + LoRA adaptation = best of both worlds |
| **Latency** | ⚠️ Moderate | Adds ~100-300ms for retrieval step |
| **Scalability** | ✅ Good | Supabase handles 100K+ vectors easily |

### Why This Combo Works Well

```
┌─────────────────────────────────────────────────────────────────┐
│                     QUALITY SYNERGY                              │
│                                                                  │
│  RAG provides:                    LoRA provides:                │
│  ─────────────                    ─────────────                 │
│  • Domain knowledge               • Emotional intelligence      │
│  • Factual accuracy               • Response style/tone         │
│  • Up-to-date information         • Personality consistency     │
│  • Source citations               • Trained behavior patterns   │
│                                                                  │
│  Together: Accurate, well-sourced, emotionally intelligent     │
│            responses grounded in specific domain knowledge      │
└─────────────────────────────────────────────────────────────────┘
```

### Potential Quality Concerns

| Concern | Mitigation |
|---------|------------|
| Chunk size too small | Use 512-1024 token chunks with overlap |
| Irrelevant retrieval | Tune similarity threshold, use reranking |
| Context overload | Limit to top 3-5 chunks, summarize if needed |
| Stale embeddings | Implement document versioning and re-embedding |

---

## 7. Environment Compatibility

### Current Stack Compatibility

| Technology | RAG Compatible? | Notes |
|------------|-----------------|-------|
| **Next.js 14** | ✅ Yes | API routes handle RAG logic perfectly |
| **TypeScript** | ✅ Yes | Full LangChain/LlamaIndex support |
| **Python** | ✅ Yes | Not required but available if needed |
| **RunPod (vLLM)** | ✅ Yes | No changes needed—receives augmented prompts |
| **Supabase** | ✅ Yes | Native pgvector, no external vector DB needed |
| **Vercel** | ✅ Yes | Edge functions handle embedding calls |
| **React** | ✅ Yes | Existing component patterns work |

### Serverless Considerations

| Platform | Function Timeout | Memory | Sufficient? |
|----------|------------------|--------|-------------|
| Vercel Hobby | 10s | 1024 MB | ⚠️ Tight for large docs |
| Vercel Pro | 60s | 3008 MB | ✅ Comfortable |
| Supabase Edge | 60s | 256 MB | ✅ Good for retrieval |

**Recommendation**: Ensure Vercel Pro plan for document ingestion routes.

---

## 8. UI Changes Required

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Knowledge Base** | `/knowledge` | Document management dashboard |
| **Upload Documents** | `/knowledge/upload` | Upload and process new documents |
| **Chunk Viewer** | `/knowledge/[docId]` | View/edit document chunks |
| **RAG Settings** | `/settings/rag` | Configure retrieval parameters |

### Modified Pages

| Page | Changes |
|------|---------|
| **Multi-Turn Chat** (`/pipeline/jobs/[id]/chat`) | Add RAG toggle, source citations |
| **A/B Testing** (`/pipeline/jobs/[id]/test`) | RAG-enabled testing option |
| **Job Dashboard** | Link to knowledge base settings |

### New Components

| Component | Purpose |
|-----------|---------|
| `DocumentUploader` | Drag-drop document upload with progress |
| `ChunkPreview` | Display retrieved chunks with metadata |
| `SourceCitation` | Show which documents informed response |
| `RAGToggle` | Enable/disable RAG for inference |
| `RelevanceScore` | Display similarity scores for chunks |
| `KnowledgeBaseList` | Browse/search uploaded documents |

### Navigation Updates

```
Pipeline
├── Jobs
├── Test
├── Chat
└── Knowledge Base  ← NEW
    ├── Documents
    ├── Upload
    └── Settings
```

---

## 9. Will the Current LoRA Adapter Need Changes?

### Answer: ✅ **No modifications required.**

The LoRA adapter operates at the model weight level, completely independent of the prompt content.

### How They Coexist

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFERENCE REQUEST                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  PROMPT (what goes IN)                                     │ │
│  │  ─────────────────────                                     │ │
│  │  System: "You are a helpful advisor..."                    │ │
│  │  Context: [RAG: retrieved documents]  ← NEW (adds info)    │ │
│  │  User: "How do I handle a difficult client?"               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  MODEL + ADAPTER (how it PROCESSES)                        │ │
│  │  ─────────────────────────────────                         │ │
│  │  Base: Mistral-7B-Instruct-v0.2                            │ │
│  │  LoRA: EI Adapter (emotional intelligence weights)         │ │
│  │        ↑ UNCHANGED                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  RESPONSE (what comes OUT)                                 │ │
│  │  ───────────────────────                                   │ │
│  │  Combines: Domain knowledge (RAG) + EI style (LoRA)        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### What Stays the Same

- ✅ LoRA adapter files (no retraining needed)
- ✅ RunPod pod configuration
- ✅ vLLM startup scripts
- ✅ Adapter loading via `--lora-modules`
- ✅ Model selection logic in inference service

### Only Code Changes

The `inference-pods.ts` will need a minor modification to accept and inject RAG context:

```typescript
// Current
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: prompt }
];

// With RAG (additive change)
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: formatWithRAGContext(prompt, ragContext) }
];
```

---

## Summary

| Question | Answer |
|----------|--------|
| **1. Is it possible?** | ✅ Yes, fully compatible |
| **2. Broad strokes?** | Embed docs → Store in pgvector → Retrieve → Augment prompt → Inference |
| **3. Implementation process?** | 4 phases over 4-6 weeks |
| **4. Internal tools needed?** | 3 new services, 1 hook, 3 new tables |
| **5. External tools needed?** | pgvector (free), embedding API ($0.02/1M tokens) |
| **6. High quality?** | ✅ Yes, RAG + LoRA is a proven high-quality architecture |
| **7. Environment compatible?** | ✅ Fully compatible with current stack |
| **8. UI changes?** | 2-4 new pages, modified chat with RAG toggle/citations |
| **9. LoRA adapter changes?** | ❌ None required |

---

## Next Steps (When Ready)

1. **Review this document** and confirm approach aligns with product goals
2. **Define knowledge base scope** - what documents will be ingested?
3. **Choose embedding model** - OpenAI recommended for simplicity
4. **Create detailed implementation plan** - spec out exact database schema and API routes
5. **Begin Phase 1** - pgvector setup and embedding service

---

**Document Owner**: Project Management & Control (PMC)  
**File Location**: `pmc/product/_mapping/v2-mods/001-rag-addition-overview_v1.md`
