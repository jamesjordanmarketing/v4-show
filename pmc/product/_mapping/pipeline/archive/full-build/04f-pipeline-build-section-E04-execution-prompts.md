# PIPELINE - Section E04: Training Execution & Monitoring - Execution Prompts

**Product:** PIPELINE  
**Section:** 4 - Training Execution & Monitoring  
**Generated:** 2025-12-26  
**Total Prompts:** 1  
**Estimated Total Time:** 3-5 hours  
**Source Section File:** 04f-pipeline-build-section-E04.md

---

## Section Overview

Execute training jobs on GPU cluster and provide real-time progress monitoring with metrics visualization.

**User Value**: Real-time visibility into training progress with detailed metrics, loss curves, and cost tracking

**Implementation Strategy**: This section uses Supabase Edge Functions with Cron scheduling for background job processing (replacing BullMQ/Redis), and React Query polling for real-time UI updates (replacing Server-Sent Events).

---

## Prompt Sequence for This Section

This section has been divided into **1 comprehensive prompt**:

1. **Prompt P01: Training Execution & Real-Time Monitoring** (3-5h)
   - Features: FR-4.1, FR-4.4
   - Key Deliverables:
     - Edge Function: `process-training-jobs` (job processing and GPU cluster integration)
     - API Route: `/api/jobs/[jobId]` (job details endpoint)
     - API Route: `/api/jobs/[jobId]/cancel` (job cancellation)
     - Page: `/training/jobs/[jobId]` (real-time monitoring UI)
     - Hook: `useTrainingJob` (polling with auto-refresh)

---

## Integration Context

### Dependencies from Previous Sections

#### From Section E01: Foundation & Authentication
**Database Tables:**
- `lora_training_jobs` - Job records with status tracking, metrics, and progress fields
- `lora_datasets` - Dataset metadata for signed URL generation
- `lora_metrics_points` - Time-series metrics storage
- `lora_cost_records` - Cost tracking per job
- `lora_notifications` - User notifications for job events

**Storage:**
- `lora-datasets` bucket - For signed URL generation to pass dataset to GPU cluster

**Types:**
- `@/lib/types/lora-training` - TrainingJob, JobStatus, CurrentMetrics interfaces

#### From Section E02: Dataset Management
**Database Access:**
- Querying datasets table for `storage_path`, `storage_bucket`, `total_training_pairs`
- Generating signed URLs for dataset access by GPU cluster

#### From Section E03: Training Configuration
**Database Records:**
- Jobs created with `status='queued'` ready for processing
- Complete job configuration (hyperparameters, GPU config, cost estimates)

**API Integration:**
- Jobs list API for navigation between job monitor and jobs list

### Provides for Next Sections

**For Section E05 (Model Artifacts):**
- Completed jobs with `status='completed'` and `artifact_id` populated
- Job metadata for artifact creation (training summary, hyperparameters)

**For Section E06 (Cost & Billing):**
- Cost records created during job execution
- Final job costs in `lora_training_jobs.final_cost`

---

## Dependency Flow (This Section)

```
External System: GPU Cluster API
  ↓
E04-P01-Part1: Edge Function (Job Processor)
  - Polls for queued jobs
  - Submits to GPU cluster
  - Updates job status and metrics
  ↓
E04-P01-Part2: Job Details API & Cancel API
  - Serves job data with metrics
  - Allows job cancellation
  ↓
E04-P01-Part3: Training Monitor Page
  - Displays real-time progress
  - Shows metrics and loss curves
  - Auto-refreshes via polling
```

---

# PROMPT 1: Training Execution & Real-Time Monitoring

**Generated:** 2025-12-26  
**Section:** 4 - Training Execution & Monitoring  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 3-5 hours  
**Prerequisites:** Sections E01, E02, E03 complete

---

## 🎯 Mission Statement

Implement the complete training execution pipeline and real-time monitoring system. This prompt creates the background job processor that integrates with the GPU cluster, manages job lifecycle, tracks metrics, and provides a rich real-time monitoring interface with live metrics visualization. This is the core execution engine that transforms queued training configurations into running jobs with full observability.

---

## 📦 Section Context

### This Section's Goal

Execute training jobs on GPU cluster and provide real-time progress monitoring with metrics visualization. Enable users to see live training progress, loss curves, GPU metrics, and cost accumulation while jobs run.

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E04. It implements:
- **FR-4.1**: Job Processing Edge Function (background processing with GPU cluster integration)
- **FR-4.4**: Training Monitor Page (real-time UI with metrics visualization)

This prompt completes the entire section by building the full execution and monitoring stack.

---

## 🔗 Integration with Previous Work

### From Section E01: Foundation & Authentication

**Database Tables We'll Use:**
- `lora_training_jobs` - Query jobs with `status='queued'` and `status='running'`, update status, progress, metrics
- `lora_datasets` - Join to get dataset info and generate signed URLs for GPU cluster
- `lora_metrics_points` - Insert time-series metrics data from GPU cluster
- `lora_cost_records` - Insert cost tracking records as job progresses
- `lora_notifications` - Create notifications for job lifecycle events (started, completed, failed)

**Types We'll Import:**
- `TrainingJob` from `@/lib/types/lora-training` - Job interface
- `JobStatus` from `@/lib/types/lora-training` - Status type
- `CurrentMetrics` from `@/lib/types/lora-training` - Metrics interface

