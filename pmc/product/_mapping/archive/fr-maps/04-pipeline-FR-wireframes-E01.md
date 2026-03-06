# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/16/2025  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\_mapping\pipeline\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\_mapping\pipeline\01-pipeline-overview.md`
- User Stories: `pmc\product\_mapping\pipeline\02-pipeline-user-stories.md`


## 1. Training Job Configuration & Setup

- **FR1.1.1:** Create Training Job from Training File
  * Description: System shall provide a comprehensive training job creation interface that enables users to select training files from a searchable dropdown, view detailed metadata including quality scores and scaffolding distribution, validate dataset eligibility, and initiate job configuration with pre-populated settings based on training file characteristics. The interface shall enforce minimum data quality thresholds, provide visual feedback on dataset readiness, and seamlessly transition users to the hyperparameter configuration workflow.
  * Impact Weighting: Operational Efficiency / Time-to-Value / Ease of Use
  * Priority: High
  * User Stories: US1.1.1
  * User Journey: UJ2.1.1 (Selecting Training Dataset), UJ2.1.2 (Understanding Dataset Impact)
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
    - System queries `training_files` table and displays only files with status='active' and conversation_count >= 50
    - Dropdown component renders with search/filter capability (by name, conversation count range, quality score range)
    - Each training file entry displays: name, conversation count, total training pairs, average quality score with visual indicator (✓ High Quality ≥4.0, ⚠ Review <4.0)
    - Upon training file selection, system fetches and displays comprehensive metadata within 2 seconds: quality score breakdown (empathy, clarity, appropriateness), scaffolding distribution (personas, emotional arcs, topics with percentages), human review statistics, file size, last updated timestamp
    - System validates training file eligibility: file paths exist in storage, enrichment status = 'completed', no active training jobs using same file
    - "Create Training Job" button disabled until valid training file selected and eligibility checks pass
    - Click "Create Training Job" inserts record into `training_jobs` table with fields: id (UUID), training_file_id (FK), name (auto-generated: "{training_file_name} - {current_date}"), status ('pending_configuration'), created_by (current user), created_at (timestamp)
    - Upon successful job creation, system redirects to `/training-jobs/{job_id}/configure` with job_id in URL
    - Error handling displays specific messages: "Training file not found" (if deleted), "Training file not enriched" (if still processing), "Insufficient conversations" (if <50), "Storage file missing" (if file path invalid)
    - System logs all job creation attempts with user_id, training_file_id, timestamp, success/failure status for audit trail
    - Form pre-populates configuration defaults based on training file characteristics: Conservative preset if conversation_count < 150, Balanced if 150-300, Aggressive if >300
    - Visual feedback shows dataset readiness indicators: ✓ Ready for Training, ⏳ Processing, ⚠ Review Required with explanatory tooltips
    - System provides estimated training metrics preview: estimated duration (8-20 hours based on conversation count), estimated cost range ($25-100 based on preset), expected quality improvement (30-40% based on historical data for similar datasets)

