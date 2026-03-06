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

**Current Phase**: UX Refactoring live — "Work Base" architecture. All backend modules are complete. A comprehensive UX spec (`pmc\product\_mapping\ux\07-internal-ux-decisions_v4.md`) defines 12 design decisions (D1–D12), a complete route rewrite, new `workbases` table, and 5-phase implementation plan. Active bug-fix and feature work ongoing.

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

---

## Current Route Structure

**Implemented route structure:** All pages under `/workbase/[id]/` with sidebar navigation. UX refactoring is live; active bug-fix and feature work ongoing.

| Route | Purpose |
|-------|---------|
| `/home` | Work Base list + QuickStart |
| `/workbase/[id]` | Overview (status cards + next-best-action CTAs) |
| `/workbase/[id]/fine-tuning/conversations` | Conversation library + Training Sets; header buttons: "Batch Jobs" (outline) + "New Conversation" (filled) |
| `/workbase/[id]/fine-tuning/conversations/generate` | Workbase-scoped bulk conversation generator (persona × arc × topic matrix) |
| `/workbase/[id]/fine-tuning/conversations/batch` | Batch jobs list — shows all batch jobs scoped to this workbase |
| `/workbase/[id]/fine-tuning/conversations/batch/[jobId]` | Live batch job watcher — auto-starts processing, progress bar, pause/cancel/enrich actions |
| `/workbase/[id]/fine-tuning/conversations/[convId]` | View-only conversation detail + feedback comments |
| `/workbase/[id]/fine-tuning/launch` | Configure + Train + Deploy (replaces 4 legacy pages) |
| `/workbase/[id]/fine-tuning/chat` | Behavior Chat (LoRA/RAG/Both, A/B testing) |
| `/workbase/[id]/fact-training/documents` | Upload + document list |
| `/workbase/[id]/fact-training/documents/[docId]` | Document detail (5 tabs) |
| `/workbase/[id]/fact-training/chat` | RAG Chat, all documents |
| `/workbase/[id]/fact-training/quality` | Quality dashboard |
| `/workbase/[id]/settings` | Work Base config |


---

## Operating Principles

- **Do not re-investigate pre-verified facts** — this document and the task spec contain verified codebase state
- **Do not make assumptions** — if something is ambiguous, ask
- **All code changes must include exact file paths** and line references
- **Human action steps** must be clearly delineated and copy-paste ready
- **The codebase may have evolved** since the specifications were written — confirm file locations exist before editing
- **RunPod GraphQL uses query param auth** (`?api_key=`), NOT Bearer header
- **RunPod `saveEndpoint` is a full PUT** — always fetch ALL original fields first, modify only what's needed
- **SAOL: ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
SAOL Reference: `C:\Users\james\Master\BrightHub\BRun\v2-modules\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`
