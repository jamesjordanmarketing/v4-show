import React, { useState } from 'react';
import { ChevronDown, Rocket } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import type { TrainingJob } from '../../data/mockData';

interface ActiveTrainingIndicatorProps {
  jobs: TrainingJob[];
  onJobClick?: (jobId: string) => void;
}

export function ActiveTrainingIndicator({ jobs, onJobClick }: ActiveTrainingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (jobs.length === 0) {
    return null;
  }

  const getStatusColor = (status: TrainingJob['status']) => {
    switch (status) {
      case 'training':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3"
      >
        <div className="relative">
          <Rocket className="size-4" />
          <div className={cn(
            "absolute -top-1 -right-1 size-2 rounded-full animate-pulse",
            getStatusColor('training')
          )} />
        </div>
        <span className="hidden lg:inline">
          Training: {jobs.length} active
        </span>
        <ChevronDown className={cn(
          "size-4 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-[380px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-medium">Active Training Jobs</h3>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 border-b border-border last:border-b-0 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onJobClick?.(job.id);
                    setIsExpanded(false);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "size-2 rounded-full",
                          getStatusColor(job.status),
                          job.status === 'training' && "animate-pulse"
                        )} />
                        <h4 className="text-sm font-medium">{job.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{job.gpuType}</span>
                        <span>•</span>
                        <span>{job.elapsedTime}</span>
                      </div>
                    </div>
                    <Badge variant={job.status === 'warning' ? 'destructive' : 'secondary'}>
                      {job.progress}%
                    </Badge>
                  </div>
                  
                  <Progress value={job.progress} className="h-1.5" />
                  
                  {job.currentEpoch && job.totalEpochs && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Epoch {job.currentEpoch}/{job.totalEpochs}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-border bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onJobClick?.('all');
                  setIsExpanded(false);
                }}
              >
                View All Training Jobs
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
