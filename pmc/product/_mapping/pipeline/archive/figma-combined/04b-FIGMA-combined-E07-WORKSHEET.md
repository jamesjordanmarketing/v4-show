# E07 — Combined Wireframe Analysis Worksheet
**Generated:** 2025-12-19  
**Stage:** Stage 7 — Cost Management & Budget Control  
**Product:** LoRA Pipeline  
**Section ID:** E07

---

## PHASE 1: Deep Analysis

### Individual FR Catalog

#### FR7.1.1: Live Cost Accumulation Display
- **Purpose:** Real-time cost tracking for active training jobs with current spend, hourly rates, elapsed time, and projected final costs
- **Core Functionality:** 
  - Live cost tracking updating every 60 seconds
  - Visual threshold indicators (green <80%, yellow 80-100%, red >100%)
  - Immediate cancellation access
  - Itemized cost breakdowns
- **UI Components:**
  - Cost Tracker Card (350px × 280px, top-right position, sticky)
  - Current Spend Display (large bold text + circular progress ring)
  - Estimated Cost Range Text
  - Hourly Rate with GPU Type Badge
  - Elapsed Time Display with timer
  - Projected Final Cost with confidence indicator
  - Threshold Warning Banners (80%, 100%, 120%)
  - Cancel Job Button (destructive styling)
  - Cost Breakdown Expandable Section (GPU compute, interruptions, storage)
  - Historical Cost Mini-Chart
  - On-Demand Comparison Section
- **UI States:** 
  - Loading (skeleton), Green Zone (<80%), Yellow Zone (80-100%), Red Zone (>100%)
  - Breakdown Collapsed/Expanded, Updating, Error, Connection Lost
- **User Interactions:** 
  - View real-time updates (auto), Expand cost breakdown, Cancel job, Dismiss 80% alert
- **Page Count:** 3 pages (dashboard with green zone, dashboard with red zone + breakdown expanded, cancel modal)
- **Dependencies:** None (standalone component on job dashboard)

---

#### FR7.1.2: Cost vs Time Remaining Projection
- **Purpose:** Intelligent cost and time projection using historical step completion rates
- **Core Functionality:**
  - Calculate remaining time based on actual training speed
  - Project final costs with confidence intervals (±15%)
  - Provide scenario analysis (best/expected/worst case)
  - Decision support recommendations when exceeding thresholds
  - Historical accuracy tracking
- **UI Components:**
  - Projection Display Panel (positioned below Cost Tracker Card)
  - Time Remaining Display ("8.2 hours", formatted)
  - Final Cost Projection ("$47.32 ±15%")
  - Expected Completion Time ("Today at 11:45 PM PST")
  - Scenario Analysis Cards (3 columns: Best Case 20%, Expected Case 60%, Worst Case 20%)
  - Scenario Visual Bar (horizontal range from best to worst)
  - Decision Support Recommendations Panel (context-aware messages + action buttons)
  - Historical Accuracy Section (expandable)
  - Visual Projection Timeline (past/present/future)
  - Cost Trajectory Chart (line graph with confidence band)
  - Projection Sensitivity Analysis (expandable)
  - Export Projections Button
  - "Why this projection?" Explanation Panel
- **UI States:**
  - On Track (green), Slightly Over (yellow), Significantly Over (red)
  - Scenarios Collapsed/Expanded, Methodology Expanded
- **User Interactions:**
  - View scenarios, Expand methodology explanation, Export data, Take action on recommendations
- **Page Count:** 4 pages
- **Dependencies:** FR7.1.1 (uses current cost data as input)

---

#### FR7.2.1: Monthly Budget Dashboard
- **Purpose:** Comprehensive monthly budget overview at /dashboard/training-budget
- **Core Functionality:**
  - Summary cards (spending, remaining, jobs, averages)
  - Spending trend graph with projections
  - Per-job breakdown table
  - Budget controls configuration
  - Historical comparison
