# Emotional Arc LoRA Training: Claude-as-Judge Evaluation Specification

**Version:** 1.0
**Date:** January 10, 2026
**Purpose:** Complete specification for baseline and post-training evaluation using Claude-as-Judge
**Audience:** Coding agents building the evaluation system
**Prerequisites:** Training engine from companion spec must be implemented

---

## 1. Executive Overview

This specification defines the evaluation system that measures training effectiveness using Claude as an automated judge. The system:

1. **Before Training:** Establishes baseline by running the untrained base model on test scenarios and evaluating with Claude
2. **After Training:** Runs the trained model on the SAME test scenarios and evaluates with Claude
3. **Comparison:** Calculates improvement metrics and determines if training was successful

**Core Principle:** Claude-as-Judge is an industry-standard evaluation pattern. Claude understands emotional nuance better than any custom classifier we could build.

---

## 2. Evaluation Architecture

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVALUATION PIPELINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌───────────────┐    ┌─────────────────┐                │
│  │ Test        │───>│ Conversation  │───>│ Claude-as-Judge │                │
│  │ Scenarios   │    │ Generator     │    │ Evaluator       │                │
│  │ (100+)      │    │               │    │                 │                │
│  └─────────────┘    └───────────────┘    └─────────────────┘                │
│         │                  │                      │                          │
│         │                  │                      ▼                          │
│         │                  │           ┌─────────────────┐                  │
│         │                  │           │ Evaluation      │                  │
│         │                  │           │ Database        │                  │
│         │                  │           └─────────────────┘                  │
│         │                  │                      │                          │
│         │                  ▼                      ▼                          │
│  ┌──────┴──────────────────────────────────────────────┐                    │
│  │                                                      │                    │
│  │  BASELINE RUN           TRAINED RUN                 │                    │
│  │  (Before Training)      (After Training)            │                    │
│  │                                                      │                    │
│  │  Model: Llama 3 70B     Model: Llama 3 70B          │                    │
│  │  Adapter: None          Adapter: Trained LoRA       │                    │
│  │                                                      │                    │
│  └──────────────────────────────────────────────────────┘                   │
│                              │                                               │
│                              ▼                                               │
│                    ┌─────────────────┐                                      │
│                    │ Comparison      │                                      │
│                    │ Report          │                                      │
│                    │ Generator       │                                      │
│                    └─────────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **Test Scenarios** | Held-out evaluation scenarios | JSON file, not used in training |
| **Conversation Generator** | Generate multi-turn conversations with a model | API to base model or trained model |
| **Claude-as-Judge Evaluator** | Evaluate emotional progression | Claude API with structured prompt |
| **Evaluation Database** | Store all results | Supabase tables |
| **Comparison Report Generator** | Calculate improvement metrics | TypeScript module |

---

## 3. Test Scenario Specification

### 3.1 Scenario Schema

```typescript
interface TestScenario {
  id: string;
  arc_type: EmotionalArcType;
  persona: PersonaType;
  topic: string;

  // Initial user state
  initial_context: {
    user_name: string;
    user_background: string;
    emotional_state: {
      primary_emotion: string;
      intensity: number;  // 0.0-1.0
      secondary_emotions: string[];
    };
    situation: string;
  };

  // Opening message from user
  opening_message: string;

  // Expected transformation
  target_arc: {
    source_emotion: string;
    target_emotion: string;
    expected_turns: number;
  };

  // Validation
  held_out: true;  // Must not be in training data
  created_date: string;
}

type EmotionalArcType =
  | 'confusion_to_clarity'
  | 'anxiety_to_confidence'
  | 'shame_to_acceptance'
  | 'couple_conflict_to_alignment'
  | 'overwhelm_to_empowerment'
  | 'grief_to_healing'
  | 'crisis_to_stability';

type PersonaType =
  | 'anxious_planner'
  | 'overwhelmed_avoider'
  | 'pragmatic_optimist'
  | 'skeptical_researcher'
  | 'emotional_processor';
```

### 3.2 Example Test Scenario

