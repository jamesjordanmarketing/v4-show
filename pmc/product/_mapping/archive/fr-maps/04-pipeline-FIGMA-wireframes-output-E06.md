# LoRA Pipeline - Stage 6 Model Quality Validation - Figma Wireframe Prompts
**Version:** 1.0  
**Date:** December 18, 2025  
**Section:** E06 - Model Quality Validation  
**Stage:** Stage 6 — Model Quality Validation

This document contains Figma-ready wireframe prompts for all functional requirements in Stage 6 (Model Quality Validation). Each prompt is self-contained and can be pasted directly into Figma Make AI to generate wireframes.

---

=== BEGIN PROMPT FR: FR6.1.1 ===

Title
- FR6.1.1 Wireframes — Stage 6 — Model Quality Validation — Calculate Perplexity Improvement

Context Summary
- FR6.1.1 implements comprehensive automated perplexity evaluation during training finalization, testing both baseline Llama 3 70B and trained models on validation datasets, calculating improvement percentages, and providing objective quality metrics that serve as primary gates for production deployment. This feature enables engineers to quantify model improvements objectively (targeting ≥30% perplexity improvement) and gain confidence in delivery quality through visual comparisons, quality tier badges, and exportable validation reports. The interface must clearly communicate technical metrics while providing actionable insights for both technical and business stakeholders.

Journey Integration
- Stage 6 user goals: Validate model quality through objective metrics, gain confidence for client delivery, demonstrate measurable ROI, celebrate training success
- Key emotions: Anticipation during validation, relief when metrics exceed thresholds, pride in quantifiable achievements, confidence for client presentations
- Progressive disclosure levels: Basic users see overall improvement badges and recommendations; advanced users access detailed breakdowns, per-conversation metrics, and trend analysis; expert users explore validation methodology and statistical distributions
- Persona adaptations: AI Engineers need technical details and debugging context; Business Owners need executive summaries and ROI justification; Quality Analysts need validation methodology and audit trails

### Journey-Informed Design Elements
- User Goals: Validate model quality objectively, demonstrate measurable improvements, build confidence for delivery, generate client-ready proof
- Emotional Requirements: Relief when quality gates pass, celebration of achievements, confidence in objective metrics, pride in quantifiable success
- Progressive Disclosure:
  * Basic: Overall improvement percentage, quality tier badge, pass/fail status
  * Advanced: Category breakdowns, per-conversation metrics, detailed methodology
  * Expert: Statistical analysis, validation methodology, trend tracking, team analytics
- Success Indicators: Quality gates passed, production-ready badge achieved, validation reports generated, client proof obtained
  
Wireframe Goals
- Display perplexity improvement metrics prominently with clear quality tier classification
- Provide visual comparison between baseline and trained model performance
- Enable quality gate decision workflow with conditional approval requirements
- Present actionable recommendations for models below quality thresholds
- Support export of comprehensive validation reports for client delivery
- Track perplexity trends across multiple training runs for continuous improvement
- Integrate perplexity results with other validation metrics (EI, knowledge retention) for holistic quality assessment

Explicit UI Requirements (from acceptance criteria)

**Automatic Triggering & Status Display:**
- Job status indicator updates to "running_validation" with substatus "Calculating perplexity..."
- Duration estimate displayed: "10-20 minutes for 48 validation conversations"
- Progress indicator shows validation is in progress (not stuck)

**Results Display - Perplexity Section Card:**
- Card header: "Model Quality: Perplexity Improvement"
- Large prominent quality tier badge with icon and tier text (Production Ready / Acceptable Quality / Below Threshold)
- Three-column results grid:
  * Column 1 - Baseline Perplexity: Large number "24.5", subtitle "Llama 3 70B without fine-tuning", info tooltip explaining "Lower perplexity = better. Measures model surprise"
  * Column 2 - Trained Perplexity: Large number "16.8" (color: green if improved, red if regressed), subtitle "Llama 3 70B + LoRA adapters", difference indicator "↓ 7.7 points lower"
  * Column 3 - Improvement: Huge bold number "31.4%" (color-coded), quality tier label "Production Ready", target indicator "Target: ≥30%" with met/not met status
- Interpretation text: "31% lower perplexity indicates significantly better prediction quality" and "This model is ready for production deployment and client delivery."

**Perplexity Comparison Chart:**
- Bar chart visualization with X-axis showing "Baseline" vs "Trained", Y-axis showing perplexity score (0-30 scale)
- Baseline bar: Blue, height 24.5
- Trained bar: Green, height 16.8
- Red downward improvement arrow showing 31.4% reduction
- Horizontal dashed target line at 30% improvement threshold (production-ready marker)
- Interactive hover to show exact values
- Click to expand full-screen view
- Export button to download chart as PNG for reports

**Detailed Metrics Expandable Section:**
- "View Detailed Perplexity Breakdown" link/button
- Expanded section shows:
  * Total validation pairs evaluated: 187 pairs across 48 conversations
  * Total tokens scored: 23,456 tokens
  * Average tokens per response: 125 tokens
  * Baseline metrics table: Total loss, Average loss, Perplexity calculation
  * Trained metrics table: Total loss, Average loss, Perplexity calculation
  * Improvement metrics: Absolute loss reduction, Relative percentage reduction
  * Per-conversation min/max: Best improvement conversation #42 (45%), Worst improvement conversation #7 (18%)
  * Link to per-conversation breakdown (FR6.1.2)

**Quality Gate Decision Workflow:**
- Conditional banner based on quality tier:
  * Below Threshold: Warning banner "⚠️ Model Quality Below Threshold" with red/orange styling
    - Message: "Perplexity improvement (X%) below target (30%). This model may not meet production standards."
    - Recommendations section with bulleted actions: "Add more training data (+20-30 conversations)", "Retrain with different hyperparameters (try Conservative preset)", "Review training data quality", "Extend training (add 1-2 epochs)"
    - Action buttons: [Retry Training with Suggestions] [Review Training Data] [Accept Anyway (with justification)]
    - Requires manager approval checkbox/workflow for delivery
  * Acceptable: Caution banner "Model Quality Acceptable (20-30% improvement)" with yellow styling
    - Message: "Meets minimum standards but below optimal threshold."
    - Recommendation: "Review with team before client delivery. Consider A/B testing or gradual rollout."
  * Production Ready: Success banner "✓ Model Quality Exceeds Standards" with green styling
    - Message: "Ready for immediate production deployment."
    - Auto-approve indicator (no manual review needed)

**Export Perplexity Data:**
- "Export Perplexity Report" button prominently displayed
- PDF report generation includes: Cover page with job name, training date, quality tier badge; Executive summary with overall improvement, quality tier, recommendation; Detailed metrics with baseline/trained perplexity, improvement %, validation set details; Per-conversation breakdown table (top/bottom 10 if >20 conversations); Visual charts (bar chart, improvement trend chart if multiple runs); Methodology explanation; Validation set composition
- CSV export option for raw data: Columns include Job ID, Baseline Perplexity, Trained Perplexity, Improvement %, Quality Tier, Validation Pairs, Total Tokens, Calculated At
- Export included in validation artifact bundle as training-job-{id}-validation-report.pdf

**Perplexity Trend Tracking:**
- Trend chart displays improvement % over time (X-axis: job creation date, Y-axis: improvement %)
- Comparison indicators: "Previous run: 28% improvement, This run: 31% improvement (↑ 3 percentage points)"
- Optimal configuration highlight: "Best result: 34% improvement (Balanced preset, 3 epochs, job #abc123)"
- Insight callout: "💡 Insight: Balanced preset consistently achieves 30-35% improvement for this training file. Recommend using Balanced for future runs."

**Team Analytics (for managers/leads):**
- Aggregate metrics across team: Average perplexity improvement 28.5% across 47 completed jobs
- Distribution pie/bar chart: Production-ready (≥30%): 23 jobs (49%), Acceptable (20-29%): 19 jobs (40%), Below threshold (<20%): 5 jobs (11%)
- Pattern identification callouts: Best-performing training files, Problematic configurations, Improvement correlations with training data size
- Team goals display: Target "75% of jobs reach production-ready tier", Current progress indicator, Action plan suggestions

Interactions and Flows
- User navigates to completed training job details page → Perplexity Section automatically visible (no additional navigation needed)
- Click "View Detailed Perplexity Breakdown" → Section expands smoothly to reveal detailed metrics and calculations
- Hover over quality badge → Tooltip explains quality tier criteria and thresholds
- Hover over bar chart bars → Display exact perplexity values with labels
- Click bar chart → Opens full-screen modal with larger visualization and export options
- Click "Export Perplexity Report" → Displays format options (PDF / CSV) → Generates report → Triggers download
- If below threshold: Click "Retry Training with Suggestions" → Navigates to job configuration page with pre-filled recommended adjustments
- If below threshold and manager approval required: Click "Accept Anyway" → Opens justification modal → Submit with reason → Approval workflow triggered
- Click per-conversation link → Navigates to FR6.1.2 Category Analysis page with conversation-level breakdown
- Click trend chart data point → Displays job details from that specific training run

Visual Feedback
- Loading state while perplexity calculation in progress: Animated spinner, "Calculating perplexity..." text, estimated duration countdown
- Success state when calculation completes: Smooth transition to results display, green checkmark animation if production-ready
- Quality badge uses distinct color coding: Green (production-ready), Yellow (acceptable), Red (below threshold)
- Improvement percentage uses size hierarchy: Huge for main improvement %, medium for sub-metrics
- Arrows indicate direction of improvement: Downward arrow for perplexity reduction (good), upward arrow for improvement percentage increase
- Chart uses color coding: Blue for baseline, Green for trained (if improved), Red for trained (if regressed)
- Banner alerts use appropriate severity colors: Red/orange for warnings, yellow for cautions, green for success
- Export button shows loading spinner during report generation

Accessibility Guidance
- Quality tier badge includes both icon and text label for screen readers: aria-label="Production Ready: Model exceeds quality threshold"
- All numerical values have semantic labels: aria-label="Baseline perplexity: 24.5", aria-label="Trained perplexity: 16.8", aria-label="Improvement: 31.4 percent"
- Interactive chart elements keyboard accessible: Tab to focus bars, Enter to expand full-screen, Arrow keys to navigate data points
- Color coding supplemented with text labels (not color-alone): "Production Ready" text in addition to green badge color
- Expandable sections keyboard accessible: Tab to focus "View Detailed Breakdown" button, Enter/Space to expand/collapse
- Tooltips keyboard-accessible and announce on focus
- Focus indicators visible on all interactive elements (buttons, links, chart elements)
- Alt text for chart exports: "Bar chart comparing baseline perplexity 24.5 to trained perplexity 16.8, showing 31.4% improvement"
- ARIA live regions announce calculation status updates: "Perplexity calculation in progress", "Calculation complete"

Information Architecture
- Perplexity Section Card positioned prominently on job details page (top section after job header)
- Hierarchy: Quality badge (most prominent) → Overall improvement percentage → Three-column detailed metrics → Comparison chart → Detailed breakdown (expandable)
- Related sections grouped logically: Perplexity metrics → Quality gate workflow → Export actions → Trend tracking
- Conditional sections displayed based on state: Quality gate recommendations only shown if below threshold, Manager approval only if required, Trend chart only if multiple runs exist
- Integration with other validation metrics: Perplexity section is first of multiple validation cards (Perplexity → EI Benchmarks → Knowledge Retention → Brand Voice), with combined quality scorecard at top showing all metrics

Page Plan
1. **Training Job Details - Validation Results Screen**
   - Purpose: Display perplexity improvement metrics and quality gate status for completed training job
   - Components: Perplexity Section Card with quality badge, three-column metrics grid, comparison bar chart, expandable detailed breakdown, quality gate workflow banners, export actions, trend chart (if applicable)
   - States: Loading (calculation in progress), Success (production-ready), Warning (acceptable quality), Error (below threshold, requires action)
   - Navigation: Links to Category Analysis (FR6.1.2), Links to other validation sections (EI, Knowledge, Voice), Actions for retry training or manager approval

2. **Perplexity Report Preview/Export Modal**
   - Purpose: Preview generated PDF validation report before download, select export format
   - Components: Format selector (PDF / CSV), Report preview pane showing cover page and key sections, Download button, Cancel button
   - States: Generating (loading), Preview ready, Downloading
   - Navigation: Close modal to return to job details, Download to initiate file download

3. **Quality Gate Manager Approval Workflow Screen** (conditional, only if below threshold)
   - Purpose: Manager reviews perplexity metrics and justification for approving delivery despite below-threshold quality
   - Components: Perplexity metrics summary, Quality concern details, Justification text area (required), Risk acknowledgment checklist, Approve/Reject buttons
   - States: Review pending, Approved, Rejected
   - Navigation: Return to job details after approval decision, Email notifications to requester

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Quality Badge → Displays quality tier (production-ready ≥30%, acceptable 20-29%, below threshold <20%) → FR Acceptance Criterion: Quality Threshold Classification"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Automatic Perplexity Calculation runs during training finalization**
- Source: US6.1.1
- Screen: Training Job Details - Validation Results
- Components: Status indicator "running_validation", Substatus text "Calculating perplexity...", Duration estimate "10-20 minutes", Progress spinner
- States: In-progress (validation running), Completed (validation finished)
- Notes: Provides user confidence that validation is active and not stuck

**US Acceptance Criterion 2: Test baseline Llama 3 70B and trained model on same validation set**
- Source: US6.1.1
- Screen: Training Job Details - Validation Results (Detailed Breakdown section)
- Components: Validation set details text "48 conversations, 187 pairs, 23,456 tokens", Methodology explanation text
- States: Expanded (when detailed breakdown opened)
- Notes: Communicates validation methodology and sample size for statistical confidence

**US Acceptance Criterion 3: Calculate improvement percentage: ((baseline - trained) / baseline) × 100%**
- Source: US6.1.1
- Screen: Training Job Details - Validation Results
- Components: Improvement percentage display "31.4%" (large, bold), Calculation shown in detailed breakdown
- States: Default (always visible if calculation complete)
- Notes: Primary quality metric, most prominent visual element in card

**FR Acceptance Criterion 1: Quality Threshold Classification (≥30% production-ready, 20-29% acceptable, <20% below threshold)**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results
- Components: Quality tier badge with icon and text, Color-coded badge (green/yellow/red), Quality tier label text
- States: Production Ready (≥30%), Acceptable Quality (20-29%), Below Threshold (<20%)
- Notes: Instantly communicates quality status, drives quality gate decisions

**FR Acceptance Criterion 2: Results Display on Job Details Page - Perplexity Section Card**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results
- Components: Card header, Quality badge, Three-column grid (Baseline / Trained / Improvement), Interpretation text
- States: Default (results displayed)
- Notes: Comprehensive yet scannable layout for both technical and non-technical users

**FR Acceptance Criterion 3: Perplexity Comparison Chart**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results
- Components: Bar chart with baseline (blue) and trained (green) bars, Improvement arrow, Target threshold line, Interactive hover tooltips, Expand full-screen button, Export PNG button
- States: Default view, Hover (tooltip visible), Full-screen expanded
- Notes: Visual representation aids comprehension, especially for non-technical stakeholders

**FR Acceptance Criterion 4: Quality Gate Decision Workflow**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results
- Components: Conditional banner (warning/caution/success), Recommendations list, Action buttons [Retry Training with Suggestions] [Review Training Data] [Accept Anyway], Manager approval checkbox/workflow UI
- States: Below Threshold (warning banner, actions required), Acceptable (caution banner, review recommended), Production Ready (success banner, auto-approved)
- Notes: Guides users through quality-based decision making with clear actions

**FR Acceptance Criterion 5: Export Perplexity Data - PDF and CSV reports**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results; Perplexity Report Export Modal
- Components: "Export Perplexity Report" button, Format selector modal (PDF/CSV), Report preview pane, Download button
- States: Export options modal open, Generating report (loading), Download ready
- Notes: Enables client delivery and stakeholder communication with professional reports

**FR Acceptance Criterion 6: Perplexity Trend Tracking across multiple training runs**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results (Trend Tracking section)
- Components: Line chart showing improvement % over time, Comparison text "Previous run: 28%, This run: 31% (↑ 3pp)", Optimal configuration highlight, Insight callout box
- States: Visible only if multiple training runs exist for same training file
- Notes: Enables continuous improvement and configuration optimization

**FR Acceptance Criterion 7: Team Analytics for aggregate performance**
- Source: FR6.1.1
- Screen: Training Job Details - Validation Results (Team Analytics section, manager view)
- Components: Aggregate metrics card, Distribution chart (pie/bar), Pattern identification callouts, Team goals progress indicator
- States: Visible only for managers/leads with team-level permissions
- Notes: Provides organizational insights and identifies systemic issues/successes

Non-UI Acceptance Criteria

**FR Criterion: Automatic Triggering during finalization stage**
- Impact: Ensures validation runs without manual user action
- UI Hint: Status indicator shows "running_validation" automatically when finalization begins

**FR Criterion: Validation Set Selection - 80/20 split, deterministic, stratified sampling**
- Impact: Ensures consistent validation results across runs, representative sampling
- UI Hint: Display validation set composition in detailed breakdown (48 conversations, stratified by persona/arc/topic)

**FR Criterion: Baseline and Trained Model Evaluation using identical methodology**
- Impact: Ensures fair comparison, eliminates methodological bias
- UI Hint: Methodology explanation in detailed breakdown confirms identical evaluation process

**FR Criterion: Store perplexity data in database for trend tracking**
- Impact: Enables historical analysis and trend visualization
- UI Hint: Trend chart requires multiple runs stored in database to display

**FR Criterion: Manager approval workflow integration**
- Impact: Enforces governance for below-threshold deliveries
- UI Hint: Approval workflow modal/screen for managers when user requests "Accept Anyway"

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - Validation Results Screen (main interface showing perplexity metrics, quality gates, and export actions)
  2. Perplexity Report Preview/Export Modal (format selection and preview before download)
  3. Quality Gate Manager Approval Workflow Screen (conditional, only if below threshold and approval requested)
- Rationale: Minimum 3 screens required to cover primary results display (1), export workflow (2), and conditional approval workflow (3). Additional states and expandable sections handled within these core screens through progressive disclosure.

=== END PROMPT FR: FR6.1.1 ===

---

=== BEGIN PROMPT FR: FR6.1.2 ===

Title
- FR6.1.2 Wireframes — Stage 6 — Model Quality Validation — Perplexity by Category Analysis

