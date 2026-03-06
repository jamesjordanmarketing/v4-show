# Combined Wireframe Analysis Worksheet - E01
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 1 — Training Job Configuration & Setup  
**Section ID:** E01  
**Product:** LoRA Pipeline

---

## PHASE 1: Deep Analysis

### Step 1.1: Individual FR Catalog

#### FR1.1.1: Create Training Job from Training File
- **Purpose:** Select which training dataset to use for the training job
- **Core Functionality:** Training file selection with comprehensive metadata display
- **UI Components:**
  - Searchable dropdown (training files)
  - Metadata panel (quality scores, scaffolding distribution, human review stats)
  - Eligibility indicator (Ready/Processing/Review Required)
  - Preview conversations modal
  - "Create Training Job" button
- **UI States:** Empty, Loading, Loaded, Selected, Metadata Displayed, Preview Modal Open, Validation Error
- **User Interactions:** Search/filter files, Select file, Preview conversations, View metadata, Create job
- **Page Count:** 5 pages
- **Dependencies:** None (starting point of workflow)

#### FR1.1.2: Select Hyperparameter Preset
- **Purpose:** Choose from three pre-configured parameter sets (Conservative, Balanced, Aggressive)
- **Core Functionality:** Preset selection with cost/quality trade-offs
- **UI Components:**
  - Three preset radio cards (Conservative, Balanced, Aggressive)
  - Technical parameter details (collapsible)
  - Cost estimation display
  - Risk level badges
  - Success rate indicators
  - Interactive tooltips
  - Documentation link
- **UI States:** Default (Balanced selected), Conservative selected, Aggressive selected, Aggressive locked (for new users), Technical details expanded/collapsed, Tooltips visible
- **User Interactions:** Select preset, Expand technical details, Hover for tooltips, View documentation
- **Page Count:** 5 pages
- **Dependencies:** FR1.1.1 (training file selection provides conversation count for default preset)

#### FR1.1.3: Select GPU Type with Cost Comparison
- **Purpose:** Choose between spot (70% cheaper, interruption risk) and on-demand (guaranteed)
- **Core Functionality:** GPU selection with cost-benefit comparison
- **UI Components:**
  - Toggle control (Spot / On-Demand)
  - Comparison cards (pricing, benefits, trade-offs)
  - Historical interruption data
  - Recovery guarantee messaging
  - Context-aware recommendation banner
  - High-cost confirmation modal
  - Low availability warning
- **UI States:** Spot selected (default), On-demand selected, High-cost confirmation modal, Low availability warning
- **User Interactions:** Toggle GPU type, Review comparison, Confirm high-cost selection, Switch on low availability
- **Page Count:** 5 pages
- **Dependencies:** FR1.1.1 + FR1.1.2 (dataset size and preset determine cost calculation)

#### FR1.2.1: Real-Time Cost Estimation
- **Purpose:** Provide accurate, continuously-updated cost forecasts
- **Core Functionality:** Dynamic cost calculation and display
- **UI Components:**
  - Cost estimation panel (sidebar or card, always visible)
  - Duration range display
  - Cost range display (min-max)
  - Accuracy disclaimer (±15%)
  - Cost breakdown (expandable: GPU compute, spot buffer, storage)
  - Warning indicators (high cost, long duration)
  - Historical accuracy metrics
  - Time-to-completion estimate
- **UI States:** Initial (empty), Calculating, Displayed, Updating (transition animation), Expanded breakdown, Warning state
- **User Interactions:** View estimate, Expand breakdown, Read warnings, See updates
- **Page Count:** 6 pages
- **Dependencies:** FR1.1.1 + FR1.1.2 + FR1.1.3 (all inputs affect cost calculation)

#### FR1.2.2: Pre-Job Budget Validation
- **Purpose:** Enforce monthly budget limits before job creation
- **Core Functionality:** Budget checking and validation with override mechanisms
- **UI Components:**
  - Budget status indicator (in cost panel)
  - Remaining budget display
  - Budget exceeded error modal
  - Budget utilization warning (80%, 90%)
  - Forecast display (including active jobs)
  - Budget increase workflow form
  - Manager override button (conditional)
  - Configuration adjustment suggestions
- **UI States:** Sufficient budget, 80% warning, 90% warning, Budget exceeded error, Increase workflow, Manager override confirmation
- **User Interactions:** View budget status, Request increase, Manager override, Adjust configuration
- **Page Count:** 4 pages
- **Dependencies:** FR1.2.1 (budget validation uses cost estimate)

#### FR1.3.1: Add Job Metadata & Documentation
- **Purpose:** Document the training job with name, description, notes, tags, client/project linking
- **Core Functionality:** Metadata entry and organization
- **UI Components:**
  - Job name field (auto-populated, editable)
  - Description textarea (500 char limit)
  - Notes textarea (2000 char limit, markdown support)
  - Tags multi-select dropdown
  - Custom tag creation
  - Tag pills display
  - Client/project assignment dropdown
  - Character counters
