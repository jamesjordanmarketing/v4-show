# LoRA Pipeline - Stage 3 Combined Figma Wireframe Prompt

**Version:** 1.0
**Date:** 2025-12-19
**Stage:** Stage 3 — Error Handling & Recovery
**Section ID:** E03
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E03.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E03.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E03-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 3 — Error Handling & Recovery - Complete Integrated Wireframe System

**Context Summary**

This stage covers comprehensive error handling and recovery for LoRA fine-tuning training jobs. When training fails due to Out of Memory (OOM) errors, dataset validation issues, GPU provisioning failures, or spot instance interruptions, the system detects issues, provides clear explanations, and offers quick recovery paths. The interface transforms technical failures into actionable moments, guiding users from problem understanding to successful resolution with minimal friction. Users can retry with intelligent configuration adjustments, resume from checkpoints, or switch infrastructure options—all designed to maintain confidence and minimize wasted time and cost.

**Journey Integration**

- **Stage 3 User Goals:** Monitor training execution, understand what went wrong when failures occur, quickly recover from errors, learn to prevent repeat failures, maintain confidence in system reliability
- **Key Emotions:** Anxiety reduction through clear explanations, confidence building with actionable guidance, relief at quick recovery options, trust in automatic recovery systems
- **Progressive Disclosure:**
  * Basic: Error message with primary fix button (one-click resolution)
  * Advanced: Configuration adjustment options, cost comparisons, recovery strategies
  * Expert: Detailed analytics, pattern tracking, historical data (removed for POC)
- **Persona Adaptations:** Serves AI engineers and operations managers with accessible language, technical depth available on-demand, focus on fast recovery over detailed analysis

**Wireframe Goals**

- Enable immediate understanding of any training error (OOM, data, provisioning, interruption)
- Provide one-click or two-click recovery paths for every error type
- Display clear status during automatic recovery processes
- Allow strategic configuration adjustments when resuming failed jobs
- Track and display interruption/recovery history at a glance
- Maintain cost transparency through recovery decisions
- Support responsive design for desktop and mobile viewing

**Explicit UI Requirements**

---

### COMPONENT 1: Unified Error Modal Framework

All error modals share a consistent structure with error-specific content:

**Modal Shell (Shared Across All Errors):**
- Full-screen modal with semi-transparent overlay (dims background)
- Non-dismissable for critical errors (must select recovery action)
- Header area: Error icon (color-coded) + Error type title
- Subheader: Brief context of what happened
- Content area: Error-specific details and explanation
- Footer: Recovery action buttons (Primary, Secondary, Tertiary)

**Color Coding:**
- OOM Error: Red icon (memory exceeded)
- Dataset Error: Orange icon (data validation)
- Provisioning Error: Blue icon (infrastructure)
- Spot Interruption: Yellow/Orange icon (temporary disruption)

---

### COMPONENT 2: OOM Error Display (FR3.1.1 - Simplified)

**Header:**
- Icon: Red circle with prohibition symbol
- Title: "Training Failed: Out of Memory"
- Subheader: "Your configuration requires more GPU memory than available"

**Problem Statement Card:**
- Red-bordered card with warning icon
- Title: "What Happened"
- Text: "Your training configuration exceeded the 80GB VRAM capacity of the H100 GPU. The model ran out of memory at step {step} ({percentage}% complete)."
- Simple VRAM summary: "Estimated VRAM needed: {X}GB | Available: 80GB | Shortage: {Y}GB"

**Recommended Fix Card (Highlighted in Green):**
- Badge: "Recommended" + "95% success rate"
- Title: "Reduce Batch Size"
- Change display: "batch_size: 4 → 2" (strikethrough old value, bold green new value)
- Impact line: "This will reduce VRAM usage and prevent the error. Training will take ~15% longer."
- Large green button: "Retry with batch_size=2"

**Alternative Fix (Secondary):**
- Badge: "Alternative" + "98% success rate"
- Title: "Switch to Conservative Preset"
- Brief text: "Uses lower rank and batch size. Slightly reduced quality, highest reliability."
- Blue button: "Retry with Conservative Preset"

**Footer Actions:**
- "Edit Configuration Manually" (text link) - Opens job config with suggested values
- "Cancel" (text link) - Returns to job dashboard

