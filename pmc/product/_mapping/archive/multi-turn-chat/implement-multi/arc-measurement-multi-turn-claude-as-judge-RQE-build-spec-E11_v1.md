# RQE Build Specification: Implementation of `response_quality_multi_turn_v1`

**Version:** 1.0
**Date:** February 1, 2026
**Purpose:** Complete, precise implementation specification for replacing `multi_turn_arc_aware_v1` with `response_quality_multi_turn_v1` in the multi-turn chat evaluation system
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
**Status:** Ready for Implementation

---

## Application Context

### What This Application Does

**BrightHub BRun Multi-Chat** is an A/B testing platform for evaluating LoRA-fine-tuned LLMs against their base models in multi-turn conversational contexts. The application enables researchers to:

1. **Test Two LLM Endpoints Simultaneously**: Run parallel conversations with a Control endpoint (base model) and an Adapted endpoint (LoRA fine-tuned model)
2. **Evaluate Emotional Intelligence**: Use Claude-as-Judge to assess how well each model responds to emotionally complex financial advisory scenarios
3. **Compare Performance**: Determine which model provides better emotional support and practical guidance through multi-turn conversations
4. **Track Progression**: Measure conversation quality across multiple turns to understand how models maintain context and build therapeutic rapport

### Core User Flow

1. User creates a **Pipeline Job** (represents a LoRA training run with Control/Adapted endpoints)
2. User starts a **Multi-Turn Conversation** from the job's chat interface
3. User enters a message (or separate messages for Control/Adapted via dual input fields)
4. System sends messages to **both endpoints in parallel** (RunPod vLLM inference)
5. System displays **both responses side-by-side** in the UI
6. If evaluation is enabled, **Claude-as-Judge evaluates both responses** and declares a winner
7. User continues the conversation for multiple turns, building conversation history
8. System maintains **siloed conversation history** per endpoint (Control sees only Control history, Adapted sees only Adapted history)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **LLM Inference**: RunPod Pods running vLLM (OpenAI-compatible API)
- **Evaluation**: Claude Sonnet 4 via Anthropic API (Claude-as-Judge)
- **State Management**: React Query (TanStack Query)
- **UI**: Tailwind CSS + Shadcn/UI components

### Database Operations: SAOL vs. Production Code

**CRITICAL DISTINCTION:**

- **SAOL (Supabase Agent Ops Library)** is a **standalone CLI tool** used for database administration, migrations, and one-off operations. It lives **outside** the application codebase.
- **Production application code** uses the **Supabase JavaScript client** (`@supabase/supabase-js`) with Next.js 14 best practices for all runtime database operations.

**When to use SAOL**: Database schema setup, inserting seed data (like evaluation prompts), and administrative tasks performed by developers before deployment.

**When to use Supabase client**: All runtime queries in the application code — reading conversations, storing turn data, fetching evaluation prompts, etc.

### Key Files in This Codebase

- `src/lib/services/multi-turn-conversation-service.ts` — Core business logic for multi-turn conversations
- `src/lib/services/test-service.ts` — Claude-as-Judge evaluation logic
- `src/types/conversation.ts` — TypeScript type definitions for conversations and evaluations
- `src/components/pipeline/chat/` — React components for the chat UI
- `src/app/api/pipeline/conversations/[id]/turn/route.ts` — API route for adding turns

---

## Table of Contents

