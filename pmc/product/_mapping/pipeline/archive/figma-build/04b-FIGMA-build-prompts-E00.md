# LoRA Pipeline - FIGMA Build Prompts - E00
**Version:** 1.0  
**Date:** 12-19-2025  
**Section:** E00 - LoRA Training Infrastructure Foundation  
**Stage:** Core Infrastructure & Training Pipeline

This file contains cumulative Figma-ready wireframe prompts for the LoRA training infrastructure. **Each prompt builds upon and references the previous prompts**, creating an interconnected design system where components explicitly interface with each other.

---

## Cumulative Build Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROMPT DEPENDENCY FLOW                           │
│                                                                         │
│  P01: Dashboard Shell        ──────────────────────────────────────►   │
│       ↓                                                                 │
│  P02: Dataset Manager        (Interfaces with P01 navigation)      ►   │
│       ↓                                                                 │
│  P03: Training Configurator  (Extends P02 dataset selection)       ►   │
│       ↓                                                                 │
│  P04: Training Monitor       (Consumes P03 job config output)      ►   │
│       ↓                                                                 │
│  P05: Model Artifacts        (Receives P04 completed training)          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

=== BEGIN PROMPT P01: Dashboard Shell & Navigation ===

Title
- P01 Wireframes — LoRA Training Infrastructure: Dashboard Shell & Global Navigation

**Cumulative Context: FOUNDATION PROMPT**
- This is the **foundational prompt** that establishes the global layout, navigation, and design system all subsequent prompts will inherit
- All future prompts (P02-P05) will render within the content area defined here
- Establishes component library, color tokens, typography, and spacing conventions

Context Summary
- This feature provides the global application shell for the BrightRun LoRA Training Pipeline—a Next.js application enabling AI engineers to transform conversation datasets into trained LoRA models. The dashboard serves as the primary navigation hub connecting dataset management, training configuration, real-time training monitoring, and model artifact storage. Users access this dashboard from Vercel deployment and use it throughout the entire training lifecycle (from dataset selection through model download). The shell must accommodate both the existing conversation generation features AND the new training infrastructure.

Journey Integration
- Stage goals: Provide intuitive navigation between all application areas, maintain context awareness (current section, active jobs), enable quick access to critical actions (start training, view active jobs)
- Key emotions: Confidence through clear navigation, efficiency through logical organization, awareness through status indicators
- Progressive disclosure levels:
  * Basic: Primary navigation sidebar with section icons and labels
  * Advanced: Status badges showing active training jobs, cost accumulation
  * Expert: Quick actions, keyboard shortcuts, recent activity feed
- Persona adaptations: AI engineers need technical depth; Budget managers need cost visibility; Non-technical users need simplified views

### Journey-Informed Design Elements
- User Goals: Navigate between conversation data, training jobs, and model artifacts seamlessly; Stay informed of active training status without navigating away; Access training actions quickly
- Emotional Requirements: Reduce cognitive load with consistent layout; Build trust through professional design; Maintain control through visible status
- Progressive Disclosure:
  * Basic: Logo, main navigation (Datasets, Training, Models), user menu
  * Advanced: Active job count badge, total spend indicator, notifications bell
  * Expert: Command palette (Cmd+K), recent activity, environment indicator (dev/prod)
- Success Indicators: User can reach any section in ≤2 clicks, Active training visible at all times, No navigation dead-ends

Wireframe Goals
- Establish foundational layout grid (sidebar + main content area)
- Define navigation hierarchy and information architecture
- Create status indicator system for active training jobs
- Design notification and alert patterns
- Enable responsive behavior for tablet/mobile
- Define color tokens and typography scale for design system

Explicit UI Requirements (from infrastructure assessment)
- **Global Layout Structure**: Fixed sidebar (240px desktop, collapsible), Main content area (fluid width), Optional right panel for contextual help (300px, collapsible), Header bar with breadcrumbs (60px height)
- **Sidebar Navigation**:
  * Logo/brand area (80px height, "BrightRun LoRA Pipeline")
  * Primary nav sections:
    - 📊 Dashboard (overview with metrics)
    - 📁 Datasets (conversation files, training files)
    - 🚀 Training Jobs (active, queued, completed)
    - 🧠 Models (LoRA artifacts, deployment status)
    - ⚙️ Settings (RunPod config, API keys)
  * Each nav item: Icon (24px), Label, Optional badge (e.g., "3 active" on Training Jobs)
  * Active state: Left border accent (4px), background highlight
  * Hover state: Subtle background change
- **Header Bar Components**: Breadcrumb trail (Home > Training Jobs > Job-123), Environment badge ("Development" amber / "Production" green), Active training indicator: Pulsing dot + "2 jobs training" clickable → mini-job-list dropdown, Cost tracker: "$47.23 this month" with trend indicator, Notifications bell with unread count, User avatar menu (Profile, Sign Out)
- **Active Training Indicator (always visible)**: Compact card in header or sidebar footer, Shows: "Training: 2 active jobs", Expandable to show: Job names, Progress percentages, Quick links to each job, Pulsing animation when training active, Color-coded by status (blue=training, yellow=warning, green=complete)
- **Footer/Status Bar (optional)**: RunPod connection status (🟢 Connected), GPU availability indicator, API rate limits remaining
- **Responsive Breakpoints**: Desktop >1280px: Full sidebar + content, Tablet 768-1279px: Collapsed sidebar (icons only) + content, Mobile <768px: Hidden sidebar (hamburger menu) + full-width content

Interface Points (for subsequent prompts)
```
EXPORTS TO SUBSEQUENT PROMPTS:
├─ content_area_container    → P02-P05 render their content here
├─ breadcrumb_component      → Each prompt provides breadcrumb data
├─ sidebar_active_state      → Each prompt indicates which nav is active
├─ header_actions_slot       → Each prompt can add contextual actions
├─ notification_system       → All prompts can trigger notifications
└─ cost_tracker_integration  → P03, P04 push cost data to header display
```

