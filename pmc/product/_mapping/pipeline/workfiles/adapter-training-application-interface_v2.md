# Adapter Testing System - Implementation Specification

**Date**: January 16, 2026  
**Version**: 2.0 (Enhanced with Codebase Integration)  
**Status**: Implementation-Ready Specification  
**Goal**: Automate adapter deployment, model serving, and A/B testing on RunPod

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Integration Points](#2-codebase-integration-points)
3. [Database Schema Extensions](#3-database-schema-extensions)
4. [Type System Extensions](#4-type-system-extensions)
5. [Service Layer Architecture](#5-service-layer-architecture)
6. [API Route Specifications](#6-api-route-specifications)
7. [React Query Hooks](#7-react-query-hooks)
8. [UI Components](#8-ui-components)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Executive Summary

### Problem
Our current system (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\`) trains LoRA adapters successfully but requires manual deployment and testing on RunPod.

### Solution
Extend existing pipeline architecture to support:
- **One-click deployment** from job results page
- **Serverless inference** via RunPod vLLM endpoints
- **A/B testing interface** comparing control vs adapted models
- **Test history** for systematic evaluation

### Architecture Decisions

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Inference | RunPod Serverless vLLM | OpenAI-compatible API, pay-per-use, scales to zero |
| Endpoints | Two (Control + Adapted) | Parallel testing, simpler logic, independent scaling |
| Docker Images | RunPod pre-built `worker-vllm` | No custom builds needed, dynamic LoRA loading supported |
| Storage | Existing 400GB volume | Sufficient for 5 models (~290GB needed) |
| Model Selection | Auto from training config | Testing must use same base model as training |

---

## 2. Codebase Integration Points

### Existing Patterns to Follow

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\pipeline.ts`**
- Defines `PipelineTrainingJob`, `PipelineJobStatus`, type mappings
- Pattern: Lay-person config → Technical parameters
- **Action**: Extend with inference-related types

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\pipeline-service.ts`**
- Service layer for CRUD operations on `pipeline_training_jobs`
- Uses `createServerSupabaseClient()` for DB access
- Pattern: `mapDbRowToJob()` for type conversion
- **Action**: Create parallel `inference-service.ts` following same patterns

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\usePipelineJobs.ts`**
- React Query hooks with query key factory pattern (`pipelineKeys`)
- Pattern: `fetch*` functions + `use*` hooks + mutations
- **Action**: Extend with inference hooks

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\[jobId]\download\route.ts`**
- NextJS app router API route
- Pattern: `GET(request, { params })`, validates job status, uses admin client
- **Action**: Create `deploy/route.ts` and `test/route.ts` following same pattern

---

## 3. Database Schema Extensions

### Table 1: `pipeline_inference_endpoints`

Tracks RunPod serverless endpoints for model serving.

```sql
CREATE TABLE pipeline_inference_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,              -- "mistralai/Mistral-7B-Instruct-v0.2"
  model_display_name TEXT NOT NULL,      -- "Mistral-7B"
  model_family TEXT NOT NULL,            -- "mistral", "qwen", "deepseek"
  endpoint_type TEXT NOT NULL,           -- "control" | "adapted"
  
  -- RunPod Integration
  runpod_endpoint_id TEXT UNIQUE,        -- RunPod endpoint ID
  runpod_endpoint_url TEXT,              -- Full API URL
  
  -- State Management
  status TEXT DEFAULT 'inactive',        -- "active" | "inactive" | "starting" | "error"
  current_adapter_job_id UUID REFERENCES pipeline_training_jobs(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(model_name, endpoint_type)
);

CREATE INDEX idx_endpoints_model_type ON pipeline_inference_endpoints(model_name, endpoint_type);
CREATE INDEX idx_endpoints_status ON pipeline_inference_endpoints(status);
```

### Table 2: `pipeline_test_results`

Stores A/B test comparisons.

```sql
CREATE TABLE pipeline_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  
  -- Test Input
  prompt TEXT NOT NULL,
  system_prompt TEXT,
  
  -- Responses
  control_response TEXT,
  adapted_response TEXT,
  
  -- Performance Metrics
  control_latency_ms INTEGER,
  adapted_latency_ms INTEGER,
  control_tokens INTEGER,
  adapted_tokens INTEGER,
  
  -- User Evaluation
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  preferred_response TEXT CHECK (preferred_response IN ('control', 'adapted', 'tie')),
  user_notes TEXT,
  
  -- Testing Context
  control_endpoint_id UUID REFERENCES pipeline_inference_endpoints(id),
  adapted_endpoint_id UUID REFERENCES pipeline_inference_endpoints(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_results_job ON pipeline_test_results(job_id, created_at DESC);
CREATE INDEX idx_test_results_user ON pipeline_test_results(user_id, created_at DESC);
```

### Table 3: `pipeline_base_models`

Registry of available base models.

```sql
CREATE TABLE pipeline_base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL UNIQUE,       -- HuggingFace model ID
  display_name TEXT NOT NULL,
  model_family TEXT NOT NULL,
  
  -- Model Specifications
  parameters_billions NUMERIC,
  disk_size_gb NUMERIC,
  context_length INTEGER,
  
  -- Capabilities
  supports_lora BOOLEAN DEFAULT true,
  is_thinking_model BOOLEAN DEFAULT false,
  is_instruct_tuned BOOLEAN DEFAULT true,
  
  -- Infrastructure
  recommended_gpu TEXT,                  -- "RTX 4090", "A100-40GB"
  min_gpu_memory_gb INTEGER,
  
  -- Availability
  status TEXT DEFAULT 'available',       -- "available" | "coming_soon" | "deprecated"
  availability_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO pipeline_base_models (model_name, display_name, model_family, parameters_billions, disk_size_gb, recommended_gpu, min_gpu_memory_gb) VALUES
('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', 'mistral', 7, 14, 'RTX 4090', 16),
('Qwen/Qwen2.5-32B-Instruct', 'Qwen 2.5 32B Instruct', 'qwen', 32, 65, 'A100-40GB', 48),
('deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'DeepSeek R1 Distill 32B', 'deepseek', 32, 66, 'A100-48GB', 48);
```

---

## 4. Type System Extensions

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\types\inference.ts`** (NEW)

```typescript
// Endpoint Types
export type InferenceEndpointType = 'control' | 'adapted';
export type InferenceEndpointStatus = 'active' | 'inactive' | 'starting' | 'error';

export interface InferenceEndpoint {
  id: string;
  modelName: string;
  modelDisplayName: string;
  modelFamily: string;
  endpointType: InferenceEndpointType;
  runpodEndpointId: string | null;
  runpodEndpointUrl: string | null;
  status: InferenceEndpointStatus;
  currentAdapterJobId: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

// Test Result Types
export type PreferredResponse = 'control' | 'adapted' | 'tie';

export interface TestResult {
  id: string;
  jobId: string;
  userId: string;
  prompt: string;
  systemPrompt: string | null;
  controlResponse: string | null;
  adaptedResponse: string | null;
  controlLatencyMs: number | null;
  adaptedLatencyMs: number | null;
  controlTokens: number | null;
  adaptedTokens: number | null;
  userRating: number | null;
  preferredResponse: PreferredResponse | null;
  userNotes: string | null;
  controlEndpointId: string | null;
  adaptedEndpointId: string | null;
  createdAt: string;
}

// Base Model Types
export interface BaseModel {
  id: string;
  modelName: string;
  displayName: string;
  modelFamily: string;
  parametersBillions: number | null;
  diskSizeGb: number | null;
  contextLength: number | null;
  supportsLora: boolean;
  isThinkingModel: boolean;
  isInstructTuned: boolean;
  recommendedGpu: string | null;
  minGpuMemoryGb: number | null;
  status: string;
  availabilityNotes: string | null;
  createdAt: string;
}

// API Request/Response Types
export interface DeployAdapterRequest {
  jobId: string;
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
  prompt: string;
  systemPrompt?: string;
}

export interface RunTestResponse {
  success: boolean;
  data?: {
    testId: string;
    control: {
      response: string;
      latencyMs: number;
      tokens: number;
    };
    adapted: {
      response: string;
      latencyMs: number;
      tokens: number;
    };
  };
  error?: string;
}

export interface TestStatusResponse {
  success: boolean;
  data?: {
    controlReady: boolean;
    adaptedReady: boolean;
    controlStatus: InferenceEndpointStatus;
    adaptedStatus: InferenceEndpointStatus;
    message: string;
  };
  error?: string;
}
```

---

## 5. Service Layer Architecture

### Service 1: Inference Service

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-service.ts`** (NEW)

Pattern: Follow `pipeline-service.ts` structure

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { InferenceEndpoint, InferenceEndpointType } from '@/types/inference';

// Database mapping (like mapDbRowToJob in pipeline-service.ts)
function mapDbRowToEndpoint(row: any): InferenceEndpoint {
  return {
    id: row.id,
    modelName: row.model_name,
    modelDisplayName: row.model_display_name,
    modelFamily: row.model_family,
    endpointType: row.endpoint_type,
    runpodEndpointId: row.runpod_endpoint_id,
    runpodEndpointUrl: row.runpod_endpoint_url,
    status: row.status,
    currentAdapterJobId: row.current_adapter_job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

// Get or create endpoint for model
export async function getOrCreateEndpoint(
  modelName: string,
  endpointType: InferenceEndpointType
): Promise<{ success: boolean; data?: InferenceEndpoint; error?: string }> {
  // Implementation
}

// Deploy adapter to endpoint
export async function deployAdapter(
  jobId: string
): Promise<{ success: boolean; data?: { control: InferenceEndpoint; adapted: InferenceEndpoint }; error?: string }> {
  // 1. Get job details (base model)
  // 2. Get/create control endpoint
  // 3. Get/create adapted endpoint
  // 4. Configure adapted endpoint with LoRA
  // 5. Return both endpoints
}

// Check endpoint status
export async function getEndpointStatus(
  endpointId: string
): Promise<{ success: boolean; data?: InferenceEndpoint; error?: string }> {
  // Implementation
}

// Call RunPod vLLM endpoint
export async function callInferenceEndpoint(
  endpointUrl: string,
  prompt: string,
  systemPrompt?: string
): Promise<{ response: string; latencyMs: number; tokens: number }> {
  // OpenAI-compatible API call to RunPod
}
```

### Service 2: Test Service

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`** (NEW)

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { TestResult } from '@/types/inference';

// Run A/B test
export async function runTest(
  jobId: string,
  userId: string,
  prompt: string,
  systemPrompt?: string
): Promise<{ success: boolean; data?: TestResult; error?: string }> {
  // 1. Get endpoints for job
  // 2. Call both in parallel (Promise.all)
  // 3. Save results to pipeline_test_results
  // 4. Return test result
}

// Get test history
export async function getTestHistory(
  jobId: string
): Promise<{ success: boolean; data?: TestResult[]; error?: string }> {
  // Query pipeline_test_results
}

// Update test rating
export async function updateTestRating(
  testId: string,
  rating: number,
  preferredResponse: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Update pipeline_test_results
}
```

---

## 6. API Route Specifications

### Route 1: Deploy Adapter

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\[jobId]\deploy\route.ts`** (NEW)

Pattern: Follow `download/route.ts` structure

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deployAdapter } from '@/lib/services/inference-service';
import { getPipelineJob } from '@/lib/services/pipeline-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  try {
    // 1. Validate job exists and is completed (like download route)
    const jobResult = await getPipelineJob(jobId);
    if (!jobResult.success || !jobResult.data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    if (jobResult.data.status !== 'completed') {
      return NextResponse.json({ error: 'Job not completed' }, { status: 400 });
    }

    // 2. Deploy adapter
    const result = await deployAdapter(jobId);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error deploying adapter:', error);
    return NextResponse.json({ error: 'Deployment failed' }, { status: 500 });
  }
}
```

### Route 2: Run Test

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\[jobId]\test\route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runTest, getTestHistory } from '@/lib/services/test-service';
import { getUserFromRequest } from '@/lib/auth-helpers'; // Assuming exists

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const body = await request.json();
  const { prompt, systemPrompt } = body;

  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runTest(jobId, user.id, prompt, systemPrompt);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error running test:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  
  try {
    const result = await getTestHistory(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching test history:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
```

### Route 3: Test Status

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\jobs\[jobId]\test-status\route.ts`** (NEW)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Check if both endpoints are ready
  // Return status for UI to display
}
```

---

## 7. React Query Hooks

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useInferenceTesting.ts`** (NEW)

Pattern: Extend `pipelineKeys` from `usePipelineJobs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineKeys } from './usePipelineJobs';

// Extend query keys
export const inferenceKeys = {
  ...pipelineKeys,
  testStatus: (jobId: string) => [...pipelineKeys.job(jobId), 'test-status'] as const,
  testHistory: (jobId: string) => [...pipelineKeys.job(jobId), 'test-history'] as const,
};

// Deploy adapter mutation
export function useDeployAdapter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/deploy`, { method: 'POST' });
      if (!res.ok) throw new Error('Deploy failed');
      return res.json();
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: inferenceKeys.testStatus(jobId) });
    },
  });
}

// Run test mutation
export function useRunTest(jobId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ prompt, systemPrompt }: { prompt: string; systemPrompt?: string }) => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
      });
      if (!res.ok) throw new Error('Test failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inferenceKeys.testHistory(jobId) });
    },
  });
}