1. [Scope & Overview](#1-scope--overview)
2. [Database Changes (via SAOL)](#2-database-changes-via-saol)
3. [Type Definitions](#3-type-definitions)
4. [Service Layer: test-service.ts](#4-service-layer-test-servicets)
5. [Service Layer: multi-turn-conversation-service.ts](#5-service-layer-multi-turn-conversation-servicets)
6. [UI Component: DualArcProgressionDisplay.tsx](#6-ui-component-dualarcprogressiondisplaytsx)
7. [Behavioral Changes Summary](#7-behavioral-changes-summary)
8. [File Modification Checklist](#8-file-modification-checklist)
9. [Verification Plan](#9-verification-plan)

---

## 1. Scope & Overview

### What This Spec Does

Replaces the `multi_turn_arc_aware_v1` evaluator with `response_quality_multi_turn_v1` in the multi-turn chat system. The new evaluator:

- Measures the **advisor's response quality** across 6 EI dimensions (not the human's emotional state)
- Evaluates **Turn 1** responses (previously skipped as "baseline")
- Adds **pairwise comparison** as a third Claude API call per turn for sharper winner discrimination
- Uses **Predicted Arc Impact (PAI)** (0-100%) as the primary progress metric, replacing arc progression percentage

### What This Spec Does NOT Do

- Does NOT change the conversation flow (dual inputs, siloed history, etc.)
- Does NOT change the database schema (JSONB columns accommodate new format)
- Does NOT remove old evaluator types (backward compat for existing data)
- Does NOT modify single-turn evaluation on `/pipeline/jobs/[id]/test`

### Codebase Path

All file paths below are relative to: `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

The multi-turn chat code lives here (NOT in `lora-pipeline/src` which predates multi-turn).

---

## 2. Database Changes (via SAOL)

**IMPORTANT: SAOL is for database administration ONLY, not production code.**

SAOL (Supabase Agent Ops Library) is a standalone CLI tool for database setup and migrations. The operations in this section are **one-time administrative tasks** to be performed by a developer using SAOL **before** deploying the code changes.

**Production application code** (in `src/`) uses the standard Supabase JavaScript client for all runtime database queries. See Section 5 for production database query patterns.

Reference: `pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

### 2.1 Replace Evaluation Prompt Record

The existing `multi_turn_arc_aware_v1` record in `evaluation_prompts` must be replaced. We will UPDATE the existing record rather than inserting a new one, so that existing conversations that reference this evaluator ID will use the new logic on subsequent turns.

**SAOL Operation: agentUpdate**

```javascript
// Step 1: Find the existing record ID
const findResult = await saol.agentQuery({
  table: 'evaluation_prompts',
  select: 'id',
  where: [{ column: 'name', operator: 'eq', value: 'multi_turn_arc_aware_v1' }],
  limit: 1
});

const existingId = findResult.data[0]?.id;

// Step 2: Update the record
await saol.agentUpdate({
  table: 'evaluation_prompts',
  where: [{ column: 'id', operator: 'eq', value: existingId }],
  data: {
    name: 'response_quality_multi_turn_v1',
    display_name: 'Response Quality Evaluator (Multi-Turn v1)',
    description: 'Evaluates advisor response quality across 6 EI dimensions with predicted arc impact. Measures the model response, not the human input.',
    prompt_template: FULL_PROMPT_TEMPLATE,  // See Section 2.3
    includes_arc_context: false,  // CHANGED from true to false
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,  // INCREASED from 2000 to 3000 for 6 dimensions with evidence
    is_active: true,
    is_default: false
  }
});
```

**If the record does NOT exist (fresh database), INSERT instead:**

```javascript
await saol.agentInsert({
  table: 'evaluation_prompts',
  data: {
    name: 'response_quality_multi_turn_v1',
    display_name: 'Response Quality Evaluator (Multi-Turn v1)',
    description: 'Evaluates advisor response quality across 6 EI dimensions with predicted arc impact. Measures the model response, not the human input.',
    prompt_template: FULL_PROMPT_TEMPLATE,  // See Section 2.3
    includes_arc_context: false,
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    is_active: true,
    is_default: false,
    version: 1
  }
});
```

### 2.2 Insert Pairwise Comparison Prompt

This is a NEW record. Insert it alongside the primary evaluator.

```javascript
await saol.agentInsert({
  table: 'evaluation_prompts',
  data: {
    name: 'response_quality_pairwise_v1',
    display_name: 'Response Quality Pairwise Comparison (v1)',
    description: 'Head-to-head comparison of two advisor responses. Used alongside the primary evaluator for sharper winner determination.',
    prompt_template: PAIRWISE_PROMPT_TEMPLATE,  // See Section 2.4
    includes_arc_context: false,
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    is_active: true,
    is_default: false,
    version: 1
  }
});
```

### 2.3 Primary Evaluator Prompt Template

This is the exact text to store in `prompt_template` for `response_quality_multi_turn_v1`:

```
You are an expert supervisor evaluating the quality of a financial advisor's response to a person in emotional distress. Your evaluation focuses on the ADVISOR'S RESPONSE — how well it addresses the human's emotional and practical needs.

## CONVERSATION HISTORY

{conversation_history}

## CURRENT TURN (Turn {current_turn})

HUMAN'S MESSAGE:
"{user_message}"

ADVISOR'S RESPONSE:
"{response}"

## YOUR EVALUATION TASK

Evaluate the ADVISOR'S RESPONSE across six dimensions. Think step-by-step:

1. Read the human's message carefully. Identify all emotions present — stated and implied.
2. Read the advisor's response. For each dimension, find specific evidence.
3. Score each dimension independently. Do not let strength in one dimension inflate others.
4. After all dimensions, make your holistic Predicted Arc Impact judgment.

Use the FULL scoring range (1-10). A score of 5-6 is COMPETENT — the expected baseline for a general-purpose model. Reserve 7+ for responses demonstrating clear emotional intelligence above baseline. Reserve 9-10 for exceptional responses.

Judge substance and quality, not length. A concise response that connects deeply may be superior to a lengthy one that covers ground superficially.

## DIMENSION 1: EMOTIONAL ATTUNEMENT (1-10)
Does the advisor hear and validate the emotion behind the human's words?
- 1-2: Ignores emotional content. Responds only to facts/finances.
- 3-4: Generic acknowledgment ("I understand this is hard") without naming specific emotions.
- 5-6: Identifies the primary emotion and offers basic validation.
- 7-8: Identifies primary + secondary emotions. Validates specifically and normalizes the experience.
- 9-10: Captures the full emotional landscape including unstated feelings. Deep validation with de-stigmatization.

## DIMENSION 2: EMPATHIC DEPTH (1-10)
How deeply does the advisor demonstrate understanding of the human's internal experience?
- 1-2: Generic statements that could apply to anyone.
- 3-4: Acknowledges the stated reason for the emotion but goes no deeper.
- 5-6: Connects the emotion to specific circumstances with some nuance.
- 7-8: Understands the meaning behind the words — the identity threat, the shame, the fear.
- 9-10: Captures unspoken subtext and the full weight of the experience.

## DIMENSION 3: PSYCHOLOGICAL SAFETY (1-10)
Does the advisor create a space where the human feels safe to be vulnerable?
- 1-2: Cold, clinical, robotic, or subtly judgmental.
- 3-4: Professional and polite but emotionally distant. Reads like a script.
- 5-6: Warm but formulaic. Correct words, but the voice lacks authenticity.
- 7-8: Genuinely warm, natural, non-judgmental. The human would feel cared for.
- 9-10: Deeply compassionate, authentic. Removes shame by how it speaks. The human would feel safe revealing more.

## DIMENSION 4: FACILITATION & EMPOWERMENT (1-10)
Does the advisor bridge emotional support into practical guidance while empowering the human's agency?
- 1-2: All emotion with no path forward, OR all advice with no emotional bridge. Prescriptive ("you need to").
- 3-4: Both present but disconnected. Hard transition from feelings to advice.
- 5-6: Emotional acknowledgment leads into suggestions. Transition noticeable but not jarring.
- 7-8: Natural flow from emotional support into guidance. Empowers with choices rather than commands.
- 9-10: Seamless flow where emotional processing enables practical action. Builds self-efficacy.

## DIMENSION 5: PRACTICAL GUIDANCE QUALITY (1-10)
Is the financial/practical advice sound, specific, and appropriately scaffolded?
- 1-2: Incorrect, harmful, or completely absent when clearly needed.
- 3-4: Generic platitudes ("save more, spend less").
- 5-6: Correct basic advice with some specificity.
- 7-8: Specific, actionable steps appropriate to the stated situation.
- 9-10: Expert-level, personalized guidance with progressive disclosure.
NOTE: If the human's message is purely emotional and not asking for practical help, and the advisor wisely focuses on emotional support, score 6 with a note that guidance was appropriately deferred.

## DIMENSION 6: CONVERSATIONAL CONTINUITY (1-10)
Does the advisor build on prior exchanges and maintain narrative coherence?
- 1-2: Treats the turn as if the conversation just started.
- 3-4: Vague references to earlier discussion without specifics.
- 5-6: References specific prior points. Shows awareness of the conversation's arc.
- 7-8: Explicitly builds on earlier exchanges. Acknowledges growth. Tracks emotional threads.
- 9-10: Sophisticated narrative management. Weaves the human's journey. Creates hooks for continuation.
NOTE: For Turn 1, evaluate whether the response establishes a strong conversational foundation and creates natural openings for the human to continue.

## PREDICTED ARC IMPACT (0-100%)
If a real human in this emotional state received this response, how likely is it they would feel understood and move toward a healthier emotional state?
- 0-15%: Would likely cause disengagement or defensiveness.
- 16-35%: Unlikely to help. The human would feel unheard.
- 36-55%: Provides some value but misses key emotional needs.
- 56-75%: Supportive. The human would feel understood and motivated.
- 76-90%: Highly effective. The human would feel deeply understood, safe, and empowered.
- 91-100%: Exceptional. The human would experience a meaningful emotional shift.

## RESPONSE FORMAT

Respond ONLY with valid JSON. No other text before or after.

{
  "responseQuality": {
    "d1_emotionalAttunement": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations from the response>"
    },
    "d2_empathicDepth": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d3_psychologicalSafety": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d4_facilitationEmpowerment": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d5_practicalGuidance": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    },
    "d6_conversationalContinuity": {
      "score": <1-10>,
      "evidence": "<specific quotes or observations>"
    }
  },
  "predictedArcImpact": {
    "score": <0-100>,
    "reasoning": "<2-3 sentences on why the human would or would not progress>"
  },
  "responseQualityScore": <1.0-10.0>,
  "turnSummary": {
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<area 1>", "<area 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}
```

### 2.4 Pairwise Comparison Prompt Template

This is the exact text to store in `prompt_template` for `response_quality_pairwise_v1`:

```
You are an expert supervisor performing a blind comparison of two financial advisor responses to the same human message.

## CONVERSATION HISTORY

{conversation_history}

## CURRENT TURN (Turn {current_turn})

HUMAN'S MESSAGE:
"{user_message}"

RESPONSE A:
"{response_a}"

RESPONSE B:
"{response_b}"

## YOUR TASK

Compare these two responses holistically. Consider emotional intelligence, facilitation quality, practical guidance, and communication quality.

Which response better serves the human's emotional AND practical needs?

Rules:
- Judge substance, not length or style.
- A shorter response that truly connects may be better than a longer one.
- Consider: Which response would a real human find more helpful in this moment?
- If both are genuinely comparable, "tie" is a valid answer.

Respond ONLY with valid JSON:

{
  "preferred": "A" | "B" | "tie",
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences explaining the preference>",
  "dimensionAdvantages": {
    "A": ["<quality where A is notably better>"],
    "B": ["<quality where B is notably better>"]
  }
}
```

### 2.5 No Schema Migration Needed

The evaluation data is stored in `JSONB` columns (`control_evaluation`, `adapted_evaluation`, `evaluation_comparison`, `control_arc_progression`, `adapted_arc_progression`, `conversation_winner`). These columns accept any JSON structure. No `ALTER TABLE` is needed.

---

## 3. Type Definitions

### File: `src/types/conversation.ts`

### 3.1 ADD New RQE Types

Add these types AFTER the existing `MultiTurnEvaluationComparison` interface (after line ~154). Do NOT remove existing types — they are needed for backward compatibility with existing conversation data.

```typescript
// ============================================
// Response Quality Evaluator (RQE) Types
// ============================================

export interface RQEDimensionScore {
  score: number;        // 1-10 integer
  evidence: string;     // Specific quotes or observations from the response
}

export interface RQEResponseQuality {
  d1_emotionalAttunement: RQEDimensionScore;
  d2_empathicDepth: RQEDimensionScore;
  d3_psychologicalSafety: RQEDimensionScore;
  d4_facilitationEmpowerment: RQEDimensionScore;
  d5_practicalGuidance: RQEDimensionScore;
  d6_conversationalContinuity: RQEDimensionScore;
}

export interface RQEPredictedArcImpact {
  score: number;        // 0-100
  reasoning: string;
}

export interface RQETurnSummary {
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

/** Full evaluation result from the response_quality_multi_turn_v1 evaluator */
export interface RQEEvaluation {
  responseQuality: RQEResponseQuality;
  predictedArcImpact: RQEPredictedArcImpact;
  responseQualityScore: number;   // Claude's computed composite (1.0-10.0)
  turnSummary: RQETurnSummary;
}

/** Pairwise comparison result from response_quality_pairwise_v1 */
export interface RQEPairwiseResult {
  preferred: 'A' | 'B' | 'tie';
  confidence: number;             // 0.0-1.0
  reasoning: string;
  dimensionAdvantages: {
    A: string[];
    B: string[];
  };
}

/** Extended pairwise result with de-randomized mapping */
export interface RQEPairwiseComparison extends RQEPairwiseResult {
  mappedPreferred: 'control' | 'adapted' | 'tie';
  aWas: 'control' | 'adapted';
}

/** RQE-based winner declaration (replaces ConversationWinnerDeclaration for new evaluator) */
export interface RQEWinnerDeclaration {
  winner: 'control' | 'adapted' | 'tie';
  controlRQS: number;
  adaptedRQS: number;
  controlPAI: number;
  adaptedPAI: number;
  reason: string;
  determinedBy: 'pai' | 'rqs' | 'pairwise' | 'tie';
}
```

### 3.2 ADD RQS Computation Constant

Add this after the new types:

```typescript
/** Dimension weights for computing Response Quality Score */
export const RQE_WEIGHTS = {
  d1_emotionalAttunement: 0.20,
  d2_empathicDepth: 0.20,
  d3_psychologicalSafety: 0.15,
  d4_facilitationEmpowerment: 0.20,
  d5_practicalGuidance: 0.10,
  d6_conversationalContinuity: 0.15,
} as const;

/** Compute the weighted RQS from dimension scores */
export function computeRQS(dimensions: RQEResponseQuality): number {
  const rqs =
    RQE_WEIGHTS.d1_emotionalAttunement * dimensions.d1_emotionalAttunement.score +
    RQE_WEIGHTS.d2_empathicDepth * dimensions.d2_empathicDepth.score +
    RQE_WEIGHTS.d3_psychologicalSafety * dimensions.d3_psychologicalSafety.score +
    RQE_WEIGHTS.d4_facilitationEmpowerment * dimensions.d4_facilitationEmpowerment.score +
    RQE_WEIGHTS.d5_practicalGuidance * dimensions.d5_practicalGuidance.score +
    RQE_WEIGHTS.d6_conversationalContinuity * dimensions.d6_conversationalContinuity.score;
  return Math.round(rqs * 10) / 10; // One decimal place
}
```

---

## 4. Service Layer: test-service.ts

### File: `src/lib/services/test-service.ts`

### 4.1 Modify `evaluateWithClaude` — Add `{current_turn}` Variable Substitution

The current function (line ~176) performs variable substitution on the prompt template. The new RQE prompt uses `{current_turn}` and `{conversation_history}` as variables. The function already handles `{conversation_history}` via the optional `conversationHistory` parameter added in E06. We need to add support for `{current_turn}`.

**Current signature (line ~176):**
```typescript
async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string,
  evaluationPromptId?: string,
  conversationHistory?: string
): Promise<ClaudeEvaluation>
```

**Change signature to add turn number:**
```typescript
async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string,
  evaluationPromptId?: string,
  conversationHistory?: string,
  turnNumber?: number              // NEW PARAMETER
): Promise<ClaudeEvaluation>
```

**Add variable substitution (after existing .replace() calls, around line ~190):**

```typescript
// Existing substitutions:
let prompt = promptConfig.promptTemplate
  .replace('{user_prompt}', userPrompt)
  .replace('{user_message}', userPrompt)      // NEW: RQE uses {user_message}
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
```

Note the use of `/{current_turn}/g` (global regex) because the RQE prompt uses `{current_turn}` in two places (header and JSON hint).

### 4.2 Update the Export

The `evaluateWithClaude` export at line ~602 does not need to change since the new parameter is optional. The function is already exported.

### 4.3 ADD Function: `getEvaluationPrompt`

This function fetches evaluation prompt configuration from the database. It is called by both the existing evaluation logic and the new RQE pairwise comparison.

**Location:** Add this function in `test-service.ts` near the existing helper functions (around line ~150).

```typescript
/**
 * Fetch evaluation prompt configuration from database
 * Used for both primary evaluation and pairwise comparison
 */
async function getEvaluationPrompt(promptId: string): Promise<{
  promptTemplate: string;
  model: string;
  maxTokens: number;
  includesArcContext: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('evaluation_prompts')
    .select('prompt_template, model, max_tokens, includes_arc_context')
    .eq('id', promptId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch evaluation prompt ${promptId}: ${error?.message || 'Not found'}`);
  }

  return {
    promptTemplate: data.prompt_template,
    model: data.model,
    maxTokens: data.max_tokens,
    includesArcContext: data.includes_arc_context,
  };
}
```

**Export:** Add `getEvaluationPrompt` to the exports at the bottom of `test-service.ts` (around line ~602):

```typescript
export {
  evaluateWithClaude,
  compareEvaluations,
  getEvaluationPrompt,  // ADD THIS
  getEmotionalArcsContext,
};
```

**Error Handling:** The function throws an error if the prompt is not found. This is intentional — if an evaluation prompt ID is invalid, the operation should fail loudly rather than silently using a default.

**Type Safety:** The return type matches the structure used by `evaluateWithClaude` and `runPairwiseComparison`. The database column names are snake_case, but the returned object uses camelCase for JavaScript conventions.

### 4.4 No Changes to `compareEvaluations`

The existing `compareEvaluations()` function handles the legacy and arc-aware schemas. It will be called only for backward-compatible contexts. The new RQE comparison logic lives in `multi-turn-conversation-service.ts` (Section 5).

---

## 5. Service Layer: multi-turn-conversation-service.ts

### File: `src/lib/services/multi-turn-conversation-service.ts`

This is the primary file that changes. The modifications are organized by function.

### 5.1 ADD Import for New Types

**At top of file (around line ~10), add to existing import:**

```typescript
import {
  // ... existing imports ...
  RQEEvaluation,
  RQEPairwiseResult,
  RQEPairwiseComparison,
  RQEWinnerDeclaration,
  computeRQS,
} from '@/types/conversation';
```

### 5.2 ADD Helper: `isRQEEvaluator`

Add this function near the existing `isMultiTurnEvaluatorPrompt` function (around line ~213):

```typescript
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
```

### 5.3 ADD Helper: `getPairwisePromptId`

```typescript
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
```

### 5.4 ADD Function: `evaluateWithRQE`

This replaces the role of `evaluateMultiTurnConversation` for RQE evaluations. Add it in the "E06: Dual Arc Progression Functions" section (around line ~950):

```typescript
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
```

### 5.5 ADD Function: `runPairwiseComparison`

```typescript
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
```

### 5.6 ADD Function: `declareRQEWinner`

Add this alongside the existing `declareConversationWinner` function:

```typescript
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

  // Signal 1: PAI difference > 10
  if (paiDiff > 10) {
    winner = controlPAI > adaptedPAI ? 'control' : 'adapted';
    reason = `${winner === 'control' ? 'Control' : 'Adapted'} has higher predicted impact (${controlPAI}% vs ${adaptedPAI}%)`;
    determinedBy = 'pai';
  }
  // Signal 2: RQS difference > 0.5
  else if (rqsDiff > 0.5) {
    winner = controlRQS > adaptedRQS ? 'control' : 'adapted';
    reason = `${winner === 'control' ? 'Control' : 'Adapted'} has higher response quality score (${controlRQS} vs ${adaptedRQS})`;
    determinedBy = 'rqs';
  }
  // Signal 3: Pairwise comparison
  else if (pairwise && pairwise.confidence > 0.7 && pairwise.mappedPreferred !== 'tie') {
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
```

### 5.7 MODIFY Function: `addTurn` — Evaluation Block

This is the most important change. The `addTurn` function (starting at line ~441) contains the evaluation logic in the block starting at line ~614.

**REPLACE the entire evaluation block** (from `if (request.enableEvaluation && ...` through the catch block, approximately lines 614-726) with:

```typescript
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
```

**Key behavioral changes in this block:**
1. Detects RQE evaluator vs legacy evaluator
2. RQE path: evaluates ALL turns including Turn 1 (no baseline skip)
3. RQE path: runs pairwise comparison (3rd API call)
4. RQE path: uses `declareRQEWinner` with three-signal logic
5. Legacy path: preserved exactly as before for backward compat

### 5.8 UPDATE Import from test-service

The import statement already includes `getEvaluationPrompt` (which we added in Section 4.3). Verify the import at line ~26 includes all required functions:

```typescript
import { evaluateWithClaude, compareEvaluations, getEvaluationPrompt, getEmotionalArcsContext } from './test-service';
```

**Note:** The `evaluateWithClaude` function now accepts an optional `turnNumber` parameter (added in Section 4.1). The `getEvaluationPrompt` function is used by `runPairwiseComparison` (Section 5.5) to fetch the pairwise prompt configuration.

---

## 6. UI Component: DualArcProgressionDisplay.tsx

### File: `src/components/pipeline/chat/DualArcProgressionDisplay.tsx`

The changes here are minimal. The component already reads `progressionPercentage` from `ArcProgression` and displays it on progress bars. Since the RQE maps PAI to `progressionPercentage`, the progress bars will show PAI automatically.

### 6.1 Update Badge Labels

The current badges say "On Track" / "Off Track" based on `onTrack`. For RQE evaluations, these should say something more meaningful.

**Replace the badge rendering for Control (around line ~55-58):**

```typescript
<Badge variant={controlOnTrack ? 'default' : 'secondary'} className="text-xs">
  {controlArcProgression?.detectedArc === 'response_quality'
    ? (controlOnTrack ? 'Strong EI' : 'Baseline EI')
    : (controlOnTrack ? 'On Track' : 'Off Track')}
</Badge>
```

**Replace the badge rendering for Adapted (around line ~75-78):**

```typescript
<Badge variant={adaptedOnTrack ? 'default' : 'secondary'} className="text-xs">
  {adaptedArcProgression?.detectedArc === 'response_quality'
    ? (adaptedOnTrack ? 'Strong EI' : 'Baseline EI')
    : (adaptedOnTrack ? 'On Track' : 'Off Track')}
</Badge>
```

### 6.2 Update Arc Name Display

The current "Arc:" line shows formatted arc names. For RQE evaluations, replace with the PAI label.

**Replace the arc name display for Control (around line ~66-68):**

```typescript
<div className="text-xs text-muted-foreground">
  {controlArcProgression?.detectedArc === 'response_quality'
    ? `Predicted Impact: ${controlProgress}%`
    : `Arc: ${formatArcName(controlArcProgression?.detectedArc || null)}`}
</div>
```

**Replace the arc name display for Adapted (around line ~85-88):**

```typescript
<div className="text-xs text-muted-foreground">
  {adaptedArcProgression?.detectedArc === 'response_quality'
    ? `Predicted Impact: ${adaptedProgress}%`
    : `Arc: ${formatArcName(adaptedArcProgression?.detectedArc || null)}`}
</div>
```

---

## 7. Behavioral Changes Summary

| Behavior | Before (multi_turn_arc_aware_v1) | After (response_quality_multi_turn_v1) |
|----------|----------------------------------|---------------------------------------|
| Turn 1 | Baseline at 0%, no evaluation call | **Full evaluation with 6 dimensions + PAI** |
| What is measured | Human's emotional state from input | **Advisor's response quality** |
| Dimensions | 4 (valence, intensity, arc, facilitation) | **6 (attunement, depth, safety, facilitation, guidance, continuity)** |
| Progress bar value | Arc progression % (0-100) | **PAI (0-100%)** |
| Winner logic | Higher arc progression wins | **Three-signal: PAI > RQS > Pairwise** |
| API calls per turn | 2 (1 per endpoint) | **3 (1 per endpoint + 1 pairwise)** |
| Badge text | "On Track" / "Off Track" | **"Strong EI" / "Baseline EI"** |
| Arc display | "Arc: Shame -> Acceptance" | **"Predicted Impact: 72%"** |
| Legacy evaluator | Removed from dropdown | **Preserved as fallback for old conversations** |

---

## 8. File Modification Checklist

### Database Operations (via SAOL)

- [ ] UPDATE `evaluation_prompts` record: rename from `multi_turn_arc_aware_v1` to `response_quality_multi_turn_v1`, update prompt template, set `includes_arc_context: false`, set `max_tokens: 3000`
- [ ] INSERT new `response_quality_pairwise_v1` record into `evaluation_prompts`
- [ ] VERIFY both records exist with: `agentQuery({ table: 'evaluation_prompts', select: 'id, name, display_name', where: [{ column: 'name', operator: 'like', value: 'response_quality%' }] })`

### Code Files

| # | File | Action | Changes |
|---|------|--------|---------|
| 1 | `src/types/conversation.ts` | ADD | RQEDimensionScore, RQEResponseQuality, RQEPredictedArcImpact, RQETurnSummary, RQEEvaluation, RQEPairwiseResult, RQEPairwiseComparison, RQEWinnerDeclaration interfaces + RQE_WEIGHTS constant + computeRQS function |
| 2 | `src/lib/services/test-service.ts` | MODIFY | Add `turnNumber` optional parameter to `evaluateWithClaude()`, add `{user_message}` and `{current_turn}` variable substitutions, add `{conversation_history}` fallback. ADD `getEvaluationPrompt()` function and export it. |
| 3 | `src/lib/services/multi-turn-conversation-service.ts` | MODIFY | Add imports, add `isRQEEvaluator()`, `getPairwisePromptId()`, `evaluateWithRQE()`, `runPairwiseComparison()`, `declareRQEWinner()` functions. Replace evaluation block in `addTurn()` with dual-path logic (RQE vs Legacy) |
| 4 | `src/components/pipeline/chat/DualArcProgressionDisplay.tsx` | MODIFY | Update badge labels and arc display text to detect RQE evaluations |

### Files NOT Modified

- `src/hooks/useDualChat.ts` — No changes needed
- `src/components/pipeline/chat/ChatInput.tsx` — No changes needed
- `src/components/pipeline/chat/ChatTurn.tsx` — No changes needed
- `src/components/pipeline/chat/DualResponsePanel.tsx` — Winner badge already reads from `evaluationComparison.winner` which is set correctly
- `src/app/api/pipeline/conversations/[id]/turn/route.ts` — No changes needed

---

## 9. Verification Plan

### 9.1 Build Verification

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show"
npx tsc --noEmit
```

Expected: Exit code 0, no type errors.

### 9.2 Database Verification (via SAOL)

```javascript
// Verify the two new evaluator prompts exist
const result = await saol.agentQuery({
  table: 'evaluation_prompts',
  select: 'id, name, display_name, includes_arc_context, max_tokens',
  where: [{ column: 'name', operator: 'like', value: 'response_quality%' }]
});
console.log(result.data);
// Expected: 2 records
//   response_quality_multi_turn_v1 (includes_arc_context: false, max_tokens: 3000)
//   response_quality_pairwise_v1 (includes_arc_context: false, max_tokens: 1500)
```

### 9.3 Functional Verification

1. **Navigate to** `/pipeline/jobs/[jobId]/chat`
2. **Start new conversation**
3. **Enable Evaluation**, select "Response Quality Evaluator (Multi-Turn v1)" from dropdown
4. **Send Turn 1** with any test prompt
5. **Verify Turn 1 is evaluated** (NOT baseline 0% — should show actual PAI and dimension scores)
6. **Verify progress bars** show PAI percentages
7. **Verify badges** show "Strong EI" or "Baseline EI"
8. **Verify winner** is declared based on PAI/RQS/pairwise
9. **Send Turn 2**, verify evaluation includes conversation history context
10. **Check database** to confirm `control_evaluation` and `adapted_evaluation` contain the RQE JSON format with all 6 dimensions

### 9.4 Backward Compatibility Verification

1. **Open an existing conversation** that was evaluated with the old `multi_turn_arc_aware_v1` evaluator
2. **Verify it still renders** — old evaluation data should display correctly
3. **Verify progress bars** still show the old arc progression percentages
4. **Verify badges** still show "On Track" / "Off Track" for old data

### 9.5 Database Query to Verify RQE Data Structure

```javascript
// After running a test conversation with RQE enabled
const result = await saol.agentQuery({
  table: 'conversation_turns',
  select: 'turn_number, control_evaluation, adapted_evaluation, control_arc_progression, conversation_winner',
  where: [{ column: 'conversation_id', operator: 'eq', value: '{test_conversation_id}' }],
  orderBy: [{ column: 'turn_number', asc: true }],
  limit: 5
});

// Verify Turn 1 has evaluation data (not baseline)
// Verify control_evaluation contains responseQuality.d1_emotionalAttunement etc.
// Verify control_arc_progression.detectedArc === 'response_quality'
// Verify control_arc_progression.progressionPercentage is the PAI value (0-100)
// Verify conversation_winner has controlProgressPercentage and adaptedProgressPercentage
```
