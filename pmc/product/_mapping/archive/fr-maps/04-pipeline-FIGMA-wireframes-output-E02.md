# LoRA Pipeline - FIGMA Wireframes Output - E02
**Version:** 1.0  
**Date:** 12-18-2025  
**Section:** E02 - Training Job Execution & Monitoring  
**Stage:** Stage 2 — Training Job Execution & Monitoring

This file contains generated Figma-ready wireframe prompts for all functional requirements in Section E02.

---

=== BEGIN PROMPT FR: FR2.1.1 ===

Title
- FR FR2.1.1 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- This feature provides a comprehensive real-time training progress dashboard that enables AI engineers to monitor active training jobs with live-updating metrics, interactive loss curve visualization, detailed progress indicators, and cost tracking. The dashboard eliminates the anxiety of "black box" training by providing transparent, real-time visibility into model training progression, current performance metrics, and estimated completion times. Users access this dashboard immediately after starting a training job and use it throughout the 8-20 hour training duration to ensure training is progressing correctly and costs remain within estimates.

Journey Integration
- Stage goals: Monitor training job execution in real-time, understand current training status and metrics, confirm training is progressing correctly without errors, track cost accumulation against estimates
- Key emotions: Anxiety reduction through transparency (eliminating "is it working?" fear), confidence building through visible progress, control through ability to monitor and intervene if needed
- Progressive disclosure levels:
  * Basic: Overall progress percentage, current stage, estimated time remaining
  * Advanced: Live loss curves with dual-axis visualization, detailed metrics table with trend indicators
  * Expert: Exportable graphs, historical metric comparisons, performance bottleneck identification
- Persona adaptations: Technical leads need detailed metrics and loss curves for training analysis; Budget managers need prominent cost tracking; QA analysts need access to validation loss trends

### Journey-Informed Design Elements
- User Goals: Real-time visibility into training progress, confirmation that training is working correctly, early detection of problems (stalled training, cost overruns), informed decision-making about whether to continue or cancel
- Emotional Requirements: Show immediate feedback on training status, maintain transparency throughout 8-20 hour training duration, provide confidence through detailed metrics, reduce anxiety about cost overruns
- Progressive Disclosure:
  * Basic: Progress header card with percentage complete, current step, elapsed time, estimated remaining
  * Advanced: Interactive loss curve graph with zoom controls and dual-axis display for training/validation loss
  * Expert: Exportable PNG graphs for reports, detailed metrics table with GPU utilization and tokens/second
- Success Indicators: User can quickly answer "Is my training working?", Cost tracking shows spending within estimates, Loss curves demonstrate improvement over time, All metrics update smoothly every 60 seconds without page refresh

Wireframe Goals
- Provide at-a-glance training status assessment (healthy progress vs problems)
- Visualize loss curve trends to confirm model is learning (decreasing loss)
- Display detailed real-time metrics for technical troubleshooting
- Track cost accumulation to prevent budget surprises
- Enable export of loss curves for documentation and client reports
- Support responsive design for mobile monitoring (check training while away from desk)

Explicit UI Requirements (from acceptance criteria)
- **Progress Header Card** displaying: Overall progress bar (animated, color-coded), Progress percentage ("42% Complete"), Current step indicator ("Step 850 of 2,000"), Current stage badge ("Training" with animated pulse icon), Elapsed time ("6h 23m"), Estimated remaining time ("8h 15m remaining"), Current epoch ("Epoch 2 of 3")
- **Live Loss Curve Graph** with: Dual y-axis line chart (training loss left, validation loss right), X-axis showing training step numbers, Training loss line (solid blue with data points), Validation loss line (dashed orange with data points), Interactive zoom controls (+/- buttons), Pan controls for viewing different time ranges, Reset zoom button to show full history, Export button generating PNG image (2000x1200px), Tooltip on hover showing step number and exact loss values, Legend with toggle buttons to show/hide each series
- **Current Metrics Table** displaying: Training loss with trend indicator ("0.342 ↓ from 0.389 -12.1%"), Validation loss with trend ("0.358 ↓ from 0.412 -13.1%"), Learning rate ("0.000182 - cosine schedule"), GPU utilization percentage ("87%"), GPU memory usage ("68GB / 80GB - 85%"), Perplexity if available ("1.43"), Tokens/second throughput ("1,247"), Steps/hour rate ("156")
- **Cost Tracker Card** showing: Estimated cost range ("$45-55" in gray), Current spend ("$22.18" in large bold font, color-coded), Percentage of estimate ("49% of estimate"), Hourly rate ("$2.49/hr spot"), Projected final cost ("$47.32"), Horizontal progress bar (current spend vs estimate), Color coding (green <80%, yellow 80-100%, red >100% of estimate)
- **Auto-refresh mechanism**: Polls API every 60 seconds, Updates all components with new data, Shows small spinner icon during fetch, Manual refresh button (circular arrow icon), Toast notification on successful refresh ("Metrics updated")
- **Loading states**: Initial skeleton placeholders (gray animated rectangles) for header card, graph, metrics table, and cost card during first load, Smooth transitions when real data loads
- States: Active training (all components live), Completed training (static final data, no polling), Failed training (red error indicators), Loading (skeletons), Error fetching data (retry button with error message)
- **Responsive design breakpoints**: Desktop >1024px (side-by-side graph and metrics), Tablet 768-1023px (stacked layout), Mobile <768px (single column, collapsible sections)

Interactions and Flows
- **Page access flow**: User clicks active job from jobs list → Dashboard page loads at `/training-jobs/{job_id}` → Initial data fetch (2 second max) → Skeleton components display → Data loads → Components populate → Auto-refresh begins (60s interval)
- **Graph interactions**: Hover over line chart → Tooltip displays step number and exact loss values, Click zoom in (+) → Chart focuses on most recent 500 steps, Click zoom out (-) → Chart expands to show more history, Click reset zoom → Chart displays complete training history, Click and drag chart → Pan horizontally to view different time ranges, Click Export Graph → PNG image (2000x1200px) downloads immediately with filename "{job_name}-loss-curve-{timestamp}.png"
- **Metric trend interpretation**: Green down arrow (↓) indicates improvement (loss decreasing), Red up arrow (↑) indicates worsening (loss increasing), Gray horizontal line (→) indicates no significant change, Percentage change calculates delta from previous value
- **Cost monitoring flow**: User monitors cost tracker throughout training → Green indicator (spending <80% estimate) provides confidence → Yellow indicator (80-100%) triggers attention → Red indicator (>100%) triggers warning alert and consideration of cancellation → User can click "Cancel Job" button if cost concerns arise
- **Error handling**: If metrics fetch fails → Display last known data with timestamp "Last updated: 2 minutes ago" → Show retry button → Error message "Unable to fetch latest metrics. Check connection."

