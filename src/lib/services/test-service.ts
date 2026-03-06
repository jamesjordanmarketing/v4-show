/**
 * Test Service
 *
 * Manages A/B testing and Claude-as-Judge evaluation
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import {
  TestResult,
  RunTestRequest,
  RunTestResponse,
  ClaudeEvaluation,
  EvaluationComparison,
  UserRating,
  EvaluatorOption,
} from '@/types/pipeline-adapter';
import { callInferenceEndpoint, getEndpointStatus } from './inference-service';
import { mapDbRowToTestResult } from '@/lib/pipeline/adapter-db-utils';

// ============================================
// Constants
// ============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EVALUATION_PROMPT = `You are an expert evaluator assessing the quality of a financial advisor conversation. Analyze the following response and provide structured evaluation.

USER'S QUESTION:
{user_prompt}

SYSTEM CONTEXT:
{system_prompt}

ADVISOR'S RESPONSE:
{response}

Evaluate the response on these dimensions and respond in JSON format:

{
  "emotionalProgression": {
    "startState": { "primaryEmotion": "<detected starting emotion>", "intensity": <0.0-1.0> },
    "endState": { "primaryEmotion": "<detected ending emotion>", "intensity": <0.0-1.0> },
    "arcCompleted": <true/false>,
    "progressionQuality": <1-5>,
    "progressionNotes": "<brief explanation>"
  },
  "empathyEvaluation": {
    "emotionsAcknowledged": <true/false>,
    "acknowledgmentInFirstSentence": <true/false>,
    "validationProvided": <true/false>,
    "empathyScore": <1-5>,
    "empathyNotes": "<brief explanation>"
  },
  "voiceConsistency": {
    "warmthPresent": <true/false>,
    "judgmentFree": <true/false>,
    "specificNumbersUsed": <true/false>,
    "jargonExplained": <true/false>,
    "voiceScore": <1-5>,
    "voiceNotes": "<brief explanation>"
  },
  "conversationQuality": {
    "helpfulToUser": <true/false>,
    "actionableGuidance": <true/false>,
    "appropriateDepth": <true/false>,
    "naturalFlow": <true/false>,
    "qualityScore": <1-5>,
    "qualityNotes": "<brief explanation>"
  },
  "overallEvaluation": {
    "wouldUserFeelHelped": <true/false>,
    "overallScore": <1-5>,
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}

Respond ONLY with valid JSON, no other text.`;

// ============================================
// Evaluation Prompt Database Functions
// ============================================

interface EvaluationPromptConfig {
  id: string;
  name: string;
  promptTemplate: string;
  includesArcContext: boolean;
  model: string;
  maxTokens: number;
}

/**
 * Fetch evaluation prompt from database
 * Falls back to legacy hardcoded prompt if not found
 */
async function getEvaluationPrompt(
  evaluationPromptId?: string
): Promise<EvaluationPromptConfig> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('evaluation_prompts')
    .select('id, name, prompt_template, includes_arc_context, model, max_tokens');

  if (evaluationPromptId) {
    query = query.eq('id', evaluationPromptId);
  } else {
    query = query.eq('is_default', true);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    // Fallback to legacy hardcoded prompt
    console.warn('Using fallback legacy evaluation prompt:', error?.message);
    return {
      id: 'legacy-fallback',
      name: 'legacy_v1',
      promptTemplate: EVALUATION_PROMPT,
      includesArcContext: false,
      model: 'claude-sonnet-4-20250514',
      maxTokens: 2000,
    };
  }

  return {
    id: data.id,
    name: data.name,
    promptTemplate: data.prompt_template,
    includesArcContext: data.includes_arc_context,
    model: data.model,
    maxTokens: data.max_tokens,
  };
}

/**
 * Fetch all emotional arcs from prompt_templates and format for injection
 */
async function getEmotionalArcsContext(): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const { data: arcs, error } = await supabase
    .from('prompt_templates')
    .select('template_name, emotional_arc_type, structure')
    .not('emotional_arc_type', 'is', null)
    .order('template_name');

  if (error || !arcs || arcs.length === 0) {
    console.warn('No emotional arcs found in prompt_templates');
    return 'No specific emotional arcs defined.';
  }

  return arcs.map((arc, index) => {
    const structure = arc.structure ? `\n   Structure: ${arc.structure}` : '';
    return `${index + 1}. **${arc.template_name}** (\`${arc.emotional_arc_type}\`)${structure}`;
  }).join('\n\n');
}

