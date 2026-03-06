# Multi-Turn Chat Implementation - Section E01: Database Schema & TypeScript Types

**Version:** 1.1  
**Date:** January 29, 2026  
**Section:** E01 - Database & Types  
**Prerequisites:** None (First Section)  
**Builds Upon:** None  

---

## Overview

This prompt implements the database schema and TypeScript type definitions for the multi-turn A/B testing chat module with arc-aware evaluation.

**What This Section Creates:**
1. Database table: `multi_turn_conversations`
2. Database table: `conversation_turns`
3. Seed data: `multi_turn_arc_aware_v1` evaluator in `evaluation_prompts`
4. TypeScript types: `src/types/conversation.ts`
5. Type exports: Update `src/types/index.ts`

**What This Section Does NOT Create:**
- Service layer (E02)
- API routes (E03)
- UI components (E04)
- Page routes (E05)

---

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database verification:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'multi_turn_conversations',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/types/pipeline-adapter.ts` — Existing type definitions
- `src/types/index.ts` — Type exports

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-turn-chat-and-evaluation_v1.md`
- SAOL Manual: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\saol-agent-manual_v2.md`

---

========================


## EXECUTION PROMPT E01

You are implementing the database schema and TypeScript types for a multi-turn A/B testing chat module with arc-aware evaluation.

### Context

This module enables:
- Up to 10-turn conversations comparing control (base model) vs adapted (LoRA) endpoints
- Siloed conversation histories for each endpoint
- Optional Claude-as-Judge evaluation per turn
- Multi-turn arc-aware evaluation that measures actual human emotional state

### Task 1: Create Database Tables (IDEMPOTENT)

**IMPORTANT:** These SQL statements are idempotent. They will skip creation if objects already exist.

Execute this **single SQL block** in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard - SQL Editor):

```sql
-- ============================================
-- IDEMPOTENT MULTI-TURN CHAT SCHEMA
-- Safe to run multiple times - skips existing objects
-- ============================================

-- ============================================
-- Table: multi_turn_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS public.multi_turn_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  name TEXT,
  system_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Turn tracking
  turn_count INTEGER NOT NULL DEFAULT 0,
  max_turns INTEGER NOT NULL DEFAULT 10,
  
  -- Token tracking
  control_total_tokens INTEGER DEFAULT 0,
  adapted_total_tokens INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for multi_turn_conversations (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_job_id 
  ON public.multi_turn_conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_user_id 
  ON public.multi_turn_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_status 
  ON public.multi_turn_conversations(status);
CREATE INDEX IF NOT EXISTS idx_multi_turn_conversations_created_at 
  ON public.multi_turn_conversations(created_at DESC);

-- RLS for multi_turn_conversations
ALTER TABLE public.multi_turn_conversations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy (policies don't support IF NOT EXISTS)
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.multi_turn_conversations;
CREATE POLICY "Users can manage own conversations"
  ON public.multi_turn_conversations
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- Table: conversation_turns
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.multi_turn_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  
  -- User input
  user_message TEXT NOT NULL,
  
  -- Control endpoint response
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,
  control_error TEXT,
  
  -- Adapted endpoint response
  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,
  adapted_error TEXT,
  
  -- Per-turn evaluation
  evaluation_enabled BOOLEAN NOT NULL DEFAULT false,
  evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id),
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,
  
  -- Multi-turn arc-aware evaluation fields
  human_emotional_state JSONB,
  arc_progression JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint
  CONSTRAINT unique_turn_per_conversation UNIQUE(conversation_id, turn_number)
);

