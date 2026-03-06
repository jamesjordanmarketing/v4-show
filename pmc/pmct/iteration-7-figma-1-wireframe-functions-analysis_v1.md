# FR Group Relationship Analysis: Stage 1 Configuration Features
**Version:** 1.0  
**Date:** December 18, 2025  
**Analysis Type:** Functional Requirements Relationship & UI/UX Flow Analysis  
**Source Documents:**
- `04-pipeline-FIGMA-wireframes-output-E01.md` (Wireframe specifications)
- `04-pipeline-FR-wireframes-E01.md` (Functional Requirements acceptance criteria)

---

## Executive Summary

**Question:** How do FR1.2.1, FR1.2.2, and FR1.3.1 relate to FR1.1.1, FR1.1.2, and FR1.1.3?

**Answer:** They are **COMPLEMENTARY FEATURES** that operate together on the same training job configuration page/workflow. Group 1 (FR1.1.x) provides the **primary configuration inputs** that the user actively selects to define their training job. Group 2 (FR1.2.x and FR1.3.1) provides **supporting features** that react to those inputs, validate constraints, and capture additional context.

**Key Insight:** These are NOT duplicated functionality. They work together in a coordinated user flow where Group 1 features drive the configuration, and Group 2 features provide real-time feedback, validation, and documentation capabilities.

---

## Detailed Analysis

### Group 1: Primary Configuration Inputs (FR1.1.x)

These features represent the **core decisions** a user must make to configure a training job:

#### FR1.1.1: Create Training Job from Training File
- **Functionality:** Select which training dataset to use
- **UI Component:** Searchable dropdown with training files
- **User Action:** Browse and select a training file (e.g., "Elena Morales Financial - 242 conversations")
- **Output:** `training_file_id` selected, metadata displayed
- **Page Location:** Top of configuration form, first step

#### FR1.1.2: Select Hyperparameter Preset
- **Functionality:** Choose training intensity/quality level
- **UI Component:** Three radio cards (Conservative/Balanced/Aggressive)
- **User Action:** Click one of three preset options
- **Output:** `preset` selected, hyperparameters defined (r, lr, epochs, batch_size, etc.)
- **Page Location:** Middle of configuration form, second step

#### FR1.1.3: Select GPU Type with Cost Comparison
- **Functionality:** Choose GPU pricing tier (cost vs reliability trade-off)
- **UI Component:** Toggle between Spot and On-Demand
- **User Action:** Select Spot ($2.49/hr, 70% savings, interruption risk) or On-Demand ($7.99/hr, guaranteed)
- **Output:** `gpu_pricing_tier` selected, `hourly_rate` defined
- **Page Location:** Middle of configuration form, third step

**Summary:** These three FRs capture the **essential technical configuration** that defines what will be trained, how aggressively, and on what hardware.

---

### Group 2: Supporting Features (FR1.2.x + FR1.3.1)

These features **enhance the configuration process** by providing real-time feedback, validation, and documentation:

#### FR1.2.1: Real-Time Cost Estimation
- **Functionality:** Calculate and display cost forecasts dynamically as user makes configuration choices
- **UI Component:** Fixed sidebar or prominent card (always visible)
- **Relationship to Group 1:** 
  - **REACTS TO** FR1.1.1 (dataset size affects duration/cost)
  - **REACTS TO** FR1.1.2 (preset affects duration: Conservative 120s/pair, Aggressive 300s/pair)
  - **REACTS TO** FR1.1.3 (GPU type affects cost: $2.49 vs $7.99/hr)
- **User Value:** See cost impact of each configuration decision in real-time (within 500ms)
- **Output:** `estimated_duration_hours`, `estimated_cost_min`, `estimated_cost_max`
- **Page Location:** Sidebar or floating card, updates dynamically

**Example Flow:**
1. User selects training file (242 conversations) → Cost panel shows initial estimate
2. User changes preset from Balanced to Aggressive → Cost updates from "$50-60" to "$80-100" with delta "↑ $30 increase"
3. User toggles GPU from Spot to On-Demand → Cost updates from "$80-100" to "$200-240" with delta "↑ $120 increase"

#### FR1.2.2: Pre-Job Budget Validation
- **Functionality:** Enforce monthly budget limits and prevent overspending
- **UI Component:** Budget warnings/errors (conditional display based on validation)
- **Relationship to Group 1:** 
  - **VALIDATES AGAINST** FR1.2.1's cost estimate
  - **BLOCKS** job creation if estimate exceeds remaining budget
  - **SUGGESTS CHANGES** to Group 1 selections (e.g., "Switch to Conservative preset to save $XX")
