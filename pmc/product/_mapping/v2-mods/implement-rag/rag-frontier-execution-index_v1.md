# RAG Frontier — Execution Prompt Index

**Version:** 1.0
**Date:** February 10, 2026
**Module:** RAG Frontier — Phase 1 Implementation
**Scope:** Full ingestion, Expert Q&A, retrieval, quality evaluation, and UI
**Target Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show`

---

## How to Use This Index

Each execution prompt (E01–E10) is a self-contained document designed for a stateless Claude agent. Execute them **in strict sequential order**. Each prompt creates files that later prompts depend on.

**Workflow per prompt:**
1. Open a new Claude chat session
2. Paste the entire prompt content
3. Let the agent execute all tasks
4. Verify the success criteria at the bottom of each prompt
5. Proceed to the next prompt

---

## Prompt Inventory

| # | File | Title | Scope | Prerequisites |
|---|---|---|---|---|
| E01 | `rag-frontier-execution-prompt-E01_v1.md` | Database Foundation | pgvector, 8 tables, RLS, indexes, storage bucket, triggers, 2 RPC functions | None |
| E02 | `rag-frontier-execution-prompt-E02_v1.md` | TypeScript Types & Provider Interfaces | `rag.ts` types, LLM provider + Claude impl, embedding provider + OpenAI impl, RAG config | E01 |
| E03 | `rag-frontier-execution-prompt-E03_v1.md` | Ingestion & Embedding Services | DB mappers, embedding service, ingestion service, `match_rag_embeddings` RPC, `increment_kb_doc_count` RPC, npm deps | E01, E02 |
| E04 | `rag-frontier-execution-prompt-E04_v1.md` | Expert Q&A & Retrieval Services | Expert QA service, retrieval service (HyDE, multi-tier, Self-RAG), services barrel index | E01–E03 |
| E05 | `rag-frontier-execution-prompt-E05_v1.md` | Quality Service & API Routes Part 1 | Quality service (Claude-as-Judge), 5 API routes: knowledge-bases, documents CRUD, upload, process | E01–E04 |
| E06 | `rag-frontier-execution-prompt-E06_v1.md` | API Routes Part 2 | 4 API routes: questions, verify, query, quality | E01–E05 |
| E07 | `rag-frontier-execution-prompt-E07_v1.md` | React Hooks | 5 hook files: useRAGKnowledgeBases, useRAGDocuments, useExpertQA, useRAGChat, useRAGQuality | E05–E06 |
| E08 | `rag-frontier-execution-prompt-E08_v1.md` | UI Components Part 1 | 6 components: KnowledgeBaseDashboard, CreateKnowledgeBaseDialog, DocumentUploader, DocumentList, DocumentStatusBadge, DocumentDetail | E02, E07 |
| E09 | `rag-frontier-execution-prompt-E09_v1.md` | UI Components Part 2 | 5 components: ExpertQAPanel, SourceCitation, ModeSelector, RAGChat, QualityDashboard | E02, E07–E08 |
| E10 | `rag-frontier-execution-prompt-E10_v1.md` | Pages, Navigation & Chunks Removal | 3 pages: /rag, /rag/[id], /rag/[id]/quality. Dashboard nav update. Delete chunks module (4 directories) | E07–E09 |

---

## Dependency Graph

```
E01 (Database)
 └── E02 (Types & Providers)
      └── E03 (Ingestion & Embedding Services)
           └── E04 (Expert QA & Retrieval Services)
                └── E05 (Quality Service & API Routes P1)
                     └── E06 (API Routes P2)
                          └── E07 (React Hooks)
                               ├── E08 (UI Components P1)
                               │    └── E09 (UI Components P2)
                               │         └── E10 (Pages & Navigation)
                               └── E10 (Pages & Navigation)