**States:**
- Initial display (showing error + fixes)
- Loading after retry click ("Creating retry job...")
- Redirect to new job dashboard

---

### COMPONENT 3: Dataset Error Display (FR3.1.2 - Simplified)

**Header:**
- Icon: Orange document with X mark
- Title: "Dataset Validation Failed"
- Subheader: "{X} errors found in training file"

**First Error Card (Primary Display):**
- Orange-bordered card
- Title: "First Error Found"
- Specific error: "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"
- Location: "File position: conversations[46].training_pairs[0].target_response"
- Conversation context: "Persona: Anxious Investor | Topic: Retirement Planning"

**Fix Guidance Section (Collapsible):**
- Title: "How to Fix"
- Step 1: "Open the conversation in the editor to add the missing field"
- Step 2: "After fixing all errors, regenerate the training file"
- Step 3: "Retry creating the training job"

**Footer Actions:**
- Primary: "Open Conversation Editor" (blue button) - Deep links to /conversations/{id}/edit
- Secondary: "Regenerate Training File" (gray button, disabled until fixes applied)
- "View All {X} Errors" (text link) - Expands to simple list of other errors
- "Cancel" (text link)

**States:**
- Initial display (first error shown)
- All errors expanded (simple list)
- Editor opened (new tab, modal remains)
- Regenerating (progress: "Regenerating... 156 of 242 conversations")
- Regeneration complete ("Training file regenerated. Ready to retry.")

---

### COMPONENT 4: GPU Provisioning Error Display (FR3.1.3 - Simplified)

**Header:**
- Icon: Blue gear with warning symbol
- Title: "GPU Provisioning Failed"
- Subheader: "Unable to provision spot GPU"

**Problem Statement Card:**
- Blue-bordered card
- Title: "What Happened"
- Text: "No H100 spot GPUs are currently available. High demand in datacenter."
- Availability indicator: "Spot Availability: Low (8% free)" with red indicator
- Context: "Typical peak hours: 9 AM - 5 PM PST on weekdays"

**Recovery Option 1 (Recommended):**
- Green-highlighted card
- Badge: "Recommended"
- Title: "Auto-Retry (Wait for Spot)"
- Description: "Automatically retry every 5 minutes until GPU becomes available"
- Details: "Max wait: 1 hour | Est. wait: 15-30 minutes | No extra cost"
- Green button: "Enable Auto-Retry"

**Recovery Option 2 (Alternative):**
- Blue card
- Title: "Switch to On-Demand GPU"
- Description: "Start training immediately with guaranteed availability"
- Cost comparison: "Spot: $2.49/hr → On-Demand: $7.99/hr (+$5.50/hr premium)"
- Total cost impact: "Estimated additional cost: +$XX for this job"
- Blue button: "Switch to On-Demand"

**Footer Actions:**
- "Cancel Job" (gray button) - Cancels and returns to job list
- "Try Again Later" (text link)

**States:**
- Initial display (showing options)
- Auto-retry enabled (transitions to Component 5)
- Switching to on-demand (loading, then job starts)

---

### COMPONENT 5: Auto-Retry Progress (FR3.1.3 - Simplified)

**Displayed after enabling auto-retry for GPU provisioning:**

**Status Banner (On Job Dashboard):**
- Yellow pulsing badge: "Waiting for GPU"
- Status text: "Auto-retry in progress"

**Progress Card:**
- Title: "Waiting for Spot GPU"
- Progress indicator: "Attempt 3 of 12"
- Time tracking: "Waiting for 15 minutes (max: 1 hour)"
- Countdown: "Next attempt in 2m 30s" (updates every second)

**Action Options (Always Available):**
- "Switch to On-Demand Now" (blue button) - Can change strategy mid-wait
- "Cancel Auto-Retry" (text link)

**States:**
- Attempting (attempt 1-12, countdown running)
- Between attempts (waiting for next retry)
- Success: GPU provisioned → Notification: "GPU provisioned! Training starting..."
- Timeout (after 1 hour): Shows extended options modal

**Timeout Modal (After 1 Hour):**
- Title: "Still Waiting for Spot GPU"
- Text: "No spot GPUs became available after 1 hour of retrying."
- Options:
  - "Continue Waiting (extend to 2 hours)" - extends timeout
  - "Switch to On-Demand Now" (recommended) - guaranteed start
  - "Cancel Job" - gives up