- **User Value:** Prevent accidental budget overages, get approval workflows if needed
- **Output:** `budget_validation_passed` (boolean), `budget_warnings` (array)
- **Page Location:** Inline warnings/errors near cost estimate, modal for budget exceeded error

**Example Flow:**
1. User configures expensive job (estimated $150)
2. System checks: monthly_budget_remaining = $500 - $400 = $100
3. Validation fails: $150 > $100
4. Error modal displays: "❌ Budget Exceeded - Estimated Cost: $150, Remaining Budget: $100, Shortfall: $50"
5. User options: "Reduce Job Cost" (go back to FR1.1.2, select Conservative), "Increase Budget Limit", "Cancel"

#### FR1.3.1: Add Job Metadata & Documentation
- **Functionality:** Capture descriptive information about the training experiment
- **UI Component:** Form fields (name, description, notes, tags, client/project assignment)
- **Relationship to Group 1:** 
  - **AUTO-POPULATES** job name from FR1.1.1 and FR1.1.2 selections: "{training_file_name} - {preset_name} - {date}"
  - **DOCUMENTS** why user made specific Group 1 choices
  - **ENABLES** future searchability based on configuration choices
- **User Value:** Organize experiments, track client costs, find jobs later, preserve knowledge
- **Output:** `name`, `description`, `notes`, `tags`, `client_id`, `project_id`
- **Page Location:** Bottom of configuration form, before final review

**Example Flow:**
1. User completes Group 1 configuration (file: "Elena Morales", preset: "Balanced", GPU: "Spot")
2. Job name auto-populates: "Elena Morales Financial - Balanced - 2025-12-16"
3. User adds description: "First production model for Acme client"
4. User adds notes: "Testing balanced preset on high-empathy dataset. Expecting 40%+ EI improvement."
5. User adds tags: ["production", "client-delivery", "acme-financial"]
6. User links to: Client: "Acme Financial" → Project: "Q4 2025 Model Enhancement"

**Summary:** These three FRs provide **decision support, validation, and documentation** to ensure users make informed, budget-compliant, and well-documented configuration choices.

---

## Relationship Type: Complementary Features (NOT Duplicated)

### How They Work Together