Context Summary
- FR6.1.2 implements granular perplexity analysis segmented by conversation scaffolding categories (persona types, emotional arcs, training topics), enabling data-driven iteration and targeted dataset improvements. Engineers can identify which personas, emotional arcs, or topics show lower improvement percentages, receive actionable recommendations for training data augmentation (e.g., "Add 10+ more Pragmatic Skeptic conversations"), and visualize performance through persona×emotional-arc heatmaps. This feature transforms aggregate perplexity metrics into strategic insights that guide training file optimization, ensuring balanced model performance across diverse conversation types.

Journey Integration
- Stage 6 user goals: Understand quality patterns at granular level, identify data gaps requiring attention, optimize future training files strategically, build expertise through pattern recognition
- Key emotions: Curiosity about performance distribution, satisfaction when patterns emerge, motivation to improve weak areas, confidence in data-driven decisions
- Progressive disclosure levels: Basic users see category summaries with best/worst performers; advanced users access heatmaps and correlation analysis; expert users export detailed per-conversation data and statistical distributions
- Persona adaptations: AI Engineers need technical breakdowns and debugging insights; Quality Analysts need pattern identification and recommendations; Technical Leads need team-wide trends and optimization strategies

### Journey-Informed Design Elements
- User Goals: Identify quality patterns by category, discover data gaps, receive actionable recommendations, optimize training data strategically
- Emotional Requirements: Curiosity satisfaction through exploratory analysis, confidence in data-driven insights, motivation from clear improvement paths
- Progressive Disclosure:
  * Basic: Category summary tables with best/worst indicators, high-level recommendations
  * Advanced: Heatmap visualizations, correlation analysis, per-conversation drill-downs
  * Expert: Statistical distributions, confidence intervals, cross-run comparisons, raw data exports
- Success Indicators: Patterns identified successfully, actionable recommendations generated, optimization strategies validated through subsequent runs

Wireframe Goals
- Display perplexity performance segmented by persona, emotional arc, and training topic
- Visualize persona×emotional-arc performance through interactive heatmap
- Identify and flag underperforming categories with clear warnings
- Generate prioritized, actionable recommendations for training data improvements
- Enable per-conversation drill-down to investigate specific quality issues
- Support comparison across multiple training runs to validate improvement strategies
- Export detailed category analysis for documentation and team knowledge sharing

Explicit UI Requirements (from acceptance criteria)

**Category Analysis Overview:**
- Tab navigation or section headers: "By Persona" | "By Emotional Arc" | "By Topic" | "Heatmap" | "Recommendations"
- Each category view shows aggregate analysis with drill-down capability

**Perplexity by Persona Table:**
- Table with columns: Persona | Baseline PPL | Trained PPL | Improvement | Count
- Example rows:
  * "Anxious Investor | 26.3 | 15.2 | 42.2% ↑ | 12 convos" (green highlight, 🏆 Best badge)
  * "Pragmatic Skeptic | 24.1 | 18.5 | 23.2% | 8 convos" (red highlight, ⚠️ Needs Attention badge)
  * "Hopeful Planner | 23.8 | 16.1 | 32.4% | 10 convos"
  * "Overwhelmed Procrastinator | 27.5 | 19.8 | 28.0% | 9 convos"
  * "Detail-Oriented Analyzer | 22.9 | 15.7 | 31.4% | 9 convos"
- Visual indicators:
  * Green highlight: Improvement ≥35% (excellent)
  * Yellow: 25-34% (good)
  * Red: <25% (needs improvement)
  * 🏆 Best badge next to highest improvement persona
  * ⚠️ Needs Attention badge next to lowest improvement persona
- Sort controls: Dropdown "Sort by: [Improvement ▼] [Baseline PPL] [Trained PPL] [Count]"
- Click row → Drill down to per-conversation details for that persona

**Perplexity by Emotional Arc Table:**
- Similar structure to persona table
- Columns: Emotional Arc | Baseline PPL | Trained PPL | Improvement | Count
- Example rows:
  * "Triumph | 23.1 | 15.8 | 31.6% | 14 convos"
  * "Struggle-to-Success | 25.7 | 17.2 | 33.1% | 12 convos"
  * "Anxiety | 27.2 | 18.9 | 30.5% | 11 convos"
  * "Skepticism-to-Trust | 24.5 | 16.3 | 33.5% | 11 convos"
- Flagging for underperforming arcs: If improvement <25%, display alert icon and message: "Anxiety arc: 22% improvement (below average 31%). Consider adding 5-10 more Anxiety conversations to improve model performance on anxious clients."

**Perplexity by Training Topic Table:**
- Columns: Topic | Baseline PPL | Trained PPL | Improvement | Count
- Example rows:
  * "Retirement Planning | 22.5 | 14.9 | 33.8% | 16 convos"
  * "Tax Strategies | 28.3 | 19.1 | 32.5% | 10 convos"
  * "Investment Advice | 24.7 | 16.2 | 34.4% | 12 convos"
  * "Debt Management | 26.1 | 18.4 | 29.5% | 10 convos"
- Topic-specific insight callouts: High baseline perplexity indicator with explanation "Inherently complex topic - focus on improvement % not absolute perplexity"
- Flag topics with low improvement (<28%): "Debt Management: 29.5% improvement (below 30% target). Consider: Adding 5+ more debt-focused conversations, Reviewing quality of existing debt conversations, Ensuring diverse debt scenarios"

**Visual Heatmap: Persona × Emotional Arc:**
- Matrix visualization with:
  * Rows: All personas (5-8 personas)
  * Columns: All emotional arcs (4-6 arcs)
  * Cells: Color-coded by improvement %
- Cell color scale:
  * Dark green: ≥40% improvement
  * Light green: 35-39%
  * Yellow: 30-34%
  * Orange: 25-29%
  * Red: <25%
  * Gray: No data (persona-arc combination not in validation set)
- Cell contents: Display improvement % "42%", show conversation count "(3)"
- Hover tooltip: "Anxious Investor + Triumph: 42.2% improvement, 3 conversations, Baseline: 26.8, Trained: 15.5"
- Quick visual insights:
  * Green clusters: Model performs well
  * Red cells: Need more training data for this combination
  * Gray cells: Combinations not represented in training/validation
- Interactive: Click cell → View specific conversations in that category
- Filter toggle: "Show only cells with <30% improvement" (highlights problem areas)

**Data Gap Identification:**
- Callout box displaying coverage analysis:
  * Conversations per persona: Min: 7, Max: 15, Average: 10
  * Conversations per emotional arc: Min: 9, Max: 15, Average: 11
  * Persona-arc combinations with <3 conversations: List with warning icons
- Warning messages: "⚠️ Low Coverage: Pragmatic Skeptic + Anxiety (2 conversations) - Model may not generalize well to this combination due to limited training data"

**Actionable Recommendations Section:**
- Prominent section header: "📊 Data-Driven Recommendations for Next Training Run"
- Numbered list of 5-10 recommendations, prioritized by impact
- Priority badges: Critical (red), High Impact (orange), Medium Impact (yellow)
- Recommendation types with examples:
  * Low Improvement Categories: "Add 10+ more 'Pragmatic Skeptic' conversations to improve model performance for this client type (currently 23.2% improvement, target ≥30%)"
  * Data Gaps: "Low coverage for 'Pragmatic Skeptic + Anxiety' (only 2 conversations). Add 5+ conversations with this combination to improve generalization."
  * Best Practices: "'Anxious Investor + Triumph' achieves 42.2% improvement (best performance). This combination serves as quality benchmark. Use similar conversation structures for other categories."
  * Sample Size Issues: "Only 8 'Pragmatic Skeptic' conversations in validation set. Consider adding more to increase statistical confidence."
- Each recommendation includes: Issue description, Current metrics, Target metrics, Specific action, Expected impact

**Category Analysis Export:**
- "Export Category Analysis" button
- CSV export includes:
  * Persona-level aggregations: persona, baseline_ppl, trained_ppl, improvement_pct, conversation_count
  * Emotional Arc-level: emotional_arc, baseline_ppl, trained_ppl, improvement_pct, conversation_count
  * Topic-level: topic, baseline_ppl, trained_ppl, improvement_pct, conversation_count
  * Persona-Arc Matrix: All combinations with improvement scores
  * Per-Conversation Detail: conversation_id, persona, emotional_arc, topic, baseline_ppl, trained_ppl, improvement_pct
- Filename: training-job-{id}-category-analysis-{timestamp}.csv
- PDF report includes: Summary tables, full-color heatmap, recommendations section, statistical analysis

**Insights for Future Training:**
- Insight callout boxes with lightbulb icon 💡
- Historical insights: "Across all training runs for this file: Anxious Investor persona: Average 38% improvement (consistently strong), Pragmatic Skeptic persona: Average 24% improvement (consistently weak - needs more data)"
- Proactive suggestions: "💡 Insight: Based on historical data, 'Pragmatic Skeptic' conversations typically show lower improvement. Consider adding 15+ Pragmatic Skeptic conversations (currently have 8) to achieve optimal results."
- Recommended distributions: "Recommended persona distribution for optimal quality: Anxious Investor: 15-20%, Pragmatic Skeptic: 20-25% (needs more to reach parity), Hopeful Planner: 15-20%, ..."

**Comparison Across Training Runs:**
- Trend charts displayed if multiple jobs exist with same training file
- "Perplexity Improvement by Persona Over Time" line graph: X-axis: Job date, Y-axis: Improvement %, Separate line per persona
- Improvement/regression indicators: "Pragmatic Skeptic improvement increased from 22% (first run) to 28% (this run) after adding 10 more conversations" (green highlight), OR "Anxious Investor dropped from 42% to 35% - investigate why (different hyperparameters? data quality change?)" (orange alert)
- Strategy validation: "Adding 10 Pragmatic Skeptic conversations improved this persona's performance by +6 percentage points. Strategy validated." (green checkmark)

Interactions and Flows
- User navigates from overall perplexity results (FR6.1.1) → Clicks "View Per-Category Breakdown" link → Category Analysis screen loads
- Tab navigation: Click "By Persona" / "By Emotional Arc" / "By Topic" / "Heatmap" / "Recommendations" tabs → Respective view displays
- Sort category tables: Click "Sort by: Improvement" dropdown → Select sort criterion → Table reorders
- Drill down to conversations: Click persona/arc/topic row → Filters per-conversation detail table to show only that category
- Heatmap interaction: Hover over cell → Tooltip displays details; Click cell → Filters to show specific conversations for that persona-arc combo
- Filter heatmap: Toggle "Show only <30% improvement" → Heatmap dims non-problematic cells, highlights problem areas
- Click recommendation action: Click "Add 10+ more Pragmatic Skeptic conversations" → Opens training file editor or new training file creation flow with pre-populated guidance
- Export analysis: Click "Export Category Analysis" → Format options modal (CSV/PDF) → Download initiated
- View trend comparison: Click persona in trend chart legend → Highlights/isolates that persona's line; Click data point → Displays job details from that run

Visual Feedback
- Loading state while category analysis computes: Skeleton screens for tables and heatmap, "Analyzing category performance..." text
- Table rows with best performance: Green highlight background, 🏆 trophy icon
- Table rows with worst performance: Red/orange highlight background, ⚠️ warning icon
- Heatmap cells use intuitive color gradient: Dark green (excellent) → Light green → Yellow → Orange → Red (poor), Gray for no data
- Hover effects: Table rows highlight on hover (subtle background color change), Heatmap cells enlarge slightly and show border on hover
- Recommendation priority badges: Colored badges (Critical: Red, High: Orange, Medium: Yellow) with icons
- Insight callouts: Lightbulb icon 💡, light blue background box, border accent
- Trend chart lines: Color-coded per persona (consistent with heatmap colors), Data points clickable with hover highlights
- Export button: Shows loading spinner during report generation, Success checkmark when download ready

Accessibility Guidance
- Tab navigation keyboard accessible: Arrow keys or Tab to switch between "By Persona" / "By Emotional Arc" / "By Topic" tabs
- Tables keyboard navigable: Tab to focus rows, Enter to drill down, Arrow keys to navigate cells
- Heatmap keyboard accessible: Tab to focus cells, Arrow keys to navigate grid, Enter to view cell details
- Screen reader announcements for table headers: "Persona table. Column headers: Persona, Baseline Perplexity, Trained Perplexity, Improvement Percentage, Conversation Count"
- Heatmap cell labels: aria-label="Anxious Investor and Triumph: 42.2% improvement, 3 conversations"
- Color coding supplemented with text: Red cells include ⚠️ icon and "Needs Improvement" text (not color alone)
- Sort controls keyboard accessible: Tab to focus dropdown, Enter/Space to open, Arrow keys to select, Enter to confirm
- Recommendations list semantic HTML: Ordered list <ol> with priority badges as supplementary information
- Focus indicators visible on all interactive elements
- ARIA live regions announce dynamic updates: "Table sorted by improvement percentage descending", "Heatmap filtered to show only problem areas"

Information Architecture
- Category Analysis positioned as deep-dive follow-up to overall perplexity results (accessible via link from FR6.1.1)
- Tab-based navigation for different category views (flat structure, no sub-tabs)
- Primary hierarchy: Category tables (personas, arcs, topics) → Heatmap visualization → Recommendations → Export actions
- Conditional elements: Trend comparison charts only visible if multiple training runs exist, Data gap warnings only if coverage issues detected
- Related to overall validation flow: Perplexity Overall (FR6.1.1) → Category Analysis (FR6.1.2) → Per-Conversation Details (drill-down)

Page Plan
1. **Category Analysis Dashboard Screen**
   - Purpose: Display granular perplexity analysis segmented by persona, emotional arc, and topic with actionable insights
   - Components: Tab navigation (By Persona | By Emotional Arc | By Topic | Heatmap | Recommendations), Category tables with sorting, Persona×Emotional Arc heatmap, Data gap identification callouts, Recommendations list with priority badges, Export actions
   - States: Default view (persona table), Sorted (by improvement/baseline/trained/count), Filtered (heatmap showing only problem areas), Drill-down (showing specific category conversations)
   - Navigation: Back to overall perplexity results (FR6.1.1), Drill down to per-conversation details, Export to CSV/PDF

2. **Per-Conversation Detail Drill-Down View** (modal or side panel)
   - Purpose: Show detailed perplexity metrics for individual conversations within a selected category
   - Components: Filtered conversation list table (conversation_id, persona, emotional_arc, topic, baseline_ppl, trained_ppl, improvement_pct), Conversation metadata display, Link to view full conversation content
   - States: Filtered by persona, Filtered by emotional arc, Filtered by topic, Filtered by persona-arc combination (from heatmap click)
   - Navigation: Close to return to category dashboard, Click conversation to view full details

3. **Category Analysis Export Preview/Download Modal**
   - Purpose: Preview and download comprehensive category analysis report
   - Components: Format selector (CSV/PDF), Preview pane showing report structure, Download button, Cancel button
   - States: Generating report (loading), Preview ready, Downloading
   - Navigation: Close modal to return to dashboard, Download to initiate file download

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Perplexity by Persona Table with best/worst highlighting**
- Source: US6.1.2
- Screen: Category Analysis Dashboard
- Components: Persona table with 5 columns (Persona, Baseline PPL, Trained PPL, Improvement, Count), Green/yellow/red row highlights, 🏆 Best badge, ⚠️ Needs Attention badge, Sort dropdown
- States: Default (sorted by improvement descending), Sorted (by user selection), Row hover
- Notes: Enables quick identification of personas needing attention

**US Acceptance Criterion 2: Perplexity by Emotional Arc Table with underperformance flagging**
- Source: US6.1.2
- Screen: Category Analysis Dashboard
- Components: Emotional Arc table, Alert icons for arcs with <25% improvement, Recommendation callout text
- States: Default, Flagged (if underperforming arcs exist)
- Notes: Surfaces emotional arc coverage gaps requiring data augmentation

**US Acceptance Criterion 3: Perplexity by Training Topic Table with topic-specific insights**
- Source: US6.1.2
- Screen: Category Analysis Dashboard
- Components: Topic table, High baseline perplexity indicators with explanatory tooltips, Low improvement flags with recommendations
- States: Default, Flagged (if topics below 28% improvement)
- Notes: Guides topic-specific training data improvements

**US Acceptance Criterion 4: Visual Heatmap (Persona × Emotional Arc) with color coding**
- Source: US6.1.2
- Screen: Category Analysis Dashboard (Heatmap tab)
- Components: Matrix grid (personas as rows, emotional arcs as columns), Color-coded cells (dark green to red gradient), Cell content (improvement %, conversation count), Hover tooltips, Click interaction for drill-down, Filter toggle "Show only <30%"
- States: Default (all cells visible), Filtered (showing only problem areas), Cell hover (tooltip visible), Cell clicked (drill-down view)
- Notes: Provides instant visual identification of strong/weak persona-arc combinations

**FR Acceptance Criterion 1: Data Gap Identification with coverage analysis**
- Source: FR6.1.2
- Screen: Category Analysis Dashboard
- Components: Coverage analysis callout box, Min/max/average conversation counts, Warning messages for combinations with <3 conversations
- States: Visible (if data gaps detected), Hidden (if coverage adequate)
- Notes: Flags insufficient data coverage that may impact model generalization

**FR Acceptance Criterion 2: Actionable Recommendations Generation with prioritization**
- Source: FR6.1.2
- Screen: Category Analysis Dashboard (Recommendations tab)
- Components: Section header "📊 Data-Driven Recommendations", Numbered recommendation list (5-10 items), Priority badges (Critical/High/Medium), Recommendation details (issue, metrics, action, impact)
- States: Default (all recommendations visible), Filtered by priority
- Notes: Transforms analysis into concrete next steps for improvement

**FR Acceptance Criterion 3: Category Analysis Export (CSV and PDF)**
- Source: FR6.1.2
- Screen: Category Analysis Dashboard; Export Preview Modal
- Components: "Export Category Analysis" button, Format selector modal (CSV/PDF), PDF preview showing tables and heatmap, Download button
- States: Export modal closed, Export modal open (format selection), Generating report (loading), Download ready
- Notes: Enables documentation and team knowledge sharing

**FR Acceptance Criterion 4: Insights for Future Training with proactive suggestions**
- Source: FR6.1.2
- Screen: Category Analysis Dashboard
- Components: Insight callout boxes with 💡 icon, Historical performance text, Proactive suggestions, Recommended distributions
- States: Visible (if historical data exists), Hidden (for first training run)
- Notes: Leverages historical patterns to guide optimization strategies

