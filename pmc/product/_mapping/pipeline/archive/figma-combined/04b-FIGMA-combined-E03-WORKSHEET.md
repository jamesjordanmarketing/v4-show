# E03 Combined Wireframe Analysis Worksheet

**Generated:** 2025-12-19
**Stage:** Stage 3 — Error Handling & Recovery
**Section ID:** E03
**Product:** LoRA Pipeline

---

## PHASE 1: Deep Analysis

### Individual FR Catalog

#### FR3.1.1: Out of Memory Error Handling
- **Purpose:** Detect OOM errors, diagnose VRAM requirements, provide actionable fix suggestions
- **Core Functionality:** OOM detection, VRAM breakdown visualization, ranked fix suggestions with confidence ratings, one-click retry with auto-applied fixes, proactive OOM warnings during configuration
- **UI Components:**
  - Full-screen error modal (non-dismissable)
  - VRAM breakdown chart (horizontal stacked bar)
  - Fix suggestion cards (ranked by confidence: 95%, 98%, 80%)
  - One-click retry buttons per fix
  - Educational "Learn More" accordion
  - Proactive warning modal during job configuration
- **UI States:** Error modal displayed, fix selected, retry in progress, retry success, proactive warning
- **User Interactions:** View error details, expand VRAM breakdown, select fix, click retry, expand education section
- **Page Count:** 5 pages
- **Dependencies:** Triggers FR3.3.2 (Retry with Suggested Fixes) logic

#### FR3.1.2: Dataset Format Error Handling
- **Purpose:** Validate training data, identify specific errors with locations, guide fixes
- **Core Functionality:** Pre-flight validation before job creation, preprocessing validation, error location identification, JSON preview with highlighting, step-by-step fix workflow, training file regeneration
- **UI Components:**
  - Validation banner (success/failure) on job config
  - Error modal with tabs (Summary, All Errors, Data Preview, Fix Guide)
  - JSON syntax-highlighted viewer with error markers
  - Paginated error list with filters/sorting
  - 5-step fix workflow guide
  - Regeneration progress indicator
  - Quality score badge on file selector
- **UI States:** Validating, validation success, validation failed, modal open (per tab), regenerating, regeneration complete
- **User Interactions:** Select file (triggers validation), view error details, navigate tabs, open editor, regenerate file, retry job
- **Page Count:** 6 pages
- **Dependencies:** Blocks job creation until fixed

#### FR3.1.3: GPU Provisioning Error Handling
- **Purpose:** Handle GPU unavailability, provide recovery options with cost/time trade-offs
- **Core Functionality:** Provisioning failure detection, real-time availability metrics, auto-retry workflow, spot-to-on-demand migration, proactive availability warnings, quota management
- **UI Components:**
  - Provisioning error modal (non-dismissable until option selected)
  - GPU availability gauge (spot vs on-demand)
  - Datacenter utilization display
  - Recovery option cards (Auto-Retry, On-Demand, Cancel, Support)
  - Auto-retry progress tracking with countdown timer
  - Cost comparison tables
  - Proactive warning modal
  - Quota exceeded modal
- **UI States:** Provisioning failed, auto-retry enabled, retry progress (attempts 1-12), timeout after 1 hour, switch to on-demand, quota exceeded
- **User Interactions:** Select recovery option, monitor auto-retry, switch strategy mid-retry, confirm on-demand switch
- **Page Count:** 6 pages
- **Dependencies:** Affects FR3.2.1 (interruption handling), FR3.2.2 (resume options)

#### FR3.2.1: Spot Instance Interruption Recovery
- **Purpose:** Automatic checkpoint-based recovery from spot interruptions
- **Core Functionality:** Checkpoint saving every 100 steps, interruption detection via webhooks, automatic GPU provisioning + checkpoint restore, interruption tracking, cost overhead calculation
- **UI Components:**
  - Interruption notification toast
  - Recovery progress stages (5 steps)
  - Status badge ("Interrupted → Recovering → Training")
  - Interruption badge ("Interrupted 2× (auto-recovered)")
  - Interruption details modal with timeline
  - Loss curve with interruption markers
  - Cost breakdown with overhead
  - Recovery failure escalation modal (after 3 attempts)