// Test status query
export function useTestStatus(jobId: string | null) {
  return useQuery({
    queryKey: inferenceKeys.testStatus(jobId || ''),
    queryFn: async () => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/test-status`);
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !!jobId,
  });
}

// Test history query
export function useTestHistory(jobId: string | null) {
  return useQuery({
    queryKey: inferenceKeys.testHistory(jobId || ''),
    queryFn: async () => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/test`);
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !!jobId,
  });
}
```

---

## 8. UI Components

### Component 1: DeployButton

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\DeployButton.tsx`** (NEW)

Pattern: Follow `CostEstimateCard.tsx` component style

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Rocket, Loader2 } from 'lucide-react';
import { useDeployAdapter, useTestStatus } from '@/hooks/useInferenceTesting';

interface DeployButtonProps {
  jobId: string;
  onDeployed?: () => void;
}

export function DeployButton({ jobId, onDeployed }: DeployButtonProps) {
  const deployMutation = useDeployAdapter();
  const { data: statusData } = useTestStatus(jobId);

  const handleDeploy = async () => {
    await deployMutation.mutateAsync(jobId);
    onDeployed?.();
  };

  const isDeployed = statusData?.data?.controlReady && statusData?.data?.adaptedReady;

  if (isDeployed) {
    return (
      <Button variant="outline" disabled>
        <Rocket className="h-4 w-4 mr-2" />
        Deployed
      </Button>
    );
  }

  return (
    <Button onClick={handleDeploy} disabled={deployMutation.isPending}>
      {deployMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Deploying...
        </>
      ) : (
        <>
          <Rocket className="h-4 w-4 mr-2" />
          Deploy for Testing
        </>
      )}
    </Button>
  );
}
```

### Component 2: ABTestingPanel

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\ABTestingPanel.tsx`** (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useRunTest } from '@/hooks/useInferenceTesting';
import { TestResultComparison } from './TestResultComparison';

