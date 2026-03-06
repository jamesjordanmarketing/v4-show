-- ============================================
-- Migration: Adapter Testing Infrastructure
-- Date: 2026-01-17
-- Tables: pipeline_inference_endpoints, pipeline_test_results, pipeline_base_models
-- ============================================

BEGIN;

-- ============================================
-- Table: pipeline_inference_endpoints
-- Purpose: Track deployed inference endpoints (Control and Adapted)
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_inference_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Endpoint identity
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('control', 'adapted')),
  runpod_endpoint_id TEXT,              -- RunPod's endpoint identifier

  -- Model configuration
  base_model TEXT NOT NULL,             -- e.g., "mistralai/Mistral-7B-Instruct-v0.2"
  adapter_path TEXT,                    -- Supabase storage path (adapted only)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'deploying', 'ready', 'failed', 'terminated')),
  health_check_url TEXT,
  last_health_check TIMESTAMPTZ,

  -- Cost tracking
  idle_timeout_seconds INTEGER DEFAULT 300,  -- 5 minutes default
  estimated_cost_per_hour NUMERIC(10,4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Unique constraint: one endpoint per type per job
  UNIQUE(job_id, endpoint_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_endpoints_job_id ON pipeline_inference_endpoints(job_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON pipeline_inference_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_status ON pipeline_inference_endpoints(status);

-- RLS Policies
ALTER TABLE pipeline_inference_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can view own endpoints"
  ON pipeline_inference_endpoints FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can insert own endpoints"
  ON pipeline_inference_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can update own endpoints"
  ON pipeline_inference_endpoints FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_test_results
-- Purpose: Store A/B test results with Claude evaluations
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Test input
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,

  -- Responses
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,

  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,

  -- Claude-as-Judge evaluation (optional)
  evaluation_enabled BOOLEAN DEFAULT FALSE,
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,

  -- User rating
  user_rating TEXT CHECK (user_rating IN ('control', 'adapted', 'tie', 'neither')),
  user_notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'evaluating', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_results_job_id ON pipeline_test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON pipeline_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON pipeline_test_results(created_at DESC);

-- RLS Policies
ALTER TABLE pipeline_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own test results" ON pipeline_test_results;
CREATE POLICY "Users can view own test results"
  ON pipeline_test_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own test results" ON pipeline_test_results;
CREATE POLICY "Users can insert own test results"
  ON pipeline_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own test results" ON pipeline_test_results;
CREATE POLICY "Users can update own test results"
  ON pipeline_test_results FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- Table: pipeline_base_models
-- Purpose: Registry of supported base models
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identity
  model_id TEXT NOT NULL UNIQUE,        -- HuggingFace model ID
  display_name TEXT NOT NULL,           -- User-friendly name

  -- Specifications
  parameter_count TEXT,                 -- e.g., "7B", "32B"
  context_length INTEGER,               -- Max tokens
  license TEXT,                         -- e.g., "Apache 2.0", "MIT"

  -- RunPod configuration
  docker_image TEXT NOT NULL DEFAULT 'runpod/worker-vllm:stable-cuda12.1.0',
  min_gpu_memory_gb INTEGER NOT NULL,
  recommended_gpu_type TEXT,            -- e.g., "NVIDIA A40"

  -- Capabilities
  supports_lora BOOLEAN DEFAULT TRUE,
  supports_quantization BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for base models
INSERT INTO pipeline_base_models (model_id, display_name, parameter_count, context_length, license, min_gpu_memory_gb, recommended_gpu_type)
VALUES
  ('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', '7B', 32768, 'Apache 2.0', 24, 'NVIDIA A40'),
  ('deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'DeepSeek R1 Distill Qwen 32B', '32B', 131072, 'MIT', 48, 'NVIDIA A100'),
  ('meta-llama/Meta-Llama-3-8B-Instruct', 'Llama 3 8B Instruct', '8B', 8192, 'Llama 3', 24, 'NVIDIA A40'),
  ('meta-llama/Meta-Llama-3-70B-Instruct', 'Llama 3 70B Instruct', '70B', 8192, 'Llama 3', 80, 'NVIDIA H100')
ON CONFLICT (model_id) DO NOTHING;

COMMIT;
