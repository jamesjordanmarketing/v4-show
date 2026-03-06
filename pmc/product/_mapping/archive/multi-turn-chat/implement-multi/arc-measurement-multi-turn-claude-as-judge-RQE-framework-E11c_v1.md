# Response Quality Evaluator (RQE) Framework

**Evaluator Name:** `response_quality_multi_turn_v1`
**Version:** 1.0
**Date:** February 1, 2026
**Purpose:** Definitive specification of the evaluation framework, scoring logic, and evaluator prompt for Phase 1 of the evaluator algorithm refactor (E11)
**Status:** Ready for Implementation Planning

---

## Document Structure

- **Part A** (Sections 1-10): The evaluation framework — logic, standards, dimensions, scoring rules, and winner determination. This is the conceptual foundation the planning agent must understand before writing any code.
- **Part B** (Sections 11-13): The evaluator prompts — complete prompt templates, variable maps, and JSON response formats ready for database insertion.

---

# PART A: THE RQE EVALUATION FRAMEWORK

## 1. Philosophy: Why We Measure Responses, Not Inputs

### 1.1 The Defect in the Previous Evaluator

The `multi_turn_arc_aware_v1` evaluator was designed on the principle that in multi-turn conversations, the human's follow-up messages reveal their real emotional state. This is valid when humans are actually conversing.

In our testing environment, the "human" is a set of **pre-written synthetic prompts** (P1 -> F1 -> F2 -> F3 -> F4) from `response-validation-and-questions-multi_v2.md`. The emotional progression in those prompts is scripted at ~25% per follow-up. The model's response has **zero effect** on what the next user input says. Therefore, measuring the human's emotional state from these inputs measures the test data's quality, not the model's quality.

### 1.2 The RQE Principle

**We evaluate the ADVISOR'S RESPONSE directly.** The question is no longer "how does the human feel?" but **"how well did the advisor respond to the human's emotional and practical needs?"**

This works regardless of whether the inputs are synthetic or from a real human. The response quality is an inherent property of the response itself, given its context.

### 1.3 What the Evaluator Asks

For every model response, the RQE asks Claude-as-Judge:

1. **Did the advisor hear the emotion?** (Emotional Attunement)
2. **Did it understand deeply?** (Empathic Depth)
3. **Did it create safety?** (Psychological Safety)
4. **Did it empower, not lecture?** (Facilitation & Empowerment)
5. **Was the advice sound?** (Practical Guidance Quality)
6. **Did it build on the conversation?** (Conversational Continuity)
7. **If a real human read this, would they progress?** (Predicted Arc Impact)

Questions 1-6 produce the **Response Quality Score (RQS)** — an analytical breakdown of the response's qualities.
Question 7 produces the **Predicted Arc Impact (PAI)** — a holistic judgment of the response's likely real-world effect.

Together, these replace the old arc progression percentage as the primary measurement.

---

## 2. What Is Being Measured

### 2.1 Subject of Evaluation

| Aspect | Old Evaluator | RQE |
|--------|---------------|-----|
| **Subject** | Human's input message | **Advisor's response** |
| **Question** | "What is the human feeling?" | **"How well did the advisor respond?"** |
| **Data source** | `user_message` text | `control_response` / `adapted_response` text |
| **Context used** | Previous turns' human messages | Previous turns' **full exchanges** (both human messages and model responses) |
| **Output** | Arc progression % (0-100) | Response Quality Score (1-10) + Predicted Arc Impact (0-100%) |

### 2.2 Why This Differentiates Control vs Adapted

The Control (base Mistral-7B) and Adapted (LoRA fine-tuned) models receive the same input but produce different responses. The LoRA training data contains emotionally intelligent financial advisory conversations. Therefore:

- **Adapted should score higher** on: Emotional Attunement, Empathic Depth, Psychological Safety, Facilitation & Empowerment, and Predicted Arc Impact
- **Both should score similarly** on: Practical Guidance Quality (same base model, same domain knowledge)
- **Adapted may score higher** on: Conversational Continuity (if the training data modeled multi-turn coherence)

If the LoRA training was effective, the RQE will show measurable differences. If it was not, both models will score similarly — which is also a valid and important finding.

### 2.3 The User's Input Still Matters (as Context)

The human's message is NOT the subject of evaluation, but it IS critical context. The evaluator needs to see the human's message to judge whether the advisor's response was appropriate. A response that perfectly validates anxiety is wrong if the human expressed excitement. The input sets the standard against which the response is measured.

---

