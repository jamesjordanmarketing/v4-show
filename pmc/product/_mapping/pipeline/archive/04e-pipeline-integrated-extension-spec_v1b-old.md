# BrightRun LoRA Training Platform - Integrated Extension Specification (Part B)

**Version:** 1.0  
**Date:** December 24, 2025  
**Part:** Sections 3-7  
**Companion Document:** 04e-pipeline-integrated-extension-spec_v1.md (Sections 1-2)

---

## SECTION 3: Training Configuration - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: Generic preset system, separate cost calculation service  
**Actual Infrastructure**: React Query forms with existing shadcn/ui components, inline cost calculation

---

### Overview (from original spec)

Enable users to configure training jobs with hyperparameter presets, advanced settings, and GPU selection.

**User Value**: Users can easily configure training parameters using presets or customize advanced settings with real-time cost estimates

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Auth (`requireAuth()` function)
- ✅ Database tables created (from Section 1)
- ✅ shadcn/ui components (Slider, Select, Card, Button, Label)
- ✅ React Query configured
- ✅ useDebounce hook (from existing codebase)

**Previous Section Prerequisites**:
- Section 1: `lora_training_jobs` table, `lora_datasets` table, type definitions
- Section 2: At least one dataset with `status='ready'` and `training_ready=true`

---

### Features & Requirements (INTEGRATED)

#### FR-3.1: Cost Estimation API

**Type**: API Endpoint

**Description**: Calculate estimated training cost based on GPU configuration, hyperparameters, and dataset size.

**Implementation Strategy**: EXTENSION (using existing Supabase patterns)

---

**API Routes (INTEGRATED)**:

**File**: `src/app/api/jobs/estimate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const EstimateRequestSchema = z.object({
  dataset_id: z.string().uuid(),
  gpu_config: z.object({
    type: z.enum(['A100-80GB', 'A100-40GB', 'H100', 'V100-32GB']),
    count: z.number().int().min(1).max(8),
  }),
  hyperparameters: z.object({
    batch_size: z.number().int().min(1).max(64),
    epochs: z.number().int().min(1).max(20),
    learning_rate: z.number().min(0.00001).max(0.001),
    rank: z.number().int().min(4).max(128),
  }),
});

/**
 * POST /api/jobs/estimate - Calculate cost estimate for training configuration
 * 
 * This endpoint calculates:
 * - Training duration based on dataset size and throughput
 * - Compute cost based on GPU pricing
 * - Storage cost for model artifacts
 * - Total estimated cost
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication (existing pattern)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse and validate request
    const body = await request.json();
    const validation = EstimateRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, gpu_config, hyperparameters } = validation.data;

    const supabase = createServerSupabaseClient();

    // Fetch dataset statistics for accurate duration estimation
    const { data: dataset, error: datasetError } = await supabase
      .from('lora_datasets')
      .select('total_training_pairs, total_tokens, name')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    // GPU pricing configuration (per hour, per GPU)
    const GPU_PRICING: Record<string, number> = {
      'A100-80GB': 3.50,
      'A100-40GB': 2.80,
      'H100': 4.20,
      'V100-32GB': 2.10,
    };

    // GPU throughput (tokens per second per GPU)
    const GPU_THROUGHPUT: Record<string, number> = {
      'A100-80GB': 1800,
      'A100-40GB': 1500,
      'H100': 2200,
      'V100-32GB': 1200,
    };

    const pricePerGpu = GPU_PRICING[gpu_config.type];
    const throughputPerGpu = GPU_THROUGHPUT[gpu_config.type];
    const hourlyRate = pricePerGpu * gpu_config.count;
    const totalThroughput = throughputPerGpu * gpu_config.count;

    // Calculate training duration
    const trainingPairs = dataset.total_training_pairs || 1000;
    const totalTokens = dataset.total_tokens || trainingPairs * 200;
    
    // Steps calculation
    const stepsPerEpoch = Math.ceil(trainingPairs / hyperparameters.batch_size);
    const totalSteps = stepsPerEpoch * hyperparameters.epochs;
    
    // Time calculation
    const avgTokensPerStep = (totalTokens / trainingPairs) * hyperparameters.batch_size;
    const secondsPerStep = avgTokensPerStep / totalThroughput;
    const totalTrainingSeconds = totalSteps * secondsPerStep;
    
    // Add overhead: initialization (10 min), validation between epochs (5 min/epoch), final save (5 min)
    const overheadSeconds = (10 * 60) + (hyperparameters.epochs * 5 * 60) + (5 * 60);
    const totalSeconds = totalTrainingSeconds + overheadSeconds;
    const estimatedHours = totalSeconds / 3600;

    // Cost calculation
    const computeCost = hourlyRate * estimatedHours;
    const storageCost = 0.50; // Model artifacts storage (~2-5GB in Supabase Storage)
    const totalCost = computeCost + storageCost;

    return NextResponse.json({
      success: true,
      data: {
        estimated_cost: parseFloat(totalCost.toFixed(2)),
        cost_breakdown: {
          compute: parseFloat(computeCost.toFixed(2)),
          storage: storageCost,
        },
        estimated_duration_hours: parseFloat(estimatedHours.toFixed(2)),
        hourly_rate: parseFloat(hourlyRate.toFixed(2)),
        training_details: {
          total_steps: totalSteps,
          steps_per_epoch: stepsPerEpoch,
          estimated_throughput_tokens_per_sec: totalThroughput,
          dataset_name: dataset.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate cost', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 2 (Database), Section 4 (API Architecture)

---

#### FR-3.2: Training Job Creation API

**Type**: API Endpoint

**Description**: Create training job record with validated configuration and queue for processing.

**Implementation Strategy**: EXTENSION (using existing Supabase patterns)

---

**File**: `src/app/api/jobs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Create job validation schema
const CreateJobSchema = z.object({
  dataset_id: z.string().uuid(),
  preset_id: z.enum(['fast', 'balanced', 'quality', 'custom']),
  gpu_config: z.object({
    type: z.string(),
    count: z.number().int().min(1).max(8),
  }),
  hyperparameters: z.object({
    learning_rate: z.number(),
    batch_size: z.number().int(),
    epochs: z.number().int(),
    rank: z.number().int(),
    alpha: z.number().optional(),
    dropout: z.number().optional(),
  }),
  estimated_cost: z.number(),
});

