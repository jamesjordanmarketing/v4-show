# E07 — Combined Wireframe Generator Prompt (v1)

**Generated:** 2025-12-19  
**Stage:** Stage 7 — Cost Management & Budget Control  
**Product:** LoRA Pipeline  
**Section ID:** E07

---

## Instructions for AI Agent

This prompt will guide you to:
1. Read and analyze all individual FR prompts from: 04-pipeline-FIGMA-wireframes-output-E07.md
2. Combine them into ONE cohesive, integrated Figma wireframe prompt
3. Remove duplicates and overlaps
4. Simplify for proof-of-concept
5. Write the final combined FIGMA prompt to: pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md

**CRITICAL OUTPUT FILE:** The final combined Figma prompt MUST be written to:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md`

---

## FR Wireframes COMBINED Prompt Generator (v1) — Creates ONE Cohesive Figma Prompt from Multiple FRs

**Goal:** Read an existing FIGMA wireframe output file containing multiple individual FR prompts for a stage, analyze them holistically, combine them into ONE cohesive prompt that creates a fully functional, integrated wireframe for the entire stage, remove duplicates/overlaps, and slightly simplify for proof-of-concept purposes.

**Purpose:** Transform multiple fragmented FR prompts into a single, integrated prompt that Figma Make AI can use to create a complete, functional wireframe system where all features work together seamlessly.

---

## Input Parameters (Injected by Script)

**Stage Information:**
- **Stage Number:** 7 (e.g., 01, 02, 03, etc.)
- **Stage Name:** Stage 7 — Cost Management & Budget Control (e.g., "Training Job Configuration & Setup")
- **Section ID:** E07 (e.g., E01)
- **Product Abbreviation:** pipeline
- **Project Name:** LoRA Pipeline

**File Paths (FULL ABSOLUTE PATHS):**
- **Input Wireframe Output File:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E01.md`
- **Source FR Specification File:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E07.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E01.md`
- **FINAL Combined FIGMA Output File (WHERE TO WRITE):** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E01.md`
  - **CRITICAL:** Write the final combined Figma prompt to this file

**Reference Documents (FULL ABSOLUTE PATHS):**
- **Product Overview:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\01-pipeline-overview.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\01-pipeline-overview.md`
- **User Stories:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02-pipeline-user-stories.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02-pipeline-user-stories.md`
- **User Journey:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02b-pipeline-user-journey.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02b-pipeline-user-journey.md`
- **Functional Requirements:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\03-pipeline-functional-requirements.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\03-pipeline-functional-requirements.md`

**Analysis Output (for reference/debugging):**
- **Analysis Documentation File:** C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E07-analysis_v1.md
  - Example: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E01-analysis_v1.md`

---

## Task Overview

You will perform a **4-phase process**:

### Phase 1: Deep Analysis (Documentation Phase)
Read and analyze all individual FR prompts, identify relationships, overlaps, and integration points.

### Phase 2: Integration Planning (Architecture Phase)
Design the unified UX flow, state management, and component relationships.

### Phase 3: Simplification & POC Optimization (Refinement Phase)
Remove non-essential features, identify "nice-to-haves," and streamline for proof-of-concept.

### Phase 4: Combined Prompt Generation (Output Phase)
Write ONE cohesive Figma Make AI prompt that encompasses all essential functionality.

---

## PHASE 1: Deep Analysis (Write to Analysis File)

### Step 1.1: Extract All FR Prompts

Read the input wireframe output file at: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md`

For each prompt section marked by:
```
=== BEGIN PROMPT FR: [FR_NUMBER] ===
[prompt content]
=== END PROMPT FR: [FR_NUMBER] ===
```

Extract and catalog:
1. **FR Number** (e.g., FR1.1.1, FR1.1.2, FR1.1.3)
2. **FR Title/Purpose**
3. **Core Functionality** (what it does)
4. **UI Components** (dropdowns, cards, buttons, panels, modals, etc.)
5. **UI States** (loading, error, success, empty, disabled, etc.)
6. **User Interactions** (click, select, hover, type, etc.)
7. **Page Count** (estimated pages in this FR)
8. **Dependencies** (references to other FRs)

**Output Format (in Analysis File):**

```markdown
## Individual FR Catalog

### FR1.1.1: Create Training Job from Training File
- **Purpose:** Select which training dataset to use
- **Core Functionality:** Training file selection with metadata display
- **UI Components:**
  - Searchable dropdown (training files)
  - Metadata panel (quality scores, scaffolding distribution)
  - Eligibility indicator
  - "Create Training Job" button
- **UI States:** Empty, Loading, Loaded, Selected, Validation Error
- **User Interactions:** Search, Select, Preview, Create
- **Page Count:** 5 pages
- **Dependencies:** None (starting point)

### FR1.1.2: Select Hyperparameter Preset
[repeat format]

### FR1.1.3: Select GPU Type with Cost Comparison
[repeat format]

[...continue for all FRs]
```

### Step 1.2: Identify Relationships & Integration Points

Analyze how FRs relate to each other:

**Output Format (in Analysis File):**

