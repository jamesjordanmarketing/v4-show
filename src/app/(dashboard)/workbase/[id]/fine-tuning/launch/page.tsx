'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { useTrainingSets } from '@/hooks/useTrainingSets';
import { usePipelineJobs, usePipelineJob, useCreatePipelineJob } from '@/hooks/usePipelineJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrainingParameterSlider } from '@/components/pipeline/TrainingParameterSlider';
import { CostEstimateCard } from '@/components/pipeline/CostEstimateCard';
import { estimateTrainingCost } from '@/lib/pipeline/hyperparameter-utils';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Rocket,
  FileJson,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  SENSITIVITY_OPTIONS,
  PROGRESSION_OPTIONS,
  REPETITION_OPTIONS,
} from '@/types/pipeline';
import type { TrainingSet } from '@/types/workbase';
import type { TrainingSensitivity, TrainingProgression, TrainingRepetition } from '@/types/pipeline';

// Tooltip content for lay-person sliders (same as legacy /pipeline/configure)
const SENSITIVITY_TOOLTIP = {
  explanation: 'Controls how quickly your AI adapts to your training examples.',
  lowImpact: 'Slower learning, very stable. Good for refining existing behavior.',
  highImpact: 'Faster learning, more reactive. Good for teaching new behaviors.',
  technicalNote: 'Maps to learning rate (0.00001 - 0.001)',
};

const PROGRESSION_TOOLTIP = {
  explanation: 'Controls how deeply the AI analyzes each example before moving on.',
  lowImpact: 'More thorough analysis per example, slower overall. Best for complex conversations.',
  highImpact: 'Broader pattern recognition, faster overall. Best for varied training data.',
  technicalNote: 'Maps to batch size (2 - 16)',
};

const REPETITION_TOOLTIP = {
  explanation: 'How many times the AI reviews all your training examples.',
  lowImpact: 'Quick training, good for testing. May not fully learn patterns.',
  highImpact: 'Thorough training, better retention. Takes longer and costs more.',
  technicalNote: 'Maps directly to training epochs',
};