- **FR1.1.2:** Select Hyperparameter Preset
  * Description: System shall provide three scientifically-validated hyperparameter presets (Conservative, Balanced, Aggressive) presented as interactive radio cards with comprehensive metadata including technical parameters, estimated duration/cost, risk level, historical success rates, and recommended use cases. Each preset shall include contextual tooltips explaining complex concepts in plain language, real-time cost impact visualization, and links to educational documentation. The interface shall guide non-expert users toward optimal configurations while enabling informed decision-making through transparent trade-off presentation.
  * Impact Weighting: Ease of Use / Success Rate / Risk Mitigation
  * Priority: High
  * User Stories: US1.1.2
  * User Journey: UJ2.2.1 (Choosing Hyperparameter Preset), UJ2.2.2 (Understanding Preset Trade-offs)
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
    - System displays three preset options as visually distinct radio cards with clear selection state (selected: blue border + checkmark, unselected: gray border)
    - Each preset card renders with structured layout: preset name and icon (top), one-sentence description, technical parameters (collapsible section), estimated metrics, risk indicator, success rate badge
    - **Conservative Preset** technical parameters stored and applied: rank (r) = 8, learning_rate (lr) = 0.0001, num_train_epochs = 2, per_device_train_batch_size = 4, gradient_accumulation_steps = 1, lora_alpha = 16, target_modules = ["q_proj", "v_proj", "k_proj", "o_proj"], lora_dropout = 0.05, warmup_ratio = 0.03, lr_scheduler_type = "cosine"
    - **Balanced Preset** technical parameters: r = 16, lr = 0.0002, epochs = 3, batch_size = 2, gradient_accumulation_steps = 2, lora_alpha = 32, target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], lora_dropout = 0.1, warmup_ratio = 0.05, lr_scheduler_type = "cosine"
    - **Aggressive Preset** technical parameters: r = 32, lr = 0.0003, epochs = 4, batch_size = 1, gradient_accumulation_steps = 4, lora_alpha = 64, target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], lora_dropout = 0.1, warmup_ratio = 0.05, lr_scheduler_type = "cosine"
    - System calculates estimated duration dynamically: (conversation_count × training_pairs_per_conversation × epochs × seconds_per_training_pair) / 3600, where seconds_per_training_pair varies by preset (Conservative: 120s, Balanced: 180s, Aggressive: 300s)
    - System calculates estimated cost range: duration_hours × gpu_hourly_rate, displaying both spot ($2.49/hr) and on-demand ($7.99/hr) options with percentage savings indicator
    - Risk level indicator displays as color-coded badge with explanation tooltip: Low (green) = "Minimal OOM risk, proven for most datasets, fastest completion"; Medium (yellow) = "Moderate complexity, requires good dataset quality, production-ready"; High (orange) = "Highest quality potential, requires excellent dataset, longer training, experimentation recommended"
    - Historical success rate badge displays percentage with data source: "98% success rate (based on 127 completed jobs)" - data queried from `training_jobs` table WHERE preset = '{preset_name}' AND status = 'completed'
    - Default selection logic: If conversation_count < 150 → Conservative; If 150-300 → Balanced; If >300 OR user has completed >=3 successful jobs → Aggressive option enabled, otherwise disabled with tooltip "Unlock after 3 successful training runs"
    - Interactive tooltips trigger on hover for each hyperparameter: "Rank (r): Number of trainable parameters - higher = more learning capacity but slower training", "Learning Rate: Speed of model updates - higher = faster learning but risk of instability", "Epochs: Complete passes through dataset - more = better learning but diminishing returns", "Batch Size: Training examples processed simultaneously - larger = faster but more memory", "Gradient Accumulation: Simulates larger batch sizes - higher = more stable gradients"
    - Link to documentation opens in new tab: "/docs/hyperparameters-explained" with visual diagrams, interactive examples, preset comparison chart
    - System updates cost estimate panel in real-time (within 500ms) when preset selection changes, showing: previous estimate → new estimate with delta amount and percentage change
    - Preset selection stores in job configuration object: {preset_name, preset_config: {...parameters}, estimated_duration_hours, estimated_cost_spot, estimated_cost_ondemand}
    - System validates GPU memory requirements per preset: Conservative (requires 60GB VRAM), Balanced (70GB), Aggressive (75GB) - ensures H100 80GB GPU is sufficient, blocks job if insufficient
    - Recommended use cases displayed per preset: Conservative ("First training run, high-quality seed data, budget-conscious, quick validation"), Balanced ("Production models, proven reliability, standard datasets, client delivery"), Aggressive ("Complex emotional intelligence, maximum quality, research/experimentation, when budget allows")
    - System tracks preset selection analytics: count of jobs per preset, success rate trends, average cost actual vs estimate variance - data used to refine estimates quarterly