## 3. The Six Evaluation Dimensions

Each dimension is scored on a **1-10 integer scale**. Anchors are defined at five bands (1-2, 3-4, 5-6, 7-8, 9-10) to guide the judge. Each score must be accompanied by specific evidence from the response text.

### 3.1 D1: Emotional Attunement ("The Ear")

**Core Question:** Does the advisor hear and validate the emotion behind the human's words?

This dimension combines emotion recognition (did the advisor identify the feelings?) with validation (did it acknowledge them as legitimate?). These are measured together because recognition without validation is clinical, and validation without recognition is generic.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Deaf | 1-2 | Ignores emotional content entirely. Responds only to the factual/financial question. Treats the human as a problem to solve, not a person to help. |
| Surface | 3-4 | Acknowledges that emotions exist in a generic way ("I understand this is hard") but does not name the specific emotions or validate them. Quick pivot to advice. |
| Competent | 5-6 | Correctly identifies the primary emotion and offers basic validation ("It's understandable that you feel anxious about this"). |
| Attuned | 7-8 | Identifies primary and secondary emotions. Validates specifically: "It makes sense you feel both ashamed AND overwhelmed — carrying this weight alone is exhausting." Normalizes the experience. |
| Deeply Attuned | 9-10 | Captures the full emotional landscape including unstated or implied feelings. Validates with specificity and universalization. De-stigmatizes. The human would feel "this advisor truly gets me." |

**Failure Modes:**
- Fact-only response that ignores all emotional content
- Generic acknowledgment that could apply to any situation ("I hear you")
- Misidentifying the emotion (calling anxiety "excitement")
- Minimizing ("it's not that bad") or catastrophizing

**What It Reveals About Training:**
An untrained base model typically falls in the 3-5 range — it may acknowledge emotions exist but lacks the trained vocabulary and patterns for specific, deep validation. A well-trained model should consistently hit 7-9.

---

### 3.2 D2: Empathic Depth ("The Mirror")

**Core Question:** How deeply does the advisor demonstrate understanding of the human's internal experience?

This goes beyond recognition (D1 identifies what the human feels) to understanding (D2 grasps WHY they feel it and WHAT it means to them). It measures the advisor's theory of mind — its ability to model the human's internal world.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Shallow | 1-2 | Generic statements that could apply to anyone. No indication the advisor understands this specific person's situation. |
| Basic | 3-4 | Acknowledges the stated reason for the emotion but doesn't go deeper. "You're worried because you don't have savings." |
| Moderate | 5-6 | Connects the emotion to the person's specific circumstances with some nuance. Shows understanding of the stated experience. |
| Deep | 7-8 | Understands the meaning behind the words — the identity threat, the social shame, the future fear. Addresses what the human MEANS, not just what they SAID. |
| Profound | 9-10 | Captures unspoken subtext. Understands the full weight of the experience — what it means for their self-image, their relationships, their sense of safety. The human would feel "they understand something about me I haven't fully articulated." |

