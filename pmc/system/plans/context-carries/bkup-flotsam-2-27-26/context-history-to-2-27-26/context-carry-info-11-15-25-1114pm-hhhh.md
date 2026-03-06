# Context Carryover: RAG Document Processing — E09 Specification Complete, Pending Implementation

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. Read and internalize ALL context files listed in this document
2. Read the entire conversation transcript that led to this carryover
3. Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. Read ALL specification and QA documents listed in the "Important Documentation" section below
5. Understand the current RAG module state, including the Inngest migration, all bug fixes, and the new E09 specification
6. **STOP and WAIT for explicit human instructions**

The human will provide specific directions on what to work on next. Do NOT assume or suggest implementations.

---

## CURRENT STATUS: E09 Golden-Set Test Tool Specification COMPLETE — Ready for Implementation

### Session Summary (February 17, 2026)

**Primary Achievement**: Wrote a comprehensive E09 specification for the Golden-Set Test Tool that implements ALL features from E08 PLUS the previously deferred features (Embedding Run Selector and Historical Report Storage).

**Session Activities**:
1. Read and internalized the full codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
2. Read the E08 predecessor spec, SAOL instructions, and context-carry document
3. Analyzed all relevant source files for the golden-set test tool implementation
4. Wrote the comprehensive E09 specification with 12 detailed changes
5. Updated `C:\Users\james\Master\BrightHub\BRun\v4-show\tasks\todo.md` with the E09 implementation task list

### E09 Specification Summary

**Specification File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09.md`

The E09 spec contains 12 changes that implement:

| # | Change | File(s) | Type |
|---|--------|---------|------|
| 1 | Suppress `parseJsonResponse` log noise | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` | Modify |
| 2 | Improve reranking parse robustness | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | Modify |
| 3 | DB migration 004: embedding runs table, test reports table, run_id column, fix text search, update RPC | `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\004-embedding-runs-and-reports.js` | Create |
| 4 | Add `runId` to embedding service (`generateAndStoreEmbedding`, `generateAndStoreBatchEmbeddings`, `searchSimilarEmbeddings`) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts` | Modify |
| 5 | Add `runId` to ingestion service (`processDocument` embedding run tracking) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` | Modify |
| 6 | Add `runId` to retrieval pipeline (`retrieveContext`, `queryRAG`) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | Modify |
| 7 | Enhance test diagnostics (preflight run data, `getEmbeddingRuns`, `runSingleTest` runId) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` | Modify |
| 8 | Create embedding runs API endpoint (GET) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\runs\route.ts` | Create |
| 9 | Create test reports API endpoints (POST/GET) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\reports\route.ts` | Create |
| 10 | Create markdown report API endpoint (POST) | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\report\route.ts` | Create |
| 11 | Update golden-set test API route to accept `runId` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` | Modify |
| 12 | Update test page UI (run selector dropdown, download button, save button, history panel) + Update type definitions in `golden-set-definitions.ts` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx`, `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` | Modify |

### Key Design Decisions in E09

1. **Embedding Run Selector**: Every embedding gets tagged with a `run_id` at ingestion time. A new `rag_embedding_runs` table tracks each ingestion run. The test UI gets a dropdown to select which run to evaluate. `runId` is threaded through `queryRAG` -> `retrieveContext` -> `searchSimilarEmbeddings` -> `match_rag_embeddings_kb` RPC.

2. **Historical Report Storage**: A new `rag_test_reports` table stores complete test reports (JSON blob). API endpoints allow saving and listing reports. The test UI gets a history panel showing past runs with trend data.

3. **Backward Compatibility**: All new parameters are optional with `NULL`/`undefined` defaults so existing callers are unaffected. Legacy embeddings with `run_id = NULL` continue to work.

4. **Embedding run tracking is non-fatal**: If the run record insert fails during ingestion, processing continues without blocking.

5. **`search_rag_text` bug fix**: `ORDER BY rank DESC` fails on UNION ALL in PostgreSQL because `rank` is an alias inside sub-selects; fix is `ORDER BY 5 DESC` (positional reference to 5th column).

6. **Reranking parse fix**: The narrow regex `/\[[\d,\s]+\]/` in `rerankWithClaude` is replaced with a multi-strategy extraction approach.

7. **Migration numbering**: Migration 003 (`003-feedback.js`) already exists, so the new migration is numbered 004.

8. **SAOL for migrations**: Migration script uses `agentExecuteDDL` from SAOL. Application code continues to use `createServerSupabaseAdminClient()`.

