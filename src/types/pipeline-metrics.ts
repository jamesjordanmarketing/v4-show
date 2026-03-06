/**
 * Pipeline Metrics Types
 * 
 * Types for the Results Framework - measurement ontology
 */

export type MetricLevel = 'universal' | 'domain' | 'specialized';

export interface MetricDescriptor {
  id: string;
  name: string;
  level: MetricLevel;
  description: string;
  measurementMethod: string;
  unit: string;
  range: [number, number];
  higherIsBetter: boolean;
}

export interface MetricValue {
  id: string;
  jobId: string;
  metricId: string;
  metricName: string;
  metricLevel: MetricLevel;
  value: number;
  unit: string | null;
  measuredAt: string;
  measurementVersion: string | null;
  measurementMethod: string | null;
  stepNumber: number | null;
  epochNumber: number | null;
  rawData: Record<string, unknown> | null;
}

export interface TrainingMetrics {
  universal: MetricValue[];
  domain: MetricValue[];
  specialized: MetricValue[];
}

// ============================================
// Universal Metrics (Always Collected)
// ============================================

export const UNIVERSAL_METRICS: MetricDescriptor[] = [
  {
    id: 'training_loss',
    name: 'Training Loss',
    level: 'universal',
    description: 'Cross-entropy loss during training',
    measurementMethod: 'Computed by trainer during backpropagation',
    unit: 'nats',
    range: [0, Infinity],
    higherIsBetter: false,
  },
  {
    id: 'training_time',
    name: 'Training Time',
    level: 'universal',
    description: 'Total time spent training',
    measurementMethod: 'Wall-clock time from start to end',
    unit: 'seconds',
    range: [0, Infinity],
    higherIsBetter: false,
  },
  {
    id: 'gpu_utilization',
    name: 'GPU Utilization',
    level: 'universal',
    description: 'Average GPU compute utilization',
    measurementMethod: 'nvidia-smi polling during training',
    unit: 'percentage',
    range: [0, 100],
    higherIsBetter: true,
  },
];

// ============================================
// Specialized Metrics (Emotional Alignment Engine)
// ============================================

export const EMOTIONAL_ALIGNMENT_METRICS: MetricDescriptor[] = [
  {
    id: 'emotional_arc_fidelity',
    name: 'Emotional Arc Fidelity',
    level: 'specialized',
    description: 'How well the model follows intended emotional arc progression',
    measurementMethod: 'Claude-as-Judge evaluation on test scenarios',
    unit: 'score',
    range: [0, 1],
    higherIsBetter: true,
  },
  {
    id: 'empathy_score',
    name: 'Empathy Score',
    level: 'specialized',
    description: 'Degree to which model acknowledges and validates emotions',
    measurementMethod: 'Claude-as-Judge evaluation analyzing empathetic language',
    unit: 'score',
    range: [1, 5],
    higherIsBetter: true,
  },
  {
    id: 'arc_completion_rate',
    name: 'Arc Completion Rate',
    level: 'specialized',
    description: 'Percentage of conversations that complete emotional arc',
    measurementMethod: 'Claude-as-Judge evaluation on arc progression',
    unit: 'percentage',
    range: [0, 100],
    higherIsBetter: true,
  },
  {
    id: 'voice_consistency',
    name: 'Voice Consistency',
    level: 'specialized',
    description: 'Consistency with consultant voice and principles',
    measurementMethod: 'Claude-as-Judge evaluation of warmth, judgment-free tone',
    unit: 'score',
    range: [1, 5],
    higherIsBetter: true,
  },
];
