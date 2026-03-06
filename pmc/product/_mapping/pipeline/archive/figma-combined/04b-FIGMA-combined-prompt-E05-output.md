# LoRA Pipeline - Stage 5 Combined Figma Wireframe Prompt

**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 5 — Training Comparison & Optimization  
**Section ID:** E05  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E05.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E05.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E05-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 5 — Training Comparison & Optimization - Complete Integrated Wireframe System

**Context Summary**

This stage enables AI engineers and technical leads to compare completed training runs, identify optimal configurations through data-driven analysis, and preserve successful setups as reusable templates. The interface consolidates training history browsing, side-by-side job comparison with overlaid loss curves, winner recommendation algorithms, and a template library for organizational knowledge building. The system prioritizes simplicity and proof-of-concept speed while maintaining core functionality for iterative training optimization and team knowledge sharing.

**Journey Integration**

- **Stage 5 User Goals:** Compare training experiments to identify best configurations, track team training history and success patterns, build reusable template library of proven setups, make data-driven decisions for production deployments
- **Key Emotions:** Confidence in optimization decisions, satisfaction from identifying winning configurations, pride in building team knowledge, excitement about continuous improvement
- **Progressive Disclosure:**
  * Basic: Browse training history, compare 2 jobs, start from template
  * Advanced: Filter/sort history, analyze comparison metrics, save custom templates
  * Expert: Configuration diff analysis, template analytics, team-wide pattern recognition
- **Persona Adaptations:** Unified interface serving AI engineers (comparison and optimization), technical leads (strategic configuration decisions), and team managers (knowledge preservation and best practices)

**Wireframe Goals**

- Enable browsing complete training history with filtering by date, status, and preset
- Display key statistics (total jobs, success rate, total cost, total training hours) inline with history
- Support multi-select of 2 jobs for side-by-side comparison
- Show overlaid training and validation loss curves for visual comparison
- Present metrics comparison table highlighting best values in each category
- Provide algorithm-driven winner recommendation with clear rationale
- Enable saving winner configuration as reusable template
- Display template library with default and user-created templates
- Support starting new training jobs from templates with pre-filled configuration
- Provide template CRUD operations (create, view, edit, delete)

---

## Explicit UI Requirements

### SECTION 1: Training Hub — History with Statistics (FR5.2.1 + FR5.1.2 Simplified)

**Page Header:**
- Page title: "Training Jobs"
- "View Templates" button (secondary, navigates to template library)
- Quick stats summary: "{N} jobs | {X}% success" (inline with title)

**Quick Filter Chips:**
- Date range: Last 7 days | Last 30 days | Last 90 days | All time (toggle chips, one active)
- Default: "Last 30 days" selected

**Filter Controls Row:**
- Status dropdown: All | Completed | Failed | Cancelled (multi-select checkboxes)
- Preset dropdown: All | Conservative | Balanced | Aggressive
- Search bar: "Search jobs by name..." (full-text search)
- "Reset Filters" link (clears all, appears when any filter active)

**Statistics Panel:**
- 4 horizontal metric cards in a row:
  * **Total Jobs:** Large number (e.g., "147"), label "Jobs", icon: list
  * **Success Rate:** Percentage (e.g., "94%"), label "Success", color: green if ≥90%, yellow if 80-89%, red if <80%
  * **Total Cost:** Dollar amount (e.g., "$6,854"), label "Total Cost", icon: dollar
  * **Training Hours:** Hours (e.g., "1,843"), label "Hours", icon: clock
- Cards update when filters applied (show filtered subset metrics)

**Jobs Table:**
- Checkbox column (first column): For multi-select comparison
- Columns:
  * Job Name (truncated with tooltip for full name, clickable to details)
  * Status badge: ✓ Completed (green) | ✗ Failed (red) | ○ Cancelled (gray)
  * Preset badge: Conservative (green) | Balanced (blue) | Aggressive (orange)
  * Cost: "$52.00" formatted
  * Duration: "13.2 hrs" formatted
  * Created: "Dec 18, 2025" date
  * Actions: "⋮" menu with View Details, Clone
- Sortable columns: Click header to sort ascending/descending with arrow indicator
- Default sort: Created date, newest first
- Row hover: Light background highlight
- Row click (anywhere except checkbox): Opens job details

**Pagination Controls:**
- Bottom of table
- "Showing 1-25 of 147 jobs"
- Page size: 25 | 50 | 100 dropdown
- Page navigation: ‹ Previous | Page numbers | Next ›

**Compare Action Bar:**
- Sticky bar at bottom of page (appears when jobs selected)
- Selection counter: "2 jobs selected"
- "Compare Selected" button: Primary blue, enabled only when exactly 2 jobs selected
- "Clear Selection" link