- **UI States:** Training active, interrupted, recovery in progress (5 stages), resumed, multiple interruptions, recovery failed
- **User Interactions:** Receive notification, view recovery progress, click badge for details, hover on loss curve markers, switch to on-demand if recovery fails
- **Page Count:** 6 pages
- **Dependencies:** Creates checkpoints used by FR3.2.2, triggers FR3.1.3 if provisioning fails

#### FR3.2.2: Manual Checkpoint Resume
- **Purpose:** Resume failed jobs from checkpoints with optional configuration adjustments
- **Core Functionality:** Resume button display, configuration adjustment options (GPU type, batch size, epochs, LR schedule), remaining work calculation, cost estimates, job continuation linking
- **UI Components:**
  - "Resume from Step X" button on failed jobs
  - Resume configuration modal
  - Original job summary card
  - Remaining work calculation display
  - Configuration adjustment controls (toggles, sliders, radio buttons)
  - Locked parameters display (grayed out)
  - Real-time cost estimate updates
  - Confirmation section with checkbox
  - Resumed job dashboard with linked jobs view
  - Combined loss curve (original + continuation)
- **UI States:** Failed job with checkpoint, resume modal open, config adjusted, confirmation, creating continuation, resumed job active, completed
- **User Interactions:** Click resume, adjust configuration, view cost impact, confirm, monitor continuation
- **Page Count:** 6 pages
- **Dependencies:** Requires checkpoint from FR3.2.1, overlaps with FR3.3.2 (configuration adjustments)

#### FR3.3.1: One-Click Retry with Same Configuration
- **Purpose:** Quick retry for transient failures without configuration changes
- **Core Functionality:** Clone configuration, auto-increment retry counter, job linking, failure analysis display, retry success tracking, retry limit enforcement
- **UI Components:**
  - "Retry Job" button on failed jobs
  - Retry confirmation modal
  - Original job failure context card
  - Configuration preview (cloned settings)
  - Fresh cost estimate
  - Retry reasoning guidance (when to retry vs not)
  - Edit configuration option
  - Auto-generated job name with counter
  - Retry job display with indicator
  - Retry chain tracking
  - Retry limit warning (max 5)
  - Aggregate cost tracking across retries
- **UI States:** Failed job, confirmation modal, creating retry, retry queued, retry active, retry success/failure, limit reached
- **User Interactions:** Click retry, review context, confirm, optionally edit config, monitor retry
- **Page Count:** 5 pages
- **Dependencies:** Alternative to FR3.3.2, less sophisticated

#### FR3.3.2: Retry with Suggested Adjustments
- **Purpose:** Intelligent retry with AI-suggested configuration fixes based on failure analysis
- **Core Functionality:** Failure pattern analysis, evidence-based fix suggestions, confidence ratings from historical data, configuration diff visualization, multiple fix selection, effectiveness tracking
- **UI Components:**
  - "Retry with Suggested Fix" button (primary, with "Recommended" badge)
  - Suggestion modal with failure analysis
  - Error diagnosis card (root cause, specific issue, impact)
  - Ranked fix cards with confidence ratings (95%, 98%)
  - Change visualization (strikethrough old → bold new)
  - Trade-off bullets (+/-)
  - Configuration diff viewer (side-by-side)
  - Cost/duration impact comparison
  - Multiple fix selection with checkboxes
  - Confidence tier badges
  - Educational "Why does this help?" sections
  - Applied suggestions display on retry job
  - Success celebration when fix works
- **UI States:** Failed job with suggestions, modal open, fix(es) selected, diff preview, creating retry, retry active (monitoring failed step), success celebration
- **User Interactions:** Click suggested fix button, review analysis, select fix(es), view diff, confirm, monitor success at failed step
- **Page Count:** 6 pages
- **Dependencies:** Integrates FR3.1.1 OOM suggestions, extends FR3.3.1 retry

---

### FR Relationships & Integration Points

