# E01 SQL v2 - Copy and Paste This EXACTLY

The first SQL created tables but they may be missing columns. This SQL adds any missing columns and objects.

Run this in Supabase Dashboard → SQL Editor:

```sql
-- ============================================
-- E01 v2: ADD MISSING COLUMNS + INDEXES + POLICIES
-- Safe to run multiple times
-- ============================================

-- ============================================
-- ADD MISSING COLUMNS TO conversation_turns
-- ============================================
DO $$
BEGIN
  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  -- Add completed_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add human_emotional_state column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'human_emotional_state'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN human_emotional_state JSONB;
  END IF;

  -- Add arc_progression column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'arc_progression'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN arc_progression JSONB;
  END IF;

  -- Add evaluation_enabled column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'evaluation_enabled'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN evaluation_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add evaluation_prompt_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'evaluation_prompt_id'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id);
  END IF;

  -- Add control_evaluation column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'control_evaluation'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN control_evaluation JSONB;
  END IF;

  -- Add adapted_evaluation column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'adapted_evaluation'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN adapted_evaluation JSONB;
  END IF;

  -- Add evaluation_comparison column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'evaluation_comparison'
  ) THEN
    ALTER TABLE public.conversation_turns 
    ADD COLUMN evaluation_comparison JSONB;
  END IF;
END $$;

-- ============================================
-- INDEXES (IF NOT EXISTS)
-- ============================================

-- Indexes for multi_turn_conversations
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_job_id 
  ON public.multi_turn_conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_user_id 
  ON public.multi_turn_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_status 
  ON public.multi_turn_conversations(status);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_created_at 
  ON public.multi_turn_conversations(created_at DESC);

-- Indexes for conversation_turns
CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id 
  ON public.conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_status 
  ON public.conversation_turns(status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_number 
  ON public.conversation_turns(conversation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_evaluator 
  ON public.conversation_turns(evaluation_prompt_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.multi_turn_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe)
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.multi_turn_conversations;
CREATE POLICY "Users can manage own conversations"
  ON public.multi_turn_conversations
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage turns of own conversations" ON public.conversation_turns;
CREATE POLICY "Users can manage turns of own conversations"
  ON public.conversation_turns
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.multi_turn_conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- COLUMN COMMENTS
-- ============================================
COMMENT ON COLUMN public.conversation_turns.human_emotional_state IS 
  'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';
COMMENT ON COLUMN public.conversation_turns.arc_progression IS 
  'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';

-- ============================================
-- SEED: Multi-Turn Evaluator (skips if exists)
-- ============================================
INSERT INTO public.evaluation_prompts (
  name, 
  display_name, 
  description, 
  prompt_template, 
  includes_arc_context, 
  is_default,
  model,
  max_tokens,
  is_active
)
VALUES (
  'multi_turn_arc_aware_v1',
  'Multi-Turn Arc-Aware Evaluator (v1)',
  'Measures actual human emotional progression across conversation turns.',
  'You are an expert evaluator specializing in therapeutic communication and emotional intelligence. You are analyzing a MULTI-TURN conversation to measure the human''s actual emotional progression.

## CONTEXT: KNOWN EMOTIONAL ARCS

This advisor was trained to facilitate the following emotional transitions:

{emotional_arcs}

These arcs represent healthy emotional progressions in financial conversations.

## CONVERSATION HISTORY

Turn Count: {turn_count}

{conversation_history}

## CURRENT TURN TO EVALUATE

HUMAN''S MESSAGE (Turn {current_turn}):
{user_message}

ADVISOR''S RESPONSE:
{response}

## EVALUATION TASK

You have TWO distinct tasks:

### Task 1: Measure the Human''s ACTUAL Emotional State

Analyze the human''s message to determine their ACTUAL emotional state right now. This is ground truth data, not a projection. Look for:
- Explicit emotional language ("I feel...", "This is scary...")
- Implicit emotional indicators (hesitation, relief, frustration)
- Emotional intensity markers (qualifiers, emphasis, length)
- Valence indicators (positive vs negative framing)

### Task 2: Evaluate the Advisor''s Facilitation

Assess how well the advisor''s response helps the human move toward a healthier emotional state. Consider:
- Did it acknowledge the human''s emotions?
- Did it create movement or stagnation?
- Was the movement in a healthy direction?

## IMPORTANT CONTEXT

{previous_evaluation_summary}

## RESPONSE FORMAT

Respond in JSON format:

{
  "humanEmotionalState": {
    "turnNumber": {current_turn},
    "primaryEmotion": "<detected primary emotion>",
    "secondaryEmotions": ["<additional emotions>"],
    "intensity": 0.0-1.0,
    "valence": "negative|mixed|neutral|positive",
    "confidence": 0.0-1.0,
    "evidenceQuotes": ["<direct quotes>"],
    "stateNotes": "<brief explanation>"
  },
  "emotionalMovement": {
    "comparedToTurn": 1,
    "valenceShift": "improved|maintained|worsened",
    "intensityChange": "reduced|unchanged|increased",
    "movementQuality": 1-5,
    "movementNotes": "<explanation>"
  },
  "arcProgression": {
    "detectedArc": "<arc_key or none>",
    "arcMatchConfidence": 0.0-1.0,
    "progressionPercentage": 0-100,
    "onTrack": true/false,
    "progressionNotes": "<explanation>"
  },
  "advisorFacilitation": {
    "emotionsAcknowledged": true/false,
    "acknowledgmentQuality": 1-5,
    "movementFacilitated": true/false,
    "facilitationScore": 1-5,
    "facilitationNotes": "<explanation>"
  },
  "voiceConsistency": {
    "warmthPresent": true/false,
    "judgmentFree": true/false,
    "voiceScore": 1-5,
    "voiceNotes": "<explanation>"
  },
  "overallTurnEvaluation": {
    "humanProgressedEmotionally": true/false,
    "advisorHelpedProgression": true/false,
    "turnQualityScore": 1-5,
    "cumulativeArcProgress": 1-5,
    "keyStrengths": ["<strength>"],
    "areasForImprovement": ["<improvement>"],
    "summary": "<one paragraph assessment>"
  }
}

Respond ONLY with valid JSON, no other text.',
  true,
  false,
  'claude-sonnet-4-20250514',
  3000,
  true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DONE
-- ============================================
SELECT 'E01 v2 Complete! All columns, indexes, policies, and evaluator created.' AS result;
```
