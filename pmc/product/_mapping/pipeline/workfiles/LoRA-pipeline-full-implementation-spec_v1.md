# LoRA Pipeline Full Implementation Specification

**Version:** 1.0  
**Date:** January 10, 2026  
**Purpose:** Complete implementation specification for the LoRA training pipeline module with Emotional Intelligence engine  
**Target Audience:** Senior coding agents implementing the system  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Phase 1: Database Schema & Types](#4-phase-1-database-schema--types)
5. [Phase 2: Container Module](#5-phase-2-container-module)
6. [Phase 3: Results Framework](#6-phase-3-results-framework)
7. [Phase 4: Emotional Intelligence Engine](#7-phase-4-emotional-intelligence-engine)
8. [Phase 5: UI Implementation](#8-phase-5-ui-implementation)
9. [Phase 6: Claude-as-Judge Evaluation](#9-phase-6-claude-as-judge-evaluation)
10. [Phase 7: Integration & Testing](#10-phase-7-integration--testing)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

### 1.1 Project Goal

Build a production-grade LoRA training pipeline that:

1. **Trains LLMs to achieve emotional arc progressions** - Moving users from negative emotional states (confusion, anxiety, frustration) to positive states (clarity, confidence, resolution)
2. **Provides lay-person accessible configuration** - Non-technical users can configure training using business-impact language
3. **Measures training effectiveness** - Using Claude-as-Judge evaluation before and after training
4. **Integrates with existing Next.js 14 application** - Building into the established codebase patterns

### 1.2 Key Architectural Decisions

| Decision | Specification |
|----------|---------------|
| Single Engine Architecture | ONE engine loaded at deployment time, no runtime routing |
| Lay-Person UI | Business-impact terminology for hyperparameters |
| Post-Training Metrics | Emotional Arc Fidelity and Empathy Score computed AFTER training |
| Claude-as-Judge | Industry-standard evaluation pattern for emotional nuance |
| Modular Design | Container → Engine → Results separation |

### 1.3 Implementation Phases Summary

| Phase | Scope | Estimated Effort |
|-------|-------|------------------|
| Phase 1 | Database Schema & Types | 1 day |
| Phase 2 | Container Module | 2 days |
| Phase 3 | Results Framework | 2 days |
| Phase 4 | Emotional Intelligence Engine | 3 days |
| Phase 5 | UI Implementation | 3 days |
| Phase 6 | Claude-as-Judge Evaluation | 2 days |
| Phase 7 | Integration & Testing | 2 days |

---

## 2. Architecture Overview

### 2.1 Three-Module System

```
┌────────────────────────────────────────────────────────────┐
│                    CONTAINER MODULE                         │
│                     (The Chassis)                          │
│  - Defines interfaces and contracts                       │
│  - Manages lifecycle (start, monitor, stop)              │
│  - Routes jobs to loaded engine                          │
│  - Collects and forwards results                         │
└────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌──────────────────────┐        ┌─────────────────────────┐
│  RESULTS MODULE      │        │   ENGINE MODULE         │
│  (Measurement)       │←───────│   (Training)            │
│                      │        │                         │
│  - Metric registry   │        │  - Emotional Alignment  │
│  - Measurement       │        │    Engine (V1)          │
│    protocols         │        │                         │
│  - Validation        │        │  All engines implement: │
│  - Reporting         │        │  • initialize()         │
│                      │        │  • train()              │
│                      │        │  • save()               │
│                      │        │  • report_metrics()     │
└──────────────────────┘        └─────────────────────────┘
```

### 2.2 Data Flow

```
User configures job in UI (Next.js)
    ↓
POST /api/pipeline/jobs (create job)
    ↓
Supabase: Insert into pipeline_training_jobs
    ↓
Edge function: process-pipeline-jobs (polls pending jobs)
    ↓
RunPod worker (container.py)
    ├─ Load engine (Emotional Alignment)
    ├─ Initialize Results collectors
    ├─ Call engine.train()
    ├─ Collect metrics
    └─ Save adapters to storage
    ↓
Edge function: create-model-artifacts
    ↓
Supabase Storage: Store adapter files
    ↓
POST /api/pipeline/evaluate (Claude-as-Judge)
    ↓
Results Dashboard UI
```

### 2.3 Single Engine Architecture

**Critical Design Decision:** Only ONE advanced engine is loaded at deployment time.

```
Runtime (Only ONE of these is deployed):
└── Currently Loaded: engine-emotional-alignment/
    └── No routing logic, no detection, no selection
    └── This IS the product offering
```

**Implications:**
- UI shows features of the CURRENTLY LOADED engine
- No engine selection dropdown needed
- Engine swapping is a Product Owner operation (manual deployment)
- Simplifies user experience for lay-persons

---

## 3. Technology Stack

### 3.1 Frontend Technologies

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Primary React framework with App Router |
| TypeScript | Primary development language |
| Tailwind CSS | Utility-first CSS framework |
| Shadcn/UI | Component library |
| Zustand | Global state management |
| React Query | Server state and caching |

### 3.2 Backend Technologies

| Technology | Purpose |
|------------|---------|
| Supabase | Database and backend service |
| Supabase Auth | Authentication system |
| Next.js API Routes | Serverless API endpoints |
| Supabase Edge Functions | Serverless functions for training orchestration |
| RunPod | GPU compute for training |

### 3.3 Training Stack (Python)

| Library | Version | Purpose |
|---------|---------|---------|
| PyTorch | 2.1+ | Deep learning framework |
| Transformers | 4.46+ | Model loading and tokenization |
| PEFT | 0.7+ | LoRA adapter implementation |
| TRL | 0.9.6 | SFT training utilities |
| bitsandbytes | 0.41+ | 4-bit quantization |
| Datasets | 2.14+ | Data loading and processing |

### 3.4 Evaluation Stack

| Technology | Purpose |
|------------|---------|
| Anthropic Claude API | Claude-as-Judge evaluation |
| claude-sonnet-4-20250514 | Evaluation model for emotional assessment |

---

## 4. Phase 1: Database Schema & Types

### 4.1 Supabase Database Tables

#### 4.1.1 pipeline_training_jobs

```sql
CREATE TABLE pipeline_training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job identification
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, queued, initializing, running, completed, failed, cancelled
  
  -- Configuration (lay-person terms stored, technical values derived)
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
  
  -- Engine information
  engine_id TEXT NOT NULL DEFAULT 'emotional-alignment-v1',
  engine_name TEXT NOT NULL DEFAULT 'Emotional Alignment',
  engine_features JSONB,
  
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

-- Indexes
CREATE INDEX idx_pipeline_jobs_user_id ON pipeline_training_jobs(user_id);
CREATE INDEX idx_pipeline_jobs_status ON pipeline_training_jobs(status);
CREATE INDEX idx_pipeline_jobs_created_at ON pipeline_training_jobs(created_at DESC);
```

#### 4.1.2 pipeline_training_metrics

```sql
CREATE TABLE pipeline_training_metrics (
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
  
  CONSTRAINT fk_job FOREIGN KEY (job_id) 
    REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_metrics_job_id ON pipeline_training_metrics(job_id);
CREATE INDEX idx_metrics_metric_id ON pipeline_training_metrics(metric_id);
CREATE INDEX idx_metrics_step ON pipeline_training_metrics(step_number);
```

#### 4.1.3 pipeline_evaluation_runs

```sql
CREATE TABLE pipeline_evaluation_runs (
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

CREATE INDEX idx_eval_runs_job_id ON pipeline_evaluation_runs(job_id);
```

#### 4.1.4 pipeline_evaluation_results

```sql
CREATE TABLE pipeline_evaluation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pipeline_evaluation_runs(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  
  -- Conversation data
  conversation_turns JSONB NOT NULL,
  total_tokens INTEGER,
  generation_time_ms INTEGER,
  
  -- Claude evaluation results
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

CREATE INDEX idx_eval_results_run_id ON pipeline_evaluation_results(run_id);
```

### 4.2 TypeScript Type Definitions

#### 4.2.1 Core Types

Create file: `src/types/pipeline.ts`

```typescript
// Lay-person parameter options
export type TrainingSensitivity = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type TrainingProgression = 'low' | 'medium' | 'high';
export type TrainingRepetition = 1 | 3 | 5 | 10;

// Job status
export type PipelineJobStatus = 
  | 'pending' 
  | 'queued' 
  | 'initializing' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

// Engine features
export interface EngineFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Engine definition
export interface TrainingEngine {
  id: string;
  name: string;
  description: string;
  features: EngineFeature[];
  evaluations: AutomaticEvaluation[];
}

// Automatic evaluations
export interface AutomaticEvaluation {
  id: string;
  name: string;
  estimatedMinutes: number;
  description: string;
}

// Training job
export interface PipelineTrainingJob {
  id: string;
  userId: string;
  jobName: string;
  status: PipelineJobStatus;
  
  // Lay-person configuration
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  
  // Technical hyperparameters
  learningRate: number;
  batchSize: number;
  epochs: number;
  rank: number;
  alpha: number;
  dropout: number;
  
  // Dataset
  datasetId: string;
  datasetName: string;
  datasetFilePath: string;
  
  // Engine
  engineId: string;
  engineName: string;
  engineFeatures: EngineFeature[];
  
  // GPU
  gpuType: string;
  gpuCount: number;
  
  // Cost
  estimatedCost: number;
  actualCost?: number;
  
  // Progress
  progress: number;
  currentEpoch: number;
  currentStep: number;
  totalSteps?: number;
  
  // Real-time metrics
  currentLoss?: number;
  currentLearningRate?: number;
  tokensPerSecond?: number;
  
  // Results
  finalLoss?: number;
  trainingTimeSeconds?: number;
  adapterFilePath?: string;
  adapterDownloadUrl?: string;
  
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Error
  errorMessage?: string;
}

// Hyperparameter mapping (lay-person to technical)
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

// Display labels
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
```

#### 4.2.2 Metric Types

Create file: `src/types/metrics.ts`

```typescript
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
  metricId: string;
  value: number;
  unit: string;
  measuredAt: string;
  stepNumber?: number;
  epochNumber?: number;
}

export interface TrainingMetrics {
  universal: MetricValue[];
  domain: MetricValue[];
  specialized: MetricValue[];
}

// Universal metrics (always collected)
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

// Specialized metrics for Emotional Alignment engine
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
];
```

#### 4.2.3 Evaluation Types

Create file: `src/types/evaluation.ts`

```typescript
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
  heldOut: true;
  createdDate: string;
}

export interface EvaluationResult {
  conversationId: string;
  scenarioId: string;
  modelId: string;
  evaluationTimestamp: string;
  
  emotionalProgression: {
    startState: { primaryEmotion: string; intensity: number };
    endState: { primaryEmotion: string; intensity: number };
    arcCompleted: boolean;
    progressionQuality: number; // 1-5
    progressionNotes: string;
  };
  
  empathyEvaluation: {
    emotionsAcknowledged: boolean;
    acknowledgmentInFirstSentence: boolean;
    validationProvided: boolean;
    empathyScore: number; // 1-5
    empathyNotes: string;
  };
  
  voiceConsistency: {
    warmthPresent: boolean;
    judgmentFree: boolean;
    specificNumbersUsed: boolean;
    jargonExplained: boolean;
    voiceScore: number; // 1-5
    voiceNotes: string;
  };
  
  conversationQuality: {
    helpfulToUser: boolean;
    actionableGuidance: boolean;
    appropriateDepth: boolean;
    naturalFlow: boolean;
    qualityScore: number; // 1-5
    qualityNotes: string;
  };
  
  overallEvaluation: {
    wouldUserFeelHelped: boolean;
    overallScore: number; // 1-5
    keyStrengths: string[];
    areasForImprovement: string[];
    summary: string;
  };
  
  claudeModelUsed: string;
  evaluationTokens: number;
}

export interface ComparisonReport {
  id: string;
  generatedAt: string;
  baselineRunId: string;
  trainedRunId: string;
  trainingJobId: string;
  
  improvements: {
    arcCompletion: {
      baseline: number;
      trained: number;
      absoluteImprovement: number;
      percentImprovement: number;
      meetsTarget: boolean; // >= 40%
    };
    empathyFirst: {
      baseline: number;
      trained: number;
      absoluteImprovement: number;
      percentImprovement: number;
      meetsTarget: boolean; // >= 85%
    };
    voiceConsistency: {
      baseline: number;
      trained: number;
      absoluteImprovement: number;
      percentImprovement: number;
      meetsTarget: boolean; // >= 90%
    };
    overallScore: {
      baseline: number;
      trained: number;
      absoluteImprovement: number;
      percentImprovement: number;
    };
  };
  
  trainingSuccessful: boolean;
  successCriteriaMet: string[];
  successCriteriaMissed: string[];
  recommendation: string;
}
```

---

## 5. Phase 2: Container Module

### 5.1 Purpose

The Container Module is the **stable foundation** that:
1. Accepts job requests from the Next.js app
2. Routes jobs to the loaded engine
3. Manages job lifecycle (queue, run, monitor, complete)
4. Collects results and sends them back
5. Provides extension points for future capabilities

### 5.2 Container Implementation

Create file: `brightrun-trainer/container.py`

```python
"""
Container Module - The Chassis
Manages training lifecycle and routes to engines.
"""

from typing import Protocol, Dict, Any, List
from abc import ABC, abstractmethod
import logging
import time
import json

logger = logging.getLogger(__name__)


class TrainingEngine(Protocol):
    """Interface that all engines must implement."""
    
    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """Return what this engine can do."""
        pass
    
    @abstractmethod
    def initialize(self, model_config: Dict[str, Any]) -> None:
        """Load model, configure adapters, etc."""
        pass
    
    @abstractmethod
    def load_dataset(self, dataset_path: str, format: str) -> Any:
        """Load and preprocess dataset."""
        pass
    
    @abstractmethod
    def train(
        self, 
        dataset: Any, 
        hyperparameters: Dict[str, Any],
        progress_callback: callable = None
    ) -> Dict[str, Any]:
        """Execute training. Returns metrics."""
        pass
    
    @abstractmethod
    def save_adapters(self, output_path: str) -> List[str]:
        """Save trained adapters. Returns list of file paths."""
        pass
    
    @abstractmethod
    def get_training_metrics(self) -> Dict[str, Any]:
        """Get current training state."""
        pass


class EngineRegistry:
    """Manages available training engines."""
    
    def __init__(self):
        self._engines: Dict[str, TrainingEngine] = {}
    
    def register(self, engine_id: str, engine: TrainingEngine):
        """Register a new engine."""
        self._engines[engine_id] = engine
        logger.info(f"Registered engine: {engine_id}")
    
    def get(self, engine_id: str) -> TrainingEngine:
        """Get engine by ID."""
        if engine_id not in self._engines:
            raise ValueError(f"Unknown engine: {engine_id}")
        return self._engines[engine_id]
    
    def list_engines(self) -> List[str]:
        """List all registered engine IDs."""
        return list(self._engines.keys())


class MonitoringHooks:
    """Extensible monitoring system."""
    
    def __init__(self):
        self._hooks: List[callable] = []
    
    def register_hook(self, hook: callable):
        """Register a hook for training events."""
        self._hooks.append(hook)
    
    def emit(self, event_type: str, event_data: Dict[str, Any]):
        """Emit event to all registered hooks."""
        for hook in self._hooks:
            try:
                hook(event_type, event_data)
            except Exception as e:
                logger.error(f"Hook failed: {e}")


class ResultsCollector:
    """Collects and formats training results."""
    
    def __init__(self):
        self.metrics = []
    
    def add_metric(self, metric_id: str, value: float, unit: str, **metadata):
        """Add a metric to the collection."""
        self.metrics.append({
            'metric_id': metric_id,
            'value': value,
            'unit': unit,
            'measured_at': time.time(),
            **metadata
        })
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all collected metrics."""
        return self.metrics


class TrainingContainer:
    """
    The Chassis: Manages training lifecycle and routes to engines.
    """
    
    def __init__(self):
        self.engine_registry = EngineRegistry()
        self.results_collector = ResultsCollector()
        self.monitoring_hooks = MonitoringHooks()
        
        # Register default engines
        self._register_default_engines()
    
    def _register_default_engines(self):
        """Register the engines we ship with."""
        from emotional_alignment_engine import EmotionalAlignmentEngine
        self.engine_registry.register(
            'emotional-alignment-v1', 
            EmotionalAlignmentEngine()
        )
    
    def execute_job(self, job_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point: Execute a training job.
        Called by handler.py.
        """
        job_id = job_config['job_id']
        engine_id = job_config.get('engine_id', 'emotional-alignment-v1')
        
        logger.info(f"Starting job {job_id} with engine {engine_id}")
        
        # 1. Get engine
        engine = self.engine_registry.get(engine_id)
        logger.info(f"Selected engine: {engine.__class__.__name__}")
        
        # 2. Notify start
        self.monitoring_hooks.emit('training_start', {
            'job_id': job_id,
            'engine': engine_id,
            'config': job_config
        })
        
        start_time = time.time()
        
        try:
            # 3. Initialize engine
            engine.initialize({
                'model_name': job_config.get('model_name', 
                    'meta-llama/Meta-Llama-3-70B-Instruct'),
                'quantization': job_config.get('quantization', '4bit'),
            })
            
            # 4. Load dataset
            dataset = engine.load_dataset(
                job_config['dataset_path'],
                job_config.get('dataset_format', 'brightrun')
            )
            
            # 5. Train with progress callback
            def progress_callback(step, epoch, loss, lr):
                self.monitoring_hooks.emit('step_complete', {
                    'job_id': job_id,
                    'step': step,
                    'epoch': epoch,
                    'loss': loss,
                    'learning_rate': lr
                })
            
            metrics = engine.train(
                dataset=dataset,
                hyperparameters=job_config['hyperparameters'],
                progress_callback=progress_callback
            )
            
            # 6. Save adapters
            adapter_files = engine.save_adapters('/tmp/adapters')
            
            # 7. Collect results
            training_time = time.time() - start_time
            self.results_collector.add_metric(
                'training_time', training_time, 'seconds'
            )
            self.results_collector.add_metric(
                'final_loss', metrics['final_loss'], 'nats'
            )
            
            # 8. Notify complete
            self.monitoring_hooks.emit('training_complete', {
                'job_id': job_id,
                'metrics': metrics,
                'adapter_files': adapter_files,
                'training_time': training_time
            })
            
            return {
                'status': 'success',
                'metrics': self.results_collector.get_all(),
                'model_files': adapter_files,
                'training_time_seconds': training_time,
                'final_loss': metrics['final_loss']
            }
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            self.monitoring_hooks.emit('training_failed', {
                'job_id': job_id,
                'error': str(e)
            })
            raise
```

### 5.3 Handler Integration

Update file: `brightrun-trainer/handler.py`

```python
"""
RunPod Handler - Entry point for serverless training jobs.
"""

import runpod
import json
import logging
from container import TrainingContainer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def handler(job):
    """
    RunPod serverless handler.
    Receives job from edge function, executes via Container.
    """
    try:
        job_input = job['input']
        logger.info(f"Received job: {job_input.get('job_id')}")
        
        # Create container and execute
        container = TrainingContainer()
        result = container.execute_job(job_input)
        
        return result
        
    except Exception as e:
        logger.error(f"Job failed: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }


runpod.serverless.start({"handler": handler})
```

---

## 6. Phase 3: Results Framework

### 6.1 Purpose

The Results Module provides a **measurement discipline** for:
1. Defining what success looks like
2. Measuring it objectively
3. Validating measurements
4. Reporting results clearly
5. Ensuring traceability

### 6.2 Metric Registry

Create file: `brightrun-trainer/results_framework.py`

```python
"""
Results Framework - Measurement ontology for training outcomes.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Protocol
from enum import Enum
from datetime import datetime
import json


class MetricLevel(Enum):
    UNIVERSAL = "universal"      # All training
    DOMAIN = "domain"           # Specific domain
    SPECIALIZED = "specialized"  # Novel techniques


@dataclass
class MetricDescriptor:
    """Formal definition of a metric."""
    
    id: str
    name: str
    level: MetricLevel
    description: str
    measurement_method: str
    unit: str
    range: tuple
    higher_is_better: bool
    required_inputs: List[str]
    validation_rules: List[str]
    introduced_in_version: str
    last_updated: str
    research_reference: str = None


@dataclass
class MetricResult:
    """A measured metric value with full traceability."""
    
    metric_id: str
    value: float
    unit: str
    measured_at: datetime
    measurement_version: str
    inputs_hash: str
    job_id: str
    engine_id: str
    dataset_id: str
    passed_validation: bool
    validation_warnings: List[str]


class MetricRegistry:
    """Central registry of all metrics."""
    
    def __init__(self):
        self._metrics: Dict[str, MetricDescriptor] = {}
        self._register_universal_metrics()
        self._register_emotional_alignment_metrics()
    
    def register(self, metric: MetricDescriptor):
        """Register a new metric in the system."""
        self._metrics[metric.id] = metric
    
    def get(self, metric_id: str) -> MetricDescriptor:
        """Get metric definition."""
        if metric_id not in self._metrics:
            raise ValueError(f"Unknown metric: {metric_id}")
        return self._metrics[metric_id]
    
    def get_by_level(self, level: MetricLevel) -> List[MetricDescriptor]:
        """Get all metrics at a specific level."""
        return [m for m in self._metrics.values() if m.level == level]
    
    def _register_universal_metrics(self):
        """Register metrics that apply to ALL training."""
        
        self.register(MetricDescriptor(
            id="training_loss",
            name="Training Loss",
            level=MetricLevel.UNIVERSAL,
            description="Cross-entropy loss during training",
            measurement_method="Computed by trainer during backpropagation",
            unit="nats",
            range=(0.0, float('inf')),
            higher_is_better=False,
            required_inputs=["predictions", "labels"],
            validation_rules=["must_be_positive"],
            introduced_in_version="1.0.0",
            last_updated="2026-01-10"
        ))
        
        self.register(MetricDescriptor(
            id="training_time",
            name="Training Time",
            level=MetricLevel.UNIVERSAL,
            description="Total time spent training in seconds",
            measurement_method="Wall-clock time from start to end",
            unit="seconds",
            range=(0.0, float('inf')),
            higher_is_better=False,
            required_inputs=["start_timestamp", "end_timestamp"],
            validation_rules=["must_be_positive"],
            introduced_in_version="1.0.0",
            last_updated="2026-01-10"
        ))
    
    def _register_emotional_alignment_metrics(self):
        """Register specialized metrics for emotional alignment."""
        
        self.register(MetricDescriptor(
            id="emotional_arc_fidelity",
            name="Emotional Arc Fidelity",
            level=MetricLevel.SPECIALIZED,
            description="How well model follows intended emotional arc",
            measurement_method="Claude-as-Judge evaluation on test scenarios",
            unit="score",
            range=(0.0, 1.0),
            higher_is_better=True,
            required_inputs=["model_outputs", "expected_arcs", "test_scenarios"],
            validation_rules=["requires_claude_evaluation"],
            introduced_in_version="1.0.0",
            last_updated="2026-01-10",
            research_reference="emotional-alignment-measurement-v1.md"
        ))
        
        self.register(MetricDescriptor(
            id="empathy_score",
            name="Empathy Score",
            level=MetricLevel.SPECIALIZED,
            description="Degree to which model acknowledges emotions",
            measurement_method="Claude-as-Judge analyzing empathetic language",
            unit="score",
            range=(1.0, 5.0),
            higher_is_better=True,
            required_inputs=["model_outputs", "conversation_context"],
            validation_rules=["requires_claude_evaluation"],
            introduced_in_version="1.0.0",
            last_updated="2026-01-10"
        ))
        
        self.register(MetricDescriptor(
            id="arc_completion_rate",
            name="Arc Completion Rate",
            level=MetricLevel.SPECIALIZED,
            description="Percentage of conversations completing arc",
            measurement_method="Claude-as-Judge evaluation",
            unit="percentage",
            range=(0.0, 100.0),
            higher_is_better=True,
            required_inputs=["evaluation_results"],
            validation_rules=["must_be_percentage"],
            introduced_in_version="1.0.0",
            last_updated="2026-01-10"
        ))


class ResultsReport:
    """Complete results for a training job."""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.universal_metrics: List[MetricResult] = []
        self.domain_metrics: List[MetricResult] = []
        self.specialized_metrics: List[MetricResult] = []
        self.created_at = datetime.now()
        self.framework_version = "1.0.0"
    
    def add_metric(self, result: MetricResult, level: MetricLevel):
        """Add a metric result to the report."""
        if level == MetricLevel.UNIVERSAL:
            self.universal_metrics.append(result)
        elif level == MetricLevel.DOMAIN:
            self.domain_metrics.append(result)
        elif level == MetricLevel.SPECIALIZED:
            self.specialized_metrics.append(result)
    
    def to_dict(self) -> Dict[str, Any]:
        """Export report as dictionary."""
        return {
            'job_id': self.job_id,
            'created_at': self.created_at.isoformat(),
            'framework_version': self.framework_version,
            'universal_metrics': [asdict(m) for m in self.universal_metrics],
            'domain_metrics': [asdict(m) for m in self.domain_metrics],
            'specialized_metrics': [asdict(m) for m in self.specialized_metrics],
        }
    
    def to_json(self) -> str:
        """Export report as JSON."""
        return json.dumps(self.to_dict(), default=str, indent=2)
```

---

## 7. Phase 4: Emotional Intelligence Engine

### 7.1 Purpose

The Emotional Alignment Engine trains LLMs to:
1. **Recognize emotional states** in user messages
2. **Follow emotional arcs** progressing users from negative to positive states
3. **Acknowledge emotions before facts** (empathy-first approach)
4. **Maintain consultant voice** (warm, professional, non-judgmental)

### 7.2 Engine Implementation

Create file: `brightrun-trainer/emotional_alignment_engine.py`

```python
"""
Emotional Alignment Training Engine
Trains LLMs to follow emotional arc progressions.
"""

import torch
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import Dataset
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class EmotionalAlignmentEngine:
    """
    Training engine optimized for emotional arc progression.
    Implements the TrainingEngine protocol.
    """
    
    VERSION = "1.0.0"
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.trainer = None
        self.training_metrics = []
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Return engine capabilities for UI display."""
        return {
            'id': 'emotional-alignment-v1',
            'name': 'Emotional Alignment',
            'description': 'Optimized for emotional arc progression training',
            'features': [
                {
                    'id': 'emotional_arc_recognition',
                    'name': 'Emotional Arc Pattern Recognition',
                    'description': 'Learns to identify and follow emotional progressions',
                    'enabled': True
                },
                {
                    'id': 'empathetic_response',
                    'name': 'Empathetic Response Optimization',
                    'description': 'Prioritizes emotion acknowledgment before advice',
                    'enabled': True
                },
                {
                    'id': 'progression_aware',
                    'name': 'Progression-Aware Training',
                    'description': 'Weights training toward arc completion',
                    'enabled': True
                }
            ],
            'evaluations': [
                {
                    'id': 'emotional_arc_fidelity',
                    'name': 'Emotional Arc Fidelity',
                    'estimatedMinutes': 5
                },
                {
                    'id': 'empathy_score',
                    'name': 'Empathy Score',
                    'estimatedMinutes': 3
                }
            ],
            'supports_models': ['llama-3-*', 'mistral-*', 'qwen-*'],
            'supports_quantization': ['4bit', '8bit', 'none']
        }
    
    def initialize(self, model_config: Dict[str, Any]) -> None:
        """Load model with quantization and prepare for training."""
        model_name = model_config.get('model_name', 
            'meta-llama/Meta-Llama-3-70B-Instruct')
        quantization = model_config.get('quantization', '4bit')
        
        logger.info(f"Loading model: {model_name} with {quantization}")
        
        # Configure quantization
        if quantization == '4bit':
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16
            )
        else:
            bnb_config = None
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.bfloat16
        )
        
        # Prepare for training
        self.model = prepare_model_for_kbit_training(self.model)
        logger.info("Model loaded and prepared for training")
    
    def load_dataset(self, dataset_path: str, format: str = 'brightrun') -> Dataset:
        """Load and preprocess BrightRun format dataset."""
        logger.info(f"Loading dataset from {dataset_path}")
        
        with open(dataset_path, 'r') as f:
            data = json.load(f)
        
        # Extract conversations and format for training
        training_examples = []
        
        for conversation in data.get('conversations', []):
            for pair in conversation.get('training_pairs', []):
                # Build conversation history
                history = pair.get('conversation_history', [])
                current_input = pair.get('current_user_input', '')
                target = pair.get('target_response')
                
                if not target:
                    continue
                
                # Format as chat template
                messages = []
                
                # Add system prompt
                system_prompt = pair.get('system_prompt', '')
                if system_prompt:
                    messages.append({
                        'role': 'system',
                        'content': system_prompt
                    })
                
                # Add conversation history
                for turn in history:
                    messages.append({
                        'role': turn['role'],
                        'content': turn['content']
                    })
                
                # Add current input
                messages.append({
                    'role': 'user',
                    'content': current_input
                })
                
                # Add target response
                messages.append({
                    'role': 'assistant',
                    'content': target
                })
                
                # Convert to text using tokenizer's chat template
                text = self.tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=False
                )
                
                training_examples.append({
                    'text': text,
                    'conversation_id': pair.get('conversation_id'),
                    'emotional_arc': pair.get('conversation_metadata', {}).get(
                        'emotional_arc_key'),
                    'turn_number': pair.get('turn_number', 0)
                })
        
        logger.info(f"Prepared {len(training_examples)} training examples")
        return Dataset.from_list(training_examples)
    
    def train(
        self, 
        dataset: Dataset, 
        hyperparameters: Dict[str, Any],
        progress_callback: callable = None
    ) -> Dict[str, Any]:
        """Execute training with LoRA adapters."""
        
        # Configure LoRA
        lora_config = LoraConfig(
            r=hyperparameters.get('rank', 16),
            lora_alpha=hyperparameters.get('alpha', 32),
            lora_dropout=hyperparameters.get('dropout', 0.05),
            target_modules=[
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj"
            ],
            bias="none",
            task_type="CAUSAL_LM"
        )
        
        # Apply LoRA
        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()
        
        # Training arguments
        from transformers import TrainingArguments
        
        training_args = TrainingArguments(
            output_dir="/tmp/training_output",
            num_train_epochs=hyperparameters.get('epochs', 3),
            per_device_train_batch_size=hyperparameters.get('batch_size', 4),
            learning_rate=hyperparameters.get('learning_rate', 0.0001),
            gradient_accumulation_steps=4,
            warmup_ratio=0.03,
            logging_steps=10,
            save_steps=100,
            fp16=False,
            bf16=True,
            optim="paged_adamw_8bit",
            report_to="none"
        )
        
        # Create trainer
        self.trainer = SFTTrainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset,
            dataset_text_field="text",
            max_seq_length=2048,
            tokenizer=self.tokenizer,
        )
        
        # Train
        logger.info("Starting training...")
        result = self.trainer.train()
        
        return {
            'final_loss': result.training_loss,
            'total_steps': result.global_step,
            'epochs_completed': hyperparameters.get('epochs', 3)
        }
    
    def save_adapters(self, output_path: str) -> List[str]:
        """Save LoRA adapters to disk."""
        logger.info(f"Saving adapters to {output_path}")
        
        self.model.save_pretrained(output_path)
        self.tokenizer.save_pretrained(output_path)
        
        import os
        saved_files = []
        for f in os.listdir(output_path):
            saved_files.append(os.path.join(output_path, f))
        
        logger.info(f"Saved {len(saved_files)} files")
        return saved_files
    
    def get_training_metrics(self) -> Dict[str, Any]:
        """Get current training state."""
        if self.trainer is None:
            return {}
        
        state = self.trainer.state
        return {
            'current_step': state.global_step,
            'current_epoch': state.epoch,
            'current_loss': state.log_history[-1].get('loss') if state.log_history else None
        }
```

### 7.3 Training Data Format

The engine expects BrightRun format JSON:

```json
{
  "training_file_metadata": {
    "version": "4.0.0",
    "format_spec": "brightrun-lora-v4",
    "total_conversations": 24,
    "total_training_pairs": 153
  },
  "consultant_profile": {
    "name": "Elena Morales, CFP",
    "core_philosophy": {
      "principle_1": "Money is emotional - always acknowledge feelings before facts"
    }
  },
  "conversations": [
    {
      "conversation_metadata": {
        "conversation_id": "uuid",
        "scaffolding": {
          "persona_key": "anxious_planner",
          "emotional_arc_key": "confusion_to_clarity"
        }
      },
      "training_pairs": [
        {
          "turn_number": 1,
          "system_prompt": "You are an emotionally intelligent...",
          "conversation_history": [],
          "current_user_input": "I'm confused about...",
          "target_response": "I hear your confusion..."
        }
      ]
    }
  ]
}
```

### 7.4 Training Data Location

Primary training file:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\_archive\full-file-training-json-12-plus-12-added-conversations.json`

Contains:
- 24 conversations
- 153 training pairs
- 3 persona types (anxious_planner, overwhelmed_avoider, pragmatic_optimist)
- 2 emotional arcs (confusion_to_clarity, couple_conflict_to_alignment)

---

## 8. Phase 5: UI Implementation

### 8.1 UI Design Principles

Based on `LoRA-training-lay-person-interface-changes_v3.md`:

1. **Lay-Person Language**: Technical terms replaced with business-impact terminology
2. **Single Engine Display**: No engine selection - display features of loaded engine
3. **Post-Training Metrics**: Specialized metrics shown in results, not configuration
4. **Transparency**: Rollover tooltips explain tradeoffs

### 8.2 Hyperparameter Mapping

| UI Term | Technical Term | Values |
|---------|---------------|--------|
| Training Sensitivity | Learning Rate | Very Stable (0.00001) → Very Adaptive (0.001) |
| Training Progression | Batch Size | Deep Thinking (2) → Broad Learning (16) |
| Training Repetition | Epochs | 1 (Quick) → 10+ (Deep) |

### 8.3 UI Components to Create

#### Location: `src/components/pipeline/`

| Component | Purpose |
|-----------|---------|
| `TrainingDataSummaryCard.tsx` | Display selected training file |
| `TrainingParameterSlider.tsx` | Lay-person sliders with tooltips |
| `EngineFeaturesPanel.tsx` | Display-only engine capabilities |
| `PostTrainingEvaluationInfo.tsx` | Display automatic evaluations |
| `CostEstimateCard.tsx` | Real-time cost calculation |
| `TrainingProgressPanel.tsx` | Real-time training monitoring |
| `TrainingQualityEvaluation.tsx` | Post-training specialized metrics |
| `ComparisonReportCard.tsx` | Baseline vs trained comparison |

### 8.4 Pages to Create

#### Location: `src/app/(dashboard)/pipeline/`

| Page | Route | Purpose |
|------|-------|---------|
| `configure/page.tsx` | `/pipeline/configure` | Training configuration |
| `jobs/page.tsx` | `/pipeline/jobs` | Job list |
| `jobs/[jobId]/page.tsx` | `/pipeline/jobs/:id` | Job monitoring |
| `jobs/[jobId]/results/page.tsx` | `/pipeline/jobs/:id/results` | Results dashboard |

### 8.5 Zustand Store

Create file: `src/stores/pipelineStore.ts`

```typescript
import { create } from 'zustand';
import type { 
  TrainingSensitivity, 
  TrainingProgression,
  TrainingRepetition,
  PipelineTrainingJob 
} from '@/types/pipeline';

interface PipelineState {
  // Configuration
  selectedFileId: string | null;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  
  // Current job
  activeJobId: string | null;
  activeJob: PipelineTrainingJob | null;
  
  // Actions
  setSelectedFile: (fileId: string | null) => void;
  setTrainingSensitivity: (value: TrainingSensitivity) => void;
  setTrainingProgression: (value: TrainingProgression) => void;
  setTrainingRepetition: (value: TrainingRepetition) => void;
  setActiveJob: (job: PipelineTrainingJob | null) => void;
  resetToDefaults: () => void;
  
  // Computed
  getCostEstimate: () => { compute: number; evaluation: number; total: number };
  isValid: () => boolean;
}

const DEFAULT_STATE = {
  selectedFileId: null,
  trainingSensitivity: 'medium' as TrainingSensitivity,
  trainingProgression: 'medium' as TrainingProgression,
  trainingRepetition: 3 as TrainingRepetition,
  activeJobId: null,
  activeJob: null,
};

export const usePipelineStore = create<PipelineState>((set, get) => ({
  ...DEFAULT_STATE,
  
  setSelectedFile: (fileId) => set({ selectedFileId: fileId }),
  setTrainingSensitivity: (value) => set({ trainingSensitivity: value }),
  setTrainingProgression: (value) => set({ trainingProgression: value }),
  setTrainingRepetition: (value) => set({ trainingRepetition: value }),
  setActiveJob: (job) => set({ activeJob: job, activeJobId: job?.id ?? null }),
  resetToDefaults: () => set(DEFAULT_STATE),
  
  getCostEstimate: () => {
    const { trainingRepetition, trainingProgression } = get();
    const baseHourlyRate = 1.50; // A40 hourly
    const hoursPerEpoch = trainingProgression === 'high' ? 0.5 : 
                          trainingProgression === 'medium' ? 1 : 1.5;
    const computeHours = trainingRepetition * hoursPerEpoch;
    const computeCost = computeHours * baseHourlyRate;
    const evaluationCost = 2.50; // Claude API costs
    return {
      compute: computeCost,
      evaluation: evaluationCost,
      total: computeCost + evaluationCost
    };
  },
  
  isValid: () => {
    const { selectedFileId } = get();
    return selectedFileId !== null;
  }
}));
```

---

## 9. Phase 6: Claude-as-Judge Evaluation

### 9.1 Evaluation Flow

```
1. User submits training job
2. Training completes → adapters saved
3. System triggers evaluation pipeline:
   a. Run BASELINE evaluation (model without adapters)
   b. Run TRAINED evaluation (model with adapters)
   c. Compare results
   d. Generate comparison report
4. Display results in UI
```

### 9.2 Test Scenarios

Create file: `src/lib/pipeline/test-scenarios.ts`

Define held-out test scenarios NOT used in training:

```typescript
export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'test_anxiety_to_confidence_001',
    arcType: 'anxiety_to_confidence',
    persona: 'anxious_planner',
    topic: 'Investment Volatility',
    initialContext: {
      userName: 'Test User',
      userBackground: 'Mid-career professional, first-time investor',
      emotionalState: {
        primaryEmotion: 'anxiety',
        intensity: 0.8,
        secondaryEmotions: ['fear', 'confusion']
      },
      situation: 'Market dropped 10%, considering selling everything'
    },
    openingMessage: "I'm freaking out. My portfolio dropped $15,000 this week...",
    targetArc: {
      sourceEmotion: 'anxiety',
      targetEmotion: 'confidence',
      expectedTurns: 5
    },
    heldOut: true,
    createdDate: '2026-01-10'
  },
  // ... more scenarios for each arc type
];
```

### 9.3 Evaluation API Endpoint

Create file: `src/app/api/pipeline/evaluate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const { jobId, evaluationType } = await request.json();
  
  // 1. Get job details
  const supabase = createClient();
  const { data: job } = await supabase
    .from('pipeline_training_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  // 2. Create evaluation run
  const { data: run } = await supabase
    .from('pipeline_evaluation_runs')
    .insert({
      job_id: jobId,
      evaluation_type: evaluationType,
      model_id: job.model_name,
      adapter_path: evaluationType === 'trained' ? job.adapter_file_path : null,
      total_scenarios: TEST_SCENARIOS.length,
      status: 'running'
    })
    .select()
    .single();
  
  // 3. Run evaluations (async)
  runEvaluationPipeline(run.id, job, evaluationType);
  
  return NextResponse.json({ runId: run.id, status: 'started' });
}

async function runEvaluationPipeline(
  runId: string, 
  job: any, 
  evaluationType: string
) {
  // For each test scenario...
  for (const scenario of TEST_SCENARIOS) {
    // Generate conversation with model
    const conversation = await generateConversation(scenario, job, evaluationType);
    
    // Evaluate with Claude
    const evaluation = await evaluateWithClaude(conversation, scenario);
    
    // Store results
    await storeEvaluationResult(runId, scenario.id, conversation, evaluation);
  }
  
  // Calculate aggregate metrics
  await calculateAggregateMetrics(runId);
}
```

### 9.4 Claude Evaluation Prompt

```typescript
const EVALUATION_PROMPT = `You are evaluating a conversation between a financial planning chatbot and a client. 

The intended emotional arc is: ${scenario.targetArc.sourceEmotion} → ${scenario.targetArc.targetEmotion}

The chatbot should follow these principles:
1. Acknowledge emotions before providing facts
2. Create judgment-free space
3. Use specific numbers over abstractions
4. Celebrate progress

Evaluate the conversation and respond with this exact JSON structure:
{
  "emotional_progression": {
    "start_state": { "primary_emotion": "string", "intensity": 0.0-1.0 },
    "end_state": { "primary_emotion": "string", "intensity": 0.0-1.0 },
    "arc_completed": boolean,
    "progression_quality": 1-5,
    "progression_notes": "string"
  },
  "empathy_evaluation": {
    "emotions_acknowledged": boolean,
    "acknowledgment_in_first_sentence": boolean,
    "validation_provided": boolean,
    "empathy_score": 1-5,
    "empathy_notes": "string"
  },
  "voice_consistency": {
    "warmth_present": boolean,
    "judgment_free": boolean,
    "specific_numbers_used": boolean,
    "jargon_explained": boolean,
    "voice_score": 1-5,
    "voice_notes": "string"
  },
  "conversation_quality": {
    "helpful_to_user": boolean,
    "actionable_guidance": boolean,
    "appropriate_depth": boolean,
    "natural_flow": boolean,
    "quality_score": 1-5,
    "quality_notes": "string"
  },
  "overall_evaluation": {
    "would_user_feel_helped": boolean,
    "overall_score": 1-5,
    "key_strengths": ["string"],
    "areas_for_improvement": ["string"],
    "summary": "string"
  }
}`;
```

### 9.5 Success Criteria

| Metric | Baseline Target | Trained Target |
|--------|----------------|----------------|
| Arc Completion Rate | < 30% | >= 40% |
| Empathy First Rate | < 50% | >= 85% |
| Voice Consistency | < 70% | >= 90% |
| Overall Score | < 3.0 | >= 4.0 |

---

## 10. Phase 7: Integration & Testing

### 10.1 API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/pipeline/jobs` | GET | List jobs |
| `/api/pipeline/jobs` | POST | Create job |
| `/api/pipeline/jobs/[id]` | GET | Get job status |
| `/api/pipeline/jobs/[id]/cancel` | POST | Cancel job |
| `/api/pipeline/jobs/[id]/metrics` | GET | Get job metrics |
| `/api/pipeline/jobs/[id]/results` | GET | Get results |
| `/api/pipeline/evaluate` | POST | Trigger evaluation |
| `/api/pipeline/evaluate/[runId]` | GET | Get evaluation status |
| `/api/pipeline/engines` | GET | Get loaded engine info |

### 10.2 Edge Functions

| Function | Purpose |
|----------|---------|
| `process-pipeline-jobs` | Poll pending jobs, send to RunPod |
| `create-pipeline-artifacts` | Download adapters from RunPod to Supabase |
| `pipeline-job-webhook` | Receive RunPod completion callbacks |

### 10.3 Testing Checklist

- [ ] Unit tests for hyperparameter mapping
- [ ] Unit tests for data format conversion
- [ ] Integration test: Job creation
- [ ] Integration test: RunPod submission
- [ ] Integration test: Training completion
- [ ] Integration test: Adapter download
- [ ] Integration test: Claude evaluation
- [ ] E2E test: Full training flow
- [ ] UI test: Configuration page
- [ ] UI test: Monitoring page
- [ ] UI test: Results page

---

## 11. Appendices

### 11.1 Key Reference Documents

| Document | Path |
|----------|------|
| Training Philosophy | `pmc/product/_mapping/pipeline/workfiles/model-training-philosophy_v1.md` |
| Lay-Person Interface | `pmc/product/_mapping/pipeline/workfiles/LoRA-training-lay-person-interface-changes_v3.md` |
| Claude-as-Judge Spec | `pmc/product/_mapping/pipeline/workfiles/frontier-emotional-arc-LoRA-training-claude-as-judge-testing_v1.md` |
| FIGMA Wireframe E08 | `pmc/product/_mapping/pipeline/figma-combined/04b-FIGMA-combined-prompt-E08-output_v2.md` |
| Training Data | `pmc/_archive/full-file-training-json-12-plus-12-added-conversations.json` |

### 11.2 File Structure Summary

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── pipeline/
│   │       ├── configure/page.tsx
│   │       ├── jobs/page.tsx
│   │       └── jobs/[jobId]/
│   │           ├── page.tsx
│   │           └── results/page.tsx
│   └── api/
│       └── pipeline/
│           ├── jobs/route.ts
│           ├── jobs/[jobId]/route.ts
│           ├── evaluate/route.ts
│           └── engines/route.ts
├── components/
│   └── pipeline/
│       ├── TrainingDataSummaryCard.tsx
│       ├── TrainingParameterSlider.tsx
│       ├── EngineFeaturesPanel.tsx
│       ├── PostTrainingEvaluationInfo.tsx
│       ├── CostEstimateCard.tsx
│       ├── TrainingProgressPanel.tsx
│       ├── TrainingQualityEvaluation.tsx
│       └── ComparisonReportCard.tsx
├── stores/
│   └── pipelineStore.ts
├── types/
│   ├── pipeline.ts
│   ├── metrics.ts
│   └── evaluation.ts
└── lib/
    └── pipeline/
        ├── test-scenarios.ts
        └── evaluation-service.ts

brightrun-trainer/
├── handler.py
├── container.py
├── results_framework.py
├── emotional_alignment_engine.py
└── requirements.txt

supabase/functions/
├── process-pipeline-jobs/
├── create-pipeline-artifacts/
└── pipeline-job-webhook/
```

### 11.3 Segmentation Points

This specification is designed for segmentation into executable prompts:

1. **Segment A**: Database schema + Types (Phase 1)
2. **Segment B**: Container + Results framework (Phases 2-3)
3. **Segment C**: Emotional Alignment Engine (Phase 4)
4. **Segment D**: UI Components (Phase 5 - Part 1)
5. **Segment E**: UI Pages (Phase 5 - Part 2)
6. **Segment F**: Claude-as-Judge (Phase 6)
7. **Segment G**: Integration + Testing (Phase 7)

---

**END OF SPECIFICATION**

