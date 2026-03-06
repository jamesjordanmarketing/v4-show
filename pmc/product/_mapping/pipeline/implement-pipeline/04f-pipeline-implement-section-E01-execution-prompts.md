# Pipeline Implementation - Section E01: Database Schema & TypeScript Types

**Version:** 1.0  
**Date:** January 10, 2026  
**Section:** E01 - Foundation Layer  
**Prerequisites:** None (First section in sequence)  
**Builds Upon:** Existing codebase patterns  

---

## Overview

This prompt creates the database schema and TypeScript type definitions for the LoRA training pipeline module. This is foundational work that all subsequent prompts (E02, E03, E04) will build upon.

**What This Section Creates:**
1. 4 new Supabase database tables with RLS policies
2. TypeScript type definitions for the pipeline module
3. Lay-person hyperparameter mapping utilities

**What This Section Does NOT Create:**
- UI components (E03)
- API routes (E02)
- Training engine implementation (E04)

---

## Critical Instructions

### Supabase Agent Ops Library (SAOL) - REQUIRED

**You MUST use SAOL for ALL database operations.** Do not use raw supabase-js or PostgreSQL scripts.

**Library Path:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

**Key Rules:**
1. Use Service Role Key - operations require admin privileges via `SUPABASE_SERVICE_ROLE_KEY`
2. Run Preflight - always run `agentPreflight({ table })` before modifying data
3. No Manual Escaping - SAOL handles special characters automatically

**Schema Introspection Command:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'TABLE_NAME',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

**Query Command:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'TABLE_NAME',limit:5});console.log(JSON.stringify(r.data,null,2));})();"
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Environment Variables (already configured):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for client
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server operations
- `DATABASE_URL` - Direct PostgreSQL connection

**Do NOT break existing functionality.** The existing codebase has:
- Training jobs system in `training_jobs` table
- Datasets system in `datasets` table
- Conversations and training files modules

---

## Reference Specification

Full implementation specification:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\v4-show-full-implementation-spec_v1.md`

Refer to **Section 4: Phase 1 - Database Schema & Types** for complete details.

---

## Implementation Tasks

### Task 1: Create Database Tables

Create 4 new tables using Supabase SQL Editor or migrations:

#### 1.1 Table: `pipeline_training_jobs`

```sql
-- Pipeline Training Jobs Table
-- Stores jobs for the new pipeline module (separate from legacy training_jobs)

CREATE TABLE IF NOT EXISTS pipeline_training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job identification
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, queued, initializing, running, completed, failed, cancelled
  
  -- Lay-person configuration (UI values)
  training_sensitivity TEXT NOT NULL DEFAULT 'medium',
  training_progression TEXT NOT NULL DEFAULT 'medium', 
  training_repetition INTEGER NOT NULL DEFAULT 3,
  
  -- Technical hyperparameters (derived from above)
  learning_rate FLOAT NOT NULL DEFAULT 0.0001,
  batch_size INTEGER NOT NULL DEFAULT 4,
  epochs INTEGER NOT NULL DEFAULT 3,
  rank INTEGER NOT NULL DEFAULT 16,
  alpha INTEGER NOT NULL DEFAULT 32,
  dropout FLOAT NOT NULL DEFAULT 0.05,
  
  -- Dataset reference
  dataset_id UUID REFERENCES datasets(id),
  dataset_name TEXT,
  dataset_file_path TEXT,
  
  -- Engine information (single engine architecture)
  engine_id TEXT NOT NULL DEFAULT 'emotional-alignment-v1',
  engine_name TEXT NOT NULL DEFAULT 'Emotional Alignment',
  engine_features JSONB DEFAULT '[]'::jsonb,
  
  -- GPU configuration
  gpu_type TEXT NOT NULL DEFAULT 'NVIDIA A40',
  gpu_count INTEGER NOT NULL DEFAULT 1,
  
  -- Cost tracking
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  
  -- Progress tracking
  progress INTEGER DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  
  -- Real-time metrics (during training)
  current_loss FLOAT,
  current_learning_rate FLOAT,
  tokens_per_second FLOAT,
  
  -- RunPod tracking
  runpod_job_id TEXT,
  runpod_endpoint_id TEXT,
  
  -- Results
  final_loss FLOAT,
  training_time_seconds INTEGER,
  adapter_file_path TEXT,
  adapter_download_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Error handling
  error_message TEXT,
  error_details JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user_id ON pipeline_training_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created_at ON pipeline_training_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE pipeline_training_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pipeline jobs"
  ON pipeline_training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pipeline jobs"
  ON pipeline_training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline jobs"
  ON pipeline_training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to pipeline jobs"
  ON pipeline_training_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