**FR Acceptance Criterion 5: Comparison Across Training Runs with trend charts**
- Source: FR6.1.2
- Screen: Category Analysis Dashboard
- Components: Trend line chart (improvement % over time by persona), Improvement/regression indicators with highlighting, Strategy validation messages
- States: Visible (if multiple runs with same training file exist), Hidden (for single runs)
- Notes: Validates whether data augmentation strategies are effective

Non-UI Acceptance Criteria

**FR Criterion: Category Data Extraction during perplexity calculation**
- Impact: Enables granular analysis without additional computation overhead
- UI Hint: Data populated in tables immediately when category analysis page loads (no additional loading state)

**FR Criterion: Store category performance in perplexity_by_conversation table**
- Impact: Enables per-conversation drill-down and historical trend analysis
- UI Hint: Drill-down view displays per-conversation data; trend charts require historical data storage

**FR Criterion: Query aggregations (GROUP BY persona, emotional_arc, topic)**
- Impact: Efficiently computes category summaries from per-conversation data
- UI Hint: Tables display aggregate metrics; clicking row filters to source conversations

**FR Criterion: Algorithm analyzes patterns and generates prioritized recommendations**
- Impact: Transforms raw data into actionable insights automatically
- UI Hint: Recommendations section populated automatically based on analysis logic

**FR Criterion: System learns from category analysis across multiple jobs (category_performance_history table)**
- Impact: Enables historical insights and proactive suggestions
- UI Hint: Insight callouts reference historical patterns; displayed only if historical data exists

Estimated Page Count
- **3 primary screens:**
  1. Category Analysis Dashboard Screen (main interface with tabs for Persona/Arc/Topic tables, heatmap, recommendations)
  2. Per-Conversation Detail Drill-Down View (modal or side panel showing filtered conversations for a selected category)
  3. Category Analysis Export Preview/Download Modal (format selection and preview)
- Rationale: Minimum 3 screens required to cover primary category analysis interface (1), drill-down details (2), and export workflow (3). Multiple category views (persona, arc, topic, heatmap) handled through tab navigation within single screen.

=== END PROMPT FR: FR6.1.2 ===

---

=== BEGIN PROMPT FR: FR6.2.1 ===

Title
- FR6.2.1 Wireframes — Stage 6 — Model Quality Validation — Run Emotional Intelligence Benchmarks

Context Summary
- FR6.2.1 implements comprehensive emotional intelligence evaluation using a curated 50-scenario test suite covering empathy detection, emotional awareness, supportive responses, and conflict handling. The system generates responses from both baseline and trained models, scores them across empathy, clarity, and appropriateness dimensions using automated LLM-as-judge methodology (with human validation sampling), and calculates aggregate improvements targeting ≥40% for exceptional EI. This feature provides objective EI metrics for client proof and sales enablement, presenting before/after examples that demonstrate tangible quality improvements in financial advisor emotional intelligence capabilities.

Journey Integration
- Stage 6 user goals: Demonstrate emotional intelligence improvements to clients, validate brand personality acquisition, generate compelling before/after examples for sales, gain confidence in client-facing AI quality
- Key emotions: Excitement when EI scores exceed expectations, pride in qualitative improvements, confidence for client presentations, satisfaction with brand voice acquisition
- Progressive disclosure levels: Basic users see overall EI scores and quality badges; advanced users access dimension breakdowns (empathy/clarity/appropriateness) and category analysis; expert users review individual scenario responses and scoring methodology
- Persona adaptations: Business Owners need client-ready proof and ROI messaging; Quality Analysts need detailed scoring breakdowns and methodology validation; AI Engineers need scenario-level debugging and regression analysis

### Journey-Informed Design Elements
- User Goals: Validate emotional intelligence acquisition, generate client-ready demonstrations, quantify brand personality improvements, build sales materials
- Emotional Requirements: Excitement from qualitative improvements, pride in empathy gains, confidence for client pitches, satisfaction with measurable personality
- Progressive Disclosure:
  * Basic: Overall EI score improvement, quality tier badge, top before/after examples
  * Advanced: Dimension breakdowns (empathy/clarity/appropriateness), category analysis (by scenario type), difficulty-level performance
  * Expert: All 50 scenario responses with detailed scoring, LLM-as-judge methodology, human validation correlation, scoring rationale
- Success Indicators: EI improvement ≥40% (exceptional), compelling before/after examples generated, client-ready sales materials exported

Wireframe Goals
- Display overall EI improvement prominently with quality tier classification (Exceptional/Strong/Moderate/Needs Improvement)
- Visualize dimension breakdowns (empathy, clarity, appropriateness) with radar chart and improvement percentages
- Present top 10 before/after example scenarios showcasing EI improvements with side-by-side comparisons
- Provide category-level analysis (empathy detection, emotional awareness, supportive responses, conflict handling) identifying strengths and weaknesses
- Enable export of comprehensive EI benchmark reports for client presentations and sales enablement
- Integrate EI results with perplexity and other validation metrics for holistic quality assessment

Explicit UI Requirements (from acceptance criteria)

**EI Benchmark Card Header:**
- Card header: "Emotional Intelligence Benchmarks"
- Large quality tier badge based on improvement %: "✓ Exceptional EI" (≥40%, dark green), "✓ Strong EI" (30-39%, green), "⚠ Moderate EI" (20-29%, yellow), "✗ Needs Improvement" (<20%, red)

**Overall EI Score Section:**
- Large prominent display: "3.2/5 → 4.5/5 = 41% improvement"
- Horizontal bar visualization: Baseline (gray bar) vs Trained (green bar) with improvement arrow
- Interpretation text: "Model demonstrates exceptional emotional intelligence improvements. Ideal for client-facing applications."

**Dimension Breakdown (3 sub-cards):**
- Empathy: "3.1/5 → 4.6/5 (48% improvement) ↑" with green highlight
- Clarity: "3.4/5 → 4.5/5 (32% improvement) ↑" with green highlight
- Appropriateness: "3.1/5 → 4.4/5 (42% improvement) ↑" with green highlight
- Radar chart visualization: 3-axis radar (empathy, clarity, appropriateness), Baseline (blue outline), Trained (green filled), Visual shows improvement across all dimensions

**Before/After Examples Section:**
- Display top 10 improvements (highest score delta)
- For each example:
  * Scenario prompt (truncated): "Client anxious about market volatility asks: 'Should I sell everything?'"
  * Baseline response card: Response text, Scores "Empathy: 2/5, Clarity: 3/5, Appropriateness: 3/5, Total: 2.7/5"
  * Trained response card: Response text, Scores "Empathy: 5/5 (validates emotions explicitly), Clarity: 4/5 (clear explanation with specifics), Appropriateness: 5/5 (reassuring yet honest tone), Total: 4.7/5"
  * Improvement indicator: "+2.0 points (74% improvement)" with green highlight
  * Improvement notes: "Trained model explicitly validates anxiety, provides specific portfolio details, offers collaborative problem-solving, uses reassuring language while being realistic"
- "View All 50 Scenarios" expandable link/button

**Category-Level Analysis:**
- Break down by scenario category with improvement percentages:
  * Empathy Detection (15 scenarios): 3.0 → 4.6 (53% improvement) - Strongest area (green highlight)
  * Emotional Awareness (15): 3.3 → 4.5 (36% improvement)
  * Supportive Responses (10): 3.1 → 4.4 (42% improvement)
  * Conflict Handling (10): 3.4 → 4.3 (26% improvement) - Weakest area (orange highlight)
- Insight callout: "Model excels at empathy detection and supportive responses but shows lower improvement in conflict handling. Consider adding more conflict resolution training scenarios."

**Difficulty-Level Analysis:**
- Easy (20 scenarios): 3.8 → 4.7 (24% improvement)
- Medium (20): 3.1 → 4.5 (45% improvement)
- Hard (10): 2.6 → 4.2 (62% improvement)
- Insight: "Model shows greatest improvement on hard scenarios, suggesting strong learning of complex emotional intelligence patterns"

**Export EI Evaluation Results:**
- "Export EI Benchmarks" button
- CSV export: All 50 scenarios with columns (scenario_id, category, difficulty, prompt, baseline_response, trained_response, baseline_empathy, baseline_clarity, baseline_appropriateness, baseline_total, trained_empathy, trained_clarity, trained_appropriateness, trained_total, improvement_points, improvement_pct, improvement_notes)
- PDF Report: Executive summary with overall scores and tier, Category breakdown with insights, Top 10 before/after examples (formatted), Full scenario comparison table (appendix), Methodology explanation, Recommendations for future training
- Filename: training-job-{id}-ei-benchmarks-{timestamp}.csv or .pdf

**Client Sales Enablement Report:**
- Professional PDF with Bright Run branding
- Executive summary suitable for C-suite: "Your custom AI financial advisor achieved 41% improvement in emotional intelligence, exceeding industry benchmarks. This translates to more empathetic client interactions, higher satisfaction, and stronger trust."
- Before/after examples demonstrate tangible value
- Benchmarking context: "Target: 30% improvement, Your model: 41% improvement (37% above target), Industry average: 28% improvement"
- Use case scenarios: "This level of emotional intelligence enables your AI to: Handle anxious clients during market downturns, Build trust with skeptical new clients, Provide appropriate reassurance without minimizing concerns, De-escalate tense situations professionally"
- ROI connection: "Higher EI = Higher client satisfaction = Better retention = Increased lifetime value"

**Integration with Perplexity Results:**
- Combined quality dashboard shows: Technical Quality (Perplexity): 31% improvement, Emotional Quality (EI): 41% improvement, Overall Quality Score: 36% (weighted average)
- Holistic quality badge combining all validation metrics (perplexity + EI + knowledge + voice)
- Recommendation engine: If perplexity strong but EI weak, suggests "Focus on emotional intelligence training data"
- Cross-metric insights: "High perplexity improvement (31%) paired with exceptional EI (41%) indicates balanced, production-ready model"

**LLM-as-Judge Methodology Display:**
- Expandable "Scoring Methodology" section
- Explanation: "Responses scored by Claude 3.5 Sonnet using structured evaluation rubric"
- Scoring dimensions detailed:
  * Empathy (1-5): Validates emotions, shows understanding, uses compassionate language
  * Clarity (1-5): Clear explanations, avoids jargon, provides actionable guidance
  * Appropriateness (1-5): Professional tone, contextually suitable, respects boundaries
- Human validation sampling: "15% of scenarios (8 randomly selected) validated by human reviewers. Correlation: 0.89 (high agreement)"
- Scoring consistency metrics: Inter-rater reliability, variance across scenarios
- Link to detailed rubric documentation

**EI Regression Detection Alert:**
- Warning banner if any dimension shows regression (trained score lower than baseline)
- Example: "⚠️ Regression Detected: Appropriateness decreased from 3.4 to 3.1 (-9%). Review training data for over-correction or conflicting examples."
- Drill-down to specific scenarios showing regression
- Recommendation: "Investigate scenarios #12, #34, #41 where appropriateness scores dropped"

Interactions and Flows
- User navigates to completed training job details page → EI Benchmarks card automatically visible below perplexity section
- Scroll to EI section → Overall score, quality badge, and dimension breakdown visible immediately
- Click "View All 50 Scenarios" → Expandable section opens showing all scenarios in accordion format
- Click individual scenario in accordion → Expands to show full prompt, both responses, detailed scores, improvement notes
- Hover over dimension scores → Tooltip explains scoring criteria (e.g., "Empathy: Validates emotions, shows understanding")
- Click radar chart → Opens full-screen modal with larger visualization and detailed dimension explanations
- Click "Export EI Benchmarks" → Format selection modal (CSV/PDF/Sales Report) → Download initiated
- Click "View Scoring Methodology" → Expands methodology section with rubric details
- Click category in category-level analysis → Filters scenario list to show only that category
- If regression detected: Click warning banner → Jumps to regression scenarios with highlighting

Visual Feedback
- Loading state during EI evaluation: Animated spinner, "Evaluating emotional intelligence (50 scenarios)...", progress indicator "Scenario 23/50"
- Success state when evaluation completes: Smooth transition to results display, celebration animation if improvement ≥40% (exceptional)
- Quality badge uses distinct color coding and icons: Dark green checkmark (exceptional ≥40%), Green checkmark (strong 30-39%), Yellow caution (moderate 20-29%), Red X (needs improvement <20%)
- Dimension improvement percentages use size and color: Large green for high improvement (≥40%), medium green for good (30-39%), yellow for moderate (20-29%)
- Before/after example cards use side-by-side layout with clear visual separation: Baseline (gray background, muted colors), Trained (white/light green background, vibrant colors)
- Improvement indicators: Green upward arrows for improvements, red downward arrows for regressions, "+X points" badges
- Radar chart uses semi-transparent fill: Blue outline for baseline (subtle), green filled area for trained (prominent)
- Category bars use color coding: Green (strongest area), yellow (good), orange (weakest area)
- Export button shows loading spinner during report generation, success checkmark when download ready
- Regression warning banner uses prominent red/orange styling with alert icon

Accessibility Guidance
- Quality badge includes both icon and text: aria-label="Exceptional Emotional Intelligence: 41 percent improvement exceeding target"
- All score displays have semantic labels: aria-label="Empathy score: baseline 3.1 out of 5, trained 4.6 out of 5, improvement 48 percent"
- Before/after example cards clearly labeled: aria-label="Baseline model response", aria-label="Trained model response"
- Scenario accordion keyboard accessible: Tab to focus scenario, Enter/Space to expand/collapse, Arrow keys to navigate between scenarios
- Radar chart has text alternative: "Radar chart showing emotional intelligence dimensions. Empathy improved from 3.1 to 4.6. Clarity improved from 3.4 to 4.5. Appropriateness improved from 3.1 to 4.4."
- Color coding supplemented with text labels: "Strongest area" text in addition to green highlight
- Dimension breakdown cards keyboard navigable: Tab to focus cards, Enter to view details
- Tooltips keyboard-accessible: Focus on element to display tooltip, Escape to dismiss
- Export button keyboard accessible: Tab to focus, Enter to activate
- ARIA live regions announce evaluation progress: "Evaluating scenario 23 of 50", "Evaluation complete"
- Focus indicators visible on all interactive elements (cards, buttons, accordion headers, chart elements)

Information Architecture
- EI Benchmarks section positioned after Perplexity section on job details page (validation metrics grouped together)
- Hierarchy: Quality badge and overall score (most prominent) → Dimension breakdown → Before/after examples → Category analysis → Export actions
- Progressive disclosure: Overall metrics visible immediately, detailed scenarios hidden in expandable section (50 scenarios would overwhelm if all shown)
- Related sections grouped: Dimension breakdown and radar chart together, Category-level analysis and difficulty-level analysis together
- Conditional elements: Regression warning banner only shown if regressions detected, LLM-as-judge methodology expandable for advanced users
- Integration with other validation: EI section is one card in multi-metric validation dashboard (Perplexity → EI → Knowledge → Voice → Overall Quality Score)

Page Plan
1. **Training Job Details - EI Benchmarks Screen**
   - Purpose: Display emotional intelligence benchmark results with quality tier, dimension breakdowns, and before/after examples
   - Components: EI Benchmark card header with quality badge, Overall score section, Dimension breakdown (3 sub-cards), Radar chart, Top 10 before/after examples, Category-level analysis, Difficulty-level analysis, Export actions, LLM-as-judge methodology (expandable), Regression alerts (conditional)
   - States: Default (results displayed), Scenarios expanded (all 50 visible), Methodology expanded (scoring details visible), Filtered by category
   - Navigation: Links to perplexity results, Links to other validation sections, Export to PDF/CSV/Sales Report

2. **All Scenarios Expandable View** (within same page, accordion/modal)
   - Purpose: Display all 50 EI test scenarios with full prompts, baseline/trained responses, scores, and improvement notes
   - Components: Accordion list of 50 scenarios, Each scenario shows prompt, baseline response card, trained response card, score comparison table, improvement notes
   - States: Collapsed (only top 10 visible), Expanded (all 50 visible), Individual scenario expanded (full details)
   - Navigation: Click scenario to expand/collapse, Filter by category, Sort by improvement

3. **EI Sales Enablement Report Preview/Export Modal**
   - Purpose: Preview and download professional client-ready EI benchmark report with branding
   - Components: Format selector (CSV/PDF/Sales Report), Report preview pane showing executive summary and examples, Bright Run branding toggle, Download button, Cancel button
   - States: Format selection, Generating report (loading), Preview ready, Downloading
   - Navigation: Close modal to return to EI results, Download to initiate file download

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Dimension Radar Chart → Visualizes empathy, clarity, appropriateness improvements across 3 axes → FR Acceptance Criterion: Dimension Breakdown Visualization"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Run 50-scenario EI test suite covering empathy detection, emotional awareness, supportive responses, conflict handling**
- Source: US6.2.1
- Screen: Training Job Details - EI Benchmarks
- Components: Category-level analysis section showing 4 categories with scenario counts, All scenarios expandable view showing full 50 scenarios
- States: Default (category summary visible), Expanded (all scenarios visible)
- Notes: Ensures comprehensive emotional intelligence evaluation across diverse scenario types

**US Acceptance Criterion 2: Generate responses from baseline and trained models for comparison**
- Source: US6.2.1
- Screen: All Scenarios Expandable View
- Components: Side-by-side response cards for each scenario (Baseline response card, Trained response card)
- States: Scenario expanded (both responses visible)
- Notes: Enables direct qualitative comparison of model improvements

**US Acceptance Criterion 3: Score responses across empathy, clarity, appropriateness dimensions using LLM-as-judge**
- Source: US6.2.1
- Screen: Training Job Details - EI Benchmarks; All Scenarios View
- Components: Dimension breakdown cards (Empathy/Clarity/Appropriateness scores), Score breakdown in each scenario response card, LLM-as-judge methodology explanation (expandable)
- States: Default (dimension scores visible), Methodology expanded (scoring rubric visible)
- Notes: Provides objective, multi-dimensional quality assessment

**FR Acceptance Criterion 1: Quality Tier Classification (≥40% exceptional, 30-39% strong, 20-29% moderate, <20% needs improvement)**
- Source: FR6.2.1
- Screen: Training Job Details - EI Benchmarks
- Components: Large quality tier badge with icon and text, Color-coded badge (dark green/green/yellow/red)
- States: Exceptional (≥40%), Strong (30-39%), Moderate (20-29%), Needs Improvement (<20%)
- Notes: Instantly communicates EI quality level for decision-making