- **UI States:** Default (auto-populated name), Editing name, Adding description, Adding notes, Selecting tags, Creating custom tag, Linking project
- **User Interactions:** Edit name, Type description, Type notes with markdown, Select tags, Create tags, Link client/project
- **Page Count:** 4 pages
- **Dependencies:** FR1.1.1 + FR1.1.2 (training file name and preset used for auto-generated job name)

#### FR1.3.2: Review Configuration Before Start
- **Purpose:** Final pre-flight check with comprehensive summary and confirmation
- **Core Functionality:** Full configuration review with explicit confirmation
- **UI Components:**
  - "Review & Start Training" button (on config page)
  - Full-screen modal overlay
  - Training dataset summary card
  - Hyperparameters summary card
  - GPU configuration summary card
  - Cost analysis section with breakdown
  - Budget impact section
  - Warnings section (conditional)
  - Confirmation checklist (3 checkboxes)
  - Action buttons (Start Training, Edit Configuration, Cancel)
- **UI States:** Modal closed, Modal open (unchecked), Checkboxes checked, Start button enabled, Loading (job creation), Edit mode
- **User Interactions:** Click Review & Start, Read summary, Check confirmations, Start training, Edit configuration, Cancel
- **Page Count:** 5 pages
- **Dependencies:** ALL previous FRs (review summarizes entire configuration)

---

### Step 1.2: FR Relationships & Integration Points

#### Sequential Flow (User Journey)
FR1.1.1 → FR1.1.2 → FR1.1.3 → FR1.2.1 (continuous) → FR1.2.2 (validation) → FR1.3.1 → FR1.3.2

**Workflow Description:**
1. User selects training file (FR1.1.1)
2. System auto-selects preset based on conversation count (FR1.1.2)
3. User can change preset if desired (FR1.1.2)
4. User selects GPU type (FR1.1.3)
5. Cost estimate updates in real-time throughout (FR1.2.1)
6. Budget validation runs continuously (FR1.2.2)
7. User adds metadata (FR1.3.1)
8. User reviews complete config and starts (FR1.3.2)

#### Complementary Features (Same Page Integration)
- **Group 1 (Primary Inputs):** FR1.1.1, FR1.1.2, FR1.1.3 - All on main configuration page
- **Group 2 (Real-Time Feedback):** FR1.2.1 - Cost estimation panel visible alongside inputs
- **Group 3 (Validation):** FR1.2.2 - Budget validation status shown in cost panel
- **Group 4 (Documentation):** FR1.3.1 - Metadata fields at bottom of configuration form
- **Group 5 (Confirmation):** FR1.3.2 - Review modal triggered by button

#### State Dependencies (One Affects Another)
- **FR1.1.1 selection → triggers:**
  - FR1.1.2: Auto-select default preset based on conversation count
  - FR1.2.1: Initialize cost calculation with dataset size
  - FR1.3.1: Auto-populate job name with training file name
  
- **FR1.1.2 selection → triggers:**
  - FR1.2.1: Recalculate cost with new preset parameters
  - FR1.3.1: Update job name with new preset name

- **FR1.1.3 selection → triggers:**
  - FR1.2.1: Recalculate cost with new GPU hourly rate
  - FR1.2.2: Re-run budget validation with new cost

- **FR1.2.1 calculation → triggers:**
  - FR1.2.2: Budget validation with new estimate

- **All Groups 1-4 → summarized in:**
  - FR1.3.2: Complete review modal

#### UI Component Sharing
- **Cost Estimation Panel (FR1.2.1)** displays on same page as FR1.1.x inputs (sidebar or card)
- **Budget Status (FR1.2.2)** appears inline within FR1.2.1 cost panel
- **Metadata Fields (FR1.3.1)** appear at bottom of main configuration page before FR1.3.2 button
- **Review Modal (FR1.3.2)** overlays entire page, summarizing all previous sections

---

### Step 1.3: Overlaps & Duplications to Consolidate

#### 1. Cost Display Duplication
- **FR1.1.2** includes estimated cost in each preset card ($25-30, $50-60, $80-100)
- **FR1.1.3** includes cost comparison (spot vs on-demand pricing)
- **FR1.2.1** has dedicated cost estimation panel with real-time updates
- **CONSOLIDATION:** Use FR1.2.1's dedicated panel as single source of truth for live cost. Show static reference costs in FR1.1.2 preset cards as "typical cost range" for context, but make clear the sidebar shows the actual estimate for THIS job.

#### 2. Budget Validation Mentions
- **FR1.1.3** mentions confirmation modal for high-cost on-demand selection
- **FR1.2.1** includes "budget insufficient" warning indicator
- **FR1.2.2** has comprehensive budget validation system
- **CONSOLIDATION:** FR1.2.2 handles ALL budget logic centrally. Other FRs just reference or trigger it. High-cost confirmation in FR1.1.3 becomes a cost awareness check, not budget check. Budget validation only in FR1.2.2.

#### 3. Job Name Auto-Population
- **FR1.3.1** auto-generates job name from training file + preset + date
- **FR1.3.2** displays job name in review modal
- **CONSOLIDATION:** FR1.3.1 owns generation logic, FR1.3.2 displays it. No duplication needed, just reference.