**Authentication Pattern:**
- `requireAuth()` from `@/lib/supabase-server` - For API routes
- `createServerSupabaseClient()` - For authenticated database queries
- `createServerSupabaseAdminClient()` - For Edge Function (service role)

### From Section E02: Dataset Management

**Storage Integration:**
- Use `supabase.storage.from('lora-datasets').createSignedUrl()` to generate 24-hour signed URLs
- Pass signed URLs to GPU cluster for dataset access during training
- Query dataset table for `storage_path`, `storage_bucket`, `total_training_pairs`

### From Section E03: Training Configuration

**Job Records:**
- Query jobs with `status='queued'` created by configuration flow
- Access job fields: `hyperparameters`, `gpu_config`, `dataset_id`, `estimated_total_cost`, `total_steps`

**API Integration:**
- Hook into existing `useTrainingJobs` hook from Section E03 for job list navigation
- Extend with new `useTrainingJob` hook for single job polling

### From Previous Prompts (This Section)

This is the first and only prompt in Section E04. No previous prompts in this section.

---

## 🎯 Implementation Requirements

### Feature FR-4.1: Job Processing Edge Function

**Type:** Background Processing  
**Strategy:** EXTENSION - using Supabase Edge Functions + Cron instead of BullMQ + Redis

#### Description

Poll for queued jobs, submit to GPU cluster, track progress, and update database with real-time metrics.

#### What Already Exists (Don't Rebuild)

- ✅ Database tables (`lora_training_jobs`, `lora_metrics_points`, etc.) from Section E01
- ✅ Supabase Storage for datasets from Section E02
- ✅ Job records with `status='queued'` from Section E03
- ✅ Supabase Edge Functions capability (environment infrastructure)

#### What We're Building (New in This Prompt)

- 🆕 `supabase/functions/process-training-jobs/index.ts` - Edge Function for job processing
- 🆕 GPU cluster integration logic (submit jobs, poll status, handle callbacks)
- 🆕 Metrics tracking and database updates
- 🆕 Cost calculation and recording
- 🆕 Job lifecycle management (queued → initializing → running → completed/failed)

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


#### Implementation Details