Visual Feedback
- **Progress indicators**: Animated progress bar with smooth filling animation, Pulsing blue indicator on "Training" stage badge, Animated clock icon next to elapsed time, Real-time countdown for estimated remaining time, Small spinner icon during metric refresh (60s intervals)
- **Trend indicators**: Green down arrow ↓ for improving metrics (loss decreasing), Red up arrow ↑ for worsening metrics (loss increasing), Gray horizontal line → for stable metrics, Percentage change display ("±X.X%")
- **Cost alerts**: Visual warning when approaching/exceeding estimate, Progress bar color changes (green → yellow → red), Warning icon (⚠) appears when >80% of estimate, Alert banner at >100% of estimate: "⚠ Cost Exceeding Estimate: Current $XX vs estimated $YY. Monitor closely or consider cancelling."
- **Loss curve feedback**: Blue pulse animation when new data points added, Smooth line transitions between updates, Crosshair cursor on hover showing exact values, Visual indication of zoom level (minimap or breadcrumb)
- **Loading states**: Skeleton pulse animation (shimmer effect), Fade-in transition when data loads, Brief blue pulse on updated rows when data refreshes
- **Success feedback**: Toast notification "Metrics updated" after manual refresh, Subtle highlight on changed values after auto-refresh, Green checkmark when cost stays within estimate

Accessibility Guidance
- **Keyboard navigation**: Tab key moves through interactive elements (refresh button, zoom controls, export button, cancel button), Enter key activates buttons, Arrow keys navigate through table rows, Escape key closes tooltips or modals
- **Screen reader support**: ARIA labels on all interactive elements, Progress bar announces "Training 42% complete, Step 850 of 2000", Graph described as "Training and validation loss line chart with dual y-axes", Metrics table row announces "Training loss 0.342, down 12.1% from previous value", Cost tracker announces "Current spend $22.18, 49% of estimated $45 to $55"
- **Focus indicators**: Clear blue outline on focused elements (2px solid, high contrast), Focus trap in modals, Skip to main content link for keyboard users
- **Color contrast**: WCAG AA compliant (4.5:1 for normal text, 3:1 for large text), Color not sole indicator (icons + text + patterns accompany color coding), High contrast mode support available
- **Text alternatives**: Alt text for all icons, Text labels accompany visual indicators, Tooltips provide additional context

Information Architecture
- **Page hierarchy**: Page title "Training Job: {Job Name}" → Progress Header Card (prominent, top of page) → Main content area split into: Left column (wider): Live Loss Curve Graph, Right column (narrower): Current Metrics Table + Cost Tracker Card → Stage indicator component below header
- **Visual grouping**: Progress header card: Grouped status information (progress, stage, time estimates), Loss curve section: Chart + zoom controls + export button grouped, Metrics section: Related metrics grouped by category (training metrics, GPU metrics, throughput metrics), Cost section: All cost-related information grouped (estimate, current, projected)
- **Content prioritization**: Primary: Progress percentage, current stage, loss curve - Large, prominent display; Secondary: Detailed metrics, cost tracker - Medium size, easy to scan; Tertiary: Export options, manual refresh - Smaller, accessible but not dominant
- **Layout balance**: Left side (60% width): Visual graph for pattern recognition, Right side (40% width): Numerical details for precision, Header spans full width: Quick status at-a-glance

Page Plan
1. **Training Progress Dashboard - Active Job State**
   - Purpose: Primary monitoring interface for active training job
   - Components: Progress Header Card (full width), Stage Indicator (below header), Live Loss Curve Graph (left 60%), Current Metrics Table (right 40% top), Cost Tracker Card (right 40% bottom), Manual refresh button (top right), Auto-refresh indicator (last updated timestamp)
   - States: Auto-refreshing every 60 seconds, All data live and updating, Loading skeletons on first load, Smooth transitions on data updates
   - Navigation: "Overview" tab (current), "Metrics" tab, "Event Log" tab, "Cancel Job" button (prominent, red, top right)

2. **Training Progress Dashboard - Graph Focused View**
   - Purpose: Detailed loss curve analysis with zoom and pan capabilities
   - Components: Expanded loss curve graph (full width or larger), Zoom controls (active), Pan controls (drag enabled), Reset zoom button, Export graph button, Tooltip overlay (on hover), Minimap or zoom indicator showing current view range
   - States: Zoomed in to recent 500 steps, Zoomed out to full history, Panned to specific training phase, Tooltip displaying on hover
   - Interactions: User clicked zoom (+), User dragged chart to pan, User clicked export (PNG download initiated)

3. **Training Progress Dashboard - Error State**
   - Purpose: Handle metric fetch failures gracefully while preserving last known data
   - Components: Progress Header Card (last known data with timestamp), Loss Curve Graph (static, last known data), Current Metrics Table (last known values with "Last updated: X minutes ago"), Cost Tracker (last known cost with warning), Error banner at top: "Unable to fetch latest metrics. Check connection.", Retry button (prominent)
   - States: Network error occurred, Last successful fetch > 5 minutes ago, Auto-refresh paused until manual retry
   - Navigation: User can retry refresh, User can navigate to other tabs, User can access event log for troubleshooting

4. **Training Progress Dashboard - Cost Warning State**
   - Purpose: Alert user when training cost exceeds estimate, prompt decision to continue or cancel
   - Components: All standard dashboard components, Cost Tracker Card with red highlighting, Alert banner across top: "⚠ Cost Exceeding Estimate: Current $54 vs estimated $45-55. Monitor closely or consider cancelling.", "Cancel Job" button emphasized with red pulse animation, Projected final cost displayed prominently ("Projected: $67 if current rate continues")
   - States: Current spend > 100% of maximum estimate, User has option to continue monitoring or cancel immediately
   - Actions: User clicks "Cancel Job" → Confirmation modal, User continues monitoring → Alert remains visible

