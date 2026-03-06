# LoRA Pipeline - User Journey Document
**Version:** 1.0
**Date:** 12-16-2025
**Category:** LoRA Pipeline User Journey
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc/product/00-pipeline-seed-story.md`
- Overview Document: `pmc/product/01-pipeline-overview.md`
- User Stories: `pmc/product/02-pipeline-user-stories.md`

## Executive Summary

### Product Vision Alignment

The LoRA Training Infrastructure Module transforms Bright Run from a high-quality dataset vendor ($5k-10k sales) into a complete AI studio ($15k-30k proven solutions), enabling end-to-end training, validation, and delivery of custom Llama 3 70B LoRA models. This user journey maps the complete experience from initial discovery through iterative optimization, designed for intelligent non-technical users who understand AI basics but lack specialized GPU training expertise.

The platform eliminates the 40-hour manual GPU setup barrier, providing one-click training orchestration with real-time visibility, automatic error recovery, and systematic quality validation. Users progress through six stages that build confidence, deliver measurable value, and enable continuous improvement.

### Key User Personas Overview

**Primary Persona: AI Engineer / Technical Lead**
- Daily user responsible for configuring training jobs, monitoring progress, and delivering models
- Intermediate technical expertise (familiar with AI/ML concepts, not necessarily LoRA experts)
- Primary pain: Manual GPU setup complexity, zero visibility during training, cost unpredictability
- Desired outcome: Configure job in <10 minutes, monitor real-time progress, download validated models

**Secondary Persona: Business Owner / Founder**
- Strategic user focused on revenue growth, competitive positioning, client relationships
- Business-focused (understands AI value, not implementation details)
- Primary pain: Cannot prove dataset quality, loses deals to "show me it works" objections
- Desired outcome: Validation reports showing 40%+ improvements, premium pricing justification

**Supporting Persona: Quality Analyst / QA Team**
- Validation user responsible for model quality assurance and brand voice consistency
- Intermediate expertise (understands quality metrics, may not code)
- Primary pain: No systematic validation framework, subjective quality assessment
- Desired outcome: Automated validation suite, objective metrics, confident delivery approvals

### Journey Scope and Boundaries

**In Scope:**
- Llama 3 70B model training with QLoRA (4-bit quantization) on H100 80GB GPUs
- RunPod spot and on-demand instance orchestration with automatic checkpoint recovery
- Real-time progress monitoring with loss curves, metrics, and cost tracking
- Comprehensive validation suite (perplexity, emotional intelligence, catastrophic forgetting, brand voice)
- Model artifact management and deployment package generation
- Training comparison, optimization, and knowledge building tools
- Budget management with cost estimation, tracking, and alerts
- Team collaboration with job sharing, notifications, and configuration templates

**Out of Scope (Future Phases):**
- Other model architectures (Mistral, Falcon, Qwen)
- Multi-GPU distributed training
- Custom hyperparameter tuning UI (only presets in Phase 1)
- Automated hyperparameter optimization (grid search, Bayesian)
- Model deployment to client infrastructure (deliver adapters only)
- A/B testing framework
- Integration with external platforms (AWS SageMaker, GCP Vertex AI)

### Success Definition

**User Success Metrics:**
- AI Engineers configure training jobs in <10 minutes (vs 40 hours manual setup)
- Training success rate ≥95% on first or second attempt
- Real-time visibility into progress with <60 second update latency
- Cost predictability within ±15% of estimates
- Weekend freedom through unattended training with automatic notifications

**Quality Metrics:**
- Perplexity improvement ≥30% (baseline vs trained model)
- Emotional intelligence improvement ≥40% (empathy, clarity, appropriateness)
- Financial knowledge retention ≥95% (catastrophic forgetting prevention)
- Brand voice consistency ≥85% (Elena Morales personality alignment)

**Business Metrics:**
- First $20k trained model sale within 8 weeks of launch (vs $5k dataset sales)
- Competitive win rate 50%+ with validation reports (vs 25% without proof)
- Average training cost <$75 per run (vs $6k-10k outsourcing fees)
- 10+ training runs per month (vs 1-2 manual capacity)

### Value Progression Story for Proof-of-Concept

The user journey delivers incremental value at each stage, building confidence and demonstrating platform capabilities:

1. **Stage 1 (Discovery)**: User understands platform benefits, sees potential 3-5x revenue multiplier, recognizes ease of use
2. **Stage 2 (Configuration)**: User completes first job configuration in <10 minutes, sees accurate cost estimates, experiences simplicity vs manual setup
3. **Stage 3 (Execution)**: User monitors real-time progress, witnesses automatic error recovery, confirms cost predictability
4. **Stage 4 (Validation)**: User receives objective quality metrics (40%+ EI improvement), gains confidence in delivery
5. **Stage 5 (Delivery)**: User downloads model artifacts, generates client-ready validation reports, delivers proven solution
6. **Stage 6 (Optimization)**: User compares training runs, identifies best configurations, builds team knowledge base

Each stage reduces risk, increases confidence, and proves the platform's value proposition, culminating in a complete proof-of-concept that transforms business positioning from "data vendor" to "AI studio."

---

## User Persona Definitions

### Persona 1: Alex Chen - AI Engineer / Technical Lead

**Role and Responsibilities:**
- Configure training jobs (select datasets, choose hyperparameters, estimate costs)
- Monitor training progress (track loss curves, metrics, estimated completion)
- Handle failures (diagnose errors, retry with adjustments, checkpoint recovery)
- Download and validate model artifacts (adapters, metrics, reports)
- Generate client-ready validation reports and deployment packages

**Technical Proficiency Level:**
- Intermediate AI/ML knowledge (understands concepts like fine-tuning, loss functions, overfitting)
- Not a LoRA expert (relies on presets and guidance rather than manual hyperparameter tuning)
- Comfortable with UIs and dashboards (prefers visual interfaces over command-line tools)
- Basic understanding of GPUs and training costs (knows spot vs on-demand, but not infrastructure setup)

**Goals and Motivations:**
- Deliver high-quality trained models to clients quickly and reliably
- Minimize time spent on infrastructure setup and troubleshooting
- Gain confidence that models meet quality standards before client delivery
- Optimize training costs while maintaining model quality
- Build expertise through experimentation without wasting budget

**Pain Points and Frustrations:**
- Spends 40 hours setting up Docker + CUDA + PyTorch environments manually
- Zero visibility during 12-20 hour training runs ("is loss decreasing or is it stuck?")
- Cryptic OOM errors require guessing which hyperparameter to adjust
- Spot instance interruptions lose all progress, requiring full restart
- Cannot demonstrate measurable improvements to clients (subjective quality only)
- Weekend babysitting: must check SSH logs every few hours, no freedom to disconnect

**Success Criteria from Their Perspective:**
- Configure training job in <10 minutes with clear guidance on presets
- Monitor real-time progress with loss curves updating every 60 seconds
- Receive actionable error messages with specific fix suggestions
- Automatic checkpoint recovery succeeds 95%+ of the time despite spot interruptions
- Download validated models with confidence they meet quality thresholds
- Generate professional validation reports for client delivery

**AI Knowledge Level and Learning Preferences:**
- Understands: Fine-tuning, LoRA adapters, perplexity, loss curves, overfitting
- Needs help with: Hyperparameter selection (r, alpha, learning rate), GPU memory management, quantization techniques
- Learning style: Visual dashboards, tooltips explaining concepts, proven presets with success rates
- Prefers: "Conservative/Balanced/Aggressive" simple choices over manual hyperparameter tuning

---

### Persona 2: Maria Rodriguez - Business Owner / Founder

**Role and Responsibilities:**
- Price and sell trained model solutions (not just datasets)
- Demonstrate ROI to clients with validation reports and before/after comparisons
- Manage training budget and project profitability
- Differentiate from competitors in sales conversations
- Make strategic decisions about platform investment and feature priorities

**Technical Proficiency Level:**
- Business-focused (understands AI value proposition, not technical implementation)
- Non-technical user (does not write code or configure infrastructure)
- Comfortable with high-level metrics and executive dashboards
- Understands concepts: AI training, model quality, validation, ROI

**Goals and Motivations:**
- Grow revenue by selling $15k-30k proven models (vs $5k datasets)
- Win competitive deals by demonstrating measurable improvements (40%+ emotional intelligence)
- Control costs and maintain profitability (80%+ margins)
- Position Bright Run as "complete AI studio" not just "data vendor"
- Build client confidence through objective proof of quality

**Pain Points and Frustrations:**
- Clients ask "how do I know this dataset will work?" and cannot provide data-driven answer
- Loses deals to competitors offering complete solutions (training + validation + deployment)
- Leaves 3-5x revenue on table selling datasets when clients would pay for proven models
- Budget anxiety: unpredictable GPU costs create hesitation to invest in training
- Client risk aversion: prospects fear wasting engineering time on unproven datasets

**Success Criteria from Their Perspective:**
- Access validation reports showing ≥40% emotional intelligence improvements
- Download before/after comparison examples for sales presentations
- Accurate cost estimates (±15%) before committing to client quotes
- Track training costs per client project for profitability analysis
- Monthly budget dashboard with alerts preventing overages
- Share secure links to validation reports with 30-day expiration

**AI Knowledge Level and Learning Preferences:**
- Understands: Training improves AI, validation proves quality, metrics quantify improvements
- Needs help with: Technical jargon (perplexity, LoRA rank, quantization), infrastructure details
- Learning style: Executive summaries, visual charts, before/after comparisons, dollar amounts
- Prefers: Non-technical language, business metrics (revenue impact, cost savings, win rates)

---

### Persona 3: Dr. Sarah Kim - Quality Analyst / QA Team

**Role and Responsibilities:**
- Run validation benchmarks (perplexity, emotional intelligence, catastrophic forgetting, brand voice)
- Compare baseline vs trained model outputs on test cases
- Evaluate quality metrics and approve/reject model deliveries
- Ensure brand voice consistency (Elena Morales personality traits)
- Generate client-ready quality reports and flag regressions

**Technical Proficiency Level:**
- Intermediate expertise (understands quality metrics, statistical significance, evaluation rubrics)
- May not code (uses UI tools for validation, does not write Python scripts)
- Comfortable with data analysis and interpretation
- Knowledgeable about domain-specific quality standards (financial advisory, emotional intelligence)

**Goals and Motivations:**
- Systematically validate model quality before client delivery
- Prevent regressions and catastrophic forgetting (model "forgetting" financial knowledge)
- Ensure brand voice alignment (responses sound like Elena Morales persona)
- Provide objective, measurable proof of improvements to clients
- Build confidence that delivered models meet quality standards

**Pain Points and Frustrations:**
- No systematic validation framework (relies on ad-hoc testing of random examples)
- Subjective quality assessment ("this feels better" vs "42% improvement in empathy")
- Cannot quantify brand voice consistency (subjective personality evaluation)
- Fear of delivering models with regressions (worse than baseline on some scenarios)
- Manual testing on 5-10 examples doesn't prove quality across all use cases

**Success Criteria from Their Perspective:**
- Run automated validation suite with 50+ test scenarios
- Review objective metrics (perplexity ≥30% improvement, EI ≥40% improvement, retention ≥95%)
- Compare baseline vs trained model outputs side-by-side
- Evaluate brand voice consistency (≥85% alignment with Elena Morales rubric)
- Flag regressions before delivery (scenarios where trained model scores worse than baseline)
- Export comprehensive validation report as client-ready PDF

**AI Knowledge Level and Learning Preferences:**
- Understands: Model evaluation, test datasets, quality metrics, statistical significance
- Needs help with: Technical training details (hyperparameters, loss functions, quantization)
- Learning style: Dashboards with clear metrics, side-by-side comparisons, visual charts
- Prefers: Objective scores (percentages, 1-5 scales), example-based validation, regression alerts

---

## Journey Stages Organized by Section

### Stage Organization Principles

The user journey is organized into six progressive stages that optimize both user experience and development efficiency:

**Early Stages (1-2):** Deliver immediate value with minimal investment
- Demonstrate platform simplicity and ease of use
- Build confidence through clear guidance and accurate estimates
- Require no prior GPU training expertise
- Prove concept viability quickly (first job in <10 minutes)

**Middle Stages (3-4):** Introduce progressive complexity while maintaining momentum
- Real-time visibility reduces anxiety and builds trust
- Automatic error recovery demonstrates reliability
- Quality validation provides objective proof of success
- User engagement sustained through measurable progress

**Later Stages (5-6):** Deliver maximum value and sophisticated capabilities
- Complete model delivery with client-ready artifacts
- Professional validation reports enable premium pricing
- Optimization tools support continuous improvement
- Team knowledge base amplifies organizational learning

---

## 1. Discovery & Training Readiness

### 1.1 Platform Introduction & Value Proposition

#### UJ1.1.1: Understanding Training Infrastructure Benefits
* **Description**: User learns about the LoRA Training Infrastructure platform, understands how it transforms dataset sales into proven AI solutions, and recognizes the 3-5x revenue multiplier opportunity
* **Impact Weighting**: Strategic Growth / Revenue Impact
* **Priority**: High
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A business owner or AI engineer hearing about the platform for the first time
  - WHEN: They review the platform introduction materials (landing page, demo video, onboarding wizard)
  - THEN: They understand the core value proposition (one-click training, automated validation, proven models)
  - AND: They recognize the business impact ($5k datasets → $15k-30k models, competitive differentiation)
  - AND: They see concrete benefits (40+ hours saved vs manual setup, 95%+ success rate, ±15% cost predictability)
  - AND: They feel confident the platform is accessible to non-experts (clear presets, guided workflows)

**Technical Notes**: Onboarding materials should emphasize simplicity, cost efficiency, and quality proof

**Data Requirements**: Case studies, before/after metrics, cost comparisons, success rates

**Error Scenarios**: User overwhelmed by technical jargon → Use non-technical language, visual comparisons, dollar amounts

**Performance Criteria**: Onboarding materials load in <2 seconds, demo video <3 minutes duration

**User Experience Notes**: Avoid technical terminology (LoRA rank, quantization, VRAM); focus on outcomes (faster, cheaper, proven quality)

---

#### UJ1.1.2: Exploring Platform Capabilities
* **Description**: User explores the training dashboard, views sample training jobs, and understands the end-to-end workflow from configuration to validation report delivery
* **Impact Weighting**: Ease of Use / User Confidence
* **Priority**: High
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A new user accessing the training dashboard for the first time
  - WHEN: They navigate through the platform interface (job list, configuration form, sample job details)
  - THEN: They see a clear workflow overview (Configure → Train → Validate → Deliver)
  - AND: They view sample completed jobs with metrics (loss curves, quality scores, validation reports)
  - AND: They understand the time investment (<10 min configuration, 12-20 hour training, automated validation)
  - AND: They recognize cost transparency (estimates before start, real-time tracking, monthly budget controls)
  - AND: They feel confident they can complete their first training run successfully

**Technical Notes**: Dashboard should provide demo/sample data for new users to explore without creating real jobs

**Data Requirements**: Sample training jobs with realistic metrics, example validation reports

**Error Scenarios**: User unsure where to start → Provide "Start Your First Training" wizard with step-by-step guidance

**Performance Criteria**: Dashboard loads in <3 seconds, sample jobs display immediately

**User Experience Notes**: Highlight success indicators (95% success rate), reassure users about automatic error recovery

---

### 1.2 Training Dataset Review & Readiness

#### UJ1.2.1: Reviewing Available Training Files
* **Description**: User views available training files in the system, understands training file metadata (conversation count, quality scores, scaffolding distribution), and selects appropriate datasets for training objectives
* **Impact Weighting**: User Confidence / Quality Assurance
* **Priority**: High
* **User Stories**: US1.1.1 (Create Training Job from Training File)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user ready to start their first training job
  - WHEN: They navigate to the training file selection screen
  - THEN: They see a list of available training files with key metadata:
    - File name (e.g., "Elena Morales Financial Advisory - 242 Conversations")
    - Conversation count (242 conversations, 1,567 training pairs)
    - Quality scores (average empathy: 4.5/5, clarity: 4.3/5, appropriateness: 4.6/5)
    - Scaffolding distribution (personas, emotional arcs, training topics)
    - Human review status (15% human-reviewed, 85% AI-generated with validation)
  - AND: They understand which datasets are ready for training (enriched, validated, formatted)
  - AND: They can filter by quality thresholds, conversation count, or topic categories
  - AND: They preview sample conversations from the training file before selecting

**Technical Notes**: Training files must be in enriched status with valid Supabase Storage paths

**Data Requirements**: Training file metadata from `training_files` table, conversation samples

**Error Scenarios**: No training files available → Display "Upload Training File" guidance; Training file not enriched → Show "Enrichment in progress" status

**Performance Criteria**: Training file list loads in <2 seconds, metadata displays immediately

**User Experience Notes**: Use visual quality indicators (✓ High Quality, ⚠ Review Recommended) instead of raw scores

---

#### UJ1.2.2: Understanding Training File Quality Metrics
* **Description**: User comprehends training file quality metrics, recognizes how quality scores impact training outcomes, and selects high-quality datasets for optimal model performance
* **Impact Weighting**: Quality Assurance / User Education
* **Priority**: Medium
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing training file quality scores
  - WHEN: They hover over or click quality metrics for explanation
  - THEN: They see tooltips explaining each metric in simple terms:
    - Empathy Score: "How well conversations recognize and validate emotions (1-5 scale, target ≥4.0)"
    - Clarity Score: "How clear and understandable the advice is (1-5 scale, target ≥4.0)"
    - Appropriateness Score: "How well responses match the emotional situation (1-5 scale, target ≥4.0)"
    - Brand Voice: "Alignment with Elena Morales personality traits (target ≥85%)"
  - AND: They understand the impact: "Higher quality training data → Better model performance → Higher client satisfaction"
  - AND: They see recommended thresholds: "For production models, use datasets with all scores ≥4.0"
  - AND: They can compare quality metrics across multiple training files

**Technical Notes**: Tooltips should use plain language, avoid technical jargon

**Data Requirements**: Quality score definitions, recommended thresholds, quality-to-outcome correlations

**Error Scenarios**: User selects low-quality dataset → Warning: "This dataset has empathy scores below 4.0, which may affect model quality. Consider using a higher-quality dataset."

**Performance Criteria**: Tooltip displays instantly on hover, no loading delay

**User Experience Notes**: Use color coding (green ≥4.0, yellow 3.5-3.9, red <3.5) for quick visual assessment

---

### 1.3 Cost & Budget Awareness

#### UJ1.3.1: Understanding Training Costs
* **Description**: User learns about training costs (GPU hourly rates, spot vs on-demand pricing, typical job costs), understands cost drivers (epochs, batch size, dataset size), and sets realistic budget expectations
* **Impact Weighting**: Cost Transparency / Budget Planning
* **Priority**: High
* **User Stories**: US1.2.1 (Real-Time Cost Estimation), US1.3.1 (Understanding Training Costs)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user planning their first training run
  - WHEN: They review cost information in the platform
  - THEN: They understand GPU pricing:
    - Spot instances: $2.49/hr H100 PCIe 80GB (50-80% cheaper, 10-30% interruption risk, automatic recovery)
    - On-demand instances: $7.99/hr H100 PCIe 80GB (guaranteed completion, no interruptions)
  - AND: They see typical job costs with ranges:
    - Conservative preset: 8-10 hours, $25-30 (spot) or $80-120 (on-demand)
    - Balanced preset: 12-15 hours, $50-60 (spot) or $120-140 (on-demand)
    - Aggressive preset: 18-20 hours, $80-100 (spot) or $200-240 (on-demand)
  - AND: They understand cost drivers: "More epochs = longer training = higher cost; Larger datasets = more processing = higher cost"
  - AND: They recognize cost optimization strategies: "Use spot instances for 70% savings; Conservative preset for fastest/cheapest first tests"
  - AND: They set monthly budget expectations: "Typical usage: 5-10 jobs/month = $250-500/month on spot instances"

**Technical Notes**: Cost estimates should be conservative (slightly high) to avoid negative surprises

**Data Requirements**: Historical job costs, GPU pricing, spot interruption rates, preset-specific averages

**Error Scenarios**: User fears high costs → Emphasize spot instance savings, show cost controls (budget limits, alerts)

**Performance Criteria**: Cost information displays immediately, no calculation delay

**User Experience Notes**: Show cost savings prominently ("Save $90 with spot instances"), use dollar amounts not percentages alone

---

#### UJ1.3.2: Setting Monthly Budget Limits
* **Description**: User configures monthly training budget limits, understands budget alerts and controls, and gains confidence that costs won't exceed expectations
* **Impact Weighting**: Budget Control / Risk Mitigation
* **Priority**: High
* **User Stories**: US7.2.1 (Monthly Budget Dashboard), US7.2.2 (Budget Alerts & Notifications)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A new user setting up their account for training
  - WHEN: They configure budget settings (or during onboarding wizard)
  - THEN: They set a monthly budget limit (default: $500, customizable)
  - AND: They configure alert thresholds:
    - 80% alert (email): "Warning: You've used 80% of monthly budget ($400 of $500)"
    - 95% alert (email + Slack): "Urgent: You've used 95% of monthly budget ($475 of $500)"
    - 100% block: "Budget exceeded. Approve override to continue or wait until next month."
  - AND: They understand budget reset period (calendar month or rolling 30 days)
  - AND: They preview budget forecast: "With your typical usage (8 jobs/month at $50 avg), you'll spend ~$400/month"
  - AND: They feel reassured: "Budget controls prevent surprise bills. You'll receive alerts before exceeding limits."

**Technical Notes**: Budget checks occur before job creation, prevent new jobs if limit exceeded without override

**Data Requirements**: User's monthly spending, active job costs, forecasted spending

**Error Scenarios**: User sets unrealistic budget ($50/month) → Warning: "This budget allows only 1 training job. Recommended minimum: $250/month for regular use."

**Performance Criteria**: Budget settings save instantly, alerts trigger within 60 seconds of threshold crossing

**User Experience Notes**: Provide budget recommendations based on typical usage patterns (beginners: $250/month, active teams: $500-1000/month)

---

## 2. Training Job Configuration & Initiation

### 2.1 Dataset Selection & Configuration

#### UJ2.1.1: Selecting Training Dataset
* **Description**: User selects a training file from available datasets, reviews dataset characteristics (conversation count, quality scores, topic distribution), and confirms dataset suitability for training objectives
* **Impact Weighting**: Ease of Use / Quality Assurance
* **Priority**: High
* **User Stories**: US1.1.1 (Create Training Job from Training File)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user ready to configure their first training job
  - WHEN: They click "Create New Training Job" and reach the dataset selection step
  - THEN: They see a dropdown or card grid of available training files, each displaying:
    - Training file name
    - Conversation count (e.g., "242 conversations, 1,567 training pairs")
    - Average quality scores (empathy: 4.5/5, clarity: 4.3/5, appropriateness: 4.6/5)
    - Topic distribution preview (retirement planning: 35%, tax strategies: 25%, investing: 20%, insurance: 20%)
    - Dataset size indicator (small <100 conversations, medium 100-300, large >300)
  - AND: They can preview 3-5 sample conversations from each dataset
  - AND: They see a recommended indicator: "✓ Recommended for Production" for high-quality datasets
  - AND: Upon selection, the form pre-populates with dataset metadata
  - AND: The system validates dataset readiness (enriched, formatted, accessible in storage)

**Technical Notes**: Query `training_files` table for enriched files with valid storage paths

**Data Requirements**: Training file metadata, sample conversations, quality score aggregations

**Error Scenarios**: Selected dataset not enriched → Error: "Dataset enrichment in progress. Estimated completion: 10 minutes."; Dataset file missing from storage → Error: "Dataset file not found. Contact support."

**Performance Criteria**: Dataset list loads in <2 seconds, sample conversations display in <1 second

**User Experience Notes**: Default to most recently created high-quality dataset, highlight "production-ready" status clearly

---

#### UJ2.1.2: Understanding Dataset Impact on Training
* **Description**: User understands how dataset characteristics (size, quality, diversity) affect training outcomes, duration, and cost
* **Impact Weighting**: User Education / Quality Assurance
* **Priority**: Medium
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user selecting a training dataset
  - WHEN: They review dataset characteristics with contextual help
  - THEN: They see explanations of dataset impact:
    - "Larger datasets (300+ conversations) → Longer training times (15-20 hours) but better generalization"
    - "Higher quality scores (≥4.5) → Better model outputs with less overfitting"
    - "Diverse topic distribution → Model handles broader range of scenarios effectively"
    - "Emotional arc coverage → Better emotional intelligence in responses"
  - AND: They understand recommended dataset sizes:
    - Minimum: 100 conversations for basic training
    - Recommended: 200-300 conversations for production models
    - Optimal: 300+ conversations for maximum quality
  - AND: They see quality-to-outcome predictions: "This high-quality dataset (avg 4.5/5) typically produces 40%+ emotional intelligence improvements"

**Technical Notes**: Dataset impact predictions based on historical training results correlation

**Data Requirements**: Historical training outcomes by dataset size/quality ranges

**Error Scenarios**: User selects very small dataset (<50 conversations) → Warning: "Small datasets may not produce reliable models. Recommended minimum: 100 conversations."

**Performance Criteria**: Contextual help displays instantly on hover/click

**User Experience Notes**: Use visual indicators (📊 size, ⭐ quality, 🎯 diversity) for quick comprehension

---

### 2.2 Hyperparameter Preset Selection

#### UJ2.2.1: Choosing Training Configuration Preset
* **Description**: User selects from proven hyperparameter presets (Conservative, Balanced, Aggressive) based on their objectives (speed, quality, cost), understands tradeoffs, and feels confident in their choice
* **Impact Weighting**: Ease of Use / Success Rate
* **Priority**: High
* **User Stories**: US1.1.2 (Select Hyperparameter Preset)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user configuring hyperparameters for their training job
  - WHEN: They reach the preset selection step
  - THEN: They see three clear preset options displayed as radio cards:
    - **Conservative Preset**:
      - Label: "Conservative - Fast & Cost-Effective"
      - Description: "Best for: First training runs, high-quality seed datasets, cost optimization"
      - Hyperparameters: r=8, lr=1e-4, epochs=2, batch_size=4
      - Duration: 8-10 hours
      - Cost: $25-30 (spot) / $80-120 (on-demand)
      - Risk level: Low (⭐⭐⭐⭐⭐ 98% success rate)
    - **Balanced Preset** (Recommended):
      - Label: "Balanced - Production Quality" [Default Selection]
      - Description: "Best for: Production models, proven quality, most use cases"
      - Hyperparameters: r=16, lr=2e-4, epochs=3, batch_size=2
      - Duration: 12-15 hours
      - Cost: $50-60 (spot) / $120-140 (on-demand)
      - Risk level: Medium (⭐⭐⭐⭐ 96% success rate)
    - **Aggressive Preset**:
      - Label: "Aggressive - Maximum Quality"
      - Description: "Best for: Complex datasets, experimentation, when quality is paramount"
      - Hyperparameters: r=32, lr=3e-4, epochs=4, batch_size=1
      - Duration: 18-20 hours
      - Cost: $80-100 (spot) / $200-240 (on-demand)
      - Risk level: Higher (⭐⭐⭐ 92% success rate)
  - AND: They see a preset comparison table highlighting differences
  - AND: They can access "Learn More" tooltips explaining each hyperparameter in simple terms
  - AND: Upon selection, cost and duration estimates update immediately
  - AND: They receive a recommendation: "For this dataset size (242 conversations), Balanced preset is recommended"

**Technical Notes**: Default to Balanced preset, highlight with "(Recommended)" badge

**Data Requirements**: Historical success rates per preset, typical duration/cost ranges

**Error Scenarios**: User confused by hyperparameters → Tooltips explain: "LoRA rank (r): Higher values = more model capacity but longer training; Learning rate: How quickly the model learns"

**Performance Criteria**: Preset selection updates cost estimates in <500ms

**User Experience Notes**: Avoid technical jargon in main descriptions, provide expandable "Technical Details" section for interested users

---

#### UJ2.2.2: Understanding Hyperparameter Tradeoffs
* **Description**: User comprehends the tradeoffs between presets (speed vs quality, cost vs performance), makes informed decisions aligned with their objectives, and understands when to use each preset
* **Impact Weighting**: User Education / Cost Optimization
* **Priority**: Medium
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing hyperparameter preset options
  - WHEN: They explore preset details and comparisons
  - THEN: They understand the quality tradeoff:
    - Conservative: "Fastest, cheapest, good quality (typical 30% perplexity improvement)"
    - Balanced: "Optimal quality/cost ratio (typical 35% perplexity improvement)"
    - Aggressive: "Maximum quality, longer/expensive (typical 40% perplexity improvement)"
  - AND: They understand when to use each preset:
    - Conservative: "First time training this dataset; Quick iteration testing; Budget-constrained projects"
    - Balanced: "Client deliveries; Production models; Most common use case"
    - Aggressive: "Complex datasets; Experimentation; When client demands maximum quality"
  - AND: They see cost-benefit comparison: "Balanced costs 2x Conservative but delivers 15% better quality; Aggressive costs 3x Conservative for 25% better quality"
  - AND: They understand risk differences: "Conservative has 98% success rate vs Aggressive 92% (more prone to overfitting)"

**Technical Notes**: Provide visual comparison chart showing quality vs cost vs duration

**Data Requirements**: Historical quality outcomes by preset, cost-to-quality ratios

**Error Scenarios**: User selects Aggressive for simple dataset → Recommendation: "This dataset may not require Aggressive preset. Balanced likely sufficient for optimal results."

**Performance Criteria**: Comparison chart renders in <1 second

**User Experience Notes**: Use visual scales (💰 cost, ⏱ duration, ⭐ quality) for intuitive comparison

---

### 2.3 GPU Selection & Cost Optimization

#### UJ2.3.1: Choosing Spot vs On-Demand GPU Instances
* **Description**: User understands the difference between spot and on-demand GPU instances, evaluates the cost vs reliability tradeoff, and selects the appropriate option based on their timeline and risk tolerance
* **Impact Weighting**: Cost Efficiency / Risk Management
* **Priority**: High
* **User Stories**: US1.1.3 (Select GPU Type with Cost Comparison)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user configuring GPU settings for their training job
  - WHEN: They reach the GPU selection step
  - THEN: They see two clear options presented as toggle or radio buttons:
    - **Spot Instances** (Default):
      - Price: $2.49/hr (H100 PCIe 80GB)
      - Savings: 70% cheaper than on-demand
      - Reliability: 10-30% chance of interruption
      - Recovery: Automatic checkpoint recovery <10 minutes
      - Success rate: 95%+ (despite interruptions)
      - Recommended for: "Non-urgent training, cost optimization, most use cases"
    - **On-Demand Instances**:
      - Price: $7.99/hr (H100 PCIe 80GB)
      - Guarantee: No interruptions, predictable completion
      - Reliability: 100% uptime
      - Recommended for: "Client deadlines, critical deliveries, time-sensitive projects"
  - AND: They see cost comparison for their specific configuration:
    - "Estimated cost with Spot: $50-60 (12-15 hours)"
    - "Estimated cost with On-Demand: $120-140 (12-15 hours)"
    - "Savings with Spot: $70 (58% cheaper)"
  - AND: They understand interruption risk mitigation: "Spot interruptions automatically recovered via checkpoints. Your training won't fail—it will just pause briefly and resume."
  - AND: They see historical interruption data: "Last 30 days: 18% of spot jobs interrupted, all recovered successfully"

**Technical Notes**: Default to spot instances, require confirmation for on-demand selection

**Data Requirements**: Current GPU pricing, historical spot interruption rates, recovery success rates

**Error Scenarios**: User selects on-demand without understanding spot → Confirmation: "On-demand costs $70 more. Most users prefer spot instances with automatic recovery. Continue with on-demand?"

**Performance Criteria**: Cost comparison updates instantly when toggling spot/on-demand

**User Experience Notes**: Emphasize spot reliability ("95%+ success rate") to overcome user hesitation about interruptions

---

#### UJ2.3.2: Understanding Cost Estimates & Accuracy
* **Description**: User views real-time cost and duration estimates that update as they adjust configuration, understands estimate accuracy (±15%), and sets realistic expectations for actual costs
* **Impact Weighting**: Cost Transparency / User Confidence
* **Priority**: High
* **User Stories**: US1.2.1 (Real-Time Cost Estimation)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user configuring a training job
  - WHEN: They adjust any configuration parameter (preset, GPU type, dataset)
  - THEN: The cost estimate panel updates in real-time (< 500ms) showing:
    - Estimated duration: "12-15 hours"
    - Estimated cost: "$50-60" (spot) or "$120-140" (on-demand)
    - Cost breakdown: "GPU compute: $48, Storage: $2, Estimated total: $50"
  - AND: They see accuracy disclaimer: "Estimates based on historical data, typically ±15% accurate"
  - AND: They understand what affects cost:
    - "More epochs → Longer training → Higher cost"
    - "Larger datasets → More processing → Higher cost"
    - "Spot interruptions add ~5-10% overhead for recovery"
  - AND: They see historical accuracy metric: "Past estimates for Balanced preset: ±12% average variance"
  - AND: They can compare scenarios: "If you reduce from 3 epochs to 2 epochs, estimated cost drops to $35-40 (-30%)"

**Technical Notes**: Calculation formula: (dataset_size × epochs × avg_time_per_epoch) × gpu_hourly_rate + overhead

**Data Requirements**: Historical training durations by dataset size/preset, GPU pricing, interruption overhead

**Error Scenarios**: Estimate significantly exceeds budget → Warning: "This configuration costs $85, which is 85% of your remaining monthly budget ($100). Consider Conservative preset ($30) or adjust budget limit."

**Performance Criteria**: Cost updates in <500ms after parameter change

**User Experience Notes**: Show cost ranges (min-max) not single point estimates to set realistic expectations

---

### 2.4 Job Metadata & Documentation

#### UJ2.4.1: Adding Job Name and Description
* **Description**: User adds descriptive job name, optional description, and notes to document the training run purpose and expected outcomes
* **Impact Weighting**: Organization / Knowledge Sharing
* **Priority**: Medium
* **User Stories**: US1.3.1 (Add Job Metadata & Documentation)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user finalizing their training job configuration
  - WHEN: They reach the job metadata step
  - THEN: They see a job name field (required, 3-100 characters) pre-populated with: "[Dataset Name] - [Preset] - [Date]" (e.g., "Elena Morales Financial - Balanced - 2025-12-16")
  - AND: They can customize the job name to be more descriptive (e.g., "Acme Financial Q1 2025 - Production Model")
  - AND: They see an optional description field (500 character limit) with placeholder: "Document the purpose of this training run (e.g., 'Client delivery for Acme Financial, focusing on retirement planning scenarios')"
  - AND: They see an optional notes field (2000 character limit) with placeholder: "Experimental notes, hypothesis, configuration rationale (e.g., 'Testing Balanced preset on high-emotion dataset to improve empathy scores')"
  - AND: They can add tags (production, experiment, client-delivery, test) for easy filtering later
  - AND: They can assign the job to a client/project for cost tracking (dropdown: existing clients or create new)

**Technical Notes**: Job name uniqueness not enforced (allow duplicate names with different IDs)

**Data Requirements**: Client/project list for assignment dropdown

**Error Scenarios**: Job name too short → Validation error: "Job name must be at least 3 characters"

**Performance Criteria**: Metadata fields save instantly as user types (auto-save draft)

**User Experience Notes**: Encourage documentation without requiring it; emphasize value: "Notes help you remember context when reviewing results later or sharing with team"

---

#### UJ2.4.2: Reviewing Configuration Summary Before Start
* **Description**: User reviews a complete configuration summary with cost estimates and warnings before final confirmation, catches potential mistakes, and proceeds with confidence
* **Impact Weighting**: Risk Mitigation / User Confidence
* **Priority**: High
* **User Stories**: US1.3.2 (Review Configuration Before Start)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user who has completed all configuration steps
  - WHEN: They click "Review & Start Training"
  - THEN: A full-screen confirmation modal displays with complete configuration summary:
    - **Training Dataset**:
      - File name, conversation count, quality scores, topic distribution
    - **Hyperparameters**:
      - Preset name (Conservative/Balanced/Aggressive)
      - Technical details: r=16, lr=2e-4, epochs=3, batch_size=2, gradient_accumulation_steps=2
    - **GPU Configuration**:
      - GPU type: H100 PCIe 80GB
      - Pricing tier: Spot ($2.49/hr) or On-Demand ($7.99/hr)
      - Interruption risk: 10-30% (spot) with automatic recovery
    - **Cost Estimate**:
      - Duration: 12-15 hours
      - Cost: $50-60 (estimated ±15%)
      - Budget impact: "This job costs $55 estimated. Current monthly spend: $250. Remaining budget after this job: $195."
    - **Warnings** (if any):
      - "⚠ This job will use 55% of your remaining budget. Monitor costs closely."
      - "⚠ Aggressive preset has higher OOM error risk. Consider Balanced preset."
  - AND: They see a confirmation checklist:
    - ☐ I have reviewed the configuration
    - ☐ I understand the estimated cost ($50-60)
    - ☐ I have budget approval if required
  - AND: The "Start Training" button is disabled until all checkboxes are checked
  - AND: They have options: "Edit Configuration" (go back) / "Cancel" (abort) / "Start Training" (proceed)
  - AND: Upon clicking "Start Training", the job status changes to "queued" and GPU provisioning begins

**Technical Notes**: Configuration summary should be read-only (no inline editing); edits require returning to configuration form

**Data Requirements**: Complete job configuration, current monthly spending, budget calculations

**Error Scenarios**: Budget exceeded → Error: "Estimated cost ($85) exceeds remaining monthly budget ($50). Increase budget limit or adjust configuration."; Missing required fields → Error: "Please complete all required fields before starting."

**Performance Criteria**: Summary modal renders in <1 second with all calculations complete

**User Experience Notes**: Checklist ensures users acknowledge cost commitment before proceeding; prominent "Edit Configuration" option encourages catching mistakes

---

## 3. Training Execution & Progress Monitoring

### 3.1 Job Launch & Initial Setup

#### UJ3.1.1: GPU Provisioning & Training Initialization
* **Description**: User confirms training job start, observes GPU provisioning status, and receives confirmation that training has successfully begun
* **Impact Weighting**: User Confidence / System Reliability
* **Priority**: High
* **User Stories**: US2.1.1 (Live Training Progress Dashboard), US2.1.2 (Training Stage Indicators)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user who has clicked "Start Training" and completed confirmation
  - WHEN: The system initiates the training job
  - THEN: They see immediate feedback:
    - Job status updates from "pending" to "provisioning"
    - Notification: "Training job created successfully. Job ID: job_abc123"
    - Redirect to job details page showing real-time status
  - AND: They see provisioning stage indicator:
    - "🔄 Provisioning GPU..." (estimated 2-5 minutes)
    - Status messages update in real-time:
      - "Requesting H100 spot instance from RunPod..."
      - "GPU allocated: H100 PCIe 80GB (spot)"
      - "Starting Docker container..."
      - "Loading training environment..."
  - AND: Once provisioning completes, status updates to "preprocessing"
  - AND: They receive email notification: "Your training job 'Acme Financial Q1 2025' has started. Monitor progress: [Dashboard Link]"
  - AND: Estimated start time is accurate: "Training will begin in approximately 3 minutes"

**Technical Notes**: Call RunPod API to provision GPU, receive runpod_job_id, poll for container startup

**Data Requirements**: Job ID, RunPod API response, GPU allocation status

**Error Scenarios**: GPU provisioning fails → See UJ3.3.1 (GPU Provisioning Error Handling); Provisioning timeout (>10 minutes) → Alert user with retry option

**Performance Criteria**: Job creation completes in <3 seconds, provisioning updates poll every 5 seconds

**User Experience Notes**: Provide reassuring messages during wait: "GPU provisioning typically completes in 2-5 minutes"; Show spinning loader animation; Display queue position if waiting: "Position in queue: 2 of 3"

---

### 3.2 Real-Time Progress Dashboard & Metrics

#### UJ3.2.1: Viewing Live Loss Curves

* **Description**: User monitors live loss curves showing training and validation loss decreasing over time, confirming that the model is learning effectively
* **Impact Weighting**: User Confidence / Transparency / Quality Assurance
* **Priority**: High
* **User Stories**: US2.1.1 (Live Training Progress Dashboard)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user monitoring an active training job
  - WHEN: They view the progress dashboard
  - THEN: They see a live graph displaying training loss and validation loss over time
  - AND: The graph updates automatically every 60 seconds with new data points
  - AND: They can zoom in to examine specific time periods or training steps
  - AND: They see clear visual confirmation that loss is decreasing (model is learning)
  - AND: They can toggle between training loss view, validation loss view, or both overlaid
  - AND: Loss values are displayed with clear labels (current: 0.342, starting: 1.523, change: -77%)

**Technical Notes**: Loss curves must update via polling or websocket connection with <60 second latency

**Data Requirements**: Training step number, training loss, validation loss, timestamps

**Error Scenarios**: No loss data available → Display "Waiting for training data..." message; Loss increasing → Warning indicator: "Loss increasing - possible training issue"

**Performance Criteria**: Graph renders in <2 seconds, updates without full page refresh

**User Experience Notes**: Use color coding (green = decreasing loss, red = increasing loss) for intuitive understanding

---

#### UJ3.2.2: Understanding Current Training Metrics

* **Description**: User views real-time metrics (current loss, learning rate, GPU utilization, perplexity) and understands what these numbers mean for training health
* **Impact Weighting**: User Education / Transparency / Confidence
* **Priority**: High
* **User Stories**: US2.1.1 (Live Training Progress Dashboard)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user viewing the training dashboard
  - WHEN: They look at the metrics panel
  - THEN: They see current training metrics displayed clearly:
    - Training loss: 0.342 (with trend indicator ↓ from 0.389)
    - Validation loss: 0.358 (with trend indicator ↓ from 0.412)
    - Learning rate: 0.000182 (current schedule value)
    - GPU utilization: 87% (healthy range 75-95%)
    - Current perplexity: 1.43 (if available)
  - AND: Each metric has a tooltip explaining what it means in simple terms
  - AND: They see visual health indicators (green = good, yellow = attention needed, red = problem)
  - AND: Metrics update in real-time every 60 seconds
  - AND: Historical comparison shows improvement over time

**Technical Notes**: Tooltips should explain technical concepts in accessible language

**Data Requirements**: Real-time metrics from training script, historical baselines for comparison

**Error Scenarios**: Metrics unavailable → Display last known values with timestamp; Anomalous values (GPU utilization <50%) → Warning indicator

**Performance Criteria**: Metrics display updates in <1 second, no page flicker

**User Experience Notes**: Tooltips example - "Training loss: Measures how well the AI predicts responses. Lower is better. Target: <0.5"

---

#### UJ3.2.3: Tracking Training Progress Percentage

* **Description**: User sees overall progress percentage, current step out of total steps, current epoch, and estimated time remaining, providing clear completion expectations
* **Impact Weighting**: User Experience / Planning / Anxiety Reduction
* **Priority**: High
* **User Stories**: US2.1.1 (Live Training Progress Dashboard)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user checking on training progress
  - WHEN: They view the progress header
  - THEN: They see a prominent progress indicator showing:
    - Overall progress: 42% complete (visual progress bar)
    - Current step: 850 of 2,000 steps
    - Current epoch: 2 of 3 epochs
    - Elapsed time: 6 hours 23 minutes
    - Estimated remaining: 8 hours 15 minutes (updates based on actual speed)
    - Projected completion: Tomorrow at 2:30 AM PST
  - AND: Progress bar fills proportionally and updates in real-time
  - AND: Estimated remaining time becomes more accurate as training progresses
  - AND: They can set their expectations for when to check back or expect completion

**Technical Notes**: Remaining time calculation based on moving average of recent step times

**Data Requirements**: Total steps, completed steps, average step duration, current epoch, total epochs

**Error Scenarios**: Progress stalled (same percentage for >30 minutes) → Warning: "Training appears stalled"

**Performance Criteria**: Progress updates every 60 seconds, calculations complete in <100ms

**User Experience Notes**: Display friendly completion times: "Tonight at 11:30 PM" instead of "23:30:00"

---

#### UJ3.2.4: Monitoring Cost Accumulation

* **Description**: User watches real-time cost accumulation during training, compares to initial estimate, and decides whether to continue or cancel based on budget concerns
* **Impact Weighting**: Cost Transparency / Budget Control / User Empowerment
* **Priority**: High
* **User Stories**: US7.1.1 (Live Cost Accumulation Display), US7.1.2 (Cost vs Time Remaining Projection)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user monitoring an active training job
  - WHEN: They view the cost tracker on the dashboard
  - THEN: They see real-time cost information:
    - Estimated cost: $50-60 (original estimate)
    - Current spend: $22.18 (actual cost so far)
    - Progress: 49% of estimate spent
    - Projected final cost: $47.32 (within estimate range)
    - Hourly rate: $2.49/hr (spot instance)
  - AND: Cost updates automatically every 60 seconds
  - AND: Visual indicator shows cost status (green: under budget, yellow: approaching estimate, red: over estimate)
  - AND: They see cost breakdown (GPU: $21.00, interruption overhead: $1.18, storage: $0.00)
  - AND: They can make informed decision to continue or cancel if cost is concerning

**Technical Notes**: Cost calculation: (elapsed_hours × gpu_hourly_rate) + interruption_overhead

**Data Requirements**: Elapsed time, GPU hourly rate, spot interruption count, estimated cost

**Error Scenarios**: Cost exceeds estimate → Warning: "Cost is 15% over estimate. Consider cancelling."; Budget will be exceeded → Critical warning

**Performance Criteria**: Cost updates in <1 second, calculations accurate to 2 decimal places

**User Experience Notes**: Prominent "Cancel Job" button available if user wants to stop due to cost concerns

---

#### UJ3.2.5: Reviewing Event Log for Training Activity

* **Description**: User reviews chronological event log showing all training milestones, metric updates, warnings, and errors with timestamps for detailed monitoring
* **Impact Weighting**: Debugging / Transparency / Advanced Users
* **Priority**: Medium
* **User Stories**: US2.1.3 (Webhook Event Log)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user wanting detailed information about training activity
  - WHEN: They click the "Event Log" tab on the job details page
  - THEN: They see a chronological list of all training events:
    - "14:23:42 | Status | Training started (GPU: H100 PCIe 80GB spot)"
    - "14:28:15 | Metrics | Step 100: loss=0.521, lr=0.0002, gpu_util=89%"
    - "14:33:08 | Warning | GPU utilization dropped to 45%"
    - "15:12:33 | Error | Spot instance interrupted, initiating recovery"
  - AND: Events are color-coded by type (blue: status, green: metrics, yellow: warnings, red: errors)
  - AND: They can filter events by type (all, status, metrics, warnings, errors)
  - AND: They can expand event rows to see full technical details and webhook payload
  - AND: They can search the log for specific keywords
  - AND: New events appear automatically in real-time

**Technical Notes**: Event log stored in database, paginated display (50 events per page)

**Data Requirements**: Event type, timestamp, message, payload (JSON), job_id

**Error Scenarios**: Log too large → Pagination required; No events yet → Display "Waiting for training events..."

**Performance Criteria**: Log page loads in <2 seconds, search results in <1 second

**User Experience Notes**: Most users won't need event log - designed for power users and troubleshooting

---

### 3.3 Error Handling & Recovery

#### UJ3.3.1: Receiving Clear Out of Memory Error Guidance

* **Description**: User encounters an out of memory error and receives clear explanation of the problem, specific cause, and actionable recommendations to fix it
* **Impact Weighting**: Success Rate / User Education / Efficiency
* **Priority**: High
* **User Stories**: US3.1.1 (Out of Memory Error Handling)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A training job that fails due to GPU memory exceeded
  - WHEN: The user views the error details
  - THEN: They see a clear, friendly error message:
    - Problem: "Your training configuration requires more GPU memory than available (exceeded 80GB limit)"
    - Cause: "Batch size of 4 with 242 conversations and LoRA rank 32 requires ~92GB VRAM"
    - Impact: "Training cannot continue with current settings"
  - AND: They see specific recommended fixes:
    - Option 1: "Reduce batch size to 2 (recommended - 95% success rate)"
    - Option 2: "Switch to Conservative preset (LoRA rank 8 instead of 32)"
    - Option 3: "Reduce number of training examples"
  - AND: They have a "Quick Retry" button that creates new job with batch_size=2 automatically
  - AND: They see a link to documentation explaining GPU memory usage
  - AND: The error message avoids technical jargon and uses plain language

**Technical Notes**: Detect "OutOfMemoryError" or "CUDA out of memory" in training logs, calculate likely cause

**Data Requirements**: Job configuration (batch_size, rank, dataset size), error log details

**Error Scenarios**: Cannot determine specific cause → Provide general guidance and link to support

**Performance Criteria**: Error detected and displayed within 60 seconds of occurrence

**User Experience Notes**: Emphasize that OOM is common and fixable, not a user mistake. "Quick Retry" button reduces friction.

---

#### UJ3.3.2: Understanding Dataset Format Errors

* **Description**: User receives specific information about dataset formatting issues, including which conversation or field is problematic and how to fix it
* **Impact Weighting**: Data Quality / Debugging Efficiency / Success Rate
* **Priority**: High
* **User Stories**: US3.1.2 (Dataset Format Error Handling)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A training job that fails during preprocessing due to malformed data
  - WHEN: The user reviews the error details
  - THEN: They see specific error information:
    - Problem: "Training data has formatting errors that prevent processing"
    - Specific issue: "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"
    - Location: Deep link to the conversation editor showing the problematic conversation
  - AND: They see the actual malformed data highlighted:
    - Shows JSON snippet with missing field highlighted in red
    - Shows what the correct format should look like
  - AND: They receive step-by-step fix instructions:
    - "1. Click 'Open Conversation Editor' below"
    - "2. Add the missing target_response field"
    - "3. Save and regenerate training file"
    - "4. Retry training job"
  - AND: "Open Conversation Editor" button opens editor directly to problematic conversation

**Technical Notes**: Validation runs before training starts, identifies specific malformed records

**Data Requirements**: Conversation ID, field name, validation error details, conversation metadata

**Error Scenarios**: Multiple formatting errors → List all errors; Validation script failure → Generic error with support link

**Performance Criteria**: Validation completes in <30 seconds, error details display immediately

**User Experience Notes**: Provide exact fix steps, not just "data is invalid" - users need actionable guidance

---

#### UJ3.3.3: Handling GPU Provisioning Failures Gracefully

* **Description**: User experiences GPU unavailability and receives clear options: auto-retry, switch to on-demand, or cancel and wait
* **Impact Weighting**: User Experience / Flexibility / Reliability
* **Priority**: High
* **User Stories**: US3.1.3 (GPU Provisioning Error Handling)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A training job queued when no spot GPUs are available
  - WHEN: Provisioning fails after timeout period
  - THEN: They see a clear status message:
    - Problem: "No H100 spot GPUs currently available"
    - Reason: "High demand in datacenter (92% utilization)"
    - Estimated wait: "Typically available within 15-30 minutes"
  - AND: They see three clear options:
    - Option 1: "Auto-retry every 5 minutes (recommended)" - retries for up to 1 hour
    - Option 2: "Switch to on-demand GPU (+$5/hr, immediate availability)"
    - Option 3: "Cancel and retry later during off-peak hours"
  - AND: If they select auto-retry, job status shows "Waiting for GPU availability" with retry countdown
  - AND: They receive notification when GPU becomes available and training starts
  - AND: If 1 hour passes with no GPU, they receive notification with options to extend wait or switch to on-demand

**Technical Notes**: Poll RunPod API every 5 minutes for spot availability, track retry attempts

**Data Requirements**: GPU availability status, datacenter utilization, historical wait times

**Error Scenarios**: RunPod API error → Display generic provisioning error with support contact

**Performance Criteria**: Retry attempts occur every 5 minutes reliably, notifications sent within 60 seconds

**User Experience Notes**: Reassure users this is temporary demand issue, not their fault. Provide realistic wait estimates.

---

#### UJ3.3.4: Experiencing Automatic Spot Instance Recovery

* **Description**: User's training job is interrupted by spot instance termination and automatically resumes from checkpoint without user intervention
* **Impact Weighting**: Cost Efficiency / Reliability / User Confidence
* **Priority**: High
* **User Stories**: US3.2.1 (Spot Instance Interruption Recovery)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A training job running on spot instance that gets interrupted
  - WHEN: The spot instance is terminated by the provider
  - THEN: The user sees immediate status update:
    - "Training interrupted at 42% complete (Step 850)"
    - "Automatic recovery initiated..."
    - "Provisioning new GPU instance..."
  - AND: Recovery happens automatically without user action
  - AND: Within 10 minutes, training resumes from last checkpoint
  - AND: User receives notification: "Training resumed from Step 850. Estimated 8h 15m remaining."
  - AND: Dashboard shows interruption badge: "Interrupted 1x (auto-recovered)"
  - AND: Interruption downtime is tracked separately from training time
  - AND: Cost calculation includes small overhead for recovery time
  - AND: If recovery fails after 3 attempts, user receives notification with option to switch to on-demand

**Technical Notes**: Checkpoints saved every 100 steps to Supabase Storage, recovery process fully automated

**Data Requirements**: Latest checkpoint location, interruption timestamp, recovery attempt count

**Error Scenarios**: Checkpoint corrupted → Attempt recovery from previous checkpoint; No checkpoint available → Job fails with explanation

**Performance Criteria**: Recovery initiated within 60 seconds of interruption, resume within 10 minutes

**User Experience Notes**: Users should barely notice interruptions - seamless automatic recovery builds trust in spot instances

---

#### UJ3.3.5: Manually Resuming from Checkpoint After Failure

* **Description**: User with failed job that has saved checkpoints manually resumes training from last checkpoint with option to adjust configuration
* **Impact Weighting**: Cost Efficiency / User Control / Flexibility
* **Priority**: Medium
* **User Stories**: US3.2.2 (Manual Checkpoint Resume)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with a failed training job that has available checkpoints
  - WHEN: They click "Resume from Checkpoint" button on failed job
  - THEN: A configuration modal opens showing:
    - Checkpoint details: "Resume from Step 850 (42% complete, Epoch 2 of 3)"
    - Remaining work: "1.5 epochs remaining (~8 hours estimated)"
    - Current configuration pre-filled (all settings from original job)
  - AND: They can adjust configuration before resuming:
    - Change GPU type (spot to on-demand)
    - Adjust batch size (if OOM was cause of failure)
    - Modify learning rate
    - Change remaining epochs
  - AND: Cost estimate updates to show only remaining work cost
  - AND: They see before/after configuration comparison highlighting changes
  - AND: After confirmation, new job is created linked to original job
  - AND: Training continues from exact checkpoint state

**Technical Notes**: Create new job_id linked to parent job, download checkpoint from storage before resuming

**Data Requirements**: Checkpoint file location, job configuration, training state (step, epoch, loss)

**Error Scenarios**: Checkpoint file missing → Error: "Checkpoint not found in storage"; Checkpoint incompatible with new config → Warning about potential issues

**Performance Criteria**: Checkpoint download and resume within 5 minutes

**User Experience Notes**: Useful when OOM occurred and user wants to reduce batch size, or spot kept interrupting and user wants on-demand

---

#### UJ3.3.6: Retrying Failed Job with One Click

* **Description**: User retries failed job using identical configuration with single click, avoiding reconfiguration effort
* **Impact Weighting**: Productivity / User Experience / Efficiency
* **Priority**: Medium
* **User Stories**: US3.3.1 (One-Click Retry with Same Configuration)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with a failed training job
  - WHEN: They click the "Retry Job" button
  - THEN: A confirmation modal displays:
    - Original job details (name, failure reason, time before failure)
    - Exact configuration that will be used
    - Fresh cost estimate
    - Option to edit configuration before retrying
  - AND: Job name is automatically appended with " (Retry #2)"
  - AND: Checkboxes confirm understanding: "I understand this will start a new job with same configuration"
  - AND: After confirmation, new job is created in queued status
  - AND: New job is linked to original failed job for reference
  - AND: Training starts automatically

**Technical Notes**: Clone all configuration from original job, create new job record with parent reference

**Data Requirements**: Original job configuration, failure details, user confirmation

**Error Scenarios**: Budget exceeded → Block retry with budget increase option; Same configuration likely to fail again → Warning suggestion

**Performance Criteria**: Retry job creation in <3 seconds

**User Experience Notes**: Best for transient failures (network timeout, temporary GPU shortage), not for config issues like OOM

---

#### UJ3.3.7: Retrying with Suggested Configuration Fixes

* **Description**: User retries failed job with system-recommended configuration adjustments automatically applied based on failure type
* **Impact Weighting**: Success Rate / User Guidance / Learning
* **Priority**: Medium
* **User Stories**: US3.3.2 (Retry with Suggested Adjustments)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with a failed job due to configuration issue (OOM, timeout)
  - WHEN: They click "Retry with Suggested Fix" button
  - THEN: They see configuration comparison showing suggested changes:
    - For OOM error: "batch_size: 4 → 2" (highlighted in green)
    - For timeout: "epochs: 4 → 3"
    - For repeated interruptions: "GPU type: Spot → On-Demand"
  - AND: They see explanation: "95% of jobs succeed with batch_size=2 after OOM error"
  - AND: They see updated cost estimate reflecting configuration changes
  - AND: They can accept suggested fixes or manually adjust further
  - AND: System tracks success rate of suggested fixes to improve recommendations
  - AND: After retry succeeds, user receives confirmation that suggested fix worked

**Technical Notes**: Rules engine maps error types to configuration adjustments, tracks fix success rates

**Data Requirements**: Error type, original configuration, historical success rates for fixes

**Error Scenarios**: No good suggestion available → Offer manual edit option only

**Performance Criteria**: Suggested configuration generated in <1 second

**User Experience Notes**: Learn from patterns: "92% of OOM errors fixed by reducing batch_size" builds user trust in suggestions

---

### 3.4 Job Control & Management

#### UJ3.4.1: Cancelling Active Training Job

* **Description**: User cancels active training job when observing problems or budget concerns, with clear confirmation and cost summary
* **Impact Weighting**: Cost Control / User Control / Risk Mitigation
* **Priority**: High
* **User Stories**: US2.2.1 (Cancel Active Training Job)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user monitoring an active training job showing problems (loss not decreasing, cost over budget)
  - WHEN: They click the "Cancel Job" button
  - THEN: A confirmation modal displays:
    - Warning: "This will permanently stop training and terminate the GPU"
    - Current progress: "42% complete (Step 850 of 2,000)"
    - Time elapsed: "6 hours 23 minutes"
    - Cost spent so far: "$22.18 (will be charged)"
    - Remaining estimated cost: "$25-30 (will be saved)"
  - AND: They select reason for cancellation from dropdown: "Loss not decreasing / Too expensive / Wrong configuration / Testing / Other"
  - AND: Optional notes field for detailed explanation
  - AND: Confirmation checkbox: "I understand this cannot be undone"
  - AND: After confirmation, job status updates to "cancelled" immediately
  - AND: GPU instance terminated within 60 seconds
  - AND: Final cost calculated based on actual elapsed time
  - AND: Notification confirms: "Job cancelled. Final cost: $22.18. GPU terminated."

**Technical Notes**: Send termination request to RunPod API, update job status, calculate final cost

**Data Requirements**: Elapsed time, current cost, estimated remaining cost, cancellation reason

**Error Scenarios**: API timeout → Retry termination request; GPU already terminated → Update status only

**Performance Criteria**: Cancellation processed in <60 seconds, GPU terminated in <2 minutes

**User Experience Notes**: Make cancellation button prominent but use destructive styling (red) to prevent accidental clicks. Cancelled jobs should remain viewable in history for learning.

---

#### UJ3.4.2: Viewing All Training Jobs with Filtering

* **Description**: User views complete list of all training jobs across team with powerful filtering and sorting to find specific jobs or identify patterns
* **Impact Weighting**: Organization / Team Coordination / Oversight
* **Priority**: High
* **User Stories**: US2.3.1 (View All Training Jobs)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user wanting to review training jobs across the team
  - WHEN: They navigate to the training jobs list page
  - THEN: They see a comprehensive table with columns:
    - Job Name, Status (badge), Configuration (preset), Created By, Started At, Duration, Cost, Actions
  - AND: Status badges are color-coded: Queued (gray), Training (blue), Completed (green), Failed (red), Cancelled (orange)
  - AND: They can filter jobs by:
    - Status: All / Active / Completed / Failed / Cancelled / Queued
    - Creator: All users / Me only / Specific team member
    - Date range: Last 7 days / 30 days / 90 days / Custom
    - Preset: All / Conservative / Balanced / Aggressive
    - Cost range: <$50 / $50-100 / >$100
    - GPU type: All / Spot / On-Demand
  - AND: They can sort by: Date (newest/oldest), Duration, Cost, Status
  - AND: They can search by job name, notes, or tags
  - AND: Clicking any row opens detailed job view
  - AND: They can select multiple jobs for bulk actions (cancel active, delete completed)

**Technical Notes**: Query training_jobs table with filters, paginate results (25/50/100 per page)

**Data Requirements**: All job fields, user information, filter parameters

**Error Scenarios**: No jobs match filters → Display "No jobs found. Try adjusting filters."

**Performance Criteria**: Page loads in <3 seconds, filter updates in <1 second

**User Experience Notes**: Default to "My active jobs" view for quick personal monitoring. Save filter preferences per user.

---

#### UJ3.4.3: Managing Training Queue

* **Description**: User views queued training jobs, understands estimated start times, and manages queue priority for urgent jobs
* **Impact Weighting**: Resource Planning / Client Communication / Operational Efficiency
* **Priority**: Medium
* **User Stories**: US2.3.2 (Training Queue Management)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with multiple jobs waiting to start
  - WHEN: They navigate to the "Queue" tab
  - THEN: They see all queued jobs listed with:
    - Queue position: "1 of 3 in queue"
    - Job name and configuration
    - Estimated start time: "Today at 3:45 PM (in 2 hours 15 minutes)"
    - Creator information
  - AND: Estimated start times update as active jobs progress
  - AND: Current capacity shows: "2 of 3 concurrent jobs running"
  - AND: They understand queue priority is first-in-first-out by default
  - AND: Users with manager role can promote urgent jobs to front of queue
  - AND: When queue is full (3/3 active), new job creation is blocked with message: "Queue full. Wait for completion or cancel an active job."
  - AND: They receive notification when their queued job starts training

**Technical Notes**: Calculate estimated start as sum of remaining time for active jobs + provisioning time

**Data Requirements**: Active jobs remaining time, queue position, concurrent job limit, user role

**Error Scenarios**: Queue estimate inaccurate → Recalculate when active jobs complete

**Performance Criteria**: Queue page loads in <2 seconds, estimates update every 60 seconds

**User Experience Notes**: Set realistic concurrent job limit (3 jobs) based on budget and team size. Provide clear queue visibility to manage expectations.

---

#### UJ3.4.4: Sharing Job Details with Team

* **Description**: User shares training job details with teammates via link for collaboration, review, or replication
* **Impact Weighting**: Team Collaboration / Knowledge Sharing / Learning
* **Priority**: Low
* **User Stories**: US8.1.2 (Job Sharing & Collaboration)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user who wants to share job configuration or results
  - WHEN: They click the "Share Job" button
  - THEN: A sharing modal displays with options:
    - Team (only team members can view) - default
    - Public (anyone with link can view, no login required)
    - Private (only job creator can view)
  - AND: They can copy shareable link to clipboard
  - AND: They can share directly via email or Slack
  - AND: Shared link format: `https://app.brightrun.ai/training-jobs/{job_id}`
  - AND: Shared job view shows full details: configuration, progress, results, creator attribution
  - AND: Viewers see "Clone Configuration" button to start new job with same settings
  - AND: Public links expire after 30 days (configurable)

