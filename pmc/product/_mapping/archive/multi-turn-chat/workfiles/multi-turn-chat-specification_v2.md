# Multi-Turn Chat Module - Implementation Specification

**Version:** 2.0  
**Date:** January 28, 2026  
**Status:** Implementation-Ready Specification  
**Purpose:** Complete, self-contained specification for implementing the multi-turn A/B testing chat module

---

## Document Overview

This specification provides all information needed to implement the multi-turn chat module. The implementing agent should:
1. Read this document completely
2. Explore the existing codebase at `src/` to understand patterns
3. Implement according to the phases defined herein

**Key Context Files in Codebase:**
- `src/types/pipeline-adapter.ts` - Existing type definitions (follow same patterns)
- `src/lib/services/test-service.ts` - Existing test service (follow same patterns)
- `src/lib/services/inference-service.ts` - Inference endpoint calling (reuse `callInferenceEndpoint`)
- `src/app/api/pipeline/` - Existing API routes (follow same patterns)

---

## 1. Feature Overview

### 1.1 What is Multi-Turn Chat?

The multi-turn chat module enables users to have **sustained conversations** (up to 10 turns) with both the control endpoint (base model) and adapted endpoint (LoRA-enhanced model) simultaneously. Each turn shows side-by-side responses, maintaining **separate conversation histories** for each endpoint.

### 1.2 Business Value

- Evaluate how adapters perform across extended conversations
- Observe emotional arc progression over multiple turns
- Test conversation memory and coherence
- Compare control vs adapted response strategies over time

### 1.3 Key Design Decisions (Pre-Approved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Library | `@chatscope/chat-ui-kit-react` | Production-tested chat components |
| State Management | Custom `useDualChat` hook | Dual-model pattern not supported by standard libraries |
| Conversation History | Siloed per endpoint | Control and adapted must not share context |
| History Passing | Full history per request | RunPod endpoints are stateless |
| Turn Limit | 10 turns maximum | Token budget management |
| Page Location | `/pipeline/jobs/[jobId]/chat` | Separate from single-turn test page |

---

## 2. Database Schema

### 2.1 New Tables

Create these tables using SAOL or raw SQL migration.

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
CREATE INDEX idx_conversations_job_id ON public.multi_turn_conversations(job_id);
CREATE INDEX idx_conversations_user_id ON public.multi_turn_conversations(user_id);
CREATE INDEX idx_conversations_status ON public.multi_turn_conversations(status);
CREATE INDEX idx_conversations_created_at ON public.multi_turn_conversations(created_at DESC);

-- RLS
ALTER TABLE public.multi_turn_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.multi_turn_conversations
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================
-- Table: conversation_turns
-- Purpose: Individual turns within a conversation
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
  control_evaluation JSONB,                     -- ClaudeEvaluation JSON
  adapted_evaluation JSONB,                     -- ClaudeEvaluation JSON
  evaluation_comparison JSONB,                  -- EvaluationComparison JSON
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | generating | completed | failed
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique turn numbers per conversation
  CONSTRAINT unique_turn_per_conversation UNIQUE(conversation_id, turn_number)
);

