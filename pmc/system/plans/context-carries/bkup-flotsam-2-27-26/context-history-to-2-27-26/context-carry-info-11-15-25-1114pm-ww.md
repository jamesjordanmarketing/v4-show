# Context Carryover: LoRA Pipeline Module - Section E03 Deployed to Production

## 📌 Active Development Focus

**Primary Task**: LoRA Training Pipeline Implementation - Section E03 Successfully Deployed

### Current Status: Section E03 Deployed to Production (December 27, 2025)

Section E03 of the LoRA training pipeline has been **successfully deployed to Vercel production**. All build errors have been resolved, TypeScript compilation is clean, and the training configuration system is fully functional and live.

**Implementation Status**: ✅ DEPLOYED TO PRODUCTION  
**Project ID**: hqhtbxlgzysfbekexwku  
**Environment**: Production (Vercel) + Local development  
**Deployment Date**: December 27, 2025

---

## ✅ What Was Accomplished (December 26-27, 2025)

### Session 1: Implementation (December 26, 2025)
Implemented **Section E03: Training Configuration System** - the critical interface between dataset management and training execution.

### Session 2: Deployment & Bug Fixes (December 27, 2025)
Fixed critical build errors during Vercel deployment and successfully deployed Section E03 to production.

---

## 🐛 Build Errors Fixed During Deployment (December 27, 2025)

### Issue #1: Missing Toast Import
**File**: `src/hooks/useTrainingConfig.ts`  
**Error**: `Module not found: Can't resolve '@/components/ui/use-toast'`

**Root Cause**: 
- Imported non-existent `useToast` hook from `@/components/ui/use-toast`
- Project uses `sonner` library for toast notifications, not a custom hook

**Fix Applied**:
```typescript
// BEFORE (incorrect)
import { useToast } from '@/components/ui/use-toast';
const { toast } = useToast();
toast({ title: 'Success', description: '...' });

// AFTER (correct)
import { toast } from 'sonner';
toast.success('Training job created and queued for processing');
toast.error(error.message || 'Failed to create training job');
```

**Pattern Match**: Now matches all other hooks in codebase (e.g., `use-datasets.ts`, `use-online-status.ts`)

---

### Issue #2: Missing Await for Supabase Client
**Files**: 
- `src/app/api/jobs/estimate/route.ts` (line 51)
- `src/app/api/jobs/route.ts` (lines 54, 153)

**Error**: `Property 'from' does not exist on type 'Promise<SupabaseClient<...>>'`

**Root Cause**: 
- `createServerSupabaseClient()` returns a Promise
- Missing `await` keyword caused TypeScript to treat it as Promise instead of client

**Fix Applied**:
```typescript
// BEFORE (incorrect)
const supabase = createServerSupabaseClient();

// AFTER (correct)
const supabase = await createServerSupabaseClient();
```

**Occurrences Fixed**:
1. POST /api/jobs/estimate (cost estimation)
2. POST /api/jobs (job creation)
3. GET /api/jobs (job listing)

**Pattern Match**: Now matches all other API routes (verified 20+ routes use `await`)

---

### Issue #3: React Query v5 refetchInterval API
**File**: `src/hooks/useTrainingConfig.ts` (line 104)  
**Error**: `Property 'data' does not exist on type 'Query<any, Error, any, string[]>'`

**Root Cause**: 
- React Query v5 changed `refetchInterval` callback signature
- Callback now receives full `Query` object, not just data
- Must access data via `query.state.data` instead of direct `data` parameter

**Fix Applied**:
```typescript
// BEFORE (incorrect - React Query v4 API)
refetchInterval: (data) => {
  const status = data?.data?.status;
  return status === 'running' ? 5000 : false;
}

// AFTER (correct - React Query v5 API)
refetchInterval: (query: any) => {
  // In React Query v5, refetchInterval callback receives the query object
  const responseData = query.state?.data;
  const status = responseData?.data?.status;
  return status === 'running' || status === 'queued' || status === 'initializing' 
    ? 5000 
    : false;
}
```

