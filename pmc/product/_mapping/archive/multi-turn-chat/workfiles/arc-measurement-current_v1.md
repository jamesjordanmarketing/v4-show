# Current Emotional Arc Measurement System

**Version:** 1.0  
**Date:** January 27, 2026  
**Purpose:** Precise documentation of how emotional arcs are currently measured between Control and Adapted responses

---

## Executive Summary

The current measurement system evaluates emotional arcs **only at the conversation level** (start state → end state), not on a per-turn basis. There is **no forensic analysis of progressive emotional states**. Emotional states are **inferred dynamically by Claude-as-Judge** at evaluation time—they are not pre-defined in any database table or prompt template.

---

## Part 1: The Measurement Process (Input to Output)

### 1.1 Input

The measurement process begins when a user submits a prompt on the test page with "Claude-as-Judge" enabled:

```
Input:
├─ userPrompt: "I'm 45 and embarrassed I only have $12,000 saved..."
├─ systemPrompt: "You are an emotionally intelligent financial advisor..."
└─ enableEvaluation: true
```

### 1.2 Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: Generate Responses                                          │
│                                                                      │
│   userPrompt + systemPrompt                                          │
│              ▼                                                       │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │ Control Endpoint │    │ Adapted Endpoint │                      │
│   │ (Base Llama-3.1) │    │ (LoRA Adapter)   │                      │
│   └────────┬─────────┘    └────────┬─────────┘                      │
│            ▼                       ▼                                 │
│   controlResponse            adaptedResponse                         │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: Claude-as-Judge Evaluation (PARALLEL)                       │
│                                                                      │
│   evaluateWithClaude(prompt, controlResponse)                        │
│   evaluateWithClaude(prompt, adaptedResponse)                        │
│              ▼                       ▼                               │
│   controlEvaluation            adaptedEvaluation                     │
│   (ClaudeEvaluation)           (ClaudeEvaluation)                    │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Comparison                                                   │
│                                                                      │
│   compareEvaluations(controlEval, adaptedEval)                       │
│              ▼                                                       │
│   EvaluationComparison                                               │
│   ├─ winner: "control" | "adapted" | "tie"                          │
│   ├─ improvements: ["Higher empathy score", ...]                    │
│   └─ regressions: ["Lower voice consistency", ...]                  │
└─────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Storage                                                      │
│                                                                      │
│   Saved to pipeline_test_results table:                              │
│   ├─ control_evaluation (JSONB)                                      │
│   ├─ adapted_evaluation (JSONB)                                      │
│   └─ evaluation_comparison (JSONB)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Output

The final output stored in the database:

```json
{
  "control_evaluation": {
    "emotionalProgression": {
      "startState": { "primaryEmotion": "shame", "intensity": 0.85 },
      "endState": { "primaryEmotion": "informed", "intensity": 0.4 },
      "arcCompleted": false,
      "progressionQuality": 2,
      "progressionNotes": "Response jumps directly to advice..."
    },
    "empathyEvaluation": { ... },
    "voiceConsistency": { ... },
    "overallEvaluation": { "overallScore": 2.5 }
  },
  "adapted_evaluation": { ... same structure ... },
  "evaluation_comparison": {
    "winner": "adapted",
    "scoreDifference": 2.5,
    "improvements": ["Higher empathy score", "Completed emotional arc"],
    "regressions": []
  }
}
```

---

## Part 2: Answers to Specific Questions

### Q1: Do we measure only the emotional state at the 1st arc turn to the emotional state of the last arc turn?

**Answer: YES — but with important nuance.**

The current system measures:
- `startState`: The emotional state Claude **infers the user was in** based on their prompt
- `endState`: The emotional state Claude **infers the user would be in** after reading the response

This is NOT measuring the user's actual emotional journey. It's Claude's assessment of:
1. "What emotion is this user expressing in their question?"
2. "What emotion would this user likely feel after receiving this response?"