```json
{
  "id": "test_001_confusion_clarity",
  "arc_type": "confusion_to_clarity",
  "persona": "anxious_planner",
  "topic": "401k_vs_roth_ira",

  "initial_context": {
    "user_name": "Michael",
    "user_background": "35-year-old software engineer, married, first home buyer. No financial advisor before. Gets investment advice from Reddit.",
    "emotional_state": {
      "primary_emotion": "confusion",
      "intensity": 0.75,
      "secondary_emotions": ["self-doubt", "mild anxiety"]
    },
    "situation": "Has access to employer 401k with match, wondering if should also open Roth IRA"
  },

  "opening_message": "I know this is probably a dumb question but I'm really confused about whether I should put money in my company's 401k or open a Roth IRA. Everyone on Reddit says different things and I feel like I'm the only person who doesn't understand this stuff. My company matches 4% but I don't even know if I'm doing that right.",

  "target_arc": {
    "source_emotion": "confusion",
    "target_emotion": "clarity",
    "expected_turns": 5
  },

  "held_out": true,
  "created_date": "2026-01-10"
}
```

### 3.3 Scenario Distribution Requirements

For statistical validity, the test set must include:

| Requirement | Minimum | Purpose |
|-------------|---------|---------|
| Total scenarios | 100 | Statistical power |
| Per arc type | 14 | Measure each arc independently |
| Per persona type | 20 | Handle different user styles |
| Unique topics | 15 | Avoid topic overfitting |

---

## 4. Conversation Generation

### 4.1 Generator Module

```typescript
// src/lib/evaluation/conversation-generator.ts

interface GeneratedConversation {
  scenario_id: string;
  model_id: string;  // 'baseline' or adapter ID
  turns: ConversationTurn[];
  total_tokens: number;
  generation_time_ms: number;
}

interface ConversationTurn {
  turn_number: number;
  user: {
    content: string;
    simulated: boolean;  // First turn is from scenario, rest simulated
  };
  assistant: {
    content: string;
    generated_at: string;
  };
}

export async function generateConversation(
  scenario: TestScenario,
  modelConfig: ModelConfig,
  maxTurns: number = 6
): Promise<GeneratedConversation> {

  const turns: ConversationTurn[] = [];
  const systemPrompt = buildElenaSystemPrompt();

  // Build initial messages
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: scenario.opening_message }
  ];

  // Generate first assistant response
  const firstResponse = await callModel(modelConfig, messages);
  turns.push({
    turn_number: 1,
    user: { content: scenario.opening_message, simulated: false },
    assistant: { content: firstResponse, generated_at: new Date().toISOString() }
  });

  // Continue conversation for additional turns
  messages.push({ role: 'assistant', content: firstResponse });

  for (let turn = 2; turn <= maxTurns; turn++) {
    // Simulate user response using Claude
    const simulatedUser = await simulateUserResponse(
      scenario,
      messages,
      turn
    );

    messages.push({ role: 'user', content: simulatedUser });

    // Generate assistant response
    const assistantResponse = await callModel(modelConfig, messages);
    messages.push({ role: 'assistant', content: assistantResponse });

    turns.push({
      turn_number: turn,
      user: { content: simulatedUser, simulated: true },
      assistant: { content: assistantResponse, generated_at: new Date().toISOString() }
    });

    // Check if conversation should end naturally
    if (shouldEndConversation(simulatedUser, assistantResponse)) {
      break;
    }
  }

  return {
    scenario_id: scenario.id,
    model_id: modelConfig.id,
    turns,
    total_tokens: countTokens(messages),
    generation_time_ms: Date.now() - startTime
  };
}

async function simulateUserResponse(
  scenario: TestScenario,
  conversationHistory: ChatMessage[],
  turnNumber: number
): Promise<string> {
  /**
   * Use Claude to simulate realistic user responses
   * based on the persona and emotional arc
   */

  const prompt = `You are simulating a user in a financial planning conversation.

USER PROFILE:
- Name: ${scenario.initial_context.user_name}
- Background: ${scenario.initial_context.user_background}
- Starting emotional state: ${scenario.initial_context.emotional_state.primary_emotion}
- Expected arc: ${scenario.target_arc.source_emotion} → ${scenario.target_arc.target_emotion}
- Current turn: ${turnNumber} of ~${scenario.target_arc.expected_turns}

CONVERSATION SO FAR:
${formatConversationHistory(conversationHistory)}

Based on the persona and where they are in the emotional arc, write the next user message. The user should:
- Respond naturally to the advisor's last message
- Show gradual emotional progression appropriate to the turn number
- Stay in character for the persona type: ${scenario.persona}
- Be realistic (not too cooperative, not too difficult)

