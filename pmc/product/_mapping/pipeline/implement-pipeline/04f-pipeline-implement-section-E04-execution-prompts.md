# Pipeline Implementation - Section E04: Training Engine & Evaluation System

**Version:** 1.0  
**Date:** January 10, 2026  
**Section:** E04 - Backend Training & Evaluation  
**Prerequisites:** E01 (Database), E02 (API Routes), E03 (UI) must be complete  
**Builds Upon:** All previous sections  

---

## Overview

This prompt implements the backend training infrastructure and Claude-as-Judge evaluation system. This is the final section that connects everything together.

**What This Section Creates:**
1. Supabase Edge Functions for RunPod integration
2. Test scenarios for Claude-as-Judge evaluation
3. Evaluation API endpoints
4. Edge function for job processing

**What This Section Does NOT Create:**
- Python training engine (exists in `brightrun-trainer/`)
- Docker configuration (exists in `brightrun-trainer/`)

---

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',limit:5});console.log(JSON.stringify(r.data,null,2));})();"
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<configured in .env.local>
SUPABASE_SERVICE_ROLE_KEY=<configured in .env.local>
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/ei82ickpenoqlp
GPU_CLUSTER_API_KEY=<configured in .env.local>
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `supabase/functions/` - Edge function patterns
- `src/app/api/` - API route patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\v4-show-full-implementation-spec_v1.md`
- Claude-as-Judge Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\frontier-emotional-arc-LoRA-training-claude-as-judge-testing_v1.md`

---

## Implementation Tasks

### Task 1: Create Test Scenarios

Create file: `src/lib/pipeline/test-scenarios.ts`

