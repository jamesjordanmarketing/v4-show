## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire document** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | Renamed | Status | Flow |
|------|---------|--------|------|
| **LoRA Training** | "Fine Tuning" (user-facing) | Complete | Generate Conversations → Auto-Enrich → Aggregate Training Set → Train LoRA Adapter → Auto-Deploy to HF + RunPod → Worker Refresh → A/B Chat |
| **RAG Frontier** | "Fact Training" (user-facing) | Complete | Upload Document → 6-Pass Inngest Ingestion → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

**Current Phase**: Full UX Refactoring — "Work Base" architecture. All backend modules are complete. A comprehensive UX spec (`pmc\product\_mapping\ux\07-internal-ux-decisions_v4.md`) defines 12 design decisions (D1–D12), a complete route rewrite, new `workbases` table, and 5-phase implementation plan. **No UX refactoring code has been written yet.**

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage |
| AI — Ingestion | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) × 4 passes, Haiku 4.5 (`claude-haiku-4-5-20251001`) × 1 pass, Opus 4.6 (`claude-opus-4-6`) × 1 pass |
| AI — Retrieval | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for HyDE, response gen, self-eval, reranking |
| AI — Generation | Claude Sonnet 4.5 for conversations; Claude Sonnet 4 (`claude-sonnet-4-20250514`) for evaluation |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) + Zustand (2 stores) |
| Background Jobs | Inngest (4 functions: autoDeployAdapter, dispatchTrainingJob, processRAGDocument, + failure handler) |
| Deployment | Vercel (frontend + API routes) |
| Inference | RunPod Pods (current, `INFERENCE_MODE=pods`, vLLM v0.14.0) + Serverless (preserved, vLLM v0.15.0) |
| DB Operations | **SAOL (mandatory for agent terminal/script DB ops)** — `supa-agent-ops/` |

### Codebase Structure

```
v4-show//
├── src/
│   ├── app/                          # App Router pages + API routes
│   │   ├── (dashboard)/              # Dashboard pages (pipeline/, rag/, conversations/, etc.)
│   │   └── api/                      # API routes (pipeline/, rag/, conversations/, inngest/, etc.)
│   ├── components/                   # React components
│   │   ├── rag/                      # 13 RAG components (RAGChat, DocumentUploader, ExpertQAPanel, ModeSelector, etc.)
│   │   ├── pipeline/                 # Pipeline components (ABTestingPanel, EndpointStatusBanner, etc.)
│   │   │   └── chat/                 # 12 multi-turn chat components (MultiTurnChat, DualResponsePanel, etc.)
│   │   └── ui/                       # shadcn/UI base components
│   ├── hooks/                        # 20+ custom React hooks (useDualChat, useRAGChat, useRAGDocuments, etc.)
│   ├── lib/
│   │   ├── rag/                      # RAG services, providers (Claude LLM, OpenAI embeddings), config
│   │   ├── services/                 # 45+ service files (inference, multi-turn, pipeline, enrichment, etc.)
│   │   ├── file-processing/          # Text extraction (pdf-parse, mammoth)
│   │   └── supabase/                 # Supabase client
│   ├── inngest/functions/            # autoDeployAdapter, dispatchTrainingJob, processRAGDocument
│   ├── stores/                       # Zustand: conversation-store.ts, pipelineStore.ts
│   └── types/                        # TypeScript types: rag.ts, conversation.ts, pipeline.ts, etc.
├── pmc/                              # Product Management & Control — specs, plans, context carries
├── supa-agent-ops/                   # SAOL library (mandatory for agent DB ops)
├── scripts/                          # Utility scripts (retrigger-adapter-deploy, restore-adapters, etc.)
└── supabase/                         # Supabase config + migrations
```

---

## Completed Modules Summary

