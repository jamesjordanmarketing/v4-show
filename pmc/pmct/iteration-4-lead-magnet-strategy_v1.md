# BrightRun EQ Alignment Dataset: Hugging Face Lead Magnet Strategy

**Version:** 1.0  
**Date:** December 8, 2025  
**Author:** AI Strategy Analyst  
**Status:** Recommendation Ready

---

## Executive Summary

This document analyzes three lead magnet distribution strategies for the BrightRun EQ Alignment Dataset (242 conversations, 1,567 training pairs) and provides a definitive recommendation optimized for lead capture, brand positioning, and future monetization.

**Recommendation:** Implement a **Hybrid Strategy** combining HuggingFace Native Gating with a Sample Teaser model—capturing leads directly on HuggingFace while maintaining a premium landing page experience for the full dataset.

---

## Table of Contents

1. [Dataset Overview](#dataset-overview)
2. [Strategic Options Analysis](#strategic-options-analysis)
3. [License Recommendation](#license-recommendation)
4. [Final Recommendation](#final-recommendation)
5. [Implementation Plan](#implementation-plan)
6. [HuggingFace Dataset Card Template](#huggingface-dataset-card-template)

---

## Dataset Overview

### Current Assets

| Attribute | Value |
|-----------|-------|
| **Dataset Name** | BrightRun EQ Alignment Dataset |
| **Version** | v1.0 |
| **Total Conversations** | 242 |
| **Total Training Pairs** | 1,567 |
| **File Size** | ~134,000 lines |
| **Format** | brightrun-lora-v4 (JSON/JSONL) |
| **Target Model** | claude-sonnet-4-5 |
| **Vertical** | Financial Planning Consultant |
| **Personas** | 3 (anxious_planner, overwhelmed_avoider, pragmatic_optimist) |
| **Emotional Arcs** | 7 (4 template + 3 edge_case) |

### Dataset Distribution Breakdown

**By Persona:**
- `anxious_planner`: 80 conversations (33%)
- `overwhelmed_avoider`: 79 conversations (33%)
- `pragmatic_optimist`: 83 conversations (34%)

**By Emotional Arc:**
- `couple_conflict_to_alignment`: 59 conversations
- `confusion_to_clarity`: 60 conversations
- `overwhelm_to_empowerment`: 42 conversations
- `shame_to_acceptance`: 42 conversations
- `hostility_to_boundary`: 13 conversations (edge case)
- `overwhelm_to_triage`: 13 conversations (edge case)
- `crisis_to_referral`: 13 conversations (edge case)

---

## Strategic Options Analysis

### Option A: Full Giveaway (Owner's Initial Preference)

**Description:** Upload the complete 242-conversation dataset to HuggingFace with no gating.

#### Pros
- ✅ Maximum visibility and discoverability
- ✅ Fastest path to downloads and community adoption
- ✅ Organic feedback through HF Discussions
- ✅ No friction = maximum reach
- ✅ Demonstrates confidence in product quality

#### Cons
- ❌ **No lead capture mechanism** — zero emails collected
- ❌ No conversion funnel for future products
- ❌ Sets precedent that BrightRun content is "always free"
- ❌ No way to follow up with users for feedback
- ❌ Competitors can freely use and rebrand the data
- ❌ Undermines future paid dataset positioning

#### Strategic Fit Score: 4/10
*Rejected: Does not align with business goal of lead capture and feedback collection.*

---

### Option B: HuggingFace Native Gating

**Description:** Upload full dataset to HuggingFace but enable "Gated Dataset" feature requiring users to request access and provide email/name.

#### Pros
- ✅ Native platform trust — users more willing to share info on HF
- ✅ Built-in download metrics and analytics
- ✅ Email/name collection without external landing page
- ✅ Can add custom questions (up to 3 fields)
- ✅ Exportable lead list from HuggingFace

#### Cons
- ❌ Manual approval required (or custom automation script)
- ❌ No control over landing page experience/branding
- ❌ Limited to HF's form fields (3 custom questions max)
- ❌ Some users may abandon due to approval wait time
- ❌ You don't own the conversion experience

#### Implementation Details
```
HuggingFace Settings → Gated Dataset → Request Access
- Require: Email, Name
- Custom Question 1: "What model will you fine-tune?"
- Custom Question 2: "How did you hear about BrightRun?"
- Custom Question 3: "Would you like updates on premium datasets?"
```

#### Strategic Fit Score: 7/10
*Strong option for trust-based lead capture, but limited control.*

---

### Option C: Sample Teaser + Landing Page

**Description:** Upload a small sample (5-20 conversations) to HuggingFace with a compelling README that drives traffic to a gated landing page for the full dataset.

#### Pros
- ✅ Builds HF SEO and discoverability
- ✅ Full control over landing page experience
- ✅ Custom survey/qualification questions
- ✅ Can implement advanced analytics (UTM, pixel tracking)
- ✅ Professional brand presentation
- ✅ Industry-standard "teaser" model is well-accepted

#### Cons
- ❌ Lower download count on HF (sample only)
- ❌ Requires building/maintaining external landing page
- ❌ Users may not click through to external site
- ❌ Trust friction leaving HuggingFace ecosystem

#### Implementation Details
```
HuggingFace: 
- Upload: 10 sample conversations (1 per persona × emotional arc combo)
- README: Showcase quality, link to landing page

Landing Page:
- URL: brightrun.ai/eq-alignment-dataset
- Gate: Email + 3 qualifying questions
- Delivery: Instant download link via email
```

#### Strategic Fit Score: 8/10
*Best for lead quality and brand control, requires landing page development.*

---

### Option D: Hybrid Strategy (RECOMMENDED)

**Description:** Combine HuggingFace Native Gating with a tiered sample approach. Provide a meaningful sample (50 conversations) ungated for immediate trust-building, gate the remaining 192 conversations behind HF's native access request, AND provide a premium landing page CTA for the complete dataset + bonus materials.

#### Structure

| Tier | Conversations | Access | Purpose |
|------|---------------|--------|---------|
| **Preview** | 10 | Ungated | Immediate quality proof |
| **Core Dataset** | 192 | HF Gated | Lead capture on platform |
| **Full Package** | 242 + bonuses | Landing Page | Premium experience |

#### Pros
- ✅ **Trust building**: 10 ungated samples prove quality immediately
- ✅ **Native lead capture**: HF gating collects emails within trusted platform
- ✅ **Premium positioning**: Landing page offers "VIP" experience with bonuses
- ✅ **Multiple CTAs**: Captures leads at different commitment levels
- ✅ **Flexibility**: Can adjust tier sizes based on performance
- ✅ **SEO value**: Full dataset on HF boosts discoverability

#### Cons
- ❌ More complex to implement and track
- ❌ Requires both HF configuration and landing page
- ❌ Potential user confusion with multiple paths

#### Strategic Fit Score: 9/10
*Optimal balance of reach, trust, and lead capture.*

---

## License Recommendation

### Analysis of Common Licenses

| License | Commercial Use | Requires Attribution | ShaareAlike | Recommended For |
|---------|---------------|---------------------|------------|-----------------|
| **MIT** | ✅ Yes | ❌ No | ❌ No | Software code |
| **Apache 2.0** | ✅ Yes | ✅ Yes | ❌ No | Software with patents |
| **CC-BY-4.0**  | ✅ Yes | ✅ Yes | ❌ No | **Creative works/data** |
| **CC-BY-SA-4.0** | ✅ Yes | ✅ Yes | ✅ Yes | Copyleft data |
| **CC-BY-NC-4.0** | ❌ No | ✅ Yes | ❌ No | Restrict commercial |

### Recommendation: **CC-BY-4.0** (Creative Commons Attribution 4.0)

**Why CC-BY-4.0:**

1. **Industry Standard for Datasets**: Most HuggingFace training datasets use CC-BY-4.0
2. **Allows Commercial Use**: Encourages adoption by companies (more visibility)
3. **Requires Attribution**: Users must credit "BrightRun" — free marketing
4. **Simple & Understood**: Widely recognized, no legal confusion
5. **Derivative Works Allowed**: Maximizes utility and adoption

**What It Means:**
- ✅ Anyone can use, share, and adapt the dataset
- ✅ They MUST give appropriate credit to BrightRun
- ✅ They CAN use it commercially (fine-tune and sell their model)
- ❌ They cannot claim they created the original dataset

**Alternative Consideration:**
If you want to PREVENT commercial use of the dataset itself (while still allowing personal/research use), use **CC-BY-NC-4.0**. However, this reduces adoption and is less common in the fine-tuning community.

### License Text for README

```markdown
## License

This dataset is released under the **Creative Commons Attribution 4.0 International (CC-BY-4.0)** license.

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, including commercially

Under the following terms:
- **Attribution** — You must give appropriate credit to **BrightRun**, provide a link to the license, and indicate if changes were made.

Full license: https://creativecommons.org/licenses/by/4.0/
```

---

## Final Recommendation

### Implement: Hybrid Strategy (Option D)

Based on the analysis, I recommend implementing the **Hybrid Strategy** with the following specific configuration:

### Distribution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HUGGINGFACE REPOSITORY                    │
│              brightrun/eq-alignment-dataset-v1               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📂 /preview/ (UNGATED - 10 conversations)                  │
│     └── Immediate download, proves quality                  │
│                                                             │
│  🔒 /full-dataset/ (GATED - 232 conversations)              │
│     └── Requires: Email + Name + 3 Survey Questions         │
│     └── Auto-approve after submission                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     README.md (Dataset Card)                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • Showcase dataset quality and methodology              ││
│  │ • Explain EQ-alignment training concept                 ││
│  │ • CTA 1: Download preview (ungated)                     ││
│  │ • CTA 2: Request full access (gated)                    ││
│  │ • CTA 3: Premium package at brightrun.ai (optional)     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Gating Questions (HuggingFace)

Configure these in HuggingFace Settings → Gated Dataset:

1. **Required: Email** (built-in)
2. **Required: Name** (built-in)
3. **Custom Q1:** "What base model will you fine-tune? (e.g., Llama-3, Mistral, Qwen)"
4. **Custom Q2:** "What's your primary use case? (Research / Commercial Product / Learning / Other)"
5. **Custom Q3:** "Would you like early access to future BrightRun datasets? (Yes / No)"

### Approval Strategy

**Recommendation: Auto-Approve**

Use HuggingFace's automatic approval for all requests. This:
- Eliminates friction and wait time
- Still captures all required information
- Can be changed to manual later if spam becomes an issue

---

## Implementation Plan

### Phase 1: Dataset Preparation (Day 1)

**Task 1.1: Create Preview Sample**
- Select 10 representative conversations:
  - 3 × anxious_planner (1 per non-edge-case arc)
  - 3 × overwhelmed_avoider (1 per non-edge-case arc)
  - 3 × pragmatic_optimist (1 per non-edge-case arc)
  - 1 × edge_case sample (crisis_to_referral)
- Export to `preview-sample-10.json`

**Task 1.2: Prepare Full Dataset**
- Validate `full-file-training-json-242-conversations.json`
- Ensure proper formatting for HuggingFace Data Viewer
- Create JSONL version for direct training use

**Task 1.3: Create Dataset Card (README.md)**
- Use template provided in Section 7 below
- Include all CTAs and proper licensing

### Phase 2: HuggingFace Setup (Day 2)

**Task 2.1: Create Repository**
- Organization: `brightrun` (or personal if org not set up)
- Repository name: `eq-alignment-dataset-v1`
- Dataset type: `dataset`

**Task 2.2: Upload Files**
```
brightrun/eq-alignment-dataset-v1/
├── README.md                    (Dataset Card)
├── preview/
│   └── sample-10.json          (Ungated preview)
├── data/
│   ├── train.json              (Full 242 conversations - Gated)
│   └── train.jsonl             (JSONL format - Gated)
└── LICENSE                      (CC-BY-4.0)
```

**Task 2.3: Configure Gating**
- Navigate to Settings → Access Control
- Enable "Gated Dataset"
- Set to "Automatic Approval"
- Add 3 custom questions as specified above

### Phase 3: Launch & Promotion (Day 3-7)

**Task 3.1: Community Launch**
- Post to r/LocalLLaMA with showcase
- Share on Twitter/X with demo examples
- Post in HuggingFace Discord

**Task 3.2: Track Metrics**
- HuggingFace: Downloads, Access Requests, Stars
- Export leads weekly from HuggingFace

**Task 3.3: Feedback Loop**
- Monitor HuggingFace Discussions for feedback
- Respond to questions within 24 hours
- Document feature requests for v2

---

## HuggingFace Dataset Card Template

Below is the recommended README.md content for the HuggingFace repository:

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
  - brightrun
pretty_name: BrightRun EQ Alignment Dataset v1.0
size_categories:
  - 1K<n<10K
---

# BrightRun EQ Alignment Dataset v1.0

<div align="center">

**Train your LLM to handle emotionally complex conversations with professional-grade empathy.**

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Dataset Size](https://img.shields.io/badge/Conversations-242-blue)](https://huggingface.co/datasets/brightrun/eq-alignment-dataset-v1)
[![Training Pairs](https://img.shields.io/badge/Training%20Pairs-1%2C567-green)](https://huggingface.co/datasets/brightrun/eq-alignment-dataset-v1)

</div>

---

## 🎯 What is This Dataset?

The **BrightRun EQ Alignment Dataset** is a synthetic conversation dataset designed to fine-tune LLMs for **emotionally intelligent, client-facing interactions** in the financial planning domain.

Unlike generic chatbot training data, this dataset teaches models to:

- ✅ Navigate **emotionally charged** client conversations
- ✅ Respond with **professional empathy** while maintaining boundaries
- ✅ Handle **diverse personality types** (anxious, avoidant, pragmatic)
- ✅ Progress through **realistic emotional arcs** toward resolution

---

## 📊 Dataset Statistics

| Metric | Value |
|--------|-------|
| Total Conversations | 242 |
| Total Training Pairs | 1,567 |
| Average Turns per Conversation | 6-8 |
| Personas | 3 distinct types |
| Emotional Arcs | 7 (including 3 edge cases) |
| Format | brightrun-lora-v4 |
| Language | English |

### Persona Distribution

| Persona | Count | Description |
|---------|-------|-------------|
| `anxious_planner` | 80 | Worried, seeks reassurance, detail-oriented |
| `overwhelmed_avoider` | 79 | Avoidant, easily frustrated, needs simplification |
| `pragmatic_optimist` | 83 | Direct, solution-focused, values efficiency |

### Emotional Arc Coverage

| Arc Type | Count | Description |
|----------|-------|-------------|
| `couple_conflict_to_alignment` | 59 | Partners disagreeing → unified plan |
| `confusion_to_clarity` | 60 | Overwhelmed by options → clear path |
| `overwhelm_to_empowerment` | 42 | Paralyzed → actionable steps |
| `shame_to_acceptance` | 42 | Financial embarrassment → recovery |
| `hostility_to_boundary` | 13 | Client aggression → professional limits |
| `overwhelm_to_triage` | 13 | Crisis → immediate priorities |
| `crisis_to_referral` | 13 | Beyond scope → appropriate handoff |

---

## 🚀 Quick Start

### Preview Sample (No Login Required)

Download 10 sample conversations to evaluate quality:

```python
from datasets import load_dataset

# Load preview sample (ungated)
preview = load_dataset("brightrun/eq-alignment-dataset-v1", data_dir="preview")
print(preview['train'][0])
```

### Full Dataset (Request Access)

The complete 242-conversation dataset requires access approval to help us understand our users:

1. Click **"Request Access"** button above
2. Complete the brief survey (30 seconds)
3. Access is granted automatically
4. Download and start fine-tuning!

```python
from datasets import load_dataset

# Load full dataset (after access granted)
dataset = load_dataset("brightrun/eq-alignment-dataset-v1", data_dir="data")
print(f"Total conversations: {len(dataset['train'])}")
```

---

## 📁 Data Format

Each conversation follows the `brightrun-lora-v4` format:

```json
{
  "conversation_id": "conv_abc123",
  "metadata": {
    "persona": "anxious_planner",
    "emotional_arc": "confusion_to_clarity",
    "training_topic": "retirement_planning",
    "turn_count": 7
  },
  "training_pairs": [
    {
      "instruction": "You are Elena Morales, a certified financial planner...",
      "input": "[Client message expressing confusion about 401k options]",
      "output": "[Empathetic response with clarifying questions]"
    }
  ]
}
```

### Compatible With

- ✅ Axolotl
- ✅ Unsloth  
- ✅ LLaMA-Factory
- ✅ OpenAI Fine-Tuning API
- ✅ Any instruction-tuning framework

---

## 🧠 Methodology: The Elena Morales Framework

This dataset was generated using the **Elena Morales methodology**—a structured approach to training AI systems for empathetic professional communication.

**Key Principles:**
1. **Emotional Acknowledgment First**: Validate feelings before problem-solving
2. **Progressive Disclosure**: Build understanding incrementally
3. **Boundary Awareness**: Know when to refer vs. when to help
4. **Client Empowerment**: End with actionable, confidence-building steps

---

## 🎓 Use Cases

- **Financial AI Assistants**: Train chatbots for wealth management firms
- **Customer Service Models**: Improve empathy in support interactions
- **Research**: Study emotional arc progression in synthetic dialogues
- **Education**: Teach prompt engineering for emotionally intelligent AI

---

## 📜 License

This dataset is released under **CC-BY-4.0** (Creative Commons Attribution 4.0).

You are free to:
- ✅ Use commercially
- ✅ Modify and adapt
- ✅ Redistribute

You must:
- 📝 Give appropriate credit to **BrightRun**

---

## 🔗 Links & Resources

- **Website**: [brightrun.ai](https://brightrun.ai) *(coming soon)*
- **GitHub**: [github.com/brightrun](https://github.com/brightrun)
- **Contact**: datasets@brightrun.ai

---

## 💬 Feedback & Questions

We actively monitor the **Discussions** tab! Please share:
- 🐛 Data quality issues
- 💡 Feature requests for v2
- 📊 Your fine-tuning results
- ❓ Any questions

---

## 📈 Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | December 2025 | Initial release: 242 conversations, 1,567 training pairs |

---

<div align="center">

**Built with ❤️ by [BrightRun](https://brightrun.ai)**

*Democratizing EQ-aligned AI training data*

</div>
```

---

## Success Metrics

### Week 1 Targets
- [ ] 100+ dataset page views
- [ ] 25+ access requests submitted
- [ ] 10+ downloads of preview sample
- [ ] 5+ GitHub stars on HF repo

### Week 4 Targets
- [ ] 500+ dataset page views
- [ ] 100+ qualified leads (emails)
- [ ] 50+ full dataset downloads
- [ ] 3+ community mentions (Reddit, Twitter, Discord)

### Feedback Collection Targets
- [ ] 10+ responses to "What model will you fine-tune?"
- [ ] Understanding of commercial vs. research split
- [ ] 5+ feature requests documented for v2

---

## Appendix: Alternative Strategy Comparison

| Criteria | Full Giveaway | HF Gating Only | Sample + LP | Hybrid (Rec.) |
|----------|---------------|----------------|-------------|---------------|
| Lead Capture | ❌ None | ✅ Strong | ✅ Strong | ✅ Strong |
| Trust/Friction | ✅ Zero | ⚠️ Low | ⚠️ Medium | ⚠️ Low |
| Brand Control | ❌ None | ❌ Limited | ✅ Full | ⚠️ Partial |
| SEO Value | ✅ High | ✅ High | ⚠️ Medium | ✅ High |
| Implementation | ✅ Simple | ✅ Simple | ⚠️ Complex | ⚠️ Medium |
| Future Monetization | ❌ Poor | ⚠️ Fair | ✅ Good | ✅ Good |
| **Overall Score** | 4/10 | 7/10 | 8/10 | **9/10** |

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | PMCT-004-LMS |
| Version | 1.0 |
| Author | AI Strategy Analyst |
| Created | December 8, 2025 |
| Status | Final Recommendation |
| Next Review | After Week 2 metrics |

---

## Appendix B: Option D Deep Dive — Hybrid Strategy Explained

### Clarification of the Inconsistency

In the original description of Option D, I wrote:

> "Provide a meaningful sample (50 conversations) ungated..."

But in the structure table, I wrote:

> "Preview | 10 | Ungated"

**The table is correct. Here's why:**

The initial "50 conversations" was a thinking-out-loud number that got revised down to 10. The rationale:

- **10 conversations** is enough to prove data quality and format
- **10 conversations** is NOT enough to meaningfully fine-tune a model
- This creates the incentive to request the full gated dataset

### How HuggingFace Gating Actually Works

**Important Technical Reality:** HuggingFace's gating feature is **repository-level, not folder-level**. This means you cannot have:
- `/preview/` folder ungated
- `/data/` folder gated

When you enable gating on a HuggingFace dataset, the **entire repository** becomes gated.

### Corrected Option D: Two Viable Approaches

Given HuggingFace's technical constraints, here are two ways to implement the Hybrid Strategy:

---

#### Approach D1: Two Separate Repositories (Recommended)

Create two distinct HuggingFace dataset repositories:

**Repository 1: Preview (Ungated)**
```
brightrun/eq-alignment-preview
├── README.md          (Links to full dataset)
├── sample-10.json     (10 conversations, ungated)
└── sample-10.jsonl    (Same data, JSONL format)
```
- **Access:** Completely public, no login required
- **Purpose:** Prove quality, build trust, SEO
- **CTA:** "Want the full 242 conversations? → Request access here"

**Repository 2: Full Dataset (Gated)**
```
brightrun/eq-alignment-dataset-v1
├── README.md          (Full dataset card)
├── train.json         (242 conversations)
├── train.jsonl        (Same data, JSONL format)
└── LICENSE            (CC-BY-4.0)
```
- **Access:** Gated — requires email + survey
- **Purpose:** Lead capture, full dataset delivery
- **Approval:** Automatic after form submission

**User Journey:**
```
User discovers preview repo → Downloads 10 samples → 
Impressed by quality → Clicks link to full dataset →
Fills out gating form → Auto-approved → Downloads 242 conversations
```

**Pros:**
- ✅ True ungated preview (zero friction to evaluate)
- ✅ Full gating on the valuable dataset
- ✅ Clear separation of concerns
- ✅ Can track which users came from preview

**Cons:**
- ❌ Two repositories to maintain
- ❌ Slightly more complex setup

---

#### Approach D2: Single Repository with README Sample

Keep one repository, but embed sample data directly in the README:

**Single Repository (Gated)**
```
brightrun/eq-alignment-dataset-v1
├── README.md          (Contains 2-3 FULL conversation examples inline)
├── train.json         (242 conversations - gated)
├── train.jsonl        (Same data, JSONL format - gated)
└── LICENSE            (CC-BY-4.0)
```

The README.md would include:

```markdown
## 📋 Sample Conversations

Here are 3 complete conversations from the dataset so you can evaluate the quality before requesting access:

<details>
<summary>🔹 Sample 1: Anxious Planner × Confusion to Clarity (click to expand)</summary>

\`\`\`json
{
  "conversation_id": "conv_sample_001",
  "metadata": {
    "persona": "anxious_planner",
    "emotional_arc": "confusion_to_clarity",
    "training_topic": "retirement_401k_options"
  },
  "turns": [
    {
      "role": "client",
      "content": "I've been looking at my 401k options and honestly I'm completely lost. There are like 15 different funds and I don't know which ones to pick. What if I choose wrong and lose everything?"
    },
    {
      "role": "advisor",
      "content": "I can hear how overwhelming this feels, and I want you to know that's completely normal. The good news is that you're not going to 'lose everything' by picking the wrong fund - these are all professionally managed options your employer has vetted. Let's simplify this together. First, can you tell me roughly how many years until you plan to retire?"
    }
    // ... remaining turns
  ],
  "training_pairs": [...]
}
\`\`\`

</details>

<details>
<summary>🔹 Sample 2: Overwhelmed Avoider × Shame to Acceptance (click to expand)</summary>
// ... full conversation
</details>

<details>
<summary>🔹 Sample 3: Pragmatic Optimist × Crisis to Referral (click to expand)</summary>
// ... full conversation
</details>
```

**User Journey:**
```
User discovers repo → Reads README samples (no download needed) →
Impressed by quality → Clicks "Request Access" →
Fills out gating form → Auto-approved → Downloads full dataset
```

**Pros:**
- ✅ Single repository (simpler)
- ✅ Samples visible without ANY action (not even download)
- ✅ Full gating on actual files

**Cons:**
- ❌ README becomes very long
- ❌ Users can't easily load samples into their code
- ❌ Less "professional" feeling than downloadable files

---

### Final Recommendation: Use Approach D1 (Two Repositories)

**Why D1 is better:**

1. **Professional Appearance**: Two clean repositories look more polished
2. **Usability**: Users can actually load the preview into Python/code
3. **Analytics**: Track preview downloads separately from full downloads
4. **Flexibility**: Can update preview without touching gated repo
5. **Cross-Promotion**: Each repo promotes the other

---

### Revised Implementation Plan for Approach D1

#### Repository 1: Preview Repository

**Name:** `brightrun/eq-alignment-preview`

**Files to Create:**
| File | Contents |
|------|----------|
| `README.md` | Preview dataset card with link to full dataset |
| `preview.json` | 10 conversations (structured as array) |
| `preview.jsonl` | Same 10 conversations in JSONL format |

**Preview Sample Selection (10 conversations):**

| # | Persona | Emotional Arc | Purpose |
|---|---------|---------------|---------|
| 1 | anxious_planner | confusion_to_clarity | Core arc demo |
| 2 | anxious_planner | overwhelm_to_empowerment | Show variation |
| 3 | anxious_planner | shame_to_acceptance | Sensitive topic |
| 4 | overwhelmed_avoider | confusion_to_clarity | Different persona |
| 5 | overwhelmed_avoider | couple_conflict_to_alignment | Couple dynamic |
| 6 | overwhelmed_avoider | overwhelm_to_empowerment | Matching arc/persona |
| 7 | pragmatic_optimist | confusion_to_clarity | Third persona |
| 8 | pragmatic_optimist | shame_to_acceptance | Cross-check |
| 9 | pragmatic_optimist | crisis_to_referral | Edge case demo |
| 10 | anxious_planner | hostility_to_boundary | Edge case demo |

**Preview README Key Sections:**
- "This is a FREE preview of the full dataset"
- Link to full gated dataset
- Same quality metrics and methodology explanation
- Clear CTA: "Ready for all 242 conversations? Request access →"

#### Repository 2: Full Dataset (Gated)

**Name:** `brightrun/eq-alignment-dataset-v1`

**Files:**
| File | Contents |
|------|----------|
| `README.md` | Full dataset card (as already written) |
| `train.json` | All 242 conversations |
| `train.jsonl` | Same data in JSONL format |
| `LICENSE` | CC-BY-4.0 license text |

**Gating Configuration:**
- Enable: Settings → Gated Dataset
- Mode: Automatic Approval
- Required Fields: Email, Name
- Custom Question 1: "What base model will you fine-tune?"
- Custom Question 2: "Primary use case? (Research/Commercial/Learning/Other)"
- Custom Question 3: "Want early access to future datasets? (Yes/No)"

---

### Summary: The Complete Hybrid Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DISCOVERY                                                      │
│  └── User finds preview on HuggingFace/Reddit/Twitter           │
│                                                                 │
│        ↓                                                        │
│                                                                 │
│  EVALUATION (Zero Friction)                                     │
│  └── Downloads 10 preview samples                               │
│  └── Reviews quality, format, methodology                       │
│  └── Tests loading into their training pipeline                 │
│                                                                 │
│        ↓                                                        │
│                                                                 │
│  CONVERSION (Low Friction)                                      │
│  └── Clicks link to full dataset                                │
│  └── Fills out 30-second form (email + 3 questions)             │
│  └── Auto-approved instantly                                    │
│                                                                 │
│        ↓                                                        │
│                                                                 │
│  DELIVERY                                                       │
│  └── Downloads all 242 conversations                            │
│  └── Starts fine-tuning                                         │
│                                                                 │
│        ↓                                                        │
│                                                                 │
│  ENGAGEMENT                                                     │
│  └── Returns to HF Discussions with feedback                    │
│  └── Receives email about v2 (if opted in)                      │
│  └── Becomes advocate for BrightRun                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Lead Capture Points:**
1. ✅ HuggingFace gating form (email + name + 3 questions)
2. ✅ Optional: Landing page for "premium package" with bonuses

**Value Delivered at Each Stage:**
1. Preview: 10 conversations (free, no signup)
2. Full Dataset: 242 conversations (free, requires form)
3. Premium: 242 + bonus materials (optional, future paid tier)

---

*End of Appendix B*

---

*End of Document*
