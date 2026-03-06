# Spec 21 — Workbase Batch Job Watcher: Execution Prompt E01
## Phase 1 (DB) + Phase 2 (Backend Services & API)

**Version:** 1.0 | **Date:** 2026-03-03  
**Spec Source:** `21-ux-containers-batch-page-specification_v1.md`  
**Builds:** DB schema migration + 3 backend service/API file edits  
**Output Used By:** E02 (UI pages depend on the API filter this prompt adds)

---

========================    

## EXECUTION PROMPT E01 — DB Schema + Backend Services

You are an expert Next.js 14 / TypeScript / Supabase engineer. You will implement a precise set of changes to an existing production codebase. Read all instructions fully before writing any code. Execute each task in order.

---

## APPLICATION CONTEXT

**Bright Run LoRA Training Data Platform** — Next.js 14 App Router application. Users create "Work Bases" (workspaces) and generate AI training conversations in batches within each workbase. The batch job pipeline creates `batch_jobs` DB rows, then the client polls `POST /api/batch-jobs/[id]/process-next` to generate each conversation.

**Active codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`  
**Framework:** Next.js 14, App Router, TypeScript  
**Database:** Supabase PostgreSQL — admin client used in all API routes (`createServerSupabaseAdminClient`)  
**Auth:** `requireAuth(request)` from `@/lib/supabase-server` — used in every API route  

### Critical Problem Being Fixed

The `batch_jobs` table currently has **NO `workbase_id` column**. The workbase association is stored in the JSONB field `shared_parameters` as `{ workbaseId: "uuid-here" }`. This makes server-side filtering impossible without JSONB casting.

**This prompt adds a proper `workbase_id UUID` column**, backfills existing records, updates the service to write it on new job creation, and adds API filtering support.

---

## SAOL — DATABASE TOOL (MANDATORY)

**ALL database operations in this prompt MUST use SAOL.** Do not use raw supabase-js or psql.

**SAOL location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`

**Standard SAOL shell pattern:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // your SAOL call here
})();"
```

**DDL pattern (always dry-run first):**
```bash
# Step 1: dry-run
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: 'YOUR SQL HERE',
    transport: 'pg',
    transaction: true,
    dryRun: true
  });
  console.log(JSON.stringify(r, null, 2));
})();"

# Step 2: apply (dryRun: false)
```

**Query pattern:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'batch_jobs',
    select: '*',
    limit: 5
  });
  console.log(JSON.stringify(r.data, null, 2));
})();"
```

---

## EXISTING FILES TO READ BEFORE MAKING CHANGES

Before modifying any file, read it fully using your Read tool. The key files are:

1. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\batch-job-service.ts`
2. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\batch-generation-service.ts`
3. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\batch-jobs\route.ts`

---

## TASK 1 — DB: Verify Current `batch_jobs` Schema

First, confirm the current column set and verify there is NO `workbase_id` column.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'batch_jobs',
    select: '*',
    limit: 1,
    orderBy: [{column: 'created_at', asc: false}]
  });
  if(r.data[0]) {
    console.log('Columns:', Object.keys(r.data[0]));
    console.log('Has workbase_id:', 'workbase_id' in r.data[0]);
  }
  console.log('Row count check:', r.data.length);
})();"
```

**Expected:** `Has workbase_id: false` — confirming the column needs to be added.

Also check the `workbases` table exists (for the FK reference):
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({table:'workbases',select:'id',limit:1});
  console.log('workbases table accessible:', r.success);
})();"
```

---

## TASK 2 — DB: Add `workbase_id` Column to `batch_jobs`

### Step 2.1 — Dry-run the DDL

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE batch_jobs
        ADD COLUMN IF NOT EXISTS workbase_id UUID REFERENCES workbases(id);
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_workbase_id ON batch_jobs(workbase_id);
    \`,
    transport: 'pg',
    transaction: true,
    dryRun: true
  });
  console.log('Dry-run result:', JSON.stringify(r, null, 2));
})();"
```

**Stop if dry-run fails.** Only proceed if `r.success === true`.

### Step 2.2 — Apply the DDL

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: \`
      ALTER TABLE batch_jobs
        ADD COLUMN IF NOT EXISTS workbase_id UUID REFERENCES workbases(id);
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_workbase_id ON batch_jobs(workbase_id);
    \`,
    transport: 'pg',
    transaction: true,
    dryRun: false
  });
  console.log('Apply result:', JSON.stringify(r, null, 2));
})();"
```

---

## TASK 3 — DB: Backfill `workbase_id` From `shared_parameters`

Existing `batch_jobs` records store `workbaseId` inside the JSONB column `shared_parameters` as `{ "workbaseId": "uuid-here" }`. Backfill the new column from this data.

### Step 3.1 — Count records that need backfill

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN shared_parameters->>'workbaseId' IS NOT NULL AND workbase_id IS NULL THEN 1 END) as needs_backfill
      FROM batch_jobs;
    \`,
    transport: 'pg'
  });
  console.log('Backfill check:', JSON.stringify(r, null, 2));
})();"
```