- **UI Components:**
  - Page Navigation Link (💰 Budget in sidebar)
  - Summary Cards Row (4 cards):
    - Monthly Spending Card ($487.32 / $500.00, 97% progress bar)
    - Remaining Budget Card ($12.68, color-coded)
    - Jobs This Month Card (12 total, breakdown)
    - Average Cost per Job Card ($40.61, trend indicator)
  - Spending Trend Graph (line chart, cumulative spending):
    - Primary line (actual spending, solid blue)
    - Budget limit line (horizontal dashed red at $500)
    - Projected spending line (dotted gray)
    - Alert zone shading (red/yellow/green)
  - Per-Job Breakdown Table:
    - Columns: Job Name, Status, Cost, % of Budget, Created By, Date, Actions
    - Color-coded costs, pagination (25/page), search/filter
  - Budget vs Forecast Panel:
    - Current status, active jobs impact, month-end forecast, recommendations
  - Budget Controls Section (expandable):
    - Monthly Budget Limit input
    - Budget Period Type (Calendar Month / Rolling 30 Days)
    - Budget Alert Thresholds (80%, 95%, 100%, 110%)
    - Job Blocking Toggle
  - Historical Comparison Section:
    - 6-Month Trend Bar Chart
    - Trend Analysis Text
    - Growth Projections
    - Export Historical Data Button
- **UI States:**
  - Default View, Over Budget State (red warnings), Controls Expanded
- **User Interactions:**
  - View summary cards, Explore trend graph, Filter job table, Configure budget controls, Export data
- **Page Count:** 3 pages
- **Dependencies:** FR7.1.1 data feeds into budget calculations

---

#### FR7.2.2: Budget Alerts & Notifications
- **Purpose:** Comprehensive budget alert system with multi-channel delivery
- **Core Functionality:**
  - Threshold-based triggers (80%, 95%, 100%)
  - Multi-channel delivery (email, Slack, in-app banners)
  - Budget increase workflow with justification and approval
  - Complete audit logging
- **UI Components:**
  - In-App Banner Notifications:
    - 80% Alert (yellow, dismissable)
    - 95% Alert (orange, with action buttons)
    - 100% Alert (red, persistent, cannot dismiss)
  - Email Alert Templates (reference, not UI)
  - Slack Alert Integration (reference, not UI)
  - Budget Increase Workflow Modal:
    - Current limit (display only)
    - New limit (input, min = current_spend)
    - Justification (textarea, required, min 50 chars)
    - Approval required checkbox (auto-checked if >20% increase)
    - Approver dropdown (if approval needed)
  - Budget Override Audit Log Page (/dashboard/budget/audit-log):
    - Table: Date, Changed By, Old Limit, New Limit, Change %, Justification, Approver
    - Sort, filter, export CSV
  - Alert Configuration Page (/dashboard/settings/budget-notifications):
    - Per-threshold recipient configuration
    - Notification methods (Email, Slack, SMS)
    - Channel preferences, quiet hours
- **UI States:**
  - No Alert, 80% Warning (yellow), 95% High (orange), 100% Critical (red)
  - Budget Increase Modal Open, Approval Pending
- **User Interactions:**
  - View alerts, Dismiss 80% alert, Request budget increase, Configure notifications, View audit log
- **Page Count:** 4 pages
- **Dependencies:** FR7.2.1 (budget dashboard triggers alerts)

---

#### FR7.3.1: Spot vs On-Demand Cost Analysis
- **Purpose:** Cost analysis reporting spot savings, interruption impact, and ROI
- **Core Functionality:**
  - Total spot savings calculation
  - Per-job cost comparison
  - Interruption impact analysis
  - ROI projections
  - Strategic recommendations
- **UI Components:**
  - Cost Optimization Report Section (expandable panel on budget dashboard):
    - Section Header ("💰 Cost Optimization: Spot vs On-Demand")
    - Date Range Filter
  - Spot Instance Savings Summary Card:
    - Total Spot Cost ($387.32)
    - Equivalent On-Demand Cost ($1,243.18)
    - Total Savings ($855.86, 69% cheaper) - large, bold, green
    - Horizontal stacked bar chart (spot vs savings)
  - Per-Job Cost Comparison Table:
    - Columns: Job Name, GPU Type, Actual Cost, On-Demand Equivalent, Savings, Interruptions, Status
    - Sort by savings descending
    - Highlight 0 interruptions (green), >3 (yellow)
  - Interruption Impact Analysis Section:
    - Total Interruptions (23 across 12 jobs)
    - Average (1.9 per job)
    - Distribution Histogram
    - Recovery Overhead Cost ($28.42)
    - Net Savings After Overhead ($827.44)
  - ROI Calculation Panel:
    - Monthly Savings ($855.86)
    - Annualized Projection ($10,270)
    - Cumulative Savings Chart
  - Strategic Recommendations Section:
    - Current Strategy Summary (85% spot, 15% on-demand)
    - Context-aware recommendations
  - Export Report Button (PDF)
