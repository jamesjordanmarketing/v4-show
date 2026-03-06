# E05 — Combined Wireframe Analysis Worksheet

**Generated:** 2025-12-19  
**Stage:** Stage 5 — Training Comparison & Optimization  
**Product:** LoRA Pipeline  
**Section ID:** E05

---

## PHASE 1: Deep Analysis

### Individual FR Catalog

---

### FR5.1.1: Compare Multiple Training Runs
- **Purpose:** Enable AI engineers and technical leads to compare 2-4 training runs side-by-side with overlaid loss curves, metrics comparison tables, and configuration analysis
- **Core Functionality:** Multi-select jobs for comparison, overlaid loss curve visualization, metrics comparison, winner recommendation algorithm, save as template
- **UI Components:**
  - Job selection checkboxes on training list
  - "Compare Jobs" button with selection counter
  - Overlaid loss curves chart (color-coded by job)
  - Interactive legend with show/hide toggles
  - Metrics comparison table (sortable, best-value highlighting)
  - Configuration comparison panels (side-by-side)
  - Winner recommendation card with rationale
  - "Export as PDF" button
  - "Save as Preset Template" button
  - Template creation modal
- **UI States:** Empty (no selection), Selecting (2-4 jobs), Comparison loading, Comparison displayed, Export loading, Template save modal
- **User Interactions:** Multi-select jobs, toggle curve visibility, hover for tooltips, sort table columns, export PDF, save template
- **Page Count:** 4 pages
- **Dependencies:** Links to Template Library (FR5.2.2) for saving templates

---

### FR5.1.2: Configuration Performance Analytics
- **Purpose:** Provide aggregate analytics showing which configurations produce best quality/cost ratios across all training runs
- **Core Functionality:** Performance by preset summary, cost vs quality scatter plot, success rate trends, failure pattern analysis, GPU utilization analysis
- **UI Components:**
  - "Training Analytics" navigation menu item
  - Performance by Preset summary table (3 rows: Conservative/Balanced/Aggressive)
  - Cost vs Quality scatter plot (color-coded by preset)
  - Success Rate Trend line chart (12 months)
  - Common Failure Patterns table with recommendations
  - GPU Utilization pie chart (spot vs on-demand)
  - Spot interruption rate heat map
  - Date range selector
  - "Export as CSV" button
- **UI States:** Loading, Empty (insufficient data), Partial data, Full analytics displayed, Export loading
- **User Interactions:** Navigate to analytics, filter by date range, hover for tooltips, click outliers for details, export CSV
- **Page Count:** 3 pages
- **Dependencies:** None (standalone analytics)

---

### FR5.2.1: Comprehensive Training History
- **Purpose:** Provide comprehensive training history interface with advanced filtering, sorting, and search capabilities
- **Core Functionality:** Filterable job history list, search by name/notes/tags, sortable columns, statistics panel, historical trends, team activity breakdown, CSV export
- **UI Components:**
  - "Training History" page with breadcrumb
  - Quick date range filter chips (7d/30d/90d/All)
  - Search bar (full-text search)
  - Advanced filter panel (date, creator, status, preset, cost range, GPU type, training file, tags)
  - Active filter chips
  - Jobs list table (sortable columns, pagination)
  - Statistics panel (4 cards: Total Jobs, Success Rate, Total Cost, Total Training Time)
  - Historical Trends section (expandable: jobs/month, cost/month, success rate)
  - Team Activity section (expandable)
  - "Export to CSV" button
- **UI States:** Loading, Empty (no results), Default (no filters), Filtered, Search results, Trends expanded, Team activity expanded
- **User Interactions:** Apply filters, search, sort columns, paginate, expand trends, export CSV, click row for details
- **Page Count:** 3 pages
- **Dependencies:** Links to Comparison (FR5.1.1) via multi-select compare action

---

### FR5.2.2: Configuration Templates Library
- **Purpose:** Enable saving successful training configurations as reusable templates with descriptive metadata and analytics
- **Core Functionality:** Save as template from job, template library browsing, template details view, start job from template, template CRUD operations, 3 default templates
- **UI Components:**
  - "Save as Template" button (on job details, success rate >90%)
  - Template creation modal (name, description, visibility, tags, config preview)
  - Template Library page with grid/list view toggle
  - Filter panel (creator, tags, visibility)
  - Template cards (name, description, config summary, usage stats, success rate)
  - Template details modal/page
  - "Start from Template" button
  - Job creation form (pre-filled from template)
  - Edit template modal
  - Delete confirmation modal
  - 3 default template cards (Quick Test, Standard Production, Maximum Quality)
