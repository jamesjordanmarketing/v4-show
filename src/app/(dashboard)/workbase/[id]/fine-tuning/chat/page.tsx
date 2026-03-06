'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { useEndpointStatus, useDeployAdapter } from '@/hooks/useAdapterTesting';
import { usePipelineJobs } from '@/hooks/usePipelineJobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { MultiTurnChat } from '@/components/pipeline/chat/MultiTurnChat';

type AvailabilityState = 'loading' | 'empty' | 'no_adapter' | 'deploying' | 'endpoints_not_ready' | 'ready';

export default function BehaviorChatPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const { data: workbase, isLoading: isLoadingWorkbase } = useWorkbase(workbaseId);

  // Fallback: query recent completed jobs for this workbase when activeAdapterJobId is null
  const { data: jobsData } = usePipelineJobs({ limit: 5, workbaseId });
  const recentJobs = jobsData?.data || [];
  const latestCompletedJob = recentJobs.find((j) => j.status === 'completed') || null;

  // Prefer workbase.activeAdapterJobId; fall back to most recent completed job
  const effectiveJobId = workbase?.activeAdapterJobId || latestCompletedJob?.id || null;

  const { data: endpointData, isLoading: isLoadingEndpoints } = useEndpointStatus(effectiveJobId);
  const controlStatus = endpointData?.data?.controlEndpoint?.status;
  const adaptedStatus = endpointData?.data?.adaptedEndpoint?.status;
  const bothReady = endpointData?.data?.bothReady;

  // Auto-deploy endpoints if a job exists but no endpoint records are found
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
              <p className="text-muted-foreground mb-2">Setting up inference endpoints...</p>
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