The configuration workflow integrates all six FRs into a **single, cohesive user experience**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRAINING JOB CONFIGURATION PAGE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [FR1.1.1: Training File Selection]                              │
│  ┌─────────────────────────────────────┐    ┌────────────────┐  │
│  │ Select Training File:                │    │ FR1.2.1:       │  │
│  │ ▼ Elena Morales Financial           │    │ COST ESTIMATE  │  │
│  │   242 conversations, 1,567 pairs    │    │ Duration:      │  │
│  │   Quality: 4.5/5 ✓                  │    │ 12-15 hours    │  │
│  └─────────────────────────────────────┘    │                │  │
│                                              │ Cost Range:    │  │
│  [FR1.1.2: Hyperparameter Preset]           │ $50-60         │  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐      │ (spot)         │  │
│  │ Conserv │ │BALANCED │ │Aggressive│      │                │  │
│  │ $25-30  │ │ $50-60  │ │ $80-100  │      │ FR1.2.2:       │  │
│  └─────────┘ └─────────┘ └──────────┘      │ BUDGET STATUS  │  │
│       ↓ onChange triggers recalculation ─────→ ✓ Within      │  │
│                                              │   Budget       │  │
│  [FR1.1.3: GPU Selection]                   │ Remaining:     │  │
│  ◉ Spot Instance ($2.49/hr)                 │ $200           │  │
│  ○ On-Demand ($7.99/hr)                     └────────────────┘  │
│       ↓ onChange triggers recalculation                         │
│                                                                  │
│  [FR1.3.1: Job Metadata & Documentation]                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Job Name: Elena Morales Financial - Balanced - 2025-12-16│  │
│  │ Description: [First production model for Acme client]     │  │
│  │ Notes: [Testing balanced preset on high-empathy dataset...│  │
│  │ Tags: ☑ production ☑ client-delivery ☑ acme-financial   │  │
│  │ Client/Project: Acme Financial → Q4 2025 Model...        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [FR1.3.2: Review & Start Training] ─────────────────────────┐  │
│                                                               ↓  │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Patterns

#### Pattern 1: Real-Time Feedback Loop
```
User Action (Group 1)  →  System Reaction (Group 2)
─────────────────────────────────────────────────────
1. Select training file   →  Cost panel initializes with estimate
2. Change preset          →  Cost updates within 500ms, delta shows
3. Toggle GPU type        →  Cost recalculates, budget validation re-runs
4. Final selection        →  Budget check passes/fails, warnings display
```

#### Pattern 2: Validation & Blocking
```
Configuration State       →  FR1.2.2 Budget Validation     →  User Outcome
─────────────────────────────────────────────────────────────────────────
Conservative + Spot       →  $30 < $200 remaining ✓        →  Can proceed
Aggressive + On-Demand    →  $240 > $200 remaining ✗       →  BLOCKED
                             Show error modal               →  Must adjust or
                             Suggest: "Use Conservative"    →  increase budget
```

#### Pattern 3: Documentation Integration
```
Configuration Decisions   →  FR1.3.1 Auto-Population       →  Searchable Metadata
─────────────────────────────────────────────────────────────────────────────
File: "Elena Morales"     →  Job Name: "Elena Morales     →  Future search:
Preset: "Balanced"        →  Financial - Balanced -        →  "elena balanced"
Date: 2025-12-16          →  2025-12-16"                   →  finds this job
```

---

## UI/UX Implementation Notes

### Single-Page Workflow (Recommended)

All six FRs should be implemented on a **single training job configuration page** with these sections:

1. **Top Section:** FR1.1.1 (Training File Selection)
2. **Middle Section:** FR1.1.2 (Preset Selection) + FR1.1.3 (GPU Selection)
3. **Right Sidebar (or Floating Card):** FR1.2.1 (Cost Estimation) - ALWAYS VISIBLE
4. **Inline Conditional Warnings:** FR1.2.2 (Budget Validation) - APPEARS IF ISSUES
5. **Bottom Section:** FR1.3.1 (Job Metadata & Documentation)
6. **Final Action:** FR1.3.2 (Review & Start Button)

### State Management Requirements

The configuration page needs centralized state management to coordinate all six FRs:

```typescript
// Configuration State (drives all FRs)
const [configState, setConfigState] = useState({
  // FR1.1.1 selections
  trainingFileId: null,
  trainingFileName: '',
  conversationCount: 0,
  trainingPairs: 0,
  
  // FR1.1.2 selections
  preset: 'balanced', // 'conservative' | 'balanced' | 'aggressive'
  hyperparameters: {...},
  
  // FR1.1.3 selections
  gpuPricingTier: 'spot', // 'spot' | 'on_demand'
  hourlyRate: 2.49,
  
  // FR1.2.1 calculations (derived from above)
  estimatedDurationHours: 12.5,
  estimatedCostMin: 50,
  estimatedCostMax: 60,
  
  // FR1.2.2 validation results (derived from FR1.2.1)
  budgetRemaining: 200,
  budgetValidationPassed: true,
  budgetWarnings: [],
  
  // FR1.3.1 metadata
  jobName: 'Elena Morales Financial - Balanced - 2025-12-16',
  description: '',
  notes: '',
  tags: [],
  clientId: null,
  projectId: null,
});
```

### Update Cascade Pattern

When user changes Group 1 selections, trigger recalculation cascade:

```typescript
const handlePresetChange = (newPreset: string) => {
  // 1. Update FR1.1.2 state
  setConfigState(prev => ({...prev, preset: newPreset}));
  
  // 2. Trigger FR1.2.1 cost recalculation (debounced 500ms)
  debouncedRecalculateCost(newPreset, configState.gpuPricingTier, ...);
  
  // 3. Trigger FR1.2.2 budget validation
  validateBudget(newEstimatedCost, monthlyBudgetRemaining);
  
  // 4. Update FR1.3.1 auto-generated job name
  updateJobName(configState.trainingFileName, newPreset, currentDate);
};
```

---

## Answer to Your Questions

### Q: Are FR1.2.1, FR1.2.2, and FR1.3.1 complemented in some way by FR1.1.1, FR1.1.2, and FR1.1.3?

**A: YES - They are COMPLEMENTED by Group 1, not the other way around.**

- Group 1 (FR1.1.x) provides the **primary inputs**
- Group 2 (FR1.2.x, FR1.3.1) **reacts to and enhances** those inputs

**Specific Complement Relationships:**

| Group 2 Feature | Complements Group 1 By... |
|-----------------|---------------------------|
| **FR1.2.1** (Cost Estimation) | Calculating cost impacts of FR1.1.1 (dataset size), FR1.1.2 (preset complexity), FR1.1.3 (GPU pricing) selections |
| **FR1.2.2** (Budget Validation) | Validating affordability of configuration defined by Group 1, blocking if over budget, suggesting alternative Group 1 choices |
| **FR1.3.1** (Metadata) | Auto-generating job name from FR1.1.1 and FR1.1.2 selections, documenting why user made specific Group 1 choices |

### Q: Do FR1.2.1, FR1.2.2, and FR1.3.1 have duplicated configuration options that do not apply?

**A: NO - There is NO duplication.**

Each FR has a **distinct, non-overlapping purpose:**

- **FR1.1.1:** Dataset selection input
- **FR1.1.2:** Hyperparameter preset input
- **FR1.1.3:** GPU type input
- **FR1.2.1:** Cost calculation display (NOT an input, it's a computed output)
- **FR1.2.2:** Budget enforcement system (NOT an input, it's a validation gate)
- **FR1.3.1:** Metadata capture form (different purpose: documentation, not training config)

**No configuration option appears in multiple FRs.** Each FR owns its specific domain.

### Q: Are FR1.2.1, FR1.2.2, and FR1.3.1 doing something else altogether?

**A: YES - They serve DIFFERENT PURPOSES than Group 1.**

**Group 1 (FR1.1.x):** Technical Configuration - "WHAT to train, HOW to train it, WHERE to train it"

**Group 2 (FR1.2.x, FR1.3.1):** Supporting Systems - "CAN we afford it? SHOULD we proceed? WHY are we doing this?"

| FR Group | Purpose Category | User Question Answered |
|----------|------------------|------------------------|
| FR1.1.1 | Technical Input | "What dataset should I train on?" |
| FR1.1.2 | Technical Input | "How aggressively should I train?" |
| FR1.1.3 | Technical Input | "What GPU tier should I use?" |
| FR1.2.1 | Decision Support | "How much will this cost?" |
| FR1.2.2 | Financial Control | "Can I afford this within budget?" |
| FR1.3.1 | Knowledge Management | "How do I document and find this later?" |

**Different purposes, working together to create a complete configuration experience.**

---

## Implementation Strategy Recommendation

### Build Order

Implement in this sequence for logical dependency management:

1. **Phase 1:** Build Group 1 (FR1.1.1 → FR1.1.2 → FR1.1.3) - Get basic configuration inputs working
2. **Phase 2:** Add FR1.2.1 (Cost Estimation) - Connect calculations to Group 1 state changes
3. **Phase 3:** Add FR1.2.2 (Budget Validation) - Layer validation on top of cost estimates
4. **Phase 4:** Add FR1.3.1 (Metadata) - Add documentation fields with auto-population

This order respects dependencies:
- FR1.2.1 needs Group 1 to have data to calculate costs
- FR1.2.2 needs FR1.2.1 to have cost estimates to validate against budget
- FR1.3.1 needs Group 1 to have selections to auto-generate job name

### Testing Strategy

Test the **integration** between groups, not just individual FRs:

**Test Case 1: Cost Recalculation Cascade**
1. Select training file (242 conversations)
2. Verify cost estimate appears
3. Change preset from Conservative to Aggressive
4. Verify cost updates within 500ms
5. Verify delta shows "↑ $50 increase"

**Test Case 2: Budget Validation Blocking**
1. Configure expensive job (Aggressive + On-Demand = $240)
2. Set remaining budget to $100
3. Try to proceed to review
4. Verify error modal blocks progression
5. Verify "Switch to Conservative" suggestion appears
6. Change to Conservative preset
7. Verify cost drops below budget, blocking removed

**Test Case 3: Metadata Auto-Population**
1. Select training file "Elena Morales Financial"
2. Select preset "Balanced"
3. Verify job name auto-populates: "Elena Morales Financial - Balanced - 2025-12-16"
4. Change preset to "Aggressive"
5. Verify job name updates: "Elena Morales Financial - Aggressive - 2025-12-16"

---

## Conclusion

**FR1.2.1, FR1.2.2, and FR1.3.1 are COMPLEMENTARY FEATURES that enhance the primary configuration workflow defined by FR1.1.1, FR1.1.2, and FR1.1.3.**

They are:
- ✅ **Complementary** - Work together with Group 1 on the same page
- ✅ **Reactive** - Respond to Group 1 selections in real-time
- ✅ **Non-Duplicated** - Each FR owns distinct functionality
- ✅ **Purpose-Specific** - Group 1 = inputs, Group 2 = support/validation/documentation

**Implementation Impact:**
All six FRs should be built as a **single, integrated configuration page** where Group 1 provides the core inputs, and Group 2 provides real-time feedback, budget enforcement, and documentation capabilities. They are NOT separate pages or workflows - they are coordinated features working together to create a complete, informed, and safe training job configuration experience.

---

**Generated:** December 18, 2025  
**Analyst:** AI Development Agent  
**Validation:** Cross-referenced with both FR and FIGMA wireframe specifications