**FR Acceptance Criterion 2: EI Benchmark Card with overall score, dimension breakdown, before/after examples**
- Source: FR6.2.1
- Screen: Training Job Details - EI Benchmarks
- Components: Card header with quality badge, Overall EI score section (3.2→4.5, 41% improvement), Dimension breakdown (3 sub-cards), Radar chart, Top 10 before/after examples
- States: Default (all components visible), Examples expanded (all 50 scenarios visible)
- Notes: Comprehensive EI results presentation with progressive disclosure

**FR Acceptance Criterion 3: Before/After Examples showcasing top improvements**
- Source: FR6.2.1
- Screen: Training Job Details - EI Benchmarks
- Components: Top 10 before/after examples section with scenario prompts, baseline response cards, trained response cards, improvement indicators, improvement notes
- States: Default (top 10 visible), Expanded (all 50 visible)
- Notes: Demonstrates tangible quality improvements for stakeholder communication

**FR Acceptance Criterion 4: Category-Level Analysis identifying strengths and weaknesses**
- Source: FR6.2.1
- Screen: Training Job Details - EI Benchmarks
- Components: Category breakdown table (Empathy Detection, Emotional Awareness, Supportive Responses, Conflict Handling), Color-coded performance indicators (green for strongest, orange for weakest), Insight callout boxes with recommendations
- States: Default (all categories visible), Filtered (showing only selected category scenarios)
- Notes: Enables targeted training data improvements based on category performance

**FR Acceptance Criterion 5: Export EI Evaluation Results (CSV and PDF reports)**
- Source: FR6.2.1
- Screen: Training Job Details - EI Benchmarks; Export Modal
- Components: "Export EI Benchmarks" button, Format selector modal (CSV/PDF/Sales Report), Report preview pane, Download button
- States: Export modal closed, Export modal open (format selection), Generating report (loading), Download ready
- Notes: Enables client delivery and stakeholder communication

**FR Acceptance Criterion 6: Client Sales Enablement Report with branding and ROI messaging**
- Source: FR6.2.1
- Screen: Export Modal (Sales Report format selected)
- Components: Professional PDF preview with Bright Run branding, Executive summary with C-suite language, Before/after examples, Benchmarking context (target vs actual), Use case scenarios, ROI connection messaging
- States: Preview mode, Download ready
- Notes: Provides business-focused proof of EI improvements for sales and client confidence

**FR Acceptance Criterion 7: Integration with Perplexity Results for holistic quality assessment**
- Source: FR6.2.1
- Screen: Training Job Details (overall validation dashboard)
- Components: Combined quality dashboard showing all metrics (Perplexity, EI, Knowledge, Voice), Overall quality score (weighted average), Cross-metric insights
- States: All validation metrics visible in unified view
- Notes: Enables comprehensive model quality understanding beyond single metrics

Non-UI Acceptance Criteria

**FR Criterion: 50-scenario test suite with diverse EI challenges**
- Impact: Ensures comprehensive evaluation coverage across empathy, awareness, support, conflict scenarios
- UI Hint: Category-level analysis displays scenario counts per category (15 empathy, 15 awareness, 10 support, 10 conflict)

**FR Criterion: Generate responses using baseline Llama 3 70B and trained model**
- Impact: Provides fair comparison showing training impact
- UI Hint: Before/after cards clearly labeled "Baseline" and "Trained" with visual differentiation

**FR Criterion: LLM-as-judge scoring with Claude 3.5 Sonnet using structured rubric**
- Impact: Provides objective, consistent scoring across all scenarios
- UI Hint: Methodology section explains scoring approach and rubric; human validation correlation displayed

**FR Criterion: Calculate aggregate improvements and dimension-level improvements**
- Impact: Enables overall quality assessment and identification of specific strengths/weaknesses
- UI Hint: Overall score and dimension breakdown cards display aggregate metrics; category analysis shows granular patterns

**FR Criterion: Store EI results in ei_benchmark_results table**
- Impact: Enables historical tracking and trend analysis across training runs
- UI Hint: EI metrics available immediately on job details page; comparison across runs possible if multiple jobs exist

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - EI Benchmarks Screen (main interface showing overall score, dimensions, examples, categories)
  2. All Scenarios Expandable View (accordion or modal showing all 50 scenarios with full details)
  3. EI Sales Enablement Report Preview/Export Modal (format selection and preview for client-ready reports)
- Rationale: Minimum 3 screens required to cover primary EI results display (1), detailed scenario exploration (2), and export workflow with sales materials (3). Multiple result types (overall, dimensions, categories, examples) handled through sections within main screen using progressive disclosure.

=== END PROMPT FR: FR6.2.1 ===

---

=== BEGIN PROMPT FR: FR6.2.2 ===

Title
- FR6.2.2 Wireframes — Stage 6 — Model Quality Validation — EI Regression Detection

Context Summary
- FR6.2.2 implements automated emotional intelligence regression detection that identifies scenarios where the trained model performs worse than baseline on empathy, clarity, or appropriateness dimensions. This critical quality safeguard prevents accidental degradation of emotional capabilities during fine-tuning, flagging problematic training data or over-optimization that may harm model personality. Engineers receive detailed regression reports showing affected scenarios, dimension-specific drops, and root cause analysis to guide corrective action before client delivery.

Journey Integration
- Stage 6 user goals: Ensure no quality degradation, validate consistent emotional improvements, prevent personality damage, protect brand voice integrity
- Key emotions: Concern when regressions detected, relief when validated clean, urgency to fix issues, confidence in safety mechanisms
- Progressive disclosure levels: Basic users see regression summary and affected scenario count; advanced users access dimension-specific analysis and scenario comparisons; expert users review root cause hypotheses and training data quality checks
- Persona adaptations: Quality Analysts need detailed regression analysis and patterns; AI Engineers need debugging guidance and training data links; Business Owners need risk assessment and client impact evaluation

### Journey-Informed Design Elements
- User Goals: Detect quality regressions automatically, understand root causes, receive fix recommendations, prevent damaged models from reaching clients
- Emotional Requirements: Urgency when regressions found, relief from automated detection, confidence in safety nets, clarity on corrective actions
- Progressive Disclosure:
  * Basic: Regression alert banner, count of affected scenarios, overall regression severity
  * Advanced: Dimension-specific regression analysis, scenario-by-scenario comparison, pattern identification
  * Expert: Root cause hypotheses, training data quality analysis, statistical significance testing
- Success Indicators: Zero regressions detected (ideal), regressions identified before delivery, clear fix path provided, corrective training successful

Wireframe Goals
- Display prominent regression alerts when EI deterioration detected
- Show dimension-specific regression analysis (which dimension regressed, by how much)
- Present affected scenarios with before/after comparisons highlighting degradation
- Provide root cause analysis and hypotheses (over-fitting, conflicting training data, etc.)
- Generate actionable recommendations for addressing regressions
- Block or require approval for delivery if critical regressions detected

Explicit UI Requirements (from acceptance criteria)

**Regression Alert Banner (Conditional):**
- Prominent red/orange warning banner at top of EI Benchmarks section
- Appears only if any dimension shows regression (trained score < baseline score)
- Alert text: "⚠️ Emotional Intelligence Regression Detected: [X] scenarios show decreased performance"
- Severity indicator: Critical (>10% regression), Moderate (5-10%), Minor (<5%)
- Action buttons: [View Regression Details] [Export Regression Report] [Block Delivery]

**Regression Summary Card:**
- Card header: "EI Regression Analysis"
- Overall regression metrics:
  * Total regressed scenarios: 8 of 50 (16%)
  * Average regression magnitude: -0.7 points (-14%)
  * Dimensions affected: Appropriateness (5 scenarios), Clarity (3 scenarios)
  * Most impacted category: Conflict Handling (4 of 10 scenarios)
- Severity assessment: "Moderate concern - Review before client delivery"
- Visual: Red downward arrow with regression percentage

**Dimension-Specific Regression Breakdown:**
- Three dimension cards (Empathy, Clarity, Appropriateness)
- For each dimension showing regression:
  * Baseline score → Trained score (with red downward indicator)
  * Example: "Appropriateness: 3.4/5 → 3.1/5 (-0.3 points, -9%)"
  * Affected scenario count: "5 of 50 scenarios regressed"
  * Severity: Critical / Moderate / Minor
  * Top regressed scenarios listed: "Scenario #12 (-1.2 points), Scenario #34 (-0.9 points), Scenario #41 (-0.7 points)"
- Dimensions without regression: Green checkmark, "No regression detected"

**Regressed Scenarios Table:**
- Table with columns: Scenario ID | Category | Dimension | Baseline Score | Trained Score | Regression | Severity
- Example rows:
  * "#12 | Conflict Handling | Appropriateness | 4.0 | 2.8 | -1.2 | Critical"
  * "#34 | Conflict Handling | Appropriateness | 3.5 | 2.6 | -0.9 | Moderate"
  * "#41 | Supportive Responses | Clarity | 4.2 | 3.5 | -0.7 | Moderate"
- Sort by: Regression magnitude (default), Scenario ID, Category, Dimension
- Click row: Expands to show full scenario prompt, baseline response, trained response with score explanations

**Before/After Comparison for Regressed Scenarios:**
- Side-by-side response cards for each regressed scenario
- Baseline response card:
  * Response text
  * Scores with dimension breakdown
  * Highlighting: Strengths that were lost in training
- Trained response card:
  * Response text  
  * Scores with dimension breakdown
  * Highlighting: Specific regressions (e.g., "Lost empathetic language", "Became more robotic", "Inappropriate tone shift")
- Regression notes: "Trained model became overly formal, losing the warm reassuring tone that was effective in baseline. Appears to over-correct based on professional training data."

**Root Cause Analysis Section:**
- Section header: "Potential Root Causes"
- Automated analysis with hypotheses:
  * Hypothesis 1: "Over-optimization on Clarity may have reduced Appropriateness (trade-off pattern)"
  * Hypothesis 2: "Conflict Handling training data may contain overly formal examples that reduce warmth"
  * Hypothesis 3: "High learning rate (0.0002) may cause over-fitting to specific phrasing at expense of flexibility"
  * Hypothesis 4: "Training data conflicts: Some conversations model formal tone, others warm tone, causing confusion"
- Confidence indicators: High / Medium / Low for each hypothesis
- Supporting evidence: "4 of 5 regressed scenarios are Conflict Handling category, all show formality increase"

**Pattern Identification:**
- Pattern callout boxes:
  * Category Pattern: "80% of Conflict Handling scenarios regressed in Appropriateness - suggests category-specific issue"
  * Dimension Trade-off: "Clarity improved +32% while Appropriateness dropped -9% - potential over-correction"
  * Training Data Quality: "Scenarios #12, #34, #41 all involve client frustration - review training examples for this emotion"
- Visual: Venn diagram or correlation matrix showing pattern relationships

**Actionable Recommendations:**
- Section header: "Recommended Actions to Fix Regressions"
- Prioritized recommendation list:
  1. **Critical**: "Add 10+ high-quality Conflict Handling scenarios emphasizing warm professionalism (not cold formality)"
  2. **High**: "Review training data for tone consistency - ensure professional tone doesn't sacrifice empathy"
  3. **Medium**: "Reduce learning rate to 0.0001 (Conservative preset) to prevent over-fitting"
  4. **Medium**: "Balance training data: 60% warm tone, 40% professional tone for optimal mix"
  5. **Low**: "Run A/B test with adjusted hyperparameters to validate fix strategy"
- Each recommendation includes: Action, Rationale, Expected impact, Estimated effort

**Delivery Impact Assessment:**
- Assessment card: "Client Delivery Recommendation"
- Risk level: Critical (block) / High (review required) / Medium (caution) / Low (acceptable)
- Example assessment:
  * "Moderate Risk - Review Recommended"
  * "16% of scenarios show regression, primarily in Conflict Handling situations"
  * "Model remains production-ready for most use cases but may underperform with frustrated clients"
  * "Recommend: Disclose regression to client, deploy with monitoring, or retrain with improved data"
- Action buttons: [Block Delivery] [Require Manager Approval] [Accept with Disclosure] [Retrain with Recommendations]

**Regression Tracking Across Runs:**
- Historical regression chart (if multiple training runs exist)
- Line graph: X-axis (training run date), Y-axis (regression count or average regression magnitude)
- Comparison: "First run: 12 regressions, This run: 8 regressions (↓ 33% improvement)"
- Trend analysis: "Regression count decreasing over time - training data quality improving"

**Export Regression Report:**
- "Export Regression Report" button
- PDF report includes:
  * Executive summary: Regression count, severity, affected dimensions
  * Regressed scenarios table with full details
  * Before/after comparisons for top 5 regressions
  * Root cause analysis with hypotheses
  * Recommendations for corrective action
  * Delivery impact assessment
- CSV export: All regressed scenarios with detailed scores and metadata

Interactions and Flows
- User views EI Benchmarks → Regression alert banner appears at top (if regressions exist) → Click "View Regression Details" → Scrolls to Regression Analysis section
- Click dimension card showing regression → Filters regressed scenarios table to show only that dimension
- Click row in regressed scenarios table → Expands to show full before/after comparison with highlighting
- Hover over regression notes → Tooltip explains specific degradation (e.g., "Lost empathetic language: 'I understand your frustration' removed")
- Click root cause hypothesis → Expands to show supporting evidence and affected scenarios
- Click recommendation → Opens training data editor or job configuration with pre-filled adjustments
- Click "Block Delivery" → Opens confirmation modal → Job marked as "blocked_regression" → Notification sent to team
- Click "Export Regression Report" → Format selection → Download PDF/CSV

Visual Feedback
- Regression alert banner: Red/orange background, alert icon, high visual prominence
- Regression indicators: Red downward arrows, negative percentages in red text
- Severity badges: Red (critical), orange (moderate), yellow (minor) with icons
- Before/after comparison highlighting: Red highlighting on regressed elements (e.g., lost empathetic phrases)
- Root cause hypothesis confidence: Green (high confidence), yellow (medium), gray (low)
- Pattern identification boxes: Orange border, warning icon, attention-grabbing styling
- Action buttons: "Block Delivery" uses destructive red styling, "Retrain" uses primary blue
- Historical trend chart: Red line for regression count, downward trend positive (green annotation)

Accessibility Guidance
- Regression alert banner: aria-live="assertive" to immediately announce to screen readers, aria-label="Warning: Emotional Intelligence regression detected in 8 scenarios"
- Dimension regression indicators: aria-label="Appropriateness regressed from 3.4 to 3.1, decrease of 0.3 points or 9 percent, severity moderate"
- Regressed scenarios table: Keyboard navigable (Tab/Arrow keys), row expansion with Enter key, screen reader announces "Table with 8 regressed scenarios"
- Before/after comparison cards: aria-label="Baseline response for scenario 12", aria-label="Trained response for scenario 12 showing regression"
- Highlighting in responses: aria-label="Lost empathetic language: phrase 'I understand your frustration' removed in trained model"
- Root cause hypotheses: Semantic HTML (accordion or expandable details), keyboard accessible
- Action buttons: Clear focus indicators, aria-label describes action and consequences
- Color coding supplemented with text: "Critical" text in addition to red color, icons supplement colors

Information Architecture
- Regression section positioned prominently within EI Benchmarks card (after overall results but before category analysis)
- Conditional visibility: Only shown if regressions detected (hidden otherwise to avoid cluttering clean results)
- Hierarchy: Alert banner (most urgent) → Summary metrics → Dimension breakdown → Scenario details → Root cause analysis → Recommendations → Delivery assessment
- Related to overall EI flow: Overall EI Results → Regression Detection (if applicable) → Category Analysis → Export

Page Plan
1. **EI Benchmarks with Regression Detection Screen** (extension of FR6.2.1 screen)
   - Purpose: Display EI regression analysis alongside overall EI results when degradation detected
   - Components: Regression alert banner, Regression summary card, Dimension-specific regression breakdown, Regressed scenarios table, Before/after comparisons, Root cause analysis, Pattern identification, Actionable recommendations, Delivery impact assessment, Export regression report
   - States: No regression (section hidden), Minor regression (displayed with caution), Moderate regression (displayed with warnings), Critical regression (displayed with delivery block)
   - Navigation: Links from alert banner to regression details, Links from regressed scenarios to training data, Action buttons for delivery decisions or retraining

2. **Regressed Scenario Drill-Down Modal**
   - Purpose: Show detailed before/after comparison for individual regressed scenario
   - Components: Scenario prompt (full), Baseline response with scores and highlights, Trained response with scores and regression highlights, Regression explanation text, Root cause link, Action buttons to fix or dismiss
   - States: Individual scenario focused, Comparing multiple regressed scenarios (carousel/tabs)
   - Navigation: Close to return to regression table, Next/Previous to view other regressed scenarios

3. **Delivery Decision Workflow Screen** (conditional, if critical regression)
   - Purpose: Manager reviews regression analysis and decides whether to block delivery, require fixes, or accept with disclosure
   - Components: Regression summary, Risk assessment, Client impact evaluation, Decision options (Block / Approve with Conditions / Retrain), Justification text area (if approving despite regression), Approval workflow
   - States: Pending review, Approved with conditions, Blocked pending fixes
   - Navigation: Return to job details after decision, Email notifications to team

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Regression Alert Banner → Appears when trained score < baseline score for any dimension → FR Acceptance Criterion: Automated Regression Detection"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Identify scenarios where trained model scores lower than baseline**
- Source: US6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: Regressed scenarios table showing scenarios with trained < baseline scores, Count of regressed scenarios in alert banner
- States: Regression detected (table populated), No regression (section hidden)
- Notes: Automated detection prevents quality degradation from going unnoticed

**US Acceptance Criterion 2: Flag regressions by dimension (empathy, clarity, appropriateness)**
- Source: US6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: Dimension-specific regression breakdown cards (3 cards for 3 dimensions), Each card shows regression magnitude and affected scenarios
- States: Dimension regressed (red indicator), No regression (green checkmark)
- Notes: Enables understanding of which emotional capability degraded

**US Acceptance Criterion 3: Display before/after comparisons for regressed scenarios**
- Source: US6.2.2
- Screen: Regressed Scenario Drill-Down Modal
- Components: Side-by-side response cards (Baseline vs Trained), Highlighting of specific regressions, Regression notes explaining degradation
- States: Scenario expanded (comparison visible)
- Notes: Provides qualitative understanding of what changed and why it's worse

