# PIPELINE - Section E03: Training Configuration - Execution Prompts

**Product:** PIPELINE  
**Section:** 3 - Training Configuration  
**Generated:** December 26, 2025  
**Total Prompts:** 1  
**Estimated Total Time:** 10 hours  
**Source Section File:** 04f-pipeline-build-section-E03.md

---

## Section Overview

Enable users to configure training jobs with hyperparameter presets, advanced settings, and GPU selection.

**User Value**: Users can easily configure training parameters using presets or customize advanced settings with real-time cost estimates

**Implementation Approach**: This section builds upon the dataset management system from Section E02, adding:
- Cost estimation API with GPU pricing and training duration calculation
- Training job creation API with dataset validation
- Interactive configuration UI with preset selection and custom hyperparameters
- Real-time cost updates with debouncing

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Training Configuration System** (10h)
   - Features: FR-3.1 (Cost Estimation), FR-3.2 (Job Creation), FR-3.3 (Configuration UI)
   - Key Deliverables:
     - API route: POST /api/jobs/estimate (cost calculation)
     - API route: POST /api/jobs (job creation with validation)
     - API route: GET /api/jobs (list jobs)
     - React hooks: useEstimateCost, useCreateTrainingJob, useTrainingJobs, useTrainingJob
     - Page: /training/configure (full configuration form)
     - Preset configurations (Fast, Balanced, Quality)

---

## Integration Context

### Dependencies from Previous Sections

**From Section E01 (Foundation & Authentication):**
- Database tables: `lora_training_jobs` table with full schema
- Database tables: `lora_datasets` table for validation checks
- Database tables: `lora_notifications` table for user notifications
- TypeScript types: `TrainingJob`, `JobStatus`, `HyperparameterConfig` from `@/lib/types/lora-training`
- Auth infrastructure: `requireAuth()` from `@/lib/supabase-server`

**From Section E02 (Dataset Management):**
- Dataset validation system - Only ready datasets can be used for training
- Dataset statistics (total_training_pairs, total_tokens) - Used for cost/duration estimation
- Dataset API for querying available datasets
- Dataset status checks (training_ready=true, status='ready')

### Provides for Next Sections

**For Section E04 (Training Execution):**
- Training job records in database with status='queued'
- Job configuration (hyperparameters, GPU config)
- Cost estimates for tracking
- Job listing API for monitoring

**For Section E05 (Job Monitoring):**
- Job creation flow
- Real-time job status tracking infrastructure
- Job details API endpoint

---

## Dependency Flow (This Section)

```
E01 (Database Schema) + E02 (Dataset Management)
  ↓
E03-P01 (Cost Estimation API)
  ↓
E03-P01 (Job Creation API)
  ↓
E03-P01 (Configuration UI with Presets)
```

**Note:** All features in a single prompt since they form a tightly coupled vertical slice (10 hours total).

---

# PROMPT 1: Training Configuration System

**Generated:** December 26, 2025  
**Section:** 3 - Training Configuration  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 10 hours  
**Prerequisites:** Section E01 complete (database schema, types), Section E02 complete (dataset management)

---

## 🎯 Mission Statement

Implement a complete training job configuration system that allows users to select datasets, configure training parameters using intuitive presets, customize advanced hyperparameters, select GPU configurations, and view real-time cost estimates before starting training. This system provides the critical interface between dataset management and training execution, ensuring users can make informed decisions about their training jobs.

---

## 📦 Section Context

### This Section's Goal

Enable users to configure training jobs with hyperparameter presets, advanced settings, and GPU selection. Users should be able to:
- Select from 3 preset configurations (Fast, Balanced, Quality)
- Customize all hyperparameters with interactive sliders
- Select GPU type and count (1-8 GPUs)
- View real-time cost estimates with duration and breakdown
- Create training jobs that are queued for processing
- List and filter their training jobs

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E03. It implements:
- **FR-3.1**: Cost Estimation API (GPU pricing, training duration calculation)
- **FR-3.2**: Training Job Creation API (with dataset validation)
- **FR-3.3**: Training Configuration Page (presets, custom settings, real-time updates)

---

## 🔗 Integration with Previous Work

### From Previous Sections

#### Section E01: Foundation & Authentication

**Database Tables We'll Use:**

- `lora_training_jobs` table - Full schema created in E01
  - Columns: id, user_id, dataset_id, preset_id, hyperparameters (JSONB), gpu_config (JSONB), status, current_stage, progress, current_epoch, total_epochs, current_step, total_steps, current_metrics, queued_at, started_at, completed_at, estimated_total_cost, current_cost, etc.
  - We'll INSERT new job records with status='queued'
  - We'll SELECT for listing jobs with pagination

- `lora_datasets` table - For validation
  - Columns: id, name, status, training_ready, total_training_pairs, total_tokens
  - We'll SELECT to verify dataset exists and is ready (training_ready=true, status='ready')
  - We'll use statistics for cost/duration estimation

- `lora_notifications` table - For user notifications
  - We'll INSERT notification when job is queued

**TypeScript Types We'll Reuse:**
- `TrainingJob` interface from `@/lib/types/lora-training.ts`
- `JobStatus` type: 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled'
- `HyperparameterConfig` interface
- `GPUConfig` interface
- `PresetId` type: 'fast' | 'balanced' | 'quality' | 'custom'

