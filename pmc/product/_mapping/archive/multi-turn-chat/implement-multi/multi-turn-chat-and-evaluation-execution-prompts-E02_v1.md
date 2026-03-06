# Multi-Turn Chat Implementation - Section E02: Service Layer

**Version:** 1.0  
**Date:** January 29, 2026  
**Section:** E02 - Service Layer  
**Prerequisites:** E01 (Database & Types) must be complete  
**Builds Upon:** Database tables and TypeScript types from E01  

---

## Overview

This prompt implements the service layer for the multi-turn chat module, including multi-turn arc-aware evaluation functions.

**What This Section Creates:**
1. Service file: `src/lib/services/conversation-service.ts` (~800 lines)
2. Export: Update `src/lib/services/index.ts`

**What This Section Does NOT Create:**
- API routes (E03)
- React hooks (E04)
- UI components (E04)
- Page routes (E05)

---

## Prerequisites from E01

Before starting, verify E01 is complete:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'multi_turn_conversations',includeColumns:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);})();"
```

Verify `src/types/conversation.ts` exists.

---

## Critical Instructions

### Existing Services to Reference

Follow patterns from these existing service files:
- `src/lib/services/test-service.ts` — Claude evaluation patterns
- `src/lib/services/inference-service.ts` — Endpoint calling patterns

### Imports

The service uses these existing functions from other services:
- `callInferenceEndpoint` from `./inference-service`
- `evaluateWithClaude`, `compareEvaluations`, `getEvaluationPrompt`, `getEmotionalArcsContext` from `./test-service`

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-turn-chat-and-evaluation_v1.md` (Section 6)
- Existing Services: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\`

---

========================


## EXECUTION PROMPT E02

You are implementing the service layer for a multi-turn A/B testing chat module with arc-aware evaluation.

### Context

This service layer manages:
- Creating and managing multi-turn conversations
- Adding turns with siloed history for each endpoint
- Optional Claude-as-Judge evaluation per turn
- Multi-turn arc-aware evaluation that measures actual human emotional state

### Prerequisites

E01 must be complete:
- `multi_turn_conversations` table exists
- `conversation_turns` table exists
- `src/types/conversation.ts` exists with all types

### Task 1: Create Conversation Service

Create file: `src/lib/services/conversation-service.ts`

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

### Task 2: Export from Services Index

Add to `src/lib/services/index.ts`:

```typescript
// Multi-turn conversation service
export * from './conversation-service';
```

### Task 3: Verify TypeScript Build

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
```

**Success Criteria:** Build completes with no TypeScript errors.

---

## Success Criteria

- [ ] `src/lib/services/conversation-service.ts` created with all functions
- [ ] `src/lib/services/index.ts` exports conversation service functions
- [ ] TypeScript builds without errors


+++++++++++++++++



---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/conversation-service.ts` | Created | Service layer with CRUD + evaluation |
| `src/lib/services/index.ts` | Modified | Export new service |

## Functions Exported

| Function | Purpose |
|----------|---------|
| `buildMessagesForEndpoint` | Build siloed message history |
| `evaluateTurnWithMultiTurnContext` | Multi-turn arc evaluation |
| `createConversation` | Create new conversation |
| `addTurn` | Add turn + call endpoints + evaluate |
| `getConversation` | Get conversation with turns |
| `listConversations` | List conversations for job |
| `completeConversation` | Mark conversation completed |
| `deleteConversation` | Delete conversation |

---

**END OF E02 PROMPT**