Annotations (Mandatory)
- Attach notes to each UI component citing the specific acceptance criterion it fulfills
- Create separate "Mapping Table" frame in Figma showing: Acceptance Criterion (full text) → Screen(s) where implemented → Component(s) that implement it → State(s) that satisfy it → Notes on implementation details
- Use consistent annotation numbering: [US-2.1.1-AC-01] for User Story acceptance criteria, [FR-2.1.1-AC-01] for Functional Requirement acceptance criteria
- Link annotations directly to source documents when possible (line numbers or IDs)

Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Training jobs list page shows all jobs (active, completed, failed, queued) | US2.1.1 | Not in this FR (separate FR2.3.1) | Jobs list table | All job statuses | Out of scope for this FR, covered in job list view |
| Click active job opens detailed progress dashboard | US2.1.1 | All screens | Dashboard page navigation | Active job | User navigates from jobs list to this dashboard |
| Overall progress: 42% complete (Step 850 of 2000) | US2.1.1 | Screen 1 (Active Job State) | Progress Header Card - Progress bar, Progress percentage text, Step indicator | Active training | Large progress bar with percentage, step count below |
| Current stage: Training (with visual stage indicator) | US2.1.1 | Screen 1 | Progress Header Card - Stage badge | Active training | Badge shows "Training" with animated pulse icon |
| Elapsed time: 6h 23m | US2.1.1 | Screen 1 | Progress Header Card - Elapsed time display | Active training | Calculated from job.started_at, updates every second client-side |
| Estimated remaining: 8h 15m (updates based on actual speed) | US2.1.1 | Screen 1 | Progress Header Card - Estimated remaining display | Active training | Calculated dynamically: (remaining_steps × avg_seconds_per_step) / 3600, updates every 60s |
| Current epoch: 2 of 3 | US2.1.1 | Screen 1 | Progress Header Card - Epoch indicator | Active training | Shows current epoch progress |
| Line chart with dual y-axes: training loss (left), validation loss (right) | US2.1.1 | Screens 1, 2 | Live Loss Curve Graph | Active training, all zoom states | Chart.js or Recharts implementation with dual-axis configuration |
| X-axis: training step number | US2.1.1 | Screens 1, 2 | Live Loss Curve Graph - X-axis | Active training | Smart tick intervals (every 100 steps if <1000 total, every 500 if >5000) |
| Updates every 60 seconds via polling or websocket | US2.1.1 | Screens 1, 2 | Auto-refresh mechanism | Active training | setInterval(() => fetchJobMetrics(), 60000) |
| Zoom controls to focus on recent steps | US2.1.1 | Screen 2 | Live Loss Curve Graph - Zoom buttons (+/-) | Zoomed in, zoomed out | Zoom in focuses on recent 500 steps, zoom out shows more history |
| Export graph as PNG for reports | US2.1.1 | Screens 1, 2 | Live Loss Curve Graph - Export button | All states | Generates PNG (2000x1200px), filename: "{job_name}-loss-curve-{timestamp}.png" |
| Training loss: 0.342 (↓ from 0.389) | US2.1.1 | Screen 1 | Current Metrics Table - Training loss row | Active training | Displays current value with trend arrow and percentage change |
| Validation loss: 0.358 (↓ from 0.412) | US2.1.1 | Screen 1 | Current Metrics Table - Validation loss row | Active training | Displays current value with trend arrow and percentage change |
| Learning rate: 0.000182 (current schedule value) | US2.1.1 | Screen 1 | Current Metrics Table - Learning rate row | Active training | Shows current LR from scheduler with schedule type indicator |
| GPU utilization: 87% | US2.1.1 | Screen 1 | Current Metrics Table - GPU utilization row | Active training | Percentage from RunPod webhook, warning if <50% |
| Perplexity (if available): 1.43 | US2.1.1 | Screen 1 | Current Metrics Table - Perplexity row | Active training (if calculated) | Conditional display, only shown if perplexity calculated |
| Estimated cost: $45-55 | US2.1.1 | Screens 1, 4 | Cost Tracker Card - Estimated cost display | All states | Pre-calculated estimate from job configuration |
| Current spend: $22.18 (49% of estimate) | US2.1.1 | Screens 1, 4 | Cost Tracker Card - Current spend display, Progress bar | Active training | Calculated: (elapsed_hours + interruption_hours) × gpu_hourly_rate, updates every 60s |
| Hourly rate: $2.49/hr (spot) | US2.1.1 | Screens 1, 4 | Cost Tracker Card - Hourly rate display | All states | Shows GPU type (spot/on-demand) and rate |
| Projected final cost: $47.32 | US2.1.1 | Screens 1, 4 | Cost Tracker Card - Projected cost display | Active training | current_spend + (estimated_remaining_hours × hourly_rate) |
| Auto-refresh every 60 seconds (with manual refresh button) | US2.1.1 | Screens 1, 2, 3 | Manual refresh button (top right), Auto-refresh indicator | All states | Circular arrow icon, disables during fetch, toast on success |
| Loading skeletons during data fetch | US2.1.1 | Screens 1, 3 | Skeleton components | Initial load, error state | Gray animated rectangles matching final layout |
| Dashboard loads within 2 seconds for jobs with <10K metric data points | FR2.1.1 | Screen 1 | All components | Initial load | Performance optimization with indexed queries |
| Progress percentage calculation | FR2.1.1 | Screen 1 | Progress Header Card - Progress bar | Active training | Formula: (current_step / total_steps) × 100 |
| Elapsed time formatted as "Xh Ym" or "Xd Yh" | FR2.1.1 | Screen 1 | Progress Header Card - Elapsed time | Active training | NOW() - job.started_at, formatted for readability |
| Estimated remaining updates every 60s based on actual speed | FR2.1.1 | Screen 1 | Progress Header Card - Estimated remaining | Active training | Dynamic calculation improves accuracy as training progresses |
| Training loss line: solid blue with data points | FR2.1.1 | Screens 1, 2 | Live Loss Curve Graph - Training loss line | All states | Visual styling specification |
| Validation loss line: dashed orange with data points | FR2.1.1 | Screens 1, 2 | Live Loss Curve Graph - Validation loss line | All states | Visual styling specification |
| Grid lines: light gray | FR2.1.1 | Screens 1, 2 | Live Loss Curve Graph - Grid | All states | Visual styling specification |
| Tooltip on hover with step and loss values | FR2.1.1 | Screen 2 | Live Loss Curve Graph - Tooltip overlay | Hover state | "Step 850: Training Loss 0.342, Validation Loss 0.358" |
| Legend with toggle buttons to show/hide series | FR2.1.1 | Screens 1, 2 | Live Loss Curve Graph - Legend | All states | Clickable legend entries toggle line visibility |
| Zoom in: focus on most recent 500 steps | FR2.1.1 | Screen 2 | Live Loss Curve Graph - Zoom controls | Zoomed in state | Button interaction specification |
| Zoom out: show full training history | FR2.1.1 | Screen 2 | Live Loss Curve Graph - Zoom controls | Zoomed out state | Button interaction specification |
| Reset zoom: display complete dataset | FR2.1.1 | Screen 2 | Live Loss Curve Graph - Reset button | Default zoom state | Returns to full view after zoom operations |
| Pan controls: drag chart horizontally | FR2.1.1 | Screen 2 | Live Loss Curve Graph - Pan interaction | Panning state | Click and drag to view different time ranges |
| Trend indicators: ↓ green if improving, ↑ red if worsening, — gray if unchanged | FR2.1.1 | Screen 1 | Current Metrics Table - All metric rows | Active training | Visual feedback on metric changes |
| Percentage change calculation | FR2.1.1 | Screen 1 | Current Metrics Table - All metric rows | Active training | Delta from previous value: "(±X.X%)" |
| GPU memory usage display | FR2.1.1 | Screen 1 | Current Metrics Table - GPU memory row | Active training | "{used_gb}GB / {total_gb}GB ({percentage}%)" |
| Warning if GPU utilization <50% | FR2.1.1 | Screen 1 | Current Metrics Table - GPU utilization row | Low utilization state | "⚠ Low GPU utilization, possible bottleneck" |
| Cost progress bar with color coding | FR2.1.1 | Screens 1, 4 | Cost Tracker Card - Progress bar | All spending states | Green <80%, yellow 80-100%, red >100% of estimate |
| Cost warning alert when exceeding estimate | FR2.1.1 | Screen 4 | Alert banner, Cost Tracker Card | Cost exceeded state | "⚠ Cost Exceeding Estimate: Current $XX vs estimated $YY." |
| Manual refresh button with loading indicator | FR2.1.1 | All screens | Manual refresh button | Refreshing state | Disabled during fetch, spinner icon, toast notification on success |
| Error handling with retry button | FR2.1.1 | Screen 3 | Error banner, Retry button | Error state | Displays last known data, allows manual retry, shows error message |
| Responsive layout for desktop/tablet/mobile | FR2.1.1 | All screens | All components | All device sizes | Desktop: side-by-side, Tablet: stacked, Mobile: single column collapsible |