**Version**: Project uses `@tanstack/react-query@^5.90.5`  
**Pattern**: This is the only `refetchInterval` with callback in entire codebase

---

## 🎯 Code Quality After Fixes

### Build Status: ✅ SUCCESSFUL
- **TypeScript Errors**: 0
- **Vercel Build**: Passed
- **Next.js Compilation**: ✓ Compiled successfully
- **Type Checking**: Passed
- **Deployment**: Live on Vercel

### Pattern Consistency: ✅ VERIFIED
All fixes now match existing codebase patterns:
- Toast notifications use `sonner` library
- Supabase client calls use `await` keyword
- React Query hooks follow v5 API conventions

---

## 📦 Section E03: Complete Implementation Details

### 1. Cost Estimation API

**File**: `src/app/api/jobs/estimate/route.ts`  
**Endpoint**: `POST /api/jobs/estimate`  
**Status**: ✅ Deployed to Production

**Purpose**: Calculate estimated training cost and duration based on GPU configuration, hyperparameters, and dataset size.

**Key Features**:
- **Sophisticated Duration Calculation**:
  - Based on dataset size (training_pairs, total_tokens)
  - GPU throughput (tokens/second varies by GPU type)
  - Overhead calculations: initialization (10 min), validation between epochs (5 min/epoch), final save (5 min)
  - Formula: `total_seconds = (total_steps × seconds_per_step) + overhead`

- **GPU Pricing Configuration** (per hour, per GPU):
  - A100-80GB: $3.50/hr, 1800 tokens/sec throughput
  - A100-40GB: $2.80/hr, 1500 tokens/sec throughput
  - H100: $4.20/hr, 2200 tokens/sec throughput
  - V100-32GB: $2.10/hr, 1200 tokens/sec throughput

- **Cost Breakdown**:
  - Compute cost: hourly_rate × estimated_hours
  - Storage cost: $0.50 (fixed for model artifacts in Supabase Storage)
  - Total cost: compute + storage

**Request Validation** (Zod schema):
- `dataset_id`: UUID (required)
- `gpu_config.type`: Enum ['A100-80GB', 'A100-40GB', 'H100', 'V100-32GB']
- `gpu_config.count`: Integer 1-8
- `hyperparameters.batch_size`: Integer 1-64
- `hyperparameters.epochs`: Integer 1-20
- `hyperparameters.learning_rate`: Number 0.00001-0.001
- `hyperparameters.rank`: Integer 4-128

**Response Format**:
```json
{
  "success": true,
  "data": {
    "estimated_cost": 25.50,
    "cost_breakdown": {
      "compute": 25.00,
      "storage": 0.50
    },
    "estimated_duration_hours": 3.57,
    "hourly_rate": 7.00,
    "training_details": {
      "total_steps": 750,
      "steps_per_epoch": 250,
      "estimated_throughput_tokens_per_sec": 3600,
      "dataset_name": "My Dataset"
    }
  }
}
```

---

### 2. Training Job Creation & Listing API

**File**: `src/app/api/jobs/route.ts`  
**Endpoints**: POST /api/jobs, GET /api/jobs  
**Status**: ✅ Deployed to Production

#### POST /api/jobs - Create Training Job

**Purpose**: Create training job record with validated configuration and queue for processing.

**Validation Flow**:
1. Verify dataset exists and belongs to user
2. Verify dataset has `status='ready'`
3. Verify dataset has `training_ready=true`
4. Calculate total steps for progress tracking:
   - `steps_per_epoch = ceil(training_pairs / batch_size)`
   - `total_steps = steps_per_epoch × epochs`

**Job Record Created**:
- `status`: 'queued' (initial state)
- `current_stage`: 'queued'
- `progress`: 0
- `current_epoch`: 0
- `total_epochs`: from hyperparameters
- `current_step`: 0
- `total_steps`: calculated value
- `gpu_config`: JSONB (type, count)
- `hyperparameters`: JSONB (learning_rate, batch_size, epochs, rank, alpha, dropout)
- `estimated_total_cost`: from cost estimation
- `current_cost`: 0 (will be updated during training)
- `current_metrics`: {} (empty, will be populated during training)
- `queued_at`: current timestamp

