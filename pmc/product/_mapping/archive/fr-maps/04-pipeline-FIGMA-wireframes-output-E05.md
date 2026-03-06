# Stage 5 — Training Comparison & Optimization — Figma Wireframe Prompts

**Generated:** 2025-12-18  
**Section ID:** E05  
**Stage Number:** 5 (Journey Stage: Optimization, Iteration & Knowledge Building)

This file contains self-contained Figma Make AI prompts for generating wireframes for each FR in Stage 5. Each prompt is designed to be copy-pasted directly into Figma Make AI without requiring external file access.

---

=== BEGIN PROMPT FR: FR5.1.1 ===

## Title
FR5.1.1 Wireframes — Stage 5 — Training Comparison & Optimization — Compare Multiple Training Runs

## Context Summary
FR5.1.1 enables AI engineers and technical leads to compare 2-4 training runs side-by-side with overlaid loss curves, metrics comparison tables, and configuration analysis. This feature supports data-driven decision-making by identifying the best training configuration for production use based on quality, cost, and duration metrics. Users can export comparisons as PDF reports and save successful configurations as reusable templates.

## Journey Integration
- **Stage 5 user goals**: Compare training experiments to identify optimal configurations, build team knowledge of successful patterns, optimize cost-to-quality ratios, make data-driven decisions for production deployments
- **Key emotions**: Confidence in optimization decisions, satisfaction from identifying best approaches, pride in data-driven methodology, excitement about continuous improvement
- **Progressive disclosure levels**: 
  * Basic: Simple 2-job comparison with key metrics
  * Advanced: Multi-job comparison (3-4 runs) with detailed configuration analysis
  * Expert: Advanced analytics, outlier identification, preset optimization
- **Persona adaptations**: Unified interface serving technical leads (strategic decisions), AI engineers (configuration optimization), and quality analysts (quality vs cost analysis)

## Journey-Informed Design Elements
- **User Goals**: Identify best training configurations through side-by-side comparison, optimize quality-to-cost ratios, build repeatable success patterns, document winning configurations for team use
- **Emotional Requirements**: Confidence that comparisons are accurate and complete, satisfaction from visual clarity of differences, excitement about discovering optimal patterns, pride in systematic optimization
- **Progressive Disclosure**:
  * Basic: Overlaid loss curves + metrics table + winner recommendation
  * Advanced: Configuration diff view + cost-per-quality analysis + outlier highlighting
  * Expert: Export as PDF report + save as preset template + share with team
- **Success Indicators**: Clear winner identified, configuration templates saved, team reuses proven setups, success rates improve over time

## Wireframe Goals
- Enable multi-select of 2-4 training jobs from job list with clear selection UI
- Display overlaid loss curves for all selected jobs with color-coded distinction and legend
- Present metrics comparison table highlighting best values in each category
- Show side-by-side configuration comparison with differences highlighted
- Provide algorithm-driven "winner recommendation" based on quality, cost, and duration
- Support export as PDF report for documentation and stakeholder sharing
- Enable saving comparison as reusable preset template

## Explicit UI Requirements (from acceptance criteria)

### Job Selection UI
- "Compare Jobs" button on training jobs list page (prominent placement)
- Multi-select mode activation: Checkboxes appear on each job row when compare mode is active
- Select 2-4 jobs constraint: Visual feedback when minimum (2) not met or maximum (4) exceeded
- "Compare Selected" button: Enabled only when 2-4 jobs selected, shows count (e.g., "Compare Selected (3)")
- Clear visual distinction between selectable jobs (completed/failed only) and non-selectable (in-progress/cancelled)

### Comparison View Layout
- Opens in new full-width page or modal overlay (not inline)
- Header showing compared job names with color-coded badges matching chart colors
- Exit/close button to return to job list
- Tabbed or sectioned layout: Overview | Loss Curves | Metrics | Configuration | Actions

### Overlaid Loss Curves Graph
- All selected jobs' training and validation loss curves on same coordinate system
- Color-coded by job: Blue (Job 1), Green (Job 2), Red (Job 3), Orange (Job 4)
- Interactive legend showing job names with colored indicators, click to show/hide curves
- Toggle controls: "Training Loss" | "Validation Loss" | "Both" (checkbox toggles)
- Zoom and pan controls for detailed inspection
- Highlight final loss values with labeled data points
- X-axis: Training step number (0 to max steps across all jobs)
- Y-axis: Loss value (auto-scaled to encompass all curves)
- Tooltip on hover showing exact values: "Job 2 - Step 850: Training Loss 0.342, Validation Loss 0.358"

### Metrics Comparison Table
- Table structure: Rows = Jobs (Job 1, Job 2, Job 3, Job 4)
- Columns: Job Name | Final Training Loss | Final Validation Loss | Perplexity Improvement | Duration (hours) | Cost ($) | GPU Type | Preset
- Best value highlighting: Green background on lowest loss, shortest duration, lowest cost cells
- Percentage difference annotations: "Job 2: 15% lower loss than Job 1" (relative to worst performer)
- Sortable columns: Click column header to sort ascending/descending
- Summary row at bottom showing average/median values across compared jobs

### Configuration Comparison Section
- Side-by-side configuration panels (2-4 columns depending on jobs selected)
- Each panel shows: Job name header, Preset badge, Training file name, GPU type indicator
- Hyperparameters displayed: Rank (r), Learning rate (lr), Epochs, Batch size, Gradient accumulation steps
- Differences highlighted: Yellow background for parameters that differ across jobs
- Visual diff notation: "Job 1: r=16 | Job 2: r=32" with arrow indicating higher value
- Additional settings: Spot vs On-Demand, Checkpoint frequency, Training duration

### Winner Recommendation Panel
- Prominent recommendation card at top of comparison view
- Algorithm-driven identification: "Recommended: Job 2 (Balanced preset) - Best quality/cost ratio"
- Rationale bullets explaining why this job wins:
  * "Lowest validation loss: 0.298 (15% better than Job 1)"
  * "Optimal cost efficiency: $52 for 34% perplexity improvement"
  * "Balanced duration: 13.2 hours (not too slow, not too fast)"
