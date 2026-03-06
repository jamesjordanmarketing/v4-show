# Context Carryover: LoRA Pipeline - Pods Inference Mode Operational

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
3. ✅ **UNDERSTAND THE PODS RESTART WORKFLOW**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-restart-pods_v1.md`
4. ✅ **READ THE MODE SELECTOR**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts`
5. ✅ **READ THE PODS IMPLEMENTATION**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-pods.ts`
6. ✅ **UNDERSTAND THE TEST PAGE**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\test\page.tsx`
7. ✅ Review the debugging and session accomplishments documented below
8. ✅ **STOP and WAIT for explicit human instructions**

The human will tell you exactly what to do next. Do NOT assume or suggest actions.

---

## 📌 Active Development Focus

**Primary Status**: RunPod Pods-based inference is FULLY OPERATIONAL ✅
**Current Phase**: Adapter A/B Testing System is working end-to-end
**Implementation Mode**: `INFERENCE_MODE=pods`

### Current Status: January 24, 2026

**Current Mode**: `INFERENCE_MODE=pods` ✅ WORKING AND TESTED
**Test Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
**Test Adapter**: `adapter-6fd5ac79` (emotional intelligence)
**Production Test URL**: https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test

---

## 🎯 Session Accomplishments (January 23-24, 2026)

### What Was Completed This Session

1. ✅ **Fixed URL Construction Bug**: The inference request URL had a double-slash (`//v1/chat/completions`) due to trailing slash in Vercel environment variable. Fixed by removing trailing slash from `INFERENCE_API_URL` and `INFERENCE_API_URL_ADAPTED`.

2. ✅ **Verified vLLM Server Operation**: Confirmed that the persistent restart scripts (`/workspace/scripts/full-restart-control.sh` and `/workspace/scripts/full-restart-adapted.sh`) properly start the vLLM server with "Uvicorn running on..." message.

3. ✅ **Successfully Ran End-to-End A/B Test**: Submitted a prompt from the test page and received BOTH:
   - Control (base model) response ✅
   - Adapted (LoRA adapter) response ✅

4. ✅ **Documented Pod Management Workflow**: Created simplified restart documentation in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-restart-pods_v1.md` with:
   - Single-command restart scripts
   - Clear Vercel environment variable update instructions
   - Step-by-step pod creation and testing checklist

5. ✅ **Clarified Port Requirements**: Port 8080 is NOT needed for pods - only 8000 (control) or 8001 (adapted) plus 22 (SSH).

---

## 🏗️ Test Page Architecture Analysis

### User's Questions for Next Agent

The user wants the next agent to help them understand:
1. **How prompt responses are stored** after an A/B test
2. **How the "Your Rating" box works** including implementation details

### File Locations for Test Page

The test page is located at:
- **Page Component**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\test\page.tsx`

This page uses several key components:
- `ABTestingPanel` - Main testing interface
- `EndpointStatusBanner` - Shows control/adapted endpoint status
- `TestHistoryTable` - Previous test results
- `TestResultComparison` - Side-by-side comparison with rating

### Answer to Question A: Storing Prompt Responses

**Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`

**Function**: `runABTest()` (lines 166-333)

**Flow**:
1. Creates test record in `pipeline_test_results` table with `status: 'generating'`
2. Runs sequential inference calls (control first, then adapted)
3. Updates the record with responses:
   - `control_response` - Base model's response text
   - `adapted_response` - LoRA adapter's response text
   - `control_generation_time_ms` / `adapted_generation_time_ms` - Timing
   - `control_tokens_used` / `adapted_tokens_used` - Token counts
4. If evaluation enabled, runs Claude-as-Judge and stores:
   - `control_evaluation` - JSON evaluation object
   - `adapted_evaluation` - JSON evaluation object
   - `evaluation_comparison` - Winner and comparison data
5. Sets `status: 'completed'` and `completed_at` timestamp

**Database Table**: `pipeline_test_results`

### Answer to Question B: "Your Rating" Implementation

**UI Component**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestResultComparison.tsx`

The "Your Rating" section (lines 235-318) displays:
- 4 rating buttons: "Control Better", "Adapted Better", "Tie", "Neither"
- Optional notes textarea
- Shows existing rating if already rated

**Rating Flow**:
1. User clicks a rating button → `handleRate(rating)` called
2. `handleRate()` calls `rateTest()` from `useAdapterTesting` hook
3. Hook sends POST to `/api/pipeline/adapters/rate`
4. API route calls `rateTestResult()` from service layer
5. Service updates `pipeline_test_results` table with `user_rating` and `user_notes`

**Key Files**:
- **Hook**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useAdapterTesting.ts`
  - `rateTestResult()` function (lines 139-157) - API call
  - `useRateTest()` hook (lines 359-420) - React Query mutation with optimistic updates
  - `useAdapterTesting()` hook (lines 527-563) - Combined hook exposing `rateTest`
  
- **API Route**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\rate\route.ts`
  - Validates `testId`, `rating` (one of: 'control', 'adapted', 'tie', 'neither'), optional `notes`
  - Calls `rateTestResult()` service function
  
