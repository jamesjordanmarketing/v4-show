import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { ArrowLeft, History } from 'lucide-react';
import { ModelCardHeader } from '../components/model-artifacts/ModelCardHeader';
import { DownloadSection } from '../components/model-artifacts/DownloadSection';
import { QualityMetricsCard } from '../components/model-artifacts/QualityMetricsCard';
import { TrainingSummaryCard } from '../components/model-artifacts/TrainingSummaryCard';
import { ConfigurationReference } from '../components/model-artifacts/ConfigurationReference';
import { DatasetLineage } from '../components/model-artifacts/DatasetLineage';
import { ModelActions } from '../components/model-artifacts/ModelActions';
import { VersionHistory } from '../components/model-artifacts/VersionHistory';
import {
  mockModelArtifact,
  mockProductionArtifact,
  mockLowQualityArtifact,
  mockModelVersions,
  type ModelArtifact,
  type ModelStatus,
} from '../data/modelArtifactsMockData';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ModelArtifactsPageProps {
  artifactId?: string;
  demoState?: 'default' | 'production' | 'low-quality';
  onBack?: () => void;
}

export function ModelArtifactsPage({ 
  artifactId: propArtifactId, 
  demoState = 'default',
  onBack
}: ModelArtifactsPageProps = {}) {
  // Get artifact ID from props or URL params
  const artifactId = propArtifactId || new URLSearchParams(window.location.search).get('artifact_id') || 'demo-artifact-id';
  
  // State
  const [model, setModel] = useState<ModelArtifact>(
    demoState === 'production' ? mockProductionArtifact :
    demoState === 'low-quality' ? mockLowQualityArtifact :
    mockModelArtifact
  );
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Handle download complete
  const handleDownloadComplete = () => {
    toast.success('Download Complete! 🎉', {
      description: `${model.name} adapter downloaded successfully`,
    });
    
    // Small confetti burst
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
  };
  
  // Handle status change
  const handleStatusChange = (newStatus: ModelStatus) => {
    const oldStatus = model.status;
    setModel(prev => ({ ...prev, status: newStatus }));
    
    if (newStatus === 'production') {
      toast.success('Model Deployed to Production! 🚀', {
        description: 'Your LoRA model is now live and ready for inference',
      });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else if (newStatus === 'archived') {
      toast.info('Model Archived', {
        description: 'Model moved to archived status. You can restore it anytime.',
      });
    }
  };
  
  // Handle delete
  const handleDelete = () => {
    toast.success('Model Deleted', {
      description: 'Model files have been permanently removed from storage',
    });
    
    // In real app: navigate back to models list
    console.log('Navigate to: /models');
    setTimeout(() => {
      window.history.back();
    }, 2000);
  };
  
  // Handle version selection
  const handleVersionSelect = (versionId: string) => {
    const selectedVersion = [mockProductionArtifact, mockModelArtifact, mockLowQualityArtifact]
      .find(v => v.id === versionId);
    
    if (selectedVersion) {
      setModel(selectedVersion);
      setShowVersionHistory(false);
      
      toast.info('Version Loaded', {
        description: `Viewing version: ${selectedVersion.name}`,
      });
      
      // Update URL (in real app)
      console.log('Update URL to:', `/models/${versionId}`);
    }
  };
  
  // Handle navigation to related views
  const handleViewTrainingJob = () => {
    toast.info('Navigating to training job...');
    // In real app: navigate(`/training/jobs/${model.trainingJobId}`);
    console.log('Navigate to:', `/training/jobs/${model.trainingJobId}`);
  };
  
  const handleViewConfiguration = () => {
    toast.info('Opening configuration...');
    // In real app: navigate to P03 with config data in read-only mode
    console.log('Navigate to: /training/configure?view=read-only&job_id=' + model.trainingJobId);
  };
  
  const handleViewDataset = () => {
    toast.info('Navigating to dataset...');
    // In real app: navigate(`/datasets/${model.datasetId}`);
    console.log('Navigate to:', `/datasets/${model.datasetId}`);
  };
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };
  
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Model Artifacts</h1>
            <p className="text-sm text-muted-foreground">
              Trained LoRA adapter ready for deployment
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVersionHistory(!showVersionHistory)}
        >
          <History className="size-4 mr-2" />
          {showVersionHistory ? 'Hide' : 'Show'} Version History
        </Button>
      </div>
      
      {/* Model Card Header */}
      <ModelCardHeader model={model} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Download Section */}
          <DownloadSection
            model={model}
            onDownloadComplete={handleDownloadComplete}
          />
          
          {/* Quality Metrics */}
          <QualityMetricsCard model={model} />
          
          {/* Training Summary */}
          <TrainingSummaryCard
            model={model}
            onViewTrainingJob={handleViewTrainingJob}
          />
          
          {/* Version History (when toggled) */}
          {showVersionHistory && (
            <VersionHistory
              versions={mockModelVersions}
              currentVersionId={model.id}
              onVersionSelect={handleVersionSelect}
            />
          )}
        </div>
        
        {/* Right Column - References & Actions */}
        <div className="space-y-6">
          {/* Configuration Reference */}
          <ConfigurationReference
            model={model}
            onViewConfiguration={handleViewConfiguration}
          />
          
          {/* Dataset Lineage */}
          <DatasetLineage
            model={model}
            onViewDataset={handleViewDataset}
          />
          
          {/* Model Actions */}
          <ModelActions
            model={model}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        </div>
      </div>
      
      {/* Pipeline Completion Message */}
      {model.status === 'stored' && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="size-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl shrink-0">
              🎯
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Training Pipeline Complete!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You've successfully completed the full training pipeline: Dataset → Configuration → Training → Model Artifact.
                Your trained LoRA adapter is ready to use.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleStatusChange('production')}
                >
                  Deploy to Production
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDataset}
                >
                  Train Another Model
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}