Interactions and Flows
- **Navigation flow**: User clicks sidebar item → Content area smoothly transitions → Breadcrumb updates → Active nav state changes → Analytics fires page view
- **Active training card expansion**: User clicks "2 jobs training" in header → Dropdown expands showing active job cards → Each card clickable → Navigate to training monitor (P04)
- **Notifications**: Training events push to notification bell → Badge increments → Click opens notification panel with action links
- **Responsive collapse**: Width decreases below 1280px → Sidebar collapses to icons → Hover expands temporarily → Below 768px → Hamburger menu replaces sidebar

Visual Feedback
- Navigation transitions: 200ms ease-out for all state changes
- Active training pulse: Subtle 2s animation loop (opacity pulse)
- Notification arrival: Brief shake on bell icon, count increment animation
- Loading states: Content area skeleton while fetching data
- Cost update: Brief highlight animation when cost value changes

Accessibility Guidance
- **Keyboard navigation**: Tab moves through sidebar items, Enter activates, Focus trap on modals/dropdowns
- **Screen reader**: Landmarks (nav, main, aside), ARIA labels on all icons, Live regions for status updates
- **Focus indicators**: 2px solid blue outline, Skip-to-content link
- **Color contrast**: WCAG AA compliant, High contrast mode support

Information Architecture
```
BrightRun LoRA Pipeline
├─ Dashboard (overview metrics, recent activity)
├─ Datasets
│   ├─ Conversation Files (existing)
│   └─ Training Files (aggregated, ready for training)
├─ Training Jobs
│   ├─ Active Jobs (real-time monitoring)
│   ├─ Job Queue (pending jobs)
│   └─ Completed Jobs (history + artifacts)
├─ Models
│   ├─ LoRA Adapters (trained artifacts)
│   ├─ Deployment Status (testing, production)
│   └─ Quality Reports (validation metrics)
└─ Settings
    ├─ RunPod Configuration
    ├─ API Keys & Secrets
    └─ Notification Preferences
```

Page Plan
1. **Dashboard Shell - Desktop Layout**
   - Purpose: Primary desktop layout establishing all shell components
   - Components: Full sidebar (240px), header bar, empty content area placeholder, active training indicator in header
   - States: Sidebar expanded, no active training, 0 notifications

2. **Dashboard Shell - Active Training State**
   - Purpose: Show shell with active training indicators visible
   - Components: Same as #1, plus: Pulsing training indicator, expanded dropdown showing 2 active jobs
   - States: 2 jobs training, 3 notifications unread

3. **Dashboard Shell - Tablet Collapsed**
   - Purpose: Responsive behavior at tablet breakpoint
   - Components: Collapsed sidebar (icons only, 72px), hover-expand interaction, header adjustments
   - States: Sidebar collapsed, hover expanded state shown

4. **Dashboard Shell - Mobile Hamburger**
   - Purpose: Mobile responsive layout
   - Components: Hamburger menu button, slide-out navigation drawer, simplified header
   - States: Menu closed, menu open overlay

5. **Dashboard Shell - Notification Panel**
   - Purpose: Show notification system detailed
   - Components: Bell clicked, dropdown with notification list, action links, mark-all-read
   - States: Unread notifications, notification hover state

Annotations (Mandatory)
- Each component must cite source requirement (infrastructure assessment sections)
- Create design system documentation frame showing: Color tokens, Typography scale, Spacing units, Component states
- Flag components that MUST be consistent across P02-P05

Design System Export (for subsequent prompts)
```
COLOR_TOKENS:
├─ primary-blue: #2563EB (training active, primary actions)
├─ success-green: #10B981 (completed, connected)
├─ warning-amber: #F59E0B (queued, cost warning)
├─ error-red: #EF4444 (failed, critical)
├─ neutral-gray: #6B7280 (pending, disabled)
├─ background: #F9FAFB (light) / #111827 (dark)
└─ surface: #FFFFFF (light) / #1F2937 (dark)

TYPOGRAPHY:
├─ heading-1: 24px/32px, font-weight: 600
├─ heading-2: 20px/28px, font-weight: 600
├─ heading-3: 16px/24px, font-weight: 600
├─ body: 14px/20px, font-weight: 400
├─ small: 12px/16px, font-weight: 400
└─ mono: 13px/20px, font-family: monospace

SPACING:
├─ xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px
```

Estimated Page Count
- **5 screens** covering shell states and responsive layouts

=== END PROMPT P01: Dashboard Shell & Navigation ===

---

=== BEGIN PROMPT P02: Dataset Management View ===

Title
- P02 Wireframes — LoRA Training Infrastructure: Dataset Management View

**Cumulative Context: BUILDS ON P01**
- **Inherits from P01**: Renders within `content_area_container` defined in P01
- **Uses P01 sidebar**: Highlights "📁 Datasets" in P01 navigation as active
- **Uses P01 components**: Breadcrumb component, notification system, header layout
- **Connects to P03**: "Start Training" action on datasets navigates to Training Configurator

Context Summary
- This feature provides comprehensive dataset management for training file selection and preparation. Users browse their existing conversation datasets (242 conversations, 1,567 training pairs), view quality metrics, scaffolding distribution, and select datasets for LoRA training. The interface must clearly communicate dataset readiness for training (format compatibility, size sufficiency, quality scores) and enable quick selection flow into the Training Configurator (P03). This view leverages the existing `TrainingFileService` from the codebase.

**Prerequisites from P01**:
- Shell layout with sidebar showing "Datasets" as active nav item
- Header displaying breadcrumb: "Home > Datasets"
- Content area container ready to receive this view's content

Journey Integration
- Stage goals: Browse available datasets, assess training readiness, select optimal dataset for training, understand dataset quality before committing GPU resources
- Key emotions: Confidence in dataset quality, clarity on training requirements, informed decision-making
- Progressive disclosure levels:
  * Basic: Dataset cards with name, size, date, quality badge
  * Advanced: Scaffolding distribution charts, coverage analysis
  * Expert: Raw JSON preview, format validation details