#### Sequential Flow (Error Response Patterns)
```
Training Job Active
       ↓
    Error Occurs
       ↓
┌──────┴──────┐
│  Error Type │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────────────────────┐
│ OOM Error (FR3.1.1) → Suggested Fixes (FR3.3.2) → Retry          │
│ Dataset Error (FR3.1.2) → Fix Guide → Regenerate → Retry         │
│ Provisioning Error (FR3.1.3) → Auto-Retry or Switch GPU          │
│ Spot Interruption (FR3.2.1) → Auto Recovery or Manual (FR3.2.2)  │
│ Other Failure → One-Click Retry (FR3.3.1) or Suggested (FR3.3.2) │
└──────────────────────────────────────────────────────────────────┘
```

#### Complementary Features (Same Context)
- **Group 1 (Error Modals):** FR3.1.1, FR3.1.2, FR3.1.3 - All use error modal pattern
- **Group 2 (Retry Options):** FR3.3.1, FR3.3.2 - Same failed job, different retry strategies
- **Group 3 (Checkpoint Recovery):** FR3.2.1, FR3.2.2 - Automatic vs manual checkpoint usage
- **Group 4 (Configuration Adjustments):** FR3.1.1, FR3.2.2, FR3.3.2 - All allow config changes

#### State Dependencies
- FR3.1.1 OOM analysis → populates FR3.3.2 suggestions
- FR3.2.1 checkpoint creation → enables FR3.2.2 resume option
- FR3.1.3 provisioning failure → affects FR3.2.1 recovery
- FR3.3.1 simple retry → alternative to FR3.3.2 suggested retry
- All failures → display on job dashboard with retry options

#### UI Component Sharing
- **Error Modal Framework:** Used by FR3.1.1, FR3.1.2, FR3.1.3, FR3.2.1 (recovery failure)
- **Cost Comparison Tables:** FR3.1.3, FR3.2.2, FR3.3.1, FR3.3.2
- **Configuration Adjustment UI:** FR3.2.2, FR3.3.2
- **Retry Buttons:** FR3.3.1 ("Retry Job"), FR3.3.2 ("Retry with Suggested Fix")
- **Progress Indicators:** FR3.1.2 (regeneration), FR3.1.3 (auto-retry), FR3.2.1 (recovery stages)
- **Confidence Ratings:** FR3.1.1 (fix confidence), FR3.3.2 (suggestion confidence)

---

### Overlaps & Duplications to Consolidate

#### 1. Retry Logic Duplication
- **FR3.1.1** has one-click retry with fixes for OOM
- **FR3.3.1** has general one-click retry (same config)
- **FR3.3.2** has suggested fixes retry (intelligent)
- **FR3.2.2** has resume from checkpoint (with adjustments)
- **CONSOLIDATION:** Create unified retry framework with 3 options:
  1. "Retry Same Config" (simple)
  2. "Retry with Suggestions" (intelligent)
  3. "Resume from Checkpoint" (if available)

#### 2. Configuration Adjustment UI Duplication
- **FR3.2.2** allows GPU type, batch size, epochs, LR adjustment on resume
- **FR3.3.2** allows applying suggested parameter changes
- **FR3.1.1** suggests batch size, preset changes for OOM
- **CONSOLIDATION:** Single configuration adjustment component used across all contexts

#### 3. Cost Comparison Tables Duplication
- **FR3.1.3** shows spot vs on-demand cost comparison
- **FR3.2.2** shows original + continuation cost
- **FR3.3.1** shows fresh cost estimate vs original
- **FR3.3.2** shows cost/duration impact of suggestions
- **CONSOLIDATION:** Unified cost estimation component with context-specific content

#### 4. Error Modal Pattern Duplication
- **FR3.1.1** - OOM error modal with VRAM breakdown + fixes
- **FR3.1.2** - Dataset error modal with tabs + JSON preview
- **FR3.1.3** - Provisioning error modal with recovery options
- **FR3.2.1** - Recovery failure modal (after 3 attempts)
- **CONSOLIDATION:** Unified error modal framework with pluggable content sections

