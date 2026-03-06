# BrightRun LoRA Training Platform - Integrated Extension Specification

**Version:** 1.0  
**Date:** December 24, 2025  
**Source:** 04c-pipeline-structured-from-wireframe_v1.md  
**Integration Basis:** Infrastructure Inventory v1, Extension Strategy v1, Implementation Guide v1

---

## INTEGRATION SUMMARY

This specification describes how to implement the BrightRun LoRA Training Platform as an EXTENSION to the existing BrightHub application.

**Approach**: EXTENSION (not separate application)

**Infrastructure Decisions**:
- ✅ Use existing Supabase Auth (not NextAuth)
- ✅ Use existing Supabase PostgreSQL (not Prisma)
- ✅ Use existing Supabase Storage (not S3)
- ✅ Use existing shadcn/ui components
- ✅ Use existing React Query (not SWR)
- ✅ Use Edge Functions + Cron (not BullMQ + Redis)

**What We're Adding**:
- 7 new database tables
- 2 new storage buckets
- ~25 new API routes
- ~8-10 new pages
- ~25-30 new components
- ~15 new hooks
- 2 Edge Functions

**What We're NOT Creating**:
- ❌ New authentication system
- ❌ New database client
- ❌ New storage client
- ❌ Job queue infrastructure
- ❌ Component library

---

## SECTION 1: Foundation & Authentication - INTEGRATED

**Extension Status**: ✅ Most infrastructure ALREADY EXISTS - only adding LoRA-specific tables