/**
 * POST /api/jobs - Create new training job
 * 
 * Flow:
 * 1. Validate dataset is ready
 * 2. Calculate total steps for progress tracking
 * 3. Create job record with status='queued'
 * 4. Edge Function (Section 4) will pick up and process
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const validation = CreateJobSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, preset_id, gpu_config, hyperparameters, estimated_cost } = validation.data;

    const supabase = createServerSupabaseClient();

    // Verify dataset exists, belongs to user, and is ready for training
    const { data: dataset, error: datasetError } = await supabase
      .from('lora_datasets')
      .select('id, name, training_ready, status, total_training_pairs')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    if (!dataset.training_ready || dataset.status !== 'ready') {
      return NextResponse.json(
        { 
          error: 'Dataset not ready for training',
          details: `Dataset must have status='ready' and training_ready=true. Current: status='${dataset.status}', training_ready=${dataset.training_ready}`
        },
        { status: 400 }
      );
    }

    // Calculate total steps for accurate progress tracking
    const stepsPerEpoch = Math.ceil((dataset.total_training_pairs || 1000) / hyperparameters.batch_size);
    const totalSteps = stepsPerEpoch * hyperparameters.epochs;

    // Create training job record
    const { data: job, error: jobError } = await supabase
      .from('lora_training_jobs')
      .insert({
        user_id: user.id,
        dataset_id,
        preset_id,
        status: 'queued',
        current_stage: 'queued',
        progress: 0,
        current_epoch: 0,
        total_epochs: hyperparameters.epochs,
        current_step: 0,
        total_steps: totalSteps,
        gpu_config,
        hyperparameters,
        estimated_total_cost: estimated_cost,
        current_cost: 0,
        current_metrics: {},
        queued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json(
        { error: 'Failed to create training job', details: jobError.message },
        { status: 500 }
      );
    }

    // Create notification for user
    await supabase.from('lora_notifications').insert({
      user_id: user.id,
      type: 'job_queued',
      title: 'Training Job Queued',
      message: `Your training job for "${dataset.name}" has been queued and will start shortly`,
      priority: 'low',
      action_url: `/training/jobs/${job.id}`,
      metadata: { job_id: job.id, dataset_name: dataset.name },
    });

    // Note: Edge Function (Section 4) will poll for queued jobs and process them
    // Status progression: queued → initializing → running → completed/failed

    return NextResponse.json({
      success: true,
      data: job,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create job', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs - List user's training jobs with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query with dataset join
    let query = supabase
      .from('lora_training_jobs')
      .select(`
        *,
        dataset:lora_datasets(name, format, total_training_pairs)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply optional status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 2 (Database), Section 4 (API Architecture)

---

#### FR-3.3: Training Configuration Page

**Type**: UI Page

**Description**: Interactive form for configuring training jobs with preset selection, custom hyperparameters, and real-time cost estimation.

**Implementation Strategy**: EXTENSION (using existing shadcn/ui components and React Query)

---

**React Hooks (INTEGRATED)**:

**File**: `src/hooks/useTrainingConfig.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for cost estimation with debouncing
 */