#### 4. Metadata Display
- **FR1.1.1** displays training file metadata on selection (quality scores, scaffolding)
- **FR1.3.2** displays training file summary in review modal
- **CONSOLIDATION:** FR1.1.1 shows detailed metadata for selection decision. FR1.3.2 shows summary (key highlights only) for confirmation. Different levels of detail for different purposes.

#### 5. Configuration Summary
- **FR1.1.2** shows technical parameters for each preset
- **FR1.3.2** shows hyperparameter summary in review modal
- **CONSOLIDATION:** FR1.1.2 shows parameters within each preset card (for selection). FR1.3.2 shows final selected preset parameters (for confirmation). Same data, different contexts.

#### 6. Warning Systems
- **FR1.2.1** has high cost warning (>$100), long duration warning (>24 hrs)
- **FR1.2.2** has budget warnings (80%, 90%, exceeded)
- **FR1.3.2** has warnings section (high cost, aggressive parameters, low budget, long duration, first-time)
- **CONSOLIDATION:** Warnings generate throughout configuration but consolidate display in FR1.2.1 cost panel (inline) and FR1.3.2 review modal (summary). Avoid redundant warning displays on same screen.

---

### Step 1.4: POC Simplification Opportunities

#### Features to KEEP (Essential for POC)
1. ✅ **Training file selection with basic metadata (FR1.1.1)**
   - Searchable dropdown
   - File name, conversation count, simple quality score (single 0-5 value)
   - Basic metadata panel (no deep scaffolding preview)

2. ✅ **Three hyperparameter presets with key info (FR1.1.2)**
   - Conservative, Balanced, Aggressive cards
   - Name, description, cost estimate, success rate
   - Default selection (Balanced)

3. ✅ **Spot vs On-Demand GPU toggle (FR1.1.3)**
   - Simple toggle control
   - Price per hour, savings percentage
   - No complex interruption history charts

4. ✅ **Real-time cost estimation panel (FR1.2.1)**
   - Duration range
   - Cost range
   - Simple disclaimer (±15%)
   - Updates when config changes

5. ✅ **Basic budget validation (FR1.2.2 - simplified)**
   - Budget status: sufficient / exceeded
   - Simple error message with suggestions
   - No complex approval workflows for POC

6. ✅ **Job name and basic metadata (FR1.3.1 - simplified)**
   - Auto-populated job name (editable)
   - Optional description field (500 chars)
   - No tags, no client/project linking for POC

7. ✅ **Final review and start (FR1.3.2 - simplified)**
   - Summary of selections
   - Cost confirmation
   - 2 checkboxes (reduced from 3)
   - Start training button

#### Features to SIMPLIFY (Reduce Complexity)

1. 🔽 **Metadata Display (FR1.1.1):**
   - **REMOVE:** Scaffolding distribution preview, human review statistics, detailed quality breakdown
   - **KEEP:** File name, conversation count, single quality score (0-5 with color indicator)
   - **RATIONALE:** Enough info to make selection decision without overwhelming detail

2. 🔽 **Preset Details (FR1.1.2):**
   - **REMOVE:** Expandable technical parameters section, interactive tooltips on every parameter, aggressive preset locked state
   - **KEEP:** Three preset cards with name, description, cost estimate, success rate
   - **RATIONALE:** Users trust the presets without needing to understand every technical parameter for POC

3. 🔽 **GPU Selection (FR1.1.3):**
   - **REMOVE:** Historical interruption charts, provisioning time details, context-aware recommendations
   - **KEEP:** Simple toggle with spot/on-demand, hourly rate, savings percentage
   - **RATIONALE:** Basic cost comparison is sufficient for POC decision-making

4. 🔽 **Cost Breakdown (FR1.2.1):**
   - **REMOVE:** Expandable itemized breakdown, historical accuracy charts, time-to-completion estimates
   - **KEEP:** Total cost range, duration range, simple disclaimer
   - **RATIONALE:** Total cost is what users care about most; detailed breakdown is nice-to-have

5. 🔽 **Budget Validation (FR1.2.2):**
   - **REMOVE:** Budget increase workflow, manager override system, approval routing, forecast with active jobs
   - **KEEP:** Simple over-budget error with clear message, suggestion to adjust configuration
   - **RATIONALE:** POC can enforce hard budget limits; approval workflows are enterprise feature

6. 🔽 **Job Metadata (FR1.3.1):**
   - **REMOVE:** Client/project assignment, custom tag creation, markdown notes editor, multi-select tags
   - **KEEP:** Job name (auto-populated, editable), simple description field (optional)
   - **RATIONALE:** Basic naming and description is enough for POC organization

7. 🔽 **Review Modal (FR1.3.2):**
   - **REMOVE:** Comparison to previous jobs, template support, detailed warnings section with multiple scenarios
   - **KEEP:** Basic configuration summary (file, preset, GPU, cost, budget), 2 checkboxes, action buttons
   - **RATIONALE:** Summary confirmation is essential, but advanced features can wait

#### Features to REMOVE (Nice-to-Have, Non-Essential)