**Edge Function File:** `supabase/functions/process-training-jobs/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Process training jobs edge function
 * 
 * This function runs on a cron schedule (every 30 seconds) and:
 * 1. Finds jobs with status='queued'
 * 2. Submits them to the GPU cluster
 * 3. Updates status to 'initializing'
 * 4. Polls running jobs for progress updates
 * 5. Updates metrics and progress in database
 * 6. Handles job completion and errors
 */
Deno.serve(async (req) => {
  try {
    console.log('[JobProcessor] Starting job processing cycle');

    // Process queued jobs (submit to GPU cluster)
    await processQueuedJobs();

    // Update running jobs (poll GPU cluster for progress)
    await updateRunningJobs();

    return new Response(
      JSON.stringify({ success: true, message: 'Job processing cycle complete' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JobProcessor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process queued jobs - submit to GPU cluster
 */
async function processQueuedJobs() {
  // Fetch jobs waiting to be submitted
  const { data: queuedJobs, error } = await supabase
    .from('lora_training_jobs')
    .select(`
      *,
      dataset:lora_datasets(storage_path, storage_bucket, total_training_pairs)
    `)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5); // Process up to 5 jobs per cycle

  if (error) {
    console.error('[JobProcessor] Error fetching queued jobs:', error);
    return;
  }

  if (!queuedJobs || queuedJobs.length === 0) {
    console.log('[JobProcessor] No queued jobs to process');
    return;
  }

  console.log(`[JobProcessor] Processing ${queuedJobs.length} queued jobs`);

  for (const job of queuedJobs) {
    try {
      // Update status to initializing
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'initializing',
          current_stage: 'initializing',
        })
        .eq('id', job.id);

      // Get signed URL for dataset
      const { data: signedUrlData } = await supabase.storage
        .from(job.dataset.storage_bucket)
        .createSignedUrl(job.dataset.storage_path, 3600 * 24); // 24 hour expiry

      if (!signedUrlData) {
        throw new Error('Failed to generate dataset signed URL');
      }

      // Submit job to GPU cluster
      const gpuJobPayload = {
        job_id: job.id,
        dataset_url: signedUrlData.signedUrl,
        hyperparameters: {
          ...job.hyperparameters,
          base_model: 'mistralai/Mistral-7B-v0.1',
        },
        gpu_config: job.gpu_config,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/training-callback`,
      };

      const response = await fetch(`${GPU_CLUSTER_API_URL}/training/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
        },
        body: JSON.stringify(gpuJobPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GPU cluster submission failed: ${errorData}`);
      }

      const gpuJob = await response.json();

      // Update job with external ID and status
      await supabase
        .from('lora_training_jobs')
        .update({
          external_job_id: gpuJob.external_job_id,
          status: 'running',
          current_stage: 'training',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[JobProcessor] Job ${job.id} submitted to GPU cluster: ${gpuJob.external_job_id}`);

      // Create notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_started',
        title: 'Training Started',
        message: `Your training job has started on ${job.gpu_config.count}x ${job.gpu_config.type}`,
        priority: 'medium',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });

    } catch (error) {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, error);
      
      // Mark job as failed
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_stack: error.stack,
        })
        .eq('id', job.id);

      // Create error notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_failed',
        title: 'Training Failed',
        message: `Your training job failed to start: ${error.message}`,
        priority: 'high',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });
    }
  }
}

/**
 * Update running jobs - poll GPU cluster for progress
 */
async function updateRunningJobs() {
  // Fetch jobs currently running
  const { data: runningJobs, error } = await supabase
    .from('lora_training_jobs')
    .select('*')
    .in('status', ['running', 'initializing'])
    .not('external_job_id', 'is', null);

  if (error) {
    console.error('[JobProcessor] Error fetching running jobs:', error);
    return;
  }

  if (!runningJobs || runningJobs.length === 0) {
    console.log('[JobProcessor] No running jobs to update');
    return;
  }

  console.log(`[JobProcessor] Updating ${runningJobs.length} running jobs`);

  for (const job of runningJobs) {
    try {
      // Poll GPU cluster for job status
      const response = await fetch(
        `${GPU_CLUSTER_API_URL}/training/status/${job.external_job_id}`,
        {
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`[JobProcessor] Failed to get status for job ${job.id}`);
        continue;
      }

      const gpuJobStatus = await response.json();

      // Update job progress and metrics
      const updates: any = {
        progress: gpuJobStatus.progress || job.progress,
        current_epoch: gpuJobStatus.current_epoch || job.current_epoch,
        current_step: gpuJobStatus.current_step || job.current_step,
        current_stage: gpuJobStatus.stage || job.current_stage,
      };

      // Update current metrics if available
      if (gpuJobStatus.metrics) {
        updates.current_metrics = {
          training_loss: gpuJobStatus.metrics.training_loss,
          validation_loss: gpuJobStatus.metrics.validation_loss,
          learning_rate: gpuJobStatus.metrics.learning_rate,
          throughput: gpuJobStatus.metrics.throughput,
          gpu_utilization: gpuJobStatus.metrics.gpu_utilization,
        };

        // Store metrics point for historical tracking
        await supabase.from('lora_metrics_points').insert({
          job_id: job.id,
          epoch: gpuJobStatus.current_epoch,
          step: gpuJobStatus.current_step,
          training_loss: gpuJobStatus.metrics.training_loss,
          validation_loss: gpuJobStatus.metrics.validation_loss,
          learning_rate: gpuJobStatus.metrics.learning_rate,
          gradient_norm: gpuJobStatus.metrics.gradient_norm,
          throughput: gpuJobStatus.metrics.throughput,
          gpu_utilization: gpuJobStatus.metrics.gpu_utilization,
        });
      }

      // Calculate current cost
      if (job.started_at) {
        const startTime = new Date(job.started_at).getTime();
        const now = new Date().getTime();
        const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
        const hourlyRate = job.gpu_config.cost_per_gpu_hour * job.gpu_config.count;
        updates.current_cost = parseFloat((hourlyRate * hoursElapsed).toFixed(2));
      }

      // Handle job completion
      if (gpuJobStatus.status === 'completed') {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        updates.final_cost = updates.current_cost;
        updates.progress = 100;

        // Record final cost
        await supabase.from('lora_cost_records').insert({
          user_id: job.user_id,
          job_id: job.id,
          cost_type: 'training_compute',
          amount: updates.final_cost,
          details: {
            gpu_type: job.gpu_config.type,
            gpu_count: job.gpu_config.count,
            duration_hours: (new Date(updates.completed_at).getTime() - new Date(job.started_at).getTime()) / (1000 * 60 * 60),
          },
          billing_period: new Date().toISOString().split('T')[0],
        });

        // Create completion notification
        await supabase.from('lora_notifications').insert({
          user_id: job.user_id,
          type: 'job_completed',
          title: 'Training Complete',
          message: `Your training job finished successfully in ${updates.final_cost.toFixed(2)} USD`,
          priority: 'high',
          action_url: `/training/jobs/${job.id}`,
          metadata: { job_id: job.id, final_cost: updates.final_cost },
        });
      }

      // Handle job failure
      if (gpuJobStatus.status === 'failed') {
        updates.status = 'failed';
        updates.completed_at = new Date().toISOString();
        updates.error_message = gpuJobStatus.error_message || 'GPU cluster reported failure';
        updates.final_cost = updates.current_cost;

        // Create failure notification
        await supabase.from('lora_notifications').insert({
          user_id: job.user_id,
          type: 'job_failed',
          title: 'Training Failed',
          message: `Your training job failed: ${updates.error_message}`,
          priority: 'high',
          action_url: `/training/jobs/${job.id}`,
          metadata: { job_id: job.id },
        });
      }

      // Apply updates to job
      await supabase
        .from('lora_training_jobs')
        .update(updates)
        .eq('id', job.id);

      console.log(`[JobProcessor] Updated job ${job.id}: ${updates.status || job.status} - ${updates.progress}%`);

    } catch (error) {
      console.error(`[JobProcessor] Error updating job ${job.id}:`, error);
    }
  }
}
```

**Deployment:**
```bash
# Deploy edge function
supabase functions deploy process-training-jobs

# Set environment variables in Supabase Dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GPU_CLUSTER_API_URL=https://your-gpu-cluster.com
GPU_CLUSTER_API_KEY=your-gpu-api-key
```

**Cron Schedule Configuration:**
- Navigate to Supabase Dashboard → Edge Functions → Cron Jobs
- Function: `process-training-jobs`
- Schedule: `*/30 * * * * *` (every 30 seconds)
- Reason: Provides near-real-time updates without overwhelming the GPU cluster API

**Key Points:**
- Uses service role key for full database access (no RLS restrictions)
- Processes up to 5 queued jobs per cycle to avoid overwhelming system
- Generates 24-hour signed URLs for dataset access
- Polls GPU cluster for status updates on running jobs
- Inserts metrics points for historical tracking
- Calculates and updates costs in real-time
- Creates notifications for all job lifecycle events
- Handles errors gracefully with proper logging and notifications

---

### Feature FR-4.4: Training Monitor Page

**Type:** UI Page  
**Strategy:** EXTENSION - using React Query polling instead of Server-Sent Events (SSE)

#### Description

Real-time training monitor with live metrics, loss curves, and progress tracking.

#### What Already Exists (Don't Rebuild)

- ✅ shadcn/ui components (Card, Badge, Button, Progress, Alert, Tabs) from infrastructure
- ✅ Recharts library for visualization (from infrastructure inventory)
- ✅ React Query configured with polling support
- ✅ Database tables with metrics and job data

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/jobs/[jobId]/route.ts` - Job details API endpoint
- 🆕 `src/app/api/jobs/[jobId]/cancel/route.ts` - Job cancellation endpoint
- 🆕 `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` - Real-time monitor page
- 🆕 Updated `useTrainingJob` hook with polling logic (extends Section E03 hook)

#### Implementation Details

**API Route 1: Job Details**

**File:** `src/app/api/jobs/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/jobs/[jobId] - Get job details with metrics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();

    // Fetch job with dataset info
    const { data: job, error: jobError } = await supabase
      .from('lora_training_jobs')
      .select(`
        *,
        dataset:lora_datasets(id, name, format, total_training_pairs, total_tokens)
      `)
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch recent metrics (last 100 points for chart)
    const { data: metrics } = await supabase
      .from('lora_metrics_points')
      .select('*')
      .eq('job_id', params.jobId)
      .order('timestamp', { ascending: true })
      .limit(100);

    // Fetch cost records
    const { data: costRecords } = await supabase
      .from('lora_cost_records')
      .select('*')
      .eq('job_id', params.jobId)
      .order('recorded_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        job,
        metrics: metrics || [],
        cost_records: costRecords || [],
      },
    });
  } catch (error: any) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details', details: error.message },
      { status: 500 }
    );
  }
}
```

**API Route 2: Job Cancellation**

**File:** `src/app/api/jobs/[jobId]/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/jobs/[jobId]/cancel - Cancel running job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('lora_training_jobs')
      .select('*')
      .eq('id', params.jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Check if job can be cancelled
    if (!['queued', 'initializing', 'running'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled', details: `Job status is '${job.status}'` },
        { status: 400 }
      );
    }

    // If job has external ID, call GPU cluster to cancel
    if (job.external_job_id) {
      const GPU_CLUSTER_API_URL = process.env.GPU_CLUSTER_API_URL;
      const GPU_CLUSTER_API_KEY = process.env.GPU_CLUSTER_API_KEY;

      const cancelResponse = await fetch(
        `${GPU_CLUSTER_API_URL}/training/cancel/${job.external_job_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!cancelResponse.ok) {
        console.error('GPU cluster cancel failed:', await cancelResponse.text());
        // Continue with local cancellation even if GPU cluster fails
      }
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('lora_training_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        final_cost: job.current_cost,
      })
      .eq('id', params.jobId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel job', details: updateError.message },
        { status: 500 }
      );
    }

    // Create notification
    await supabase.from('lora_notifications').insert({
      user_id: user.id,
      type: 'job_cancelled',
      title: 'Job Cancelled',
      message: 'Your training job was cancelled',
      priority: 'medium',
      action_url: `/training/jobs/${params.jobId}`,
      metadata: { job_id: params.jobId },
    });

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });
  } catch (error: any) {
    console.error('Job cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job', details: error.message },
      { status: 500 }
    );
  }
}
```

**Updated Hook (extends Section E03 hook):**

**File:** `src/hooks/useTrainingConfig.ts` (update existing file from Section E03)

Add to existing hooks file:

```typescript
// Add to existing file from Section E03

/**
 * Hook for fetching single job details with auto-polling
 * Extends the version from Section E03 with metrics and cost records
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
      const status = data?.data?.job?.status;
      return status === 'running' || status === 'queued' || status === 'initializing' 
        ? 5000 
        : false;
    },
  });
}

/**
 * Hook for cancelling jobs
 */
export function useCancelJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Cancellation failed');
      }
      
      return response.json();
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['training-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast({
        title: 'Job Cancelled',
        description: 'Training job has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**Monitor Page Component:**

**File:** `src/app/(dashboard)/training/jobs/[jobId]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { use } from 'react';
import { useTrainingJob, useCancelJob } from '@/hooks/useTrainingConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingDown, 
  Zap, 
  DollarSign,
  Clock,
  Cpu,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

export default function TrainingMonitorPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useTrainingJob(params.jobId);
  const { mutate: cancelJob, isPending: isCancelling } = useCancelJob();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load training job. {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const job = data.data.job;
  const metrics = data.data.metrics || [];
  const costRecords = data.data.cost_records || [];

  // Status badge configuration
  const statusConfig = {
    queued: { color: 'bg-blue-500', icon: Clock, label: 'Queued' },
    initializing: { color: 'bg-yellow-500', icon: Loader2, label: 'Initializing' },
    running: { color: 'bg-green-500', icon: Activity, label: 'Running' },
    completed: { color: 'bg-emerald-600', icon: CheckCircle2, label: 'Completed' },
    failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'bg-gray-500', icon: XCircle, label: 'Cancelled' },
  };

  const statusInfo = statusConfig[job.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  // Prepare metrics data for chart
  const chartData = metrics.map((m: any) => ({
    step: m.step,
    epoch: m.epoch,
    training_loss: m.training_loss,
    validation_loss: m.validation_loss,
    learning_rate: m.learning_rate * 10000, // Scale for visibility
  }));

  const handleCancel = () => {
    cancelJob(job.id);
    setShowCancelConfirm(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/training/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Training Monitor</h1>
            <p className="text-gray-600 mt-1">{job.dataset?.name || 'Training Job'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusInfo.color} flex items-center gap-2 text-white px-3 py-1`}>
            <StatusIcon className="h-4 w-4" />
            {statusInfo.label}
          </Badge>
          {['queued', 'initializing', 'running'].includes(job.status) && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Job'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Are you sure you want to cancel this training job?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                No
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                Yes, Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {job.status === 'running' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-semibold">{job.progress.toFixed(1)}%</span>
              </div>
              <Progress value={job.progress} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Epoch {job.current_epoch} / {job.total_epochs}</span>
                <span>Step {job.current_step?.toLocaleString()} / {job.total_steps?.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Training Loss */}
        {job.current_metrics?.training_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Training Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.training_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Loss */}
        {job.current_metrics?.validation_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                Validation Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.validation_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Throughput */}
        {job.current_metrics?.throughput && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.throughput.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">tokens/sec</div>
            </CardContent>
          </Card>
        )}

        {/* Current Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Current Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(job.final_cost || job.current_cost || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              Est. ${job.estimated_total_cost?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Metrics, Configuration, Logs */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Metrics & Charts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="info">Job Info</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {/* Loss Curves */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Training & Validation Loss</CardTitle>
                <CardDescription>Loss curves over training steps</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="step" 
                      label={{ value: 'Training Steps', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="training_loss" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      name="Training Loss"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="validation_loss" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Validation Loss"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* GPU Metrics */}
          {job.current_metrics?.gpu_utilization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  GPU Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>GPU Usage</span>
                    <span className="font-semibold">{job.current_metrics.gpu_utilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={job.current_metrics.gpu_utilization} className="h-2" />
                  <p className="text-xs text-gray-600 mt-2">
                    {job.gpu_config.count}x {job.gpu_config.type}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No metrics yet */}
          {metrics.length === 0 && job.status === 'running' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-gray-600">Waiting for first metrics from GPU cluster...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hyperparameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">Learning Rate</div>
                  <div className="text-lg">{job.hyperparameters.learning_rate}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Batch Size</div>
                  <div className="text-lg">{job.hyperparameters.batch_size}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Epochs</div>
                  <div className="text-lg">{job.hyperparameters.epochs}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">LoRA Rank</div>
                  <div className="text-lg">{job.hyperparameters.rank}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">LoRA Alpha</div>
                  <div className="text-lg">{job.hyperparameters.alpha}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Dropout</div>
                  <div className="text-lg">{job.hyperparameters.dropout}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GPU Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">GPU Type</div>
                  <div className="text-lg">{job.gpu_config.type}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">GPU Count</div>
                  <div className="text-lg">{job.gpu_config.count}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Cost per GPU</div>
                  <div className="text-lg">${job.gpu_config.cost_per_gpu_hour?.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Total Hourly Rate</div>
                  <div className="text-lg">${(job.gpu_config.cost_per_gpu_hour * job.gpu_config.count).toFixed(2)}/hr</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job ID:</span>
                  <span className="font-mono">{job.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dataset:</span>
                  <span>{job.dataset?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preset:</span>
                  <span className="capitalize">{job.preset_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(job.created_at).toLocaleString()}</span>
                </div>
                {job.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span>{new Date(job.started_at).toLocaleString()}</span>
                  </div>
                )}
                {job.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span>{new Date(job.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {job.external_job_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">External Job ID:</span>
                    <span className="font-mono text-xs">{job.external_job_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {job.status === 'failed' && job.error_message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Error Message:</div>
                <div className="text-sm">{job.error_message}</div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Key Points:**
- Uses React Query polling with 5-second intervals for active jobs
- Stops polling when job reaches terminal state (completed/failed/cancelled)
- Displays real-time metrics with Recharts line charts
- Shows progress bar with epoch/step information
- Handles job cancellation with confirmation dialog
- Responsive grid layout for metrics cards
- Tabbed interface for metrics, configuration, and job info
- Error state handling with appropriate UI feedback
- Loading states while fetching data

---

## ✅ Acceptance Criteria

### Functional Requirements

#### FR-4.1: Job Processing Edge Function
- [ ] Edge function polls for jobs with `status='queued'` every 30 seconds
- [ ] Successfully generates 24-hour signed URLs for dataset access
- [ ] Submits jobs to GPU cluster with correct payload format
- [ ] Updates job status to 'initializing' then 'running' on successful submission
- [ ] Polls running jobs for progress updates
- [ ] Inserts metrics points into `lora_metrics_points` table
- [ ] Updates `current_metrics`, `progress`, `current_epoch`, `current_step` fields
- [ ] Calculates and updates `current_cost` based on elapsed time
- [ ] Handles job completion by setting `status='completed'` and `final_cost`
- [ ] Handles job failure by setting `status='failed'` and `error_message`
- [ ] Creates notifications for all job lifecycle events
- [ ] Inserts cost records on job completion
- [ ] Gracefully handles errors without crashing

#### FR-4.4: Training Monitor Page
- [ ] Displays current job status with color-coded badge
- [ ] Shows progress bar with percentage for running jobs
- [ ] Displays key metrics cards (training loss, validation loss, throughput, cost)
- [ ] Renders loss curve chart with Recharts (training & validation)
- [ ] Auto-refreshes data every 5 seconds for active jobs
- [ ] Stops polling when job reaches terminal state
- [ ] Shows GPU utilization metrics when available
- [ ] Displays hyperparameter configuration
- [ ] Displays GPU configuration details
- [ ] Shows job info (timestamps, IDs, dataset info)
- [ ] Allows job cancellation with confirmation
- [ ] Displays error message for failed jobs
- [ ] Handles loading states appropriately
- [ ] Navigates back to jobs list

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Edge function deploys successfully via Supabase CLI
- [ ] Cron schedule configured correctly in Supabase Dashboard
- [ ] Environment variables set in Supabase Dashboard
- [ ] API routes follow existing response format patterns
- [ ] React Query polling configured with correct intervals
- [ ] Components use shadcn/ui patterns from infrastructure
- [ ] Database queries use RLS policies correctly
- [ ] Service role key used only in Edge Function
- [ ] Recharts library imported and used correctly
- [ ] All imports resolve correctly

### Integration Requirements

- [ ] Edge function reads jobs from `lora_training_jobs` table
- [ ] Edge function joins with `lora_datasets` table for dataset info
- [ ] Edge function generates signed URLs via Supabase Storage
- [ ] Edge function inserts into `lora_metrics_points` table
- [ ] Edge function inserts into `lora_cost_records` table
- [ ] Edge function inserts into `lora_notifications` table
- [ ] API routes use `requireAuth()` for authentication
- [ ] Monitor page imports hooks from Section E03
- [ ] Monitor page uses shadcn/ui components from infrastructure
- [ ] Navigation between jobs list and job monitor works
- [ ] Job cancellation updates both local database and GPU cluster

---

## 🧪 Testing & Validation

### Manual Testing Steps

#### 1. Edge Function Testing

**Deploy and Configure:**
```bash
# Deploy edge function
cd supabase
supabase functions deploy process-training-jobs

# Configure environment variables in Supabase Dashboard:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - GPU_CLUSTER_API_URL
# - GPU_CLUSTER_API_KEY

# Configure Cron in Supabase Dashboard:
# - Function: process-training-jobs
# - Schedule: */30 * * * * * (every 30 seconds)
```

**Test Job Processing:**
```sql
-- 1. Create a test job with status='queued' (or use Section E03 configuration flow)
INSERT INTO lora_training_jobs (
  user_id, dataset_id, preset_id, status, 
  hyperparameters, gpu_config, 
  total_epochs, estimated_total_cost
) VALUES (
  'your-user-id',
  'your-dataset-id',
  'balanced',
  'queued',
  '{"learning_rate": 0.0001, "batch_size": 4, "epochs": 3, "rank": 16}',
  '{"type": "A100-80GB", "count": 2, "cost_per_gpu_hour": 3.50}',
  3,
  25.50
);

-- 2. Wait 30 seconds for cron to trigger

-- 3. Verify job status updated
SELECT id, status, current_stage, external_job_id, started_at
FROM lora_training_jobs
WHERE status IN ('initializing', 'running')
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check metrics being inserted (after job starts)
SELECT job_id, epoch, step, training_loss, validation_loss, timestamp
FROM lora_metrics_points
WHERE job_id = 'your-job-id'
ORDER BY timestamp DESC
LIMIT 10;

-- 5. Check notifications created
SELECT type, title, message, created_at
FROM lora_notifications
WHERE metadata->>'job_id' = 'your-job-id'
ORDER BY created_at DESC;
```

**Monitor Edge Function Logs:**
```bash
# View real-time logs
supabase functions logs process-training-jobs --follow

# Expected log output:
# [JobProcessor] Starting job processing cycle
# [JobProcessor] Processing 1 queued jobs
# [JobProcessor] Job <id> submitted to GPU cluster: <external_id>
# [JobProcessor] Updating 1 running jobs
# [JobProcessor] Updated job <id>: running - 25.5%
```

#### 2. API Endpoint Testing

**Test Job Details Endpoint:**
```bash
# Get job with metrics
curl http://localhost:3000/api/jobs/<job-id> \
  -H "Cookie: <your-session-cookie>"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "job": { "id": "...", "status": "running", ... },
#     "metrics": [ { "step": 100, "training_loss": 2.35, ... } ],
#     "cost_records": []
#   }
# }
```

**Test Job Cancellation:**
```bash
# Cancel a running job
curl -X POST http://localhost:3000/api/jobs/<job-id>/cancel \
  -H "Cookie: <your-session-cookie>"

# Expected response:
# { "success": true, "message": "Job cancelled successfully" }

# Verify in database:
SELECT id, status, completed_at, final_cost
FROM lora_training_jobs
WHERE id = '<job-id>';
# Expected: status='cancelled', completed_at set, final_cost = current_cost
```

#### 3. UI Testing

**Navigate to Monitor Page:**
1. Go to `http://localhost:3000/training/jobs`
2. Click on a running job
3. Verify URL: `http://localhost:3000/training/jobs/<job-id>`

**Verify Real-Time Updates:**
1. Observe status badge (should show "Running" with green color)
2. Watch progress bar update (should increment every 5 seconds)
3. Check metrics cards display current values
4. Verify loss chart renders with data points
5. Observe page auto-refreshing (check network tab, should poll every 5s)

**Test Job Cancellation:**
1. Click "Cancel Job" button
2. Confirm cancellation in dialog
3. Verify status changes to "Cancelled"
4. Verify polling stops (no more API calls)

**Test Tabs:**
1. Click "Metrics & Charts" tab - verify loss curves display
2. Click "Configuration" tab - verify hyperparameters show
3. Click "Job Info" tab - verify job details display

**Test Navigation:**
1. Click back arrow
2. Verify returns to `/training/jobs` (jobs list)

**Test Error States:**
- Navigate to non-existent job ID: verify error alert displays
- View failed job: verify error message shows in "Job Info" tab

#### 4. Integration Testing

**Complete Flow Test:**
1. Create dataset (Section E02)
2. Configure training job (Section E03)
3. Job should appear in jobs list with status='queued'
4. Wait 30 seconds for Edge Function cron
5. Job status should change to 'running'
6. Navigate to job monitor
7. Verify real-time updates occurring
8. Cancel job
9. Verify status changes to 'cancelled'
10. Check notifications created

**Metrics Flow Test:**
1. Start training job
2. Wait for metrics to appear (check database)
3. Refresh monitor page
4. Verify metrics display in cards
5. Verify loss curve chart populates
6. Verify metrics update every 5 seconds

### Expected Outputs

After completing this prompt, you should have:

- [ ] Edge function deployed: `process-training-jobs`
- [ ] Cron job configured and running every 30 seconds
- [ ] API route: `GET /api/jobs/[jobId]` returns job with metrics
- [ ] API route: `POST /api/jobs/[jobId]/cancel` cancels jobs
- [ ] Page: `/training/jobs/[jobId]` displays real-time monitoring
- [ ] Jobs transition: queued → initializing → running → completed
- [ ] Metrics inserted into `lora_metrics_points` table
- [ ] Costs calculated and recorded
- [ ] Notifications created for all events
- [ ] UI auto-refreshes every 5 seconds for active jobs
- [ ] Loss curves render with Recharts
- [ ] Job cancellation works end-to-end

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `supabase/functions/process-training-jobs/index.ts` - Edge Function for job processing
- [ ] `src/app/api/jobs/[jobId]/route.ts` - Job details API endpoint
- [ ] `src/app/api/jobs/[jobId]/cancel/route.ts` - Job cancellation endpoint
- [ ] `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` - Training monitor page

### Existing Files Modified

- [ ] `src/hooks/useTrainingConfig.ts` - Added `useTrainingJob` with polling and `useCancelJob`

### Database Operations

- [ ] Edge function queries `lora_training_jobs` table
- [ ] Edge function inserts into `lora_metrics_points` table
- [ ] Edge function inserts into `lora_cost_records` table
- [ ] Edge function inserts into `lora_notifications` table
- [ ] Edge function updates job status, progress, metrics, costs

### API Endpoints

- [ ] `GET /api/jobs/[jobId]` - Returns job with metrics and cost records
- [ ] `POST /api/jobs/[jobId]/cancel` - Cancels running job

### Components & Pages

- [ ] `/training/jobs/[jobId]` page - Real-time training monitor
- [ ] Uses existing shadcn/ui components (no new components)

### Edge Functions

- [ ] `process-training-jobs` - Deployed and scheduled via Cron

### External Integrations

- [ ] GPU cluster API integration (submit jobs, poll status, cancel jobs)
- [ ] Supabase Storage signed URLs for dataset access

---

## 🔜 What's Next

### For Next Prompt in This Section

**Section Complete:** This is the final and only prompt in Section E04.

### For Next Section

**Next Section:** E05: Model Artifacts & Deployment

Section E05 will build upon:
- **Completed jobs**: Jobs with `status='completed'` ready for artifact creation
- **Job metadata**: Training summary, hyperparameters, metrics for artifact records
- **Final costs**: Completed jobs with `final_cost` populated
- **Metrics data**: Historical metrics from `lora_metrics_points` for quality assessment

---

## ⚠️ Important Reminders

### 1. Follow the Spec Exactly

All code provided in this prompt comes from the integrated specification. Implement it as written.

### 2. Reuse Existing Infrastructure

Don't recreate what already exists. Import and use:
- **Supabase Auth**: `requireAuth()` from `@/lib/supabase-server`
- **Supabase Client**: `createServerSupabaseClient()` for authenticated queries
- **Supabase Admin**: `createServerSupabaseAdminClient()` for Edge Function (service role)
- **shadcn/ui**: All components from `@/components/ui/*`
- **React Query**: For mutations, queries, and polling
- **Recharts**: For loss curve visualization
- **Existing hooks**: Import and extend `useTrainingJobs` from Section E03

### 3. Integration Points

When using previous work, add comments:

```typescript
// From Section E01 - database tables
import { TrainingJob, JobStatus } from '@/lib/types/lora-training';

// From Section E02 - storage signed URLs
const { data: signedUrl } = await supabase.storage
  .from('lora-datasets')
  .createSignedUrl(dataset.storage_path, 3600 * 24);

// From Section E03 - job records
const { data: jobs } = await supabase
  .from('lora_training_jobs')
  .select('*')
  .eq('status', 'queued');
```

### 4. Pattern Consistency

Match existing patterns:
- **API responses**: `{ success: true, data }` or `{ error, details }`
- **File organization**: API routes in `src/app/api/`, pages in `src/app/(dashboard)/`
- **Component structure**: Use Card, Badge, Button from shadcn/ui
- **Edge Functions**: Use Deno runtime, service role key, error handling

### 5. Environment Variables

Set these in Supabase Dashboard (Edge Functions → Settings):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
- `GPU_CLUSTER_API_URL` - GPU cluster endpoint
- `GPU_CLUSTER_API_KEY` - GPU cluster authentication

### 6. Cron Configuration

Configure in Supabase Dashboard (Edge Functions → Cron Jobs):
- **Function**: `process-training-jobs`
- **Schedule**: `*/30 * * * * *` (every 30 seconds)
- **Enabled**: Yes

### 7. Polling vs Real-Time

We use **React Query polling** (5-second intervals) instead of Server-Sent Events because:
- Simpler implementation with existing React Query setup
- No additional server infrastructure needed
- Sufficient latency for training progress updates
- Automatic cleanup when component unmounts
- Easy to pause/resume based on job status

### 8. Don't Skip Steps

Implement all features in this prompt before moving to the next section:
1. Deploy Edge Function
2. Configure Cron
3. Set environment variables
4. Create API endpoints
5. Update hooks
6. Create monitor page
7. Test complete flow

---

## 📚 Reference Materials

### Files from Previous Work

#### Section E01: Foundation & Authentication
- **Database Tables**: `lora_training_jobs`, `lora_datasets`, `lora_metrics_points`, `lora_cost_records`, `lora_notifications`
- **Types**: `@/lib/types/lora-training` (TrainingJob, JobStatus, CurrentMetrics, etc.)
- **Auth**: `@/lib/supabase-server` (requireAuth, createServerSupabaseClient, createServerSupabaseAdminClient)

#### Section E02: Dataset Management
- **Storage**: Supabase Storage signed URL generation
- **Patterns**: `supabase.storage.from('lora-datasets').createSignedUrl(path, expiry)`

#### Section E03: Training Configuration
- **Hooks**: `@/hooks/useTrainingConfig` (useCreateTrainingJob, useTrainingJobs)
- **API**: `POST /api/jobs` (job creation), `GET /api/jobs` (jobs list)
- **Pages**: `/training/configure` (configuration form)

### Infrastructure Patterns

#### Authentication
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

#### Database (Authenticated)
```typescript
const supabase = createServerSupabaseClient();
const { data, error } = await supabase.from('table').select('*');
```

#### Database (Service Role - Edge Functions only)
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

#### Storage (Signed URLs)
```typescript
const { data } = await supabase.storage
  .from('bucket')
  .createSignedUrl(path, expirySeconds);
```

#### React Query (Polling)
```typescript
useQuery({
  queryKey: ['key'],
  queryFn: async () => { /* fetch */ },
  refetchInterval: (data) => {
    return isActive ? 5000 : false; // Poll every 5s if active
  },
});
```

#### API Response Format
```typescript
// Success
return NextResponse.json({ success: true, data });

// Error
return NextResponse.json(
  { error: 'Error message', details: 'Additional info' },
  { status: 400 }
);
```

### Component Patterns (shadcn/ui)

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

### Recharts Pattern

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="step" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="training_loss" stroke="#f97316" />
    <Line type="monotone" dataKey="validation_loss" stroke="#3b82f6" />
  </LineChart>
</ResponsiveContainer>
```

---

## 🎉 Section Completion

After implementing this prompt, Section E04 (Training Execution & Monitoring) will be complete!

**What You've Built:**
- ✅ Background job processor with GPU cluster integration
- ✅ Real-time metrics tracking and storage
- ✅ Cost calculation and recording
- ✅ Job lifecycle management (queued → running → completed)
- ✅ Rich monitoring UI with live updates
- ✅ Loss curve visualization
- ✅ Job cancellation capability
- ✅ Notifications for all job events

**Ready for Section E05:**
- Completed jobs ready for model artifact creation
- Training metrics available for quality assessment
- Cost data ready for billing analysis

---

**Ready to implement Section E04 - Training Execution & Monitoring!** 🚀

---

## Section Completion Checklist

After completing all prompts in this section:

- [ ] Edge Function deployed and cron configured
- [ ] Jobs successfully transition through all statuses
- [ ] Metrics inserted into database during training
- [ ] Cost tracking working correctly
- [ ] Monitor page displays real-time updates
- [ ] Loss curves rendering with Recharts
- [ ] Job cancellation working end-to-end
- [ ] Notifications created for all events
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Integration with previous sections verified
- [ ] Ready to proceed to Section E05

---

**End of Section E04 Execution Prompts**

