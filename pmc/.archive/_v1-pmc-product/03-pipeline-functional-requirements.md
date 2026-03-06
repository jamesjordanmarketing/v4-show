# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/16/2025  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\01-pipeline-overview.md`
- User Stories: `pmc\product\02-pipeline-user-stories.md`

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

## 2. Training Job Execution & Monitoring

- **FR2.1.1:** Live Training Progress Dashboard
  * Description: System shall provide a comprehensive real-time training progress dashboard featuring live-updating progress indicators, interactive loss curve visualization with dual-axis charting, detailed metrics table with trend indicators, cost accumulation tracking, and automated refresh mechanisms. The dashboard shall fetch metrics via webhook-driven database updates or polling, render loading states gracefully, support data export, provide zoom/pan controls for detailed analysis, and maintain responsive performance with 60-second refresh intervals while displaying comprehensive training status information to eliminate user anxiety and enable informed monitoring decisions.
  * Impact Weighting: User Confidence / Transparency / Productivity
  * Priority: High
  * User Stories: US2.1.1
  * User Journey: UJ3.1.1 (Monitoring Live Training Progress), UJ3.1.2 (Understanding Training Metrics)
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
    - Dashboard page accessible at `/training-jobs/{job_id}`, loads within 2 seconds for jobs with <10K metric data points
    - **Progress Header Card** renders with structured layout: Overall progress bar (animated, color-coded: blue for active, green for completed, red for failed), Progress percentage (large font: "42% Complete"), Current step indicator ("Step 850 of 2,000"), Current stage badge ("Training" with animated pulse icon), Elapsed time ("6h 23m"), Estimated remaining ("8h 15m remaining, updates every 60s based on actual training speed"), Current epoch ("Epoch 2 of 3")
    - Progress percentage calculation: (current_step / total_steps) × 100, where total_steps = conversation_count × training_pairs_per_conversation × epochs
    - Elapsed time calculated: NOW() - job.started_at, formatted as "Xh Ym" or "Xd Yh" if >24 hours
    - Estimated remaining calculation: ((total_steps - current_step) × average_seconds_per_step) / 3600, where average_seconds_per_step = (NOW() - started_at).total_seconds() / current_step, updated every 60 seconds as actual speed observed
    - **Live Loss Curve Graph** implemented with Chart.js or Recharts: Dual y-axis line chart (training loss on left axis, validation loss on right axis), X-axis displays training step numbers with smart tick intervals (every 100 steps if <1000 total, every 500 if >5000), Training loss line: solid blue with data points, Validation loss line: dashed orange with data points, Grid lines: light gray, Tooltip on hover: "Step 850: Training Loss 0.342, Validation Loss 0.358", Legend with toggle buttons to show/hide series
    - Loss data fetched from `training_metrics_history` table: SELECT step, training_loss, validation_loss FROM training_metrics_history WHERE training_job_id = {job_id} ORDER BY step ASC, data cached in component state, new data appended on refresh
    - Zoom controls: Interactive zoom buttons (+/-) or pinch-to-zoom on mobile, Zoom in: focus on most recent 500 steps, Zoom out: show full training history, Reset zoom: display complete dataset, Pan controls: drag chart horizontally to view different time ranges
    - Export functionality: "Export Graph" button generates PNG image (2000×1200px) using canvas rendering, includes job name, timestamp, axis labels, embedded in download with filename: "{job_name}-loss-curve-{timestamp}.png"
    - **Current Metrics Table** renders as responsive data table: Two-column layout (metric name | current value with trend indicator), Metrics displayed: "Training Loss: 0.342 ↓ from 0.389 (-12.1%)", "Validation Loss: 0.358 ↓ from 0.412 (-13.1%)", "Learning Rate: 0.000182 (cosine schedule)", "GPU Utilization: 87%", "GPU Memory: 68GB / 80GB (85%)", "Perplexity: 1.43 (if calculated)", "Tokens/Second: 1,247", "Steps/Hour: 156"
    - Trend indicators: Calculate delta from previous metric value (stored in job record: latest_loss vs previous_loss), Display arrow: ↓ green if improving (loss decreasing), ↑ red if worsening (loss increasing), — gray if unchanged, Percentage change: "(±X.X%)"
    - Learning rate display: Current LR value from scheduler, Schedule type indicator: "(cosine schedule, warmup: 5%)"
    - GPU metrics: Utilization percentage from RunPod webhook, Memory usage: "{used_gb}GB / {total_gb}GB ({percentage}%)", Warning if utilization <50%: "⚠ Low GPU utilization, possible bottleneck"
    - **Cost Tracker Card**: Prominent card with large cost display, Layout: "Estimated Cost: $45-55" (top, gray), "Current Spend: $22.18" (large, bold, color-coded), "49% of estimate" (progress bar), Hourly rate: "$2.49/hr (spot)", Projected final cost: "$47.32" (based on current rate and estimated remaining time)
    - Cost calculation: current_spend = ((NOW() - started_at).total_hours + spot_interruption_recovery_time_hours) × gpu_hourly_rate, projected_final_cost = current_spend + (estimated_remaining_hours × gpu_hourly_rate)
    - Cost progress visualization: Horizontal progress bar showing current_spend vs estimated_cost_max, Color coding: green if <80% of estimate, yellow if 80-100%, red if >100%
    - Cost warning alerts: If current_spend > estimated_cost_max: "⚠ Cost Exceeding Estimate: Current $XX vs estimated $YY. Monitor closely or consider cancelling."
    - **Auto-Refresh Mechanism**: Polling approach: setInterval(() => fetchJobMetrics(), 60000), Fetches latest data from `/api/training/jobs/{job_id}/metrics?latest=true`, Updates all dashboard components with new data, Loading indicator: small spinner icon in header during fetch
    - Manual refresh button: Circular arrow icon in dashboard header, Click triggers immediate fetchJobMetrics(), Disabled during fetch (prevents duplicate requests), Toast notification: "Metrics updated" on successful refresh
    - Loading skeletons: During initial page load, display skeleton placeholders (gray animated rectangles) matching final layout: header card skeleton, graph skeleton (empty chart with axes), metrics table skeleton (4-5 rows), cost card skeleton - replaced with actual data once loaded
    - Websocket alternative (future enhancement): Real-time updates pushed from server via WebSocket connection, Eliminates polling delay, More efficient for multiple concurrent users, Falls back to polling if WebSocket unavailable
    - Error handling: If metrics fetch fails: Display last known data with timestamp "Last updated: 2 minutes ago", Retry button: "Retry Refresh", Error message: "Unable to fetch latest metrics. Check connection."
    - Responsiveness: Dashboard adapts to screen sizes: Desktop (>1024px): Side-by-side layout for graph + metrics, Tablet (768-1023px): Stacked layout, Mobile (<768px): Single column, collapsible sections
    - Performance optimization: Virtualization for metric history if >5000 data points, Graph re-renders only when new data available (memoization), Debounced resize handlers for responsive charts

- **FR2.1.2:** Training Stage Indicators
  * Description: System shall implement a visual stage progression indicator displaying the four sequential training phases (Preprocessing, Model Loading, Training, Finalization) with real-time status updates, duration estimates, completion indicators, and descriptive substatus messages. The stage indicator shall provide proportional progress visualization reflecting each stage's relative duration, animate transitions between stages, display elapsed time per stage, show pending/active/complete states with appropriate icons, and communicate current operations through detailed status messages to maintain user confidence and transparency throughout the training lifecycle.
  * Impact Weighting: User Experience / Transparency / Reduced Anxiety
  * Priority: Medium
  * User Stories: US2.1.2
  * User Journey: UJ3.1.3 (Understanding Training Stages), UJ3.1.4 (Stage Progress Tracking)
  * Tasks: [T-2.1.2]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - Stage indicator component renders as horizontal progress bar with four distinct sections, positioned prominently below progress header card on dashboard
    - **Stage Data Structure** stored in `training_jobs` table: current_stage (VARCHAR: preprocessing, model_loading, training, finalization, completed, failed), stage_started_at (TIMESTAMP), stage_progress_percentage (INTEGER 0-100), substatus_message (TEXT)
    - **Visual Layout**: Four connected segments in horizontal bar, Each segment labeled with stage name and icon (preprocessing: ⚙️, model_loading: 📦, training: 🔄, finalization: ✅), Visual connectors between stages (arrows or lines), Proportional width allocation: Preprocessing (5% of bar width), Model Loading (10%), Training (80%), Finalization (5%)
    - **Stage Status Rendering**: Pending stage: Gray background, dotted border, icon in gray, "Waiting..." text; Active stage: Blue animated gradient background, pulsing border, animated icon, current substatus message, elapsed time counter; Completed stage: Green solid background, checkmark icon, actual duration display "✓ 3m 42s"; Failed stage: Red background, error icon ❌, error message truncated with "View Details" link
    - **Stage 1: Preprocessing** operations and status messages: "Downloading training file from storage..." (0-20% of stage), "Parsing 242 conversations..." (20-40%), "Tokenizing text with Llama 3 tokenizer..." (40-70%), "Creating train/validation split (80/20)..." (70-90%), "Validating dataset format..." (90-100%), Estimated duration: 2-5 minutes (varies by conversation count), Stage complete when: Training file tokenized, split into train/val sets, validation passed
    - **Stage 2: Model Loading** operations and status messages: "Checking model cache..." (0-10% of stage), "Downloading Llama 3 70B from Hugging Face Hub..." (10-60%, only if not cached), "Loading model from cache..." (10-40%, if cached), "Applying 4-bit quantization (QLoRA)..." (60-80%), "Initializing LoRA adapters (rank={r})..." (80-95%), "Preparing training pipeline..." (95-100%), Estimated duration: 10-15 minutes first run, 3-5 minutes if model cached, Stage complete when: Model loaded in memory, LoRA adapters initialized, training ready to begin
    - **Stage 3: Training** operations and status messages: "Training epoch {current_epoch}/{total_epochs} - Step {current_step}/{total_steps}..." (primary message), "Loss: {training_loss:.4f} (↓ improving)" or "(↑ increasing)" or "(→ stable)", "Checkpoint saved at step {step}" (every 100 steps), "Running validation..." (after each epoch), "Epoch {epoch} complete - Avg loss: {avg_loss:.4f}" (end of epoch), Progress percentage: (current_step / total_steps) × 100, Estimated duration: 8-20 hours (preset and dataset dependent), Stage complete when: All epochs finished, final validation complete, training loop exited successfully
    - **Stage 4: Finalization** operations and status messages: "Saving LoRA adapters to storage..." (0-40% of stage), "Uploading adapter_model.bin ({size}MB)..." (40-60%), "Uploading adapter_config.json..." (60-70%), "Calculating final metrics..." (70-85%), "Generating training summary..." (85-95%), "Cleaning up temporary files..." (95-100%), Estimated duration: 5-10 minutes (adapter file size dependent), Stage complete when: All artifacts uploaded to Supabase Storage, metadata updated in database, job status set to 'completed'
    - **Progress Calculation per Stage**: Query `training_webhook_events` table for latest stage-specific events, Calculate stage_progress_percentage based on substatus message patterns, For Training stage specifically: (current_step / total_steps) × 100 from training_jobs.current_step, Update stage progress every time webhook received with new substatus
    - **Elapsed Time Display**: Calculate per-stage elapsed time: stage_elapsed = NOW() - stage_started_at, Format display: "2m 15s" if <60 min, "1h 23m" if <24 hours, "1d 5h" if >24 hours, Update every second using client-side timer (no server polling needed for elapsed time)
    - **Estimated Duration Display**: Show range based on historical data and configuration: "Est. 2-5 min" (preprocessing), "Est. 10-15 min" (model loading), "Est. 12-15 hrs" (training - calculated from preset), "Est. 5-10 min" (finalization), Tooltip explains: "Duration varies by dataset size, GPU availability, and model cache status"
    - **Stage Transition Animation**: When stage completes: Fade current stage from blue to green with checkmark, Trigger confetti or success animation (subtle), Display actual duration "✓ 12m 35s", Activate next stage (gray → blue with pulse), Send notification if user not actively viewing: "Training stage updated: Model loading complete, training started"
    - **Error State Handling**: If stage fails: Mark stage as failed (red background, ❌ icon), Display error type in stage: "Failed: Out of Memory", Stop progression (subsequent stages remain gray/pending), Show "View Error Details" button linking to full error log, Option to "Retry from This Stage" or "Restart Job"
    - **Checkpoint Recovery Indicator**: During Training stage, if spot interruption occurs: Brief red flash "⚠ Interrupted", Stage updates to "Recovering from checkpoint...", Mini progress bar shows recovery progress (0-100% of recovery), On successful recovery: "✓ Resumed from step {step}", Continue normal training display
    - **Stage History Log**: Clickable stage segments reveal detailed log: "Preprocessing completed in 3m 42s", "Model loading completed in 11m 18s (model cache hit)", "Training in progress: 6h 23m elapsed...", "Finalization pending...", Each log entry timestamped, expandable to show substatus messages
    - **Responsive Design**: Desktop (>768px): Horizontal bar with all four stages visible, full text labels, stage details below bar; Mobile (<768px): Vertical stepper layout, current stage expanded with details, completed/pending stages collapsed with just icon and name; Tablet (768-1023px): Horizontal bar with abbreviated labels, stage details in popover
    - **Accessibility**: Each stage segment has ARIA label: "Stage 1 of 4: Preprocessing - Completed in 3 minutes 42 seconds", Current stage announced: "Current stage: Training, 42% complete", Screen reader updates when stage transitions: "Training stage completed, finalizing model...", Keyboard navigation: Tab through stages, Enter/Space to view details
    - **Performance**: Stage indicator updates only when stage status changes (not every 60s like metrics), Lightweight component, no heavy rendering, Animations use CSS transforms (GPU-accelerated), Total component re-renders: ~4-5 per job (once per stage + completion)

- **FR2.1.3:** Webhook Event Log
  * Description: System shall provide a comprehensive chronological event log displaying all webhook events received from the GPU training container, including status changes, metrics updates, warnings, and errors with color-coded categorization, expandable JSON payloads, filtering capabilities, keyword search, real-time updates, pagination, and export functionality. The event log shall serve as the authoritative audit trail for training progression, enable detailed troubleshooting by exposing raw webhook data, support post-mortem analysis through export capabilities, and maintain complete event history throughout the job lifecycle for debugging and support purposes.
  * Impact Weighting: Debugging / Troubleshooting / Support Reduction
  * Priority: Medium
  * User Stories: US2.1.3
  * User Journey: UJ3.2.1 (Accessing Detailed Event Logs), UJ3.2.2 (Troubleshooting with Event Data)
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
    - Event Log accessible via tab navigation on job details page: "Overview | Metrics | Event Log | Artifacts", tab persists selection in URL query parameter: `/training-jobs/{job_id}?tab=event-log`
    - Events loaded from `training_webhook_events` table: SELECT id, event_type, event_payload, received_at FROM training_webhook_events WHERE training_job_id = {job_id} ORDER BY received_at DESC LIMIT 50 OFFSET {page * 50}
    - **Table Layout**: Responsive data table with fixed header, Four columns: Timestamp (150px), Event Type (120px), Message (flexible width), Actions (80px - expand button), Alternate row background colors for readability (white/light gray), Hover effect on rows (slight blue tint)
    - **Timestamp Column**: Format: "YYYY-MM-DD HH:mm:ss" (24-hour format), Timezone: User's local timezone with UTC offset indicator "(UTC-8)", Relative time on hover tooltip: "3 hours ago", Sortable: Click column header to toggle ASC/DESC order (default DESC - newest first)
    - **Event Type Column**: Badge-style display with color coding: "Status" (blue bg, white text), "Metrics" (green bg, white text), "Warning" (yellow bg, dark text), "Error" (red bg, white text), "Info" (gray bg, white text), "Checkpoint" (purple bg, white text), Icon prefix: appropriate icon for each type (ℹ️ Status, 📊 Metrics, ⚠️ Warning, ❌ Error, 💾 Checkpoint)
    - **Message Column**: Extracted from event_payload.message or generated summary: Status events: "{old_status} → {new_status}" (e.g., "preprocessing → training"), Metrics events: "Step {step}: loss={loss:.4f}, lr={lr:.6f}, gpu_util={util}%", Checkpoint events: "Checkpoint saved at step {step} ({size}MB uploaded)", Warning events: "{warning_message}" (e.g., "GPU utilization dropped to 45%"), Error events: "{error_type}: {error_message}" (truncated to 100 chars with "..." if longer)
    - **Expandable Row Details**: Click anywhere on row (or dedicated expand icon) to reveal full webhook payload, Expanded section slides down below row with smooth animation, Displays formatted JSON with syntax highlighting: Keys in blue, Strings in green, Numbers in orange, Booleans in purple, null in gray, Copy button: "Copy JSON" copies full payload to clipboard with success toast, Collapse button: Click again to hide expanded section
    - **Event Type Filtering**: Dropdown/checkbox filter above table: "Show: [All Events ▼]", Options: All Events (default), Status Changes Only, Metrics Updates Only, Warnings Only, Errors Only, Checkpoints Only, Multiple selection allowed (e.g., "Warnings + Errors"), Filter applies immediately, updates table without page reload, URL updated with filter state: `?tab=event-log&filter=warnings,errors`
    - **Keyword Search**: Search input box above table: placeholder "Search events by message or payload...", Debounced search (500ms delay after user stops typing), Searches across: event_payload.message, event_payload (full JSON as text), event_type, Case-insensitive matching, Highlights matching keywords in results (yellow background), Displays match count: "Found 23 events matching 'checkpoint'"
    - **Real-Time Updates**: Polling mechanism: Every 10 seconds, fetch new events: SELECT * FROM training_webhook_events WHERE training_job_id = {job_id} AND received_at > {last_loaded_timestamp}, Prepend new events to top of table (newest first), Visual indicator: Brief blue pulse animation on newly added rows, Badge notification: "5 new events" appears in tab label if user viewing different tab, Auto-scroll to top when new critical events (errors/warnings) arrive
    - **Pagination**: Display 50 events per page (configurable: 25/50/100 options), Pagination controls at bottom: "< Previous | Page X of Y | Next >", Current page highlighted, numbered page links for nearby pages: "< 1 2 [3] 4 5 ... 42 >", Total event count displayed: "Showing 101-150 of 2,847 events", Keyboard shortcuts: Arrow keys to navigate pages
    - **Export Functionality**: "Export Log" button above table opens export options modal: JSON format: Downloads complete event array as `{job_name}-event-log-{timestamp}.json`, CSV format: Downloads table with columns: timestamp, event_type, message, full_payload (JSON string), filtered_export option: "Export current filtered view only" (default: export all events), date_range selection: "Export events from: [date picker] to [date picker]", Download triggers immediate file download, no server-side generation delay
    - **Example Event Payloads** stored in database: Status change: `{event_type: "status_change", old_status: "preprocessing", new_status: "training", timestamp: "2025-12-15T14:23:42Z", gpu_id: "abc123"}`, Metrics update: `{event_type: "metrics_update", step: 100, epoch: 1, training_loss: 0.521, validation_loss: 0.538, learning_rate: 0.0002, gpu_utilization: 89, gpu_memory_used_gb: 68, tokens_per_second: 1247}`, Checkpoint: `{event_type: "checkpoint_saved", step: 500, checkpoint_path: "s3://bucket/job_id/checkpoint-500.pt", file_size_mb: 437, upload_duration_seconds: 42}`, Warning: `{event_type: "warning", warning_type: "low_gpu_utilization", message: "GPU utilization dropped to 45% (possible throttling)", gpu_utilization: 45, timestamp: "..."}`, Error: `{event_type: "error", error_type: "OutOfMemoryError", message: "CUDA out of memory. Tried to allocate 2.00 GiB...", stack_trace: "...", step: 150}`
    - **Performance Optimization**: Virtualized scrolling if >500 events (render only visible rows), Indexed database query: CREATE INDEX idx_webhook_events_job_time ON training_webhook_events (training_job_id, received_at DESC), Event payload stored as JSONB for efficient querying, Lazy loading: Expanded payloads load on-demand (not preloaded for all rows)
    - **Error Handling**: If events fail to load: Display error state: "Unable to load event log. [Retry]", Retry button attempts to reload, Last successfully loaded events remain visible
    - **Accessibility**: Table navigable via keyboard (Tab to move between rows, Enter to expand), Screen reader announces: "Event log table with X events. Use arrow keys to navigate.", ARIA labels for all interactive elements, High contrast mode support for color-coded event types
    - **Advanced Features**: Event log comparison: Select multiple jobs, compare event sequences side-by-side to identify pattern differences, Event timeline visualization: Vertical timeline view showing events as nodes on time axis, Duration indicators showing time gaps between events, Critical event highlighting: Errors and warnings pinned to top of timeline

- **FR2.2.1:** Cancel Active Training Job
  * Description: System shall provide comprehensive job cancellation functionality enabling users to immediately terminate active training jobs through a confirmation workflow that displays current progress, cost spent, and requires explicit acknowledgment of irreversibility. The cancellation system shall communicate with RunPod API to terminate GPU instances within 60 seconds, calculate final costs based on elapsed time, update job status to 'cancelled', preserve partial training artifacts and metrics for analysis, send notifications, maintain complete audit trail of cancellation reasons, and prevent accidental terminations through multi-step confirmation while enabling rapid cost control when needed.
  * Impact Weighting: Cost Control / Risk Mitigation / User Control
  * Priority: High
  * User Stories: US2.2.1
  * User Journey: UJ3.3.1 (Cancelling Training Jobs), UJ3.3.2 (Understanding Cancellation Impact)
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
    - "Cancel Job" button displayed prominently on job dashboard header, positioned near job name, styled with destructive appearance (red background, white text, warning icon), button label: "Cancel Training", disabled if job status not IN ('provisioning', 'preprocessing', 'model_loading', 'training', 'queued')
    - Click "Cancel Job" triggers confirmation modal with full-screen overlay, modal cannot be dismissed by clicking outside (must use explicit Cancel or Confirm buttons), modal renders within 200ms of button click
    - **Confirmation Modal Header**: Warning icon (⚠️) and title: "Cancel Training Job?", Danger indicator: Red border at top of modal, Subtitle: "This action cannot be undone. Training progress will be lost."
    - **Current Status Display Section**: Job name and ID displayed, Current progress visualization: Progress bar showing "42% Complete (Step 850 of 2,000)", Current stage badge: "Training - Epoch 2 of 3", Elapsed time: "6h 23m" (formatted: hours and minutes), Cost spent: "$22.18" (large, bold font), Last checkpoint: "Step 800 (50 steps ago)" if checkpoint exists
    - **Impact Analysis Section**: "What will happen:": Bulleted list: "✗ Training will stop immediately at current step (no completion)", "✗ GPU instance will be terminated within 60 seconds", "✓ Partial progress and metrics will be saved for review", "✗ This job cannot be resumed - you must start a new job to continue", "💰 Final cost will be: $22.18 based on 6h 23m elapsed time"
    - **Cancellation Reason Selection**: Dropdown menu labeled "Why are you cancelling?", Options: "Loss not decreasing / Training not improving", "Cost too high / Over budget", "Wrong configuration / Need to adjust settings", "Testing / Learning / Mistake", "Better results from another job", "Client request / Project cancelled", "Other reason (please specify)", Required field - cannot proceed without selection, Selected reason stored in job record for analytics
    - **Optional Notes Field**: Textarea labeled "Additional details (optional)": Placeholder: "Provide additional context about why you're cancelling this job...", Character limit: 500, Not required, Stored in cancellation_notes field for future reference
    - **Confirmation Checkbox**: Explicit acknowledgment checkbox (must be checked to enable Confirm button): "☐ I understand this action cannot be undone and the GPU instance will be terminated immediately", Checkbox label styled with warning color, Must be checked before "Confirm Cancellation" button enables
    - **Modal Action Buttons**: "Confirm Cancellation" button: Primary destructive action (red background), Disabled until: reason selected AND checkbox checked, Click triggers cancellation workflow (described below); "Go Back" button: Secondary action (gray background), Closes modal, returns to job dashboard, no changes made; Keyboard shortcuts: Escape key = Go Back, Cannot use Enter to confirm (prevents accidental cancellation)
    - **Cancellation Workflow Execution**: UPDATE training_jobs SET status = 'cancelling', cancellation_requested_at = NOW(), cancellation_reason = {selected_reason}, cancellation_notes = {notes}, cancelled_by = {current_user_id} WHERE id = {job_id}; Call RunPod API: POST /v2/pods/{runpod_pod_id}/terminate with immediate termination flag; Monitor termination status: Poll RunPod API every 5 seconds for up to 60 seconds until pod status = 'terminated'; Calculate final cost: final_cost = ((NOW() - started_at).total_hours + spot_interruption_time_hours) × gpu_hourly_rate; UPDATE training_jobs SET status = 'cancelled', completed_at = NOW(), actual_cost = {final_cost}, actual_duration_minutes = {elapsed_minutes}; Generate final metrics snapshot: Save last known training_loss, validation_loss, current_step, current_epoch, total_steps_completed; Insert audit log: INSERT INTO training_job_audit_log (job_id, action, reason, notes, user_id, timestamp)
    - **Termination Timeout Handling**: If GPU instance not terminated within 60 seconds: Display warning: "GPU termination taking longer than expected. Continuing to monitor...", Continue polling for up to 5 minutes, If still not terminated after 5 minutes: Send alert to operations team, Job still marked as cancelled, User notified: "Job cancelled but GPU cleanup pending. No additional charges will be incurred."
    - **Success Notification**: Toast notification appears: "✓ Training Job Cancelled - Final cost: $22.18. GPU instance terminated.", Email notification sent: Subject: "Training Job Cancelled: {job_name}", Body includes: job name, cancellation time, final cost, elapsed duration, reason for cancellation, link to view partial results, Slack notification (if configured): "Training cancelled: {job_name} by {user_name}. Reason: {reason}. Cost: $22.18."
    - **Post-Cancellation State**: Job details page remains accessible with status badge: "Cancelled", All partial data preserved and viewable: Loss curves up to cancellation point, Metrics history up to last recorded step, Event log showing full history including cancellation event, Stage indicator showing which stage was active when cancelled; "Cancel Job" button replaced with status indicator: "Job Cancelled on {date} at {time} by {user_name}"; Download artifacts section: Shows available partial artifacts (checkpoints if any exist), "Download Last Checkpoint" button if checkpoint saved within 100 steps of cancellation
    - **Job History Display**: Cancelled jobs appear in job list with "Cancelled" status badge (orange background), Hover tooltip shows: "Cancelled by {user_name} on {date}. Reason: {reason}", Filter option: "Show Cancelled Jobs" checkbox in job list filters, Sort priority: Cancelled jobs sorted by cancellation date (most recent first) when filtered
    - **Prevention of Resume**: Cancelled jobs cannot be resumed: No "Resume Training" button displayed, Attempting to start new job with same configuration shows warning: "Previous job was cancelled. This will start a completely new training run.", If user wants to continue from checkpoint: Must create new job, manually configure to load from specific checkpoint (advanced feature), System warns: "Resuming from checkpoint of cancelled job may produce unexpected results"
    - **Analytics Tracking**: System tracks cancellation metrics: Cancellation rate: (cancelled_jobs / total_jobs) per user, per team; Common cancellation reasons aggregated: Identify patterns (e.g., "50% cancelled due to cost concerns"); Average time to cancellation: How long into training do users typically cancel; Cost saved through cancellation: Sum of (estimated_remaining_cost) for all cancelled jobs; Insights used to: Improve cost estimates, Refine hyperparameter presets, Enhance user training/onboarding
    - **Cancellation During Different Stages**: Provisioning/Preprocessing: Cancellation stops pod creation, no GPU charged; Model Loading: Terminates pod immediately, minimal cost (typically <$1); Training: Saves checkpoint if <100 steps since last save, terminates GPU, charges for elapsed time; Finalization: Rare, but allows cancellation before artifacts uploaded, partial artifacts may be saved
    - **Batch Cancellation Feature** (future enhancement): Select multiple active jobs from job list, "Cancel Selected Jobs" button, Confirmation modal shows total impact: "Cancel X jobs? Total cost spent: $YYY. All jobs will be terminated.", Bulk cancellation executes sequentially with progress indicator

