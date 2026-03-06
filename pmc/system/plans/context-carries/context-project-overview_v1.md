# Project Overview: Bright Run LoRA Training Data Platform

**Document Version**: v2  
**Last Updated**: February 11, 2026  
**Project Location**: `C:\Users\james\Master\BrightHub\brun\v4-show\`

---

## 📌 CRITICAL INSTRUCTION FOR NEW AGENTS

**⚠️ Before starting any work, you MUST:**

1. ✅ **Read this entire document** to understand project context
2. ✅ **Read the codebase** at `C:\Users\james\Master\BrightHub\brun\v4-show\src\`
3. ✅ **Understand the current phase**: Multi-Turn Chat Implementation (see below)
4. ✅ **Review key specification files** (listed in Current Phase section)
5. ✅ **STOP and WAIT for explicit human instructions**

Do NOT assume what to implement. Do NOT start coding without direction. The human will provide specific guidance on what to work on next.

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

## 🚀 Current Phase: RAG Frontier Testing & Integration

### Status Overview

Both the **Multi-Turn A/B Testing Chat Module** and **RAG Frontier Module** are complete and deployed. Current focus is on testing RAG Frontier end-to-end and implementing RAG + LoRA integration.

**Multi-Turn Chat Status**: E01-E11 Complete ✅

| Section | Status | Description |
|---------|--------|-------------|
| E01 | ✅ Complete | Database Schema + Types |
| E02 | ✅ Complete | Service Layer |
| E03 | ✅ Complete | API Routes |
| E04 | ✅ Complete | React Hooks + UI Components |
| E05 | ✅ Complete | Page Route + Verification |
| E06 | ✅ Complete | Dual Arc Progress + Scrolling + First Turn Baseline Fix |
| E07 | ✅ Complete | Dual Message Inputs - Foundation |
| E08 | ✅ Complete | Dual User Inputs - Database + Types + Service Layer |
| E09 | ✅ Complete | Dual User Inputs - API + Hook + UI Components |
| E10 | ✅ Complete | Scrolling Fix + Testing + Documentation |
| E11 | ✅ Complete | Response Quality Evaluator (RQE) System |

**RAG Frontier Status**: E01-E10 Complete ✅

| Section | Status | Description |
|---------|--------|-------------|
| E01 | ✅ Complete | Database Schema (17 tables) |
| E02 | ✅ Complete | Database Continuation (RLS policies) |
| E03 | ✅ Complete | Type Definitions |
| E04 | ✅ Complete | Services - Ingestion |
| E05 | ✅ Complete | Services - Retrieval & Quality |
| E06 | ✅ Complete | API Routes (10 endpoints) |
| E07 | ✅ Complete | React Hooks (5 hooks) |
| E08 | ✅ Complete | UI Components Part 1 (6 components) |
| E09 | ✅ Complete | UI Components Part 2 (5 components) |
| E10 | ✅ Complete | Pages, Navigation & Chunks Removal |

### Key Specification Files

**Multi-Turn Chat:**
- `pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-changes_v2.md` - Multi-Turn Arc-Aware Evaluator
- `pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-RQE-build-spec-E11_v1.md` - Response Quality Evaluator
- `pmc\product\_mapping\multi\workfiles\multi-turn-chat-specification_v2.md` - Overall specification
- `pmc\product\_mapping\multi\workfiles\multi-input-and-scroll_v1.md` - Dual input specification
- `pmc\product\_mapping\pipeline\workfiles\response-validation-and-questions-multi_v2.md` - Test prompts with progressive arcs

**RAG Frontier:**
- `pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E01_v2.md` to `E10_v2.md` - Implementation specs
- `pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E11-tutorial_v1.md` - Testing tutorial ⭐
- `pmc\product\_mapping\v2-mods\implement-rag\E06-to-E07-transition-summary.md` - Transition docs
- `pmc\product\_mapping\v2-mods\implement-rag\E08-to-E09-transition-summary.md`
- `pmc\product\_mapping\v2-mods\implement-rag\E09-to-E10-transition-summary.md`

### Execution Prompts

- **Multi-Turn Chat (E01-E11)**: `pmc\product\_mapping\multi\implement-multi\`
- **RAG Frontier (E01-E10)**: `pmc\product\_mapping\v2-mods\implement-rag\`

---

## 📝 Recent Issues & Context

### Multi-Turn Chat Issues

**Response Truncation Bug (Active)**:
- Model responses truncating at ~203-209 tokens on RunPod Serverless with vLLM v0.15.0
- Same code works fine on Pods with vLLM v0.14.0
- Root cause: New Docker image appears to ignore `max_tokens` parameter
- Attempted fixes reverted per user request - bug remains unresolved

**Evaluation Algorithm Redesign (Pending)**:
- Current evaluator measures user input prompts (synthetic test questions)
- Issue: Synthetic prompts were pre-written with arc progression, not influenced by LLM responses
- Measuring them tells us nothing about LLM performance
- Need to redesign evaluator to measure LLM response quality, not synthetic user inputs

**Non-Deterministic Model Responses (Expected Behavior)**:
- Same input produces different outputs due to `temperature: 0.7`
- Evaluation variance between runs is normal
- Truncation bug affects both models equally but at different quality cut-points

### RAG Frontier Issues

**RAG + LoRA Integration Missing (CRITICAL)**:
- Mode selector shows "RAG Only", "LoRA Only", "RAG + LoRA"
- Only "RAG Only" works (uses Claude + retrieval)
- LoRA modes don't route to inference service
- No model selection UI to choose which trained model
- Services are separate and not integrated

**Build Fixes Applied (February 11, 2026)**:
- Fixed `document.sourceType` → `document.fileType` TypeScript error
- Fixed invalid `'verified'` status → only `'ready'` is valid
- Vercel builds now succeed

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

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied)

### Critical Rules

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path**: `supa-agent-ops/`  
**Quick Start**: `supa-agent-ops/QUICK_START.md` (READ THIS FIRST)  
**Troubleshooting**: `supa-agent-ops/TROUBLESHOOTING.md`  
**Manual**: `supa-agent-ops/saol-agent-manual_v2.md`

### Key Rules

1. **Use Service Role Key**: Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight**: Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping**: SAOL handles special characters automatically.
4. **Parameter Flexibility**: SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query pipeline training jobs
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',select:'id,job_name,status,adapter_file_path,final_loss,training_time_seconds,created_at',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Pipeline Jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.job_name,'/',j.status));})();"

# Query inference endpoints
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_inference_endpoints',select:'*',limit:10});console.log('Endpoints:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query test results
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_test_results',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Test Results:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query multi-turn conversations
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'multi_turn_conversations',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Conversations:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query RAG knowledge bases
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_knowledge_bases',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Knowledge Bases:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query RAG documents
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Documents:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query RAG chat history
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Queries:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Introspect schema
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns'});console.log('Schema:',JSON.stringify(r.data,null,2));})();"
```