Write ONLY the user's next message, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}
```

### 4.2 Model Configuration

```typescript
interface ModelConfig {
  id: string;  // 'baseline' or adapter UUID
  type: 'baseline' | 'trained';

  // For baseline: just the base model
  base_model: string;  // 'meta-llama/Meta-Llama-3-70B-Instruct'

  // For trained: base model + adapter
  adapter_path?: string;

  // Generation parameters
  temperature: number;
  max_tokens: number;
  top_p: number;
}

const baselineConfig: ModelConfig = {
  id: 'baseline',
  type: 'baseline',
  base_model: 'meta-llama/Meta-Llama-3-70B-Instruct',
  temperature: 0.7,
  max_tokens: 1024,
  top_p: 0.9
};

function trainedConfig(adapterId: string, adapterPath: string): ModelConfig {
  return {
    id: adapterId,
    type: 'trained',
    base_model: 'meta-llama/Meta-Llama-3-70B-Instruct',
    adapter_path: adapterPath,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9
  };
}
```

---

## 5. Claude-as-Judge Evaluation

### 5.1 Evaluation Prompt

This is the core evaluation prompt that Claude uses to judge each conversation:

```typescript
// src/lib/evaluation/claude-judge.ts

const EVALUATION_PROMPT = `You are an expert evaluator assessing the quality of a financial advisor conversation. Analyze the following conversation and provide structured evaluation.

CONVERSATION:
{conversation}

EXPECTED ARC:
- Starting emotion: {source_emotion}
- Target emotion: {target_emotion}
- User persona: {persona}
- Topic: {topic}

Evaluate the conversation on these dimensions and respond in JSON format:

{
  "emotional_progression": {
    "start_state": {
      "primary_emotion": "<detected starting emotion>",
      "intensity": <0.0-1.0>
    },
    "end_state": {
      "primary_emotion": "<detected ending emotion>",
      "intensity": <0.0-1.0>
    },
    "arc_completed": <true/false>,
    "progression_quality": <1-5>,
    "progression_notes": "<brief explanation>"
  },

  "empathy_evaluation": {
    "emotions_acknowledged": <true/false>,
    "acknowledgment_in_first_sentence": <true/false>,
    "validation_provided": <true/false>,
    "empathy_score": <1-5>,
    "empathy_notes": "<brief explanation>"
  },

  "voice_consistency": {
    "warmth_present": <true/false>,
    "judgment_free": <true/false>,
    "specific_numbers_used": <true/false>,
    "jargon_explained": <true/false>,
    "voice_score": <1-5>,
    "voice_notes": "<brief explanation>"
  },

  "conversation_quality": {
    "helpful_to_user": <true/false>,
    "actionable_guidance": <true/false>,
    "appropriate_depth": <true/false>,
    "natural_flow": <true/false>,
    "quality_score": <1-5>,
    "quality_notes": "<brief explanation>"
  },

  "overall_evaluation": {
    "would_user_feel_helped": <true/false>,
    "overall_score": <1-5>,
    "key_strengths": ["<strength 1>", "<strength 2>"],
    "areas_for_improvement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}

Respond ONLY with valid JSON, no other text.`;
```

### 5.2 Evaluation Implementation

```typescript
// src/lib/evaluation/claude-judge.ts

import Anthropic from '@anthropic-ai/sdk';

interface EvaluationResult {
  conversation_id: string;
  scenario_id: string;
  model_id: string;
  evaluation_timestamp: string;

  // Parsed from Claude's response
  emotional_progression: {
    start_state: { primary_emotion: string; intensity: number };
    end_state: { primary_emotion: string; intensity: number };
    arc_completed: boolean;
    progression_quality: number;
    progression_notes: string;
  };

  empathy_evaluation: {
    emotions_acknowledged: boolean;
    acknowledgment_in_first_sentence: boolean;
    validation_provided: boolean;
    empathy_score: number;
    empathy_notes: string;
  };

  voice_consistency: {
    warmth_present: boolean;
    judgment_free: boolean;
    specific_numbers_used: boolean;
    jargon_explained: boolean;
    voice_score: number;
    voice_notes: string;
  };