### Journey-Informed Design Elements
- User Goals: Identify which datasets are training-ready, Compare datasets by quality/size, Select dataset and proceed to training configuration
- Emotional Requirements: Show clear quality indicators (reduce anxiety), Display volume sufficiency (1,567 pairs exceeds 500-1,000 minimum), Highlight format compatibility ("brightrun-lora-v4" = ready)
- Progressive Disclosure:
  * Basic: Card grid with key metrics, "Ready for Training" badge
  * Advanced: Expand card for scaffolding breakdown (3 personas × 7 arcs × 20 topics)
  * Expert: View full metadata, export options, format specification

Interface Points (with P01 and P03)
```
INHERITS FROM P01:
├─ content_area_container    → This view renders here
├─ breadcrumb_component      → Provides: ["Home", "Datasets"]
├─ sidebar_active_state      → Sets: "Datasets" as active
└─ notification_system       → Uses for dataset-related alerts

EXPORTS TO P03 (Training Configurator):
├─ selected_dataset_id       → UUID of chosen dataset
├─ dataset_metadata          → Total pairs, quality score, format version
├─ scaffolding_distribution  → Persona/arc/topic breakdown
└─ file_storage_path         → Supabase storage path for training file

NAVIGATION FLOW:
User clicks "Start Training" button on dataset card
    ↓
Navigate to P03: /training/new?dataset_id={uuid}
    ↓
P03 receives dataset context for configuration
```

Wireframe Goals
- Display dataset inventory with training-readiness indicators
- Show quality metrics that map to training success
- Enable dataset comparison before selection
- Provide clear "Start Training" call-to-action on ready datasets
- Surface potential issues (low quality, insufficient pairs) before training

Explicit UI Requirements
- **Dataset Grid Layout**: Card-based grid (responsive: 3 cols desktop, 2 tablet, 1 mobile), Each card ~300px wide, Sort options: Date created, Name, Quality score, Size, Filter options: Format (brightrun-lora-v4), Quality range, Date range
- **Dataset Card Components**:
  * Card header: Dataset name (truncated 40 chars), Created date, Format badge ("v4" green pill)
  * Body metrics row 1: Total conversations (🗣️ 242), Total training pairs (📝 1,567), Quality score (⭐ 3.0/5.0)
  * Body metrics row 2: Vertical badge ("Financial Planning Consultant"), Consultant name ("Elena Morales, CFP")
  * Training readiness indicator: Green checkmark + "Ready for Training" OR Yellow warning + "Review Recommended"
  * Scaffolding preview: Mini horizontal bar showing 3 personas × 7 arcs distribution
  * Action buttons: "View Details" (secondary), "Start Training" (primary blue, prominent)
- **Training Readiness Criteria Display**: Visual checklist showing: ✅ Format compatible (brightrun-lora-v4), ✅ Sufficient volume (>500 pairs), ✅ Quality score acceptable (≥3.0), ⚠️ Human review % (0% - acceptable for PoC), Tooltip explaining each criterion
- **Expanded Card / Detail Modal**: Triggered by "View Details", Sections: Full metadata JSON preview, Scaffolding distribution chart (stacked bar), Conversation list (paginated 10/page), File storage path, Last modified timestamp, Action: "Start Training" button (repeated in modal footer)
- **Scaffolding Distribution Visualization**: Stacked horizontal bar chart showing: 3 personas (anxious_planner, overwhelmed_avoider, pragmatic_optimist), 7 emotional arcs (couple_conflict_to_alignment, etc.), Color-coded by persona, Hover shows exact counts per combination
- **Quality Score Display**: Star rating (0-5 scale with decimals), Color coding: 4-5 green, 3-4 blue, 2-3 yellow, <2 red, Subtext: "AI-generated, 0% human reviewed" (informational, not alarming for PoC)
- **Empty State**: "No datasets found. Create a training file from your conversations first.", Link to conversation aggregation workflow (existing feature)

Interactions and Flows
- **Browse flow (uses P01 shell)**: User clicks "Datasets" in P01 sidebar → Content area loads dataset grid → Cards render with key metrics → User scans for "Ready for Training" indicators
- **Selection flow (connects to P03)**: User identifies target dataset → Clicks "View Details" for confirmation → Reviews scaffolding and quality → Clicks "Start Training" → **Navigates to P03** with dataset_id passed via URL query parameter
- **Comparison flow**: User opens multiple cards via CMD+click → Side-by-side comparison modal → Select preferred dataset → Proceed to P03
- **Sort/Filter flow**: User clicks sort dropdown → Options animate in → Selection updates grid with transition → URL params update for shareable filtered views

Visual Feedback (consistent with P01 design system)
- Card hover: Subtle shadow elevation, slight scale (1.02)
- "Ready for Training" badge: Green pulsing border on hover
- Quality score: Star fill animation on load
- Scaffolding chart: Bars animate in on card expand
- Loading state: Card skeletons matching layout
- Selection: Blue border around selected card

Accessibility Guidance (extends P01 patterns)
- Card grid: Uses CSS Grid with focusable cards
- Keyboard: Tab through cards, Enter for primary action ("Start Training"), Shift+Enter for secondary ("View Details")
- Screen reader: "Dataset: [name], [X] conversations, [Y] training pairs, Quality [N] of 5, [Ready/Not Ready] for training"
- Focus: Follows P01 focus indicator pattern

Page Plan
1. **Dataset Grid - Overview State**
   - Purpose: Primary browse view showing all datasets
   - Components: P01 shell with "Datasets" active, Card grid with 3 datasets, Sort/filter bar
   - States: Default sort (date desc), No filters, One card showing "Ready for Training"

2. **Dataset Card - Expanded Detail Modal**
   - Purpose: Full dataset inspection before training
   - Components: Modal overlay on P01 shell, Full metadata, Scaffolding chart, Conversation preview list
   - States: Modal open, Scaffolding chart visible, "Start Training" button prominent

3. **Dataset Grid - Filtered View**
   - Purpose: Show filtering and search in action
   - Components: Active filter pills, Reduced card set matching filters
   - States: Quality filter active (>3.0), Format filter (v4 only)

4. **Dataset Grid - Empty State**
   - Purpose: When no datasets exist
   - Components: Empty state illustration, CTA to create training file
   - States: No datasets available

5. **Dataset Grid - Selection for Training**
   - Purpose: User about to navigate to P03
   - Components: Selected card highlighted, "Start Training" button focus
   - States: Pre-navigation, Tooltip showing "Configure training settings"