- **FR2.2.2:** Pause and Resume Training (Future Enhancement)
  * Description: System shall implement comprehensive pause/resume functionality enabling users to temporarily suspend active training jobs by saving immediate checkpoints, terminating GPU instances to eliminate costs, and later resuming from exact training state by provisioning new GPUs and loading checkpoints. The pause/resume system shall track paused durations separately from training time, support GPU type switching on resume (spot to on-demand or vice versa), maintain training state fidelity through robust checkpoint management, calculate costs accurately excluding paused periods, and enable strategic cost optimization by pausing during peak pricing hours and resuming during off-peak periods while preserving complete training continuity.
  * Impact Weighting: Cost Optimization / Flexibility
  * Priority: Low (Future Enhancement)
  * User Stories: US2.2.2
  * User Journey: UJ3.4.1 (Pausing Training), UJ3.4.2 (Resuming Training)
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
    - "Pause Job" button displayed next to "Cancel Job" on dashboard header, styled with warning appearance (yellow/orange background), label: "Pause Training", icon: ⏸️, enabled only for jobs with status IN ('training'), disabled during preprocessing/model_loading stages (checkpoint not yet available), tooltip explains: "Temporarily stop training and terminate GPU. Resume later from current progress."
    - **Pause Confirmation Modal**: Title: "Pause Training Job?", Description: "Training will stop at current step, checkpoint will be saved, and GPU will be terminated to avoid costs.", Display current state: "Current Progress: Step {step} of {total} ({percentage}%)", "Checkpoint will be saved at: Step {current_step}", "Elapsed training time: {hours}h {minutes}m", "Current cost: ${cost}", Information section: "✓ Training progress will be saved", "✓ You can resume later from this exact point", "✓ GPU costs stop when paused", "ℹ️ Resume may take 5-10 minutes (GPU provisioning + checkpoint loading)", Confirmation button: "Pause Training", Cancel button: "Continue Training"
    - **Pause Execution Workflow**: Send webhook to GPU container: POST /pause with instruction to save checkpoint immediately; Container saves checkpoint: Training state: model weights, optimizer state, scheduler state, random seeds; Metadata: current_step, current_epoch, training_loss, validation_loss, configuration parameters; Upload checkpoint to Supabase Storage: `{job_id}/pause-checkpoint-step-{step}.pt`; Checkpoint upload confirmation received; Call RunPod API: POST /v2/pods/{pod_id}/terminate; UPDATE training_jobs SET status = 'paused', paused_at = NOW(), pause_checkpoint_path = '{checkpoint_path}', pause_checkpoint_step = {current_step}; INSERT pause_resume_log (job_id, action = 'paused', checkpoint_step, timestamp, reason = 'user_requested')
    - **Paused Job State**: Job details page displays "Paused" status badge (yellow/orange), Pause information card shows: "Training paused at step {step} on {date} at {time}", "Elapsed training time: {hours}h {minutes}m (excluding paused time)", "Cost so far: ${cost}", "Checkpoint saved: {checkpoint_size}MB", "Resume Training" button (prominent, blue, ▶️ icon), Button enabled when: Checkpoint confirmed in storage, No other active jobs if user has concurrent job limit, User budget allows estimated remaining cost
    - **Resume Job Button**: Click opens "Resume Training" configuration modal, Modal displays: "Resume from: Step {step} ({percentage}% complete)", "Estimated remaining: {steps} steps, {hours}h", "Previous configuration:" (shows original preset, GPU type, hyperparameters), Options to modify: GPU type: "Resume with [Spot ▼] or [On-Demand]" (allows switching), Keep other hyperparameters: Cannot change r, lr, epochs (model architecture must match), Estimated additional cost: "${cost_estimate}", Warnings if applicable: "⚠️ {remaining_hours}h remaining may exceed daily GPU availability", "⚠️ Spot instance may be interrupted again (consider on-demand for long remainder)"
    - **Resume Execution Workflow**: Create new job record linked to original: INSERT training_jobs_continuation (original_job_id, continuation_job_id, resumed_from_step, resumed_at); Provision GPU: Call RunPod API with same configuration (or updated GPU type); Download checkpoint: Container downloads from Supabase Storage `{original_job_id}/pause-checkpoint-step-{step}.pt`; Restore training state: Load model weights, optimizer state, scheduler state, random seeds; Validate checkpoint integrity: Verify step number, epoch, configuration match; UPDATE training_jobs SET status = 'training', resumed_at = NOW(), resumed_from_checkpoint = {checkpoint_path}; INSERT pause_resume_log (job_id, action = 'resumed', checkpoint_step, timestamp); Send webhook: Resume confirmed, training continuing from step {step}
    - **Checkpoint Management**: Pause checkpoints stored separately from regular training checkpoints (every 100 steps), Pause checkpoints retained for 30 days (configurable), Multiple pause/resume cycles supported: Can pause and resume multiple times, Each pause creates new checkpoint, Resume always uses most recent pause checkpoint, Old pause checkpoints auto-deleted after successful resume
    - **Cost Tracking with Pauses**: Separate tracking: active_training_duration_minutes: SUM(time between start/resume and pause/complete), paused_duration_minutes: SUM(time between pause and resume), total_elapsed_duration_minutes: active_training_duration + paused_duration; Cost calculation: actual_cost = (active_training_duration_minutes / 60) × gpu_hourly_rate; Cost display on dashboard: "Active Training Time: 6h 23m", "Paused Time: 2h 15m", "Total Elapsed: 8h 38m", "Cost: $22.18 (based on active time only)"
    - **Use Case: Peak Hour Avoidance**: User monitors GPU pricing (future feature: display real-time spot instance pricing), Identifies peak hours: 9 AM - 5 PM PST = higher spot interruption risk, Strategy: Start training at 5 PM (off-peak), Pause at 8:59 AM (before peak), Resume at 5:01 PM (after peak), Cost savings: Avoid peak-hour interruptions, Lower spot rates during off-peak; System suggests optimal pause times: "💡 Suggestion: Pause training during peak hours (9 AM - 5 PM) to reduce spot interruption risk by 60%"
    - **Multi-Pause Tracking**: Job details show pause/resume history: Timeline visualization: "Started: 5:00 PM", "Paused: 9:00 AM (4h active)", "Resumed: 5:00 PM (8h paused)", "Paused: 9:00 AM (8h active)", "Resumed: 5:00 PM (8h paused)", "Completed: 7:30 PM (2.5h active)", Total: "14.5h active training, 16h paused, 30.5h elapsed"
    - **Pause/Resume Analytics**: System tracks: Pause frequency: How often users pause jobs, Average pause duration: Typical pause length, Resume success rate: Percentage of paused jobs successfully resumed, Cost savings from pausing: Estimated savings vs continuous training, Peak hour avoidance rate: Percentage of training during off-peak hours; Insights inform: Recommendations for optimal pause times, Automated pause scheduling (future: "Auto-pause during peak hours?")
    - **Limitations and Constraints**: Cannot pause during: Preprocessing (no checkpoint available yet), Model loading (model not fully initialized), Finalization (almost complete, cancellation more appropriate); Pause checkpoint size: ~400-500MB (same as regular checkpoint), large for frequent pausing; Checkpoint expiration: Paused jobs must be resumed within 30 days or checkpoint deleted; Resume time overhead: 5-10 minutes for GPU provisioning + checkpoint download, not instant; Model loading during resume: May take 10-15 minutes if model not cached on new GPU instance
    - **Future Enhancements**: Scheduled pause/resume: "Pause every day at 9 AM, resume at 5 PM", Automatic spot-to-on-demand migration: If spot interruption rate >3 during training, auto-switch to on-demand on resume, Pause cost savings calculator: Show projected savings from strategic pausing vs continuous training, Multi-job pause: Pause all active jobs simultaneously if budget threshold reached, Pause reasons tracking: Ask user "Why pausing?" (budget, time, priority) for analytics

- **FR2.3.1:** View All Training Jobs
  * Description: System shall provide a comprehensive training jobs list view with advanced filtering, multi-column sorting, keyword search, status-based color coding, bulk action capabilities, pagination controls, and CSV export functionality. The jobs list shall serve as the primary navigation interface for accessing job details, enable efficient job management through bulk operations, support team coordination through creator attribution and filtering, facilitate budget oversight through cost display and filtering, and provide complete organizational oversight of all training activities with responsive design for desktop and mobile access.
  * Impact Weighting: Team Coordination / Oversight / Organization
  * Priority: High
  * User Stories: US2.3.1
  * User Journey: UJ3.5.1 (Browsing Training Jobs), UJ3.5.2 (Filtering and Searching Jobs)
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
    - Page accessible at `/dashboard/training-jobs`, loads within 3 seconds for <1000 jobs, database query optimized with indexes on status, created_at, created_by
    - **Table Layout**: Responsive data table with fixed header, sticky column headers on scroll, alternate row colors (white/light gray) for readability, hover effect on rows (subtle blue highlight), 8 columns displayed: [Checkbox] | Job Name | Status | Configuration | Created By | Started At | Duration | Cost | [Actions menu]
    - **Job Name Column** (min-width: 250px): Displays job name as clickable link to job details page, Truncates long names with ellipsis, full name on hover tooltip, Shows associated tags as small colored pills below name (max 3 visible, "+X more" if >3), Job ID displayed in smaller gray text below name: "ID: abc123...", Click anywhere in row (except actions) navigates to job details
    - **Status Column** (width: 120px): Badge-style status indicator color-coded: "Queued" (gray bg, dark text, ⏳ icon), "Provisioning" (light blue bg, blue text, ⚙️ icon), "Preprocessing" (light blue, 🔄), "Training" (blue, animated pulse, 🏃), "Completed" (green, ✓ icon), "Failed" (red, ❌ icon), "Cancelled" (orange, ⏹️ icon), "Paused" (yellow, ⏸️ icon); Tooltip on hover shows: detailed status message, last updated timestamp, For Training status: shows current progress "Step 850/2000 (42%)"
    - **Configuration Column** (width: 180px): Displays preset badge: "Conservative" (green), "Balanced" (blue), "Aggressive" (purple), GPU type indicator: "Spot H100" or "On-Demand H100" with icon, Key hyperparameters summary on hover tooltip: "Rank: 16, LR: 0.0002, Epochs: 3, Batch: 2", Training file name (truncated): "Elena Morales..." with full name on hover
    - **Created By Column** (width: 150px): User avatar (small, 32px) + name, Hover shows: user email, user role, Format: "John Smith" or "You" if current user, Link to user profile (future feature)
    - **Started At Column** (width: 150px): Timestamp display: "YYYY-MM-DD HH:mm" in user's timezone, Relative time on hover: "3 hours ago", Sort icon in header (default sort: newest first), Shows "Not started yet" for queued jobs, Shows creation timestamp for non-started jobs
    - **Duration Column** (width: 120px): For active jobs: elapsed time "6h 23m" with animated clock icon, For completed jobs: total duration "12h 45m", For failed/cancelled: "Stopped at 6h 23m", For queued: estimated duration "Est. 12-15h", Tooltip shows: start time, completion/stop time, For paused jobs: "Active: 6h 23m, Paused: 2h 15m"
    - **Cost Column** (width: 100px): Displays cost with $ symbol, For active jobs: "Current: $22.18" with real-time updates (every 60s), For completed: "Total: $48.32", For failed/cancelled: "Spent: $22.18", Color coding: green if <$50, yellow if $50-$100, red if >$100, Tooltip shows: hourly rate, estimated vs actual comparison for completed jobs, Cost breakdown: GPU + interruptions + storage
    - **Actions Column** (width: 80px): Three-dot menu button (⋮) opens dropdown with context-aware actions: For queued jobs: "Start Now", "Edit Configuration", "Delete"; For active jobs: "View Dashboard", "Cancel Job", "Pause Job" (if available); For completed jobs: "View Results", "Download Artifacts", "Retry", "Compare", "Delete"; For failed jobs: "View Error Log", "Retry with Suggestions", "Delete"; For cancelled jobs: "View Partial Results", "Clone Configuration", "Delete"
    - **Filtering System**: Filter panel above table with collapsible sections, "Filters" button (with count badge if filters active "Filters (3)"), **Status Filter**: Checkbox list: "All (default)", "Active (Queued + Provisioning + Training)", "Completed", "Failed", "Cancelled", "Paused", Multiple selection allowed, Status count displayed: "Completed (47)", Real-time count updates as filters change
    - **Created By Filter**: Dropdown with user list: "All Users", "Me" (current user), "[User 1]", "[User 2]", ..., Searchable dropdown (type to filter users), Avatar + name displayed, Shows job count per user: "John Smith (23 jobs)"
    - **Date Range Filter**: Quick select buttons: "Last 7 days", "Last 30 days", "Last 90 days", "Custom range", Custom range: Date pickers for start and end dates, Calendar popup interface, Default: Last 30 days, Clear button: "Show all dates"
    - **Configuration Preset Filter**: Checkbox list: "All Presets", "Conservative", "Balanced", "Aggressive", "Custom" (if any custom config jobs exist), Count per preset: "Balanced (34)"
    - **Cost Range Filter**: Checkbox list: "All Costs", "<$50", "$50-$100", "$100-$200", ">$200", Multiple selection creates OR logic, Total cost in range displayed: "23 jobs, $1,247 total"
    - **GPU Type Filter**: Checkbox list: "All GPU Types", "Spot Instances", "On-Demand Instances", Shows count and percentage: "Spot (87, 76%)"
    - **Filter Application**: Filters apply immediately on selection (no "Apply" button needed), Loading indicator while query executes, URL parameters updated to reflect filters: `?status=completed&preset=balanced&dateRange=30d`, Filter state preserved across page reloads, "Clear All Filters" button resets to defaults
    - **Search Functionality**: Search box prominently placed, placeholder: "Search by job name, notes, or tags...", Debounced search (500ms delay after typing stops), Searches across: job name, description, notes, tags array, Full-text search using PostgreSQL tsvector, Highlights matching text in results (yellow background), Search query persists in URL: `?search=elena+financial`, "X" button to clear search
    - **Sorting**: Click column headers to sort (toggle ASC/DESC), Default sort: Created date DESC (newest first), Sort indicator arrows: ▲ (ASC) ▼ (DESC) in column header, Multi-column sort (future): Hold Shift + click multiple headers, Sorted column highlighted with light blue background, Sort state in URL: `?sortBy=cost&sortDir=desc`
    - **Pagination**: Controls at bottom of table: "< Previous | Page 3 of 12 | Next >", Page size selector: "Show [25 ▼] jobs per page" options: 25, 50, 100, Total count displayed: "Showing 51-75 of 287 jobs", First/Last page buttons: "« First" "Last »", Keyboard navigation: Arrow keys to navigate pages, Page number in URL: `?page=3&pageSize=50`, "Go to page" input: Type page number, press Enter
    - **Bulk Actions**: Checkbox in each row for selection, "Select All" checkbox in header selects all visible rows (current page), Bulk action bar appears when ≥1 row selected: "X jobs selected | [Actions ▼] | Clear Selection", Actions dropdown: "Cancel Selected" (only for active jobs), "Delete Selected" (only for completed/failed/cancelled), "Export Selected", "Compare Selected" (max 4 jobs), Confirmation modal before destructive actions: "Delete 5 jobs? This cannot be undone.", Bulk action progress: "Deleting 5 jobs... 3 of 5 complete"
    - **Export to CSV**: "Export" button above table opens export options, Export current view: exports filtered/searched results only, Export all jobs: exports complete dataset (up to 10K jobs), CSV columns: Job ID, Name, Status, Preset, GPU Type, Created By, Created At, Started At, Completed At, Duration (minutes), Cost ($), Tags (comma-separated), Filename: `training-jobs-export-{timestamp}.csv`, Download starts immediately, no server-side generation delay, Progress indicator for large exports
    - **Row Click Navigation**: Click anywhere on row (except checkbox, actions menu, links) navigates to: `/training-jobs/{job_id}`, Middle-click or Ctrl+click opens in new tab, Right-click shows context menu: "Open", "Open in New Tab", "Copy Job ID", "Copy Job Link"
    - **Empty States**: No jobs found: "No training jobs yet. [Create Your First Training Job]" button, Filters applied but no results: "No jobs match your filters. [Clear Filters]", Search no results: "No jobs found matching '{query}'. Try different search terms."
    - **Loading States**: Initial page load: Skeleton table with placeholder rows (10 rows), Filter/search/sort loading: Dimmed table with spinner overlay, Preserves last loaded data during background updates
    - **Real-time Updates**: Active jobs update their status/progress every 60 seconds, Polling mechanism: Fetches latest status for all visible active jobs, Visual indicator when data refreshes: Brief blue pulse on updated rows, New jobs appear at top automatically (if on first page, no filters)
    - **Responsive Design**: Desktop (>1024px): Full 8-column table layout; Tablet (768-1023px): Hide Configuration and Duration columns, show in expandable row details; Mobile (<768px): Card-based layout instead of table, Each job as card showing: name, status badge, cost, created by, Tap card to expand details, Tap "Actions" button for menu
    - **Performance Optimization**: Database query optimization: Indexes on (status, created_at), (created_by, created_at), (cost), Pagination using LIMIT/OFFSET, Result caching for 30 seconds, Virtualized scrolling for large result sets (>100 jobs), Lazy loading: Load first page immediately, subsequent pages on demand
    - **Accessibility**: Table markup uses proper semantic HTML: <table>, <thead>, <tbody>, <th> with scope attributes, Keyboard navigation: Tab through rows, Enter to open details, Space to select checkbox, ARIA labels on all interactive elements, Screen reader announces: "Training jobs table with 287 results", High contrast mode support, Focus indicators clearly visible

