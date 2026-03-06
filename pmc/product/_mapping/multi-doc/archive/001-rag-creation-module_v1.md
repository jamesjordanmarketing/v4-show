# RAG Creation Module - Complete Pipeline Overview

**Document Version**: v1  
**Created**: February 8, 2026  
**Status**: Overview / Feasibility Analysis

---

## Clarification: Previous Document vs. This Document

| Document | Scope |
|----------|-------|
| **001-rag-addition-overview** | How to add RAG as a layer to inference (assumes you have embeddings ready) |
| **002-rag-creation-module** (this) | Complete end-to-end pipeline: upload → ingest → QA → build → deploy → use |

**This document covers building the entire RAG system from scratch**, including all tooling for document management, human quality evaluation, and seamless integration with your existing LoRA adapter workflow.

---

## Executive Summary

The RAG Creation Module is a comprehensive platform feature that enables:

1. **Document Upload & Linking** - Upload files or connect external data sources
2. **Ingestion Pipeline** - Parse, chunk, and embed documents automatically
3. **Human Quality Evaluation** - Review and approve chunks before they enter the knowledge base
4. **RAG Index Building** - Create searchable vector indices from approved content
5. **LLM Integration** - Apply RAG to your existing Mistral endpoint alongside LoRA
6. **Unified Interface** - Single chat/test interface using RAG + LoRA together

**Key Finding**: ✅ **Fully possible** with your current stack. The platform already has patterns for similar pipelines (conversation generation → enrichment → training).

---

## Questions Answered

### A. Is Document 001 Only About Adding an Existing RAG?

**Yes, partially.** Document 001 assumes you have:
- A populated vector database
- Embeddings already generated
- A retrieval function ready to use

It focuses on the *inference-time* integration—how retrieved context flows into the LLM prompt alongside the LoRA adapter.

**This document (002)** covers everything *before* that point: how you build and populate the RAG system in the first place.

### B. What Does the Complete RAG Creation Module Encompass?

The full pipeline has **7 stages**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RAG CREATION MODULE - FULL PIPELINE                     │
└─────────────────────────────────────────────────────────────────────────────┘

Stage 1: DOCUMENT UPLOAD & LINKING
┌─────────────────────────────────────────────┐
│  • Direct file upload (PDF, TXT, MD, DOCX)  │
│  • URL/web scraping                         │
│  • External integrations (Notion, Confluence│
│    Google Drive, S3)                        │
│  • Manual text entry                        │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 2: INGESTION & PARSING
┌─────────────────────────────────────────────┐
│  • Text extraction from various formats     │
│  • Metadata extraction (title, date, author)│
│  • Content normalization                    │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 3: CHUNKING & EMBEDDING
┌─────────────────────────────────────────────┐
│  • Intelligent text splitting               │
│  • Configurable chunk sizes (256-1024+)     │
│  • Overlap strategy for context continuity  │
│  • Vector embedding generation              │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 4: HUMAN QUALITY EVALUATION
┌─────────────────────────────────────────────┐
│  • Chunk review queue (like enrichment UI)  │
│  • Approve / Reject / Edit individual chunks│
│  • Batch approval tools                     │
│  • Quality scoring and flagging             │
│  • Source verification                      │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 5: RAG INDEX BUILDING
┌─────────────────────────────────────────────┐
│  • Store approved chunks in pgvector        │
│  • Build similarity search indices          │
│  • Configure retrieval parameters           │
│  • Version control for knowledge bases      │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 6: LLM ENDPOINT INTEGRATION
┌─────────────────────────────────────────────┐
│  • Connect RAG to existing vLLM endpoint    │
│  • Configure context injection templates    │
│  • RAG + LoRA concurrent operation          │
│  • No endpoint changes required             │
└──────────────────────┬──────────────────────┘
                       ▼
