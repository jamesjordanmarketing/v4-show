# Spec 26: LoRA Adapter Detail Page — E05: Final Integration

**Version:** 1.0
**Date:** 2026-03-03
**Prompt:** E05 of 5 — FINAL
**Prerequisites:** E01, E02, E03, E04 all complete
**Next:** None — this completes Spec 26

---

## What This Prompt Builds

1. **New Adapter Detail Page** — `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx` — a full-page view assembled from the components built in E04
2. **Modify `launch/page.tsx`** — makes Adapter History entries clickable links to the detail page (one targeted change to lines 386–408)
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

**Existing `usePipelineJob` hook** (from `src/hooks/usePipelineJobs.ts`):
```typescript
export function usePipelineJob(jobId: string) // returns { data: { data: PipelineTrainingJob }, isLoading }
```

The `PipelineTrainingJob` type from `src/types/pipeline.ts` uses camelCase field names:
- `job.jobName` — job name
- `job.hfAdapterPath` — HF path (may be null if not deployed)
- `job.adapterStatus` — lifecycle status (new field from E01)
- `job.trainingSensitivity`, `job.trainingProgression`, `job.trainingRepetition` — training params
- `job.estimatedCost`, `job.trainingTimeSeconds` — cost/duration

**`launch/page.tsx` (existing file):**
- Imports `useRouter` from `next/navigation`
- Has `workbaseId` in scope (from `useParams` or props)
- Adapter History section at approximately lines 386–408 renders `recentJobs.map(...)` as non-clickable divs
- `JOB_STATUS_LABELS` mapping is defined in the file

---

## Critical Rules

1. **Read both files before editing:**
   - `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` — full file to understand context
   - `src/types/pipeline.ts` — to confirm `PipelineTrainingJob` camelCase field names
2. **The detail page is `'use client'`** — it uses hooks and router.
3. **Only one change to `launch/page.tsx`** — the Adapter History map. Do not touch anything else in that file.
4. **`hfAdapterPath` may be null** — show a graceful state when adapter has not been deployed.
5. **`adapterStatus` may not exist in `PipelineTrainingJob`** type yet — if TypeScript complains, cast the field access through `as any` and add a TODO comment to update the type once confirmed.

---

========================

## EXECUTION PROMPT E05

You are implementing the final integration layer for **Spec 26: LoRA Adapter Detail Page** in the Bright Run LoRA Training Data Platform.

**Prerequisites from E04:**
- `src/hooks/useAdapterDetail.ts` — exports `useDeploymentLog`, `useAdapterPing`
- `src/components/pipeline/DeploymentTimeline.tsx` — props: `{ deploymentLog, isLoading }`
- `src/components/pipeline/AdapterStatusPing.tsx` — props: `{ jobId, adapterId, pingData, isFetching, onRefresh }`
- `src/components/pipeline/EndpointRestartTool.tsx` — props: `{ jobId, adapterId }`

**Files to create:**
- `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

**Files to modify:**
- `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

---

### Step 1: Read Target Files

Before making any changes, read:
1. `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` — full file; confirm exact lines of the Adapter History `map` block and that `useRouter` is already imported
2. `src/types/pipeline.ts` — confirm camelCase field names on `PipelineTrainingJob`
3. `src/hooks/usePipelineJobs.ts` — confirm `usePipelineJob` hook signature and return shape

---

### Step 2: Create the Adapter Detail Page

Create the directory and file:

**File to create:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/adapter/[jobId]/page.tsx`

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import {
  useDeploymentLog,
  useAdapterPing,
} from '@/hooks/useAdapterDetail';
import { DeploymentTimeline } from '@/components/pipeline/DeploymentTimeline';
import { AdapterStatusPing } from '@/components/pipeline/AdapterStatusPing';
import { EndpointRestartTool } from '@/components/pipeline/EndpointRestartTool';

export default function AdapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const adapterId = `adapter-${jobId.substring(0, 8)}`;

  // Fetch job data
  const { data: jobData, isLoading: isJobLoading } = usePipelineJob(jobId);
  const job = jobData?.data || null;

  // Fetch deployment log
  const { data: deploymentLog, isLoading: isDeploymentLoading } = useDeploymentLog(jobId);

  // Adapter ping — user-triggered only (enabled: false)
  const {
    data: pingData,
    isFetching: isPinging,
    refetch: triggerPing,
  } = useAdapterPing(jobId);

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

  // Determine lifecycle badge
  const adapterStatus = (job as any).adapterStatus as string | undefined;
  const adapterStatusLabel =
    adapterStatus === 'superseded' ? 'Superseded'
    : adapterStatus === 'deleted' ? 'Deleted'
    : 'Active';

  const adapterStatusVariant: 'default' | 'secondary' =
    adapterStatus === 'active' || !adapterStatus ? 'default' : 'secondary';

  const hfAdapterPath = (job as any).hfAdapterPath as string | null | undefined;

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
          {hfAdapterPath && (
            <a
              href={`https://huggingface.co/${hfAdapterPath}`}
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
          deploymentLog={deploymentLog || null}
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
              disabled={adapterStatus === 'superseded' || adapterStatus === 'deleted'}
              onClick={async () => {
                if (!confirm(
                  `Remove ${adapterId} from RunPod LORA_MODULES? Workers will need to restart to unload it.`
                )) return;
                try {
                  const res = await fetch(`/api/pipeline/adapters/${jobId}/remove`, { method: 'POST' });
                  const json = await res.json();
                  if (json.success) {
                    alert(json.data.message);
                    router.refresh();
                  } else {
                    alert(json.error);
                  }
                } catch {
                  alert('Failed to remove adapter. Please try again.');
                }
              }}
            >
              Remove from RunPod
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Removing an adapter from RunPod does not delete it from HuggingFace.
            Workers will need to restart before the adapter is fully unloaded from GPU memory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Step 3: Modify `launch/page.tsx` — Make Adapter History Entries Clickable

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

Read the full file first. Locate the Adapter History section — it renders a `recentJobs.map(...)` loop, approximately at lines 386–408. The current code renders each job as a static, non-clickable `<div>`.

#### Pre-change verification

Before editing, confirm:
1. `useRouter` is already imported from `next/navigation` at the top of the file
2. `workbaseId` is available in scope (from `useParams` or similar — look at how the page gets its workbase ID)
3. `JOB_STATUS_LABELS` mapping exists in the file
4. The Adapter History `map` block uses this exact pattern:
```typescript
{recentJobs.map((job: any) => (
  <div
    key={job.id}
    className="flex items-center justify-between p-3 bg-muted rounded-md"
  >
    ...
  </div>
))}
```

If the actual code differs slightly from the above pattern, adapt the replacement accordingly — the goal is to make `status === 'completed'` jobs clickable and navigate to `/workbase/${workbaseId}/fine-tuning/launch/adapter/${job.id}`.

#### The change

Find the Adapter History `map` block described above. Replace it with:

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