**States:**
- **Empty state (no jobs):** "No training jobs yet. Start your first training job to see it here." with action button
- **Empty state (filtered):** "No jobs match your filters. Try adjusting filters or search."
- **Loading state:** Skeleton rows in table, loading spinners in stats cards
- **Default state:** No filters active, all jobs displayed
- **Filtered state:** Active filter chips displayed below controls, stats reflect filtered subset

---

### SECTION 2: Job Comparison View (FR5.1.1 Simplified)

**Page Header:**
- Back navigation: "← Back to Training Jobs"
- Title: "Comparing Jobs"
- Subtitle showing compared job names: "Job A vs Job B"

**Winner Recommendation Card:**
- Prominent card at top with visual emphasis (border, background color)
- Badge: "⭐ Winner" or "✓ Recommended"
- Winner identification: "Recommended: Job A (Balanced preset)"
- Subtitle: "Best quality/cost ratio"
- Rationale bullets (3 key points):
  * "Lowest validation loss: 0.298 (15% better than Job B)"
  * "Cost efficient: $52 for quality vs $87 for slightly lower quality"
  * "Optimal duration: 13.2 hours (28% faster)"
- Action buttons:
  * "Save as Template" (primary button, opens template creation modal)
  * "Use This Configuration" (secondary, pre-fills job creation)

**Overlaid Loss Curves Section:**
- Section title: "Training Progress Comparison"
- Chart area showing overlaid curves:
  * Job A line (blue, solid)
  * Job B line (green, solid)
  * X-axis: Training steps (0 to max)
  * Y-axis: Loss value (auto-scaled)
  * Final values labeled: data point markers at curve endpoints
- Interactive legend:
  * "Job A: {name}" with blue indicator
  * "Job B: {name}" with green indicator
  * Click to show/hide individual curves
- Toggle controls below chart:
  * [☑] Training Loss
  * [☑] Validation Loss
  * Toggle independently to show/hide curve types
- Tooltip on hover: "Job A - Step 850: Training Loss 0.342, Validation Loss 0.358"

**Metrics Comparison Table:**
- Table structure with highlight styling:
  * Header row: Metric | Job A | Job B | Difference
  * Best value cells: Green background
- Rows:
  * Final Training Loss: values, best highlighted, difference: "Job A 12% better"
  * Final Validation Loss: values, best highlighted, difference: "Job A 15% better"
  * Perplexity Improvement: percentages, best highlighted
  * Duration: hours, best highlighted, difference: "Job A 28% faster"
  * Cost: dollars, best highlighted, difference: "Job A $35 cheaper"
  * GPU Type: Spot/On-Demand text
  * Preset: Conservative/Balanced/Aggressive badges

**Configuration Comparison Section:**
- Section title: "Configuration Details"
- Two-column layout (Job A | Job B)
- Each column shows:
  * Job name header with color indicator (blue/green)
  * Preset badge
  * Key hyperparameters table:
    - Rank (r): value
    - Learning Rate: value (formatted: 2e-4)
    - Epochs: value
    - Batch Size: value
    - Gradient Accumulation Steps: value
  * GPU Settings:
    - GPU Type: Spot/On-Demand
    - Hourly Rate: $X.XX
  * Training File: file name (truncated)
- Difference highlighting: Yellow background on rows where values differ
- Same values: No highlight, checkmark icon

**States:**
- **Loading state:** Skeleton for chart, loading spinner
- **Displayed state:** Full comparison with all sections populated
- **Partial data state:** Warning banner if some metrics missing from one job

---

### MODAL: Template Creation (FR5.2.2)

**Modal Appearance:**
- Full-screen overlay with dimmed background
- Centered modal card (medium width, ~500px)
- Close button (X) in top-right corner
- Click outside to close (with unsaved changes warning if form dirty)

**Modal Header:**
- Title: "Save Configuration as Template"
- Subtitle: "Create a reusable template from this configuration"

**Form Fields:**
- **Template Name (required):**
  * Input field with label "Template Name"
  * Auto-populated suggestion: "{Training File Name} - {Preset} - High Quality"
  * Editable by user
  * Character counter: "45/100 characters"
  * Validation: 3-100 characters, check for duplicate names
  * Error state: "Template name already exists"

- **Description (optional):**
  * Textarea with label "Description"
  * Placeholder: "Describe when to use this template..."
  * Character counter: "0/500 characters"
  * 3-4 lines visible

- **Visibility (required):**
  * Radio button group with label "Visibility"
  * Options:
    - ◉ Team: "Visible to all team members" (default selected)
    - ○ Private: "Only visible to me"