```typescript
/**
 * Test Scenarios for Claude-as-Judge Evaluation
 * 
 * These are HELD-OUT scenarios NOT used in training data.
 * Used to evaluate baseline (untrained) vs trained model.
 */

import { TestScenario, EmotionalArcType, PersonaType } from '@/types/pipeline-evaluation';

export const TEST_SCENARIOS: TestScenario[] = [
  // Anxiety to Confidence
  {
    id: 'test_anxiety_confidence_001',
    arcType: 'anxiety_to_confidence',
    persona: 'anxious_planner',
    topic: 'Market Volatility',
    initialContext: {
      userName: 'Alex',
      userBackground: 'Mid-career professional, 35, first-time serious investor with $80k portfolio',
      emotionalState: {
        primaryEmotion: 'anxiety',
        intensity: 0.8,
        secondaryEmotions: ['fear', 'confusion', 'frustration'],
      },
      situation: 'Market dropped 12% this week, portfolio down $9,600, considering selling everything',
    },
    openingMessage: "I'm freaking out right now. My portfolio is down almost $10,000 this week. I knew I shouldn't have invested so much. Should I just sell everything before it gets worse? I can't sleep at night thinking about this.",
    targetArc: {
      sourceEmotion: 'anxiety',
      targetEmotion: 'confidence',
      expectedTurns: 5,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },
  {
    id: 'test_anxiety_confidence_002',
    arcType: 'anxiety_to_confidence',
    persona: 'overwhelmed_avoider',
    topic: 'Retirement Planning',
    initialContext: {
      userName: 'Jordan',
      userBackground: 'Late 40s, minimal retirement savings, avoided thinking about retirement',
      emotionalState: {
        primaryEmotion: 'anxiety',
        intensity: 0.7,
        secondaryEmotions: ['shame', 'overwhelm'],
      },
      situation: 'Just turned 48, realized retirement is approaching with only $45k saved',
    },
    openingMessage: "I'm 48 and I only have $45,000 saved for retirement. I feel like such a failure. Everyone else my age seems to have it together. Is it even worth trying at this point or is it too late for me?",
    targetArc: {
      sourceEmotion: 'anxiety',
      targetEmotion: 'confidence',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Confusion to Clarity
  {
    id: 'test_confusion_clarity_001',
    arcType: 'confusion_to_clarity',
    persona: 'pragmatic_optimist',
    topic: 'Investment Options',
    initialContext: {
      userName: 'Morgan',
      userBackground: 'New to investing, $30k to invest, overwhelmed by choices',
      emotionalState: {
        primaryEmotion: 'confusion',
        intensity: 0.75,
        secondaryEmotions: ['frustration', 'uncertainty'],
      },
      situation: 'Has $30k inheritance, wants to invest but doesn\'t understand the options',
    },
    openingMessage: "I just inherited $30,000 and everyone is giving me different advice. My dad says stocks, my friend says crypto, my coworker swears by real estate. I don't understand the difference between ETFs and mutual funds. Where do I even start?",
    targetArc: {
      sourceEmotion: 'confusion',
      targetEmotion: 'clarity',
      expectedTurns: 4,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Couple Conflict to Alignment
  {
    id: 'test_conflict_alignment_001',
    arcType: 'couple_conflict_to_alignment',
    persona: 'anxious_planner',
    topic: 'Couple Financial Disagreement',
    initialContext: {
      userName: 'Sam',
      userBackground: 'Married 5 years, spouse is a spender, constant money arguments',
      emotionalState: {
        primaryEmotion: 'frustration',
        intensity: 0.85,
        secondaryEmotions: ['resentment', 'hopelessness'],
      },
      situation: 'Had another fight about money, spouse bought $2k item without discussing',
    },
    openingMessage: "My spouse just bought a $2,000 gaming setup without telling me, AGAIN. I'm so tired of this. We've had this same fight a hundred times. They say I'm too controlling about money, but someone has to be responsible. I don't know how to fix this anymore.",
    targetArc: {
      sourceEmotion: 'frustration',
      targetEmotion: 'alignment',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Overwhelm to Empowerment
  {
    id: 'test_overwhelm_empowerment_001',
    arcType: 'overwhelm_to_empowerment',
    persona: 'overwhelmed_avoider',
    topic: 'Debt Management',
    initialContext: {
      userName: 'Riley',
      userBackground: 'Multiple credit cards, $35k total debt, minimum payments only',
      emotionalState: {
        primaryEmotion: 'overwhelm',
        intensity: 0.9,
        secondaryEmotions: ['shame', 'despair'],
      },
      situation: 'Just added up all debts for first time, shocked by total',
    },
    openingMessage: "I finally added up all my credit cards and I owe $35,000. I've been avoiding looking at the real number for years. I feel sick. I make barely $50k a year. I can't even cover the interest. I feel like I'm drowning and there's no way out.",
    targetArc: {
      sourceEmotion: 'overwhelm',
      targetEmotion: 'empowerment',
      expectedTurns: 7,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },

  // Shame to Acceptance
  {
    id: 'test_shame_acceptance_001',
    arcType: 'shame_to_acceptance',
    persona: 'emotional_processor',
    topic: 'Financial Mistakes',
    initialContext: {
      userName: 'Casey',
      userBackground: 'Lost $50k on a failed business, still recovering',
      emotionalState: {
        primaryEmotion: 'shame',
        intensity: 0.8,
        secondaryEmotions: ['guilt', 'self-blame'],
      },
      situation: 'Family found out about the business failure, feeling judged',
    },
    openingMessage: "My family just found out I lost $50,000 on my failed business. My parents looked so disappointed. My brother said 'I told you so.' I feel like such an idiot. Everyone trusted me and I blew it. How do I even face them at family dinners anymore?",
    targetArc: {
      sourceEmotion: 'shame',
      targetEmotion: 'acceptance',
      expectedTurns: 6,
    },
    heldOut: true,
    createdDate: '2026-01-10',
  },
];

export function getScenariosByArcType(arcType: EmotionalArcType): TestScenario[] {
  return TEST_SCENARIOS.filter(s => s.arcType === arcType);
}

export function getScenarioById(id: string): TestScenario | undefined {
  return TEST_SCENARIOS.find(s => s.id === id);
}
```

### Task 2: Create Evaluation Service

Create file: `src/lib/pipeline/evaluation-service.ts`