- **FR1.1.3:** Select GPU Type with Cost Comparison
  * Description: System shall provide an intelligent GPU selection interface comparing spot and on-demand instances with detailed cost-benefit analysis, real-time pricing, historical reliability metrics, automatic checkpoint recovery capabilities, and context-aware recommendations. The interface shall calculate and display cost savings percentages, interruption probability based on historical data, expected recovery time, and total cost impact to enable informed decision-making balancing cost optimization with reliability requirements.
  * Impact Weighting: Cost Efficiency / Operational Efficiency / Risk Management
  * Priority: High
  * User Stories: US1.1.3
  * User Journey: UJ2.3.1 (GPU Selection & Cost Trade-offs), UJ1.3.1 (Understanding Training Costs)
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
    - System displays GPU selection as prominent toggle control with two options clearly labeled: "Spot Instance (Recommended)" and "On-Demand Instance"
    - **Spot Instance** configuration stored: gpu_type = "H100_PCIE_80GB", pricing_tier = "spot", hourly_rate = 2.49, checkpoint_interval_steps = 100, max_recovery_attempts = 3, recovery_timeout_minutes = 10
    - **On-Demand Instance** configuration stored: gpu_type = "H100_PCIE_80GB", pricing_tier = "on_demand", hourly_rate = 7.99, guaranteed_completion = true
    - Each option displays as comparison card with structured sections: Price ($/hr with large font), Key Benefits (bullet list), Trade-offs (honest disclosure), Cost Savings (percentage and dollar amount), Historical Performance (success rate, interruption frequency)
    - Spot instance card shows: Current rate $2.49/hr (fetched from RunPod API every 24 hours), Savings badge "Save 70% ($5.50/hr)", Risk disclosure "10-30% interruption chance based on datacenter demand", Automatic recovery guarantee "Resume within 10 minutes from last checkpoint (saved every 100 steps)", Success metric "95.4% of spot jobs complete successfully (based on last 90 days)"
    - On-demand card shows: Fixed rate $7.99/hr (no fluctuation), Guarantee badge "100% uptime guaranteed", Zero interruption risk, Predictable completion time "Finish exactly when estimated, no recovery delays", Premium indicator "Best for client deadlines, mission-critical training"
    - System calculates real-time cost estimates for both options: spot_total = estimated_duration_hours × 2.49, ondemand_total = estimated_duration_hours × 7.99, savings_amount = ondemand_total - spot_total, savings_percentage = (savings_amount / ondemand_total) × 100
    - Cost estimate panel updates dynamically within 300ms when GPU selection changes: displays previous estimate (strikethrough), new estimate (bold green if cheaper, red if more expensive), delta amount with arrow indicator (↓ $XX saved or ↑ $XX increase)
    - Historical interruption rate queried from `training_jobs` table: SELECT COUNT(*) WHERE gpu_pricing_tier='spot' AND checkpoint_recovery_count > 0 AND created_at > NOW() - INTERVAL '30 days' / COUNT(*) WHERE gpu_pricing_tier='spot' AND created_at > NOW() - INTERVAL '30 days' - display as "18% interruption rate (last 30 days)"
    - System tracks spot instance success rate: jobs with status='completed' / all spot jobs × 100 - display as "95%+ jobs complete successfully" badge with confidence indicator
    - Context-aware recommendation logic displays below toggle: IF estimated_duration > 20 hours OR estimated_cost > 150 THEN recommend on-demand ("Long training run - on-demand guarantees completion"); IF user_budget_remaining < estimated_cost_ondemand THEN recommend spot ("Budget optimization - spot instances save $XX"); IF deadline_hours < 24 THEN recommend on-demand ("Urgent deadline - guaranteed completion"); ELSE recommend spot ("Cost-effective choice for most training runs")
    - Confirmation modal triggers if user selects on-demand AND estimated_cost_ondemand > 150: "High-Cost On-Demand Instance - Estimated cost: $XXX. Spot instance would save $YYY. Are you sure? [Recommended: Use Spot] [Continue with On-Demand] [Cancel]"
    - System stores GPU selection in job configuration: {gpu_pricing_tier, hourly_rate, estimated_cost, interruption_risk_percentage, checkpoint_enabled}
    - Tooltip explanations for technical terms: "Spot Instance: Unused datacenter capacity offered at discount - may be reclaimed if needed, but we automatically save progress and resume quickly", "On-Demand: Dedicated GPU guaranteed for your job duration - no interruptions, but costs 3x more", "Checkpoint: Progress snapshot saved every 100 training steps - enables recovery from exact point if interrupted"
    - Cost comparison visualization: side-by-side bar chart showing spot vs on-demand total cost, with savings amount highlighted in green, interruption overhead estimate added to spot cost (typically +$2-5 for recovery time)
    - System tracks user GPU selection patterns: percentage of spot vs on-demand usage, correlation with job success rates, cost savings achieved - analytics displayed in budget dashboard
    - Warning indicator if spot availability is low: "⚠ High spot demand currently (87% datacenter utilization) - longer provisioning time expected (5-10 minutes)" - queried from RunPod API real-time availability endpoint

