# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/16/2025  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\01-pipeline-overview.md`
- User Stories: `pmc\product\02-pipeline-user-stories.md`


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