**P03 Navigation Handoff**
```
When "Start Training" clicked:
1. Store selected dataset in session/URL
2. Navigate to: /training/new?dataset_id={uuid}
3. P03 reads dataset_id, fetches metadata
4. P03 displays: "Training Dataset: [Name] (1,567 pairs)"
```

Annotations (Mandatory)
- Reference P01 design tokens for all colors/typography
- Map card components to training_files database schema
- Document navigation flow to P03

Estimated Page Count
- **5 screens** covering browse, detail, filter, empty, and selection states

=== END PROMPT P02: Dataset Management View ===

---

=== BEGIN PROMPT P03: Training Job Configurator ===

Title
- P03 Wireframes — LoRA Training Infrastructure: Training Job Configurator

**Cumulative Context: BUILDS ON P01 + P02**
- **Inherits from P01**: Renders within `content_area_container`, uses sidebar, header, notifications
- **Receives from P02**: `selected_dataset_id`, `dataset_metadata` passed via URL/session
- **Exports to P04**: Training job configuration that P04 will monitor

Context Summary
- This feature provides the training job configuration interface where users set hyperparameters, select GPU resources, estimate costs, and launch LoRA training on RunPod. The configurator receives a selected dataset from P02 and produces a training job that P04 will monitor. It must translate technical LoRA/QLoRA settings into understandable choices while enabling expert customization. Critical focus on cost estimation and confirmation before committing GPU resources.

**Prerequisites from P01 + P02**:
- P01 shell with "Training Jobs" highlighted in sidebar
- Header breadcrumb: "Home > Training Jobs > New Job"
- Dataset already selected from P02 (displayed in summary card)

Journey Integration
- Stage goals: Configure training settings confidently, Understand cost implications, Launch training job, Receive confirmation and job ID
- Key emotions: Confidence in settings via presets, Cost awareness before committing, Excitement when launching training
- Progressive disclosure levels:
  * Basic: Preset selection (Conservative/Balanced/Aggressive), Cost estimate, Launch button
  * Advanced: Hyperparameter fine-tuning, GPU type selection (Spot vs On-Demand)
  * Expert: Custom LoRA rank, target modules selection, scheduler configuration

### Journey-Informed Design Elements
- User Goals: Configure training without ML expertise (use presets), Understand what training will cost, Know how long training will take, Launch confidently
- Emotional Requirements: Reduce complexity anxiety via sensible defaults, Build cost confidence with estimates, Celebrate successful job creation
- Progressive Disclosure:
  * Basic: 3-preset selector, summary card, "Start Training" button
  * Advanced: Expandable hyperparameter sections, GPU options
  * Expert: Full parameter override, advanced LoRA configuration

Interface Points (P01, P02, P04)
```
INHERITS FROM P01:
├─ content_area_container    → This view renders here
├─ breadcrumb_component      → Provides: ["Home", "Training Jobs", "New Job"]
├─ sidebar_active_state      → Sets: "Training Jobs" as active
├─ notification_system       → Uses for job creation confirmation
└─ cost_tracker_integration  → Pushes estimated cost to header

RECEIVES FROM P02:
├─ selected_dataset_id       → UUID from URL param: ?dataset_id={uuid}
├─ dataset_metadata          → Fetched: total_training_pairs, quality_score
├─ scaffolding_distribution  → Display as context card
└─ file_storage_path         → Required for RunPod download

EXPORTS TO P04 (Training Monitor):
├─ training_job_id           → Created job UUID
├─ job_configuration         → All hyperparameters and RunPod config
├─ estimated_duration        → Hours based on configuration
├─ estimated_cost            → USD range ($45-55)
└─ started_at                → Timestamp for elapsed time calculation

NAVIGATION FLOW:
User completes configuration → Clicks "Start Training"
    ↓
API call: POST /api/training/start-job
    ↓
Receive training_job_id → Show success toast
    ↓
Navigate to P04: /training/jobs/{training_job_id}
    ↓
P04 begins monitoring with received context
```

Wireframe Goals
- Present training configuration as approachable (presets for beginners)
- Enable expert customization without overwhelming novices
- Clearly communicate cost and duration estimates
- Validate configuration before launch
- Provide smooth handoff to training monitor (P04)

Explicit UI Requirements
- **Dataset Context Card (from P02)**: Positioned at top of form, Shows: Dataset name, Total pairs (1,567), Quality score (3.0/5.0), Format badge, Non-editable (already selected in P02), "Change Dataset" link back to P02
- **Preset Selector (Primary Choice)**: 3-option card selector (radio style): **Conservative** (green): "Slower, safer, lower cost" - r=8, lr=1e-4, 2 epochs - Est: $25-35, 6-8 hours - Best for: First training attempt, **Balanced** (blue): "Recommended for most use cases" - r=16, lr=2e-4, 3 epochs - Est: $45-55, 10-12 hours - Best for: Production training, **Aggressive** (purple): "Faster learning, higher risk" - r=32, lr=5e-4, 5 epochs - Est: $80-100, 16-20 hours - Best for: Experimentation; Selected preset highlighted with colored border, Each card shows estimated cost and duration prominently
- **Advanced Settings Toggle**: "Advanced Settings" collapsible section (collapsed by default), When expanded reveals:
  * **Hyperparameters Panel**: LoRA Rank (r): Slider 4-64, default per preset, with explainer "Higher = more capacity, slower training", LoRA Alpha: Slider 8-128, auto-set to 2×r by default, LoRA Dropout: Slider 0.00-0.20, default 0.05, Num Epochs: Slider 1-10, default per preset, Batch Size: Dropdown [1, 2, 4, 8], default 4, Learning Rate: Input with scientific notation, default per preset, Warmup Ratio: Slider 0.00-0.10, default 0.03, Max Sequence Length: Dropdown [512, 1024, 2048, 4096], default 2048
  * **GPU Configuration Panel**: GPU Type: Radio [H100 PCIe (80GB) - recommended], Instance Type: Radio [Spot ($2.49/hr, interruptible) | On-Demand ($7.99/hr, guaranteed)], Max Duration: Input in hours (default 24), warning if estimate > max
