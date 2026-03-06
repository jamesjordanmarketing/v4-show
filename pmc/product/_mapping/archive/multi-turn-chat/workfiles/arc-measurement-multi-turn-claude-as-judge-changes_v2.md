# Multi-Turn Arc-Aware Claude-as-Judge Evaluation Specification

**Version:** 2.0  
**Date:** January 28, 2026  
**Author:** Planning Agent  
**Purpose:** Complete implementation specification for arc-aware evaluation in multi-turn conversations, measuring actual human emotional state progression across turns

---

## Executive Summary

This specification extends the Claude-as-Judge evaluation system to support **multi-turn conversations** with a fundamentally different measurement approach:

| Aspect | Single-Turn (v1) | Multi-Turn (v2) |
|--------|------------------|-----------------|
| **What is measured** | Projected user emotion based on model response | **Actual** user emotion based on human's reply |
| **Data source** | Model's answer only | Human's reply text in each turn |
| **Progression** | Start state → Projected end state | Start state → Actual state → Actual state → ... |
| **Arc completion** | Inferred from single response | Measured across actual human progression |

> [!IMPORTANT]
> **Key Insight:** In single-turn, we can only *project* what the human would feel. In multi-turn, **the human tells us** how they feel by continuing the conversation. This is measurable emotional progression.

---

## Table of Contents