// ============================================
// Claude-as-Judge Functions
// ============================================

/**
 * Evaluate a response using Claude-as-Judge
 *
 * @param userPrompt - The user's question
 * @param systemPrompt - The system prompt used
 * @param response - The advisor's response
 * @param evaluationPromptId - Optional ID of the evaluation prompt to use
 * @param conversationHistory - Optional conversation history context
 * @param turnNumber - Optional turn number for template substitution
 */
async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string,
  evaluationPromptId?: string,
  conversationHistory?: string,
  turnNumber?: number
): Promise<ClaudeEvaluation> {
  // Fetch the evaluation prompt configuration
  const promptConfig = await getEvaluationPrompt(evaluationPromptId);

  // Build the prompt with variable substitution
  let prompt = promptConfig.promptTemplate
    .replace('{user_prompt}', userPrompt)
    .replace('{user_message}', userPrompt)  // NEW: RQE uses {user_message}
    .replace('{system_prompt}', systemPrompt || 'General financial planning advice')
    .replace('{response}', response);

  // NEW: Substitute conversation history if present
  if (conversationHistory) {
    prompt = prompt.replace('{conversation_history}', conversationHistory);
  } else {
    prompt = prompt.replace('{conversation_history}', 'This is the first turn.');
  }

  // NEW: Substitute turn number if present
  if (turnNumber !== undefined) {
    prompt = prompt.replace(/{current_turn}/g, String(turnNumber));
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
  // Handles: ```json\n{...}\n``` or ```\n{...}\n```
  responseText = responseText
    .replace(/^```json\s*/i, '')  // Remove opening ```json
    .replace(/^```\s*/i, '')       // Remove opening ``` (without language)
    .replace(/\s*```$/i, '')       // Remove closing ```
    .trim();

  return JSON.parse(responseText) as ClaudeEvaluation;
}

function compareEvaluations(
  controlEval: ClaudeEvaluation,
  adaptedEval: ClaudeEvaluation
): EvaluationComparison {
  const controlScore = controlEval.overallEvaluation.overallScore;
  const adaptedScore = adaptedEval.overallEvaluation.overallScore;
  const scoreDiff = adaptedScore - controlScore;

  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';

  // Identify improvements
  const improvements: string[] = [];
  const regressions: string[] = [];

  if (adaptedEval.empathyEvaluation.empathyScore > controlEval.empathyEvaluation.empathyScore) {
    improvements.push('Higher empathy score');
  } else if (adaptedEval.empathyEvaluation.empathyScore < controlEval.empathyEvaluation.empathyScore) {
    regressions.push('Lower empathy score');
  }

  if (adaptedEval.voiceConsistency.voiceScore > controlEval.voiceConsistency.voiceScore) {
    improvements.push('Better voice consistency');
  } else if (adaptedEval.voiceConsistency.voiceScore < controlEval.voiceConsistency.voiceScore) {
    regressions.push('Worse voice consistency');
  }

  if (adaptedEval.conversationQuality.qualityScore > controlEval.conversationQuality.qualityScore) {
    improvements.push('Higher quality guidance');
  } else if (adaptedEval.conversationQuality.qualityScore < controlEval.conversationQuality.qualityScore) {
    regressions.push('Lower quality guidance');
  }

  // Handle both legacy schema (emotionalProgression.arcCompleted) 
  // and arc-aware schema (emotionalStateAnalysis.emotionalMovement)
  // Use optional chaining to safely access properties that may not exist
  const adaptedArcCompleted = (adaptedEval as any).emotionalProgression?.arcCompleted;
  const controlArcCompleted = (controlEval as any).emotionalProgression?.arcCompleted;

  if (adaptedArcCompleted !== undefined && controlArcCompleted !== undefined) {
    // Legacy schema comparison
    if (adaptedArcCompleted && !controlArcCompleted) {
      improvements.push('Completed emotional arc');
    } else if (!adaptedArcCompleted && controlArcCompleted) {
      regressions.push('Failed to complete emotional arc');
    }
  } else {
    // Arc-aware schema comparison - compare emotional movement quality
    const adaptedMovement = (adaptedEval as any).emotionalStateAnalysis?.emotionalMovement;
    const controlMovement = (controlEval as any).emotionalStateAnalysis?.emotionalMovement;

    if (adaptedMovement && controlMovement) {
      // Compare movement quality scores (1-5)
      if (adaptedMovement.movementQuality > controlMovement.movementQuality) {
        improvements.push('Better emotional facilitation');
      } else if (adaptedMovement.movementQuality < controlMovement.movementQuality) {
        regressions.push('Worse emotional facilitation');
      }

      // Compare valence shift
      const valenceRank: Record<string, number> = { 'worsened': 0, 'maintained': 1, 'improved': 2 };
      const adaptedValence = valenceRank[adaptedMovement.valenceShift] ?? 1;
      const controlValence = valenceRank[controlMovement.valenceShift] ?? 1;

      if (adaptedValence > controlValence) {
        improvements.push('Better emotional valence shift');
      } else if (adaptedValence < controlValence) {
        regressions.push('Worse emotional valence shift');
      }
    }
  }

  return {
    winner,
    controlOverallScore: controlScore,
    adaptedOverallScore: adaptedScore,
    scoreDifference: scoreDiff,
    improvements,
    regressions,
    summary: `The ${winner === 'tie' ? 'responses are comparable' : winner + ' response performed better'} with a score difference of ${Math.abs(scoreDiff).toFixed(1)} points.`,
  };
}

// ============================================
// Core Service Functions
// ============================================

export async function runABTest(
  userId: string,
  request: RunTestRequest
): Promise<RunTestResponse> {
  const supabase = await createServerSupabaseClient();

  try {
    // Verify endpoints are ready
    const endpointStatus = await getEndpointStatus(request.jobId);
    if (!endpointStatus.success || !endpointStatus.data?.bothReady) {
      return { success: false, error: 'Endpoints not ready' };
    }

    const { controlEndpoint, adaptedEndpoint } = endpointStatus.data;

    // Create test record
    const { data: testRecord, error: insertError } = await supabase
      .from('pipeline_test_results')
      .insert({
        job_id: request.jobId,
        user_id: userId,
        user_prompt: request.userPrompt,
        system_prompt: request.systemPrompt || null,
        evaluation_enabled: request.enableEvaluation || false,
        status: 'generating',
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: `Failed to create test: ${insertError.message}` };
    }

    // Run sequential inference - NOT parallel!
    // CRITICAL: vLLM V1 engine crashes when receiving two simultaneous requests
    // with different model configurations (base model vs adapter).
    // We must run them sequentially to avoid EngineDeadError.
    console.log('[TEST-SERVICE] Starting SEQUENTIAL inference calls', {
      jobId: request.jobId,
      controlEndpointId: controlEndpoint!.runpodEndpointId,
      adaptedEndpointId: adaptedEndpoint!.runpodEndpointId,
      adaptedAdapterPath: adaptedEndpoint!.adapterPath
    });

    // First: Control (base model) request
    console.log('[TEST-SERVICE] Step 1/2: Running control (base model) inference...');
    const controlResult = await callInferenceEndpoint(
      controlEndpoint!.runpodEndpointId!,
      request.userPrompt,
      request.systemPrompt,
      false,  // No adapter
      undefined,  // No adapter path
      undefined   // No jobId needed for control
    );
    console.log('[TEST-SERVICE] Control inference completed:', {
      responseLength: controlResult.response.length,
      responsePreview: controlResult.response.substring(0, 100)
    });

    // Second: Adapted (LoRA adapter) request
    console.log('[TEST-SERVICE] Step 2/2: Running adapted (LoRA) inference...');
    const adaptedResult = await callInferenceEndpoint(
      adaptedEndpoint!.runpodEndpointId!,
      request.userPrompt,
      request.systemPrompt,
      true,  // Use adapter
      adaptedEndpoint!.adapterPath || undefined,  // Pass adapter path
      request.jobId  // Pass jobId for adapter loading
    );

    console.log('[TEST-SERVICE] Inference results received:', {
      controlResponseLength: controlResult.response.length,
      controlResponsePreview: controlResult.response.substring(0, 100),
      adaptedResponseLength: adaptedResult.response.length,
      adaptedResponsePreview: adaptedResult.response.substring(0, 100),
      controlTokens: controlResult.tokensUsed,
      adaptedTokens: adaptedResult.tokensUsed
    });

    // Update with responses
    const updates: Record<string, string | number | object | null> = {
      control_response: controlResult.response,
      control_generation_time_ms: controlResult.generationTimeMs,
      control_tokens_used: controlResult.tokensUsed,
      adapted_response: adaptedResult.response,
      adapted_generation_time_ms: adaptedResult.generationTimeMs,
      adapted_tokens_used: adaptedResult.tokensUsed,
      status: request.enableEvaluation ? 'evaluating' : 'completed',
      completed_at: request.enableEvaluation ? null : new Date().toISOString(),
    };

    console.log('[TEST-SERVICE] Database updates prepared:', {
      control_response_length: controlResult.response.length,
      adapted_response_length: adaptedResult.response.length,
      control_tokens: controlResult.tokensUsed,
      adapted_tokens: adaptedResult.tokensUsed
    });

    // Run Claude-as-Judge evaluation if requested
    if (request.enableEvaluation) {
      try {
        await supabase
          .from('pipeline_test_results')
          .update({ status: 'evaluating' })
          .eq('id', testRecord.id);

        const [controlEval, adaptedEval] = await Promise.all([
          evaluateWithClaude(
            request.userPrompt,
            request.systemPrompt || null,
            controlResult.response,
            request.evaluationPromptId  // NEW: Pass the prompt ID
          ),
          evaluateWithClaude(
            request.userPrompt,
            request.systemPrompt || null,
            adaptedResult.response,
            request.evaluationPromptId  // NEW: Pass the prompt ID
          ),
        ]);

        const comparison = compareEvaluations(controlEval, adaptedEval);

        updates.control_evaluation = controlEval;
        updates.adapted_evaluation = adaptedEval;
        updates.evaluation_comparison = comparison;
        updates.evaluation_prompt_id = request.evaluationPromptId || null;  // NEW: Store which evaluator was used
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } catch (evalError) {
        console.error('Evaluation failed:', evalError);
        // Continue without evaluation
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        updates.error_message = 'Evaluation failed but responses generated';
      }
    }

    const { data: finalResult, error: updateError } = await supabase
      .from('pipeline_test_results')
      .update(updates)
      .eq('id', testRecord.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: `Failed to update test: ${updateError.message}` };
    }

    return { success: true, data: mapDbRowToTestResult(finalResult) };
  } catch (error) {
    console.error('Run A/B test error:', error);

    // Try to update the test record with the error (if we created one)
    // This prevents records from being stuck in 'generating' status
    if (supabase) {
      try {
        const errorMessage = error instanceof Error ? error.message : 'Test failed';
        await supabase
          .from('pipeline_test_results')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('job_id', request.jobId)
          .eq('user_id', userId)
          .eq('status', 'generating');
      } catch (updateError) {
        console.error('Failed to update test record with error status:', updateError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}

export async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ success: boolean; data?: TestResult[]; count?: number; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('pipeline_test_results')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map(mapDbRowToTestResult),
      count: count || 0,
    };
  } catch {
    return { success: false, error: 'Failed to fetch test history' };
  }
}

export async function rateTestResult(
  testId: string,
  userId: string,
  rating: UserRating,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('pipeline_test_results')
      .update({
        user_rating: rating,
        user_notes: notes || null,
      })
      .eq('id', testId)
      .eq('user_id', userId);  // Ensure ownership

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save rating' };
  }
}

/**
 * Get all available evaluation prompts for the UI dropdown
 */
export async function getAvailableEvaluators(): Promise<{
  success: boolean;
  data?: EvaluatorOption[];
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('evaluation_prompts')
      .select('id, name, display_name, description, is_default')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('display_name');

    if (error) {
      return { success: false, error: `Failed to fetch evaluators: ${error.message}` };
    }

    return {
      success: true,
      data: (data || []).map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        isDefault: row.is_default,
      })),
    };
  } catch {
    return { success: false, error: 'Failed to fetch evaluators' };
  }
}

// ============================================
// Export Helper Functions for Multi-Turn Service
// ============================================

// Export helper functions for multi-turn conversation service
export { evaluateWithClaude, compareEvaluations, getEvaluationPrompt, getEmotionalArcsContext };