Non-UI Acceptance Criteria

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Loss data fetched from `training_metrics_history` table with SQL query | Backend data retrieval | No direct UI impact, but determines data availability for graph |
| Data cached in component state, new data appended on refresh | Performance optimization | Prevents flickering, smooth transitions when data updates |
| Progress percentage calculation formula | Business logic | Ensures accurate progress display in header card |
| Cost calculation formula | Business logic | Ensures accurate cost tracking in cost tracker card |
| Database query optimization with indexes | Performance | Enables 2-second page load requirement |
| Polling mechanism implementation | Technical architecture | Auto-refresh every 60 seconds, alternative websocket mentioned for future |
| Result caching for 30 seconds | Performance | Reduces database load, acceptable latency for monitoring use case |
| Virtualized scrolling for >100 jobs | Performance | Not applicable to this FR (single job dashboard), relevant for job list FR |
| Job status must be IN ('provisioning', 'preprocessing', 'model_loading', 'training', 'queued') for polling to be active | Business logic | Dashboard only polls for active jobs, static display for completed/failed |

Estimated Page Count
- **4 screens** covering all necessary states and interactions:
  1. Active Job State (primary monitoring interface with all components)
  2. Graph Focused View (detailed loss curve analysis with zoom/pan)
  3. Error State (graceful handling of fetch failures)
  4. Cost Warning State (alert when spending exceeds estimate)
- Rationale: Comprehensive coverage of normal operation (active monitoring), interactive exploration (graph zoom), error scenarios (fetch failure), and critical alerts (cost overrun), totaling 4 distinct screen states that satisfy all UI-relevant acceptance criteria

=== END PROMPT FR: FR2.1.1 ===


=== BEGIN PROMPT FR: FR2.1.2 ===

Title
- FR FR2.1.2 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- This feature implements a visual stage progression indicator that displays the four sequential training phases (Preprocessing, Model Loading, Training, Finalization) with real-time status updates, animated transitions, and detailed progress information. The stage indicator eliminates user anxiety about what's happening "under the hood" during training by showing exactly which phase is active, how long each phase takes, and what operations are being performed. This transparency builds user confidence that training is progressing normally and helps identify when training is stuck or has failed.

Journey Integration
- Stage goals: Understand what training phase is currently active, know expected duration of each phase, confirm training is progressing through phases normally, identify where failures occur if training stops
- Key emotions: Reduced anxiety through transparency (knowing "what's happening now"), patience through duration expectations, confidence through completed checkmarks, empowerment through detailed status messages
- Progressive disclosure levels:
  * Basic: Four stage names with pending/active/complete status indicators
  * Advanced: Animated progress within each stage, substatus messages showing detailed operations
  * Expert: Stage duration tracking, historical comparison, performance analysis per stage
- Persona adaptations: All users benefit from stage transparency; Technical leads appreciate substatus messages for troubleshooting; Non-technical users focus on overall stage progress

### Journey-Informed Design Elements
- User Goals: Know which training phase is active, understand how long each phase takes, confirm training hasn't stalled, identify failure points quickly
- Emotional Requirements: Reduce "black box" anxiety, set expectations for phase durations, celebrate completions with checkmarks, maintain engagement during long training phase
- Progressive Disclosure:
  * Basic: Four-stage horizontal bar with visual progress through stages
  * Advanced: Each stage shows substatus messages like "Tokenizing 242 conversations..." with percentage progress within stage
  * Expert: Clickable stages reveal detailed logs, duration comparisons vs estimates, stage-specific troubleshooting
- Success Indicators: All four stages complete with green checkmarks, Actual durations match estimates, Training transitions smoothly between stages, User understands current activity at any time

Wireframe Goals
- Visualize training progression through four sequential phases
- Communicate current operations through substatus messages
- Set accurate duration expectations per stage (preprocessing: 2-5min, model loading: 10-15min, training: 10-20hr, finalization: 5-10min)
- Celebrate stage completions to maintain user engagement
- Identify failure points clearly when stages fail
- Support checkpoint recovery by showing interruption and recovery status

Explicit UI Requirements (from acceptance criteria)
- **Horizontal Stage Progress Bar** with four connected segments: Preprocessing (5% of bar width), Model Loading (10%), Training (80%), Finalization (5%)
- **Stage Visual Elements**: Each stage labeled with name and icon (preprocessing: ⚙️, model_loading: 📦, training: 🔄, finalization: ✅), Visual connectors (arrows or lines) between stages
- **Stage Status Rendering**:
  * Pending stage: Gray background, dotted border, gray icon, "Waiting..." text
  * Active stage: Blue animated gradient background, pulsing border, animated icon, substatus message displayed, elapsed time counter
  * Completed stage: Green solid background, checkmark icon (✓), actual duration display ("3m 42s")
  * Failed stage: Red background, error icon (❌), error message with "View Details" link
