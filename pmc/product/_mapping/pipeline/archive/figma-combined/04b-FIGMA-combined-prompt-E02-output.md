# LoRA Pipeline - Stage 2 Combined Figma Wireframe Prompt
**Version:** 1.0
**Date:** 2025-12-19
**Stage:** Stage 2 — Training Job Execution & Monitoring
**Section ID:** E02
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E02.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E02.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E02-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 2 — Training Job Execution & Monitoring - Complete Integrated Wireframe System

**Context Summary**

This stage enables users to monitor and manage active LoRA training jobs through an integrated real-time dashboard. Users navigate from a comprehensive jobs list, view training progress with live-updating metrics and loss curves, track costs against estimates, observe stage progression through four training phases, access detailed event logs for troubleshooting, and control training through cancellation when needed. The interface prioritizes transparency, anxiety reduction, and cost visibility for proof-of-concept validation while maintaining essential monitoring capabilities for expensive GPU training runs that last 8-20 hours.

**Journey Integration**

- **Stage 2 User Goals:**
  - Monitor training job execution in real-time
  - Understand current training status with live metrics and loss curves
  - Confirm training is progressing correctly without errors
  - Track cost accumulation against estimates to prevent budget surprises
  - Identify problems early (stalled training, cost overruns, failed stages)
  - Cancel jobs when problems detected to save costs
  - Browse all training jobs and filter by status

- **Key Emotions:**
  - Anxiety reduction through transparency (eliminating "is it working?" fear)
  - Confidence building through visible progress and decreasing loss curves
  - Control through ability to monitor and intervene if needed
  - Relief when cost stays within estimates
  - Empowerment through detailed troubleshooting data

- **Progressive Disclosure:**
  - **Basic:** Progress percentage, current stage, loss trends, cost summary
  - **Advanced:** Detailed metrics with trend arrows, event log filtering, stage substatus messages
  - **Expert:** (Removed for POC - exportable graphs, historical comparisons, advanced analytics)

- **Persona Adaptations:**
  - Unified interface serving all personas with visual progress indicators for non-technical users, loss curve trends for technical leads, and cost tracking prominently displayed for budget managers

**Wireframe Goals**

- Enable efficient job browsing through comprehensive jobs list with status filtering
- Provide at-a-glance training status assessment (healthy progress vs problems) in dashboard
- Visualize loss curve trends to confirm model is learning (decreasing loss over time)
- Display real-time metrics (training loss, validation loss, GPU utilization) with trend indicators
- Track cost accumulation with clear budget validation and warnings when exceeding estimates
- Show training phase progression through visual stage indicator (Preprocessing, Model Loading, Training, Finalization)
- Support detailed troubleshooting through event log with filtering by event type
- Enable rapid cost control through accessible job cancellation with confirmation workflow
- Provide queue visibility with position indicators and estimated start times

---

**Explicit UI Requirements**

## VIEW 1: JOBS LIST PAGE (FR2.3.1 + FR2.3.2 Combined)

**Page URL:** `/dashboard/training-jobs`

### Tab Navigation Bar
- Position: Below page header
- Tabs: [All Jobs] [Queue (count)] [Active] [Completed]
- Tab badge: Queue tab shows count of queued jobs "Queue (5)"
- Active tab: Blue underline, bold text
- Inactive tabs: Gray text, no underline
- Click behavior: Switches view, updates URL query parameter

### All Jobs Tab (Default)

**Filter Bar:**
- Position: Below tabs, full width
- Status dropdown:
  - Label: "Status"
  - Options: All, Active, Completed, Failed, Cancelled
  - Default: All
  - Single select
- Date range dropdown:
  - Label: "Date Range"
  - Options: Last 7 days, Last 30 days, Last 90 days, All time
  - Default: Last 30 days
- Search box:
  - Placeholder: "Search jobs..."
  - Icon: Magnifying glass (left side)
  - Width: 250px
  - Debounced 500ms search
  - Searches job name only

**Jobs Table:**
- Component: Responsive data table with fixed header
- Columns:
  1. **Job Name** (min-width: 200px)
     - Job name as clickable link (opens dashboard)
     - Truncate with ellipsis if too long, full name on hover tooltip
  2. **Status** (width: 120px)
     - Badge-style indicators:
       - "Queued" (gray background, dark text, clock icon)
       - "Provisioning" (light blue, spinner icon)
       - "Training" (blue, animated pulse, running icon)
       - "Completed" (green, checkmark icon)
       - "Failed" (red, X icon)
       - "Cancelled" (orange, stop icon)
     - Training status shows progress: "Training (42%)"
  3. **Created By** (width: 150px)
     - User name (or "You" if current user)
  4. **Started At** (width: 140px)
     - Format: "Dec 18, 2:30 PM"
     - "Not started" for queued jobs
     - Hover shows relative time: "2 hours ago"
  5. **Duration** (width: 100px)
     - Active jobs: "6h 23m" with clock icon
     - Completed: "12h 45m"
     - Failed/Cancelled: "Stopped at 6h 23m"
     - Queued: "Est. 12-15h"
  6. **Cost** (width: 90px)
     - Active: "Current: $22.18"
     - Completed: "$48.32"
     - Failed/Cancelled: "$22.18"
     - Color coding: Green <$50, Yellow $50-100, Red >$100
  7. **Actions** (width: 60px)
     - Three-dot menu icon
     - Click opens dropdown:
       - Active jobs: "View Dashboard", "Cancel Job"
       - Completed jobs: "View Results", "Delete"
       - Failed jobs: "View Error Log", "Delete"
       - Cancelled jobs: "View Partial Results", "Delete"