---

### COMPONENT 6: Spot Interruption - Recovery Progress (FR3.2.1 - Simplified)

**Notification Toast (Immediate on Interruption):**
- Orange informational toast (not error)
- Text: "Training interrupted at {percentage}% complete. Auto-recovery in progress..."
- Action: "Track Status" link
- Auto-dismisses after 5 seconds

**Status Badge (On Job Dashboard):**
- During recovery: Orange pulsing badge "Recovering"
- Stages displayed (checkmarks for complete, spinner for active, gray for pending):
  1. "Detecting interruption" ✓
  2. "Provisioning new GPU" ⟳ (spinner)
  3. "Downloading checkpoint" (gray)
  4. "Restoring training state" (gray)
  5. "Resuming training" (gray)
- Time estimate: "Est. recovery: 5-8 minutes"

**States:**
- Interrupted (toast appears)
- Recovering (5-stage progress)
- Resumed (success notification + badge update)

---

### COMPONENT 7: Spot Interruption - Resumed (FR3.2.1 - Simplified)

**Success Notification Toast:**
- Green success toast
- Text: "Training resumed from checkpoint (Step {step}). Downtime: {X} minutes."
- Auto-dismisses after 5 seconds

**Interruption Badge (Persistent on Job Card/Dashboard):**
- Orange badge with checkmark: "Interrupted {N}× (auto-recovered)"
- Tooltip on hover: "This job was interrupted {N} times and recovered automatically. Total downtime: {X} minutes."
- Click badge → Shows simple summary (not full modal):
  - "Interruption #1: Step 500, 9 min recovery"
  - "Interruption #2: Step 1200, 7 min recovery"
  - "Total downtime: 16 minutes"

**Status Badge Update:**
- Changes from "Recovering" → "Training" (green, resumed)
- Progress continues from checkpoint step

---

### COMPONENT 8: Recovery Failure - Options (FR3.2.1/FR3.1.3 - Simplified)

**Displayed after 3 failed recovery attempts:**

**Modal Header:**
- Icon: Yellow warning triangle
- Title: "Recovery Failed After 3 Attempts"
- Subheader: "Unable to provision replacement spot GPU"

**Problem Card:**
- Text: "We tried to recover your training 3 times but couldn't provision a new spot GPU due to high datacenter demand."
- Progress preserved: "Your training checkpoint at step {step} is saved. No data lost."

**Recovery Options:**

**Option 1 (Recommended for jobs >50% complete):**
- Green-highlighted card
- Badge: "Recommended"
- Title: "Switch to On-Demand GPU"
- Text: "Guaranteed recovery. Training will resume within 5 minutes."
- Cost: "Additional cost: +$XX for remaining work"
- Green button: "Switch to On-Demand & Resume"

**Option 2:**
- Gray card
- Title: "Keep Trying Spot"
- Text: "Continue waiting for spot GPU availability. May take hours during peak times."
- Gray button: "Continue Waiting"

**Option 3:**
- Text link
- "Cancel Job" - Preserves checkpoint for later manual resume

**States:**
- Initial display (showing 3 options)
- Switching to on-demand (loading, then recovery resumes)
- Continuing to wait (returns to auto-retry progress)

---

### COMPONENT 9: Resume Configuration Modal (FR3.2.2 - Simplified)

**Trigger:** "Resume from Step {X}" button on failed job with checkpoint

**Modal Header:**
- Title: "Resume Training from Checkpoint"
- Subheader: "Continue from step {step} ({percentage}% complete)"
- Close button (X) - modal is dismissable

**Original Job Summary Card:**
- Job name: "{original_job_name}"
- Status: "Failed" (red badge) + brief reason
- Progress before failure: "Completed step {step} of {total_steps}"
- Time elapsed: "{X}h {Y}m"
- Cost spent: "${cost}"
- Checkpoint: "Step {step}, saved {time} ago"

**Remaining Work Card:**
- Title: "Remaining Work"
- Steps: "{remaining_steps} steps (~{epochs} epochs)"
- Duration: "{X}h - {Y}h estimated"
- Cost: "${min} - ${max} (based on selected GPU type)"

**Configuration Adjustments (Simplified):**

