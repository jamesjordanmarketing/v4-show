# LoRA Training Infrastructure Module - User Stories
**Version:** 1.0  
**Date:** 12-15-2025  
**Category:** AI Model Training Infrastructure  
**Product Abbreviation:** pipeline  
**Feature Abbreviation:** lora-train  
**Product Deliverable:** End-to-End LoRA Training, Validation & Delivery Infrastructure

**Source References:**
- Seed Narrative: `pmc/product/00-pipeline-seed-narrative.md`
- Seed Story: `pmc/product/00-pipeline-seed-story.md`
- Overview Document: `pmc/product/01-pipeline-overview.md`
- User Stories Template: `pmc/product/_templates/02-user-stories-template.md`
- Example: `pmc/product/_examples/02-train-user-stories.md`
- Current Codebase: `src/` (Training File Service complete, LoRA infrastructure needed)
- Training File Service: `src/lib/services/training-file-service.ts`

> Note: FR mappings will be automatically populated after functional requirements generation.

---

## User Stories by Category

### 1. Training Job Configuration & Setup

#### 1.1 One-Click Training Job Creation

- **US1.1.1: Create Training Job from Training File**
  - **Role**: AI Engineer
  - *As an AI engineer, I want to select an existing training file (242-conversation dataset) from a dropdown and create a training job with one click so that I don't spend 40 hours manually configuring GPU environments and Python scripts*
  - **Impact Weighting**: Operational Efficiency / Time-to-Value / Ease of Use
  - **Acceptance Criteria**:
    - Training files dropdown populated from `training_files` table showing file name, conversation count, total training pairs
    - Click training file displays metadata: quality scores, scaffolding distribution, human review count
    - "Create Training Job" button opens configuration modal
    - Job creation form pre-populates with training file details
    - Form validation ensures training file has minimum 50 conversations
    - Success: Job created in database with status "pending_configuration"
    - Redirect to job configuration page with job ID
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US1.1.2: Select Hyperparameter Preset**
  - **Role**: AI Engineer
  - *As an engineer who isn't a LoRA expert, I want to choose from proven hyperparameter presets (Conservative/Balanced/Aggressive) with detailed explanations so that I don't waste training runs experimenting with bad configurations*
  - **Impact Weighting**: Ease of Use / Success Rate / Risk Mitigation
  - **Acceptance Criteria**:
    - Three preset options displayed as radio cards with icons
    - **Conservative Preset**: r=8, lr=1e-4, epochs=2, batch_size=4, gradient_accumulation_steps=1
      - Description: "Best for high-quality seed datasets and first training runs"
      - Estimated duration: 8-10 hours
      - Estimated cost: $25-30 (spot) / $80-120 (on-demand)
      - Risk level: Low
      - Success rate: 98% based on historical data
    - **Balanced Preset**: r=16, lr=2e-4, epochs=3, batch_size=2, gradient_accumulation_steps=2
      - Description: "Production-ready configuration for most use cases"
      - Estimated duration: 12-15 hours
      - Estimated cost: $50-60 (spot) / $120-140 (on-demand)
      - Risk level: Medium
      - Success rate: 96% based on historical data
    - **Aggressive Preset**: r=32, lr=3e-4, epochs=4, batch_size=1, gradient_accumulation_steps=4
      - Description: "Maximum quality for complex datasets, experimentation, when quality is paramount"
      - Estimated duration: 18-20 hours
      - Estimated cost: $80-100 (spot) / $200-240 (on-demand)
      - Risk level: Higher
      - Success rate: 92% based on historical data
    - Default selection: Balanced preset
    - Tooltip explaining each hyperparameter in simple terms
    - Link to "Understanding LoRA Hyperparameters" documentation
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US1.1.3: Select GPU Type with Cost Comparison**
  - **Role**: AI Engineer
  - *As an engineer configuring training, I want to choose between spot instances (50-80% cheaper, may interrupt) and on-demand instances (guaranteed completion, higher cost) so that I can optimize the cost vs reliability tradeoff*
  - **Impact Weighting**: Cost Efficiency / Operational Efficiency / Risk Management
  - **Acceptance Criteria**:
    - GPU selection toggle: Spot vs On-Demand
    - **Spot Instance Option**:
      - Price: $2.49/hr (H100 PCIe 80GB)
      - Savings: 70% cheaper than on-demand
      - Risk: 10-30% chance of interruption
      - Recovery: Automatic checkpoint recovery, <10 min resume time
      - Recommendation: "Best for non-urgent training, cost optimization"
    - **On-Demand Option**:
      - Price: $7.99/hr (H100 PCIe 80GB)
      - Guarantee: No interruptions, predictable completion time
      - Recommendation: "Best for client deadlines, critical deliveries"
    - Real-time cost estimate updates when switching between spot/on-demand
    - Display historical interruption rate for spot instances (e.g., "18% interruption rate last 30 days")
    - Success metric: "95%+ jobs complete successfully with spot instances"
    - Confirmation prompt if selecting on-demand for jobs estimated >$150
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

#### 1.2 Cost Estimation & Budget Planning

- **US1.2.1: Real-Time Cost Estimation**
  - **Role**: AI Engineer, Budget Manager
  - *As an engineer configuring a training job, I want to see estimated duration and cost update in real-time as I adjust hyperparameters so that I understand the cost impact of my configuration choices before starting*
  - **Impact Weighting**: Cost Transparency / Budget Control / User Confidence
  - **Acceptance Criteria**:
    - Cost estimation panel always visible on configuration screen
    - Displays: Estimated duration (hours), Estimated cost range (min-max)
    - Updates dynamically when changing: preset, GPU type, epochs, batch size
    - Calculation formula: (dataset_size × epochs × avg_time_per_epoch) × gpu_hourly_rate
    - Display accuracy disclaimer: "±15% based on historical data"
    - Show cost breakdown: GPU cost ($X), estimated spot interruptions (+$Y), total estimate ($Z)
    - Warning indicator if estimated cost exceeds $100
    - Warning if estimated duration exceeds 24 hours
    - Historical accuracy metric: "Past estimates within ±12% for balanced preset"
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US1.2.2: Pre-Job Budget Validation**
  - **Role**: Budget Manager, AI Engineer
  - *As a budget manager, I want the system to check if estimated job cost fits within remaining monthly budget before allowing job start so that I prevent budget overages*
  - **Impact Weighting**: Budget Control / Financial Planning / Risk Mitigation
  - **Acceptance Criteria**:
    - Calculate remaining monthly budget: (monthly_limit - month_to_date_spend)
    - Block job creation if estimated cost exceeds remaining budget
    - Error message: "Estimated cost ($75) exceeds remaining monthly budget ($50). Adjust configuration or increase budget limit."
    - Option to increase monthly budget limit directly from error dialog (requires manager approval)
    - Warning at 80% budget utilization: "You're at 80% of monthly budget ($400 of $500)"
    - Show forecast: "With X active jobs + this new job, projected monthly spend: $Y"
    - Allow budget override for managers with confirmation: "Proceed anyway (requires justification)"
    - Log all budget override actions for audit trail
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

#### 1.3 Job Configuration Finalization

- **US1.3.1: Add Job Metadata & Documentation**
  - **Role**: AI Engineer
  - *As an engineer creating a training job, I want to add a descriptive job name, notes about the experiment, and tags so that I can document my reasoning and find jobs easily later*
  - **Impact Weighting**: Organization / Knowledge Sharing / Searchability
  - **Acceptance Criteria**:
    - Job name field (required, 3-100 characters): Auto-populated as "[Training File Name] - [Preset] - [Date]"
    - Description field (optional, 500 character limit): "Document the purpose of this training run"
    - Notes field (optional, 2000 character limit): "Experimental notes, hypothesis, configuration rationale"
    - Tags field: Multi-select dropdown with common tags (experiment, production, client-delivery, test, poc)
    - Custom tag creation allowed
    - Client/Project assignment dropdown (optional): Link job to specific client project for cost tracking
    - All metadata searchable in job history
    - Metadata visible in job details page and comparison views
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US1.3.2: Review Configuration Before Start**
  - **Role**: AI Engineer
  - *As an engineer about to start an expensive training job, I want to review a complete configuration summary with costs and warnings before final confirmation so that I can catch mistakes before wasting budget*
  - **Impact Weighting**: Risk Mitigation / Cost Control / User Confidence
  - **Acceptance Criteria**:
    - "Review & Start Training" button opens full-screen confirmation modal
    - Display complete configuration summary:
      - Training file: name, conversation count, quality scores
      - Hyperparameters: preset name + all values (r, lr, epochs, batch_size, gradient_accumulation_steps)
      - GPU selection: spot/on-demand, GPU type, hourly rate
      - Cost estimate: duration range, cost range, spot interruption risk
      - Budget impact: current monthly spend, this job cost, projected total
    - Warnings section: Display any configuration warnings (high cost, aggressive parameters, low budget)
    - Confirmation checklist:
      - [ ] I have reviewed the configuration
      - [ ] I understand the estimated cost ($X-Y)
      - [ ] I have budget approval if required
    - "Start Training" button disabled until checklist completed
    - "Edit Configuration" button to go back and adjust
    - "Cancel" button to abort job creation
    - After confirmation: Job status changes to "queued", GPU provisioning begins
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

### 2. Training Job Execution & Monitoring

#### 2.1 Real-Time Progress Tracking