**Technical Notes**: Generate secure shareable links, track link views for analytics

**Data Requirements**: Job details, sharing permissions, link expiration settings

**Error Scenarios**: Job deleted → Shared link shows "Job not found"; Permission denied → Require login for team-only links

**Performance Criteria**: Link generation instant, shared view loads in <3 seconds

**User Experience Notes**: Use cases - "Check out my great configuration", "Review this failed job", "Client wants to see progress"

---

# LoRA Pipeline - User Journey Document (PART 2 - Continuation)

**This file contains Sections 4-6 and supporting sections to be appended to 02b-pipeline-user-journey.md**

---

## 4. Quality Validation & Model Assessment

### 4.1 Automated Quality Validation

#### UJ4.1.1: Initiating Automated Quality Checks

* **Description**: User triggers automated validation suite after training completes, running comprehensive quality benchmarks without manual effort
* **Impact Weighting**: Quality Assurance / Efficiency / Client Confidence
* **Priority**: High
* **User Stories**: US6.1.1 (Calculate Perplexity Improvement), US6.2.1 (Run Emotional Intelligence Benchmarks)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with a completed training job
  - WHEN: Training finalization completes
  - THEN: Automated validation suite starts automatically (or user clicks "Run Validation")
  - AND: User sees validation progress indicator:
    - "Running quality validation..." (progress: 1 of 4 tests)
    - Current test: "Calculating perplexity on validation data..."
  - AND: Validation suite includes:
    - Test 1: Perplexity benchmarking (baseline vs trained)
    - Test 2: Emotional intelligence evaluation (50 test scenarios)
    - Test 3: Catastrophic forgetting detection (100 knowledge questions)
    - Test 4: Brand voice consistency (30 response samples)
  - AND: Estimated validation time: 15-20 minutes
  - AND: User receives notification when validation completes
  - AND: Results display in comprehensive validation dashboard