**Source:** `test-service.ts` lines 42-48:
```typescript
"emotionalProgression": {
  "startState": { "primaryEmotion": "<detected starting emotion>", "intensity": <0.0-1.0> },
  "endState": { "primaryEmotion": "<detected ending emotion>", "intensity": <0.0-1.0> },
  "arcCompleted": <true/false>,
  "progressionQuality": <1-5>,
  "progressionNotes": "<brief explanation>"
}
```

---

### Q2: Do we measure as a progression from one state to the next in each turn?

**Answer: NO — per-turn measurement does not exist.**

The current system is **single-turn only**. Each test submission is:
1. One user prompt → One control response + One adapted response
2. One evaluation of each response
3. No memory of previous turns

The chat feature on the test page can only submit one prompt at a time. There is no concept of "turns" in the current measurement system.

**Current limitation:** Even if you submit multiple tests in sequence, they are treated as independent evaluations. There is no linkage or cumulative arc tracking.

---

### Q3: Are the emotional interstitial states defined anywhere?

**Answer: NO — Emotional states are NOT pre-defined anywhere.**

I searched for:
- Prompt templates table: **No emotional state definitions found**
- Business logic: **Claude infers emotions dynamically**

The emotional arc vocabulary (e.g., "shame → acceptance", "confusion → clarity") exists only in:
1. **Training data** (`training6-12.jsonl`) — as `emotional_arc` metadata
2. **Claude's inference** — at evaluation time

Claude is given NO predefined list of emotions. The `EVALUATION_PROMPT` simply asks Claude to detect the "starting emotion" and "ending emotion" as free-form strings.

**Example from training data:**
```json
{
  "emotional_arc": "Shame → Acceptance",
  "emotional_arc_key": "shame_to_acceptance"
}
```

But this is training metadata — it is NOT fed to Claude-as-Judge during evaluation.

---

### Q4: Are all emotional states stored forever for each conversation?

**Answer: YES — stored as JSONB in `pipeline_test_results` table.**

Each test result permanently stores:
- `control_evaluation` (JSONB) — contains `emotionalProgression.startState` and `.endState`
- `adapted_evaluation` (JSONB) — contains `emotionalProgression.startState` and `.endState`

**However:**
- Only 2 states are stored per response (start + end)
- No array of interstitial states
- No per-turn history for multi-turn conversations

**Schema (relevant fields):**
```sql
pipeline_test_results (
  id UUID,
  user_prompt TEXT,
  control_response TEXT,
  adapted_response TEXT,
  control_evaluation JSONB,      -- Contains emotionalProgression
  adapted_evaluation JSONB,      -- Contains emotionalProgression
  evaluation_comparison JSONB,
  user_rating TEXT,
  user_notes TEXT
)
```

---

### Q5: Do we measure emotion alignment per each step?

**Answer: NO — impossible with current single-turn system.**

The current chat feature supports only one question per session. Per-turn measurement would require:
1. Multi-turn chat capability (not yet implemented)
2. Claude evaluation after each turn
3. Database schema for storing per-turn emotional states

The proposed `conversations-evaluation-collation-dataset-JSON_v1.json` schema **does include** a structure for per-turn tracking:
```json
{
  "multi_turn_progression": [
    { "turn": 1, "emotion": "fear", "intensity": 0.9 },
    { "turn": 2, "emotion": "acknowledged", "intensity": 0.6 },
    { "turn": 3, "emotion": "hopeful", "intensity": 0.4 }
  ]
}
```

But this is **not yet implemented** in the actual measurement system.

---

### Q6: Is per-turn measurement a wise decision?

**Answer: It depends on the evaluation goal.**

**Argument FOR per-turn measurement:**
- Emotional arcs are defined as progressions (e.g., "shame → heard → relieved → hopeful")
- Training data explicitly models these stages
- Fine-grained measurement would reveal WHERE the adapter excels/fails
- Could identify specific turn where arc derails

**Argument AGAINST per-turn measurement:**
- Higher cost (Claude evaluation per turn)
- More complex scoring system
- User may fluctuate naturally — not every turn should "progress"
- End-state may be all that matters for business outcomes