**Notification Created**:
- Type: 'job_queued'
- Title: 'Training Job Queued'
- Message: "Your training job for "{dataset_name}" has been queued and will start shortly"
- Priority: 'low'
- Action URL: `/training/jobs/{job_id}`

#### GET /api/jobs - List Training Jobs

**Purpose**: List user's training jobs with pagination and filtering.

**Query Parameters**:
- `page`: Integer (default: 1)
- `limit`: Integer (default: 10)
- `status`: String (optional filter)

**Features**:
- Pagination with offset/limit
- Status filtering (queued, running, completed, failed, cancelled)
- Dataset join for enriched response (name, format, total_training_pairs)
- Ordered by created_at DESC (newest first)
- RLS enforced (users only see own jobs)

---

### 3. React Query Hooks

**File**: `src/hooks/useTrainingConfig.ts`  
**Status**: ✅ Deployed to Production (with fixes)

**Purpose**: React Query hooks for training configuration with proper cache management.

#### Hooks Provided:

**`useEstimateCost()`**
- **Type**: Mutation hook
- **Purpose**: Calculate cost estimate (can be re-triggered)
- **Parameters**: `{ dataset_id, gpu_config, hyperparameters }`
- **Returns**: Cost data with breakdown

**`useCreateTrainingJob()`**
- **Type**: Mutation hook
- **Purpose**: Create training job
- **Side Effects**:
  - Auto-invalidates `training-jobs` query on success
  - Shows success toast: `toast.success('Training job created and queued for processing')`
  - Shows error toast: `toast.error(error.message)`

**`useTrainingJobs(params?)`**
- **Type**: Query hook
- **Purpose**: List training jobs with filters
- **Parameters**: `{ status?, page?, limit? }`
- **Query Key**: `['training-jobs', params]`

**`useTrainingJob(jobId)`**
- **Type**: Query hook
- **Purpose**: Fetch single job details with auto-polling
- **Parameters**: Job ID (string | null)
- **Query Key**: `['training-job', jobId]`
- **Auto-polling**: Refetches every 5 seconds when job status is 'running', 'queued', or 'initializing'
- **React Query v5 API**: Uses `query.state.data` to access response data

---

### 4. Training Configuration Page (UI)

**File**: `src/app/(dashboard)/training/configure/page.tsx`  
**Route**: `/training/configure?datasetId={uuid}`  
**Status**: ✅ Deployed to Production

**Purpose**: Interactive form for configuring training jobs with preset selection, custom hyperparameters, and real-time cost estimation.

#### Key Features:

**Preset Selection** (3 presets):

1. **Fast Preset** (Zap icon):
   - Learning Rate: 0.0001, Batch Size: 8, Epochs: 1, LoRA Rank: 8
   - **Use Case**: Quick training for testing and iteration

2. **Balanced Preset** (Target icon) - **DEFAULT**:
   - Learning Rate: 0.00005, Batch Size: 4, Epochs: 3, LoRA Rank: 16
   - **Use Case**: Recommended balance of quality and cost

3. **Quality Preset** (Crown icon):
   - Learning Rate: 0.00003, Batch Size: 2, Epochs: 5, LoRA Rank: 32
   - **Use Case**: Maximum quality for production models

**GPU Configuration**:
- **GPU Type Selector**: A100-80GB, A100-40GB, H100, V100-32GB
- **GPU Count Slider**: 1-8 GPUs with multi-GPU benefits display

**Hyperparameter Controls**:
- Learning Rate: 0.00001 - 0.0002 (5 decimal places)
- Batch Size: 1-16
- Epochs: 1-10
- LoRA Rank: 4-64 (step: 4)

**Cost Estimation Display**:
- Real-time updates with 500ms debouncing
- Cost breakdown: Compute + Storage = Total
- Training details: Duration, hourly rate, total steps, throughput

**User Experience**:
- Back button to return to previous page
- Real-time cost recalculation on any parameter change
- Success flow: Redirects to `/training/jobs/{job_id}` after creation
- Toast notifications for success/error

