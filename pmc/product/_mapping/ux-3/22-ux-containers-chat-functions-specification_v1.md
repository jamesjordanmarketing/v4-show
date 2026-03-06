# 22 — Fine Tuning Chat: Fix Specification

**Version:** 1.0 | **Date:** 2026-03-03  
**Prerequisite:** `20-ux-containers-training-specification_v1.md` (training pipeline integration)  
**Status:** Ready for implementation

---

## READ THIS FIRST

This specification fixes the broken Fine Tuning Chat feature at `/workbase/[id]/fine-tuning/chat`. Before implementing, you MUST:

1. **Read this entire document** — it contains pre-verified database state, root cause analysis, and explicit code changes
2. **Read the files referenced** in each change to confirm the code matches what's described  
3. **Execute the SAOL DDL commands exactly as written** — dry-run first, then apply
4. **Follow the implementation sequence** — changes depend on each other

---

## Table of Contents

1. [Background Context](#1-background-context)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Fix 1: Update workbases.active\_adapter\_job\_id in Auto-Deploy Inngest Function](#3-fix-1-update-workbasesactive_adapter_job_id-in-auto-deploy-inngest-function)
4. [Fix 2: Mark Endpoints Ready for Latest Job (Data Fix)](#4-fix-2-mark-endpoints-ready-for-latest-job-data-fix)
5. [Fix 3: Add activeAdapterJobId Support to Workbase PATCH API](#5-fix-3-add-activeadapterjobid-support-to-workbase-patch-api)
6. [Fix 4: Harden Chat Page — Fallback Adapter Resolution](#6-fix-4-harden-chat-page--fallback-adapter-resolution)
7. [Fix 5: Deploy Endpoints Automatically on Chat Page Load](#7-fix-5-deploy-endpoints-automatically-on-chat-page-load)
8. [Implementation Sequence](#8-implementation-sequence)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Files Modified Summary](#10-files-modified-summary)

---

## 1. Background Context

### Platform

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application. Generates AI training conversations, enriches them, aggregates into JSONL, trains LoRA adapters on RunPod GPUs, and auto-deploys to Hugging Face + RunPod inference endpoints.

**Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Storage), Inngest (background jobs), TanStack Query v5, Zustand, shadcn/UI + Tailwind CSS, RunPod (GPU training + inference), Hugging Face Hub (adapter hosting).

**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

### The Workbase Architecture

The application uses a "workbase" concept — a container that groups conversations, documents, training sets, and adapters. Each workbase has an `active_adapter_job_id` column that links to the most recently deployed pipeline training job. The chat page uses this to resolve which RunPod inference endpoint to talk to.

### The Complete Adapter Deployment Chain

```
Training Job (pipeline_training_jobs) completes on RunPod GPU
  → RunPod callback updates job status to 'completed' with adapter_file_path
  → Supabase Database Webhook fires on UPDATE
  → POST /api/webhooks/training-complete
  → Inngest event: 'pipeline/adapter.ready'
  → autoDeployAdapter function:
      Step 1: Validate completed job
      Step 2+3: Download from Storage → Push to HuggingFace Hub
      Step 4: Update RunPod LORA_MODULES env var via GraphQL
      Step 4b: Emit 'pipeline/adapter.deployed' event
      Step 5: Optional vLLM hot reload
      Step 6: Create pipeline_inference_endpoints records (status='deploying')
      Step 7: Write hf_adapter_path back to pipeline_training_jobs
  → refreshInferenceWorkers function (triggered by adapter.deployed):
      Step 1: Scale RunPod workers to 0
      Step 2: Wait for workers to terminate
      Step 3: Scale workers back up (with MAX_LORAS=5)
      Step 4: Wait for workers to become ready
      Step 5: Verify adapter available via runsync
      Step 6: Mark pipeline_inference_endpoints status='ready'
  → ★ MISSING: Update workbases.active_adapter_job_id ← THIS IS THE BUG
```

### The Chat Page Flow

```
/workbase/[id]/fine-tuning/chat (BehaviorChatPage)
  → useWorkbase(workbaseId) fetches workbase record
  → Reads workbase.activeAdapterJobId
  → If null → shows "No adapter available" ← USER SEES THIS
  → If set → useEndpointStatus(activeAdapterJobId) checks endpoint deployment
  → Passes jobId to MultiTurnChat component
  → MultiTurnChat → useDualChat(jobId)
  → useDualChat fetches conversations, creates turns via API
  → Turn API → multi-turn-conversation-service.ts
  → Service queries pipeline_inference_endpoints by job_id
  → Calls RunPod inference endpoints (control + adapted)
```

### SAOL Requirement

**ALL agent-driven database operations (DDL, queries, inserts) MUST use SAOL** (Supabase Agent Ops Library) at `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Dry-run first, then set dryRun: false
  const r = await saol.agentExecuteSQL({
    sql: 'YOUR SQL HERE',
    transport: 'pg',
    dryRun: true
  });
  console.log(r);
})();"
```

**Rules:** Always `dryRun: true` first, then `dryRun: false` to apply. Always `transport: 'pg'` for DDL. Application code (API routes, Inngest functions) uses `createServerSupabaseAdminClient()` — NOT SAOL.

Full SAOL guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

### Design Token Rules

All new/modified UI code MUST use the application's semantic design tokens:
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` classes in any new or modified code**

---

## 2. Root Cause Analysis

### Verified Database State (as of 2026-03-03)

**Workbase record** (`232bea74-b987-4629-afbc-a21180fe6e84`):
```json
{
  "id": "232bea74-b987-4629-afbc-a21180fe6e84",
  "name": "rag-KB-v2_v1",
  "active_adapter_job_id": null,   ← ROOT CAUSE #1: Never set
  "status": "active"
}
```

**Latest training job** (`a2de86d6-944e-4eba-ba40-b831130201bd`):
```json
{
  "id": "a2de86d6-944e-4eba-ba40-b831130201bd",
  "job_name": "QA-2-cnv-adapter-03-02-26-launch-a",
  "status": "completed",                             ← Training succeeded
  "workbase_id": "232bea74-b987-4629-afbc-a21180fe6e84",  ← Linked to workbase
  "hf_adapter_path": "BrightHub2/lora-emotional-intelligence-a2de86d6",  ← Deployed to HF
  "adapter_file_path": "lora-models/adapters/a2de86d6-944e-4eba-ba40-b831130201bd.tar.gz",
  "progress": 100,
  "training_time_seconds": 13,
  "final_loss": 0
}
```

**Inference endpoints** for job `a2de86d6`:
```json
[
  { "endpoint_type": "control", "status": "deploying", "ready_at": null },
  { "endpoint_type": "adapted", "status": "deploying", "ready_at": null,
    "adapter_path": "BrightHub2/lora-emotional-intelligence-a2de86d6" }
]
```

### Three Root Causes Identified

| # | Root Cause | Impact | Fix |
|---|-----------|--------|-----|
| **RC-1** | `autoDeployAdapter` Inngest function never updates `workbases.active_adapter_job_id` after deployment | Chat page reads `workbase.activeAdapterJobId` → gets `null` → shows "No adapter available" | Fix 1: Add Step 7b to `autoDeployAdapter` |

| **RC-2** | `pipeline_inference_endpoints` for job `a2de86d6` are stuck in `deploying` status | Even if RC-1 is fixed, the chat page and `createConversation` service check `bothReady` → would fail since endpoints aren't `ready` | Fix 2: Data fix via SAOL, and root-cause is likely `refreshInferenceWorkers` failed on this run |

| **RC-3** | Workbase PATCH API route doesn't accept `active_adapter_job_id` updates | No API path exists to set the adapter job ID on a workbase (neither from Inngest nor from the frontend) | Fix 3: Extend PATCH handler |

### Additional Hardening Needed

| # | Issue | Fix |
|---|-------|-----|
| **H-1** | Chat page shows nothing useful when adapter exists but endpoints are `deploying` | Fix 4: Add fallback adapter resolution + auto-deploy |
| **H-2** | `MultiTurnChat` uses `text-zinc-500` (violates design tokens) | Fix 4: Replace with `text-muted-foreground` |

---

## 3. Fix 1: Update `workbases.active_adapter_job_id` in Auto-Deploy Inngest Function

**File:** `src/inngest/functions/auto-deploy-adapter.ts`

**Problem:** The function completes 7 steps (fetch job → push to HF → update RunPod → refresh workers → create endpoint records → write hf_adapter_path) but **never writes back to the `workbases` table**. The training job has `workbase_id` set, but nothing uses it to update the workbase.

**Solution:** Add a new Step 7b after Step 7 (`update-job-hf-path`) that updates `workbases.active_adapter_job_id` when the training job has a `workbase_id`.

### 3.1 — Fetch `workbase_id` in Step 1

The current Step 1 (`fetch-job`) only selects `id, user_id, status, adapter_file_path, hf_adapter_path`. We need to also fetch `workbase_id` so it's available for the new step.

**Current code (around line 85-100):**
```typescript
    // Step 1: Fetch and validate the completed job
    const job = await step.run('fetch-job', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('pipeline_training_jobs')
        .select('id, user_id, status, adapter_file_path, hf_adapter_path')
        .eq('id', jobId)
        .single();
```

**Replace the `.select(...)` line with:**
```typescript
        .select('id, user_id, status, adapter_file_path, hf_adapter_path, workbase_id')
```

This adds `workbase_id` to the fetched job data so it's available in the function scope.

### 3.2 — Add Step 7b: Update Workbase `active_adapter_job_id`

**After the existing Step 7 block** (the `update-job-hf-path` step, which ends around line 490-500 with a closing `});`), add this new step:

```typescript
    // Step 7b: Update workbase.active_adapter_job_id (if job was created from a workbase)
    if (job.workbase_id) {
      await step.run('update-workbase-active-adapter', async () => {
        const supabase = createServerSupabaseAdminClient();
        const { error } = await supabase
          .from('workbases')
          .update({
            active_adapter_job_id: jobId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.workbase_id);

        if (error) {
          // Non-fatal: log but don't fail the deployment
          console.error(
            `[AutoDeployAdapter] Failed to update workbase ${job.workbase_id} active_adapter_job_id: ${error.message}`
          );
        } else {
          console.log(
            `[AutoDeployAdapter] ✓ Workbase ${job.workbase_id} active_adapter_job_id set to ${jobId}`
          );
        }
      });
    }
```

**Place this code between Step 7 and the final `return` statement.** The `return` statement is at the very end of the function:

```typescript
    return { success: true, jobId, adapterName, hfPath: hfUploadResult.hfPath, filesUploaded: hfUploadResult.uploadedFiles.length };
```

### 3.3 — Include `workbaseId` in Return Value

Update the final return statement to include the workbase ID for observability:

**Current:**
```typescript
    return { success: true, jobId, adapterName, hfPath: hfUploadResult.hfPath, filesUploaded: hfUploadResult.uploadedFiles.length };
```

**Replace with:**
```typescript
    return { success: true, jobId, adapterName, hfPath: hfUploadResult.hfPath, filesUploaded: hfUploadResult.uploadedFiles.length, workbaseId: job.workbase_id || null };
```

---

## 4. Fix 2: Mark Endpoints Ready for Latest Job (Data Fix)
### This is COMPLETE. Do NOT EXECUTE
**Problem:** The `pipeline_inference_endpoints` for job `a2de86d6` are stuck in `deploying` status. The `refreshInferenceWorkers` Inngest function either failed or the worker cycle didn't complete properly. The adapter IS deployed to HF and RunPod LORA_MODULES — the endpoint records just weren't marked `ready`.

### 4.1 — Fix Database State via SAOL

Run these commands in sequence in the terminal:

**Step A — Dry-run: Mark endpoints as ready:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE pipeline_inference_endpoints SET status = 'ready', ready_at = NOW() WHERE job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd' AND status = 'deploying'\",
    transport: 'pg',
    dryRun: true
  });
  console.log('Dry-run:', JSON.stringify(r, null, 2));
})();"
```

**Step B — Apply (set dryRun: false):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE pipeline_inference_endpoints SET status = 'ready', ready_at = NOW() WHERE job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd' AND status = 'deploying'\",
    transport: 'pg',
    dryRun: false
  });
  console.log('Applied:', JSON.stringify(r, null, 2));
})();"
```

**Step C — Verify:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"SELECT endpoint_type, status, ready_at FROM pipeline_inference_endpoints WHERE job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd'\",
    transport: 'pg',
    dryRun: false
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

### 4.2 — Set `workbases.active_adapter_job_id` for Existing Workbase

**Step A — Dry-run:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE workbases SET active_adapter_job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd', updated_at = NOW() WHERE id = '232bea74-b987-4629-afbc-a21180fe6e84'\",
    transport: 'pg',
    dryRun: true
  });
  console.log('Dry-run:', JSON.stringify(r, null, 2));
})();"
```

**Step B — Apply:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"UPDATE workbases SET active_adapter_job_id = 'a2de86d6-944e-4eba-ba40-b831130201bd', updated_at = NOW() WHERE id = '232bea74-b987-4629-afbc-a21180fe6e84'\",
    transport: 'pg',
    dryRun: false
  });
  console.log('Applied:', JSON.stringify(r, null, 2));
})();"
```

**Step C — Verify:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: \"SELECT id, name, active_adapter_job_id FROM workbases WHERE id = '232bea74-b987-4629-afbc-a21180fe6e84'\",
    transport: 'pg',
    dryRun: false
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

---

## 5. Fix 3: Add `activeAdapterJobId` Support to Workbase PATCH API

**File:** `src/app/api/workbases/[id]/route.ts`

**Problem:** The PATCH handler only handles `name`, `description`, and `status` updates. The Inngest function in Fix 1 writes directly to the DB via `createServerSupabaseAdminClient()` (which bypasses the API route), but for future use and for the frontend to be able to display/manage the adapter status, the PATCH route should also accept `activeAdapterJobId`.

**Current PATCH handler body parsing (around line 38-42):**
```typescript
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;
```

**Replace with:**
```typescript
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.activeAdapterJobId !== undefined) updates.active_adapter_job_id = body.activeAdapterJobId || null;
```

Also update the `UpdateWorkbaseRequest` type:

**File:** `src/types/workbase.ts`

**Current (around line 38-42):**
```typescript
export interface UpdateWorkbaseRequest {
  name?: string;
  description?: string;
  status?: WorkbaseStatus;
}
```

**Replace with:**
```typescript
export interface UpdateWorkbaseRequest {
  name?: string;
  description?: string;
  status?: WorkbaseStatus;
  activeAdapterJobId?: string | null;
}
```

---

## 6. Fix 4: Harden Chat Page — Fallback Adapter Resolution

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx`

