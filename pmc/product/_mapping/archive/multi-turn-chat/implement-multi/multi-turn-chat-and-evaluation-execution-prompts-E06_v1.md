# Multi-Turn Chat Enhancement - Section E06: Dual Arc Progress & Scrolling

**Version:** 1.0  
**Date:** January 30, 2026  
**Section:** E06 - Enhanced Evaluation Display & UI Improvements  
**Prerequisites:** E01-E05 must be complete  
**Builds Upon:** All previous sections, especially E04 (UI) and E02 (Service)

---

## Overview

This section enhances the multi-turn chat feature with:
1. **Dual Arc Progress Bars** - Separate progress tracking for Control vs Adapted
2. **Winner Declaration** - Clear visual indication of which conversation is performing better
3. **Enhanced Scrolling** - Both page-level and response-box-level scrolling
4. **Separate Evaluation** - Independent evaluation of each conversation silo

---

## FAQ: Understanding Multi-Turn Evaluation

### Q1: What is being measured - the human's emotional state or the LLM's response quality?

**Answer:** Both, but primarily the **human's emotional state progression**.

The multi-turn arc-aware evaluator measures:
- **Human's Starting State**: The emotional state expressed in the user's prompt (e.g., "overwhelmed," "ashamed," "confused")
- **Human's Projected End State**: The emotional state the human is likely to feel AFTER reading the LLM's response
- **Emotional Movement**: Whether the human moved toward a more positive valence (negative → neutral → positive)
- **Arc Alignment**: Whether this progression matches known therapeutic arcs (e.g., "shame → acceptance")

The LLM's response is evaluated as the **mechanism** that facilitates this emotional movement. A better response moves the human further along a positive arc.

### Q2: Does it include the full conversation history (caching/context)?

**Answer:** Yes, absolutely. This is critical for multi-turn evaluation.

The implementation includes full conversation history:
- **Service Layer** (`buildMessagesForEndpoint` function in `multi-turn-conversation-service.ts`, lines 84-129): Fetches all completed turns and builds a complete message history for each endpoint
- **Each endpoint gets its own siloed history**: Control sees only control responses, Adapted sees only adapted responses
- **Best Practice for LLM Quality Engineering**: Full conversation context is REQUIRED for multi-turn evaluation. You cannot assess conversational coherence, emotional progression, or context maintenance without seeing previous turns.

### Q3: Is each conversation siloed (Control vs Adapted)?

**Answer:** Yes, completely siloed.

The current implementation correctly maintains separate conversations:
- Control endpoint receives: User Message 1 → Control Response 1 → User Message 2 → Control Response 2 → ...
- Adapted endpoint receives: User Message 1 → Adapted Response 1 → User Message 2 → Adapted Response 2 → ...

The user messages are the same, but each endpoint's responses build its own conversation thread.

### Q4: Can we measure each conversation independently without contamination?

**Answer:** Yes, the current implementation supports this.

The evaluation system:
- Evaluates Control conversation based ONLY on control history
- Evaluates Adapted conversation based ONLY on adapted history
- Compares the two evaluations to determine which conversation facilitated better emotional progression

However, **E06 reveals a gap**: Currently, only ONE arc progression bar is shown per turn, making it unclear which conversation (control or adapted) is being tracked. This section fixes that.

### Q5: What does the current "single bar" measure?

**Answer:** The current implementation shows a single `ArcProgressionBar` per turn, but it's ambiguous which conversation it's tracking.

Looking at `ChatTurn.tsx` (lines 61-69), the arc progression shown is from `turn.arcProgression`, which appears to be a single value. This needs to be split into:
- `controlArcProgression` 
- `adaptedArcProgression`

### Q6: How should dual progress bars be displayed?

**Answer:** Two vertically stacked progress bars with winner declaration:

```
┌─────────────────────────────────────────────┐
│ Control (Base)                    [75%]     │
│ ████████████████████░░░░░░░░░░░░            │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Adapted (LoRA)                    [92%]     │
│ ████████████████████████████░░░░             │
└─────────────────────────────────────────────┘

🏆 Winner: Adapted (LoRA)
Reason: Stronger emotional progression (92% vs 75%) with 
better valence shift (improved vs. maintained) and greater 
intensity reduction.
```

### Q7: How should scrolling work?

**Answer:** Two levels of scrolling:

1. **Page-Level Scrolling**: The entire chat area (containing all turns) should scroll vertically
2. **Response-Box Scrolling**: Each individual response box (Control and Adapted) should have internal scrolling if content exceeds ~300px height

This prevents:
- Extremely long responses from making the page unwieldy
- Horizontal stretching when responses are short
- Loss of context when viewing long conversations