1. ❌ **Preview conversations modal (FR1.1.1)**
   - REASON: Adds complexity, not essential for training decision

2. ❌ **Expandable technical parameters (FR1.1.2)**
   - REASON: Users rely on preset names; parameter details are expert-level

3. ❌ **Interactive tooltips on all parameters (FR1.1.2)**
   - REASON: Educational value, but not required for POC functionality

4. ❌ **Aggressive preset locked state (FR1.1.2)**
   - REASON: Gamification feature, not essential for POC

5. ❌ **Historical accuracy metrics (FR1.2.1)**
   - REASON: Confidence-building, but POC can launch without historical proof

6. ❌ **Forecast with active jobs (FR1.2.2)**
   - REASON: Useful for power users, but adds complexity for POC

7. ❌ **Budget increase workflow (FR1.2.2)**
   - REASON: Approval routing is enterprise feature, not POC priority

8. ❌ **Manager override system (FR1.2.2)**
   - REASON: Role-based permissions, can add post-POC

9. ❌ **Tag system with pills (FR1.3.1)**
   - REASON: Organization feature, not essential for initial usage

10. ❌ **Client/project assignment (FR1.3.1)**
    - REASON: Cost attribution is advanced feature

11. ❌ **Markdown notes editor (FR1.3.1)**
    - REASON: Rich text editing adds complexity, plain text sufficient for POC

12. ❌ **Comparison to previous jobs (FR1.3.2)**
    - REASON: Historical comparison requires job history, not available for first users

13. ❌ **Template support (FR1.3.2)**
    - REASON: Configuration templates are power user feature

14. ❌ **Conditional warnings section (FR1.3.2)**
    - REASON: Multiple warning scenarios add UI complexity, basic cost warning sufficient

15. ❌ **Spot availability warnings (FR1.1.3)**
    - REASON: Real-time availability checking adds API dependency

16. ❌ **High-cost confirmation modal (FR1.1.3)**
    - REASON: Budget validation handles this; redundant confirmation

#### POC Goal Alignment
- **Demonstrate Core Workflow:** Select dataset → Configure (preset + GPU) → See cost → Confirm → Start job
- **Essential:** Configuration inputs, cost transparency, validation, confirmation
- **Non-Essential:** Advanced features, detailed analytics, enterprise features (approvals, overrides)
- **Page Count Reduction:** 34 pages (original) → ~12 pages (POC)

---

## PHASE 2: Integration Planning

### Step 2.1: Unified UX Flow Design

#### Single-Page Configuration Workflow

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Create New Training Job                                                 │
├────────────────────────────────────┬────────────────────────────────────────────┤
│ MAIN CONTENT (Left 2/3)            │ SIDEBAR (Right 1/3)                        │
│                                     │                                            │
│ SECTION 1: Training File Selection │ ┌────────────────────────────────────────┐ │
│ ┌─────────────────────────────────┐ │ │ Cost Estimate (FR1.2.1)              │ │
│ │ [Searchable Dropdown]           │ │ │                                      │ │
│ │ Select training file...         │ │ │ Duration: --                         │ │
│ │                                 │ │ │ Cost: --                             │ │
│ │ [Metadata Panel on Selection]   │ │ │ ±15% variance                        │ │
│ │ - File: [name]                  │ │ │                                      │ │
│ │ - Conversations: [count]        │ │ │ ─────────────────                    │ │
│ │ - Quality: [score/5]            │ │ │                                      │ │
│ └─────────────────────────────────┘ │ │ Budget Status (FR1.2.2)              │ │
│                                     │ │                                      │ │
│ SECTION 2: Hyperparameter Preset   │ │ ✓ Within Budget                      │ │
│ ┌─────────┐┌─────────┐┌─────────┐  │ │ Remaining: $--                       │ │
│ │Conserva-││Balanced ││Aggress- │  │ │                                      │ │
│ │  tive   ││(DEFAULT)││  ive    │  │ └────────────────────────────────────────┘ │
│ │ $25-30  ││ $50-60  ││ $80-100 │  │                                            │
│ │ 98%     ││  96%    ││  92%    │  │                                            │
│ └─────────┘└─────────┘└─────────┘  │                                            │
│                                     │                                            │
│ SECTION 3: GPU Selection            │                                            │
│ ◉ Spot Instance ($2.49/hr) - Save 70%                                          │
│ ○ On-Demand ($7.99/hr) - Guaranteed                                            │
│                                     │                                            │
│ SECTION 4: Job Metadata (FR1.3.1 - SIMPLIFIED)                                │
│ ┌──────────────────────────────────────────────────────────────────────────┐  │
│ │ Job Name: [Auto-populated, editable]                                     │  │
│ │ Description: [Optional 500 char textarea]                                │  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                            │
│ [Review & Start Training] ← (FR1.3.2 triggers review modal)                   │
│                                     │                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### User Interaction Flow

**1. Initial Load:**
- Page loads with all sections empty/default state
- Cost sidebar shows "--" (waiting for selections)
- "Review & Start" button disabled (gray)
- No file selected, Balanced preset pre-selected, Spot GPU pre-selected