- **US2.1.1: Live Training Progress Dashboard**
  - **Role**: AI Engineer
  - *As an engineer with active training jobs, I want to see a live dashboard showing progress percentage, current stage, loss curves, and estimated time remaining so that I know training is progressing correctly and not stuck wasting money*
  - **Impact Weighting**: User Confidence / Transparency / Productivity
  - **Acceptance Criteria**:
    - Training jobs list page shows all jobs (active, completed, failed, queued)
    - Click active job opens detailed progress dashboard
    - **Progress Header Card**:
      - Overall progress: 42% complete (Step 850 of 2000)
      - Current stage: Training (with visual stage indicator)
      - Elapsed time: 6h 23m
      - Estimated remaining: 8h 15m (updates based on actual speed)
      - Current epoch: 2 of 3
    - **Live Loss Curve Graph**:
      - Line chart with dual y-axes: training loss (left), validation loss (right)
      - X-axis: training step number
      - Updates every 60 seconds via polling or websocket
      - Zoom controls to focus on recent steps
      - Export graph as PNG for reports
    - **Current Metrics Table**:
      - Training loss: 0.342 (↓ from 0.389)
      - Validation loss: 0.358 (↓ from 0.412)
      - Learning rate: 0.000182 (current schedule value)
      - GPU utilization: 87%
      - Perplexity (if available): 1.43
    - **Cost Tracker Card**:
      - Estimated cost: $45-55
      - Current spend: $22.18 (49% of estimate)
      - Hourly rate: $2.49/hr (spot)
      - Projected final cost: $47.32
    - Auto-refresh every 60 seconds (with manual refresh button)
    - Loading skeletons during data fetch
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US2.1.2: Training Stage Indicators**
  - **Role**: AI Engineer
  - *As an engineer monitoring training, I want clear visual indicators showing which stage the job is in (Preprocessing → Model Loading → Training → Finalization) and how long each stage takes so that I understand what's happening and when to expect completion*
  - **Impact Weighting**: User Experience / Transparency / Reduced Anxiety
  - **Acceptance Criteria**:
    - Visual stage progress bar with 4 stages:
      1. **Preprocessing** (2-5 minutes):
         - Dataset loading from Supabase Storage
         - Tokenization and formatting
         - Train/validation split (80/20)
         - Status: "Tokenizing 242 conversations..."
      2. **Model Loading** (10-15 minutes):
         - Download Llama 3 70B from Hugging Face Hub (or load from cache)
         - Apply 4-bit quantization (QLoRA)
         - Initialize LoRA adapters with target modules
         - Status: "Loading Llama 3 70B model (4-bit quantization)..."
      3. **Training** (10-20 hours):
         - Gradient updates across epochs
         - Checkpoint saves every 100 steps
         - Validation runs after each epoch
         - Status: "Training epoch 2/3 - Step 850/2000..."
      4. **Finalization** (5-10 minutes):
         - Save final LoRA adapters (adapter_model.bin, adapter_config.json)
         - Upload artifacts to Supabase Storage
         - Calculate final metrics
         - Status: "Saving adapters and finalizing..."
    - Each stage shows: name, status (pending/active/complete), estimated duration, actual duration
    - Progress bar fills proportionally (preprocessing 2%, model loading 8%, training 85%, finalization 5%)
    - Current stage highlighted with animated indicator
    - Completed stages show checkmark and actual duration
    - Failed stage shows error icon and error message
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US2.1.3: Webhook Event Log**
  - **Role**: AI Engineer, DevOps
  - *As an engineer troubleshooting training issues, I want to see a chronological log of all webhook events (status changes, metric updates, errors, warnings) with timestamps so that I can diagnose problems and understand what happened during training*
  - **Impact Weighting**: Debugging / Troubleshooting / Support Reduction
  - **Acceptance Criteria**:
    - "Event Log" tab on job details page
    - Table view with columns: Timestamp, Event Type, Message, Payload (expandable)
    - Event types color-coded:
      - Status changes (blue): queued → preprocessing → training → completed
      - Metrics updates (green): loss updated, epoch completed, checkpoint saved
      - Warnings (yellow): GPU utilization low, loss plateau detected
      - Errors (red): OOM error, API timeout, validation failure
    - Expandable rows show full webhook payload as formatted JSON
    - Filter events by type: All / Status / Metrics / Warnings / Errors
    - Search by keyword in messages
    - Export log as JSON or CSV for detailed analysis
    - Real-time updates: new events appear automatically
    - Pagination: 50 events per page
    - Example events:
      - "2025-12-15 14:23:42 | Status | Training started (GPU: H100 PCIe 80GB spot)"
      - "2025-12-15 14:28:15 | Metrics | Step 100: loss=0.521, lr=0.0002, gpu_util=89%"
      - "2025-12-15 14:33:08 | Warning | GPU utilization dropped to 45% (possible throttling)"
      - "2025-12-15 15:12:33 | Error | Spot instance interrupted, initiating checkpoint recovery"
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 2.2 Job Control & Management

- **US2.2.1: Cancel Active Training Job**
  - **Role**: AI Engineer, Budget Manager
  - *As an engineer monitoring a training job, I want to cancel an active job if I notice problems (loss not decreasing, GPU utilization low, cost exceeding budget) so that I can stop wasting money on failed runs*
  - **Impact Weighting**: Cost Control / Risk Mitigation / User Control
  - **Acceptance Criteria**:
    - "Cancel Job" button prominent on job dashboard (red, destructive styling)
    - Click opens confirmation modal:
      - Warning: "This will permanently stop training and terminate the GPU instance"
      - Display: Current progress (42% complete), elapsed time (6h 23m), cost spent ($22.18)
      - Question: "Reason for cancellation?" (dropdown: Loss not decreasing, Too expensive, Wrong configuration, Testing, Other)
      - Optional notes field for explanation
      - Confirmation checkbox: "I understand this action cannot be undone"
    - After confirmation:
      - Job status updates to "cancelled"
      - Send cancellation request to RunPod API
      - Terminate GPU instance within 60 seconds
      - Final cost calculation based on elapsed time
      - Notification: "Job cancelled. Final cost: $22.18. GPU instance terminated."
    - Cancelled jobs appear in job history with "cancelled" status badge
    - Can view partial progress (loss curves, metrics) even after cancellation
    - Cannot resume cancelled jobs (must create new job)
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US2.2.2: Pause and Resume Training (Future Enhancement)**
  - **Role**: AI Engineer
  - *As an engineer managing training jobs, I want to pause an active job (save checkpoint, terminate GPU) and resume later so that I can optimize GPU usage during peak pricing periods*
  - **Impact Weighting**: Cost Optimization / Flexibility
  - **Acceptance Criteria**:
    - "Pause Job" button next to "Cancel Job"
    - Pause action:
      - Save checkpoint immediately
      - Upload checkpoint to Supabase Storage
      - Terminate GPU instance
      - Update job status to "paused"
      - Record pause timestamp
    - "Resume Job" button on paused jobs:
      - Provision new GPU instance (spot or on-demand)
      - Download latest checkpoint
      - Continue training from last saved step
      - Update status to "training"
    - Track total paused duration separately from training duration
    - Cost calculation includes only active training time
    - Use case: Pause during expensive peak hours, resume during cheaper off-peak hours
  - **Priority**: Low (Future Enhancement)
  - **FR Mapping**: [To be populated during FR generation]

#### 2.3 Multi-Job Management

- **US2.3.1: View All Training Jobs**
  - **Role**: AI Engineer, Technical Lead
  - *As a technical lead, I want to see a list of all training jobs (active, completed, failed, queued) with filters and sorting so that I can monitor team activity and identify patterns*
  - **Impact Weighting**: Team Coordination / Oversight / Organization
  - **Acceptance Criteria**:
    - Training jobs list page at `/dashboard/training-jobs`
    - Table columns: Job Name, Status, Configuration, Created By, Started At, Duration, Cost, Actions
    - Status badges color-coded: Queued (gray), Training (blue), Completed (green), Failed (red), Cancelled (orange)
    - Filters:
      - Status: All / Active / Completed / Failed / Cancelled / Queued
      - Created by: All / [User dropdown]
      - Date range: Last 7 days / Last 30 days / Last 90 days / Custom range
      - Configuration preset: All / Conservative / Balanced / Aggressive
      - Cost range: All / <$50 / $50-100 / >$100
      - GPU type: All / Spot / On-Demand
    - Sort by: Created date (newest first), Duration, Cost, Status, Creator
    - Search by: Job name, notes, tags
    - Pagination: 25 / 50 / 100 jobs per page
    - Click row opens job details page
    - Bulk actions: Select multiple jobs, Cancel selected (if active), Delete selected (if completed/failed)
    - Export table as CSV for reporting
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US2.3.2: Training Queue Management**
  - **Role**: AI Engineer, Operations
  - *As an operations manager, I want to see queued training jobs and their estimated start times so that I can manage resource allocation and set client expectations*
  - **Impact Weighting**: Resource Planning / Client Communication / Operational Efficiency
  - **Acceptance Criteria**:
    - "Queue" tab on training jobs page
    - Shows jobs with status "queued" or "pending_gpu_provisioning"
    - Displays: Queue position, Job name, Configuration, Estimated start time, Creator
    - Estimated start time calculation: SUM(remaining_time_of_active_jobs) + GPU_provisioning_time
    - Real-time updates as active jobs complete
    - Queue priority logic: FIFO (first in, first out) by default
    - Option to promote urgent jobs to front of queue (requires manager approval)
    - Max concurrent training jobs limit: 3 (configurable based on budget)
    - If queue limit reached, block new job creation with message: "Queue full (3/3 active jobs). Wait for completion or cancel an active job."
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

### 3. Error Handling & Recovery

#### 3.1 Actionable Error Messages

