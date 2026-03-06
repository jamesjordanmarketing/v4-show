/**
 * Hyperparameter Conversion Utilities
 * 
 * Converts lay-person UI values to technical hyperparameters
 */

import {
  TrainingSensitivity,
  TrainingProgression,
  TrainingRepetition,
  SENSITIVITY_TO_LEARNING_RATE,
  PROGRESSION_TO_BATCH_SIZE,
} from '@/types/pipeline';

export interface TechnicalHyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  rank: number;
  alpha: number;
  dropout: number;
}

export interface LayPersonConfig {
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
}

/**
 * Convert lay-person configuration to technical hyperparameters
 */
export function convertToTechnicalParams(
  config: LayPersonConfig
): TechnicalHyperparameters {
  const learningRate = SENSITIVITY_TO_LEARNING_RATE[config.trainingSensitivity];
  const batchSize = PROGRESSION_TO_BATCH_SIZE[config.trainingProgression];
  const epochs = config.trainingRepetition;
  
  // Fixed values for V1 (hidden from user)
  const rank = 16;
  const alpha = 32; // 2x rank
  const dropout = 0.05;
  
  return {
    learningRate,
    batchSize,
    epochs,
    rank,
    alpha,
    dropout,
  };
}

/**
 * Estimate training cost based on configuration
 */
export function estimateTrainingCost(config: LayPersonConfig): {
  computeCost: number;
  evaluationCost: number;
  totalCost: number;
  estimatedDuration: string;
} {
  const baseHourlyRate = 1.50; // A40 hourly rate
  
  // Hours per epoch varies by batch size (inverse relationship)
  const hoursPerEpoch = config.trainingProgression === 'high' ? 0.5 :
                        config.trainingProgression === 'medium' ? 1.0 : 1.5;
  
  const epochs = config.trainingRepetition;
  const computeHours = epochs * hoursPerEpoch;
  const computeCost = computeHours * baseHourlyRate;
  
  // Evaluation cost is fixed (Claude API calls)
  const evaluationCost = 2.50;
  
  const totalCost = computeCost + evaluationCost;
  
  // Format duration
  const totalMinutes = Math.round(computeHours * 60 + 8); // +8 for evaluation
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const estimatedDuration = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes}m`;
  
  return {
    computeCost: Math.round(computeCost * 100) / 100,
    evaluationCost,
    totalCost: Math.round(totalCost * 100) / 100,
    estimatedDuration,
  };
}

/**
 * Validate lay-person configuration
 */
export function validateConfig(config: Partial<LayPersonConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const validSensitivities: TrainingSensitivity[] = [
    'very_low', 'low', 'medium', 'high', 'very_high'
  ];
  const validProgressions: TrainingProgression[] = ['low', 'medium', 'high'];
  const validRepetitions: TrainingRepetition[] = [1, 3, 5, 10];
  
  if (config.trainingSensitivity && 
      !validSensitivities.includes(config.trainingSensitivity)) {
    errors.push(`Invalid training sensitivity: ${config.trainingSensitivity}`);
  }
  
  if (config.trainingProgression && 
      !validProgressions.includes(config.trainingProgression)) {
    errors.push(`Invalid training progression: ${config.trainingProgression}`);
  }
  
  if (config.trainingRepetition && 
      !validRepetitions.includes(config.trainingRepetition)) {
    errors.push(`Invalid training repetition: ${config.trainingRepetition}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
