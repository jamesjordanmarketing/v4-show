import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { TrendingUp, Database, Rocket, Brain, Activity } from 'lucide-react';
import type { TrainingJob, RecentActivity } from '../../data/mockData';
import { formatTimeAgo } from '../../data/mockData';

interface DashboardPageProps {
  activeJobs: TrainingJob[];
  completedJobs: TrainingJob[];
  recentActivity: RecentActivity[];
  onViewTraining?: () => void;
  onViewDatasets?: () => void;
  onViewModels?: () => void;
}

export function DashboardPage({
  activeJobs,
  completedJobs,
  recentActivity,
  onViewTraining,
  onViewDatasets,
  onViewModels
}: DashboardPageProps) {
  const totalJobs = activeJobs.length + completedJobs.length;
  const successRate = completedJobs.length > 0
    ? (completedJobs.filter(j => j.status === 'completed').length / completedJobs.length * 100).toFixed(0)
    : 0;

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'training_started':
        return <Rocket className="size-4 text-blue-500" />;
      case 'training_completed':
        return <Activity className="size-4 text-green-500" />;
      case 'model_deployed':
        return <Brain className="size-4 text-purple-500" />;
      case 'dataset_uploaded':
        return <Database className="size-4 text-orange-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1>Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your LoRA training pipeline
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Training</CardDescription>
            <CardTitle className="text-3xl">{activeJobs.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {activeJobs.length > 0 ? 'Jobs in progress' : 'No active jobs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{totalJobs}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All time training jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-3xl">{successRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-green-500">
              <TrendingUp className="size-4 mr-1" />
              <span>Completed successfully</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Models Trained</CardDescription>
            <CardTitle className="text-3xl">{completedJobs.filter(j => j.status === 'completed').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Ready to deploy
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Training Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Active Training Jobs</CardTitle>
            <CardDescription>Currently running training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {activeJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Rocket className="size-12 mx-auto mb-3 opacity-50" />
                <p>No active training jobs</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onViewTraining}
                >
                  Start Training
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{job.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.gpuType} • {job.elapsedTime}
                        </p>
                      </div>
                      <Badge>{job.progress}%</Badge>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                    {job.currentEpoch && job.totalEpochs && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Epoch {job.currentEpoch}/{job.totalEpochs}
                      </p>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onViewTraining}
                >
                  View All Training Jobs
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.user && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Button variant="outline" className="justify-start" onClick={onViewDatasets}>
              <Database className="size-4 mr-2" />
              Manage Datasets
            </Button>
            <Button variant="outline" className="justify-start" onClick={onViewTraining}>
              <Rocket className="size-4 mr-2" />
              Start Training
            </Button>
            <Button variant="outline" className="justify-start" onClick={onViewModels}>
              <Brain className="size-4 mr-2" />
              View Models
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