- **UI States:**
  - Section Collapsed/Expanded, Interruption Analysis View, ROI View
- **User Interactions:**
  - Expand sections, Filter by date, View details, Export report
- **Page Count:** 3 pages
- **Dependencies:** FR7.2.1 (integrated into budget dashboard)

---

#### FR7.3.2: Cost Attribution by Client/Project
- **Purpose:** Cost attribution for client billing, profitability analysis, and pricing
- **Core Functionality:**
  - Client and project tagging during job creation
  - Attribution reports by client and project
  - Project profitability calculations
  - Pricing insights
  - Budget allocation by priority tiers
- **UI Components:**
  - Client/Project Tagging (Job Creation Form):
    - Cost Attribution Section (optional)
    - Client Assignment Dropdown (existing + "➕ Create New Client")
    - Project Assignment Dropdown (filtered by client + "➕ Create New Project")
    - New Client Form (name, code, industry, priority tier)
    - New Project Form (name, client, code, dates, projected revenue)
  - Cost Attribution Report Page (/dashboard/cost-attribution):
    - Dual View Tabs ("By Client" | "By Project")
    - Date Range Filter
    - Export Button (CSV/PDF)
  - By Client View Table:
    - Columns: Client Name, Industry, Jobs, Total Cost, Avg Cost/Job, Date Range, Actions
    - Summary row with totals
    - Click row expands to show jobs
  - By Project View Table:
    - Columns: Project Name, Client, Status, Jobs, Total Cost, Revenue, Profit, Margin %
    - Color-coded margins (>70% green, 40-70% yellow, <40% red)
  - Project Profitability Display:
    - Training Cost (auto-calculated)
    - Other Costs (user input)
    - Revenue (user input)
    - Profit and Margin % (calculated)
  - Pricing Insights Dashboard Section:
    - Average Training Cost
    - Cost-to-Revenue Ratios
    - Recommended Pricing Bands
    - Current Margins
  - Budget Allocation by Client Priority:
    - Priority Tiers Table (A: $200, B: $150, C: $100)
    - Allocation Dashboard
    - Allocation Alerts
  - Client Detail Page (/dashboard/clients/{id})
  - Export Cost Attribution Data (CSV/PDF)
- **UI States:**
  - By Client View, By Project View, Client Detail, Project Detail
- **User Interactions:**
  - Tag jobs with client/project, View attribution reports, Calculate profitability, Export data
- **Page Count:** 4 pages
- **Dependencies:** FR7.2.1 (integrates with budget dashboard)

---

### FR Relationships & Integration Points

#### Sequential Flow (User Journey)
```
Active Training Job View:
FR7.1.1 (Live Cost Tracking) → FR7.1.2 (Projections) → FR7.2.2 (Budget Alerts when thresholds crossed)

Budget Management Flow:
FR7.2.1 (Budget Dashboard) ← FR7.3.1 (Cost Analysis) + FR7.3.2 (Cost Attribution)

Job Creation Flow:
FR7.3.2 (Client/Project Tagging) → Job runs → FR7.1.1/FR7.1.2 (Monitoring)
```

#### Page Location Groups
- **Group 1: Active Job Dashboard (/training-jobs/{id})**
  - FR7.1.1: Cost Tracker Card
  - FR7.1.2: Projection Panel
  - FR7.2.2: Alert banners (when triggered)

- **Group 2: Budget Dashboard (/dashboard/training-budget)**
  - FR7.2.1: Main page (summary, trend, table, controls, history)
  - FR7.3.1: Cost Optimization section (expandable)
  - FR7.2.2: Alert banners (when triggered)

- **Group 3: Attribution (/dashboard/cost-attribution)**
  - FR7.3.2: By Client and By Project views

- **Group 4: Job Creation (Create Training Job form)**
  - FR7.3.2: Client/Project tagging section

- **Group 5: Settings (/dashboard/settings/budget-notifications)**
  - FR7.2.2: Alert configuration

- **Group 6: Audit Log (/dashboard/budget/audit-log)**
  - FR7.2.2: Budget change history

- **Group 7: Client Detail (/dashboard/clients/{id})**
  - FR7.3.2: Client-specific cost view