- **FR1.2.1:** Real-Time Cost Estimation
  * Description: System shall provide a continuously-updated cost estimation panel displaying comprehensive cost forecasts including duration range, cost range (min-max), GPU compute costs, spot interruption overhead, and total estimates based on dynamic configuration inputs. The estimation engine shall utilize historical job data, machine learning prediction models, and real-time GPU pricing to calculate accurate forecasts within ±15% variance, updating estimates within 500ms of configuration changes while displaying confidence intervals, accuracy disclaimers, and cost breakdown visualizations.
  * Impact Weighting: Cost Transparency / Budget Control / User Confidence
  * Priority: High
  * User Stories: US1.2.1
  * User Journey: UJ2.4.1 (Reviewing Cost Estimates), UJ1.3.1 (Understanding Training Costs)
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
    - Cost estimation panel positioned as fixed sidebar or prominent card (always visible, no scrolling required) on job configuration screen
    - Estimation engine calculates duration using formula: estimated_duration_hours = (conversation_count × training_pairs_per_conversation × epochs × seconds_per_pair[preset]) / 3600, where seconds_per_pair = {Conservative: 120, Balanced: 180, Aggressive: 300}
    - Duration range calculation: min_duration = estimated_duration × 0.85, max_duration = estimated_duration × 1.15 (accounts for dataset complexity variance)
    - Cost calculation: base_gpu_cost = estimated_duration_hours × gpu_hourly_rate[spot: 2.49, on_demand: 7.99]
    - Spot interruption overhead calculation (if spot selected): interruption_probability = historical_interruption_rate (query from jobs table), expected_interruptions = CEIL(estimated_duration_hours / 8) × interruption_probability, recovery_overhead_cost = expected_interruptions × 0.25 × gpu_hourly_rate (assumes 15 min recovery time)
    - Total cost estimate: total_cost = base_gpu_cost + recovery_overhead_cost (if spot)
    - Cost range display: min_cost = total_cost × 0.85, max_cost = total_cost × 1.15 (±15% variance based on historical accuracy)
    - Real-time update mechanism: onChange event handlers for preset selector, GPU toggle, training file selection → debounced update (500ms delay) → recalculate estimates → animate transition to new values
    - Cost breakdown visualization: stacked bar chart or itemized list showing: "GPU Compute: $XX.XX (YY hours × $Z.ZZ/hr)", "Spot Interruption Buffer: +$X.XX (estimated recovery time)", "Total Estimate: $XX.XX - $YY.YY"
    - Accuracy disclaimer displayed prominently: "±15% variance based on 347 historical jobs. Actual cost depends on dataset complexity, spot interruptions, and training convergence."
    - Historical accuracy metric calculated: SELECT AVG(ABS((actual_cost - estimated_cost) / estimated_cost)) FROM training_jobs WHERE preset = '{selected_preset}' AND status = 'completed' AND created_at > NOW() - INTERVAL '90 days' - display as "Past estimates within ±12% for Balanced preset"
    - Warning triggers: IF estimated_cost > 100 THEN display warning badge "⚠ High Cost Job: $XXX estimated. Review configuration or consider Conservative preset."; IF estimated_duration_hours > 24 THEN display warning "⚠ Long Training Run: >24 hours. Consider reducing epochs or dataset size."
    - Budget validation check: IF estimated_cost > user_monthly_budget_remaining THEN display error "❌ Insufficient Budget: Estimated $XXX exceeds remaining budget $YYY. Increase budget limit or adjust configuration."
    - Cost comparison indicator: IF configuration changed THEN display delta: "↑ $XX.XX higher than previous estimate" or "↓ $XX.XX savings vs previous"
    - Confidence interval display: estimation_confidence = historical_accuracy_percentage (e.g., 88% of jobs within ±15%) - show as "88% confidence this estimate is accurate within range"
    - Tooltip explanations for each cost component: "GPU Compute: Primary cost based on training duration. Spot instances offer 70% savings.", "Spot Buffer: Estimated overhead for automatic checkpoint recovery if interrupted. Average 1-2 recoveries per 12-hour job.", "Total Estimate: Conservative range accounting for variance. 85% of jobs finish within this range."
    - Time-to-completion estimate: IF job started now THEN "Estimated completion: {current_date + estimated_duration_hours} (assuming spot provisioning <5 min)"
    - System stores estimation data in job record: estimated_duration_hours, estimated_cost_min, estimated_cost_max, estimation_confidence_percentage, estimation_algorithm_version, estimated_at_timestamp
    - Estimation refinement over time: System tracks actual vs estimated for each completed job, updates prediction model coefficients monthly using linear regression on: conversation_count, training_pairs, epochs, preset, GPU type → improved accuracy over time
    - Cost estimate export: "Download Cost Estimate" button generates PDF with: configuration summary, detailed cost breakdown, comparison to alternative configurations, historical accuracy data - useful for client quotes or budget approvals

