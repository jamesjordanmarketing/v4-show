/**
 * Evaluation Service
 * 
 * Manages Claude-as-Judge evaluation runs
 */

import Anthropic from '@anthropic-ai/sdk';
import { TEST_SCENARIOS, getScenarioById } from './test-scenarios';
import {
  TestScenario,
  EvaluationResult,
  EmotionalProgressionResult,
  EmpathyEvaluationResult,
  VoiceConsistencyResult,
  ConversationQualityResult,
  OverallEvaluationResult,
} from '@/types/pipeline-evaluation';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// Claude Evaluation Prompt Template
// ============================================

function buildEvaluationPrompt(
  scenario: TestScenario,
  conversation: Array<{ role: string; content: string }>
): string {
  return `You are evaluating a conversation between a financial planning AI assistant and a client.

## Context
The client started with the following emotional state:
- Primary Emotion: ${scenario.initialContext.emotionalState.primaryEmotion}
- Intensity: ${scenario.initialContext.emotionalState.intensity}
- Secondary Emotions: ${scenario.initialContext.emotionalState.secondaryEmotions.join(', ')}

## Intended Emotional Arc
The AI should guide the user from "${scenario.targetArc.sourceEmotion}" to "${scenario.targetArc.targetEmotion}".

## Evaluation Criteria
The AI should follow these principles:
1. **Acknowledge emotions before providing facts** - Lead with empathy, not solutions
2. **Create judgment-free space** - No shaming, blaming, or "should have"
3. **Use specific numbers over abstractions** - Concrete guidance, not vague advice
4. **Celebrate progress** - Recognize and validate any forward movement

## Conversation to Evaluate
${conversation.map(turn => `${turn.role.toUpperCase()}: ${turn.content}`).join('\n\n')}

## Your Task
Evaluate this conversation and provide your assessment in the following JSON format:

\`\`\`json
{
  "emotional_progression": {
    "start_state": { "primary_emotion": "string", "intensity": 0.0-1.0 },
    "end_state": { "primary_emotion": "string", "intensity": 0.0-1.0 },
    "arc_completed": boolean,
    "progression_quality": 1-5,
    "progression_notes": "string explaining the emotional journey"
  },
  "empathy_evaluation": {
    "emotions_acknowledged": boolean,
    "acknowledgment_in_first_sentence": boolean,
    "validation_provided": boolean,
    "empathy_score": 1-5,
    "empathy_notes": "string"
  },
  "voice_consistency": {
    "warmth_present": boolean,
    "judgment_free": boolean,
    "specific_numbers_used": boolean,
    "jargon_explained": boolean,
    "voice_score": 1-5,
    "voice_notes": "string"
  },
  "conversation_quality": {
    "helpful_to_user": boolean,
    "actionable_guidance": boolean,
    "appropriate_depth": boolean,
    "natural_flow": boolean,
    "quality_score": 1-5,
    "quality_notes": "string"
  },
  "overall_evaluation": {
    "would_user_feel_helped": boolean,
    "overall_score": 1-5,
    "key_strengths": ["string"],
    "areas_for_improvement": ["string"],
    "summary": "string"
  }
}
\`\`\`

Provide ONLY the JSON output, no additional text.`;
}

// ============================================
// Conversation Generation
// ============================================