```markdown
## FR Relationships & Integration Points

### Sequential Flow (User Journey)
FR1.1.1 → FR1.1.2 → FR1.1.3 → FR1.2.1 → FR1.2.2 → FR1.3.1 → FR1.3.2

### Complementary Features (Same Page)
- **Group 1 (Primary Inputs):** FR1.1.1, FR1.1.2, FR1.1.3
- **Group 2 (Real-Time Feedback):** FR1.2.1 (Cost Estimation)
- **Group 3 (Validation):** FR1.2.2 (Budget Validation)
- **Group 4 (Documentation):** FR1.3.1 (Metadata)
- **Group 5 (Confirmation):** FR1.3.2 (Review & Start)

### State Dependencies (One Affects Another)
- FR1.1.1 selection → triggers FR1.2.1 cost calculation
- FR1.1.2 selection → updates FR1.2.1 cost estimate
- FR1.1.3 selection → recalculates FR1.2.1 costs
- FR1.2.1 estimate → triggers FR1.2.2 budget validation
- FR1.1.1 + FR1.1.2 → auto-populate FR1.3.1 job name
- All Group 1 + 2 + 3 + 4 → summarized in FR1.3.2 review modal

### UI Component Sharing
- Cost estimation panel (FR1.2.1) displays on same page as FR1.1.x inputs
- Budget warnings (FR1.2.2) appear inline with FR1.2.1 cost panel
- Metadata fields (FR1.3.1) appear at bottom before FR1.3.2 button
```

### Step 1.3: Identify Overlapping/Duplicate Functionality

Find redundancies across FR prompts:

**Output Format (in Analysis File):**

```markdown
## Overlaps & Duplications to Consolidate

### 1. Cost Display Duplication
- **FR1.1.2** includes estimated cost in each preset card ($25-30, $50-60, $80-100)
- **FR1.1.3** includes cost comparison (spot vs on-demand)
- **FR1.2.1** has dedicated cost estimation panel
- **CONSOLIDATION:** Use FR1.2.1's dedicated panel, show preview costs in presets as static reference

### 2. Budget Validation Mentions
- **FR1.1.3** mentions confirmation modal for high-cost on-demand
- **FR1.2.1** includes budget insufficient warning
- **FR1.2.2** has comprehensive budget validation
- **CONSOLIDATION:** FR1.2.2 handles all budget logic, others just trigger it

### 3. Job Name Auto-Population
- **FR1.3.1** auto-generates job name
- **FR1.3.2** displays job name in review modal
- **CONSOLIDATION:** FR1.3.1 owns generation logic, FR1.3.2 displays it

### 4. Metadata Display
- Multiple FRs mention "training file metadata"
- **CONSOLIDATION:** FR1.1.1 displays metadata on selection, FR1.3.2 summarizes in review
```

### Step 1.4: Identify POC Simplification Opportunities

Determine what can be simplified or removed for proof-of-concept:

**Output Format (in Analysis File):**

```markdown
## POC Simplification Opportunities

### Features to KEEP (Essential for POC)
1. ✅ Training file selection with basic metadata (FR1.1.1)
2. ✅ Three hyperparameter presets with cost estimates (FR1.1.2)
3. ✅ Spot vs On-Demand GPU toggle (FR1.1.3)
4. ✅ Real-time cost estimation panel (FR1.2.1)
5. ✅ Basic budget validation (FR1.2.2 - simplified)
6. ✅ Job name and basic metadata (FR1.3.1 - simplified)
7. ✅ Final review and start (FR1.3.2 - simplified)

### Features to SIMPLIFY (Reduce Complexity)
1. 🔽 **Metadata Display (FR1.1.1):**
   - REMOVE: Scaffolding distribution preview, human review stats
   - KEEP: File name, conversation count, basic quality score
2. 🔽 **Preset Details (FR1.1.2):**
   - REMOVE: Expandable technical parameters section
   - KEEP: Three preset cards with name, description, cost, success rate
3. 🔽 **Cost Breakdown (FR1.2.1):**
   - REMOVE: Expandable itemized breakdown, historical accuracy charts
   - KEEP: Total cost range, simple disclaimer
4. 🔽 **Budget Validation (FR1.2.2):**
   - REMOVE: Budget increase workflow, manager override, approval routing
   - KEEP: Simple over-budget error with adjustment suggestions
5. 🔽 **Job Metadata (FR1.3.1):**
   - REMOVE: Client/project assignment, custom tag creation, markdown notes
   - KEEP: Job name (auto-populated), simple description field
6. 🔽 **Review Modal (FR1.3.2):**
   - REMOVE: Comparison to previous jobs, template support
   - KEEP: Basic configuration summary, cost, confirmation checklist

### Features to REMOVE (Nice-to-Have)
1. ❌ Preview conversations modal (FR1.1.1)
2. ❌ Aggressive preset locked state (FR1.1.2)
3. ❌ Interactive tooltips on every parameter (FR1.1.2)
4. ❌ Historical accuracy metrics (FR1.2.1)
5. ❌ Forecast with active jobs (FR1.2.2)
6. ❌ Tag system and pills (FR1.3.1)
7. ❌ Conditional warnings section (FR1.3.2)

### Rationale
- **POC Goal:** Demonstrate core workflow (select dataset → configure → see cost → start job)
- **Essential:** Configuration inputs, cost transparency, validation, confirmation
- **Non-Essential:** Advanced features, detailed analytics, enterprise features
```

---

## PHASE 2: Integration Planning (Write to Analysis File)

### Step 2.1: Design Unified UX Flow

Create a single-page workflow that integrates all FRs:

**Output Format (in Analysis File):**

