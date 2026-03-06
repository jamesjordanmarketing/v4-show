# LoRA Training Infrastructure Module - Product Overview Document
**Version:** 1.0  
**Date:** 12-15-2025  
**Category:** AI Model Training Infrastructure  
**Product Abbreviation:** pipeline

**Source References:**
- Seed Narrative: `pmc/product/00-pipeline-seed-narrative.md`
- Template: `pmc/product/_templates/01-overview-template.md`
- Example: `pmc/product/_examples/00-train-seed-narrative.md`
- Current Codebase: `src/` (Next.js 14 + Supabase)
- Training File Service: `src/lib/services/training-file-service.ts`
- Conversation Service: `src/lib/conversation-service.ts`

---

## Product Summary & Value Proposition

### What Problem Does This Product Solve?

**Core Problem**: Bright Run generates exceptional training conversations with sophisticated emotional intelligence scaffolding (242 conversations, 1,567 training pairs) but has no way to prove they work. Clients ask "How do I know this dataset will improve my AI?" and we can't answer with data. Without the ability to train models on our datasets, we're selling raw ingredients without recipes—hoping clients figure out how to cook with them while competing AI studios deliver complete, tested solutions.

**Technical Bottleneck**: Training LoRA models requires specialized GPU setup (Docker + CUDA + PyTorch), manual monitoring via SSH, expertise in hyperparameter tuning, and days of engineering time per run. Current alternatives are manual, error-prone, expensive ($6k-10k engineer fees for outsourcing), and don't scale beyond 1-2 training runs per month.

**Business Gap**: We leave 3-5x revenue on the table, selling $5k datasets when we could sell $15k-30k proven models with measurable improvements. Competitors who offer complete AI solutions (training + validation) consistently win deals we lose.

### Core Purpose

The LoRA Training Infrastructure Module transforms Bright Run from a high-quality dataset factory into a complete AI studio capable of:

1. **Training** custom Llama 3 70B LoRA models on RunPod H100 GPUs with one-click orchestration
2. **Validating** model improvements with automated benchmarks (perplexity, emotional intelligence, brand voice)
3. **Delivering** proven AI solutions with before/after comparisons showing 40%+ improvements in emotional intelligence

### Business Value Delivered

- **Revenue Multiplier**: Transform $5k-10k dataset sales into $15k-30k trained model deliveries (3-5x increase)
- **Competitive Differentiation**: Position as full-service AI studio (training + validation) vs data-only vendors
- **Client Confidence**: Provide measurable proof (validation reports) instead of "trust us, it's good data"
- **Market Expansion**: Serve clients who need complete solutions, not DIY datasets requiring technical expertise
- **Cost Efficiency**: $50-75 per training run (spot instances) vs $6k-10k outsourcing costs
- **Team Productivity**: 3 hours engineer configuration vs 40 hours manual GPU setup
- **Weekend Freedom**: Unattended training with checkpoint recovery and completion notifications

### How It Fits Into the Larger Ecosystem

The LoRA Training Infrastructure completes the **Bright Run AI Studio Pipeline**:

1. **Document Categorization Module** (✅ Complete) → Analyze and categorize business documents by training value
2. **Chunk Extraction Module** (✅ Complete) → Extract semantic chunks with 60 dimensional metadata
3. **Conversation Generation Module** (✅ Complete) → Generate 242 production-ready conversations with emotional intelligence scaffolding
4. **Training File Service** (✅ Complete) → Aggregate conversations into structured JSON/JSONL training files
5. **LoRA Training Infrastructure** (🚧 This Module) → Train, validate, and deliver proven Llama 3 70B models
6. **Future: Model Deployment Module** (📋 Planned) → One-click deployment to client infrastructure

---

## Target Audience & End Users

### Primary Users

#### 1. AI Engineers & Technical Leads (Daily Users)
- **Who They Are**: Engineers responsible for training model configuration, job monitoring, troubleshooting failures, and delivering trained models to clients
- **Key Responsibilities**: 
  - Configure training jobs (hyperparameters, GPU selection, cost estimation)
  - Monitor training progress (loss curves, metrics, estimated completion)
  - Handle failures (diagnose errors, retry with adjustments)
  - Download and validate model artifacts
  - Generate client-ready validation reports
- **Technical Expertise Level**: Intermediate (familiar with AI/ML concepts but not necessarily LoRA experts)
- **Current Workflow Pain**: Must manually set up Docker containers, configure Python scripts, SSH into GPU instances, monitor logs via command line, debug OOM errors, restart failed runs from scratch
- **Desired Workflow**: Select dataset → Choose preset (Conservative/Balanced/Aggressive) → See cost estimate → Click "Start Training" → Monitor dashboard → Download adapters when complete

#### 2. Business Owners & Founders (Strategic Users)
- **Who They Are**: Bright Run leadership responsible for revenue growth, competitive positioning, and client relationships
- **Key Responsibilities**:
  - Price and sell trained model solutions (not just datasets)
  - Demonstrate ROI to clients with validation reports
  - Manage training budget and profitability
  - Differentiate from competitors in sales conversations
- **Technical Expertise Level**: Business-focused (understand AI value, not implementation details)
- **Current Workflow Pain**: Cannot prove dataset quality → Lose deals to "show me it works" objections → Leave 3-5x revenue on table selling datasets instead of models
- **Desired Workflow**: Review validation reports showing 40%+ improvements → Share proof with clients → Close premium deals with confidence

#### 3. Quality Analysts & QA Team (Validation Users)
- **Who They Are**: Team members responsible for validating model quality, ensuring brand voice consistency, and preventing regressions
- **Key Responsibilities**:
  - Run validation benchmarks (perplexity, emotional intelligence, catastrophic forgetting checks)
  - Compare baseline vs trained model outputs
  - Evaluate brand voice alignment (Elena Morales personality consistency)
  - Generate client-ready quality reports
- **Technical Expertise Level**: Intermediate (understand quality metrics, may not code)
- **Current Workflow Pain**: No systematic validation framework → Manual testing on ad-hoc examples → Cannot quantify improvements → No confidence in delivery quality
- **Desired Workflow**: Training completes → Automatic validation runs → Review metrics dashboard → Export PDF report for client → Approve/reject model delivery

### Pain Points

#### Daily User Pain Points (AI Engineers)
1. **Manual Setup Complexity**: 40 hours to set up Docker + CUDA + PyTorch + model caching + training scripts per environment
2. **Zero Visibility During Training**: Once training starts, no progress indicators—"is loss decreasing or is it stuck?"—leading to anxiety and wasted GPU hours
3. **OOM Errors & Debugging**: "Out of memory" errors require guessing which hyperparameter to adjust (batch size? sequence length? gradient accumulation?)
4. **Spot Instance Interruptions**: 10-30% chance of interruption → lose all progress → restart from scratch → double the cost
5. **Cost Unpredictability**: GPU costs vary wildly ($2.49-7.99/hr) → surprise $200 bills → fear of starting training runs → hesitation to experiment
6. **Weekend Babysitting**: Must manually monitor 12-20 hour training runs → check SSH logs every few hours → no freedom to disconnect
7. **Catastrophic Forgetting Fear**: "Did the model forget financial knowledge after training?" → no systematic way to check → delivery anxiety
8. **No Systematic Validation**: Manual testing on 5-10 examples → subjective quality assessment → cannot demonstrate measurable improvements

#### Business User Pain Points (Owners)
1. **Cannot Prove Quality**: Clients ask "show me it works" → We respond "trust us, it's good data" → Lose deals to competitors with proof
2. **Revenue Left on Table**: Sell $5k datasets when clients would pay $15k-30k for proven models with validation reports
3. **Competitive Disadvantage**: Compete against AI studios offering complete solutions (training + validation + deployment) while we offer only data
4. **Budget Anxiety**: Training costs unpredictable → fear of runaway GPU bills → hesitation to invest in training infrastructure
5. **Client Risk Aversion**: Clients fear wasting engineering time integrating datasets that might not work → prefer "proven" solutions from larger vendors

#### Quality Assurance Pain Points (QA Team)
1. **No Validation Framework**: Ad-hoc testing on random examples → inconsistent evaluation → cannot track quality trends
2. **Subjective Assessment**: "This response feels better" vs "Emotional intelligence improved 42%" → lack of objective metrics
3. **Regression Risk**: No systematic checks for catastrophic forgetting → fear of delivering models that lost capabilities
4. **Brand Voice Drift**: Cannot quantify "Does this still sound like Elena Morales?" → subjective personality assessment

### Solutions Provided

#### For AI Engineers
- **One-Click Training**: Configure job in UI → Select preset (Conservative/Balanced/Aggressive) → See cost estimate → Start training → No manual setup required
- **Real-Time Visibility**: Live dashboard with loss curves, learning rates, GPU utilization, estimated completion time, current cost accumulation
- **Actionable Error Messages**: "OutOfMemoryError → Your batch_size=4 exceeds 80GB VRAM. Try batch_size=2 or conservative preset." (not cryptic Torch errors)
- **Automatic Checkpoint Recovery**: Checkpoint saved every 100 steps → Spot interruption → Resume from last checkpoint within 10 minutes → 95%+ success rate despite interruptions
- **Cost Transparency**: Estimated duration (10-15 hours) and cost ($25-75) before start → Real-time cost updates → Alert if exceeding estimate by >20%
- **Weekend Freedom**: Email/Slack notifications on completion or failure → No need to check dashboards → Unattended training with confidence
- **Automated Validation**: Perplexity benchmarks → Emotional intelligence tests → Catastrophic forgetting checks → Objective quality scores → Confident delivery

#### For Business Owners
- **Proof of Quality**: Validation reports showing "Emotional Intelligence: 3.2/5 → 4.5/5 (41% improvement)" with before/after examples
- **Premium Pricing Justification**: Sell $15k-30k trained models with measurable ROI vs $5k "hope it works" datasets
- **Competitive Differentiation**: "Proven 40% better emotional intelligence" vs competitors' "trust us, good data" claims
- **Budget Predictability**: Cost estimates ±15% accuracy → Monthly spending dashboard → Budget alerts at 80%/95% thresholds → No surprise bills
- **Client Confidence**: Before/after comparisons → Executive-friendly validation reports → Measurable improvements → Risk reduction through proof

#### For Quality Analysts
- **Systematic Validation Framework**: Automated test suites → 50 emotional intelligence scenarios → 100 financial knowledge checks → Brand voice consistency rubric
- **Objective Metrics**: Perplexity scores → Empathy detection accuracy → Clarity improvements → Brand alignment percentages
- **Regression Prevention**: Catastrophic forgetting detection → Alert if baseline knowledge retention <95% → Prevent bad deliveries
- **Brand Voice Quantification**: Elena Morales personality rubric (10 characteristics) → Consistency scores → Objective brand alignment measurement

---

## Project Goals

### User Success Goals

**What must users be able to accomplish?**

#### AI Engineers (Primary Users)
1. **Configure Training Job in <10 Minutes**
   - Select training file from existing datasets (242-conversation dataset available)
   - Choose hyperparameter preset with explanations (Conservative/Balanced/Aggressive)
   - Select GPU type (spot $2.49/hr vs on-demand $7.99/hr)
   - See real-time cost and duration estimates updating as selections change
   - Click "Start Training" and receive job ID confirmation

2. **Monitor Training Progress in Real-Time**
   - View live-updating loss curves (refreshes every 60 seconds)
   - See current stage (Preprocessing → Model Loading → Training → Finalization)
   - Track progress percentage, current epoch, steps completed
   - Monitor estimated time remaining (adjusts based on actual speed)
   - Watch current cost accumulation ($X spent so far)
   - Receive alerts if training stalls or errors occur

3. **Handle Failures with Clear Guidance**
   - Receive actionable error messages ("Out of memory → reduce batch_size to 2")
   - Retry failed jobs with one click (auto-apply suggested fixes)
   - Resume from checkpoints after spot instance interruptions (<10 min recovery)
   - View webhook event log for troubleshooting
   - Export error logs for support tickets

4. **Download and Deliver Model Artifacts**
   - Click "Download Adapters" → Receive ZIP with adapter_model.bin (200-500MB) + adapter_config.json
   - Export training metrics (loss curves, perplexity, learning rate history) as CSV/JSON
   - Generate deployment package (adapters + inference script + README + requirements.txt + example prompts)
   - Access validation report PDF for client delivery
   - Track which models were downloaded and by whom

5. **Compare and Optimize Training Runs**
   - Select 2-4 training runs for side-by-side comparison
   - View overlaid loss curves on same chart
   - Compare final metrics (perplexity, cost, duration, quality scores)
   - Identify best configuration for production use
   - Save successful configurations as reusable templates

#### Business Owners
1. **Demonstrate Measurable ROI to Clients**
   - Access validation reports showing 40%+ emotional intelligence improvements
   - Download before/after comparison examples (baseline vs trained model)
   - Export executive-friendly PDF summaries (non-technical language)
   - Share secure links to validation reports (30-day expiration)
   - Track which reports lead to closed deals

2. **Price and Sell Trained Models with Confidence**
   - Accurate cost estimates before starting training ($50-75 typical range)
   - Track total training costs per client project
   - Calculate project profitability (revenue - training costs)
   - Quote clients confidently with ±15% cost accuracy
   - Justify premium pricing ($15k-30k) with measurable proof

3. **Control Training Budget Proactively**
   - View monthly spending dashboard (total spent, remaining budget, forecast)
   - Receive automatic alerts at 80% and 95% of budget threshold
   - Set monthly budget limits ($500 default, customizable)
   - Prevent new jobs if budget exceeded (unless override)
   - Export financial reports as CSV for accounting

#### Quality Analysts
1. **Validate Model Quality Systematically**
   - Run automated perplexity benchmarks (baseline vs trained, target ≥30% improvement)
   - Execute emotional intelligence test suite (50 scenarios, target ≥40% improvement)
   - Check catastrophic forgetting (100 financial knowledge questions, target ≥95% retention)
   - Evaluate brand voice consistency (Elena Morales rubric, target ≥85% alignment)
   - Export comprehensive validation report as PDF

2. **Approve or Reject Model Deliveries**
   - Review quality dashboard with all metrics at a glance
   - Compare trained model outputs vs baseline on test cases
   - Approve models meeting quality thresholds (perplexity, EI, retention, brand voice)
   - Reject models with quality issues and document reasons
   - Track approval/rejection history for audit trail

### Technical Goals

**Key technical achievements for the system**

1. **Training Success Rate ≥95%**
   - Jobs complete successfully on first or second attempt (vs 60% manual success rate)
   - Automatic checkpoint recovery from spot interruptions
   - Clear error messages enable quick configuration fixes
   - Retry logic handles transient failures automatically

2. **Cost Predictability Within ±15%**
   - Accurate duration estimates based on dataset size, epochs, batch size
   - Real-time cost tracking updates every 60 seconds
   - Alerts if actual cost exceeds estimate by >20%
   - Historical data improves estimate accuracy over time

3. **Training Time 12-Hour Average**
   - Optimize for Llama 3 70B + QLoRA (4-bit quantization) on H100 80GB
   - Model pre-caching reduces startup time from 30 min to <5 min
   - Efficient data preprocessing (2-5 minutes for 242 conversations)
   - Parallel processing where possible (tokenization, validation)

4. **Spot Instance Reliability 95%+**
   - Checkpoint every 100 training steps to Supabase Storage
   - Automatic resume within 10 minutes of interruption
   - Track interruption count per job ("Interrupted 2x, resumed successfully")
   - Success rate ≥95% despite 10-30% spot interruption rate

5. **Scalable Architecture**
   - Database schema supports thousands of training jobs
   - Webhook processing handles 100+ concurrent training runs
   - UI remains responsive with large job history tables
   - Storage bucket organized by job ID (prevents clutter)

6. **Comprehensive Validation Suite**
   - Perplexity calculation on 20% held-out validation set
   - 50-test emotional intelligence benchmark suite
   - 100-question financial knowledge retention test
   - Elena Morales brand voice rubric (10 characteristics × 30 responses = 300 evaluations)

### Business Success Goals

**How does this contribute to business objectives?**

1. **Revenue Growth: 3-5x Pricing Multiplier**
   - **Metric**: Close first $20k trained model deal within 8 weeks of launch
   - **Impact**: Transform $5k-10k dataset sales into $15k-30k model deliveries
   - **Success Criteria**: At least 3 trained model deals in first 6 months > 10x annual training infrastructure investment

2. **Competitive Win Rate Improvement**
   - **Metric**: Win 50%+ of deals where we present validation reports (vs 25% without)
   - **Impact**: Differentiate from data-only vendors with proven AI solutions
   - **Success Criteria**: Win at least 2 competitive bids against AI studios in first year

3. **Client Retention Through Quality Proof**
   - **Metric**: 60%+ of trained model clients return for second training run (refined dataset)
   - **Impact**: Create recurring revenue stream from iterative model improvements
   - **Success Criteria**: At least 2 repeat customers within 12 months of first delivery

4. **Cost Efficiency vs Outsourcing**
   - **Metric**: Average training cost <$75 per run (vs $6k-10k outsourcing fees)
   - **Impact**: Enable profitable pricing while maintaining 80%+ margins
   - **Success Criteria**: Actual training costs within ±15% of estimates for 90% of jobs