#### 1.2 Table: `pipeline_training_metrics`

```sql
-- Pipeline Training Metrics Table
-- Stores time-series metrics during and after training

CREATE TABLE IF NOT EXISTS pipeline_training_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_level TEXT NOT NULL, -- 'universal', 'domain', 'specialized'
  
  -- Value
  value FLOAT NOT NULL,
  unit TEXT,
  
  -- Measurement metadata
  measured_at TIMESTAMPTZ DEFAULT now(),
  measurement_version TEXT,
  measurement_method TEXT,
  
  -- For time-series metrics
  step_number INTEGER,
  epoch_number INTEGER,
  
  -- Raw data reference
  raw_data JSONB,
  
  CONSTRAINT fk_pipeline_metrics_job FOREIGN KEY (job_id) 
    REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_job_id ON pipeline_training_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_metric_id ON pipeline_training_metrics(metric_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_step ON pipeline_training_metrics(step_number);

-- Enable RLS
ALTER TABLE pipeline_training_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from job ownership)
CREATE POLICY "Users can view metrics for own jobs"
  ON pipeline_training_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_training_jobs
      WHERE pipeline_training_jobs.id = pipeline_training_metrics.job_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to metrics"
  ON pipeline_training_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

#### 1.3 Table: `pipeline_evaluation_runs`

```sql
-- Pipeline Evaluation Runs Table
-- Stores Claude-as-Judge evaluation runs (baseline and trained)

CREATE TABLE IF NOT EXISTS pipeline_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  
  -- Evaluation type
  evaluation_type TEXT NOT NULL, -- 'baseline' or 'trained'
  
  -- Model configuration
  model_id TEXT NOT NULL,
  adapter_path TEXT, -- null for baseline
  
  -- Statistics
  total_scenarios INTEGER NOT NULL,
  completed_scenarios INTEGER DEFAULT 0,
  failed_scenarios INTEGER DEFAULT 0,
  
  -- Aggregate metrics
  arc_completion_rate FLOAT,
  avg_progression_quality FLOAT,
  empathy_first_rate FLOAT,
  avg_empathy_score FLOAT,
  avg_voice_score FLOAT,
  helpful_rate FLOAT,
  avg_quality_score FLOAT,
  avg_overall_score FLOAT,
  
  -- Per-arc breakdown
  per_arc_metrics JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eval_runs_job_id ON pipeline_evaluation_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_type ON pipeline_evaluation_runs(evaluation_type);

-- Enable RLS
ALTER TABLE pipeline_evaluation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view evaluation runs for own jobs"
  ON pipeline_evaluation_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_training_jobs
      WHERE pipeline_training_jobs.id = pipeline_evaluation_runs.job_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to evaluation runs"
  ON pipeline_evaluation_runs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

#### 1.4 Table: `pipeline_evaluation_results`