---

## Prerequisites from E05

Verify E05 is complete:
- Multi-turn chat page exists at `/pipeline/jobs/[jobId]/chat`
- All UI components exist in `src/components/pipeline/chat/`
- Service layer handles conversation history correctly
- Evaluation system is functional

---

========================

## EXECUTION PROMPT E06

You are enhancing the multi-turn A/B testing chat module with dual arc progression tracking and improved scrolling.

### Context

The current implementation (E01-E05) has:
- Working multi-turn chat with siloed conversations (control vs adapted)
- Conversation history correctly maintained per endpoint
- Multi-turn arc-aware evaluation
- Single arc progression bar (ambiguous which conversation it tracks)
- Limited scrolling capabilities

### Task Overview

1. **Update Database Types** - Add separate arc progression tracking for control and adapted
2. **Enhance Service Layer** - Evaluate both conversations independently and store separate arc progressions
3. **Update UI Components** - Display dual progress bars with winner declaration
4. **Fix Scrolling** - Add page-level and response-box-level scrolling

---

## Part 1: Update Types

### File: `src/types/conversation.ts`

Update the `ConversationTurn` interface to include separate arc progression for each endpoint:

```typescript
// Find the ConversationTurn interface (around line 50) and update:

export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
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
  controlEvaluation: any | null;
  adaptedEvaluation: any | null;
  evaluationComparison: MultiTurnEvaluationComparison | null;
  
  // NEW: Separate human emotional state tracking for each conversation
  controlHumanEmotionalState: HumanEmotionalState | null;
  adaptedHumanEmotionalState: HumanEmotionalState | null;
  
  // NEW: Separate arc progression for each conversation
  controlArcProgression: ArcProgression | null;
  adaptedArcProgression: ArcProgression | null;
  
  // DEPRECATED: These are now split into control/adapted versions above
  // Kept for backward compatibility with existing data
  humanEmotionalState: HumanEmotionalState | null;
  arcProgression: ArcProgression | null;
  
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
}
```

Add new comparison type:

```typescript
// Add after MultiTurnEvaluationComparison interface (around line 120)

export interface ConversationWinnerDeclaration {
  winner: 'control' | 'adapted' | 'tie';
  controlProgressPercentage: number;
  adaptedProgressPercentage: number;
  reason: string;
  controlArcName: string | null;
  adaptedArcName: string | null;
}
```

---

## Part 2: Database Migration

### Task: Add New Columns to `conversation_turns` Table

Use SAOL to add the new columns:

```javascript
// Run from: c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops

require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  // Add columns for separate control/adapted tracking
  const alterQuery = `
    ALTER TABLE conversation_turns
    ADD COLUMN IF NOT EXISTS control_human_emotional_state JSONB,
    ADD COLUMN IF NOT EXISTS adapted_human_emotional_state JSONB,
    ADD COLUMN IF NOT EXISTS control_arc_progression JSONB,
    ADD COLUMN IF NOT EXISTS adapted_arc_progression JSONB,
    ADD COLUMN IF NOT EXISTS conversation_winner JSONB;
  `;
  
  // Execute via service role (SAOL doesn't have direct ALTER support)
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { error } = await supabase.rpc('exec_sql', { sql: alterQuery });
  
  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('✓ Added columns to conversation_turns table');
  }
  
  // Verify columns exist
  const schema = await saol.agentIntrospectSchema({
    table: 'conversation_turns',
    includeColumns: true,
    transport: 'pg'
  });
  
  console.log('Total columns:', schema.tables[0]?.columns?.length);
  console.log('Expected: 27 columns (was 22)');
})();
```

**Note:** If the `exec_sql` RPC function doesn't exist, run the migration directly in Supabase SQL Editor:

```sql
ALTER TABLE conversation_turns
ADD COLUMN IF NOT EXISTS control_human_emotional_state JSONB,
ADD COLUMN IF NOT EXISTS adapted_human_emotional_state JSONB,
ADD COLUMN IF NOT EXISTS control_arc_progression JSONB,
ADD COLUMN IF NOT EXISTS adapted_arc_progression JSONB,
ADD COLUMN IF NOT EXISTS conversation_winner JSONB;
```

---

## Part 3: Update Service Layer

### File: `src/lib/services/multi-turn-conversation-service.ts`

Update the database mapper function (around line 49):

```typescript
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
    
    // NEW: Separate tracking
    controlHumanEmotionalState: row.control_human_emotional_state,
    adaptedHumanEmotionalState: row.adapted_human_emotional_state,
    controlArcProgression: row.control_arc_progression,
    adaptedArcProgression: row.adapted_arc_progression,
    
    // DEPRECATED: Backward compatibility
    humanEmotionalState: row.human_emotional_state || row.control_human_emotional_state,
    arcProgression: row.arc_progression || row.control_arc_progression,
    
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
```

