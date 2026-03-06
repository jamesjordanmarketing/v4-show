# Spec 26: LoRA Adapter Detail Page — E04: Frontend Hook + Components

**Version:** 1.0
**Date:** 2026-03-03
**Prompt:** E04 of 5
**Prerequisites:** E01 (types), E02 (Inngest), E03 (API routes) complete
**Next:** E05 — Adapter Detail Page + Integration

---

## What This Prompt Builds

1. **React Query hook** — `src/hooks/useAdapterDetail.ts` — 5 hooks for querying and mutating adapter detail data
2. **Three React components:**
   - `src/components/pipeline/DeploymentTimeline.tsx` — shows the 4-step deployment report from `deployment_log`
   - `src/components/pipeline/AdapterStatusPing.tsx` — user-triggered live status check widget
   - `src/components/pipeline/EndpointRestartTool.tsx` — worker restart widget with step-by-step progress

These components are consumed by the Adapter Detail Page built in E05.

---

## Platform Context

**Project:** Bright Run LoRA Training Data Platform
**Stack:** Next.js 14 (App Router), TypeScript, TanStack Query (React Query v5), shadcn/UI + Tailwind CSS
**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show`

**Design Token Rules — STRICT. Every line of CSS must use design tokens:**
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Brand: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary`, `text-primary-foreground`
- **ZERO `zinc-*`, `slate-*`, or hardcoded `gray-*` in new code**
- Exception for status colors: `text-green-600`, `text-destructive`, `text-yellow-500` are acceptable for semantic status indicators — these are standard Tailwind semantic colors, not hardcoded grays

**React Query v5 patterns (established in codebase):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

**Toast pattern (established in codebase):**
```typescript
import { toast } from 'sonner';
toast.success('message');
toast.error('message');
```

**shadcn/UI components available:**
- `Button`, `Badge`, `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Alert`, `AlertDescription`
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- All from `@/components/ui/[component-name]`

---

## Critical Rules

1. **Read existing hook files** before creating — confirm React Query v5 patterns:
   - `src/hooks/useAdapterTesting.ts`
   - `src/hooks/usePipelineJobs.ts`
2. **Read existing pipeline components** before creating — confirm imports and patterns:
   - `src/components/pipeline/DeployAdapterButton.tsx`
   - `src/components/pipeline/EndpointStatusBanner.tsx`
3. **All hooks must be `'use client'` components** (or be plain functions).
4. **`useAdapterPing` must have `enabled: false`** — each ping triggers a live GPU inference job (~$0.01–$0.02). Never auto-poll.
5. **Do not use `any` type** unless absolutely necessary; prefer `unknown` with type guards or cast through the established `Record<string, unknown>` pattern.
6. **No hardcoded colors** — use design tokens.

---

========================

## EXECUTION PROMPT E04

You are implementing the frontend hook and components layer for **Spec 26: LoRA Adapter Detail Page** in the Bright Run LoRA Training Data Platform.

**Prerequisites from E01:** `src/types/adapter-detail.ts` with `DeploymentLog`, `EndpointRestartLog`, `AdapterPingResult`, `getRestartVerdict`, `mapDbRowToRestartLog`
**Prerequisites from E03:** API endpoints available at:
- `GET /api/pipeline/jobs/{jobId}/deployment-log`
- `GET /api/pipeline/adapters/{jobId}/ping`
- `POST /api/pipeline/adapters/{jobId}/restart`
- `GET /api/pipeline/adapters/{jobId}/restart-status`
- `POST /api/pipeline/adapters/{jobId}/remove`

**Files to create:**
1. `src/hooks/useAdapterDetail.ts`
2. `src/components/pipeline/DeploymentTimeline.tsx`
3. `src/components/pipeline/AdapterStatusPing.tsx`
4. `src/components/pipeline/EndpointRestartTool.tsx`

Before creating, read:
- `src/hooks/usePipelineJobs.ts` — confirm React Query v5 patterns
- `src/components/pipeline/DeployAdapterButton.tsx` — confirm import/component patterns

---

### Part 1: Create `src/hooks/useAdapterDetail.ts`

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DeploymentLog, AdapterPingResult, EndpointRestartLog } from '@/types/adapter-detail';

// ============================================================
// Query Keys
// ============================================================

export const adapterDetailKeys = {
  all: ['adapter-detail'] as const,
  deployment: (jobId: string) => ['adapter-detail', 'deployment', jobId] as const,
  ping: (jobId: string) => ['adapter-detail', 'ping', jobId] as const,
  restartStatus: (jobId: string) => ['adapter-detail', 'restart-status', jobId] as const,
};