5. **Team Productivity Gains**
   - **Metric**: Engineer time reduced from 40 hours to <5 hours per training run
   - **Impact**: Free 35 engineer hours per run for feature development
   - **Success Criteria**: Complete 10+ training runs per month (vs 1-2 manual capacity)

6. **Market Positioning**
   - **Metric**: "Complete AI Studio" positioning in sales conversations and marketing
   - **Impact**: Shift perception from "data vendor" to "full-service AI partner"
   - **Success Criteria**: 50%+ of sales conversations mention training + validation capabilities

---

## Core Features & Functional Scope

### Primary Features

#### 1. One-Click Training Job Configuration
**Description**: Intuitive UI-driven workflow to configure and start LoRA training jobs without manual GPU setup or Python scripting.

**Key Capabilities**:
- Select training file from existing datasets (dropdown populated from `training_files` table)
- Choose hyperparameter preset with detailed explanations:
  - **Conservative**: r=8, lr=1e-4, epochs=2, 8-10 hours, ~$25-30 (spot), best for: high-quality seed datasets, first training run, risk-averse clients
  - **Balanced**: r=16, lr=2e-4, epochs=3, 12-15 hours, ~$50-60 (spot), best for: production models, proven configurations, most use cases
  - **Aggressive**: r=32, lr=3e-4, epochs=4, 18-20 hours, ~$80-100 (spot), best for: complex datasets, experimentation, when quality is paramount
- Select GPU type: Spot (50-80% cheaper, 10-30% interruption risk) vs On-Demand (guaranteed completion, higher cost)
- Real-time cost and duration estimation updates as selections change
- Optional job name, description, and notes for documentation
- Review configuration summary before starting
- Click "Start Training" → Job created in database → RunPod container launched → Training begins within 5 minutes

**User Benefit**: Reduces training initiation from 40 hours (manual GPU setup) to <10 minutes (UI configuration)

---

#### 2. Real-Time Training Progress Monitoring
**Description**: Live dashboard showing training status, loss curves, metrics, and estimated completion time.

**Key Capabilities**:
- **Training Jobs List**: Table view showing all jobs (active, completed, failed) with filters by status, date range, creator
- **Job Details Dashboard**: Individual job monitoring with:
  - Status card: Current stage, progress %, ETA, elapsed time
  - Live loss curve graph (training loss, validation loss) refreshing every 60 seconds
  - Metrics table: Current step, epoch, learning rate, perplexity, GPU utilization
  - Cost tracker: Estimated vs actual cost, current spend rate
  - Stage indicators: Preprocessing (2-5 min) → Model Loading (10-15 min) → Training (10-20 hours) → Finalization (5-10 min)
- **Webhook Event Log**: Chronological log of all status changes, metric updates, errors with timestamps and payload data
- **Action Buttons**: Cancel (if active), Retry (if failed), Download Adapters (if completed), View Validation Report

**User Benefit**: Eliminates "is it working?" anxiety, enables early detection of problems, provides transparency into training process

---

#### 3. Automatic Checkpoint Recovery
**Description**: Resilient training with automatic checkpoint saves and spot instance interruption recovery.

**Key Capabilities**:
- Checkpoint saved every 100 training steps to Supabase Storage (`training-checkpoints` bucket)
- Spot instance interruption detection (via RunPod API webhook)
- Automatic job resumption within 10 minutes:
  - New spot instance provisioned
  - Latest checkpoint downloaded from storage
  - Training continues from last saved step
- Interruption tracking: Display "Interrupted 2x, resumed successfully" on job dashboard
- Success rate ≥95% despite 10-30% spot interruption rate
- Cost savings: 50-80% cheaper than on-demand ($2.49/hr vs $7.99/hr for H100 PCIe)

**User Benefit**: Enables cost-effective spot instances without reliability concerns, automatic recovery prevents wasted progress

---

#### 4. Actionable Error Handling
**Description**: Clear, user-friendly error messages with suggested fixes and one-click retry capabilities.

**Key Capabilities**:
- **Error Classification**: Automatic categorization of common failures:
  - **OutOfMemoryError**: "Your dataset + batch_size=4 exceeds 80GB VRAM. Try batch_size=2 or conservative preset."
  - **DatasetFormatError**: "Training pair #47 missing 'target_response' field. Check conversation formatting."
  - **GPUProvisioningError**: "No H100 GPUs available. Retry in 5 minutes or switch to on-demand."
  - **TimeoutError**: "Training exceeded 24-hour limit. Reduce epochs or increase batch size."
  - **NetworkError**: "Lost connection to GPU instance. Automatic retry in 60 seconds."
- **Suggested Fixes**: Each error includes specific recommendations based on error type and context
- **One-Click Retry**: Pre-fill form with previous configuration + suggested adjustments, show diff of what changed
- **Error Log Export**: Download full error trace, webhook events, and configuration for support tickets
- **Historical Error Tracking**: Analyze common failures to improve presets and documentation

**User Benefit**: Reduces debugging frustration, enables quick recovery from failures, improves success rate through learning

---

#### 5. Model Artifact Management
**Description**: Comprehensive storage, versioning, and download system for trained LoRA adapters and associated files.

**Key Capabilities**:
- **LoRA Adapter Storage**: 
  - `adapter_model.bin` (200-500MB, contains trained weights)
  - `adapter_config.json` (configuration file for loading)
  - Stored in Supabase Storage `model-artifacts` bucket organized by job ID
- **Download Interface**:
  - "Download Adapters" button → Generate signed URL (valid 24 hours) → ZIP download
  - "Download Training Metrics" → CSV/JSON export of loss curves, perplexity, learning rate history
  - "Download Deployment Package" → Complete ZIP with adapters + inference script + README + requirements.txt + example prompts
- **Artifact Versioning**: Track multiple training runs for same dataset, compare artifacts across versions
- **Download Tracking**: Log who downloaded which artifacts when (audit trail for client deliveries)
- **Signed URL Security**: Temporary URLs expire after 24 hours, prevent unauthorized access

**User Benefit**: Seamless artifact delivery, complete deployment packages reduce client integration time, audit trail for compliance

---

#### 6. Automated Validation & Quality Reporting
**Description**: Systematic model quality assessment with objective metrics and before/after comparisons.

**Key Capabilities**:
- **Perplexity Benchmarks**:
  - Baseline: Test Llama 3 70B on validation set (20% held-out from training data)
  - Trained: Test LoRA-adapted model on same validation set
  - Improvement: ((baseline - trained) / baseline) × 100%, target ≥30%
  - Display: "Perplexity: 24.5 → 16.8 (31% improvement) ✓"
- **Emotional Intelligence Tests**:
  - Curated test set: 50 scenarios covering empathy, emotional awareness, supportive responses
  - Run baseline + trained model on all 50 scenarios
  - Human evaluators score responses 1-5 on empathy, clarity, appropriateness
  - Aggregate improvement: "Emotional Intelligence: 3.2/5 → 4.5/5 (41% improvement)"
- **Catastrophic Forgetting Detection**:
  - Financial knowledge test set: 100 questions (taxes, retirement planning, investing, insurance)
  - Baseline accuracy: Llama 3 70B typically scores 85-90%
  - Trained model must score ≥95% of baseline (e.g., 81%+ if baseline is 85%)
  - Alert if retention <95% (indicates overtraining)
- **Brand Voice Consistency**:
  - Elena Morales voice rubric: 10 characteristics (warmth, directness, education-first approach, etc.)
  - Evaluators score 30 responses on each characteristic (1-5 scale)
  - Overall consistency: Target ≥85% (average score ≥4.25/5)
  - Flag responses scoring <3 on any characteristic
- **Validation Report Generation**:
  - Comprehensive PDF report with all metrics, charts, before/after examples
  - Executive summary (non-technical language for stakeholders)
  - Technical appendix (detailed metrics for engineers)
  - Export as PDF, share via secure link (30-day expiration)

**User Benefit**: Objective quality measurement, client-ready proof of improvement, confident delivery decisions, competitive differentiation

---

#### 7. Training Cost Management
**Description**: Comprehensive cost tracking, budgeting, and optimization tools.

**Key Capabilities**:
- **Pre-Job Cost Estimation**:
  - Calculate based on: GPU type, dataset size, epochs, batch size, spot vs on-demand
  - Display: "Estimated Duration: 12-15 hours, Estimated Cost: $50-60 (spot) or $120-140 (on-demand)"
  - Update estimates in real-time as configuration changes
  - Historical data improves accuracy over time (track actual vs estimate variance)
- **Real-Time Cost Tracking**:
  - Current cost displayed prominently on job dashboard
  - Updates every 60 seconds based on elapsed time + GPU rate
  - Show actual cost vs initial estimate with variance percentage
  - Warning indicator if exceeding estimate by >20%
- **Monthly Budget Dashboard**:
  - Total monthly spending, budget limit, remaining budget, forecast
  - Per-job cost breakdown (which jobs cost most)
  - Cost attribution by client/project
  - Set monthly budget limit ($500 default, customizable)
  - Prevent new jobs if budget exceeded (unless override with confirmation)
- **Budget Alerts**:
  - Email alert at 80% of monthly budget threshold
  - Email + Slack alert at 95% of monthly budget threshold
  - Alert includes: current spending, remaining budget, active jobs, forecast
  - Option to increase budget limit directly from alert email
- **Cost Optimization Tools**:
  - Spot vs on-demand comparison (show cost savings)
  - Hyperparameter cost impact (show how epochs/batch size affect cost)
  - Historical cost analysis (identify most cost-effective configurations)
  - Recommendations: "Using conservative preset saves 40% vs aggressive for similar quality"

**User Benefit**: Prevents surprise bills, enables accurate client quotes, optimizes cost/quality tradeoffs, maintains profitability

---

#### 8. Training Comparison & Optimization
**Description**: Tools to compare multiple training runs and identify best configurations.

**Key Capabilities**:
- **Side-by-Side Comparison**:
  - Select 2-4 training runs from job history
  - Overlaid loss curves on same chart (color-coded per job)
  - Side-by-side metrics table: final loss, perplexity, quality scores, cost, duration, hyperparameters
  - Highlight best performer for each metric
  - Export comparison report as PDF
- **Training History Analysis**:
  - Filterable table: status, date range, cost range, configuration preset, creator
  - Sort by: date, cost, quality score, duration, success rate
  - Identify patterns: "Balanced preset produces best quality/cost ratio"
  - Track trends: average cost, success rate, quality scores over time
  - Export full history as CSV for analysis
- **Configuration Templates**:
  - "Save as Template" button on successful jobs
  - Template includes: hyperparameters, dataset selection, GPU settings, notes
  - Name templates descriptively (e.g., "Production - High Quality Financial Dataset")
  - Start new job from template with one click
  - Share templates across team members
- **Experiment Tracking**:
  - Add notes to training jobs (e.g., "testing aggressive LR for high-emotion dataset")
  - Tag jobs with labels (experiment, production, client-delivery, test)
  - Search jobs by notes or tags
  - Document learnings for future reference

**User Benefit**: Data-driven optimization, replicate successful configurations, avoid repeating failures, team knowledge sharing

---

### Scope Definition

#### In Scope

**Phase 1: Core Training Infrastructure** (Weeks 1-3)
1. ✅ Database schema for training jobs, model artifacts, training metrics
2. ✅ TrainingService API layer (create, start, cancel, monitor jobs)
3. ✅ API routes: POST /api/training/jobs, GET /api/training/jobs/:id, POST /api/training/webhook
4. ✅ RunPod Docker container with Llama 3 70B + QLoRA + PEFT + TRL stack
5. ✅ Training orchestrator script (train_lora.py) with checkpoint saving
6. ✅ Webhook progress reporting to Next.js backend
7. ✅ Basic UI: Job creation form, job list, job details dashboard

**Phase 2: Progress Monitoring & Error Handling** (Week 3-4)
1. ✅ Real-time loss curve visualization with Chart.js/Recharts
2. ✅ Training stage indicators with progress percentages
3. ✅ Webhook event log viewer
4. ✅ Error classification and actionable error messages
5. ✅ One-click retry with configuration adjustments
6. ✅ Spot instance checkpoint recovery (save every 100 steps)

**Phase 3: Validation & Quality Reporting** (Week 4-6)
1. ✅ Perplexity calculation on validation dataset
2. ✅ Emotional intelligence benchmark suite (50 test scenarios)
3. ✅ Catastrophic forgetting detection (100 financial knowledge questions)
4. ✅ Elena Morales brand voice consistency rubric
5. ✅ Validation report generation (PDF export with charts)
6. ✅ Before/after comparison dashboard

**Phase 4: Cost Management & Optimization** (Week 5-6)
1. ✅ Cost estimation before job start
2. ✅ Real-time cost tracking during training
3. ✅ Monthly budget dashboard with alerts
4. ✅ Training comparison tools (side-by-side analysis)
5. ✅ Configuration templates for replication

**Features Included**:
- Llama 3 70B model training (QLoRA 4-bit quantization on H100 80GB GPU)
- RunPod H100 PCIe spot + on-demand instance orchestration
- Hyperparameter presets (Conservative, Balanced, Aggressive) with cost/time estimates
- Checkpoint-based recovery for spot instance interruptions
- Model artifact storage in Supabase Storage (adapters, metrics, reports)
- Training metrics tracking (loss curves, perplexity, learning rate schedules)
- Comprehensive validation suite (perplexity, emotional intelligence, catastrophic forgetting, brand voice)
- Cost tracking and budget management with alerts
- Training comparison and optimization tools
- Email/Slack notifications for job completion or failure
- Deployment package generation (adapters + inference script + README)

#### Out of Scope

**Explicitly Excluded Features** (Future Considerations):
1. ❌ **Other Model Architectures**: Only Llama 3 70B Instruct in Phase 1 (Mistral, Falcon, Qwen deferred to Phase 2)
2. ❌ **Multi-GPU Training**: Single H100 80GB GPU only (distributed training deferred)
3. ❌ **Custom Hyperparameter Tuning**: Only presets in Phase 1 (advanced tuning UI deferred)
4. ❌ **Automated Hyperparameter Optimization**: No grid search or Bayesian optimization (manual experimentation only)
5. ❌ **Model Merging**: No adapter merging or ensemble models (deliver individual adapters only)
6. ❌ **Quantization Options**: Only 4-bit QLoRA (no 8-bit, FP16, or other quantization schemes)
7. ❌ **Custom Validation Datasets**: Use built-in benchmarks only (client-specific test sets deferred)
8. ❌ **A/B Testing Framework**: No automated A/B test orchestration (manual comparison only)
9. ❌ **Model Deployment**: No one-click deployment to client infrastructure (deliver adapters + README only)
10. ❌ **Fine-Tuning Full Models**: Only LoRA adapters, not full model fine-tuning
11. ❌ **Multiple Concurrent Jobs Per User**: One active job per user in Phase 1 (job queuing deferred)
12. ❌ **GPU Auto-Scaling**: Fixed H100 instances, no automatic scaling based on load
13. ❌ **Training Scheduling**: Jobs start immediately, no scheduled start times or cron triggers
14. ❌ **Custom Docker Images**: Use standard RunPod + BrightRun image, no user-provided containers
15. ❌ **Integration with External Training Platforms**: RunPod only (no AWS SageMaker, GCP Vertex AI, Azure ML)

**Intentional Limitations**:
- **Dataset Size**: Optimized for 200-300 conversations (1,500-2,000 training pairs), may not scale to 10k+ pairs without optimization
- **GPU Types**: H100 PCIe 80GB only (no A100, V100, or other GPU types in Phase 1)
- **Training Duration**: Optimized for 8-24 hour training runs, may time out for longer jobs (24 hour hard limit)
- **Model Size**: 70B parameter models only (no 7B, 13B, or 180B+ models in Phase 1)
- **Batch Size**: Fixed or preset-defined (no dynamic batch size optimization)
- **Checkpoint Frequency**: Every 100 steps (not configurable in Phase 1)

**Future Features** (Documented for Roadmap):
- Phase 2: Mistral 8x22B, Falcon 180B, Qwen 72B model support
- Phase 3: Multi-GPU distributed training for larger models
- Phase 4: Custom hyperparameter tuning UI with cost impact visualization
- Phase 5: Automated hyperparameter optimization (grid search, Bayesian)
- Phase 6: Model deployment pipeline (one-click deployment to Hugging Face, AWS, GCP)
- Phase 7: A/B testing framework for production model comparison
- Phase 8: Custom validation dataset upload and automated quality benchmarking

---

## Product Architecture

### High-Level System Architecture

The LoRA Training Infrastructure follows a **three-tier architecture**:

1. **Frontend Tier** (Next.js 14 React)
   - Training dashboard UI components
   - Real-time progress monitoring with WebSocket/polling
   - Job configuration forms with validation
   - Artifact download interfaces
   - Cost tracking dashboards

2. **Backend Tier** (Next.js API Routes + Supabase)
   - RESTful API endpoints (`/api/training/jobs`, `/api/training/webhook`)
   - TrainingService orchestration layer
   - Database operations (job CRUD, metrics storage)
   - RunPod API integration
   - Storage management (artifacts, checkpoints)
   - Webhook event processing