- **US3.1.1: Out of Memory Error Handling**
  - **Role**: AI Engineer
  - *As an engineer facing an OOM error, I want clear explanation of the problem and specific recommendations (reduce batch_size, switch to conservative preset) so that I can retry successfully without guessing*
  - **Impact Weighting**: Success Rate / User Experience / Learning
  - **Acceptance Criteria**:
    - Detect "OutOfMemoryError" or "CUDA out of memory" in training logs
    - Job status updates to "failed" with error type "OOM"
    - Error modal displays:
      - **Problem**: "Your configuration exceeded the 80GB VRAM capacity of the H100 GPU"
      - **Likely cause**: "batch_size=4 with 242 conversations and r=32 requires ~92GB VRAM"
      - **Suggested fixes**:
        1. Reduce batch_size to 2 (recommended)
        2. Switch to Conservative preset (r=8 instead of r=32)
        3. Reduce sequence length (if conversations are very long)
      - **Quick retry**: Button "Retry with batch_size=2" pre-fills configuration with suggested fix
    - Link to documentation: "Understanding VRAM Usage in LoRA Training"
    - Track OOM error frequency per configuration to improve preset recommendations
    - Example error message: "OutOfMemoryError: Your dataset + batch_size=4 + r=32 exceeds 80GB VRAM. Try batch_size=2 (Conservative preset) or contact support if issue persists."
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US3.1.2: Dataset Format Error Handling**
  - **Role**: AI Engineer
  - *As an engineer with a failed job due to dataset formatting, I want to see exactly which conversation or training pair is malformed and what field is missing so that I can fix the data quickly*
  - **Impact Weighting**: Debugging / Data Quality / Time Savings
  - **Acceptance Criteria**:
    - Detect dataset validation errors during preprocessing stage
    - Job status updates to "failed" with error type "Dataset Format Error"
    - Error modal displays:
      - **Problem**: "Training data validation failed during preprocessing"
      - **Specific error**: "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"
      - **Conversation details**: Show conversation metadata (persona, emotional_arc, topic)
      - **Data sample**: Display the malformed conversation JSON with error highlighted
      - **How to fix**:
        1. Go to conversation editor
        2. Fix missing field
        3. Regenerate training file
        4. Retry training job
      - **Quick action**: "Open Conversation Editor" button (deep link to conversation ID)
    - Validate training file schema before job creation to catch errors early
    - Prevent job creation if validation fails with clear error message
    - Example error: "DatasetFormatError: Training pair #47 missing 'target_response' field. Fix in conversation editor and regenerate training file."
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US3.1.3: GPU Provisioning Error Handling**
  - **Role**: AI Engineer, Operations
  - *As an engineer starting a training job, I want clear guidance if no GPUs are available (high demand, spot unavailable) and options to retry automatically or switch to on-demand*
  - **Impact Weighting**: User Experience / Flexibility / Reliability
  - **Acceptance Criteria**:
    - Detect GPU provisioning failures from RunPod API
    - Common scenarios:
      - **No spot GPUs available**: "All H100 spot instances are currently in use. High demand."
      - **Spot provisioning timeout**: "Waited 10 minutes, no spot GPU allocated."
      - **Region unavailable**: "RunPod datacenter temporarily unavailable."
    - Error modal displays:
      - **Problem**: "No H100 spot GPUs currently available"
      - **Reason**: "High demand in RunPod datacenter (92% utilization)"
      - **Options**:
        1. **Auto-retry** (spot): "Automatically retry every 5 minutes until GPU available (max 1 hour)"
        2. **Switch to on-demand**: "Start immediately on-demand GPU (+$5/hr, guaranteed availability)"
        3. **Cancel and retry later**: "Cancel job, try again in 30-60 minutes during off-peak hours"
      - **Estimated wait time**: "Historical data shows spot GPUs typically available within 15-30 minutes"
    - If auto-retry selected:
      - Job status: "queued_waiting_for_gpu"
      - Retry every 5 minutes for 1 hour
      - Notification when GPU provisioned and training starts
      - Notification if 1 hour timeout reached: "Still no spot GPU available. Switch to on-demand or cancel?"
    - Track provisioning failure rate to identify patterns (time of day, datacenter congestion)
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

#### 3.2 Automatic Checkpoint Recovery

- **US3.2.1: Spot Instance Interruption Recovery**
  - **Role**: AI Engineer, Operations
  - *As an engineer using spot instances (50-80% cheaper), I want automatic checkpoint recovery when spot instances are interrupted so that I don't lose all progress and training resumes within 10 minutes*
  - **Impact Weighting**: Cost Efficiency / Reliability / User Confidence
  - **Acceptance Criteria**:
    - **During training**: Checkpoint saved every 100 steps to Supabase Storage bucket `training-checkpoints`
    - Checkpoint includes: model weights (LoRA adapters), optimizer state, training step, epoch, random seed
    - Checkpoint naming: `{job_id}/checkpoint-step-{step_number}.pt`
    - **On spot interruption**:
      - RunPod sends webhook: "Spot instance interrupted"
      - Job status updates to "interrupted"
      - System initiates recovery immediately
    - **Automatic recovery process**:
      1. Provision new spot instance (same configuration)
      2. Download latest checkpoint from storage
      3. Resume training from last saved step
      4. Update status to "training" (resumed)
      5. Track interruption count
    - **Dashboard display**:
      - Interruption badge: "Interrupted 2× (auto-recovered)"
      - Interruption log: "Interrupted at step 850 (6h 23m), resumed at step 850 (6h 32m) - 9 min downtime"
      - Total interruption downtime tracked separately
    - **Success criteria**:
      - Resume within 10 minutes of interruption
      - 95%+ successful recovery rate
      - Cost tracking includes interruption overhead
    - Notification: "Training interrupted at 42% complete. Auto-recovery in progress... [Track Status]"
    - Notification: "Training resumed from checkpoint (Step 850). Estimated completion: 8h 15m remaining."
    - If recovery fails 3 times: Offer option to switch to on-demand instance
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US3.2.2: Manual Checkpoint Resume**
  - **Role**: AI Engineer
  - *As an engineer with a failed job that has saved checkpoints, I want to manually resume training from the latest checkpoint with adjusted configuration so that I don't waste the partial progress*
  - **Impact Weighting**: Cost Efficiency / Flexibility / User Control
  - **Acceptance Criteria**:
    - Failed jobs with available checkpoints show "Resume from Checkpoint" button
    - Click opens configuration modal pre-filled with previous settings
    - Allow adjustments:
      - Switch GPU type (spot → on-demand)
      - Adjust remaining epochs
      - Change learning rate schedule
      - Modify batch size (if OOM was the issue)
    - Display: "Resume from Step 850 (42% complete). Remaining: 1.5 epochs (~8 hours)"
    - Cost estimate updates based on remaining work
    - Confirmation: "Resume training from last checkpoint with adjusted configuration?"
    - After confirmation:
      - Create new job linked to original job
      - Download checkpoint from storage
      - Continue training from saved step
      - Track as "resumed from job_abc123"
    - Useful scenarios: OOM error → reduce batch_size → resume; Spot interruption loop → switch to on-demand → resume
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 3.3 Retry Failed Jobs

- **US3.3.1: One-Click Retry with Same Configuration**
  - **Role**: AI Engineer
  - *As an engineer with a failed training job due to transient error (network timeout, GPU provisioning delay), I want to retry with one click using the exact same configuration so that I don't waste time reconfiguring*
  - **Impact Weighting**: Productivity / User Experience / Time Savings
  - **Acceptance Criteria**:
    - Failed jobs show "Retry Job" button
    - Click creates new job with identical configuration:
      - Same training file
      - Same hyperparameter preset
      - Same GPU selection (spot/on-demand)
      - Same job name with suffix " (Retry #2)"
    - Confirmation modal displays:
      - **Original job**: Name, failure reason, elapsed time before failure
      - **Retry configuration**: Complete configuration summary
      - **Cost estimate**: Fresh estimate for new attempt
      - Option to edit configuration before retrying
    - After confirmation:
      - Create new job in "queued" status
      - Link to original job for reference
      - Start training automatically
    - Useful for transient errors: Network timeouts, GPU provisioning delays, spot interruptions without checkpoints
    - Track retry count per job: "This is retry #2 of job_abc123"
    - Success rate metric: "85% of retried jobs complete successfully"
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US3.3.2: Retry with Suggested Adjustments**
  - **Role**: AI Engineer
  - *As an engineer with a failed job due to configuration issue (OOM, timeout), I want to retry with system-suggested fixes automatically applied so that I don't repeat the same failure*
  - **Impact Weighting**: Success Rate / Learning / User Guidance
  - **Acceptance Criteria**:
    - For specific error types, offer "Retry with Suggested Fix" button
    - **OOM Error Suggestions**:
      - Reduce batch_size: 4 → 2
      - Switch to Conservative preset
      - Highlight changes: "batch_size: 4 ~~→~~ **2**"
    - **Timeout Error Suggestions**:
      - Reduce epochs: 4 → 3
      - Switch to Balanced preset
      - Increase checkpoint frequency
    - **Spot Interruption Loop Suggestions** (if interrupted >3 times):
      - Switch to on-demand instance
      - Accept higher cost for reliability
    - Confirmation modal shows diff of configuration changes
    - User can accept suggested fixes or manually edit
    - After retry with suggestions:
      - Track success rate of suggested fixes
      - Learn from patterns to improve future suggestions
    - Example: "Your previous job failed with OOM error. Retry with batch_size=2 (suggested) for 95% success rate?"
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

### 4. Model Artifacts & Downloads

#### 4.1 LoRA Adapter Downloads