interface ABTestingPanelProps {
  jobId: string;
}

export function ABTestingPanel({ jobId }: ABTestingPanelProps) {
  const [prompt, setPrompt] = useState('');
  const runTest = useRunTest(jobId);

  const handleSubmit = () => {
    runTest.mutate({ prompt });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          placeholder="Enter your test prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <Button onClick={handleSubmit} disabled={runTest.isPending} className="mt-2">
          Send to Both
        </Button>
      </Card>

      {runTest.data?.data && (
        <TestResultComparison result={runTest.data.data} />
      )}
    </div>
  );
}
```

### Component 3: TestResultComparison

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\TestResultComparison.tsx`** (NEW)

```typescript
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TestResultComparisonProps {
  result: {
    control: { response: string; latencyMs: number; tokens: number };
    adapted: { response: string; latencyMs: number; tokens: number };
  };
}

export function TestResultComparison({ result }: TestResultComparisonProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Control (No Adapter)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{result.control.response}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {result.control.latencyMs}ms • {result.control.tokens} tokens
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adapted (With LoRA)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{result.adapted.response}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {result.adapted.latencyMs}ms • {result.adapted.tokens} tokens
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### UI Page: Testing Interface

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\test\page.tsx`** (NEW)

```typescript
'use client';

import { useParams } from 'next/navigation';
import { ABTestingPanel } from '@/components/pipeline/ABTestingPanel';
import { usePipelineJob } from '@/hooks/usePipelineJobs';

export default function TestPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { data } = usePipelineJob(jobId);

  return (
    <div className="container max-w-6xl py-8">
      <h1 className="text-2xl font-bold mb-4">A/B Testing: {data?.data?.jobName}</h1>
      <ABTestingPanel jobId={jobId} />
    </div>
  );
}
```