3. **Training Tier** (RunPod H100 GPU + Docker Container)
   - Llama 3 70B model loading and quantization
   - LoRA training orchestrator (train_lora.py)
   - Progress reporting via webhooks
   - Checkpoint management
   - Artifact generation and upload

**Data Flow**:
```
User → Next.js UI → API Route → TrainingService → RunPod API → GPU Container
  ↓                                                                    ↓
  ← Job ID & Status ← Database ← Webhook Events ← Training Progress ←
```

### Key Components

#### 1. Training Service (`src/lib/services/training-service.ts`)
**Responsibilities**:
- Create training job records in database
- Validate training file eligibility (enrichment status, file paths)
- Calculate cost estimates based on configuration
- Start training via RunPod API
- Process webhook events from GPU container
- Update job status and metrics in real-time
- Generate signed download URLs for artifacts

**Key Methods**:
```typescript
createTrainingJob(input: CreateTrainingJobInput): Promise<TrainingJob>
startTraining(jobId: string): Promise<void>
cancelJob(jobId: string): Promise<void>
getJobStatus(jobId: string): Promise<TrainingJob>
listJobs(filters?: TrainingJobFilters): Promise<TrainingJob[]>
processWebhookEvent(event: WebhookEvent): Promise<void>
getDownloadUrl(jobId: string, artifactType: string): Promise<string>
```

#### 2. RunPod Docker Container
**Responsibilities**:
- Load Llama 3 70B Instruct in 4-bit quantization (QLoRA)
- Parse training configuration from API payload
- Preprocess training data → Llama 3 chat format
- Initialize LoRA adapters with PEFT
- Execute training with SFTTrainer
- Save checkpoints every 100 steps to Supabase Storage
- Report progress via webhooks (status, metrics, errors)
- Upload final adapters and metrics on completion

**Technology Stack**:
- **Base Image**: `runpod/pytorch:2.1.0-py3.10-cuda12.1.0-devel`
- **Python Packages**: transformers, peft, trl, bitsandbytes, accelerate, torch, huggingface_hub
- **Model**: meta-llama/Meta-Llama-3-70B-Instruct (from Hugging Face Hub)
- **Training Library**: SFTTrainer (Supervised Fine-Tuning from TRL library)

**Container Entrypoint**:
```bash
python train_lora.py \
  --training_file_id=$TRAINING_FILE_ID \
  --job_id=$JOB_ID \
  --webhook_url=$WEBHOOK_URL \
  --rank=$RANK \
  --alpha=$ALPHA \
  --learning_rate=$LEARNING_RATE \
  --epochs=$EPOCHS \
  --batch_size=$BATCH_SIZE \
  --checkpoint_steps=100
```

#### 3. Database Schema

**Training Jobs Table** (`training_jobs`):
```sql
CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_file_id UUID REFERENCES training_files(id) NOT NULL,
  
  -- Job Configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL,  -- hyperparameters, GPU type, etc.
  preset VARCHAR(50),            -- conservative, balanced, aggressive
  
  -- Status & Progress
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, provisioning, preprocessing, model_loading, training, 
    -- finalization, completed, failed, cancelled
  current_stage VARCHAR(50),
  progress_percentage DECIMAL(5,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Cost Tracking
  cost_estimate DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  
  -- RunPod Integration
  runpod_job_id VARCHAR(255),
  runpod_instance_id VARCHAR(255),
  gpu_type VARCHAR(50),           -- h100_pcie_80gb
  gpu_pricing_tier VARCHAR(20),   -- spot, on_demand
  
  -- Training Metrics (latest values)
  current_epoch INTEGER,
  current_step INTEGER,
  total_steps INTEGER,
  latest_loss DECIMAL(10,6),
  latest_learning_rate DECIMAL(12,10),
  latest_perplexity DECIMAL(10,4),
  estimated_time_remaining_minutes INTEGER,
  
  -- Error Handling
  error_message TEXT,
  error_type VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  checkpoint_recovery_count INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Model Artifacts Table** (`model_artifacts`):
```sql
CREATE TABLE model_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) NOT NULL,
  
  -- Adapter Files
  adapter_model_path TEXT NOT NULL,     -- storage path to adapter_model.bin
  adapter_config_path TEXT NOT NULL,    -- storage path to adapter_config.json
  adapter_model_size_bytes BIGINT,
  
  -- Training Metrics File
  metrics_file_path TEXT,               -- storage path to metrics.json
  metrics_summary JSONB,                -- final metrics snapshot
  
  -- Validation Results
  validation_report_path TEXT,          -- storage path to validation_report.pdf
  perplexity_baseline DECIMAL(10,4),
  perplexity_trained DECIMAL(10,4),
  perplexity_improvement_pct DECIMAL(5,2),
  ei_score_baseline DECIMAL(4,2),
  ei_score_trained DECIMAL(4,2),
  ei_improvement_pct DECIMAL(5,2),
  forgetting_retention_pct DECIMAL(5,2),
  brand_voice_consistency_pct DECIMAL(5,2),
  
  -- Deployment Package
  deployment_package_path TEXT,         -- storage path to deployment.zip
  
  -- Download Tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  last_downloaded_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Training Metrics History Table** (`training_metrics_history`):
```sql
CREATE TABLE training_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) NOT NULL,
  
  -- Timestamp
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Training Progress
  epoch INTEGER NOT NULL,
  step INTEGER NOT NULL,
  global_step INTEGER,
  
  -- Loss Metrics
  training_loss DECIMAL(10,6),
  validation_loss DECIMAL(10,6),
  
  -- Learning Dynamics
  learning_rate DECIMAL(12,10),
  gradient_norm DECIMAL(10,6),
  
  -- Performance Metrics
  perplexity DECIMAL(10,4),
  tokens_per_second DECIMAL(10,2),
  samples_per_second DECIMAL(10,2),
  
  -- Resource Utilization
  gpu_memory_used_mb INTEGER,
  gpu_memory_total_mb INTEGER,
  gpu_utilization_pct INTEGER,
  
  -- Time Estimates
  epoch_time_seconds DECIMAL(10,2),
  estimated_time_remaining_seconds INTEGER,
  
  -- Indexes for efficient querying
  INDEX idx_training_metrics_job_step (training_job_id, step),
  INDEX idx_training_metrics_reported_at (training_job_id, reported_at)
);
```

**Webhook Events Table** (`training_webhook_events`):
```sql
CREATE TABLE training_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_job_id UUID REFERENCES training_jobs(id) NOT NULL,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL,
    -- status_change, metrics_update, error, warning, 
    -- checkpoint_saved, stage_change, completion
  event_payload JSONB NOT NULL,
  
  -- Processing Status
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  
  -- Audit
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  INDEX idx_webhook_events_job_type (training_job_id, event_type),
  INDEX idx_webhook_events_unprocessed (processed, received_at) 
    WHERE processed = FALSE
);
```

#### 4. API Routes

**Training Job Management**:
- `POST /api/training/jobs` - Create new training job
- `GET /api/training/jobs` - List all training jobs with filters
- `GET /api/training/jobs/:id` - Get job details
- `POST /api/training/jobs/:id/start` - Start training (triggers RunPod API)
- `POST /api/training/jobs/:id/cancel` - Cancel active training
- `DELETE /api/training/jobs/:id` - Delete job (if not started)

**Progress & Monitoring**:
- `GET /api/training/jobs/:id/metrics` - Get training metrics history
- `GET /api/training/jobs/:id/events` - Get webhook event log
- `POST /api/training/webhook` - Receive progress updates from GPU container

**Artifacts & Downloads**:
- `GET /api/training/jobs/:id/artifacts` - List available artifacts
- `GET /api/training/jobs/:id/download/adapters` - Generate signed URL for adapter download
- `GET /api/training/jobs/:id/download/metrics` - Export metrics as CSV/JSON
- `GET /api/training/jobs/:id/download/validation-report` - Download validation PDF
- `GET /api/training/jobs/:id/download/deployment-package` - Download complete deployment ZIP

**Cost & Budget**:
- `GET /api/training/cost-estimate` - Calculate cost estimate for configuration
- `GET /api/training/budget/monthly` - Get monthly spending summary
- `POST /api/training/budget/alerts` - Configure budget alert thresholds

#### 5. UI Components

**Dashboard Components** (`src/app/(dashboard)/training/*`):
- `training-jobs/page.tsx` - Main training jobs list with filters
- `training-jobs/[id]/page.tsx` - Individual job details and monitoring
- `training-jobs/new/page.tsx` - Job creation form
- `training-jobs/compare/page.tsx` - Side-by-side comparison tool

**Shared Components** (`src/components/training/*`):
- `TrainingJobCard.tsx` - Job summary card with status badge
- `TrainingProgress.tsx` - Live progress indicator with loss curve
- `CostTracker.tsx` - Real-time cost monitoring widget
- `HyperparameterPresetSelector.tsx` - Preset selection with explanations
- `JobConfigurationForm.tsx` - Job creation/editing form
- `MetricsChart.tsx` - Interactive loss curve and metrics visualization
- `WebhookEventLog.tsx` - Chronological event log viewer
- `ArtifactDownloadPanel.tsx` - Download buttons for all artifacts
- `JobComparisonTable.tsx` - Side-by-side metrics comparison
- `ValidationReportPreview.tsx` - Validation results dashboard

### Data Flow

#### Training Job Creation Flow
```
1. User fills job configuration form
   ↓
2. Frontend calls POST /api/training/jobs
   ↓
3. TrainingService validates:
   - Training file exists and is enriched
   - Budget not exceeded
   - Configuration is valid
   ↓
4. Insert training_job record (status: pending)
   ↓
5. Return job ID to frontend
   ↓
6. User clicks "Start Training"
   ↓
7. Frontend calls POST /api/training/jobs/:id/start
   ↓
8. TrainingService:
   - Updates job status to "provisioning"
   - Calls RunPod API to create GPU instance
   - Receives runpod_job_id
   - Updates job with runpod_job_id
   ↓
9. RunPod provisions H100 GPU (2-5 minutes)
   ↓
10. Docker container starts, calls webhook: { event: "started" }
    ↓
11. POST /api/training/webhook processes event
    ↓
12. Update job status to "preprocessing"
```

#### Training Progress Monitoring Flow
```
1. GPU container runs training loop
   ↓
2. Every 60 seconds: Send metrics webhook
   ↓
3. POST /api/training/webhook receives:
   {
     event: "metrics_update",
     job_id: "...",
     epoch: 2,
     step: 450,
     training_loss: 0.342,
     validation_loss: 0.398,
     learning_rate: 0.00015,
     perplexity: 18.2,
     gpu_memory_used_mb: 76800,
     estimated_time_remaining_seconds: 18600
   }
   ↓
4. Webhook handler:
   - Insert into training_metrics_history
   - Update training_jobs (latest metrics)
   - Trigger real-time update to frontend (polling or WebSocket)
   ↓
5. Frontend polls GET /api/training/jobs/:id every 10 seconds
   ↓
6. Update dashboard UI (loss curve, progress bar, metrics table)
```

#### Spot Instance Interruption Recovery Flow
```
1. Spot instance interrupted by RunPod
   ↓
2. GPU container detects interruption, sends webhook:
   { event: "interrupted", last_checkpoint_step: 500 }
   ↓
3. Webhook handler:
   - Update job status to "recovering"
   - Increment checkpoint_recovery_count
   ↓
4. TrainingService:
   - Call RunPod API to provision new spot instance
   - Pass checkpoint_path in container env vars
   ↓
5. New GPU container starts
   ↓
6. Container downloads checkpoint from Supabase Storage
   ↓
7. Resume training from step 500
   ↓
8. Send webhook: { event: "resumed", resumed_from_step: 500 }
   ↓
9. Update job status back to "training"
   ↓
10. Continue normal training flow
```

#### Job Completion & Artifact Delivery Flow
```
1. Training completes successfully
   ↓
2. GPU container:
   - Save final adapters (adapter_model.bin, adapter_config.json)
   - Upload to Supabase Storage (training-artifacts bucket)
   - Generate metrics summary JSON
   - Upload metrics to storage
   - Run validation benchmarks (perplexity, EI, forgetting, brand voice)
   - Generate validation report PDF
   - Upload report to storage
   - Send webhook:
     {
       event: "completed",
       adapter_model_path: "...",
       adapter_config_path: "...",
       metrics_file_path: "...",
       validation_report_path: "...",
       final_metrics: { ... },
       validation_results: { ... }
     }
   ↓
3. Webhook handler:
   - Update training_job (status: completed, final metrics)
   - Insert model_artifacts record with file paths
   ↓
4. Frontend displays "Completed" status
   ↓
5. User clicks "Download Adapters"
   ↓
6. GET /api/training/jobs/:id/download/adapters
   ↓
7. TrainingService:
   - Fetch model_artifacts record
   - Generate signed URLs for adapter files (24 hour expiration)
   - Create ZIP with both files
   - Return download link
   ↓
8. User downloads ZIP, integrates into inference pipeline
```

---

## Core Technologies

### Technology Stack

#### Frontend Technologies
- **Next.js 14** (App Router)
  - **Purpose**: React framework for server-side rendering and API routes
  - **Version**: 14.2.x (latest stable)
  - **Key Features**: Server components, streaming, API routes, middleware

- **TypeScript** (5.x)
  - **Purpose**: Type-safe development for frontend and backend
  - **Benefits**: Catch errors at compile time, improved IDE support, better code documentation

- **Tailwind CSS** (3.x)
  - **Purpose**: Utility-first CSS framework for responsive UI
  - **Configuration**: Custom theme with design tokens for consistent styling

- **Shadcn/UI**
  - **Purpose**: High-quality React components built on Radix UI
  - **Components Used**: Button, Card, Table, Form, Dialog, Select, Badge, Toast

- **Chart.js** / **Recharts**
  - **Purpose**: Interactive data visualization for loss curves and metrics
  - **Features**: Real-time updates, responsive charts, tooltip interactions

- **React Query** (TanStack Query)
  - **Purpose**: Data fetching, caching, and state management
  - **Benefits**: Automatic refetching, optimistic updates, cache invalidation

#### Backend Technologies
- **Supabase** (PostgreSQL 15)
  - **Purpose**: Database, authentication, storage, real-time subscriptions
  - **PostgreSQL Features**: JSONB columns, Row Level Security, full-text search, triggers
  - **Storage Buckets**: 
    - `training-files` (training JSON/JSONL files)
    - `training-checkpoints` (checkpoint saves during training)
    - `model-artifacts` (final adapter files, metrics, reports)
  - **Authentication**: JWT-based auth, user management, role-based access control

- **Node.js** (20.x LTS)
  - **Purpose**: JavaScript runtime for Next.js API routes and services
  - **Version**: 20.x (Active LTS with modern features)

#### GPU Training Technologies
- **RunPod**
  - **Purpose**: GPU cloud infrastructure for LoRA training
  - **Instance Type**: H100 PCIe 80GB
  - **Pricing**: Spot $2.49/hr (50-80% cheaper), On-Demand $7.99/hr
  - **Features**: Serverless GPU endpoints, webhook support, persistent volumes

- **PyTorch** (2.1.0)
  - **Purpose**: Deep learning framework for model training
  - **CUDA Version**: 12.1.0 (optimized for H100)
  - **Features**: Automatic mixed precision, gradient checkpointing, distributed training support

- **Hugging Face Transformers** (4.36+)
  - **Purpose**: Load and fine-tune Llama 3 70B Instruct
  - **Model**: `meta-llama/Meta-Llama-3-70B-Instruct`
  - **Features**: AutoTokenizer, AutoModelForCausalLM, chat templates

- **PEFT** (Parameter-Efficient Fine-Tuning)
  - **Purpose**: LoRA adapter training
  - **Features**: LoraConfig, get_peft_model, low-rank adaptation layers
  - **Configuration**: rank (r), alpha, target modules, dropout

- **TRL** (Transformer Reinforcement Learning)
  - **Purpose**: Supervised fine-tuning trainer
  - **Trainer**: SFTTrainer (optimized for chat/instruction tuning)
  - **Features**: Automatic batching, loss computation, checkpoint saving

- **BitsAndBytes**
  - **Purpose**: 4-bit model quantization (QLoRA)
  - **Features**: Load 70B model in 4-bit precision, reducing memory from 140GB to ~40GB
  - **Quantization**: NF4 (4-bit NormalFloat), double quantization

- **Accelerate**
  - **Purpose**: Distributed training and mixed precision
  - **Features**: Automatic device placement, gradient accumulation, mixed precision training

#### External Dependencies

**RunPod API**:
- **Purpose**: Provision GPU instances, start/stop jobs, monitor status
- **Endpoints**:
  - `POST /v2/pods` - Create GPU pod
  - `GET /v2/pods/:id` - Get pod status
  - `POST /v2/pods/:id/stop` - Stop pod
  - `DELETE /v2/pods/:id` - Delete pod
- **Authentication**: API key (stored in environment variables)
- **Webhook Support**: Send progress updates to Next.js backend

