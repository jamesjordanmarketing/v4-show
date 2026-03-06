# Context Carry — v4-show/ Agent Handoff

**Document Version**: context-carry-info-11-15-25-1114pm-iiii
**Last Updated**: 2026-02-19
**Purpose**: Full context handoff for incoming agent — read this entire document before doing anything

---

## ⛔ CRITICAL INSTRUCTION — READ FIRST

**DO NOT start implementing, fixing, coding, or changing anything.**

Your job upon receiving this context is to:

1. Read and internalize this entire document
2. Read and internalize the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
3. Read ALL specification documents listed in the "Important Documentation" section
4. Read and internalize the Supabase Agent Ops Library (SAOL) quick reference below
5. **WAIT** for the human to provide explicit instructions before taking any action

Do not assume. Do not suggest next steps unbidden. Do not start anything. Wait.

---

## 🎯 Session Summary — What Was Done This Session

### This Session: Identity Spine Investigation & Specification

This session completed two major specification documents for the **Data & Identity Spine** — a project to fix broken identity enforcement across the entire v4-show/ platform.

#### What Was Found (Investigation)

The investigation (`01-data-and-identity-spine-spec_v1.md`) audited ~148 API routes and ~40 DB tables. It found **48 identity spine gaps** across 4 severity levels:

- **C1–C16 (CRITICAL — 16 gaps)**: Routes using spoofable `x-user-id` header or zero auth + admin client
- **H1–H15 (HIGH — 15 gaps)**: Routes with no auth or inconsistent ownership scoping
- **M1–M13 (MEDIUM — 13 gaps)**: Routes with partial auth or soft scoping
- **L1–L5 (LOW — 5 gaps)**: Minor inconsistencies, missing indexes, etc.

**Root patterns found**:
- ~20 routes read `x-user-id` from request headers (spoofable by any caller)
- ~25 routes have zero authentication at all
- 3 routes combine no auth + admin Supabase client (full DB access, unauthenticated)
- 6 legacy tables have no `user_id` column at all
- 3 tables with `user_id` have no RLS policy enforcing it

#### What Was Written (Specification)

Two specification documents were written:

**Doc 1 — Investigation Spec (complete, 1084 lines)**
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\01-data-and-identity-spine-spec_v1.md`

Content:
- 13 sections covering every gap found
- Full audit of ~148 routes and ~40 tables
- Complete gap registry (C1–C16, H1–H15, M1–M13, L1–L5)
- Fix patterns for each gap type
- DB migration requirements
- RLS policy requirements

**Doc 2 — Detailed Implementation Spec (complete, v3 is canonical — 1163 lines)**
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\02-data-and-identity-spine-detailed-specification_v3.md`

Content:
- 7-phase implementation plan covering ~75+ route files
- Phase 1: Auth infrastructure — add `requireAuthOrCron` helper to `src/lib/supabase-server.ts`
- Phase 2: Fix all CRITICAL routes (C1–C16) — replace `x-user-id` with `requireAuth`, add ownership checks
- Phase 3: Fix all HIGH routes/services (H1–H15)
- Phase 4: Fix all MEDIUM gaps (M1–M13)
- Phase 5: DB schema migration — add `user_id` to 6 legacy tables, backfill from session data
- Phase 6: RLS policy enforcement — add missing RLS to 3 tables
- Phase 7: Cleanup — remove deprecated patterns
- GIVEN-WHEN-THEN acceptance criteria for each change
- All DB operations written as SAOL calls
- Testing checkpoints after each phase
- Warnings section (backfill risks, Cron auth, pipeline job auth)