**Technical Notes**: Validation runs on separate compute instance, uses baseline Llama 3 70B + trained adapters

**Data Requirements**: Trained model adapters, validation dataset (20% held-out), test scenarios, baseline model

**Error Scenarios**: Validation script fails → Retry automatically; Baseline model unavailable → Queue validation until available

**Performance Criteria**: Full validation suite completes in <20 minutes

**User Experience Notes**: Validation is automatic by default but can be triggered manually. Progress visibility reduces anxiety.

---

#### UJ4.1.2: Reviewing Overall Quality Dashboard

* **Description**: User views comprehensive quality dashboard showing aggregate scores across all validation dimensions with pass/fail indicators
* **Impact Weighting**: Quality Assurance / Decision Support / Client Communication
* **Priority**: High
* **User Stories**: US6.1.1, US6.2.1, US6.3.1, US6.4.1
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user whose validation suite has completed
  - WHEN: They view the quality validation dashboard
  - THEN: They see four quality score cards prominently displayed:
    - **Perplexity Improvement**: 31.4% (Baseline: 24.5 → Trained: 16.8) - Production Ready
    - **Emotional Intelligence**: 41% improvement (3.2/5 → 4.5/5) - Exceptional
    - **Knowledge Retention**: 98% (85 of 87 baseline answers retained) - Passed
    - **Brand Voice Consistency**: 86% alignment (4.3/5 on Elena Morales rubric) - Strong Alignment
  - AND: Each score has color-coded badge: Green (passed/excellent), Yellow (acceptable), Red (needs improvement)
  - AND: Overall quality verdict displayed: "Ready for Client Delivery" or "Review Required" or "Quality Issues Detected"
  - AND: Summary interpretation: "This model shows strong improvements across all quality dimensions and is ready for production use"
  - AND: User can click each card to see detailed breakdown