```markdown
## Unified UX Flow Design

### Single-Page Configuration Workflow

**Page Structure:**
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Create New Training Job                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ SECTION 1: Training File Selection (FR1.1.1)                    │
│ ┌─────────────────────────────────┐    ┌─────────────────────┐ │
│ │ [Searchable Dropdown]           │    │ SIDEBAR:            │ │
│ │ Select training file...         │    │ Cost Estimate       │ │
│ │                                 │    │ (FR1.2.1)           │ │
│ │ [Metadata Panel on Selection]   │    │                     │ │
│ └─────────────────────────────────┘    │ Duration: --        │ │
│                                         │ Cost: --            │ │
│ SECTION 2: Hyperparameter Preset (FR1.1.2)                     │ │
│ ┌────────┐ ┌────────┐ ┌────────┐       │ ±15% variance       │ │
│ │Conservative│Balanced│Aggressive│      │                     │ │
│ │  $25-30 │  $50-60 │  $80-100 │       │ Budget Status       │ │
│ └────────┘ └────────┘ └────────┘       │ (FR1.2.2)           │ │
│                                         │ ✓ Within Budget     │ │
│ SECTION 3: GPU Selection (FR1.1.3)     │ Remaining: $200     │ │
│ ◉ Spot Instance ($2.49/hr) - Save 70%  └─────────────────────┘ │
│ ○ On-Demand ($7.99/hr) - Guaranteed                            │
│                                                                  │
│ SECTION 4: Job Metadata (FR1.3.1 - SIMPLIFIED)                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Job Name: [Auto-populated, editable]                     │   │
│ │ Description: [Optional 500 char textarea]                │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [Review & Start Training] ← FR1.3.2 triggers review modal       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

### User Interaction Flow
1. **Initial Load:**
   - Page loads with all sections empty/default
   - Cost sidebar shows "--" (waiting for selections)
   - "Review & Start" button disabled

2. **Select Training File (FR1.1.1):**
   - User searches/selects from dropdown
   - Metadata panel appears below dropdown
   - Cost sidebar initializes with estimate
   - Balanced preset auto-selected based on conversation count

3. **Change Preset (FR1.1.2):**
   - User clicks different preset card
   - Selected card highlights (blue border)
   - Cost sidebar updates within 500ms
   - Job name updates with new preset name

4. **Toggle GPU Type (FR1.1.3):**
   - User switches spot/on-demand
   - Cost sidebar recalculates immediately
   - Budget validation re-runs
   - If over budget, error appears in sidebar

5. **Add Metadata (FR1.3.1):**
   - User edits auto-generated job name
   - User adds optional description
   - "Review & Start" button enables when all required fields valid

6. **Review & Start (FR1.3.2):**
   - User clicks button
   - Full-screen modal appears with summary
   - User checks confirmation boxes
   - "Start Training" button enables
   - Click starts job, redirects to job details page

### State Management
```typescript
// Unified configuration state
{
  trainingFileId: null,          // FR1.1.1
  trainingFileName: '',          // FR1.1.1
  conversationCount: 0,          // FR1.1.1
  preset: 'balanced',            // FR1.1.2
  gpuPricingTier: 'spot',        // FR1.1.3
  hourlyRate: 2.49,              // FR1.1.3
  estimatedCostMin: 0,           // FR1.2.1 (calculated)
  estimatedCostMax: 0,           // FR1.2.1 (calculated)
  budgetRemaining: 500,          // FR1.2.2 (from backend)
  budgetValidationPassed: true,  // FR1.2.2 (computed)
  jobName: '',                   // FR1.3.1
  description: '',               // FR1.3.1
}
```
```

### Step 2.2: Define Component Relationships

Map how components interact:

**Output Format (in Analysis File):**

```markdown
## Component Interaction Map

### Primary Components & Their Triggers

#### 1. TrainingFileDropdown (FR1.1.1)
**onChange → Triggers:**
- MetadataPanel.show()
- CostEstimationPanel.calculate(conversationCount)
- PresetSelector.setDefault(conversationCount)
- JobNameField.autoPopulate(fileName, preset, date)

#### 2. PresetSelector (FR1.1.2)
**onChange → Triggers:**
- CostEstimationPanel.recalculate(preset)
- JobNameField.updatePreset(preset)

#### 3. GPUToggle (FR1.1.3)
**onChange → Triggers:**
- CostEstimationPanel.recalculate(gpuType)
- BudgetValidator.validate(newCost, remaining)

#### 4. CostEstimationPanel (FR1.2.1)
**Reactive Component (updates when):**
- TrainingFileDropdown changes
- PresetSelector changes
- GPUToggle changes
**Computation:**
- duration = (conversationCount × trainingPairs × epochs × secondsPerPair[preset]) / 3600
- cost = duration × hourlyRate[gpuType]
- Updates within 500ms (debounced)

#### 5. BudgetValidator (FR1.2.2)
**Reactive Component (validates when):**
- CostEstimationPanel updates
**Logic:**
- IF estimatedCost > budgetRemaining THEN show error
- ELSE clear error
**Actions:**
- Disables "Review & Start" if over budget
- Shows inline error with suggestions

#### 6. JobMetadataFields (FR1.3.1)
**Auto-Population (when):**
- TrainingFileDropdown selected → populate name
- PresetSelector changed → update name with preset
**Format:**
- "{trainingFileName} - {preset} - {YYYY-MM-DD}"

#### 7. ReviewModal (FR1.3.2)
**Triggered by:**
- "Review & Start" button click
**Displays:**
- All selections from FR1.1.1, FR1.1.2, FR1.1.3
- Cost estimate from FR1.2.1
- Budget impact from FR1.2.2
- Metadata from FR1.3.1
**Actions:**
- "Start Training" → Create job, redirect
- "Edit Configuration" → Close modal, return to form
- "Cancel" → Close modal, return to job list
```

---

## PHASE 3: POC Simplification (Write to Analysis File)

### Step 3.1: Simplified Feature List

Document the streamlined feature set:

**Output Format (in Analysis File):**