  conversation_quality: {
    helpful_to_user: boolean;
    actionable_guidance: boolean;
    appropriate_depth: boolean;
    natural_flow: boolean;
    quality_score: number;
    quality_notes: string;
  };

  overall_evaluation: {
    would_user_feel_helped: boolean;
    overall_score: number;
    key_strengths: string[];
    areas_for_improvement: string[];
    summary: string;
  };

  // Metadata
  claude_model_used: string;
  evaluation_tokens: number;
  raw_response: string;
}

export async function evaluateConversation(
  conversation: GeneratedConversation,
  scenario: TestScenario
): Promise<EvaluationResult> {

  const anthropic = new Anthropic();

  // Format conversation for evaluation
  const formattedConversation = formatConversationForEval(conversation);

  // Build prompt
  const prompt = EVALUATION_PROMPT
    .replace('{conversation}', formattedConversation)
    .replace('{source_emotion}', scenario.target_arc.source_emotion)
    .replace('{target_emotion}', scenario.target_arc.target_emotion)
    .replace('{persona}', scenario.persona)
    .replace('{topic}', scenario.topic);

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const rawResponse = response.content[0].text;

  // Parse JSON response
  const parsed = JSON.parse(rawResponse);

  return {
    conversation_id: conversation.scenario_id + '_' + conversation.model_id,
    scenario_id: conversation.scenario_id,
    model_id: conversation.model_id,
    evaluation_timestamp: new Date().toISOString(),

    ...parsed,

    claude_model_used: 'claude-sonnet-4-20250514',
    evaluation_tokens: response.usage.output_tokens,
    raw_response: rawResponse
  };
}

function formatConversationForEval(conversation: GeneratedConversation): string {
  let formatted = '';

  for (const turn of conversation.turns) {
    formatted += `USER: ${turn.user.content}\n\n`;
    formatted += `ADVISOR: ${turn.assistant.content}\n\n`;
    formatted += '---\n\n';
  }

  return formatted;
}
```

---

## 6. Evaluation Pipeline

### 6.1 Full Evaluation Run

```typescript
// src/lib/evaluation/evaluation-runner.ts

interface EvaluationRun {
  id: string;
  type: 'baseline' | 'trained';
  model_config: ModelConfig;
  adapter_id?: string;  // For trained runs

  // Statistics
  total_scenarios: number;
  completed_scenarios: number;
  failed_scenarios: number;

  // Aggregate results
  aggregate_metrics: AggregateMetrics;

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error?: string;
}

interface AggregateMetrics {
  // Arc completion
  arc_completion_rate: number;  // % of conversations that completed arc
  avg_progression_quality: number;  // 1-5 average

  // Empathy
  empathy_first_rate: number;  // % with empathy in first sentence
  avg_empathy_score: number;  // 1-5 average

  // Voice
  avg_voice_score: number;  // 1-5 average

  // Quality
  helpful_rate: number;  // % where user would feel helped
  avg_quality_score: number;  // 1-5 average

  // Overall
  avg_overall_score: number;  // 1-5 average

  // Per-arc breakdown
  per_arc_metrics: Record<EmotionalArcType, {
    arc_completion_rate: number;
    avg_progression_quality: number;
    sample_count: number;
  }>;
}

export async function runEvaluation(
  scenarios: TestScenario[],
  modelConfig: ModelConfig
): Promise<EvaluationRun> {

  const run: EvaluationRun = {
    id: generateId(),
    type: modelConfig.type,
    model_config: modelConfig,
    adapter_id: modelConfig.type === 'trained' ? modelConfig.id : undefined,
    total_scenarios: scenarios.length,
    completed_scenarios: 0,
    failed_scenarios: 0,
    status: 'running',
    started_at: new Date().toISOString(),
    aggregate_metrics: null
  };

  // Store run in database
  await saveEvaluationRun(run);

  const results: EvaluationResult[] = [];

  for (const scenario of scenarios) {
    try {
      // 1. Generate conversation
      const conversation = await generateConversation(
        scenario,
        modelConfig,
        6  // max turns
      );

      // 2. Evaluate with Claude
      const evaluation = await evaluateConversation(conversation, scenario);

      // 3. Store results
      await saveEvaluationResult(run.id, evaluation);

      results.push(evaluation);
      run.completed_scenarios++;

    } catch (error) {
      console.error(`Failed scenario ${scenario.id}:`, error);
      run.failed_scenarios++;
    }

    // Update progress
    await updateEvaluationRunProgress(run);
  }

  // Calculate aggregate metrics
  run.aggregate_metrics = calculateAggregateMetrics(results);
  run.status = 'completed';
  run.completed_at = new Date().toISOString();

  await saveEvaluationRun(run);

  return run;
}