Stage 7: UNIFIED USAGE INTERFACE
┌─────────────────────────────────────────────┐
│  • Chat with RAG + LoRA combined            │
│  • A/B testing (RAG vs no-RAG)              │
│  • Source citation display                  │
│  • Relevance feedback collection            │
└─────────────────────────────────────────────┘
```

---

## C. Detailed Questions for RAG Creation Module

### 1. Is It Possible?

**✅ Yes, absolutely possible.**

Your current platform already demonstrates the patterns needed:

| Existing Pattern | RAG Equivalent |
|------------------|----------------|
| Conversation generation pipeline | Document ingestion pipeline |
| 5-stage enrichment with human review | Chunk quality evaluation queue |
| Training file creation from approved conversations | RAG index building from approved chunks |
| LoRA training job management | RAG knowledge base management |
| A/B testing (Control vs Adapted) | A/B testing (RAG vs No-RAG vs RAG+LoRA) |
| Multi-turn chat interface | RAG-augmented chat interface |

**The architecture is analogous**—you're replacing "generate AI conversations" with "ingest human documents" and "train LoRA weights" with "build vector index."

---

### 2. What Are the Broad Strokes?

**Core Architecture:**

```
┌────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                              │
│                         (Next.js + Vercel)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Document   │ │   Ingestion  │ │   Review     │ │   Chat +     │  │
│  │   Upload UI  │ │   Dashboard  │ │   Queue UI   │ │   Test UI    │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │
│         │                │                │                │          │
│         ▼                ▼                ▼                ▼          │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    API ROUTES (Next.js)                          │ │
│  │  /api/rag/upload  /api/rag/ingest  /api/rag/review  /api/rag/... │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  Document    │ │  Chunking    │ │  Embedding   │ │  Retrieval   │  │
│  │  Service     │ │  Service     │ │  Service     │ │  Service     │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                     │
│                         (Supabase)                                     │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL + pgvector                                            │ │
│  │  • rag_documents (source files metadata)                          │ │
│  │  • rag_chunks (text chunks + embeddings)                          │ │
│  │  • rag_knowledge_bases (grouped indices)                          │ │
│  │  • rag_review_queue (pending human review)                        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Supabase Storage                                                 │ │
│  │  • rag-documents bucket (original files)                          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         INFERENCE LAYER                                │
│                         (RunPod vLLM)                                  │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Mistral-7B + EI LoRA Adapter                                     │ │
│  │  ← Receives: System prompt + RAG context + User query             │ │
│  │  → Returns: Response informed by documents + styled by LoRA       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**Key Data Flow:**

1. **Upload**: User uploads PDF → stored in Supabase Storage → metadata in `rag_documents`
2. **Parse**: Text extracted → cleaned → normalized
3. **Chunk**: Split into 512-token segments with 50-token overlap
4. **Embed**: Each chunk → embedding API → 1536-dim vector
5. **Queue**: Chunks enter `rag_review_queue` with status `pending`
6. **Review**: Human approves/rejects chunks in review UI
7. **Index**: Approved chunks move to `rag_chunks` with vectors in pgvector
8. **Retrieve**: Query → embed → similarity search → top-K chunks returned
9. **Generate**: Chunks + query → Mistral + LoRA → response with citations

---

### 3. What Is the Implementation Process?

**Recommended Phases:**

#### Phase 1: Foundation (2 weeks)
- Enable pgvector extension in Supabase
- Create database schema (documents, chunks, knowledge_bases, review_queue)
- Create Supabase Storage bucket for `rag-documents`
- Set up embedding service (OpenAI or self-hosted)

#### Phase 2: Ingestion Pipeline (2-3 weeks)
- Document upload API route and UI
- Text extraction (PDF, DOCX, TXT, Markdown)
- Chunking service with configurable parameters
- Batch embedding with progress tracking
- Automatic queue population

#### Phase 3: Human Review System (2 weeks)
- Review queue UI (modeled after enrichment pipeline)
- Chunk viewer with context
- Approve/Reject/Edit workflow
- Batch operations
- Quality scoring (optional)