- **Cost Estimation Panel** (always visible): "Estimated Cost" card: Cost range ($45-55) large and prominent, Breakdown: Base training + Storage + Buffer, Hourly rate (Spot: $2.49/hr, On-Demand: $7.99/hr), Duration range (10-12 hours), "Why a range?" tooltip explaining variance, Updates dynamically when settings change
- **Pre-Launch Validation Checklist**: Visual checklist before launch: ✅ Dataset selected (1,567 pairs), ✅ Configuration valid, ✅ Cost estimate: $45-55, ✅ Duration estimate: 10-12 hours, ⚠️ Spot instance (may interrupt—checkpoint recovery enabled), All must be ✅ or acknowledged ⚠️
- **Action Buttons**: "Start Training" primary button (large, blue), "Save Configuration" secondary (save without launching), "Cancel" tertiary link (return to P02)
- **Launch Confirmation Modal**: Triggered on "Start Training" click, Summary: Dataset, Preset, Key parameters, Estimated cost/time, Warning for Spot instances: "Spot instances may be interrupted. Training will resume from checkpoints automatically.", Checkbox: "I understand the costs and have approved budget" (required), Buttons: "Confirm & Start Training" (green), "Go Back"

Interactions and Flows
- **Page load (receives P02 data)**: Read `?dataset_id={uuid}` from URL → Fetch dataset metadata → Display context card → Initialize preset selector (Balanced default)
- **Preset selection**: User clicks preset card → Settings update to preset values → Cost/duration recalculates → Advanced settings (if open) reflect new values
- **Advanced customization**: User expands "Advanced Settings" → Modifies hyperparameter → "Custom" badge appears on preset → Cost/duration recalculates in real-time
- **Launch flow (connects to P04)**: User clicks "Start Training" → Confirmation modal opens → User checks acknowledgment → Clicks "Confirm & Start Training" → API call `/api/training/start-job` → Success: Toast + navigate to P04 with job ID → Error: Modal displays error, user can retry
- **Cost update push to P01 header**: When cost calculated, push to P01's `cost_tracker_integration` → Header shows "Est. $45-55 for pending job"

Visual Feedback (P01 design system)
- Preset card selection: Colored border (4px), subtle background tint, checkmark icon
- Cost update: Number transitions with smooth animation
- Validation: Checklist items animate to ✅ as conditions met
- Launch button: Disabled state until validation passes, Enabled: Blue prominent, Loading: Spinner + "Launching..."
- Success: Confetti burst, green toast, 2-second auto-redirect to P04

Accessibility Guidance (extends P01)
- Preset cards: Radio group semantics
- Sliders: Announce current value, min/max, step
- Cost display: Updated values announced to screen reader
- Modal: Focus trap, Escape to close

Page Plan
1. **Training Configurator - Default Preset Selection**
   - Purpose: Initial state with Balanced preset selected
   - Components: P01 shell, Dataset context card, Preset selector (Balanced highlighted), Cost estimate, Launch button (disabled until acknowledged)
   - States: Balanced selected, Advanced collapsed, Validation incomplete

2. **Training Configurator - Advanced Settings Expanded**
   - Purpose: Show expert customization options
   - Components: Same as #1, plus expanded hyperparameter panel, GPU configuration
   - States: Advanced open, Custom values entered, "Custom" badge visible

3. **Training Configurator - Cost Estimate Update**
   - Purpose: Show real-time cost calculation
   - Components: Focus on cost estimation panel with breakdown
   - States: Aggressive preset selected (showing higher cost), Duration elongated

4. **Training Configurator - Launch Confirmation Modal**
   - Purpose: Pre-launch verification and acknowledgment
   - Components: Modal overlay with summary, warnings, checkbox, action buttons
   - States: Modal open, checkbox not yet checked, "Confirm" disabled

5. **Training Configurator - Launch Success State**
   - Purpose: Successful job creation, transition to P04
   - Components: Success toast, confetti, redirecting indicator
   - States: Job created, auto-navigating to `/training/jobs/{job_id}`

**P04 Navigation Handoff**
```
After successful job creation:
1. Receive training_job_id from API response
2. Store job configuration in session (or refetch in P04)
3. Navigate to: /training/jobs/{training_job_id}
4. P04 reads job_id, begins polling for status
5. P04 displays initial state: "Preprocessing" with all config context
```

Annotations (Mandatory)
- Map presets to hyperparameter values from technical specification
- Reference cost formulas from infrastructure assessment
- Document API request/response for `/api/training/start-job`

Estimated Page Count
- **5 screens** covering presets, advanced, cost, confirmation, and success

=== END PROMPT P03: Training Job Configurator ===

---

=== BEGIN PROMPT P04: Training Progress Monitor ===

Title
- P04 Wireframes — LoRA Training Infrastructure: Training Progress Monitor

**Cumulative Context: BUILDS ON P01 + P02 + P03**
- **Inherits from P01**: Renders in `content_area_container`, uses shell, notifications, cost tracker
- **Receives from P03**: `training_job_id`, job configuration, estimates
- **Displays P02 data**: Dataset info shown in context card
- **Exports to P05**: Completed training job with LoRA artifact path

Context Summary
- This feature provides comprehensive real-time training progress monitoring with live metrics, loss curve visualization, stage progression, cost tracking, and control actions (cancel). Users arrive here from P03 after launching training and monitor throughout the 8-20 hour training duration. The interface must maintain engagement during long training periods while reducing "black box" anxiety through transparency.

**Prerequisites from P01 + P02 + P03**:
- P01 shell with "Training Jobs" active, breadcrumb: "Home > Training Jobs > Job-123"
- Dataset info from P02 displayed in context
- Configuration from P03 available (hyperparameters, estimates)
- Job ID from P03 used for API polling

Journey Integration
- Stage goals: Monitor training progress in real-time, Confirm training is working correctly, Track cost accumulation, Detect problems early, Celebrate completion
- Key emotions: Anxiety reduction through transparency, Confidence through visible progress, Joy at successful completion
- Progressive disclosure levels:
  * Basic: Progress bar, current stage, estimated time remaining
  * Advanced: Live loss curves, detailed metrics table
  * Expert: Event log, metric history export, bottleneck identification

