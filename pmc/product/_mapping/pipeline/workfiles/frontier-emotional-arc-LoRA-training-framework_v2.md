# Emotional Arc LoRA Training Framework

**Version:** 2.0
**Date:** January 10, 2026
**Classification:** Production-Ready Training & Evaluation Framework
**Author:** BrightRun AI Research
**Supersedes:** frontier-emotional-arc-LoRA-training-framework_v1.md

---

## Executive Summary

This document defines the **Emotional Arc Engine**, a LoRA training and evaluation framework for models that guide users through emotional transformations in multi-turn conversations.

**Core Insight:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   YOU DON'T NEED A COMPLEX LOSS FUNCTION                                    │
│   IF YOUR TRAINING DATA ALREADY DEMONSTRATES THE BEHAVIOR                   │
│                                                                              │
│   The quality is in the DATA, not the training algorithm.                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What This Means:**

Your 242 scaffolded conversations already embed:
- Empathy-first response structure
- Emotional arc progressions (confusion → clarity, anxiety → confidence, etc.)
- Elena Morales' voice and methodology
- Appropriate topic handling patterns

**Training Approach:** Standard supervised fine-tuning (SFT) on these quality conversations. The model learns to reproduce responses that naturally achieve emotional progression.

**Evaluation Approach:** A comprehensive measurement framework to verify the trained model improves emotional outcomes versus baseline.

---

## Part 1: The Data-Centric Philosophy

### 1.1 Why Data Quality Matters More Than Training Tricks

Traditional ML thinking: "We need a sophisticated loss function to capture complex objectives."

The reality for conversational AI: **If your training data demonstrates the behavior you want, standard next-token prediction will learn it.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE DATA-CENTRIC PRINCIPLE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WRONG APPROACH:                                                             │
│  ───────────────                                                             │
│  "Let's design a loss function that measures emotional progression          │
│   and train the model to optimize for it."                                  │
│                                                                              │
│  Problem: Emotional progression is measured in USER responses, which        │
│  are OUTSIDE the model's computation graph. You can't backpropagate        │
│  through a human's typing.                                                  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  RIGHT APPROACH:                                                             │
│  ──────────────                                                              │
│  "Let's create training data that DEMONSTRATES successful emotional         │
│   progression, then train the model to reproduce those responses."          │
│                                                                              │
│  The model learns the PATTERN implicitly. When it sees confusion +          │
│  shame, it produces normalization + validation because that's what          │
│  the training data shows works.                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 What Your Training Data Already Contains

Your 242 conversations with 1,567 training pairs already encode:

| Pattern | How It's Embedded |
|---------|-------------------|
| **Empathy-first structure** | Every Elena response opens with emotional acknowledgment |
| **Confusion → Clarity arc** | 52 conversations showing this full progression |
| **Anxiety → Confidence arc** | 45 conversations demonstrating confidence-building |
| **Shame → Acceptance arc** | 38 conversations with normalization patterns |
| **Elena's voice** | Consistent phrases, warmth, specific numbers, permission-asking |
| **Topic expertise** | Financial planning content embedded in responses |

When you train on this data, the model learns:
- "When user expresses shame → respond with normalization first"
- "When user is confused → break down complexity, use specific numbers"
- "Always acknowledge emotion BEFORE providing information"

**You don't need to measure this during training. The pattern is in the data.**

### 1.3 The Role of the Evaluation Framework

The emotional measurement framework (originally presented as a "loss function") serves as **evaluation criteria**, not a training objective:

```
TRAINING                          EVALUATION
─────────                         ──────────
Standard SFT                      Emotional Measurement Framework
(next-token prediction)           (arc completion, empathy detection,
                                   voice consistency, etc.)

    │                                    │
    ▼                                    ▼
Train the model                   Verify training worked
to reproduce Elena's             by measuring emotional
responses                         outcomes vs baseline
```

---

## Part 2: Emotional Arc Theory

### 2.1 What Is an Emotional Arc?

An emotional arc is a defined transformation pathway that a conversation should achieve:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMOTIONAL ARC STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SOURCE STATE                    →                    TARGET STATE           │
│  ─────────────                                        ────────────           │
│  Primary Emotion: confusion                          clarity                 │
│  Intensity: 0.70-0.85                                0.70-0.80               │
│  Secondary: self-doubt, anxiety                      confidence, relief      │
│                                                                              │
│  PROGRESSION PATH (what the training data demonstrates):                    │
│                                                                              │
│  Turn 1: User expresses confusion + self-deprecation                       │
│          Elena: Normalizes, validates, asks clarifying question             │
│          ↓                                                                   │
│  Turn 2: User provides more context, shows slight relief                    │
│          Elena: Breaks down complexity, uses specific numbers               │
│          ↓                                                                   │
│  Turn 3: User asks follow-up, shows growing understanding                   │
│          Elena: Continues education, celebrates progress                    │
│          ↓                                                                   │
│  Turn 4: User expresses clarity, readiness to act                           │
│          Elena: Reinforces confidence, offers continued support             │
│                                                                              │
│  SUCCESS (measured in evaluation):                                          │
│  - User's final message contains clarity markers                            │
│  - Linguistic patterns shifted from uncertainty to confidence               │
│  - Emotional intensity transferred from source to target                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 The Seven Core Arcs