#### State Dependencies (One Affects Another)
- FR7.1.1 cost updates → triggers FR7.1.2 projection recalculation
- FR7.1.1/7.1.2 costs → triggers FR7.2.2 budget threshold alerts
- FR7.1.1 cost data → aggregates into FR7.2.1 monthly totals
- FR7.1.1 spot/on-demand data → feeds FR7.3.1 cost analysis
- FR7.3.2 client/project tags → enables FR7.3.2 attribution reporting

#### UI Component Sharing
- Cost data from FR7.1.1 is reused in FR7.1.2, FR7.2.1, FR7.3.1
- Budget threshold alerts (FR7.2.2 banners) appear on multiple pages
- Job table appears in FR7.2.1, FR7.3.1, FR7.3.2 with different columns

---

### Overlaps & Duplications to Consolidate

#### 1. Cost Display Duplication
- **FR7.1.1** has Cost Tracker Card with current spend, rate, elapsed time
- **FR7.1.2** has Projection Panel referencing current spend
- **FR7.2.1** has Monthly Spending Card with cumulative spend
- **CONSOLIDATION:** FR7.1.1 owns live job cost; FR7.2.1 owns monthly aggregation; FR7.1.2 references FR7.1.1 data

#### 2. Budget Alert Banners
- **FR7.2.1** mentions budget exceeded warnings in forecast panel
- **FR7.2.2** has comprehensive alert system with in-app banners
- **CONSOLIDATION:** FR7.2.2 owns all alert logic; banners displayed on both job dashboard and budget dashboard

#### 3. Cost Breakdown/Analysis
- **FR7.1.1** has detailed cost breakdown (GPU, interruptions, storage)
- **FR7.3.1** has interruption impact analysis and savings breakdown
- **CONSOLIDATION:** FR7.1.1 shows per-job breakdown; FR7.3.1 shows aggregate analysis

#### 4. Job Tables
- **FR7.2.1** has per-job breakdown table (name, status, cost, % budget)
- **FR7.3.1** has per-job cost comparison table (spot vs on-demand, savings)
- **FR7.3.2** has attribution tables (jobs by client/project)
- **CONSOLIDATION:** Use consistent table design; columns vary by context

#### 5. Export Functionality
- **FR7.2.1** exports historical data CSV
- **FR7.3.1** exports cost optimization report PDF
- **FR7.3.2** exports attribution data CSV/PDF
- **CONSOLIDATION:** Standardize export button placement and styling

---

### POC Simplification Opportunities

#### Features to KEEP (Essential for POC)

**Active Job Monitoring (FR7.1.1 + FR7.1.2 combined):**
1. ✅ Cost Tracker Card with current spend, hourly rate, elapsed time
2. ✅ Progress indicator with color zones (green/yellow/red)
3. ✅ Projected final cost with completion time
4. ✅ Threshold warning alerts (80%, 100%)
5. ✅ Cancel Job button with confirmation modal
6. ✅ Simple cost breakdown (GPU cost only)

**Budget Dashboard (FR7.2.1 simplified):**
1. ✅ Summary cards (spending, remaining, job count, average)
2. ✅ Spending trend graph with budget limit line
3. ✅ Per-job table (basic columns)
4. ✅ Budget limit setting control

**Budget Alerts (FR7.2.2 simplified):**
1. ✅ In-app banner notifications at 80%, 95%, 100%
2. ✅ Basic budget increase workflow (justification required)

**Cost Analysis (FR7.3.1 simplified):**
1. ✅ Spot savings summary (total spot cost, equivalent on-demand, savings)
2. ✅ Per-job comparison table (basic)

**Cost Attribution (FR7.3.2 simplified):**
1. ✅ Client/project tagging dropdowns in job creation
2. ✅ By Client view (basic table)

---

#### Features to SIMPLIFY (Reduce Complexity)

1. 🔽 **FR7.1.1 Cost Breakdown:**
   - REMOVE: Detailed breakdown by training phase (model loading, preprocessing)
   - KEEP: Simple total calculation (GPU compute + interruption overhead)

2. 🔽 **FR7.1.2 Scenario Analysis:**
   - REMOVE: Three-scenario display with probability percentages
   - KEEP: Single expected projection with ±15% confidence

3. 🔽 **FR7.1.2 Decision Support:**
   - REMOVE: Complex recommendation algorithms
   - KEEP: Simple "On track" / "Over budget" status with one suggestion