#### 5. Confidence Rating Display Duplication
- **FR3.1.1** shows 95%, 98%, 80% confidence for OOM fixes
- **FR3.3.2** shows confidence ratings for all suggestions
- **CONSOLIDATION:** Single confidence component with color-coded progress bars

---

### POC Simplification Opportunities

#### Features to KEEP (Essential for POC)
1. ✅ **OOM Error Detection & Display** (FR3.1.1) - Core error handling
2. ✅ **Single Primary Fix Suggestion** (FR3.1.1/FR3.3.2 merged) - One recommended fix
3. ✅ **Dataset Validation Banner** (FR3.1.2) - Block invalid jobs
4. ✅ **Error Summary with First Error** (FR3.1.2) - Identify issue
5. ✅ **GPU Availability Display** (FR3.1.3) - Understand constraint
6. ✅ **Two Recovery Options** (FR3.1.3) - Auto-retry OR switch to on-demand
7. ✅ **Spot Interruption Notification** (FR3.2.1) - User awareness
8. ✅ **Auto-Recovery Status** (FR3.2.1) - 5-stage progress
9. ✅ **Interruption Badge** (FR3.2.1) - At-a-glance status
10. ✅ **Resume Button** (FR3.2.2) - Key recovery option
11. ✅ **Basic Config Adjustment** (FR3.2.2) - GPU type, batch size only
12. ✅ **Simple Retry Button** (FR3.3.1) - Quick recovery
13. ✅ **Suggested Fix Option** (FR3.3.2) - Intelligent retry

#### Features to SIMPLIFY (Reduce Complexity)
1. 🔽 **VRAM Breakdown (FR3.1.1):**
   - REMOVE: Detailed component breakdown (base model, LoRA, optimizer, batch, gradients)
   - KEEP: Total estimated vs capacity (simple "92GB needed, 80GB available")
2. 🔽 **Fix Options (FR3.1.1/FR3.3.2):**
   - REMOVE: 3-4 ranked options with detailed trade-offs
   - KEEP: Single "Recommended Fix" with one-click apply
3. 🔽 **Dataset Error Modal Tabs (FR3.1.2):**
   - REMOVE: All Errors tab, Data Preview tab with JSON viewer
   - KEEP: Summary tab with first error, Fix Guide as expandable section
4. 🔽 **GPU Recovery Options (FR3.1.3):**
   - REMOVE: Contact Support option, Quota management
   - KEEP: Auto-Retry + Switch to On-Demand only
5. 🔽 **Auto-Retry Tracking (FR3.1.3):**
   - REMOVE: Datacenter utilization chart, real-time polling
   - KEEP: Simple "Attempt X of 12" + countdown timer
6. 🔽 **Interruption Details (FR3.2.1):**
   - REMOVE: Full timeline modal, loss curve markers
   - KEEP: Badge with count, simple downtime summary
7. 🔽 **Resume Configuration (FR3.2.2):**
   - REMOVE: Epochs adjustment, LR schedule options
   - KEEP: GPU type toggle, batch size (if OOM)
8. 🔽 **Configuration Diff (FR3.3.2):**
   - REMOVE: Side-by-side interactive diff viewer
   - KEEP: Simple "Changes: batch_size 4→2" summary

#### Features to REMOVE (Nice-to-Have for POC)
1. ❌ Educational "Learn More" sections (FR3.1.1)
2. ❌ FAQ shortcuts (FR3.1.1)
3. ❌ Proactive OOM warning during configuration (FR3.1.1)
4. ❌ All Errors paginated list with filters/sorting (FR3.1.2)
5. ❌ JSON syntax-highlighted preview (FR3.1.2)
6. ❌ Training file quality score (FR3.1.2)
7. ❌ Proactive availability warning (FR3.1.3)
8. ❌ Quota exceeded modal (FR3.1.3)
9. ❌ Multi-datacenter display (FR3.1.3)
10. ❌ Full interruption details modal (FR3.2.1)
11. ❌ Loss curve interruption markers (FR3.2.1)
12. ❌ Cost breakdown with overhead (FR3.2.1)
13. ❌ Locked parameters display (FR3.2.2)
14. ❌ Continuation job linking UI (FR3.2.2)
15. ❌ Combined loss curve (FR3.2.2)
16. ❌ Retry chain tracking (FR3.3.1)
17. ❌ Retry limit enforcement UI (FR3.3.1)
18. ❌ Aggregate retry cost tracking (FR3.3.1)
19. ❌ Multiple fix selection (FR3.3.2)
20. ❌ Confidence tier methodology display (FR3.3.2)
21. ❌ Suggestion effectiveness tracking (FR3.3.2)
22. ❌ Team analytics dashboards (all FRs)