Update the `addTurn` function to evaluate both conversations (around line 400):

```typescript
/**
 * Add a new turn to the conversation with dual A/B responses and evaluation
 */
export async function addTurn(request: AddTurnRequest): Promise<{ success: boolean; data?: ConversationTurn; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    
    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('multi_turn_conversations')
      .select('*')
      .eq('id', request.conversationId)
      .single();
    
    if (convError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    // Check turn limit
    if (conversation.turn_count >= conversation.max_turns) {
      return { success: false, error: 'Maximum turns reached' };
    }
    
    // Create turn record
    const turnNumber = conversation.turn_count + 1;
    const { data: turnRecord, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: request.conversationId,
        turn_number: turnNumber,
        user_message: request.userMessage,
        evaluation_enabled: request.enableEvaluation,
        evaluation_prompt_id: request.evaluationPromptId,
        status: 'pending',
      })
      .select()
      .single();
    
    if (turnError || !turnRecord) {
      return { success: false, error: 'Failed to create turn' };
    }
    
    // Build conversation history for each endpoint
    const controlMessages = await buildMessagesForEndpoint(
      request.conversationId,
      'control',
      conversation.system_prompt,
      request.userMessage
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      request.conversationId,
      'adapted',
      conversation.system_prompt,
      request.userMessage
    );
    
    // Get endpoint URLs
    const { data: job } = await supabase
      .from('pipeline_training_jobs')
      .select('control_endpoint_url, adapted_endpoint_url')
      .eq('id', conversation.job_id)
      .single();
    
    if (!job) {
      return { success: false, error: 'Job not found' };
    }
    
    // Call both endpoints in parallel
    const [controlResult, adaptedResult] = await Promise.all([
      callInferenceEndpoint(job.control_endpoint_url, controlMessages),
      callInferenceEndpoint(job.adapted_endpoint_url, adaptedMessages),
    ]);
    
    // Prepare update object
    const updates: any = {
      control_response: controlResult.response,
      control_generation_time_ms: controlResult.generationTimeMs,
      control_tokens_used: controlResult.tokensUsed,
      control_error: controlResult.error,
      adapted_response: adaptedResult.response,
      adapted_generation_time_ms: adaptedResult.generationTimeMs,
      adapted_tokens_used: adaptedResult.tokensUsed,
      adapted_error: adaptedResult.error,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    
    // Evaluate both conversations if enabled
    if (request.enableEvaluation && controlResult.response && adaptedResult.response) {
      try {
        // Fetch all previous turns for history context
        const { data: previousTurns } = await supabase
          .from('conversation_turns')
          .select('*')
          .eq('conversation_id', request.conversationId)
          .eq('status', 'completed')
          .order('turn_number', { ascending: true });
        
        const mappedPreviousTurns = (previousTurns || []).map(mapDbRowToTurn);
        
        // Evaluate CONTROL conversation
        const controlEval = await evaluateMultiTurnConversation(
          request.userMessage,
          conversation.system_prompt,
          controlResult.response,
          mappedPreviousTurns,
          'control',
          request.evaluationPromptId
        );
        
        // Evaluate ADAPTED conversation
        const adaptedEval = await evaluateMultiTurnConversation(
          request.userMessage,
          conversation.system_prompt,
          adaptedResult.response,
          mappedPreviousTurns,
          'adapted',
          request.evaluationPromptId
        );
        
        // Compare the two evaluations
        const comparison = compareMultiTurnEvaluations(controlEval, adaptedEval);
        
        updates.control_evaluation = controlEval.evaluation;
        updates.adapted_evaluation = adaptedEval.evaluation;
        updates.evaluation_comparison = comparison;
        updates.control_human_emotional_state = controlEval.humanEmotionalState;
        updates.adapted_human_emotional_state = adaptedEval.humanEmotionalState;
        updates.control_arc_progression = controlEval.arcProgression;
        updates.adapted_arc_progression = adaptedEval.arcProgression;
        updates.conversation_winner = declareConversationWinner(
          controlEval.arcProgression,
          adaptedEval.arcProgression
        );
        
      } catch (evalError: any) {
        console.error('Multi-turn evaluation failed:', evalError);
        // Continue without evaluation
      }
    }
    
    // Update turn with results
    const { data: completedTurn, error: updateError } = await supabase
      .from('conversation_turns')
      .update(updates)
      .eq('id', turnRecord.id)
      .select()
      .single();
    
    if (updateError || !completedTurn) {
      return { success: false, error: 'Failed to update turn' };
    }
    
    // Update conversation metadata
    await supabase
      .from('multi_turn_conversations')
      .update({
        turn_count: turnNumber,
        control_total_tokens: (conversation.control_total_tokens || 0) + (controlResult.tokensUsed || 0),
        adapted_total_tokens: (conversation.adapted_total_tokens || 0) + (adaptedResult.tokensUsed || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.conversationId);
    
    return { success: true, data: mapDbRowToTurn(completedTurn) };
    
  } catch (error: any) {
    console.error('addTurn error:', error);
    return { success: false, error: error.message };
  }
}
```

