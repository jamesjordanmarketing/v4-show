# 21 — Workbase Batch Job Watcher: Implementation Specification

**Version:** 1.0 | **Date:** 2026-03-03  
**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`  
**Deployed App:** `https://v4-show.vercel.app`

---

## Table of Contents

1. [Background & Application Context](#1-background--application-context)
2. [Objective](#2-objective)
3. [Current State Analysis](#3-current-state-analysis)
4. [Implementation Plan: All Changes](#4-implementation-plan-all-changes)
   - 4.1 Phase 1: Database — Add `workbase_id` to `batch_jobs`
   - 4.2 Phase 2: Backend — Service & API changes
   - 4.3 Phase 3: New Pages — Batch list & detail pages
   - 4.4 Phase 4: Modify existing pages
5. [Complete Code](#5-complete-code)
6. [Implementation Sequence & Dependencies](#6-implementation-sequence--dependencies)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Files Modified Summary](#8-files-modified-summary)

---

## 1. Background & Application Context

### What This Application Is

**Bright Run LoRA Training Data Platform** — A Next.js 14 (App Router) application that generates high-quality AI training conversations for fine-tuning large language models. Users create "Work Bases" (workspaces) and within each workbase:
1. **Generate Conversations** — via a batch generator (`/workbase/[id]/fine-tuning/conversations/generate`)
2. **Review/Manage Conversations** — via the conversations table (`/workbase/[id]/fine-tuning/conversations`)
3. **Build Training Sets** — select enriched conversations, aggregate to JSONL
4. **Train & Publish** — configure hyperparameters, dispatch to RunPod GPU, auto-deploy adapter

### Core Architecture

- **Framework:** Next.js 14, App Router, TypeScript, `'use client'` pages
- **Database:** Supabase PostgreSQL + Storage (admin client bypasses RLS in API routes)
- **UI:** shadcn/UI + Tailwind CSS with custom design tokens (see §1.4)
- **Auth:** Supabase Auth; all API routes use `requireAuth(request)` from `@/lib/supabase-server`
- **DB Operations (agent):** ALL database operations via SAOL at `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`

### Workbase Architecture

Every user operation is scoped to a **workbase** entity. The workbase-level routes all live at:
```
/workbase/[id]/              ← uses layout.tsx with left sidebar nav
/workbase/[id]/fine-tuning/conversations/        ← conversations list page
/workbase/[id]/fine-tuning/conversations/generate/   ← batch generator
/workbase/[id]/fine-tuning/launch/               ← training launch page
/workbase/[id]/fine-tuning/chat/                 ← behavior chat
/workbase/[id]/fact-training/...
/workbase/[id]/settings/
```

The workbase layout file is `src/app/(dashboard)/workbase/[id]/layout.tsx`. It renders a fixed left sidebar with navigation links using the `duck-blue` active state, and a scrollable main content area. **All new pages within this tree automatically inherit the sidebar.**

### Design Token System (Mandatory)

All new and modified UI code **must use these semantic tokens only**:

| Token | Value | Use For |
|-------|-------|---------|
| `bg-background` | Soft Cream `#FFFDF0` | Page backgrounds |
| `bg-card` | White `#FFFFFF` | Cards, panels |
| `bg-muted` | Muted Cream `#F5F5F0` | Subtle backgrounds, stats blocks |
| `text-foreground` | Deep Charcoal `#383838` | Primary text |
| `text-muted-foreground` | Soft Gray `#666666` | Secondary/helper text |
| `border-border` | Light Gray `#D1D5DB` | All borders |
| `text-duck-blue` / `bg-duck-blue` | Sky Blue `#3AA1EC` | Brand accent, active nav |
| `bg-primary` / `text-primary-foreground` | Vibrant Yellow `#FFDE00` | Primary CTA button |

**Zero `zinc-*`, `slate-*`, or `gray-*` Tailwind classes in any new or modified code.**  
Exception: status badges use semantic colors (`bg-green-100 text-green-700`, `bg-red-100 text-red-700`, etc.) — intentionally NOT tokens.

### Batch Job System (Current State)

The batch generation pipeline works as follows:

1. User visits `/workbase/[id]/fine-tuning/conversations/generate` and selects personas/arcs/topics
2. User submits → `POST /api/conversations/generate-batch` (with `workbaseId` in body)
3. The `getBatchGenerationService().startBatchGeneration()` creates a row in `batch_jobs` with `status: 'queued'` and stores `workbaseId` in the JSONB `shared_parameters` column
4. The generate page currently redirects back to `/workbase/[id]/fine-tuning/conversations` (NOT to the batch watcher)
5. The user must manually navigate to the **legacy** batch watcher at `/batch-jobs/[id]` — which is unstyled, uses legacy routes, and has no workbase context
6. The legacy batch watcher **auto-starts processing** by polling `POST /api/batch-jobs/[id]/process-next` in a loop, generating conversations one by one
7. After all items complete, it **auto-triggers enrichment** via `POST /api/conversations/bulk-enrich`

### Key DB Tables

| Table | Relevant Columns |
|-------|-----------------|
| `batch_jobs` | `id`, `name`, `status` (queued/processing/paused/completed/failed/cancelled), `total_items`, `completed_items`, `successful_items`, `failed_items`, `started_at`, `completed_at`, `estimated_time_remaining`, `shared_parameters` (JSONB), `created_by`, `user_id` |
| `batch_items` | `id`, `batch_job_id`, `position`, `status`, `conversation_id`, `error_message` |

**Critical note:** `batch_jobs` currently has NO `workbase_id` column. The workbase association is stored in `shared_parameters->>'workbaseId'` (JSONB). This spec adds a proper `workbase_id UUID` column.

### SAOL Requirement

**ALL agent-driven database operations MUST use SAOL** (Supabase Agent Ops Library).

```bash
# SAOL location
C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\

# Usage pattern:
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: 'ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS workbase_id UUID;',
    transport: 'pg',
    transaction: true,
    dryRun: true  // Always dry-run first
  });
  console.log(JSON.stringify(r, null, 2));
})();"
```

Full SAOL guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

---

## 2. Objective

Migrate the batch job watcher from the legacy standalone page (`/batch-jobs/[id]`) into the workbase UX framework so that:

1. **Workbase-scoped batch job list page** (`/workbase/[id]/fine-tuning/conversations/batch`) — shows only batch jobs created in this specific workbase, styled with design tokens, within the workbase sidebar layout
2. **Workbase-scoped batch job detail page** (`/workbase/[id]/fine-tuning/conversations/batch/[jobId]`) — full-featured job watcher (progress, auto-process, auto-enrich, stop/resume/cancel) within the workbase sidebar, styled with design tokens, with navigation back to conversations
3. **Conversations page gets a "Batch Jobs" button** that navigates to the workbase batch jobs list
4. **Generator page redirect** — after successful batch submission, redirect to the new workbase batch watcher detail page instead of the conversations list
5. **Workbase scope isolation** — batch jobs are filtered so a workbase only shows jobs that were created for that specific workbase

---


## 3. Current State Analysis

### What Currently Exists

| File | Role | Problem |
|------|------|---------|
| `src/app/(dashboard)/batch-jobs/[id]/page.tsx` | Legacy batch job watcher. Full functionality: auto-process, auto-enrich, stop/cancel. | Outside workbase layout. Uses dark-mode `bg-green-950`, `bg-red-950` etc. "Back" link goes to `/batch-jobs` (a non-workbase page). Navigation CTA buttons point to `/conversations` and `/bulk-generator` (legacy routes). |
| `src/app/api/batch-jobs/route.ts` | `GET /api/batch-jobs` — lists jobs by `created_by`. | No `workbaseId` filter. |
| `src/lib/services/batch-job-service.ts` | `getAllJobs(userId, filters?)` — filters by status only. | No workbase filter. `getJobById` return object has no `workbaseId`. |
| `src/lib/services/batch-generation-service.ts` | Creates batch jobs. Stores `workbaseId` in `shared_parameters` JSON only. | Doesn't write to a dedicated `workbase_id` column (column doesn't exist yet). |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` | Batch generator. Submits to `POST /api/conversations/generate-batch`. | After successful submission, redirects to `/workbase/${workbaseId}/fine-tuning/conversations` — not to the batch watcher. |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Conversations list. | No button to view batch jobs. |

### What Does NOT Exist Yet

- `workbase_id` column on `batch_jobs` table
- `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx`
- `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`

### Key Existing API Routes (Do Not Change Their Signatures)

| Route | Used By Batch Watcher |
|-------|-----------------------|
| `GET /api/conversations/batch/[id]/status` | Fetch job status (jobId, status, progress, times) |
| `POST /api/batch-jobs/[id]/process-next` | Process one item in the queue; returns updated progress |
| `POST /api/batch-jobs/[id]/cancel` | Cancel a job |
| `PATCH /api/conversations/batch/[id]` | Pause/resume a job |
| `GET /api/conversations/batch/[id]/items?status=completed` | Fetch completed item conversation IDs for enrichment |
| `POST /api/conversations/bulk-enrich` | `{ conversationIds: string[] }` → trigger enrichment pipeline |
| `GET /api/batch-jobs` | List jobs — will add `workbaseId` query param filter |

---

## 4. Implementation Plan: All Changes

### 4.1 — Phase 1: Database — Add `workbase_id` to `batch_jobs`

**Why:** The `batch_jobs` table currently has no `workbase_id` column. The association is stored in the JSONB `shared_parameters` field as `{ workbaseId: "..." }`. Adding a proper column enables efficient SQL filtering without JSONB casting, consistent with how all other tables in this codebase handle workbase scoping.

**Step 1: Verify current schema**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'batch_jobs',
    select: '*',
    limit: 1
  });
  if(r.data[0]) console.log('Current columns:', Object.keys(r.data[0]));
})();"
```

**Step 2: Dry-run the DDL**

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

**Step 3: Apply (set `dryRun: false`)**

Run the same command with `dryRun: false` to apply.

**Step 4: Backfill existing records**

Existing `batch_jobs` records store `workbaseId` in `shared_parameters`. Backfill the new column:

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

**Step 5: Verify**

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
  r.data.forEach(j => console.log(j.id.slice(0,8), '| workbase_id:', j.workbase_id?.slice(0,8) || 'null', '| shared_params workbaseId:', j.shared_parameters?.workbaseId?.slice(0,8) || 'null'));
})();"
```

Expected: `workbase_id` equals `shared_parameters.workbaseId` for all records that had a workbaseId.

---

### 4.2 — Phase 2: Backend Service & API Changes

#### Change 2.1 — `src/lib/services/batch-job-service.ts`

Three targeted changes to this file:

**Change 2.1a — `createJob`: Write `workbase_id` to DB**

In the `createJob` function, find the `.insert({...})` call (around line 66–82). The current insert object does NOT include `workbase_id`. Add it.

The `createJob` function signature is:
```typescript
async createJob(job: Partial<BatchJob> & { createdBy?: string }, items: Partial<BatchItem>[])
```

The `BatchJob` type (imported from `@/lib/types`) currently does not have a `workbaseId` field. We must extend the first parameter type inline rather than modifying the shared type.

**Current call site (around line 66):**
```typescript
const { data: jobData, error: jobError } = await supabase
  .from('batch_jobs')
  .insert({
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
  })
```

**Replace with (add `workbase_id` line):**
```typescript
const { data: jobData, error: jobError } = await supabase
  .from('batch_jobs')
  .insert({
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
    workbase_id: (job as any).workbaseId || null,
  })
```

Also update the `createJob` function signature to accept the extended type:

**Current:**
```typescript
async createJob(
  job: Partial<BatchJob> & { createdBy?: string },
  items: Partial<BatchItem>[]
): Promise<BatchJob>
```

**Replace with:**
```typescript
async createJob(
  job: Partial<BatchJob> & { createdBy?: string; workbaseId?: string },
  items: Partial<BatchItem>[]
): Promise<BatchJob>
```

**Change 2.1b — `getAllJobs`: Add `workbaseId` filter**

Find the `getAllJobs` function (around line 209). Update its filter parameter and query.

**Current signature:**
```typescript
async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]>
```

**Replace with:**
```typescript
async getAllJobs(userId: string, filters?: { status?: BatchJobStatus; workbaseId?: string }): Promise<BatchJob[]>
```

**Current query builder block (around line 211–219):**
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

**Replace with:**
```typescript
let query = supabase
  .from('batch_jobs')
  .select('*')
  .eq('created_by', userId);

if (filters?.status) {
  query = query.eq('status', filters.status);
}

if (filters?.workbaseId) {
  query = query.eq('workbase_id', filters.workbaseId);
}

query = query.order('created_at', { ascending: false });
```

**Change 2.1c — `getJobById`: Return `workbaseId` in the mapped object**

Find the return object in `getJobById` (around line 171–191). Currently it does NOT include `workbaseId`. Add it.

**Current return block:**
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
  configuration: {
    tier: jobData.tier,
    sharedParameters: jobData.shared_parameters || {},
    concurrentProcessing: jobData.concurrent_processing,
    errorHandling: jobData.error_handling,
  },
};
```

**Replace with:**
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
  workbaseId: jobData.workbase_id || null,
  configuration: {
    tier: jobData.tier,
    sharedParameters: jobData.shared_parameters || {},
    concurrentProcessing: jobData.concurrent_processing,
    errorHandling: jobData.error_handling,
  },
};
```

#### Change 2.2 — `src/lib/services/batch-generation-service.ts`

In `startBatchGeneration` (around line 191), the call to `batchJobService.createJob()` passes the job object. The `workbaseId` from the request is currently written only to `sharedParameters`. Add it to the job object directly so `createJob` writes it to the new column.

**Current call (around line 191):**
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

**Replace with (add `workbaseId` to the job object):**
```typescript
const batchJob = await batchJobService.createJob(
  {
    name: request.name,
    priority: request.priority || 'normal',
    status: 'queued',
    createdBy: request.userId,
    workbaseId: request.workbaseId,
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

> Note: The `sharedParameters` still stores `workbaseId` to maintain backward compatibility with `process-next` route which reads it.

#### Change 2.3 — `src/app/api/batch-jobs/route.ts`

Add `workbaseId` query param parsing and pass it to `getAllJobs`.

**Current GET handler (around line 16–46):**
```typescript
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | null;

    const jobs = await batchJobService.getAllJobs(user.id, status ? { status } : undefined);
    ...
```

**Replace with:**
```typescript
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | null;
    const workbaseId = searchParams.get('workbaseId') || undefined;

    const jobs = await batchJobService.getAllJobs(user.id, {
      ...(status ? { status } : {}),
      ...(workbaseId ? { workbaseId } : {}),
    });
    ...
```

The rest of the handler (the `simplifiedJobs` mapping, the response shape) remains unchanged.

---

### 4.3 — Phase 3: New Pages

#### New File 3.1 — Batch Jobs List Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx`

This page lists all batch jobs for the current workbase. It:
- Sits inside the workbase layout (sidebar automatically renders)
- Calls `GET /api/batch-jobs?workbaseId=[id]` to fetch workbase-scoped jobs only
- Each row links to the workbase batch job detail page at `./batch/[jobId]`
- Uses design tokens exclusively

**Complete code:**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Ban,
  Play,
  AlertTriangle,
  List,
} from 'lucide-react';

interface BatchJobSummary {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  completedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  queued:     { label: 'Queued',     badgeClass: 'bg-yellow-100 text-yellow-700',  icon: Clock },
  processing: { label: 'Processing', badgeClass: 'bg-blue-100 text-blue-700',     icon: Loader2 },
  paused:     { label: 'Paused',     badgeClass: 'bg-yellow-100 text-yellow-700',  icon: Pause },
  completed:  { label: 'Completed',  badgeClass: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  failed:     { label: 'Failed',     badgeClass: 'bg-red-100 text-red-700',       icon: XCircle },
  cancelled:  { label: 'Cancelled',  badgeClass: 'bg-gray-100 text-gray-700',     icon: Ban },
};

export default function WorkbaseBatchJobsListPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const [jobs, setJobs] = useState<BatchJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/batch-jobs?workbaseId=${workbaseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch batch jobs');
      }

      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch jobs');
    } finally {
      setLoading(false);
    }
  }, [workbaseId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getProgressPercentage = (job: BatchJobSummary) => {
    if (job.totalItems === 0) return 0;
    return Math.round((job.completedItems / job.totalItems) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Conversations
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Batch Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Generation jobs for this Work Base
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); fetchJobs(); }}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No batch jobs found for this Work Base.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
              }
            >
              Generate Conversations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
            const StatusIcon = config.icon;
            const pct = getProgressPercentage(job);
            const isActive = job.status === 'queued' || job.status === 'processing';

            return (
              <Card
                key={job.id}
                className="bg-card border-border hover:border-duck-blue/40 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch/${job.id}`
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">{job.name}</p>
                        <Badge className={`${config.badgeClass} shrink-0`}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${isActive ? 'animate-spin' : ''}`} />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {job.id.slice(0, 8)}...
                      </p>
                      {/* Progress bar */}
                      {job.totalItems > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{job.completedItems} / {job.totalItems} items</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-duck-blue rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {(job.successfulItems > 0 || job.failedItems > 0) && (
                            <div className="flex gap-3 mt-1 text-xs">
                              {job.successfulItems > 0 && (
                                <span className="text-green-700">{job.successfulItems} successful</span>
                              )}
                              {job.failedItems > 0 && (
                                <span className="text-red-700">{job.failedItems} failed</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      {job.completedAt ? (
                        <span>Completed {formatDate(job.completedAt)}</span>
                      ) : job.startedAt ? (
                        <span>Started {formatDate(job.startedAt)}</span>
                      ) : (
                        <span>Queued</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

#### New File 3.2 — Batch Job Detail/Watcher Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx`

This is the primary deliverable. It is a workbase-scoped adaptation of the legacy `src/app/(dashboard)/batch-jobs/[id]/page.tsx`.

**Key differences from legacy:**
1. Uses URL param `workbaseId` from `params.id` (the workbase ID) AND `jobId` from `params.jobId`
2. Sits within the workbase layout — no standalone container needed
3. Uses design tokens exclusively — no dark-mode classes
4. "Back" navigates to `/workbase/[id]/fine-tuning/conversations/batch`
5. CTA buttons point to workbase routes (`/workbase/[id]/fine-tuning/conversations` and `/workbase/[id]/fine-tuning/conversations/generate`)
6. All business logic (auto-process, auto-enrich, stop/resume/cancel) is IDENTICAL to legacy

**Complete code:**

```tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  Ban,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  StopCircle,
} from 'lucide-react';

interface BatchJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number;
  startedAt?: string;
  completedAt?: string;
}

export default function WorkbaseBatchJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<BatchJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    successful: number;
    failed: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Processing state
  const [processingActive, setProcessingActive] = useState(false);
  const processingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const didProcessRef = useRef(false);
  const autoEnrichTriggeredRef = useRef(false);
  const [lastItemError, setLastItemError] = useState<string | null>(null);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/conversations/batch/${jobId}/status`, {
        signal: controller.signal,
        credentials: 'same-origin',
      });
      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please sign in.');
      }

      if (response.redirected) {
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please refresh the page.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Process next item in queue
  const processNextItem = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/batch-jobs/${jobId}/process-next`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process item');
      }

      if (data.progress) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                progress: data.progress,
                status:
                  data.status === 'job_completed'
                    ? 'completed'
                    : data.status === 'job_cancelled'
                    ? 'cancelled'
                    : data.status === 'processed'
                    ? 'processing'
                    : prev.status,
              }
            : null
        );
      }

      if (data.success && data.conversationId) {
        setLastItemError(null);
      } else if (data.itemId) {
        setLastItemError(data.error || 'Unknown error');
      }

      if (
        data.status === 'job_completed' ||
        data.status === 'job_cancelled' ||
        data.status === 'no_items'
      ) {
        return false;
      }

      return data.status === 'processed' && data.remainingItems > 0;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing error';
      setLastItemError(errorMsg);
      return false;
    }
  }, [jobId]);

  // Start processing loop
  const startProcessing = useCallback(async () => {
    if (processingRef.current) return;

    processingRef.current = true;
    didProcessRef.current = true;
    setProcessingActive(true);

    let hasMore = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (hasMore && processingRef.current && iterations < maxIterations) {
      iterations++;
      hasMore = await processNextItem();

      if (hasMore && processingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    processingRef.current = false;
    setProcessingActive(false);
    await fetchStatus();
  }, [processNextItem, fetchStatus]);

  // Stop processing
  const stopProcessing = useCallback(() => {
    processingRef.current = false;
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Safety: force loading false after 5s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Failed to load job status. Please try refreshing.');
      }
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [loading]);

  // Auto-start processing when job is queued
  useEffect(() => {
    if (
      status?.status === 'queued' &&
      !processingActive &&
      !processingRef.current &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      startProcessing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, processingActive]);

  // Auto-enrich when batch completes after processing on this page visit
  useEffect(() => {
    if (
      status?.status === 'completed' &&
      status.progress.successful > 0 &&
      !processingActive &&
      didProcessRef.current &&
      !autoEnrichTriggeredRef.current &&
      !enriching &&
      !enrichResult
    ) {
      autoEnrichTriggeredRef.current = true;
      handleEnrichAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, processingActive]);

  // Job control actions
  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionLoading(true);

      if (action === 'cancel') {
        stopProcessing();
        const response = await fetch(`/api/batch-jobs/${jobId}/cancel`, {
          method: 'POST',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to cancel job');
        }
      } else {
        const response = await fetch(`/api/conversations/batch/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${action} job`);
        }
        if (action === 'pause') {
          stopProcessing();
        } else if (action === 'resume') {
          startProcessing();
        }
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk enrich handler
  const handleEnrichAll = async () => {
    if (!status || status.status !== 'completed') return;

    try {
      setEnriching(true);
      setEnrichResult(null);

      const response = await fetch(
        `/api/conversations/batch/${jobId}/items?status=completed`
      );
      const items = await response.json();

      if (!response.ok) {
        throw new Error(items.error || 'Failed to fetch batch items');
      }

      const conversationIds =
        items.data
          ?.map((item: { conversation_id: string | null }) => item.conversation_id)
          .filter(Boolean) || [];

      if (conversationIds.length === 0) {
        setEnrichResult({ successful: 0, failed: 0, skipped: 0, total: 0 });
        return;
      }

      const enrichResponse = await fetch('/api/conversations/bulk-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds }),
      });

      const enrichData = await enrichResponse.json();

      if (!enrichResponse.ok) {
        throw new Error(enrichData.error || 'Enrichment failed');
      }

      setEnrichResult(enrichData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'Calculating...';
    if (seconds <= 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}m`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-8 max-w-2xl mx-auto bg-background">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error Loading Batch Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => fetchStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch`
                  )
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Batch Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.status === 'processing' || status.status === 'queued';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isPaused = status.status === 'paused';
  const isCancelled = status.status === 'cancelled';

  const statusBadgeClass: Record<string, string> = {
    completed:  'bg-green-100 text-green-700',
    failed:     'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    paused:     'bg-yellow-100 text-yellow-700',
    cancelled:  'bg-gray-100 text-gray-700',
    queued:     'bg-muted text-muted-foreground',
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
          onClick={() =>
            router.push(
              `/workbase/${workbaseId}/fine-tuning/conversations/batch`
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Batch Jobs
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch Job</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 break-all">{jobId}</p>
          </div>
          <Badge className={statusBadgeClass[status.status] || 'bg-muted text-muted-foreground'}>
            {status.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {isActive && <Loader2 className="h-5 w-5 animate-spin text-duck-blue" />}
            {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
            {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            {isPaused && <Pause className="h-5 w-5 text-yellow-600" />}
            {isCancelled && <Ban className="h-5 w-5 text-muted-foreground" />}
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {status.progress.completed} / {status.progress.total} completed
              </span>
              <span className="font-medium text-foreground">
                {Math.round(status.progress.percentage)}%
              </span>
            </div>
            <Progress value={status.progress.percentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">{status.progress.successful}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-2xl font-bold text-red-700">{status.progress.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">
                {status.progress.total - status.progress.completed}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <div className="p-3 rounded-lg bg-muted border border-border">
              <p className="text-2xl font-bold text-foreground">{status.progress.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Time Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {status.startedAt && (
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium text-foreground">{formatDateTime(status.startedAt)}</p>
              </div>
            )}
            {isActive && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Estimated remaining</p>
                  <p className="font-medium text-foreground">
                    {formatTimeRemaining(status.estimatedTimeRemaining)}
                  </p>
                </div>
              </div>
            )}
            {status.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(status.completedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {processingActive && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing...
            </Badge>
          )}

          {processingActive && (
            <Button variant="outline" onClick={stopProcessing} disabled={actionLoading}>
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}

          {(status.status === 'processing' || status.status === 'paused') &&
            !processingActive &&
            status.progress.completed < status.progress.total && (
              <Button onClick={startProcessing} disabled={actionLoading}>
                <Play className="mr-2 h-4 w-4" />
                Resume Processing
              </Button>
            )}

          {(isActive || isPaused) && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading || processingActive}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Cancel Job
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Completion Card */}
      {isCompleted && (
        <Card className="mb-6 bg-card border-border border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Batch Complete!
            </CardTitle>
            <CardDescription className="text-green-600">
              Successfully generated {status.progress.successful} conversation
              {status.progress.successful !== 1 ? 's' : ''}
              {status.progress.failed > 0 && ` (${status.progress.failed} failed)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrichResult && (
              <div className="p-3 rounded-md bg-muted border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Enrichment Complete
                </p>
                <p className="text-xs text-muted-foreground">
                  {enrichResult.successful} enriched, {enrichResult.skipped} skipped,{' '}
                  {enrichResult.failed} failed
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!enrichResult && status.progress.successful > 0 && (
                <Button variant="secondary" onClick={handleEnrichAll} disabled={enriching}>
                  {enriching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enriching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enrich All
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations`
                  )
                }
              >
                View Conversations
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Generate More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Card */}
      {isFailed && (
        <Card className="mb-6 bg-card border-border border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Batch Failed
            </CardTitle>
            <CardDescription className="text-red-600">
              {status.progress.failed} conversation{status.progress.failed !== 1 ? 's' : ''} failed
              to generate
              {status.progress.successful > 0 && ` (${status.progress.successful} succeeded)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Successful Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Card */}
      {isCancelled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Ban className="h-5 w-5" />
              Batch Cancelled
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Job was cancelled.{' '}
              {status.progress.successful > 0
                ? `${status.progress.successful} conversation${status.progress.successful !== 1 ? 's were' : ' was'} generated before cancellation.`
                : 'No conversations were generated.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Start New Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### 4.4 — Phase 4: Modify Existing Pages

#### Change 4.1 — Conversations Page: Add "Batch Jobs" Button

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

In the page header, add a "Batch Jobs" button alongside the existing "New Conversation" button.

**Current imports (line 17):**
```tsx
import { Plus } from 'lucide-react';
```

**Replace with:**
```tsx
import { Plus, ListTodo } from 'lucide-react';
```

**Current header JSX (around line 109–125):**
```tsx
<div className="mb-6 flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
    <p className="text-muted-foreground mt-1">
      Manage training conversations for this Work Base
    </p>
  </div>
  <Button
    size="sm"
    onClick={() =>
      router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
    }
  >
    <Plus className="h-4 w-4 mr-2" />
    New Conversation
  </Button>
</div>
```

**Replace with:**
```tsx
<div className="mb-6 flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
    <p className="text-muted-foreground mt-1">
      Manage training conversations for this Work Base
    </p>
  </div>
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch`)
      }
    >
      <ListTodo className="h-4 w-4 mr-2" />
      Batch Jobs
    </Button>
    <Button
      size="sm"
      onClick={() =>
        router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
      }
    >
      <Plus className="h-4 w-4 mr-2" />
      New Conversation
    </Button>
  </div>
</div>
```

#### Change 4.2 — Generator Page: Redirect to Batch Watcher After Submission

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx`

Currently after successful batch submission, the page redirects to the conversations list. Change this to redirect to the new workbase batch job detail page so the user can immediately watch the job run.

**Find the `handleSubmit` function (around line 73–105). Current redirect line (approximately line 100):**
```tsx
router.push(`/workbase/${workbaseId}/fine-tuning/conversations`);
```

**Replace with:**
```tsx
router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch/${result.jobId}`);
```

> **Context:** `result` is the parsed JSON response from `POST /api/conversations/generate-batch`. The response shape is `{ success: boolean, jobId: string, status: string, ... }`. The `result.jobId` field contains the new batch job's UUID.

---

## 5. Complete Code

All complete code is provided inline in §4 above. The two new files are fully specified in §4.3. No additional code is needed.

---

## 6. Implementation Sequence & Dependencies

Execute in strict order. Each phase depends on the previous.

```
Phase 1: DB Schema (must be first — backend depends on this column)
  1.1  Dry-run DDL for workbase_id column on batch_jobs
  1.2  Apply DDL (add column + index)
  1.3  Backfill existing records from shared_parameters JSONB
  1.4  Verify with SAOL query

Phase 2: Backend (must come before frontend)
  2.1  batch-job-service.ts — createJob, getAllJobs, getJobById
  2.2  batch-generation-service.ts — pass workbaseId to createJob
  2.3  api/batch-jobs/route.ts — add workbaseId query param

Phase 3: New Pages (depends on Phase 2 API changes)
  3.1  Create batch/page.tsx (list)
  3.2  Create batch/[jobId]/page.tsx (detail/watcher)

Phase 4: Modify Existing Pages (depends on Phase 3 routes existing)
  4.1  conversations/page.tsx — add Batch Jobs button
  4.2  generate/page.tsx — change redirect to batch watcher

Phase 5: Build & Deploy
  5.1  npm run build — verify no TypeScript errors
  5.2  Push to git — Vercel auto-deploys
```

---

## 7. Acceptance Criteria

### Phase 1 Verification

| # | Test | Expected |
|---|------|----------|
| DB-1 | SAOL query `batch_jobs` table columns | `workbase_id` column exists (uuid, nullable) |
| DB-2 | SAOL: query `batch_jobs` where `shared_parameters->>'workbaseId' IS NOT NULL` | All such rows have `workbase_id` populated with matching UUID |
| DB-3 | Create a new batch job from the generator page | `workbase_id` is populated on the new `batch_jobs` row (SAOL verify) |

### Phase 2 Verification

| # | Test | Expected |
|---|------|----------|
| BE-1 | `GET /api/batch-jobs?workbaseId=232bea74-...` | Returns only jobs for that workbase |
| BE-2 | `GET /api/batch-jobs?workbaseId=4fc8fa25-...` | Returns only jobs for that workbase (different set) |
| BE-3 | `GET /api/batch-jobs` (no workbaseId) | Returns all jobs for the authenticated user (unchanged behavior) |

### Phase 3 Verification

| # | Test | Expected |
|---|------|----------|
| P3-1 | Navigate to `/workbase/[id]/fine-tuning/conversations/batch` | Page renders within workbase layout (sidebar visible), lists batch jobs for the workbase only |
| P3-2 | Batch jobs from a different workbase | NOT shown in the list |
| P3-3 | Click a job row | Navigates to `/workbase/[id]/fine-tuning/conversations/batch/[jobId]` |
| P3-4 | Navigate to `/workbase/[id]/fine-tuning/conversations/batch/[jobId]` | Page renders within workbase layout, shows job progress |
| P3-5 | Visit detail page for a queued job | Auto-starts processing loop immediately (no manual action needed) |
| P3-6 | Processing loop runs | Progress bar and stats update in real-time as items complete |
| P3-7 | Job completes | Auto-enrichment triggers. "Enriching..." state appears. After enrichment, result summary shown. |
| P3-8 | "View Conversations" button on completion | Navigates to `/workbase/[id]/fine-tuning/conversations` |
| P3-9 | "Generate More" button on completion | Navigates to `/workbase/[id]/fine-tuning/conversations/generate` |
| P3-10 | "Stop" button while processing | Processing loop stops. Button disappears. "Resume Processing" button appears. |
| P3-11 | "Cancel Job" button | Calls `POST /api/batch-jobs/[id]/cancel`, shows Cancelled card |
| P3-12 | "All Batch Jobs" back button | Navigates to `/workbase/[id]/fine-tuning/conversations/batch` |
| P3-13 | All UI text uses design tokens | Zero `zinc-*`, `slate-*`, `gray-*` classes. Stats blocks use `bg-green-50/border-green-100`, `bg-red-50/border-red-100`, `bg-blue-50/border-blue-100`, `bg-muted/border-border`. |

### Phase 4 Verification

| # | Test | Expected |
|---|------|----------|
| P4-1 | Conversations page header | Shows both "Batch Jobs" (outline) and "New Conversation" (filled) buttons |
| P4-2 | Click "Batch Jobs" on conversations page | Navigates to `/workbase/[id]/fine-tuning/conversations/batch` |
| P4-3 | Generator page: submit a batch | After successful submission, redirects to `/workbase/[id]/fine-tuning/conversations/batch/[jobId]` (NOT to conversations list) |
| P4-4 | Auto-start on redirect | Processing begins automatically since the new page detects `status === 'queued'` |

---

## 8. Files Modified Summary

| # | File | Change Type | Phase |
|---|------|------------|-------|
| 1 | `batch_jobs` table (via SAOL DDL) | Add `workbase_id UUID` column + index + backfill | 1 |
| 2 | `src/lib/services/batch-job-service.ts` | Update `createJob` signature + insert; add `workbaseId` filter to `getAllJobs`; return `workbaseId` from `getJobById` | 2 |
| 3 | `src/lib/services/batch-generation-service.ts` | Pass `workbaseId` to `batchJobService.createJob()` | 2 |
| 4 | `src/app/api/batch-jobs/route.ts` | Add `workbaseId` query param parsing + pass to `getAllJobs` | 2 |
| 5 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/page.tsx` | **New file** — workbase batch jobs list page | 3 |
| 6 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | **New file** — workbase-scoped batch job detail/watcher page | 3 |
| 7 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Add "Batch Jobs" button to header | 4 |
| 8 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` | Change post-submission redirect from conversations list to batch watcher | 4 |

**Files NOT modified (preserved as-is):**
- `src/app/(dashboard)/batch-jobs/[id]/page.tsx` — legacy page remains untouched
- `src/app/api/conversations/batch/[id]/status/route.ts` — unchanged
- `src/app/api/batch-jobs/[id]/process-next/route.ts` — unchanged
- `src/app/api/batch-jobs/[id]/cancel/route.ts` — unchanged
- `src/app/api/conversations/batch/[id]/route.ts` — unchanged
- `src/app/api/conversations/batch/[id]/items/route.ts` — unchanged
- `src/app/api/conversations/bulk-enrich/route.ts` — unchanged
- `src/app/(dashboard)/workbase/[id]/layout.tsx` — unchanged (batch pages inherit sidebar automatically)