**Failure Modes:**
- Parroting back what the human said without adding understanding
- Surface empathy that doesn't connect to the specific situation
- Projection (attributing feelings the human didn't express)

**What It Reveals About Training:**
Empathic depth is the hardest quality to train. Base models typically score 3-5 — they can identify stated emotions but rarely grasp subtext. This dimension should show the largest training gap if the LoRA data modeled deep empathic exchanges.

---

### 3.3 D3: Psychological Safety ("The Space")

**Core Question:** Does the advisor create a space where the human feels safe to be vulnerable?

This measures tone, warmth, non-judgment, and genuineness. It draws from Rogers' concept of Unconditional Positive Regard: does the advisor accept the human without conditions? And from the MITI framework's assessment of partnership versus hierarchy.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Unsafe | 1-2 | Cold, clinical, robotic, or preachy. May include subtle judgment ("you should have started earlier"). The human would feel lectured or analyzed. |
| Neutral | 3-4 | Professional and polite but emotionally distant. Reads like a customer service script or a textbook. Impersonal. |
| Warm | 5-6 | Warm but somewhat formulaic. The warmth feels performed rather than felt. Correct words, but the voice lacks authenticity. |
| Genuine | 7-8 | Genuinely warm, natural, and calibrated to the emotional weight of the topic. Non-judgmental. The human would feel "this person actually cares." |
| Deeply Safe | 9-10 | Compassionate, authentic, perfectly calibrated. Removes shame by how it speaks, not just what it says. The human would feel safe revealing more. |

**Failure Modes:**
- "Customer service voice" (polished but hollow warmth)
- Clinical detachment (treating the human as a case study)
- Subtle condescension ("let me explain something basic")
- Toxic positivity ("everything will be fine!" without acknowledging the difficulty)

**What It Reveals About Training:**
Base models frequently land in the 3-5 range — they are polite and professional but lack the trained capacity for genuine warmth. The LoRA model should demonstrate more natural, less formulaic warmth if trained on authentic empathic conversations.

---

### 3.4 D4: Facilitation & Empowerment ("The Bridge")

**Core Question:** Does the advisor bridge from emotional support to practical guidance while empowering the human's agency?

This is a compound dimension that measures two interconnected qualities:
1. **Integration:** Does the response weave emotional support and practical guidance together, or are they disconnected?
2. **Empowerment:** Does the response empower the human to act, or does it prescribe, lecture, or take control?

These are measured together because the hallmark of emotionally intelligent financial advisory is the seamless flow from "I understand what you're feeling" to "here's what you can do about it" while keeping the human in the driver's seat.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Disjointed / Controlling | 1-2 | Either all emotional support with no practical path forward, or all advice with no emotional bridge. OR advice is delivered as commands ("you need to do X"). |
| Fragmented | 3-4 | Both emotional support and practical guidance exist but feel like separate sections. Hard transition: "I understand. Now, here's what to do." Advice may be directive. |
| Connected | 5-6 | Emotional acknowledgment leads into practical suggestions. The transition is noticeable but not jarring. Offers options rather than commands. |
| Integrated | 7-8 | Emotional support flows naturally into guidance. The advice feels like a natural extension of the understanding. Empowers with choices: "You might consider X, or some people find Y helpful." |
| Seamless / Empowering | 9-10 | Emotional processing enables and motivates practical action. The human feels both understood AND capable. The advice emerges from understanding, not despite it. Builds self-efficacy: "Given your strengths in X, you could..." |

**Failure Modes:**
- "Emotional dump then advice dump" — two disconnected blocks
- Unsolicited advice before the human feels heard
- Prescriptive tone ("you should", "you must", "you need to")
- Excessive hand-holding that undermines agency
- All feelings, no path forward (emotional wallowing)

**What It Reveals About Training:**
This is where training data quality shows most clearly. Base models typically jump to problem-solving (score 3-5). LoRA models trained on therapeutic conversation patterns should demonstrate the integration flow (7-9).

---

### 3.5 D5: Practical Guidance Quality ("The Compass")

**Core Question:** Is the financial/practical advice factually sound, specific enough to act on, and appropriately scaffolded to the human's current state?

This dimension measures the CONTENT quality of any practical advice given. It is the one dimension where both models should score similarly, since they share the same base model and domain knowledge. If the Adapted model scores significantly LOWER here, that signals a training regression — the LoRA fine-tuning may have degraded factual competence.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Harmful / Absent | 1-2 | Incorrect advice, harmful suggestions, or no practical guidance when the situation clearly calls for it. |
| Vague | 3-4 | Generic platitudes ("save more, spend less") with no actionable specifics. Could apply to anyone. |
| Adequate | 5-6 | Correct basic advice with some specificity. Appropriate to the general situation but not deeply tailored. |
| Strong | 7-8 | Specific, actionable steps that account for the human's stated situation. Prioritized appropriately. |
| Expert | 9-10 | Expert-level guidance with concrete details, personalized to the human's specifics, and scaffolded to build from where they are. Progressive disclosure — not overwhelming. |

**Failure Modes:**
- Factually incorrect financial advice
- Advice that's correct but premature (given before the human is emotionally ready)
- Information overload (dumping everything at once)
- Advice that's too basic for the stated situation
- No practical guidance at all when the human is asking for direction

**Scoring Rule — When No Guidance Is Appropriate:**
If the human's message is purely emotional and NOT asking for practical help (e.g., "I just feel so ashamed"), and the advisor wisely focuses on emotional support without forcing practical advice, score this dimension 6 (Adequate) with a note that guidance was appropriately deferred. Do NOT penalize a response for correctly reading that the moment calls for emotional support, not advice.

**What It Reveals About Training:**
This is a regression detector. If Adapted scores significantly lower than Control on this dimension, the LoRA training may have over-indexed on emotional language at the expense of practical competence.

---

### 3.6 D6: Conversational Continuity ("The Thread")

**Core Question:** Does the advisor build on the conversation's history, reference prior context, and maintain narrative coherence?

In multi-turn conversations, good responses don't treat each turn as independent. They reference what was discussed before, track promises made, celebrate progress, and advance the conversation's narrative arc.

| Band | Score | Anchor Description |
|------|-------|--------------------|
| Amnesiac | 1-2 | Treats the current turn as if the conversation just started. No reference to prior exchanges. |
| Vague | 3-4 | Generic references to prior discussion ("as we discussed earlier") without specifics. |
| Aware | 5-6 | References specific points from earlier turns. Shows awareness that a conversation has been happening. |
| Building | 7-8 | Explicitly builds on prior exchanges. Tracks emotional threads. Acknowledges growth ("Last time you mentioned X, and now you're saying Y — that's real progress"). |
| Masterful | 9-10 | Sophisticated narrative management. Weaves a coherent story of the human's journey. Makes the human feel their progress is seen and valued. Creates natural hooks for the next exchange. |

**Turn-Specific Anchoring:**
- **Turn 2 (first evaluated turn):** Score evaluates whether the response builds on the Turn 1 exchange. A score of 5-6 is "good for Turn 2."
- **Turns 3-5:** The bar rises. The response should demonstrate awareness of the full conversation arc. Scores of 7-8 become expected for good models.
- **Turns 6+:** At this depth, masterful continuity (9-10) means tracking multiple threads, referencing early turns, and synthesizing the journey.

**Failure Modes:**
- Repeating advice already given in earlier turns
- Contradicting prior statements
- Missing obvious emotional shifts from the conversation arc
- Failing to acknowledge something the human revealed earlier

**What It Reveals About Training:**
This is a multi-turn-specific quality. If the LoRA training data included multi-turn conversations, the Adapted model should outperform the Control on this dimension. If the training data was single-turn only, this dimension may not show differentiation.

---

## 4. Predicted Arc Impact (PAI)

### 4.1 Definition

The Predicted Arc Impact is a **separate holistic signal** that asks the judge: **"If a real human in this emotional state received this response, how likely is it they would move toward the therapeutic arc goal?"**

It is NOT a summary of the six dimensions. It is an independent judgment that captures intuitive, holistic reasoning the judge may not decompose into individual dimensions.

### 4.2 Scale

**0-100%**, where:
- **0-15%:** Response likely to cause disengagement, defensiveness, or emotional regression. The human would feel worse.
- **16-35%:** Response unlikely to help. Neutral at best, possibly unhelpful. The human would feel unheard.
- **36-55%:** Response provides some value but misses key emotional needs. The human would feel partially helped.
- **56-75%:** Response is supportive and would likely move the human forward. They would feel understood and motivated.
- **76-90%:** Response is highly effective. The human would feel deeply understood, safe, and empowered to act.
- **91-100%:** Exceptional response. The human would experience a meaningful emotional shift — a moment of breakthrough, release, or new clarity.

### 4.3 Role in the System

The PAI replaces the old `arcProgression.progressionPercentage` in the existing system. This means:
- The progress bars in the UI show PAI (0-100%) for each endpoint
- The winner declaration logic uses PAI as the primary differentiator
- The database field `control_arc_progression` / `adapted_arc_progression` can store PAI-based data

### 4.4 Relationship to Dimensions

PAI may correlate with the six dimensions but is NOT derived from them. A response might score well on individual dimensions but receive a lower PAI if the judge determines the overall effect would be weak (e.g., the response validates emotions beautifully but fails to create forward movement). Conversely, a response might score moderately on individual dimensions but receive a high PAI if the judge sees something holistically effective about the approach.

This independence is by design. It provides a cross-check against the dimensional analysis.

---

## 5. Composite Scoring: The Response Quality Score (RQS)

### 5.1 Formula

The Response Quality Score is a weighted average of the six dimensions:

```
RQS = (W1 * D1 + W2 * D2 + W3 * D3 + W4 * D4 + W5 * D5 + W6 * D6) / sum(W)
```

Where:

| Dimension | Symbol | Weight | Rationale |
|-----------|--------|--------|-----------|
| Emotional Attunement | D1 | 20% | Core EI skill; primary training target |
| Empathic Depth | D2 | 20% | Deepest differentiator between trained and untrained |
| Psychological Safety | D3 | 15% | Important for trust, but partially correlated with D1 and D2 |
| Facilitation & Empowerment | D4 | 20% | The integration quality is a hallmark of the training |
| Practical Guidance Quality | D5 | 10% | Expected to be similar between models; mainly a regression check |
| Conversational Continuity | D6 | 15% | Important for multi-turn; differentiates if training included multi-turn data |

```
RQS = 0.20*D1 + 0.20*D2 + 0.15*D3 + 0.20*D4 + 0.10*D5 + 0.15*D6
```

**Scale:** 1.0 — 10.0 (same as dimensions, one decimal place)

### 5.2 Category Grouping (for UI Display)

The six dimensions can be grouped into three categories for summary display:

| Category | Dimensions | Calculation |
|----------|-----------|-------------|
| **Emotional Intelligence** | D1 + D2 + D3 | Average of three |
| **Facilitation** | D4 | D4 value directly |
| **Communication** | D5 + D6 | Average of two |

These categories are for display convenience only. The RQS formula uses the individual dimension weights, not the category averages.

### 5.3 What RQS Tells Us

- **RQS 1-3:** Poor response quality. The advisor is functionally unhelpful.
- **RQS 4-5:** Below average. Addresses the situation but misses emotional needs.
- **RQS 6-7:** Good. Competent emotional support with adequate guidance.
- **RQS 8-9:** Excellent. Deep emotional intelligence with integrated facilitation.
- **RQS 10:** Exceptional. Unlikely to occur consistently but possible on individual turns.

---

## 6. Pairwise Comparison Framework

### 6.1 Why Pairwise Is Needed

Research from EQ-Bench 3 (Paech, 2025) demonstrates that pairwise comparison is **3x more discriminative** than rubric scoring at the top ability range. When two models both score 7/10 on individual rubrics, the rubric cannot tell them apart — but a head-to-head comparison can.

Since Control and Adapted share the same base model, their absolute scores may be close. The pairwise comparison provides a sharper signal.

### 6.2 How It Works

After both individual evaluations (Control and Adapted) are completed, a **separate evaluation call** presents both responses side-by-side and asks: "Which response better serves the human's needs?"

### 6.3 Bias Mitigation Rules

These rules are MANDATORY for the pairwise comparison:

1. **Position Randomization:** Randomly assign which response is labeled "Response A" and which is "Response B." Record the mapping. This prevents position bias (judges tend to favor the first response shown).

2. **Length Awareness:** The prompt explicitly instructs the judge to evaluate substance, not length. A shorter response that truly connects may be better than a longer one that merely covers more ground.

3. **Blind Evaluation:** The prompt does NOT reveal which response is Control and which is Adapted. The judge evaluates without knowing which model produced which response.

### 6.4 Output

The pairwise comparison produces:
- **Preferred:** "A", "B", or "tie"
- **Confidence:** 0.0 — 1.0
- **Reasoning:** 2-3 sentences explaining the preference
- **Dimension Advantages:** Which dimensions each response excels on

---

## 7. Winner Determination Logic

### 7.1 The Three-Signal System

Winner determination uses three independent signals, in priority order:

| Priority | Signal | Threshold | Decision |
|----------|--------|-----------|----------|
| 1st | Predicted Arc Impact (PAI) | Difference > 10 points | Higher PAI wins |
| 2nd | Response Quality Score (RQS) | Difference > 0.5 points | Higher RQS wins |
| 3rd | Pairwise Comparison | Confidence > 0.7 | Preferred response wins |
| Fallback | — | All below thresholds | **Tie** |

### 7.2 Logic Flow

```
IF abs(control_PAI - adapted_PAI) > 10:
    winner = whichever has higher PAI
ELSE IF abs(control_RQS - adapted_RQS) > 0.5:
    winner = whichever has higher RQS
ELSE IF pairwise.confidence > 0.7 AND pairwise.preferred != "tie":
    winner = pairwise.preferred (mapped back to control/adapted)
ELSE:
    winner = "tie"
```

### 7.3 Why PAI Is Primary

The PAI answers the most important question: "Which response would actually help a real person?" An advisor that scores 6/10 on Empathic Depth but 85% on Predicted Arc Impact may be more effective than one that scores 8/10 on Empathic Depth but only 60% on PAI. The holistic judgment captures effectiveness that dimension scores may miss.

### 7.4 Tie Rules

A tie is NOT a failure case. If both models produce similarly effective responses, that IS useful information. It means:
- The LoRA training may not have improved this particular interaction type
- OR the base model was already adequate for this prompt
- OR the differences are too subtle for the evaluator to detect

Recording ties accurately is as important as recording wins.

---

## 8. Turn-by-Turn Evaluation Rules

### 8.1 Turn 1: Full Evaluation (BEHAVIORAL CHANGE)

**Old behavior:** Turn 1 was always baseline at 0% for both endpoints. No Claude evaluation call was made.

**New behavior:** Turn 1 responses ARE evaluated using the full RQE framework. Rationale: the first response to an emotional prompt is a critical test of emotional intelligence. A model's very first response reveals whether it leads with empathy or jumps to advice.

**Turn 1 special rules:**
- D6 (Conversational Continuity) evaluates "Does the response establish a strong foundation for ongoing conversation?" rather than "Does it reference prior turns?" The anchor text in the prompt handles this automatically by framing continuity as "Does the response create conversational hooks and open doors for the human to continue?"
- PAI evaluates the first response's projected impact on a brand-new conversation.

### 8.2 Turns 2+: Standard Evaluation

For Turn 2 and beyond, the evaluation includes full conversation history as context. The judge can see all previous exchanges and evaluate how the current response builds on (or ignores) that context.

D6 (Conversational Continuity) becomes increasingly important in later turns. The anchors scale naturally — a Turn 2 response that references Turn 1 is "Aware" (5-6), while the same behavior at Turn 5 would be "Vague" (3-4) because the response should be integrating more of the conversation arc.

### 8.3 Conversation History Context

The evaluator receives the full conversation history formatted as:

```
--- Turn 1 ---
HUMAN: {user_message_for_this_endpoint}
ADVISOR: {response_for_this_endpoint}

--- Turn 2 ---
HUMAN: {user_message_for_this_endpoint}
ADVISOR: {response_for_this_endpoint}

... (all completed turns for THIS endpoint)
```

**Critical:** The history is SILOED per endpoint. The Control evaluation sees only Control responses. The Adapted evaluation sees only Adapted responses. This matches the actual conversation experience each model had.

### 8.4 What Gets Stored

Each turn stores the following evaluation data per endpoint:

```
control_evaluation: {
    responseQuality: { dimensions: {...}, rqs: number },
    predictedImpact: { score: number, reasoning: string },
    turnSummary: { strengths: [...], improvements: [...], summary: string }
}

adapted_evaluation: { ... same structure ... }

evaluation_comparison: {
    pairwise: { preferred, confidence, reasoning, dimensionAdvantages },
    rqsDifference: number,
    paiDifference: number
}

conversation_winner: {
    winner: "control" | "adapted" | "tie",
    controlRQS: number,
    adaptedRQS: number,
    controlPAI: number,
    adaptedPAI: number,
    reason: string
}
```

### 8.5 Mapping to Legacy Fields (Backward Compatibility)

For UI compatibility with existing progress bars and display components:

```
arcProgression.progressionPercentage  →  PAI (0-100)
arcProgression.detectedArc            →  "response_quality"
arcProgression.onTrack                →  PAI >= 50
arcProgression.progressionNotes       →  turnSummary.summary
```

This allows the existing `DualArcProgressionDisplay` component to render PAI on the progress bars without structural UI changes.

---

## 9. Bias Mitigation Rules

### 9.1 Verbosity Bias

Longer responses tend to score higher because they contain more evidence for the judge to reference. To mitigate:
- The evaluator prompt explicitly instructs: "Judge substance and quality, not length. A concise response that connects deeply may be superior to a lengthy one that covers more ground superficially."
- The pairwise comparison prompt reinforces this.

### 9.2 Positivity Bias

LLM judges tend to score everything 7-8/10 (central tendency bias). To mitigate:
- Anchors are defined with vivid, specific descriptions at EVERY band, including the low bands.
- The prompt instructs the judge to use the full range and provides calibration context: "A score of 5-6 represents COMPETENT performance — this is the expected baseline for a general-purpose language model. Scores of 7+ should be reserved for responses that demonstrate clear emotional intelligence above the baseline."
- Evidence is REQUIRED for every score, forcing the judge to justify rather than default.

### 9.3 Consistency Across Turns

To prevent the judge from scoring every turn identically:
- Previous turn evaluation summaries are NOT provided to the judge (unlike the old evaluator which included `{previous_evaluation_summary}`). This prevents anchoring.
- Each turn is evaluated fresh with full context but no prior scores.
- The conversation history provides context; prior evaluation scores do not.

### 9.4 Independence Between Dimensions

The prompt instructs the judge to evaluate each dimension independently before computing any summary:
- "Evaluate each dimension separately. A response may score high on Warmth but low on Practical Guidance. Do not let strength in one dimension inflate scores in others."

---

## 10. What the RQE Does NOT Measure

To be explicit about scope, the RQE framework does NOT attempt to measure:

1. **Actual human emotional state** — That was the old evaluator's job. With synthetic inputs, it's meaningless.
2. **Factual accuracy of financial advice** — Beyond "is the guidance sound," we don't fact-check specific numbers or products. That would require a domain expert, not an EI evaluator.
3. **Harmful content** — Safety and harm detection are separate concerns. The RQE assumes both models produce non-harmful responses.
4. **Response latency or generation quality** — How fast the model responded, or whether it produced coherent text. Those are measured separately by the inference system.

---

# PART B: THE EVALUATOR PROMPTS

## 11. Primary Evaluator Prompt: `response_quality_multi_turn_v1`

### 11.1 Database Record

```
name:               response_quality_multi_turn_v1
display_name:       Response Quality Evaluator (Multi-Turn v1)
description:        Evaluates advisor response quality across 6 EI dimensions
                    with predicted arc impact. Measures the model's response,
                    not the human's input.
includes_arc_context: false
model:              claude-sonnet-4-20250514
max_tokens:         3000
is_active:          true
is_default:         false
version:            1
```

### 11.2 Variable Map

| Variable | Description | Source |
|----------|-------------|--------|
| `{conversation_history}` | All prior turns for THIS endpoint (siloed) | Built by `buildConversationHistoryContext()` |
| `{current_turn}` | Current turn number | `turn.turn_number` |
| `{user_message}` | Human's message this turn | `turn.control_user_message` or `turn.adapted_user_message` |
| `{response}` | Advisor's response this turn | `turn.control_response` or `turn.adapted_response` |

Note: `{emotional_arcs}` and `{previous_evaluation_summary}` are NOT used by this evaluator.

### 11.3 Complete Prompt Template

```text
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

### 11.4 Notes on the Prompt Design

**Chain-of-thought instruction:** The prompt says "Think step-by-step" and enumerates the thinking process (identify emotions, find evidence, score independently, then holistic judgment). This follows G-Eval best practices for more reliable LLM-as-judge scoring.

**Calibration instruction:** The prompt explicitly states that 5-6 is the baseline and 7+ requires demonstrated EI above baseline. This combats central tendency bias.

**Length debiasing:** The prompt explicitly instructs against verbosity bias.

**Independence instruction:** "Score each dimension independently. Do not let strength in one dimension inflate others."

**Practical Guidance exception:** The D5 scoring note handles the case where a response correctly prioritizes emotional support over advice — it scores 6 (not lower) to avoid penalizing correct judgment.

**Conversational Continuity Turn 1 handling:** The D6 note handles Turn 1 by reframing continuity as "establishes a strong foundation" rather than "references prior turns."

---

## 12. Pairwise Comparison Prompt: `response_quality_pairwise_v1`

### 12.1 Database Record

```
name:               response_quality_pairwise_v1
display_name:       Response Quality Pairwise Comparison (v1)
description:        Head-to-head comparison of two advisor responses to the
                    same human message. Used alongside the primary evaluator
                    for sharper winner determination.
includes_arc_context: false
model:              claude-sonnet-4-20250514
max_tokens:         1500
is_active:          true
is_default:         false
version:            1
```

### 12.2 Variable Map

| Variable | Description | Source |
|----------|-------------|--------|
| `{conversation_history}` | Prior turns (use CONTROL endpoint's history for consistency) | Built by `buildConversationHistoryContext('control')` |
| `{current_turn}` | Current turn number | `turn.turn_number` |
| `{user_message}` | Human's message (use control's message; if different, show both) | `turn.control_user_message` |
| `{response_a}` | First response (randomly assigned) | Control or Adapted response |
| `{response_b}` | Second response (randomly assigned) | The other response |

### 12.3 Complete Prompt Template

```text
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

### 12.4 Position Randomization Protocol

Before calling this prompt, the system MUST:

1. Generate a random boolean (e.g., `Math.random() > 0.5`)
2. If true: Response A = Control, Response B = Adapted
3. If false: Response A = Adapted, Response B = Control
4. Record the mapping
5. After receiving the result, translate the preferred response back to "control" or "adapted"

This prevents any systematic position bias from affecting results.

---

## 13. JSON Response Types (Reference for Planning Agent)

These are the TypeScript-style type definitions the planning agent will need to implement. They describe the shape of the evaluation data, not the database schema.

```typescript
// === Individual Evaluation Result (one per endpoint per turn) ===

interface RQEDimensionScore {
  score: number;        // 1-10 integer
  evidence: string;     // Specific quotes or observations
}

interface RQEResponseQuality {
  d1_emotionalAttunement: RQEDimensionScore;
  d2_empathicDepth: RQEDimensionScore;
  d3_psychologicalSafety: RQEDimensionScore;
  d4_facilitationEmpowerment: RQEDimensionScore;
  d5_practicalGuidance: RQEDimensionScore;
  d6_conversationalContinuity: RQEDimensionScore;
}

interface RQEPredictedArcImpact {
  score: number;        // 0-100
  reasoning: string;
}

interface RQETurnSummary {
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

interface RQEEvaluation {
  responseQuality: RQEResponseQuality;
  predictedArcImpact: RQEPredictedArcImpact;
  responseQualityScore: number;   // Composite RQS (1.0-10.0)
  turnSummary: RQETurnSummary;
}

// === Pairwise Comparison Result (one per turn) ===

interface RQEPairwiseResult {
  preferred: 'A' | 'B' | 'tie';
  confidence: number;             // 0.0-1.0
  reasoning: string;
  dimensionAdvantages: {
    A: string[];
    B: string[];
  };
  // Added by service layer after de-randomization:
  mappedPreferred: 'control' | 'adapted' | 'tie';
  aWas: 'control' | 'adapted';
}

// === Winner Declaration (one per turn) ===

interface RQEWinnerDeclaration {
  winner: 'control' | 'adapted' | 'tie';
  controlRQS: number;
  adaptedRQS: number;
  controlPAI: number;
  adaptedPAI: number;
  reason: string;
  determinedBy: 'pai' | 'rqs' | 'pairwise' | 'tie';
}
```

### 13.1 RQS Computation (Reference Implementation)

The planning agent should compute RQS from the dimension scores:

```
RQS = 0.20 * D1 + 0.20 * D2 + 0.15 * D3 + 0.20 * D4 + 0.10 * D5 + 0.15 * D6
```

This computation happens in the SERVICE LAYER after receiving the JSON from Claude, not in the prompt itself. The prompt returns `responseQualityScore` as Claude's own holistic computation, but the service layer should compute the weighted RQS from the individual dimensions for consistency. Both values can be stored; the weighted computation is authoritative for winner determination.

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **RQE** | Response Quality Evaluator — this framework |
| **RQS** | Response Quality Score — weighted composite of 6 dimensions (1-10) |
| **PAI** | Predicted Arc Impact — holistic projected human impact (0-100%) |
| **D1-D6** | The six evaluation dimensions |
| **Control** | Base Mistral-7B model (no LoRA training) |
| **Adapted** | LoRA fine-tuned Mistral-7B model (EI training) |
| **Pairwise** | Head-to-head comparison of both responses |

## Appendix B: API Cost per Turn

| Evaluator Call | Purpose | Model | Est. Tokens |
|----------------|---------|-------|-------------|
| Evaluation Call 1 | Control response quality | Claude Sonnet | ~2500 |
| Evaluation Call 2 | Adapted response quality | Claude Sonnet | ~2500 |
| Evaluation Call 3 | Pairwise comparison | Claude Sonnet | ~1500 |
| **Total** | | | **~6500 tokens/turn** |

This is approximately 50% more than the current evaluator (2 calls vs 3). The additional pairwise call provides significantly sharper discrimination for modest cost increase.

## Appendix C: Framework Lineage

This RQE framework synthesizes elements from:

| Source | Contribution |
|--------|-------------|
| **E11_v1** (Claude Opus analysis) | 8-dimension framework, composite scoring, pairwise comparison concept, EPITOME/MITI/EQ-Bench 3 grounding |
| **E11b_v2** (Metrics Agent analysis) | 4-dimension framework, therapeutic metaphors (Ear/Voice/Hand/Pulse), TARS alignment, Predicted Arc Impact concept |
| **EPITOME** (Sharma et al.) | Emotional Reactions, Interpretations, Explorations → D1, D2 |
| **MITI 4.2** | Partnership, Empathy → D3, D4 |
| **EQ-Bench 3** (Paech, 2025) | Rubric + Elo dual evaluation method, 6-dimension rubric design, bias mitigation |
| **G-Eval** (Liu et al., EMNLP 2023) | Chain-of-thought evaluation, calibration instructions |
| **Rogers' Person-Centered Therapy** | Unconditional Positive Regard → D3 |
| **Therapeutic Alliance Rating Scale (TARS)** | Bond, Task, Goal → D1-D4 mapping |