1. [Background & Rationale](#1-background--rationale)
2. [Multi-Turn Measurement Methodology](#2-multi-turn-measurement-methodology)
3. [New Evaluation Prompt Design](#3-new-evaluation-prompt-design)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Service Layer Changes](#5-service-layer-changes)
6. [API Route Changes](#6-api-route-changes)
7. [UI Component Changes](#7-ui-component-changes)
8. [Type System Updates](#8-type-system-updates)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Verification Plan](#10-verification-plan)

---

## 1. Background & Rationale

### 1.1 What Changed

The single-turn arc-aware evaluator (v1) was implemented successfully. However, it can only **infer** emotional states:

```
User: "I'm embarrassed I have no savings at 45"
Model: "That takes courage to share..."
Claude-as-Judge: "User probably feels validated after reading this"  ← INFERENCE
```

In multi-turn, the human's **next message reveals their actual state**:

```
Turn 1:
  User: "I'm embarrassed I have no savings at 45"
  Model: "That takes courage to share..."

Turn 2:
  User: "I never thought of it that way. I've always felt so ashamed."
  ← THIS IS ACTUAL DATA about emotional state
```

### 1.2 Design Philosophy

Key principles (retained from v1):
1. **Disclose, don't dictate** — Provide arc context but let Claude decide
2. **Directional improvement** — Measure if user moved "toward a better state" rather than semantic closeness
3. **Preserve existing functionality** — Single-turn evaluators remain unchanged

New principle for multi-turn:
4. **Measure actual human responses** — Each turn's human message is the ground truth for their current emotional state

### 1.3 Scope

This specification covers:
- New database-stored **Multi-Turn Arc-Aware** evaluation prompt
- Per-turn evaluation in the multi-turn chat module
- Cumulative arc progression tracking
- UI evaluator dropdown in multi-turn chat

This specification does NOT cover:
- Changes to single-turn evaluation (that remains unchanged)
- Multi-turn chat module implementation (see: `multi-turn-chat-specification_v2.md`)

---

## 2. Multi-Turn Measurement Methodology

### 2.1 The Measurement Model

Each turn in a multi-turn conversation provides two pieces of data:

1. **Human's message** — Ground truth for their current emotional state
2. **Model's response** — What we're evaluating for quality

The evaluator assesses:
- The human's **actual** emotional state (from their message)
- How the model's response **facilitated or hindered** emotional movement
- Whether the trajectory is moving toward arc completion

### 2.2 Turn-by-Turn Measurement

```
Turn 1:
  Human: "I'm so overwhelmed by all these financial decisions"
  └─ Measured: { emotion: "overwhelm", intensity: 0.9, valence: negative }
  
  Model: "I hear how overwhelming this feels. Let's focus on just one priority..."
  └─ Evaluated: Did this response facilitate movement?

Turn 2:
  Human: "That helps. I think the credit card debt is what keeps me up at night"
  └─ Measured: { emotion: "fear+relief", intensity: 0.7, valence: mixed }
  
  Movement: overwhelm (0.9) → fear+relief (0.7) = IMPROVED

Turn 3:
  Human: "OK so if I focus on the highest interest first, I can do this"
  └─ Measured: { emotion: "determination", intensity: 0.5, valence: positive }
  
  Movement: fear+relief (0.7) → determination (0.5) = IMPROVED
  Arc Status: overwhelm → empowerment trajectory = ON TRACK
```

### 2.3 Measurement Dimensions

For each turn, the evaluator measures:

| Dimension | What It Measures | Source Data |
|-----------|------------------|-------------|
| **Current State** | Human's emotional state from their message | Human's turn message |
| **Valence Shift** | Did human move toward positive since last turn? | Comparison to previous turn |
| **Intensity Change** | Did distressing emotion intensity decrease? | Comparison to previous turn |
| **Arc Alignment** | Does trajectory match a known therapeutic arc? | All turns so far |
| **Facilitation Quality** | How well did model's previous response help? | Model's last response |

### 2.4 The "End State" Concept

> [!NOTE]
> **Per user requirement:** Each turn is evaluated as if it is the current "end state." No intermediate states are implemented in v2.0.

This means:
- Turn 1: Human's message is starting state AND end state
- Turn 2: Human's message is the new end state
- Turn 3: Human's message is the new end state
- ... and so on

The **cumulative arc progression** is measured by comparing current state to the **original starting state** (Turn 1).

### 2.5 Known Emotional Arcs

Same arcs as single-turn (from `prompt_templates` table):

| Arc Key | Arc Name | Multi-Turn Expectation |
|---------|----------|------------------------|
| `confusion_to_clarity` | Confusion → Clarity | Human's messages show increasing clarity |
| `shame_to_acceptance` | Shame → Acceptance | Human's messages show decreasing shame, increasing acceptance |
| `fear_to_confidence` | Anxiety → Confidence | Human's messages show decreasing anxiety, increasing confidence |
| `overwhelm_to_empowerment` | Overwhelm → Empowerment | Human's messages show decreasing overwhelm, increasing agency |
| `grief_to_healing` | Grief/Loss → Healing | Human's messages show grief processing, hope emerging |
| `couple_conflict_to_alignment` | Conflict → Alignment | Human's messages show decreasing conflict, increasing partnership |
| `emergency_to_calm` | Emergency → Calm | Human's messages show decreasing panic, increasing stability |

---

## 3. New Evaluation Prompt Design

### 3.1 New Prompt: `multi_turn_arc_aware_v1`

This is a **new** evaluation prompt added to `evaluation_prompts` table, specifically designed for multi-turn context.

```sql
INSERT INTO public.evaluation_prompts (name, display_name, description, prompt_template, includes_arc_context, is_default, version)
VALUES (
  'multi_turn_arc_aware_v1',
  'Multi-Turn Arc-Aware Evaluator (v1)',
  'Evaluates human emotional progression across multi-turn conversations. Measures actual emotional state from human messages, not projections.',
  E'[PROMPT TEMPLATE - SEE SECTION 3.2]',
  true,  -- includes arc context
  false, -- not the default (single-turn remains default)
  1
);
```

### 3.2 Complete Prompt Template

```text
You are an expert evaluator specializing in therapeutic communication and emotional intelligence. You are analyzing a MULTI-TURN conversation to measure the human's actual emotional progression.

## CONTEXT: KNOWN EMOTIONAL ARCS

This advisor was trained to facilitate the following emotional transitions:

{emotional_arcs}

These arcs represent healthy emotional progressions in financial conversations.

## CONVERSATION HISTORY

Turn Count: {turn_count}

{conversation_history}

## CURRENT TURN TO EVALUATE

HUMAN'S MESSAGE (Turn {current_turn}):
{user_message}

ADVISOR'S RESPONSE:
{response}

## EVALUATION TASK

You have TWO distinct tasks:

### Task 1: Measure the Human's ACTUAL Emotional State

Analyze the human's message to determine their ACTUAL emotional state right now. This is ground truth data, not a projection. Look for:
- Explicit emotional language ("I feel...", "This is scary...")
- Implicit emotional indicators (hesitation, relief, frustration)
- Emotional intensity markers (qualifiers, emphasis, length)
- Valence indicators (positive vs negative framing)

### Task 2: Evaluate the Advisor's Facilitation

Assess how well the advisor's response helps the human move toward a healthier emotional state. Consider:
- Did it acknowledge the human's emotions?
- Did it create movement or stagnation?
- Was the movement in a healthy direction?

## IMPORTANT CONTEXT

{previous_evaluation_summary}

## RESPONSE FORMAT

Respond in JSON format:

{
  "humanEmotionalState": {
    "turnNumber": {current_turn},
    "primaryEmotion": "<detected primary emotion from human's message>",
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
    "detectedArc": "<arc_key if trajectory matches, or 'none'>",
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
    "summary": "<one paragraph assessment of this turn's contribution to arc progression>"
  }
}

Respond ONLY with valid JSON, no other text.
```

### 3.3 Placeholder Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `{emotional_arcs}` | Formatted list of arcs from `prompt_templates` | `getEmotionalArcsContext()` |
| `{turn_count}` | Total turns in conversation | `conversation.turn_count` |
| `{conversation_history}` | All previous turns formatted | Built from `conversation_turns` |
| `{current_turn}` | Current turn number | `turn.turn_number` |
| `{user_message}` | Human's message this turn | `turn.user_message` |
| `{response}` | Model's response this turn | `turn.control_response` or `turn.adapted_response` |
| `{previous_evaluation_summary}` | Summary of last turn's evaluation | Built from previous evaluation JSON |

### 3.4 Conversation History Format

```text
--- Turn 1 ---
HUMAN: {user_message_1}
ADVISOR (Control): {control_response_1}
ADVISOR (Adapted): {adapted_response_1}
EVALUATION: Human showed {emotion} at intensity {intensity}

--- Turn 2 ---
HUMAN: {user_message_2}
...
```

---

## 4. Database Schema Changes

### 4.1 Modify Table: `conversation_turns`

Add columns to track multi-turn arc evaluation:

```sql
-- Migration: Add multi-turn arc evaluation columns to conversation_turns
ALTER TABLE public.conversation_turns
  ADD COLUMN IF NOT EXISTS evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id),
  ADD COLUMN IF NOT EXISTS human_emotional_state JSONB,
  ADD COLUMN IF NOT EXISTS arc_progression JSONB;

-- Index for evaluator filtering
CREATE INDEX IF NOT EXISTS idx_conversation_turns_evaluator 
  ON public.conversation_turns(evaluation_prompt_id);

COMMENT ON COLUMN public.conversation_turns.human_emotional_state IS 
  'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';

COMMENT ON COLUMN public.conversation_turns.arc_progression IS 
  'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';
```

### 4.2 Seed Data: Add New Evaluator

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
  E'[FULL PROMPT FROM SECTION 3.2]',
  true,
  false,  -- Not default - let users choose explicitly
  'claude-sonnet-4-20250514',
  3000,   -- Higher token limit for multi-turn context
  true
)
ON CONFLICT (name) DO NOTHING;
```

### 4.3 Migration File Location

Create migration file:
```
supa-agent-ops/migrations/YYYYMMDD_add_multi_turn_arc_evaluation.sql
```

---

## 5. Service Layer Changes

### 5.1 File: `conversation-service.ts`

#### 5.1.1 New Import

Add at top of file:
```typescript
import { 
  getEvaluationPrompt, 
  getEmotionalArcsContext 
} from './test-service';
```

#### 5.1.2 New Function: `buildConversationHistoryContext`

Add after existing helper functions:

```typescript
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
```

#### 5.1.3 New Function: `buildPreviousEvaluationSummary`

```typescript
/**
 * Build summary of previous turn's evaluation for context
 */
function buildPreviousEvaluationSummary(
  previousTurn: ConversationTurn | null
): string {
  if (!previousTurn || !previousTurn.humanEmotionalState) {
    return 'This is the first turn being evaluated. No previous evaluation data.';
  }
  
  const state = previousTurn.humanEmotionalState as any;
  const arc = previousTurn.arcProgression as any;
  
  return `Previous turn (Turn ${previousTurn.turnNumber}):
- Human's emotional state: ${state.primaryEmotion} (intensity: ${state.intensity}, valence: ${state.valence})
- Arc detected: ${arc?.detectedArc || 'none'}
- Arc progress: ${arc?.progressionPercentage || 0}%
${arc?.onTrack ? '- Status: On track for arc completion' : '- Status: Not currently on a clear arc trajectory'}`;
}
```

#### 5.1.4 New Function: `evaluateTurnWithMultiTurnContext`

```typescript
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
  humanEmotionalState: any;
  arcProgression: any;
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
    .replace('{current_turn}', String(currentTurn.turnNumber))
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
```

#### 5.1.5 Modify Function: `addTurn`

Update the evaluation block in `addTurn` to use multi-turn evaluation when appropriate:

```typescript
// In addTurn function, after both responses are received...

// If evaluation is enabled and both responses succeeded
if (
  request.enableEvaluation &&
  controlResult.status === 'fulfilled' &&
  adaptedResult.status === 'fulfilled'
) {
  try {
    // Check if using multi-turn evaluator
    const isMultiTurnEvaluator = request.evaluationPromptId && 
      (await isMultiTurnEvaluatorPrompt(request.evaluationPromptId));
    
    if (isMultiTurnEvaluator) {
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
      updateData.evaluation_prompt_id = request.evaluationPromptId;
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
      updateData.evaluation_prompt_id = request.evaluationPromptId;
    }
    
    updateData.status = 'completed';
    updateData.completed_at = new Date().toISOString();
  } catch (evalError) {
    console.error('Evaluation failed:', evalError);
    // Continue without evaluation - don't fail the turn
  }
}
```

#### 5.1.6 New Helper Functions

```typescript
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
 * Compare multi-turn evaluations between control and adapted
 */
function compareMultiTurnEvaluations(
  controlEval: any,
  adaptedEval: any
): any {
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
```

---

## 6. API Route Changes

### 6.1 No New Routes Required

The multi-turn chat API routes already accept `evaluationPromptId` in the `AddTurnRequest`. No new routes are needed.

The existing route `/api/pipeline/evaluators` will automatically include the new `multi_turn_arc_aware_v1` evaluator after the seed data is inserted.

---

## 7. UI Component Changes

### 7.1 File: `ChatInput.tsx` (Multi-Turn Chat Component)

Add evaluator selection dropdown:

```tsx
// In ChatInput.tsx or wherever the chat input is defined

import { useEvaluators } from '@/hooks';

// Inside component:
const { data: evaluatorsData } = useEvaluators();
const evaluators = evaluatorsData?.data || [];
const [selectedEvaluator, setSelectedEvaluator] = useState<string | undefined>();

// Add dropdown near the evaluation toggle:
{enableEvaluation && (
  <Select
    value={selectedEvaluator}
    onValueChange={setSelectedEvaluator}
  >
    <SelectTrigger className="w-[250px]">
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
```

### 7.2 Arc Progression Visualization

Add a visual indicator showing arc progression:

```tsx
// New component: ArcProgressionBar.tsx

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
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{arcName}</span>
        <span className={onTrack ? 'text-green-600' : 'text-yellow-600'}>
          {onTrack ? 'On track' : 'Off track'}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${onTrack ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${progressionPercentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {progressionPercentage}% complete
      </div>
    </div>
  );
}
```

### 7.3 Turn Evaluation Display

Show human emotional state per turn:

```tsx
// In ChatTurn.tsx or DualResponsePanel.tsx

{turn.humanEmotionalState && (
  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
    <div className="font-medium text-blue-700">Human Emotional State</div>
    <div className="text-blue-600">
      {turn.humanEmotionalState.primaryEmotion} 
      ({turn.humanEmotionalState.valence}, intensity: {turn.humanEmotionalState.intensity})
    </div>
  </div>
)}

{turn.arcProgression && (
  <ArcProgressionBar 
    arcName={turn.arcProgression.detectedArc}
    progressionPercentage={turn.arcProgression.progressionPercentage}
    onTrack={turn.arcProgression.onTrack}
  />
)}
```

---

## 8. Type System Updates

### 8.1 File: `conversation.ts`

Add new types:

```typescript
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
```

### 8.2 Update `ConversationTurn` Interface

```typescript
export interface ConversationTurn {
  // ... existing fields ...
  
  // Multi-turn arc evaluation (NEW)
  evaluationPromptId: string | null;
  humanEmotionalState: HumanEmotionalState | null;
  arcProgression: ArcProgression | null;
}
```

---

## 9. Implementation Checklist

### Phase 1: Database Setup
- [ ] Create migration file for new columns on `conversation_turns`
- [ ] Insert seed data for `multi_turn_arc_aware_v1` evaluator
- [ ] Run migrations in Supabase Dashboard
- [ ] Verify evaluator appears in `evaluation_prompts` table

### Phase 2: Service Layer
- [ ] Add `buildConversationHistoryContext` helper function
- [ ] Add `buildPreviousEvaluationSummary` helper function
- [ ] Add `evaluateTurnWithMultiTurnContext` function
- [ ] Add `isMultiTurnEvaluatorPrompt` helper
- [ ] Add `getTurnsForConversation` helper
- [ ] Add `compareMultiTurnEvaluations` function
- [ ] Update `addTurn` to use multi-turn evaluation when appropriate
- [ ] Update database mapper `mapDbRowToTurn` for new columns

### Phase 3: Type System
- [ ] Add `HumanEmotionalState` interface
- [ ] Add `ArcProgression` interface
- [ ] Add `AdvisorFacilitation` interface
- [ ] Add `MultiTurnTurnEvaluation` interface
- [ ] Add `MultiTurnEvaluationComparison` interface
- [ ] Update `ConversationTurn` interface

### Phase 4: UI Components
- [ ] Add evaluator dropdown to chat input (with multi-turn indicator)
- [ ] Create `ArcProgressionBar` component
- [ ] Add human emotional state display to turn view
- [ ] Add arc progression display to turn view

### Phase 5: Testing
- [ ] Test multi-turn evaluator appears in dropdown
- [ ] Test evaluation runs successfully on multi-turn conversation
- [ ] Verify `humanEmotionalState` is stored per turn
- [ ] Verify `arcProgression` shows cumulative progress
- [ ] Test comparison between control and adapted

---

## 10. Verification Plan

### 10.1 Build Verification

```bash
cd src && npm run build
```

### 10.2 Manual Testing

1. **Evaluator Selection**
   - Navigate to multi-turn chat
   - Enable evaluation
   - Verify "Multi-Turn Arc-Aware Evaluator (v1)" appears in dropdown
   - Select it

2. **Turn Evaluation**
   - Start new conversation
   - Send first message simulating emotional state (e.g., "I'm so stressed about my finances")
   - Verify evaluation runs
   - Check that `humanEmotionalState` is populated

3. **Arc Progression**
   - Continue conversation for 3+ turns
   - Verify `arcProgression` shows increasing percentage
   - Verify `onTrack` status updates appropriately

4. **Comparison**
   - Check that control vs adapted comparison shows
   - Verify `winner` field is populated

---

## Appendix A: File Reference Summary

| File | Purpose | Changes |
|------|---------|---------|
| `conversation-service.ts` | Multi-turn service | Add multi-turn evaluation functions |
| `conversation.ts` (types) | Type definitions | Add new evaluation interfaces |
| `ChatInput.tsx` | Chat input UI | Add evaluator dropdown |
| `ArcProgressionBar.tsx` | New component | Visual arc progress |
| Migration SQL | Database | Add columns, seed evaluator |

---

## Appendix B: Related Documents

- [`arc-measurement-claude-as-judge-changes_v1.md`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/arc-measurement-claude-as-judge-changes_v1.md) — Single-turn arc measurement (implemented)
- [`multi-turn-chat-specification_v2.md`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/multi-turn-chat-specification_v2.md) — Multi-turn chat module specification

---

*End of Specification*