4. 🔽 **FR7.2.1 Budget Dashboard:**
   - REMOVE: Historical comparison (6-month chart), growth projections
   - KEEP: Current month summary cards and trend graph

5. 🔽 **FR7.2.2 Alert System:**
   - REMOVE: Multi-channel delivery (email templates, Slack), audit log page
   - KEEP: In-app banners and basic budget increase modal

6. 🔽 **FR7.3.1 Cost Analysis:**
   - REMOVE: ROI projections, strategic recommendations, interruption histogram
   - KEEP: Savings summary card and basic per-job table

7. 🔽 **FR7.3.2 Attribution:**
   - REMOVE: Profitability calculations, pricing insights, budget allocation by priority
   - KEEP: Client/project tagging and basic attribution report

---

#### Features to REMOVE (Nice-to-Have)

**FR7.1.1:**
- ❌ Historical cost tracking mini-chart
- ❌ On-demand comparison section
- ❌ 120% threshold alert (keep 100% as max)
- ❌ Mobile-specific responsive layouts (use responsive defaults)

**FR7.1.2:**
- ❌ Best/Expected/Worst case scenario analysis with probabilities
- ❌ Projection sensitivity analysis ("What if?" section)
- ❌ Visual projection timeline with epoch markers
- ❌ Cost trajectory chart with confidence bands
- ❌ Historical accuracy tracking by preset/GPU
- ❌ Export projections button
- ❌ "Why this projection?" explanation panel

**FR7.2.1:**
- ❌ 6-month historical comparison chart
- ❌ Growth projections text
- ❌ Budget period type toggle (Calendar Month / Rolling 30 Days)
- ❌ Alert threshold checkbox configuration (80%, 95%, 100%, 110%)
- ❌ Job blocking toggle
- ❌ Benchmark comparisons (vs team average)

**FR7.2.2:**
- ❌ Email alert templates
- ❌ Slack integration with mentions
- ❌ SMS alerts (enterprise)
- ❌ Approval workflow for budget increases
- ❌ Budget override audit log page
- ❌ Alert configuration page with recipient management
- ❌ Daily digest option
- ❌ Emergency override capability

**FR7.3.1:**
- ❌ Interruption impact analysis section
- ❌ Distribution histogram
- ❌ ROI calculation and annualized projections
- ❌ Cumulative savings chart
- ❌ Strategic recommendations section
- ❌ Export PDF report

**FR7.3.2:**
- ❌ Create New Client inline form (use existing clients only)
- ❌ Create New Project inline form (use existing projects only)
- ❌ Project profitability calculation
- ❌ Pricing insights dashboard
- ❌ Budget allocation by client priority
- ❌ Client detail page
- ❌ Project detail page
- ❌ PDF export with charts

---

#### Rationale
- **POC Goal:** Demonstrate core cost management workflow: monitor active job costs → view budget status → receive alerts → basic attribution
- **Essential:** Live cost tracking, budget summary, alert notifications, simple attribution
- **Non-Essential:** Advanced analytics, multi-channel notifications, profitability calculations, enterprise features

---

## PHASE 2: Integration Planning

### Unified UX Flow Design

This stage spans **multiple pages** across different user contexts:

