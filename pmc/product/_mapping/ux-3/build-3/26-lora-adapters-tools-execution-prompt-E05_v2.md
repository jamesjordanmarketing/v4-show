# Spec 26: LoRA Adapter Detail Page — E05: Final Integration

**Version:** 2.0
**Date:** 2026-03-03
**Prompt:** E05 of 5 — FINAL
**Prerequisites:** E01, E02, E03, E04 all complete
**Next:** None — this completes Spec 26

---

## Changes from v1

The following corrections were made based on reading the actual codebase before authoring this version:

1. **Prerequisites now lists all 5 E04 hooks** — v1 only listed `useDeploymentLog` and `useAdapterPing`. E04 also produced `useRestartStatus`, `useTriggerRestart`, and `useRemoveAdapter`. The page now imports and uses `useRemoveAdapter` for the Lifecycle Actions card (replacing the v1 raw `fetch` + native `confirm/alert` pattern).

2. **`hfAdapterPath` source corrected** — `PipelineTrainingJob` (in `src/types/pipeline.ts`) has no `hfAdapterPath` field — confirmed by reading the type. The HF path is stored in `deployment_log.hf_path` as part of `DeploymentLog`. The page now reads it from `deploymentLog?.hf_path` instead of `(job as any).hfAdapterPath`.

3. **`adapterId` derivation improved** — `DeploymentLog.adapter_name` is the canonical adapter ID (e.g. `"adapter-e8fa481f"`). When `deploymentLog` is available, the page now uses `deploymentLog.adapter_name` as the primary source, falling back to `adapter-${jobId.substring(0, 8)}` for jobs without a deployment log.

4. **TypeScript validation command corrected** — The project's `tsconfig.json` lives in `src/`. Running `npx tsc --noEmit` from the project root outputs help text. The correct command (confirmed in E04) is `cd src && npx tsc --noEmit -p tsconfig.json`.

5. **Common fixes reduced to one** — E01–E04 all passed TypeScript validation with zero errors. The only relevant remaining fix is `adapterStatus` missing from `PipelineTrainingJob` in `src/types/pipeline.ts` (E01 added the DB column but did not update this TypeScript type).

6. **Lifecycle Actions uses `useRemoveAdapter` + `AlertDialog` + `toast`** — Replaces the v1 approach of raw `fetch` + `window.confirm` + `window.alert`. Consistent with the pattern established in `EndpointRestartTool.tsx`.

7. **Adapter History map confirmed** — Exact code at lines 386–403 of `launch/page.tsx` matches the v1 description. `useRouter` (line 4) and `workbaseId` (line 78) are already in scope. `JOB_STATUS_LABELS` is defined at line 65. No changes needed to the pre-change verification steps.

---

## What This Prompt Builds

1. **New Adapter Detail Page** — `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx` — assembled from E04 components
2. **Modify `launch/page.tsx`** — makes Adapter History entries with `status === 'completed'` clickable links to the detail page (one targeted change to lines 386–403)
3. **Full TypeScript validation sweep** across all files modified in E01–E05
4. **Acceptance criteria checklist** for manual QA

---

## Platform Context

**Project:** Bright Run LoRA Training Data Platform
**Stack:** Next.js 14 (App Router), TypeScript, TanStack Query v5, shadcn/UI + Tailwind CSS
**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**Route structure:**
- Launch Tuning page: `/workbase/[id]/fine-tuning/launch` (existing)
- **New** Adapter Detail Page: `/workbase/[id]/fine-tuning/launch/adapter/[jobId]`