**Technical Notes**: Aggregate results from all validation tests, apply thresholds for pass/fail

**Data Requirements**: Perplexity scores, EI scores, retention percentage, brand voice scores, threshold configurations

**Error Scenarios**: Partial validation results → Display available results with warning; All validation failed → Show error details

**Performance Criteria**: Dashboard renders in <2 seconds with all scores calculated

**User Experience Notes**: Simple visual design - users should see "all green" or "problems here" at a glance

---

### 4.2 Perplexity Benchmarking

#### UJ4.2.1: Understanding Perplexity Improvement Results

* **Description**: User reviews perplexity benchmark results showing baseline vs trained model performance with clear interpretation of improvement percentage
* **Impact Weighting**: Quality Measurement / Client Proof / Technical Validation
* **Priority**: High
* **User Stories**: US6.1.1 (Calculate Perplexity Improvement)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing perplexity validation results
  - WHEN: They click the Perplexity score card or navigate to detailed view
  - THEN: They see comprehensive perplexity analysis:
    - Baseline perplexity: 24.5 (Llama 3 70B without fine-tuning)
    - Trained perplexity: 16.8 (Llama 3 70B + LoRA adapters)
    - Improvement: **31.4%** (green badge if ≥30%, yellow 20-29%, red <20%)
    - Interpretation: "31% lower perplexity means the model predicts responses much more accurately"
  - AND: They see visual comparison: Bar chart showing baseline vs trained
  - AND: Quality threshold explained:
    - Production-ready: ≥30% improvement (green)
    - Acceptable: 20-29% improvement (yellow)
    - Needs retry: <20% improvement (red)
  - AND: They see trend chart if multiple training runs exist
  - AND: Export option: "Download perplexity data (CSV)"

