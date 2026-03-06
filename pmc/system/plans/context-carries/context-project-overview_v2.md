# Project Overview: Bright Run LoRA Training Data Platform

**Document Version**: v2  
**Last Updated**: February 27, 2026  
**Project Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## CRITICAL INSTRUCTION FOR NEW AGENTS

**Before starting any work, you MUST:**

1. **Read this entire document** to understand project context
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`
3. **Understand the current phase**: Full UX Refactoring (Work Base Architecture)
4. **Review the UX specification**: `pmc\product\_mapping\ux\07-internal-ux-decisions_v4.md`
5. **STOP and WAIT for explicit human instructions**

Do NOT assume what to implement. Do NOT start coding without direction. The human will provide specific guidance on what to work on next.

---

## What This Application Does

**Bright Run LoRA Training Data Platform** is a Next.js 14 application that enables non-technical domain experts to:

1. **Generate high-quality AI training conversations** for fine-tuning large language models (LoRA Training path)
2. **Upload and query proprietary documents** using a document-grounded question answering system (RAG Frontier path)
3. **Train custom LoRA adapters** on GPU infrastructure and deploy them for inference
4. **Test and evaluate** trained models via A/B comparison with Claude-as-Judge scoring

### Core Workflows

```
PATH 1 (LoRA Training — "Fine Tuning"):
Generate Conversations → Auto-Enrich → Aggregate into Training Set → 
Train LoRA Adapter (RunPod GPU) → Auto-Deploy to HuggingFace + RunPod → 
Worker Refresh → Test & Evaluate via A/B Chat

