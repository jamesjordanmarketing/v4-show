'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Loader2, Clock, AlertTriangle } from 'lucide-react';
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

const POLL_INTERVAL_MS = 10_000;   // 10s — matches backend poll cadence
const POLL_TIMEOUT_MS = 600_000;   // 10 minutes max before we stop polling

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
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartRef = useRef<number | null>(null);

  const { data: restartLog, refetch } = useRestartStatus(jobId);

  const isActive = restartLog && IN_PROGRESS_STATUSES.includes(restartLog.status);
  const isFailed = restartLog?.status === 'failed';

  // Track poll start time — reset when a new restart begins
  useEffect(() => {
    if (isActive && pollStartRef.current === null) {
      pollStartRef.current = Date.now();
      setPollTimedOut(false);
    }
    if (!isActive) {
      pollStartRef.current = null;
    }
  }, [isActive]);

  // Auto-poll every 10s when a restart is active, with 10-minute ceiling
  useEffect(() => {
    if (!isActive || pollTimedOut) return;
    const interval = setInterval(() => {
      if (pollStartRef.current && Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        setPollTimedOut(true);
        return;
      }
      refetch();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, pollTimedOut, refetch]);

  const restartMutation = useTriggerRestart(jobId);

  const handleConfirmRestart = async () => {
    setShowConfirm(false);
    setPollTimedOut(false);
    pollStartRef.current = null;
    try {
      await restartMutation.mutateAsync();
      toast.success('Restart initiated. This will take 1–5 minutes.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger restart');
    }
  };

  const handleRetryPoll = useCallback(() => {
    setPollTimedOut(false);
    pollStartRef.current = Date.now();
    refetch();
  }, [refetch]);

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
          ) : isActive || pollTimedOut ? (
            /* In Progress or Poll Timed Out */
            <div className="space-y-3">
              {pollTimedOut ? (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Restart taking longer than expected</p>
                    <p className="text-xs mt-1">
                      Polling stopped after 10 minutes. The restart may still be running in the background.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleRetryPoll}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resume Polling
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-duck-blue">
                  <Loader2 className="h-4 w-4 inline animate-spin mr-1" />
                  Restart in progress...
                </p>
              )}
              {restartLog && (
                <div className="space-y-2">
                  <StepItem label="Scale workers down" status={getStepStatus(restartLog, 'scaling_down')} timestamp={restartLog.scaleDownAt} />
                  <StepItem label="Workers terminated" status={getStepStatus(restartLog, 'workers_terminated')} timestamp={restartLog.workerTerminatedAt} />
                  <StepItem label="Scale workers up" status={getStepStatus(restartLog, 'scaling_up')} timestamp={restartLog.scaleUpAt} />
                  <StepItem label="Workers ready" status={getStepStatus(restartLog, 'workers_ready')} timestamp={restartLog.workersReadyAt} />
                  <StepItem label="Verify adapter" status={getStepStatus(restartLog, 'verifying')} timestamp={restartLog.verificationAt} />
                </div>
              )}
            </div>
          ) : isFailed ? (
            /* Failed */
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-800">
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Restart failed</p>
                  {restartLog?.errorMessage && (
                    <p className="text-xs mt-1">{restartLog.errorMessage}</p>
                  )}
                </div>
              </div>
              {restartLog && (
                <div className="space-y-2">
                  <StepItem label="Scale workers down" status={getStepStatus(restartLog, 'scaling_down')} timestamp={restartLog.scaleDownAt} />
                  <StepItem label="Workers terminated" status={getStepStatus(restartLog, 'workers_terminated')} timestamp={restartLog.workerTerminatedAt} />
                  <StepItem label="Scale workers up" status={getStepStatus(restartLog, 'scaling_up')} timestamp={restartLog.scaleUpAt} />
                  <StepItem label="Workers ready" status={getStepStatus(restartLog, 'workers_ready')} timestamp={restartLog.workersReadyAt} />
                  <StepItem label="Verify adapter" status={getStepStatus(restartLog, 'verifying')} timestamp={restartLog.verificationAt} />
                </div>
              )}
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
            disabled={(!!isActive && !pollTimedOut) || restartMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isActive && !pollTimedOut ? 'Restart in Progress...' : isFailed ? 'Retry Restart' : 'Restart Endpoint Workers'}
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