Add new helper functions (add at the end of the file, before exports):

```typescript
/**
 * Evaluate a single conversation (control OR adapted) in multi-turn context
 */
async function evaluateMultiTurnConversation(
  userMessage: string,
  systemPrompt: string | null,
  response: string,
  previousTurns: ConversationTurn[],
  endpointType: 'control' | 'adapted',
  evaluationPromptId?: string
): Promise<{
  evaluation: any;
  humanEmotionalState: HumanEmotionalState;
  arcProgression: ArcProgression;
}> {
  // Build conversation history context for this specific endpoint
  const historyContext = buildConversationHistoryContext(previousTurns, endpointType);
  
  // Get evaluation using the enhanced prompt with history
  const evaluation = await evaluateWithClaude(
    userMessage,
    systemPrompt,
    response,
    evaluationPromptId,
    historyContext  // Pass conversation history
  );
  
  // Extract human emotional state from evaluation
  const emotionalStateAnalysis = evaluation.emotionalStateAnalysis || {};
  const humanEmotionalState: HumanEmotionalState = {
    turnNumber: previousTurns.length + 1,
    primaryEmotion: emotionalStateAnalysis.projectedEndState?.primaryEmotion || 'unknown',
    intensity: emotionalStateAnalysis.projectedEndState?.intensity || 0.5,
    valence: emotionalStateAnalysis.projectedEndState?.valence || 'neutral',
    secondaryEmotions: emotionalStateAnalysis.projectedEndState?.secondaryEmotion 
      ? [emotionalStateAnalysis.projectedEndState.secondaryEmotion]
      : [],
  };
  
  // Calculate arc progression
  const arcAlignment = evaluation.arcAlignment || {};
  const emotionalMovement = emotionalStateAnalysis.emotionalMovement || {};
  
  // Calculate progression percentage based on turns and movement quality
  const currentTurn = previousTurns.length + 1;
  const maxTurns = 10;
  const baseProgress = (currentTurn / maxTurns) * 100;
  const movementBonus = (emotionalMovement.movementQuality || 3) * 5; // 1-5 scale * 5 = 0-25%
  const progressionPercentage = Math.min(100, Math.round(baseProgress + movementBonus));
  
  const arcProgression: ArcProgression = {
    detectedArc: arcAlignment.detectedArc || 'none',
    progressionPercentage: progressionPercentage,
    onTrack: emotionalMovement.valenceShift === 'improved',
    cumulativeMovement: calculateCumulativeMovement(previousTurns, endpointType, emotionalMovement),
  };
  
  return {
    evaluation,
    humanEmotionalState,
    arcProgression,
  };
}

/**
 * Calculate cumulative emotional movement across all turns
 */
function calculateCumulativeMovement(
  previousTurns: ConversationTurn[],
  endpointType: 'control' | 'adapted',
  currentMovement: any
): string {
  const movements: string[] = [];
  
  // Collect all valence shifts from previous turns
  for (const turn of previousTurns) {
    const eval = endpointType === 'control' ? turn.controlEvaluation : turn.adaptedEvaluation;
    if (eval?.emotionalStateAnalysis?.emotionalMovement?.valenceShift) {
      movements.push(eval.emotionalStateAnalysis.emotionalMovement.valenceShift);
    }
  }
  
  // Add current movement
  if (currentMovement.valenceShift) {
    movements.push(currentMovement.valenceShift);
  }
  
  // Count improvements
  const improved = movements.filter(m => m === 'improved').length;
  const maintained = movements.filter(m => m === 'maintained').length;
  const worsened = movements.filter(m => m === 'worsened').length;
  
  return `${improved} improved, ${maintained} maintained, ${worsened} worsened`;
}

/**
 * Compare control vs adapted arc progressions and declare winner
 */
function declareConversationWinner(
  controlArc: ArcProgression | null,
  adaptedArc: ArcProgression | null
): ConversationWinnerDeclaration {
  if (!controlArc || !adaptedArc) {
    return {
      winner: 'tie',
      controlProgressPercentage: 0,
      adaptedProgressPercentage: 0,
      reason: 'Evaluation not available',
      controlArcName: null,
      adaptedArcName: null,
    };
  }
  
  const controlProgress = controlArc.progressionPercentage;
  const adaptedProgress = adaptedArc.progressionPercentage;
  const difference = Math.abs(controlProgress - adaptedProgress);
  
  // Tie if within 5% and both on track (or both off track)
  if (difference <= 5 && controlArc.onTrack === adaptedArc.onTrack) {
    return {
      winner: 'tie',
      controlProgressPercentage: controlProgress,
      adaptedProgressPercentage: adaptedProgress,
      reason: `Both conversations showing similar progression (${controlProgress}% vs ${adaptedProgress}%)`,
      controlArcName: controlArc.detectedArc,
      adaptedArcName: adaptedArc.detectedArc,
    };
  }
  
  // Determine winner based on progression percentage and on-track status
  let winner: 'control' | 'adapted';
  let reason: string;
  
  if (controlProgress > adaptedProgress) {
    winner = 'control';
    reason = `Control shows stronger emotional progression (${controlProgress}% vs ${adaptedProgress}%)`;
    if (controlArc.onTrack && !adaptedArc.onTrack) {
      reason += ' and is on track toward therapeutic arc';
    }
  } else {
    winner = 'adapted';
    reason = `Adapted shows stronger emotional progression (${adaptedProgress}% vs ${controlProgress}%)`;
    if (adaptedArc.onTrack && !controlArc.onTrack) {
      reason += ' and is on track toward therapeutic arc';
    }
  }
  
  return {
    winner,
    controlProgressPercentage: controlProgress,
    adaptedProgressPercentage: adaptedProgress,
    reason,
    controlArcName: controlArc.detectedArc,
    adaptedArcName: adaptedArc.detectedArc,
  };
}

/**
 * Compare two multi-turn evaluations for winner determination
 */
function compareMultiTurnEvaluations(
  controlEval: any,
  adaptedEval: any
): MultiTurnEvaluationComparison {
  // Extract overall scores
  const controlScore = controlEval.evaluation?.overallEvaluation?.emotionalFacilitationScore || 3;
  const adaptedScore = adaptedEval.evaluation?.overallEvaluation?.emotionalFacilitationScore || 3;
  
  // Determine winner
  let winner: 'control' | 'adapted' | 'tie' = 'tie';
  if (adaptedScore > controlScore + 0.5) {
    winner = 'adapted';
  } else if (controlScore > adaptedScore + 0.5) {
    winner = 'control';
  }
  
  return {
    winner,
    controlScore,
    adaptedScore,
    scoreDifference: adaptedScore - controlScore,
    categories: {
      empathy: {
        control: controlEval.evaluation?.empathyEvaluation?.empathyScore || 3,
        adapted: adaptedEval.evaluation?.empathyEvaluation?.empathyScore || 3,
      },
      voice: {
        control: controlEval.evaluation?.voiceConsistency?.voiceScore || 3,
        adapted: adaptedEval.evaluation?.voiceConsistency?.voiceScore || 3,
      },
      quality: {
        control: controlEval.evaluation?.conversationQuality?.qualityScore || 3,
        adapted: adaptedEval.evaluation?.conversationQuality?.qualityScore || 3,
      },
      emotionalFacilitation: {
        control: controlScore,
        adapted: adaptedScore,
      },
    },
  };
}
```