- **Preprocessing Stage** operations and substatus messages: "Downloading training file from storage..." (0-20%), "Parsing 242 conversations..." (20-40%), "Tokenizing text with Llama 3 tokenizer..." (40-70%), "Creating train/validation split (80/20)..." (70-90%), "Validating dataset format..." (90-100%), Estimated duration: 2-5 minutes, Stage completes when dataset tokenized, split, and validated
- **Model Loading Stage** operations and substatus messages: "Checking model cache..." (0-10%), "Downloading Llama 3 70B from Hugging Face Hub..." (10-60%, if not cached), "Loading model from cache..." (10-40%, if cached), "Applying 4-bit quantization (QLoRA)..." (60-80%), "Initializing LoRA adapters (rank={r})..." (80-95%), "Preparing training pipeline..." (95-100%), Estimated duration: 10-15 min first run, 3-5 min if cached, Stage completes when model loaded, adapters initialized
- **Training Stage** operations and substatus messages: "Training epoch {current}/{total} - Step {current_step}/{total_steps}...", "Loss: {loss:.4f} (↓/↑/→)", "Checkpoint saved at step {step}" (every 100 steps), "Running validation..." (after each epoch), "Epoch {epoch} complete - Avg loss: {avg_loss:.4f}", Progress: (current_step / total_steps) × 100, Estimated duration: 8-20 hours depending on preset/dataset, Stage completes when all epochs finished
- **Finalization Stage** operations and substatus messages: "Saving LoRA adapters to storage..." (0-40%), "Uploading adapter_model.bin ({size}MB)..." (40-60%), "Uploading adapter_config.json..." (60-70%), "Calculating final metrics..." (70-85%), "Generating training summary..." (85-95%), "Cleaning up temporary files..." (95-100%), Estimated duration: 5-10 minutes, Stage completes when artifacts uploaded, metadata updated
- **Per-Stage Progress Calculation**: Query latest webhook events for stage-specific progress, Calculate percentage within stage based on substatus patterns, For Training specifically: (current_step / total_steps) × 100
- **Elapsed Time Display**: Per-stage elapsed time from stage_started_at, Format: "2m 15s" (<60min), "1h 23m" (<24hr), "1d 5h" (>24hr), Updates every second client-side
- **Estimated Duration Display**: Show range based on historical data: "Est. 2-5 min" (preprocessing), "Est. 10-15 min" (model loading), "Est. 12-15 hrs" (training), "Est. 5-10 min" (finalization), Tooltip explains variance factors
- **Stage Transition Animation**: When stage completes: Fade from blue to green with checkmark, Optional subtle confetti/success animation, Display actual duration, Activate next stage (gray → blue with pulse), Send notification if user not viewing
- **Checkpoint Recovery Indicator**: During Training stage, if spot interruption: Brief red flash "⚠ Interrupted", Stage updates to "Recovering from checkpoint...", Mini progress bar shows recovery (0-100%), On success: "✓ Resumed from step {step}", Continue normal training display
- **Stage History Log**: Clickable stage segments reveal detailed log: "Preprocessing completed in 3m 42s", "Model loading completed in 11m 18s (cache hit)", "Training in progress: 6h 23m elapsed...", Each entry timestamped, expandable for substatus history
- States: Pending (gray, waiting), Active (blue animated, pulsing), Completed (green, checkmark), Failed (red, error icon), Recovering (yellow, restoration indicator)

Interactions and Flows
- **Initial Display**: User lands on dashboard → Stage indicator renders below progress header → First stage (Preprocessing) starts as active → Substatus message appears: "Downloading training file from storage..." → Progress percentage within stage updates
- **Stage Progression Flow**: Preprocessing active (2-5 min) → Completes with green checkmark → Model Loading activates (10-15 min) → Completes → Training activates (8-20 hours) → Completes → Finalization activates (5-10 min) → Completes → Job status becomes "completed"
- **Stage Click Interaction**: User clicks on completed stage segment → Detailed log panel expands showing: Stage name, Start/complete timestamps, Actual duration, All substatus messages with timestamps, Success checkmark → User clicks again to collapse
- **Checkpoint Recovery Flow**: Training in progress → Spot interruption detected → Stage flashes red briefly → Substatus changes to "⚠ Interrupted - Initiating recovery..." → Recovery progress bar appears (0-100%) → On success: "✓ Resumed from step {step}" → Normal training substatus resumes
- **Failure Handling**: Stage encounters error → Stage background turns red → Error icon (❌) appears → Error message displayed: "Failed: Out of Memory" → "View Error Details" link becomes clickable → User clicks link → Full error log modal opens → Subsequent stages remain gray (pending) → Option to "Retry from This Stage" if applicable
- **Duration Expectation Management**: User hovers over stage → Tooltip displays: "Estimated duration: 2-5 minutes" → After completion: "Actual: 3m 42s (within estimate)" → If significantly longer: Warning indicator with tooltip "Taking longer than usual, check GPU utilization"

Visual Feedback
- **Stage Status Animations**: Active stage: Pulsing border (smooth 2s animation loop), Gradient background animation (subtle left-to-right sweep), Animated icon (rotating gear for preprocessing, bouncing package for model loading, spinning arrows for training), Elapsed time counter increments every second
- **Completion Animations**: Stage completes: Blue → Green fade transition (500ms), Checkmark icon fade-in with scale animation, Optional confetti burst (subtle, brief), Green glow effect around completed stage (fades after 2 seconds), Next stage activation: Gray → Blue fade with pulse
- **Progress Within Stage**: For stages with calculable progress: Thin progress bar at bottom of stage segment (fills left to right), Percentage text updates (e.g., "42% - Tokenizing..."), Smooth transitions between substatus messages
- **Error State Feedback**: Stage fails: Blue → Red flash transition, Error icon shake animation, Red glow effect (persistent), Error message slides down below stage indicator, "View Details" link pulses to draw attention
- **Recovery Feedback**: Interruption detected: Red flash on stage, Stage border changes to dashed yellow (recovery mode), Mini progress bar appears: "Recovery progress: 75%", On success: Yellow → Blue transition, Success toast: "Training resumed successfully"

Accessibility Guidance
- **Keyboard Navigation**: Tab key moves focus between clickable stage segments, Enter/Space on stage opens detailed log panel, Arrow keys navigate between stages, Escape closes expanded panels
- **Screen Reader Support**: ARIA labels on each stage: "Stage 1 of 4: Preprocessing - Completed in 3 minutes 42 seconds", Current stage announced: "Stage 2 of 4: Model Loading - Active, 5 minutes 12 seconds elapsed", Substatus messages announced when changed: "Now tokenizing 242 conversations, 42% complete", Stage transitions announced: "Preprocessing stage completed. Model loading stage started."
- **Visual Indicators**: High contrast borders distinguish stages clearly, Status not conveyed by color alone (icons + text + animations provide redundancy), Pattern fills in addition to colors for colorblind users, Large touch targets for mobile (minimum 44x44px)
- **Focus Management**: Clear focus indicators on interactive stages (3px solid blue outline), Focus trap in expanded log panels, Focus automatically moves to newly active stage when transition occurs (optional, configurable)