### Modify Existing Pages

**File: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\pipeline\jobs\[jobId]\results\page.tsx`** (MODIFY)

Add after download button:

```typescript
import { DeployButton } from '@/components/pipeline/DeployButton';

// In JSX, after download button:
{job.status === 'completed' && (
  <DeployButton 
    jobId={job.id} 
    onDeployed={() => router.push(`/pipeline/jobs/${job.id}/test`)} 
  />
)}
```

---

## 9. Implementation Checklist

### Phase 1: Database & Types
- [ ] Create migration: `pipeline_inference_endpoints` table
- [ ] Create migration: `pipeline_test_results` table
- [ ] Create migration: `pipeline_base_models` table (with seed data)
- [ ] Create `src/types/inference.ts` with all type definitions

### Phase 2: Service Layer
- [ ] Create `src/lib/services/inference-service.ts`
- [ ] Create `src/lib/services/test-service.ts`
- [ ] Add RunPod API integration functions

### Phase 3: API Routes
- [ ] Create `src/app/api/pipeline/jobs/[jobId]/deploy/route.ts`
- [ ] Create `src/app/api/pipeline/jobs/[jobId]/test/route.ts`
- [ ] Create `src/app/api/pipeline/jobs/[jobId]/test-status/route.ts`

### Phase 4: React Query Hooks
- [ ] Create `src/hooks/useInferenceTesting.ts`
- [ ] Extend query keys
- [ ] Add mutations and queries

### Phase 5: UI Components
- [ ] Create `DeployButton.tsx`
- [ ] Create `ABTestingPanel.tsx`
- [ ] Create `TestResultComparison.tsx`
- [ ] Export from `src/components/pipeline/index.ts`

### Phase 6: UI Pages
- [ ] Create `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`
- [ ] Modify `results/page.tsx` to add deploy button
- [ ] Modify `page.tsx` (job detail) to add deploy button

### Phase 7: Testing & Deployment
- [ ] Test database migrations
- [ ] Test API routes with Postman/curl
- [ ] Test UI flow end-to-end
- [ ] Deploy to Vercel
- [ ] Configure RunPod serverless endpoints

---

**Document Complete**. Ready for implementation planning.
