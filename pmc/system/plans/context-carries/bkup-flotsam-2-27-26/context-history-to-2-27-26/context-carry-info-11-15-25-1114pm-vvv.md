# Context Carryover: LoRA Pipeline - Claude-as-Judge Enhancement Ready

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
3. ✅ **READ THE IMPLEMENTATION SPEC**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md`
4. ✅ **READ THE CURRENT MEASUREMENT ANALYSIS**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-current_v1.md`
5. ✅ **UNDERSTAND THE TEST SERVICE**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`
6. ✅ **UNDERSTAND THE TEST PAGE**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\test\page.tsx`
7. ✅ **READ SAOL INSTRUCTIONS**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`
8. ✅ Review the session accomplishments documented below
9. ✅ **STOP and WAIT for explicit human instructions**

The human will tell you exactly what to do next. Do NOT assume or suggest actions.

---

## 📌 Active Development Focus

**Primary Status**: Claude-as-Judge Enhancement Specification COMPLETE ✅
**Current Phase**: Ready for implementation of arc-aware evaluation system
**Next Work**: Implement changes from `arc-measurement-claude-as-judge-changes_v1.md`

### Current Status: January 27, 2026

**Pods Inference Mode**: ✅ WORKING (no changes needed)
**Claude-as-Judge**: Currently uses hardcoded prompt — needs enhancement
**Implementation Spec**: Complete and approved at `arc-measurement-claude-as-judge-changes_v1.md`

---

## 🎯 Session Accomplishments (January 27, 2026)

### What Was Completed This Session

1. ✅ **Created Arc-Aware Evaluation Specification**: Full implementation spec written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md`

2. ✅ **Designed Emotional Closeness Measurement Methodology**: 
   - **Approved approach**: "Directional Improvement Model" using:
     - **Valence shift**: `improved` | `maintained` | `worsened`
     - **Intensity change**: `reduced` | `unchanged` | `increased`
     - **Arc alignment**: Detected arc key + confidence score (0.0-1.0)
   - This approach was explicitly **APPROVED** by the project owner

3. ✅ **Designed Database Schema for Evaluation Prompts**:
   - New table: `evaluation_prompts` — stores prompt templates with versioning
   - Modified table: `pipeline_test_results` — adds `evaluation_prompt_id` column
   - **No historical data migration** — existing records will have `NULL` for the new column

4. ✅ **Designed UI Evaluator Selection**:
   - Dropdown on `pipeline/jobs/[id]/test` page
   - Shows all active evaluators from `evaluation_prompts` table
   - Default evaluator is pre-selected

5. ✅ **Documented Complete Implementation Path**:
   - Service layer changes to `test-service.ts`
   - New API route `/api/pipeline/evaluators`
   - React hook `useEvaluators` in `useAdapterTesting.ts`
   - UI changes to `ABTestingPanel.tsx`
   - Type updates to `pipeline-adapter.ts`

---

## 🎯 Next Work: Claude-as-Judge Enhancement

### Source of Truth

**The implementation specification is located at:**
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md`

This document contains ALL details needed to implement the enhancement. Do NOT create a parallel spec — use the above file as the single source of truth.

### Summary of Required Changes

1. **Database Changes** (use SAOL for all operations):
   - Create `evaluation_prompts` table
   - Add `evaluation_prompt_id` column to `pipeline_test_results`
   - Insert two seed prompts: `legacy_v1` and `arc_aware_v1`

2. **Service Layer Changes** (`test-service.ts`):
   - Add `getEvaluationPrompt()` function
   - Add `getEmotionalArcsContext()` function
   - Modify `evaluateWithClaude()` to accept `evaluationPromptId`
   - Modify `runABTest()` to pass `evaluationPromptId`
   - Add `getAvailableEvaluators()` export

3. **API Route Changes**:
   - Update POST `/api/pipeline/adapters/test` to accept `evaluationPromptId`
   - Create new GET `/api/pipeline/evaluators` route

4. **UI Changes** (`ABTestingPanel.tsx`):
   - Add evaluator dropdown (only visible when evaluation enabled)
   - Use new `useEvaluators` hook

5. **Type Updates** (`pipeline-adapter.ts`):
   - Update `RunTestRequest` interface
   - Update `TestResult` interface
   - Add new types for arc-aware evaluation

### Key Design Decisions (Approved)

| Decision | Choice |
|----------|--------|
| Measurement approach | Valence + intensity + arc alignment (APPROVED) |
| Default evaluator | `arc_aware_v1` (new arc-aware prompt) |
| Legacy evaluator | Preserved as `legacy_v1` for comparison |
| Historical migration | NO backfill — existing records keep `NULL` |
| Arc injection | From `prompt_templates` table → `{emotional_arcs}` placeholder |

---

## 📚 Key Files for This Work

### Specification Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md` | **PRIMARY**: Complete implementation specification |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-current_v1.md` | Analysis of current evaluation system |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md` | SAOL usage instructions |