**IMPORTANT:** Update the `evaluateWithClaude` call in `test-service.ts` to accept conversation history:

### File: `src/lib/services/test-service.ts`

Update function signature (around line 400):

```typescript
async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string,
  evaluationPromptId?: string,
  conversationHistory?: string  // NEW: Optional conversation history
): Promise<ClaudeEvaluation> {
  // Fetch the evaluation prompt configuration
  const promptConfig = await getEvaluationPrompt(evaluationPromptId);
  
  // Build the prompt with variable substitution
  let prompt = promptConfig.promptTemplate
    .replace('{user_prompt}', userPrompt)
    .replace('{system_prompt}', systemPrompt || 'General financial planning advice')
    .replace('{response}', response);
  
  // NEW: Add conversation history if provided
  if (conversationHistory) {
    prompt = prompt.replace('{conversation_history}', conversationHistory);
  } else {
    prompt = prompt.replace('{conversation_history}', 'This is the first turn.');
  }
  
  // If this prompt includes arc context, inject it
  if (promptConfig.includesArcContext) {
    const arcsContext = await getEmotionalArcsContext();
    prompt = prompt.replace('{emotional_arcs}', arcsContext);
  }
  
  const claudeResponse = await anthropic.messages.create({
    model: promptConfig.model,
    max_tokens: promptConfig.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  let responseText = claudeResponse.content[0].type === 'text'
    ? claudeResponse.content[0].text
    : '';

  // Strip markdown code blocks if Claude wrapped the JSON in them
  responseText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(responseText) as ClaudeEvaluation;
}
```