**Current reality:** We did NOT do forensic-level analysis of progressive emotional states. The system assumes the arc is either "completed" or "not completed" based on start→end comparison only.

**Recommendation:** For the emotional intelligence use case, a per-turn measurement would be valuable because the training data explicitly defines intermediate states. The adapter is trained to guide users through stages, not just achieve an end state.

---

### Q7: How does "Claude as Judge" compare Control vs Adapted?

**Answer: The `compareEvaluations` function in `test-service.ts`**

Here is the exact comparison logic:

```typescript
function compareEvaluations(
  controlEval: ClaudeEvaluation,
  adaptedEval: ClaudeEvaluation
): EvaluationComparison {
  
  // 1. Compare overall scores
  const controlScore = controlEval.overallEvaluation.overallScore;  // 1-5
  const adaptedScore = adaptedEval.overallEvaluation.overallScore;  // 1-5
  const scoreDiff = adaptedScore - controlScore;

  // 2. Determine winner (0.5 threshold)
  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';

  // 3. Identify specific improvements/regressions
  const improvements: string[] = [];
  const regressions: string[] = [];

  if (adaptedEval.empathyEvaluation.empathyScore > controlEval.empathyEvaluation.empathyScore) {
    improvements.push('Higher empathy score');
  }
  
  if (adaptedEval.voiceConsistency.voiceScore > controlEval.voiceConsistency.voiceScore) {
    improvements.push('Better voice consistency');
  }
  
  if (adaptedEval.emotionalProgression.arcCompleted && 
      !controlEval.emotionalProgression.arcCompleted) {
    improvements.push('Completed emotional arc');
  }
  
  // ... similar logic for regressions
  
  return {
    winner,
    controlOverallScore: controlScore,
    adaptedOverallScore: adaptedScore,
    scoreDifference: scoreDiff,
    improvements,
    regressions,
    summary: `The ${winner} response performed better...`
  };
}
```

**Key points:**
- Winner is determined by **overall score difference** (> 0.5 = win)
- Individual metrics (empathy, voice, arc) are logged but don't override overall score
- Tie occurs when scores are within ±0.5

#### Detailed Human Explanation

Here's exactly what happens when the system compares the Control and Adapted responses:

**Step 1: Extract the Overall Scores**