- Visual badge: "⭐ Winner" or "✓ Recommended"
- Action button: "Use This Configuration" (pre-fills new job form with winner's settings)

### Export and Template Actions
- "Export Comparison as PDF" button: Generates downloadable report with all charts and tables
- "Save as Preset Template" button: Opens modal to create reusable configuration template
- "Share Comparison" button: Generates shareable link to comparison view (team visibility)
- Loading states for export actions with progress indicators

### States to Include
- **Empty state**: No jobs selected - show instructional placeholder "Select 2-4 jobs to compare"
- **Loading state**: Comparison data loading - skeleton screens for charts and tables
- **Partial data state**: Some jobs missing validation metrics - display warning and partial comparison
- **Error state**: Comparison failed to load - error message with retry button
- **Success state**: Full comparison displayed with all interactive elements functional

## Interactions and Flows

### Selection Flow
1. User navigates to training jobs list page
2. Clicks "Compare Jobs" button → Multi-select mode activates
3. Checkboxes appear on all completed/failed job rows
4. User clicks checkboxes to select 2-4 jobs (visual counter updates)
5. User clicks "Compare Selected" button → Comparison view opens

### Comparison Analysis Flow
1. Comparison view loads with overlaid loss curves displayed first
2. User toggles training/validation loss visibility using checkboxes
3. User hovers over curves to see exact values in tooltip
4. User scrolls to metrics comparison table to see numerical comparison
5. User clicks column headers to sort by different metrics
6. User reviews configuration comparison to understand what differed
7. User reads winner recommendation panel to see algorithm's choice

### Export Flow
1. User clicks "Export Comparison as PDF" button
2. Loading indicator shows "Generating report..."
3. PDF downloads automatically (filename: `training-comparison-{timestamp}.pdf`)
4. Success toast: "Comparison report exported successfully"

### Template Saving Flow
1. User clicks "Save as Preset Template" on winner job
2. Modal opens with template creation form
3. User enters template name (pre-filled with winner job name)
4. User adds description explaining when to use this template
5. User selects visibility (Private/Team)
6. User adds tags (optional)
7. User clicks "Save Template" → Template created
8. Success toast: "Template saved successfully. View in Template Library."

## Visual Feedback
- Color-coded job indicators throughout comparison (consistent colors across all sections)
- Green highlighting for best values in metrics table (immediate visual clarity)
- Yellow highlighting for configuration differences (draws attention to variables)
- Progress indicators during export/save operations (user confidence)
- Loading skeletons while data fetches (perceived performance)
- Tooltips on hover for detailed data points (progressive disclosure)
- Success toasts for completed actions (confirmation feedback)
- Badge indicators for winner recommendation (visual authority)

## Accessibility Guidance
- All interactive elements keyboard accessible (Tab navigation)
- Color-coding supplemented with text labels (not color-only)
- ARIA labels on charts: "Loss curve comparison chart showing 3 training runs"
- Focus indicators on all interactive elements (visible focus rings)
- Table headers with proper scope attributes for screen readers
- Alt text on graph elements describing trends: "Job 2 shows consistently lower loss than other runs"
- Sufficient color contrast for text on colored backgrounds (WCAG AA minimum)
- Skip link to jump past large comparison table to actions

## Information Architecture

### Primary Layout Groups
1. **Header Section**
   - Job badges (colored, showing job names and presets)
   - Action buttons (Export, Save Template, Share, Close)

2. **Winner Recommendation Card** (top section)
   - Recommendation badge and job name
   - Rationale bullets
   - "Use This Configuration" action button

3. **Loss Curves Section**
   - Interactive chart with legend
   - Toggle controls for training/validation visibility
   - Zoom/pan controls
   - Timestamp of last data fetch

4. **Metrics Comparison Table Section**
   - Sortable data table
   - Column headers with sort indicators
   - Summary row with aggregates

5. **Configuration Comparison Section**
   - Side-by-side configuration panels
   - Difference highlighting
   - Visual diff notation

6. **Footer Actions**
   - Secondary action buttons (Back to Jobs List, Start New Comparison)

## Page Plan

### Page 1: Job Selection (Training Jobs List - Comparison Mode)
**Purpose**: Enable user to select 2-4 completed training jobs for comparison
**Components**: 
- Training jobs list table with checkboxes
- "Compare Jobs" toggle button (activates multi-select mode)
- Job row selection state (checkbox, selected highlight)
- Selection counter badge: "3 jobs selected"
- "Compare Selected" button (sticky bottom bar)
- Validation messages if <2 or >4 jobs selected

### Page 2: Comparison Overview & Loss Curves
**Purpose**: Primary comparison view showing overlaid loss curves and key insights
**Components**:
- Header with job badges (color-coded)
- Winner recommendation card (if algorithm identifies clear winner)
- Overlaid loss curves graph (interactive chart library)
- Legend with show/hide toggles
- Training/Validation loss toggle controls
- Zoom and pan controls
- Export/Save/Share action buttons (top-right)

### Page 3: Detailed Metrics & Configuration Comparison
**Purpose**: Deep dive into numerical metrics and configuration differences
**Components**:
- Metrics comparison table (sortable, highlighting best values)
- Percentage difference annotations
- Configuration comparison panels (side-by-side)
- Hyperparameter diff view with highlighting
- GPU type and cost details
- Additional settings comparison

### Page 4: Template Creation Modal (Overlay)
**Purpose**: Save winning configuration as reusable template
**Components**:
- Template name field (pre-filled)
- Description textarea
- Visibility selector (Private/Team radio buttons)
- Tags input (multi-select)
- Configuration preview (read-only summary)
- "Save Template" and "Cancel" buttons
- Validation errors if name already exists

## Annotations (Mandatory)
**Instruction for Figma Make AI**: Attach text annotations to each UI element citing the specific acceptance criterion it fulfills. Include a separate "Mapping Table" frame in Figma showing:
- Column 1: Acceptance Criterion (ID + short description)
- Column 2: Screen/Page where fulfilled
- Column 3: Component(s) implementing criterion
- Column 4: States shown (default, hover, active, disabled)
- Example row: "US5.1.1-AC3: Overlaid loss curves | Page 2 | Interactive chart component | Default, Hover (tooltip), Zoom active"

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| "Compare Jobs" button on training jobs list page | US5.1.1 | Page 1 | Primary button (top-right of jobs list) | Default, Hover, Active (comparison mode) | Toggles multi-select mode |
| Multi-select mode: Checkboxes appear on each job row | US5.1.1 | Page 1 | Checkbox inputs on each table row | Unchecked, Checked, Disabled (for in-progress jobs) | Only completed/failed jobs selectable |
| Select 2-4 jobs → "Compare Selected" button enabled | US5.1.1 | Page 1 | Sticky bottom action bar with count badge | Disabled (<2 selected), Enabled (2-4), Warning (>4) | Validates selection count |
| Comparison view opens in new page or modal | US5.1.1 | Page 2 | Full-page view or overlay modal | Default (open), Closing animation | Dedicated comparison interface |
| All selected jobs' loss curves on same chart | US5.1.1 | Page 2 | Multi-line chart component | Default, Loading, Interactive (zoom/pan) | Uses charting library (recharts/visx) |
| Color-coded by job (blue, green, red, orange) | US5.1.1 | Page 2 | Chart line colors, legend indicators, job badges | Default | Consistent colors across all sections |
| Legend showing job names | US5.1.1 | Page 2 | Chart legend component | Default, Interactive (show/hide curves) | Click legend item to toggle visibility |
| Toggle training/validation loss visibility | US5.1.1 | Page 2 | Checkbox group controls | Checked (visible), Unchecked (hidden) | Independent toggles for training/validation |
| Zoom and pan controls | US5.1.1 | Page 2 | Chart interaction controls | Default, Active (zooming/panning), Reset button | Standard chart interaction patterns |
| Highlight final loss values | US5.1.1 | Page 2 | Data point markers on chart | Default, Hover (tooltip with exact value) | Labeled endpoints on each curve |
| Metrics Comparison Table with Job rows | US5.1.1 | Page 3 | Data table component | Default, Loading, Sorted (by column) | Rows: Job 1-4 |
| Columns: Final Training Loss, Final Validation Loss, Perplexity, Duration, Cost, GPU Type, Preset | US5.1.1 | Page 3 | Table columns with headers | Default, Sorted (ascending/descending) | All key comparison metrics |
| Highlight best value in each column (green background) | US5.1.1 | Page 3 | Table cell styling | Default, Best value (green bg) | Automatic highlighting of optimal values |
| Percentage differences: "Job 2: 15% lower loss than Job 1" | US5.1.1 | Page 3 | Annotation text in table cells | Default | Relative to worst performer in each metric |
| Configuration Comparison: Side-by-side hyperparameters | US5.1.1 | Page 3 | Multi-column comparison cards | Default | 2-4 columns depending on jobs selected |
| Highlight differences: "Job 1: r=16, Job 2: r=32" | US5.1.1 | Page 3 | Parameter rows with conditional highlighting | Default (matching), Highlighted (different values) | Yellow background for differences |
| Training file, GPU type, spot/on-demand | US5.1.1 | Page 3 | Configuration metadata section | Default | Additional context for each job |
| Winner Recommendation: Algorithm identifies best job | US5.1.1 | Page 2 | Recommendation card component | Default | Based on validation loss, cost efficiency, duration |
| Display: "Recommended: Job 2 (Balanced preset) - Best quality/cost ratio" | US5.1.1 | Page 2 | Recommendation text with rationale bullets | Default | Clear winner declaration |
| Export comparison as PDF report | US5.1.1 | Page 2 | "Export as PDF" button | Default, Hover, Loading (generating), Success | Downloads PDF with all charts and tables |
| Save comparison as preset template | US5.1.1 | Page 4 (modal) | "Save as Template" button opens modal | Default, Hover, Modal open | Template creation workflow |

## Non-UI Acceptance Criteria

These criteria are backend/algorithmic requirements that inform UI design but are not directly UI components:

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Algorithm calculates best job based on: lowest validation loss, cost efficiency, duration | Winner recommendation must be data-driven, not user-selected | Display confidence level or explain scoring: "Job 2 scored 94/100 based on quality (40%), cost (30%), duration (30%)" |
| Comparison view data must include all job metadata, configurations, metrics, loss curves | Backend API must aggregate data from multiple jobs | Show loading state while data fetches; display partial results if some data missing |
| PDF export must include rendered charts, tables, configuration comparison | Backend must generate PDF with chart images | Preview PDF before download (optional); show file size estimate |
| Template save must persist configuration to database with user-defined metadata | Backend template creation endpoint | Validate template name uniqueness; show error if duplicate |

## Estimated Page Count
**4 pages** (exceeds minimum of 3)

**Rationale**:
- Page 1 (Job Selection): Necessary for multi-select interaction pattern and selection validation
- Page 2 (Overview & Loss Curves): Core comparison experience with visual analysis and winner recommendation
- Page 3 (Detailed Metrics & Configuration): Deep dive into numerical comparison and configuration differences for technical users
- Page 4 (Template Creation Modal): Essential workflow for saving winning configurations as reusable templates

Each page serves distinct user goals in the comparison workflow: select → analyze visually → analyze numerically → save for reuse.

=== END PROMPT FR: FR5.1.1 ===

---

=== BEGIN PROMPT FR: FR5.1.2 ===

## Title
FR5.1.2 Wireframes — Stage 5 — Training Comparison & Optimization — Configuration Performance Analytics

## Context Summary
FR5.1.2 provides aggregate analytics showing which training configurations produce the best quality/cost ratios across all training runs. This feature enables technical leads and product managers to optimize default presets, identify common failure patterns, track success rate trends, and analyze GPU utilization patterns. The analytics dashboard surfaces insights from historical data to inform continuous improvement of training practices and preset recommendations.

## Journey Integration
- **Stage 5 user goals**: Identify team-wide patterns in training success, optimize default preset recommendations, reduce failure rates through data-driven insights, improve cost efficiency across all runs
- **Key emotions**: Confidence in team optimization decisions, satisfaction from improving success rates over time, excitement about data-driven continuous improvement, pride in systematic knowledge building
- **Progressive disclosure levels**:
  * Basic: Performance by preset summary table with key metrics
  * Advanced: Cost vs quality scatter plot, success rate trends, common failure patterns
  * Expert: GPU utilization analysis, spot interruption patterns, preset optimization recommendations
- **Persona adaptations**: Technical leads (strategic optimization), Product managers (trend analysis), Budget managers (cost optimization), AI engineers (failure pattern insights)

## Journey-Informed Design Elements
- **User Goals**: Track team training success rates over time, identify optimal preset configurations, reduce common failure modes, optimize GPU utilization and cost efficiency
- **Emotional Requirements**: Confidence that analytics are accurate and representative, satisfaction from seeing improvement trends, excitement about discovering optimization opportunities, trust in data-driven recommendations
- **Progressive Disclosure**:
  * Basic: High-level preset performance summary with success rates and average costs
  * Advanced: Visual analytics (scatter plots, trend lines) showing cost-quality tradeoffs and temporal patterns
  * Expert: Detailed failure analysis, GPU utilization heatmaps, preset optimization suggestions based on historical data
- **Success Indicators**: Success rates improving month-over-month, default presets optimized based on data, failure rates decreasing, cost per successful run decreasing

## Wireframe Goals
- Display accessible "Training Analytics" dashboard from main navigation
- Present performance comparison table by preset (Conservative, Balanced, Aggressive)
- Visualize cost vs quality tradeoff with interactive scatter plot
- Show success rate trends over time with line chart
- Surface common failure patterns with frequency analysis
- Analyze GPU utilization patterns (spot vs on-demand, interruption rates by time)
- Enable CSV export of analytics data for external analysis
- Provide actionable recommendations for preset optimization

## Explicit UI Requirements (from acceptance criteria)

### Navigation Access
- "Training Analytics" menu item in main navigation sidebar
- Icon: Chart/Analytics symbol (📊)
- Badge showing data freshness: "Updated 2 hours ago"
- Accessible to all team members (not admin-only)
- Highlight as active when on analytics page

### Performance by Preset Summary Table
- Table structure with 3 rows (Conservative, Balanced, Aggressive)
- Columns: Preset Name | Average Final Loss | Average Cost | Average Duration | Success Rate | Total Jobs
- Visual preset badges (color-coded): Conservative (green), Balanced (blue), Aggressive (red/orange)
- Best performer highlighting: Green checkmark badge on row with optimal quality/cost/success ratio
- Numerical formatting: Loss (2 decimals), Cost ($XX.XX), Duration (hours:minutes), Success Rate (XX%)
- Example row: "Balanced preset: 96% success rate, $52 avg cost, 0.312 avg final loss"
- Sortable columns (click header to reorder)
- Total summary row showing aggregate metrics across all presets

### Cost vs Quality Scatter Plot
- X-axis: Final validation loss (lower = better quality), range auto-scaled
- Y-axis: Total cost in dollars (lower = cheaper), range auto-scaled
- Each dot represents one completed training job
- Color-coded by preset: Conservative (green), Balanced (blue), Aggressive (red)
- Size-coded by duration: Smaller dots = faster jobs, larger dots = longer jobs
- Ideal zone highlighting: Lower-left quadrant shaded green (low cost, high quality)
- Outlier identification: Dots in upper-right quadrant (high cost, low quality) highlighted with warning icon
- Interactive tooltips on hover: "Job ABC123 | Balanced preset | Loss: 0.298 | Cost: $52 | Duration: 13.2hrs"
- Quadrant labels: "Ideal Zone", "Expensive & Low Quality", "Cheap & Low Quality", "Expensive & High Quality"
- Legend showing preset colors and size scale
- Zoom and filter controls: Filter by date range, specific presets, cost range

### Success Rate Trends Line Chart
- X-axis: Time period (monthly aggregation), last 12 months
- Y-axis: Success rate percentage (0-100%)
- Line showing success rate trend over time
- Data points at each month with hover tooltips showing exact percentage
- Trend line (dotted) showing overall trajectory
- Goal line (horizontal dashed at 98%): "Target success rate"
- Annotations for significant events: "Preset optimization in March → 92% to 95%"
- Color-coded segments: Green (≥95%), Yellow (90-94%), Red (<90%)
- Display improvement metric: "Success rate improved 6% over 12 months (92% → 98%)"

### Common Failure Patterns Section
- Categorized list of failure types with frequency counts
- Table structure: Failure Type | Count | Percentage of All Failures | Most Common Configuration
- Most frequent error types listed first (descending frequency)
- Visual indicators: Error icons for different failure types (OOM: memory icon, timeout: clock icon, GPU: GPU icon)
- Example entries:
  * "Out of Memory (OOM): 45 failures (38% of failures) | Most common: r=64 with batch_size=4"
  * "Spot Interruption Loop: 32 failures (27%) | Most common: Jobs >20 hours on spot instances"
  * "Dataset Format Error: 18 failures (15%) | Most common: Missing required fields in conversations"
- Actionable recommendations for each pattern: "Avoid r=64 with batch_size=4 (85% OOM rate). Use r=32 + batch_size=2 instead."
- Link to error documentation for each failure type

### GPU Utilization Analysis Section
- **Spot vs On-Demand Usage**: Pie chart showing percentage split of total job hours
  * Spot: 85% of job hours (green segment)
  * On-Demand: 15% of job hours (blue segment)
  * Cost savings annotation: "$10,270 saved annually using spot instances"
- **Spot Interruption Rates by Time of Day**: Heat map or bar chart
  * X-axis: Hour of day (24-hour format)
  * Y-axis: Interruption rate percentage
  * Identify peak interruption times: "Highest interruptions 2-4 PM UTC (18% rate)"
  * Recommendation: "Start spot jobs 8 PM - 6 AM UTC for lowest interruption rates (8% avg)"
- **Cost Savings Summary**: Total savings from spot usage vs on-demand equivalent
  * "Total spot cost: $2,348 | Equivalent on-demand cost: $7,544 | Savings: $5,196 (69%)"

### Analytics Export & Actions
- "Export Analytics as CSV" button: Downloads all analytics data as spreadsheet
- Date range selector: "Last 30 days" | "Last 90 days" | "Last 12 months" | "All time" | Custom range
- Refresh button: "Refresh Data" (shows last updated timestamp)
- Filter controls: By preset, by user, by date range, by success/failure status

### States to Include
- **Loading state**: Skeleton screens for charts and tables while data loads
- **Empty state**: "Insufficient data for analytics (minimum 10 completed jobs required)" with progress indicator "5/10 jobs completed"
- **Partial data state**: Some sections have data, others don't - display available sections with notes about missing data
- **Error state**: Analytics failed to load - error message with retry button
- **Success state**: All analytics sections populated with interactive elements functional

## Interactions and Flows

### Navigation Flow
1. User clicks "Training Analytics" in main navigation
2. Analytics dashboard page loads with performance summary table displayed first
3. User scrolls through sections: Preset performance → Cost-quality scatter plot → Success trends → Failure patterns → GPU utilization

### Data Exploration Flow
1. User reviews performance by preset table to identify best-performing preset
2. User clicks on scatter plot dots to see individual job details
3. User identifies outlier jobs (high cost, low quality) and clicks for analysis
4. User reviews failure patterns section to understand common issues
5. User reads recommendations for each failure pattern
6. User exports analytics as CSV for detailed offline analysis

### Optimization Discovery Flow
1. User notices success rate trend improving over time
2. User identifies correlation between preset optimization and success rate increase
3. User reviews failure patterns and sees OOM errors concentrated in Aggressive + large batch size
4. User makes note to update default preset recommendations based on data
5. User shares analytics dashboard with team to align on optimization priorities

### Export Flow
1. User selects date range filter: "Last 90 days"
2. User clicks "Export Analytics as CSV"
3. Loading indicator shows "Generating export..."
4. CSV downloads with filename: `training-analytics-{date-range}-{timestamp}.csv`
5. Success toast: "Analytics exported successfully. 47 jobs included."

## Visual Feedback
- Color-coded presets throughout all sections (consistent visual language)
- Green highlighting for best performers and ideal zones (positive reinforcement)
- Yellow/red highlighting for outliers and failure-prone configurations (warning signals)
- Trend lines and annotations on charts (context and interpretation)
- Loading skeletons for each section during data fetch (perceived performance)
- Tooltips with detailed information on hover (progressive disclosure)
- Success toasts for export actions (confirmation feedback)
- Data freshness indicators (trust and transparency)

## Accessibility Guidance
- All charts have descriptive ARIA labels: "Scatter plot showing cost vs quality for 47 training jobs"
- Keyboard navigation for all interactive elements (Tab, Enter, Arrow keys)
- Color not sole indicator: Presets also distinguished by labels and icons
- Alt text on chart axes and data points for screen readers
- Table headers with proper scope attributes
- Focus indicators visible on all interactive elements
- Sufficient color contrast for all text (WCAG AA minimum)
- Skip links to jump between major sections of analytics dashboard

## Information Architecture

### Primary Layout Groups
1. **Dashboard Header**
   - Page title: "Training Analytics"
   - Date range selector
   - Export and refresh buttons
   - Data freshness indicator

2. **Performance by Preset Section**
   - Section heading with info tooltip explaining metrics
   - Summary table with sortable columns
   - Recommendation card highlighting best preset

3. **Cost vs Quality Visualization Section**
   - Section heading with quadrant explanation
   - Interactive scatter plot
   - Legend and filters
   - Outlier analysis panel

4. **Success Rate Trends Section**
   - Section heading with goal line explanation
   - Line chart showing monthly trends
   - Improvement metric card
   - Event annotations

5. **Common Failure Patterns Section**
   - Section heading with total failure count
   - Failure types table with recommendations
   - Links to error documentation

6. **GPU Utilization Analysis Section**
   - Section heading with cost savings summary
   - Spot vs On-Demand usage pie chart
   - Interruption rate heat map
   - Optimization recommendations

7. **Footer Actions**
   - Secondary export options
   - Link to detailed job history page

## Page Plan

### Page 1: Analytics Dashboard Overview
**Purpose**: Primary analytics interface showing all aggregate performance data
**Components**:
- Dashboard header with navigation, filters, and export actions
- Performance by Preset summary table (first section, key insights)
- Cost vs Quality scatter plot (visual tradeoff analysis)
- Success Rate Trends line chart (temporal analysis)
- Common Failure Patterns table (actionable insights)
- GPU Utilization Analysis (cost optimization insights)
- All sections on single scrollable page for comprehensive view

### Page 2: Individual Job Details (Linked from scatter plot)
**Purpose**: Deep dive into specific job when user clicks outlier dot in scatter plot
**Components**:
- Job summary card (name, status, preset, cost, duration, quality metrics)
- Full training metrics (loss curves, perplexity, learning rate schedule)
- Configuration details (all hyperparameters)
- Error logs (if job failed)
- Related jobs comparison (other jobs with similar config)
- Actions: "Retry with Adjustments", "Add to Failure Analysis", "Back to Analytics"

### Page 3: CSV Export Preview (Optional Modal)
**Purpose**: Preview analytics data before exporting as CSV
**Components**:
- Data preview table showing first 50 rows
- Column selection (checkboxes to include/exclude specific metrics)
- Format options: CSV, JSON, Excel
- Date range confirmation
- Row count indicator: "47 jobs in selected range"
- "Download" and "Cancel" buttons

## Annotations (Mandatory)
**Instruction for Figma Make AI**: Attach text annotations to each UI element citing the specific acceptance criterion it fulfills. Include a separate "Mapping Table" frame in Figma showing:
- Column 1: Acceptance Criterion (ID + short description)
- Column 2: Screen/Page where fulfilled
- Column 3: Component(s) implementing criterion
- Column 4: States shown (default, loading, interactive, empty)
- Example row: "US5.1.2-AC1: Training Analytics accessible from main nav | Page 1 | Nav menu item with badge | Default, Active, Hover"

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| "Training Analytics" dashboard accessible from main navigation | US5.1.2 | Page 1 | Main navigation menu item | Default, Active (on analytics page), Hover | Icon: 📊, Badge with data freshness |
| Performance by Preset table: Conservative, Balanced, Aggressive | US5.1.2 | Page 1 | Data table component | Default, Loading, Sorted | 3 rows for presets + totals row |
| Metrics: Average final loss, Average cost, Average duration, Success rate, Total jobs | US5.1.2 | Page 1 | Table columns | Default | All key performance indicators |
| Best performer highlighted | US5.1.2 | Page 1 | Table row styling | Default, Best (green checkmark badge) | Automatic identification of optimal preset |
| Example: "Balanced preset: 96% success rate, $52 avg cost, 0.312 avg final loss" | US5.1.2 | Page 1 | Table row data | Default | Realistic data formatting |
| Cost vs Quality Scatter Plot: X-axis Final validation loss, Y-axis Total cost | US5.1.2 | Page 1 | Interactive scatter plot chart | Default, Loading, Interactive (zoom/filter) | Charting library (recharts/visx) |
| Each dot = training job, color by preset | US5.1.2 | Page 1 | Scatter plot data points | Default, Hover (tooltip), Clicked (details) | Consistent preset color scheme |
| Ideal zone: Lower-left (low cost, high quality) | US5.1.2 | Page 1 | Chart quadrant shading | Default | Green shaded area for optimal zone |
| Outliers highlighted for investigation | US5.1.2 | Page 1 | Data points in upper-right quadrant | Default, Highlighted (warning icon) | Visual warning for poor performers |
| Success Rate Trends: Line chart monthly over time | US5.1.2 | Page 1 | Line chart component | Default, Loading, Interactive (hover for details) | Last 12 months of data |
| Track improvements as presets optimized | US5.1.2 | Page 1 | Trend line with annotations | Default | Event markers for optimizations |
| Goal: Increase success rate from 92% → 98% | US5.1.2 | Page 1 | Goal line on chart | Default | Horizontal dashed line at target |
| Common Failure Patterns: Most frequent error types | US5.1.2 | Page 1 | Failure analysis table | Default | Sorted by frequency (descending) |
| Configurations with highest failure rate | US5.1.2 | Page 1 | Table column showing common config | Default | E.g., "r=64 with batch_size=4" |
| Recommendations: "Avoid r=64 with batch_size=4 (85% OOM rate)" | US5.1.2 | Page 1 | Recommendation text with action | Default | Actionable guidance based on data |
| GPU Utilization Analysis: Spot vs on-demand usage percentage | US5.1.2 | Page 1 | Pie chart | Default | Shows split of total job hours |
| Spot interruption rates by time of day | US5.1.2 | Page 1 | Heat map or bar chart | Default | Identifies peak interruption times |
| Cost savings from spot usage | US5.1.2 | Page 1 | Summary card with savings calculation | Default | E.g., "$5,196 saved (69%)" |
| Export analytics as CSV for further analysis | US5.1.2 | Page 1, Page 3 | "Export as CSV" button | Default, Hover, Loading, Success | Downloads comprehensive analytics data |
| Update default presets quarterly based on data | US5.1.2 | N/A (admin action) | N/A | N/A | Backend process, not UI component |

## Non-UI Acceptance Criteria

These criteria are backend/algorithmic requirements that inform UI design but are not directly UI components:

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Analytics must aggregate data from all team training runs | Data scope determines insights quality | Display total jobs analyzed: "Analytics based on 47 completed jobs across 5 team members" |
| Success rate calculation: (completed_jobs / total_jobs) × 100% | Algorithm must exclude in-progress jobs | Tooltip explaining calculation: "Success rate = completed jobs / (completed + failed), excludes cancelled and in-progress" |
| Cost savings calculation: (on_demand_equivalent - spot_actual) / on_demand_equivalent | Backend must calculate equivalent on-demand costs | Show formula in tooltip for transparency |
| Failure pattern identification requires minimum 10 failures per pattern | Statistical significance threshold | Don't display patterns with <10 occurrences; note "Minimum 10 failures required for pattern analysis" |
| Preset optimization recommendations based on historical performance | Machine learning or statistical analysis | Display confidence level: "Recommendation based on 47 jobs with 95% confidence" |
| Analytics data must be cached and refreshed hourly to avoid performance issues | Backend caching strategy | Show cache timestamp: "Data updated 2 hours ago. Next update in 1 hour. [Refresh Now]" |

## Estimated Page Count
**3 pages** (meets minimum)

**Rationale**:
- Page 1 (Analytics Dashboard): Comprehensive single-page dashboard showing all aggregate analytics sections - optimal for overview and comparison across metrics
- Page 2 (Individual Job Details): Linked drill-down when user investigates outliers from scatter plot
- Page 3 (CSV Export Preview): Optional modal overlay for export confirmation and customization

Primary user journey is Page 1 (analytics overview) with optional deep dives to Pages 2-3 for detailed investigation and export.

=== END PROMPT FR: FR5.1.2 ===

---

=== BEGIN PROMPT FR: FR5.2.1 ===

## Title
FR5.2.1 Wireframes — Stage 5 — Training Comparison & Optimization — Comprehensive Training History

## Context Summary
FR5.2.1 provides a comprehensive training history interface with advanced filtering, sorting, and search capabilities. Technical leads and team managers can track team activity over time, identify patterns in training behavior, and audit past work. The history page includes filters for date range, creator, status, configuration, cost, GPU type, training file, and tags, along with sortable columns and exportable results. Statistics panels show aggregate metrics like total jobs, success rate, total cost, and training time, with historical trends visualized through charts.

## Journey Integration
- **Stage 5 user goals**: Review complete training history for audit and analysis, track team activity and productivity, identify successful patterns and common mistakes, document organizational knowledge
- **Key emotions**: Confidence in having complete historical record, satisfaction from identifying team patterns, pride in tracking progress over time, trust in audit trail
- **Progressive disclosure levels**:
  * Basic: Filtered list of training jobs with key metadata
  * Advanced: Multi-dimensional filtering (date, user, status, config) with statistical summaries
  * Expert: Trend analysis charts, team activity breakdown, exportable audit reports
- **Persona adaptations**: Team managers (oversight and coordination), Technical leads (pattern identification), Budget managers (cost tracking), Compliance/audit teams (historical audit trail)

## Journey-Informed Design Elements
- **User Goals**: Access complete training history with flexible filtering, track team productivity and success rates, identify cost trends over time, export data for reporting and analysis
- **Emotional Requirements**: Confidence that no training jobs are missing from history, satisfaction from powerful search and filter capabilities, trust in accuracy of historical data, clarity in presentation of complex data
- **Progressive Disclosure**:
  * Basic: Simple list with essential filters (date, status, user)
  * Advanced: Multi-dimensional filtering, search by name/notes/tags, sortable columns
  * Expert: Statistical summaries, trend charts, team activity breakdown, CSV export
- **Success Indicators**: Historical patterns identified leading to improved practices, team coordination improved through visibility, audit requirements satisfied, cost trends understood

## Wireframe Goals
- Provide comprehensive training history page with all completed, failed, and cancelled jobs
- Enable flexible filtering by date range, creator, status, preset, cost, GPU type, training file, and tags
- Support sorting by date, cost, duration, quality metrics
- Implement full-text search across job names, notes, and tags
- Display paginated results with configurable page size (25/50/100 per page)
- Show aggregate statistics panel (total jobs, success rate, total cost, total training time)
- Visualize historical trends with charts (jobs per month, cost per month, success rate trend)
- Provide team activity breakdown (jobs per team member, success rates)
- Enable CSV export of filtered results for external analysis

## Explicit UI Requirements (from acceptance criteria)

### Page Header & Navigation
- Page title: "Training History"
- Breadcrumb navigation: Dashboard > Training > History
- Date range quick filters (chip buttons): Last 7 days | Last 30 days | Last 90 days | All time | Custom range
- Search bar (prominent): "Search jobs by name, notes, or tags..."
- Export button: "Export to CSV" (exports current filtered results)
- View toggle: List view (default) | Card view (optional)

### Advanced Filter Panel
- Collapsible filter panel (left sidebar or expandable section)
- **Date Range Filter**: Calendar date picker (start and end date) or preset range selector
- **Creator Filter**: Dropdown multi-select with all team members + "Me only" checkbox
- **Status Filter**: Checkbox group - Completed | Failed | Cancelled (multiple selection allowed)
- **Configuration Filter**: Dropdown - All presets | Conservative | Balanced | Aggressive
- **Cost Range Filter**: Range slider - Min $0 to Max $500, or preset ranges (<$50, $50-100, $100-200, >$200)
- **GPU Type Filter**: Radio buttons - All | Spot | On-Demand
- **Training File Filter**: Dropdown - All | [List of training file names from database]
- **Tags Filter**: Multi-select dropdown with all existing tags (experiment, production, client-delivery, test, poc)
- "Apply Filters" button (primary action)
- "Reset Filters" button (secondary action, clears all filters)
- Active filter chips displayed above results: "Status: Completed ×" "Cost: $50-100 ×" (click × to remove)

### Jobs List Table
- Table structure with sortable columns (click header to sort ascending/descending, arrow indicator)
- **Columns**:
  * Job Name (truncated with tooltip for full name)
  * Status badge (Completed: green, Failed: red, Cancelled: orange, with icons)
  * Configuration summary (preset badge + key hyperparameters in tooltip)
  * Created By (user name with avatar)
  * Started At (date and time)
  * Duration (formatted: XXh YYm or "N/A" if cancelled early)
  * Cost (formatted: $XX.XX or "N/A")
  * Actions dropdown (⋮ menu with: View Details, Compare, Clone Configuration, Delete)
- Row hover state: Subtle background highlight
- Row click action: Opens job details page
- Checkbox column (first column): For multi-select (enable Compare or bulk Delete actions)

### Pagination Controls
- Bottom of table: Page navigation
- Page size selector: Show 25 | 50 | 100 per page (dropdown)
- Page info: "Showing 1-25 of 147 jobs"
- Pagination buttons: ‹ Previous | Page 1 2 3 ... 6 | Next ›
- Jump to page input: "Go to page: [___]"

### Statistics Panel (Top of page, above table)
- Card layout with 4 key metrics:
  * **Total Jobs**: 147 (all-time or filtered count)
  * **Success Rate**: 94% (completed / (completed + failed), excludes cancelled)
  * **Total Cost**: $6,854.32 (sum of all job costs)
  * **Total Training Time**: 1,843 hours (aggregate duration of all jobs)
- Each metric card includes:
  * Large primary number
  * Descriptive label
  * Trend indicator: ↑ 12% vs last period (green) or ↓ 5% vs last period (red)
  * Icon representing metric

### Historical Trends Charts Section (Expandable)
- Toggle to show/hide trends section (default: collapsed)
- **Jobs per Month Bar Chart**:
  * X-axis: Month (last 12 months)
  * Y-axis: Number of jobs
  * Bars color-coded by status: Green (completed), Red (failed), Orange (cancelled)
  * Stacked bars showing composition
  * Tooltip on hover: "March 2025: 15 completed, 2 failed, 1 cancelled"
- **Cost per Month Line Chart**:
  * X-axis: Month (last 12 months)
  * Y-axis: Total cost ($)
  * Line showing spending trend
  * Annotations for significant changes: "Budget increase in April"
- **Success Rate Trend Line Chart**:
  * X-axis: Month (last 12 months)
  * Y-axis: Success rate (%)
  * Line showing success rate trend
  * Goal line (dashed) at target success rate (e.g., 95%)

### Team Activity Breakdown (Expandable)
- Toggle to show/hide team activity section (default: collapsed)
- **Jobs per Team Member Table**:
  * Columns: Team Member (with avatar) | Total Jobs | Completed | Failed | Cancelled | Success Rate | Average Cost
  * Sortable by any column
  * Highlight top performer (green badge): Most completed jobs or highest success rate
- **Team Leaderboard** (optional):
  * Top 3 team members by different metrics: Most productive, Most cost-efficient, Highest quality (lowest avg loss)

### Export & Actions
- "Export to CSV" button (top-right): Downloads filtered results
- CSV includes all table columns plus additional metadata: Job ID, Training file ID, Notes, Tags, Configuration JSON, Final metrics
- Filename format: `training-history-{date-range}-{timestamp}.csv`
- Loading indicator during export generation
- Success toast: "Exported 147 jobs to CSV"

### States to Include
- **Empty state** (no results): "No training jobs found matching your filters. Try adjusting filters or creating your first training job."
- **Loading state**: Skeleton rows in table, loading spinners in statistics cards
- **Error state**: "Failed to load training history. Please try again. [Retry]"
- **No filters state** (default): All jobs displayed, all filters at default values
- **Active filters state**: Filter chips displayed, "X jobs matching filters" indicator
- **Search results state**: "Search results for '{query}' - X jobs found"

## Interactions and Flows

### Initial Load Flow
1. User navigates to "Training History" from main navigation
2. Page loads with default view: Last 30 days, all statuses, all users, sorted by newest first
3. Statistics panel populates with aggregate metrics
4. Jobs list table populates with paginated results (25 jobs per page)

### Filtering Flow
1. User opens filter panel (click "Filters" button or left sidebar is always visible)
2. User selects multiple filters: Status = Completed, Creator = John Smith, Date range = Last 90 days
3. User clicks "Apply Filters" button
4. Table updates to show only matching jobs
5. Active filter chips appear above table: "Status: Completed ×" "Creator: John Smith ×"
6. Statistics panel updates to reflect filtered subset
7. User clicks × on "Status: Completed" chip to remove that filter
8. Table updates again

### Search Flow
1. User types query in search bar: "financial advisory"
2. Search executes as user types (debounced after 300ms)
3. Results filter to show jobs with "financial advisory" in name, notes, or tags
4. Search results indicator: "8 jobs matching 'financial advisory'"
5. User clears search (click × in search bar) to return to full list

### Sorting Flow
1. User clicks "Cost" column header to sort by cost
2. Table re-renders with jobs sorted by cost ascending (lowest to highest)
3. Arrow indicator appears in column header: Cost ↑
4. User clicks "Cost" header again to reverse sort (descending: highest to lowest)
5. Arrow indicator flips: Cost ↓

### Comparison Flow
1. User checks checkboxes next to 3 completed jobs in table
2. "Compare Selected" button appears in sticky action bar
3. User clicks "Compare Selected"
4. Redirected to comparison view (FR5.1.1 interface) with selected jobs loaded

### Export Flow
1. User applies filters: Last 90 days, Completed status only
2. User clicks "Export to CSV" button
3. Loading indicator shows "Generating export..."
4. CSV file downloads: `training-history-last-90-days-2025-12-18.csv`
5. Success toast: "Exported 47 jobs to CSV"

### Trend Analysis Flow
1. User expands "Historical Trends" section (click toggle or "Show Trends" button)
2. Charts render showing jobs per month, cost per month, success rate trend
3. User hovers over bar in jobs per month chart to see tooltip with details
4. User identifies pattern: "Failures increased in March, then dropped in April after preset optimization"
5. User collapses trends section to return to table view

## Visual Feedback
- Active filter chips with × close buttons (visual indication of applied filters)
- Sortable column headers with arrow indicators (visual sort state)
- Status badges color-coded (immediate status recognition)
- Trend indicators (↑↓) on statistics cards (quick insight into changes)
- Row hover highlights in table (interactive affordance)
- Loading skeletons during data fetch (perceived performance)
- Success toasts for export actions (confirmation feedback)
- Empty state illustrations and helpful guidance (user support when no results)

## Accessibility Guidance
- All filters keyboard accessible (Tab navigation, Enter to apply)
- Table sortable via keyboard (Tab to column header, Enter to sort, Space to toggle direction)
- ARIA labels on all interactive elements: "Sort by cost ascending"
- Checkbox selection announced: "Job ABC selected. 3 jobs selected."
- Status badges with text labels, not color-only (colorblind accessibility)
- Focus indicators visible on all interactive elements
- Skip link to jump directly to jobs table (bypass filters)
- Table headers with proper scope attributes for screen readers
- Date pickers keyboard accessible (arrow keys to navigate calendar)

## Information Architecture

### Primary Layout Groups
1. **Page Header**
   - Page title and breadcrumb
   - Quick date range filters (chips)
   - Search bar
   - Export button

2. **Statistics Panel** (top section)
   - 4 metric cards (Total Jobs, Success Rate, Total Cost, Total Training Time)
   - Each with trend indicator

3. **Filter Panel** (left sidebar or expandable)
   - All filter controls grouped logically
   - Apply and Reset buttons
   - Active filter chips below panel

4. **Jobs List Table** (main content area)
   - Sortable columns with all job metadata
   - Pagination controls at bottom

5. **Historical Trends Section** (expandable)
   - Jobs per month bar chart
   - Cost per month line chart
   - Success rate trend line chart

6. **Team Activity Section** (expandable)
   - Jobs per team member table
   - Team leaderboard (optional)

## Page Plan

### Page 1: Training History Main View
**Purpose**: Comprehensive training history interface with filtering, sorting, search, and statistics
**Components**:
- Page header with title, breadcrumb, search, export
- Statistics panel (4 metric cards with trends)
- Filter panel (left sidebar with all filter controls)
- Active filter chips (above table)
- Jobs list table (sortable columns, paginated results)
- Pagination controls (bottom)
- Historical trends section (expandable, collapsed by default)
- Team activity section (expandable, collapsed by default)
- All components on single scrollable page for unified experience

### Page 2: Job Details (Linked from table row click)
**Purpose**: View full details of individual training job
**Components**:
- Job summary card (name, status, dates, creator)
- Configuration details (all hyperparameters)
- Training metrics and loss curves
- Validation results (if completed successfully)
- Cost breakdown
- Event log
- Actions: Download artifacts, Retry, Clone, Delete, Back to History

### Page 3: CSV Export Configuration Modal (Optional)
**Purpose**: Configure export options before downloading CSV
**Components**:
- Column selection (checkboxes to include/exclude specific columns)
- Date range confirmation (pre-filled with current filters)
- Format options: CSV, JSON, Excel (optional)
- File naming preview
- Estimated file size
- "Download" and "Cancel" buttons

## Annotations (Mandatory)
**Instruction for Figma Make AI**: Attach text annotations to each UI element citing the specific acceptance criterion it fulfills. Include a separate "Mapping Table" frame in Figma showing:
- Column 1: Acceptance Criterion (ID + short description)
- Column 2: Screen/Page where fulfilled
- Column 3: Component(s) implementing criterion
- Column 4: States shown (default, filtered, sorted, loading, empty)
- Example row: "US5.2.1-AC2: Date range filter | Page 1 | Date picker in filter panel | Default (Last 30 days), Custom range, Applied"

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| "Training History" page with comprehensive filters | US5.2.1 | Page 1 | Main page container | Default | All filtering and sorting functionality |
| Date range filter: Last 7/30/90 days, All time, Custom | US5.2.1 | Page 1 | Quick filter chips + date picker in filter panel | Default, Custom range selected | Multiple ways to filter by date |
| Creator filter: All / [User dropdown] / Me only | US5.2.1 | Page 1 | User dropdown multi-select + "Me only" checkbox | Default (All), Filtered by user | Supports team visibility and personal view |
| Status filter: All / Completed / Failed / Cancelled | US5.2.1 | Page 1 | Checkbox group in filter panel | Multiple selection, Default (All) | Multi-select for flexible filtering |
| Configuration filter: All presets / Conservative / Balanced / Aggressive | US5.2.1 | Page 1 | Preset dropdown | Default (All), Filtered by preset | Preset-based filtering |
| Cost range filter: <$50 / $50-100 / $100-200 / >$200 | US5.2.1 | Page 1 | Range slider or preset buttons | Default (All), Custom range | Multiple range options |
| GPU type filter: All / Spot / On-Demand | US5.2.1 | Page 1 | Radio button group | Default (All), Filtered | Mutually exclusive selection |
| Training file filter: All / [Training file dropdown] | US5.2.1 | Page 1 | Dropdown with training file names | Default (All), Filtered by file | Populated from database |
| Tags filter: Filter by job tags (experiment, production, etc.) | US5.2.1 | Page 1 | Multi-select tag dropdown | Default (All), Multiple tags selected | Supports multiple tag filtering |
| Sort options: Date (newest/oldest), Cost (high/low), Duration (long/short), Quality (best/worst) | US5.2.1 | Page 1 | Sortable table column headers | Default (Date newest), Sorted ascending, Sorted descending | Click header to toggle sort |
| Search: By job name, notes, tags, training file name | US5.2.1 | Page 1 | Search bar in page header | Empty, Active (typing), Results filtered | Full-text search across key fields |
| Results display: Paginated table (25/50/100 per page) | US5.2.1 | Page 1 | Jobs list table + pagination controls | Default (25), 50, 100 per page | Configurable page size |
| Export filtered results as CSV | US5.2.1 | Page 1, Page 3 | "Export to CSV" button | Default, Loading, Success | Downloads current filtered results |
| Statistics panel: Total jobs | US5.2.1 | Page 1 | Metric card | Default, Filtered (updates with filters) | Shows count of jobs in current view |
| Statistics panel: Success rate (94%) | US5.2.1 | Page 1 | Metric card | Default, Filtered | Calculated: completed / (completed + failed) |
| Statistics panel: Total cost ($2,348) | US5.2.1 | Page 1 | Metric card | Default, Filtered | Sum of all job costs in current view |
| Statistics panel: Total training time (623 hours) | US5.2.1 | Page 1 | Metric card | Default, Filtered | Aggregate duration of all jobs |
| Historical trends: Jobs per month (bar chart) | US5.2.1 | Page 1 | Bar chart in expandable section | Default (collapsed), Expanded | Last 12 months of job count data |
| Historical trends: Cost per month (line chart) | US5.2.1 | Page 1 | Line chart in expandable section | Default (collapsed), Expanded | Last 12 months of cost data |
| Historical trends: Success rate trend (line chart) | US5.2.1 | Page 1 | Line chart in expandable section | Default (collapsed), Expanded | Last 12 months of success rate |
| Team activity: Jobs per team member | US5.2.1 | Page 1 | Table in expandable section | Default (collapsed), Expanded | Breakdown by user |
| Team activity: Average cost per team member | US5.2.1 | Page 1 | Table column | Default | Calculated per user |
| Team activity: Success rate per team member | US5.2.1 | Page 1 | Table column | Default | Calculated per user |
| Click any row opens job details page | US5.2.1 | Page 1 → Page 2 | Table row click action | Default, Hover (cursor pointer) | Navigation to job details |

## Non-UI Acceptance Criteria

These criteria are backend/data requirements that inform UI design but are not directly UI components:

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| History must include all completed, failed, and cancelled jobs | Data completeness requirement | Display "Showing all jobs (no filters applied)" by default; audit log to verify no jobs missing |
| Success rate calculation excludes in-progress jobs | Algorithm requirement | Tooltip explaining: "Success rate = completed / (completed + failed). In-progress and cancelled jobs excluded." |
| Cost aggregation must handle jobs with $0 cost (cancelled before start) | Data quality handling | Display "N/A" for cost on jobs cancelled during provisioning; exclude from total cost calculation |
| Export must include all table columns plus additional metadata (Job ID, Configuration JSON, Notes, Tags) | Export data format | Preview available columns before export; CSV includes hidden fields for comprehensive data |
| Team activity breakdown requires user permissions (only show team members user has access to) | Security requirement | Display only authorized team members in filters and team activity section |
| Historical trends require minimum 3 months of data for meaningful analysis | Data visualization threshold | Show message if <3 months: "Insufficient data for trend analysis. Need 3+ months of history." |

## Estimated Page Count
**3 pages** (meets minimum)

**Rationale**:
- Page 1 (Training History Main View): Comprehensive single-page interface with all filtering, sorting, search, statistics, and optional trend/team sections - optimized for efficient history browsing and analysis
- Page 2 (Job Details): Linked navigation when user clicks on specific job row for deep dive
- Page 3 (CSV Export Configuration Modal): Optional modal for export customization before download

Primary user workflow is Page 1 (history browsing and filtering) with optional navigation to Page 2 for job details and Page 3 for export configuration.

=== END PROMPT FR: FR5.2.1 ===

---

=== BEGIN PROMPT FR: FR5.2.2 ===

## Title
FR5.2.2 Wireframes — Stage 5 — Training Comparison & Optimization — Configuration Templates Library

## Context Summary
FR5.2.2 enables technical leads and AI engineers to save successful training configurations as reusable templates with descriptive names, descriptions, tags, and visibility settings. The template library provides a centralized repository of proven configurations that teams can reuse for consistent results. Templates show usage statistics (how many jobs created from template, success rates, average metrics) and support editing, deleting, and starting new jobs from templates with pre-filled configurations.

## Journey Integration
- **Stage 5 user goals**: Preserve successful training configurations for team reuse, build organizational knowledge of proven setups, accelerate job creation with trusted templates, share best practices across team
- **Key emotions**: Satisfaction from documenting successful patterns, pride in building team knowledge library, confidence that proven configurations will be reused correctly, excitement about accelerating future training runs
- **Progressive disclosure levels**:
  * Basic: Simple template library with create-from-template workflow
  * Advanced: Template analytics (usage count, success rates), editing and deletion
  * Expert: Template comparison, version history, team collaboration features
- **Persona adaptations**: Technical leads (template curation and sharing), AI engineers (template usage and creation), Team managers (knowledge preservation and best practices enforcement)

## Journey-Informed Design Elements
- **User Goals**: Save successful configurations as templates, browse template library for appropriate setup, start new jobs quickly from proven templates, track which templates work best
- **Emotional Requirements**: Confidence that templates accurately capture successful configurations, satisfaction from easy reuse, trust in template success rate data, pride in contributing to team knowledge
- **Progressive Disclosure**:
  * Basic: Save as template button on completed jobs, template library grid/list view, start from template workflow
  * Advanced: Template analytics (usage count, success rate, avg metrics), search and filter, visibility controls
  * Expert: Template editing/versioning, comparison of similar templates, team recommendations
- **Success Indicators**: Templates actively used by team (high usage counts), success rates of template-derived jobs remain high, new team members onboard faster using templates

## Wireframe Goals
- Provide "Save as Template" button on completed jobs with success rate >90%
- Enable template creation modal with name, description, visibility, and tags
- Display template library page with grid or list view of all available templates
- Show template cards with name, description, configuration summary, usage stats, and success rate
- Support filtering by creator, tags, and visibility (private vs team)
- Enable "Start from Template" workflow that pre-fills job creation form
- Track template analytics: usage count, success rate, average cost/duration/quality
- Allow template editing (description, tags, visibility) and deletion with confirmation
- Provide 3 default templates: Quick Test, Standard Production, Maximum Quality

## Explicit UI Requirements (from acceptance criteria)

### Save as Template Entry Point (on completed job details page)
- "Save as Template" button visible only on jobs with success rate >90% (completed successfully)
- Button placement: Prominent in job actions section (top-right or action menu)
- Button styling: Secondary or outlined button (not overly prominent)
- Disabled state with tooltip if job doesn't meet criteria: "Template save available for jobs with >90% success rate"
- Click opens template creation modal overlay

### Template Creation Modal
- Modal overlay (centered, medium width, dismissible backdrop click)
- Modal header: "Save Configuration as Template"
- Form fields:
  * **Template Name** (required, 3-100 characters):
    - Input field with character counter
    - Auto-populated with suggestion: "[Job Name] Template" or "[Preset] - [Training File] Configuration"
    - Example: "Production Financial Advisory - High Quality"
    - Validation: Check for duplicate names, show error if exists
  * **Description** (optional, 500 character limit):
    - Textarea with character counter
    - Placeholder: "Describe when to use this template and what makes it successful..."
    - Example: "Best configuration for 200+ conversation datasets with emotional intelligence focus"
  * **Visibility** (required, radio buttons):
    - Private: "Only visible to me" (my templates)
    - Team: "Visible to all team members" (shared across workspace)
    - Default selection: Team (encourage sharing)
  * **Tags** (optional, multi-select):
    - Dropdown or tag input field
    - Common tags provided: production, experimental, client-delivery, test, poc, high-quality, balanced, conservative, aggressive
    - Allow custom tag creation
    - Visual tag chips showing selected tags
- Configuration preview section (read-only):
  * Preset badge and name
  * Key hyperparameters: r, lr, epochs, batch_size, gradient_accumulation_steps
  * GPU type: Spot/On-Demand
  * Checkpoint frequency
  * Note: "This configuration will be saved exactly as shown"
- Modal actions:
  * "Save Template" button (primary, enabled when name filled)
  * "Cancel" button (secondary)
- Loading state: "Saving template..." with spinner
- Success: Modal closes, success toast: "Template saved successfully. View in Template Library."
- Error state: Display error message inline if save fails

### Template Library Page
- Page navigation: "Template Library" in main nav or under "Training" section
- Page header:
  * Page title: "Configuration Templates"
  * "Create Template" button (if user wants to create from scratch, not from job)
  * Search bar: "Search templates..."
  * View toggle: Grid view (default) | List view
- Filter panel (sidebar or expandable):
  * **Filter by Creator**: All | My Templates | Team Templates | [Specific user dropdown]
  * **Filter by Tags**: Multi-select tag filter (shows all tags used across templates)
  * **Filter by Visibility**: All | Private | Team
  * "Apply Filters" and "Reset Filters" buttons
  * Active filter chips displayed above results
- Sort options (dropdown): Name (A-Z) | Created Date (newest/oldest) | Usage Count (high/low) | Success Rate (high/low)
- Template count indicator: "Showing 12 templates"

### Template Card (Grid View)
- Card layout with visual hierarchy
- **Card Header**:
  * Template name (bold, large text, truncated with tooltip)
  * Visibility badge: "Private" (gray) or "Team" (blue) icon
  * Edit menu (⋮ three dots): Edit | Delete | Duplicate (if creator)
- **Card Body**:
  * Description (2-3 lines, truncated with "Read more" if longer)
  * Tags: Visual tag chips (e.g., "production", "high-quality", "balanced")
  * Configuration summary badges:
    - Preset badge: Conservative/Balanced/Aggressive (color-coded)
    - GPU type icon: Spot/On-Demand
    - Key hyperparameters hint: "r=16, lr=2e-4, 3 epochs"
- **Card Footer (Template Analytics)**:
  * Usage count: "Used 23 times" (icon + number)
  * Success rate: "96% success rate" (checkmark + percentage, color-coded: green ≥90%, yellow 80-89%, red <80%)
  * Average cost: "$52 avg" (dollar icon + amount)
  * Average duration: "13.2 hrs avg" (clock icon + time)
- **Primary Action Button**: "Start from Template" (full-width button at card bottom)
- Card hover state: Subtle shadow lift, border highlight
- Card click (anywhere except buttons): Opens template details view

### Template Card (List View)
- Table row layout with columns:
  * Template Name | Visibility | Tags | Configuration | Usage Count | Success Rate | Avg Cost | Avg Duration | Actions
- Sortable columns (click header to sort)
- Row hover state: Background highlight
- Actions column: "Start from Template" button + Edit menu (⋮)

### Template Details View (Modal or Dedicated Page)
- Opens when user clicks template card body
- Shows full template information:
  * Header: Template name, creator, created date, visibility
  * Full description (untruncated)
  * All tags
  * Complete configuration details (all hyperparameters, GPU settings, checkpoint frequency)
  * Template analytics section:
    - Total usage count: "This template has been used 23 times"
    - Success rate: 96% (21 completed, 1 failed, 1 cancelled)
    - Average metrics: Cost ($52), Duration (13.2 hrs), Final loss (0.298)
    - Chart showing success rate trend over time (if enough usage data)
  * Jobs created from template section:
    - List of recent jobs using this template (last 10)
    - Each with link to job details
- Actions:
  * "Start from Template" (primary button)
  * "Edit Template" (if creator)
  * "Duplicate Template" (if want to modify for personal use)
  * "Delete Template" (if creator, with confirmation)
  * "Close" or back to library

### Start from Template Workflow
- Clicking "Start from Template" button:
  1. Redirects to job creation/configuration page
  2. All configuration fields pre-filled with template values:
     - Preset selection (Conservative/Balanced/Aggressive)
     - Hyperparameters (r, lr, epochs, batch_size, gradient_accumulation_steps)
     - GPU type (Spot/On-Demand)
     - Checkpoint frequency
  3. Training file field left empty (user must select)
  4. Job notes field auto-includes: "Started from template: {template_name}"
  5. All fields editable before starting (user can adjust if needed)
- Visual indication: Banner at top of form: "Configuration loaded from template: {template_name}"
- Link back to template details from banner

### Edit Template Modal
- Similar to creation modal but with existing values pre-filled
- Editable fields: Description, Tags, Visibility
- Non-editable: Template name, Configuration (to avoid breaking references)
- If user wants to change config: Suggest "Duplicate template and modify"
- "Save Changes" button
- Confirmation toast: "Template updated successfully"

### Delete Template Confirmation Modal
- Warning modal: "Delete Template?"
- Warning message: "This will permanently delete the template. Jobs created from this template will not be affected."
- Template name displayed prominently
- Usage statistics shown: "This template has been used 23 times"
- Confirmation required: Type template name to confirm deletion (for high-usage templates)
- "Delete Template" button (destructive red) and "Cancel" button
- After deletion: Return to template library with toast: "Template '{name}' deleted"

### Default Templates (Provided by System)
- 3 default templates automatically created and visible to all users:
  1. **"Quick Test"**:
     - Description: "Minimal cost configuration for rapid testing (Conservative preset, 1 epoch)"
     - Configuration: Conservative preset, 1 epoch, minimal settings
     - Tags: test, conservative, quick
     - Marked as "System Default" (cannot be edited/deleted by users)
  2. **"Standard Production"**:
     - Description: "Proven quality for production use (Balanced preset, 3 epochs)"
     - Configuration: Balanced preset, 3 epochs, recommended settings
     - Tags: production, balanced, recommended
     - Marked as "System Default"
  3. **"Maximum Quality"**:
     - Description: "Highest quality for premium deliveries (Aggressive preset, 4 epochs)"
     - Configuration: Aggressive preset, 4 epochs, maximum quality settings
     - Tags: production, aggressive, high-quality
     - Marked as "System Default"
- Default templates have "System Default" badge, usage statistics across all teams

### States to Include
- **Empty state** (no templates): "No templates found. Save your first successful configuration as a template to build your library."
- **Empty state** (filtered, no results): "No templates match your filters. Try adjusting filters or create a new template."
- **Loading state**: Skeleton cards/rows while templates load
- **Error state**: "Failed to load templates. Please try again. [Retry]"
- **Template saved state**: Success confirmation after creation
- **Template deleted state**: Confirmation after deletion with undo option (brief window)

## Interactions and Flows

### Template Creation Flow (from job details)
1. User views completed training job with good results (success rate >90%)
2. User clicks "Save as Template" button
3. Template creation modal opens
4. Form pre-filled with suggested name based on job name
5. User edits name: "High-Quality Emotional Intelligence - Balanced"
6. User adds description: "Best for 200+ conversation datasets with complex emotional scenarios"
7. User selects visibility: Team (share with all)
8. User adds tags: production, balanced, high-quality
9. User reviews configuration preview (read-only summary)
10. User clicks "Save Template"
11. Loading spinner appears briefly
12. Modal closes, success toast: "Template saved successfully"
13. User optionally clicks toast action: "View in Template Library"

### Template Usage Flow (start job from template)
1. User navigates to Template Library page
2. User browses templates in grid view
3. User filters by tags: "production" tag
4. User reviews template card: "Standard Production" template
5. User sees analytics: 45 uses, 97% success rate, $48 avg cost
6. User clicks "Start from Template" button
7. Redirected to job creation page
8. All configuration fields pre-filled with template values
9. Banner shows: "Configuration loaded from template: Standard Production"
10. User selects training file (only required field not pre-filled)
11. User optionally adjusts hyperparameters if needed
12. User sees job notes auto-include: "Started from template: Standard Production"
13. User reviews configuration and clicks "Start Training"

### Template Editing Flow
1. User views template card they created
2. User clicks edit menu (⋮) > "Edit"
3. Edit template modal opens with current values
4. User updates description to clarify when to use template
5. User adds new tag: "client-approved"
6. User changes visibility from Private to Team (share more widely)
7. User clicks "Save Changes"
8. Modal closes, toast: "Template updated successfully"
9. Template card updates to reflect changes

### Template Deletion Flow
1. User clicks edit menu (⋮) > "Delete"
2. Confirmation modal appears: "Delete Template?"
3. Warning message explains jobs won't be affected
4. Usage stats displayed: "Used 23 times"
5. User required to type template name: "High-Quality Emotional Intelligence - Balanced"
6. User types name correctly
7. "Delete Template" button enables
8. User clicks "Delete Template"
9. Modal closes, template removed from library
10. Toast: "Template 'High-Quality Emotional Intelligence - Balanced' deleted" with brief "Undo" option

### Template Discovery Flow (new team member)
1. New user explores Template Library for first time
2. Sees default templates prominently displayed at top
3. Reads descriptions to understand when to use each
4. Clicks "Standard Production" template card to view details
5. Reviews analytics: High usage count (156 uses), high success rate (97%)
6. Reads jobs created from template section (social proof)
7. Confident in template quality, clicks "Start from Template"
8. Creates first successful training job using proven configuration

## Visual Feedback
- Template cards with visual hierarchy (name, description, tags, analytics, action)
- Color-coded success rate indicators (green ≥90%, yellow 80-89%, red <80%)
- Visibility badges (Private/Team) for access control clarity
- Tag chips with distinct colors for visual scanning
- Usage count and analytics with icons for quick comprehension
- "System Default" badges on default templates (authority/trust indicators)
- Hover states on cards and buttons (interactive affordance)
- Loading states for creation, editing, deletion (process feedback)
- Success toasts for completed actions (confirmation)
- Empty state illustrations with helpful guidance (user onboarding)

## Accessibility Guidance
- All interactive elements keyboard accessible (Tab navigation, Enter to activate)
- Template cards navigable with arrow keys in grid view
- ARIA labels on all buttons and form fields: "Start from template: Standard Production"
- Form field labels properly associated with inputs
- Error messages announced to screen readers
- Focus trap in modals (Tab cycles within modal, Escape closes)
- Color not sole indicator of success rate (also text percentage and icons)
- Focus indicators visible on all interactive elements
- Skip link to jump past template cards to pagination (if many templates)
- Confirmation modals announce destructive action: "Warning: This will permanently delete the template"

## Information Architecture

### Primary Layout Groups
1. **Template Library Page Header**
   - Page title and description
   - "Create Template" button (optional)
   - Search bar
   - View toggle (Grid/List)

2. **Filter & Sort Controls**
   - Filter panel (sidebar or collapsible)
   - Sort dropdown
   - Active filter chips

3. **Default Templates Section** (top of results)
   - 3 system default templates displayed prominently
   - "System Default" badges

4. **User Templates Grid/List** (main content area)
   - Template cards arranged in responsive grid (3-4 columns)
   - Or table rows in list view
   - Pagination if >20 templates

5. **Template Creation Modal** (overlay)
   - Form fields for template metadata
   - Configuration preview
   - Save and Cancel actions

6. **Template Details Modal/Page** (overlay or dedicated page)
   - Full template information
   - Analytics section
   - Jobs created from template
   - Actions (Start, Edit, Delete)

7. **Edit Template Modal** (overlay)
   - Form with current values
   - Save Changes and Cancel actions

8. **Delete Confirmation Modal** (overlay)
   - Warning and confirmation
   - Type-to-confirm for safety
   - Delete and Cancel actions

## Page Plan

### Page 1: Template Library
**Purpose**: Browse, search, filter, and select configuration templates for reuse
**Components**:
- Page header with title, search, view toggle
- Filter panel (sidebar with creator, tags, visibility filters)
- Sort dropdown
- Active filter chips
- Default templates section (always at top)
- User templates grid (responsive cards) or list (table rows)
- Pagination controls (if >20 templates)
- Empty state if no templates match filters

### Page 2: Job Creation Page (Pre-filled from Template)
**Purpose**: Start new training job with configuration loaded from selected template
**Components**:
- Job creation form with all fields pre-filled from template
- Banner indicating template source: "Configuration loaded from template: {name}"
- Training file selector (only required field not pre-filled)
- All configuration fields editable
- Job notes field with auto-text: "Started from template: {name}"
- Cost estimate updates as user adjusts (if needed)
- "Start Training" button (primary action)

### Page 3: Template Creation Modal (Overlay on job details page)
**Purpose**: Save successful training configuration as reusable template
**Components**:
- Modal form with template metadata fields (name, description, visibility, tags)
- Configuration preview (read-only summary)
- Validation and error messages
- "Save Template" and "Cancel" buttons

### Page 4: Template Details Modal/Page (Overlay or dedicated)
**Purpose**: View complete template information, analytics, and related jobs
**Components**:
- Template header (name, creator, created date, visibility)
- Full description and tags
- Complete configuration details
- Template analytics (usage, success rate, avg metrics)
- Jobs created from template list (recent 10)
- Actions: Start from Template, Edit, Duplicate, Delete

### Page 5: Edit Template Modal (Overlay)
**Purpose**: Update template metadata (description, tags, visibility)
**Components**:
- Form with current values pre-filled
- Non-editable fields (name, config) with explanation
- "Save Changes" and "Cancel" buttons

### Page 6: Delete Confirmation Modal (Overlay)
**Purpose**: Confirm destructive deletion action with safety check
**Components**:
- Warning message
- Usage statistics
- Type-to-confirm field (for high-usage templates)
- "Delete Template" (destructive) and "Cancel" buttons

## Annotations (Mandatory)
**Instruction for Figma Make AI**: Attach text annotations to each UI element citing the specific acceptance criterion it fulfills. Include a separate "Mapping Table" frame in Figma showing:
- Column 1: Acceptance Criterion (ID + short description)
- Column 2: Screen/Page where fulfilled
- Column 3: Component(s) implementing criterion
- Column 4: States shown (default, hover, filled, validated, error)
- Example row: "US5.2.2-AC1: Save as Template button | Page 3 (modal trigger on job details) | Button in job actions | Default, Hover, Disabled (if criteria not met)"

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| "Save as Template" button on completed jobs (success rate >90%) | US5.2.2 | Page 3 trigger (job details page) | Button in job actions section | Default, Hover, Disabled (with tooltip) | Only visible if job success criteria met |
| Template creation modal: Template name (required) | US5.2.2 | Page 3 | Text input field with validation | Empty, Filled, Error (duplicate name), Valid | Character counter 3-100 chars |
| Auto-populated name: "Production Financial Advisory - High Quality" | US5.2.2 | Page 3 | Text input with suggested value | Default (pre-filled) | Editable suggestion |
| Description (optional, 500 char limit) | US5.2.2 | Page 3 | Textarea with character counter | Empty, Filled | Placeholder with guidance |
| Include: Hyperparameters, GPU selection, checkpoint frequency | US5.2.2 | Page 3 | Configuration preview section (read-only) | Default | Shows what will be saved |
| Visibility: Private (my templates) / Team (shared across workspace) | US5.2.2 | Page 3 | Radio button group | Private selected, Team selected | Default: Team |
| Tags: production, financial, high-quality, balanced | US5.2.2 | Page 3 | Multi-select tag input or dropdown | No tags, Multiple tags selected | Common tags + custom |
| Template library page: Grid or list view | US5.2.2 | Page 1 | View toggle button, template cards grid/list | Grid view (default), List view | Responsive layout |
| Filter by: Creator, Tags, Visibility | US5.2.2 | Page 1 | Filter panel with multiple filter controls | Default (no filters), Filtered | Active filter chips displayed |
| Sort by: Name, Created date, Usage count | US5.2.2 | Page 1 | Sort dropdown | Default (Name A-Z), Sorted by usage, Sorted by date | Applies to entire list |
| Template cards show: Name, Description, Configuration summary, Usage count, Success rate, Average cost | US5.2.2 | Page 1 | Template card component | Default, Hover | All key information displayed |
| "Start from Template" button | US5.2.2 | Page 1 (card), Page 4 (details) | Primary button | Default, Hover, Loading (redirecting) | Main action for template usage |
| Opens job creation form pre-filled with template configuration | US5.2.2 | Page 2 | Job creation form | Pre-filled from template | All config fields populated |
| All fields editable before starting | US5.2.2 | Page 2 | Editable form inputs | Default (filled), Edited by user | User can adjust if needed |
| Job notes automatically include: "Started from template: {template_name}" | US5.2.2 | Page 2 | Notes textarea | Default (auto-text) | Editable but pre-filled |
| Template analytics: Usage count | US5.2.2 | Page 1 (card footer), Page 4 (details) | Stat display with icon | Default | "Used 23 times" |
| Template analytics: Success rate | US5.2.2 | Page 1 (card footer), Page 4 (details) | Stat display with percentage and color | Default, Color-coded (green/yellow/red) | "96% success rate" |
| Template analytics: Average metrics (Cost, duration, final loss) | US5.2.2 | Page 1 (card footer), Page 4 (details) | Stat displays with icons | Default | "$52 avg", "13.2 hrs avg" |
| Edit template: Update description, tags, visibility | US5.2.2 | Page 5 (edit modal) | Edit form | Default (pre-filled), Edited, Saved | Triggered from template card menu |
| Delete template: Requires confirmation, doesn't affect jobs created from template | US5.2.2 | Page 6 (delete modal) | Confirmation modal with type-to-confirm | Default, Typing confirmation, Confirmed | Safety check for high-usage templates |
| Default templates provided: "Quick Test", "Standard Production", "Maximum Quality" | US5.2.2 | Page 1 | Template cards with "System Default" badges | Default | Always visible at top of library |
| "Quick Test" (Conservative, 1 epoch, minimal cost) | US5.2.2 | Page 1 | Default template card | Default | System-provided, cannot edit/delete |
| "Standard Production" (Balanced, 3 epochs, proven quality) | US5.2.2 | Page 1 | Default template card | Default | Recommended for most users |
| "Maximum Quality" (Aggressive, 4 epochs, highest quality) | US5.2.2 | Page 1 | Default template card | Default | For premium deliveries |

## Non-UI Acceptance Criteria

These criteria are backend/data requirements that inform UI design but are not directly UI components:

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Template must persist all configuration values to database (hyperparameters, GPU settings, checkpoint frequency) | Data persistence requirement | Configuration preview in modal shows exactly what will be saved; job creation form must load all values accurately |
| Usage count calculation: Count of jobs created using this template | Analytics algorithm | Display "0 uses" for newly created templates; increment after job created from template |
| Success rate calculation for template: (completed_jobs_from_template / total_jobs_from_template) × 100% | Analytics algorithm | Tooltip explaining calculation; update as template-derived jobs complete |
| Average metrics calculation: Mean of cost/duration/loss across all jobs from template | Analytics algorithm | Display "N/A" if no jobs completed yet; update after each job completion |
| Template deletion must not affect jobs already created from template | Data integrity requirement | Confirmation modal explicitly states: "Jobs created from this template will not be affected" |
| System default templates cannot be edited or deleted by users | Permission requirement | Hide Edit/Delete options on default templates; show "System Default" badge for clarity |
| Template visibility controls who can see template: Private (creator only) vs Team (all workspace members) | Access control requirement | Filter includes "My Templates" vs "Team Templates"; visibility badge on each card |
| Duplicate name validation: No two templates can have same name within workspace | Data validation | Real-time validation on name field; error message: "Template name already exists. Please choose a different name." |

## Estimated Page Count
**6 pages** (exceeds minimum of 3)

**Rationale**:
- Page 1 (Template Library): Main browsing interface with grid/list view, filters, and search - central hub for template discovery and selection
- Page 2 (Job Creation from Template): Pre-filled job creation workflow - demonstrates template reuse value
- Page 3 (Template Creation Modal): Essential workflow for saving configurations as templates
- Page 4 (Template Details): Deep dive into template analytics and related jobs - supports informed template selection
- Page 5 (Edit Template Modal): Maintenance workflow for updating template metadata
- Page 6 (Delete Confirmation Modal): Safety workflow for destructive action

Each page serves distinct goals in template lifecycle: create → browse/discover → use → view details → edit → delete. Comprehensive workflow coverage ensures usable system for building and maintaining organizational knowledge.

=== END PROMPT FR: FR5.2.2 ===

---

**End of Stage 5 Wireframe Prompts**