### Task List (Implementation Pending)

The implementation tasks are tracked in `C:\Users\james\Master\BrightHub\BRun\v4-show\tasks\todo.md`. All items are currently unchecked (pending). The execution order specified in E09 is:

1. Change 1: Suppress parseJsonResponse log noise
2. Change 2: Improve reranking parse robustness
3. Change 12: Update type definitions in golden-set-definitions.ts
4. Change 3: Create and run migration 004
5. Change 4: Add runId to embedding service
6. Change 5: Add runId to ingestion service
7. Change 6: Add runId to retrieval pipeline
8. Change 7: Enhance test diagnostics
9. Change 8: Create embedding runs API endpoint
10. Change 9: Create test reports API endpoints
11. Change 10: Create markdown report API endpoint
12. Change 11: Update golden-set test API route
13. Change 12: Update test page UI
14. TypeScript compilation verification
15. Migration verification

---

## COMPLETE BUG HISTORY: 16 Bugs (15 Fixed, 1 Active)

### Bug #3v1 & #3v2: JSON Parsing with Code Fences (FIXED)
- **Problem**: Claude returned JSON wrapped in markdown code fences
- **Fix v2**: Robust string-based extraction (find first `{`/`[`, last `}`/`]`)
- **Status**: Fixed, verified working

### Bug #4: Vercel Runtime Timeout (FIXED)
- **Problem**: Claude API call exceeding Vercel's 300s serverless function limit
- **Fix**: Added 120-second `AbortController` timeout (later superseded by Inngest migration)

### Bug #5: Model Performance Issues (FIXED)
- **Problem**: `claude-sonnet-4-5-20250929` too slow for analysis
- **Fix**: Switched default model to `claude-haiku-4-5-20251001`, added `RAG_LLM_MODEL` env var override

### Bug #5b: Vercel Build Failure with Diagnostic Route (FIXED)
- **Problem**: `const` scope issues for variables
- **Fix**: Changed to `let` declarations

### Bug #6: Haiku + 8192 Tokens Insufficient (FIXED)
- **Problem**: Claude hit `max_tokens` at 8,192 output tokens, truncating JSON
- **Fix**: Increased to 16,384 then later to 32,768

### Bug #7: Missing OpenAI API Key for RAG Chat (FIXED)
- **Problem**: RAG chat queries failed with 401
- **Fix**: Added validation in `OpenAIEmbeddingProvider` constructor

### Bug #8: PostgreSQL Function Type Mismatch (FIXED)
- **Problem**: `function jsonb_array_elements(vector) does not exist`
- **Fix**: Created `fix-match-rag-embeddings.js` script

### Bug #9: NULL `knowledge_base_id` Constraint Violation (FIXED)
- **Fix**: Modified `rag-retrieval-service.ts` to fetch `knowledge_base_id` from `rag_documents`

### Bug #10: Response Generation Returning NULL (FIXED)
- **Root Cause**: Schema mismatch — `systemPrompt` asked for `"answer"` but code expected `"responseText"`
- **Fix**: Updated prompt to use `"responseText"`

### Bug #11: LoRA Query Fails - Serverless Workers Stuck (FIXED)
- **Fix**: Enhanced error messages, user switched to pods mode

### Bug #12: Log Clarity Improvement (FIXED)
- **Fix**: Renamed function, updated log prefix to `[LoRA-INFERENCE]`

### Bug #13: RAG Retrieval Missing Specific Information (FIXED)
- **Solution 1**: Enhanced prompt for 50-150 facts with table rows, exceptions, rules
- **Solution 2**: Lowered similarity threshold from 0.5 to 0.4

### Bug #14: Claude API Timeout After Prompt Enhancement (FIXED via Inngest Migration)
- **Solution**: Migrated `processDocument()` to Inngest background jobs

### Bug #14b: JSON Truncation at 16K Tokens (FIXED)
- **Fix**: Increased `llm.maxTokens` from 16,384 to 32,768

### Bug #15: Anthropic SDK Timeout Enforcement (FIXED)
- **Fix**: Set explicit 20-minute timeout in Anthropic client constructor
- **Status**: Verified working (2.7 min processing time)

### Bug #16: Database Check Constraint Rejects New Fact Types (ACTIVE)
- **Status**: BLOCKING FACT STORAGE — 0 facts stored despite Claude extracting them
- **Problem**: `rag_facts_fact_type_check` constraint only allows original types
- **Fix Required**: Update constraint to allow `table_row`, `policy_exception`, `policy_rule`
- **Note**: This fix should be included in Migration 004 from E09 Change 3

