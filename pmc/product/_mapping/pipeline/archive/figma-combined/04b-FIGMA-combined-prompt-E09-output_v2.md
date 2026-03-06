# LoRA Pipeline - Stage 9 Combined Figma Wireframe Prompt
**Version:** 2.0  
**Date:** January 8, 2026  
**Stage:** Stage 9 — Training Progress Monitoring (Lay-Person Accessible)  
**Section ID:** E09_v2  
**Optimization:** Proof-of-Concept (POC) - Real-time visibility with lay-person terminology

**Builds Upon:** [E08_v2](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/pipeline/figma-combined/04b-FIGMA-combined-prompt-E08-output_v2.md)

**Based On:**
- Definitive Specification: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\LoRA-training-lay-person-interface-changes_v3.md
- Original: 04b-FIGMA-combined-prompt-E09-output.md

**Key Changes from E09 v1:**
- References E08_v2 components by exact same IDs
- Hyperparameter labels updated to lay-person terms
- Engine Information Panel shows features (display-only)
- Specialized Metrics Tab REMOVED (cannot compute during training)
- LoRA Config row (Rank/Alpha) removed from Engine Info

---

## Prompt for Figma Make AI

**Title:** Stage 9 — Training Progress Monitoring (Lay-Person Accessible) - Complete Integrated Wireframe System

> **⚠️ IMPORTANT:** This wireframe builds upon E08_v2. All component IDs and terminology must match E08_v2 exactly. See Section 11 for cross-reference.

**Context Summary**

This stage provides real-time training progress monitoring designed for non-technical users. Users can verify their training is running correctly, monitor progress through universal metrics (loss, time, GPU usage), and see the features of the currently loaded engine. The interface prioritizes anxiety reduction through visible progress, confidence through transparent metrics, and trust through consistent terminology with the configuration stage (E08_v2). Specialized evaluation metrics (Emotional Arc Fidelity, Empathy Score) are NOT shown during training because they can only be computed POST-training.

**Journey Integration**

- **Stage 9 User Goals:** 
  - Verify training job is running correctly
  - Monitor training progress in real-time
  - Understand if training is going well (loss decreasing)
  - See confirmation of the engine features being applied
  - Build confidence through visible, understandable metrics

- **Key Emotions:** 
  - Initial anxiety ("is it working?") → Relief through visible progress → Confidence through decreasing loss → Patience through time estimates → Anticipation of results

- **Progressive Disclosure:** 
  - **Basic:** Progress bar, training loss trend, time remaining
  - **Advanced:** All universal metrics with trends, engine features panel
  - **Expert:** (Reserved for future - anomaly detection, optimization suggestions)

- **Persona Adaptations:** 
  - Non-technical users need simple progress indicators and lay-person terminology
  - Technical users can expand to see detailed universal metrics
  - All users benefit from transparent, anxiety-reducing real-time visibility

**Wireframe Goals**

- Display training progress prominently with clear percentage and time remaining
- Show universal metrics (loss, throughput, GPU) that update in real-time
- Display engine features panel (carries forward from E08_v2 configuration)
- Use SAME terminology and component IDs as E08_v2 for consistency
- Do NOT show specialized evaluation metrics (these compute POST-training only)
- Integrate with existing E02 monitoring patterns

**Explicit UI Requirements**

---

## SECTION 1: Integration with Existing E02 Job Detail Page

**Page Context:** `/training/jobs/[jobId]`  

**Layout Order (Top to Bottom):**
1. Job Header (existing E02)
2. Progress Card (existing E02)
3. **Training Configuration Summary (NEW - E09_v2)** — References E08_v2 values
4. **Engine Features Panel (CARRIED FROM E08_v2)**
5. **Real-time Metrics Panel (MODIFIED - E09_v2)** — Universal metrics only
6. Stage Progression (existing E02)
7. Event Log (existing E02)
8. Cost Tracking (existing E02)

---

## SECTION 2: Training Configuration Summary (NEW)

**Purpose:** Show what configuration is being used (read-only, matches E08_v2)

**Component ID:** `training-config-summary`

