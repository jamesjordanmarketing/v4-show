// Mock data for Training Progress Monitor (P04)

export type TrainingStage = 'preprocessing' | 'model_loading' | 'training' | 'finalization';
export type TrainingStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StageStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface TrainingMetrics {
  trainingLoss: number;
  validationLoss: number;
  learningRate: number;
  gpuUtilization: number;
  gpuMemoryUsed: number;
  gpuMemoryTotal: number;
  perplexity?: number;
  tokensPerSecond: number;
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
}

export interface MetricTrend {
  value: number;
  previousValue: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
}

export interface LossDataPoint {
  step: number;
  trainingLoss: number;
  validationLoss: number;
  timestamp: string;
}

export interface TrainingStageInfo {
  stage: TrainingStage;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // in seconds
  substatus?: string;
  estimatedDuration: {
    min: number;
    max: number;
  };
}

export interface CostInfo {
  estimated: {
    min: number;
    max: number;
  };
  currentSpend: number;
  hourlyRate: number;
  projectedFinal: number;
  percentage: number;
}

export interface TrainingJob {
  id: string;
  name: string;
  status: TrainingStatus;
  datasetId: string;
  datasetName: string;
  totalTrainingPairs: number;
  
  // Configuration from P03
  presetId: string;
  hyperparameters: {
    loraRank: number;
    learningRate: string;
    numEpochs: number;
    batchSize: number;
  };
  
  // Timestamps
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Progress
  currentStage: TrainingStage;
  stages: TrainingStageInfo[];
  progress: number; // 0-100
  
  // Metrics
  currentMetrics: TrainingMetrics;
  lossHistory: LossDataPoint[];
  
  // Cost
  cost: CostInfo;
  
  // Completion
  loraArtifactPath?: string;
  finalMetrics?: {
    finalTrainingLoss: number;
    finalValidationLoss: number;
    finalPerplexity: number;
  };
}

export interface EventLogEntry {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  stage: TrainingStage;
  message: string;
}

// Mock training job - Active training state (42% complete)
export const mockActiveTrainingJob: TrainingJob = {
  id: 'job-1734643200-abc123',
  name: 'Healthcare Consultant - Balanced',
  status: 'running',
  datasetId: 'dataset-1',
  datasetName: 'Healthcare Consultant Conversations',
  totalTrainingPairs: 1567,
  
  presetId: 'balanced',
  hyperparameters: {
    loraRank: 16,
    learningRate: '2e-4',
    numEpochs: 3,
    batchSize: 4,
  },
  
  startedAt: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(), // 6.5 hours ago
  updatedAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
  
  currentStage: 'training',
  stages: [
    {
      stage: 'preprocessing',
      status: 'completed',
      startedAt: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 6.47 * 60 * 60 * 1000).toISOString(),
      duration: 222, // 3m 42s
      estimatedDuration: { min: 2, max: 5 },
    },
    {
      stage: 'model_loading',
      status: 'completed',
      startedAt: new Date(Date.now() - 6.47 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 6.28 * 60 * 60 * 1000).toISOString(),
      duration: 678, // 11m 18s
      estimatedDuration: { min: 10, max: 15 },
    },
    {
      stage: 'training',
      status: 'active',
      startedAt: new Date(Date.now() - 6.28 * 60 * 60 * 1000).toISOString(),
      substatus: 'Epoch 2/3 - Step 850/2000 - Loss converging',
      estimatedDuration: { min: 480, max: 720 }, // 8-12 hours
    },
    {
      stage: 'finalization',
      status: 'pending',
      estimatedDuration: { min: 5, max: 10 },
    },
  ],
  progress: 42,
  
  currentMetrics: {
    trainingLoss: 0.342,
    validationLoss: 0.358,
    learningRate: 0.000182,
    gpuUtilization: 87,
    gpuMemoryUsed: 68,
    gpuMemoryTotal: 80,
    perplexity: 1.43,
    tokensPerSecond: 1247,
    currentStep: 850,
    totalSteps: 2000,
    currentEpoch: 2,
    totalEpochs: 3,
  },
  
  lossHistory: generateMockLossHistory(850, 2000),
  
  cost: {
    estimated: { min: 45, max: 55 },
    currentSpend: 22.18,
    hourlyRate: 2.49,
    projectedFinal: 47.32,
    percentage: 49,
  },
};

// Mock training job - Just completed
export const mockCompletedTrainingJob: TrainingJob = {
  ...mockActiveTrainingJob,
  id: 'job-1734643200-xyz789',
  name: 'Healthcare Consultant - Balanced',
  status: 'completed',
  
  completedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
  currentStage: 'finalization',
  stages: [
    {
      stage: 'preprocessing',
      status: 'completed',
      startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 11.97 * 60 * 60 * 1000).toISOString(),
      duration: 222,
      estimatedDuration: { min: 2, max: 5 },
    },
    {
      stage: 'model_loading',
      status: 'completed',
      startedAt: new Date(Date.now() - 11.97 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 11.78 * 60 * 60 * 1000).toISOString(),
      duration: 678,
      estimatedDuration: { min: 10, max: 15 },
    },
    {
      stage: 'training',
      status: 'completed',
      startedAt: new Date(Date.now() - 11.78 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 0.17 * 60 * 60 * 1000).toISOString(),
      duration: 41796, // 11h 36m
      estimatedDuration: { min: 480, max: 720 },
    },
    {
      stage: 'finalization',
      status: 'completed',
      startedAt: new Date(Date.now() - 0.17 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      duration: 432, // 7m 12s
      estimatedDuration: { min: 5, max: 10 },
    },
  ],
  progress: 100,
  
  currentMetrics: {
    trainingLoss: 0.312,
    validationLoss: 0.328,
    learningRate: 0.00002,
    gpuUtilization: 0,
    gpuMemoryUsed: 0,
    gpuMemoryTotal: 80,
    perplexity: 1.39,
    tokensPerSecond: 0,
    currentStep: 2000,
    totalSteps: 2000,
    currentEpoch: 3,
    totalEpochs: 3,
  },
  
  lossHistory: generateMockLossHistory(2000, 2000),
  
  cost: {
    estimated: { min: 45, max: 55 },
    currentSpend: 48.72,
    hourlyRate: 2.49,
    projectedFinal: 48.72,
    percentage: 99,
  },
  
  loraArtifactPath: 'lora-adapters/healthcare-consultant-balanced-v1.safetensors',
  finalMetrics: {
    finalTrainingLoss: 0.312,
    finalValidationLoss: 0.328,
    finalPerplexity: 1.39,
  },
};