#### Rationale
- **POC Goal:** Demonstrate core error handling + recovery workflow
- **Essential:** Error detection → User understanding → Quick recovery path
- **Non-Essential:** Advanced analytics, team features, educational content, multi-option comparison

---

## PHASE 2: Integration Planning

### Unified UX Flow Design

#### Error Response Workflow (Single Unified Pattern)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRAINING JOB MONITORING                              │
│                                                                               │
│   Status: Training ──────────────────────────────────────────────→ Complete │
│              │                                                                │
│              ↓ (ERROR OCCURS)                                                 │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                    ERROR DETECTION                                    │   │
│   │                                                                       │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│   │   │ OOM Error   │  │ Data Error  │  │ Provisioning│  │ Spot       │  │   │
│   │   │ (FR3.1.1)   │  │ (FR3.1.2)   │  │ (FR3.1.3)   │  │ Interrupt  │  │   │
│   │   │             │  │             │  │             │  │ (FR3.2.1)  │  │   │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │   │
│   │          ↓                ↓                ↓                ↓         │   │
│   │   ┌──────────────────────────────────────────────────────────────┐   │   │
│   │   │                    ERROR MODAL                                │   │   │
│   │   │                                                               │   │   │
│   │   │   Header: Error Type + Icon                                   │   │   │
│   │   │   Problem: What happened (simple explanation)                 │   │   │
│   │   │   Impact: "Training failed at step X"                         │   │   │
│   │   │                                                               │   │   │
│   │   │   ┌─────────────────────────────────────────────────────┐    │   │   │
│   │   │   │ RECOVERY OPTIONS (context-specific)                  │    │   │   │
│   │   │   │                                                      │    │   │   │
│   │   │   │ [Primary Action] [Secondary Action] [Tertiary]       │    │   │   │
│   │   │   └─────────────────────────────────────────────────────┘    │   │   │
│   │   └──────────────────────────────────────────────────────────────┘   │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│   Post-Recovery: Job Dashboard shows retry/resume status                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Context-Specific Recovery Options

**For OOM Error (FR3.1.1):**
- Primary: "Retry with batch_size=2" (95% success)
- Secondary: "Retry with Conservative Preset" (98% success)
- Tertiary: "Edit Configuration Manually"

**For Dataset Error (FR3.1.2):**
- Primary: "Open Conversation Editor" (fix data)
- Secondary: "Regenerate Training File" (after fixes)
- Tertiary: "View All Errors" (expandable)

**For GPU Provisioning (FR3.1.3):**
- Primary: "Enable Auto-Retry" (wait for spot)
- Secondary: "Switch to On-Demand" (guaranteed, +$X)
- Tertiary: "Cancel Job"

**For Spot Interruption (FR3.2.1):**
- Automatic: "Auto-recovering..." (no user action needed)
- Fallback (if fails 3x): "Switch to On-Demand" or "Cancel"

**For Any Failure with Checkpoint (FR3.2.2):**
- Primary: "Resume from Step X"
- With OOM context: Pre-suggest batch_size reduction

**For Any Failure without Checkpoint (FR3.3.1/3.3.2):**
- Primary: "Retry with Suggested Fix" (if suggestions available)
- Secondary: "Retry Same Config" (if transient error likely)

---

### Component Relationships

#### Core Components & Triggers

**1. ErrorDetectionSystem (Backend)**
- **Detects:** OOM, Dataset errors, Provisioning failures, Spot interruptions
- **Triggers:** Appropriate error modal or notification
- **Provides:** Error type, details, failure context