**Authentication Functions We'll Import:**
- `requireAuth()` from `@/lib/supabase-server` - Protects API routes
- `createServerSupabaseClient()` from `@/lib/supabase-server` - Database queries

#### Section E02: Dataset Management

**APIs We'll Call:**
- We'll query `lora_datasets` table to validate dataset readiness
- We'll use dataset statistics (total_training_pairs, total_tokens) for estimation

**Data We'll Validate:**
- Dataset must exist and belong to user
- Dataset must have status='ready'
- Dataset must have training_ready=true
- Dataset must have valid total_training_pairs

### From Previous Prompts (This Section)

This is the first prompt in Section E03. No previous prompts in this section.

---

## 🔍 Supabase Agent Ops Library (SAOL) - Database Operations Tool

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### ⚠️ CRITICAL: Use SAOL for ALL Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations in this prompt.**  
Do not use raw `supabase-js` or manual PostgreSQL scripts for database verification or testing. SAOL is safe, robust, and handles edge cases automatically.

### What is SAOL?

SAOL is a tested, production-ready library for database operations that:
- ✅ Handles special characters and edge cases automatically
- ✅ Provides consistent error handling
- ✅ Includes deep schema introspection
- ✅ Works with Service Role Key for admin operations
- ✅ No manual SQL escaping required

**Library Location:** `supa-agent-ops/`  
**Documentation:** `supa-agent-ops/QUICK_START.md` (READ THIS FIRST)  
**Troubleshooting:** `supa-agent-ops/TROUBLESHOOTING.md`

---

### Setup & Prerequisites

**Installation Status:** ✅ Already available in project

**Environment Required:**
```bash
# Ensure these are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Key Rules:**
1. **Use Service Role Key:** SAOL operations require admin privileges
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data
3. **No Manual Escaping:** SAOL handles special characters automatically
4. **Parameter Flexibility:** Accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible)

---

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

#### Verify Tables Exist (After Migration)

```bash
# Check if datasets table exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.data.columns.map(c=>c.name).join(', '));}})();"

# Check all LoRA training tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t+':',r.success?'✅':'❌');}})();"
```

#### Query Tables (Verify Data)

```bash
# Check datasets table (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check datasets with specific columns and filtering
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,created_at',where:[{column:'status',operator:'eq',value:'ready'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Ready datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Check training_jobs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,progress,current_epoch,total_epochs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.progress+'%'));})();"
```

#### Deep Schema Introspection

```bash
# Get complete schema details for datasets table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Check RLS policies on datasets
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:',r.data.policies.length);}})();"
```

---

### SAOL API Reference (Quick)

#### agentQuery - Query Data

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: ['id', 'name', 'status', 'created_at'],  // Array or comma-separated string
  where: [
    { column: 'status', operator: 'eq', value: 'ready' },
    { column: 'training_ready', operator: 'eq', value: true }
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

**Backward Compatible Format:**
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: 'id,name,status,created_at',  // String
  filters: [  // 'filters' instead of 'where'
    { field: 'status', operator: 'eq', value: 'ready' }  // 'field' instead of 'column'
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

#### agentIntrospectSchema - Deep Schema Analysis

```javascript
const result = await saol.agentIntrospectSchema({
  table: 'datasets',
  transport: 'pg'  // Use PostgreSQL introspection (more detailed)
});

// Returns:
// {
//   success: true,
//   data: {
//     tableName: 'datasets',
//     columns: [...],
//     primaryKey: [...],
//     foreignKeys: [...],
//     indexes: [...],
//     rlsEnabled: true,
//     policies: [...]
//   }
// }
```

#### agentPreflight - Pre-Operation Check

```javascript
// Always run before mutations
const preflight = await saol.agentPreflight({
  table: 'datasets'
});

if (!preflight.success) {
  console.error('Preflight failed:', preflight.error);
  return;
}

// Proceed with operation...
```

---

### Common Use Cases for This Section

#### 1. Verify Migration Applied Successfully

```bash
# After running migration, verify all tables exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];console.log('Verifying migration...');for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log('✓',t,'-',r.success?'EXISTS':'MISSING');}})();"
```

#### 2. Check Table Structure

```bash
# Verify datasets table has correct columns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('Columns:');r.data.columns.forEach(c=>console.log('-',c.name,':',c.type));}})();"
```

#### 3. Verify RLS Policies

```bash
# Check RLS is enabled and policies exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:');r.data.policies.forEach(p=>console.log('-',p.name,'(',p.command,')'));}})();"
```

#### 4. Test Data Insertion

```bash
# Query to verify test data (after manual insert)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:1});console.log('Sample dataset:',JSON.stringify(r.data[0],null,2));})();"
```

---

### When to Use SAOL in This Prompt

Use SAOL commands for:

1. ✅ **After Migration** - Verify tables exist and have correct structure
2. ✅ **Database Verification** - Check data was inserted correctly
3. ✅ **Schema Validation** - Confirm columns, indexes, foreign keys
4. ✅ **RLS Testing** - Verify policies are enabled and working
5. ✅ **Debugging** - Query tables to understand data state

**Do NOT use SAOL for:**
- ❌ Running migrations (use `supabase migration up` or Dashboard)
- ❌ Creating storage buckets (use Dashboard)
- ❌ Application code (use regular Supabase client)

---

### Important Notes

1. **Service Role Key Required:** SAOL uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
2. **Read-Only Recommended:** Use SAOL primarily for verification, not mutations
3. **Path Matters:** Always `cd` to `supa-agent-ops/` directory before running commands
4. **Env File:** Ensure `.env.local` is in parent directory with correct variables
5. **Windows Paths:** Use forward slashes in paths: `c:/Users/james/...`

---


## 🎯 Implementation Requirements

### Feature FR-3.1: Cost Estimation API

**Type:** API Endpoint  
**Strategy:** EXTENSION - building on existing Supabase patterns

#### Description

Calculate estimated training cost based on GPU configuration, hyperparameters, and dataset size. The API performs sophisticated calculations including:
- Training duration based on dataset size and GPU throughput
- Per-GPU pricing for different GPU types
- Compute cost (hourly rate × estimated duration)
- Storage cost for model artifacts
- Total steps calculation for progress tracking

#### What Already Exists (Don't Rebuild)

- ✅ Supabase Auth infrastructure
- ✅ API route patterns and response formats
- ✅ `lora_datasets` table with statistics
- ✅ TypeScript validation with Zod

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/jobs/estimate/route.ts` - Cost estimation endpoint

