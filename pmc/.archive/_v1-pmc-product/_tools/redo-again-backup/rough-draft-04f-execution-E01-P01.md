# Execution Prompt: Section 1 - Prompt 1

**Section**: Foundation & Authentication
**Prompt**: Database Setup
**Target**: Create database tables, indexes, and RLS policies
**Dependencies**: None
**Estimated Effort**: 4-8 hours
**Risk Level**: Low

---

## Context Summary

### Existing Infrastructure (ALWAYS USE)

**Authentication**:
- `requireAuth()` from `/lib/supabase-server.ts` - Use in all API routes
- `useAuth()` from `/lib/auth-context.tsx` - Use in client components
- User ID available as `user.id` after authentication

**Database**:
- `createServerSupabaseClient()` from `/lib/supabase-server.ts` - Use for queries
- Supabase query builder (NOT Prisma)
- RLS policies enabled on all tables

**Storage**:
- `createServerSupabaseAdminClient()` from `/lib/supabase-server.ts` - Use for signed URLs
- Supabase Storage buckets: `lora-datasets`, `lora-models`
- Always store paths, never URLs in database

**Components**:
- 47+ shadcn/ui components available in `/components/ui/`
- Button, Card, Dialog, Table, Badge, Progress, Input, Label, etc.

**State Management**:
- React Query (`@tanstack/react-query`) - Use `useQuery` and `useMutation`
- Stale time: 60 seconds, Retry: 1

**Layout**:
- Dashboard layout: `/app/(dashboard)/layout.tsx` - All pages automatically wrapped
- Navigation: Add new items to sidebar if needed

---

### From Previous Prompts (AVAILABLE)

None - This is the first prompt in this section

---

### From Previous Sections (AVAILABLE)

None - This is the first section

---

## Features to Implement


### Feature 1: FR-1.1 - Database Schema for LoRA Training

#### FR-1.1: Database Schema for LoRA Training

**Type**: Infrastructure Setup

**Description**: Create database tables to support LoRA training features including datasets, training jobs, metrics, model artifacts, costs, and notifications.

**Prerequisites from Previous Sections**: None (uses existing `auth.users` table)

**Extends/Enhances**: Existing database with new tables

**Implementation (INTEGRATED)**:

**Database Migration**:

```sql
-- File: supabase/migrations/20241223_create_lora_training_tables.sql
-- Migration: Create LoRA Training Tables
-- Date: 2024-12-23

BEGIN;

-- ============================================
-- DATASETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  name VARCHAR(200) NOT NULL,
  description TEXT,
  format VARCHAR(50) DEFAULT 'brightrun_lora_v4',
  status VARCHAR(50) DEFAULT 'uploading',

  -- Storage (Supabase Storage)
  storage_bucket VARCHAR(100) DEFAULT 'lora-datasets',
  storage_path TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,

  -- Dataset statistics (populated after validation)
  total_training_pairs INTEGER,
  total_validation_pairs INTEGER,
  total_tokens BIGINT,
  avg_turns_per_conversation DECIMAL(10, 2),
  avg_tokens_per_turn DECIMAL(10, 2),

  -- Validation
  training_ready BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_errors JSONB,

  -- Sample data (for preview)
  sample_data JSONB,

  -- Timestamps
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

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRAINING_JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,

  -- Configuration
  preset_id VARCHAR(50) NOT NULL,
  hyperparameters JSONB NOT NULL,
  gpu_config JSONB NOT NULL,

  -- Status & Progress
  status VARCHAR(50) DEFAULT 'queued',
  current_stage VARCHAR(50) DEFAULT 'queued',
  progress DECIMAL(5, 2) DEFAULT 0,

  -- Training progress
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER NOT NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,

  -- Current metrics
  current_metrics JSONB,

  -- Time tracking
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,

  -- Cost tracking
  current_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_total_cost DECIMAL(10, 2) NOT NULL,
  final_cost DECIMAL(10, 2),

  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- External training service
  external_job_id VARCHAR(255) UNIQUE,

  -- Artifact reference
  artifact_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_jobs_user_id ON training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_dataset_id ON training_jobs(dataset_id);
CREATE INDEX idx_training_jobs_external_id ON training_jobs(external_job_id);
CREATE INDEX idx_training_jobs_created_at ON training_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- METRICS_POINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS metrics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Progress
  epoch INTEGER NOT NULL,
  step INTEGER NOT NULL,

  -- Loss metrics
  training_loss DECIMAL(10, 6) NOT NULL,
  validation_loss DECIMAL(10, 6),

  -- Training metrics
  learning_rate DECIMAL(12, 10) NOT NULL,
  gradient_norm DECIMAL(10, 6),

  -- Performance metrics
  throughput DECIMAL(10, 2),
  gpu_utilization DECIMAL(5, 2)
);

CREATE INDEX idx_metrics_points_job_id ON metrics_points(job_id);
CREATE INDEX idx_metrics_points_timestamp ON metrics_points(job_id, timestamp DESC);
CREATE INDEX idx_metrics_points_step ON metrics_points(job_id, step DESC);

-- RLS Policies
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for own jobs"
  ON metrics_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_jobs
      WHERE training_jobs.id = metrics_points.job_id
      AND training_jobs.user_id = auth.uid()
    )
  );

-- ============================================
-- MODEL_ARTIFACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE REFERENCES training_jobs(id) ON DELETE RESTRICT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,

  -- Metadata
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  description TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'stored',
  deployed_at TIMESTAMPTZ,

  -- Quality metrics
  quality_metrics JSONB NOT NULL,

  -- Training summary
  training_summary JSONB NOT NULL,

  -- Configuration reference
  configuration JSONB NOT NULL,

  -- Artifacts storage (Supabase Storage paths)
  artifacts JSONB NOT NULL,

  -- Version lineage
  parent_model_id UUID REFERENCES model_artifacts(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_model_artifacts_user_id ON model_artifacts(user_id);
CREATE INDEX idx_model_artifacts_job_id ON model_artifacts(job_id);
CREATE INDEX idx_model_artifacts_status ON model_artifacts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_model_artifacts_created_at ON model_artifacts(created_at DESC);

-- RLS Policies
ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON model_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON model_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Add foreign key from training_jobs to model_artifacts
ALTER TABLE training_jobs
ADD CONSTRAINT fk_training_jobs_artifact
FOREIGN KEY (artifact_id) REFERENCES model_artifacts(id);

-- ============================================
-- COST_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,

  -- Cost breakdown
  cost_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,

  -- Details
  details JSONB,

  -- Time period
  billing_period DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_records_user_id ON cost_records(user_id);
CREATE INDEX idx_cost_records_job_id ON cost_records(job_id);
CREATE INDEX idx_cost_records_billing_period ON cost_records(user_id, billing_period DESC);

-- RLS Policies
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own costs"
  ON cost_records FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
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
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_jobs_updated_at BEFORE UPDATE ON training_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_artifacts_updated_at BEFORE UPDATE ON model_artifacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**Storage Buckets to Create** (via Supabase Dashboard):

1. **Bucket: `lora-datasets`**
   - Public: No (private)
   - File size limit: 500 MB
   - Allowed MIME types: `application/json`, `application/x-jsonlines`

2. **Bucket: `lora-models`**
   - Public: No (private)
   - File size limit: 5 GB
   - Allowed MIME types: `application/octet-stream`, `application/x-tar`, `application/json`

**Type Definitions**:

```typescript
// File: src/lib/types/lora-training.ts