PATH 2 (RAG Frontier — "Fact Training"):
Upload Document → 6-Pass Inngest Ingestion → Expert Verification → 
Semantic Search + Embeddings → Chat with Citations → Quality Evaluation
```

---

## Current Phase: Full UX Refactoring (Work Base Architecture)

### What Just Happened

All core backend modules are complete and functional. The automated adapter deployment pipeline was the last major backend piece — completed and verified in the previous session. Adapter `e8fa481f` was successfully deployed end-to-end (Supabase → HuggingFace → RunPod LORA_MODULES).

A comprehensive UX refactoring specification has been written (`07-internal-ux-decisions_v4.md`) that defines a complete route rewrite, new "Work Base" architecture, and a series of 12 design decisions (D1–D12). **None of the UX refactoring code has been written yet.** The spec is approved and ready for implementation.

### What's Next: UX Refactoring Implementation

The UX spec defines a 5-phase implementation plan (estimated 13–18 days):

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Pre-work: Fix modal backgrounds (D10), worker refresh test script (D11), clear test data, plan DB migration | Not started |
| Phase 1 | Database + Work Base Foundation + Worker Refresh (D11, D12) | Not started |
| Phase 2 | Route Structure + Layout (sidebar, home page, workbase layout) | Not started |
| Phase 3 | Fine Tuning Pages (Conversations, Launch Tuning, Behavior Chat, Conversation Detail) | Not started |
| Phase 4 | Fact Training Pages (Documents, Document Detail, Chat, Quality) | Not started |
| Phase 5 | QuickStart + Polish + Testing | Not started |

### Key Design Decisions (from UX Spec v4)

| # | Decision | Summary |
|---|----------|---------|
| D1 | Eliminate Data Shaping page | Aggregation happens ON the Conversations page. 2-step flow: Conversations → Launch Tuning |
| D1b | View-only Conversation Detail page | Chat-style display at `/conversations/[convId]`, no editing. Designed for future edit-readiness |
| D2 | No separate Knowledge Base entity | RAG lives directly in the Work Base. `rag_knowledge_bases` table will be dropped; `knowledge_base_id` renamed to `workbase_id` on 5 RAG tables |
| D3 | Active adapter column on `workbases` | `active_adapter_job_id uuid` — single source of truth, NULL = no adapter |
| D4 | 5 Behavior Chat availability states | Empty, RAG Only, LoRA Only, Full, Deploying — contextual banners, never hidden |
| D5 | Conversation generation stays on Conversations page | Bulk generator absorbed into modal/drawer |
| D6 | A/B testing built into Behavior Chat | Uses existing MultiTurnChat + DualResponsePanel |
| D7 | Complete route rewrite | All pages under `/workbase/[id]/`. Components preserved, only pages/routes change |
| D8 | Auto-enrichment via Inngest | New `autoEnrichConversation` function replaces manual "Enrich All" button |
| D9 | Conversation feedback (comments) | New `conversation_comments` table + API + UI on Conversation Detail page |
| D10 | Modal background fix | `bg-zinc-900` on DialogContent/AlertDialogContent primitives — 2 files, 15 modals inherit |
| D11 | Worker refresh cycle after deployment | New `refreshInferenceWorkers` Inngest function: scale-down → wait → scale-up → verify → mark ready |
| D12 | MAX_LORAS increase to 5 | Applied during worker refresh scale-up step. Research deliverables: RunPod programmatic endpoints, INFERENCE_MODE docs |

### Revised Route Structure (Target)

```
/home                                          — Work Base list + QuickStart
/workbase/[id]                                 — Overview
/workbase/[id]/fine-tuning/conversations       — Conversation Library + Training Sets
/workbase/[id]/fine-tuning/conversations/[convId] — View-only Conversation Detail + Feedback
/workbase/[id]/fine-tuning/launch              — Configure + Train + Deploy (consolidated)
/workbase/[id]/fine-tuning/chat                — Behavior Chat (LoRA/RAG/Both + A/B testing)
/workbase/[id]/fact-training/documents         — Upload + manage documents
/workbase/[id]/fact-training/documents/[docId] — Document Detail (tabs: Detail, Q&A, Chat, Diagnostic, Quality)
/workbase/[id]/fact-training/chat              — RAG Chat with all documents
/workbase/[id]/fact-training/quality           — Quality dashboard
/workbase/[id]/settings                        — Work Base configuration
```

### New Database Tables (Planned)

- **`workbases`** — Central entity: `id`, `user_id`, `name`, `description`, `active_adapter_job_id`, `document_count`, `status`, RLS policies
- **`conversation_comments`** — Feedback on conversations: `id`, `conversation_id`, `user_id`, `content`, timestamps, RLS policies

### New FK Columns (Planned)

- `conversations.workbase_id`
- `training_files.workbase_id`
- `pipeline_training_jobs.workbase_id`
- RAG tables: `knowledge_base_id` → `workbase_id` (rename on 5 tables)

### New Inngest Functions (Planned)

- **`autoEnrichConversation`** — Trigger: `conversation/generation.completed`. Auto-enriches after generation.
- **`refreshInferenceWorkers`** — Trigger: `pipeline/adapter.deployed`. Worker refresh cycle after LORA_MODULES update.

### New Inngest Event Types (Planned)

- `conversation/generation.completed` — Emitted by batch processing after conversation save
- `pipeline/adapter.deployed` — Emitted by `autoDeployAdapter` Step 4b after LORA_MODULES update

---

## Completed Modules

### 1. AI Conversation Generation ✅

- Claude API-powered generation with structured field templates
- Persona-based conversation creation with emotional arc integration
- Batch generation with job tracking
- Templates system with emotional arc definitions

### 2. 5-Stage Enrichment Pipeline ✅

- Quality validation and enhancement
- Field-by-field review and approval
- Enrichment history tracking
- Orchestrated via `enrichment-pipeline-orchestrator.ts`

### 3. LoRA Training Pipeline ✅

- Training job management with hyperparameter control (3 lay-person sliders)
- GPU training via RunPod Serverless
- QLoRA 4-bit optimization (Transformers + PEFT + TRL 0.16+ + bitsandbytes)
- Adapter storage on HuggingFace Hub + Supabase Storage

### 4. Automated Adapter Deployment ✅

- Inngest function `autoDeployAdapter` (~653 lines)
- Downloads adapter from Supabase → pushes to HuggingFace → updates RunPod LORA_MODULES
- Uses `@huggingface/hub` SDK for LFS chunking (avoids Vercel OOM)
- RunPod GraphQL `saveEndpoint` mutation (must pass ALL fields — it's a full PUT)
- Successfully verified with adapter `e8fa481f` on endpoint `780tauhj7c126b`
- Currently deployed adapters: `adapter-6fd5ac79`, `adapter-4e48e3b4`, `adapter-308a26e9`, `adapter-e8fa481f`

### 5. Inference & Testing System ✅

- **Dual-mode architecture**:
  - **Pods Mode** (CURRENT, `INFERENCE_MODE=pods`): RunPod Pods with vLLM v0.14.0, direct OpenAI-compatible API ✅ WORKING
  - **Serverless Mode** (PRESERVED): RunPod Serverless with vLLM v0.15.0 ⏳ (truncation bug)
- A/B testing interface with side-by-side comparison
- Claude-as-Judge automated evaluation with detailed metrics
- User rating system and test history
- Real-time status updates with polling

### 6. Multi-Turn Chat Testing Module ✅ (E01–E11)

- Progressive conversation tracking (10 turns)
- Dual arc progression measurement (Control vs Adapted)
- Per-turn evaluation with emotional state tracking
- Conversation winner declaration
- Response Quality Evaluator (RQE) with 6 EI dimensions
- `DualResponsePanel` for side-by-side comparison
- `DualArcProgressionDisplay` for progression visualization

### 7. RAG Frontier Module ✅ (E01–E10)

- Document upload and processing (PDF, DOCX, TXT, MD) via `file-processing/` extractors
- 6-pass Inngest ingestion pipeline (`processRAGDocument`):
  - Pass 1–4: Claude Sonnet 4.5 (sections, facts, questions, metadata)
  - Pass 5: Claude Haiku 4.5 (quality scoring)
  - Pass 6: Claude Opus 4.6 (deep analysis)
- Expert Q&A workflow for document verification
- Multi-tier semantic search (documents, sections, facts) with pgvector HNSW indexes
- HyDE (Hypothetical Document Embeddings) for improved retrieval
- Self-RAG evaluation for response quality
- Chat interface with inline citations (`SourceCitation` component)
- Quality dashboard with 5 evaluation metrics (Faithfulness, Relevance, Completeness, Citation Accuracy, Composite)
- Knowledge base management and organization
- Mode selector: RAG Only, LoRA Only, RAG + LoRA (only RAG Only currently functional)

### 8. Adapter Download System ✅

- Download trained adapter files as tar.gz archives
- On-demand generation (no URL expiry)
- Intelligent handling of file vs folder storage formats

---

## Known Issues

### Response Truncation Bug (Multi-Turn, Serverless)

- Model responses truncate at ~203–209 tokens on RunPod Serverless with vLLM v0.15.0
- Works fine on Pods with vLLM v0.14.0
- Root cause: New Docker image ignores `max_tokens` parameter
- Workaround: Using Pods mode (`INFERENCE_MODE=pods`)

### Evaluation Algorithm Redesign (Pending)

- Current evaluator measures synthetic user input prompts (pre-written with arc progression)
- Needs redesign to measure LLM response quality instead

### RAG + LoRA Integration (Not Yet Implemented)

- Mode selector shows all 3 modes but only "RAG Only" works
- LoRA modes don't route to inference service
- No model selection UI for choosing which trained adapter
- Will be resolved by Work Base architecture (D2/D3/D4)

### Workers Serve Stale Adapters After Deploy

- RunPod workers don't pick up new LORA_MODULES until restarted
- Will be resolved by `refreshInferenceWorkers` Inngest function (D11)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models) |
| AI — Generation | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| AI — Evaluation | Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| AI — RAG Ingestion | Claude Sonnet 4.5 × 4 passes, Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) × 1 pass, Claude Opus 4.6 (`claude-opus-4-6`) × 1 pass |
| AI — RAG Retrieval | Claude Haiku 4.5 for HyDE, response gen, self-eval, reranking |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State Management | React Query v5 (TanStack Query) + Zustand (2 stores) |
| Background Jobs | Inngest |
| Deployment | Vercel (frontend + API routes) |
| GPU Training | RunPod Serverless |
| Inference | RunPod Pods (current: 2 pods, vLLM v0.14.0) + Serverless (preserved, vLLM v0.15.0) |
| Adapter Storage | HuggingFace Hub (public repos) + Supabase Storage |
| DB Operations (Agent) | SAOL (Supabase Agent Ops Library) — mandatory for all agent DB work |

---

## Database Schema Overview

### Core Tables (Conversation Generation)

- `conversations` — Conversation metadata and status
- `training_files` — Aggregated training file metadata
- `training_file_conversations` — Junction table linking conversations to training files
- `personas` — Client personality profiles
- `emotional_arcs` — Emotional progression patterns
- `training_topics` — Subject matter configuration
- `prompt_templates` — Generation templates (contains emotional arc definitions)
- `batch_jobs` — Batch generation job tracking
- `batch_items` — Individual items in batch jobs
- `failed_generations` — Failed generation error records

### Pipeline Tables (Training & Evaluation)

- `pipeline_training_engines` — Training engine configurations
- `pipeline_training_jobs` — Pipeline job tracking
- `pipeline_evaluation_runs` — Evaluation run metadata
- `pipeline_evaluation_results` — Individual scenario evaluation results

### Inference Tables

- `pipeline_inference_endpoints` — Endpoint tracking (Control + Adapted), status lifecycle: `deploying` → `ready`
- `pipeline_test_results` — A/B test history with evaluations and ratings
- `base_models` — Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

### Evaluator Tables

- `evaluation_prompts` — Evaluation prompt templates (legacy_v1, arc_aware_v1, multi_turn_arc_aware_v1, response_quality_v1, response_quality_multi_turn_v1, response_quality_pairwise_v1)

### Multi-Turn Tables

- `multi_turn_conversations` — Conversation session tracking
- `conversation_turns` — Individual turns with dual responses and evaluations

### RAG Frontier Tables (17 tables)

- `rag_knowledge_bases` — Knowledge base metadata (**will be dropped in D2 refactor**)
- `rag_documents` — Document records with status tracking
- `rag_sections` — Document sections with contextual preambles
- `rag_facts` — Extracted facts with confidence scores
- `rag_embeddings` — Multi-tier vector embeddings (pgvector, 1536 dims)
- `rag_expert_questions` — Expert verification questions
- `rag_expert_answers` — Question answers
- `rag_queries` — Chat query history with HyDE and self-eval
- `rag_citations` — Citation tracking
- `rag_quality_scores` — Quality evaluation results (5 metrics)
- `rag_document_metadata` — Extended metadata
- `rag_failed_operations` — Error tracking
- `rag_processing_logs` — Operation logs
- Plus 4 placeholder tables for future features

---

## Codebase Structure

```
v4-show//
├── src/
│   ├── app/
│   │   ├── (auth)/                           # Auth pages (signin, signup)
│   │   ├── (dashboard)/                      # Dashboard pages
│   │   │   ├── batch-jobs/                   # Batch job monitoring
│   │   │   ├── bulk-generator/               # Bulk conversation generation
│   │   │   ├── conversations/                # Conversation management
│   │   │   ├── costs/                        # Cost tracking
│   │   │   ├── dashboard/                    # Main dashboard
│   │   │   ├── datasets/                     # Dataset management
│   │   │   ├── models/                       # Model registry
│   │   │   ├── pipeline/                     # Pipeline features
│   │   │   │   ├── configure/                # Training configuration
│   │   │   │   └── jobs/                     # Job list + detail
│   │   │   │       └── [jobId]/              # Per-job pages
│   │   │   │           ├── chat/             # Multi-turn A/B chat
│   │   │   │           ├── test/             # Single-turn A/B test
│   │   │   │           └── results/          # Evaluation results
│   │   │   ├── rag/                          # RAG Frontier pages
│   │   │   │   ├── test/                     # RAG test page
│   │   │   │   └── [id]/                     # Document detail
│   │   │   ├── training/                     # Training management
│   │   │   └── training-files/               # Training file management
│   │   └── api/                              # API routes
│   │       ├── pipeline/                     # Pipeline APIs (adapters, engines, evaluate, evaluators, jobs)
│   │       ├── rag/                          # RAG APIs (dashboard, documents, feedback, knowledge-bases, models, quality, query, test)
│   │       ├── conversations/                # Conversation CRUD
│   │       ├── inngest/                      # Inngest webhook handler
│   │       └── ...                           # Other API routes
│   ├── components/
│   │   ├── pipeline/                         # Pipeline components
│   │   │   ├── chat/                         # Multi-turn chat UI (12 components)
│   │   │   │   ├── MultiTurnChat.tsx         # Main orchestrator
│   │   │   │   ├── DualResponsePanel.tsx     # Side-by-side A/B comparison
│   │   │   │   ├── DualArcProgressionDisplay.tsx
│   │   │   │   ├── ChatMain.tsx, ChatInput.tsx, ChatMessageList.tsx, ChatTurn.tsx
│   │   │   │   └── ChatHeader.tsx, ChatSidebar.tsx, ArcProgressionBar.tsx, TokenUsageBar.tsx
│   │   │   ├── ABTestingPanel.tsx            # Single-turn A/B testing
│   │   │   ├── TrainingParameterSlider.tsx   # 3 lay-person sliders
│   │   │   ├── CostEstimateCard.tsx
│   │   │   ├── EndpointStatusBanner.tsx      # Shows deploying/ready status
│   │   │   └── ...                           # Other pipeline components
│   │   ├── rag/                              # RAG Frontier components (13 components)
│   │   │   ├── RAGChat.tsx                   # Chat with citations
│   │   │   ├── DocumentUploader.tsx          # File upload
│   │   │   ├── DocumentList.tsx              # Document table
│   │   │   ├── DocumentDetail.tsx            # Tabbed detail view
│   │   │   ├── ExpertQAPanel.tsx             # Expert Q&A
│   │   │   ├── QualityDashboard.tsx          # 5-metric quality view
│   │   │   ├── ModeSelector.tsx              # RAG/LoRA/Both toggle
│   │   │   ├── CreateKnowledgeBaseDialog.tsx # KB creation (will be removed in D2)
│   │   │   ├── KnowledgeBaseDashboard.tsx    # KB management (will be removed in D2)
│   │   │   └── SourceCitation.tsx, DocumentStatusBadge.tsx, DiagnosticTestPanel.tsx
│   │   └── ui/                               # shadcn/UI base components
│   ├── hooks/                                # Custom React hooks (20+)
│   │   ├── useDualChat.ts                    # Multi-turn chat orchestration
│   │   ├── useRAGChat.ts                     # RAG chat queries
│   │   ├── useRAGDocuments.ts                # Document CRUD
│   │   ├── useRAGKnowledgeBases.ts           # KB management (will be refactored for workbase)
│   │   ├── useExpertQA.ts                    # Expert Q&A workflow
│   │   ├── useRAGQuality.ts                  # Quality metrics
│   │   ├── useAdapterTesting.ts              # A/B test execution
│   │   ├── usePipelineJobs.ts                # Training job management
│   │   ├── useModels.ts                      # Model registry
│   │   ├── useTrainingConfig.ts              # Training hyperparameters
│   │   └── ...                               # Other hooks
│   ├── inngest/
│   │   ├── client.ts                         # Inngest client + event types
│   │   └── functions/
│   │       ├── auto-deploy-adapter.ts        # ~653 lines, full deployment pipeline
│   │       ├── dispatch-training-job.ts      # RunPod training orchestration
│   │       ├── process-rag-document.ts       # 6-pass RAG ingestion
│   │       └── index.ts                      # Function registry
│   ├── lib/
│   │   ├── services/                         # Business logic (45+ service files)
│   │   │   ├── inference-service.ts          # Mode selector (pods/serverless)
│   │   │   ├── inference-pods.ts             # Pods implementation
│   │   │   ├── inference-serverless.ts       # Serverless implementation
│   │   │   ├── multi-turn-conversation-service.ts
│   │   │   ├── pipeline-service.ts           # Training pipeline logic
│   │   │   ├── training-file-service.ts      # Aggregation + JSONL conversion
│   │   │   ├── enrichment-pipeline-orchestrator.ts
│   │   │   └── ...
│   │   ├── rag/                              # RAG service layer
│   │   │   ├── services/
│   │   │   │   ├── rag-ingestion-service.ts  # Document processing
│   │   │   │   ├── rag-retrieval-service.ts  # Search + response generation
│   │   │   │   ├── rag-embedding-service.ts  # Vector embeddings
│   │   │   │   ├── rag-expert-qa-service.ts  # Expert Q&A logic
│   │   │   │   ├── rag-quality-service.ts    # Quality evaluation
│   │   │   │   └── rag-db-mappers.ts         # DB ↔ domain type mapping
│   │   │   ├── providers/
│   │   │   │   ├── claude-llm-provider.ts    # Claude integration
│   │   │   │   ├── openai-embedding-provider.ts # OpenAI embeddings
│   │   │   │   └── llm-provider.ts, embedding-provider.ts # Interfaces
│   │   │   ├── config.ts                     # RAG configuration
│   │   │   └── testing/                      # RAG test utilities
│   │   ├── file-processing/                  # Text extraction (pdf-parse, mammoth)
│   │   ├── supabase/                         # Supabase client setup
│   │   └── ...                               # Other lib modules
│   ├── stores/                               # Zustand stores
│   │   ├── conversation-store.ts
│   │   └── pipelineStore.ts
│   ├── types/                                # TypeScript type definitions
│   │   ├── conversation.ts                   # Multi-turn types
│   │   ├── rag.ts                            # RAG types
│   │   ├── pipeline.ts                       # Training pipeline types
│   │   ├── pipeline-adapter.ts               # Adapter types
│   │   ├── pipeline-evaluation.ts            # Evaluation types
│   │   └── pipeline-metrics.ts, templates.ts
│   └── middleware.ts                         # Auth middleware
├── pmc/                                      # Product Management & Control
│   ├── product/_mapping/                     # Feature specifications
│   │   ├── multi/                            # Multi-turn chat specs
│   │   ├── v2-mods/implement-rag/            # RAG Frontier execution prompts (E01–E10)
│   │   ├── ux/                               # UX decisions & refactoring spec
│   │   │   └── 07-internal-ux-decisions_v4.md # ACTIVE SPEC for next phase
│   │   └── pipeline/                         # Pipeline specs
│   └── system/plans/context-carries/         # Context carryover documents
├── supa-agent-ops/                           # SAOL library
├── scripts/                                  # Utility scripts
│   ├── retrigger-adapter-deploy.js           # Trigger adapter deployment
│   └── restore-adapters.ts                   # LORA_MODULES recovery
├── supabase/                                 # Supabase config + migrations
└── docs/                                     # Historical documentation
```

---

## Inngest Functions (Current)

| Function | File | Trigger | Purpose |
|----------|------|---------|---------|
| `autoDeployAdapter` | `auto-deploy-adapter.ts` | `pipeline/training-job.completed` | Full deployment: Supabase → HuggingFace → RunPod LORA_MODULES → DB records |
| `dispatchTrainingJob` | `dispatch-training-job.ts` | `pipeline/training-job.created` | Orchestrates RunPod GPU training |
| `processRAGDocument` | `process-rag-document.ts` | `rag/document.uploaded` | 6-pass document ingestion pipeline |

**Planned additions** (from UX spec D8, D11):
- `autoEnrichConversation` — Trigger: `conversation/generation.completed`
- `refreshInferenceWorkers` — Trigger: `pipeline/adapter.deployed`

---

## RunPod Infrastructure

### Shared Serverless Endpoint

- **Endpoint ID**: `780tauhj7c126b`
- **Name**: `brightrun-inference-official-vllm`
- **Current LORA_MODULES**: `adapter-6fd5ac79`, `adapter-4e48e3b4`, `adapter-308a26e9`, `adapter-e8fa481f`
- **MAX_LORAS**: Currently `1` (will be increased to `5` per D12)
- **Base Model**: Mistral-7B
- **vLLM Version**: v0.15.0 (serverless), v0.14.0 (pods)

### Pods (Current Inference Mode)

- 2 RunPod Pods: one for base model (control), one with adapter loaded (adapted)
- Direct OpenAI-compatible API
- Set via `INFERENCE_MODE=pods`

---

## Available Evaluators

| Name | Slug | Purpose |
|------|------|---------|
| Response Quality Evaluator (Multi-Turn v1) | `response_quality_multi_turn_v1` | Comprehensive: 6 EI dimensions + arc impact. **Current standard.** |
| Response Quality Pairwise Comparison (v1) | `response_quality_pairwise_v1` | Head-to-head winner determination |
| Arc-Aware Multi-Turn v1 | `multi_turn_arc_aware_v1` | Arc-aware turn-level evaluation |
| Legacy v1 | `legacy_v1` | Original single-turn evaluator |

---

## SAOL — Mandatory for All Agent Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations performed via terminal/scripts.**

**Location:** `supa-agent-ops/`  
**Quick Start:** `supa-agent-ops/QUICK_START.md`  
**Manual:** `supa-agent-ops/saol-agent-manual_v2.md`

### Key Rules

1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY`
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **No raw SQL** — do not use `supabase-js` or direct PostgreSQL for agent-driven schema changes

