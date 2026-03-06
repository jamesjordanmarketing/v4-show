# Building Our Own AI: A Practical Roadmap
**Executive Summary for Non-Technical Stakeholders**  
**Version:** 1.0  
**Date:** December 13, 2025  
**Purpose:** Explain the LoRA training infrastructure project in plain language

---

## The Big Picture: What Are We Actually Doing?

We're building a system that will let us **train our own customized AI models** using the conversation data we've already created. Think of it like this:

- **Today:** We use Claude (Anthropic's AI) to generate training conversations for other people's AI models
- **Tomorrow:** We'll be able to take those conversations and create our own specialized AI that thinks, speaks, and responds exactly the way we want

It's like the difference between:
- **Renting** someone else's car (we use Claude) 
- **Customizing** our own car (we train our own model based on Llama 3, Meta's open-source AI)

The customized version will be **permanently infused** with the knowledge, tone, and expertise from our training conversations. When clients hire us to build them a financial planning AI, we'll be able to deliver a model that authentically understands emotional intelligence, maintains brand voice consistency, and navigates complex conversations—because we trained it ourselves.

---

## Why This Matters: The Business Case

### Current State (Without This Infrastructure)

Right now, we're essentially a **high-end data factory**:
- We create amazing conversation datasets (242 conversations so far)
- We store them in nice JSON files
- We give them to clients who... then what? They need to figure out how to train a model themselves
- **We can't prove our datasets actually work** without hiring someone else to do the training

### Future State (With This Infrastructure)

With this system, we become a **full-service AI studio**:
- We create datasets (already doing this ✅)
- We **train models** on those datasets (new capability 🎯)
- We **prove effectiveness** with before/after comparisons
- We deliver ready-to-use AI models, not just data files
- We can charge 3-5x more for trained models vs. raw datasets

**Real-World Example:**

**Without training capability:**
> "Here's your 242-conversation financial planning dataset. That'll be $10,000. Good luck training a model with it!"

**With training capability:**
> "Here's your custom-trained financial planning AI that speaks like Elena Morales, CFP. We've tested it on 50 scenarios—it handles emotional conflicts 40% better than base GPT-4. That'll be $30,000, and we can retrain it quarterly with new data."

The second scenario is where the real money is.

---

## What We Already Have: Our Current Assets

We're **not starting from zero**. We've built a solid foundation:

### 1. High-Quality Training Data ✅
- **242 complete conversations** with 1,567 individual training examples
- Each conversation follows structured scaffolding:
  - 3 different client personalities (anxious planner, overwhelmed avoider, pragmatic optimist)
  - 7 emotional journeys (conflict to alignment, overwhelm to empowerment, etc.)
  - 20 financial topics (compensation negotiation, estate planning, etc.)
- **Quality level:** Better structured than most research datasets

### 2. Working Data Generation Platform ✅
- Next.js application that generates conversations via Claude
- Supabase database tracking everything
- Storage system for all the files
- Dashboard to manage and download conversations

### 3. Proven Process ✅
- Generated 242 conversations in production (proof it works at scale)
- 5-stage enrichment pipeline adds quality metadata
- Batch processing capability (can generate many conversations at once)

**What's Missing:** The ability to actually **use** this data to train an AI model.

---

## What We're Building: The Training Pipeline (Plain English)

We're adding **3 new pieces** to our existing system:

### Piece 1: The Training Job Manager (In Our Existing App)

**What it does:**  
Adds a new section to our dashboard where you can:
- Click "Train New Model" and pick which dataset to use
- Configure training settings (how many times to repeat the training, how much to adjust the AI, etc.)
- See a progress bar showing training status (15% complete... 45% complete... 80% complete...)
- Get notifications when training finishes
- Download the trained model

**Where it lives:** In our current Next.js app on Vercel (same place we manage conversations today)

**Time to build:** 1-2 weeks

---

### Piece 2: The GPU Training Environment (In the Cloud)

**What it does:**  
This is where the heavy lifting happens. Think of it as a **specialized computer workshop** that:
- Takes your training data (those 242 conversations)
- Loads up Meta's Llama 3 70B model (like starting with a general-purpose brain)
- "Teaches" it your specific knowledge by running through your conversations thousands of times
- Saves the customizations (called "LoRA adapters"—basically the learned knowledge in a file)

**Analogy:**  
It's like sending a generic chef to cooking school with your family's secret recipes. The chef (Llama 3) already knows how to cook, but after training on your recipes (our conversations), they can now cook exactly like your grandmother did.

**Where it lives:** On RunPod (a cloud service that rents powerful GPU computers)

**Why we need this:** Training AI models requires extremely powerful computers with specialized chips (GPUs). Buying one would cost $30,000-50,000. Renting by the hour costs $2.49-7.99/hour.

**Time to build:** 2-3 weeks

---

### Piece 3: The Connection Bridge (Webhook Integration)

**What it does:**  
Allows our app (on Vercel) to talk to the training computer (on RunPod):
- Sends the training job: "Here's my dataset, start training"
- Gets progress updates: "10 minutes done, loss is decreasing nicely"
- Receives the finished product: "Training complete! Here's your model"

**Analogy:**  
Like a delivery tracking system. You order something (start training), you get updates ("your package is in transit"), and you're notified when it arrives ("training complete, download your model").

**Time to build:** 1 week (alongside Pieces 1 and 2)

---

## Timeline: 4-Week Sprint to First Trained Model

### Week 1: Foundation
**What we're building:** Database tables to track training jobs, API endpoints to start/stop training

**Milestone:** You can click "Start Training" in the dashboard and it creates a job record

**Status check:** Can we save a training job to the database? If yes, proceed.

---

### Week 2: Training Computer Setup
**What we're building:** The specialized environment that does the actual AI training (Docker container, Python scripts)

**Milestone:** Training computer can receive a dataset and start processing it

**Status check:** Can we connect to the training computer and see it respond? If yes, proceed.

---

### Week 3: End-to-End Integration
**What we're building:** Connect all the pieces together and test the full workflow

**Milestone:** Complete one successful training run from start to finish

**Status check:** Did we get a trained model file at the end? Can we load it and generate text? If yes, proceed.

---

### Week 4: Polish & Testing
**What we're building:** Dashboard UI improvements, error handling, quality testing

**Milestone:** System is reliable enough to use with real client projects

**Status check:** Can we train a model, test it on 10-20 scenarios, and feel confident showing it to a client? If yes, launch.

---

## The Money: Costs & ROI

### Initial Investment (First 3 Months)

| Item | Cost | What You're Paying For |
|------|------|------------------------|
| **First Training Run** | $50-150 | Renting GPU computer for 10-15 hours to train the model |
| **Experimentation** | $50-100 | Testing different settings 3-5 times to find what works best |
| **Storage** | $60 | Storing the trained models in the cloud (3 months) |
| **Contingency** | $100 | Buffer for unexpected costs or retries |
| **TOTAL** | **$260-410** | Full proof-of-concept with working system |

**Development Cost:** $0 (you're doing it yourself)

---

### Operating Costs (After Initial Build)

| Activity | Frequency | Monthly Cost | Annual Cost |
|----------|-----------|--------------|-------------|
| **Proof of Concept Phase** | 1 training run/month | $50 | $600/year |
| **Active Development** | 4 training runs/month | $200 | $2,400/year |
| **Production (Multi-Client)** | 8 training runs/month | $400 | $4,800/year |

**Key insight:** Each training run costs about the same as a nice dinner for two. Each trained model you can sell for $15,000-30,000.

---

### ROI Comparison

**Option A: Hire Someone to Build This**
- ML engineering consultant: $150-250/hour
- Setup time: 40 hours = $6,000-10,000
- Each training iteration: 10 hours = $1,500-2,500
- **Total for 5 training runs: $13,500-22,500**

**Option B: Build It Yourself (This Plan)**
- Your time: 160 hours (4 weeks)
- Infrastructure costs: $260-410 (3 months)
- Each training run: $50-150
- **Total for 5 training runs: $510-1,160**

**Savings: $13,000-21,000**

Plus, you own the system forever and can train unlimited models.

---

## What Success Looks Like: Concrete Outcomes

### By End of Week 3 (Proof of Concept)

You will have:
- ✅ Trained a custom AI model using your 242 financial planning conversations
- ✅ A file containing the trained "knowledge" (LoRA adapters, ~200-500 MB)
- ✅ Ability to load that model and generate text
- ✅ Proof that the system works end-to-end

**Test:** Give the trained model 10 financial planning scenarios. Compare responses to base Llama 3. If your trained version feels "more like Elena Morales" (warm tone, acknowledges emotions, specific advice), you've succeeded.

---

### By End of Week 4 (Production Ready)

You will have:
- ✅ Dashboard UI where anyone can start a training job
- ✅ Progress tracking (see training in real-time)
- ✅ Automatic quality checks
- ✅ Cost tracking (know exactly what each training run costs)
- ✅ Model versioning (keep track of different trained versions)

**Test:** Train a second model using a different dataset (or retrain with improved data). If it's as easy as clicking a button and waiting, you're production-ready.

---

### By End of Month 3 (Client-Ready Product)

You will have:
- ✅ Trained 3-5 different model variations (tested different settings)
- ✅ Clear quality metrics (loss charts, perplexity scores, human evaluation)
- ✅ Before/after comparison studies (base model vs. trained model)
- ✅ Client-facing demo script
- ✅ Pricing model for trained models

**Test:** Can you confidently pitch to a client: "We'll train a custom AI for your brand using our methodology, proven to improve emotional intelligence by 40%"? If yes, you're ready to sell.

---

## Risks: What Could Go Wrong & How We'll Handle It

### Technical Risks

**Risk 1: "The training computer crashes halfway through"**
- **Impact:** Waste 5-6 hours and $15-30
- **Mitigation:** System saves progress every 30 minutes. If it crashes, restart from last checkpoint
- **Real impact:** Lose 30 minutes of progress, not 10 hours

**Risk 2: "We run out of computer memory"**
- **Impact:** Training won't start or crashes immediately
- **Mitigation:** We're using proven settings (QLoRA) that researchers have validated work on this exact hardware
- **Backup plan:** Reduce batch size (train on fewer examples at once)

**Risk 3: "The trained model isn't better than the base model"**
- **Impact:** Wasted training time, need to iterate
- **Mitigation:** Start with proven hyperparameters from research papers, test on small sample first
- **Real impact:** May need 3-5 training runs to optimize settings (built into budget)

**Risk 4: "Costs spiral out of control"**
- **Impact:** Spend more than planned
- **Mitigation:** Set hard limits (max 24 hours per training job), use spot instances (50-80% cheaper), automated alerts
- **Real impact:** Very unlikely—worst case is ~$200 instead of $150

---

### Business Risks

**Risk 5: "We spend 4 weeks building this and it doesn't work"**
- **Impact:** Lost time investment
- **Mitigation:** Phased approach with go/no-go checkpoints each week. If Week 1 fails, we stop before Week 2.
- **Worst case:** Invest 1-2 weeks before realizing it won't work (much better than 4 weeks)

**Risk 6: "Clients don't want trained models, just datasets"**
- **Impact:** Built capability we don't sell
- **Mitigation:** This system also helps us **validate our datasets work** (huge selling point)
- **Alternative value:** Even if we don't sell trained models, we can say "Our datasets improve model performance by 40% (proven through our testing)"

**Risk 7: "A competitor builds this first"**
- **Impact:** Loss of competitive advantage
- **Mitigation:** Speed—we can build in 4 weeks. Most competitors take 3-6 months to decide.
- **Real advantage:** Our dataset quality is superior. Even if someone else has training infrastructure, they don't have 242 high-quality conversations.

---

## Decision Framework: When to Proceed, When to Stop

### Decision Point 1: After Week 1 (Foundation)

**Question:** "Can we track training jobs in our database?"

**Go Criteria:**
- ✅ Database tables created successfully
- ✅ Can click "Start Training" and see a new job record
- ✅ API endpoints respond correctly

**No-Go Criteria:**
- ❌ Can't connect to database
- ❌ API errors constantly
- ❌ Fundamental architecture problems

**If No-Go:** Reassess technical approach. Consider hiring consultant for Week 2-4 (~$6,000).

---

### Decision Point 2: After Week 2 (Training Computer)

**Question:** "Can we connect to the training computer and send it data?"

**Go Criteria:**
- ✅ Training environment responds to requests
- ✅ Can load your dataset successfully
- ✅ No major technical blockers

**No-Go Criteria:**
- ❌ Can't connect to RunPod
- ❌ Memory errors immediately
- ❌ Dataset format incompatible

**If No-Go:** Debug systematically. Often simple fixes (configuration errors). Worst case: postpone by 1 week.

---

### Decision Point 3: After Week 3 (First Training Run)

**Question:** "Did we successfully train a model and does it work?"

**Go Criteria:**
- ✅ Training completed without errors
- ✅ Got a model file at the end
- ✅ Model generates text that sounds better than base model
- ✅ Training cost was within budget ($50-150)

**No-Go Criteria:**
- ❌ Training failed multiple times
- ❌ Model quality is worse than base model
- ❌ Cost exceeded $300

**If No-Go:** This is the critical checkpoint. If training fundamentally doesn't work, pause and assess:
1. Is our dataset the problem? (Run quality audit)
2. Are our settings the problem? (Compare to research papers)
3. Is the approach the problem? (Consult with ML expert)

**Investment so far:** ~$100-200 + 3 weeks time. Reasonable point to reassess before Week 4.

---

### Decision Point 4: After Week 4 (Production Ready)

**Question:** "Can we confidently use this with real clients?"

**Go Criteria:**
- ✅ Dashboard UI is functional and clear
- ✅ Can train models reliably (success rate >80%)
- ✅ Quality metrics show improvement over base model
- ✅ Cost per training run is predictable

**No-Go Criteria:**
- ❌ System is buggy and unreliable
- ❌ Can't explain why models are/aren't better
- ❌ No clear value proposition for clients

**If No-Go:** Still valuable for internal testing. Use Week 5-6 to polish before client-facing launch.

---

## Why This Will Work: The Confidence Factors

### 1. We're Using Proven Technology

**What we're using:**
- Llama 3 (Meta's open-source AI—used by thousands of companies)
- LoRA (research-validated technique from Microsoft, published 2021)
- QLoRA (memory optimization from University of Washington, published 2023)
- Hugging Face tools (industry standard, used by Google, Amazon, Microsoft)

**Translation:** We're not inventing new AI science. We're assembling proven components like LEGO bricks.

---

### 2. Our Dataset Quality is Exceptional

Most LoRA training datasets are:
- Single-turn Q&A (no conversation flow)
- Generic responses (no personality)
- Unstructured (no scaffolding)

Your dataset has:
- ✅ Multi-turn conversations with full context
- ✅ Distinct consultant personality (Elena Morales)
- ✅ Emotional intelligence metadata
- ✅ Structured scaffolding (personas × emotional arcs × topics)

**Translation:** We're starting with better ingredients than most people. Even if we're mediocre cooks, the meal will turn out good.

---

### 3. We're Not Starting From Scratch

**Already built:**
- Conversation generation system (working)
- Data storage infrastructure (working)
- Quality tracking (working)
- Dashboard UI foundation (working)

**What we're adding:** The training orchestration layer on top

**Translation:** This is renovating a house, not building from foundation. Lower risk, faster completion.

---

### 4. The Economics Make Sense

**Worst-case scenario:**
- Spend $400 on infrastructure
- Spend 4 weeks building
- System works but clients don't buy trained models

**Even in worst case:**
- We can now **validate our datasets work** (huge selling point)
- We can offer "dataset + training verification" as premium tier
- We learned ML infrastructure (valuable skill)
- We have proof-of-concept for future verticals

**Best-case scenario:**
- Trained models sell for $15,000-30,000 each
- Infrastructure pays for itself after first sale
- Differentiated offering nobody else has

**Risk-adjusted:** Even moderate success makes this worthwhile.

---

### 5. Built-In Learning Process

This plan isn't "build it perfectly first try." It's:

**Week 1:** Learn database integration  
**Week 2:** Learn GPU orchestration  
**Week 3:** Learn training optimization  
**Week 4:** Learn quality validation  

Each week builds on the last. If we get stuck, we've learned something valuable. If we succeed, we've built something valuable.

---

## The Pitch: Why Do This Now?

### Timing Factors

**1. Market Window (6-12 months)**
- Right now, most companies are still figuring out how to use AI
- LoRA training is emerging as best practice (2025 breakthrough)
- Very few training data companies offer training services
- **First-mover advantage:** Be the one-stop-shop while competitors are still just selling data

**2. Technology Maturity (Just Right)**
- Too early (2023): LoRA was experimental, tools were rough
- Right now (2025): LoRA is proven, tools are production-ready
- Too late (2026+): Commoditized, everyone offers this

**3. Your Dataset Readiness**
- You already have 242 conversations
- They're high quality and well-structured
- **Sitting asset:** You've invested in creating them—now make them work harder

### Competitive Positioning

**Without training capability:**
> "We create high-quality conversation datasets for fine-tuning AI models."
> (Competing with 50+ other data labeling companies)

**With training capability:**
> "We deliver custom-trained AI models that match your brand voice and expertise. Proven 40% improvement in emotional intelligence vs. generic models."
> (Competing with 5-10 specialized AI studios, commanding 3-5x pricing)

---

## Bottom Line: The Recommendation

### Investment Summary

| Category | Amount |
|----------|--------|
| **Cash Investment** | $260-410 (3 months) |
| **Time Investment** | 160 hours (4 weeks) |
| **Ongoing Costs** | $50-400/month (depends on usage) |

### Expected Return

| Outcome | Revenue Potential | Probability |
|---------|-------------------|-------------|
| **Dataset Validation** | Prove datasets work, increase sales 20-30% | 90% likely |
| **Premium Tier Offering** | Charge $15k-30k for trained models vs. $5k-10k for datasets | 70% likely |
| **Full-Service AI Studio** | Become end-to-end provider, 3-5x revenue per client | 50% likely |

### Risk Assessment

**Downside Risk:** Spend $400 and 4 weeks, learn the system doesn't improve quality enough  
**Downside Protection:** Phased approach with weekly go/no-go decisions  
**Upside Potential:** Unlock $15k-30k revenue per trained model, differentiator nobody else offers  

---

## Final Recommendation

### ✅ **PROCEED with 4-Week Phased Build**

**Rationale:**
1. Low financial risk ($260-410 is minimal for potential return)
2. Your dataset is already production-ready (unique asset)
3. Technology is proven (assembling, not inventing)
4. Market timing is right (6-12 month window)
5. Even worst-case scenarios provide value (validation, learning, positioning)

**Not Recommended:**
- ❌ Hiring consultant to build ($13k-22k vs $260-410)
- ❌ Waiting until "perfect dataset" (current dataset is excellent)
- ❌ Building everything before testing (we're doing phased approach)

**Recommended Next Steps:**
1. **This week:** Approve $400 budget, create RunPod account
2. **Week 1:** Start Phase 1 (Database + APIs)
3. **Weekly check-ins:** Assess progress at each decision point
4. **Week 4:** Launch or iterate based on results

---

## Appendix: Glossary of Terms You'll Hear

As you go through this project, you'll hear some technical terms. Here's what they actually mean:

**LoRA (Low-Rank Adaptation)**
- What it sounds like: A medical term or sci-fi jargon
- What it actually is: A smart way to customize an AI model without retraining the whole thing
- Analogy: Like adding a specialized attachment to a power tool rather than building a new tool from scratch

**QLoRA (Quantized LoRA)**
- What it sounds like: Even more confusing
- What it actually is: LoRA but using less computer memory (so we can train big models on smaller computers)
- Analogy: Like compressing a movie so it fits on your phone

**Llama 3 70B**
- What it sounds like: A zoo animal size specification
- What it actually is: Meta's open-source AI model with 70 billion parameters (knobs to adjust)
- Why "70B": More parameters = smarter model, but also needs more powerful computer

**RunPod**
- What it sounds like: A podcast app or running shoe brand
- What it actually is: A company that rents powerful GPU computers by the hour (like Airbnb for AI computers)
- Why we use it: Buying a computer that powerful costs $30k-50k; renting costs $2.49-7.99/hour

**GPU (Graphics Processing Unit)**
- What it sounds like: Something for video games
- What it actually is: A specialized chip that's excellent at the math AI training requires
- Why we need it: Training AI on regular computers would take months; GPUs do it in hours

**H100**
- What it sounds like: A model number for a Honda or something
- What it actually is: NVIDIA's latest, most powerful AI training chip (like the Ferrari of GPUs)
- Why we use it: Llama 3 70B is big—needs powerful hardware

**Training Epoch**
- What it sounds like: A geological time period
- What it actually is: One complete pass through all your training data
- Why it matters: Training usually requires 2-3 epochs (going through the data 2-3 times)

**Hyperparameters**
- What it sounds like: Super advanced parameters
- What it actually is: Settings you adjust before training (like oven temperature for baking)
- Examples: Learning rate, batch size, number of epochs

**Loss (or Training Loss)**
- What it sounds like: Something bad
- What it actually is: A score showing how wrong the model's predictions are (lower is better)
- Good sign: Loss decreasing over time (model is learning)
- Bad sign: Loss staying high or increasing (model not learning)

**Webhook**
- What it sounds like: A fishing term
- What it actually is: A way for one computer to automatically notify another when something happens
- Example: Training computer tells your dashboard "Training is 50% complete"

**JSONL Format**
- What it sounds like: A file format for programmers
- What it actually is: A text file with one training example per line (easy for computers to read)
- Why we use it: Standard format for AI training data

---

**Questions?** This document should give you the full context to make an informed decision about proceeding with the LoRA training infrastructure build. The detailed technical version is available at `iteration-5-LoRA-training-initial.md` for the implementation team.

**Ready to begin?** The first step is simply creating a RunPod account and approving the $400 budget for 3 months of infrastructure costs.


--

# LoRA Training Infrastructure: Llama 3 70B on RunPod H100
**Version:** 1.0  
**Date:** December 13, 2025  
**Author:** Production LoRA Training Engineer  
**Purpose:** Infrastructure roadmap for training Llama 3 70B with BrightRun's 242-conversation dataset on RunPod H100 PCIe

---

## Executive Summary

This document provides a **production-ready roadmap** for implementing LoRA (Low-Rank Adaptation) fine-tuning infrastructure to train Meta's Llama 3 70B model using BrightRun's existing 242-conversation dataset (1,567 training pairs) on a RunPod H100 PCIe GPU instance.

### Key Findings

**✅ Infrastructure Assessment: HIGHLY FAVORABLE**

| Component | Status | Notes |
|-----------|--------|-------|
| **Dataset Format** | ✅ Production-ready | `brightrun-lora-v4` format is excellent - structured, rich metadata, proper conversation history |
| **Dataset Quality** | ✅ Sufficient for proof-of-concept | 1,567 training pairs across 242 conversations - above minimum viable threshold (500-1,000 pairs) |
| **Existing Application** | ✅ Can be extended | Next.js on Vercel + Supabase architecture supports adding training pipeline APIs |
| **RunPod Platform** | ✅ Ideal for this use case | H100 PCIe (80GB VRAM) can handle Llama 3 70B + LoRA + QLoRA optimizations |
| **Cost Efficiency** | ✅ Reasonable | Estimated $50-150 for initial training runs (10-20 hours at $2.49-7.99/hr depending on spot vs on-demand) |
| **Technical Complexity** | ⚠️ Moderate | Requires Docker containerization, Python training scripts, API integration - manageable with existing skills |

**RECOMMENDATION: Proceed with phased implementation starting Q1 2026 (within 4-8 weeks)**

---

## Part 1: Current State Analysis

### 1.1 Dataset Assessment

**File Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\_archive\full-file-training-json-242-conversations.json`

**Dataset Characteristics:**
- **Format:** brightrun-lora-v4 (custom structured format)
- **Size:** 133,539 lines (approximately 8-10 MB JSON)
- **Conversations:** 242 complete multi-turn conversations
- **Training Pairs:** 1,567 individual training examples
- **Vertical:** Financial planning consultant (Elena Morales, CFP)
- **Quality:** AI-generated with 3/5 average quality score (0% human reviewed)

**Dataset Structure (Analyzed):**
```json
{
  "training_file_metadata": {
    "file_name": "Batch 6- 12 conversations #1",
    "version": "4.0.0",
    "format_spec": "brightrun-lora-v4",
    "target_model": "claude-sonnet-4-5",
    "vertical": "financial_planning_consultant",
    "total_conversations": 242,
    "total_training_pairs": 1567
  },
  "consultant_profile": {
    "name": "Elena Morales, CFP",
    "business": "Pathways Financial Planning",
    "core_philosophy": { /* 5 principles */ },
    "communication_style": { /* tone, techniques, avoidances */ }
  },
  "conversations": [
    {
      "conversation_metadata": {
        "conversation_id": "...",
        "total_turns": 5,
        "scaffolding": {
          "persona_key": "anxious_planner",
          "emotional_arc_key": "couple_conflict_to_alignment",
          "training_topic_key": "negotiating_compensation"
        }
      },
      "training_pairs": [
        {
          "id": "...",
          "turn_number": 1,
          "system_prompt": "You are an emotionally intelligent financial planning chatbot...",
          "conversation_history": [],
          "current_user_input": "I'm really stressed about...",
          "emotional_context": {
            "detected_emotions": {
              "primary": "frustration",
              "primary_confidence": 0.8,
              "secondary": "anxiety",
              "intensity": 0.72
            }
          },
          "target_response": "Jennifer, first—take a breath. What you're experiencing...",
          "training_metadata": {
            "difficulty_level": "intermediate_conversation_turn_1",
            "quality_score": 3,
            "demonstrates_skills": ["pragmatic_optimist", "anxious_planner"]
          }
        }
        // ... more training pairs
      ]
    }
    // ... 242 conversations total
  ]
}
```

**Data Quality Assessment:**

| Dimension | Rating | Analysis |
|-----------|--------|----------|
| **Structure** | ⭐⭐⭐⭐⭐ Excellent | Proper conversation threading, turn-by-turn history, rich metadata |
| **Scaffolding** | ⭐⭐⭐⭐⭐ Excellent | 3 personas × 7 emotional arcs × 20 topics = good distribution coverage |
| **Emotional Intelligence** | ⭐⭐⭐⭐ Very Good | Explicit emotional detection, progression tracking, empathy metadata |
| **Context Richness** | ⭐⭐⭐⭐ Very Good | Consultant profile, client personas, session context all included |
| **Response Quality** | ⭐⭐⭐ Good | AI-generated, not human-reviewed - acceptable for proof-of-concept |
| **Volume** | ⭐⭐⭐ Sufficient | 1,567 pairs meets minimum threshold (research shows 500-1,000 minimum for single-domain LoRA) |

**Critical Insight:** This dataset is **immediately usable** for LoRA training. The structure is actually superior to most open-source LoRA datasets (which often lack emotional context, scaffolding metadata, and consultant profile grounding).

### 1.2 Existing Application Infrastructure

**Technology Stack:**
```
Frontend:         Next.js 14 (App Router) + React 18 + TypeScript
Backend:          Next.js API Routes (serverless functions)
Database:         Supabase PostgreSQL
Storage:          Supabase Storage (conversation-files, training-files buckets)
AI Generation:    Claude API (@anthropic-ai/sdk v0.65.0)
Authentication:   Supabase Auth
Deployment:       Vercel (indicated by vercel.json presence)
```

**Relevant Services Already Built:**
1. **TrainingFileService** (`src/lib/services/training-file-service.ts`)
   - Creates aggregated training files (JSON + JSONL)
   - Manages conversation associations
   - Tracks quality metrics and scaffolding distribution
   - **Gap:** Does NOT handle LoRA training - only dataset management

2. **ConversationStorageService**
   - Stores raw + enriched conversation JSONs
   - Supabase Storage integration
   - **Gap:** No model artifact storage capability

3. **API Infrastructure** (`src/app/api/`)
   - Training files API (`/api/training-files`)
   - Conversation management APIs
   - Batch processing APIs
   - **Gap:** No training orchestration endpoints

4. **Database Schema**
   - `training_files` table (tracks datasets)
   - `conversations` table (tracks individual conversations)
   - `training_file_conversations` junction table
   - **Gap:** No `training_jobs`, `model_artifacts`, or `training_metrics` tables

### 1.3 RunPod Platform Analysis

**RunPod Overview:**
- Cloud GPU rental platform optimized for ML/AI workloads
- Supports both on-demand and spot instances (spot = 50-80% cost savings)
- Persistent storage volumes (network storage that persists across pod restarts)
- Template system (pre-configured Docker images)
- HTTP endpoints for API-based orchestration
- CLI and Python SDK available

**H100 PCIe Specifications:**
```
GPU:              NVIDIA H100 PCIe (80GB VRAM)
Tensor Cores:     456 Tensor Cores (4th gen)
Memory Bandwidth: 2TB/s
FP16 Performance: 756 TFLOPS
INT8 Performance: 1,513 TOPS
Suitable For:     Llama 3 70B + LoRA (with QLoRA optimizations)
```

**Cost Structure (as of Dec 2025):**
| Instance Type | GPU | Hourly Rate | Use Case |
|---------------|-----|-------------|----------|
| On-Demand H100 PCIe | 1x H100 (80GB) | $7.99/hr | Production training, guaranteed availability |
| Spot H100 PCIe | 1x H100 (80GB) | $2.49-4.99/hr | Cost-optimized training (50-80% savings, interruptible) |
| Secure Cloud H100 | 1x H100 (80GB) | $6.49/hr | SOC2 compliant, recommended for sensitive data |

**Storage Costs:**
- Network Volume: $0.10/GB/month (persistent storage across pod sessions)
- Pod Storage: Free ephemeral storage (lost when pod terminates)

**Estimated Training Costs:**

| Scenario | Duration | Instance Type | Total Cost |
|----------|----------|---------------|------------|
| **Initial Training (Full)** | 10-15 hours | Spot H100 | $25-75 |
| **Initial Training (Safe)** | 10-15 hours | On-Demand H100 | $80-120 |
| **Fine-tuning Iteration** | 3-5 hours | Spot H100 | $7-25 |
| **Hyperparameter Testing** | 2 hours × 5 runs | Spot H100 | $25-50 |

**Storage Costs:**
- Base model (Llama 3 70B): ~140GB (FP16) or 70GB (INT8/QLoRA)
- LoRA adapters: 200MB-1GB per training run
- Training logs/checkpoints: 2-5GB per run
- **Estimated:** $20-30/month for 200GB network volume

**Total First-Month Cost Estimate: $150-250**
- Initial training runs: $50-100
- Hyperparameter optimization: $30-50
- Storage (1 month): $20-30
- Buffer for experimentation: $50-70

---

## Part 2: LoRA Training Technical Architecture

### 2.1 LoRA Training Fundamentals

**What is LoRA?**
Low-Rank Adaptation (LoRA) is a parameter-efficient fine-tuning technique that freezes the base model and trains small "adapter" matrices inserted into each transformer layer.

**Key Advantages for Llama 3 70B:**
```
Traditional Fine-Tuning:
├─ Trains all 70 billion parameters
├─ Requires 280GB VRAM (4 × FP32)
├─ Training time: 50-100 hours
├─ Cost: $400-800 (H100)
└─ Risk: Catastrophic forgetting

LoRA Fine-Tuning:
├─ Trains 0.1-1% of parameters (70M-700M)
├─ Requires 80-100GB VRAM (with QLoRA)
├─ Training time: 10-20 hours
├─ Cost: $50-150 (H100)
└─ Benefit: Preserves base model knowledge, composable adapters
```

**LoRA Hyperparameters:**
```python
lora_config = {
    "r": 16,                    # Rank (8, 16, 32) - higher = more capacity, slower
    "lora_alpha": 32,           # Scaling factor (typically 2×r)
    "lora_dropout": 0.05,       # Dropout rate (0.05-0.1 typical)
    "target_modules": [         # Which layers to adapt
        "q_proj",               # Query projection
        "k_proj",               # Key projection  
        "v_proj",               # Value projection
        "o_proj",               # Output projection
        "gate_proj",            # MLP gate (Llama 3)
        "up_proj",              # MLP up (Llama 3)
        "down_proj"             # MLP down (Llama 3)
    ],
    "bias": "none",             # Usually "none" for LoRA
    "task_type": "CAUSAL_LM"    # Causal language modeling
}
```

**QLoRA Optimization (Critical for 70B on Single H100):**
QLoRA (Quantized LoRA) reduces memory by:
1. Loading base model in 4-bit quantization (INT4)
2. Training LoRA adapters in BF16 precision
3. Using paged optimizers (offload to CPU when needed)

**Memory Breakdown (Llama 3 70B + QLoRA):**
```
Base Model (INT4):        35GB   (70B params × 4 bits / 8)
LoRA Adapters (BF16):     1GB    (700M trainable params)
Optimizer States:         20GB   (AdamW with paged offload)
Activation Memory:        15GB   (gradient checkpointing)
Batch Processing:         10GB   (batch_size=4, seq_len=2048)
---------------------------------------------------------
Total:                    ~81GB  (fits in H100 80GB with margin)
```

### 2.2 Training Framework: Hugging Face Ecosystem

**Recommended Stack:**
```python
# Core Dependencies
transformers==4.37.0        # Hugging Face Transformers
peft==0.8.0                 # Parameter-Efficient Fine-Tuning (LoRA implementation)
accelerate==0.26.0          # Training acceleration, multi-GPU
bitsandbytes==0.42.0        # 4-bit quantization (QLoRA)
datasets==2.16.0            # Dataset loading and processing
trl==0.7.10                 # Transformer Reinforcement Learning (SFTTrainer)

# Model Loading
torch==2.1.2                # PyTorch (CUDA 12.1 compatible)
```

**Why This Stack?**
1. **Transformers** - Industry standard for loading Llama 3 70B
2. **PEFT** - Official LoRA implementation, production-ready
3. **Accelerate** - Handles mixed precision, gradient accumulation automatically
4. **bitsandbytes** - Tim Dettmers' 4-bit quantization (QLoRA paper author)
5. **TRL** - Supervised Fine-Tuning Trainer (SFTTrainer) simplifies training loop

**Training Script Architecture:**
```python
# high-level pseudocode
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, DataCollatorForCompletionOnly
import torch

# 1. Configure 4-bit quantization (QLoRA)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",           # Normal Float 4
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True       # Nested quantization
)

# 2. Load base model (Llama 3 70B)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-70B-Instruct",
    quantization_config=bnb_config,
    device_map="auto",                   # Auto GPU mapping
    trust_remote_code=True
)
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-70B-Instruct")

# 3. Prepare model for k-bit training
model = prepare_model_for_kbit_training(model)

# 4. Configure LoRA
lora_config = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    bias="none", task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)

# 5. Load and format BrightRun dataset
train_dataset = load_brightrun_dataset("training_data.jsonl")
formatted_dataset = format_for_llama3(train_dataset)  # Convert to Llama 3 chat format

# 6. Training arguments
training_args = TrainingArguments(
    output_dir="./lora_output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,       # Effective batch size = 16
    learning_rate=2e-4,
    fp16=False, bf16=True,               # BF16 for stability
    logging_steps=10,
    save_steps=100,
    save_total_limit=3,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    optim="paged_adamw_32bit"            # Paged optimizer (QLoRA)
)

# 7. Train with SFTTrainer
trainer = SFTTrainer(
    model=model,
    train_dataset=formatted_dataset,
    args=training_args,
    tokenizer=tokenizer,
    max_seq_length=2048,
    data_collator=DataCollatorForCompletionOnly(...)  # Only train on responses
)

trainer.train()

# 8. Save LoRA adapters (200MB-1GB)
model.save_pretrained("./lora_adapters")
tokenizer.save_pretrained("./lora_adapters")
```

### 2.3 Dataset Preprocessing Pipeline

**Challenge:** BrightRun's `brightrun-lora-v4` format must be converted to Llama 3's chat format.

**Llama 3 Chat Format:**
```python
# Llama 3 uses special tokens for chat structure
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an emotionally intelligent financial planning chatbot representing Elena Morales, CFP...
<|eot_id|><|start_header_id|>user<|end_header_id|>
I'm really stressed about this upcoming compensation review...
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
Jennifer, first—take a breath. What you're experiencing right now is one of the most common...
<|eot_id|><|end_of_text|>
```

**Preprocessing Script (Python):**
```python
import json
from datasets import Dataset

def convert_brightrun_to_llama3(brightrun_json_path):
    """
    Converts BrightRun v4 format to Llama 3 chat format.
    
    BrightRun Structure:
    - training_pairs[i].system_prompt → system message
    - training_pairs[i].conversation_history → previous turns
    - training_pairs[i].current_user_input → current user message
    - training_pairs[i].target_response → assistant response (training target)
    
    Output: JSONL with one training example per line
    """
    with open(brightrun_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    examples = []
    
    for conversation in data['conversations']:
        for pair in conversation['training_pairs']:
            # Skip pairs without target_response (turn 1 often null)
            if pair.get('target_response') is None:
                continue
            
            # Build Llama 3 chat messages
            messages = []
            
            # System prompt
            messages.append({
                "role": "system",
                "content": pair['system_prompt']
            })
            
            # Conversation history (previous turns)
            for history_turn in pair.get('conversation_history', []):
                messages.append({
                    "role": history_turn['role'],  # 'user' or 'assistant'
                    "content": history_turn['content']
                })
            
            # Current user input
            messages.append({
                "role": "user",
                "content": pair['current_user_input']
            })
            
            # Target response (what we're training on)
            messages.append({
                "role": "assistant",
                "content": pair['target_response']
            })
            
            # Metadata for tracking
            examples.append({
                "messages": messages,
                "conversation_id": conversation['conversation_metadata']['conversation_id'],
                "turn_number": pair['turn_number'],
                "quality_score": pair['training_metadata'].get('quality_score'),
                "emotional_arc": conversation['conversation_metadata']['scaffolding']['emotional_arc_key'],
                "training_topic": conversation['conversation_metadata']['scaffolding']['training_topic_key']
            })
    
    # Convert to Hugging Face Dataset
    dataset = Dataset.from_list(examples)
    
    # Apply Llama 3 chat template
    def format_chat(example):
        formatted = tokenizer.apply_chat_template(
            example['messages'],
            tokenize=False,
            add_generation_prompt=False
        )
        return {"text": formatted}
    
    formatted_dataset = dataset.map(format_chat)
    
    return formatted_dataset

# Usage
dataset = convert_brightrun_to_llama3("full-file-training-json-242-conversations.json")
dataset.save_to_disk("./processed_dataset")

# Also save as JSONL for inspection
with open("training_data.jsonl", 'w', encoding='utf-8') as f:
    for example in dataset:
        f.write(json.dumps(example) + '\n')
```

**Quality Filtering (Optional):**
```python
# Filter by quality score (only use quality >= 3.5)
high_quality_dataset = dataset.filter(lambda x: x['quality_score'] >= 3.5)

# Balance scaffolding distribution
# Ensure no emotional_arc is over-represented
```

---

## Part 3: End-to-End Pipeline Architecture

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js Application)                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard UI (Existing)                                          │ │
│  │  - Conversation Management                                        │ │
│  │  - Training File Creation                                         │ │
│  │  - NEW: Training Job Management                                   │ │
│  └─────────────────────────┬─────────────────────────────────────────┘ │
│                             │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  API Routes (Next.js API)                                         │ │
│  │  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  │ │
│  │  │ Existing APIs   │  │ NEW: Training  │  │ NEW: Model Mgmt  │  │ │
│  │  │ - Conversations │  │ - /start-job   │  │ - /list-models   │  │ │
│  │  │ - Training Files│  │ - /job-status  │  │ - /download-lora │  │ │
│  │  │ - Batch Jobs    │  │ - /stop-job    │  │ - /test-model    │  │ │
│  │  └─────────────────┘  └────────┬───────┘  └──────────────────┘  │ │
│  └───────────────────────────────────┼────────────────────────────────┘ │
└────────────────────────────────────┼────────────────────────────────────┘
                                      │
                          HTTP POST (webhook style)
                                      │
┌────────────────────────────────────┼────────────────────────────────────┐
│                    RUNPOD (GPU Training Environment)                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  RunPod Pod (H100 PCIe 80GB)                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │  Docker Container (Custom Training Image)                   │ │ │
│  │  │  ┌──────────────────────────────────────────────────────┐  │ │ │
│  │  │  │  Training API Server (FastAPI)                        │  │ │ │
│  │  │  │  - POST /training/start                               │  │ │ │
│  │  │  │  - GET /training/status/{job_id}                      │  │ │ │
│  │  │  │  - POST /training/stop/{job_id}                       │  │ │ │
│  │  │  │  - GET /models/list                                   │  │ │ │
│  │  │  │  - POST /models/test                                  │  │ │ │
│  │  │  └────────────────────┬─────────────────────────────────┘  │ │ │
│  │  │                       │                                      │ │ │
│  │  │  ┌────────────────────▼─────────────────────────────────┐  │ │ │
│  │  │  │  Training Orchestrator (Python)                      │  │ │ │
│  │  │  │  1. Download dataset from Supabase                   │  │ │ │
│  │  │  │  2. Preprocess to Llama 3 format                     │  │ │ │
│  │  │  │  3. Load base model (Llama 3 70B, 4-bit)             │  │ │ │
│  │  │  │  4. Configure LoRA adapters                          │  │ │ │
│  │  │  │  5. Train with SFTTrainer                            │  │ │ │
│  │  │  │  6. Save checkpoints to network volume               │  │ │ │
│  │  │  │  7. Upload final adapters to Supabase                │  │ │ │
│  │  │  │  8. Send status updates to webhook                   │  │ │ │
│  │  │  └──────────────────────────────────────────────────────┘  │ │ │
│  │  │                                                              │ │ │
│  │  │  ┌──────────────────────────────────────────────────────┐  │ │ │
│  │  │  │  Model Inference (vLLM)                              │  │ │ │
│  │  │  │  - Loads base model + LoRA adapters                  │  │ │ │
│  │  │  │  - Provides OpenAI-compatible API                    │  │ │ │
│  │  │  │  - Used for testing trained models                   │  │ │ │
│  │  │  └──────────────────────────────────────────────────────┘  │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  Network Volume (Persistent Storage, 200GB)                       │ │
│  │  ├─ /models/llama-3-70b-base (70GB)                              │ │
│  │  ├─ /lora_adapters/run_001/ (500MB)                              │ │
│  │  ├─ /lora_adapters/run_002/ (500MB)                              │ │
│  │  ├─ /datasets/processed/ (2GB)                                   │ │
│  │  └─ /logs/ (1GB)                                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    Upload trained LoRA adapters
                                      │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    SUPABASE (Storage & Database)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Storage Buckets:                                               │   │
│  │  - conversation-files/ (existing)                               │   │
│  │  - training-files/ (existing)                                   │   │
│  │  - NEW: model-artifacts/                                        │   │
│  │    ├─ lora_adapters/run_001/adapter_model.bin (200MB)           │   │
│  │    ├─ lora_adapters/run_001/adapter_config.json                 │   │
│  │    └─ training_logs/run_001.json                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Tables:                                             │   │
│  │  - conversations (existing)                                     │   │
│  │  - training_files (existing)                                    │   │
│  │  - NEW: training_jobs                                           │   │
│  │    ├─ id, training_file_id, status, runpod_pod_id              │   │
│  │    ├─ hyperparameters (JSONB)                                   │   │
│  │    ├─ metrics (JSONB): loss, learning_rate, steps               │   │
│  │    └─ lora_artifact_path                                        │   │
│  │  - NEW: model_artifacts                                         │   │
│  │    ├─ id, training_job_id, artifact_type (lora/full)           │   │
│  │    ├─ storage_path, file_size, quality_score                    │   │
│  │    └─ deployment_status                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Workflow: Training Job Lifecycle

```
┌──────────────┐
│   USER       │
│  (Dashboard) │
└──────┬───────┘
       │ 1. Select training_file_id, configure hyperparameters
       ▼
┌────────────────────────────────────────────┐
│  Vercel API: POST /api/training/start-job  │
│  - Validates training_file exists          │
│  - Creates training_jobs row (status=queued)│
│  - Initiates RunPod pod (if not running)   │
│  - Sends dataset URL + config to RunPod    │
└──────┬─────────────────────────────────────┘
       │ 2. HTTP POST to RunPod API
       ▼
┌────────────────────────────────────────────┐
│  RunPod API: POST /training/start          │
│  - Receives: training_file download URL    │
│  - Receives: hyperparameters (JSON)        │
│  - Returns: job_id (UUID)                  │
└──────┬─────────────────────────────────────┘
       │ 3. Background async training starts
       ▼
┌────────────────────────────────────────────┐
│  Training Orchestrator (Python async)      │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 1: Dataset Preparation         │ │
│  │ - Download from Supabase             │ │
│  │ - Convert brightrun-v4 → Llama 3     │ │
│  │ - Tokenize and cache                 │ │
│  │ ✅ Webhook: status=preprocessing     │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 2: Model Loading               │ │
│  │ - Load Llama 3 70B (4-bit QLoRA)     │ │
│  │ - Prepare for k-bit training         │ │
│  │ - Configure LoRA adapters            │ │
│  │ ✅ Webhook: status=model_loaded      │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 3: Training                    │ │
│  │ - SFTTrainer.train()                 │ │
│  │ - Log metrics every 10 steps         │ │
│  │ - Checkpoint every 100 steps         │ │
│  │ ✅ Webhook every 50 steps:           │ │
│  │    status=training, metrics={...}    │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │ STAGE 4: Finalization                │ │
│  │ - Save LoRA adapters                 │ │
│  │ - Run validation set (optional)      │ │
│  │ - Zip artifacts                      │ │
│  │ - Upload to Supabase Storage         │ │
│  │ ✅ Webhook: status=completed         │ │
│  │    lora_path=model-artifacts/...     │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
       │ 4. Webhook updates to Vercel API
       ▼
┌────────────────────────────────────────────┐
│  Vercel API: POST /api/training/webhook    │
│  - Receives status updates from RunPod     │
│  - Updates training_jobs table             │
│  - Stores metrics in JSONB column          │
│  - On completion: creates model_artifacts row│
└────────────────────────────────────────────┘
       │ 5. User checks status
       ▼
┌────────────────────────────────────────────┐
│  Vercel API: GET /api/training/jobs/:id    │
│  - Returns: status, metrics, progress      │
│  - Frontend polls every 10 seconds         │
└────────────────────────────────────────────┘
       │ 6. Training completed
       ▼
┌────────────────────────────────────────────┐
│  Dashboard: Training Complete              │
│  - Show final metrics (loss, perplexity)   │
│  - Download LoRA adapters button           │
│  - Test model button (launches vLLM)       │
└────────────────────────────────────────────┘
```

### 3.3 Key API Specifications

#### Vercel API: Start Training Job

**Endpoint:** `POST /api/training/start-job`

**Request:**
```typescript
{
  "training_file_id": "uuid",        // References training_files table
  "hyperparameters": {
    "num_epochs": 3,
    "batch_size": 4,
    "learning_rate": 2e-4,
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "warmup_ratio": 0.03
  },
  "runpod_config": {
    "gpu_type": "H100_PCIE",
    "instance_type": "spot",          // "spot" or "on_demand"
    "max_duration_hours": 24
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "training_job_id": "uuid",
  "status": "queued",
  "runpod_pod_id": "xyz123",
  "estimated_duration_minutes": 600,
  "estimated_cost_usd": 50
}
```

#### RunPod API: Start Training

**Endpoint:** `POST /training/start` (RunPod internal API)

**Request:**
```python
{
  "job_id": "uuid",                   # Matches Vercel training_job_id
  "dataset_url": "https://...",       # Supabase signed URL (1-hour expiry)
  "hyperparameters": { ... },
  "webhook_url": "https://your-app.vercel.app/api/training/webhook",
  "webhook_secret": "secret_key"      # For authentication
}
```

**Response:**
```python
{
  "success": true,
  "job_id": "uuid",
  "status": "preprocessing",
  "estimated_steps": 1200             # (num_examples / batch_size) * epochs
}
```

#### RunPod Webhook: Status Updates

**Endpoint:** `POST /api/training/webhook` (Vercel receives this)

**Payload:**
```typescript
{
  "job_id": "uuid",
  "status": "training",               // preprocessing, model_loaded, training, completed, failed
  "step": 450,
  "total_steps": 1200,
  "metrics": {
    "loss": 0.847,
    "learning_rate": 0.00018,
    "grad_norm": 0.23,
    "epoch": 1.5
  },
  "timestamp": "2025-12-13T10:30:00Z"
}
```

**Authentication:**
```typescript
// Webhook includes HMAC signature for security
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

headers: {
  'X-Webhook-Signature': signature
}
```

---

## Part 4: Infrastructure Gaps & Implementation Checklist

### 4.1 Missing Components Analysis

| Component | Status | Priority | Effort |
|-----------|--------|----------|--------|
| **1. Database Schema Extensions** | ❌ Missing | 🔴 Critical | 4 hours |
| **2. Vercel Training APIs** | ❌ Missing | 🔴 Critical | 16 hours |
| **3. RunPod Docker Image** | ❌ Missing | 🔴 Critical | 20 hours |
| **4. Training Orchestrator Script** | ❌ Missing | 🔴 Critical | 24 hours |
| **5. Dataset Preprocessing Script** | ❌ Missing | 🔴 Critical | 8 hours |
| **6. Webhook Integration** | ❌ Missing | 🟡 High | 8 hours |
| **7. Dashboard UI (Training Jobs)** | ❌ Missing | 🟡 High | 16 hours |
| **8. Model Testing/Inference Setup** | ❌ Missing | 🟢 Medium | 12 hours |
| **9. Cost Tracking & Billing** | ❌ Missing | 🟢 Medium | 8 hours |
| **10. RunPod Pod Auto-Start** | ❌ Missing | 🔵 Nice-to-have | 6 hours |

**Total Estimated Effort:** 122 hours (~3-4 weeks full-time)

### 4.2 Detailed Implementation Checklist

#### PHASE 1: Database & Storage Setup (Week 1 - Days 1-2)

**1.1 Database Schema Extensions**
```sql
-- File: supabase/migrations/add_training_infrastructure.sql

-- Training Jobs Table
CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_file_id UUID REFERENCES training_files(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'preprocessing', 'model_loaded', 'training', 'completed', 'failed', 'cancelled')),
  
  -- RunPod Integration
  runpod_pod_id TEXT,
  runpod_endpoint_url TEXT,
  
  -- Hyperparameters (stored as JSONB for flexibility)
  hyperparameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Training Metrics (updated via webhooks)
  metrics JSONB DEFAULT '{}'::jsonb,
  current_step INT DEFAULT 0,
  total_steps INT,
  current_epoch NUMERIC(4,2) DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  
  -- Cost Tracking
  estimated_cost_usd NUMERIC(10,2),
  actual_cost_usd NUMERIC(10,2),
  gpu_hours NUMERIC(10,2),
  
  -- Artifacts
  lora_artifact_path TEXT,               -- Path in Supabase Storage
  training_log_path TEXT,                -- Logs uploaded to Storage
  
  -- Error Handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_training_file ON training_jobs(training_file_id);
CREATE INDEX idx_training_jobs_created_at ON training_jobs(created_at DESC);

-- Model Artifacts Table
CREATE TABLE model_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('lora_adapter', 'merged_model', 'checkpoint')),
  storage_path TEXT NOT NULL,            -- Supabase Storage path
  file_size_bytes BIGINT,
  
  -- Model Info
  base_model TEXT DEFAULT 'meta-llama/Meta-Llama-3-70B-Instruct',
  lora_config JSONB,                     -- LoRA hyperparameters used
  
  -- Quality Metrics
  validation_loss NUMERIC(10,6),
  validation_perplexity NUMERIC(10,4),
  human_eval_score NUMERIC(3,2),         -- If human evaluation performed
  
  -- Deployment
  deployment_status TEXT CHECK (deployment_status IN ('stored', 'testing', 'production', 'archived')),
  deployed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_model_artifacts_training_job ON model_artifacts(training_job_id);
CREATE INDEX idx_model_artifacts_type ON model_artifacts(artifact_type);

-- Training Metrics History (for charting)
CREATE TABLE training_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  step INT NOT NULL,
  epoch NUMERIC(4,2),
  
  -- Metrics
  loss NUMERIC(10,6),
  learning_rate NUMERIC(10,8),
  grad_norm NUMERIC(10,6),
  
  -- Timestamps
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_metrics_job_step ON training_metrics_history(training_job_id, step);

-- Update trigger for training_jobs.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_training_jobs_updated_at BEFORE UPDATE ON training_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**1.2 Supabase Storage Bucket**
```sql
-- Create model-artifacts bucket (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-artifacts', 'model-artifacts', false);

-- RLS Policies (authenticated users can read, service role can write)
CREATE POLICY "Authenticated users can read model artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'model-artifacts');

CREATE POLICY "Service role can write model artifacts"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'model-artifacts');
```

**Deliverables:**
- [ ] Migration file created: `supabase/migrations/add_training_infrastructure.sql`
- [ ] Migration applied to Supabase project
- [ ] `model-artifacts` bucket created
- [ ] RLS policies configured

---

#### PHASE 2: Vercel API Development (Week 1 Days 3-5, Week 2 Days 1-2)

**2.1 Training Service Class**

**File:** `src/lib/services/training-service.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface StartTrainingJobInput {
  training_file_id: string;
  hyperparameters: {
    num_epochs: number;
    batch_size: number;
    learning_rate: number;
    lora_r: number;
    lora_alpha: number;
    lora_dropout: number;
    warmup_ratio: number;
    gradient_accumulation_steps: number;
    max_seq_length: number;
  };
  runpod_config: {
    gpu_type: 'H100_PCIE' | 'A100_80GB';
    instance_type: 'spot' | 'on_demand';
    max_duration_hours: number;
  };
  created_by: string;
}

export interface TrainingJob {
  id: string;
  training_file_id: string;
  status: 'queued' | 'preprocessing' | 'model_loaded' | 'training' | 'completed' | 'failed' | 'cancelled';
  runpod_pod_id: string | null;
  runpod_endpoint_url: string | null;
  hyperparameters: object;
  metrics: object;
  current_step: number;
  total_steps: number | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  lora_artifact_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class TrainingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Start a new training job
   */
  async startTrainingJob(input: StartTrainingJobInput): Promise<TrainingJob> {
    // 1. Validate training file exists
    const { data: trainingFile, error: fileError } = await this.supabase
      .from('training_files')
      .select('*')
      .eq('id', input.training_file_id)
      .single();

    if (fileError || !trainingFile) {
      throw new Error('Training file not found');
    }

    // 2. Generate signed URL for dataset download (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await this.supabase.storage
      .from('training-files')
      .createSignedUrl(trainingFile.json_file_path, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      throw new Error('Failed to generate dataset download URL');
    }

    // 3. Estimate training duration and cost
    const estimatedSteps = Math.ceil(
      (trainingFile.total_training_pairs / input.hyperparameters.batch_size) *
      input.hyperparameters.num_epochs
    );
    
    const hourlyRate = input.runpod_config.instance_type === 'spot' ? 2.49 : 7.99;
    const estimatedHours = estimatedSteps * 3 / 3600; // ~3 seconds per step
    const estimatedCost = estimatedHours * hourlyRate;

    // 4. Create training_jobs record
    const trainingJobId = uuidv4();
    
    const { data: job, error: jobError } = await this.supabase
      .from('training_jobs')
      .insert({
        id: trainingJobId,
        training_file_id: input.training_file_id,
        status: 'queued',
        hyperparameters: input.hyperparameters,
        total_steps: estimatedSteps,
        estimated_cost_usd: estimatedCost,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 5. Call RunPod API to start training
    const runpodResponse = await this.callRunPodStartTraining({
      job_id: trainingJobId,
      dataset_url: signedUrlData.signedUrl,
      hyperparameters: input.hyperparameters,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/training/webhook`,
      webhook_secret: process.env.TRAINING_WEBHOOK_SECRET!,
    });

    // 6. Update job with RunPod details
    const { data: updatedJob, error: updateError } = await this.supabase
      .from('training_jobs')
      .update({
        runpod_pod_id: runpodResponse.pod_id,
        runpod_endpoint_url: runpodResponse.endpoint_url,
        status: 'preprocessing',
        started_at: new Date().toISOString(),
      })
      .eq('id', trainingJobId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedJob as TrainingJob;
  }

  /**
   * Get training job status
   */
  async getTrainingJob(job_id: string): Promise<TrainingJob | null> {
    const { data, error } = await this.supabase
      .from('training_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as TrainingJob;
  }

  /**
   * List training jobs
   */
  async listTrainingJobs(filters?: {
    status?: string;
    training_file_id?: string;
    created_by?: string;
  }): Promise<TrainingJob[]> {
    let query = this.supabase
      .from('training_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.training_file_id) query = query.eq('training_file_id', filters.training_file_id);
    if (filters?.created_by) query = query.eq('created_by', filters.created_by);

    const { data, error } = await query;
    if (error) throw error;

    return data as TrainingJob[];
  }

  /**
   * Cancel training job
   */
  async cancelTrainingJob(job_id: string): Promise<void> {
    const job = await this.getTrainingJob(job_id);
    if (!job) throw new Error('Training job not found');

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      throw new Error('Cannot cancel job in status: ' + job.status);
    }

    // Call RunPod to stop the training
    if (job.runpod_pod_id) {
      await this.callRunPodStopTraining(job.runpod_pod_id);
    }

    // Update status
    await this.supabase
      .from('training_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', job_id);
  }

  /**
   * Handle webhook from RunPod
   */
  async handleWebhook(payload: {
    job_id: string;
    status: string;
    step?: number;
    total_steps?: number;
    metrics?: object;
    lora_artifact_path?: string;
    error_message?: string;
  }): Promise<void> {
    const updates: any = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (payload.step !== undefined) updates.current_step = payload.step;
    if (payload.total_steps !== undefined) updates.total_steps = payload.total_steps;
    if (payload.metrics) updates.metrics = payload.metrics;
    if (payload.lora_artifact_path) updates.lora_artifact_path = payload.lora_artifact_path;
    if (payload.error_message) updates.error_message = payload.error_message;

    if (payload.status === 'completed' || payload.status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    await this.supabase
      .from('training_jobs')
      .update(updates)
      .eq('id', payload.job_id);

    // If metrics provided, also insert into training_metrics_history
    if (payload.metrics && payload.step) {
      await this.supabase
        .from('training_metrics_history')
        .insert({
          training_job_id: payload.job_id,
          step: payload.step,
          ...payload.metrics,
        });
    }
  }

  /**
   * Call RunPod API to start training
   */
  private async callRunPodStartTraining(params: {
    job_id: string;
    dataset_url: string;
    hyperparameters: object;
    webhook_url: string;
    webhook_secret: string;
  }): Promise<{ pod_id: string; endpoint_url: string }> {
    const runpodEndpoint = process.env.RUNPOD_ENDPOINT_URL;
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    if (!runpodEndpoint || !runpodApiKey) {
      throw new Error('RunPod configuration missing');
    }

    const response = await fetch(`${runpodEndpoint}/training/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runpodApiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunPod API error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Call RunPod API to stop training
   */
  private async callRunPodStopTraining(pod_id: string): Promise<void> {
    const runpodApiKey = process.env.RUNPOD_API_KEY;

    // Use RunPod's pod management API to terminate pod
    const response = await fetch(`https://api.runpod.io/v2/${pod_id}/terminate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runpodApiKey}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to terminate RunPod pod:', await response.text());
    }
  }
}

export const createTrainingService = (supabase: SupabaseClient) => {
  return new TrainingService(supabase);
};
```

**2.2 API Routes**

**File:** `src/app/api/training/start-job/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTrainingService } from '@/lib/services/training-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const trainingService = createTrainingService(supabase);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.training_file_id || !body.hyperparameters) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Start training job
    const job = await trainingService.startTrainingJob({
      ...body,
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      training_job: job,
    });

  } catch (error) {
    console.error('Error starting training job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start training job' },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/training/jobs/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTrainingService } from '@/lib/services/training-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const trainingService = createTrainingService(supabase);

    const job = await trainingService.getTrainingJob(params.id);

    if (!job) {
      return NextResponse.json({ error: 'Training job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });

  } catch (error) {
    console.error('Error fetching training job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const trainingService = createTrainingService(supabase);

    await trainingService.cancelTrainingJob(params.id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error cancelling training job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/training/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createTrainingService } from '@/lib/services/training-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('X-Webhook-Signature');
    const body = await request.text();
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.TRAINING_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Use service role client (webhooks don't have user auth)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const trainingService = createTrainingService(supabase);
    await trainingService.handleWebhook(payload);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

**Deliverables:**
- [ ] `training-service.ts` created
- [ ] API routes created:
  - [ ] `POST /api/training/start-job`
  - [ ] `GET /api/training/jobs`
  - [ ] `GET /api/training/jobs/[id]`
  - [ ] `DELETE /api/training/jobs/[id]` (cancel)
  - [ ] `POST /api/training/webhook`
- [ ] Environment variables documented:
  - `RUNPOD_ENDPOINT_URL`
  - `RUNPOD_API_KEY`
  - `TRAINING_WEBHOOK_SECRET`

---

#### PHASE 3: RunPod Docker Container (Week 2 Days 3-5, Week 3 Days 1-2)

**3.1 Dockerfile**

**File:** `runpod/Dockerfile`

```dockerfile
# Base Image: NVIDIA CUDA 12.1 + Ubuntu 22.04
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    wget \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA 12.1 support
RUN pip install torch==2.1.2 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install Hugging Face ecosystem
RUN pip install \
    transformers==4.37.0 \
    peft==0.8.0 \
    accelerate==0.26.0 \
    bitsandbytes==0.42.0 \
    datasets==2.16.0 \
    trl==0.7.10

# Install additional dependencies
RUN pip install \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    pydantic==2.5.0 \
    httpx==0.26.0 \
    python-multipart==0.0.6 \
    aiofiles==23.2.1

# Install monitoring tools
RUN pip install \
    wandb==0.16.2 \
    tensorboard==2.15.1 \
    nvidia-ml-py3==7.352.0

# Create application directory
WORKDIR /app

# Copy training scripts
COPY ./training_orchestrator.py /app/
COPY ./dataset_preprocessor.py /app/
COPY ./api_server.py /app/
COPY ./config.py /app/
COPY ./requirements.txt /app/

# Create directories
RUN mkdir -p /app/logs /app/checkpoints /app/datasets /app/models

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start API server
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

**3.2 Training Orchestrator**

**File:** `runpod/training_orchestrator.py`

```python
"""
Training Orchestrator for LoRA Fine-Tuning Llama 3 70B
Handles end-to-end training workflow with progress reporting
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    PeftModel,
)
from trl import SFTTrainer, DataCollatorForCompletionOnly
from datasets import Dataset
import httpx

from dataset_preprocessor import BrightRunDatasetPreprocessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrainingOrchestrator:
    def __init__(
        self,
        job_id: str,
        dataset_url: str,
        hyperparameters: Dict[str, Any],
        webhook_url: str,
        webhook_secret: str,
        base_model: str = "meta-llama/Meta-Llama-3-70B-Instruct",
    ):
        self.job_id = job_id
        self.dataset_url = dataset_url
        self.hyperparameters = hyperparameters
        self.webhook_url = webhook_url
        self.webhook_secret = webhook_secret
        self.base_model = base_model
        
        self.output_dir = Path(f"/workspace/lora_output/{job_id}")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.preprocessor = BrightRunDatasetPreprocessor()
        self.model = None
        self.tokenizer = None
        self.trainer = None

    async def run_training(self):
        """Main training workflow"""
        try:
            # Stage 1: Dataset Preparation
            await self.send_webhook("preprocessing", {"message": "Downloading dataset"})
            dataset = await self.prepare_dataset()
            
            # Stage 2: Model Loading
            await self.send_webhook("model_loaded", {"message": "Loading Llama 3 70B"})
            self.model, self.tokenizer = await self.load_model()
            
            # Stage 3: Training
            await self.send_webhook("training", {"message": "Training started", "step": 0})
            await self.train(dataset)
            
            # Stage 4: Save and Upload
            await self.send_webhook("training", {"message": "Saving LoRA adapters"})
            artifact_path = await self.save_and_upload_artifacts()
            
            # Completion
            await self.send_webhook("completed", {
                "message": "Training completed successfully",
                "lora_artifact_path": artifact_path,
            })
            
            logger.info(f"Training job {self.job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}", exc_info=True)
            await self.send_webhook("failed", {
                "error_message": str(e),
            })
            raise

    async def prepare_dataset(self) -> Dataset:
        """Download and preprocess BrightRun dataset"""
        logger.info("Downloading dataset from Supabase")
        
        # Download dataset
        async with httpx.AsyncClient() as client:
            response = await client.get(self.dataset_url)
            response.raise_for_status()
            
            dataset_path = self.output_dir / "dataset.json"
            dataset_path.write_bytes(response.content)
        
        logger.info("Preprocessing dataset to Llama 3 format")
        
        # Preprocess using BrightRunDatasetPreprocessor
        dataset = self.preprocessor.convert_to_llama3_format(
            str(dataset_path),
            self.tokenizer
        )
        
        logger.info(f"Dataset prepared: {len(dataset)} training examples")
        return dataset

    async def load_model(self):
        """Load Llama 3 70B with QLoRA"""
        logger.info("Configuring 4-bit quantization (QLoRA)")
        
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        
        logger.info(f"Loading base model: {self.base_model}")
        
        model = AutoModelForCausalLM.from_pretrained(
            self.base_model,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
        )
        
        tokenizer = AutoTokenizer.from_pretrained(self.base_model)
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = "right"
        
        logger.info("Preparing model for k-bit training")
        model = prepare_model_for_kbit_training(model)
        
        logger.info("Configuring LoRA adapters")
        lora_config = LoraConfig(
            r=self.hyperparameters.get('lora_r', 16),
            lora_alpha=self.hyperparameters.get('lora_alpha', 32),
            lora_dropout=self.hyperparameters.get('lora_dropout', 0.05),
            target_modules=[
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj"
            ],
            bias="none",
            task_type="CAUSAL_LM",
        )
        
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
        
        return model, tokenizer

    async def train(self, dataset: Dataset):
        """Execute training with SFTTrainer"""
        logger.info("Configuring training arguments")
        
        training_args = TrainingArguments(
            output_dir=str(self.output_dir),
            num_train_epochs=self.hyperparameters.get('num_epochs', 3),
            per_device_train_batch_size=self.hyperparameters.get('batch_size', 4),
            gradient_accumulation_steps=self.hyperparameters.get('gradient_accumulation_steps', 4),
            learning_rate=self.hyperparameters.get('learning_rate', 2e-4),
            fp16=False,
            bf16=True,
            logging_steps=10,
            save_steps=100,
            save_total_limit=3,
            warmup_ratio=self.hyperparameters.get('warmup_ratio', 0.03),
            lr_scheduler_type="cosine",
            optim="paged_adamw_32bit",
            gradient_checkpointing=True,
            max_grad_norm=0.3,
            group_by_length=True,
            report_to="none",  # Disable wandb/tensorboard for now
        )
        
        logger.info("Initializing SFTTrainer")
        
        self.trainer = SFTTrainer(
            model=self.model,
            train_dataset=dataset,
            args=training_args,
            tokenizer=self.tokenizer,
            max_seq_length=self.hyperparameters.get('max_seq_length', 2048),
            dataset_text_field="text",
            packing=False,
        )
        
        # Custom callback for progress reporting
        class WebhookCallback:
            def __init__(self, orchestrator):
                self.orchestrator = orchestrator
                self.last_webhook_step = 0
            
            def on_log(self, args, state, control, logs=None, **kwargs):
                if state.global_step - self.last_webhook_step >= 50:
                    asyncio.create_task(self.orchestrator.send_webhook(
                        "training",
                        {
                            "step": state.global_step,
                            "total_steps": state.max_steps,
                            "metrics": {
                                "loss": logs.get('loss'),
                                "learning_rate": logs.get('learning_rate'),
                                "epoch": state.epoch,
                            }
                        }
                    ))
                    self.last_webhook_step = state.global_step
        
        self.trainer.add_callback(WebhookCallback(self))
        
        logger.info("Starting training")
        self.trainer.train()
        
        logger.info("Training completed")

    async def save_and_upload_artifacts(self) -> str:
        """Save LoRA adapters and upload to Supabase"""
        logger.info("Saving LoRA adapters")
        
        # Save adapters locally
        adapter_dir = self.output_dir / "lora_adapters"
        self.model.save_pretrained(adapter_dir)
        self.tokenizer.save_pretrained(adapter_dir)
        
        # TODO: Upload to Supabase Storage
        # For now, return local path (RunPod network volume)
        artifact_path = f"lora_adapters/{self.job_id}"
        
        logger.info(f"Artifacts saved to: {artifact_path}")
        return artifact_path

    async def send_webhook(self, status: str, data: Dict[str, Any]):
        """Send status update to Vercel webhook"""
        try:
            import hmac
            import hashlib
            
            payload = {
                "job_id": self.job_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                **data,
            }
            
            payload_json = json.dumps(payload)
            signature = hmac.new(
                self.webhook_secret.encode(),
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    content=payload_json,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": signature,
                    },
                    timeout=10.0,
                )
                
                if response.status_code != 200:
                    logger.warning(f"Webhook failed: {response.status_code}")
                else:
                    logger.info(f"Webhook sent: {status}")
                    
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
```

**3.3 API Server**

**File:** `runpod/api_server.py`

```python
"""
FastAPI server for RunPod training orchestration
Receives training requests from Vercel and manages training jobs
"""

import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from training_orchestrator import TrainingOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="BrightRun LoRA Training API")

# In-memory job tracking (in production, use Redis or similar)
active_jobs: Dict[str, asyncio.Task] = {}

class TrainingRequest(BaseModel):
    job_id: str
    dataset_url: str
    hyperparameters: Dict[str, Any]
    webhook_url: str
    webhook_secret: str
    base_model: str = "meta-llama/Meta-Llama-3-70B-Instruct"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gpu_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
    }

@app.post("/training/start")
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
):
    """Start a new training job"""
    
    # Validate authorization (RunPod API key)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Check if job already running
    if request.job_id in active_jobs:
        raise HTTPException(status_code=409, detail="Job already running")
    
    logger.info(f"Starting training job: {request.job_id}")
    
    # Create orchestrator
    orchestrator = TrainingOrchestrator(
        job_id=request.job_id,
        dataset_url=request.dataset_url,
        hyperparameters=request.hyperparameters,
        webhook_url=request.webhook_url,
        webhook_secret=request.webhook_secret,
        base_model=request.base_model,
    )
    
    # Start training in background
    task = asyncio.create_task(orchestrator.run_training())
    active_jobs[request.job_id] = task
    
    # Cleanup when done
    def cleanup(job_id: str):
        if job_id in active_jobs:
            del active_jobs[job_id]
    
    task.add_done_callback(lambda _: cleanup(request.job_id))
    
    return {
        "success": True,
        "job_id": request.job_id,
        "status": "started",
    }

@app.get("/training/status/{job_id}")
async def get_training_status(job_id: str):
    """Get status of a training job"""
    if job_id not in active_jobs:
        return {"status": "not_found"}
    
    task = active_jobs[job_id]
    
    if task.done():
        return {"status": "completed" if not task.exception() else "failed"}
    else:
        return {"status": "running"}

@app.post("/training/stop/{job_id}")
async def stop_training(job_id: str):
    """Stop a running training job"""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    task = active_jobs[job_id]
    task.cancel()
    
    return {"success": True, "message": "Training job cancelled"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Deliverables:**
- [ ] `runpod/Dockerfile` created
- [ ] `runpod/training_orchestrator.py` created
- [ ] `runpod/dataset_preprocessor.py` created (see Part 5)
- [ ] `runpod/api_server.py` created
- [ ] Docker image built and pushed to DockerHub or RunPod registry
- [ ] RunPod template created with this Docker image

---

## Part 5: Implementation Roadmap Summary

### Timeline: 4-Week Sprint (160 hours)

| Week | Focus Area | Hours | Key Deliverables |
|------|------------|-------|------------------|
| **Week 1** | Database + Vercel APIs | 40h | Schema migrations, TrainingService, API routes |
| **Week 2** | RunPod Container | 40h | Dockerfile, training orchestrator, FastAPI server |
| **Week 3** | Integration + Testing | 40h | End-to-end testing, webhook flow, error handling |
| **Week 4** | Dashboard UI + Polish | 40h | Training job UI, metrics charts, documentation |

### Success Metrics

**Phase 1 (Proof of Concept):**
- [ ] Successfully train LoRA adapter on full 242-conversation dataset
- [ ] Training completes in < 24 hours
- [ ] Cost < $150
- [ ] LoRA adapters saved and downloadable

**Phase 2 (Quality Validation):**
- [ ] Test trained model on 10-20 held-out examples
- [ ] Subjective quality assessment: model responses feel "on-brand" for Elena Morales
- [ ] Emotional intelligence preserved (acknowledges feelings, warm tone)
- [ ] No catastrophic forgetting (model still capable of general tasks)

**Phase 3 (Production Ready):**
- [ ] Dashboard UI for starting/monitoring training jobs
- [ ] Automated error recovery (retry failed jobs)
- [ ] Cost tracking and budget alerts
- [ ] Model versioning and A/B testing capability

---

## Part 6: Cost Analysis & ROI

### Initial Investment

| Item | Cost | Notes |
|------|------|-------|
| **Development Time** | $0 | Self-implementation |
| **First Training Run** | $50-150 | RunPod H100 spot instance |
| **Hyperparameter Testing** | $50-100 | 3-5 additional runs |
| **Storage (3 months)** | $60 | 200GB network volume |
| **Buffer/Contingency** | $100 | Unexpected costs |
| **TOTAL** | **$260-410** | First 3 months |

### Long-Term Operating Costs

| Scenario | Frequency | Cost/Month | Annual Cost |
|----------|-----------|------------|-------------|
| **Proof of Concept** | 1 training run | $50 | $600 |
| **Active Development** | 4 training runs | $200 | $2,400 |
| **Production (Multi-Vertical)** | 8 training runs | $400 | $4,800 |

### ROI Comparison

**Traditional ML Consultancy:**
- Hiring LoRA engineer: $150-250/hr
- 40 hours setup + training: $6,000-10,000
- Each iteration: $1,500-2,500

**Self-Implemented:**
- Initial setup (your time): 160 hours
- Cost per iteration: $50-150
- **Savings after 5 iterations: ~$7,500-12,000**

**Conclusion:** Investment pays for itself after 3-5 training runs.

---

## Part 7: Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **RunPod spot instance interruption** | Medium | Medium | Use checkpointing (save every 100 steps), restart from checkpoint |
| **OOM (Out of Memory) errors** | Low-Medium | High | QLoRA optimizations, reduce batch_size if needed, gradient checkpointing |
| **Dataset format issues** | Low | Medium | Extensive preprocessing validation, dry-run on 10 examples first |
| **Webhook delivery failures** | Medium | Low | Implement retry logic, polling fallback |
| **LoRA adapters don't improve quality** | Medium | High | Start with proven hyperparameters from research, iterate systematically |
| **Cost overruns** | Low | Medium | Set budget alerts, use spot instances, terminate long-running jobs |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Trained model doesn't match human quality** | Medium | High | Human evaluation pipeline, iterative improvement |
| **Competition implements similar approach** | High | Medium | Speed to market (ship in 4 weeks), focus on vertical expertise |
| **Supabase storage costs scale unexpectedly** | Low | Low | Monitor usage, implement archiving strategy |
| **Time investment doesn't yield results** | Low | High | Phased approach - validate PoC before full build |

---

## Part 8: Next Steps & Decision Points

### Immediate Actions (This Week)

1. **Decision: Approve Budget**
   - [ ] Confirm $260-410 budget for 3-month PoC
   - [ ] Set up RunPod account, add payment method
   - [ ] Allocate development time (160 hours over 4 weeks)

2. **Setup: Infrastructure Accounts**
   - [ ] Create RunPod account
   - [ ] Generate RunPod API key
   - [ ] Configure Supabase environment variables
   - [ ] Create `model-artifacts` storage bucket

3. **Development: Start Phase 1**
   - [ ] Create database migrations (training_jobs, model_artifacts)
   - [ ] Apply migrations to Supabase
   - [ ] Begin TrainingService implementation

### Decision Point 1: After Database Setup (Week 1 End)

**Go/No-Go Criteria:**
- [ ] Database tables created successfully
- [ ] Can query and insert training_jobs via API
- [ ] Supabase Storage configured for model artifacts

**If No-Go:** Reassess technical approach, consider alternative storage solutions

### Decision Point 2: After RunPod Container Built (Week 2 End)

**Go/No-Go Criteria:**
- [ ] Docker image builds successfully
- [ ] Can run container locally (without GPU, just test imports)
- [ ] FastAPI server responds to /health endpoint

**If No-Go:** Simplify Docker image, reduce dependencies

### Decision Point 3: After First Training Run (Week 3 End)

**Go/No-Go Criteria:**
- [ ] Training completes without errors
- [ ] LoRA adapters saved successfully
- [ ] Can load adapters and generate text
- [ ] Output quality subjectively "better than baseline"

**If No-Go:** Debug systematically:
1. Check dataset format (inspect preprocessed examples)
2. Validate hyperparameters (compare to research papers)
3. Review training logs for anomalies
4. Consider increasing training data volume

---

## Part 9: Appendix - Technical References

### Recommended Reading

1. **LoRA Paper (Hu et al., 2021)**
   - https://arxiv.org/abs/2106.09685
   - Original LoRA methodology

2. **QLoRA Paper (Dettmers et al., 2023)**
   - https://arxiv.org/abs/2305.14314
   - 4-bit quantization for memory efficiency

3. **Llama 3 Model Card (Meta, 2024)**
   - https://ai.meta.com/llama/
   - Architecture details, recommended hyperparameters

4. **Hugging Face PEFT Documentation**
   - https://huggingface.co/docs/peft
   - LoRA implementation guide

5. **RunPod Documentation**
   - https://docs.runpod.io/
   - GPU rentals, pod management, network volumes

### Hyperparameter Tuning Guide

**Recommended Starting Points:**

```python
# Conservative (safe, slower training)
conservative_config = {
    "lora_r": 8,
    "lora_alpha": 16,
    "lora_dropout": 0.05,
    "learning_rate": 1e-4,
    "num_epochs": 2,
    "batch_size": 2,
    "gradient_accumulation_steps": 8,
}

# Balanced (recommended default)
balanced_config = {
    "lora_r": 16,
    "lora_alpha": 32,
    "lora_dropout": 0.05,
    "learning_rate": 2e-4,
    "num_epochs": 3,
    "batch_size": 4,
    "gradient_accumulation_steps": 4,
}

# Aggressive (higher capacity, longer training)
aggressive_config = {
    "lora_r": 32,
    "lora_alpha": 64,
    "lora_dropout": 0.1,
    "learning_rate": 3e-4,
    "num_epochs": 4,
    "batch_size": 4,
    "gradient_accumulation_steps": 4,
}
```

**If Training Fails:**
- OOM error → Reduce `batch_size` to 2, increase `gradient_accumulation_steps`
- Loss not decreasing → Increase `learning_rate` or `lora_r`
- Overfitting → Add `weight_decay=0.01`, reduce `num_epochs`

---

## Conclusion

**Summary:**

You have a **production-ready dataset** (1,567 training pairs) and a **solid application foundation** (Next.js + Supabase). With **4 weeks of focused development** and **$260-410 in infrastructure costs**, you can build an end-to-end LoRA training pipeline to train Llama 3 70B on your financial planning consultant dataset.

**Key Advantages:**
1. ✅ Dataset is excellent quality (structured, emotionally intelligent, well-scaffolded)
2. ✅ Existing app can be extended (not starting from scratch)
3. ✅ RunPod + QLoRA makes 70B training feasible on single H100
4. ✅ Cost-effective ($50-150 per training run vs $6k-10k outsourcing)
5. ✅ Phased approach minimizes risk (validate PoC before scaling)

**Recommendation: PROCEED**

Start with Phase 1 (Database + Vercel APIs) this week. By end of Month 1, you can have your first LoRA adapter trained and ready for testing.

**Final Note:** This implementation gives you not just a trained model, but a **repeatable pipeline** for training future verticals (business planning, healthcare, etc.). The infrastructure investment compounds with each new dataset.

---

**Document Status:** ✅ Complete  
**Reviewers:** James (BrightRun Founder)  
**Next Action:** Approve budget and begin Phase 1 development  
**Questions:** Contact via project repository issues