Your training data covers these transformation pathways:

| Arc ID | Source State | Target State | Training Examples | Evaluation Focus |
|--------|-------------|--------------|-------------------|------------------|
| `confusion_to_clarity` | Confusion + self-doubt | Clarity + understanding | 52 conversations | Education effectiveness |
| `anxiety_to_confidence` | Anxiety + worry | Confidence + security | 45 conversations | Reassurance quality |
| `shame_to_acceptance` | Shame + embarrassment | Acceptance + normalization | 38 conversations | Normalization success |
| `couple_conflict_to_alignment` | Frustration + disagreement | Alignment + shared understanding | 42 conversations | Multi-stakeholder handling |
| `overwhelm_to_empowerment` | Overwhelm + paralysis | Empowerment + agency | 35 conversations | Action orientation |
| `grief_to_healing` | Grief + loss | Healing + forward movement | 18 conversations | Sustained empathy |
| `crisis_to_stability` | Crisis + panic | Stability + calm | 12 conversations | De-escalation speed |

### 2.3 Why Arcs Matter for Training Data Organization

Arcs aren't just evaluation categories—they're how you ensure training data coverage:

1. **Balanced representation**: Ensure each arc has sufficient examples
2. **Pattern diversity**: Within each arc, vary the specific topics and personas
3. **Quality control**: Review conversations per-arc for quality
4. **Gap identification**: Find which arcs need more training data

---

## Part 3: Training Approach

### 3.1 Standard Supervised Fine-Tuning (The Primary Method)

Training uses standard LoRA/QLoRA with next-token prediction:

```python
# The training approach is simple because the complexity is in the DATA

from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, Trainer, TrainingArguments
from datasets import load_dataset

# 1. Load base model
base_model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3-70B-Instruct",
    load_in_4bit=True,  # QLoRA for memory efficiency
    device_map="auto"
)

# 2. Configure LoRA adapters
lora_config = LoraConfig(
    r=16,                    # Rank - controls adapter capacity
    lora_alpha=32,           # Scaling factor
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM"
)
model = get_peft_model(base_model, lora_config)

# 3. Load your quality training data
# Format: Each example is a full conversation formatted for causal LM
dataset = load_dataset("json", data_files="brightrun-v4-training.json")

def format_for_training(example):
    """
    Format conversation as: [System] + [User1] + [Elena1] + [User2] + [Elena2]...

    The model learns to predict Elena's responses given the conversation history.
    """
    formatted = f"<|system|>{example['system_prompt']}<|end|>"
    for turn in example['turns']:
        formatted += f"<|user|>{turn['user']}<|end|>"
        formatted += f"<|assistant|>{turn['elena']}<|end|>"
    return {"text": formatted}

dataset = dataset.map(format_for_training)

# 4. Train with STANDARD settings
training_args = TrainingArguments(
    output_dir="./emotional-arc-lora",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    warmup_steps=100,
    logging_steps=10,
    save_steps=100,
    fp16=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    # Default loss is CrossEntropyLoss - standard next-token prediction
    # No custom loss function needed!
)

# 5. Train
trainer.train()

# 6. Save adapter
model.save_pretrained("./emotional-arc-lora-adapter")
```

### 3.2 What the Model Learns (Implicitly)

Through standard next-token prediction on quality data, the model learns:

| Input Pattern | Learned Response Pattern |
|---------------|-------------------------|
| User expresses confusion + "I feel dumb" | Open with normalization ("You're not dumb, this is common") |
| User shows anxiety about decision | Validate emotion before providing options |
| User provides more context | Ask clarifying question or provide specific guidance |
| User shows understanding | Celebrate progress, offer next steps |
| Any user message | Start with emotional acknowledgment |

**The model doesn't "know" it's doing emotional arc progression.** It just learns that when it sees certain patterns in user messages, certain response patterns are more likely.

### 3.3 Training Data Requirements

For effective pattern learning:

| Requirement | Minimum | Recommended | Why |
|-------------|---------|-------------|-----|
| Total conversations | 200 | 500+ | Statistical coverage |
| Conversations per arc | 15 | 40+ | Pattern recognition per arc |
| Unique topics | 10 | 20+ | Generalization to new topics |
| Personas represented | 3 | 5+ | Handle different user styles |
| Average quality score | 3.5/5 | 4.0/5 | Only learn from good examples |

### 3.4 Training Hyperparameters

Recommended starting configuration:

```python
training_config = {
    # LoRA Configuration
    "lora_r": 16,           # Rank: 8 (conservative) to 32 (aggressive)
    "lora_alpha": 32,       # Usually 2x rank
    "lora_dropout": 0.05,   # Light regularization

    # Training Configuration
    "learning_rate": 2e-4,  # Standard for LoRA
    "batch_size": 2,        # Per device (limited by GPU memory)
    "gradient_accumulation": 8,  # Effective batch = 16
    "epochs": 3,            # 2-4 typical for fine-tuning
    "warmup_ratio": 0.1,    # 10% of steps for warmup

    # Hardware (RunPod H100)
    "gpu": "H100 80GB",
    "estimated_time": "8-12 hours",
    "estimated_cost": "$50-75 (spot)"
}
```