**Problem A:** When `workbase.activeAdapterJobId` is null but a completed training job exists for the workbase, the chat page shows "No adapter available" with no way to recover.

**Problem B:** The `MultiTurnChat` component uses `text-zinc-500` which violates design token rules.

### 6.1 — Add Fallback Job Lookup to Chat Page

When `activeAdapterJobId` is null, the page should query for the most recent completed training job linked to this workbase and offer to use it (or auto-use it).

**Complete replacement for `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx`:**

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { useEndpointStatus, useDeployAdapter } from '@/hooks/useAdapterTesting';
import { usePipelineJobs } from '@/hooks/usePipelineJobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { MultiTurnChat } from '@/components/pipeline/chat/MultiTurnChat';
import { useEffect, useState } from 'react';

type AvailabilityState = 'loading' | 'empty' | 'no_adapter' | 'deploying' | 'ready' | 'endpoints_not_ready';

export default function BehaviorChatPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading: isLoadingWorkbase } = useWorkbase(workbaseId);

  // Check for completed jobs in this workbase (fallback when activeAdapterJobId is null)
  const { data: jobsData } = usePipelineJobs({ limit: 5, workbaseId });
  const recentJobs = (jobsData as any)?.data || [];
  const latestCompletedJob = recentJobs.find(
    (j: any) => j.status === 'completed' && j.hfAdapterPath
  );

  // Resolve the effective job ID: prefer workbase.activeAdapterJobId, fall back to latest completed job
  const effectiveJobId = workbase?.activeAdapterJobId || latestCompletedJob?.id || null;

  const { data: endpointData, isLoading: isLoadingEndpoints } = useEndpointStatus(effectiveJobId);
  const controlStatus = endpointData?.data?.controlEndpoint?.status;
  const adaptedStatus = endpointData?.data?.adaptedEndpoint?.status;
  const bothReady = endpointData?.data?.bothReady;

  // Auto-deploy endpoints if job exists but no endpoint records
  const deployAdapter = useDeployAdapter();
  const [autoDeployAttempted, setAutoDeployAttempted] = useState(false);

  useEffect(() => {
    if (
      effectiveJobId &&
      !isLoadingEndpoints &&
      endpointData &&
      !endpointData.data?.controlEndpoint &&
      !endpointData.data?.adaptedEndpoint &&
      !autoDeployAttempted
    ) {
      // No endpoint records exist — trigger deploy
      setAutoDeployAttempted(true);
      deployAdapter.mutate({ jobId: effectiveJobId, forceRedeploy: false });
    }
  }, [effectiveJobId, isLoadingEndpoints, endpointData, autoDeployAttempted, deployAdapter]);

  const hasAdapter = !!effectiveJobId;
  const hasDocs = (workbase?.documentCount || 0) > 0;

  let availability: AvailabilityState = 'loading';
  if (isLoadingWorkbase) {
    availability = 'loading';
  } else if (!hasAdapter && !hasDocs) {
    availability = 'empty';
  } else if (!hasAdapter) {
    availability = 'no_adapter';
  } else if (controlStatus === 'deploying' || adaptedStatus === 'deploying') {
    availability = 'deploying';
  } else if (bothReady) {
    availability = 'ready';
  } else if (hasAdapter && !bothReady && !isLoadingEndpoints) {
    availability = 'endpoints_not_ready';
  }

  if (availability === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Behavior Chat</h1>
        <p className="text-sm text-muted-foreground">Chat with your trained AI</p>
      </div>

      {availability === 'empty' && (
        <div className="mx-6 mt-4">
          <Card className="border-dashed border-border bg-card">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No adapter has been trained yet. Build a training set and launch tuning first.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Go to Conversations
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {availability === 'no_adapter' && (
        <div className="mx-6 mt-4">
          <Card className="border-dashed border-border bg-card">
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No adapter available. Launch tuning to activate a model.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/launch`)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Launch Tuning
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {availability === 'deploying' && (
        <div className="mx-6 mt-4 p-3 bg-muted border border-border rounded-md flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-duck-blue" />
          <span className="text-sm text-muted-foreground">
            Your adapter is being deployed. Workers are cycling — this takes 2–3 minutes.
          </span>
        </div>
      )}

      {availability === 'endpoints_not_ready' && (
        <div className="mx-6 mt-4">
          <Card className="border-border bg-card">
            <CardContent className="py-6 text-center">
              <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground mb-2">
                Setting up inference endpoints...
              </p>
              <p className="text-xs text-muted-foreground">
                Control: {controlStatus || 'pending'} · Adapted: {adaptedStatus || 'pending'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {(availability === 'ready' || availability === 'deploying') && effectiveJobId && (
        <div className="flex-1 overflow-hidden">
          <MultiTurnChat workbaseId={workbaseId} jobId={effectiveJobId} />
        </div>
      )}
    </div>
  );
}
```

**Key changes:**
1. **Fallback adapter resolution:** When `activeAdapterJobId` is null, queries `usePipelineJobs({ workbaseId })` to find the latest completed job with an HF adapter path
2. **Auto-deploy endpoints:** If a job exists but no `pipeline_inference_endpoints` records found, automatically triggers `deployAdapter` mutation
3. **Explicit `jobId` prop:** Passes `jobId={effectiveJobId}` to `MultiTurnChat` so it always has a resolved job ID
4. **Better empty states:** Separate cards for "no adapter at all" vs "endpoints deploying"
5. **Design token compliance:** All `zinc-*` classes removed, uses `text-muted-foreground`, `bg-muted`, `border-border`

### 6.2 — Fix `MultiTurnChat` Design Token Violation

**File:** `src/components/pipeline/chat/MultiTurnChat.tsx`

**Current (around line 26-29):**
```tsx
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500">
        No adapter available. Launch tuning to activate a model.
      </div>
    );
```

**Replace with:**
```tsx
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No adapter available. Launch tuning to activate a model.
      </div>
    );
```

---

## 7. Fix 5: Deploy Endpoints Automatically on Chat Page Load

**Already handled in Fix 4** — the chat page now auto-deploys endpoints via `useDeployAdapter()` when:
- An `effectiveJobId` exists (from workbase record or fallback query)
- No endpoint records are found for that job
- The auto-deploy hasn't been attempted yet in this session

The `deployAdapterEndpoints` service function (in `src/lib/services/inference-service.ts`) already handles the logic of:
- Checking for existing endpoint records
- Creating control + adapted endpoint records with `status: 'ready'`
- Using the real inference URLs from environment config

This means that even if the Inngest `refreshInferenceWorkers` function fails, the chat page can recover by deploying endpoints on demand. The caveat is that the adapter must already be loaded on RunPod (which it is, since `autoDeployAdapter` Step 4 updates LORA_MODULES).

---

## 8. Implementation Sequence

Execute fixes in this exact order:

```
Fix 2 (Data Fix — SAOL commands)
  2.1  Mark endpoints ready for job a2de86d6      ← terminal command
  2.2  Set workbase active_adapter_job_id          ← terminal command
       → This immediately fixes the chat page for the existing workbase

Fix 1 (Auto-Deploy Inngest — prevent recurrence)
  1.1  Add workbase_id to Step 1 select            ← edit auto-deploy-adapter.ts
  1.2  Add Step 7b: update workbase                ← edit auto-deploy-adapter.ts
  1.3  Include workbaseId in return value           ← edit auto-deploy-adapter.ts

Fix 3 (PATCH API — enable future updates)
  3.1  Update UpdateWorkbaseRequest type            ← edit types/workbase.ts
  3.2  Update PATCH handler                         ← edit workbases/[id]/route.ts

Fix 4 (Harden Chat Page)
  4.1  Rewrite chat page with fallback resolution   ← replace chat/page.tsx
  4.2  Fix MultiTurnChat design token               ← edit MultiTurnChat.tsx

Build & deploy:
  npm run build                                     ← verify no TypeScript errors
  git add . && git commit && git push               ← Vercel auto-deploys
```

**Why this order:**
- Fix 2 (data fix) immediately restores chat functionality for the existing user
- Fix 1 (Inngest update) prevents the problem from recurring on future training jobs
- Fix 3 (API update) is a type-safe extension, low risk
- Fix 4 (page hardening) adds resilience for edge cases

---

## 9. Acceptance Criteria

### Fix 2 Verification (Data Fix)

| # | Test | Expected |
|---|------|----------|
| F2-1 | SAOL: Query `pipeline_inference_endpoints` for job `a2de86d6` | Both records show `status: 'ready'`, `ready_at` is set |
| F2-2 | SAOL: Query `workbases` for workbase `232bea74` | `active_adapter_job_id = 'a2de86d6-...'` |
| F2-3 | Navigate to `https://v4-show.vercel.app/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/chat` | Chat interface loads (no "No adapter available" message) |
| F2-4 | In the chat, click "New Chat" → enter messages in both fields → send | Both control and adapted responses appear |

### Fix 1 Verification (Inngest)

| # | Test | Expected |
|---|------|----------|
| F1-1 | Train a new adapter from the workbase fine-tuning flow | After training completes and auto-deploy runs, SAOL query shows `workbases.active_adapter_job_id` = new job ID |
| F1-2 | Check Inngest dashboard | `auto-deploy-adapter` function shows `update-workbase-active-adapter` step completed |

### Fix 3 Verification (API)

| # | Test | Expected |
|---|------|----------|
| F3-1 | `PATCH /api/workbases/[id]` with `{ "activeAdapterJobId": "some-uuid" }` | Returns success, workbase `active_adapter_job_id` updated |
| F3-2 | `PATCH /api/workbases/[id]` with `{ "activeAdapterJobId": null }` | Returns success, clears the field |

### Fix 4 Verification (Chat Page Hardening)

| # | Test | Expected |
|---|------|----------|
| F4-1 | Navigate to chat page for workbase with `active_adapter_job_id = null` but has completed jobs | Falls back to latest completed job, shows chat interface |
| F4-2 | Navigate to chat page for workbase with no completed jobs at all | Shows "No adapter available. Launch tuning to activate a model." with CTA button |
| F4-3 | Inspect page for `zinc-*` or `gray-*` CSS classes | None found — all use semantic tokens |
| F4-4 | Navigate to chat page where endpoints exist but are `deploying` | Shows "Your adapter is being deployed" spinner message |

---

## 10. Files Modified Summary

| # | File | Change Type | Fix |
|---|------|------------|-----|
| 1 | `pipeline_inference_endpoints` table (via SAOL) | Data fix: mark 2 rows `ready` | 2 |
| 2 | `workbases` table (via SAOL) | Data fix: set `active_adapter_job_id` | 2 |
| 3 | `src/inngest/functions/auto-deploy-adapter.ts` | Add `workbase_id` to select; add Step 7b | 1 |
| 4 | `src/types/workbase.ts` | Add `activeAdapterJobId` to `UpdateWorkbaseRequest` | 3 |
| 5 | `src/app/api/workbases/[id]/route.ts` | Accept `activeAdapterJobId` in PATCH handler | 3 |
| 6 | `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx` | **Full rewrite** — fallback resolution, auto-deploy, better states | 4 |
| 7 | `src/components/pipeline/chat/MultiTurnChat.tsx` | Replace `text-zinc-500` with `text-muted-foreground` | 4 |

**Files NOT modified (preserved as-is):**
- `src/hooks/useWorkbases.ts` — hook already reads `activeAdapterJobId` correctly
- `src/hooks/useDualChat.ts` — works correctly once it receives a valid `jobId`
- `src/hooks/useAdapterTesting.ts` — `useEndpointStatus` already handles all status checks
- `src/lib/services/inference-service.ts` — deploy/status services work correctly
- `src/lib/services/multi-turn-conversation-service.ts` — turn service works once endpoints are ready
- `src/inngest/functions/refresh-inference-workers.ts` — existing logic is correct
- `src/inngest/functions/dispatch-training-job.ts` — unchanged
- `src/app/api/webhooks/training-complete/route.ts` — unchanged
