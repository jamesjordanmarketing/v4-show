# Pipeline Implementation - Section E02: API Routes & Backend Services

**Version:** 1.0  
**Date:** January 10, 2026  
**Section:** E02 - API Layer  
**Prerequisites:** E01 (Database Schema & Types) must be complete  
**Builds Upon:** E01 database tables and TypeScript types  

---

## Overview

This prompt creates the Next.js API routes and backend services for the pipeline module. These APIs will be consumed by the UI components created in E03.

**What This Section Creates:**
1. Pipeline job CRUD API routes
2. Zustand store for pipeline state management
3. React Query hooks for data fetching
4. Pipeline service layer functions

**What This Section Does NOT Create:**
- UI components (E03)
- Training engine implementation (E04)
- Edge functions for RunPod integration (E04)

---

## Critical Instructions

### Supabase Agent Ops Library (SAOL) - REQUIRED

**You MUST use SAOL for ALL database operations.** Do not use raw supabase-js or PostgreSQL scripts.

**Library Path:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

**Key Rules:**
1. Use Service Role Key for server operations
2. Run Preflight before modifying data
3. No manual escaping needed

**Quick Reference:**
```bash
# Query example
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',limit:5});console.log(JSON.stringify(r.data,null,2));})();"
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/app/api/jobs/` - Existing job API patterns
- `src/lib/services/` - Service layer patterns
- `src/stores/` - Zustand store patterns
- `src/hooks/` - React Query hook patterns

**Do NOT break existing functionality.** Add new files, do not modify existing APIs.

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\v4-show-full-implementation-spec_v1.md`
- Previous Section: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\implement-pipeline\04f-pipeline-implement-section-E01-execution-prompts.md`

Types created in E01:
- `src/types/pipeline.ts`
- `src/types/pipeline-metrics.ts`
- `src/types/pipeline-evaluation.ts`
- `src/lib/pipeline/hyperparameter-utils.ts`

---

## Implementation Tasks

### Task 1: Create Pipeline Service Layer

#### 1.1 Create Pipeline Service

Create file: `src/lib/services/pipeline-service.ts`

