# LoRA Pipeline - Stage 7 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 7 — Cost Management & Budget Control  
**Section ID:** E07  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E07.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E07-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 7 — Cost Management & Budget Control - Complete Integrated Wireframe System

**Context Summary**

This stage enables engineers and budget managers to monitor training costs in real-time, track monthly budget consumption, receive proactive alerts when approaching limits, and attribute costs to clients and projects for financial planning. The interface prioritizes transparency through live cost tracking, proactive warnings through threshold-based alerts, and simplicity through consolidated dashboards that combine cost monitoring, projections, and budget controls into intuitive, integrated workflows.

The POC focuses on the essential cost visibility loop: monitor active job costs → view monthly budget status → receive alerts → basic cost attribution. Advanced features like scenario analysis, multi-channel notifications, and profitability calculations are simplified or removed for faster implementation.

**Journey Integration**

- **Stage 7 User Goals:** Monitor real-time training costs, maintain budget awareness, make informed continuation decisions, prevent surprise overages, track costs by client/project
- **Key Emotions:** Anxiety reduction through cost transparency, confidence in budget control, empowerment through immediate action capability
- **Progressive Disclosure:** 
  * Basic: Current spend vs estimate with visual status indicator
  * Advanced: Cost breakdown, projected completion, budget trend analysis
  * Expert: Per-job analysis, spot savings comparison, attribution reports
- **Persona Adaptations:** Unified interface serving AI engineers (primary cost monitoring during training) and budget managers (monthly oversight, attribution)

**Wireframe Goals**

- Enable real-time cost visibility during active training jobs with 60-second updates
- Provide immediate visual feedback on budget status using color-coded indicators (green/yellow/red)
- Display projected final costs and completion times to inform continuation decisions
- Present comprehensive monthly budget overview with summary cards and trend visualization
- Enable proactive budget control through threshold-based warning banners (80%, 95%, 100%)
- Support cost attribution by tagging jobs with client and project for financial reporting
- Show spot instance savings compared to on-demand pricing

---

## Explicit UI Requirements

### PAGE GROUP 1: Active Training Job Dashboard
*Location: /training-jobs/{id}*
*Combines: FR7.1.1 (Live Cost Display), FR7.1.2 (Projections), FR7.2.2 (Alert Banners)*

---

#### ALERT BANNER AREA (Top of Page, Conditional)