**FR Acceptance Criterion 1: Regression alert banner with severity and affected scenario count**
- Source: FR6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: Red/orange alert banner, Severity indicator (Critical/Moderate/Minor), Affected scenario count, Action buttons
- States: Critical regression (red banner, delivery blocked), Moderate (orange banner, review required), Minor (yellow banner, caution)
- Notes: Immediately communicates presence and severity of quality issues

**FR Acceptance Criterion 2: Root cause analysis with hypotheses**
- Source: FR6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: Root cause analysis section with numbered hypotheses, Confidence indicators (High/Medium/Low), Supporting evidence for each hypothesis
- States: Default (all hypotheses visible), Expanded hypothesis (evidence details shown)
- Notes: Guides engineers toward understanding why regression occurred

**FR Acceptance Criterion 3: Actionable recommendations for fixing regressions**
- Source: FR6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: Prioritized recommendation list (Critical/High/Medium/Low), Each recommendation with action, rationale, expected impact, estimated effort
- States: Default (all recommendations visible), Recommendation clicked (expands to show implementation guidance)
- Notes: Transforms analysis into concrete corrective actions

**FR Acceptance Criterion 4: Delivery impact assessment and approval workflow**
- Source: FR6.2.2
- Screen: EI Benchmarks with Regression Detection; Delivery Decision Workflow Screen
- Components: Delivery impact assessment card with risk level, Client impact evaluation, Action buttons (Block/Approve/Retrain), Manager approval workflow (if required)
- States: Blocked (delivery prevented), Review required (manager approval pending), Approved with conditions, Retrain initiated
- Notes: Enforces quality gates and prevents damaged models from reaching clients

**FR Acceptance Criterion 5: Export regression report (PDF and CSV)**
- Source: FR6.2.2
- Screen: EI Benchmarks with Regression Detection
- Components: "Export Regression Report" button, Format selector, PDF preview with executive summary and details, CSV export with all scenario data
- States: Export modal closed, Export modal open (format selection), Generating report, Download ready
- Notes: Enables documentation and team communication about quality issues

Non-UI Acceptance Criteria

**FR Criterion: Automated regression detection during EI evaluation**
- Impact: Ensures regressions identified without manual comparison
- UI Hint: Alert banner appears automatically if any scenario shows trained < baseline score

**FR Criterion: Calculate regression magnitude and statistical significance**
- Impact: Distinguishes meaningful regressions from noise/variance
- UI Hint: Severity indicators (Critical/Moderate/Minor) based on magnitude thresholds

**FR Criterion: Pattern recognition across regressed scenarios**
- Impact: Identifies systematic issues (category-specific, dimension trade-offs) vs random noise
- UI Hint: Pattern identification boxes showing category concentrations and dimension correlations

**FR Criterion: Store regression data in ei_regression_analysis table**
- Impact: Enables historical tracking and trend analysis
- UI Hint: Regression tracking chart shows improvement/worsening over multiple training runs

Estimated Page Count
- **3 primary screens:**
  1. EI Benchmarks with Regression Detection Screen (extension of FR6.2.1, adds regression analysis section when applicable)
  2. Regressed Scenario Drill-Down Modal (detailed before/after comparison for individual scenarios)
  3. Delivery Decision Workflow Screen (manager approval for delivery despite regressions, conditional)
- Rationale: Minimum 3 screens required to cover regression analysis display (1), scenario-level debugging (2), and delivery governance (3). Regression section conditionally shown within EI Benchmarks screen only when regressions detected.

=== END PROMPT FR: FR6.2.2 ===

---

=== BEGIN PROMPT FR: FR6.3.1 ===

Title
- FR6.3.1 Wireframes — Stage 6 — Model Quality Validation — Financial Knowledge Retention Test

Context Summary
- FR6.3.1 implements catastrophic forgetting detection by testing the trained model's retention of fundamental financial knowledge (present in the baseline Llama 3 70B but potentially lost during fine-tuning). The system administers a 30-question test covering compound interest, risk-return tradeoff, diversification, tax basics, and retirement planning, compares trained model performance against baseline, and flags significant knowledge degradation. This safeguard ensures LoRA training doesn't inadvertently erase critical financial domain expertise while personalizing the model, protecting clients from receiving financially incorrect advice.

Journey Integration
- Stage 6 user goals: Verify no knowledge loss, ensure financial accuracy maintained, protect client safety, validate training hasn't damaged foundational capabilities
- Key emotions: Concern about knowledge erosion, relief when retention confirmed, urgency to fix knowledge gaps, confidence in safety mechanisms
- Progressive disclosure levels: Basic users see overall retention percentage and pass/fail status; advanced users access question-by-question analysis and topic breakdowns; expert users review statistical analysis and knowledge gap patterns
- Persona adaptations: Quality Analysts need detailed retention metrics and failure patterns; AI Engineers need debugging context and training data links; Compliance Officers need safety validation and risk assessment

### Journey-Informed Design Elements
- User Goals: Detect knowledge loss automatically, identify specific degraded topics, receive fix recommendations, ensure financial accuracy
- Emotional Requirements: Urgency when knowledge loss detected, relief from safety validation, confidence in foundational capabilities
- Progressive Disclosure:
  * Basic: Overall retention percentage, pass/fail indicator, critical knowledge gaps flagged
  * Advanced: Topic-by-topic breakdown, question details, comparison with baseline
  * Expert: Statistical significance, confidence intervals, knowledge decay patterns
- Success Indicators: ≥95% retention (no significant forgetting), critical topics retained 100%, knowledge validated safe for client delivery

Wireframe Goals
- Display overall knowledge retention percentage prominently with pass/fail classification
- Show topic-level retention breakdown (compound interest, risk-return, diversification, taxes, retirement)
- Present failed questions with baseline vs trained responses showing knowledge degradation
- Provide severity assessment for knowledge gaps (critical vs minor)
- Generate actionable recommendations for addressing knowledge loss
- Block or flag delivery if critical financial knowledge is lost

Explicit UI Requirements (from acceptance criteria)

**Knowledge Retention Card Header:**
- Card header: "Financial Knowledge Retention Test"
- Large pass/fail badge: "✓ Knowledge Retained" (≥95%, green), "⚠ Minor Knowledge Loss" (90-94%, yellow), "✗ Significant Knowledge Loss" (<90%, red)

**Overall Retention Score:**
- Large prominent display: "28/30 correct = 93% retention"
- Comparison indicator: Baseline: 29/30 (97%), Trained: 28/30 (93%), Difference: -1 question (-4%)
- Interpretation: "Minor knowledge loss detected. Review failed questions before client delivery."
- Visual: Progress bar showing 93% filled (color-coded based on threshold)

**Topic-Level Retention Breakdown:**
- Table with columns: Topic | Baseline Correct | Trained Correct | Retention % | Status
- Example rows:
  * "Compound Interest (5 questions) | 5/5 | 5/5 | 100% | ✓ Retained" (green)
  * "Risk-Return Tradeoff (6 questions) | 6/6 | 5/6 | 83% | ⚠ Degraded" (yellow)
  * "Diversification (6 questions) | 6/6 | 6/6 | 100% | ✓ Retained" (green)
  * "Tax Basics (5 questions) | 4/5 | 4/5 | 100% | ✓ Retained" (green)
  * "Retirement Planning (8 questions) | 8/8 | 8/8 | 100% | ✓ Retained" (green)
- Visual indicators: Green checkmark (100% retained), Yellow warning (degraded), Red X (significant loss)
- Click row: Expands to show individual questions within that topic

**Failed Questions Detail:**
- Section header: "Questions with Knowledge Loss (2 failed)"
- For each failed question:
  * Question #14: "What is the primary benefit of diversification?"
  * Baseline response: "Diversification reduces unsystematic (company-specific) risk by spreading investments across multiple assets. While it doesn't eliminate systematic (market) risk, it significantly reduces portfolio volatility and the impact of any single investment's poor performance." (Correct, score: 5/5)
  * Trained response: "Diversification helps you invest in many different things so you don't lose all your money at once." (Incorrect/Oversimplified, score: 2/5, Lost technical accuracy)
  * Knowledge degradation: "Trained model lost technical precision about systematic vs unsystematic risk distinction. Response is overly simplified and misses key financial concepts."
  * Severity: Critical (fundamental concept inaccurately explained)
- Side-by-side comparison with highlighting on lost concepts

**Severity Assessment:**
- Critical Knowledge Gaps (delivery blocker):
  * Question #14 (Diversification): Fundamental risk concept inaccurately explained
  * Recommendation: "Do not deliver to client without retraining. Incorrect diversification explanation could lead to poor investment decisions."
- Minor Knowledge Gaps (review recommended):
  * Question #22 (Risk-Return): Slightly less precise language, but concept still accurate
  * Recommendation: "Review before delivery. Consider adding technical financial training examples."

**Knowledge Gap Pattern Analysis:**
- Pattern callout boxes:
  * Simplification Pattern: "3 questions show over-simplification trend - model losing technical precision in favor of conversational tone"
  * Topic-Specific: "Risk-Return Tradeoff questions show 17% knowledge degradation - this topic may need reinforcement in training data"
  * Concept Loss: "Technical terminology (systematic risk, alpha, beta) being replaced with layman's terms - potential over-correction from conversation training"

**Actionable Recommendations:**
- Section header: "Recommendations to Restore Financial Knowledge"
- Prioritized list:
  1. **Critical**: "Add 15+ conversations explicitly covering diversification principles with technical accuracy"
  2. **High**: "Include financial glossary training data to preserve technical terminology"
  3. **Medium**: "Balance conversational tone with technical precision in training examples"
  4. **Medium**: "Add 'knowledge preservation' examples showing technical concepts explained accessibly without loss of accuracy"
  5. **Low**: "Review learning rate - high LR (0.0002) may cause catastrophic forgetting of baseline knowledge"

**Delivery Impact Assessment:**
- Risk level: Critical (block delivery) / High (review required) / Medium (caution) / Low (acceptable)
- Example for 93% retention (minor loss):
  * "Medium Risk - Review Required"
  * "2 questions failed, 1 critical gap in diversification explanation"
  * "Model maintains most financial knowledge but shows dangerous oversimplification in risk concepts"
  * "Recommendation: Review critical gaps with compliance before client delivery, or retrain with knowledge preservation"
- Action buttons: [Block Delivery] [Require Compliance Review] [Accept with Disclosure] [Retrain with Recommendations]

**Knowledge Retention Trend:**
- Historical trend chart (if multiple training runs exist)
- Line graph: X-axis (training run date), Y-axis (retention %)
- Comparison: "First run: 89% retention, This run: 93% retention (↑ 4% improvement)"
- Target line: 95% threshold marked
- Insight: "Knowledge retention improving with adjusted training data approach"

**Export Knowledge Retention Report:**
- "Export Knowledge Retention Report" button
- PDF report includes:
  * Executive summary: Overall retention %, failed question count, severity assessment
  * Topic breakdown table
  * Failed questions with full baseline vs trained comparison
  * Severity assessment and delivery recommendation
  * Pattern analysis
  * Corrective recommendations
- CSV export: All 30 questions with baseline/trained scores and retention status

Interactions and Flows
- User navigates to training job validation section → Knowledge Retention card visible after EI Benchmarks
- View overall retention score → Click "View Failed Questions" → Expands to show detailed question-by-question analysis
- Click topic row in breakdown table → Filters to show only questions for that topic
- Click failed question → Opens side-by-side modal comparing baseline vs trained responses with highlighting
- Hover over severity badge → Tooltip explains why gap is critical vs minor
- Click recommendation → Opens training data editor or configuration with pre-filled guidance
- Click "Block Delivery" → Confirmation modal → Job marked "blocked_knowledge_loss" → Compliance notification
- Click "Export Report" → Format selection → Download PDF/CSV

Visual Feedback
- Loading state during knowledge test: Animated spinner, "Testing financial knowledge (30 questions)...", progress indicator "Question 18/30"
- Pass/fail badge: Green checkmark (≥95%), yellow warning (90-94%), red X (<90%)
- Retention percentage: Large number, color-coded (green ≥95%, yellow 90-94%, red <90%)
- Topic status indicators: Green checkmark (100%), yellow warning triangle (degraded), red X (significant loss)
- Failed question cards: Red border, alert icon, "Critical" or "Minor" severity badge
- Severity badges: Red (critical, blocking), orange (high concern), yellow (minor)
- Pattern callout boxes: Orange/yellow background, warning icon
- Export button: Loading spinner during report generation

Accessibility Guidance
- Pass/fail badge: aria-label="Knowledge retained: 93 percent, minor knowledge loss detected, review recommended"
- Overall retention score: aria-label="28 questions correct out of 30, 93 percent retention, baseline was 97 percent"
- Topic breakdown table: Screen reader announces "Financial knowledge by topic. Five topics: Compound Interest, Risk-Return Tradeoff, Diversification, Tax Basics, Retirement Planning"
- Failed question cards: aria-label="Failed question 14: What is the primary benefit of diversification? Critical severity."
- Severity badges: aria-label="Critical knowledge gap: delivery blocker" with both icon and text
- Action buttons: Clear focus indicators, aria-label describes consequences
- Pattern callouts: Semantic HTML with appropriate ARIA roles
- Color coding supplemented with text and icons

Information Architecture
- Knowledge Retention section positioned after EI Benchmarks on job validation page
- Hierarchy: Pass/fail badge and overall score (most prominent) → Topic breakdown → Failed questions → Severity assessment → Recommendations → Delivery impact
- Progressive disclosure: Overall metrics visible immediately, failed questions hidden in expandable section
- Conditional elements: Severity assessment and delivery block only shown if retention <95%
- Integration: Knowledge retention is one card in multi-metric validation dashboard (Perplexity → EI → Knowledge Retention → Brand Voice)

Page Plan
1. **Training Job Details - Knowledge Retention Screen**
   - Purpose: Display financial knowledge retention test results with topic breakdown and failed question analysis
   - Components: Knowledge retention card header with pass/fail badge, Overall retention score, Topic-level breakdown table, Failed questions detail (expandable), Severity assessment, Pattern analysis, Recommendations list, Delivery impact assessment, Export actions
   - States: Pass (≥95%, green), Minor loss (90-94%, yellow, review required), Significant loss (<90%, red, delivery blocked)
   - Navigation: Links to other validation sections, Links to failed questions, Export to PDF/CSV

2. **Failed Question Comparison Modal**
   - Purpose: Show detailed side-by-side comparison of baseline vs trained responses for specific failed question
   - Components: Question text, Baseline response with score and highlighting (correct concepts), Trained response with score and highlighting (lost/incorrect concepts), Knowledge degradation explanation, Severity indicator, Related questions link
   - States: Individual question view, Carousel for multiple failed questions
   - Navigation: Close to return to knowledge retention card, Next/Previous to view other failed questions

3. **Compliance Review Workflow Screen** (conditional, if critical gaps)
   - Purpose: Compliance officer reviews knowledge gaps and approves/blocks delivery
   - Components: Knowledge retention summary, Critical gaps list, Risk assessment, Client impact evaluation, Decision options (Approve/Block/Require Retraining), Justification text area, Approval workflow
   - States: Pending compliance review, Approved with conditions, Blocked
   - Navigation: Return to job details after decision, Notifications to team

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Topic Breakdown Table → Shows retention % for each financial topic → FR Acceptance Criterion: Topic-Level Knowledge Analysis"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Administer 30-question test covering core financial topics**
- Source: US6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Overall score display "28/30 correct", Topic breakdown table showing 5 topics with question counts
- States: Test complete (results displayed)
- Notes: Comprehensive test ensures broad coverage of financial domain knowledge

**US Acceptance Criterion 2: Compare trained model performance against baseline**
- Source: US6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Comparison display "Baseline: 29/30 (97%), Trained: 28/30 (93%), Difference: -1 question (-4%)"
- States: Comparison visible
- Notes: Direct comparison quantifies knowledge loss magnitude

**US Acceptance Criterion 3: Flag significant knowledge degradation**
- Source: US6.3.1
- Screen: Training Job Details - Knowledge Retention; Failed Question Modal
- Components: Failed questions section, Critical/minor severity badges, Delivery impact warning
- States: Knowledge loss detected (warnings displayed), No loss (section shows all correct)
- Notes: Automatic flagging prevents deployment of knowledge-degraded models

**FR Acceptance Criterion 1: Overall retention percentage with pass/fail threshold (95%)**
- Source: FR6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Large retention percentage "93%", Pass/fail badge (color-coded), Progress bar visualization
- States: Pass (≥95%, green), Minor loss (90-94%, yellow), Significant loss (<90%, red)
- Notes: Clear threshold-based classification guides delivery decisions

**FR Acceptance Criterion 2: Topic-level retention breakdown**
- Source: FR6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Topic breakdown table with 5 financial topics, Retention % per topic, Status indicators (retained/degraded/lost)
- States: Default (all topics visible), Expanded topic (showing individual questions)
- Notes: Identifies which specific financial areas show knowledge degradation

**FR Acceptance Criterion 3: Failed question detail with baseline vs trained comparison**
- Source: FR6.3.1
- Screen: Failed Question Comparison Modal
- Components: Side-by-side response cards (baseline correct vs trained incorrect), Highlighting on lost concepts, Knowledge degradation explanation
- States: Question comparison view
- Notes: Qualitative analysis shows exactly what knowledge was lost and how

**FR Acceptance Criterion 4: Severity assessment (critical vs minor gaps)**
- Source: FR6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Severity assessment section, Critical vs minor gap categorization, Delivery recommendation based on severity
- States: Critical gaps (delivery blocked), Minor gaps (review recommended), No gaps (approved)
- Notes: Distinguishes dangerous financial inaccuracies from minor precision losses

**FR Acceptance Criterion 5: Actionable recommendations for knowledge restoration**
- Source: FR6.3.1
- Screen: Training Job Details - Knowledge Retention
- Components: Recommendations list prioritized by severity (Critical/High/Medium/Low), Each with action, rationale, expected impact
- States: Default (all recommendations visible)
- Notes: Transforms analysis into concrete steps to fix knowledge loss

**FR Acceptance Criterion 6: Export knowledge retention report**
- Source: FR6.3.1
- Screen: Training Job Details - Knowledge Retention; Export Modal
- Components: "Export Knowledge Retention Report" button, Format selector (PDF/CSV), Download action
- States: Export modal closed, Export modal open, Generating report, Download ready
- Notes: Enables compliance documentation and stakeholder communication

Non-UI Acceptance Criteria

**FR Criterion: 30-question test with 5 financial topics (6 questions each on average)**
- Impact: Ensures comprehensive coverage and statistical validity
- UI Hint: Topic breakdown shows 5 topics with question counts (5-8 questions per topic)