---

## Part 4: Update UI Components

### File: `src/components/pipeline/chat/DualResponsePanel.tsx`

Add internal scrolling to response boxes:

```typescript
/**
 * DualResponsePanel Component
 * Side-by-side control and adapted responses with internal scrolling
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock } from 'lucide-react';

interface DualResponsePanelProps {
  turn: ConversationTurn;
}

export function DualResponsePanel({ turn }: DualResponsePanelProps) {
  const winner = turn.evaluationComparison?.winner;
  
  return (
    <div className="ml-11 grid grid-cols-2 gap-4">
      {/* Control Response */}
      <Card className={winner === 'control' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Control (Base)
              {winner === 'control' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.controlGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.controlGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.controlError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.controlError}
            </div>
          ) : turn.controlResponse ? (
            <ScrollArea className="h-[300px] w-full">
              <p className="whitespace-pre-wrap pr-4">{turn.controlResponse}</p>
            </ScrollArea>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
      
      {/* Adapted Response */}
      <Card className={winner === 'adapted' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Adapted (LoRA)
              {winner === 'adapted' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.adaptedGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.adaptedGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.adaptedError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.adaptedError}
            </div>
          ) : turn.adaptedResponse ? (
            <ScrollArea className="h-[300px] w-full">
              <p className="whitespace-pre-wrap pr-4">{turn.adaptedResponse}</p>
            </ScrollArea>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### NEW File: `src/components/pipeline/chat/DualArcProgressionDisplay.tsx`

Create new component for dual progress bars:

```typescript
/**
 * DualArcProgressionDisplay Component
 * Shows separate arc progression for control and adapted conversations
 * with winner declaration
 */

'use client';

import { ConversationWinnerDeclaration, ArcProgression } from '@/types/conversation';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface DualArcProgressionDisplayProps {
  controlArcProgression: ArcProgression | null;
  adaptedArcProgression: ArcProgression | null;
  conversationWinner: ConversationWinnerDeclaration | null;
}

