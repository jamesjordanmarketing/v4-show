# Stage 2 Combined FIGMA Prompt Analysis Worksheet
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 2 — Training Job Execution & Monitoring  
**Section ID:** E02  
**Product:** LoRA Pipeline

---

## PHASE 1: DEEP ANALYSIS

### Step 1.1: Extract All FR Prompts

#### Individual FR Catalog

### FR2.1.1: Live Training Progress Dashboard
- **Purpose:** Monitor active training jobs with real-time metrics, loss curves, and cost tracking
- **Core Functionality:** Real-time dashboard displaying training progress, interactive loss curve visualization, detailed metrics table, cost accumulation tracking
- **UI Components:**
  - Progress Header Card (progress bar, step counter, stage badge, elapsed/remaining time, epoch counter)
  - Live Loss Curve Graph (dual y-axis chart, zoom/pan controls, export button, tooltip)
  - Current Metrics Table (training loss, validation loss, learning rate, GPU metrics, throughput)
  - Cost Tracker Card (estimated vs current spend, hourly rate, projected final cost, progress bar)
  - Auto-refresh mechanism (60s polling, manual refresh button)
  - Loading skeletons
- **UI States:** Active training (live updates), Completed (static final data), Failed (error indicators), Loading (skeletons), Error fetching data (retry button)
- **User Interactions:** View dashboard, hover graph for tooltips, zoom/pan graph, export graph PNG, manual refresh, monitor cost
- **Page Count:** 4 pages (Active state, Graph focused, Error state, Cost warning)
- **Dependencies:** Core monitoring feature, used by most other FRs

### FR2.1.2: Training Stage Indicators
- **Purpose:** Visual progress through four sequential training phases with real-time status updates
- **Core Functionality:** Horizontal stage progress bar showing Preprocessing, Model Loading, Training, Finalization with substatus messages and durations
- **UI Components:**
  - Horizontal Stage Progress Bar (4 connected segments)
  - Stage Visual Elements (icons, labels, connectors)
  - Stage Status Rendering (pending/active/completed/failed states)
  - Substatus messages for each stage with progress percentages
  - Elapsed time display per stage
  - Estimated duration display
  - Stage transition animations
  - Checkpoint recovery indicator
  - Stage history log (expandable)
- **UI States:** Pending (gray), Active (blue animated), Completed (green checkmark), Failed (red error), Recovering (yellow restoration)
- **User Interactions:** View stage progression, click stages to view detailed logs, monitor substatus messages, track checkpoint recovery
- **Page Count:** 5 pages (Normal progression, Training active, Checkpoint recovery, Failure, Expanded history)
- **Dependencies:** Integrates with FR2.1.1 dashboard, positioned below progress header

### FR2.1.3: Webhook Event Log
- **Purpose:** Comprehensive chronological audit trail of all training events for troubleshooting and analysis
- **Core Functionality:** Event log table with color-coded events, expandable JSON payloads, filtering, search, export
- **UI Components:**
  - Event Log tab navigation
  - Table (Timestamp, Event Type, Message, Actions columns)
  - Event type badges (Status blue, Metrics green, Warning yellow, Error red, Info gray, Checkpoint purple)
  - Expandable row details with formatted JSON
  - Event type filter dropdown/checkboxes
  - Keyword search input
  - Real-time polling (10s updates)
  - Pagination (50/page, configurable)
  - Export modal (JSON/CSV, date range)
- **UI States:** Loading, Displaying events, Expanded row, Filtered view, Search results, Real-time updates
- **User Interactions:** Click Event Log tab, expand/collapse rows, copy JSON, filter by type, search keywords, export data
- **Page Count:** 5 pages (Active job mixed events, Expanded JSON, Filtered errors, Search results, Export modal)
- **Dependencies:** Tab on FR2.1.1 dashboard page

### FR2.2.1: Cancel Active Training Job
- **Purpose:** Terminate active training jobs with confirmation workflow and cost impact analysis
- **Core Functionality:** Cancel button opens confirmation modal displaying current progress, cost, and requiring explicit acknowledgment
- **UI Components:**
  - "Cancel Job" button (red destructive styling, dashboard header)
  - Confirmation modal (warning header, current status display, impact analysis, reason dropdown, notes field, confirmation checkbox, action buttons)
  - Current Status Display (job name, progress bar, stage badge, elapsed time, cost spent)
  - Impact Analysis (bulleted list of consequences)
  - Cancellation Reason dropdown (required selection)
  - Optional Notes textarea
  - Confirmation checkbox (must check to enable confirm button)
  - Action buttons (Confirm red, Go Back gray)
  - Post-cancellation state display
- **UI States:** Cancel button enabled/disabled, Modal open, Cancelling in progress, Post-cancellation, Termination timeout warning
- **User Interactions:** Click Cancel Job, review status/impact, select reason, add notes, check confirmation, confirm cancellation, view partial results after cancellation
- **Page Count:** 4 pages (Dashboard with cancel button, Confirmation modal, Cancelling in progress, Post-cancellation state)
- **Dependencies:** Button on FR2.1.1 dashboard, affects FR2.3.1 jobs list status

### FR2.2.2: Pause and Resume Training (Future Enhancement - Low Priority)
- **Purpose:** Temporarily suspend training by saving checkpoints and terminating GPU to stop costs, resume later
- **Core Functionality:** Pause button saves checkpoint and terminates GPU, Resume button provisions GPU and loads checkpoint
- **UI Components:**
  - "Pause Job" button (yellow/orange, dashboard header, only during training stage)
  - Pause Confirmation Modal (description, current state, information section, confirmation button)
  - Paused Job State (status badge, pause info card, "Resume Training" button)
  - Resume Modal (resume details, previous config, GPU type option, cost estimate, warnings, buttons)
  - Cost Tracking Display (active vs paused time separation)
  - Pause/Resume History Timeline
- **UI States:** Pause button enabled/disabled, Paused job, Resume modal, Multi-pause tracking
- **User Interactions:** Click Pause Job, confirm pause, click Resume Training, optionally switch GPU type, confirm resume, view pause/resume history
- **Page Count:** 5 pages (Training with pause button, Pause confirmation, Paused state, Resume modal, Multi-pause timeline)
- **Dependencies:** Button on FR2.1.1 dashboard, future enhancement (LOW PRIORITY)