### Journey-Informed Design Elements
- User Goals: Answer "Is my training working?" at a glance, Monitor costs vs estimates, Intervene if problems arise (cancel), Know when to expect completion
- Emotional Requirements: Immediate feedback on status, Celebrate milestones (stage completions), Alert on issues without alarming
- Progressive Disclosure:
  * Basic: Progress header card (%, stage, time remaining)
  * Advanced: Loss curve graph, metrics table
  * Expert: Stage detailed logs, event timeline, export graphs

Interface Points (P01, P02, P03, P05)
```
INHERITS FROM P01:
├─ content_area_container    → This view renders here
├─ breadcrumb_component      → Provides: ["Home", "Training Jobs", "{job_name}"]
├─ sidebar_active_state      → Sets: "Training Jobs" as active
├─ notification_system       → Uses for stage completions, cost warnings
├─ cost_tracker_integration  → Pushes current spend to header
└─ active_training_indicator → This job appears in P01 header indicator

RECEIVES FROM P03:
├─ training_job_id           → UUID in URL: /training/jobs/{uuid}
├─ job_configuration         → Fetch on load: hyperparameters, presets
├─ estimated_duration        → Display as initial estimate
├─ estimated_cost            → Compare against actual spend
└─ started_at                → Calculate elapsed time

DISPLAYS P02 DATA:
├─ dataset_name              → Context: "Training on: [Dataset Name]"
├─ total_training_pairs      → Context: "1,567 training pairs"
└─ scaffolding_summary       → Mini-display of persona/arc distribution

EXPORTS TO P05 (Model Artifacts):
├─ training_job_id           → For linking artifacts
├─ lora_artifact_path        → Supabase storage path from completed job
├─ final_metrics             → Validation loss, perplexity
├─ training_log_path         → For detailed reporting
└─ completion_timestamp      → When training finished

NAVIGATION FLOW (on completion):
Training completes → Status becomes "completed"
    ↓
Success banner with "View Model Artifacts" button
    ↓
Navigate to P05: /models/{lora_artifact_id}
    ↓
P05 displays trained LoRA adapter with download options
```

Wireframe Goals
- Provide at-a-glance training health assessment
- Visualize learning progress through loss curves
- Track cost against estimates in real-time
- Enable early problem detection
- Guide user to P05 on successful completion

Explicit UI Requirements
- **Progress Header Card**: Overall progress bar (animated, color-coded), Progress percentage ("42% Complete"), Current step ("Step 850 of 2,000"), Current stage badge ("Training" with pulse), Elapsed time ("6h 23m"), Estimated remaining ("8h 15m remaining"), Current epoch ("Epoch 2 of 3")
- **Stage Progression Indicator (from P03 config)**: Four-stage horizontal bar: Preprocessing (2-5 min) → Model Loading (10-15 min) → Training (8-20 hrs) → Finalization (5-10 min), Stage states: Pending (gray), Active (blue animated), Completed (green ✓), Failed (red ❌), Substatus messages for active stage, Duration per completed stage
- **Live Loss Curve Graph**: Dual y-axis line chart: Training loss (left, solid blue), Validation loss (right, dashed orange), X-axis: training step numbers, Interactive: zoom, pan, hover tooltips, Export button: PNG (2000×1200px), Auto-updates every 60 seconds
- **Current Metrics Table**: Training loss: 0.342 (↓ from 0.389, -12.1%), Validation loss: 0.358 (↓ from 0.412, -13.1%), Learning rate: 0.000182, GPU utilization: 87%, GPU memory: 68GB/80GB (85%), Perplexity: 1.43 (if available), Tokens/second: 1,247, Trend indicators: ↓ green (improving), ↑ red (worsening)
- **Cost Tracker Card**: Estimated: $45-55 (gray), Current spend: $22.18 (large, bold), Percentage: 49% of estimate, Hourly rate: $2.49/hr (Spot), Projected final: $47.32, Progress bar: green <80%, yellow 80-100%, red >100%
- **Control Actions**: "Cancel Job" button (red, prominent), Cancel opens confirmation modal (show progress, costs, impact), Cancellation reason required
- **Completion State (triggers P05 navigation)**: Progress: 100%, all stages green ✓, Banner: "🎉 Training Complete! Final loss: 0.312", "View LoRA Model" button (navigates to P05), "Download Artifacts" quick action, Email/Slack notification sent
- **Auto-refresh**: Polls every 60 seconds, Manual refresh button, Toast on update: "Metrics updated"

Interactions and Flows
- **Initial load (from P03)**: Read `{training_job_id}` from URL → Fetch job status → Display stages, metrics → Begin 60-second polling
- **Real-time monitoring**: Polling fetches `/api/training/jobs/{id}` → Updates all components → Loss curve appends new points → Metrics update with trend arrows
- **Stage transitions**: Stage completes → Green animation → Next stage activates → Substatus appears → Optional notification
- **Cost warning flow**: Current spend > 80% estimate → Yellow warning indicator, Current spend > 100% → Red alert banner: "⚠️ Cost exceeding estimate"
- **Cancel flow**: Click "Cancel Job" → Modal with progress, cost summary → Select reason → Confirm → API call → Status "cancelled" → Toast
- **Completion flow (connects to P05)**: All stages complete → Status "completed" → Celebration banner → "View LoRA Model" button clickable → Navigate to P05 with artifact ID

Visual Feedback (P01 design system)
- Progress bar: Animated gradient fill
- Stage pulse: 2s animation on active stage
- Loss curve: New points animate in smoothly
- Metric trends: Brief highlight on value change
- Cost warning: Red border pulse on card
- Completion: Confetti burst, green everything

Accessibility Guidance (extends P01)
- Progress: Announces "Training 42% complete, Step 850 of 2000"
- Loss curve: Described as "Training and validation loss line chart"
- Metrics: Each row announces value and trend
- Cost warning: Alert role for screen reader announcement