**Card Container:**
- Background: Light gray (#F9FAFB)
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 16px
- Margin-bottom: 20px

**Card Header:**
- Title: "Training Configuration" (semibold, 16px)
- Subtitle: "As configured before training started" (gray, 12px)

**Content Grid (3 columns on desktop, 1 on mobile):**

### Column 1: Training Data
- Label: "Training Data" (gray, 13px)
- Value: "emotional-alignment-v3.jsonl" (semibold, 14px)
- Sub-value: "242 conversations" (gray, 12px)
- **References:** `training-data-summary-card` from E08_v2

### Column 2: Training Parameters
Using exact same terminology as E08_v2:

- **Training Sensitivity:** "Medium (Balanced)" (14px)
  - References: `training-sensitivity-control` from E08_v2
  
- **Training Progression:** "Medium (Balanced)" (14px)
  - References: `training-progression-control` from E08_v2
  
- **Training Repetition:** "3 (Standard)" (14px)
  - References: `training-repetition-control` from E08_v2

### Column 3: Estimated Completion
- Label: "Estimated Completion" (gray, 13px)
- Value: "~2h 15m remaining" (semibold, 14px)
- Sub-value: "Started 2h 8m ago" (gray, 12px)

**Note:** This section is READ-ONLY. Users cannot modify configuration during training.

---

## SECTION 3: Engine Features Panel (Carried from E08_v2)

**Purpose:** Show what engine features are being applied during training

**Component ID:** `engine-features-panel` (SAME as E08_v2)

**Card Container:**
- Background: Light blue tint (#EFF6FF)
- Border: 1px solid blue (#93C5FD)
- Border radius: 8px
- Padding: 16px

**Card Header:**
- Title: "Training Engine Features" (semibold, 14px)
- Status badge: "Active" (green badge with pulse animation)

**Content:**
- Engine name: "Emotional Alignment Engine" (bold, 16px)
- Feature list (compact, inline badges):
  - "✓ Emotional Arc Pattern Recognition"
  - "✓ Empathetic Response Optimization"
  - "✓ Progression-Aware Training"

**Visual State:**
- Read-only display (same as E08_v2)
- "Active" badge pulses gently to indicate engine is working
- Provides confidence that the right engine is running

**REMOVED from E09 v1:**
- ~~"LoRA Config: Rank: 16 | Alpha: 32" row~~ — Technical details hidden
- ~~Quantization details~~ — Not needed for lay users

---

## SECTION 4: Real-time Metrics Panel (MODIFIED)

**Purpose:** Show training progress through universal metrics that update every 5 seconds

**Component ID:** `realtime-metrics-panel`

**Card Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 20px

**Card Header:**
- Title: "Training Metrics" (semibold, 18px)
- Subtitle: "Updated every 5 seconds" (gray, 13px)
- Live indicator: Green dot with "Live" text (pulsing)

**Tab Navigation: SINGLE TAB ONLY**

> **⚠️ CRITICAL CHANGE:** Only "Universal" tab is shown. The "Specialized" tab is REMOVED because specialized metrics (Emotional Arc Fidelity, Empathy Score) can ONLY be computed AFTER training completes.

- Tab: "Universal Metrics (5)" — Only tab visible
- ~~Tab: "Specialized Metrics"~~ — REMOVED

---

## SECTION 5: Universal Metrics Table

**Table Layout:**
- Columns: Metric Name | Current Value | Trend | Last Updated
- Column widths: 35% | 25% | 20% | 20%

**Metrics Displayed:**

### Metric 1: Training Loss
- Name: "Training Loss" (semibold, 14px)
- Description: "How well the model is learning" (gray, 12px)
- Current Value: "0.2345 nats" (16px, semibold)
- Trend: Green down arrow, "-8%" (improving)
- Last Updated: "5s ago"

### Metric 2: Training Progress
- Name: "Training Progress" (semibold, 14px)
- Description: "Current repetition cycle" (gray, 12px)
- Current Value: "Epoch 2 of 3" (16px, semibold)
- Trend: "Step 1,250 / 3,600" (gray, 14px)
- Last Updated: "5s ago"

### Metric 3: Processing Speed
- Name: "Processing Speed" (semibold, 14px)
- Description: "Training tokens per second" (gray, 12px)
- Current Value: "1,250 tok/s" (16px, semibold)
- Trend: Green up arrow, "+5%" (stable/improving)
- Last Updated: "5s ago"

### Metric 4: GPU Utilization
- Name: "GPU Utilization" (semibold, 14px)
- Description: "Compute power being used" (gray, 12px)
- Current Value: "95%" (16px, semibold)
- Trend: Horizontal dash, "±1%" (stable)
- Last Updated: "5s ago"

### Metric 5: Memory Usage
- Name: "Memory Usage" (semibold, 14px)
- Description: "GPU memory consumption" (gray, 12px)
- Current Value: "68 GB / 80 GB" (16px, semibold)
- Trend: "85% capacity" (gray, 14px)
- Last Updated: "5s ago"

**Note on Learning Rate Display:**
- The technical "Learning Rate" metric can still be shown in the table
- It is a MEASUREMENT (what the optimizer is doing), not a configuration
- Display as: "Current Learning Rate: 0.00005" (technical, but informational)

---

## SECTION 6: Removed Components (from E09 v1)

**The following are REMOVED from E09_v2:**

1. ~~Specialized Metrics Tab~~ — Cannot be computed during training
2. ~~Emotional Arc Fidelity metric row~~ — Post-training only
3. ~~Empathy Score metric row~~ — Post-training only
4. ~~Multi-Perspective Consensus row~~ — Post-training only
5. ~~"Evaluating specialized metrics..." badge~~ — N/A
6. ~~LoRA Config row in Engine Info~~ — Technical details hidden

**Why Removed:**
Per v3 specification: "Emotional Arc Fidelity and Empathy Score are POST-TRAINING EVALUATION METRICS, not real-time training metrics. They require running the trained model on test prompts and analyzing outputs — this can ONLY happen AFTER training completes."

---

## SECTION 7: Post-Training Evaluation Reminder

**Purpose:** Remind users that evaluations will happen after training

**Position:** Below Universal Metrics table

**Component:**
- Background: Light gray (#F3F4F6)
- Border radius: 6px
- Padding: 12px
- Icon: Info circle (blue)
- Text: "Post-training evaluations (Emotional Arc Fidelity, Empathy Score) will run automatically when training completes. Results will appear in your Training Results page." (gray, 13px)

---

## SECTION 8: Real-time Update Mechanism

**Polling Strategy:**
- Active jobs: Poll every 5 seconds
- Completed/failed jobs: No polling (navigate to results)
- User away (tab not focused): Reduce to every 15 seconds
- Connection issues: Exponential backoff

**Visual Indicators:**

### Live Indicator
- Position: Card header, right side
- States:
  - "Live" (green dot, pulsing) — Actively receiving updates
  - "Paused" (gray dot) — Tab not focused
  - "Reconnecting..." (yellow dot) — Connection issues

### Update Animation
- New data arrives: Brief highlight (light blue flash, 300ms)
- Trend changes: Arrow animates direction change
- Non-disruptive: User can read without interruption

---

## SECTION 9: Responsive Design

**Desktop (≥1024px):**
- Config summary: 3-column grid
- Metrics table: Full 4 columns visible
- Engine features: Full width card

**Tablet (768px - 1023px):**
- Config summary: 2-column grid
- Metrics table: Slightly compressed
- Engine features: Full width card

**Mobile (<768px):**
- Config summary: Stacked vertically
- Metrics table: Transformed to card layout
  - Each metric is a card with name, value, trend
- Engine features: Compact badges

---

## SECTION 10: Accessibility Requirements

**Keyboard Navigation:**
- Tab through: Progress card → Config summary → Engine features → Metrics table → Event log
- No complex interactions needed (view-only during training)

**Screen Reader Support:**
- Metrics table: "Table, Training Metrics, 5 rows. Row 1, Training Loss: 0.2345 nats, improving, down 8 percent, updated 5 seconds ago"
- Live indicator: "Status, Live updates active"
- Engine features: "Information panel, Training Engine Features, Active. Engine is Emotional Alignment. Features: Emotional Arc Pattern Recognition, Empathetic Response Optimization, Progression-Aware Training"

**Motion:**
- Respects `prefers-reduced-motion`
- When enabled: No pulsing animations, static indicators

---

## SECTION 11: Cross-Reference to E08_v2 Components

**Component ID Consistency Check:**

| Component | E08_v2 Definition | E09_v2 Reference |
|-----------|-------------------|------------------|
| `training-data-summary-card` | Training file display | Shown in config summary |
| `training-sensitivity-control` | Learning rate slider | Value displayed as "Training Sensitivity: Medium" |
| `training-progression-control` | Batch size slider | Value displayed as "Training Progression: Medium" |
| `training-repetition-control` | Epochs stepper | Value displayed as "Training Repetition: 3" |
| `engine-features-panel` | Engine capabilities | Same component, "Active" status |
| `post-training-evaluation-info` | Auto evaluations | Referenced in reminder text |

**Terminology Consistency:**
- ✓ "Training Sensitivity" (not "Learning Rate" as label)
- ✓ "Training Progression" (not "Batch Size" as label)
- ✓ "Training Repetition" (not "Epochs" as label)
- ✓ Engine features are display-only
- ✓ No Rank/Alpha/Dropout references

---

## SECTION 12: Error Handling & Edge Cases

**No Metrics Available:**
- Reason: Job queued but not started
- Display: "Waiting for training to start..." with loading animation
- Resolution: Metrics appear when job starts

**Stale Data:**
- Detection: Last update >30 seconds ago
- Visual: Orange text for "Last updated" timestamp
- Action: "Refresh" button in card header

**Connection Lost:**
- Display: Yellow "Reconnecting..." indicator
- Automatic retry with exponential backoff
- Toast: "Connection restored" when back online

---

## Design System Consistency

**Reused from E01-E08:**
- Card styling (borders, shadows, padding)
- Table styling (headers, rows, hover states)
- Badge components (status indicators)
- Typography scale
- Color palette
- Icons

**Components from E08_v2:**
- `engine-features-panel` — Same styling, adds "Active" badge
- Config summary uses same terminology as E08_v2 controls

**Color Coding:**
- Green: Improving metrics, active/healthy state
- Gray: Stable metrics, neutral information
- Blue: Informational panels
- Orange: Warnings, stale data

---

**End of E09_v2 Wireframe Prompt**

This wireframe prompt builds upon E08_v2, maintaining exact component IDs and lay-person terminology for cross-prompt consistency. Specialized evaluation metrics are intentionally excluded as they can only be computed post-training and will appear in E10_v2 (Training Results).

