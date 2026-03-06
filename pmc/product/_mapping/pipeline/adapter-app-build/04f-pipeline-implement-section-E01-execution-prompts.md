# Adapter Application Module - Section E01: Database Schema & TypeScript Types

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E01 - Foundation Layer  
**Prerequisites:** None (#1 section)  
**Builds Upon:** Existing pipeline infrastructure  

---

## Overview

This prompt implements the foundational database schema and TypeScript types for the Adapter Application Module. This section creates the tables needed to track inference endpoints, test results, and base model configurations, plus all corresponding TypeScript type definitions.

**What This Section Creates:**
1. Three new database tables with RLS policies
2. Complete TypeScript type definitions in `pipeline-adapter.ts`
3. Database mapping utilities
4. Seed data for base models

**What This Section Does NOT Create:**
- API routes (E03)
- UI components (E05)
- Service layer logic (E02)

---

## Critical Instructions

### SAOL for All Database Operations

**CRITICAL:** You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations. Do not use raw `supabase-js` or PostgreSQL scripts.

```bash
# Verify table creation
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_inference_endpoints',transport:'pg'});console.log('Exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length)}})();"
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<configured in .env.local>
SUPABASE_SERVICE_ROLE_KEY=<configured in .env.local>
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Existing tables that already work:**
- `pipeline_training_jobs` - Training job records
- `pipeline_training_metrics` - Real-time training metrics
- `pipeline_evaluation_runs` - Evaluation run records
- `pipeline_evaluation_results` - Per-scenario evaluation results

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`
- SAOL Usage: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

---

========================

# EXECUTION PROMPT E01 - DATABASE SCHEMA & TYPESCRIPT TYPES

## Context

You are implementing the foundational database schema and TypeScript types for the Adapter Application Module. This module enables users to deploy trained LoRA adapters to RunPod Serverless inference endpoints and conduct A/B testing comparing Control (base model) vs Adapted (base + LoRA) responses.

**Key Architectural Decisions (Already Made):**
- Two separate endpoints: Control (base model only) and Adapted (base + LoRA)
- RunPod Serverless for inference (pay-per-use, OpenAI-compatible API)
- Docker image: `runpod/worker-vllm:latest` (no custom build needed)
- Adapters already stored in Supabase Storage at `lora-models/adapters/{job_id}.tar.gz`

## Your Task

Implement the complete database schema and TypeScript type system for adapter testing infrastructure.

---

## Task 1: Create Database Tables

Execute the following SQL to create three new tables in Supabase SQL Editor:

### SQL Migration Script

```sql
-- ============================================
-- Migration: Adapter Testing Infrastructure
-- Date: 2026-01-17
-- Tables: pipeline_inference_endpoints, pipeline_test_results, pipeline_base_models
-- ============================================

BEGIN;

-- ============================================
-- Table: pipeline_inference_endpoints
-- Purpose: Track deployed inference endpoints (Control and Adapted)
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_inference_endpoints (
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
CREATE INDEX IF NOT EXISTS idx_endpoints_job_id ON pipeline_inference_endpoints(job_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON pipeline_inference_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_status ON pipeline_inference_endpoints(status);

-- RLS Policies
ALTER TABLE pipeline_inference_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can view own endpoints"
  ON pipeline_inference_endpoints FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can insert own endpoints"
  ON pipeline_inference_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can update own endpoints"
  ON pipeline_inference_endpoints FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_test_results
-- Purpose: Store A/B test results with Claude evaluations
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_test_results (
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
CREATE INDEX IF NOT EXISTS idx_test_results_job_id ON pipeline_test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON pipeline_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON pipeline_test_results(created_at DESC);

-- RLS Policies
ALTER TABLE pipeline_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own test results" ON pipeline_test_results;
CREATE POLICY "Users can view own test results"
  ON pipeline_test_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own test results" ON pipeline_test_results;
CREATE POLICY "Users can insert own test results"
  ON pipeline_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own test results" ON pipeline_test_results;
CREATE POLICY "Users can update own test results"
  ON pipeline_test_results FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_base_models
-- Purpose: Registry of supported base models
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_base_models (
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
  ('meta-llama/Meta-Llama-3-70B-Instruct', 'Llama 3 70B Instruct', '70B', 8192, 'Llama 3', 80, 'NVIDIA H100')
ON CONFLICT (model_id) DO NOTHING;

COMMIT;
```

### Verification

After executing the SQL, verify table creation with SAOL:

```bash
# Verify pipeline_inference_endpoints
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_inference_endpoints',transport:'pg'});console.log('Exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);console.log('Policies:',r.tables[0].policies.length);}})();"

# Verify pipeline_test_results
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_test_results',transport:'pg'});console.log('Exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);}})();"

# Verify pipeline_base_models and seed data
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_base_models',select:'model_id,display_name,parameter_count'});console.log('Models seeded:',r.data.length);r.data.forEach(m=>console.log('-',m.display_name,'(',m.parameter_count,')'));})();"
```

---

## Task 2: Create TypeScript Type Definitions

Create the complete type system for adapter testing.

### File: `src/types/pipeline-adapter.ts`

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

---

## Task 3: Create Database Mapping Utilities

Create utility functions to map database rows to TypeScript objects.

### File: `src/lib/pipeline/adapter-db-utils.ts`

```typescript
/**
 * Adapter Database Mapping Utilities
 * 
 * Maps database snake_case to TypeScript camelCase
 */

import {
  InferenceEndpoint,
  EndpointStatus,
  TestResult,
  TestResultStatus,
  BaseModel,
} from '@/types/pipeline-adapter';

// ============================================
// Endpoint Mapping
// ============================================

export function mapDbRowToEndpoint(row: any): InferenceEndpoint {
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

export function mapEndpointToDbRow(endpoint: Partial<InferenceEndpoint>): Record<string, any> {
  const row: Record<string, any> = {};
  
  if (endpoint.jobId !== undefined) row.job_id = endpoint.jobId;
  if (endpoint.userId !== undefined) row.user_id = endpoint.userId;
  if (endpoint.endpointType !== undefined) row.endpoint_type = endpoint.endpointType;
  if (endpoint.runpodEndpointId !== undefined) row.runpod_endpoint_id = endpoint.runpodEndpointId;
  if (endpoint.baseModel !== undefined) row.base_model = endpoint.baseModel;
  if (endpoint.adapterPath !== undefined) row.adapter_path = endpoint.adapterPath;
  if (endpoint.status !== undefined) row.status = endpoint.status;
  if (endpoint.healthCheckUrl !== undefined) row.health_check_url = endpoint.healthCheckUrl;
  if (endpoint.lastHealthCheck !== undefined) row.last_health_check = endpoint.lastHealthCheck;
  if (endpoint.idleTimeoutSeconds !== undefined) row.idle_timeout_seconds = endpoint.idleTimeoutSeconds;
  if (endpoint.estimatedCostPerHour !== undefined) row.estimated_cost_per_hour = endpoint.estimatedCostPerHour;
  if (endpoint.readyAt !== undefined) row.ready_at = endpoint.readyAt;
  if (endpoint.terminatedAt !== undefined) row.terminated_at = endpoint.terminatedAt;
  if (endpoint.errorMessage !== undefined) row.error_message = endpoint.errorMessage;
  if (endpoint.errorDetails !== undefined) row.error_details = endpoint.errorDetails;
  
  return row;
}

// ============================================
// Test Result Mapping
// ============================================

export function mapDbRowToTestResult(row: any): TestResult {
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

export function mapTestResultToDbRow(result: Partial<TestResult>): Record<string, any> {
  const row: Record<string, any> = {};
  
  if (result.jobId !== undefined) row.job_id = result.jobId;
  if (result.userId !== undefined) row.user_id = result.userId;
  if (result.systemPrompt !== undefined) row.system_prompt = result.systemPrompt;
  if (result.userPrompt !== undefined) row.user_prompt = result.userPrompt;
  if (result.controlResponse !== undefined) row.control_response = result.controlResponse;
  if (result.controlGenerationTimeMs !== undefined) row.control_generation_time_ms = result.controlGenerationTimeMs;
  if (result.controlTokensUsed !== undefined) row.control_tokens_used = result.controlTokensUsed;
  if (result.adaptedResponse !== undefined) row.adapted_response = result.adaptedResponse;
  if (result.adaptedGenerationTimeMs !== undefined) row.adapted_generation_time_ms = result.adaptedGenerationTimeMs;
  if (result.adaptedTokensUsed !== undefined) row.adapted_tokens_used = result.adaptedTokensUsed;
  if (result.evaluationEnabled !== undefined) row.evaluation_enabled = result.evaluationEnabled;
  if (result.controlEvaluation !== undefined) row.control_evaluation = result.controlEvaluation;
  if (result.adaptedEvaluation !== undefined) row.adapted_evaluation = result.adaptedEvaluation;
  if (result.evaluationComparison !== undefined) row.evaluation_comparison = result.evaluationComparison;
  if (result.userRating !== undefined) row.user_rating = result.userRating;
  if (result.userNotes !== undefined) row.user_notes = result.userNotes;
  if (result.status !== undefined) row.status = result.status;
  if (result.completedAt !== undefined) row.completed_at = result.completedAt;
  if (result.errorMessage !== undefined) row.error_message = result.errorMessage;
  
  return row;
}

// ============================================
// Base Model Mapping
// ============================================

export function mapDbRowToBaseModel(row: any): BaseModel {
  return {
    id: row.id,
    modelId: row.model_id,
    displayName: row.display_name,
    parameterCount: row.parameter_count,
    contextLength: row.context_length,
    license: row.license,
    dockerImage: row.docker_image,
    minGpuMemoryGb: row.min_gpu_memory_gb,
    recommendedGpuType: row.recommended_gpu_type,
    supportsLora: row.supports_lora,
    supportsQuantization: row.supports_quantization,
    isActive: row.is_active,
  };
}
```

---

## Task 4: Update Type Exports

Update the type index to export new adapter types.

### File: `src/types/index.ts`

Add to existing exports:

```typescript
// Existing exports...
export * from './pipeline';
export * from './pipeline-evaluation';

// NEW: Adapter testing exports
export * from './pipeline-adapter';
```

---

## Task 5: Verification & Testing

After creating all files, verify the implementation:

### 1. Verify Tables Exist

```bash
# Check all three tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['pipeline_inference_endpoints','pipeline_test_results','pipeline_base_models'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t,'exists:',r.success)}})();"
```

### 2. Verify Seed Data

```bash
# Check base models seeded
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_base_models',select:'display_name,parameter_count,is_active'});console.log('Total models:',r.data.length);r.data.forEach(m=>console.log('-',m.display_name,'/',m.parameter_count,'/',m.is_active?'active':'inactive'));})();"
```

### 3. Verify TypeScript Compilation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json
```

### 4. Test Database Mapping

Create a quick test file: `src/lib/pipeline/__tests__/adapter-db-utils.test.ts`

```typescript
import { mapDbRowToEndpoint, mapDbRowToTestResult } from '../adapter-db-utils';

describe('Adapter DB Utils', () => {
  it('should map endpoint from database row', () => {
    const row = {
      id: '123',
      job_id: '456',
      user_id: '789',
      endpoint_type: 'control',
      base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
      status: 'ready',
      created_at: '2026-01-17T00:00:00Z',
    };
    
    const endpoint = mapDbRowToEndpoint(row);
    
    expect(endpoint.id).toBe('123');
    expect(endpoint.jobId).toBe('456');
    expect(endpoint.endpointType).toBe('control');
  });
});
```

---

## Success Criteria

Verify ALL criteria are met:

- [ ] All three tables created successfully in Supabase
- [ ] RLS policies enabled on all tables
- [ ] Indexes created for foreign keys and queries
- [ ] Seed data present in `pipeline_base_models` (4 models)
- [ ] `src/types/pipeline-adapter.ts` created with complete types
- [ ] `src/lib/pipeline/adapter-db-utils.ts` created with mapping functions
- [ ] Type exports updated in `src/types/index.ts`
- [ ] TypeScript compiles without errors
- [ ] SAOL verification commands confirm table structure
- [ ] Database queries return expected seed data

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/types/pipeline-adapter.ts` | Complete adapter testing type system |
| `src/lib/pipeline/adapter-db-utils.ts` | Database mapping utilities |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added adapter type exports |

### Database Changes
| Object | Type |
|--------|------|
| `pipeline_inference_endpoints` | Table |
| `pipeline_test_results` | Table |
| `pipeline_base_models` | Table |

---

## Next Steps

After completing E01:
- **E02:** Service Layer (inference-service.ts, test-service.ts)
- **E03:** API Routes (deploy, test, status endpoints)
- **E04:** React Query Hooks
- **E05:** UI Components & Pages

---

**END OF E01 PROMPT**

+++++++++++++++++