**GPU Type Toggle:**
- Label: "GPU Type"
- Toggle: [Spot Instance] [On-Demand Instance]
- If original failure was spot interruption loop: Pre-select On-Demand with note "Recommended to avoid further interruptions"
- Cost impact displayed: "Spot: $XX | On-Demand: $YY (+$ZZ)"

**Batch Size (Only shown if original error was OOM):**
- Label: "Batch Size"
- Current: "{original}" (displayed)
- Dropdown or slider: Options 1, 2, 4
- Suggested value highlighted: "2 (recommended to prevent OOM)"
- VRAM note: "Estimated VRAM: {X}GB (within 80GB capacity)"

**Confirmation Section:**
- Checkbox (required): "I understand this will create a new job continuing from step {step}"
- Changes summary: "Configuration changes: GPU type: Spot → On-Demand, Batch size: 4 → 2"
- Warning (if no changes made): "No changes made. If original failure was a configuration issue, consider adjusting settings."

**Footer Actions:**
- Primary: "Resume Training" (green button) - Disabled until checkbox checked
- Secondary: "Reset to Original" (text link) - Reverts changes
- "Cancel" (text link)

**States:**
- Modal open (default config)
- Config adjusted (cost updates in real-time)
- Checkbox checked (Resume button enabled)
- Creating continuation ("Creating continuation job...")
- Success (redirect to new job dashboard)

---

### COMPONENT 10: Retry Confirmation Modal (FR3.3.1/FR3.3.2 - Merged)

**Trigger:** "Retry Job" or "Retry with Suggested Fix" button on failed job

**Modal Header:**
- Title: "Retry Training Job"
- Subheader: "Create a new job from the failed configuration"
- Close button (X) - dismissable

**Original Job Summary Card:**
- Job name: "{original_job_name}"
- Status: "Failed" (red badge)
- Failure reason: "{error_type}: {brief message}"
- Failed at: "Step {step} ({percentage}% complete)"
- Time before failure: "{X}h {Y}m"
- Cost spent: "${cost}"

**Retry Configuration Section:**

**If Simple Retry (no suggestions):**
- Title: "Configuration"
- Display: Training file, Preset, GPU type, Key parameters
- Note: "Configuration cloned from original job"
- Badge: "Same configuration"

**If Suggested Fix Available (OOM or known error):**
- Title: "Recommended Changes"
- Highlighted change card:
  - Badge: "Suggested Fix" + "{X}% success rate"
  - Change: "batch_size: 4 → 2" (strikethrough red, bold green)
  - Impact: "Prevents OOM error. Training ~15% longer."
- Checkbox: "Apply suggested fix" (checked by default)
- Note: "Uncheck to retry with same configuration (not recommended)"

**Cost Estimate:**
- "Estimated cost: ${min} - ${max}"
- Comparison: "Original estimate: ${orig} | Already spent: ${spent}"

**Retry Guidance (Brief):**
- If transient error (network, provisioning): "Retry recommended - {X}% success rate for this error type"
- If persistent error (OOM, data): "Configuration change recommended - simple retry has {X}% success rate"

**Job Name:**
- Auto-generated: "{original_name} (Retry #1)"
- Editable text field

**Footer Actions:**
- Primary: "Retry Job" (blue button) - or "Retry with Fix" if suggestion applied
- Secondary: "Edit Configuration" (text link) - Opens full config editor
- "Cancel" (text link)

**States:**
- Initial display (review context)
- Fix checkbox toggled (updates cost estimate)
- Creating retry ("Creating retry job...")
- Success (redirect to new job dashboard with retry indicator)

---

### COMPONENT 11: Job Dashboard - Active States (All FRs Consolidated)

**Job Card/Row Status Indicators:**

**Normal States:**
- "Queued" (gray badge)
- "Provisioning" (blue pulsing badge)
- "Training" (green badge) + progress bar
- "Completed" (green checkmark badge)
- "Failed" (red badge)
- "Cancelled" (gray badge)

**Recovery/Retry States:**
- "Waiting for GPU" (yellow pulsing badge) - Auto-retry in progress
- "Recovering" (orange pulsing badge) - Spot interruption recovery
- "Resumed" (green badge with arrow) - Continuing from checkpoint

**Interruption Badge:**
- Orange badge with number: "Interrupted 2×"
- Clickable for summary