- **UI States:** Empty library, Loading, Template cards displayed, Creation modal, Details view, Edit modal, Delete confirmation
- **User Interactions:** Save as template, browse library, filter/sort, view details, start from template, edit, delete
- **Page Count:** 6 pages
- **Dependencies:** Receives templates from FR5.1.1 winner saving

---

## FR Relationships & Integration Points

### Sequential Flow (User Journey)

```
Training History (FR5.2.1)
    ↓ [Select 2 jobs]
Compare Jobs (FR5.1.1)
    ↓ [Save winner]
Template Library (FR5.2.2)
    ↓ [Start from template]
Job Creation (new job)
    ↓ [Complete job]
Analytics Dashboard (FR5.1.2)
```

### Complementary Features (Same Mental Model)

- **Group 1 (Job Browsing):** FR5.2.1 History list + FR5.1.2 Analytics dashboard
- **Group 2 (Comparison & Optimization):** FR5.1.1 Job Comparison + FR5.2.2 Template saving
- **Group 3 (Template Reuse):** FR5.2.2 Template Library + Job creation with template pre-fill

### State Dependencies

- FR5.2.1 selection state → triggers FR5.1.1 comparison view
- FR5.1.1 winner identification → enables FR5.2.2 template saving
- FR5.2.2 template selection → pre-fills job creation form
- Job completion → updates FR5.1.2 analytics data
- Job completion (>90% success) → enables FR5.2.2 "Save as Template"

### UI Component Sharing

| Component | FR5.1.1 | FR5.1.2 | FR5.2.1 | FR5.2.2 |
|-----------|---------|---------|---------|---------|
| Job table with selection | ✓ (compare) | ✗ | ✓ (primary) | ✗ |
| Statistics cards | ✗ | ✓ (primary) | ✓ (summary) | ✗ |
| Template cards | ✗ | ✗ | ✗ | ✓ (primary) |
| Export button | ✓ (PDF) | ✓ (CSV) | ✓ (CSV) | ✗ |
| Filter panel | ✗ | ✓ (date) | ✓ (full) | ✓ (templates) |
| Charts (loss curves) | ✓ (primary) | ✗ | ✗ | ✗ |
| Charts (analytics) | ✗ | ✓ (primary) | ✓ (trends) | ✗ |

---

## Overlaps & Duplications to Consolidate

### 1. Job Table Interface Duplication
- **FR5.2.1** has comprehensive jobs list table with filters/sort/pagination
- **FR5.1.1** has job selection list for comparison
- **CONSOLIDATION:** Use FR5.2.1's table as primary interface, add multi-select checkboxes for FR5.1.1's compare functionality

### 2. Statistics Display Duplication
- **FR5.2.1** has statistics panel (Total Jobs, Success Rate, Total Cost, Total Time)
- **FR5.1.2** has analytics dashboard with similar metrics plus charts
- **CONSOLIDATION:** Merge into single "Training Dashboard" that shows key stats inline with history, link to detailed analytics view

### 3. Export Functionality Duplication
- **FR5.1.1** exports comparison as PDF
- **FR5.1.2** exports analytics as CSV
- **FR5.2.1** exports history as CSV
- **CONSOLIDATION:** Standardize export pattern - single "Export" dropdown with format options

### 4. Template Saving Entry Points
- **FR5.1.1** saves comparison winner as template
- **FR5.2.2** saves any successful job as template from job details
- **CONSOLIDATION:** Unified template creation modal, accessible from both comparison winner and job details

### 5. Chart Libraries
- **FR5.1.1** has overlaid loss curves chart
- **FR5.1.2** has scatter plot, line charts, pie chart, heat map
- **FR5.2.1** has bar chart, line charts
- **CONSOLIDATION:** For POC, focus on:
  - Loss curves (FR5.1.1 - essential for comparison)
  - Metrics table visual comparison (eliminate redundant charts)

### 6. Job Details Navigation
- **FR5.1.2** links from scatter plot outlier to job details
- **FR5.2.1** links from table row click to job details
- **FR5.2.2** links from template analytics to jobs using template
- **CONSOLIDATION:** Consistent job details page accessed from all entry points

