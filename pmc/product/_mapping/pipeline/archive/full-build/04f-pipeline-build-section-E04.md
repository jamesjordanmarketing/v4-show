# Build Section E04

**Product**: PIPELINE  
**Section**: 4 - Training Execution & Monitoring  
**Generated**: 2025-12-26  
**Source**: 04e-pipeline-integrated-extension-spec_v1.md

---

## SECTION 4: Training Execution & Monitoring - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: BullMQ + Redis job queue, Server-Sent Events (SSE)  
**Actual Infrastructure**: Supabase Edge Functions + Cron, React Query polling

---

### Overview (from original spec)

Execute training jobs on GPU cluster and provide real-time progress monitoring with metrics visualization.

**User Value**: Real-time visibility into training progress with detailed metrics, loss curves, and cost tracking

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Edge Functions capability
- ✅ External GPU cluster API access
- ✅ Section 1: Database tables (`lora_training_jobs`, `lora_metrics_points`)
- ✅ Section 3: Jobs created with `status='queued'`
- ✅ Recharts library (for loss curve visualization)

**Previous Section Prerequisites**:
- Section 3: Training jobs created and queued for processing

---

### Features & Requirements (INTEGRATED)

#### FR-4.1: Job Processing Edge Function

**Type**: Background Processing

**Description**: Poll for queued jobs, submit to GPU cluster, track progress, and update database.

**Implementation Strategy**: EXTENSION (using Supabase Edge Functions instead of BullMQ)

---

**Edge Function (INTEGRATED)**:

**File**: `supabase/functions/process-training-jobs/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Process training jobs edge function
 * 
 * This function runs on a cron schedule (every 30 seconds) and:
 * 1. Finds jobs with status='queued'
 * 2. Submits them to the GPU cluster
 * 3. Updates status to 'initializing'
 * 4. Polls running jobs for progress updates
 * 5. Updates metrics and progress in database
 * 6. Handles job completion and errors
 */
Deno.serve(async (req) => {
  try {
    console.log('[JobProcessor] Starting job processing cycle');

    // Process queued jobs (submit to GPU cluster)
    await processQueuedJobs();

    // Update running jobs (poll GPU cluster for progress)
    await updateRunningJobs();

    return new Response(
      JSON.stringify({ success: true, message: 'Job processing cycle complete' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JobProcessor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process queued jobs - submit to GPU cluster
 */
async function processQueuedJobs() {
  // Fetch jobs waiting to be submitted
  const { data: queuedJobs, error } = await supabase
    .from('lora_training_jobs')
    .select(`
      *,
      dataset:lora_datasets(storage_path, storage_bucket, total_training_pairs)
    `)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5); // Process up to 5 jobs per cycle

  if (error) {
    console.error('[JobProcessor] Error fetching queued jobs:', error);
    return;
  }

  if (!queuedJobs || queuedJobs.length === 0) {
    console.log('[JobProcessor] No queued jobs to process');
    return;
  }

  console.log(`[JobProcessor] Processing ${queuedJobs.length} queued jobs`);

  for (const job of queuedJobs) {
    try {
      // Update status to initializing
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'initializing',
          current_stage: 'initializing',
        })
        .eq('id', job.id);

      // Get signed URL for dataset
      const { data: signedUrlData } = await supabase.storage
        .from(job.dataset.storage_bucket)
        .createSignedUrl(job.dataset.storage_path, 3600 * 24); // 24 hour expiry

      if (!signedUrlData) {
        throw new Error('Failed to generate dataset signed URL');
      }

      // Submit job to GPU cluster
      const gpuJobPayload = {
        job_id: job.id,
        dataset_url: signedUrlData.signedUrl,
        hyperparameters: {
          ...job.hyperparameters,
          base_model: 'mistralai/Mistral-7B-v0.1',
        },
        gpu_config: job.gpu_config,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/training-callback`,
      };

      const response = await fetch(`${GPU_CLUSTER_API_URL}/training/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
        },
        body: JSON.stringify(gpuJobPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GPU cluster submission failed: ${errorData}`);
      }

      const gpuJob = await response.json();

      // Update job with external ID and status
      await supabase
        .from('lora_training_jobs')
        .update({
          external_job_id: gpuJob.external_job_id,
          status: 'running',
          current_stage: 'training',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[JobProcessor] Job ${job.id} submitted to GPU cluster: ${gpuJob.external_job_id}`);

      // Create notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_started',
        title: 'Training Started',
        message: `Your training job has started on ${job.gpu_config.count}x ${job.gpu_config.type}`,
        priority: 'medium',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });

    } catch (error) {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, error);
      
      // Mark job as failed
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_stack: error.stack,
        })
        .eq('id', job.id);

      // Create error notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_failed',
        title: 'Training Failed',
        message: `Your training job failed to start: ${error.message}`,
        priority: 'high',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });
    }
  }
}

/**
 * Update running jobs - poll GPU cluster for progress
 */
async function updateRunningJobs() {
  // Fetch jobs currently running
  const { data: runningJobs, error } = await supabase
    .from('lora_training_jobs')
    .select('*')
    .in('status', ['running', 'initializing'])
    .not('external_job_id', 'is', null);

  if (error) {
    console.error('[JobProcessor] Error fetching running jobs:', error);
    return;
  }

  if (!runningJobs || runningJobs.length === 0) {
    console.log('[JobProcessor] No running jobs to update');
    return;
  }

  console.log(`[JobProcessor] Updating ${runningJobs.length} running jobs`);

  for (const job of runningJobs) {
    try {
      // Poll GPU cluster for job status
      const response = await fetch(
        `${GPU_CLUSTER_API_URL}/training/status/${job.external_job_id}`,
        {
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`[JobProcessor] Failed to get status for job ${job.id}`);
        continue;
      }

      const gpuJobStatus = await response.json();

      // Update job progress and metrics
      const updates: any = {
        progress: gpuJobStatus.progress || job.progress,
        current_epoch: gpuJobStatus.current_epoch || job.current_epoch,
        current_step: gpuJobStatus.current_step || j
#### FR-4.4: Training Monitor Page

**Type**: UI Page

**Description**: Real-time training monitor with live metrics, loss curves, and progress tracking.

**Implementation Strategy**: EXTENSION (using React Query polling instead of SSE)

---

**Page Component (INTEGRATED)**:

**File**: `src/app/(dashboard)/training/jobs/[jobId]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { use} from 'react';
import { useTrainingJob } from '@/hooks/useTrainingConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingDown, 
  Zap, 
  DollarSign,
  Clock,
  Cpu,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

export default function TrainingMonitorPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useTrainingJob(params.jobId);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load training job. {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const job = data.data.job;
  const metrics = data.data.metrics || [];
  const costRecords = data.data.cost_records || [];

  // Status badge configuration
  const statusConfig = {
    queued: { color: 'bg-blue-500', icon: Clock, label: 'Queued' },
    initializing: { color: 'bg-yellow-500', icon: Loader2, label: 'Initializing' },
    running: { color: 'bg-green-500', icon: Activity, label: 'Running' },
    completed: { color: 'bg-emerald-600', icon: CheckCircle2, label: 'Completed' },
    failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'bg-gray-500', icon: XCircle, label: 'Cancelled' },
  };

  const statusInfo = statusConfig[job.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  // Prepare metrics data for chart
  const chartData = metrics.map((m: any) => ({
    step: m.step,
    epoch: m.epoch,
    training_loss: m.training_loss,
    validation_loss: m.validation_loss,
    learning_rate: m.learning_rate * 10000, // Scale for visibility
  }));

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        setShowCancelConfirm(false);
        // Job will be updated via polling
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/training/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Training Monitor</h1>
            <p className="text-gray-600 mt-1">{job.dataset?.name || 'Training Job'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusInfo.color} flex items-center gap-2 text-white px-3 py-1`}>
            <StatusIcon className="h-4 w-4" />
            {statusInfo.label}
          </Badge>
          {['queued', 'initializing', 'running'].includes(job.status) && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Job
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Are you sure you want to cancel this training job?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                No
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                Yes, Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {job.status === 'running' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-semibold">{job.progress.toFixed(1)}%</span>
              </div>
              <Progress value={job.progress} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Epoch {job.current_epoch} / {job.total_epochs}</span>
                <span>Step {job.current_step?.toLocaleString()} / {job.total_steps?.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Training Loss */}
        {job.current_metrics?.training_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Training Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.training_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Loss */}
        {job.current_metrics?.validation_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                Validation Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.validation_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Throughput */}
        {job.current_metrics?.throughput && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.throughput.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">tokens/sec</div>
            </CardContent>
          </Card>
        )}

        {/* Current Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
