# Frontier RAG Module: Detailed Build Specification

**Version:** 1.0
**Date:** February 9, 2026
**Source:** 004-rag-frontier-overview_v1.md, 006-rag-frontier-questions_v1.md
**Phase:** Phase 1 Only (Single-Document Proof of Concept)
**Approach:** EXTENSION of existing Bright Run v2-modules codebase

---

## Document Overview

This specification describes the complete implementation of the **Frontier RAG Creation System** for Phase 1. The module enables non-technical domain experts to upload a document, have it deeply understood by a frontier LLM, answer targeted expert questions to refine knowledge quality, and then ask questions via a three-way chat interface (RAG Only / LoRA Only / RAG + LoRA) with automated quality measurement.

**Total Scope:**

- 8 new database tables (with RLS, indexes, triggers)
- 1 database extension to enable (pgvector)
- 2 provider abstraction interfaces (LLM + Embedding)
- 5 new service files
- 10 new API routes (across 6 route groups)
- 5 new pages
- 12 new UI components
- 4 new React hooks
- 1 new Zustand store
- 2 new environment variables
- 4 pages/routes to delete (chunks module replacement)

---

## Integration Summary

**Approach**: EXTENSION (not separate application)

**Infrastructure Decisions:**
- ✅ Use existing Supabase Auth (`requireAuth()` from `@/lib/supabase-server`)
- ✅ Use existing Supabase PostgreSQL (new tables in same database)
- ✅ Use existing Supabase Storage (new bucket: `rag-documents`)
- ✅ Use existing shadcn/UI components (40+ already available)
- ✅ Use existing React Query v5 (TanStack Query)
- ✅ Use existing Anthropic SDK (`@anthropic-ai/sdk`)
- ✅ Use existing error handling patterns (`AppError`, `ErrorCode`)
- ✅ Use existing Zustand for state management
- ✅ Use existing `pdf-parse` and `mammoth` for document extraction
- ✅ Use existing `sonner` for toast notifications
- ✅ Use existing `zod` for request validation
- ✅ Use existing `recharts` for quality dashboard charts

**What We're Adding:**
- 8 new database tables (`rag_*` prefix)
- 1 new storage bucket (`rag-documents`)
- 1 database extension (`pgvector`)
- 5 new services in `src/lib/services/rag/`
- 2 provider abstraction layers in `src/lib/providers/`
- 10 new API routes under `src/app/api/rag/`
- 5 new pages under `src/app/(dashboard)/rag/`
- 12 new components in `src/components/rag/`
- 4 new hooks in `src/hooks/`
- 1 new Zustand store in `src/stores/`
- TypeScript types in `src/types/rag.ts`

**What We're NOT Creating:**
- ❌ New authentication system (reusing existing)
- ❌ New database client (reusing existing Supabase client)
- ❌ New storage client (reusing existing Supabase Storage)
- ❌ New UI library (reusing shadcn/UI)
- ❌ New state management (reusing React Query + Zustand)
- ❌ Knowledge graph (Phase 2+)
- ❌ ColPali visual processing (Phase 3+)
- ❌ Agentic RAG (Phase 3+)
- ❌ Multi-document support UI (architecture supports it, UI is single-doc)
- ❌ Gemini LLM integration (abstraction ready, implementation deferred)

**What We're Removing/Replacing:**
- 🗑️ `/dashboard` chunks landing page
- 🗑️ `/workflow/[id]/stage1` chunks workflow page
- 🗑️ `/upload` chunks upload page
- 🗑️ `/chunks/[id]` chunks detail page
- 🗑️ Associated chunks API routes (if any exist under `/api/chunks/`)

---

## Table of Contents