```markdown
## POC-Optimized Feature Set

### What We're Building (Essential Only)

#### Page 1: Main Configuration Form
**Training File Selection (Simplified):**
- Searchable dropdown (5 most recent files)
- Simple metadata: name, conversation count, quality score (1 number)
- No scaffolding preview, no human review stats

**Preset Selection (Simplified):**
- Three cards: Conservative, Balanced, Aggressive
- Each card shows: Name, 1-line description, cost estimate, success rate
- No expandable parameters, no locked states

**GPU Selection (Simplified):**
- Simple toggle: Spot / On-Demand
- Show: Price per hour, savings percentage
- No interruption history charts, no provisioning time

**Sidebar - Cost Estimate (Simplified):**
- Duration range (12-15 hours)
- Cost range ($50-60)
- Simple disclaimer (±15%)
- Budget status (✓ Within Budget / ❌ Over Budget)

**Job Metadata (Simplified):**
- Auto-populated job name (editable)
- Description field (optional, 500 chars)
- No tags, no client/project linking

**Review & Start Button:**
- Enabled when valid
- Opens review modal

#### Page 2: Review Modal (Simplified)
**Summary Cards:**
- Training File: name, conversation count
- Preset: name, key parameters (3-4 values)
- GPU: type, hourly rate
- Cost: total estimate range
- Budget: current spend, this job cost, remaining

**Confirmation:**
- 2 checkboxes (not 3):
  1. "I have reviewed the configuration"
  2. "I understand the estimated cost ($XX-YY)"

**Actions:**
- "Start Training" (green, prominent)
- "Edit Configuration" (secondary)
- "Cancel" (tertiary)

### What We're NOT Building (Removed for POC)
❌ Preview conversations modal
❌ Expandable technical parameters
❌ Interactive tooltips on all fields
❌ Historical accuracy charts
❌ Budget increase workflow
❌ Manager override system
❌ Tag system with pills
❌ Client/project assignment
❌ Markdown notes editor
❌ Comparison to previous jobs
❌ Template support
❌ Conditional warnings section
❌ Spot availability warnings
❌ Advanced cost breakdowns
```

### Step 3.2: Page Count Reduction

**Output Format (in Analysis File):**

```markdown
## Page Count Optimization

### Original Total: 34 pages across 7 FRs
- FR1.1.1: 5 pages
- FR1.1.2: 5 pages
- FR1.1.3: 5 pages
- FR1.2.1: 6 pages
- FR1.2.2: 4 pages
- FR1.3.1: 4 pages
- FR1.3.2: 5 pages

### Combined & Simplified: 12 pages
1. **Configuration Form - Empty State** (1 page)
   - All sections visible but empty
2. **Configuration Form - File Selected** (1 page)
   - Dropdown selected, metadata shown, cost estimate appears
3. **Configuration Form - Preset Selected** (1 page)
   - Preset highlighted, cost updated
4. **Configuration Form - GPU Changed** (1 page)
   - Toggle to on-demand, cost recalculates
5. **Configuration Form - Metadata Added** (1 page)
   - Job name and description filled
6. **Configuration Form - Complete** (1 page)
   - All fields valid, ready to review
7. **Budget Over Error State** (1 page)
   - Cost exceeds budget, error shown, button disabled
8. **Review Modal - Initial** (1 page)
   - Modal open, summary displayed, checkboxes unchecked
9. **Review Modal - Checkboxes Checked** (1 page)
   - User checked boxes, Start button enabled
10. **Mobile Layout - Configuration** (1 page)
    - Responsive layout for mobile
11. **Mobile Layout - Review Modal** (1 page)
    - Modal adapted for mobile
12. **Error States Collection** (1 page)
    - Various error scenarios (file load failed, validation errors, etc.)

### Reduction Strategy
- Consolidated related states onto single pages
- Combined similar flows (e.g., all cost updates shown via animation on one page)
- Removed duplicate state demonstrations
- Simplified error handling to general patterns
```

---

## PHASE 4: Combined Prompt Generation

### CRITICAL: Write Final Output to Specified File

**YOU MUST WRITE THE FINAL COMBINED FIGMA PROMPT TO:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md`

This is the file path where the final, ready-to-use Figma Make AI prompt should be written. Do NOT write to any other location.

### Final Output Format

Write the following content to: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md`

