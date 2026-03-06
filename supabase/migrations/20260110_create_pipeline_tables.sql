-- =====================================================
-- Pipeline Module Database Schema
-- Section E01: Foundation Layer
-- Created: January 10, 2026
-- =====================================================

-- =====================================================
-- Table 1: pipeline_training_jobs
-- Main job tracking table for the pipeline module
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job identification
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, queued, initializing, running, completed, failed, cancelled
  
  -- Lay-person configuration (UI values)
  training_sensitivity TEXT NOT NULL DEFAULT 'medium',
  training_progression TEXT NOT NULL DEFAULT 'medium', 
  training_repetition INTEGER NOT NULL DEFAULT 3,
  
  -- Technical hyperparameters (derived from above)
  learning_rate FLOAT NOT NULL DEFAULT 0.0001,
  batch_size INTEGER NOT NULL DEFAULT 4,
  epochs INTEGER NOT NULL DEFAULT 3,
  rank INTEGER NOT NULL DEFAULT 16,
  alpha INTEGER NOT NULL DEFAULT 32,
  dropout FLOAT NOT NULL DEFAULT 0.05,
  
  -- Dataset reference
  dataset_id UUID REFERENCES datasets(id),
  dataset_name TEXT,
  dataset_file_path TEXT,
  
  -- Engine information (single engine architecture)
  engine_id TEXT NOT NULL DEFAULT 'emotional-alignment-v1',
  engine_name TEXT NOT NULL DEFAULT 'Emotional Alignment',
  engine_features JSONB DEFAULT '[]'::jsonb,
  
  -- GPU configuration
  gpu_type TEXT NOT NULL DEFAULT 'NVIDIA A40',
  gpu_count INTEGER NOT NULL DEFAULT 1,
  
  -- Cost tracking
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  
  -- Progress tracking
  progress INTEGER DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  
  -- Real-time metrics (during training)
  current_loss FLOAT,
  current_learning_rate FLOAT,
  tokens_per_second FLOAT,
  
  -- RunPod tracking
  runpod_job_id TEXT,
  runpod_endpoint_id TEXT,
  
  -- Results
  final_loss FLOAT,
  training_time_seconds INTEGER,
  adapter_file_path TEXT,
  adapter_download_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Error handling
  error_message TEXT,
  error_details JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user_id ON pipeline_training_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created_at ON pipeline_training_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE pipeline_training_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pipeline jobs"
  ON pipeline_training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pipeline jobs"
  ON pipeline_training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline jobs"
  ON pipeline_training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to pipeline jobs"
  ON pipeline_training_jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Table 2: pipeline_training_metrics
-- Time-series metrics storage
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_training_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_level TEXT NOT NULL, -- 'universal', 'domain', 'specialized'
  
  -- Value
  value FLOAT NOT NULL,
  unit TEXT,
  
  -- Measurement metadata
  measured_at TIMESTAMPTZ DEFAULT now(),
  measurement_version TEXT,
  measurement_method TEXT,
  
  -- For time-series metrics
  step_number INTEGER,
  epoch_number INTEGER,
  
  -- Raw data reference
  raw_data JSONB,
  
  CONSTRAINT fk_pipeline_metrics_job FOREIGN KEY (job_id) 
    REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_job_id ON pipeline_training_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_metric_id ON pipeline_training_metrics(metric_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_step ON pipeline_training_metrics(step_number);

-- Enable RLS
ALTER TABLE pipeline_training_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from job ownership)
CREATE POLICY "Users can view metrics for own jobs"
  ON pipeline_training_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_training_jobs
      WHERE pipeline_training_jobs.id = pipeline_training_metrics.job_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to metrics"
  ON pipeline_training_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Table 3: pipeline_evaluation_runs
-- Claude-as-Judge evaluation runs
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  
  -- Evaluation type
  evaluation_type TEXT NOT NULL, -- 'baseline' or 'trained'
  
  -- Model configuration
  model_id TEXT NOT NULL,
  adapter_path TEXT, -- null for baseline
  
  -- Statistics
  total_scenarios INTEGER NOT NULL,
  completed_scenarios INTEGER DEFAULT 0,
  failed_scenarios INTEGER DEFAULT 0,
  
  -- Aggregate metrics
  arc_completion_rate FLOAT,
  avg_progression_quality FLOAT,
  empathy_first_rate FLOAT,
  avg_empathy_score FLOAT,
  avg_voice_score FLOAT,
  helpful_rate FLOAT,
  avg_quality_score FLOAT,
  avg_overall_score FLOAT,
  
  -- Per-arc breakdown
  per_arc_metrics JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eval_runs_job_id ON pipeline_evaluation_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_type ON pipeline_evaluation_runs(evaluation_type);

-- Enable RLS
ALTER TABLE pipeline_evaluation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view evaluation runs for own jobs"
  ON pipeline_evaluation_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_training_jobs
      WHERE pipeline_training_jobs.id = pipeline_evaluation_runs.job_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to evaluation runs"
  ON pipeline_evaluation_runs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Table 4: pipeline_evaluation_results
-- Individual scenario evaluation results
-- =====================================================

CREATE TABLE IF NOT EXISTS pipeline_evaluation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES pipeline_evaluation_runs(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  
  -- Conversation data
  conversation_turns JSONB NOT NULL,
  total_tokens INTEGER,
  generation_time_ms INTEGER,
  
  -- Claude evaluation results (structured JSON)
  emotional_progression JSONB,
  empathy_evaluation JSONB,
  voice_consistency JSONB,
  conversation_quality JSONB,
  overall_evaluation JSONB,
  
  -- Metadata
  claude_model_used TEXT,
  evaluation_tokens INTEGER,
  raw_response TEXT,
  
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eval_results_run_id ON pipeline_evaluation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_scenario ON pipeline_evaluation_results(scenario_id);

-- Enable RLS
ALTER TABLE pipeline_evaluation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view results for own evaluation runs"
  ON pipeline_evaluation_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_evaluation_runs
      JOIN pipeline_training_jobs ON pipeline_training_jobs.id = pipeline_evaluation_runs.job_id
      WHERE pipeline_evaluation_runs.id = pipeline_evaluation_results.run_id
      AND pipeline_training_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to evaluation results"
  ON pipeline_evaluation_results FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE pipeline_training_jobs IS 'Main job tracking table for the pipeline module (separate from legacy training_jobs)';
COMMENT ON TABLE pipeline_training_metrics IS 'Time-series metrics storage for training runs';
COMMENT ON TABLE pipeline_evaluation_runs IS 'Claude-as-Judge evaluation runs (baseline and trained)';
COMMENT ON TABLE pipeline_evaluation_results IS 'Individual scenario evaluation results from Claude-as-Judge';
