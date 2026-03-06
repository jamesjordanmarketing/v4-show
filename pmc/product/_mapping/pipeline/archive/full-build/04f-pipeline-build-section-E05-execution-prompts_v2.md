# PIPELINE - Section E05: Model Artifacts & Delivery - Execution Prompts (v2)

**Product:** PIPELINE  
**Section:** 5 - Model Artifacts & Delivery  
**Generated:** December 29, 2025 (Updated)  
**Total Prompts:** 1  
**Estimated Total Time:** 6-7 hours  
**Source Section File:** 04f-pipeline-build-section-E05.md  
**Version:** 2.0 - Updated with deployed RunPod infrastructure

---

## 🔄 Version 2.0 Changes

**Updated to reflect deployed infrastructure:**
- ✅ RunPod Endpoint: See `.secrets/deployment-secrets.md` for actual endpoint URL
- ✅ RunPod API Key: See `.secrets/deployment-secrets.md` for actual API key
- ✅ Docker Image: `brighthub/brightrun-trainer:v1` (deployed to Docker Hub)
- ✅ Supabase Project: See `.secrets/deployment-secrets.md` for project details
- ✅ Table names corrected (no `lora_` prefix): `model_artifacts`, `training_jobs`, `metrics_points`, etc.
- ✅ Edge Function `process-training-jobs` confirmed deployed (Section E04)
- ✅ Storage bucket: `lora-models` (confirmed exists for model artifacts)

> **🔐 SECURITY NOTE**: All sensitive credentials (API keys, endpoints) are stored in `.secrets/deployment-secrets.md` (gitignored).  
> Agents implementing this section: Reference that file for actual values when deploying.

---

## Section Overview

Store trained model artifacts, calculate quality metrics, and provide secure download access.

**User Value**: Users can view training results, quality assessments, and download trained models for deployment

**What This Section Implements:**
- Automatic artifact creation when training jobs complete
- Download model files from GPU cluster and upload to Supabase Storage
- Calculate quality metrics from training history
- Model artifacts list page with quality ratings and search/sort
- Model detail page with download functionality
- Secure on-demand signed URLs for model downloads

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Model Artifacts & Delivery (Complete)** (6-7h)
   - Features: FR-5.1 (Artifact Creation), FR-5.3 (Model Pages)
   - Key Deliverables: Edge Function, API routes, React hooks, pages
   - Dependencies: Sections E01, E04

---

## Integration Context

### Dependencies from Previous Sections

This section builds upon:

#### Section E01: Foundation & Authentication
- Database table: `model_artifacts` (to store artifact records)
- Storage bucket: `lora-models` (for model file storage)
- Database table: `lora_notifications` (for user notifications)
- Type definitions: Model artifact interfaces

#### Section E02: Dataset Management
- Database table: `datasets` (to link artifacts to datasets)
- Used for: Dataset name display in artifact records

#### Section E03: Training Configuration
- Database table: `training_jobs` (to link artifacts to jobs)
- Used for: Training configuration and hyperparameters

#### Section E04: Training Execution & Monitoring
- Training job completion triggers artifact creation
- Database table: `lora_metrics_points` (for quality metric calculations)
- Job status progression: `completed` jobs without artifacts are processed

### Provides for Next Sections

This section provides:
- Trained model artifacts ready for deployment
- Quality assessments for model selection
- Download infrastructure for model distribution
- Historical model performance data

---

## Dependency Flow (This Section)

```
Section E04: Training Completion
  ↓
E05-P01: Artifact Creation Edge Function
  - Polls for completed jobs without artifacts
  - Downloads from GPU cluster
  - Uploads to Supabase Storage
  - Calculates quality metrics
  - Creates artifact record
  ↓
E05-P01: Model Artifacts Pages
  - List all user's trained models
  - Display quality ratings
  - Generate download URLs
  - Provide model details
```

---

# PROMPT 1: Model Artifacts & Delivery (Complete)

**Generated:** 2025-12-26  
**Section:** 5 - Model Artifacts & Delivery  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 6-7 hours  
**Prerequisites:** Sections E01, E02, E03, E04

---

## 🎯 Mission Statement

Implement the complete model artifacts and delivery system. This includes an Edge Function that automatically creates artifact records when training jobs complete, downloads model files from the GPU cluster, uploads them to Supabase Storage, and calculates quality metrics. Additionally, build the UI pages for users to browse, view, and download their trained models with quality ratings and detailed metadata.