**Design Token Rules — STRICT:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*`**
- Exception for semantic status: `text-green-600`, `text-destructive`, `text-yellow-500` acceptable

**Existing `usePipelineJob` hook** (from `src/hooks/usePipelineJobs.ts`):
```typescript
export function usePipelineJob(jobId: string | null) // returns { data: { data: PipelineTrainingJob }, isLoading }
```

**`PipelineTrainingJob` confirmed camelCase fields** (from `src/types/pipeline.ts`):
- `job.jobName` — job name
- `job.trainingSensitivity`, `job.trainingProgression`, `job.trainingRepetition` — training params
- `job.estimatedCost`, `job.trainingTimeSeconds` — cost/duration
- **`adapterStatus` is NOT in this type** — it must be added (see Common Fixes)
- **`hfAdapterPath` does NOT exist** — HF path comes from `deploymentLog.hf_path` instead

**`launch/page.tsx` (confirmed state):**
- `useRouter` imported at line 4 — already in scope as `router` (line 77)
- `workbaseId = params.id as string` at line 78 — already in scope
- `JOB_STATUS_LABELS` defined at line 65
- Adapter History `map` block at lines 386–403

---

## Critical Rules

1. **Read both target files before editing:**
   - `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` — to find exact Adapter History map block (already confirmed at lines 386–403 but code may have changed)
   - `src/types/pipeline.ts` — to confirm `PipelineTrainingJob` fields before using them in the page
2. **The detail page is `'use client'`** — it uses hooks and router.
3. **Only one change to `launch/page.tsx`** — the Adapter History map. Do not touch anything else in that file.
4. **`hfAdapterPath` comes from `deploymentLog?.hf_path`**, not from the job object.
5. **`adapterStatus` requires a type fix** — see Common Fixes below before the TypeScript sweep.

---

========================

## EXECUTION PROMPT E05

You are implementing the final integration layer for **Spec 26: LoRA Adapter Detail Page** in the Bright Run LoRA Training Data Platform.

**Prerequisites from E04:**
- `src/hooks/useAdapterDetail.ts` — exports `adapterDetailKeys`, `useDeploymentLog`, `useAdapterPing`, `useRestartStatus`, `useTriggerRestart`, `useRemoveAdapter`
- `src/components/pipeline/DeploymentTimeline.tsx` — props: `{ deploymentLog: DeploymentLog | null, isLoading: boolean }`
- `src/components/pipeline/AdapterStatusPing.tsx` — props: `{ jobId: string, adapterId: string, pingData: AdapterPingResult | undefined, isFetching: boolean, onRefresh: () => void }`
- `src/components/pipeline/EndpointRestartTool.tsx` — props: `{ jobId: string, adapterId: string }`

**Files to create:**
- `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

**Files to modify:**
- `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

---

### Step 1: Read Target Files

Before making any changes, read:
1. `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` — full file; confirm Adapter History `map` block is still at lines 386–403 and matches the expected pattern
2. `src/types/pipeline.ts` — confirm `PipelineTrainingJob` fields (specifically verify `adapterStatus` is absent)
3. `src/hooks/usePipelineJobs.ts` — confirm `usePipelineJob` return shape

---

### Step 2: Fix `PipelineTrainingJob` Type

**Before creating the page**, add `adapterStatus` to `PipelineTrainingJob` in `src/types/pipeline.ts`. This field was added to the DB in the E01 migration but was not added to the TypeScript type at that time.

Locate the `PipelineTrainingJob` interface. Add the field in the Results section, alongside `adapterFilePath`:

```typescript
  // Results
  finalLoss: number | null;
  trainingTimeSeconds: number | null;
  adapterFilePath: string | null;
  adapterDownloadUrl: string | null;
  adapterStatus: 'active' | 'superseded' | 'deleted' | null;  // added by Spec 26