- **US4.1.1: Download Trained LoRA Adapters**
  - **Role**: AI Engineer, Client Integration Team
  - *As an engineer with a completed training job, I want to download LoRA adapters (adapter_model.bin, adapter_config.json) in one click so that I can integrate them into inference pipelines immediately*
  - **Impact Weighting**: Productivity / Time-to-Value / Ease of Use
  - **Acceptance Criteria**:
    - Completed jobs show "Download Adapters" button (prominent, green)
    - Click initiates ZIP file download: `{job_name}-adapters-{job_id}.zip`
    - ZIP contains:
      - `adapter_model.bin` (200-500MB): Trained LoRA weight matrices
      - `adapter_config.json`: Configuration file (rank, alpha, target_modules, etc.)
      - `README.txt`: Quick integration instructions
      - `training_summary.json`: Final metrics (loss, perplexity, duration, cost)
    - Download progress indicator for large files
    - Generate signed URL valid for 24 hours (security)
    - After 24 hours: Regenerate download link
    - Track download count and timestamp for audit trail
    - Notification after download: "Adapters downloaded. See README.txt for integration instructions."
    - Example README content:
      ```
      Bright Run LoRA Adapters - Training Job: {job_name}
      
      Files:
      - adapter_model.bin: Trained weight matrices
      - adapter_config.json: LoRA configuration
      
      Integration:
      1. Install dependencies: pip install transformers peft torch
      2. Load base model: Llama 3 70B
      3. Load adapters: model = PeftModel.from_pretrained(base_model, adapter_path)
      4. Run inference: See example_inference.py
      
      Support: docs.brightrun.ai/lora-adapters
      ```
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US4.1.2: Adapter Storage and Versioning**
  - **Role**: AI Engineer, Technical Lead
  - *As a technical lead, I want all trained adapters automatically stored in Supabase Storage with versioning so that I can compare different training runs and revert to previous versions if needed*
  - **Impact Weighting**: Data Management / Version Control / Recovery
  - **Acceptance Criteria**:
    - All adapter files stored in Supabase Storage bucket: `model-artifacts`
    - Folder structure: `{job_id}/adapters/`
    - Files: `adapter_model.bin`, `adapter_config.json`, `training_summary.json`
    - Storage retention: Permanent by default (configurable)
    - Versioning: Each training job creates unique version
    - Job details page shows:
      - Storage path
      - File sizes
      - Upload timestamp
      - Download count
    - Option to delete adapters (free up storage): Requires confirmation, creates audit log entry
    - Storage usage dashboard:
      - Total storage used: 15.3 GB
      - Number of stored models: 23
      - Average model size: 665 MB
      - Storage cost estimate (if applicable)
    - Bulk operations: Delete multiple old adapters to free storage
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 4.2 Training Metrics Export

- **US4.2.1: Export Training Metrics as CSV/JSON**
  - **Role**: AI Engineer, Quality Analyst
  - *As an engineer evaluating model quality, I want to export all training metrics (loss curves, learning rates, perplexity, step times) as CSV or JSON so that I can analyze performance in detail and create client reports*
  - **Impact Weighting**: Reporting / Analysis / Quality Assurance
  - **Acceptance Criteria**:
    - "Export Metrics" button on job details page
    - Format options: CSV (spreadsheet analysis) / JSON (programmatic access)
    - **CSV Export** includes columns:
      - step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds
    - **JSON Export** includes nested structure:
      ```json
      {
        "job_metadata": { "job_id": "...", "name": "...", "configuration": {...} },
        "training_metrics": [
          { "step": 100, "epoch": 1, "training_loss": 0.521, "validation_loss": 0.538, ... },
          { "step": 200, "epoch": 1, "training_loss": 0.489, "validation_loss": 0.502, ... }
        ],
        "final_metrics": { "final_training_loss": 0.287, "final_validation_loss": 0.312, "perplexity_improvement": "31%" }
      }
      ```
    - Export includes all historical data from training start to completion
    - File naming: `{job_name}-metrics-{timestamp}.{csv|json}`
    - One-click download, no generation delay
    - Option to include charts (loss curves) as embedded PNG in export package
    - Track export count for audit trail
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US4.2.2: Generate Training Report PDF**
  - **Role**: Quality Analyst, Business Owner
  - *As a quality analyst preparing client deliverables, I want to generate a professional PDF report with training summary, loss curves, metrics table, and cost breakdown so that I can present results to clients*
  - **Impact Weighting**: Client Communication / Professionalism / Sales Enablement
  - **Acceptance Criteria**:
    - "Generate Report" button on completed job details page
    - PDF report includes:
      - **Cover Page**: Job name, training date, Bright Run branding
      - **Executive Summary** (1 page):
        - Training file: 242 conversations, quality scores
        - Configuration: Balanced preset, H100 spot instance
        - Duration: 13.2 hours
        - Final training loss: 0.287 (baseline: 1.423) - **80% improvement**
        - Cost: $48.32
        - Status: Completed successfully
      - **Training Metrics** (2 pages):
        - Loss curves graph (training + validation)
        - Learning rate schedule graph
        - Metrics table: Final loss, perplexity, GPU utilization
        - Convergence analysis: "Loss plateaued at epoch 2.5, indicating optimal training completion"
      - **Cost Breakdown** (1 page):
        - GPU cost: $33.12 (spot H100, 13.2 hours @ $2.49/hr)
        - Spot interruptions: 2 (recovery overhead: $1.20)
        - Storage costs: $0.15
        - Total cost: $48.32
        - Cost efficiency: "68% cheaper than on-demand ($146 estimate)"
      - **Appendix**:
        - Full configuration details
        - Checkpoint history
        - Event log summary
    - Report generation takes 5-10 seconds
    - Preview report before download
    - File naming: `{job_name}-training-report-{timestamp}.pdf`
    - Shareable via secure link (30-day expiration)
  - **Priority**: Low
  - **FR Mapping**: [To be populated during FR generation]

#### 4.3 Deployment Package Generation

- **US4.3.1: Create Complete Deployment Package**
  - **Role**: Client Integration Engineer, AI Engineer
  - *As a client engineer deploying a trained model, I want a deployment package (adapters + inference script + README + requirements.txt + example prompts) so that I can integrate the model without reverse-engineering setup requirements*
  - **Impact Weighting**: Client Success / Integration Speed / Support Reduction
  - **Acceptance Criteria**:
    - "Download Deployment Package" button on completed jobs
    - ZIP file: `{job_name}-deployment-package-{job_id}.zip`
    - **Package contents**:
      1. `adapters/` folder:
         - adapter_model.bin
         - adapter_config.json
      2. `inference.py`:
         - Runnable Python script loading base model + adapters
         - Accepts prompt as CLI argument
         - Outputs model response
         - Configurable temperature, max_tokens
      3. `requirements.txt`:
         - Exact Python dependencies with versions
         - transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0
      4. `README.md`:
         - Setup instructions (create venv, install deps)
         - Usage examples (run inference.py)
         - Deployment options (local, cloud, API endpoint)
         - Troubleshooting common issues
         - Support contact info
      5. `example_prompts.json`:
         - 10 sample prompts matching training domain (financial advisory)
         - Expected response quality examples
      6. `training_summary.json`:
         - Job metadata, configuration, final metrics
    - Inference script works with: `pip install -r requirements.txt && python inference.py "What are the benefits of a Roth IRA?"`
    - README includes GPU requirements, VRAM usage, inference speed estimates
    - Package size: ~500-700MB
    - Generate signed URL, valid 48 hours
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US4.3.2: API Inference Endpoint Template**
  - **Role**: Client Integration Engineer
  - *As a client engineer integrating the trained model into our application, I want a REST API template (FastAPI/Flask) that serves the model so that I can deploy it as a microservice without writing API code*
  - **Impact Weighting**: Client Success / Integration Speed / Developer Experience
  - **Acceptance Criteria**:
    - Deployment package includes `api_server/` folder:
      - `app.py`: FastAPI application serving inference endpoint
      - `Dockerfile`: Container image for deployment
      - `docker-compose.yml`: Local testing setup
      - `deploy_guide.md`: Deployment instructions (Docker, Kubernetes, cloud platforms)
    - API endpoints:
      - `POST /api/v1/chat`: Send prompt, receive model response
      - `GET /api/v1/health`: Health check endpoint
      - `GET /api/v1/model-info`: Model metadata (training job, version, metrics)
    - API features:
      - Request validation (max prompt length, rate limiting)
      - Response streaming (SSE)
      - Authentication (API key)
      - Logging (request/response tracking)
    - Docker image size: <5GB
    - Startup time: <60 seconds (model loading)
    - Inference latency: <2 seconds per response
    - Deployment guide covers:
      - Local testing: `docker-compose up`
      - Cloud deployment: AWS ECS, GCP Cloud Run, Azure Container Instances
      - GPU support: Specify GPU requirements, optimize for A10G/A100/H100
    - Example API request:
      ```bash
      curl -X POST http://localhost:8000/api/v1/chat \
        -H "Authorization: Bearer <api_key>" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Explain asset allocation", "max_tokens": 500}'
      ```
  - **Priority**: Low (Future Enhancement)
  - **FR Mapping**: [To be populated during FR generation]

### 5. Training Comparison & Optimization

#### 5.1 Side-by-Side Training Run Comparison

