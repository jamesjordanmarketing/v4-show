import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Ban, ArrowLeft } from 'lucide-react';
import { ProgressHeaderCard } from '../components/training-monitor/ProgressHeaderCard';
import { StageProgressIndicator } from '../components/training-monitor/StageProgressIndicator';
import { LossCurveGraph } from '../components/training-monitor/LossCurveGraph';
import { CurrentMetricsTable } from '../components/training-monitor/CurrentMetricsTable';
import { CostTrackerCard } from '../components/training-monitor/CostTrackerCard';
import { CancelJobModal } from '../components/training-monitor/CancelJobModal';
import { CompletionBanner } from '../components/training-monitor/CompletionBanner';
import {
  mockActiveTrainingJob,
  mockCompletedTrainingJob,
  mockCostWarningJob,
  type TrainingJob,
} from '../data/trainingMonitorMockData';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface TrainingMonitorPageProps {
  jobId?: string;
  demoState?: 'active' | 'completed' | 'cost-warning';
  onBack?: () => void;
  onViewArtifact?: (artifactId: string, modelName: string) => void;
}

export function TrainingMonitorPage({ 
  jobId: propJobId, 
  demoState = 'active',
  onBack,
  onViewArtifact
}: TrainingMonitorPageProps = {}) {
  // Get job ID from props or URL params
  const jobId = propJobId || new URLSearchParams(window.location.search).get('job_id') || 'demo-job-id';
  
  // State
  const [job, setJob] = useState<TrainingJob>(
    demoState === 'completed' ? mockCompletedTrainingJob :
    demoState === 'cost-warning' ? mockCostWarningJob :
    mockActiveTrainingJob
  );
  const [previousMetrics, setPreviousMetrics] = useState(job.currentMetrics);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Simulate polling for updates (every 60 seconds)
  useEffect(() => {
    if (!autoRefresh || job.status !== 'running') return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, job.status]);
  
  // Simulate job completion after 10 seconds (for demo)
  useEffect(() => {
    if (demoState === 'active' && job.status === 'running') {
      const timeout = setTimeout(() => {
        simulateCompletion();
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [demoState]);
  
  // Simulate metrics update
  const handleRefresh = () => {
    setPreviousMetrics(job.currentMetrics);
    
    // Simulate small progress
    setJob(prev => {
      if (prev.status !== 'running') return prev;
      
      const newStep = Math.min(prev.currentMetrics.currentStep + 50, prev.currentMetrics.totalSteps);
      const newProgress = Math.min(prev.progress + 2, 100);
      
      return {
        ...prev,
        progress: newProgress,
        updatedAt: new Date().toISOString(),
        currentMetrics: {
          ...prev.currentMetrics,
          currentStep: newStep,
          trainingLoss: Math.max(0.31, prev.currentMetrics.trainingLoss - 0.005),
          validationLoss: Math.max(0.32, prev.currentMetrics.validationLoss - 0.006),
        },
      };
    });
    
    setLastUpdate(new Date());
    toast.success('Metrics updated', {
      description: 'Latest training metrics fetched',
    });
  };
  
  // Simulate completion
  const simulateCompletion = () => {
    setJob(mockCompletedTrainingJob);
    
    // Confetti celebration
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    });
    
    toast.success('Training Complete! 🎉', {
      description: 'Your LoRA model is ready to use',
      duration: 5000,
    });
  };
  
  // Handle cancel
  const handleCancel = async (reason: string) => {
    setIsCancelling(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setJob(prev => ({
      ...prev,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    }));
    
    setIsCancelling(false);
    setIsCancelModalOpen(false);
    
    toast.error('Training Job Cancelled', {
      description: `Reason: ${reason}`,
    });
  };
  
  // Handle view model (navigate to P05)
  const handleViewModel = () => {
    toast.info('Navigating to model artifacts...');
    // In real app: navigate(`/models/${job.loraArtifactPath}`);
    console.log('Navigate to:', `/models/${job.loraArtifactPath}`);
    if (onViewArtifact) {
      onViewArtifact(job.loraArtifactPath, job.modelName);
    }
  };
  
  // Handle download artifacts
  const handleDownloadArtifacts = () => {
    toast.success('Download started', {
      description: 'LoRA adapter and training logs',
    });
    console.log('Downloading artifacts from:', job.loraArtifactPath);
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };
  
  const isTrainingComplete = job.status === 'completed';
  const canCancel = job.status === 'running';
  
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Training Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Job ID: {jobId}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {job.status === 'running' && (
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="size-4 mr-2" />
              Refresh
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
            >
              <Ban className="size-4 mr-2" />
              Cancel Job
            </Button>
          )}
        </div>
      </div>
      
      {/* Completion Banner */}
      {isTrainingComplete && (
        <CompletionBanner
          job={job}
          onViewModel={handleViewModel}
          onDownloadArtifacts={handleDownloadArtifacts}
        />
      )}
      
      {/* Progress Header */}
      <ProgressHeaderCard job={job} />
      
      {/* Stage Progression */}
      <StageProgressIndicator
        stages={job.stages}
        currentStage={job.currentStage}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loss Curve */}
          <LossCurveGraph
            lossHistory={job.lossHistory}
            isTrainingComplete={isTrainingComplete}
          />
          
          {/* Metrics Table */}
          <CurrentMetricsTable
            metrics={job.currentMetrics}
            previousMetrics={previousMetrics}
          />
        </div>
        
        {/* Right Column - Cost & Actions */}
        <div className="space-y-6">
          {/* Cost Tracker */}
          <CostTrackerCard
            cost={job.cost}
            instanceType={job.hyperparameters.loraRank > 16 ? 'on-demand' : 'spot'}
          />
          
          {/* Auto-refresh indicator */}
          {job.status === 'running' && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Auto-refresh: <span className="font-semibold text-foreground">Every 60s</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          )}
          
          {/* Training Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold text-sm mb-3">Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preset</span>
                <Badge variant="outline">{job.presetId}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LoRA Rank</span>
                <span className="font-medium">{job.hyperparameters.loraRank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Learning Rate</span>
                <span className="font-medium">{job.hyperparameters.learningRate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch Size</span>
                <span className="font-medium">{job.hyperparameters.batchSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cancel Modal */}
      <CancelJobModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancel}
        job={job}
        isCancelling={isCancelling}
      />
    </div>
  );
}