---

## 🔗 Integration Summary

### Database Tables Used (from Section E01):

**`datasets` table**:
- Validate dataset exists, belongs to user, is ready for training
- Columns: id, name, status, training_ready, total_training_pairs, total_tokens

**`training_jobs` table**:
- INSERT: Create new job record with status='queued'
- SELECT: List jobs with pagination and filtering

**`notifications` table**:
- INSERT: Create notification when job is queued

### Authentication (from Section E01):
- All API routes protected with `requireAuth()` from `@/lib/supabase-server`
- RLS policies enforced on all database queries

### Dataset Validation (from Section E02):
- Validates dataset readiness before job creation
- Uses dataset statistics for cost/duration estimation

---

## 📂 Files Created/Modified in Section E03

### Files Created (4 new files):
1. `src/app/api/jobs/estimate/route.ts` - Cost estimation endpoint
2. `src/app/api/jobs/route.ts` - Job creation and listing
3. `src/hooks/useTrainingConfig.ts` - React Query hooks
4. `src/app/(dashboard)/training/configure/page.tsx` - Configuration UI

### Files Modified (Bug Fixes):
1. `src/hooks/useTrainingConfig.ts` - Fixed toast import, React Query v5 API
2. `src/app/api/jobs/estimate/route.ts` - Added await for Supabase client
3. `src/app/api/jobs/route.ts` - Added await for Supabase client (2 places)

---

## 🚀 Current Development Status

### Section E01: Foundation & Authentication
**Status**: ✅ DEPLOYED TO PRODUCTION
- Database schema (6 tables)
- TypeScript types
- Storage buckets
- RLS policies

### Section E02: Dataset Management
**Status**: ✅ DEPLOYED TO PRODUCTION (December 26, 2025)
- Dataset upload with presigned URLs
- Background validation (Edge Function)
- Dataset management UI
- React Query hooks

### Section E03: Training Configuration
**Status**: ✅ DEPLOYED TO PRODUCTION (December 27, 2025)
- Cost estimation API
- Job creation API
- Training configuration UI with presets
- Real-time cost updates
- **Bug fixes applied and deployed**

### Section E03b: Data Bridge (Optional)
**Status**: ⏳ NOT STARTED
- Integration between training files and datasets
- Automatic JSONL export for LoRA pipeline
- One-click export from training files to datasets

### Section E04: Training Execution & Monitoring
**Status**: ⏳ NOT STARTED (Next Section)
- Edge Function to process queued jobs
- Training simulation/execution logic
- Real-time progress updates
- Job monitoring UI
- Job cancellation
- Final cost tracking

---

## 🔜 What's Ready for Next Development

### For Section E03b (Data Bridge - Optional):
- Training files system with enriched conversations
- Datasets system with upload/validation
- Need: Bridge to export training files directly to datasets

### For Section E04 (Training Execution - Primary Next Step):

**Available Foundation**:
- Jobs in database with `status='queued'`
- Full job configuration (hyperparameters, GPU config)
- Cost estimates for tracking
- Total steps calculated for progress tracking

**APIs Ready**:
- GET /api/jobs with pagination
- Status filtering
- Dataset join for enriched data

**React Hooks Ready**:
- `useTrainingJob(jobId)` with auto-polling every 5 seconds
- Ready for real-time progress updates

**Database Schema Ready**:
- `training_jobs` table with all progress tracking fields
- `metrics_points` table for training metrics
- `model_artifacts` table for trained models
- `cost_records` table for cost tracking

---

## 🎯 NEXT AGENT: Critical Instructions

### PHASE A: Context Internalization (MANDATORY - DO NOT SKIP)

You MUST read and internalize ALL of the following before receiving any implementation instructions. **DO NOT start fixing, writing, or modifying anything. Your ONLY job is to read, understand, and wait for explicit human instructions.**

---

#### 1. Production Codebase (HIGHEST PRIORITY - START HERE)

**Directory**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Purpose**: Understand the existing Next.js + Supabase application architecture, patterns, and conventions.

