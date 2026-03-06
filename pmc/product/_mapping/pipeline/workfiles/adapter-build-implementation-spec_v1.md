# Adapter Application Module: Complete Implementation Specification

**Version:** 1.0
**Date:** January 16, 2026
**Document Type:** Definitive Implementation Reference
**Audience:** Coding agents executing implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [TypeScript Types](#5-typescript-types)
6. [Service Layer](#6-service-layer)
7. [API Routes](#7-api-routes)
8. [React Query Hooks](#8-react-query-hooks)
9. [UI Components](#9-ui-components)
10. [Page Implementations](#10-page-implementations)
11. [Integration Points](#11-integration-points)
12. [Implementation Phases](#12-implementation-phases)
13. [Testing Strategy](#13-testing-strategy)
14. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 What This Document Delivers

This specification provides **complete, copy-paste-ready implementation details** for building the Adapter Application module - a system that enables users to:

1. **Deploy trained LoRA adapters** to inference endpoints with one click
2. **Conduct A/B testing** comparing Control (base model) vs Adapted (base + LoRA) responses
3. **Record and analyze test results** with Claude-as-Judge automated evaluation

### 1.2 Key Architectural Decisions (Already Made)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inference approach | RunPod Serverless | Pay-per-use, OpenAI-compatible API, auto-scaling |
| Endpoint architecture | Two endpoints (Control + Adapted) | Clean separation, accurate comparison |
| Docker image | `runpod/worker-vllm:latest` | No custom build needed, maintained by RunPod |
| Thinking model | DeepSeek-R1-Distill-Qwen-32B | 32B params, MIT license, strong reasoning |
| Storage | Existing Supabase Storage | Adapters already at `lora-models/adapters/{job_id}.tar.gz` |

### 1.3 Existing Assets

The following are already implemented and working:
- Training jobs run successfully on RunPod Serverless
- Adapters stored in Supabase Storage at `lora-models/adapters/{job_id}.tar.gz`
- Job results page at `/pipeline/jobs/[jobId]/results`
- Adapter download route at `/api/pipeline/jobs/[jobId]/download`
- Evaluation infrastructure scaffolding at `/api/pipeline/evaluate`
- Claude-as-Judge evaluation prompt structure

---

## 2. Current State Analysis

### 2.1 Existing Codebase Structure

```
src/
├── types/
│   ├── pipeline.ts              # Job types, status enums (extend this)
│   ├── pipeline-metrics.ts      # Training metrics
│   └── pipeline-evaluation.ts   # Evaluation types (extend this)
├── lib/
│   ├── services/
│   │   ├── pipeline-service.ts  # Job CRUD operations (use as pattern)
│   │   └── index.ts             # Service exports
│   ├── supabase-server.ts       # Server Supabase client
│   └── pipeline/
│       ├── hyperparameter-utils.ts
│       └── evaluation-service.ts # Existing evaluation scaffolding
├── hooks/
│   ├── usePipelineJobs.ts       # Job hooks (extend with test hooks)
│   └── ...
├── components/
│   └── pipeline/
│       ├── TrainingQualityEvaluation.tsx  # Evaluation display
│       └── ...
└── app/
    ├── api/
    │   └── pipeline/
    │       ├── jobs/[jobId]/route.ts      # Job detail
    │       ├── jobs/[jobId]/download/route.ts  # Adapter download
    │       └── evaluate/route.ts          # Existing eval route
    └── (dashboard)/
        └── pipeline/
            └── jobs/[jobId]/results/page.tsx  # Results page (add test button)
```

### 2.2 Database Tables That Already Exist

```sql
-- These tables are already created and functional
pipeline_training_jobs        -- Training job records
pipeline_training_metrics     -- Real-time training metrics
pipeline_evaluation_runs      -- Evaluation run records
pipeline_evaluation_results   -- Per-scenario evaluation results
datasets                      -- Training dataset metadata
```

### 2.3 Adapter Storage Location

Trained adapters are stored in Supabase Storage:
- **Bucket:** `lora-models`
- **Path pattern:** `adapters/{job_id}.tar.gz`
- **Contents:** `adapter_model.safetensors`, `adapter_config.json`, tokenizer files

Access in code:
```typescript
const adapterPath = job.adapterFilePath; // e.g., "adapters/abc123-def456.tar.gz"
const fullUrl = supabase.storage.from('lora-models').getPublicUrl(adapterPath);
```

---

## 3. Architecture Overview

### 3.1 System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ADAPTER APPLICATION FLOW                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. TRAINING COMPLETE                                                         │
│     └─> Adapter stored in Supabase Storage                                   │
│         └─> adapterFilePath = "adapters/{job_id}.tar.gz"                     │
│                                                                               │
│  2. USER CLICKS "Test Adapter" ON RESULTS PAGE                               │
│     └─> POST /api/pipeline/jobs/{jobId}/deploy                               │
│         ├─> Creates/retrieves inference endpoints (Control + Adapted)        │
│         └─> Returns endpoint IDs                                             │
│                                                                               │
│  3. ENDPOINT DEPLOYMENT (Background)                                          │
│     ├─> Control: Base model only (Mistral-7B-Instruct)                       │
│     └─> Adapted: Base model + LoRA from Supabase                             │
│                                                                               │
│  4. A/B TESTING UI                                                            │
│     └─> User enters prompt on /pipeline/jobs/{jobId}/test                    │
│         └─> POST /api/pipeline/jobs/{jobId}/test                             │
│             ├─> Parallel calls to Control & Adapted endpoints                 │
│             ├─> Claude-as-Judge evaluation (optional)                         │
│             └─> Store results in pipeline_test_results                       │
│                                                                               │
│  5. RESULTS DISPLAY                                                           │
│     └─> Side-by-side comparison                                              │
│     └─> User rating (optional)                                               │
│     └─> History of all tests for this adapter                                │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Hierarchy

```
/pipeline/jobs/[jobId]/results (existing)
├── TrainingSummaryCard (existing)
├── ModelFilesCard (existing)
├── TrainingQualityEvaluation (existing)
├── DeployAdapterButton (NEW) ──────────────┐
│   └─> Opens test page when ready          │
└──────────────────────────────────────────────┘

/pipeline/jobs/[jobId]/test (NEW)
├── EndpointStatusBanner (NEW)
│   └─> Shows deployment status for both endpoints
├── ABTestingPanel (NEW)
│   ├─> TestPromptInput
│   ├─> TestResultComparison
│   │   ├─> ControlResponse
│   │   └─> AdaptedResponse
│   └─> UserRatingButtons
└── TestHistoryTable (NEW)
    └─> Previous tests for this adapter
```

---

## 4. Database Schema

### 4.1 New Tables

Execute these SQL statements in Supabase SQL Editor:

```sql
-- ============================================
-- Table: pipeline_inference_endpoints
-- Purpose: Track deployed inference endpoints
-- ============================================
CREATE TABLE pipeline_inference_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Endpoint identity
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('control', 'adapted')),
  runpod_endpoint_id TEXT,              -- RunPod's endpoint identifier

  -- Model configuration
  base_model TEXT NOT NULL,             -- e.g., "mistralai/Mistral-7B-Instruct-v0.2"
  adapter_path TEXT,                    -- Supabase storage path (adapted only)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'deploying', 'ready', 'failed', 'terminated')),
  health_check_url TEXT,
  last_health_check TIMESTAMPTZ,

  -- Cost tracking
  idle_timeout_seconds INTEGER DEFAULT 300,  -- 5 minutes default
  estimated_cost_per_hour NUMERIC(10,4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Unique constraint: one endpoint per type per job
  UNIQUE(job_id, endpoint_type)
);

-- Indexes
CREATE INDEX idx_endpoints_job_id ON pipeline_inference_endpoints(job_id);
CREATE INDEX idx_endpoints_user_id ON pipeline_inference_endpoints(user_id);
CREATE INDEX idx_endpoints_status ON pipeline_inference_endpoints(status);

-- RLS Policies
ALTER TABLE pipeline_inference_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own endpoints"
  ON pipeline_inference_endpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own endpoints"
  ON pipeline_inference_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own endpoints"
  ON pipeline_inference_endpoints FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_test_results
-- Purpose: Store A/B test results with evaluations
-- ============================================
CREATE TABLE pipeline_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Test input
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,

  -- Responses
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,

  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,

  -- Claude-as-Judge evaluation (optional)
  evaluation_enabled BOOLEAN DEFAULT FALSE,
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,

  -- User rating
  user_rating TEXT CHECK (user_rating IN ('control', 'adapted', 'tie', 'neither')),
  user_notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'evaluating', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_test_results_job_id ON pipeline_test_results(job_id);
CREATE INDEX idx_test_results_user_id ON pipeline_test_results(user_id);
CREATE INDEX idx_test_results_created_at ON pipeline_test_results(created_at DESC);

-- RLS Policies
ALTER TABLE pipeline_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test results"
  ON pipeline_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON pipeline_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON pipeline_test_results FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_base_models
-- Purpose: Registry of supported base models
-- ============================================
CREATE TABLE pipeline_base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identity
  model_id TEXT NOT NULL UNIQUE,        -- HuggingFace model ID
  display_name TEXT NOT NULL,           -- User-friendly name

  -- Specifications
  parameter_count TEXT,                 -- e.g., "7B", "32B"
  context_length INTEGER,               -- Max tokens
  license TEXT,                         -- e.g., "Apache 2.0", "MIT"

  -- RunPod configuration
  docker_image TEXT NOT NULL DEFAULT 'runpod/worker-vllm:stable-cuda12.1.0',
  min_gpu_memory_gb INTEGER NOT NULL,
  recommended_gpu_type TEXT,            -- e.g., "NVIDIA A40"

  -- Capabilities
  supports_lora BOOLEAN DEFAULT TRUE,
  supports_quantization BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for base models
INSERT INTO pipeline_base_models (model_id, display_name, parameter_count, context_length, license, min_gpu_memory_gb, recommended_gpu_type)
VALUES
  ('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', '7B', 32768, 'Apache 2.0', 24, 'NVIDIA A40'),
  ('deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'DeepSeek R1 Distill Qwen 32B', '32B', 131072, 'MIT', 48, 'NVIDIA A100'),
  ('meta-llama/Meta-Llama-3-8B-Instruct', 'Llama 3 8B Instruct', '8B', 8192, 'Llama 3', 24, 'NVIDIA A40'),
  ('meta-llama/Meta-Llama-3-70B-Instruct', 'Llama 3 70B Instruct', '70B', 8192, 'Llama 3', 80, 'NVIDIA H100');
```

### 4.2 Type Mappings (Database → TypeScript)

The database uses `snake_case`, TypeScript uses `camelCase`. Create mapping functions:

```typescript
// Database row → TypeScript object
function mapDbRowToEndpoint(row: any): InferenceEndpoint { ... }
function mapDbRowToTestResult(row: any): TestResult { ... }
```

---

## 5. TypeScript Types

### 5.1 New Type Definitions

Create new file: `src/types/pipeline-adapter.ts`

```typescript
/**
 * Pipeline Adapter Testing Types
 *
 * Types for the adapter deployment and A/B testing system
 */

// ============================================
// Inference Endpoint Types
// ============================================

export type EndpointType = 'control' | 'adapted';

export type EndpointStatus =
  | 'pending'
  | 'deploying'
  | 'ready'
  | 'failed'
  | 'terminated';

export interface InferenceEndpoint {
  id: string;
  jobId: string;
  userId: string;

  // Endpoint identity
  endpointType: EndpointType;
  runpodEndpointId: string | null;

  // Model configuration
  baseModel: string;
  adapterPath: string | null;

  // Status
  status: EndpointStatus;
  healthCheckUrl: string | null;
  lastHealthCheck: string | null;

  // Cost tracking
  idleTimeoutSeconds: number;
  estimatedCostPerHour: number | null;

  // Timestamps
  createdAt: string;
  readyAt: string | null;
  terminatedAt: string | null;
  updatedAt: string;

  // Error handling
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
}

// ============================================
// Test Result Types
// ============================================

export type TestResultStatus =
  | 'pending'
  | 'generating'
  | 'evaluating'
  | 'completed'
  | 'failed';

export type UserRating = 'control' | 'adapted' | 'tie' | 'neither';

export interface TestResult {
  id: string;
  jobId: string;
  userId: string;

  // Test input
  systemPrompt: string | null;
  userPrompt: string;

  // Responses
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;

  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;

  // Evaluation
  evaluationEnabled: boolean;
  controlEvaluation: ClaudeEvaluation | null;
  adaptedEvaluation: ClaudeEvaluation | null;
  evaluationComparison: EvaluationComparison | null;

  // User rating
  userRating: UserRating | null;
  userNotes: string | null;

  // Status
  status: TestResultStatus;

  // Timestamps
  createdAt: string;
  completedAt: string | null;

  // Error handling
  errorMessage: string | null;
}

// ============================================
// Claude-as-Judge Evaluation Types
// ============================================

export interface EmotionalState {
  primaryEmotion: string;
  intensity: number;  // 0.0 - 1.0
}

export interface ClaudeEvaluation {
  emotionalProgression: {
    startState: EmotionalState;
    endState: EmotionalState;
    arcCompleted: boolean;
    progressionQuality: number;  // 1-5
    progressionNotes: string;
  };

  empathyEvaluation: {
    emotionsAcknowledged: boolean;
    acknowledgmentInFirstSentence: boolean;
    validationProvided: boolean;
    empathyScore: number;  // 1-5
    empathyNotes: string;
  };

  voiceConsistency: {
    warmthPresent: boolean;
    judgmentFree: boolean;
    specificNumbersUsed: boolean;
    jargonExplained: boolean;
    voiceScore: number;  // 1-5
    voiceNotes: string;
  };

  conversationQuality: {
    helpfulToUser: boolean;
    actionableGuidance: boolean;
    appropriateDepth: boolean;
    naturalFlow: boolean;
    qualityScore: number;  // 1-5
    qualityNotes: string;
  };

  overallEvaluation: {
    wouldUserFeelHelped: boolean;
    overallScore: number;  // 1-5
    keyStrengths: string[];
    areasForImprovement: string[];
    summary: string;
  };
}

export interface EvaluationComparison {
  winner: 'control' | 'adapted' | 'tie';
  controlOverallScore: number;
  adaptedOverallScore: number;
  scoreDifference: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}

// ============================================
// Base Model Types
// ============================================

export interface BaseModel {
  id: string;
  modelId: string;
  displayName: string;
  parameterCount: string;
  contextLength: number;
  license: string;
  dockerImage: string;
  minGpuMemoryGb: number;
  recommendedGpuType: string;
  supportsLora: boolean;
  supportsQuantization: boolean;
  isActive: boolean;
}

// ============================================
// API Request/Response Types
// ============================================

export interface DeployAdapterRequest {
  jobId: string;
  forceRedeploy?: boolean;
}

export interface DeployAdapterResponse {
  success: boolean;
  data?: {
    controlEndpoint: InferenceEndpoint;
    adaptedEndpoint: InferenceEndpoint;
  };
  error?: string;
}

export interface RunTestRequest {
  jobId: string;
  userPrompt: string;
  systemPrompt?: string;
  enableEvaluation?: boolean;
}

export interface RunTestResponse {
  success: boolean;
  data?: TestResult;
  error?: string;
}

export interface TestResultListResponse {
  success: boolean;
  data?: TestResult[];
  count?: number;
  error?: string;
}

export interface EndpointStatusResponse {
  success: boolean;
  data?: {
    controlEndpoint: InferenceEndpoint | null;
    adaptedEndpoint: InferenceEndpoint | null;
    bothReady: boolean;
  };
  error?: string;
}

export interface RateTestRequest {
  testId: string;
  rating: UserRating;
  notes?: string;
}
```

### 5.2 Extend Existing Types

Add to `src/types/pipeline.ts`:

```typescript
// Add to PipelineTrainingJob interface
export interface PipelineTrainingJob {
  // ... existing fields ...

  // New fields for adapter testing
  testEndpointsDeployed: boolean;
  testCount: number;
}
```

---

## 6. Service Layer

### 6.1 Inference Service

Create new file: `src/lib/services/inference-service.ts`

```typescript
/**
 * Inference Service
 *
 * Manages RunPod serverless inference endpoints for adapter testing
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  InferenceEndpoint,
  EndpointStatus,
  DeployAdapterResponse,
  EndpointStatusResponse
} from '@/types/pipeline-adapter';

// ============================================
// Constants
// ============================================

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;
const RUNPOD_API_URL = 'https://api.runpod.io/graphql';

const DEFAULT_ENDPOINT_CONFIG = {
  dockerImage: 'runpod/worker-vllm:stable-cuda12.1.0',
  idleTimeout: 300,  // 5 minutes
  maxWorkers: 1,
  gpuType: 'NVIDIA A40',
};

// ============================================
// Database Mapping
// ============================================

function mapDbRowToEndpoint(row: any): InferenceEndpoint {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    endpointType: row.endpoint_type,
    runpodEndpointId: row.runpod_endpoint_id,
    baseModel: row.base_model,
    adapterPath: row.adapter_path,
    status: row.status as EndpointStatus,
    healthCheckUrl: row.health_check_url,
    lastHealthCheck: row.last_health_check,
    idleTimeoutSeconds: row.idle_timeout_seconds,
    estimatedCostPerHour: row.estimated_cost_per_hour,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    terminatedAt: row.terminated_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
  };
}

// ============================================
// RunPod API Helpers
// ============================================

async function callRunPodGraphQL(query: string, variables: Record<string, any> = {}) {
  const response = await fetch(RUNPOD_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`RunPod GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function createRunPodEndpoint(config: {
  name: string;
  baseModel: string;
  adapterPath?: string;
}): Promise<string> {
  // Build environment variables for vLLM
  const envVars: Record<string, string> = {
    MODEL_NAME: config.baseModel,
    VLLM_ALLOW_RUNTIME_LORA_UPDATING: 'true',
  };

  if (config.adapterPath) {
    // Generate signed URL for adapter download
    const supabase = await createServerSupabaseClient();
    const { data: signedUrl } = await supabase.storage
      .from('lora-models')
      .createSignedUrl(config.adapterPath, 3600);  // 1 hour

    envVars.LORA_ADAPTER_URL = signedUrl?.signedUrl || '';
    envVars.LORA_ADAPTER_NAME = 'emotional-arc-adapter';
  }

  const mutation = `
    mutation CreateEndpoint($input: EndpointInput!) {
      createEndpoint(input: $input) {
        id
        name
        status
      }
    }
  `;

  const variables = {
    input: {
      name: config.name,
      templateId: 'vllm-serverless',  // RunPod's vLLM template
      gpuTypeId: DEFAULT_ENDPOINT_CONFIG.gpuType,
      workersMax: DEFAULT_ENDPOINT_CONFIG.maxWorkers,
      idleTimeout: DEFAULT_ENDPOINT_CONFIG.idleTimeout,
      env: Object.entries(envVars).map(([key, value]) => ({ key, value })),
    },
  };

  const result = await callRunPodGraphQL(mutation, variables);
  return result.createEndpoint.id;
}

async function getRunPodEndpointStatus(endpointId: string): Promise<{
  status: string;
  healthUrl: string;
}> {
  const query = `
    query GetEndpoint($id: String!) {
      endpoint(input: { id: $id }) {
        id
        status
        templateId
        workersRunning
      }
    }
  `;

  const result = await callRunPodGraphQL(query, { id: endpointId });

  return {
    status: result.endpoint.status,
    healthUrl: `https://api.runpod.ai/v2/${endpointId}/health`,
  };
}

// ============================================
// Core Service Functions
// ============================================

export async function deployAdapterEndpoints(
  userId: string,
  jobId: string
): Promise<DeployAdapterResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (job.status !== 'completed' || !job.adapter_file_path) {
      return { success: false, error: 'Job must be completed with adapter' };
    }

    // Check for existing endpoints
    const { data: existingEndpoints } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', jobId);

    const existingControl = existingEndpoints?.find(e => e.endpoint_type === 'control');
    const existingAdapted = existingEndpoints?.find(e => e.endpoint_type === 'adapted');

    // Deploy Control endpoint if needed
    let controlEndpoint: InferenceEndpoint;
    if (existingControl && existingControl.status !== 'failed') {
      controlEndpoint = mapDbRowToEndpoint(existingControl);
    } else {
      // Get base model from adapter config (stored when training completed)
      const baseModel = 'mistralai/Mistral-7B-Instruct-v0.2';  // From adapter_config.json

      const runpodId = await createRunPodEndpoint({
        name: `control-${jobId.slice(0, 8)}`,
        baseModel,
      });

      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'control',
          runpod_endpoint_id: runpodId,
          base_model: baseModel,
          status: 'deploying',
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: `Failed to create control endpoint: ${insertError.message}` };
      }

      controlEndpoint = mapDbRowToEndpoint(newEndpoint);
    }

    // Deploy Adapted endpoint if needed
    let adaptedEndpoint: InferenceEndpoint;
    if (existingAdapted && existingAdapted.status !== 'failed') {
      adaptedEndpoint = mapDbRowToEndpoint(existingAdapted);
    } else {
      const baseModel = 'mistralai/Mistral-7B-Instruct-v0.2';

      const runpodId = await createRunPodEndpoint({
        name: `adapted-${jobId.slice(0, 8)}`,
        baseModel,
        adapterPath: job.adapter_file_path,
      });

      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'adapted',
          runpod_endpoint_id: runpodId,
          base_model: baseModel,
          adapter_path: job.adapter_file_path,
          status: 'deploying',
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: `Failed to create adapted endpoint: ${insertError.message}` };
      }

      adaptedEndpoint = mapDbRowToEndpoint(newEndpoint);
    }

    return {
      success: true,
      data: { controlEndpoint, adaptedEndpoint },
    };
  } catch (error) {
    console.error('Deploy adapter endpoints error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deployment failed'
    };
  }
}

export async function getEndpointStatus(
  jobId: string
): Promise<EndpointStatusResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: endpoints, error } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    const controlEndpoint = endpoints?.find(e => e.endpoint_type === 'control');
    const adaptedEndpoint = endpoints?.find(e => e.endpoint_type === 'adapted');

    // Poll RunPod for actual status if deploying
    if (controlEndpoint?.status === 'deploying' && controlEndpoint.runpod_endpoint_id) {
      try {
        const status = await getRunPodEndpointStatus(controlEndpoint.runpod_endpoint_id);
        if (status.status === 'READY') {
          await supabase
            .from('pipeline_inference_endpoints')
            .update({
              status: 'ready',
              health_check_url: status.healthUrl,
              ready_at: new Date().toISOString(),
            })
            .eq('id', controlEndpoint.id);
          controlEndpoint.status = 'ready';
        }
      } catch (e) {
        console.error('Failed to check control endpoint status:', e);
      }
    }

    if (adaptedEndpoint?.status === 'deploying' && adaptedEndpoint.runpod_endpoint_id) {
      try {
        const status = await getRunPodEndpointStatus(adaptedEndpoint.runpod_endpoint_id);
        if (status.status === 'READY') {
          await supabase
            .from('pipeline_inference_endpoints')
            .update({
              status: 'ready',
              health_check_url: status.healthUrl,
              ready_at: new Date().toISOString(),
            })
            .eq('id', adaptedEndpoint.id);
          adaptedEndpoint.status = 'ready';
        }
      } catch (e) {
        console.error('Failed to check adapted endpoint status:', e);
      }
    }

    const bothReady =
      controlEndpoint?.status === 'ready' &&
      adaptedEndpoint?.status === 'ready';

    return {
      success: true,
      data: {
        controlEndpoint: controlEndpoint ? mapDbRowToEndpoint(controlEndpoint) : null,
        adaptedEndpoint: adaptedEndpoint ? mapDbRowToEndpoint(adaptedEndpoint) : null,
        bothReady,
      },
    };
  } catch (error) {
    console.error('Get endpoint status error:', error);
    return { success: false, error: 'Failed to get status' };
  }
}