---

## POC Simplification Opportunities

### Features to KEEP (Essential for POC)

1. ✅ **Training History List (FR5.2.1)** - Primary way to browse past jobs
2. ✅ **Basic Filters (FR5.2.1)** - Date range, status, preset filters
3. ✅ **Compare 2 Jobs (FR5.1.1)** - Core comparison with loss curves and metrics
4. ✅ **Winner Recommendation (FR5.1.1)** - Algorithm-driven best job identification
5. ✅ **Save Winner as Template (FR5.1.1 → FR5.2.2)** - Key knowledge preservation
6. ✅ **Template Library (FR5.2.2)** - Browse and select templates
7. ✅ **3 Default Templates (FR5.2.2)** - Quick Test, Standard Production, Maximum Quality
8. ✅ **Start from Template (FR5.2.2)** - Pre-fill job creation
9. ✅ **Key Statistics (FR5.1.2 simplified)** - Total jobs, success rate, avg cost
10. ✅ **Multi-select for Compare (FR5.2.1)** - Trigger comparison from history

### Features to SIMPLIFY (Reduce Complexity)

1. 🔽 **Analytics Dashboard (FR5.1.2):**
   - REMOVE: Scatter plots, trend line charts, heat maps, failure pattern recommendations
   - KEEP: Summary statistics cards (4 metrics) displayed inline on history page

2. 🔽 **Job Comparison (FR5.1.1):**
   - REMOVE: Compare 3-4 jobs, zoom/pan on charts, share comparison link
   - KEEP: Compare 2 jobs, overlaid loss curves, metrics table, winner recommendation

3. 🔽 **History Filters (FR5.2.1):**
   - REMOVE: Team activity breakdown, leaderboard, historical trend charts
   - KEEP: Date range, status, preset, creator filters

4. 🔽 **Template Library (FR5.2.2):**
   - REMOVE: Template version history, duplicate action, complex analytics charts
   - KEEP: Browse, filter, usage count, success rate, start from template

5. 🔽 **Export (all FRs):**
   - REMOVE: CSV column customization modal, export preview
   - KEEP: Simple one-click export with standard format

### Features to REMOVE (Nice-to-Have for V2)

1. ❌ Cost vs Quality scatter plot with outlier highlighting (FR5.1.2)
2. ❌ Success Rate Trend line chart - 12 months (FR5.1.2)
3. ❌ Common Failure Patterns with recommendations (FR5.1.2)
4. ❌ GPU Utilization pie chart and interruption heat map (FR5.1.2)
5. ❌ Compare 3-4 jobs simultaneously (FR5.1.1)
6. ❌ Historical Trends expandable section (FR5.2.1)
7. ❌ Team Activity breakdown and leaderboard (FR5.2.1)
8. ❌ Template version history (FR5.2.2)
9. ❌ "Duplicate Template" action (FR5.2.2)
10. ❌ Jobs created from template list in details (FR5.2.2)
11. ❌ PDF export customization (FR5.1.1)

### Rationale
- **POC Goal:** Demonstrate core workflow (browse history → compare jobs → save winner as template → reuse template)
- **Essential:** Job browsing, comparison, template reuse
- **Non-Essential:** Advanced analytics, trend charts, team features

---

## PHASE 2: Integration Planning

### Unified UX Flow Design

**Consolidated Architecture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    TRAINING HUB (Main Page)                       │
│   Combines: FR5.2.1 History + FR5.1.2 Statistics (simplified)    │
├──────────────────────────────────────────────────────────────────┤
│ HEADER: Training Jobs                                             │
│ [View Templates] [Compare (2)]        Quick Stats: 147 jobs | 94%│
├──────────────────────────────────────────────────────────────────┤
│ FILTERS: [Last 30d ▼] [Status ▼] [Preset ▼] [Search...]          │
├──────────────────────────────────────────────────────────────────┤
│ STATS PANEL: [Total: 147] [Success: 94%] [Cost: $6,854] [Hours]  │
├──────────────────────────────────────────────────────────────────┤
│ JOBS TABLE:                                                       │
│ ☐ │ Job Name        │ Status    │ Preset   │ Cost  │ Duration │  │
│ ☑ │ Elena Morales   │ ✓ Done    │ Balanced │ $52   │ 13.2 hrs │  │
│ ☑ │ Marcus Chen     │ ✓ Done    │ Aggress  │ $87   │ 18.4 hrs │  │
│ ☐ │ Sarah Kim       │ ✗ Failed  │ Balanced │ $24   │ 6.2 hrs  │  │
│                                                                   │
│ Showing 1-25 of 147    [< Prev] [1] [2] [3] ... [6] [Next >]     │
├──────────────────────────────────────────────────────────────────┤
│ [Compare Selected (2)] enabled when 2 jobs checked               │
└──────────────────────────────────────────────────────────────────┘
                           ↓ Click "Compare Selected"