#### Phase 4: RAG Index & Retrieval (1-2 weeks)
- Knowledge base management
- Similarity search implementation
- Retrieval parameter tuning
- Context formatting service

#### Phase 5: LLM Integration (1 week)
- Modify inference service for RAG context
- Prompt template with citation markers
- RAG toggle in existing chat/test interfaces
- Source display in responses

#### Phase 6: Polish & Testing (1-2 weeks)
- End-to-end testing
- Performance optimization
- A/B testing setup (RAG vs no-RAG)
- Documentation

**Total Estimate: 9-12 weeks** for full pipeline with quality UI

---

### 4. What Internal Building Blocks and Tools Are Needed?

#### New Services to Build

| Service | Purpose | Complexity |
|---------|---------|------------|
| `document-upload-service.ts` | Handle file uploads, validation, storage | Medium |
| `document-parser-service.ts` | Extract text from PDFs, DOCX, etc. | Medium |
| `chunking-service.ts` | Split documents into optimal chunks | Medium |
| `embedding-service.ts` | Generate vector embeddings | Low |
| `rag-review-service.ts` | Manage review queue operations | Medium |
| `knowledge-base-service.ts` | Manage KB versions and settings | Low |
| `retrieval-service.ts` | Similarity search and context assembly | Medium |

#### New Database Tables

| Table | Purpose |
|-------|---------|
| `rag_documents` | Source document metadata |
| `rag_chunks` | Individual text chunks with embeddings |
| `rag_knowledge_bases` | Grouped document collections |
| `rag_review_queue` | Pending human review items |
| `rag_review_history` | Audit trail of review decisions |
| `rag_retrieval_logs` | Query and retrieval analytics |

#### New React Components

| Component | Purpose |
|-----------|---------|
| `DocumentUploader` | Drag-drop upload with progress |
| `IngestionDashboard` | Monitor ingestion jobs |
| `ChunkReviewQueue` | List pending chunks for review |
| `ChunkViewer` | Display chunk with context and editing |
| `KnowledgeBaseManager` | Create/manage knowledge bases |
| `SourceCitation` | Display retrieved sources in chat |
| `RAGSettings` | Configure retrieval parameters |

#### New Hooks

| Hook | Purpose |
|------|---------|
| `useDocumentUpload` | Manage upload state and progress |
| `useChunkReview` | Handle review queue operations |
| `useRAGChat` | Chat with RAG-augmented responses |
| `useKnowledgeBase` | Knowledge base CRUD operations |

#### Reusable Existing Components

| Component | Reuse For |
|-----------|-----------|
| `supabase-client.ts` | All database operations |
| SAOL library | Safe database queries |
| Queue patterns from enrichment | Review queue implementation |
| Test UI components | RAG-enabled testing |
| Chat components | RAG-augmented chat |

---

### 5. External Building Blocks and Tools Needed

#### Required External Services

| Service | Purpose | Options | Cost |
|---------|---------|---------|------|
| **Embedding API** | Convert text → vectors | OpenAI `text-embedding-3-small` | ~$0.02/1M tokens |
| | | OpenAI `text-embedding-3-large` | ~$0.13/1M tokens |
| | | Voyage AI | ~$0.10/1M tokens |
| | | Self-hosted (Sentence Transformers) | Free (compute cost) |

#### Required Libraries (npm)

| Library | Purpose | Notes |
|---------|---------|-------|
| `pdf-parse` or `pdf.js` | PDF text extraction | MIT license, free |
| `mammoth` | DOCX text extraction | MIT license, free |
| `langchain` (optional) | RAG orchestration | If you want framework support |

#### Optional External Services