Information Architecture
- **Component Hierarchy**: Stage Indicator Component (positioned below Progress Header Card, above main dashboard content) → Four Stage Segments (horizontal layout, equal semantic importance) → Each segment contains: Stage icon (top), Stage name (center), Stage status (active/complete/pending), Substatus message (active stage only), Duration display (elapsed or actual)
- **Visual Layout**: Horizontal bar spanning full width of dashboard, Four segments with proportional widths reflecting typical duration (Preprocessing 5%, Model Loading 10%, Training 80%, Finalization 5%), Connecting arrows between stages show progression direction, Current stage highlighted with animated border and larger size
- **Information Density**: At-a-glance view: Stage names, status icons, current stage highlighted, Medium detail: Substatus messages for active stage, elapsed times for active/completed stages, Full detail (expandable): Complete substatus history, timestamps, duration comparisons, troubleshooting hints

Page Plan
1. **Stage Indicator - Normal Progression State**
2. **Stage Indicator - Training Phase Active**
3. **Stage Indicator - Checkpoint Recovery State**
4. **Stage Indicator - Failure State**
5. **Stage Indicator - Expanded History View**

Annotations (Mandatory)
- Attach notes to each stage segment citing acceptance criteria for substatus messages, duration estimates, and visual states

Non-UI Acceptance Criteria
- Stage data structure stored in training_jobs table, Stage progress calculated from webhook events, Historical stage duration tracking for improvements

Estimated Page Count
- **5 screens** covering all stage progression states

=== END PROMPT FR: FR2.1.2 ===

=== BEGIN PROMPT FR: FR2.1.3 ===

Title
- FR FR2.1.3 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- Comprehensive chronological event log displaying all webhook events from GPU training container with color-coded categorization, expandable JSON payloads, filtering, search, and export capabilities. Engineers use this for detailed troubleshooting, post-mortem analysis, and understanding training behavior at a granular level.

Journey Integration
- Stage goals: Troubleshoot issues via detailed event history, understand failure causes, export data for analysis
- Key emotions: Empowerment through data access, confidence through transparency
- Progressive disclosure: Basic (event list), Advanced (expandable JSON), Expert (filtering, search, export)
- Persona adaptations: Technical users debugging; Support teams resolving tickets

Wireframe Goals
- Display complete chronological audit trail
- Enable rapid problem identification via color coding
- Support deep investigation via JSON payloads
- Provide filtering and search capabilities
- Support export for external analysis
- Real-time updates during active training

Explicit UI Requirements
- Event Log tab with table: Timestamp, Event Type (color badge), Message, Actions (expand button)
- Event types: Status (blue), Metrics (green), Warning (yellow), Error (red), Info (gray), Checkpoint (purple)
- Expandable rows show formatted JSON with syntax highlighting and Copy button
- Filter by event type with multi-select
- Keyword search with highlighting
- Real-time polling (10s) prepends new events with blue pulse
- Pagination 50/page (configurable 25/50/100)
- Export modal: JSON/CSV format, filtered view option, date range

Interactions and Flows
- Click Event Log tab → Table loads → Real-time polling begins
- Click row → JSON expands with syntax highlighting → Copy JSON → Collapse
- Apply filters → Table updates immediately → URL updated
- Search keyword → Results highlight matches → Count displayed
- Export → Modal opens → Select options → Download instantly

Visual Feedback
- Color badges for event types with icons
- Row hover: light blue tint
- Expand animation (300ms smooth slide)
- New events: blue pulse (2s)
- Search highlights: yellow background

Accessibility
- Keyboard: Tab/Enter/Arrows/Escape navigation
- Screen reader announces events and changes
- Focus indicators (2px blue outline)
- Color not sole indicator (icons + text)

Page Plan
1. Active Job Mixed Events (typical view during training)
2. Expanded JSON Payload (detailed investigation)
3. Filtered Errors/Warnings (troubleshooting)
4. Keyword Search Results (finding specific events)
5. Export Modal (data export)

=== END PROMPT FR: FR2.1.3 ===

=== BEGIN PROMPT FR: FR2.2.1 ===

Title
- FR FR2.2.1 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- Comprehensive job cancellation functionality enabling users to terminate active training jobs through confirmation workflow displaying progress, cost, and requiring acknowledgment of irreversibility. System communicates with RunPod API to terminate GPU within 60s, calculates final costs, preserves partial data, and maintains audit trail.

Journey Integration
- Stage goals: Cancel training when problems detected, stop costs when job not progressing correctly, maintain control over spending
- Key emotions: Empowerment through control, relief when stopping wasteful spending, confidence through clear impact understanding
- Progressive disclosure: Basic (cancel button), Advanced (confirmation modal with impact analysis), Expert (cancellation reasons tracked for analytics)
- Persona adaptations: All users need cancel capability; Budget managers particularly value cost control

Wireframe Goals
- Provide prominent accessible cancel functionality
- Communicate cancellation impact clearly before execution
- Require explicit confirmation to prevent accidents
- Display current progress and costs before cancellation
- Track cancellation reasons for process improvement
- Preserve partial training data for analysis

Explicit UI Requirements
- "Cancel Job" button: Red destructive styling, prominent on dashboard header, disabled if job not active
- Confirmation modal: Warning icon, title "Cancel Training Job?", danger indicator (red border top), subtitle "This action cannot be undone"
- Current Status Display: Job name/ID, Progress bar "42% Complete (Step 850 of 2,000)", Current stage badge, Elapsed time "6h 23m", Cost spent "$22.18" (large bold)
- Impact Analysis: Bulleted list: Training stops immediately, GPU terminates within 60s, Partial progress saved, Cannot resume (must start new job), Final cost based on elapsed time
- Cancellation Reason: Dropdown required: Loss not decreasing, Cost too high, Wrong configuration, Testing, Better results elsewhere, Client request, Other (specify)
- Optional Notes: Textarea 500 char limit for additional context
- Confirmation Checkbox: "I understand this action cannot be undone" - must check to enable Confirm button
- Action Buttons: "Confirm Cancellation" (red, disabled until checkbox), "Go Back" (gray), Escape key = Go Back only (no Enter shortcut)

Interactions and Flows
- Click "Cancel Job" → Modal opens → User reviews current status and impact → Selects cancellation reason → Optionally adds notes → Checks confirmation checkbox → Confirms → Job status updates "cancelling" → RunPod API called → GPU terminates → Final cost calculated → Toast: "Job cancelled. Final cost: $22.18" → Email/Slack notifications sent
- If GPU termination >60s: Warning displayed, continues monitoring up to 5 min, job still marked cancelled
- Post-cancellation: Job details page accessible, status badge "Cancelled" (orange), All partial data preserved (loss curves, metrics, event log), Download artifacts if checkpoints available