**Also exists (older, not canonical)**:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\02-data-and-identity-spine-detailed-specification_v1.md`

#### Implementation Status

**NOTHING HAS BEEN IMPLEMENTED.** Both documents are specifications only. No code has been changed. No migrations have been run. All 7 phases are pending.

---

## 🐛 Bug History (from prior sessions — preserved)

### Bug #1 (FIXED): Training File Download Broken
- Empty zip files with incorrect content-type
- Fix: Corrected storage bucket paths and MIME types

### Bug #2 (FIXED): Batch Job Status Not Updating
- `batch_jobs` status stuck in `processing`
- Fix: Added status update logic after generation completion

### Bug #3 (FIXED): TypeScript Build Failure
- Multiple type errors blocking Vercel deployment
- Fix: Type annotations corrected across pipeline components

### Bug #4 (FIXED): Vercel Runtime Timeout
- Claude API call exceeding Vercel's 300s serverless limit
- Fix: Added 120s `AbortController` timeout (later superseded by Inngest migration)

### Bug #5 (FIXED): Model Performance Issues
- `claude-sonnet-4-5-20250929` too slow for analysis
- Fix: Switched default model to `claude-haiku-4-5-20251001`, added `RAG_LLM_MODEL` env var override

### Bug #5b (FIXED): Vercel Build Failure with Diagnostic Route
- `const` scope issues for variables
- Fix: Changed to `let` declarations

### Bug #6 (FIXED): Haiku + 8192 Tokens Insufficient
- Claude hit `max_tokens` at 8,192 output tokens, truncating JSON
- Fix: Increased to 16,384 then later to 32,768

### Bug #7 (FIXED): Missing OpenAI API Key for RAG Chat
- RAG chat queries failed with 401
- Fix: Added validation in `OpenAIEmbeddingProvider` constructor

### Bug #8 (FIXED): PostgreSQL Function Type Mismatch
- `function jsonb_array_elements(vector) does not exist`
- Fix: Created `fix-match-rag-embeddings.js` script

### Bug #9 (FIXED): NULL `knowledge_base_id` Constraint Violation
- Fix: Modified `rag-retrieval-service.ts` to fetch `knowledge_base_id` from `rag_documents`

### Bug #10 (FIXED): Response Generation Returning NULL
- Root cause: Schema mismatch — `systemPrompt` asked for `"answer"` but code expected `"responseText"`
- Fix: Updated prompt to use `"responseText"`

### Bug #11 (FIXED): LoRA Query Fails — Serverless Workers Stuck
- Fix: Enhanced error messages, user switched to pods mode

### Bug #12 (FIXED): Log Clarity Improvement
- Fix: Renamed function, updated log prefix to `[LoRA-INFERENCE]`

### Bug #13 (FIXED): RAG Retrieval Missing Specific Information
- Solution 1: Enhanced prompt for 50-150 facts with table rows, exceptions, rules
- Solution 2: Lowered similarity threshold from 0.5 to 0.4

### Bug #14 (FIXED via Inngest Migration): Claude API Timeout After Prompt Enhancement
- Solution: Migrated `processDocument()` to Inngest background jobs

### Bug #14b (FIXED): JSON Truncation at 16K Tokens
- Fix: Increased `llm.maxTokens` from 16,384 to 32,768

### Bug #15 (FIXED): Anthropic SDK Timeout Enforcement
- Fix: Set explicit 20-minute timeout in Anthropic client constructor
- Status: Verified working (2.7 min processing time)

### Bug #16 (ACTIVE): Database Check Constraint Rejects New Fact Types
- **Status: BLOCKING FACT STORAGE** — 0 facts stored despite Claude extracting them
- Problem: `rag_facts_fact_type_check` constraint only allows original types
- Fix required: Update constraint to allow `table_row`, `policy_exception`, `policy_rule`
- Note: This fix is included in E09 Migration 004 (from prior session's E09 spec)

---

## 🏗️ RAG Module Architecture

### Overview

The RAG module is called **RAG Frontier** in the UI. Users upload documents, Claude LLM extracts structured knowledge (sections, facts, entities, expert questions), OpenAI generates embeddings, and the system supports querying against the document knowledge base.

### RAG Processing Pipeline (`processDocument()`)

**RUNS IN INNGEST BACKGROUND JOBS** (unlimited execution time)

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts`