| Service | Purpose | When to Use |
|---------|---------|-------------|
| **Unstructured.io** | Complex document parsing | OCR, tables, images in PDFs |
| **Pinecone/Weaviate** | Dedicated vector DB | Only if pgvector becomes bottleneck |
| **Notion API** | Direct integration | If pulling from Notion workspaces |
| **Google Drive API** | Direct integration | If pulling from Drive folders |

#### What You DON'T Need

- ❌ New LLM provider (use existing Mistral)
- ❌ New GPU infrastructure (same RunPod)
- ❌ Python backend (all in Next.js API routes)
- ❌ Separate vector database (pgvector in Supabase)
- ❌ Third-party RAG platforms (build in-house)

---

### 6. Will It Be a High-Quality RAG + LoRA System?

**✅ Yes, with proper implementation.**

#### Quality Factors

| Factor | Your Approach | Quality Level |
|--------|---------------|---------------|
| **Embeddings** | OpenAI text-embedding-3 | ⭐⭐⭐⭐⭐ Industry-leading |
| **Vector Store** | Supabase pgvector | ⭐⭐⭐⭐ Production-ready |
| **Retrieval** | Cosine similarity search | ⭐⭐⭐⭐ Standard approach |
| **Human QA** | Review queue + approval | ⭐⭐⭐⭐⭐ Higher than auto-only |
| **LLM** | Mistral-7B + LoRA | ⭐⭐⭐⭐ Good for domain-specific |
| **Integration** | Native prompt injection | ⭐⭐⭐⭐ Clean, no overhead |

#### What Makes It High Quality

1. **Human-in-the-loop** - Review queue ensures garbage doesn't enter the index
2. **Quality embeddings** - OpenAI's models are state-of-the-art
3. **Unified stack** - No integration complexity between disparate systems
4. **LoRA synergy** - Domain knowledge (RAG) + response style (LoRA)

#### Quality Considerations

| Concern | Mitigation |
|---------|------------|
| Chunk quality varies | Human review queue catches bad chunks |
| Retrieval misses | Tune K value, add reranking later if needed |
| Context too long | Summarization or truncation strategies |
| Stale content | Document versioning and re-ingestion |

---

### 7. Is the Current Environment Compatible?

**✅ Fully compatible.**

| Technology | RAG Creation Role | Compatible? |
|------------|-------------------|-------------|
| **Next.js 14** | API routes for all RAG operations | ✅ Perfect fit |
| **TypeScript** | Type-safe services and components | ✅ Ideal |
| **Supabase PostgreSQL** | Document/chunk metadata storage | ✅ Native support |
| **Supabase pgvector** | Vector similarity search | ✅ Built-in extension |
| **Supabase Storage** | Original document file storage | ✅ Already using |
| **Vercel** | Host all API routes | ✅ Handles large uploads |
| **RunPod vLLM** | Inference with RAG context | ✅ No changes |
| **Python** | Not required (can use for parsing if desired) | ✅ Optional |

#### Serverless Considerations

| Operation | Vercel Function Limit | Mitigation |
|-----------|----------------------|------------|
| File upload | 4.5MB body limit (Hobby) | Use Supabase Storage direct upload |
| PDF parsing | 10s timeout (Hobby) | Background job or Pro plan (60s) |
| Batch embedding | Long-running | Queue-based with status polling |
| Large document ingestion | Memory limits | Stream processing, chunked operations |

**Recommendation**: Vercel Pro plan recommended for document ingestion operations.

---

### 8. What UI Changes Are Needed?

#### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Knowledge Base Dashboard** | `/knowledge` | Overview of all knowledge bases |
| **Upload Documents** | `/knowledge/upload` | Upload new documents |
| **Ingestion Status** | `/knowledge/ingestion` | Monitor processing jobs |
| **Review Queue** | `/knowledge/review` | Human chunk review |
| **Chunk Browser** | `/knowledge/[kbId]/chunks` | Browse approved chunks |
| **Document Viewer** | `/knowledge/documents/[docId]` | View source document |
| **KB Settings** | `/knowledge/[kbId]/settings` | Configure retrieval params |