| Module | Key Details |
|--------|-------------|
| **Conversation Generation** | Claude-powered, persona-based, emotional arcs, batch generation |
| **5-Stage Enrichment Pipeline** | Quality validation, field-by-field review, orchestrator-based |
| **LoRA Training Pipeline** | RunPod Serverless GPU, QLoRA 4-bit, hyperparameter sliders |
| **Automated Adapter Deployment** | Inngest: Supabase → HuggingFace (LFS SDK) → RunPod LORA_MODULES (GraphQL saveEndpoint). Verified with adapter `e8fa481f` on endpoint `780tauhj7c126b` |
| **Inference & A/B Testing** | Dual-mode (pods/serverless), side-by-side comparison, Claude-as-Judge, user ratings |
| **Multi-Turn Chat (E01–E11)** | 10-turn progressive conversations, dual arc progression, RQE with 6 EI dimensions |
| **RAG Frontier (E01–E10)** | 6-pass ingestion, pgvector search, HyDE, self-RAG eval, citations, 5-metric quality dashboard |
| **Adapter Download System** | tar.gz archives, on-demand generation |

## UX Refactoring Plan (Not Yet Implemented)

**Target route structure:** All pages under `/workbase/[id]/` with sidebar navigation.

| Route | Purpose |
|-------|---------|
| `/home` | Work Base list + QuickStart |
| `/workbase/[id]` | Overview (status cards + next-best-action CTAs) |
| `/workbase/[id]/fine-tuning/conversations` | Library + Training Sets (replaces 4 current pages) |
| `/workbase/[id]/fine-tuning/conversations/[convId]` | View-only detail + feedback comments (D9) |
| `/workbase/[id]/fine-tuning/launch` | Configure + Train + Deploy (replaces 4 current pages) |
| `/workbase/[id]/fine-tuning/chat` | Behavior Chat (LoRA/RAG/Both, A/B testing, 5 states per D4) |
| `/workbase/[id]/fact-training/documents` | Upload + document list (no KB entity per D2) |
| `/workbase/[id]/fact-training/documents/[docId]` | Document detail (5 tabs) |
| `/workbase/[id]/fact-training/chat` | RAG Chat, all documents |
| `/workbase/[id]/fact-training/quality` | Quality dashboard |
| `/workbase/[id]/settings` | Work Base config |

**Key DB changes planned:** New `workbases` table (with `active_adapter_job_id`), new `conversation_comments` table, `workbase_id` FK on `conversations`/`training_files`/`pipeline_training_jobs`, `knowledge_base_id` → `workbase_id` rename on 5 RAG tables, drop `rag_knowledge_bases`.

**New Inngest functions planned:** `autoEnrichConversation` (D8), `refreshInferenceWorkers` (D11).

## Known Issues

- **Serverless truncation bug**: vLLM v0.15.0 ignores `max_tokens` (~203-209 token cutoff). Workaround: pods mode.
- **Evaluation measures wrong data**: Evaluator measures synthetic user prompts (pre-written arcs), not LLM response quality. Needs redesign.
- **RAG + LoRA not integrated**: Only RAG-only mode works. LoRA modes need Work Base architecture (D2/D3/D4).
- **Stale workers after deploy**: Workers don't pick up new LORA_MODULES until restarted. Fix: D11 worker refresh.

---

## SAOL — Mandatory for All Agent Database Operations

Full guide: `supa-agent-ops/QUICK_START.md` and `supa-agent-ops/saol-agent-manual_v2.md`

```javascript
// Schema changes (DDL)
await agentExecuteDDL({
  sql: 'ALTER TABLE ... ;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first, then set false to apply
});
```

**Rules:**
1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY`
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **SAOL is for agent terminal/script ops only** — application code (Inngest, API routes) uses `createServerSupabaseAdminClient()`
5. **No raw SQL** — do not use `supabase-js` or direct PostgreSQL for agent-driven schema changes

---

## Operating Principles

- **Do not re-investigate pre-verified facts** — this document and the task spec contain verified codebase state
- **Do not make assumptions** — if something is ambiguous, ask
- **All code changes must include exact file paths** and line references
- **Human action steps** must be clearly delineated and copy-paste ready
- **The codebase may have evolved** since the specifications were written — confirm file locations exist before editing
- **RunPod GraphQL uses query param auth** (`?api_key=`), NOT Bearer header
- **RunPod `saveEndpoint` is a full PUT** — always fetch ALL original fields first, modify only what's needed

---

<!-- TASK-SPECIFIC CONTENT BEGINS BELOW -->