**Budget Warning Banner (FR7.2.2 - Simplified)**
- Displays across full width of page when budget threshold crossed
- Two severity levels:
  - **80-95% Used (Yellow Warning):**
    - Background: Yellow (#FEF3C7)
    - Icon: ⚠️
    - Message: "You've used 85% of monthly training budget ($425 of $500)"
    - Actions: [Increase Budget] button (primary), [✕ Dismiss] button (secondary)
    - Behavior: Dismissable, remains dismissed for session
  - **95%+ Used (Red Critical):**
    - Background: Red (#FEE2E2)
    - Icon: 🚨
    - Message: "Monthly budget exceeded ($505 of $500). Immediate action required."
    - Actions: [Increase Budget] button (primary), [View Budget] link
    - Behavior: Persistent, cannot be dismissed until resolved

---

#### COST TRACKER SIDEBAR (Right Side, Fixed)

**Cost Tracker Card (FR7.1.1 + FR7.1.2 Combined)**
- Position: Right sidebar, sticky on desktop scroll
- Card dimensions: 320px width (responsive)
- Card styling: White background, subtle shadow, rounded corners (8px)

**Card Header:**
- Title: "Cost Tracking" with 💰 icon
- Subtitle: "Updated 23 seconds ago" (relative timestamp)
- Small refresh indicator when fetching updates

**Primary Cost Display:**
- Current Spend: Large bold text "$22.18"
- Progress Ring: Circular indicator showing 49% of estimate
  - Ring color based on threshold:
    - Green (#10B981) when <80% of estimate
    - Yellow (#F59E0B) when 80-100%
    - Red (#EF4444) when >100%
- Estimated Range: Smaller gray text "Estimated: $45-55"
- Variance: "↓ $2.82 below estimate" (green with down arrow) or "↑ $4.18 over" (red with up arrow)

**Rate & Time Display:**
- Hourly Rate: "Rate: $2.49/hr" with badge "Spot" (green badge)
- Elapsed Time: "Elapsed: 6h 23m" with timer icon
- Timer updates every second (client-side)

**Projection Display (FR7.1.2 Simplified):**
- Divider line separating from current cost section
- Section label: "Projection" (smaller, gray)
- Projected Final: "Final cost: $47.32" (bold)
- Confidence: "±15% confidence" (gray text)
- Completion ETA: "Completes in 8h 12m" 
- Completion Time: "Today at 11:45 PM" (formatted based on proximity)

**Budget Status Indicator:**
- When within budget: ✓ "Within budget" (green text with checkmark)
- When over budget: ❌ "Exceeds budget by $5" (red text with X)

**Cost Breakdown (Expandable):**
- Link: "View breakdown ▼" (collapsed by default)
- Expanded section shows:
  - GPU Compute: "$21.00" (6h 23m @ $2.49/hr)
  - Spot Overhead: "$1.18" (2 interruptions)
  - Total: "$22.18" (bold, matches current spend)

**Cancel Job Button:**
- Position: Bottom of card, full width
- Styling: Destructive button (red outline, red text)
- Text: "Cancel Job"
- States: Default, Hover (fills red), Disabled (gray, if job not active)
- Click opens Cancel Confirmation Modal

**Card States:**
- **Loading:** Skeleton shimmer effect on all text areas
- **Green Zone:** Green progress ring, green card border (2px), ✓ icon
- **Yellow Zone:** Yellow progress ring, yellow border, ⚠️ icon, "Approaching estimate" message
- **Red Zone:** Red progress ring, red border (3px), 🚨 icon, "Over budget" message
- **Updating:** Subtle fade animation on number changes

---

#### CANCEL JOB MODAL (Overlay)

**Modal Overlay:**
- Full screen overlay with semi-transparent backdrop (rgba(0,0,0,0.5))
- Modal card centered, 400px width
- White background with shadow, rounded corners

**Modal Content:**
- Header: "Cancel Training?" (bold, 20px)
- Job Name: "Elena Morales Q1 Training" (gray text)
- Current Cost Display: "Current cost: $22.18" (prominent)
- Warning Text: "This action will immediately stop the training job. The final cost will be locked at the current amount."

**Modal Actions:**
- Primary: "Cancel Job" (red destructive button)
- Secondary: "Continue Training" (gray outline button)
- Click outside modal dismisses

**Modal States:**
- Default: Both buttons active
- Submitting: "Cancel Job" button shows spinner, disabled
- Error: Error message appears if cancellation fails

---

### PAGE GROUP 2: Monthly Budget Dashboard
*Location: /dashboard/training-budget*
*Combines: FR7.2.1 (Budget Dashboard), FR7.3.1 (Spot Savings Section), FR7.2.2 (Alert Banners)*

---

#### PAGE HEADER

- Title: "Training Budget" with 💰 icon
- Subtitle: "December 2025" (current budget period)
- Navigation: Accessible via sidebar link "💰 Budget"

---

#### ALERT BANNER AREA (Same as Job Dashboard)

When budget threshold crossed, display same warning/critical banners as Job Dashboard.

---

#### SUMMARY CARDS ROW (4 Cards)

**Card 1: Monthly Spending**
- Large number: "$487.32" (current month total spend)
- Secondary: "of $500.00 limit" (gray text)
- Progress bar below: 97% filled
  - Color: Red if >100%, Yellow if 80-100%, Green if <80%
- Icon: 💰

**Card 2: Remaining Budget**
- Large number: "$12.68" (budget_limit - current_spend)
- Visual progress bar: 2.5% remaining
- Color coding:
  - Red text if negative (overspent)
  - Yellow if <20% remaining
  - Green otherwise
- Warning if negative: "⚠️ Over budget by $X"
- Icon: 💵

**Card 3: Jobs This Month**
- Large number: "12" (total job count)
- Breakdown: "10 completed, 2 active" (smaller text)
- Click card to scroll to job table
- Icon: 📊

**Card 4: Average Cost per Job**
- Large number: "$40.61" (total_spend / total_jobs)
- Comparison to last month: "↓ $5.32 lower" (green) or "↑ $3.21 higher" (red)
- Trend arrow indicator
- Icon: 📈

**Card Layout:**
- 4 cards in horizontal row (desktop)
- 2x2 grid (tablet)
- Single column stack (mobile)
- Each card: White background, border, rounded corners, padding 16px

---

#### SPENDING TREND GRAPH

**Chart Container:**
- Full width below summary cards
- Height: 280px
- White background with subtle border
- Header: "Monthly Spending Trend"

**Chart Type:** Line chart (cumulative spending over time)

**X-Axis:** Days of month (1, 5, 10, 15, 20, 25, 30)
**Y-Axis:** Cumulative cost ($0 - $550 range, extends 10% beyond budget)

**Chart Lines:**
- **Actual Spending (Primary):** Solid blue line with datapoints
  - Points for each day with spending
  - Smooth curve connecting points
- **Budget Limit Line:** Horizontal dashed red line at $500
  - Label: "Budget Limit ($500)"
- **Projected Spending (Forecast):** Dotted gray line
  - Extends from current day to end of month
  - Extrapolates based on current spending rate + active jobs

**Alert Zone Shading:**
- Red transparent shading above $500 (overspend zone)
- Yellow transparent shading from $400-500 (80-100% zone)
- Green transparent shading below $400 (safe zone)

**Interactivity:**
- Hover datapoint shows tooltip: Date, Cumulative spend, Daily spend
- Chart updates every 2 minutes

---

#### PER-JOB BREAKDOWN TABLE

**Table Header:**
- Section title: "Job Breakdown"
- Search input with placeholder: "Search jobs..."
- Sort indicator on Cost column (default: descending)

**Table Columns:**
| Column | Width | Content |
|--------|-------|---------|
| Job Name | 30% | Training job name, clickable link to job dashboard |
| Status | 15% | Badge: "✓ Completed" (green), "🟢 Active" (blue), "❌ Failed" (red) |
| Cost | 15% | Dollar amount "$87.32", color-coded: >$100 red, $50-100 yellow, <$50 green |
| % of Budget | 15% | Percentage "17.4%" with mini progress bar in cell |
| Date | 15% | Completion/start date "Dec 15" |
| Actions | 10% | [View] link |

**Table Features:**
- Default sort: Cost descending (highest cost first)
- Pagination: 10 jobs per page with page numbers
- Row hover highlight
- Click job name navigates to job dashboard

**Table States:**
- Loading: Skeleton rows
- Empty: "No training jobs this month" message
- Error: "Failed to load jobs" with retry button

---

#### SPOT SAVINGS SECTION (FR7.3.1 Simplified)

**Section Container:**
- Collapsible section below job table
- Header: "💰 Spot vs On-Demand Savings" with expand/collapse arrow
- Default state: Collapsed (shows summary only)

**Collapsed View:**
- Single line summary: "Total Savings: $855.86 (69% cheaper than on-demand)"
- Click to expand

**Expanded View:**

**Savings Summary Card:**
- Total Spot Cost: "$387.32" (12 spot jobs)
- Equivalent On-Demand: "$1,243.18" (if all on-demand)
- Total Savings: "$855.86" (large, bold, green text) with "69% cheaper"
- Horizontal bar visual:
  - Blue segment: $387 (actual spot cost)
  - Green segment: $855 (savings)
  - Total bar width = $1,243 (equivalent on-demand)

**Per-Job Comparison Table:**
- Columns: Job Name | GPU Type | Actual Cost | On-Demand Equivalent | Savings | Interruptions
- Example row: "Elena Q1 | Spot | $48.32 | $146.18 | $97.86 (67%) | 2"
- Sort by Savings descending
- Highlight: Jobs with 0 interruptions (green background), >3 interruptions (yellow)

---

#### BUDGET SETTINGS SECTION

**Section Container:**
- Collapsible section at bottom
- Header: "⚙️ Budget Settings" with expand/collapse arrow
- Default state: Collapsed

**Collapsed View:**
- Single line: "Monthly Limit: $500" with [Change] link

**Expanded View:**

**Monthly Budget Limit Setting:**
- Label: "Monthly Budget Limit"
- Current value display: "$500.00"
- [Change Limit] button opens inline editor or modal
- Input: Number field with $ prefix
- Min: $50, Max: $10,000
- Save requires confirmation: "Update budget limit to $750?"
- Success message: "Budget limit updated to $750"

---

#### BUDGET INCREASE MODAL (FR7.2.2 Simplified)

**Trigger:** "Increase Budget" button from alert banners

**Modal Content:**
- Header: "Increase Budget Limit"
- Current Limit: "$500" (display only, not editable)
- New Limit: Input field
  - Default value: Current spend rounded up + 20%
  - Placeholder: "Enter new limit"
  - Validation: Must be > current limit, min = current_spend
- Justification: Textarea
  - Label: "Reason for increase"
  - Placeholder: "Explain why budget increase is needed (required)"
  - Required, minimum 50 characters
  - Character counter below
- Submit Button: "Update Budget Limit" (primary blue)
- Cancel Button: "Cancel" (gray outline)

**Modal States:**
- Default: Form editable
- Validation Error: Red border on invalid fields, error message
- Submitting: Button shows spinner
- Success: Modal closes, success toast "Budget updated to $750"

---

### PAGE GROUP 3: Cost Attribution Report
*Location: /dashboard/cost-attribution*
*Implements: FR7.3.2 (Attribution - Simplified)*

---

#### PAGE HEADER

- Title: "Cost Attribution"
- Export buttons: [Export CSV] (primary), positioned top-right

---

#### FILTERS BAR

- Date Range Dropdown: [Last 30 Days ▼] options: Last 30 Days, Last 90 Days, This Year, All Time
- (Future: Custom date range picker)

---

#### BY CLIENT TABLE

**Table Columns:**
| Column | Width | Content |
|--------|-------|---------|
| Client Name | 30% | Client name, click row to expand |
| Industry | 20% | "Financial Services", "Insurance", etc., or "—" if not specified |
| Jobs | 10% | Job count "5" |
| Total Cost | 15% | Dollar amount "$287.32" |
| Avg Cost/Job | 15% | Average "$57.46" |
| Actions | 10% | [▼ Expand] arrow |

**Table Rows:**
- Include "Unassigned" row for jobs without client attribution
- Summary row at bottom: "TOTAL | — | 28 | $1,229.16 | —"

**Row Expansion:**
- Click row expands to show jobs for that client (inline, below row)
- Expanded content: Sub-table with Job Name, Status, Cost, Date
- Collapse by clicking again

**Table Features:**
- Sort by Total Cost descending (default)
- Sortable by any column
- Hover highlight on rows

---

### PAGE GROUP 4: Job Creation - Attribution Section
*Location: /training-jobs/new (or within Create Training Job form)*
*Implements: FR7.3.2 (Tagging during job creation)*

---

#### COST ATTRIBUTION SECTION (Optional)

**Section Container:**
- Section header: "Cost Attribution" with "(Optional)" label
- Position: Near bottom of job creation form, before Review & Start button
- Collapse/expand with description: "Assign this training job to a client and project for cost tracking."

**Client Dropdown:**
- Label: "Client"
- Dropdown: Searchable select
- Placeholder: "Select client..."
- Options: List of existing clients from database
- No "Create New" option in POC (use existing clients only)

**Project Dropdown:**
- Label: "Project"
- Dropdown: Searchable select
- Placeholder: "Select project..." (or "Select client first" if no client selected)
- Options: Filtered by selected client
- Disabled until client selected
- No "Create New" option in POC

**Behavior:**
- Both fields optional
- Selection persists if user navigates away and returns
- Saved to job record when job created

---

## Interactions and Flows

### Flow 1: Active Job Cost Monitoring

1. **Page Load:**
   - User opens active training job dashboard (/training-jobs/{id})
   - Cost Tracker sidebar loads with skeleton state
   - Data fetches from API (500ms typical)
   - Sidebar populates with current cost data
   - Progress ring shows percentage of estimate

2. **Continuous Updates:**
   - Every 60 seconds, sidebar refreshes automatically
   - Numbers update with smooth fade animation
   - "Updated X seconds ago" timestamp resets
   - Timer for elapsed time updates every second (client-side)

3. **Threshold Crossed:**
   - When current spend crosses 80% of estimate:
     - Progress ring color transitions to yellow
     - Card border changes to yellow
     - Alert banner slides in at top of page
   - User can dismiss 80% banner
   - At 95%+ threshold, banner persists (cannot dismiss)

4. **View Cost Breakdown:**
   - User clicks "View breakdown ▼"
   - Section expands smoothly (300ms animation)
   - Shows GPU cost, interruption overhead, total
   - Click again to collapse

5. **Cancel Job Decision:**
   - User sees high cost, decides to cancel
   - Clicks "Cancel Job" button
   - Modal appears with job name, current cost, warning
   - User confirms cancellation
   - Job terminates immediately
   - Modal closes, success toast appears
   - Cost tracker shows "Job Cancelled" final state

### Flow 2: Monthly Budget Overview

1. **Dashboard Load:**
   - User navigates to /dashboard/training-budget
   - Page loads with skeleton states
   - Summary cards populate first (fast)
   - Trend graph renders with data
   - Job table loads with pagination

2. **Monitor Spending:**
   - User reviews summary cards for quick status
   - Views spending trend graph to see accumulation
   - Hovers datapoints for daily details
   - Scrolls to job table to see breakdown

3. **View Spot Savings:**
   - User clicks to expand "Spot vs On-Demand Savings" section
   - Savings summary card displays prominently
   - Per-job comparison table shows individual savings
   - User can filter/sort by column

4. **Change Budget Limit:**
   - User expands "Budget Settings" section
   - Clicks "Change Limit"
   - Enters new value, provides justification
   - Submits, receives confirmation
   - Summary cards update with new limit

### Flow 3: Budget Alert Response

1. **Alert Triggered:**
   - Monthly spend crosses 95% threshold
   - Red alert banner appears at top of page (wherever user is)
   - Banner shows current status and action buttons

2. **Increase Budget:**
   - User clicks "Increase Budget" in banner
   - Budget Increase Modal opens
   - User enters new limit (e.g., $750)
   - User provides justification text
   - Submits request
   - Budget updated immediately (no approval flow in POC)
   - Banner disappears or updates to reflect new status

3. **Dismiss Warning:**
   - At 80% threshold (yellow banner)
   - User clicks ✕ to dismiss
   - Banner slides away
   - Remains dismissed for session (reappears on new session if still above threshold)

### Flow 4: Cost Attribution

1. **Tag Job During Creation:**
   - User creates new training job
   - Scrolls to Cost Attribution section
   - Selects client from dropdown
   - Project dropdown enables with filtered options
   - Selects project
   - Completes job creation
   - Job record includes client_id and project_id

2. **View Attribution Report:**
   - User navigates to /dashboard/cost-attribution
   - By Client table displays aggregated costs
   - User clicks client row to expand
   - Expanded view shows individual jobs
   - User can export data as CSV

---

## Visual Feedback

**Selection & Focus States:**
- Dropdown selected: Blue border, filled background
- Button hover: Slight background darkening
- Button focus: Blue outline (2px)
- Table row hover: Light gray background

**Cost Updates:**
- Number transitions: Smooth fade (300ms) when values change
- Progress ring: Animates smoothly as percentage changes
- New value briefly highlights (subtle pulse)

**Threshold Transitions:**
- Card border color transitions smoothly (no jarring change)
- Progress ring color transitions with border
- Icon changes when entering new zone (✓ → ⚠️ → 🚨)

**Loading States:**
- Skeleton loaders: Gray pulsing rectangles for text
- Shimmer effect for cards and charts
- Never blocks user from interacting with loaded content

**Success Indicators:**
- Toast notifications slide in from top-right
- Green background for success
- Auto-dismiss after 5 seconds
- Manual dismiss via ✕ button

**Error States:**
- Red border on invalid form fields
- Error message below field in red text
- Toast notification for API errors
- Retry button where applicable

---

## Accessibility Guidance

**Keyboard Navigation:**
- All interactive elements focusable via Tab
- Enter/Space to activate buttons and links
- Escape to close modals and dismiss alerts
- Arrow keys to navigate dropdown options
- Focus trap in modals (Tab cycles within modal only)

**Screen Reader Support:**
- Cost amounts announced clearly: "Current cost: twenty-two dollars and eighteen cents"
- Progress percentage announced: "forty-nine percent of estimated cost"
- Alert banners have role="alert" for immediate announcement
- Tables have proper header associations (scope="col")
- Modals have aria-modal="true" and aria-labelledby

**Visual Accessibility:**
- Color not used alone for status:
  - Green zone: Green color + ✓ icon + "On track" text
  - Yellow zone: Yellow color + ⚠️ icon + "Approaching estimate" text
  - Red zone: Red color + 🚨 icon + "Over budget" text
- Minimum 4.5:1 contrast ratio for all text
- Focus indicators visible (2px blue outline)
- Interactive elements minimum 44×44px touch target

**Motion:**
- Respects prefers-reduced-motion
- Animations can be disabled
- No auto-playing animations that distract

---

## Information Architecture

### Cost Tracker Sidebar Hierarchy

**Primary Level (Always Visible):**
1. Current Spend (largest, most prominent)
2. Progress indicator (visual ring + percentage)
3. Estimated cost range
4. Budget status indicator

**Secondary Level (Visible):**
5. Hourly rate with GPU type badge
6. Elapsed time (updates continuously)
7. Projected final cost
8. Completion ETA

**Tertiary Level (On Demand):**
9. Cost breakdown (expandable)
10. Cancel Job button (always visible but tertiary importance)

### Budget Dashboard Hierarchy

**Primary Level:**
1. Summary Cards (spending, remaining, jobs, average)
2. Alert Banner (if applicable)

**Secondary Level:**
3. Spending Trend Graph
4. Per-Job Table

**Tertiary Level:**
5. Spot Savings Section (collapsed)
6. Budget Settings (collapsed)

### Page Layouts

**Active Job Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Alert Banner - Full Width - Conditional]                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Page Header: Job Name + Status]                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              │                               │
│ MAIN CONTENT (2/3)                           │ COST TRACKER SIDEBAR (1/3)   │
│ - Training Progress                          │ - Current Spend               │
│ - Metrics/Charts                             │ - Projections                 │
│ - Job Details                                │ - Breakdown                   │
│                                              │ - Cancel Button               │
│                                              │                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Budget Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Alert Banner - Full Width - Conditional]                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Page Header: Training Budget + Period]                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Summary Cards Row: Spending | Remaining | Jobs | Average]                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Spending Trend Graph - Full Width]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Per-Job Breakdown Table - Full Width]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Spot Savings Section - Collapsible]                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Budget Settings Section - Collapsible]                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
Page: ActiveJobDashboard
├── AlertBanner (conditional: budget threshold crossed)
├── PageHeader
├── MainContent
│   ├── TrainingProgress
│   ├── MetricsSection
│   └── JobDetails
└── CostTrackerSidebar
    ├── CardHeader (title, timestamp, refresh indicator)
    ├── CurrentSpendDisplay
    │   ├── SpendAmount
    │   ├── ProgressRing
    │   ├── EstimateRange
    │   └── VarianceIndicator
    ├── RateTimeDisplay
    │   ├── HourlyRate + GPUBadge
    │   └── ElapsedTime
    ├── ProjectionDisplay
    │   ├── ProjectedFinal + Confidence
    │   ├── CompletionETA
    │   └── BudgetStatusIndicator
    ├── CostBreakdown (expandable)
    │   ├── GPUCostLine
    │   ├── InterruptionOverheadLine
    │   └── TotalLine
    └── CancelJobButton