**FR Criterion: Generate responses from baseline and trained models using identical prompts**
- Impact: Fair comparison to isolate knowledge loss from fine-tuning
- UI Hint: Failed question modal shows both responses to same prompt

**FR Criterion: Automated scoring using LLM-as-judge with financial accuracy rubric**
- Impact: Objective assessment of financial correctness
- UI Hint: Each response has score (1-5) with correctness explanation

**FR Criterion: Calculate topic-level and overall retention percentages**
- Impact: Quantifies knowledge retention for decision-making
- UI Hint: Overall and per-topic retention % displayed prominently

**FR Criterion: Store knowledge retention data in knowledge_retention_results table**
- Impact: Enables historical tracking and trend analysis
- UI Hint: Trend chart shows retention % across multiple training runs

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - Knowledge Retention Screen (main interface showing overall score, topic breakdown, failed questions)
  2. Failed Question Comparison Modal (detailed side-by-side analysis of specific failed question)
  3. Compliance Review Workflow Screen (approval/blocking for critical knowledge gaps, conditional)
- Rationale: Minimum 3 screens required to cover primary retention display (1), question-level analysis (2), and compliance governance (3). Multiple result views handled through expandable sections within main screen.

=== END PROMPT FR: FR6.3.1 ===

---

=== BEGIN PROMPT FR: FR6.3.2 ===

Title
- FR6.3.2 Wireframes — Stage 6 — Model Quality Validation — Domain-Specific Knowledge Probes

Context Summary
- FR6.3.2 implements targeted domain-specific knowledge validation by probing the trained model's understanding of client-specific financial topics, industry regulations, product knowledge, and specialized scenarios. Unlike the general knowledge retention test (FR6.3.1), this feature validates that training successfully instilled new domain knowledge while maintaining accuracy. Engineers can verify the model learned client-specific concepts (e.g., proprietary investment products, specific compliance requirements, unique client scenarios) and identify gaps requiring additional training data.

Journey Integration
- Stage 6 user goals: Validate specialized knowledge acquisition, ensure client-specific expertise embedded, verify training objectives achieved, identify knowledge gaps for iteration
- Key emotions: Curiosity about knowledge transfer success, satisfaction when specialized knowledge confirmed, concern if gaps detected, confidence in client-ready customization
- Progressive disclosure levels: Basic users see overall knowledge acquisition success rate and key topic mastery; advanced users access question-by-question analysis and knowledge gap identification; expert users review knowledge depth assessment and training data correlations
- Persona adaptations: Business Owners need client-specific knowledge proof for sales; Quality Analysts need gap analysis and training effectiveness metrics; AI Engineers need debugging context and training data optimization guidance

### Journey-Informed Design Elements
- User Goals: Validate specialized knowledge learned, identify knowledge gaps, demonstrate client customization success, guide training data improvements
- Emotional Requirements: Satisfaction from successful knowledge transfer, curiosity about depth of understanding, motivation to fill gaps
- Progressive Disclosure:
  * Basic: Overall knowledge acquisition %, key topics mastered, high-level gaps
  * Advanced: Question-by-question analysis, knowledge depth scoring, topic-by-topic breakdown
  * Expert: Training data correlations, knowledge transfer patterns, statistical confidence analysis
- Success Indicators: ≥80% domain knowledge acquired, critical client topics mastered 100%, training objectives validated

Wireframe Goals
- Display overall domain knowledge acquisition percentage and success classification
- Show topic-level mastery breakdown for client-specific domains
- Present knowledge depth analysis (surface vs deep understanding)
- Identify knowledge gaps with specific recommendations for additional training
- Demonstrate successful knowledge transfer with before/after examples
- Export domain knowledge validation reports for client proof

Explicit UI Requirements (from acceptance criteria)

**Domain Knowledge Card Header:**
- Card header: "Domain-Specific Knowledge Validation"
- Subtitle: "[Client Name] Financial Products & Scenarios"
- Success badge: "✓ Knowledge Acquired" (≥80%, green), "⚠ Partial Knowledge" (60-79%, yellow), "✗ Knowledge Gaps" (<60%, red)

**Overall Knowledge Acquisition Score:**
- Large prominent display: "32/40 correct = 80% domain knowledge acquisition"
- Comparison: Baseline (pre-training): 12/40 (30%, expected low), Trained: 32/40 (80%), Knowledge gain: +20 questions (+50 percentage points)
- Interpretation: "Model successfully acquired client-specific financial knowledge. Ready for specialized client scenarios."
- Visual: Progress bar showing 80% with gain indicator

**Topic-Level Mastery Breakdown:**
- Table with columns: Domain Topic | Baseline Score | Trained Score | Knowledge Gain | Mastery Level
- Example rows:
  * "Proprietary Investment Products (10 questions) | 2/10 (20%) | 9/10 (90%) | +70% | ✓ Mastered" (green)
  * "Compliance Requirements (10 questions) | 3/10 (30%) | 7/10 (70%) | +40% | ⚠ Partial" (yellow)
  * "Client Scenarios (10 questions) | 4/10 (40%) | 9/10 (90%) | +50% | ✓ Mastered" (green)
  * "Industry Regulations (10 questions) | 3/10 (30%) | 7/10 (70%) | +40% | ⚠ Partial" (yellow)
- Mastery indicators: ✓ Mastered (≥80%), ⚠ Partial (60-79%), ✗ Gaps (<60%)
- Click row: Expands to show individual questions and responses

**Knowledge Depth Analysis:**
- Section header: "Knowledge Depth Assessment"
- Depth scoring for each correct answer:
  * Surface Understanding (1-2/5): Can recall facts but limited explanation
  * Moderate Understanding (3-4/5): Can explain concepts with some detail
  * Deep Understanding (5/5): Comprehensive explanation with context and nuance
- Distribution visualization: Pie chart showing "Deep: 15 questions (47%), Moderate: 12 (38%), Surface: 5 (16%)"
- Insight: "Model demonstrates deep understanding of proprietary products and client scenarios, but compliance knowledge remains surface-level"

**Successfully Acquired Knowledge Examples:**
- Section header: "Knowledge Transfer Success Examples (Top 5)"
- For each example:
  * Question #7: "Explain the key differentiator of [Client]'s Target Date Fund vs competitors"
  * Baseline response (pre-training): "Target date funds automatically adjust asset allocation as the target date approaches, shifting from aggressive to conservative investments." (Generic, score: 2/5)
  * Trained response: "[Client]'s Target Date Fund uniquely incorporates ESG screening at every glide path stage and uses a proprietary risk parity approach that maintains 40% equity exposure even at retirement (vs industry standard 30%). This provides higher growth potential for longevity risk while maintaining sustainable investment principles." (Client-specific, accurate, score: 5/5)
  * Knowledge gain: "+3 points - Model successfully learned client-specific product differentiators"
- Side-by-side comparison highlighting learned knowledge

**Knowledge Gap Analysis:**
- Section header: "Knowledge Gaps Requiring Attention"
- For each gap (failed or low-score questions):
  * Question #24: "What are the key compliance requirements for [Client]'s high-net-worth advisory services?"
  * Trained response: "High-net-worth clients require enhanced due diligence and regular portfolio reviews to ensure suitability." (Incomplete, score: 2/5)
  * Expected knowledge: "Should include: SEC accredited investor verification, annual wealth certification, enhanced KYC documentation, quarterly suitability reviews, concentration risk monitoring above $2M threshold, and specific state registration requirements for advisory services."
  * Gap severity: High (compliance knowledge is critical for client-facing use)
  * Recommendation: "Add 5+ training conversations explicitly covering [Client]'s compliance protocols"

**Topic-Specific Recommendations:**
- Prioritized by topic and severity:
  1. **Critical - Compliance Requirements**: "Only 70% mastery. Add 10+ conversations covering SEC regulations, state requirements, and [Client]-specific protocols"
  2. **High - Industry Regulations**: "70% mastery. Include 8+ regulatory scenario conversations (FINRA rules, fiduciary duties, disclosure requirements)"
  3. **Medium - Product Knowledge Depth**: "90% mastery but only 50% deep understanding. Add technical product details and competitive comparisons"
  4. **Low - Client Scenarios**: "90% mastery achieved. Maintain current training data approach"

**Training Data Correlation Analysis:**
- Insight callout: "Topics with 15+ training conversations show 85%+ mastery. Topics with <10 conversations show 65% mastery."
- Recommendation: "Minimum 12-15 conversations per specialized topic recommended for strong knowledge acquisition"
- Visualization: Scatter plot showing training conversation count (X-axis) vs knowledge acquisition % (Y-axis) with trend line

**Knowledge Transfer Effectiveness:**
- Metrics card:
  * Knowledge transfer rate: 80% (32 of 40 new concepts learned)
  * Average depth score: 3.8/5 (good understanding)
  * Critical topic mastery: 90% (investment products, client scenarios)
  * Compliance mastery: 70% (needs improvement)
- Benchmarking: "Target: 80% acquisition, Your model: 80% (meets target), Industry average: 75%"

**Export Domain Knowledge Report:**
- "Export Domain Knowledge Report" button
- PDF report includes:
  * Executive summary: Overall acquisition %, topic mastery breakdown, depth analysis
  * Successfully acquired knowledge examples (top 10)
  * Knowledge gaps with severity and recommendations
  * Topic-specific action items
  * Training data correlation insights
  * Client-ready proof section: "This model has been validated to understand [Client]'s proprietary products, compliance requirements, and specialized client scenarios."
- CSV export: All 40 questions with baseline/trained scores, depth ratings, topic classifications

Interactions and Flows
- User navigates to validation section → Domain Knowledge card visible after general knowledge retention
- View overall acquisition score → Click "View Topic Breakdown" → Table expands showing topic-level mastery
- Click topic row → Expands to show individual questions and responses for that topic
- Click knowledge gap question → Opens modal with detailed gap analysis and recommendations
- Click "View Knowledge Transfer Examples" → Carousel/accordion showing top successful knowledge transfers
- Hover over depth score → Tooltip explains scoring rubric (surface/moderate/deep)
- Click recommendation → Opens training data editor with guidance for adding topic-specific conversations
- Click "Export Report" → Format selection → Download PDF/CSV

Visual Feedback
- Loading state during domain knowledge test: "Testing domain knowledge (40 questions)...", progress indicator
- Success badge: Green checkmark (≥80%), yellow warning (60-79%), red X (<60%)
- Knowledge gain indicators: Green upward arrows with "+X%" showing improvement from baseline
- Mastery level badges: Green (mastered ≥80%), yellow (partial 60-79%), red (gaps <60%)
- Depth score visualization: Color gradient (dark green = deep, light green = moderate, yellow = surface)
- Knowledge gap cards: Orange/red border, severity badge (critical/high/medium)
- Success example cards: Green accent, "✓ Knowledge Transferred" badge
- Training data correlation scatter plot: Trend line shows positive correlation

Accessibility Guidance
- Success badge: aria-label="Domain knowledge acquired: 80 percent, meets target, knowledge successfully transferred"
- Overall score: aria-label="32 questions correct out of 40, 80 percent domain knowledge acquisition, gain of 50 percentage points from baseline"
- Topic table: Screen reader announces "Domain knowledge by topic. Four topics: Proprietary Investment Products, Compliance Requirements, Client Scenarios, Industry Regulations"
- Mastery badges: aria-label="Proprietary Investment Products: Mastered, 90 percent correct" with both icon and text
- Depth score pie chart: Text alternative "Knowledge depth distribution: 47 percent deep understanding, 38 percent moderate, 16 percent surface"
- Knowledge gap cards: aria-label="Knowledge gap question 24: Compliance requirements, high severity"
- Side-by-side comparisons: Clear labels "Baseline response before training" and "Trained response after training"
- Interactive elements: Keyboard accessible (Tab/Enter), focus indicators visible

Information Architecture
- Domain Knowledge section positioned after general knowledge retention on validation page
- Hierarchy: Success badge and overall score (most prominent) → Topic mastery breakdown → Depth analysis → Knowledge gaps → Recommendations
- Progressive disclosure: Overall metrics visible immediately, questions/gaps hidden in expandable sections
- Conditional elements: Knowledge gaps section only shown if <100% mastery, Recommendations prioritized by severity
- Integration: Domain knowledge is specialized validation following general knowledge (General Knowledge Retention → Domain Knowledge Validation)

Page Plan
1. **Training Job Details - Domain Knowledge Validation Screen**
   - Purpose: Display domain-specific knowledge acquisition results with topic breakdown and gap analysis
   - Components: Domain knowledge card header with success badge, Overall acquisition score, Topic-level mastery breakdown, Knowledge depth analysis, Successfully acquired knowledge examples, Knowledge gap analysis, Topic-specific recommendations, Training data correlation insights, Export actions
   - States: Success (≥80%, green), Partial (60-79%, yellow, gaps identified), Insufficient (<60%, red, significant gaps)
   - Navigation: Links to other validation sections, Expandable topic/question details, Export to PDF/CSV

2. **Knowledge Gap Detail Modal**
   - Purpose: Show detailed analysis of specific knowledge gap with recommendations
   - Components: Question text, Trained response (inadequate), Expected knowledge outline, Gap severity assessment, Specific recommendations for filling gap, Related questions with similar gaps
   - States: Individual gap view, Multiple gaps carousel
   - Navigation: Close to return to domain knowledge card, Next/Previous for other gaps

3. **Knowledge Transfer Success Modal**
   - Purpose: Demonstrate successful knowledge transfer with before/after comparison
   - Components: Question text, Baseline response (generic/incorrect), Trained response (client-specific/correct), Knowledge gain explanation, Depth score, Client customization proof
   - States: Individual example view, Top examples carousel
   - Navigation: Close to return to domain knowledge card, Next/Previous for other examples

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Knowledge Depth Pie Chart → Shows distribution of surface/moderate/deep understanding → FR Acceptance Criterion: Knowledge Depth Assessment"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Test 40 domain-specific questions across client topics**
- Source: US6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Overall score "32/40 correct", Topic breakdown showing 4 domains with 10 questions each
- States: Test complete (results displayed)
- Notes: Comprehensive domain coverage validates specialized knowledge acquisition

**US Acceptance Criterion 2: Compare trained model against baseline (expect low baseline scores)**
- Source: US6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Comparison "Baseline: 12/40 (30%), Trained: 32/40 (80%), Gain: +50pp", Knowledge gain indicators on topic table
- States: Comparison visible
- Notes: Demonstrates training successfully instilled new domain knowledge

**US Acceptance Criterion 3: Identify knowledge gaps requiring additional training**
- Source: US6.3.2
- Screen: Knowledge Gap Detail Modal
- Components: Knowledge gap analysis section, Gap severity badges, Recommendations for each gap
- States: Gaps detected (analysis shown), No gaps (section shows all mastered)
- Notes: Guides iterative training data improvements

**FR Acceptance Criterion 1: Overall domain knowledge acquisition % with success threshold (80%)**
- Source: FR6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Large acquisition percentage "80%", Success badge (color-coded), Progress bar with gain indicator
- States: Success (≥80%, green), Partial (60-79%, yellow), Insufficient (<60%, red)
- Notes: Clear threshold-based assessment of knowledge transfer effectiveness

**FR Acceptance Criterion 2: Topic-level mastery breakdown**
- Source: FR6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Topic mastery table with 4 client-specific domains, Mastery level indicators (Mastered/Partial/Gaps), Knowledge gain percentages
- States: Default (all topics visible), Expanded topic (showing individual questions)
- Notes: Identifies which domain areas need additional training focus

**FR Acceptance Criterion 3: Knowledge depth analysis (surface/moderate/deep)**
- Source: FR6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Knowledge depth section, Pie chart showing depth distribution, Depth scoring explanation (1-2 surface, 3-4 moderate, 5 deep)
- States: Default (depth distribution visible)
- Notes: Assesses quality of understanding beyond mere correctness

**FR Acceptance Criterion 4: Successfully acquired knowledge examples**
- Source: FR6.3.2
- Screen: Knowledge Transfer Success Modal
- Components: Top 5 examples with before/after comparisons, Highlighting on learned knowledge, Knowledge gain explanations
- States: Carousel/accordion of multiple examples
- Notes: Demonstrates tangible knowledge transfer for client proof

**FR Acceptance Criterion 5: Knowledge gap analysis with recommendations**
- Source: FR6.3.2
- Screen: Knowledge Gap Detail Modal
- Components: Gap analysis for each failed/low-score question, Expected knowledge outline, Gap severity, Specific recommendations
- States: Gap detail view
- Notes: Actionable guidance for filling specific knowledge gaps

**FR Acceptance Criterion 6: Training data correlation insights**
- Source: FR6.3.2
- Screen: Training Job Details - Domain Knowledge Validation
- Components: Training data correlation section, Scatter plot (conversation count vs acquisition %), Insight callouts, Recommended conversation counts per topic
- States: Default (insights visible)
- Notes: Data-driven guidance for training data quantity/distribution

**FR Acceptance Criterion 7: Export domain knowledge report**
- Source: FR6.3.2
- Screen: Training Job Details - Domain Knowledge Validation; Export Modal
- Components: "Export Domain Knowledge Report" button, Format selector (PDF/CSV), Client-ready proof section in report
- States: Export modal closed, Export modal open, Generating report, Download ready
- Notes: Enables client delivery proof and stakeholder communication

Non-UI Acceptance Criteria

**FR Criterion: 40-question test with client-specific topics (products, compliance, scenarios, regulations)**
- Impact: Validates specialized knowledge across critical client domains
- UI Hint: Topic breakdown shows 4 domains with 10 questions each

**FR Criterion: Generate responses from baseline and trained models for comparison**
- Impact: Quantifies knowledge transfer from training
- UI Hint: Before/after comparisons show knowledge gain

**FR Criterion: Score responses using domain expertise rubric (1-5 with depth assessment)**
- Impact: Assesses both correctness and depth of understanding
- UI Hint: Depth analysis shows surface/moderate/deep distribution

**FR Criterion: Calculate topic-level and overall acquisition percentages**
- Impact: Quantifies knowledge transfer for decision-making
- UI Hint: Overall and per-topic acquisition % displayed prominently

**FR Criterion: Analyze correlation between training data quantity and knowledge acquisition**
- Impact: Guides optimal training data distribution
- UI Hint: Scatter plot shows conversation count vs acquisition % with recommendations