- **FR2.3.2:** Training Queue Management
  * Description: System shall implement intelligent queue management for training jobs, displaying queued and provisioning jobs with calculated start time estimates, queue positions, priority indicators, and resource availability forecasts. The queue system shall enforce configurable concurrency limits, apply FIFO scheduling by default, support priority promotion with approval workflows, provide real-time queue updates as jobs complete, calculate estimated start times based on active job completion projections, and communicate queue status clearly to enable resource planning and client expectation management while preventing resource contention and budget overruns.
  * Impact Weighting: Resource Planning / Client Communication / Operational Efficiency
  * Priority: Medium
  * User Stories: US2.3.2
  * User Journey: UJ3.6.1 (Viewing Training Queue), UJ3.6.2 (Managing Queue Position)
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
    - "Queue" tab accessible from training jobs page navigation: "All Jobs | Queue | Active | Completed", tab badge shows queue count: "Queue (5)", loads queue view showing only jobs with status IN ('queued', 'pending_gpu_provisioning')
    - **Queue Display Layout**: Card-based layout (not table) for better visibility of queue position, Each queued job displayed as horizontal card showing: Queue position badge (large, prominent), Job name and ID, Configuration summary (preset, GPU type), Estimated start time with countdown, Creator info, Actions menu
    - **Queue Position Badge**: Large circular or pill badge on left side of card, Format: "#1" (first in queue), "#2", "#3", etc., Color coding: #1-3 (green - starting soon), #4-7 (yellow - moderate wait), #8+ (orange - longer wait), Animated pulse for #1 (next to start)
    - **Estimated Start Time Calculation**: Algorithm: estimated_start_time = NOW() + SUM(estimated_remaining_time for jobs at positions 0 to current_position-1) + GPU_provisioning_buffer; estimated_remaining_time per active job = (total_steps - current_step) × avg_seconds_per_step; GPU_provisioning_buffer = 5 minutes average (historical data); Display format: "Estimated start: Today at 6:45 PM" (if <24 hours), "Tomorrow at 9:30 AM" (if <48 hours), "Wednesday, Dec 18 at 2:15 PM" (if >48 hours), Relative time also shown: "in ~3 hours 20 minutes"
    - **Start Time Accuracy Disclaimer**: Tooltip explains: "Start time estimated based on current active jobs. May change if: Active jobs complete faster/slower than expected, Higher priority jobs added to queue, Active jobs are cancelled", Confidence indicator: "Medium confidence" (if 1-2 active jobs ahead), "Low confidence" (if 3+ active jobs ahead, high variability)
    - **Real-time Queue Updates**: Polling every 30 seconds: Check for active job completions, recalculate queue positions, update estimated start times; Visual update animations: When job moves up in queue: Card briefly highlights green, new position animates, When job reaches #1: Card pulses, "Starting soon..." message appears; When job provisions and exits queue: Card fades out, remaining jobs shift up; Push notifications (optional): "Your queued job moved to position #2. Estimated start: 45 minutes."
    - **Active Jobs Overview Section**: Panel above queue showing current resource utilization: "Active Training Jobs: 2 of 3 slots", Visual slots indicator: [🏃 Job A] [🏃 Job B] [⚪ Available], For each active slot: Job name (clickable), Current progress %, Estimated completion time, "View Details" link
    - **Concurrency Limit Enforcement**: Max concurrent jobs configurable in system settings: default = 3, admin adjustable: 1-10, Limit prevents: Budget overruns (too many jobs = unpredictable costs), GPU unavailability (high demand), User overwhelm (too many to monitor); When limit reached: "Create New Job" button disabled with tooltip: "Maximum 3 concurrent training jobs. Wait for completion or cancel an active job.", Queue continues to accept new jobs (they queue automatically), Alert if queue length >10: "⚠️ Queue is unusually long (12 jobs). Consider increasing concurrency limit or cancelling non-essential jobs."
    - **Queue Priority System (FIFO by default)**: Default behavior: First In, First Out (created_at ASC), Position determined by: created_at timestamp, If two jobs created within same second: secondary sort by job ID; Priority override option: "Promote to Front" button (requires manager role), Click opens approval modal: "Reason for priority promotion: [dropdown]", Options: "Client deadline", "Critical business need", "Testing urgent fix", "Manager override", Justification field (required): text area 100-500 chars, "Submit Request" sends approval to manager, Email notification to approver with job details, [Approve] [Deny] action buttons in email
    - **Priority Promotion Approval Workflow**: Manager receives email: "Priority Queue Request", Email shows: Job name, Requester, Reason, Justification, Current queue position (#5), Proposed new position (#1), Impact: "Will delay 4 other queued jobs by ~30 minutes each", Action buttons with unique signed URLs; On approval: UPDATE training_jobs SET queue_priority = 1, queue_promoted_at = NOW(), promoted_by = {manager_id}, promoted_reason = {reason}; Job moves to front of queue (position #1), Requester notified: "Your job has been promoted to front of queue. Estimated start: 15 minutes.", Audit log: INSERT queue_priority_log (job_id, old_position, new_position, approved_by, reason, timestamp); On denial: Requester notified with denial reason, Job remains in original position
    - **Queue Management Actions**: Each queued job card has actions menu (⋮): "View Configuration" (modal showing full config), "Edit Configuration" (if not yet provisioning, can modify), "Remove from Queue" (cancels job before start), "Promote to Front" (if user has permission), "Clone Job" (create new job with same config, adds to end of queue), "Notify Me When Starting" (sends email/Slack when job provisions)
    - **Queue Analytics Display**: Statistics panel at top of queue view: "Average queue wait time: 1h 23m" (last 30 days), "Queue throughput: 12 jobs/day" (last 7 days), "Longest queue wait: 6h 42m" (historical max), "Current queue depth: 5 jobs (moderate)", Trend indicator: "↑ Queue time increasing" or "↓ Decreasing" based on 7-day moving average
    - **Empty Queue State**: When no queued jobs: "✓ Queue is empty. All training capacity available.", "Your new training jobs will start immediately (within 5 minutes).", "Create New Training Job" button prominently displayed, Shows next available slot: "Next training slot available: Now"
    - **Queue Limit Warning Before Job Creation**: On job configuration page, before clicking "Review & Start": Check current active + queued jobs, If at concurrency limit AND queue length ≥ 5: Display warning modal: "⚠️ Queue Advisory: 3 active jobs running, 5 jobs in queue. Your job will be queued. Estimated start: 8 hours from now. Consider: [Cancel a job] [Continue Anyway] [Schedule for Later]"; If queue length > 10: Stronger warning: "⚠️ Long Queue: 12 jobs ahead. Estimated wait: 24+ hours. Recommendation: Wait for queue to clear or increase team concurrency limit."
    - **Queue Position Notifications**: User opt-in: "Notify me about queue updates for this job", Notification triggers: When job reaches position #3: "Your job is 3rd in queue. Starting soon.", When job reaches #1: "Your job is next! Starting within 15 minutes.", When job starts provisioning: "GPU provisioning started for {job_name}.", When job starts training: "Training started for {job_name}.", Delivery channels: Email, Slack, in-app notification banner
    - **Queue Clearing Strategies**: System suggestions when queue is long: "💡 Queue Optimization Tips:", "Cancel non-urgent jobs to free capacity", "Consider using on-demand GPUs (no queue, guaranteed start)", "Schedule jobs for off-peak hours (fewer queued jobs overnight)", "Increase monthly concurrency limit (requires budget approval)", "Current estimated queue clear time: 18 hours" (based on active jobs completion)
    - **Queue History View**: "Queue History" tab (admin/manager only): Shows all queue events: Job added to queue, Position changes, Priority promotions, Queue exits (started/cancelled), Average queue metrics over time, Identifies bottlenecks: "Most common reason for long queues: Budget limits (73%)", Recommendations: "Consider increasing budget to allow more concurrent jobs"
    - **Advanced Queue Features (Future)**: Scheduled starts: "Start this job at [date/time]" (auto-queue at specified time), Queue reservation: "Reserve next slot" (blocks slot for high-priority job), Queue trading: Users can swap queue positions (both must agree), Auto-scaling: Increase concurrency limit during off-peak hours, decrease during peak, Priority tiers: Gold/Silver/Bronze users get different concurrency limits, Spot queue vs On-Demand queue: Separate queues, on-demand starts faster but costs more

## 3. Error Handling & Recovery

- **FR3.1.1:** Out of Memory Error Handling
  * Description: System shall implement intelligent Out of Memory error detection, diagnosis, and resolution guidance by monitoring training logs for OOM indicators, calculating VRAM requirements based on configuration parameters, providing specific actionable recommendations with confidence-rated suggestions, offering one-click retry with automatically adjusted configurations, tracking OOM patterns to refine preset recommendations, and linking to educational resources explaining VRAM optimization strategies while building user understanding of memory constraints and prevention techniques through clear, non-technical communication.
  * Impact Weighting: Success Rate / User Experience / Learning
  * Priority: High
  * User Stories: US3.1.1
  * User Journey: UJ4.1.1 (Encountering OOM Errors), UJ4.1.2 (Understanding and Resolving OOM)
  * Tasks: [T-3.1.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - **OOM Detection**: Webhook handler monitors training_webhook_events for error payloads, Pattern matching on error_message field for keywords: "OutOfMemoryError", "CUDA out of memory", "torch.cuda.OutOfMemoryError", "RuntimeError: CUDA error: out of memory", Additional check: GPU memory metrics show utilization >95% before crash, Confidence scoring: High confidence OOM (error message match + high GPU mem), Medium confidence (error message match only), Low confidence (suspicious crash pattern but no explicit OOM message)
    - **Job Status Update**: On OOM detection: UPDATE training_jobs SET status = 'failed', error_type = 'OutOfMemoryError', error_message = {full_error_text}, error_occurred_at = NOW(), failed_at_step = {current_step}, failed_at_epoch = {current_epoch}; INSERT error_analysis (job_id, error_type, detected_patterns, vram_calculation, suggested_fixes, confidence_level, created_at)
    - **VRAM Calculation Engine**: Estimate VRAM requirements using formula: base_model_memory_gb = 70 (Llama 3 70B in 4-bit quantization ≈ 35-40GB), lora_adapters_memory_gb = (rank × num_target_modules × model_hidden_size × 4 bytes) / 1e9 ≈ 2-8GB depending on rank, optimizer_state_memory_gb = lora_adapters_memory_gb × 2 (Adam optimizer stores momentum + variance), batch_memory_gb = batch_size × avg_conversation_tokens × 2 bytes × 1.5 (activations overhead) / 1e9, gradient_memory_gb = lora_adapters_memory_gb, total_estimated_vram = base_model + lora_adapters + optimizer_state + batch_memory + gradient_memory; Example calculation: Aggressive preset (r=32, batch=1, 7 target modules): base=40GB, lora=8GB, optimizer=16GB, batch=4GB, gradient=8GB, total≈76GB (within 80GB); Problem config (r=32, batch=4, 7 modules): total≈94GB (exceeds 80GB)
    - **Error Modal Design**: Full-screen modal with prominent error icon (🚫 red circle), non-dismissable (must use action buttons), Header: "Training Failed: Out of Memory", Subheader: "Your configuration requires more GPU memory than available"
    - **Problem Statement Section**: Large text box with red border, Icon: ⚠️, Title: "What Happened:", Explanation: "Your training configuration exceeded the 80GB VRAM capacity of the H100 GPU. The model ran out of memory at step {step} during {stage} stage."
    - **Likely Cause Analysis**: Calculated VRAM breakdown displayed: "Estimated VRAM Requirements:", Base model (Llama 3 70B, 4-bit): 40GB, LoRA adapters (rank={r}): {X}GB, Optimizer state: {Y}GB, Training batch (size={batch}): {Z}GB, Gradients & activations: {W}GB, **Total Estimated: {total}GB** (red highlight if >80GB), Available GPU VRAM: 80GB, **Shortage: {shortage}GB over capacity**, Root cause highlighted: "Primary issue: batch_size={batch} with rank={r} requires {X}GB more than available"
    - **Suggested Fixes Section** (ranked by effectiveness): **Fix #1 (Recommended - 95% success rate)**: "Reduce batch_size from {current} to {suggested}" (calculated: next power of 2 that brings total VRAM <75GB), Impact: "Will reduce VRAM usage by {X}GB, bringing total to {new_total}GB (✓ within capacity)", Trade-off: "Training will take ~{percentage}% longer but will complete successfully", Confidence badge: "95% success rate for this fix with similar configurations"; **Fix #2 (Alternative - 98% success rate)**: "Switch to Conservative preset (rank=8 instead of {current_rank})", Impact: "Reduces LoRA memory from {X}GB to {Y}GB, total VRAM: {new_total}GB", Trade-off: "Lower model capacity, may reduce quality by ~5-10% but much safer", Confidence: "98% success rate - most reliable option"; **Fix #3 (If needed - 80% success rate)**: "Reduce maximum sequence length from {current} to {suggested}", Impact: "Truncates very long conversations (>{suggested} tokens), reduces batch memory by {X}GB", Trade-off: "May lose context from longest conversations (affects ~{percentage}% of dataset)", Confidence: "80% success - only if conversations are unusually long"; **Fix #4 (Last resort)**: "Use a smaller model or contact support for custom configuration", Not actionable via UI, link to support
    - **Quick Retry Buttons**: Each suggested fix has corresponding action button: "Retry with batch_size={suggested}" (primary action, green button), "Retry with Conservative Preset" (secondary, blue), "Manually Adjust Configuration" (tertiary, gray - opens config form with pre-filled suggestions), Button click behavior: Clones current job configuration, Applies suggested parameter changes, Shows diff modal: "Configuration Changes: batch_size: 4 → 2 (recommended fix for OOM)", User confirms: "Apply Changes & Retry Training", Creates new job with updated config, Original failed job remains visible in history as reference
    - **Educational Resources Section**: "Learn More" expandable section, Concise explanation: "Why did this happen?" "GPU VRAM (Video Memory) stores the model, training data, and calculations during training. Larger models, higher LoRA rank, and bigger batch sizes require more VRAM. The H100 GPU has 80GB capacity. Your configuration needed ~{X}GB.", Visual diagram: Simple bar chart showing VRAM breakdown (base model, LoRA, optimizer, batch, total with 80GB limit line), Link to documentation: "Understanding VRAM Requirements in LoRA Training" (opens in new tab), FAQ shortcuts: "How do I prevent OOM?", "What's the optimal batch_size?", "Should I use Conservative preset?"
    - **OOM Pattern Tracking**: System stores OOM events in error_analytics table: INSERT error_analytics (error_type, job_id, configuration_snapshot, vram_estimated, suggested_fix_applied, resolution_successful, user_id, timestamp); Aggregate analysis queries: SELECT preset, AVG(rank), AVG(batch_size), COUNT(*) as oom_count FROM error_analytics WHERE error_type = 'OOM' GROUP BY preset ORDER BY oom_count DESC; Identify high-risk configurations: "Aggressive preset with batch_size=4 has 42% OOM rate - recommend batch_size=2"; Refine preset recommendations: If >20% OOM rate for a preset/dataset size combination, update preset defaults: ALTER aggressive_preset SET default_batch_size = 2 WHERE conversation_count > 200
    - **Preset Recommendation Updates**: Quarterly review of OOM analytics, Adjust preset hyperparameters to reduce OOM rate, Target: <5% OOM rate across all presets, Example adjustments: "Aggressive preset: reduce default batch_size from 4 to 2 for datasets >200 conversations (reduced OOM rate from 18% to 3%)", Changelog: "Updated 2025-Q1: Aggressive preset batch size reduced based on OOM analysis"
    - **Proactive OOM Prevention**: During job configuration, before job starts, Calculate estimated VRAM using same formula, If estimated_vram > 78GB (97.5% of capacity, leaving 2.5% safety margin): Display warning modal: "⚠️ High OOM Risk: Your configuration is estimated to use {X}GB of 80GB VRAM (98%). High risk of Out of Memory error. Recommendations: {suggested fixes from above}", User options: "Adjust Configuration" (applies suggested fix), "Proceed Anyway" (acknowledge risk, create job), "Learn More" (documentation); If estimated_vram 75-78GB (94-97%): Display milder warning badge: "⚠ Moderate OOM risk - consider reducing batch_size for safety"; Analytics tracking: How often users ignore warnings vs apply fixes, Success rate comparison: jobs with warnings vs jobs under threshold
    - **Post-OOM Support**: In error modal, additional support options: "Still having issues?" section: "Contact Support" button (pre-fills support ticket with job ID, configuration, error details), "Request Configuration Review" (expert team reviews config, suggests custom optimization), "Try Conservative Preset" (safest option, highest success rate), "Join Community Forum" (link to discussions about OOM optimization); Automated email follow-up (24 hours after OOM): "We noticed your training job failed with OOM. Here are resources: [link to guide], [link to preset comparison], [schedule consultation with AI engineer]"
    - **OOM Recovery Success Tracking**: For each retry after OOM fix applied, track outcome: If successful completion: INSERT oom_resolution_success (original_job_id, retry_job_id, fix_applied, success = true); Display success message: "✓ Training completed successfully with suggested fix! Original config: batch_size=4, Fixed config: batch_size=2, Result: Successful completion in 14h 32m"; If retry also fails with OOM: Escalate to support, Different fix needed, More aggressive recommendation: "This configuration still exceeds VRAM. Try Conservative preset or contact support for custom solution"
    - **Team-wide OOM Insights**: Admin/manager dashboard shows: Team OOM rate: "12% of training jobs failed with OOM (last 30 days)", Most problematic configurations: "Aggressive preset + batch_size=4: 8 OOM failures", Suggested team action: "Update team training: Always start with Conservative or Balanced preset", Cost impact: "OOM failures cost ${X} in wasted GPU time (preventable with better configuration)", Training recommendation: "Provide LoRA hyperparameter training to team to reduce OOM rate from 12% to target <5%"

- **FR3.1.2:** Dataset Format Error Handling
  * Description: System shall implement comprehensive dataset format validation throughout the training pipeline lifecycle, detecting schema violations, missing fields, malformed JSON, encoding issues, and structural anomalies during both pre-flight validation (before job creation) and preprocessing stage (during training initiation). The error handling shall identify specific problematic conversations with line numbers and field names, display formatted data samples with error highlighting, provide step-by-step remediation guidance with deep links to editing interfaces, enable quick fixes for common issues, prevent invalid training file usage through pre-creation validation gates, and maintain data quality logs for continuous improvement while communicating technical issues in user-friendly language.
  * Impact Weighting: Debugging / Data Quality / Time Savings
  * Priority: High
  * User Stories: US3.1.2
  * User Journey: UJ4.2.1 (Dataset Format Validation), UJ4.2.2 (Fixing Data Errors)
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
      1. Go to conversation editor
      2. Fix missing field
      3. Regenerate training file
      4. Retry training job
    - **Quick action**: "Open Conversation Editor" button (deep link to conversation ID)
    - Validate training file schema before job creation to catch errors early
    - Prevent job creation if validation fails with clear error message
    - Example error: "DatasetFormatError: Training pair #47 missing 'target_response' field. Fix in conversation editor and regenerate training file."
  * Functional Requirements Acceptance Criteria:
    - **Pre-Flight Validation** (before job creation): When user selects training file in job configuration, trigger validation: GET /api/training-files/{file_id}/validate, Server downloads training file from storage, runs schema validation against expected format, Validation checks: JSON parse-ability (valid JSON syntax), Required top-level fields present: training_file_metadata, consultant_profile, conversations (array), metadata.total_conversations matches conversations.length, Each conversation has required fields: conversation_id, conversation_metadata, training_pairs (array), Each training_pair has: prompt_context, user_query, target_response, scaffolding_metadata; Validation response time limit: 10 seconds timeout for large files (>5MB), If validation fails: Display warning banner: "⚠️ Training file has {X} validation errors. Fix errors before creating job.", "View Errors" button opens detailed error list modal, Job creation blocked: "Create Training Job" button disabled with tooltip "Training file has validation errors", If validation passes: ✓ badge displayed: "Training file validated successfully ({X} conversations, {Y} training pairs)", Job creation allowed
    - **Preprocessing Stage Validation** (during training start): GPU container downloads training file from storage during preprocessing stage, Runs same validation checks as pre-flight, Additional runtime checks: Tokenization compatibility (can tokenize all text with Llama 3 tokenizer), Token length validation (no conversation exceeds max_sequence_length=4096), Character encoding verification (UTF-8 valid, no corruption), Conversation uniqueness (no duplicate conversation_ids); If validation fails during preprocessing: Send webhook with validation errors, Job status → 'failed', error_type → 'DatasetFormatError', Stop processing immediately (do not start model loading), Store validation error details in job record
    - **Error Detection Granularity**: For each validation error, capture: error_type: "missing_field", "invalid_type", "malformed_json", "encoding_error", "empty_value", "duplicate_id", "token_overflow", affected_conversation_index: position in conversations array (0-based), affected_conversation_id: business key from conversation_metadata.id, field_path: JSON path to problematic field (e.g., "conversations[47].training_pairs[2].target_response"), error_message: human-readable description, suggested_fix: actionable remediation guidance, severity: "critical" (blocks training), "warning" (may cause issues), "info" (non-blocking)
    - **Error Modal Design**: Header: "Dataset Format Error", Icon: 📄❌, Subheader: "Training file validation failed. {X} errors found.", Tab navigation: "Error Summary" (default), "All Errors" (list view), "Data Preview" (formatted JSON), "Fix Guide" (remediation steps)
    - **Error Summary Tab**: Displays first/critical error prominently, Card layout: **Problem**: "Training data validation failed during preprocessing", "Your training file contains invalid data that cannot be processed.", **Specific Error** (highlighted in red box): "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'", "Location: conversations[46].training_pairs[0].target_response", **Affected Conversation Details**: Shows conversation metadata: "Conversation ID: conv_abc123", "Persona: Anxious Investor", "Emotional Arc: Triumph", "Topic: Retirement Planning", "Training Pairs: 8 pairs total, error in pair #1", **Error Impact**: "This conversation cannot be used for training. {X} other conversations validated successfully."
    - **Data Sample Display**: Formatted JSON viewer with syntax highlighting, Shows affected conversation object with context (10 lines before/after error), Error location highlighted with red background and arrow indicator, Example display: ```json {...abbreviated context...}, "training_pairs": [, {, "prompt_context": "Elena discussing retirement...",, "user_query": "How much should I save?",, >>> "target_response": null, <<< ERROR: Missing required field, "scaffolding_metadata": {...}, }, {...rest of array...}] ```, Copy button: "Copy Conversation JSON" for debugging
    - **All Errors Tab**: Paginated list view if multiple errors (25 errors per page), Each error as collapsible card: Card header: "{error_type}: Conversation #{index} (ID: {id})", Card body: Field path, Error message, Suggested fix; Sort options: "By conversation number", "By error type", "By severity", Filter: "Show critical only", "Show all", Export button: "Export Errors as CSV" (for bulk fixing)
    - **Fix Guide Tab**: Step-by-step remediation workflow, **Step 1**: "Identify affected conversations", List of conversation IDs with errors: "conv_abc123, conv_def456, conv_ghi789", Bulk action: "Select all errored conversations"; **Step 2**: "Open conversation editor to fix data", "Quick Fix" buttons per conversation: "Open conv_abc123 in Editor" (deep link to `/conversations/{id}/edit`), Opens in new tab preserving context; **Step 3**: "Fix specific field issues", For each error: shows field name, current value (if any), expected format/type, Example: "target_response: Expected non-empty string, Found: null, Fix: Add target response text in conversation editor"; **Step 4**: "Regenerate training file after fixes", Button: "Regenerate Training File" (calls API to rebuild file from fixed conversations), Shows progress: "Regenerating... 156 of 242 conversations processed", Completion: "✓ Training file regenerated successfully. {X} conversations, {Y} training pairs.", Validation runs automatically after regeneration; **Step 5**: "Retry training job", Button: "Create New Training Job" (pre-selects newly regenerated file), Or: "Return to Job List"
    - **Quick Action Buttons**: Modal footer has action buttons: "Open Conversation Editor" (primary, blue button): Opens `/conversations/{affected_conversation_id}/edit` in new tab, Preserves error modal so user can reference, "Regenerate Training File" (secondary, if user has permissions): Initiates training file regeneration workflow, Disabled if conversations not yet fixed, "Contact Support" (tertiary): Pre-fills support ticket with: Job ID, Training file ID, Error details, Validation log excerpt; "Dismiss" (closes modal, user can retry later)
    - **Pre-Creation Validation Workflow**: During job configuration (before "Create Training Job" clicked), Async validation request: `GET /api/training-files/{file_id}/validate`, Loading state: "Validating training file..." with spinner, Validation response: {valid: true/false, error_count: number, errors: [{...}], warnings: [{...}], metadata: {...}}; If valid: Display success message: "✓ Training file validated: {X} conversations, {Y} training pairs, all checks passed", Enable "Create Training Job" button; If invalid: Display error summary: "❌ Validation failed: {X} critical errors, {Y} warnings", Show first 3 errors inline: "1. Conversation #47: Missing target_response", "2. Conversation #52: Malformed JSON", "3. Conversation #89: Duplicate conversation_id", "View All Errors" button opens full error modal, Disable "Create Training Job" button, Tooltip on disabled button: "Fix {X} validation errors before creating job"
    - **Common Error Types and Fixes**: **Missing Required Field**: Error: "Conversation #{X} missing '{field_name}'", Fix: "Add missing field in conversation editor. Field must be non-empty.", Validation: Field exists and has non-null, non-empty value; **Invalid Data Type**: Error: "Field '{field}' expected {expected_type}, got {actual_type}", Fix: "Convert field to correct type. Example: training_pairs must be array, not string.", Validation: Type matches schema definition; **Malformed JSON**: Error: "Invalid JSON syntax at line {X}: {parse_error}", Fix: "JSON parsing failed. This usually indicates file corruption. Regenerate training file.", Validation: JSON.parse() succeeds without errors; **Encoding Error**: Error: "Invalid UTF-8 character encoding at byte {X}", Fix: "File contains non-UTF-8 characters. Re-export conversations with UTF-8 encoding.", Validation: File reads successfully as UTF-8; **Token Length Exceeded**: Error: "Conversation #{X} exceeds max token length: {tokens} tokens (max: 4096)", Fix: "Shorten conversation text or increase max_sequence_length (may cause OOM).", Validation: Tokenized length ≤ max_sequence_length; **Duplicate ID**: Error: "Duplicate conversation_id: '{id}' found at indices {X} and {Y}", Fix: "Ensure all conversation IDs are unique. Edit duplicate conversations to have unique IDs.", Validation: All conversation_ids are unique within training file; **Empty Array**: Error: "training_pairs array is empty for conversation #{X}", Fix: "Add at least one training pair to conversation.", Validation: training_pairs.length ≥ 1
    - **Validation Error Logging**: All validation errors logged to database: INSERT INTO training_file_validation_errors (training_file_id, job_id, error_type, conversation_index, conversation_id, field_path, error_message, severity, detected_at); Analytics queries: Track most common error types: SELECT error_type, COUNT(*) as count FROM validation_errors GROUP BY error_type ORDER BY count DESC, Result: "Most common: missing_field (47%), malformed_json (23%), token_overflow (18%)", Identify problematic conversation patterns: "Conversations with emotional_arc='Anxiety' have 3x higher validation error rate", Feed insights back to conversation generation quality controls
    - **Automated Fix Suggestions** (future enhancement): For certain error types, system attempts auto-fix: **Missing optional field**: Auto-populate with default value, "scaffolding_metadata.difficulty_level missing → auto-set to 'medium'", **Trailing comma in JSON**: Auto-remove to fix parse error, **Encoding issues**: Auto-convert to UTF-8, Preview auto-fixes to user: "We detected {X} fixable errors. Apply suggested fixes? [Preview Fixes] [Apply All] [Manual Fix]", User reviews, approves, system regenerates file with fixes, Validation re-runs automatically after auto-fix
    - **Training File Quality Score**: Based on validation results, calculate quality score: Base score: 100 points, Deduct points for each error: Critical error: -10 points, Warning: -2 points, Info: -0.5 points, Bonus points for: All required fields present (+5), Rich metadata (+5), Human review >20% (+10); Display quality score in training file selector: "Training File Quality: 87/100 (Good - Minor warnings only)", Color coding: 90-100 (green), 70-89 (yellow), <70 (red - recommend fixing errors first); Track quality over time: "Your training file quality improved from 72 to 87 after fixing validation errors"

- **FR3.1.3:** GPU Provisioning Error Handling
  * Description: System shall implement comprehensive GPU provisioning error detection, diagnosis, and recovery mechanisms to handle RunPod API failures including spot instance unavailability, provisioning timeouts, datacenter outages, and quota limits. The system shall present users with intelligent recovery options including automatic retry with exponential backoff, spot-to-on-demand migration, delayed scheduling, and cancellation workflows while displaying real-time datacenter availability metrics, historical provisioning success rates, estimated wait times based on demand patterns, and proactive notifications throughout the provisioning lifecycle to maintain user confidence during infrastructure delays and enable informed decision-making about cost vs availability trade-offs.
  * Impact Weighting: User Experience / Flexibility / Reliability
  * Priority: High
  * User Stories: US3.1.3
  * User Journey: UJ4.3.1 (GPU Provisioning Failures), UJ4.3.2 (Provisioning Recovery Options)
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
  * Functional Requirements Acceptance Criteria:
    - **Provisioning Failure Detection**: Monitor RunPod API responses during pod creation, Error detection patterns: HTTP 503 (Service Unavailable), HTTP 429 (Rate Limit/Quota Exceeded), HTTP 404 (Region unavailable), Response body contains: "No available GPUs", "Spot capacity exhausted", "Datacenter maintenance", "Resource quota exceeded", Timeout detection: If pod creation request pending >10 minutes without status change → timeout error; Upon detection: UPDATE training_jobs SET status = 'provisioning_failed', error_type = 'GPUProvisioningError', error_subtype = {specific_cause}, provisioning_attempts = provisioning_attempts + 1, last_provisioning_attempt_at = NOW(); INSERT provisioning_errors (job_id, error_type, runpod_response, datacenter_id, gpu_type, pricing_tier, timestamp)
    - **Error Type Classification**: **No Spot Availability** (most common): RunPod API returns: "No spot instances available for H100_PCIE_80GB", Cause: High demand, all spot capacity allocated, datacenter utilization >90%, Historical pattern: Common during US business hours (9 AM - 5 PM PST), weekdays > weekends; **Provisioning Timeout**: Pod creation initiated but stuck in "pending" state >10 minutes, Cause: Datacenter congestion, slow allocation, queueing delays, May resolve if given more time (not permanent failure); **Region/Datacenter Unavailable**: RunPod API returns: "Datacenter temporarily unavailable", "Scheduled maintenance in progress", Cause: Planned maintenance, infrastructure issues, complete unavailability (not just capacity), Recovery: Wait for maintenance completion (ETA provided in API response if available); **Quota Exceeded**: API returns: "Account GPU quota exceeded", "Monthly GPU hours limit reached", Cause: User/team has consumed allocated GPU resources, Requires: Quota increase request, billing tier upgrade; **Rate Limiting**: HTTP 429: "Too many pod creation requests", Cause: Exceeded RunPod API rate limits (e.g., >5 pod creations per minute), Recovery: Automatic backoff and retry after cooldown
    - **Error Modal Design**: Full-screen modal, non-dismissable (must choose recovery option), Header: "GPU Provisioning Failed", Icon: 🔌❌ or ⚙️⚠️, Subheader context-aware: "Unable to provision spot GPU" or "Datacenter temporarily unavailable" or "Provisioning timeout"
    - **Problem Statement**: Clear explanation of issue: "No H100 spot GPUs currently available", "Your training job requires an H100 PCIe 80GB GPU, but all spot instances are currently in use.", Visual indicator: GPU availability gauge: "Spot Availability: Low (8% free capacity)", "On-Demand Availability: High (87% free capacity)"
    - **Reason Analysis**: Data-driven explanation of cause: "High demand in RunPod datacenter (92% utilization)", "Typical peak hours: 9 AM - 5 PM PST on weekdays", "Current time: 10:30 AM PST (peak demand period)", Historical context: "Spot availability usually increases after 5 PM (off-peak)", Datacenter status: Fetch real-time from RunPod API: GET /v2/availability, Display: "US-West datacenter: 92% utilized (23 of 25 H100s in use)", "EU-West datacenter: 67% utilized (16 of 24 H100s in use)" (if multi-region supported future)
    - **Recovery Options Section** (presented as large action cards): **Option 1: Auto-Retry (Recommended for spot)**: Title: "Wait for Spot GPU (Auto-Retry)", Description: "Automatically retry provisioning every 5 minutes until GPU becomes available", Details: "Max retry duration: 1 hour (12 attempts)", "You'll be notified when GPU provisioned and training starts", "No action required from you", Estimated wait time: "Historical data shows spot GPUs typically available within 15-30 minutes", Success rate: "82% of retries succeed within 1 hour during peak hours, 96% during off-peak", Cost: "No additional cost beyond standard spot rate ($2.49/hr)", Action button: "Enable Auto-Retry" (primary, blue); **Option 2: Switch to On-Demand**: Title: "Start Immediately (On-Demand GPU)", Description: "Guaranteed GPU availability, start training within 5 minutes", Details: "No waiting, no retry uncertainty", "Guaranteed completion, no spot interruptions", Cost comparison: "Spot: $2.49/hr → On-Demand: $7.99/hr (+$5.50/hr)", "Total job cost: Estimated $XX (spot) vs $YY (on-demand) = +$ZZ premium", "Cost increase: {percentage}% more expensive", Recommendation: "Best if urgent deadline or already waited >30 minutes", Action button: "Switch to On-Demand & Start" (secondary, green); **Option 3: Cancel and Retry Later**: Title: "Cancel Job, Try During Off-Peak Hours", Description: "Cancel this job and retry when spot availability is higher", Details: "Spot availability highest: Evenings (5 PM - 11 PM PST), Weekends, Overnight (11 PM - 7 AM)", "Suggested retry times: Tonight at 6 PM (90% availability), Saturday morning (95% availability)", No cost incurred (job never started), Action button: "Cancel Job" (tertiary, gray); **Option 4: Contact Support** (if all else fails): Title: "Request Support Assistance", Description: "Our team can help with custom provisioning or priority allocation", Details: "Response time: <2 hours during business hours", "May be able to reserve GPU capacity for urgent needs", Action button: "Contact Support"
    - **Auto-Retry Workflow**: User selects "Enable Auto-Retry", Modal updates: "Auto-Retry Enabled - Monitoring for Available GPUs", UPDATE training_jobs SET status = 'queued_waiting_for_gpu', auto_retry_enabled = true, auto_retry_started_at = NOW(), auto_retry_max_duration_minutes = 60, auto_retry_interval_minutes = 5; Background job (cron or queue): Every 5 minutes, attempt RunPod pod creation: POST /v2/pods/create with same configuration; Retry attempts logged: INSERT provisioning_retry_log (job_id, attempt_number, timestamp, result); Success: Pod created, job status → 'provisioning' → 'preprocessing', Notification sent: Email + Slack: "✓ GPU provisioned! Training started for {job_name}", User redirected to job dashboard; Failure: Log attempt, wait 5 minutes, retry; Timeout (1 hour elapsed, 12 failed attempts): Job status → 'provisioning_failed_timeout', Modal updates: "Still No Spot GPU After 1 Hour", Options: "Continue Waiting (extend to 2 hours)", "Switch to On-Demand Now", "Cancel Job"; Notification: "Spot GPU still unavailable after 1 hour. Choose next action: [View Options]"
    - **Real-Time Status Updates** (during auto-retry): Job dashboard shows: Status badge: "Waiting for GPU" (pulsing yellow), Progress indicator: "Auto-retry in progress: Attempt 3 of 12", Time elapsed: "Waiting for 15 minutes (max: 1 hour)", Next retry: "Next attempt in 2m 30s" (countdown timer), Datacenter availability chart: Line graph showing utilization over past 2 hours, trend prediction; Live updates via polling (every 30 seconds): Check job status, update UI if provisioning succeeded, Show availability changes: "Datacenter utilization decreased from 92% to 85% - higher chance of success on next retry"; User can modify strategy during wait: "Switch to On-Demand" button available anytime, "Cancel Auto-Retry" option if user changes mind
    - **Provisioning Failure Analytics**: System tracks provisioning failures across all jobs: Metrics: Failure rate: (failed_provisionings / total_provisioning_attempts) per hour, per day, Average wait time for successful spot provision, Peak failure times: "9-11 AM PST: 42% failure rate, 3-5 PM PST: 38% failure rate", Off-peak success rate: "11 PM - 7 AM: 96% success within 5 minutes"; Insights displayed to users: In job configuration: "⚠️ Peak Demand Period: Spot provisioning success rate currently 58% (10 AM PST). Consider: On-demand GPU for immediate start, Schedule job for evening (95% success rate)"; Dashboard widget: "Spot Availability Forecast" - shows projected availability for next 24 hours based on historical patterns
    - **Proactive Availability Warnings**: Before job creation, check current datacenter utilization: GET /v2/availability, If spot_available_percentage < 20%: Display warning modal: "⚠️ Low Spot Availability Alert", "Current spot utilization: 92% (only 2 of 25 GPUs available)", "Your job may experience provisioning delays (estimated wait: 20-40 minutes)", Options: "Proceed with Spot (may wait)", "Use On-Demand Instead (+$XX)", "Schedule for Later (when availability higher)"; User decision logged for effectiveness analysis
    - **Regional Failover** (future enhancement): If primary datacenter unavailable, auto-failover to secondary region, "US-West datacenter at capacity, automatically trying US-East datacenter...", Transparent to user, may have slight latency differences, Training continues normally once provisioned in alternate region
    - **Priority Provisioning** (premium feature): Enterprise users get priority queue for spot provisioning, "Your account has Priority Provisioning enabled", "Your job will be provisioned before standard queue jobs", "Average wait time reduction: 60% compared to standard provisioning", Additional cost: $0.50/hr premium on top of spot rate
    - **Quota Management**: If quota exceeded error: Display: "GPU Quota Exceeded", "Your account has used {X} of {Y} allocated GPU hours this month", "Remaining quota: 0 hours", Options: "Upgrade Plan (increase quota to {Z} hours)", "Wait Until Next Month (quota resets on {date})", "Contact Sales for Custom Quota"; Quota usage visible in dashboard: "GPU Hours Used: 87 of 100 this month (87%)", Progress bar, forecast: "At current rate, quota will be exhausted in 5 days"

- **FR3.2.1:** Spot Instance Interruption Recovery
  * Description: System shall implement robust automatic checkpoint-based recovery from spot instance interruptions by saving training state every 100 steps to cloud storage, detecting interruption events via RunPod webhooks, immediately provisioning replacement spot instances, downloading latest checkpoints, restoring complete training state including model weights, optimizer state, and random seeds, resuming training from exact interruption point, tracking interruption frequency and downtime, maintaining cost accuracy including recovery overhead, notifying users of interruption and recovery status, and achieving 95%+ successful recovery rate with <10 minute resume time to maximize spot instance cost savings while ensuring training reliability and user confidence.
  * Impact Weighting: Cost Efficiency / Reliability / User Confidence
  * Priority: High
  * User Stories: US3.2.1
  * User Journey: UJ4.4.1 (Spot Interruption Handling), UJ4.4.2 (Automatic Recovery Process)
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
  * Functional Requirements Acceptance Criteria:
    - **Checkpoint Saving During Training**: GPU container configured to save checkpoint every 100 training steps, Checkpoint save frequency configurable per preset: Conservative (every 100 steps), Balanced (every 100 steps), Aggressive (every 50 steps - more frequent for longer runs); Checkpoint contents using PyTorch torch.save(): model_state_dict: LoRA adapter weights (all trainable parameters), optimizer_state_dict: Adam optimizer momentum + variance buffers, lr_scheduler_state_dict: Cosine annealing schedule current state, training_state: {current_step, current_epoch, global_step, best_validation_loss, training_loss_history}, random_states: {torch.get_rng_state(), np.random.get_state(), random.getstate()}, configuration: Complete hyperparameter config for verification, metadata: {job_id, training_file_id, checkpoint_step, saved_at_timestamp}; Checkpoint file format: PyTorch .pt file, typical size 400-500MB (LoRA adapters + optimizer state), Compression: gzip compression applied, reduces size by ~30%
    - **Checkpoint Upload to Storage**: After checkpoint saved locally on GPU, upload to Supabase Storage: bucket = 'training-checkpoints', path = '{job_id}/checkpoint-step-{step}.pt', Upload with retry logic: 3 attempts with exponential backoff if network fails, Upload progress webhook: "Checkpoint upload: 42% (180MB of 430MB)", Upload completion webhook: {event: "checkpoint_saved", step: 500, checkpoint_path: "...", file_size_mb: 430, upload_duration_seconds: 28}; Old checkpoints cleanup: Keep last 3 checkpoints only (delete checkpoints older than current - 300 steps), Prevents storage bloat, Configurable retention policy; Upload optimization: Parallel uploads (checkpoint saves while training continues), Async upload doesn't block training loop, Upload bandwidth limit: 50 Mbps to avoid affecting training data transfer
    - **Spot Interruption Detection**: RunPod sends webhook when spot instance reclaimed: POST /api/training/webhook with payload: {event_type: "spot_interruption", job_id: "...", pod_id: "...", interrupted_at_timestamp: "...", last_checkpoint_step: 500, interruption_warning_seconds: 120}; RunPod provides 2-minute warning before termination (spot eviction notice), GPU container receives SIGTERM signal, Graceful shutdown: Save emergency checkpoint (even if not at 100-step boundary), Upload checkpoint with high priority, Send final webhook: "Checkpoint saved, container terminating", Container exits within 120 seconds
    - **Job Status Update on Interruption**: Webhook handler receives interruption event, UPDATE training_jobs SET status = 'interrupted', interrupted_at = NOW(), last_checkpoint_step = {step}, checkpoint_recovery_count = checkpoint_recovery_count + 1; INSERT interruption_log (job_id, interrupted_at_step, interrupted_at_time, checkpoint_available, recovery_initiated_at); User notification (push): "Training interrupted at {percentage}% complete (step {step}). Auto-recovery starting..." (notification doesn't require user action, informational only)
    - **Automatic Recovery Initiation**: Webhook handler immediately triggers recovery workflow (no human intervention), Recovery workflow: async function recoverFromInterruption(job_id), Steps: 1) Verify checkpoint exists in storage: GET storage.getFile('{job_id}/checkpoint-step-{latest_step}.pt'), If checkpoint missing: CRITICAL ERROR, cannot recover, escalate to manual intervention; 2) Provision new spot GPU: POST /v2/pods/create with same config (H100, spot, same datacenter if available), Include checkpoint_path in pod environment variables, Priority: High (recovery jobs get slight priority boost in RunPod queue); 3) Monitor provisioning: Poll pod status every 10 seconds, If provisioning takes >5 minutes: Log delay, continue monitoring, If provisioning fails (no spot available): Wait 2 minutes, retry provisioning, Max 3 provisioning attempts within 10 minutes; 4) On pod ready: Send startup webhook to new pod: "Resume from checkpoint: {path}", Pod downloads checkpoint: GET storage.getFile(checkpoint_path), Download with progress updates, Verify checkpoint integrity: checksum validation; 5) Restore training state: Load model_state_dict into LoRA adapters, Load optimizer_state_dict, Load lr_scheduler_state_dict, Restore random_states (ensures deterministic continuation), Verify current_step matches checkpoint_step; 6) Resume training loop: Start training from step {checkpoint_step + 1}, Send webhook: {event: "training_resumed", resumed_from_step: 500, downtime_minutes: 8.5}, UPDATE training_jobs SET status = 'training', resumed_at = NOW(), total_interruption_downtime_minutes = total + downtime
    - **Recovery Success Tracking**: Target metrics: Resume within 10 minutes of interruption (95th percentile), 95%+ successful recovery rate (recoveries that complete training / total interruptions); Tracking: Calculate recovery_duration_minutes = (resumed_at - interrupted_at).total_minutes(), Log success/failure: INSERT recovery_outcomes (job_id, interruption_number, recovery_duration_minutes, success, failure_reason, timestamp); Dashboard analytics: "Spot Instance Recovery Performance: 96.3% success rate, 8.2 min average recovery time (last 30 days)"; Alert if recovery_rate < 90%: "⚠️ Recovery rate declining, investigate infrastructure issues"
    - **Dashboard Interruption Display**: Interruption badge on job dashboard: "Interrupted 2× (auto-recovered)" (orange badge with checkmark), Click badge opens interruption details modal: Timeline view showing each interruption, Per-interruption details: "Interruption #1: Step 500 at 3h 42m → Resumed at step 500 at 3h 51m (9 min downtime)", "Interruption #2: Step 1200 at 8h 15m → Resumed at step 1200 at 8h 22m (7 min downtime)", Total interruption downtime: "Total downtime: 16 minutes (0.3 hours)", "Active training time: 12h 18m", "Total elapsed time: 12h 34m (including interruptions)"; Visual interruption indicators on loss curve: Vertical dotted lines at interruption steps, Tooltip on hover: "Interrupted at step 500, resumed 9 min later", Loss curve continuous (no gaps) - training resumed seamlessly
    - **Cost Tracking with Interruptions**: Accurate cost calculation including recovery overhead: active_training_hours = (total_elapsed_time - interruption_downtime_minutes) / 60, interruption_overhead_hours = (checkpoint_recovery_count × avg_recovery_time_minutes) / 60, total_billable_hours = active_training_hours + interruption_overhead_hours, actual_cost = total_billable_hours × gpu_hourly_rate; Cost breakdown display: "GPU Training Time: 12.3 hours × $2.49/hr = $30.63", "Interruption Overhead: 0.3 hours × $2.49/hr = $0.75 (2 recoveries)", "Total Cost: $31.38"; Compared to estimate: "Estimated: $48-60, Actual: $31.38 (35% under estimate due to fewer interruptions than expected)"
    - **User Notifications**: **On Interruption**: Email + Slack (if not urgent/critical): Subject: "Training Interrupted - Auto-Recovery in Progress", Body: "Your training job {name} was interrupted at {percentage}% complete (step {step}). We're automatically provisioning a new GPU and will resume within 10 minutes. No action needed from you."; Push notification (mobile): "Training interrupted, auto-recovering..." (brief, non-alarming); **On Resume**: Email + Slack: Subject: "Training Resumed Successfully", Body: "Training resumed from step {step}. Downtime: {minutes} min. Estimated completion: {time}.", Estimated completion time recalculated based on remaining steps; Dashboard banner (if user viewing): "✓ Training resumed from checkpoint. Interruption recovered in 8 min."
    - **Recovery Failure Escalation**: If recovery fails 3 times within 30 minutes: UPDATE training_jobs SET status = 'recovery_failed', recovery_attempts = 3; User notification (urgent): "⚠️ Unable to Recover After 3 Attempts", Email + Slack + push notification; Error modal displayed: "Spot Instance Recovery Failed", "Reason: Unable to provision replacement spot GPU after 3 attempts (datacenter capacity issues)", Options: "Option 1: Continue trying spot (may take hours during peak demand)", "Option 2: Switch to on-demand GPU (guaranteed recovery, +$5.50/hr)", "Option 3: Cancel job and retry later"; Recommended action: "Switch to on-demand GPU recommended for jobs >50% complete (minimal waste)"; User selects option: If on-demand: Provision on-demand GPU, load checkpoint, resume (guaranteed to work), UPDATE training_jobs SET gpu_pricing_tier = 'on_demand', recovery_switched_to_ondemand = true, Cost recalculated with on-demand rate from switch point forward; If continue spot: Continue retry loop indefinitely (or until user cancels), If cancel: Mark job as cancelled, preserve checkpoint for potential future resume
    - **Checkpoint Recovery Rate Analytics**: System-wide tracking: Query: SELECT COUNT(*) as total_interruptions, SUM(CASE WHEN recovery_successful THEN 1 ELSE 0 END) as successful_recoveries FROM interruption_log WHERE created_at > NOW() - INTERVAL '30 days', Calculate recovery_rate = (successful_recoveries / total_interruptions) × 100; Display in admin dashboard: "Spot Interruption Recovery: 96.3% success rate, 427 interruptions handled, 411 successful recoveries, 16 required manual intervention", Trend chart: Recovery rate over time (target: maintain >95%); Root cause analysis for failures: "Failed recoveries: 12 due to checkpoint corruption, 3 due to spot unavailability >30 min, 1 due to storage outage"
    - **Optimization Strategies**: Pre-provisioning (future): Predict likely interruption times based on historical patterns, Pre-provision backup spot GPU during high-risk periods, Seamless failover if primary interrupted (0-second downtime); Multi-checkpoint redundancy: Save checkpoints to 2 different cloud storage regions, If primary checkpoint unavailable, fallback to secondary, Increases reliability to 99.9%+; Interruption avoidance: Choose datacenters with historically lower spot interruption rates, "US-West datacenter: 18% interruption rate, US-East: 12% → recommend US-East for spot jobs"