```sql
-- Pipeline Evaluation Results Table
-- Stores individual scenario evaluation results from Claude-as-Judge

CREATE TABLE IF NOT EXISTS pipeline_evaluation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pipeline_evaluation_runs(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  
  -- Conversation data
  conversation_turns JSONB NOT NULL,
  total_tokens INTEGER,
  generation_time_ms INTEGER,
  
  -- Claude evaluation results (structured JSON)
  emotional_progression JSONB,
  empathy_evaluation JSONB,
  voice_consistency JSONB,
  conversation_quality JSONB,
  overall_evaluation JSONB,
  
  -- Metadata
  claude_model_used TEXT,
  evaluation_tokens INTEGER,
  raw_response TEXT,
  
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eval_results_run_id ON pipeline_evaluation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_scenario ON pipeline_evaluation_results(scenario_id);

-- Enable RLS
ALTER TABLE pipeline_evaluation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view results for own evaluation runs"
  ON pipeline_evaluation_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_evaluation_runs
      JOIN pipeline_training_jobs ON pipeline_training_jobs.id = pipeline_evaluation_runs.job_id
      WHERE pipeline_evaluation_runs.id = pipeline_evaluation_results.run_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to evaluation results"
  ON pipeline_evaluation_results FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

### Task 2: Create TypeScript Types

#### 2.1 Create Pipeline Types File

Create file: `src/types/pipeline.ts`

```typescript
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
```

#### 2.2 Create Metrics Types File

Create file: `src/types/pipeline-metrics.ts`

```typescript
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
```

#### 2.3 Create Evaluation Types File

Create file: `src/types/pipeline-evaluation.ts`

```typescript
/**
 * Pipeline Evaluation Types
 * 
 * Types for Claude-as-Judge evaluation system
 */

// ============================================
// Test Scenario Types
// ============================================

export type EmotionalArcType =
  | 'confusion_to_clarity'
  | 'anxiety_to_confidence'
  | 'shame_to_acceptance'
  | 'couple_conflict_to_alignment'
  | 'overwhelm_to_empowerment'
  | 'grief_to_healing'
  | 'crisis_to_stability';

export type PersonaType =
  | 'anxious_planner'
  | 'overwhelmed_avoider'
  | 'pragmatic_optimist'
  | 'skeptical_researcher'
  | 'emotional_processor';

export interface TestScenario {
  id: string;
  arcType: EmotionalArcType;
  persona: PersonaType;
  topic: string;
  initialContext: {
    userName: string;
    userBackground: string;
    emotionalState: {
      primaryEmotion: string;
      intensity: number;
      secondaryEmotions: string[];
    };
    situation: string;
  };
  openingMessage: string;
  targetArc: {
    sourceEmotion: string;
    targetEmotion: string;
    expectedTurns: number;
  };
  heldOut: boolean;
  createdDate: string;
}

// ============================================
// Evaluation Run Types
// ============================================