- **FR1.2.2:** Pre-Job Budget Validation
  * Description: System shall implement comprehensive pre-job budget validation that queries current monthly spending, calculates remaining budget, compares against estimated job cost, and enforces budget limits with intelligent override mechanisms. The validation system shall provide clear error messaging, budget increase workflows with approval routing, forecast calculations including active jobs, and complete audit logging of all budget-related decisions while enabling manager overrides with justification requirements for financial accountability.
  * Impact Weighting: Budget Control / Financial Planning / Risk Mitigation
  * Priority: High
  * User Stories: US1.2.2
  * User Journey: UJ1.3.2 (Setting Monthly Budget Limits), UJ2.4.2 (Budget Validation Before Start)
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
    - System queries monthly budget data on job configuration page load: SELECT monthly_budget_limit, SUM(actual_cost) FROM budget_config JOIN training_jobs WHERE DATE_TRUNC('month', created_at) = CURRENT_MONTH GROUP BY user_id
    - Remaining budget calculation: remaining_budget = monthly_budget_limit - month_to_date_actual_cost - SUM(estimated_cost_max WHERE status IN ('active', 'queued', 'provisioning'))
    - Real-time budget validation executes before "Start Training" button enables: IF estimated_cost_max > remaining_budget THEN block_job_creation = true
    - Budget exceeded error modal displays with structured information: "❌ Budget Exceeded - Estimated Cost: $75, Remaining Budget: $50, Shortfall: $25", action options: "Reduce Job Cost (adjust preset/configuration)", "Increase Budget Limit", "Cancel Job Creation"
    - Budget utilization warning displays at 80% threshold: "⚠ Budget Alert: You've used 80% of your monthly budget ($400 of $500). Remaining: $100 for this billing period (resets {next_month_date})."
    - Forecast calculation includes active jobs: active_jobs_estimated_remaining = SUM(estimated_cost_max - (actual_cost || 0)) WHERE status IN ('active', 'provisioning', 'queued'), projected_monthly_total = month_to_date_actual_cost + active_jobs_estimated_remaining + current_job_estimated_cost_max
    - Forecast display: "Projected Monthly Spend: $XXX (includes X active jobs + this job). Budget Limit: $YYY. Projected Overage: $ZZZ" - color coded: green if under budget, red if over
    - Budget increase workflow: Click "Increase Budget Limit" → Modal with form fields: "New Monthly Limit: $_____ (current: $500)", "Justification (required): _____ (min 50 characters)", "Effective Date: [This Month / Next Month]", "Approval Required: Yes (manager must approve via email)"
    - Manager approval notification: System sends email to user's manager with: budget increase request details, justification, current spend vs limit, projected spend, "Approve" and "Deny" action buttons (unique signed URLs)
    - Manager approval processing: Click approve → Update budget_config SET monthly_budget_limit = new_limit, approved_by = manager_id, approved_at = NOW() → Email requester: "Budget increase approved, new limit: $XXX effective immediately"
    - Budget override for managers: IF user_role IN ('manager', 'admin', 'owner') THEN display "Manager Override" button → Confirmation modal: "Proceed despite budget limit? This will exceed your monthly budget. Justification Required: _____" → Log override: INSERT INTO budget_overrides (user_id, job_id, override_amount, justification, approved_at)
    - Audit logging: All budget-related actions logged in `budget_audit_log` table with fields: action_type (validation_blocked, override_approved, limit_increased, warning_triggered), user_id, job_id, amount, justification, timestamp, ip_address
    - Budget dashboard link displayed in error message: "View detailed budget breakdown and history: [Budget Dashboard]"
    - Configuration adjustment suggestions: "💡 Cost Reduction Tips: Switch to Conservative preset (save $XX), Use Spot instead of On-Demand (save $YY), Reduce epochs from X to Y (save $ZZ)"
    - Soft warning at 90% budget utilization: "⚠ Critical Budget Alert: 90% of monthly budget used ($450 of $500). Only $50 remaining. Consider prioritizing essential training runs."
    - Budget reset notification: On first day of new billing period, display: "✓ Budget Reset: Your monthly training budget has been reset to $XXX. Last month's spend: $YYY."
    - Grace period handling: System allows up to 10% budget overage (configurable) without blocking: "⚠ Slight Overage: This job will exceed budget by 5% ($525 total vs $500 limit). Proceeding allowed as within 10% grace period."
    - Budget forecast accuracy tracking: System compares projected vs actual monthly spend, displays historical accuracy: "Budget forecasts have been within ±8% for past 6 months" - builds user confidence in estimates