**Table Interactions:**
- Click anywhere on row (except actions) → Navigate to job dashboard
- Hover: Subtle blue highlight on row
- Alternate row colors: White / Light gray (#F9FAFB)

**Pagination:**
- Position: Below table
- Format: "< Previous | Page 1 of 12 | Next >"
- Items per page: Fixed 25
- Total count: "Showing 1-25 of 287 jobs"

**Empty State:**
- No jobs yet: "No training jobs yet. [Create Your First Training Job]" button (blue)
- No filter results: "No jobs match your filters. [Clear Filters]"

**Real-time Updates:**
- Active jobs update every 60 seconds (progress %, cost)
- Status badge changes trigger immediate update
- Brief blue pulse animation on updated rows

### Queue Tab

**Active Slots Panel:**
- Position: Top of queue view
- Title: "Active Training Jobs: 2 of 3 slots"
- Visual slot indicators (horizontal):
  - Filled slot: Blue box with job name and progress %
    - "[Job A - 42%] [Job B - 78%]"
    - Clickable → Opens job dashboard
  - Empty slot: Gray dashed box "Available"
- Slot count configurable (default max 3)

**Queue Cards:**
- Layout: Stacked vertical cards (not table)
- Card spacing: 16px between cards

**Individual Queue Card:**
- Border: 1px solid light gray, rounded corners (8px)
- Padding: 20px
- Layout:
  - Left side: Position badge (large)
    - Format: "#1", "#2", "#3", etc.
    - Size: 40px circle/pill
    - Colors: #1-3 green, #4-7 yellow, #8+ orange
    - #1 has subtle animated pulse
  - Center content:
    - Job name (bold, 16px)
    - Configuration: "Balanced • Spot H100" (gray, 14px)
    - Creator: "Created by: John Smith" (gray, 14px)
  - Right side:
    - Estimated start: "Today at 6:45 PM" (bold)
    - Countdown: "(in 3h 20m)" (gray)
- Hover: Slight shadow, cursor pointer
- Click: Shows actions menu (View Configuration, Remove from Queue)

**Estimated Start Time Calculation:**
- Based on: Sum of remaining time for jobs ahead + 5 min GPU provisioning buffer
- Updates every 30 seconds
- Format: "Today at 6:45 PM" / "Tomorrow at 9:30 AM" / "Wed, Dec 18 at 2:15 PM"

**Empty Queue State:**
- Message: "Queue is empty. All training capacity available."
- Subtext: "Your new training jobs will start immediately."
- Button: "[Create New Training Job]" (blue)

**NOT INCLUDED (removed for POC):**
- Priority promotion workflow and manager approval
- Queue analytics (average wait, throughput, history)
- Queue position notifications (email/Slack)
- Edit configuration from queue
- Scheduled starts

---

## VIEW 2: JOB DASHBOARD PAGE (FR2.1.1 + FR2.1.2 Combined)

**Page URL:** `/training-jobs/{job_id}`

### Dashboard Header
- Breadcrumb: "Training Jobs / Elena Morales Financial"
- Job name: Large title (24px, bold)
- Header actions (right side):
  - Manual refresh button: Circular arrow icon, "Refresh" tooltip
  - Cancel button: "Cancel Job" (red background, white text, warning icon)
    - Only visible for active jobs (queued, provisioning, training)
    - Disabled for completed/failed/cancelled jobs

### Progress Header Card (FR2.1.1)

**Card Layout:**
- Full width, white background, subtle shadow
- Padding: 24px
- Margin-bottom: 20px

**Progress Bar:**
- Height: 16px, rounded corners
- Background: Light gray (#E5E7EB)
- Fill: Blue gradient (#3B82F6) for active, Green for completed, Red for failed
- Animation: Smooth width transition when updating
- Percentage label: "42% Complete" (large, bold, 24px) positioned above bar

**Progress Details Row:**
- Layout: Horizontal flex with spacing
- Step counter: "Step 850 of 2,000" with icon
- Epoch counter: "Epoch 2 of 3"
- Elapsed time: "6h 23m" with clock icon (updates every second client-side)
- Estimated remaining: "~8h 15m remaining" (updates every 60s from server)

**Stage Badge:**
- Position: Right side of progress details
- Current stage: "Training" with running icon
- Badge style: Blue background, white text, rounded pill
- Active stage has subtle pulse animation (2s loop)

**States:**
- Active: Blue progress bar, all timers running
- Completed: Green bar (100%), "Completed in 12h 45m", no remaining time
- Failed: Red bar, "Failed at Step 1250", error message shown
- Cancelled: Orange bar, "Cancelled at 42%", static display

### Stage Progress Indicator (FR2.1.2)

**Position:** Below Progress Header Card, full width

**Layout:**
- Horizontal bar with 4 connected segments
- Proportional widths: Preprocessing (5%), Model Loading (10%), Training (80%), Finalization (5%)
- Connectors: Small arrows between segments

**Stage Segment Component:**
Each segment contains:
- Icon: Stage-specific (Preprocessing: gear, Model Loading: package, Training: sync arrows, Finalization: checkmark)
- Name: Stage name (bold, 14px)
- Status-specific styling and content

**Stage States:**

**Pending State:**
- Background: Gray (#E5E7EB)
- Border: Dashed
- Icon: Gray
- Text: Stage name only
- Status: "Waiting..."

**Active State:**
- Background: Blue (#3B82F6)
- Border: Solid, slight glow effect
- Icon: Animated (spinning for loading, pulsing for training)
- Text: Stage name (white) + Substatus message below
- Substatus examples:
  - Preprocessing: "Tokenizing 242 conversations..."
  - Model Loading: "Loading Llama 3 70B model..."
  - Training: "Epoch 2/3 - Step 850 of 2,000"
  - Finalization: "Saving adapters..."
- Elapsed time: "6h 23m" in bottom corner

**Completed State:**
- Background: Green (#10B981)
- Border: Solid
- Icon: Checkmark (white)
- Text: Stage name (white)
- Duration: "3m 42s" (actual time)

**Failed State:**
- Background: Red (#EF4444)
- Border: Solid
- Icon: X mark (white)
- Text: Stage name + "Failed" badge
- Error preview: Truncated error message "Out of Memory..."
- Link: "View Details" opens Event Log tab filtered to errors

**Transitions:**
- Stage completing: Blue → Green fade (500ms) + checkmark icon fade-in
- Next stage activating: Gray → Blue fade + pulse start
- Simple transitions only, no confetti

**NOT INCLUDED (removed for POC):**
- Clickable stages with expandable detailed logs
- Detailed substatus progress percentages within each stage
- Confetti/success animations
- Checkpoint recovery indicator with mini progress bar
- Stage history timeline visualization

### Tab Navigation

**Position:** Below Stage Indicator
**Tabs:** [Overview] [Event Log]
**Active tab:** Blue underline
**Persisted in URL:** `?tab=overview` or `?tab=event-log`

---

### OVERVIEW TAB CONTENT

**Two-Column Layout (Desktop >1024px):**
- Left column (60%): Loss Curve Graph
- Right column (40%): Metrics Panel + Cost Tracker
- Mobile (<768px): Single column, stacked

### Loss Curve Graph (FR2.1.1 - Simplified)

**Chart Container:**
- White background, subtle border
- Title: "Loss Curve" (16px, bold)
- Subtitle: "Training and validation loss over time"

**Chart Specifications:**
- Library: Chart.js or Recharts
- Type: Dual-axis line chart
- X-axis: Training step numbers (0 to current step)
- Left Y-axis: Training loss (scale 0-2.0)
- Right Y-axis: Validation loss (scale 0-2.0)
- Grid: Light gray lines

**Line Styling:**
- Training loss: Solid blue line (#3B82F6) with small data point markers
- Validation loss: Dashed orange line (#F97316) with small data point markers
- Line width: 2px

**Legend:**
- Position: Top-right of chart
- Format: [Blue line] Training Loss [Orange dashed] Validation Loss
- No toggle functionality for POC

**Zoom Controls:**
- Position: Top-left of chart, horizontal button group
- Buttons: [Zoom In] [Zoom Out] [Reset]
- Zoom In: Focus on most recent 500 steps
- Zoom Out: Show more history
- Reset: Show full training history
- Button style: Small, gray background, icon only with tooltip

**Tooltip:**
- Trigger: Hover over any data point
- Format: "Step 850: Training Loss 0.342, Validation Loss 0.358"
- Style: White background, shadow, rounded corners
- Position: Follow cursor with offset

**Chart Updates:**
- New data points appended every 60 seconds
- Smooth line transition animation when new data arrives
- No pan controls (simplified for POC)
- No export PNG button (removed for POC)

**NOT INCLUDED (removed for POC):**
- Pan controls (drag chart)
- Export graph as PNG
- Legend toggle (show/hide series)
- Advanced zoom (pinch-to-zoom)

### Metrics Panel (FR2.1.1 - Simplified)

**Container:**
- White background, subtle border
- Title: "Current Metrics" (16px, bold)
- Padding: 20px

**Metrics Display:**
- Layout: Stacked rows, each metric on its own line
- 4 metrics only:

**Metric Row Format:**
- Label (left): "Training Loss" (14px, gray)
- Value (center): "0.342" (18px, bold)
- Trend indicator (right):
  - Down arrow (green): ↓ "-12.1%" (improving, loss decreasing)
  - Up arrow (red): ↑ "+5.2%" (worsening, loss increasing)
  - Horizontal line (gray): → "~0%" (stable, no significant change)

**Metrics List:**
1. Training Loss: "0.342" ↓ "-12.1%" (green)
2. Validation Loss: "0.358" ↓ "-13.1%" (green)
3. Learning Rate: "0.000182" (no trend indicator)
4. GPU Utilization: "87%" (bar indicator, green if >50%, yellow if <50%)

**Update Animation:**
- Values that changed: Brief highlight (yellow background) that fades (1s)
- Trend arrows updated based on delta from previous value

**NOT INCLUDED (removed for POC):**
- Perplexity metric
- Tokens/second throughput
- Steps/hour rate
- GPU memory usage breakdown
- Learning rate schedule indicator

### Cost Tracker Panel (FR2.1.1 - Simplified)

**Container:**
- White background, subtle border
- Title: "Cost Tracker" (16px, bold)
- Position: Below Metrics Panel in right column

**Current Spend:**
- Value: "$22.18" (large, 28px, bold)
- Color: Green if <80% estimate, Yellow if 80-100%, Red if >100%
- Label below: "Current spend"

**Progress Bar:**
- Height: 12px, rounded
- Background: Light gray
- Fill: Green (<80%), Yellow (80-100%), Red (>100%)
- Width: Represents (current_spend / estimated_max) × 100%

**Estimate Display:**
- Text: "49% of $45-55 estimate" (14px, gray)
- Position: Below progress bar

**Additional Details:**
- Hourly rate: "$2.49/hr (spot)" or "$7.99/hr (on-demand)"
- Projected final: "Projected: $47.32"
- Disclaimer: "±15% variance" (small, 12px, gray)

**Cost Warning (when exceeding estimate):**
- Alert banner: Yellow/red background
- Icon: Warning triangle
- Message: "Cost exceeding estimate: $54 vs $45-55 estimated"
- Position: Top of cost tracker panel

**NOT INCLUDED (removed for POC):**
- Detailed cost breakdown (GPU + storage + spot buffer)
- Historical accuracy comparison
- Cost per epoch breakdown

### Auto-Refresh Mechanism

**Polling:**
- Interval: 60 seconds
- Fetches: `/api/training/jobs/{job_id}/metrics?latest=true`
- Updates: All dashboard components simultaneously
- Active jobs only (stops polling when status = completed/failed/cancelled)

**Manual Refresh Button:**
- Position: Dashboard header (top-right)
- Icon: Circular arrow
- Click: Triggers immediate data fetch
- Disabled during fetch (prevents duplicate requests)
- Loading state: Icon spins while fetching

**Refresh Indicator:**
- "Last updated: 30s ago" text (bottom of dashboard, small gray)
- Updates in real-time (client-side timer)

**Success Feedback:**
- Toast notification: "Metrics updated" (2s duration)
- Brief highlight on updated values

---

### EVENT LOG TAB (FR2.1.3 - Simplified)

**Filter Bar:**
- Position: Top of event log
- Label: "Show:"
- Dropdown: Single-select
  - Options: All Events, Status Changes, Metrics Updates, Warnings, Errors
  - Default: All Events
- No keyword search (removed for POC)
- No date range filter (removed for POC)

**Events Table:**

**Table Columns:**
1. **Timestamp** (width: 150px)
   - Format: "14:28:15" (24-hour, HH:mm:ss)
   - Full date on hover: "Dec 18, 2025 2:28:15 PM"
   - Newest first (DESC order)
2. **Type** (width: 100px)
   - Badge-style indicators:
     - "Status" (blue badge, info icon)
     - "Metrics" (green badge, chart icon)
     - "Warning" (yellow badge, warning icon)
     - "Error" (red badge, X icon)
     - "Checkpoint" (purple badge, save icon)
3. **Message** (flexible width)
   - Event summary text
   - Truncated with ellipsis if too long
   - Examples:
     - Status: "Training started (GPU: H100 PCIe 80GB spot)"
     - Metrics: "Step 100: loss=0.521, lr=0.0002, gpu_util=89%"
     - Warning: "GPU utilization dropped to 45%"
     - Error: "CUDA out of memory. Tried to allocate 2.00 GiB..."
     - Checkpoint: "Checkpoint saved at step 500"
4. **Expand** (width: 50px)
   - Chevron icon (right arrow when collapsed, down when expanded)
   - Click to expand/collapse row details

**Expandable Row Details:**
- Trigger: Click row or expand icon
- Animation: Smooth slide-down (300ms)
- Content: Formatted JSON payload with syntax highlighting
  - Keys: Blue
  - Strings: Green
  - Numbers: Orange
  - Booleans: Purple
- Copy button: "Copy JSON" → Copies to clipboard with success toast "Copied!"
- Background: Light gray (#F9FAFB)

**Pagination:**
- Position: Below table
- Format: "< Previous | Page 1 of 12 | Next >"
- Items per page: Fixed 50
- Total count: "Showing 1-50 of 583 events"

**Real-Time Updates:**
- Polling: Every 10 seconds (faster than main dashboard)
- New events: Prepend to top with blue pulse animation (2s)
- Badge: If user on Overview tab, show "5 new events" indicator on Event Log tab

**Export Button:**
- Position: Top-right of event log
- Label: "Export JSON"
- Click: Downloads all events as JSON file
- Filename: "{job_name}-events-{timestamp}.json"
- No CSV export (removed for POC)
- No filtered export (exports all events)

**NOT INCLUDED (removed for POC):**
- Keyword search with highlighting
- Multi-select event type filters
- CSV export option
- Date range filtering
- Event timeline visualization
- Event comparison between jobs

---

## MODAL: CANCEL JOB CONFIRMATION (FR2.2.1 - Simplified)

**Trigger:** Click "Cancel Job" button on dashboard header

**Modal Overlay:**
- Full-screen semi-transparent black overlay (50% opacity)
- Modal centered vertically and horizontally
- Click outside modal: Does NOT close (must use buttons)
- Escape key: Closes modal (same as Go Back)

**Modal Container:**
- Width: 500px max
- Background: White
- Border radius: 12px
- Shadow: Large
- Padding: 24px

**Modal Header:**
- Danger indicator: Red bar (4px) at top of modal
- Warning icon: Large yellow/orange warning triangle
- Title: "Cancel Training Job?" (20px, bold)
- Subtitle: "This action cannot be undone." (14px, gray)

**Current Status Section:**
- Background: Light gray (#F9FAFB)
- Border radius: 8px
- Padding: 16px
- Content:
  - Job name: "Elena Morales Financial" (bold)
  - Progress bar with percentage: "42% Complete (Step 850 of 2,000)"
  - Current stage: "Training - Epoch 2 of 3"
  - Elapsed time: "6h 23m"
  - Cost spent: "$22.18" (large, bold, highlighted)

**Impact Analysis:**
- Title: "What will happen:" (14px, bold)
- Bulleted list:
  - "Training will stop immediately at current step"
  - "GPU instance will be terminated within 60 seconds"
  - "Partial progress will be saved for review"
  - "This job cannot be resumed"
  - "Final cost: $22.18 based on elapsed time"
- Icon per bullet: X mark for irreversible, checkmark for preserved

**Cancellation Reason:**
- Label: "Why are you cancelling?" (14px, bold)
- Required indicator: Red asterisk (*)
- Dropdown:
  - Placeholder: "Select a reason..."
  - Options:
    - Loss not decreasing
    - Cost too high
    - Wrong configuration
    - Testing
    - Other
- Validation: Must select before confirm button enables

**Confirmation Checkbox:**
- Checkbox: Unchecked by default
- Label: "I understand this action cannot be undone" (14px)
- Required: Must check to enable confirm button
- Styling: Warning-colored when unchecked

**Action Buttons:**
- Layout: Horizontal, right-aligned
- "Go Back" button (left):
  - Style: Gray background, gray text
  - Click: Closes modal, no action taken
- "Confirm Cancellation" button (right):
  - Style: Red background, white text
  - Disabled state: Gray background, no pointer cursor
  - Enabled when: Reason selected AND checkbox checked
  - Click: Executes cancellation workflow

**Cancellation Workflow:**
1. Button shows loading spinner: "Cancelling..."
2. POST `/api/training/jobs/{job_id}/cancel` with reason
3. Job status updates to "cancelling"
4. GPU termination request sent
5. Modal closes
6. Dashboard updates: Status badge → "Cancelled" (orange)
7. Toast notification: "Job cancelled. Final cost: $22.18"
8. Polling stops

**Post-Cancellation State:**
- Dashboard still accessible
- All partial data preserved (loss curves, metrics, events)
- Cancel button replaced with: "Job Cancelled on Dec 18 at 4:45 PM"
- Status badge: "Cancelled" (orange)

**NOT INCLUDED (removed for POC):**
- Optional notes field for additional context
- Download partial checkpoint/artifacts
- Batch cancellation for multiple jobs
- Cancellation analytics tracking

---

## Interactions and Flows

### Flow 1: View Active Training Job
1. User navigates to `/dashboard/training-jobs`
2. Jobs list loads with table view
3. User sees job "Elena Morales" with "Training (42%)" status badge
4. User clicks row
5. Navigate to `/training-jobs/{job_id}`
6. Dashboard loads:
   - Progress header shows 42%, Step 850/2000, Epoch 2/3, 6h 23m elapsed
   - Stage indicator shows Training active (blue), Preprocessing and Model Loading complete (green)
   - Loss curve renders with declining trend
   - Metrics show training loss 0.342 ↓, validation loss 0.358 ↓
   - Cost tracker shows $22.18 current, $45-55 estimate, green progress bar
7. Auto-refresh begins (60s interval)
8. User monitors progress, confirms loss decreasing (healthy training)

### Flow 2: Check Event Log for Troubleshooting
1. User on job dashboard, notices GPU utilization low (45%)
2. User clicks "Event Log" tab
3. Event log table loads (50 most recent events)
4. User filters to "Warnings" only
5. Table shows: "GPU utilization dropped to 45% (possible throttling)"
6. User clicks row expand arrow
7. JSON payload expands showing detailed webhook data
8. User clicks "Copy JSON" → Copied to clipboard
9. User switches back to "Overview" tab

### Flow 3: Cancel Training Job
1. User on dashboard, observes loss not decreasing after 6 hours
2. User clicks "Cancel Job" button (red, header)
3. Confirmation modal opens:
   - Shows current progress: 42%, $22.18 spent
   - Lists impact: Training stops, GPU terminated, cannot resume
4. User selects reason: "Loss not decreasing"
5. User checks: "I understand this action cannot be undone"
6. "Confirm Cancellation" button enables (was gray, now red)
7. User clicks "Confirm Cancellation"
8. Button shows: "Cancelling..." with spinner
9. Modal closes
10. Toast: "Job cancelled. Final cost: $22.18"
11. Dashboard updates: Status badge → "Cancelled"
12. Polling stops (dashboard is now static)

### Flow 4: View Training Queue
1. User on jobs list page
2. User clicks "Queue" tab
3. Queue view loads:
   - Active slots panel: "2 of 3 slots filled"
   - Queue cards show 5 queued jobs with position badges
4. User sees their job at position #3
5. Estimated start: "Today at 7:30 PM (in 4h 15m)"
6. Active job completes
7. Queue auto-updates (30s polling):
   - User's job moves to #2
   - New estimated start: "Today at 6:45 PM (in 3h 30m)"
8. Position #1 job starts provisioning → exits queue
9. User's job moves to #1
10. Estimated start: "Starting within 15 minutes"

### Flow 5: Stage Progression During Training
1. User viewing active job dashboard
2. Stage indicator shows: Preprocessing ✓ → Model Loading ✓ → Training (active) → Finalization (pending)
3. Training stage substatus: "Epoch 2/3 - Step 850 of 2,000"
4. User continues monitoring...
5. Training completes all epochs
6. Training stage transitions: Blue → Green with checkmark
7. Finalization stage activates: Gray → Blue
8. Substatus: "Saving adapters..."
9. After 8 minutes, Finalization completes
10. All stages green with checkmarks
11. Status badge: "Completed"
12. Toast: "Training completed successfully!"

---

## Visual Feedback

### Progress Indicators
- Animated progress bar: Smooth filling animation (300ms transitions)
- Stage indicator: Blue pulse on active stage (2s loop)
- Step/epoch counters: Update with brief highlight
- Elapsed time: Updates every second (client-side)

### Trend Indicators
- Improving metrics: Green down arrow ↓ with percentage
- Worsening metrics: Red up arrow ↑ with percentage
- Stable metrics: Gray horizontal line →
- Value changes: Yellow background highlight (fades in 1s)

### Cost Alerts
- Within estimate: Green progress bar, no alert
- Approaching estimate (80-100%): Yellow progress bar
- Exceeding estimate (>100%): Red progress bar + warning banner

### Loss Curve Feedback
- New data points: Smooth line transition
- Zoom controls: Button press effect (darker on click)
- Tooltip: Follows cursor on hover

### Loading States
- Initial load: Gray skeleton rectangles matching component layout
- Refresh in progress: Small spinner in header
- Data update: Brief blue pulse on changed values

### Success Feedback
- Manual refresh: Toast "Metrics updated"
- Job cancelled: Toast "Job cancelled. Final cost: $XX"
- Stage complete: Green checkmark fade-in

---

## Accessibility Guidance

### Keyboard Navigation
- Tab: Move through interactive elements (tabs, buttons, table rows, controls)
- Enter/Space: Activate buttons, select options, expand rows
- Arrow keys: Navigate table rows, dropdown options
- Escape: Close modals, tooltips

### Screen Reader Support
- Progress bar: "Training 42% complete, Step 850 of 2000"
- Stage indicator: "Stage 3 of 4: Training - Active, 6 hours 23 minutes elapsed"
- Metrics: "Training loss 0.342, down 12.1% from previous"
- Cost tracker: "Current spend $22.18, 49% of estimated $45 to $55"
- Event log: "Event log table with 583 events. Use arrow keys to navigate."
- Status badges: "Status: Training in progress" (not just color)

### Focus Indicators
- Clear blue outline (2px solid) on focused elements
- Modal focus trap: Tab cycles within modal only
- Focus moves to newly opened content

### Color Contrast
- WCAG AA compliant: 4.5:1 for normal text, 3:1 for large text
- Icons + text accompany color (not color alone)
- Status indicated by badge text + icon + color

---

## Information Architecture

### Page Hierarchy

**Jobs List Page `/dashboard/training-jobs`:**
```
Page Header: "Training Jobs" + [Create New Job]
├── Tab Navigation: All Jobs | Queue | Active | Completed
├── Filter Bar: Status + Date Range + Search
├── Content Area (based on active tab):
│   ├── All Jobs Tab: Jobs Table + Pagination
│   └── Queue Tab: Active Slots Panel + Queue Cards
```

**Job Dashboard Page `/training-jobs/{job_id}`:**
```
Page Header: Job Name + [Refresh] [Cancel Job]
├── Progress Header Card
├── Stage Progress Indicator
├── Tab Navigation: Overview | Event Log
├── Content Area:
│   ├── Overview Tab:
│   │   ├── Left Column: Loss Curve Graph
│   │   └── Right Column: Metrics Panel + Cost Tracker
│   └── Event Log Tab: Filter + Events Table + Pagination + Export
└── Footer: Last Updated Timestamp
```

### Component Hierarchy

```
JobsListPage
├── TabBar
├── FilterBar
│   ├── StatusDropdown
│   ├── DateRangeDropdown
│   └── SearchBox
├── JobsTable (All Jobs tab)
│   └── JobRow × n
│       ├── StatusBadge
│       └── ActionsMenu
├── QueueView (Queue tab)
│   ├── ActiveSlotsPanel
│   │   └── SlotIndicator × 3
│   └── QueueCard × n
│       └── PositionBadge
└── Pagination

JobDashboardPage
├── DashboardHeader
│   ├── RefreshButton
│   └── CancelButton → CancelModal
├── ProgressHeaderCard
│   ├── ProgressBar
│   └── ProgressDetails
├── StageIndicator
│   └── StageSegment × 4
├── TabNavigation
├── OverviewTabContent
│   ├── LossCurveGraph
│   │   └── ZoomControls
│   ├── MetricsPanel
│   │   └── MetricRow × 4
│   └── CostTracker
│       └── CostProgressBar
├── EventLogTabContent
│   ├── FilterDropdown
│   ├── EventsTable
│   │   └── EventRow × n
│   │       └── ExpandableJSONPayload
│   ├── Pagination
│   └── ExportButton
└── LastUpdatedIndicator

CancelModal
├── ModalHeader (warning icon, title)
├── CurrentStatusSection
├── ImpactAnalysis
├── ReasonDropdown
├── ConfirmationCheckbox
└── ActionButtons
```

---

## Page Plan

**Total Wireframe Pages: 15**

### Jobs List & Queue View (5 pages)

1. **Jobs List - Mixed Status View**
   - Purpose: Primary jobs overview with various status badges
   - Components: All Jobs tab active, filters visible, table with 8-10 rows showing different statuses (Training, Completed, Failed, Cancelled, Queued)
   - States: Normal display, real-time status updates for active jobs
   - Key elements: Status badges, cost column, actions menu

2. **Jobs List - Filtered Active Jobs**
   - Purpose: Demonstrate filtering functionality
   - Components: Status filter = "Active", search with query, table showing only active training jobs
   - States: Filtered view with progress percentages visible
   - Key elements: Actions menu expanded on one row

3. **Jobs List - Empty State**
   - Purpose: Show empty state with call-to-action
   - Components: Empty table area with illustration
   - States: No jobs OR no filter results
   - Key elements: "Create Your First Training Job" button, "Clear Filters" link

4. **Queue Tab - Normal State**
   - Purpose: Show queue management interface
   - Components: Active slots panel (2/3 filled), 5 queue cards with position badges
   - States: Queue with jobs, estimated start times displayed
   - Key elements: Position badges (#1 green, #3 yellow), countdown timers

5. **Queue Tab - Empty Queue**
   - Purpose: Show empty queue state
   - Components: Active slots panel (0/3 filled), empty queue message
   - States: No queued jobs
   - Key elements: "Queue is empty" message, "Create New Training Job" button

### Job Dashboard - Overview Tab (7 pages)

6. **Dashboard - Initial Loading State**
   - Purpose: Show loading experience
   - Components: Skeleton placeholders for all components
   - States: First page load, data not yet received
   - Key elements: Gray skeleton rectangles matching final layout

7. **Dashboard - Active Training (Normal)**
   - Purpose: Primary monitoring interface during healthy training
   - Components: All components loaded with live data
   - States: Active training, 42% progress, loss decreasing, within budget
   - Key elements: Progress header (42%), Training stage active (blue), loss curve with declining trend, metrics with green down arrows, cost tracker (green, 49%)

8. **Dashboard - Loss Curve Zoomed**
   - Purpose: Demonstrate zoom interaction
   - Components: Loss curve graph zoomed to recent 500 steps
   - States: Zoom in applied, tooltip visible on hover
   - Key elements: Zoom buttons, tooltip overlay, detailed view of recent data

9. **Dashboard - Cost Warning State**
   - Purpose: Show cost exceeding estimate scenario
   - Components: Cost tracker with red warning
   - States: Current spend > estimate maximum
   - Key elements: Red progress bar, warning banner, emphasized Cancel button

10. **Dashboard - Completed Job**
    - Purpose: Show final completed state
    - Components: All stages complete (green checkmarks), final metrics
    - States: Static display, no polling
    - Key elements: 100% progress, all stages green, final loss curve, final cost

11. **Dashboard - Failed Job**
    - Purpose: Show failure state and troubleshooting entry point
    - Components: Failed stage indicator (red), error message
    - States: Training failed, partial data preserved
    - Key elements: Red stage segment, error preview, "View Error Log" link, preserved loss curve up to failure

12. **Dashboard - Mobile Responsive**
    - Purpose: Show responsive layout for smaller screens
    - Components: Single-column stacked layout
    - States: Mobile viewport (<768px)
    - Key elements: Progress header, stage indicator (vertical), stacked loss curve and metrics

### Job Dashboard - Event Log Tab (2 pages)

13. **Event Log - Active Job with Mixed Events**
    - Purpose: Show event log for troubleshooting
    - Components: Events table with various types, one row expanded
    - States: Real-time updates, filter = All Events
    - Key elements: Color-coded event badges, expanded JSON payload, Copy JSON button, "5 new events" indicator

14. **Event Log - Filtered to Errors**
    - Purpose: Show error filtering for troubleshooting
    - Components: Filter dropdown = Errors only, only error events visible
    - States: Filtered view, expanded error details
    - Key elements: Red error badges, error messages, JSON stack traces

### Cancel Job Modal (1 page)

15. **Cancel Confirmation Modal**
    - Purpose: Show cancellation confirmation workflow
    - Components: Modal overlay, current status, impact analysis, form elements
    - States: Reason selected, checkbox checked, Confirm button enabled
    - Key elements: Warning header, progress summary, cost display, required fields, action buttons

---

## Annotations (Mandatory)

Attach notes to UI elements in Figma citing:
1. **Which FR(s)** the element fulfills (e.g., "FR2.1.1 AC3: Progress percentage calculation")
2. **Acceptance criteria number** it maps to
3. **State variations** this element has

Include a **"Mapping Table"** frame in Figma with columns:
- **Criterion** (text of acceptance criterion)
- **Source** (FR number)
- **Screen(s)** (which wireframe page)
- **Component(s)** (UI element name)
- **State(s)** (loading, error, success, etc.)
- **Notes** (implementation details)

**Example annotations:**
- Progress Bar: "FR2.1.1 AC2: Progress percentage = (current_step / total_steps) × 100"
- Stage Indicator: "FR2.1.2 AC3: Active stage shows substatus message with elapsed time"
- Loss Curve: "FR2.1.1 AC6: Dual y-axis chart with training loss (left) and validation loss (right)"
- Cost Tracker: "FR2.1.1 AC8: Color coding - green <80%, yellow 80-100%, red >100% of estimate"
- Event Log Filter: "FR2.1.3 AC4: Filter events by type: All / Status / Metrics / Warnings / Errors"
- Cancel Modal: "FR2.2.1 AC2: Confirmation checkbox required before confirm button enables"

---

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Jobs list shows all jobs (active, completed, failed, queued) | US2.1.1 | Page 1-2 | JobsTable | Normal, Filtered | Table with status badges and real-time updates |
| Click active job opens detailed progress dashboard | US2.1.1 | Page 1 → Page 7 | JobRow | Click | Navigation from list to dashboard |
| Overall progress: 42% complete (Step 850 of 2000) | US2.1.1 | Pages 7-12 | ProgressHeaderCard | Active training | Large progress bar with percentage and step count |
| Current stage: Training (with visual stage indicator) | US2.1.1 | Pages 7-12 | StageIndicator | All stages | Four-segment horizontal bar with status styling |
| Elapsed time: 6h 23m | US2.1.1 | Pages 7-12 | ProgressHeaderCard | Active | Client-side timer updates every second |
| Estimated remaining: 8h 15m (updates based on actual speed) | US2.1.1 | Pages 7-12 | ProgressHeaderCard | Active | Server calculation updates every 60s |
| Current epoch: 2 of 3 | US2.1.1 | Pages 7-12 | ProgressHeaderCard | Active | Epoch counter next to step counter |
| Line chart with dual y-axes: training loss (left), validation loss (right) | US2.1.1 | Pages 7-9 | LossCurveGraph | All states | Chart.js dual-axis configuration |
| Updates every 60 seconds via polling | US2.1.1 | Pages 7-9 | LossCurveGraph | Active | setInterval 60s, appends new data points |
| Zoom controls to focus on recent steps | US2.1.1 | Page 8 | ZoomControls | Zoomed in/out | [Zoom In] [Zoom Out] [Reset] buttons |
| Training loss: 0.342 (↓ from 0.389) | US2.1.1 | Pages 7-12 | MetricsPanel | Active | Value with trend arrow and percentage |
| Validation loss: 0.358 (↓ from 0.412) | US2.1.1 | Pages 7-12 | MetricsPanel | Active | Value with trend arrow and percentage |
| Learning rate: 0.000182 | US2.1.1 | Pages 7-12 | MetricsPanel | Active | Current LR value from scheduler |
| GPU utilization: 87% | US2.1.1 | Pages 7-12 | MetricsPanel | Active | Percentage with visual bar |
| Estimated cost: $45-55 | US2.1.1 | Pages 7-12 | CostTracker | All states | Gray text below current spend |
| Current spend: $22.18 (49% of estimate) | US2.1.1 | Pages 7-9 | CostTracker | Active | Large bold number with progress bar |
| Hourly rate: $2.49/hr (spot) | US2.1.1 | Pages 7-12 | CostTracker | All states | Rate display with GPU type |
| Auto-refresh every 60 seconds | US2.1.1 | Pages 7-9 | RefreshMechanism | Active | Polling updates all components |
| Visual stage progress bar with 4 stages | US2.1.2 | Pages 7-12 | StageIndicator | All states | Horizontal bar with connected segments |
| Current stage highlighted with animated indicator | US2.1.2 | Pages 7-9 | StageSegment | Active | Blue background with pulse animation |
| Completed stages show checkmark and actual duration | US2.1.2 | Pages 7-12 | StageSegment | Completed | Green background, checkmark, "3m 42s" |
| Failed stage shows error icon and error message | US2.1.2 | Page 11 | StageSegment | Failed | Red background, X icon, error preview |
| Event Log tab on job details page | US2.1.3 | Pages 13-14 | TabNavigation | All states | [Overview] [Event Log] tabs |
| Table view: Timestamp, Event Type, Message, Payload | US2.1.3 | Pages 13-14 | EventsTable | All states | 4 columns with expand button |
| Event types color-coded | US2.1.3 | Pages 13-14 | EventTypeBadge | All types | Blue/green/yellow/red badges |
| Expandable rows show full webhook payload as JSON | US2.1.3 | Pages 13-14 | ExpandableRow | Expanded | Syntax highlighted JSON |
| Filter events by type | US2.1.3 | Pages 13-14 | FilterDropdown | Filtered | Single-select dropdown |
| Export log as JSON | US2.1.3 | Pages 13-14 | ExportButton | Click | Downloads JSON file |
| Real-time updates: new events appear automatically | US2.1.3 | Page 13 | EventsTable | Active | 10s polling, blue pulse on new events |
| "Cancel Job" button prominent on dashboard | US2.2.1 | Pages 7-9 | CancelButton | Enabled | Red destructive styling in header |
| Confirmation modal with current progress/cost | US2.2.1 | Page 15 | CancelModal | Open | Full modal with status display |
| Reason dropdown required | US2.2.1 | Page 15 | ReasonDropdown | Selected | Must select before confirm |
| Confirmation checkbox required | US2.2.1 | Page 15 | ConfirmCheckbox | Checked | Must check before confirm |
| Post-cancellation: status updates, partial data preserved | US2.2.1 | After Page 15 | DashboardPage | Cancelled | Orange badge, static display |
| Queue tab shows queued/provisioning jobs | US2.3.2 | Page 4 | QueueTab | Normal | Card-based layout with positions |
| Queue position display (#1, #2, etc.) | US2.3.2 | Page 4 | PositionBadge | All positions | Large colored badge |
| Estimated start time calculation | US2.3.2 | Page 4 | QueueCard | Normal | "Today at 6:45 PM (in 3h 20m)" |
| Active slots indicator (2 of 3) | US2.3.2 | Pages 4-5 | ActiveSlotsPanel | Filled/Empty | Visual slot indicators |
| Max concurrent training jobs limit: 3 | US2.3.2 | Pages 4-5 | ActiveSlotsPanel | At limit | Shows 3 of 3 when full |

---

## Non-UI Acceptance Criteria

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Dashboard loads within 2 seconds for jobs with <10K data points | Performance | Show skeleton loaders during initial fetch |
| Progress percentage = (current_step / total_steps) × 100 | Calculation | Display result in progress header card |
| Loss data fetched from training_metrics_history table | Data source | Loss curve populated from API response |
| Cost calculation: elapsed_hours × gpu_hourly_rate | Business logic | Display in cost tracker panel |
| Polling mechanism: setInterval 60s for dashboard, 10s for events | Architecture | Last updated timestamp shows refresh |
| Database indexes on status, created_at, created_by | Performance | Enables fast jobs list loading |
| Job status must be active for polling to continue | Business logic | Stop polling when completed/failed/cancelled |
| Cancellation sends POST to RunPod API to terminate GPU | Backend | Show loading state during termination |
| Queue FIFO: ordered by created_at | Business logic | Position numbers reflect creation order |
| Concurrency limit configurable (default 3) | System setting | Active slots panel shows "X of Y" |

---

## Final Notes for Figma Implementation

### Integration Requirements
- Jobs list provides navigation entry point to job dashboard
- Dashboard integrates Progress Header, Stage Indicator, Loss Curve, Metrics, Cost Tracker as unified view
- Event Log is separate tab but shares job context
- Cancel modal accessible from dashboard header
- Queue tab shares filter/search patterns with jobs list

### POC Simplifications Applied
**Removed:**
- FR2.2.2 Pause/Resume functionality (entire feature deferred)
- Loss curve pan controls and PNG export
- Detailed metrics (perplexity, tokens/sec, steps/hour)
- Event log keyword search and CSV export
- Jobs list bulk actions and CSV export
- Queue priority promotion and analytics
- Mobile-specific layouts (desktop-first for POC)

**Simplified:**
- Jobs list filtering to status and date range only
- Stage indicator to status display only (no expandable logs)
- Cost tracker to summary display (no itemized breakdown)
- Cancel modal to required fields only (no notes field)
- Event log to single-select filter (no multi-select)

### State Management
- Jobs list polls every 60s for active job status updates
- Dashboard polls every 60s for metrics, 10s for events
- Queue polls every 30s for position updates
- Polling stops when job reaches terminal state (completed/failed/cancelled)
- Manual refresh available for immediate updates

### Responsive Behavior
- Desktop (>1024px): Two-column dashboard layout
- Tablet (768-1023px): Stacked single-column layout
- Mobile (<768px): Simplified single-column with collapsible sections
- Jobs table adapts with hidden columns on smaller screens

### Accessibility
- Full keyboard navigation throughout
- Screen reader announcements for dynamic updates
- ARIA labels on all interactive elements
- Color not sole indicator (icons + text accompany status colors)
- High contrast focus indicators

### Success Criteria
A user should be able to:
1. Browse all training jobs and filter by status
2. View queue position and estimated start time
3. Monitor active training with real-time progress and metrics
4. Observe loss curve trends confirming model improvement
5. Track cost against estimate throughout training
6. Access event log for troubleshooting when needed
7. Cancel training job when problems detected
8. View completed/failed job results and partial data

All within an integrated, cohesive monitoring experience that reduces anxiety and builds confidence during expensive 8-20 hour training runs.

---

**Estimated Total Page Count: 15 wireframe pages**

Covering:
- Jobs list and queue views (5 pages)
- Dashboard overview states (7 pages)
- Event log views (2 pages)
- Cancel confirmation modal (1 page)

**Original FR page count:** 33 pages across 7 FRs
**Combined & simplified:** 15 pages (55% reduction)

**Rationale:**
- Demonstrates complete monitoring workflow from jobs list → dashboard → cancel
- Shows key states: normal, loading, warning, completed, failed
- Covers queue management with position and estimates
- Includes essential troubleshooting (event log)
- Maintains all critical functionality for POC validation
- Removes advanced features and mobile layouts for faster implementation