This is the final functional section that completes the LoRA training pipeline, enabling users to access and deploy their trained models.

---

## 📦 Section Context

### This Section's Goal

Store trained model artifacts, calculate quality metrics, and provide secure download access. Users can view training results, assess model quality, and download trained models for deployment.

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E05. It implements:
- **FR-5.1**: Artifact Creation Edge Function (background processing)
- **FR-5.3**: Model Artifacts Pages (UI for browsing and downloading models)

---

## 🔗 Integration with Previous Work

### From Previous Sections

This prompt builds upon deliverables from four previous sections:

#### Section E01: Foundation & Authentication
**Database Tables We'll Use:**
- `model_artifacts` - Created in E01 migration - Store artifact records
- `lora_notifications` - Created in E01 migration - Notify users when models are ready
- `datasets` - Created in E01 migration - Link artifacts to source datasets

**Storage Buckets We'll Use:**
- `lora-models` - Created in E01 - Store model files (private bucket, up to 5GB per file)

**Types We'll Import:**
- Model artifact interfaces from `@/lib/types/lora-training.ts`

#### Section E02: Dataset Management
**Database Tables We'll Query:**
- `datasets` - Get dataset name for artifact naming

**Used For:**
- Displaying dataset information in artifact records
- Linking artifacts to their source training data

#### Section E03: Training Configuration
**Database Tables We'll Query:**
- `training_jobs` - Get job configuration and hyperparameters

**Used For:**
- Storing training configuration in artifact record
- Linking artifacts to training jobs

#### Section E04: Training Execution & Monitoring
**Database Tables We'll Query:**
- `training_jobs` - Find completed jobs without artifacts
- `lora_metrics_points` - Calculate quality metrics from training history

**Trigger:**
- Edge Function processes jobs with `status='completed'` and `artifact_id=null`

**Integration Flow:**
```
E04: Training completes → status='completed'
  ↓
E05: Edge Function polls every minute
  ↓
E05: Finds completed jobs without artifacts
  ↓
E05: Downloads from GPU cluster
  ↓
E05: Uploads to Supabase Storage
  ↓
E05: Calculates quality metrics
  ↓
E05: Creates artifact record
  ↓
E05: Links job.artifact_id to new artifact
  ↓
E05: Users can view and download model
```

### From Previous Prompts (This Section)

This is the first and only prompt in Section E05. No previous prompts in this section.

---

## 🎯 Implementation Requirements

### Feature FR-5.1: Artifact Creation Edge Function

**Type:** Background Processing  
**Strategy:** EXTENSION - Using Supabase Edge Functions (serverless), Supabase Storage, and existing database tables

#### Description

Create model artifact records when training jobs complete. This Edge Function:
1. Polls for completed jobs without artifacts
2. Downloads trained model files from GPU cluster
3. Uploads files to Supabase Storage
4. Calculates quality metrics from training history
5. Creates artifact record in database
6. Links artifact to job
7. Notifies user that model is ready

#### What Already Exists (Don't Rebuild)

- ✅ Supabase Edge Functions infrastructure
- ✅ `model_artifacts` table (from Section E01)
- ✅ `training_jobs` table (from Section E01)
- ✅ `lora_metrics_points` table (from Section E01)
- ✅ `lora-models` storage bucket (from Section E01)
- ✅ GPU cluster API access (configured in E04)

#### What We're Building (New in This Prompt)

- 🆕 `supabase/functions/create-model-artifacts/index.ts` - Edge Function for artifact creation
- 🆕 Cron trigger configuration for automated polling

#### Implementation Details

**Edge Function:** `supabase/functions/create-model-artifacts/index.ts`

**Purpose:** Background processor that creates model artifacts from completed training jobs

**Trigger:** Cron schedule (runs every 1 minute to check for completed jobs)

