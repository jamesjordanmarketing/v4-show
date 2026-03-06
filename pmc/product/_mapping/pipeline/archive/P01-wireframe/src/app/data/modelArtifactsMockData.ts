// Mock data for Model Artifacts Manager (P05)

export type ModelStatus = 'stored' | 'testing' | 'production' | 'archived';
export type QualityRating = 1 | 2 | 3 | 4 | 5;

export interface ModelArtifact {
  id: string;
  name: string;
  status: ModelStatus;
  createdAt: string;
  baseModel: string;
  
  // File information
  loraAdapterPath: string;
  fileSize: number; // in MB
  trainingLogsPath: string;
  
  // Quality metrics
  finalMetrics: {
    validationLoss: number;
    trainingLoss: number;
    perplexity: number;
    initialLoss: number;
  };
  qualityRating: QualityRating;
  
  // Training reference (from P04)
  trainingJobId: string;
  trainingDuration: string;
  totalCost: number;
  gpuType: string;
  instanceType: 'spot' | 'on-demand';
  stepsCompleted: number;
  totalSteps: number;
  epochsCompleted: number;
  totalEpochs: number;
  
  // Configuration reference (from P03)
  presetUsed: string;
  hyperparameters: {
    loraRank: number;
    loraAlpha: number;
    loraDropout: number;
    learningRate: string;
    numEpochs: number;
    batchSize: number;
  };
  estimatedCost: {
    min: number;
    max: number;
  };
  
  // Dataset lineage (from P02)
  datasetId: string;
  datasetName: string;
  totalTrainingPairs: number;
  consultantName: string;
  consultantTitle: string;
  vertical: string;
  scaffoldingCoverage: {
    persona: number;
    arc: number;
  };
}

export interface ModelVersion {
  id: string;
  version: number;
  createdAt: string;
  presetUsed: string;
  qualityRating: QualityRating;
  validationLoss: number;
  totalCost: number;
  fileSize: number;
}

// Primary mock artifact - Recently completed
export const mockModelArtifact: ModelArtifact = {
  id: 'artifact-1734643200-abc123',
  name: 'Healthcare-Balanced-20241213',
  status: 'stored',
  createdAt: new Date().toISOString(),
  baseModel: 'Llama 3 70B Instruct',
  
  loraAdapterPath: 'lora-adapters/healthcare-consultant-balanced-v1.safetensors',
  fileSize: 246, // MB
  trainingLogsPath: 'training-logs/job-1734643200-abc123.log',
  
  finalMetrics: {
    validationLoss: 0.312,
    trainingLoss: 0.298,
    perplexity: 1.28,
    initialLoss: 1.24,
  },
  qualityRating: 4,
  
  trainingJobId: 'job-1734643200-abc123',
  trainingDuration: '11h 28m',
  totalCost: 47.23,
  gpuType: 'H100 PCIe 80GB',
  instanceType: 'spot',
  stepsCompleted: 2000,
  totalSteps: 2000,
  epochsCompleted: 3,
  totalEpochs: 3,
  
  presetUsed: 'balanced',
  hyperparameters: {
    loraRank: 16,
    loraAlpha: 32,
    loraDropout: 0.05,
    learningRate: '2e-4',
    numEpochs: 3,
    batchSize: 4,
  },
  estimatedCost: {
    min: 45,
    max: 55,
  },
  
  datasetId: 'dataset-1',
  datasetName: 'Healthcare Consultant Conversations',
  totalTrainingPairs: 1567,
  consultantName: 'Elena Morales',
  consultantTitle: 'CFP',
  vertical: 'Healthcare',
  scaffoldingCoverage: {
    persona: 87,
    arc: 92,
  },
};

// Mock artifact - In production
export const mockProductionArtifact: ModelArtifact = {
  ...mockModelArtifact,
  id: 'artifact-1734556800-xyz789',
  name: 'Healthcare-Aggressive-20241210',
  status: 'production',
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  
  finalMetrics: {
    validationLoss: 0.289,
    trainingLoss: 0.274,
    perplexity: 1.21,
    initialLoss: 1.18,
  },
  qualityRating: 5,
  
  presetUsed: 'aggressive',
  hyperparameters: {
    loraRank: 32,
    loraAlpha: 64,
    loraDropout: 0.05,
    learningRate: '5e-4',
    numEpochs: 5,
    batchSize: 4,
  },
  totalCost: 89.45,
  estimatedCost: {
    min: 80,
    max: 100,
  },
};

// Mock artifact - Lower quality
export const mockLowQualityArtifact: ModelArtifact = {
  ...mockModelArtifact,
  id: 'artifact-1734470400-def456',
  name: 'Healthcare-Conservative-20241208',
  status: 'archived',
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  
  finalMetrics: {
    validationLoss: 0.487,
    trainingLoss: 0.456,
    perplexity: 1.62,
    initialLoss: 1.35,
  },
  qualityRating: 2,
  
  presetUsed: 'conservative',
  hyperparameters: {
    loraRank: 8,
    loraAlpha: 16,
    loraDropout: 0.05,
    learningRate: '1e-4',
    numEpochs: 2,
    batchSize: 4,
  },
  totalCost: 28.76,
  estimatedCost: {
    min: 25,
    max: 35,
  },
};