**Technical Notes**: Calculate perplexity on 20% held-out validation set, same data for baseline and trained

**Data Requirements**: Validation set predictions, baseline model outputs, trained model outputs

**Error Scenarios**: Perplexity higher than baseline → Warning: "Model may be overfitting or needs more training"

**Performance Criteria**: Perplexity calculation completes in <5 minutes

**User Experience Notes**: Explain perplexity in simple terms: "Lower perplexity = better prediction quality"

---

#### UJ4.2.2: Analyzing Perplexity by Category

* **Description**: User examines perplexity breakdown by persona, emotional arc, and topic to identify which scenarios improved most
* **Impact Weighting**: Quality Insights / Data-Driven Optimization / Advanced Analysis
* **Priority**: Medium
* **User Stories**: US6.1.2 (Perplexity by Category Analysis)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user wanting detailed perplexity insights
  - WHEN: They view the category breakdown section
  - THEN: They see three analysis tables:
    - **By Persona**: Anxious Investor (26.3 → 15.2, 42% improvement), Pragmatic Skeptic (25.1 → 16.8, 33%), etc.
    - **By Emotional Arc**: Triumph (23.1 → 15.8, 32%), Struggle-to-Success (25.7 → 17.2, 33%), etc.
    - **By Training Topic**: Retirement Planning (22.5 → 14.9, 34%), Tax Strategies (28.3 → 19.1, 32%), etc.
  - AND: Best and worst improvements are highlighted
  - AND: Visual heatmap shows persona × emotional arc combinations with color-coded improvement levels
  - AND: Recommendations provided: "Add more 'Pragmatic Skeptic + Anxiety' conversations for better coverage in this area"
  - AND: They identify which scenarios need more training data for next iteration

**Technical Notes**: Group validation samples by metadata categories, calculate per-category perplexity

**Data Requirements**: Validation samples with persona, emotional_arc, topic metadata

**Error Scenarios**: Insufficient samples in category → Mark as "Not enough data"

**Performance Criteria**: Category analysis completes in <10 minutes

**User Experience Notes**: Power-user feature for optimization, not critical for basic validation

---

### 4.3 Emotional Intelligence Testing

#### UJ4.3.1: Reviewing Emotional Intelligence Benchmark Results

* **Description**: User examines emotional intelligence evaluation showing aggregate empathy, clarity, and appropriateness scores with before/after comparison
* **Impact Weighting**: Client Proof / Quality Differentiation / Revenue Impact
* **Priority**: High
* **User Stories**: US6.2.1 (Run Emotional Intelligence Benchmarks)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing EI validation results
  - WHEN: They navigate to the Emotional Intelligence section
  - THEN: They see comprehensive EI analysis:
    - Overall EI Score: 3.2/5 (baseline) → 4.5/5 (trained) = **41% improvement**
    - Empathy subscore: 3.1 → 4.6 (48% improvement) - "Excellent empathy recognition"
    - Clarity subscore: 3.4 → 4.5 (32% improvement) - "Clear, understandable advice"
    - Appropriateness subscore: 3.1 → 4.4 (42% improvement) - "Tone matches emotional context"
  - AND: Quality badge: "Exceptional EI" (≥40% improvement) or "Strong EI" (30-39%) or "Moderate" (20-29%)
  - AND: They see test methodology: "50 emotional intelligence scenarios evaluated by human reviewers on 1-5 scale"
  - AND: Visual bar chart comparing baseline vs trained across all subscores
  - AND: They can export results for client presentations

**Technical Notes**: Run 50 test scenarios through baseline and trained models, human or LLM-as-judge scoring

**Data Requirements**: 50 EI test scenarios, baseline responses, trained responses, evaluation rubric

**Error Scenarios**: Evaluation not yet complete → Show in-progress status; Scores below 20% improvement → Warning flag

**Performance Criteria**: EI evaluation completes in <10 minutes (with LLM-as-judge) or <2 hours (human review)

**User Experience Notes**: 40%+ improvement is the key client proof metric - emphasize this prominently

---

#### UJ4.3.2: Examining Before/After Response Examples

* **Description**: User reviews side-by-side comparison of baseline vs trained responses on specific emotional scenarios showing clear quality improvement
* **Impact Weighting**: Client Proof / Sales Enablement / Quality Demonstration
* **Priority**: High
* **User Stories**: US6.2.1 (Run Emotional Intelligence Benchmarks)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing EI results
  - WHEN: They scroll to the "Example Comparisons" section
  - THEN: They see 10 best improvement examples displayed:
    - Scenario prompt: "Client anxious about market volatility affecting retirement savings"
    - Baseline response: [Generic financial advice, no emotional acknowledgment]
    - Trained response: [Empathetic acknowledgment + specific reassurance + action plan]
    - Improvement notes: "Trained model recognizes anxiety, validates feelings, provides calming guidance"
    - Scores: Empathy 2/5 → 5/5, Clarity 3/5 → 4/5, Appropriateness 2/5 → 5/5
  - AND: Each example is expandable for full response text
  - AND: Examples are carefully selected to demonstrate diverse improvements (different personas, emotional arcs, topics)
  - AND: User can select examples to include in client presentation
  - AND: Export option: "Download example comparisons (PDF)" for client delivery

**Technical Notes**: Identify highest improvement deltas, curate best examples for presentation

**Data Requirements**: Test scenario prompts, baseline responses, trained responses, scores

**Error Scenarios**: No strong improvements → Display moderate improvements with context

**Performance Criteria**: Examples page loads in <2 seconds

**User Experience Notes**: These examples are powerful sales tools - make them easy to export and share with clients

---

#### UJ4.3.3: Identifying Emotional Intelligence Regressions

* **Description**: User reviews scenarios where trained model scored worse than baseline to catch quality issues before delivery
* **Impact Weighting**: Quality Assurance / Risk Mitigation / Client Protection
* **Priority**: Medium
* **User Stories**: US6.2.2 (Emotional Intelligence Regression Detection)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing complete EI validation
  - WHEN: They navigate to the "Regressions" tab
  - THEN: They see regression analysis:
    - Number of regressions: "3 of 50 scenarios (6%)"
    - Severity breakdown: "3 minor regressions, 0 moderate, 0 major"
    - List of regressed scenarios with details
  - AND: Each regression shows:
    - Scenario: "Scenario #23: Client frustrated with investment underperformance"
    - Baseline score: 4.2/5 (empathy: 4/5, clarity: 4/5, appropriateness: 5/5)
    - Trained score: 3.8/5 (empathy: 3/5, clarity: 4/5, appropriateness: 4/5)
    - Severity: Minor (-10% regression, still ≥4/5 overall)
  - AND: Pattern analysis: "2 of 3 regressions involve 'Pragmatic Skeptic' persona"
  - AND: Quality gate decision: "Acceptable for delivery (<10% scenarios regressed, no major regressions)" or "Review required"
  - AND: Recommendations: "Add more Pragmatic Skeptic training data for next iteration"

**Technical Notes**: Flag any scenario where trained_score < baseline_score, categorize severity

**Data Requirements**: All 50 scenario scores for baseline and trained models

**Error Scenarios**: High regression rate (>10%) → Block delivery with warning

**Performance Criteria**: Regression analysis runs automatically with EI evaluation

**User Experience Notes**: Minor regressions (<10%) are acceptable, moderate/major regressions require review

---

### 4.4 Catastrophic Forgetting Detection

#### UJ4.4.1: Verifying Financial Knowledge Retention

* **Description**: User reviews financial knowledge retention test results ensuring the trained model maintains baseline knowledge across core topics
* **Impact Weighting**: Quality Assurance / Risk Mitigation / Client Trust
* **Priority**: Medium
* **User Stories**: US6.3.1 (Financial Knowledge Retention Test)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing catastrophic forgetting test results
  - WHEN: They navigate to the Knowledge Retention section
  - THEN: They see retention analysis:
    - Baseline accuracy: 87% (87 of 100 questions correct)
    - Trained accuracy: 85% (85 of 100 questions correct)
    - Retention rate: **98%** (85/87 = 97.7%)
    - Verdict: "Passed" (≥95% retention threshold met)
  - AND: They see category breakdown:
    - Taxes: 22/25 baseline → 21/25 trained (95% retention)
    - Retirement: 23/25 baseline → 23/25 trained (100% retention)
    - Investing: 21/25 baseline → 20/25 trained (95% retention)
    - Insurance: 21/25 baseline → 21/25 trained (100% retention)
  - AND: Quality thresholds explained:
    - Passed: ≥95% retention
    - Warning: 90-94% retention (minor knowledge loss)
    - Failed: <90% retention (catastrophic forgetting detected)
  - AND: If <95%, they see list of specific questions where model regressed

**Technical Notes**: Run 100 multiple-choice financial knowledge questions through baseline and trained models

**Data Requirements**: 100 test questions with answers, baseline predictions, trained predictions

**Error Scenarios**: Retention <90% → Block delivery, recommend retraining with lower learning rate

**Performance Criteria**: Knowledge test completes in <5 minutes

**User Experience Notes**: 95%+ retention ensures model didn't "forget" basic financial knowledge during fine-tuning

---

#### UJ4.4.2: Reviewing Failed Knowledge Questions

* **Description**: User examines specific questions where trained model failed but baseline passed to understand knowledge gaps
* **Impact Weighting**: Quality Insights / Risk Identification / Training Optimization
* **Priority**: Low
* **User Stories**: US6.3.1 (Financial Knowledge Retention Test)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user whose model has 90-94% knowledge retention
  - WHEN: They review the failed questions list
  - THEN: They see detailed question analysis:
    - Question: "What is the 2025 contribution limit for traditional IRA?"
    - Correct answer: "$7,000 ($8,000 if age 50+)"
    - Baseline prediction: "$7,000 ($8,000 if age 50+)" (correct)
    - Trained prediction: "$6,500 ($7,500 if age 50+)" (incorrect - outdated limit)
    - Knowledge category: Retirement planning
  - AND: They see pattern analysis: "5 of 8 failed questions involve specific dollar limits or dates"
  - AND: Recommendations provided:
    - "Model may benefit from factual anchoring during training"
    - "Consider adding recent financial regulation updates to training data"
    - "Lower learning rate may preserve factual knowledge better"
  - AND: Export option to review all questions and predictions

**Technical Notes**: Compare predictions to correct answers, identify failure patterns

**Data Requirements**: Question text, correct answer, baseline prediction, trained prediction, category

**Error Scenarios**: No failures → Display "All baseline knowledge retained perfectly"

**Performance Criteria**: Failed question analysis immediate (pre-calculated)

**User Experience Notes**: Most models retain 95%+, so this detailed view is for edge cases

---

### 4.5 Brand Voice Consistency

#### UJ4.5.1: Evaluating Elena Morales Voice Alignment

* **Description**: User reviews brand voice consistency scores across 10 personality characteristics ensuring model maintains Elena Morales style
* **Impact Weighting**: Brand Alignment / Client Satisfaction / Quality Differentiation
* **Priority**: Medium
* **User Stories**: US6.4.1 (Elena Morales Voice Consistency Scoring)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing brand voice validation
  - WHEN: They navigate to the Brand Voice section
  - THEN: They see Elena Morales voice rubric evaluation:
    - Overall consistency: 4.3/5 (**86% alignment**, target ≥85%)
    - Verdict: "Strong Brand Alignment"
  - AND: They see per-characteristic breakdown (1-5 scale):
    - Warmth & Empathy: 4.5/5 (excellent)
    - Directness & Clarity: 4.2/5 (strong)
    - Education-First: 4.1/5 (good)
    - Pragmatic Optimism: 4.6/5 (excellent)
    - Question-Driven: 4.0/5 (good)
    - Storytelling: 4.3/5 (strong)
    - Action-Oriented: 4.5/5 (excellent)
    - Patience: 4.4/5 (strong)
    - Appropriate Humor: 3.8/5 (acceptable)
    - Confident Authority: 4.2/5 (strong)
  - AND: Quality thresholds:
    - Excellent: ≥4.5/5 (90%+)
    - Strong: ≥4.25/5 (85-89%)
    - Acceptable: ≥4.0/5 (80-84%)
    - Needs Improvement: <4.0/5 (<80%)
  - AND: Characteristics scoring <3/5 are flagged for attention

**Technical Notes**: Generate 30 diverse responses, human evaluators score on 10-point rubric

**Data Requirements**: 30 test prompts, model responses, Elena Morales voice rubric, evaluation scores

**Error Scenarios**: Evaluation not complete → Show in-progress; Multiple characteristics <4.0 → Warning

**Performance Criteria**: Voice evaluation completes in <30 minutes (human review) or <5 minutes (LLM-as-judge)

**User Experience Notes**: 85%+ alignment ensures model sounds like Elena Morales, not generic AI

---

#### UJ4.5.2: Reviewing Brand Voice Example Responses

* **Description**: User examines sample responses demonstrating brand voice consistency with annotations highlighting personality characteristics
* **Impact Weighting**: Quality Demonstration / Client Communication / Brand Validation
* **Priority**: Low
* **User Stories**: US6.4.1 (Elena Morales Voice Consistency Scoring)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user reviewing brand voice results
  - WHEN: They view example responses section
  - THEN: They see 5-10 annotated response examples:
    - Prompt: "I'm worried about retirement savings at age 45"
    - Response: [Full model response]
    - Annotations highlighting voice characteristics:
      - "Validates emotion first" → Warmth & Empathy (5/5)
      - "Asks clarifying question about timeline" → Question-Driven (5/5)
      - "Provides specific actionable steps" → Action-Oriented (5/5)
      - "Uses relatable story about another client" → Storytelling (4/5)
  - AND: Each example shows which characteristics are demonstrated
  - AND: Examples cover diverse scenarios (different emotions, topics, personas)
  - AND: User can select examples for client presentation materials
  - AND: Export option: "Download brand voice examples (PDF)"

**Technical Notes**: Curate best examples demonstrating multiple voice characteristics

**Data Requirements**: Test prompts, responses, characteristic annotations, scores

**Error Scenarios**: Few strong examples → Use moderate examples with context

**Performance Criteria**: Examples page loads instantly

**User Experience Notes**: These examples prove the model "sounds like Elena" - valuable for client confidence

---

## 5. Model Artifact Delivery & Client Presentation

### 5.1 Model Artifact Downloads

#### UJ5.1.1: Downloading Trained LoRA Adapters

* **Description**: User downloads trained model adapters in one click, receiving a complete package ready for integration into inference systems
* **Impact Weighting**: Time-to-Value / Ease of Use / Client Delivery
* **Priority**: High
* **User Stories**: US4.1.1 (Download Trained LoRA Adapters)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with a completed and validated training job
  - WHEN: They click the "Download Adapters" button (prominent, green)
  - THEN: A ZIP file download initiates: `Elena-Morales-Balanced-adapters-job_abc123.zip`
  - AND: ZIP contains:
    - `adapter_model.bin` (200-500MB): Trained LoRA weight matrices
    - `adapter_config.json`: Configuration (rank, alpha, target_modules, etc.)
    - `README.txt`: Quick integration instructions
    - `training_summary.json`: Final metrics (loss, perplexity, duration, cost)
  - AND: Download progress indicator displays for large files
  - AND: Signed download URL valid for 24 hours
  - AND: After 24 hours, they can regenerate download link
  - AND: Download count tracked in job details (for audit trail)
  - AND: README includes: integration steps, dependencies, inference example

