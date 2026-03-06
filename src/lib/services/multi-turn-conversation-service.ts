/**
 * Multi-Turn Conversation Service
 * 
 * Manages multi-turn A/B testing conversations with optional arc-aware evaluation
 * 
 * IMPORTANT: This is separate from conversation-service.ts which handles the legacy
 * conversation generation system (using legacy_conversation_turns table).
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
  ConversationWinnerDeclaration,
  CONVERSATION_CONSTANTS,
  RQEEvaluation,
  RQEPairwiseResult,
  RQEPairwiseComparison,
  RQEWinnerDeclaration,
  computeRQS,
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
    
    // Legacy field (for backward compatibility)
    userMessage: row.user_message,
    
    // NEW: Dual messages
    controlUserMessage: row.control_user_message,
    adaptedUserMessage: row.adapted_user_message,
    
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
    conversationWinner: row.conversation_winner,
    
    // DEPRECATED: Backward compatibility
    humanEmotionalState: row.human_emotional_state || row.control_human_emotional_state,
    arcProgression: row.arc_progression || row.control_arc_progression,
    
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
    // NEW: Get the user message for THIS endpoint
    const userMessage = endpointType === 'control'
      ? (turn.controlUserMessage || turn.userMessage)
      : (turn.adaptedUserMessage || turn.userMessage);
    
    const response = endpointType === 'control' 
      ? turn.controlResponse 
      : turn.adaptedResponse;
    
    const evaluation = turn.humanEmotionalState 
      ? `EVALUATION: Human showed ${turn.humanEmotionalState.primaryEmotion} at intensity ${turn.humanEmotionalState.intensity}`
      : '';
    
    return `--- Turn ${turn.turnNumber} ---
HUMAN: ${userMessage}
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
 * Check if an evaluation prompt is the RQE evaluator
 */
async function isRQEEvaluator(promptId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('evaluation_prompts')
    .select('name')
    .eq('id', promptId)
    .single();
  return data?.name === 'response_quality_multi_turn_v1';
}

/**
 * Fetch the pairwise comparison prompt ID from database
 */