-- Indexes
CREATE INDEX idx_turns_conversation_id ON public.conversation_turns(conversation_id);
CREATE INDEX idx_turns_status ON public.conversation_turns(status);
CREATE INDEX idx_turns_turn_number ON public.conversation_turns(conversation_id, turn_number);

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
```

### 2.2 Migration File Location

Create migration files at:
```
supa-agent-ops/migrations/YYYYMMDD_create_multi_turn_conversations.sql
supa-agent-ops/migrations/YYYYMMDD_create_conversation_turns.sql
```

---

## 3. TypeScript Type Definitions

### 3.1 New Types File

Create `src/types/conversation.ts`:

```typescript
/**
 * Multi-Turn Conversation Types
 * 
 * Types for the multi-turn A/B testing chat module
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
  controlEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  adaptedEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  evaluationComparison: import('./pipeline-adapter').EvaluationComparison | null;
  
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

### 3.2 Update Types Index

Add to `src/types/index.ts`:
```typescript
export * from './conversation';
```

---

## 4. Service Layer

### 4.1 Conversation Service

Create `src/lib/services/conversation-service.ts`:

```typescript
/**
 * Conversation Service
 * 
 * Manages multi-turn A/B testing conversations
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  Conversation,
  ConversationTurn,
  ConversationWithTurns,
  CreateConversationRequest,
  AddTurnRequest,
  InferenceMessage,
  CONVERSATION_CONSTANTS,
} from '@/types/conversation';
import { callInferenceEndpoint, getEndpointStatus } from './inference-service';
import { evaluateWithClaude, compareEvaluations } from './test-service';

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
    controlEvaluation: row.control_evaluation,
    adaptedEvaluation: row.adapted_evaluation,
    evaluationComparison: row.evaluation_comparison,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// ============================================
// History Building
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
    
    // Create turn record with pending status
    const { data: turn, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: conversationId,
        turn_number: nextTurnNumber,
        user_message: request.userMessage,
        evaluation_enabled: request.enableEvaluation || false,
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
    
    // Call both endpoints in parallel
    // NOTE: The inference service needs to be extended to accept messages array
    // For now, we concatenate messages into a single prompt
    const controlPrompt = controlMessages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    const adaptedPrompt = adaptedMessages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    const systemPrompt = conversation.system_prompt || undefined;
    
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

### 4.2 Export from Services Index

Add to `src/lib/services/index.ts`:
```typescript
export * from './conversation-service';
```

---

## 5. API Routes

### 5.1 Route Structure

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

### 5.2 Main Conversations Route

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

### 5.3 Single Conversation Route

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

### 5.4 Add Turn Route

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

### 5.5 Complete Conversation Route

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

## 6. React Hooks

### 6.1 useDualChat Hook

Create `src/hooks/useDualChat.ts`:

```typescript
/**
 * useDualChat Hook
 * 
 * Manages state for multi-turn A/B testing chat interface
 */

import { useState, useCallback, useEffect } from 'react';
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
  
  // Loading states
  isSending: boolean;
  isCreating: boolean;
  
  // Error state
  error: Error | null;
  
  // Token tracking
  tokenUsage: TokenUsage;
  
  // Actions
  sendMessage: (message?: string, enableEvaluation?: boolean) => Promise<void>;
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
  const sendMessage = useCallback(async (message?: string, enableEvaluation?: boolean) => {
    if (!selectedId) return;
    
    const messageToSend = message || input;
    if (!messageToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        userMessage: messageToSend.trim(),
        enableEvaluation,
      },
    });
  }, [selectedId, input, addTurnMutation]);
  
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

### 6.2 Export from Hooks Index

Add to `src/hooks/index.ts`:
```typescript
export { useDualChat } from './useDualChat';
export type { UseDualChatReturn } from './useDualChat';
```

---

## 7. UI Components

### 7.1 Component Structure

```
src/components/pipeline/chat/
├── MultiTurnChat.tsx           # Main container component
├── ChatSidebar.tsx             # Conversation list sidebar
├── ChatMain.tsx                # Main chat area
├── ChatHeader.tsx              # Header with controls
├── ChatMessageList.tsx         # Scrollable message container
├── ChatTurn.tsx                # Single turn (user + dual responses)
├── ChatInput.tsx               # Message input with send button
├── DualResponsePanel.tsx       # Side-by-side response display
└── TokenUsageBar.tsx           # Token usage indicator
```

### 7.2 Main Container Component

Create `src/components/pipeline/chat/MultiTurnChat.tsx`:

```typescript
/**
 * MultiTurnChat Component
 * 
 * Main container for the multi-turn A/B testing chat interface
 */

'use client';

import { useState } from 'react';
import { useDualChat } from '@/hooks';
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
        />
      </Card>
    </div>
  );
}
```

### 7.3 Additional Components

> **NOTE TO IMPLEMENTER:** Create the remaining UI components following the patterns established in existing pipeline components (see `src/components/pipeline/ABTestingPanel.tsx` for reference). Key components needed:
> 
> - **ChatSidebar**: List of conversations with "New Chat" button
> - **ChatMain**: Contains header, message list, and input
> - **ChatHeader**: Shows conversation name, turn count, end button
> - **ChatMessageList**: Scrollable list of turns
> - **ChatTurn**: User message + DualResponsePanel
> - **ChatInput**: Text input + send button + evaluation toggle
> - **DualResponsePanel**: Side-by-side control/adapted responses
> - **TokenUsageBar**: Visual progress bar for token usage

---

## 8. Page Route

### 8.1 Chat Page

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

interface PageProps {
  params: { jobId: string };
  searchParams: { conversationId?: string };
}