| Step | Operation | Estimated Time | External Calls |
|------|-----------|---------------|----------------|
| 1 | Fetch document from DB | <1s | Supabase |
| 2 | Update status to `processing` | <1s | Supabase |
| 3 | `provider.readDocument()` — Full document understanding | **2–10 minutes** | **1 large Claude call** (32K tokens) |
| 4 | Store sections in DB | <1s | Supabase |
| 5 | Generate contextual preamble per section | **10–60s** | **N Claude calls** (1 per section) |
| 6 | Store facts in DB | <1s | Supabase |
| 7 | Store expert questions in DB | <1s | Supabase |
| 8 | Generate embeddings (3 tiers) via OpenAI | **5–20s** | OpenAI |
| 9 | Update final document status | <1s | Supabase |

### Golden-Set Test Tool Architecture

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx`

- **Test definitions**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` — 20 Q&A pairs against canonical Sun Chip Bank document, target >= 85% pass rate
- **Test diagnostics**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` — Preflight checks and `runSingleTest` wrapper
- **Test API**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` — Batch test execution endpoint
- **Test page UI**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx`

Batch execution: Client-side orchestrates 5 batches of 4 queries each to avoid Vercel 300s timeout.

### Retrieval Pipeline

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts`

- Multi-tier embedding search: Tier 1 (document), Tier 2 (section), Tier 3 (fact) via pgvector cosine distance
- Hybrid search: Vector search (`match_rag_embeddings_kb` RPC) + BM25 text search (`search_rag_text` RPC)
- Claude Haiku reranking
- HyDE (Hypothetical Document Embeddings)
- Self-RAG evaluation

### Inngest Integration

- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` — Main function (concurrency: 5)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\route.ts`

### RAG File Structure