- **US5.1.1: Compare Multiple Training Runs**
  - **Role**: AI Engineer, Technical Lead
  - *As an engineer testing hyperparameter variations, I want to select 2-4 training runs and view side-by-side comparison (loss curves, final metrics, costs) so that I can identify the best configuration for production*
  - **Impact Weighting**: Optimization / Data-Driven Decisions / Quality Improvement
  - **Acceptance Criteria**:
    - "Compare Jobs" button on training jobs list page
    - Multi-select mode: Checkboxes appear on each job row
    - Select 2-4 jobs → "Compare Selected" button enabled
    - Comparison view opens in new page or modal
    - **Overlaid Loss Curves Graph**:
      - All selected jobs' loss curves on same chart
      - Color-coded by job (blue, green, red, orange)
      - Legend showing job names
      - Toggle training/validation loss visibility
      - Zoom and pan controls
      - Highlight final loss values
    - **Metrics Comparison Table**:
      - Rows: Job 1, Job 2, Job 3, Job 4
      - Columns: Final Training Loss, Final Validation Loss, Perplexity, Duration, Cost, GPU Type, Preset
      - Highlight best value in each column (green background)
      - Percentage differences: "Job 2: 15% lower loss than Job 1"
    - **Configuration Comparison**:
      - Side-by-side hyperparameters
      - Highlight differences: "Job 1: r=16, Job 2: r=32"
      - Training file, GPU type, spot/on-demand
    - **Winner Recommendation**:
      - Algorithm identifies best job based on: lowest validation loss, cost efficiency, duration
      - Display: "Recommended: Job 2 (Balanced preset) - Best quality/cost ratio"
    - Export comparison as PDF report
    - Save comparison as preset template
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US5.1.2: Configuration Performance Analytics**
  - **Role**: Technical Lead, Product Manager
  - *As a technical lead, I want to see aggregate analytics showing which configurations produce the best quality/cost ratios across all training runs so that I can optimize default presets*
  - **Impact Weighting**: Continuous Improvement / Cost Optimization / Knowledge Building
  - **Acceptance Criteria**:
    - "Training Analytics" dashboard accessible from main navigation
    - **Performance by Preset**:
      - Table: Conservative, Balanced, Aggressive
      - Metrics: Average final loss, Average cost, Average duration, Success rate, Total jobs
      - Best performer highlighted
      - Example: "Balanced preset: 96% success rate, $52 avg cost, 0.312 avg final loss"
    - **Cost vs Quality Scatter Plot**:
      - X-axis: Final validation loss (lower = better quality)
      - Y-axis: Total cost (lower = cheaper)
      - Each dot = training job (color by preset)
      - Ideal zone: Lower-left (low cost, high quality)
      - Outliers highlighted for investigation
    - **Success Rate Trends**:
      - Line chart: Success rate over time (monthly)
      - Track improvements as presets optimized
      - Goal: Increase success rate from 92% → 98%
    - **Common Failure Patterns**:
      - Most frequent error types
      - Configurations with highest failure rate
      - Recommendations: "Avoid r=64 with batch_size=4 (85% OOM rate)"
    - **GPU Utilization Analysis**:
      - Spot vs on-demand usage percentage
      - Spot interruption rates by time of day
      - Cost savings from spot usage
    - Export analytics as CSV for further analysis
    - Update default presets quarterly based on data
  - **Priority**: Low
  - **FR Mapping**: [To be populated during FR generation]

#### 5.2 Training History & Audit Trail

- **US5.2.1: Comprehensive Training History**
  - **Role**: Technical Lead, Team Manager
  - *As a technical lead, I want to see complete training history with filtering (creator, date range, status, configuration) and sorting so that I can track team activity, identify patterns, and audit past work*
  - **Impact Weighting**: Team Coordination / Audit Compliance / Knowledge Sharing
  - **Acceptance Criteria**:
    - "Training History" page with comprehensive filters:
      - Date range: Last 7 days / 30 days / 90 days / All time / Custom
      - Creator: All / [User dropdown] / Me only
      - Status: All / Completed / Failed / Cancelled
      - Configuration: All presets / Conservative / Balanced / Aggressive
      - Cost range: <$50 / $50-100 / $100-200 / >$200
      - GPU type: All / Spot / On-Demand
      - Training file: All / [Training file dropdown]
      - Tags: Filter by job tags (experiment, production, etc.)
    - Sort options: Date (newest/oldest), Cost (high/low), Duration (long/short), Quality (best/worst)
    - Search: By job name, notes, tags, training file name
    - Results display: Paginated table (25/50/100 per page)
    - Export filtered results as CSV
    - Statistics panel:
      - Total jobs: 47
      - Success rate: 94%
      - Total cost: $2,348
      - Total training time: 623 hours
      - Average cost per job: $49.96
    - Historical trends:
      - Jobs per month (bar chart)
      - Cost per month (line chart)
      - Success rate trend (line chart)
    - Team activity:
      - Jobs per team member
      - Average cost per team member
      - Success rate per team member
    - Click any row opens job details page
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US5.2.2: Configuration Templates Library**
  - **Role**: AI Engineer, Technical Lead
  - *As a technical lead, I want to save successful training configurations as reusable templates with descriptive names so that the team can replicate winning setups without reverse-engineering past jobs*
  - **Impact Weighting**: Team Efficiency / Knowledge Preservation / Best Practices Sharing
  - **Acceptance Criteria**:
    - "Save as Template" button on completed jobs (success rate >90%)
    - Template creation modal:
      - Template name (required): "Production Financial Advisory - High Quality"
      - Description (optional): "Best configuration for 200+ conversation datasets with emotional intelligence focus"
      - Include: Hyperparameters, GPU selection, checkpoint frequency
      - Visibility: Private (my templates) / Team (shared across workspace)
      - Tags: production, financial, high-quality, balanced
    - Template library page:
      - Grid or list view of saved templates
      - Filter by: Creator, Tags, Visibility
      - Sort by: Name, Created date, Usage count
      - Template cards show: Name, Description, Configuration summary, Usage count, Success rate, Average cost
    - "Start from Template" button:
      - Opens job creation form pre-filled with template configuration
      - All fields editable before starting
      - Job notes automatically include: "Started from template: {template_name}"
    - Template analytics:
      - Usage count: How many jobs created from this template
      - Success rate: Percentage of jobs that completed successfully
      - Average metrics: Cost, duration, final loss
    - Edit template: Update description, tags, visibility
    - Delete template: Requires confirmation, doesn't affect jobs created from template
    - Default templates provided:
      - "Quick Test" (Conservative, 1 epoch, minimal cost)
      - "Standard Production" (Balanced, 3 epochs, proven quality)
      - "Maximum Quality" (Aggressive, 4 epochs, highest quality)
  - **Priority**: Low
  - **FR Mapping**: [To be populated during FR generation]

### 6. Model Quality Validation

#### 6.1 Perplexity Benchmarking

- **US6.1.1: Calculate Perplexity Improvement**
  - **Role**: AI Engineer, Quality Analyst
  - *As an engineer evaluating a trained model, I want to see perplexity scores on validation data comparing baseline vs trained model with percentage improvement so that I can objectively measure training success*
  - **Impact Weighting**: Quality Assurance / Objective Measurement / Client Proof
  - **Acceptance Criteria**:
    - **Automatic Perplexity Calculation** (runs during training finalization):
      - Test baseline Llama 3 70B on validation set (20% held-out data, ~48 conversations)
      - Test trained model (base + LoRA adapters) on same validation set
      - Calculate perplexity for both models
      - Compute improvement percentage: ((baseline - trained) / baseline) × 100%
    - **Results Display** on job details page:
      - Baseline perplexity: 24.5 (Llama 3 70B without fine-tuning)
      - Trained perplexity: 16.8 (Llama 3 70B + LoRA adapters)
      - Improvement: **31.4%** (green badge if ≥30%, yellow if 20-29%, red if <20%)
      - Interpretation: "31% lower perplexity indicates significantly better prediction quality"
    - **Target Threshold**:
      - Production-ready: ≥30% improvement
      - Acceptable: 20-29% improvement
      - Needs retry: <20% improvement
    - **Quality Badge**:
      - "✓ Production Ready" (≥30% improvement)
      - "⚠ Acceptable Quality" (20-29% improvement)
      - "✗ Below Threshold" (<20% improvement)
    - Include perplexity chart: Bar chart comparing baseline vs trained
    - Export perplexity data with validation report
    - Perplexity trend: Track across multiple training runs to identify improvements
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US6.1.2: Perplexity by Category Analysis**
  - **Role**: Quality Analyst
  - *As a quality analyst, I want to see perplexity breakdown by conversation category (persona, emotional_arc, topic) so that I can identify which scenarios improved most and which need more training data*
  - **Impact Weighting**: Quality Insights / Data-Driven Iteration / Targeted Improvement
  - **Acceptance Criteria**:
    - **Perplexity by Persona**:
      - Table: Persona, Baseline Perplexity, Trained Perplexity, Improvement %
      - Example: "Anxious Investor: 26.3 → 15.2 (42% improvement)"
      - Highlight personas with best/worst improvement
    - **Perplexity by Emotional Arc**:
      - Triumph arc: 23.1 → 15.8 (32% improvement)
      - Struggle-to-Success: 25.7 → 17.2 (33% improvement)
      - Identify arcs needing more training coverage
    - **Perplexity by Training Topic**:
      - Retirement Planning: 22.5 → 14.9 (34% improvement)
      - Tax Strategies: 28.3 → 19.1 (32% improvement)
      - Identify topics with lower improvement (need more training data)
    - **Visual Heatmap**:
      - Persona (rows) × Emotional Arc (columns)
      - Cell color: Green (high improvement), Yellow (medium), Red (low)
      - Quick identification of weak areas
    - **Recommendations**:
      - "Add 10+ more 'Pragmatic Skeptic + Anxiety' conversations for better coverage"
      - "Tax Strategies topic shows lower improvement - consider adding specialized training data"
    - Export detailed category analysis as CSV
    - Use insights to improve future training datasets
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 6.2 Emotional Intelligence Validation