### Step 3.2 — Run the backfill

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \`
      UPDATE batch_jobs
      SET workbase_id = (shared_parameters->>'workbaseId')::uuid
      WHERE shared_parameters->>'workbaseId' IS NOT NULL
        AND workbase_id IS NULL;
    \`,
    transport: 'pg',
    transaction: true
  });
  console.log('Backfill result:', JSON.stringify(r, null, 2));
})();"
```

### Step 3.3 — Verify backfill

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'batch_jobs',
    select: 'id,name,workbase_id,shared_parameters',
    limit: 5,
    orderBy: [{column: 'created_at', asc: false}]
  });
  r.data.forEach(j => {
    const spWbId = j.shared_parameters?.workbaseId;
    const colWbId = j.workbase_id;
    const match = spWbId === colWbId;
    console.log(j.id.slice(0,8), '| col:', colWbId?.slice(0,8)||'null', '| sp:', spWbId?.slice(0,8)||'null', '| match:', match);
  });
})();"
```

**Expected:** For every row where `shared_parameters.workbaseId` exists, the `workbase_id` column now matches.

---

## TASK 4 — Code: Update `batch-job-service.ts`

**File:** `src/lib/services/batch-job-service.ts`

Read the file fully first, then make these three targeted changes.

### Change 4A — Update `createJob` function signature

Find the `createJob` function. Its current signature is:
```typescript
async createJob(
  job: Partial<BatchJob> & { createdBy?: string },
  items: Partial<BatchItem>[]
): Promise<BatchJob>
```

**Change it to:**
```typescript
async createJob(
  job: Partial<BatchJob> & { createdBy?: string; workbaseId?: string },
  items: Partial<BatchItem>[]
): Promise<BatchJob>
```

### Change 4B — Add `workbase_id` to the `.insert({...})` call inside `createJob`

Find the `.from('batch_jobs').insert({...})` call inside `createJob`. It currently inserts these fields:
```typescript
name: job.name,
job_type: 'generation',
status: job.status || 'queued',
priority: job.priority || 'normal',
total_items: items.length,
completed_items: 0,
failed_items: 0,
successful_items: 0,
tier: job.configuration?.tier,
shared_parameters: job.configuration?.sharedParameters || {},
concurrent_processing: job.configuration?.concurrentProcessing || 3,
error_handling: job.configuration?.errorHandling || 'continue',
created_by: job.createdBy,
user_id: job.createdBy,
```

**Add ONE line** after `user_id`:
```typescript
workbase_id: job.workbaseId || null,
```

### Change 4C — Add `workbaseId` filter to `getAllJobs`

Find the `getAllJobs` function. Its current signature is:
```typescript
async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]>
```

**Change it to:**
```typescript
async getAllJobs(userId: string, filters?: { status?: BatchJobStatus; workbaseId?: string }): Promise<BatchJob[]>
```

Then inside `getAllJobs`, find the query builder block. It currently looks like:
```typescript
let query = supabase
  .from('batch_jobs')
  .select('*')
  .eq('created_by', userId);

if (filters?.status) {
  query = query.eq('status', filters.status);
}