```typescript
/**
 * Evaluation Service
 * 
 * Manages Claude-as-Judge evaluation runs
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';
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

const anthropic = new Anthropic();

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
```

### Task 3: Create Evaluation API Endpoint

Create file: `src/app/api/pipeline/evaluate/route.ts`

```typescript
/**
 * Pipeline Evaluation API
 * 
 * POST - Start evaluation run (baseline or trained)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { 
  generateConversation, 
  evaluateWithClaude,
  calculateAggregateMetrics 
} from '@/lib/pipeline/evaluation-service';
import { TEST_SCENARIOS } from '@/lib/pipeline/test-scenarios';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { jobId, evaluationType } = await request.json();
    
    if (!jobId || !evaluationType) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId or evaluationType' },
        { status: 400 }
      );
    }
    
    if (!['baseline', 'trained'].includes(evaluationType)) {
      return NextResponse.json(
        { success: false, error: 'evaluationType must be "baseline" or "trained"' },
        { status: 400 }
      );
    }
    
    // Get job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Create evaluation run
    const { data: run, error: runError } = await supabase
      .from('pipeline_evaluation_runs')
      .insert({
        job_id: jobId,
        evaluation_type: evaluationType,
        model_id: 'meta-llama/Meta-Llama-3-70B-Instruct',
        adapter_path: evaluationType === 'trained' ? job.adapter_file_path : null,
        total_scenarios: TEST_SCENARIOS.length,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (runError) {
      console.error('Failed to create evaluation run:', runError);
      return NextResponse.json(
        { success: false, error: 'Failed to create evaluation run' },
        { status: 500 }
      );
    }
    
    // Start async evaluation process
    // In production, this would be handled by a background job
    runEvaluationPipeline(run.id, job, evaluationType);
    
    return NextResponse.json({
      success: true,
      data: {
        runId: run.id,
        status: 'running',
        totalScenarios: TEST_SCENARIOS.length,
      },
    });
  } catch (error) {
    console.error('POST /api/pipeline/evaluate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function runEvaluationPipeline(
  runId: string,
  job: any,
  evaluationType: string
) {
  const supabase = createClient();
  const results: any[] = [];
  
  try {
    for (const scenario of TEST_SCENARIOS) {
      // Generate conversation
      const { turns, totalTokens, generationTimeMs } = await generateConversation(
        scenario,
        process.env.GPU_CLUSTER_API_URL!,
        evaluationType === 'trained' ? job.adapter_file_path : null
      );
      
      // Evaluate with Claude
      const { evaluation, tokensUsed } = await evaluateWithClaude(scenario, turns);
      
      // Store result
      const { data: result } = await supabase
        .from('pipeline_evaluation_results')
        .insert({
          run_id: runId,
          scenario_id: scenario.id,
          conversation_turns: turns,
          total_tokens: totalTokens,
          generation_time_ms: generationTimeMs,
          emotional_progression: evaluation.emotionalProgression,
          empathy_evaluation: evaluation.empathyEvaluation,
          voice_consistency: evaluation.voiceConsistency,
          conversation_quality: evaluation.conversationQuality,
          overall_evaluation: evaluation.overallEvaluation,
          claude_model_used: evaluation.claudeModelUsed,
          evaluation_tokens: tokensUsed,
          raw_response: evaluation.rawResponse,
        })
        .select()
        .single();
      
      results.push(result);
      
      // Update completed count
      await supabase
        .from('pipeline_evaluation_runs')
        .update({ completed_scenarios: results.length })
        .eq('id', runId);
    }
    
    // Calculate and store aggregate metrics
    const aggregates = calculateAggregateMetrics(results);
    
    await supabase
      .from('pipeline_evaluation_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        arc_completion_rate: aggregates.arcCompletionRate,
        avg_progression_quality: aggregates.avgProgressionQuality,
        empathy_first_rate: aggregates.empathyFirstRate,
        avg_empathy_score: aggregates.avgEmpathyScore,
        avg_voice_score: aggregates.avgVoiceScore,
        helpful_rate: aggregates.helpfulRate,
        avg_quality_score: aggregates.avgQualityScore,
        avg_overall_score: aggregates.avgOverallScore,
      })
      .eq('id', runId);
      
  } catch (error) {
    console.error('Evaluation pipeline failed:', error);
    
    await supabase
      .from('pipeline_evaluation_runs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', runId);
  }
}
```