#### Page 1: Active Training Job Dashboard (Monitoring Context)
Combines FR7.1.1 + FR7.1.2 + FR7.2.2 (alerts only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ALERT BANNER AREA (when triggered)                                          │
│ ⚠️ 95% of monthly budget used. $475 of $500. [Increase Budget] [Dismiss]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ HEADER: Training Job - "Elena Morales Q1 Training"     Status: 🟢 Running   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ LEFT SIDE (2/3): Training Progress & Metrics        │ RIGHT SIDEBAR (1/3)   │
│ ┌─────────────────────────────────────────────────┐ │ ┌──────────────────┐ │
│ │ Training Progress: 42% complete                 │ │ │ COST TRACKER    │ │
│ │ Epoch 2 of 3                                    │ │ │ (FR7.1.1)        │ │
│ │ Step 850 of 2,000                               │ │ │                  │ │
│ │ [Progress bar]                                  │ │ │ Current: $22.18  │ │
│ └─────────────────────────────────────────────────┘ │ │ [██████░░░] 49%  │ │
│                                                      │ │ Est: $45-55      │ │
│ ┌─────────────────────────────────────────────────┐ │ │ Rate: $2.49/hr   │ │
│ │ Loss Curve Chart                                │ │ │ Elapsed: 6h 23m  │ │
│ │ [Training metrics visualization]                │ │ │                  │ │
│ └─────────────────────────────────────────────────┘ │ │ ─────────────── │ │
│                                                      │ │ PROJECTIONS     │ │
│ ┌─────────────────────────────────────────────────┐ │ │ (FR7.1.2)        │ │
│ │ Job Details                                     │ │ │                  │ │
│ │ Training File: elena_morales_financial.jsonl   │ │ │ Final: $47.32   │ │
│ │ Preset: Balanced (r=16, epochs=3)               │ │ │ ±15% confidence  │ │
│ │ GPU: Spot H100 @ $2.49/hr                       │ │ │                  │ │
│ │ Client: Acme Financial [if tagged]              │ │ │ ETA: 8h 12m     │ │
│ └─────────────────────────────────────────────────┘ │ │ Today 11:45 PM   │ │
│                                                      │ │                  │ │
│                                                      │ │ ✓ Within budget  │ │
│                                                      │ │                  │ │
│                                                      │ │ [View Breakdown] │ │
│                                                      │ │ [Cancel Job]     │ │
│                                                      │ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Page 2: Monthly Budget Dashboard (Budget Management Context)
Combines FR7.2.1 + FR7.3.1 (as section) + FR7.2.2 (alerts)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ALERT BANNER AREA (when triggered)                                          │
│ 🚨 Monthly budget exceeded. $505 of $500. [Increase Budget] [View Details]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ HEADER: Training Budget Dashboard                    This Month: Dec 2025   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ SUMMARY CARDS ROW                                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ SPENDING    │ │ REMAINING   │ │ JOBS        │ │ AVERAGE     │            │
│ │ $487.32     │ │ $12.68      │ │ 12          │ │ $40.61      │            │
│ │ of $500     │ │ ████░░░░    │ │ 10 done     │ │ per job     │            │
│ │ [█████████░]│ │ 2.5% left   │ │ 2 active    │ │ ↓ $5 vs last│            │
│ │ 97%         │ │             │ │             │ │ month       │            │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                              │
│ SPENDING TREND GRAPH                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ $500 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ [Budget Limit] ─ ─ ─ ─ ─ ─ ─ ─ ─  │ │
│ │      ╱                                                                   │ │
│ │    ╱                                                                     │ │
│ │  ╱      Actual Spending (solid)                                          │ │
│ │ ╱                                             ...... Projected (dotted)  │ │
│ │──────────────────────────────────────────────────────────────────────── │ │
│ │ 1  5  10  15  20  25  30  (Days of Month)                               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ PER-JOB BREAKDOWN TABLE                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Job Name              │ Status    │ Cost    │ % Budget │ Date          │ │
│ │───────────────────────┼───────────┼─────────┼──────────┼──────────────│ │
│ │ Elena Q1 Training     │ ✓ Done    │ $87.32  │ 17.4%    │ Dec 15        │ │
│ │ Test Aggressive       │ 🟢 Active │ $23.15  │ 4.6%     │ Dec 18        │ │
│ │ Client Demo           │ ✓ Done    │ $68.42  │ 13.7%    │ Dec 12        │ │
│ │ ...                   │ ...       │ ...     │ ...      │ ...           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ COST OPTIMIZATION SECTION (FR7.3.1 - Collapsed by default)                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 💰 Spot vs On-Demand Savings   [▼ Expand]                               │ │
│ │ Total Savings: $855.86 (69% cheaper)                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ BUDGET CONTROLS (Expandable)                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚙️ Budget Settings   [▼ Expand]                                         │ │
│ │ Monthly Limit: $500  [Change]                                           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Page 3: Cost Attribution Report (Attribution Context)
FR7.3.2

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Cost Attribution                              [Export CSV] [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ TAB NAVIGATION                                                               │
│ [By Client]  [By Project]                                                    │
│ ════════════════════════                                                     │
│                                                                              │
│ DATE RANGE FILTER                                                            │
│ [Last 30 Days ▼]  [Custom Range]                                            │
│                                                                              │
│ BY CLIENT TABLE                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Client Name       │ Industry    │ Jobs │ Total Cost │ Avg/Job │ Actions │ │
│ │───────────────────┼─────────────┼──────┼────────────┼─────────┼─────────│ │
│ │ Acme Financial    │ Financial   │ 5    │ $287.32    │ $57.46  │ [View]  │ │
│ │ Beta Insurance    │ Insurance   │ 3    │ $142.18    │ $47.39  │ [View]  │ │
│ │ Internal R&D      │ —           │ 8    │ $312.45    │ $39.06  │ [View]  │ │
│ │ Unassigned        │ —           │ 12   │ $487.21    │ $40.60  │ —       │ │
│ │───────────────────┴─────────────┴──────┴────────────┴─────────┴─────────│ │
│ │ TOTAL                            28      $1,229.16                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Page 4: Job Creation - Cost Attribution Section (Job Setup Context)
FR7.3.2 tagging integrated into existing job creation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ... (existing job creation form sections above) ...                          │
│                                                                              │
│ SECTION: Cost Attribution (Optional)                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Assign this training job to a client and project for cost tracking.    │ │
│ │                                                                         │ │
│ │ Client:  [Select client... ▼]                                          │ │
│ │                                                                         │ │
│ │ Project: [Select project... ▼]  (filtered by selected client)          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ... (Review & Start button below) ...                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Component Interaction Map

#### 1. CostTrackerCard (FR7.1.1)
**Data Sources:**
- Real-time from backend API (polls every 60s or WebSocket)
- Current spend, elapsed time, hourly rate, GPU type

**Triggers:**
- Threshold crossed → BudgetAlertBanner.show(threshold)
- Cost update → ProjectionPanel.recalculate()

#### 2. ProjectionPanel (FR7.1.2)
**Data Sources:**
- CostTrackerCard.currentSpend
- Training progress (steps completed / total steps)
- Historical accuracy data

**Computes:**
- remaining_time = (remaining_steps × avg_time_per_step)
- projected_final = current_spend + (remaining_time × hourly_rate)

**Displays:**
- Projected final cost with ±15% confidence
- Expected completion time (formatted by proximity)
- Budget status (within/over)

#### 3. BudgetAlertBanner (FR7.2.2)
**Triggers:**
- When current_spend >= threshold_percentage × budget_limit

**Actions:**
- Opens BudgetIncreaseModal on button click
- Dismissable at 80%, persistent at 95%+

#### 4. BudgetDashboardPage (FR7.2.1)
**Data Sources:**
- Aggregated from all training_jobs this month
- Budget limit from settings

**Components:**
- SummaryCards (4 cards)
- SpendingTrendGraph
- PerJobTable
- CostOptimizationSection (FR7.3.1 embedded)
- BudgetControlsSection

#### 5. CostOptimizationSection (FR7.3.1)
**Data Sources:**
- Completed jobs with GPU type and costs
- On-demand equivalent calculated: spot_hours × on_demand_rate

**Displays:**
- Total savings summary
- Per-job comparison (simplified)

#### 6. CostAttributionReport (FR7.3.2)
**Data Sources:**
- training_jobs with client_id, project_id relationships
- clients and projects tables

**Displays:**
- By Client view (aggregated)
- By Project view (aggregated)

#### 7. JobCreationAttributionSection (FR7.3.2)
**Inputs:**
- Client dropdown (existing clients)
- Project dropdown (filtered by client)

**Outputs:**
- Sets client_id and project_id on new job record

---

## PHASE 3: POC-Optimized Feature Set

### What We're Building (Essential Only)

#### Page Set 1: Active Training Job Dashboard (3 core states)
**Cost Tracker Sidebar (Simplified FR7.1.1 + FR7.1.2 combined):**
- Current spend with progress indicator (color-coded zones)
- Hourly rate and elapsed time
- Projected final cost with completion ETA
- Budget status indicator (✓ Within budget / ⚠️ Over budget)
- Simple cost breakdown (one-click expand, shows GPU cost and interruption overhead only)
- Cancel Job button with confirmation modal

**Alert Banner (FR7.2.2 simplified):**
- Appears at top when budget threshold crossed
- Two variants: 80% warning (yellow, dismissable), 95%+ critical (red, persistent)
- Action button: "Increase Budget" opens simple modal

#### Page Set 2: Monthly Budget Dashboard (2 core states)
**Summary Cards (FR7.2.1 simplified):**
- Monthly Spending with progress bar
- Remaining Budget (color-coded)
- Jobs This Month (count + breakdown)
- Average Cost per Job

**Spending Trend Graph:**
- Simple line chart showing cumulative spending
- Budget limit horizontal line
- Projected to month-end (dotted line)

**Per-Job Table (simplified):**
- Job Name, Status, Cost, % of Budget, Date
- Sort by cost descending
- Basic pagination

**Spot Savings Summary (FR7.3.1 simplified):**
- Collapsed section showing total savings only
- Expand to see per-job table (basic columns)

**Budget Settings (simplified):**
- Monthly limit input with change confirmation
- Remove all other controls (period type, thresholds, blocking)

#### Page Set 3: Cost Attribution Report (1 view)
**By Client Table (FR7.3.2 simplified):**
- Client Name, Jobs, Total Cost, Avg Cost
- Summary row with totals
- Click row to expand and see job list (inline)
- Export CSV button

**Removed:** By Project view, profitability calculations, pricing insights

#### Page Set 4: Job Creation Attribution (1 section)
**Cost Attribution Section:**
- Client dropdown (existing clients only)
- Project dropdown (filtered by client, optional)
- No "Create New" capability (use existing)

---

### What We're NOT Building (Removed for POC)

**Removed from FR7.1.1:**
- ❌ Historical cost tracking mini-chart
- ❌ On-demand comparison section with savings highlight
- ❌ 120% threshold alert
- ❌ Detailed cost breakdown by phase (model loading, preprocessing)
- ❌ Mobile-specific responsive layouts

**Removed from FR7.1.2:**
- ❌ Three-scenario analysis (best/expected/worst)
- ❌ Probability indicators on scenarios
- ❌ Projection sensitivity analysis
- ❌ Visual projection timeline with epoch markers
- ❌ Cost trajectory chart with confidence bands
- ❌ Historical accuracy tracking
- ❌ Export projections functionality
- ❌ "Why this projection?" explanation

**Removed from FR7.2.1:**
- ❌ 6-month historical comparison chart
- ❌ Growth projections
- ❌ Budget period type selection
- ❌ Alert threshold configuration checkboxes
- ❌ Job blocking toggle
- ❌ Benchmark comparisons vs team average

**Removed from FR7.2.2:**
- ❌ Email alert templates
- ❌ Slack integration
- ❌ SMS alerts
- ❌ Approval workflow for budget increases
- ❌ Budget override audit log page
- ❌ Alert configuration page
- ❌ Daily digest
- ❌ Emergency override

**Removed from FR7.3.1:**
- ❌ Interruption impact analysis section
- ❌ Distribution histogram
- ❌ ROI calculations and annualized projections
- ❌ Cumulative savings chart
- ❌ Strategic recommendations
- ❌ PDF export

**Removed from FR7.3.2:**
- ❌ Create New Client inline form
- ❌ Create New Project inline form
- ❌ By Project view with profitability
- ❌ Profitability calculation display
- ❌ Pricing insights dashboard
- ❌ Budget allocation by priority
- ❌ Client detail page
- ❌ Project detail page
- ❌ PDF export with charts

---

## Page Count Optimization

### Original Total: 21 pages across 6 FRs
- FR7.1.1: 3 pages
- FR7.1.2: 4 pages
- FR7.2.1: 3 pages
- FR7.2.2: 4 pages
- FR7.3.1: 3 pages
- FR7.3.2: 4 pages

### Combined & Simplified: 10 pages

**Active Job Dashboard (4 pages):**
1. Job Dashboard - Default State (green zone, cost within budget)
2. Job Dashboard - Warning State (yellow zone, 80-95%)
3. Job Dashboard - Critical State (red zone, over budget)
4. Cancel Job Confirmation Modal

**Budget Dashboard (3 pages):**
5. Budget Dashboard - Default View (summary, trend, table)
6. Budget Dashboard - Over Budget State (alert banner, recommendations)
7. Budget Increase Modal

**Cost Attribution (2 pages):**
8. Cost Attribution - By Client View
9. Cost Attribution - Client Expanded (shows jobs inline)

**Job Creation (1 page):**
10. Job Creation Form - Attribution Section (showing client/project dropdowns)

### Reduction Strategy
- Combined FR7.1.1 + FR7.1.2 into single Cost Tracker sidebar component
- Integrated FR7.3.1 as expandable section in Budget Dashboard
- Removed standalone pages for audit log, configuration, client details
- Simplified FR7.2.2 to just banners and increase modal
- Removed project profitability and pricing views entirely

### Reduction Metrics
- **Original:** 21 pages
- **Combined POC:** 10 pages
- **Reduction:** 52% fewer wireframe pages