**Hugging Face Hub**:
- **Purpose**: Download Llama 3 70B model weights
- **Model ID**: `meta-llama/Meta-Llama-3-70B-Instruct`
- **Size**: ~140GB (quantized to ~40GB with 4-bit)
- **Access**: Requires Hugging Face token (gated model, needs acceptance)
- **Caching**: Model cached on RunPod persistent volume (avoid re-downloading)

**Supabase Storage**:
- **Purpose**: Store training files, checkpoints, artifacts, validation reports
- **Buckets**:
  - `training-files` (10GB limit per file)
  - `training-checkpoints` (5GB limit per file)
  - `model-artifacts` (2GB limit per file)
- **Security**: Row Level Security, signed URLs with expiration
- **Performance**: Global CDN for fast downloads

**Optional: Slack Webhook**:
- **Purpose**: Send training notifications to team channel
- **Events**: Job completion, failure, budget threshold alerts
- **Configuration**: Webhook URL stored in environment variables

**Optional: Email Service** (SendGrid / Resend):
- **Purpose**: Send email notifications for job events
- **Templates**: Job completion, failure, budget alerts
- **Configuration**: API key, from email, notification preferences per user

### Technology Selection Rationale

**Why Llama 3 70B?**
- Strong baseline performance on financial knowledge
- Instruction-tuned (follows chat format naturally)
- Commercially licensed (permissive for client delivery)
- 70B size balances quality (better than 7B/13B) with feasibility (trainable on single H100)

**Why QLoRA (4-bit quantization)?**
- Enables 70B training on single H100 80GB GPU
- Minimal quality degradation (<3% vs full precision)
- 50-70% memory savings (140GB → 40GB)
- Significantly cheaper than multi-GPU setup

**Why RunPod?**
- Affordable H100 pricing ($2.49/hr spot, $7.99/hr on-demand)
- Spot instances enable 50-80% cost savings vs on-demand
- Webhook support for progress reporting
- Persistent volumes for model caching (avoid re-downloads)
- No long-term contracts (pay-per-use)

**Why Supabase?**
- Already integrated in Bright Run codebase
- PostgreSQL provides relational data integrity + JSONB flexibility
- Storage buckets handle large files (adapters, checkpoints)
- Real-time subscriptions enable live dashboard updates
- Row Level Security for multi-tenant data isolation

**Why Next.js 14 App Router?**
- Server components reduce client bundle size
- API routes co-located with frontend code
- Streaming for progressive UI rendering
- Middleware for authentication and rate limiting
- Already used in existing Bright Run application

---

## Success Criteria

### Performance Metrics

**Training Job Success Rate**: ≥95% of jobs complete successfully on first or second attempt
- **Measurement**: Track ratio of completed jobs to total jobs started
- **Baseline**: Current manual process ~60% success rate (many OOM errors, configuration mistakes)
- **Target**: 95%+ through proven presets, checkpoint recovery, actionable error messages
- **Timeline**: Achieve by end of Phase 2 (Week 4)

**Cost Prediction Accuracy**: Actual costs within ±15% of estimates for 90% of jobs
- **Measurement**: Compare final `actual_cost` to initial `cost_estimate` in training_jobs table
- **Calculation**: `abs((actual - estimate) / estimate) * 100 <= 15%`
- **Target**: 90% of jobs meet accuracy threshold
- **Improvement Loop**: Use historical data to refine estimation formulas
- **Timeline**: Achieve by end of Phase 4 (Week 6)

**Training Duration**: 12-hour average completion time for 242-conversation dataset (Balanced preset)
- **Measurement**: Average `actual_duration_minutes` for completed jobs
- **Breakdown**: Preprocessing (2-5 min) + Model Loading (10-15 min) + Training (10-20 hours) + Finalization (5-10 min)
- **Optimization**: Pre-cached model, efficient tokenization, optimal batch size
- **Timeline**: Achieve by end of Phase 1 (Week 3)

**Spot Instance Reliability**: ≥95% success rate despite 10-30% interruption probability
- **Measurement**: Track jobs using spot instances that complete successfully
- **Mechanism**: Checkpoint every 100 steps + automatic resume within 10 minutes
- **Recovery Time**: Median recovery time <10 minutes after interruption
- **Timeline**: Achieve by end of Phase 2 (Week 4)

**Model Quality Improvement**: ≥40% average emotional intelligence score improvement
- **Measurement**: Compare `ei_score_baseline` vs `ei_score_trained` in model_artifacts table
- **Test Suite**: 50 emotional intelligence scenarios scored by human evaluators
- **Target**: Average improvement ≥40% across all training runs
- **Timeline**: Validate with first 5 production training runs (Weeks 5-6)

**Perplexity Reduction**: ≥30% perplexity improvement on validation dataset
- **Measurement**: `((perplexity_baseline - perplexity_trained) / perplexity_baseline) * 100`
- **Validation Set**: 20% of training data held out for evaluation
- **Target**: Median improvement ≥30% across all training runs
- **Timeline**: Achieve by end of Phase 3 (Week 5)

### Quality Standards

**Checkpoint Frequency**: Every 100 training steps
- **Verification**: Check checkpoint files exist in storage bucket at expected intervals
- **Recovery Test**: Trigger spot interruption, verify resume within 10 minutes
- **Success Criteria**: 100% of checkpoints successfully saved and retrievable

**Error Message Actionability**: 80%+ of users can self-recover from failures without support
- **Measurement**: Survey users after failed jobs, ask "Were you able to fix the issue?"
- **Target**: 80% respond "Yes, I fixed it using the suggested action"
- **Examples**:
  - OOM Error → "Reduce batch_size to 2" → User retries successfully
  - Dataset Error → "Fix field X in training pair #47" → User corrects data
- **Timeline**: Assess after 20+ training runs across 5+ users (Weeks 5-6)

**Validation Report Completeness**: 100% of completed jobs generate validation reports
- **Verification**: Check `validation_report_path` is not null in model_artifacts table
- **Contents**: Perplexity scores, EI benchmarks, forgetting checks, brand voice scores, before/after examples
- **Format**: PDF export with charts and executive summary
- **Timeline**: Achieve by end of Phase 3 (Week 5)

**Catastrophic Forgetting Prevention**: ≥95% retention of baseline financial knowledge
- **Measurement**: `forgetting_retention_pct` in model_artifacts table
- **Test Suite**: 100 financial knowledge questions (taxes, retirement, investing, insurance)
- **Baseline**: Llama 3 70B scores 85-90% on test suite
- **Target**: Trained model scores ≥95% of baseline (e.g., 81%+ if baseline is 85%)
- **Failure Action**: Alert quality team, recommend retraining with lower learning rate
- **Timeline**: Validate with first 5 production training runs (Weeks 5-6)

**Brand Voice Consistency**: ≥85% alignment with Elena Morales personality
- **Measurement**: `brand_voice_consistency_pct` in model_artifacts table
- **Test Method**: Human evaluators score 30 responses on 10 characteristics (1-5 scale each)
- **Target**: Average score ≥4.25/5 (85% consistency)
- **Characteristics**: Warmth, directness, education-first approach, empathy, optimism, pragmatism, non-judgmental tone, progress celebration, values alignment, financial literacy
- **Timeline**: Validate with first 5 production training runs (Weeks 5-6)

### Milestone Criteria

**Phase 1 Completion (Week 3)**: Core infrastructure operational
- ✅ Database schema deployed (training_jobs, model_artifacts, training_metrics_history, training_webhook_events)
- ✅ TrainingService implemented with full CRUD operations
- ✅ API routes functional (create, start, cancel, monitor, webhook)
- ✅ RunPod Docker container deployed and tested
- ✅ Basic UI: job creation form, job list, job details dashboard
- ✅ First successful training run completes end-to-end (242-conversation dataset, Balanced preset)
- ✅ Model artifacts downloadable (adapter_model.bin, adapter_config.json)

**Phase 2 Completion (Week 4)**: Monitoring and reliability
- ✅ Real-time loss curve visualization functional
- ✅ Training stage indicators with progress percentages
- ✅ Webhook event log viewer implemented
- ✅ Error classification system with actionable messages
- ✅ One-click retry with configuration adjustments
- ✅ Spot instance checkpoint recovery tested (simulate interruption, verify resume)
- ✅ 3 successful training runs with checkpoint recovery

**Phase 3 Completion (Week 5)**: Validation and quality reporting
- ✅ Perplexity calculation implemented and tested
- ✅ Emotional intelligence benchmark suite (50 scenarios) operational
- ✅ Catastrophic forgetting detection (100 questions) implemented
- ✅ Brand voice consistency rubric (10 characteristics) tested
- ✅ Validation report PDF generation functional
- ✅ Before/after comparison dashboard implemented
- ✅ 5 training runs with complete validation reports

**Phase 4 Completion (Week 6)**: Cost management and optimization
- ✅ Cost estimation functional (within ±15% accuracy)
- ✅ Real-time cost tracking during training
- ✅ Monthly budget dashboard with alerts
- ✅ Training comparison tools (side-by-side analysis)
- ✅ Configuration templates for replication
- ✅ Email/Slack notifications for job completion/failure
- ✅ 10+ successful training runs demonstrating full system capabilities

**Production Readiness (Week 6)**: Ready for client deliveries
- ✅ All phases complete with acceptance criteria met
- ✅ Documentation complete (user guides, technical docs, troubleshooting)
- ✅ First client training run successful (external dataset, proven quality improvement)
- ✅ Validation report used in sales presentation
- ✅ Cost tracking demonstrates profitability (training cost <5% of sale price)
- ✅ Team trained on system usage and troubleshooting

---

## Current State & Development Phase

### Completed Features (As of 12-15-2025)

#### ✅ Conversation Generation Module (100% Complete)
- **Status**: Production-ready with 242 conversations generated
- **Capabilities**:
  - Three-tier architecture (40 Template, 35 Scenario, 15 Edge Case conversations)
  - Emotional intelligence scaffolding (personas, emotional arcs, training topics)
  - Multi-dimensional metadata (tier, persona, emotion, topic, intent, tone)
  - Quality scoring (empathy, clarity, appropriateness, brand voice alignment)
  - Approval workflow (draft → generated → pending_review → approved/rejected)
  - Real-time progress monitoring for batch generation
  - Export to structured JSON format
- **Database Tables**: `conversations` (242 rows), `conversation_turns`, `personas`, `emotional_arcs`, `training_topics`
- **UI**: Complete dashboard at `/conversations` with filtering, search, bulk operations, approval workflow
- **Code Location**: `src/lib/conversation-service.ts`, `src/app/(dashboard)/conversations/`, `src/components/conversations/`

#### ✅ Training File Service (100% Complete)
- **Status**: Production-ready aggregation service
- **Capabilities**:
  - Aggregate individual conversations into training files
  - Generate both JSON (full structure) and JSONL (line-delimited for training) formats
  - Track scaffolding distribution (personas, emotional arcs, topics)
  - Calculate quality metrics (avg/min/max quality scores, human review count)
  - Store files in Supabase Storage (`training-files` bucket)
  - Add conversations to existing training files (incremental updates)
  - List, filter, and manage training files
  - Generate signed download URLs (1-hour expiration)
- **Database Tables**: `training_files`, `training_file_conversations`
- **Code Location**: `src/lib/services/training-file-service.ts`
- **API Routes**: `/api/training-files` (GET, POST), `/api/training-files/:id/add-conversations` (POST), `/api/training-files/:id/download` (GET)
- **Production File**: 242 conversations aggregated into `brightrun-v4-full-dataset.json` (1,567 training pairs)

#### ✅ Document Categorization Module (100% Complete)
- **Status**: Production-ready workflow system
- **Capabilities**:
  - Guided 3-step workflow (Statement of Belonging → Primary Category → Secondary Tags)
  - 11 business-friendly primary categories
  - 7 metadata dimensions (authorship, format, risk, evidence, use, audience, gating)
  - Draft save and resume functionality
  - Document reference panel with persistent context
  - Intelligent tag suggestions based on category
  - Custom tag creation for business-specific terminology
  - Workflow analytics and completion tracking
- **Database Tables**: `documents`, `workflow_sessions`, `categories`, `tag_dimensions`, `tags`
- **UI**: Complete workflow at `/workflow` with progress tracking and validation
- **Code Location**: `src/app/(workflow)/`, `src/components/workflow/`, `src/stores/workflow-store.ts`

#### ✅ Chunk Extraction Module (100% Complete)
- **Status**: Production-ready with 60-dimensional semantic analysis
- **Capabilities**:
  - Semantic chunk extraction from categorized documents
  - 60-dimensional metadata per chunk (expertise level, emotional valence, actionability, etc.)
  - Integration with conversation generation (chunk context for prompts)
  - Chunk validation and quality scoring
  - Export chunks with full dimensional metadata
- **Database Tables**: `chunks`, `chunk_dimensions`
- **Code Location**: `src/lib/chunk-service.ts`, `src/lib/dimension-service.ts`

#### ✅ Database Infrastructure (100% Complete)
- **Status**: Production-ready with comprehensive resilience
- **Capabilities**:
  - Automatic transaction management with BEGIN/COMMIT/ROLLBACK
  - Configurable isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
  - Timeout enforcement (default 30s, configurable)
  - Automatic deadlock retry (up to 3 attempts, configurable)
  - Error classification with user-friendly messages
  - Retryability determination and recovery guidance
  - Health monitoring (connection pool usage, query performance, cache hit ratio)
  - Scheduled health checks with status change callbacks
- **Code Location**: `src/lib/database/` (transaction.ts, errors.ts, health.ts)
- **Documentation**: `src/lib/database/README.md` (comprehensive usage guide)
- **SQL Setup**: `src/lib/database/setup-transaction-functions.sql` (deployed to Supabase)

#### ✅ Conversation Storage & Enrichment (100% Complete)
- **Status**: Production-ready with zero data loss
- **Capabilities**:
  - Store conversation JSON files in Supabase Storage
  - Track enrichment status (not_started → validated → enriched → completed)
  - Validation pipeline with blocker/warning categorization
  - Enrichment pipeline (add training metadata, consultant profile, dataset metadata)
  - Raw API response storage for error recovery
  - Parse error handling with manual review flagging
  - Signed URL generation for secure downloads
  - File size tracking and quota management
- **Database Tables**: `conversations` (with enrichment fields: enrichment_status, validation_report, enriched_file_path, enriched_at)
- **Storage Buckets**: `conversation-files` (raw + enriched JSON files)
- **Code Location**: `src/lib/services/conversation-storage-service.ts`, `src/lib/services/conversation-validation-service.ts`, `src/lib/services/data-enrichment-service.ts`

### Pending Features (Not Yet Started - The LoRA Training Infrastructure)

#### 🚧 Phase 1: Core Training Infrastructure (Weeks 1-3)
**Status**: NOT STARTED - This is what needs to be built

**Database Schema**:
- ❌ `training_jobs` table (job configuration, status, progress, costs, error tracking)
- ❌ `model_artifacts` table (adapter files, metrics, validation results, download tracking)
- ❌ `training_metrics_history` table (loss curves, learning rates, GPU utilization over time)
- ❌ `training_webhook_events` table (event log from GPU container)

**Backend Services**:
- ❌ `TrainingService` (`src/lib/services/training-service.ts`)
  - createTrainingJob(), startTraining(), cancelJob(), getJobStatus(), listJobs()
  - Cost estimation logic, budget validation, hyperparameter presets
  - RunPod API integration (provision GPU, start/stop jobs, monitor status)
  - Webhook event processing (update database from GPU progress reports)
- ❌ `ModelArtifactService` (manage artifact storage, downloads, signed URLs)
- ❌ `ValidationService` (run benchmarks, generate reports, calculate improvement metrics)

**API Routes**:
- ❌ POST `/api/training/jobs` (create job)
- ❌ GET `/api/training/jobs` (list with filters)
- ❌ GET `/api/training/jobs/:id` (get details)
- ❌ POST `/api/training/jobs/:id/start` (trigger RunPod)
- ❌ POST `/api/training/jobs/:id/cancel` (stop GPU)
- ❌ POST `/api/training/webhook` (receive progress from GPU)
- ❌ GET `/api/training/jobs/:id/download/*` (artifacts, metrics, reports)

**RunPod Infrastructure**:
- ❌ Docker container (`Dockerfile.training`)
  - Base: runpod/pytorch:2.1.0-py3.10-cuda12.1.0-devel
  - Install: transformers, peft, trl, bitsandbytes, accelerate
  - Model: meta-llama/Meta-Llama-3-70B-Instruct (pre-cache on persistent volume)
- ❌ Training orchestrator (`train_lora.py`)
  - Load model in 4-bit quantization (QLoRA)
  - Parse configuration from environment variables
  - Preprocess training data (Llama 3 chat format)
  - Initialize LoRA adapters (PEFT)
  - Execute training loop (SFTTrainer)
  - Save checkpoints every 100 steps
  - Report progress via webhooks
  - Upload artifacts to Supabase Storage on completion
- ❌ RunPod endpoint configuration
  - H100 PCIe 80GB instance template
  - Spot and on-demand variants
  - Persistent volume for model caching
  - Webhook URL configuration

**UI Components**:
- ❌ Training Jobs List (`src/app/(dashboard)/training-jobs/page.tsx`)
  - Table with filters (status, date range, creator)
  - Status badges, cost display, duration, progress indicators
  - "Create New Job" button