**Retry Indicator:**
- Small badge: "Retry #2"
- Link: "View original job"

**Failed Job Actions (Button Row):**
- If checkpoint available: "Resume from Step {X}" (primary)
- If suggestions available: "Retry with Fix" (primary), "Retry" (secondary)
- If no suggestions: "Retry" (primary)

**Cost Display:**
- Estimated vs Actual
- For resumed/retry jobs: Combined total from all attempts

---

### COMPONENT 12: Mobile Layouts (Responsive)

**Mobile Error Modal:**
- Full-screen on mobile (no overlay visible)
- Stacked layout (all content in single column)
- Larger touch targets for buttons (min 44px height)
- Simplified content (hide secondary details by default)
- Fixed footer with primary action button

**Mobile Job Dashboard:**
- Cards instead of table rows
- Status badge prominently displayed at top of card
- Action buttons stacked vertically
- Swipe gestures for common actions (optional enhancement)

**Mobile Recovery Progress:**
- Simplified progress indicator (circular instead of stepped)
- Larger countdown timer display
- Bottom sheet for additional options

---

**Interactions and Flows**

1. **OOM Error Flow:**
   - Training fails with OOM → Error modal appears
   - User sees problem + recommended fix (batch_size reduction)
   - User clicks "Retry with batch_size=2"
   - System creates new job with adjusted config → Training starts
   - Job passes previously failed step → Success

2. **Dataset Error Flow:**
   - Job creation attempted → Validation fails → Error modal appears
   - User sees first error with location
   - User clicks "Open Conversation Editor" → Fixes data
   - User clicks "Regenerate Training File" → File regenerates
   - User retries job creation → Training starts

3. **GPU Provisioning Flow:**
   - Job queued → Provisioning fails → Error modal appears
   - User sees availability status + recovery options
   - User selects "Enable Auto-Retry" → Waits for spot
   - OR User selects "Switch to On-Demand" → Training starts immediately
   - GPU provisioned → Training begins

4. **Spot Interruption Flow:**
   - Training active → Spot interrupted → Toast notification
   - System automatically provisions new GPU, downloads checkpoint
   - Recovery progress shown on dashboard
   - Training resumes → User sees "Interrupted 1×" badge
   - Job completes normally

5. **Resume from Checkpoint Flow:**
   - Job failed with checkpoint available → Resume button visible
   - User clicks "Resume from Step 850"
   - User optionally adjusts GPU type or batch size
   - User confirms → Continuation job created
   - Training resumes from checkpoint

6. **Simple Retry Flow:**
   - Job failed (transient error) → Retry button visible
   - User clicks "Retry Job" → Confirmation modal
   - User reviews config, sees retry success guidance
   - User confirms → New job created with same config
   - Training starts fresh

7. **Suggested Fix Retry Flow:**
   - Job failed (OOM or known issue) → Retry with Fix button visible
   - User clicks "Retry with Suggested Fix" → Modal shows recommended change
   - User reviews suggested fix (batch_size 4→2, 95% success)
   - User confirms with fix applied → New job with adjusted config
   - Training succeeds

---

**Visual Feedback**

- **Error States:** Red accent colors for critical errors, orange for warnings
- **Success States:** Green for successful recovery, completion, valid configurations
- **Progress Indicators:** Pulsing badges during active processes, spinners on buttons during loading
- **Status Transitions:** Smooth badge color changes, toast notifications for key events
- **Cost Comparisons:** Color-coded (green=savings/cheap, red=expensive/premium)
- **Configuration Changes:** Strikethrough (red) for old values, bold (green) for new values
- **Confidence Ratings:** Green progress bars for high confidence, yellow for medium
- **Loading States:** Spinner inside buttons, "Creating..." text, disabled state
- **Hover/Focus States:** Subtle highlight on all interactive elements

---

**Accessibility Guidance**

- **Modal Focus Trapping:** Tab cycles within modal only, first focus on primary action
- **Keyboard Navigation:** All interactive elements reachable via Tab, Enter activates, Escape closes modal
- **Screen Reader Announcements:**
  - "Training failed due to out of memory error. Recommended fix: reduce batch size to 2"
  - "Auto-recovery in progress. Step 2 of 5: Provisioning new GPU"
  - "Training resumed successfully. 1 interruption recovered"