export type EvaluationType = 'baseline' | 'trained';
export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EvaluationRun {
  id: string;
  jobId: string;
  evaluationType: EvaluationType;
  modelId: string;
  adapterPath: string | null;
  totalScenarios: number;
  completedScenarios: number;
  failedScenarios: number;
  
  // Aggregate metrics
  arcCompletionRate: number | null;
  avgProgressionQuality: number | null;
  empathyFirstRate: number | null;
  avgEmpathyScore: number | null;
  avgVoiceScore: number | null;
  helpfulRate: number | null;
  avgQualityScore: number | null;
  avgOverallScore: number | null;
  
  // Per-arc breakdown
  perArcMetrics: Record<EmotionalArcType, {
    completionRate: number;
    avgScore: number;
    scenarioCount: number;
  }> | null;
  
  status: EvaluationStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

// ============================================
// Evaluation Result Types (Claude Response Structure)
// ============================================

export interface EmotionalProgressionResult {
  startState: { primaryEmotion: string; intensity: number };
  endState: { primaryEmotion: string; intensity: number };
  arcCompleted: boolean;
  progressionQuality: number; // 1-5
  progressionNotes: string;
}

export interface EmpathyEvaluationResult {
  emotionsAcknowledged: boolean;
  acknowledgmentInFirstSentence: boolean;
  validationProvided: boolean;
  empathyScore: number; // 1-5
  empathyNotes: string;
}

export interface VoiceConsistencyResult {
  warmthPresent: boolean;
  judgmentFree: boolean;
  specificNumbersUsed: boolean;
  jargonExplained: boolean;
  voiceScore: number; // 1-5
  voiceNotes: string;
}

export interface ConversationQualityResult {
  helpfulToUser: boolean;
  actionableGuidance: boolean;
  appropriateDepth: boolean;
  naturalFlow: boolean;
  qualityScore: number; // 1-5
  qualityNotes: string;
}

export interface OverallEvaluationResult {
  wouldUserFeelHelped: boolean;
  overallScore: number; // 1-5
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

export interface EvaluationResult {
  id: string;
  runId: string;
  scenarioId: string;
  conversationTurns: Array<{ role: string; content: string }>;
  totalTokens: number | null;
  generationTimeMs: number | null;
  
  emotionalProgression: EmotionalProgressionResult | null;
  empathyEvaluation: EmpathyEvaluationResult | null;
  voiceConsistency: VoiceConsistencyResult | null;
  conversationQuality: ConversationQualityResult | null;
  overallEvaluation: OverallEvaluationResult | null;
  
  claudeModelUsed: string | null;
  evaluationTokens: number | null;
  rawResponse: string | null;
  evaluatedAt: string;
}

// ============================================
// Comparison Report Types
// ============================================

export interface ComparisonMetric {
  baseline: number;
  trained: number;
  absoluteImprovement: number;
  percentImprovement: number;
  meetsTarget: boolean;
}

export interface ComparisonReport {
  id: string;
  generatedAt: string;
  baselineRunId: string;
  trainedRunId: string;
  trainingJobId: string;
  
  improvements: {
    arcCompletion: ComparisonMetric;
    empathyFirst: ComparisonMetric;
    voiceConsistency: ComparisonMetric;
    overallScore: ComparisonMetric;
  };
  
  trainingSuccessful: boolean;
  successCriteriaMet: string[];
  successCriteriaMissed: string[];
  recommendation: string;
}

// ============================================
// Success Criteria Constants
// ============================================

export const SUCCESS_CRITERIA = {
  arcCompletionRate: { target: 0.40, description: 'Arc Completion Rate >= 40%' },
  empathyFirstRate: { target: 0.85, description: 'Empathy First Rate >= 85%' },
  voiceConsistency: { target: 0.90, description: 'Voice Consistency >= 90%' },
  overallScore: { target: 4.0, description: 'Overall Score >= 4.0' },
} as const;
```

### Task 3: Create Utility Functions

#### 3.1 Create Hyperparameter Conversion Utilities

Create file: `src/lib/pipeline/hyperparameter-utils.ts`

```typescript
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
```

### Task 4: Verify Implementation

After creating all files, run these verification commands:

#### 4.1 Verify Tables Created

```bash
# Check pipeline_training_jobs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_training_jobs',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);}})();"

# Check pipeline_training_metrics table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_training_metrics',transport:'pg'});console.log('Table exists:',r.success);})();"

# Check pipeline_evaluation_runs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_evaluation_runs',transport:'pg'});console.log('Table exists:',r.success);})();"

# Check pipeline_evaluation_results table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_evaluation_results',transport:'pg'});console.log('Table exists:',r.success);})();"
```

#### 4.2 Verify TypeScript Types Compile

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit src/types/pipeline.ts src/types/pipeline-metrics.ts src/types/pipeline-evaluation.ts
```

---

## Success Criteria

- [ ] All 4 database tables created with proper schemas
- [ ] RLS enabled and policies created for all tables
- [ ] All indexes created for performance
- [ ] TypeScript types file compiles without errors
- [ ] Hyperparameter utility functions work correctly
- [ ] SAOL can query all new tables
- [ ] Existing functionality in `src/` is not broken

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `pipeline_training_jobs` (DB) | CREATE | Main job tracking table |
| `pipeline_training_metrics` (DB) | CREATE | Time-series metrics storage |
| `pipeline_evaluation_runs` (DB) | CREATE | Claude-as-Judge evaluation runs |
| `pipeline_evaluation_results` (DB) | CREATE | Individual evaluation results |
| `src/types/pipeline.ts` | CREATE | Core pipeline types |
| `src/types/pipeline-metrics.ts` | CREATE | Metrics types |
| `src/types/pipeline-evaluation.ts` | CREATE | Evaluation types |
| `src/lib/pipeline/hyperparameter-utils.ts` | CREATE | Conversion utilities |

---

## Next Section

After completing E01, proceed to:
**Section E02: API Routes & Backend Services**

E02 will build upon the database schema and types created in this section.

---

**END OF E01 PROMPT**