- **FR3.2.2:** Manual Checkpoint Resume
  * Description: System shall enable users to manually resume failed training jobs from saved checkpoints by displaying resume options on jobs with available checkpoint files, opening pre-configured resume modal with previous settings, allowing strategic configuration adjustments including GPU type migration, batch size reduction, epoch modification, and learning rate schedule changes, calculating accurate cost estimates for remaining work, creating linked continuation jobs that preserve training history, downloading and validating checkpoint integrity, restoring training state with configuration modifications, and tracking resumed jobs with clear lineage to enable recovery from failures like OOM errors, repeated spot interruptions, or user-initiated improvements while maintaining training continuity and cost efficiency.
  * Impact Weighting: Cost Efficiency / Flexibility / User Control
  * Priority: Medium
  * User Stories: US3.2.2
  * User Journey: UJ4.5.1 (Manual Checkpoint Resume), UJ4.5.2 (Resume Configuration Adjustments)
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
    - **Checkpoint Availability Detection**: For jobs with status IN ('failed', 'cancelled', 'recovery_failed'), query checkpoint availability: SELECT checkpoint_path, checkpoint_step, checkpoint_size_mb FROM training_jobs WHERE id = {job_id} AND checkpoint_path IS NOT NULL, Verify checkpoint file exists in storage: HEAD request to Supabase Storage returns 200 OK, If checkpoint available: Display "Resume from Checkpoint" button (prominent, blue, ▶️ icon), Position: Next to "Retry Job" button on failed job details page, Button label: "Resume from Step {checkpoint_step}", Tooltip: "Continue training from last saved checkpoint ({checkpoint_step_percentage}% complete)", If no checkpoint: Button hidden, explanation: "No checkpoint available. This job failed before first checkpoint (step 100)."
    - **Resume Configuration Modal**: Click "Resume from Checkpoint" opens full-screen modal, Modal header: "Resume Training from Checkpoint", Subheader: "Continue training from step {checkpoint_step} ({percentage}% complete)", Close button (X) - can be dismissed unlike review modal
    - **Original Job Summary Section**: Card showing original job details: Job name: "{original_job_name}", Status: "Failed" (red badge) with failure reason, Original configuration: Preset (Conservative/Balanced/Aggressive), GPU type (Spot/On-Demand), Key hyperparameters: rank={r}, lr={lr}, epochs={epochs}, batch_size={batch_size}, Training progress before failure: "Completed {checkpoint_step} of {total_steps} steps ({percentage}%)", "Training time elapsed: {hours}h {minutes}m", "Cost spent so far: ${cost}", Checkpoint details: "Last checkpoint: Step {step}, saved {time_ago} ago", "Checkpoint size: {size}MB"
    - **Remaining Work Calculation**: Calculate remaining work: remaining_steps = total_steps - checkpoint_step, remaining_epochs = total_epochs - completed_epochs + partial_epoch_fraction, estimated_remaining_hours = remaining_steps × avg_seconds_per_step_from_previous_job / 3600; Display prominently: "Remaining Work: {remaining_steps} steps (~{remaining_epochs} epochs)", "Estimated Duration: {hours}h - {hours_max}h", "Estimated Cost: ${min} - ${max} (based on {gpu_type})"
    - **Configuration Adjustment Options**: **GPU Type Selection** (most common adjustment): Toggle: [Spot Instance] [On-Demand Instance], Pre-selected based on context: If original failed due to spot interruptions (≥3): Default to on-demand with explanation "Recommended: Switch to on-demand to avoid further interruptions", If original OOM failure: Keep same GPU type, If original spot with <2 interruptions: Default to spot (cost-effective); Cost impact displayed: "Cost change: Spot $XX-YY → On-Demand $ZZ-WW (+$AA premium for guaranteed completion)"; **Batch Size Adjustment** (for OOM recovery): If original failure type = 'OutOfMemoryError': Show batch_size adjustment UI (slider or dropdown), Current: batch_size = {original_batch_size}, Suggested: batch_size = {suggested_reduced_batch_size} (calculated to fit in VRAM), Explanation: "Reducing batch_size from {X} to {Y} will prevent OOM error", VRAM estimate display: "Estimated VRAM: {original}GB (exceeded 80GB) → {new}GB (fits within capacity)", Can't increase batch_size (only reduce or keep same); **Epochs Adjustment** (optional optimization): Allow reducing remaining epochs: "Complete fewer epochs to finish faster/cheaper", Slider: "Resume with {remaining_epochs} epochs" → adjustable down to 1 epoch, Can't increase total epochs beyond original configuration (would require retraining from start), Display impact: "Reducing to 1 epoch: Duration -6h, Cost -$XX"; **Learning Rate Schedule** (advanced, optional): Option to restart LR schedule or continue from checkpoint schedule, Radio buttons: "Continue LR schedule from checkpoint" (default, recommended), "Restart LR schedule (warmup again)", Explanation tooltip: "Continuing schedule maintains training continuity. Restarting may help if training stalled."; **Hyperparameters Locked**: Display locked parameters (cannot change): "LoRA Rank (r): {X} - Cannot change (model architecture must match checkpoint)", "Target Modules: {...} - Locked", "LoRA Alpha: {Y} - Locked", Explanation: "These parameters define model architecture and cannot be changed when resuming from checkpoint."
    - **Cost Estimate Update**: Real-time cost calculation as user adjusts config: estimated_cost = remaining_hours × gpu_hourly_rate[selected_gpu_type], Display updates within 300ms of any change, Cost comparison: "Original job cost: ${spent_so_far}", "Estimated additional cost: ${remaining_cost}", "Total projected cost: ${total} vs original estimate ${original_estimate}", Cost savings indicator if switching to spot: "Switching to spot saves $XX vs original on-demand plan"
    - **Resume Confirmation Section**: Checkbox (required): "☐ I understand this will create a new training job that continues from step {checkpoint_step}", Summary: "Configuration Changes: {list of changes from original}", Example: "GPU type: Spot → On-Demand, Batch size: 4 → 2, Remaining epochs: 1.5", Warning if no changes: "ℹ️ You haven't modified the configuration. If the original job failed, it may fail again with the same settings.", Recommendation if applicable: "💡 Suggestion: {context-specific advice}", Example: "For OOM error, we recommend reducing batch_size to 2 (current: unchanged at 4)"
    - **Action Buttons**: "Resume Training" (primary, green button): Disabled until checkbox checked, Creates continuation job (workflow below); "Reset to Original Configuration" (secondary): Reverts all changes to original job settings; "Cancel" (tertiary): Closes modal, no job created
    - **Job Creation Workflow**: On "Resume Training" click: INSERT INTO training_jobs (id, name, description, training_file_id, configuration, status, created_by, ...) VALUES (new_uuid(), '{original_job_name} - Resumed', 'Resumed from {original_job_id} at step {checkpoint_step}', ...); Link jobs: INSERT INTO training_job_continuations (original_job_id, continuation_job_id, resumed_from_step, resumed_from_checkpoint_path, configuration_changes); UPDATE original_job SET has_continuation = true, continuation_job_id = {new_job_id}; Job configuration includes: gpu_pricing_tier: {selected_gpu_type}, batch_size: {adjusted_batch_size}, remaining_epochs: {adjusted_epochs}, checkpoint_resume_path: '{checkpoint_path}', resume_from_step: {checkpoint_step}, inherited_configuration: {original_config}; Redirect to new job details page: /training-jobs/{new_job_id}
    - **Container Startup with Checkpoint Resume**: New job provisions GPU (spot or on-demand as selected), Container receives environment variables: RESUME_FROM_CHECKPOINT=true, CHECKPOINT_PATH='{checkpoint_path}', RESUME_FROM_STEP={checkpoint_step}; Container downloads checkpoint from storage: GET /storage/training-checkpoints/{path}, Verify checksum integrity, Extract checkpoint contents; Load training state: Load model weights into LoRA adapters (must match rank/target_modules), Load optimizer state, Load LR scheduler state (or reinitialize if "restart schedule" selected), Restore random states for reproducibility, Verify configuration compatibility: checkpoint rank matches config rank, checkpoint target_modules match config; Apply configuration changes: If batch_size changed: Use new batch_size for data loaders, If GPU type changed: Already provisioned correct GPU type, If epochs adjusted: Update total_steps calculation, Update LR scheduler accordingly; Resume training loop: Start from step {checkpoint_step + 1}, Continue epoch progression, Send webhook: "Training resumed from checkpoint {step}", Continue normal training workflow
    - **Dashboard Display for Resumed Jobs**: Job details page shows: Status badge: "Training (Resumed from {original_job_name})", Resume indicator: "▶️ Resumed from step {checkpoint_step} of original job", Link to original job: "View original job: {original_job_name}", Configuration changes highlighted: "Modified configuration: GPU type: Spot → On-Demand, Batch size: 4 → 2"; Progress tracking: Progress bar shows continuation only (0-100% of remaining work), Overall progress label: "Overall: 42% → 100% (resumed at 42%)", Step counter: "Step 850 → 2000 (resumed from 850)"; Cost tracking: "Original job cost: $XX.XX (first 42%)", "Continuation cost: $YY.YY (current, remaining 58%)", "Total cost: $ZZ.ZZ (both jobs combined)"; Loss curve displays: Combined loss curve showing both original and continuation training, Vertical marker at resume point: "Resumed here from checkpoint", Tooltip: "Training resumed at step 850 after {failure_reason}", Continuous curve (no break) - training continuity maintained
    - **Common Resume Scenarios**: **Scenario 1: OOM Error Recovery**: Original: Aggressive preset, batch_size=4, r=32 → OOM at step 450, Resume: Reduce batch_size to 2, keep other params, switch to on-demand for reliability, Result: Training completes successfully, total cost $XX (original $YY wasted + continuation $ZZ); **Scenario 2: Repeated Spot Interruptions**: Original: Spot GPU, interrupted 3 times, recovery failed, Resume: Switch to on-demand GPU (guaranteed completion), keep all other config, Result: Training completes without interruption, pays premium but job finishes; **Scenario 3: User Cancellation then Resume**: Original: User cancelled at 60% to adjust strategy, Resume: Continue with same config, just want to finish, Result: Completes remaining 40%, minimal waste; **Scenario 4: Budget Optimization**: Original: On-demand GPU, user realizes cost too high, pauses/cancels, Resume: Switch to spot GPU for remaining work, accept interruption risk for cost savings, Result: Saves $XX on remaining training
    - **Resume Success Tracking**: Track resumed job outcomes: INSERT INTO resume_outcomes (original_job_id, continuation_job_id, failure_reason_original, configuration_changes, success, final_cost, timestamp); Analytics: Resume success rate: (successful_resumes / total_resumes) × 100, Target: >90% of resumed jobs complete successfully, Common successful patterns: "OOM + batch_size reduction: 96% success rate", "Spot interruption loop + on-demand switch: 99% success rate", "User cancellation + same config resume: 94% success rate"; Display insights to users: "Similar resume scenarios have 96% success rate with your configuration changes"
    - **Limitations and Edge Cases**: Cannot resume if: Checkpoint corrupted (checksum fails), Checkpoint older than 30 days (expired/deleted), Configuration incompatible (trying to change locked params), Training file deleted/modified (data inconsistency); Error handling: If checkpoint download fails: "Unable to download checkpoint. File may have been deleted.", Option to retry or cancel, If checkpoint incompatible: "Checkpoint configuration doesn't match. Cannot resume with different LoRA rank.", Must start new job from scratch; Warning if: Original job very old (>7 days): "⚠️ Original job is 12 days old. Training file or system may have changed. Recommend creating new job instead of resuming.", User can proceed anyway or create fresh job

- **FR3.3.1:** One-Click Retry with Same Configuration
  * Description: System shall implement streamlined one-click retry functionality for failed training jobs by cloning complete configurations, automatically incrementing retry counters, linking retry jobs to original failures for traceability, displaying confirmation modals with failure analysis and fresh cost estimates, providing optional configuration editing before retry initiation, automatically queuing and starting retried jobs, tracking retry success rates per error type, and optimizing for transient failures like network timeouts and provisioning delays to maximize productivity and minimize configuration overhead while maintaining clear job lineage and enabling rapid recovery from temporary infrastructure issues.
  * Impact Weighting: Productivity / User Experience / Time Savings
  * Priority: Medium
  * User Stories: US3.3.1
  * User Journey: UJ4.7.1 (One-Click Job Retry), UJ4.7.2 (Retry Success Tracking)
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
    - **Retry Button Display**: "Retry Job" button appears on failed job details page, Position: Header area, next to job name, prominent placement, Styling: Secondary action button (blue/gray), icon: 🔄, Label: "Retry Job" (simple, clear), Enabled for jobs with status IN ('failed', 'cancelled'), Disabled tooltip for successful jobs: "Job completed successfully, no retry needed", For jobs with checkpoints: "Retry Job" button appears alongside "Resume from Checkpoint" button (user can choose which approach)
    - **Button Click Confirmation Modal**: Click opens confirmation modal (not immediate retry to prevent accidents), Modal header: "Retry Training Job?", Subheader: "Create a new job with identical configuration from the failed job", Modal dismissable (can cancel)
    - **Original Job Summary Section**: Card showing failure context: Job name: "{original_job_name}", Status: "Failed" (red badge), Failure reason: "{error_type}: {error_message}" (e.g., "OutOfMemoryError: CUDA out of memory"), Failed at: "Step {step} ({percentage}% complete)", Elapsed time before failure: "{hours}h {minutes}m", Cost spent: "${cost}", Failure timestamp: "Failed {relative_time} ago (Dec 15, 2025 at 2:34 PM)", Link: "View original job details"
    - **Retry Configuration Display**: Shows complete configuration being reused: Training file: "{training_file_name}" ({conversation_count} conversations), Hyperparameter preset: "{preset_name}" badge, GPU type: "Spot H100" or "On-Demand H100", Key hyperparameters: "Rank: {r}, Learning Rate: {lr}, Epochs: {epochs}, Batch Size: {batch_size}", All metadata: Same tags, same client/project assignment, same description/notes; Visual indicator: "✓ Configuration cloned from original job", Explanation: "This retry will use the exact same settings. For adjusted retry, use 'Retry with Suggested Fix' button."
    - **Fresh Cost Estimate**: Calculate new cost estimate (not reusing original estimate): estimated_duration = (total_steps × avg_seconds_per_step) / 3600 based on historical data, estimated_cost = estimated_duration × gpu_hourly_rate[gpu_type], Display: "Estimated duration: {min}h - {max}h", "Estimated cost: ${min} - ${max}", Comparison to original: "Original estimate: ${original_est}", "Original spent before failure: ${spent}", Warning if high cost: "⚠️ This retry will cost an additional ${estimate}. Consider using 'Retry with Suggested Fix' to reduce cost."
    - **Retry Reasoning Display**: Explanation of when simple retry makes sense: "Retry recommended for: ✓ Transient network errors (timeout, connection reset), ✓ Temporary GPU provisioning delays, ✓ Spot interruptions without saved checkpoint (<step 100), ✓ Infrastructure hiccups (datacenter transient issues)"; "Retry may not help for: ✗ OutOfMemoryError (likely to fail again with same config), ✗ Dataset validation errors (data issue not fixed), ✗ Repeated spot interruption loops (same risk), → For these errors, use 'Retry with Suggested Fix' or 'Resume from Checkpoint'"
    - **Configuration Edit Option**: Link/button: "Edit Configuration Before Retry", Click opens job configuration form pre-filled with settings from original job, User can modify: GPU type, hyperparameters, batch size, epochs, training file, job name, metadata, After edits, proceeds to normal job creation flow (not one-click anymore, but user requested customization); If no edits made: "Edit Configuration" option subtle/secondary, emphasize "Retry with Same Config" as primary action
    - **Job Naming Convention**: New job name auto-generated: If original job not a retry: "{original_job_name} (Retry #1)", If original job is already a retry: Increment counter: "Job Name (Retry #2)" → "Job Name (Retry #3)", Parse retry counter from job name, increment, Editable: User can change job name in confirmation modal if desired, Default description: "Retry of job {original_job_id} which failed with {error_type}"
    - **Action Buttons**: "Retry Job" (primary, blue button): Enabled by default, Click creates retry job (workflow below), Loading state while creating: "Creating retry job..."; "Edit Configuration" (secondary, link or button): Opens configuration editor; "Cancel" (tertiary): Closes modal, returns to job details
    - **Retry Job Creation Workflow**: On "Retry Job" confirm: Deep clone original job configuration: SELECT * FROM training_jobs WHERE id = {original_job_id}, Create new job record: INSERT INTO training_jobs (id, name, description, training_file_id, configuration, gpu_pricing_tier, created_by, retry_of_job_id, retry_attempt_number, status) VALUES (new_uuid(), '{name} (Retry #{attempt})', 'Retry of {original_id}', {same_training_file}, {cloned_config}, {same_gpu_type}, {same_user}, {original_job_id}, {attempt_number}, 'queued'); Link retry to original: UPDATE original_job SET has_retry = true, latest_retry_job_id = {new_job_id}; Audit log: INSERT INTO job_retry_log (original_job_id, retry_job_id, retry_attempt, reason = 'manual_retry', timestamp); Auto-start: No additional confirmation needed, job moves to queue, provisions GPU automatically; Redirect: User navigated to new retry job details page: /training-jobs/{new_retry_job_id}
    - **Retry Job Display**: New job details page shows: Status: "Queued" (starting soon), Retry indicator badge: "Retry #2 of original job", Link to original: "Original job: {original_job_name} [View]", Configuration display: "Configuration cloned from: {original_job_id}", If original failed: "Original failure: {error_type} at step {step}", Expectation: "This retry uses identical configuration. Success depends on whether original error was transient."; Job progress: Standard monitoring once training starts, Independent progress tracking (0-100% of new attempt, not continuing from original)
    - **Retry Count Tracking**: Database field: retry_attempt_number INT, retry_of_job_id UUID (foreign key to original job), Job history shows retry chain: "Original Job → Retry #1 → Retry #2 → Retry #3", Each job links to previous/next in retry chain, UI displays: "This is retry attempt #2", "Previous attempt: {job_id} (failed with {error})", "Next retry (if exists): {job_id} (status: {status})"
    - **Retry Success Tracking**: For each retry, track outcome: INSERT INTO job_retry_outcomes (original_job_id, retry_job_id, retry_attempt, original_error_type, retry_successful, retry_final_status, retry_cost, timestamp); Calculate success rates: Query: SELECT error_type, COUNT(*) as total_retries, SUM(CASE WHEN retry_successful THEN 1 ELSE 0 END) as successful_retries FROM retry_outcomes GROUP BY error_type, Compute: success_rate = (successful_retries / total_retries) × 100; Display insights: "85% of retried jobs complete successfully overall", "For {error_type}: {X}% retry success rate", "Your retry history: 7 of 9 retries successful (78%)"; Use data to guide users: If success rate <50% for error type: "⚠️ Jobs failing with {error_type} have only {X}% retry success rate. Consider 'Retry with Suggested Fix' instead.", If success rate >80%: "✓ Jobs failing with {error_type} have {X}% retry success rate. Retry recommended."
    - **Transient Error Optimization**: Identify transient vs persistent errors: **Transient** (high retry success): Network timeout errors: 92% success, Spot interruption before checkpoint: 88% success, Provisioning delays: 94% success, Webhook delivery failures: 96% success; **Persistent** (low retry success): OutOfMemoryError: 12% success (config issue), Dataset validation errors: 8% success (data issue), Authentication failures: 5% success (credentials issue); Recommendation logic: If error_type IN (transient_errors): Primary button: "Retry Job" (recommended), Secondary: "Retry with Suggested Fix", Message: "This error is usually transient. Retry recommended."; If error_type IN (persistent_errors): Primary button: "Retry with Suggested Fix" (recommended), Secondary: "Retry Job" (not recommended), Warning: "⚠️ This error typically requires configuration changes. Simple retry may fail again."
    - **Retry Limit Enforcement**: Prevent infinite retry loops: Max retries per original job: 5 attempts, After 5 failed retries: Disable "Retry Job" button, Display: "Maximum retry limit reached (5 attempts). Contact support for assistance.", Alternative: "Create New Job" (fresh start, not linked as retry); Warning at attempt 3+: "This is retry attempt #3. Consider reviewing configuration or contacting support if repeated failures occur."; Admin override: Support team can bypass retry limit for special cases
    - **Cost Tracking Across Retries**: Aggregate cost of retry chain: total_retry_chain_cost = SUM(cost) for all jobs in retry chain, Display on original job: "Total cost including retries: ${total}", "Original attempt: ${cost1}, Retry #1: ${cost2}, Retry #2: ${cost3}", "Total retries cost: ${retry_total} (additional expense)"; Budget impact: Retries count toward monthly budget, Alert if excessive retry costs: "You've spent ${X} on retries this month. Review failure patterns to reduce retry costs."; Analytics: "Team retry costs: ${X} this month (Y% of total training costs)", "Cost savings opportunity: Reduce retry costs by improving configuration quality"
    - **Batch Retry** (future enhancement): Select multiple failed jobs, "Retry Selected Jobs" button, Confirmation: "Retry {X} jobs with same configurations?", Creates {X} retry jobs simultaneously, Progress indicator: "Creating retries: 5 of 12 complete", Use case: Infrastructure outage affected many jobs, one-click retry all