- **FR1.3.1:** Add Job Metadata & Documentation
  * Description: System shall provide comprehensive metadata and documentation capabilities enabling users to assign descriptive names, add purpose descriptions, document experimental hypotheses and notes, apply searchable tags, associate jobs with client projects for cost attribution, and maintain complete documentation trails. The metadata system shall support auto-generation of intelligent default names, validation of input constraints, tag management with custom tag creation, and full-text search across all metadata fields to enable efficient job organization, knowledge sharing, and historical tracking.
  * Impact Weighting: Organization / Knowledge Sharing / Searchability
  * Priority: Medium
  * User Stories: US1.3.1
  * User Journey: UJ2.5.1 (Adding Job Documentation), UJ8.3.1 (Job Notes and Experiment Documentation)
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
    - Job name field displayed as required text input with character counter (0/100), validation enforces 3-100 character length, displays error "Job name must be between 3 and 100 characters" if invalid
    - Auto-population logic executes on configuration page load: job_name = "{training_file_name} - {preset_name} - {YYYY-MM-DD}" (e.g., "Elena Morales Financial - Balanced - 2025-12-16"), user can edit/override default name
    - Name uniqueness check: System queries existing job names for current user, displays warning (not error) if duplicate found: "⚠ Similar job name already exists. Consider adding version number or distinguishing details."
    - Description field rendered as textarea (max 500 characters) with counter display, placeholder text: "What is the purpose of this training run? (e.g., 'First production model for Acme client', 'Testing aggressive parameters on high-emotion dataset')", optional field allows empty submission
    - Notes field rendered as larger textarea (2000 character limit) with markdown formatting support (bold, italic, lists, code blocks), placeholder: "Document your hypothesis, experimental variables, expected outcomes, or configuration rationale. Use markdown for formatting.", auto-save draft notes to localStorage every 30 seconds to prevent data loss
    - Tags system: Multi-select dropdown populated with predefined tags from `job_tags` table: {experiment, production, client-delivery, test, poc, research, optimization, validation, baseline, iteration-1, iteration-2, high-priority, low-priority, approved, needs-review}
    - Tag selection: Click dropdown → Display checkbox list → Select multiple tags → Selected tags display as colored pills below dropdown with X icon to remove
    - Custom tag creation: Type new tag name in dropdown → If not found in existing tags → Display "Create new tag: '{tag_name}'" option → Click to add → New tag inserted into `job_tags` table and available for future jobs
    - Tag validation: Max 10 tags per job, tag names limited to 3-30 characters, lowercase alphanumeric + hyphen only (no spaces), displays error "Maximum 10 tags allowed" if limit exceeded
    - Client/Project assignment: Dropdown populated from `clients` and `projects` tables, displays hierarchical structure "Client: Acme Financial → Project: Q4 2025 Model Enhancement", optional selection enables cost attribution reporting
    - Client/Project autocomplete: Type to search client/project names, displays matching results with highlighting, "Create New Client/Project" option at bottom of dropdown if no match found
    - Metadata storage in `training_jobs` table: name (VARCHAR 100), description (TEXT 500), notes (TEXT 2000), tags (JSONB array), client_id (UUID FK nullable), project_id (UUID FK nullable), metadata_updated_at (TIMESTAMP)
    - Search functionality: Job history page includes search bar with placeholder "Search by name, description, notes, or tags", search executes as user types (debounced 500ms), performs full-text search across name, description, notes fields using PostgreSQL tsvector, tag search uses JSONB array containment operator
    - Search results highlighting: Matching text highlighted in yellow in search results, displays match context (50 characters before/after match), shows match count per job: "3 matches in notes"
    - Metadata display in job details page: Dedicated "Job Information" card showing: Name (editable inline), Description (editable), Notes (expandable/collapsible with markdown rendering), Tags (clickable pills linking to filtered job list), Client/Project (linked to project cost dashboard), Created By (user avatar + name), Created At, Last Updated
    - Metadata editing after job creation: "Edit Metadata" button opens modal with all fields pre-populated, allows updates to description, notes, tags, client/project (name cannot be changed if job started), saves changes with metadata_updated_at timestamp
    - Job comparison views include metadata: Side-by-side comparison shows each job's name, tags, description in header section, enables comparison filtering by shared tags
    - Export functionality: "Export Job Data" includes metadata in CSV/JSON export: all fields, tag array, client/project names
    - Analytics integration: System tracks most-used tags, common job naming patterns, documentation completeness percentage (jobs with description + notes / total jobs) - insights displayed in team dashboard
    - Template integration: When saving job as configuration template, metadata fields are optionally included: "Include job description as template description? [Yes/No]"
    - Notification mentions: When sharing job link, description is included in email/Slack notification: "Check out this training job: {name} - {description}"