┌──────────────────────────────────────────────────────────────────┐
│                COMPARISON VIEW (Page 2)                           │
│                       FR5.1.1                                     │
├──────────────────────────────────────────────────────────────────┤
│ [← Back to Training Jobs]    COMPARING: Job A vs Job B           │
├──────────────────────────────────────────────────────────────────┤
│ ⭐ WINNER: Job A (Balanced) - Best quality/cost ratio             │
│    • Lowest validation loss: 0.298 (15% better)                   │
│    • Cost efficient: $52 for 34% improvement                      │
│    [Use This Configuration]  [Save as Template]                   │
├──────────────────────────────────────────────────────────────────┤
│                   LOSS CURVES (overlaid)                          │
│    ┌──────────────────────────────────────────────┐              │
│    │      ────── Job A (blue)                     │              │
│    │      ────── Job B (green)                    │              │
│    │  Loss curves chart with legend               │              │
│    └──────────────────────────────────────────────┘              │
│    [☑ Training Loss] [☑ Validation Loss] Toggle controls         │
├──────────────────────────────────────────────────────────────────┤
│ METRICS COMPARISON:                                               │
│ │ Metric      │ Job A (★) │ Job B    │ Difference              │ │
│ │ Final Loss  │ 0.298     │ 0.342    │ Job A 15% better        │ │
│ │ Cost        │ $52       │ $87      │ Job A $35 cheaper       │ │
│ │ Duration    │ 13.2 hrs  │ 18.4 hrs │ Job A 28% faster        │ │
│ │ Preset      │ Balanced  │ Aggress  │ Different presets       │ │
├──────────────────────────────────────────────────────────────────┤
│ CONFIG COMPARISON:                                                │
│ │ Parameter        │ Job A        │ Job B      │ Diff?          ││
│ │ Preset           │ Balanced     │ Aggressive │ ⚠ Different    ││
│ │ r (rank)         │ 16           │ 32         │ ⚠ Different    ││
│ │ Learning Rate    │ 2e-4         │ 3e-4       │ ⚠ Different    ││
│ │ Epochs           │ 3            │ 4          │ ⚠ Different    ││
│ │ GPU Type         │ Spot         │ Spot       │ Same           ││
└──────────────────────────────────────────────────────────────────┘
                           ↓ Click "Save as Template"
┌──────────────────────────────────────────────────────────────────┐
│              TEMPLATE CREATION MODAL (Overlay)                    │
│                       FR5.2.2                                     │
├──────────────────────────────────────────────────────────────────┤
│ [×] Save Configuration as Template                                │
├──────────────────────────────────────────────────────────────────┤
│ Template Name: [Elena Morales - Balanced - High Quality    ]     │
│ Description:   [Best config for 200+ conversation datasets  ]    │
│                [with emotional intelligence focus.           ]    │
│ Visibility:    ◉ Team (shared)  ○ Private (only me)              │
│ Tags:          [production] [balanced] [high-quality] [+ Add]    │
├──────────────────────────────────────────────────────────────────┤
│ Configuration Preview:                                            │
│ • Preset: Balanced                                                │
│ • Rank: 16, LR: 2e-4, Epochs: 3, Batch: 4                        │
│ • GPU: Spot ($2.49/hr)                                            │
│ • Checkpoint: Every 500 steps                                     │
├──────────────────────────────────────────────────────────────────┤
│                        [Cancel]  [Save Template]                  │
└──────────────────────────────────────────────────────────────────┘
                           ↓ View Templates