Modal: CancelJobModal
├── ModalHeader
├── JobNameDisplay
├── CurrentCostDisplay
├── WarningText
└── ActionButtons
    ├── CancelJobButton (destructive)
    └── ContinueTrainingButton

Page: BudgetDashboard
├── AlertBanner (conditional)
├── PageHeader
├── SummaryCardsRow
│   ├── MonthlySpendingCard
│   ├── RemainingBudgetCard
│   ├── JobsThisMonthCard
│   └── AverageCostCard
├── SpendingTrendGraph
│   ├── ActualSpendingLine
│   ├── BudgetLimitLine
│   ├── ProjectedSpendingLine
│   └── AlertZoneShading
├── PerJobTable
│   ├── TableHeader + Search
│   ├── TableRows (paginated)
│   └── Pagination
├── SpotSavingsSection (collapsible)
│   ├── SavingsSummaryCard
│   └── PerJobComparisonTable
└── BudgetSettingsSection (collapsible)
    └── BudgetLimitControl

Modal: BudgetIncreaseModal
├── ModalHeader
├── CurrentLimitDisplay
├── NewLimitInput
├── JustificationTextarea
└── ActionButtons

Page: CostAttributionReport
├── PageHeader + ExportButton
├── FiltersBar
│   └── DateRangeDropdown
└── ByClientTable
    ├── TableHeader
    ├── ClientRows (expandable)
    │   └── ExpandedJobsList (inline)
    └── SummaryRow