- **Tags (optional):**
  * Multi-select dropdown or tag input
  * Label: "Tags"
  * Common tags provided: production, experimental, balanced, conservative, aggressive, high-quality, client-delivery
  * Allow custom tag creation: Type and press Enter
  * Selected tags shown as removable chips below input

**Configuration Preview Section:**
- Section title: "Configuration to Save" (read-only)
- Card showing:
  * Preset badge and name
  * Key parameters: "r=16, lr=2e-4, epochs=3, batch=4"
  * GPU type: "Spot Instance ($2.49/hr)"
  * Checkpoint: "Every 500 steps"
- Note text: "This exact configuration will be saved as the template"

**Modal Actions:**
- "Cancel" button (secondary, left side)
- "Save Template" button (primary, right side)
  * Enabled when name is filled and valid
  * Loading state: "Saving..." with spinner
- Success: Modal closes, toast notification: "Template saved successfully. View in Template Library."

**States:**
- **Initial:** Form empty except auto-populated name
- **Editing:** User modifying fields
- **Validating:** Real-time validation on name field
- **Saving:** Loading spinner, buttons disabled
- **Error:** Error message shown inline
- **Success:** Modal closes, toast appears

---

### SECTION 3: Template Library (FR5.2.2 Simplified)

**Page Header:**
- Page title: "Configuration Templates"
- "← Back to Training Jobs" link (if navigated from Training Hub)
- Search bar: "Search templates..."
- View toggle: Grid view (default) | List view buttons

**Filter Controls:**
- Filter by Creator: All | My Templates | Team Templates (dropdown)
- Filter by Tags: Multi-select tag dropdown (all tags used in templates)
- Sort by: Name (A-Z) | Newest | Most Used | Highest Success Rate (dropdown)
- Active filters shown as removable chips

**Default Templates Section:**
- Section header: "System Templates" with info icon explaining these are pre-configured defaults
- 3 template cards horizontally (or 3 columns in grid):

**Template Card 1: Quick Test**
- Badge: "SYSTEM DEFAULT" (blue)
- Name: "Quick Test"
- Description: "Minimal cost configuration for rapid testing"
- Config summary: "Conservative • 1 epoch • ~$15-20"
- Stats: "156 uses | 99% success"
- Action: "Start from Template" button

**Template Card 2: Standard Production**
- Badge: "SYSTEM DEFAULT" (blue), "★ RECOMMENDED" (gold)
- Name: "Standard Production"
- Description: "Proven quality for production use"
- Config summary: "Balanced • 3 epochs • ~$50-60"
- Stats: "245 uses | 97% success"
- Action: "Start from Template" button

**Template Card 3: Maximum Quality**
- Badge: "SYSTEM DEFAULT" (blue)
- Name: "Maximum Quality"
- Description: "Highest quality for premium deliveries"
- Config summary: "Aggressive • 4 epochs • ~$80-100"
- Stats: "89 uses | 94% success"
- Action: "Start from Template" button

**User Templates Section:**
- Section header: "Your Templates" (shows count: "5 templates")
- Grid of template cards (responsive: 3 columns desktop, 2 tablet, 1 mobile)

**Template Card Structure (User Templates):**
- Visibility badge: "TEAM" (blue) or "PRIVATE" (gray lock icon)
- Template name (bold, truncated with tooltip)
- Description (2 lines, truncated)
- Tags as chips: [production] [balanced] [client-delivery]
- Configuration summary: "Balanced • 3 epochs • r=16"
- Analytics row:
  * Usage count: "23 uses" with icon
  * Success rate: "96%" with checkmark, color-coded (green ≥90%, yellow 80-89%, red <80%)
  * Avg cost: "$52"
- Action button: "Start from Template" (full width at card bottom)
- Edit menu (⋮ three dots in top-right):
  * View Details
  * Edit (if creator)
  * Delete (if creator)
- Card hover: Subtle shadow lift, border highlight
- Card click (body): Opens template details modal

**Empty States:**
- **No templates:** "No templates found. Save your first successful configuration as a template."
- **No filter results:** "No templates match your filters. Try adjusting your search."

**Pagination:**
- If >12 templates: "Showing 1-12 of 25" with page navigation

---

### MODAL: Template Details (FR5.2.2)

**Modal Appearance:**
- Full-screen overlay, centered modal (larger than creation modal)
- Close button (X) in top-right

**Modal Header:**
- Template name (large)
- Visibility badge: "TEAM" or "PRIVATE"
- Creator and date: "Created by John Smith • Dec 15, 2025"

**Template Information:**
- **Description** (full, untruncated)
- **Tags** (all tags as chips)