---

## RAG Module Architecture

### Overview

The RAG (Retrieval-Augmented Generation) module is called **RAG Frontier** in the UI. Users upload documents, Claude LLM extracts structured knowledge (sections, facts, entities, expert questions), OpenAI generates embeddings, and the system supports querying against the document knowledge base.

### RAG Processing Pipeline (`processDocument()`)

**RUNS IN INNGEST BACKGROUND JOBS** (unlimited execution time)

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts`

| Step | Operation | Estimated Time | External Calls |
|------|-----------|---------------|----------------|
| 1 | Fetch document from DB | <1s | Supabase |
| 2 | Update status to `processing` | <1s | Supabase |
| 3 | `provider.readDocument()` — Full document understanding | **2-10 minutes** | **1 large Claude call** (32K tokens) |
| 4 | Store sections in DB | <1s | Supabase |
| 5 | Generate contextual preamble per section | **10-60s** | **N Claude calls** (1 per section) |
| 6 | Store facts in DB | <1s | Supabase |
| 7 | Store expert questions in DB | <1s | Supabase |
| 8 | Generate embeddings (3 tiers) via OpenAI | **5-20s** | OpenAI |
| 9 | Update final document status | <1s | Supabase |

### Golden-Set Test Tool Architecture

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx`

**Components**:
- **Test definitions**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` — 20 Q&A pairs against canonical Sun Chip Bank document, target >= 85% pass rate
- **Test diagnostics**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` — Preflight checks and `runSingleTest` wrapper
- **Test API**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` — Batch test execution endpoint
- **Test page UI**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx` — Client-side batch orchestration (5 batches of 4 queries)

**Batch execution model**: Client-side orchestrates 5 batches of 4 queries each to avoid Vercel 300s timeout. Each batch calls the golden-set API endpoint.

### Retrieval Pipeline

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts`

Key components:
- **Multi-tier embedding search**: Tier 1 (document), Tier 2 (section), Tier 3 (fact) via pgvector cosine distance
- **Hybrid search**: Vector search (`match_rag_embeddings_kb` RPC) + BM25 text search (`search_rag_text` RPC)
- **Claude Haiku reranking**: Fast semantic reranking of retrieved candidates (`rerankWithClaude`)
- **HyDE (Hypothetical Document Embeddings)**: Generates hypothetical answers to improve query embedding quality
- **Self-RAG evaluation**: Claude evaluates if retrieved context is sufficient

### Inngest Integration

**Key Files**:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` — Inngest client configuration
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` — Main Inngest function (concurrency: 5)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` — Function registry
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\route.ts` — Webhook endpoint

### RAG File Structure

#### LLM Providers (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\`)
- `claude-llm-provider.ts` — Claude LLM integration (32K tokens, 20-min timeout, robust JSON parsing)
- `openai-embedding-provider.ts` — OpenAI embeddings (`text-embedding-3-small`)

#### Services (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\`)
- `rag-ingestion-service.ts` — Core pipeline: `processDocument()` (called by Inngest)
- `rag-retrieval-service.ts` — Query and search functionality
- `rag-embedding-service.ts` — Embedding generation and management

#### Config (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\config.ts`)
- `RAG_CONFIG` — LLM model, max tokens (32,768), temperature, similarity threshold (0.4)

#### Types (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\rag.ts`)
- Full type definitions for RAG module including `RAGFactType` enum, `RAGEmbedding`, `RAGQuery`, etc.

### Database Tables (RAG-specific)

- `rag_knowledge_bases` — Knowledge base containers
- `rag_documents` — Document metadata, status, processing info
- `rag_sections` — Extracted document sections
- `rag_facts` — Extracted atomic facts (includes `table_row`, `policy_exception`, `policy_rule` types)
- `rag_expert_questions` — Expert questions for knowledge refinement
- `rag_embeddings` — Vector embeddings for search (pgvector `vector(1536)`)
- `rag_queries` — Query history

### Migration Scripts

- `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\002-multi-doc-search.js` — Contains the buggy `search_rag_text` function (ORDER BY rank issue)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\003-feedback.js` — Feedback tables (latest existing migration)
- Migration 004 will be created as part of E09 implementation

### Vercel Deployment Configuration

- **Build root**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src` (the `src` directory is the Next.js root)
- **Vercel Plan**: Pro (300s function timeout, Inngest used for longer tasks)
- **Background processing**: Inngest instead of `waitUntil()`

---

## Important Documentation

