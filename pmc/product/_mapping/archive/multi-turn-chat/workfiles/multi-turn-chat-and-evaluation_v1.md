# Multi-Turn Chat with Arc-Aware Evaluation - Integrated Implementation Specification

**Version:** 1.0  
**Date:** January 29, 2026  
**Purpose:** Complete, integrated implementation specification combining multi-turn chat A/B testing with arc-aware emotional evaluation  
**Target Audience:** Senior coding agents implementing the system  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Phase 1: Database Schema](#4-phase-1-database-schema)
5. [Phase 2: TypeScript Types](#5-phase-2-typescript-types)
6. [Phase 3: Service Layer](#6-phase-3-service-layer)
7. [Phase 4: API Routes](#7-phase-4-api-routes)
8. [Phase 5: React Hooks](#8-phase-5-react-hooks)
9. [Phase 6: UI Components](#9-phase-6-ui-components)
10. [Phase 7: Page Route](#10-phase-7-page-route)
11. [Implementation Checklist](#11-implementation-checklist)
12. [Verification Plan](#12-verification-plan)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

### 1.1 Project Goal

Build an integrated multi-turn A/B testing chat module with arc-aware emotional evaluation that:

1. **Enables sustained conversations** - Up to 10 turns per conversation with both control (base model) and adapted (LoRA-enhanced) endpoints simultaneously
2. **Maintains siloed histories** - Each endpoint receives only its own conversation history (critical for fair A/B comparison)
3. **Measures actual emotional progression** - Uses Claude-as-Judge to analyze the human's actual emotional state from their messages (not projections)
4. **Tracks arc progression** - Cumulative measurement of therapeutic emotional arc completion across turns

### 1.2 Key Architectural Decisions

| Decision | Specification |
|----------|---------------|
| **History Siloing** | Control and adapted endpoints receive SEPARATE conversation histories |
| **Stateless Endpoints** | Full message history passed with each request (RunPod endpoints are stateless) |
| **Optional Evaluation** | Per-turn Claude-as-Judge evaluation is opt-in via toggle |
| **Multi-Turn vs Single-Turn Evaluator** | System detects evaluator type and uses appropriate evaluation path |
| **Turn Limit** | 10 turns maximum per conversation (token budget management) |
| **Page Location** | `/pipeline/jobs/[jobId]/chat` (separate from single-turn test page) |

### 1.3 Critical Design Insight

**Single-Turn vs Multi-Turn Evaluation:**

| Aspect | Single-Turn (existing) | Multi-Turn (this module) |
|--------|------------------------|--------------------------|
| **What is measured** | Projected user emotion based on model response | **Actual** user emotion based on human's reply text |
| **Data source** | Model's answer only | Human's reply text in each turn |
| **Ground truth** | Inference from response quality | Human's own words reveal their state |

> **Key Insight:** In single-turn, we *project* what the human would feel. In multi-turn, **the human tells us** how they feel by continuing the conversation.

### 1.4 Implementation Phases Summary

| Phase | Scope | Dependencies |
|-------|-------|--------------|
| Phase 1 | Database Schema | None |
| Phase 2 | TypeScript Types | Phase 1 |
| Phase 3 | Service Layer | Phases 1-2 |
| Phase 4 | API Routes | Phase 3 |
| Phase 5 | React Hooks | Phase 4 |
| Phase 6 | UI Components | Phase 5 |
| Phase 7 | Page Route | Phase 6 |

---

## 2. Architecture Overview

### 2.1 System Flow Diagram

```
User enters message in Chat UI
        ↓
POST /api/pipeline/conversations/[id]/turn
        ↓
conversation-service.ts: addTurn()
        ├── Build control messages (siloed history)
        ├── Build adapted messages (siloed history)
        └── Call both endpoints in parallel
                ↓
        ┌───────────────────┬───────────────────┐
        ↓                   ↓                   
Control Pod (base)    Adapted Pod (LoRA)
        ↓                   ↓
        └───────────────────┴───────────────────┘
                        ↓
            If evaluation enabled:
                        ↓
            Check evaluator type
        ┌───────────────────────────────────┐
        ↓                                   ↓
  Multi-Turn Evaluator             Single-Turn Evaluator
  (measures actual human           (existing logic)
   emotional state)
        ↓                                   ↓
        └───────────────────┬───────────────┘
                            ↓
                Store turn + evaluation in DB
                            ↓
                Return response to UI
```

### 2.2 Data Model Relationships

```
pipeline_training_jobs (existing)
        │
        │ 1:N
        ↓
multi_turn_conversations (NEW)
        │
        │ 1:N
        ↓
conversation_turns (NEW)
        │
        │ N:1
        ↓
evaluation_prompts (existing - add new evaluator)
```

### 2.3 Files to Create/Modify

**New Files:**
- `src/types/conversation.ts` — Type definitions
- `src/lib/services/conversation-service.ts` — Service layer
- `src/app/api/pipeline/conversations/route.ts` — API routes
- `src/app/api/pipeline/conversations/[id]/route.ts`
- `src/app/api/pipeline/conversations/[id]/turn/route.ts`
- `src/app/api/pipeline/conversations/[id]/complete/route.ts`
- `src/hooks/useDualChat.ts` — React hook
- `src/components/pipeline/chat/MultiTurnChat.tsx` — Main component
- `src/components/pipeline/chat/ChatSidebar.tsx`
- `src/components/pipeline/chat/ChatMain.tsx`
- `src/components/pipeline/chat/ChatHeader.tsx`
- `src/components/pipeline/chat/ChatMessageList.tsx`
- `src/components/pipeline/chat/ChatTurn.tsx`
- `src/components/pipeline/chat/ChatInput.tsx`
- `src/components/pipeline/chat/DualResponsePanel.tsx`
- `src/components/pipeline/chat/TokenUsageBar.tsx`
- `src/components/pipeline/chat/ArcProgressionBar.tsx` — Arc visualization
- `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx`

**Files to Modify:**
- `src/types/index.ts` — Export new types
- `src/lib/services/index.ts` — Export new services
- `src/hooks/index.ts` — Export new hooks
- Database: Insert new evaluator into `evaluation_prompts`

---

## 3. Technology Stack

### 3.1 Frontend Dependencies

| Technology | Purpose |
|------------|---------|
| Next.js 14 | App Router framework |
| TypeScript | Type safety |
| React Query v5 | Server state management |
| Shadcn/UI | UI components |
| Tailwind CSS | Styling |
| `@chatscope/chat-ui-kit-react` | Chat UI components (NEW) |

### 3.2 Backend Dependencies

| Technology | Purpose |
|------------|---------|
| Supabase | Database and auth |
| Next.js API Routes | API layer |
| Anthropic Claude API | Claude-as-Judge evaluation |
| RunPod Pods | Inference endpoints |

### 3.3 Database Operations

**CRITICAL:** All database operations MUST use the Supabase Agent Ops Library (SAOL).

**Library Path:** `supa-agent-ops/`  
**Documentation:** `supa-agent-ops/QUICK_START.md`

---

## 4. Phase 1: Database Schema

### 4.1 Table: multi_turn_conversations

Create this table to store parent records for multi-turn chat sessions.

```sql
-- ============================================
-- Table: multi_turn_conversations
-- Purpose: Parent record for a multi-turn chat session
-- ============================================

CREATE TABLE public.multi_turn_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  name TEXT,                                    -- User-assigned name (optional)
  system_prompt TEXT,                           -- System prompt for this conversation
  status TEXT NOT NULL DEFAULT 'active',        -- active | completed | abandoned
  
  -- Turn tracking
  turn_count INTEGER NOT NULL DEFAULT 0,        -- Current number of turns
  max_turns INTEGER NOT NULL DEFAULT 10,        -- Maximum turns allowed
  
  -- Token tracking
  control_total_tokens INTEGER DEFAULT 0,       -- Cumulative tokens for control
  adapted_total_tokens INTEGER DEFAULT 0,       -- Cumulative tokens for adapted
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE         -- When status changed to completed
);

-- Indexes
CREATE INDEX idx_multi_turn_conversations_job_id ON public.multi_turn_conversations(job_id);
CREATE INDEX idx_multi_turn_conversations_user_id ON public.multi_turn_conversations(user_id);
CREATE INDEX idx_multi_turn_conversations_status ON public.multi_turn_conversations(status);
CREATE INDEX idx_multi_turn_conversations_created_at ON public.multi_turn_conversations(created_at DESC);

-- RLS
ALTER TABLE public.multi_turn_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.multi_turn_conversations
  FOR ALL
  USING (auth.uid() = user_id);
```

### 4.2 Table: conversation_turns

Create this table to store individual turns within a conversation. **NOTE:** This table includes ALL columns from both the chat and arc measurement specs (integrated).

```sql
-- ============================================
-- Table: conversation_turns
-- Purpose: Individual turns within a conversation
-- Includes: Base chat fields + Arc measurement fields
-- ============================================

CREATE TABLE public.conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.multi_turn_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,                 -- 1-indexed turn number
  
  -- User input (same for both endpoints)
  user_message TEXT NOT NULL,
  
  -- Control endpoint response
  control_response TEXT,                        -- NULL if still generating
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,
  control_error TEXT,                           -- Error message if failed
  
  -- Adapted endpoint response
  adapted_response TEXT,                        -- NULL if still generating
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,
  adapted_error TEXT,                           -- Error message if failed
  
  -- Per-turn Claude-as-Judge evaluation (optional feature)
  evaluation_enabled BOOLEAN NOT NULL DEFAULT false,
  evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id),  -- Which evaluator was used
  control_evaluation JSONB,                     -- ClaudeEvaluation JSON
  adapted_evaluation JSONB,                     -- ClaudeEvaluation JSON
  evaluation_comparison JSONB,                  -- EvaluationComparison JSON
  
  -- Multi-turn arc-aware evaluation fields (ground-truth human emotional state)
  human_emotional_state JSONB,                  -- { primaryEmotion, intensity, valence, ... }
  arc_progression JSONB,                        -- { detectedArc, progressionPercentage, onTrack, ... }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | generating | completed | failed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique turn numbers per conversation
  CONSTRAINT unique_turn_per_conversation UNIQUE(conversation_id, turn_number)
);

-- Indexes
CREATE INDEX idx_conversation_turns_conversation_id ON public.conversation_turns(conversation_id);
CREATE INDEX idx_conversation_turns_status ON public.conversation_turns(status);
CREATE INDEX idx_conversation_turns_turn_number ON public.conversation_turns(conversation_id, turn_number);
CREATE INDEX idx_conversation_turns_evaluator ON public.conversation_turns(evaluation_prompt_id);

-- RLS inherits from parent via foreign key
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage turns of own conversations"
  ON public.conversation_turns
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.multi_turn_conversations
      WHERE user_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON COLUMN public.conversation_turns.human_emotional_state IS 
  'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';

COMMENT ON COLUMN public.conversation_turns.arc_progression IS 
  'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';
```

### 4.3 Seed Data: Multi-Turn Arc-Aware Evaluator

Insert the new multi-turn evaluator prompt into the `evaluation_prompts` table.

```sql
-- Insert multi-turn arc-aware evaluator
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
  true,   -- includes_arc_context
  false,  -- is_default (not the default - let users choose explicitly)
  'claude-sonnet-4-20250514',
  3000,   -- Higher token limit for multi-turn context
  true    -- is_active
)
ON CONFLICT (name) DO NOTHING;
```

### 4.4 Migration File Locations

Create migration files at:
```
supa-agent-ops/migrations/YYYYMMDD_create_multi_turn_conversations.sql
supa-agent-ops/migrations/YYYYMMDD_create_conversation_turns.sql
supa-agent-ops/migrations/YYYYMMDD_seed_multi_turn_evaluator.sql
```

Or paste the SQL directly into Supabase Dashboard → SQL Editor.

---

## 5. Phase 2: TypeScript Types

### 5.1 Create Types File

Create `src/types/conversation.ts`:

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

### 5.2 Update Types Index

Add to `src/types/index.ts`:

```typescript
export * from './conversation';
```

---

## 6. Phase 3: Service Layer

### 6.1 Create Conversation Service

Create `src/lib/services/conversation-service.ts`:

```typescript
/**
 * Conversation Service
 * 
 * Manages multi-turn A/B testing conversations with optional arc-aware evaluation
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import {
  Conversation,
  ConversationTurn,
  ConversationWithTurns,
  CreateConversationRequest,
  AddTurnRequest,
  InferenceMessage,
  HumanEmotionalState,
  ArcProgression,
  MultiTurnEvaluationComparison,
  CONVERSATION_CONSTANTS,
} from '@/types/conversation';
import { callInferenceEndpoint, getEndpointStatus } from './inference-service';
import { evaluateWithClaude, compareEvaluations, getEvaluationPrompt, getEmotionalArcsContext } from './test-service';

// ============================================
// Database Mappers
// ============================================

function mapDbRowToConversation(row: any): Conversation {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    name: row.name,
    systemPrompt: row.system_prompt,
    status: row.status,
    turnCount: row.turn_count,
    maxTurns: row.max_turns,
    controlTotalTokens: row.control_total_tokens,
    adaptedTotalTokens: row.adapted_total_tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapDbRowToTurn(row: any): ConversationTurn {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    turnNumber: row.turn_number,
    userMessage: row.user_message,
    controlResponse: row.control_response,
    controlGenerationTimeMs: row.control_generation_time_ms,
    controlTokensUsed: row.control_tokens_used,
    controlError: row.control_error,
    adaptedResponse: row.adapted_response,
    adaptedGenerationTimeMs: row.adapted_generation_time_ms,
    adaptedTokensUsed: row.adapted_tokens_used,
    adaptedError: row.adapted_error,
    evaluationEnabled: row.evaluation_enabled,
    evaluationPromptId: row.evaluation_prompt_id,
    controlEvaluation: row.control_evaluation,
    adaptedEvaluation: row.adapted_evaluation,
    evaluationComparison: row.evaluation_comparison,
    humanEmotionalState: row.human_emotional_state,
    arcProgression: row.arc_progression,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// ============================================
// History Building Functions
// ============================================

/**
 * Build OpenAI-compatible messages array for an endpoint.
 * CRITICAL: Each endpoint gets its OWN history (siloed).
 */
export async function buildMessagesForEndpoint(
  conversationId: string,
  endpointType: 'control' | 'adapted',
  systemPrompt: string | null,
  newUserMessage: string
): Promise<InferenceMessage[]> {
  const supabase = await createServerSupabaseClient();
  
  // Fetch all completed turns for this conversation
  const { data: turns, error } = await supabase
    .from('conversation_turns')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('status', 'completed')
    .order('turn_number', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch conversation history:', error);
    throw new Error('Failed to build message history');
  }
  
  const messages: InferenceMessage[] = [];
  
  // Add system prompt if present
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  // Add historical turns (use the correct endpoint's response)
  for (const turn of turns || []) {
    messages.push({ role: 'user', content: turn.user_message });
    
    const response = endpointType === 'control' 
      ? turn.control_response 
      : turn.adapted_response;
    
    if (response) {
      messages.push({ role: 'assistant', content: response });
    }
  }
  
  // Add the new user message
  messages.push({ role: 'user', content: newUserMessage });
  
  return messages;
}

/**
 * Build formatted conversation history for multi-turn evaluation prompt
 */
function buildConversationHistoryContext(
  turns: ConversationTurn[],
  endpointType: 'control' | 'adapted'
): string {
  if (turns.length === 0) {
    return 'This is the first turn.';
  }
  
  return turns.map(turn => {
    const response = endpointType === 'control' 
      ? turn.controlResponse 
      : turn.adaptedResponse;
    
    const evaluation = turn.humanEmotionalState 
      ? `EVALUATION: Human showed ${turn.humanEmotionalState.primaryEmotion} at intensity ${turn.humanEmotionalState.intensity}`
      : '';
    
    return `--- Turn ${turn.turnNumber} ---
HUMAN: ${turn.userMessage}
ADVISOR: ${response || '[No response]'}
${evaluation}`;
  }).join('\n\n');
}

/**
 * Build summary of previous turn's evaluation for context
 */
function buildPreviousEvaluationSummary(
  previousTurn: ConversationTurn | null
): string {
  if (!previousTurn || !previousTurn.humanEmotionalState) {
    return 'This is the first turn being evaluated. No previous evaluation data.';
  }
  
  const state = previousTurn.humanEmotionalState;
  const arc = previousTurn.arcProgression;
  
  return `Previous turn (Turn ${previousTurn.turnNumber}):
- Human's emotional state: ${state.primaryEmotion} (intensity: ${state.intensity}, valence: ${state.valence})
- Arc detected: ${arc?.detectedArc || 'none'}
- Arc progress: ${arc?.progressionPercentage || 0}%
${arc?.onTrack ? '- Status: On track for arc completion' : '- Status: Not currently on a clear arc trajectory'}`;
}

// ============================================
// Multi-Turn Evaluation Functions
// ============================================

/**
 * Check if an evaluation prompt is a multi-turn evaluator
 */
async function isMultiTurnEvaluatorPrompt(promptId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('evaluation_prompts')
    .select('name')
    .eq('id', promptId)
    .single();
  
  return data?.name?.includes('multi_turn') || false;
}

/**
 * Get all turns for a conversation
 */
async function getTurnsForConversation(conversationId: string): Promise<ConversationTurn[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('conversation_turns')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('turn_number', { ascending: true });
  
  return (data || []).map(mapDbRowToTurn);
}

/**
 * Evaluate a single turn with full multi-turn context
 * Uses the multi-turn arc-aware evaluator
 */
export async function evaluateTurnWithMultiTurnContext(
  conversation: Conversation,
  allTurns: ConversationTurn[],
  currentTurn: ConversationTurn,
  endpointType: 'control' | 'adapted',
  evaluationPromptId?: string
): Promise<{
  humanEmotionalState: HumanEmotionalState;
  arcProgression: ArcProgression;
  advisorFacilitation: any;
  overallTurnEvaluation: any;
}> {
  const supabase = await createServerSupabaseClient();
  
  // Get the evaluation prompt
  const promptConfig = await getEvaluationPrompt(evaluationPromptId);
  
  // Build context
  const previousTurns = allTurns.filter(t => t.turnNumber < currentTurn.turnNumber);
  const previousTurn = previousTurns.length > 0 
    ? previousTurns[previousTurns.length - 1] 
    : null;
  
  const conversationHistory = buildConversationHistoryContext(previousTurns, endpointType);
  const previousEvalSummary = buildPreviousEvaluationSummary(previousTurn);
  const arcsContext = promptConfig.includesArcContext 
    ? await getEmotionalArcsContext()
    : '';
  
  const response = endpointType === 'control'
    ? currentTurn.controlResponse
    : currentTurn.adaptedResponse;
  
  // Build the full prompt
  let prompt = promptConfig.promptTemplate
    .replace('{emotional_arcs}', arcsContext)
    .replace('{turn_count}', String(conversation.turnCount))
    .replace('{conversation_history}', conversationHistory)
    .replace(/{current_turn}/g, String(currentTurn.turnNumber))
    .replace('{user_message}', currentTurn.userMessage)
    .replace('{response}', response || '[No response]')
    .replace('{previous_evaluation_summary}', previousEvalSummary);
  
  // Call Claude
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  const claudeResponse = await anthropic.messages.create({
    model: promptConfig.model,
    max_tokens: promptConfig.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  
  let responseText = claudeResponse.content[0].type === 'text'
    ? claudeResponse.content[0].text
    : '';
  
  // Strip markdown code blocks
  responseText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  
  const evaluation = JSON.parse(responseText);
  
  return {
    humanEmotionalState: evaluation.humanEmotionalState,
    arcProgression: evaluation.arcProgression,
    advisorFacilitation: evaluation.advisorFacilitation,
    overallTurnEvaluation: evaluation.overallTurnEvaluation,
  };
}

/**
 * Compare multi-turn evaluations between control and adapted
 */
function compareMultiTurnEvaluations(
  controlEval: any,
  adaptedEval: any
): MultiTurnEvaluationComparison {
  const controlScore = controlEval.overallTurnEvaluation?.turnQualityScore || 0;
  const adaptedScore = adaptedEval.overallTurnEvaluation?.turnQualityScore || 0;
  const scoreDiff = adaptedScore - controlScore;
  
  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';
  
  const improvements: string[] = [];
  const regressions: string[] = [];
  
  // Compare facilitation scores
  const controlFacilitation = controlEval.advisorFacilitation?.facilitationScore || 0;
  const adaptedFacilitation = adaptedEval.advisorFacilitation?.facilitationScore || 0;
  
  if (adaptedFacilitation > controlFacilitation) {
    improvements.push('Better emotional facilitation');
  } else if (adaptedFacilitation < controlFacilitation) {
    regressions.push('Worse emotional facilitation');
  }
  
  // Compare arc progress
  const controlArcProgress = controlEval.overallTurnEvaluation?.cumulativeArcProgress || 0;
  const adaptedArcProgress = adaptedEval.overallTurnEvaluation?.cumulativeArcProgress || 0;
  
  if (adaptedArcProgress > controlArcProgress) {
    improvements.push('Better arc progression');
  } else if (adaptedArcProgress < controlArcProgress) {
    regressions.push('Worse arc progression');
  }
  
  return {
    winner,
    controlTurnScore: controlScore,
    adaptedTurnScore: adaptedScore,
    scoreDifference: scoreDiff,
    controlArcProgress,
    adaptedArcProgress,
    improvements,
    regressions,
    summary: `The ${winner === 'tie' ? 'responses are comparable' : winner + ' response performed better'} for emotional facilitation.`,
  };
}

// ============================================
// Core Service Functions
// ============================================

/**
 * Create a new multi-turn conversation
 */
export async function createConversation(
  userId: string,
  request: CreateConversationRequest
): Promise<{ success: boolean; data?: Conversation; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Verify job exists and belongs to user
    const { data: job, error: jobError } = await supabase
      .from('pipeline_training_jobs')
      .select('id, user_id, status')
      .eq('id', request.jobId)
      .single();
    
    if (jobError || !job) {
      return { success: false, error: 'Job not found' };
    }
    
    if (job.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Verify endpoints are deployed and ready
    const endpointStatus = await getEndpointStatus(request.jobId);
    if (!endpointStatus.success || !endpointStatus.data?.bothReady) {
      return { success: false, error: 'Endpoints not ready. Deploy endpoints first.' };
    }
    
    // Create the conversation
    const { data: conversation, error: insertError } = await supabase
      .from('multi_turn_conversations')
      .insert({
        job_id: request.jobId,
        user_id: userId,
        name: request.name || null,
        system_prompt: request.systemPrompt || null,
        status: 'active',
        turn_count: 0,
        max_turns: CONVERSATION_CONSTANTS.MAX_TURNS,
        control_total_tokens: 0,
        adapted_total_tokens: 0,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to create conversation:', insertError);
      return { success: false, error: 'Failed to create conversation' };
    }
    
    return { success: true, data: mapDbRowToConversation(conversation) };
  } catch (error) {
    console.error('Create conversation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add a turn to an existing conversation
 */
export async function addTurn(
  userId: string,
  conversationId: string,
  request: AddTurnRequest
): Promise<{ success: boolean; data?: ConversationTurn; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Fetch conversation and verify ownership
    const { data: conversation, error: convError } = await supabase
      .from('multi_turn_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    if (conversation.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    if (conversation.status !== 'active') {
      return { success: false, error: 'Conversation is not active' };
    }
    
    if (conversation.turn_count >= conversation.max_turns) {
      return { success: false, error: 'Maximum turns reached' };
    }
    
    const nextTurnNumber = conversation.turn_count + 1;
    
    // Create turn record with generating status
    const { data: turn, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: conversationId,
        turn_number: nextTurnNumber,
        user_message: request.userMessage,
        evaluation_enabled: request.enableEvaluation || false,
        evaluation_prompt_id: request.evaluationPromptId || null,
        status: 'generating',
      })
      .select()
      .single();
    
    if (turnError) {
      console.error('Failed to create turn:', turnError);
      return { success: false, error: 'Failed to create turn' };
    }
    
    // Get endpoint IDs
    const { data: endpoints } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', conversation.job_id);
    
    const controlEndpoint = endpoints?.find(e => e.endpoint_type === 'control');
    const adaptedEndpoint = endpoints?.find(e => e.endpoint_type === 'adapted');
    
    if (!controlEndpoint || !adaptedEndpoint) {
      await supabase
        .from('conversation_turns')
        .update({ status: 'failed', control_error: 'Endpoints not found' })
        .eq('id', turn.id);
      return { success: false, error: 'Endpoints not found' };
    }
    
    // Build message histories for each endpoint (SILOED)
    const controlMessages = await buildMessagesForEndpoint(
      conversationId,
      'control',
      conversation.system_prompt,
      request.userMessage
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      conversationId,
      'adapted',
      conversation.system_prompt,
      request.userMessage
    );
    
    // Convert messages to prompt format for inference
    // NOTE: The inference service may need to be extended to accept messages array
    const controlPrompt = controlMessages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    const adaptedPrompt = adaptedMessages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    const systemPrompt = conversation.system_prompt || undefined;
    
    // Call both endpoints in parallel
    const [controlResult, adaptedResult] = await Promise.allSettled([
      callInferenceEndpoint(
        controlEndpoint.runpod_endpoint_id,
        controlPrompt,
        systemPrompt,
        false  // No adapter for control
      ),
      callInferenceEndpoint(
        adaptedEndpoint.runpod_endpoint_id,
        adaptedPrompt,
        systemPrompt,
        true,  // Use adapter
        adaptedEndpoint.adapter_path,
        conversation.job_id
      ),
    ]);
    
    // Process results
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    
    if (controlResult.status === 'fulfilled') {
      updateData.control_response = controlResult.value.response;
      updateData.control_generation_time_ms = controlResult.value.generationTimeMs;
      updateData.control_tokens_used = controlResult.value.tokensUsed;
    } else {
      updateData.control_error = controlResult.reason?.message || 'Control endpoint failed';
    }
    
    if (adaptedResult.status === 'fulfilled') {
      updateData.adapted_response = adaptedResult.value.response;
      updateData.adapted_generation_time_ms = adaptedResult.value.generationTimeMs;
      updateData.adapted_tokens_used = adaptedResult.value.tokensUsed;
    } else {
      updateData.adapted_error = adaptedResult.reason?.message || 'Adapted endpoint failed';
    }
    
    // If evaluation is enabled and both responses succeeded
    if (
      request.enableEvaluation &&
      controlResult.status === 'fulfilled' &&
      adaptedResult.status === 'fulfilled'
    ) {
      try {
        // Check if using multi-turn evaluator
        const isMultiTurn = request.evaluationPromptId && 
          (await isMultiTurnEvaluatorPrompt(request.evaluationPromptId));
        
        if (isMultiTurn) {
          // Use multi-turn evaluation
          const allTurns = await getTurnsForConversation(conversationId);
          const currentTurnData = mapDbRowToTurn({ ...turn, ...updateData });
          
          const [controlEval, adaptedEval] = await Promise.all([
            evaluateTurnWithMultiTurnContext(
              mapDbRowToConversation(conversation),
              allTurns,
              currentTurnData,
              'control',
              request.evaluationPromptId
            ),
            evaluateTurnWithMultiTurnContext(
              mapDbRowToConversation(conversation),
              allTurns,
              currentTurnData,
              'adapted',
              request.evaluationPromptId
            ),
          ]);
          
          updateData.control_evaluation = controlEval;
          updateData.adapted_evaluation = adaptedEval;
          updateData.human_emotional_state = controlEval.humanEmotionalState; // Same for both
          updateData.arc_progression = controlEval.arcProgression; // From control perspective
          updateData.evaluation_comparison = compareMultiTurnEvaluations(controlEval, adaptedEval);
        } else {
          // Use single-turn evaluation (existing logic)
          const [controlEval, adaptedEval] = await Promise.all([
            evaluateWithClaude(
              request.userMessage,
              controlResult.value.response,
              systemPrompt,
              request.evaluationPromptId
            ),
            evaluateWithClaude(
              request.userMessage,
              adaptedResult.value.response,
              systemPrompt,
              request.evaluationPromptId
            ),
          ]);
          
          const comparison = compareEvaluations(controlEval, adaptedEval);
          
          updateData.control_evaluation = controlEval;
          updateData.adapted_evaluation = adaptedEval;
          updateData.evaluation_comparison = comparison;
        }
      } catch (evalError) {
        console.error('Evaluation failed:', evalError);
        // Continue without evaluation - don't fail the turn
      }
    }
    
    // Mark as failed if both endpoints failed
    if (controlResult.status === 'rejected' && adaptedResult.status === 'rejected') {
      updateData.status = 'failed';
    }
    
    // Update the turn
    const { data: updatedTurn, error: updateError } = await supabase
      .from('conversation_turns')
      .update(updateData)
      .eq('id', turn.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Failed to update turn:', updateError);
      return { success: false, error: 'Failed to update turn' };
    }
    
    // Update conversation turn count and token totals
    const newControlTokens = updateData.control_tokens_used || 0;
    const newAdaptedTokens = updateData.adapted_tokens_used || 0;
    
    await supabase
      .from('multi_turn_conversations')
      .update({
        turn_count: nextTurnNumber,
        control_total_tokens: conversation.control_total_tokens + newControlTokens,
        adapted_total_tokens: conversation.adapted_total_tokens + newAdaptedTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    
    return { success: true, data: mapDbRowToTurn(updatedTurn) };
  } catch (error) {
    console.error('Add turn error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a conversation with all its turns
 */
export async function getConversation(
  userId: string,
  conversationId: string
): Promise<{ success: boolean; data?: ConversationWithTurns; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: conversation, error: convError } = await supabase
      .from('multi_turn_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    if (conversation.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data: turns, error: turnsError } = await supabase
      .from('conversation_turns')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('turn_number', { ascending: true });
    
    if (turnsError) {
      return { success: false, error: 'Failed to fetch turns' };
    }
    
    return {
      success: true,
      data: {
        ...mapDbRowToConversation(conversation),
        turns: (turns || []).map(mapDbRowToTurn),
      },
    };
  } catch (error) {
    console.error('Get conversation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all conversations for a job
 */
export async function listConversations(
  userId: string,
  jobId: string
): Promise<{ success: boolean; data?: Conversation[]; count?: number; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data, error, count } = await supabase
      .from('multi_turn_conversations')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: (data || []).map(mapDbRowToConversation),
      count: count || 0,
    };
  } catch (error) {
    console.error('List conversations error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a conversation as completed
 */
export async function completeConversation(
  userId: string,
  conversationId: string
): Promise<{ success: boolean; data?: Conversation; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: conversation, error: fetchError } = await supabase
      .from('multi_turn_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (fetchError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    if (conversation.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('multi_turn_conversations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();
    
    if (updateError) {
      return { success: false, error: 'Failed to complete conversation' };
    }
    
    return { success: true, data: mapDbRowToConversation(updated) };
  } catch (error) {
    console.error('Complete conversation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: conversation, error: fetchError } = await supabase
      .from('multi_turn_conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();
    
    if (fetchError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    if (conversation.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { error: deleteError } = await supabase
      .from('multi_turn_conversations')
      .delete()
      .eq('id', conversationId);
    
    if (deleteError) {
      return { success: false, error: 'Failed to delete conversation' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete conversation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 6.2 Export from Services Index

Add to `src/lib/services/index.ts`:

```typescript
export * from './conversation-service';
```

---

## 7. Phase 4: API Routes

### 7.1 Route Structure

```
src/app/api/pipeline/conversations/
├── route.ts                     # GET (list), POST (create)
└── [id]/
    ├── route.ts                 # GET (with turns), DELETE
    ├── turn/
    │   └── route.ts             # POST (add turn)
    └── complete/
        └── route.ts             # POST (mark completed)
```

### 7.2 Main Conversations Route

Create `src/app/api/pipeline/conversations/route.ts`:

```typescript
/**
 * API Route: /api/pipeline/conversations
 * 
 * GET  - List conversations for a job
 * POST - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createConversation, listConversations } from '@/lib/services';
import { CreateConversationRequest } from '@/types/conversation';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }
    
    const result = await listConversations(user.id, jobId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: CreateConversationRequest = await req.json();
    
    if (!body.jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }
    
    const result = await createConversation(user.id, body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### 7.3 Single Conversation Route

Create `src/app/api/pipeline/conversations/[id]/route.ts`:

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]
 * 
 * GET    - Get conversation with all turns
 * DELETE - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getConversation, deleteConversation } from '@/lib/services';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await getConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await deleteConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('DELETE /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### 7.4 Add Turn Route

Create `src/app/api/pipeline/conversations/[id]/turn/route.ts`:

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/turn
 * 
 * POST - Add a new turn to the conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { addTurn } from '@/lib/services';
import { AddTurnRequest } from '@/types/conversation';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: AddTurnRequest = await req.json();
    
    if (!body.userMessage || body.userMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'userMessage is required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### 7.5 Complete Conversation Route

Create `src/app/api/pipeline/conversations/[id]/complete/route.ts`:

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/complete
 * 
 * POST - Mark conversation as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { completeConversation } from '@/lib/services';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await completeConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/complete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 8. Phase 5: React Hooks

### 8.1 useDualChat Hook

Create `src/hooks/useDualChat.ts`:

```typescript
/**
 * useDualChat Hook
 * 
 * Manages state for multi-turn A/B testing chat interface with arc evaluation
 */

'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Conversation,
  ConversationTurn,
  ConversationWithTurns,
  CreateConversationRequest,
  AddTurnRequest,
  TokenUsage,
  CONVERSATION_CONSTANTS,
} from '@/types/conversation';

// Query keys
const conversationKeys = {
  all: ['conversations'] as const,
  list: (jobId: string) => [...conversationKeys.all, 'list', jobId] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
};

// API functions
async function fetchConversations(jobId: string): Promise<Conversation[]> {
  const res = await fetch(`/api/pipeline/conversations?jobId=${jobId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchConversation(id: string): Promise<ConversationWithTurns> {
  const res = await fetch(`/api/pipeline/conversations/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function createConversationApi(request: CreateConversationRequest): Promise<Conversation> {
  const res = await fetch('/api/pipeline/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function addTurnApi(conversationId: string, request: AddTurnRequest): Promise<ConversationTurn> {
  const res = await fetch(`/api/pipeline/conversations/${conversationId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function completeConversationApi(id: string): Promise<Conversation> {
  const res = await fetch(`/api/pipeline/conversations/${id}/complete`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function deleteConversationApi(id: string): Promise<void> {
  const res = await fetch(`/api/pipeline/conversations/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}

// Hook return type
export interface UseDualChatReturn {
  // Conversation list (for sidebar)
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Current conversation
  conversation: ConversationWithTurns | null;
  isLoadingConversation: boolean;
  
  // Turns
  turns: ConversationTurn[];
  
  // Input state
  input: string;
  setInput: (value: string) => void;
  
  // Evaluation settings
  enableEvaluation: boolean;
  setEnableEvaluation: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  setSelectedEvaluatorId: (id: string | undefined) => void;
  
  // Loading states
  isSending: boolean;
  isCreating: boolean;
  
  // Error state
  error: Error | null;
  
  // Token tracking
  tokenUsage: TokenUsage;
  
  // Actions
  sendMessage: (message?: string) => Promise<void>;
  startNewConversation: (name?: string, systemPrompt?: string) => Promise<void>;
  selectConversation: (conversationId: string) => void;
  endConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  
  // Status
  canSendMessage: boolean;
  isAtMaxTurns: boolean;
}

export function useDualChat(jobId: string, initialConversationId?: string): UseDualChatReturn {
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [input, setInput] = useState('');
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string | undefined>();
  const queryClient = useQueryClient();
  
  // Fetch conversations list
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useQuery({
    queryKey: conversationKeys.list(jobId),
    queryFn: () => fetchConversations(jobId),
    enabled: !!jobId,
  });
  
  // Fetch selected conversation with turns
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    error,
  } = useQuery({
    queryKey: conversationKeys.detail(selectedId || ''),
    queryFn: () => fetchConversation(selectedId!),
    enabled: !!selectedId,
  });
  
  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: createConversationApi,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      setSelectedId(newConversation.id);
    },
  });
  
  // Add turn mutation
  const addTurnMutation = useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: AddTurnRequest }) =>
      addTurnApi(conversationId, request),
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
      }
      setInput('');
    },
  });
  
  // Complete conversation mutation
  const completeMutation = useMutation({
    mutationFn: completeConversationApi,
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
        queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      }
    },
  });
  
  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      if (selectedId === deletedId) {
        setSelectedId(null);
      }
    },
  });
  
  // Computed values
  const turns = conversation?.turns || [];
  
  const tokenUsage: TokenUsage = {
    controlTokens: conversation?.controlTotalTokens || 0,
    adaptedTokens: conversation?.adaptedTotalTokens || 0,
    totalTokens: (conversation?.controlTotalTokens || 0) + (conversation?.adaptedTotalTokens || 0),
    percentageUsed: 0, // TODO: Calculate based on model's context window
    isNearLimit: false, // TODO: Implement
  };
  
  const isAtMaxTurns = (conversation?.turnCount || 0) >= CONVERSATION_CONSTANTS.MAX_TURNS;
  
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    input.trim().length > 0;
  
  // Actions
  const sendMessage = useCallback(async (message?: string) => {
    if (!selectedId) return;
    
    const messageToSend = message || input;
    if (!messageToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        userMessage: messageToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, input, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
  
  const startNewConversation = useCallback(async (name?: string, systemPrompt?: string) => {
    await createMutation.mutateAsync({
      jobId,
      name,
      systemPrompt,
    });
  }, [jobId, createMutation]);
  
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setInput('');
  }, []);
  
  const endConversation = useCallback(async () => {
    if (!selectedId) return;
    await completeMutation.mutateAsync(selectedId);
  }, [selectedId, completeMutation]);
  
  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);
  
  return {
    // Conversation list
    conversations,
    isLoadingConversations,
    
    // Current conversation
    conversation: conversation || null,
    isLoadingConversation,
    
    // Turns
    turns,
    
    // Input
    input,
    setInput,
    
    // Evaluation settings
    enableEvaluation,
    setEnableEvaluation,
    selectedEvaluatorId,
    setSelectedEvaluatorId,
    
    // Loading states
    isSending: addTurnMutation.isPending,
    isCreating: createMutation.isPending,
    
    // Error
    error: error as Error | null,
    
    // Token tracking
    tokenUsage,
    
    // Actions
    sendMessage,
    startNewConversation,
    selectConversation,
    endConversation,
    deleteConversation: handleDeleteConversation,
    
    // Status
    canSendMessage,
    isAtMaxTurns,
  };
}
```

### 8.2 Export from Hooks Index

Add to `src/hooks/index.ts`:

```typescript
export { useDualChat } from './useDualChat';
export type { UseDualChatReturn } from './useDualChat';
```

---

## 9. Phase 6: UI Components

### 9.1 Component Structure

```
src/components/pipeline/chat/
├── MultiTurnChat.tsx           # Main container component
├── ChatSidebar.tsx             # Conversation list sidebar
├── ChatMain.tsx                # Main chat area
├── ChatHeader.tsx              # Header with controls
├── ChatMessageList.tsx         # Scrollable message container
├── ChatTurn.tsx                # Single turn (user + dual responses)
├── ChatInput.tsx               # Message input with send button + evaluator dropdown
├── DualResponsePanel.tsx       # Side-by-side response display
├── TokenUsageBar.tsx           # Token usage indicator
├── ArcProgressionBar.tsx       # Arc progression visualization (NEW)
└── index.ts                    # Barrel export
```

### 9.2 Install Dependencies

```bash
npm install @chatscope/chat-ui-kit-react @chatscope/chat-ui-kit-styles
```

### 9.3 Import Chatscope Styles

Add to `src/app/globals.css`:

```css
@import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
```

### 9.4 Main Container Component

Create `src/components/pipeline/chat/MultiTurnChat.tsx`:

```typescript
/**
 * MultiTurnChat Component
 * 
 * Main container for the multi-turn A/B testing chat interface
 */