### Code Files to Modify

| File | Changes |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts` | Core evaluation logic, new functions |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\test\route.ts` | Accept `evaluationPromptId` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\evaluators\route.ts` | NEW route for evaluator list |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useAdapterTesting.ts` | Add `useEvaluators` hook |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\ABTestingPanel.tsx` | Add evaluator dropdown |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\pipeline-adapter.ts` | Update interfaces |

### Reference Files (Read-Only)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\file-7-conversations-3-turns-6.json` | Example LoRA training data with emotional arcs |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestResultComparison.tsx` | Existing comparison UI (for reference) |

---

## 🏗️ Current Architecture Context

### Inference System (Working - No Changes Needed)

The pods-based inference system is fully operational:
- **Mode**: `INFERENCE_MODE=pods`
- **Control Pod**: Runs base model on port 8000
- **Adapted Pod**: Runs LoRA adapter on port 8001
- **Test Page**: `pipeline/jobs/[id]/test`

### Current Evaluation Flow (What We're Enhancing)

1. User submits test prompt on `/pipeline/jobs/[jobId]/test`
2. `runABTest()` calls both inference endpoints sequentially
3. If `enableEvaluation=true`, `evaluateWithClaude()` is called for BOTH responses
4. Claude evaluates using hardcoded `EVALUATION_PROMPT` ← **THIS IS WHAT WE'RE ENHANCING**
5. `compareEvaluations()` determines winner
6. Results stored in `pipeline_test_results` table

### What Changes

After implementation:
- Step 4 will use database-stored prompts instead of hardcoded
- The arc-aware prompt will inject emotional arcs from `prompt_templates`
- Users can select which evaluator to use via dropdown
- `evaluation_prompt_id` is stored for traceability

---

## 🏗️ Test Page Architecture (For Reference)

### How Prompt Responses Are Stored

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`
**Function**: `runABTest()` (lines 166-333)

**Flow**:
1. Creates test record with `status: 'generating'`
2. Runs sequential inference (control first, then adapted)
3. Updates record with responses
4. If evaluation enabled, runs Claude-as-Judge
5. Sets `status: 'completed'`

### How "Your Rating" Works

**UI Component**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestResultComparison.tsx`

**Rating Flow**:
1. User clicks rating button → `handleRate(rating)`
2. Hook calls POST `/api/pipeline/adapters/rate`
3. Service updates `user_rating` and `user_notes` in database

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

**NEW Tables** (Claude-as-Judge Enhancement - TO BE CREATED):
- `evaluation_prompts` - Stores evaluation prompt templates (legacy + arc-aware)

---

## 🚫 Final Reminder

**DO NOT start implementing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Read the implementation specification at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md`
3. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. ✅ Review the key files listed above
5. ✅ **WAIT** for human to tell you what to do next

The human may ask you to:
- Implement the Claude-as-Judge enhancement per the specification
- Create the `evaluation_prompts` table using SAOL
- Modify the test service and API routes
- Add the evaluator dropdown to the UI
- Debug or test specific parts of the system

**Do NOT create a parallel spec. Use `arc-measurement-claude-as-judge-changes_v1.md` as the source of truth.**

**Do not assume. Wait for instructions.**

---

**Last Updated**: January 27, 2026
**Session Focus**: Claude-as-Judge enhancement specification complete, ready for implementation
**Current Mode**: `INFERENCE_MODE=pods` (working)
**Document Version**: context-carry-info-11-15-25-1114pm-vvv
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Implementation Spec**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\arc-measurement-claude-as-judge-changes_v1.md`