```

---

## Total Scope Summary

### Created (new files)

| Category | Count | Items |
|---|---|---|
| Database Tables | 8 | rag_knowledge_bases, rag_documents, rag_sections, rag_facts, rag_expert_questions, rag_embeddings, rag_queries, rag_quality_scores |
| RPC Functions | 2 | match_rag_embeddings, increment_kb_doc_count |
| Storage Buckets | 1 | rag-documents |
| Type Files | 1 | src/types/rag.ts |
| Provider Files | 4 | llm-provider.ts, claude-llm-provider.ts, embedding-provider.ts, openai-embedding-provider.ts |
| Config Files | 1 | src/lib/rag/config.ts |
| Service Files | 6 | rag-db-mappers.ts, rag-embedding-service.ts, rag-ingestion-service.ts, rag-expert-qa-service.ts, rag-retrieval-service.ts, rag-quality-service.ts |
| Service Index | 1 | src/lib/rag/services/index.ts |
| API Route Files | 9 | knowledge-bases, documents, documents/[id], documents/[id]/upload, documents/[id]/process, documents/[id]/questions, documents/[id]/verify, query, quality |
| Hook Files | 5 | useRAGKnowledgeBases.ts, useRAGDocuments.ts, useExpertQA.ts, useRAGChat.ts, useRAGQuality.ts |
| Component Files | 11 | KnowledgeBaseDashboard, CreateKnowledgeBaseDialog, DocumentUploader, DocumentList, DocumentStatusBadge, DocumentDetail, ExpertQAPanel, SourceCitation, ModeSelector, RAGChat, QualityDashboard |
| Page Files | 3 | /rag, /rag/[id], /rag/[id]/quality |
| **Total New Files** | **~42** | |

### Modified (existing files)

| File | Change |
|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | Add "RAG Frontier" navigation button |
| `package.json` | Add `pdf-parse`, `mammoth` dependencies |

### Removed (chunks module)

| Directory | Contents |
|---|---|
| `src/app/chunks/` | 4 page files (chunks list, document chunks, dimensions, spreadsheet) |
| `src/app/test-chunks/` | 1 page file |
| `src/app/api/chunks/` | 8 API route directories (chunks CRUD, dimensions, extract, generate-dimensions, regenerate, runs, status, templates) |
| `src/components/chunks/` | 4 component files (ChunkSpreadsheet, DimensionValidationSheet, ErrorBoundary, RunComparison) |

---

## Environment Variables Required

These must be set before running the application:

| Variable | Purpose | Set In |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API for document understanding, expert QA, retrieval, quality eval | `.env.local` |
| `OPENAI_API_KEY` | OpenAI text-embedding-3-small for vector embeddings | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (already exists) | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (already exists) | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (already exists) | `.env.local` |

---

## Human Actions Required

These steps cannot be automated by the execution prompts:

1. **Before E01**: Ensure `pgvector` extension is enabled in Supabase project (Dashboard → Database → Extensions → search "vector" → Enable)
2. **Before E03**: Run `npm install pdf-parse mammoth` (included in E03 prompt)
3. **Before first use**: Verify `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are set in `.env.local`
4. **After E01**: Create the `rag-documents` storage bucket in Supabase Dashboard if the SQL `INSERT INTO storage.buckets` fails (some Supabase configs restrict this)

---

## What Phase 1 Does NOT Include

These items are deferred to Phase 2+:

- **Scheduled re-processing** — No cron jobs or background workers
- **Multi-document knowledge bases** — KB supports multiple documents but cross-doc retrieval is basic
- **Fine-tuned embedding models** — Uses OpenAI text-embedding-3-small only
- **RAG + LoRA combined mode** — The `rag_plus_lora` mode is defined in types but the LoRA integration is a stub
- **Admin dashboards** — No admin-level management views
- **Batch operations** — No bulk upload or bulk processing
- **Advanced chunking strategies** — Uses basic section/paragraph splitting
- **Streaming responses** — Chat responses are non-streaming (full response returned)

---

## Quick Verification After All Prompts

After executing E01–E10, run this complete check:

```bash
# 1. TypeScript build
npx tsc --noEmit

# 2. New file count
find src/lib/rag src/types/rag.ts src/hooks/useRAG* src/hooks/useExpertQA.ts src/components/rag src/app/\(dashboard\)/rag src/app/api/rag -type f 2>/dev/null | wc -l

# 3. Chunks removed
test -d src/app/chunks && echo "FAIL" || echo "OK: chunks removed"
test -d src/app/api/chunks && echo "FAIL" || echo "OK: api/chunks removed"

# 4. Dev server
npm run dev
```

Navigate to `http://localhost:3000/dashboard`, click "RAG Frontier", and verify the page loads.

---

**End of Index**
