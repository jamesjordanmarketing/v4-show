/**
 * Pipeline Module Types
 * 
 * Types for the LoRA training pipeline with lay-person accessible configuration
 */

// ============================================
// Lay-Person Parameter Types
// ============================================

export type TrainingSensitivity = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type TrainingProgression = 'low' | 'medium' | 'high';
export type TrainingRepetition = 1 | 3 | 5 | 10;

// ============================================
// Job Status
// ============================================

export type PipelineJobStatus = 
  | 'pending' 
  | 'queued' 
  | 'initializing' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

// ============================================
// Engine Types (Single Engine Architecture)
// ============================================

export interface EngineFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AutomaticEvaluation {
  id: string;
  name: string;
  estimatedMinutes: number;
  description: string;
}

export interface TrainingEngine {
  id: string;
  name: string;
  description: string;
  features: EngineFeature[];
  evaluations: AutomaticEvaluation[];
}

// ============================================
// Training Job
// ============================================

export interface PipelineTrainingJob {
  id: string;
  userId: string;
  jobName: string;
  status: PipelineJobStatus;
  
  // Lay-person configuration (what user sees)
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  
  // Technical hyperparameters (derived values)
  learningRate: number;
  batchSize: number;
  epochs: number;
  rank: number;
  alpha: number;
  dropout: number;
  
  // Dataset
  datasetId: string | null;
  datasetName: string | null;
  datasetFilePath: string | null;
  
  // Engine (display only - no selection)
  engineId: string;
  engineName: string;
  engineFeatures: EngineFeature[];
  
  // GPU
  gpuType: string;
  gpuCount: number;
  
  // Cost
  estimatedCost: number | null;
  actualCost: number | null;
  
  // Progress
  progress: number;
  currentEpoch: number;
  currentStep: number;
  totalSteps: number | null;
  
  // Real-time metrics
  currentLoss: number | null;
  currentLearningRate: number | null;
  tokensPerSecond: number | null;
  
  // RunPod
  runpodJobId: string | null;
  runpodEndpointId: string | null;
  
  // Results
  finalLoss: number | null;
  trainingTimeSeconds: number | null;
  adapterFilePath: string | null;
  adapterDownloadUrl: string | null;
  adapterStatus: 'active' | 'superseded' | 'deleted' | null;
  
  // Timestamps
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  
  // Error
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
}

// ============================================
// Hyperparameter Mappings (Lay-Person → Technical)
// ============================================

export const SENSITIVITY_TO_LEARNING_RATE: Record<TrainingSensitivity, number> = {
  very_low: 0.00001,
  low: 0.00005,
  medium: 0.0001,
  high: 0.0005,
  very_high: 0.001,
};

export const PROGRESSION_TO_BATCH_SIZE: Record<TrainingProgression, number> = {
  low: 2,
  medium: 4,
  high: 16,
};

// ============================================
// Display Labels (for UI)
// ============================================

export const SENSITIVITY_DISPLAY: Record<TrainingSensitivity, string> = {
  very_low: 'Very Stable',
  low: 'Stable',
  medium: 'Balanced',
  high: 'Adaptive',
  very_high: 'Very Adaptive',
};

export const PROGRESSION_DISPLAY: Record<TrainingProgression, string> = {
  low: 'Deep Thinking',
  medium: 'Balanced',
  high: 'Broad Learning',
};

export const REPETITION_DISPLAY: Record<TrainingRepetition, string> = {
  1: '1 (Quick)',
  3: '3 (Standard)',
  5: '5 (Thorough)',
  10: '10+ (Deep)',
};

// ============================================
// Slider Configuration (for UI components)
// ============================================

export const SENSITIVITY_OPTIONS = [
  { value: 'very_low' as const, display: 'Very Stable', technicalValue: 0.00001 },
  { value: 'low' as const, display: 'Stable', technicalValue: 0.00005 },
  { value: 'medium' as const, display: 'Balanced', technicalValue: 0.0001 },
  { value: 'high' as const, display: 'Adaptive', technicalValue: 0.0005 },
  { value: 'very_high' as const, display: 'Very Adaptive', technicalValue: 0.001 },
];

export const PROGRESSION_OPTIONS = [
  { value: 'low' as const, display: 'Deep Thinking', technicalValue: 2 },
  { value: 'medium' as const, display: 'Balanced', technicalValue: 4 },
  { value: 'high' as const, display: 'Broad Learning', technicalValue: 16 },
];

export const REPETITION_OPTIONS = [
  { value: 1 as const, display: '1 (Quick)' },
  { value: 3 as const, display: '3 (Standard)' },
  { value: 5 as const, display: '5 (Thorough)' },
  { value: 10 as const, display: '10+ (Deep)' },
];

// ============================================
// Default Engine Configuration
// ============================================

export const DEFAULT_ENGINE: TrainingEngine = {
  id: 'emotional-alignment-v1',
  name: 'Emotional Alignment',
  description: 'Optimized for emotional arc progression training',
  features: [
    {
      id: 'emotional_arc_recognition',
      name: 'Emotional Arc Pattern Recognition',
      description: 'Learns to identify and follow emotional progressions',
      enabled: true,
    },
    {
      id: 'empathetic_response',
      name: 'Empathetic Response Optimization',
      description: 'Prioritizes emotion acknowledgment before advice',
      enabled: true,
    },
    {
      id: 'progression_aware',
      name: 'Progression-Aware Training',
      description: 'Weights training toward arc completion',
      enabled: true,
    },
  ],
  evaluations: [
    {
      id: 'emotional_arc_fidelity',
      name: 'Emotional Arc Fidelity',
      estimatedMinutes: 5,
      description: 'Measures how well model follows intended emotional progressions',
    },
    {
      id: 'empathy_score',
      name: 'Empathy Score',
      estimatedMinutes: 3,
      description: 'Evaluates emotion acknowledgment and validation',
    },
  ],
};

// ============================================
// Job Creation Request
// ============================================

export interface CreatePipelineJobRequest {
  jobName: string;
  datasetId: string;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  gpuType?: string;
  gpuCount?: number;
  workbaseId?: string;
}

// ============================================
// API Response Types
// ============================================

export interface PipelineJobResponse {
  success: boolean;
  data?: PipelineTrainingJob;
  error?: string;
}

export interface PipelineJobListResponse {
  success: boolean;
  data?: PipelineTrainingJob[];
  count?: number;
  error?: string;
}