```typescript
/**
 * Pipeline Service
 * 
 * Backend service for pipeline training job operations
 */

import { createClient } from '@/lib/supabase-server';
import {
  PipelineTrainingJob,
  CreatePipelineJobRequest,
  PipelineJobStatus,
  DEFAULT_ENGINE,
} from '@/types/pipeline';
import { convertToTechnicalParams, estimateTrainingCost } from '@/lib/pipeline/hyperparameter-utils';

// ============================================
// Type Mappings (Database → TypeScript)
// ============================================

function mapDbRowToJob(row: any): PipelineTrainingJob {
  return {
    id: row.id,
    userId: row.user_id,
    jobName: row.job_name,
    status: row.status as PipelineJobStatus,
    trainingSensitivity: row.training_sensitivity,
    trainingProgression: row.training_progression,
    trainingRepetition: row.training_repetition,
    learningRate: row.learning_rate,
    batchSize: row.batch_size,
    epochs: row.epochs,
    rank: row.rank,
    alpha: row.alpha,
    dropout: row.dropout,
    datasetId: row.dataset_id,
    datasetName: row.dataset_name,
    datasetFilePath: row.dataset_file_path,
    engineId: row.engine_id,
    engineName: row.engine_name,
    engineFeatures: row.engine_features || [],
    gpuType: row.gpu_type,
    gpuCount: row.gpu_count,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    progress: row.progress || 0,
    currentEpoch: row.current_epoch || 0,
    currentStep: row.current_step || 0,
    totalSteps: row.total_steps,
    currentLoss: row.current_loss,
    currentLearningRate: row.current_learning_rate,
    tokensPerSecond: row.tokens_per_second,
    runpodJobId: row.runpod_job_id,
    runpodEndpointId: row.runpod_endpoint_id,
    finalLoss: row.final_loss,
    trainingTimeSeconds: row.training_time_seconds,
    adapterFilePath: row.adapter_file_path,
    adapterDownloadUrl: row.adapter_download_url,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
  };
}

// ============================================
// Job CRUD Operations
// ============================================

export async function createPipelineJob(
  userId: string,
  request: CreatePipelineJobRequest
): Promise<{ success: boolean; data?: PipelineTrainingJob; error?: string }> {
  try {
    const supabase = createClient();
    
    // Convert lay-person config to technical params
    const technicalParams = convertToTechnicalParams({
      trainingSensitivity: request.trainingSensitivity,
      trainingProgression: request.trainingProgression,
      trainingRepetition: request.trainingRepetition,
    });
    
    // Estimate cost
    const costEstimate = estimateTrainingCost({
      trainingSensitivity: request.trainingSensitivity,
      trainingProgression: request.trainingProgression,
      trainingRepetition: request.trainingRepetition,
    });
    
    // Get dataset info
    const { data: dataset } = await supabase
      .from('datasets')
      .select('name, file_path')
      .eq('id', request.datasetId)
      .single();
    
    // Insert job
    const { data, error } = await supabase
      .from('pipeline_training_jobs')
      .insert({
        user_id: userId,
        job_name: request.jobName,
        status: 'pending',
        training_sensitivity: request.trainingSensitivity,
        training_progression: request.trainingProgression,
        training_repetition: request.trainingRepetition,
        learning_rate: technicalParams.learningRate,
        batch_size: technicalParams.batchSize,
        epochs: technicalParams.epochs,
        rank: technicalParams.rank,
        alpha: technicalParams.alpha,
        dropout: technicalParams.dropout,
        dataset_id: request.datasetId,
        dataset_name: dataset?.name || null,
        dataset_file_path: dataset?.file_path || null,
        engine_id: DEFAULT_ENGINE.id,
        engine_name: DEFAULT_ENGINE.name,
        engine_features: DEFAULT_ENGINE.features,
        gpu_type: request.gpuType || 'NVIDIA A40',
        gpu_count: request.gpuCount || 1,
        estimated_cost: costEstimate.totalCost,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pipeline job:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: mapDbRowToJob(data) };
  } catch (err) {
    console.error('Exception creating pipeline job:', err);
    return { success: false, error: 'Failed to create job' };
  }
}

export async function getPipelineJob(
  jobId: string
): Promise<{ success: boolean; data?: PipelineTrainingJob; error?: string }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: mapDbRowToJob(data) };
  } catch (err) {
    console.error('Exception getting pipeline job:', err);
    return { success: false, error: 'Failed to get job' };
  }
}

export async function listPipelineJobs(
  userId: string,
  options?: { limit?: number; offset?: number; status?: PipelineJobStatus }
): Promise<{ success: boolean; data?: PipelineTrainingJob[]; count?: number; error?: string }> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('pipeline_training_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
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
      data: data.map(mapDbRowToJob),
      count: count || 0,
    };
  } catch (err) {
    console.error('Exception listing pipeline jobs:', err);
    return { success: false, error: 'Failed to list jobs' };
  }
}

export async function updatePipelineJobStatus(
  jobId: string,
  status: PipelineJobStatus,
  additionalUpdates?: Partial<Record<string, any>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalUpdates,
    };
    
    // Set started_at if moving to running
    if (status === 'running' && !additionalUpdates?.started_at) {
      updates.started_at = new Date().toISOString();
    }
    
    // Set completed_at if terminal status
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('pipeline_training_jobs')
      .update(updates)
      .eq('id', jobId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Exception updating pipeline job:', err);
    return { success: false, error: 'Failed to update job' };
  }
}

export async function cancelPipelineJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  return updatePipelineJobStatus(jobId, 'cancelled');
}

// ============================================
// Metrics Operations
// ============================================

export async function getPipelineJobMetrics(
  jobId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('pipeline_training_metrics')
      .select('*')
      .eq('job_id', jobId)
      .order('measured_at', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Exception getting metrics:', err);
    return { success: false, error: 'Failed to get metrics' };
  }
}

// ============================================
// Engine Information
// ============================================

export function getCurrentEngine() {
  // Single engine architecture - always return the default engine
  return DEFAULT_ENGINE;
}
```