Visual Feedback
- Cancel button: Red background, white text, warning icon, prominent placement
- Modal: Red border top (danger indicator), large warning icon, destructive action styling
- Confirmation checkbox: Warning-colored label, Must be checked visual feedback
- Progress indicators: Final cost bold and large, impact list with icons (✗ for losses, ✓ for preserved data)
- Success toast: "✓ Training Job Cancelled"

Accessibility
- Keyboard: Tab through modal elements, Escape closes (returns to dashboard), Enter cannot confirm (prevents accidents)
- Screen reader: "Warning: Cancel training job. This action cannot be undone.", Checkbox required announcement, Impact list read clearly
- Focus: Modal traps focus, Clear indicators, Confirm button announces enabled state

Page Plan
1. Dashboard with Cancel Button (normal training view with cancel option)
2. Cancellation Confirmation Modal (impact analysis and confirmation required)
3. Cancellation in Progress (terminating GPU status)
4. Post-Cancellation State (cancelled job with preserved partial data)

=== END PROMPT FR: FR2.2.1 ===

=== BEGIN PROMPT FR: FR2.2.2 ===

Title
- FR FR2.2.2 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- Pause/resume functionality enabling users to suspend training by saving checkpoints, terminating GPU to eliminate costs, and later resuming from exact state. Supports GPU type switching on resume, tracks paused durations separately, enables strategic cost optimization via peak-hour avoidance. (Future Enhancement - Low Priority)

Journey Integration
- Stage goals: Optimize costs by pausing during peak hours, maintain flexibility in training scheduling, preserve training state perfectly
- Key emotions: Control over spending, confidence in state preservation, satisfaction from cost optimization
- Progressive disclosure: Basic (pause/resume buttons), Advanced (GPU type switching on resume), Expert (scheduled pause/resume automation)
- Persona adaptations: Budget-conscious users, strategic cost optimizers

Wireframe Goals
- Provide pause capability during training
- Show clear cost benefits of pausing
- Enable resume with configuration changes
- Track active vs paused durations separately
- Support multiple pause/resume cycles
- Suggest optimal pause times based on pricing

Explicit UI Requirements
- "Pause Job" button: Yellow/orange, next to Cancel, enabled only during training stage (not preprocessing/loading/finalization)
- Pause Confirmation Modal: Title "Pause Training Job?", Description of what happens (checkpoint saved, GPU terminated, costs stop), Current progress display, Information: Progress saved, Resume later from exact point, GPU costs stop, Resume may take 5-10 min, Buttons: "Pause Training" (yellow), "Continue Training"
- Paused Job State: Status badge "Paused" (yellow/orange), Pause information card: Paused at step X on date/time, Elapsed training time (excluding paused), Cost so far, Checkpoint saved (size MB), "Resume Training" button (prominent blue ▶️)
- Resume Modal: "Resume from: Step X (Y% complete)", Estimated remaining time/steps, Previous configuration display, GPU type option: [Spot ▼] / [On-Demand] (allows switching), Estimated additional cost, Warnings if applicable (long duration, spot interruption risk), Buttons: "Resume Training", "Cancel"
- Cost Tracking Display: Active training time, Paused time, Total elapsed time, Cost based on active time only
- Pause/Resume History Timeline: Visual timeline showing pause/resume events with durations

Interactions and Flows
- Click "Pause Job" → Confirmation modal → Confirm → Save checkpoint immediately → Upload to storage → Terminate GPU → Status "paused" → Notification sent
- On paused job: Click "Resume Training" → Resume modal → Optionally switch GPU type → Confirm → Provision GPU → Download checkpoint → Restore state → Status "training" → Continue from saved step
- Multiple cycles: Can pause and resume multiple times, each creates new checkpoint, resume uses most recent

Visual Feedback
- Pause button: Yellow/orange (distinct from red cancel), ⏸️ icon
- Paused status badge: Yellow/orange background
- Resume button: Blue with ▶️ icon, prominent placement
- Cost tracking: Separate displays for active vs paused time with clear labels
- Timeline: Visual representation of pause/resume cycles

Accessibility
- Keyboard: Standard navigation, Enter/Space for buttons
- Screen reader: Clear pause vs cancel distinction, Pause implications announced, Resume from checkpoint state announced
- Focus: Standard indicators throughout modals

Page Plan
1. Training Dashboard with Pause Button (active training with pause option)
2. Pause Confirmation Modal (explaining pause implications)
3. Paused Job State (showing saved progress and resume option)
4. Resume Configuration Modal (resuming with optional GPU type change)
5. Multi-Pause Timeline View (tracking multiple pause/resume cycles)

=== END PROMPT FR: FR2.2.2 ===

=== BEGIN PROMPT FR: FR2.3.1 ===

Title
- FR FR2.3.1 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- Comprehensive training jobs list view with advanced filtering, sorting, search, status-based color coding, bulk actions, pagination, and CSV export. Serves as primary navigation for accessing job details, enables efficient management through bulk operations, supports team coordination and budget oversight.

Journey Integration
- Stage goals: Browse all training jobs, filter by status/creator/date, search for specific jobs, access job details quickly
- Key emotions: Organization through comprehensive view, efficiency through filtering, control through bulk actions
- Progressive disclosure: Basic (job list with key info), Advanced (filtering and search), Expert (bulk operations and export)
- Persona adaptations: Technical leads need full visibility; Budget managers focus on costs; Team members view own jobs

Wireframe Goals
- Display all training jobs with key information at-a-glance
- Enable rapid filtering by status, creator, date, configuration
- Support keyword search across job names, notes, tags
- Provide bulk actions for multiple job management
- Enable CSV export for reporting and analysis
- Real-time updates for active job status/progress

Explicit UI Requirements
- Jobs list page `/dashboard/training-jobs` with responsive table
- Columns: [Checkbox] | Job Name | Status | Configuration | Created By | Started At | Duration | Cost | [Actions]
- Status badges: Queued (gray ⏳), Provisioning (light blue ⚙️), Preprocessing (light blue 🔄), Training (blue animated 🏃), Completed (green ✓), Failed (red ❌), Cancelled (orange ⏹️), Paused (yellow ⏸️)
- Configuration display: Preset badge (Conservative green, Balanced blue, Aggressive purple), GPU type (Spot/On-Demand with icon), Hover tooltip shows hyperparameters
- Filter panel: Status (checkboxes), Created by (dropdown with user list), Date range (quick select + custom), Configuration preset (checkboxes), Cost range (checkboxes), GPU type (checkboxes)
- Search box: "Search by job name, notes, or tags...", debounced 500ms
- Sort: Click column headers toggle ASC/DESC, default created date DESC
- Pagination: 25/50/100 per page selector, page navigation "< Previous | Page X of Y | Next >"
- Bulk actions: Select checkbox in rows, "Select All" in header, Action bar appears: "X jobs selected | [Actions ▼] | Clear Selection", Actions: Cancel Selected, Delete Selected, Export Selected, Compare Selected (max 4)
- Export button: "Export" opens modal with current view / all jobs options, CSV format with all columns

