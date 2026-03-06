# Build Section E05

**Product**: PIPELINE  
**Section**: 5 - Model Artifacts & Delivery  
**Generated**: 2025-12-26  
**Source**: 04e-pipeline-integrated-extension-spec_v1.md

---

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