```markdown
# LoRA Pipeline - Stage 7 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 7 — Cost Management & Budget Control  
**Section ID:** E07  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E07.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E07-analysis_v1.md

---

## Prompt for Figma Make AI

**Title:** Stage 7 — Cost Management & Budget Control - Complete Integrated Wireframe System

**Context Summary**

[2-4 sentences describing the overall stage purpose, combining context from all FRs]

This stage enables users to [primary goal from FR1.1.x], with real-time [feedback from FR1.2.x], validation [from FR1.2.2], and [documentation from FR1.3.1], culminating in a [review process from FR1.3.2]. The interface prioritizes simplicity and proof-of-concept speed while maintaining core functionality for [key user value].

**Journey Integration**

- **Stage 7 User Goals:** [Combined goals from all FRs]
- **Key Emotions:** [Combined emotional journey from all FRs]
- **Progressive Disclosure:** 
  * Basic: [Simplified disclosure level 1]
  * Advanced: [Simplified disclosure level 2]
  * Expert: [Simplified disclosure level 3]
- **Persona Adaptations:** [Unified interface serving all personas from all FRs]

**Wireframe Goals**

[Bulleted goals combining objectives from all FRs, deduplicated and prioritized]

- Enable [goal from FR1.1.x]
- Provide [goal from FR1.2.x]
- Validate [goal from FR1.2.2]
- Document [goal from FR1.3.1]
- Confirm [goal from FR1.3.2]

**Explicit UI Requirements**

[Consolidated UI requirements from all FRs, organized by page section]

**SECTION 1: Training File Selection (FR1.1.1 - Simplified)**
- Searchable dropdown with training files (top 10 most recent)
- Display: File name, Conversation count, Quality score (single 0-5 rating)
- On selection: Simple metadata panel appears showing above details
- Validation: File must have ≥50 conversations
- States: Empty, Loading, Loaded, Selected, Error

**SECTION 2: Hyperparameter Preset Selection (FR1.1.2 - Simplified)**
- Three radio cards horizontally aligned
- **Conservative Card:** Name, "Best for first runs", Cost estimate "$25-30", Success rate "98%"
- **Balanced Card:** Name, "Production ready", Cost estimate "$50-60", Success rate "96%", DEFAULT SELECTED
- **Aggressive Card:** Name, "Maximum quality", Cost estimate "$80-100", Success rate "92%"
- Selection: Blue border on selected card, gray on others
- States: Default (Balanced selected), Conservative selected, Aggressive selected

**SECTION 3: GPU Type Selection (FR1.1.3 - Simplified)**
- Toggle control: Spot Instance / On-Demand Instance
- **Spot:** "$2.49/hr", "Save 70%" badge (green)
- **On-Demand:** "$7.99/hr", "Guaranteed" badge (blue)
- Default: Spot selected
- States: Spot selected, On-Demand selected

**SECTION 4: Cost Estimation Sidebar (FR1.2.1 - Simplified)**
- Fixed sidebar (desktop) or card below inputs (mobile)
- Title: "Cost Estimate" with real-time indicator
- Display: "Duration: 12-15 hours", "Cost: $50-60 (spot)", "±15% variance"
- Updates within 500ms when configuration changes
- Shows delta on change: "↓ $20 saved" or "↑ $30 increase" with animation
- States: Initial (--), Calculated, Updating (animated transition)

**SECTION 5: Budget Validation (FR1.2.2 - Simplified)**
- Inline status in cost sidebar
- ✓ "Within Budget - $200 remaining" (green) when valid
- ❌ "Over Budget - Exceeds remaining by $50" (red) when invalid
- When invalid: "Review & Start" button disabled, show suggestions: "Try Conservative preset to save $XX"
- States: Within budget, Over budget

**SECTION 6: Job Metadata (FR1.3.1 - Simplified)**
- Job Name field (required): Auto-populated as "{trainingFileName} - {preset} - {YYYY-MM-DD}", editable
- Description field (optional): Textarea, 500 character limit, placeholder: "Purpose of this training run (optional)"
- Character counter below each field
- States: Auto-populated, User edited

**SECTION 7: Review & Start Button (FR1.3.2 Trigger)**
- Large blue button: "Review & Start Training"
- Enabled when: training file selected, preset selected, GPU selected, job name valid, budget valid
- Disabled when: any required field missing or budget exceeded
- States: Disabled (gray), Enabled (blue), Loading (spinner)

**MODAL: Review & Start Confirmation (FR1.3.2 - Simplified)**
- Full-screen overlay (dims background)
- Header: "Review Training Configuration" with estimated cost prominent
- **Training File Card:** Name, conversation count
- **Configuration Card:** Preset name, 3 key parameters (e.g., "Rank: 16, Epochs: 3, Learning Rate: 0.0002"), GPU type and rate
- **Cost Card:** Duration range, Cost range, Budget impact ("$387 used + $52 this job = $439 of $500")
- **Confirmation Checklist:**
  - [ ] "I have reviewed the configuration above"
  - [ ] "I understand the estimated cost ($50-60)"
- **Actions:**
  - "Start Training" button (green, prominent) - disabled until both checkboxes checked
  - "Edit Configuration" button (secondary)
  - "Cancel" button (tertiary)

**Interactions and Flows**

[Combined interaction flows from all FRs, showing the complete user journey]

1. **Initial Page Load:**
   - User navigates to "Create Training Job"
   - All sections visible but empty/default
   - Cost sidebar shows "--"
   - "Review & Start" button disabled

2. **Select Training File:**
   - User types in search box
   - Dropdown filters files in real-time
   - User clicks file
   - Metadata panel appears (300ms animation)
   - Cost sidebar initializes: "12-15 hours, $50-60"
   - Balanced preset auto-selected
   - Job name auto-populates: "Elena Morales Financial - Balanced - 2025-12-18"

3. **Change Preset:**
   - User clicks Aggressive card
   - Card border turns blue, others gray
   - Cost sidebar updates (500ms): "$50-60" → "$80-100" with "↑ $30 increase" delta
   - Job name updates: "... - Aggressive - ..."

4. **Toggle GPU Type:**
   - User clicks On-Demand
   - Toggle switches
   - Cost sidebar recalculates: "$80-100" → "$200-240" with "↑ $120 increase" delta
   - Budget validation runs
   - IF over budget: Error appears, "Review & Start" button disables

5. **Add Description (Optional):**
   - User types in description field
   - Character counter updates in real-time
   - Validation checks length ≤500 characters

6. **Review & Start:**
   - User clicks "Review & Start Training" button
   - Full-screen modal appears (fade-in animation)
   - All configuration displayed in summary cards
   - Checkboxes unchecked, "Start Training" button disabled

7. **Confirm & Start:**
   - User checks both checkboxes
   - "Start Training" button enables
   - User clicks "Start Training"
   - Loading spinner appears
   - Job created in database
   - Redirect to job details page

8. **Budget Error Flow:**
   - User selects expensive configuration
   - Cost exceeds budget
   - Error appears in sidebar: "❌ Over Budget - Exceeds by $50"
   - Suggestions shown: "Try Conservative preset (-$50), Use Spot instead (-$120)"
   - "Review & Start" button disabled
   - User adjusts configuration
   - Error clears when within budget

**Visual Feedback**

[Combined visual feedback from all FRs]

- **Selection States:** Blue borders for selected, gray for unselected, hover brightens
- **Cost Updates:** Animated number transitions, delta badges with color (green=savings, red=increase)
- **Budget Validation:** ✓ green checkmark when valid, ❌ red X when invalid
- **Loading States:** Skeleton loaders for dropdown, spinner for button, shimmer for cost panel
- **Success Indicators:** Brief green flash on successful selection
- **Animations:** 300ms fade-ins for panels, 500ms number transitions for costs, smooth slide-in for modals

**Accessibility Guidance**

[Combined accessibility requirements from all FRs]

- All form controls keyboard navigable (Tab, Enter, Arrow keys, Escape)
- Dropdown: Arrow keys navigate, Enter selects, Escape closes
- Radio cards: Arrow keys switch selection, Space/Enter selects
- Toggle: Space/Enter switches
- Modal: Focus trap (Tab cycles within modal), Escape to close
- ARIA labels on all interactive elements: aria-label, aria-describedby, aria-live
- Screen reader announcements: "File selected", "Cost updated to $50-60", "Budget validation passed"
- Color contrast: 4.5:1 minimum for all text
- Focus indicators: Blue outline visible on keyboard navigation
- Error messages: role="alert" for screen reader announcements

**Information Architecture**

[Unified page structure combining all FRs]

**Main Configuration Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Create New Training Job                             │
├─────────────────────────────────────────────────────────────┤
│ MAIN CONTENT (2/3 width)        │ SIDEBAR (1/3 width)       │
│                                  │                           │
│ Training File Selection          │ Cost Estimate Panel       │
│ [Searchable Dropdown]            │ Duration: 12-15 hours     │
│ [Metadata Panel]                 │ Cost: $50-60              │
│                                  │ ±15% variance             │
│ Hyperparameter Preset            │                           │
│ [Conservative] [Balanced] [Aggressive]                      │
│                                  │ Budget Status             │
│ GPU Selection                    │ ✓ Within Budget           │
│ ◉ Spot  ○ On-Demand             │ Remaining: $200           │
│                                  │                           │
│ Job Metadata                     │                           │
│ Name: [Auto-populated]           │                           │
│ Description: [Optional]          │                           │
│                                  │                           │
│ [Review & Start Training]        │                           │
└─────────────────────────────────────────────────────────────┘
```