**Technical Notes**: Generate signed Supabase Storage URL with 24hr expiration, create ZIP on-demand or pre-generated

**Data Requirements**: Adapter files from storage, job metadata, training metrics

**Error Scenarios**: File not found in storage → Error with support contact; Storage API timeout → Retry automatically

**Performance Criteria**: Download link generation in <3 seconds, download speed limited only by user bandwidth

**User Experience Notes**: Simple one-click download - no complex configuration needed. README makes integration straightforward.

---

#### UJ5.1.2: Accessing Complete Deployment Package

* **Description**: User downloads comprehensive deployment package including adapters, inference script, requirements, documentation, and examples
* **Impact Weighting**: Client Success / Integration Speed / Support Reduction
* **Priority**: Medium
* **User Stories**: US4.3.1 (Create Complete Deployment Package)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user preparing to deploy trained model for client
  - WHEN: They click "Download Deployment Package" button
  - THEN: A complete ZIP package downloads: `Elena-Morales-deployment-package-job_abc123.zip` (~500-700MB)
  - AND: Package contains:
    - `adapters/` folder: adapter_model.bin, adapter_config.json
    - `inference.py`: Runnable Python script with CLI interface
    - `requirements.txt`: Exact dependency versions (transformers, peft, torch, accelerate)
    - `README.md`: Detailed setup, usage, deployment, troubleshooting guide
    - `example_prompts.json`: 10 sample prompts with expected responses
    - `training_summary.json`: Complete training job metadata and metrics
  - AND: Inference script works immediately: `pip install -r requirements.txt && python inference.py "Your prompt here"`
  - AND: README includes GPU requirements, VRAM usage, performance estimates
  - AND: Package ready for client handoff with zero additional setup needed

**Technical Notes**: Generate deployment package on-demand, cache for 48 hours

**Data Requirements**: Adapter files, inference template, requirements template, training metrics

**Error Scenarios**: Package generation fails → Retry with error notification

**Performance Criteria**: Package generation completes in <30 seconds

**User Experience Notes**: This is "everything the client needs" in one download - comprehensive handoff package

---

#### UJ5.1.3: Verifying Download Integrity

* **Description**: User verifies downloaded files are complete and uncorrupted using checksums or file size validation
* **Impact Weighting**: Quality Assurance / Client Trust / Reliability
* **Priority**: Low
* **User Stories**: US4.1.1 (Download Trained LoRA Adapters)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user who has downloaded adapter or deployment package
  - WHEN: They want to verify file integrity
  - THEN: Download page displays file information:
    - File name: `Elena-Morales-adapters-job_abc123.zip`
    - File size: 487 MB (expected: 485-490 MB)
    - SHA256 checksum: `a3f2...8b9c`
    - Last updated: 2025-12-16 03:42 PM PST
  - AND: They can verify checksum locally: `sha256sum downloaded_file.zip`
  - AND: If checksums match: "File verified successfully"
  - AND: If file size doesn't match: Warning with option to re-download
  - AND: Job details page shows download history: "Downloaded 3 times, last: 2025-12-16 by user@example.com"

**Technical Notes**: Calculate SHA256 checksum when files are created, store in database

**Data Requirements**: File checksum, file size, download timestamps, user info

**Error Scenarios**: Checksum mismatch → Warn user, offer re-download

**Performance Criteria**: Checksum calculation completes in <5 seconds for 500MB file

**User Experience Notes**: Most users won't check checksums, but availability builds trust and supports clients with strict security requirements

---

### 5.2 Validation Report Generation

#### UJ5.2.1: Generating Comprehensive Validation Report

* **Description**: User generates professional PDF validation report summarizing all quality metrics, improvement percentages, and example comparisons for client delivery
* **Impact Weighting**: Client Communication / Sales Enablement / Professionalism
* **Priority**: High
* **User Stories**: US4.2.2 (Generate Training Report PDF)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with completed training and validation
  - WHEN: They click "Generate Validation Report" button
  - THEN: PDF report generates in 5-10 seconds with comprehensive structure:
    - **Cover Page**: Job name, client name, date, Bright Run branding
    - **Executive Summary** (1 page):
      - Overall quality verdict: "Production Ready"
      - Key metrics: 31% perplexity improvement, 41% EI improvement, 98% knowledge retention, 86% brand voice alignment
      - Training duration: 13.2 hours
      - Total cost: $48.32
    - **Perplexity Analysis** (1 page): Baseline vs trained, category breakdown, interpretation
    - **Emotional Intelligence** (2 pages): Aggregate scores, before/after examples (3-5), subscore breakdown
    - **Knowledge Retention** (1 page): Retention rate, category breakdown, quality gate result
    - **Brand Voice** (1 page): Characteristic scores, overall alignment, example annotations
    - **Training Details** (1 page): Configuration, loss curves, cost breakdown
    - **Appendix**: Full methodology, test scenarios, acceptance criteria
  - AND: Report is client-ready with professional design and branding
  - AND: Preview available before download
  - AND: File naming: `Bright-Run-Validation-Report-Elena-Morales-2025-12-16.pdf`

**Technical Notes**: Use PDF generation library (e.g., Puppeteer, WeasyPrint), template-based approach

**Data Requirements**: All validation results, training metrics, job configuration, before/after examples

**Error Scenarios**: Generation fails → Retry with error details; Partial data → Generate with available data and mark missing sections

**Performance Criteria**: Report generation completes in <10 seconds, file size <5MB

**User Experience Notes**: This report is the key deliverable for proving model quality to clients - must be polished and comprehensive

---

#### UJ5.2.2: Customizing Validation Report Content

* **Description**: User selects which sections and examples to include in validation report, customizing for specific client presentation needs
* **Impact Weighting**: Flexibility / Client Customization / Presentation Quality
* **Priority**: Low
* **User Stories**: US4.2.2 (Generate Training Report PDF)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user preparing client-specific validation report
  - WHEN: They click "Customize Report" before generation
  - THEN: A customization modal displays with options:
    - Include/exclude sections (checkboxes): Executive Summary, Perplexity, EI, Knowledge Retention, Brand Voice, Training Details, Appendix
    - Select EI examples to include (choose 3-10 from best improvements)
    - Choose report branding: Bright Run default / Client-cobranded (if configured)
    - Add custom cover letter or introduction (optional text field)
    - Select detail level: Executive (high-level), Standard (moderate detail), Technical (full details)
  - AND: Preview updates in real-time as options change
  - AND: Save customization as template for future reports
  - AND: Client-cobranded reports include client logo and color scheme (if configured)

**Technical Notes**: Template system with conditional sections, save customization preferences per user

**Data Requirements**: Section toggles, example selections, branding assets, cover letter text

**Error Scenarios**: No sections selected → Validation error; Custom branding assets missing → Fall back to default

**Performance Criteria**: Preview updates in <2 seconds after customization changes

**User Experience Notes**: Default configuration should work for 90% of cases - customization is for special presentations

---

#### UJ5.2.3: Sharing Validation Report Securely

* **Description**: User shares validation report with clients via secure expiring link, tracking who viewed it and when
* **Impact Weighting**: Client Communication / Security / Audit Trail
* **Priority**: Medium
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with generated validation report
  - WHEN: They click "Share Report" button
  - THEN: A sharing modal displays with options:
    - Generate secure link (30-day expiration, default)
    - Send via email directly (enter recipient email)
    - Custom expiration: 7 days / 30 days / 90 days / No expiration
    - Password protection (optional): Require password to view
    - View tracking: Track who opened report and when
  - AND: Secure link format: `https://reports.brightrun.ai/validation/{secure_token}`
  - AND: Link copied to clipboard automatically
  - AND: Email option sends professional message: "Bright Run has shared a validation report for your model..."
  - AND: Report details page shows sharing history: "Shared 2 times, viewed 5 times, last view: 2025-12-18 by client@example.com"
  - AND: User can revoke link access at any time

**Technical Notes**: Generate unique secure token, track view events, enforce expiration

**Data Requirements**: Report file location, secure token, expiration date, view log, recipient emails

**Error Scenarios**: Link expired → Display "This report link has expired. Contact Bright Run for access."; Password incorrect → Retry prompt

**Performance Criteria**: Link generation instant, email delivery within 60 seconds

**User Experience Notes**: Secure sharing builds client trust and enables easy report distribution without emailing large PDFs

---

### 5.3 Deployment Package Creation

#### UJ5.3.1: Setting Up Inference API Template

* **Description**: User accesses API server template (FastAPI) included in deployment package, enabling quick deployment as microservice
* **Impact Weighting**: Client Success / Integration Speed / Developer Experience
* **Priority**: Low
* **User Stories**: US4.3.2 (API Inference Endpoint Template)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user deploying model as API endpoint for client
  - WHEN: They download deployment package and access `api_server/` folder
  - THEN: They find complete API server template:
    - `app.py`: FastAPI application with inference endpoints
    - `Dockerfile`: Container image configuration
    - `docker-compose.yml`: Local testing setup
    - `deploy_guide.md`: Deployment instructions for cloud platforms
  - AND: API includes endpoints:
    - `POST /api/v1/chat`: Send prompt, receive response
    - `GET /api/v1/health`: Health check
    - `GET /api/v1/model-info`: Model metadata
  - AND: Local testing works immediately: `docker-compose up` starts API on localhost:8000
  - AND: Deploy guide covers: AWS ECS, GCP Cloud Run, Azure Container Instances
  - AND: API includes: request validation, rate limiting, authentication (API key), logging
  - AND: Example API request provided: `curl -X POST http://localhost:8000/api/v1/chat -H "Authorization: Bearer key" -d '{"prompt": "..."}'`

**Technical Notes**: FastAPI template with production-ready features, Docker multi-stage build

**Data Requirements**: API template code, deployment configurations, authentication setup

**Error Scenarios**: Docker build fails → Troubleshooting guide in deploy_guide.md

**Performance Criteria**: API startup in <60 seconds, inference latency <2 seconds per response

**User Experience Notes**: Clients can deploy production-ready API without writing API code - significant time savings

---

### 5.4 Client Presentation Materials

#### UJ5.4.1: Creating Before/After Comparison Slides

* **Description**: User exports before/after comparison examples as presentation-ready slides for client demos and sales presentations
* **Impact Weighting**: Sales Enablement / Client Communication / Revenue Impact
* **Priority**: Medium
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user preparing client presentation
  - WHEN: They click "Export Presentation Materials"
  - THEN: They can select export format:
    - PowerPoint (.pptx): Editable slides
    - Google Slides (shareable link)
    - PDF (printable)
  - AND: Presentation includes:
    - Title slide: "Elena Morales AI Model - Quality Validation Results"
    - Metrics overview slide: 4 key metrics with visual indicators
    - 5-10 before/after comparison slides (one scenario per slide)
    - Methodology slide: How validation was performed
    - Conclusion slide: "Production Ready" verdict
  - AND: Each before/after slide shows:
    - Scenario description and emotional context
    - Baseline response (before training)
    - Trained response (after training)
    - Improvement highlights annotated
    - Quality scores: Empathy, Clarity, Appropriateness
  - AND: Bright Run branding included (logo, colors, fonts)
  - AND: Client can edit slides to add their own branding

**Technical Notes**: Generate presentation from template using library (e.g., python-pptx), export to multiple formats

**Data Requirements**: Validation results, selected examples, branding assets, presentation template

**Error Scenarios**: Export fails → Offer alternative format; No examples selected → Use default top 5

**Performance Criteria**: Presentation generation in <15 seconds

**User Experience Notes**: These slides are powerful sales tools - business owners use them to win deals

---

#### UJ5.4.2: Generating Executive Summary One-Pager

* **Description**: User creates single-page executive summary PDF highlighting key quality metrics and business value for stakeholder review
* **Impact Weighting**: Client Communication / Decision Support / Executive Visibility
* **Priority**: Low
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user needing executive-level summary for client stakeholders
  - WHEN: They click "Generate Executive Summary"
  - THEN: A one-page PDF generates with concise, visual layout:
    - Header: "AI Model Quality Validation - Elena Morales Financial Advisory"
    - Key metrics prominently displayed (large numbers):
      - 31% perplexity improvement
      - 41% emotional intelligence improvement
      - 98% knowledge retention
      - 86% brand voice consistency
    - Verdict: "Production Ready for Client Deployment"
    - Business value summary:
      - "Model demonstrates significant quality improvements across all dimensions"
      - "Maintains financial knowledge while improving emotional intelligence"
      - "Consistently delivers on-brand Elena Morales personality"
      - "Ready for production use with confidence"
    - Training efficiency: 13.2 hours, $48.32 total cost
    - Next steps: "Download model artifacts and begin integration testing"
    - Contact information: Bright Run support
  - AND: Design is executive-friendly: minimal text, visual emphasis, clear verdict
  - AND: File naming: `Executive-Summary-Elena-Morales-2025-12-16.pdf`
  - AND: Suitable for printing and email forwarding

**Technical Notes**: Simple one-page template optimized for executive readability

**Data Requirements**: Key metrics, verdict, business value statement, contact info

**Error Scenarios**: Generation fails → Fallback to text-based summary

**Performance Criteria**: Generation in <5 seconds

**User Experience Notes**: Busy executives need one page showing "is this good?" and "what's next?" - no technical details

---

## 6. Optimization, Iteration & Knowledge Building

### 6.1 Training Run Comparison

#### UJ6.1.1: Comparing Multiple Training Runs Side-by-Side

* **Description**: User selects 2-4 training runs and views side-by-side comparison of configurations, metrics, costs to identify best approach
* **Impact Weighting**: Optimization / Data-Driven Decisions / Quality Improvement
* **Priority**: Medium
* **User Stories**: US5.1.1 (Compare Multiple Training Runs)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user who has run multiple training experiments
  - WHEN: They select 2-4 jobs from the job list and click "Compare Selected"
  - THEN: A comparison view displays with:
    - **Overlaid Loss Curves**: All selected jobs on same graph, color-coded by job
    - **Metrics Comparison Table**:
      - Rows: Job 1 (Conservative), Job 2 (Balanced), Job 3 (Aggressive)
      - Columns: Final Training Loss, Final Validation Loss, Perplexity Improvement, EI Improvement, Duration, Cost
      - Best value in each column highlighted green
      - Percentage differences shown: "Job 2: 15% lower loss than Job 1"
    - **Configuration Comparison**:
      - Side-by-side hyperparameters (r, lr, epochs, batch_size, GPU type)
      - Differences highlighted: "Job 1: r=8, Job 2: r=16, Job 3: r=32"
    - **Winner Recommendation**:
      - Algorithm identifies best job based on quality/cost ratio
      - "Recommended: Job 2 (Balanced) - Best quality/cost ratio ($52, 35% perplexity improvement)"
  - AND: Export comparison as PDF report
  - AND: Save successful configuration as reusable template

**Technical Notes**: Fetch data for all selected jobs, render synchronized charts, calculate quality/cost ratios

**Data Requirements**: Job configurations, final metrics, cost data for all selected jobs

**Error Scenarios**: Jobs still running → Show partial results with "in progress" indicator; Too many jobs selected → Limit to 4 maximum

**Performance Criteria**: Comparison view loads in <5 seconds with all charts rendered

**User Experience Notes**: Visual comparison makes it obvious which configuration worked best - supports data-driven iteration

---

#### UJ6.1.2: Analyzing Configuration Performance Trends

* **Description**: User views aggregate analytics showing which configurations produce best results across all team training runs
* **Impact Weighting**: Continuous Improvement / Team Learning / Optimization
* **Priority**: Low
* **User Stories**: US5.1.2 (Configuration Performance Analytics)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A team with 20+ completed training runs
  - WHEN: User navigates to "Training Analytics" dashboard
  - THEN: They see aggregate performance analysis:
    - **Performance by Preset**:
      - Conservative: 98% success rate, $28 avg cost, 0.325 avg final loss, 29% avg perplexity improvement
      - Balanced: 96% success rate, $52 avg cost, 0.298 avg final loss, 34% avg perplexity improvement
      - Aggressive: 92% success rate, $87 avg cost, 0.276 avg final loss, 38% avg perplexity improvement
      - Best performer highlighted
    - **Cost vs Quality Scatter Plot**:
      - X-axis: Final validation loss (lower = better)
      - Y-axis: Total cost (lower = cheaper)
      - Each dot = one training job, color-coded by preset
      - Lower-left quadrant = ideal (low cost, high quality)
    - **Success Rate Trends**: Monthly success rate over time showing improvements
    - **Common Failure Patterns**: Most frequent error types, configurations with highest failure rates
  - AND: Recommendations: "Balanced preset offers best quality/cost ratio for most use cases"
  - AND: Export analytics as CSV for further analysis

**Technical Notes**: Aggregate data from all completed jobs, calculate statistics per preset

**Data Requirements**: All job metrics, configurations, costs, success/failure status