### Specifications (MUST READ)

1. **E09 Specification (CURRENT — TO BE IMPLEMENTED):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09.md`
   - Contains 12 detailed changes with exact code diffs
   - Implements embedding run selector, historical reports, markdown export, error fixes
   - Full execution order, verification plan, and backward compatibility notes

2. **E08 Specification (PREDECESSOR):**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`
   - Original golden-set test tool spec with 6 changes
   - E09 supersedes E08 entirely — all E08 changes are included in E09

3. **E09 Input Document:**
   `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09-input.md`
   - Original requirements from the human directing the E09 specification

### QA Documents

4. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md`**
   - Documents Bugs #1-#12 with complete root cause analysis

5. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`**
   - Documents Bug #13 (RAG Retrieval Missing Specific Information)

6. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`**
   - Complete specification for Inngest migration (Bug #14 fix)

7. **`C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md`**
   - Implementation summary of Inngest migration

### SAOL Instructions

8. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`**
   - SAOL usage guide — `agentExecuteDDL` with dry-run, transaction, `transport:'pg'`
   - ALL database migrations MUST use SAOL

### Test Document

- **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\Sun-Chip-Bank-Policy-Document-v2.0.md`**
  - Primary test document (canonical document for golden-set tests)
  - Contains complex tables, policy exceptions, DTI rules

---

## Supabase Agent Ops Library (SAOL) Quick Reference

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

## Project Functional Context

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

**PostgreSQL Functions** (RAG):
- `match_rag_embeddings_kb(vector(1536), float, int, uuid)` — Vector similarity search (E09 adds `filter_run_id` parameter)
- `search_rag_text(text, uuid)` — BM25 text search (E09 fixes ORDER BY bug)

---

## Current State & Next Steps

### What Works (Verified February 15-17, 2026)

- RAG Frontier UI: Knowledge base creation, document upload, document listing
- Document text extraction (markdown, text, PDF)
- File storage in Supabase Storage
- Inngest integration: Background job processing (verified 2.7 min processing time)
- Claude LLM call with enhanced prompt (50-150 facts)
- JSON parsing with robust string extraction
- 32K token output capacity (verified: 18,844 tokens generated)
- 20-minute timeout (verified: no timeout errors)
- Section storage, expert question storage, embedding generation
- Golden-set test tool: 20 Q&A pair execution with batch orchestration
- TypeScript build passes
- Vercel deployment successful

### What Needs Implementation (E09 Spec Ready)

- **E09 Changes 1-12**: Full implementation of embedding run selector, historical reports, markdown export, error fixes
- **Bug #16 fix**: Included in E09 Migration 004 (update `rag_facts_fact_type_check` constraint)

### Possible Next Actions (WAIT FOR HUMAN DIRECTION)

**Option 1: Implement E09 Specification**
- Execute all 12 changes in the specified order
- Run migration 004 against production database
- Verify TypeScript compilation
- Test end-to-end functionality

**Option 2: Partial E09 Implementation**
- The human may choose to implement changes incrementally

**Option 3: Something Else Entirely**
- The human may have other priorities

**DO NOT choose any option without explicit human direction.**

---

## Final Reminder

**DO NOT start implementing, fixing, or designing anything without explicit human direction.**

Your job is to:
1. Read and internalize ALL the above context
2. Read the entire transcript of the conversation that led to this carryover
3. Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. Read ALL specification and QA documents listed in the "Important Documentation" section
5. Read the E09 specification thoroughly — it is the next implementation target
6. Understand the Inngest architecture, all 16 bug history, and golden-set test tool
7. **WAIT** for human to provide explicit instructions

**Do not assume. Wait for instructions.**

---

**Last Updated**: February 17, 2026
**Session Focus**: E09 specification writing — comprehensive golden-set test tool spec with embedding run selector, historical reports, markdown export, and error fixes
**Current Mode**: Specification complete, awaiting implementation direction
**Document Version**: context-carry-info-11-15-25-1114pm-hhhh
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Build Status**: TypeScript build successful
**Latest Commit**: `cea11b6` ("prior to expanding the quality tool spec")
**Deployment**: Auto-deployed to Vercel from main branch push
**Inngest Status**: Fully integrated, operational, and verified
**E09 Spec Status**: COMPLETE — 12 changes documented, ready for implementation
**Task List**: `C:\Users\james\Master\BrightHub\BRun\v4-show\tasks\todo.md` — all items pending
**Next Action**: WAIT FOR HUMAN DIRECTION — likely E09 implementation