- ❌ Job Creation Form (`src/app/(dashboard)/training-jobs/new/page.tsx`)
  - Training file selector (dropdown)
  - Hyperparameter preset selector (Conservative/Balanced/Aggressive with explanations)
  - GPU type selector (spot vs on-demand)
  - Cost and duration estimation (updates in real-time)
  - Optional: job name, description, notes
  - "Start Training" button
- ❌ Job Details Dashboard (`src/app/(dashboard)/training-jobs/[id]/page.tsx`)
  - Status card (stage, progress %, ETA, elapsed time)
  - Live loss curve chart (training & validation loss)
  - Metrics table (step, epoch, LR, perplexity, GPU utilization)
  - Cost tracker (estimated vs actual)
  - Action buttons (Cancel, Retry, Download Adapters, View Report)

#### 🚧 Phase 2: Progress Monitoring & Error Handling (Week 3-4)
**Status**: NOT STARTED - Depends on Phase 1

- ❌ Real-time loss curve visualization (Chart.js/Recharts)
- ❌ Training stage indicators with time estimates
- ❌ Webhook event log viewer
- ❌ Error classification system (map error types to user messages)
- ❌ One-click retry with suggested configuration adjustments
- ❌ Spot instance checkpoint recovery implementation
- ❌ Download tracking and audit logging

#### 🚧 Phase 3: Validation & Quality Reporting (Week 4-6)
**Status**: NOT STARTED - Depends on Phase 2

- ❌ Perplexity calculation on validation dataset
- ❌ Emotional intelligence benchmark suite (50 scenarios)
- ❌ Catastrophic forgetting detection (100 financial knowledge questions)
- ❌ Elena Morales brand voice rubric (10 characteristics × 30 responses)
- ❌ Validation report generation (PDF with charts, tables, examples)
- ❌ Before/after comparison dashboard
- ❌ Executive summary generator (non-technical language for stakeholders)

#### 🚧 Phase 4: Cost Management & Optimization (Week 5-6)
**Status**: NOT STARTED - Depends on Phase 3

- ❌ Cost estimation algorithm refinement (use historical data)
- ❌ Real-time cost tracking with alerts
- ❌ Monthly budget dashboard
- ❌ Budget alert system (email/Slack at 80%/95% thresholds)
- ❌ Training comparison tool (side-by-side analysis)
- ❌ Configuration templates (save and reuse successful setups)
- ❌ Email/Slack notification system for job events

### Technical Debt

**Known Limitations** (To Address in Future Phases):
1. **ID Resolution Inconsistency**: Training file service has fallback logic to resolve both PK (id) and Business Key (conversation_id) due to legacy UI bug where sometimes wrong ID is sent. This should be fixed in UI (use conversation_id consistently) and fallback removed.
   - **Location**: `src/lib/services/training-file-service.ts` lines 388-457 (resolveToConversationIds method)
   - **Priority**: Medium
   - **Impact**: Technical debt, not blocking

2. **No Multi-GPU Support**: Phase 1 only supports single H100 80GB GPU. Distributed training would enable larger models (180B+) or faster training times.
   - **Priority**: Low (Phase 1 scope intentionally limited)
   - **Future Work**: Phase 2 or 3 expansion

3. **Fixed Checkpoint Frequency**: Checkpoints save every 100 steps (not configurable). Some users may want more frequent checkpoints for very expensive runs or less frequent for faster training.
   - **Priority**: Low
   - **Future Work**: Add checkpoint_frequency to job configuration

4. **No Job Queuing**: Phase 1 limits to one active job per user. If user starts second job while first is active, either reject or implement queuing system.
   - **Priority**: Medium
   - **Future Work**: Phase 2 - implement job queue with priority levels

5. **Validation Benchmarks Static**: Emotional intelligence test suite (50 scenarios) and financial knowledge questions (100 questions) are hard-coded. Clients may want custom test sets.
   - **Priority**: Low
   - **Future Work**: Phase 5 - allow custom validation dataset upload

---

## User Stories & Feature Mapping

### Key User Stories

The comprehensive user stories are documented in detail in the seed narrative (`pmc/product/00-pipeline-seed-narrative.md`). Below is a summary mapping to features:

#### Theme 1: Business Value & Revenue Growth

**IS1.1.1: Prove Dataset Quality** (Business Owner)
- **Story**: Train models on datasets and demonstrate 40%+ improvement in emotional intelligence metrics to charge $15k-30k for proven solutions
- **Mapped Features**:
  - ✅ Training File Service (already complete)
  - 🚧 Training Job Configuration (Phase 1)
  - 🚧 Automated Validation Suite (Phase 3)
  - 🚧 Validation Report Generation (Phase 3)
- **Acceptance Criteria**:
  - Successfully train LoRA model on 242-conversation dataset
  - Generate validation report showing ≥40% emotional intelligence improvement
  - Compare baseline vs trained model on 50 EI test cases
  - Export client-ready PDF report with charts and metrics
  - Complete training + validation in <24 hours

**IS1.1.2: Close Premium Deals with Proof** (Sales Lead)
- **Story**: Pitch "Custom AI with proven 40% better emotional intelligence" with validation reports to win competitive deals
- **Mapped Features**:
  - 🚧 Validation Report Generation (Phase 3)
  - 🚧 Before/After Comparison Dashboard (Phase 3)
  - 🚧 Executive Summary Generator (Phase 3)
- **Acceptance Criteria**:
  - Access library of validation reports from past training runs
  - Generate custom validation report for prospect's use cases
  - Download before/after comparison examples
  - Share secure links to validation reports (30-day expiration)
  - Track which reports lead to closed deals

**IS1.1.3: Justify ROI to Client CFOs** (Client Decision Maker)
- **Story**: See before/after validation reports with measurable improvements to justify $20k AI purchase to CFO/stakeholders
- **Mapped Features**:
  - 🚧 Validation Report PDF Export (Phase 3)
  - 🚧 Executive-Friendly Summary (Phase 3)
  - 🚧 Cost-Benefit Analysis Section (Phase 4)
- **Acceptance Criteria**:
  - Validation report includes specific percentage improvements
  - Before/after examples show clear quality difference
  - Report includes cost-benefit analysis
  - Metrics tied to business outcomes (customer satisfaction, response quality)
  - Executive summary suitable for non-technical stakeholders

#### Theme 2: Training Job Management & Orchestration

**IS2.1.1: One-Click Training Start** (AI Engineer)
- **Story**: Select dataset, choose hyperparameter preset, see cost estimate, start training with one click (not 40 hours manual setup)
- **Mapped Features**:
  - 🚧 Job Creation Form (Phase 1)
  - 🚧 Hyperparameter Preset Selector (Phase 1)
  - 🚧 Cost Estimation Engine (Phase 1)
  - 🚧 RunPod Integration (Phase 1)
- **Acceptance Criteria**:
  - Browse available training files (242-conversation dataset visible)
  - Select from 3 hyperparameter presets with explanations
  - Choose spot ($2.49/hr) vs on-demand ($7.99/hr) GPU
  - See cost + duration estimate update in real-time
  - Click "Start Training" and receive job ID immediately
  - Training starts within 5 minutes

**IS2.2.1: Real-Time Progress Dashboard** (AI Engineer)
- **Story**: See live progress bars, loss curves, learning rates, estimated time remaining to know training is progressing correctly
- **Mapped Features**:
  - 🚧 Job Details Dashboard (Phase 1)
  - 🚧 Live Loss Curve Chart (Phase 2)
  - 🚧 Training Stage Indicators (Phase 2)
  - 🚧 Real-Time Metrics Table (Phase 2)
- **Acceptance Criteria**:
  - Dashboard shows all active training jobs at a glance
  - Each job displays: progress percentage, current epoch, steps completed
  - Live-updating loss curve graph (refreshes every 60 seconds)
  - Learning rate schedule visualization
  - Estimated time remaining (updates based on actual speed)
  - Current cost accumulation ($X spent so far)
  - GPU utilization percentage

**IS2.3.1: Actionable Error Messages** (AI Engineer)
- **Story**: Receive clear error messages with suggested fixes (e.g., "Out of memory → reduce batch_size to 2") to retry correctly instead of guessing
- **Mapped Features**:
  - 🚧 Error Classification System (Phase 2)
  - 🚧 One-Click Retry with Adjustments (Phase 2)
  - 🚧 Webhook Event Log (Phase 2)
- **Acceptance Criteria**:
  - Error types recognized: OOM, dataset format, GPU failures, timeout
  - Each error includes: problem description, likely cause, suggested fix
  - Link to documentation for each error type
  - Track common errors to improve preset recommendations

**IS2.3.3: Spot Interruption Recovery** (AI Engineer, Operations)
- **Story**: Use spot instances (50-80% cheaper) with automatic checkpoint recovery when interrupted to save money without losing progress
- **Mapped Features**:
  - 🚧 Checkpoint Saving (Phase 2)
  - 🚧 Automatic Resume Logic (Phase 2)
  - 🚧 Interruption Tracking (Phase 2)
- **Acceptance Criteria**:
  - Checkpoint saved every 100 training steps to Supabase Storage
  - When spot instance interrupted, automatically resume from last checkpoint
  - Resume within 10 minutes of interruption
  - Track interruptions per job ("Interrupted 2x, resumed successfully")
  - Success rate ≥95% despite interruptions

#### Theme 3: Model Artifact Management

**IS3.1.1: Download LoRA Adapters** (AI Engineer, Client Integration Team)
- **Story**: Download LoRA adapters (adapter_model.bin, adapter_config.json) with one click to integrate into inference pipelines immediately
- **Mapped Features**:
  - 🚧 Model Artifact Storage (Phase 1)
  - 🚧 Artifact Download Interface (Phase 1)
  - 🚧 Signed URL Generation (Phase 1)
- **Acceptance Criteria**:
  - "Download Adapters" button on completed job page
  - Downloads ZIP file containing: adapter_model.bin (200-500MB), adapter_config.json
  - Signed URL valid for 24 hours (security)
  - Include README.txt with integration instructions
  - Track download count per model

**IS3.1.3: Deployment Package Generation** (Client Integration Engineer)
- **Story**: Receive deployment package (adapters + inference script + README) to integrate model without reverse-engineering setup
- **Mapped Features**:
  - 🚧 Deployment Package Generator (Phase 3)
  - 🚧 Inference Script Template (Phase 3)
  - 🚧 Integration Documentation (Phase 3)
- **Acceptance Criteria**:
  - Deployment ZIP contains: adapter_model.bin, adapter_config.json, inference.py, requirements.txt, README.md, example_prompts.json
  - Script works with `pip install -r requirements.txt && python inference.py`
  - README includes troubleshooting section

**IS3.2.1: Side-by-Side Training Run Comparison** (AI Engineer, Technical Lead)
- **Story**: Compare multiple training runs side-by-side (loss curves, final metrics, costs) to identify best configuration for production
- **Mapped Features**:
  - 🚧 Training Comparison Tool (Phase 4)
  - 🚧 Overlaid Loss Curves (Phase 4)
  - 🚧 Metrics Comparison Table (Phase 4)
- **Acceptance Criteria**:
  - Select 2-4 training runs to compare
  - Overlaid loss curves on same chart
  - Side-by-side metrics table (final loss, perplexity, cost, duration)
  - Highlight best performer for each metric
  - Export comparison report as PDF

#### Theme 4: Cost Management & Budget Control

**IS4.1.1: Real-Time Cost Monitoring** (AI Engineer, Budget Manager)
- **Story**: See current estimated costs updating in real-time to cancel jobs running longer/more expensive than expected
- **Mapped Features**:
  - 🚧 Cost Estimation Engine (Phase 1)
  - 🚧 Real-Time Cost Tracker (Phase 4)
  - 🚧 Cost Alert System (Phase 4)
- **Acceptance Criteria**:
  - Current cost displayed prominently on job dashboard
  - Updates every 60 seconds based on elapsed time + GPU rate
  - Shows actual cost vs initial estimate
  - Warning indicator if exceeding estimate by >20%
  - "Cancel Job" button with cost refund info

**IS4.1.2: Monthly Budget Tracking** (Budget Manager, Operations)
- **Story**: See total monthly spending, remaining budget, per-job costs to forecast expenses and set budget limits
- **Mapped Features**:
  - 🚧 Monthly Budget Dashboard (Phase 4)
  - 🚧 Cost Attribution by Client (Phase 4)
  - 🚧 Budget Limit Enforcement (Phase 4)
- **Acceptance Criteria**:
  - Dashboard shows: total spent this month, budget limit, remaining
  - Per-job breakdown (which jobs cost most)
  - Forecast spending based on active + queued jobs
  - Set monthly budget limit ($500 default)
  - Prevent new jobs if budget exceeded (unless override)

**IS4.1.3: Budget Alert System** (Budget Manager, Operations)
- **Story**: Receive automatic alerts when 80% and 95% of monthly budget is used to prevent overages and plan for capacity
- **Mapped Features**:
  - 🚧 Budget Threshold Monitoring (Phase 4)
  - 🚧 Email/Slack Alert Integration (Phase 4)
  - 🚧 Alert Configuration UI (Phase 4)
- **Acceptance Criteria**:
  - Email alert at 80% budget threshold
  - Email + Slack alert at 95% budget threshold
  - Alert includes: current spending, remaining budget, active jobs
  - Option to increase budget limit from alert email
  - Historical alert log for audit trail

#### Theme 5: Quality Validation & Metrics

**IS5.1.1: Perplexity Improvement Metrics** (AI Engineer, Quality Analyst)
- **Story**: See perplexity scores on validation data showing ≤30% improvement vs baseline to objectively measure training success
- **Mapped Features**:
  - 🚧 Perplexity Calculation Engine (Phase 3)
  - 🚧 Baseline vs Trained Comparison (Phase 3)
  - 🚧 Validation Results Dashboard (Phase 3)
- **Acceptance Criteria**:
  - Baseline perplexity: Test Llama 3 70B on validation set before training
  - Trained perplexity: Test trained model on same validation set
  - Calculate improvement: ((baseline - trained) / baseline) × 100%
  - Target: ≥30% improvement for production-ready models
  - Display: "Perplexity: 24.5 → 16.8 (31% improvement) ✓"

**IS5.1.2: Emotional Intelligence Benchmarks** (Quality Analyst, Client Stakeholder)
- **Story**: Compare trained model outputs vs baseline on EI test cases to demonstrate 40% improvement claimed to clients
- **Mapped Features**:
  - 🚧 EI Benchmark Suite (50 scenarios) (Phase 3)
  - 🚧 Human Evaluator Scoring Interface (Phase 3)
  - 🚧 EI Report Generation (Phase 3)
- **Acceptance Criteria**:
  - Curated test set: 50 emotional intelligence scenarios
  - Run baseline model + trained model on all 50 scenarios
  - Human evaluators score responses (1-5) on empathy, clarity, appropriateness
  - Calculate aggregate improvement percentage
  - Generate report: "Emotional Intelligence: 3.2/5 → 4.5/5 (41% improvement)"

**IS5.1.3: Catastrophic Forgetting Detection** (AI Engineer, Quality Analyst)
- **Story**: Test trained models on baseline financial knowledge questions to ensure ≥95% retention of pre-training knowledge
- **Mapped Features**:
  - 🚧 Financial Knowledge Test Suite (100 questions) (Phase 3)
  - 🚧 Retention Score Calculation (Phase 3)
  - 🚧 Forgetting Alert System (Phase 3)
- **Acceptance Criteria**:
  - Financial knowledge test set: 100 questions (taxes, retirement, investing)
  - Baseline accuracy: Llama 3 70B scores 85-90%
  - Trained model must score ≥95% of baseline (e.g., 81%+ if baseline is 85%)
  - Alert if retention <95% (likely overtraining)
  - Include retention score in validation report

**IS5.2.1: Elena Morales Voice Consistency** (Quality Analyst, Client Reviewer)
- **Story**: Evaluate trained model responses against Elena Morales voice profile to ensure ≥85% consistency for on-brand AI personalities
- **Mapped Features**:
  - 🚧 Brand Voice Rubric (10 characteristics) (Phase 3)
  - 🚧 Voice Consistency Scoring (Phase 3)
  - 🚧 Response Flagging System (Phase 3)
- **Acceptance Criteria**:
  - Voice rubric: 10 characteristics of Elena Morales
  - Evaluators score 30 responses on each characteristic (1-5 scale)
  - Calculate overall voice consistency percentage
  - Target: ≥85% consistency (average score ≥4.25/5)
  - Flag responses that score <3 on any characteristic

### Feature Mapping Summary

