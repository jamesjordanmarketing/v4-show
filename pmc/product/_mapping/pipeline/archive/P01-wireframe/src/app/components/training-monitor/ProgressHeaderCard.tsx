import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Clock, Zap, TrendingDown } from 'lucide-react';
import type { TrainingJob } from '../../data/trainingMonitorMockData';
import { calculateElapsedTime, calculateRemainingTime } from '../../data/trainingMonitorMockData';

interface ProgressHeaderCardProps {
  job: TrainingJob;
}

export function ProgressHeaderCard({ job }: ProgressHeaderCardProps) {
  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(job.startedAt).getTime()) / 1000
  );
  
  const elapsed = calculateElapsedTime(job.startedAt);
  const remaining = calculateRemainingTime(job.progress, elapsedSeconds);
  
  const getStatusBadge = () => {
    switch (job.status) {
      case 'running':
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">
            <span className="inline-block size-2 bg-white rounded-full mr-2 animate-pulse"></span>
            Training
          </Badge>
        );
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">✓ Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">✗ Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{job.name}</h2>
          <p className="text-sm text-muted-foreground">
            Training on: {job.datasetName} ({job.totalTrainingPairs.toLocaleString()} pairs)
          </p>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-blue-600">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-3" />
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="size-3" />
              Current Step
            </p>
            <p className="text-lg font-semibold">
              {job.currentMetrics.currentStep.toLocaleString()}
              <span className="text-sm text-muted-foreground font-normal">
                {' '}/ {job.currentMetrics.totalSteps.toLocaleString()}
              </span>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current Epoch</p>
            <p className="text-lg font-semibold">
              {job.currentMetrics.currentEpoch}
              <span className="text-sm text-muted-foreground font-normal">
                {' '}/ {job.currentMetrics.totalEpochs}
              </span>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Elapsed
            </p>
            <p className="text-lg font-semibold">{elapsed}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Remaining
            </p>
            <p className="text-lg font-semibold text-blue-600">{remaining}</p>
          </div>
        </div>
        
        {/* Training Loss Preview */}
        {job.status === 'running' && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Training Loss:</span>
                <span className="font-semibold">{job.currentMetrics.trainingLoss.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Validation Loss:</span>
                <span className="font-semibold">{job.currentMetrics.validationLoss.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
