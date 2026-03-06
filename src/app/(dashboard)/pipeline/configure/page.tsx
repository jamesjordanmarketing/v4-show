/**
 * Pipeline Configuration Page (E08)
 * 
 * Lay-person accessible training configuration
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  TrainingDataSummaryCard,
  TrainingParameterSlider,
  EngineFeaturesPanel,
  PostTrainingEvaluationInfo,
  CostEstimateCard,
  DatasetSelectorModal,
} from '@/components/pipeline';
import type { Dataset } from '@/lib/types/lora-training';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useCreatePipelineJob } from '@/hooks/usePipelineJobs';
import {
  SENSITIVITY_OPTIONS,
  PROGRESSION_OPTIONS,
  REPETITION_OPTIONS,
} from '@/types/pipeline';

// Tooltip content for lay-person sliders
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

export default function PipelineConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const {
    selectedFileId,
    selectedFileName,
    trainingSensitivity,
    trainingProgression,
    trainingRepetition,
    jobName,
    setSelectedFile,
    setTrainingSensitivity,
    setTrainingProgression,
    setTrainingRepetition,
    setJobName,
    getCostEstimate,
    isConfigurationValid,
    getEngine,
  } = usePipelineStore();

  // Pre-populate dataset from URL ?datasetId= param (BUG-011 fix)
  useEffect(() => {
    const datasetId = searchParams.get('datasetId');
    if (!datasetId || selectedFileId) return;

    fetch(`/api/datasets/${datasetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const dataset: Dataset | undefined = body?.data?.dataset;
        if (dataset) {
          setSelectedFile(dataset.id, dataset.name);
          setSelectedDataset(dataset);
        }
      })
      .catch(() => {
        // Silent — user can still pick manually
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const createJob = useCreatePipelineJob();
  const costEstimate = getCostEstimate();
  const engine = getEngine();
  const isValid = isConfigurationValid();

  const handleOpenDatasetSelector = () => {
    setIsDatasetModalOpen(true);
  };

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setSelectedFile(dataset.id, dataset.name);
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedFileId) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createJob.mutateAsync({
        jobName,
        datasetId: selectedFileId,
        trainingSensitivity,
        trainingProgression,
        trainingRepetition,
      });
      
      if (result.success && result.data) {
        router.push(`/pipeline/jobs/${result.data.id}`);
      } else {
        setSubmitError((result as any).error || 'Failed to start training job. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to create job:', error);
      setSubmitError(error?.message || 'Failed to start training job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configure Training</h1>
        <p className="text-muted-foreground mt-2">
          Set up your AI training job with your emotional intelligence training data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main configuration - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Training Data */}
          <TrainingDataSummaryCard
            fileName={selectedFileName}
            conversationCount={selectedDataset?.avg_turns_per_conversation ? Math.round(selectedDataset.total_training_pairs! / selectedDataset.avg_turns_per_conversation) : 0}
            trainingPairsCount={selectedDataset?.total_training_pairs || 0}
            isReady={!!selectedFileId && !!selectedDataset?.training_ready}
            onSelectFile={handleOpenDatasetSelector}
          />

          {/* Dataset Selector Modal */}
          <DatasetSelectorModal
            open={isDatasetModalOpen}
            onOpenChange={setIsDatasetModalOpen}
            onSelect={handleDatasetSelect}
            selectedDatasetId={selectedFileId}
          />

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

          {/* Training Parameters */}
          <div className="space-y-8 p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold">Training Settings</h2>
            
            <TrainingParameterSlider
              id="sensitivity"
              label="Training Sensitivity"
              description="How quickly your AI learns from examples"
              tooltipContent={SENSITIVITY_TOOLTIP}
              options={SENSITIVITY_OPTIONS}
              value={trainingSensitivity}
              onChange={(v) => setTrainingSensitivity(v as any)}
            />

            <TrainingParameterSlider
              id="progression"
              label="Training Progression"
              description="How deeply each example is analyzed"
              tooltipContent={PROGRESSION_TOOLTIP}
              options={PROGRESSION_OPTIONS}
              value={trainingProgression}
              onChange={(v) => setTrainingProgression(v as any)}
            />

            <TrainingParameterSlider
              id="repetition"
              label="Training Repetition"
              description="How many times all examples are reviewed"
              tooltipContent={REPETITION_TOOLTIP}
              options={REPETITION_OPTIONS}
              value={trainingRepetition}
              onChange={(v) => setTrainingRepetition(v as any)}
            />
          </div>

          {/* Engine Features (display only) */}
          <EngineFeaturesPanel engine={engine} />

          {/* Automatic Evaluations (display only) */}
          <PostTrainingEvaluationInfo evaluations={engine.evaluations} />
        </div>

        {/* Sidebar - Cost estimate and submit */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <CostEstimateCard
              computeCost={costEstimate.computeCost}
              evaluationCost={costEstimate.evaluationCost}
              totalCost={costEstimate.totalCost}
              estimatedDuration={costEstimate.estimatedDuration}
            />

            <Button
              size="lg"
              className="w-full"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Starting Training...' : 'Start Training'}
            </Button>

            {!isValid && (
              <p className="text-sm text-muted-foreground text-center">
                Select a training file and enter a job name to continue
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
    </div>
  );
}