┌──────────────────────────────────────────────────────────────────┐
│               TEMPLATE LIBRARY (Page 3)                           │
│                       FR5.2.2                                     │
├──────────────────────────────────────────────────────────────────┤
│ HEADER: Configuration Templates                                   │
│ [Search templates...]        [Grid ▣] [List ≡]                   │
├──────────────────────────────────────────────────────────────────┤
│ FILTERS: [All ▼] [Tags ▼]                                        │
├──────────────────────────────────────────────────────────────────┤
│ DEFAULT TEMPLATES:                                                │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│ │ 🏷 SYSTEM       │ │ 🏷 SYSTEM       │ │ 🏷 SYSTEM       │      │
│ │ Quick Test      │ │ Standard Prod   │ │ Maximum Quality │      │
│ │ Conservative,1ep│ │ Balanced, 3ep   │ │ Aggressive, 4ep │      │
│ │ 156 uses | 99%  │ │ 245 uses | 97%  │ │ 89 uses | 94%   │      │
│ │ [Start from ▶]  │ │ [Start from ▶]  │ │ [Start from ▶]  │      │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘      │
├──────────────────────────────────────────────────────────────────┤
│ MY TEMPLATES:                                                     │
│ ┌─────────────────┐ ┌─────────────────┐                          │
│ │ 👤 TEAM         │ │ 🔒 PRIVATE      │                          │
│ │ Elena Morales   │ │ Experiment #1   │                          │
│ │ High Quality    │ │ Test setup      │                          │
│ │ Balanced, 3 ep  │ │ Conservative    │                          │
│ │ 23 uses | 96%   │ │ 5 uses | 100%   │                          │
│ │ [Start from ▶]  │ │ [Start from ▶]  │                          │
│ └─────────────────┘ └─────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

### Component Interaction Map

```typescript
// Unified state across pages
interface Stage5State {
  // Training Hub (FR5.2.1 + FR5.1.2)
  jobs: TrainingJob[];
  filters: {
    dateRange: '7d' | '30d' | '90d' | 'all' | DateRange;
    status: ('completed' | 'failed' | 'cancelled')[];
    preset: 'all' | 'conservative' | 'balanced' | 'aggressive';
    search: string;
  };
  selectedJobIds: string[];  // For comparison multi-select
  stats: {
    totalJobs: number;
    successRate: number;
    totalCost: number;
    totalHours: number;
  };
  
  // Comparison View (FR5.1.1)
  comparison: {
    jobA: TrainingJob | null;
    jobB: TrainingJob | null;
    winner: 'A' | 'B' | null;
    winnerRationale: string[];
  };
  showLossCurves: { training: boolean; validation: boolean };
  
  // Template Library (FR5.2.2)
  templates: Template[];
  templateFilters: {
    creator: 'all' | 'me' | 'team';
    tags: string[];
    visibility: 'all' | 'private' | 'team';
  };
  
  // Template Creation Modal
  newTemplate: {
    name: string;
    description: string;
    visibility: 'private' | 'team';
    tags: string[];
    sourceJobId: string;
  };
}
```

### Navigation Flow

```
┌─────────────────────────┐
│       Main Nav          │
│  • Dashboard            │
│  • Training Jobs ←─────────────────┐
│  • Training History ←────────────────│─ Training Hub
│  • Templates ←───────────────────────│─ Template Library
│  • Analytics ←──────────────────────────────────────────── (Deferred for POC)
└─────────────────────────┘

Training Hub Actions:
  → Select 2 jobs → "Compare Selected" → Comparison View
  → Click template icon → Template Library
  → Click job row → Job Details

Comparison View Actions:
  → "Save as Template" → Template Creation Modal
  → "Back" → Training Hub
  → "Use Configuration" → Job Creation (pre-filled)

Template Library Actions:
  → "Start from Template" → Job Creation (pre-filled)
  → Click template card → Template Details
  → Edit/Delete → Modal overlays
```

---

## PHASE 3: POC Simplification

### POC-Optimized Feature Set

#### Page 1: Training Hub (Combines FR5.2.1 + FR5.1.2)
**Training History with Stats:**
- Quick filter chips (Last 7d/30d/90d/All)
- Status dropdown (Completed/Failed/Cancelled)
- Preset dropdown (Conservative/Balanced/Aggressive)
- Search bar
- Statistics row: Total Jobs | Success Rate | Total Cost | Total Hours
- Jobs table with multi-select checkboxes
- Pagination (25/50/100 per page)
- "Compare Selected (N)" button (enabled when 2 jobs selected)
- "View Templates" button in header