| Section File | Title | Description |
|---|---|---|
| `008-...-section-1.md` | **Database Foundation** | 8 new tables, pgvector extension, migrations, RLS policies, triggers, indexes |
| `008-...-section-2.md` | **TypeScript Types & Provider Abstraction** | All interfaces/types, LLM Provider, Embedding Provider |
| `008-...-section-3.md` | **Ingestion Pipeline Services** | Document upload, text extraction, LLM reading, knowledge extraction, contextual retrieval, embedding |
| `008-...-section-4.md` | **Expert Q&A System** | Question generation, answer collection, knowledge refinement, verification |
| `008-...-section-5.md` | **Retrieval Pipeline** | HyDE, multi-tier retrieval, Self-RAG evaluation, context assembly, response generation |
| `008-...-section-6.md` | **API Routes** | All 10 route handlers across 6 route groups |
| `008-...-section-7.md` | **React Hooks & State Management** | 4 hooks, 1 Zustand store, React Query patterns |
| `008-...-section-8.md` | **UI Components & Pages** | 12 components, 5 pages, layouts |
| `008-...-section-9.md` | **Quality Measurement System** | Claude-as-Judge evaluation, 5 metrics, quality dashboard |
| `008-...-section-10.md` | **Chunks Module Replacement & System Integration** | Delete old pages, update navigation, redirect configuration, integration checklist |

---

## Human Actions Checklist

All manual steps required, consolidated from all sections. Complete in order.

> **HUMAN ACTION 1** (Section 1)
>
> **What:** Enable pgvector extension in Supabase
> **Where:** Supabase Dashboard → Database → Extensions → Search "vector" → Enable
> **Values:** Extension name: `vector`
> **Why:** Required for storing and querying document embeddings

> **HUMAN ACTION 2** (Section 1)
>
> **What:** Add `DATABASE_URL` to `.env.local` for SAOL pg transport
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
> **Values:** `DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
> **Why:** Required for SAOL schema operations (`agentIntrospectSchema`, `agentExecuteDDL`)

> **HUMAN ACTION 3** (Section 1)
>
> **What:** Run database migration SQL via Supabase SQL Editor
> **Where:** Supabase Dashboard → SQL Editor → New Query
> **Values:** Copy complete migration SQL from Section 1, FR-1.1
> **Why:** Creates all 8 RAG tables with RLS, indexes, and triggers

> **HUMAN ACTION 4** (Section 1)
>
> **What:** Create `rag-documents` storage bucket in Supabase
> **Where:** Supabase Dashboard → Storage → New Bucket
> **Values:** Bucket name: `rag-documents`, Public: No, File size limit: 100MB, Allowed MIME types: `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown`
> **Why:** Stores uploaded document files

> **HUMAN ACTION 5** (Section 2)
>
> **What:** Add `OPENAI_API_KEY` to `.env.local`
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
> **Values:** `OPENAI_API_KEY=sk-...` (obtain from platform.openai.com)
> **Why:** Required for text-embedding-3-small embedding generation

> **HUMAN ACTION 6** (Section 2)
>
> **What:** Add `NEXT_PUBLIC_OPENAI_API_KEY` is NOT needed (embedding calls are server-side only)
> **Where:** N/A
> **Values:** N/A
> **Why:** Clarification: OpenAI key is only used server-side in API routes, never exposed to client

> **HUMAN ACTION 7** (Section 10)
>
> **What:** Update root redirect in `next.config.js` from `/dashboard` to `/rag`
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\src\next.config.js`
> **Values:** Change `destination: '/dashboard'` to `destination: '/rag'`
> **Why:** New RAG module replaces old chunks dashboard as the default landing page