### Task 2: Create API Routes

#### 2.1 Create Jobs List/Create Route

Create directory and file: `src/app/api/pipeline/jobs/route.ts`

```typescript
/**
 * Pipeline Jobs API
 * 
 * GET  - List user's pipeline jobs
 * POST - Create new pipeline job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createPipelineJob, listPipelineJobs } from '@/lib/services/pipeline-service';
import { CreatePipelineJobRequest } from '@/types/pipeline';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    
    const result = await listPipelineJobs(user.id, { 
      limit, 
      offset, 
      status: status as any 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: CreatePipelineJobRequest = await request.json();
    
    // Validate required fields
    if (!body.jobName || !body.datasetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobName, datasetId' },
        { status: 400 }
      );
    }
    
    const result = await createPipelineJob(user.id, body);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.2 Create Job Detail Route

Create file: `src/app/api/pipeline/jobs/[jobId]/route.ts`

```typescript
/**
 * Pipeline Job Detail API
 * 
 * GET - Get job details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getPipelineJob } from '@/lib/services/pipeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await getPipelineJob(params.jobId);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    
    // Verify ownership
    if (result.data?.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.3 Create Job Cancel Route

Create file: `src/app/api/pipeline/jobs/[jobId]/cancel/route.ts`

```typescript
/**
 * Pipeline Job Cancel API
 * 
 * POST - Cancel a running job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getPipelineJob, cancelPipelineJob } from '@/lib/services/pipeline-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get job and verify ownership
    const jobResult = await getPipelineJob(params.jobId);
    
    if (!jobResult.success || !jobResult.data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (jobResult.data.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    // Check if cancellable
    const cancellableStatuses = ['pending', 'queued', 'initializing', 'running'];
    if (!cancellableStatuses.includes(jobResult.data.status)) {
      return NextResponse.json(
        { success: false, error: 'Job cannot be cancelled in current state' },
        { status: 400 }
      );
    }
    
    const result = await cancelPipelineJob(params.jobId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/cancel error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.4 Create Job Metrics Route

Create file: `src/app/api/pipeline/jobs/[jobId]/metrics/route.ts`

```typescript
/**
 * Pipeline Job Metrics API
 * 
 * GET - Get job training metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getPipelineJob, getPipelineJobMetrics } from '@/lib/services/pipeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify job ownership
    const jobResult = await getPipelineJob(params.jobId);
    
    if (!jobResult.success || !jobResult.data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (jobResult.data.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    const result = await getPipelineJobMetrics(params.jobId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.5 Create Engine Info Route

Create file: `src/app/api/pipeline/engines/route.ts`

```typescript
/**
 * Pipeline Engines API
 * 
 * GET - Get current loaded engine info
 * 
 * Note: Single engine architecture - this returns the currently loaded engine
 * There is no engine selection UI; this is for display purposes only.
 */

import { NextResponse } from 'next/server';
import { getCurrentEngine } from '@/lib/services/pipeline-service';