**Removed for POC:**
- Historical trend charts (jobs/month, cost/month)
- Team activity breakdown
- Advanced cost range filter
- Tag filtering
- Leaderboard

#### Page 2: Job Comparison (FR5.1.1)
**Compare 2 Jobs:**
- Back navigation
- Winner recommendation card with rationale
- Overlaid loss curves chart (2 jobs, color-coded)
- Toggle controls: Training Loss / Validation Loss
- Metrics comparison table (sortable, best-highlighted)
- Configuration diff view (side-by-side)
- "Save as Template" button on winner

**Removed for POC:**
- Compare 3-4 jobs
- Zoom/pan on charts
- PDF export
- Share comparison link
- Template creation from non-winner

#### Modal: Template Creation (FR5.2.2)
**Save Configuration as Template:**
- Template name (auto-suggested, editable)
- Description (optional, 500 chars)
- Visibility toggle (Private/Team)
- Tags (multi-select from common + custom)
- Configuration preview (read-only)
- Save/Cancel buttons

**Removed for POC:**
- Version tracking

#### Page 3: Template Library (FR5.2.2)
**Browse Templates:**
- Grid view (default) with toggle to list
- Filter by visibility (All/Private/Team)
- Filter by tags
- Sort by name/date/usage
- Default templates section (3 system templates)
- User templates section
- Template cards with: Name, description, config summary, usage count, success rate
- "Start from Template" button per card

**Removed for POC:**
- Template version history
- Duplicate template action
- Jobs created from template list
- Advanced analytics per template

#### Page 4: Template Details Modal (FR5.2.2)
**View Template Information:**
- Full name, creator, created date
- Full description
- All tags
- Complete configuration details
- Analytics: Usage count, success rate, avg cost, avg duration
- Actions: Start from Template, Edit, Delete

**Removed for POC:**
- Jobs created from template list
- Success rate trend chart

---

## Page Count Optimization

### Original Total: 16 pages across 4 FRs
- FR5.1.1: 4 pages (Compare Runs)
- FR5.1.2: 3 pages (Analytics Dashboard)
- FR5.2.1: 3 pages (Training History)
- FR5.2.2: 6 pages (Template Library)

### Combined & Simplified: 8 pages

1. **Training Hub - Empty State** (1 page)
   - All filter controls at default
   - Empty jobs table with helpful message
   - "No training jobs yet. Create your first training job."

2. **Training Hub - Populated** (1 page)
   - Filters active showing "Last 30 days"
   - Statistics row with real numbers
   - Jobs table with 5-10 sample rows
   - Pagination showing "1-25 of 147"

3. **Training Hub - Jobs Selected for Compare** (1 page)
   - 2 jobs checked with checkboxes
   - "Compare Selected (2)" button enabled (highlighted)
   - Selection counter visible

4. **Comparison View - Full Display** (1 page)
   - Winner banner with rationale
   - Overlaid loss curves (2 lines)
   - Metrics table with best values highlighted
   - Config comparison with differences marked
   - "Save as Template" button prominent

5. **Template Creation Modal** (1 page)
   - Modal overlay on comparison view
   - Form fields populated with suggested values
   - Configuration preview showing winner's settings

6. **Template Library - Grid View** (1 page)
   - 3 default templates prominently displayed
   - 2-3 user templates
   - Filter controls visible
   - "Start from Template" buttons on each card

7. **Template Details Modal** (1 page)
   - Full template information
   - Analytics section
   - Action buttons (Start, Edit, Delete)

8. **Mobile Responsive Layout** (1 page)
   - Training Hub adapted for mobile
   - Stacked cards instead of table
   - Simplified navigation

### Reduction Strategy

| Area | Original | Combined | Savings |
|------|----------|----------|---------|
| Analytics (FR5.1.2) | 3 pages | Merged into Hub stats | -3 pages |
| Comparison (FR5.1.1) | 4 pages | 1 comprehensive page | -3 pages |
| History (FR5.2.1) | 3 pages | 3 pages (Hub) | 0 pages |
| Templates (FR5.2.2) | 6 pages | 3 pages + modals | -3 pages |
| **Total** | **16 pages** | **8 pages** | **-8 pages (50%)** |

---

**End of Analysis Worksheet**