> **HUMAN ACTION 8** (Section 10)
>
> **What:** Install `openai` npm package for embedding API
> **Where:** Terminal in `C:\Users\james\Master\BrightHub\brun\v4-show\src\`
> **Values:** `npm install openai`
> **Why:** Required for OpenAI text-embedding-3-small API calls

---

## Complete Feature List Appendix

### Section 1: Database Foundation
- **FR-1.1**: Database migration (8 tables, pgvector extension, RLS, indexes, triggers)
- **FR-1.2**: Storage bucket configuration (`rag-documents`)

### Section 2: TypeScript Types & Provider Abstraction
- **FR-2.1**: RAG TypeScript types and interfaces
- **FR-2.2**: LLM Provider abstraction (interface + Claude implementation)
- **FR-2.3**: Embedding Provider abstraction (interface + OpenAI implementation)

### Section 3: Ingestion Pipeline Services
- **FR-3.1**: Document upload and text extraction service
- **FR-3.2**: LLM document reading and knowledge extraction service
- **FR-3.3**: Contextual Retrieval preamble generation
- **FR-3.4**: Multi-tier embedding generation and storage

### Section 4: Expert Q&A System
- **FR-4.1**: Expert question generation service
- **FR-4.2**: Answer collection and knowledge refinement service
- **FR-4.3**: Verification sample generation

### Section 5: Retrieval Pipeline
- **FR-5.1**: HyDE (Hypothetical Document Embeddings) service
- **FR-5.2**: Multi-tier retrieval service (document → section → fact)
- **FR-5.3**: Self-RAG / Corrective RAG evaluation
- **FR-5.4**: Context assembly and response generation

### Section 6: API Routes
- **FR-6.1**: `POST /api/rag/documents` — Upload and create document
- **FR-6.2**: `GET /api/rag/documents` — List documents
- **FR-6.3**: `POST /api/rag/documents/[id]/process` — Trigger document processing
- **FR-6.4**: `GET /api/rag/documents/[id]/questions` — Get expert questions
- **FR-6.5**: `POST /api/rag/documents/[id]/questions` — Submit expert answers
- **FR-6.6**: `POST /api/rag/documents/[id]/verify` — Generate verification samples
- **FR-6.7**: `POST /api/rag/query` — Query the knowledge base
- **FR-6.8**: `GET /api/rag/quality` — Get quality metrics
- **FR-6.9**: `GET /api/rag/documents/[id]` — Get document details
- **FR-6.10**: `DELETE /api/rag/documents/[id]` — Delete document

### Section 7: React Hooks & State Management
- **FR-7.1**: `useRAGDocuments` hook (CRUD operations)
- **FR-7.2**: `useExpertQA` hook (Q&A flow management)
- **FR-7.3**: `useRAGChat` hook (chat with retrieval)
- **FR-7.4**: `useRAGQuality` hook (quality metrics)
- **FR-7.5**: RAG Zustand store (UI state management)

### Section 8: UI Components & Pages
- **FR-8.1**: RAG Dashboard page (`/rag`)
- **FR-8.2**: Document Upload page (`/rag/upload`)
- **FR-8.3**: Expert Q&A page (`/rag/documents/[id]/questions`)
- **FR-8.4**: RAG Chat page (`/rag/chat`)
- **FR-8.5**: Quality Dashboard page (`/rag/quality`)
- **FR-8.6**: `DocumentCard` component
- **FR-8.7**: `DocumentUploader` component
- **FR-8.8**: `ExpertQAChat` component
- **FR-8.9**: `VerificationPanel` component
- **FR-8.10**: `RAGChatInterface` component
- **FR-8.11**: `SourceCitation` component
- **FR-8.12**: `ModeSelector` component
- **FR-8.13**: `QualityScoreCard` component
- **FR-8.14**: `ProcessingStatus` component
- **FR-8.15**: `RAGLayout` component (sidebar navigation)

### Section 9: Quality Measurement System
- **FR-9.1**: RAG quality evaluation service (Claude-as-Judge)
- **FR-9.2**: Quality scoring algorithm (5 metrics, composite score)
- **FR-9.3**: Quality logging and aggregation
- **FR-9.4**: Quality comparison across modes (RAG/LoRA/RAG+LoRA)

### Section 10: Chunks Module Replacement & System Integration
- **FR-10.1**: Delete chunks module pages and routes
- **FR-10.2**: Update navigation and routing
- **FR-10.3**: Integration verification checklist
- **FR-10.4**: Environment variable documentation

**Total:** 38 Feature Requirements across 10 sections

---

## Implementation Order

Implement sections in this exact order. Each section lists its prerequisites.

```
Section 1: Database Foundation
    ↓ (tables must exist)
Section 2: TypeScript Types & Provider Abstraction
    ↓ (types and providers needed by all services)
Section 3: Ingestion Pipeline Services
    ↓ (ingestion creates data that Q&A refines)
Section 4: Expert Q&A System
    ↓ (Q&A refines data that retrieval searches)
Section 5: Retrieval Pipeline
    ↓ (retrieval provides data to API routes)
Section 6: API Routes
    ↓ (routes provide data to hooks)
Section 7: React Hooks & State Management
    ↓ (hooks provide data to components)
Section 8: UI Components & Pages
    ↓ (UI needs quality system for display)