- **FR1.3.2:** Review Configuration Before Start
  * Description: System shall implement a comprehensive pre-flight configuration review process presenting users with a full-screen confirmation modal displaying complete training configuration summary, cost breakdown, budget impact analysis, risk warnings, and interactive confirmation checklist before initiating GPU provisioning. The review interface shall consolidate all configuration decisions, validate prerequisites, enable last-minute adjustments, require explicit user acknowledgment of costs and risks, and provide clear cancellation options to prevent accidental or uninformed job initiation while building user confidence through transparent information disclosure.
  * Impact Weighting: Risk Mitigation / Cost Control / User Confidence
  * Priority: High
  * User Stories: US1.3.2
  * User Journey: UJ2.6.1 (Configuration Review), UJ2.6.2 (Pre-Start Confirmation)
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
    - "Review & Start Training" button displayed prominently at bottom of configuration form, styled as primary action button (large, blue, with icon), enabled only when all required configuration fields are valid (training file selected, preset chosen, GPU type selected, name entered)
    - Click button triggers full-screen modal overlay (dims background, prevents interaction with configuration form), modal cannot be closed by clicking outside (must use explicit Cancel or Start Training buttons)
    - Modal header displays: "Review Training Configuration - Final Check Before Starting" with warning icon, estimated total cost prominently shown in header: "Total Estimated Cost: $45-60"
    - **Configuration Summary Section** rendered as structured cards:
    - **Training Dataset Card**: Training file name (bold), Conversation count ("242 conversations, 1,567 training pairs"), Average quality scores with visual indicators ("Empathy: 4.5/5 ✓, Clarity: 4.3/5 ✓, Appropriateness: 4.6/5 ✓"), Scaffolding distribution preview ("10 personas, 8 emotional arcs, 6 topics"), Human review percentage ("15% human-reviewed"), File size and storage location
    - **Hyperparameters Card**: Preset name with badge (Conservative/Balanced/Aggressive with color coding), All technical parameters in readable format: "LoRA Rank (r): 16", "Learning Rate: 0.0002", "Training Epochs: 3", "Batch Size: 2", "Gradient Accumulation: 2 steps", "Target Modules: Query, Key, Value, Output projections", "LoRA Alpha: 32", "Dropout Rate: 0.1", Tooltip: "Hover over any parameter for explanation"
    - **GPU Configuration Card**: GPU type ("H100 PCIe 80GB"), Pricing tier with badge ("Spot Instance - Save 70%"), Hourly rate ("$2.49/hr"), Estimated interruption risk ("18% chance based on 30-day history"), Recovery guarantee ("Automatic checkpoint recovery <10 minutes"), Provisioning time estimate ("2-5 minutes to start")
    - **Cost Analysis Section**: Visual cost breakdown as horizontal bar chart showing: "GPU Compute: $XX.XX (YY hrs × $Z.ZZ/hr) [80% of total]", "Spot Interruption Buffer: $X.XX [5% of total]", "Storage & Transfer: $X.XX [2% of total]", Total estimate range: "$45.00 - $60.00 (±15% variance)", Confidence level: "88% of jobs finish within this range", Comparison to on-demand alternative: "Save $90 vs on-demand ($150)"
    - **Budget Impact Section**: Current monthly spend with progress bar ("$387 of $500 used - 77%"), This job cost (highlighted): "+$52 (estimated max)", Projected monthly total: "$439 total (88% of budget)", Remaining budget after this job: "$61 available", Visual indicator: green if <90% budget, yellow if 90-95%, red if >95%, Forecast: "Sufficient budget for 1-2 more jobs this month"
    - **Warnings Section** (conditionally displayed): High cost warning (if estimated_cost > 100): "⚠ High-Cost Training Run: This job will cost $XXX. Consider Conservative preset to reduce cost by 60%.", Aggressive parameters warning (if preset = aggressive): "⚠ Advanced Configuration: Aggressive parameters may take longer and cost more. Recommended only for complex datasets.", Low budget warning (if remaining_budget < estimated_cost_max × 1.5): "⚠ Limited Budget Remaining: This job will use most of your remaining monthly budget. Consider budgeting for potential overages.", Long duration warning (if estimated_duration > 20): "⚠ Extended Training Time: This job may take over 20 hours. Spot interruptions are more likely for long runs.", First-time user warning: "ℹ First Training Run: This is your first training job. Start with Conservative preset to gain familiarity with the platform."
    - **Confirmation Checklist**: Three mandatory checkboxes (must all be checked before "Start Training" button enables): "☐ I have reviewed the complete training configuration above and confirm all settings are correct", "☐ I understand the estimated cost ($45-60) and agree to proceed with charges within this range", "☐ I have obtained necessary budget approval (if required by my organization) and authorization to incur these costs", Checkbox validation: "Start Training" button remains disabled (grayed out) until all three checkboxes are checked
    - **Action Buttons**: "Start Training" button (prominent, green, initially disabled): Click triggers job start workflow (described below), "Edit Configuration" button (secondary styling): Closes modal and returns to configuration form with all settings preserved for editing, "Cancel" button (tertiary styling): Closes modal and returns to job list (does not create job in database)
    - **Job Start Workflow** (triggered by "Start Training" click): Insert training_job record with status='queued', Redirect to job details page (/training-jobs/{job_id}), Initiate async GPU provisioning: Call RunPod API to create pod with configuration, Update job status to 'provisioning', Display loading screen: "Provisioning GPU... Estimated time: 2-5 minutes", Stream provisioning status updates via webhook, On GPU ready: Update status to 'starting', launch training container, Send notification: "Training started for {job_name}"
    - **Job Record Creation**: training_jobs INSERT with fields: id (UUID), training_file_id (FK), name, description, notes, tags (JSONB), preset (VARCHAR), configuration (JSONB with all hyperparameters), gpu_pricing_tier, gpu_hourly_rate, estimated_duration_hours, estimated_cost_min, estimated_cost_max, status ('queued'), created_by (user_id), created_at (NOW()), Budget check: IF estimated_cost_max > remaining_monthly_budget AND NOT manager_override THEN ROLLBACK INSERT AND display error
    - Review modal accessibility: Keyboard navigation support (Tab through sections, Enter to check checkboxes, Escape to cancel), Screen reader announcements for all sections and warnings, High contrast mode support, Focus trap (Tab key cycles within modal, cannot Tab to background elements)
    - Analytics tracking: Log review modal views, time spent on review page (median should be 30-60 seconds), checkbox completion rates, edit button clicks (indicates configuration uncertainty), cancel vs start rates - insights used to improve configuration UX
    - Template support: If starting from saved template, display "Based on Template: {template_name}" with link to template details
    - Comparison to previous job: If user has completed similar jobs (same training file or preset), display: "Similar to your previous job: {job_name} - Final cost was $XX vs estimated $YY (difference: Z%)" - builds confidence in estimates
