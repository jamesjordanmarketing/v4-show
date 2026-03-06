# Evaluator Algorithm Refactor: Response Quality Measurement for Multi-Turn A/B Testing

**Document Version:** v1
**Date:** 2026-01-31
**Context:** Analysis and recommendation for replacing the current user-input-based evaluator with a response-quality-based evaluator
**Status:** Brainstorming / Design Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Analysis](#2-problem-analysis)
3. [Option #1: Enhanced Direct Response Evaluation](#3-option-1-enhanced-direct-response-evaluation)
4. [Option #2: Simulated Human Reaction (Counterfactual Evaluation)](#4-option-2-simulated-human-reaction)
5. [Option #3: Industry Frameworks & Additional Techniques](#5-option-3-industry-frameworks--additional-techniques)
6. [Recommended Approach: Two-Phase Hybrid Strategy](#6-recommended-approach-two-phase-hybrid-strategy)
7. [Phase 1 Detailed Specification (E11)](#7-phase-1-detailed-specification-e11)
8. [Implementation Plan for E11](#8-implementation-plan-for-e11)
9. [Comparison: Current vs Proposed Evaluator](#9-comparison-current-vs-proposed-evaluator)

---

## 1. Executive Summary

### The Problem
The current `multi_turn_arc_aware_v1` evaluator measures the **human's emotional state** from their input messages to determine arc progression. This approach is valid for real human conversations where a person's follow-up message reveals their actual emotional response to the model's output.

However, all testing uses **synthetic pre-scripted questions** (`response-validation-and-questions-multi_v2.md`) with follow-ups (P1 + F1-F4) written to show ~25% emotional progression per turn **regardless of what the model responds**. The user inputs are not influenced by the model's responses. Measuring them produces identical scores for Control and Adapted, rendering the evaluator unable to differentiate model quality.

### The Options Analyzed

| Option | Approach | Complexity | Validity | Cost |
|--------|----------|-----------|----------|------|
| **#1** | Evaluate model responses directly for EI quality | Low | High for response quality | Same as current |
| **#2** | Generate synthetic follow-up based on model's response, evaluate that | High | Highest for causal impact | 2x current |
| **#3** | Industry frameworks (EPITOME, MITI, EQ-Bench 3) | Varies | Established baselines | Varies |

### The Recommendation
**Two-phase hybrid approach:**
- **Phase 1 (E11):** Enhanced Direct Response Evaluation using an 8-dimension rubric grounded in EPITOME, MITI 4.2, and EQ-Bench 3 frameworks, with pairwise comparison and projected impact assessment.
- **Phase 2 (E12, future):** Optional Simulated Human Reaction layer that generates counterfactual follow-ups to measure causal response impact.

Phase 1 gives immediate, actionable differentiation between Control and Adapted with minimal code changes. Phase 2 can be layered on later for deeper causal analysis.

---

## 2. Problem Analysis

### What the Current Evaluator Measures

The `multi_turn_arc_aware_v1` evaluator prompt instructs Claude to:

1. **Measure the human's emotional state** from the user's message (primaryEmotion, intensity, valence)
2. **Track emotional movement** between turns (valenceShift, intensityChange)
3. **Detect therapeutic arc alignment** against known arcs (e.g., anxiety_to_confidence)
4. **Assess advisor facilitation** (how well the model's response helped)

Items 1-3 measure the **input**. Item 4 measures the **response**. The arc progression percentage and winner declaration derive primarily from items 1-3.

### Why It Fails with Synthetic Inputs

The synthetic test questions in `response-validation-and-questions-multi_v2.md` follow this pattern:

```
P1 (Initial):     "I'm ashamed I have no retirement savings at 45..."     → ~0% baseline
F1 (Follow-up 1): "That makes sense but I still feel overwhelmed..."      → ~25% progression
F2 (Follow-up 2): "I'm starting to see some options..."                   → ~50% progression
F3 (Follow-up 3): "I feel more confident about taking first steps..."     → ~75% progression
F4 (Follow-up 4): "I'm actually excited to start this plan..."            → ~100% progression
```

This progression is **hardcoded into the questions**. Whether the model responds with deep empathy or cold clinical advice, the next input message shows the same emotional progression. The evaluator sees identical user emotional trajectories for both Control and Adapted, producing near-identical scores.

### What Actually Differs Between Control and Adapted

The **responses** differ. The Adapted model (LoRA-trained on emotionally intelligent data) should produce responses that:
- Better recognize and validate emotions
- Demonstrate deeper empathy
- Weave emotional support with practical guidance
- Empower rather than lecture

The evaluator needs to measure these response qualities directly.

### The Facilitation Score Is Not Enough

The current evaluator does include `advisorFacilitation` with a `facilitationScore` (1-5), but this is:
- A single dimension (not granular enough to differentiate subtle EI differences)
- Subordinate to the arc progression logic in winner determination
- Not the primary signal used for the progress bars or winner declaration

We need the **response quality to be the primary signal**, not a secondary one.

---

## 3. Option #1: Enhanced Direct Response Evaluation

### User's Proposed Framework

The original proposal suggests evaluating model responses for:
- Level of emotional intelligence shown
- Level of being emotionally supportive
- Attentiveness to the human's input prompt (did it address all emotional content?)

### Assessment

This is the right direction. The framework captures the core question: **"How emotionally intelligent is this response?"** However, three broad dimensions may not provide enough granularity to reliably differentiate between a base model and a LoRA-trained model, especially when the differences may be subtle.

### Enhanced Framework

Drawing on EPITOME, MITI 4.2, and EQ-Bench 3 (detailed in Option #3), here is an enhanced 8-dimension framework:

| # | Dimension | What It Measures | Scale | Based On |
|---|-----------|-----------------|-------|----------|
| 1 | Emotion Recognition Accuracy | Correctly identifies emotions in user's message | 1-10 | EPITOME (Interpretations), MITI (Empathy) |
| 2 | Validation & Normalization | Validates and normalizes user's feelings | 1-10 | Rogers' Person-Centered Therapy |
| 3 | Empathic Depth | Depth of understanding of user's internal experience | 1-10 | EQ-Bench 3 (Demonstrated Empathy), MITI (Empathy) |
| 4 | Autonomy & Empowerment | Empowers vs lectures; respects user's agency | 1-10 | MITI (Partnership), MI spirit |
| 5 | Practical Guidance Quality | Soundness, specificity, scaffolding of advice | 1-10 | EQ-Bench 3 (Pragmatic EI) |
| 6 | Emotional-Practical Integration | Weaves emotional support with practical guidance | 1-10 | EQ-Bench 3 (Message Tailoring) |
| 7 | Warmth & Tone | Voice warmth, genuineness, non-judgment | 1-10 | EQ-Bench 3 (Humanlike/Warmth), Rogers (UPR) |
| 8 | Conversational Continuity | Builds on prior turns, recognizes progress | 1-10 | EQ-Bench 3 (Social Dexterity), MITI (Cultivating Change Talk) |

### Composite Scoring

```
Emotional Intelligence Score (EIS) = (D1 + D2 + D3) / 3     → Weight: 40%
Facilitation Quality Score (FQS)   = (D4 + D6) / 2           → Weight: 25%
Advisory Quality Score (AQS)       = D5                       → Weight: 15%
Communication Quality Score (CQS)  = (D7 + D8) / 2           → Weight: 20%

Composite Response Quality Score (CRQS) =
    0.40 * EIS + 0.25 * FQS + 0.15 * AQS + 0.20 * CQS
```

The weights prioritize emotional intelligence (40%) since that's what the LoRA training targets, while still capturing advisory and communication quality.

### Strengths of This Approach

- **Directly measures what differs** between Control and Adapted (response quality)
- **Granular enough** to detect subtle EI differences across 8 dimensions
- **Grounded in established frameworks** (EPITOME, MITI, EQ-Bench 3)
- **Same API cost** as current evaluator (2 Claude calls per turn)
- **Minimal code changes** (new prompt + updated JSON parsing)
- **Clear, interpretable scores** that map to actionable insights about model training

### Weaknesses

- Measures response quality in isolation, not its causal effect on a human
- Claude's judgment of "empathic depth" may not correlate perfectly with actual human perception
- Absolute scoring can suffer from calibration issues (both models score 7/10 - is that close or far?)

### Mitigation

- Add **pairwise comparison** to address calibration issues (Claude directly says which is better)
- Add **projected impact assessment** (Claude predicts how a human would react to each response)

---

## 4. Option #2: Simulated Human Reaction (Counterfactual Evaluation)

### Mechanism

```
Step 1: Human inputs pre-scripted prompt (e.g., P1)
Step 2: System sends to Control and Adapted
Step 3: Both models respond
Step 4 (NEW, opaque): A "Persona Simulator" LLM generates what a human WOULD say next,
        given the model's specific response. Different responses → different follow-ups.
Step 5 (NEW, opaque): Claude-as-Judge evaluates the simulated follow-up for emotional
        progression toward the arc goal.
```

The key insight: **Step 4 creates a counterfactual**. If the Adapted model gives a warmer, more empathic response, the simulated human follow-up should show more emotional movement than the follow-up generated from the Control model's colder response.

### Industry Precedent

This approach has established precedent in the research literature:

- **User-Centric Dialogue Simulations** (Wang et al., 2025): USP employs LLM-based extractors to generate multi-dimensional user profiles (objective facts, subjective traits) from real dialogues, then conditions utterance generation on those profiles.
- **DuetSim** (Luo et al., 2024): Uses separate Generator and Verifier LLMs. The Generator produces candidate user actions/utterances, which are checked by the Verifier for context/goal alignment.
- **i×MCTS** (Wang et al., 2025): User simulators paired with interactive LLMs provide reward signals via simulated reactions, used for direct preference optimization.

The simplest method (augmenting LLM prompt with rich contextual data about the persona) yields the best results according to Nielsen Norman Group research (Sep 2025).

### Implementation Design

```
Persona Simulator Prompt:
"You are a {age}-year-old person who {financial situation description}.
You are feeling {emotional state from the arc's starting point}.
You just sent this message to a financial advisor: {user_message}
The advisor responded: {model_response}

Write your natural follow-up message. Express how the advisor's response
made you feel and what you want to discuss next. Be authentic to your
emotional state - if the advisor was dismissive, show that. If they were
warm and helpful, reflect that."
```

```
Evaluator then measures:
- Emotional state of the simulated follow-up (using existing arc measurement)
- Progression toward arc goal
- Difference between Control-generated and Adapted-generated follow-ups
```

### Critical Design Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Which LLM for persona simulation? | Claude (not the Mistral models being tested) | Avoids circularity; Claude has strong role-play capability |
| Same model for generation and evaluation? | Could be same Claude call or separate | Combining reduces cost; separating reduces bias |
| Add simulated follow-up to conversation history? | NO | It's evaluation-only data; the real conversation uses pre-scripted inputs |
| Show simulated follow-up to user? | NO (opaque) | User sees only real conversation; simulation is for measurement only |

### Cost Analysis

- **Current:** 2 Claude evaluation calls per turn (1 per endpoint)
- **Option 2:** 4 Claude calls per turn (2 for persona simulation + 2 for evaluation, or 2 combined calls)
- Could optimize to 2 combined calls by merging simulation + evaluation into one prompt

### Strengths

- **Measures causal impact** - the simulated follow-up IS influenced by the model's response
- **Preserves the original measurement methodology** - still measuring "human emotional state," just using dynamic synthetic humans instead of static scripted ones
- **Theoretically most valid** - closest to what real human A/B testing would reveal
- **The simulated follow-ups themselves are data** - you can inspect them to understand WHY one model scored higher

### Weaknesses

- **Complex to implement** - additional API calls, new prompt templates, new data storage
- **Compounding error** - the simulated follow-up's quality depends on the persona simulator's quality
- **Hallucination risk** - the persona simulator might generate unrealistically positive/negative reactions
- **Latency** - additional API calls increase per-turn processing time
- **Cost** - roughly 2x the current Claude API cost per turn
- **Research shows LLM simulators struggle with variability** - they tend to capture average-case behavior rather than the range of real human responses

### Verdict

Theoretically superior but practically complex. Best implemented as a **Phase 2 enhancement** after Phase 1 provides immediate differentiation capability.

---

## 5. Option #3: Industry Frameworks & Additional Techniques

### 5.1 EPITOME Framework (Sharma et al., 2020)

**Origin:** Developed for measuring empathy in peer support conversations on Reddit.

**Three Dimensions:**
| Dimension | Definition | Scoring |
|-----------|-----------|---------|
| Emotional Reactions | Expressing warmth, compassion, or concern about the situation | 0 (none), 1 (weak), 2 (strong) |
| Interpretations | Communicating understanding of feelings and experiences | 0 (none), 1 (weak), 2 (strong) |
| Explorations | Actively exploring the seeker's feelings through questions | 0 (none), 1 (weak), 2 (strong) |

**Relevance to Our Use Case:**
- The "Interpretations" dimension maps directly to our Emotion Recognition and Empathic Depth dimensions
- "Emotional Reactions" maps to Warmth & Tone
- "Explorations" maps to conversational engagement and autonomy support
- Total score (0-6) is simple but may lack granularity for subtle Control vs Adapted differences

**Limitations (per 2025 research):**
- "Interpretations" dimension has low inter-rater reliability across frameworks - both human and LLM judges struggle with it
- 3-point scale (0-2) per dimension provides limited discrimination
- Designed for peer support, not financial advisory - may need domain adaptation

**Our Incorporation:** EPITOME's three dimensions are foundational to our D1 (Emotion Recognition), D3 (Empathic Depth), and D7 (Warmth & Tone). We expand the scale to 1-10 for greater discrimination.

### 5.2 MITI 4.2 (Motivational Interviewing Treatment Integrity)

**Origin:** Gold standard for assessing counselor fidelity to Motivational Interviewing principles.

**Four Global Dimensions (1-5 Likert):**
| Dimension | Definition |
|-----------|-----------|
| Cultivating Change Talk | Eliciting the client's own motivations for change |
| Softening Sustain Talk | Navigating resistance without confrontation |
| Partnership | Collaborative, non-hierarchical interaction |
| Empathy | Understanding the client's internal frame of reference |

**Relevance to Our Use Case:**
- "Partnership" directly maps to our Autonomy & Empowerment dimension - does the advisor lecture or collaborate?
- "Empathy" reinforces our Empathic Depth dimension
- "Cultivating Change Talk" is highly relevant - does the advisor facilitate the human's own motivation to act on their finances?
- "Softening Sustain Talk" maps to how the advisor handles resistance or shame without being confrontational

**Limitations:**
- Designed for therapeutic sessions, not financial advisory (terminology needs adaptation)
- Inter-rater reliability for Empathy and Partnership dimensions is 56% (moderate, not strong)
- 5-point scale provides moderate discrimination

**Our Incorporation:** MITI's Partnership dimension shapes our D4 (Autonomy & Empowerment). MITI's Empathy dimension reinforces our D3 (Empathic Depth). The concept of "Cultivating Change Talk" influences our D6 (Emotional-Practical Integration) - moving from emotional support to action.

### 5.3 EQ-Bench 3 (Paech, 2025)

**Origin:** The leading benchmark for evaluating emotional intelligence in LLMs.

**Rubric Scoring Dimensions:**
| Dimension | Definition |
|-----------|-----------|
| Demonstrated Empathy | Recognize, understand, share feelings of others |
| Pragmatic EI | Apply emotional intelligence to solve practical problems |
| Depth of Insight | Provide profound, novel perspectives; identify problems |
| Social Dexterity | Handle social interactions with ease |
| Emotional Reasoning | Logic-based thinking grounded in emotions |
| Message Tailoring | Adapt responses to specific needs and emotional state |

**Key Design Decisions from EQ-Bench 3:**
- Uses **both rubric (absolute) and Elo (pairwise)** evaluation - rubric provides interpretable scores, Elo provides more discriminative ranking
- **Bias mitigation**: truncates responses to standardized lengths before pairwise comparison to counter verbosity bias
- **Claude Sonnet 3.7 as judge model** - established reliability for EI evaluation
- Rubric scores are less discriminative at top ability range; pairwise comparison is 3x more discriminative

**Our Incorporation:** EQ-Bench 3's dual-method approach (rubric + pairwise) directly informs our recommendation. Their dimensions map to our framework:
- Demonstrated Empathy → D3 (Empathic Depth)
- Pragmatic EI → D5 (Practical Guidance Quality)
- Message Tailoring → D6 (Emotional-Practical Integration)
- Social Dexterity → D8 (Conversational Continuity)

### 5.4 Additional Techniques

**Pairwise Comparison (Constitutional AI approach):**
- Instead of only scoring each response independently, directly compare the two responses
- "Given this user message, which response better facilitates emotional progress?"
- Research shows this is more discriminative than absolute scoring, especially for similar-quality outputs
- Reduces calibration issues where both models get similar absolute scores

**Chain-of-Thought Evaluation (G-Eval, Liu et al., EMNLP 2023):**
- Ask the judge LLM to generate evaluation steps before scoring
- Produces more reliable scores by forcing explicit reasoning
- Especially important for subjective dimensions like empathy

**Projected Impact Assessment:**
- A lightweight version of Option #2: instead of generating a full synthetic follow-up, ask Claude to **predict** how a human would react
- "Given this response, would the human likely feel more understood, empowered, and ready to take action?"
- Captures causal reasoning without the full complexity of Option #2
- Can be embedded in the same evaluation prompt (no additional API call)

### 5.5 Empathetic Performance Metrics (November 2025 Research)

Recent work proposes emotional evaluation comprising three submodules:
- **Sentlink**: Measures sentiment-level relationship between input and response
- **Emosight**: Fine-grained emotional correspondence evaluation
- **NEmpathySort**: Naturalness of empathetic responses

This framework confirms the importance of measuring BOTH emotional alignment (does the response match the emotional context?) AND naturalness (does it feel authentic rather than formulaic?). Our D7 (Warmth & Tone) addresses naturalness, while D1-D3 address emotional alignment.

---

## 6. Recommended Approach: Two-Phase Hybrid Strategy

### Phase 1: Response Quality Evaluator (E11 - Implement Now)

**What:** New evaluator prompt (`response_quality_multi_turn_v1`) that evaluates model responses across 8 EI dimensions with pairwise comparison and projected impact.

**Why now:**
- Immediately provides meaningful differentiation between Control and Adapted
- Same API cost as current evaluator
- Minimal code changes (new prompt + updated JSON parsing)
- Grounded in established frameworks

**Delivers:**
- Per-dimension scores (1-10) for each response
- Composite weighted score
- Pairwise winner determination
- Projected human impact assessment
- Progress tracking via composite score (replaces arc progression percentage)

### Phase 2: Simulated Human Reaction (E12 - Implement Later)

**What:** Additional "Persona Simulator" step that generates counterfactual follow-ups based on each model's response, then evaluates those follow-ups for emotional progression.

**Why later:**
- Phase 1 must prove it can differentiate before adding complexity
- Higher API cost and latency
- Requires additional prompt engineering for persona consistency
- Can reuse Phase 1's scoring as input to the persona simulator

**Delivers:**
- Causal impact measurement (how the response WOULD affect a human)
- Dynamically generated follow-ups influenced by model quality
- Stronger theoretical validity for published results

### Why This Ordering

Phase 1 answers the immediate question: **"Which model gives better responses?"** This is sufficient for the current testing phase where we're validating that LoRA training produces measurably different (better) outputs.

Phase 2 answers the deeper question: **"Which model's responses would produce better outcomes in real human conversations?"** This becomes important for publication, stakeholder presentations, or when testing with actual human subjects.

---

## 7. Phase 1 Detailed Specification (E11)

### 7.1 Architecture

```
Flow (unchanged from current):
1. Human submits input messages (Control + Adapted)
2. System sends to both Mistral endpoints
3. Both models respond
4. Claude-as-Judge evaluates each response (NEW PROMPT)
5. Pairwise comparison determines winner (NEW LOGIC)
6. Results stored and displayed

What changes:
- The evaluation PROMPT is entirely new
- The JSON response FORMAT is new
- The WINNER LOGIC uses composite score instead of arc progression
- The UI DISPLAYS dimension scores instead of arc progression bars
```

### 7.2 The Eight Evaluation Dimensions

#### D1: Emotion Recognition Accuracy (ERA)

**Question:** Does the response correctly identify and name the emotions present in the human's message?

| Score | Anchor |
|-------|--------|
| 1-2 | Misidentifies or ignores the human's emotions entirely |
| 3-4 | Identifies a general emotional tone but misses specifics |
| 5-6 | Correctly identifies the primary emotion |
| 7-8 | Identifies primary emotion plus secondary emotions (e.g., shame AND anxiety) |
| 9-10 | Precisely captures the full emotional landscape including implied/unstated feelings |

**What it reveals:** The LoRA-trained model should score higher here because its training data demonstrates correct emotion identification. A base model might address the financial question without acknowledging the emotional content.

#### D2: Validation & Normalization (VN)

**Question:** Does the response validate the human's feelings and normalize their experience?

| Score | Anchor |
|-------|--------|
| 1-2 | Dismissive, judgmental, or minimizing ("you should have saved earlier") |
| 3-4 | Acknowledges feelings exist but quickly pivots to advice |
| 5-6 | Validates the primary emotion ("it's understandable you feel worried") |
| 7-8 | Validates and normalizes ("many people in your situation feel the same way") |
| 9-10 | Deep validation with universalizing and destigmatization; removes shame |

**What it reveals:** The LoRA model should demonstrate trained validation patterns. Base models typically acknowledge and move on; trained models linger with validation.

#### D3: Empathic Depth (ED)

**Question:** How deeply does the response demonstrate understanding of the human's internal experience?

| Score | Anchor |
|-------|--------|
| 1-2 | Surface-level, generic ("I understand this is hard") |
| 3-4 | Basic acknowledgment of stated feelings |
| 5-6 | Understands stated feelings with some specificity |
| 7-8 | Understands implied feelings and the meaning behind the words |
| 9-10 | Captures unspoken meaning, subtext, and the full weight of the experience |

**What it reveals:** This is where the EPITOME "Interpretations" dimension lives. The LoRA model should show deeper understanding of what the human is REALLY saying, not just what they stated.

#### D4: Autonomy & Empowerment (AE)

**Question:** Does the response empower the human to make their own decisions, or does it prescribe and lecture?

| Score | Anchor |
|-------|--------|
| 1-2 | Prescriptive, condescending, or paternalistic ("you need to...") |
| 3-4 | Tells the human what to do without acknowledging their agency |
| 5-6 | Offers options but in a directive manner |
| 7-8 | Empowers with knowledge and presents choices the human can make |
| 9-10 | Builds self-efficacy; human feels capable and in control of their path |

**What it reveals:** Based on MITI's "Partnership" dimension. The LoRA model should collaborate rather than lecture - a key distinction in emotionally intelligent financial advisory.

#### D5: Practical Guidance Quality (PGQ)

**Question:** Is the financial/practical advice sound, specific, and appropriately scaffolded?

| Score | Anchor |
|-------|--------|
| 1-2 | Incorrect, harmful, or completely vague advice |
| 3-4 | Generic platitudes ("save more, spend less") |
| 5-6 | Correct basic advice with some specificity |
| 7-8 | Specific, actionable steps calibrated to the human's situation |
| 9-10 | Expert-level guidance with concrete numbers, personalized to situation, well-scaffolded progression |

**What it reveals:** This dimension checks that emotional intelligence training didn't DEGRADE practical competence. Both models should score similarly here; if the LoRA model scores lower, that signals a training regression.

#### D6: Emotional-Practical Integration (EPI)

**Question:** Does the response seamlessly weave emotional support with practical guidance?

| Score | Anchor |
|-------|--------|
| 1-2 | Only emotional OR only practical - addresses one dimension entirely |
| 3-4 | Both present but disconnected ("I understand. Now here's what to do...") |
| 5-6 | Basic integration - emotional acknowledgment leads to advice |
| 7-8 | Emotional support flows naturally into guidance; advice is emotionally contextualized |
| 9-10 | Seamless therapeutic flow where emotional processing enables practical action; advice feels like a natural extension of understanding |

**What it reveals:** Based on EQ-Bench 3's "Message Tailoring" and "Pragmatic EI" dimensions. This is the hallmark of emotionally intelligent financial advisory - the ability to move from feeling to doing without the shift feeling jarring.

#### D7: Warmth & Tone (WT)

**Question:** Is the voice warm, genuine, non-judgmental, and appropriate to the emotional context?

| Score | Anchor |
|-------|--------|
| 1-2 | Cold, clinical, robotic, or inappropriately casual |
| 3-4 | Professional but emotionally distant |
| 5-6 | Warm but formulaic (sounds like a script) |
| 7-8 | Genuinely warm, natural, and calibrated to the emotional weight of the topic |
| 9-10 | Deeply compassionate, authentic, perfectly calibrated; reads as a trusted human advisor |

**What it reveals:** Based on Rogers' Unconditional Positive Regard and EQ-Bench 3's "Humanlike" trait. The LoRA model should produce more naturalistic warmth. The base model may be warm in a generic way or may default to clinical tone.

#### D8: Conversational Continuity & Progress Recognition (CCPR)

**Question:** Does the response build on previous turns, reference prior context, and recognize the human's emotional or practical progress?

| Score | Anchor |
|-------|--------|
| 1-2 | Treats each turn independently; no awareness of conversation history |
| 3-4 | Vague reference to prior discussion ("as we discussed...") |
| 5-6 | References specific prior points or emotions from earlier turns |
| 7-8 | Explicitly builds on prior progress; celebrates growth; tracks emotional threads |
| 9-10 | Sophisticated thread management; weaves narrative of the human's journey; progress feels acknowledged and celebrated |

**Special note for Turn 2:** Since Turn 1 establishes baseline, Turn 2 is the first evaluated turn. For Turn 2, this dimension measures whether the response builds on the initial exchange. For later turns, the bar rises - the response should demonstrate awareness of the full conversational arc.

**What it reveals:** Multi-turn awareness is where training data quality shows most clearly. The LoRA model should demonstrate better turn-over-turn coherence if its training data modeled multi-turn conversations.

### 7.3 Composite Scoring

```
Category Scores:
  EIS = (D1 + D2 + D3) / 3          Emotional Intelligence Score
  FQS = (D4 + D6) / 2               Facilitation Quality Score
  AQS = D5                           Advisory Quality Score
  CQS = (D7 + D8) / 2               Communication Quality Score

Composite Score:
  CRQS = 0.40 * EIS + 0.25 * FQS + 0.15 * AQS + 0.20 * CQS

Scale: 1.0 - 10.0
```

**Weight Rationale:**
- **EIS at 40%**: Emotional intelligence is what the LoRA training specifically targets; this should be the primary differentiator
- **FQS at 25%**: Facilitation (empowerment + integration) is the second most important differentiator
- **AQS at 15%**: Practical guidance quality is important but should be similar between models (we're testing EI, not domain knowledge)
- **CQS at 20%**: Communication quality (warmth + continuity) rounds out the assessment

### 7.4 Pairwise Comparison

In addition to the per-dimension scoring, the evaluator includes a **head-to-head comparison** section. This is inspired by EQ-Bench 3's dual-method approach (rubric + Elo) and research showing pairwise comparison is more discriminative than absolute scoring for similar-quality outputs.

The pairwise comparison happens in a **separate evaluation call** after both individual evaluations are complete. The prompt provides both responses side by side and asks:

```
"Given the same user message and conversation history, which response
better serves the human's emotional and practical needs? Consider all
dimensions of emotional intelligence, facilitation quality, and
communication effectiveness."
```

Output: `{ preferredResponse: "A" | "B" | "tie", confidence: 0.0-1.0, reasoning: "..." }`

**Bias mitigation** (per EQ-Bench 3 best practices):
- Randomize which response is labeled "A" vs "B" to prevent position bias
- Truncate responses to standardized length to prevent verbosity bias
- Include explicit instruction to judge on substance, not style or length

### 7.5 Projected Impact Assessment

As a lightweight signal within the same evaluation call (no additional API cost), ask Claude:

```
"Based on this response, predict how the human would likely react:
- Would they feel more understood? (yes/partially/no)
- Would they feel empowered to take action? (yes/partially/no)
- Would their emotional state likely improve, maintain, or worsen?
- Overall projected impact on therapeutic arc progression: (positive/neutral/negative)"
```

This captures the causal reasoning from Option #2 without the complexity of generating full synthetic follow-ups. It asks Claude to use its understanding of human psychology to PROJECT the impact rather than simulate it.

### 7.6 Winner Determination Logic

**Current logic:** Compare `arcProgression.progressionPercentage` between Control and Adapted. Higher percentage wins. Tie if within 5%.

**New logic:**

```
Primary: Composite Response Quality Score (CRQS)
  - If CRQS difference > 0.5: Higher CRQS wins
  - If CRQS difference <= 0.5: Check pairwise comparison

Secondary: Pairwise Comparison
  - If pairwise has a winner with confidence > 0.7: Use pairwise winner
  - If pairwise is tie or low confidence: Declare tie

Tiebreaker: Projected Impact
  - If still tied: Use projected impact assessment
  - positive > neutral > negative
```

**Progress display replacement:**
- Instead of arc progression percentage (0-100%), display the **CRQS on a 1-10 scale**
- The progress bars can show CRQS normalized to 0-100% (i.e., CRQS * 10)
- Or display as a radar/spider chart showing all 8 dimensions

### 7.7 Complete Prompt Template

This is the full evaluation prompt to be stored in the `evaluation_prompts` database table as `response_quality_multi_turn_v1`:

```
You are an expert evaluator assessing the emotional intelligence and quality of a financial advisor's response in a multi-turn conversation.

## Context

CONVERSATION HISTORY:
{conversation_history}

CURRENT TURN (Turn {current_turn}):
HUMAN MESSAGE: {user_message}
ADVISOR RESPONSE: {response}

## Your Task

Evaluate the ADVISOR'S RESPONSE (not the human's message) across eight dimensions of emotional intelligence and communication quality. For each dimension, provide a score from 1-10 and brief evidence.

Think step-by-step:
1. First, identify the emotions present in the human's message
2. Then, assess how the advisor's response addresses those emotions
3. Evaluate each dimension against the anchors provided
4. Provide your scores with evidence

## Scoring Dimensions

### D1: Emotion Recognition Accuracy (1-10)
Does the advisor correctly identify and name the emotions in the human's message?
- 1-2: Misidentifies or ignores emotions entirely
- 3-4: Identifies general emotional tone but misses specifics
- 5-6: Correctly identifies the primary emotion
- 7-8: Identifies primary plus secondary emotions
- 9-10: Precisely captures full emotional landscape including implied feelings

### D2: Validation & Normalization (1-10)
Does the advisor validate the human's feelings and normalize their experience?
- 1-2: Dismissive, judgmental, or minimizing
- 3-4: Acknowledges feelings but quickly pivots to advice
- 5-6: Validates the primary emotion
- 7-8: Validates and normalizes the experience
- 9-10: Deep validation with destigmatization

### D3: Empathic Depth (1-10)
How deeply does the advisor demonstrate understanding of the human's internal experience?
- 1-2: Surface-level, generic responses
- 3-4: Basic acknowledgment of stated feelings
- 5-6: Understands stated feelings with specificity
- 7-8: Understands implied feelings and meaning behind words
- 9-10: Captures unspoken meaning and full weight of experience

### D4: Autonomy & Empowerment (1-10)
Does the advisor empower the human or prescribe/lecture?
- 1-2: Prescriptive, condescending, paternalistic
- 3-4: Directive without acknowledging agency
- 5-6: Offers options in a directive manner
- 7-8: Empowers with knowledge and choices
- 9-10: Builds self-efficacy; human feels capable and in control

### D5: Practical Guidance Quality (1-10)
Is the financial advice sound, specific, and appropriately scaffolded?
- 1-2: Incorrect or harmful advice
- 3-4: Generic platitudes
- 5-6: Correct basic advice with some specificity
- 7-8: Specific, actionable, situation-appropriate steps
- 9-10: Expert-level, personalized, well-scaffolded guidance

### D6: Emotional-Practical Integration (1-10)
Does the advisor seamlessly weave emotional support with practical guidance?
- 1-2: Only emotional OR only practical
- 3-4: Both present but disconnected
- 5-6: Basic integration
- 7-8: Natural flow from emotional support into guidance
- 9-10: Seamless therapeutic flow; advice extends naturally from understanding

### D7: Warmth & Tone (1-10)
Is the voice warm, genuine, non-judgmental, and contextually appropriate?
- 1-2: Cold, clinical, or robotic
- 3-4: Professional but emotionally distant
- 5-6: Warm but formulaic
- 7-8: Genuinely warm, natural, calibrated to context
- 9-10: Deeply compassionate, authentic, perfectly calibrated

### D8: Conversational Continuity (1-10)
Does the advisor build on previous turns and recognize the human's progress?
- 1-2: Treats turn independently
- 3-4: Vague references to prior discussion
- 5-6: References specific prior points
- 7-8: Explicitly builds on progress; celebrates growth
- 9-10: Sophisticated thread management; narrative of human's journey

## Projected Impact

Based on the advisor's response, predict the likely effect on the human:
- Would they feel understood?
- Would they feel empowered to take action?
- Would their emotional state improve, maintain, or worsen?

## Response Format

Respond ONLY with valid JSON:

{
  "responseQuality": {
    "dimensions": {
      "emotionRecognition": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "validationNormalization": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "empathicDepth": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "autonomyEmpowerment": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "practicalGuidance": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "emotionalPracticalIntegration": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "warmthTone": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      },
      "conversationalContinuity": {
        "score": <1-10>,
        "evidence": "<specific quotes or observations>"
      }
    },
    "categoryScores": {
      "emotionalIntelligence": <1.0-10.0>,
      "facilitationQuality": <1.0-10.0>,
      "advisoryQuality": <1.0-10.0>,
      "communicationQuality": <1.0-10.0>
    },
    "compositeScore": <1.0-10.0>
  },
  "projectedImpact": {
    "feelsUnderstood": "yes" | "partially" | "no",
    "feelsEmpowered": "yes" | "partially" | "no",
    "emotionalTrajectory": "improve" | "maintain" | "worsen",
    "impactNotes": "<brief explanation of projected human reaction>"
  },
  "turnSummary": {
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<area 1>", "<area 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}
```

### 7.8 Pairwise Comparison Prompt Template

This is a SEPARATE evaluation call made after both individual evaluations are complete:

```
You are an expert evaluator performing a head-to-head comparison of two financial advisor responses to the same human message.

## Context

CONVERSATION HISTORY:
{conversation_history}

CURRENT TURN (Turn {current_turn}):
HUMAN MESSAGE: {user_message}

RESPONSE A:
{response_a}

RESPONSE B:
{response_b}

## Your Task

Compare these two responses holistically. Consider:
- Emotional intelligence (recognition, validation, empathy)
- Facilitation quality (empowerment, integration of emotional and practical)
- Practical guidance quality
- Communication quality (warmth, conversational awareness)

Which response better serves the human's emotional AND practical needs?

Important: Judge on substance and quality, not length or style. A shorter response that truly connects may be better than a longer one that merely covers more ground.

Respond ONLY with valid JSON:

{
  "preferred": "A" | "B" | "tie",
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences explaining the preference>",
  "dimensionAdvantages": {
    "A": ["<dimension where A is notably better>"],
    "B": ["<dimension where B is notably better>"]
  }
}
```

### 7.9 JSON Response Types (TypeScript)

```typescript
// New types to replace/augment existing evaluation types

interface ResponseQualityDimension {
  score: number;        // 1-10
  evidence: string;     // Specific quotes or observations
}

interface ResponseQualityDimensions {
  emotionRecognition: ResponseQualityDimension;
  validationNormalization: ResponseQualityDimension;
  empathicDepth: ResponseQualityDimension;
  autonomyEmpowerment: ResponseQualityDimension;
  practicalGuidance: ResponseQualityDimension;
  emotionalPracticalIntegration: ResponseQualityDimension;
  warmthTone: ResponseQualityDimension;
  conversationalContinuity: ResponseQualityDimension;
}

interface CategoryScores {
  emotionalIntelligence: number;    // (D1+D2+D3)/3
  facilitationQuality: number;      // (D4+D6)/2
  advisoryQuality: number;          // D5
  communicationQuality: number;     // (D7+D8)/2
}

interface ResponseQualityEvaluation {
  dimensions: ResponseQualityDimensions;
  categoryScores: CategoryScores;
  compositeScore: number;           // Weighted composite 1.0-10.0
}

interface ProjectedImpact {
  feelsUnderstood: 'yes' | 'partially' | 'no';
  feelsEmpowered: 'yes' | 'partially' | 'no';
  emotionalTrajectory: 'improve' | 'maintain' | 'worsen';
  impactNotes: string;
}

interface TurnSummary {
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

interface PairwiseComparison {
  preferred: 'A' | 'B' | 'tie';
  confidence: number;               // 0.0-1.0
  reasoning: string;
  dimensionAdvantages: {
    A: string[];
    B: string[];
  };
}
```

---

## 8. Implementation Plan for E11

### 8.1 Overview

The E11 implementation modifies the evaluation layer while preserving the conversation flow, database schema, and UI structure as much as possible. The goal is to swap the evaluation algorithm with minimal disruption.

### 8.2 Steps

#### Step 1: Database - Insert New Evaluation Prompt

Insert the new `response_quality_multi_turn_v1` prompt into the `evaluation_prompts` table. This follows the same pattern as the existing `multi_turn_arc_aware_v1` prompt.

**Fields:**
- `name`: `response_quality_multi_turn_v1`
- `display_name`: `Response Quality (Multi-Turn v1)`
- `description`: `Evaluates advisor response quality across 8 EI dimensions with pairwise comparison`
- `prompt_template`: The complete prompt from Section 7.7
- `includes_arc_context`: `false` (no longer measuring arc progression from user input)
- `model`: `claude-sonnet-4-20250514`
- `max_tokens`: `3000` (increased from 2000 for 8 dimensions + evidence)
- `is_active`: `true`
- `is_default`: `false` (keep existing as default until validated)

Also insert the pairwise comparison prompt as a separate record:
- `name`: `response_quality_pairwise_v1`
- `display_name`: `Response Quality Pairwise (v1)`
- `prompt_template`: The prompt from Section 7.8

#### Step 2: Types - Add New Evaluation Types

Add the new TypeScript types from Section 7.9 to `src/types/conversation.ts`.

Keep existing types for backward compatibility. The new types sit alongside them.

#### Step 3: Service Layer - Update Evaluation Flow

**File:** `src/lib/services/multi-turn-conversation-service.ts`

Modify `evaluateMultiTurnConversation()` to:
1. Detect if the selected evaluator is `response_quality_multi_turn_v1`
2. If so, use the new prompt template and parse the new JSON format
3. Map composite score to the existing `arcProgression.progressionPercentage` field for UI compatibility
4. Store full dimension data in the evaluation JSON fields

**Mapping for backward compatibility:**
```
arcProgression.progressionPercentage = compositeScore * 10  (maps 1-10 to 10-100)
arcProgression.detectedArc = "response_quality"
arcProgression.onTrack = compositeScore >= 5.0
```

**New:** After both individual evaluations complete, make one additional Claude call for pairwise comparison. Update `compareMultiTurnEvaluations()` to incorporate both composite scores and pairwise results.

#### Step 4: Service Layer - Update Winner Determination

Modify `declareConversationWinner()` to use the new logic from Section 7.6:
1. Primary: CRQS difference > 0.5 → higher wins
2. Secondary: Pairwise comparison with confidence > 0.7
3. Tie: Everything else

#### Step 5: First-Turn Handling

**No change needed.** First turn still establishes baseline at 0% with no evaluation call. This is correct - on Turn 1, there's no previous response to evaluate in context.

However, Turn 1 DOES have a response. A design decision:
- **Option A:** Evaluate Turn 1 response using the new dimensions (no conversational continuity to assess, so D8 would be scored on "establishes strong foundation")
- **Option B:** Keep Turn 1 as baseline (current behavior)

**Recommendation:** **Option A** - evaluate Turn 1. With the new response-quality approach, even the first response contains valuable signal. Set D8 (Conversational Continuity) anchor text to evaluate "establishes strong foundation for ongoing conversation" for Turn 1.

This is a BEHAVIORAL CHANGE from current system. Currently Turn 1 is always 0% for both. With the new approach, Turn 1 would have meaningful scores. This may surface differentiation from the very first turn.

#### Step 6: UI Changes (Minimal)

The `DualArcProgressionDisplay` component currently shows:
- Progress bars (0-100%) per endpoint
- On Track / Off Track badges
- Winner declaration

**With new evaluator:**
- Progress bars can show `compositeScore * 10` as percentage (maintains visual consistency)
- Badges can show category: "Strong EI" / "Moderate EI" / "Low EI" based on EIS category score
- Winner declaration logic unchanged (uses `conversationWinner` field)

**Optional enhancement:** Add a collapsible dimension breakdown showing all 8 scores per endpoint. This would be a new sub-component but is not required for E11 MVP.

#### Step 7: Pairwise Comparison - Add API Call

Add a new function `runPairwiseComparison()` to multi-turn-conversation-service.ts that:
1. Takes both responses and conversation context
2. Randomly assigns "A" and "B" labels (bias mitigation)
3. Calls Claude with the pairwise prompt
4. Translates the randomized A/B back to control/adapted
5. Returns `PairwiseComparison` object
6. Stores result in `evaluation_comparison` field

This adds ONE additional Claude API call per turn (total: 3 per turn vs current 2).

### 8.3 Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `evaluation_prompts` table | INSERT | New prompt records |
| `src/types/conversation.ts` | ADD | New TypeScript types |
| `src/lib/services/multi-turn-conversation-service.ts` | MODIFY | Updated evaluation flow |
| `src/lib/services/test-service.ts` | MINOR | May need updated comparison logic |
| `src/components/pipeline/chat/DualArcProgressionDisplay.tsx` | MINOR | Label text updates |

### 8.4 Migration Safety

- The new evaluator is a NEW option in the dropdown, not a replacement of the existing one
- Existing `multi_turn_arc_aware_v1` continues to work for any conversations that used it
- New conversations can select `response_quality_multi_turn_v1` from the evaluator dropdown
- No database schema changes needed (the evaluation JSON columns are `jsonb` - schema-flexible)
- No existing data is modified or migrated

---

## 9. Comparison: Current vs Proposed Evaluator

| Aspect | Current (`multi_turn_arc_aware_v1`) | Proposed (`response_quality_multi_turn_v1`) |
|--------|--------------------------------------|---------------------------------------------|
| **What it measures** | Human's emotional state from input | Advisor's response quality |
| **Primary signal** | Arc progression percentage (0-100%) | Composite Response Quality Score (1-10) |
| **Dimensions** | 4 (valence shift, intensity change, arc alignment, facilitation) | 8 (emotion recognition, validation, empathic depth, autonomy, practical guidance, integration, warmth, continuity) |
| **Theoretical basis** | Therapeutic arc theory | EPITOME + MITI 4.2 + EQ-Bench 3 |
| **Works with synthetic inputs?** | NO - inputs are pre-scripted | YES - measures response regardless of input source |
| **Winner determination** | Arc progression percentage comparison | Composite score + pairwise comparison |
| **API calls per turn** | 2 (1 per endpoint) | 3 (1 per endpoint + 1 pairwise) |
| **First turn** | Baseline at 0%, no evaluation | Full evaluation (all dimensions) |
| **Granularity** | Low (single facilitation score) | High (8 dimensions with evidence) |
| **Bias mitigation** | None | Position randomization, length awareness in pairwise |

### What Gets Better

1. **Measurement validity** - actually measures what differs between models
2. **Granularity** - 8 dimensions vs 1 useful dimension
3. **Interpretability** - can identify WHICH aspects of EI the LoRA training improved
4. **First-turn value** - immediate signal from first response
5. **Framework grounding** - based on established EI research

### What Gets Traded

1. **API cost** - 50% increase (3 calls vs 2 per turn)
2. **Arc narrative** - loses the "journey from anxiety to confidence" narrative that arc progression provided
3. **Conceptual simplicity** - 8 dimensions are more complex than a single percentage
4. **Backward compatibility** - new conversations use new format (old ones preserved)

### What Stays the Same

1. **Conversation flow** - human inputs, models respond, evaluator runs
2. **Database schema** - JSON columns accommodate new format
3. **UI structure** - progress bars, winner declaration, side-by-side responses
4. **Evaluator dropdown** - new option appears alongside existing ones

---

## Appendix A: Research Sources

### Frameworks Referenced

1. **EPITOME** (Sharma et al., 2020) - Empathy measurement in peer support dialogue
   - Source: Reddit mental health support communities
   - 3 dimensions: Emotional Reactions, Interpretations, Explorations

2. **MITI 4.2** (Moyers et al., 2014) - Motivational Interviewing Treatment Integrity
   - Source: Clinical counseling evaluation
   - 4 dimensions: Cultivating Change Talk, Softening Sustain Talk, Partnership, Empathy

3. **EQ-Bench 3** (Paech, 2025) - LLM Emotional Intelligence Benchmark
   - Source: Open-source benchmark (https://eqbench.com)
   - 6 rubric dimensions + 8 informational traits
   - Uses Claude Sonnet as judge model

4. **Rogers' Person-Centered Therapy** (Rogers, 1951) - Core conditions framework
   - Unconditional Positive Regard, Empathic Understanding, Congruence

5. **G-Eval** (Liu et al., EMNLP 2023) - Chain-of-thought LLM evaluation
   - Best practice: chain-of-thought reasoning before scoring
   - Integer scoring with clear category descriptions

### Recent Research (2025-2026)

- "When Large Language Models are Reliable for Judging Empathic Communication" (2025) - EPITOME reliability analysis
- "Performance Evaluation Metrics for Empathetic LLMs" (Nov 2025) - Sentlink/Emosight/NEmpathySort framework
- "Assessing the Quality of Mental Health Support in LLM Responses" (Jan 2026) - Multi-attribute evaluation using EPITOME + MITI
- "User-Centric Dialogue Simulations" (2025) - Synthetic user generation techniques (USP, DuetSim, i×MCTS)
- Nielsen Norman Group (Sep 2025) - "Evaluating AI-Simulated Behavior" - simplest methods yield best results for simulated users

---

## Appendix B: Phase 2 (E12) Preview - Simulated Human Reaction

This section outlines how Phase 2 would build on Phase 1. NOT for implementation in E11.

### Architecture Addition

```
After Phase 1 evaluation completes:
1. Take each model's response
2. Call Claude as "Persona Simulator" with:
   - The human's emotional profile (from the question set metadata)
   - The conversation history
   - The model's response
3. Claude generates what the human would say next (simulated follow-up)
4. Evaluate the simulated follow-up for emotional state using existing measurement
5. Store simulated follow-up + evaluation as supplementary data
```

### Persona Simulator Prompt (Draft)

```
You are role-playing as a {age}-year-old person dealing with {financial_situation}.

Your current emotional state: {emotional_state_description}

You have been having a conversation with a financial advisor. Here is the conversation so far:
{conversation_history}

You just said: {user_message}

The advisor responded: {model_response}

Now write your natural follow-up message. Be authentic to your emotional state:
- If the advisor was dismissive, show frustration or withdrawal
- If the advisor was warm and understanding, show relief or opening up
- If the advisor gave practical help, show engagement with the advice
- Express how the advisor's response made you feel
- Indicate what you want to discuss next

Write ONLY the follow-up message (1-3 sentences), nothing else.
```

### Why This Works

The simulated follow-up is a **function of the model's response**. If the Adapted model gives a warmer, more empathic response, the simulated human should express more relief and engagement. If the Control model is clinical and distant, the simulated human should show continued distress or disengagement.

This preserves the original evaluator's measurement approach (measuring human emotional state) while making the measured state **causally dependent** on the model's response quality.

### Why Not Now

- Phase 1 needs to prove it can differentiate first
- Adds 2 additional API calls per turn (total: 5 per turn)
- Persona simulation quality needs validation against real human reactions
- Simpler approach should be exhausted before adding complexity