**What to Study**:

- **API Routes** (`src/app/api/**/route.ts`):
  - Authentication patterns using `requireAuth()`
  - Response format: `{ success: true, data: ... }` or `{ error: '...', details: ... }`
  - Error handling and rollback logic
  - Supabase client usage: **CRITICAL** - Always use `await createServerSupabaseClient()`
  - RLS enforcement patterns
  - Zod validation schemas

- **React Hooks** (`src/hooks/*.ts`):
  - React Query patterns (`useQuery`, `useMutation`)
  - **CRITICAL**: Project uses React Query v5 (`@tanstack/react-query@^5.90.5`)
  - Cache invalidation strategies (`invalidateQueries`)
  - **CRITICAL**: Toast notifications use `sonner` library (NOT custom `use-toast` hook)
  - Error handling in hooks
  - TypeScript typing conventions
  - Debouncing patterns (`useDebounce`)

- **UI Components** (`src/components/**/*.tsx`):
  - Shadcn/ui component library usage
  - Tailwind CSS styling conventions
  - Loading states and skeletons
  - Empty states and error states
  - Responsive design patterns
  - Interactive form controls (sliders, selects)

- **Services** (`src/services/**/*.ts`):
  - Business logic separation
  - Service layer patterns
  - External API integrations (Claude API)
  - File upload/download handling

- **Types** (`src/lib/types/**/*.ts`):
  - TypeScript interface conventions
  - Zod schema validation patterns
  - Type inference from Zod schemas
  - Enum definitions

- **Supabase Integration** (`src/lib/supabase-*.ts`):
  - Server client creation: **ALWAYS use `await createServerSupabaseClient()`**
  - Admin client for privileged operations
  - Authentication helpers
  - Storage operations (presigned URLs)