**Configuration Details Section:**
- Section title: "Configuration"
- Full parameter list in two-column layout:
  * Preset: [Badge + name]
  * Rank (r): 16
  * Learning Rate: 2e-4
  * Epochs: 3
  * Batch Size: 4
  * Gradient Accumulation Steps: 4
  * GPU Type: Spot Instance
  * Hourly Rate: $2.49/hr
  * Checkpoint Frequency: Every 500 steps

**Analytics Section:**
- Section title: "Template Analytics"
- Metrics displayed in row:
  * Usage Count: "23 uses" (icon + number)
  * Success Rate: "96%" (color-coded badge)
  * Average Cost: "$52" (icon + amount)
  * Average Duration: "13.2 hrs" (icon + time)
- If template is new (0 uses): "No usage data yet"

**Modal Actions:**
- "Start from Template" (primary, prominent)
- "Edit Template" (secondary, only if user is creator)
- "Delete Template" (destructive red, only if creator, opens confirmation)
- "Close" (tertiary)

---

### MODAL: Edit Template (FR5.2.2)

**Modal Header:**
- Title: "Edit Template"

**Editable Fields:**
- **Description:** Textarea with current value
- **Tags:** Tag input with current tags
- **Visibility:** Radio buttons with current selection

**Non-Editable Fields (with explanation):**
- **Template Name:** Displayed but grayed, tooltip: "Name cannot be changed. Create a new template if needed."
- **Configuration:** Displayed but read-only, tooltip: "Configuration cannot be modified. Use 'Duplicate' to create a variant."

**Modal Actions:**
- "Cancel" (secondary)
- "Save Changes" (primary)

---

### MODAL: Delete Template Confirmation (FR5.2.2)

**Modal Appearance:**
- Warning modal (smaller, centered)
- Warning icon (red exclamation)

**Content:**
- Title: "Delete Template?"
- Warning text: "This will permanently delete the template '{template name}'"
- Reassurance: "Jobs created from this template will not be affected."
- Usage stat: "This template has been used 23 times."
- High usage warning (if >10 uses): Additional confirmation required - "Type the template name to confirm:"
  * Text input for template name
  * Delete button enabled only when name matches exactly

**Modal Actions:**
- "Cancel" (secondary)
- "Delete Template" (destructive red)
  * Disabled until name typed correctly (for high-usage templates)

---

## Interactions and Flows

### 1. Training Hub Browsing Flow
1. User navigates to "Training Jobs" from main navigation
2. Page loads with default view: Last 30 days, all statuses, all presets, sorted by newest
3. Statistics panel shows: "147 jobs | 94% success | $6,854 total | 1,843 hours"
4. Jobs table displays first 25 jobs with pagination
5. User applies filters: Status = Completed, Preset = Balanced
6. Table refreshes to show filtered jobs (e.g., 47 jobs)
7. Statistics update to reflect filtered subset
8. User uses search: Enters "financial"
9. Table filters to jobs matching search (e.g., 8 jobs)

### 2. Job Comparison Flow
1. User views Training Hub with jobs displayed
2. User clicks checkbox on first job → "1 job selected" appears
3. User clicks checkbox on second job → "2 jobs selected", "Compare Selected" button enables
4. User clicks "Compare Selected" button
5. Navigation to Comparison View page
6. Page loads with loading skeleton, then displays:
   - Winner recommendation card at top
   - Overlaid loss curves chart (both jobs)
   - Metrics comparison table
   - Configuration comparison (side-by-side)
7. User toggles visibility: Unchecks "Training Loss" → Only validation curves shown
8. User hovers over chart → Tooltip shows exact values at that step
9. User reviews metrics table, notes Job A has best values highlighted in green
10. User reads winner rationale bullets

### 3. Save as Template Flow
1. User in Comparison View sees winner recommendation
2. User clicks "Save as Template" button on winner card
3. Template Creation Modal opens as overlay
4. Form pre-populated with:
   - Name: "Elena Morales Financial - Balanced - High Quality"
   - Visibility: Team (default)
   - Configuration preview showing winner's settings
5. User edits name: "Production Financial Advisory Config"
6. User adds description: "Optimized for 200+ conversation datasets with emotional focus"
7. User selects tags: [production] [balanced] [high-quality]
8. User confirms visibility: Team
9. User clicks "Save Template"
10. Loading spinner briefly appears
11. Modal closes
12. Toast notification: "Template saved successfully. View in Template Library."

### 4. Template Library Browsing Flow
1. User clicks "View Templates" button in Training Hub header
2. Template Library page loads
3. Default templates section shows 3 system templates
4. User templates section shows user/team templates
5. User filters: Creator = "My Templates"
6. View updates to show only user's templates
7. User clicks template card body (not button)
8. Template Details Modal opens showing full information
9. User reviews analytics: 23 uses, 96% success rate
10. User clicks "Close" to return to library