function calculateAggregateMetrics(results: EvaluationResult[]): AggregateMetrics {

  const arcCompletedCount = results.filter(r => r.emotional_progression.arc_completed).length;
  const empathyFirstCount = results.filter(r => r.empathy_evaluation.acknowledgment_in_first_sentence).length;
  const helpfulCount = results.filter(r => r.overall_evaluation.would_user_feel_helped).length;

  // Calculate per-arc metrics
  const perArc: Record<string, { completed: number; quality: number[]; count: number }> = {};

  for (const result of results) {
    // Need to get arc type from scenario - would need to join with scenario data
    // For now, assuming we track this in the result
  }

  return {
    arc_completion_rate: arcCompletedCount / results.length,
    avg_progression_quality: average(results.map(r => r.emotional_progression.progression_quality)),

    empathy_first_rate: empathyFirstCount / results.length,
    avg_empathy_score: average(results.map(r => r.empathy_evaluation.empathy_score)),

    avg_voice_score: average(results.map(r => r.voice_consistency.voice_score)),

    helpful_rate: helpfulCount / results.length,
    avg_quality_score: average(results.map(r => r.conversation_quality.quality_score)),

    avg_overall_score: average(results.map(r => r.overall_evaluation.overall_score)),

    per_arc_metrics: {} // Populated per-arc
  };
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
```

---

## 7. Comparison Report Generation

### 7.1 Comparison Module

```typescript
// src/lib/evaluation/comparison-report.ts

interface ComparisonReport {
  id: string;
  generated_at: string;

  // Run references
  baseline_run_id: string;
  trained_run_id: string;
  training_job_id: string;

  // Improvement metrics
  improvements: {
    arc_completion: {
      baseline: number;
      trained: number;
      absolute_improvement: number;  // trained - baseline
      percent_improvement: number;   // (trained - baseline) / baseline * 100
      meets_target: boolean;         // >= 40%
    };

    empathy_first: {
      baseline: number;
      trained: number;
      absolute_improvement: number;
      percent_improvement: number;
      meets_target: boolean;  // >= 85%
    };

    voice_consistency: {
      baseline: number;
      trained: number;
      absolute_improvement: number;
      percent_improvement: number;
      meets_target: boolean;  // >= 90%
    };

    overall_score: {
      baseline: number;
      trained: number;
      absolute_improvement: number;
      percent_improvement: number;
    };

    helpful_rate: {
      baseline: number;
      trained: number;
      absolute_improvement: number;
      percent_improvement: number;
    };
  };

  // Per-arc breakdown
  per_arc_improvements: Record<EmotionalArcType, {
    baseline_completion: number;
    trained_completion: number;
    improvement: number;
  }>;

  // Statistical significance
  statistical_tests: {
    arc_completion_ttest: {
      t_statistic: number;
      p_value: number;
      significant: boolean;  // p < 0.05
    };
    overall_score_ttest: {
      t_statistic: number;
      p_value: number;
      significant: boolean;
    };
  };

  // Overall assessment
  training_successful: boolean;
  success_criteria_met: string[];
  success_criteria_missed: string[];
  recommendation: string;

  // Example comparisons (for client report)
  example_comparisons: Array<{
    scenario_id: string;
    arc_type: string;
    baseline_conversation: string;
    trained_conversation: string;
    baseline_eval: EvaluationResult;
    trained_eval: EvaluationResult;
  }>;
}

export async function generateComparisonReport(
  baselineRun: EvaluationRun,
  trainedRun: EvaluationRun,
  trainingJobId: string
): Promise<ComparisonReport> {

  const baseline = baselineRun.aggregate_metrics;
  const trained = trainedRun.aggregate_metrics;

  // Calculate improvements
  const improvements = {
    arc_completion: calculateImprovement(
      baseline.arc_completion_rate,
      trained.arc_completion_rate,
      0.40  // 40% improvement target
    ),
    empathy_first: calculateImprovement(
      baseline.empathy_first_rate,
      trained.empathy_first_rate,
      0.85  // 85% absolute target
    ),
    voice_consistency: calculateImprovement(
      baseline.avg_voice_score / 5,
      trained.avg_voice_score / 5,
      0.90  // 90% target
    ),
    overall_score: calculateImprovement(
      baseline.avg_overall_score,
      trained.avg_overall_score
    ),
    helpful_rate: calculateImprovement(
      baseline.helpful_rate,
      trained.helpful_rate
    )
  };

  // Statistical tests
  const baselineResults = await getEvaluationResults(baselineRun.id);
  const trainedResults = await getEvaluationResults(trainedRun.id);

  const arcTTest = tTest(
    baselineResults.map(r => r.emotional_progression.arc_completed ? 1 : 0),
    trainedResults.map(r => r.emotional_progression.arc_completed ? 1 : 0)
  );

  const scoreTTest = tTest(
    baselineResults.map(r => r.overall_evaluation.overall_score),
    trainedResults.map(r => r.overall_evaluation.overall_score)
  );

  // Determine success
  const successCriteriaMet: string[] = [];
  const successCriteriaMissed: string[] = [];

  if (improvements.arc_completion.percent_improvement >= 40) {
    successCriteriaMet.push('Arc completion improved ≥40%');
  } else {
    successCriteriaMissed.push(`Arc completion improved ${improvements.arc_completion.percent_improvement.toFixed(1)}% (target: 40%)`);
  }

  if (trained.empathy_first_rate >= 0.85) {
    successCriteriaMet.push('Empathy-first rate ≥85%');
  } else {
    successCriteriaMissed.push(`Empathy-first rate ${(trained.empathy_first_rate * 100).toFixed(1)}% (target: 85%)`);
  }

  if (arcTTest.p_value < 0.05) {
    successCriteriaMet.push('Statistically significant improvement (p < 0.05)');
  } else {
    successCriteriaMissed.push(`Not statistically significant (p = ${arcTTest.p_value.toFixed(3)})`);
  }

  const trainingSuccessful = successCriteriaMet.length >= 2 && arcTTest.p_value < 0.05;

  return {
    id: generateId(),
    generated_at: new Date().toISOString(),
    baseline_run_id: baselineRun.id,
    trained_run_id: trainedRun.id,
    training_job_id: trainingJobId,

    improvements,
    per_arc_improvements: calculatePerArcImprovements(baseline, trained),

    statistical_tests: {
      arc_completion_ttest: {
        t_statistic: arcTTest.t,
        p_value: arcTTest.p_value,
        significant: arcTTest.p_value < 0.05
      },
      overall_score_ttest: {
        t_statistic: scoreTTest.t,
        p_value: scoreTTest.p_value,
        significant: scoreTTest.p_value < 0.05
      }
    },

    training_successful: trainingSuccessful,
    success_criteria_met: successCriteriaMet,
    success_criteria_missed: successCriteriaMissed,
    recommendation: generateRecommendation(trainingSuccessful, successCriteriaMet, successCriteriaMissed),

    example_comparisons: await selectExampleComparisons(baselineResults, trainedResults, 5)
  };
}

function calculateImprovement(baseline: number, trained: number, target?: number) {
  const absolute = trained - baseline;
  const percent = baseline > 0 ? (absolute / baseline) * 100 : 0;

  return {
    baseline,
    trained,
    absolute_improvement: absolute,
    percent_improvement: percent,
    meets_target: target ? (target < 1 ? percent >= target * 100 : trained >= target) : undefined
  };
}

function generateRecommendation(
  successful: boolean,
  met: string[],
  missed: string[]
): string {
  if (successful) {
    return `Training successful. The model shows statistically significant improvement across key metrics. Recommend proceeding to production deployment.`;
  } else if (met.length >= 1) {
    return `Training partially successful. Consider: (1) Increasing training data, (2) Adjusting hyperparameters, or (3) Reviewing data quality for underperforming arcs.`;
  } else {
    return `Training did not achieve target improvements. Recommend investigating data quality, reviewing training configuration, and potentially adding more diverse training examples.`;
  }
}
```

---

## 8. Database Schema

### 8.1 Evaluation Tables

```sql
-- Test scenarios (held out for evaluation)
CREATE TABLE test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_type TEXT NOT NULL,
  persona TEXT NOT NULL,
  topic TEXT NOT NULL,
  initial_context JSONB NOT NULL,
  opening_message TEXT NOT NULL,
  target_arc JSONB NOT NULL,
  held_out BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluation runs (baseline or trained)
CREATE TABLE evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('baseline', 'trained')),
  model_config JSONB NOT NULL,
  adapter_id UUID REFERENCES adapters(id),

  -- Statistics
  total_scenarios INTEGER NOT NULL,
  completed_scenarios INTEGER DEFAULT 0,
  failed_scenarios INTEGER DEFAULT 0,

  -- Aggregate metrics (computed after completion)
  aggregate_metrics JSONB,

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual evaluation results
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id),
  scenario_id UUID NOT NULL REFERENCES test_scenarios(id),

  -- Generated conversation
  conversation JSONB NOT NULL,

  -- Claude's evaluation
  emotional_progression JSONB NOT NULL,
  empathy_evaluation JSONB NOT NULL,
  voice_consistency JSONB NOT NULL,
  conversation_quality JSONB NOT NULL,
  overall_evaluation JSONB NOT NULL,

  -- Metadata
  claude_model_used TEXT,
  evaluation_tokens INTEGER,
  raw_response TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comparison reports