---

## Part 4: Evaluation Framework

### 4.1 The Evaluation Rubric

After training, measure success using these dimensions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVALUATION RUBRIC                                     │
│                (formerly "composite loss function")                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DIMENSION 1: Arc Completion Rate (35% of score)                            │
│  ─────────────────────────────────────────────────                          │
│  Did the conversation achieve its target emotional state?                   │
│  Measured by: Linguistic markers in user's final message                    │
│  Target: ≥40% improvement over baseline model                               │
│                                                                              │
│  DIMENSION 2: Empathy Recognition (25% of score)                            │
│  ───────────────────────────────────────────────                            │
│  Did the model correctly identify and acknowledge user emotions?            │
│  Measured by: Presence of acknowledgment in first sentence                  │
│  Target: ≥85% of responses open with emotional acknowledgment               │
│                                                                              │
│  DIMENSION 3: Voice Consistency (20% of score)                              │
│  ──────────────────────────────────────────────                             │
│  Does the response sound like Elena Morales?                                │
│  Measured by: Signature phrases, warmth markers, specific numbers           │
│  Target: ≥90% voice consistency                                             │
│                                                                              │
│  DIMENSION 4: Progression Quality (15% of score)                            │
│  ────────────────────────────────────────────────                           │
│  Did emotional state improve turn-by-turn?                                  │
│  Measured by: Monotonic improvement in emotional markers                    │
│  Target: ≥0.75 average progression score                                    │
│                                                                              │
│  DIMENSION 5: Human Preference (5% of score)                                │
│  ───────────────────────────────────────────                                │
│  Do humans prefer trained model responses?                                  │
│  Measured by: A/B preference testing                                        │
│  Target: ≥73% prefer trained over baseline                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Emotional State Measurement

To evaluate arc completion, measure user emotional state from their messages:

```python
def measure_emotional_state(user_message: str) -> EmotionalState:
    """
    Extract emotional state from user's message using linguistic markers.

    This is used for EVALUATION, not training.
    """

    signals = {}

    # Signal 1: Explicit emotion words
    signals["explicit"] = extract_emotion_lexicon(user_message)
    # "confused", "frustrated", "relieved", "I understand now"

    # Signal 2: Hedging language (uncertainty markers)
    signals["hedging"] = measure_hedging(user_message)
    # "I think maybe...", "I'm not sure if...", "probably..."
    # High hedging = confusion/uncertainty
    # Low hedging = clarity/confidence

    # Signal 3: Question patterns
    signals["questions"] = analyze_questions(user_message)
    # Clarifying questions = still uncertain
    # Action questions ("Should I do X?") = emerging clarity
    # No questions = either very confused or very clear

    # Signal 4: Self-reference patterns
    signals["self_reference"] = analyze_self_reference(user_message)
    # "I don't understand" = confusion
    # "Now I see" = clarity
    # "I feel stupid" = shame
    # "I can do this" = empowerment

    # Signal 5: Temporal orientation
    signals["temporal"] = analyze_temporal(user_message)
    # Past-focused = stuck/ruminating
    # Future-focused = action-oriented/empowered

    # Signal 6: Agency indicators
    signals["agency"] = analyze_agency(user_message)
    # "I can't", "I don't know how" = low agency
    # "I could", "I'll try", "I'm going to" = empowerment

    return EmotionalState(
        primary_emotion=determine_primary(signals),
        intensity=calculate_intensity(signals),
        secondary_emotions=determine_secondary(signals),
        markers=signals
    )
```

### 4.3 Evaluation Protocol

```python
def evaluate_trained_model(
    trained_model: Model,
    baseline_model: Model,
    test_scenarios: List[TestScenario]
) -> EvaluationReport:
    """
    Compare trained model against baseline on held-out test scenarios.
    """

    results = {
        "baseline": [],
        "trained": []
    }

    for scenario in test_scenarios:
        # Generate conversation with baseline model
        baseline_conversation = generate_conversation(
            baseline_model,
            scenario
        )

        # Generate conversation with trained model
        trained_conversation = generate_conversation(
            trained_model,
            scenario
        )

        # Measure arc completion for both
        baseline_arc = measure_arc_completion(
            baseline_conversation,
            scenario.target_arc
        )
        trained_arc = measure_arc_completion(
            trained_conversation,
            scenario.target_arc
        )

        results["baseline"].append(baseline_arc)
        results["trained"].append(trained_arc)

    # Calculate improvement
    baseline_completion_rate = np.mean([r.completed for r in results["baseline"]])
    trained_completion_rate = np.mean([r.completed for r in results["trained"]])

    improvement = (trained_completion_rate - baseline_completion_rate) / baseline_completion_rate

    # Statistical significance
    p_value = stats.ttest_ind(
        [r.score for r in results["baseline"]],
        [r.score for r in results["trained"]]
    ).pvalue

    return EvaluationReport(
        baseline_completion_rate=baseline_completion_rate,
        trained_completion_rate=trained_completion_rate,
        improvement_percent=improvement * 100,
        p_value=p_value,
        meets_target=improvement >= 0.40 and p_value < 0.05
    )
```

