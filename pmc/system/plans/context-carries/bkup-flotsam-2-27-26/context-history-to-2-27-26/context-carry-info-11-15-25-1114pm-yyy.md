# Context Carryover: LoRA Pipeline - SAOL Debugging Required

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\lora-pipeline\src`
3. ✅ Read the E01 execution prompt: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v1.md`
4. ✅ Understand the SAOL issue documented below
5. ✅ **STOP and WAIT for explicit human instructions**

The human will tell you exactly what to do next. Do NOT assume or suggest actions.

---

## 🚨 IMMEDIATE ISSUE: SAOL NOT WORKING

### Problem Statement

The Supabase Agent Ops Library (SAOL) is failing to connect to the database. Without SAOL, we **cannot verify the current database schema** and therefore cannot write correct SQL to complete the database setup.

### Symptoms Observed

#### 1. `agentIntrospectSchema` Fails Immediately

```
[2026-01-29T05:57:38.392Z] INFO: Starting schema introspection {"table":"conversation_turns","transport":"pg"}
[2026-01-29T05:57:38.393Z] ERROR: Schema introspection failed {"error":{"code":"ERR_VALIDATION_REQUIRED","description":"Required field missing"}}
```

- Fails in ~1ms (validation error, not network)
- Error code: `ERR_VALIDATION_REQUIRED`
- Error description: "Required field missing"

#### 2. `agentQuery` Fails with Network Error

```
[2026-01-29T05:58:24.833Z] ERROR: Query failed: TypeError: fetch failed
```

- Fails after ~10 seconds (network timeout)
- Error: `TypeError: fetch failed`

#### 3. Environment Variable Discovery

Running this command:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});console.log('NEXT_PUBLIC_SUPABASE_URL:',process.env.NEXT_PUBLIC_SUPABASE_URL?'set':'missing');console.log('SUPABASE_URL:',process.env.SUPABASE_URL?'set':'missing');console.log('DATABASE_URL:',process.env.DATABASE_URL?'set':'missing');"
```

Returned:
```
NEXT_PUBLIC_SUPABASE_URL: set
SUPABASE_URL: missing
DATABASE_URL: missing
```

**Hypothesis**: SAOL may require `SUPABASE_URL` (not `NEXT_PUBLIC_SUPABASE_URL`), and for `transport: 'pg'` it requires `DATABASE_URL`.

### First Task for Next Agent

**Help diagnose and fix why SAOL cannot connect to the database.**

Steps to investigate:
1. Examine SAOL source code at `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\` to determine:
   - What environment variables are expected?
   - What causes `ERR_VALIDATION_REQUIRED`?
   - Why is `fetch failed` occurring?

2. Check `.env.local` at `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` to see what's actually set

3. Determine if SAOL needs:
   - `SUPABASE_URL` instead of `NEXT_PUBLIC_SUPABASE_URL`?
   - `SUPABASE_SERVICE_ROLE_KEY` for schema introspection?
   - `DATABASE_URL` for `transport: 'pg'`?

---

## 📋 Context: What We Were Trying To Do

### Multi-Turn Chat Implementation

We created 5 execution prompts to guide implementation of a multi-turn chat module:

| Prompt | Content | File |
|--------|---------|------|
| E01 | Database Schema + Types | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v1.md` |
| E02 | Service Layer | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E02_v1.md` |
| E03 | API Routes | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E03_v1.md` |
| E04 | React Hooks + UI | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E04_v1.md` |
| E05 | Page Route + Verification | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E05_v1.md` |

### E01 Execution Attempt Failed

When attempting to run the database SQL from E01:

1. **First attempt (CREATE TABLE)**: Errored with `relation "conversation_turns" already exists`
   - Tables already existed from previous work

2. **Second attempt (CREATE INDEX on status)**: Errored with `column "status" does not exist`
   - The existing table is missing the `status` column
   - We don't know what other columns are missing

3. **We cannot proceed without SAOL** because we need to:
   - See the current table schema
   - Compare it to the required schema
   - Generate the correct ALTER TABLE statements

### Files Created During This Session

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v1-SQL-ONLY.md` | First SQL attempt (failed on status column) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v2-SQL-ONLY.md` | Second SQL attempt (guess-based, NOT verified) |