// ============================================================
// Hook: useDeploymentLog
// ============================================================

/**
 * Fetch deployment_log JSONB for a job.
 * Returns null if no deployment log exists yet (adapter not yet deployed,
 * or deployed before spec 26 was implemented — graceful null handling).
 */
export function useDeploymentLog(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.deployment(jobId || ''),
    queryFn: async (): Promise<DeploymentLog | null> => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/deployment-log`);
      if (!res.ok) throw new Error('Failed to fetch deployment log');
      const json = await res.json();
      return json.data;
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Hook: useAdapterPing
// ============================================================

/**
 * Live adapter status ping.
 * enabled: false — NEVER auto-runs. Call refetch() to trigger.
 * Each ping triggers a live GPU inference job (~$0.01–$0.02).
 */
export function useAdapterPing(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.ping(jobId || ''),
    queryFn: async (): Promise<AdapterPingResult> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/ping`);
      if (!res.ok) throw new Error('Failed to ping adapter');
      const json = await res.json();
      return json.data;
    },
    enabled: false, // user-triggered only — DO NOT change this
    staleTime: 0,   // always re-fetch when triggered
    retry: false,
  });
}

// ============================================================
// Hook: useRestartStatus
// ============================================================

/**
 * Fetch latest restart status for a job.
 * Pass refetchInterval for polling during active restarts.
 */
export function useRestartStatus(
  jobId: string | null,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: adapterDetailKeys.restartStatus(jobId || ''),
    queryFn: async (): Promise<(EndpointRestartLog & { adapterId: string; hfPath: string | null }) | null> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart-status`);
      if (!res.ok) throw new Error('Failed to fetch restart status');
      const json = await res.json();
      if (!json.data) return null;
      return json.data;
    },
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 5 * 1000,
  });
}

// ============================================================
// Hook: useTriggerRestart
// ============================================================

/**
 * Trigger a manual endpoint restart.
 * Returns restartLogId for polling via useRestartStatus.
 */
export function useTriggerRestart(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ data: { restartLogId: string; adapterId: string; status: string; message: string } }> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to trigger restart');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.restartStatus(jobId || '') });
    },
  });
}

// ============================================================
// Hook: useRemoveAdapter
// ============================================================

/**
 * Remove adapter from RunPod LORA_MODULES.
 * Marks the job as superseded in DB.
 */
export function useRemoveAdapter(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ data: { adapterId: string; removed: boolean; loraModulesRemaining: number; message: string } }> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/remove`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove adapter');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.ping(jobId || '') });
    },
  });
}
```

---

### Part 2: Create `src/components/pipeline/DeploymentTimeline.tsx`

Shows the 4-step deployment report from `pipeline_training_jobs.deployment_log`. Handles null gracefully (for adapters deployed before spec 26).

```typescript
'use client';

import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { DeploymentLog } from '@/types/adapter-detail';

interface DeploymentTimelineProps {
  deploymentLog: DeploymentLog | null;
  isLoading: boolean;
}

