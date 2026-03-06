# Option C Implementation Plan: Sample Teaser + Landing Page Strategy

**Version:** 1.0  
**Date:** December 9, 2025  
**Strategy:** Option C — Upload sample to HuggingFace, drive traffic to gated website  
**A/B Test Status:** Option C (Test A) — Will compare against Option D later

---

## Executive Summary

This document provides a step-by-step implementation plan for Option C of the lead magnet strategy:

1. Upload a **12-conversation sample** to HuggingFace (ungated)
2. Use the HuggingFace README to drive traffic to **brightrun.ai**
3. Gate the full dataset behind an **email + survey form** on the website
4. Deliver the full 242-conversation dataset via the website

**Goal:** Capture qualified leads (email + use case data) while building HuggingFace SEO presence.

---

## Table of Contents

1. [Sample Selection: 12 Conversations](#1-sample-selection-12-conversations)
2. [HuggingFace Setup & Upload](#2-huggingface-setup--upload)
3. [HuggingFace README Copy](#3-huggingface-readme-copy)
4. [Website Gating Page Copy](#4-website-gating-page-copy)
5. [Website Download Page Copy](#5-website-download-page-copy)
6. [Technical Implementation Checklist](#6-technical-implementation-checklist)
7. [Success Metrics](#7-success-metrics)

---

## 1. Sample Selection: 12 Conversations

### Selection Criteria

The 12-conversation sample must:
- ✅ Demonstrate data quality and format
- ✅ Show variety across personas and arcs
- ✅ Include edge case examples (differentiator)
- ✅ Be too small for meaningful fine-tuning
- ✅ Create desire for the full dataset

### Sample Distribution

**Regular Conversations (9 total):**

| # | Persona | Emotional Arc | Training Topic |
|---|---------|---------------|----------------|
| 1 | anxious_planner | confusion_to_clarity | Retirement 401k options |
| 2 | anxious_planner | overwhelm_to_empowerment | Investment portfolio review |
| 3 | anxious_planner | shame_to_acceptance | Credit card debt disclosure |
| 4 | overwhelmed_avoider | confusion_to_clarity | Life insurance basics |
| 5 | overwhelmed_avoider | couple_conflict_to_alignment | Joint budget disagreement |
| 6 | overwhelmed_avoider | shame_to_acceptance | Missed mortgage payments |
| 7 | pragmatic_optimist | confusion_to_clarity | Tax-advantaged accounts |
| 8 | pragmatic_optimist | overwhelm_to_empowerment | Estate planning basics |
| 9 | pragmatic_optimist | couple_conflict_to_alignment | Inheritance planning |

**Edge Case / Boundary Conversations (3 total):**

| # | Persona | Emotional Arc | Training Topic |
|---|---------|---------------|----------------|
| 10 | anxious_planner | hostility_to_boundary | Client demanding guaranteed returns |
| 11 | overwhelmed_avoider | crisis_to_referral | Mental health + financial crisis |
| 12 | pragmatic_optimist | overwhelm_to_triage | Sudden job loss + multiple debts |

### Extraction Script Location

Create a script to extract these 12 conversations:
```
scripts/extract-sample-12.js
```

**Script Requirements:**
- Read from `pmc/_archive/full-file-training-json-242-conversations.json`
- Filter by persona + emotional_arc combinations listed above
- Select first matching conversation for each combination
- Output to `pmc/_exports/hf-sample-12.json` and `pmc/_exports/hf-sample-12.jsonl`

---

## 2. HuggingFace Setup & Upload

### Step 2.1: Create HuggingFace Account/Organization

- [ ] Create account at huggingface.co (if not exists)
- [ ] Create organization: `brightrun` (or use personal account)
- [ ] Set up organization profile with logo and description

### Step 2.2: Create Dataset Repository

**Repository Details:**
| Field | Value |
|-------|-------|
| **Owner** | brightrun |
| **Repository Name** | eq-alignment-sample |
| **Repository Type** | Dataset |
| **License** | CC-BY-4.0 |
| **Visibility** | Public |

**Navigation:** huggingface.co → New → Dataset

### Step 2.3: Upload Files

**File Structure:**
```
brightrun/eq-alignment-sample/
├── README.md                 (Dataset Card - see Section 3)
├── sample.json               (12 conversations, array format)
├── sample.jsonl              (12 conversations, JSONL format)
└── LICENSE                   (CC-BY-4.0 full text)
```

**Upload Methods:**
1. **Web UI:** Drag and drop files via huggingface.co interface
2. **Git:** Clone repo and push files
3. **CLI:** Use `huggingface-cli upload`

**Recommended: Git Method**
```bash
# Install git-lfs if needed
git lfs install

# Clone the empty repo
git clone https://huggingface.co/datasets/brightrun/eq-alignment-sample
cd eq-alignment-sample

# Copy files
cp /path/to/sample.json .
cp /path/to/sample.jsonl .
cp /path/to/README.md .
cp /path/to/LICENSE .

# Commit and push
git add .
git commit -m "Initial upload: 12 sample conversations"
git push
```

### Step 2.4: Configure Dataset Card Metadata

The README.md YAML frontmatter tells HuggingFace how to display the dataset:

```yaml
---
license: cc-by-4.0
task_categories:
  - conversational
  - text-generation
language:
  - en
tags:
  - lora
  - fine-tuning
  - emotional-intelligence
  - financial-planning
  - synthetic-conversations
  - eq-alignment
  - empathy
  - customer-service
pretty_name: BrightRun EQ Alignment Sample
size_categories:
  - n<1K
---
```

### Step 2.5: Verify Upload

- [ ] Dataset appears at: `huggingface.co/datasets/brightrun/eq-alignment-sample`
- [ ] Data viewer shows conversations correctly
- [ ] README renders properly
- [ ] License displays correctly
- [ ] Tags are searchable

---

## 3. HuggingFace README Copy

### Complete README.md for HuggingFace

```markdown
---
license: cc-by-4.0
task_categories:
  - conversational
  - text-generation
language:
  - en
tags:
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
| ~78 training pairs | **1,567 training pairs** |
| 3 personas sampled | 3 personas (full coverage) |
| 4 emotional arcs | **7 emotional arcs** |
| No edge cases depth | **39 edge case conversations** |

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
   - Shame → Acceptance
   - Conflict → Alignment
   - Crisis → Appropriate Referral

4. **Maintain professional boundaries**
   - Recognize when to refer to specialists
   - Handle hostile or demanding clients
   - Protect both client and advisor

---

## 📊 Sample Dataset Statistics

| Metric | This Sample | Full Dataset |
|--------|-------------|--------------|
| Conversations | 12 | 242 |
| Training Pairs | ~78 | 1,567 |
| Personas | 3 | 3 |
| Emotional Arcs | 4 | 7 |
| Edge Cases | 3 | 39 |
| Format | brightrun-lora-v4 | brightrun-lora-v4 |

### Personas Included

| Persona | Sample Count | Full Count | Behavioral Profile |
|---------|--------------|------------|-------------------|
| `anxious_planner` | 4 | 80 | Worried, detail-seeking, needs reassurance |
| `overwhelmed_avoider` | 4 | 79 | Avoidant, easily frustrated, needs simplification |
| `pragmatic_optimist` | 4 | 83 | Direct, solution-focused, values efficiency |

### Emotional Arcs Sampled

| Arc | Description | Sample | Full |
|-----|-------------|--------|------|
| `confusion_to_clarity` | Lost → Clear path forward | 3 | 60 |
| `overwhelm_to_empowerment` | Paralyzed → Actionable steps | 2 | 42 |
| `shame_to_acceptance` | Embarrassed → Recovery-focused | 2 | 42 |
| `couple_conflict_to_alignment` | Disagreement → Unified | 2 | 59 |
| `hostility_to_boundary` | Aggression → Limits set | 1 | 13 |
| `crisis_to_referral` | Emergency → Professional handoff | 1 | 13 |
| `overwhelm_to_triage` | Crisis → Immediate priorities | 1 | 13 |

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

Each conversation follows the `brightrun-lora-v4` format:

```json
{
  "conversation_id": "conv_sample_001",
  "metadata": {
    "persona": "anxious_planner",
    "emotional_arc": "confusion_to_clarity",
    "training_topic": "retirement_401k_options",
    "turn_count": 7,
    "quality_tier": "template"
  },
  "turns": [
    {
      "turn_number": 1,
      "role": "client",
      "content": "I've been looking at my 401k options and honestly I'm completely lost..."
    },
    {
      "turn_number": 2,
      "role": "advisor",
      "content": "I can hear how overwhelming this feels, and I want you to know that's completely normal..."
    }
  ],
  "training_pairs": [
    {
      "instruction": "You are Elena Morales, a certified financial planner with 15 years of experience...",
      "input": "[Full conversation context]",
      "output": "[Advisor's empathetic response]"
    }
  ]
}
```

### Compatible Training Frameworks

- ✅ **Axolotl** — Direct JSONL import
- ✅ **Unsloth** — Use with `alpaca` format adapter
- ✅ **LLaMA-Factory** — Standard instruction format
- ✅ **OpenAI Fine-Tuning API** — Convert to chat format
- ✅ **HuggingFace TRL** — SFTTrainer compatible

---

## 🎓 The Elena Morales Methodology

This dataset was generated using the **Elena Morales Framework**—a structured approach to emotionally intelligent professional communication.

**Elena Morales** is a fictional composite persona representing best practices from:
- Certified Financial Planner (CFP) communication standards
- Motivational Interviewing techniques
- Trauma-informed client service approaches
- Professional boundary-setting frameworks

### Core Principles

1. **Emotional Acknowledgment First**
   - Validate feelings before offering solutions
   - Use reflective listening techniques
   - Create psychological safety

2. **Adaptive Communication**
   - Match explanation depth to client anxiety level
   - Simplify for overwhelmed clients
   - Provide detail for anxious planners

3. **Progressive Disclosure**
   - Build understanding incrementally
   - Check comprehension before advancing
   - Avoid information overload

4. **Boundary Awareness**
   - Recognize scope limitations
   - Refer to specialists when appropriate
   - Protect both parties professionally

---

## 📥 Get the Full Dataset

This sample contains **12 conversations**. The full dataset contains **242 conversations with 1,567 training pairs**.

### What's in the Full Dataset?

✅ **20x more conversations** (242 vs 12)  
✅ **Full persona coverage** across all 3 types  
✅ **All 7 emotional arcs** including rare edge cases  
✅ **39 boundary/crisis conversations** for robust training  
✅ **JSON + JSONL formats** ready for any framework  

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
| v1.0 | December 2025 | Initial sample release: 12 conversations |

---

<div align="center">

**Built with ❤️ by [BrightRun](https://brightrun.ai)**

*Democratizing emotionally intelligent AI training*

---

### 🚀 Ready to train emotionally intelligent models?

[![Get the Full Dataset](https://img.shields.io/badge/Get_Full_Dataset_(242_conversations)-brightrun.ai-blue?style=for-the-badge)](https://brightrun.ai/eq-dataset)

</div>
```

---

## 4. Website Gating Page Copy

### Page URL: `brightrun.ai/eq-dataset`

This is the landing page where users submit their information to access the full dataset.

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                   │
│  Logo                                    [About] [Contact]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     HERO SECTION                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   🎯 BrightRun EQ Alignment Dataset                    │   │
│  │                                                         │   │
│  │   Train Your LLM to Handle Emotionally                 │   │
│  │   Complex Conversations                                │   │
│  │                                                         │   │
│  │   242 Conversations • 1,567 Training Pairs             │   │
│  │   3 Personas • 7 Emotional Arcs                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     TWO-COLUMN LAYOUT                           │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │                      │  │                              │   │
│  │   BENEFITS +         │  │      GATING FORM             │   │
│  │   SOCIAL PROOF       │  │                              │   │
│  │                      │  │   [Email]                    │   │
│  │   ✓ Full dataset     │  │   [Name]                     │   │
│  │   ✓ JSON + JSONL     │  │   [Model you'll fine-tune]   │   │
│  │   ✓ CC-BY-4.0        │  │   [Use case dropdown]        │   │
│  │   ✓ Instant download │  │   [Future updates checkbox]  │   │
│  │                      │  │                              │   │
│  │   "This dataset..."  │  │   [Download Dataset →]       │   │
│  │   — User Quote       │  │                              │   │
│  │                      │  │                              │   │
│  └──────────────────────┘  └──────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     DATASET PREVIEW                             │
│                                                                 │
│   [JSON code block showing sample conversation]                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         FOOTER                                   │
│   © 2025 BrightRun • Privacy Policy • Terms                     │
└─────────────────────────────────────────────────────────────────┘
```

### Gating Page Copy

---

#### Hero Section

**Headline:**
```
BrightRun EQ Alignment Dataset v1.0
```

**Subheadline:**
```
Train Your LLM to Navigate Emotionally Complex Client Conversations
```

**Stats Bar:**
```
242 Conversations  •  1,567 Training Pairs  •  7 Emotional Arcs  •  3 Client Personas
```

---

#### Left Column: Benefits + Social Proof

**Section Header:**
```
What's Inside the Dataset
```

**Benefit List:**
```
✅ 242 complete client-advisor conversations
   Not snippets—full multi-turn dialogues with realistic progression

✅ 1,567 instruction-tuned training pairs
   Pre-formatted for LoRA fine-tuning, ready to use

✅ 3 distinct client personas
   Anxious Planner, Overwhelmed Avoider, Pragmatic Optimist

✅ 7 emotional arcs including edge cases
   From "Confusion → Clarity" to "Crisis → Professional Referral"

✅ JSON + JSONL formats included
   Compatible with Axolotl, Unsloth, LLaMA-Factory, and more

✅ CC-BY-4.0 license
   Use commercially, modify freely, just attribute BrightRun
```

**Why EQ Alignment Matters:**
```
Standard training data teaches LLMs to answer questions.

EQ Alignment training teaches them to:
• Acknowledge emotions before problem-solving
• Adapt tone to anxious vs. avoidant vs. pragmatic clients
• Navigate shame, conflict, and crisis conversations
• Know when to set boundaries or refer to specialists

This is the difference between a helpful chatbot and a trusted advisor.
```

**Social Proof (placeholder for future testimonials):**
```
"Finally, a dataset that teaches models to be emotionally intelligent, 
not just technically correct."
— Early Access User
```

---

#### Right Column: Gating Form

**Form Header:**
```
Download the Full Dataset
```

**Form Subtext:**
```
Complete this quick form (30 seconds) and get instant access.
We use your responses to improve future datasets.
```

**Form Fields:**

| Field | Type | Required | Placeholder/Options |
|-------|------|----------|---------------------|
| Email | Email input | Yes | "your@email.com" |
| Name | Text input | Yes | "Your name" |
| Base Model | Dropdown | Yes | "What model will you fine-tune?" |
| | | | - Llama 3 / 3.1 / 3.2 |
| | | | - Mistral / Mixtral |
| | | | - Qwen 2 / 2.5 |
| | | | - Phi-3 / Phi-4 |
| | | | - Gemma 2 |
| | | | - Other open-source |
| | | | - OpenAI (GPT-4) |
| | | | - Not sure yet |
| Use Case | Dropdown | Yes | "Primary use case?" |
| | | | - Commercial product |
| | | | - Research / Academic |
| | | | - Personal learning |
| | | | - Agency / Client work |
| | | | - Evaluation / Testing |
| | | | - Other |
| Updates | Checkbox | No | "Email me about future BrightRun datasets" |

**Submit Button:**
```
[📥 Get Instant Access]
```

**Privacy Note (below button):**
```
🔒 We respect your privacy. No spam, ever. Unsubscribe anytime.
```

---

#### Dataset Preview Section

**Section Header:**
```
Preview the Data Format
```

**Description:**
```
Every conversation follows the brightrun-lora-v4 format, 
optimized for instruction fine-tuning:
```

**Code Block:**
```json
{
  "conversation_id": "conv_fp_2024_0142",
  "metadata": {
    "persona": "anxious_planner",
    "emotional_arc": "confusion_to_clarity",
    "training_topic": "retirement_401k_options",
    "turn_count": 7
  },
  "turns": [
    {
      "turn_number": 1,
      "role": "client",
      "content": "I've been staring at my 401k options for weeks and I just... I don't know what to pick. There are like 15 different funds. What if I choose wrong and lose everything before I retire?"
    },
    {
      "turn_number": 2,
      "role": "advisor", 
      "content": "I can hear how much weight you're carrying with this decision, and I want you to know that feeling is completely valid. The good news? You're not going to 'lose everything' by picking the wrong fund from your employer's options—these are all professionally vetted choices. Let's take the pressure off and work through this together. First, can you tell me roughly how many years until you plan to retire?"
    }
  ],
  "training_pairs": [
    {
      "instruction": "You are Elena Morales, a certified financial planner...",
      "input": "[Conversation context + client message]",
      "output": "[Empathetic advisor response]"
    }
  ]
}
```

**Call-out Box:**
```
💡 Notice how the advisor acknowledges the client's anxiety 
   BEFORE jumping into solutions. This is EQ Alignment in action.
```

---

## 5. Website Download Page Copy

### Page URL: `brightrun.ai/eq-dataset/download` (or `/eq-dataset/success`)

This is the page users see AFTER submitting the form. It contains the actual download links.

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                   │
│  Logo                                    [About] [Contact]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     SUCCESS MESSAGE                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  ✅ You're In! Download Your Dataset Below              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     DOWNLOAD SECTION                            │
│                                                                 │
│   ┌─────────────────────┐  ┌─────────────────────┐            │
│   │                     │  │                     │            │
│   │   📄 JSON Format    │  │   📄 JSONL Format   │            │
│   │                     │  │                     │            │
│   │   242 conversations │  │   1,567 train pairs │            │
│   │   Nested structure  │  │   One pair per line │            │
│   │                     │  │                     │            │
│   │   [Download JSON]   │  │   [Download JSONL]  │            │
│   │                     │  │                     │            │
│   └─────────────────────┘  └─────────────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     QUICK START GUIDE                           │
│                                                                 │
│   Step 1: Choose your format                                    │
│   Step 2: Load into your training framework                     │
│   Step 3: Fine-tune and evaluate                                │
│                                                                 │
│   [Code examples for Axolotl, Unsloth, etc.]                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     FEEDBACK REQUEST                            │
│                                                                 │
│   "We'd love to hear how you use this dataset!"                │
│   [Share Feedback] button → Google Form or email               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         FOOTER                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Download Page Copy

---

#### Success Header

**Headline:**
```
✅ You're In! Your Dataset is Ready
```

**Subtext:**
```
Thanks for your interest in EQ Alignment training. 
Download your files below and start fine-tuning!
```

---

#### Download Cards

**Card 1: JSON Format**
```
📄 Full Dataset — JSON Format

• 242 complete conversations
• Nested structure with metadata
• Best for: Inspection, preprocessing, custom parsing

File: eq-alignment-v1-full.json
Size: ~2.1 MB

[📥 Download JSON]
```

**Card 2: JSONL Format**
```
📄 Training Pairs — JSONL Format

• 1,567 instruction-tuned pairs
• One training example per line
• Best for: Direct use with Axolotl, Unsloth, TRL

File: eq-alignment-v1-training.jsonl
Size: ~1.8 MB

[📥 Download JSONL]
```

---

#### Quick Start Guide

**Section Header:**
```
🚀 Quick Start: Fine-Tune in 3 Steps
```

**Step 1:**
```
1️⃣ Choose Your Format

JSON → Full conversations with metadata (great for preprocessing)
JSONL → Ready-to-use training pairs (plug directly into trainers)
```

**Step 2:**
```
2️⃣ Load Into Your Framework
```

**Axolotl Example:**
```yaml
# axolotl config.yml
datasets:
  - path: eq-alignment-v1-training.jsonl
    type: alpaca
    
# Fields map automatically:
# instruction → system prompt
# input → user message  
# output → assistant response
```

**Unsloth Example:**
```python
from unsloth import FastLanguageModel
from datasets import load_dataset

# Load the dataset
dataset = load_dataset("json", data_files="eq-alignment-v1-training.jsonl")

# Format for training
def format_prompt(example):
    return {
        "text": f"""### Instruction:
{example['instruction']}

### Input:
{example['input']}

### Response:
{example['output']}"""
    }

dataset = dataset.map(format_prompt)
```

**Step 3:**
```
3️⃣ Fine-Tune and Evaluate

Recommended settings for a 7B model:
• LoRA rank: 64
• Learning rate: 2e-4
• Epochs: 3
• Batch size: 4 (with gradient accumulation)

Expected training time: ~2-4 hours on RTX 4090 / A100
```

---

#### What's in the Dataset (Reminder)

```
📊 Dataset Contents

Conversations:     242 total
Training Pairs:    1,567 total
Personas:          3 (Anxious Planner, Overwhelmed Avoider, Pragmatic Optimist)
Emotional Arcs:    7 (including 3 edge case/boundary scenarios)
Vertical:          Financial Planning / Wealth Management
Methodology:       Elena Morales Framework (EQ-first communication)
License:           CC-BY-4.0 (commercial use allowed with attribution)
```

---

#### Feedback Request

**Section Header:**
```
💬 We'd Love Your Feedback
```

**Copy:**
```
This is v1.0 of the EQ Alignment Dataset. Your feedback directly 
shapes what we build next.

Tell us:
• How did the fine-tuning go?
• What emotional arcs or personas would you add?
• What other verticals would be valuable? (Healthcare? Legal? HR?)

[📝 Share Your Feedback] → (links to feedback form)

Or email us directly: datasets@brightrun.ai
```

---

#### Coming Soon Teaser

**Section Header:**
```
🔜 Coming Soon: More Verticals, More Arcs
```

**Copy:**
```
We're building EQ Alignment datasets for:

• 🏥 Healthcare — Patient communication, difficult diagnoses
• ⚖️ Legal — Client intake, managing expectations
• 👥 HR — Performance reviews, conflict resolution
• 🛒 E-commerce — Returns, complaints, escalations

Want early access? You're already on the list 
(if you checked "Email me about future datasets").

Not on the list? [Join the waitlist →]
```

---

## 6. Technical Implementation Checklist

### Phase 1: Dataset Preparation (Day 1)

- [ ] Create extraction script: `scripts/extract-sample-12.js`
- [ ] Run script to extract 12 conversations
- [ ] Validate output JSON structure
- [ ] Create JSONL version
- [ ] Verify file sizes are reasonable
- [ ] Test loading with `datasets` library

### Phase 2: HuggingFace Upload (Day 1-2)

- [ ] Create HuggingFace account (if needed)
- [ ] Create organization: `brightrun`
- [ ] Create dataset repository: `eq-alignment-sample`
- [ ] Create README.md from template in Section 3
- [ ] Upload `sample.json`
- [ ] Upload `sample.jsonl`
- [ ] Add LICENSE file (CC-BY-4.0)
- [ ] Verify dataset viewer works
- [ ] Test `load_dataset()` command

### Phase 3: Website Development (Day 2-4)

**Gating Page (`/eq-dataset`):**
- [ ] Design page layout (mobile responsive)
- [ ] Implement form with all fields
- [ ] Set up form submission handling
- [ ] Connect to email service (ConvertKit/Mailchimp/etc.)
- [ ] Store responses in database/spreadsheet
- [ ] Implement redirect to download page on success
- [ ] Add UTM parameter tracking
- [ ] Test form submission flow

**Download Page (`/eq-dataset/download`):**
- [ ] Create download page layout
- [ ] Host dataset files (Vercel blob, S3, etc.)
- [ ] Generate secure/expiring download links (optional)
- [ ] Add download tracking (analytics)
- [ ] Create feedback form (Google Form or embedded)
- [ ] Test download links work

### Phase 4: Launch (Day 5)

- [ ] Final QA of entire flow
- [ ] Prepare Reddit post for r/LocalLLaMA
- [ ] Prepare Twitter/X announcement
- [ ] Schedule HuggingFace community post
- [ ] Set up analytics dashboard
- [ ] Launch!

---

## 7. Success Metrics

### Week 1 Targets

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| HuggingFace page views | 200+ | HF analytics |
| HuggingFace sample downloads | 50+ | HF analytics |
| Website gating page visits | 100+ | Google Analytics |
| Form submissions (leads) | 30+ | Form backend |
| Full dataset downloads | 25+ | Download tracking |
| Form completion rate | 60%+ | Submissions / Page visits |

### Week 4 Targets

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| HuggingFace page views | 1,000+ | HF analytics |
| Total qualified leads | 100+ | Form backend |
| Full dataset downloads | 75+ | Download tracking |
| Feedback responses | 10+ | Feedback form |
| Community mentions | 3+ | Social monitoring |

### Lead Quality Indicators

Track these to understand your audience:

| Question | Insight |
|----------|---------|
| Base model selection | What models are popular |
| Use case breakdown | Commercial vs. research ratio |
| Email opt-in rate | Interest in future products |

---

## Appendix: File Locations

| Asset | Local Path | Destination |
|-------|------------|-------------|
| Full dataset | `pmc/_archive/full-file-training-json-242-conversations.json` | Website download |
| Sample 12 | `pmc/_exports/hf-sample-12.json` | HuggingFace |
| Sample JSONL | `pmc/_exports/hf-sample-12.jsonl` | HuggingFace |
| HF README | (create from Section 3) | HuggingFace |
| Extraction script | `scripts/extract-sample-12.js` | Local |

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | PMCT-004-C-ACTION |
| Version | 1.0 |
| Author | AI Strategy Analyst |
| Created | December 9, 2025 |
| Status | Ready for Implementation |
| Related | PMCT-004-LMS (Strategy Document) |

---

## Appendix A: Improved Gating Questions — Market Research Focus

### The Problem with the Original Questions

The original suggested questions:
- **Q1:** "What base model will you fine-tune?"
- **Q2:** "What's your primary use case? (Research / Commercial / Learning / Other)"

**Why these fall short:**
- Q1 tells us *technical preference* but not *why*
- Q2 is too high-level — "Commercial" could mean anything
- Neither reveals the **specific project or problem** they're solving

### What We Actually Want to Learn

To inform BrightRun product development, we need to understand:

1. **The end application** — What are they building?
2. **The domain/vertical** — Is it financial services? Healthcare? Other?
3. **The pain point** — What gap does this dataset fill for them?
4. **Commercial intent** — Are they building a product or just experimenting?

---

### Recommended Question Options

#### Option 1: Open-Ended (Highest Quality, Lowest Completion)

**Question:**
> "In 1-2 sentences, describe what you're building with this training data."

**Pros:**
- ✅ Gets the exact project description
- ✅ Reveals language they use (useful for marketing)
- ✅ Uncovers use cases we haven't thought of

**Cons:**
- ❌ Higher friction (typing required)
- ❌ Some users will skip or write "test"
- ❌ Requires manual analysis

**Best for:** Website landing page (where you control the form)

---

#### Option 2: Structured Dropdown with "Other" (Balanced)

**Question:**
> "What are you building?"

**Options:**
- Customer service chatbot / virtual agent
- AI assistant for a professional vertical (financial, legal, healthcare)
- Internal employee training / simulation tool
- Research on emotional intelligence in LLMs
- Personal project / learning
- Evaluating data quality for potential purchase
- Other (please specify): _____________

**Pros:**
- ✅ Low friction (dropdown)
- ✅ Quantifiable for analytics
- ✅ "Other" captures edge cases
- ✅ Options reveal your market hypotheses

**Cons:**
- ❌ May not capture nuance
- ❌ Users may pick closest-but-not-exact option

**Best for:** HuggingFace gating (limited to dropdown/text fields)

---

#### Option 3: Two-Part Question (Maximum Insight)

**Question 3a:**
> "What type of application are you building?"

**Options:**
- Chatbot / Virtual Agent
- AI Copilot / Assistant
- Training Simulation
- Research Project
- Just exploring / learning

**Question 3b:**
> "What industry or domain?"

**Options:**
- Financial Services / Wealth Management
- Healthcare / Mental Health
- Legal / Compliance
- Customer Support / E-commerce
- HR / People Operations
- Education
- General / Cross-industry
- Other: _____________

**Pros:**
- ✅ Application type × Domain gives you a matrix
- ✅ Very actionable for product planning
- ✅ Example insight: "60% building customer service bots, 40% of those in financial services"

**Cons:**
- ❌ Two questions = more friction
- ❌ May hit HuggingFace's 3-question limit faster

---

#### Option 4: Goal-Oriented (Your Suggestions Refined)

Your suggested phrasings:
- "For what purpose do you want the fine-tuning data set?"
- "What end goal(s) do you hope to achieve with fine-tuning?"

**Refined Version:**
> "What problem are you trying to solve with this fine-tuning data?"

**Options:**
- Make my AI more empathetic / emotionally intelligent
- Improve handling of difficult / emotional customer conversations
- Train an AI for a specific professional domain
- Reduce hallucinations / improve factual responses
- Create more natural multi-turn conversations
- Benchmark / evaluate model capabilities
- Other: _____________

**Pros:**
- ✅ Problem-focused = reveals pain points
- ✅ Your dataset's value prop is "EQ" — see who aligns
- ✅ Helps prioritize future dataset features

**Cons:**
- ❌ Still somewhat abstract
- ❌ Users may not articulate their problem well

---

### Final Recommendation: 3-Question Combo

For your **website landing page** (where you have full control):

| # | Question | Type | Purpose |
|---|----------|------|---------|
| 1 | Email | Required | Lead capture |
| 2 | Name | Required | Personalization |
| 3 | "What are you building?" | Dropdown + Other | Application type |
| 4 | "What industry/domain?" | Dropdown + Other | Vertical identification |
| 5 | "Describe your project (optional)" | Open text | Qualitative insight |
| 6 | "Email me about future datasets" | Checkbox | Opt-in for nurture |

For **HuggingFace gating** (limited to 3 custom questions):

| # | Question | Type |
|---|----------|------|
| 1 | "What base model will you fine-tune?" | Dropdown |
| 2 | "What are you building?" | Dropdown + Other |
| 3 | "What industry/domain?" | Dropdown + Other |

---

### Example Dropdown Values (Copy-Paste Ready)

**"What are you building?"**
```
Customer service chatbot
AI assistant for professionals
Internal training / simulation
Research project
Personal learning project
Evaluating for potential purchase
Other
```

**"What industry/domain?"**
```
Financial services / Wealth management
Healthcare / Mental health
Legal / Compliance
Customer support / E-commerce
HR / People operations
Education / Training
General / Cross-industry
Other
```

**"What base model?"**
```
Llama 3 / 3.1 / 3.2
Mistral / Mixtral
Qwen 2 / 2.5
Phi-3 / Phi-4
Gemma 2
GPT-4 / OpenAI
Claude
Other open-source
Not sure yet
```

---

### How to Analyze Responses

Once you collect 50+ leads, create a matrix:

| Application Type | Financial | Healthcare | E-commerce | Other | Total |
|------------------|-----------|------------|------------|-------|-------|
| Customer Service Bot | 12 | 5 | 8 | 3 | 28 |
| AI Assistant | 6 | 2 | 1 | 4 | 13 |
| Training Sim | 2 | 3 | 0 | 1 | 6 |
| Research | 1 | 0 | 0 | 2 | 3 |
| **Total** | 21 | 10 | 9 | 10 | 50 |

**Insight from this example:**
- 42% are in Financial Services → validate current vertical focus
- 56% building customer service bots → this is the main use case
- Consider: Healthcare is #2 vertical → potential v2 dataset?

---

*End of Appendix A*

---

*End of Document*