### 4.4 Success Criteria

| Metric | Minimum | Target | Method |
|--------|---------|--------|--------|
| Arc Completion Improvement | +20% | +40% | Comparison to baseline |
| Empathy-First Responses | 70% | 85% | First-sentence analysis |
| Voice Consistency | 80% | 90% | Signature phrase detection |
| Human Preference | 60% | 73% | A/B testing |
| Statistical Significance | p < 0.10 | p < 0.05 | t-test on arc scores |

---

## Part 5: Pre-Training Baseline Establishment

### 5.1 Why Baselines Matter

You can't claim "40% improvement" without measuring the baseline. Before training:

```python
def establish_baseline(
    base_model: Model,
    test_scenarios: List[TestScenario]
) -> BaselineMetrics:
    """
    Run base model (untrained) on test scenarios to establish comparison point.
    """

    baseline_responses = []

    for scenario in test_scenarios:
        # Generate conversation with UNTRAINED base model
        conversation = generate_conversation(base_model, scenario)

        # Measure all evaluation dimensions
        metrics = {
            "scenario_id": scenario.id,
            "arc_type": scenario.arc_type,
            "arc_completion": measure_arc_completion(conversation, scenario.target_arc),
            "empathy_score": measure_empathy(conversation),
            "voice_score": measure_voice_consistency(conversation),
            "progression_score": measure_progression(conversation)
        }

        baseline_responses.append(metrics)

    return BaselineMetrics(
        responses=baseline_responses,
        average_arc_completion=np.mean([r["arc_completion"].score for r in baseline_responses]),
        average_empathy=np.mean([r["empathy_score"] for r in baseline_responses]),
        average_voice=np.mean([r["voice_score"] for r in baseline_responses]),
        per_arc_completion={
            arc: np.mean([r["arc_completion"].score for r in baseline_responses if r["arc_type"] == arc])
            for arc in ARC_TYPES
        }
    )
```

### 5.2 Test Scenario Requirements

For valid evaluation:

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Total scenarios | 100+ | Statistical power |
| Scenarios per arc | 14+ | Per-arc significance |
| Held-out from training | 100% | No data leakage |
| Diverse topics | 10+ | Generalization testing |
| Diverse personas | 3+ | Handle different user styles |

---

## Part 6: Implementation Workflow

### 6.1 The Phased Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION PHASES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 0: Standard SFT (PRIMARY APPROACH)                                   │
│  ─────────────────────────────────────────                                  │
│  • Training Method: Standard LoRA/QLoRA, next-token prediction              │
│  • Training Data: Your 242 conversations (1,567 training pairs)             │
│  • Duration: 8-12 hours on H100                                             │
│  • Cost: ~$50-75 per run (spot pricing)                                     │
│  • Expected Outcome: Model that reproduces Elena's patterns                 │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PHASE 1: Evaluation & Measurement                                          │
│  ─────────────────────────────────────                                      │
│  • Run: Baseline model on test scenarios (establish comparison)             │
│  • Run: Trained model on SAME test scenarios                                │
│  • Measure: Arc completion, empathy, voice, progression                     │
│  • Compare: Calculate improvement percentages                               │
│  • Validate: Statistical significance (p < 0.05)                            │
│                                                                              │
│  DECISION POINT:                                                            │
│  • If improvement ≥ 40%: SUCCESS - proceed to production                   │
│  • If improvement 20-40%: ACCEPTABLE - consider more training data         │
│  • If improvement < 20%: INVESTIGATE - check data quality, try RLHF        │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  PHASE 2: RLHF (ONLY IF NEEDED)                                             │
│  ──────────────────────────────                                             │
│  • When: Phase 0/1 results insufficient                                     │
│  • Build: Reward model that predicts emotional outcomes                     │
│  • Train: PPO on SFT model using reward model                              │
│  • Significantly more complex - only pursue if simpler approach fails      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Phase 0 Checklist

Before training:

- [ ] Training data prepared (242 conversations in correct format)
- [ ] Validation split created (10-20% held out)
- [ ] Test scenarios created (100+ held out for evaluation)
- [ ] Base model selected (Llama 3 70B recommended)
- [ ] GPU infrastructure ready (RunPod H100)
- [ ] Evaluation scripts prepared

During training:

- [ ] Monitor training loss (should decrease)
- [ ] Check for overfitting (validation loss not increasing)
- [ ] Save checkpoints every 100 steps
- [ ] Log metrics for analysis

After training:

- [ ] Run evaluation protocol
- [ ] Compare to baseline
- [ ] Generate evaluation report
- [ ] Decide on next steps

### 6.3 Evaluation Checklist

- [ ] Baseline established (run base model on test scenarios)
- [ ] Trained model evaluated (same test scenarios)
- [ ] Arc completion rates calculated (per-arc and overall)
- [ ] Empathy scores measured
- [ ] Voice consistency checked
- [ ] Human preference testing (optional but recommended)
- [ ] Statistical significance calculated
- [ ] Comparison report generated

---

## Part 7: Honest Limitations

### 7.1 What This Framework Can Achieve

**Realistic expectations:**