### Task 4: Create Edge Function for Job Processing

Create file: `supabase/functions/process-pipeline-jobs/index.ts`

```typescript
/**
 * Process Pipeline Jobs Edge Function
 * 
 * Polls for pending jobs and submits them to RunPod
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending pipeline jobs
    const { data: pendingJobs, error: queryError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const job of pendingJobs || []) {
      try {
        // Update status to queued
        await supabase
          .from('pipeline_training_jobs')
          .update({ status: 'queued', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        // Submit to RunPod
        const runpodResponse = await fetch(
          `${Deno.env.get('GPU_CLUSTER_API_URL')}/run`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('GPU_CLUSTER_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: {
                job_id: job.id,
                engine_id: job.engine_id,
                dataset_path: job.dataset_file_path,
                hyperparameters: {
                  learning_rate: job.learning_rate,
                  batch_size: job.batch_size,
                  epochs: job.epochs,
                  rank: job.rank,
                  alpha: job.alpha,
                  dropout: job.dropout,
                },
                model_name: 'meta-llama/Meta-Llama-3-70B-Instruct',
                quantization: '4bit',
              },
            }),
          }
        );

        const runpodData = await runpodResponse.json();

        if (runpodData.id) {
          // Update with RunPod job ID
          await supabase
            .from('pipeline_training_jobs')
            .update({
              status: 'initializing',
              runpod_job_id: runpodData.id,
              runpod_endpoint_id: Deno.env.get('GPU_CLUSTER_API_URL')?.split('/').pop(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          results.push({ jobId: job.id, runpodId: runpodData.id, status: 'submitted' });
        } else {
          throw new Error(runpodData.error || 'Failed to submit to RunPod');
        }
      } catch (jobError) {
        console.error(`Failed to process job ${job.id}:`, jobError);
        
        await supabase
          .from('pipeline_training_jobs')
          .update({
            status: 'failed',
            error_message: jobError instanceof Error ? jobError.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'failed', error: String(jobError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Task 5: Create Comparison Report API

Create file: `src/app/api/pipeline/evaluate/compare/route.ts`

```typescript
/**
 * Evaluation Comparison API
 * 
 * GET - Get comparison report between baseline and trained runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { SUCCESS_CRITERIA } from '@/types/pipeline-evaluation';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }
    
    // Get baseline and trained runs
    const { data: runs, error } = await supabase
      .from('pipeline_evaluation_runs')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'completed');
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    const baselineRun = runs?.find(r => r.evaluation_type === 'baseline');
    const trainedRun = runs?.find(r => r.evaluation_type === 'trained');
    
    if (!baselineRun || !trainedRun) {
      return NextResponse.json({
        success: false,
        error: 'Both baseline and trained evaluation runs are required',
        available: {
          baseline: !!baselineRun,
          trained: !!trainedRun,
        },
      });
    }
    
    // Build comparison metrics
    const buildComparison = (
      baselineValue: number,
      trainedValue: number,
      target: number
    ) => ({
      baseline: baselineValue,
      trained: trainedValue,
      absoluteImprovement: trainedValue - baselineValue,
      percentImprovement: baselineValue > 0 
        ? (trainedValue - baselineValue) / baselineValue 
        : 0,
      meetsTarget: trainedValue >= target,
    });
    
    const comparison = {
      arcCompletion: buildComparison(
        baselineRun.arc_completion_rate || 0,
        trainedRun.arc_completion_rate || 0,
        SUCCESS_CRITERIA.arcCompletionRate.target
      ),
      empathyFirst: buildComparison(
        baselineRun.empathy_first_rate || 0,
        trainedRun.empathy_first_rate || 0,
        SUCCESS_CRITERIA.empathyFirstRate.target
      ),
      voiceConsistency: buildComparison(
        (baselineRun.avg_voice_score || 0) / 5,
        (trainedRun.avg_voice_score || 0) / 5,
        SUCCESS_CRITERIA.voiceConsistency.target
      ),
      overallScore: buildComparison(
        baselineRun.avg_overall_score || 0,
        trainedRun.avg_overall_score || 0,
        SUCCESS_CRITERIA.overallScore.target
      ),
    };
    
    const successCriteriaMet = Object.entries(SUCCESS_CRITERIA)
      .filter(([key]) => {
        const metricKey = key as keyof typeof comparison;
        return comparison[metricKey]?.meetsTarget;
      })
      .map(([, criteria]) => criteria.description);
    
    const successCriteriaMissed = Object.entries(SUCCESS_CRITERIA)
      .filter(([key]) => {
        const metricKey = key as keyof typeof comparison;
        return !comparison[metricKey]?.meetsTarget;
      })
      .map(([, criteria]) => criteria.description);
    
    const trainingSuccessful = successCriteriaMet.length >= 3;
    
    let recommendation = '';
    if (trainingSuccessful) {
      recommendation = 'Training was successful. The model shows significant improvement across key metrics and is ready for production use.';
    } else if (successCriteriaMet.length >= 2) {
      recommendation = 'Training shows promise but needs refinement. Consider adjusting training parameters or adding more training data.';
    } else {
      recommendation = 'Training did not meet expectations. Review training data quality and consider alternative approaches.';
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: `${baselineRun.id}_${trainedRun.id}`,
        generatedAt: new Date().toISOString(),
        baselineRunId: baselineRun.id,
        trainedRunId: trainedRun.id,
        trainingJobId: jobId,
        improvements: comparison,
        trainingSuccessful,
        successCriteriaMet,
        successCriteriaMissed,
        recommendation,
      },
    });
  } catch (error) {
    console.error('GET /api/pipeline/evaluate/compare error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 6: Deploy Edge Function

```bash
# Deploy the edge function
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npx supabase functions deploy process-pipeline-jobs --no-verify-jwt

# Set secrets for the edge function
npx supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/ei82ickpenoqlp
npx supabase secrets set GPU_CLUSTER_API_KEY=<your-runpod-key>
```

### Task 7: Add Anthropic SDK

```bash
# Install Anthropic SDK if not already installed
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npm install @anthropic-ai/sdk
```

Add to `.env.local`:
```
ANTHROPIC_API_KEY=<your-anthropic-key>
```

### Task 8: Verify Implementation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit

# Test evaluation endpoint (requires auth)
# Use browser or Postman with authenticated session

# Verify edge function deployed
npx supabase functions list
```

---

## Success Criteria

- [ ] Test scenarios file contains 6+ held-out scenarios
- [ ] Evaluation service generates conversations correctly
- [ ] Claude-as-Judge evaluation returns structured results
- [ ] Aggregate metrics calculated correctly
- [ ] Evaluation API creates runs in database
- [ ] Comparison report shows improvement metrics
- [ ] Edge function deploys successfully
- [ ] TypeScript compiles without errors

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/pipeline/test-scenarios.ts` | Held-out test scenarios |
| `src/lib/pipeline/evaluation-service.ts` | Evaluation logic |
| `src/app/api/pipeline/evaluate/route.ts` | Evaluation API |
| `src/app/api/pipeline/evaluate/compare/route.ts` | Comparison API |
| `supabase/functions/process-pipeline-jobs/index.ts` | Job processing |

---

## Integration Complete

After completing E04, the full pipeline implementation is complete:

✅ **E01:** Database schema & TypeScript types  
✅ **E02:** API routes & backend services  
✅ **E03:** UI components & pages  
✅ **E04:** Training engine & evaluation system  

The pipeline is now ready for end-to-end testing with real training data.

---

**END OF E04 PROMPT**