Section 9: Quality Measurement System
    ↓ (quality system runs, integration verified)
Section 10: Chunks Module Replacement & System Integration
```

---

## Cross-Section Dependencies Map

```
Section 1 (DB)
  ├─→ Section 2 (Types reference DB columns)
  ├─→ Section 3 (Services write to DB)
  ├─→ Section 4 (Services write to DB)
  ├─→ Section 5 (Services read from DB)
  └─→ Section 6 (Routes read/write DB)

Section 2 (Types + Providers)
  ├─→ Section 3 (Uses LLM + Embedding providers)
  ├─→ Section 4 (Uses LLM provider)
  ├─→ Section 5 (Uses LLM + Embedding providers)
  ├─→ Section 6 (Uses types for request/response)
  ├─→ Section 7 (Uses types for hook returns)
  └─→ Section 9 (Uses LLM provider for evaluation)

Section 3 (Ingestion)
  └─→ Section 4 (Q&A refines ingested data)

Section 4 (Expert Q&A)
  └─→ Section 5 (Retrieval searches refined data)

Section 5 (Retrieval)
  └─→ Section 6 (Query route uses retrieval)

Section 6 (API Routes)
  └─→ Section 7 (Hooks call routes)

Section 7 (Hooks)
  └─→ Section 8 (Components use hooks)

Section 8 (UI)
  └─→ Section 9 (Quality display in UI)

Section 9 (Quality)
  └─→ Section 10 (Integration verification)
```

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **LLM for document understanding** | Claude (`claude-sonnet-4-5-20250929`) via abstraction | Already in stack, 200K context, best comprehension |
| **LLM for evaluation** | Claude Haiku via abstraction | Fast, cheap, adequate for scoring |
| **Embedding model** | OpenAI `text-embedding-3-small` (1536 dims) via abstraction | Industry-leading quality, low cost |
| **Vector storage** | pgvector in existing Supabase PostgreSQL | No new infrastructure, sufficient for Phase 1 |
| **Document parsing** | `pdf-parse` (PDF), `mammoth` (DOCX), direct read (TXT/MD) | Already installed in package.json |
| **File storage** | Supabase Storage (`rag-documents` bucket) | Consistent with existing patterns |
| **Multi-tenancy** | `user_id` column + RLS on all tables | Consistent with existing app |
| **UUID generation** | `gen_random_uuid()` | Consistent with newer tables in DB |
| **Provider pattern** | Interface + implementation, config switch | Matches existing `INFERENCE_MODE` pattern |
| **API route auth** | `requireAuth(request)` | Existing pattern from `supabase-server.ts` |
| **State management** | React Query (server) + Zustand (client) | Existing patterns |
| **Phase 2+ deferred** | LazyGraphRAG, ColPali, Agentic RAG, Gemini | Marked as `// TODO: Phase 2` where relevant |

---

## Discrepancies Found and Resolved

| Discrepancy | Resolution |
|---|---|
| Design doc references `base_models` table | Actual table name is `pipeline_base_models`. Spec uses correct name. |
| Design doc references `pipeline_training_engines` table | Table does not exist. Engine config is inline on `pipeline_training_jobs`. Not relevant to RAG module. |
| pgvector assumed to be available | pgvector extension is NOT installed. Added Human Action #1 to enable it. |
| `DATABASE_URL` assumed to be in env | Missing from `.env.local`. Added Human Action #2. SAOL pg transport operations will fail without it. |
| Design doc proposes `rag_embeddings` as separate table | Spec keeps this design. Embeddings stored in dedicated table with `tier` column (document/section/fact) rather than adding vector columns to multiple tables. Simpler to manage, query, and re-embed. |
| Existing `chunks` table has no vector column | Chunks module is being replaced, not extended. New `rag_sections` table replaces the concept of chunks with LLM-aware sections. |
| Older tables use `extensions.uuid_generate_v4()` | New RAG tables use `gen_random_uuid()` for consistency with newer tables (`multi_turn_conversations`, `conversation_turns`, etc.) |

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-master.md`
**Status:** COMPLETE
**Total Section Files:** 10
**Estimated Implementation Time:** 100-140 hours
**Recommended Team:** 1-2 developers
**Timeline:** 3-5 weeks