export async function callInferenceEndpoint(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false
): Promise<{
  response: string;
  generationTimeMs: number;
  tokensUsed: number;
}> {
  const startTime = Date.now();

  // Build OpenAI-compatible request
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, any> = {
    input: {
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    },
  };

  // Add adapter specification for adapted endpoint
  if (useAdapter) {
    body.input.lora_adapter = 'emotional-arc-adapter';
  }

  const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Inference failed: ${response.status}`);
  }

  const result = await response.json();
  const generationTimeMs = Date.now() - startTime;

  return {
    response: result.output?.choices?.[0]?.message?.content || '',
    generationTimeMs,
    tokensUsed: result.output?.usage?.total_tokens || 0,
  };
}
```

### 6.2 Test Service

Create new file: `src/lib/services/test-service.ts`

```typescript
/**
 * Test Service
 *
 * Manages A/B testing and Claude-as-Judge evaluation
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import {
  TestResult,
  TestResultStatus,
  RunTestRequest,
  RunTestResponse,
  ClaudeEvaluation,
  EvaluationComparison,
  UserRating,
} from '@/types/pipeline-adapter';
import { callInferenceEndpoint, getEndpointStatus } from './inference-service';

// ============================================
// Constants
// ============================================

const anthropic = new Anthropic();

const EVALUATION_PROMPT = `You are an expert evaluator assessing the quality of a financial advisor conversation. Analyze the following response and provide structured evaluation.

USER'S QUESTION:
{user_prompt}

SYSTEM CONTEXT:
{system_prompt}

ADVISOR'S RESPONSE:
{response}

Evaluate the response on these dimensions and respond in JSON format:

{
  "emotionalProgression": {
    "startState": { "primaryEmotion": "<detected starting emotion>", "intensity": <0.0-1.0> },
    "endState": { "primaryEmotion": "<detected ending emotion>", "intensity": <0.0-1.0> },
    "arcCompleted": <true/false>,
    "progressionQuality": <1-5>,
    "progressionNotes": "<brief explanation>"
  },
  "empathyEvaluation": {
    "emotionsAcknowledged": <true/false>,
    "acknowledgmentInFirstSentence": <true/false>,
    "validationProvided": <true/false>,
    "empathyScore": <1-5>,
    "empathyNotes": "<brief explanation>"
  },
  "voiceConsistency": {
    "warmthPresent": <true/false>,
    "judgmentFree": <true/false>,
    "specificNumbersUsed": <true/false>,
    "jargonExplained": <true/false>,
    "voiceScore": <1-5>,
    "voiceNotes": "<brief explanation>"
  },
  "conversationQuality": {
    "helpfulToUser": <true/false>,
    "actionableGuidance": <true/false>,
    "appropriateDepth": <true/false>,
    "naturalFlow": <true/false>,
    "qualityScore": <1-5>,
    "qualityNotes": "<brief explanation>"
  },
  "overallEvaluation": {
    "wouldUserFeelHelped": <true/false>,
    "overallScore": <1-5>,
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}

Respond ONLY with valid JSON, no other text.`;

// ============================================
// Database Mapping
// ============================================

function mapDbRowToTestResult(row: any): TestResult {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    systemPrompt: row.system_prompt,
    userPrompt: row.user_prompt,
    controlResponse: row.control_response,
    controlGenerationTimeMs: row.control_generation_time_ms,
    controlTokensUsed: row.control_tokens_used,
    adaptedResponse: row.adapted_response,
    adaptedGenerationTimeMs: row.adapted_generation_time_ms,
    adaptedTokensUsed: row.adapted_tokens_used,
    evaluationEnabled: row.evaluation_enabled,
    controlEvaluation: row.control_evaluation,
    adaptedEvaluation: row.adapted_evaluation,
    evaluationComparison: row.evaluation_comparison,
    userRating: row.user_rating,
    userNotes: row.user_notes,
    status: row.status as TestResultStatus,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

// ============================================
// Claude-as-Judge Functions
// ============================================

async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string
): Promise<ClaudeEvaluation> {
  const prompt = EVALUATION_PROMPT
    .replace('{user_prompt}', userPrompt)
    .replace('{system_prompt}', systemPrompt || 'General financial planning advice')
    .replace('{response}', response);

  const claudeResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = claudeResponse.content[0].type === 'text'
    ? claudeResponse.content[0].text
    : '';

  return JSON.parse(responseText) as ClaudeEvaluation;
}

function compareEvaluations(
  controlEval: ClaudeEvaluation,
  adaptedEval: ClaudeEvaluation
): EvaluationComparison {
  const controlScore = controlEval.overallEvaluation.overallScore;
  const adaptedScore = adaptedEval.overallEvaluation.overallScore;
  const scoreDiff = adaptedScore - controlScore;

  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';

  // Identify improvements
  const improvements: string[] = [];
  const regressions: string[] = [];

  if (adaptedEval.empathyEvaluation.empathyScore > controlEval.empathyEvaluation.empathyScore) {
    improvements.push('Higher empathy score');
  } else if (adaptedEval.empathyEvaluation.empathyScore < controlEval.empathyEvaluation.empathyScore) {
    regressions.push('Lower empathy score');
  }

  if (adaptedEval.voiceConsistency.voiceScore > controlEval.voiceConsistency.voiceScore) {
    improvements.push('Better voice consistency');
  } else if (adaptedEval.voiceConsistency.voiceScore < controlEval.voiceConsistency.voiceScore) {
    regressions.push('Worse voice consistency');
  }

  if (adaptedEval.conversationQuality.qualityScore > controlEval.conversationQuality.qualityScore) {
    improvements.push('Higher quality guidance');
  } else if (adaptedEval.conversationQuality.qualityScore < controlEval.conversationQuality.qualityScore) {
    regressions.push('Lower quality guidance');
  }

  if (adaptedEval.emotionalProgression.arcCompleted && !controlEval.emotionalProgression.arcCompleted) {
    improvements.push('Completed emotional arc');
  } else if (!adaptedEval.emotionalProgression.arcCompleted && controlEval.emotionalProgression.arcCompleted) {
    regressions.push('Failed to complete emotional arc');
  }

  return {
    winner,
    controlOverallScore: controlScore,
    adaptedOverallScore: adaptedScore,
    scoreDifference: scoreDiff,
    improvements,
    regressions,
    summary: `The ${winner === 'tie' ? 'responses are comparable' : winner + ' response performed better'} with a score difference of ${Math.abs(scoreDiff).toFixed(1)} points.`,
  };
}

// ============================================
// Core Service Functions
// ============================================

export async function runABTest(
  userId: string,
  request: RunTestRequest
): Promise<RunTestResponse> {
  const supabase = await createServerSupabaseClient();

  try {
    // Verify endpoints are ready
    const endpointStatus = await getEndpointStatus(request.jobId);
    if (!endpointStatus.success || !endpointStatus.data?.bothReady) {
      return { success: false, error: 'Endpoints not ready' };
    }

    const { controlEndpoint, adaptedEndpoint } = endpointStatus.data;

    // Create test record
    const { data: testRecord, error: insertError } = await supabase
      .from('pipeline_test_results')
      .insert({
        job_id: request.jobId,
        user_id: userId,
        user_prompt: request.userPrompt,
        system_prompt: request.systemPrompt || null,
        evaluation_enabled: request.enableEvaluation || false,
        status: 'generating',
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: `Failed to create test: ${insertError.message}` };
    }

    // Run parallel inference
    const [controlResult, adaptedResult] = await Promise.all([
      callInferenceEndpoint(
        controlEndpoint!.runpodEndpointId!,
        request.userPrompt,
        request.systemPrompt,
        false  // No adapter
      ),
      callInferenceEndpoint(
        adaptedEndpoint!.runpodEndpointId!,
        request.userPrompt,
        request.systemPrompt,
        true   // Use adapter
      ),
    ]);

    // Update with responses
    const updates: Record<string, any> = {
      control_response: controlResult.response,
      control_generation_time_ms: controlResult.generationTimeMs,
      control_tokens_used: controlResult.tokensUsed,
      adapted_response: adaptedResult.response,
      adapted_generation_time_ms: adaptedResult.generationTimeMs,
      adapted_tokens_used: adaptedResult.tokensUsed,
      status: request.enableEvaluation ? 'evaluating' : 'completed',
      completed_at: request.enableEvaluation ? null : new Date().toISOString(),
    };

    // Run Claude-as-Judge evaluation if requested
    if (request.enableEvaluation) {
      try {
        await supabase
          .from('pipeline_test_results')
          .update({ status: 'evaluating' })
          .eq('id', testRecord.id);

        const [controlEval, adaptedEval] = await Promise.all([
          evaluateWithClaude(request.userPrompt, request.systemPrompt || null, controlResult.response),
          evaluateWithClaude(request.userPrompt, request.systemPrompt || null, adaptedResult.response),
        ]);

        const comparison = compareEvaluations(controlEval, adaptedEval);

        updates.control_evaluation = controlEval;
        updates.adapted_evaluation = adaptedEval;
        updates.evaluation_comparison = comparison;
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } catch (evalError) {
        console.error('Evaluation failed:', evalError);
        // Continue without evaluation
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        updates.error_message = 'Evaluation failed but responses generated';
      }
    }

    const { data: finalResult, error: updateError } = await supabase
      .from('pipeline_test_results')
      .update(updates)
      .eq('id', testRecord.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: `Failed to update test: ${updateError.message}` };
    }

    return { success: true, data: mapDbRowToTestResult(finalResult) };
  } catch (error) {
    console.error('Run A/B test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}

export async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ success: boolean; data?: TestResult[]; count?: number; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('pipeline_test_results')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map(mapDbRowToTestResult),
      count: count || 0,
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch test history' };
  }
}

export async function rateTestResult(
  testId: string,
  userId: string,
  rating: UserRating,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('pipeline_test_results')
      .update({
        user_rating: rating,
        user_notes: notes || null,
      })
      .eq('id', testId)
      .eq('user_id', userId);  // Ensure ownership

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save rating' };
  }
}
```

### 6.3 Update Service Index

Add to `src/lib/services/index.ts`:

```typescript
// Existing exports...

// Adapter testing exports
export * from './inference-service';
export * from './test-service';
```

---

## 7. API Routes

### 7.1 Deploy Endpoint Route

Create: `src/app/api/pipeline/jobs/[jobId]/deploy/route.ts`

```typescript
/**
 * Deploy Adapter Endpoints API
 *
 * POST - Deploy Control and Adapted inference endpoints for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deployAdapterEndpoints } from '@/lib/services/inference-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await deployAdapterEndpoints(user.id, params.jobId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/deploy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7.2 Test Endpoint Route

Create: `src/app/api/pipeline/jobs/[jobId]/test/route.ts`

```typescript
/**
 * A/B Test API
 *
 * POST - Run an A/B test with optional evaluation
 * GET - Get test history for a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runABTest, getTestHistory } from '@/lib/services/test-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.userPrompt || typeof body.userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required' },
        { status: 400 }
      );
    }

    const result = await runABTest(user.id, {
      jobId: params.jobId,
      userPrompt: body.userPrompt,
      systemPrompt: body.systemPrompt,
      enableEvaluation: body.enableEvaluation ?? false,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/test error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getTestHistory(params.jobId, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/test error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7.3 Endpoint Status Route

Create: `src/app/api/pipeline/jobs/[jobId]/endpoints/route.ts`

```typescript
/**
 * Endpoint Status API
 *
 * GET - Get status of inference endpoints for a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getEndpointStatus } from '@/lib/services/inference-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getEndpointStatus(params.jobId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/endpoints error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7.4 Rate Test Route

Create: `src/app/api/pipeline/test/[testId]/rate/route.ts`

```typescript
/**
 * Rate Test Result API
 *
 * POST - Submit user rating for a test result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateTestResult } from '@/lib/services/test-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { rating, notes } = await request.json();

    if (!rating || !['control', 'adapted', 'tie', 'neither'].includes(rating)) {
      return NextResponse.json(
        { success: false, error: 'Valid rating required' },
        { status: 400 }
      );
    }

    const result = await rateTestResult(params.testId, user.id, rating, notes);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/pipeline/test/[testId]/rate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 8. React Query Hooks

### 8.1 Adapter Testing Hooks

Create new file: `src/hooks/useAdapterTesting.ts`

```typescript
/**
 * Adapter Testing Hooks
 *
 * React Query hooks for adapter deployment and A/B testing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestResponse,
  TestResultListResponse,
  TestResult,
  UserRating,
} from '@/types/pipeline-adapter';
import { pipelineKeys } from './usePipelineJobs';

// ============================================
// Query Keys
// ============================================

export const adapterTestingKeys = {
  all: ['adapter-testing'] as const,
  endpoints: (jobId: string) => [...adapterTestingKeys.all, 'endpoints', jobId] as const,
  tests: (jobId: string) => [...adapterTestingKeys.all, 'tests', jobId] as const,
  testList: (jobId: string, filters?: { limit?: number }) =>
    [...adapterTestingKeys.tests(jobId), 'list', filters] as const,
};

// ============================================
// API Functions
// ============================================

async function deployAdapter(jobId: string): Promise<DeployAdapterResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/deploy`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deploy adapter');
  }
  return response.json();
}

async function getEndpointStatus(jobId: string): Promise<EndpointStatusResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/endpoints`);
  if (!response.ok) throw new Error('Failed to get endpoint status');
  return response.json();
}

async function runTest(params: {
  jobId: string;
  userPrompt: string;
  systemPrompt?: string;
  enableEvaluation?: boolean;
}): Promise<RunTestResponse> {
  const response = await fetch(`/api/pipeline/jobs/${params.jobId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      enableEvaluation: params.enableEvaluation,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run test');
  }
  return response.json();
}

async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<TestResultListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const response = await fetch(`/api/pipeline/jobs/${jobId}/test?${params}`);
  if (!response.ok) throw new Error('Failed to get test history');
  return response.json();
}

async function rateTest(params: {
  testId: string;
  rating: UserRating;
  notes?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch(`/api/pipeline/test/${params.testId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: params.rating, notes: params.notes }),
  });
  if (!response.ok) throw new Error('Failed to submit rating');
  return response.json();
}

// ============================================
// Hooks
// ============================================

export function useDeployAdapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deployAdapter,
    onSuccess: (_, jobId) => {
      // Invalidate endpoint status to trigger refetch
      queryClient.invalidateQueries({ queryKey: adapterTestingKeys.endpoints(jobId) });
    },
  });
}

export function useEndpointStatus(jobId: string | null) {
  return useQuery({
    queryKey: adapterTestingKeys.endpoints(jobId || ''),
    queryFn: () => getEndpointStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll every 5s if endpoints are deploying
      const data = query.state.data;
      if (data?.data && !data.data.bothReady) {
        return 5000;
      }
      return false;
    },
  });
}

export function useRunTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runTest,
    onSuccess: (_, variables) => {
      // Invalidate test history to show new test
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.tests(variables.jobId)
      });
    },
  });
}

export function useTestHistory(
  jobId: string | null,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: adapterTestingKeys.testList(jobId || '', options),
    queryFn: () => getTestHistory(jobId!, options),
    enabled: !!jobId,
    staleTime: 30 * 1000,  // 30 seconds
  });
}

export function useRateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rateTest,
    onSuccess: () => {
      // Invalidate all test lists (we don't know which job)
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.all
      });
    },
  });
}
```

---

## 9. UI Components

### 9.1 Deploy Adapter Button

Create: `src/components/pipeline/DeployAdapterButton.tsx`

```typescript
/**
 * Deploy Adapter Button
 *
 * Button that initiates adapter deployment and shows deployment status
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeployAdapter, useEndpointStatus } from '@/hooks/useAdapterTesting';

interface DeployAdapterButtonProps {
  jobId: string;
  disabled?: boolean;
}

export function DeployAdapterButton({ jobId, disabled }: DeployAdapterButtonProps) {
  const router = useRouter();
  const { data: statusData, isLoading: isLoadingStatus } = useEndpointStatus(jobId);
  const deployMutation = useDeployAdapter();

  const endpointStatus = statusData?.data;
  const bothReady = endpointStatus?.bothReady;
  const isDeploying = endpointStatus?.controlEndpoint?.status === 'deploying' ||
                     endpointStatus?.adaptedEndpoint?.status === 'deploying';

  const handleDeploy = async () => {
    try {
      await deployMutation.mutateAsync(jobId);
    } catch (error) {
      console.error('Deploy failed:', error);
    }
  };

  const handleGoToTest = () => {
    router.push(`/pipeline/jobs/${jobId}/test`);
  };

  // If endpoints are ready, show "Go to Testing" button
  if (bothReady) {
    return (
      <Button onClick={handleGoToTest} className="gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Test Adapter
      </Button>
    );
  }

  // If deploying, show status
  if (isDeploying || deployMutation.isPending) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Deploying Endpoints...
      </Button>
    );
  }

  // If failed, show retry
  if (endpointStatus?.controlEndpoint?.status === 'failed' ||
      endpointStatus?.adaptedEndpoint?.status === 'failed') {
    return (
      <Button
        onClick={handleDeploy}
        variant="destructive"
        className="gap-2"
        disabled={disabled}
      >
        <XCircle className="h-4 w-4" />
        Retry Deployment
      </Button>
    );
  }

  // Default: show deploy button
  return (
    <Button
      onClick={handleDeploy}
      className="gap-2"
      disabled={disabled || isLoadingStatus}
    >
      <Rocket className="h-4 w-4" />
      Deploy & Test Adapter
    </Button>
  );
}
```

### 9.2 A/B Testing Panel

Create: `src/components/pipeline/ABTestingPanel.tsx`

```typescript
/**
 * A/B Testing Panel
 *
 * Main interface for running A/B tests between Control and Adapted models
 */

'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRunTest } from '@/hooks/useAdapterTesting';
import { TestResultComparison } from './TestResultComparison';
import { TestResult } from '@/types/pipeline-adapter';

interface ABTestingPanelProps {
  jobId: string;
  endpointsReady: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are Elena Morales, CFP and founder of Pathways Financial Planning. You specialize in helping people navigate complex financial decisions with warmth, empathy, and clarity. Your approach always starts by acknowledging the person's feelings before providing practical advice.`;

export function ABTestingPanel({ jobId, endpointsReady }: ABTestingPanelProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [latestResult, setLatestResult] = useState<TestResult | null>(null);

  const runTestMutation = useRunTest();

  const handleRunTest = async () => {
    if (!userPrompt.trim()) return;

    try {
      const result = await runTestMutation.mutateAsync({
        jobId,
        userPrompt: userPrompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        enableEvaluation,
      });

      if (result.data) {
        setLatestResult(result.data);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Run A/B Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!endpointsReady && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Endpoints are still deploying. Please wait for both endpoints to be ready.
              </AlertDescription>
            </Alert>
          )}

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter system prompt (defines the AI persona)..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* User Prompt */}
          <div className="space-y-2">
            <Label htmlFor="user-prompt">User Prompt</Label>
            <Textarea
              id="user-prompt"
              placeholder="Enter a user message to test... (e.g., 'I'm confused about whether I should pay off my student loans or start investing')"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-eval"
                checked={enableEvaluation}
                onCheckedChange={setEnableEvaluation}
              />
              <Label htmlFor="enable-eval">
                Enable Claude-as-Judge Evaluation
                <span className="text-muted-foreground text-xs ml-2">
                  (adds ~$0.02 per test)
                </span>
              </Label>
            </div>

            <Button
              onClick={handleRunTest}
              disabled={!endpointsReady || !userPrompt.trim() || runTestMutation.isPending}
              className="gap-2"
            >
              {runTestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {latestResult && (
        <TestResultComparison result={latestResult} />
      )}
    </div>
  );
}
```

### 9.3 Test Result Comparison

Create: `src/components/pipeline/TestResultComparison.tsx`

```typescript
/**
 * Test Result Comparison
 *
 * Side-by-side comparison of Control vs Adapted responses
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Zap, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useRateTest } from '@/hooks/useAdapterTesting';
import { TestResult, UserRating } from '@/types/pipeline-adapter';

interface TestResultComparisonProps {
  result: TestResult;
}

export function TestResultComparison({ result }: TestResultComparisonProps) {
  const [userNotes, setUserNotes] = useState('');
  const rateMutation = useRateTest();

  const handleRate = async (rating: UserRating) => {
    try {
      await rateMutation.mutateAsync({
        testId: result.id,
        rating,
        notes: userNotes || undefined,
      });
    } catch (error) {
      console.error('Rating failed:', error);
    }
  };

  const evalComparison = result.evaluationComparison;

  return (
    <div className="space-y-6">
      {/* Evaluation Summary (if available) */}
      {evalComparison && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              Claude-as-Judge Verdict
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge
                variant={evalComparison.winner === 'adapted' ? 'default' : 'secondary'}
                className="text-base px-4 py-1"
              >
                Winner: {evalComparison.winner === 'tie' ? 'Tie' :
                  evalComparison.winner === 'adapted' ? 'Adapted Model' : 'Control Model'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {evalComparison.controlOverallScore.toFixed(1)} vs {evalComparison.adaptedOverallScore.toFixed(1)}
                ({evalComparison.scoreDifference > 0 ? '+' : ''}{evalComparison.scoreDifference.toFixed(1)})
              </span>
            </div>
            <p className="mt-2 text-sm">{evalComparison.summary}</p>

            {evalComparison.improvements.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-green-600">Improvements: </span>
                <span className="text-xs text-muted-foreground">
                  {evalComparison.improvements.join(', ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Side-by-side Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Control Response */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Control (Base Model)</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.controlGenerationTimeMs}ms
                <Zap className="h-3 w-3 ml-2" />
                {result.controlTokensUsed} tokens
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm">
                {result.controlResponse || 'No response generated'}
              </p>
            </div>

            {result.controlEvaluation && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Empathy: <strong>{result.controlEvaluation.empathyEvaluation.empathyScore}/5</strong>
                  </div>
                  <div>
                    Voice: <strong>{result.controlEvaluation.voiceConsistency.voiceScore}/5</strong>
                  </div>
                  <div>
                    Quality: <strong>{result.controlEvaluation.conversationQuality.qualityScore}/5</strong>
                  </div>
                  <div>
                    Overall: <strong>{result.controlEvaluation.overallEvaluation.overallScore}/5</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adapted Response */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                Adapted (With LoRA)
                {evalComparison?.winner === 'adapted' && (
                  <Badge variant="outline" className="text-xs">Winner</Badge>
                )}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.adaptedGenerationTimeMs}ms
                <Zap className="h-3 w-3 ml-2" />
                {result.adaptedTokensUsed} tokens
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm">
                {result.adaptedResponse || 'No response generated'}
              </p>
            </div>

            {result.adaptedEvaluation && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Empathy: <strong>{result.adaptedEvaluation.empathyEvaluation.empathyScore}/5</strong>
                  </div>
                  <div>
                    Voice: <strong>{result.adaptedEvaluation.voiceConsistency.voiceScore}/5</strong>
                  </div>
                  <div>
                    Quality: <strong>{result.adaptedEvaluation.conversationQuality.qualityScore}/5</strong>
                  </div>
                  <div>
                    Overall: <strong>{result.adaptedEvaluation.overallEvaluation.overallScore}/5</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Rating */}
      {!result.userRating && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleRate('control')}
                disabled={rateMutation.isPending}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Control Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('adapted')}
                disabled={rateMutation.isPending}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Adapted Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('tie')}
                disabled={rateMutation.isPending}
              >
                Tie
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleRate('neither')}
                disabled={rateMutation.isPending}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Optional notes about your rating..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Show existing rating */}
      {result.userRating && (
        <div className="text-center text-sm text-muted-foreground">
          You rated: <Badge variant="outline">{result.userRating}</Badge>
          {result.userNotes && <span className="ml-2">"{result.userNotes}"</span>}
        </div>
      )}
    </div>
  );
}
```

### 9.4 Endpoint Status Banner

Create: `src/components/pipeline/EndpointStatusBanner.tsx`

```typescript
/**
 * Endpoint Status Banner
 *
 * Shows deployment status for Control and Adapted endpoints
 */

'use client';

import { CheckCircle2, Loader2, XCircle, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InferenceEndpoint, EndpointStatus } from '@/types/pipeline-adapter';

interface EndpointStatusBannerProps {
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
}

function StatusIcon({ status }: { status: EndpointStatus | undefined }) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'deploying':
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Server className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: EndpointStatus | undefined }) {
  const variants: Record<EndpointStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ready: 'default',
    deploying: 'secondary',
    pending: 'outline',
    failed: 'destructive',
    terminated: 'outline',
  };

  return (
    <Badge variant={variants[status || 'pending']}>
      {status || 'Unknown'}
    </Badge>
  );
}