**2. Select Training File (FR1.1.1):**
- User searches/selects from dropdown
- Metadata panel appears below dropdown
- Shows: File name, Conversation count, Quality score (simple 0-5 with color)
- Cost sidebar initializes with estimate: "12-15 hours, $50-60"
- Balanced preset remains selected (appropriate for most datasets)
- Job name auto-populates: "{fileName} - Balanced - {date}"

**3. Change Preset (FR1.1.2):**
- User clicks different preset card (e.g., Aggressive)
- Selected card gets blue border, others gray
- Cost sidebar updates within 500ms: "$50-60" → "$80-100"
- Shows delta: "↑ $30 increase" (animated)
- Job name updates: "{fileName} - Aggressive - {date}"
- Budget validation re-runs automatically

**4. Toggle GPU Type (FR1.1.3):**
- User switches from Spot to On-Demand
- Toggle animation
- Cost sidebar recalculates immediately: "$80-100" → "$200-240"
- Shows delta: "↑ $120 increase" (animated, red)
- Budget validation re-runs
- IF over budget: Error appears in sidebar, button disables

**5. Add Metadata (FR1.3.1):**
- User edits auto-generated job name (optional)
- User adds optional description (500 char limit with counter)
- "Review & Start" button enables when all required fields valid

**6. Review & Start (FR1.3.2):**
- User clicks "Review & Start Training" button
- Full-screen modal appears (dims background)
- Modal displays:
  - Training file summary (name, conv count, quality)
  - Preset summary (name, key parameters)
  - GPU summary (type, rate)
  - Cost summary (duration, cost range)
  - Budget impact (current spend, this job, remaining)
  - 2 checkboxes:
    1. "I have reviewed the configuration above"
    2. "I understand the estimated cost ($XX-YY)"
  - Actions: "Start Training", "Edit Configuration", "Cancel"
- User checks both boxes
- "Start Training" button enables (green)
- Click starts job, redirects to job details page

**7. Budget Error Flow:**
- User selects expensive configuration
- Cost exceeds remaining budget
- Error appears in sidebar: "❌ Over Budget - Exceeds remaining by $50"
- Suggestions shown: "Try Conservative preset (-$50), Use Spot instead (-$120)"
- "Review & Start" button disabled (gray)
- User adjusts configuration (changes preset or GPU)
- Error clears when within budget
- Button re-enables

#### State Management

**Unified Configuration State Object:**
```typescript
interface TrainingJobConfig {
  // FR1.1.1 - Training File
  trainingFileId: string | null;
  trainingFileName: string;
  conversationCount: number;
  qualityScore: number; // 0-5
  
  // FR1.1.2 - Hyperparameter Preset
  preset: 'conservative' | 'balanced' | 'aggressive';
  
  // FR1.1.3 - GPU Selection
  gpuPricingTier: 'spot' | 'on_demand';
  hourlyRate: number; // 2.49 or 7.99
  
  // FR1.2.1 - Cost Estimation (calculated)
  estimatedDurationMin: number; // hours
  estimatedDurationMax: number;
  estimatedCostMin: number; // dollars
  estimatedCostMax: number;
  
  // FR1.2.2 - Budget Validation (from backend)
  monthlyBudgetLimit: number;
  monthToDateSpend: number;
  budgetRemaining: number;
  budgetValidationPassed: boolean; // computed
  
  // FR1.3.1 - Metadata
  jobName: string; // auto-populated, editable
  description: string; // optional
  
  // UI State
  isValid: boolean; // all required fields filled
  isLoading: boolean;
}
```

**State Update Triggers:**
- `trainingFileId` change → Recalculate cost, update job name, validate
- `preset` change → Recalculate cost, update job name, validate
- `gpuPricingTier` change → Recalculate cost, validate budget
- Any cost change → Re-run budget validation
- `jobName` or `description` change → Validate completeness

---

### Step 2.2: Component Interaction Map

#### Primary Components & Their Triggers

**1. TrainingFileDropdown (FR1.1.1)**
```
onChange(fileId) → Triggers:
  ├─ MetadataPanel.show(fileData)
  ├─ CostEstimationPanel.calculate(conversationCount)
  ├─ JobNameField.autoPopulate(fileName, preset, date)
  └─ ReviewButton.validateEnablement()
```

**2. PresetSelector (FR1.1.2)**
```
onChange(preset) → Triggers:
  ├─ CostEstimationPanel.recalculate(preset)
  ├─ JobNameField.updatePreset(preset)
  └─ ReviewButton.validateEnablement()
```

**3. GPUToggle (FR1.1.3)**
```
onChange(gpuType) → Triggers:
  ├─ CostEstimationPanel.recalculate(gpuType)
  ├─ BudgetValidator.validate(newCost, remaining)
  └─ ReviewButton.validateEnablement()
```

**4. CostEstimationPanel (FR1.2.1)**
```
Reactive Component - Updates when:
  ├─ TrainingFileDropdown changes
  ├─ PresetSelector changes
  └─ GPUToggle changes

Computation:
  duration = (conversationCount × trainingPairs × epochs × secondsPerPair[preset]) / 3600
  cost = duration × hourlyRate[gpuType]
  Updates within 500ms (debounced)
  
Triggers:
  └─ BudgetValidator.validate(newCost)
```

