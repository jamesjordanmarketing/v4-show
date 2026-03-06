// Mock data for Training Job Configurator (P03)

export interface TrainingPreset {
  id: 'conservative' | 'balanced' | 'aggressive';
  name: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: string;
  bestFor: string;
  config: HyperparameterConfig;
  estimatedCost: {
    min: number;
    max: number;
  };
  estimatedDuration: {
    min: number;
    max: number;
  };
}

export interface HyperparameterConfig {
  loraRank: number;
  loraAlpha: number;
  loraDropout: number;
  numEpochs: number;
  batchSize: number;
  learningRate: string;
  warmupRatio: number;
  maxSeqLength: number;
}

export interface GPUConfig {
  type: 'H100-PCIE-80GB' | 'A100-80GB';
  instanceType: 'spot' | 'on-demand';
  spotRate: number;
  onDemandRate: number;
  maxDuration: number;
}

export interface TrainingJobConfig {
  datasetId: string;
  presetId: string;
  hyperparameters: HyperparameterConfig;
  gpuConfig: GPUConfig;
  customSettings: boolean;
}

export interface CostBreakdown {
  baseTraining: number;
  storage: number;
  buffer: number;
  total: {
    min: number;
    max: number;
  };
  hourlyRate: number;
  duration: {
    min: number;
    max: number;
  };
}

export const TRAINING_PRESETS: TrainingPreset[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Slower, safer, lower cost',
    color: 'text-green-700',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50',
    icon: '🛡️',
    bestFor: 'First training attempt, testing workflows',
    config: {
      loraRank: 8,
      loraAlpha: 16,
      loraDropout: 0.05,
      numEpochs: 2,
      batchSize: 4,
      learningRate: '1e-4',
      warmupRatio: 0.03,
      maxSeqLength: 2048,
    },
    estimatedCost: {
      min: 25,
      max: 35,
    },
    estimatedDuration: {
      min: 6,
      max: 8,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Recommended for most use cases',
    color: 'text-blue-700',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50',
    icon: '⚖️',
    bestFor: 'Production training, general use',
    config: {
      loraRank: 16,
      loraAlpha: 32,
      loraDropout: 0.05,
      numEpochs: 3,
      batchSize: 4,
      learningRate: '2e-4',
      warmupRatio: 0.03,
      maxSeqLength: 2048,
    },
    estimatedCost: {
      min: 45,
      max: 55,
    },
    estimatedDuration: {
      min: 10,
      max: 12,
    },
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Faster learning, higher risk',
    color: 'text-purple-700',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50',
    icon: '⚡',
    bestFor: 'Experimentation, advanced users',
    config: {
      loraRank: 32,
      loraAlpha: 64,
      loraDropout: 0.05,
      numEpochs: 5,
      batchSize: 4,
      learningRate: '5e-4',
      warmupRatio: 0.03,
      maxSeqLength: 2048,
    },
    estimatedCost: {
      min: 80,
      max: 100,
    },
    estimatedDuration: {
      min: 16,
      max: 20,
    },
  },
];

export const DEFAULT_GPU_CONFIG: GPUConfig = {
  type: 'H100-PCIE-80GB',
  instanceType: 'spot',
  spotRate: 2.49,
  onDemandRate: 7.99,
  maxDuration: 24,
};

export const GPU_OPTIONS = [
  {
    id: 'H100-PCIE-80GB',
    name: 'H100 PCIe (80GB)',
    recommended: true,
    vram: '80GB',
  },
  {
    id: 'A100-80GB',
    name: 'A100 (80GB)',
    recommended: false,
    vram: '80GB',
  },
];

export const BATCH_SIZE_OPTIONS = [1, 2, 4, 8];

export const MAX_SEQ_LENGTH_OPTIONS = [512, 1024, 2048, 4096];

export function calculateCost(
  config: HyperparameterConfig,
  gpuConfig: GPUConfig,
  datasetSize: number
): CostBreakdown {
  const hourlyRate = gpuConfig.instanceType === 'spot' 
    ? gpuConfig.spotRate 
    : gpuConfig.onDemandRate;

  // Estimate training time based on epochs, batch size, and dataset size
  const stepsPerEpoch = Math.ceil(datasetSize / config.batchSize);
  const totalSteps = stepsPerEpoch * config.numEpochs;
  
  // Rough estimate: ~1 second per step on H100
  const baseTimeHours = totalSteps / 3600;
  
  // Add overhead for preprocessing, validation, etc.
  const overheadMultiplier = 1.3;
  const estimatedTimeMin = baseTimeHours * overheadMultiplier;
  const estimatedTimeMax = baseTimeHours * overheadMultiplier * 1.2;

  const baseTrainingMin = estimatedTimeMin * hourlyRate;
  const baseTrainingMax = estimatedTimeMax * hourlyRate;

  const storage = 5; // Fixed storage cost
  const buffer = 10; // Buffer for unexpected costs

  return {
    baseTraining: (baseTrainingMin + baseTrainingMax) / 2,
    storage,
    buffer,
    total: {
      min: Math.round(baseTrainingMin + storage),
      max: Math.round(baseTrainingMax + storage + buffer),
    },
    hourlyRate,
    duration: {
      min: Math.round(estimatedTimeMin * 10) / 10,
      max: Math.round(estimatedTimeMax * 10) / 10,
    },
  };
}

export interface ValidationItem {
  id: string;
  label: string;
  status: 'complete' | 'warning' | 'incomplete';
  message: string;
}

export function validateConfiguration(
  datasetId: string | null,
  config: HyperparameterConfig,
  gpuConfig: GPUConfig,
  costBreakdown: CostBreakdown
): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Dataset validation
  items.push({
    id: 'dataset',
    label: 'Dataset selected',
    status: datasetId ? 'complete' : 'incomplete',
    message: datasetId ? 'Dataset validated' : 'No dataset selected',
  });

  // Configuration validation
  const configValid = 
    config.loraRank >= 4 && 
    config.loraRank <= 64 &&
    config.numEpochs >= 1 &&
    config.numEpochs <= 10;

  items.push({
    id: 'config',
    label: 'Configuration valid',
    status: configValid ? 'complete' : 'incomplete',
    message: configValid ? 'All parameters within valid ranges' : 'Invalid parameter values',
  });

  // Cost validation
  items.push({
    id: 'cost',
    label: `Cost estimate: $${costBreakdown.total.min}-${costBreakdown.total.max}`,
    status: 'complete',
    message: `${costBreakdown.duration.min}-${costBreakdown.duration.max} hours at $${costBreakdown.hourlyRate}/hr`,
  });

  // Duration validation
  items.push({
    id: 'duration',
    label: `Duration estimate: ${costBreakdown.duration.min}-${costBreakdown.duration.max} hours`,
    status: 'complete',
    message: 'Estimated completion time',
  });

  // Spot instance warning
  if (gpuConfig.instanceType === 'spot') {
    items.push({
      id: 'spot',
      label: 'Spot instance (may interrupt)',
      status: 'warning',
      message: 'Checkpoint recovery enabled',
    });
  }

  return items;
}

export interface TrainingJobResponse {
  success: boolean;
  jobId: string;
  message: string;
  estimatedCompletion: string;
}

export function mockStartTrainingJob(config: TrainingJobConfig): TrainingJobResponse {
  // Simulate API response
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    success: true,
    jobId,
    message: 'Training job created successfully',
    estimatedCompletion: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
}