If `router` is not already in scope in `launch/page.tsx`, add `const router = useRouter();` near the top of the component body (where the page's other hooks are declared). If `useRouter` is not imported, add it to the `next/navigation` import.

**IMPORTANT:** Only change the Adapter History map block. Do not modify any other part of `launch/page.tsx`.

---

### Step 4: Full TypeScript Validation Sweep

Run TypeScript check across all files modified in E01–E05:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | head -60
```

If there are errors, filter to the files created/modified in this spec:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | grep -E "(src/types/adapter-detail|src/inngest/functions/(auto-deploy|refresh-inference|restart-inference|index)|src/app/api/pipeline/(jobs|adapters)|src/hooks/useAdapterDetail|src/components/pipeline/(Deployment|AdapterStatus|EndpointRestart)|src/app/\(dashboard\)/workbase)"
```

**Expected:** Zero errors in the new/modified files. Fix any that appear. Pre-existing errors in other files are acceptable.

**Common fixes:**

1. **`PipelineTrainingJob` missing `adapterStatus`** — In `src/types/pipeline.ts`, add the optional field if the type is fully typed:
   ```typescript
   adapter_status?: 'active' | 'superseded' | 'deleted';
   adapterStatus?: 'active' | 'superseded' | 'deleted';
   ```
   If the type uses a database row shape, add both snake_case and camelCase (check the existing pattern). If TypeScript complains about the `as any` casts in the page component, this is the fix.

2. **`updated_at` missing from `pipeline_inference_endpoints` Supabase type** — If autogenerated Supabase types don't include `updated_at` on that table, cast the update object:
   ```typescript
   .update({ status: 'terminated', updated_at: new Date().toISOString() } as any)
   ```

3. **`logErr` redeclared** in `restart-status/route.ts` — If there are two `const { ..., error: logErr }` declarations, rename the second one to `logFetchErr`.

4. **`deleteRepo` not exported from `@huggingface/hub`** — Check:
   ```bash
   grep -r "deleteRepo" node_modules/@huggingface/hub/dist/index.d.ts 2>/dev/null | head -5
   ```
   If not found, replace the import in `auto-deploy-adapter.ts` with a guarded version:
   ```typescript
   let deleteRepo: ((args: { repo: { type: string; name: string }; credentials: { accessToken: string } }) => Promise<void>) | null = null;
   try {
     // eslint-disable-next-line @typescript-eslint/no-var-requires
     const hub = require('@huggingface/hub');
     if (hub.deleteRepo) deleteRepo = hub.deleteRepo;
   } catch { /* ignore */ }
   ```
   Then in Step 7c, guard: `if (deleteRepo) { await deleteRepo(...); }`

---

### Step 5: Lint Check

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx next lint --dir src/app/\(dashboard\)/workbase --dir src/app/api/pipeline --dir src/hooks --dir src/components/pipeline --dir src/types 2>&1 | tail -20
```

Fix any lint errors in the new files. Common issues:
- `react-hooks/exhaustive-deps` for `useEffect` in `EndpointRestartTool` — add `refetch` to dependency array if flagged
- `@typescript-eslint/no-explicit-any` — replace with specific types where feasible

---

### Step 6: Acceptance Criteria — Manual QA Checklist

Complete these checks with the development server running (`npm run dev`):

#### Adapter History Click-Through
- [ ] Navigate to `/workbase/[id]/fine-tuning/launch`
- [ ] In the Adapter History section, find a job with status "Completed"
- [ ] Expected: The entry shows `cursor-pointer`, `hover:bg-muted/80`, and "· View details →" text
- [ ] Click the entry
- [ ] Expected: Navigates to `/workbase/[id]/fine-tuning/launch/adapter/{jobId}`
- [ ] Non-completed entries are NOT clickable (no cursor-pointer, no navigation)

#### Adapter Detail Page — Header
- [ ] Page shows adapter name (e.g. `adapter-6fd5ac79`)
- [ ] Badge shows "Active", "Superseded", or "Deleted" based on `adapter_status`
- [ ] HuggingFace link appears when `hf_adapter_path` is non-null
- [ ] Breadcrumb "← Launch Tuning" navigates back to launch page

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
- [ ] Clicking "Refresh Status" shows spinner "Checking..."
- [ ] After ping: shows three status rows (LORA_MODULES, Workers online, Inference verified)
- [ ] 10-second cooldown enforced — rapid clicks show toast "Please wait 10 seconds between pings."
- [ ] Adapter ID copy button works

#### Manual Worker Restart
- [ ] "Restart Endpoint Workers" button is enabled for active adapters
- [ ] Clicking opens confirmation dialog with cross-workbase warning text
- [ ] Confirming shows toast "Restart initiated. This will take 1–4 minutes."
- [ ] Progress steps appear with spinner on active step
- [ ] After completion: verdict card shows appropriate message
- [ ] While restart is in progress: button is disabled (prevents double-triggering)
- [ ] If restart already in progress (from another session): API returns 409, user sees error toast

#### Adapter Lifecycle — Remove from RunPod
- [ ] "Remove from RunPod" button is enabled for active adapters
- [ ] Clicking shows browser confirm dialog
- [ ] Confirming shows success message and refreshes page
- [ ] After removal: adapter_status shows "Superseded" in badge

#### Adapter Lifecycle — Old Adapter Cleanup on New Deploy
- [ ] Train and deploy a second job for a workbase that already has an active adapter
- [ ] After deployment: old adapter's `pipeline_training_jobs.adapter_status = 'superseded'`
- [ ] Old adapter's `pipeline_inference_endpoints.status = 'terminated'`
- [ ] RunPod LORA_MODULES no longer contains the old adapter's name
- [ ] Old adapter's HF repo is deleted (or attempts deletion and marks as `deleted` in DB)

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
- [ ] `useAdapterDetail.ts` hook created
- [ ] `DeploymentTimeline.tsx` component created
- [ ] `AdapterStatusPing.tsx` component created
- [ ] `EndpointRestartTool.tsx` component created

**E05 artifacts:**
- [ ] `adapter/[jobId]/page.tsx` created
- [ ] `launch/page.tsx` Adapter History entries are clickable
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
| `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | Clickable Adapter History entries |

### Database Changes (SAOL migrations)
| Change | Table | Details |
|--------|-------|---------|
| ADD COLUMN | `pipeline_training_jobs` | `deployment_log JSONB DEFAULT NULL` |
| ADD COLUMN | `pipeline_training_jobs` | `adapter_status TEXT DEFAULT 'active' CHECK (...)` |
| CREATE TABLE | `endpoint_restart_log` | Full 26-column table + 2 indexes |
