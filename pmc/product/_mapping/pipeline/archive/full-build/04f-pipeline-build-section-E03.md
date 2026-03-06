# Build Section E03

**Product**: PIPELINE  
**Section**: 3 - Training Configuration  
**Generated**: 2025-12-26  
**Source**: 04e-pipeline-integrated-extension-spec_v1.md

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