Section: JobCreationAttribution
├── SectionHeader
├── ClientDropdown
└── ProjectDropdown
```

---

## Page Plan

**Total Wireframe Pages: 10**

### Active Job Dashboard Pages (4)

1. **Active Job - Cost Tracking Default (Green Zone)**
   - Purpose: Show normal cost monitoring state during active training
   - Key Elements: Cost tracker sidebar with green progress ring, all metrics visible, breakdown collapsed
   - States: <80% of estimate, within budget, no alerts
   - Annotation Focus: FR7.1.1 AC1-6, FR7.1.2 AC1-3

2. **Active Job - Cost Warning State (Yellow Zone)**
   - Purpose: Show approaching estimate warning
   - Key Elements: Yellow progress ring, yellow border, ⚠️ icon, 80% alert banner at top (dismissable)
   - States: 80-95% of estimate, warning banner visible
   - Annotation Focus: FR7.1.1 AC8-11, FR7.2.2 AC1

3. **Active Job - Cost Critical State (Red Zone)**
   - Purpose: Show over-budget state with persistent alert
   - Key Elements: Red progress ring, red border, 🚨 icon, 95%+ alert banner (persistent), budget exceeded message
   - States: >100% of estimate, critical alert, cancellation suggested
   - Annotation Focus: FR7.1.1 AC10, AC13-14, FR7.2.2 AC2-3

4. **Cancel Job Modal**
   - Purpose: Confirm job cancellation with cost awareness
   - Key Elements: Modal overlay, job name, current cost display, warning, Cancel/Continue buttons
   - States: Default, Submitting (spinner), Error
   - Annotation Focus: FR7.1.1 AC14

### Budget Dashboard Pages (3)

5. **Budget Dashboard - Default View**
   - Purpose: Main budget overview with all key information
   - Key Elements: Summary cards (all 4), spending trend graph, per-job table, collapsed sections
   - States: Within budget (<80%), no alerts, normal operation
   - Annotation Focus: FR7.2.1 AC1-4, FR7.3.1 summary

6. **Budget Dashboard - Over Budget State**
   - Purpose: Show critical budget situation
   - Key Elements: Red alert banner, summary cards showing overspend, trend graph showing overspend zone, recommendations
   - States: >100% budget used, critical alert banner, recommendations displayed
   - Annotation Focus: FR7.2.1 AC5-6, FR7.2.2 AC3

7. **Budget Increase Modal**
   - Purpose: Allow quick budget limit increase
   - Key Elements: Current limit display, new limit input, justification textarea, submit/cancel buttons
   - States: Default, Validation error, Submitting, Success
   - Annotation Focus: FR7.2.2 AC4-5

### Cost Attribution Pages (2)

8. **Cost Attribution - By Client View**
   - Purpose: Show aggregated costs by client
   - Key Elements: Date filter, client table with columns, summary row, export button
   - States: Default view with data populated
   - Annotation Focus: FR7.3.2 AC1-3

9. **Cost Attribution - Client Expanded**
   - Purpose: Show jobs for a specific client (inline expansion)
   - Key Elements: Same as page 8, but with one client row expanded showing job sub-table
   - States: Expanded state, jobs visible inline
   - Annotation Focus: FR7.3.2 AC3-4

### Job Creation Pages (1)

10. **Job Creation - Attribution Section**
    - Purpose: Show cost attribution tagging during job setup
    - Key Elements: Client dropdown, Project dropdown (filtered), optional section label
    - States: Empty, Client selected, Both selected
    - Annotation Focus: FR7.3.2 AC5-6

---

## Annotations (Mandatory)

Attach notes to UI elements in Figma citing:
1. **Which FR(s)** the element fulfills (e.g., "FR7.1.1 AC3: Current spend display")
2. **Acceptance criteria number** it maps to
3. **State variations** this element has

Include a **"Mapping Table"** frame in Figma with columns:
- **Criterion** (text of acceptance criterion)
- **Source** (FR number)
- **Screen(s)** (which wireframe page numbers)
- **Component(s)** (UI element name)
- **State(s)** (loading, error, success, etc.)
- **Notes** (implementation details, simplifications for POC)

---

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Cost Tracker Card on job dashboard | FR7.1.1 AC1 | 1-3 | CostTrackerSidebar | Default, Warning, Critical | Right sidebar, sticky on desktop |
| Current spend with progress indicator | FR7.1.1 AC3 | 1-3 | CurrentSpendDisplay + ProgressRing | Green/Yellow/Red zones | Large bold text, circular progress |
| Estimated cost range display | FR7.1.1 AC2 | 1-3 | EstimateRangeText | Default | Gray text "$45-55" |
| Hourly rate with GPU type | FR7.1.1 AC4 | 1-3 | HourlyRateDisplay + GPUBadge | Spot, On-Demand variants | Badge indicates pricing tier |
| Elapsed time with timer | FR7.1.1 AC5 | 1-3 | ElapsedTimeDisplay | Ticking (updates every second) | Client-side timer |
| Visual threshold indicators (green <80%) | FR7.1.1 AC8 | 1 | ProgressRing + CardBorder + StatusIcon | Green zone | Multiple visual cues, not color-only |
| Visual threshold indicators (yellow 80-100%) | FR7.1.1 AC9 | 2 | ProgressRing + CardBorder + StatusIcon | Yellow zone | ⚠️ icon, warning message |
| Visual threshold indicators (red >100%) | FR7.1.1 AC10 | 3 | ProgressRing + CardBorder + StatusIcon | Red zone | 🚨 icon, "Over budget" message |
| Warning at 80% threshold | FR7.1.1 AC11 | 2 | AlertBanner (yellow, dismissable) | Visible when triggered | Slides in at top of page |
| Warning at 95%+ threshold | FR7.2.2 AC2 | 3 | AlertBanner (red, persistent) | Cannot dismiss | Action buttons required |
| Cancel Job button | FR7.1.1 AC14 | 1-3 | CancelJobButton | Default, Hover, Disabled | Red outline destructive styling |
| Cost breakdown expandable | FR7.1.1 AC15-18 | 1-3 | CostBreakdown (expandable) | Collapsed, Expanded | Simplified: GPU + overhead only |
| Projected final cost with confidence | FR7.1.2 AC1 | 1-3 | ProjectedFinalCost + ConfidenceText | Default | Simplified: single projection, ±15% |
| Expected completion time | FR7.1.2 AC2 | 1-3 | CompletionETADisplay | Default | Formatted by proximity |
| Budget status indicator | FR7.1.2 AC3 | 1-3 | BudgetStatusIndicator | Within budget, Over budget | ✓ green or ❌ red |
| Summary cards (spending, remaining, jobs, avg) | FR7.2.1 AC1-4 | 5-6 | SummaryCardsRow (4 cards) | Default | Color-coded by status |
| Spending trend graph | FR7.2.1 AC5 | 5-6 | SpendingTrendGraph | Default, Over budget | Line chart with limit line |
| Per-job breakdown table | FR7.2.1 AC6 | 5-6 | PerJobTable | Default | Sortable, paginated |
| Budget limit setting | FR7.2.1 AC7 | 5-6 | BudgetSettingsSection | Collapsed, Expanded | Simplified controls only |
| Budget increase workflow | FR7.2.2 AC4 | 7 | BudgetIncreaseModal | Default, Submitting, Success | Justification required |
| Spot savings summary | FR7.3.1 AC1 | 5-6 | SpotSavingsSection | Collapsed, Expanded | Dollar amount and percentage |
| Per-job spot comparison | FR7.3.1 AC2 | 5-6 | PerJobComparisonTable (in section) | Expanded | Basic columns only |
| Cost attribution by client | FR7.3.2 AC1-4 | 8-9 | ByClientTable | Default, Row expanded | Aggregated with expandable rows |
| Client/project tagging | FR7.3.2 AC5-6 | 10 | ClientDropdown + ProjectDropdown | Empty, Selected | Existing clients only (no create) |

---

## Non-UI Acceptance Criteria

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Cost calculation: (elapsed × rate) + overhead | Backend determines displayed costs | UI displays calculated results, shows breakdown |
| Update frequency: 60 seconds polling | Network communication pattern | "Updated X seconds ago" shows recency |
| Budget validation: remaining = limit - spent | Backend calculation | Remaining card shows calculated value |
| Job record with client_id, project_id | Database storage | Tags displayed on job details page |
| Threshold alert triggers (80%, 95%, 100%) | Backend monitoring | Banners appear when thresholds crossed |
| Spot/on-demand cost comparison | Backend calculation | Savings section shows computed values |

---

## POC Simplifications Applied

**Removed from original FRs:**
- ❌ Three-scenario projection analysis (best/expected/worst case)
- ❌ Projection timeline and cost trajectory charts
- ❌ Historical accuracy tracking by preset/GPU
- ❌ Multi-channel notifications (email, Slack, SMS)
- ❌ Approval workflow for budget increases
- ❌ Audit log for budget changes
- ❌ 6-month historical comparison
- ❌ Budget period type selection
- ❌ Alert threshold configuration
- ❌ Job blocking toggle
- ❌ Interruption impact analysis
- ❌ ROI projections and strategic recommendations
- ❌ Project profitability calculations
- ❌ Pricing insights dashboard
- ❌ Budget allocation by client priority
- ❌ Create New Client/Project forms

**Simplified:**
- 🔽 Cost breakdown: Only GPU + overhead (removed per-phase breakdown)
- 🔽 Projections: Single expected value (removed scenario analysis)
- 🔽 Budget settings: Only limit change (removed period, thresholds, blocking)
- 🔽 Spot analysis: Summary + basic table (removed histogram, ROI)
- 🔽 Attribution: By Client only (removed By Project, profitability)

---

## Success Criteria

A user should be able to:
1. ✅ Monitor active training job costs in real-time with 60-second updates
2. ✅ See projected final cost and completion time
3. ✅ Receive visual warnings when approaching or exceeding budget
4. ✅ Cancel a job that's over budget with one-click access
5. ✅ View monthly budget summary with spending trend
6. ✅ See per-job cost breakdown
7. ✅ Increase budget limit when needed
8. ✅ View spot instance savings comparison
9. ✅ Tag training jobs with client for cost attribution
10. ✅ View costs aggregated by client

All within a cohesive, integrated workflow that provides cost transparency and proactive budget control.