-- Indexes for conversation_turns (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id 
  ON public.conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_status 
  ON public.conversation_turns(status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_number 
  ON public.conversation_turns(conversation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_evaluator 
  ON public.conversation_turns(evaluation_prompt_id);

-- RLS for conversation_turns
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy
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

-- Column comments
COMMENT ON COLUMN public.conversation_turns.human_emotional_state IS 
  'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';
COMMENT ON COLUMN public.conversation_turns.arc_progression IS 
  'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';

-- ============================================
-- Seed: Multi-Turn Evaluator
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
  'Measures actual human emotional progression across conversation turns. Analyzes human messages for ground-truth emotional state rather than projections.',
  E'You are an expert evaluator specializing in therapeutic communication and emotional intelligence. You are analyzing a MULTI-TURN conversation to measure the human''s actual emotional progression.

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
    "primaryEmotion": "<detected primary emotion from human''s message>",
    "secondaryEmotions": ["<additional emotions detected>"],
    "intensity": <0.0-1.0>,
    "valence": "negative" | "mixed" | "neutral" | "positive",
    "confidence": <0.0-1.0>,
    "evidenceQuotes": ["<direct quotes supporting this assessment>"],
    "stateNotes": "<brief explanation of emotional state detection>"
  },
  
  "emotionalMovement": {
    "comparedToTurn": <turn number being compared to, typically turn 1 or previous turn>,
    "valenceShift": "improved" | "maintained" | "worsened",
    "intensityChange": "reduced" | "unchanged" | "increased",
    "movementQuality": <1-5>,
    "movementNotes": "<explanation of the emotional shift since comparison point>"
  },
  
  "arcProgression": {
    "detectedArc": "<arc_key if trajectory matches, or ''none''>",
    "arcMatchConfidence": <0.0-1.0>,
    "progressionPercentage": <0-100, estimated % through the arc>,
    "onTrack": <true/false>,
    "progressionNotes": "<explanation of arc trajectory status>"
  },
  
  "advisorFacilitation": {
    "emotionsAcknowledged": <true/false>,
    "acknowledgmentQuality": <1-5>,
    "movementFacilitated": <true/false>,
    "facilitationScore": <1-5>,
    "facilitationNotes": "<how well did this response help or hinder progression>"
  },
  
  "voiceConsistency": {
    "warmthPresent": <true/false>,
    "judgmentFree": <true/false>,
    "voiceScore": <1-5>,
    "voiceNotes": "<brief explanation>"
  },
  
  "overallTurnEvaluation": {
    "humanProgressedEmotionally": <true/false>,
    "advisorHelpedProgression": <true/false>,
    "turnQualityScore": <1-5>,
    "cumulativeArcProgress": <1-5, overall arc progress from turn 1 to now>,
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph assessment of this turn''s contribution to arc progression>"
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
-- DONE: All objects created or already exist
-- ============================================
SELECT 'Schema setup complete!' AS result;
```

### Task 2: Verify Database Tables

Run these verification commands:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'multi_turn_conversations',limit:0});console.log('multi_turn_conversations:',r.success?'EXISTS':'MISSING');})();"
```

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversation_turns',limit:0});console.log('conversation_turns:',r.success?'EXISTS':'MISSING');})();"
```

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'evaluation_prompts',select:'id,name,display_name',where:[{column:'name',operator:'eq',value:'multi_turn_arc_aware_v1'}]});console.log('Evaluator found:',r.data?.length>0);if(r.data?.[0])console.log(r.data[0]);})();"
```

### Task 3: Create TypeScript Types

Create file: `src/types/conversation.ts`

```typescript
/**
 * Multi-Turn Conversation Types
 * 
 * Types for the multi-turn A/B testing chat module with arc-aware evaluation
 */

// ============================================
// Status Types
// ============================================

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

export type TurnStatus = 'pending' | 'generating' | 'completed' | 'failed';

// ============================================
// Core Entity Types
// ============================================

export interface Conversation {
  id: string;
  jobId: string;
  userId: string;
  
  // Metadata
  name: string | null;
  systemPrompt: string | null;
  status: ConversationStatus;
  
  // Turn tracking
  turnCount: number;
  maxTurns: number;
  
  // Token tracking
  controlTotalTokens: number;
  adaptedTotalTokens: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  
  // User input
  userMessage: string;
  
  // Control response
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;
  controlError: string | null;
  
  // Adapted response
  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;
  adaptedError: string | null;
  
  // Evaluation
  evaluationEnabled: boolean;
  evaluationPromptId: string | null;
  controlEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  adaptedEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  evaluationComparison: import('./pipeline-adapter').EvaluationComparison | MultiTurnEvaluationComparison | null;
  
  // Multi-turn arc evaluation (ground-truth human emotional state)
  humanEmotionalState: HumanEmotionalState | null;
  arcProgression: ArcProgression | null;
  
  // Status
  status: TurnStatus;
  
  // Timestamps
  createdAt: string;
  completedAt: string | null;
}

// Conversation with turns populated
export interface ConversationWithTurns extends Conversation {
  turns: ConversationTurn[];
}

// ============================================
// Multi-Turn Arc Evaluation Types
// ============================================

export interface HumanEmotionalState {
  turnNumber: number;
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number;  // 0.0-1.0
  valence: 'negative' | 'mixed' | 'neutral' | 'positive';
  confidence: number;  // 0.0-1.0
  evidenceQuotes: string[];
  stateNotes: string;
}

export interface ArcProgression {
  detectedArc: string;  // arc_key or 'none'
  arcMatchConfidence: number;  // 0.0-1.0
  progressionPercentage: number;  // 0-100
  onTrack: boolean;
  progressionNotes: string;
}

export interface AdvisorFacilitation {
  emotionsAcknowledged: boolean;
  acknowledgmentQuality: number;  // 1-5
  movementFacilitated: boolean;
  facilitationScore: number;  // 1-5
  facilitationNotes: string;
}

export interface MultiTurnTurnEvaluation {
  humanProgressedEmotionally: boolean;
  advisorHelpedProgression: boolean;
  turnQualityScore: number;  // 1-5
  cumulativeArcProgress: number;  // 1-5
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

export interface MultiTurnEvaluationComparison {
  winner: 'control' | 'adapted' | 'tie';
  controlTurnScore: number;
  adaptedTurnScore: number;
  scoreDifference: number;
  controlArcProgress: number;
  adaptedArcProgress: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateConversationRequest {
  jobId: string;
  name?: string;
  systemPrompt?: string;
}

export interface CreateConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

export interface AddTurnRequest {
  userMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;  // For arc-aware evaluation
}

export interface AddTurnResponse {
  success: boolean;
  data?: ConversationTurn;
  error?: string;
}

export interface GetConversationResponse {
  success: boolean;
  data?: ConversationWithTurns;
  error?: string;
}

export interface ListConversationsResponse {
  success: boolean;
  data?: Conversation[];
  count?: number;
  error?: string;
}

export interface CompleteConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

// ============================================
// Message Format for Inference
// ============================================

// OpenAI-compatible message format (used for inference calls)
export interface InferenceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================
// Token Tracking Types
// ============================================

export interface TokenUsage {
  controlTokens: number;
  adaptedTokens: number;
  totalTokens: number;
  percentageUsed: number;  // Based on context window
  isNearLimit: boolean;     // True if > 80% used
}

// ============================================
// Constants
// ============================================

export const CONVERSATION_CONSTANTS = {
  MAX_TURNS: 10,
  TOKEN_WARNING_THRESHOLD: 0.8,  // Warn at 80% of context window
  DEFAULT_CONTEXT_WINDOW: 8192,  // Conservative default
} as const;
```

### Task 4: Update Types Index

Add to `src/types/index.ts`:

```typescript
// Multi-turn conversation types
export * from './conversation';
```

### Task 5: Verify TypeScript Build

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
```

**Success Criteria:** Build completes with no TypeScript errors related to conversation types.

---

## Success Criteria

- [ ] `multi_turn_conversations` table exists with 12 columns
- [ ] `conversation_turns` table exists with 20 columns
- [ ] `multi_turn_arc_aware_v1` evaluator exists in `evaluation_prompts`
- [ ] `src/types/conversation.ts` created with all type definitions
- [ ] `src/types/index.ts` exports conversation types
- [ ] TypeScript builds without errors


+++++++++++++++++



---

## Files Created

| File | Purpose |
|------|---------|
| `src/types/conversation.ts` | TypeScript type definitions |

## Database Objects Created

| Object | Type | Purpose |
|--------|------|---------|
| `multi_turn_conversations` | Table | Parent conversation records |
| `conversation_turns` | Table | Individual turn records |
| `multi_turn_arc_aware_v1` | Seed Data | Multi-turn evaluator prompt |

---

**END OF E01 PROMPT**