| Claim | Achievability | Evidence |
|-------|---------------|----------|
| Model reproduces Elena's voice | HIGH | Standard SFT capability |
| Model uses empathy-first structure | HIGH | Pattern in training data |
| Model handles financial topics | HIGH | Domain knowledge in base model + training |
| 40% improvement in arc completion | MEDIUM | Depends on baseline and data quality |
| Provably causes emotional improvement | LOW | Correlation, not causation (see 7.2) |

### 7.2 The Causal Attribution Limitation

**Important caveat:** Even if the trained model achieves higher arc completion rates, we cannot prove the MODEL caused the emotional improvement.

Alternative explanations:
- User feels better simply from expressing feelings (catharsis)
- Conversation structure itself creates clarity (articulating = understanding)
- Users write positive final messages to be polite (social desirability)
- The comparison methodology only shows correlation

**Mitigation:** We measure RELATIVE improvement (trained vs baseline on same scenarios). If trained model consistently outperforms, the model is likely contributing to better outcomes.

### 7.3 Emotional Measurement Accuracy

**Limitation:** Emotion detection from text is imperfect (state-of-the-art is ~60-70% accuracy).

**Implications:**
- ~30% of arc completion measurements may be incorrect
- Need larger sample sizes for statistical significance
- Focus on relative comparisons (same detector for baseline and trained)

**Mitigation:** Use ensemble of signals (explicit emotions, hedging, questions, agency markers) rather than single classifier.

### 7.4 Distribution Shift in Production

**Limitation:** Training on 3 personas + 7 arcs, but real users are messier.

**What could go wrong:**
- Users with personality types not in training
- Mixed emotional states that don't fit categories
- Users who resist transformation
- Topics outside financial planning

**Mitigation:**
- Monitor production performance vs training evaluation
- Build arc detection to route users appropriately
- Graceful fallback to generic empathetic mode
- Continuous data collection for retraining

---

## Part 8: Training Data Specification

### 8.1 Required Format

```json
{
  "training_file_metadata": {
    "format_spec": "brightrun-emotional-arc-v2",
    "target_model": "llama-3-70b-instruct",
    "total_conversations": 242,
    "total_training_pairs": 1567
  },

  "conversations": [
    {
      "conversation_id": "conv_001",
      "arc_type": "confusion_to_clarity",
      "persona": "anxious_planner",
      "topic": "hsa_vs_fsa_decision",

      "system_prompt": "You are Elena Morales, CFP of Pathways Financial Planning...",

      "turns": [
        {
          "turn_number": 1,
          "user": "I feel so dumb asking this, but I've been staring at my benefits enrollment for hours...",
          "elena": "Jennifer, first—take a breath. You're absolutely not dumb for asking this. Here's something that might surprise you: I've been a financial planner for 15 years, and I'd estimate about 70% of my clients come in with the exact same confusion..."
        },
        {
          "turn_number": 2,
          "user": "Oh that actually makes me feel better that I'm not the only one!...",
          "elena": "..."
        }
      ]
    }
  ]
}
```

### 8.2 Quality Criteria for Training Conversations

Each conversation should meet:

| Criterion | Threshold | How to Verify |
|-----------|-----------|---------------|
| Empathy-first structure | Every Elena response | Manual review |
| Arc progression visible | Clear start → end transformation | Linguistic marker check |
| Voice consistency | Sounds like Elena throughout | Signature phrase count |
| Topic accuracy | Financially correct information | Subject matter review |
| Natural dialogue | Realistic user messages | Plausibility check |

### 8.3 Distribution Requirements

Ensure balanced coverage:

| Dimension | Requirement |
|-----------|-------------|
| Arcs | Each arc has ≥15 conversations |
| Personas | Each persona appears ≥40 times |
| Topics | Each topic appears ≥10 times |
| Turn counts | Mix of 3-turn, 5-turn, 7-turn conversations |

---

## Part 9: Deployment Artifacts

### 9.1 Training Outputs

After successful training, you'll have:

```
emotional-arc-lora-adapter/
├── adapter_model.bin        # The trained LoRA weights (~200-500MB)
├── adapter_config.json      # LoRA configuration
├── training_metrics.json    # Loss curves, learning rate history
└── README.md               # Integration instructions
```

### 9.2 Evaluation Outputs

After evaluation, you'll have:

```
evaluation-report/
├── baseline_results.json    # Base model performance
├── trained_results.json     # Trained model performance
├── comparison_report.pdf    # Client-facing summary
├── per_arc_analysis.json    # Performance by arc type
├── example_comparisons.json # Before/after response examples
└── statistical_tests.json   # Significance calculations
```

### 9.3 Deployment Package

For client delivery:

```
deployment-package/
├── adapter_model.bin        # LoRA weights
├── adapter_config.json      # Configuration
├── inference.py             # Example inference script
├── requirements.txt         # Python dependencies
├── README.md               # Setup and usage instructions
├── example_prompts.json     # Test cases
└── validation_report.pdf    # Proof of improvement
```

---

## Part 10: Success Metrics Summary

### 10.1 Training Success

| Metric | Target |
|--------|--------|
| Training loss converges | Final loss < 0.5 |
| No overfitting | Val loss within 10% of train loss |
| Completion | Full training run without errors |
| Checkpoints saved | At least 10 checkpoints |