export function EndpointStatusBanner({
  controlEndpoint,
  adaptedEndpoint
}: EndpointStatusBannerProps) {
  const bothReady = controlEndpoint?.status === 'ready' && adaptedEndpoint?.status === 'ready';
  const anyFailed = controlEndpoint?.status === 'failed' || adaptedEndpoint?.status === 'failed';

  if (bothReady) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Endpoints Ready</AlertTitle>
        <AlertDescription className="text-green-700">
          Both inference endpoints are deployed and ready for testing.
        </AlertDescription>
      </Alert>
    );
  }

  if (anyFailed) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Deployment Failed</AlertTitle>
        <AlertDescription>
          {controlEndpoint?.errorMessage || adaptedEndpoint?.errorMessage ||
           'One or more endpoints failed to deploy. Please try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertTitle>Deploying Endpoints</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StatusIcon status={controlEndpoint?.status} />
              Control Endpoint
            </span>
            <StatusBadge status={controlEndpoint?.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StatusIcon status={adaptedEndpoint?.status} />
              Adapted Endpoint
            </span>
            <StatusBadge status={adaptedEndpoint?.status} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cold start typically takes 30-60 seconds. This page will update automatically.
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

### 9.5 Test History Table

Create: `src/components/pipeline/TestHistoryTable.tsx`

```typescript
/**
 * Test History Table
 *
 * Displays previous A/B test results for an adapter
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, Trophy, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTestHistory } from '@/hooks/useAdapterTesting';
import { TestResult, UserRating } from '@/types/pipeline-adapter';

interface TestHistoryTableProps {
  jobId: string;
  onSelectTest?: (test: TestResult) => void;
}

function RatingIcon({ rating }: { rating: UserRating | null }) {
  switch (rating) {
    case 'control':
      return <ThumbsUp className="h-4 w-4 text-blue-500" />;
    case 'adapted':
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    case 'tie':
      return <Minus className="h-4 w-4 text-yellow-500" />;
    case 'neither':
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

export function TestHistoryTable({ jobId, onSelectTest }: TestHistoryTableProps) {
  const { data, isLoading } = useTestHistory(jobId, { limit: 20 });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading history...</div>;
  }

  if (!data?.data?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tests run yet. Use the panel above to run your first A/B test.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Prompt</TableHead>
          <TableHead>AI Verdict</TableHead>
          <TableHead>Your Rating</TableHead>
          <TableHead>Gen Time</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((test) => (
          <TableRow key={test.id}>
            <TableCell className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
              </div>
            </TableCell>
            <TableCell className="max-w-xs truncate">
              {test.userPrompt}
            </TableCell>
            <TableCell>
              {test.evaluationComparison ? (
                <Badge variant={
                  test.evaluationComparison.winner === 'adapted' ? 'default' :
                  test.evaluationComparison.winner === 'control' ? 'secondary' :
                  'outline'
                }>
                  <Trophy className="h-3 w-3 mr-1" />
                  {test.evaluationComparison.winner}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">No eval</span>
              )}
            </TableCell>
            <TableCell>
              <RatingIcon rating={test.userRating} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              C: {test.controlGenerationTimeMs}ms
              <br />
              A: {test.adaptedGenerationTimeMs}ms
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectTest?.(test)}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 9.6 Update Component Index

Update: `src/components/pipeline/index.ts`

```typescript
// Existing exports
export { TrainingDataSummaryCard } from './TrainingDataSummaryCard';
export { TrainingParameterSlider } from './TrainingParameterSlider';
export { EngineFeaturesPanel } from './EngineFeaturesPanel';
export { TrainingProgressPanel } from './TrainingProgressPanel';
export { TrainingQualityEvaluation } from './TrainingQualityEvaluation';
export { PostTrainingEvaluationInfo } from './PostTrainingEvaluationInfo';
export { CostEstimateCard } from './CostEstimateCard';
export { DatasetSelectorModal } from './DatasetSelectorModal';

// New adapter testing exports
export { DeployAdapterButton } from './DeployAdapterButton';
export { ABTestingPanel } from './ABTestingPanel';
export { TestResultComparison } from './TestResultComparison';
export { EndpointStatusBanner } from './EndpointStatusBanner';
export { TestHistoryTable } from './TestHistoryTable';
```

---

## 10. Page Implementations

### 10.1 Test Page

Create: `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`

```typescript
/**
 * Adapter Testing Page
 *
 * A/B testing interface for comparing Control vs Adapted model responses
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import { useEndpointStatus } from '@/hooks/useAdapterTesting';
import {
  ABTestingPanel,
  EndpointStatusBanner,
  TestHistoryTable,
  TestResultComparison,
} from '@/components/pipeline';
import { TestResult } from '@/types/pipeline-adapter';

export default function AdapterTestPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const { data: jobData, isLoading: jobLoading } = usePipelineJob(jobId);
  const { data: statusData, isLoading: statusLoading } = useEndpointStatus(jobId);

  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const job = jobData?.data;
  const endpointStatus = statusData?.data;

  if (jobLoading || statusLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <Link href="/pipeline/jobs">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/pipeline/jobs/${jobId}/results`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Test Adapter</h1>
          <p className="text-muted-foreground">{job.jobName}</p>
        </div>
      </div>

      {/* Endpoint Status */}
      <div className="mb-6">
        <EndpointStatusBanner
          controlEndpoint={endpointStatus?.controlEndpoint || null}
          adaptedEndpoint={endpointStatus?.adaptedEndpoint || null}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="test" className="space-y-6">
        <TabsList>
          <TabsTrigger value="test">Run Test</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <ABTestingPanel
            jobId={jobId}
            endpointsReady={endpointStatus?.bothReady || false}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Previous Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <TestHistoryTable
                jobId={jobId}
                onSelectTest={setSelectedTest}
              />
            </CardContent>
          </Card>

          {/* Selected Test Detail */}
          {selectedTest && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Test Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTest(null)}
                >
                  Close
                </Button>
              </div>
              <TestResultComparison result={selectedTest} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 10.2 Update Results Page

Update: `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx`

Add the Deploy/Test button after the Download Adapter button:

```typescript
// Add import at top
import { DeployAdapterButton } from '@/components/pipeline';

// In the header section, after the Download button:
{job.adapterFilePath && (
  <div className="flex gap-2">
    <Button asChild variant="outline">
      <a href={`/api/pipeline/jobs/${job.id}/download`} download>
        <Download className="h-4 w-4 mr-2" />
        Download
      </a>
    </Button>
    <DeployAdapterButton jobId={job.id} />
  </div>
)}
```

---

## 11. Integration Points

### 11.1 Environment Variables

Add to `.env.local`:

```bash
# RunPod API Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_API_URL=https://api.runpod.io/graphql

# Anthropic API (already exists for training pipeline)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 11.2 Package Dependencies

The following packages are already installed:
- `@anthropic-ai/sdk` - Claude API
- `@tanstack/react-query` - Data fetching
- `@supabase/supabase-js` - Database

No additional packages required.

### 11.3 Supabase Storage Integration

Adapters are already stored in Supabase Storage. The inference service generates signed URLs for RunPod to download adapters:

```typescript
const { data: signedUrl } = await supabase.storage
  .from('lora-models')
  .createSignedUrl(job.adapter_file_path, 3600);  // 1 hour validity
```

---

## 12. Implementation Phases

### Phase 1: Database & Types (Day 1)
1. Execute SQL to create new tables
2. Create `src/types/pipeline-adapter.ts`
3. Test table creation with manual inserts

### Phase 2: Services (Day 2)
1. Create `src/lib/services/inference-service.ts`
2. Create `src/lib/services/test-service.ts`
3. Unit test service functions

### Phase 3: API Routes (Day 3)
1. Create `/api/pipeline/jobs/[jobId]/deploy/route.ts`
2. Create `/api/pipeline/jobs/[jobId]/test/route.ts`
3. Create `/api/pipeline/jobs/[jobId]/endpoints/route.ts`
4. Create `/api/pipeline/test/[testId]/rate/route.ts`
5. Test with Postman/curl

### Phase 4: Hooks (Day 4)
1. Create `src/hooks/useAdapterTesting.ts`
2. Test hooks in isolation

### Phase 5: Components (Day 5)
1. Create `DeployAdapterButton`
2. Create `EndpointStatusBanner`
3. Create `ABTestingPanel`
4. Create `TestResultComparison`
5. Create `TestHistoryTable`
6. Update component index

### Phase 6: Pages & Integration (Day 6)
1. Create test page `/pipeline/jobs/[jobId]/test`
2. Update results page with deploy button
3. End-to-end testing

---

## 13. Testing Strategy

### 13.1 Unit Tests

```typescript
// src/lib/services/__tests__/inference-service.test.ts
describe('InferenceService', () => {
  it('should create control and adapted endpoints', async () => {
    // Mock RunPod API
    // Test endpoint creation
  });

  it('should poll endpoint status correctly', async () => {
    // Test status transitions
  });
});

// src/lib/services/__tests__/test-service.test.ts
describe('TestService', () => {
  it('should run parallel inference and return results', async () => {
    // Mock inference endpoints
    // Test parallel execution
  });

  it('should evaluate with Claude when enabled', async () => {
    // Mock Anthropic API
    // Test evaluation flow
  });
});
```

### 13.2 Integration Tests

```typescript
// src/app/api/pipeline/jobs/[jobId]/__tests__/deploy.test.ts
describe('Deploy API', () => {
  it('should deploy endpoints for completed job', async () => {
    // Test full deployment flow
  });

  it('should reject deployment for incomplete job', async () => {
    // Test validation
  });
});
```

### 13.3 Manual Test Cases

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Deploy from results page | Click "Deploy & Test" on completed job | Endpoints start deploying |
| Endpoint ready detection | Wait for deployment | Status changes to "ready" |
| Run basic test | Enter prompt, click Run | Both responses displayed |
| Run test with evaluation | Enable eval, run test | Scores and comparison shown |
| Rate test | Click rating button | Rating saved |
| View test history | Go to History tab | Previous tests listed |

---

## Appendices

### A. File Checklist

New files to create:
- [ ] `src/types/pipeline-adapter.ts`
- [ ] `src/lib/services/inference-service.ts`
- [ ] `src/lib/services/test-service.ts`
- [ ] `src/hooks/useAdapterTesting.ts`
- [ ] `src/app/api/pipeline/jobs/[jobId]/deploy/route.ts`
- [ ] `src/app/api/pipeline/jobs/[jobId]/test/route.ts`
- [ ] `src/app/api/pipeline/jobs/[jobId]/endpoints/route.ts`
- [ ] `src/app/api/pipeline/test/[testId]/rate/route.ts`
- [ ] `src/components/pipeline/DeployAdapterButton.tsx`
- [ ] `src/components/pipeline/ABTestingPanel.tsx`
- [ ] `src/components/pipeline/TestResultComparison.tsx`
- [ ] `src/components/pipeline/EndpointStatusBanner.tsx`
- [ ] `src/components/pipeline/TestHistoryTable.tsx`
- [ ] `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`

Files to modify:
- [ ] `src/types/pipeline.ts` (add test fields)
- [ ] `src/lib/services/index.ts` (add exports)
- [ ] `src/components/pipeline/index.ts` (add exports)
- [ ] `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` (add button)

### B. Database Migration Script

Save as `migrations/003_adapter_testing.sql`:

```sql
-- Migration: Add adapter testing tables
-- Date: 2026-01-16
-- Author: Implementation Spec

BEGIN;

-- Create pipeline_inference_endpoints
CREATE TABLE IF NOT EXISTS pipeline_inference_endpoints (
  -- ... (full schema from section 4.1)
);

-- Create pipeline_test_results
CREATE TABLE IF NOT EXISTS pipeline_test_results (
  -- ... (full schema from section 4.1)
);

-- Create pipeline_base_models
CREATE TABLE IF NOT EXISTS pipeline_base_models (
  -- ... (full schema from section 4.1)
);

-- Seed base models
INSERT INTO pipeline_base_models (model_id, display_name, parameter_count, context_length, license, min_gpu_memory_gb, recommended_gpu_type)
VALUES
  ('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', '7B', 32768, 'Apache 2.0', 24, 'NVIDIA A40')
ON CONFLICT (model_id) DO NOTHING;

COMMIT;
```

### C. RunPod API Reference

Key GraphQL operations:

```graphql
# Create Endpoint
mutation CreateEndpoint($input: EndpointInput!) {
  createEndpoint(input: $input) {
    id
    name
    status
  }
}

# Get Endpoint Status
query GetEndpoint($id: String!) {
  endpoint(input: { id: $id }) {
    id
    status
    workersRunning
  }
}

# Terminate Endpoint
mutation TerminateEndpoint($id: String!) {
  deleteEndpoint(id: $id)
}
```

### D. Cost Estimates

| Operation | Cost |
|-----------|------|
| Endpoint idle (per hour) | ~$0.10 |
| Inference per 1K tokens | ~$0.001 |
| Claude evaluation per test | ~$0.02 |
| Typical test (no eval) | ~$0.01 |
| Typical test (with eval) | ~$0.03 |

---

**Document Status:** Complete Implementation Specification
**Version:** 1.0
**Next Step:** Begin implementation at Phase 1 (Database & Types)
