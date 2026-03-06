import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { ChevronDown, ChevronUp, Save, X, Rocket } from 'lucide-react';
import { DatasetContextCard } from '../components/training/DatasetContextCard';
import { PresetSelector } from '../components/training/PresetSelector';
import { AdvancedSettingsPanel } from '../components/training/AdvancedSettingsPanel';
import { CostEstimationPanel } from '../components/training/CostEstimationPanel';
import { ValidationChecklist } from '../components/training/ValidationChecklist';
import { LaunchConfirmationModal } from '../components/training/LaunchConfirmationModal';
import { mockDatasets } from '../data/datasetMockData';
import {
  TRAINING_PRESETS,
  DEFAULT_GPU_CONFIG,
  calculateCost,
  validateConfiguration,
  mockStartTrainingJob,
  type HyperparameterConfig,
  type GPUConfig,
  type TrainingJobConfig,
} from '../data/trainingConfigMockData';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface TrainingConfiguratorPageProps {
  datasetId?: string;
  datasetName?: string;
  onBack?: () => void;
  onStartTraining?: (jobId: string, jobName: string) => void;
}

export function TrainingConfiguratorPage({ 
  datasetId: propDatasetId,
  datasetName: propDatasetName,
  onBack,
  onStartTraining
}: TrainingConfiguratorPageProps = {}) {
  // Get dataset ID from props or URL params (mock for now - will use router later)
  const datasetId = propDatasetId || new URLSearchParams(window.location.search).get('dataset_id') || mockDatasets[0].id;

  // Find the selected dataset
  const dataset = mockDatasets.find(d => d.id === datasetId) || mockDatasets[0];

  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('balanced');
  const [config, setConfig] = useState<HyperparameterConfig>(
    TRAINING_PRESETS.find(p => p.id === 'balanced')!.config
  );
  const [gpuConfig, setGPUConfig] = useState<GPUConfig>(DEFAULT_GPU_CONFIG);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Get current preset
  const currentPreset = TRAINING_PRESETS.find(p => p.id === selectedPresetId);

  // Calculate cost breakdown
  const costBreakdown = useMemo(
    () => calculateCost(config, gpuConfig, dataset.totalTrainingPairs),
    [config, gpuConfig, dataset.totalTrainingPairs]
  );

  // Validate configuration
  const validationItems = useMemo(
    () => validateConfiguration(datasetId, config, gpuConfig, costBreakdown),
    [datasetId, config, gpuConfig, costBreakdown]
  );

  const isValid = validationItems.every(
    item => item.status === 'complete' || item.status === 'warning'
  );

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    const preset = TRAINING_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setConfig(preset.config);
      setIsCustom(false);
    }
  };

  // Handle config change (marks as custom)
  const handleConfigChange = (newConfig: HyperparameterConfig) => {
    setConfig(newConfig);
    setIsCustom(true);
  };

  // Handle launch
  const handleLaunch = async () => {
    setIsLaunching(true);

    try {
      // Simulate API call
      const jobConfig: TrainingJobConfig = {
        datasetId: dataset.id,
        presetId: isCustom ? 'custom' : selectedPresetId,
        hyperparameters: config,
        gpuConfig,
        customSettings: isCustom,
      };

      const response = mockStartTrainingJob(jobConfig);

      // Show success
      setIsLaunching(false);
      setIsConfirmModalOpen(false);

      // Confetti celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success('Training Job Created!', {
        description: `Job ID: ${response.jobId}`,
      });

      // Redirect to P04 (training monitor) after 2 seconds
      setTimeout(() => {
        toast.info('Redirecting to job monitor...');
        // In real app: navigate(`/training/jobs/${response.jobId}`);
        console.log('Navigate to:', `/training/jobs/${response.jobId}`);
        if (onStartTraining) {
          onStartTraining(response.jobId, dataset.name);
        }
      }, 2000);

    } catch (error) {
      setIsLaunching(false);
      toast.error('Failed to start training job', {
        description: 'Please try again or contact support',
      });
    }
  };

  // Handle save configuration
  const handleSaveConfig = () => {
    toast.success('Configuration saved', {
      description: 'You can launch training later from saved configurations',
    });
  };

  // Handle change dataset
  const handleChangeDataset = () => {
    toast.info('Navigating back to datasets...');
    // In real app: navigate('/datasets');
    console.log('Navigate to: /datasets');
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Training Job Configurator</h1>
          <p className="text-muted-foreground">
            Configure hyperparameters and launch your LoRA training job
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            <X className="size-4 mr-2" />
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveConfig}>
            <Save className="size-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Dataset Context Card */}
      <DatasetContextCard
        dataset={dataset}
        onChangeDataset={handleChangeDataset}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Selector */}
          <PresetSelector
            presets={TRAINING_PRESETS}
            selectedPresetId={selectedPresetId}
            onSelectPreset={handlePresetSelect}
            isCustom={isCustom}
          />

          {/* Advanced Settings */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="text-left">
                    <h3 className="font-semibold">Advanced Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Fine-tune hyperparameters and GPU configuration
                    </p>
                  </div>
                  {isAdvancedOpen ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <AdvancedSettingsPanel
                    config={config}
                    gpuConfig={gpuConfig}
                    onConfigChange={handleConfigChange}
                    onGPUConfigChange={setGPUConfig}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Right Column - Cost & Validation */}
        <div className="space-y-6">
          {/* Cost Estimation */}
          <CostEstimationPanel
            costBreakdown={costBreakdown}
            instanceType={gpuConfig.instanceType}
          />

          {/* Validation Checklist */}
          <ValidationChecklist items={validationItems} />

          {/* Launch Button */}
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!isValid}
          >
            <Rocket className="size-5 mr-2" />
            Start Training
          </Button>

          {!isValid && (
            <p className="text-xs text-center text-muted-foreground">
              Complete all validation items to enable launch
            </p>
          )}
        </div>
      </div>

      {/* Launch Confirmation Modal */}
      <LaunchConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleLaunch}
        dataset={dataset}
        preset={currentPreset}
        config={config}
        gpuConfig={gpuConfig}
        costBreakdown={costBreakdown}
        isCustom={isCustom}
        isLaunching={isLaunching}
      />
    </div>
  );
}