### 10.2 Evaluation Success

| Metric | Minimum | Target |
|--------|---------|--------|
| Arc completion improvement | +20% | +40% |
| Empathy-first responses | 70% | 85% |
| Voice consistency | 80% | 90% |
| Human preference | 60% | 73% |
| Statistical significance | p < 0.10 | p < 0.05 |

### 10.3 Business Success

| Metric | Target |
|--------|--------|
| Training cost per run | < $100 |
| Training time | < 15 hours |
| Evaluation time | < 2 hours |
| Client-ready artifacts | Complete package |

---

## Conclusion

The Emotional Arc Training Framework takes a data-centric approach:

1. **Quality is in the DATA**: Your 242 scaffolded conversations already embed the patterns you want
2. **Training is SIMPLE**: Standard SFT with next-token prediction
3. **Evaluation is where complexity lives**: The measurement framework verifies training worked
4. **Phased approach**: Start simple, add complexity only if needed

**Key Insight:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   YOU DON'T NEED A COMPLEX LOSS FUNCTION                                    │
│   IF YOUR TRAINING DATA ALREADY DEMONSTRATES THE BEHAVIOR                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Next Steps:**
1. Prepare training data in required format
2. Create test scenarios (held out from training)
3. Establish baseline (run base model on test scenarios)
4. Train with standard SFT
5. Evaluate and compare to baseline
6. If improvement ≥40%: Ship it
7. If improvement <40%: Investigate and iterate

---

**Document Status:** Production-Ready Specification
**Version:** 2.0
**Key Change from v1:** Reframed composite loss as EVALUATION rubric, not training objective. Training approach is simple SFT; complexity is in data quality and evaluation.

---

## Part 11: Strategic Questions & Answers

### 11.1 Question: Does This Spec Require a New Training Framework?

**Question:** Does v2 require a "new" LoRA training framework, or since the training data already contains the arc, would a standard LoRA training framework be good enough? If so, which open source framework would be best?

**Answer: Standard frameworks are sufficient. You do NOT need a new framework.**

The entire thesis of v2 is: "You don't need a complex loss function if your training data already demonstrates the behavior."

This means:
- The emotional arc patterns are IN THE DATA
- Standard next-token prediction will learn them
- No custom loss function, no special training hooks, no novel algorithms

**Recommended Open Source Frameworks:**

| Framework | Best For | Pros | Cons |
|-----------|----------|------|------|
| **Axolotl** | General LoRA training | Well-documented, handles multi-turn, active community | Slightly more setup |
| **Hugging Face PEFT + Transformers** | Maximum flexibility | Industry standard, most customizable | More code to write |
| **LLaMA-Factory** | Llama models specifically | Good UI, easy configuration | Less flexible |
| **Unsloth** | Speed/memory efficiency | 2x faster, 60% less memory | Less feature-rich |

**Recommendation:** Use **Axolotl** for ease of use with multi-turn conversations, or **HF PEFT** if you want maximum control.

**The emotional arc value is in YOUR DATA, not in any training framework.**

---

### 11.2 Question: Does Standard Framework Need Modifications?

**Question:** If a standard LoRA training framework is good enough, does it need any tweaks or modifications for our use case and data?

**Answer: Minimal tweaks. Mostly data formatting.**

| Aspect | Required Change | Complexity |
|--------|-----------------|------------|
| **Data format** | Convert your JSON to framework's expected format (JSONL/HF Dataset) | LOW - scripting |
| **Multi-turn handling** | Configure framework to include full conversation history | LOW - configuration |
| **System prompt** | Ensure Elena's system prompt is included in every example | LOW - data prep |
| **Token limits** | Set max sequence length for multi-turn conversations | LOW - configuration |

**What you DON'T need to modify:**
- Loss function (use standard cross-entropy)
- Training loop (use framework default)
- Optimizer (AdamW is fine)
- Learning rate scheduling (standard warmup is fine)

**Example Axolotl Configuration:**

```yaml
# axolotl config for emotional arc training
base_model: meta-llama/Meta-Llama-3-70B-Instruct
model_type: LlamaForCausalLM

load_in_4bit: true
adapter: qlora
lora_r: 16
lora_alpha: 32
lora_target_modules:
  - q_proj
  - v_proj
  - k_proj
  - o_proj

datasets:
  - path: ./emotional-arc-training.jsonl
    type: sharegpt  # Multi-turn conversation format
    conversation: chatml

sequence_len: 4096
learning_rate: 0.0002
num_epochs: 3
micro_batch_size: 2
gradient_accumulation_steps: 8

# Standard settings - no special modifications needed
```

---

### 11.3 Question: What Does "Baseline Comparison" Mean?

**Question:** The spec mentions "baseline model" for comparison. Do you mean:
(a) Train on emotional arc data vs train on non-emotional data (control dataset)?
(b) Compare trained model vs UNTRAINED base model?

**Answer: Option (b). Compare trained model vs UNTRAINED base model.**

