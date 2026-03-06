-- Migration: Create evaluation_prompts table
-- Purpose: Store evaluation prompt templates for Claude-as-Judge
-- Date: January 27, 2026

-- ============================================
-- STEP 1: Create the evaluation_prompts table
-- ============================================

CREATE TABLE IF NOT EXISTS public.evaluation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Prompt content
  prompt_template TEXT NOT NULL,
  expected_response_schema JSONB,
  
  -- Configuration
  includes_arc_context BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- STEP 2: Create indexes
-- ============================================

-- Index for active prompts lookup
CREATE INDEX IF NOT EXISTS idx_evaluation_prompts_active 
ON public.evaluation_prompts(is_active) WHERE is_active = true;

-- Ensure only one default prompt
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_prompts_default 
ON public.evaluation_prompts(is_default) WHERE is_default = true;

-- ============================================
-- STEP 3: Enable RLS and create policies
-- ============================================

ALTER TABLE public.evaluation_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active prompts
CREATE POLICY "Users can read active evaluation prompts"
  ON public.evaluation_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Only admins can modify (or use service role key)
CREATE POLICY "Service role can manage evaluation prompts"
  ON public.evaluation_prompts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