- **ARIA Labels:** All buttons have descriptive labels (e.g., "Retry training job with reduced batch size")
- **Color Independence:** Icons + text used alongside color (not color alone)
- **Contrast:** Minimum 4.5:1 for all text, 3:1 for large text and UI components
- **Touch Targets:** Minimum 44x44px on mobile
- **Focus Indicators:** Visible blue outline on keyboard navigation

---

**Information Architecture**

**Error Modal Structure:**
- Header (error type identification)
- Problem Section (what happened)
- Recovery Options (what to do)
- Footer Actions (buttons to execute recovery)

**Job Dashboard Structure:**
- Job list/cards with status badges
- Failed jobs show recovery action buttons
- Interrupted jobs show recovery status
- Retry/resumed jobs link to originals

**Recovery Flow Hierarchy:**
1. Error detection and modal display (immediate)
2. Problem understanding (2-3 seconds reading)
3. Recovery option selection (user decision)
4. Execution and feedback (loading → success/redirect)

---

**Page Plan**

**Total Wireframe Pages: 12**

1. **Error Modal - OOM Error**
   - Purpose: Display OOM failure with VRAM issue and recommended fix
   - Key Elements: Error header, problem statement, simplified VRAM info, recommended fix card, retry button
   - States: Initial view, loading after retry click

2. **Error Modal - Dataset Validation Error**
   - Purpose: Display validation failure with first error and fix guidance
   - Key Elements: Error header, first error details, fix steps, open editor button
   - States: Initial view, all errors expanded, regeneration progress

3. **Error Modal - GPU Provisioning Error**
   - Purpose: Display spot unavailability with recovery options
   - Key Elements: Error header, availability indicator, auto-retry card, on-demand card
   - States: Initial view, option selected

4. **Auto-Retry Progress Display**
   - Purpose: Show ongoing GPU retry attempts
   - Key Elements: Attempt counter, countdown timer, switch options
   - States: Attempting, between attempts, timeout reached

5. **Spot Interruption - Recovery In Progress**
   - Purpose: Show automatic recovery stages
   - Key Elements: Status badge, 5-stage progress, time estimate
   - States: Stage 1-5 progression

6. **Spot Interruption - Successfully Resumed**
   - Purpose: Show successful recovery with interruption badge
   - Key Elements: Success toast, interruption badge, downtime summary
   - States: Resumed, badge hover showing summary

7. **Recovery Failure - Extended Options**
   - Purpose: Offer fallback options after 3 failed recovery attempts
   - Key Elements: Failure message, on-demand recommendation, continue waiting, cancel
   - States: Initial display, option selected

8. **Resume Configuration Modal**
   - Purpose: Configure job continuation from checkpoint
   - Key Elements: Original job summary, remaining work, GPU toggle, batch size (if OOM), confirmation
   - States: Default config, adjusted config, confirmation

9. **Retry Confirmation Modal**
   - Purpose: Review and confirm job retry with optional suggested fix
   - Key Elements: Failure context, suggested fix toggle, cost estimate, retry button
   - States: Simple retry, with suggested fix, creating job

10. **Job Dashboard - Error & Recovery States**
    - Purpose: Show job cards with various status badges and actions
    - Key Elements: Status badges, interruption badge, retry indicator, action buttons
    - States: Failed, waiting for GPU, recovering, resumed, retry job

11. **Mobile Layout - Error Modal**
    - Purpose: Responsive error modal for mobile devices
    - Key Elements: Full-screen modal, stacked layout, large touch buttons
    - States: Any error type adapted for mobile

12. **Mobile Layout - Job Dashboard**
    - Purpose: Responsive job list for mobile devices
    - Key Elements: Card layout, status badges, stacked actions
    - States: Various job states on mobile

---

**Annotations (Mandatory)**

Attach notes to UI elements in Figma citing:
1. Which FR(s) the element fulfills (e.g., "FR3.1.1: OOM Error Detection")
2. Acceptance criteria number it maps to
3. State variations this element has