export default async function MultiTurnChatPage({ params, searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  
  // Verify job exists
  const { data: job, error } = await supabase
    .from('pipeline_training_jobs')
    .select('id, name, status')
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
          Test extended conversations with {job.name}
        </p>
      </div>
      
      <Suspense fallback={<div>Loading chat...</div>}>
        <MultiTurnChat 
          jobId={params.jobId} 
          initialConversationId={searchParams.conversationId}
        />
      </Suspense>
    </div>
  );
}
```

### 8.2 Navigation Link

Add a link to the chat page from the job detail or test page.

In the existing test page or job page, add:
```tsx
<Link href={`/pipeline/jobs/${jobId}/chat`}>
  <Button variant="outline">
    <MessageSquare className="mr-2 h-4 w-4" />
    Multi-Turn Chat
  </Button>
</Link>
```

---

## 9. Dependencies

### 9.1 NPM Packages to Install

```bash
npm install @chatscope/chat-ui-kit-react @chatscope/chat-ui-kit-styles
```

### 9.2 Import Chatscope Styles

Add to `src/app/globals.css` or the chat component:
```css
@import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
```

Or import in the component:
```typescript
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
```

---

## 10. Implementation Phases

### Phase 1: Database & Types (Priority 1)
1. Create SQL migration files for both tables
2. Run migrations in Supabase Dashboard
3. Create `src/types/conversation.ts` with all types
4. Update `src/types/index.ts` to export new types

### Phase 2: Service Layer (Priority 2)
1. Create `src/lib/services/conversation-service.ts`
2. Implement all service functions
3. Update `src/lib/services/index.ts` to export
4. Verify TypeScript compiles with no errors

### Phase 3: API Routes (Priority 3)
1. Create route structure under `src/app/api/pipeline/conversations/`
2. Implement all route handlers
3. Test API endpoints manually with curl/Postman

### Phase 4: React Hook (Priority 4)
1. Create `src/hooks/useDualChat.ts`
2. Update `src/hooks/index.ts`
3. Test hook in isolation if possible

### Phase 5: UI Components (Priority 5)
1. Install chatscope packages
2. Create `src/components/pipeline/chat/` directory
3. Implement components in order:
   - MultiTurnChat (container)
   - ChatSidebar
   - ChatMain
   - Remaining sub-components

### Phase 6: Page & Navigation (Priority 6)
1. Create chat page at `/pipeline/jobs/[jobId]/chat`
2. Add navigation link from existing pages
3. Test full flow end-to-end

---

## 11. Verification Plan

### 11.1 Automated Verification

```bash
# TypeScript compilation check
cd src && npm run build
```

### 11.2 Manual Testing Checklist

1. **Create New Conversation**
   - Navigate to `/pipeline/jobs/{jobId}/chat`
   - Click "New Chat"
   - Verify conversation appears in sidebar

2. **Send First Message**
   - Type a message and click Send
   - Verify both control and adapted responses appear
   - Verify turn counter shows "1/10"

3. **Multi-Turn Context**
   - Send a follow-up message referencing the previous response
   - Verify both endpoints maintain their own context

4. **Turn Limit**
   - Continue conversation to 10 turns
   - Verify input is disabled after reaching limit
   - Verify appropriate message is shown

5. **End Conversation**
   - Click "End Conversation"
   - Verify status changes to "completed"
   - Verify conversation is still viewable but input disabled

6. **Delete Conversation**
   - Delete a conversation
   - Verify it's removed from sidebar

### 11.3 Edge Cases to Test

- What happens if one endpoint fails?
- What happens if user refreshes mid-conversation?
- What happens with very long messages?
- What happens when token limit is approached?

---

## 12. Error Handling

### 12.1 Endpoint Failures

If one endpoint fails during a turn:
- Show the successful response
- Display error message for failed endpoint
- Allow retry option
- Mark turn as "partial" if needed

### 12.2 Network Errors

- Show toast notification
- Provide retry button
- Don't lose user's typed message

### 12.3 Token Limit Warning

At 80% token usage:
- Show warning indicator
- Suggest summarizing or starting new conversation

---

## 13. Future Enhancements (Out of Scope for V1)

1. **Streaming Responses** - Real-time token streaming
2. **Conversation Export** - Download as JSON/CSV
3. **Response Diff View** - Highlight differences
4. **Conversation Sharing** - Share with team members
5. **Conversation Templates** - Pre-defined starting messages
6. **Batch Evaluation** - Run Claude-as-Judge on entire conversation

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-MULTITURN-IMPL-v2 |
| Author | Gemini Agent |
| Created | January 28, 2026 |
| Based On | multi-turn-chat-spec_v1.md |
| Status | Implementation-Ready |
