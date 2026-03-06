# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/16/2025  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\01-pipeline-overview.md`
- User Stories: `pmc\product\02-pipeline-user-stories.md`


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