**5. BudgetValidator (FR1.2.2)**
```
Reactive Component - Validates when:
  └─ CostEstimationPanel updates

Logic:
  IF estimatedCost > budgetRemaining
    THEN showError("Over budget by $XX")
         AND disableButton()
  ELSE clearError()
       AND enableButton()
```

**6. JobMetadataFields (FR1.3.1)**
```
Auto-Population (when):
  ├─ TrainingFileDropdown selected → populate name
  └─ PresetSelector changed → update name with new preset

Format: "{trainingFileName} - {preset} - {YYYY-MM-DD}"

onChange(name or description) → Triggers:
  └─ ReviewButton.validateEnablement()
```

**7. ReviewModal (FR1.3.2)**
```
Triggered by:
  └─ ReviewButton.onClick()

Displays:
  ├─ Training file (from FR1.1.1)
  ├─ Preset (from FR1.1.2)
  ├─ GPU type (from FR1.1.3)
  ├─ Cost estimate (from FR1.2.1)
  ├─ Budget impact (from FR1.2.2)
  └─ Metadata (from FR1.3.1)

Actions:
  ├─ "Start Training" → createJob() → redirect
  ├─ "Edit Configuration" → closeModal() → return to form
  └─ "Cancel" → closeModal() → no changes
```

#### Data Flow Diagram
```
[User Input] → [Configuration State] → [Computed Values] → [UI Display]

Training File Selection
  └→ conversationCount → duration calc → cost display
  └→ fileName → job name auto-population

Preset Selection  
  └→ preset → duration calc → cost display
  └→ preset → job name update

GPU Selection
  └→ hourlyRate → cost calc → cost display
                          → budget validation

Cost Estimation
  └→ estimatedCost → budget check → validation result
                                  → enable/disable button

Budget Validation
  └→ passed/failed → button state
                  → error message display

All Combined
  └→ Review Modal Summary
```

---

## PHASE 3: POC Simplification

### Step 3.1: POC-Optimized Feature Set

#### What We're Building (Essential Only)

**Page 1: Main Configuration Form**

**Training File Selection (Simplified):**
- Searchable dropdown showing top 10 most recent training files
- Simple metadata on selection:
  - File name
  - Conversation count
  - Quality score (single 0-5 rating with color: red <3, yellow 3-4, green 4-5)
- NO: Scaffolding preview, human review stats, detailed quality breakdown, preview conversations modal

**Preset Selection (Simplified):**
- Three preset cards displayed horizontally:
  - **Conservative:** "Best for first runs", "$25-30", "98%" success
  - **Balanced:** "Production ready", "$50-60", "96%" success, DEFAULT
  - **Aggressive:** "Maximum quality", "$80-100", "92%" success
- Each card shows: Name, 1-line description, cost estimate, success rate
- Selected card: Blue border, others gray
- NO: Expandable technical parameters, interactive tooltips, locked states, documentation links

**GPU Selection (Simplified):**
- Simple toggle: **Spot** / **On-Demand**
- Spot: "$2.49/hr, Save 70%" (green badge)
- On-Demand: "$7.99/hr, Guaranteed" (blue badge)
- Default: Spot selected
- NO: Historical interruption charts, context-aware recommendations, confirmation modals, availability warnings

**Sidebar - Cost Estimate (Simplified):**
- Panel title: "Cost Estimate" with real-time indicator (pulse)
- Display: "Duration: 12-15 hours"
- Display: "Cost: $50-60 (spot)" (large, bold)
- Display: "±15% variance" (small, gray)
- Budget Status: "✓ Within Budget - $200 remaining" (green) OR "❌ Over Budget - Exceeds by $XX" (red)
- NO: Expandable breakdown, historical accuracy charts, time-to-completion, optimization tips

**Job Metadata (Simplified):**
- Job Name field:
  - Auto-populated: "{trainingFileName} - {preset} - {YYYY-MM-DD}"
  - Editable text input
  - Character counter: "45/100"
- Description field:
  - Optional textarea
  - Placeholder: "Purpose of this training run (optional)"
  - Character counter: "0/500"
- NO: Tags, client/project linking, markdown notes, custom fields

**Review & Start Button:**
- Large blue button: "Review & Start Training"
- Enabled when: file selected, preset selected, GPU selected, name valid, budget OK
- Disabled when: any required field missing OR budget exceeded
- States: Disabled (gray), Enabled (blue), Loading (spinner)

**Page 2: Review Modal (Simplified)**

**Modal Structure:**
- Full-screen overlay (dims background 50%)
- Header: "Review Training Configuration" with estimated cost: "$50-60"
- Close X in top-right (optional, can use Cancel button instead)

**Summary Cards:**
1. **Training File:**
   - Name: "{trainingFileName}"
   - Conversations: "{count} conversations"
   - Quality: "{score}/5" with color indicator