**Error Scenarios**: Insufficient data → Display "Need 10+ jobs for meaningful analytics"

**Performance Criteria**: Analytics dashboard loads in <5 seconds

**User Experience Notes**: Helps team optimize default presets and improve success rates over time

---

### 6.2 Configuration Optimization

#### UJ6.2.1: Creating Reusable Configuration Templates

* **Description**: User saves successful training configurations as named templates that team can reuse for consistent results
* **Impact Weighting**: Team Efficiency / Best Practices / Knowledge Preservation
* **Priority**: Medium
* **User Stories**: US5.2.2 (Configuration Templates Library)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with successful training job (95%+ success rate, good metrics)
  - WHEN: They click "Save as Template" on completed job
  - THEN: Template creation modal displays:
    - Template name (required): "Production Financial Advisory - High Quality"
    - Description (optional): "Best configuration for 200+ conversation emotional intelligence datasets"
    - Include: Hyperparameters, GPU selection, checkpoint frequency
    - Visibility: Private (my templates only) / Team (shared)
    - Tags: production, financial, high-quality, balanced (multi-select + custom)
  - AND: Template saved to library
  - AND: Team members can browse template library:
    - Grid/list view with template cards
    - Each card shows: Name, description, configuration summary, usage count, success rate, average cost
    - Filter by: Creator, tags, visibility
    - Sort by: Name, usage count, success rate, date created
  - AND: "Start from Template" button pre-fills job creation form with template configuration
  - AND: Template analytics track: Usage count, success rate, average metrics

**Technical Notes**: Store templates in database with configuration JSON, track usage via job references

**Data Requirements**: Job configuration, template metadata, usage analytics

**Error Scenarios**: Duplicate template name → Auto-append version number; Template deleted → Jobs created from it unaffected

**Performance Criteria**: Template library loads in <2 seconds

**User Experience Notes**: Templates enable consistent team practices and accelerate job creation for proven configurations

---

#### UJ6.2.2: Receiving Configuration Recommendations

* **Description**: User receives AI-powered recommendations for optimal configuration based on dataset characteristics and historical performance
* **Impact Weighting**: Success Rate / User Guidance / Optimization
* **Priority**: Low
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user creating new training job
  - WHEN: They select training dataset
  - THEN: System analyzes dataset characteristics and provides recommendations:
    - Dataset profile: "242 conversations, high emotional content, quality scores 4.5/5"
    - Recommended configuration:
      - Preset: Balanced (based on dataset size and quality)
      - GPU: Spot instance (non-urgent timeline, cost optimization)
      - Estimated results: "34% perplexity improvement, $52 cost, 13 hours"
    - Reasoning: "Similar datasets (200-300 conversations, high quality) achieved best results with Balanced preset"
    - Alternative options:
      - Conservative: "Faster/cheaper ($30, 10 hours) but slightly lower quality (29% improvement)"
      - Aggressive: "Higher quality (38% improvement) but more expensive ($87, 18 hours)"
  - AND: User can accept recommendation (one-click) or customize manually
  - AND: Recommendations improve over time as more training runs complete
  - AND: Historical success rate shown: "92% of jobs matching this recommendation succeeded"

**Technical Notes**: Machine learning model or rules engine analyzing dataset characteristics and historical outcomes

**Data Requirements**: Dataset metadata, historical job performance, configuration-to-outcome mappings

**Error Scenarios**: Insufficient historical data → Provide default preset recommendation only

**Performance Criteria**: Recommendation generation in <2 seconds

**User Experience Notes**: Reduces decision paralysis for new users while giving experienced users full control

---

### 6.3 Team Knowledge Sharing

#### UJ6.3.1: Documenting Experiment Notes and Learnings

* **Description**: User adds detailed notes to training jobs documenting hypothesis, observations, and learnings for team knowledge building
* **Impact Weighting**: Knowledge Preservation / Team Learning / Continuous Improvement
* **Priority**: Medium
* **User Stories**: US8.3.1 (Job Notes and Experiment Documentation)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user running training experiment or documenting results
  - WHEN: They access the job notes section (creation form or job details page)
  - THEN: They see notes fields with Markdown support:
    - **Initial Notes** (added at job creation):
      - Placeholder: "Document your hypothesis and expected outcomes..."
      - Example: "Testing aggressive LR (3e-4) on high-emotion dataset to improve empathy scores. Hypothesis: Higher LR will capture emotional nuances better."
    - **Progress Notes** (added during/after training):
      - Add observations: "Update: Loss plateaued at epoch 2.5, suggesting optimal stopping point"
      - Multiple timestamped updates supported
    - **Final Learnings** (added after completion):
      - "Conclusion: 42% empathy improvement achieved. Aggressive LR worked well but required careful monitoring for overfitting."
  - AND: Notes are searchable across all jobs
  - AND: Notes appear in job comparison views and exported reports
  - AND: Rich formatting supported: headings, lists, links, code blocks
  - AND: Edit history tracked with timestamps

**Technical Notes**: Store notes as Markdown in database, render as formatted HTML, full-text search enabled

**Data Requirements**: Note text, timestamps, user attribution, job references

**Error Scenarios**: Note save fails → Auto-save draft locally; Notes too long → Warn at 5000 characters

**Performance Criteria**: Note updates save in <1 second, search returns results in <2 seconds

**User Experience Notes**: Encourage documentation culture - "What did you learn?" helps team avoid repeating mistakes and build on successes

---

#### UJ6.3.2: Building Team Knowledge Base

* **Description**: User contributes successful training configurations and learnings to searchable team knowledge base for onboarding and reference
* **Impact Weighting**: Team Learning / Onboarding / Knowledge Retention
* **Priority**: Low
* **User Stories**: US8.3.2 (Team Knowledge Base Integration)
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A user with successful training job containing valuable learnings
  - WHEN: They click "Add to Knowledge Base"
  - THEN: Knowledge base entry creation form displays:
    - Title: Auto-populated from job name, editable
    - Category: Best Practices / Experiments / Client Deliveries / Troubleshooting / Other
    - Tags: Multi-select + custom (high-emotion, financial, aggressive-lr, spot-instances, etc.)
    - Content: Auto-populated from job notes, editable with Markdown
    - Related jobs: Link to this job and similar successful jobs
    - Key learnings: "What worked, what didn't, what to try next"
  - AND: Knowledge base is searchable: "How to train emotional intelligence models"
  - AND: Search results show relevant entries with excerpts
  - AND: Clicking entry shows full content + linked jobs
  - AND: New engineers can browse knowledge base during onboarding
  - AND: Auto-suggest when creating job: "Similar setup succeeded in Job XYZ [View Knowledge Base Article]"

**Technical Notes**: Knowledge base entries stored separately from jobs, many-to-many relationship with jobs

**Data Requirements**: Entry content, category, tags, related job IDs, search index

**Error Scenarios**: Search returns no results → Suggest creating first knowledge base entry

**Performance Criteria**: Search results in <2 seconds, full-text search across all entries

**User Experience Notes**: Knowledge base becomes team "playbook" - new members quickly learn what works without reinventing the wheel

---

### 6.4 Continuous Improvement

#### UJ6.4.1: Tracking Quality Metrics Over Time

* **Description**: User views historical trend charts showing quality metric improvements across training runs to measure progress
* **Impact Weighting**: Continuous Improvement / Performance Tracking / Team Goals
* **Priority**: Low
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A team with 10+ completed training runs over time
  - WHEN: User navigates to "Quality Trends" dashboard
  - THEN: They see trend charts showing improvement over time:
    - **Perplexity Improvement Trend**: Line chart, each point = training run, shows trend increasing from 25% → 35% over 3 months
    - **EI Improvement Trend**: Shows consistent 35-45% range with occasional outliers
    - **Success Rate Trend**: Shows improvement from 88% → 96% as team learns better configurations
    - **Cost Efficiency Trend**: Average cost per run decreasing from $65 → $48 as team optimizes
  - AND: Filters available: Date range, creator, preset, dataset type
  - AND: Milestone markers: "Switched to Balanced preset default", "Added auto-recovery", "Optimized checkpoint frequency"
  - AND: Goal tracking: "Team goal: 95% success rate - Currently: 96% Goal achieved!"
  - AND: Export trends as CSV or PNG charts for team reports

**Technical Notes**: Aggregate metrics across jobs, calculate moving averages, identify trends

**Data Requirements**: All job metrics with timestamps, team goals configuration

**Error Scenarios**: Insufficient data for trends → Display "Need 10+ jobs to show trends"

**Performance Criteria**: Trends dashboard loads in <5 seconds with all charts

**User Experience Notes**: Visualizing progress motivates team and demonstrates continuous improvement to stakeholders

---

#### UJ6.4.2: Setting and Tracking Team Goals

* **Description**: User defines team goals for success rate, quality metrics, cost efficiency and tracks progress toward those goals
* **Impact Weighting**: Team Alignment / Performance Management / Strategic Focus
* **Priority**: Low
* **User Stories**: [US reference to be added]
* **Tasks**: [T reference to be added]
* **User Journey Acceptance Criteria**:
  - GIVEN: A team lead wanting to drive performance improvement
  - WHEN: They navigate to "Team Goals" settings
  - THEN: They can configure goals:
    - Success rate target: 95% (current: 96%)
    - Average perplexity improvement target: ≥35% (current: 34% close)
    - Average cost per job target: ≤$50 (current: $52 slightly over)
    - Monthly training runs target: ≥10 (current: 12)
  - AND: Dashboard shows progress toward each goal:
    - Visual progress bars
    - Status indicators: Achieved, Close, Needs improvement
    - Trend: Improving / Stable / Declining
  - AND: Recommendations when goal not met: "Average cost is $52 vs target $50. Increase spot instance usage (currently 75%) to reduce costs."
  - AND: Team members see goals on dashboard as motivation
  - AND: Monthly goal reports generated automatically for stakeholders

**Technical Notes**: Calculate current performance from recent jobs (trailing 30 days), compare to targets

**Data Requirements**: Goal configurations, recent job metrics, trend calculations

**Error Scenarios**: No goals set → Display default recommended goals

**Performance Criteria**: Goal dashboard updates daily, calculations complete in <1 second

**User Experience Notes**: Goals drive accountability and continuous improvement - celebrate when achieved, action plan when missed

---

## Cross-Stage Integration

### User Journey Flow

The six stages of the user journey create a cohesive progression from discovery to continuous optimization:

**Stage 1 → Stage 2**: Understanding platform capabilities leads directly to confident job configuration
- User learns platform eliminates 40-hour manual setup → Motivated to start first job quickly
- Budget transparency in Stage 1 → Informed cost decisions in Stage 2
- Training file quality understanding → Better dataset selection

**Stage 2 → Stage 3**: Clear configuration leads to confident monitoring
- Accurate cost estimates set expectations → Real-time tracking confirms predictions
- Preset selection (Conservative/Balanced/Aggressive) → Predictable training duration
- Configuration review → Fewer failures, smooth execution

**Stage 3 → Stage 4**: Successful training enables comprehensive validation
- Training completes without errors → Automatic validation initiates
- Real-time metrics during training → Validation results expected and understood
- Cost tracking → Validation cost included in total budget

**Stage 4 → Stage 5**: Quality validation enables confident delivery
- Validation passes all thresholds → Model artifacts ready for download
- Comprehensive quality metrics → Professional validation reports generated
- Client-ready proof → Deployment packages delivered with confidence

**Stage 5 → Stage 6**: Delivery success drives optimization and iteration
- First successful delivery → Compare configurations to improve next run
- Quality reports identify gaps → Iterate with better training data
- Team knowledge builds → New members onboard faster with proven templates

### Value Amplification

Each stage amplifies value delivered in previous stages:

**Cumulative Time Savings**:
- Stage 1: No manual research time (vs 2-4 hours exploring GPU options)
- Stage 2: <10 minute configuration (vs 40 hours manual setup)
- Stage 3: Automated monitoring (vs checking SSH logs every hour for 12-20 hours)
- Stage 4: Automated validation (vs days of manual testing)
- Stage 5: One-click artifact download (vs packaging files manually)
- Stage 6: Template reuse (vs reconfiguring each time)
- **Total time savings per run: 40+ hours → <30 minutes of active user time**

**Cumulative Cost Optimization**:
- Stage 1: Budget awareness prevents overages
- Stage 2: Spot instance selection (70% savings vs on-demand)
- Stage 3: Real-time cost tracking enables early cancellation if needed
- Stage 4: Validation prevents wasting client deployment time on low-quality models
- Stage 5: No rework costs (quality proven before delivery)
- Stage 6: Configuration optimization reduces future costs
- **Total cost efficiency: $6k-10k outsourcing → <$75 per run, 3-5x revenue multiplier**

**Cumulative Confidence Building**:
- Stage 1: Platform understanding → "This looks accessible"
- Stage 2: Easy configuration → "I can do this"
- Stage 3: Real-time visibility → "Training is working correctly"
- Stage 4: Objective quality metrics → "This model is actually good"
- Stage 5: Professional deliverables → "I can present this to clients"
- Stage 6: Proven repeatability → "I can scale this business"

### Development Efficiency

The stage progression also optimizes development effort:

**Early Stages (1-2) - Immediate Value, Low Investment**:
- Stage 1: Static content, documentation, UI mockups (1-2 weeks)
- Stage 2: Configuration forms, validation, database setup (2-3 weeks)
- **Early proof-of-concept: Users can configure jobs in <10 minutes** (validate value proposition)

**Middle Stages (3-4) - Core Functionality**:
- Stage 3: RunPod integration, real-time monitoring, job control (4-6 weeks)
- Stage 4: Validation suite, quality benchmarks, reporting (4-5 weeks)
- **MVP complete: End-to-end training with quality proof** (first revenue possible)

**Later Stages (5-6) - Value Maximization**:
- Stage 5: Artifact packaging, deployment templates, client materials (2-3 weeks)
- Stage 6: Analytics, templates, knowledge base, optimization tools (3-4 weeks)
- **Platform maturity: Full competitive differentiation** (premium pricing justified)

### Data Flow

Data flows seamlessly across stages:

1. **Training File Selection** (Stage 2) → **Preprocessing** (Stage 3) → **Validation Dataset** (Stage 4)
2. **Cost Estimates** (Stage 2) → **Real-Time Cost Tracking** (Stage 3) → **Final Cost Reports** (Stage 5)
3. **Job Configuration** (Stage 2) → **Training Execution** (Stage 3) → **Configuration Templates** (Stage 6)
4. **Training Metrics** (Stage 3) → **Quality Validation** (Stage 4) → **Validation Reports** (Stage 5)
5. **Job Metadata** (Stage 2) → **Event Logs** (Stage 3) → **Knowledge Base** (Stage 6)

### Progressive Enhancement

Each stage can be enhanced independently without breaking the flow:

**Stage 1 Enhancements**:
- Interactive cost calculators
- Video tutorials and demos
- Client success stories
- ROI calculators

**Stage 2 Enhancements**:
- Custom hyperparameter tuning (beyond presets)
- Multi-dataset training
- Advanced scheduling options
- Team approval workflows

**Stage 3 Enhancements**:
- Websocket real-time updates (vs polling)
- Advanced visualization (TensorBoard integration)
- Predictive failure detection
- Pause/resume functionality

**Stage 4 Enhancements**:
- Custom validation test suites
- A/B testing frameworks
- Client-specific quality rubrics
- Automated regression testing

**Stage 5 Enhancements**:
- API endpoint hosting (managed inference)
- Model versioning and rollback
- Deployment automation (CI/CD integration)
- Client portal for self-service access

**Stage 6 Enhancements**:
- Automated hyperparameter optimization
- Ensemble model comparison
- Advanced analytics and BI dashboards
- Integration with external knowledge management systems

---

## Acceptance Criteria Inventory

This section consolidates all acceptance criteria across user journey elements, organized for implementation planning.

### Critical Path Acceptance Criteria (Must-Have for MVP)

**Configuration & Setup (Stage 1-2):**
1. UJ1.2.1: Display training file list with metadata (conversation count, quality scores) - **Priority: High**
2. UJ2.1.1: Select training dataset from dropdown with quality indicators - **Priority: High**
3. UJ2.2.1: Choose hyperparameter preset (Conservative/Balanced/Aggressive) with clear descriptions - **Priority: High**
4. UJ2.3.1: Select spot vs on-demand GPU with cost comparison - **Priority: High**
5. UJ2.3.2: Display real-time cost estimate updating as configuration changes - **Priority: High**
6. UJ2.4.2: Show configuration summary and confirmation before job start - **Priority: High**

**Training Execution (Stage 3):**
7. UJ3.1.1: Provision GPU and display status updates (provisioning → training) - **Priority: High**
8. UJ3.2.1: Display live loss curves updating every 60 seconds - **Priority: High**
9. UJ3.2.3: Show overall progress percentage, current step, estimated remaining time - **Priority: High**
10. UJ3.2.4: Display real-time cost accumulation with budget status indicators - **Priority: High**
11. UJ3.3.1: Provide clear OOM error messages with specific fix recommendations - **Priority: High**
12. UJ3.3.4: Automatically recover from spot interruptions using checkpoints - **Priority: High**
13. UJ3.4.1: Allow user to cancel active job with cost summary and confirmation - **Priority: High**