CREATE TABLE comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_run_id UUID NOT NULL REFERENCES evaluation_runs(id),
  trained_run_id UUID NOT NULL REFERENCES evaluation_runs(id),
  training_job_id UUID NOT NULL REFERENCES training_jobs(id),

  -- Computed metrics
  improvements JSONB NOT NULL,
  per_arc_improvements JSONB NOT NULL,
  statistical_tests JSONB NOT NULL,

  -- Assessment
  training_successful BOOLEAN NOT NULL,
  success_criteria_met TEXT[] NOT NULL,
  success_criteria_missed TEXT[] NOT NULL,
  recommendation TEXT NOT NULL,

  -- Example comparisons
  example_comparisons JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evaluation_results_run ON evaluation_results(evaluation_run_id);
CREATE INDEX idx_evaluation_results_scenario ON evaluation_results(scenario_id);
CREATE INDEX idx_comparison_reports_job ON comparison_reports(training_job_id);
```

---

## 9. API Endpoints

### 9.1 Evaluation Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/evaluation/scenarios` | GET | List all test scenarios |
| `/api/evaluation/scenarios` | POST | Create new test scenario |
| `/api/evaluation/runs` | GET | List all evaluation runs |
| `/api/evaluation/runs/baseline` | POST | Start baseline evaluation run |
| `/api/evaluation/runs/trained` | POST | Start trained model evaluation run |
| `/api/evaluation/runs/{runId}` | GET | Get evaluation run status and results |
| `/api/evaluation/compare` | POST | Generate comparison report |
| `/api/evaluation/reports/{reportId}` | GET | Get comparison report |

