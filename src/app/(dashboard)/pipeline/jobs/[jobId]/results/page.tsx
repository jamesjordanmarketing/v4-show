/**
 * Pipeline Results Dashboard Page (E10)
 * 
 * Displays training results including specialized metrics
 * from Claude-as-Judge evaluation
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingQualityEvaluation, DeployAdapterButton } from '@/components/pipeline';
import { usePipelineJob } from '@/hooks/usePipelineJobs';

// Mock evaluation data - in production, fetch from API
const MOCK_EVALUATION = {
  arcCompletionRate: {
    baseline: 0.28,
    trained: 0.52,
    absoluteImprovement: 0.24,
    percentImprovement: 0.857,
    meetsTarget: true,
  },
  empathyFirstRate: {
    baseline: 0.45,
    trained: 0.88,
    absoluteImprovement: 0.43,
    percentImprovement: 0.956,
    meetsTarget: true,
  },
  voiceConsistency: {
    baseline: 0.65,
    trained: 0.92,
    absoluteImprovement: 0.27,
    percentImprovement: 0.415,
    meetsTarget: true,
  },
  overallScore: {
    baseline: 2.8,
    trained: 4.2,
    absoluteImprovement: 1.4,
    percentImprovement: 0.50,
    meetsTarget: true,
  },
};

export default function PipelineResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const { data, isLoading } = usePipelineJob(jobId);
  const job = data?.data;

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!job || job.status !== 'completed') {
    return (
      <div className="container max-w-5xl py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-4">
            Training must be complete to view results.
          </p>
          <Link href={`/pipeline/jobs/${jobId}`}>
            <Button variant="outline">Back to Job</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/pipeline/jobs/${jobId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{job.jobName}</h1>
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Completed {job.completedAt && new Date(job.completedAt).toLocaleString()}
          </p>
        </div>
        {job.adapterFilePath && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={`/api/pipeline/jobs/${job.id}/download`} download>
                <Download className="h-4 w-4 mr-2" />
                Download Adapter
              </a>
            </Button>
            <DeployAdapterButton jobId={job.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Training Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Final Loss</p>
                <p className="text-2xl font-bold">{job.finalLoss?.toFixed(4) || '--'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Time</p>
                <p className="text-2xl font-bold">
                  {job.trainingTimeSeconds 
                    ? `${Math.floor(job.trainingTimeSeconds / 60)}m ${job.trainingTimeSeconds % 60}s`
                    : '--'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Steps</p>
                <p className="text-2xl font-bold">{job.totalSteps || '--'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Cost</p>
                <p className="text-2xl font-bold">
                  ${(job.actualCost || job.estimatedCost || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Files */}
        <Card>
          <CardHeader>
            <CardTitle>Model Files</CardTitle>
          </CardHeader>
          <CardContent>
            {job.adapterFilePath ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">LoRA Adapter Package</p>
                  <p className="text-sm text-muted-foreground">
                    adapter_model.safetensors + config files
                  </p>
                </div>
                <Button className="w-full" asChild>
                  <a href={`/api/pipeline/jobs/${job.id}/download`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Adapter Files (ZIP)
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Adapter files are being prepared...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quality Evaluation - Specialized Metrics */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Training Quality Evaluation</h2>
        <TrainingQualityEvaluation {...MOCK_EVALUATION} />
      </div>

      {/* Traceability */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Traceability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Job ID</p>
              <p className="font-mono">{job.id.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-muted-foreground">Engine</p>
              <p>{job.engineId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dataset</p>
              <p>{job.datasetName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">RunPod Job</p>
              <p className="font-mono">{job.runpodJobId?.slice(0, 8) || '--'}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