**Full Implementation:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration (RunPod Serverless)
// See .secrets/deployment-secrets.md for actual endpoint URL and API key
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Create Model Artifacts Edge Function
 * 
 * Triggered by cron schedule. This function:
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
      .from('training_jobs')
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

  // Get model files download URLs from GPU cluster (RunPod worker)
  // The RunPod Docker worker (brighthub/brightrun-trainer:v1) must implement this endpoint
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
    .from('metrics_points')  // Corrected table name
    .select('*')
    .eq('job_id', job.id)
    .order('timestamp', { ascending: true });

  const qualityMetrics = calculateQualityMetrics(metrics || [], job);

  // Fetch dataset info
  const { data: dataset } = await supabase
    .from('datasets')  // Corrected table name
    .select('name')
    .eq('id', job.dataset_id)
    .single();

  // Create artifact record
  const { data: artifact, error: artifactError } = await supabase
    .from('model_artifacts')  // Corrected table name
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
    .from('training_jobs')  // Corrected table name
    .update({ artifact_id: artifactId })
    .eq('id', job.id);

  // Create notification
  await supabase.from('notifications').insert({  // Corrected table name
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
  // Check if loss decreased over time
  const initialLoss = metrics[0].training_loss;
  const lossReduction = ((initialLoss - finalTrainingLoss) / initialLoss) * 100;

  let convergenceQuality = 'poor';
  let overallScore = 1;

  if (lossReduction > 50) {
    convergenceQuality = 'excellent';
    overallScore = 5;
  } else if (lossReduction > 30) {
    convergenceQuality = 'good';
    overallScore = 4;
  } else if (lossReduction > 15) {
    convergenceQuality = 'fair';
    overallScore = 3;
  } else if (lossReduction > 5) {
    convergenceQuality = 'poor';
    overallScore = 2;
  }

  // Check for overfitting (validation loss much higher than training loss)
  if (finalValidationLoss && finalTrainingLoss) {
    const gap = finalValidationLoss - finalTrainingLoss;
    if (gap > 0.5) {
      convergenceQuality = 'overfit';
      overallScore = Math.max(2, overallScore - 1);
    }
  }

  return {
    overall_score: overallScore,
    convergence_quality: convergenceQuality,
    final_training_loss: finalTrainingLoss,
    final_validation_loss: finalValidationLoss,
    perplexity: perplexity,
    loss_reduction_percent: lossReduction,
  };
}
```

**Key Points:**
- Runs on cron schedule (every 1 minute)
- Uses service role key for elevated permissions
- Downloads files from GPU cluster via external API
- Uploads to Supabase Storage at path: `{user_id}/{artifact_id}/{filename}`
- Calculates quality score (1-5 stars) based on loss reduction
- Creates notification when artifact is ready
- Links `job.artifact_id` to created artifact (marks job as processed)

**Deployment:**

```bash
# Deploy the Edge Function
supabase functions deploy create-model-artifacts

# Set environment variables in Supabase Dashboard → Edge Functions → Secrets
# See .secrets/deployment-secrets.md for actual credentials
# GPU_CLUSTER_API_URL=<see .secrets/deployment-secrets.md>
# GPU_CLUSTER_API_KEY=<see .secrets/deployment-secrets.md>
```

**Cron Schedule Configuration:**

In Supabase Dashboard → Edge Functions → Cron Jobs:
- Function: `create-model-artifacts`
- Schedule: `* * * * *` (every 1 minute)
- Enable: Yes

---

### Feature FR-5.3: Model Artifacts Pages

**Type:** UI Pages  
**Strategy:** EXTENSION - Using existing shadcn/ui components, React Query patterns, and Supabase Storage patterns

#### Description

Build pages for users to browse their trained models, view quality metrics, and download model files. Includes:
- Models list page with filtering and sorting
- Model detail page with download functionality
- API routes for listing and downloading models
- React Query hooks for data fetching

#### What Already Exists (Don't Rebuild)

- ✅ DashboardLayout component
- ✅ shadcn/ui components (Card, Button, Badge, Select, etc.)
- ✅ React Query configured
- ✅ Supabase Auth (`requireAuth()`)
- ✅ Supabase Storage with on-demand signed URLs pattern
- ✅ `model_artifacts` table with quality metrics

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/models/route.ts` - List models endpoint
- 🆕 `src/app/api/models/[modelId]/route.ts` - Get single model endpoint
- 🆕 `src/app/api/models/[modelId]/download/route.ts` - Generate download URLs endpoint
- 🆕 `src/hooks/useModels.ts` - React Query hooks for models
- 🆕 `src/app/(dashboard)/models/page.tsx` - Models list page
- 🆕 `src/app/(dashboard)/models/[modelId]/page.tsx` - Model detail page (to be implemented)

#### Implementation Details

**Part 1: React Query Hooks**

**File:** `src/hooks/useModels.ts`

**Purpose:** Data fetching hooks for models using React Query patterns

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

**Pattern Source:** Existing React Query patterns from Sections E02, E03, E04

---

**Part 2: API Routes**

**File:** `src/app/api/models/route.ts`

**Purpose:** List user's model artifacts with pagination and sorting

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/models - List user's model artifacts
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 12)
 * - sort: 'created_at' | 'quality' (default: 'created_at')
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'created_at';

    // Build query
    let query = supabase
      .from('model_artifacts')
      .select(`
        *,
        dataset:datasets!dataset_id(name),
        job:training_jobs!job_id(preset_id, created_at)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Apply sorting
    if (sort === 'quality') {
      query = query.order('quality_metrics->overall_score', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: models, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch models', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        models: models || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source:** Existing API patterns from Section E02 (dataset listing)

---

**File:** `src/app/api/models/[modelId]/route.ts`

**Purpose:** Get single model artifact with full details

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/models/[modelId] - Get single model artifact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { modelId } = params;

    // Fetch model with related data
    const { data: model, error } = await supabase
      .from('model_artifacts')
      .select(`
        *,
        dataset:datasets!dataset_id(id, name, format, total_training_pairs),
        job:training_jobs!job_id(id, preset_id, created_at, started_at, completed_at)
      `)
      .eq('id', modelId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !model) {
      return NextResponse.json(
        { error: 'Model not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

**File:** `src/app/api/models/[modelId]/download/route.ts`

**Purpose:** Generate signed download URLs for model files

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * POST /api/models/[modelId]/download - Generate signed download URLs
 * 
 * Request body:
 * - files?: string[] (optional - download specific files, or all if not provided)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const supabaseAdmin = createServerSupabaseAdminClient();
    const { modelId } = params;

    // Verify model belongs to user
    const { data: model, error: modelError } = await supabase
      .from('model_artifacts')
      .select('artifacts, name')
      .eq('id', modelId)
      .eq('user_id', user.id)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found or access denied' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const requestedFiles = body.files || Object.keys(model.artifacts);

    // Generate signed URLs for each file (valid for 1 hour)
    const downloadUrls: Record<string, string> = {};

    for (const fileName of requestedFiles) {
      const storagePath = model.artifacts[fileName];
      
      if (!storagePath) {
        console.warn(`File ${fileName} not found in artifact`);
        continue;
      }

      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('lora-models')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        console.error(`Failed to generate URL for ${fileName}:`, urlError);
        continue;
      }

      downloadUrls[fileName] = signedUrlData.signedUrl;
    }

    if (Object.keys(downloadUrls).length === 0) {
      return NextResponse.json(
        { error: 'No download URLs could be generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        model_id: modelId,
        model_name: model.name,
        download_urls: downloadUrls,
        expires_in_seconds: 3600,
      },
    });
  } catch (error: any) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URLs', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source:** Supabase Storage on-demand signed URLs (from Section E02 dataset uploads)

**Key Points:**
- Never store URLs in database - generate on-demand
- Use admin client for signing operations
- Set appropriate expiry (3600 seconds = 1 hour)
- Return multiple URLs for different model files

---

**Part 3: Models List Page**

**File:** `src/app/(dashboard)/models/page.tsx`

**Purpose:** Display all user's trained models with quality ratings, sorting, and pagination

```typescript
'use client';

import { useState } from 'react';
import { useModels } from '@/hooks/useModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Star, Calendar, Download, DollarSign } from 'lucide-react';
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
            Previous
          </Button>
          <div className="flex items-center px-4">
            Page {page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Pattern Source:** Existing page patterns from Sections E02, E03, E04

**Key Features:**
- Star rating display (1-5 stars based on quality score)
- Sort by most recent or highest quality
- Pagination for large model collections
- Empty state with call-to-action
- Card-based grid layout
- Quality badge showing convergence quality

---

**Part 4: Model Detail Page (Optional - Implement if time allows)**

**File:** `src/app/(dashboard)/models/[modelId]/page.tsx`

**Purpose:** Display detailed model information and provide download functionality

```typescript
'use client';

import { useState } from 'react';
import { useModel, useDownloadModel } from '@/hooks/useModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Star, 
  Calendar, 
  Download, 
  DollarSign, 
  Zap, 
  TrendingDown,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ModelDetailPage({ params }: { params: { modelId: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useModel(params.modelId);
  const downloadModel = useDownloadModel();
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleDownload = async () => {
    try {
      const result = await downloadModel.mutateAsync({ modelId: params.modelId });
      
      // Open each download URL in a new tab
      const urls = result.data.download_urls;
      for (const [fileName, url] of Object.entries(urls)) {
        window.open(url as string, '_blank');
      }
      
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load model details. {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const model = data.data;
  const qualityScore = model.quality_metrics.overall_score;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/models')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{model.name}</h1>
            <p className="text-gray-600 mt-1">{model.dataset?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < qualityScore
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <Badge className="bg-blue-500 text-white">
            {model.quality_metrics.convergence_quality}
          </Badge>
        </div>
      </div>

      {/* Download Success Alert */}
      {downloadComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Download URLs generated successfully. Model files will open in new tabs.
          </AlertDescription>
        </Alert>
      )}

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Metrics</CardTitle>
          <CardDescription>Model performance assessment</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Overall Score</div>
            <div className="text-2xl font-bold">{qualityScore}/5</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Convergence</div>
            <div className="text-2xl font-bold capitalize">
              {model.quality_metrics.convergence_quality}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Final Loss</div>
            <div className="text-2xl font-bold">
              {model.quality_metrics.final_training_loss?.toFixed(4) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Perplexity</div>
            <div className="text-2xl font-bold">
              {model.quality_metrics.perplexity?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Training Summary</CardTitle>
          <CardDescription>Training job details and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Epochs Completed:</span>
            <span className="font-semibold">{model.training_summary.epochs_completed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Steps:</span>
            <span className="font-semibold">{model.training_summary.total_steps?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Training Duration:</span>
            <span className="font-semibold">
              {model.training_summary.training_duration_hours?.toFixed(2)} hours
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Cost:</span>
            <span className="font-semibold text-green-600">
              ${model.training_summary.total_cost?.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Hyperparameters and GPU setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Hyperparameters</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Learning Rate: {model.configuration.hyperparameters.learning_rate}</div>
              <div>Batch Size: {model.configuration.hyperparameters.batch_size}</div>
              <div>Epochs: {model.configuration.hyperparameters.epochs}</div>
              <div>LoRA Rank: {model.configuration.hyperparameters.rank}</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">GPU Configuration</h4>
            <div className="text-sm">
              {model.configuration.gpu_config.count}x {model.configuration.gpu_config.type}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Files */}
      <Card>
        <CardHeader>
          <CardTitle>Model Files</CardTitle>
          <CardDescription>Available artifacts for download</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(model.artifacts).map((fileName) => (
            <div key={fileName} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="font-mono text-sm">{fileName}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Download Button */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.push('/models')}
          className="flex-1"
        >
          Back to Models
        </Button>
        <Button 
          onClick={handleDownload}
          disabled={downloadModel.isPending}
          className="flex-1"
        >
          {downloadModel.isPending ? (
            <>Generating URLs...</>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download All Files
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Pattern Source:** Existing detail page patterns from Section E04 (training monitor)

**Key Features:**
- Comprehensive model information display
- Quality metrics breakdown
- Training summary with cost and duration
- Configuration details (hyperparameters, GPU)
- List of downloadable files
- One-click download for all files
- Download URLs expire in 1 hour (security)

---

## ✅ Acceptance Criteria

### Functional Requirements

#### FR-5.1: Artifact Creation Edge Function
- [ ] Edge Function deploys successfully to Supabase
- [ ] Cron trigger runs every 1 minute
- [ ] Function finds completed jobs without artifacts
- [ ] Downloads model files from GPU cluster successfully
- [ ] Uploads files to Supabase Storage at correct paths
- [ ] Calculates quality score (1-5 stars) from training metrics
- [ ] Creates artifact record with all metadata
- [ ] Links artifact to training job (updates `job.artifact_id`)
- [ ] Creates notification for user when artifact is ready
- [ ] Handles errors gracefully (logs and continues to next job)

#### FR-5.3: Model Artifacts Pages
- [ ] Models list API returns user's artifacts with pagination
- [ ] Models list page displays all models in grid layout
- [ ] Star rating displays correctly (1-5 stars)
- [ ] Quality badge shows convergence quality
- [ ] Sort by "Most Recent" and "Highest Quality" works
- [ ] Pagination controls work correctly
- [ ] Empty state shows when no models exist
- [ ] Model detail page displays all information
- [ ] Download button generates signed URLs
- [ ] Download URLs open in new tabs
- [ ] Download URLs expire after 1 hour

### Technical Requirements

- [ ] No TypeScript errors in all files
- [ ] No linter warnings
- [ ] Edge Function logs visible in Supabase Dashboard
- [ ] API routes follow existing response format (`{ success, data }`)
- [ ] React Query hooks follow existing patterns
- [ ] shadcn/ui components used correctly
- [ ] Storage paths never stored as URLs (only paths)
- [ ] Signed URLs generated on-demand
- [ ] Admin client used for storage operations

### Integration Requirements

- [ ] Successfully queries `training_jobs` for completed jobs
- [ ] Successfully queries `lora_metrics_points` for quality calculation
- [ ] Successfully queries `datasets` for dataset info
- [ ] Successfully inserts into `model_artifacts`
- [ ] Successfully inserts into `lora_notifications`
- [ ] Successfully uploads to `lora-models` storage bucket
- [ ] Successfully generates signed URLs from Supabase Storage
- [ ] Navigation from training monitor to models page works
- [ ] Navigation from models list to model detail works

---

## 🧪 Testing & Validation

### Manual Testing Steps

**1. Edge Function Deployment**

```bash
# Deploy the Edge Function
cd /path/to/project
supabase functions deploy create-model-artifacts

# Verify deployment
supabase functions list

# Check logs (after cron runs)
supabase functions logs create-model-artifacts
```

**Expected Output:**
- Function appears in functions list
- No deployment errors
- Logs show function running every minute

**2. Artifact Creation Testing**

```sql
-- In Supabase SQL Editor
-- Find a completed job without artifact
SELECT * FROM training_jobs 
WHERE status = 'completed' 
AND artifact_id IS NULL
LIMIT 1;

-- Wait 1-2 minutes for Edge Function to run

-- Verify artifact was created
SELECT * FROM model_artifacts 
WHERE job_id = '{job_id_from_above}';

-- Verify job was linked
SELECT artifact_id FROM training_jobs 
WHERE id = '{job_id_from_above}';

-- Verify files in storage
-- Check Supabase Dashboard → Storage → lora-models bucket
-- Look for folder: {user_id}/{artifact_id}/
```

**Expected Results:**
- Artifact record exists in `model_artifacts`
- Job's `artifact_id` is no longer null
- Files visible in storage bucket
- User notification created

**3. Models List Page**

Navigate to: `http://localhost:3000/models`

**Test Cases:**
- [ ] Page loads without errors
- [ ] Shows loading skeleton initially
- [ ] Displays grid of model cards
- [ ] Each card shows:
  - Model name
  - Star rating (1-5)
  - Quality badge
  - Dataset name
  - Created date
  - Total cost
- [ ] Sort dropdown works (Most Recent / Highest Quality)
- [ ] Pagination appears if more than 12 models
- [ ] Empty state shows if no models

**4. Model Detail Page**

Navigate to: `http://localhost:3000/models/{model_id}`

**Test Cases:**
- [ ] Page loads model details
- [ ] Quality metrics section displays correctly
- [ ] Training summary shows all data
- [ ] Configuration section shows hyperparameters
- [ ] Model files section lists all artifacts
- [ ] Download button works
- [ ] Clicking download opens new tabs with file URLs
- [ ] URLs are valid and download files
- [ ] Success message appears after download

**5. Download URL Generation**

```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/models/{model_id}/download \
  -H "Cookie: {auth_cookie}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "model_id": "uuid",
    "model_name": "Model Name",
    "download_urls": {
      "adapter_model.safetensors": "https://...signed-url",
      "adapter_config.json": "https://...signed-url"
    },
    "expires_in_seconds": 3600
  }
}
```

**6. Integration Testing**

**Complete Flow:**
1. Start a training job (from Section E03)
2. Wait for job to complete (or simulate completion in Section E04)
3. Wait 1-2 minutes for artifact creation
4. Check notifications for "Model Ready" message
5. Navigate to `/models` page
6. Verify new model appears in list
7. Click on model card
8. Verify detail page loads
9. Click "Download All Files"
10. Verify files download successfully

**Expected Results:**
- All steps complete without errors
- Model appears in list immediately after artifact creation
- Downloads work correctly with valid URLs

---

### Expected Outputs

After completing this prompt, you should have:

**Edge Function:**
- [ ] `supabase/functions/create-model-artifacts/index.ts` deployed and running

**API Routes:**
- [ ] `src/app/api/models/route.ts` (list models)
- [ ] `src/app/api/models/[modelId]/route.ts` (get single model)
- [ ] `src/app/api/models/[modelId]/download/route.ts` (generate download URLs)

**React Hooks:**
- [ ] `src/hooks/useModels.ts` with 3 hooks (useModels, useModel, useDownloadModel)

**Pages:**
- [ ] `src/app/(dashboard)/models/page.tsx` (list page with grid, sorting, pagination)
- [ ] `src/app/(dashboard)/models/[modelId]/page.tsx` (detail page with download)

**Database:**
- [ ] At least one artifact record in `model_artifacts`
- [ ] Job linked to artifact (artifact_id set)
- [ ] Notification created for user

**Storage:**
- [ ] Model files uploaded to `lora-models` bucket
- [ ] Files organized by user_id and artifact_id

**Application:**
- [ ] Application runs without errors: `npm run dev`
- [ ] Models page accessible and functional
- [ ] Download functionality works end-to-end

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `supabase/functions/create-model-artifacts/index.ts` - Artifact creation Edge Function
- [ ] `src/app/api/models/route.ts` - List models API
- [ ] `src/app/api/models/[modelId]/route.ts` - Get model API
- [ ] `src/app/api/models/[modelId]/download/route.ts` - Download URLs API
- [ ] `src/hooks/useModels.ts` - React Query hooks for models
- [ ] `src/app/(dashboard)/models/page.tsx` - Models list page
- [ ] `src/app/(dashboard)/models/[modelId]/page.tsx` - Model detail page

### Existing Files Modified

None (all new files for this section)

### Database Changes

- [ ] Artifact records created in `model_artifacts` table
- [ ] Training jobs updated with `artifact_id` links
- [ ] Notifications created in `lora_notifications` table

### Storage Changes

- [ ] Model files uploaded to `lora-models` bucket
- [ ] Files organized in structure: `{user_id}/{artifact_id}/{filename}`

### Edge Functions

- [ ] `create-model-artifacts` deployed and running on cron schedule
- [ ] Cron trigger configured: `* * * * *` (every 1 minute)

### API Endpoints

- [ ] `GET /api/models` - List user's models
- [ ] `GET /api/models/[modelId]` - Get single model
- [ ] `POST /api/models/[modelId]/download` - Generate download URLs

### Pages

- [ ] `/models` - Models list page
- [ ] `/models/[modelId]` - Model detail page

---

## 🔜 What's Next

### For Next Section

**Next Section:** E06: Cost Tracking & Billing Dashboard

The next section will build upon the cost data stored during training:
- View cost breakdowns and historical spending
- Export cost reports
- Set spending limits and alerts

This section's deliverables will be used by the next section for:
- `model_artifacts.training_summary.total_cost` - Final cost per model
- `lora_cost_records` table (created by E04) - Detailed cost tracking
- Historical model creation costs for billing reports

### Section Complete

**This is the final functional section (E05) of the LoRA Training Pipeline.**

After this section:
- ✅ Users can upload datasets (E02)
- ✅ Users can configure training jobs (E03)
- ✅ Training executes on GPU cluster (E04)
- ✅ Models are automatically created and available for download (E05)

The pipeline is now fully functional end-to-end!

---

## ⚠️ Important Reminders

### 1. Follow the Spec Exactly

All code provided in this prompt comes from the integrated specification. Implement it as written. The patterns have been carefully chosen to match existing infrastructure.

### 2. Reuse Existing Infrastructure

Don't recreate what already exists. Import and use:
- Supabase Auth via `requireAuth()` from `@/lib/supabase-server`
- Supabase Client via `createServerSupabaseClient()`
- Supabase Admin Client via `createServerSupabaseAdminClient()` (for storage signing)
- shadcn/ui components from `@/components/ui/*`
- React Query for data fetching
- Existing API response format: `{ success: true, data }` or `{ error, details }`

### 3. Integration Points

When importing from previous work, add comments:

```typescript
// From Section E01, Prompt P01 - database schema
import type { Dataset } from '@/lib/types/lora-training';

// From Section E04 - completed training jobs
const { data: jobs } = await supabase
  .from('training_jobs')
  .select('*')
  .eq('status', 'completed');
```

### 4. Pattern Consistency

Match existing patterns:
- **API responses:** `{ success: true, data }` or `{ error, details }`
- **File organization:** Follow existing structure (api/hooks/app directories)
- **Component structure:** Use shadcn/ui patterns
- **Storage:** Never store URLs in database - only paths, generate signed URLs on-demand
- **Error handling:** Log errors, return user-friendly messages
- **Loading states:** Use Skeleton components during data fetching

### 5. Storage Best Practices

**CRITICAL:** Follow Supabase Storage patterns:
- Store only `storage_path` in database (e.g., `user_id/artifact_id/file.safetensors`)
- Generate signed URLs on-demand via API routes
- Use admin client for signing operations: `createServerSupabaseAdminClient()`
- Set appropriate expiry (3600 seconds = 1 hour for downloads)
- Never store URLs directly - they expire and create security issues

### 6. Edge Function Deployment

Deploy the Edge Function:

```bash
# Deploy
supabase functions deploy create-model-artifacts

# Configure cron in Supabase Dashboard
# Function: create-model-artifacts
# Schedule: * * * * * (every 1 minute)
```

### 7. Environment Variables

Ensure these are set in Supabase Dashboard:
- `GPU_CLUSTER_API_URL` - GPU cluster API endpoint
- `GPU_CLUSTER_API_KEY` - API key for authentication

### 8. Don't Skip Steps

Implement all features listed in this prompt before moving to the next section:
1. ✅ Edge Function for artifact creation
2. ✅ API routes for listing and downloading
3. ✅ React Query hooks
4. ✅ Models list page
5. ✅ Model detail page (if time allows)

---

## 📚 Reference Materials

### Files from Previous Work

#### Section E01: Foundation & Authentication
- `supabase/migrations/20241223_create_lora_training_tables.sql` - Database schema
- `src/lib/types/lora-training.ts` - Type definitions
- Storage buckets: `lora-datasets`, `lora-models`

#### Section E02: Dataset Management
- `src/app/api/datasets/route.ts` - Dataset API patterns
- `src/hooks/use-datasets.ts` - React Query patterns
- `src/app/(dashboard)/datasets/page.tsx` - List page patterns

#### Section E03: Training Configuration
- `src/app/api/jobs/route.ts` - Job creation patterns
- `src/hooks/useTrainingConfig.ts` - Configuration hooks
- `src/app/(dashboard)/training/configure/page.tsx` - Form patterns

#### Section E04: Training Execution & Monitoring
- `supabase/functions/process-training-jobs/index.ts` - Edge Function patterns
- `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` - Detail page patterns
- `lora_metrics_points` table - Training metrics for quality calculation

### Infrastructure Patterns

**Authentication:**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

**Database Query:**
```typescript
const supabase = createServerSupabaseClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```

**Storage Signed URLs:**
```typescript
const supabaseAdmin = createServerSupabaseAdminClient();
const { data } = await supabaseAdmin.storage
  .from('bucket-name')
  .createSignedUrl(storagePath, 3600); // 1 hour
```

**API Response Format:**
```typescript
// Success
return NextResponse.json({
  success: true,
  data: { /* data object */ }
});

// Error
return NextResponse.json(
  { error: 'Error message', details: 'More details' },
  { status: 400 }
);
```

**React Query Hook:**
```typescript
export function useData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      const response = await fetch('/api/endpoint');
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
  });
}
```

---

## 🎉 Ready to Implement Section E05!

This prompt provides everything you need to implement the complete Model Artifacts & Delivery system. You have:

- ✅ Complete Edge Function for automatic artifact creation
- ✅ Full API routes for listing and downloading models
- ✅ React Query hooks for data management
- ✅ Complete UI pages with quality ratings and downloads
- ✅ All integration points with previous sections clearly defined
- ✅ Comprehensive testing steps
- ✅ Clear acceptance criteria

**Expected Time:** 6-7 hours

**Key Focus Areas:**
1. Edge Function deployment and cron configuration (1.5h)
2. API routes with Supabase Storage integration (2h)
3. React hooks and models list page (2h)
4. Model detail page with download functionality (1.5h)
5. Testing and verification (1h)

After completing this prompt, the LoRA Training Pipeline will be **fully functional** with users able to:
- ✅ Upload datasets
- ✅ Configure training jobs
- ✅ Monitor training progress
- ✅ Download trained models
- ✅ View quality assessments

Let's build the final piece of the pipeline! 🚀

---

**End of Section E05 - Prompt P01**