**LLM Providers** (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\`):
- `claude-llm-provider.ts` — Claude LLM integration (32K tokens, 20-min timeout, robust JSON parsing)
- `openai-embedding-provider.ts` — OpenAI embeddings (`text-embedding-3-small`)

**Services** (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\`):
- `rag-ingestion-service.ts` — Core pipeline: `processDocument()` (called by Inngest)
- `rag-retrieval-service.ts` — Query and search functionality
- `rag-embedding-service.ts` — Embedding generation and management

**Config**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\config.ts`
- `RAG_CONFIG` — LLM model, max tokens (32,768), temperature, similarity threshold (0.4)

**Types**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\rag.ts`

### RAG Database Tables

- `rag_knowledge_bases` — Knowledge base containers
- `rag_documents` — Document metadata, status, processing info
- `rag_sections` — Extracted document sections
- `rag_facts` — Extracted atomic facts (includes `table_row`, `policy_exception`, `policy_rule` types)
- `rag_expert_questions` — Expert questions for knowledge refinement
- `rag_embeddings` — Vector embeddings for search (pgvector `vector(1536)`)
- `rag_queries` — Query history

**To be created by E09 Migration 004**:
- `rag_embedding_runs` — Tracks each ingestion/embedding run with metadata
- `rag_test_reports` — Stores complete golden-set test reports for trend analysis

### PostgreSQL Functions (RAG)

- `match_rag_embeddings_kb(vector(1536), float, int, uuid)` — Vector similarity search
- `search_rag_text(text, uuid)` — BM25 text search

### Migration Scripts

- `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\002-multi-doc-search.js` — Contains buggy `search_rag_text` function (ORDER BY rank issue)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\003-feedback.js` — Feedback tables (latest existing migration)
- Migration 004 will be created as part of E09 implementation

---

## 📚 Important Documentation

### Identity Spine Documents (THIS SESSION)

1. **Identity Spine Investigation Spec (complete):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\01-data-and-identity-spine-spec_v1.md`
   - 1084 lines, 13 sections
   - Full audit of ~148 routes and ~40 tables
   - 48 gaps identified across 4 severity levels (C1–C16, H1–H15, M1–M13, L1–L5)

2. **Identity Spine Detailed Implementation Spec v3 (CANONICAL — complete):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\02-data-and-identity-spine-detailed-specification_v3.md`
   - 1163 lines, 7 phases
   - Covers ~75+ route files
   - All DB operations use SAOL
   - GIVEN-WHEN-THEN acceptance criteria throughout
   - Testing checkpoints after each phase

3. **Identity Spine Detailed Implementation Spec v1 (older, not canonical):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\02-data-and-identity-spine-detailed-specification_v1.md`

4. **Identity Spine Input Prompt:**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\01-data-and-identity-spine-spec_v1-input-spec-prompt.md`

### E09 RAG Spec Documents (prior session — PENDING IMPLEMENTATION)

5. **E09 Specification (current RAG spec — to be implemented after Identity Spine):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09.md`
   - 12 detailed changes with exact code diffs
   - Implements embedding run selector, historical reports, markdown export, error fixes

6. **E09 Input Document:**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09-input.md`

### QA Documents

7. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md`**
   - Documents Bugs #1–#12 with complete root cause analysis

8. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`**
   - Documents Bug #13

9. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`**
   - Complete specification for Inngest migration (Bug #14 fix)

10. **`C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md`**
    - Inngest migration implementation summary

### SAOL Instructions

11. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`**
    - SAOL usage guide — `agentExecuteDDL` with dry-run, transaction, `transport:'pg'`
    - ALL database migrations MUST use SAOL

### Test Document

- **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\Sun-Chip-Bank-Policy-Document-v2.0.md`**
  - Primary test document (canonical for golden-set tests)
  - Contains complex tables, policy exceptions, DTI rules

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### Setup & Usage

**Installation**: Already available in project
```bash
# SAOL is installed and configured
# Located in supa-agent-ops/ directory
```

**CRITICAL: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`
**Quick Start:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\QUICK_START.md` (READ THIS FIRST)
**Troubleshooting:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\TROUBLESHOOTING.md`

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query conversation turns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversation_turns',select:'*',limit:5});console.log('Turns:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query multi-turn conversations
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'multi_turn_conversations',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Conversations:',r.data.length);})();"

# Introspect schema
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('Columns:',r.tables[0]?.columns?.length);})();"
```

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment process for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw (minimal) and enriched (complete) JSON formats
6. **LoRA Training Pipeline** (SECTIONS E01-E04 COMPLETE):
   - **Section E01 (COMPLETE)**: Database foundation (4 tables, RLS policies, types)
   - **Section E02 (COMPLETE)**: API routes (engines, jobs, datasets, hyperparameters)
   - **Section E03 (COMPLETE)**: UI components (dashboard, wizard, monitoring, evaluation)
   - **Section E04 (COMPLETE)**: Training engine & evaluation system (Claude-as-Judge)
7. **Adapter Download System** (COMPLETE):
   - Download trained adapter files as tar.gz archives
   - On-demand generation (no URL expiry)
   - Intelligent handling of file vs folder storage formats
8. **Manual Adapter Testing** (COMPLETE):
   - Deployed adapter to RunPod text-generation-webui
   - Validated emotional intelligence training effectiveness
   - Documented A/B comparison results
9. **Automated Adapter Testing System** (DUAL-MODE ARCHITECTURE):
   - **Pods Mode** (CURRENT): RunPod Pods with direct vLLM OpenAI API WORKING
   - **Serverless Mode** (PRESERVED): RunPod Serverless with wrapper format (truncation bug)
   - **A/B testing interface** with side-by-side comparison
   - **Claude-as-Judge evaluation** with detailed metrics
   - **User rating system** and test history
   - **Real-time status updates** with polling
   - **Easy mode switching** via environment variable
10. **Multi-Turn Chat Testing System** (E01-E10 COMPLETE):
    - **Multi-turn conversation management** (up to 10 turns)
    - **Dual A/B response generation** (Control vs Adapted in parallel)
    - **Dual user input fields** (separate prompts for Control vs Adapted)
    - **Response Quality Evaluator (RQE)** with 6 EI dimensions + PAI
    - **Conversation history** maintained per endpoint (siloed)
    - **Dual progress bars** showing Control vs Adapted progression
    - **Winner declaration** with three-signal logic (PAI > RQS > Pairwise)
    - **First turn evaluation** with RQE (no longer baseline)
    - **Internal response scrolling** for long outputs
    - **Page-wide scrolling** for full conversation history
    - **Token tracking** per conversation
    - Response truncation bug on serverless endpoint (vLLM v0.15.0)
11. **RAG Frontier** (E09 SPEC COMPLETE, IMPLEMENTATION PENDING):
    - **Knowledge base management**: Create/list knowledge bases
    - **Document upload**: Upload .md, .txt, .pdf files to knowledge base
    - **Document processing pipeline**: Claude LLM extracts sections, facts, entities, expert questions
      - Extracts 50-150 facts including each table row, exception, and rule
      - Hierarchical chunking for structured data
    - **Embedding generation**: OpenAI embeddings for 3-tier search
    - **Expert Q&A flow**: Knowledge refinement via expert answers
    - **Retrieval pipeline**: HyDE + self-evaluation + quality scoring
    - **Inngest integration**: Background job processing with unlimited execution time
    - **Golden-Set Regression Test**: 20 Q&A pairs, target >= 85% pass rate
    - **15 BUGS FIXED**: All document processing issues resolved
    - **Bug #16 ACTIVE**: Database constraint violation blocking fact storage
    - **E09 FEATURES (PENDING IMPLEMENTATION)**:
      - Embedding Run Selector (tag with `run_id`, dropdown UI)
      - Historical Report Storage (save to DB, trend analysis)
      - Markdown report generation & download
      - Log noise suppression and error fixes

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector extension for embeddings
- **Storage**: Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models, rag-documents)
- **AI**:
  - Claude API (Anthropic) - `claude-sonnet-4-20250514` (for evaluation)
  - Claude API (Anthropic) - `claude-sonnet-4-5-20250929` (for conversation generation)
  - Claude API (Anthropic) - `claude-haiku-4-5-20251001` (for RAG document understanding, default)
  - OpenAI API - `text-embedding-3-small` (for RAG embeddings)
- **Background Jobs**: Inngest (for RAG document processing with unlimited execution time)
- **UI**: Shadcn/UI + Tailwind CSS
- **State Management**: React Query v5 (TanStack Query)
- **Deployment**: Vercel (frontend + API routes) — **Pro plan** (300s max function timeout, but Inngest used for longer tasks)
- **GPU Training**: RunPod Serverless (endpoint: `ei82ickpenoqlp`)
- **Training Framework**: Transformers + PEFT + TRL 0.16+ + bitsandbytes (QLoRA 4-bit)
- **Inference**:
  - **Pods** (current): 2x RunPod Pods with vLLM v0.14.0 (control + adapted) WORKING
  - **Serverless** (preserved): RunPod Serverless vLLM v0.15.0 (endpoint: `780tauhj7c126b`) TRUNCATION BUG
- **Adapter Storage**: HuggingFace Hub (public repositories) + Supabase Storage
- **Testing Environment**: RunPod Pods (for manual testing when needed)

### Database Schema Overview

**Core Tables** (Existing - Legacy System):
- `conversations` - Conversation metadata and status
- `training_files` - Aggregated training file metadata
- `training_file_conversations` - Junction table linking conversations to training files
- `personas` - Client personality profiles
- `emotional_arcs` - Emotional progression patterns
- `training_topics` - Subject matter configuration
- `prompt_templates` - Generation templates (IMPORTANT: contains emotional arc definitions)
- `batch_jobs` - Batch generation job tracking
- `batch_items` - Individual items in batch jobs
- `failed_generations` - Failed generation error records

**Pipeline Tables** (Sections E01-E04):
- `pipeline_training_engines` - Training engine configurations
- `pipeline_training_jobs` - Pipeline job tracking
- `pipeline_evaluation_runs` - Evaluation run metadata
- `pipeline_evaluation_results` - Individual scenario evaluation results

**Inference Tables** (E01 - CREATED & DEPLOYED):
- `pipeline_inference_endpoints` - Endpoint tracking (Control + Adapted)
- `pipeline_test_results` - A/B test history with evaluations and ratings
- `base_models` - Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

**Evaluator Tables** (CREATED):
- `evaluation_prompts` - Evaluation prompt templates

**Multi-Turn Tables** (E01-E10 CREATED):
- `multi_turn_conversations` - Conversation metadata (12 columns)
- `conversation_turns` - Turn data (24+ columns including dual user messages, dual arc progression, RQE evaluations)

**RAG Tables** (CREATED):
- `rag_knowledge_bases` - Knowledge base containers
- `rag_documents` - Document metadata and processing status
- `rag_sections` - Extracted document sections
- `rag_facts` - Extracted atomic facts (includes `table_row`, `policy_exception`, `policy_rule` types)
- `rag_expert_questions` - Expert questions for knowledge refinement
- `rag_embeddings` - Vector embeddings for search (pgvector `vector(1536)`)
- `rag_queries` - Query history with `knowledge_base_id` constraint

**RAG Tables (TO BE CREATED BY E09 Migration 004)**:
- `rag_embedding_runs` — Tracks each ingestion/embedding run with metadata
- `rag_test_reports` — Stores complete golden-set test reports for trend analysis

---

## 🔧 Key Auth Pattern (Gold Standard)

```typescript
// src/lib/supabase-server.ts — requireAuth() is the gold standard
const { user, supabase } = await requireAuth(request);
// user.id is cryptographically verified — never trust x-user-id headers
```

All scoped queries must use `.eq('user_id', user.id)`. All creates must stamp `user_id: user.id`.

---

## 📍 Current State Summary

| Area | Status |
|------|--------|
| Identity Spine Investigation | ✅ COMPLETE — `01-data-and-identity-spine-spec_v1.md` |
| Identity Spine Detailed Spec | ✅ COMPLETE — `02-data-and-identity-spine-detailed-specification_v3.md` (canonical) |
| Identity Spine Implementation | ❌ NOT STARTED — all 7 phases pending |
| E09 RAG Spec | ✅ COMPLETE — ready for implementation |
| E09 RAG Implementation | ❌ NOT STARTED |
| Bug #16 Fix | ❌ PENDING — part of E09 Migration 004 |
| TypeScript Build | ✅ PASSING |
| Vercel Deployment | ✅ AUTO-DEPLOYED |
| Inngest | ✅ VERIFIED OPERATIONAL |

---

## ⏭️ Possible Next Actions (WAIT FOR HUMAN DIRECTION)

**Option A: Implement Identity Spine (Phase 1 or all phases)**
- Execute the 7 phases from `02-data-and-identity-spine-detailed-specification_v3.md`
- Run DB migrations via SAOL
- Verify TypeScript build after each phase

**Option B: Implement Multi-Document RAG as described here:**
- Execute all 12 changes from the E09 specification
- Run Migration 004 (includes Bug #16 constraint fix)

**Option C: Something else entirely**
- The human may have other priorities

**DO NOT choose any option without explicit human direction.**

---

## Final Reminder

**DO NOT start implementing, fixing, or designing anything without explicit human direction.**

Your job is to:
1. Read and internalize ALL the above context
2. Read the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
3. Read ALL specification documents listed in the "Important Documentation" section
4. Understand the identity spine gaps, the 7-phase implementation plan, and all bug history
5. **WAIT** for human to provide explicit instructions

**Do not assume. Wait for instructions.**

---

**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Build Status**: TypeScript build successful
**Deployment**: Auto-deployed to Vercel from main branch push
**Inngest Status**: Fully integrated, operational, verified
**Identity Spine Spec Status**: COMPLETE — v3 canonical, 7 phases, ~75+ files, ready for implementation
**E09 Spec Status**: COMPLETE — 12 changes documented, ready for implementation
**Task List**: `C:\Users\james\Master\BrightHub\BRun\v4-show\tasks\todo.md`
**Next Action**: WAIT FOR HUMAN DIRECTION