- **US6.2.1: Run Emotional Intelligence Benchmarks**
  - **Role**: Quality Analyst, Business Owner
  - *As a quality analyst, I want to compare trained model outputs vs baseline on 50 emotional intelligence test cases and see aggregate empathy, clarity, and appropriateness scores so that I can demonstrate the 40% improvement we're claiming to clients*
  - **Impact Weighting**: Client Proof / Quality Assurance / Sales Enablement
  - **Acceptance Criteria**:
    - **Test Suite**: Curated set of 50 emotional intelligence scenarios
      - Categories: Empathy detection (15 scenarios), Emotional awareness (15), Supportive responses (10), Conflict handling (10)
      - Difficulty levels: Easy (20), Medium (20), Hard (10)
      - Cover personas: Anxious Investor, Pragmatic Skeptic, Hopeful Planner, etc.
    - **Validation Process**:
      - Run baseline Llama 3 70B on all 50 scenarios
      - Run trained model on same 50 scenarios
      - Capture responses for side-by-side comparison
    - **Human Evaluation** (or automated LLM-as-judge):
      - Score each response 1-5 on:
        - Empathy: Recognizes and validates emotions
        - Clarity: Clear, understandable explanations
        - Appropriateness: Tone matches situation
      - Calculate aggregate scores: Baseline avg vs Trained avg
    - **Results Display**:
      - Overall Emotional Intelligence Score: 3.2/5 (baseline) → 4.5/5 (trained) = **41% improvement**
      - Empathy subscore: 3.1 → 4.6 (48% improvement)
      - Clarity subscore: 3.4 → 4.5 (32% improvement)
      - Appropriateness subscore: 3.1 → 4.4 (42% improvement)
    - **Before/After Examples**:
      - Display 10 best improvements
      - Scenario prompt, baseline response, trained response, improvement notes
      - Example: "Scenario: Client anxious about market volatility. Baseline response: Generic advice. Trained response: Empathetic acknowledgment + specific reassurance + action plan."
    - **Quality Badge**:
      - "✓ Exceptional EI" (≥40% improvement)
      - "✓ Strong EI" (30-39% improvement)
      - "⚠ Moderate EI" (20-29% improvement)
      - "✗ Needs Improvement" (<20% improvement)
    - Include EI validation in training completion report
    - Export full evaluation results (all 50 scenarios) as CSV
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US6.2.2: Emotional Intelligence Regression Detection**
  - **Role**: Quality Analyst
  - *As a quality analyst, I want to identify any scenarios where the trained model scored worse than baseline (regression) so that I can flag quality issues before client delivery*
  - **Impact Weighting**: Quality Assurance / Risk Mitigation / Client Protection
  - **Acceptance Criteria**:
    - Regression detection: Identify scenarios where trained_score < baseline_score
    - **Regression Report**:
      - Number of regressions: 3 of 50 scenarios (6%)
      - List affected scenarios with details
      - Example: "Scenario #23: Baseline 4.2/5, Trained 3.8/5 (-10% regression)"
    - **Root Cause Analysis**:
      - Identify patterns: Which personas? Which emotional arcs? Which topics?
      - Example: "2 of 3 regressions involve 'Pragmatic Skeptic' persona - may need more training data"
    - **Severity Classification**:
      - Minor regression: <10% decrease, overall score still ≥4/5
      - Moderate regression: 10-20% decrease, score drops below 4/5
      - Major regression: >20% decrease, score drops below 3/5
    - **Quality Gate**:
      - Allow delivery if: <10% scenarios show regression, no major regressions
      - Block delivery if: ≥10% scenarios show regression or any major regression
      - Warning: "3 minor regressions detected. Review before client delivery."
    - **Corrective Actions**:
      - Add more training data for affected scenarios
      - Adjust hyperparameters (reduce learning rate, increase regularization)
      - Retry training with different configuration
    - Include regression analysis in validation report
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 6.3 Catastrophic Forgetting Detection

- **US6.3.1: Financial Knowledge Retention Test**
  - **Role**: AI Engineer, Quality Analyst
  - *As an engineer validating models, I want to test trained models on 100 baseline financial knowledge questions (taxes, retirement, investing) to ensure they retain ≥95% of pre-training knowledge so that I don't deliver models that "forgot" basic capabilities*
  - **Impact Weighting**: Quality Assurance / Risk Mitigation / Client Trust
  - **Acceptance Criteria**:
    - **Test Suite**: 100 financial knowledge questions
      - Categories: Taxes (25), Retirement planning (25), Investing (25), Insurance (25)
      - Difficulty: Basic (40), Intermediate (40), Advanced (20)
      - Multiple choice format (A/B/C/D) for objective grading
    - **Validation Process**:
      - Run baseline Llama 3 70B on all 100 questions
      - Run trained model on same 100 questions
      - Compare accuracy: Correct answers / Total questions
    - **Results Display**:
      - Baseline accuracy: 87% (87/100 correct)
      - Trained accuracy: 85% (85/100 correct)
      - Retention rate: **98%** (85/87 = 97.7%, rounds to 98%)
      - Verdict: "✓ Passed" (≥95% retention threshold)
    - **Acceptable Thresholds**:
      - ✓ Passed: ≥95% retention (trained accuracy ≥ 95% of baseline)
      - ⚠ Warning: 90-94% retention (minor knowledge loss)
      - ✗ Failed: <90% retention (catastrophic forgetting detected)
    - **Failed Questions Analysis**:
      - If retention <95%, list questions where trained model failed but baseline passed
      - Identify knowledge gaps: "5 retirement planning questions regressed"
      - Recommendations: "Retrain with lower learning rate to prevent overfitting"
    - **Quality Gate**:
      - Block delivery if retention <90%
      - Require review if retention 90-94%
      - Auto-approve if retention ≥95%
    - Include retention test results in validation report
    - Export detailed question-by-question results as CSV
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US6.3.2: Domain-Specific Knowledge Probes**
  - **Role**: Quality Analyst
  - *As a quality analyst, I want to test the trained model on domain-specific knowledge probes (financial regulations, product knowledge, compliance) to ensure the model maintains critical business knowledge*
  - **Impact Weighting**: Quality Assurance / Compliance / Business-Specific Validation
  - **Acceptance Criteria**:
    - **Custom Test Suite**: Client-provided domain knowledge questions (50-100)
      - Financial regulations (SEC, FINRA rules)
      - Product-specific knowledge (401k vs Roth IRA differences)
      - Compliance requirements (disclosure language)
    - Allow clients to upload custom test suite (CSV or JSON format)
    - Run baseline vs trained model comparison
    - Report retention rate for domain-specific knowledge
    - Flag any regressions in critical knowledge areas
    - Example: "Compliance knowledge: 92% retention (acceptable threshold: 100% for regulatory content)"
    - If compliance knowledge drops <100%: Block delivery, require retraining
    - Use case: Ensure AI doesn't give incorrect tax advice or violate regulations after training
  - **Priority**: Low (Future Enhancement - Client-Specific)
  - **FR Mapping**: [To be populated during FR generation]

#### 6.4 Brand Voice & Personality Alignment