### 5. Start from Template Flow
1. User in Template Library views "Standard Production" template
2. User clicks "Start from Template" button
3. Navigation to Job Creation page
4. Job creation form loads with fields pre-filled:
   - Preset: Balanced (selected)
   - Hyperparameters: r=16, lr=2e-4, epochs=3, batch=4
   - GPU Type: Spot (selected)
   - Checkpoint: Every 500 steps
5. Banner at top: "Configuration loaded from template: Standard Production"
6. Training file field: Empty (user must select)
7. Job notes field: Pre-filled with "Started from template: Standard Production"
8. User selects training file from dropdown
9. Cost estimate updates based on file + template config
10. User reviews and clicks "Start Training"

### 6. Template Management Flow
1. User in Template Library sees their template card
2. User clicks ⋮ menu → "Edit"
3. Edit Template Modal opens with current values
4. User updates description to be more detailed
5. User adds tag: [client-approved]
6. User clicks "Save Changes"
7. Modal closes, template card updates
8. Later, user wants to delete old template
9. User clicks ⋮ menu → "Delete"
10. Delete Confirmation Modal appears
11. Template has 23 uses, so type-to-confirm required
12. User types template name exactly
13. Delete button enables
14. User clicks "Delete Template"
15. Modal closes, template removed from library
16. Toast: "Template 'Old Config' deleted"

---

## Visual Feedback

- **Selection States:**
  * Checkbox: Unchecked (empty square), Checked (blue checkmark)
  * Selected row: Light blue background tint
  * "Compare Selected" button: Gray (disabled) → Blue (enabled when 2 selected)

- **Comparison Highlights:**
  * Winner card: Prominent border (gold/blue), distinct background
  * Best metric values: Green background cells in table
  * Different config values: Yellow background rows

- **Chart Interactions:**
  * Curves distinguish by solid colors (blue, green)
  * Final values: Larger data points at endpoints with labels
  * Hover: Tooltip positioned near cursor with values
  * Legend items: Clickable with visual feedback (dimmed when hidden)

- **Template Cards:**
  * Default templates: Distinct header color/badge
  * Hover: Shadow lift, border glow
  * Success rate color: Green (≥90%), Yellow (80-89%), Red (<80%)

- **Loading States:**
  * Skeleton loaders for table rows (animated shimmer)
  * Spinner in stat cards while loading
  * Button loading: Spinner replaces text, button disabled

- **Success Indicators:**
  * Toast notifications: Green border, checkmark icon
  * Brief green flash on successful action

- **Animations:**
  * Table row transitions: 200ms fade
  * Modal open/close: 300ms fade + scale
  * Filter application: 200ms table refresh
  * Chart render: Progressive line drawing animation

---

## Accessibility Guidance

- **Keyboard Navigation:**
  * All interactive elements: Tab navigable
  * Table: Tab to rows, Enter to open details, Space to toggle checkbox
  * Chart toggles: Tab + Space to activate
  * Modals: Focus trap (Tab cycles within), Escape to close
  * Dropdowns: Arrow keys to navigate, Enter to select

- **ARIA Labels:**
  * Table: `aria-label="Training jobs list"`
  * Checkboxes: `aria-label="Select job {name} for comparison"`
  * Chart: `aria-label="Loss curves comparing {Job A} and {Job B}"`
  * Stats cards: `aria-label="Total jobs: 147"`
  * Buttons: Descriptive labels matching visible text

- **Screen Reader Announcements:**
  * "Job selected. 2 jobs selected for comparison."
  * "Comparison view loaded. Winner: Job A."
  * "Template saved successfully."
  * `role="alert"` for error messages

- **Color Independence:**
  * Status badges have icons + text (not color alone)
  * Best values have green background + checkmark icon
  * Chart lines distinguished by color + different dash patterns
  * Success rate has percentage text + color

- **Focus Indicators:**
  * Visible blue outline on focused elements (3px)
  * High contrast focus ring (4.5:1 minimum)

- **Error Handling:**
  * Error messages: `role="alert"` for immediate announcement
  * Inline errors: Associated with field via `aria-describedby`
  * Form validation: Real-time feedback with screen reader announcements

---

## Information Architecture

**Primary Navigation Structure:**
```
Main Navigation
├── Dashboard
├── Training Jobs ← Training Hub (FR5.2.1 + FR5.1.2)
│   └── Compare View (accessed via selection)
├── Templates ← Template Library (FR5.2.2)
└── [Other sections]
```

**Page Hierarchy:**