After Claude-as-Judge evaluates both responses independently, each has an `overallScore` (a number from 1 to 5). The system pulls these two numbers:
- **Control score** — e.g., `2.5` (the base model's performance)
- **Adapted score** — e.g., `4.0` (the LoRA-tuned model's performance)

**Step 2: Calculate the Difference**

The system subtracts: `adaptedScore - controlScore`

Using the example above: `4.0 - 2.5 = 1.5`

This "score difference" tells us how much better (positive) or worse (negative) the adapted model performed compared to the base model.

**Step 3: Determine the Winner (with 0.5 Threshold)**

The system applies a **margin rule** to avoid declaring winners on razor-thin differences:

| If Score Difference Is... | Winner Is... |
|---------------------------|--------------|
| Greater than +0.5 | **Adapted wins** (the LoRA model is significantly better) |
| Less than -0.5 | **Control wins** (the base model is significantly better) |
| Between -0.5 and +0.5 | **Tie** (too close to call) |

In our example: `1.5 > 0.5` → **Adapted wins**

> **Why 0.5?** This threshold is arbitrary. It exists to prevent noise-level differences (e.g., `3.1 vs 3.2`) from being called "wins." However, it has no statistical basis—it's a design choice.

**Step 4: Identify What Improved or Regressed**

Regardless of who won, the system also documents *what specifically* was better or worse. It checks three dimensions:

1. **Empathy Score** — If the adapted model's empathy score is higher than control's, add "Higher empathy score" to improvements.

2. **Voice Consistency** — If the adapted model maintained a more consistent voice, add "Better voice consistency" to improvements.

3. **Arc Completion** — If the adapted model completed the emotional arc AND the control model did NOT, add "Completed emotional arc" to improvements.

The same logic runs in reverse to populate the `regressions` list (e.g., "Lower voice consistency" if adapted scored worse).

**Step 5: Assemble the Final Output**

The function returns a structured object containing:

| Field | Meaning | Example Value |
|-------|---------|---------------|
| `winner` | Who won | `"adapted"` |
| `controlOverallScore` | Base model's score | `2.5` |
| `adaptedOverallScore` | LoRA model's score | `4.0` |
| `scoreDifference` | Gap between them | `1.5` |
| `improvements` | List of areas where adapted beat control | `["Higher empathy score", "Completed emotional arc"]` |
| `regressions` | List of areas where adapted lost to control | `[]` |
| `summary` | Human-readable sentence | `"The adapted response performed better..."` |

**Summary in One Sentence:**

> The comparison function declares a winner based on overall score difference (with a 0.5 cushion to prevent false positives), then itemizes specific dimension-level improvements or regressions for diagnostic purposes.

---

### Q8: How does the prompt determine the question for each turn? Is there global guidance?

**Answer: YES in training templates, NO in evaluation.**

There are **two separate prompts** serving different purposes, and they do NOT share multi-turn guidance:

#### 1. Training Data Generation Prompt (HAS Global Guidance)

The `prompt_templates` table contains a `template_text` field with explicit per-turn instructions. Here's an actual example from the "Confusion → Clarity" template:

```
## Emotional Arc Pattern: {{emotional_arc_name}}

**Turn 1:**
- User expresses confusion about {{topic_name}}
- Likely includes self-deprecation ("this might sound stupid")
- Shows decision paralysis from complexity
- **Elena Response:** Normalize confusion, reframe to positive, offer to break down complexity

**Turn 2:**
- User provides details, shows slight relief at normalization
- May reveal specific decision to be made
- **Elena Response:** Break concept into simple steps, use concrete numbers, ask permission to educate

**Turn 3-4:**
- User asks follow-up questions, shows growing understanding
- May express concern about making wrong choice
- **Elena Response:** Continue education, validate fears, provide specific actionable guidance

**Turn 5 (if applicable):**
- User expresses clarity and readiness to act
- May show gratitude or empowerment
- **Elena Response:** Celebrate transformation, reinforce confidence, offer continued support
```

This is **exactly the kind of global guidance you're asking about**. It tells the model:
- "With each answer, move the chat toward the desired end state"
- Specific emotional checkpoints at each turn
- Expected user behavior and ideal response strategy per turn

**Where this is used:** These templates are used by Claude to **generate synthetic training conversations**. The training data contains examples of properly guided multi-turn arcs.

**Where this is NOT used:** During A/B testing evaluation.

---

#### 2. Evaluation Prompt (NO Multi-Turn Guidance)

The `EVALUATION_PROMPT` in `test-service.ts` receives only:

```
USER'S QUESTION:
{user_prompt}

SYSTEM CONTEXT:
{system_prompt}

ADVISOR'S RESPONSE:
{response}
```

It does **NOT** receive:
- ❌ The intended emotional arc (e.g., "shame → acceptance")
- ❌ The expected intermediate states
- ❌ What turn number this is
- ❌ What the previous turns were (single-turn only)
- ❌ Any "move toward end state" instruction

**Consequence:** Claude-as-Judge evaluates each response **without knowing the larger arc intent**. It infers start/end emotional states, but has no reference to compare against.

---

#### Summary Table: Where Does Guidance Exist?

| Context | Multi-Turn Guidance? | Source |
|---------|---------------------|--------|
| Training data generation | ✅ YES | `prompt_templates.template_text` |
| A/B test inference | ❌ NO | Inference endpoints receive only user prompt + system prompt |
| Claude-as-Judge evaluation | ❌ NO | `EVALUATION_PROMPT` has no arc context |

---

#### The Gap

The adapter was **trained** on conversations that followed explicit per-turn emotional guidance:
> "Turn 1: Normalize → Turn 2: Educate → Turn 3: Validate → Turn 4: Celebrate"

But the adapter is **evaluated** without this context. Claude-as-Judge doesn't know:
- What arc the adapter was supposed to follow
- Whether the detected emotions match the intended progression
- What turn we're on in the arc

**Recommendation:** To properly evaluate whether the adapter is following its training intent, the evaluation prompt should include:
1. The intended emotional arc (from `prompt_templates.emotional_arc_type`)
2. The expected intermediate emotional states per turn
3. Current turn number (for multi-turn testing)

---

## Part 3: What Is Being Measured (Summary)

| Dimension | Measured? | How? | Stored? |
|-----------|-----------|------|---------|
| **Start emotional state** | ✅ Yes | Claude infers from user prompt | JSONB |
| **End emotional state** | ✅ Yes | Claude infers from response | JSONB |
| **Interstitial states** | ❌ No | Not implemented | — |
| **Per-turn progression** | ❌ No | Single-turn only | — |
| **Arc completion** | ✅ Yes | Claude's boolean judgment | JSONB |
| **Progression quality** | ✅ Yes | Claude's 1-5 score | JSONB |
| **Empathy score** | ✅ Yes | Claude's 1-5 score | JSONB |
| **Voice consistency** | ✅ Yes | Claude's 1-5 score | JSONB |
| **Overall score** | ✅ Yes | Claude's 1-5 score | JSONB |
| **Control vs Adapted winner** | ✅ Yes | `compareEvaluations` function | JSONB |

---

## Part 4: Key Gaps in Current Measurement

### Gap 1: No Pre-Defined Emotional Vocabulary
Claude invents emotion labels on the fly. "shame" and "embarrassment" might be used interchangeably, making aggregation difficult.

**Impact:** Can't reliably count "how many times did the adapter achieve shame → acceptance?"

### Gap 2: No Per-Turn Measurement
The adapter is trained on multi-stage arcs (e.g., shame → heard → relieved → hopeful), but we only measure start and end.

**Impact:** Can't determine if adapter is successfully guiding users through intermediate stages.

### Gap 3: No Objective "Expected" Arc
Claude judges arc completion subjectively. We don't tell Claude "the expected arc is shame → acceptance."

**Impact:** Claude might mark an arc "completed" even if it doesn't match training intent.

### Gap 4: Winner Threshold is Arbitrary
The 0.5 score difference to declare a winner has no empirical basis.

**Impact:** Close scores are all "ties" even if one consistently edges out the other.

---

## Part 5: Recommendations for Future Measurement

### Recommendation 1: Define Expected Arcs
Pass the intended emotional arc to Claude as part of the evaluation prompt:
```
INTENDED ARC: shame → acceptance
Evaluate whether this response moves the user along this arc.
```

### Recommendation 2: Standardize Emotion Vocabulary
Provide Claude with a fixed list of valid emotions to ensure consistent labeling:
```
Valid primary emotions: shame, fear, confusion, frustration, anger, hope, relief, clarity, acceptance
```

### Recommendation 3: Implement Per-Turn Evaluation (with Multi-Turn Chat)
Once multi-turn chat is implemented, add per-turn Claude evaluation:
```json
{
  "turn_evaluations": [
    { "turn": 1, "detected_emotion": "shame", "expected_emotion": "shame", "aligned": true },
    { "turn": 2, "detected_emotion": "heard", "expected_emotion": "heard", "aligned": true },
    { "turn": 3, "detected_emotion": "informed", "expected_emotion": "relieved", "aligned": false }
  ]
}
```

### Recommendation 4: Weighted Comparison
Consider weighting dimensions based on training intent:
- For emotional intelligence adapter: Empathy × 2, Arc completion × 1.5, Voice × 1

---

**Document Control:**
| Field | Value |
|-------|-------|
| Document ID | ANALYSIS-ARC-MEASUREMENT-v1 |
| Author | Gemini Agent |
| Created | January 27, 2026 |
| Related | test-service.ts, pipeline-adapter.ts, conversations-evaluation-collation-dataset-JSON_v1.json |