2. **Configuration:**
   - Preset: "{preset name}" with badge
   - Key parameters: "Rank: 16, Epochs: 3, Learning Rate: 0.0002"
   - GPU: "{type}" ({rate}/hr) with "Spot - Save 70%" badge

3. **Cost:**
   - Duration: "12-15 hours"
   - Cost: "$50-60 (±15%)"
   - Budget Impact: "$387 used + $52 this job = $439 of $500"
   - Remaining: "$61 available"

**Confirmation:**
- Checkbox 1: "☐ I have reviewed the configuration above"
- Checkbox 2: "☐ I understand the estimated cost ($50-60)"
- Both must be checked to enable "Start Training" button

**Actions:**
- "Start Training" button (green, prominent, initially disabled)
  - Enabled when both checkboxes checked
  - Click: Creates job, redirects to job details
- "Edit Configuration" button (secondary, gray)
  - Click: Closes modal, returns to form, preserves all settings
- "Cancel" button (tertiary, text link)
  - Click: Closes modal, returns to job list

**What We're NOT Building (Removed for POC)**
- ❌ Preview conversations modal
- ❌ Expandable technical parameters for presets
- ❌ Interactive tooltips explaining every term
- ❌ Historical accuracy charts for cost estimates
- ❌ Detailed cost breakdown (GPU compute, spot buffer, storage itemization)
- ❌ Budget increase workflow with approval routing
- ❌ Manager override system with justifications
- ❌ Tag system with multi-select and custom tag creation
- ❌ Client/project assignment for cost attribution
- ❌ Markdown notes editor with preview
- ❌ Comparison to previous jobs in review modal
- ❌ Configuration template support
- ❌ Multiple warning scenarios in review (high cost, aggressive params, etc.)
- ❌ Spot availability warnings with datacenter utilization
- ❌ Context-aware recommendations based on job characteristics
- ❌ Advanced cost optimization suggestions
- ❌ Locked aggressive preset for new users
- ❌ Documentation links and educational content

---

### Step 3.2: Page Count Optimization

#### Original Total: 34 pages across 7 FRs
- FR1.1.1: 5 pages (file selection workflow)
- FR1.1.2: 5 pages (preset selection states)
- FR1.1.3: 5 pages (GPU comparison)
- FR1.2.1: 6 pages (cost estimation states)
- FR1.2.2: 4 pages (budget validation)
- FR1.3.1: 4 pages (metadata entry)
- FR1.3.2: 5 pages (review modal)

#### Combined & Simplified: 12 pages

**1. Configuration Form - Empty State**
- Purpose: Show starting point before any user input
- Key Elements:
  - Empty dropdown with placeholder "Select training file..."
  - Three preset cards (Balanced selected by default)
  - Spot GPU selected by default
  - Cost sidebar showing "--"
  - Job name field empty
  - Description field empty
  - "Review & Start" button disabled (gray)
- States: Initial load, no data entered

**2. Configuration Form - File Selected**
- Purpose: Show immediate feedback after training file selection
- Key Elements:
  - Dropdown showing selected file
  - Metadata panel expanded: "Elena Morales Financial, 242 conversations, Quality: 4.5/5 ✓"
  - Cost sidebar populated: "Duration: 12-15 hours, Cost: $50-60"
  - Budget status: "✓ Within Budget, $200 remaining"
  - Job name auto-populated: "Elena Morales Financial - Balanced - 2025-12-19"
  - Balanced preset still selected
  - "Review & Start" button still disabled (until description considered optional - should be enabled)
- States: File selected, initial configuration set, button enabled

**3. Configuration Form - Preset Changed**
- Purpose: Demonstrate preset selection and cost update
- Key Elements:
  - Aggressive preset selected (blue border)
  - Cost updated to "$80-100" with delta indicator "↑ $30 increase" (animated)
  - Job name updated: "Elena Morales Financial - Aggressive - 2025-12-19"
  - Duration updated: "18-20 hours"
  - Budget status still green
  - "Review & Start" button enabled
- States: Alternative preset selected, cost recalculated

**4. Configuration Form - GPU Toggled**
- Purpose: Show GPU type switching and significant cost change
- Key Elements:
  - On-Demand selected (toggle switched)
  - Cost updated to "$200-240" with delta "↑ $120 increase" (red, animated)
  - Duration unchanged: "18-20 hours"
  - Budget status possibly turns yellow/red if approaching limit
  - Shows comparison: "Save $120 by using Spot" hint
- States: Premium GPU selected, cost significantly higher

**5. Configuration Form - Metadata Added**
- Purpose: Show optional metadata completion
- Key Elements:
  - Job name edited: "Acme Q4 Production Model - Aggressive - 2025-12-19"
  - Description added: "Production model for Acme Financial Q4 delivery. Testing aggressive parameters on high-quality emotional intelligence dataset."
  - Character counters: "52/100", "128/500"
  - All sections complete
  - "Review & Start" button enabled and highlighted
- States: Metadata customized, ready to review

