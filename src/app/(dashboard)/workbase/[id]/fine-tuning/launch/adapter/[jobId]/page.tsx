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