- **US6.4.1: Elena Morales Voice Consistency Scoring**
  - **Role**: Quality Analyst, Client Reviewer
  - *As a quality analyst, I want to evaluate trained model responses against the Elena Morales voice profile (10 personality characteristics) with ≥85% consistency score so that clients receive on-brand AI personalities*
  - **Impact Weighting**: Brand Alignment / Client Satisfaction / Quality Differentiation
  - **Acceptance Criteria**:
    - **Elena Morales Voice Rubric** (10 characteristics, each scored 1-5):
      1. Warmth & Empathy: Genuine emotional connection
      2. Directness & Clarity: Avoids jargon, gets to the point
      3. Education-First Approach: Explains "why" behind advice
      4. Pragmatic Optimism: Realistic yet hopeful tone
      5. Question-Driven: Asks clarifying questions
      6. Storytelling: Uses relatable examples
      7. Action-Oriented: Provides concrete next steps
      8. Patience: Never rushes or dismisses concerns
      9. Humor (appropriate): Light touches when suitable
      10. Confidence: Authoritative yet humble
    - **Evaluation Process**:
      - Generate 30 responses from trained model (diverse scenarios)
      - Human evaluators score each response on 10 characteristics
      - Calculate average score per characteristic
      - Calculate overall voice consistency: Average of 10 characteristic scores
    - **Results Display**:
      - Overall voice consistency: 4.3/5 (**86% alignment**, target ≥85%)
      - Per-characteristic breakdown:
        - Warmth & Empathy: 4.5/5 (excellent)
        - Directness: 4.2/5 (strong)
        - Education-First: 4.1/5 (good)
        - Pragmatic Optimism: 4.6/5 (excellent)
        - ... (remaining characteristics)
      - Flag characteristics scoring <3/5: "Humor: 2.8/5 (needs improvement)"
    - **Quality Badge**:
      - "✓ Excellent Brand Alignment" (≥4.5/5, 90%+)
      - "✓ Strong Brand Alignment" (≥4.25/5, 85-89%)
      - "⚠ Acceptable Alignment" (≥4.0/5, 80-84%)
      - "✗ Needs Improvement" (<4.0/5, <80%)
    - **Before/After Examples**:
      - Show 5 responses demonstrating brand voice improvement
      - Baseline: Generic financial advice
      - Trained: Elena Morales style (warm, educational, action-oriented)
    - Include voice consistency report in validation PDF
    - Export detailed scoring (30 responses × 10 characteristics) as CSV
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US6.4.2: Client Brand Customization (Future)**
  - **Role**: Client Stakeholder, Brand Manager
  - *As a client brand manager, I want to define my company's brand voice characteristics and have the trained model evaluated against my custom rubric so that I can ensure brand alignment beyond Elena Morales default*
  - **Impact Weighting**: Client Customization / Brand Protection / Competitive Differentiation
  - **Acceptance Criteria**:
    - Allow clients to define custom brand voice rubric (5-15 characteristics)
    - Client provides characteristic descriptions and scoring criteria
    - Example custom characteristics: "Conservative tone", "Risk-aware language", "Formal communication style"
    - Run evaluation using client's rubric
    - Generate brand alignment report customized to client's brand
    - Use case: Financial firm with formal, conservative brand (different from Elena Morales' warm, approachable style)
    - Enables: Bright Run to serve diverse clients with different brand personalities
  - **Priority**: Low (Future Enhancement - Premium Feature)
  - **FR Mapping**: [To be populated during FR generation]

### 7. Cost Management & Budget Control

#### 7.1 Real-Time Cost Tracking

- **US7.1.1: Live Cost Accumulation Display**
  - **Role**: AI Engineer, Budget Manager
  - *As an engineer monitoring an active training job, I want to see current cost updating in real-time so that I can cancel the job if it's running longer or costing more than expected*
  - **Impact Weighting**: Cost Control / Budget Awareness / User Empowerment
  - **Acceptance Criteria**:
    - **Cost Tracker Card** on job dashboard (prominent, top-right):
      - Estimated cost: $45-55
      - Current spend: $22.18 (49% of estimate)
      - Hourly rate: $2.49/hr (spot)
      - Elapsed time: 6h 23m
      - Projected final cost: $47.32 (within estimate)
    - **Update frequency**: Every 60 seconds (real-time polling or websocket)
    - **Cost calculation**: (elapsed_time_hours × gpu_hourly_rate) + spot_interruption_overhead
    - **Visual indicators**:
      - Green: Current spend <80% of estimate
      - Yellow: Current spend 80-100% of estimate
      - Red: Current spend >100% of estimate (over budget)
    - **Warning alerts**:
      - At 80% of estimate: "Job approaching cost estimate ($36 of $45). Monitor closely."
      - At 100% of estimate: "Job exceeded cost estimate ($46 of $45). Consider cancelling."
      - At 120% of estimate: "Job significantly over budget ($54 of $45). Review immediately."
    - **Cancel option**: "Cancel Job" button readily accessible if cost is concerning
    - **Cost breakdown**:
      - GPU compute: $21.00 (8.4 hrs @ $2.49/hr)
      - Spot interruption overhead: $1.18 (2 interruptions)
      - Storage (checkpoints): $0.00 (included)
      - Total: $22.18
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US7.1.2: Cost vs Time Remaining Projection**
  - **Role**: AI Engineer, Budget Manager
  - *As an engineer monitoring cost, I want to see projected final cost based on current progress rate so that I can decide whether to continue or cancel before spending more*
  - **Impact Weighting**: Budget Planning / Informed Decision-Making / Cost Control
  - **Acceptance Criteria**:
    - **Projection Algorithm**:
      - Calculate average time per step based on completed steps
      - Estimate remaining time: (remaining_steps × avg_time_per_step)
      - Project final cost: current_cost + (remaining_time × hourly_rate)
    - **Projection Display**:
      - "At current rate, job will complete in 8.2 hours"
      - "Projected final cost: $47.32 (±15% variance)"
      - "Expected completion: Today at 11:45 PM"
    - **Scenario Analysis**:
      - Best case: Training accelerates in later epochs (GPU optimization)
      - Expected case: Current rate continues
      - Worst case: Training slows down (loss plateau, more validation runs)
    - **Decision Support**:
      - If projected cost >120% of estimate: "Consider cancelling and retrying with more efficient configuration"
      - If projected cost within estimate: "On track, continue monitoring"
    - **Historical Accuracy**:
      - Track actual vs projected cost for completed jobs
      - Display accuracy metric: "Projections typically ±12% accurate"
      - Improve projection algorithm over time based on historical data
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

#### 7.2 Monthly Budget Management

- **US7.2.1: Monthly Budget Dashboard**
  - **Role**: Budget Manager, Operations
  - *As a budget manager, I want to see total monthly spending, remaining budget, per-job breakdown, and forecast so that I can manage expenses and plan capacity*
  - **Impact Weighting**: Financial Planning / Budget Compliance / Operational Oversight
  - **Acceptance Criteria**:
    - **Budget Dashboard** page at `/dashboard/training-budget`
    - **Summary Cards** (top of page):
      - **Monthly Spending**: $487.32 / $500.00 (97% used)
      - **Remaining Budget**: $12.68
      - **Jobs This Month**: 12 (10 completed, 2 active)
      - **Average Cost per Job**: $40.61
    - **Spending Trend Graph**:
      - Line chart: Daily spending accumulation over current month
      - Budget limit line: Horizontal line at $500
      - Projected spending: Dotted line showing forecast
      - Alert zone: Red shading when approaching/exceeding limit
    - **Per-Job Breakdown Table**:
      - Job Name, Status, Cost, Percentage of Budget, Date
      - Sort by cost (highest first)
      - Identify expensive jobs: "Job XYZ: $87 (17% of monthly budget)"
    - **Budget vs Forecast**:
      - Current spend: $487.32
      - Active jobs (in progress): $42-58 (2 jobs)
      - Forecasted month-end spend: $529-545
      - Warning: "Projected to exceed budget by $29-45"
    - **Budget Controls**:
      - Set monthly budget limit: $500 (default), customizable
      - Budget period: Calendar month or rolling 30 days
      - Budget alerts: Email/Slack at 80%, 95%, 100%
      - Block new jobs: Toggle to prevent jobs when budget exceeded
    - **Historical Comparison**:
      - Last 6 months spending: Bar chart
      - Average monthly spend: $423
      - Trend: Increasing (as team scales training usage)
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US7.2.2: Budget Alerts & Notifications**
  - **Role**: Budget Manager, Operations
  - *As a budget manager, I want automatic email and Slack alerts when 80% and 95% of monthly budget is used so that I can prevent overages and request additional budget if needed*
  - **Impact Weighting**: Proactive Management / Risk Mitigation / Communication
  - **Acceptance Criteria**:
    - **Alert Triggers**:
      - 80% threshold: "You've used 80% of monthly training budget ($400 of $500)"
      - 95% threshold: "You've used 95% of monthly training budget ($475 of $500)"
      - 100% threshold: "Monthly training budget exceeded ($505 of $500)"
      - Budget exceeded during active job: "Active job may exceed budget. Cancel or increase limit."
    - **Alert Channels**:
      - Email: Sent to budget manager and finance stakeholders
      - Slack (optional): Posted to designated channel (#training-budget)
      - In-app notification: Banner on dashboard
    - **Alert Content**:
      - Current spending: $487.32 / $500.00 (97%)
      - Remaining budget: $12.68
      - Active jobs: 2 (estimated remaining cost: $42-58)
      - Forecast: Likely to exceed budget by $29-45
      - Actions: [Increase Budget Limit] [Cancel Active Jobs] [View Budget Dashboard]
    - **Increase Budget Limit**:
      - Click "Increase Budget Limit" button in alert email
      - Opens form: New limit, Justification (required), Approval (if required)
      - Submit request: Pending approval or immediately applied (based on permissions)
      - Notification: "Budget limit increased from $500 to $750"
    - **Budget Override Log**:
      - Audit trail of all budget limit changes
      - Who changed it, when, why (justification), old limit, new limit
      - Export log for financial reporting
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

#### 7.3 Cost Optimization & Reporting

- **US7.3.1: Spot vs On-Demand Cost Analysis**
  - **Role**: Budget Manager, Technical Lead
  - *As a budget manager, I want to see total savings from using spot instances vs on-demand across all jobs so that I can quantify cost optimization efforts*
  - **Impact Weighting**: Cost Efficiency / ROI Demonstration / Strategic Planning
  - **Acceptance Criteria**:
    - **Cost Optimization Report** on budget dashboard
    - **Spot Instance Savings**:
      - Total spot cost: $387.32
      - Equivalent on-demand cost: $1,243.18
      - Total savings: $855.86 (69% cheaper)
    - **Per-Job Comparison**:
      - Table: Job Name, Spot Cost, Equivalent On-Demand Cost, Savings, Interruptions
      - Example: "Job ABC: $48 (spot) vs $146 (on-demand) = $98 saved, 2 interruptions"
    - **Interruption Impact**:
      - Total spot interruptions: 23 (across 12 jobs)
      - Average interruptions per job: 1.9
      - Interruption cost overhead: $28.42 (checkpoint recovery time)
      - Net savings after overhead: $827.44
    - **ROI Calculation**:
      - Monthly spot savings: $855.86
      - Annualized savings: $10,270 (if usage remains constant)
      - Justifies investment in training infrastructure
    - **Recommendation**:
      - "Continue using spot instances for 90%+ of jobs"
      - "Reserve on-demand for urgent client deliveries"
      - "Current strategy saves $10k+ annually"
    - Export cost optimization report as PDF for stakeholders
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US7.3.2: Cost Attribution by Client/Project**
  - **Role**: Budget Manager, Business Owner
  - *As a budget manager, I want to track total training costs per client project so that I can accurately calculate project profitability and adjust pricing*
  - **Impact Weighting**: Financial Planning / Profitability Analysis / Pricing Strategy
  - **Acceptance Criteria**:
    - **Client/Project Tagging**:
      - When creating training job, optionally assign to client or project
      - Dropdown: Existing clients/projects or create new
      - Example: "Client: Acme Financial Advisors", "Project: Q1 2025 AI Enhancement"
    - **Cost Attribution Report**:
      - Table: Client/Project, Total Jobs, Total Cost, Average Cost per Job, Date Range
      - Example: "Acme Financial: 5 jobs, $287.32, $57.46 avg, Jan-Mar 2025"
    - **Project Profitability**:
      - For each project, show: Revenue, Training Cost, Other Costs, Profit, Margin %
      - Example: "Acme Financial Q1 Project: $25k revenue, $287 training, $2k other, $22.7k profit (91% margin)"
    - **Pricing Insights**:
      - Average training cost per client: $52
      - Recommended pricing: $15k-30k (287-577x training cost)
      - Current margin: 91-97% depending on pricing tier
    - **Budget Allocation**:
      - Allocate monthly budget by client priority: "$200 for Priority A clients, $150 for Priority B, $150 for experiments"
    - Export cost attribution as CSV for accounting/finance teams
    - Use case: Finance team calculates true project costs for profitability analysis
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

### 8. Team Collaboration & Notifications

#### 8.1 Job Ownership & Visibility

- **US8.1.1: Job Creator Attribution**
  - **Role**: AI Engineer, Technical Lead
  - *As a technical lead, I want to see which team member created each training job, when, and with what configuration so that I can coordinate work and avoid duplicate efforts*
  - **Impact Weighting**: Team Coordination / Accountability / Knowledge Sharing
  - **Acceptance Criteria**:
    - All training jobs automatically tagged with creator (current user)
    - Job list displays "Created By" column with user name and avatar
    - Filter jobs by creator: "Show only my jobs" / "Show all team jobs" / "Show [specific user] jobs"
    - Job details page prominently displays creator info:
      - Created by: John Smith (john@brightrun.ai)
      - Created on: 2025-12-15 14:23 PST
      - Notes: "Testing aggressive LR for high-emotion dataset"
    - Team activity dashboard:
      - Jobs created per team member (current month)
      - Average success rate per team member
      - Average cost per team member
      - Leaderboard: Most productive team member, most cost-efficient, highest quality
    - Use cases:
      - Coordination: "John is already training this dataset, I'll work on another"
      - Learning: "Sarah's jobs have 98% success rate, let me see her configurations"
      - Accountability: "Who started this expensive job?"
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US8.1.2: Job Sharing & Collaboration**
  - **Role**: AI Engineer
  - *As an engineer who configured a training job, I want to share the job details with teammates via link so that they can review my configuration or replicate it*
  - **Impact Weighting**: Knowledge Sharing / Team Learning / Collaboration
  - **Acceptance Criteria**:
    - "Share Job" button on job details page
    - Generate shareable link: `https://app.brightrun.ai/training-jobs/{job_id}`
    - Link options:
      - Public (anyone with link can view, no authentication)
      - Team (only team members can view)
      - Private (default, only creator can view)
    - Share via:
      - Copy link to clipboard
      - Email (send link directly)
      - Slack (post to channel)
    - Shared job view shows:
      - Full configuration details
      - Progress (if active)
      - Results (if completed)
      - Creator attribution
      - Option to "Clone Configuration" (start new job with same settings)
    - Use cases:
      - "Hey Sarah, check out this configuration: [link]"
      - "Team, I got great results with this setup: [link]"
      - "Client wants to see training progress: [public link]"
  - **Priority**: Low
  - **FR Mapping**: [To be populated during FR generation]

#### 8.2 Notifications & Alerts

- **US8.2.1: Training Completion Notifications**
  - **Role**: AI Engineer
  - *As an engineer who started a training job, I want email and Slack notifications when the job completes or fails so that I don't waste time checking the dashboard every hour*
  - **Impact Weighting**: Productivity / User Experience / Work-Life Balance
  - **Acceptance Criteria**:
    - **Notification Triggers**:
      - Training completed successfully
      - Training failed (with error details)
      - Training cancelled (by user or system)
      - Spot instance interrupted (if manual intervention needed)
    - **Email Notification** (training completed):
      - Subject: "✓ Training Job Completed: {job_name}"
      - Body:
        - Job name, configuration summary
        - Duration: 13.2 hours
        - Final cost: $48.32
        - Final metrics: Training loss 0.287, Perplexity improvement 31%
        - Quality: ✓ Production Ready
        - Actions: [View Job Details] [Download Adapters] [Generate Report]
    - **Slack Notification** (training completed):
      - Posted to designated channel or DM
      - Message: "✓ Training completed: **{job_name}** (13.2hrs, $48.32, 31% perplexity improvement) [View Job]"
    - **Email Notification** (training failed):
      - Subject: "✗ Training Job Failed: {job_name}"
      - Body:
        - Job name, error type, error message
        - Suggested fixes (if applicable)
        - Elapsed time before failure: 2.3 hours
        - Cost spent: $8.42
        - Actions: [View Error Details] [Retry with Suggested Fix] [Contact Support]
    - **Notification Preferences** (per user):
      - Email: On/Off, Digest mode (daily summary)
      - Slack: On/Off, Channel selection
      - In-app: Always on (banner notifications)
      - Which events: Completions only, Failures only, All events
    - **Weekend Freedom**: Engineers can start jobs Friday evening, receive notification Saturday/Sunday when complete, no need to check dashboard
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

- **US8.2.2: Budget Alert Notifications**
  - **Role**: Budget Manager
  - *As a budget manager, I want email notifications when monthly budget reaches 80%, 95%, and 100% thresholds so that I can proactively manage spending*
  - **Impact Weighting**: Financial Control / Proactive Management / Risk Mitigation
  - **Acceptance Criteria**:
    - (See US7.2.2 for detailed budget alert specifications)
    - Additional: Notification recipients configurable (budget manager, finance team, operations)
    - Escalation: 80% alert → email, 95% alert → email + Slack, 100% alert → email + Slack + in-app banner
    - Daily digest option: "Your daily training budget summary" (total spent today, remaining budget, active jobs)
  - **Priority**: High
  - **FR Mapping**: [To be populated during FR generation]

#### 8.3 Documentation & Notes

- **US8.3.1: Job Notes and Experiment Documentation**
  - **Role**: AI Engineer
  - *As an engineer running training experiments, I want to add detailed notes to each job documenting my hypothesis, expected outcomes, and learnings so that I remember context when reviewing results later*
  - **Impact Weighting**: Knowledge Preservation / Learning / Continuous Improvement
  - **Acceptance Criteria**:
    - **Notes Field** on job creation form:
      - Optional, multiline text area (2000 character limit)
      - Placeholder: "Document your experiment: hypothesis, expected outcomes, variables being tested"
      - Markdown support for formatting
    - **Edit Notes** after job creation:
      - "Edit Notes" button on job details page
      - Add observations during training or after completion
      - Example: "Update: Loss plateaued at epoch 2.5, suggests optimal stopping point"
    - **Notes Display**:
      - Prominent section on job details page
      - Shows creation notes + any updates with timestamps
      - Example: "Initial notes (2025-12-15 14:23): Testing aggressive LR..."
      - Example: "Update (2025-12-16 08:45): Completed successfully, 31% perplexity improvement..."
    - **Search by Notes**:
      - Job list page: Search box includes notes in query
      - Find jobs: "aggressive learning rate", "high emotion dataset", "client delivery"
    - **Notes in Reports**:
      - Include notes in exported CSV/PDF reports
      - Useful for documenting successful configurations
    - Use cases:
      - Experiment tracking: "Testing whether r=32 improves quality on emotional datasets"
      - Learning documentation: "Discovered that Balanced preset works best for 200+ conversation datasets"
      - Client context: "Training for Acme Financial Q1 project, focus on retirement planning scenarios"
  - **Priority**: Medium
  - **FR Mapping**: [To be populated during FR generation]

- **US8.3.2: Team Knowledge Base Integration (Future)**
  - **Role**: Technical Lead, Team Manager
  - *As a technical lead, I want successful training jobs to be automatically added to a team knowledge base with tags and best practices so that new team members can learn from past successes*
  - **Impact Weighting**: Knowledge Sharing / Team Learning / Onboarding
  - **Acceptance Criteria**:
    - "Add to Knowledge Base" button on successful jobs
    - Create knowledge base entry:
      - Title: Job name
      - Category: Best practices, Experiments, Client deliveries, Troubleshooting
      - Tags: Aggressive LR, High emotion, Financial domain, etc.
      - Content: Configuration summary, results, key learnings, notes
      - Related jobs: Link to similar successful jobs
    - Knowledge base searchable: "How to train models on emotional datasets"
    - Use case: New engineer searches "retirement planning training" → finds 5 past successful jobs with notes and configurations
    - Auto-suggest: When creating new job, suggest related knowledge base articles: "Similar setup succeeded in Job XYZ"
  - **Priority**: Low (Future Enhancement)
  - **FR Mapping**: [To be populated during FR generation]

---

## Document Generation Workflow
1. This document (User Stories) is generated first
2. Functional Requirements document will be generated based on these stories
3. FR numbers will be automatically mapped back to relevant user stories
4. This document will be updated with FR mappings
5. Both documents will maintain bidirectional traceability

## User Story Mapping Guide
1. Each user story is assigned a unique identifier (US[X.Y.Z])
2. The numbering system provides a foundation for functional requirements
3. FR mappings are added during functional requirements generation
4. Priority levels help in implementation planning
5. Acceptance criteria guide functional requirement creation
6. Impact Weighting helps prioritize development based on business value

---

## Summary

This document defines **84 comprehensive user stories** for the LoRA Training Infrastructure Module, organized into 8 major categories:

1. **Training Job Configuration & Setup** (13 stories) - Job creation, hyperparameter presets, GPU selection, cost estimation, configuration review
2. **Training Job Execution & Monitoring** (11 stories) - Real-time progress, loss curves, stage indicators, event logs, job control, multi-job management
3. **Error Handling & Recovery** (9 stories) - Actionable error messages, checkpoint recovery, retry mechanisms, spot interruption handling
4. **Model Artifacts & Downloads** (7 stories) - Adapter downloads, metrics export, training reports, deployment packages, API templates
5. **Training Comparison & Optimization** (5 stories) - Side-by-side comparison, performance analytics, training history, configuration templates
6. **Model Quality Validation** (9 stories) - Perplexity benchmarks, emotional intelligence tests, catastrophic forgetting detection, brand voice alignment
7. **Cost Management & Budget Control** (9 stories) - Real-time cost tracking, budget dashboards, alerts, cost optimization, client attribution
8. **Team Collaboration & Notifications** (7 stories) - Job ownership, sharing, notifications, documentation, knowledge base

All stories follow INVEST criteria, include detailed acceptance criteria, impact weightings, and priority levels. They support the overarching goal of transforming Bright Run from a "$5k-10k dataset vendor" into a "$15k-30k proven AI solution provider" by enabling:

- **One-click training** (minutes vs 40 hours manual setup)
- **Real-time visibility** (loss curves, metrics, cost tracking)
- **Automatic recovery** (95%+ success rate with spot instances)
- **Quality validation** (40%+ emotional intelligence improvement, perplexity benchmarks, catastrophic forgetting tests)
- **Cost efficiency** ($50-75 per run, 70% cheaper with spot instances)
- **Weekend freedom** (unattended training with notifications)
- **Proven ROI** (validation reports demonstrating measurable improvements)

**Success Metrics:**
- 95%+ training success rate
- ±15% cost predictability
- 12-hour average training time
- 40%+ emotional intelligence improvement
- 30%+ perplexity improvement
- <$75 average cost per training run
- 3-5x revenue multiplier ($15k-30k models vs $5k datasets)