**Example annotations:**
- OOM Error Modal Header: "FR3.1.1: Detect OOM error in logs, display modal with problem statement"
- Recommended Fix Card: "FR3.1.1 + FR3.3.2: Quick retry button with suggested fix, 95% success rate badge"
- Dataset Error First Error: "FR3.1.2: Specific error identifying conversation ID, field path, and fix guidance"
- GPU Availability Indicator: "FR3.1.3: Visual indicator showing Spot Availability: Low (8% free capacity)"
- Auto-Retry Progress: "FR3.1.3: Retry every 5 minutes, max 1 hour, attempt counter"
- Interruption Badge: "FR3.2.1: Dashboard display showing 'Interrupted 2× (auto-recovered)'"
- Recovery Progress Stages: "FR3.2.1: 5-stage recovery workflow (detect → provision → download → restore → resume)"
- Resume Button: "FR3.2.2: Resume from Checkpoint button on failed jobs with available checkpoints"
- Configuration Toggle: "FR3.2.2: Switch GPU type with cost comparison"
- Retry Button: "FR3.3.1: One-click retry with cloned configuration"
- Suggested Fix Checkbox: "FR3.3.2: Apply recommended parameter changes with confidence rating"

---

**Acceptance Criteria → UI Component Mapping**

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Detect OOM error in training logs | FR3.1.1 | Page 1 | Error Modal | Triggered on OOM | Modal appears automatically |
| Display VRAM exceeded message | FR3.1.1 | Page 1 | Problem Statement Card | Error display | Simplified: total vs capacity |
| Show recommended fix with confidence | FR3.1.1 + FR3.3.2 | Page 1 | Recommended Fix Card | Default view | 95% success badge |
| One-click retry with fix applied | FR3.1.1 + FR3.3.2 | Page 1 | Retry Button | Enabled | Creates job with batch_size=2 |
| Validate training file before job creation | FR3.1.2 | Page 2 | Validation system | Pre-job check | Blocks if errors |
| Display specific error with location | FR3.1.2 | Page 2 | First Error Card | Error details | Conversation ID, field path |
| Open conversation editor deep link | FR3.1.2 | Page 2 | Open Editor Button | Action | Opens in new tab |
| Regenerate training file | FR3.1.2 | Page 2 | Regenerate Button | Progress | Shows regeneration status |
| Display spot availability status | FR3.1.3 | Page 3 | Availability Indicator | Real-time | Low/Medium/High |
| Auto-retry every 5 minutes | FR3.1.3 | Pages 3-4 | Auto-Retry Option | Enabled | Max 12 attempts |
| Show countdown to next retry | FR3.1.3 | Page 4 | Progress Card | Countdown | Updates every second |
| Switch to on-demand mid-retry | FR3.1.3 | Page 4 | Switch Button | Available | Always accessible |
| Cost comparison spot vs on-demand | FR3.1.3 | Pages 3, 8 | Cost Display | Comparison | $2.49 vs $7.99/hr |
| Detect spot interruption via webhook | FR3.2.1 | Page 5 | System detection | Automatic | Triggers recovery |
| Show 5-stage recovery progress | FR3.2.1 | Page 5 | Progress Stages | Stages 1-5 | Checkmarks + spinner |
| Display interruption badge | FR3.2.1 | Pages 6, 10 | Interruption Badge | Persistent | "Interrupted 2×" |
| Show downtime summary | FR3.2.1 | Page 6 | Badge Hover/Click | Summary | Total minutes |
| Recovery failure after 3 attempts | FR3.2.1 | Page 7 | Failure Modal | Displayed | Offers alternatives |
| Resume from checkpoint button | FR3.2.2 | Page 8 | Resume Button | On failed job | Visible if checkpoint exists |
| Display remaining work estimate | FR3.2.2 | Page 8 | Remaining Work Card | Calculated | Steps, hours, cost |
| GPU type toggle on resume | FR3.2.2 | Page 8 | Toggle Control | Spot/On-Demand | Updates cost estimate |
| Batch size adjustment for OOM | FR3.2.2 | Page 8 | Dropdown/Slider | If OOM | Shows VRAM estimate |
| Create continuation job | FR3.2.2 | Page 8 | Resume Button | Confirmation | Links to original |
| Retry button on failed jobs | FR3.3.1 | Page 9 | Retry Button | Visible | For all failed jobs |
| Clone configuration for retry | FR3.3.1 | Page 9 | Config Display | Preview | Same settings shown |
| Auto-increment retry counter | FR3.3.1 | Page 9 | Job Name | Auto-generated | "Job (Retry #2)" |
| Display retry success guidance | FR3.3.1 + FR3.3.2 | Page 9 | Guidance Text | Context-aware | Based on error type |
| Show suggested fix with toggle | FR3.3.2 | Page 9 | Fix Toggle | Checked default | Apply/unapply fix |
| Display configuration change | FR3.3.2 | Page 9 | Change Display | Diff format | Strikethrough → bold |
| Status badges on job dashboard | All FRs | Page 10 | Status Badges | Multiple | Training, Failed, Recovering, etc. |
| Mobile responsive error modal | All FRs | Page 11 | Mobile Modal | Adapted | Full-screen, stacked |
| Mobile responsive dashboard | All FRs | Page 12 | Mobile Cards | Adapted | Card layout, touch targets |