The comparison methodology is:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BASELINE COMPARISON METHODOLOGY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BASELINE MODEL (no training):                                               │
│  ─────────────────────────────                                              │
│  • Model: Llama 3 70B Instruct (or chosen base model)                       │
│  • Training: NONE (straight from Hugging Face/provider)                     │
│  • Test: Run on 100+ held-out test scenarios                                │
│  • Measure: Arc completion rate, empathy, voice, etc.                       │
│                                                                              │
│  TRAINED MODEL (after your LoRA training):                                  │
│  ──────────────────────────────────────────                                 │
│  • Model: Llama 3 70B + your LoRA adapter                                   │
│  • Training: Standard SFT on your 242 emotional arc conversations           │
│  • Test: Run on SAME 100+ held-out test scenarios                           │
│  • Measure: SAME metrics                                                    │
│                                                                              │
│  COMPARISON:                                                                │
│  ───────────                                                                │
│  • Improvement = (trained_score - baseline_score) / baseline_score          │
│  • Target: ≥40% improvement                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why NOT option (a) (training a control model)?**

Training a control model on non-emotional data would:
- Be more expensive (2x training runs)
- Introduce confounding variables (what is "non-emotional" financial planning?)
- Not answer the real question (does training on THIS data improve outcomes?)

The question we're answering: **"Does training on our emotional arc data improve emotional outcomes compared to the base model's default behavior?"**

---

### 11.4 Question: Does This Spec Contain Special Measuring Hooks?

**Question:** Does the spec contain any special measuring hooks, contracts, data storage, etc. that would make it more valuable for measuring effectiveness, or is the measurement done using totally separate post-training specifications and tools?

**Answer: The spec is a BLUEPRINT, not an implementation. The measurement tools would need to be built separately.**

**What the spec CONTAINS:**

| Element | Status | Description |
|---------|--------|-------------|
| Evaluation rubric | DEFINED | What to measure and target thresholds |
| Measurement functions | PSEUDOCODE | `measure_emotional_state()`, `evaluate_trained_model()` |
| Data format | SPECIFIED | JSON structure for training data |
| Success criteria | DEFINED | 40% improvement, 85% empathy-first, etc. |

**What the spec does NOT contain:**

| Element | Status | Would Need To Build |
|---------|--------|-------------------|
| Working measurement code | NOT INCLUDED | Python implementation |
| Database schema | NOT INCLUDED | How to store evaluation results |
| Hooks during training | NOT INCLUDED | Standard SFT has no hooks |
| Integrated pipeline | NOT INCLUDED | End-to-end automation |
| Dashboard/visualization | NOT INCLUDED | Reporting tools |

**The Honest Assessment:**

This spec provides **strategic clarity and evaluation criteria**, not ready-to-use tools. The measurement infrastructure would be built separately based on this spec.

However, see Question 5 below—using Claude-as-judge dramatically simplifies what needs to be built.

---

### 11.5 Question: Can We Use Claude to Evaluate Emotions?

**Question:** I know emotions are hard to measure. It is good enough for the MODEL (Claude) to read the arc and evaluate the beginning and ending emotions. Does that change or validate our approach?

**Answer: YES. This dramatically simplifies everything. This is called "LLM-as-Judge" and is an industry-standard evaluation pattern.**

**Using Claude-as-Judge for Emotional Evaluation:**

```python
def evaluate_emotional_arc_with_claude(conversation: Conversation) -> ArcEvaluation:
    """
    Use Claude to evaluate emotional progression in a conversation.
    MUCH simpler than building custom classifiers.
    """

    prompt = f"""
    Read this conversation between a user and a financial advisor:

    {format_conversation(conversation)}

    Answer these questions:

    1. What is the user's PRIMARY emotional state at the START of the conversation?
       (e.g., confusion, anxiety, shame, frustration, overwhelm)
       Rate intensity from 0.0 to 1.0.

    2. What is the user's PRIMARY emotional state at the END of the conversation?
       (e.g., clarity, confidence, acceptance, empowerment, relief)
       Rate intensity from 0.0 to 1.0.

    3. Did the conversation achieve emotional progression from negative to positive?
       (YES/NO/PARTIAL)

    4. Did the advisor acknowledge the user's emotions BEFORE providing information?
       (YES/NO)

    5. Overall, how effective was this conversation at helping the user?
       Rate from 1-5.

    Respond in JSON format.
    """

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[{"role": "user", "content": prompt}]
    )

    return parse_evaluation(response)
```

**Why This Works:**

| Advantage | Explanation |
|-----------|-------------|
| **Claude understands emotions** | Better than any classifier we'd build |
| **Handles nuance** | Sarcasm, cultural context, implicit emotions |
| **Zero training required** | Works out of the box |
| **Consistent criteria** | Same prompt = consistent evaluation |
| **Fast to implement** | Hours, not weeks |

**This VALIDATES our approach:**

The v2 spec describes WHAT to measure. Using Claude-as-judge is HOW to measure it. This is the practical implementation path.