async function getPairwisePromptId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('evaluation_prompts')
    .select('id')
    .eq('name', 'response_quality_pairwise_v1')
    .single();
  return data?.id || null;
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
    
    // Validate input: Accept EITHER dual messages OR legacy single message
    let controlMessage: string;
    let adaptedMessage: string;
    let legacyMessage: string;
    
    if (request.controlUserMessage && request.adaptedUserMessage) {
      // NEW: Dual-message format
      controlMessage = request.controlUserMessage.trim();
      adaptedMessage = request.adaptedUserMessage.trim();
      legacyMessage = controlMessage; // Use control as legacy fallback
      
      if (!controlMessage || !adaptedMessage) {
        return { success: false, error: 'Both control and adapted messages are required when using dual-message format' };
      }
    } else if (request.userMessage) {
      // LEGACY: Single-message format (same message to both endpoints)
      legacyMessage = request.userMessage.trim();
      controlMessage = legacyMessage;
      adaptedMessage = legacyMessage;
      
      if (!legacyMessage) {
        return { success: false, error: 'userMessage is required' };
      }
    } else {
      return { success: false, error: 'Either userMessage (legacy) or both controlUserMessage and adaptedUserMessage (new) are required' };
    }
    
    // Create turn record with generating status
    const { data: turn, error: turnError } = await supabase
      .from('conversation_turns')
      .insert({
        conversation_id: conversationId,
        turn_number: nextTurnNumber,
        
        // NEW: Store both messages separately
        control_user_message: controlMessage,
        adapted_user_message: adaptedMessage,
        
        // DEPRECATED: Store in legacy field for backward compatibility
        user_message: legacyMessage,
        
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
      controlMessage  // NEW: Control gets its own message
    );
    
    const adaptedMessages = await buildMessagesForEndpoint(
      conversationId,
      'adapted',
      conversation.system_prompt,
      adaptedMessage  // NEW: Adapted gets its own message
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
        // Fetch all previous turns for history context
        const { data: previousTurnsData } = await supabase
          .from('conversation_turns')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('status', 'completed')
          .order('turn_number', { ascending: true });
        
        const mappedPreviousTurns = (previousTurnsData || []).map(mapDbRowToTurn);

        // Check if using RQE evaluator
        const useRQE = request.evaluationPromptId
          ? await isRQEEvaluator(request.evaluationPromptId)
          : false;

        if (useRQE) {
          // ============================
          // RQE EVALUATION PATH
          // ALL turns evaluated (including Turn 1)
          // ============================

          // Evaluate CONTROL response
          const controlEval = await evaluateWithRQE(
            controlMessage,
            conversation.system_prompt,
            controlResult.value.response,
            mappedPreviousTurns,
            'control',
            request.evaluationPromptId!,
            nextTurnNumber
          );

          // Evaluate ADAPTED response
          const adaptedEval = await evaluateWithRQE(
            adaptedMessage,
            conversation.system_prompt,
            adaptedResult.value.response,
            mappedPreviousTurns,
            'adapted',
            request.evaluationPromptId!,
            nextTurnNumber
          );

          // Run pairwise comparison
          const pairwiseResult = await runPairwiseComparison(
            controlResult.value.response,
            adaptedResult.value.response,
            controlMessage,  // Use control message for context
            mappedPreviousTurns,
            nextTurnNumber
          );

          // Compute authoritative RQS values
          const controlRQS = computeRQS(controlEval.evaluation.responseQuality);
          const adaptedRQS = computeRQS(adaptedEval.evaluation.responseQuality);
          const controlPAI = controlEval.evaluation.predictedArcImpact.score;
          const adaptedPAI = adaptedEval.evaluation.predictedArcImpact.score;

          // Store evaluations
          updateData.control_evaluation = controlEval.evaluation;
          updateData.adapted_evaluation = adaptedEval.evaluation;
          updateData.control_human_emotional_state = controlEval.humanEmotionalState;
          updateData.adapted_human_emotional_state = adaptedEval.humanEmotionalState;
          updateData.control_arc_progression = controlEval.arcProgression;
          updateData.adapted_arc_progression = adaptedEval.arcProgression;

          // Declare winner using three-signal system
          updateData.conversation_winner = declareRQEWinner(
            controlRQS,
            adaptedRQS,
            controlPAI,
            adaptedPAI,
            pairwiseResult
          );

          // Store comparison data (includes pairwise result)
          updateData.evaluation_comparison = {
            winner: updateData.conversation_winner.winner,
            controlRQS,
            adaptedRQS,
            controlPAI,
            adaptedPAI,
            pairwise: pairwiseResult,
            rqsDifference: adaptedRQS - controlRQS,
            paiDifference: adaptedPAI - controlPAI,
            summary: updateData.conversation_winner.reason,
          };

          // Legacy fields for backward compatibility
          updateData.human_emotional_state = controlEval.humanEmotionalState;
          updateData.arc_progression = controlEval.arcProgression;

        } else {
          // ============================
          // LEGACY EVALUATION PATH
          // Existing behavior preserved for non-RQE evaluators
          // ============================

          const isFirstTurn = mappedPreviousTurns.length === 0;

          if (isFirstTurn) {
            // First turn baseline (unchanged legacy behavior)
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
            // Subsequent turns - existing multi-turn evaluation
            const controlEval = await evaluateMultiTurnConversation(
              controlMessage,
              conversation.system_prompt,
              controlResult.value.response,
              mappedPreviousTurns,
              'control',
              request.evaluationPromptId
            );

            const adaptedEval = await evaluateMultiTurnConversation(
              adaptedMessage,
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

// ============================================
// E06: Dual Arc Progression Functions
// ============================================

/**
 * Evaluate a single response using the Response Quality Evaluator (RQE)
 * Returns RQE-formatted evaluation with dimension scores and predicted arc impact
 */
async function evaluateWithRQE(
  userMessage: string,
  systemPrompt: string | null,
  response: string,
  previousTurns: ConversationTurn[],
  endpointType: 'control' | 'adapted',
  evaluationPromptId: string,
  turnNumber: number
): Promise<{
  evaluation: RQEEvaluation;
  arcProgression: ArcProgression;
  humanEmotionalState: HumanEmotionalState;
}> {
  // Build conversation history context for this specific endpoint
  const historyContext = buildConversationHistoryContext(previousTurns, endpointType);

  // Call Claude-as-Judge with RQE prompt
  const rawEvaluation = await evaluateWithClaude(
    userMessage,
    systemPrompt,
    response,
    evaluationPromptId,
    historyContext,
    turnNumber        // NEW: pass turn number for template substitution
  );

  // Parse as RQE format
  const rqeEval = rawEvaluation as unknown as RQEEvaluation;

  // Compute authoritative RQS from dimension weights (override Claude's self-computed score)
  const computedRQS = computeRQS(rqeEval.responseQuality);

  // Map RQE results to legacy ArcProgression format for UI compatibility
  const arcProgression: ArcProgression = {
    detectedArc: 'response_quality',
    progressionPercentage: rqeEval.predictedArcImpact.score,  // PAI maps to progress %
    onTrack: rqeEval.predictedArcImpact.score >= 50,
    arcMatchConfidence: 0.9,  // High confidence since we're measuring directly
    progressionNotes: rqeEval.turnSummary.summary,
  };

  // Map to legacy HumanEmotionalState format for backward compat
  // (The RQE doesn't measure human state, so we create a placeholder
  //  that indicates this was an RQE evaluation)
  const humanEmotionalState: HumanEmotionalState = {
    turnNumber,
    primaryEmotion: 'rqe_evaluation',
    secondaryEmotions: [],
    intensity: computedRQS / 10,  // Normalize 1-10 to 0-1
    valence: rqeEval.predictedArcImpact.score >= 50 ? 'positive' : 'neutral',
    confidence: 1.0,
    evidenceQuotes: [],
    stateNotes: `RQE Score: ${computedRQS}/10 | PAI: ${rqeEval.predictedArcImpact.score}%`,
  };

  return {
    evaluation: { ...rqeEval, responseQualityScore: computedRQS },
    arcProgression,
    humanEmotionalState,
  };
}

/**
 * Run a pairwise comparison between control and adapted responses
 * Position-randomized to prevent bias
 */
async function runPairwiseComparison(
  controlResponse: string,
  adaptedResponse: string,
  userMessage: string,
  previousTurns: ConversationTurn[],
  turnNumber: number
): Promise<RQEPairwiseComparison | null> {
  try {
    const pairwisePromptId = await getPairwisePromptId();
    if (!pairwisePromptId) {
      console.warn('Pairwise prompt not found in database, skipping comparison');
      return null;
    }

    // Position randomization: randomly assign A and B
    const controlIsA = Math.random() > 0.5;
    const responseA = controlIsA ? controlResponse : adaptedResponse;
    const responseB = controlIsA ? adaptedResponse : controlResponse;

    // Build history context (use control's history for consistency)
    const historyContext = buildConversationHistoryContext(previousTurns, 'control');

    // Get the pairwise prompt config
    const promptConfig = await getEvaluationPrompt(pairwisePromptId);

    // Build the prompt with variable substitution
    let prompt = promptConfig.promptTemplate
      .replace('{conversation_history}', historyContext || 'This is the first turn.')
      .replace(/{current_turn}/g, String(turnNumber))
      .replace('{user_message}', userMessage)
      .replace('{response_a}', responseA)
      .replace('{response_b}', responseB);

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

    const pairwiseResult = JSON.parse(responseText) as RQEPairwiseResult;

    // De-randomize: map A/B back to control/adapted
    let mappedPreferred: 'control' | 'adapted' | 'tie';
    if (pairwiseResult.preferred === 'tie') {
      mappedPreferred = 'tie';
    } else if (pairwiseResult.preferred === 'A') {
      mappedPreferred = controlIsA ? 'control' : 'adapted';
    } else {
      mappedPreferred = controlIsA ? 'adapted' : 'control';
    }

    return {
      ...pairwiseResult,
      mappedPreferred,
      aWas: controlIsA ? 'control' : 'adapted',
    };
  } catch (error) {
    console.error('Pairwise comparison failed:', error);
    return null;
  }
}

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
  
  // FIXED: Read from correct multi-turn evaluator structure
  const evaluationData = evaluation as any;
  
  // Extract human emotional state from multi-turn evaluation structure
  const humanEmotionalState: HumanEmotionalState = {
    turnNumber: previousTurns.length + 1,
    primaryEmotion: evaluationData.humanEmotionalState?.primaryEmotion || 'unknown',
    intensity: evaluationData.humanEmotionalState?.intensity || 0.5,
    valence: evaluationData.humanEmotionalState?.valence || 'neutral',
    secondaryEmotions: evaluationData.humanEmotionalState?.secondaryEmotions || [],
    confidence: evaluationData.humanEmotionalState?.confidence || 0.5,
    evidenceQuotes: evaluationData.humanEmotionalState?.evidenceQuotes || [],
    stateNotes: evaluationData.humanEmotionalState?.stateNotes || '',
  };
  
  // Use Claude's arc progression directly (it's already calculated correctly)
  const arcProgression: ArcProgression = {
    detectedArc: evaluationData.arcProgression?.detectedArc || 'none',
    progressionPercentage: evaluationData.arcProgression?.progressionPercentage || 0,
    onTrack: evaluationData.arcProgression?.onTrack || false,
    arcMatchConfidence: evaluationData.arcProgression?.arcMatchConfidence || 0.5,
    progressionNotes: evaluationData.arcProgression?.progressionNotes || '',
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
    const evalData: any = endpointType === 'control' ? turn.controlEvaluation : turn.adaptedEvaluation;
    if (evalData?.emotionalStateAnalysis?.emotionalMovement?.valenceShift) {
      movements.push(evalData.emotionalStateAnalysis.emotionalMovement.valenceShift);
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
 * Declare winner using the RQE three-signal system:
 * 1st priority: PAI difference > 10
 * 2nd priority: RQS difference > 0.5
 * 3rd priority: Pairwise comparison confidence > 0.7
 * Fallback: Tie
 */
function declareRQEWinner(
  controlRQS: number,
  adaptedRQS: number,
  controlPAI: number,
  adaptedPAI: number,
  pairwise: RQEPairwiseComparison | null
): ConversationWinnerDeclaration {
  const paiDiff = Math.abs(controlPAI - adaptedPAI);
  const rqsDiff = Math.abs(controlRQS - adaptedRQS);

  let winner: 'control' | 'adapted' | 'tie';
  let reason: string;
  let determinedBy: string;

  // Signal 1: PAI difference > 100 (TEST CONFIG - see arc-evaluator-issues_v1.md for revert)
  if (paiDiff > 100) {
    winner = controlPAI > adaptedPAI ? 'control' : 'adapted';
    reason = `${winner === 'control' ? 'Control' : 'Adapted'} has higher predicted impact (${controlPAI}% vs ${adaptedPAI}%)`;
    determinedBy = 'pai';
  }
  // Signal 2: RQS difference > 5.0 (TEST CONFIG - see arc-evaluator-issues_v1.md for revert)
  else if (rqsDiff > 5.0) {
    winner = controlRQS > adaptedRQS ? 'control' : 'adapted';
    reason = `${winner === 'control' ? 'Control' : 'Adapted'} has higher response quality score (${controlRQS} vs ${adaptedRQS})`;
    determinedBy = 'rqs';
  }
  // Signal 3: Pairwise comparison (TEST CONFIG: confidence > 0.3 - see arc-evaluator-issues_v1.md for revert)
  else if (pairwise && pairwise.confidence > 0.3 && pairwise.mappedPreferred !== 'tie') {
    winner = pairwise.mappedPreferred;
    reason = `Pairwise comparison prefers ${winner} (confidence: ${pairwise.confidence.toFixed(2)}): ${pairwise.reasoning}`;
    determinedBy = 'pairwise';
  }
  // Fallback: Tie
  else {
    winner = 'tie';
    reason = `Both responses show similar quality (RQS: ${controlRQS} vs ${adaptedRQS}, PAI: ${controlPAI}% vs ${adaptedPAI}%)`;
    determinedBy = 'tie';
  }

  // Return in ConversationWinnerDeclaration format for UI compatibility
  return {
    winner,
    controlProgressPercentage: controlPAI,  // Maps PAI to existing progress field
    adaptedProgressPercentage: adaptedPAI,
    reason,
    controlArcName: 'response_quality',
    adaptedArcName: 'response_quality',
  };
}