### Common Operations

```javascript
// Query with filters
const result = await saol.agentQuery({
  table: 'conversations',
  select: 'id,title,status',
  where: [{ column: 'status', operator: 'eq', value: 'completed' }],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});

// Insert record
const result = await saol.agentInsert({
  table: 'conversations',
  data: { title: 'Test', status: 'pending' }
});

// Update record
const result = await saol.agentUpdate({
  table: 'conversations',
  where: [{ column: 'id', operator: 'eq', value: 'abc-123' }],
  data: { status: 'completed' }
});

// Delete record
const result = await saol.agentDelete({
  table: 'conversations',
  where: [{ column: 'id', operator: 'eq', value: 'abc-123' }]
});
```

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

3. **Review Recent Context**
   - Read the most recent context carryover file in `pmc/system/plans/context-carries/`
   - Understand what was last worked on
   - Note any blocking issues

4. **Understand SAOL**
   - Read `supa-agent-ops/QUICK_START.md`
   - Practice with one-liner commands
   - Always use SAOL for database operations

5. **Wait for Instructions**
   - Do NOT start coding
   - Do NOT make assumptions
   - Ask clarifying questions if needed
   - Wait for explicit direction from the human

---

## 🚦 Current Status Summary

**Infrastructure**: ✅ Fully operational  
**Training Pipeline**: ✅ Complete  
**Testing System**: ✅ Complete (Pods mode)  
**Multi-Turn Chat**: ✅ Implementation complete (E01-E11)  
**RAG Frontier**: ✅ Implementation complete (E01-E10) ⭐ NEW  
**Current Focus**: RAG Frontier testing & RAG+LoRA integration  
**Known Issues**: 
- Response truncation on Serverless v0.15.0 (multi-turn)
- Evaluation measures wrong data (multi-turn)
- RAG+LoRA modes not implemented (RAG Frontier)  
**Inference Mode**: `INFERENCE_MODE=pods` (working with vLLM v0.14.0)

---

## 📞 Support Resources

- **SAOL Documentation**: `supa-agent-ops/saol-agent-manual_v2.md`
- **Multi-Turn Spec**: `pmc/product/_mapping/multi/workfiles/multi-turn-chat-specification_v2.md`
- **Context Carries**: `pmc/system/plans/context-carries/` (latest carryover files)
- **Implementation Docs**: Root directory (`*-IMPLEMENTATION-SUMMARY.md`, `*-COMPLETE.md` files)

---

**Remember**: This is a living system with multiple interconnected features. Always read the context, understand the current state, and wait for explicit direction before making changes.

**Last Updated**: February 11, 2026  
**Document Owner**: Project Management & Control (PMC)  
**File Location**: `pmc/system/plans/context-carries/context-project-overview_v1.md`  
**Version**: v2 (Added RAG Frontier Module)