- **Service**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`
  - `rateTestResult()` function (lines 372-398) - Updates database

**Rating Type**: `UserRating = 'control' | 'adapted' | 'tie' | 'neither'`

---

## 🏗️ Current Architecture: Dual-Mode Inference System

### Overview

We have a **dual-mode architecture** supporting BOTH RunPod Pods and RunPod Serverless. Mode is controlled by `INFERENCE_MODE` environment variable.

**Current Mode**: `pods` ✅ WORKING
**Alternative Mode**: `serverless` (preserved, needs fixes for LoRA)

### File Structure

```
C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\
├── inference-service.ts              # Main entry point with mode selector
├── inference-serverless.ts           # Serverless implementation (PRESERVED)
└── inference-pods.ts                 # Pods implementation (CURRENT/WORKING)
```

### How Mode Switching Works

**Environment Variable** (in Vercel and `.env.local`):
```
INFERENCE_MODE=pods         # Current (working)
INFERENCE_MODE=serverless   # Alternative (preserved, needs fixes)
```

**Mode Selector** in `inference-service.ts`:
```typescript
const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

export async function callInferenceEndpoint(...args) {
  if (INFERENCE_MODE === 'pods') {
    return await callInferenceEndpoint_Pods(...args);
  } else if (INFERENCE_MODE === 'serverless') {
    return await callInferenceEndpoint_Serverless(...args);
  }
}
```

---

## 📋 Pod Management Quick Reference

### Current Pod Configuration

| Pod | Network Volume | Port | Restart Script |
|-----|----------------|------|----------------|
| Control | `brightrun-inference-control-pod` | 8000 | `/workspace/scripts/full-restart-control.sh` |
| Adapted | `brightrun-inference-adapter-pod` | 8001 | `/workspace/scripts/full-restart-adapted.sh` |

### Vercel Environment Variables (Current as of January 24, 2026)

| Variable | Value Format | Purpose |
|----------|--------------|---------|
| `INFERENCE_MODE` | `pods` | Selects pods implementation |
| `INFERENCE_API_URL` | `https://[POD_ID]-8000.proxy.runpod.net` | Control pod endpoint (NO trailing slash!) |
| `INFERENCE_API_URL_ADAPTED` | `https://[POD_ID]-8001.proxy.runpod.net` | Adapted pod endpoint (NO trailing slash!) |

### Pod Restart Procedure

1. Create pod in RunPod Console with appropriate Network Volume attached
2. Open Web Terminal and run restart script
3. Wait for "Uvicorn running on http://0.0.0.0:800X"
4. Note new Pod ID from proxy URL
5. Update Vercel environment variables with new URLs
6. Vercel auto-redeploys (or trigger manually)

**IMPORTANT**: Pod proxy URLs change when pods are TERMINATED. Since Network Volume pods cannot be STOPPED (only terminated), you MUST update Vercel env vars every time you recreate pods.

Full documentation: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-restart-pods_v1.md`

---

## 📚 Key Implementation Files

### Test Page Files (for understanding prompt storage and rating)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\test\page.tsx` | Main test page component |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\ABTestingPanel.tsx` | A/B test input form and execution |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestResultComparison.tsx` | Side-by-side results + "Your Rating" UI |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestHistoryTable.tsx` | Previous test history display |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useAdapterTesting.ts` | React Query hooks for testing workflow |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts` | Core testing logic (runABTest, rateTestResult) |

### Inference Files (for understanding pod/serverless routing)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts` | Mode selector and shared functions |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-pods.ts` | Pods implementation (CURRENT) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts` | Serverless implementation (preserved) |

### API Routes (for understanding data flow)

| Route | File | Purpose |
|-------|------|---------|
| POST `/api/pipeline/adapters/test` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\test\route.ts` | Run A/B test |
| GET `/api/pipeline/adapters/test` | Same file | Get test history |
| POST `/api/pipeline/adapters/rate` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\rate\route.ts` | Submit user rating |
| GET `/api/pipeline/adapters/status` | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\adapters\status\route.ts` | Check endpoint status |

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
- `prompt_templates` - Generation templates
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

---

## 🚫 Final Reminder

**DO NOT start implementing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Understand how prompts are stored (via `runABTest()` in `test-service.ts`)
3. ✅ Understand how "Your Rating" works (via `rateTestResult()` and the rate API route)
4. ✅ Review the file locations listed above
5. ✅ **WAIT** for human to tell you what to do next

The human may ask you to:
- Explain how specific parts of the testing flow work
- Modify the rating system
- Add new features to the test page
- Debug issues with responses or storage
- Help with pod management

**Do not assume. Wait for instructions.**

---

**Last Updated**: January 24, 2026
**Session Focus**: Pods inference mode operational, end-to-end A/B testing verified
**Current Mode**: `INFERENCE_MODE=pods` (working)
**Document Version**: context-carry-info-11-15-25-1114pm-uuu
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Test URL**: https://v4-show.vercel.app/pipeline/jobs/6fd5ac79-c54b-4927-8138-ca159108bcae/test