#### Implementation Details

**File:** `src/app/api/jobs/estimate/route.ts`

**Endpoint:** `POST /api/jobs/estimate`

**Purpose:** Calculate training cost and duration based on configuration

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const EstimateRequestSchema = z.object({
  dataset_id: z.string().uuid(),
  gpu_config: z.object({
    type: z.enum(['A100-80GB', 'A100-40GB', 'H100', 'V100-32GB']),
    count: z.number().int().min(1).max(8),
  }),
  hyperparameters: z.object({
    batch_size: z.number().int().min(1).max(64),
    epochs: z.number().int().min(1).max(20),
    learning_rate: z.number().min(0.00001).max(0.001),
    rank: z.number().int().min(4).max(128),
  }),
});

/**
 * POST /api/jobs/estimate - Calculate cost estimate for training configuration
 * 
 * This endpoint calculates:
 * - Training duration based on dataset size and throughput
 * - Compute cost based on GPU pricing
 * - Storage cost for model artifacts
 * - Total estimated cost
 */
export async function POST(request: NextRequest) {
  try {
    // From Section E01 - authentication pattern
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse and validate request
    const body = await request.json();
    const validation = EstimateRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, gpu_config, hyperparameters } = validation.data;

    const supabase = createServerSupabaseClient();

    // From Section E02 - fetch dataset statistics for accurate duration estimation
    const { data: dataset, error: datasetError } = await supabase
      .from('lora_datasets')
      .select('total_training_pairs, total_tokens, name')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    // GPU pricing configuration (per hour, per GPU)
    const GPU_PRICING: Record<string, number> = {
      'A100-80GB': 3.50,
      'A100-40GB': 2.80,
      'H100': 4.20,
      'V100-32GB': 2.10,
    };

    // GPU throughput (tokens per second per GPU)
    const GPU_THROUGHPUT: Record<string, number> = {
      'A100-80GB': 1800,
      'A100-40GB': 1500,
      'H100': 2200,
      'V100-32GB': 1200,
    };

    const pricePerGpu = GPU_PRICING[gpu_config.type];
    const throughputPerGpu = GPU_THROUGHPUT[gpu_config.type];
    const hourlyRate = pricePerGpu * gpu_config.count;
    const totalThroughput = throughputPerGpu * gpu_config.count;

    // Calculate training duration
    const trainingPairs = dataset.total_training_pairs || 1000;
    const totalTokens = dataset.total_tokens || trainingPairs * 200;
    
    // Steps calculation
    const stepsPerEpoch = Math.ceil(trainingPairs / hyperparameters.batch_size);
    const totalSteps = stepsPerEpoch * hyperparameters.epochs;
    
    // Time calculation
    const avgTokensPerStep = (totalTokens / trainingPairs) * hyperparameters.batch_size;
    const secondsPerStep = avgTokensPerStep / totalThroughput;
    const totalTrainingSeconds = totalSteps * secondsPerStep;
    
    // Add overhead: initialization (10 min), validation between epochs (5 min/epoch), final save (5 min)
    const overheadSeconds = (10 * 60) + (hyperparameters.epochs * 5 * 60) + (5 * 60);
    const totalSeconds = totalTrainingSeconds + overheadSeconds;
    const estimatedHours = totalSeconds / 3600;

    // Cost calculation
    const computeCost = hourlyRate * estimatedHours;
    const storageCost = 0.50; // Model artifacts storage (~2-5GB in Supabase Storage)
    const totalCost = computeCost + storageCost;

    return NextResponse.json({
      success: true,
      data: {
        estimated_cost: parseFloat(totalCost.toFixed(2)),
        cost_breakdown: {
          compute: parseFloat(computeCost.toFixed(2)),
          storage: storageCost,
        },
        estimated_duration_hours: parseFloat(estimatedHours.toFixed(2)),
        hourly_rate: parseFloat(hourlyRate.toFixed(2)),
        training_details: {
          total_steps: totalSteps,
          steps_per_epoch: stepsPerEpoch,
          estimated_throughput_tokens_per_sec: totalThroughput,
          dataset_name: dataset.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate cost', details: error.message },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Uses `requireAuth()` from Section E01
- Queries `lora_datasets` from Section E02 for statistics
- Sophisticated duration calculation based on throughput and overhead
- GPU pricing and throughput configuration
- Returns detailed breakdown for UI display
- Follows existing API response format

---

### Feature FR-3.2: Training Job Creation API

**Type:** API Endpoint  
**Strategy:** EXTENSION - building on existing Supabase patterns

#### Description

Create training job record with validated configuration and queue for processing. Validates that the dataset is ready, calculates total steps for progress tracking, creates the job record with status='queued', and sends a notification to the user.

#### What Already Exists (Don't Rebuild)

- ✅ `lora_training_jobs` table (Section E01)
- ✅ `lora_datasets` table (Section E01)
- ✅ `lora_notifications` table (Section E01)
- ✅ Authentication system

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/jobs/route.ts` - Job creation and listing endpoints

#### Implementation Details

**File:** `src/app/api/jobs/route.ts`

**Endpoints:**
- `POST /api/jobs` - Create new training job
- `GET /api/jobs` - List user's training jobs

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Create job validation schema
const CreateJobSchema = z.object({
  dataset_id: z.string().uuid(),
  preset_id: z.enum(['fast', 'balanced', 'quality', 'custom']),
  gpu_config: z.object({
    type: z.string(),
    count: z.number().int().min(1).max(8),
  }),
  hyperparameters: z.object({
    learning_rate: z.number(),
    batch_size: z.number().int(),
    epochs: z.number().int(),
    rank: z.number().int(),
    alpha: z.number().optional(),
    dropout: z.number().optional(),
  }),
  estimated_cost: z.number(),
});

/**
 * POST /api/jobs - Create new training job
 * 
 * Flow:
 * 1. Validate dataset is ready
 * 2. Calculate total steps for progress tracking
 * 3. Create job record with status='queued'
 * 4. Edge Function (Section 4) will pick up and process
 */
export async function POST(request: NextRequest) {
  try {
    // From Section E01 - authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const validation = CreateJobSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, preset_id, gpu_config, hyperparameters, estimated_cost } = validation.data;

    const supabase = createServerSupabaseClient();

    // From Section E02 - verify dataset exists, belongs to user, and is ready for training
    const { data: dataset, error: datasetError } = await supabase
      .from('lora_datasets')
      .select('id, name, training_ready, status, total_training_pairs')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    if (!dataset.training_ready || dataset.status !== 'ready') {
      return NextResponse.json(
        { 
          error: 'Dataset not ready for training',
          details: `Dataset must have status='ready' and training_ready=true. Current: status='${dataset.status}', training_ready=${dataset.training_ready}`
        },
        { status: 400 }
      );
    }

    // Calculate total steps for accurate progress tracking
    const stepsPerEpoch = Math.ceil((dataset.total_training_pairs || 1000) / hyperparameters.batch_size);
    const totalSteps = stepsPerEpoch * hyperparameters.epochs;

    // From Section E01 - create training job record
    const { data: job, error: jobError } = await supabase
      .from('lora_training_jobs')
      .insert({
        user_id: user.id,
        dataset_id,
        preset_id,
        status: 'queued',
        current_stage: 'queued',
        progress: 0,
        current_epoch: 0,
        total_epochs: hyperparameters.epochs,
        current_step: 0,
        total_steps: totalSteps,
        gpu_config,
        hyperparameters,
        estimated_total_cost: estimated_cost,
        current_cost: 0,
        current_metrics: {},
        queued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json(
        { error: 'Failed to create training job', details: jobError.message },
        { status: 500 }
      );
    }

    // From Section E01 - create notification for user
    await supabase.from('lora_notifications').insert({
      user_id: user.id,
      type: 'job_queued',
      title: 'Training Job Queued',
      message: `Your training job for "${dataset.name}" has been queued and will start shortly`,
      priority: 'low',
      action_url: `/training/jobs/${job.id}`,
      metadata: { job_id: job.id, dataset_name: dataset.name },
    });

    // Note: Edge Function (Section 4) will poll for queued jobs and process them
    // Status progression: queued → initializing → running → completed/failed

    return NextResponse.json({
      success: true,
      data: job,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create job', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs - List user's training jobs with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // From Section E01 - authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query with dataset join
    let query = supabase
      .from('lora_training_jobs')
      .select(`
        *,
        dataset:lora_datasets(name, format, total_training_pairs)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply optional status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Validates dataset readiness before creating job
- Calculates total steps for progress tracking
- Creates notification for user
- Joins with dataset table for enriched job listing
- Supports pagination and status filtering
- Follows existing API patterns

---

### Feature FR-3.3: Training Configuration Page

**Type:** UI Page + React Hooks  
**Strategy:** EXTENSION - using existing shadcn/ui components and React Query

#### Description

Interactive form for configuring training jobs with preset selection, custom hyperparameters, and real-time cost estimation. Features three preset configurations (Fast, Balanced, Quality), interactive sliders for all hyperparameters, GPU type and count selection, and debounced real-time cost updates.

#### What Already Exists (Don't Rebuild)

- ✅ shadcn/ui components (Card, Slider, Select, Button, Label, Alert)
- ✅ React Query configured
- ✅ `useDebounce` hook from existing codebase
- ✅ Toast notifications (sonner)
- ✅ Page routing and layouts

#### What We're Building (New in This Prompt)

- 🆕 `src/hooks/useTrainingConfig.ts` - React Query hooks
- 🆕 `src/app/(dashboard)/training/configure/page.tsx` - Configuration page

#### Implementation Details

##### React Hooks

**File:** `src/hooks/useTrainingConfig.ts`

**Purpose:** React Query hooks for cost estimation and job creation

**Implementation:**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for cost estimation with debouncing
 */
export function useEstimateCost() {
  return useMutation({
    mutationFn: async (config: {
      dataset_id: string;
      gpu_config: { type: string; count: number };
      hyperparameters: any;
    }) => {
      const response = await fetch('/api/jobs/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Cost estimation failed');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for creating training jobs
 */
export function useCreateTrainingJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Job creation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast({
        title: 'Success',
        description: 'Training job created and queued for processing',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for fetching training jobs with filters
 */
export function useTrainingJobs(params?: { 
  status?: string; 
  page?: number; 
  limit?: number;
}) {
  return useQuery({
    queryKey: ['training-jobs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/jobs?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch training jobs');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for fetching single job details
 */
export function useTrainingJob(jobId: string | null) {
  return useQuery({
    queryKey: ['training-job', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 5 seconds if job is active
      const status = data?.data?.status;
      return status === 'running' || status === 'queued' || status === 'initializing' 
        ? 5000 
        : false;
    },
  });
}
```

**Pattern Source:** Infrastructure Inventory Section 6 - Data Fetching

**Key Points:**
- Uses React Query (existing pattern)
- Mutation for cost estimation (allows re-triggering)
- Auto-invalidation on success
- Toast notifications for feedback
- Polling for active jobs

##### Configuration Page

**File:** `src/app/(dashboard)/training/configure/page.tsx`

**Purpose:** Full training configuration UI with presets and custom settings

**Implementation:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEstimateCost, useCreateTrainingJob } from '@/hooks/useTrainingConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, Info, Zap, Target, Crown, ArrowLeft } from 'lucide-react';

// Preset configurations
const PRESETS = {
  fast: {
    name: 'Fast',
    icon: Zap,
    description: 'Quick training for testing and iteration',
    details: 'Optimized for speed, suitable for testing',
    learning_rate: 0.0001,
    batch_size: 8,
    epochs: 1,
    rank: 8,
    alpha: 16,
    dropout: 0.05,
  },
  balanced: {
    name: 'Balanced',
    icon: Target,
    description: 'Recommended balance of quality and cost',
    details: 'Best for most use cases',
    learning_rate: 0.00005,
    batch_size: 4,
    epochs: 3,
    rank: 16,
    alpha: 32,
    dropout: 0.1,
  },
  quality: {
    name: 'Quality',
    icon: Crown,
    description: 'Maximum quality for production models',
    details: 'Slower and more expensive, but best results',
    learning_rate: 0.00003,
    batch_size: 2,
    epochs: 5,
    rank: 32,
    alpha: 64,
    dropout: 0.1,
  },
};

export default function TrainingConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('datasetId');

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('balanced');
  const [hyperparameters, setHyperparameters] = useState(PRESETS.balanced);
  const [gpuType, setGpuType] = useState('A100-80GB');
  const [gpuCount, setGpuCount] = useState(2);

  const estimateCost = useEstimateCost();
  const createJob = useCreateTrainingJob();

  // From existing codebase - debounce configuration changes to avoid excessive API calls
  const debouncedConfig = useDebounce(
    { 
      dataset_id: datasetId, 
      gpu_config: { type: gpuType, count: gpuCount }, 
      hyperparameters 
    },
    500
  );

  // Auto-estimate cost when configuration changes
  useEffect(() => {
    if (datasetId) {
      estimateCost.mutate(debouncedConfig);
    }
  }, [debouncedConfig, datasetId]);

  const handlePresetChange = (preset: keyof typeof PRESETS) => {
    setSelectedPreset(preset);
    setHyperparameters(PRESETS[preset]);
  };

  const handleSubmit = async () => {
    if (!datasetId) return;

    const result = await createJob.mutateAsync({
      dataset_id: datasetId,
      preset_id: selectedPreset,
      gpu_config: { type: gpuType, count: gpuCount },
      hyperparameters,
      estimated_cost: estimateCost.data?.data.estimated_cost || 0,
    });

    if (result.success) {
      router.push(`/training/jobs/${result.data.id}`);
    }
  };

  const costData = estimateCost.data;
  const isLoading = createJob.isPending;

  // Handle missing dataset ID
  if (!datasetId) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No dataset selected. Please select a dataset from the datasets page.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.push('/datasets')}>
                Go to Datasets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configure Training Job</h1>
          <p className="text-gray-600 mt-1">
            Select a preset or customize hyperparameters for your training
          </p>
        </div>
      </div>

      {/* Preset Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Training Preset</CardTitle>
          <CardDescription>
            Choose a pre-configured profile optimized for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PRESETS).map(([key, preset]) => {
              const Icon = preset.icon;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key as keyof typeof PRESETS)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPreset === key
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${
                      selectedPreset === key ? 'text-primary' : 'text-gray-500'
                    }`} />
                    <h3 className="font-semibold">{preset.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Learning Rate: {preset.learning_rate}</div>
                    <div>Batch: {preset.batch_size} | Epochs: {preset.epochs}</div>
                    <div>LoRA Rank: {preset.rank}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* GPU Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GPU Configuration</CardTitle>
          <CardDescription>
            Select GPU type and number of GPUs for training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>GPU Type</Label>
            <Select value={gpuType} onValueChange={setGpuType}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A100-80GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA A100 80GB</span>
                    <span className="text-xs text-gray-500">$3.50/hr • Best overall performance</span>
                  </div>
                </SelectItem>
                <SelectItem value="A100-40GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA A100 40GB</span>
                    <span className="text-xs text-gray-500">$2.80/hr • Good for smaller models</span>
                  </div>
                </SelectItem>
                <SelectItem value="H100">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA H100</span>
                    <span className="text-xs text-gray-500">$4.20/hr • Fastest available</span>
                  </div>
                </SelectItem>
                <SelectItem value="V100-32GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA V100 32GB</span>
                    <span className="text-xs text-gray-500">$2.10/hr • Budget option</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Number of GPUs</Label>
              <span className="text-sm font-medium">{gpuCount}</span>
            </div>
            <Slider
              value={[gpuCount]}
              onValueChange={(value) => setGpuCount(value[0])}
              min={1}
              max={8}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              More GPUs = faster training via data parallelism. 
              {gpuCount > 1 && ` Training will be ${gpuCount}x faster (approximately).`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Hyperparameters */}
      <Card>
        <CardHeader>
          <CardTitle>Hyperparameters</CardTitle>
          <CardDescription>
            Fine-tune training parameters (based on {PRESETS[selectedPreset].name} preset)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Learning Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Learning Rate</Label>
              <span className="text-sm font-medium">{hyperparameters.learning_rate.toFixed(5)}</span>
            </div>
            <Slider
              value={[hyperparameters.learning_rate * 100000]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, learning_rate: value[0] / 100000 })
              }
              min={1}
              max={20}
              step={0.1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Lower = more stable training, Higher = faster convergence (but risky)
            </p>
          </div>

          {/* Batch Size */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Batch Size</Label>
              <span className="text-sm font-medium">{hyperparameters.batch_size}</span>
            </div>
            <Slider
              value={[hyperparameters.batch_size]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, batch_size: value[0] })
              }
              min={1}
              max={16}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Larger batch = faster training but requires more memory
            </p>
          </div>

          {/* Epochs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Training Epochs</Label>
              <span className="text-sm font-medium">{hyperparameters.epochs}</span>
            </div>
            <Slider
              value={[hyperparameters.epochs]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, epochs: value[0] })
              }
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              More epochs = better learning, but with diminishing returns
            </p>
          </div>

          {/* LoRA Rank */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>LoRA Rank</Label>
              <span className="text-sm font-medium">{hyperparameters.rank}</span>
            </div>
            <Slider
              value={[hyperparameters.rank]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, rank: value[0] })
              }
              min={4}
              max={64}
              step={4}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Higher rank = more expressive adapter, but larger model size
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      {estimateCost.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              <span className="text-gray-600">Calculating cost estimate...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {costData && !estimateCost.isPending && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Cost Estimate</CardTitle>
            <CardDescription>
              Estimated cost for this training configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Compute Cost:</span>
                <span className="font-semibold">
                  ${costData.data.cost_breakdown.compute.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Storage Cost:</span>
                <span className="font-semibold">
                  ${costData.data.cost_breakdown.storage.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3 mt-3">
                <span>Total Estimated Cost:</span>
                <span className="text-primary">
                  ${costData.data.estimated_cost.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-gray-600">
                <div>
                  <div className="font-medium">Duration</div>
                  <div>{costData.data.estimated_duration_hours.toFixed(1)} hours</div>
                </div>
                <div>
                  <div className="font-medium">Hourly Rate</div>
                  <div>${costData.data.hourly_rate.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="font-medium">Total Steps</div>
                  <div>{costData.data.training_details.total_steps.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-medium">Throughput</div>
                  <div>{costData.data.training_details.estimated_throughput_tokens_per_sec.toLocaleString()} tok/s</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !datasetId || estimateCost.isPending}
          className="flex-1"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isLoading ? 'Creating Job...' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
}
```

**Pattern Source:** Infrastructure Inventory Section 5 - Components, Section 6 - Data Fetching

**Key Points:**
- Uses existing `useDebounce` hook for cost estimation
- Three preset configurations with icons
- Interactive sliders for all parameters
- Real-time cost updates (debounced to 500ms)
- GPU type selection with pricing info
- Comprehensive cost breakdown display
- Loading and error states
- Navigation integration

---

## ✅ Acceptance Criteria

### Functional Requirements

**FR-3.1: Cost Estimation API**
- [ ] POST /api/jobs/estimate endpoint works
- [ ] Validates request with Zod schema
- [ ] Fetches dataset statistics from database
- [ ] Calculates training duration based on throughput
- [ ] Includes overhead calculations (initialization, validation, save)
- [ ] Returns cost breakdown (compute + storage)
- [ ] Returns training details (steps, throughput, duration)
- [ ] Handles missing or inaccessible datasets

**FR-3.2: Training Job Creation API**
- [ ] POST /api/jobs endpoint works
- [ ] Validates dataset exists and belongs to user
- [ ] Validates dataset is ready (training_ready=true, status='ready')
- [ ] Calculates total steps for progress tracking
- [ ] Creates job record with status='queued'
- [ ] Creates notification for user
- [ ] GET /api/jobs endpoint works with pagination
- [ ] Status filtering works
- [ ] Dataset join works (enriched response)

**FR-3.3: Training Configuration UI**
- [ ] User can select from 3 presets (Fast, Balanced, Quality)
- [ ] Preset selection updates all hyperparameters immediately
- [ ] User can customize learning rate, batch size, epochs, rank
- [ ] User can select GPU type (4 options with pricing)
- [ ] User can select GPU count (1-8)
- [ ] Cost estimate updates automatically (debounced)
- [ ] Cost breakdown displays correctly
- [ ] Training details display (steps, duration, throughput)
- [ ] Form validates dataset ID before submission
- [ ] User redirected to job page after creation
- [ ] Loading states shown during operations
- [ ] Error handling with toast notifications

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All imports resolve correctly
- [ ] Follows existing patterns:
  - API response format: `{ success, data }` or `{ error, details }`
  - React Query hooks with proper cache invalidation
  - shadcn/ui components
  - Authentication with `requireAuth()`
- [ ] Zod validation schemas for API requests
- [ ] Proper error handling and logging

### Integration Requirements

- [ ] Successfully imports types from E01 (`TrainingJob`, `JobStatus`, etc.)
- [ ] Successfully queries `lora_training_jobs` table from E01
- [ ] Successfully queries `lora_datasets` table from E01
- [ ] Successfully inserts into `lora_notifications` table from E01
- [ ] Successfully uses `requireAuth()` from E01
- [ ] Successfully validates dataset readiness from E02
- [ ] Successfully uses dataset statistics from E02
- [ ] RLS policies enforced (users only see own data)

---

## 🧪 Testing & Validation

### Manual Testing Steps

#### 1. API Testing: Cost Estimation

```bash
# Test cost estimation
curl -X POST http://localhost:3000/api/jobs/estimate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "dataset_id": "uuid-of-ready-dataset",
    "gpu_config": {
      "type": "A100-80GB",
      "count": 2
    },
    "hyperparameters": {
      "batch_size": 4,
      "epochs": 3,
      "learning_rate": 0.00005,
      "rank": 16
    }
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "estimated_cost": 25.50,
#     "cost_breakdown": { "compute": 25.00, "storage": 0.50 },
#     "estimated_duration_hours": 3.57,
#     "hourly_rate": 7.00,
#     "training_details": { ... }
#   }
# }
```

#### 2. API Testing: Job Creation

```bash
# Test job creation
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "dataset_id": "uuid-of-ready-dataset",
    "preset_id": "balanced",
    "gpu_config": { "type": "A100-80GB", "count": 2 },
    "hyperparameters": {
      "learning_rate": 0.00005,
      "batch_size": 4,
      "epochs": 3,
      "rank": 16,
      "alpha": 32,
      "dropout": 0.1
    },
    "estimated_cost": 25.50
  }'

# Expected: Job created with status='queued'
```

#### 3. Database Verification

```sql
-- Verify job created
SELECT id, dataset_id, status, preset_id, estimated_total_cost, total_steps
FROM lora_training_jobs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: One row with status='queued'

-- Verify notification created
SELECT type, title, message
FROM lora_notifications
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: type='job_queued'
```

#### 4. UI Testing: Configuration Page

1. Navigate to: `http://localhost:3000/training/configure?datasetId=<uuid>`
2. Expected behavior:
   - Page loads with Balanced preset selected
   - All sliders at default values
   - GPU type selector shows A100-80GB
   - GPU count slider shows 2
   - Cost estimate calculates automatically
3. Verify:
   - Click Fast preset → all values update
   - Adjust learning rate slider → cost recalculates (debounced)
   - Change GPU count → cost recalculates
   - Cost breakdown displays compute + storage
   - Training details show steps, duration, throughput
4. Submit:
   - Click "Start Training"
   - Loading state shows
   - Success toast appears
   - Redirected to job page

#### 5. Integration Testing: Complete Flow

1. Start from datasets page
2. Click "Start Training" on ready dataset
3. Redirected to configuration page with datasetId
4. Select preset and adjust parameters
5. Verify cost updates in real-time
6. Submit job
7. Verify job appears in database
8. Verify notification created

### Expected Outputs

After completing this prompt, you should have:

- [ ] API route file: `src/app/api/jobs/estimate/route.ts` (POST handler)
- [ ] API route file: `src/app/api/jobs/route.ts` (POST, GET handlers)
- [ ] Hooks file: `src/hooks/useTrainingConfig.ts` (4 hooks)
- [ ] Page: `src/app/(dashboard)/training/configure/page.tsx`
- [ ] Application runs without errors
- [ ] All features testable and working
- [ ] Cost estimation accurate
- [ ] Job creation successful with all validations

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `src/app/api/jobs/estimate/route.ts` - Cost estimation API
- [ ] `src/app/api/jobs/route.ts` - Job creation and listing API
- [ ] `src/hooks/useTrainingConfig.ts` - React Query hooks for training
- [ ] `src/app/(dashboard)/training/configure/page.tsx` - Configuration page

### Existing Files Modified

None (all files are new in this section)

### Database Changes

No schema changes (using tables from E01)

**Operations:**
- SELECT from `lora_datasets` table (validate readiness, get statistics)
- INSERT into `lora_training_jobs` table
- SELECT from `lora_training_jobs` table (listing with pagination)
- INSERT into `lora_notifications` table

### API Endpoints

- [ ] `POST /api/jobs/estimate` - Calculate training cost and duration
- [ ] `POST /api/jobs` - Create training job
- [ ] `GET /api/jobs` - List training jobs with pagination and filters

### Components

None (uses existing shadcn/ui components)

### Pages

- [ ] `/training/configure` - Training configuration form

---

## 🔜 What's Next

### For Next Prompt in This Section

**Section Complete:** This is the final prompt in Section E03.

### For Next Section

**Next Section:** E04: Training Execution & Monitoring

The next section will build upon this section's deliverables:

**From This Section:**
- Training job records with status='queued' - Edge Function will process these
- Job configuration (hyperparameters, GPU config) - Used to initiate training
- Cost estimates - Tracked against actual costs during training
- Job listing API - Enhanced with real-time progress updates

**What Next Section Will Add:**
- Edge Function to process queued jobs
- Training simulation/execution logic
- Real-time progress updates (metrics, logs)
- Job monitoring UI with live updates
- Job cancellation functionality
- Final cost tracking and artifact storage

---

## ⚠️ Important Reminders

1. **Follow the Spec Exactly:** All code provided in this prompt comes from the integrated specification. Implement it as written.

2. **Reuse Existing Infrastructure:** Don't recreate what already exists. Import and use:
   - Database: Tables from Section E01 (`lora_training_jobs`, `lora_datasets`, `lora_notifications`)
   - Types: `TrainingJob`, `JobStatus`, `HyperparameterConfig` from `@/lib/types/lora-training`
   - Auth: `requireAuth()` from `@/lib/supabase-server`
   - Dataset validation from Section E02
   - Components: All shadcn/ui components from `@/components/ui/*`
   - Data fetching: React Query (already configured)
   - Utilities: `useDebounce` hook from existing codebase

3. **Integration Points:** When importing from previous work, add comments:
   ```typescript
   // From Section E01 - database schema
   import { TrainingJob, JobStatus } from '@/lib/types/lora-training';
   
   // From Section E01 - authentication
   import { requireAuth } from '@/lib/supabase-server';
   
   // From Section E02 - dataset validation
   // Verify dataset.training_ready and dataset.status
   ```

4. **Pattern Consistency:** Match existing patterns:
   - API responses: `{ success: true, data }` or `{ error, details }`
   - React Query: `staleTime: 30 * 1000` for queries
   - Toast notifications: `toast({ title, description })`
   - Component structure: Use shadcn/ui patterns
   - Validation: Zod schemas for API requests

5. **Cost Calculation Best Practices:**
   - GPU pricing should be configurable (consider moving to database/config)
   - Duration calculation includes overhead (initialization, validation, save)
   - Throughput estimates are approximations
   - Storage cost is fixed ($0.50 for model artifacts)
   - Round final costs to 2 decimal places

6. **UI Best Practices:**
   - Debounce cost estimation to 500ms to avoid excessive API calls
   - Show loading states during operations
   - Disable submit button while loading or if required data missing
   - Provide helpful error messages
   - Use icons for visual hierarchy (Zap, Target, Crown)
   - Display cost breakdown for transparency

7. **Don't Skip Steps:** Implement all features listed in this prompt before moving to the next section.

---

## 📚 Reference Materials

### Files from Previous Work

#### Section E01: Foundation & Authentication

**Database Schema:**
- Table: `lora_training_jobs` - Stores training job configuration and status
- Table: `lora_datasets` - Used for validation and statistics
- Table: `lora_notifications` - User notifications

**TypeScript Types:**
- `src/lib/types/lora-training.ts`:
  - `TrainingJob` interface
  - `JobStatus` type
  - `HyperparameterConfig` interface
  - `GPUConfig` interface
  - `PresetId` type

**Authentication:**
- `@/lib/supabase-server`:
  - `requireAuth()` - Protects API routes, returns user
  - `createServerSupabaseClient()` - For database queries

#### Section E02: Dataset Management

**Dataset Validation:**
- Check `training_ready=true`
- Check `status='ready'`
- Use `total_training_pairs` for step calculation
- Use `total_tokens` for duration estimation

### Infrastructure Patterns

**Authentication Pattern:**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
// user is now authenticated
```

**Database Query Pattern:**
```typescript
const supabase = createServerSupabaseClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```

**API Response Pattern:**
```typescript
// Success
return NextResponse.json({
  success: true,
  data: { ... }
});

// Error
return NextResponse.json({
  error: 'Error message',
  details: 'Detailed explanation'
}, { status: 400 });
```

**React Query Hook Pattern:**
```typescript
export function useExample() {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => { ... },
    staleTime: 30 * 1000,
  });
}
```

**Zod Validation Pattern:**
```typescript
const Schema = z.object({
  field: z.string().uuid(),
});

const validation = Schema.safeParse(body);
if (!validation.success) {
  return NextResponse.json({
    error: 'Validation error',
    details: validation.error.flatten().fieldErrors,
  }, { status: 400 });
}
```

---

**Ready to implement Section E03, Prompt P01!**

---

## Section Completion Checklist

After completing all prompts in this section:

- [ ] All 3 features implemented
  - [ ] FR-3.1: Cost Estimation API
  - [ ] FR-3.2: Training Job Creation API
  - [ ] FR-3.3: Training Configuration Page
- [ ] All files created/modified as specified
- [ ] All API endpoints tested and working
- [ ] Cost estimation accurate and performant
- [ ] Job creation validates dataset properly
- [ ] UI responsive and user-friendly
- [ ] Real-time cost updates working (debounced)
- [ ] Integration with E01 database tables verified
- [ ] Integration with E02 dataset validation verified
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Ready to proceed to Section E04 (Training Execution)

---

**End of Section E03 Execution Prompts**