export async function generateConversation(
  scenario: TestScenario,
  modelEndpoint: string,
  adapterPath: string | null,
  maxTurns: number = 5
): Promise<{
  turns: Array<{ role: string; content: string }>;
  totalTokens: number;
  generationTimeMs: number;
}> {
  const startTime = Date.now();
  const turns: Array<{ role: string; content: string }> = [];
  let totalTokens = 0;

  // Initial user message
  turns.push({ role: 'user', content: scenario.openingMessage });

  // System prompt for the consultant
  const systemPrompt = `You are Elena Morales, CFP, an emotionally intelligent financial planning consultant.

Core Principles:
1. Money is emotional - always acknowledge feelings before facts
2. Create judgment-free space for financial discussions
3. Use specific numbers instead of abstract concepts
4. Celebrate small wins and progress

Current client profile:
- Name: ${scenario.initialContext.userName}
- Background: ${scenario.initialContext.userBackground}
- Current situation: ${scenario.initialContext.situation}
- Emotional state: ${scenario.initialContext.emotionalState.primaryEmotion} (intensity: ${scenario.initialContext.emotionalState.intensity})

Your goal is to guide this client from ${scenario.targetArc.sourceEmotion} toward ${scenario.targetArc.targetEmotion}.`;

  // Generate multi-turn conversation
  for (let turn = 0; turn < maxTurns; turn++) {
    // Generate assistant response
    // NOTE: In production, this calls the actual model endpoint (RunPod)
    // For now, we use Claude to simulate the trained model's response
    const assistantResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: turns.map(t => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      })),
    });

    const assistantContent = assistantResponse.content[0].type === 'text'
      ? assistantResponse.content[0].text
      : '';
    
    turns.push({ role: 'assistant', content: assistantContent });
    totalTokens += assistantResponse.usage.input_tokens + assistantResponse.usage.output_tokens;

    // If not last turn, generate user response
    if (turn < maxTurns - 1) {
      const userResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are ${scenario.initialContext.userName}, responding to a financial consultant.
Your persona: ${scenario.persona}
Your emotional state is gradually shifting from ${scenario.targetArc.sourceEmotion} toward ${scenario.targetArc.targetEmotion}.
Respond naturally and authentically based on how you're feeling.
Keep responses conversational and realistic (1-3 sentences usually).`,
        messages: turns.map(t => ({
          role: t.role === 'user' ? 'assistant' : 'user',
          content: t.content,
        })),
      });

      const userContent = userResponse.content[0].type === 'text'
        ? userResponse.content[0].text
        : '';
      
      turns.push({ role: 'user', content: userContent });
      totalTokens += userResponse.usage.input_tokens + userResponse.usage.output_tokens;
    }
  }

  const generationTimeMs = Date.now() - startTime;

  return { turns, totalTokens, generationTimeMs };
}

// ============================================
// Claude-as-Judge Evaluation
// ============================================

export async function evaluateWithClaude(
  scenario: TestScenario,
  conversation: Array<{ role: string; content: string }>
): Promise<{
  evaluation: EvaluationResult;
  tokensUsed: number;
}> {
  const prompt = buildEvaluationPrompt(scenario, conversation);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse JSON from response
  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                    responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse evaluation response');
  }

  const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  const evaluation: Omit<EvaluationResult, 'id' | 'runId' | 'evaluatedAt'> = {
    scenarioId: scenario.id,
    conversationTurns: conversation,
    totalTokens: null,
    generationTimeMs: null,
    emotionalProgression: {
      startState: parsed.emotional_progression.start_state,
      endState: parsed.emotional_progression.end_state,
      arcCompleted: parsed.emotional_progression.arc_completed,
      progressionQuality: parsed.emotional_progression.progression_quality,
      progressionNotes: parsed.emotional_progression.progression_notes,
    },
    empathyEvaluation: {
      emotionsAcknowledged: parsed.empathy_evaluation.emotions_acknowledged,
      acknowledgmentInFirstSentence: parsed.empathy_evaluation.acknowledgment_in_first_sentence,
      validationProvided: parsed.empathy_evaluation.validation_provided,
      empathyScore: parsed.empathy_evaluation.empathy_score,
      empathyNotes: parsed.empathy_evaluation.empathy_notes,
    },
    voiceConsistency: {
      warmthPresent: parsed.voice_consistency.warmth_present,
      judgmentFree: parsed.voice_consistency.judgment_free,
      specificNumbersUsed: parsed.voice_consistency.specific_numbers_used,
      jargonExplained: parsed.voice_consistency.jargon_explained,
      voiceScore: parsed.voice_consistency.voice_score,
      voiceNotes: parsed.voice_consistency.voice_notes,
    },
    conversationQuality: {
      helpfulToUser: parsed.conversation_quality.helpful_to_user,
      actionableGuidance: parsed.conversation_quality.actionable_guidance,
      appropriateDepth: parsed.conversation_quality.appropriate_depth,
      naturalFlow: parsed.conversation_quality.natural_flow,
      qualityScore: parsed.conversation_quality.quality_score,
      qualityNotes: parsed.conversation_quality.quality_notes,
    },
    overallEvaluation: {
      wouldUserFeelHelped: parsed.overall_evaluation.would_user_feel_helped,
      overallScore: parsed.overall_evaluation.overall_score,
      keyStrengths: parsed.overall_evaluation.key_strengths,
      areasForImprovement: parsed.overall_evaluation.areas_for_improvement,
      summary: parsed.overall_evaluation.summary,
    },
    claudeModelUsed: 'claude-sonnet-4-20250514',
    evaluationTokens: response.usage.input_tokens + response.usage.output_tokens,
    rawResponse: responseText,
  };

  return {
    evaluation: evaluation as EvaluationResult,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

// ============================================
// Aggregate Metrics Calculation
// ============================================

export function calculateAggregateMetrics(
  results: EvaluationResult[]
): {
  arcCompletionRate: number;
  avgProgressionQuality: number;
  empathyFirstRate: number;
  avgEmpathyScore: number;
  avgVoiceScore: number;
  helpfulRate: number;
  avgQualityScore: number;
  avgOverallScore: number;
} {
  if (results.length === 0) {
    return {
      arcCompletionRate: 0,
      avgProgressionQuality: 0,
      empathyFirstRate: 0,
      avgEmpathyScore: 0,
      avgVoiceScore: 0,
      helpfulRate: 0,
      avgQualityScore: 0,
      avgOverallScore: 0,
    };
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => sum(arr) / arr.length;

  return {
    arcCompletionRate: sum(results.map(r => r.emotionalProgression?.arcCompleted ? 1 : 0)) / results.length,
    avgProgressionQuality: avg(results.map(r => r.emotionalProgression?.progressionQuality || 0)),
    empathyFirstRate: sum(results.map(r => r.empathyEvaluation?.acknowledgmentInFirstSentence ? 1 : 0)) / results.length,
    avgEmpathyScore: avg(results.map(r => r.empathyEvaluation?.empathyScore || 0)),
    avgVoiceScore: avg(results.map(r => r.voiceConsistency?.voiceScore || 0)),
    helpfulRate: sum(results.map(r => r.overallEvaluation?.wouldUserFeelHelped ? 1 : 0)) / results.length,
    avgQualityScore: avg(results.map(r => r.conversationQuality?.qualityScore || 0)),
    avgOverallScore: avg(results.map(r => r.overallEvaluation?.overallScore || 0)),
  };
}