### FR2.3.1: View All Training Jobs
- **Purpose:** Comprehensive jobs list with filtering, sorting, search, bulk actions, and export
- **Core Functionality:** Responsive table showing all jobs with advanced filtering, multi-column sorting, keyword search, bulk actions, pagination, CSV export
- **UI Components:**
  - Jobs list page navigation (/dashboard/training-jobs)
  - Responsive data table (8 columns: Checkbox, Job Name, Status, Configuration, Created By, Started At, Duration, Cost, Actions)
  - Status badges (color-coded for each state)
  - Filter panel (status, creator, date range, preset, cost range, GPU type)
  - Search box (debounced)
  - Sort controls (click headers)
  - Pagination (25/50/100 per page)
  - Bulk action bar (appears when rows selected)
  - Export button with modal
  - Row click navigation
  - Empty/loading states
- **UI States:** Loading, Displaying jobs, Filtered view, Search results, Bulk selection, Exporting, Empty states, Real-time updates
- **User Interactions:** View jobs list, filter by multiple criteria, search by keyword, sort columns, select multiple jobs, bulk actions (cancel/delete/export/compare), export CSV, click row to view details
- **Page Count:** 5 pages (Mixed status view, Filtered active jobs, Bulk selection mode, Export modal, Mobile responsive)
- **Dependencies:** Primary navigation for accessing FR2.1.1 dashboards, shows jobs from all stages