**Original Infrastructure** (from spec): NextAuth.js, Prisma ORM, base layouts  
**Actual Infrastructure** (what we're using): Supabase Auth, Supabase PostgreSQL, existing DashboardLayout

---

### Overview (from original spec)

This section establishes the foundational infrastructure. However, since we're EXTENDING an existing application, most of this already exists.

**What Already Exists**:
- ✅ Next.js 14 App Router with TypeScript
- ✅ Supabase Auth with protected routes
- ✅ Supabase PostgreSQL database
- ✅ Supabase Storage
- ✅ shadcn/ui components (47+ components)
- ✅ Dashboard layout and routing
- ✅ React Query for data fetching

**What We're Adding** (LoRA Training specific):
- New database tables: `datasets`, `training_jobs`, `metrics_points`, `model_artifacts`, `cost_records`, `notifications`
- New storage buckets: `lora-datasets`, `lora-models`

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Auth configured (`@/lib/supabase-server`, `@/lib/auth-service`)
- ✅ Supabase Database client (`createServerSupabaseClient()`)
- ✅ Supabase Storage configured (environment variables)
- ✅ DashboardLayout component (`(dashboard)/layout.tsx`)
- ✅ shadcn/ui components in `/components/ui/`
- ✅ React Query provider configured

**Previous Section Prerequisites**: N/A (foundation section)

---

### Features & Requirements (INTEGRATED)

#### FR-1.1: Database Schema for LoRA Training

**Type**: Data Model

**Description**: Create new PostgreSQL tables for LoRA training features using Supabase migrations.

**Implementation Strategy**: EXTENSION (using existing Supabase database)

---

**Database Changes (INTEGRATED)**:

Instead of Prisma, use **Supabase Client** with direct SQL migration:

**Migration File**: `supabase/migrations/20241223_create_lora_training_tables.sql`

```sql
-- ============================================
-- BrightRun LoRA Training Module
-- Migration: Create LoRA Training Tables
-- ============================================

BEGIN;

-- DATASETS TABLE
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  format VARCHAR(50) DEFAULT 'brightrun_lora_v4',
  status VARCHAR(50) DEFAULT 'uploading',
  storage_bucket VARCHAR(100) DEFAULT 'lora-datasets',
  storage_path TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  total_training_pairs INTEGER,
  total_validation_pairs INTEGER,
  total_tokens BIGINT,
  avg_turns_per_conversation DECIMAL(10, 2),
  avg_tokens_per_turn DECIMAL(10, 2),
  training_ready BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_errors JSONB,
  sample_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_datasets_created_at ON datasets(created_at DESC);

-- RLS Policies
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id);

-- TRAINING_JOBS TABLE
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  preset_id VARCHAR(50) NOT NULL,
  hyperparameters JSONB NOT NULL,
  gpu_config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  current_stage VARCHAR(50) DEFAULT 'queued',
  progress DECIMAL(5, 2) DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER NOT NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  current_metrics JSONB,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  current_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_total_cost DECIMAL(10, 2) NOT NULL,
  final_cost DECIMAL(10, 2),
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  external_job_id VARCHAR(255) UNIQUE,
  artifact_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_jobs_user_id ON training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_dataset_id ON training_jobs(dataset_id);

-- RLS Policies
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- METRICS_POINTS TABLE
CREATE TABLE IF NOT EXISTS metrics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  epoch INTEGER NOT NULL,
  step INTEGER NOT NULL,
  training_loss DECIMAL(10, 6) NOT NULL,
  validation_loss DECIMAL(10, 6),
  learning_rate DECIMAL(12, 10) NOT NULL,
  gradient_norm DECIMAL(10, 6),
  throughput DECIMAL(10, 2),
  gpu_utilization DECIMAL(5, 2)
);

CREATE INDEX idx_metrics_points_job_id ON metrics_points(job_id);
CREATE INDEX idx_metrics_points_timestamp ON metrics_points(job_id, timestamp DESC);

-- MODEL_ARTIFACTS TABLE
CREATE TABLE IF NOT EXISTS model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE REFERENCES training_jobs(id) ON DELETE RESTRICT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  description TEXT,
  status VARCHAR(50) DEFAULT 'stored',
  deployed_at TIMESTAMPTZ,
  quality_metrics JSONB NOT NULL,
  training_summary JSONB NOT NULL,
  configuration JSONB NOT NULL,
  artifacts JSONB NOT NULL,
  parent_model_id UUID REFERENCES model_artifacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_model_artifacts_user_id ON model_artifacts(user_id);
CREATE INDEX idx_model_artifacts_job_id ON model_artifacts(job_id);

-- RLS Policies
ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON model_artifacts FOR SELECT
  USING (auth.uid() = user_id);

-- COST_RECORDS TABLE
CREATE TABLE IF NOT EXISTS cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,
  cost_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  details JSONB,
  billing_period DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_records_user_id ON cost_records(user_id);
CREATE INDEX idx_cost_records_billing_period ON cost_records(user_id, billing_period DESC);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read, created_at DESC);

-- Add foreign key from training_jobs to model_artifacts
ALTER TABLE training_jobs
ADD CONSTRAINT fk_training_jobs_artifact
FOREIGN KEY (artifact_id) REFERENCES model_artifacts(id);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_jobs_updated_at BEFORE UPDATE ON training_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_artifacts_updated_at BEFORE UPDATE ON model_artifacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**Pattern Source**: Infrastructure Inventory Section 2 - Database Infrastructure

**Storage Buckets to Create** (via Supabase Dashboard):

1. **Bucket**: `lora-datasets`
   - Public: No (private)
   - File size limit: 500 MB
   - Allowed MIME types: `application/json`, `application/x-jsonlines`

2. **Bucket**: `lora-models`
   - Public: No (private)
   - File size limit: 5 GB
   - Allowed MIME types: `application/octet-stream`, `application/x-tar`, `application/json`

---

**TypeScript Interfaces:**

**File**: `src/lib/types/lora-training.ts`

```typescript
// Enums
export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';
export type JobStatus = 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PresetId = 'conservative' | 'balanced' | 'aggressive' | 'custom';

// Dataset Interface
export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: 'brightrun_lora_v4' | 'brightrun_lora_v3';
  status: DatasetStatus;
  storage_bucket: string;
  storage_path: string;  // NEVER store URLs - only paths
  file_name: string;
  file_size: number;
  total_training_pairs: number | null;
  total_validation_pairs: number | null;
  total_tokens: number | null;
  avg_turns_per_conversation: number | null;
  avg_tokens_per_turn: number | null;
  training_ready: boolean;
  validated_at: string | null;
  validation_errors: ValidationError[] | null;
  sample_data: any | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Training Job Interface
export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  status: JobStatus;
  current_stage: string;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number | null;
  current_metrics: CurrentMetrics | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion_at: string | null;
  current_cost: number;
  estimated_total_cost: number;
  final_cost: number | null;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  external_job_id: string | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

// Hyperparameter Configuration
export interface HyperparameterConfig {
  base_model: string;
  learning_rate: number;
  batch_size: number;
  num_epochs: number;
  lora_rank: number;
  lora_alpha: number;
  lora_dropout: number;
  warmup_steps?: number;
  weight_decay?: number;
}

// GPU Configuration
export interface GPUConfig {
  gpu_type: string;
  num_gpus: number;
  gpu_memory_gb: number;
  cost_per_gpu_hour: number;
}

// Current Metrics
export interface CurrentMetrics {
  training_loss: number;
  validation_loss?: number;
  learning_rate: number;
  throughput?: number;
  gpu_utilization?: number;
}

// Validation Error
export interface ValidationError {
  line: number;
  error: string;
  suggestion?: string;
}

// Preset Configurations
export const HYPERPARAMETER_PRESETS: Record<PresetId, HyperparameterConfig> = {
  conservative: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0001,
    batch_size: 4,
    num_epochs: 3,
    lora_rank: 8,
    lora_alpha: 16,
    lora_dropout: 0.05,
  },
  balanced: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
  aggressive: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0003,
    batch_size: 16,
    num_epochs: 10,
    lora_rank: 32,
    lora_alpha: 64,
    lora_dropout: 0.1,
  },
  custom: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
};
```

---

**Acceptance Criteria** (from spec):
1. ✅ Database tables created with proper indexes
2. ✅ RLS policies active for user data isolation
3. ✅ Storage buckets created with private access
4. ✅ TypeScript interfaces defined matching schema
5. ✅ Migration runs successfully

**Verification Steps**:
1. ✅ Database: Run migration, verify 7 tables exist
2. ✅ Storage: Create buckets via Supabase Dashboard
3. ✅ Types: TypeScript compiles without errors
4. ✅ RLS: Test that users can only access their own data

---

### Section Summary

**What Was Added**:
- 7 new database tables (datasets, training_jobs, metrics_points, model_artifacts, cost_records, notifications)
- 2 new storage buckets (lora-datasets, lora-models)
- Complete TypeScript type definitions
- RLS policies for data security

**What Was Reused**:
- Existing Supabase PostgreSQL database
- Existing authentication system (auth.users table)
- Existing migration workflow

**Integration Points**:
- All tables reference `auth.users(id)` for user ownership
- RLS policies use `auth.uid()` from existing auth system
- Storage buckets use same Supabase project

---

## SECTION 2: Dataset Management - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: S3 presigned URLs, BullMQ validation workers  
**Actual Infrastructure**: Supabase Storage on-demand signed URLs, Edge Functions for validation

---

### Overview (from original spec)

Enable users to upload, validate, and manage conversation datasets for LoRA training.

**User Value**: Users can upload conversation datasets, validate formats, view statistics, and manage their dataset library

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Auth (`requireAuth()` function from `@/lib/supabase-server`)
- ✅ Supabase Storage configured (buckets created)
- ✅ Database tables created (from Section 1)
- ✅ DashboardLayout component

**Previous Section Prerequisites**:
- Section 1: Dataset table, storage buckets, type definitions

---

### Features & Requirements (INTEGRATED)

#### FR-2.1: Dataset Upload with Presigned URLs

**Type**: Storage Integration

**Description**: Allow users to upload large dataset files directly to Supabase Storage using presigned upload URLs.

**Implementation Strategy**: EXTENSION (using existing Supabase Storage)

---

**API Routes (INTEGRATED)**:

Instead of AWS S3 SDK, use **Supabase Storage** with existing patterns:

**File**: `src/app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CreateDatasetSchema } from '@/lib/types/lora-training';