**FR Criterion: Store domain knowledge data in domain_knowledge_results table**
- Impact: Enables historical tracking and training effectiveness analysis
- UI Hint: Domain knowledge metrics stored for trend analysis across training runs

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - Domain Knowledge Validation Screen (main interface showing overall acquisition, topic breakdown, depth analysis, gaps)
  2. Knowledge Gap Detail Modal (detailed analysis of specific knowledge gap with recommendations)
  3. Knowledge Transfer Success Modal (before/after comparison showing successful knowledge acquisition)
- Rationale: Minimum 3 screens required to cover primary domain knowledge display (1), gap analysis (2), and success demonstration (3). Multiple views handled through expandable sections and modals within main screen.

=== END PROMPT FR: FR6.3.2 ===

---

=== BEGIN PROMPT FR: FR6.4.1 ===

Title
- FR6.4.1 Wireframes — Stage 6 — Model Quality Validation — Elena Morales Voice Consistency Scoring

Context Summary
- FR6.4.1 implements brand voice consistency evaluation by testing the trained model's adherence to Elena Morales's defined personality characteristics (warm, professional, clear, empathetic, empowering). The system generates 20 responses to scenarios designed to elicit voice characteristics, scores them across 5 personality dimensions using automated evaluation, and calculates an overall voice consistency score targeting ≥85% for strong brand alignment. This feature validates that LoRA training successfully instilled the desired brand personality without over-correction or voice drift, ensuring consistent client experience.

Journey Integration
- Stage 6 user goals: Validate brand personality acquisition, ensure voice consistency, demonstrate brand alignment for client confidence, celebrate personality achievement
- Key emotions: Pride when voice characteristics strongly match target, concern if voice drift detected, satisfaction with measurable personality, confidence in brand-aligned delivery
- Progressive disclosure levels: Basic users see overall voice consistency score and personality match; advanced users access dimension-by-dimension analysis and example responses; expert users review voice drift patterns and training data correlations
- Persona adaptations: Business Owners need brand proof for client presentations; Quality Analysts need consistency metrics and deviation identification; Brand Managers need personality alignment validation

### Journey-Informed Design Elements
- User Goals: Validate brand voice learned, quantify personality consistency, identify voice drift, demonstrate brand customization success
- Emotional Requirements: Pride in personality achievement, satisfaction with measurable brand alignment, relief when consistency high
- Progressive Disclosure:
  * Basic: Overall voice consistency score, personality match badge, key characteristics present/absent
  * Advanced: Dimension-by-dimension scoring, example responses showing voice, deviation analysis
  * Expert: Voice drift patterns, training data correlations, statistical confidence, cross-scenario consistency
- Success Indicators: ≥85% voice consistency (strong brand alignment), all 5 dimensions present, no significant drift, client-ready brand proof

Wireframe Goals
- Display overall voice consistency score prominently with brand alignment classification
- Show personality dimension breakdown (warm, professional, clear, empathetic, empowering) with individual scores
- Present example responses demonstrating Elena Morales voice characteristics
- Identify voice drift or missing characteristics with specific examples
- Provide recommendations for strengthening voice consistency
- Export brand voice validation reports for client proof

Explicit UI Requirements (from acceptance criteria)

**Voice Consistency Card Header:**
- Card header: "Brand Voice: Elena Morales Consistency"
- Subtitle: "Personality Characteristics: Warm | Professional | Clear | Empathetic | Empowering"
- Consistency badge: "✓ Strong Voice Alignment" (≥85%, green), "⚠ Moderate Alignment" (70-84%, yellow), "✗ Weak Alignment" (<70%, red)

**Overall Voice Consistency Score:**
- Large prominent display: "88% Voice Consistency Score"
- Comparison: Target: 85%, Your model: 88%, Status: "Exceeds brand standards"
- Interpretation: "Model consistently demonstrates Elena Morales's warm, professional, clear, empathetic, and empowering voice across diverse scenarios."
- Visual: Circular progress indicator showing 88% with brand icon

**Personality Dimension Breakdown (5 cards):**
- **Warmth Dimension**:
  * Score: "4.3/5 = 86% present"
  * Indicators: "Uses friendly language, shows personal care, creates emotional connection"
  * Example quote: "'I'm so glad you reached out about this - planning for your child's education is such an important step, and I'm here to help you explore options that feel right for your family.'"
  * Status: ✓ Strong (green)

- **Professionalism Dimension**:
  * Score: "4.5/5 = 90% present"
  * Indicators: "Maintains boundaries, demonstrates expertise, uses appropriate formality"
  * Example quote: "'Based on your income timeline and risk tolerance, I'd recommend exploring municipal bonds for the tax-advantaged income component of your portfolio.'"
  * Status: ✓ Strong (green)

- **Clarity Dimension**:
  * Score: "4.2/5 = 84% present"
  * Indicators: "Explains complex concepts simply, avoids jargon, provides concrete examples"
  * Example quote: "'Think of a Roth IRA like a special savings account where you pay taxes now, but never again - all future growth is yours to keep tax-free in retirement.'"
  * Status: ✓ Strong (green)

- **Empathy Dimension**:
  * Score: "4.6/5 = 92% present"
  * Indicators: "Validates emotions, acknowledges concerns, shows understanding"
  * Example quote: "'I completely understand your anxiety about market volatility - seeing your savings fluctuate can be really unsettling, especially when you're close to retirement.'"
  * Status: ✓ Strong (green)

- **Empowerment Dimension**:
  * Score: "3.9/5 = 78% present"
  * Indicators: "Builds client confidence, encourages informed decisions, celebrates progress"
  * Example quote: "'You're asking exactly the right questions, and the fact that you're thinking about this now puts you ahead of many people your age.'"
  * Status: ⚠ Moderate (yellow, room for improvement)

- Radar chart visualization: 5-axis radar showing all dimensions with target line at 85%

**Voice Characteristics Examples:**
- Section header: "Elena Morales Voice in Action (Top 5 Examples)"
- For each example:
  * Scenario: "Client asks: 'I feel overwhelmed by all these investment options. Where do I even start?'"
  * Response demonstrating voice: "'I hear you - investment options can feel really overwhelming at first, and that's completely normal [EMPATHY]. Let me break this down into three simple starting points that match where you are right now [CLARITY]. First, let's talk about your timeline...[continues with WARMTH, PROFESSIONALISM, EMPOWERMENT throughout]'"
  * Voice annotations: Highlighted phrases tagged with dimension labels [EMPATHY], [CLARITY], etc.
  * Consistency score: 4.7/5 (94%) - "Excellent voice consistency across all five dimensions"

**Voice Drift Analysis (if applicable):**
- Section header: "Voice Drift Detection"
- Conditional: Only shown if any dimension scores <70% or shows significant deviation
- For each drift:
  * Dimension affected: "Empowerment: 78% present (target 85%)"
  * Drift pattern: "Model sometimes provides solutions directly instead of guiding clients to discover their own answers"
  * Example quote showing drift: "'You should definitely open a Roth IRA and contribute $6,500 per year.'" (Directive, not empowering)
  * Recommended voice: "'Have you considered a Roth IRA? Based on what you've shared about your goals, it might be a great fit. Would you like to explore how it could work for your situation?'" (Empowering, invites collaboration)
  * Recommendation: "Add 8+ training conversations emphasizing client empowerment and collaborative decision-making"

**Voice Consistency Across Scenarios:**
- Consistency analysis by scenario type:
  * Financial planning scenarios: 92% consistency (strong)
  * Investment advice scenarios: 89% consistency (strong)
  * Emotional support scenarios: 95% consistency (excellent)
  * Technical education scenarios: 81% consistency (moderate)
- Insight: "Voice remains most consistent in emotional support contexts, shows slight variance in technical explanations"

**Training Data Voice Correlation:**
- Analysis: "Training conversations with explicit Elena Morales voice modeling (45 conversations) show 92% voice consistency. Conversations without voice modeling (15 conversations) show 78% consistency."
- Recommendation: "Ensure all training conversations consistently model target voice for optimal personality transfer"
- Visualization: Bar chart comparing voice consistency for voice-modeled vs generic training data

**Brand Alignment Proof:**
- Client-ready proof section:
  * "This model has been validated to consistently demonstrate Elena Morales's warm, professional, clear, empathetic, and empowering voice characteristics across 20 diverse client scenarios."
  * "Voice consistency score: 88% (exceeds 85% target)"
  * "All five personality dimensions present at strong levels (78-92%)"
  * "Ready for client deployment with consistent brand experience"

**Export Voice Consistency Report:**
- "Export Voice Report" button
- PDF report includes:
  * Executive summary: Overall consistency score, dimension breakdown, brand alignment statement
  * Personality dimension analysis with scores and indicators
  * Top 5 voice examples with annotations
  * Voice drift analysis (if applicable) with recommendations
  * Scenario consistency breakdown
  * Training data correlation insights
  * Client-ready brand proof section
- CSV export: All 20 scenarios with dimension scores and consistency ratings

Interactions and Flows
- User navigates to validation section → Brand Voice card visible after domain knowledge
- View overall consistency score → Click "View Dimension Breakdown" → 5 dimension cards expand
- Click dimension card → Opens modal with detailed examples and scoring for that dimension
- Click "View Voice Examples" → Carousel/accordion showing top examples with voice annotations
- Hover over annotated phrase → Tooltip explains which voice dimension it demonstrates
- Click voice drift alert → Expands to show drift analysis with comparison examples
- Click recommendation → Opens training data editor with voice-specific guidance
- Click "Export Voice Report" → Format selection → Download PDF/CSV with brand proof

Visual Feedback
- Loading state during voice evaluation: "Evaluating brand voice (20 scenarios)...", progress indicator
- Consistency badge: Green checkmark (≥85%), yellow warning (70-84%), red X (<70%)
- Dimension cards: Green (strong ≥85%), yellow (moderate 70-84%), red (weak <70%)
- Radar chart: Green filled area for model scores, gray target line at 85%
- Voice annotations: Color-coded highlight tags ([EMPATHY] blue, [WARMTH] yellow, [CLARITY] green, etc.)
- Voice drift cards: Orange border, warning icon, "Drift Detected" badge
- Example responses: Quote styling, clean typography, voice dimension tags
- Export button: Loading spinner during report generation

Accessibility Guidance
- Consistency badge: aria-label="Strong voice alignment: 88 percent consistency, exceeds 85 percent target"
- Overall score: aria-label="88 percent voice consistency score, target 85 percent, exceeds brand standards"
- Dimension cards: aria-label="Warmth dimension: 4.3 out of 5, 86 percent present, strong alignment" with both icon and text
- Radar chart: Text alternative "Five-dimension voice consistency radar chart. Warmth 86%, Professionalism 90%, Clarity 84%, Empathy 92%, Empowerment 78%"
- Voice annotations: aria-label="Phrase demonstrates empathy dimension: 'I hear you'" (not relying on color alone)
- Example responses: Semantic HTML for quotes (<blockquote>), clear structural hierarchy
- Voice drift alerts: aria-label="Voice drift detected in empowerment dimension, 78 percent present, below 85 percent target"
- Interactive elements: Keyboard accessible (Tab/Enter), focus indicators visible

Information Architecture
- Brand Voice section positioned after knowledge validation on job validation page
- Hierarchy: Consistency badge and overall score (most prominent) → Dimension breakdown → Voice examples → Drift analysis → Recommendations
- Progressive disclosure: Overall metrics visible immediately, detailed examples/drift hidden in expandable sections
- Conditional elements: Voice drift section only shown if deviations detected
- Integration: Brand voice is final validation metric (Perplexity → EI → Knowledge → Brand Voice → Overall Quality Score)

Page Plan
1. **Training Job Details - Brand Voice Consistency Screen**
   - Purpose: Display brand voice consistency evaluation with personality dimension analysis
   - Components: Voice consistency card header with badge, Overall consistency score, Personality dimension breakdown (5 cards), Radar chart, Voice characteristics examples, Voice drift analysis (conditional), Scenario consistency breakdown, Training data correlation, Brand alignment proof, Export actions
   - States: Strong alignment (≥85%, green), Moderate (70-84%, yellow, drift flagged), Weak (<70%, red, significant issues)
   - Navigation: Links to other validation sections, Expandable dimension details, Export to PDF/CSV

2. **Personality Dimension Detail Modal**
   - Purpose: Show detailed analysis of specific voice dimension with scoring and examples
   - Components: Dimension name and definition, Score breakdown, Key indicators present, Multiple example quotes demonstrating dimension, Comparative analysis (strong vs weak examples), Recommendations for strengthening
   - States: Individual dimension view, All dimensions comparison view
   - Navigation: Close to return to voice card, Next/Previous for other dimensions

3. **Voice Example Analysis Modal**
   - Purpose: Display full response with voice annotations and dimension scoring
   - Components: Scenario prompt, Full response text with inline voice annotations ([EMPATHY], [CLARITY], etc.), Dimension-by-dimension scoring for this response, Overall consistency score, Voice strengths highlighted
   - States: Individual example view, Top examples carousel
   - Navigation: Close to return to voice card, Next/Previous for other examples

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Radar Chart → Visualizes 5 personality dimensions against 85% target → FR Acceptance Criterion: Personality Dimension Breakdown"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Test 20 scenarios designed to elicit Elena Morales voice characteristics**
- Source: US6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Overall consistency score "88%" calculated from 20 scenarios, Scenario consistency breakdown showing performance across scenario types
- States: Test complete (results displayed)
- Notes: Comprehensive scenario coverage validates voice consistency across diverse situations

**US Acceptance Criterion 2: Score responses across 5 personality dimensions (warm, professional, clear, empathetic, empowering)**
- Source: US6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Personality dimension breakdown (5 cards), Individual dimension scores (4.3/5, 4.5/5, 4.2/5, 4.6/5, 3.9/5), Radar chart visualization
- States: Default (all dimensions visible), Individual dimension expanded (detailed analysis)
- Notes: Multi-dimensional assessment ensures holistic brand voice evaluation

**US Acceptance Criterion 3: Calculate overall voice consistency score**
- Source: US6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Large prominent consistency score "88%", Circular progress indicator, Comparison to target "Target: 85%, Your model: 88%"
- States: Strong (≥85%, green), Moderate (70-84%, yellow), Weak (<70%, red)
- Notes: Single aggregate metric for brand alignment decision-making

**FR Acceptance Criterion 1: Voice consistency score with target threshold (85%)**
- Source: FR6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Consistency badge (color-coded), Overall score display, Target comparison, Status interpretation
- States: Exceeds target (green, approved), Meets target (green, approved), Below target (yellow/red, review required)
- Notes: Clear threshold-based classification guides brand approval

**FR Acceptance Criterion 2: Personality dimension breakdown with individual scores**
- Source: FR6.4.1
- Screen: Training Job Details - Brand Voice Consistency; Personality Dimension Detail Modal
- Components: 5 dimension cards (Warmth, Professionalism, Clarity, Empathy, Empowerment), Score (X/5), Indicators list, Example quotes, Status badge
- States: Card view (all 5 visible), Detail modal (single dimension expanded)
- Notes: Identifies which personality traits are strong vs need reinforcement

**FR Acceptance Criterion 3: Voice characteristics examples with annotations**
- Source: FR6.4.1
- Screen: Voice Example Analysis Modal
- Components: Top 5 example responses, Inline voice annotations ([EMPATHY], [WARMTH], etc.), Consistency score per example, Voice strengths highlighted
- States: Carousel/accordion of examples
- Notes: Demonstrates tangible brand voice for client proof

**FR Acceptance Criterion 4: Voice drift detection with deviation analysis**
- Source: FR6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Voice drift section (conditional), Drift pattern identification, Example quotes showing drift, Recommended voice comparison, Recommendations
- States: No drift (section hidden), Drift detected (section visible with alerts)
- Notes: Identifies voice inconsistencies requiring corrective training

**FR Acceptance Criterion 5: Training data voice correlation analysis**
- Source: FR6.4.1
- Screen: Training Job Details - Brand Voice Consistency
- Components: Training data correlation section, Bar chart comparing voice-modeled vs generic conversations, Insight callouts, Recommendations for voice-consistent training
- States: Default (insights visible)
- Notes: Data-driven guidance for maintaining voice consistency in training data

**FR Acceptance Criterion 6: Export voice consistency report with brand proof**
- Source: FR6.4.1
- Screen: Training Job Details - Brand Voice Consistency; Export Modal
- Components: "Export Voice Report" button, Format selector (PDF/CSV), Client-ready brand proof section in PDF
- States: Export modal closed, Export modal open, Generating report, Download ready
- Notes: Enables client delivery proof and brand alignment documentation

Non-UI Acceptance Criteria

**FR Criterion: 20-scenario test covering diverse client situations**
- Impact: Validates voice consistency across varied contexts
- UI Hint: Scenario consistency breakdown shows performance by scenario type

**FR Criterion: Generate responses and score using brand voice rubric**
- Impact: Objective assessment of personality characteristic presence
- UI Hint: Each dimension has score (1-5) with indicators explaining scoring

**FR Criterion: Calculate dimension-level and overall consistency scores**
- Impact: Quantifies brand alignment for decision-making
- UI Hint: Overall score aggregates 5 dimension scores into single metric

**FR Criterion: Store voice consistency data in voice_consistency_results table**
- Impact: Enables historical tracking and brand evolution analysis
- UI Hint: Voice consistency metrics stored for comparison across training runs

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - Brand Voice Consistency Screen (main interface showing overall consistency, dimension breakdown, examples, drift analysis)
  2. Personality Dimension Detail Modal (detailed analysis of individual voice dimension with examples)
  3. Voice Example Analysis Modal (full response with voice annotations and dimension scoring)
- Rationale: Minimum 3 screens required to cover primary voice consistency display (1), dimension-level analysis (2), and example demonstration (3). Multiple views handled through expandable sections and modals within main screen.

=== END PROMPT FR: FR6.4.1 ===

---

=== BEGIN PROMPT FR: FR6.4.2 ===

Title
- FR6.4.2 Wireframes — Stage 6 — Model Quality Validation — Client Brand Customization

Context Summary
- FR6.4.2 implements client-specific brand voice validation beyond the default Elena Morales personality, enabling evaluation of custom brand characteristics when clients provide their own voice profiles. The system tests the trained model's adherence to client-defined personality traits, communication style, and brand guidelines, calculates customization success scores, and provides brand alignment proof for client delivery. This feature supports diverse brand identities (from casual and friendly to formal and corporate) while maintaining the same rigorous validation methodology.