- **FR3.3.2:** Retry with Suggested Adjustments
  * Description: System shall implement intelligent retry functionality with context-aware configuration suggestions by analyzing failure patterns, generating evidence-based parameter adjustments, displaying configuration diffs with change highlights, providing confidence ratings for each suggestion based on historical success rates, enabling users to accept recommended fixes or manually edit configurations, tracking suggestion effectiveness to refine recommendation algorithms through machine learning, and optimizing for common failure modes like OOM errors, timeout issues, and spot interruption loops to maximize retry success rates and user learning while reducing trial-and-error cycles and unnecessary costs.
  * Impact Weighting: Success Rate / Learning / User Guidance
  * Priority: Medium
  * User Stories: US3.3.2
  * User Journey: UJ4.8.1 (Guided Error Recovery), UJ4.8.2 (Learning from Suggestions)
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
    - **Suggested Fix Button Display**: "Retry with Suggested Fix" button appears on failed job details page for supported error types, Position: Next to "Retry Job" button (if both present), or as primary action if suggestions available, Styling: Primary action button (green/blue), icon: 🔧✨, Label: "Retry with Suggested Fix" (implies intelligence/help), Enabled for: OutOfMemoryError, Spot Interruption Loop (≥3 interruptions), Provisioning Timeout, Dataset Validation Errors (some types), Training Timeout, Loss Plateau issues; Badge indicator: "Recommended" badge overlay on button for high-confidence suggestions
    - **Suggestion Generation Engine**: When job fails, trigger suggestion analysis: python def generate_suggestions(job_id, error_type, configuration, context): suggestions = []; Analyze error type and context: **For OutOfMemoryError**: Calculate VRAM overflow amount: shortage_gb = estimated_vram - 80; Generate suggestions ordered by effectiveness: If batch_size > 1: suggest reduce_batch_size (primary fix, 96% success rate), If rank > 16: suggest reduce_rank / switch to Conservative preset (95% success rate), If sequence_length > 2048: suggest reduce_max_length (80% success rate); **For Spot Interruption Loop** (≥3 interruptions): Primary: Switch to on-demand GPU (99% success rate), Secondary: Try different datacenter (if multi-region available, 75% success rate), Tertiary: Schedule for off-peak hours (85% success rate overnight); **For Provisioning Timeout**: Primary: Switch to on-demand (100% success, guaranteed), Secondary: Auto-retry with exponential backoff (82% success), Tertiary: Try different GPU type (if H100 unavailable, try A100, 70% success); **For Loss Plateau**: Reduce learning rate by 50% (68% improves training), Increase training steps/epochs by 25% (72% achieves better convergence), Switch to different optimizer (Adam → AdamW, 64% improvement); Return suggestions ranked by: Confidence (historical success rate), Impact (how much it addresses root cause), Cost (prefer lower-cost solutions first)
    - **Retry with Suggested Fix Modal**: Click button opens comprehensive modal, Modal header: "Retry with Intelligent Fixes", Subheader: "We've analyzed your failure and recommend these changes", Icon: 🔧✨ or 🤖
    - **Failure Analysis Section**: Card showing error diagnosis: Error Type: "{error_type}" (badge), Root Cause Analysis: "Your configuration exceeded GPU memory capacity by ~{X}GB", Specific Issue: "batch_size=4 with rank=32 requires ~92GB VRAM (H100 capacity: 80GB)", Impact: "Training could not proceed past step {step}", Context data: Historical pattern: "OOM errors with this configuration fail 94% of the time", Your history: "2 of your last 3 jobs with Aggressive preset had OOM errors"
    - **Suggested Fixes Section** (ranked list): **Fix #1 - Primary Recommendation** (highlighted, most prominent): Title: "Reduce Batch Size" (badge: "Recommended"), Change visualization: "batch_size: 4 → 2" (strikethrough old value, bold new value), Diff highlighting: RED "4" crossed out, GREEN "2" highlighted, Explanation: "Reducing batch size from 4 to 2 will reduce VRAM usage by ~12GB, bringing total to 72GB (within 80GB capacity)", Impact: "+ Higher likelihood of success", "+ Prevents OOM error", "- Training will take ~15% longer (~2 hours)", Cost impact: "Cost: $48-60 (similar to original estimate)", Confidence: "95% success rate" (large, green badge), Visual confidence bar: ▓▓▓▓▓▓▓▓▓░ 95%, Historical data: "427 similar jobs succeeded with this fix (95% success)", Checkbox: "☐ Apply this fix" (checked by default); **Fix #2 - Alternative** (secondary prominence): Title: "Switch to Conservative Preset", Change: "Preset: Aggressive → Conservative", Detailed changes: "rank: 32 → 8", "learning_rate: 0.0003 → 0.0002", "batch_size: 4 → 2", Explanation: "Conservative preset uses lower rank and batch size, significantly reducing memory requirements", Impact: "+ Very safe, 98% success rate", "- Lower model capacity, may reduce quality by ~5-10%", "- Training faster (~10h instead of 14h)", Cost: "$35-45 (cheaper than original)", Confidence: "98% success rate", Checkbox: "☐ Apply this fix" (unchecked by default, user can select instead of Fix #1); **Fix #3 - Advanced** (least prominent, collapsible): Title: "Manual Configuration Adjustments", Description: "Fine-tune parameters yourself", Button: "Edit Configuration Manually" (opens config editor with pre-filled values from original job)
    - **Configuration Diff Viewer**: Interactive diff display showing all changes, Side-by-side or inline comparison: "Original Configuration | Suggested Configuration", Changed parameters highlighted: "batch_size: 4 | 2" (old value RED, new value GREEN), Unchanged parameters grayed out: "epochs: 3" (same), Explanation tooltips: Hover over each changed parameter shows: "Why this change?", "What's the impact?", "What's the confidence?"; Visual summary: "3 parameters changed, 7 unchanged", "Estimated success rate increase: 12% → 95%"
    - **Cost & Duration Impact**: Recalculated estimates based on suggested configuration: "Original Estimate: $48-60, 12-14 hours", "Suggested Configuration: $52-65, 13-15 hours (+$4, +1h)", Explanation: "Longer duration due to smaller batch size, but highly likely to succeed", Trade-off visualization: Success Probability: 12% → 95% ✓, Duration: 12h → 13h ↑, Cost: $48 → $52 ↑, Overall: "Worth the slight increase for 95% success vs 12%"
    - **Multiple Fix Selection**: User can select multiple complementary fixes: Checkboxes allow combining: "☑ Reduce batch_size", "☐ Switch to Conservative preset", "☐ Switch to on-demand GPU", System validates compatibility: If incompatible: "Cannot combine 'Conservative preset' with 'Reduce batch_size only' (Conservative already includes reduced batch_size)", Auto-adjust: If user selects Conservative preset, uncheck individual batch_size change (redundant); Combined impact calculation: Show cumulative effect of all selected fixes, "Combined success rate: 97%", "Combined cost: $55-70"
    - **Confidence Rating Methodology**: Historical success rate calculation: Query retry outcomes: SELECT COUNT(*) as total, SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes FROM retry_outcomes WHERE original_error_type = {error_type} AND suggested_fix_applied = {fix_type}; Confidence = (successes / total) × 100; Confidence tiers: 90-100% = "Very High Confidence" (dark green), 75-89% = "High Confidence" (green), 60-74% = "Medium Confidence" (yellow), <60% = "Low Confidence" (orange), experimental fix; Minimum sample size: Require ≥20 historical cases before showing confidence, If <20 cases: "Confidence: Experimental (limited data)", Encourage user: "Help us improve by trying this fix and reporting results"
    - **User Decision Actions**: "Apply Suggested Fixes & Retry" (primary, green button): Disabled until ≥1 fix selected, Click creates retry job with suggested configuration applied, Loading state: "Creating retry job with suggested fixes..."; "Edit Manually" (secondary button): Opens full configuration editor, Pre-fills with suggested values (user can further adjust), Proceeds to standard job creation flow; "Retry Without Changes" (tertiary, link): Falls back to one-click retry (same as FR3.3.1), Warning: "Not recommended - original configuration likely to fail again"; "Cancel" (close modal)
    - **Retry Job Creation with Suggestions**: On "Apply Suggested Fixes & Retry": Clone original job configuration, Apply selected fixes to configuration object: If "reduce_batch_size" selected: config.batch_size = suggested_batch_size, If "switch_preset" selected: Apply all preset parameters (rank, lr, batch_size, etc.), If "switch_gpu_type" selected: config.gpu_pricing_tier = 'on_demand', Create new training job: INSERT training_jobs (id, name, configuration, retry_of_job_id, suggested_fixes_applied, ...) VALUES (...); Track which fixes applied: INSERT INTO applied_suggestions (retry_job_id, original_job_id, suggestion_type, suggestion_details, confidence_at_time, timestamp); Auto-start job (queues immediately); Redirect to new retry job page
    - **Retry Job Display with Suggestions**: New job details page shows: Status: "Queued (with suggested fixes)", Retry indicator: "Intelligent Retry of {original_job_name}", Applied Fixes section: "Applied Suggestions: • Batch size reduced: 4 → 2 (95% confidence), • GPU switched: Spot → On-Demand (99% confidence)", Expected success rate: "Based on similar fixes: 95% likely to succeed", Link: "View original failed job: {original_job_name}"; Progress tracking: Standard monitoring, Special attention flag: "Monitoring for previously failed step ({failed_step})...", Success notification: If training passes previously failed step: "✓ Passed step {failed_step} successfully! Suggestion worked.", If completes successfully: "✓ Training completed! Suggested fixes resolved the issue."
    - **Suggestion Effectiveness Tracking**: After retry completes (success or failure): UPDATE applied_suggestions SET retry_outcome = {status}, retry_successful = {true/false}, actual_cost = {cost}, actual_duration = {duration}, resolved_original_error = {true if different error or success}; Calculate suggestion effectiveness: For each suggestion_type: success_rate = successful_retries / total_retries_with_suggestion, Compare to baseline retry (no suggestions): improvement_rate = suggested_success_rate - simple_retry_success_rate; Use data to refine future suggestions: If fix consistently successful (>90%): Promote to "Recommended" tier, Increase confidence display, If fix rarely successful (<50%): Demote or remove from suggestions, Flag for engineering review: "batch_size=1 suggestion only 45% effective, investigate"
    - **Learning & Improvement Loop**: Machine learning-driven suggestion refinement (future): Feed retry outcomes back into recommendation engine, Train model to predict: Which fixes most likely to work for given error + configuration, Optimal parameter values (not just "reduce batch_size" but "reduce to X specifically"), Expected success rate per suggested configuration; A/B testing: Randomly assign some users alternative suggestions, Compare effectiveness, Roll out winning suggestions to all users; User feedback: "Was this suggestion helpful? [Yes] [No, I needed different fix]", If "No": "What fix worked for you?" (free text or dropdown), Use feedback to improve suggestions
    - **Error-Specific Suggestion Templates**: **OutOfMemoryError**: Primary: Reduce batch_size (calculate exact safe value), Secondary: Switch to Conservative preset, Tertiary: Reduce sequence length if applicable; **Spot Interruption Loop**: Primary: Switch to on-demand, Secondary: Schedule for off-peak hours, Tertiary: Accept longer completion time with continued retries; **Provisioning Timeout**: Primary: Switch to on-demand (guaranteed), Secondary: Auto-retry with backoff, Tertiary: Wait and retry during off-peak; **Dataset Validation Error**: Primary: Fix specific data issues (provide editing links), Secondary: Remove invalid conversations from training file, Tertiary: Regenerate training file; **Loss Plateau**: Primary: Reduce learning rate, Secondary: Increase training duration, Tertiary: Switch optimizer; **Training Timeout**: Primary: Reduce epochs, Secondary: Reduce dataset size, Tertiary: Switch to faster preset
    - **Suggestion Explanation & Education**: Each suggestion includes educational content: "Why does this help?" section: "Reducing batch_size decreases the amount of data processed simultaneously, which reduces memory consumption. Smaller batches fit within GPU memory limits.", "Trade-offs to consider": "Smaller batches mean more gradient updates per epoch, which can actually improve model quality but takes longer.", "Learn more": Link to documentation "Understanding Batch Size in LoRA Training"; Help users understand not just what to change, but why: Builds user expertise over time, Reduces repeat errors in future jobs, Empowers users to make informed decisions
    - **Team-Wide Suggestion Insights**: Manager/admin view shows: "Top Suggested Fixes This Month: Reduce batch_size (applied 23 times, 95% success), Switch to on-demand (applied 12 times, 100% success)", "Most Effective Suggestions: On-demand GPU for spot loops: 100% success, Batch size reduction for OOM: 95% success", "Suggestion Adoption Rate: 67% of users accept suggested fixes (vs 33% retry without changes)", "Cost Savings from Suggestions: ${X} saved by preventing repeated failures"; Team training opportunities: "Top suggestion needed: Reduce batch_size (18 times this month)", "Training recommendation: Educate team on VRAM management to reduce OOM errors"

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
      ```bash
      curl -X POST http://localhost:8000/api/v1/chat \
        -H "Authorization: Bearer <api_key>" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Explain asset allocation", "max_tokens": 500}'
      ```
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
  * Description: System shall implement comprehensive automated perplexity evaluation during training finalization by testing both baseline Llama 3 70B and trained model with LoRA adapters on identical held-out validation sets, calculating perplexity scores using cross-entropy loss over token predictions, computing improvement percentages, applying quality threshold classifications (production-ready ≥30%, acceptable 20-29%, below threshold <20%), displaying results with visual comparisons, exporting detailed metrics, and tracking perplexity trends across training runs to provide objective, quantifiable measures of model improvement that serve as primary quality gates for production deployment and client deliverables.
  * Impact Weighting: Quality Assurance / Objective Measurement / Client Proof
  * Priority: High
  * User Stories: US6.1.1
  * User Journey: UJ5.1.1 (Perplexity Evaluation), UJ5.1.2 (Quality Gate Assessment)
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
    - **Automatic Triggering**: Perplexity evaluation initiates automatically during finalization stage, After final training epoch completes and final adapter saved, Before job marked as 'completed', Job status updates to 'running_validation' with substatus "Calculating perplexity...", Duration estimate: 10-20 minutes for 48 validation conversations
    - **Validation Set Selection**: Training file split: 80% training (194 conversations), 20% validation (48 conversations), Split deterministic: Same conversations always in validation set (seeded by training_file_id), Validation set stored in database during preprocessing: validation_conversation_ids JSONB array in training_jobs table, Validation conversations not used during training (held out), Stratified sampling: Proportional representation of personas, emotional arcs, topics in validation set
    - **Baseline Model Evaluation**: Load base Llama 3 70B model (no adapters): Use cached model if available, 4-bit quantization for consistency with training, Run inference on all 48 validation conversations: For each conversation: For each training pair (prompt_context + user_query → target_response), Tokenize prompt and target with Llama 3 tokenizer, Calculate log probabilities: model(prompt) → logits for target tokens, Compute cross-entropy loss: -log(P(target | prompt)), Store per-token losses; Aggregate perplexity: total_loss = SUM(cross_entropy_loss for all tokens in all validation pairs), total_tokens = COUNT(tokens in all target_responses), average_loss = total_loss / total_tokens, baseline_perplexity = exp(average_loss); Typical baseline range: 20-30 for financial advice domain (Llama 3 70B general knowledge)
    - **Trained Model Evaluation**: Load trained model: Base Llama 3 70B + trained LoRA adapters (adapter_model.bin), Merge adapters into base model for inference, Run identical validation evaluation: Same 48 conversations, Same prompts, Same scoring methodology, Calculate trained_perplexity = exp(average_loss_trained); Expected trained range: 12-20 (significant improvement from fine-tuning)
    - **Improvement Calculation**: Compute improvement percentage: improvement_pct = ((baseline_perplexity - trained_perplexity) / baseline_perplexity) × 100, Example: (24.5 - 16.8) / 24.5 = 0.314 = 31.4% improvement, Positive improvement = trained model better (lower perplexity), Negative improvement = trained model worse (regression, rare), Store in database: UPDATE training_jobs SET baseline_perplexity = 24.5, trained_perplexity = 16.8, perplexity_improvement_pct = 31.4, perplexity_calculated_at = NOW()
    - **Quality Threshold Classification**: Apply thresholds: IF improvement_pct >= 30: quality_tier = 'production_ready', badge_color = green, badge_text = "✓ Production Ready", recommendation = "Model exceeds quality threshold. Ready for client delivery."; ELSIF improvement_pct >= 20: quality_tier = 'acceptable', badge_color = yellow, badge_text = "⚠ Acceptable Quality", recommendation = "Model meets minimum quality standards. Review with team before delivery."; ELSE: quality_tier = 'below_threshold', badge_color = red, badge_text = "✗ Below Threshold", recommendation = "Model quality insufficient. Consider retraining with more data or different configuration."; Store: UPDATE training_jobs SET perplexity_quality_tier = quality_tier
    - **Results Display on Job Details Page**: **Perplexity Section** (dedicated card on dashboard): Card header: "Model Quality: Perplexity Improvement", Quality badge: Large prominent badge with tier icon and text, Results grid (3 columns): Column 1 - Baseline Perplexity: "24.5" (large number), "Llama 3 70B without fine-tuning" (subtitle), Info tooltip: "Lower perplexity = better. Perplexity measures how surprised the model is by the validation data."; Column 2 - Trained Perplexity: "16.8" (large number, green if improved), "Llama 3 70B + LoRA adapters" (subtitle), Difference indicator: "↓ 7.7 points lower"; Column 3 - Improvement: "31.4%" (huge, bold, green), "Production Ready" (quality tier), Target: "Target: ≥30%" (met); Interpretation text: "31% lower perplexity indicates significantly better prediction quality", "This model is ready for production deployment and client delivery."
    - **Perplexity Comparison Chart**: Bar chart visualization: X-axis: "Baseline" vs "Trained", Y-axis: Perplexity score (0-30 scale), Baseline bar: Blue, height 24.5, Trained bar: Green, height 16.8, Improvement arrow: Red downward arrow showing 31.4% reduction, Target line: Horizontal dashed line at 30% improvement threshold (production-ready marker); Chart interactive: Hover shows exact values, Click to expand full-screen; Chart export: Download as PNG image for reports
    - **Detailed Metrics Expandable Section**: "View Detailed Perplexity Breakdown" link expands section showing: Total validation pairs evaluated: 187 pairs across 48 conversations, Total tokens scored: 23,456 tokens, Average tokens per response: 125 tokens, Baseline metrics: Total loss: 76,234, Average loss: 3.25, Perplexity: exp(3.25) = 24.5; Trained metrics: Total loss: 68,012, Average loss: 2.90, Perplexity: exp(2.90) = 16.8; Improvement: Absolute: -0.35 loss units, Relative: 31.4% perplexity reduction; Per-conversation min/max: Best improvement: Conversation #42 (45% improvement), Worst improvement: Conversation #7 (18% improvement), Link to per-conversation breakdown (FR6.1.2)
    - **Quality Gate Decision Workflow**: If quality_tier = 'below_threshold': Display warning banner: "⚠️ Model Quality Below Threshold", "Perplexity improvement (X%) below target (30%). This model may not meet production standards.", Recommendations: "Consider: Adding more training data (+20-30 conversations), Retraining with different hyperparameters (try Conservative preset), Reviewing training data quality (low-quality data degrades performance), Extending training (add 1-2 epochs)"; Actions: [Retry Training with Suggestions] [Review Training Data] [Accept Anyway (with justification)]; Require manager approval for delivery if below threshold; If quality_tier = 'acceptable': Display caution banner: "Model Quality Acceptable (20-30% improvement)", "Meets minimum standards but below optimal threshold.", Recommendation: "Review with team before client delivery. Consider A/B testing or gradual rollout."; If quality_tier = 'production_ready': Display success banner: "✓ Model Quality Exceeds Standards", "Ready for immediate production deployment."; Auto-approve for delivery (no manual review needed)
    - **Export Perplexity Data**: "Export Perplexity Report" button: Generates comprehensive PDF report: Cover page: Job name, training date, quality tier badge, Executive summary: Overall improvement, quality tier, recommendation, Detailed metrics: Baseline/trained perplexity, improvement %, validation set details, Per-conversation breakdown table (if >20 conversations, top/bottom 10 shown), Visual charts: Bar chart, improvement trend chart (if multiple runs), Methodology: Explanation of perplexity calculation, Validation set composition; CSV export option: Job ID, Baseline Perplexity, Trained Perplexity, Improvement %, Quality Tier, Validation Pairs, Total Tokens, Calculated At; Export includes in validation artifact bundle: training-job-{id}-validation-report.pdf
    - **Perplexity Trend Tracking**: Store historical perplexity data: INSERT INTO perplexity_history (job_id, training_file_id, baseline_perplexity, trained_perplexity, improvement_pct, quality_tier, timestamp); Query trends for same training file across multiple training runs: SELECT job_id, improvement_pct, quality_tier FROM perplexity_history WHERE training_file_id = {id} ORDER BY timestamp DESC; Display trend chart on job details: Line graph showing improvement % over time (X-axis: job creation date, Y-axis: improvement %), Identify improvements: "Previous run: 28% improvement, This run: 31% improvement (↑ 3 percentage points)", Show optimal configuration: "Best result: 34% improvement (Balanced preset, 3 epochs, job #abc123)"; Use trends to guide future training: "💡 Insight: Balanced preset consistently achieves 30-35% improvement for this training file. Recommend using Balanced for future runs."
    - **Team Analytics**: Aggregate perplexity metrics across team: Average perplexity improvement: 28.5% across 47 completed jobs, Distribution: Production-ready (≥30%): 23 jobs (49%), Acceptable (20-29%): 19 jobs (40%), Below threshold (<20%): 5 jobs (11%); Identify patterns: Best-performing training files: High-quality datasets with 30+ conversations typically achieve 32-38% improvement, Problematic configurations: Aggressive preset with <200 conversations: only 18% average improvement (insufficient data), Improvement correlation: More training data (>250 conversations) correlates with +5-8% higher improvement; Team goals: Target: 75% of jobs reach production-ready tier (currently 49%), Action plan: Improve training data quality, Provide hyperparameter guidance, Share best practices from high-performing jobs

- **FR6.1.2:** Perplexity by Category Analysis
  * Description: System shall implement granular perplexity analysis segmented by conversation scaffolding categories including persona types, emotional arcs, and training topics by calculating category-specific baseline and trained perplexity scores, computing per-category improvements, identifying high-performing and underperforming segments, generating visual heatmaps showing persona-emotional arc intersections, producing actionable recommendations for training data augmentation, and exporting detailed breakdowns to enable data-driven iteration, targeted dataset improvements, and strategic training file optimization based on quantified quality gaps across different conversation types.
  * Impact Weighting: Quality Insights / Data-Driven Iteration / Targeted Improvement
  * Priority: Medium
  * User Stories: US6.1.2
  * User Journey: UJ5.2.1 (Category-Level Quality Analysis), UJ5.2.2 (Training Data Optimization)
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
    - **Category Data Extraction**: During perplexity calculation, track metadata for each validation conversation: conversation_id, persona, emotional_arc, primary_topic (from scaffolding_metadata), baseline_perplexity_this_conversation, trained_perplexity_this_conversation; Store in perplexity_by_conversation table: INSERT perplexity_by_conversation (job_id, conversation_id, persona, emotional_arc, topic, baseline_ppl, trained_ppl, improvement_pct); Aggregate by categories after all validation conversations evaluated
    - **Perplexity by Persona Analysis**: Query aggregation: SELECT persona, AVG(baseline_ppl) as avg_baseline, AVG(trained_ppl) as avg_trained, AVG(improvement_pct) as avg_improvement, COUNT(*) as conversation_count FROM perplexity_by_conversation WHERE job_id = {id} GROUP BY persona ORDER BY avg_improvement DESC; Results table display: **Persona | Baseline PPL | Trained PPL | Improvement | Count**; Example rows: "Anxious Investor | 26.3 | 15.2 | 42.2% ↑ | 12 convos", "Pragmatic Skeptic | 24.1 | 18.5 | 23.2% | 8 convos", "Hopeful Planner | 23.8 | 16.1 | 32.4% | 10 convos", "Overwhelmed Procrastinator | 27.5 | 19.8 | 28.0% | 9 convos", "Detail-Oriented Analyzer | 22.9 | 15.7 | 31.4% | 9 convos"; Visual indicators: Green highlight: Improvement ≥35% (excellent), Yellow: 25-34% (good), Red: <25% (needs improvement), Best performer badge: "🏆 Best" next to highest improvement persona, Worst performer warning: "⚠️ Needs Attention" next to lowest; Sort options: "Sort by: [Improvement ▼] [Baseline PPL] [Trained PPL] [Count]"
    - **Perplexity by Emotional Arc Analysis**: Similar aggregation: GROUP BY emotional_arc; Results table: **Emotional Arc | Baseline PPL | Trained PPL | Improvement | Count**; Example: "Triumph | 23.1 | 15.8 | 31.6% | 14 convos", "Struggle-to-Success | 25.7 | 17.2 | 33.1% | 12 convos", "Anxiety | 27.2 | 18.9 | 30.5% | 11 convos", "Skepticism-to-Trust | 24.5 | 16.3 | 33.5% | 11 convos"; Identify underperforming arcs: If improvement <25%: Flag as "Needs more training coverage", Example: "Anxiety arc: 22% improvement (below average 31%). Consider adding 5-10 more Anxiety conversations to improve model performance on anxious clients."
    - **Perplexity by Training Topic Analysis**: Aggregation: GROUP BY primary_topic; Results table: **Topic | Baseline PPL | Trained PPL | Improvement | Count**; Example: "Retirement Planning | 22.5 | 14.9 | 33.8% | 16 convos", "Tax Strategies | 28.3 | 19.1 | 32.5% | 10 convos", "Investment Advice | 24.7 | 16.2 | 34.4% | 12 convos", "Debt Management | 26.1 | 18.4 | 29.5% | 10 convos"; Topic-specific insights: High baseline perplexity = inherently complex topic (e.g., Tax Strategies: 28.3), Even with training, may remain higher than simpler topics, Focus on improvement %, not absolute perplexity; Flag topics with low improvement: "Debt Management: 29.5% improvement (below 30% target). Consider: Adding 5+ more debt-focused conversations, Reviewing quality of existing debt conversations, Ensuring diverse debt scenarios (student loans, credit cards, mortgages)"
    - **Visual Heatmap: Persona × Emotional Arc**: Matrix visualization: Rows: All personas (5-8 personas), Columns: All emotional arcs (4-6 arcs), Cells: Color-coded by improvement %; Cell coloring: Green (dark): ≥40% improvement, Green (light): 35-39%, Yellow: 30-34%, Orange: 25-29%, Red: <25%, Gray: No data (persona-arc combination not in validation set); Cell contents: Display improvement %: "42%", Show conversation count: "(3)", Hover tooltip: "Anxious Investor + Triumph: 42.2% improvement, 3 conversations, Baseline: 26.8, Trained: 15.5"; Heatmap insights: Quick visual scan identifies: Strong areas (green clusters): Model performs well, Weak areas (red cells): Need more training data for this combination, Data gaps (gray cells): Combinations not represented in training/validation; Interactive: Click cell to view specific conversations in that category, Filter: "Show only cells with <30% improvement" (highlights problems)
    - **Data Gap Identification**: Analyze validation set coverage: Count conversations per persona: Min: 7, Max: 15, Average: 10; Count conversations per emotional arc: Min: 9, Max: 15, Average: 11; Count conversations per persona-arc combination: Many combinations: 0-2 conversations (insufficient coverage), Few combinations: 5+ conversations (good coverage); Flag combinations with <3 conversations: "⚠️ Low Coverage: Pragmatic Skeptic + Anxiety (2 conversations)", "Model may not generalize well to this combination due to limited training data"
    - **Actionable Recommendations Generation**: Algorithm analyzes category results and generates specific recommendations: **Recommendation Type 1: Low Improvement Categories**: IF persona_improvement < 25%: "Add 10+ more '{persona}' conversations to improve model performance for this client type (currently {X}% improvement, target ≥30%)"; IF emotional_arc_improvement < 25%: "Focus on '{emotional_arc}' scenarios. Current improvement ({X}%) below target. Add 5-8 conversations with this arc."; IF topic_improvement < 28%: "'{topic}' shows lower improvement ({X}%). Consider: Adding specialized training data for this topic, Reviewing existing conversations for quality issues, Consulting subject matter expert to improve conversation realism"; **Recommendation Type 2: Data Gaps**: IF persona_arc_combination_count < 3: "Low coverage for '{persona} + {emotional_arc}' (only {count} conversations). Add 5+ conversations with this combination to improve generalization."; **Recommendation Type 3: Best Practices**: Identify highest-performing combinations: "'{persona} + {emotional_arc}' achieves {X}% improvement (best performance). This combination serves as quality benchmark. Use similar conversation structures for other categories."; **Recommendation Type 4: Sample Size Issues**: IF persona_count < 8: "Only {count} '{persona}' conversations in validation set. Consider adding more to increase statistical confidence."; Display recommendations section: "📊 Data-Driven Recommendations for Next Training Run:", Numbered list of 5-10 actionable recommendations, Prioritized by impact: Critical (blocks production), High impact (significantly improves quality), Medium impact (incremental improvement); Each recommendation includes: Issue description, Current metrics, Target metrics, Specific action, Expected impact
    - **Category Analysis Export**: "Export Category Analysis" button: CSV format includes all granular data: **Persona-level**: persona, baseline_ppl, trained_ppl, improvement_pct, conversation_count; **Emotional Arc-level**: emotional_arc, baseline_ppl, trained_ppl, improvement_pct, conversation_count; **Topic-level**: topic, baseline_ppl, trained_ppl, improvement_pct, conversation_count; **Persona-Arc Matrix**: All combinations with improvement scores; **Per-Conversation Detail**: conversation_id, persona, emotional_arc, topic, baseline_ppl, trained_ppl, improvement_pct; Filename: `training-job-{id}-category-analysis-{timestamp}.csv`; PDF report includes: Summary tables for each category type, Heatmap visualization (full-color rendered), Recommendations section, Statistical analysis (standard deviations, confidence intervals if sufficient sample size)
    - **Insights for Future Training**: System learns from category analysis across multiple jobs: Store category performance: INSERT INTO category_performance_history (training_file_id, job_id, persona, emotional_arc, topic, improvement_pct); Aggregate insights: "Across all training runs for this file:", "Anxious Investor persona: Average 38% improvement (consistently strong)", "Pragmatic Skeptic persona: Average 24% improvement (consistently weak - needs more data)", "Triumph arc: Average 33% improvement (strong)", "Anxiety arc: Average 27% improvement (acceptable but could improve)"; Proactive suggestions during training file creation: When user creates new training file: "💡 Insight: Based on historical data, 'Pragmatic Skeptic' conversations typically show lower improvement. Consider adding 15+ Pragmatic Skeptic conversations (currently have 8) to achieve optimal results."; Smart training file recommendations: "Recommended persona distribution for optimal quality: Anxious Investor: 15-20%, Pragmatic Skeptic: 20-25% (needs more to reach parity), Hopeful Planner: 15-20%, Overwhelmed Procrastinator: 15-20%, Detail-Oriented Analyzer: 15-20%"
    - **Comparison Across Training Runs**: If user has multiple completed jobs with same training file: Display trend charts: "Perplexity Improvement by Persona Over Time", Line graph: X-axis: Job date, Y-axis: Improvement %, Separate line per persona, Identify improvements: "Pragmatic Skeptic improvement increased from 22% (first run) to 28% (this run) after adding 10 more conversations", Or identify regressions: "Anxious Investor dropped from 42% to 35% - investigate why (different hyperparameters? data quality change?)"; Use comparisons to validate training strategies: "Adding 10 Pragmatic Skeptic conversations improved this persona's performance by +6 percentage points. Strategy validated."