Page Plan
1. **Training Monitor - Active Training State**
   - Purpose: Primary monitoring during training
   - Components: P01 shell, Progress header (42%), Training stage active, Loss curve with data, Metrics table, Cost tracker
   - States: Step 850/2000, 6h 23m elapsed, All components live

2. **Training Monitor - Stage Progression View**
   - Purpose: Detailed stage indicator focus
   - Components: Zoomed stage indicator showing substatus messages, Elapsed per completed stage
   - States: Preprocessing complete (3m 42s), Model Loading complete (11m 18s), Training active

3. **Training Monitor - Loss Curve Interaction**
   - Purpose: Graph zoom, pan, export demonstration
   - Components: Expanded loss curve with zoom controls, Tooltip showing exact values
   - States: Zoomed to last 500 steps, Tooltip visible, Export button highlighted

4. **Training Monitor - Cost Warning State**
   - Purpose: Cost exceeds estimate alert
   - Components: Cost tracker with red styling, Alert banner, Cancel button emphasized
   - States: Current $54 vs estimate $45-55 (exceeded)

5. **Training Monitor - Completion State**
   - Purpose: Training finished successfully, transition to P05
   - Components: All stages green ✓, 100% progress, Celebration banner, "View LoRA Model" button
   - States: Completed, Final metrics displayed, Ready to navigate to P05

**P05 Navigation Handoff**
```
After training completes:
1. lora_artifact_path received in final status update
2. Create/retrieve model_artifacts record
3. "View LoRA Model" button links to: /models/{artifact_id}
4. P05 displays artifact details with download options
5. P04 remains accessible for historical review
```

Annotations (Mandatory)
- Map progress calculation to API response fields
- Reference webhook payload structure for real-time updates
- Document completion criteria triggering P05 navigation

Estimated Page Count
- **5 screens** covering active, stages, graph, warning, completion

=== END PROMPT P04: Training Progress Monitor ===

---

=== BEGIN PROMPT P05: Model Artifacts Manager ===

Title
- P05 Wireframes — LoRA Training Infrastructure: Model Artifacts Manager

**Cumulative Context: BUILDS ON P01 + P02 + P03 + P04**
- **Inherits from P01**: Renders in shell, uses all P01 patterns
- **Receives from P04**: Completed training job with `lora_artifact_path`, final metrics
- **References P02**: Original dataset used for training
- **References P03**: Training configuration used
- **FINAL PROMPT**: Closes the cumulative loop—model artifacts are the product of the entire pipeline

Context Summary
- This feature provides the model artifacts management interface displaying trained LoRA adapters with download capabilities, quality metrics, deployment status, and testing options (future). Users arrive from P04 after training completion and use this view to retrieve their trained models, review final metrics, and manage model lifecycle. This is the culmination of the P01→P02→P03→P04→P05 pipeline flow.

**Prerequisites from all previous prompts**:
- P01 shell with "Models" active, breadcrumb: "Home > Models > [Model Name]"
- Training job context from P04 (job_id, completion data)
- Original dataset from P02 (displayed as lineage)
- Configuration from P03 (hyperparameters used)

Journey Integration
- Stage goals: Access trained LoRA model, Understand model quality, Download model files, Manage model lifecycle
- Key emotions: Accomplishment (training worked!), Confidence in quality metrics, Control over model deployment
- Progressive disclosure levels:
  * Basic: Download button, quality badge, file size
  * Advanced: Training metrics summary, configuration used
  * Expert: Full training logs, comparison to baseline, deployment options

### Journey-Informed Design Elements
- User Goals: Download trained LoRA adapter files, Verify model quality, Track model lineage (which dataset, what config), Manage multiple trained versions
- Emotional Requirements: Celebrate successful training, Confidence through quality metrics, Control over file management
- Progressive Disclosure:
  * Basic: Model card with download button, quality score
  * Advanced: Training summary, configuration details, dataset lineage
  * Expert: Full logs, A/B comparison, deployment pipeline

Interface Points (P01, P02, P03, P04)
```
INHERITS FROM P01:
├─ content_area_container    → This view renders here
├─ breadcrumb_component      → Provides: ["Home", "Models", "{model_name}"]
├─ sidebar_active_state      → Sets: "Models" as active
└─ notification_system       → Uses for download completion, deployment status

RECEIVES FROM P04:
├─ training_job_id           → Links to training history
├─ lora_artifact_path        → Supabase storage path for download
├─ final_metrics             → Validation loss: 0.312, Perplexity: 1.28
├─ training_log_path         → Full training logs
└─ completion_timestamp      → "Trained on Dec 13, 2025"

REFERENCES P02 (Lineage):
├─ dataset_name              → "What was this trained on?"
├─ dataset_id                → Link back to dataset view
├─ total_training_pairs      → "1,567 pairs used"
└─ consultant_profile        → "Elena Morales, CFP"

REFERENCES P03 (Configuration):
├─ preset_used               → "Balanced Preset"
├─ hyperparameters           → r=16, lr=2e-4, epochs=3
└─ estimated_vs_actual       → Cost: $47 (estimate: $45-55)

CLOSES PIPELINE LOOP:
User journey: P02 → P03 → P04 → P05
User can navigate backwards at any point to:
├─ View source dataset (link to P02)
├─ View training configuration (link to P03 read-only)
└─ View training history (link to P04 completed state)
```

Wireframe Goals
- Provide prominent download access to trained model
- Display quality metrics with context (is this good?)
- Show complete lineage (dataset → config → training → artifact)
- Enable model lifecycle management (store, test, deploy, archive)
- Support multiple model versions from same dataset