**IMPORTANT**: The v2 SQL file was written WITHOUT verifying the actual database schema. It should NOT be executed until SAOL is working and we can verify what's actually in the database.

---

## 📚 Key Files for This Work

### SAOL Investigation Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\src\` | SAOL source code to examine |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\saol-agent-manual_v2.md` | SAOL documentation |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` | Environment variables to check |

### Execution Prompt Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v1.md` | Database schema + types spec (READ THIS) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E02_v1.md` | Service layer spec |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E03_v1.md` | API routes spec |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E04_v1.md` | React hooks + UI spec |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E05_v1.md` | Page route + verification spec |

### Original Specification Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-turn-chat-and-evaluation_v1.md` | Combined spec used to generate E01-E05 |

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

**Library Path:** supa-agent-ops
**Quick Start:** QUICK_START.md (READ THIS FIRST)
**Troubleshooting:** TROUBLESHOOTING.md

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query pipeline training jobs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',select:'id,job_name,status,adapter_file_path,final_loss,training_time_seconds,created_at',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Pipeline Jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.job_name,'/',j.status));})();"

# Query inference endpoints
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_inference_endpoints',select:'*',limit:10});console.log('Endpoints:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query test results
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_test_results',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Test Results:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"
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
   - **Pods Mode** (CURRENT): RunPod Pods with direct vLLM OpenAI API ✅ WORKING
   - **Serverless Mode** (PRESERVED): RunPod Serverless with wrapper format ⏳ (needs fixes)
   - **A/B testing interface** with side-by-side comparison
   - **Claude-as-Judge evaluation** with detailed metrics
   - **User rating system** and test history
   - **Real-time status updates** with polling
   - **Easy mode switching** via environment variable

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
- **GPU Training**: RunPod Serverless (endpoint: `ei82ickpenoqlp`)
- **Training Framework**: Transformers + PEFT + TRL 0.16+ + bitsandbytes (QLoRA 4-bit)
- **Inference**: 
  - **Pods** (current): 2x RunPod Pods with vLLM (control + adapted)
  - **Serverless** (preserved): RunPod Serverless vLLM (endpoint: `780tauhj7c126b`)
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
- `pipeline_training_jobs` - NEW pipeline job tracking
- `pipeline_evaluation_runs` - Evaluation run metadata
- `pipeline_evaluation_results` - Individual scenario evaluation results

**Inference Tables** (E01 - CREATED & DEPLOYED):
- `pipeline_inference_endpoints` - Serverless endpoint tracking (Control + Adapted)
- `pipeline_test_results` - A/B test history with evaluations and ratings
- `base_models` - Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

**Evaluator Tables** (CREATED - January 28, 2026):
- `evaluation_prompts` - Stores evaluation prompt templates (legacy_v1, arc_aware_v1)

**Multi-Turn Tables** (PARTIALLY CREATED - Current Issue):
- `multi_turn_conversations` - Already exists
- `conversation_turns` - Already exists but MISSING columns (e.g., `status`)

---

## 🚫 Final Reminder

**DO NOT start implementing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Read the E01 execution prompt at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-turn-chat-and-evaluation-execution-prompts-E01_v1.md`
3. ✅ Understand the SAOL issue documented above
4. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\lora-pipeline\src`
5. ✅ **WAIT** for human to tell you what to do next

The human will likely ask you to:
- **Diagnose why SAOL is not working**
- Examine the SAOL source code for environment variable requirements
- Check the `.env.local` file for missing variables
- Fix the SAOL connection issue

**Once SAOL is working**, we can:
- Use it to inspect the actual database schema
- Write correct SQL to complete E01
- Continue with E02-E05 implementation

**Do NOT write SQL or make database changes until SAOL is working and we can verify the current schema.**

**Do not assume. Wait for instructions.**

---

**Last Updated**: January 28, 2026 (10:48 PM Pacific)
**Session Focus**: SAOL debugging required before continuing multi-turn chat implementation
**Current Mode**: `INFERENCE_MODE=pods` (working)
**Document Version**: context-carry-info-11-15-25-1114pm-yyy
**Blocking Issue**: SAOL cannot connect to database (ERR_VALIDATION_REQUIRED, fetch failed)
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**SAOL Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`
