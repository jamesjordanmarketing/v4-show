---
license: cc-by-4.0
task_categories:
  - text-generation
  - question-answering
language:
  - en
tags:
  - conversational
  - lora
  - fine-tuning
  - emotional-intelligence
  - financial-planning
  - synthetic-conversations
  - eq-alignment
  - empathy
  - customer-service
  - llama
  - mistral
  - qwen
pretty_name: BrightRun EQ Alignment Sample
size_categories:
  - n<1K
---

# BrightRun EQ Alignment Dataset — Sample Preview

<div align="center">

### 🎯 Train Your LLM to Handle Emotionally Complex Conversations

**This is a 12-conversation sample. The full dataset contains 242 conversations and 1,567 training pairs.**

[![Get Full Dataset](https://img.shields.io/badge/🚀_Get_Full_Dataset-brightrun.ai-blue?style=for-the-badge)](https://brightrun.ai/eq-dataset)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

</div>

---

## ⚠️ This is a Sample — Not the Full Dataset

You're looking at **12 sample conversations** designed to help you evaluate data quality before downloading the complete dataset.

| What You Get Here | What You Get at brightrun.ai |
|-------------------|------------------------------|
| 12 conversations | **242 conversations** |
| 89 training pairs | **1,567 training pairs** |
| 3 personas | 3 personas (full coverage) |
| 2 emotional arcs | **7 emotional arcs** |
| 3 edge case conversations | **39 edge case conversations** |

**Ready for the full dataset?** 👉 [**Download at brightrun.ai/eq-dataset**](https://brightrun.ai/eq-dataset)

---

## 🧠 What Makes This Dataset Different?

Most conversation datasets train LLMs to be **helpful**. This one trains them to be **emotionally intelligent**.

### The Problem with Generic Training Data

Standard instruction-tuning datasets teach models to:
- ✅ Answer questions accurately
- ✅ Follow instructions
- ❌ Handle emotional clients
- ❌ Navigate conflict and shame
- ❌ Know when to set boundaries
- ❌ Recognize crisis situations

### What EQ Alignment Training Does

The BrightRun EQ Alignment Dataset teaches models to:

1. **Acknowledge emotions before problem-solving**
   > "I can hear how overwhelming this feels, and that's completely valid..."

2. **Adapt communication to personality types**
   - Anxious clients → Extra reassurance, detailed explanations
   - Avoidant clients → Simplified steps, low-pressure framing
   - Pragmatic clients → Direct answers, efficiency-focused

3. **Navigate sensitive emotional arcs**
   - Confusion → Clarity
   - Crisis → Appropriate Referral

4. **Maintain professional boundaries**
   - Recognize when to refer to specialists
   - Handle crisis situations appropriately
   - Protect both client and advisor

---

## 📊 Sample Dataset Statistics

| Metric | This Sample | Full Dataset |
|--------|-------------|--------------|
| Conversations | 12 | 242 |
| Training Pairs | 89 | 1,567 |
| Personas | 3 | 3 |
| Emotional Arcs | 2 | 7 |
| Edge Cases | 3 | 39 |
| Format | brightrun-lora-v4 | brightrun-lora-v4 |
| Format Version | 4.0.0 | 4.0.0 |

### Personas Included

| Persona | Sample Count | Full Count | Behavioral Profile |
|---------|--------------|------------|-------------------|
| `anxious_planner` | 4 | 80 | Worried, detail-seeking, needs reassurance |
| `overwhelmed_avoider` | 4 | 79 | Avoidant, easily frustrated, needs simplification |
| `pragmatic_optimist` | 4 | 83 | Direct, solution-focused, values efficiency |

### Emotional Arcs in This Sample

| Arc | Description | Sample Count | Full Count |
|-----|-------------|--------------|------------|
| `confusion_to_clarity` | Lost → Clear path forward | 9 | 60 |
| `crisis_to_referral` | Emergency → Professional handoff | 3 | 13 |

### Training Topics Covered

| Topic | Sample Count | Description |
|-------|--------------|-------------|
| `mortgage_payoff_strategy` | 6 | Accelerated mortgage payoff decisions |
| `estate_planning_basics` | 3 | Essential estate planning guidance |
| `negotiating_compensation` | 3 | Compensation negotiation strategy |

---

## 🚀 Quick Start

### Load the Sample

```python
from datasets import load_dataset

# Load this sample
sample = load_dataset("brightrun/eq-alignment-sample")
print(f"Sample size: {len(sample['train'])} conversations")

# Preview first conversation
print(sample['train'][0])
```

### Data Format

The dataset follows the `brightrun-lora-v4` format with this structure:

```json
{
  "training_file_metadata": {
    "file_name": "EQ-12-conversations-demo",
    "version": "4.0.0",
    "format_spec": "brightrun-lora-v4",
    "target_model": "claude-sonnet-4-5",
    "vertical": "financial_planning_consultant",
    "total_conversations": 12,
    "total_training_pairs": 89,
    "scaffolding_distribution": {
      "personas": { "overwhelmed_avoider": 4, "pragmatic_optimist": 4, "anxious_planner": 4 },
      "emotional_arcs": { "crisis_to_referral": 3, "confusion_to_clarity": 9 },
      "training_topics": { "mortgage_payoff_strategy": 6, "estate_planning_basics": 3, "negotiating_compensation": 3 }
    }
  },
  "consultant_profile": {
    "name": "Elena Morales, CFP",
    "business": "Pathways Financial Planning",
    "expertise": "fee-only financial planning for mid-career professionals",
    "years_experience": 15,
    "core_philosophy": {
      "principle_1": "Money is emotional - always acknowledge feelings before facts",
      "principle_2": "Create judgment-free space - normalize struggles explicitly",
      "principle_3": "Education-first - teach the why not just the what",
      "principle_4": "Progress over perfection - celebrate small wins",
      "principle_5": "Values-aligned decisions - personal context over generic rules"
    }
  },
  "conversations": [
    {
      "conversation_metadata": {
        "conversation_id": "uuid",
        "total_turns": 6,
        "quality_tier": "experimental",
        "scaffolding": {
          "persona_key": "overwhelmed_avoider",
          "persona_name": "Marcus Chen",
          "emotional_arc_key": "crisis_to_referral",
          "emotional_arc": "Crisis → Referral",
          "training_topic_key": "mortgage_payoff_strategy",
          "training_topic": "Accelerated Mortgage Payoff"
        }
      },
      "training_pairs": [
        {
          "id": "fp_conversation_turn1",
          "turn_number": 1,
          "system_prompt": "You are an emotionally intelligent financial planning chatbot...",
          "conversation_history": [],
          "current_user_input": "Client message...",
          "emotional_context": {
            "detected_emotions": {
              "primary": "despair",
              "primary_confidence": 0.8,
              "secondary": "hopelessness",
              "intensity": 0.95
            }
          },
          "target_response": "Advisor response...",
          "training_metadata": {
            "difficulty_level": "intermediate_conversation_turn_1",
            "key_learning_objective": "mortgage_payoff_strategy",
            "emotional_progression_target": "despair(0.8) → referred(0.8)",
            "quality_score": 3
          }
        }
      ]
    }
  ]
}
```

### Training Pair Structure

Each training pair contains:

| Field | Description |
|-------|-------------|
| `system_prompt` | Elena Morales persona and core principles |
| `conversation_history` | Previous turns in the conversation |
| `current_user_input` | The client's current message |
| `emotional_context` | Detected emotions with confidence scores |
| `target_response` | The ideal emotionally intelligent response |
| `training_metadata` | Quality scores, learning objectives, difficulty level |

### Compatible Training Frameworks

- ✅ **Axolotl** — Direct JSONL import
- ✅ **Unsloth** — Use with `alpaca` format adapter
- ✅ **LLaMA-Factory** — Standard instruction format
- ✅ **OpenAI Fine-Tuning API** — Convert to chat format
- ✅ **HuggingFace TRL** — SFTTrainer compatible

---

## 🎓 The Elena Morales Methodology

This dataset was generated using the **Elena Morales Framework**—a structured approach to emotionally intelligent professional communication.

### Elena Morales, CFP — Pathways Financial Planning

A fictional composite persona representing best practices from:
- Certified Financial Planner (CFP) communication standards
- Motivational Interviewing techniques
- Trauma-informed client service approaches
- Professional boundary-setting frameworks

### Core Philosophy (Built Into Every Response)

| Principle | Application |
|-----------|-------------|
| **Money is emotional** | Always acknowledge feelings before facts |
| **Judgment-free space** | Normalize struggles explicitly |
| **Education-first** | Teach the why, not just the what |
| **Progress over perfection** | Celebrate small wins |
| **Values-aligned decisions** | Personal context over generic rules |

### Communication Style

**Tone:** Warm, professional, never condescending

**Techniques:**
- Acknowledge emotions explicitly
- Use metaphors and stories for complex concepts
- Provide specific numbers over abstractions
- Ask permission before educating
- Celebrate progress and small wins

**Avoids:**
- Financial jargon without explanation
- Assumptions about knowledge level
- Judgment of past financial decisions
- Overwhelming with too many options
- Generic platitudes without specifics

---

## 📥 Get the Full Dataset

This sample contains **12 conversations with 89 training pairs**. The full dataset contains **242 conversations with 1,567 training pairs**.

### What's in the Full Dataset?

✅ **20x more conversations** (242 vs 12)  
✅ **Full persona coverage** across all 3 types  
✅ **All 7 emotional arcs** including rare edge cases  
✅ **39 boundary/crisis conversations** for robust training  
✅ **JSON + JSONL formats** ready for any framework  

### Full Dataset Emotional Arcs

| Arc | Count | Description |
|-----|-------|-------------|
| `confusion_to_clarity` | 60 | Lost → Clear path forward |
| `couple_conflict_to_alignment` | 59 | Partners disagreeing → Unified plan |
| `overwhelm_to_empowerment` | 42 | Paralyzed → Actionable steps |
| `shame_to_acceptance` | 42 | Embarrassed → Recovery-focused |
| `hostility_to_boundary` | 13 | Client aggression → Professional limits |
| `crisis_to_referral` | 13 | Emergency → Professional handoff |
| `overwhelm_to_triage` | 13 | Crisis → Immediate priorities |

### How to Get It

1. Visit **[brightrun.ai/eq-dataset](https://brightrun.ai/eq-dataset)**
2. Complete a brief 30-second survey (helps us improve)
3. Get instant download access
4. Start fine-tuning!

<div align="center">

[![Download Full Dataset](https://img.shields.io/badge/📥_Download_Full_Dataset-brightrun.ai/eq--dataset-success?style=for-the-badge)](https://brightrun.ai/eq-dataset)

</div>

---

## 📜 License

This sample dataset is released under **CC-BY-4.0** (Creative Commons Attribution 4.0).

**You are free to:**
- ✅ Use commercially (fine-tune and deploy models)
- ✅ Modify and adapt
- ✅ Redistribute

**You must:**
- 📝 Give appropriate credit to **BrightRun**

Full license: [creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/)

---

## 🔗 Links

| Resource | Link |
|----------|------|
| **Full Dataset Download** | [brightrun.ai/eq-dataset](https://brightrun.ai/eq-dataset) |
| **BrightRun Website** | [brightrun.ai](https://brightrun.ai) |
| **Contact** | datasets@brightrun.ai |

---

## 💬 Questions?

Have questions about the data format, methodology, or use cases?

- 📧 Email: datasets@brightrun.ai
- 💬 HuggingFace Discussions: Use the tab above

---

## 📈 Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | December 2025 | Initial sample release: 12 conversations, 89 training pairs |

---

<div align="center">

**Built with ❤️ by [BrightRun](https://brightrun.ai)**

*Democratizing emotionally intelligent AI training*

---

### 🚀 Ready to train emotionally intelligent models?

[![Get the Full Dataset](https://img.shields.io/badge/Get_Full_Dataset_(242_conversations)-brightrun.ai-blue?style=for-the-badge)](https://brightrun.ai/eq-dataset)

</div>