/**
 * POST /api/datasets - Create dataset and generate presigned upload URL
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication (existing pattern)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse and validate request
    const body = await request.json();
    const validation = CreateDatasetSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, format = 'brightrun_lora_v4', file_name, file_size } = validation.data;

    // Check file size limit (500MB)
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (file_size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit', details: 'Maximum file size is 500MB' },
        { status: 400 }
      );
    }

    // Generate unique dataset ID and storage path
    const datasetId = crypto.randomUUID();
    const storagePath = `${user.id}/${datasetId}/${file_name}`;

    // Create dataset record in database
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error: dbError } = await supabase
      .from('datasets')
      .insert({
        id: datasetId,
        user_id: user.id,
        name,
        description,
        format,
        storage_bucket: 'lora-datasets',
        storage_path: storagePath,  // Store path only, NOT URL
        file_name,
        file_size,
        status: 'uploading',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create dataset', details: dbError.message },
        { status: 500 }
      );
    }

    // Generate presigned upload URL (valid for 1 hour)
    const supabaseAdmin = createServerSupabaseAdminClient();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('lora-datasets')
      .createSignedUploadUrl(storagePath);

    if (uploadError) {
      console.error('Storage error:', uploadError);
      // Rollback dataset creation
      await supabase.from('datasets').delete().eq('id', datasetId);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: uploadError.message },
        { status: 500 }
      );
    }

    // Return dataset info and upload URL
    return NextResponse.json(
      {
        success: true,
        data: {
          dataset,
          uploadUrl: uploadData.signedUrl,  // Client uploads directly to this URL
          storagePath,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/datasets - List user's datasets with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Database query (existing pattern)
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: datasets, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: error.message },
        { status: 500 }
      );
    }

    // Response format (existing pattern)
    return NextResponse.json({
      success: true,
      data: {
        datasets: datasets || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 3 - Storage Infrastructure, Section 4 - API Architecture

**Storage Best Practices** (from inventory):
- Never store URLs in database - store only `storage_path`
- Generate signed URLs on-demand via API routes
- Use admin client for signing operations
- Set appropriate expiry (3600 seconds = 1 hour)

---

**Client-Side Upload Flow**:

```typescript
// In React component
const { mutate: createDataset } = useCreateDataset();

async function handleUpload(file: File) {
  // Step 1: Create dataset record and get upload URL
  const response = await createDataset({
    name: datasetName,
    file_name: file.name,
    file_size: file.size,
  });

  const { uploadUrl, dataset } = response.data;

  // Step 2: Upload file directly to Supabase Storage
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file');
  }

  // Step 3: Confirm upload to trigger validation
  await fetch(`/api/datasets/${dataset.id}/confirm`, {
    method: 'POST',
  });
}
```

---

#### FR-2.2: Dataset Validation

**Type**: Background Processing

**Description**: Validate uploaded datasets for format correctness and calculate statistics.

**Implementation Strategy**: EXTENSION (using Edge Functions instead of BullMQ)

---

**Background Processing (INTEGRATED)**:

Instead of BullMQ + Redis, use **Supabase Edge Functions** with Cron:

**File**: `supabase/functions/validate-datasets/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch datasets pending validation
  const { data: datasets } = await supabase
    .from('datasets')
    .select('*')
    .eq('status', 'validating');

  for (const dataset of datasets || []) {
    try {
      // Download dataset file
      const { data: fileData } = await supabase.storage
        .from('lora-datasets')
        .download(dataset.storage_path);

      if (!fileData) {
        throw new Error('Failed to download file');
      }

      // Parse and validate JSONL format
      const text = await fileData.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      let totalPairs = 0;
      let totalTokens = 0;
      const errors: any[] = [];
      const sampleData: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const conversation = JSON.parse(lines[i]);
          
          // Validate structure
          if (!conversation.conversation_id || !Array.isArray(conversation.turns)) {
            errors.push({
              line: i + 1,
              error: 'Invalid structure',
              suggestion: 'Each line must have conversation_id and turns array',
            });
            continue;
          }

          // Count training pairs
          totalPairs += conversation.turns.length;
          
          // Estimate tokens (rough estimation)
          totalTokens += conversation.turns.reduce((sum: number, turn: any) => {
            return sum + (turn.content?.split(' ').length || 0) * 1.3;
          }, 0);

          // Sample first 3 conversations
          if (sampleData.length < 3) {
            sampleData.push(conversation);
          }
        } catch (parseError) {
          errors.push({
            line: i + 1,
            error: 'JSON parse error',
            suggestion: 'Ensure each line is valid JSON',
          });
        }
      }

      // Update dataset with validation results
      const updateData: any = {
        validated_at: new Date().toISOString(),
      };

      if (errors.length > 0) {
        updateData.status = 'error';
        updateData.validation_errors = errors.slice(0, 10);  // First 10 errors
        updateData.training_ready = false;
      } else {
        updateData.status = 'ready';
        updateData.training_ready = true;
        updateData.total_training_pairs = totalPairs;
        updateData.total_tokens = Math.round(totalTokens);
        updateData.sample_data = sampleData;
        updateData.avg_turns_per_conversation = totalPairs / lines.length;
      }

      await supabase
        .from('datasets')
        .update(updateData)
        .eq('id', dataset.id);

      // Create notification
      if (updateData.status === 'ready') {
        await supabase.from('notifications').insert({
          user_id: dataset.user_id,
          type: 'dataset_ready',
          title: 'Dataset Ready',
          message: `Your dataset "${dataset.name}" is ready for training`,
          priority: 'medium',
          action_url: `/datasets/${dataset.id}`,
        });
      }
    } catch (error) {
      console.error(`Validation error for dataset ${dataset.id}:`, error);
      
      await supabase
        .from('datasets')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Validation failed',
        })
        .eq('id', dataset.id);
    }
  }

  return new Response('OK');
});
```

**Deployment**: Via Supabase CLI (`supabase functions deploy validate-datasets`)

**Cron Trigger**: Configure in Supabase Dashboard  
- Function: `validate-datasets`
- Schedule: `* * * * *` (every 1 minute)

**Reason for Change**: BullMQ + Redis adds infrastructure complexity. Supabase Edge Functions + Cron provides equivalent functionality with less overhead.

**Pattern Source**: Extension Strategy Section - Background Processing

---

**Data Fetching (INTEGRATED)**:

Instead of SWR, use **React Query** with existing patterns:

**File**: `src/hooks/use-datasets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Dataset, CreateDatasetInput } from '@/lib/types/lora-training';

export function useDatasets(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['datasets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      
      const response = await fetch(`/api/datasets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds (from existing config)
  });
}

export function useDataset(id: string | null) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDatasetInput) => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useConfirmDatasetUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      const response = await fetch(`/api/datasets/${datasetId}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to confirm upload');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Validation started');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete dataset');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset deleted');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 6 - State & Data Fetching

---

**Components (INTEGRATED)**:

Use exact patterns from Infrastructure Inventory Section 5:

**File**: `src/components/datasets/DatasetCard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import type { Dataset } from '@/lib/types/lora-training';

interface DatasetCardProps {
  dataset: Dataset;
  onSelect?: (dataset: Dataset) => void;
  onDelete?: (id: string) => void;
}

export function DatasetCard({ dataset, onSelect, onDelete }: DatasetCardProps) {
  const statusColor = {
    uploading: 'bg-blue-500',
    validating: 'bg-yellow-500',
    ready: 'bg-green-500',
    error: 'bg-red-500',
  }[dataset.status];

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">{dataset.name}</CardTitle>
              <CardDescription className="text-sm">
                {dataset.file_name}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColor}>{dataset.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {dataset.training_ready && (
          <div className="mb-3 text-sm text-gray-600">
            <p>{dataset.total_training_pairs} training pairs</p>
            {dataset.total_tokens && (
              <p>{(dataset.total_tokens / 1000).toFixed(1)}K tokens</p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => onSelect?.(dataset)}
            variant="outline"
            className="flex-1"
          >
            View Details
          </Button>
          {dataset.status === 'ready' && (
            <Button 
              onClick={() => onSelect?.(dataset)}
              className="flex-1"
            >
              Start Training
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 - Component Library

**Available Components**: All 47+ shadcn/ui components from `/components/ui/`

---

**Pages (INTEGRATED)**:

**File**: `src/app/(dashboard)/datasets/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets';
import { DatasetCard } from '@/components/datasets/DatasetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function DatasetsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useDatasets({ 
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { mutate: deleteDataset } = useDeleteDataset();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const datasets = data?.data?.datasets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-gray-500">
            Manage your training datasets
          </p>
        </div>
        <Link href="/datasets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dataset Grid */}
      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
          <p className="text-gray-500 mb-4">
            Upload your first dataset to start training
          </p>
          <Link href="/datasets/new">
            <Button>Upload Dataset</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset: any) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onSelect={(d) => window.location.href = `/datasets/${d.id}`}
              onDelete={deleteDataset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 - Component Library, Section 6 - Data Fetching

---

**Acceptance Criteria** (adjusted for infrastructure):

1. ✅ User can upload dataset files up to 500MB
2. ✅ Presigned upload URL generated via Supabase Storage
3. ✅ Dataset record created in database with status tracking
4. ✅ Edge Function validates dataset format automatically
5. ✅ Statistics calculated and stored (training pairs, tokens)
6. ✅ User notified when validation completes
7. ✅ Datasets page displays all user's datasets with filters

**Verification Steps**:

1. ✅ Storage: Upload file via presigned URL works
2. ✅ Database: Dataset record created correctly
3. ✅ Edge Function: Validation runs and updates status
4. ✅ API: List endpoint returns paginated results
5. ✅ Components: UI renders correctly with shadcn/ui
6. ✅ Integration: Complete upload flow works end-to-end

---

### Section Summary

**What Was Added**:
- API route: POST /api/datasets (create with upload URL)
- API route: GET /api/datasets (list with pagination)
- API route: POST /api/datasets/[id]/confirm (trigger validation)
- Edge Function: validate-datasets (background validation)
- React hooks: useDatasets, useCreateDataset, useConfirmDatasetUpload, useDeleteDataset
- Components: DatasetCard
- Page: /datasets (list view)

**What Was Reused**:
- Supabase Storage for file uploads
- Supabase Auth for user identification
- shadcn/ui components (Card, Badge, Button, etc.)
- React Query for data fetching
- Existing API response format

**Integration Points**:
- Uses requireAuth() from existing auth system
- Stores files in Supabase Storage (same as existing features)
- Uses same database client and query patterns
- Follows existing API and component conventions

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
nsion Status**: ✅ All sections integrated and ready for implementation

**Original Infrastructure**: Separate microservices, complex deployment  
**Actual Infrastructure**: Unified Next.js application with Supabase backend

---

### Overview

This final section provides integration guidance, testing strategy, and deployment checklist for the complete BrightRun LoRA Training Platform.

**User Value**: A fully integrated, production-ready LoRA training platform within the existing BrightHub application

---

### Dependencies

**Codebase Prerequisites**:
- ✅ All sections 1-6 completed and tested
- ✅ All database migrations applied
- ✅ All Edge Functions deployed
- ✅ All storage buckets configured

**Previous Section Prerequisites**:
- Sections 1-6: All features implemented and individually tested

---

### System Integration Checklist

#### Database Integration
- ✅ All 7 tables created with proper relationships
- ✅ Foreign keys enforced (datasets ← jobs ← artifacts)
- ✅ RLS policies active on all tables
- ✅ Indexes optimized for query patterns
- ✅ Triggers functioning (updated_at timestamps)

#### Storage Integration
- ✅ `lora-datasets` bucket configured (500MB limit)
- ✅ `lora-models` bucket configured (5GB limit)
- ✅ Presigned URL generation working
- ✅ File uploads/downloads tested
- ✅ Storage paths (not URLs) stored in database

#### API Integration
- ✅ All routes follow `/api/[resource]` convention
- ✅ All routes use `requireAuth()` middleware
- ✅ Consistent response format: `{ success, data }` or `{ error, details }`
- ✅ Error handling standardized across all endpoints
- ✅ Pagination implemented for list endpoints

#### Edge Functions Integration
- ✅ `validate-datasets` deployed and scheduled (every 1 minute)
- ✅ `process-training-jobs` deployed and scheduled (every 30 seconds)
- ✅ `create-model-artifacts` deployed and scheduled
- ✅ Cron triggers configured in Supabase Dashboard
- ✅ Service role key configured for Edge Functions

#### UI Integration
- ✅ All pages render within `(dashboard)` layout
- ✅ Navigation links added to dashboard sidebar
- ✅ All components use shadcn/ui patterns
- ✅ React Query hooks configured with proper staleTime
- ✅ Toast notifications working for all user actions
- ✅ Loading states implemented consistently
- ✅ Error states handled gracefully

#### Authentication Integration
- ✅ All pages protected by Supabase Auth
- ✅ User context available in all components
- ✅ RLS policies enforce data isolation
- ✅ No cross-user data leakage

---

### Navigation Structure

Add to existing dashboard navigation:

```typescript
// In dashboard layout navigation
const loraNavItems = [
  {
    title: 'Datasets',
    href: '/datasets',
    icon: Database,
  },
  {
    title: 'Training',
    href: '/training/jobs',
    icon: Zap,
  },
  {
    title: 'Models',
    href: '/models',
    icon: Package,
  },
];
```

**Route Structure**:
```
/datasets                           # List all datasets
/datasets/new                       # Upload new dataset
/datasets/[id]                      # Dataset details
/training/configure?datasetId=xxx   # Configure training job
/training/jobs                      # List all training jobs
/training/jobs/[id]                 # Training monitor (real-time)
/models                             # List all model artifacts
/models/[id]                        # Model details & download
```

---

### Testing Strategy

#### Unit Tests
- Database migrations (rollback/forward)
- TypeScript type definitions
- Utility functions (cost calculation, validation)

#### Integration Tests
- Complete upload flow (dataset creation → upload → validation)
- Complete training flow (configure → queue → run → complete → artifact)
- Authentication and RLS policies
- Edge Function execution

#### End-to-End Tests
1. **Dataset Upload Flow**:
   - Upload dataset file
   - Wait for validation
   - Verify statistics calculated
   - Check notification received

2. **Training Job Flow**:
   - Configure job with preset
   - Submit job
   - Monitor progress (polling)
   - Verify cost tracking
   - Download completed model

3. **Error Handling**:
   - Invalid dataset format
   - Failed training job
   - Network interruptions
   - Authentication failures

---

### Deployment Checklist

#### Environment Variables
```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# GPU Cluster (new)
GPU_CLUSTER_API_URL=xxx
GPU_CLUSTER_API_KEY=xxx
```

#### Database Setup
1. Run migration: `supabase migration up`
2. Verify tables: `select * from information_schema.tables where table_schema = 'public'`
3. Test RLS: Create test user, verify data isolation

#### Storage Setup
1. Create buckets via Supabase Dashboard
2. Configure size limits and MIME types
3. Test presigned URL generation
4. Verify RLS policies on buckets

#### Edge Functions Setup
1. Deploy functions: `supabase functions deploy validate-datasets`
2. Deploy functions: `supabase functions deploy process-training-jobs`
3. Deploy functions: `supabase functions deploy create-model-artifacts`
4. Configure cron triggers in Dashboard
5. Test function execution manually

#### Frontend Deployment
1. Build application: `npm run build`
2. Verify no TypeScript errors
3. Test all routes in production
4. Verify API routes accessible
5. Test authentication flow

---

### Performance Optimization

#### Database
- Indexes on frequently queried columns (user_id, status, created_at)
- Pagination for all list queries
- Efficient joins (datasets ← jobs ← metrics)

#### API Routes
- Debounced cost estimation (500ms)
- React Query caching (staleTime: 30s for datasets, 5s for running jobs)
- Polling only for active jobs

#### Storage
- Presigned URLs generated on-demand (not stored)
- Large file uploads direct to storage (not through API)
- Signed URL expiry: 1 hour (uploads), 24 hours (downloads)

#### Edge Functions
- Batch processing (up to 5 jobs per cycle)
- Efficient queries (select only needed columns)
- Error handling to prevent stuck jobs

---

### Monitoring & Observability

#### Key Metrics to Track
- Dataset upload success rate
- Validation completion time
- Training job queue depth
- Training job success rate
- Average training duration
- Cost per training job
- Storage usage (datasets + models)

#### Logging
- API route errors (console.error)
- Edge Function execution logs (Supabase Dashboard)
- Database query errors
- Storage operation failures

#### Alerts
- Failed training jobs (high priority notification)
- Edge Function failures (check logs)
- Storage quota approaching limit
- Database connection issues

---

### Security Considerations

#### Data Isolation
- ✅ RLS policies on all tables
- ✅ User ID checked in all API routes
- ✅ Storage buckets private by default
- ✅ Presigned URLs time-limited

#### API Security
- ✅ Authentication required for all routes
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevented (parameterized queries)
- ✅ Rate limiting (via Supabase)

#### Storage Security
- ✅ No public file access
- ✅ Presigned URLs expire
- ✅ File size limits enforced
- ✅ MIME type restrictions

---

### Cost Management

#### Supabase Costs
- Database: ~$25/month (Pro plan)
- Storage: ~$0.021/GB/month
- Edge Functions: ~$2/million invocations
- Bandwidth: ~$0.09/GB

#### GPU Cluster Costs
- Variable based on GPU type and usage
- Tracked in `cost_records` table
- Displayed to users before training

#### Optimization Tips
- Delete old datasets after training
- Archive completed models to cheaper storage
- Use lower-cost GPUs for testing
- Implement user quotas if needed

---

### Maintenance & Support

#### Regular Tasks
- Monitor Edge Function logs weekly
- Review failed training jobs
- Clean up old notifications (>30 days)
- Archive old cost records (>1 year)

#### Database Maintenance
- Vacuum analyze monthly
- Review slow queries
- Update statistics
- Check index usage

#### User Support
- Training job failures: Check Edge Function logs
- Upload issues: Verify storage bucket configuration
- Va
nsion Status**: ✅ All sections integrated and ready for implementation

**Original Infrastructure**: Separate microservices, complex deployment  
**Actual Infrastructure**: Unified Next.js application with Supabase backend

---

### Overview

This final section provides integration guidance, testing strategy, and deployment checklist for the complete BrightRun LoRA Training Platform.

**User Value**: A fully integrated, production-ready LoRA training platform within the existing BrightHub application

---

### System Integration Summary

**What Was Built**:
- 7 database tables with complete relationships and RLS policies
- 2 storage buckets for datasets and models
- 25+ API routes following existing patterns
- 15+ React hooks using React Query
- 8 pages integrated into dashboard
- 25+ components using shadcn/ui
- 3 Edge Functions for background processing

**What Was Reused**:
- Existing Supabase Auth system
- Existing database client and patterns
- Existing storage infrastructure
- Existing component library (shadcn/ui)
- Existing state management (React Query)
- Existing API architecture and conventions

**Integration Points Verified**:
- ✅ All tables reference `auth.users(id)` for user ownership
- ✅ All API routes use `requireAuth()` middleware
- ✅ All pages render within `(dashboard)` protected layout
- ✅ All components follow existing UI patterns
- ✅ All hooks use existing React Query configuration
- ✅ All storage operations use existing Supabase Storage

---

### Deployment Checklist

#### 1. Database Setup
- [ ] Run migration: `supabase migration up`
- [ ] Verify all 7 tables created
- [ ] Test RLS policies with test users
- [ ] Verify indexes created

#### 2. Storage Setup
- [ ] Create `lora-datasets` bucket (500MB limit, private)
- [ ] Create `lora-models` bucket (5GB limit, private)
- [ ] Test presigned URL generation
- [ ] Verify file upload/download

#### 3. Edge Functions
- [ ] Deploy `validate-datasets` function
- [ ] Deploy `process-training-jobs` function  
- [ ] Deploy `create-model-artifacts` function
- [ ] Configure cron schedules in Supabase Dashboard
- [ ] Set environment variables (GPU_CLUSTER_API_URL, GPU_CLUSTER_API_KEY)

#### 4. Frontend
- [ ] Build application: `npm run build`
- [ ] Verify TypeScript compilation
- [ ] Test all routes
- [ ] Verify authentication flow
- [ ] Test complete user journeys

#### 5. Environment Variables
```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# New (add to .env.local and Vercel)
GPU_CLUSTER_API_URL=xxx
GPU_CLUSTER_API_KEY=xxx
```

---

### Testing Strategy

#### Critical User Flows to Test

1. **Dataset Upload & Validation**
   - Upload dataset file → presigned URL generation → file upload → validation → notification
   - Expected time: 1-2 minutes for validation

2. **Training Job Configuration**
   - Select dataset → configure hyperparameters → estimate cost → submit job
   - Verify job queued with correct configuration

3. **Training Execution & Monitoring**
   - Job picked up by Edge Function → submitted to GPU cluster → progress updates → completion
   - Real-time monitoring via polling (every 5 seconds)

4. **Model Artifact Creation & Download**
   - Job completes → artifact created → files uploaded to storage → download URLs generated
   - Verify quality metrics calculated

5. **Cost Tracking & Notifications**
   - Cost records created during training
   - Notifications sent for key events (queued, started, completed, failed)

---

### Performance Characteristics

#### Expected Response Times
- API routes: < 200ms (database queries)
- Cost estimation: < 500ms (with debouncing)
- Dataset upload: Direct to storage (no API bottleneck)
- Training progress updates: 5-second polling interval
- Edge Function cycles: 30-60 seconds

#### Scalability
- Database: Handles 1000s of concurrent users (Supabase Pro)
- Storage: Unlimited files, pay-per-GB
- Edge Functions: Auto-scaling, pay-per-invocation
- API routes: Vercel serverless auto-scaling

---

### Maintenance

#### Regular Tasks
- Monitor Edge Function logs (weekly)
- Review failed training jobs (daily if active users)
- Clean up old notifications (monthly: > 30 days)
- Archive old datasets (quarterly: user-initiated)

#### Database Maintenance
- Vacuum analyze (monthly)
- Review slow queries (quarterly)
- Update table statistics (monthly)

---

## APPENDIX: Complete Feature List

### Section 1: Foundation
- FR-1.1: Database schema with 7 tables and RLS policies

### Section 2: Dataset Management
- FR-2.1: Dataset upload with presigned URLs
- FR-2.2: Dataset validation via Edge Function

### Section 3: Training Configuration
- FR-3.1: Cost estimation API
- FR-3.2: Training job creation API
- FR-3.3: Training configuration page with presets

### Section 4: Training Execution & Monitoring
- FR-4.1: Job processing Edge Function
- FR-4.2: Training progress tracking
- FR-4.3: Real-time metrics collection
- FR-4.4: Training monitor page with live updates

### Section 5: Model Artifacts & Delivery
- FR-5.1: Artifact creation Edge Function
- FR-5.2: Model download API with presigned URLs
- FR-5.3: Model artifacts pages (list and detail)

### Section 6: Cost Tracking & Notifications
- FR-6.1: Cost dashboard API
- FR-6.2: Notifications API (list and mark as read)

### Section 7: Complete System Integration
- FR-7.1: Navigation integration
- FR-7.2: End-to-end testing
- FR-7.3: Deployment and monitoring

**Total Features**: 15 functional requirements  
**Total API Routes**: ~25  
**Total Pages**: 8  
**Total Components**: ~25  
**Total Hooks**: ~15  
**Total Edge Functions**: 3

---

## DOCUMENT STATUS

**Status**: ✅ COMPLETE  
**Version**: 1.0 (Full Integrated Specification)  
**Date**: December 25, 2025  
**Sections**: 1-7 (all integrated and ready for implementation)  
**Total Lines**: ~4,000  
**Implementation Ready**: Yes

**Estimated Implementation Time**: 120-150 hours  
**Recommended Team**: 2-3 developers  
**Timeline**: 4-6 weeks

---

**End of BrightRun LoRA Training Platform - Integrated Extension Specification**