**Component Hierarchy:**
- ConfigurationPage (parent)
  - HeaderSection
  - MainContent
    - TrainingFileSelector
      - SearchableDropdown
      - MetadataPanel
    - PresetSelector
      - PresetCard × 3 (Conservative, Balanced, Aggressive)
    - GPUSelector
      - ToggleControl
    - JobMetadata
      - NameField
      - DescriptionField
    - ReviewButton
  - Sidebar
    - CostEstimationPanel
      - DurationDisplay
      - CostDisplay
      - VarianceDisclaimer
    - BudgetValidationPanel
      - StatusIndicator
      - RemainingBudget
      - ErrorMessage (conditional)
  - ReviewModal (conditional)
    - ModalOverlay
    - ModalContent
      - SummaryCards × 3
      - ConfirmationChecklist
      - ActionButtons

**Page Plan**

[Simplified page count with clear rationale]

**Total Wireframe Pages: 12**

1. **Configuration Form - Initial Empty State**
   - Purpose: Show starting point with all sections visible but empty
   - Key Elements: All form sections, disabled button, empty cost panel
   - States: Empty, awaiting user input

2. **Configuration Form - File Selected**
   - Purpose: Show immediate feedback after training file selection
   - Key Elements: Dropdown selected, metadata panel expanded, cost estimate initialized, balanced preset auto-selected
   - States: File selected, initial configuration set

3. **Configuration Form - Preset Changed**
   - Purpose: Demonstrate preset selection and cost update
   - Key Elements: Aggressive preset selected, cost updated to $80-100, delta showing increase
   - States: Alternative preset selected, cost recalculated

4. **Configuration Form - GPU Toggled**
   - Purpose: Show GPU type switching and major cost change
   - Key Elements: On-Demand selected, cost updated to $200-240, delta showing large increase
   - States: Premium GPU selected, cost significantly higher

5. **Configuration Form - Metadata Added**
   - Purpose: Show optional metadata completion
   - Key Elements: Job name edited, description added, character counters visible
   - States: Metadata customized, ready to review

6. **Configuration Form - Complete Valid**
   - Purpose: Show ready-to-submit state with all valid
   - Key Elements: All fields filled, cost within budget, "Review & Start" button enabled (blue)
   - States: Valid configuration, can proceed

7. **Configuration Form - Budget Exceeded**
   - Purpose: Show error state when cost exceeds budget
   - Key Elements: Budget error in sidebar, suggestions displayed, "Review & Start" button disabled (gray)
   - States: Invalid due to budget, blocked from proceeding

8. **Review Modal - Initial Display**
   - Purpose: Show full-screen review with all configuration summarized
   - Key Elements: Modal overlay, summary cards for file/config/cost, checkboxes unchecked, "Start Training" button disabled
   - States: Modal open, awaiting confirmation

9. **Review Modal - Checkboxes Checked**
   - Purpose: Show ready-to-start state with confirmation complete
   - Key Elements: Both checkboxes checked, "Start Training" button enabled (green), all summary visible
   - States: Confirmed, can start job

10. **Review Modal - Edit Configuration Action**
    - Purpose: Show user returning to edit from review
    - Key Elements: Modal closing animation, returning to configuration form with all settings preserved
    - States: Modal closing, settings maintained

11. **Mobile Layout - Configuration Form**
    - Purpose: Show responsive layout for mobile devices
    - Key Elements: Stacked sections, cost panel below main content, vertical preset cards, simplified metadata
    - States: Mobile viewport, single column layout

12. **Mobile Layout - Review Modal**
    - Purpose: Show review modal adapted for mobile
    - Key Elements: Full-screen mobile modal, scrollable summary cards, fixed action buttons at bottom
    - States: Mobile review, touch-optimized

**Annotations (Mandatory)**

[Instructions for annotating the Figma wireframes]

Attach notes to UI elements in Figma citing:
1. **Which FR(s)** the element fulfills (e.g., "FR1.1.1 AC3: Quality score indicator")
2. **Acceptance criteria number** it maps to
3. **State variations** this element has