**Quality Validation (Stage 4):**
14. UJ4.1.1: Automatically initiate validation suite after training completes - **Priority: High**
15. UJ4.1.2: Display overall quality dashboard with 4 key score cards - **Priority: High**
16. UJ4.2.1: Calculate and display perplexity improvement percentage - **Priority: High**
17. UJ4.3.1: Show emotional intelligence benchmark results with improvement percentage - **Priority: High**

**Delivery (Stage 5):**
18. UJ5.1.1: One-click download of LoRA adapter files (ZIP with adapters, config, README) - **Priority: High**
19. UJ5.2.1: Generate comprehensive validation report as PDF - **Priority: High**

### High-Priority Enhancement Criteria (Post-MVP, High Value)

**Configuration & Setup:**
20. UJ1.3.1: Display GPU pricing, typical job costs, and cost optimization strategies - **Priority: High**
21. UJ1.3.2: Configure monthly budget limits with alert thresholds (80%, 95%, 100%) - **Priority: High**
22. UJ2.1.2: Explain dataset impact on training outcomes with tooltips - **Priority: Medium**

**Training Execution:**
23. UJ3.2.2: Display current training metrics with health indicators - **Priority: High**
24. UJ3.2.5: Provide chronological event log with filtering and search - **Priority: Medium**
25. UJ3.3.2: Show specific dataset format errors with fix instructions - **Priority: High**
26. UJ3.3.3: Handle GPU provisioning failures with auto-retry and fallback options - **Priority: High**
27. UJ3.3.5: Allow manual resume from checkpoint with configuration adjustments - **Priority: Medium**
28. UJ3.4.2: Display all training jobs with powerful filtering and sorting - **Priority: High**

**Quality Validation:**
29. UJ4.3.2: Show before/after response examples demonstrating EI improvements - **Priority: High**
30. UJ4.3.3: Identify and flag emotional intelligence regressions - **Priority: Medium**
31. UJ4.4.1: Verify financial knowledge retention ≥95% - **Priority: Medium**
32. UJ4.5.1: Evaluate brand voice consistency on Elena Morales rubric - **Priority: Medium**

**Delivery:**
33. UJ5.1.2: Provide complete deployment package with inference script and documentation - **Priority: Medium**
34. UJ5.2.2: Allow customization of validation report content and branding - **Priority: Low**
35. UJ5.4.1: Export before/after comparisons as presentation slides - **Priority: Medium**

### Medium-Priority Feature Criteria (Nice-to-Have)

**Configuration & Setup:**
36. UJ1.1.2: Provide demo/sample training jobs for exploration - **Priority: Medium**
37. UJ2.2.2: Explain hyperparameter tradeoffs with visual comparison charts - **Priority: Medium**

**Training Execution:**
38. UJ3.3.6: One-click retry of failed job with same configuration - **Priority: Medium**
39. UJ3.3.7: Retry failed job with system-suggested configuration fixes - **Priority: Medium**
40. UJ3.4.3: Display training queue with estimated start times - **Priority: Medium**

**Quality Validation:**
41. UJ4.2.2: Analyze perplexity breakdown by persona, arc, and topic - **Priority: Medium**
42. UJ4.4.2: Review specific failed knowledge questions with pattern analysis - **Priority: Low**
43. UJ4.5.2: Show brand voice example responses with characteristic annotations - **Priority: Low**

**Delivery:**
44. UJ5.1.3: Provide file checksums for download integrity verification - **Priority: Low**
45. UJ5.2.3: Share validation reports via secure expiring links with tracking - **Priority: Medium**
46. UJ5.4.2: Generate executive summary one-pager for stakeholders - **Priority: Low**

**Optimization (Stage 6):**
47. UJ6.1.1: Compare 2-4 training runs side-by-side with winner recommendation - **Priority: Medium**
48. UJ6.2.1: Create reusable configuration templates from successful jobs - **Priority: Medium**
49. UJ6.3.1: Add experiment notes and learnings to jobs with Markdown support - **Priority: Medium**

### Low-Priority / Future Enhancement Criteria

**Configuration & Setup:**
50. UJ1.1.1: Interactive onboarding wizard with value proposition - **Priority: Medium** (enhance existing)

**Training Execution:**
51. UJ3.4.4: Share job details with team via secure links - **Priority: Low**

**Delivery:**
52. UJ5.3.1: Provide FastAPI template for deploying model as API endpoint - **Priority: Low**

**Optimization (Stage 6):**
53. UJ6.1.2: Display aggregate analytics on configuration performance trends - **Priority: Low**
54. UJ6.2.2: Provide AI-powered configuration recommendations based on dataset - **Priority: Low**
55. UJ6.3.2: Build searchable team knowledge base from successful jobs - **Priority: Low**
56. UJ6.4.1: Track quality metrics over time with trend charts - **Priority: Low**
57. UJ6.4.2: Set and track team goals for success rate and cost efficiency - **Priority: Low**

### Acceptance Criteria by Development Effort

**Low Effort (1-3 days implementation):**
- UJ2.4.1: Job metadata fields (name, description, notes, tags)
- UJ3.4.1: Cancel job button with confirmation modal
- UJ5.1.3: File checksums display
- UJ6.3.1: Job notes with Markdown rendering

**Medium Effort (4-10 days implementation):**
- UJ1.2.1: Training file list with metadata
- UJ2.2.1: Hyperparameter preset selection UI
- UJ2.3.2: Real-time cost estimation
- UJ3.2.1: Live loss curve visualization
- UJ3.2.3: Progress tracking and time estimation
- UJ3.4.2: Job list with filtering and sorting
- UJ4.1.2: Quality dashboard with 4 score cards
- UJ5.2.1: PDF validation report generation
- UJ6.1.1: Side-by-side job comparison
- UJ6.2.1: Configuration template system

**High Effort (11-20 days implementation):**
- UJ3.1.1: GPU provisioning integration with RunPod
- UJ3.2.4: Real-time cost tracking during training
- UJ3.3.4: Automatic checkpoint recovery from spot interruptions
- UJ4.1.1: Automated validation suite orchestration
- UJ4.2.1: Perplexity benchmarking calculation
- UJ4.3.1: Emotional intelligence evaluation (50 scenarios)
- UJ5.1.2: Deployment package generation
- UJ5.3.1: FastAPI template creation

**Very High Effort (20+ days implementation):**
- UJ3.3.1-3.3.3: Comprehensive error handling system (OOM, dataset, GPU)
- UJ4.3.3: Regression detection across all quality dimensions
- UJ4.4.1: Catastrophic forgetting detection (100 questions)
- UJ4.5.1: Brand voice evaluation (30 responses, 10 characteristics)
- UJ6.1.2: Configuration performance analytics and trends
- UJ6.3.2: Team knowledge base with auto-suggestions

### Risk Assessment by Acceptance Criteria

**High Risk (Technical Complexity or External Dependencies):**
- UJ3.1.1: GPU provisioning reliability (RunPod API integration)
- UJ3.3.4: Checkpoint recovery reliability (state management, storage)
- UJ4.1.1: Validation suite performance (inference at scale)
- UJ4.2.1: Perplexity calculation accuracy (requires baseline model hosting)
- UJ4.3.1: EI evaluation consistency (human review or LLM-as-judge reliability)

**Medium Risk (Performance or Scale Concerns):**
- UJ3.2.1: Loss curve real-time updates at scale (100+ concurrent jobs)
- UJ3.2.4: Real-time cost tracking accuracy (spot interruption overhead)
- UJ4.4.1: Knowledge retention test performance (100 questions × 2 models)
- UJ5.2.1: PDF generation performance (large reports with charts)
- UJ6.1.1: Multi-job comparison with large datasets

**Low Risk (Standard CRUD or UI):**
- UJ1.2.1: Training file display (database query + UI)
- UJ2.2.1: Preset selection (static configuration + UI)
- UJ2.4.2: Configuration summary (data aggregation + UI)
- UJ3.4.2: Job list with filters (database query + pagination)
- UJ6.2.1: Template creation (database CRUD)

---

## Implementation Guidance

### Development Sequence (Recommended)

**Phase 1: Foundation & Core Configuration (Weeks 1-4)**
- Implement database schema for training jobs, configurations, metrics
- Build job creation form with preset selection (UJ2.1.1, UJ2.2.1)
- Implement real-time cost estimation (UJ2.3.2)
- Create configuration review and confirmation (UJ2.4.2)
- **Deliverable**: Users can configure jobs and see accurate cost estimates

**Phase 2: Training Execution & Monitoring (Weeks 5-10)**
- Integrate RunPod API for GPU provisioning (UJ3.1.1)
- Build real-time progress dashboard with loss curves (UJ3.2.1, UJ3.2.3)
- Implement cost tracking during training (UJ3.2.4)
- Add job control (cancel functionality) (UJ3.4.1)
- Build job list with filtering (UJ3.4.2)
- **Deliverable**: Users can start jobs, monitor progress in real-time, and cancel if needed

**Phase 3: Error Handling & Recovery (Weeks 11-14)**
- Implement checkpoint system for spot recovery (UJ3.3.4)
- Build error detection and messaging (OOM, dataset, GPU) (UJ3.3.1-3.3.3)
- Add manual resume from checkpoint (UJ3.3.5)
- Implement retry mechanisms (UJ3.3.6, UJ3.3.7)
- **Deliverable**: 95%+ success rate with automatic recovery and clear error guidance

**Phase 4: Quality Validation (Weeks 15-20)**
- Build validation suite orchestration (UJ4.1.1)
- Implement perplexity benchmarking (UJ4.2.1)
- Create emotional intelligence evaluation (UJ4.3.1, UJ4.3.2)
- Add knowledge retention testing (UJ4.4.1)
- Build brand voice evaluation (UJ4.5.1)
- Create quality dashboard (UJ4.1.2)
- **Deliverable**: Automated quality validation proving 40%+ improvements

**Phase 5: Delivery & Reporting (Weeks 21-24)**
- Implement adapter download (UJ5.1.1)
- Build validation report PDF generation (UJ5.2.1)
- Create deployment package (UJ5.1.2)
- Add presentation material export (UJ5.4.1)
- **Deliverable**: Complete client-ready deliverables package

**Phase 6: Optimization & Knowledge Building (Weeks 25-28)**
- Build job comparison tool (UJ6.1.1)
- Implement configuration templates (UJ6.2.1)
- Add experiment notes and documentation (UJ6.3.1)
- Create analytics dashboard (UJ6.1.2)
- **Deliverable**: Team can optimize and iterate based on data-driven insights

### MVP Delineation

**Minimum Viable Product (MVP) Scope:**

*Goal: Prove core value proposition - transform dataset into validated trained model in <10 minutes of user time*

**MVP Must-Haves:**
1. Job configuration with 3 presets (UJ2.2.1)
2. Training file selection (UJ1.2.1, UJ2.1.1)
3. Spot/on-demand GPU selection (UJ2.3.1)
4. Real-time cost estimation (UJ2.3.2)
5. Configuration confirmation (UJ2.4.2)
6. GPU provisioning and job start (UJ3.1.1)
7. Real-time progress monitoring (loss curves, progress %, cost) (UJ3.2.1, UJ3.2.3, UJ3.2.4)
8. Cancel job functionality (UJ3.4.1)
9. Automatic spot recovery (UJ3.3.4)
10. Basic error messages (OOM, GPU) (UJ3.3.1, UJ3.3.3)
11. Perplexity validation (UJ4.2.1)
12. EI validation (UJ4.3.1)
13. Quality dashboard (UJ4.1.2)
14. Adapter download (UJ5.1.1)
15. Basic validation report (UJ5.2.1)

**Excluded from MVP (Post-Launch):**
- Advanced error handling (dataset format) - UJ3.3.2
- Manual checkpoint resume - UJ3.3.5
- Retry mechanisms - UJ3.3.6, UJ3.3.7
- Job list filtering - UJ3.4.2 (start with simple list)
- Category perplexity analysis - UJ4.2.2
- Regression detection - UJ4.3.3
- Knowledge retention - UJ4.4.1 (validate with manual testing initially)
- Brand voice validation - UJ4.5.1 (validate with manual review initially)
- Deployment package - UJ5.1.2
- Presentation exports - UJ5.4.1
- All Stage 6 optimization features - UJ6.x.x

**MVP Success Criteria:**
- First $20k trained model sale within 8 weeks of MVP launch
- 90%+ training success rate on MVP feature set
- Users complete configuration in <10 minutes
- Cost predictability within ±20% (tighten to ±15% post-MVP)
- Validation reports demonstrate ≥30% perplexity and ≥35% EI improvement

### Technical Spikes Recommended

**Spike 1: RunPod API Integration & Reliability (Week 1-2 of Phase 2)**
- Goal: Validate GPU provisioning reliability and webhook consistency
- Questions to answer:
  - How long does spot instance provisioning actually take?
  - What is real spot interruption rate?
  - How reliable are RunPod webhooks for status updates?
  - Can we achieve <5 minute provisioning SLA 95% of the time?
- Output: Decision on RunPod as provider or evaluate alternatives

**Spike 2: Real-Time Progress Updates Architecture (Week 3 of Phase 2)**
- Goal: Determine best approach for real-time dashboard updates
- Questions to answer:
  - Polling vs websockets for loss curve updates?
  - Can we achieve <60 second update latency with polling?
  - What is database query performance impact at 100 concurrent jobs?
  - Do we need Redis/caching for real-time data?
- Output: Architecture decision document for real-time monitoring

**Spike 3: Validation Suite Performance (Week 1-2 of Phase 4)**
- Goal: Validate performance and cost of automated validation
- Questions to answer:
  - How long does perplexity calculation take on 48 validation conversations?
  - What compute resources needed for 50 EI scenario evaluations?
  - Can we run validation on same GPU as training or need separate instance?
  - What is cost of baseline model hosting (Llama 3 70B)?
- Output: Validation architecture and cost model

**Spike 4: PDF Report Generation (Week 1 of Phase 5)**
- Goal: Select PDF generation technology and validate performance
- Questions to answer:
  - Headless browser (Puppeteer) vs Python library (WeasyPrint) vs cloud service?
  - Can we generate 20-page report with charts in <10 seconds?
  - What is complexity of chart rendering in PDF?
  - Do we need template preprocessing/caching?
- Output: PDF generation technology selection and implementation plan

**Spike 5: Checkpoint Recovery Reliability (Week 1 of Phase 3)**
- Goal: Validate checkpoint system can reliably recover training state
- Questions to answer:
  - What is checkpoint file size and upload time to Supabase Storage?
  - Can we resume training with bit-identical state after interruption?
  - What is recovery time from checkpoint (download + load)?
  - How often should we checkpoint (every 50 steps? 100 steps?)?
- Output: Checkpoint strategy and recovery time SLA

### Dependencies & Sequencing Rationale

**Why Configuration Before Execution:**
- Configuration UI/UX must be refined first to minimize failed jobs
- Cost estimation formulas need validation before real training runs
- Preset definitions inform training script implementation

**Why Error Handling After Core Execution:**
- Need real training failures to identify error patterns
- Error messages informed by actual user confusion points
- Checkpoint system complexity justified only after seeing spot interruption frequency

**Why Validation After Execution:**
- Training must complete successfully before validation makes sense
- Validation metrics inform what to track during training
- Can manually validate first 5-10 models while building automated suite

**Why Delivery After Validation:**
- No point packaging artifacts if quality unproven
- Validation report content drives artifact packaging decisions
- Client presentation materials depend on validation results

**Why Optimization Last:**
- Need 10-20 completed jobs before comparison/analytics add value
- Templates based on proven successful configurations
- Knowledge base requires mature product with established patterns

**Critical Path Items (Block Everything):**
1. Database schema design (must be right upfront)
2. RunPod API integration (all training depends on this)
3. Cost calculation formula (affects all budgeting features)
4. Checkpoint system architecture (affects training reliability)

**Parallel Workstreams (Can Proceed Independently):**
- UI/UX development (Phases 1-2)
- Validation suite development (Phase 4) - can build alongside execution
- Report generation (Phase 5) - can build templates early
- Analytics/optimization (Phase 6) - can build with sample data

---

**Document End**

*This comprehensive user journey document defines the complete end-to-end experience for the LoRA Training Infrastructure Module, from initial platform discovery through continuous optimization. Each user journey element includes detailed GIVEN-WHEN-THEN acceptance criteria, technical notes, data requirements, error scenarios, and performance criteria to guide development.*

*The document maps to user stories from `02-pipeline-user-stories.md` and will inform task creation and functional requirements. Priority rankings and development effort indicators support implementation planning and MVP scoping.*

*Total User Journey Elements: 57*
*Total Acceptance Criteria: 200+*
*Target Audience: Smart 10th grader with AI basics*
*Ready for: Development team review and implementation planning*