### Important Distinction

- **SAOL** is for agent-driven terminal/script operations
- **Application code** (Inngest functions, API routes) uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server` — NOT SAOL

### Quick Reference

```bash
# Query
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'TABLE_NAME',
    select: '*',
    orderBy: [{column:'created_at',asc:false}],
    limit: 10
  });
  console.log(JSON.stringify(r.data,null,2));
})();"

# Schema changes (DDL)
await agentExecuteDDL({
  sql: 'ALTER TABLE ... ;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first
});
```

---

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API access |
| `OPENAI_API_KEY` | Embeddings (text-embedding-3-small) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side anon key |
| `INFERENCE_MODE` | `pods` (current) or `serverless` |
| `INFERENCE_API_URL` | RunPod inference base URL |
| `INFERENCE_API_URL_ADAPTED` | RunPod adapted pod URL (pods mode) |
| `GPU_CLUSTER_API_KEY` | RunPod inference auth |
| `RUNPOD_API_KEY` | RunPod general API key |
| `RUNPOD_GRAPHQL_API_KEY` | RunPod GraphQL (used as query param, NOT Bearer) |
| `RUNPOD_INFERENCE_ENDPOINT_ID` | `780tauhj7c126b` |
| `HUGGINGFACE_TOKEN` | HuggingFace Hub API token |
| `INNGEST_EVENT_KEY` | Inngest event sending |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification |

---

## Current Status Summary

| Module | Status |
|--------|--------|
| Infrastructure | ✅ Fully operational |
| Conversation Generation | ✅ Complete |
| Enrichment Pipeline | ✅ Complete |
| Training Pipeline | ✅ Complete |
| Automated Adapter Deployment | ✅ Complete |
| Inference Testing (Pods) | ✅ Working |
| Inference Testing (Serverless) | ⚠️ Truncation bug |
| Multi-Turn Chat (E01–E11) | ✅ Complete |
| RAG Frontier (E01–E10) | ✅ Complete |
| RAG + LoRA Integration | ❌ Not implemented (blocked by Work Base architecture) |
| Worker Refresh After Deploy | ❌ Not implemented (D11) |
| UX Refactoring | ❌ Spec complete, code not started |
| Billing / Stripe | ❌ Not started |
| Onboarding Wizard | ❌ Not started |

**Current Focus**: Implement UX refactoring per `07-internal-ux-decisions_v4.md`  
**Inference Mode**: `INFERENCE_MODE=pods` (working with vLLM v0.14.0)

---

## Warnings for Agents

1. **Do NOT use SAOL in application code** — SAOL is for agent terminal operations. Inngest functions and API routes use `createServerSupabaseAdminClient()`.
2. **Do NOT change RunPod GraphQL auth pattern** — API key goes as query param (`?api_key=`), not Bearer header.
3. **RunPod `saveEndpoint` is a full PUT** — You MUST pass ALL original endpoint fields or they reset to defaults. Always fetch current state first.
4. **Do NOT set `workersMin` to hardcoded values** — Always use the original value from the endpoint.
5. **Do NOT remove the vllm-hot-reload step** from auto-deploy-adapter — It's future-proofing.
6. **Non-deterministic model outputs are expected** — `temperature: 0.7` means evaluation variance between runs is normal.

---

**Last Updated**: February 27, 2026  
**Document Owner**: Product Management & Control (PMC)  
**File Location**: `pmc/system/plans/context-carries/context-project-overview_v2.md`