Include a **"Mapping Table"** frame in Figma with columns:
- **Criterion** (text of acceptance criterion)
- **Source** (FR number)
- **Screen(s)** (which wireframe page)
- **Component(s)** (UI element name)
- **State(s)** (loading, error, success, etc.)
- **Notes** (implementation details)

**Example annotations:**
- Searchable Dropdown: "FR1.1.1 AC2: Search/filter training files by name, count, quality"
- Balanced Preset Card: "FR1.1.2 AC5: Balanced preset with r=16, lr=2e-4, epochs=3, cost $50-60, 96% success rate, DEFAULT SELECTION"
- Cost Estimation Panel: "FR1.2.1 AC1: Real-time cost estimate updates within 500ms of configuration changes"
- Budget Status Indicator: "FR1.2.2 AC4: Budget validation passes when estimated cost < remaining budget"

**Acceptance Criteria → UI Component Mapping**

[Comprehensive mapping table combining all FRs, deduplicated]

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Training files dropdown with search/filter | FR1.1.1 AC1 | Pages 1-7 | SearchableDropdown | Empty, Loading, Loaded, Selected | Shows top 10 recent files, searches by name |
| Display file name, conversation count, training pairs | FR1.1.1 AC1 | Pages 2-7 | MetadataPanel | Display | Appears on selection |
| Quality score visual indicator | FR1.1.1 AC3 | Pages 2-7 | QualityBadge | Display | Single score 0-5 with color |
| Create Training Job button opens config | FR1.1.1 AC3 | N/A | N/A | N/A | Removed - we ARE the config page |
| Form validation ensures ≥50 conversations | FR1.1.1 AC5 | Page 7 | ValidationError | Error | Shows if file has <50 conversations |
| Three preset options as radio cards | FR1.1.2 AC1 | Pages 1-7 | PresetCard × 3 | Default, Selected | Conservative, Balanced, Aggressive |
| Conservative: r=8, lr=1e-4, epochs=2, $25-30, 98% | FR1.1.2 AC4 | Pages 1-7 | PresetCard | Display | Simplified - shows key info only |
| Balanced: r=16, lr=2e-4, epochs=3, $50-60, 96% | FR1.1.2 AC5 | Pages 1-7 | PresetCard | Default Selected | Middle option, auto-selected |
| Aggressive: r=32, lr=3e-4, epochs=4, $80-100, 92% | FR1.1.2 AC6 | Pages 3,7 | PresetCard | Selectable | Advanced option, no lock for POC |
| Default selection: Balanced | FR1.1.2 AC6 | Pages 1-2 | PresetCard | Default | Based on conversation count |
| GPU toggle: Spot vs On-Demand | FR1.1.3 AC1 | Pages 1-7 | ToggleControl | Spot, On-Demand | Two-option toggle |
| Spot: $2.49/hr, Save 70%, interruption risk | FR1.1.3 AC1 | Pages 1-3,5-7 | GPUOptionCard | Display | Default option |
| On-Demand: $7.99/hr, Guaranteed | FR1.1.3 AC1 | Page 4 | GPUOptionCard | Display | Premium option |
| Real-time cost updates when config changes | FR1.1.3 AC3, FR1.2.1 AC1 | Pages 2-7 | CostEstimationPanel | Updating | Within 500ms, debounced |
| Cost estimation panel always visible | FR1.2.1 AC1 | Pages 1-12 | CostEstimationPanel (Sidebar) | Always Visible | Fixed sidebar (desktop) or card (mobile) |
| Display duration range and cost range | FR1.2.1 AC1 | Pages 2-7 | CostDisplay | Display | "12-15 hours, $50-60" |
| Accuracy disclaimer ±15% | FR1.2.1 AC1 | Pages 2-7 | DisclaimerText | Display | Based on historical data |
| Cost breakdown (GPU, spot buffer, storage) | FR1.2.1 AC1 | N/A | N/A | N/A | Removed for POC - show total only |
| Warning if cost exceeds $100 | FR1.2.1 AC1 | Page 4,7 | WarningBadge | Display | Yellow/orange indicator |
| Budget validation: remaining = limit - spent | FR1.2.2 AC1 | Pages 1-7 | BudgetValidator | Checking | Server-side calculation |
| Block job creation if cost > remaining | FR1.2.2 AC2 | Page 7 | ErrorMessage + DisabledButton | Blocked | "Review & Start" disabled |
| Budget exceeded error message with suggestions | FR1.2.2 AC2 | Page 7 | ErrorMessage | Display | Shows shortfall, suggests alternatives |
| Job name auto-populated | FR1.3.1 AC1 | Pages 2-12 | JobNameField | Auto-Populated | "{fileName} - {preset} - {date}" |
| Description field optional, 500 char limit | FR1.3.1 AC2 | Pages 5-12 | DescriptionField | Optional | Textarea with counter |
| Review & Start button opens modal | FR1.3.2 AC1 | Pages 6-12 | ReviewButton → ReviewModal | Enabled, Opens | Triggers full-screen modal |
| Modal displays complete configuration summary | FR1.3.2 AC2 | Pages 8-10 | ReviewModal | Display | Training file, config, cost, budget |
| Confirmation checklist with 2 checkboxes | FR1.3.2 AC2 | Pages 8-9 | ConfirmationChecklist | Unchecked, Checked | Simplified from 3 to 2 |
| Start Training button disabled until confirmed | FR1.3.2 AC2 | Pages 8-9 | StartButton | Disabled, Enabled | Requires both checkboxes |
| Edit Configuration returns to form | FR1.3.2 AC2 | Page 10 | EditButton | Action | Closes modal, preserves settings |

**Non-UI Acceptance Criteria**