export type DatasetFormat = 'brightrun_lora_v4' | 'brightrun_lora_v3';
export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';
export type JobStatus = 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobStage = 'queued' | 'initializing' | 'training' | 'validating' | 'saving' | 'completed';
export type ModelStatus = 'stored' | 'deployed' | 'archived';
export type CostType = 'compute' | 'storage' | 'data_transfer';
export type NotificationType = 'job_complete' | 'job_failed' | 'cost_alert' | 'dataset_ready';

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: DatasetFormat;
  status: DatasetStatus;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  total_training_pairs: number | null;
  total_validation_pairs: number | null;
  total_tokens: number | null;
  avg_turns_per_conversation: number | null;
  avg_tokens_per_turn: number | null;
  training_ready: boolean;
  validated_at: string | null;
  validation_errors: any | null;
  sample_data: any | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  preset_id: string;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  status: JobStatus;
  current_stage: JobStage;
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

export interface HyperparameterConfig {
  learning_rate: number;
  batch_size: number;
  num_epochs: number;
  lora_rank: number;
  lora_alpha: number;
  lora_dropout: number;
  warmup_steps?: number;
  weight_decay?: number;
  max_grad_norm?: number;
}

export interface GPUConfig {
  instance_type: string;
  num_gpus: number;
  gpu_memory_gb: number;
}

export interface CurrentMetrics {
  training_loss: number;
  validation_loss: number | null;
  learning_rate: number;
  throughput: number | null;
  gpu_utilization: number | null;
}

export interface MetricsPoint {
  id: string;
  job_id: string;
  timestamp: string;
  epoch: number;
  step: number;
  training_loss: number;
  validation_loss: number | null;
  learning_rate: number;
  gradient_norm: number | null;
  throughput: number | null;
  gpu_utilization: number | null;
}

