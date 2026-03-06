# Multi-Turn Chat: Dual Input Prompts and Page Scrolling Fix

**Version:** 1.0  
**Date:** January 31, 2026  
**Status:** Ready for Implementation  
**Purpose:** Implement separate input prompts for Control vs Adapted paths and fix page-wide vertical scrolling

---

## Executive Summary

This specification addresses two critical improvements to the multi-turn chat feature:

**Issue A: Identical Evaluation Scores Due to Same Input**
- **Problem**: Control and Adapted endpoints receive the same user message, leading to similar responses and nearly identical evaluation scores, defeating the purpose of A/B testing
- **Solution**: Implement separate input fields for Control and Adapted, allowing different prompts to test how each model handles different scenarios

**Issue B: Page-Wide Vertical Scrolling Not Working**
- **Problem**: Despite removing `overflow-hidden`, users still cannot scroll to see earlier messages in long conversations
- **Root Cause**: The ScrollArea component lacks explicit height constraints and the flex layout doesn't propagate properly
- **Solution**: Fix CSS constraints and ScrollArea configuration to enable proper page-wide scrolling

---

## Table of Contents

1. [Context & Background](#context--background)
2. [Issue A: Dual Input Prompts](#issue-a-dual-input-prompts)
3. [Issue B: Scrolling Fix](#issue-b-scrolling-fix)
4. [Database Schema Changes](#database-schema-changes)
5. [Type Definitions](#type-definitions)
6. [Service Layer Changes](#service-layer-changes)
7. [API Layer Changes](#api-layer-changes)
8. [UI Component Changes](#ui-component-changes)
9. [Implementation Plan](#implementation-plan)
10. [Testing Strategy](#testing-strategy)
11. [Migration Strategy](#migration-strategy)

---

## Context & Background

### Current Architecture Overview

The multi-turn chat feature implements A/B testing between Control (base model) and Adapted (LoRA) endpoints:

**Database Tables:**
- `multi_turn_conversations` - Stores conversation metadata
- `conversation_turns` - Stores individual turns with dual responses

**Key Components:**
- `MultiTurnChat.tsx` - Container component
- `ChatMain.tsx` - Main chat area
- `ChatInput.tsx` - User input (currently single field)
- `ChatMessageList.tsx` - Scrollable message list
- `DualResponsePanel.tsx` - Side-by-side response display
- `useDualChat.ts` - React hook for state management

**Service Layer:**
- `multi-turn-conversation-service.ts` - Core business logic
- `buildMessagesForEndpoint()` - Builds siloed conversation history per endpoint
- `evaluateMultiTurnConversation()` - Evaluates responses with arc-aware logic

**Current Data Flow:**
1. User enters ONE message in ChatInput
2. Same message sent to both Control and Adapted endpoints
3. Each endpoint builds its own siloed conversation history
4. Both responses evaluated with Claude-as-Judge
5. Arc progression tracked separately (control_arc_progression, adapted_arc_progression)

### Why This Matters

**The Problem with Same Input:**
When both endpoints receive identical user messages, they tend to produce similar responses, especially on straightforward queries. This means:
- Evaluation scores are nearly identical (e.g., Turn 2: Control 26%, Adapted 26%)
- A/B testing becomes meaningless - we can't see how models differ
- The LoRA's unique capabilities aren't being tested
- Users can't explore edge cases or prompt variations

**The Solution:**
By allowing DIFFERENT input prompts for Control vs Adapted, users can:
- Test how each model handles different phrasings of the same question
- Explore edge cases (e.g., vague prompt to Control, specific prompt to Adapted)
- Compare model behavior across difficulty levels
- Truly evaluate which model provides better emotional facilitation across varied inputs

---

## Issue A: Dual Input Prompts

### Objectives

1. **Separate Input Fields**: Provide two independent input fields - one for Control, one for Adapted
2. **Visual Clarity**: Make it clear which input goes to which endpoint
3. **Independent Context**: Each endpoint maintains its own conversation history with its own user messages
4. **Accurate Evaluation**: Arc progression evaluates each path against its own first-turn baseline
5. **Backward Compatibility**: Existing conversations continue to work

### Design Specifications

#### UI Layout

**Current Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Evaluation Toggle] [Evaluator Dropdown]        │
│ [Single Input Field.......... ] [Send Button]   │
└─────────────────────────────────────────────────┘
```

**New Layout:**
```
┌─────────────────────────────────────────────────┐
│ [Evaluation Toggle] [Evaluator Dropdown]        │
├─────────────────────────────────────────────────┤
│ Control Input                                   │
│ ┌─────────────────────────────────────────────┐│
│ │ Type message for Control (Base)...          ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Adapted Input                                   │
│ ┌─────────────────────────────────────────────┐│
│ │ Type message for Adapted (LoRA)...          ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
│                                     [Send Both] │
└─────────────────────────────────────────────────┘
```

**Key UI Features:**
- Two labeled textarea fields stacked vertically
- Labels: "Control Input" and "Adapted Input" (with "Base" and "LoRA" hints)
- Single "Send Both" button that submits both messages in one turn
- Both textareas have same styling, min-height (60px), and resize: none
- Keyboard shortcut: Enter sends (Shift+Enter for new line)
- Both fields must have content to enable Send button
- Loading state disables both textareas during generation

#### Message Display Changes

**Current Display:**
```
[User Icon] You - Turn 2
"I'm feeling stressed"

[Control Response]  [Adapted Response]
```

**New Display:**
```
[User Icon] Turn 2

Control Prompt: "I'm feeling stressed"
[Control Response]

Adapted Prompt: "I'm feeling stressed" 
[Adapted Response]
```

**Display Requirements:**
- Show both user prompts clearly above their respective responses
- Visual indication of which prompt went to which endpoint
- Compact display (don't duplicate if prompts are identical)
- If prompts ARE identical, show once with "(Same for both)"

### Database Schema Changes

Use the SAOL library as documented here:

`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`
and here:

`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\SAOL-table-creation-quick-reference.md`

to do all Supabase creations, and alterations.


#### Current Schema: `conversation_turns`

```sql
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES multi_turn_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  
  -- CURRENT: Single user message for both endpoints
  user_message TEXT NOT NULL,
  
  -- Control response (unchanged)
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,
  control_error TEXT,
  
  -- Adapted response (unchanged)
  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,
  adapted_error TEXT,
  
  -- Evaluation fields (unchanged)
  evaluation_enabled BOOLEAN DEFAULT false,
  evaluation_prompt_id UUID,
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,
  
  -- Arc progression (unchanged)
  control_human_emotional_state JSONB,
  adapted_human_emotional_state JSONB,
  control_arc_progression JSONB,
  adapted_arc_progression JSONB,
  conversation_winner JSONB,
  
  -- Legacy fields (unchanged)
  human_emotional_state JSONB,
  arc_progression JSONB,
  
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

#### Proposed Schema Changes

**Option 1: Add Separate Columns (Recommended)**

```sql
-- Migration: Add separate user message columns
ALTER TABLE conversation_turns
ADD COLUMN control_user_message TEXT,
ADD COLUMN adapted_user_message TEXT;

-- Backfill existing data (both get same message)
UPDATE conversation_turns
SET control_user_message = user_message,
    adapted_user_message = user_message
WHERE control_user_message IS NULL;

-- Keep user_message for backward compatibility, but it's now deprecated
-- New turns will populate control_user_message and adapted_user_message
```

**Rationale for Option 1:**
- ✅ Simple to implement
- ✅ Clear separation of concerns
- ✅ Backward compatible (keep user_message for old data)
- ✅ Easy to query and index
- ✅ No breaking changes to existing queries

**Option 2: JSON Column (NOT Recommended)**

```sql
ALTER TABLE conversation_turns
ADD COLUMN user_messages JSONB; -- {"control": "...", "adapted": "..."}
```

**Why NOT Option 2:**
- ❌ Harder to query
- ❌ Can't index efficiently
- ❌ More complex validation
- ❌ Harder to migrate

**Final Decision: Use Option 1** (separate columns)

#### Migration SQL

```sql
-- File: supabase/migrations/20260131_add_dual_user_messages.sql

-- Add columns for separate user messages
ALTER TABLE conversation_turns
ADD COLUMN IF NOT EXISTS control_user_message TEXT,
ADD COLUMN IF NOT EXISTS adapted_user_message TEXT;

-- Backfill existing conversations with same message for both
UPDATE conversation_turns
SET control_user_message = user_message,
    adapted_user_message = user_message
WHERE control_user_message IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN conversation_turns.control_user_message IS 'User message sent to Control endpoint (post-dual-input)';
COMMENT ON COLUMN conversation_turns.adapted_user_message IS 'User message sent to Adapted endpoint (post-dual-input)';
COMMENT ON COLUMN conversation_turns.user_message IS 'DEPRECATED: Legacy field, use control_user_message/adapted_user_message';
```

---

## Type Definitions

### Update: `conversation.ts`

#### Modified Types

```typescript
// src/types/conversation.ts

export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  
  // DEPRECATED: Legacy single message field (keep for backward compatibility)
  userMessage: string;
  
  // NEW: Separate messages per endpoint
  controlUserMessage: string | null;
  adaptedUserMessage: string | null;
  
  // Control response (unchanged)
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;
  controlError: string | null;
  
  // Adapted response (unchanged)
  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;
  adaptedError: string | null;
  
  // Evaluation (unchanged)
  evaluationEnabled: boolean;
  evaluationPromptId: string | null;
  controlEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  adaptedEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  evaluationComparison: import('./pipeline-adapter').EvaluationComparison | MultiTurnEvaluationComparison | null;
  
  // Arc progression (unchanged)
  controlHumanEmotionalState: HumanEmotionalState | null;
  adaptedHumanEmotionalState: HumanEmotionalState | null;
  controlArcProgression: ArcProgression | null;
  adaptedArcProgression: ArcProgression | null;
  conversationWinner: ConversationWinnerDeclaration | null;
  
  // Legacy (unchanged)
  humanEmotionalState: HumanEmotionalState | null;
  arcProgression: ArcProgression | null;
  
  status: TurnStatus;
  createdAt: string;
  completedAt: string | null;
}

// NEW: API request now includes TWO messages
export interface AddTurnRequest {
  controlUserMessage: string;
  adaptedUserMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}

// Legacy support - if client sends old format, convert it
export interface LegacyAddTurnRequest {
  userMessage: string;  // Deprecated but supported
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}
```

#### Helper Functions

```typescript
// src/types/conversation.ts (add to bottom)

/**
 * Get the user message for a specific endpoint from a turn
 * Handles both new dual-message format and legacy single-message format
 */
export function getUserMessageForEndpoint(
  turn: ConversationTurn,
  endpointType: 'control' | 'adapted'
): string {
  if (endpointType === 'control') {
    return turn.controlUserMessage || turn.userMessage;
  } else {
    return turn.adaptedUserMessage || turn.userMessage;
  }
}

/**
 * Check if a turn uses dual messages (new format) or single message (legacy)
 */
export function turnUsesDualMessages(turn: ConversationTurn): boolean {
  return turn.controlUserMessage !== null || turn.adaptedUserMessage !== null;
}

/**
 * Check if control and adapted received the same message
 */
export function turnMessagesAreIdentical(turn: ConversationTurn): boolean {
  if (!turnUsesDualMessages(turn)) {
    return true; // Legacy turns always have same message
  }
  return turn.controlUserMessage === turn.adaptedUserMessage;
}
```

---

## Service Layer Changes

### File: `src/lib/services/multi-turn-conversation-service.ts`

#### 1. Update Database Mappers

```typescript
// Line ~50: Update mapDbRowToTurn function

function mapDbRowToTurn(row: any): ConversationTurn {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    turnNumber: row.turn_number,
    
    // Legacy field (for backward compatibility)
    userMessage: row.user_message,
    
    // NEW: Dual messages
    controlUserMessage: row.control_user_message,
    adaptedUserMessage: row.adapted_user_message,
    
    // Control response
    controlResponse: row.control_response,
    controlGenerationTimeMs: row.control_generation_time_ms,
    controlTokensUsed: row.control_tokens_used,
    controlError: row.control_error,
    
    // Adapted response
    adaptedResponse: row.adapted_response,
    adaptedGenerationTimeMs: row.adapted_generation_time_ms,
    adaptedTokensUsed: row.adapted_tokens_used,
    adaptedError: row.adapted_error,
    
    // Evaluation
    evaluationEnabled: row.evaluation_enabled,
    evaluationPromptId: row.evaluation_prompt_id,
    controlEvaluation: row.control_evaluation,
    adaptedEvaluation: row.adapted_evaluation,
    evaluationComparison: row.evaluation_comparison,
    
    // Arc progression
    controlHumanEmotionalState: row.control_human_emotional_state,
    adaptedHumanEmotionalState: row.adapted_human_emotional_state,
    controlArcProgression: row.control_arc_progression,
    adaptedArcProgression: row.adapted_arc_progression,
    conversationWinner: row.conversation_winner,
    
    // Legacy
    humanEmotionalState: row.human_emotional_state || row.control_human_emotional_state,
    arcProgression: row.arc_progression || row.control_arc_progression,
    
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
```

#### 2. Update `buildMessagesForEndpoint` Function

```typescript
// Line ~95: Update to use correct user message per endpoint

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
  
  // Add historical turns (use the CORRECT endpoint's user message!)
  for (const turn of turns || []) {
    // NEW: Get the user message that was sent to THIS endpoint
    const userMessage = endpointType === 'control'
      ? (turn.control_user_message || turn.user_message)
      : (turn.adapted_user_message || turn.user_message);
    
    messages.push({ role: 'user', content: userMessage });
    
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
```

#### 3. Update `buildConversationHistoryContext` Function

```typescript
// Line ~145: Update evaluation context to use correct message

function buildConversationHistoryContext(
  turns: ConversationTurn[],
  endpointType: 'control' | 'adapted'
): string {
  if (turns.length === 0) {
    return 'This is the first turn.';
  }
  
  let context = `Previous conversation (${turns.length} turns):\n\n`;
  
  for (const turn of turns) {
    // NEW: Get the user message for THIS endpoint
    const userMessage = endpointType === 'control'
      ? (turn.controlUserMessage || turn.userMessage)
      : (turn.adaptedUserMessage || turn.userMessage);
    
    const response = endpointType === 'control'
      ? turn.controlResponse
      : turn.adaptedResponse;
    
    context += `Turn ${turn.turnNumber}:\n`;
    context += `Human: ${userMessage}\n`;
    context += `Advisor: ${response || '[No response]'}\n\n`;
  }
  
  return context;
}
```

#### 4. Update `addTurn` Function

```typescript
// Line ~424: Update to handle dual messages

export async function addTurn(
  userId: string,
  conversationId: string,
  request: AddTurnRequest
): Promise<{ success: boolean; data?: ConversationTurn; error?: string }> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Validate input
    if (!request.controlUserMessage || !request.controlUserMessage.trim()) {
      return { success: false, error: 'Control user message is required' };
    }
    if (!request.adaptedUserMessage || !request.adaptedUserMessage.trim()) {
      return { success: false, error: 'Adapted user message is required' };
    }
    
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
        
        // NEW: Store both messages separately
        control_user_message: request.controlUserMessage.trim(),
        adapted_user_message: request.adaptedUserMessage.trim(),
        
        // DEPRECATED: Store in legacy field for backward compatibility
        // (Use control message as the "primary" message)
        user_message: request.controlUserMessage.trim(),
        
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
    
    // Build message histories for each endpoint (SILOED, using their OWN user messages)
    const controlMessages = await buildMessagesForEndpoint(
      conversationId,
      'control',
      conversation.system_prompt,
      request.controlUserMessage.trim()  // NEW: Control gets its own message
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      conversationId,
      'adapted',
      conversation.system_prompt,
      request.adaptedUserMessage.trim()  // NEW: Adapted gets its own message
    );
    
    // Convert messages to prompt format for inference
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
        false
      ),
      callInferenceEndpoint(
        adaptedEndpoint.runpod_endpoint_id,
        adaptedPrompt,
        systemPrompt,
        true,
        adaptedEndpoint.adapter_path,
        conversation.job_id
      ),
    ]);
    
    // Process results (rest remains the same as before)
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
    
    // Evaluation logic continues as before...
    // (The evaluation already uses buildConversationHistoryContext which now uses correct messages)
    
    if (
      request.enableEvaluation &&
      controlResult.status === 'fulfilled' &&
      adaptedResult.status === 'fulfilled'
    ) {
      try {
        const { data: previousTurnsData } = await supabase
          .from('conversation_turns')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('status', 'completed')
          .order('turn_number', { ascending: true });
        
        const mappedPreviousTurns = (previousTurnsData || []).map(mapDbRowToTurn);
        const isFirstTurn = mappedPreviousTurns.length === 0;
        
        if (isFirstTurn) {
          // First turn baseline (unchanged)
          const baselineEmotion: HumanEmotionalState = {
            turnNumber: 1,
            primaryEmotion: 'baseline',
            secondaryEmotions: [],
            intensity: 0,
            valence: 'neutral',
            confidence: 1.0,
            evidenceQuotes: [],
            stateNotes: 'First turn - establishing baseline emotional state',
          };
          
          const baselineArcProgression: ArcProgression = {
            detectedArc: 'none',
            progressionPercentage: 0,
            onTrack: true,
            arcMatchConfidence: 0,
            progressionNotes: 'Turn 1: Baseline established at 0%',
          };
          
          updateData.control_human_emotional_state = baselineEmotion;
          updateData.adapted_human_emotional_state = baselineEmotion;
          updateData.control_arc_progression = baselineArcProgression;
          updateData.adapted_arc_progression = baselineArcProgression;
          
          updateData.conversation_winner = {
            winner: 'tie',
            controlProgressPercentage: 0,
            adaptedProgressPercentage: 0,
            reason: 'First turn - baseline established, no progression yet',
            controlArcName: null,
            adaptedArcName: null,
          };
          
          updateData.human_emotional_state = baselineEmotion;
          updateData.arc_progression = baselineArcProgression;
          
        } else {
          // Subsequent turns - evaluate separately
          // NOTE: evaluateMultiTurnConversation now uses the CORRECT user message
          // for each endpoint via buildConversationHistoryContext
          
          const controlEval = await evaluateMultiTurnConversation(
            request.controlUserMessage.trim(),  // NEW: Use control's message
            conversation.system_prompt,
            controlResult.value.response,
            mappedPreviousTurns,
            'control',
            request.evaluationPromptId
          );
          
          const adaptedEval = await evaluateMultiTurnConversation(
            request.adaptedUserMessage.trim(),  // NEW: Use adapted's message
            conversation.system_prompt,
            adaptedResult.value.response,
            mappedPreviousTurns,
            'adapted',
            request.evaluationPromptId
          );
          
          updateData.control_evaluation = controlEval.evaluation;
          updateData.adapted_evaluation = adaptedEval.evaluation;
          updateData.control_human_emotional_state = controlEval.humanEmotionalState;
          updateData.adapted_human_emotional_state = adaptedEval.humanEmotionalState;
          updateData.control_arc_progression = controlEval.arcProgression;
          updateData.adapted_arc_progression = adaptedEval.arcProgression;
          
          updateData.conversation_winner = declareConversationWinner(
            controlEval.arcProgression,
            adaptedEval.arcProgression
          );
          
          updateData.human_emotional_state = controlEval.humanEmotionalState;
          updateData.arc_progression = controlEval.arcProgression;
          
          const comparison = compareEvaluations(controlEval.evaluation, adaptedEval.evaluation);
          updateData.evaluation_comparison = comparison;
        }
        
      } catch (evalError) {
        console.error('Evaluation failed:', evalError);
      }
    }
    
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
```

---

## API Layer Changes

### File: `src/app/api/pipeline/conversations/[id]/turn/route.ts`

```typescript
// CURRENT: Lines 1-44

/**
 * API Route: /api/pipeline/conversations/[id]/turn
 * 
 * POST - Add a new turn to the conversation
 * 
 * This endpoint:
 * - Calls both control and adapted endpoints with siloed history
 * - NOW supports separate user messages per endpoint
 * - Optionally evaluates responses with Claude-as-Judge
 * - Supports both single-turn and multi-turn arc evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { addTurn } from '@/lib/services';
import { AddTurnRequest, LegacyAddTurnRequest } from '@/types/conversation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body = await request.json();
    
    // NEW: Support both new dual-message format and legacy single-message format
    let turnRequest: AddTurnRequest;
    
    if ('controlUserMessage' in body && 'adaptedUserMessage' in body) {
      // New format: separate messages
      turnRequest = body as AddTurnRequest;
      
      if (!turnRequest.controlUserMessage || turnRequest.controlUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'controlUserMessage is required' },
          { status: 400 }
        );
      }
      
      if (!turnRequest.adaptedUserMessage || turnRequest.adaptedUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'adaptedUserMessage is required' },
          { status: 400 }
        );
      }
    } else if ('userMessage' in body) {
      // Legacy format: single message (send same to both)
      const legacyBody = body as LegacyAddTurnRequest;
      
      if (!legacyBody.userMessage || legacyBody.userMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'userMessage is required' },
          { status: 400 }
        );
      }
      
      // Convert to new format (same message for both endpoints)
      turnRequest = {
        controlUserMessage: legacyBody.userMessage,
        adaptedUserMessage: legacyBody.userMessage,
        enableEvaluation: legacyBody.enableEvaluation,
        evaluationPromptId: legacyBody.evaluationPromptId,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Either userMessage (legacy) or controlUserMessage+adaptedUserMessage (new) are required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, turnRequest);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## UI Component Changes

### 1. File: `src/hooks/useDualChat.ts`

**Changes:**
- Update state to manage two input fields
- Update `sendMessage` to pass both messages

```typescript
// Lines 95-103: Add dual input state

export interface UseDualChatReturn {
  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Current conversation
  conversation: ConversationWithTurns | null;
  isLoadingConversation: boolean;
  
  // Turns
  turns: ConversationTurn[];
  
  // NEW: Dual input state
  controlInput: string;
  setControlInput: (value: string) => void;
  adaptedInput: string;
  setAdaptedInput: (value: string) => void;
  
  // DEPRECATED: Legacy single input (kept for compatibility)
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
  sendMessage: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
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
  
  // NEW: Dual input state
  const [controlInput, setControlInput] = useState('');
  const [adaptedInput, setAdaptedInput] = useState('');
  
  // DEPRECATED: Legacy single input (sync with control input for backward compat)
  const [input, setInput] = useState('');
  
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string | undefined>();
  const queryClient = useQueryClient();
  
  // ... (rest of queries unchanged)
  
  // Add turn mutation
  const addTurnMutation = useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: AddTurnRequest }) =>
      addTurnApi(conversationId, request),
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
      }
      // NEW: Clear both inputs
      setControlInput('');
      setAdaptedInput('');
      setInput('');
    },
  });
  
  // ... (other mutations unchanged)
  
  // Computed values
  const isAtMaxTurns = (conversation?.turnCount || 0) >= CONVERSATION_CONSTANTS.MAX_TURNS;
  
  // NEW: Can send if BOTH inputs have content
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    controlInput.trim().length > 0 &&
    adaptedInput.trim().length > 0;
  
  // Actions
  const sendMessage = useCallback(async (controlMessage?: string, adaptedMessage?: string) => {
    if (!selectedId) return;
    
    const controlToSend = controlMessage || controlInput;
    const adaptedToSend = adaptedMessage || adaptedInput;
    
    if (!controlToSend.trim() || !adaptedToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        controlUserMessage: controlToSend.trim(),
        adaptedUserMessage: adaptedToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, controlInput, adaptedInput, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
  
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setControlInput('');
    setAdaptedInput('');
    setInput('');
  }, []);
  
  // ... (other actions unchanged)
  
  return {
    conversations,
    isLoadingConversations,
    conversation: conversation || null,
    isLoadingConversation,
    turns,
    
    // NEW: Dual inputs
    controlInput,
    setControlInput,
    adaptedInput,
    setAdaptedInput,
    
    // DEPRECATED: Legacy input
    input,
    setInput,
    
    enableEvaluation,
    setEnableEvaluation,
    selectedEvaluatorId,
    setSelectedEvaluatorId,
    isSending: addTurnMutation.isPending,
    isCreating: createMutation.isPending,
    error: error as Error | null,
    tokenUsage,
    sendMessage,
    startNewConversation,
    selectConversation,
    endConversation,
    deleteConversation: handleDeleteConversation,
    canSendMessage,
    isAtMaxTurns,
  };
}

// Update API helper
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
```

### 2. File: `src/components/pipeline/chat/ChatInput.tsx`

**Complete Replacement:**

```typescript
/**
 * ChatInput Component
 * Dual message input with send button and evaluation controls
 */

'use client';

import { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  // NEW: Dual inputs
  controlInput: string;
  onControlInputChange: (value: string) => void;
  adaptedInput: string;
  onAdaptedInputChange: (value: string) => void;
  
  onSend: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
  isSending: boolean;
  canSend: boolean;
  isAtMaxTurns: boolean;
  isCompleted: boolean;
  enableEvaluation: boolean;
  onEnableEvaluationChange: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  onEvaluatorChange: (id: string | undefined) => void;
  evaluators: any[];
}

export function ChatInput({
  controlInput,
  onControlInputChange,
  adaptedInput,
  onAdaptedInputChange,
  onSend,
  isSending,
  canSend,
  isAtMaxTurns,
  isCompleted,
  enableEvaluation,
  onEnableEvaluationChange,
  selectedEvaluatorId,
  onEvaluatorChange,
  evaluators,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };
  
  const isDisabled = isCompleted || isAtMaxTurns;
  
  return (
    <div className="p-4 border-t space-y-3">
      {/* Evaluation Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="enableEvaluation"
            checked={enableEvaluation}
            onCheckedChange={onEnableEvaluationChange}
            disabled={isDisabled}
          />
          <Label htmlFor="enableEvaluation" className="text-sm">
            Enable Evaluation
          </Label>
        </div>
        
        {enableEvaluation && (
          <Select
            value={selectedEvaluatorId}
            onValueChange={onEvaluatorChange}
            disabled={isDisabled}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select evaluator" />
            </SelectTrigger>
            <SelectContent>
              {evaluators.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.displayName}
                  {e.name?.includes('multi_turn') && (
                    <span className="ml-2 text-xs text-green-600">(Multi-Turn)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Dual Input Areas */}
      <div className="space-y-3">
        {/* Control Input */}
        <div className="space-y-1.5">
          <Label htmlFor="controlInput" className="text-sm font-medium">
            Control Input <span className="text-muted-foreground font-normal">(Base Model)</span>
          </Label>
          <Textarea
            id="controlInput"
            value={controlInput}
            onChange={(e) => onControlInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCompleted 
                ? 'Conversation completed'
                : isAtMaxTurns 
                  ? 'Maximum turns reached'
                  : 'Type message for Control endpoint...'
            }
            disabled={isDisabled}
            className="min-h-[60px] resize-none"
          />
        </div>
        
        {/* Adapted Input */}
        <div className="space-y-1.5">
          <Label htmlFor="adaptedInput" className="text-sm font-medium">
            Adapted Input <span className="text-muted-foreground font-normal">(LoRA Model)</span>
          </Label>
          <Textarea
            id="adaptedInput"
            value={adaptedInput}
            onChange={(e) => onAdaptedInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCompleted 
                ? 'Conversation completed'
                : isAtMaxTurns 
                  ? 'Maximum turns reached'
                  : 'Type message for Adapted endpoint...'
            }
            disabled={isDisabled}
            className="min-h-[60px] resize-none"
          />
        </div>
      </div>
      
      {/* Send Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onSend()}
          disabled={!canSend || isSending}
          size="default"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Both...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Both
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

### 3. File: `src/components/pipeline/chat/ChatMain.tsx`

**Update Props:**

```typescript
// Lines 15-35: Update props interface

interface ChatMainProps {
  conversation: ConversationWithTurns | null;
  turns: ConversationTurn[];
  
  // NEW: Dual inputs
  controlInput: string;
  onControlInputChange: (value: string) => void;
  adaptedInput: string;
  onAdaptedInputChange: (value: string) => void;
  
  onSend: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
  onEndConversation: () => Promise<void>;
  isSending: boolean;
  canSend: boolean;
  isAtMaxTurns: boolean;
  tokenUsage: TokenUsage;
  isLoading: boolean;
  error: Error | null;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  enableEvaluation: boolean;
  onEnableEvaluationChange: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  onEvaluatorChange: (id: string | undefined) => void;
  evaluators: any[];
}

export function ChatMain({
  conversation,
  turns,
  controlInput,
  onControlInputChange,
  adaptedInput,
  onAdaptedInputChange,
  onSend,
  onEndConversation,
  isSending,
  canSend,
  isAtMaxTurns,
  tokenUsage,
  isLoading,
  error,
  systemPrompt,
  onSystemPromptChange,
  enableEvaluation,
  onEnableEvaluationChange,
  selectedEvaluatorId,
  onEvaluatorChange,
  evaluators,
}: ChatMainProps) {
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a conversation or start a new chat
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading conversation...
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        conversation={conversation}
        onEndConversation={onEndConversation}
        isAtMaxTurns={isAtMaxTurns}
      />
      
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      <ChatMessageList turns={turns} />
      
      <ChatInput
        controlInput={controlInput}
        onControlInputChange={onControlInputChange}
        adaptedInput={adaptedInput}
        onAdaptedInputChange={onAdaptedInputChange}
        onSend={onSend}
        isSending={isSending}
        canSend={canSend}
        isAtMaxTurns={isAtMaxTurns}
        isCompleted={conversation.status === 'completed'}
        enableEvaluation={enableEvaluation}
        onEnableEvaluationChange={onEnableEvaluationChange}
        selectedEvaluatorId={selectedEvaluatorId}
        onEvaluatorChange={onEvaluatorChange}
        evaluators={evaluators}
      />
    </div>
  );
}
```

### 4. File: `src/components/pipeline/chat/MultiTurnChat.tsx`

**Update to pass dual inputs:**

```typescript
// Lines 19-63: Update component

export function MultiTurnChat({ jobId, initialConversationId }: MultiTurnChatProps) {
  const chat = useDualChat(jobId, initialConversationId);
  const [systemPrompt, setSystemPrompt] = useState('');
  const { data: evaluatorsData } = useEvaluators();
  const evaluators = evaluatorsData?.data || [];
  
  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 border rounded-lg">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card overflow-y-auto">
        <ChatSidebar
          conversations={chat.conversations}
          selectedId={chat.conversation?.id || null}
          onSelect={chat.selectConversation}
          onNewChat={() => chat.startNewConversation(undefined, systemPrompt)}
          onDelete={chat.deleteConversation}
          isLoading={chat.isLoadingConversations}
          isCreating={chat.isCreating}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          
          {/* NEW: Pass dual inputs */}
          controlInput={chat.controlInput}
          onControlInputChange={chat.setControlInput}
          adaptedInput={chat.adaptedInput}
          onAdaptedInputChange={chat.setAdaptedInput}
          
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
          enableEvaluation={chat.enableEvaluation}
          onEnableEvaluationChange={chat.setEnableEvaluation}
          selectedEvaluatorId={chat.selectedEvaluatorId}
          onEvaluatorChange={chat.setSelectedEvaluatorId}
          evaluators={evaluators}
        />
      </div>
    </div>
  );
}
```

### 5. File: `src/components/pipeline/chat/ChatTurn.tsx`

**Update to show dual messages:**

```typescript
/**
 * ChatTurn Component
 * Single turn with user message(s) and dual responses
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { DualResponsePanel } from './DualResponsePanel';
import { DualArcProgressionDisplay } from './DualArcProgressionDisplay';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { getUserMessageForEndpoint, turnMessagesAreIdentical } from '@/types/conversation';

interface ChatTurnProps {
  turn: ConversationTurn;
}

export function ChatTurn({ turn }: ChatTurnProps) {
  const showDualArcProgression = turn.controlArcProgression || turn.adaptedArcProgression;
  
  // NEW: Check if messages are different
  const messagesAreIdentical = turnMessagesAreIdentical(turn);
  const controlMessage = getUserMessageForEndpoint(turn, 'control');
  const adaptedMessage = getUserMessageForEndpoint(turn, 'adapted');
  
  return (
    <div className="space-y-3">
      {/* User Message(s) */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">You</span>
            <Badge variant="outline" className="text-xs">Turn {turn.turnNumber}</Badge>
          </div>
          
          {messagesAreIdentical ? (
            // Same message for both
            <p className="text-sm">{controlMessage}</p>
          ) : (
            // Different messages - show both
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-600">Control: </span>
                <span>{controlMessage}</span>
              </div>
              <div>
                <span className="font-medium text-purple-600">Adapted: </span>
                <span>{adaptedMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Dual Responses */}
      <DualResponsePanel turn={turn} />
      
      {/* Dual Arc Progression Display */}
      {showDualArcProgression && (
        <div className="ml-11 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
          <div className="font-medium text-sm mb-3">Conversation Arc Progression</div>
          <DualArcProgressionDisplay
            controlArcProgression={turn.controlArcProgression}
            adaptedArcProgression={turn.adaptedArcProgression}
            conversationWinner={turn.conversationWinner || null}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Issue B: Scrolling Fix

### Problem Analysis

Despite removing `overflow-hidden` from `MultiTurnChat.tsx`, the page still doesn't scroll. Let's analyze the component hierarchy:

```
MultiTurnChat (h-[calc(100vh-12rem)], NO overflow-hidden ✓)
├─ Sidebar (w-64, overflow-y-auto) ✓
└─ Main Chat Area (flex-1, overflow-hidden) ❌ STILL HAS overflow-hidden!
    └─ ChatMain (flex flex-col h-full)
        ├─ ChatHeader (fixed height)
        ├─ Alert (conditional)
        ├─ ChatMessageList (flex-1)  
        │   └─ ScrollArea (flex-1 p-4)
        │       └─ Message list content
        └─ ChatInput (fixed height)
```

**Root Causes:**
1. The Main Chat Area div still has `overflow-hidden` (line 41 of MultiTurnChat.tsx)
2. The ScrollArea component uses `flex-1` but doesn't have explicit height
3. The Radix ScrollArea needs a defined height to work properly

### Solution

#### Fix 1: Remove `overflow-hidden` from Main Chat Area

```typescript
// src/components/pipeline/chat/MultiTurnChat.tsx
// Line 41: CHANGE FROM:
<div className="flex-1 flex flex-col overflow-hidden">

// Line 41: CHANGE TO:
<div className="flex-1 flex flex-col min-h-0">
```

**Why `min-h-0`?**
- Flexbox children have an implicit `min-height: auto` which prevents shrinking
- `min-h-0` allows the flex item to shrink below its content size
- This enables the ScrollArea to work properly within the flex container

#### Fix 2: Add Explicit Height to ChatMessageList

```typescript
// src/components/pipeline/chat/ChatMessageList.tsx
// Line 33: CHANGE FROM:
<ScrollArea className="flex-1 p-4">

// Line 33: CHANGE TO:
<ScrollArea className="flex-1 p-4 overflow-auto">
```

**Additional Change:**
Add `overflow-auto` to ensure the viewport can scroll even if Radix doesn't initialize properly.

#### Fix 3: Ensure ChatMain Propagates Height Correctly

```typescript
// src/components/pipeline/chat/ChatMain.tsx
// Line 75: CHANGE FROM:
<div className="flex flex-col h-full">

// Line 75: CHANGE TO:
<div className="flex flex-col h-full min-h-0">
```

**Summary of Scrolling Fixes:**

| File | Line | Change | Reason |
|------|------|--------|--------|
| `MultiTurnChat.tsx` | 41 | `overflow-hidden` → `min-h-0` | Allow flex shrinking |
| `ChatMain.tsx` | 75 | Add `min-h-0` | Propagate flex constraints |
| `ChatMessageList.tsx` | 33 | Add `overflow-auto` | Fallback scrolling |

---

## Implementation Plan

### Phase 1: Database Migration (30 min)

1. **Create Migration File**
   - File: `supabase/migrations/20260131_add_dual_user_messages.sql`
   - Add `control_user_message` and `adapted_user_message` columns
   - Backfill existing data with `user_message`
   - Add column comments

2. **Run Migration**
   ```bash
   cd supabase
   supabase db push
   ```

3. **Verify Migration**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'conversation_turns'
   ORDER BY ordinal_position;
   ```

### Phase 2: Type Definitions (20 min)

1. **Update `conversation.ts`**
   - Add `controlUserMessage` and `adaptedUserMessage` to `ConversationTurn`
   - Update `AddTurnRequest` to require both messages
   - Add `LegacyAddTurnRequest` for backward compatibility
   - Add helper functions: `getUserMessageForEndpoint`, `turnUsesDualMessages`, `turnMessagesAreIdentical`

2. **Build to Verify Types**
   ```bash
   cd src
   npm run build
   ```

### Phase 3: Service Layer (60 min)

1. **Update `multi-turn-conversation-service.ts`**
   - Update `mapDbRowToTurn` to include new fields
   - Update `buildMessagesForEndpoint` to use correct user message
   - Update `buildConversationHistoryContext` to use correct user message
   - Update `addTurn` to:
     - Accept dual messages
     - Validate both messages
     - Store both messages in database
     - Pass correct message to each endpoint
     - Pass correct message to evaluation

2. **Test Service Functions**
   - Create test conversation
   - Send turn with different messages
   - Verify database stores both messages
   - Verify endpoints receive correct messages

### Phase 4: API Layer (15 min)

1. **Update `/api/pipeline/conversations/[id]/turn/route.ts`**
   - Add support for new dual-message format
   - Maintain backward compatibility with single-message format
   - Add validation for both messages
   - Add clear error messages

2. **Test API Endpoint**
   ```bash
   curl -X POST /api/pipeline/conversations/{id}/turn \
     -H "Content-Type: application/json" \
     -d '{
       "controlUserMessage": "Control prompt here",
       "adaptedUserMessage": "Adapted prompt here",
       "enableEvaluation": true
     }'
   ```

### Phase 5: React Hook (30 min)

1. **Update `useDualChat.ts`**
   - Add `controlInput` and `adaptedInput` state
   - Update `sendMessage` to pass both messages
   - Update `canSendMessage` to require both inputs
   - Update `selectConversation` to clear both inputs
   - Update mutation callbacks to clear both inputs

2. **Test Hook**
   - Verify state management works
   - Verify validation logic
   - Verify API calls pass correct data

### Phase 6: UI Components (45 min)

1. **Update `ChatInput.tsx`**
   - Replace single textarea with dual textareas
   - Add labels for Control and Adapted
   - Update keyboard handling
   - Update send button text to "Send Both"
   - Update validation

2. **Update `ChatMain.tsx`**
   - Pass dual input props
   - Update prop types

3. **Update `MultiTurnChat.tsx`**
   - Pass dual inputs from hook to ChatMain

4. **Update `ChatTurn.tsx`**
   - Display both user messages if different
   - Display single message if identical
   - Add visual distinction (colored labels)

5. **Test UI**
   - Verify dual inputs render correctly
   - Verify keyboard shortcuts work
   - Verify send button enables only when both fields have content
   - Verify loading states work
   - Verify message display shows both prompts

### Phase 7: Scrolling Fixes (15 min)

1. **Update `MultiTurnChat.tsx`**
   - Line 41: Change `overflow-hidden` to `min-h-0`

2. **Update `ChatMain.tsx`**
   - Line 75: Add `min-h-0` class

3. **Update `ChatMessageList.tsx`**
   - Line 33: Add `overflow-auto` class

4. **Test Scrolling**
   - Create conversation with 8+ turns
   - Verify page scrolls to show all messages
   - Test in Firefox and Chrome
   - Verify auto-scroll to new messages works

### Phase 8: Build & Test (30 min)

1. **Full Build**
   ```bash
   cd src
   npm run build
   ```

2. **Verify No Errors**
   - Check exit code 0
   - Review any warnings

3. **Manual Testing**
   - Start dev server: `npm run dev`
   - Navigate to chat page
   - Test all scenarios (see Testing Strategy below)

4. **Database Verification**
   - Query conversation_turns table
   - Verify new columns populated correctly
   - Verify different messages stored separately

---

## Testing Strategy

### Unit Tests (Manual Verification)

#### Test 1: Dual Input UI
- [ ] Both input fields render with correct labels
- [ ] Placeholders show correct text
- [ ] Fields disabled when conversation completed
- [ ] Send button only enabled when both have content
- [ ] Send button shows "Send Both" text
- [ ] Loading state shows "Sending Both..."

#### Test 2: Same Message (Backward Compatibility)
- [ ] Enter identical text in both fields
- [ ] Send message
- [ ] Verify turn display shows single message with "(Same for both)"
- [ ] Verify both endpoints receive same message
- [ ] Verify evaluation scores are similar (expected)

#### Test 3: Different Messages (Core Feature)
- [ ] Enter different text in Control vs Adapted
- [ ] Send message
- [ ] Verify turn display shows both messages with colored labels
- [ ] Verify Control endpoint receives Control message
- [ ] Verify Adapted endpoint receives Adapted message
- [ ] Verify responses are contextually appropriate to their prompts
- [ ] Verify evaluation scores are DIFFERENT (expected)

#### Test 4: Context Continuity
- [ ] Send turn 1 with different messages
- [ ] Send turn 2 with different messages
- [ ] Verify Control's turn 2 references Control's turn 1
- [ ] Verify Adapted's turn 2 references Adapted's turn 1
- [ ] Verify contexts are NOT crossed (siloed)

#### Test 5: Arc Progression Baselines
- [ ] Create new conversation with evaluation enabled
- [ ] Send turn 1 with different messages
- [ ] Verify both start at 0% (baseline)
- [ ] Send turn 2 with different messages
- [ ] Verify Control progression based on Control messages only
- [ ] Verify Adapted progression based on Adapted messages only
- [ ] Verify progressions can differ significantly

#### Test 6: Scrolling
- [ ] Create conversation with 8+ turns
- [ ] Verify can scroll to top to see turn 1
- [ ] Verify can scroll to bottom to see latest turn
- [ ] Verify scrollbar appears when content overflows
- [ ] Verify auto-scroll to new message works
- [ ] Test in Firefox
- [ ] Test in Chrome

#### Test 7: Legacy Data Compatibility
- [ ] Query old conversations (created before this update)
- [ ] Verify they still display correctly
- [ ] Verify they show single message (not dual)
- [ ] Verify evaluation data still accessible

### Integration Tests

#### Test 8: Full E2E Workflow
```
1. Navigate to /pipeline/jobs/{jobId}/chat
2. Click "New Chat"
3. Toggle "Enable Evaluation" ON
4. Select "Multi-Turn Arc-Aware Evaluator"
5. Turn 1 - Control: "I'm stressed about finances"
6. Turn 1 - Adapted: "I'm overwhelmed with money problems"
7. Send Both
8. Verify both responses appear
9. Verify both start at 0% progression
10. Turn 2 - Control: "Can you help me create a budget?"
11. Turn 2 - Adapted: "Where should I even start?"
12. Send Both
13. Verify responses are contextually appropriate
14. Verify arc progressions are DIFFERENT
15. Verify winner badge appears on higher-scoring response
16. Verify conversation history scrolls properly
```

### Database Verification Queries

```sql
-- Test 1: Verify migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversation_turns'
  AND column_name IN ('user_message', 'control_user_message', 'adapted_user_message');

-- Test 2: Verify new data structure
SELECT 
  turn_number,
  control_user_message,
  adapted_user_message,
  control_arc_progression->>'progressionPercentage' as control_progress,
  adapted_arc_progression->>'progressionPercentage' as adapted_progress
FROM conversation_turns
WHERE conversation_id = '{test_conversation_id}'
ORDER BY turn_number;

-- Test 3: Verify different progression scores
SELECT 
  turn_number,
  CASE 
    WHEN control_user_message = adapted_user_message THEN 'SAME'
    ELSE 'DIFFERENT'
  END as message_type,
  (control_arc_progression->>'progressionPercentage')::int as control_pct,
  (adapted_arc_progression->>'progressionPercentage')::int as adapted_pct,
  ABS((control_arc_progression->>'progressionPercentage')::int - 
      (adapted_arc_progression->>'progressionPercentage')::int) as difference
FROM conversation_turns
WHERE conversation_id = '{test_conversation_id}'
  AND evaluation_enabled = true
  AND turn_number > 1
ORDER BY turn_number;
```

---

## Migration Strategy

### Backward Compatibility

**Key Principle:** All existing conversations must continue to work without modification.

**How We Achieve This:**

1. **Database Level**
   - Keep `user_message` column (deprecated but functional)
   - Backfill new columns with same value as `user_message`
   - New turns populate all three columns

2. **Type Level**
   - `ConversationTurn` includes legacy `userMessage` field
   - Helper function `getUserMessageForEndpoint()` handles both formats
   - Type guard `turnUsesDualMessages()` detects format

3. **Service Level**
   - `buildMessagesForEndpoint` checks new columns first, falls back to legacy
   - `buildConversationHistoryContext` uses helper function
   - No special migration code needed

4. **API Level**
   - `/api/conversations/[id]/turn` accepts BOTH formats
   - Legacy single-message format converted to dual-message internally
   - No breaking changes to API contract

5. **UI Level**
   - `ChatTurn` detects message format and displays appropriately
   - Legacy turns show single message
   - New turns show dual messages if different

### Rollback Plan

If issues arise, rollback is simple:

1. **Revert Code Changes**
   ```bash
   git revert {commit_hash}
   git push origin main
   ```

2. **Database Rollback (Optional)**
   ```sql
   -- If needed, drop new columns (data preserved in user_message)
   ALTER TABLE conversation_turns
   DROP COLUMN control_user_message,
   DROP COLUMN adapted_user_message;
   ```

3. **No Data Loss**
   - All data remains in `user_message` column
   - Evaluations and responses unchanged
   - Old code can read everything

---

## Success Criteria

### Issue A: Dual Input Prompts

- [ ] Two separate input fields visible on chat page
- [ ] Labels clearly indicate Control vs Adapted
- [ ] Send button requires both fields to have content
- [ ] Different messages sent to different endpoints
- [ ] Context history remains siloed per endpoint
- [ ] Turn display shows both messages when different
- [ ] Turn display shows single message when identical
- [ ] Database stores both messages in separate columns
- [ ] Evaluation uses correct message per endpoint
- [ ] Arc progression tracks correctly per path
- [ ] Control and Adapted can have significantly different scores
- [ ] Existing conversations still work (backward compatible)

### Issue B: Scrolling Fix

- [ ] Page scrolls vertically when content exceeds viewport
- [ ] Can scroll to see turn 1 in conversation with 8+ turns
- [ ] Scrollbar appears when needed
- [ ] Auto-scroll to new message works
- [ ] Works in Firefox
- [ ] Works in Chrome
- [ ] No layout breaks or UI glitches

### Build & Quality

- [ ] TypeScript build succeeds (exit code 0)
- [ ] No new TypeScript errors
- [ ] No new ESLint warnings
- [ ] No console errors in browser
- [ ] All manual tests pass
- [ ] Database queries return expected data

---

## Risk Assessment

### Low Risk
- Type definitions (compile-time safety)
- Helper functions (pure functions)
- UI layout changes (visual only)
- Scrolling fixes (CSS changes)

### Medium Risk
- Service layer changes (complex logic, but well-tested)
- API changes (backward compatibility maintained)
- Database migration (backfilled, reversible)

### High Risk
None. All changes maintain backward compatibility.

### Mitigation Strategies

1. **Incremental Implementation**
   - Implement phase by phase
   - Test after each phase
   - Don't proceed if tests fail

2. **Backward Compatibility**
   - Always support legacy format
   - Graceful degradation
   - No breaking API changes

3. **Thorough Testing**
   - Test with old conversations
   - Test with new conversations
   - Test edge cases (empty, long, special chars)

4. **Monitoring**
   - Watch for API errors in production
   - Check database query performance
   - Monitor user feedback

---

## Estimated Timeline

| Phase | Task | Time | Running Total |
|-------|------|------|---------------|
| 1 | Database Migration | 30 min | 30 min |
| 2 | Type Definitions | 20 min | 50 min |
| 3 | Service Layer | 60 min | 110 min |
| 4 | API Layer | 15 min | 125 min |
| 5 | React Hook | 30 min | 155 min |
| 6 | UI Components | 45 min | 200 min |
| 7 | Scrolling Fixes | 15 min | 215 min |
| 8 | Build & Test | 30 min | 245 min |

**Total Estimated Time:** 4 hours (245 minutes)

**Buffer for Issues:** +1 hour

**Total with Buffer:** 5 hours

---

## Appendix A: File Checklist

### Files to Create
- [ ] `supabase/migrations/20260131_add_dual_user_messages.sql`

### Files to Modify
- [ ] `src/types/conversation.ts`
- [ ] `src/lib/services/multi-turn-conversation-service.ts`
- [ ] `src/app/api/pipeline/conversations/[id]/turn/route.ts`
- [ ] `src/hooks/useDualChat.ts`
- [ ] `src/components/pipeline/chat/ChatInput.tsx`
- [ ] `src/components/pipeline/chat/ChatMain.tsx`
- [ ] `src/components/pipeline/chat/MultiTurnChat.tsx`
- [ ] `src/components/pipeline/chat/ChatTurn.tsx`
- [ ] `src/components/pipeline/chat/ChatMessageList.tsx`

**Total Files:** 1 new, 9 modified

---

## Appendix B: Database Schema Reference

### Before Migration

```sql
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  user_message TEXT NOT NULL,  -- Single message for both endpoints
  -- ... other fields ...
);
```

### After Migration

```sql
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  turn_number INTEGER NOT NULL,
  user_message TEXT NOT NULL,  -- DEPRECATED: Legacy field
  control_user_message TEXT,   -- NEW: Message for Control endpoint
  adapted_user_message TEXT,   -- NEW: Message for Adapted endpoint
  -- ... other fields ...
);
```

---

## Appendix C: API Contract

### New Format (Recommended)

```typescript
POST /api/pipeline/conversations/{id}/turn

Request:
{
  "controlUserMessage": "I'm stressed about finances",
  "adaptedUserMessage": "I'm overwhelmed with money problems",
  "enableEvaluation": true,
  "evaluationPromptId": "uuid-here"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "turnNumber": 2,
    "controlUserMessage": "I'm stressed about finances",
    "adaptedUserMessage": "I'm overwhelmed with money problems",
    "controlResponse": "Let's work through this together...",
    "adaptedResponse": "I hear that feeling of overwhelm...",
    // ... other fields ...
  }
}
```

### Legacy Format (Still Supported)

```typescript
POST /api/pipeline/conversations/{id}/turn

Request:
{
  "userMessage": "I'm stressed about finances",  // Same for both
  "enableEvaluation": true,
  "evaluationPromptId": "uuid-here"
}

Response: (same as above, but both messages will be identical)
```

---

## Document Metadata

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Author:** AI Technical Architect  
**Review Status:** Ready for Implementation  
**Estimated Implementation Time:** 5 hours  
**Complexity:** Medium  
**Breaking Changes:** None (fully backward compatible)

---

**END OF SPECIFICATION**