```
Training Hub (Main Page)
├── Header Section
│   ├── Page Title + Quick Stats
│   └── View Templates Button
├── Filter Controls
│   ├── Date Range Chips
│   ├── Status Dropdown
│   ├── Preset Dropdown
│   └── Search Bar
├── Statistics Panel
│   ├── Total Jobs Card
│   ├── Success Rate Card
│   ├── Total Cost Card
│   └── Total Hours Card
├── Jobs Table
│   ├── Select Column (checkboxes)
│   ├── Data Columns (sortable)
│   └── Actions Column
├── Pagination Controls
└── Compare Action Bar (sticky bottom, conditional)

Comparison View (Full Page)
├── Back Navigation
├── Winner Recommendation Card
│   ├── Winner Badge + Name
│   ├── Rationale Bullets
│   └── Action Buttons
├── Loss Curves Section
│   ├── Chart Component
│   ├── Legend
│   └── Toggle Controls
├── Metrics Table Section
│   ├── Table Header
│   ├── Metric Rows (with highlighting)
│   └── Summary Row
└── Configuration Comparison Section
    ├── Job A Column
    └── Job B Column

Template Library (Full Page)
├── Header Section
│   ├── Page Title
│   ├── Search Bar
│   └── View Toggle
├── Filter Controls
│   ├── Creator Filter
│   ├── Tags Filter
│   └── Sort Dropdown
├── Default Templates Section
│   └── 3 System Template Cards
├── User Templates Section
│   └── Template Cards Grid
└── Pagination (if needed)

Template Creation Modal (Overlay)
├── Modal Header
├── Form Fields
│   ├── Name Input
│   ├── Description Textarea
│   ├── Visibility Radio
│   └── Tags Multi-Select
├── Configuration Preview
└── Action Buttons
```

---

## Page Plan

**Total Wireframe Pages: 8**

### Page 1: Training Hub - Empty State
**Purpose:** Show initial state when user has no training jobs
**Key Elements:**
- All filter controls visible but at default values
- Statistics panel showing zeros: "0 jobs | N/A | $0 | 0h"
- Empty table with illustration and message: "No training jobs yet. Start your first training run."
- Primary action button: "Create Training Job"
**States:** Empty, no jobs in system

### Page 2: Training Hub - Populated with Data
**Purpose:** Show typical view with training jobs and statistics
**Key Elements:**
- "Last 30 days" chip selected
- Statistics showing real data: "147 jobs | 94% | $6,854 | 1,843h"
- Table with 5-7 sample job rows (mix of completed/failed)
- Pagination: "Showing 1-25 of 147"
- No jobs selected, "Compare Selected" bar hidden
**States:** Default populated view

### Page 3: Training Hub - Jobs Selected for Comparison
**Purpose:** Show selection state with compare action available
**Key Elements:**
- 2 jobs have checkboxes checked (blue checkmarks)
- Selected rows have light blue background tint
- Sticky bottom bar visible: "2 jobs selected" + "Compare Selected" button (blue, enabled) + "Clear Selection"
**States:** Selection active, ready to compare

### Page 4: Comparison View - Full Display
**Purpose:** Show complete job comparison with all sections
**Key Elements:**
- Back navigation link
- Winner recommendation card: "⭐ Winner: Job A (Balanced)" with rationale bullets
- Overlaid loss curves (2 lines, blue and green, both training and validation visible)
- Toggle controls: [☑ Training] [☑ Validation]
- Metrics table with Job A values highlighted green (winner in most categories)
- Configuration comparison showing differences (yellow highlights on different values)
- "Save as Template" button prominent on winner card
**States:** Full comparison displayed

### Page 5: Template Creation Modal
**Purpose:** Show template creation form overlay
**Key Elements:**
- Modal overlay on dimmed background (Comparison View visible behind)
- Form fields populated:
  * Name: "Elena Morales Financial - Balanced - High Quality" (editable)
  * Description: filled with 2 sentences
  * Visibility: Team selected
  * Tags: [production] [balanced] [high-quality] as chips
- Configuration preview section showing winner's parameters
- "Cancel" and "Save Template" buttons (Save enabled)
**States:** Form filled, ready to save

### Page 6: Template Library - Grid View
**Purpose:** Show template browsing interface
**Key Elements:**
- Page header with search and view toggle (Grid selected)
- Filter controls: Creator dropdown, Tags dropdown, Sort dropdown
- Default Templates section: 3 system template cards with "SYSTEM DEFAULT" badges
- User Templates section: 3-4 user template cards with visibility badges
- Each card shows: name, description, config summary, usage stats, success rate
- "Start from Template" button on each card
**States:** Library populated, grid view

### Page 7: Template Details Modal
**Purpose:** Show full template information and analytics
**Key Elements:**
- Modal overlay showing template details
- Template name, creator, date, visibility badge
- Full description
- All tags as chips
- Configuration details section (all parameters)
- Analytics section: "23 uses | 96% success | $52 avg | 13.2 hrs avg"
- Actions: "Start from Template" (primary), "Edit", "Delete", "Close"
**States:** Details displayed