Explicit UI Requirements
- **Model Card Header**: Model name (auto-generated: "{Dataset}-{Preset}-{Date}"), Status badge (Stored / Testing / Production / Archived), Created date: "Dec 13, 2025 at 4:32 PM", Base model: "Llama 3 70B Instruct"
- **Download Section (Primary)**: Large "Download LoRA Adapter" button (blue, prominent), File size: "246 MB", Files included: adapter_model.bin, adapter_config.json, Secondary: "Download Training Logs" (smaller link)
- **Quality Metrics Card**: Validation Loss: 0.312 (with context: "Lower is better, <0.5 is good"), Validation Perplexity: 1.28 (with context: "Lower is better, <2.0 is good"), Quality badge: ⭐⭐⭐⭐ "Good" (based on metrics thresholds), Comparison to training loss: "Started at 1.24, ended at 0.312" (improvement indicator)
- **Training Summary Card**: Training completed: "Dec 13, 2025 at 4:32 PM", Duration: "11h 28m", Total cost: "$47.23", GPU used: "H100 PCIe (Spot)", Steps completed: "2,000 / 2,000", Epochs: "3 / 3"
- **Configuration Reference (from P03)**: Preset used: "Balanced" badge, Key hyperparameters: r=16, α=32, dropout=0.05, Learning rate: 2e-4, cosine schedule, Link: "View Full Configuration" → Opens P03 in read-only mode
- **Dataset Lineage (from P02)**: Trained on: "[Dataset Name]" (link to P02 dataset detail), Training pairs: 1,567, Consultant: "Elena Morales, CFP", Scaffolding coverage summary (mini chart)
- **Model Actions**: "Test Model" (future: launches inference interface), "Deploy to Production" (future: updates deployment status), "Archive" (moves to archived status), "Delete" (with confirmation modal)
- **Version History (if multiple trainings on same dataset)**: Table: Version | Date | Config | Quality | Download, Enables comparison between training runs

Interactions and Flows
- **Initial load (from P04)**: Read `{artifact_id}` from URL → Fetch model artifact record → Display all sections → Link to training job for additional context
- **Download flow**: Click "Download LoRA Adapter" → File downloads from Supabase Storage → Progress indicator → Toast: "Download complete: adapter_model.bin (246 MB)"
- **Lineage navigation**: Click dataset name → Navigate to P02 dataset detail → Back button returns to P05, Click "View Full Configuration" → P03 loads in read-only mode showing used config
- **Lifecycle actions**: Click "Archive" → Confirmation modal → Status updates → Badge changes, Click "Delete" → Strong confirmation (type model name) → Remove from storage → Navigate to models list

Visual Feedback (P01 design system)
- Download button: Blue prominent, loading spinner during fetch, success checkmark
- Quality badge: Color-coded (green 4-5 stars, blue 3-4, yellow 2-3, red <2)
- Status badge: Colors per status (gray stored, blue testing, green production, amber archived)
- Lineage links: Hover underline, breadcrumb-style path display
- Action success: Toast notifications, status badge transitions

Accessibility Guidance (extends P01)
- Download: "Download LoRA adapter, 246 megabytes"
- Quality metrics: Each metric announced with context
- Lineage links: Descriptive link text, not just "click here"
- Actions: Destructive actions clearly distinguished in screen reader

Page Plan
1. **Model Artifact - Overview State**
   - Purpose: Primary model details after training completion
   - Components: P01 shell with "Models" active, Model card header, Download section, Quality metrics, Training summary, Configuration reference, Dataset lineage
   - States: Status "Stored", All sections populated

2. **Model Artifact - Download in Progress**
   - Purpose: Show download interaction
   - Components: Same as #1, Download button in loading state, Progress indicator
   - States: Download initiated, 45% complete

3. **Model Artifact - Lineage Navigation**
   - Purpose: Demonstrate backwards navigation through pipeline
   - Components: Focus on lineage section with hover states on links
   - States: Hovering "View Dataset" showing navigation preview

4. **Model Artifact - Version Comparison**
   - Purpose: Multiple training runs on same dataset
   - Components: Version history table, 3 versions listed, Quality comparison
   - States: Version comparison mode enabled

5. **Model Artifact - Lifecycle Action**
   - Purpose: Archive or delete confirmation
   - Components: Archive confirmation modal, Status transition preview
   - States: Modal open, "Archive" action pending

**Pipeline Loop Closure**
```
The complete user journey:
P01 (Shell) → Navigate to Datasets
    ↓
P02 (Datasets) → Select dataset, click "Start Training"
    ↓
P03 (Configurator) → Configure preset, click "Start Training"
    ↓
P04 (Monitor) → Watch training progress, wait for completion
    ↓
P05 (Artifacts) → Download trained model, celebrate 🎉
    ↓
(Optional) User can navigate backwards to any previous stage
    ↓
Repeat: Retrain with different config, new dataset, etc.
```

Annotations (Mandatory)
- Map to model_artifacts database schema
- Reference storage paths from Supabase
- Document lineage links to P02, P03, P04

Estimated Page Count
- **5 screens** covering overview, download, lineage, comparison, lifecycle

=== END PROMPT P05: Model Artifacts Manager ===

---

## Cumulative Build Summary

### Complete Prompt Flow

```
P01 → P02 → P03 → P04 → P05
 │      │      │      │      │
 │      │      │      │      └─ Model Artifacts (Download trained LoRA)
 │      │      │      └─ Training Monitor (Watch training progress)  
 │      │      └─ Training Configurator (Set hyperparameters, launch)
 │      └─ Dataset Manager (Select training dataset)
 └─ Dashboard Shell (Global layout, navigation, design system)
```

### Interface Contract Summary

| From | To | Data Passed |
|------|-----|-------------|
| P01 | All | Shell container, design tokens, navigation state |
| P02 | P03 | dataset_id, metadata, scaffolding distribution |
| P03 | P04 | training_job_id, configuration, estimates |
| P04 | P05 | lora_artifact_path, final_metrics, completion data |
| P05 | P02 | Lineage link back to source dataset |

### Design System Consistency (from P01)

All prompts (P02-P05) must use:
- **Color tokens** defined in P01 design system export
- **Typography scale** from P01
- **Spacing units** from P01
- **Component patterns** (buttons, cards, modals, badges)
- **Accessibility patterns** (focus, screen reader, keyboard)

---

## End of E00 Cumulative Build Prompts

5 cumulative prompts covering the complete LoRA training infrastructure pipeline:
- P01: Dashboard Shell & Navigation (Foundation)
- P02: Dataset Management View (Extends P01)
- P03: Training Job Configurator (Extends P01+P02)
- P04: Training Progress Monitor (Extends P01+P02+P03)
- P05: Model Artifacts Manager (Extends All, Closes Loop)