export interface ModelArtifact {
  id: string;
  user_id: string;
  job_id: string;
  dataset_id: string;
  name: string;
  version: string;
  description: string | null;
  status: ModelStatus;
  deployed_at: string | null;
  quality_metrics: QualityMetrics;
  training_summary: TrainingSummary;
  configuration: HyperparameterConfig;
  artifacts: ArtifactPaths;
  parent_model_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QualityMetrics {
  final_training_loss: number;
  final_validation_loss: number;
  convergence_quality: 'excellent' | 'good' | 'fair' | 'poor';
  perplexity: number;
}

export interface TrainingSummary {
  duration_seconds: number;
  total_epochs: number;
  final_learning_rate: number;
  gpu_hours: number;
  total_cost: number;
}

export interface ArtifactPaths {
  adapter_model_path: string;
  adapter_config_path: string;
  tokenizer_path: string;
}

export interface CostRecord {
  id: string;
  user_id: string;
  job_id: string | null;
  cost_type: CostType;
  amount: number;
  details: any | null;
  billing_period: string;
  recorded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  action_url: string | null;
  metadata: any | null;
  created_at: string;
}
```

**Acceptance Criteria**:
1. ✅ All 6 tables created successfully in Supabase
2. ✅ RLS policies enabled and working correctly
3. ✅ Indexes created for performance
4. ✅ Foreign key relationships established
5. ✅ Triggers for `updated_at` working
6. ✅ Storage buckets created and configured
7. ✅ Type definitions match database schema

---

### Testing Strategy

**Database Tests**:
```typescript
// Test: Verify tables exist
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .in('table_name', ['datasets', 'training_jobs', 'metrics_points', 'model_artifacts', 'cost_records', 'notifications']);

expect(tables).toHaveLength(6);

// Test: Verify RLS policies
const { data: dataset, error } = await supabase
  .from('datasets')
  .select('*')
  .eq('user_id', 'different-user-id');

expect(data).toHaveLength(0); // Should not see other users' datasets
```

---

### Development Tasks

**T-1.1: Database Setup** (4 hours)
- Create migration file
- Run migration on development database
- Verify tables and indexes created
- Test RLS policies

**T-1.2: Storage Buckets** (1 hour)
- Create `lora-datasets` bucket via Supabase Dashboard
- Create `lora-models` bucket via Supabase Dashboard
- Configure bucket policies and size limits

**T-1.3: Type Definitions** (2 hours)
- Create `/lib/types/lora-training.ts`
- Define all interfaces matching database schema
- Export types for use in application

---

## END OF SECTION 1

**Section Summary**:
- ✅ Database schema established for LoRA training features (6 tables)
- ✅ Storage buckets created for datasets and models
- ✅ Type definitions created for TypeScript support
- ✅ No authentication changes needed (using existing Supabase Auth)

**Available for Next Section**:
- Database tables: `datasets`, `training_jobs`, `metrics_points`, `model_artifacts`, `cost_records`, `notifications`
- Storage buckets: `lora-datasets`, `lora-models`
- Type definitions in `/lib/types/lora-training.ts`
- Existing authentication via `requireAuth()` from `/lib/supabase-server.ts`

---

[CONTINUED IN NEXT SECTION...]

---



---


---

## Implementation Requirements

**CRITICAL - Follow These Patterns**:

1. **Authentication**: All API routes MUST use `requireAuth()`
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

2. **Database Queries**: Use Supabase query builder (NOT Prisma)
   ```typescript
   const supabase = await createServerSupabaseClient();
   const { data, error } = await supabase.from('table').select('*');
   ```

3. **Storage Operations**: Use admin client for signed URLs
   ```typescript
   const supabase = createServerSupabaseAdminClient();
   const { data } = await supabase.storage.from('bucket').createSignedUrl(path, 3600);
   ```

4. **API Response Format**: Use consistent format
   ```typescript
   // Success
   return NextResponse.json({ success: true, data: { ... } });
   
   // Error
   return NextResponse.json({ error: 'Message', details: '...' }, { status: 400 });
   ```

5. **React Hooks**: Use React Query patterns
   ```typescript
   export function useData() {
     return useQuery({
       queryKey: ['key'],
       queryFn: async () => { ... },
       staleTime: 60000,
       retry: 1,
     });
   }
   ```

6. **Components**: Use existing shadcn/ui components
   ```typescript
   import { Button } from '@/components/ui/button';
   import { Card } from '@/components/ui/card';
   ```

---

## Acceptance Criteria


**Feature 1 (FR-1.1)**:
- [ ] Implementation matches integrated spec exactly
- [ ] Uses existing infrastructure patterns
- [ ] No new dependencies added
- [ ] Tests pass (if applicable)
- [ ] No linter errors


---

## Validation Steps

After implementation:

1. **Database** (if applicable):
   - Run migration: `supabase db push`
   - Verify tables exist
   - Test RLS policies

2. **API Routes** (if applicable):
   - Test with curl or Postman
   - Verify authentication works
   - Check response format matches spec

3. **UI Components** (if applicable):
   - Visual verification
   - Test user interactions
   - Verify data fetching works

4. **Integration**:
   - Test end-to-end flow
   - Verify no console errors
   - Check performance

---

## DO NOT

- ❌ Use Prisma (use Supabase Client instead)
- ❌ Use NextAuth (use Supabase Auth instead)
- ❌ Use S3 SDK (use Supabase Storage instead)
- ❌ Use BullMQ/Redis (use Edge Functions instead)
- ❌ Use SWR (use React Query instead)
- ❌ Store URLs in database (store paths only)
- ❌ Add new dependencies without approval
- ❌ Modify existing infrastructure files
- ❌ Skip authentication checks
- ❌ Skip RLS policies

---

## Files to Create/Modify

- `supabase/migrations/YYYYMMDD_*.sql`
- `src/hooks/use-*.ts`

---

**Prompt Status**: Ready for Implementation
**Next Prompt**: Section 1 - Prompt 2 (after this is complete)