---

**Non-UI Acceptance Criteria**

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| OOM detection in training logs | Triggers modal display | System detects within 60 seconds |
| VRAM calculation engine | Provides data for display | Server-side calculation |
| Job status database update | Enables UI status badges | Immediate update on failure |
| Checkpoint saving every 100 steps | Enables resume option | Stored in cloud storage |
| Interruption webhook handling | Triggers recovery UI | Webhook → status update |
| GPU provisioning retry logic | Background attempts | UI shows progress |
| Retry job creation workflow | Creates new job record | Response in <3 seconds |
| Job continuation linking | Enables "view original" | Database relationship |
| Cost calculation for estimates | Real-time updates | 300ms update delay |
| Success rate calculation | Informs confidence badges | Historical data query |

---

**Estimated Total Page Count**

**12 wireframe pages** covering:
1. OOM error modal with recommended fix
2. Dataset validation error with fix guidance
3. GPU provisioning error with recovery options
4. Auto-retry progress display
5. Spot interruption recovery in progress
6. Successful recovery with interruption badge
7. Recovery failure with fallback options
8. Resume configuration modal
9. Retry confirmation with suggested fix
10. Job dashboard with error/recovery states
11. Mobile error modal layout
12. Mobile job dashboard layout

**Rationale:**
- Demonstrates complete error handling flow from detection to resolution
- Covers all 7 FR categories in consolidated, integrated design
- Shows all key state transitions (error → recovery → success)
- Includes both automatic (interruption) and user-initiated (retry/resume) recovery
- Provides mobile responsive views for complete coverage
- Reduces original 40 pages to 12 by consolidating similar patterns
- Maintains all essential functionality while removing advanced/expert features
- Enables rapid POC validation of core error handling UX

---

## Final Notes for Figma Implementation

**Integration Requirements:**
- All error modals share consistent header/footer structure
- Recovery options are context-aware based on error type
- Cost estimates update in real-time when configuration changes
- Status badges reflect current job state accurately
- Interruption/retry indicators persist across sessions
- Mobile layouts adapt gracefully from desktop designs

**POC Simplifications Applied:**
- Removed: VRAM breakdown charts, multi-option comparisons, educational content
- Removed: Tabbed error modals, JSON viewers, quality scores
- Removed: Proactive warnings, quota management, team analytics
- Removed: Detailed interruption timelines, loss curve markers
- Removed: Configuration diff viewers, multiple fix selection
- Simplified: Single recommended fix instead of ranked options
- Simplified: Basic config adjustment (GPU + batch only)
- Simplified: Badge summaries instead of full modals

**State Management:**
- Error detection triggers appropriate modal immediately
- Recovery progress tracked and displayed in real-time
- Status badges update automatically on state changes
- Cost estimates recalculate on any configuration change
- Interruption counts persist and increment correctly

**Accessibility:**
- Full keyboard navigation throughout
- Screen reader announcements for all critical state changes
- Color-independent status indication
- Adequate touch targets for mobile

**Success Criteria:**
A user experiencing any training error should be able to:
1. Understand what went wrong in <10 seconds
2. See a clear recovery path with 1-2 options
3. Execute recovery with 1-2 clicks
4. Monitor progress during automatic recovery
5. Complete successful retry/resume within reasonable time
6. Track error history via badges and indicators

All within a cohesive, integrated system that handles OOM errors, dataset issues, GPU provisioning, and spot interruptions consistently.