export async function GET() {
  try {
    const engine = getCurrentEngine();
    
    return NextResponse.json({
      success: true,
      data: {
        currentEngine: engine,
        // Single engine architecture - no list of engines
        message: 'Single engine architecture: only one engine loaded at a time',
      },
    });
  } catch (error) {
    console.error('GET /api/pipeline/engines error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 3: Create Zustand Store

Create file: `src/stores/pipelineStore.ts`

```typescript
/**
 * Pipeline Store
 * 
 * Global state management for pipeline configuration and active jobs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TrainingSensitivity,
  TrainingProgression,
  TrainingRepetition,
  PipelineTrainingJob,
  DEFAULT_ENGINE,
} from '@/types/pipeline';
import { estimateTrainingCost } from '@/lib/pipeline/hyperparameter-utils';

interface PipelineState {
  // Configuration state
  selectedFileId: string | null;
  selectedFileName: string | null;
  trainingSensitivity: TrainingSensitivity;
  trainingProgression: TrainingProgression;
  trainingRepetition: TrainingRepetition;
  jobName: string;
  
  // Active job tracking
  activeJobId: string | null;
  activeJob: PipelineTrainingJob | null;
  
  // Actions
  setSelectedFile: (id: string | null, name?: string | null) => void;
  setTrainingSensitivity: (value: TrainingSensitivity) => void;
  setTrainingProgression: (value: TrainingProgression) => void;
  setTrainingRepetition: (value: TrainingRepetition) => void;
  setJobName: (name: string) => void;
  setActiveJob: (job: PipelineTrainingJob | null) => void;
  resetConfiguration: () => void;
  
  // Computed getters
  getCostEstimate: () => {
    computeCost: number;
    evaluationCost: number;
    totalCost: number;
    estimatedDuration: string;
  };
  isConfigurationValid: () => boolean;
  getEngine: () => typeof DEFAULT_ENGINE;
}

const DEFAULT_CONFIG = {
  selectedFileId: null,
  selectedFileName: null,
  trainingSensitivity: 'medium' as TrainingSensitivity,
  trainingProgression: 'medium' as TrainingProgression,
  trainingRepetition: 3 as TrainingRepetition,
  jobName: '',
  activeJobId: null,
  activeJob: null,
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,
      
      // Setters
      setSelectedFile: (id, name) => set({ 
        selectedFileId: id, 
        selectedFileName: name || null 
      }),
      
      setTrainingSensitivity: (value) => set({ trainingSensitivity: value }),
      
      setTrainingProgression: (value) => set({ trainingProgression: value }),
      
      setTrainingRepetition: (value) => set({ trainingRepetition: value }),
      
      setJobName: (name) => set({ jobName: name }),
      
      setActiveJob: (job) => set({ 
        activeJob: job, 
        activeJobId: job?.id ?? null 
      }),
      
      resetConfiguration: () => set(DEFAULT_CONFIG),
      
      // Computed
      getCostEstimate: () => {
        const { trainingSensitivity, trainingProgression, trainingRepetition } = get();
        return estimateTrainingCost({
          trainingSensitivity,
          trainingProgression,
          trainingRepetition,
        });
      },
      
      isConfigurationValid: () => {
        const { selectedFileId, jobName } = get();
        return selectedFileId !== null && jobName.trim().length > 0;
      },
      
      getEngine: () => DEFAULT_ENGINE,
    }),
    {
      name: 'pipeline-config',
      partialize: (state) => ({
        // Only persist configuration, not active job
        trainingSensitivity: state.trainingSensitivity,
        trainingProgression: state.trainingProgression,
        trainingRepetition: state.trainingRepetition,
      }),
    }
  )
);
```

### Task 4: Create React Query Hooks

Create file: `src/hooks/usePipelineJobs.ts`

```typescript
/**
 * Pipeline Jobs Hooks
 * 
 * React Query hooks for pipeline job operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PipelineTrainingJob, 
  CreatePipelineJobRequest,
  PipelineJobListResponse,
  PipelineJobResponse,
} from '@/types/pipeline';

// ============================================
// Query Keys
// ============================================

export const pipelineKeys = {
  all: ['pipeline'] as const,
  jobs: () => [...pipelineKeys.all, 'jobs'] as const,
  jobList: (filters?: { status?: string; limit?: number }) => 
    [...pipelineKeys.jobs(), 'list', filters] as const,
  job: (id: string) => [...pipelineKeys.jobs(), 'detail', id] as const,
  jobMetrics: (id: string) => [...pipelineKeys.jobs(), 'metrics', id] as const,
  engines: () => [...pipelineKeys.all, 'engines'] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchPipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}): Promise<PipelineJobListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.status) params.set('status', options.status);
  
  const response = await fetch(`/api/pipeline/jobs?${params}`);
  return response.json();
}

async function fetchPipelineJob(jobId: string): Promise<PipelineJobResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}`);
  return response.json();
}

async function fetchPipelineJobMetrics(jobId: string) {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/metrics`);
  return response.json();
}

async function createPipelineJob(
  request: CreatePipelineJobRequest
): Promise<PipelineJobResponse> {
  const response = await fetch('/api/pipeline/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

async function cancelPipelineJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
  return response.json();
}

async function fetchEngineInfo() {
  const response = await fetch('/api/pipeline/engines');
  return response.json();
}

// ============================================
// Hooks
// ============================================

export function usePipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
}) {
  return useQuery({
    queryKey: pipelineKeys.jobList(options),
    queryFn: () => fetchPipelineJobs(options),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePipelineJob(jobId: string | null) {
  return useQuery({
    queryKey: pipelineKeys.job(jobId || ''),
    queryFn: () => fetchPipelineJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 5s if job is running
      const runningStatuses = ['pending', 'queued', 'initializing', 'running'];
      if (data?.data && runningStatuses.includes(data.data.status)) {
        return 5000;
      }
      return false;
    },
  });
}

export function usePipelineJobMetrics(jobId: string | null) {
  return useQuery({
    queryKey: pipelineKeys.jobMetrics(jobId || ''),
    queryFn: () => fetchPipelineJobMetrics(jobId!),
    enabled: !!jobId,
    refetchInterval: 10000, // Poll every 10s during training
  });
}

export function useCreatePipelineJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPipelineJob,
    onSuccess: () => {
      // Invalidate job list to show new job
      queryClient.invalidateQueries({ queryKey: pipelineKeys.jobs() });
    },
  });
}

export function useCancelPipelineJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelPipelineJob,
    onSuccess: (_, jobId) => {
      // Invalidate specific job and list
      queryClient.invalidateQueries({ queryKey: pipelineKeys.job(jobId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.jobs() });
    },
  });
}

export function useEngineInfo() {
  return useQuery({
    queryKey: pipelineKeys.engines(),
    queryFn: fetchEngineInfo,
    staleTime: 60 * 60 * 1000, // 1 hour - engine doesn't change at runtime
  });
}
```

### Task 5: Verify Implementation

#### 5.1 Verify API Routes Work

```bash
# Start dev server if not running
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run dev

# Test engines endpoint (no auth required for read)
curl http://localhost:3000/api/pipeline/engines
```

#### 5.2 Verify TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
```

#### 5.3 Verify Database Access via SAOL

```bash
# Test that new tables are queryable
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',limit:5});console.log('Query success:',r.success,'Count:',r.data.length);})();"
```

---

## Success Criteria

- [ ] Pipeline service layer functions work correctly
- [ ] All API routes return proper responses
- [ ] Zustand store manages state correctly
- [ ] React Query hooks fetch data correctly
- [ ] TypeScript compiles without errors
- [ ] Existing functionality is not broken
- [ ] Job creation with lay-person params works

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/services/pipeline-service.ts` | Backend service layer |
| `src/app/api/pipeline/jobs/route.ts` | Jobs list/create |
| `src/app/api/pipeline/jobs/[jobId]/route.ts` | Job detail |
| `src/app/api/pipeline/jobs/[jobId]/cancel/route.ts` | Job cancel |
| `src/app/api/pipeline/jobs/[jobId]/metrics/route.ts` | Job metrics |
| `src/app/api/pipeline/engines/route.ts` | Engine info |
| `src/stores/pipelineStore.ts` | Zustand store |
| `src/hooks/usePipelineJobs.ts` | React Query hooks |

---

## Next Section

After completing E02, proceed to:
**Section E03: UI Components & Pages**

E03 will build upon the API routes and hooks created in this section.

---

**END OF E02 PROMPT**
