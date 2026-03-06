/**
 * Training Progress Panel
 * 
 * Real-time progress display during training
 */

'use client';

import { Activity, Clock, TrendingDown, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PipelineTrainingJob, PipelineJobStatus } from '@/types/pipeline';

interface TrainingProgressPanelProps {
  job: PipelineTrainingJob;
}

const STATUS_COLORS: Record<PipelineJobStatus, string> = {
  pending: 'bg-yellow-500',
  queued: 'bg-yellow-500',
  initializing: 'bg-blue-500',
  running: 'bg-green-500',
  completed: 'bg-green-600',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const STATUS_LABELS: Record<PipelineJobStatus, string> = {
  pending: 'Pending',
  queued: 'In Queue',
  initializing: 'Initializing',
  running: 'Training',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function TrainingProgressPanel({ job }: TrainingProgressPanelProps) {
  const isActive = ['pending', 'queued', 'initializing', 'running'].includes(job.status);
  
  // Calculate elapsed time
  const elapsedMs = job.startedAt 
    ? Date.now() - new Date(job.startedAt).getTime() 
    : 0;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;
  const elapsedDisplay = elapsedHours > 0 
    ? `${elapsedHours}h ${remainingMinutes}m` 
    : `${elapsedMinutes}m`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            <CardTitle className="text-lg">Training Progress</CardTitle>
          </div>
          <Badge className={STATUS_COLORS[job.status]}>
            {STATUS_LABELS[job.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Epoch {job.currentEpoch}/{job.epochs}</span>
              <span>Step {job.currentStep}/{job.totalSteps || '?'}</span>
            </div>
          </div>

          {/* Real-time metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Current Loss</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {job.currentLoss?.toFixed(4) || '--'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Tokens/sec</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {job.tokensPerSecond?.toFixed(0) || '--'}
              </p>
            </div>
          </div>

          {/* Time info */}
          <div className="flex items-center justify-between text-sm border-t pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Elapsed Time</span>
            </div>
            <span className="font-medium">{elapsedDisplay}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