'use client';

import { useState } from 'react';
import { useDualChat, useEvaluators } from '@/hooks';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { Card } from '@/components/ui/card';

interface MultiTurnChatProps {
  jobId: string;
  initialConversationId?: string;
}

export function MultiTurnChat({ jobId, initialConversationId }: MultiTurnChatProps) {
  const chat = useDualChat(jobId, initialConversationId);
  const [systemPrompt, setSystemPrompt] = useState('');
  const { data: evaluatorsData } = useEvaluators();
  const evaluators = evaluatorsData?.data || [];
  
  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-4">
      {/* Sidebar */}
      <Card className="w-64 flex-shrink-0 overflow-hidden">
        <ChatSidebar
          conversations={chat.conversations}
          selectedId={chat.conversation?.id || null}
          onSelect={chat.selectConversation}
          onNewChat={() => chat.startNewConversation(undefined, systemPrompt)}
          onDelete={chat.deleteConversation}
          isLoading={chat.isLoadingConversations}
          isCreating={chat.isCreating}
        />
      </Card>
      
      {/* Main Chat Area */}
      <Card className="flex-1 overflow-hidden">
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
          onEndConversation={chat.endConversation}
          isSending={chat.isSending}
          canSend={chat.canSendMessage}
          isAtMaxTurns={chat.isAtMaxTurns}
          tokenUsage={chat.tokenUsage}
          isLoading={chat.isLoadingConversation}
          error={chat.error}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          // Evaluation props
          enableEvaluation={chat.enableEvaluation}
          onEnableEvaluationChange={chat.setEnableEvaluation}
          selectedEvaluatorId={chat.selectedEvaluatorId}
          onEvaluatorChange={chat.setSelectedEvaluatorId}
          evaluators={evaluators}
        />
      </Card>
    </div>
  );
}
```

### 9.5 ArcProgressionBar Component

Create `src/components/pipeline/chat/ArcProgressionBar.tsx`:

```typescript
/**
 * ArcProgressionBar Component
 * 
 * Displays visual arc progression for multi-turn evaluation
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ArcProgressionBarProps {
  arcName: string | null;
  progressionPercentage: number;
  onTrack: boolean;
}

export function ArcProgressionBar({ arcName, progressionPercentage, onTrack }: ArcProgressionBarProps) {
  if (!arcName || arcName === 'none') {
    return (
      <div className="text-sm text-muted-foreground">
        No clear arc trajectory detected
      </div>
    );
  }
  
  // Format arc name for display
  const displayName = arcName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' → ')
    .replace('To', '→');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{displayName}</span>
        <Badge variant={onTrack ? 'default' : 'secondary'}>
          {onTrack ? 'On Track' : 'Off Track'}
        </Badge>
      </div>
      <Progress 
        value={progressionPercentage} 
        className={`h-2 ${onTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`}
      />
      <div className="text-xs text-muted-foreground text-right">
        {progressionPercentage}% complete
      </div>
    </div>
  );
}
```

### 9.6 Additional Components

> **IMPLEMENTATION NOTE:** Create the remaining UI components following patterns established in:
> - `src/components/pipeline/ABTestingPanel.tsx` (existing A/B testing UI)
> - `src/components/pipeline/TestHistoryTable.tsx` (existing evaluation display)
>
> **Key components to implement:**
>
> | Component | Key Features |
> |-----------|--------------|
> | `ChatSidebar` | List of conversations, "New Chat" button, delete icons |
> | `ChatMain` | Header + message list + input, layout container |
> | `ChatHeader` | Conversation name, turn count (X/10), "End Conversation" button |
> | `ChatMessageList` | Scrollable container, auto-scroll on new messages |
> | `ChatTurn` | User message + DualResponsePanel + optional evaluation display |
> | `ChatInput` | Text input, send button, evaluation toggle, evaluator dropdown |
> | `DualResponsePanel` | Side-by-side control/adapted responses with timing |
> | `TokenUsageBar` | Progress bar showing token usage percentage |

### 9.7 Evaluator Dropdown in ChatInput

Add evaluator selection in `ChatInput.tsx`:

```typescript
// Add to ChatInput component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Inside the component:
{/* Evaluation Controls */}
<div className="flex items-center gap-4 mb-2">
  <div className="flex items-center gap-2">
    <Switch
      id="enableEvaluation"
      checked={enableEvaluation}
      onCheckedChange={onEnableEvaluationChange}
    />
    <Label htmlFor="enableEvaluation">Enable Evaluation</Label>
  </div>
  
  {enableEvaluation && (
    <Select
      value={selectedEvaluatorId}
      onValueChange={onEvaluatorChange}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select evaluator" />
      </SelectTrigger>
      <SelectContent>
        {evaluators.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.displayName}
            {e.name.includes('multi_turn') && (
              <span className="ml-2 text-xs text-green-600">(Multi-Turn)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
</div>
```

### 9.8 Human Emotional State Display in ChatTurn

Add to `ChatTurn.tsx` or `DualResponsePanel.tsx`:

```typescript
// Display human emotional state when available
{turn.humanEmotionalState && (
  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
    <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
      Human Emotional State (Turn {turn.humanEmotionalState.turnNumber})
    </div>
    <div className="text-blue-600 dark:text-blue-400 space-y-1">
      <div>
        <strong>Primary:</strong> {turn.humanEmotionalState.primaryEmotion} ({turn.humanEmotionalState.valence})
      </div>
      <div>
        <strong>Intensity:</strong> {(turn.humanEmotionalState.intensity * 100).toFixed(0)}%
      </div>
      {turn.humanEmotionalState.secondaryEmotions.length > 0 && (
        <div>
          <strong>Secondary:</strong> {turn.humanEmotionalState.secondaryEmotions.join(', ')}
        </div>
      )}
    </div>
  </div>
)}

{turn.arcProgression && (
  <div className="mt-2">
    <ArcProgressionBar 
      arcName={turn.arcProgression.detectedArc}
      progressionPercentage={turn.arcProgression.progressionPercentage}
      onTrack={turn.arcProgression.onTrack}
    />
  </div>
)}
```

### 9.9 Component Index

Create `src/components/pipeline/chat/index.ts`:

```typescript
export { MultiTurnChat } from './MultiTurnChat';
export { ChatSidebar } from './ChatSidebar';
export { ChatMain } from './ChatMain';
export { ChatHeader } from './ChatHeader';
export { ChatMessageList } from './ChatMessageList';
export { ChatTurn } from './ChatTurn';
export { ChatInput } from './ChatInput';
export { DualResponsePanel } from './DualResponsePanel';
export { TokenUsageBar } from './TokenUsageBar';
export { ArcProgressionBar } from './ArcProgressionBar';
```

---

## 10. Phase 7: Page Route

### 10.1 Chat Page

Create `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx`:

```typescript
/**
 * Multi-Turn Chat Page
 * 
 * Route: /pipeline/jobs/[jobId]/chat
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MultiTurnChat } from '@/components/pipeline/chat/MultiTurnChat';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: { jobId: string };
  searchParams: { conversationId?: string };
}

export default async function MultiTurnChatPage({ params, searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  
  // Verify job exists
  const { data: job, error } = await supabase
    .from('pipeline_training_jobs')
    .select('id, job_name, status')
    .eq('id', params.jobId)
    .single();
  
  if (error || !job) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multi-Turn Chat Testing</h1>
        <p className="text-muted-foreground">
          Test extended conversations with {job.job_name}
        </p>
      </div>
      
      <Suspense fallback={<ChatPageSkeleton />}>
        <MultiTurnChat 
          jobId={params.jobId} 
          initialConversationId={searchParams.conversationId}
        />
      </Suspense>
    </div>
  );
}

function ChatPageSkeleton() {
  return (
    <div className="flex h-[600px] gap-4">
      <Skeleton className="w-64 h-full" />
      <Skeleton className="flex-1 h-full" />
    </div>
  );
}
```

### 10.2 Navigation Link

Add a link from the job detail or test page. In the existing pages:

```typescript
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Add to existing job page or test page
<Link href={`/pipeline/jobs/${jobId}/chat`}>
  <Button variant="outline">
    <MessageSquare className="mr-2 h-4 w-4" />
    Multi-Turn Chat
  </Button>
</Link>
```

---

## 11. Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `multi_turn_conversations` table (paste SQL in Supabase Dashboard)
- [ ] Create `conversation_turns` table with all columns
- [ ] Insert seed data for `multi_turn_arc_aware_v1` evaluator
- [ ] Verify tables exist with SAOL `agentIntrospectSchema`
- [ ] Verify evaluator appears in `evaluation_prompts` table

### Phase 2: TypeScript Types
- [ ] Create `src/types/conversation.ts` with all interfaces
- [ ] Update `src/types/index.ts` to export new types
- [ ] Run TypeScript build to verify no errors

### Phase 3: Service Layer
- [ ] Create `src/lib/services/conversation-service.ts`
- [ ] Implement all mappers and helper functions
- [ ] Implement `createConversation`, `addTurn`, `getConversation`, `listConversations`, `completeConversation`, `deleteConversation`
- [ ] Implement multi-turn evaluation functions
- [ ] Update `src/lib/services/index.ts` to export

### Phase 4: API Routes
- [ ] Create `src/app/api/pipeline/conversations/route.ts`
- [ ] Create `src/app/api/pipeline/conversations/[id]/route.ts`
- [ ] Create `src/app/api/pipeline/conversations/[id]/turn/route.ts`
- [ ] Create `src/app/api/pipeline/conversations/[id]/complete/route.ts`

### Phase 5: React Hook
- [ ] Create `src/hooks/useDualChat.ts`
- [ ] Update `src/hooks/index.ts` to export

### Phase 6: UI Components
- [ ] Install `@chatscope/chat-ui-kit-react` and styles
- [ ] Create `src/components/pipeline/chat/` directory
- [ ] Create `MultiTurnChat.tsx`
- [ ] Create `ChatSidebar.tsx`
- [ ] Create `ChatMain.tsx`
- [ ] Create `ChatHeader.tsx`
- [ ] Create `ChatMessageList.tsx`
- [ ] Create `ChatTurn.tsx`
- [ ] Create `ChatInput.tsx` with evaluator dropdown
- [ ] Create `DualResponsePanel.tsx`
- [ ] Create `TokenUsageBar.tsx`
- [ ] Create `ArcProgressionBar.tsx`
- [ ] Create `index.ts` barrel export

### Phase 7: Page Route
- [ ] Create `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx`
- [ ] Add navigation links from existing pages

### Phase 8: Integration Testing
- [ ] Run `npm run build` to verify compilation
- [ ] Manual testing on pods infrastructure

---

## 12. Verification Plan

### 12.1 Build Verification

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
npm run build
```

**Success Criteria:** Build completes with no TypeScript errors.

### 12.2 Database Verification

Use SAOL to verify tables were created:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'multi_turn_conversations',includeColumns:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);console.log('Columns:',r.tables[0]?.columns.length);})();"
```

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);console.log('Columns:',r.tables[0]?.columns.length);})();"
```

Verify evaluator exists:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'evaluation_prompts',select:'id,name,display_name',where:[{column:'name',operator:'eq',value:'multi_turn_arc_aware_v1'}]});console.log('Evaluator found:',r.data.length>0);if(r.data[0])console.log(r.data[0]);})();"
```

### 12.3 Manual Testing Checklist

**Test Case 1: Create New Conversation**
1. Navigate to `/pipeline/jobs/{jobId}/chat`
2. Click "New Chat" button
3. Verify conversation appears in sidebar
4. Verify "0/10 turns" indicator

**Test Case 2: Send First Message**
1. Type "I'm feeling really stressed about my finances"
2. Click Send
3. Verify both Control and Adapted responses appear
4. Verify turn counter shows "1/10"
5. Verify response times are displayed

**Test Case 3: Multi-Turn Context**
1. Send follow-up: "You mentioned taking it one step at a time. Can you help me prioritize?"
2. Verify both endpoints received context from Turn 1
3. Verify responses reference the previous exchange

**Test Case 4: Enable Evaluation**
1. Toggle "Enable Evaluation" switch
2. Select "Multi-Turn Arc-Aware Evaluator (v1)" from dropdown
3. Send a message
4. Verify "Human Emotional State" panel appears
5. Verify arc progression bar shows percentage

**Test Case 5: Turn Limit**
1. Continue conversation until 10 turns
2. Verify input is disabled after turn 10
3. Verify "Maximum turns reached" message

**Test Case 6: End Conversation**
1. Click "End Conversation" button
2. Verify status changes to "completed" in sidebar
3. Verify input is disabled
4. Verify conversation history is still viewable

**Test Case 7: Delete Conversation**
1. Click delete icon on a conversation
2. Confirm deletion
3. Verify removed from sidebar

### 12.4 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| One endpoint fails | Show successful response, display error for failed one |
| Refresh mid-conversation | Reload current state, no data loss |
| Very long message | Truncate or scroll, no UI breaking |
| Token limit warning | Show warning at 80% usage |

---

## 13. Appendices

### Appendix A: File Summary

| Path | Purpose |
|------|---------|
| `supa-agent-ops/migrations/*.sql` | Database migrations |
| `src/types/conversation.ts` | All TypeScript types |
| `src/lib/services/conversation-service.ts` | Service layer with evaluation logic |
| `src/app/api/pipeline/conversations/...` | API routes (5 files) |
| `src/hooks/useDualChat.ts` | React hook for chat state |
| `src/components/pipeline/chat/...` | UI components (11 files) |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx` | Page route |

### Appendix B: Related Documents

- [supabase-agent-ops-library-use-instructions.md](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md) — SAOL usage guide
- [arc-measurement-claude-as-judge-changes_v1.md](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/arc-measurement-claude-as-judge-changes_v1.md) — Single-turn arc measurement (already implemented)

### Appendix C: Emotional Arcs Reference

| Arc Key | Display Name | Multi-Turn Expectation |
|---------|--------------|------------------------|
| `confusion_to_clarity` | Confusion → Clarity | Human's messages show increasing clarity |
| `shame_to_acceptance` | Shame → Acceptance | Human's messages show decreasing shame |
| `fear_to_confidence` | Anxiety → Confidence | Human's messages show decreasing anxiety |
| `overwhelm_to_empowerment` | Overwhelm → Empowerment | Human's messages show increasing agency |
| `grief_to_healing` | Grief/Loss → Healing | Human's messages show hope emerging |
| `couple_conflict_to_alignment` | Conflict → Alignment | Human's messages show increasing partnership |
| `emergency_to_calm` | Emergency → Calm | Human's messages show decreasing panic |

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-MULTITURN-INTEGRATED-v1 |
| Author | Gemini Agent |
| Created | January 29, 2026 |
| Source Documents | multi-turn-chat-specification_v2.md, arc-measurement-multi-turn-claude-as-judge-changes_v2.md |
| Status | Implementation-Ready |

---

*End of Specification*