**Time Investment**: 4-5 hours (this is critical - don't rush)

**Why This Matters**: Every new feature must follow these established patterns. Inconsistency causes build failures (as we just experienced).

---

#### 2. Section E01 Specification & Implementation

**Files to Read**:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E01-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\E01_IMPLEMENTATION_COMPLETE.md`

**Purpose**: Understand the database schema and types that all subsequent sections build upon.

**Key Points**:
- Database schema (6 tables): datasets, training_jobs, metrics_points, model_artifacts, cost_records, notifications
- TypeScript types in `src/lib/types/lora-training.ts`
- Storage buckets: `lora-datasets` (Private, 500MB limit)
- RLS policies for user isolation

**Time Investment**: 1-2 hours

---

#### 3. Section E02 Specification & Implementation

**Files to Read**:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E02-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\E02_IMPLEMENTATION_SUMMARY.md`

**Purpose**: Understand the dataset management system that Section E03 builds upon.

**Key Points**:
- Dataset upload flow with presigned URLs
- Edge Function for background validation
- API endpoints: POST /api/datasets, GET /api/datasets, POST /api/datasets/[id]/confirm
- React hooks: use-datasets.ts

**Time Investment**: 2 hours

---

#### 4. Section E03 Specification & Implementation (JUST DEPLOYED)

**Files to Read**:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E03-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\E03_IMPLEMENTATION_SUMMARY.md`
- **THIS DOCUMENT** - Contains critical bug fixes applied

**Purpose**: Understand what was just implemented and debugged.

**Key Points**:
- Cost estimation system with GPU pricing
- Job creation system with validation
- Configuration UI with 3 presets
- **CRITICAL BUG FIXES** - Study the three bugs fixed in this document:
  1. Toast import pattern (sonner, not use-toast)
  2. Supabase client pattern (await createServerSupabaseClient)
  3. React Query v5 refetchInterval API (query.state.data)

**Code Files to Review**:
1. `src/app/api/jobs/estimate/route.ts` - **Study the await pattern**
2. `src/app/api/jobs/route.ts` - **Study the await pattern (2 places)**
3. `src/hooks/useTrainingConfig.ts` - **Study toast import and refetchInterval**
4. `src/app/(dashboard)/training/configure/page.tsx`

**Time Investment**: 3-4 hours

**Why This Matters**: These patterns prevent build failures. The three bugs we fixed are common mistakes to avoid.

---

#### 5. Section E03b Specification (Data Bridge - Optional Next Step)

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E03b-DATA-BRIDGE-execution-prompts.md`

**Purpose**: Understand the optional bridge between training files and datasets.

**Key Points**:
- Integration between training files (existing) and datasets (E02)
- Export training files directly to LoRA pipeline
- Skip manual JSONL download/upload

**Time Investment**: 1 hour

**⚠️ CRITICAL**: DO NOT implement. Only read for context.

---

#### 6. Section E04 Specification (Training Execution - Primary Next Step)

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E04-execution-prompts.md`

**Purpose**: Understand what the next major section will implement.

**Key Points**:
- Edge Function to process queued jobs
- Training simulation/execution logic
- Real-time progress updates
- Job monitoring UI with metrics visualization
- Job cancellation

**Time Investment**: 2 hours

**⚠️ CRITICAL**: DO NOT implement. Only read for context.

---

### PHASE B: STOP AND WAIT (MANDATORY)

**After completing Phase A (context internalization), you MUST STOP and WAIT for explicit human instructions.**

#### DO NOT Do Any of These Things:

- ❌ Start implementing Section E03b (Data Bridge)
- ❌ Start implementing Section E04 (Training Execution)
- ❌ Start implementing any new features
- ❌ Fix any bugs or issues you find
- ❌ Create any new files
- ❌ Modify any existing files
- ❌ Run any scripts or commands
- ❌ Generate any code
- ❌ Make suggestions or recommendations
- ❌ Deploy anything to Vercel or Supabase
- ❌ "Improve" or "optimize" existing code
- ❌ Test the implementation
- ❌ Refactor any code
- ❌ Add comments or documentation
- ❌ Update dependencies
- ❌ Configure anything in Supabase Dashboard
- ❌ Deploy Edge Functions
- ❌ Set up cron jobs

#### ONLY Do These Things:

- ✅ Read all files listed in Phase A
- ✅ Understand the codebase patterns in `src/`
- ✅ **STUDY THE BUG FIXES** in this document (toast, await, refetchInterval)
- ✅ Understand Section E01 (database foundation)
- ✅ Understand Section E02 (dataset management)
- ✅ Understand Section E03 (training configuration - JUST DEPLOYED)
- ✅ Understand Section E03b specification (data bridge - optional)
- ✅ Understand Section E04 specification (training execution - primary next)
- ✅ Understand deployment process for Vercel + Supabase
- ✅ Understand testing approaches
- ✅ Take notes on what you learned (mentally)
- ✅ Form questions for the human (if any)
- ✅ Confirm context internalization is complete
- ✅ **WAIT** for human to provide specific instructions

#### When Context Internalization is Complete:

Simply respond with:

```
Context internalization complete.

I have read and understood:
- Production codebase (src/ directory)
- Section E01 database foundation
- Section E02 dataset management implementation
- Section E03 training configuration implementation and bug fixes (DEPLOYED)
- Section E03b data bridge specification (optional - not implementing yet)
- Section E04 training execution specification (primary next - not implementing yet)
- Deployment process for Vercel + Supabase
- Testing methodologies

CRITICAL PATTERNS LEARNED:
1. Toast notifications: Always use `import { toast } from 'sonner'`
2. Supabase client: Always use `await createServerSupabaseClient()`
3. React Query v5: refetchInterval callback receives `query` object, access data via `query.state.data`

Waiting for human instructions on what to do next.

Total time invested in context internalization: ~17-21 hours
```

**Do NOT**:
- Make suggestions about what to do next
- Ask "Would you like me to..." questions
- Propose improvements or fixes
- Start analyzing code for issues

**Simply WAIT** for the human to tell you explicitly what task to perform next.

---

### Total Context Internalization Time: ~17-21 hours

This is intentional and necessary. Rushing through context leads to:
- Inconsistent code patterns (as we saw with toast import)
- Breaking existing functionality (as we saw with missing await)
- Misunderstanding API versions (as we saw with React Query v5)
- Build failures requiring debugging sessions
- Needing to redo work later

**Take your time. Read carefully. Understand deeply. Study the bug fixes.**

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

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

```bash
# Query conversations (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check schema (Deep Introspection)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversations',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Verify datasets table (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);console.log('Policies:',r.tables[0].policies.length);}})();"

# Query datasets (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,total_training_pairs',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Verify training_jobs table (Section E03)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,preset_id,progress,total_steps,estimated_total_cost',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.preset_id));})();"

# Verify notifications table (Section E03)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'notifications',select:'type,title,message,created_at',where:[{column:'type',operator:'eq',value:'job_queued'}],orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Job queued notifications:',r.data.length);r.data.forEach(n=>console.log('-',n.title));})();"
```

### Common Queries

**Check conversations (specific columns, with filtering)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',select:'id,conversation_id,enrichment_status,title',where:[{column:'enrichment_status',operator:'eq',value:'completed'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Success:',r.success,'Count:',r.data.length);r.data.forEach(c=>console.log('-',c.conversation_id.slice(0,8),'/',c.enrichment_status));})();"
```

**Check training files**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_files',select:'id,name,conversation_count,total_training_pairs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Files:',r.data.length);r.data.forEach(f=>console.log('-',f.name,'(',f.conversation_count,'convs)'));})();"
```

**Check prompt templates (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'prompt_templates',select:'template_name,tier,emotional_arc_type',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case templates:',r.data.length);r.data.forEach(t=>console.log('-',t.template_name));})();"
```

**Check emotional arcs (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'emotional_arcs',select:'arc_key,name,tier',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case arcs:',r.data.length);r.data.forEach(a=>console.log('-',a.arc_key,'→',a.name));})();"
```

### SAOL Parameter Formats (Both Work)

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: ['template_name', 'tier', 'emotional_arc_type'],  // Array
  where: [{ column: 'tier', operator: 'eq', value: 'edge_case' }],  // where + column
  orderBy: [{ column: 'created_at', asc: false }]
});
```

**Backward Compatible Format**:
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: 'template_name,tier,emotional_arc_type',  // String
  filters: [{ field: 'tier', operator: 'eq', value: 'edge_case' }],  // filters + field
  orderBy: [{ column: 'created_at', asc: false }]
});
```

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment process for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw (minimal) and enriched (complete) JSON formats
6. **LoRA Training Pipeline** (NEW):
   - **Section E01 (DEPLOYED)**: Database foundation with 6 tables, RLS policies
   - **Section E02 (DEPLOYED)**: Dataset upload with presigned URLs (up to 500MB), background validation, dataset management
   - **Section E03 (DEPLOYED)**: Training job configuration with presets, cost estimation, job creation
   - **Section E03b (NOT STARTED)**: Data bridge between training files and datasets
   - **Section E04 (NOT STARTED)**: Training execution, real-time monitoring, job management

### Core Workflow

```
User → Generate Conversation → Claude API → Raw JSON Stored →
Enrichment Pipeline (5 stages) → Enriched JSON Stored →
Dashboard View → Download (Raw or Enriched) → Combine Multiple JSON files into a full training file →
[E02] Upload to LoRA Pipeline → Validate Dataset →
[E03] Configure Training Job (Presets + Cost Estimation) → Create Job (status='queued') →
[E04] Execute Training → Monitor Progress → Download Trained Model
```

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (buckets: conversation-files, training-files, lora-datasets)
- **AI**: Claude API (Anthropic) - `claude-sonnet-4-5-20250929`
- **Structured Outputs**: `anthropic-beta: structured-outputs-2025-11-13`
- **UI**: Shadcn/UI + Tailwind CSS
- **State Management**: React Query v5 (TanStack Query) - `@tanstack/react-query@^5.90.5`
- **Notifications**: Sonner (`sonner` library for toast notifications)
- **Deployment**: Vercel (frontend + API routes)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)

### Production Pipeline (SECTIONS E01-E03 COMPLETE)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCAFFOLDING SELECTION                                    │
│    - Personas, Emotional Arcs, Training Topics              │
│    → Stored in database tables                              │
│    ✅ Working for all tiers                                 │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CONVERSATION GENERATION (Claude API)                     │
│    → conversation-generation-service.ts                     │
│    → Output: Raw JSON with turns[]                          │
│    → Stored in: conversation-files/{userId}/{id}/raw.json   │
│    ✅ Working for ALL tiers (template + edge_case)          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ENRICHMENT (Metadata Addition)                           │
│    → enrichment-pipeline-orchestrator.ts                    │
│    → conversation-enrichment-service.ts                     │
│    → Output: Enriched JSON with training_pairs[]            │
│    → Stored in: conversation-files/{userId}/{id}/enriched.json│
│    ✅ Working                                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. TRAINING FILE AGGREGATION                                │
│    → training-file-service.ts                               │
│    → Combines multiple enriched files into one              │
│    → Output: Full JSON + JSONL in brightrun-lora-v4 format  │
│    → Stored in: training-files/{fileId}/training.json       │
│    ✅ Working (create + add conversations)                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. LORA DATASET MANAGEMENT (Section E02)                    │
│    → POST /api/datasets (create + presigned URL)            │
│    → Upload to lora-datasets bucket (direct S3)             │
│    → POST /api/datasets/[id]/confirm (trigger validation)   │
│    → Edge Function: validate-datasets (background)          │
│    → Output: Validated dataset with statistics              │
│    ✅ Deployed to production (December 26, 2025)            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. TRAINING JOB CONFIGURATION (Section E03)                 │
│    → POST /api/jobs/estimate (cost calculation)             │
│    → POST /api/jobs (create job with status='queued')       │
│    → GET /api/jobs (list jobs with pagination)              │
│    → /training/configure page (presets + real-time costs)   │
│    ✅ Deployed to production (December 27, 2025)            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DATA BRIDGE (Section E03b - Optional)                    │
│    → Export training files directly to datasets             │
│    → Skip manual JSONL download/upload                      │
│    ⏳ Not started (optional enhancement)                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. TRAINING EXECUTION & MONITORING (Section E04)            │
│    → Edge Function: process queued jobs                     │
│    → Real-time progress updates                             │
│    → Job monitoring UI                                      │
│    → Job cancellation                                       │
│    ⏳ To be implemented (primary next step)                 │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

**Core Tables** (Existing):
- `conversations` - Conversation metadata and status (has `id` PK and `conversation_id` business key)
- `training_files` - Aggregated training file metadata
- `training_file_conversations` - Junction table linking conversations to training files
- `personas` - Client personality profiles (3 active)
- `emotional_arcs` - Emotional progression patterns (10 total: 7 template, 3 edge_case)
- `training_topics` - Subject matter configuration (many active)
- `prompt_templates` - Generation templates (10 total: 7 template tier, 3 edge_case tier)
- `batch_jobs` - Batch generation job tracking
- `batch_items` - Individual items in batch jobs
- `failed_generations` - Failed generation error records

**LoRA Training Tables** (Section E01 - Deployed):
- `datasets` - Dataset metadata and validation results (23 columns, RLS enabled)
- `training_jobs` - Training job configuration and status tracking (Section E03 uses this)
- `metrics_points` - Training metrics time series (Section E04 will use this)
- `model_artifacts` - Trained model outputs and metadata (Section E04 will use this)
- `cost_records` - Training cost tracking (Section E04 will use this)
- `notifications` - User notifications (Section E03 creates these)

---

**Last Updated**: December 27, 2025  
**Session Focus**: Section E03 - Bug Fixes & Deployment to Production  
**Current State**: E03 deployed and live on Vercel production  
**Document Version**: e03-deployed (Section E03 Deployed with Bug Fixes)  
**Next Phase**: Context internalization by next agent, then wait for implementation instructions (likely Section E03b Data Bridge or Section E04 Training Execution)  
**Implementation Commits**: Committed and deployed to production  
**Build Status**: ✅ Passing (0 TypeScript errors, successful Vercel deployment)