// Mock training job - Cost warning (exceeding estimate)
export const mockCostWarningJob: TrainingJob = {
  ...mockActiveTrainingJob,
  id: 'job-1734643200-warning',
  progress: 78,
  
  cost: {
    estimated: { min: 45, max: 55 },
    currentSpend: 54.23,
    hourlyRate: 7.99, // On-demand pricing
    projectedFinal: 69.50,
    percentage: 121,
  },
};

// Generate mock loss history
function generateMockLossHistory(currentStep: number, totalSteps: number): LossDataPoint[] {
  const history: LossDataPoint[] = [];
  const startLoss = 2.5;
  const endLoss = 0.31;
  
  // Generate data points (sample every 10 steps)
  for (let step = 0; step <= currentStep; step += 10) {
    const progress = step / totalSteps;
    
    // Exponential decay with some noise
    const baseLoss = startLoss * Math.exp(-3 * progress) + endLoss;
    const noise = (Math.random() - 0.5) * 0.05;
    const trainingLoss = baseLoss + noise;
    const validationLoss = trainingLoss * 1.05 + Math.random() * 0.02;
    
    history.push({
      step,
      trainingLoss: Number(trainingLoss.toFixed(4)),
      validationLoss: Number(validationLoss.toFixed(4)),
      timestamp: new Date(Date.now() - (currentStep - step) * 30000).toISOString(),
    });
  }
  
  return history;
}

// Calculate metric trends
export function calculateMetricTrend(
  current: number,
  previous: number
): MetricTrend {
  const percentChange = ((current - previous) / previous) * 100;
  
  return {
    value: current,
    previousValue: previous,
    percentChange: Number(percentChange.toFixed(1)),
    direction: Math.abs(percentChange) < 1 ? 'stable' : percentChange < 0 ? 'down' : 'up',
  };
}

// Mock event log
export const mockEventLog: EventLogEntry[] = [
  {
    timestamp: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    stage: 'preprocessing',
    message: 'Starting dataset preprocessing',
  },
  {
    timestamp: new Date(Date.now() - 6.48 * 60 * 60 * 1000).toISOString(),
    type: 'success',
    stage: 'preprocessing',
    message: 'Preprocessing completed - 1,567 training pairs validated',
  },
  {
    timestamp: new Date(Date.now() - 6.47 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    stage: 'model_loading',
    message: 'Loading base model (Llama-3-8B)',
  },
  {
    timestamp: new Date(Date.now() - 6.29 * 60 * 60 * 1000).toISOString(),
    type: 'success',
    stage: 'model_loading',
    message: 'Model loaded successfully - 8B parameters',
  },
  {
    timestamp: new Date(Date.now() - 6.28 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    stage: 'training',
    message: 'Training started - Epoch 1/3',
  },
  {
    timestamp: new Date(Date.now() - 4.2 * 60 * 60 * 1000).toISOString(),
    type: 'success',
    stage: 'training',
    message: 'Epoch 1 completed - Validation loss: 0.456',
  },
  {
    timestamp: new Date(Date.now() - 4.19 * 60 * 60 * 1000).toISOString(),
    type: 'info',
    stage: 'training',
    message: 'Training continued - Epoch 2/3',
  },
  {
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: 'success',
    stage: 'training',
    message: 'Checkpoint saved at step 500',
  },
  {
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    type: 'info',
    stage: 'training',
    message: 'GPU utilization optimal at 87%',
  },
];

// Format duration in human-readable format
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Calculate elapsed time
export function calculateElapsedTime(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return formatDuration(elapsed);
}

// Calculate estimated remaining time
export function calculateRemainingTime(
  progress: number,
  elapsedSeconds: number
): string {
  if (progress === 0) return 'Calculating...';
  if (progress === 100) return 'Complete';
  
  const totalEstimated = elapsedSeconds / (progress / 100);
  const remaining = totalEstimated - elapsedSeconds;
  
  return formatDuration(Math.max(0, Math.floor(remaining)));
}

// Get stage display name
export function getStageDisplayName(stage: TrainingStage): string {
  const names: Record<TrainingStage, string> = {
    preprocessing: 'Preprocessing',
    model_loading: 'Model Loading',
    training: 'Training',
    finalization: 'Finalization',
  };
  return names[stage];
}

// Get stage icon
export function getStageIcon(status: StageStatus): string {
  const icons: Record<StageStatus, string> = {
    pending: '○',
    active: '◉',
    completed: '✓',
    failed: '❌',
  };
  return icons[status];
}