**6. Configuration Form - Complete Valid**
- Purpose: Show ready-to-submit state with all fields valid
- Key Elements:
  - All sections filled correctly
  - Cost within budget
  - Budget status: "✓ Within Budget, $150 remaining"
  - "Review & Start" button prominent and enabled (blue, slightly pulsing or with subtle highlight)
  - Visual indication this is the "happy path" ready state
- States: Valid configuration, can proceed to review

**7. Configuration Form - Budget Exceeded**
- Purpose: Show error state when estimated cost exceeds budget
- Key Elements:
  - On-Demand + Aggressive configuration selected
  - Cost: "$200-240"
  - Budget status: "❌ Over Budget - Exceeds remaining by $50"
  - Error message in sidebar: "Reduce job cost or increase budget limit"
  - Suggestions: "Switch to Conservative preset (save $120), Use Spot instead (save $120)"
  - "Review & Start" button disabled (gray)
  - Red outline or indicator on cost panel
- States: Invalid due to budget, blocked from proceeding

**8. Review Modal - Initial Display**
- Purpose: Show full-screen review with all configuration summarized
- Key Elements:
  - Modal overlay (background dimmed)
  - Header: "Review Training Configuration - Estimated Cost: $50-60"
  - Training File card: "Elena Morales Financial, 242 conversations, Quality: 4.5/5"
  - Configuration card: "Balanced preset, Rank: 16, Epochs: 3, LR: 0.0002, GPU: H100 Spot ($2.49/hr)"
  - Cost card: "12-15 hours, $50-60, Budget: $387 + $52 = $439 of $500, $61 remaining"
  - Checkboxes unchecked
  - "Start Training" button disabled (gray)
  - "Edit Configuration" and "Cancel" buttons enabled
- States: Modal open, awaiting confirmation

**9. Review Modal - Checkboxes Checked**
- Purpose: Show ready-to-start state after user confirmation
- Key Elements:
  - Same layout as Page 8
  - Both checkboxes checked: ✓
  - "Start Training" button enabled (green, prominent)
  - User can now click to start job
- States: Confirmed, ready to start

**10. Review Modal - Edit Configuration Action**
- Purpose: Show user returning to edit from review modal
- Key Elements:
  - Modal closing animation (fade out)
  - Return to configuration form (Page 3, 4, 5, or 6 state)
  - All settings preserved exactly as they were
  - User can make changes and re-open review
- States: Modal closing, returning to edit mode

**11. Mobile Layout - Configuration Form**
- Purpose: Show responsive layout for mobile devices (320-768px width)
- Key Elements:
  - Single column layout (stacked vertically)
  - Sidebar moved below main content (becomes a card)
  - Preset cards stack vertically (full width)
  - Larger touch targets (48px minimum)
  - Simplified metadata panel (less detail)
  - Sticky "Review & Start" button at bottom
- States: Mobile viewport, vertical layout

**12. Mobile Layout - Review Modal**
- Purpose: Show review modal adapted for mobile
- Key Elements:
  - Full-screen modal (no margins)
  - Scrollable content area
  - Summary cards stacked vertically
  - Larger checkboxes for touch
  - Fixed action buttons at bottom (sticky)
  - Simplified cost display (essential info only)
- States: Mobile review, touch-optimized

#### Reduction Strategy
- **Consolidated related states:** Multiple file selection states (empty, loading, loaded) → 1 page with annotations
- **Combined similar flows:** All cost updates shown via animation on single pages (not separate pages per update)
- **Removed duplicate demonstrations:** Don't show every permutation (Conservative + Spot, Conservative + On-Demand, etc.) - show representative examples
- **Simplified error handling:** One budget error page covers all over-budget scenarios
- **Mobile as separate view:** 2 pages for mobile instead of duplicating all 10 desktop pages for mobile

#### Page Count Justification
**12 pages is optimal because:**
1. Shows complete user journey (empty → configured → reviewed → started)
2. Demonstrates all key state changes (selections, updates, errors, validation)
3. Covers both desktop (10 pages) and mobile (2 pages) layouts
4. Includes primary success path (6 pages) and key error scenario (1 page)
5. Shows modal workflow (open → confirm → start / edit)
6. Maintains POC simplicity while proving all essential functionality

**vs 34 original pages:**
- Removed redundant state variations (5 dropdown states → integrated into 3 pages)
- Removed feature-specific pages for deleted features (tooltips, locked states, approval workflows)
- Combined overlapping demonstrations (cost updates happen on multiple pages, not dedicated pages)
- Unified workflow into single-page app (not separate pages per FR)

---

## Summary

This worksheet documents the complete analysis for combining 7 individual FR wireframe prompts into ONE cohesive Figma wireframe prompt for Stage 1 - Training Job Configuration & Setup.

**Key Decisions:**
1. **Integration:** Single-page configuration form with sidebar for real-time feedback
2. **Simplification:** Removed 15 non-essential features for POC speed
3. **Page Reduction:** 34 pages → 12 pages (65% reduction)
4. **State Management:** Unified configuration object with reactive updates
5. **User Flow:** Linear progression (file → preset → GPU → metadata → review → start)

**Next Step:** Generate final combined Figma prompt in output file using this analysis.