#### Modified Pages

| Page | Changes |
|------|---------|
| `/pipeline/jobs/[id]/chat` | Add KB selector, RAG toggle, source citations |
| `/pipeline/jobs/[id]/test` | RAG-enabled A/B testing option |
| `/settings` | RAG configuration section |

#### Navigation Structure

```
Bright Run
├── Dashboard
├── Conversations
├── Pipeline
│   ├── Jobs
│   ├── Test
│   └── Chat
├── Knowledge Base  ← NEW SECTION
│   ├── Overview
│   ├── Upload Documents
│   ├── Ingestion Queue
│   ├── Review Queue  ← Human QA
│   ├── Browse Chunks
│   └── Settings
└── Settings
    └── RAG Configuration  ← NEW
```

#### New UI Patterns

| Pattern | Usage |
|---------|-------|
| **Dual-pane review** | Source document + chunk side-by-side |
| **Approval workflow** | Approve/Reject/Edit with keyboard shortcuts |
| **Batch selection** | Select multiple chunks for bulk actions |
| **Progress indicators** | Ingestion progress, embedding status |
| **Citation cards** | Expandable source references in chat |
| **KB selector** | Dropdown to choose active knowledge base |

---

### 9. Seamless Integration Across All Operations

**✅ Yes, the system can be fully integrated.**

#### Integration Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SEAMLESS OPERATION FLOW                          │
│                                                                         │
│  Upload     →  Ingest     →  Review     →  Index     →  Chat/Test      │
│  ──────        ──────        ──────        ─────        ─────────       │
│  Automatic     Automatic     Human        Automatic     Unified UI      │
│  queue         processing    approval     after         with RAG +      │
│  population    with status   workflow     approval      LoRA toggle     │
│                polling                                                  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ALL OPERATIONS USE:                                              │ │
│  │  • Same Supabase client                                           │ │
│  │  • Same SAOL patterns                                             │ │
│  │  • Same component library                                         │ │
│  │  • Same authentication                                            │ │
│  │  • Same error handling                                            │ │
│  │  • Same status/progress patterns                                  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Automatic Handoffs

| From | To | Trigger |
|------|----|---------|
| Upload complete | Ingestion queue | File saved to storage |
| Ingestion complete | Review queue | All chunks embedded |
| Chunk approved | Vector index | Approval saved |
| Chat request | Retrieval service | RAG toggle enabled |

#### Unified Data Model

All RAG data links to existing entities:
- Knowledge bases can be linked to pipeline jobs
- Chunks track which documents they came from
- Review history maintains audit trail
- Retrieval logs connect to conversation turns

---

### 10. LLM Portability - Mistral to Other Models

**✅ Yes, the RAG system is LLM-agnostic.**

#### Why It's Portable

The RAG system operates at the **prompt level**, not the model level:

```
┌─────────────────────────────────────────────────────────────────┐
│              RAG OUTPUT (LLM-AGNOSTIC)                          │
│                                                                 │
│  System: You are a helpful advisor...                           │
│  Context: [Retrieved chunks - same for any LLM]                 │
│  User: How do I handle this situation?                          │
│                                                                 │
│  This prompt can go to:                                         │
│  • Mistral-7B (current)     ✅                                  │
│  • Llama-3-70B              ✅                                  │
│  • Qwen-32B                 ✅                                  │
│  • GPT-4                    ✅                                  │
│  • Claude                   ✅                                  │
│  • Any OpenAI-compatible endpoint ✅                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Portability Matrix

| Component | Portable? | Notes |
|-----------|-----------|-------|
| **Vector embeddings** | ✅ Yes | Stored in Supabase, model-independent |
| **Chunk storage** | ✅ Yes | Plain text, no LLM dependency |
| **Retrieval logic** | ✅ Yes | Similarity search is LLM-agnostic |
| **Context formatting** | ✅ Yes | Standard prompt templates |
| **LoRA adapter** | ⚠️ Model-specific | Trained for Mistral, new adapter needed for other base models |

#### Export Scenarios

| Scenario | What Transfers | What Changes |
|----------|----------------|--------------|
| **Mistral → Llama-3** | All RAG (documents, chunks, embeddings) | New LoRA adapter needed |
| **Mistral → GPT-4** | All RAG | API endpoint config, no LoRA |
| **Mistral → Claude** | All RAG | API endpoint config, no LoRA |
| **Self-hosted → Cloud** | All RAG | Inference endpoint URL only |

#### Architecture for Portability

```
┌─────────────────────────────────────────────────────────────────┐
│                    PORTABLE ARCHITECTURE                        │
│                                                                 │
│  RAG Layer (100% Portable)                                      │
│  ────────────────────────                                       │
│  • Documents                                                    │
│  • Chunks                                                       │
│  • Embeddings (if same embedding model)                         │
│  • Knowledge bases                                              │
│  • Review history                                               │
│                                                                 │
│  Inference Layer (Endpoint-Specific)                            │
│  ────────────────────────────────                               │
│  • LLM endpoint URL                                             │
│  • LoRA adapter (model-specific)                                │
│  • Context window limits                                        │
│  • Prompt format adjustments                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Recommendations for Maximum Portability

1. **Use standard embedding models** - OpenAI embeddings work with any LLM
2. **Keep prompts template-based** - Easy to swap for different model formats
3. **Abstract inference service** - Already have this with your mode selector pattern
4. **Store raw chunks** - Don't embed model-specific formatting in storage

---

## Summary

| Question | Answer |
|----------|--------|
| **A. Is 001 only RAG integration?** | Yes, 001 covers inference-time integration assuming embeddings exist |
| **B. What is RAG Creation Module?** | Full pipeline: upload → ingest → QA → build → deploy → use |
| **1. Is it possible?** | ✅ Yes, patterns exist in your current codebase |
| **2. Broad strokes?** | 7-stage pipeline with services at each layer |
| **3. Implementation process?** | 6 phases over 9-12 weeks |
| **4. Internal tools needed?** | 7 new services, 6 new tables, 7+ new components |
| **5. External tools needed?** | Embedding API ($0.02/1M), PDF parser (free) |
| **6. High quality?** | ✅ Yes, especially with human review queue |
| **7. Environment compatible?** | ✅ Fully compatible with current stack |
| **8. UI changes?** | 7 new pages, modified chat/test, new nav section |
| **9. Seamless operations?** | ✅ Yes, unified data model and handoffs |
| **10. LLM portable?** | ✅ RAG fully portable, LoRA is model-specific |

---

## Comparison: Document 001 vs 002

| Aspect | 001: RAG Addition | 002: RAG Creation Module |
|--------|-------------------|--------------------------|
| **Scope** | Integration layer | Full pipeline |
| **Assumes** | Embeddings ready | Nothing—builds from scratch |
| **Timeline** | 4-6 weeks | 9-12 weeks |
| **Human QA** | Not covered | Full review queue |
| **Document ingestion** | Mentioned briefly | Complete pipeline |
| **UI pages** | 2-4 new | 7+ new |
| **Standalone?** | No—needs embeddings | Yes—end-to-end solution |

---

## Next Steps (When Ready)

1. **Review this document** and confirm scope aligns with product goals
2. **Prioritize features** - MVP vs full version
3. **Define document sources** - What types of documents will be ingested?
4. **Choose embedding model** - OpenAI recommended for quality
5. **Create detailed implementation plan** - Database schema, API routes, UI wireframes
6. **Begin Phase 1** - Database foundation and embedding service

---

**Document Owner**: Project Management & Control (PMC)  
**File Location**: `pmc/product/_mapping/v2-mods/002-rag-creation-module_v1.md`