Interactions and Flows
- Page loads → Jobs table displays → Real-time polling updates active job status/progress every 60s
- Apply filters → Table updates immediately → URL reflects filters → Filter state preserved on reload
- Search keyword → Results filter → Matching text not highlighted in table (too cluttered), just filtered
- Click row (except checkbox/actions) → Navigate to job details page
- Select multiple jobs → Bulk action bar appears → Choose action → Confirmation modal (for destructive) → Execute → Toast confirmation
- Click Export → Modal → Select options → Download CSV instantly

Visual Feedback
- Status badges: Color-coded with icons and animations (Training pulse)
- Row hover: Subtle blue highlight
- Cost color coding: Green <$50, Yellow $50-$100, Red >$100
- Active jobs: Progress percentage updates, cost updates every 60s
- Loading states: Skeleton rows on initial load, spinner during filter changes
- Empty states: "No jobs yet. Create Your First Training Job", "No jobs match filters. Clear Filters"

Accessibility
- Keyboard: Tab through rows, Enter opens details, Space selects checkbox, Arrow keys scroll
- Screen reader: Table announced with row/column count, Each row announces key info, Filter/sort changes announced
- Focus: Clear indicators on all interactive elements
- High contrast: Status not by color alone (icons + text)

Page Plan
1. Jobs List - Mixed Status View (typical overview with various job states)
2. Jobs List - Filtered Active Jobs (showing only in-progress training)
3. Jobs List - Bulk Selection Mode (multiple jobs selected with actions)
4. Jobs List - Export Modal (exporting filtered results)
5. Jobs List - Mobile Responsive View (card layout for small screens)

=== END PROMPT FR: FR2.3.1 ===

=== BEGIN PROMPT FR: FR2.3.2 ===

Title
- FR FR2.3.2 Wireframes — Stage 2 — Training Job Execution & Monitoring

Context Summary
- Intelligent queue management displaying queued/provisioning jobs with calculated start time estimates, queue positions, priority indicators, and resource availability. Enforces concurrency limits, applies FIFO scheduling, supports priority promotion with approval, provides real-time updates, enables resource planning and client expectation management.

Journey Integration
- Stage goals: Understand queue position, estimate start time, manage resource allocation, set client expectations
- Key emotions: Patience through clear expectations, control through queue visibility, confidence through estimated start times
- Progressive disclosure: Basic (queue position and start estimate), Advanced (priority promotion options), Expert (queue analytics and optimization)
- Persona adaptations: All users see queue; Managers can promote jobs; Operations views analytics

Wireframe Goals
- Display queued jobs with clear position and start estimates
- Show active job slots and availability
- Calculate realistic start time estimates
- Enable priority promotion with approval workflow
- Provide queue analytics for optimization
- Update estimates in real-time as jobs complete

Explicit UI Requirements
- "Queue" tab on training jobs page, badge shows queue count "Queue (5)"
- Card-based layout (not table): Each card shows queue position badge (large #1, #2, etc with color coding: #1-3 green, #4-7 yellow, #8+ orange), Job name/ID, Configuration summary, Estimated start time "Today at 6:45 PM" / "in ~3 hours 20 minutes", Creator info, Actions menu
- Active Jobs Overview Panel: "Active Training Jobs: 2 of 3 slots", Visual slot indicators [🏃 Job A] [🏃 Job B] [⚪ Available], For each active: Job name (clickable), Progress %, Estimated completion, "View Details" link
- Estimated Start Time Calculation: Based on remaining time of jobs ahead + GPU provisioning buffer (5 min), Updates every 30s, Confidence indicator "Medium confidence" (if 1-2 jobs ahead), Tooltip explains variance factors
- Queue Priority System: Default FIFO by created_at, "Promote to Front" button (requires manager role), Approval modal: Reason dropdown (Client deadline, Critical business need, Testing urgent fix, Manager override), Justification text required (100-500 chars), Shows impact: "Will delay 4 other jobs by ~30 min each"
- Concurrency Limit Display: Max 3 concurrent jobs (configurable), Warning when queue >10: "Queue unusually long. Consider increasing limit or cancelling non-essential jobs"
- Queue Analytics: Average wait time, Queue throughput (jobs/day), Longest wait (historical), Current depth with indicator (moderate/high)

Interactions and Flows
- Click "Queue" tab → Queue view loads → Shows queued jobs in position order → Active slots display at top → Real-time updates every 30s recalculate estimates
- Job completes → Queue updates → Positions shift up → Start time estimates recalculate → If user's job reaches #1: Notification "Your job is next! Starting within 15 minutes"
- Manager clicks "Promote to Front" → Approval modal → Enters reason/justification → Submits → Email to approver → Approver clicks Approve/Deny → If approved: Job moves to #1, others shift down, requester notified
- Queue position notifications (opt-in): Job reaches #3, Job reaches #1, Job starts provisioning, Job starts training

Visual Feedback
- Queue position badges: Large circular/pill, color-coded by urgency, #1 with animated pulse
- Start time estimates: Clear prominent display with countdown timer
- Active slots: Visual indicators showing filled vs available
- Queue movement: Smooth animations when positions change
- Priority promotion: Visual indication when job promoted (star icon, "Priority" badge)

Accessibility
- Keyboard: Tab through queue cards, Enter for actions menu
- Screen reader: Queue position announced "Position 3 of 5 in queue", Start estimate announced, Priority changes announced
- Focus: Clear on all interactive elements
- High contrast: Position not by color alone (number + position text)

Page Plan
1. Queue View - Normal State (5 jobs queued, 2 active slots filled)
2. Queue View - Empty Available Slot (next job starting soon)
3. Priority Promotion Modal (manager requesting urgent job promotion)
4. Queue Position Notifications (user receiving queue updates)
5. Queue Analytics Dashboard (operations viewing queue performance metrics)

=== END PROMPT FR: FR2.3.2 ===

---

## End of E02 Wireframe Prompts

All 7 functional requirements for Stage 2 (Training Job Execution & Monitoring) have been documented with Figma-ready wireframe prompts:
- FR2.1.1: Live Training Progress Dashboard
- FR2.1.2: Training Stage Indicators
- FR2.1.3: Webhook Event Log
- FR2.2.1: Cancel Active Training Job
- FR2.2.2: Pause and Resume Training (Future Enhancement)
- FR2.3.1: View All Training Jobs
- FR2.3.2: Training Queue Management
