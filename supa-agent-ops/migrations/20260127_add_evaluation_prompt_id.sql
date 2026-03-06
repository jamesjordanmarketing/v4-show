-- Migration: Add evaluation_prompt_id column to pipeline_test_results
-- Purpose: Track which evaluator was used for each test
-- Date: January 27, 2026

-- Add column (nullable to preserve existing data)
ALTER TABLE public.pipeline_test_results
  ADD COLUMN IF NOT EXISTS evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id);

-- Index for filtering by evaluator
CREATE INDEX IF NOT EXISTS idx_pipeline_test_results_evaluator 
ON public.pipeline_test_results(evaluation_prompt_id);
