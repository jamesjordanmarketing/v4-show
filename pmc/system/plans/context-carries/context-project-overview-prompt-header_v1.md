## 📌INSTRUCTION FOR NEW AGENTS

**⚠️ Before starting any work, you MUST:**

1. ✅ **Read this entire document** to understand project context
2. ✅ **Read the codebase** at `C:\Users\james\Master\BrightHub\brun\v4-show\src\`
3. ✅ **Understand the current phase**: RAG Module Improvements
4. ✅ **Execute the instructions and specifications as shown below**
---

## 🎯 What This Application Does

**Bright Run LoRA Training Data Platform** is a Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models AND provides a document-grounded question answering system (RAG Frontier). The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets, execute GPU training jobs, and query documents using semantic search with citations.

### Core Workflow

```
PATH 1 (LoRA Training):
Generate Conversations → Enrich & Validate → Create Training Files → 
Train LoRA Adapter → Deploy to Inference → Test & Evaluate

PATH 2 (RAG Frontier):
Upload Document → Process with Claude → Expert Verification → 
Semantic Search + Embeddings → Chat with Citations → Quality Evaluation
```

### Key Features

1. **AI Conversation Generation**
   - Claude API-powered generation with structured field templates
   - Persona-based conversation creation
   - Emotional arc integration for training emotional intelligence

2. **5-Stage Enrichment Pipeline**
   - Quality validation and enhancement
   - Field-by-field review and approval
   - Tracking of enrichment history

3. **LoRA Training Pipeline** ✅ Complete
   - Training job management with hyperparameter control
   - GPU training via RunPod Serverless
   - QLoRA 4-bit optimization (Transformers + PEFT + TRL 0.16+)
   - Adapter storage on HuggingFace Hub + Supabase Storage

4. **Inference & Testing System** ✅ Complete
   - Dual-mode architecture: RunPod Pods (current) + Serverless (preserved)
   - A/B testing interface with side-by-side comparison
   - Claude-as-Judge automated evaluation
   - User rating system and test history

5. **Multi-Turn Chat Testing Module** ✅ Complete
   - Progressive conversation tracking (10 turns)
   - Dual arc progression measurement (Control vs Adapted)
   - Per-turn evaluation with emotional state tracking
   - Conversation winner declaration
   - Response Quality Evaluator (RQE) with 6 EI dimensions

6. **RAG Frontier Module** ✅ Complete (E01-E10)
   - Document upload and processing (PDF, DOCX, TXT, MD)
   - Claude-powered document understanding (sections, facts, questions)
   - Expert Q&A workflow for document verification
   - Multi-tier semantic search (documents, sections, facts)
   - HyDE (Hypothetical Document Embeddings) for improved retrieval
   - Self-RAG evaluation for response quality
   - Chat interface with inline citations
   - Quality dashboard with 5 evaluation metrics
   - Knowledge base management and organization

---

## 📋 Project Functional Context

### Core Capabilities

1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment process for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw (minimal) and enriched (complete) JSON formats
6. **LoRA Training Pipeline** (E01-E04 COMPLETE):
   - Database foundation (4 tables, RLS policies, types)
   - API routes (engines, jobs, datasets, hyperparameters)
   - UI components (dashboard, wizard, monitoring, evaluation)
   - Training engine & evaluation system (Claude-as-Judge)
7. **Adapter Download System** (COMPLETE):
   - Download trained adapter files as tar.gz archives
   - On-demand generation (no URL expiry)
   - Intelligent handling of file vs folder storage formats
8. **Manual Adapter Testing** (COMPLETE):
   - Deployed adapter to RunPod text-generation-webui
   - Validated emotional intelligence training effectiveness
   - Documented A/B comparison results
9. **Automated Adapter Testing System** (DUAL-MODE ARCHITECTURE):
   - **Pods Mode** (CURRENT): RunPod Pods with direct vLLM OpenAI API ✅ WORKING
   - **Serverless Mode** (PRESERVED): RunPod Serverless with wrapper format ⏳ (needs fixes)
   - A/B testing interface with side-by-side comparison
   - Claude-as-Judge evaluation with detailed metrics
   - User rating system and test history
   - Real-time status updates with polling
   - Easy mode switching via environment variable

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models)
- **AI**: 
  - Claude API (Anthropic) - `claude-sonnet-4-20250514` (for evaluation)
  - Claude API (Anthropic) - `claude-sonnet-4-5-20250929` (for conversation generation)
- **UI**: Shadcn/UI + Tailwind CSS
- **State Management**: React Query v5 (TanStack Query)
- **Deployment**: Vercel (frontend + API routes)
- **GPU Training**: RunPod Serverless
- **Training Framework**: Transformers + PEFT + TRL 0.16+ + bitsandbytes (QLoRA 4-bit)
- **Inference**: 
  - **Pods** (current): 2x RunPod Pods with vLLM v0.14.0 (control + adapted)
  - **Serverless** (preserved): RunPod Serverless vLLM v0.15.0
- **Adapter Storage**: HuggingFace Hub (public repositories) + Supabase Storage
- **Testing Environment**: RunPod Pods (for manual testing when needed)

### Database Schema Overview

**Core Tables** (Legacy System):
- `conversations` - Conversation metadata and status
- `training_files` - Aggregated training file metadata
- `training_file_conversations` - Junction table linking conversations to training files
- `personas` - Client personality profiles
- `emotional_arcs` - Emotional progression patterns
- `training_topics` - Subject matter configuration
- `prompt_templates` - Generation templates (contains emotional arc definitions)
- `batch_jobs` - Batch generation job tracking
- `batch_items` - Individual items in batch jobs
- `failed_generations` - Failed generation error records

**Pipeline Tables** (Training & Evaluation):
- `pipeline_training_engines` - Training engine configurations
- `pipeline_training_jobs` - Pipeline job tracking
- `pipeline_evaluation_runs` - Evaluation run metadata
- `pipeline_evaluation_results` - Individual scenario evaluation results

**Inference Tables**:
- `pipeline_inference_endpoints` - Endpoint tracking (Control + Adapted)
- `pipeline_test_results` - A/B test history with evaluations and ratings
- `base_models` - Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

**Evaluator Tables**:
- `evaluation_prompts` - Evaluation prompt templates (legacy_v1, arc_aware_v1, multi_turn_arc_aware_v1, response_quality_v1)

**Multi-Turn Tables**:
- `multi_turn_conversations` - Conversation session tracking
- `conversation_turns` - Individual turns with dual responses and evaluations

**RAG Frontier Tables** (17 tables):
- `rag_knowledge_bases` - Knowledge base metadata
- `rag_documents` - Document records with status tracking
- `rag_sections` - Document sections with contextual preambles
- `rag_facts` - Extracted facts with confidence scores
- `rag_embeddings` - Multi-tier vector embeddings (pgvector)
- `rag_expert_questions` - Expert verification questions
- `rag_expert_answers` - Question answers
- `rag_queries` - Chat query history with HyDE and self-eval
- `rag_citations` - Citation tracking
- `rag_quality_scores` - Quality evaluation results (5 metrics)
- `rag_document_metadata` - Extended metadata
- `rag_failed_operations` - Error tracking
- `rag_processing_logs` - Operation logs
- Plus 4 placeholder tables for future features

---

### SAOL Instructions

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

**`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\workfiles\supabase-agent-ops-library-use-instructions.md`**
   - SAOL usage guide — `agentExecuteDDL` with dry-run, transaction, `transport:'pg'`
   - ALL database migrations MUST use SAOL

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

### Key Rules

1. **Use Service Role Key**: Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight**: Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping**: SAOL handles special characters automatically.
4. **Parameter Flexibility**: SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

---

## 🗂️ Key Directories

```
v4-show//
├── src/                              # Next.js application code
│   ├── app/                          # App Router pages and API routes
│   │   ├── (dashboard)/              # Dashboard pages
│   │   │   └── pipeline/             # Pipeline features (jobs, testing, chat)
│   │   └── api/                      # API routes
│   │       └── pipeline/             # Pipeline API endpoints
│   ├── components/                   # React components
│   │   ├── pipeline/                 # Pipeline-specific components
│   │   │   ├── chat/                 # Multi-turn chat components ⭐
│   │   │   └── rag/                  # RAG Frontier components ⭐ NEW
│   │   └── ui/                       # Shadcn/UI components
│   ├── hooks/                        # Custom React hooks
│   │   ├── useDualChat.ts            # Multi-turn chat hook ⭐
│   │   ├── useRAGKnowledgeBases.ts   # RAG KB hook ⭐ NEW
│   │   ├── useRAGDocuments.ts        # RAG documents hook ⭐ NEW
│   │   ├── useExpertQA.ts            # RAG Q&A hook ⭐ NEW
│   │   ├── useRAGChat.ts             # RAG chat hook ⭐ NEW
│   │   └── useRAGQuality.ts          # RAG quality hook ⭐ NEW
│   ├── lib/                          # Utilities and services
│   │   ├── services/                 # Business logic services ⭐
│   │   │   ├── inference-service.ts  # Inference mode selector
│   │   │   ├── inference-pods.ts     # Pods inference implementation
│   │   │   ├── inference-serverless.ts # Serverless inference implementation
│   │   │   └── multi-turn-conversation-service.ts # Multi-turn logic ⭐
│   │   ├── rag/                      # RAG services ⭐ NEW
│   │   │   ├── services/             # RAG service layer
│   │   │   ├── providers/            # LLM & embedding providers
│   │   │   └── config.ts             # RAG configuration
│   │   ├── file-processing/          # Text extraction ⭐ NEW
│   │   └── supabase/                 # Supabase client
│   └── types/                        # TypeScript type definitions
│       ├── conversation.ts           # Multi-turn types ⭐
│       └── rag.ts                    # RAG types ⭐ NEW
├── pmc/                              # Product Management & Control
│   ├── product/                      # Product specifications
│   │   └── _mapping/                 # Feature specifications
│   │       ├── multi/                # Multi-turn chat specs ⭐
│   │       ├── v2-mods/              # RAG Frontier specs ⭐ NEW
│   │       └── pipeline/             # Pipeline specs
│   └── system/                       # System documentation
│       └── plans/                    # Planning documents
│           └── context-carries/      # Context carryover files ⭐
├── supa-agent-ops/                   # SAOL library ⭐
├── scripts/                          # Utility scripts
├── docs/                             # Documentation
└── supabase/                         # Supabase migrations

⭐ = Critical for current multi-turn chat work
```

---

## 🎓 Getting Started for New Agents

### Step-by-Step Orientation

1. **Read This Document Completely**
   - Understand what the platform does
   - Understand current implementation phase
   - Review technology stack

2. **Explore the Codebase**
   - Start with `src/app/(dashboard)/pipeline/` for UI pages
   - Review `src/lib/services/` for business logic
   - Check `src/types/` for TypeScript interfaces
   - Examine `src/components/pipeline/chat/` for multi-turn UI

3. **Understand SAOL**
   - Read `supa-agent-ops/QUICK_START.md`
   - Practice with one-liner commands
   - Always use SAOL for database operations

4. **Follow Instructions**
   - Do NOT make assumptions
   - Ask clarifying questions if needed
   - Execute the below instructions

---

**Remember**: This is a living system with multiple interconnected features. Always read the context, understand the current state, and execute the explicit directions. The codebase may have been updated since the specifications above.