function TimelineStep({
  success,
  label,
  detail,
}: {
  success: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = success === null
    ? Clock
    : success
      ? CheckCircle2
      : XCircle;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
          success === null
            ? 'text-muted-foreground'
            : success
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export function DeploymentTimeline({ deploymentLog, isLoading }: DeploymentTimelineProps) {
  const [showLoraModules, setShowLoraModules] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading deployment report...
        </CardContent>
      </Card>
    );
  }

  if (!deploymentLog) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No deployment data available. This adapter may have been deployed before deployment logging was added.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wr = deploymentLog.worker_refresh;
  const verificationResult = wr?.verification_result;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Adapter ID:</span>
          <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">
            {deploymentLog.adapter_name}
          </code>
        </div>

        {/* 4-step timeline */}
        <div className="space-y-3">
          <TimelineStep
            success={true}
            label="HuggingFace Upload"
            detail={`${deploymentLog.hf_files_uploaded.length} files · ${deploymentLog.hf_path}${deploymentLog.hf_commit_oid ? ` · commit ${deploymentLog.hf_commit_oid.substring(0, 8)}` : ''}`}
          />

          <TimelineStep
            success={deploymentLog.runpod_save_success}
            label="RunPod LORA_MODULES Updated"
            detail={`Endpoint: ${deploymentLog.runpod_endpoint_id} · ${deploymentLog.runpod_lora_modules_after.length} total adapter(s) after update`}
          />

          <TimelineStep
            success={!!wr}
            label="Workers Cycled"
            detail={wr ? `Scale: 0 → ready` : 'Pending worker refresh...'}
          />

          <TimelineStep
            success={verificationResult === 'verified' ? true : verificationResult === 'unverified' ? false : null}
            label="Inference Verified"
            detail={
              verificationResult === 'verified'
                ? 'Adapter responded successfully to test inference'
                : verificationResult === 'unverified'
                  ? wr?.verification_error || 'Inference verification failed'
                  : verificationResult === 'skipped'
                    ? 'Verification was skipped'
                    : 'Pending...'
            }
          />
        </div>

        {/* HuggingFace link */}
        <a
          href={`https://huggingface.co/${deploymentLog.hf_path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-duck-blue hover:underline"
        >
          View on HuggingFace
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* Expandable LORA_MODULES snapshot */}
        {deploymentLog.runpod_lora_modules_after.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground p-0 h-auto"
              onClick={() => setShowLoraModules(!showLoraModules)}
            >
              {showLoraModules
                ? <ChevronUp className="h-3 w-3 mr-1" />
                : <ChevronDown className="h-3 w-3 mr-1" />
              }
              LORA_MODULES snapshot ({deploymentLog.runpod_lora_modules_after.length})
            </Button>
            {showLoraModules && (
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto text-foreground">
                {JSON.stringify(deploymentLog.runpod_lora_modules_after, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Part 3: Create `src/components/pipeline/AdapterStatusPing.tsx`

User-triggered live status check. Shows three status rows after pinging. Has a 10-second cooldown between pings to prevent runaway GPU costs.

```typescript
'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { AdapterPingResult } from '@/types/adapter-detail';

interface AdapterStatusPingProps {
  jobId: string;
  adapterId: string;
  pingData: AdapterPingResult | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}

function StatusRow({
  checked,
  label,
  detail,
}: {
  checked: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = checked === null ? AlertTriangle : checked ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2">
      <Icon
        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
          checked === null
            ? 'text-yellow-500'
            : checked
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function AdapterStatusPing({
  jobId,
  adapterId,
  pingData,
  isFetching,
  onRefresh,
}: AdapterStatusPingProps) {
  const [lastCooldown, setLastCooldown] = useState(0);

  const handleRefresh = () => {
    const now = Date.now();
    if (now - lastCooldown < 10_000) {
      toast.error('Please wait 10 seconds between pings.');
      return;
    }
    setLastCooldown(now);
    onRefresh();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(adapterId);
    toast.success('Adapter ID copied');
  };

  const workersOnline =
    pingData
      ? pingData.workerStatus.ready + pingData.workerStatus.idle > 0
      : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Adapter Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID with copy button */}
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 text-foreground">
            {adapterId}
          </code>
          <Button variant="ghost" size="sm" onClick={handleCopyId} className="px-2">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {pingData ? (
          <div className="space-y-3">
            <StatusRow
              checked={pingData.registeredInLoraModules}
              label="Registered in LORA_MODULES"
              detail={
                pingData.registeredInLoraModules
                  ? `${pingData.loraModulesSnapshot.length} adapter(s) total on endpoint`
                  : 'Adapter not found in endpoint configuration'
              }
            />
            <StatusRow
              checked={workersOnline}
              label={
                workersOnline
                  ? `Workers online (${pingData.workerStatus.ready} ready, ${pingData.workerStatus.idle} idle)`
                  : 'Workers offline — endpoint is scaled to 0'
              }
            />
            <StatusRow
              checked={pingData.inferenceAvailable}
              label={
                pingData.inferenceAvailable
                  ? `Inference verified (latency: ${pingData.inferenceLatencyMs?.toLocaleString()}ms)`
                  : 'Inference unavailable'
              }
              detail={pingData.inferenceError || undefined}
            />

            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(pingData.checkedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click Refresh Status to check adapter health.
            <br />
            <span className="text-xs">Note: Each ping runs a live inference request (~$0.01–$0.02).</span>
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Checking...' : 'Refresh Status'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Part 4: Create `src/components/pipeline/EndpointRestartTool.tsx`

Worker restart widget with confirmation dialog, step-by-step progress display during active restart, and verdict card after completion.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useRestartStatus, useTriggerRestart } from '@/hooks/useAdapterDetail';
import { getRestartVerdict } from '@/types/adapter-detail';
import type { EndpointRestartLog } from '@/types/adapter-detail';

const IN_PROGRESS_STATUSES = [
  'initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'
];

interface StepItemProps {
  label: string;
  status: 'done' | 'active' | 'pending' | 'failed';
  timestamp?: string | null;
}

function StepItem({ label, status, timestamp }: StepItemProps) {
  const Icon =
    status === 'done' ? CheckCircle2
    : status === 'failed' ? XCircle
    : status === 'active' ? Loader2
    : Clock;

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          status === 'done' ? 'text-green-600'
          : status === 'failed' ? 'text-destructive'
          : status === 'active' ? 'text-duck-blue animate-spin'
          : 'text-muted-foreground'
        }`}
      />
      <span className={`text-sm ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </span>
      {timestamp && (
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function getStepStatus(
  log: EndpointRestartLog,
  targetStatus: string
): 'done' | 'active' | 'pending' | 'failed' {
  const order = [
    'initiated', 'scaling_down', 'workers_terminated',
    'scaling_up', 'workers_ready', 'verifying', 'completed'
  ];
  const currentIdx = order.indexOf(log.status);
  const targetIdx = order.indexOf(targetStatus);

  if (log.status === 'failed') {
    const failedStepIdx = order.indexOf(log.errorStep || '');
    if (targetIdx < failedStepIdx) return 'done';
    if (targetIdx === failedStepIdx) return 'failed';
    return 'pending';
  }

  if (targetIdx < currentIdx) return 'done';
  if (targetIdx === currentIdx) return 'active';
  return 'pending';
}

interface EndpointRestartToolProps {
  jobId: string;
  adapterId: string;
}

export function EndpointRestartTool({ jobId, adapterId }: EndpointRestartToolProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch restart status — refetch interval managed by useEffect below
  const { data: restartLog, refetch } = useRestartStatus(jobId);

  const isActive = restartLog && IN_PROGRESS_STATUSES.includes(restartLog.status);

  // Auto-poll every 5s when a restart is active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => { refetch(); }, 5000);
    return () => clearInterval(interval);
  }, [isActive, refetch]);

  const restartMutation = useTriggerRestart(jobId);

  const handleConfirmRestart = async () => {
    setShowConfirm(false);
    try {
      await restartMutation.mutateAsync();
      toast.success('Restart initiated. This will take 1–4 minutes.');
      // Start polling — clears itself once restart completes
      const interval = setInterval(async () => {
        const updated = await refetch();
        if (updated.data && !IN_PROGRESS_STATUSES.includes(updated.data.status)) {
          clearInterval(interval);
        }
      }, 5000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger restart');
    }
  };

  const verdict = restartLog ? getRestartVerdict(restartLog) : null;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Endpoint Restart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!restartLog ? (
            <p className="text-sm text-muted-foreground">
              No restart history for this adapter. If the adapter was deployed but workers
              haven&apos;t picked it up, use the button below to cycle inference workers.
            </p>
          ) : isActive ? (
            /* In Progress */
            <div className="space-y-3">
              <p className="text-sm font-medium text-duck-blue">
                <Loader2 className="h-4 w-4 inline animate-spin mr-1" />
                Restart in progress...
              </p>
              <div className="space-y-2">
                <StepItem label="Scale workers down" status={getStepStatus(restartLog, 'scaling_down')} timestamp={restartLog.scaleDownAt} />
                <StepItem label="Workers terminated" status={getStepStatus(restartLog, 'workers_terminated')} timestamp={restartLog.workerTerminatedAt} />
                <StepItem label="Scale workers up" status={getStepStatus(restartLog, 'scaling_up')} timestamp={restartLog.scaleUpAt} />
                <StepItem label="Workers ready" status={getStepStatus(restartLog, 'workers_ready')} timestamp={restartLog.workersReadyAt} />
                <StepItem label="Verify adapter" status={getStepStatus(restartLog, 'verifying')} timestamp={restartLog.verificationAt} />
              </div>
            </div>
          ) : (
            /* Completed or Failed */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Last Restart:{' '}
                  <span className="text-foreground">
                    {new Date(restartLog.initiatedAt).toLocaleString()}
                  </span>
                  {' '}
                  <Badge variant="outline" className="text-xs ml-1">
                    {restartLog.triggerSource}
                  </Badge>
                </p>
                {restartLog.totalDurationMs && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(restartLog.totalDurationMs / 1000)}s
                  </span>
                )}
              </div>

              {/* Verdict card */}
              {verdict && (
                <div className={`p-3 rounded-md text-sm border ${
                  verdict.severity === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : verdict.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{verdict.reason}</p>
                  {verdict.action && (
                    <p className="text-xs mt-1 opacity-80">{verdict.action}</p>
                  )}
                </div>
              )}

              {/* Step results summary */}
              <div className="space-y-2">
                <StepItem
                  label={restartLog.scaleDownSuccess ? 'Workers scaled down' : 'Scale down failed'}
                  status={restartLog.scaleDownSuccess ? 'done' : 'failed'}
                  timestamp={restartLog.scaleDownAt}
                />
                <StepItem
                  label={restartLog.scaleUpSuccess ? 'Workers restarted and ready' : 'Workers failed to start'}
                  status={restartLog.scaleUpSuccess ? 'done' : restartLog.status === 'failed' ? 'failed' : 'pending'}
                  timestamp={restartLog.workersReadyAt}
                />
                <StepItem
                  label={
                    restartLog.adapterVerified
                      ? `Adapter ${adapterId} verified active`
                      : `Adapter ${adapterId} NOT verified`
                  }
                  status={restartLog.adapterVerified ? 'done' : 'failed'}
                  timestamp={restartLog.verificationAt}
                />
                <StepItem
                  label={
                    restartLog.adapterInLoraModules
                      ? `Adapter confirmed in LORA_MODULES (${restartLog.loraModulesSnapshot?.length || 0} total)`
                      : 'Adapter NOT in LORA_MODULES at restart time'
                  }
                  status={restartLog.adapterInLoraModules ? 'done' : 'failed'}
                />
              </div>

              {restartLog.errorMessage && (
                <p className="text-xs text-destructive bg-red-50 p-2 rounded border border-red-200">
                  Error: {restartLog.errorMessage}
                </p>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowConfirm(true)}
            disabled={!!isActive || restartMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isActive ? 'Restart in Progress...' : 'Restart Endpoint Workers'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog — warning text is non-negotiable */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Inference Workers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will briefly interrupt ALL adapter inference across ALL Work Bases
              (approximately 45–270 seconds of downtime).
              <br /><br />
              Worker restart costs approximately $0.50–$2.00 per cycle on RunPod.
              <br /><br />
              Use this if the adapter was deployed but workers haven&apos;t picked it up yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestart}>
              Restart Workers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### Step 5: TypeScript Validation

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | grep -E "(error|src/hooks/useAdapterDetail|src/components/pipeline/Deployment|src/components/pipeline/Adapter|src/components/pipeline/Endpoint)" | head -30
```

Fix any errors in the new files. Common issues:
- If `workersOnline` used as `checked` in `StatusRow` complains about `number` type, ensure it's cast to `boolean | null`: `workersOnline !== null ? workersOnline > 0 : null`
- If `AlertDialog` components are not in `@/components/ui/alert-dialog`, check existing usage in the codebase with a quick search before fixing
- Ensure `useRestartStatus` in `EndpointRestartTool` is called without the `refetchInterval` option (it is managed by `useEffect` instead)

---

### Design Token Audit

After creating all files, verify no hardcoded non-token colors:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && grep -n "zinc-\|slate-\|gray-" src/hooks/useAdapterDetail.ts src/components/pipeline/DeploymentTimeline.tsx src/components/pipeline/AdapterStatusPing.tsx src/components/pipeline/EndpointRestartTool.tsx 2>&1
```

Expected: No matches. If any are found, replace with the appropriate design token.

---

### Completion Checklist

- [ ] `src/hooks/useAdapterDetail.ts` created — exports `adapterDetailKeys`, `useDeploymentLog`, `useAdapterPing`, `useRestartStatus`, `useTriggerRestart`, `useRemoveAdapter`
- [ ] `useAdapterPing` has `enabled: false`
- [ ] `src/components/pipeline/DeploymentTimeline.tsx` created
- [ ] `src/components/pipeline/AdapterStatusPing.tsx` created — 10-second cooldown enforced
- [ ] `src/components/pipeline/EndpointRestartTool.tsx` created — confirmation dialog with cross-workbase warning
- [ ] Zero `zinc-*`, `slate-*`, hardcoded `gray-*` in new files
- [ ] No TypeScript errors in new files

**Artifacts produced by E04 (used by E05):**
- Hook `useDeploymentLog(jobId)` — fetches `DeploymentLog | null`
- Hook `useAdapterPing(jobId)` — user-triggered ping returning `AdapterPingResult`
- Hook `useRestartStatus(jobId)` — latest restart log with polling support
- Hook `useTriggerRestart(jobId)` — mutation to trigger restart, returns `restartLogId`
- Hook `useRemoveAdapter(jobId)` — mutation to remove adapter from RunPod
- Component `DeploymentTimeline` — props: `{ deploymentLog, isLoading }`
- Component `AdapterStatusPing` — props: `{ jobId, adapterId, pingData, isFetching, onRefresh }`
- Component `EndpointRestartTool` — props: `{ jobId, adapterId }`

+++++++++++++++++