| User Story Theme | Feature Area | Phase | Priority | Status |
|-----------------|--------------|-------|----------|--------|
| Business Value & Revenue Growth | Validation Reporting | Phase 3 | High | 🚧 Pending |
| Training Job Management | Job Configuration & Start | Phase 1 | High | 🚧 Pending |
| Training Job Management | Progress Monitoring | Phase 2 | High | 🚧 Pending |
| Training Job Management | Error Handling & Recovery | Phase 2 | High | 🚧 Pending |
| Model Artifact Management | Download & Storage | Phase 1 | High | 🚧 Pending |
| Model Artifact Management | Deployment Packages | Phase 3 | Medium | 🚧 Pending |
| Model Artifact Management | Training Comparison | Phase 4 | Medium | 🚧 Pending |
| Cost Management | Estimation & Tracking | Phase 1 | High | 🚧 Pending |
| Cost Management | Budget Dashboard & Alerts | Phase 4 | Medium | 🚧 Pending |
| Quality Validation | Perplexity Benchmarks | Phase 3 | High | 🚧 Pending |
| Quality Validation | EI Benchmarks | Phase 3 | High | 🚧 Pending |
| Quality Validation | Forgetting Detection | Phase 3 | Medium | 🚧 Pending |
| Quality Validation | Brand Voice Consistency | Phase 3 | Medium | 🚧 Pending |

### Completion Qualifications

Each feature area has specific acceptance criteria documented in the user stories above. Key completion qualifications:

**Phase 1 Complete When**:
- ✅ AI Engineer can create training job in <10 minutes via UI
- ✅ Training starts within 5 minutes of clicking "Start"
- ✅ Job completes end-to-end and produces downloadable adapters
- ✅ Cost estimate within ±30% of actual cost (Phase 1 baseline)
- ✅ 1 successful training run from start to finish

**Phase 2 Complete When**:
- ✅ Real-time loss curve updates every 60 seconds
- ✅ Error messages are actionable (user can self-recover 80%+ of time)
- ✅ Spot instance interruption recovers automatically within 10 minutes
- ✅ 3 successful training runs with checkpoint recovery demonstrated

**Phase 3 Complete When**:
- ✅ Validation report shows perplexity improvement ≥30%
- ✅ EI benchmark shows improvement ≥40%
- ✅ Catastrophic forgetting check shows retention ≥95%
- ✅ Brand voice consistency score ≥85%
- ✅ 5 training runs with complete validation reports

**Phase 4 Complete When**:
- ✅ Cost estimate within ±15% of actual cost (refinement from Phase 1)
- ✅ Monthly budget dashboard operational with alerts at 80%/95%
- ✅ Training comparison tool enables side-by-side analysis
- ✅ Configuration templates enable one-click replication
- ✅ 10+ successful training runs demonstrating full system capabilities

---

## Potential Challenges & Risks

### Technical Challenges

#### Challenge 1: GPU Cost Overruns
**Risk**: Training runs exceed estimates, leading to surprise $200+ bills and budget anxiety

**Likelihood**: Medium (30-40% chance in first month)

**Impact**: High (financial risk, user trust erosion, hesitation to start training runs)

**Mitigation Strategies**:
1. **Hard Budget Limits**: Implement automatic job cancellation when monthly budget limit reached
2. **Real-Time Alerts**: Alert at 80% and 95% of estimated cost (user can cancel early)
3. **Manual Approval**: Require confirmation for jobs exceeding $150
4. **Historical Learning**: Track actual vs estimated costs, refine estimation formulas
5. **Default to Spot**: Encourage spot instances (50-80% cheaper) with checkpoint recovery
6. **Conservative Presets**: Default to Conservative preset (lower cost, proven reliability)

**Contingency Plan**: If cost overruns become frequent, reduce default epochs or batch size in presets until estimation accuracy improves

---

#### Challenge 2: Spot Instance Interruption Rate
**Risk**: 10-30% chance of spot interruption frustrates users if not handled well

**Likelihood**: High (will occur regularly with spot instances)

**Impact**: Medium (manageable with checkpoint recovery, but user perception risk)

**Mitigation Strategies**:
1. **Automatic Checkpointing**: Save every 100 steps to Supabase Storage (no data loss)
2. **Fast Recovery**: Resume within 10 minutes of interruption (tested in Phase 2)
3. **Interruption Tracking**: Display "Interrupted 2x, resumed successfully" so users know system is working
4. **Success Rate Monitoring**: Track actual interruption rate and adjust recommendations
5. **On-Demand Option**: Allow users to switch to on-demand mid-job if needed
6. **User Education**: Explain spot savings (50-80%) vs interruption tradeoff in UI

**Contingency Plan**: If interruption rate exceeds 40% or recovery fails frequently, recommend on-demand by default and make spot opt-in

---

#### Challenge 3: Training Quality Variance
**Risk**: Same configuration produces different results across runs (perplexity, quality scores vary)

**Likelihood**: Medium (20-30% variance typical in ML training)

**Impact**: Medium (confuses users, makes optimization difficult)

**Mitigation Strategies**:
1. **Fixed Random Seeds**: Set random seeds for reproducibility (PyTorch, NumPy, CUDA)
2. **Multiple Validation Passes**: Run 2-3 validation passes and average results
3. **Outlier Detection**: Flag results >20% deviation from expected range
4. **Documentation**: Explain variance factors in hyperparameter preset descriptions
5. **Conservative Recommendations**: For client deliverables, recommend presets with lowest variance
6. **Confidence Intervals**: Display confidence intervals in validation reports (±X%)

**Contingency Plan**: If variance exceeds 30%, increase validation dataset size or add ensemble validation (average 3 runs)

---

#### Challenge 4: Model Download Latency
**Risk**: 70B model download (140GB) takes 20-30 minutes on RunPod startup, delaying training

**Likelihood**: High (will occur on every cold start without pre-caching)

**Impact**: Low (annoying but not blocking, mitigated by pre-caching)

**Mitigation Strategies**:
1. **Pre-Cache Model**: Store Llama 3 70B on RunPod persistent volume ($0.10/GB/month = $14/month)
2. **Warmup Containers**: Pre-warm containers with model pre-loaded (reduce startup to <5 min)
3. **Fast Download**: Use Hugging Face Hub fast download (hf_transfer library)
4. **Transparent Reporting**: Display "Model Loading" stage separately from training time
5. **User Expectations**: Show "Estimated startup: 10-15 min" in job configuration

**Contingency Plan**: If persistent volumes are too expensive, optimize download speed with parallel downloads or smaller checkpoints

---

#### Challenge 5: Dataset Format Errors
**Risk**: Malformed JSON/JSONL causes training failures 2 hours into job, wasting time and money

**Likelihood**: Medium (20-30% of first-time users make formatting mistakes)

**Impact**: High (wastes GPU time, frustrates users, erodes trust)

**Mitigation Strategies**:
1. **Pre-Flight Validation**: Validate dataset format before allowing job creation
2. **Schema Validation**: Run schema validation on training file upload (check required fields)
3. **Sample Testing**: Test tokenization on sample before full training
4. **Clear Error Messages**: "Training pair #47 missing 'target_response' field" (not cryptic PyTorch error)
5. **Block Job Start**: Prevent "Start Training" button if validation fails
6. **Example Templates**: Provide example JSON files showing correct format

**Contingency Plan**: If validation errors persist, add dataset preview UI showing first 3 training pairs before start

---

### User Experience Challenges

#### Challenge 6: Engineers Fear Complexity
**Risk**: "I don't understand LoRA, hyperparameters, or GPU management" → Hesitation to use system

**Likelihood**: Medium (40-50% of team lacks LoRA expertise)

**Impact**: High (adoption risk, system sits unused)

**Mitigation Strategies**:
1. **Default to "Balanced"**: Pre-select proven configuration (no decisions required)
2. **Hide Advanced Settings**: Put advanced hyperparameters behind "Advanced Options" toggle
3. **Provide Tooltips**: Explain every field in simple language (hover for help)
4. **Video Tutorial**: "Your First Training Run in 5 Minutes" walkthrough
5. **Success Rate Transparency**: Show "95% success rate with default presets" to build confidence
6. **Guided First Run**: Offer "Guided Setup" wizard for first-time users

**Contingency Plan**: If adoption is low after 2 weeks, schedule 1-on-1 onboarding sessions with each engineer

---

#### Challenge 7: Initial Training Failures Discourage Adoption
**Risk**: First training run fails → User loses confidence → System sits unused

**Likelihood**: Medium (30-40% first-run failure rate without validation)

**Impact**: High (adoption risk, negative word-of-mouth)

**Mitigation Strategies**:
1. **Pre-Flight Checks**: Run automated checks before job starts (budget, dataset, GPU availability)
2. **Common Issue Detection**: Check for common problems (insufficient budget, malformed dataset, wrong GPU type)
3. **Setup Wizard**: Provide setup wizard for first-time users (validates environment)
4. **Guaranteed Support**: Offer "guaranteed support" for first run (engineer assistance if needed)
5. **Track First-Run Success**: Monitor first-run success rate (target 90%+)
6. **Quick Wins**: Ensure first run uses Conservative preset (highest success rate)

**Contingency Plan**: If first-run success rate <80%, add mandatory "test run" on small dataset (10 conversations, 5 minutes, $1 cost)

---

#### Challenge 8: Users Don't Trust Validation Metrics
**Risk**: "These numbers look good, but does the model actually work?" → Skepticism despite objective metrics

**Likelihood**: Medium (30-40% of users need qualitative proof)

**Impact**: Medium (slows adoption, requires additional validation)

**Mitigation Strategies**:
1. **Qualitative Examples**: Include 10+ before/after examples in validation report
2. **Interactive Testing**: Allow users to test models on custom prompts before download
3. **Inference Playground**: Paste prompt → See baseline vs trained response side-by-side
4. **Human Evaluation Option**: Offer human evaluation service ($500) for high-stakes client deliveries
5. **Case Studies**: Share case studies of successful model deployments
6. **Client Testimonials**: Collect testimonials from clients who deployed models successfully

**Contingency Plan**: If trust remains low, add "confidence score" to validation reports (high/medium/low based on variance and benchmark coverage)

---

### Business/Adoption Risks

#### Challenge 9: Training Costs Eat Into Margins
**Risk**: $100 training cost + 10 hours engineer time → Negative margin on $15k deal

**Likelihood**: Low (training costs should be <5% of sale price)

**Impact**: High (business viability risk if margins erode)

**Mitigation Strategies**:
1. **Cost Optimization**: Spot instances, checkpoint recovery, batch jobs (target <$75 per run)
2. **Target Ratio**: Keep training cost <5% of sale price ($75 training for $15k sale)
3. **Engineer Efficiency**: Reduce engineer time to <5 hours per run (mostly configuration + validation)
4. **Amortize Infrastructure**: Spread training infrastructure costs across multiple clients
5. **Price Models Appropriately**: Price at $15k-30k to maintain 80%+ margin
6. **Track Unit Economics**: Monitor cost per model, adjust pricing if margins drop below 70%

**Contingency Plan**: If margins drop below 70%, increase prices or reduce training costs by optimizing hyperparameters

---

#### Challenge 10: Client Dissatisfaction with Results
**Risk**: Client receives trained model, says "this isn't better than baseline" → Refund request

**Likelihood**: Low (validation reports should prevent this)

**Impact**: High (revenue loss, reputation damage, client churn)

**Mitigation Strategies**:
1. **Never Deliver Without Validation**: 100% of deliveries include validation report (proof of improvement)
2. **Re-Training Guarantee**: Offer re-training with different configuration if results below target
3. **30-Day Support**: Include 30-day support period for model integration issues
4. **Immediate Feedback**: Collect client feedback within 7 days of delivery
5. **Refund/Redo Guarantee**: Refund or redo if improvement <20% (below acceptable threshold)
6. **Set Expectations**: Clear communication: "Target 40%+ improvement, minimum 20% guarantee"