// Version history for comparison
export const mockModelVersions: ModelVersion[] = [
  {
    id: mockProductionArtifact.id,
    version: 3,
    createdAt: mockProductionArtifact.createdAt,
    presetUsed: 'aggressive',
    qualityRating: 5,
    validationLoss: 0.289,
    totalCost: 89.45,
    fileSize: 512,
  },
  {
    id: mockModelArtifact.id,
    version: 2,
    createdAt: mockModelArtifact.createdAt,
    presetUsed: 'balanced',
    qualityRating: 4,
    validationLoss: 0.312,
    totalCost: 47.23,
    fileSize: 246,
  },
  {
    id: mockLowQualityArtifact.id,
    version: 1,
    createdAt: mockLowQualityArtifact.createdAt,
    presetUsed: 'conservative',
    qualityRating: 2,
    validationLoss: 0.487,
    totalCost: 28.76,
    fileSize: 128,
  },
];

// Calculate quality rating based on metrics
export function calculateQualityRating(
  validationLoss: number,
  perplexity: number
): QualityRating {
  // Excellent: validation loss < 0.3, perplexity < 1.3
  if (validationLoss < 0.3 && perplexity < 1.3) return 5;
  
  // Good: validation loss < 0.35, perplexity < 1.5
  if (validationLoss < 0.35 && perplexity < 1.5) return 4;
  
  // Fair: validation loss < 0.45, perplexity < 1.8
  if (validationLoss < 0.45 && perplexity < 1.8) return 3;
  
  // Poor: validation loss < 0.6, perplexity < 2.5
  if (validationLoss < 0.6 && perplexity < 2.5) return 2;
  
  // Very Poor
  return 1;
}

// Get quality context text
export function getQualityContext(rating: QualityRating): {
  label: string;
  description: string;
  color: string;
} {
  const contexts = {
    5: {
      label: 'Excellent',
      description: 'Outstanding performance, ready for production deployment',
      color: 'text-green-600',
    },
    4: {
      label: 'Good',
      description: 'Strong performance, suitable for most use cases',
      color: 'text-blue-600',
    },
    3: {
      label: 'Fair',
      description: 'Acceptable performance, may need refinement',
      color: 'text-yellow-600',
    },
    2: {
      label: 'Poor',
      description: 'Below expectations, consider retraining with different config',
      color: 'text-orange-600',
    },
    1: {
      label: 'Very Poor',
      description: 'Significant issues, retraining strongly recommended',
      color: 'text-red-600',
    },
  };
  
  return contexts[rating];
}

// Get metric context
export function getMetricContext(metric: 'loss' | 'perplexity', value: number): {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
} {
  if (metric === 'loss') {
    if (value < 0.3) return { status: 'excellent', description: 'Excellent - very low loss' };
    if (value < 0.4) return { status: 'good', description: 'Good - acceptable loss' };
    if (value < 0.5) return { status: 'fair', description: 'Fair - could be improved' };
    return { status: 'poor', description: 'Poor - high loss, consider retraining' };
  } else {
    if (value < 1.3) return { status: 'excellent', description: 'Excellent - very low perplexity' };
    if (value < 1.6) return { status: 'good', description: 'Good - acceptable perplexity' };
    if (value < 2.0) return { status: 'fair', description: 'Fair - could be improved' };
    return { status: 'poor', description: 'Poor - high perplexity' };
  }
}

// Get status badge info
export function getStatusBadge(status: ModelStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  const badges = {
    stored: {
      label: 'Stored',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
    testing: {
      label: 'Testing',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
    production: {
      label: 'Production',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    archived: {
      label: 'Archived',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
    },
  };
  
  return badges[status];
}

// Format file size
export function formatFileSize(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

// Calculate improvement
export function calculateImprovement(initial: number, final: number): {
  percentage: number;
  label: string;
} {
  const improvement = ((initial - final) / initial) * 100;
  
  return {
    percentage: Math.round(improvement),
    label: improvement > 0 ? 'improvement' : 'regression',
  };
}

// Get preset display name
export function getPresetDisplayName(presetId: string): string {
  const names: Record<string, string> = {
    conservative: 'Conservative',
    balanced: 'Balanced',
    aggressive: 'Aggressive',
    custom: 'Custom',
  };
  return names[presetId] || presetId;
}

// Mock download progress simulation
export function simulateDownload(
  onProgress: (progress: number) => void,
  onComplete: () => void
): () => void {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      onProgress(100);
      clearInterval(interval);
      setTimeout(onComplete, 500);
    } else {
      onProgress(Math.min(progress, 99));
    }
  }, 200);
  
  return () => clearInterval(interval);
}
