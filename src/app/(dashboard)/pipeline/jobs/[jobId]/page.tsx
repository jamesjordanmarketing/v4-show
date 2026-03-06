/**
 * Pipeline Job Detail Page (E09)
 * 
 * Real-time monitoring of training job progress
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, XCircle, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrainingProgressPanel } from '@/components/pipeline';
import { usePipelineJob, useCancelPipelineJob } from '@/hooks/usePipelineJobs';

export default function PipelineJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  
  const { data, isLoading, error } = usePipelineJob(jobId);
  const cancelJob = useCancelPipelineJob();
  
  const job = data?.data;
  const isActive = job && ['pending', 'queued', 'initializing', 'running'].includes(job.status);
  const isComplete = job?.status === 'completed';

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this training job?')) return;
    
    try {
      await cancelJob.mutateAsync(jobId);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-16">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This training job doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link href="/pipeline/jobs">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/pipeline/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.jobName}</h1>
          <p className="text-muted-foreground">
            Created {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        {isActive && (
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={cancelJob.isPending}
          >
            Cancel Training
          </Button>
        )}
        {isComplete && (
          <div className="flex gap-2">
            {job.adapterFilePath && (
              <Button asChild variant="outline">
                <a href={`/api/pipeline/jobs/${jobId}/download`} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download Adapter
                </a>
              </Button>
            )}
            <Link href={`/pipeline/jobs/${jobId}/results`}>
              <Button>View Results</Button>
            </Link>
            <Link href={`/pipeline/jobs/${jobId}/chat`}>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Multi-Turn Chat
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Progress Panel */}
      <TrainingProgressPanel job={job} />

      {/* Configuration Summary */}
      <div className="mt-8 p-6 rounded-lg border bg-card">
        <h2 className="text-lg font-semibold mb-4">Configuration Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Training Sensitivity</p>
            <p className="font-medium capitalize">{job.trainingSensitivity.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Training Progression</p>
            <p className="font-medium capitalize">{job.trainingProgression}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Training Repetition</p>
            <p className="font-medium">{job.trainingRepetition} epochs</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dataset</p>
            <p className="font-medium">{job.datasetName || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Engine</p>
            <p className="font-medium">{job.engineName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GPU</p>
            <p className="font-medium">{job.gpuType}</p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {job.status === 'failed' && job.errorMessage && (
        <div className="mt-8 p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Training Failed
          </h2>
          <p className="text-red-600 dark:text-red-300">{job.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
