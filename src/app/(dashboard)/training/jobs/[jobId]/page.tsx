'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrainingJob, useCancelJob } from '@/hooks/useTrainingConfig';
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

/**
 * Training Monitor Page
 * From Section E04 - Training Execution & Monitoring
 * Route: /training/jobs/[jobId]
 */
export default function TrainingMonitorPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useTrainingJob(params.jobId);
  const { mutate: cancelJob, isPending: isCancelling } = useCancelJob();
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

  const handleCancel = () => {
    cancelJob(job.id);
    setShowCancelConfirm(false);
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
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                'Cancel Job'
              )}
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
                <span className="font-semibold">{job.progress?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={job.progress || 0} className="h-3" />
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
              Current Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(job.final_cost || job.current_cost || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              Est. ${job.estimated_total_cost?.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Metrics, Configuration, Info */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Metrics & Charts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="info">Job Info</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {/* Loss Curves */}
          {metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Training & Validation Loss</CardTitle>
                <CardDescription>Loss curves over training steps</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="step" 
                      label={{ value: 'Training Steps', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="training_loss" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      name="Training Loss"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="validation_loss" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Validation Loss"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* GPU Metrics */}
          {job.current_metrics?.gpu_utilization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  GPU Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>GPU Usage</span>
                    <span className="font-semibold">{job.current_metrics.gpu_utilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={job.current_metrics.gpu_utilization} className="h-2" />
                  <p className="text-xs text-gray-600 mt-2">
                    {job.gpu_config.num_gpus}x {job.gpu_config.gpu_type}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No metrics yet */}
          {metrics.length === 0 && job.status === 'running' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-gray-600">Waiting for first metrics from GPU cluster...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hyperparameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">Learning Rate</div>
                  <div className="text-lg">{job.hyperparameters.learning_rate}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Batch Size</div>
                  <div className="text-lg">{job.hyperparameters.batch_size}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Epochs</div>
                  <div className="text-lg">{job.hyperparameters.num_epochs}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">LoRA Rank</div>
                  <div className="text-lg">{job.hyperparameters.lora_rank}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">LoRA Alpha</div>
                  <div className="text-lg">{job.hyperparameters.lora_alpha}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Dropout</div>
                  <div className="text-lg">{job.hyperparameters.lora_dropout}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GPU Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">GPU Type</div>
                  <div className="text-lg">{job.gpu_config.gpu_type}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">GPU Count</div>
                  <div className="text-lg">{job.gpu_config.num_gpus}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Cost per GPU</div>
                  <div className="text-lg">${job.gpu_config.cost_per_gpu_hour?.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Total Hourly Rate</div>
                  <div className="text-lg">${(job.gpu_config.cost_per_gpu_hour * job.gpu_config.num_gpus).toFixed(2)}/hr</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job ID:</span>
                  <span className="font-mono">{job.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dataset:</span>
                  <span>{job.dataset?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preset:</span>
                  <span className="capitalize">{job.preset_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(job.created_at).toLocaleString()}</span>
                </div>
                {job.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span>{new Date(job.started_at).toLocaleString()}</span>
                  </div>
                )}
                {job.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span>{new Date(job.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {job.external_job_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">External Job ID:</span>
                    <span className="font-mono text-xs">{job.external_job_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {job.status === 'failed' && job.error_message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Error Message:</div>
                <div className="text-sm">{job.error_message}</div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