```

This removes the need for `as any` casts on `adapterStatus` in the page component.

---

### Step 3: Create the Adapter Detail Page

Create the directory and file:

**File to create:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import {
  useDeploymentLog,
  useAdapterPing,
  useRemoveAdapter,
} from '@/hooks/useAdapterDetail';
import { DeploymentTimeline } from '@/components/pipeline/DeploymentTimeline';
import { AdapterStatusPing } from '@/components/pipeline/AdapterStatusPing';
import { EndpointRestartTool } from '@/components/pipeline/EndpointRestartTool';

export default function AdapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Fetch job data
  const { data: jobData, isLoading: isJobLoading } = usePipelineJob(jobId);
  const job = jobData?.data || null;

  // Fetch deployment log
  const { data: deploymentLog, isLoading: isDeploymentLoading } = useDeploymentLog(jobId);

  // Adapter ID — canonical source is deployment_log.adapter_name; fall back to derived ID
  const adapterId = deploymentLog?.adapter_name ?? `adapter-${jobId.substring(0, 8)}`;

  // Adapter ping — user-triggered only (enabled: false in the hook)
  const {
    data: pingData,
    isFetching: isPinging,
    refetch: triggerPing,
  } = useAdapterPing(jobId);

  // Remove adapter mutation
  const removeAdapterMutation = useRemoveAdapter(jobId);

  const handleRemoveAdapter = async () => {
    setShowRemoveConfirm(false);
    try {
      const result = await removeAdapterMutation.mutateAsync();
      toast.success(result.data.message);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove adapter');
    }
  };

  // Loading state
  if (isJobLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Adapter not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Lifecycle badge — adapterStatus added to PipelineTrainingJob in Step 2
  const adapterStatus = job.adapterStatus;
  const adapterStatusLabel =
    adapterStatus === 'superseded' ? 'Superseded'
    : adapterStatus === 'deleted' ? 'Deleted'
    : 'Active';

  const adapterStatusVariant: 'default' | 'secondary' =
    adapterStatus === 'active' || !adapterStatus ? 'default' : 'secondary';

  // HF path comes from deployment_log — not from PipelineTrainingJob
  const hfPath = deploymentLog?.hf_path ?? null;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/launch`)}
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Launch Tuning
        </button>
        <span>›</span>
        <span className="text-foreground font-medium">
          {job.jobName || adapterId}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground">
            {job.jobName || 'Adapter Details'}
          </h1>
          <Badge variant={adapterStatusVariant}>{adapterStatusLabel}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-sm font-mono text-muted-foreground">{adapterId}</code>
          {hfPath && (
            <a
              href={`https://huggingface.co/${hfPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-duck-blue hover:underline"
            >
              View on HuggingFace →
            </a>
          )}
        </div>
      </div>

      {/* Main grid — Deployment Report (left) + Status + Restart (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Deployment Timeline */}
        <DeploymentTimeline
          deploymentLog={deploymentLog ?? null}
          isLoading={isDeploymentLoading}
        />

        {/* Right: Status Ping + Restart (stacked) */}
        <div className="space-y-6">
          <AdapterStatusPing
            jobId={jobId}
            adapterId={adapterId}
            pingData={pingData}
            isFetching={isPinging}
            onRefresh={() => triggerPing()}
          />

          <EndpointRestartTool
            jobId={jobId}
            adapterId={adapterId}
          />
        </div>
      </div>

      {/* Training Configuration */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Training Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sensitivity</p>
              <p className="font-medium text-foreground capitalize">
                {job.trainingSensitivity || '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Progression</p>
              <p className="font-medium text-foreground capitalize">
                {job.trainingProgression || '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Repetition</p>
              <p className="font-medium text-foreground">
                {job.trainingRepetition ? `${job.trainingRepetition} epochs` : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Cost</p>
              <p className="font-medium text-foreground">
                {job.estimatedCost ? `$${job.estimatedCost.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
          {job.trainingTimeSeconds && (
            <p className="text-xs text-muted-foreground mt-3">
              Training duration: {Math.floor(job.trainingTimeSeconds / 60)}m {job.trainingTimeSeconds % 60}s
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Lifecycle Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This adapter is{' '}
            <span className="text-foreground font-medium">{adapterStatusLabel.toLowerCase()}</span>{' '}
            for this Work Base.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={
                adapterStatus === 'superseded' ||
                adapterStatus === 'deleted' ||
                removeAdapterMutation.isPending
              }
              onClick={() => setShowRemoveConfirm(true)}
            >
              {removeAdapterMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove from RunPod'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Removing an adapter from RunPod does not delete it from HuggingFace.
            Workers will need to restart before the adapter is fully unloaded from GPU memory.
          </p>
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Adapter from RunPod?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <code className="text-xs font-mono">{adapterId}</code> from
              RunPod LORA_MODULES. It will no longer be available for inference after the
              next worker restart.
              <br /><br />
              The adapter will remain on HuggingFace and can be re-deployed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdapter}>
              Remove from RunPod
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

### Step 4: Modify `launch/page.tsx` — Make Adapter History Entries Clickable

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

Read the full file first. Confirm the Adapter History map block is still at approximately lines 386–403 with this pattern:

```typescript
{recentJobs.map((job: any) => (
  <div
    key={job.id}
    className="flex items-center justify-between p-3 bg-muted rounded-md"
  >
    <div>
      <span className="text-sm text-foreground font-medium">
        {job.jobName || job.id.slice(0, 8)}
      </span>
      <p className="text-xs text-muted-foreground mt-0.5">
        {new Date(job.createdAt).toLocaleDateString()} · 
        {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
      </p>
    </div>
    <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-muted text-muted-foreground'}>
      {JOB_STATUS_LABELS[job.status]?.label || job.status}
    </Badge>
  </div>
))}
```

**Pre-change confirmation (already verified, but re-confirm):**
- `useRouter` is imported at line 4 (`import { useState, useMemo } from 'react'; import { useParams, useRouter } from 'next/navigation';`)
- `router` is declared at line 77 (`const router = useRouter();`)
- `workbaseId` is at line 78 (`const workbaseId = params.id as string;`)
- `JOB_STATUS_LABELS` is at line 65

**The change** — replace the Adapter History map block with:

```typescript
{recentJobs.map((job: any) => {
  const isCompleted = job.status === 'completed';
  return (
    <div
      key={job.id}
      className={`flex items-center justify-between p-3 bg-muted rounded-md transition-colors ${
        isCompleted ? 'cursor-pointer hover:bg-muted/80' : ''
      }`}
      onClick={() => {
        if (isCompleted) {
          router.push(`/workbase/${workbaseId}/fine-tuning/launch/adapter/${job.id}`);
        }
      }}
    >
      <div>
        <span className="text-sm text-foreground font-medium">
          {job.jobName || job.id.slice(0, 8)}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(job.createdAt).toLocaleDateString()} ·{' '}
          {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
          {isCompleted && (
            <span className="ml-1 text-duck-blue">· View details →</span>
          )}
        </p>
      </div>
      <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-muted text-muted-foreground'}>
        {JOB_STATUS_LABELS[job.status]?.label || job.status}
      </Badge>
    </div>
  );
})}
```

**IMPORTANT:** Only change the Adapter History map block. Do not modify any other part of `launch/page.tsx`.

---

### Step 5: TypeScript Validation Sweep

Run from the `src/` directory (where `tsconfig.json` lives):

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\src" && npx tsc --noEmit -p tsconfig.json 2>&1 | head -60
```

If there are errors, filter to the files created/modified in this spec:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\src" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(types/pipeline|types/adapter-detail|inngest/functions/(auto-deploy|refresh-inference|restart-inference|index)|app/api/pipeline/(jobs|adapters)|hooks/useAdapterDetail|components/pipeline/(Deployment|AdapterStatus|EndpointRestart)|app/\(dashboard\)/workbase)"
```

**Expected:** Zero errors in new/modified files. Pre-existing errors in unrelated files are acceptable.

**Common fix (one remaining):**

**`adapterStatus` missing from `PipelineTrainingJob`** — Should already be resolved by Step 2. If `tsc` still complains about `job.adapterStatus` in the page, verify the field was saved correctly in `src/types/pipeline.ts`. The field should be:
```typescript
adapterStatus: 'active' | 'superseded' | 'deleted' | null;
```

---

### Step 6: Lint Check

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx next lint --dir "src/app/(dashboard)/workbase" --dir src/app/api/pipeline --dir src/hooks --dir src/components/pipeline --dir src/types 2>&1 | tail -20
```

Fix any lint errors in the new/modified files.

---

### Step 7: Design Token Audit

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && grep -n "zinc-\|slate-\|gray-" "src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx" src/types/pipeline.ts 2>&1
```

Expected: No matches. The `JOB_STATUS_LABELS` colors in `launch/page.tsx` (e.g. `bg-yellow-100`) are pre-existing and not introduced by this spec — do not change them.

---

### Step 8: Acceptance Criteria — Manual QA Checklist

Complete these checks with the development server running (`npm run dev`):

#### Adapter History Click-Through
- [ ] Navigate to `/workbase/[id]/fine-tuning/launch`
- [ ] In the Adapter History section, find a job with status "Completed"
- [ ] Entry shows `cursor-pointer`, `hover:bg-muted/80`, and "· View details →" text
- [ ] Click the entry → navigates to `/workbase/[id]/fine-tuning/launch/adapter/{jobId}`
- [ ] Non-completed entries are NOT clickable (no cursor-pointer, no navigation)

#### Adapter Detail Page — Header
- [ ] Page shows adapter name (e.g. `adapter-e8fa481f`) — from `deployment_log.adapter_name` when available
- [ ] Badge shows "Active", "Superseded", or "Deleted"
- [ ] HuggingFace link appears when `deployment_log.hf_path` is present (not `null`)
- [ ] Breadcrumb "← Launch Tuning" navigates back to the launch page

#### Deployment Report — New Adapters (deployed after E01 migrations)
- [ ] `DeploymentTimeline` shows ✓ HuggingFace Upload with file count and commit
- [ ] Shows ✓ RunPod LORA_MODULES Updated with endpoint ID and adapter count
- [ ] Shows ✓ Workers Cycled (after `refreshInferenceWorkers` completes)
- [ ] Shows ✓ Inference Verified (or appropriate warning if unverified)
- [ ] "View on HuggingFace" link present and correct
- [ ] "LORA_MODULES snapshot" expandable section works

#### Deployment Report — Historical Adapters (deployed before E01 migrations)
- [ ] `DeploymentTimeline` shows "No deployment data available" message
- [ ] No error thrown — graceful null handling

#### Adapter Status Ping
- [ ] Button shows "Refresh Status"
- [ ] Clicking shows spinner "Checking..."
- [ ] After ping: shows three status rows (LORA_MODULES, Workers online, Inference verified)
- [ ] 10-second cooldown enforced — rapid clicks show toast "Please wait 10 seconds between pings."
- [ ] Adapter ID copy button works

#### Manual Worker Restart
- [ ] "Restart Endpoint Workers" button enabled for active adapters
- [ ] Clicking opens `AlertDialog` with cross-workbase downtime warning
- [ ] Confirming shows toast "Restart initiated. This will take 1–4 minutes."
- [ ] Progress steps appear with spinner on active step
- [ ] After completion: verdict card shows appropriate message
- [ ] While restart in progress: button is disabled

#### Adapter Lifecycle — Remove from RunPod
- [ ] "Remove from RunPod" button enabled for active adapters
- [ ] Clicking opens `AlertDialog` (not native `window.confirm`)
- [ ] Confirming shows success toast with the message from the API
- [ ] After removal: `adapterStatus` badge shows "Superseded"
- [ ] Button is disabled for already-superseded or deleted adapters

#### Training Configuration Card
- [ ] Shows Sensitivity, Progression, Repetition, Cost fields
- [ ] Shows training duration if `trainingTimeSeconds` available
- [ ] Shows `—` gracefully for null/undefined fields

---

### Final Completion Checklist

**E01 artifacts:**
- [ ] `pipeline_training_jobs.deployment_log` column (JSONB)
- [ ] `pipeline_training_jobs.adapter_status` column (TEXT with CHECK)
- [ ] `endpoint_restart_log` table with all columns and indexes
- [ ] `src/types/adapter-detail.ts` with all type exports

**E02 artifacts:**
- [ ] `auto-deploy-adapter.ts` — all 9 changes applied
- [ ] `refresh-inference-workers.ts` — all 7 changes applied
- [ ] `restart-inference-workers.ts` — created, all 6 steps
- [ ] `index.ts` — `restartInferenceWorkers` registered

**E03 artifacts:**
- [ ] `jobs/[jobId]/deployment-log/route.ts` created
- [ ] `adapters/[jobId]/ping/route.ts` created
- [ ] `adapters/[jobId]/restart/route.ts` created
- [ ] `adapters/[jobId]/restart-status/route.ts` created
- [ ] `adapters/[jobId]/remove/route.ts` created

**E04 artifacts:**
- [ ] `useAdapterDetail.ts` hook created — exports `adapterDetailKeys`, `useDeploymentLog`, `useAdapterPing`, `useRestartStatus`, `useTriggerRestart`, `useRemoveAdapter`
- [ ] `DeploymentTimeline.tsx` component created
- [ ] `AdapterStatusPing.tsx` component created
- [ ] `EndpointRestartTool.tsx` component created

**E05 artifacts:**
- [ ] `adapterStatus` field added to `PipelineTrainingJob` in `src/types/pipeline.ts`
- [ ] `adapter/[jobId]/page.tsx` created
- [ ] `launch/page.tsx` Adapter History entries are clickable for completed jobs
- [ ] Zero TypeScript errors in all new/modified files
- [ ] Zero design token violations (no zinc-*, slate-*, hardcoded gray-*)

**Spec 26 is complete when all items above are checked.**

+++++++++++++++++

---

## Summary of All Files Changed by Spec 26

### New Files Created
| File | Purpose |
|------|---------|
| `src/types/adapter-detail.ts` | Types for deployment log, restart log, ping result |
| `src/inngest/functions/restart-inference-workers.ts` | Manual worker restart Inngest function |
| `src/app/api/pipeline/jobs/[jobId]/deployment-log/route.ts` | Read deployment log API |
| `src/app/api/pipeline/adapters/[jobId]/ping/route.ts` | Live adapter status ping API |
| `src/app/api/pipeline/adapters/[jobId]/restart/route.ts` | Trigger worker restart API |
| `src/app/api/pipeline/adapters/[jobId]/restart-status/route.ts` | Poll restart progress API |
| `src/app/api/pipeline/adapters/[jobId]/remove/route.ts` | Remove adapter from RunPod API |
| `src/hooks/useAdapterDetail.ts` | React Query hooks for detail page |
| `src/components/pipeline/DeploymentTimeline.tsx` | Deployment report visualization |
| `src/components/pipeline/AdapterStatusPing.tsx` | Status ping widget |
| `src/components/pipeline/EndpointRestartTool.tsx` | Worker restart widget |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx` | Adapter Detail Page |

### Modified Files
| File | Change |
|------|--------|
| `src/inngest/functions/auto-deploy-adapter.ts` | 9 surgical changes (3a–3i) |
| `src/inngest/functions/refresh-inference-workers.ts` | 7 surgical changes (4a–4g) |
| `src/inngest/functions/index.ts` | Register `restartInferenceWorkers` |
| `src/types/pipeline.ts` | Add `adapterStatus` field to `PipelineTrainingJob` |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | Clickable Adapter History entries |

### Database Changes (SAOL migrations)
| Change | Table | Details |
|--------|-------|---------|
| ADD COLUMN | `pipeline_training_jobs` | `deployment_log JSONB DEFAULT NULL` |
| ADD COLUMN | `pipeline_training_jobs` | `adapter_status TEXT DEFAULT 'active' CHECK (...)` |
| CREATE TABLE | `endpoint_restart_log` | Full 26-column table + 2 indexes |