**2. ErrorModal (Unified Component)**
- **Triggered by:** All error types
- **Receives:** Error type, details, available recovery options
- **Displays:** Problem statement, impact, recovery actions
- **Outputs:** User selection → triggers recovery workflow

**3. RecoveryOptionsPanel (Within Error Modal)**
- **Context-aware:** Different options per error type
- **Contains:** Primary/Secondary/Tertiary action buttons
- **Calculates:** Cost comparisons, success rate estimates

**4. RetryWorkflow (Shared Logic)**
- **Simple Retry:** Clone config → Create job → Start
- **Suggested Retry:** Apply fixes → Clone modified config → Create job
- **Resume:** Load checkpoint → Apply optional changes → Continue

**5. AutoRetryMonitor (FR3.1.3)**
- **Triggered by:** "Enable Auto-Retry" selection
- **Displays:** Attempt counter, countdown, availability status
- **Actions:** Can switch to on-demand mid-retry

**6. InterruptionRecoveryTracker (FR3.2.1)**
- **Triggered by:** Spot interruption webhook
- **Displays:** 5-stage recovery progress, notifications
- **Updates:** Status badge, interruption count

**7. JobDashboardStatus (Consolidated)**
- **Displays:** Current state, interruption badges, retry indicators
- **Links:** To original jobs, continuations, retry chain

---

### Unified State Management

```typescript
// Consolidated Error & Recovery State
interface ErrorRecoveryState {
  // Current Error Context
  currentError: {
    type: 'OOM' | 'DatasetError' | 'ProvisioningError' | 'SpotInterruption' | 'Other';
    message: string;
    failedAtStep: number;
    failedAtPercentage: number;
    details: Record<string, any>; // Type-specific details
  } | null;

  // Checkpoint Availability
  checkpoint: {
    available: boolean;
    step: number;
    savedAt: Date;
    sizeMb: number;
  } | null;

  // Recovery Status
  recoveryStatus: 'idle' | 'recovering' | 'waiting_for_gpu' | 'resumed' | 'failed';
  recoveryAttempts: number;
  maxRecoveryAttempts: number;

  // Auto-Retry State (FR3.1.3)
  autoRetry: {
    enabled: boolean;
    currentAttempt: number;
    maxAttempts: number; // 12
    nextRetryIn: number; // seconds
    startedAt: Date | null;
  };

  // Interruption Tracking (FR3.2.1)
  interruptions: {
    count: number;
    totalDowntimeMinutes: number;
    events: Array<{
      interruptedAt: Date;
      resumedAt: Date | null;
      step: number;
      downtimeMinutes: number;
    }>;
  };

  // Suggested Fixes (FR3.3.2)
  suggestedFixes: Array<{
    id: string;
    title: string;
    parameterChanges: Record<string, { from: any; to: any }>;
    confidencePercent: number;
    selected: boolean;
  }>;

  // Cost Tracking
  costEstimate: {
    originalEstimate: { min: number; max: number };
    spentSoFar: number;
    remainingEstimate: { min: number; max: number };
    totalProjected: number;
  };
}
```

---

## PHASE 3: POC Simplification

### POC-Optimized Feature Set

#### What We're Building (Essential Only)

**Component 1: Unified Error Modal**
- Single modal pattern for all error types
- Header with error type icon
- Simple problem statement (1-2 sentences)
- Impact line ("Training failed at step X, Y% complete")
- Recovery options buttons (2-3 per error type)

**Component 2: OOM Error Display**
- Error: "Configuration exceeded 80GB VRAM by X GB"
- Recommended fix: "Reduce batch_size to 2" (single option)
- One-click retry button

**Component 3: Dataset Error Display**
- Error: "Validation failed. X errors found."
- First error shown: "Conversation #47 missing target_response"
- "Open Editor" button (deep link)
- "Regenerate File" button (after fixes)

**Component 4: GPU Provisioning Error Display**
- Error: "No spot GPUs available (92% utilization)"
- Option A: "Auto-Retry (wait ~15-30 min)"
- Option B: "Switch to On-Demand (+$X/hr)"
- Simple cost comparison