### 9.2 Endpoint Implementation Example

```typescript
// src/app/api/evaluation/runs/baseline/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runEvaluation } from '@/lib/evaluation/evaluation-runner';

export async function POST(request: NextRequest) {
  try {
    const { baseModel } = await request.json();

    const supabase = createClient();

    // 1. Fetch all test scenarios
    const { data: scenarios, error: scenarioError } = await supabase
      .from('test_scenarios')
      .select('*')
      .eq('held_out', true);

    if (scenarioError) throw scenarioError;

    // 2. Create model config
    const modelConfig: ModelConfig = {
      id: 'baseline',
      type: 'baseline',
      base_model: baseModel || 'meta-llama/Meta-Llama-3-70B-Instruct',
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9
    };

    // 3. Run evaluation (this is async and updates DB as it progresses)
    const evaluationRun = await runEvaluation(scenarios, modelConfig);

    return NextResponse.json({
      success: true,
      runId: evaluationRun.id,
      totalScenarios: scenarios.length
    });

  } catch (error) {
    console.error('Baseline evaluation error:', error);
    return NextResponse.json({ error: 'Failed to start evaluation' }, { status: 500 });
  }
}
```

---

## 10. Complete Evaluation Workflow

### 10.1 Pre-Training Workflow

```typescript
// Execute before training begins

async function runPreTrainingEvaluation() {
  // 1. Verify test scenarios exist
  const scenarios = await loadTestScenarios();
  if (scenarios.length < 100) {
    throw new Error(`Need 100+ scenarios, have ${scenarios.length}`);
  }

  // 2. Run baseline evaluation
  const baselineRun = await runEvaluation(scenarios, baselineConfig);

  // 3. Wait for completion
  while (baselineRun.status !== 'completed') {
    await sleep(10000);  // Check every 10 seconds
    await refreshRunStatus(baselineRun);
  }

  // 4. Store baseline run ID for later comparison
  return baselineRun.id;
}
```