Journey Integration
- Stage 6 user goals: Validate custom brand personality achieved, demonstrate client-specific customization success, ensure brand consistency, generate client-ready brand proof
- Key emotions: Pride in successful customization, satisfaction with brand flexibility, confidence in client-specific delivery, excitement to demonstrate personalization
- Progressive disclosure levels: Basic users see overall brand alignment score and key characteristics; advanced users access custom trait analysis and example comparisons; expert users review brand consistency patterns and customization effectiveness
- Persona adaptations: Business Owners need brand proof for diverse clients; Brand Managers need validation that custom guidelines were followed; Quality Analysts need customization effectiveness metrics

### Journey-Informed Design Elements
- User Goals: Validate client brand learned, quantify custom personality consistency, demonstrate brand customization success, generate client-ready proof
- Emotional Requirements: Pride in customization achievement, satisfaction with brand flexibility, confidence in diverse brand handling
- Progressive Disclosure:
  * Basic: Overall brand alignment score, key custom traits present/absent, brand match badge
  * Advanced: Custom trait-by-trait analysis, example responses showing brand, deviation identification
  * Expert: Brand consistency across scenarios, customization effectiveness metrics, comparison with baseline generic voice
- Success Indicators: ≥85% custom brand alignment, all client-defined traits present, consistent brand experience, client-ready proof

Wireframe Goals
- Display overall custom brand alignment score prominently
- Show client-defined trait breakdown with individual presence scores
- Present example responses demonstrating client's specific brand voice
- Identify brand deviations or missing traits with specific examples
- Provide recommendations for strengthening custom brand consistency
- Export customized brand validation reports for client delivery

Explicit UI Requirements (from acceptance criteria)

**Custom Brand Card Header:**
- Card header: "Custom Brand Voice: [Client Brand Name]"
- Subtitle: "Client-Defined Characteristics: [Trait 1] | [Trait 2] | [Trait 3] | [Trait 4] | [Trait 5]"
  * Example: "Casual | Friendly | Data-Driven | Transparent | Action-Oriented"
- Alignment badge: "✓ Strong Brand Match" (≥85%, green), "⚠ Moderate Match" (70-84%, yellow), "✗ Weak Match" (<70%, red)

**Overall Brand Alignment Score:**
- Large prominent display: "91% Brand Alignment Score"
- Comparison: Target: 85%, Your model: 91%, Status: "Exceeds client brand standards"
- Interpretation: "Model consistently demonstrates [Client]'s casual, friendly, data-driven, transparent, and action-oriented voice across diverse scenarios."
- Visual: Circular progress indicator showing 91% with client logo/brand icon

**Client-Defined Trait Breakdown (5-7 cards, variable based on client profile):**
- Example for "Tech Startup Brand" with traits: Casual, Data-Driven, Transparent, Innovative, Action-Oriented

- **Casual Trait**:
  * Score: "4.4/5 = 88% present"
  * Indicators: "Uses conversational language, avoids stuffiness, relatable tone"
  * Example quote: "'Hey there! Great question. Let me break down compound interest in a way that actually makes sense...'"
  * Status: ✓ Strong (green)

- **Data-Driven Trait**:
  * Score: "4.6/5 = 92% present"
  * Indicators: "Cites statistics, uses concrete numbers, backs claims with research"
  * Example quote: "'According to Vanguard's 2023 analysis of 1.2 million retirement accounts, investors who maintained consistent contributions through market downturns achieved 34% higher returns over 20-year periods.'"
  * Status: ✓ Strong (green)

- **Transparent Trait**:
  * Score: "4.3/5 = 86% present"
  * Indicators: "Acknowledges limitations, admits unknowns, explains reasoning clearly"
  * Example quote: "'I'll be honest - predicting short-term market movements is basically impossible. What we can do is...'"
  * Status: ✓ Strong (green)

- **Innovative Trait**:
  * Score: "4.1/5 = 82% present"
  * Indicators: "Suggests creative approaches, embraces new methods, challenges status quo"
  * Example quote: "'Instead of the traditional 60/40 portfolio, have you considered a risk parity approach that dynamically adjusts based on volatility signals?'"
  * Status: ✓ Strong (green)

- **Action-Oriented Trait**:
  * Score: "4.7/5 = 94% present"
  * Indicators: "Provides concrete next steps, clear calls-to-action, emphasizes implementation"
  * Example quote: "'Here's what I recommend you do this week: 1) Open a Roth IRA account, 2) Set up automatic $500 monthly contributions, 3) Choose a target date fund matching your retirement year. I can walk you through each step.'"
  * Status: ✓ Strong (green)

- Radar chart visualization: 5-7 axis radar showing all client-defined traits with target line at 85%

**Brand Voice Comparison (Generic vs Custom):**
- Side-by-side comparison showing default Elena Morales voice vs client custom brand
- Example:
  * Scenario: "Client asks about diversification benefits"
  * Elena Morales (warm, professional, empathetic): "'I understand your concern about putting all your eggs in one basket - that's actually a very wise instinct to have...'"
  * [Client] Brand (casual, data-driven, action-oriented): "'Good question! Data shows diversification reduces portfolio volatility by 40-60% on average. Here's how to diversify your portfolio in 3 steps...'"
  * Customization success: "Model successfully adapted from warm/empathetic tone to casual/data-driven tone while maintaining quality"

**Custom Brand Examples:**
- Section header: "[Client] Brand Voice in Action (Top 5 Examples)"
- For each example:
  * Scenario: "Client confused about tax implications"
  * Response demonstrating custom brand: "'Let's cut through the tax jargon [CASUAL]. Here's the data: Roth IRA contributions are post-tax, meaning you pay taxes now at your current rate (let's say 24%) [DATA-DRIVEN]. Why does this matter? If tax rates increase to 30% by retirement, you just saved 6% on potentially hundreds of thousands of dollars [TRANSPARENT MATH]. Bottom line: Open a Roth IRA before April 15 to maximize this year's contribution [ACTION-ORIENTED].'"
  * Brand annotations: Highlighted phrases tagged with client trait labels [CASUAL], [DATA-DRIVEN], etc.
  * Alignment score: 4.8/5 (96%) - "Excellent brand alignment across all client-defined traits"

**Brand Deviation Analysis (if applicable):**
- Section header: "Brand Deviations Detected"
- Conditional: Only shown if any trait scores <70% or shows significant drift
- For each deviation:
  * Trait affected: "Casual: 82% present (target 85%)"
  * Deviation pattern: "Model occasionally uses formal financial terminology instead of conversational language"
  * Example showing deviation: "'It is advisable to consider tax-loss harvesting strategies to optimize after-tax returns.'" (Too formal for casual brand)
  * Recommended brand voice: "'Here's a smart tax move: sell losing investments to offset your gains (called tax-loss harvesting). Can save you thousands in taxes.'" (Casual, clear, action-oriented)
  * Recommendation: "Add 5+ training conversations explicitly modeling casual, conversational tone"

**Brand Customization Effectiveness:**
- Metrics card comparing generic baseline vs custom-trained model:
  * Brand trait alignment: Generic (45%), Custom-trained (91%), Improvement: +46pp
  * Client characteristic presence: Generic (2 of 5 traits), Custom-trained (5 of 5 traits), Improvement: 100% trait coverage
  * Brand consistency: Generic (varying voice), Custom-trained (consistent), Status: Achieved
- Interpretation: "Training successfully customized model to client brand, significantly outperforming generic personality"

**Client Brand Proof Statement:**
- Client-ready proof section:
  * "This model has been customized and validated to consistently demonstrate [Client]'s unique brand voice across 20 diverse scenarios."
  * "Brand alignment score: 91% (exceeds 85% target)"
  * "All five client-defined characteristics present at strong levels (82-94%)"
  * "Validated for client deployment with consistent [Client]-specific brand experience"
  * "Customization represents +46 percentage point improvement over generic baseline"

**Multiple Brand Profiles Support (if applicable):**
- For clients with multiple brand profiles (e.g., B2C vs B2B, different product lines):
  * Brand profile selector: "Evaluate against: [Profile A: Consumer Brand] [Profile B: Enterprise Brand]"
  * Separate alignment scores per profile
  * Profile-specific trait breakdowns
  * Cross-profile consistency analysis: "Model successfully differentiates between consumer (casual, friendly) and enterprise (professional, data-driven) contexts"

**Export Custom Brand Report:**
- "Export Brand Report" button
- PDF report includes:
  * Client branding (logo, colors, fonts)
  * Executive summary: Overall alignment score, trait breakdown, customization success
  * Client-defined trait analysis with scores and indicators
  * Top 5 brand examples with annotations
  * Brand deviation analysis (if applicable) with recommendations
  * Comparison with generic baseline showing customization value
  * Client-ready brand proof statement
- CSV export: All 20 scenarios with trait scores and alignment ratings

Interactions and Flows
- User selects client from dropdown (if multiple clients) → Brand profile loads → Validation results display
- View overall alignment score → Click "View Trait Breakdown" → Client trait cards expand
- Click trait card → Opens modal with detailed examples and scoring for that specific trait
- Click "Compare with Generic" → Opens side-by-side comparison showing customization value
- Click "View Brand Examples" → Carousel/accordion showing top examples with trait annotations
- Hover over annotated phrase → Tooltip explains which brand trait it demonstrates
- Click deviation alert → Expands to show deviation analysis with recommended corrections
- Click "Export Brand Report" → Format selection with client branding options → Download PDF/CSV
- (If multiple profiles) Switch profile selector → Re-displays validation for selected brand profile

Visual Feedback
- Loading state during brand evaluation: "Evaluating [Client] brand voice (20 scenarios)...", progress indicator
- Alignment badge: Green checkmark (≥85%), yellow warning (70-84%), red X (<70%)
- Trait cards: Green (strong ≥85%), yellow (moderate 70-84%), red (weak <70%)
- Radar chart: Green filled area for model scores, gray target line at 85%, client brand colors
- Brand annotations: Color-coded highlight tags matching client brand colors ([CASUAL] brand-color-1, [DATA-DRIVEN] brand-color-2, etc.)
- Comparison view: Split screen with clear visual separation, "Generic" vs "[Client] Brand" labels
- Deviation cards: Orange border, warning icon, "Deviation Detected" badge
- Export report preview: Shows client branding (logo, colors) applied to report

Accessibility Guidance
- Alignment badge: aria-label="Strong brand match: 91 percent alignment with [Client] brand, exceeds 85 percent target"
- Overall score: aria-label="91 percent brand alignment score, target 85 percent, exceeds client brand standards"
- Trait cards: aria-label="Casual trait: 4.4 out of 5, 88 percent present, strong alignment" with both icon and text
- Radar chart: Text alternative "Five-trait brand alignment radar chart. Casual 88%, Data-Driven 92%, Transparent 86%, Innovative 82%, Action-Oriented 94%"
- Brand annotations: aria-label="Phrase demonstrates casual trait: 'Hey there!'" (not relying on color alone)
- Comparison view: Clear semantic structure, labeled regions for generic vs custom
- Brand deviation alerts: aria-label="Brand deviation detected in casual trait, 82 percent present, below 85 percent target"
- Interactive elements: Keyboard accessible (Tab/Enter), focus indicators visible

Information Architecture
- Custom Brand section positioned as alternative to default Elena Morales voice validation
- Hierarchy: Alignment badge and overall score (most prominent) → Trait breakdown → Brand examples → Deviation analysis → Customization effectiveness → Comparison with generic
- Progressive disclosure: Overall metrics visible immediately, detailed examples/deviations hidden in expandable sections
- Conditional elements: Brand deviation section only shown if deviations detected, Multiple profile selector only if client has multiple brand profiles
- Integration: Custom brand replaces Elena Morales voice in validation flow (Perplexity → EI → Knowledge → Custom Brand → Overall Quality)

Page Plan
1. **Training Job Details - Custom Brand Validation Screen**
   - Purpose: Display client-specific brand alignment validation with custom trait analysis
   - Components: Custom brand card header with alignment badge, Overall alignment score, Client-defined trait breakdown (5-7 cards), Radar chart, Brand voice comparison (generic vs custom), Custom brand examples, Brand deviation analysis (conditional), Customization effectiveness metrics, Multiple brand profile selector (if applicable), Client brand proof statement, Export actions
   - States: Strong match (≥85%, green), Moderate (70-84%, yellow, deviations flagged), Weak (<70%, red, significant issues)
   - Navigation: Links to other validation sections, Expandable trait details, Brand profile switching, Export to PDF/CSV

2. **Client Trait Detail Modal**
   - Purpose: Show detailed analysis of specific client-defined trait with scoring and examples
   - Components: Trait name and client-provided definition, Score breakdown, Key indicators present, Multiple example quotes demonstrating trait, Comparative analysis (strong vs weak examples), Recommendations for strengthening
   - States: Individual trait view, All traits comparison view
   - Navigation: Close to return to brand card, Next/Previous for other traits

3. **Brand Voice Comparison Modal**
   - Purpose: Demonstrate customization value by comparing generic baseline vs client-trained responses
   - Components: Scenario prompt, Generic baseline response (Elena Morales default), Custom-trained response (client brand), Brand trait annotations for each, Customization success explanation, Side-by-side visual comparison
   - States: Individual comparison view, Multiple comparisons carousel
   - Navigation: Close to return to brand card, Next/Previous for other comparisons

Annotations (Mandatory)
- Attach notes on UI elements citing the specific acceptance criterion they fulfill
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Example annotation: "Client Trait Radar Chart → Visualizes client-defined brand characteristics against 85% target → FR Acceptance Criterion: Custom Trait Breakdown"

Acceptance Criteria → UI Component Mapping

**US Acceptance Criterion 1: Support client-specific brand voice profiles beyond Elena Morales**
- Source: US6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Custom brand card header with client name, Client-defined trait list (variable 5-7 traits), Brand profile selector (if multiple profiles)
- States: Single client brand, Multiple brand profiles (selector visible)
- Notes: Flexible brand validation supports diverse client identities

**US Acceptance Criterion 2: Test 20 scenarios against client-defined brand characteristics**
- Source: US6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Overall alignment score "91%" calculated from 20 scenarios, Custom brand examples showing trait presence
- States: Test complete (results displayed)
- Notes: Same rigorous methodology as default voice validation

**US Acceptance Criterion 3: Score responses across client-specified traits**
- Source: US6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Client-defined trait breakdown (5-7 cards), Individual trait scores, Radar chart visualization
- States: Default (all traits visible), Individual trait expanded (detailed analysis)
- Notes: Customizable to any client-defined personality dimensions

**FR Acceptance Criterion 1: Overall brand alignment score with target threshold (85%)**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Alignment badge (color-coded), Overall score display, Target comparison, Status interpretation
- States: Strong match (≥85%, green), Moderate (70-84%, yellow), Weak (<70%, red)
- Notes: Consistent threshold across all brand types

**FR Acceptance Criterion 2: Client-defined trait breakdown with individual scores**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation; Client Trait Detail Modal
- Components: Variable trait cards (5-7 based on client), Score (X/5), Client-provided indicators, Example quotes, Status badge
- States: Card view (all traits visible), Detail modal (single trait expanded)
- Notes: Adapts to any client-specified brand characteristics

**FR Acceptance Criterion 3: Brand voice comparison (generic vs custom)**
- Source: FR6.4.2
- Screen: Brand Voice Comparison Modal
- Components: Side-by-side comparison, Generic (Elena Morales) response, Custom (client brand) response, Trait annotations for each, Customization success explanation
- States: Comparison view
- Notes: Demonstrates value of customization to client

**FR Acceptance Criterion 4: Custom brand examples with trait annotations**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Top 5 brand examples, Inline trait annotations (client-specific), Alignment score per example, Brand strengths highlighted
- States: Carousel/accordion of examples
- Notes: Tangible demonstration of client brand voice

**FR Acceptance Criterion 5: Brand deviation analysis with recommendations**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Brand deviation section (conditional), Deviation pattern identification, Example quotes showing deviations, Recommended brand voice, Recommendations for correction
- States: No deviations (section hidden), Deviations detected (section visible with alerts)
- Notes: Identifies brand inconsistencies for iterative improvement

**FR Acceptance Criterion 6: Customization effectiveness metrics**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation
- Components: Customization effectiveness card, Comparison metrics (generic vs custom-trained), Improvement quantification, Interpretation
- States: Default (metrics visible)
- Notes: Proves ROI and value of custom training

**FR Acceptance Criterion 7: Export custom brand report with client branding**
- Source: FR6.4.2
- Screen: Training Job Details - Custom Brand Validation; Export Modal
- Components: "Export Brand Report" button, Format selector with branding options, PDF report with client logo/colors, Client-ready proof statement
- States: Export modal closed, Export modal open, Generating report (with client branding), Download ready
- Notes: Professional client-facing deliverable with client visual identity

Non-UI Acceptance Criteria

**FR Criterion: 20-scenario test with client-defined brand situations**
- Impact: Validates brand consistency across contexts relevant to client
- UI Hint: Brand examples show diverse scenario types

**FR Criterion: Flexible brand profile configuration supporting any trait set**
- Impact: Adapts to any client's unique brand identity
- UI Hint: Trait cards dynamically generated based on client profile configuration

**FR Criterion: Score using client-provided brand rubric**
- Impact: Evaluation criteria customized to client's specific brand guidelines
- UI Hint: Trait indicators reflect client-provided definitions

**FR Criterion: Store custom brand data in brand_consistency_results table with client_id**
- Impact: Multi-client support with separate brand tracking per client
- UI Hint: Brand profile selector (if multiple clients) switches validation context

**FR Criterion: Generate comparison with generic baseline**
- Impact: Demonstrates customization value and ROI
- UI Hint: Comparison modal and effectiveness metrics show before/after

Estimated Page Count
- **3 primary screens:**
  1. Training Job Details - Custom Brand Validation Screen (main interface showing alignment score, trait breakdown, examples, deviations, customization metrics)
  2. Client Trait Detail Modal (detailed analysis of individual client-defined brand trait)
  3. Brand Voice Comparison Modal (side-by-side generic vs custom comparison demonstrating customization value)
- Rationale: Minimum 3 screens required to cover primary custom brand display (1), trait-level analysis (2), and customization demonstration (3). Multiple brand profiles and examples handled through selectors and carousels within main screen.

=== END PROMPT FR: FR6.4.2 ===

---

**END OF DOCUMENT**

All Stage 6 Model Quality Validation wireframe prompts complete.
Total prompts generated: 8 (FR6.1.1, FR6.1.2, FR6.2.1, FR6.2.2, FR6.3.1, FR6.3.2, FR6.4.1, FR6.4.2)