### Page 8: Mobile Responsive Layout - Training Hub
**Purpose:** Show responsive design for mobile devices
**Key Elements:**
- Vertical layout (single column)
- Hamburger menu for navigation
- Filter controls collapsed into expandable section
- Statistics as horizontal scroll or 2x2 grid
- Jobs displayed as cards instead of table rows
- Each card shows: name, status badge, preset, cost, date
- Checkbox for multi-select in top-left of each card
- Fixed bottom bar for "Compare Selected" when active
**States:** Mobile viewport, responsive layout

---

## Annotations (Mandatory)

Attach notes to UI elements in Figma citing:
1. **Which FR(s)** the element fulfills (e.g., "FR5.1.1 AC3: Overlaid loss curves")
2. **Acceptance criteria number** it maps to
3. **State variations** this element has

**Required Annotation Format:**
- Element Name: "FR5.X.X AC#: Description"
- Example: Overlaid Chart → "FR5.1.1 AC3: All selected jobs' loss curves on same chart, color-coded"

Include a **"Mapping Table"** frame in Figma with columns:
- **Criterion** (acceptance criterion text)
- **Source** (FR number)
- **Screen(s)** (which wireframe page)
- **Component(s)** (UI element name)
- **State(s)** (loading, active, error, etc.)
- **Notes** (implementation details)

**Example Annotation Entries:**
- Jobs Table: "FR5.2.1 AC4: Paginated table with sortable columns"
- Statistics Panel: "FR5.2.1 AC6 + FR5.1.2 simplified: Total jobs, success rate, total cost, training hours"
- Compare Selected Button: "FR5.1.1 AC1: Enabled when 2 jobs selected"
- Loss Curves Chart: "FR5.1.1 AC3: Overlaid training/validation curves, color-coded by job"
- Winner Card: "FR5.1.1 AC7: Algorithm-driven winner recommendation with rationale"
- Template Cards: "FR5.2.2 AC5: Display name, description, usage count, success rate"
- Start from Template: "FR5.2.2 AC6: Pre-fills job creation form with template configuration"

---

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| "Training History" page with filters | FR5.2.1 | Pages 1-3, 8 | Training Hub page | Empty, Populated, Filtered | Combined with FR5.1.2 stats |
| Date range filter: Last 7/30/90 days, All time | FR5.2.1 AC2 | Pages 1-3, 8 | Quick filter chips | Default (30d), Selected | Toggle chips, one active at a time |
| Status filter: Completed/Failed/Cancelled | FR5.2.1 AC3 | Pages 1-3, 8 | Status dropdown | All, Filtered | Multi-select checkboxes |
| Preset filter: Conservative/Balanced/Aggressive | FR5.2.1 AC3 | Pages 1-3, 8 | Preset dropdown | All, Filtered | Single select |
| Statistics: Total jobs, Success rate, Total cost, Hours | FR5.2.1 AC6 + FR5.1.2 | Pages 1-3, 8 | Statistics panel (4 cards) | Loading, Displayed | Updates with filters |
| Paginated results table (25/50/100) | FR5.2.1 AC4 | Pages 2-3, 8 | Jobs table + pagination | Paginated | Sortable columns |
| Multi-select jobs for comparison | FR5.1.1 AC1 | Page 3 | Checkbox column | Unchecked, Checked | Selection counter |
| Compare 2 jobs side-by-side | FR5.1.1 AC2 | Page 3 → 4 | "Compare Selected" button | Disabled, Enabled | Enabled when exactly 2 selected |
| Overlaid loss curves on same chart | FR5.1.1 AC3 | Page 4 | Loss curves chart | Loading, Displayed | Color-coded (blue, green) |
| Toggle training/validation visibility | FR5.1.1 AC4 | Page 4 | Checkbox toggles | Checked, Unchecked | Independent controls |
| Legend showing job names | FR5.1.1 AC4 | Page 4 | Chart legend | Default, Interactive | Click to show/hide |
| Metrics comparison table | FR5.1.1 AC5 | Page 4 | Metrics table | Default, Sorted | Best values highlighted green |
| Configuration comparison side-by-side | FR5.1.1 AC5 | Page 4 | Config columns | Default | Differences highlighted yellow |
| Winner recommendation with rationale | FR5.1.1 AC7 | Page 4 | Winner card | Default | Algorithm-driven identification |
| "Save as Template" from winner | FR5.1.1 AC8 + FR5.2.2 AC1 | Page 4 | Primary button on winner card | Default, Hover | Opens template creation modal |
| Template creation: name, description, visibility, tags | FR5.2.2 AC2 | Page 5 | Template creation modal | Filling, Validating, Saving | Auto-populated name |
| Configuration preview in modal | FR5.2.2 AC2 | Page 5 | Read-only config section | Display | Shows winner's parameters |
| Template library with grid/list view | FR5.2.2 AC3 | Page 6 | Template Library page | Grid, List | View toggle |
| Filter templates by creator, tags, visibility | FR5.2.2 AC3 | Page 6 | Filter controls | Default, Filtered | Multi-select |
| Template cards with usage stats | FR5.2.2 AC5 | Pages 6-7 | Template card | Default, Hover | Usage count, success rate |
| Default templates: Quick Test, Standard Production, Maximum Quality | FR5.2.2 AC9 | Page 6 | System template cards | Default | Cannot edit/delete |
| "Start from Template" pre-fills job form | FR5.2.2 AC6 | Pages 6-7 | Action button | Default, Loading | Navigates to job creation |
| Template details view | FR5.2.2 AC4 | Page 7 | Template details modal | Display | Full info + analytics |
| Edit template (description, tags, visibility) | FR5.2.2 AC7 | Page 7 | Edit menu → Edit modal | Editing, Saving | Creator only |
| Delete template with confirmation | FR5.2.2 AC8 | Page 7 | Delete menu → Confirm modal | Warning, Confirming | Type-to-confirm for high usage |