### 10.2 Post-Training Workflow

```typescript
// Execute after training completes

async function runPostTrainingEvaluation(
  trainingJobId: string,
  adapterPath: string,
  baselineRunId: string
) {
  // 1. Load same test scenarios
  const scenarios = await loadTestScenarios();

  // 2. Create trained model config
  const trainedConfig: ModelConfig = {
    id: trainingJobId,
    type: 'trained',
    base_model: 'meta-llama/Meta-Llama-3-70B-Instruct',
    adapter_path: adapterPath,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9
  };

  // 3. Run trained evaluation
  const trainedRun = await runEvaluation(scenarios, trainedConfig);

  // 4. Wait for completion
  while (trainedRun.status !== 'completed') {
    await sleep(10000);
    await refreshRunStatus(trainedRun);
  }

  // 5. Load baseline run
  const baselineRun = await loadEvaluationRun(baselineRunId);

  // 6. Generate comparison report
  const report = await generateComparisonReport(
    baselineRun,
    trainedRun,
    trainingJobId
  );

  // 7. Update training job with results
  await updateTrainingJobWithEvaluation(trainingJobId, report);

  return report;
}
```

---

## 11. Implementation Checklist

### Phase 1: Test Scenarios (Day 1)
- [ ] Create `test_scenarios` table in Supabase
- [ ] Create 100+ test scenarios covering all arcs
- [ ] Implement scenario management API endpoints
- [ ] Validate scenario distribution

### Phase 2: Conversation Generator (Days 1-2)
- [ ] Implement `conversation-generator.ts`
- [ ] Implement user simulation with Claude
- [ ] Test with both baseline and (placeholder) trained models
- [ ] Handle errors gracefully

### Phase 3: Claude-as-Judge (Days 2-3)
- [ ] Implement `claude-judge.ts` with evaluation prompt
- [ ] Test JSON parsing reliability
- [ ] Handle edge cases (empty responses, malformed JSON)
- [ ] Tune evaluation prompt for consistency

### Phase 4: Evaluation Pipeline (Days 3-4)
- [ ] Implement `evaluation-runner.ts`
- [ ] Create evaluation database tables
- [ ] Implement aggregate metrics calculation
- [ ] Build progress tracking

### Phase 5: Comparison Reports (Days 4-5)
- [ ] Implement `comparison-report.ts`
- [ ] Add statistical tests (t-test)
- [ ] Generate recommendation logic
- [ ] Create example selection

### Phase 6: API & Integration (Day 5)
- [ ] Build all evaluation API endpoints
- [ ] Integrate with training job workflow
- [ ] Connect to UI
- [ ] End-to-end testing

---

## 12. Success Criteria

| Metric | Target |
|--------|--------|
| Test scenario coverage | 100+ scenarios, 14+ per arc |
| Evaluation consistency | Same scenario = same evaluation ±0.5 points |
| Evaluation time | < 2 minutes per scenario |
| Full run time | < 4 hours for 100 scenarios |
| Claude API cost per run | < $20 |
| Statistical power | p < 0.05 for 20%+ true improvement |

---

## 13. Cost Estimation

| Component | Per Scenario | Per Run (100 scenarios) |
|-----------|--------------|-------------------------|
| User simulation (Claude Sonnet) | ~$0.02 | ~$2.00 |
| Model generation (RunPod) | ~$0.05 | ~$5.00 |
| Claude-as-Judge evaluation | ~$0.03 | ~$3.00 |
| **Total** | ~$0.10 | ~$10.00 |

For baseline + trained runs: **~$20 per training job evaluation**

---

**Document Status:** Complete Claude-as-Judge Specification
**Version:** 1.0
**Next Step:** Implement according to checklist, then integrate with training engine
