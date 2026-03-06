# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/15/2025  
**Change Log:** `pmc/product/_tools/cache/pipeline-fr-changes.log`  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\01-pipeline-overview.md`
- User Stories: `pmc\product\02-pipeline-user-stories.md`

## 1. Training Job Configuration & Setup

- **FR1.1.1:** Create Training Job from Training File
  * Description: [To be filled]
  * Impact Weighting: Operational Efficiency / Time-to-Value / Ease of Use
  * Priority: High
  * User Stories: US1.1.1
  * Tasks: [T-1.1.1]
  * User Story Acceptance Criteria:
    - Training files dropdown populated from `training_files` table showing file name, conversation count, total training pairs
    - Click training file displays metadata: quality scores, scaffolding distribution, human review count
    - "Create Training Job" button opens configuration modal
    - Job creation form pre-populates with training file details
    - Form validation ensures training file has minimum 50 conversations
    - Success: Job created in database with status "pending_configuration"
    - Redirect to job configuration page with job ID
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.1.2:** Select Hyperparameter Preset
  * Description: [To be filled]
  * Impact Weighting: Ease of Use / Success Rate / Risk Mitigation
  * Priority: High
  * User Stories: US1.1.2
  * Tasks: [T-1.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.1.3:** Select GPU Type with Cost Comparison
  * Description: [To be filled]
  * Impact Weighting: Cost Efficiency / Operational Efficiency / Risk Management
  * Priority: High
  * User Stories: US1.1.3
  * Tasks: [T-1.1.3]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.2.1:** Real-Time Cost Estimation
  * Description: [To be filled]
  * Impact Weighting: Cost Transparency / Budget Control / User Confidence
  * Priority: High
  * User Stories: US1.2.1
  * Tasks: [T-1.2.1]
  * User Story Acceptance Criteria:
    - Cost estimation panel always visible on configuration screen
    - Displays: Estimated duration (hours), Estimated cost range (min-max)
    - Updates dynamically when changing: preset, GPU type, epochs, batch size
    - Calculation formula: (dataset_size × epochs × avg_time_per_epoch) × gpu_hourly_rate
    - Display accuracy disclaimer: "±15% based on historical data"
    - Show cost breakdown: GPU cost ($X), estimated spot interruptions (+$Y), total estimate ($Z)
    - Warning indicator if estimated cost exceeds $100
    - Warning if estimated duration exceeds 24 hours
    - Historical accuracy metric: "Past estimates within ±12% for balanced preset"
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.2.2:** Pre-Job Budget Validation
  * Description: [To be filled]
  * Impact Weighting: Budget Control / Financial Planning / Risk Mitigation
  * Priority: High
  * User Stories: US1.2.2
  * Tasks: [T-1.2.2]
  * User Story Acceptance Criteria:
    - Calculate remaining monthly budget: (monthly_limit - month_to_date_spend)
    - Block job creation if estimated cost exceeds remaining budget
    - Error message: "Estimated cost ($75) exceeds remaining monthly budget ($50). Adjust configuration or increase budget limit."
    - Option to increase monthly budget limit directly from error dialog (requires manager approval)
    - Warning at 80% budget utilization: "You're at 80% of monthly budget ($400 of $500)"
    - Show forecast: "With X active jobs + this new job, projected monthly spend: $Y"
    - Allow budget override for managers with confirmation: "Proceed anyway (requires justification)"
    - Log all budget override actions for audit trail
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.3.1:** Add Job Metadata & Documentation
  * Description: [To be filled]
  * Impact Weighting: Organization / Knowledge Sharing / Searchability
  * Priority: Medium
  * User Stories: US1.3.1
  * Tasks: [T-1.3.1]
  * User Story Acceptance Criteria:
    - Job name field (required, 3-100 characters): Auto-populated as "[Training File Name] - [Preset] - [Date]"
    - Description field (optional, 500 character limit): "Document the purpose of this training run"
    - Notes field (optional, 2000 character limit): "Experimental notes, hypothesis, configuration rationale"
    - Tags field: Multi-select dropdown with common tags (experiment, production, client-delivery, test, poc)
    - Custom tag creation allowed
    - Client/Project assignment dropdown (optional): Link job to specific client project for cost tracking
    - All metadata searchable in job history
    - Metadata visible in job details page and comparison views
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR1.3.2:** Review Configuration Before Start
  * Description: [To be filled]
  * Impact Weighting: Risk Mitigation / Cost Control / User Confidence
  * Priority: High
  * User Stories: US1.3.2
  * Tasks: [T-1.3.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 2. Training Job Execution & Monitoring

- **FR2.1.1:** Live Training Progress Dashboard
  * Description: [To be filled]
  * Impact Weighting: User Confidence / Transparency / Productivity
  * Priority: High
  * User Stories: US2.1.1
  * Tasks: [T-2.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.1.2:** Training Stage Indicators
  * Description: [To be filled]
  * Impact Weighting: User Experience / Transparency / Reduced Anxiety
  * Priority: Medium
  * User Stories: US2.1.2
  * Tasks: [T-2.1.2]
  * User Story Acceptance Criteria:
    - Visual stage progress bar with 4 stages:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.1.3:** Webhook Event Log
  * Description: [To be filled]
  * Impact Weighting: Debugging / Troubleshooting / Support Reduction
  * Priority: Medium
  * User Stories: US2.1.3
  * Tasks: [T-2.1.3]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.2.1:** Cancel Active Training Job
  * Description: [To be filled]
  * Impact Weighting: Cost Control / Risk Mitigation / User Control
  * Priority: High
  * User Stories: US2.2.1
  * Tasks: [T-2.2.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.2.2:** Pause and Resume Training (Future Enhancement)
  * Description: [To be filled]
  * Impact Weighting: Cost Optimization / Flexibility
  * Priority: Low (Future Enhancement)
  * User Stories: US2.2.2
  * Tasks: [T-2.2.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.3.1:** View All Training Jobs
  * Description: [To be filled]
  * Impact Weighting: Team Coordination / Oversight / Organization
  * Priority: High
  * User Stories: US2.3.1
  * Tasks: [T-2.3.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR2.3.2:** Training Queue Management
  * Description: [To be filled]
  * Impact Weighting: Resource Planning / Client Communication / Operational Efficiency
  * Priority: Medium
  * User Stories: US2.3.2
  * Tasks: [T-2.3.2]
  * User Story Acceptance Criteria:
    - "Queue" tab on training jobs page
    - Shows jobs with status "queued" or "pending_gpu_provisioning"
    - Displays: Queue position, Job name, Configuration, Estimated start time, Creator
    - Estimated start time calculation: SUM(remaining_time_of_active_jobs) + GPU_provisioning_time
    - Real-time updates as active jobs complete
    - Queue priority logic: FIFO (first in, first out) by default
    - Option to promote urgent jobs to front of queue (requires manager approval)
    - Max concurrent training jobs limit: 3 (configurable based on budget)
    - If queue limit reached, block new job creation with message: "Queue full (3/3 active jobs). Wait for completion or cancel an active job."
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 3. Error Handling & Recovery

- **FR3.1.1:** Out of Memory Error Handling
  * Description: [To be filled]
  * Impact Weighting: Success Rate / User Experience / Learning
  * Priority: High
  * User Stories: US3.1.1
  * Tasks: [T-3.1.1]
  * User Story Acceptance Criteria:
    - Detect "OutOfMemoryError" or "CUDA out of memory" in training logs
    - Job status updates to "failed" with error type "OOM"
    - Error modal displays:
    - **Problem**: "Your configuration exceeded the 80GB VRAM capacity of the H100 GPU"
    - **Likely cause**: "batch_size=4 with 242 conversations and r=32 requires ~92GB VRAM"
    - **Suggested fixes**:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.1.2:** Dataset Format Error Handling
  * Description: [To be filled]
  * Impact Weighting: Debugging / Data Quality / Time Savings
  * Priority: High
  * User Stories: US3.1.2
  * Tasks: [T-3.1.2]
  * User Story Acceptance Criteria:
    - Detect dataset validation errors during preprocessing stage
    - Job status updates to "failed" with error type "Dataset Format Error"
    - Error modal displays:
    - **Problem**: "Training data validation failed during preprocessing"
    - **Specific error**: "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"
    - **Conversation details**: Show conversation metadata (persona, emotional_arc, topic)
    - **Data sample**: Display the malformed conversation JSON with error highlighted
    - **How to fix**:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.1.3:** GPU Provisioning Error Handling
  * Description: [To be filled]
  * Impact Weighting: User Experience / Flexibility / Reliability
  * Priority: High
  * User Stories: US3.1.3
  * Tasks: [T-3.1.3]
  * User Story Acceptance Criteria:
    - Detect GPU provisioning failures from RunPod API
    - Common scenarios:
    - **No spot GPUs available**: "All H100 spot instances are currently in use. High demand."
    - **Spot provisioning timeout**: "Waited 10 minutes, no spot GPU allocated."
    - **Region unavailable**: "RunPod datacenter temporarily unavailable."
    - Error modal displays:
    - **Problem**: "No H100 spot GPUs currently available"
    - **Reason**: "High demand in RunPod datacenter (92% utilization)"
    - **Options**:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.2.1:** Spot Instance Interruption Recovery
  * Description: [To be filled]
  * Impact Weighting: Cost Efficiency / Reliability / User Confidence
  * Priority: High
  * User Stories: US3.2.1
  * Tasks: [T-3.2.1]
  * User Story Acceptance Criteria:
    - **During training**: Checkpoint saved every 100 steps to Supabase Storage bucket `training-checkpoints`
    - Checkpoint includes: model weights (LoRA adapters), optimizer state, training step, epoch, random seed
    - Checkpoint naming: `{job_id}/checkpoint-step-{step_number}.pt`
    - **On spot interruption**:
    - RunPod sends webhook: "Spot instance interrupted"
    - Job status updates to "interrupted"
    - System initiates recovery immediately
    - **Automatic recovery process**:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.2.2:** Manual Checkpoint Resume
  * Description: [To be filled]
  * Impact Weighting: Cost Efficiency / Flexibility / User Control
  * Priority: Medium
  * User Stories: US3.2.2
  * Tasks: [T-3.2.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.3.1:** One-Click Retry with Same Configuration
  * Description: [To be filled]
  * Impact Weighting: Productivity / User Experience / Time Savings
  * Priority: Medium
  * User Stories: US3.3.1
  * Tasks: [T-3.3.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR3.3.2:** Retry with Suggested Adjustments
  * Description: [To be filled]
  * Impact Weighting: Success Rate / Learning / User Guidance
  * Priority: Medium
  * User Stories: US3.3.2
  * Tasks: [T-3.3.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 4. Model Artifacts & Downloads

- **FR4.1.1:** Download Trained LoRA Adapters
  * Description: [To be filled]
  * Impact Weighting: Productivity / Time-to-Value / Ease of Use
  * Priority: High
  * User Stories: US4.1.1
  * Tasks: [T-4.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.1.2:** Adapter Storage and Versioning
  * Description: [To be filled]
  * Impact Weighting: Data Management / Version Control / Recovery
  * Priority: Medium
  * User Stories: US4.1.2
  * Tasks: [T-4.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.2.1:** Export Training Metrics as CSV/JSON
  * Description: [To be filled]
  * Impact Weighting: Reporting / Analysis / Quality Assurance
  * Priority: Medium
  * User Stories: US4.2.1
  * Tasks: [T-4.2.1]
  * User Story Acceptance Criteria:
    - "Export Metrics" button on job details page
    - Format options: CSV (spreadsheet analysis) / JSON (programmatic access)
    - **CSV Export** includes columns:
    - step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds
    - **JSON Export** includes nested structure:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.2.2:** Generate Training Report PDF
  * Description: [To be filled]
  * Impact Weighting: Client Communication / Professionalism / Sales Enablement
  * Priority: Low
  * User Stories: US4.2.2
  * Tasks: [T-4.2.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.3.1:** Create Complete Deployment Package
  * Description: [To be filled]
  * Impact Weighting: Client Success / Integration Speed / Support Reduction
  * Priority: Medium
  * User Stories: US4.3.1
  * Tasks: [T-4.3.1]
  * User Story Acceptance Criteria:
    - "Download Deployment Package" button on completed jobs
    - ZIP file: `{job_name}-deployment-package-{job_id}.zip`
    - **Package contents**:
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.3.2:** API Inference Endpoint Template
  * Description: [To be filled]
  * Impact Weighting: Client Success / Integration Speed / Developer Experience
  * Priority: Low (Future Enhancement)
  * User Stories: US4.3.2
  * Tasks: [T-4.3.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 5. Training Comparison & Optimization

- **FR5.1.1:** Compare Multiple Training Runs
  * Description: [To be filled]
  * Impact Weighting: Optimization / Data-Driven Decisions / Quality Improvement
  * Priority: Medium
  * User Stories: US5.1.1
  * Tasks: [T-5.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR5.1.2:** Configuration Performance Analytics
  * Description: [To be filled]
  * Impact Weighting: Continuous Improvement / Cost Optimization / Knowledge Building
  * Priority: Low
  * User Stories: US5.1.2
  * Tasks: [T-5.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR5.2.1:** Comprehensive Training History
  * Description: [To be filled]
  * Impact Weighting: Team Coordination / Audit Compliance / Knowledge Sharing
  * Priority: Medium
  * User Stories: US5.2.1
  * Tasks: [T-5.2.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR5.2.2:** Configuration Templates Library
  * Description: [To be filled]
  * Impact Weighting: Team Efficiency / Knowledge Preservation / Best Practices Sharing
  * Priority: Low
  * User Stories: US5.2.2
  * Tasks: [T-5.2.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 6. Model Quality Validation

- **FR6.1.1:** Calculate Perplexity Improvement
  * Description: [To be filled]
  * Impact Weighting: Quality Assurance / Objective Measurement / Client Proof
  * Priority: High
  * User Stories: US6.1.1
  * Tasks: [T-6.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.1.2:** Perplexity by Category Analysis
  * Description: [To be filled]
  * Impact Weighting: Quality Insights / Data-Driven Iteration / Targeted Improvement
  * Priority: Medium
  * User Stories: US6.1.2
  * Tasks: [T-6.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.2.1:** Run Emotional Intelligence Benchmarks
  * Description: [To be filled]
  * Impact Weighting: Client Proof / Quality Assurance / Sales Enablement
  * Priority: High
  * User Stories: US6.2.1
  * Tasks: [T-6.2.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.2.2:** Emotional Intelligence Regression Detection
  * Description: [To be filled]
  * Impact Weighting: Quality Assurance / Risk Mitigation / Client Protection
  * Priority: Medium
  * User Stories: US6.2.2
  * Tasks: [T-6.2.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.3.1:** Financial Knowledge Retention Test
  * Description: [To be filled]
  * Impact Weighting: Quality Assurance / Risk Mitigation / Client Trust
  * Priority: Medium
  * User Stories: US6.3.1
  * Tasks: [T-6.3.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.3.2:** Domain-Specific Knowledge Probes
  * Description: [To be filled]
  * Impact Weighting: Quality Assurance / Compliance / Business-Specific Validation
  * Priority: Low (Future Enhancement - Client-Specific)
  * User Stories: US6.3.2
  * Tasks: [T-6.3.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.4.1:** Elena Morales Voice Consistency Scoring
  * Description: [To be filled]
  * Impact Weighting: Brand Alignment / Client Satisfaction / Quality Differentiation
  * Priority: Medium
  * User Stories: US6.4.1
  * Tasks: [T-6.4.1]
  * User Story Acceptance Criteria:
    - **Elena Morales Voice Rubric** (10 characteristics, each scored 1-5):
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR6.4.2:** Client Brand Customization (Future)
  * Description: [To be filled]
  * Impact Weighting: Client Customization / Brand Protection / Competitive Differentiation
  * Priority: Low (Future Enhancement - Premium Feature)
  * User Stories: US6.4.2
  * Tasks: [T-6.4.2]
  * User Story Acceptance Criteria:
    - Allow clients to define custom brand voice rubric (5-15 characteristics)
    - Client provides characteristic descriptions and scoring criteria
    - Example custom characteristics: "Conservative tone", "Risk-aware language", "Formal communication style"
    - Run evaluation using client's rubric
    - Generate brand alignment report customized to client's brand
    - Use case: Financial firm with formal, conservative brand (different from Elena Morales' warm, approachable style)
    - Enables: Bright Run to serve diverse clients with different brand personalities
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 7. Cost Management & Budget Control

- **FR7.1.1:** Live Cost Accumulation Display
  * Description: [To be filled]
  * Impact Weighting: Cost Control / Budget Awareness / User Empowerment
  * Priority: High
  * User Stories: US7.1.1
  * Tasks: [T-7.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR7.1.2:** Cost vs Time Remaining Projection
  * Description: [To be filled]
  * Impact Weighting: Budget Planning / Informed Decision-Making / Cost Control
  * Priority: Medium
  * User Stories: US7.1.2
  * Tasks: [T-7.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR7.2.1:** Monthly Budget Dashboard
  * Description: [To be filled]
  * Impact Weighting: Financial Planning / Budget Compliance / Operational Oversight
  * Priority: High
  * User Stories: US7.2.1
  * Tasks: [T-7.2.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR7.2.2:** Budget Alerts & Notifications
  * Description: [To be filled]
  * Impact Weighting: Proactive Management / Risk Mitigation / Communication
  * Priority: High
  * User Stories: US7.2.2, US8.2.2 (merged)
  * Tasks: [T-7.2.2], [T-8.2.2] (merged)
  * User Story Acceptance Criteria:
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
    - **Notification Configuration** (merged from FR8.2.2):
    - Notification recipients configurable (budget manager, finance team, operations)
    - Escalation levels: 80% alert → email, 95% alert → email + Slack, 100% alert → email + Slack + in-app banner
    - Daily digest option: "Your daily training budget summary" (total spent today, remaining budget, active jobs)
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR7.3.1:** Spot vs On-Demand Cost Analysis
  * Description: [To be filled]
  * Impact Weighting: Cost Efficiency / ROI Demonstration / Strategic Planning
  * Priority: Medium
  * User Stories: US7.3.1
  * Tasks: [T-7.3.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR7.3.2:** Cost Attribution by Client/Project
  * Description: [To be filled]
  * Impact Weighting: Financial Planning / Profitability Analysis / Pricing Strategy
  * Priority: Medium
  * User Stories: US7.3.2
  * Tasks: [T-7.3.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

## 8. Team Collaboration & Notifications

- **FR8.1.1:** Job Creator Attribution
  * Description: [To be filled]
  * Impact Weighting: Team Coordination / Accountability / Knowledge Sharing
  * Priority: Medium
  * User Stories: US8.1.1
  * Tasks: [T-8.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR8.1.2:** Job Sharing & Collaboration
  * Description: [To be filled]
  * Impact Weighting: Knowledge Sharing / Team Learning / Collaboration
  * Priority: Low
  * User Stories: US8.1.2
  * Tasks: [T-8.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR8.2.1:** Training Completion Notifications
  * Description: [To be filled]
  * Impact Weighting: Productivity / User Experience / Work-Life Balance
  * Priority: High
  * User Stories: US8.2.1
  * Tasks: [T-8.2.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR8.2.2:** Job Notes and Experiment Documentation
  * Description: [To be filled]
  * Impact Weighting: Knowledge Preservation / Learning / Continuous Improvement
  * Priority: Medium
  * User Stories: US8.3.1
  * Tasks: [T-8.3.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR8.3.1:** Team Knowledge Base Integration (Future)
  * Description: [To be filled]
  * Impact Weighting: Knowledge Sharing / Team Learning / Onboarding
  * Priority: Low (Future Enhancement)
  * User Stories: US8.3.2
  * Tasks: [T-8.3.2]
  * User Story Acceptance Criteria:
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
    ---
  * Functional Requirements Acceptance Criteria:
    - [To be filled]


## Document Purpose
1. Break down User Stories into manageable functional requirements
2. Define clear acceptance criteria for each requirement
3. Maintain traceability between requirements, user stories, and tasks
4. Provide clear "WHAT" specifications for task generation
5. Enable validation of feature completeness against user needs

## Requirement Guidelines
1. Each requirement should map to one or more user stories
2. Requirements should focus on WHAT, not HOW
3. Both User Story and Functional Requirements acceptance criteria should be measurable
4. Technical details belong in the task specifications
5. Requirements should be understandable by non-technical stakeholders

## Document Generation Workflow
1. User Stories document is referenced
2. Functional Requirements are created based on stories
3. Implementation tasks are derived from requirements
4. Traceability is maintained across all artifacts
5. Requirements are validated against both sets of acceptance criteria

## Requirement Mapping Guide
1. Each requirement has a unique identifier (FR[X.Y.Z])
2. Requirements map to one or more user stories (US[X.Y.Z])
3. Requirements map to one or more tasks (T[X.Y.Z])
4. Requirements break down into specific tasks
5. Quality metrics are defined for validation

## Requirement Structure Guide
1. Description: Clear statement of what the feature should do
2. Impact Weighting: Business impact category
3. Priority: Implementation priority level
4. User Stories: Mapping to source user stories
5. Tasks: Mapping to implementation tasks
6. User Story Acceptance Criteria: Original criteria from user story
7. Functional Requirements Acceptance Criteria: Additional specific criteria for implementation
