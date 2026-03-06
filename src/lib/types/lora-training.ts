// ============================================
// BrightRun LoRA Training Module
// TypeScript Type Definitions
// ============================================

import { z } from 'zod';

// -------------------- ENUMS --------------------

export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';

export type JobStatus = 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';

export type PresetId = 'conservative' | 'balanced' | 'aggressive' | 'custom';

// -------------------- DATASET --------------------

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: 'brightrun_lora_v4' | 'brightrun_lora_v3';
  status: DatasetStatus;
  storage_bucket: string;
  storage_path: string;  // NEVER store URLs - only paths
  file_name: string;
  file_size: number;
  total_training_pairs: number | null;
  total_validation_pairs: number | null;
  total_tokens: number | null;
  avg_turns_per_conversation: number | null;
  avg_tokens_per_turn: number | null;
  training_ready: boolean;
  validated_at: string | null;
  validation_errors: ValidationError[] | null;
  error_message: string | null;
  sample_data: any | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// -------------------- TRAINING JOB --------------------

export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  status: JobStatus;
  current_stage: string;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number | null;
  current_metrics: CurrentMetrics | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion_at: string | null;
  current_cost: number;
  estimated_total_cost: number;
  final_cost: number | null;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  external_job_id: string | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------- HYPERPARAMETERS --------------------

export interface HyperparameterConfig {
  base_model: string;
  learning_rate: number;
  batch_size: number;
  num_epochs: number;
  lora_rank: number;
  lora_alpha: number;
  lora_dropout: number;
  warmup_steps?: number;
  weight_decay?: number;
}

// -------------------- GPU CONFIGURATION --------------------

export interface GPUConfig {
  gpu_type: string;
  num_gpus: number;
  gpu_memory_gb: number;
  cost_per_gpu_hour: number;
}

// -------------------- METRICS --------------------

export interface CurrentMetrics {
  training_loss: number;
  validation_loss?: number;
  learning_rate: number;
  throughput?: number;
  gpu_utilization?: number;
}

export interface MetricsPoint {
  id: string;
  job_id: string;
  timestamp: string;
  epoch: number;
  step: number;
  training_loss: number;
  validation_loss: number | null;
  learning_rate: number;
  gradient_norm: number | null;
  throughput: number | null;
  gpu_utilization: number | null;
}

// -------------------- MODEL ARTIFACTS --------------------

export interface ModelArtifact {
  id: string;
  user_id: string;
  job_id: string;
  dataset_id: string;
  name: string;
  version: string;
  description: string | null;
  status: string;
  deployed_at: string | null;
  quality_metrics: QualityMetrics;
  training_summary: TrainingSummary;
  configuration: HyperparameterConfig;
  artifacts: ArtifactFiles;
  parent_model_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QualityMetrics {
  final_training_loss: number;
  final_validation_loss: number;
  best_epoch: number;
  convergence_score: number;
}

export interface TrainingSummary {
  total_epochs: number;
  total_steps: number;
  total_duration_seconds: number;
  total_cost: number;
  gpu_type: string;
  dataset_name: string;
}

export interface ArtifactFiles {
  adapter_model: string;      // storage path
  adapter_config: string;      // storage path
  training_logs: string;       // storage path
  metrics_chart?: string;      // storage path
}

// -------------------- COST RECORDS --------------------

export interface CostRecord {
  id: string;
  user_id: string;
  job_id: string | null;
  cost_type: string;
  amount: number;
  details: any | null;
  billing_period: string;
  recorded_at: string;
}

// -------------------- NOTIFICATIONS --------------------

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  action_url: string | null;
  metadata: any | null;
  created_at: string;
}

// -------------------- VALIDATION --------------------

export interface ValidationError {
  line: number;
  error: string;
  suggestion?: string;
}

// -------------------- PRESET CONFIGURATIONS --------------------

export const HYPERPARAMETER_PRESETS: Record<PresetId, HyperparameterConfig> = {
  conservative: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0001,
    batch_size: 4,
    num_epochs: 3,
    lora_rank: 8,
    lora_alpha: 16,
    lora_dropout: 0.05,
  },
  balanced: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
  aggressive: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0003,
    batch_size: 16,
    num_epochs: 10,
    lora_rank: 32,
    lora_alpha: 64,
    lora_dropout: 0.1,
  },
  custom: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
};

// -------------------- GPU CONFIGURATIONS --------------------

export const GPU_CONFIGURATIONS = {
  'nvidia-a100-40gb': {
    gpu_type: 'NVIDIA A100 40GB',
    num_gpus: 1,
    gpu_memory_gb: 40,
    cost_per_gpu_hour: 2.50,
  },
  'nvidia-a100-80gb': {
    gpu_type: 'NVIDIA A100 80GB',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 3.50,
  },
  'nvidia-h100': {
    gpu_type: 'NVIDIA H100',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 5.00,
  },
} as const;

export type GPUConfigurationId = keyof typeof GPU_CONFIGURATIONS;

// -------------------- ZOD VALIDATION SCHEMAS --------------------

/**
 * Schema for creating a new dataset
 * Used in POST /api/datasets
 */
export const CreateDatasetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  format: z.enum(['brightrun_lora_v4', 'brightrun_lora_v3']).default('brightrun_lora_v4'),
  file_name: z.string().min(1, 'File name is required'),
  file_size: z.number().int().positive().max(500 * 1024 * 1024, 'File size must be less than 500MB'),
});

export type CreateDatasetInput = z.infer<typeof CreateDatasetSchema>;
