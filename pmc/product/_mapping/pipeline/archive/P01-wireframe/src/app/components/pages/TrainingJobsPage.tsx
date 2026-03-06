import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Rocket, Play, Clock, CircleCheck, CircleX } from 'lucide-react';
import type { TrainingJob } from '../../data/mockData';
import { formatTimeAgo } from '../../data/mockData';

interface TrainingJobsPageProps {
  activeJobs: TrainingJob[];
  queuedJobs: TrainingJob[];
  completedJobs: TrainingJob[];
  onStartTraining?: () => void;
  onViewJob?: (jobId: string) => void;
}

export function TrainingJobsPage({
  activeJobs,
  queuedJobs,
  completedJobs,
  onStartTraining,
  onViewJob
}: TrainingJobsPageProps) {
  const getStatusIcon = (status: TrainingJob['status']) => {
    switch (status) {
      case 'training':
        return <Rocket className="size-4 text-blue-500" />;
      case 'queued':
        return <Clock className="size-4 text-amber-500" />;
      case 'completed':
        return <CircleCheck className="size-4 text-green-500" />;
      case 'failed':
        return <CircleX className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TrainingJob['status']) => {
    const variants = {
      training: 'default',
      queued: 'secondary',
      completed: 'default',
      failed: 'destructive',
      warning: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderJobCard = (job: TrainingJob) => (
    <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewJob?.(job.id)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <CardTitle className="text-base">{job.name}</CardTitle>
          </div>
          {getStatusBadge(job.status)}
        </div>
        {job.dataset && (
          <CardDescription>Dataset: {job.dataset}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {job.status === 'training' && (
          <>
            <Progress value={job.progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress: {job.progress}%</span>
              {job.currentEpoch && job.totalEpochs && (
                <span className="text-muted-foreground">
                  Epoch {job.currentEpoch}/{job.totalEpochs}
                </span>
              )}
            </div>
          </>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {job.gpuType && (
            <div>
              <span className="font-medium">GPU:</span> {job.gpuType}
            </div>
          )}
          {job.elapsedTime && (
            <div>
              <span className="font-medium">Time:</span> {job.elapsedTime}
            </div>
          )}
          {job.costPerHour && (
            <div>
              <span className="font-medium">Cost:</span> ${job.costPerHour}/hr
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Training Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your LoRA training jobs
          </p>
        </div>
        <Button onClick={onStartTraining}>
          <Play className="size-4 mr-2" />
          Start New Training
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active {activeJobs.length > 0 && `(${activeJobs.length})`}
          </TabsTrigger>
          <TabsTrigger value="queued">
            Queued {queuedJobs.length > 0 && `(${queuedJobs.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completedJobs.length > 0 && `(${completedJobs.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Rocket className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="mb-2">No active training jobs</h3>
                  <p className="text-muted-foreground mb-6">
                    Start a new training job to see it here
                  </p>
                  <Button onClick={onStartTraining}>
                    <Play className="size-4 mr-2" />
                    Start Training
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="queued" className="space-y-4 mt-6">
          {queuedJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="size-16 mx-auto mb-4 opacity-50" />
                  <p>No queued jobs</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {queuedJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="size-16 mx-auto mb-4 opacity-50" />
                  <p>No completed jobs</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedJobs.map(renderJobCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}