- **FR6.2.1:** Run Emotional Intelligence Benchmarks
  * Description: System shall implement comprehensive emotional intelligence evaluation using curated 50-scenario test suite covering empathy detection, emotional awareness, supportive responses, and conflict handling with difficulty stratification, generating responses from both baseline and trained models for side-by-side comparison, scoring responses across empathy, clarity, and appropriateness dimensions using automated LLM-as-judge methodology with human validation sampling, calculating aggregate improvements, presenting before/after examples showcasing quality gains, assigning quality tier badges based on improvement thresholds, and exporting detailed evaluation results to provide objective EI metrics for client proof, sales enablement, and quality assurance.
  * Impact Weighting: Client Proof / Quality Assurance / Sales Enablement
  * Priority: High
  * User Stories: US6.2.1
  * User Journey: UJ5.3.1 (EI Benchmark Evaluation), UJ5.3.2 (Client Quality Demonstration)
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
    - **EI Test Suite Management**: Test suite stored in database: ei_test_scenarios table with fields (scenario_id, category, difficulty, persona, prompt, ideal_response_characteristics, evaluation_criteria), 50 scenarios curated by domain experts covering financial advisor emotional intelligence situations, Scenario categories: Empathy Detection (15): Recognizing client emotions from subtle cues, Emotional Awareness (15): Demonstrating understanding of client emotional state, Supportive Responses (10): Providing comfort and reassurance, Conflict Handling (10): De-escalating tense situations; Difficulty stratification: Easy (20): Clear emotional signals, straightforward responses needed, Medium (20): Nuanced emotions, requires balance of multiple factors, Hard (10): Complex emotional situations, high stakes, multiple conflicting needs; Test suite versioning: v1.0 initial suite, periodic updates with new scenarios based on real client interactions
    - **Baseline Model Evaluation**: After perplexity calculation completes, run EI benchmarks, Load baseline Llama 3 70B (no adapters), For each of 50 scenarios: Generate response: model(scenario_prompt), Max tokens: 250, Temperature: 0.7 (slight randomness for natural responses), Store baseline_response in ei_evaluation_results table; Processing time: ~10-15 minutes for 50 scenarios
    - **Trained Model Evaluation**: Load trained model (base + LoRA adapters), Generate 50 responses with identical settings, Store trained_response; Side-by-side storage: scenario_id, baseline_response, trained_response for comparison
    - **Automated LLM-as-Judge Scoring**: Use GPT-4 or Claude as evaluator (cost-effective, consistent): For each scenario response pair: Evaluation prompt template: "You are evaluating financial advisor responses for emotional intelligence. Rate the following response on a 1-5 scale for each dimension: [Scenario Context: {scenario}], [Response to Evaluate: {response}], [Dimensions], Empathy (1-5): Does the response recognize and validate the client's emotions?, Criteria: 1=Ignores emotions, 3=Acknowledges emotions, 5=Deeply validates and reflects emotions, Clarity (1-5): Is the explanation clear and understandable?, Criteria: 1=Confusing/jargon-heavy, 3=Clear but basic, 5=Crystal clear with examples, Appropriateness (1-5): Does the tone match the situation?, Criteria: 1=Tone mismatch, 3=Appropriate tone, 5=Perfectly calibrated tone, [Provide scores in JSON format: {empathy: X, clarity: Y, appropriateness: Z, reasoning: '...'}]"; Send to LLM API, parse JSON response, Store scores; Repeat for both baseline and trained responses; Processing: ~20-30 minutes for 100 responses (50 baseline + 50 trained)
    - **Human Validation Sampling** (quality check): Randomly sample 10 of 50 scenarios (20%), Human reviewer independently scores the 10 scenario responses, Compare human scores vs LLM-as-judge scores, Calculate inter-rater reliability (Cohen's kappa or correlation), If reliability >0.7: LLM-as-judge validated, use for all scenarios, If reliability <0.7: Flag for review, may need human scoring for more scenarios; Periodic human validation ensures LLM scoring remains accurate
    - **Aggregate Score Calculation**: For each dimension (empathy, clarity, appropriateness): baseline_avg = AVG(baseline_scores for dimension), trained_avg = AVG(trained_scores for dimension), improvement_pct = ((trained_avg - baseline_avg) / baseline_avg) × 100; Overall EI score: overall_baseline = AVG(empathy, clarity, appropriateness scores), overall_trained = AVG(empathy, clarity, appropriateness scores), overall_improvement_pct = ((overall_trained - overall_baseline) / overall_baseline) × 100; Store: UPDATE training_jobs SET ei_baseline_score = overall_baseline, ei_trained_score = overall_trained, ei_improvement_pct = overall_improvement_pct
    - **Results Display on Job Details**: **EI Benchmark Card**: Header: "Emotional Intelligence Benchmarks", Quality badge: Large tier badge based on improvement %; Overall EI Score section: "3.2/5 → 4.5/5 = 41% improvement" (large, prominent), Visualization: Horizontal bar showing baseline (gray) vs trained (green) with improvement arrow; Dimension Breakdown (3 sub-cards): Empathy: "3.1/5 → 4.6/5 (48% improvement) ↑", Clarity: "3.4/5 → 4.5/5 (32% improvement) ↑", Appropriateness: "3.1/5 → 4.4/5 (42% improvement) ↑"; Radar chart: 3-axis radar (empathy, clarity, appropriateness), Baseline (blue outline), Trained (green filled), Visual shows improvement across all dimensions
    - **Quality Tier Classification**: IF ei_improvement_pct >= 40: tier = 'exceptional', badge = "✓ Exceptional EI", color = dark_green, message = "Model demonstrates exceptional emotional intelligence improvements. Ideal for client-facing applications."; ELSIF ei_improvement_pct >= 30: tier = 'strong', badge = "✓ Strong EI", color = green, message = "Model shows strong emotional intelligence. Ready for production."; ELSIF ei_improvement_pct >= 20: tier = 'moderate', badge = "⚠ Moderate EI", color = yellow, message = "Model meets minimum EI standards. Review before client deployment."; ELSE: tier = 'needs_improvement', badge = "✗ Needs Improvement", color = red, message = "EI improvement insufficient. Consider retraining with more emotionally-focused training data."
    - **Before/After Examples Section**: Display top 10 improvements (highest score delta): For each example: Scenario prompt (truncated): "Client anxious about market volatility asks: 'Should I sell everything?'", Baseline response (card): "Market volatility is normal. Diversification helps manage risk. Consider your long-term goals.", Baseline scores: "Empathy: 2/5, Clarity: 3/5, Appropriateness: 3/5, Total: 2.7/5"; Trained response (card): "I hear your concern - market volatility can be really unsettling, especially when your financial future feels at stake. Let's take a breath together and look at your specific situation. First, selling everything now could lock in losses. Your portfolio is diversified across [sectors], which cushions volatility. We built this strategy for exactly these moments. What if we review your goals and timeline together? Often, staying the course is the wisest path, but I want to make sure you feel confident in that decision.", Trained scores: "Empathy: 5/5 (validates emotions explicitly), Clarity: 4/5 (clear explanation with specifics), Appropriateness: 5/5 (reassuring yet honest tone), Total: 4.7/5"; Improvement: "+2.0 points (74% improvement)", Improvement notes: "Trained model explicitly validates anxiety, provides specific portfolio details, offers collaborative problem-solving, uses reassuring language while being realistic"; "View All 50 Scenarios" link expands to full comparison table
    - **Category-Level Analysis**: Break down by scenario category: Empathy Detection (15 scenarios): 3.0 → 4.6 (53% improvement) - Strongest area, Emotional Awareness (15): 3.3 → 4.5 (36% improvement), Supportive Responses (10): 3.1 → 4.4 (42% improvement), Conflict Handling (10): 3.4 → 4.3 (26% improvement) - Weakest area; Insights: "Model excels at empathy detection and supportive responses but shows lower improvement in conflict handling. Consider adding more conflict resolution training scenarios."; Difficulty-Level Analysis: Easy (20): 3.8 → 4.7 (24% improvement), Medium (20): 3.1 → 4.5 (45% improvement), Hard (10): 2.6 → 4.2 (62% improvement); Insight: "Model shows greatest improvement on hard scenarios, suggesting strong learning of complex emotional intelligence patterns"
    - **Export EI Evaluation Results**: CSV export includes all 50 scenarios: Columns: scenario_id, category, difficulty, prompt, baseline_response, trained_response, baseline_empathy, baseline_clarity, baseline_appropriateness, baseline_total, trained_empathy, trained_clarity, trained_appropriateness, trained_total, improvement_points, improvement_pct, improvement_notes; Filename: `training-job-{id}-ei-benchmarks-{timestamp}.csv`; PDF Report: Executive summary with overall scores and tier, Category breakdown with insights, Top 10 before/after examples (formatted nicely), Full scenario comparison table (appendix), Methodology explanation, Recommendations for future training; Include in validation artifact bundle
    - **Client Sales Enablement**: EI benchmark results designed for client presentations: Professional PDF report with Bright Run branding, Executive summary suitable for C-suite: "Your custom AI financial advisor achieved 41% improvement in emotional intelligence, exceeding industry benchmarks. This translates to more empathetic client interactions, higher satisfaction, and stronger trust."; Before/after examples demonstrate tangible value: "See the difference: Your AI now recognizes client anxiety and responds with validation and specific reassurance, unlike generic baseline responses."; Benchmarking context: "Target: 30% improvement, Your model: 41% improvement (37% above target), Industry average: 28% improvement"; Use case scenarios: "This level of emotional intelligence enables your AI to: Handle anxious clients during market downturns, Build trust with skeptical new clients, Provide appropriate reassurance without minimizing concerns, De-escalate tense situations professionally"; ROI connection: "Higher EI = Higher client satisfaction = Better retention = Increased lifetime value"
    - **Integration with Perplexity Results**: Combined quality dashboard shows: Technical Quality (Perplexity): 31% improvement, Emotional Quality (EI): 41% improvement, Overall Quality Score: (31 + 41) / 2 = 36% (weighted average or custom formula); Holistic quality badge: "✓ Exceptional Quality (36% overall improvement)", Production readiness: Both perplexity AND EI meet thresholds → green light for deployment; If one metric below threshold: "⚠ Mixed Quality: Perplexity excellent (31%) but EI needs improvement (18%). Consider retraining with emotionally-focused conversations."

- **FR6.2.2:** Emotional Intelligence Regression Detection
  * Description: System shall implement comprehensive regression detection by comparing trained model EI scores against baseline scores scenario-by-scenario, identifying instances where training degraded performance, classifying regression severity (minor <10%, moderate 10-20%, major >20%), analyzing regression patterns across personas and categories, implementing quality gates blocking delivery for excessive regressions, generating root cause analysis reports, providing corrective action recommendations, and maintaining regression audit trails to protect against catastrophic forgetting, ensure training improvements are genuine across all scenarios, and prevent deployment of models with degraded emotional intelligence in critical areas.
  * Impact Weighting: Quality Assurance / Risk Mitigation / Client Protection
  * Priority: Medium
  * User Stories: US6.2.2
  * User Journey: UJ5.4.1 (Regression Detection), UJ5.4.2 (Quality Gate Enforcement)
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
    - **Regression Detection Logic**: For each of 50 EI scenarios: Calculate score_delta = trained_score - baseline_score, IF score_delta < 0: Flag as regression, Calculate regression_pct = (ABS(score_delta) / baseline_score) × 100, Store: INSERT ei_regressions (job_id, scenario_id, baseline_score, trained_score, regression_pct, severity); Count total regressions: regression_count / 50 scenarios = regression_rate
    - **Severity Classification**: For each regression: IF regression_pct < 10 AND trained_score >= 4.0: severity = 'minor', risk = 'low', message = "Minor regression, overall quality still high"; ELSIF regression_pct >= 10 AND regression_pct < 20: severity = 'moderate', risk = 'medium', message = "Moderate regression, review scenario before deployment"; ELSIF regression_pct >= 20 OR trained_score < 3.0: severity = 'major', risk = 'high', message = "Major regression, critical quality degradation detected"; Store severity classification
    - **Regression Report Display**: Regression Summary Card on validation dashboard: Header: "Regression Detection", Total regressions: "3 of 50 scenarios (6%)", Severity breakdown: "Minor: 2, Moderate: 1, Major: 0", Overall status badge: Green if <10% and no major, Yellow if 10-15% or 1 moderate, Red if >15% or any major; Detailed Regression List (table): Scenario ID | Category | Baseline Score | Trained Score | Regression % | Severity; Example rows: "#23 | Empathy | 4.2/5 | 3.8/5 | -10% | Moderate 🟡", "#37 | Conflict | 3.9/5 | 3.6/5 | -8% | Minor 🟢", "#42 | Supportive | 4.1/5 | 3.9/5 | -5% | Minor 🟢"; Click scenario row expands details: Scenario prompt, Baseline response, Trained response, Score breakdown per dimension, Regression reasoning: "Trained response less empathetic, more clinical tone"
    - **Root Cause Pattern Analysis**: Aggregate regressions by category: Query: SELECT category, COUNT(*) as regression_count FROM ei_regressions GROUP BY category ORDER BY regression_count DESC; Example results: "Conflict Handling: 2 regressions (67% of all regressions)", "Empathy Detection: 1 regression", Insight: "Most regressions in Conflict Handling category suggests model struggles with this scenario type. May need more conflict-focused training data."; Aggregate by persona: "Pragmatic Skeptic: 2 regressions (out of 12 scenarios with this persona = 17% regression rate)", "Anxious Investor: 1 regression (out of 15 scenarios = 7%)", Insight: "Pragmatic Skeptic scenarios show 2.4× higher regression rate than average. Model may be overfitting to other personas at expense of Skeptics."; Aggregate by difficulty: "Hard scenarios: 0 regressions", "Medium: 2 regressions", "Easy: 1 regression", Insight: "Regressions mostly in medium-difficulty scenarios. May indicate model overcomplicates simple situations."
    - **Quality Gate Enforcement**: Quality gate rules: PASS (Green Light - Allow Delivery): regression_rate < 10% (fewer than 5 of 50 scenarios), AND no major regressions, AND overall_ei_improvement >= 20%; WARN (Yellow Light - Requires Review): regression_rate >= 10% AND < 15%, OR 1-2 moderate regressions, OR overall_ei_improvement 15-19%; BLOCK (Red Light - Block Delivery): regression_rate >= 15% (8+ scenarios regressed), OR any major regression (>20% degradation), OR overall_ei_improvement < 15%; Quality gate display: Banner at top of validation results: "✓ Quality Gate: PASSED - Model approved for delivery" (green), "⚠ Quality Gate: REVIEW REQUIRED - 3 minor regressions detected. Team review recommended before client delivery." (yellow), "✗ Quality Gate: BLOCKED - Excessive regressions detected (8 scenarios). Model not approved for production." (red); If BLOCKED: Disable "Approve for Delivery" button, Require: addressing regressions, or manager override with justification; If WARN: "Approve for Delivery" enabled but requires acknowledgment: "☐ I have reviewed the 3 regression scenarios and approve delivery despite minor quality concerns"
    - **Corrective Action Recommendations**: System generates specific recommendations based on regression patterns: **Recommendation 1: Training Data Augmentation**: "Add 10-15 more '{category}' scenarios to training data, focusing on '{persona}' client type (2 of 3 regressions involve this combination)"; **Recommendation 2: Hyperparameter Adjustment**: "Current learning rate (0.0003) may be too high, causing overfitting to certain patterns. Retry with Conservative preset (lr=0.0002) to reduce overfitting."; **Recommendation 3: Training Data Quality Review**: "Review quality of existing '{category}' training conversations. Regressions may indicate inconsistent or contradictory training examples."; **Recommendation 4: Extended Training**: "Model shows good overall improvement but some regressions. Consider adding 1 additional epoch with reduced learning rate for fine-tuning."; **Recommendation 5: Accept Trade-off**: "Overall improvement (41%) far exceeds minor regressions (3 scenarios, -5-10%). Trade-off acceptable for production deployment. Monitor real-world performance."; Each recommendation includes: Issue description, Root cause hypothesis, Specific action, Expected impact, Priority (critical/high/medium/low)
    - **Regression Trend Tracking**: Store regression data across multiple training runs: INSERT ei_regression_history (training_file_id, job_id, regression_count, regression_rate, major_regression_count, timestamp); Track trends: "Previous run: 2 regressions (4%), This run: 3 regressions (6%) - increased", "After adding 10 Pragmatic Skeptic conversations: Pragmatic Skeptic regression rate 17% → 8% (improved)"; Display trend chart: X-axis: Job date, Y-axis: Regression rate %, Line shows regression rate over time, Target line at 10% threshold; Insights: "Regression rate increasing over time may indicate training data quality declining or model complexity increasing.", "Successful mitigation: Adding targeted training data reduced regressions from 12% to 6%"
    - **Regression Audit Trail**: All regressions logged for compliance and analysis: Table: ei_regression_audit with fields: job_id, scenario_id, detected_at, severity, reviewed_by (user_id), review_notes, resolution_action, resolved_at; Manager review workflow: If WARN or BLOCK status: Assign to quality manager for review, Manager reviews regressed scenarios: Views baseline vs trained responses, Assesses whether regression is acceptable trade-off, Documents decision: "Regression acceptable - overall EI improvement (41%) outweighs 3 minor regressions. Approved for delivery.", Or: "Regression unacceptable - retrain with corrective actions applied."; Audit trail shows: Who approved delivery despite regressions, What justification provided, When approval granted
    - **Catastrophic Forgetting Detection**: Extreme case: If overall_ei_score decreases (trained < baseline): Flag as "Catastrophic Forgetting - Training Degraded Model Quality", Display: "🚨 Critical Issue: Trained model performs worse than baseline (3.2 → 2.8, -13% overall)", Automatic BLOCK status, no override allowed, Require complete retraining: "This model cannot be deployed. Training process may have issues: Excessive learning rate, Contradictory training data, Insufficient training data, Model capacity too small"; Rare but critical check to prevent deploying worse-than-baseline models
    - **Export Regression Report**: Include in validation PDF report: Regression Summary section with counts and severity breakdown, Detailed Regression List table with all regressed scenarios, Root Cause Analysis with identified patterns, Corrective Action Recommendations prioritized list, Quality Gate Status and approval/block decision; CSV export: regression_details.csv with all regressed scenarios and scores; Use in continuous improvement: "Regression Analysis Report: Pattern identified - Conflict Handling scenarios consistently show higher regression rates across multiple training runs. Action: Create specialized Conflict Handling training module with 25+ scenarios."

- **FR6.3.1:** Financial Knowledge Retention Test
  * Description: System shall implement comprehensive financial knowledge retention testing using 100-question curated test suite covering taxes, retirement, investing, and insurance across difficulty levels, evaluating both baseline and trained models with objective multiple-choice grading, calculating retention rates as ratio of trained accuracy to baseline accuracy, applying threshold classifications (passed ≥95%, warning 90-94%, failed <90%), analyzing failed questions to identify knowledge gaps, implementing quality gates blocking deployment for retention below 90%, and providing corrective action recommendations to prevent catastrophic forgetting and ensure fine-tuning enhances domain-specific capabilities without degrading foundational financial knowledge.
  * Impact Weighting: Quality Assurance / Risk Mitigation / Client Trust
  * Priority: Medium
  * User Stories: US6.3.1
  * User Journey: UJ5.5.1 (Knowledge Retention Testing), UJ5.5.2 (Catastrophic Forgetting Prevention)
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
    - **Knowledge Test Suite Management**: 100 financial knowledge questions stored in database: knowledge_test_questions table with fields (question_id, category, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, source); Categories: Taxes (25 questions): Tax brackets, deductions, retirement account tax implications, Retirement Planning (25): 401k rules, Social Security, RMDs, withdrawal strategies, Investing (25): Asset allocation, risk management, diversification, market fundamentals, Insurance (25): Life insurance types, policy features, estate planning implications; Difficulty distribution: Basic (40): Fundamental concepts any financial professional should know, Intermediate (40): Practical application, nuanced understanding, Advanced (20): Complex scenarios, deep expertise; Multiple-choice format: 4 options (A/B/C/D), single correct answer, Objective grading (eliminates scoring subjectivity); Test suite curated by certified financial planners, validated for accuracy and relevance
    - **Baseline Model Evaluation**: Load baseline Llama 3 70B (no adapters), For each of 100 questions: Prompt format: "Answer the following financial question. Select the correct option (A, B, C, or D). Question: {question_text}, Options: A) {option_a}, B) {option_b}, C) {option_c}, D) {option_d}, Answer:", Extract model's selected option from response (parse for A/B/C/D), Compare to correct_answer, Store: baseline_answer, baseline_correct (boolean); Calculate baseline_accuracy = (correct_answers / 100) × 100; Typical baseline: 85-90% for Llama 3 70B (strong foundational financial knowledge)
    - **Trained Model Evaluation**: Load trained model (base + LoRA adapters), Run identical 100 questions with same prompts, Extract trained_answer, trained_correct for each question, Calculate trained_accuracy = (correct_answers / 100) × 100; Expected trained: 83-90% (should maintain similar accuracy, slight drop acceptable)
    - **Retention Rate Calculation**: Retention rate = (trained_accuracy / baseline_accuracy) × 100, Example: Baseline 87%, Trained 85% → Retention = (85 / 87) × 100 = 97.7% ≈ 98%; Interpretation: Retention rate measures how well model preserves baseline knowledge, 100% = perfect retention (same accuracy), >100% = improved knowledge (rare but possible), <90% = significant forgetting (problematic); Store: UPDATE training_jobs SET knowledge_baseline_accuracy = 87.0, knowledge_trained_accuracy = 85.0, knowledge_retention_rate = 97.7
    - **Threshold Classification**: IF retention_rate >= 95: status = 'passed', badge = "✓ Passed", color = green, message = "Model retains 95%+ of baseline financial knowledge. No catastrophic forgetting detected."; ELSIF retention_rate >= 90: status = 'warning', badge = "⚠ Warning", color = yellow, message = "Minor knowledge loss detected (90-94% retention). Review before deployment."; ELSE: status = 'failed', badge = "✗ Failed", color = red, message = "Significant knowledge loss detected (<90% retention). Catastrophic forgetting may have occurred."
    - **Results Display**: Knowledge Retention Card on validation dashboard: Header: "Financial Knowledge Retention Test", Status badge: Large badge with retention verdict; Accuracy Comparison section: Baseline Accuracy: "87/100 (87%)", Trained Accuracy: "85/100 (85%)", Difference: "↓ 2 questions (-2%)" visual indicator; Retention Rate: Huge number: "98%" (color-coded: green if ≥95%, yellow if 90-94%, red if <90%), Target: "Target: ≥95% (passed)", Interpretation: "Model retained 98% of baseline financial knowledge"; Category Breakdown (4 sub-sections): Taxes: "Baseline 84% (21/25), Trained 80% (20/25), Retention 95%", Retirement: "Baseline 88% (22/25), Trained 84% (21/25), Retention 95%", Investing: "Baseline 88% (22/25), Trained 88% (22/25), Retention 100%", Insurance: "Baseline 88% (22/25), Trained 88% (22/25), Retention 100%"; Visual bar chart: 4 bars (one per category), Each shows baseline (gray) vs trained (green or red) accuracy
    - **Failed Questions Analysis**: If retention < 95%: Display "Knowledge Gap Analysis" section, List questions where trained_correct = false AND baseline_correct = true (regressions): Question ID, Category, Difficulty, Question (truncated), Baseline Answer, Trained Answer, Correct Answer; Example: "#23 | Taxes | Intermediate | Tax implications of Roth conversions... | C (correct) | B (incorrect) | C"; Count regressions by category: "5 retirement planning questions regressed (baseline correct, trained incorrect)", "2 tax questions regressed"; Identify patterns: "Most regressions in Intermediate Retirement questions", "Advanced questions: No regressions (model maintains deep knowledge)", "Basic questions: 3 regressions (concerning - should be easiest to retain)"; Root cause hypothesis: IF regress ions mostly in basic questions: "Model may be overthinking simple concepts. Consider more diverse training data.", IF regressions in specific category: "Retirement planning: 5 regressions. Training data may lack retirement diversity, causing overfitting to training topics.", IF regressions random: "Random pattern suggests overfitting. Retry with lower learning rate or more regularization."
    - **Corrective Action Recommendations**: Based on retention rate and patterns: IF retention < 90: Recommendation 1: "Retry training with Conservative preset (lower learning rate reduces overfitting)", Recommendation 2: "Add dropout/regularization to prevent catastrophic forgetting", Recommendation 3: "Include knowledge retention examples in training data (mix general financial Qs with Elena-specific conversations)"; IF retention 90-94% AND category-specific regression: "Add 10-15 training conversations covering {regressed_category} topics", "{Category} retention only 88%. Balance training data to include more {category} scenarios."; IF retention 95-97%: "Model passes threshold but slight improvement possible. Consider: Adding knowledge-preserving loss term, Mixing in general financial Q&A during training"; Each recommendation includes expected impact and implementation guidance
    - **Quality Gate Enforcement**: Quality gate rules: PASS (≥95% retention): Auto-approve, no manager review needed, Model safe for deployment; WARN (90-94% retention): Require manager review and approval, Manager assesses: Severity of knowledge gaps, Business criticality of regressed topics, Overall model improvement (perplexity + EI) vs slight knowledge loss, Manager approves or rejects deployment; BLOCK (<90% retention): Automatic deployment block, Cannot override (too risky to deploy model with significant knowledge loss), Must retrain with corrective actions; Quality gate banner displays retention status and approval requirements
    - **Export Knowledge Test Results**: CSV export: knowledge_retention_details.csv, Columns: question_id, category, difficulty, question_text, baseline_answer, trained_answer, correct_answer, baseline_correct, trained_correct, regression (boolean), explanation; All 100 questions with full details; PDF Report: Executive summary with retention rate and verdict, Category-level accuracy comparison table, Regressed questions list (if any) with explanations, Recommendations section, Appendix: Full 100-question results table; Include in validation artifact bundle
    - **Integration with Other Validation Metrics**: Combined quality scorecard: Perplexity Improvement: 31% ✓, Emotional Intelligence: 41% ✓, Knowledge Retention: 98% ✓, Overall Quality: "Exceptional - All metrics pass thresholds"; If knowledge retention fails but others pass: "⚠ Mixed Quality: Excellent EI and perplexity but knowledge retention concerns. Address before deployment."; Holistic quality decision requires all metrics passing their respective thresholds
    - **Knowledge Retention Trend Tracking**: Store historical data: INSERT knowledge_retention_history (job_id, training_file_id, baseline_accuracy, trained_accuracy, retention_rate, category_breakdown, timestamp); Track trends for training file: "Previous run: 96% retention, This run: 98% retention (↑ improved)", "After adjusting hyperparameters: Retention increased from 88% to 98%"; Identify configurations that preserve knowledge best: "Balanced preset: Average 97% retention across 12 jobs", "Aggressive preset: Average 91% retention (higher forgetting risk)"; Use insights to guide future training: "💡 Recommendation: Use Balanced preset for this training file - historically maintains 97% knowledge retention while achieving 32% perplexity improvement"

- **FR6.3.2:** Domain-Specific Knowledge Probes
  * Description: System shall implement client-customizable domain-specific knowledge validation accepting client-provided test suites (50-100 questions) covering regulatory compliance, product-specific knowledge, and business-specific requirements in CSV or JSON formats, running identical evaluations on baseline and trained models, calculating retention rates with elevated thresholds for compliance-critical content (100% retention required), flagging knowledge regressions in regulated areas, blocking deployment for compliance knowledge degradation, and providing specialized validation for financial regulations, proprietary products, and client-specific workflows to ensure models maintain business-critical accuracy while gaining conversational capabilities.
  * Impact Weighting: Quality Assurance / Compliance / Business-Specific Validation
  * Priority: Low (Future Enhancement - Client-Specific)
  * User Stories: US6.3.2
  * User Journey: UJ5.6.1 (Custom Knowledge Validation - Future)
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
    - **Custom Test Suite Upload Interface**: Dashboard section: "Custom Knowledge Validation", Upload button: "Upload Custom Test Suite", Accepted formats: CSV (columns: question_id, category, criticality, question, option_a, option_b, option_c, option_d, correct_answer, explanation), JSON (structured array of question objects); Validation on upload: Check required fields present, Verify answer options valid (A/B/C/D), Confirm at least 20 questions (minimum for statistical validity); Store: custom_knowledge_tests table linked to client/team_id
    - **Criticality Classification**: Each question tagged with criticality level: Compliance (100% retention required): SEC/FINRA regulations, legal disclosures, fiduciary requirements, High (≥98% retention): Product features, pricing, eligibility rules, Medium (≥95% retention): Best practices, general procedures, Low (≥90% retention): Nice-to-know information; Client defines criticality per question during upload; System enforces differential thresholds based on criticality
    - **Evaluation Process**: Runs automatically during finalization (after standard knowledge test), Load custom test suite for client/team, Evaluate baseline and trained models identically to FR6.3.1, Calculate per-category retention rates, Apply criticality-based thresholds; Quality gate: BLOCK if any compliance question fails (trained incorrect when baseline correct), WARN if high-criticality retention <98%, PASS if all thresholds met
    - **Compliance-Specific Reporting**: Separate "Compliance Knowledge" card on validation dashboard, Red/green status: "✓ All Compliance Knowledge Retained" or "✗ Compliance Regression Detected", List any failed compliance questions with remediation requirements, Audit trail: Log all compliance evaluations for regulatory review; Export compliance-specific report for legal/compliance team review
    - **Use Cases**: Financial Firm: Upload 50 FINRA compliance questions ensuring AI doesn't violate regulations post-training, Insurance Company: Validate product knowledge retention (policy types, coverage limits, exclusions), Robo-Advisor: Test algorithmic trading rules and risk assessment knowledge, Tax Preparation Service: Verify current tax code knowledge maintained after personality training; Premium Feature: Available for Enterprise tier clients, Included in compliance-focused packages

- **FR6.4.1:** Elena Morales Voice Consistency Scoring
  * Description: System shall implement brand voice consistency evaluation using Elena Morales 10-characteristic rubric (warmth, directness, education-first, pragmatic optimism, question-driven, storytelling, action-oriented, patience, humor, confidence) by generating 30 diverse scenario responses from trained model, scoring each response across all characteristics using human evaluation or LLM-as-judge, calculating per-characteristic and overall averages, applying quality thresholds (excellent ≥90%, strong 85-89%, acceptable 80-84%), displaying before/after comparisons demonstrating voice improvement, flagging weak characteristics, and exporting detailed scorecards to validate brand alignment, ensure personality consistency, and provide client proof of brand voice acquisition.
  * Impact Weighting: Brand Alignment / Client Satisfaction / Quality Differentiation
  * Priority: Medium
  * User Stories: US6.4.1
  * User Journey: UJ5.7.1 (Brand Voice Validation)
  * Tasks: [T-6.4.1]
  * User Story Acceptance Criteria:
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
  * Functional Requirements Acceptance Criteria:
    - **Voice Rubric Definition**: 10 Elena Morales voice characteristics stored in database with scoring criteria (1-5 scale) and evaluation guidelines; Each characteristic includes: Name, Description, Scoring rubric (what qualifies as 1/2/3/4/5), Example responses for each score level, Relative importance weight (all weighted equally for Elena, but customizable per client); Rubric validated by brand team and domain experts
    - **Scenario Generation for Evaluation**: Create 30 diverse test scenarios covering: All persona types (6 scenarios each for 5 personas), All emotional arcs (5 scenarios each for 6 arcs), Various topics (retirement, taxes, investing, insurance, debt, estate), Difficulty range (easy, medium, hard), Edge cases (difficult clients, ambiguous situations, emotionally charged); Scenarios designed to elicit brand voice characteristics (e.g., scenario requiring patience, scenario requiring storytelling)
    - **Response Generation**: Load trained model (base + LoRA adapters), Generate response for each of 30 scenarios, Temperature: 0.8 (allows personality to show), Max tokens: 300 (full response), Store generated responses; Baseline comparison optional: Generate baseline responses for side-by-side comparison, Demonstrates voice acquisition (generic → Elena-specific)
    - **Evaluation Method**: **Option 1 - Human Evaluation**: 2-3 human evaluators (brand team members, domain experts) independently score each response, Score all 10 characteristics per response (300 total scores per evaluator), Average across evaluators for final scores, Inter-rater reliability calculated; **Option 2 - LLM-as-Judge** (faster, more scalable): Use GPT-4/Claude as evaluator, Provide rubric and scoring criteria in prompt, Request JSON-formatted scores with reasoning, Human validation sampling (10 responses) to verify LLM accuracy; Hybrid approach: LLM scores all 30, human reviews 10 for validation
    - **Score Aggregation**: Per-characteristic average: warmth_avg = AVG(warmth_scores across 30 responses), Repeat for all 10 characteristics, Overall voice consistency score = AVG(all 10 characteristic averages), Percentage alignment = (overall_score / 5.0) × 100; Store: UPDATE training_jobs SET voice_consistency_score = 4.3, voice_alignment_pct = 86, voice_characteristic_scores = {warmth: 4.5, directness: 4.2, ...}
    - **Results Display**: Brand Voice Consistency Card on validation dashboard, Header: "Elena Morales Voice Alignment", Overall Score: "4.3/5 (86% alignment)" large, prominent, Quality badge based on thresholds; Radar Chart Visualization: 10-axis radar (one per characteristic), Scores plotted on each axis (1-5 scale), Filled area shows voice profile, Target line at 4.0 (80% threshold); Characteristic Breakdown Table: 10 rows (one per characteristic), Columns: Characteristic | Avg Score | Rating | Status, Example: "Warmth & Empathy | 4.5/5 | Excellent | ✓", "Humor | 2.8/5 | Needs Work | ⚠"; Flag weak characteristics (<3.0): Highlighted in red, "⚠ Humor characteristic below threshold. Consider adding humorous training examples."
    - **Quality Tier Classification**: IF voice_consistency_score >= 4.5 (90%): tier = 'excellent', badge = "✓ Exceptional Brand Alignment"; ELSIF >= 4.25 (85%): tier = 'strong', badge = "✓ Strong Brand Alignment"; ELSIF >= 4.0 (80%): tier = 'acceptable', badge = "⚠ Acceptable Alignment"; ELSE: tier = 'needs_improvement', badge = "✗ Needs Improvement"
    - **Before/After Examples**: Display 5 best voice improvements, Side-by-side comparison: Scenario prompt, Baseline response (generic), Trained response (Elena voice), Voice characteristics demonstrated highlighted, Score improvement shown; Example: Scenario: "Client worried about market downturn", Baseline (3.2/5): "Market corrections are normal. Diversify your portfolio and stay invested long-term.", Trained (4.7/5): "I hear that worry - market dips can feel scary, especially when it's your hard-earned money at stake. Let me walk you through what's happening and why staying calm is your best move right now. Your diversified portfolio is actually built for moments like this..." Highlights: Warmth (validates emotion), Education-first (explains reasoning), Action-oriented (concrete guidance)
    - **Export Voice Consistency Data**: CSV: voice_consistency_details.csv, 30 responses × 10 characteristics matrix, Columns: response_id, scenario, [characteristic_1...characteristic_10], overall_score; PDF Report: Elena Morales Voice Profile (radar chart), Overall alignment score and tier, Per-characteristic breakdown table, Top 5 before/after examples, Weak characteristics and recommendations, Brand team sign-off section; Include in validation artifact bundle for client delivery

- **FR6.4.2:** Client Brand Customization (Future)
  * Description: System shall implement customizable brand voice evaluation framework enabling clients to define proprietary voice rubrics (5-15 characteristics), upload characteristic descriptions with scoring criteria and examples, configure relative importance weights, run evaluations using client-specific rubrics, generate customized brand alignment reports, and validate diverse brand personalities (formal/informal, conservative/progressive, technical/accessible) to enable Bright Run platform serving multiple clients with distinct brand identities while maintaining consistent quality assurance methodology and providing white-label validation reports matching client brand guidelines.
  * Impact Weighting: Client Customization / Brand Protection / Competitive Differentiation
  * Priority: Low (Future Enhancement - Premium Feature)
  * User Stories: US6.4.2
  * User Journey: UJ5.8.1 (Custom Brand Definition - Future)
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
    - **Custom Rubric Builder Interface**: Dashboard section: "Brand Voice Configuration", "Create Custom Rubric" button opens builder, Add characteristic form: Name (required), Description (required), Scoring criteria for 1-5 scale (required), Example responses for each score level (optional), Relative weight 1-10 (default: 5); Supports 5-15 characteristics (enforced range for validity), Save rubric linked to client/team account; Library of common characteristics with templates: Formality, Risk-awareness, Technical depth, Humor level, Urgency/pace, Authority tone, Client empowerment vs directive guidance
    - **Evaluation Execution**: Uses identical methodology as FR6.4.1 but with client's custom rubric, Generates 30 responses, Scores using custom characteristics, Calculates weighted average if weights specified, Produces brand-specific report with client logo and terminology; Example: Conservative Financial Firm rubric: "Risk Disclosure" (weight 10), "Formal Tone" (weight 8), "Regulatory Compliance Language" (weight 10), "Technical Accuracy" (weight 7), "Conservative Recommendations" (weight 9); Evaluation ensures model aligns with firm's conservative, compliance-focused brand vs Elena's warm, approachable style
    - **Use Cases**: Enterprise financial institutions with established brand guidelines, Robo-advisors with distinct market positioning, Insurance companies with formal compliance requirements, FinTech startups with casual, tech-forward voice; Premium feature: Available for Enterprise tier, Included in white-label packages, Enables Bright Run serving diverse client brands simultaneously

## 7. Cost Management & Budget Control

- **FR7.1.1:** Live Cost Accumulation Display
  * Description: System shall implement real-time cost tracking displaying current spend, hourly rates, elapsed time, cost estimate comparisons, and projected final costs through prominent dashboard card with automatic 60-second updates, calculating costs as elapsed GPU hours multiplied by pricing tier rates plus spot interruption overhead, providing visual indicators (green <80%, yellow 80-100%, red >100%), triggering threshold-based warnings (80%, 100%, 120%), offering immediate cancellation access, and showing itemized cost breakdowns (GPU compute, interruption overhead, storage) to enable continuous cost monitoring, budget awareness, proactive intervention, and informed continuation decisions during active training.
  * Impact Weighting: Cost Control / Budget Awareness / User Empowerment
  * Priority: High
  * User Stories: US7.1.1
  * User Journey: UJ7.1.1 (Live Cost Monitoring), UJ7.1.2 (Cost-Based Decisions)
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
    - **Cost Tracker Card Placement**: Positioned prominently on job dashboard, top-right quadrant above metrics display, visible without scrolling (above fold), card size: 350px × 280px (responsive), sticky positioning: Remains visible during scroll on desktop
    - **Card Header**: "Cost Tracking" title with 💰 icon, Last updated timestamp: "Updated 23 seconds ago" (relative time), Refresh indicator: Small spinner when fetching updates
    - **Primary Cost Display**: **Current Spend**: Large, bold: "$22.18", Progress indicator: "49% of estimate" (circular progress ring or bar), Visual color based on threshold: Green (<80%), Yellow (80-100%), Red (>100%); **Estimated Cost Range**: "Estimated: $45-55" (smaller text, gray), Comparison indicator: "↓ $2.82 below estimate" (if under) or "↑ $4.18 over estimate" (if over); **Hourly Rate**: "Rate: $2.49/hr (spot)" with GPU type indicator (Spot/On-Demand badge), Comparison to on-demand: "vs $7.99/hr on-demand (saving $5.50/hr)"
    - **Elapsed Time Display**: "Elapsed: 6h 23m" with timer icon, Live countdown timer (client-side, updates every second), Breakdown: "Active: 6h 15m, Paused: 8m" (if applicable)
    - **Projected Final Cost**: "Projected: $47.32" (calculated based on remaining steps and current rate), Variance indicator: "±15% confidence" (based on historical accuracy), Completion estimate: "Est. final in 8h 15m → Total: $47.32"
    - **Cost Calculation Engine**: Active GPU time: elapsed_hours = (NOW() - job_started_at - total_paused_minutes) / 60, GPU compute cost = elapsed_hours × gpu_hourly_rate (spot: $2.49/hr, on-demand: $7.99/hr for H100); Spot interruption overhead: Per interruption: recovery_time_minutes = resumed_at - interrupted_at (typically 5-10 min), overhead_cost = (SUM(recovery_time_minutes) / 60) × spot_hourly_rate, Total interruption cost = overhead_cost × interruption_count; Storage costs: Checkpoint storage: $0.00 (included in base pricing, negligible), Artifact storage: $0.00 (first 100GB free); Total Current Cost = gpu_compute_cost + interruption_overhead_cost + storage_cost; Store: UPDATE training_jobs SET current_cost = 22.18, cost_updated_at = NOW()
    - **Update Frequency**: Automatic updates every 60 seconds via polling: Frontend polls GET /api/training-jobs/{id}/cost-metrics every 60s, Backend calculates current cost and returns JSON, Frontend updates display without full page reload; Or WebSocket (preferred for real-time): Server pushes cost updates to connected clients when cost changes significantly (>$0.50 delta), Reduces server load, provides instant updates; Loading state: Skeleton/shimmer effect while fetching, Never blocks user interaction
    - **Visual Threshold Indicators**: **Green Zone (<80% of estimate)**: Card border: Green (2px), Progress ring/bar: Green fill, Icon: ✓ checkmark, Message: "On track" or "Within budget"; **Yellow Zone (80-100% of estimate)**: Card border: Yellow/orange (2px), Progress ring/bar: Yellow fill, Icon: ⚠️ warning triangle, Message: "Approaching estimate", Alert banner (dismissable): "Job at 87% of estimated cost. Monitor closely."; **Red Zone (>100% of estimate)**: Card border: Red (3px, thicker), Progress ring/bar: Red fill, Icon: ⚠️ or 🚨, Message: "Over budget", Alert banner (persistent, not dismissable): "Job exceeded estimate by $4.18. Consider cancelling or adjusting."
    - **Threshold Warning Alerts**: **80% Threshold Alert**: Triggered when current_cost >= (estimated_cost_min × 0.8), In-app notification banner: "Job approaching cost estimate ($36 of $45). Monitor closely.", Email notification (if user opted-in): Subject: "Training Cost Alert: 80% of estimate", Body: Job name, current cost, estimated cost, link to dashboard, Slack notification (if configured); **100% Threshold Alert**: Triggered when current_cost >= estimated_cost_max, Banner: "Job exceeded cost estimate ($46 of $45). Consider cancelling if necessary.", Email: Subject: "[Action Required] Training Cost Exceeded Estimate", Slack: Urgent channel post with @mention; **120% Threshold Alert**: Triggered when current_cost >= (estimated_cost_max × 1.2), Banner: "Job significantly over budget ($54 of $45). Review immediately.", Email: High priority flag, Slack: @channel mention in critical alerts channel, Push notification (mobile)
    - **Immediate Cancellation Access**: "Cancel Job" button prominently displayed within Cost Tracker Card, Positioned below cost details, always visible, Button styling: Destructive appearance (red outline), disabled appearance if job not active, Click opens quick cancellation modal: "Cancel Training?", Simplified modal: Job name, current cost, "Cancel" and "Continue Training" buttons, No extensive form (quick action for cost concerns), Confirmation: Immediate job termination, final cost locked at current amount
    - **Cost Breakdown Expandable Section**: "View Cost Breakdown" link/button expands detailed itemization, **GPU Compute Cost**: Hours breakdown: "Active training: 6h 15m @ $2.49/hr = $15.57", Model loading: "15 min @ $2.49/hr = $0.62", Preprocessing: "5 min @ $2.49/hr = $0.21", Total GPU: "$16.40"; **Spot Interruption Overhead**: List each interruption: "Interruption #1: 8 min recovery @ $2.49/hr = $0.33", "Interruption #2: 10 min recovery @ $2.49/hr = $0.42", Total interruptions: "$0.75"; **Storage Costs**: Checkpoints: "4.2GB stored = $0.00 (included)", Training artifacts: "0.5GB = $0.00 (included)", Total storage: "$0.00"; **Grand Total**: "$17.15" (sum of all components), Matches "Current Spend" display
    - **Cost Comparison to On-Demand**: "Savings vs On-Demand" section shows: If using spot: "On-demand equivalent: $52.82 (6.25hrs @ $7.99/hr)", "Your savings: $30.64 (58% cheaper)", green highlight; If using on-demand: "Cost with spot: $16.40 (estimated)", "Premium paid: $36.42 for guaranteed completion", no savings, but reliability benefit noted
    - **Historical Cost Tracking**: Store cost snapshots every 5 minutes: INSERT cost_history (job_id, timestamp, current_cost, elapsed_hours, gpu_rate), Use for projection accuracy, Display mini line chart in cost card: X-axis: Time, Y-axis: Cost, Shows cost accumulation curve (should be roughly linear), Helps identify anomalies (sudden cost spike = issue)
    - **Mobile Responsive Design**: Desktop (>768px): Full card with all details visible; Tablet (768-1023px): Slightly condensed, breakdown collapsed by default; Mobile (<768px): Simplified view: Current cost (large), estimate comparison, elapsed time, "View Details" expands full breakdown, Cancel button prominent
    - **Accessibility**: Cost amounts announced to screen readers: "Current cost: $22.18, which is 49% of estimated cost", Visual indicators supplemented with text labels (not color-only), Keyboard navigation: Tab through card elements, Enter to expand breakdown, Screen reader updates when cost changes significantly (>$5 delta), High contrast mode support
    - **Performance Optimization**: Cost calculation performed server-side (not client-side to avoid drift), Cached for 60 seconds (no need for more frequent recalc), Optimized database queries: SELECT started_at, paused_minutes, interruption_count, gpu_pricing_tier FROM training_jobs WHERE id = {id}, Minimal payload: Only essential data sent to frontend (not full job object)

- **FR7.1.2:** Cost vs Time Remaining Projection
  * Description: System shall implement intelligent cost and time projection using historical step completion rates, calculating average time per step from completed work, estimating remaining duration by multiplying remaining steps by average step time, projecting final costs by adding current spend to estimated remaining costs, displaying projections with confidence intervals based on variance, providing scenario analysis (best/expected/worst case), offering decision support recommendations when projections exceed thresholds, tracking projection accuracy against actual outcomes, and continuously improving projection algorithms using historical data to enable proactive budget management and informed continuation or cancellation decisions.
  * Impact Weighting: Budget Planning / Informed Decision-Making / Cost Control
  * Priority: Medium
  * User Stories: US7.1.2
  * User Journey: UJ7.2.1 (Cost Projections), UJ7.2.2 (Completion Forecasting)
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
    - **Projection Algorithm - Time Remaining**: Query current training progress: current_step, total_steps, training_started_at, current_epoch, total_epochs; Calculate completed steps: steps_completed = current_step, steps_remaining = total_steps - current_step; Calculate average time per step: training_elapsed_seconds = (NOW() - training_started_at) - paused_time - interruption_downtime, avg_seconds_per_step = training_elapsed_seconds / steps_completed (only if steps_completed > 50 for statistical validity); Estimate remaining time: remaining_seconds = steps_remaining × avg_seconds_per_step, remaining_hours = remaining_seconds / 3600; Adjust for finalization overhead: Add 15 minutes for model saving, artifacts upload, validation (if enabled +20 min), total_remaining_hours = remaining_hours + overhead_hours; Format display: "8.2 hours" (1 decimal), "8h 15m" (if <24 hours), "1d 3h" (if >24 hours)
    - **Projection Algorithm - Final Cost**: Current cost: current_spend = (current calculation from FR7.1.1); Remaining cost estimation: remaining_gpu_cost = remaining_hours × gpu_hourly_rate, Add buffer for potential spot interruptions (if spot): interruption_buffer = remaining_hours × 0.05 × gpu_hourly_rate (assume 5% overhead), remaining_cost = remaining_gpu_cost + interruption_buffer; Projected final cost: projected_final = current_spend + remaining_cost; Confidence interval calculation: historical_variance = StdDev(actual_cost / projected_cost for similar completed jobs), confidence_interval = ±(historical_variance × projected_final), typical confidence: ±12-18%; Display: "Projected final cost: $47.32 (±15% variance)" or "Projected: $40-54"
    - **Expected Completion Time**: Calculate: completion_timestamp = NOW() + remaining_seconds; Format based on proximity: If <12 hours: "Today at 11:45 PM", If 12-36 hours: "Tomorrow at 2:15 PM", If >36 hours: "Thursday, Dec 19 at 9:30 AM", Timezone: User's local timezone with label: "PST"; Include relative time: "in 8 hours 15 minutes"; Update every 60 seconds (same cadence as cost updates)
    - **Scenario Analysis Display**: Card section: "Projection Scenarios", Three scenarios with probability indicators: **Best Case** (20% probability): Assumptions: Training accelerates in later epochs (common pattern), Fewer validation runs than expected, No spot interruptions (if spot) or 1 interruption max, Time: "7.1 hours" (13% faster), Cost: "$42.50" (10% cheaper), Completion: "Today at 10:30 PM"; **Expected Case** (60% probability): Assumptions: Current rate continues, Typical spot interruption rate (if spot: 1-2 interruptions), Standard validation frequency, Time: "8.2 hours" (baseline), Cost: "$47.32" (baseline), Completion: "Today at 11:45 PM"; **Worst Case** (20% probability): Assumptions: Training slows down (loss plateau, more gradient calc), Higher spot interruption rate (if spot: 3-4 interruptions), Additional validation runs if quality concerns, Time: "9.8 hours" (20% slower), Cost: "$55.20" (17% more expensive), Completion: "Tomorrow at 1:15 AM"; Visual representation: Horizontal bar chart showing range from best to worst, marker indicating expected case
    - **Decision Support Recommendations**: Algorithm evaluates projected cost against original estimate: IF projected_final > (estimated_max × 1.2): status = 'significantly_over', message = "⚠️ Projected cost ($55) significantly exceeds estimate ($45-55). Consider: Cancelling this job and retrying with more efficient configuration (Conservative preset, smaller batch size), Switching to on-demand GPU if cost overrun due to spot interruptions, Accepting higher cost if job critical and near completion (>70% done)", action_buttons = ["Cancel Job", "Continue Anyway", "View Cost History"]; ELSIF projected_final > estimated_max: status = 'slightly_over', message = "⚠ Projected cost ($52) slightly over estimate ($45-55, +$2). Monitor closely. Acceptable variance given training uncertainty.", action_buttons = ["Continue Monitoring"]; ELSE: status = 'on_track', message = "✓ On track. Projected cost ($47) within estimate range ($45-55).", action_buttons = none; Display recommendation prominently below projection display
    - **Historical Accuracy Tracking**: For each completed job: Calculate projection_accuracy = (actual_final_cost / projected_final_cost_at_50%_complete) × 100, Store: INSERT projection_accuracy_history (job_id, projected_cost, actual_cost, accuracy_pct, preset, gpu_type, dataset_size, timestamp); Aggregate accuracy metrics: Overall accuracy: AVG(ABS(100 - accuracy_pct)) across all completed jobs (typical: ±10-15%), Per-preset accuracy: Conservative: ±8% (more predictable), Balanced: ±12%, Aggressive: ±18% (higher variance), Per-GPU type: Spot: ±15% (interruption variability), On-demand: ±9% (more predictable); Display on projection card: "Projections typically ±12% accurate based on 47 completed jobs"
    - **Continuous Projection Improvement**: Machine learning approach (future enhancement): Train regression model on: Features: steps_completed, avg_seconds_per_step, current_loss, dataset_size, preset, gpu_type, interruption_count, time_of_day, datacenter_load, Target: actual_final_cost, Use model predictions instead of simple linear extrapolation; Pattern recognition: Identify common acceleration/deceleration patterns: "Jobs typically slow down in final 10% (validation overhead)", "Conservative preset accelerates after epoch 1 (GPU warming)", "Spot jobs with 0 interruptions by 50% complete unlikely to interrupt later (87% confidence)", Adjust projections based on identified patterns; A/B testing projections: Show different projection algorithms to different users, Track which algorithm most accurate, Roll out winning algorithm to all users
    - **Visual Projection Timeline**: Horizontal timeline showing: Past (gray): Elapsed time with milestones (epochs completed), Present (marker): Current position, Future (blue): Projected remaining time with expected completion, Confidence band (light blue shading): Shows ±15% variance range; Interactive: Hover shows details at each point, Click epoch markers to see per-epoch cost breakdown, Zoom to focus on specific time range
    - **Cost Trajectory Chart**: Line graph showing: X-axis: Time (hours into training), Y-axis: Cost ($), Historical line (solid): Actual cost accumulation so far, Projected line (dashed): Expected cost trajectory, Confidence band (shaded): ±15% variance, Original estimate line (horizontal dashed): Shows estimate range ($45-55), Alert zones: Red shading if projection exceeds estimate; Chart updates every 60 seconds with new datapoint, Smooth animation (not jarring jumps)
    - **Projection Sensitivity Analysis**: Show how projections change with different assumptions: "If training accelerates by 10%: $43 final cost (↓ $4)", "If one more spot interruption: $49 final cost (↑ $2)", "If validation takes 30 min longer: $51 final cost (↑ $4)", Helps users understand projection volatility, Builds confidence in expected case being realistic
    - **Export Projection Data**: "Export Projections" button downloads CSV: Columns: timestamp, current_cost, projected_final_cost, remaining_hours, expected_completion, best_case, expected_case, worst_case, confidence_interval, Use case: Finance team wants projection data for budget forecasts, Managers need cost projections for client billing estimates
    - **Integration with Budget Alerts**: If projected_final exceeds monthly_remaining_budget: Trigger warning: "⚠️ This job's projected cost ($47) will exceed your remaining monthly budget ($35). Options: Increase monthly budget, Cancel this job, Cancel lower-priority active jobs"; Proactive budget management prevents surprise overages
    - **Projection Explanations**: "Why this projection?" expandable section: Explains calculation methodology in simple terms: "We calculate your average training speed (127 steps/hour) based on completed work, multiply remaining steps (1,150) by this rate (9.1 hours), and apply your GPU cost ($2.49/hr for spot H100) to estimate final cost ($47).", Shows historical accuracy to build trust: "Our projections have been ±12% accurate on your last 8 completed jobs.", Links to documentation: "Learn more about how we calculate projections"

- **FR7.2.1:** Monthly Budget Dashboard
  * Description: System shall implement comprehensive monthly budget dashboard at `/dashboard/training-budget` displaying summary cards (monthly spending, remaining budget, job counts, averages), daily spending accumulation trend graph with budget limit line, projected spending forecast with alert zones, per-job breakdown table sortable by cost, budget versus forecast analysis with overage warnings, customizable budget controls (limit amounts, period types, alert thresholds, job blocking toggles), historical comparison charts showing 6-month trends, and drill-down capabilities to enable financial planning, budget compliance monitoring, operational oversight, and proactive budget management for teams and individuals.
  * Impact Weighting: Financial Planning / Budget Compliance / Operational Oversight
  * Priority: High
  * User Stories: US7.2.1
  * User Journey: UJ7.3.1 (Budget Dashboard Overview), UJ7.3.2 (Budget Management)
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
    - **Page Access**: Accessible at `/dashboard/training-budget`, Navigation: Prominent link in main dashboard sidebar "💰 Budget", Permissions: All users see own budget, managers/admins see team budget, Page loads within 2 seconds (cached budget data)
    - **Summary Cards Row** (4 cards across top): **Card 1: Monthly Spending**: Large number: "$487.32" (current month spend), Secondary: "of $500.00 limit" (smaller, gray), Progress bar: 97% filled (color: red if >100%, yellow if 80-100%, green if <80%), Icon: 💰 or 💳; **Card 2: Remaining Budget**: Large number: "$12.68" (budget_limit - current_spend), Color: Red if negative (overspent), yellow if <20% remaining, green otherwise, Warning if negative: "⚠️ Over budget by $X", Icon: 💵; **Card 3: Jobs This Month**: Large number: "12" (total jobs), Breakdown: "10 completed, 2 active, 0 failed" (smaller text), Click card filters job breakdown table to current month, Icon: 📊; **Card 4: Average Cost per Job**: Large number: "$40.61" (total_spend / total_jobs), Comparison to last month: "↓ $5.32 lower than last month" or "↑ $3.21 higher", Trend indicator (up/down arrow), Icon: 📈
    - **Spending Trend Graph** (main visualization): Chart type: Line chart (cumulative spending over time), X-axis: Days of current month (1-31), Y-axis: Cumulative cost ($0 - budget_limit + 20%), **Primary line**: Actual spending (solid blue), datapoints for each day spending occurred, Smooth curve connecting datapoints; **Budget limit line**: Horizontal dashed red line at $500 (budget limit), Label: "Budget Limit ($500)"; **Projected spending line**: Dotted gray line from current day to end of month, Extrapolates based on: current spending rate, active jobs' projected costs, historical spending patterns for this team/user, Formula: projected_month_end = current_spend + SUM(active_jobs.projected_remaining) + ((days_remaining / days_elapsed) × current_spend × seasonality_factor); **Alert zone shading**: Red transparent shading above budget limit line (indicates overspending zone), Yellow shading from 80% to 100% of budget (warning zone), Green shading below 80% (safe zone); **Annotations**: Markers on significant days (large job completions, budget increases), Hover tooltip shows: date, cumulative spend, daily spend, active jobs that day; Interactive: Click datapoint navigates to that day's jobs, Zoom controls to focus on date ranges, Toggle between cumulative and daily spend views
    - **Budget vs Forecast Panel**: Card displaying forecast analysis, **Current Status**: "Current Spend: $487.32" (as of today), "Budget Used: 97%" (progress bar); **Active Jobs Impact**: "Active Jobs: 2 jobs in progress", "Estimated Remaining Cost: $42-58" (range based on job projections), List active jobs: "Job A: $18-22 remaining", "Job B: $24-36 remaining"; **Month-End Forecast**: "Forecasted Month-End Spend: $529-545" (current + active + expected new jobs), Confidence: "Medium confidence (±$15)" based on historical variance, Comparison: "Projected to exceed budget by $29-45" (red text), Or: "Projected to stay within budget" (green text); **Recommendations**: IF forecast > budget: "⚠️ Action Required: Cancel low-priority jobs, or Increase budget limit to $550, or Defer new jobs to next month"; IF forecast < budget: "✓ On track. Remaining capacity: $X for additional training runs"
    - **Per-Job Breakdown Table**: Table columns: [Checkbox] | Job Name | Status | Cost | % of Budget | Created By | Completed/Started At | [Actions]; Data: Shows all jobs in current budget period (calendar month or rolling 30 days), Default sort: Cost descending (most expensive first); **Cost Column**: Dollar amount with 2 decimals, Color coded: >$100 (red), $50-100 (yellow), <$50 (green), Hover shows cost breakdown (GPU, interruptions, storage); **% of Budget Column**: Percentage: "17.4%" (job_cost / monthly_budget), Visual bar indicator (mini progress bar in cell), Top cost drivers highlighted: "⚠️ High Impact" if >15% of budget; **Status Column**: Badge: "Completed" (green), "Active" (blue pulsing), "Failed" (red), "Cancelled" (orange); Pagination: 25 jobs per page with "Load More" or standard pagination; Bulk actions: Select multiple jobs via checkboxes, "Export Selected" (CSV), "View Cost Comparison" (multi-job analysis); Search/Filter: Search by job name, Filter by status, date range, creator, cost range, client/project
    - **Budget Controls Section**: Expandable panel: "Budget Settings", **Set Monthly Budget Limit**: Input field: "$500.00" (current limit), Min: $50, Max: $10,000 (or custom for enterprise), Save button: Requires confirmation "Update budget limit to $X?", Permissions: Manager/admin required for changes >20%, Audit log: All changes logged with who/when/why; **Budget Period Type**: Radio buttons: "Calendar Month" (Jan 1 - Jan 31), "Rolling 30 Days" (last 30 days from today), Affects all calculations (spending, forecast, history); **Budget Alert Thresholds**: Checkbox + percentage input: "☑ Alert at 80% ($400)" - email/slack when reached, "☑ Alert at 95% ($475)" - urgent notification, "☑ Alert at 100% ($500)" - critical alert, "☐ Alert at 110% ($550)" - overspend notification, Customize notification recipients for each threshold; **Job Blocking Settings**: Toggle: "Block new job creation when budget exceeded", If enabled: "Create New Job" button disabled when current_spend >= budget_limit, Error message: "Monthly budget exceeded. Increase limit or wait until next period.", If disabled: Jobs can be created over budget (warning shown), Useful for flexible budgets where overages acceptable
    - **Historical Comparison Section**: **6-Month Trend Bar Chart**: Bars for each of last 6 months (July, Aug, Sep, Oct, Nov, Dec), Height = spending that month, Color: Green if <80% of average, Yellow if 80-120%, Red if >120%, Horizontal line: Average monthly spend ($423), Hover: Shows exact spend, budget limit (if changed), job count; **Trend Analysis**: Text summary: "Your training spending has increased 23% over last 6 months", "Average monthly spend: $423", "Highest month: October ($548)", "Lowest month: July ($312)"; **Growth Projections**: "At current growth rate, projected spending next month: $534", "Consider increasing budget to $600 to accommodate growth", Seasonality detection: "Spending typically higher in Q4 (end-of-year projects)"; **Export Historical Data**: "Export 12-Month Report" button downloads CSV: month, total_spend, job_count, avg_cost_per_job, budget_limit, over_under_budget
    - **Additional Features**: **Budget Comparison**: Compare your budget utilization to team average: "You: 97% utilized, Team average: 84%", "Your avg cost per job: $40.61, Team average: $38.22", Insights: "You're slightly above team average. Consider using Conservative preset more often to reduce costs."; **Cost Optimization Tips**: Context-aware recommendations: "💡 Tip: 78% of your jobs use spot instances. Consider increasing to 90%+ for $X additional monthly savings.", "💡 Tip: Your average job costs $40.61. Conservative preset averages $32.18. Consider switching for non-urgent jobs."; **Budget Alerts Summary**: Shows recent alerts triggered: "80% threshold reached 3 days ago", "95% threshold reached today", Click to view alert details and actions taken
    - **Mobile Responsive**: Desktop (>1024px): Full dashboard with all panels visible; Tablet (768-1023px): Stack summary cards 2×2, condensed graph, paginated table; Mobile (<768px): Vertical card stack, simplified graph (daily view only), minimal table (job name, cost, status), Swipe gestures for time navigation
    - **Real-Time Updates**: Polling every 2 minutes: Updates spending numbers, active job costs, forecast, Dashboard shows "Last updated: 1 minute ago"; Push notifications (WebSocket): When threshold crossed, When month rolls over (reset), When budget limit changed
    - **Export & Reporting**: "Export Budget Report" button generates PDF: Cover page: Month, total spend, budget status, Summary cards visualization, Spending trend graph (full color), Per-job table (top 20 by cost), Historical comparison, Recommendations; Use case: Submit to finance team, manager review meetings, client billing backup

- **FR7.2.2:** Budget Alerts & Notifications
  * Description: System shall implement comprehensive budget alert system with threshold-based triggers (80%, 95%, 100% of monthly limit, active job budget risks), multi-channel delivery (email, Slack, in-app banners, SMS for critical), escalating alert severity with increasing thresholds, configurable recipient lists per alert level, actionable alert content with budget status summaries and quick action buttons, budget increase workflow with justification requirements and approval chains, complete audit logging of budget changes, daily digest summaries, alert suppression for acknowledged overages, and notification preferences management to enable proactive budget management, prevent surprise overages, facilitate rapid budget adjustments, and maintain financial oversight across teams.
  * Impact Weighting: Proactive Management / Risk Mitigation / Communication
  * Priority: High
  * User Stories: US7.2.2, US8.2.2
  * User Journey: UJ7.4.1 (Budget Alert Handling), UJ7.4.2 (Budget Limit Increases)
  * Tasks: [T-7.2.2], [T-8.2.2]
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
    - **Notification Recipients** (from US8.2.2):
    - Configurable recipients: budget manager, finance team, operations
    - **Escalation Levels** (from US8.2.2):
    - 80% alert → email only
    - 95% alert → email + Slack
    - 100% alert → email + Slack + in-app banner
    - **Daily Digest Option** (from US8.2.2):
    - "Your daily training budget summary" (total spent today, remaining budget, active jobs)
  * Functional Requirements Acceptance Criteria:
    - **Alert Trigger Detection**: Continuous monitoring: Every time training job cost updates (60s intervals), check if budget thresholds crossed, Trigger logic: IF current_spend >= (budget_limit × 0.80) AND NOT alerted_80: Send 80% alert, mark alerted_80 = true; IF current_spend >= (budget_limit × 0.95) AND NOT alerted_95: Send 95% alert; IF current_spend >= budget_limit AND NOT alerted_100: Send 100% alert; Once threshold triggered, don't re-trigger until next budget period (prevents spam)
    - **80% Threshold Alert**: Severity: Warning (yellow), Channels: Email only (least urgent), Recipients: Job creator, budget manager (if configured), Subject: "Training Budget Alert: 80% Used", Body: "You've used 80% of your monthly training budget. Current: $400 of $500 (80%), Remaining: $100, Active jobs: 2 (may consume additional $42-58), Forecast: On track to use $487 by month-end (within budget), Recommendation: Monitor spending closely. Consider postponing non-urgent training runs if nearing limit."; Action buttons: [View Budget Dashboard] [Adjust Spending Pace]; Alert logged: INSERT budget_alerts (threshold=80, triggered_at, notified_users)
    - **95% Threshold Alert**: Severity: High (orange), Channels: Email + Slack (escalated), Recipients: Job creator, budget manager, team lead, Email subject: "⚠️ Training Budget Alert: 95% Used", Slack message: "@budgetmanager Training budget 95% consumed. $475 of $500 used, $25 remaining. 2 active jobs may exceed budget. [View Dashboard]", In-app notification: Yellow banner on dashboard "⚠️ 95% of monthly budget used", Body content: "You've used 95% of your monthly training budget. Current: $475 of $500 (95%), Remaining: $25 (not enough for typical job), Active jobs: 2 (estimated cost: $42-58 remaining), Forecast: Likely to exceed budget by $17-33, Warning: Current active jobs will likely exceed budget. Consider: Cancelling low-priority jobs, Increasing budget limit, Waiting until next month for new jobs"; Action buttons: [Increase Budget Limit] [Cancel Jobs] [View Budget]
    - **100% Threshold Alert**: Severity: Critical (red), Channels: Email + Slack + In-app banner + SMS (optional, enterprise only), Recipients: All stakeholders (job creator, budget manager, finance team, operations), Email subject: "🚨 CRITICAL: Training Budget Exceeded", High priority flag, Slack: "@channel in #training-budget, Training budget exceeded! $505 of $500 spent. Immediate action required.", In-app: Persistent red banner (cannot dismiss) "🚨 Monthly budget exceeded. New job creation blocked.", SMS: "Bright Run Alert: Training budget exceeded $500 limit. Review immediately.", Body: "Your monthly training budget has been exceeded. Current: $505 of $500 (101%), Over budget: $5, Active jobs: 2 (estimated $42-58 remaining), Final month projection: $547-563, Critical: Budget limit exceeded. Immediate action required: 1. Increase budget limit to accommodate current activity, 2. Cancel active jobs to stay within budget, 3. Accept overage (requires manager approval)"; Action buttons: [Increase Budget Limit NOW] [Cancel Active Jobs] [Emergency Override]
    - **Active Job Budget Risk Alert**: Triggered when: Job's projected final cost + current monthly spend > budget limit, Even if current spend <100%, Real-time check: When job cost projections update, Alert: "⚠️ Budget Risk: Active job '{name}' projected to exceed budget", "Current spend: $487, Budget: $500, Remaining: $13, This job projected: $22-28, Risk: Budget will be exceeded by $9-15 if job continues", Actions: [Cancel This Job] [Increase Budget] [Continue Anyway (requires justification)]
    - **Email Alert Templates**: Professional HTML emails with Bright Run branding, Header: Company logo, alert icon (⚠️/🚨), severity badge, Summary section: Budget status bar (visual progress), Key metrics table (current, remaining, forecast), Alert reason highlighted, Detailed analysis: Active jobs list with costs, Spending trend (last 7 days mini-chart), Projected impact, Action buttons: Large, prominent call-to-action buttons, Direct links (signed URLs, valid 7 days), Footer: Notification preferences link, Support contact, Unsubscribe (compliance)
    - **Slack Alert Integration**: Slack app integration: OAuth setup at `/settings/integrations/slack`, Select notification channel: #training-budget (recommended), Configure mention rules: "@channel for critical, @budgetmanager for high, no mention for warnings", Alert message format: Emoji indicator: ⚠️ (warning), 🚨 (critical), Plain text summary (mobile-friendly), Budget status: "Budget: $487/$500 (97% used)", Action buttons as Slack interactive components, Thread: Detailed breakdown posted in thread (keeps channel clean)
    - **In-App Banner Notifications**: Persistent banner across top of dashboard (cannot be dismissed for critical alerts), Color coding: Yellow (warning), Orange (high), Red (critical), Icon + message: "⚠️ 95% of budget used", Expandable: Click banner shows full alert details inline, Action buttons: Inline "Increase Budget" / "View Details", Dismissable: Non-critical alerts can be dismissed (saves preference), Reappears: Critical alerts reappear on page reload until resolved
    - **Budget Increase Workflow**: Click "Increase Budget Limit" button opens modal/form, Form fields: Current limit: "$500" (display only, not editable), New limit: Input field, min = current_spend (can't set below current), suggested = current_spend × 1.2, Justification: Textarea (required, min 50 characters), "Explain why budget increase needed", Approval required: Checkbox auto-checked if increase >20% or new limit >$1000, Approver: Dropdown (select manager), "Request will be sent to {manager} for approval"; Submit workflow: IF approval not required: UPDATE budgets SET monthly_limit = {new_limit}, justification = {text}, changed_by = {user}, changed_at = NOW(), Send confirmation: "Budget limit increased to ${new_limit}", Alert all stakeholders of change; IF approval required: INSERT budget_approval_requests (old_limit, new_limit, justification, requester, approver, status='pending'), Send email to approver: Subject: "Budget Limit Increase Request from {user}", Body: Current: $500, Requested: $750 (+50%), Justification: {text}, Current spend: $487 (will exceed if not approved), [Approve] [Deny] buttons with signed URLs, Requester notified: "Budget increase request submitted to {manager}. Awaiting approval."; Approval response: Approve: UPDATE budget + send confirmations, Deny: Notify requester with reason, request remains at old limit
    - **Budget Override Audit Log**: All budget changes logged: INSERT budget_audit_log (budget_id, old_limit, new_limit, changed_by, changed_at, justification, approval_required, approved_by, approved_at); Audit log display at `/dashboard/budget/audit-log`: Table: Date, Changed By, Old Limit, New Limit, Change %, Justification, Approver (if applicable), Sort by date (newest first), Filter: By user, by date range, by approval status, Export: CSV download for finance/compliance; Use cases: Financial audits, Budget planning reviews, Identifying spending pattern changes, Compliance requirements
    - **Notification Recipient Configuration**: Settings page: `/dashboard/settings/budget-notifications`, Per-threshold configuration: "80% Alert Recipients: [email@domain.com] [Add Recipient]", "95% Alert Recipients: [email1@] [email2@] [team-lead@] [Remove]", "100% Alert Recipients: [all-stakeholders@] [finance@]", Recipient types: Individual users (email), Distribution lists (team@, finance@), Role-based (all budget_managers, all team_leads), Slack channels (if integration enabled); Notification methods per recipient: Email: Always supported, Slack: If user has Slack connected, SMS: If user provided phone (enterprise only), In-app: Always for logged-in users; Save configuration: Requires manager permissions to add external recipients (finance@)
    - **Escalation Matrix**: **80% (Warning)**: Email to job creator + budget manager, No Slack, In-app: Dismissable banner, SMS: None, Response time: Informational, no urgent action; **95% (High)**: Email to creator + manager + team lead, Slack: Message with @budgetmanager mention, In-app: Persistent yellow banner, SMS: Optional (if enabled), Response expected: Within 4 hours; **100% (Critical)**: Email to all stakeholders (creator, manager, finance, ops), Slack: @channel mention in dedicated channel, In-app: Non-dismissable red banner, SMS: Enterprise customers only, Response required: Immediate action, job blocking active
    - **Daily Digest Summary**: Opt-in feature: User preference `/settings/notifications`, "☑ Send daily budget digest", Time: 8 AM user's timezone, Delivery: Email only (not Slack/SMS), Content: Subject: "Your Daily Training Budget Summary - {Date}", Overview: "Monthly spend: $487 / $500 (97%)", "Spent today: $23.42 (2 jobs completed)", "Active jobs: 2 ($18 and $24 remaining)", Forecast: "Projected month-end: $534 (over budget by $34)", Yesterday's activity: List of completed jobs with costs, Upcoming: "3 queued jobs (estimated $67 total)", Action items: "Consider: Cancelling Job X ($24) to stay within budget"; Digest aggregates daily activity, reduces alert fatigue
    - **Alert Suppression**: For acknowledged budget overages: User can "Acknowledge Overage" in alert, Suppresses repeat 100% alerts for rest of month, Assumes: User aware, budget increase approved or overage accepted, Prevents daily alert spam once situation known; Suppression logged: Who acknowledged, when, acceptance note (optional); Re-enables: Next budget period (fresh start)
    - **Alert Analytics**: Track alert effectiveness: Metrics: Alert response rate (% of alerts acted upon within 24 hours), Budget increase frequency (how often limits raised), Overage frequency (how often exceeded despite alerts), Average time to resolution, Insights: "80% of 100% alerts result in budget increase within 1 hour", "Teams with daily digest enabled have 23% fewer budget overages", Use insights to improve alert thresholds and messaging
    - **Alert Preferences Management**: User settings page: Granular control over notifications, Per-alert-type toggles: "Budget Alerts: ☑ 80% ☑ 95% ☑ 100%", "Job Completion: ☑ Email ☐ Slack", "Error Alerts: ☑ Critical only", Channel preferences: "Preferred channel: Email (primary), Slack (secondary)", "Quiet hours: 10 PM - 7 AM (no email alerts)", "Weekend delivery: ☐ Send alerts on weekends", Save preferences: Immediate effect, Applies user-wide (not per-job)
    - **Emergency Budget Override**: For critical situations (client deadline, urgent delivery): "Emergency Override" button in 100% alert, Requires: Manager role or higher, Justification (mandatory, 100+ chars), Bypasses approval workflow, Immediately increases budget by preset amount (e.g., +50% or +$500), Logged as emergency action: Flagged for post-hoc review, Subject to audit: Finance team reviews all emergency overrides monthly, Use sparingly: Intended for true emergencies only, prevents blocking critical work

- **FR7.3.1:** Spot vs On-Demand Cost Analysis
  * Description: System shall implement comprehensive spot versus on-demand cost analysis reporting total spot savings, equivalent on-demand costs, savings percentages, per-job cost comparisons with interruption counts, interruption impact analysis calculating recovery overhead, net savings after overhead, annualized ROI projections, strategic recommendations for GPU type selection, visual cost comparison charts, historical savings trends, and exportable PDF reports to demonstrate cost efficiency, justify infrastructure investments, guide GPU selection strategy, and provide executive-level ROI metrics for financial planning and stakeholder communication.
  * Impact Weighting: Cost Efficiency / ROI Demonstration / Strategic Planning
  * Priority: Medium
  * User Stories: US7.3.1
  * User Journey: UJ7.5.1 (Cost Efficiency Analysis), UJ7.5.2 (Strategic GPU Selection)
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
    - **Cost Optimization Report Section**: Accessible on budget dashboard: Section header "💰 Cost Optimization: Spot vs On-Demand", Expandable panel (collapsed by default, expandable for details); Data period: Current month by default, filterable to: Last 30 days, Last 90 days, Last 12 months, All time, Custom date range
    - **Spot Instance Savings Summary**: Large prominent metrics card, **Total Spot Cost**: "$387.32" (sum of actual spot job costs), Breakdown: "12 spot jobs completed this month"; **Equivalent On-Demand Cost**: "$1,243.18" (hypothetical cost if all spot jobs run on-demand), Calculation: spot_job_hours × on_demand_hourly_rate ($7.99/hr for H100); **Total Savings**: "$855.86" huge, bold, green, Percentage: "69% cheaper" (savings / on_demand_cost × 100), Visual: Large green ↓ arrow with savings amount; **Comparison Bar**: Horizontal stacked bar chart: Spot cost (blue, $387), Savings (green, $855), Total width = on-demand cost ($1,243), Shows visually how much saved
    - **Per-Job Cost Comparison Table**: Table columns: Job Name | GPU Type | Actual Cost | On-Demand Equivalent | Savings | Interruptions | Status; Data rows: Job 1: "Elena Q1 Training | Spot | $48.32 | $146.18 | $97.86 (67%) | 2 | ✓", Job 2: "Test Aggressive | Spot | $23.15 | $68.42 | $45.27 (66%) | 0 | ✓", Job 3: "Client Demo | On-Demand | $87.42 | $87.42 | $0 (0%) | 0 | ✓", Job 4: "Elena Q2 Training | Spot | $51.28 | $156.32 | $105.04 (67%) | 3 | ✓"; Sort: Default by savings descending (highest savings first), sortable by any column; Highlight: Jobs with 0 interruptions highlighted green (perfect spot execution), Jobs with >3 interruptions highlighted yellow (high interruption rate); Filter: "Show spot only" / "Show on-demand only" / "Show all"
    - **Interruption Impact Analysis**: **Total Interruptions**: "23 interruptions across 12 spot jobs", "Average: 1.9 interruptions per job"; **Interruption Distribution**: Histogram: X-axis: Number of interruptions (0, 1, 2, 3, 4+), Y-axis: Job count, Bars show: "3 jobs with 0 interruptions", "4 jobs with 1", "3 jobs with 2", "2 jobs with 3+", Success metric: "75% of spot jobs had ≤2 interruptions (acceptable)"; **Recovery Overhead Cost**: Calculation: recovery_overhead = SUM(interruption_recovery_time_minutes) × spot_hourly_rate, Example: "23 interruptions × avg 7.4 min recovery × $2.49/hr = $28.42", Display: "Interruption overhead: $28.42" (3.7% of spot cost); **Net Savings After Overhead**: "Net savings: $827.44" (total_savings - interruption_overhead), "Still 67% cheaper than on-demand after accounting for interruptions", Green highlight: Demonstrates spot is worth it despite interruptions
    - **Interruption Rate Analysis**: Spot interruption rate = (total_interruptions / total_spot_jobs) × 100, Display: "Interruption rate: 19% per job" (typical: 10-30% depending on datacenter demand), Trend: "↓ 3% lower than last month" or "↑ 5% higher", Correlation: "Interruption rate highest during peak hours (9 AM - 5 PM PST): 28%", "Off-peak hours (5 PM - 9 AM): 12% interruption rate", Recommendation based on rate: If >30%: "⚠️ High interruption rate. Consider: Using on-demand for critical jobs, Scheduling spot jobs during off-peak hours, Switching to less-congested datacenter (if available)"; If 10-20%: "✓ Normal interruption rate. Current spot strategy optimal."; If <10%: "✓ Excellent! Very low interruption rate. Continue spot-heavy strategy."
    - **ROI Calculation & Projection**: **Monthly Savings**: "$855.86 saved this month using spot instances"; **Annualized Projection**: "Projected annual savings: $10,270" (monthly_savings × 12), Assumption note: "Assumes current usage levels continue", Confidence: "Medium confidence (±20%) based on 3 months historical data"; **ROI Narrative**: "Your spot instance strategy saves $10k+ annually compared to on-demand-only approach.", "This cost efficiency justifies investment in: Robust checkpoint recovery system, Automated retry mechanisms, Training infrastructure automation", "Spot savings fund ~25% of annual training budget (enabling more model iterations)"; **Cumulative Savings**: Line chart showing cumulative savings over time: X-axis: Months, Y-axis: Cumulative savings ($), Line shows savings accumulation (should be steadily increasing), Milestone markers: "$10k saved" when reached, Projected trendline: Dotted line showing next 6 months projected savings
    - **Strategic Recommendations**: Context-aware recommendations based on usage patterns: **Current Strategy Summary**: "Your GPU selection: Spot: 85% (11 jobs), On-demand: 15% (2 jobs), Savings rate: 69% vs on-demand-only"; **Recommendation 1** (if spot usage <80%): "💡 Opportunity: Increase spot usage from 85% to 95% for additional $X monthly savings. Reserve on-demand only for: Client deliveries with tight deadlines, Jobs >$100 where interruption risk unacceptable, Production deployments requiring guaranteed completion"; **Recommendation 2**: "✓ Current strategy optimal. Continue using spot for 90%+ of jobs.", "Your mix (85% spot, 15% on-demand) balances cost efficiency with reliability."; **Recommendation 3** (if high interruption rate): "⚠️ High interruption rate (28%) reducing spot efficiency. Consider: Scheduling more jobs during off-peak hours (5 PM - 9 AM), Using on-demand for long-running jobs (>12 hours projected), Exploring alternate datacenters with lower congestion"; **Recommendation 4** (cost-conscious): "To maximize savings: Always use spot for: Test/experiment jobs, Non-urgent training runs, Jobs with flexible completion timelines, Use on-demand only for: Client deadline commitments, Urgent production needs, Jobs already failed 2× on spot"
    - **Visual Cost Comparison Chart**: Side-by-side bar chart: 2 bars: "Your Actual Cost (Spot-Heavy Strategy)" = $472 total (spot + on-demand jobs), "All On-Demand Alternative" = $1,330 hypothetical, Difference highlighted: "$858 saved (65%)", Color: Your cost (green), All on-demand (red), Arrow showing savings magnitude; Donut chart breakdown: Spot cost: $387 (82%), On-demand cost: $85 (18%), Savings portion: $855 (shown as "avoided cost" in legend), Visual shows how small actual spend is vs avoided cost
    - **Historical Savings Trend**: Multi-month view showing savings over time: Table: Month | Spot Cost | On-Demand Equivalent | Savings | Savings %, Jan: $421 | $1,287 | $866 (67%), Feb: $398 | $1,195 | $797 (67%), Mar: $387 | $1,243 | $855 (69%); Trend analysis: "Your savings rate has been consistent at 67-69% over last 3 months", "Spot strategy working effectively with minimal variation", "No significant degradation in savings despite increased usage"; Line chart: X-axis: Months, Y-axis: Savings %, Line should be relatively flat (indicating consistent strategy), Target line: 60% savings rate (industry benchmark)
    - **Benchmarking**: Compare to industry/internal benchmarks: "Your savings rate: 69%", "Bright Run average: 64% (you're above average ✓)", "Industry benchmark: 55-65% typical for LoRA training", "Your efficiency rank: Top 15% of Bright Run users", Insight: "Your spot strategy is highly effective. Share best practices with team."
    - **Export Cost Optimization Report**: "Export Report" button generates professional PDF: Cover page: "Cost Optimization Report: Spot vs On-Demand Analysis", Company logo, date range, total savings highlighted, Executive summary: Key metrics (savings, ROI, strategy), 1-paragraph summary for stakeholders, Detailed analysis: Spot vs on-demand comparison (charts and tables), Per-job breakdown (top 10 by savings), Interruption analysis with charts, ROI calculation and projections, Strategic recommendations section, Methodology appendix: Explains calculation formulas, Uses: Board presentations, Finance reporting, Stakeholder updates, Budget justification, Strategic planning; CSV export: Raw data table with all jobs for detailed analysis
    - **Alert Integration**: If savings rate drops significantly: "⚠️ Cost Efficiency Alert: Your spot savings rate dropped from 69% to 52% this month.", "Possible causes: Higher interruption rate (28% vs 19% last month), More on-demand jobs (5 vs 2 last month), Investigation recommended: Review job GPU selection decisions, Consider off-peak scheduling for spot jobs", Action: Link to detailed cost report for analysis
    - **Team-Level Aggregation** (managers/admins): View team-wide cost optimization: "Team Spot Savings: $3,247 this month", "Team members ranked by cost efficiency: Sarah (72% savings rate), John (69%), Maria (58%), ..."); Identify optimization opportunities: "Maria using on-demand for 45% of jobs (team avg: 18%). Coaching opportunity.", "Team could save additional $X/month by optimizing GPU selection"

- **FR7.3.2:** Cost Attribution by Client/Project
  * Description: System shall implement comprehensive cost attribution enabling client and project tagging during job creation, maintaining client/project master lists with create-new capabilities, generating attribution reports showing per-client/project job counts, total costs, averages, and date ranges, calculating project profitability with revenue inputs, training costs, other costs, profit and margin percentages, providing pricing insights with cost-to-revenue ratios and recommended pricing bands, supporting budget allocation by client priority tiers, and exporting detailed attribution data for accounting integration to enable accurate project costing, profitability analysis, client billing, strategic pricing decisions, and financial planning.
  * Impact Weighting: Financial Planning / Profitability Analysis / Pricing Strategy
  * Priority: Medium
  * User Stories: US7.3.2
  * User Journey: UJ7.6.1 (Cost Attribution), UJ7.6.2 (Profitability Analysis)
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
    - **Client/Project Tagging During Job Creation**: Job configuration form includes optional section: "Cost Attribution", **Client Assignment**: Dropdown: "Assign to client (optional)", Options: Existing clients from clients table OR "➕ Create New Client", If "Create New": Inline form: Client name (required), Client ID/code (optional, for accounting integration), Industry (dropdown: Financial Services, Insurance, Wealth Management, Other), Priority tier (A/B/C for budget allocation), Save creates new client, immediately available in dropdown; **Project Assignment**: Dropdown: "Assign to project (optional)", Filtered by selected client (if client selected), shows only that client's projects, Options: Existing projects OR "➕ Create New Project", If "Create New": Inline form: Project name, Client (pre-filled if selected above), Project code (for accounting), Start date, End date (optional), Projected revenue (optional, for profitability calc), Save creates project; **Metadata Storage**: UPDATE training_jobs SET client_id = {id}, project_id = {id}, Tags displayed on job details: "Client: Acme Financial", "Project: Q1 2025 AI Enhancement", Edit capability: Can change client/project assignment post-creation (in case of error)
    - **Client/Project Master Data**: **Clients Table**: Schema: clients (id, name, client_code, industry, priority_tier, created_at, created_by), Stored centrally for all users/teams, Management interface: `/dashboard/clients`, CRUD operations: Create, Read, Update, Archive (soft delete - don't delete if jobs associated); **Projects Table**: Schema: projects (id, name, project_code, client_id, start_date, end_date, projected_revenue, other_costs, status, created_at), Status: Active, Completed, On-Hold, Cancelled, Management: `/dashboard/projects`, Link to client: Each project belongs to one client
    - **Cost Attribution Report Page**: Accessible at `/dashboard/cost-attribution`, Dual view tabs: "By Client" | "By Project", Date range filter: "Last 30 days", "Last 90 days", "Custom range", "All time", Export button: "Export Attribution Report" (CSV/PDF)
    - **By Client View**: Table columns: Client Name | Industry | Jobs | Total Cost | Avg Cost/Job | Date Range | Actions; Example rows: "Acme Financial | Financial Services | 5 jobs | $287.32 | $57.46 | Jan-Mar 2025 | [View Details]", "Beta Insurance | Insurance | 3 jobs | $142.18 | $47.39 | Feb-Mar 2025 | [View Details]", "Internal R&D | - | 8 jobs | $312.45 | $39.06 | Jan-Mar 2025 | [View Details]", "Unassigned | - | 12 jobs | $487.21 | $40.60 | Jan-Mar 2025 | -"; Sort: Default by total cost descending (highest-spending clients first), Sortable by any column; Summary row at top: "Total: 28 jobs, $1,229.16 across 4 clients"; Drill-down: Click client row expands to show all jobs for that client (inline table), Or click "[View Details]" navigates to client detail page
    - **By Project View**: Table: Project Name | Client | Status | Jobs | Total Cost | Revenue | Profit | Margin % | Date Range; Example: "Q1 2025 AI Enhancement | Acme Financial | Completed | 5 | $287.32 | $25,000 | $22,712.68 | 91% | Jan-Mar 2025", "Insurance Chatbot V2 | Beta Insurance | Active | 3 | $142.18 | $18,000 | - | - | Feb-Mar 2025" (active projects may not have revenue entered yet), "Voice Model Pilot | Acme Financial | Completed | 2 | $98.42 | $8,500 | $8,401.58 | 99% | Jan 2025"; Sort: Default by margin % descending (most profitable first); Filters: Status (Active/Completed/All), Client dropdown, Margin threshold (">80%", "<50%", etc.)
    - **Project Profitability Calculation**: For each project: **Training Cost**: SUM(job costs for all jobs assigned to project), Automatically calculated from job records; **Other Costs** (user input): Labor costs (team time spent), Infrastructure costs (storage, APIs beyond training), Third-party services (data labeling, consultants), Input via project edit form: "Other Costs: $2,000", Breakdown optional (free text notes); **Revenue** (user input): Contract value or billing amount, Input: "Project Revenue: $25,000", Optional for internal/R&D projects; **Profit Calculation**: profit = revenue - training_cost - other_costs, Example: $25,000 - $287.32 - $2,000 = $22,712.68; **Margin Calculation**: margin_pct = (profit / revenue) × 100, Example: ($22,712.68 / $25,000) × 100 = 90.9% ≈ 91%; Display: "Profit: $22,712.68 (91% margin)" (large, green if >70%, yellow if 40-70%, red if <40%)
    - **Pricing Insights Dashboard**: Section: "Pricing Intelligence", **Average Training Cost**: "Average training cost per client: $52.18" (total_training_costs / num_clients), "Median cost: $47.39" (less affected by outliers), Range: "Min: $18.42, Max: $287.32"; **Cost-to-Revenue Ratios**: Historical analysis: "Typical project: $287 training cost → $25k revenue = 87× multiplier", "Your pricing range: 287× to 577× training cost", Recommendation: "Sustainable pricing: 200-500× training cost (40-60% margin after all expenses)"; **Recommended Pricing Bands**: Based on training cost: If training_cost < $50: "Recommended pricing: $10k-20k", If $50-150: "Recommended: $20k-40k", If $150-300: "Recommended: $40k-80k", If >$300: "Recommended: $80k-150k+", Caveat: "Adjust based on: Client size/budget, Model complexity, Customization level, Ongoing support requirements, Competitive landscape"; **Current Margins**: Display all project margins: "Your projects: 87%, 91%, 94%, 99%", "Average margin: 92%", "All projects >85% margin (healthy)", Benchmark: "Target margin: 70-85% (yours: 92% ✓ excellent)"
    - **Budget Allocation by Client Priority**: Feature for proactive budget management, **Priority Tiers**: Assign clients to tiers: Priority A (strategic, high-value): $200/month allocated, Priority B (standard clients): $150/month, Priority C (experimental, low-priority): $100/month, Internal R&D: $50/month; **Allocation Dashboard**: Table: Client | Priority | Allocated Budget | Spent (MTD) | Remaining | Utilization %; Example: "Acme Financial | A | $200 | $142.18 | $57.82 | 71%", "Beta Insurance | B | $150 | $87.32 | $62.68 | 58%", "Internal R&D | - | $50 | $23.15 | $26.85 | 46%"; **Allocation Alerts**: Alert when client approaching their allocation: "⚠️ Acme Financial at 92% of allocated budget ($184 of $200). Consider: Pausing non-urgent jobs for this client, Increasing allocation for Priority A client, Billing client for additional training work"; **Monthly Rollover**: Reset allocations at start of each month, Option: "Rollover unused budget to next month" (if enabled, unused $57 carries forward)
    - **Unassigned Cost Tracking**: Track jobs not assigned to any client/project: "Unassigned Costs: $487.21 (12 jobs)", Percentage: "40% of training costs unattributed", Recommendation: "⚠️ High unassigned cost percentage. Action: Retroactively assign jobs to clients/projects for accurate attribution, Enforce client assignment for new jobs (make field required), Identify if internal R&D should be tracked as separate 'client'"; Impact: "Unassigned costs inflate overhead, reduce visibility into per-client profitability"
    - **Export Cost Attribution Data**: **CSV Export**: Columns: Client, Project, Job Name, Job ID, Cost, Created At, Completed At, Duration, GPU Type, Creator, Status, Rows: All jobs with attribution metadata, Filename: `cost-attribution-{date_range}-{timestamp}.csv`, Use case: Import into accounting software (QuickBooks, Xero), Financial reporting, Client billing backup; **PDF Report**: Professional formatted report: Executive summary: Total attributed costs by client, Project profitability table, Pricing insights summary, Detailed job breakdown per client/project, Charts: Cost by client pie chart, Margin by project bar chart, Trend analysis if multi-period; Use case: Board presentations, Client reporting, Internal financial reviews
    - **Integration with Accounting Systems** (future): API endpoints for attribution data: GET /api/cost-attribution/clients, GET /api/cost-attribution/projects/{id}, Webhooks: Notify when job completes (post cost to accounting), Map to accounting categories: Client → Customer, Project → Job/Matter, Training cost → COGS or Operating Expense; Supported systems: QuickBooks Online (OAuth integration), Xero (API integration), Manual CSV import (for others)
    - **Client Detail Page**: Navigate from client name in tables to `/dashboard/clients/{id}`, Page shows: Client profile: Name, industry, priority tier, created date, All jobs for this client: Table with job details and costs, Total spend: "Total spent: $287.32 across 5 jobs", "Average per job: $57.46", Projects for this client: List of projects with profitability, Cost trend: Line chart showing cumulative cost over time, Profitability summary: If projects have revenue: "Total revenue: $33.5k, Total costs: $2.7k, Total profit: $30.8k (92% margin)", Budget allocation: Current month allocation and utilization; Actions: "Create New Project for This Client", "Assign Unassigned Jobs to This Client", "Export Client Cost Report"
    - **Project Detail Page**: `/dashboard/projects/{id}`, Shows: Project metadata: Name, client, status, dates, revenue, other costs, All jobs: Jobs assigned to this project with individual costs, Cost breakdown: Training: $287.32, Other: $2,000, Total: $2,287.32, Profitability: Revenue: $25,000, Profit: $22,712.68, Margin: 91%, Timeline: Gantt-style view of jobs over project duration, Budget tracking: If project has budget: "Budget: $3,000, Spent: $2,287 (76%), Remaining: $713"; Actions: "Edit Project Details", "Add Revenue/Costs", "Mark as Completed", "Export Project Report"
    - **Cost Attribution Analytics**: Team-level insights (managers/admins): "Top Revenue Clients: Acme Financial ($58k), Beta Insurance ($42k)", "Most Profitable Project: Voice Model Pilot (99% margin)", "Highest Training Cost: Acme Q1 Enhancement ($287)", "Unattributed Cost Rate: 15% (target: <10%)", Trends: "Client acquisition cost (training): Avg $142 per new client", "Average project value: $23k", "Average margin: 91%"; Strategic insights: "Priority A clients generate 62% of revenue but only 18% of training costs (efficient)", "Consider: Raising prices for clients with <70% margins, Allocating more budget to high-margin clients, Converting experimental clients (Priority C) to standard (Priority B) if successful"

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