**Component 5: Spot Interruption Notification**
- Toast: "Training interrupted. Auto-recovering..."
- Status badge on dashboard: "Recovering" → "Resumed"
- Simple "Interrupted X×" badge after recovery

**Component 6: Resume Button**
- Button: "Resume from Step X"
- Simple modal: "Continue with same config?" or "Adjust batch_size?" (if OOM)
- Creates continuation job

**Component 7: Retry Buttons**
- "Retry Job" - Same config (for transient errors)
- "Retry with Fix" - Apply suggested change (for known fixes)

---

### What We're NOT Building (Removed for POC)

❌ Detailed VRAM breakdown chart
❌ Multiple ranked fix options with trade-offs
❌ Educational content and documentation links
❌ Proactive warnings during job configuration
❌ Tabbed error modal (All Errors, Data Preview tabs)
❌ JSON syntax-highlighted viewer
❌ Training file quality scores
❌ Multi-datacenter availability display
❌ Quota management
❌ Detailed auto-retry progress with utilization charts
❌ Full interruption timeline modal
❌ Loss curve interruption markers
❌ Cost breakdown with overhead calculation
❌ Epochs/LR schedule adjustment on resume
❌ Locked parameters display
❌ Job continuation linking visualization
❌ Combined loss curves
❌ Retry chain tracking
❌ Retry limit enforcement
❌ Aggregate cost tracking across retries
❌ Multiple fix selection
❌ Configuration diff viewer
❌ Confidence methodology display
❌ Suggestion effectiveness tracking
❌ Team analytics dashboards

---

### Page Count Optimization

#### Original Total: 40 pages across 7 FRs
- FR3.1.1: 5 pages
- FR3.1.2: 6 pages
- FR3.1.3: 6 pages
- FR3.2.1: 6 pages
- FR3.2.2: 6 pages
- FR3.3.1: 5 pages
- FR3.3.2: 6 pages

#### Combined & Simplified: 12 pages

| # | Page | Purpose | Error Types Covered |
|---|------|---------|---------------------|
| 1 | Error Modal - OOM Error | Display OOM failure with recommended fix | FR3.1.1 |
| 2 | Error Modal - Dataset Error | Display validation failure with fix guidance | FR3.1.2 |
| 3 | Error Modal - GPU Provisioning | Display unavailability with recovery options | FR3.1.3 |
| 4 | Auto-Retry Progress | Show retry attempts during GPU wait | FR3.1.3 |
| 5 | Spot Interruption - Recovering | Show auto-recovery progress stages | FR3.2.1 |
| 6 | Spot Interruption - Resumed | Show successful recovery with badge | FR3.2.1 |
| 7 | Recovery Failure - Options | Show fallback options after 3 failed attempts | FR3.2.1, FR3.1.3 |
| 8 | Resume Configuration Modal | Show resume options with basic config adjustment | FR3.2.2 |
| 9 | Retry Confirmation Modal | Show retry options with suggested fix | FR3.3.1, FR3.3.2 |
| 10 | Job Dashboard - Active States | Show status badges and retry indicators | All FRs |
| 11 | Mobile Layout - Error Modal | Responsive error modal for mobile | All FRs |
| 12 | Mobile Layout - Job Dashboard | Responsive dashboard with badges | All FRs |

#### Reduction Strategy
- Merged similar error modals into unified pattern with context-specific content
- Combined retry flows (simple + suggested) into single confirmation modal
- Consolidated interruption states into recovery progress + success
- Removed all advanced/expert-level features
- Removed team analytics and proactive warnings
- Kept mobile layouts as essential for complete demo

---

## Summary

**Analysis Complete.** Ready for Phase 4: Combined Prompt Generation.

**Key Integration Points:**
1. Unified Error Modal framework with pluggable content
2. Context-aware Recovery Options based on error type
3. Shared Retry Workflow for simple, suggested, and resume paths
4. Consolidated Job Dashboard status display
5. Simplified 12-page wireframe set vs original 40 pages

**POC Focus:**
- Error detection and clear problem communication
- Quick recovery paths (1-2 click resolution)
- Essential status tracking (badges, notifications)
- Mobile-responsive design