### FR2.3.2: Training Queue Management
- **Purpose:** Display queued jobs with start time estimates, queue positions, priority indicators, and resource availability
- **Core Functionality:** Queue view showing queued/provisioning jobs with calculated start times, active job slots, queue positions, priority promotion workflow
- **UI Components:**
  - "Queue" tab on jobs page with badge count
  - Card-based layout (not table)
  - Queue position badges (large, color-coded: #1-3 green, #4-7 yellow, #8+ orange)
  - Active Jobs Overview Panel (slot indicators, progress)
  - Estimated Start Time display with countdown
  - Queue Priority System (FIFO default, Promote to Front button)
  - Concurrency Limit Display (max 3 concurrent)
  - Queue Analytics (average wait, throughput, longest wait)
  - Queue management actions menu
  - Empty queue state
  - Queue position notifications
- **UI States:** Queued jobs displayed, Empty queue, Priority promotion modal, Queue updates, Position notifications
- **User Interactions:** View queue, monitor position, see start time estimates, promote to front (manager role), manage queue actions, receive notifications
- **Page Count:** 5 pages (Normal queue state, Empty slot, Priority promotion modal, Queue notifications, Analytics dashboard)
- **Dependencies:** Tab on FR2.3.1 jobs page, shows subset of jobs with queued/provisioning status

---

### Step 1.2: Identify Relationships & Integration Points

#### Sequential Flow (User Journey)

**Primary Flow:**
FR2.3.1 (View All Jobs) → FR2.1.1 (Click active job → Dashboard) → FR2.1.2 (Stage indicator on dashboard) → FR2.1.3 (Event log tab) → FR2.2.1 (Cancel if needed)

**Queue Flow:**
FR2.3.1 (View All Jobs) → FR2.3.2 (Queue tab) → Monitor queue position → Job starts → FR2.1.1 (Dashboard)

#### Complementary Features (Same Page/View)

**Group 1 (Job Details Dashboard - FR2.1.1):**
- FR2.1.1: Progress header, loss curve, metrics table, cost tracker (main content)
- FR2.1.2: Stage indicator (positioned below progress header)
- FR2.1.3: Event log (tab navigation)
- FR2.2.1: Cancel button (header action)
- FR2.2.2: Pause button (header action, future)

**Group 2 (Jobs List & Queue - FR2.3.1 + FR2.3.2):**
- FR2.3.1: All Jobs tab (default view)
- FR2.3.2: Queue tab (subset view of queued jobs)

#### State Dependencies (One Affects Another)

1. **FR2.3.1 → FR2.1.1:** Click job row navigates to job dashboard
2. **FR2.1.1 → FR2.1.2:** Dashboard displays stage indicator as integrated component
3. **FR2.1.1 → FR2.1.3:** Event log accessible via tab navigation on dashboard
4. **FR2.2.1 → FR2.3.1:** Cancel job updates status in jobs list (cancelled badge)
5. **FR2.2.1 → FR2.1.1:** Cancel action affects all dashboard components (status, stop polling)
6. **FR2.3.2 → FR2.1.1:** When job exits queue and starts, navigate to dashboard
7. **FR2.3.1 ↔ FR2.3.2:** Jobs list "Queue" tab shows filtered view of queued jobs
8. **FR2.1.1 real-time updates → FR2.3.1:** Active jobs update status/progress in list view every 60s

#### UI Component Sharing

1. **Status badges:** Used in FR2.1.1, FR2.1.2, FR2.3.1, FR2.3.2 (consistent color coding)
2. **Job name display:** FR2.3.1 (table row), FR2.3.2 (queue card), FR2.1.1 (dashboard header)
3. **Cost display:** FR2.1.1 (cost tracker card), FR2.3.1 (cost column), FR2.2.1 (cancellation modal)
4. **Progress indicators:** FR2.1.1 (progress header), FR2.1.2 (stage progress), FR2.3.1 (active jobs in table)
5. **Configuration display:** FR2.3.1 (configuration column), FR2.3.2 (queue cards), FR2.2.1 (cancellation modal)
6. **Tab navigation:** FR2.1.1 (Overview/Metrics/Event Log tabs), FR2.3.1 (All Jobs/Queue/Active/Completed tabs)

---

### Step 1.3: Identify Overlapping/Duplicate Functionality

#### 1. Status Display Duplication
- **FR2.1.1** shows current stage badge in progress header
- **FR2.1.2** shows detailed 4-stage visual progress bar
- **FR2.3.1** shows status badges in jobs list
- **FR2.3.2** shows queued status in queue cards
- **CONSOLIDATION:** Use consistent status badge design across all views. FR2.1.2 is the detailed view on dashboard, FR2.3.1/FR2.3.2 use simplified badges, FR2.1.1 header shows current stage linking to FR2.1.2 details

#### 2. Cost Tracking Duplication
- **FR2.1.1** has dedicated cost tracker card with detailed breakdown
- **FR2.3.1** shows cost in table column
- **FR2.2.1** displays cost spent in cancellation modal
- **CONSOLIDATION:** FR2.1.1 cost tracker is the authoritative detailed view. FR2.3.1 shows summary cost in table. FR2.2.1 pulls from same data source, displays prominently in modal

#### 3. Progress Display Duplication
- **FR2.1.1** progress header card shows overall percentage, steps, epochs
- **FR2.1.2** stage progress bar shows phase-level progression
- **FR2.3.1** shows progress for active jobs in table
- **CONSOLIDATION:** FR2.1.1 header shows numerical progress (42%, Step 850/2000). FR2.1.2 shows visual phase progress. FR2.3.1 shows abbreviated progress (42% in table). All sync from same data

#### 4. Job Configuration Display
- **FR2.3.1** shows configuration in table column (preset, GPU type)
- **FR2.3.2** shows configuration in queue cards
- **FR2.2.1** references configuration in cancellation modal context
- **CONSOLIDATION:** Use consistent configuration summary format: "{Preset} • {GPU Type} {Model}" across all views

#### 5. Time/Duration Display
- **FR2.1.1** shows elapsed time and estimated remaining in progress header
- **FR2.1.2** shows per-stage elapsed time
- **FR2.3.1** shows total duration in table column
- **FR2.3.2** shows estimated start time with countdown
- **CONSOLIDATION:** Different granularities serve different purposes. Keep separate but use consistent time formatting

#### 6. Event/Activity Logging
- **FR2.1.3** comprehensive webhook event log
- **FR2.1.2** stage history log (clickable stages for details)
- **CONSOLIDATION:** FR2.1.3 is comprehensive audit trail. FR2.1.2 stage history is filtered view of stage-specific events. Stage history could link to filtered event log

#### 7. Job Actions
- **FR2.2.1** Cancel button on dashboard
- **FR2.3.1** Actions menu in table with Cancel option
- **FR2.3.1** Bulk actions for multiple jobs
- **CONSOLIDATION:** Dashboard (FR2.1.1) has prominent Cancel button. Jobs list (FR2.3.1) has Cancel in actions menu. Bulk actions allow cancelling multiple jobs at once

---

### Step 1.4: Identify POC Simplification Opportunities

#### Features to KEEP (Essential for POC)

**FR2.1.1 - Live Training Progress Dashboard (CORE):**
1. ✅ Progress header card with percentage, steps, elapsed/remaining time
2. ✅ Current stage badge
3. ✅ Live loss curve graph (dual y-axis, training and validation)
4. ✅ Basic zoom controls (zoom in/out/reset)
5. ✅ Current metrics table (training loss, validation loss, learning rate, GPU utilization)
6. ✅ Cost tracker card with current spend and estimated total
7. ✅ Auto-refresh every 60 seconds
8. ✅ Manual refresh button

**FR2.1.2 - Training Stage Indicators (KEEP - SIMPLIFIED):**
1. ✅ Four-stage horizontal progress bar
2. ✅ Active stage highlighting with current substatus message
3. ✅ Completed stages with checkmarks
4. ✅ Basic stage durations (estimated for pending, actual for completed)

**FR2.1.3 - Webhook Event Log (KEEP - SIMPLIFIED):**
1. ✅ Event log tab with table view
2. ✅ Color-coded event types
3. ✅ Basic filtering (by event type)
4. ✅ Expandable JSON payloads

**FR2.2.1 - Cancel Active Training Job (CORE):**
1. ✅ Cancel button on dashboard
2. ✅ Confirmation modal with current status
3. ✅ Cost impact display
4. ✅ Cancellation reason dropdown
5. ✅ Confirmation checkbox

**FR2.3.1 - View All Training Jobs (CORE):**
1. ✅ Jobs list table with key columns
2. ✅ Status badges
3. ✅ Basic filtering (status, date range)
4. ✅ Click row to view details
5. ✅ Pagination

**FR2.3.2 - Training Queue Management (KEEP - SIMPLIFIED):**
1. ✅ Queue tab showing queued jobs
2. ✅ Queue position display
3. ✅ Estimated start time
4. ✅ Active slots indicator

#### Features to SIMPLIFY (Reduce Complexity)

**FR2.1.1 - Dashboard Simplifications:**
1. 🔽 **Loss Curve Graph:**
   - REMOVE: Pan controls, export PNG button (nice-to-have for reports)
   - KEEP: Basic zoom (in/out/reset), tooltip on hover
2. 🔽 **Metrics Table:**
   - REMOVE: Perplexity, tokens/second, steps/hour (advanced metrics)
   - KEEP: Training loss, validation loss, learning rate, GPU utilization, trend arrows
3. 🔽 **Cost Tracker:**
   - REMOVE: Detailed itemized breakdown (GPU + storage + spot buffer)
   - KEEP: Simple display (current spend, estimated total, percentage progress bar)
4. 🔽 **Auto-refresh:**
   - REMOVE: Websocket real-time updates (complex infrastructure)
   - KEEP: Simple 60s polling
5. 🔽 **Loading States:**
   - REMOVE: Advanced skeleton animations (shimmer effects)
   - KEEP: Simple gray placeholder boxes

**FR2.1.2 - Stage Indicators Simplifications:**
1. 🔽 **Stage Details:**
   - REMOVE: Detailed substatus progress percentages, expandable stage history logs
   - KEEP: Current substatus message (text only), completed checkmarks, basic durations
2. 🔽 **Animations:**
   - REMOVE: Confetti on completion, complex gradient sweeps, pulsing animations
   - KEEP: Simple color transitions (gray → blue → green), basic pulse on active stage
3. 🔽 **Checkpoint Recovery:**
   - REMOVE: Mini recovery progress bar, detailed recovery substatus
   - KEEP: Simple "Recovering..." message, success indicator when resumed

**FR2.1.3 - Event Log Simplifications:**
1. 🔽 **Filtering:**
   - REMOVE: Multi-select filters, keyword search with highlighting, date range picker
   - KEEP: Simple dropdown filter (All / Status / Metrics / Warnings / Errors)
2. 🔽 **Pagination:**
   - REMOVE: Configurable page size, numbered page links, go-to-page input
   - KEEP: Simple Previous/Next navigation, fixed 50 per page
3. 🔽 **Export:**
   - REMOVE: CSV export, date range selection, filtered export options
   - KEEP: Simple JSON export (all events)

**FR2.2.1 - Cancel Job Simplifications:**
1. 🔽 **Cancellation Modal:**
   - REMOVE: Optional notes field, detailed impact analysis bullets
   - KEEP: Simple warning, current progress/cost, reason dropdown, confirmation checkbox
2. 🔽 **Post-Cancellation:**
   - REMOVE: Download partial artifacts, detailed cancellation analytics tracking
   - KEEP: Status badge update, partial data viewable (loss curves, metrics)

**FR2.2.2 - Pause/Resume (FUTURE ENHANCEMENT):**
- ❌ REMOVE ENTIRELY for POC (marked as Low Priority future enhancement)
- Rationale: Adds significant complexity (checkpoint management, multi-state tracking, GPU reprovisioning). Not essential for initial launch.

**FR2.3.1 - Jobs List Simplifications:**
1. 🔽 **Filtering:**
   - REMOVE: Created by filter, configuration preset filter, cost range filter, GPU type filter
   - KEEP: Status filter (All/Active/Completed/Failed), simple date range (Last 7/30/90 days)
2. 🔽 **Search:**
   - REMOVE: Full-text search with highlighting, tag search
   - KEEP: Simple job name search
3. 🔽 **Sorting:**
   - REMOVE: Multi-column sort, all column sorts
   - KEEP: Default sort by created date (newest first) only
4. 🔽 **Bulk Actions:**
   - REMOVE: Bulk cancel, bulk delete, compare selected
   - KEEP: Single job actions only via actions menu
5. 🔽 **Export:**
   - REMOVE: CSV export with custom columns
   - KEEP: None for POC (can view details individually)
6. 🔽 **Table Columns:**
   - REMOVE: Configuration column details (show simplified in hover tooltip)
   - KEEP: Job Name, Status, Created By, Started At, Duration, Cost, Actions

**FR2.3.2 - Queue Management Simplifications:**
1. 🔽 **Priority System:**
   - REMOVE: Priority promotion workflow, manager approval, promotion modal
   - KEEP: Simple FIFO queue display, position numbers
2. 🔽 **Queue Analytics:**
   - REMOVE: Average wait time, throughput stats, historical metrics, queue history view
   - KEEP: Current queue depth (X jobs in queue), active slots (2 of 3)
3. 🔽 **Notifications:**
   - REMOVE: Email/Slack notifications for queue position changes
   - KEEP: Simple in-app display of position
4. 🔽 **Queue Actions:**
   - REMOVE: Edit configuration, promote to front, notify me when starting
   - KEEP: View configuration (read-only), remove from queue

#### Features to REMOVE (Nice-to-Have)

**FR2.1.1:**
1. ❌ Export graph as PNG
2. ❌ Pan controls for loss curve
3. ❌ Perplexity display
4. ❌ Tokens/second, steps/hour metrics
5. ❌ Detailed cost breakdown with itemization
6. ❌ Websocket real-time updates
7. ❌ Advanced skeleton animations (shimmer effects)

**FR2.1.2:**
1. ❌ Clickable stages with expandable detailed logs
2. ❌ Confetti/success animations on stage completion
3. ❌ Detailed checkpoint recovery progress bar
4. ❌ Stage history timeline visualization

**FR2.1.3:**
1. ❌ Keyword search with highlighting
2. ❌ Multi-select event type filtering
3. ❌ CSV export option
4. ❌ Date range filtering
5. ❌ Event timeline visualization
6. ❌ Event log comparison between jobs

**FR2.2.1:**
1. ❌ Optional notes field for cancellation
2. ❌ Download partial checkpoint artifacts
3. ❌ Batch cancellation for multiple jobs
4. ❌ Cancellation reason analytics/reporting

**FR2.2.2:**
1. ❌ ENTIRE FEATURE REMOVED for POC (Pause/Resume functionality)

**FR2.3.1:**
1. ❌ Advanced filtering (created by, preset, cost range, GPU type)
2. ❌ Full-text keyword search with highlighting
3. ❌ Multi-column sorting
4. ❌ Bulk actions (select multiple, cancel/delete selected, compare)
5. ❌ CSV export
6. ❌ Tag system and tag filtering
7. ❌ Virtualized scrolling for large datasets

**FR2.3.2:**
1. ❌ Priority promotion workflow with manager approval
2. ❌ Queue analytics dashboard (average wait, throughput, history)
3. ❌ Queue position notifications (email/Slack)
4. ❌ Edit configuration from queue
5. ❌ Scheduled starts
6. ❌ Queue reservation system

#### Rationale

**POC Goal:** Demonstrate core training monitoring workflow:
- Start training job → Monitor real-time progress (loss curves, metrics, stages) → Track costs → Cancel if needed → View all jobs and queue

**Essential:** 
- Real-time monitoring with live loss curves and metrics
- Stage progression visibility
- Cost transparency
- Cancel control
- Jobs list navigation
- Queue visibility

**Non-Essential:**
- Advanced analytics and export features
- Complex approval workflows
- Pause/resume functionality
- Bulk operations
- Advanced filtering and search
- Detailed customization options

---

## PHASE 2: INTEGRATION PLANNING

### Step 2.1: Design Unified UX Flow

#### Overall Architecture

**Three Primary Views:**
1. **Jobs List View** (FR2.3.1 + FR2.3.2)
2. **Job Details Dashboard** (FR2.1.1 + FR2.1.2 + FR2.1.3 + FR2.2.1)
3. **Modals** (Cancel confirmation, Export options)

#### View 1: Jobs List & Queue

**Page: `/dashboard/training-jobs`**

**Tab Navigation:**
- All Jobs (default) - FR2.3.1
- Queue - FR2.3.2
- Active - FR2.3.1 filtered
- Completed - FR2.3.1 filtered

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Training Jobs                                            │
│ [Create New Training Job]                                        │
├─────────────────────────────────────────────────────────────────┤
│ TABS: [All Jobs] [Queue (5)] [Active] [Completed]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ FILTERS:  [Status ▼] [Date Range ▼]    SEARCH: [............]  │
│                                                                   │
│ TABLE (All Jobs Tab):                                           │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Job Name  │ Status │ Created By │ Started  │ Duration │ Cost│Actions│
│ │─────────────────────────────────────────────────────────────│
│ │ Elena M.. │ 🏃Trai..│ John Smith │ 2:30 PM │ 6h 23m │ $22 │ ⋮ │  │
│ │ Client X  │ ✓Compl │ You        │ 9:00 AM │ 12h 45m│ $48 │ ⋮ │  │
│ │ Test Run  │ ❌Fail │ Jane Doe   │ 1:15 PM │ 2h 10m │ $8  │ ⋮ │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Showing 1-25 of 47 jobs    [< Previous]  [Next >]              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Queue Tab Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ACTIVE TRAINING JOBS: 2 of 3 slots                              │
│ [🏃 Job A - 42%] [🏃 Job B - 78%] [⚪ Available]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ QUEUE (5 jobs):                                                  │
│                                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ #1   Elena Financial Training                               │  │
│ │      Balanced • Spot H100                                   │  │
│ │      Est. Start: Today at 6:45 PM (in 3h 20m)             │  │
│ │      Created by: John Smith                                 │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ #2   Client X Revision                                      │  │
│ │      Aggressive • On-Demand H100                           │  │
│ │      Est. Start: Today at 7:15 PM (in 3h 50m)             │  │
│ │      Created by: Jane Doe                                   │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ [...more queue cards...]                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### View 2: Job Details Dashboard

**Page: `/training-jobs/{job_id}`**

**Integrated Components Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Training Job: Elena Morales Financial                   │
│ [Manual Refresh ↻] [Cancel Job]                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ PROGRESS HEADER CARD (FR2.1.1):                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 42% Complete ●●●●●●●●○○○○○○○○○○○  [Training 🏃]         │   │
│ │ Step 850 of 2,000  •  Epoch 2 of 3                       │   │
│ │ Elapsed: 6h 23m  •  Remaining: ~8h 15m                   │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│ STAGE INDICATOR (FR2.1.2):                                      │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [✓ Preprocessing] → [✓ Model Loading] → [🔄 Training]   │   │
│ │  3m 42s              11m 18s          6h 23m elapsed...  │   │
│ │                                       Epoch 2/3, Step 850│   │
│ │                                                          → [○ Finalization]│
│ └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│ TABS: [Overview] [Event Log]                                    │
├─────────────────────────────────────────────────────────────────┤
│ MAIN CONTENT (60% width)      │ SIDEBAR (40% width)            │
│                                │                                 │
│ LIVE LOSS CURVE (FR2.1.1):    │ CURRENT METRICS (FR2.1.1):     │
│ ┌────────────────────────────┐│ ┌────────────────────────────┐│
│ │     Loss Curve             ││ │ Training Loss: 0.342 ↓     ││
│ │  [Graph with dual axes]    ││ │ Validation Loss: 0.358 ↓   ││
│ │  Training ─  Validation ── ││ │ Learning Rate: 0.000182    ││
│ │                            ││ │ GPU Utilization: 87%       ││
│ │  [Zoom +] [Zoom -] [Reset] ││ └────────────────────────────┘│
│ └────────────────────────────┘│                                 │
│                                │ COST TRACKER (FR2.1.1):        │
│                                │ ┌────────────────────────────┐│
│                                │ │ Current Spend: $22.18      ││
│                                │ │ ●●●●●○○○○○ 49% of estimate ││
│                                │ │ Est. Total: $45-55         ││
│                                │ │ Rate: $2.49/hr (spot)      ││
│                                │ │ Projected: $47.32          ││
│                                │ └────────────────────────────┘│
│                                │                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Event Log Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│ TABS: [Overview] [Event Log]                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ EVENT LOG (FR2.1.3):                                            │
│ Filter: [All Events ▼]                                          │
│                                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Timestamp         │ Type      │ Message               │ [v]│  │
│ │───────────────────────────────────────────────────────────│  │
│ │ 14:28:15         │ 📊Metrics  │ Step 100: loss=0.521 │ [v]│  │
│ │ 14:23:42         │ ℹ️Status   │ Training started     │ [v]│  │
│ │ 14:15:08         │ ⚠️Warning  │ GPU util dropped 45% │ [v]│  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ [< Previous]  Page 1 of 12  [Next >]                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### User Interaction Flows

**Flow 1: View Active Training Job**
1. User navigates to `/dashboard/training-jobs`
2. Jobs list loads (FR2.3.1)
3. User clicks row with "Training" status
4. Navigate to `/training-jobs/{job_id}`
5. Dashboard loads with all integrated components:
   - Progress header (FR2.1.1) displays percentage, steps, time
   - Stage indicator (FR2.1.2) shows current stage (Training) highlighted
   - Loss curve graph (FR2.1.1) renders with latest data
   - Metrics table (FR2.1.1) shows current values with trends
   - Cost tracker (FR2.1.1) displays current spend and projections
6. Auto-refresh begins (every 60s)
7. All components update simultaneously with new data
8. User monitors progress, loss decreasing (green arrows ↓), costs within estimate

**Flow 2: Check Event Log for Troubleshooting**
1. User on job dashboard (from Flow 1)
2. User clicks "Event Log" tab
3. Event log table loads (FR2.1.3)
4. User sees chronological list of all events
5. User filters to "Warnings + Errors" to identify issues
6. User clicks expand arrow on warning event
7. JSON payload expands showing detailed webhook data
8. User copies JSON for further analysis
9. User clicks "Overview" tab to return to main dashboard

**Flow 3: Cancel Training Job**
1. User on job dashboard monitoring progress
2. User notices loss not improving or cost too high
3. User clicks "Cancel Job" button (red, header)
4. Confirmation modal opens (FR2.2.1):
   - Displays current progress (42%, Step 850/2000)
   - Shows cost spent ($22.18)
   - Shows impact warnings
   - Requires reason selection
   - Requires confirmation checkbox
5. User selects reason "Cost too high"
6. User checks "I understand this action cannot be undone"
7. "Confirm Cancellation" button enables (was disabled)
8. User clicks "Confirm Cancellation"
9. Modal shows "Cancelling..." loading state
10. Job status updates to "Cancelled"
11. Toast notification: "Job cancelled. Final cost: $22.18"
12. Dashboard stops polling
13. Status badge changes to "Cancelled" (orange)
14. Cancel button replaced with "Job Cancelled" indicator

**Flow 4: View Training Queue**
1. User navigates to `/dashboard/training-jobs`
2. User clicks "Queue" tab
3. Queue view loads (FR2.3.2):
   - Active slots panel shows "2 of 3 slots" filled
   - Queue cards display below showing 5 queued jobs
4. User sees their job at position #3
5. Estimated start time: "Today at 7:30 PM (in 4h 15m)"
6. User monitors queue position
7. Active job completes
8. Queue auto-updates (30s polling):
   - Positions shift up
   - User's job now #2
   - Estimated start time updated: "Today at 6:45 PM (in 3h 30m)"
9. User receives notification (future): "Your job moved to position #2"

**Flow 5: Navigate from Jobs List**
1. User on jobs list "All Jobs" tab
2. User applies filter: Status = "Active"
3. Table updates showing only active jobs
4. User applies date range filter: "Last 7 days"
5. Table further filters
6. URL updates: `?status=active&dateRange=7d`
7. User searches: "elena"
8. Table filters to jobs with "elena" in name
9. User sees "Elena Morales Financial" job
10. User clicks row
11. Navigate to job dashboard (`/training-jobs/{job_id}`)

### Step 2.2: Define Component Relationships

#### Primary Components & Their Triggers

**JobsList Component (FR2.3.1):**
- **Location:** `/dashboard/training-jobs`
- **Child Components:** FilterPanel, SearchBox, JobsTable, Pagination
- **State:** jobs array, filters, searchQuery, currentPage, sortConfig
- **Data Source:** GET `/api/training/jobs?status={filters}&search={query}&page={page}`
- **Refresh:** Initial load + real-time updates every 60s for active jobs only
- **Triggers:**
  - User selects filter → update filters state → refetch jobs
  - User types search → debounce 500ms → update searchQuery → refetch jobs
  - User clicks row → navigate to `/training-jobs/{job.id}`
  - User clicks actions menu → show context menu
  - User clicks pagination → update currentPage → refetch jobs

**QueueView Component (FR2.3.2):**
- **Location:** `/dashboard/training-jobs?tab=queue`
- **Child Components:** ActiveSlotsPanel, QueueCard (multiple)
- **State:** queuedJobs array, activeJobs array, concurrencyLimit
- **Data Source:** GET `/api/training/jobs?status=queued,pending_gpu_provisioning`
- **Refresh:** Initial load + real-time updates every 30s
- **Triggers:**
  - Queue position changes → recalculate estimated start times
  - Active job completes → queue shifts up → update all cards
  - User clicks queue card → show actions menu
  - User clicks "View Configuration" → show config modal

**JobDashboard Component (FR2.1.1):**
- **Location:** `/training-jobs/{job_id}`
- **Child Components:** ProgressHeader, StageIndicator, TabNavigation, LossCurveGraph, MetricsTable, CostTracker, EventLogTab
- **State:** jobData, metricsHistory, isLoading, lastRefreshTime, activeTab
- **Data Source:** 
  - Initial: GET `/api/training/jobs/{job_id}` (full job data)
  - Updates: GET `/api/training/jobs/{job_id}/metrics?latest=true` (incremental)
- **Refresh:** Auto-refresh every 60s (only for active jobs)
- **Triggers:**
  - Tab click → switch activeTab state
  - Manual refresh button → immediately refetch metrics
  - Cancel button → open CancelModal

**ProgressHeader Component (FR2.1.1):**
- **Parent:** JobDashboard
- **Props:** jobData (progress %, current step, total steps, elapsed time, estimated remaining, current epoch, total epochs, status)
- **Computed:**
  - Progress percentage: (currentStep / totalSteps) × 100
  - Elapsed time: NOW() - job.started_at (client-side timer updates every 1s)
  - Estimated remaining: dynamically calculated based on avg speed
- **Reactivity:** Updates when jobData changes from parent refresh

**StageIndicator Component (FR2.1.2):**
- **Parent:** JobDashboard
- **Props:** jobData (current_stage, stage_started_at, substatus_message)
- **Child Components:** StageSegment (× 4: Preprocessing, Model Loading, Training, Finalization)
- **States:** Each stage has status (pending/active/completed/failed)
- **Visual Logic:**
  - Pending stages: Gray, dotted border
  - Active stage: Blue gradient, pulsing, shows substatus message, elapsed time counter
  - Completed stages: Green, checkmark, actual duration
  - Failed stage: Red, error icon, error message
- **Reactivity:** Updates when jobData.current_stage changes

**LossCurveGraph Component (FR2.1.1):**
- **Parent:** JobDashboard
- **Props:** metricsHistory array (step, training_loss, validation_loss)
- **State:** zoomLevel (default: full), hoveredPoint
- **Library:** Chart.js or Recharts with dual y-axis config
- **Features:**
  - Dual y-axis (training loss left, validation loss right)
  - Zoom in: focus on recent 500 steps
  - Zoom out/reset: show full history
  - Hover tooltip: "Step X: Training Loss Y.YYY, Validation Loss Z.ZZZ"
- **Triggers:**
  - Zoom +/- buttons → update zoomLevel state → re-render chart with filtered data
  - Reset button → set zoomLevel to default → show full dataset
  - Hover over chart → show tooltip overlay
- **Reactivity:** New data points appended on parent refresh → smooth line transition

**MetricsTable Component (FR2.1.1):**
- **Parent:** JobDashboard
- **Props:** latestMetrics object (training_loss, validation_loss, learning_rate, gpu_utilization)
- **Computed Trend Indicators:**
  - Compare latestMetrics.training_loss vs previousMetrics.training_loss
  - If decreased: ↓ green arrow, percentage change
  - If increased: ↑ red arrow, percentage change
  - If unchanged: → gray, no percentage
- **Display:**
  - Training Loss: 0.342 ↓ from 0.389 (-12.1%)
  - Validation Loss: 0.358 ↓ from 0.412 (-13.1%)
  - Learning Rate: 0.000182
  - GPU Utilization: 87%
- **Reactivity:** Updates when latestMetrics changes, brief highlight animation on changed values

**CostTracker Component (FR2.1.1):**
- **Parent:** JobDashboard
- **Props:** jobData (gpu_hourly_rate, elapsed_hours, estimated_cost_min, estimated_cost_max)
- **Computed:**
  - Current spend: elapsed_hours × gpu_hourly_rate
  - Projected final: current_spend + (estimated_remaining_hours × gpu_hourly_rate)
  - Percentage of estimate: (current_spend / estimated_cost_max) × 100
- **Visual:**
  - Large bold current spend: "$22.18"
  - Progress bar (green <80%, yellow 80-100%, red >100%)
  - Estimated total: "$45-55"
  - Projected: "$47.32"
- **Warning Logic:**
  - If current_spend > estimated_cost_max: Show red warning alert
- **Reactivity:** Updates every 60s when parent refreshes, number transitions animated

**EventLogTab Component (FR2.1.3):**
- **Parent:** JobDashboard (as tab content)
- **State:** events array, filters, expandedRows, currentPage
- **Data Source:** GET `/api/training/jobs/{job_id}/events?filter={filters}&page={page}`
- **Refresh:** Real-time polling every 10s (faster than main dashboard)
- **Child Components:** FilterDropdown, EventTable, EventRow (multiple), Pagination
- **Triggers:**
  - Filter dropdown change → update filters state → refetch events
  - Click row → toggle expandedRows state → show/hide JSON payload
  - Copy JSON button → navigator.clipboard.writeText(event.payload)
  - Pagination → update currentPage → refetch events
- **Reactivity:** New events prepend to top with blue pulse animation

**CancelModal Component (FR2.2.1):**
- **Trigger:** User clicks "Cancel Job" button on JobDashboard
- **Props:** jobData (job name, current progress, cost spent, status)
- **State:** selectedReason (required), confirmationChecked (boolean), isSubmitting
- **Layout:**
  - Header: Warning icon + title "Cancel Training Job?"
  - Current Status: Progress bar, cost spent (large bold)
  - Impact Analysis: Bulleted list
  - Reason Dropdown: Required selection
  - Confirmation Checkbox: Required to enable confirm button
  - Action Buttons: Confirm (red, disabled until checkbox), Go Back (gray)
- **Triggers:**
  - Reason dropdown change → update selectedReason
  - Checkbox toggle → update confirmationChecked → enable/disable Confirm button
  - Confirm button click → POST `/api/training/jobs/{job_id}/cancel` with reason → status updates to "cancelling" → modal closes → dashboard stops polling
  - Go Back button click → close modal, no action
  - Escape key → close modal (same as Go Back)
- **Validation:** Confirm button only enabled when: selectedReason !== null AND confirmationChecked === true

#### Component Data Flow

```
JobsList (FR2.3.1)
  └─ Fetch: GET /api/training/jobs
  └─ Click row → Navigate → JobDashboard

JobDashboard (FR2.1.1)
  ├─ Fetch: GET /api/training/jobs/{id} (initial)
  ├─ Fetch: GET /api/training/jobs/{id}/metrics (every 60s)
  ├─ ProgressHeader
  │   └─ Receives: jobData props
  │   └─ Computes: progress %, elapsed time (client-side)
  ├─ StageIndicator (FR2.1.2)
  │   └─ Receives: jobData.current_stage, substatus_message props
  │   └─ Renders: 4 stage segments with status-based styling
  ├─ LossCurveGraph
  │   └─ Receives: metricsHistory array prop
  │   └─ User actions: Zoom +/- → Update local zoomLevel state
  ├─ MetricsTable
  │   └─ Receives: latestMetrics object prop
  │   └─ Computes: Trend arrows (compare to previousMetrics)
  ├─ CostTracker
  │   └─ Receives: jobData props (hourly rate, elapsed time)
  │   └─ Computes: Current spend, projected final, percentage
  ├─ EventLogTab (FR2.1.3, when active tab)
  │   └─ Fetch: GET /api/training/jobs/{id}/events (every 10s)
  │   └─ Click row → Toggle expandedRows state
  └─ Cancel Button → Opens CancelModal (FR2.2.1)
      └─ On confirm → POST /api/training/jobs/{id}/cancel
      └─ Dashboard re-fetches → jobData.status = "cancelled"
      └─ Polling stops (useEffect conditional)

QueueView (FR2.3.2)
  ├─ Fetch: GET /api/training/jobs?status=queued (every 30s)
  ├─ ActiveSlotsPanel
  │   └─ Shows: Active jobs count vs concurrency limit
  └─ QueueCard (for each queued job)
      └─ Displays: Position #, job name, config, estimated start time
      └─ Computes: Estimated start (sum of remaining time for jobs ahead)
```

---

## PHASE 3: POC SIMPLIFICATION

### Step 3.1: Simplified Feature List

#### What We're Building (Essential Only)

**View 1: Jobs List & Queue**

**Jobs List (FR2.3.1 - Simplified):**
- Responsive table with 7 columns: Job Name, Status, Created By, Started At, Duration, Cost, Actions
- Status filter: All / Active / Completed / Failed / Cancelled
- Date range filter: Last 7 days / Last 30 days / Last 90 days
- Simple job name search (no full-text, no highlighting)
- Default sort by created date (newest first) - no other sorting
- Fixed pagination: 25 per page, Previous/Next only
- Click row opens job dashboard
- Actions menu per row: View Details, Cancel (if active), Delete (if completed/failed)
- No bulk selection, no bulk actions
- No CSV export
- Real-time status updates for active jobs (every 60s)

**Queue Tab (FR2.3.2 - Simplified):**
- Active slots panel: "2 of 3 slots" with visual indicators
- Queue cards showing: Position badge (#1, #2, etc with color coding), Job name, Configuration summary (preset, GPU type), Estimated start time with countdown, Creator
- Simple FIFO queue (no priority promotion)
- Real-time position updates (every 30s)
- No queue analytics (average wait, throughput)
- No notifications for position changes
- Actions: View configuration (read-only), Remove from queue

**View 2: Job Dashboard**

**Progress Header (FR2.1.1 - Simplified):**
- Progress bar with percentage (42%)
- Step counter (Step 850 of 2,000)
- Epoch counter (Epoch 2 of 3)
- Elapsed time (6h 23m, updates every second client-side)
- Estimated remaining (8h 15m, updates every 60s from server)
- Current stage badge (Training 🏃, blue with simple pulse)

**Stage Indicator (FR2.1.2 - Simplified):**
- Horizontal bar with 4 stages
- Pending stages: Gray with name and icon
- Active stage: Blue with current substatus message (text only, no percentage within stage)
- Completed stages: Green with checkmark and actual duration
- Failed stage: Red with error icon and message
- Simple color transitions (no confetti, no gradient animations)
- No clickable stages, no expandable logs
- Basic pulse animation on active stage only

**Loss Curve Graph (FR2.1.1 - Simplified):**
- Dual y-axis line chart (training loss left, validation loss right)
- Training loss: solid blue line
- Validation loss: dashed orange line
- Zoom controls: [Zoom In] [Zoom Out] [Reset] buttons only
- Hover tooltip: "Step X: Training Loss Y.YYY, Validation Loss Z.ZZZ"
- No pan controls
- No export PNG button
- Auto-updates with new data points every 60s

**Metrics Table (FR2.1.1 - Simplified):**
- 4 metrics only:
  1. Training Loss: 0.342 ↓ (with trend arrow and percentage change)
  2. Validation Loss: 0.358 ↓
  3. Learning Rate: 0.000182
  4. GPU Utilization: 87%
- No perplexity, no tokens/second, no steps/hour
- Trend arrows: ↓ green (improving), ↑ red (worsening), → gray (stable)
- Brief highlight animation on value changes

**Cost Tracker (FR2.1.1 - Simplified):**
- Current Spend: $22.18 (large, bold)
- Progress bar: visual percentage of estimate (color-coded: green <80%, yellow 80-100%, red >100%)
- Estimated Total: $45-55 (smaller, gray)
- Hourly Rate: $2.49/hr (spot)
- Projected Final: $47.32
- No detailed cost breakdown
- Simple disclaimer: "±15% variance"

**Auto-Refresh (FR2.1.1 - Simplified):**
- Simple polling: every 60 seconds
- Manual refresh button (circular arrow icon)
- No websocket
- Loading indicator: small spinner during fetch
- Toast on manual refresh: "Metrics updated"

**Tab Navigation:**
- Overview (default) - shows all above components
- Event Log - separate tab

**Event Log Tab (FR2.1.3 - Simplified):**
- Simple table: Timestamp, Event Type badge, Message, Expand button
- Event type filter: Dropdown with [All / Status / Metrics / Warnings / Errors] - single select only
- Color-coded badges: Status (blue), Metrics (green), Warning (yellow), Error (red)
- Expandable rows: Click to show formatted JSON payload with syntax highlighting
- Copy JSON button per expanded row
- Fixed pagination: 50 per page, Previous/Next only
- Real-time updates: every 10 seconds, new events prepend with blue pulse
- No keyword search
- No multi-select filters
- No CSV export
- Simple JSON export button (exports all events as single JSON file)

**Cancel Job (FR2.2.1 - Simplified):**
- "Cancel Job" button in dashboard header (red, prominent)
- Confirmation modal displays:
  - Warning header: "Cancel Training Job?"
  - Current progress: Progress bar "42% Complete (Step 850 of 2,000)"
  - Cost spent: "$22.18" (large, bold)
  - Simple impact list (3-4 bullets)
  - Reason dropdown (required): Loss not decreasing, Cost too high, Wrong configuration, Testing, Other
  - Confirmation checkbox: "I understand this action cannot be undone" (required to enable confirm)
  - Buttons: "Confirm Cancellation" (red), "Go Back" (gray)
- No optional notes field
- Post-cancellation: Status updates to "Cancelled", button replaced with status indicator, partial data viewable

### What We're NOT Building (Removed for POC)

❌ Pause/Resume functionality (entire FR2.2.2)
❌ Loss curve pan controls
❌ Loss curve PNG export
❌ Perplexity, tokens/second, steps/hour metrics
❌ Detailed cost breakdown with itemization
❌ Websocket real-time updates (use polling)
❌ Advanced skeleton shimmer animations
❌ Clickable stages with expandable detailed logs
❌ Confetti/success animations
❌ Detailed checkpoint recovery progress bar
❌ Event log keyword search with highlighting
❌ Event log multi-select filtering
❌ Event log CSV export
❌ Event log timeline visualization
❌ Cancel job notes field
❌ Download partial artifacts after cancellation
❌ Jobs list advanced filtering (created by, preset, cost range, GPU type)
❌ Jobs list full-text search
❌ Jobs list multi-column sorting
❌ Jobs list bulk selection and actions
❌ Jobs list CSV export
❌ Jobs list tag system
❌ Queue priority promotion with manager approval
❌ Queue analytics dashboard
❌ Queue position email/Slack notifications
❌ Edit configuration from queue

---

### Step 3.2: Page Count Reduction

#### Original Total: 28 pages across 7 FRs
- FR2.1.1: 4 pages
- FR2.1.2: 5 pages
- FR2.1.3: 5 pages
- FR2.2.1: 4 pages
- FR2.2.2: 5 pages (REMOVED entirely)
- FR2.3.1: 5 pages
- FR2.3.2: 5 pages

#### Combined & Simplified: 15 pages

**Jobs List & Queue View (5 pages):**
1. **Jobs List - Mixed Status View**
   - All Jobs tab with various job statuses
   - Table with filters applied (status, date range)
   - Search box with query
   - Pagination controls
2. **Jobs List - Filtered Active Jobs**
   - Status filter = Active
   - Real-time status/progress updates visible
   - Actions menu expanded on one row
3. **Jobs List - Empty State**
   - No jobs found message
   - "Create Your First Training Job" CTA
4. **Queue Tab - Normal State**
   - Active slots panel (2 of 3 filled)
   - 5 queue cards with position badges
   - Estimated start times
5. **Queue Tab - Empty Queue**
   - "Queue is empty" message
   - "Create New Training Job" CTA

**Job Dashboard - Overview Tab (7 pages):**
6. **Dashboard - Initial Load**
   - Skeleton placeholders for all components
   - Loading state
7. **Dashboard - Active Training (Normal)**
   - All components loaded with live data
   - Progress header showing 42%
   - Stage indicator with Training active
   - Loss curve with data
   - Metrics table with trends
   - Cost tracker within estimate (green)
8. **Dashboard - Loss Curve Zoomed In**
   - Focus on zoom interaction
   - Zoom in button pressed
   - Graph showing recent 500 steps only
   - Tooltip visible on hover
9. **Dashboard - Cost Warning State**
   - Cost exceeds estimate (red warning)
   - Cost progress bar red
   - Warning alert banner
   - Cancel button emphasized
10. **Dashboard - Completed Job**
    - Final completed state
    - All stages green with checkmarks
    - Final loss curve (static)
    - Final metrics and costs
    - No polling (static data)
11. **Dashboard - Failed Job**
    - Failed status
    - Stage indicator shows failed stage (red)
    - Error message displayed
    - Event log shows errors
    - Partial data preserved
12. **Dashboard - Mobile Responsive**
    - Stacked single-column layout
    - Collapsible sections
    - Adapted for mobile viewport

**Job Dashboard - Event Log Tab (2 pages):**
13. **Event Log - Active Job with Mixed Events**
    - Table with various event types
    - Filter dropdown (All selected)
    - One row expanded showing JSON
    - Copy JSON button
    - Real-time updates indicator
14. **Event Log - Filtered to Errors/Warnings**
    - Filter dropdown (Errors selected)
    - Only error events visible
    - Troubleshooting view

**Cancel Job Modal (1 page):**
15. **Cancel Confirmation Modal**
    - Modal open over dashboard
    - Current status display
    - Impact analysis
    - Reason dropdown with selection
    - Confirmation checkbox checked
    - Confirm button enabled

#### Reduction Strategy

**Consolidation:**
- Merged related states onto fewer pages (e.g., all normal dashboard components on one page)
- Combined similar interactions (zooming shown in one dedicated page)
- Removed FR2.2.2 entirely (5 pages eliminated)

**Simplification:**
- Reduced FR2.1.3 from 5 to 2 pages (removed export modal, search results, complex filtering)
- Reduced FR2.3.1 from 5 to 3 pages (removed bulk selection, export modal)
- Reduced FR2.3.2 from 5 to 2 pages (removed priority promotion, analytics, notifications)
- Reduced FR2.2.1 from 4 to 1 page (combined cancellation flow into single modal page)

**Focus:**
- Emphasized core monitoring flow (active training dashboard)
- Showed key states (normal, loading, error, completed, failed, mobile)
- Demonstrated critical interactions (zoom, filter, cancel)

---

