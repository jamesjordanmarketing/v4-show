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