query = query.order('created_at', { ascending: false });
```

**Add ONE new `if` block** after the status filter block:
```typescript
if (filters?.workbaseId) {
  query = query.eq('workbase_id', filters.workbaseId);
}
```

### Change 4D — Return `workbaseId` from `getJobById`

Find the `getJobById` function. Its return object currently includes fields like `id`, `name`, `status`, `totalItems`, etc. Find the return statement inside the `try` block.

**Add ONE line** to the return object, after `createdBy`:
```typescript
workbaseId: jobData.workbase_id || null,
```

The return object will look like:
```typescript
return {
  id: jobData.id,
  name: jobData.name,
  status: jobData.status,
  totalItems: jobData.total_items,
  completedItems: jobData.completed_items,
  failedItems: jobData.failed_items,
  successfulItems: jobData.successful_items,
  startedAt: jobData.started_at,
  completedAt: jobData.completed_at,
  estimatedTimeRemaining: jobData.estimated_time_remaining,
  priority: jobData.priority,
  items,
  createdBy: jobData.created_by,
  workbaseId: jobData.workbase_id || null,   // ← ADD THIS LINE
  configuration: {
    tier: jobData.tier,
    sharedParameters: jobData.shared_parameters || {},
    concurrentProcessing: jobData.concurrent_processing,
    errorHandling: jobData.error_handling,
  },
};
```

Note: There is also a return object inside `getAllJobs` that maps each job. Add `workbaseId: jobData.workbase_id || null` to that mapping as well — it appears in the `Promise.all((data || []).map(async (jobData) => {...}))` block.

---

## TASK 5 — Code: Update `batch-generation-service.ts`

**File:** `src/lib/services/batch-generation-service.ts`

Read the file fully first. Find the `startBatchGeneration` method. Inside it, there is a call to `batchJobService.createJob(...)`.

**Current call structure:**
```typescript
const batchJob = await batchJobService.createJob(
  {
    name: request.name,
    priority: request.priority || 'normal',
    status: 'queued',
    createdBy: request.userId,
    configuration: {
      tier: request.tier,
      sharedParameters: {
        ...(request.sharedParameters || {}),
        ...(request.workbaseId ? { workbaseId: request.workbaseId } : {}),
      },
      concurrentProcessing: request.concurrentProcessing || 3,
      errorHandling: request.errorHandling || 'continue',
    },
  },
  items.map(...)
);
```

**Add ONE line** to the first argument object, after `createdBy`:
```typescript
workbaseId: request.workbaseId,
```

The first argument becomes:
```typescript
{
  name: request.name,
  priority: request.priority || 'normal',
  status: 'queued',
  createdBy: request.userId,
  workbaseId: request.workbaseId,           // ← ADD THIS LINE
  configuration: {
    tier: request.tier,
    sharedParameters: {
      ...(request.sharedParameters || {}),
      ...(request.workbaseId ? { workbaseId: request.workbaseId } : {}),
    },
    concurrentProcessing: request.concurrentProcessing || 3,
    errorHandling: request.errorHandling || 'continue',
  },
}
```

> Note: Keep the existing `sharedParameters` JSONB storage of `workbaseId` unchanged. The `process-next` route reads `workbaseId` from `job.configuration?.sharedParameters` — do not break this.

---

## TASK 6 — Code: Update `GET /api/batch-jobs` Route

**File:** `src/app/api/batch-jobs/route.ts`

Read the file fully first. Find the `GET` function.

**Current relevant lines in GET handler:**
```typescript
const { searchParams } = new URL(request.url);
const status = searchParams.get('status') as 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | null;

const jobs = await batchJobService.getAllJobs(user.id, status ? { status } : undefined);
```

**Replace those lines with:**
```typescript
const { searchParams } = new URL(request.url);
const status = searchParams.get('status') as 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | null;
const workbaseId = searchParams.get('workbaseId') || undefined;

const jobs = await batchJobService.getAllJobs(user.id, {
  ...(status ? { status } : {}),
  ...(workbaseId ? { workbaseId } : {}),
});
```

The rest of the GET handler (the `simplifiedJobs` mapping and the JSON response) remains **unchanged**.

---

## TASK 7 — Build Verification

Run TypeScript compilation to catch any type errors before E02:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | head -50
```

**Expected:** No errors from the three modified files. If there are errors, fix them before proceeding.

Also do a quick smoke test that the GET endpoint now accepts `workbaseId`:

```bash
# This should not throw a 500 — check your Vercel or local dev server logs
# Test locally if you have a dev server running:
# curl "http://localhost:3000/api/batch-jobs?workbaseId=232bea74-b987-4629-afbc-a21180fe6e84" -H "Cookie: <your-auth-cookie>"
```

---

## TASK 8 — SAOL Final Verification

Confirm the full DB change is in place:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Check column exists
  const r = await saol.agentQuery({table:'batch_jobs',select:'id,workbase_id',limit:1});
  console.log('workbase_id column present:', 'workbase_id' in (r.data[0]||{}));
  
  // Check backfill
  const r2 = await saol.agentQuery({
    table: 'batch_jobs',
    select: 'id,workbase_id',
    limit: 10
  });
  const populated = r2.data.filter(j => j.workbase_id !== null).length;
  console.log('Records with workbase_id populated:', populated, 'of', r2.data.length);
})();"
```

---

## COMPLETION CHECKLIST

Before declaring E01 done, verify all of the following:

- [ ] `batch_jobs.workbase_id` column exists (UUID, nullable, FK to workbases)
- [ ] `idx_batch_jobs_workbase_id` index exists on `batch_jobs`
- [ ] Existing records backfilled: `workbase_id` matches `shared_parameters->>'workbaseId'`
- [ ] `batch-job-service.ts`: `createJob` signature accepts `workbaseId?: string`
- [ ] `batch-job-service.ts`: `createJob` insert includes `workbase_id: job.workbaseId || null`
- [ ] `batch-job-service.ts`: `getAllJobs` accepts and applies `workbaseId` filter
- [ ] `batch-job-service.ts`: `getJobById` return object includes `workbaseId: jobData.workbase_id || null`
- [ ] `batch-job-service.ts`: `getAllJobs` job mapping also includes `workbaseId`
- [ ] `batch-generation-service.ts`: passes `workbaseId: request.workbaseId` to `createJob`
- [ ] `api/batch-jobs/route.ts`: parses `workbaseId` query param and passes to `getAllJobs`
- [ ] `npx tsc --noEmit` — zero errors in these 3 files

**E02 depends on all of the above being done. Do not proceed to E02 until this checklist is complete.**

+++++++++++++++++