export function useEstimateCost() {
  return useMutation({
    mutationFn: async (config: {
      dataset_id: string;
      gpu_config: { type: string; count: number };
      hyperparameters: any;
    }) => {
      const response = await fetch('/api/jobs/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Cost estimation failed');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for creating training jobs
 */
export function useCreateTrainingJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Job creation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast({
        title: 'Success',
        description: 'Training job created and queued for processing',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for fetching training jobs with filters
 */
export function useTrainingJobs(params?: { 
  status?: string; 
  page?: number; 
  limit?: number;
}) {
  return useQuery({
    queryKey: ['training-jobs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/jobs?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch training jobs');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for fetching single job details
 */
export function useTrainingJob(jobId: string | null) {
  return useQuery({
    queryKey: ['training-job', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 5 seconds if job is active
      const status = data?.data?.status;
      return status === 'running' || status === 'queued' || status === 'initializing' 
        ? 5000 
        : false;
    },
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 6 (Data Fetching)

---

**Page Component (INTEGRATED)**:

**File**: `src/app/(dashboard)/training/configure/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEstimateCost, useCreateTrainingJob } from '@/hooks/useTrainingConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, Info, Zap, Target, Crown, ArrowLeft } from 'lucide-react';

// Preset configurations
const PRESETS = {
  fast: {
    name: 'Fast',
    icon: Zap,
    description: 'Quick training for testing and iteration',
    details: 'Optimized for speed, suitable for testing',
    learning_rate: 0.0001,
    batch_size: 8,
    epochs: 1,
    rank: 8,
    alpha: 16,
    dropout: 0.05,
  },
  balanced: {
    name: 'Balanced',
    icon: Target,
    description: 'Recommended balance of quality and cost',
    details: 'Best for most use cases',
    learning_rate: 0.00005,
    batch_size: 4,
    epochs: 3,
    rank: 16,
    alpha: 32,
    dropout: 0.1,
  },
  quality: {
    name: 'Quality',
    icon: Crown,
    description: 'Maximum quality for production models',
    details: 'Slower and more expensive, but best results',
    learning_rate: 0.00003,
    batch_size: 2,
    epochs: 5,
    rank: 32,
    alpha: 64,
    dropout: 0.1,
  },
};

export default function TrainingConfigurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get('datasetId');

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('balanced');
  const [hyperparameters, setHyperparameters] = useState(PRESETS.balanced);
  const [gpuType, setGpuType] = useState('A100-80GB');
  const [gpuCount, setGpuCount] = useState(2);

  const estimateCost = useEstimateCost();
  const createJob = useCreateTrainingJob();

  // Debounce configuration changes to avoid excessive API calls
  const debouncedConfig = useDebounce(
    { 
      dataset_id: datasetId, 
      gpu_config: { type: gpuType, count: gpuCount }, 
      hyperparameters 
    },
    500
  );

  // Auto-estimate cost when configuration changes
  useEffect(() => {
    if (datasetId) {
      estimateCost.mutate(debouncedConfig);
    }
  }, [debouncedConfig, datasetId]);

  const handlePresetChange = (preset: keyof typeof PRESETS) => {
    setSelectedPreset(preset);
    setHyperparameters(PRESETS[preset]);
  };

  const handleSubmit = async () => {
    if (!datasetId) return;

    const result = await createJob.mutateAsync({
      dataset_id: datasetId,
      preset_id: selectedPreset,
      gpu_config: { type: gpuType, count: gpuCount },
      hyperparameters,
      estimated_cost: estimateCost.data?.data.estimated_cost || 0,
    });

    if (result.success) {
      router.push(`/training/jobs/${result.data.id}`);
    }
  };

  const costData = estimateCost.data;
  const isLoading = createJob.isPending;

  // Handle missing dataset ID
  if (!datasetId) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No dataset selected. Please select a dataset from the datasets page.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.push('/datasets')}>
                Go to Datasets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configure Training Job</h1>
          <p className="text-gray-600 mt-1">
            Select a preset or customize hyperparameters for your training
          </p>
        </div>
      </div>

      {/* Preset Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Training Preset</CardTitle>
          <CardDescription>
            Choose a pre-configured profile optimized for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PRESETS).map(([key, preset]) => {
              const Icon = preset.icon;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key as keyof typeof PRESETS)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPreset === key
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${
                      selectedPreset === key ? 'text-primary' : 'text-gray-500'
                    }`} />
                    <h3 className="font-semibold">{preset.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Learning Rate: {preset.learning_rate}</div>
                    <div>Batch: {preset.batch_size} | Epochs: {preset.epochs}</div>
                    <div>LoRA Rank: {preset.rank}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* GPU Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GPU Configuration</CardTitle>
          <CardDescription>
            Select GPU type and number of GPUs for training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>GPU Type</Label>
            <Select value={gpuType} onValueChange={setGpuType}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A100-80GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA A100 80GB</span>
                    <span className="text-xs text-gray-500">$3.50/hr • Best overall performance</span>
                  </div>
                </SelectItem>
                <SelectItem value="A100-40GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA A100 40GB</span>
                    <span className="text-xs text-gray-500">$2.80/hr • Good for smaller models</span>
                  </div>
                </SelectItem>
                <SelectItem value="H100">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA H100</span>
                    <span className="text-xs text-gray-500">$4.20/hr • Fastest available</span>
                  </div>
                </SelectItem>
                <SelectItem value="V100-32GB">
                  <div className="flex flex-col">
                    <span className="font-medium">NVIDIA V100 32GB</span>
                    <span className="text-xs text-gray-500">$2.10/hr • Budget option</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Number of GPUs</Label>
              <span className="text-sm font-medium">{gpuCount}</span>
            </div>
            <Slider
              value={[gpuCount]}
              onValueChange={(value) => setGpuCount(value[0])}
              min={1}
              max={8}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              More GPUs = faster training via data parallelism. 
              {gpuCount > 1 && ` Training will be ${gpuCount}x faster (approximately).`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Hyperparameters */}
      <Card>
        <CardHeader>
          <CardTitle>Hyperparameters</CardTitle>
          <CardDescription>
            Fine-tune training parameters (based on {PRESETS[selectedPreset].name} preset)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Learning Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Learning Rate</Label>
              <span className="text-sm font-medium">{hyperparameters.learning_rate.toFixed(5)}</span>
            </div>
            <Slider
              value={[hyperparameters.learning_rate * 100000]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, learning_rate: value[0] / 100000 })
              }
              min={1}
              max={20}
              step={0.1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Lower = more stable training, Higher = faster convergence (but risky)
            </p>
          </div>

          {/* Batch Size */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Batch Size</Label>
              <span className="text-sm font-medium">{hyperparameters.batch_size}</span>
            </div>
            <Slider
              value={[hyperparameters.batch_size]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, batch_size: value[0] })
              }
              min={1}
              max={16}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Larger batch = faster training but requires more memory
            </p>
          </div>

          {/* Epochs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Training Epochs</Label>
              <span className="text-sm font-medium">{hyperparameters.epochs}</span>
            </div>
            <Slider
              value={[hyperparameters.epochs]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, epochs: value[0] })
              }
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              More epochs = better learning, but with diminishing returns
            </p>
          </div>

          {/* LoRA Rank */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>LoRA Rank</Label>
              <span className="text-sm font-medium">{hyperparameters.rank}</span>
            </div>
            <Slider
              value={[hyperparameters.rank]}
              onValueChange={(value) =>
                setHyperparameters({ ...hyperparameters, rank: value[0] })
              }
              min={4}
              max={64}
              step={4}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Higher rank = more expressive adapter, but larger model size
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      {estimateCost.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              <span className="text-gray-600">Calculating cost estimate...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {costData && !estimateCost.isPending && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Cost Estimate</CardTitle>
            <CardDescription>
              Estimated cost for this training configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Compute Cost:</span>
                <span className="font-semibold">
                  ${costData.data.cost_breakdown.compute.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Storage Cost:</span>
                <span className="font-semibold">
                  ${costData.data.cost_breakdown.storage.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3 mt-3">
                <span>Total Estimated Cost:</span>
                <span className="text-primary">
                  ${costData.data.estimated_cost.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-sm text-gray-600">
                <div>
                  <div className="font-medium">Duration</div>
                  <div>{costData.data.estimated_duration_hours.toFixed(1)} hours</div>
                </div>
                <div>
                  <div className="font-medium">Hourly Rate</div>
                  <div>${costData.data.hourly_rate.toFixed(2)}/hr</div>
                </div>
                <div>
                  <div className="font-medium">Total Steps</div>
                  <div>{costData.data.training_details.total_steps.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-medium">Throughput</div>
                  <div>{costData.data.training_details.estimated_throughput_tokens_per_sec.toLocaleString()} tok/s</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !datasetId || estimateCost.isPending}
          className="flex-1"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isLoading ? 'Creating Job...' : 'Start Training'}
        </Button>
      </div>
    </div>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 (Components), Section 6 (Data Fetching)

---

**Acceptance Criteria** (adjusted for infrastructure):

1. ✅ User can select from 3 preset configurations (Fast, Balanced, Quality)
2. ✅ User can customize all hyperparameters with sliders
3. ✅ User can select GPU type and count (1-8 GPUs)
4. ✅ Cost estimate updates in real-time (debounced to 500ms)
5. ✅ Cost estimate shows breakdown (compute + storage) and training details
6. ✅ Training job created with status='queued' when submitted
7. ✅ User redirected to job monitor page after creation
8. ✅ Form validates dataset exists and is ready before submission
9. ✅ Loading states shown during cost estimation and job creation
10. ✅ Toast notifications shown for success/error states

**Verification Steps**:

1. ✅ API: `/api/jobs/estimate` returns accurate cost calculation
2. ✅ API: `/api/jobs` creates job record with all configuration
3. ✅ API: Dataset validation prevents creating jobs for unready datasets
4. ✅ UI: Preset selection updates all hyperparameters immediately
5. ✅ UI: Slider adjustments trigger debounced cost recalculation
6. ✅ UI: Cost breakdown displays correctly with all details
7. ✅ Integration: Job creation succeeds and redirects to monitor page
8. ✅ Integration: Created job appears in jobs list with correct status

---

### Section Summary

**What Was Added**:
- API route: `POST /api/jobs/estimate` (cost estimation with GPU pricing and duration calculation)
- API route: `POST /api/jobs` (job creation with dataset validation)
- API route: `GET /api/jobs` (list jobs with pagination and filtering)
- React hooks: `useEstimateCost`, `useCreateTrainingJob`, `useTrainingJobs`, `useTrainingJob`
- Page: `/training/configure` (full configuration form with presets and custom settings)
- Preset configurations (Fast, Balanced, Quality)

**What Was Reused**:
- Supabase Auth (`requireAuth()` for all API routes)
- Supabase Client for database queries and inserts
- shadcn/ui components (Card, Slider, Select, Button, Label, Alert)
- React Query for mutations and queries
- Existing API response format (`{ success, data }` or `{ error, details }`)
- `useDebounce` hook for cost estimation optimization
- Toast notifications for user feedback
- Existing page layout patterns

**Integration Points**:
- Navigation: `/datasets/[id]` → `/training/configure?datasetId=[id]` (from dataset detail page)
- Database: References `lora_datasets` table to verify `training_ready` status
- Database: Inserts into `lora_training_jobs` table with `status='queued'`
- Section 4 Integration: Created jobs picked up by Edge Function for processing
- Status progression: `queued` → `initializing` → `running` → `completed`/`failed`

---


## SECTION 4: Training Execution & Monitoring - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: BullMQ + Redis job queue, Server-Sent Events (SSE)  
**Actual Infrastructure**: Supabase Edge Functions + Cron, React Query polling

---

### Overview (from original spec)

Execute training jobs on GPU cluster and provide real-time progress monitoring with metrics visualization.

**User Value**: Real-time visibility into training progress with detailed metrics, loss curves, and cost tracking

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Edge Functions capability
- ✅ External GPU cluster API access
- ✅ Section 1: Database tables (`lora_training_jobs`, `lora_metrics_points`)
- ✅ Section 3: Jobs created with `status='queued'`
- ✅ Recharts library (for loss curve visualization)

**Previous Section Prerequisites**:
- Section 3: Training jobs created and queued for processing

---

### Features & Requirements (INTEGRATED)

#### FR-4.1: Job Processing Edge Function

**Type**: Background Processing

**Description**: Poll for queued jobs, submit to GPU cluster, track progress, and update database.

**Implementation Strategy**: EXTENSION (using Supabase Edge Functions instead of BullMQ)

---

**Edge Function (INTEGRATED)**:

**File**: `supabase/functions/process-training-jobs/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Process training jobs edge function
 * 
 * This function runs on a cron schedule (every 30 seconds) and:
 * 1. Finds jobs with status='queued'
 * 2. Submits them to the GPU cluster
 * 3. Updates status to 'initializing'
 * 4. Polls running jobs for progress updates
 * 5. Updates metrics and progress in database
 * 6. Handles job completion and errors
 */
Deno.serve(async (req) => {
  try {
    console.log('[JobProcessor] Starting job processing cycle');

    // Process queued jobs (submit to GPU cluster)
    await processQueuedJobs();

    // Update running jobs (poll GPU cluster for progress)
    await updateRunningJobs();

    return new Response(
      JSON.stringify({ success: true, message: 'Job processing cycle complete' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JobProcessor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process queued jobs - submit to GPU cluster
 */
async function processQueuedJobs() {
  // Fetch jobs waiting to be submitted
  const { data: queuedJobs, error } = await supabase
    .from('lora_training_jobs')
    .select(`
      *,
      dataset:lora_datasets(storage_path, storage_bucket, total_training_pairs)
    `)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5); // Process up to 5 jobs per cycle

  if (error) {
    console.error('[JobProcessor] Error fetching queued jobs:', error);
    return;
  }

  if (!queuedJobs || queuedJobs.length === 0) {
    console.log('[JobProcessor] No queued jobs to process');
    return;
  }

  console.log(`[JobProcessor] Processing ${queuedJobs.length} queued jobs`);

  for (const job of queuedJobs) {
    try {
      // Update status to initializing
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'initializing',
          current_stage: 'initializing',
        })
        .eq('id', job.id);

      // Get signed URL for dataset
      const { data: signedUrlData } = await supabase.storage
        .from(job.dataset.storage_bucket)
        .createSignedUrl(job.dataset.storage_path, 3600 * 24); // 24 hour expiry

      if (!signedUrlData) {
        throw new Error('Failed to generate dataset signed URL');
      }

      // Submit job to GPU cluster
      const gpuJobPayload = {
        job_id: job.id,
        dataset_url: signedUrlData.signedUrl,
        hyperparameters: {
          ...job.hyperparameters,
          base_model: 'mistralai/Mistral-7B-v0.1',
        },
        gpu_config: job.gpu_config,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/training-callback`,
      };

      const response = await fetch(`${GPU_CLUSTER_API_URL}/training/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
        },
        body: JSON.stringify(gpuJobPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GPU cluster submission failed: ${errorData}`);
      }

      const gpuJob = await response.json();

      // Update job with external ID and status
      await supabase
        .from('lora_training_jobs')
        .update({
          external_job_id: gpuJob.external_job_id,
          status: 'running',
          current_stage: 'training',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[JobProcessor] Job ${job.id} submitted to GPU cluster: ${gpuJob.external_job_id}`);

      // Create notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_started',
        title: 'Training Started',
        message: `Your training job has started on ${job.gpu_config.count}x ${job.gpu_config.type}`,
        priority: 'medium',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });

    } catch (error) {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, error);
      
      // Mark job as failed
      await supabase
        .from('lora_training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_stack: error.stack,
        })
        .eq('id', job.id);

      // Create error notification
      await supabase.from('lora_notifications').insert({
        user_id: job.user_id,
        type: 'job_failed',
        title: 'Training Failed',
        message: `Your training job failed to start: ${error.message}`,
        priority: 'high',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });
    }
  }
}

/**
 * Update running jobs - poll GPU cluster for progress
 */
async function updateRunningJobs() {
  // Fetch jobs currently running
  const { data: runningJobs, error } = await supabase
    .from('lora_training_jobs')
    .select('*')
    .in('status', ['running', 'initializing'])
    .not('external_job_id', 'is', null);

  if (error) {
    console.error('[JobProcessor] Error fetching running jobs:', error);
    return;
  }

  if (!runningJobs || runningJobs.length === 0) {
    console.log('[JobProcessor] No running jobs to update');
    return;
  }

  console.log(`[JobProcessor] Updating ${runningJobs.length} running jobs`);

  for (const job of runningJobs) {
    try {
      // Poll GPU cluster for job status
      const response = await fetch(
        `${GPU_CLUSTER_API_URL}/training/status/${job.external_job_id}`,
        {
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`[JobProcessor] Failed to get status for job ${job.id}`);
        continue;
      }

      const gpuJobStatus = await response.json();

      // Update job progress and metrics
      const updates: any = {
        progress: gpuJobStatus.progress || job.progress,
        current_epoch: gpuJobStatus.current_epoch || job.current_epoch,
        current_step: gpuJobStatus.current_step || j
#### FR-4.4: Training Monitor Page

**Type**: UI Page

**Description**: Real-time training monitor with live metrics, loss curves, and progress tracking.

**Implementation Strategy**: EXTENSION (using React Query polling instead of SSE)

---

**Page Component (INTEGRATED)**:

**File**: `src/app/(dashboard)/training/jobs/[jobId]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { use} from 'react';
import { useTrainingJob } from '@/hooks/useTrainingConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingDown, 
  Zap, 
  DollarSign,
  Clock,
  Cpu,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

export default function TrainingMonitorPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useTrainingJob(params.jobId);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load training job. {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const job = data.data.job;
  const metrics = data.data.metrics || [];
  const costRecords = data.data.cost_records || [];

  // Status badge configuration
  const statusConfig = {
    queued: { color: 'bg-blue-500', icon: Clock, label: 'Queued' },
    initializing: { color: 'bg-yellow-500', icon: Loader2, label: 'Initializing' },
    running: { color: 'bg-green-500', icon: Activity, label: 'Running' },
    completed: { color: 'bg-emerald-600', icon: CheckCircle2, label: 'Completed' },
    failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'bg-gray-500', icon: XCircle, label: 'Cancelled' },
  };

  const statusInfo = statusConfig[job.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  // Prepare metrics data for chart
  const chartData = metrics.map((m: any) => ({
    step: m.step,
    epoch: m.epoch,
    training_loss: m.training_loss,
    validation_loss: m.validation_loss,
    learning_rate: m.learning_rate * 10000, // Scale for visibility
  }));

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        setShowCancelConfirm(false);
        // Job will be updated via polling
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/training/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Training Monitor</h1>
            <p className="text-gray-600 mt-1">{job.dataset?.name || 'Training Job'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusInfo.color} flex items-center gap-2 text-white px-3 py-1`}>
            <StatusIcon className="h-4 w-4" />
            {statusInfo.label}
          </Badge>
          {['queued', 'initializing', 'running'].includes(job.status) && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Job
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Are you sure you want to cancel this training job?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                No
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                Yes, Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {job.status === 'running' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-semibold">{job.progress.toFixed(1)}%</span>
              </div>
              <Progress value={job.progress} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Epoch {job.current_epoch} / {job.total_epochs}</span>
                <span>Step {job.current_step?.toLocaleString()} / {job.total_steps?.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Training Loss */}
        {job.current_metrics?.training_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Training Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.training_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Loss */}
        {job.current_metrics?.validation_loss && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                Validation Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.validation_loss.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Throughput */}
        {job.current_metrics?.throughput && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {job.current_metrics.throughput.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">tokens/sec</div>
            </CardContent>
          </Card>
        )}

        {/* Current Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
            

## SECTION 5: Model Artifacts & Delivery - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: S3 for model storage, separate download service  
**Actual Infrastructure**: Supabase Storage with on-demand signed URLs

---

### Overview (from original spec)

Store trained model artifacts, calculate quality metrics, and provide secure download access.

**User Value**: Users can view training results, quality assessments, and download trained models for deployment

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Storage configured (`lora-models` bucket)
- ✅ Section 1: `lora_model_artifacts` table
- ✅ Section 4: Completed training jobs trigger artifact creation

**Previous Section Prerequisites**:
- Section 4: Training job completion triggers artifact creation flow

---

### Features & Requirements (INTEGRATED)

#### FR-5.1: Artifact Creation Edge Function

**Type**: Background Processing

**Description**: Create model artifact records when training jobs complete, download from GPU cluster, upload to storage.

**Implementation Strategy**: EXTENSION (using Supabase Edge Functions and Storage)

---

**Edge Function (INTEGRATED)**:

**File**: `supabase/functions/create-model-artifacts/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Create Model Artifacts Edge Function
 * 
 * Triggered when training jobs complete. This function:
 * 1. Finds completed jobs without artifacts
 * 2. Downloads model files from GPU cluster
 * 3. Uploads to Supabase Storage
 * 4. Calculates quality metrics
 * 5. Creates artifact record
 * 6. Links artifact to job
 */
Deno.serve(async (req) => {
  try {
    console.log('[ArtifactCreator] Starting artifact creation cycle');

    // Find completed jobs without artifacts
    const { data: completedJobs, error } = await supabase
      .from('lora_training_jobs')
      .select('*')
      .eq('status', 'completed')
      .is('artifact_id', null)
      .not('external_job_id', 'is', null);

    if (error) {
      console.error('[ArtifactCreator] Error fetching completed jobs:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!completedJobs || completedJobs.length === 0) {
      console.log('[ArtifactCreator] No completed jobs waiting for artifacts');
      return new Response(JSON.stringify({ message: 'No jobs to process' }));
    }

    console.log(`[ArtifactCreator] Processing ${completedJobs.length} completed jobs`);

    for (const job of completedJobs) {
      try {
        await createArtifactForJob(job);
      } catch (error) {
        console.error(`[ArtifactCreator] Error creating artifact for job ${job.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: completedJobs.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ArtifactCreator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function createArtifactForJob(job: any) {
  console.log(`[ArtifactCreator] Creating artifact for job ${job.id}`);

  // Get model files download URLs from GPU cluster
  const response = await fetch(
    `${GPU_CLUSTER_API_URL}/training/artifacts/${job.external_job_id}`,
    {
      headers: { 'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get artifact URLs from GPU cluster`);
  }

  const artifactData = await response.json();
  const { download_urls, model_metadata } = artifactData;

  // Download and upload each artifact file
  const artifactId = crypto.randomUUID();
  const storagePath = `${job.user_id}/${artifactId}`;
  const uploadedFiles: Record<string, string> = {};

  for (const [fileName, downloadUrl] of Object.entries(download_urls)) {
    try {
      // Download file from GPU cluster
      const fileResponse = await fetch(downloadUrl as string);
      if (!fileResponse.ok) {
        console.error(`Failed to download ${fileName}`);
        continue;
      }

      const fileBlob = await fileResponse.blob();
      const fileBuffer = await fileBlob.arrayBuffer();

      // Upload to Supabase Storage
      const uploadPath = `${storagePath}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('lora-models')
        .upload(uploadPath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for ${fileName}:`, uploadError);
        continue;
      }

      uploadedFiles[fileName] = uploadPath;
      console.log(`[ArtifactCreator] Uploaded ${fileName} to ${uploadPath}`);
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
    }
  }

  // Calculate quality metrics from training history
  const { data: metrics } = await supabase
    .from('lora_metrics_points')
    .select('*')
    .eq('job_id', job.id)
    .order('timestamp', { ascending: true });

  const qualityMetrics = calculateQualityMetrics(metrics || [], job);

  // Fetch dataset info
  const { data: dataset } = await supabase
    .from('lora_datasets')
    .select('name')
    .eq('id', job.dataset_id)
    .single();

  // Create artifact record
  const { data: artifact, error: artifactError } = await supabase
    .from('lora_model_artifacts')
    .insert({
      id: artifactId,
      user_id: job.user_id,
      job_id: job.id,
      dataset_id: job.dataset_id,
      name: `${dataset?.name || 'Model'} - ${new Date().toLocaleDateString()}`,
      version: '1.0.0',
      status: 'stored',
      quality_metrics: qualityMetrics,
      training_summary: {
        epochs_completed: job.current_epoch,
        total_steps: job.current_step,
        final_loss: job.current_metrics?.training_loss,
        training_duration_hours: (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / (1000 * 60 * 60),
        total_cost: job.final_cost,
      },
      configuration: {
        preset_id: job.preset_id,
        hyperparameters: job.hyperparameters,
        gpu_config: job.gpu_config,
      },
      artifacts: uploadedFiles,
    })
    .select()
    .single();

  if (artifactError) {
    throw new Error(`Failed to create artifact record: ${artifactError.message}`);
  }

  // Link artifact to job
  await supabase
    .from('lora_training_jobs')
    .update({ artifact_id: artifactId })
    .eq('id', job.id);

  // Create notification
  await supabase.from('lora_notifications').insert({
    user_id: job.user_id,
    type: 'artifact_ready',
    title: 'Model Ready for Download',
    message: `Your trained model is ready. Quality score: ${qualityMetrics.overall_score}/5 stars`,
    priority: 'high',
    action_url: `/models/${artifactId}`,
    metadata: { artifact_id: artifactId, job_id: job.id },
  });

  console.log(`[ArtifactCreator] Artifact ${artifactId} created for job ${job.id}`);
}

/**
 * Calculate quality metrics from training metrics history
 */
function calculateQualityMetrics(metrics: any[], job: any) {
  if (metrics.length === 0) {
    return {
      overall_score: 3,
      convergence_quality: 'unknown',
      final_training_loss: null,
      final_validation_loss: null,
      perplexity: null,
    };
  }

  const finalMetrics = metrics[metrics.length - 1];
  const finalTrainingLoss = finalMetrics.training_loss;
  const finalValidationLoss = finalMetrics.validation_loss;

  // Calculate perplexity (exp of loss)
  const perplexity = finalValidationLoss ? Math.exp(finalValidationLoss) : null;

  // Assess convergence quality
  
#### FR-5.3: Model Artifacts Pages

**Type**: UI Pages

**Description**: List and detail pages for browsing and downloading trained models.

**Implementation Strategy**: EXTENSION (using existing shadcn/ui components)

---

**React Hooks (INTEGRATED)**:

**File**: `src/hooks/useModels.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

export function useModels(params?: { page?: number; limit?: number; sort?: string }) {
  return useQuery({
    queryKey: ['models', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);

      const response = await fetch(`/api/models?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      return response.json();
    },
  });
}

export function useModel(modelId: string | null) {
  return useQuery({
    queryKey: ['model', modelId],
    queryFn: async () => {
      const response = await fetch(`/api/models/${modelId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch model');
      }
      
      return response.json();
    },
    enabled: !!modelId,
  });
}

export function useDownloadModel() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ modelId, files }: { modelId: string; files?: string[] }) => {
      const response = await fetch(`/api/models/${modelId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate download URLs');
      }
      
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Download Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 6 (Data Fetching)

---

**Models List Page (INTEGRATED)**:

**File**: `src/app/(dashboard)/models/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useModels } from '@/hooks/useModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Star, Calendar, Download, DollarSign, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ModelsPage() {
  const [sortBy, setSortBy] = useState('created_at');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useModels({ page, sort: sortBy, limit: 12 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const models = data?.data?.models || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Model Artifacts</h1>
          <p className="text-gray-500">Browse and download your trained models</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {pagination?.total || 0} models total
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Most Recent</SelectItem>
            <SelectItem value="quality">Highest Quality</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Models Grid */}
      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No models yet</h3>
            <p className="text-gray-500 mb-4">
              Complete a training job to create your first model
            </p>
            <Link href="/training/configure">
              <Button>Start Training</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model: any) => (
            <Link key={model.id} href={`/models/${model.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < model.quality_metrics.overall_score
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {model.dataset?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Quality:</span>
                    <Badge variant="outline">
                      {model.quality_metrics.convergence_quality}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created:
                    </span>
                    <span>{new Date(model.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Cost:
                    </span>
                    <span>${(model.training_summary?.total_cost || 0).toFixed(2)}</span>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    View & Download
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            

## SECTION 6: Cost Tracking & Notifications - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: Separate notification service, external analytics  
**Actual Infrastructure**: Database tables with React Query polling, in-app notifications

---

### Overview (from original spec)

Track training costs in real-time and notify users of important events throughout the training lifecycle.

**User Value**: Transparent cost tracking and timely notifications keep users informed and in control

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Section 1: `lora_cost_records` and `lora_notifications` tables
- ✅ Section 4: Cost tracking integrated into job processing

**Previous Section Prerequisites**:
- Sections 4-5: Cost records and notifications already being created

---

### Features & Requirements (INTEGRATED)

#### FR-6.1: Cost Dashboard API

**Type**: API Endpoint

**Description**: Aggregate cost data for analytics and budget tracking.

**Implementation Strategy**: EXTENSION (using existing Supabase patterns)

---

**File**: `src/app/api/costs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/costs - Get cost analytics with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const period = searchParams.get('period') || 'month'; // month, week, year
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Calculate date range
    let dateFilter;
    if (startDate && endDate) {
      dateFilter = { gte: startDate, lte: endDate };
    } else {
      const now = new Date();
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: weekAgo.toISOString() };
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: yearAgo.toISOString() };
      } else {
        // month (default)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: monthAgo.toISOString() };
      }
    }

    // Fetch cost records
    const { data: costs, error } = await supabase
      .from('lora_cost_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_at', dateFilter.gte)
      .order('recorded_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch costs', details: error.message },
        { status: 500 }
      );
    }

    // Calculate aggregates
    const totalCost = costs?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
    const byType = costs?.reduce((acc: any, record) => {
      acc[record.cost_type] = (acc[record.cost_type] || 0) + parseFloat(record.amount);
      return acc;
    }, {});

    // Group by day for chart data
    const byDay = costs?.reduce((acc: any, record) => {
      const date = record.recorded_at.split('T')[0];
      acc[date] = (acc[date] || 0) + parseFloat(record.amount);
      return acc;
    }, {});

    const chartData = Object.entries(byDay || {}).map(([date, amount]) => ({
      date,
      amount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total_cost: parseFloat(totalCost.toFixed(2)),
        cost_by_type: byType,
        chart_data: chartData,
        records: costs || [],
      },
    });
  } catch (error: any) {
    console.error('Costs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 (API Architecture)

---

#### FR-6.2: Notifications API

**Type**: API Endpoints

**Description**: Fetch and manage user notifications.

**Implementation Strategy**: EXTENSION (using existing patterns)

---

**File**: `src/app/api/notifications/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/notifications - Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('lora_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    // Count unread
    const { count: unreadCount } = await supabase
      .from('lora_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications || [],
        unread_count: unreadCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}
```

**File**: `src/app/api/notifications/[id]/read/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * PATCH /api/notifications/[id]/read - Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('lora_notifications')
      .update({ read: true })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update notification', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 (API Architecture)

---

### Section Summary

**What Was Added**:
- API route: `GET /api/costs` (cost analytics with aggregation)
- API route: `GET /api/notifications` (list notifications with unread count)
- API route: `PATCH /api/notifications/[id]/read` (mark as read)

**What Was Reused**:
- Cost tracking already integrated in Section 4
- Notifications already being created throughout the system
- Existing API patterns and authentication

**Integration Points**:
- Sections 3-5: Cost records created during training
- Sections 3-5: Notifications created for all key events
- Database: `lora_cost_records` and `lora_notifications` tables

**Note**: UI components for cost dashboard and notifications bell are intentionally minimal in this spec. These can be implemented as simple additions to the existing dashboard layout.

---

## SECTION 7: Complete System Integration - INTEGRATED

**Exte