[Backend requirements that don't have direct UI but may affect it]

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| System queries training_files table WHERE status='active' AND conversation_count >= 50 | Database query determines available files | UI receives filtered list from backend API |
| System validates file paths exist in storage | Backend check before job creation | UI shows storage status indicator if failed |
| System calculates duration: (conv_count × pairs × epochs × seconds_per_pair[preset]) / 3600 | Backend provides calculation | UI displays result in cost panel |
| System calculates cost: duration × hourly_rate[gpu_type] | Backend calculation | UI displays result, recalculates on changes |
| System stores job record with status='queued' | Database INSERT operation | UI shows loading spinner during creation |
| System redirects to /training-jobs/{job_id} after creation | Routing after successful job creation | UI navigates to job details page |
| Budget validation query: SELECT monthly_budget_limit, SUM(actual_cost) FROM... | Backend query for budget check | UI receives validation result (pass/fail) |
| Job name uniqueness check | Backend query for duplicates | UI shows warning (not error) if duplicate found |

**Estimated Total Page Count**

**12 wireframe pages** covering:
1. Configuration form empty state
2. Configuration with file selected
3. Configuration with preset changed
4. Configuration with GPU toggled
5. Configuration with metadata added
6. Configuration complete and valid
7. Configuration with budget exceeded error
8. Review modal initial display
9. Review modal with checkboxes checked
10. Review modal edit action
11. Mobile responsive layout - configuration
12. Mobile responsive layout - review modal

**Rationale:**
- Demonstrates complete user flow from empty → configured → reviewed → started
- Shows all key state changes (selections, updates, errors, validations)
- Covers both desktop and mobile layouts
- Includes primary success path and key error scenario
- Consolidates multiple individual FR pages into integrated workflow
- Removes redundant state demonstrations from original 34 pages
- Maintains all essential functionality while optimizing for POC speed

---

## Final Notes for Figma Implementation

**Integration Requirements:**
- All components on the main configuration page must be functional together
- Changing any input in Group 1 (file, preset, GPU) must update Group 2 (cost panel) in real-time
- Budget validation must react to cost changes and block/unblock the review button
- Job name must auto-update when file or preset changes
- Review modal must accurately summarize all selections from the main page

**POC Simplifications Applied:**
- Removed: Preview modals, expandable sections, advanced tooltips, tag systems, client/project linking
- Simplified: Metadata display, preset details, cost breakdowns, budget workflows
- Maintained: Core configuration flow, real-time cost updates, budget validation, review confirmation

**State Management:**
- Single source of truth for configuration state
- Reactive updates across all components
- Debounced recalculations (500ms) for cost estimates
- Validation runs on every relevant state change

**Accessibility:**
- Full keyboard navigation support
- Screen reader friendly with ARIA labels and live regions
- High contrast colors and focus indicators
- Mobile-responsive design

**Success Criteria:**
A user should be able to:
1. Select a training file and see its details
2. Choose a preset and see cost impact
3. Toggle GPU type and see cost change
4. Add optional metadata
5. Review complete configuration summary
6. Confirm and start training job

All within a single, intuitive workflow that feels cohesive and integrated.

```

---

## Usage Instructions for Script

This template expects the script to:

1. **Read the input wireframe output file** at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md`
2. **Extract all FR prompts** (between `=== BEGIN PROMPT FR:` and `=== END PROMPT FR:` markers)
3. **Read source documents** for context (overview, user stories, journey, functional requirements)
4. **Process through 4 phases:**
   - Phase 1: Write analysis to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E07-analysis_v1.md`
   - Phase 2: Continue analysis with integration planning
   - Phase 3: Document simplifications
   - Phase 4: Write final combined prompt to `[COMBINED_OUTPUT_FILE_PATH]`
5. **Replace all placeholders** with actual values:
   - `7` → e.g., "01"
   - `Stage 7 — Cost Management & Budget Control` → e.g., "Training Job Configuration & Setup"
   - `E07` → e.g., "E01"
   - `pipeline` → e.g., "pipeline"
   - `LoRA Pipeline` → e.g., "LoRA Training Pipeline"
   - `2025-12-19` → Current date
   - All file paths with FULL ABSOLUTE PATHS

**Placeholder Format for Script:**
```javascript
const placeholders = {
  '7': '01',
  'Stage 7 — Cost Management & Budget Control': 'Training Job Configuration & Setup',
  'E07': 'E01',
  'pipeline': 'pipeline',
  'LoRA Pipeline': 'LoRA Training Pipeline',
  '2025-12-19': new Date().toISOString().split('T')[0],
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E07.md': absolutePath('...04-pipeline-FIGMA-wireframes-output-E01.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E07.md': absolutePath('...04-pipeline-FR-wireframes-E01.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md': absolutePath('...pipeline-04-pipeline-FIGMA-wireframes-combined-output-E01.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\01-pipeline-overview.md': absolutePath('...01-pipeline-overview.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02-pipeline-user-stories.md': absolutePath('...02-pipeline-user-stories.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\02b-pipeline-user-journey.md': absolutePath('...02b-pipeline-user-journey.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\03-pipeline-functional-requirements.md': absolutePath('...03-pipeline-functional-requirements.md'),
  'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E07-analysis_v1.md': absolutePath('...iteration-7-figma-combined-E01-analysis_v1.md'),
};
```

**Expected Outputs:**
1. **Analysis File:** Detailed breakdown of FRs, relationships, overlaps, simplifications (written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-7-figma-combined-E07-analysis_v1.md`)
2. **Final Combined FIGMA Prompt File:** Single Figma-ready prompt for the entire stage (written to `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\pipeline-04-pipeline-FIGMA-wireframes-combined-output-E07.md`)

---

**Version:** 1.0  
**Date:** December 18, 2025  
**Generator Type:** Combined Multi-FR Wireframe Prompt Template  
**Target:** Figma Make AI  
**Optimization:** Proof-of-Concept (Essential Features Only)