---

## Non-UI Acceptance Criteria

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Winner algorithm: lowest validation loss + cost efficiency + duration | FR5.1.1 | Display confidence or scoring: "Based on loss (40%), cost (30%), duration (30%)" |
| Statistics exclude in-progress jobs | FR5.2.1 | Tooltip: "Success rate = completed / (completed + failed)" |
| Template usage count increments on job creation | FR5.2.2 | Display "0 uses" for new templates; update after jobs created |
| Template name uniqueness validation | FR5.2.2 | Real-time validation: "Name already exists" error |
| System templates cannot be edited/deleted | FR5.2.2 | Hide edit/delete options on system cards |
| Template deletion doesn't affect existing jobs | FR5.2.2 | Confirm modal states: "Jobs created from this template will not be affected" |
| Comparison data aggregates metrics from both jobs | FR5.1.1 | Show loading while data fetches; handle partial data gracefully |

---

## Estimated Total Page Count

**8 wireframe pages** covering:
1. Training Hub empty state
2. Training Hub populated (default view)
3. Training Hub with jobs selected for compare
4. Comparison View full display
5. Template Creation Modal
6. Template Library grid view
7. Template Details Modal
8. Mobile responsive layout

**Rationale:**
- Demonstrates complete user journey: browse history → compare jobs → save template → browse templates
- Shows all key state changes (empty, populated, selected, comparing, creating, browsing)
- Covers both desktop and mobile layouts
- Includes primary success path and key modal overlays
- Consolidates 4 original FRs (16 pages) into integrated 8-page workflow
- **50% page count reduction** while maintaining all essential functionality
- Optimized for POC speed while preserving core optimization and knowledge-building features

---

## Final Notes for Figma Implementation

**Integration Requirements:**
- Training Hub serves as central entry point for all Stage 5 functionality
- Statistics panel updates when filters applied (not static)
- Multi-select in table triggers compare action bar appearance
- Comparison View accessible only via selection flow (not direct navigation)
- Template creation modal accessible from comparison winner
- Template Library accessible from Training Hub header
- "Start from Template" navigates to job creation with pre-filled config

**POC Simplifications Applied:**
- **Removed:** Compare 3-4 jobs, trend charts, team leaderboards, GPU heatmaps, failure pattern analysis
- **Simplified:** Analytics reduced to 4 key stats inline, template analytics reduced to key metrics
- **Maintained:** Core comparison flow, loss curve visualization, winner recommendation, template CRUD, pre-fill from template

**State Management:**
- Selected jobs tracked across Training Hub (persists during session)
- Comparison data loaded fresh when entering Comparison View
- Template library refreshes on return (shows newly created templates)
- Filters persist within session but reset on page refresh

**Accessibility:**
- Full keyboard navigation throughout
- Screen reader announcements for selection changes and success actions
- Color not sole indicator (paired with icons and text)
- Focus management in modals (trap + return to trigger)
- High contrast focus indicators

**Success Criteria:**
A user should be able to:
1. Browse training history with filters
2. Select 2 jobs and compare side-by-side
3. Identify winner with clear rationale
4. Save winner configuration as template
5. Browse template library
6. Start new job from template with pre-filled config

All within a cohesive, integrated workflow that builds organizational knowledge and enables data-driven training optimization.
