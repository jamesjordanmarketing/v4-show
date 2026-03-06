# Claude-as-Judge Evaluation System Enhancement Specification

**Version:** 1.0  
**Date:** January 27, 2026  
**Author:** Planning Agent  
**Purpose:** Complete implementation specification for enhancing the Claude-as-Judge evaluation system with arc-aware prompts, database-stored evaluators, and UI selection

---

## Executive Summary

This specification defines the complete implementation plan for enhancing the Claude-as-Judge evaluation system. The changes include:

1. **New arc-aware evaluation prompt** — Provides Claude with full context of all trained emotional arcs to make informed judgments
2. **Database-stored evaluation prompts** — Moves prompts from hardcoded strings to a Supabase table for flexibility and versioning
3. **UI evaluator selection** — Adds a dropdown on `pipeline/jobs/[id]/test` to select which evaluator to use
4. **Improved emotional state measurement** — Uses a "directional improvement" model rather than semantic closeness

> [!IMPORTANT]
> This specification is designed to be complete and self-contained. A build agent should be able to implement all changes by reading this document and the referenced codebase files.

---

## Table of Contents

1. [Background & Rationale](#1-background--rationale)
2. [Emotional Arc Measurement Methodology](#2-emotional-arc-measurement-methodology)
3. [Database Schema Changes](#3-database-schema-changes)
4. [New Evaluation Prompt Design](#4-new-evaluation-prompt-design)
5. [Service Layer Changes](#5-service-layer-changes)
6. [API Route Changes](#6-api-route-changes)
7. [UI Component Changes](#7-ui-component-changes)
8. [Type System Updates](#8-type-system-updates)
9. [Implementation Checklist](#9-implementation-checklist)
10. [SAOL Usage Instructions](#10-saol-usage-instructions)

---

## 1. Background & Rationale

### 1.1 Current State

The current evaluation system uses a hardcoded `EVALUATION_PROMPT` in [`test-service.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/lib/services/test-service.ts#L28-L81) that:
- Evaluates responses on empathy, voice consistency, conversation quality, and emotional progression
- Does **NOT** provide Claude with the actual emotional arcs that were used to train the LoRA adapter
- Uses arbitrary text labels for emotions (Claude invents them at evaluation time)

### 1.2 Problem Statement

Claude-as-Judge cannot accurately assess whether an adapted model is achieving its intended emotional arc outcomes because it has no knowledge of:
- What emotional arcs the model was trained on (e.g., "shame → acceptance", "confusion → clarity")
- The training intent behind the LoRA adapter
- The defined arc structures from the `prompt_templates` table

### 1.3 Design Philosophy

> [!TIP]
> **We are NOT creating an intricate categorization system.** The evaluator should remain a general-purpose judge that happens to have context about what arcs exist. Claude makes its own determination about which arc applies and how well the response achieves it.

Key principles:
1. **Disclose, don't dictate** — Provide arc context but let Claude decide
2. **Directional improvement** — Measure if user moved "toward a better state" rather than semantic closeness
3. **Preserve existing functionality** — The current `EVALUATION_PROMPT` remains unchanged; we add a new one
4. **Single-turn focus** — No multi-turn complexity until that feature is built

---

## 2. Emotional Arc Measurement Methodology

### 2.1 The Challenge of Measuring Emotional "Closeness"

Unlike semantic embeddings where we can measure cosine similarity between concepts, emotions do not have a universally agreed-upon distance metric. There is no established "closeness" model for emotions.

### 2.2 Proposed Solution: Directional Improvement Model

> [!NOTE]
> **APPROVED** — This methodology has been reviewed and approved by the project owner.

Instead of measuring how "close" an ending emotion is to a target, we measure:

1. **Valence Direction** — Did the user move toward a more positive valence?
   - `negative → neutral → positive`
   
2. **Intensity Reduction** (for distressing emotions) — Did intensity decrease?
   - High anxiety (0.9) → Low anxiety (0.3) = improvement
   
3. **State Transition Quality** — Did the transition match a healthy progression?
   - Examples:
     - `confusion → clarity` ✓
     - `shame → acceptance` ✓
     - `anxiety → confidence` ✓
     - `overwhelm → empowerment` ✓

### 2.3 Measurement Dimensions

The new evaluation prompt will ask Claude to assess:

| Dimension | Question | Scale |
|-----------|----------|-------|
| **Start State Identification** | What primary emotion did the user express initially? | Label + intensity (0.0-1.0) |
| **End State Identification** | What primary emotion does the user likely feel after reading this response? | Label + intensity (0.0-1.0) |
| **Valence Shift** | Did the response move the user toward a more positive emotional state? | `improved`, `maintained`, `worsened` |
| **Intensity Change** | For distressing emotions, did intensity decrease? | `reduced`, `unchanged`, `increased` |
| **Arc Alignment** | Does this transition align with any known therapeutic emotional arcs? | Arc name or "none detected" |
| **Progression Quality** | How skillfully did the response facilitate emotional movement? | 1-5 scale |

### 2.4 Known Emotional Arcs

From the [`prompt_templates`](file:///supabase-query) table, the system knows these arcs:

| Arc Key | Arc Name | Structure |
|---------|----------|-----------|
| `confusion_to_clarity` | Confusion → Clarity | Turn 1: Express confusion → Turn 2: Normalize + educate → Turn 3: Follow-up + understanding → Turn 4: Clarity + confidence |
| `shame_to_acceptance` | Shame → Acceptance | Turn 1: Reveal shame → Turn 2: Normalize powerfully + reframe → Turn 3: Vulnerable details + relief → Turn 4: Path forward + hope |
| `fear_to_confidence` | Anxiety → Confidence | Turn 1: Express anxiety → Turn 2: Validate + separate objective/subjective → Turn 3: Reality-test + security → Turn 4: Build confidence + steps |
| `overwhelm_to_empowerment` | Overwhelm → Empowerment | Turn 1: Present complex situation → Turn 2: Validate + break down → Turn 3: Focus on priority → Turn 4: Build confidence |
| `grief_to_healing` | Grief/Loss → Healing | Turn 1: Reveal loss → Turn 2: Acknowledge grief + normalize → Turn 3: Permission through values → Turn 4: Relief + healing path |
| `couple_conflict_to_alignment` | Couple Conflict → Alignment | Turn 1: Express disagreement → Turn 2: Validate both → Turn 3: Both/and solution → Turn 4: Partnership celebration |
| `emergency_to_calm` | Emergency → Calm | Turn 1: Express emergency + panic → Turn 2: Acknowledge + triage → Turn 3: Stabilization + short-term plan → Turn 4: Calm + confidence |
| `crisis_to_referral` | Crisis → Referral | (Safety & professional boundaries) |
| `hostility_to_boundary` | Hostility → Boundary | (Professional boundary setting) |
| `overwhelm_to_triage` | Overwhelm → Triage | (Emergency prioritization) |

---

## 3. Database Schema Changes

### 3.1 New Table: `evaluation_prompts`

Create a new table to store evaluation prompt templates.

```sql
-- Migration: Create evaluation_prompts table
CREATE TABLE IF NOT EXISTS public.evaluation_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Prompt content
  prompt_template TEXT NOT NULL,
  expected_response_schema JSONB,
  
  -- Configuration
  includes_arc_context BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for active prompts lookup
CREATE INDEX idx_evaluation_prompts_active ON public.evaluation_prompts(is_active) WHERE is_active = true;

-- Ensure only one default prompt
CREATE UNIQUE INDEX idx_evaluation_prompts_default ON public.evaluation_prompts(is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.evaluation_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active prompts
CREATE POLICY "Users can read active evaluation prompts"
  ON public.evaluation_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Only admins can modify (or use service role key)
CREATE POLICY "Service role can manage evaluation prompts"
  ON public.evaluation_prompts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 3.2 Modify Table: `pipeline_test_results`

Add a column to track which evaluator was used.

> [!IMPORTANT]
> **No historical data migration.** Do NOT backfill `evaluation_prompt_id` on existing test results. Existing records will have `NULL` for this column, which is acceptable.

```sql
-- Migration: Add evaluator reference to pipeline_test_results
ALTER TABLE public.pipeline_test_results
  ADD COLUMN IF NOT EXISTS evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id);

-- Index for filtering by evaluator
CREATE INDEX idx_pipeline_test_results_evaluator ON public.pipeline_test_results(evaluation_prompt_id);
```

### 3.3 Seed Data: Default Evaluation Prompts

Insert two prompts: the original (now named "Legacy") and the new arc-aware prompt.

```sql
-- Seed: Insert default evaluation prompts
INSERT INTO public.evaluation_prompts (name, display_name, description, prompt_template, includes_arc_context, is_default, expected_response_schema)
VALUES 
(
  'legacy_v1',
  'Legacy Evaluator (v1)',
  'Original evaluation prompt without arc context. Measures empathy, voice, quality, and emotional progression.',
  E'You are an expert evaluator assessing the quality of a financial advisor conversation. Analyze the following response and provide structured evaluation.\n\nUSER''S QUESTION:\n{user_prompt}\n\nSYSTEM CONTEXT:\n{system_prompt}\n\nADVISOR''S RESPONSE:\n{response}\n\nEvaluate the response on these dimensions and respond in JSON format:\n\n{\n  \"emotionalProgression\": {\n    \"startState\": { \"primaryEmotion\": \"<detected starting emotion>\", \"intensity\": <0.0-1.0> },\n    \"endState\": { \"primaryEmotion\": \"<detected ending emotion>\", \"intensity\": <0.0-1.0> },\n    \"arcCompleted\": <true/false>,\n    \"progressionQuality\": <1-5>,\n    \"progressionNotes\": \"<brief explanation>\"\n  },\n  \"empathyEvaluation\": {\n    \"emotionsAcknowledged\": <true/false>,\n    \"acknowledgmentInFirstSentence\": <true/false>,\n    \"validationProvided\": <true/false>,\n    \"empathyScore\": <1-5>,\n    \"empathyNotes\": \"<brief explanation>\"\n  },\n  \"voiceConsistency\": {\n    \"warmthPresent\": <true/false>,\n    \"judgmentFree\": <true/false>,\n    \"specificNumbersUsed\": <true/false>,\n    \"jargonExplained\": <true/false>,\n    \"voiceScore\": <1-5>,\n    \"voiceNotes\": \"<brief explanation>\"\n  },\n  \"conversationQuality\": {\n    \"helpfulToUser\": <true/false>,\n    \"actionableGuidance\": <true/false>,\n    \"appropriateDepth\": <true/false>,\n    \"naturalFlow\": <true/false>,\n    \"qualityScore\": <1-5>,\n    \"qualityNotes\": \"<brief explanation>\"\n  },\n  \"overallEvaluation\": {\n    \"wouldUserFeelHelped\": <true/false>,\n    \"overallScore\": <1-5>,\n    \"keyStrengths\": [\"<strength 1>\", \"<strength 2>\"],\n    \"areasForImprovement\": [\"<improvement 1>\", \"<improvement 2>\"],\n    \"summary\": \"<one paragraph overall assessment>\"\n  }\n}\n\nRespond ONLY with valid JSON, no other text.',
  false,
  false,
  NULL
),
(
  'arc_aware_v1',
  'Arc-Aware Evaluator (v1)',
  'Enhanced evaluation prompt with full emotional arc context. Measures directional emotional improvement and arc alignment.',
  E'You are an expert evaluator assessing emotional facilitation quality in financial advisor conversations. You specialize in therapeutic communication and emotional intelligence.\n\n## CONTEXT: KNOWN EMOTIONAL ARCS\n\nThis advisor was trained to facilitate the following emotional transitions:\n\n{emotional_arcs}\n\nThese arcs represent healthy emotional progressions in financial conversations. The advisor should recognize when a user is in one of these states and help guide them toward the target state.\n\n## CONVERSATION TO EVALUATE\n\nUSER''S QUESTION:\n{user_prompt}\n\nSYSTEM CONTEXT:\n{system_prompt}\n\nADVISOR''S RESPONSE:\n{response}\n\n## EVALUATION TASK\n\nAnalyze this single exchange and assess how effectively the advisor facilitated emotional movement. You are NOT categorizing the question into a specific arc - you are assessing whether the response helps the user move toward a better emotional state.\n\nRespond in JSON format:\n\n{\n  \"emotionalStateAnalysis\": {\n    \"startState\": {\n      \"primaryEmotion\": \"<detected primary emotion in user question>\",\n      \"secondaryEmotion\": \"<detected secondary emotion, if any>\",\n      \"intensity\": <0.0-1.0>,\n      \"valence\": \"negative\" | \"neutral\" | \"positive\"\n    },\n    \"projectedEndState\": {\n      \"primaryEmotion\": \"<emotion user likely feels after reading response>\",\n      \"intensity\": <0.0-1.0>,\n      \"valence\": \"negative\" | \"neutral\" | \"positive\"\n    },\n    \"emotionalMovement\": {\n      \"valenceShift\": \"improved\" | \"maintained\" | \"worsened\",\n      \"intensityChange\": \"reduced\" | \"unchanged\" | \"increased\",\n      \"movementQuality\": <1-5>,\n      \"movementNotes\": \"<brief explanation of the emotional shift>\"\n    }\n  },\n  \"arcAlignment\": {\n    \"detectedArc\": \"<arc_key if applicable, or ''none''>\",\n    \"arcMatchConfidence\": <0.0-1.0>,\n    \"alignmentNotes\": \"<explanation of why this arc was detected or not>\"\n  },\n  \"empathyEvaluation\": {\n    \"emotionsAcknowledged\": <true/false>,\n    \"acknowledgmentInFirstSentence\": <true/false>,\n    \"validationProvided\": <true/false>,\n    \"normalizationUsed\": <true/false>,\n    \"empathyScore\": <1-5>,\n    \"empathyNotes\": \"<brief explanation>\"\n  },\n  \"voiceConsistency\": {\n    \"warmthPresent\": <true/false>,\n    \"judgmentFree\": <true/false>,\n    \"specificNumbersUsed\": <true/false>,\n    \"jargonExplained\": <true/false>,\n    \"voiceScore\": <1-5>,\n    \"voiceNotes\": \"<brief explanation>\"\n  },\n  \"conversationQuality\": {\n    \"helpfulToUser\": <true/false>,\n    \"actionableGuidance\": <true/false>,\n    \"appropriateDepth\": <true/false>,\n    \"naturalFlow\": <true/false>,\n    \"qualityScore\": <1-5>,\n    \"qualityNotes\": \"<brief explanation>\"\n  },\n  \"overallEvaluation\": {\n    \"wouldUserFeelHelped\": <true/false>,\n    \"emotionalFacilitationScore\": <1-5>,\n    \"overallScore\": <1-5>,\n    \"keyStrengths\": [\"<strength 1>\", \"<strength 2>\"],\n    \"areasForImprovement\": [\"<improvement 1>\", \"<improvement 2>\"],\n    \"summary\": \"<one paragraph overall assessment focusing on emotional facilitation>\"\n  }\n}\n\nRespond ONLY with valid JSON, no other text.',
  true,
  true,
  NULL
);
```

---

## 4. New Evaluation Prompt Design

### 4.1 Arc Context Injection

When `includes_arc_context` is true, the service must inject the arcs from `prompt_templates` into the `{emotional_arcs}` placeholder.

**Format for arc injection:**

```text
1. **Confusion → Clarity** (`confusion_to_clarity`)
   Structure: Turn 1: Express confusion → Turn 2: Normalize + educate → Turn 3: Follow-up + understanding → Turn 4: Clarity + confidence

2. **Shame → Acceptance** (`shame_to_acceptance`)
   Structure: Turn 1: Reveal shame + apologetic → Turn 2: Normalize powerfully + reframe → Turn 3: Vulnerable details + relief → Turn 4: Path forward + hope

... (all arcs from prompt_templates table)
```

### 4.2 Response Schema Differences

The arc-aware evaluator returns an enhanced schema with:

```typescript
interface ArcAwareEvaluation {
  emotionalStateAnalysis: {
    startState: {
      primaryEmotion: string;
      secondaryEmotion?: string;
      intensity: number;
      valence: 'negative' | 'neutral' | 'positive';
    };
    projectedEndState: {
      primaryEmotion: string;
      intensity: number;
      valence: 'negative' | 'neutral' | 'positive';
    };
    emotionalMovement: {
      valenceShift: 'improved' | 'maintained' | 'worsened';
      intensityChange: 'reduced' | 'unchanged' | 'increased';
      movementQuality: number;  // 1-5
      movementNotes: string;
    };
  };
  arcAlignment: {
    detectedArc: string;  // arc_key or "none"
    arcMatchConfidence: number;  // 0.0-1.0
    alignmentNotes: string;
  };
  empathyEvaluation: { /* same as before */ };
  voiceConsistency: { /* same as before */ };
  conversationQuality: { /* same as before */ };
  overallEvaluation: {
    wouldUserFeelHelped: boolean;
    emotionalFacilitationScore: number;  // NEW: 1-5
    overallScore: number;  // 1-5
    keyStrengths: string[];
    areasForImprovement: string[];
    summary: string;
  };
}
```

---

## 5. Service Layer Changes

### 5.1 File: [`test-service.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/lib/services/test-service.ts)

#### 5.1.1 New Imports

```typescript
// Add to imports section (top of file)
import { createServerSupabaseClient } from '@/lib/supabase-server';
// ... existing imports
```

#### 5.1.2 New Function: `getEvaluationPrompt`

Add after the `EVALUATION_PROMPT` constant (around line 82):

```typescript
/**
 * Fetch evaluation prompt from database
 * Falls back to legacy hardcoded prompt if not found
 */
async function getEvaluationPrompt(
  evaluationPromptId?: string
): Promise<{
  id: string;
  name: string;
  promptTemplate: string;
  includesArcContext: boolean;
  model: string;
  maxTokens: number;
}> {
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
    console.warn('Using fallback legacy evaluation prompt');
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
```

#### 5.1.3 New Function: `getEmotionalArcsContext`

Add after `getEvaluationPrompt`:

```typescript
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
```

#### 5.1.4 Modify Function: `evaluateWithClaude`

Update the function signature and implementation (lines 87-116):

```typescript
/**
 * Evaluate a response using Claude-as-Judge
 * 
 * @param userPrompt - The user's question
 * @param systemPrompt - The system prompt used
 * @param response - The advisor's response
 * @param evaluationPromptId - Optional ID of the evaluation prompt to use
 */
async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string,
  evaluationPromptId?: string
): Promise<ClaudeEvaluation> {
  // Fetch the evaluation prompt configuration
  const promptConfig = await getEvaluationPrompt(evaluationPromptId);
  
  // Build the prompt with variable substitution
  let prompt = promptConfig.promptTemplate
    .replace('{user_prompt}', userPrompt)
    .replace('{system_prompt}', systemPrompt || 'General financial planning advice')
    .replace('{response}', response);
  
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

#### 5.1.5 Modify Function: `runABTest`

Update the function to accept and store `evaluationPromptId` (around lines 272-298):

```typescript
// In the evaluation block (around line 273):
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
    updates.evaluation_prompt_id = request.evaluationPromptId || null;  // NEW
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
  } catch (evalError) {
    // ... existing error handling
  }
}
```

#### 5.1.6 New Export Function: `getAvailableEvaluators`

Add a new exported function at the end of the file:

```typescript
/**
 * Get all available evaluation prompts for the UI dropdown
 */
export async function getAvailableEvaluators(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    isDefault: boolean;
  }>;
  error?: string;
}> {
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
    data: data.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      isDefault: row.is_default,
    })),
  };
}
```

---

## 6. API Route Changes

### 6.1 Modify: [`/api/pipeline/adapters/test/route.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/api/pipeline/adapters/test/route.ts)

Update the POST handler to accept `evaluationPromptId`:

```typescript
// Around line 78, add validation for new field:
if (body.evaluationPromptId !== undefined && typeof body.evaluationPromptId !== 'string') {
  return NextResponse.json(
    { success: false, error: 'evaluationPromptId must be a string' },
    { status: 400 }
  );
}

// Around line 86, update the request object:
const testRequest: RunTestRequest = {
  jobId: body.jobId,
  userPrompt: body.userPrompt.trim(),
  systemPrompt: body.systemPrompt,
  enableEvaluation: body.enableEvaluation ?? false,
  evaluationPromptId: body.evaluationPromptId,  // NEW
};
```

### 6.2 New Route: `/api/pipeline/evaluators/route.ts`

Create a new file at `src/app/api/pipeline/evaluators/route.ts`:

```typescript
/**
 * Evaluators API
 *
 * GET /api/pipeline/evaluators
 * Retrieve available evaluation prompts for the UI dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAvailableEvaluators } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getAvailableEvaluators();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('GET /api/pipeline/evaluators error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
```

---

## 7. UI Component Changes

### 7.1 File: [`ABTestingPanel.tsx`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/components/pipeline/ABTestingPanel.tsx)

#### 7.1.1 Add Imports

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvaluators } from '@/hooks/useAdapterTesting';  // NEW HOOK
```

#### 7.1.2 Add State and Hook

Inside `ABTestingPanel` function, after existing state declarations:

```typescript
const [selectedEvaluator, setSelectedEvaluator] = useState<string | undefined>(undefined);
const { data: evaluatorsData, isLoading: evaluatorsLoading } = useEvaluators();
const evaluators = evaluatorsData?.data || [];
const defaultEvaluator = evaluators.find(e => e.isDefault);
```

#### 7.1.3 Update handleRunTest

```typescript
const handleRunTest = async () => {
  if (!userPrompt.trim()) return;

  try {
    await runTest({
      jobId,
      userPrompt: userPrompt.trim(),
      systemPrompt: systemPrompt.trim() || undefined,
      enableEvaluation,
      evaluationPromptId: selectedEvaluator || defaultEvaluator?.id,  // NEW
    });
  } catch (error) {
    console.error('Test failed:', error);
  }
};
```

#### 7.1.4 Add Evaluator Dropdown UI

Insert this JSX after the "Enable Claude-as-Judge Evaluation" switch (around line 160):

```tsx
{/* Evaluator Selection - only show when evaluation enabled */}
{enableEvaluation && (
  <div className="space-y-2 mt-4">
    <Label htmlFor="evaluator-select" className="flex items-center gap-2">
      <span>Evaluation Method</span>
      <span className="text-xs text-muted-foreground font-normal">
        (determines how responses are scored)
      </span>
    </Label>
    <Select
      value={selectedEvaluator || defaultEvaluator?.id || ''}
      onValueChange={setSelectedEvaluator}
      disabled={!endpointsReady || evaluatorsLoading}
    >
      <SelectTrigger id="evaluator-select" className="w-full md:w-[400px]">
        <SelectValue placeholder={evaluatorsLoading ? "Loading evaluators..." : "Select an evaluator"} />
      </SelectTrigger>
      <SelectContent>
        {evaluators.map((evaluator) => (
          <SelectItem key={evaluator.id} value={evaluator.id}>
            <div className="flex flex-col">
              <span className="font-medium">
                {evaluator.displayName}
                {evaluator.isDefault && (
                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                )}
              </span>
              {evaluator.description && (
                <span className="text-xs text-muted-foreground">
                  {evaluator.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### 7.2 File: [`useAdapterTesting.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/hooks/useAdapterTesting.ts)

#### 7.2.1 Add to Query Keys

```typescript
evaluators: () => [...adapterTestingKeys.all, 'evaluators'] as const,
```

#### 7.2.2 Add API Function

```typescript
// Get available evaluators
async function getAvailableEvaluators(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    isDefault: boolean;
  }>;
  error?: string;
}> {
  const response = await fetch('/api/pipeline/evaluators', {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch evaluators: ${response.status}`);
  }
  
  return response.json();
}
```

#### 7.2.3 Add Hook

```typescript
/**
 * Hook to fetch available evaluation prompts
 * 
 * @returns Query with evaluator options
 */
export function useEvaluators() {
  return useQuery({
    queryKey: adapterTestingKeys.evaluators(),
    queryFn: getAvailableEvaluators,
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
  });
}
```

#### 7.2.4 Update RunTestRequest Interface Usage

In the `runABTest` function, ensure `evaluationPromptId` is passed through:

```typescript
async function runABTest(params: RunTestRequest): Promise<RunTestResponse> {
  const response = await fetch('/api/pipeline/adapters/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: params.jobId,
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      enableEvaluation: params.enableEvaluation,
      evaluationPromptId: params.evaluationPromptId,  // NEW
    }),
    credentials: 'include',
  });
  
  // ... rest of function
}
```

---

## 8. Type System Updates

### 8.1 File: [`pipeline-adapter.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/types/pipeline-adapter.ts)

#### 8.1.1 Update `RunTestRequest`

```typescript
export interface RunTestRequest {
  jobId: string;
  userPrompt: string;
  systemPrompt?: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;  // NEW
}
```

#### 8.1.2 Update `TestResult`

```typescript
export interface TestResult {
  // ... existing fields ...
  
  // Evaluation
  evaluationEnabled: boolean;
  evaluationPromptId: string | null;  // NEW
  controlEvaluation: ClaudeEvaluation | null;
  adaptedEvaluation: ClaudeEvaluation | null;
  evaluationComparison: EvaluationComparison | null;
  
  // ... rest of existing fields ...
}
```

#### 8.1.3 Add New Types for Arc-Aware Evaluation

```typescript
// Enhanced emotional state for arc-aware evaluation
export interface ExtendedEmotionalState {
  primaryEmotion: string;
  secondaryEmotion?: string;
  intensity: number;
  valence: 'negative' | 'neutral' | 'positive';
}

export interface EmotionalMovement {
  valenceShift: 'improved' | 'maintained' | 'worsened';
  intensityChange: 'reduced' | 'unchanged' | 'increased';
  movementQuality: number;
  movementNotes: string;
}

export interface ArcAlignment {
  detectedArc: string;
  arcMatchConfidence: number;
  alignmentNotes: string;
}

// Evaluator metadata for UI dropdown
export interface EvaluatorOption {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isDefault: boolean;
}
```

---

## 9. Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `evaluation_prompts` table using SAOL
- [ ] Add `evaluation_prompt_id` column to `pipeline_test_results`
- [ ] Insert seed data for legacy and arc-aware prompts
- [ ] Test database queries

### Phase 2: Service Layer
- [ ] Add `getEvaluationPrompt` function to `test-service.ts`
- [ ] Add `getEmotionalArcsContext` function to `test-service.ts`
- [ ] Modify `evaluateWithClaude` to accept and use `evaluationPromptId`
- [ ] Modify `runABTest` to pass `evaluationPromptId`
- [ ] Add `getAvailableEvaluators` export function
- [ ] Update `src/lib/services/index.ts` exports

### Phase 3: API Routes
- [ ] Update `/api/pipeline/adapters/test/route.ts` POST handler
- [ ] Create new `/api/pipeline/evaluators/route.ts`
- [ ] Test API endpoints

### Phase 4: Type System
- [ ] Update `RunTestRequest` interface
- [ ] Update `TestResult` interface
- [ ] Add new type definitions

### Phase 5: UI Components
- [ ] Add `useEvaluators` hook to `useAdapterTesting.ts`
- [ ] Add evaluator dropdown to `ABTestingPanel.tsx`
- [ ] Update test submission to include selected evaluator
- [ ] Test end-to-end flow

### Phase 6: Testing
- [ ] Test legacy evaluator still works
- [ ] Test arc-aware evaluator with arc injection
- [ ] Test UI dropdown selection
- [ ] Verify evaluator ID is stored in test results

---

## 10. SAOL Usage Instructions

> [!CAUTION]
> **ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.

Reference: [`supabase-agent-ops-library-use-instructions.md`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md)

### 10.1 Creating the Table

```javascript
// Run from: c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  // SAOL doesn't create tables directly - use migrations via Supabase CLI
  // or execute raw SQL through the service role connection
  
  // For schema inspection:
  const schema = await saol.agentIntrospectSchema({ 
    table: 'evaluation_prompts',
    trace: true 
  });
  console.log(schema);
})();
```

### 10.2 Inserting Seed Data

```javascript
const result = await saol.agentInsert({
  table: 'evaluation_prompts',
  values: {
    name: 'arc_aware_v1',
    display_name: 'Arc-Aware Evaluator (v1)',
    description: 'Enhanced evaluation with emotional arc context',
    prompt_template: '...',
    includes_arc_context: true,
    is_active: true,
    is_default: true,
  },
  trace: true
});
```

### 10.3 Querying Data

```javascript
const result = await saol.agentQuery({
  table: 'evaluation_prompts',
  select: 'id, name, display_name, is_default',
  filter: { is_active: true },
  order: 'display_name',
  limit: 10,
  trace: true
});
```

---

## Appendix A: File Reference Summary

| File | Purpose | Key Changes |
|------|---------|-------------|
| [`test-service.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/lib/services/test-service.ts) | Evaluation logic | Add prompt fetching, arc injection |
| [`route.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/api/pipeline/adapters/test/route.ts) | Test API | Accept `evaluationPromptId` |
| [`ABTestingPanel.tsx`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/components/pipeline/ABTestingPanel.tsx) | Test UI | Add evaluator dropdown |
| [`useAdapterTesting.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/hooks/useAdapterTesting.ts) | React hooks | Add `useEvaluators` hook |
| [`pipeline-adapter.ts`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/types/pipeline-adapter.ts) | Type definitions | Update request/result types |
| NEW: `evaluators/route.ts` | Evaluators API | New endpoint |

---

## Appendix B: Related Documents

- [`arc-measurement-current_v1.md`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/arc-measurement-current_v1.md) — Documentation of current measurement system
- [`supabase-agent-ops-library-use-instructions.md`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md) — SAOL usage reference
- [`file-7-conversations-3-turns-6.json`](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/multi/workfiles/file-7-conversations-3-turns-6.json) — Example LoRA training data with emotional arcs

---

*End of Specification*