**Contingency Plan**: If dissatisfaction rate exceeds 10%, add mandatory client acceptance testing before final delivery (test on client's scenarios)

---

#### Challenge 11: Competitors Copy Our Approach
**Risk**: Competitors see validation reports, replicate training infrastructure, undercut pricing

**Likelihood**: Medium (40-50% chance within 12 months if we succeed)

**Impact**: Medium (differentiation erosion, pricing pressure)

**Mitigation Strategies**:
1. **Differentiation is Dataset Quality**: LoRA training is commoditizable, but emotional intelligence scaffolding is our IP
2. **Build Brand Early**: Establish "Bright Run: Proven AI Quality" reputation before competitors catch up
3. **Patents/IP**: Consider patents on emotional intelligence scaffolding methodology
4. **Network Effects**: More training runs → Better presets → Higher quality → Stronger moat
5. **Speed to Market**: First-mover advantage (establish relationships before competitors launch)
6. **Client Lock-In**: Iterative improvement loop (clients return for v2, v3 with refined datasets)

**Contingency Plan**: If competitors launch similar offerings, double down on dataset quality differentiation and client success stories

---

### Risk Mitigation Strategies

**Overall Risk Management Approach**:
1. **Phased Rollout**: 4-phase approach allows early problem detection and course correction
2. **User Testing**: Beta test with 2-3 internal team members before wider rollout
3. **Monitoring & Alerts**: Comprehensive monitoring (success rates, costs, quality scores) with automated alerts
4. **Rapid Iteration**: Weekly retrospectives to identify issues and ship fixes quickly
5. **Clear Documentation**: Comprehensive docs reduce support burden and build user confidence
6. **User Feedback Loop**: Regular feedback collection (surveys, interviews) to identify friction points
7. **Success Metrics**: Clear KPIs (95% success rate, ±15% cost accuracy, 40% EI improvement) enable objective evaluation

**Decision Points**:
- **Week 2**: Review Phase 1 completion, decide if ready for Phase 2 or need additional work
- **Week 4**: Review success rate and cost accuracy, adjust presets if needed
- **Week 5**: Review validation quality, adjust benchmarks if too lenient/strict
- **Week 6**: Go/no-go decision for production rollout (all phases complete + acceptance criteria met)

---

## Product Quality Standards

### Performance Standards

**Speed Requirements**:
- **Job Creation**: Form submission to database record created in <2 seconds
- **Training Start**: "Start Training" button to GPU provisioning in <5 minutes
- **Dashboard Load**: Training jobs list page loads in <1 second (even with 100+ jobs)
- **Loss Curve Update**: Live chart updates within 60 seconds of webhook receipt
- **Artifact Download**: Signed URL generation in <3 seconds, download speed limited only by user bandwidth

**Reliability Goals**:
- **Training Success Rate**: ≥95% of jobs complete successfully (including retry attempts)
- **Checkpoint Recovery**: ≥99% of checkpoint saves succeed, ≥95% of recoveries succeed
- **Webhook Processing**: ≥99.9% of webhook events processed successfully
- **Database Uptime**: ≥99.9% (Supabase SLA)
- **API Availability**: ≥99% (Next.js + Vercel deployment)

**Scalability Needs**:
- **Concurrent Jobs**: Support 5-10 concurrent training jobs (different users)
- **Historical Jobs**: Database performance maintained with 1000+ historical jobs
- **Metrics Storage**: Efficiently store and query 1M+ metric data points
- **Storage Growth**: Plan for 10-20 GB/month artifact storage growth

### Development Standards

**Coding Standards**:
- **TypeScript**: 100% TypeScript for type safety (no `any` types without explicit justification)
- **ESLint**: Pass all linting rules (no errors, warnings acceptable with comments)
- **Formatting**: Prettier auto-formatting enforced on commit (pre-commit hook)
- **Naming Conventions**: 
  - **Files**: kebab-case (training-service.ts)
  - **Components**: PascalCase (TrainingJobCard.tsx)
  - **Functions**: camelCase (createTrainingJob)
  - **Constants**: UPPER_SNAKE_CASE (MAX_RETRY_ATTEMPTS)

**Review Requirements**:
- **Code Review**: All PRs require 1 approval from technical lead before merge
- **Testing**: Unit tests for services, integration tests for API routes
- **Documentation**: Inline comments for complex logic, README for each major service
- **Breaking Changes**: Require migration scripts and backward compatibility plan

**Testing Requirements**:
- **Unit Tests**: ≥80% code coverage for services (TrainingService, ValidationService)
- **Integration Tests**: E2E tests for critical paths (create job → start → monitor → download)
- **Manual Testing**: Smoke tests before each deployment (create job, check dashboard, download artifact)
- **Load Testing**: Test with 10 concurrent jobs before production rollout

---

## Product Documentation Planning

### Required Documentation

#### 1. Product Specifications (This Document)
**Status**: ✅ Complete (pmc/product/01-pipeline-overview.md)
- Product summary and value proposition
- Target audience and pain points
- Project goals (user, technical, business)
- Core features and scope definition
- Product architecture and technology stack
- Success criteria and milestone tracking
- Current state and development phase
- User stories and feature mapping
- Potential challenges and risk mitigation
- Quality standards and documentation plan

#### 2. Technical Documentation
**Status**: 🚧 To Be Created in Phase 1-4

**Database Schema Documentation** (`src/lib/database/schema-training.md`)
- Table definitions with column descriptions
- Relationships and foreign keys
- Indexes and performance optimizations
- Row Level Security policies
- Example queries for common operations

**API Documentation** (`src/app/api/training/README.md`)
- Endpoint list with methods, paths, descriptions
- Request/response schemas
- Authentication requirements
- Rate limiting policies
- Error codes and messages
- Example curl commands

**Service Layer Documentation** (`src/lib/services/training-service-README.md`)
- TrainingService methods and parameters
- ValidationService methods
- ModelArtifactService methods
- Code examples for common tasks
- Error handling patterns
- Best practices

**RunPod Container Documentation** (`docker/training/README.md`)
- Container setup and configuration
- Environment variables
- Training orchestrator (train_lora.py) usage
- Checkpoint management
- Webhook event format
- Troubleshooting common issues

#### 3. User Guides / Tutorials
**Status**: 🚧 To Be Created in Phase 3-4

**"Your First Training Run" Tutorial** (`docs/tutorials/first-training-run.md`)
- Prerequisites (training file, budget, GPU selection)
- Step-by-step walkthrough with screenshots
- Expected timelines (5 min start, 12 hours training)
- How to monitor progress
- How to download artifacts
- What to do if something goes wrong

**Hyperparameter Presets Explained** (`docs/guides/hyperparameter-presets.md`)
- Conservative preset: When to use, expected results, cost/time
- Balanced preset: Default choice, proven quality, typical use cases
- Aggressive preset: High-quality requirements, longer training, higher cost
- Comparison table showing tradeoffs
- Real-world examples from production runs

**Troubleshooting Common Errors** (`docs/troubleshooting/training-errors.md`)
- Out of Memory errors (causes, solutions, prevention)
- Dataset format errors (validation, fixing, examples)
- GPU provisioning failures (retry, check budget, switch to on-demand)
- Timeout errors (adjust configuration, split dataset)
- Network errors (retry logic, check connectivity)

**Cost Optimization Guide** (`docs/guides/cost-optimization.md`)
- Spot vs on-demand tradeoffs
- Hyperparameter impact on cost
- Batch size optimization
- Epoch tuning for quality/cost balance
- Budget setting best practices

**Model Deployment Guide** (`docs/guides/model-deployment.md`)
- How to use downloaded adapters
- Inference script examples (Python, REST API)
- Integration with Hugging Face Transformers
- Performance optimization (quantization, batching)
- Production deployment checklist

#### 4. API Documentation (Auto-Generated)
**Status**: 🚧 To Be Created with Swagger/OpenAPI

**OpenAPI Specification** (`src/app/api/training/openapi.yaml`)
- Auto-generated from TypeScript types
- Deployed to `/api/training/docs` (Swagger UI)
- Interactive API testing in browser
- Request/response schemas with examples

#### 5. Deployment Guides
**Status**: 🚧 To Be Created in Phase 4

**Production Deployment Checklist** (`docs/deployment/production-checklist.md`)
- Environment variables configuration
- Supabase setup (database, storage buckets, RLS policies)
- RunPod account and API keys
- Vercel deployment settings
- Monitoring and alerting setup
- Backup and disaster recovery plan

**Supabase Setup Guide** (`docs/deployment/supabase-setup.md`)
- Run database migrations
- Create storage buckets
- Configure Row Level Security
- Set up webhooks
- Configure authentication

**RunPod Setup Guide** (`docs/deployment/runpod-setup.md`)
- Create RunPod account
- Deploy Docker container
- Configure endpoint templates
- Set up persistent volumes for model caching
- Configure webhook URLs

### Documentation Responsibilities

| Document Type | Owner | Reviewer | Due Date |
|--------------|-------|----------|----------|
| Product Overview | Product Manager | Technical Lead | ✅ Complete |
| Database Schema | Backend Engineer | Technical Lead | Phase 1 |
| API Documentation | Backend Engineer | Technical Lead | Phase 1 |
| Service Layer Docs | Backend Engineer | Technical Lead | Phase 2 |
| RunPod Container Docs | ML Engineer | Technical Lead | Phase 2 |
| User Tutorials | Product Manager | AI Engineers (users) | Phase 3 |
| Hyperparameter Guide | ML Engineer | AI Engineers | Phase 3 |
| Troubleshooting Guide | DevOps Engineer | AI Engineers | Phase 4 |
| Cost Optimization Guide | Product Manager | Budget Manager | Phase 4 |
| Deployment Guides | DevOps Engineer | Technical Lead | Phase 4 |

### Documentation Maintenance Procedures
- **Review Cycle**: Quarterly review and update of all documentation
- **Version Control**: Documentation stored in Git alongside code
- **Change Tracking**: Update docs in same PR as code changes
- **Feedback Loop**: Collect user feedback on docs, iterate based on confusion points
- **Accessibility**: All docs written in Markdown, rendered to HTML with search

---

## Next Steps & Execution Plan

### Immediate Actions (Week 0 - Preparation)

**Action 1: Budget Approval**
- **Owner**: Business Owner / CFO
- **Timeline**: Immediate (1-2 days)
- **Budget Requested**: $400 initial training experiments + $50-150/month operational costs
- **Breakdown**:
  - $200 - Initial testing (4 training runs @ $50 each to validate RunPod setup)
  - $200 - Phase 1 validation (4 training runs to test database integration)
  - $50-150/month - Ongoing training costs (1-3 runs per month)
  - $14/month - RunPod persistent volume (model caching)
- **ROI**: 4x revenue multiplier ($5k datasets → $15k-30k models), cost <5% of sale price

**Action 2: RunPod Account Setup**
- **Owner**: DevOps Engineer
- **Timeline**: 1 day
- **Steps**:
  1. Create RunPod account (https://runpod.io)
  2. Add payment method and set up billing alerts
  3. Generate API key and store in 1Password/environment variables
  4. Test GPU provisioning (create H100 spot instance, verify startup)
  5. Create persistent volume for model caching (80GB for Llama 3 70B)
- **Deliverable**: RunPod API key, persistent volume ID, documentation in team wiki

**Action 3: Hugging Face Model Access**
- **Owner**: ML Engineer
- **Timeline**: 1 day
- **Steps**:
  1. Request access to Llama 3 70B Instruct (gated model, requires acceptance)
  2. Generate Hugging Face API token
  3. Test model download (verify can download to local machine)
  4. Document model ID and token storage
- **Deliverable**: Hugging Face token, model access confirmed

**Action 4: Technical Kickoff Meeting**
- **Owner**: Technical Lead
- **Timeline**: 1 day (schedule within 3 days of budget approval)
- **Attendees**: Technical Lead, Backend Engineer, ML Engineer, DevOps Engineer, Product Manager
- **Agenda**:
  1. Review product overview document (this doc)
  2. Discuss architecture and component responsibilities
  3. Assign Phase 1 tasks to team members
  4. Set up project tracking (Linear/Jira board with issues)
  5. Establish communication channels (Slack channel, daily standups)
- **Deliverable**: Task assignments, project board created, team aligned

---

### Phase 1: Foundation (Weeks 1-3) - Database & API Layer

**Goal**: Extend existing Supabase infrastructure to support training job management

**Duration**: 3 weeks (15 working days)

**Team**: Backend Engineer (lead), ML Engineer (RunPod integration), Frontend Engineer (basic UI)

#### Task 1.1: Database Schema Extensions (Week 1, Days 1-2)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Create database migration file (`migrations/20251216_training_infrastructure.sql`)
2. Define `training_jobs` table with all fields (configuration, status, progress, costs, error tracking)
3. Define `model_artifacts` table (adapter paths, metrics, validation results, download tracking)
4. Define `training_metrics_history` table (loss curves, learning rates, GPU utilization)
5. Define `training_webhook_events` table (event log from GPU container)
6. Add indexes for efficient querying (job_id, status, created_at, reported_at)
7. Configure Row Level Security policies (users can only see their own jobs)
8. Test migration on local Supabase instance
9. Deploy migration to production Supabase
10. Document schema in `src/lib/database/schema-training.md`

**Deliverable**: Database migration deployed, tables created, documentation complete

**Success Criteria**: Can insert/query training_jobs, schema documented

---

#### Task 1.2: TrainingService Implementation (Week 1, Days 3-5 + Week 2, Days 1-2)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Create `src/lib/services/training-service.ts` (skeleton with interfaces)
2. Implement `createTrainingJob(input)` - validate training file, check budget, insert record
3. Implement `listJobs(filters)` - query with pagination, filtering, sorting
4. Implement `getJobStatus(jobId)` - fetch job details including latest metrics
5. Implement `startTraining(jobId)` - call RunPod API to provision GPU (stub for now)
6. Implement `cancelJob(jobId)` - stop RunPod instance, update status
7. Implement `processWebhookEvent(event)` - parse webhook, update database
8. Implement cost estimation logic (calculate based on GPU type, epochs, batch size, dataset size)
9. Implement budget validation (check monthly spending, enforce limits)
10. Define hyperparameter presets (Conservative, Balanced, Aggressive) with configurations
11. Write unit tests for all methods (use Jest + Supabase mock)
12. Document service in `src/lib/services/training-service-README.md`

**Deliverable**: TrainingService complete with tests, RunPod integration stubbed

**Success Criteria**: Can create jobs, estimate costs, list jobs, unit tests pass

---

#### Task 1.3: API Routes (Week 2, Days 3-5)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Create `src/app/api/training/jobs/route.ts` (POST create, GET list)
2. Create `src/app/api/training/jobs/[id]/route.ts` (GET details, DELETE delete)
3. Create `src/app/api/training/jobs/[id]/start/route.ts` (POST start)
4. Create `src/app/api/training/jobs/[id]/cancel/route.ts` (POST cancel)
5. Create `src/app/api/training/webhook/route.ts` (POST receive events from GPU)
6. Add authentication middleware (Supabase JWT validation)
7. Add request validation (Zod schemas)
8. Add error handling (return user-friendly error messages)
9. Write integration tests (test full request/response cycle)
10. Document APIs in `src/app/api/training/README.md`

**Deliverable**: API routes functional, integration tests pass, documentation complete

**Success Criteria**: Can create jobs via API, start jobs, receive webhooks

---

#### Task 1.4: RunPod Docker Container (Week 2, Days 4-5 + Week 3, Days 1-3)
**Assigned to**: ML Engineer

**Subtasks**:
1. Create `docker/training/Dockerfile` (base: runpod/pytorch:2.1.0-py3.10-cuda12.1.0-devel)
2. Install Python packages (transformers, peft, trl, bitsandbytes, accelerate, torch, supabase-py, requests)
3. Create `docker/training/train_lora.py` (training orchestrator script)
4. Implement model loading (download Llama 3 70B, apply 4-bit quantization with BitsAndBytes)
5. Implement dataset preprocessing (download from Supabase, convert to Llama 3 chat format)
6. Implement LoRA adapter initialization (PEFT with configurable rank, alpha, target modules)
7. Implement training loop (SFTTrainer with checkpoint saving every 100 steps)
8. Implement checkpoint upload (save to Supabase Storage after each checkpoint)
9. Implement webhook reporting (send status, metrics, errors to Next.js backend)
10. Implement artifact upload (save adapters, metrics to Supabase Storage on completion)
11. Test Docker container locally (run training on small dataset)
12. Deploy container to RunPod (create endpoint template)
13. Document container in `docker/training/README.md`

**Deliverable**: Docker container deployed to RunPod, tested on small dataset

**Success Criteria**: Can start training from API, receive webhook events, download adapters

---

#### Task 1.5: Basic UI Components (Week 3, Days 1-3)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Create `src/app/(dashboard)/training-jobs/page.tsx` (jobs list page)
2. Create `src/components/training/TrainingJobCard.tsx` (job summary card with status badge)
3. Create `src/app/(dashboard)/training-jobs/new/page.tsx` (job creation form)
4. Create `src/components/training/JobConfigurationForm.tsx` (form with training file selector, preset selector, GPU selector)
5. Create `src/components/training/HyperparameterPresetSelector.tsx` (preset cards with explanations)
6. Create `src/app/(dashboard)/training-jobs/[id]/page.tsx` (job details page)
7. Create `src/components/training/TrainingProgress.tsx` (progress indicator with stage display)
8. Add real-time polling (fetch job status every 10 seconds on details page)
9. Add "Start Training" button with confirmation dialog
10. Add "Download Adapters" button with signed URL generation

**Deliverable**: Basic UI functional (create job, view list, view details, download artifacts)

**Success Criteria**: User can create training job via UI, monitor status, download adapters

---

#### Task 1.6: End-to-End Integration Test (Week 3, Days 4-5)
**Assigned to**: Full Team

**Subtasks**:
1. Create test training file (10 conversations, small for fast testing)
2. Start training job via UI (Conservative preset, spot instance)
3. Monitor progress in real-time (verify webhook events arrive, metrics update)
4. Wait for completion (5-10 minutes for small dataset)
5. Download adapters (verify adapter_model.bin and adapter_config.json exist)
6. Test adapter loading (load adapters with Hugging Face Transformers, run inference)
7. Document any issues encountered
8. Fix critical bugs before Phase 2
9. Celebrate first successful training run! 🎉

**Deliverable**: First end-to-end training run completed successfully

**Success Criteria**: Training completes, artifacts downloadable, adapters loadable

---

### Phase 2: Monitoring & Reliability (Weeks 3-4) - Progress Visibility

**Goal**: Implement real-time monitoring, error handling, and checkpoint recovery

**Duration**: 1.5 weeks (7-8 working days, overlaps with Phase 1 Week 3)

**Team**: Frontend Engineer (lead), Backend Engineer (webhook processing), ML Engineer (checkpoint recovery)

#### Task 2.1: Real-Time Loss Curve Visualization (Days 1-2)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Install Chart.js or Recharts library
2. Create `src/components/training/MetricsChart.tsx` (line chart component)
3. Fetch training metrics history from API (GET /api/training/jobs/:id/metrics)
4. Plot training loss and validation loss on same chart (two lines, different colors)
5. Add interactive tooltips (hover to see exact values)
6. Add auto-refresh (refetch data every 60 seconds if job is active)
7. Add chart controls (zoom, pan, reset)
8. Style chart to match Shadcn/UI design system

**Deliverable**: Live loss curve updating every 60 seconds on job details page

**Success Criteria**: Loss curve displays historical data, updates in real-time, interactive

---

#### Task 2.2: Training Stage Indicators (Days 2-3)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Create `src/components/training/StageIndicator.tsx` (component with 4 stages)
2. Display stages: Preprocessing → Model Loading → Training → Finalization
3. Highlight current stage based on job status
4. Show estimated duration for each stage
5. Show elapsed time for current stage
6. Add progress bar for each stage (if available from metrics)
7. Style with colors (gray for pending, blue for active, green for complete)

**Deliverable**: Stage indicator component showing training progress

**Success Criteria**: Stages update as training progresses, time estimates accurate

---

#### Task 2.3: Webhook Event Log Viewer (Days 3-4)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Create `src/components/training/WebhookEventLog.tsx` (chronological log table)
2. Fetch events from API (GET /api/training/jobs/:id/events)
3. Display: timestamp, event type, payload preview (collapsed JSON)
4. Add filtering by event type (status_change, metrics_update, error, warning)
5. Add search by keyword in payload
6. Add pagination (show 50 events per page)
7. Add "Export as JSON" button for debugging

**Deliverable**: Event log viewer on job details page

**Success Criteria**: Can view all webhook events, filter, search, export

---

#### Task 2.4: Error Classification System (Days 4-5)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Create `src/lib/training-errors.ts` (error classification logic)
2. Map common error patterns to user-friendly messages:
   - OutOfMemoryError → "Reduce batch_size to 2 or use conservative preset"
   - DatasetFormatError → "Training pair #X missing field Y"
   - GPUProvisioningError → "No H100 GPUs available, retry or switch to on-demand"
   - TimeoutError → "Training exceeded 24h limit, reduce epochs"
3. Add suggested fix for each error type
4. Update `processWebhookEvent` to classify errors and store in database
5. Update API routes to return user-friendly error messages

**Deliverable**: Error classification system with actionable messages

**Success Criteria**: Error messages are clear, suggest specific fixes

---

#### Task 2.5: One-Click Retry with Adjustments (Days 5-6)
**Assigned to**: Frontend Engineer + Backend Engineer

**Subtasks**:
1. Add "Retry" button on failed job page
2. Pre-fill job creation form with previous configuration
3. If error has suggested fix, auto-apply adjustments (e.g., batch_size: 4 → 2)
4. Show diff of what changed (highlight changed fields)
5. Allow user to review changes before starting retry
6. Implement retry API endpoint (POST /api/training/jobs/:id/retry)
7. Copy configuration from failed job, create new job with adjustments

**Deliverable**: One-click retry functional with suggested adjustments

**Success Criteria**: User can retry failed job in <30 seconds with suggested fixes applied

---

#### Task 2.6: Spot Instance Checkpoint Recovery (Days 6-8)
**Assigned to**: ML Engineer + Backend Engineer

**Subtasks**:
1. Update `train_lora.py` to save checkpoints every 100 steps
2. Upload checkpoints to Supabase Storage (`training-checkpoints` bucket)
3. Detect spot instance interruption (catch SIGTERM signal)
4. Send "interrupted" webhook event with last checkpoint step
5. Update TrainingService to handle interruption (set status to "recovering")
6. Provision new spot instance automatically
7. Pass checkpoint path in container environment variables
8. Update `train_lora.py` to download checkpoint and resume training
9. Send "resumed" webhook event when training continues
10. Test recovery (manually interrupt spot instance, verify automatic resume)

**Deliverable**: Automatic checkpoint recovery functional

**Success Criteria**: Spot interruption triggers automatic resume within 10 minutes, training continues from last checkpoint

---

### Phase 3: Validation & Quality Reporting (Weeks 4-6) - Prove the Quality

**Goal**: Implement automated validation suite and client-ready reporting

**Duration**: 2 weeks (10 working days)

**Team**: ML Engineer (lead - validation logic), Backend Engineer (API integration), Frontend Engineer (report UI)

#### Task 3.1: Perplexity Calculation (Days 1-2)
**Assigned to**: ML Engineer

**Subtasks**:
1. Create `src/lib/validation/perplexity-calculator.ts`
2. Implement baseline perplexity calculation (test Llama 3 70B on validation set)
3. Implement trained perplexity calculation (test LoRA-adapted model on same set)
4. Use 20% of training data as validation set (hold out during training)
5. Calculate improvement percentage: ((baseline - trained) / baseline) × 100
6. Store results in `model_artifacts` table
7. Add perplexity calculation to training completion workflow

**Deliverable**: Perplexity benchmarks calculated automatically after training

**Success Criteria**: Baseline and trained perplexity stored, improvement ≥30% typical

---

#### Task 3.2: Emotional Intelligence Benchmark Suite (Days 3-5)
**Assigned to**: ML Engineer + Product Manager

**Subtasks**:
1. Curate 50 emotional intelligence test scenarios (empathy, emotional awareness, supportive responses)
2. Create `data/validation/ei-benchmark-suite.json` with scenarios
3. Implement evaluator scoring interface (human evaluators score 1-5 on empathy, clarity, appropriateness)
4. Run baseline model on all 50 scenarios (save responses)
5. Run trained model on all 50 scenarios (save responses)
6. Calculate aggregate improvement: average score improvement across all scenarios
7. Store results in `model_artifacts` table
8. Add EI benchmark to training completion workflow

**Deliverable**: EI benchmark suite operational, scores calculated automatically

**Success Criteria**: 50 scenarios tested, improvement ≥40% typical

---

#### Task 3.3: Catastrophic Forgetting Detection (Days 5-6)
**Assigned to**: ML Engineer

**Subtasks**:
1. Create 100-question financial knowledge test set (taxes, retirement, investing, insurance)
2. Store in `data/validation/financial-knowledge-test.json`
3. Test baseline model (Llama 3 70B) on all 100 questions (expect 85-90% accuracy)
4. Test trained model on same 100 questions
5. Calculate retention: (trained_accuracy / baseline_accuracy) × 100
6. Alert if retention <95% (indicates overtraining)
7. Store results in `model_artifacts` table
8. Add forgetting check to training completion workflow

**Deliverable**: Catastrophic forgetting detection operational

**Success Criteria**: Retention ≥95%, alerts if below threshold

---

#### Task 3.4: Brand Voice Consistency Rubric (Days 6-7)
**Assigned to**: ML Engineer + Product Manager

**Subtasks**:
1. Define Elena Morales voice rubric (10 characteristics: warmth, directness, education-first, empathy, optimism, pragmatism, non-judgmental, progress celebration, values alignment, financial literacy)
2. Create evaluation interface for human evaluators
3. Generate 30 test prompts representing typical financial planning scenarios
4. Run baseline and trained models on 30 prompts
5. Evaluators score each response on each characteristic (1-5 scale)
6. Calculate overall consistency: average score across all characteristics and prompts
7. Flag responses scoring <3 on any characteristic
8. Store results in `model_artifacts` table
9. Add brand voice check to training completion workflow

**Deliverable**: Brand voice consistency measurement operational

**Success Criteria**: Consistency ≥85% typical, flagged responses reviewed

---

#### Task 3.5: Validation Report Generation (Days 7-9)
**Assigned to**: Frontend Engineer + ML Engineer

**Subtasks**:
1. Create report template (HTML/PDF with charts, tables, examples)
2. Include sections:
   - Executive Summary (non-technical, 1 page)
   - Perplexity Benchmarks (chart, baseline vs trained)
   - Emotional Intelligence Scores (chart, before/after comparison)
   - Catastrophic Forgetting Check (retention percentage, flagged areas)
   - Brand Voice Consistency (rubric scores, flagged responses)
   - Before/After Examples (10 side-by-side comparisons)
   - Technical Appendix (detailed metrics, methodology)
3. Implement PDF generation (use puppeteer or similar)
4. Store PDF in Supabase Storage
5. Add "Download Validation Report" button on job details page
6. Add report preview UI (show key metrics before download)

**Deliverable**: Validation report PDF generated automatically after training

**Success Criteria**: Report includes all sections, charts, examples, downloadable as PDF

---

#### Task 3.6: Before/After Comparison Dashboard (Days 9-10)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Create `src/components/training/BeforeAfterComparison.tsx`
2. Display 10 example prompts with baseline and trained responses side-by-side
3. Highlight improvements (empathy increased, jargon removed, warmth added)
4. Add filtering by scenario type (empathy, financial advice, emotional support)
5. Add "Share this comparison" button (generate shareable link, 30-day expiration)
6. Style with clear visual distinction (baseline gray, trained blue/green)

**Deliverable**: Before/after comparison dashboard on job details page

**Success Criteria**: Comparisons clearly show quality improvements, shareable links work

---

### Phase 4: Cost Management & Optimization (Week 5-6) - Polish and Scale

**Goal**: Refine cost tracking, add budget management, enable training comparison

**Duration**: 2 weeks (10 working days)

**Team**: Backend Engineer (cost tracking), Frontend Engineer (dashboards), Product Manager (documentation)

#### Task 4.1: Cost Estimation Refinement (Days 1-2)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Analyze historical data (actual costs vs estimates for first 10+ training runs)
2. Calculate average variance per configuration preset
3. Refine estimation formulas to reduce variance
4. Add confidence intervals to estimates (±X%)
5. Update TrainingService cost estimation logic
6. Target: actual costs within ±15% of estimates for 90% of jobs

**Deliverable**: Improved cost estimation accuracy

**Success Criteria**: Variance reduced from ±30% (Phase 1) to ±15% (Phase 4)

---

#### Task 4.2: Real-Time Cost Tracking with Alerts (Days 2-3)
**Assigned to**: Backend Engineer + Frontend Engineer

**Subtasks**:
1. Update webhook processing to calculate real-time cost (elapsed time × GPU rate)
2. Store current cost in `training_jobs` table
3. Compare actual cost vs estimate, calculate variance percentage
4. Send alert if variance >20% (email/Slack notification)
5. Display warning indicator on job dashboard if exceeding estimate
6. Add "Cancel Job" button with cost refund info (show cost spent so far)

**Deliverable**: Real-time cost alerts functional

**Success Criteria**: Alerts sent when cost exceeds estimate by >20%, users can cancel early

---

#### Task 4.3: Monthly Budget Dashboard (Days 3-5)
**Assigned to**: Frontend Engineer + Backend Engineer

**Subtasks**:
1. Create `src/app/(dashboard)/training-budget/page.tsx`
2. Display monthly spending summary:
   - Total spent this month
   - Budget limit
   - Remaining budget
   - Forecast (based on active + queued jobs)
3. Display per-job cost breakdown (table showing all jobs this month with costs)
4. Add cost attribution by client/project (tag jobs with client ID)
5. Implement budget limit enforcement (prevent new jobs if budget exceeded)
6. Add "Increase Budget" button with confirmation

**Deliverable**: Monthly budget dashboard operational

**Success Criteria**: Budget dashboard shows spending, limits, forecast accurately

---

#### Task 4.4: Budget Alert System (Days 5-6)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Implement budget threshold monitoring (check after each job update)
2. Send email alert at 80% of monthly budget threshold
3. Send email + Slack alert at 95% of monthly budget threshold
4. Alert includes: current spending, remaining budget, active jobs, forecast
5. Add "Increase Budget Limit" link in email (redirects to budget dashboard)
6. Store alert history in database for audit trail
7. Configure alert preferences per user (email, Slack, both, neither)

**Deliverable**: Budget alerts functional

**Success Criteria**: Alerts sent at correct thresholds, recipients can configure preferences

---

#### Task 4.5: Training Comparison Tool (Days 6-8)
**Assigned to**: Frontend Engineer

**Subtasks**:
1. Create `src/app/(dashboard)/training-jobs/compare/page.tsx`
2. Add multi-select checkboxes on training jobs list ("Compare Selected")
3. Display overlaid loss curves for selected jobs (different colors per job)
4. Display side-by-side metrics table:
   - Final training loss
   - Final validation loss
   - Perplexity (baseline → trained)
   - EI score improvement
   - Cost (estimate vs actual)
   - Duration (estimate vs actual)
   - Hyperparameters used
5. Highlight best performer for each metric (green highlight)
6. Add "Export Comparison Report" button (PDF with charts and tables)

**Deliverable**: Training comparison tool functional

**Success Criteria**: Can select 2-4 jobs, view overlaid charts, export report

---

#### Task 4.6: Configuration Templates (Days 8-9)
**Assigned to**: Backend Engineer + Frontend Engineer

**Subtasks**:
1. Add "Save as Template" button on completed job page
2. Create `configuration_templates` table (name, description, hyperparameters, GPU settings, notes)
3. Implement template creation API (POST /api/training/templates)
4. Add template selector on job creation form ("Start from Template" dropdown)
5. Pre-fill form with template configuration when selected
6. Allow template sharing across team members (public templates)
7. Track template usage (which templates are used most)

**Deliverable**: Configuration templates functional

**Success Criteria**: Can save templates, start new jobs from templates, track usage

---

#### Task 4.7: Email/Slack Notifications (Days 9-10)
**Assigned to**: Backend Engineer

**Subtasks**:
1. Integrate email service (SendGrid or Resend)
2. Create email templates (job completion, job failure, budget alerts)
3. Implement notification sending in webhook processing (on job completion/failure)
4. Add Slack webhook integration (optional, configure in environment variables)
5. Send Slack messages to team channel for training events
6. Add notification preferences UI (users can enable/disable email, Slack)
7. Add "Digest Mode" option (one daily summary of all job status changes)

**Deliverable**: Email and Slack notifications functional

**Success Criteria**: Notifications sent for job events, users can configure preferences

---

### Phase 4 Completion & Production Readiness (Week 6, Days 3-5)

**Goal**: Final testing, documentation, team training, production launch

#### Task 4.8: Final End-to-End Testing (Day 1)
**Assigned to**: Full Team

**Subtasks**:
1. Run 3 full training runs (Conservative, Balanced, Aggressive presets)
2. Test all features: create job, monitor, download artifacts, view validation report, compare runs
3. Test error scenarios: trigger OOM error, dataset format error, spot interruption
4. Test budget alerts: approach 80% and 95% thresholds, verify emails sent
5. Test cost tracking: verify actual costs within ±15% of estimates
6. Test validation: verify all benchmarks run automatically, reports generated
7. Document any bugs or issues

**Deliverable**: 3 successful training runs, all features validated

**Success Criteria**: All acceptance criteria met, no critical bugs

---

#### Task 4.9: Documentation Finalization (Day 2)
**Assigned to**: Product Manager + Technical Writer

**Subtasks**:
1. Complete all user guides (First Training Run, Hyperparameter Presets, Troubleshooting)
2. Complete all technical docs (API, Database Schema, Service Layer, RunPod Container)
3. Review documentation for accuracy and clarity
4. Add screenshots and screen recordings to tutorials
5. Publish documentation to team wiki or documentation site
6. Create video walkthrough: "Your First Training Run in 5 Minutes"

**Deliverable**: All documentation complete and published

**Success Criteria**: New users can complete first training run using only documentation

---

#### Task 4.10: Team Training (Day 3)
**Assigned to**: Product Manager + Technical Lead

**Subtasks**:
1. Schedule team training session (90 minutes, all AI engineers invited)
2. Present product overview (what, why, how)
3. Walk through first training run (live demonstration)
4. Show how to monitor progress, handle errors, download artifacts
5. Show how to view validation reports and use for client presentations
6. Q&A session (answer questions, clarify confusion)
7. Collect feedback (what's unclear, what's missing)
8. Share recorded training session for future reference

**Deliverable**: Team trained on system usage

**Success Criteria**: All team members confident in using system, no blocking questions

---

#### Task 4.11: Production Launch (Days 4-5)
**Assigned to**: DevOps Engineer + Technical Lead

**Subtasks**:
1. Deploy all code to production (Vercel deployment)
2. Run final database migrations on production Supabase
3. Configure production environment variables (RunPod API key, Hugging Face token, etc.)
4. Set up monitoring and alerting (Sentry for errors, Uptime Robot for availability)
5. Set up backup and disaster recovery (database backups, storage backups)
6. Announce launch to team (Slack message, demo video)
7. Monitor first 3 production training runs closely
8. Collect user feedback after first week

**Deliverable**: System deployed to production, monitoring active

**Success Criteria**: System stable, no critical issues, users successfully completing training runs

---

### Timeline Summary

| Phase | Duration | Key Deliverables | Success Criteria |
|-------|----------|------------------|------------------|
| **Preparation** | Week 0 | Budget approved, RunPod setup, Hugging Face access | Team ready to start |
| **Phase 1** | Weeks 1-3 | Database schema, TrainingService, API routes, RunPod container, basic UI | First training run completes end-to-end |
| **Phase 2** | Weeks 3-4 | Real-time monitoring, error handling, checkpoint recovery | Live loss curves, automatic recovery from spot interruptions |
| **Phase 3** | Weeks 4-6 | Validation suite, quality reporting, before/after comparisons | Validation reports prove 40%+ EI improvement |
| **Phase 4** | Weeks 5-6 | Cost refinement, budget management, training comparison, notifications | Cost estimates within ±15%, budget alerts functional |
| **Launch** | Week 6 | Final testing, documentation, team training, production deployment | System stable, team trained, first client training run |

**Total Timeline**: 6 weeks from kickoff to production launch

**Team Size**: 4-5 people (Backend Engineer, ML Engineer, Frontend Engineer, DevOps Engineer, Product Manager)

**Budget**: $400 initial + $50-150/month operational

**Expected ROI**: 4x revenue multiplier ($5k datasets → $15k-30k models) within first quarter after launch

---

### Resource Requirements

**Team**:
- **Backend Engineer** (70% allocation, Weeks 1-6): Database schema, TrainingService, API routes, cost tracking
- **ML Engineer** (60% allocation, Weeks 1-6): RunPod container, training orchestrator, validation benchmarks
- **Frontend Engineer** (50% allocation, Weeks 1-6): UI components, dashboards, visualization
- **DevOps Engineer** (30% allocation, Weeks 1-6): Infrastructure setup, deployment, monitoring
- **Product Manager** (20% allocation, Weeks 1-6): Documentation, user training, feedback collection

**Infrastructure**:
- **Supabase** (existing): Database + storage + auth (no additional cost)
- **RunPod**: $14/month persistent volume + $50-150/month training costs
- **Vercel** (existing): Next.js deployment (no additional cost)
- **SendGrid/Resend** (optional): Email notifications ($0-20/month depending on volume)
- **Slack** (existing): Notifications to team channel (no additional cost)

**Third-Party Services**:
- **Hugging Face**: Model access (free with token)
- **RunPod**: GPU provisioning (pay-per-use)
- **Sentry** (optional): Error tracking ($0-26/month depending on volume)
- **Uptime Robot** (optional): Availability monitoring ($0-7/month)

---

### Key Milestones & Decision Points

**Week 2 Review**: Phase 1 progress check
- **Decision**: Proceed to Phase 2 or allocate more time to Phase 1?
- **Criteria**: Database schema deployed, TrainingService functional, API routes working

**Week 4 Review**: Phase 2 completion + Phase 3 progress
- **Decision**: Quality of monitoring and error handling acceptable?
- **Criteria**: Real-time updates working, error messages actionable, checkpoint recovery tested

**Week 5 Review**: Phase 3 validation suite
- **Decision**: Validation benchmarks producing reliable results?
- **Criteria**: Perplexity, EI, forgetting, brand voice scores consistent and accurate

**Week 6 Go/No-Go**: Production launch decision
- **Decision**: Launch to full team or delay for additional testing?
- **Criteria**: All phases complete, acceptance criteria met, no critical bugs, team trained

---

### Success Criteria for Launch

**Technical Success**:
- ✅ 95%+ training success rate (including retry attempts)
- ✅ Cost estimates within ±15% of actual costs
- ✅ 12-hour average training time for Balanced preset
- ✅ 95%+ success rate despite spot interruptions
- ✅ All validation benchmarks operational

**User Success**:
- ✅ AI engineers can create training job in <10 minutes
- ✅ 80%+ of errors self-recoverable with suggested fixes
- ✅ Validation reports demonstrate 40%+ EI improvement
- ✅ Team trained and confident in system usage

**Business Success**:
- ✅ First client training run completed successfully
- ✅ Validation report used in sales presentation
- ✅ Cost tracking demonstrates profitability (training cost <5% of sale price)
- ✅ Roadmap for premium model sales ($15k-30k) established

---

**Document Status**: ✅ Product Overview Complete  
**Next Steps**: Begin Phase 1 implementation upon budget approval  
**Last Updated**: December 15, 2025  
**Document Owner**: Product Manager  
**Review Cycle**: Update after each phase completion