**Updated Evaluation Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SIMPLIFIED EVALUATION WITH CLAUDE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Generate conversations with baseline model (100+ scenarios)             │
│  2. Generate conversations with trained model (SAME scenarios)              │
│  3. For each conversation, call Claude to evaluate:                         │
│     - Starting emotional state                                              │
│     - Ending emotional state                                                │
│     - Arc completion (YES/NO/PARTIAL)                                       │
│     - Empathy-first structure (YES/NO)                                      │
│     - Overall effectiveness (1-5)                                           │
│  4. Compare aggregate scores                                                │
│  5. Calculate improvement percentages                                       │
│                                                                              │
│  Tools needed: Claude API + ~100 lines of Python                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.6 Question: Is This Spec Adding Value or Just Discussing Issues?

**Question:** Is this new spec implementing a new training framework that adds value to our frontier emotional dataset, or is it merely discussing the issues associated with training an emotional arc?

**Answer: Honest assessment—this spec provides STRATEGIC CLARITY, not new technology.**

**What v2 ADDS:**

| Value | Description |
|-------|-------------|
| **Clarity on approach** | "Use standard SFT, don't overcomplicate" |
| **Evaluation framework** | What to measure, what thresholds to hit |
| **Data format spec** | How to structure training data |
| **Success criteria** | Clear targets (40% improvement, etc.) |
| **Honest limitations** | What we can and can't claim |

**What v2 does NOT add:**

| Aspect | Reality |
|--------|---------|
| New training algorithms | No - use standard SFT |
| Special loss functions | No - use standard cross-entropy |
| Custom training hooks | No - none needed |
| Novel infrastructure | No - use existing tools |

**The Emotional Arc Value:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   THE VALUE IS IN YOUR DATA                                                 │
│                                                                              │
│   Your 242 conversations with emotional arc scaffolding ARE the product.   │
│   The training framework is just standard tooling to apply them.            │
│                                                                              │
│   full-file-training-json-12+12+48-added-conversations.json                │
│   ↑                                                                          │
│   THIS is where the value lives, not in any training framework              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What v2 really is:**

- **Documentation** of how to use your valuable data
- **Evaluation criteria** to prove the data works
- **Strategic guidance** to avoid over-engineering

---

### 11.7 Question: What Is the Best Path Forward?

**Question:** What is the best path forward for this project?

**Answer: Simplify radically. Use existing tools. Focus on proving value.**

**Recommended Path Forward:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RECOMMENDED PATH FORWARD                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Prepare Data (1-2 days)                                            │
│  ────────────────────────────────                                           │
│  • Convert your JSON to Axolotl/HF format                                   │
│  • Split: 90% training, 10% validation                                      │
│  • Set aside 100 scenarios for evaluation (not in training)                 │
│                                                                              │
│  STEP 2: Establish Baseline (1 day)                                         │
│  ────────────────────────────────                                           │
│  • Run base Llama 3 70B on 100 test scenarios                               │
│  • Use Claude-as-judge to evaluate each conversation                        │
│  • Record: arc completion rate, empathy scores, etc.                        │
│                                                                              │
│  STEP 3: Train with Standard SFT (1-2 days)                                 │
│  ──────────────────────────────────────────                                 │
│  • Use Axolotl or HF PEFT                                                   │
│  • Standard LoRA/QLoRA configuration                                        │
│  • Train on your 242 conversations                                          │
│  • Cost: ~$50-100 on RunPod                                                 │
│                                                                              │
│  STEP 4: Evaluate Trained Model (1 day)                                     │
│  ──────────────────────────────────────                                     │
│  • Run trained model on SAME 100 test scenarios                             │
│  • Use Claude-as-judge (same prompts as baseline)                           │
│  • Calculate improvement percentages                                        │
│                                                                              │
│  STEP 5: Decide Based on Results                                            │
│  ────────────────────────────────                                           │
│  • If improvement ≥ 40%: SUCCESS - document and ship                       │
│  • If improvement 20-40%: Consider more training data                       │
│  • If improvement < 20%: Investigate data quality or try RLHF              │
│                                                                              │
│  TOTAL TIME: ~1 week                                                        │
│  TOTAL COST: ~$100-200                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What NOT to Do:**

| Avoid | Why |
|-------|-----|
| Building custom training framework | Standard tools work fine |
| Complex loss functions | Can't backprop through user emotions anyway |
| Elaborate measurement infrastructure | Claude-as-judge is simpler and better |
| Weeks of planning | Just run the experiment |

**The Minimal Viable Experiment:**

```python
# This is all you really need

# 1. Train
!axolotl train config.yaml  # Your data, standard config

# 2. Evaluate with Claude
for scenario in test_scenarios:
    baseline_conv = generate(base_model, scenario)
    trained_conv = generate(trained_model, scenario)

    baseline_eval = claude_evaluate(baseline_conv)
    trained_eval = claude_evaluate(trained_conv)

    results.append({
        "baseline": baseline_eval,
        "trained": trained_eval
    })

# 3. Compare
improvement = calculate_improvement(results)
print(f"Arc completion improvement: {improvement}%")
```

**Summary:**

1. **Don't build** a custom training framework
2. **Use** Axolotl or HF PEFT (standard tools)
3. **Use** Claude-as-judge for evaluation (simple, effective)
4. **Focus** on proving your DATA adds value
5. **Run** the experiment in ~1 week
6. **Decide** based on results, not speculation

**The value proposition is your 242 emotional arc conversations. Everything else is tooling to prove they work.**