export function DualArcProgressionDisplay({
  controlArcProgression,
  adaptedArcProgression,
  conversationWinner,
}: DualArcProgressionDisplayProps) {
  if (!controlArcProgression && !adaptedArcProgression) {
    return (
      <div className="text-sm text-muted-foreground">
        No arc progression data available
      </div>
    );
  }
  
  // Format arc name for display
  const formatArcName = (arcName: string | null) => {
    if (!arcName || arcName === 'none') return 'No clear arc detected';
    return arcName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' → ')
      .replace('To', '→');
  };
  
  const controlProgress = controlArcProgression?.progressionPercentage || 0;
  const adaptedProgress = adaptedArcProgression?.progressionPercentage || 0;
  const controlOnTrack = controlArcProgression?.onTrack || false;
  const adaptedOnTrack = adaptedArcProgression?.onTrack || false;
  
  return (
    <div className="space-y-4">
      {/* Control Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Control (Base)</span>
            <Badge variant={controlOnTrack ? 'default' : 'secondary'} className="text-xs">
              {controlOnTrack ? 'On Track' : 'Off Track'}
            </Badge>
          </div>
          <span className="text-muted-foreground">{controlProgress}%</span>
        </div>
        <Progress 
          value={controlProgress} 
          className={`h-2 ${controlOnTrack ? '[&>div]:bg-blue-500' : '[&>div]:bg-gray-400'}`}
        />
        <div className="text-xs text-muted-foreground">
          Arc: {formatArcName(controlArcProgression?.detectedArc || null)}
        </div>
      </div>
      
      {/* Adapted Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Adapted (LoRA)</span>
            <Badge variant={adaptedOnTrack ? 'default' : 'secondary'} className="text-xs">
              {adaptedOnTrack ? 'On Track' : 'Off Track'}
            </Badge>
          </div>
          <span className="text-muted-foreground">{adaptedProgress}%</span>
        </div>
        <Progress 
          value={adaptedProgress} 
          className={`h-2 ${adaptedOnTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-gray-400'}`}
        />
        <div className="text-xs text-muted-foreground">
          Arc: {formatArcName(adaptedArcProgression?.detectedArc || null)}
        </div>
      </div>
      
      {/* Winner Declaration */}
      {conversationWinner && conversationWinner.winner !== 'tie' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <Trophy className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-green-700 dark:text-green-300 text-sm mb-1">
              Winner: {conversationWinner.winner === 'control' ? 'Control (Base)' : 'Adapted (LoRA)'}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {conversationWinner.reason}
            </div>
          </div>
        </div>
      )}
      
      {conversationWinner && conversationWinner.winner === 'tie' && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-1">
            Tie
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {conversationWinner.reason}
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `src/components/pipeline/chat/ChatTurn.tsx`

Update to use new dual arc progression display:

```typescript
/**
 * ChatTurn Component
 * Single turn with user message and dual responses
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { DualResponsePanel } from './DualResponsePanel';
import { DualArcProgressionDisplay } from './DualArcProgressionDisplay';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ChatTurnProps {
  turn: ConversationTurn;
}

export function ChatTurn({ turn }: ChatTurnProps) {
  // Determine if we should show dual arc progression or human emotional state
  const showDualArcProgression = turn.controlArcProgression || turn.adaptedArcProgression;
  const showLegacyHumanState = !showDualArcProgression && turn.humanEmotionalState;
  
  return (
    <div className="space-y-3">
      {/* User Message */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">You</span>
            <Badge variant="outline" className="text-xs">Turn {turn.turnNumber}</Badge>
          </div>
          <p className="text-sm">{turn.userMessage}</p>
        </div>
      </div>
      
      {/* Dual Responses */}
      <DualResponsePanel turn={turn} />
      
      {/* Dual Arc Progression Display (NEW) */}
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
      
      {/* Legacy Human Emotional State (backward compatibility) */}
      {showLegacyHumanState && (
        <div className="ml-11 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
            Human Emotional State (Turn {turn.humanEmotionalState!.turnNumber})
          </div>
          <div className="text-blue-600 dark:text-blue-400 space-y-1">
            <div>
              <strong>Primary:</strong> {turn.humanEmotionalState!.primaryEmotion} ({turn.humanEmotionalState!.valence})
            </div>
            <div>
              <strong>Intensity:</strong> {(turn.humanEmotionalState!.intensity * 100).toFixed(0)}%
            </div>
            {turn.humanEmotionalState!.secondaryEmotions.length > 0 && (
              <div>
                <strong>Secondary:</strong> {turn.humanEmotionalState!.secondaryEmotions.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `src/components/pipeline/chat/index.ts`

Add new component export:

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
export { DualArcProgressionDisplay } from './DualArcProgressionDisplay';  // NEW
```

### File: `src/components/pipeline/chat/MultiTurnChat.tsx`

Update to ensure proper height constraints for scrolling:

```typescript
/**
 * MultiTurnChat Component
 * Main container for multi-turn A/B testing chat interface
 */

'use client';

import { useDualChat } from '@/hooks';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';

interface MultiTurnChatProps {
  jobId: string;
  initialConversationId?: string;
}

export function MultiTurnChat({ jobId, initialConversationId }: MultiTurnChatProps) {
  const chat = useDualChat(jobId, initialConversationId);
  
  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card overflow-y-auto">
        <ChatSidebar
          conversations={chat.conversations}
          selectedId={chat.conversation?.id}
          onSelect={chat.selectConversation}
          onNew={chat.createNewConversation}
          onDelete={chat.deleteConversation}
          isLoading={chat.isLoadingConversations}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
          onEndConversation={chat.endConversation}
          isSending={chat.isSending}
          canSend={chat.canSend}
          isAtMaxTurns={chat.isAtMaxTurns}
          tokenUsage={chat.tokenUsage}
          isLoading={chat.isLoadingConversation}
          error={chat.error}
          systemPrompt={chat.systemPrompt}
          onSystemPromptChange={chat.setSystemPrompt}
          enableEvaluation={chat.enableEvaluation}
          onEnableEvaluationChange={chat.setEnableEvaluation}
          selectedEvaluatorId={chat.selectedEvaluatorId}
          onEvaluatorChange={chat.setSelectedEvaluatorId}
          evaluators={chat.evaluators}
        />
      </div>
    </div>
  );
}
```

---

## Part 5: Build & Verification

### Build Verification

Run the full build from src directory:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npm run build
```

**Success Criteria:** Build completes with exit code 0, no TypeScript errors.

### Database Verification

Verify new columns were added:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);console.log('Column count:',r.tables[0]?.columns?.length);console.log('Expected: 27 columns (was 22)');})();"
```

### Manual Testing

Test the enhanced features:

**Test Case 1: Dual Arc Progression Display**
1. Navigate to `/pipeline/jobs/{jobId}/chat`
2. Create new conversation with evaluation enabled
3. Send first message
4. ✓ Verify TWO progress bars appear (Control and Adapted)
5. ✓ Verify each shows percentage and arc name
6. ✓ Verify winner declaration appears

**Test Case 2: Separate Conversation Evaluation**
1. Continue the conversation with 2-3 more turns
2. ✓ Verify Control progress bar tracks Control conversation only
3. ✓ Verify Adapted progress bar tracks Adapted conversation only
4. ✓ Verify winner declaration updates with each turn

**Test Case 3: Response Box Scrolling**
1. Send a prompt that generates long responses (500+ words)
2. ✓ Verify response boxes have internal scroll (max 300px height)
3. ✓ Verify you can scroll within each response box independently
4. ✓ Verify page doesn't stretch horizontally

**Test Case 4: Page-Level Scrolling**
1. Continue conversation to 5+ turns
2. ✓ Verify entire chat area scrolls vertically
3. ✓ Verify sidebar scrolls independently
4. ✓ Verify auto-scroll to latest message works

**Test Case 5: Backward Compatibility**
1. View conversations created before E06 (with old schema)
2. ✓ Verify they still display (falls back to legacy humanEmotionalState)
3. ✓ Verify no errors in console

---

## Summary of Changes

### Files Modified (7)
1. `src/types/conversation.ts` - Added dual arc progression types
2. `src/lib/services/multi-turn-conversation-service.ts` - Dual evaluation logic
3. `src/lib/services/test-service.ts` - Added conversation history parameter
4. `src/components/pipeline/chat/DualResponsePanel.tsx` - Added internal scrolling
5. `src/components/pipeline/chat/ChatTurn.tsx` - Uses new dual arc display
6. `src/components/pipeline/chat/MultiTurnChat.tsx` - Fixed height constraints
7. `src/components/pipeline/chat/index.ts` - Added new export

### Files Created (1)
1. `src/components/pipeline/chat/DualArcProgressionDisplay.tsx` - New dual progress component

### Database Changes
- Added 5 new JSONB columns to `conversation_turns` table:
  - `control_human_emotional_state`
  - `adapted_human_emotional_state`
  - `control_arc_progression`
  - `adapted_arc_progression`
  - `conversation_winner`

### Key Features Implemented

**Dual Evaluation:**
- ✅ Control and Adapted conversations evaluated independently
- ✅ Each uses its own conversation history (siloed)
- ✅ Separate arc progression tracking per conversation
- ✅ Winner declaration with reasoning

**Enhanced UI:**
- ✅ Two vertically stacked progress bars
- ✅ Winner badge and detailed explanation
- ✅ Internal scrolling in response boxes (300px max height)
- ✅ Page-level scrolling for long conversations
- ✅ Backward compatibility with old data

**Evaluation Accuracy:**
- ✅ Full conversation history passed to evaluator
- ✅ Measures human's emotional state progression
- ✅ Compares control vs adapted effectiveness
- ✅ No contamination between conversation silos

---

## Troubleshooting

### Build Errors

**Error: "Property 'controlArcProgression' does not exist"**
- Solution: Make sure all type updates are in `src/types/conversation.ts`
- Run: `npm run build` to verify

**Error: "Cannot find module 'DualArcProgressionDisplay'"**
- Solution: Verify the file was created and exported in `index.ts`
- Check import path uses `./DualArcProgressionDisplay`

### Database Errors

**Error: "Column 'control_arc_progression' does not exist"**
- Solution: Run the migration SQL in Supabase SQL Editor
- Verify with SAOL introspection command

### UI Display Issues

**Progress bars not showing:**
- Check: Is evaluation enabled for the conversation?
- Check: Did the turn complete successfully (status = 'completed')?
- Check browser console for JavaScript errors

**Scrolling not working:**
- Verify `ScrollArea` component is imported from `@/components/ui/scroll-area`
- Check parent container has fixed height (`h-[calc(100vh-12rem)]`)

**Winner declaration not appearing:**
- Check: Are both controlArcProgression and adaptedArcProgression present?
- Check: Is the difference > 5% or onTrack status different?

---

## Success Criteria

- [ ] Database migration successful (27 columns in conversation_turns)
- [ ] TypeScript build passes with no errors
- [ ] Dual progress bars display correctly
- [ ] Winner declaration shows with reasoning
- [ ] Response boxes have internal scrolling
- [ ] Page-level scrolling works smoothly
- [ ] Backward compatibility maintained
- [ ] All 5 manual test cases pass

---

**END OF E06_v1 PROMPT**

+++++++++++++++++