const JOB_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  queued: { label: 'Queued', color: 'bg-yellow-100 text-yellow-700' },
  initializing: { label: 'Initializing', color: 'bg-blue-100 text-blue-700' },
  running: { label: 'Training', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

export default function LaunchTuningPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  // Data fetching
  const { data: workbase } = useWorkbase(workbaseId);
  const { data: trainingSets = [] } = useTrainingSets(workbaseId);
  const { data: jobsData } = usePipelineJobs({ limit: 20, workbaseId });

  // Local state
  const [selectedTrainingSetId, setSelectedTrainingSetId] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [trainingSensitivity, setTrainingSensitivity] = useState<TrainingSensitivity>('medium');
  const [trainingProgression, setTrainingProgression] = useState<TrainingProgression>('medium');
  const [trainingRepetition, setTrainingRepetition] = useState<TrainingRepetition>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createJob = useCreatePipelineJob();

  // Poll active job for inline progress
  const { data: activeJobData } = usePipelineJob(activeJobId);
  const activeJob = activeJobData?.data || null;

  // Derived data
  const hasAdapter = !!workbase?.activeAdapterJobId;
  const readySets = trainingSets.filter((ts: TrainingSet) => ts.status === 'ready');
  const recentJobs = (jobsData as any)?.data || [];

  // Auto-select latest ready training set
  const selectedSet = useMemo(() => {
    if (selectedTrainingSetId) {
      return readySets.find((ts: TrainingSet) => ts.id === selectedTrainingSetId) || null;
    }
    return readySets.length > 0 ? readySets[0] : null;
  }, [selectedTrainingSetId, readySets]);

  // Cost estimate (reuses the same utility as legacy configure page)
  const costEstimate = useMemo(() => {
    return estimateTrainingCost({ trainingSensitivity, trainingProgression, trainingRepetition });
  }, [trainingSensitivity, trainingProgression, trainingRepetition]);

  const isValid = !!selectedSet?.datasetId && jobName.trim().length > 0;

  // Handle job submission
  const handleTrainAndPublish = async () => {
    if (!isValid || !selectedSet?.datasetId) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createJob.mutateAsync({
        jobName: jobName.trim(),
        datasetId: selectedSet.datasetId,
        trainingSensitivity,
        trainingProgression,
        trainingRepetition,
        workbaseId,
      });

      if (result.success && result.data) {
        setActiveJobId(result.data.id);
        setJobName('');
      } else {
        setSubmitError((result as any).error || 'Failed to start training job.');
      }
    } catch (error: any) {
      console.error('Failed to create job:', error);
      setSubmitError(error?.message || 'Failed to start training job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there's an active (non-terminal) job
  const isActiveJobRunning = activeJob && ['pending', 'queued', 'initializing', 'running'].includes(activeJob.status);
  const isActiveJobComplete = activeJob && activeJob.status === 'completed';
  const isActiveJobFailed = activeJob && activeJob.status === 'failed';

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <span
          className="cursor-pointer hover:text-foreground"
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
        >
          Conversations
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className="text-duck-blue font-medium">Launch Tuning</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">Launch Tuning</h1>

      {/* Adapter Status Banner */}
      <div className="mb-6 p-3 rounded-md bg-muted border border-border">
        <div className="flex items-center gap-3">
          <Badge variant={hasAdapter ? 'default' : 'secondary'}>
            {hasAdapter ? 'Live' : 'Not Launched'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {hasAdapter
              ? 'Your adapter is deployed and active.'
              : 'No adapter launched yet. Configure and train below.'}
          </span>
        </div>
      </div>

      {readySets.length === 0 ? (
        /* Empty state — no ready training sets */
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Build a Training Set from your conversations first.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
            >
              Go to Conversations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section A: Training Input */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-duck-blue" />
                  Training Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readySets.length === 1 ? (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium text-foreground">{selectedSet?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSet?.conversationCount} conversations · {selectedSet?.trainingPairCount} training pairs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Training Set</Label>
                    <Select
                      value={selectedSet?.id || ''}
                      onValueChange={(id) => setSelectedTrainingSetId(id)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a training set" />
                      </SelectTrigger>
                      <SelectContent>
                        {readySets.map((ts: TrainingSet) => (
                          <SelectItem key={ts.id} value={ts.id}>
                            {ts.name} ({ts.conversationCount} convos, {ts.trainingPairCount} pairs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedSet && !selectedSet.datasetId && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This training set has no associated dataset. It may still be processing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Section B: Training Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Training Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Job Name */}
                <div className="space-y-2">
                  <Label htmlFor="jobName">Training Job Name</Label>
                  <Input
                    id="jobName"
                    placeholder="e.g., Emotional Intelligence v1.0"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </div>

                {/* Sliders */}
                <TrainingParameterSlider
                  id="sensitivity"
                  label="Training Sensitivity"
                  description="How quickly your AI learns from examples"
                  tooltipContent={SENSITIVITY_TOOLTIP}
                  options={SENSITIVITY_OPTIONS}
                  value={trainingSensitivity}
                  onChange={(v) => setTrainingSensitivity(v as TrainingSensitivity)}
                />

                <TrainingParameterSlider
                  id="progression"
                  label="Training Progression"
                  description="How deeply each example is analyzed"
                  tooltipContent={PROGRESSION_TOOLTIP}
                  options={PROGRESSION_OPTIONS}
                  value={trainingProgression}
                  onChange={(v) => setTrainingProgression(v as TrainingProgression)}
                />

                <TrainingParameterSlider
                  id="repetition"
                  label="Training Repetition"
                  description="How many times all examples are reviewed"
                  tooltipContent={REPETITION_TOOLTIP}
                  options={REPETITION_OPTIONS}
                  value={trainingRepetition}
                  onChange={(v) => setTrainingRepetition(v as TrainingRepetition)}
                />
              </CardContent>
            </Card>

            {/* Inline Progress (when job is active) */}
            {activeJob && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    {isActiveJobRunning && <Loader2 className="h-5 w-5 animate-spin text-duck-blue" />}
                    {isActiveJobComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    {isActiveJobFailed && <AlertCircle className="h-5 w-5 text-red-600" />}
                    Training Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground font-medium">{activeJob.jobName}</span>
                    <Badge className={JOB_STATUS_LABELS[activeJob.status]?.color || 'bg-muted text-muted-foreground'}>
                      {JOB_STATUS_LABELS[activeJob.status]?.label || activeJob.status}
                    </Badge>
                  </div>

                  {isActiveJobRunning && (
                    <>
                      <Progress value={activeJob.progress || 0} className="h-2" />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress</span>
                          <p className="font-medium text-foreground">{activeJob.progress || 0}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Epoch</span>
                          <p className="font-medium text-foreground">{activeJob.currentEpoch || 0}/{activeJob.trainingRepetition || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Loss</span>
                          <p className="font-medium text-foreground">{activeJob.currentLoss?.toFixed(4) || '-'}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {isActiveJobComplete && (
                    <div className="p-4 bg-green-50 rounded-md border border-green-200">
                      <p className="text-sm text-green-800 font-medium">
                        Adapter trained and deployed successfully!
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/chat`)}
                      >
                        Open Behavior Chat
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </div>
                  )}

                  {isActiveJobFailed && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {activeJob.errorMessage || 'Training failed. Please try again.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Section D: Adapter History */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Adapter History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Past adapter launches will appear here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentJobs.map((job: any) => {
                      const isCompleted = job.status === 'completed';
                      return (
                        <div
                          key={job.id}
                          className={`flex items-center justify-between p-3 bg-muted rounded-md transition-colors ${
                            isCompleted ? 'cursor-pointer hover:bg-muted/80' : ''
                          }`}
                          onClick={() => {
                            if (isCompleted) {
                              router.push(`/workbase/${workbaseId}/fine-tuning/launch/adapter/${job.id}`);
                            }
                          }}
                        >
                          <div>
                            <span className="text-sm text-foreground font-medium">
                              {job.jobName || job.id.slice(0, 8)}
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(job.createdAt).toLocaleDateString()} ·{' '}
                              {job.estimatedCost ? ` $${job.estimatedCost.toFixed(2)}` : ''}
                              {isCompleted && (
                                <span className="ml-1 text-duck-blue">· View details →</span>
                              )}
                            </p>
                          </div>
                          <Badge className={JOB_STATUS_LABELS[job.status]?.color || 'bg-muted text-muted-foreground'}>
                            {JOB_STATUS_LABELS[job.status]?.label || job.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Cost & Launch */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Section C: Cost Estimate */}
              <CostEstimateCard
                computeCost={costEstimate.computeCost}
                evaluationCost={costEstimate.evaluationCost}
                totalCost={costEstimate.totalCost}
                estimatedDuration={costEstimate.estimatedDuration}
              />

              {/* Train & Publish Button */}
              <Button
                size="lg"
                className="w-full"
                disabled={!isValid || isSubmitting || !!isActiveJobRunning}
                onClick={handleTrainAndPublish}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : isActiveJobRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Training in Progress
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Train &amp; Publish
                  </>
                )}
              </Button>

              {!isValid && !isActiveJobRunning && (
                <p className="text-sm text-muted-foreground text-center">
                  {!selectedSet?.datasetId
                    ? 'Waiting for training set to finish processing...'
                    : 'Enter a job name to continue'}
                </p>
              )}

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
