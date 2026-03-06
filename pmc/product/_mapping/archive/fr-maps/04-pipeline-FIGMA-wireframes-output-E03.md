# FIGMA Wireframe Prompts — Stage 3: Error Handling & Recovery

This file contains self-contained, Figma-ready wireframe prompts for all FRs in Stage 3.

**Generated**: 2025-12-18  
**Section**: E03 - Error Handling & Recovery  
**Stage**: Stage 3 — Error Handling & Recovery  
**Journey Stage**: 3 (Training Execution & Monitoring)

---

=== BEGIN PROMPT FR: FR3.1.1 ===

Title
- FR3.1.1 Wireframes — Out of Memory Error Handling — Stage 3

Context Summary
- This feature implements intelligent Out of Memory (OOM) error detection, diagnosis, and resolution guidance for training jobs. When a GPU runs out of VRAM (>80GB on H100), the system detects the failure, calculates the VRAM shortage, and provides specific actionable recommendations with one-click retry options. The UI must transform a technical infrastructure failure into an educational, confidence-building moment that guides users to successful resolution with minimal friction. The target users are intermediate AI engineers who understand training concepts but need help with GPU memory optimization.

Journey Integration
- Stage 3 user goals: Monitor training execution, maintain confidence during issues, quickly recover from failures, understand what went wrong
- Key emotions: Anxiety reduction during errors, confidence building through clear guidance, relief at finding quick fixes, learning without frustration
- Progressive disclosure levels:
  * Basic: Clear error message, primary fix suggestion (reduce batch size), one-click retry
  * Advanced: VRAM calculation breakdown, multiple fix options with trade-offs, educational resources
  * Expert: Full technical details, OOM analytics patterns, team-wide insights
- Persona adaptations: Unified interface serving AI engineers, quality analysts, and technical leads - uses accessible language with technical depth available on-demand

Journey-Informed Design Elements
- User Goals: Understand what caused the OOM failure, identify the quickest fix, retry successfully without reconfiguring everything, learn to prevent future OOM errors
- Emotional Requirements: Reduce panic/frustration from cryptic error, build confidence with clear guidance, feel supported not blamed, celebrate successful retry
- Progressive Disclosure:
  * Basic: "Your configuration needs X GB more memory. Try reducing batch size to 2" with one button
  * Advanced: VRAM breakdown chart, multiple fix options with success rates, configuration comparison
  * Expert: Team OOM patterns, preset optimization recommendations, cost impact analysis
- Success Indicators: User understands cause in <30 seconds, selects appropriate fix confidently, retry succeeds on first attempt, learns to avoid OOM in future jobs

Wireframe Goals
- Display clear, non-technical explanation of OOM error and its cause
- Show calculated VRAM breakdown with visual comparison to 80GB limit
- Present ranked fix suggestions with confidence ratings and trade-off explanations
- Provide one-click retry buttons that auto-apply suggested fixes
- Include educational content explaining GPU memory concepts
- Track OOM patterns and refine recommendations over time
- Proactively warn users during job configuration if OOM risk detected

Explicit UI Requirements (from acceptance criteria)

**Error Detection & Job Status:**
- Full-screen modal triggered when job status = "failed" with error_type = "OutOfMemoryError"
- Modal is non-dismissable (must use action buttons, no X close)
- Prominent error icon (red circle with prohibition symbol 🚫)
- Header: "Training Failed: Out of Memory" in large, bold text
- Subheader: "Your configuration requires more GPU memory than available"

**Problem Statement Section:**
- Large text box with red border containing "What Happened" explanation
- Warning icon (⚠️) next to problem description
- Clear explanation: "Your training configuration exceeded the 80GB VRAM capacity of the H100 GPU. The model ran out of memory at step {step} during {stage} stage."
- Failed step and stage prominently displayed

**VRAM Breakdown Visualization:**
- Titled "Estimated VRAM Requirements"
- Horizontal stacked bar chart or breakdown list showing:
  - Base model (Llama 3 70B, 4-bit): 40GB (blue)
  - LoRA adapters (rank={r}): {X}GB (green)
  - Optimizer state: {Y}GB (purple)
  - Training batch (size={batch}): {Z}GB (orange)
  - Gradients & activations: {W}GB (yellow)
- Total row with red highlight if >80GB: "Total Estimated: {total}GB" 
- Available capacity line at 80GB with red "Shortage: {shortage}GB over capacity" label
- Root cause callout: "Primary issue: batch_size={batch} with rank={r} requires {X}GB more than available"

**Suggested Fixes Section (Ranked Cards):**
- Fix #1 (Primary Recommendation) - Green highlighted card:
  - Badge: "Recommended" with 95% success rate
  - Title: "Reduce batch_size from {current} to {suggested}"
  - Impact summary: "Will reduce VRAM usage by {X}GB, bringing total to {new_total}GB (✓ within capacity)"
  - Trade-off: "Training will take ~{percentage}% longer but will complete successfully"
  - Large green button: "Retry with batch_size={suggested}"
  - Confidence visualization: Progress bar or stars showing 95%

- Fix #2 (Alternative) - Blue card:
  - Badge: "Alternative" with 98% success rate
  - Title: "Switch to Conservative preset (rank=8 instead of {current_rank})"
  - Impact: "Reduces LoRA memory from {X}GB to {Y}GB, total VRAM: {new_total}GB"
  - Trade-off: "Lower model capacity, may reduce quality by ~5-10% but much safer"
  - Blue button: "Retry with Conservative Preset"

- Fix #3 (If needed) - Yellow card:
  - Badge: "If needed" with 80% success rate
  - Title: "Reduce maximum sequence length from {current} to {suggested}"
  - Impact: "Truncates very long conversations (>{suggested} tokens), reduces batch memory by {X}GB"
  - Trade-off: "May lose context from longest conversations (affects ~{percentage}% of dataset)"
  - Gray button: "Manually Adjust Configuration"

- Fix #4 (Last resort):
  - Gray text: "Use a smaller model or contact support for custom configuration"
  - Link: "Contact Support"

**Educational Resources (Collapsible Section):**
- Expandable "Learn More" accordion
- Title: "Why did this happen?"
- Simple explanation: "GPU VRAM (Video Memory) stores the model, training data, and calculations during training. Larger models, higher LoRA rank, and bigger batch sizes require more VRAM. The H100 GPU has 80GB capacity. Your configuration needed ~{X}GB."
- Simple bar chart showing VRAM breakdown with 80GB limit line
- Link: "Understanding VRAM Requirements in LoRA Training" (opens documentation in new tab)
- FAQ shortcuts as links:
  - "How do I prevent OOM?"
  - "What's the optimal batch_size?"
  - "Should I use Conservative preset?"

**Modal Footer Actions:**
- Primary button: "Retry with {recommended fix}" (green, prominent)
- Secondary button: "Manually Adjust Configuration" (opens config editor)
- Tertiary button: "Contact Support" (pre-fills ticket with error details)
- Cancel link: "Return to Job Dashboard"

**Proactive OOM Warning (During Job Configuration):**
- Warning modal appears if estimated_vram > 78GB before job creation
- Warning icon (⚠️) with yellow/orange styling
- Message: "High OOM Risk: Your configuration is estimated to use {X}GB of 80GB VRAM ({percentage}%). High risk of Out of Memory error."
- Recommendations list (same fixes as above)
- Action buttons:
  - "Adjust Configuration" (applies suggested fix)
  - "Proceed Anyway" (acknowledge risk, create job)
  - "Learn More" (documentation)
- Milder warning badge if 75-78GB: "⚠ Moderate OOM risk - consider reducing batch_size for safety"

**States to Show:**
- Initial error state (full modal with all details)
- Loading state when creating retry job ("Creating retry job with suggested fixes...")
- Success state after retry created ("Retry job created! Redirecting to job dashboard...")
- Configuration editor state (if user selects manual adjustment)

Interactions and Flows
1. User monitoring training job → OOM error detected → Full-screen error modal appears
2. User reads problem statement → Views VRAM breakdown chart → Understands memory shortage
3. User reviews Fix #1 (recommended) → Sees 95% confidence → Clicks "Retry with batch_size=2"
4. System creates new job with batch_size=2 → Shows loading indicator → Redirects to new job dashboard
5. Alternative flow: User clicks "Manually Adjust Configuration" → Config editor opens with suggested values pre-filled → User can further adjust → Creates job
6. Proactive flow: User configuring new job → System calculates estimated VRAM > 78GB → Warning modal appears → User adjusts batch_size before creating job

Visual Feedback
- Error modal uses red accent color for problem indicators
- Green for recommended fixes and success states
- Confidence ratings shown as progress bars (green=high, yellow=medium)
- VRAM chart uses color-coded bars with clear legend
- Trade-offs use +/- symbols with color coding (green for benefits, orange for trade-offs)
- Loading spinners with descriptive text during job creation
- Success toasts: "✓ Retry job created successfully"
- Hover states on all interactive elements with tooltips explaining details

Accessibility Guidance
- Modal must trap focus (keyboard navigation within modal only)
- First focus on primary "Retry with {fix}" button
- All interactive elements keyboard accessible (Tab, Enter, Escape)
- Screen reader announcements: "Training failed due to out of memory error. {X} fix suggestions available."
- ARIA labels on all buttons: "Retry training job with batch size reduced to 2"
- Color is not the only indicator (use icons + text)
- Minimum contrast ratio 4.5:1 for all text
- Error explanations readable at WCAG AA level
- Tooltips accessible via keyboard focus

Information Architecture
- **Modal Header**: Error type + brief summary
- **Problem Section**: What happened + why (VRAM exceeded)
- **Analysis Section**: VRAM breakdown + root cause
- **Solutions Section**: Ranked fix suggestions with confidence
- **Education Section**: Learn more (collapsible)
- **Actions Section**: Primary/secondary/tertiary buttons

Hierarchy:
1. Error header (most prominent)
2. VRAM visualization (visual understanding)
3. Fix #1 recommendation (primary action)
4. Alternative fixes (secondary options)
5. Manual configuration (advanced)
6. Educational resources (optional learning)

Page Plan
1. **OOM Error Modal - Initial State**
   - Purpose: Present error, explain cause, offer primary fix
   - Key elements: Error header, VRAM breakdown, Fix #1 card with retry button
   - States: Default view with all sections expanded except "Learn More"

2. **OOM Error Modal - Fix Selection & Comparison**
   - Purpose: Allow users to explore multiple fix options
   - Key elements: All 3 fix cards visible, comparison of trade-offs, confidence ratings
   - States: Multiple cards can be reviewed, tooltips show detailed explanations

3. **OOM Error Modal - Manual Configuration**
   - Purpose: Show configuration editor for advanced users
   - Key elements: Config form pre-filled with suggested values, diff highlighting changes from original
   - States: Editing mode, validation feedback, preview of changes

4. **Proactive OOM Warning (Job Configuration)**
   - Purpose: Prevent OOM before job starts
   - Key elements: Warning message, estimated VRAM display, fix suggestions
   - States: Warning level (high risk vs moderate risk), dismissed state

5. **Retry Job Creation Flow**
   - Purpose: Confirm retry job creation and redirect
   - Key elements: Loading indicator, success message, auto-redirect
   - States: Creating job, job created successfully

Annotations (Mandatory)
- Attach notes on UI elements referencing specific acceptance criteria they fulfill
- Include mapping table showing:
  - "Problem Statement Section" → US3.1.1 Criterion: "Error modal displays **Problem**: Your configuration exceeded 80GB VRAM" + FR3.1.1: "Problem Statement Section with red border and warning icon"
  - "VRAM Breakdown Chart" → FR3.1.1: "Calculated VRAM breakdown displayed with base model, LoRA adapters, optimizer state breakdown"
  - "Fix #1 Retry Button" → US3.1.1: "Quick retry button 'Retry with batch_size=2' pre-fills configuration" + FR3.1.1: "Quick Retry Buttons with primary action button"
  - "95% Success Rate Badge" → FR3.1.1: "Confidence badge: 95% success rate for this fix"
  - "Learn More Section" → US3.1.1: "Link to documentation: Understanding VRAM Usage" + FR3.1.1: "Educational Resources Section with FAQ shortcuts"
- Create a "Mapping Table" frame in Figma showing:
  | Acceptance Criterion | Screen | Component(s) | State(s) |
  |---------------------|---------|--------------|----------|
  | Detect OOM error in logs | OOM Error Modal | Error detection system | Failed state |
  | Job status → "failed" | Job Details Page | Status badge | Failed - OOM |
  | Problem statement display | OOM Error Modal | Problem card, VRAM chart | Default view |
  | VRAM calculation engine | OOM Error Modal | Breakdown visualization | Calculated state |
  | Suggested fixes ranked | OOM Error Modal | Fix cards 1-3 | Ranked by confidence |
  | Quick retry button | OOM Error Modal | Fix #1 card button | Enabled, clickable |
  | Proactive warning | Job Config Page | Warning modal | High risk detected |

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **Error Modal Design** (Source: FR3.1.1)
   - Screens: OOM Error Modal
   - Components: Full-screen modal, red error icon, header, subheader
   - States: Displayed when job fails with OOM
   - Notes: Non-dismissable, must use action buttons

2. **Problem Statement Section** (Source: US3.1.1 + FR3.1.1)
   - Screens: OOM Error Modal
   - Components: Red-bordered card, warning icon, explanatory text
   - States: Always visible
   - Notes: Explains what happened in user-friendly language

3. **VRAM Calculation & Visualization** (Source: FR3.1.1)
   - Screens: OOM Error Modal
   - Components: Horizontal bar chart/stacked bars, breakdown list, total with red highlight
   - States: Calculated values displayed, shortage highlighted
   - Notes: Shows base model (40GB) + LoRA + optimizer + batch + gradients vs 80GB limit

4. **Suggested Fixes Section** (Source: US3.1.1 + FR3.1.1)
   - Screens: OOM Error Modal
   - Components: 3-4 fix cards (green/blue/yellow), confidence badges, impact/trade-off text
   - States: Fix #1 highlighted as recommended
   - Notes: Ranked by effectiveness, shows success rates from historical data

5. **Quick Retry Buttons** (Source: US3.1.1 + FR3.1.1)
   - Screens: OOM Error Modal
   - Components: Primary button "Retry with batch_size=2", secondary "Retry with Conservative Preset"
   - States: Enabled (creates new job with suggested config)
   - Notes: Auto-applies configuration changes, shows diff confirmation before retry

6. **Configuration Diff Modal** (Source: FR3.1.1)
   - Screens: Retry Confirmation
   - Components: Side-by-side comparison, highlighted changes, "Apply Changes & Retry Training" button
   - States: Shown after clicking retry button
   - Notes: Displays "batch_size: 4 → 2 (recommended fix for OOM)"

7. **Educational Resources Section** (Source: US3.1.1 + FR3.1.1)
   - Screens: OOM Error Modal
   - Components: Collapsible "Learn More" accordion, explanation text, VRAM bar chart, documentation link, FAQ links
   - States: Collapsed by default, expands on click
   - Notes: Explains WHY OOM happened in simple terms, links to "Understanding VRAM Requirements" docs

8. **Proactive OOM Warning** (Source: FR3.1.1)
   - Screens: Job Configuration Page
   - Components: Warning modal, estimated VRAM display, fix suggestions, action buttons
   - States: Appears if estimated_vram > 78GB (high risk) or 75-78GB (moderate risk)
   - Notes: Prevents OOM before job starts, same fix options as post-OOM modal

9. **OOM Pattern Tracking Display** (Source: FR3.1.1)
   - Screens: Team Dashboard (Admin/Manager view)
   - Components: Team OOM rate card, problematic configurations list, cost impact summary
   - States: Updated with aggregate data
   - Notes: "12% of training jobs failed with OOM (last 30 days)", suggests team training needs

10. **Loading & Success States** (Source: FR3.1.1)
    - Screens: OOM Error Modal
    - Components: Loading spinner, success toast notification
    - States: Creating retry job → Job created → Redirecting
    - Notes: "Creating retry job with suggested fixes..." → "✓ Training completed successfully with suggested fix!"

Non-UI Acceptance Criteria

**Backend/System Logic (No Direct UI):**

1. **OOM Detection Logic** (Source: FR3.1.1)
   - Impact: Triggers UI modal display
   - Implementation: Webhook handler monitors training_webhook_events for error payloads, pattern matching on "OutOfMemoryError", "CUDA out of memory", GPU memory >95%
   - UI Hint: System must detect OOM within 60 seconds to display modal promptly

2. **Job Status Database Update** (Source: FR3.1.1)
   - Impact: Enables UI to query and display failed status
   - Implementation: UPDATE training_jobs SET status = 'failed', error_type = 'OutOfMemoryError'
   - UI Hint: Status badge updates immediately on job details page

3. **VRAM Calculation Engine** (Source: FR3.1.1)
   - Impact: Provides data for VRAM visualization
   - Implementation: Formula calculating base_model_memory_gb + lora_adapters_memory_gb + optimizer_state_memory_gb + batch_memory_gb + gradient_memory_gb
   - UI Hint: Calculations performed server-side, results passed to UI for rendering

4. **OOM Error Logging to Analytics** (Source: FR3.1.1)
   - Impact: Enables pattern tracking and recommendation refinement
   - Implementation: INSERT error_analytics (error_type, job_id, configuration_snapshot, vram_estimated, suggested_fix_applied)
   - UI Hint: Analytics data surfaces in team dashboard and improves suggestion confidence over time

5. **Preset Recommendation Updates** (Source: FR3.1.1)
   - Impact: Refines fix suggestions based on historical success
   - Implementation: Quarterly review of OOM analytics, adjust preset defaults if >20% OOM rate
   - UI Hint: Confidence ratings (95%, 98%) derived from historical success data

6. **Retry Job Creation Workflow** (Source: FR3.1.1)
   - Impact: Creates new job when user clicks retry button
   - Implementation: Clone job config, apply parameter changes, INSERT new training_job, link to original
   - UI Hint: Job creation must complete in <3 seconds for responsive UX

7. **Recovery Success Tracking** (Source: FR3.1.1)
   - Impact: Updates suggestion confidence ratings
   - Implementation: INSERT oom_resolution_success (original_job_id, retry_job_id, fix_applied, success = true/false)
   - UI Hint: Success/failure data improves future fix recommendations

8. **Email Follow-up** (Source: FR3.1.1)
   - Impact: Supports user outside UI
   - Implementation: Automated email 24 hours after OOM with resources and consultation offer
   - UI Hint: No direct UI impact, but improves user support experience

Estimated Page Count
- **5 screens/states** required to fully satisfy UI criteria:
  1. OOM Error Modal - Initial View (primary error display + Fix #1)
  2. OOM Error Modal - Fix Comparison View (all fixes expanded)
  3. Retry Confirmation Diff View (shows config changes before applying)
  4. Proactive OOM Warning Modal (during job configuration)
  5. Team OOM Analytics Dashboard (admin/manager view)

- **Rationale**: Error handling requires multiple states to guide users from problem understanding → fix selection → retry confirmation → prevention. Each state addresses specific acceptance criteria around transparency, education, and actionable guidance. Proactive warning prevents future OOM errors. Team analytics enable continuous improvement.

=== END PROMPT FR: FR3.1.1 ===

---

=== BEGIN PROMPT FR: FR3.1.2 ===

Title
- FR3.1.2 Wireframes — Dataset Format Error Handling — Stage 3

Context Summary  
- This feature implements comprehensive dataset format validation and error handling throughout the training pipeline lifecycle. When training data contains schema violations, missing fields, malformed JSON, or structural anomalies, the system detects issues during pre-flight validation (before job creation) or preprocessing stage, identifies specific problematic conversations with precise error locations, and provides step-by-step remediation guidance with deep links to editing interfaces. The UI transforms data quality failures into fixable issues with clear paths to resolution, preventing wasted GPU time and building user confidence in data integrity.

Journey Integration
- Stage 3 user goals: Ensure data quality before training starts, quickly identify and fix data errors, understand validation requirements, prevent training failures
- Key emotions: Frustration reduction when encountering data errors, relief at specific error locations (not vague messages), confidence in fix guidance, satisfaction after successful data correction  
- Progressive disclosure levels:
  * Basic: Error summary showing first critical error, quick fix button to conversation editor
  * Advanced: All errors list with filtering/sorting, detailed JSON preview with error highlighting, step-by-step fix guide
  * Expert: Validation error analytics, common error patterns, bulk error export for scripting
- Persona adaptations: Serves AI engineers and quality analysts who need precise error information to fix data issues efficiently

Journey-Informed Design Elements
- User Goals: Identify which conversations have errors, understand what fields are missing/malformed, fix data efficiently, regenerate valid training file, retry training successfully
- Emotional Requirements: Clear actionable guidance (not blame), specific error locations (not searching), confidence in fixes, quick resolution path
- Progressive Disclosure:
  * Basic: "Conversation #47 missing target_response field" + "Open in Editor" button
  * Advanced: JSON preview with error highlighted, all 15 errors listed, export errors as CSV
  * Expert: Validation rules documentation, automated fix suggestions, quality score tracking
- Success Indicators: User finds exact error location in <10 seconds, fixes all errors, training file regenerates successfully, training starts without validation errors

Wireframe Goals
- Display clear identification of problematic conversations with IDs and locations
- Show formatted JSON preview with error highlighting and context
- Provide step-by-step remediation workflow from error detection → fix → regeneration → retry
- Enable quick navigation to conversation editor with deep linking  
- Support multiple error types (missing field, invalid type, malformed JSON, encoding issues, duplicates)
- Prevent job creation if validation fails with clear blocking messaging
- Track validation error patterns to improve data generation quality

Explicit UI Requirements (from acceptance criteria)

**Pre-Flight Validation (Job Configuration Page):**
- Async validation triggered when user selects training file
- Loading indicator: "Validating training file..." with spinner
- Success state: "✓ Training file validated: {X} conversations, {Y} training pairs, all checks passed" (green badge)
- Failure state: "❌ Validation failed: {X} critical errors, {Y} warnings" (red banner)
- First 3 errors shown inline:
  - "1. Conversation #47: Missing target_response"
  - "2. Conversation #52: Malformed JSON"
  - "3. Conversation #89: Duplicate conversation_id"
- "View All Errors" button opens full error modal
- "Create Training Job" button disabled with tooltip: "Fix {X} validation errors before creating job"
- 10-second timeout for validation requests on large files (>5MB)

**Error Modal Design (Full-Screen):**
- Header: "Dataset Format Error" with document error icon (📄❌)  
- Subheader: "Training file validation failed. {X} errors found."
- Tab navigation at top:
  - "Error Summary" (default active tab)
  - "All Errors" (list view)
  - "Data Preview" (formatted JSON)
  - "Fix Guide" (remediation steps)
- Modal dismissable with X button (can return to job list and fix later)

**Error Summary Tab:**
- Displays first/most critical error prominently
- Problem card (red border):
  - Title: "Problem"
  - Text: "Training data validation failed during preprocessing. Your training file contains invalid data that cannot be processed."
- Specific Error card (highlighted):
  - "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"
  - "Location: conversations[46].training_pairs[0].target_response"
- Affected Conversation Details card:
  - "Conversation ID: conv_abc123"
  - "Persona: Anxious Investor"
  - "Emotional Arc: Triumph"
  - "Topic: Retirement Planning"  
  - "Training Pairs: 8 pairs total, error in pair #1"
- Error Impact note:
  - "This conversation cannot be used for training. {X} other conversations validated successfully."

**Data Sample Display (JSON Viewer):**
- Syntax-highlighted JSON viewer
- Shows 10 lines before and after error for context
- Error location marked with red background + arrow indicator
- Example format:
```json
{...context...}
"training_pairs": [
  {
    "prompt_context": "Elena discussing retirement...",
    "user_query": "How much should I save?",
    >>> "target_response": null, <<< ERROR: Missing required field
    "scaffolding_metadata": {...}
  }
]
```
- "Copy Conversation JSON" button for debugging
- Collapsible context (can hide/show abbreviated sections)

**All Errors Tab:**
- Paginated list (25 errors per page)
- Each error as collapsible card:
  - Card header: "{error_type}: Conversation #{index} (ID: {id})"
  - Card body: Field path, Error message, Suggested fix
- Sort options dropdown:
  - "By conversation number" (default)
  - "By error type"
  - "By severity"
- Filter dropdown:
  - "Show critical only"
  - "Show all"
- "Export Errors as CSV" button (bulk fixing)
- Pagination controls at bottom

**Fix Guide Tab (Step-by-Step Workflow):**
- Step 1: "Identify affected conversations"
  - List of conversation IDs with errors: "conv_abc123, conv_def456, conv_ghi789"
  - "Select all errored conversations" bulk action checkbox
- Step 2: "Open conversation editor to fix data"
  - Quick Fix buttons per conversation:
  - "Open conv_abc123 in Editor" (blue primary button)
  - Opens in new tab, preserves error modal context
- Step 3: "Fix specific field issues"
  - For each error shows:
    - Field name: target_response
    - Current value: null
    - Expected format/type: "Non-empty string"
    - Fix instruction: "Add target response text in conversation editor"
- Step 4: "Regenerate training file after fixes"
  - "Regenerate Training File" button (orange)
  - Progress indicator: "Regenerating... 156 of 242 conversations processed"
  - Completion message: "✓ Training file regenerated successfully. {X} conversations, {Y} training pairs."
  - Auto-validation runs after regeneration
- Step 5: "Retry training job"
  - "Create New Training Job" button (green, pre-selects regenerated file)
  - "Return to Job List" link

**Quick Action Buttons (Modal Footer):**
- "Open Conversation Editor" (primary, blue): Opens `/conversations/{affected_conversation_id}/edit` in new tab
- "Regenerate Training File" (secondary, orange): Disabled if conversations not yet fixed
- "Contact Support" (tertiary, gray): Pre-fills ticket with job ID, training file ID, error details
- "Dismiss" (text link): Closes modal

**Common Error Types Display:**
- Accordion/cards for each error type with:
  - Error name: "Missing Required Field"
  - Example: "Conversation #47 missing 'target_response'"
  - Fix instruction: "Add missing field in conversation editor. Field must be non-empty."
  - Validation rule: "Field exists and has non-null, non-empty value"
- Supported error types:
  - Missing Required Field
  - Invalid Data Type
  - Malformed JSON
  - Encoding Error
  - Token Length Exceeded
  - Duplicate ID
  - Empty Array

**Training File Quality Score:**
- Displayed on training file selector dropdown
- Format: "Training File Quality: 87/100 (Good - Minor warnings only)"
- Color coding:
  - 90-100: Green
  - 70-89: Yellow
  - <70: Red with warning "Recommend fixing errors first"
- Calculation shown in tooltip: "Base 100 - critical errors (-10 each) - warnings (-2 each) + bonuses"

**States to Show:**
- Pre-flight validation loading
- Pre-flight validation success (green badge)
- Pre-flight validation failure (red banner, disabled job creation)
- Error modal - Summary tab active
- Error modal - All Errors tab with pagination
- Error modal - Data Preview with JSON highlighting
- Error modal - Fix Guide step-by-step
- Regenerating training file progress
- Regeneration success confirmation
- Empty states: "No errors found", "All conversations validated"

Interactions and Flows
1. User selects training file in job config → System runs validation → Shows "Validating..." spinner
2. Validation fails → Red banner with first 3 errors → "View All Errors" button → Full error modal opens
3. User clicks Error Summary tab → Reviews first error → Sees JSON preview with highlighted issue
4. User clicks "Open Conversation Editor" → New tab opens with conversation → Fixes missing field
5. User returns to error modal → Clicks "Regenerate Training File" → Progress bar shows regeneration
6. File regenerates → Auto-validation runs → Success message → "Create Training Job" button enabled
7. Alternative: User clicks All Errors tab → Exports errors as CSV → Fixes multiple errors in batch
8. User navigates Fix Guide tab → Follows 5-step workflow → Completes all fixes → Retries training

Visual Feedback
- Validation loading: Spinner with "Validating training file..." text
- Success: Green checkmark badge + success message
- Failure: Red X icon + error count + warning banner
- Error locations: Red background highlighting in JSON viewer with >>> <<< arrows
- Error severity: Red (critical), Yellow (warning), Blue (info) color coding
- Progress indicators: Animated progress bars during regeneration
- Completion toast: "✓ Training file regenerated successfully!"
- Disabled button tooltips: Explain why disabled ("Fix {X} errors first")
- Hover states on error cards: Subtle highlight to show interactivity

Accessibility Guidance
- Modal traps focus, Escape key closes modal
- Tab navigation through error list and action buttons
- Arrow keys navigate between tabs
- Screen reader announces: "Validation failed. {X} critical errors found. Use Tab to navigate error list."
- ARIA labels: "Open conversation conv_abc123 in editor (new tab)"
- Error count announced: "Error 1 of 15"
- JSON viewer supports keyboard navigation
- Color not sole indicator (uses icons + text)
- Contrast ratio 4.5:1 for all text elements
- Focus indicators visible on all interactive elements

Information Architecture
- **Modal Header**: Error type + error count
- **Tab Navigation**: Quick access to different views (Summary / All Errors / Preview / Guide)
- **Content Area**: Scrollable error details, adapts to active tab
- **Footer Actions**: Persistent quick actions regardless of tab

Hierarchy:
1. Error header + count (immediate understanding)
2. Active tab content (focused information)
3. Primary action button (next step)
4. Secondary actions (alternative paths)
5. Dismiss option (exit workflow)

Page Plan
1. **Job Configuration Page - Validation Warning State**
   - Purpose: Block job creation if validation fails
   - Key elements: Red warning banner, first 3 errors inline, "View All Errors" button, disabled "Create Job" button with tooltip
   - States: Validating (spinner), Validation failed (banner)

2. **Error Modal - Summary Tab**
   - Purpose: Present first/critical error with full context
   - Key elements: Problem card, specific error details, affected conversation metadata, JSON preview, "Open Editor" button
   - States: Default view, loading conversation data

3. **Error Modal - All Errors Tab**
   - Purpose: List all errors for comprehensive review
   - Key elements: Paginated error cards, sort/filter controls, export button
   - States: Sorted by conversation, sorted by type, filtered view, paginated (page 1-N)

4. **Error Modal - Data Preview Tab**
   - Purpose: Show formatted JSON with error highlighting
   - Key elements: Syntax-highlighted JSON viewer, error markers, copy button, context expansion controls
   - States: Default view, expanded context, copied to clipboard

5. **Error Modal - Fix Guide Tab**
   - Purpose: Provide step-by-step remediation workflow
   - Key elements: 5-step process, quick fix buttons per step, progress indicators for regeneration
   - States: Step 1 (identify), Step 2 (edit), Step 3 (fix), Step 4 (regenerate + progress), Step 5 (retry)

6. **Training File Regeneration Progress**
   - Purpose: Show regeneration progress and completion
   - Key elements: Progress bar, conversation count, estimated time, success/failure message
   - States: Regenerating (0-100%), Success, Failure (with error details)

Annotations (Mandatory)
- Include mapping table:
  | Acceptance Criterion | Screen | Component(s) | State(s) |
  |---------------------|---------|--------------|----------|
  | Pre-flight validation | Job Config Page | Validation banner, spinner | Validating, Success, Failed |
  | Job creation blocked | Job Config Page | "Create Job" button, tooltip | Disabled with reason |
  | Error modal tabs | Error Modal | Tab navigation bar | Summary active, All Errors active, etc. |
  | Specific error display | Error Modal - Summary | Error card, conversation details | First error shown |
  | JSON preview | Error Modal - Preview | Syntax-highlighted viewer | Error highlighted with red background |
  | All errors list | Error Modal - All Errors | Paginated cards, filters | Sorted, filtered, paginated |
  | Fix guide workflow | Error Modal - Fix Guide | 5-step process, action buttons | Step 1-5 progression |
  | Regenerate button | Error Modal - Fix Guide | Regenerate button, progress bar | Enabled, Regenerating, Complete |
  | Quality score | File Selector | Score badge, color coding | 87/100 Good, <70 Warning |

- Attach notes explaining:
  - "Validation banner blocks job creation" → US3.1.2: "Prevent job creation if validation fails with clear error message"
  - "First 3 errors inline" → FR3.1.2: "Show first 3 errors inline with 'View All Errors' button"
  - "Open Editor button" → US3.1.2: "Quick action: 'Open Conversation Editor' button (deep link to conversation ID)"
  - "JSON viewer highlighting" → US3.1.2: "Display malformed conversation JSON with error highlighted"
  - "Regenerate workflow" → US3.1.2: "Regenerate training file → validation runs → retry job"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **Pre-Flight Validation Banner** (Source: US3.1.2 + FR3.1.2)
   - Screens: Job Configuration Page
   - Components: Warning banner, validation status, error count, "View All Errors" button
   - States: Validating (spinner), Success (green badge), Failed (red banner)
   - Notes: Prevents job creation, 10-second timeout for large files

2. **Job Creation Blocking** (Source: US3.1.2 + FR3.1.2)
   - Screens: Job Configuration Page
   - Components: "Create Training Job" button, tooltip
   - States: Disabled (if errors), enabled (if valid)
   - Notes: Tooltip explains: "Fix {X} validation errors before creating job"

3. **Error Modal Tab Navigation** (Source: FR3.1.2)
   - Screens: Error Modal
   - Components: Tab bar (Summary / All Errors / Data Preview / Fix Guide)
   - States: Active tab highlighted
   - Notes: Keyboard accessible, changes content area

4. **Error Summary Display** (Source: US3.1.2 + FR3.1.2)
   - Screens: Error Modal - Summary Tab
   - Components: Problem card, specific error card, conversation details, error impact note
   - States: First/critical error shown
   - Notes: "Conversation #47 (ID: conv_abc123) is missing required field 'target_response'"

5. **JSON Preview with Highlighting** (Source: US3.1.2 + FR3.1.2)
   - Screens: Error Modal - Data Preview Tab  
   - Components: Syntax-highlighted JSON viewer, error markers (red background + arrows), copy button
   - States: Context expanded/collapsed
   - Notes: Shows 10 lines before/after error, ">>> target_response: null <<< ERROR"

6. **All Errors List** (Source: FR3.1.2)
   - Screens: Error Modal - All Errors Tab
   - Components: Paginated error cards, sort dropdown, filter dropdown, export button
   - States: Sorted (by number/type/severity), filtered (critical only/all), paginated (page 1-N)
   - Notes: 25 errors per page, collapsible cards

7. **Fix Guide Workflow** (Source: US3.1.2 + FR3.1.2)
   - Screens: Error Modal - Fix Guide Tab
   - Components: 5-step process cards, quick fix buttons, progress indicators
   - States: Step 1 (identify) → Step 2 (edit) → Step 3 (fix) → Step 4 (regenerate) → Step 5 (retry)
   - Notes: "Open conv_abc123 in Editor" button, "Regenerate Training File" with progress bar

8. **Quick Action Buttons** (Source: US3.1.2 + FR3.1.2)
   - Screens: Error Modal (all tabs)
   - Components: "Open Conversation Editor", "Regenerate Training File", "Contact Support", "Dismiss"
   - States: Enabled/disabled based on context
   - Notes: Opens editor in new tab, preserves modal context

9. **Training File Regeneration** (Source: US3.1.2 + FR3.1.2)
   - Screens: Error Modal - Fix Guide Tab
   - Components: Regenerate button, progress bar, completion message
   - States: Enabled → Regenerating (0-100%) → Success/Failure
   - Notes: "Regenerating... 156 of 242 conversations processed" → "✓ Training file regenerated successfully"

10. **Quality Score Badge** (Source: FR3.1.2)
    - Screens: Training File Selector
    - Components: Score badge, color indicator, tooltip
    - States: Green (90-100), Yellow (70-89), Red (<70)
    - Notes: "Training File Quality: 87/100 (Good - Minor warnings only)"

11. **Common Error Types Reference** (Source: FR3.1.2)
    - Screens: Error Modal (potentially separate help section)
    - Components: Accordion with error types, examples, fix instructions
    - States: Collapsed/expanded per error type
    - Notes: Missing Field, Invalid Type, Malformed JSON, Encoding Error, Token Overflow, Duplicate ID, Empty Array

Non-UI Acceptance Criteria

**Backend/System Logic:**

1. **Schema Validation Engine** (Source: FR3.1.2)
   - Impact: Determines which errors to display
   - Implementation: Validates JSON structure, required fields, data types, token lengths
   - UI Hint: Validation results returned in <10 seconds

2. **Preprocessing Stage Validation** (Source: FR3.1.2)
   - Impact: Catches errors during training start
   - Implementation: Same validation + tokenization check + encoding verification
   - UI Hint: Job fails immediately if validation fails, no GPU time wasted

3. **Error Detection Granularity** (Source: FR3.1.2)
   - Impact: Provides precise error information for UI
   - Implementation: Captures error_type, conversation_index, conversation_id, field_path, error_message
   - UI Hint: Enables specific error location display

4. **Validation Error Logging** (Source: FR3.1.2)
   - Impact: Enables error pattern analytics
   - Implementation: INSERT INTO training_file_validation_errors for each error
   - UI Hint: Patterns surface in quality analytics dashboard

5. **Automated Fix Suggestions** (Source: FR3.1.2)
   - Impact: Future enhancement for common fixes
   - Implementation: Auto-populate default values, remove trailing commas, convert encoding
   - UI Hint: "Apply Suggested Fixes" button with preview

6. **Training File Regeneration API** (Source: FR3.1.2)
   - Impact: Rebuilds file after fixes
   - Implementation: Calls API to rebuild from fixed conversations, runs validation
   - UI Hint: Progress bar shows rebuild status

7. **Quality Score Calculation** (Source: FR3.1.2)
   - Impact: Provides quality metric for file selection
   - Implementation: Base 100 - (critical errors × 10) - (warnings × 2) + bonuses
   - UI Hint: Score badge updates after fixes

8. **Deep Link Generation** (Source: FR3.1.2)
   - Impact: Enables quick navigation to editor
   - Implementation: Generates `/conversations/{id}/edit` URL
   - UI Hint: Opens in new tab from "Open Editor" button

Estimated Page Count
- **6 screens/states** required:
  1. Job Config - Validation Warning (blocking state)
  2. Error Modal - Summary Tab (first error details)
  3. Error Modal - All Errors Tab (full list)
  4. Error Modal - Data Preview Tab (JSON highlighting)
  5. Error Modal - Fix Guide Tab (5-step workflow)
  6. Regeneration Progress & Success (completion flow)

- **Rationale**: Dataset validation requires pre-flight prevention + comprehensive error diagnosis. Multiple tabs provide different views (summary vs detail) for different use cases. Fix guide provides clear remediation path. Regeneration flow confirms fixes applied successfully. Quality score prevents future issues.

=== END PROMPT FR: FR3.1.2 ===

---

=== BEGIN PROMPT FR: FR3.1.3 ===

Title
- FR3.1.3 Wireframes — GPU Provisioning Error Handling — Stage 3

Context Summary
- This feature implements comprehensive GPU provisioning error detection, diagnosis, and recovery mechanisms for RunPod API failures including spot instance unavailability, provisioning timeouts, datacenter outages, and quota limits. When GPU provisioning fails, the system presents users with intelligent recovery options (automatic retry, spot-to-on-demand migration, delayed scheduling, cancellation) while displaying real-time datacenter availability metrics, historical success rates, and estimated wait times. The UI transforms infrastructure failures into informed decision points, maintaining user confidence during delays and enabling smart trade-offs between cost and availability.

Journey Integration
- Stage 3 user goals: Start training immediately, understand GPU availability constraints, make informed cost vs wait-time decisions, trust automatic retry mechanisms
- Key emotions: Anxiety reduction during provisioning delays, confidence from transparent availability data, empowerment through clear options, patience built by accurate estimates
- Progressive disclosure levels:
  * Basic: Clear problem statement, primary retry option, estimated wait time
  * Advanced: All recovery options with cost comparisons, datacenter utilization metrics, historical success rates
  * Expert: Multi-region availability, priority provisioning options, quota management
- Persona adaptations: Serves AI engineers and operations managers who need to balance urgency, cost, and reliability

Journey-Informed Design Elements
- User Goals: Understand why GPU unavailable, decide between waiting for spot or paying for on-demand, trust auto-retry will work, avoid wasting time checking manually
- Emotional Requirements: Transparency about delays, confidence in estimated wait times, control over cost vs speed trade-off, reassurance during auto-retry
- Progressive Disclosure:
  * Basic: "No spot GPUs available (92% utilization). Auto-retry every 5 min or switch to on-demand now"
  * Advanced: Datacenter utilization chart, spot availability forecast, historical provisioning patterns
  * Expert: Multi-datacenter failover, priority queue access, quota usage tracking
- Success Indicators: User makes informed decision in <30 seconds, auto-retry succeeds within estimated time, spot-to-on-demand fallback works seamlessly

Wireframe Goals
- Clearly explain provisioning failure reason (no spot availability, timeout, datacenter issue, quota)
- Present recovery options with accurate cost and time trade-offs
- Display real-time datacenter availability metrics and trends
- Show auto-retry progress with countdown and status updates
- Enable spot-to-on-demand switching with cost comparison
- Provide proactive availability warnings during job configuration
- Track provisioning success rates by time of day and datacenter

Explicit UI Requirements (from acceptance criteria)

**Error Modal Design (GPU Provisioning Failed):**
- Full-screen modal, non-dismissable until option selected
- Header: "GPU Provisioning Failed" with infrastructure icon (🔌❌ or ⚙️⚠️)
- Subheader context-aware based on failure type:
  - "Unable to provision spot GPU"
  - "Datacenter temporarily unavailable"
  - "Provisioning timeout - still waiting for GPU allocation"

**Problem Statement Section:**
- Clear explanation box
- Primary message: "No H100 spot GPUs currently available"
- Secondary explanation: "Your training job requires an H100 PCIe 80GB GPU, but all spot instances are currently in use."
- Visual GPU availability gauge:
  - "Spot Availability: Low (8% free capacity)" (red indicator)
  - "On-Demand Availability: High (87% free capacity)" (green indicator)

**Reason Analysis Section:**
- Data-driven explanation card
- Message: "High demand in RunPod datacenter (92% utilization)"
- Typical patterns: "Typical peak hours: 9 AM - 5 PM PST on weekdays"
- Current context: "Current time: 10:30 AM PST (peak demand period)"
- Historical context: "Spot availability usually increases after 5 PM (off-peak)"
- Real-time datacenter status:
  - Fetched from RunPod API: GET /v2/availability
  - Display: "US-West datacenter: 92% utilized (23 of 25 H100s in use)"
  - Future: "EU-West datacenter: 67% utilized (16 of 24 H100s in use)" (multi-region)

**Recovery Options Section (Large Action Cards):**

**Option 1: Auto-Retry (Recommended for Spot)** - Blue card, primary prominence:
- Badge: "Recommended" 
- Title: "Wait for Spot GPU (Auto-Retry)"
- Description: "Automatically retry provisioning every 5 minutes until GPU becomes available"
- Details list:
  - "Max retry duration: 1 hour (12 attempts)"
  - "You'll be notified when GPU provisioned and training starts"
  - "No action required from you"
- Estimated wait time: "Historical data shows spot GPUs typically available within 15-30 minutes"
- Success rate: "82% of retries succeed within 1 hour during peak hours, 96% during off-peak"
- Cost: "No additional cost beyond standard spot rate ($2.49/hr)"
- Primary button: "Enable Auto-Retry" (blue, large)

**Option 2: Switch to On-Demand** - Green card, secondary prominence:
- Title: "Start Immediately (On-Demand GPU)"
- Description: "Guaranteed GPU availability, start training within 5 minutes"
- Details list:
  - "No waiting, no retry uncertainty"
  - "Guaranteed completion, no spot interruptions"
- Cost comparison box:
  - "Spot: $2.49/hr → On-Demand: $7.99/hr (+$5.50/hr)"
  - "Total job cost: Estimated $50-60 (spot) vs $160-190 (on-demand) = +$110 premium"
  - "Cost increase: 220% more expensive"
- Recommendation: "Best if urgent deadline or already waited >30 minutes"
- Button: "Switch to On-Demand & Start" (green)

**Option 3: Cancel and Retry Later** - Gray card, tertiary:
- Title: "Cancel Job, Try During Off-Peak Hours"
- Description: "Cancel this job and retry when spot availability is higher"
- Details list:
  - "Spot availability highest: Evenings (5 PM - 11 PM PST), Weekends, Overnight (11 PM - 7 AM)"
  - "Suggested retry times: Tonight at 6 PM (90% availability), Saturday morning (95% availability)"
  - "No cost incurred (job never started)"
- Button: "Cancel Job" (gray)

**Option 4: Contact Support** - Text link:
- Title: "Request Support Assistance"
- Description: "Our team can help with custom provisioning or priority allocation"
- Details: "Response time: <2 hours during business hours"
- Link: "Contact Support"

**Auto-Retry Status Display (After Enabling):**
- Modal updates to show auto-retry progress
- Header: "Auto-Retry Enabled - Monitoring for Available GPUs"
- Status badge: "Waiting for GPU" (pulsing yellow animation)
- Progress indicator: "Auto-retry in progress: Attempt 3 of 12"
- Time tracking:
  - "Waiting for 15 minutes (max: 1 hour)"
  - "Next retry in 2m 30s" (countdown timer)
- Datacenter availability chart:
  - Line graph showing utilization over past 2 hours
  - Trend prediction (if utilization decreasing)
- Live updates via polling (every 30 seconds):
  - "Datacenter utilization decreased from 92% to 85% - higher chance of success on next retry"
- User can modify strategy:
  - "Switch to On-Demand" button available anytime
  - "Cancel Auto-Retry" link if user changes mind

**Provisioning Timeout Scenario:**
- After 1 hour (12 failed attempts)
- Modal updates: "Still No Spot GPU After 1 Hour"
- Options presented:
  - "Continue Waiting (extend to 2 hours)"
  - "Switch to On-Demand Now" (recommended)
  - "Cancel Job"
- Notification sent: "Spot GPU still unavailable after 1 hour. Choose next action: [View Options]"

**Proactive Availability Warning (Job Configuration Page):**
- Warning modal appears if current spot availability < 20%
- Icon: ⚠️ with yellow/orange border
- Title: "Low Spot Availability Alert"
- Message: "Current spot utilization: 92% (only 2 of 25 GPUs available)"
- Warning: "Your job may experience provisioning delays (estimated wait: 20-40 minutes)"
- Options presented:
  - "Proceed with Spot (may wait)" - acknowledges risk
  - "Use On-Demand Instead (+$XX cost)" - switches GPU type
  - "Schedule for Later (when availability higher)" - delays job start
- User decision logged for analytics

**Quota Exceeded Scenario:**
- Different modal if quota limit hit
- Header: "GPU Quota Exceeded"
- Message: "Your account has used {X} of {Y} allocated GPU hours this month"
- Display: "Remaining quota: 0 hours"
- Options:
  - "Upgrade Plan (increase quota to {Z} hours)"
  - "Wait Until Next Month (quota resets on {date})"
  - "Contact Sales for Custom Quota"
- Quota usage visible in dashboard:
  - "GPU Hours Used: 87 of 100 this month (87%)"
  - Progress bar with forecast: "At current rate, quota will be exhausted in 5 days"

**States to Show:**
- Provisioning failure - initial error modal
- Auto-retry enabled - progress tracking
- Auto-retry timeout (1 hour) - extended options
- Spot-to-on-demand switch confirmation
- Proactive warning during configuration
- Quota exceeded error
- Success after retry - notification and redirect

Interactions and Flows
1. User clicks "Start Training" → GPU provisioning initiated → RunPod API returns "No spot GPUs available"
2. Error modal appears → User reads problem + sees 92% utilization → Reviews recovery options
3. User selects "Enable Auto-Retry" → Modal updates to progress tracking → Countdown shows next attempt in 4m 30s
4. System retries every 5 minutes → Updates datacenter utilization → Shows "Attempt 3 of 12"
5. Spot GPU becomes available → Provisioning succeeds → Notification: "✓ GPU provisioned! Training started"
6. Alternative: User waits 30 minutes → Decides to switch to on-demand → Confirms cost increase → Training starts immediately
7. Proactive flow: User configuring job → System detects 92% utilization → Warning appears → User switches to on-demand before creating job

Visual Feedback
- GPU availability gauge: Red (low), Yellow (moderate), Green (high)
- Auto-retry progress: Pulsing yellow badge during waiting
- Countdown timers: "Next attempt in 2m 30s" (updates every second)
- Datacenter chart: Line graph with trend indicator
- Success notification: Green toast with checkmark
- Cost comparison: Color-coded (green=cheap, red=expensive)
- Loading spinners during provisioning attempts
- Real-time utilization updates: "92% → 85%" with down arrow

Accessibility Guidance
- Modal traps focus until option selected
- Tab navigation through recovery option cards
- Enter key activates selected option
- Screen reader: "GPU provisioning failed. 3 recovery options available. Use Tab to review options."
- ARIA labels: "Enable auto-retry for spot GPU, estimated wait 15-30 minutes, no additional cost"
- Countdown timer updates announced every 30 seconds
- Color not sole indicator (uses text + icons)
- Minimum contrast 4.5:1 for all text
- Focus indicators on all interactive cards and buttons

Information Architecture
- **Modal Header**: Failure type + context
- **Problem Section**: What happened + availability gauge
- **Analysis Section**: Why it happened + patterns
- **Recovery Options**: 3-4 action cards ranked by recommendation
- **Progress Tracking**: Live updates during auto-retry
- **Decision Support**: Cost comparisons + estimated wait times

Hierarchy:
1. Error header (immediate understanding)
2. Availability gauge (visual status)
3. Primary recovery option (recommended action)
4. Alternative options (other paths)
5. Support/cancellation (exit options)

Page Plan
1. **Provisioning Error Modal - Initial State**
   - Purpose: Present failure, explain cause, offer primary recovery option
   - Key elements: Error header, availability gauge, Option 1 (auto-retry) card
   - States: Default view with all options visible

2. **Provisioning Error Modal - Recovery Options Comparison**
   - Purpose: Allow users to review all options with trade-offs
   - Key elements: 3-4 recovery cards, cost comparisons, success rates
   - States: Reviewing options, can select any card

3. **Auto-Retry Progress Tracking**
   - Purpose: Show live retry attempts and datacenter status
   - Key elements: Progress indicator, countdown timer, utilization chart, attempt counter
   - States: Attempt 1-12, datacenter updates, can switch to on-demand anytime

4. **Auto-Retry Timeout Extended Options**
   - Purpose: Offer continued waiting or fallback after 1 hour
   - Key elements: "Still waiting" message, extended time option, switch to on-demand (recommended)
   - States: Timeout reached, user choosing next action

5. **Proactive Warning (Job Configuration)**
   - Purpose: Warn users before job creation if low availability
   - Key elements: Warning banner, availability forecast, proceed/adjust/schedule options
   - States: Warning displayed, user acknowledged

6. **Quota Exceeded Error**
   - Purpose: Handle quota limit scenarios
   - Key elements: Quota usage display, upgrade options, reset date
   - States: Quota exceeded, viewing usage details, upgrading plan

Annotations (Mandatory)
- Include mapping table:
  | Acceptance Criterion | Screen | Component(s) | State(s) |
  |---------------------|---------|--------------|----------|
  | Provisioning failure detection | Error Modal | Error header, availability gauge | Failed state |
  | Problem statement | Error Modal | Problem card, datacenter status | No GPUs available |
  | Reason analysis | Error Modal | Analysis card, utilization display | 92% utilized |
  | Recovery options | Error Modal | 3-4 action cards | Auto-retry, On-demand, Cancel, Support |
  | Auto-retry workflow | Progress Modal | Progress indicator, countdown, chart | Attempting 1-12 |
  | Spot-to-on-demand switch | Confirmation Modal | Cost comparison, confirm button | User switching |
  | Proactive warning | Job Config Page | Warning modal, availability forecast | Low availability detected |
  | Quota management | Quota Error Modal | Usage display, upgrade options | Exceeded state |

- Attach notes:
  - "Availability gauge" → FR3.1.3: "Visual indicator showing Spot Availability: Low (8% free capacity)"
  - "Auto-retry workflow" → US3.1.3: "Auto-retry every 5 minutes until GPU available (max 1 hour)" + FR3.1.3: "Background job retries, logs attempts, succeeds or times out"
  - "Cost comparison" → US3.1.3: "Switch to on-demand: Start immediately (+$5/hr, guaranteed)" + FR3.1.3: "Display: Spot $2.49/hr → On-Demand $7.99/hr (+$5.50/hr)"
  - "Proactive warning" → FR3.1.3: "Before job creation, check utilization, display warning if spot_available < 20%"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **Error Modal Header** (Source: FR3.1.3)
   - Screens: Provisioning Error Modal
   - Components: Header, icon, subheader
   - States: Context-aware message ("Unable to provision spot GPU")
   - Notes: Non-dismissable until option selected

2. **Problem Statement** (Source: US3.1.3 + FR3.1.3)
   - Screens: Provisioning Error Modal
   - Components: Problem card, explanation text, availability gauge
   - States: Displayed with real-time metrics
   - Notes: "No H100 spot GPUs currently available" + "Spot Availability: Low (8% free)"

3. **Reason Analysis** (Source: FR3.1.3)
   - Screens: Provisioning Error Modal
   - Components: Analysis card, datacenter status, historical patterns
   - States: Real-time data from RunPod API
   - Notes: "High demand (92% utilization), Typical peak hours 9-5 PM"

4. **Recovery Options Cards** (Source: US3.1.3 + FR3.1.3)
   - Screens: Provisioning Error Modal
   - Components: 4 action cards (Auto-retry, On-demand, Cancel, Support)
   - States: Option 1 (recommended), Options 2-4 (alternatives)
   - Notes: Each card shows title, description, details, cost/time trade-offs, button

5. **Auto-Retry Progress** (Source: US3.1.3 + FR3.1.3)
   - Screens: Auto-Retry Progress Modal
   - Components: Status badge, progress indicator, countdown timer, attempt counter, utilization chart
   - States: Attempting (1-12), waiting, updating datacenter data
   - Notes: "Auto-retry in progress: Attempt 3 of 12, Next attempt in 2m 30s"

6. **Cost Comparison** (Source: US3.1.3 + FR3.1.3)
   - Screens: On-Demand Option Card
   - Components: Cost breakdown, comparison table, cost increase percentage
   - States: Calculated based on job estimate
   - Notes: "Spot $50-60 vs On-demand $160-190 = +$110 premium (220% more)"

7. **Proactive Warning Modal** (Source: FR3.1.3)
   - Screens: Job Configuration Page
   - Components: Warning modal, availability forecast, proceed/adjust/schedule buttons
   - States: Appears if spot_available < 20%
   - Notes: "Current utilization 92%, estimated wait 20-40 minutes"

8. **Timeout Extended Options** (Source: US3.1.3 + FR3.1.3)
   - Screens: Auto-Retry Timeout Modal
   - Components: "Still waiting" message, extend/switch/cancel buttons
   - States: After 1 hour (12 attempts)
   - Notes: "Still no spot GPU after 1 hour. Switch to on-demand or cancel?"

9. **Quota Exceeded Display** (Source: FR3.1.3)
   - Screens: Quota Error Modal
   - Components: Quota usage display, remaining quota, upgrade options
   - States: Quota exceeded
   - Notes: "Used 100 of 100 GPU hours this month, Remaining: 0 hours"

10. **Success Notification** (Source: FR3.1.3)
    - Screens: Toast notification
    - Components: Success toast, redirect message
    - States: After successful retry
    - Notes: "✓ GPU provisioned! Training started for {job_name}"

Non-UI Acceptance Criteria

**Backend/System Logic:**

1. **Provisioning Failure Detection** (Source: FR3.1.3)
   - Impact: Triggers error modal
   - Implementation: Monitor RunPod API responses (503, 429, 404, timeout >10 min)
   - UI Hint: Error modal displays within 5 seconds of detection

2. **Error Type Classification** (Source: FR3.1.3)
   - Impact: Determines modal message and options
   - Implementation: Classify as spot unavailable, timeout, datacenter issue, quota exceeded, rate limiting
   - UI Hint: Different subheaders and recommendations per type

3. **Real-Time Availability API** (Source: FR3.1.3)
   - Impact: Provides data for gauge and chart
   - Implementation: GET /v2/availability from RunPod
   - UI Hint: Updates every 30 seconds during auto-retry

4. **Auto-Retry Background Job** (Source: FR3.1.3)
   - Impact: Attempts provisioning every 5 minutes
   - Implementation: Cron job, POST /v2/pods/create, log attempts, timeout after 1 hour
   - UI Hint: Progress updates sent to UI via polling/websocket

5. **Cost Calculation** (Source: FR3.1.3)
   - Impact: Shows accurate cost comparisons
   - Implementation: Calculate spot vs on-demand for estimated duration
   - UI Hint: Cost breakdowns displayed in Option 2 card

6. **Provisioning Analytics** (Source: FR3.1.3)
   - Impact: Improves wait time estimates
   - Implementation: Track failure rate, average wait time, peak hours
   - UI Hint: "Historical data shows spot GPUs typically available within 15-30 minutes"

7. **Proactive Availability Check** (Source: FR3.1.3)
   - Impact: Prevents failures before job creation
   - Implementation: Check availability during job config, warn if <20%
   - UI Hint: Warning modal appears on config page

8. **Quota Tracking** (Source: FR3.1.3)
   - Impact: Enables quota management
   - Implementation: Track GPU hours used vs allocated
   - UI Hint: Quota usage displayed in dashboard and error modal

Estimated Page Count
- **6 screens/states** required:
  1. Provisioning Error Modal - Initial (problem + options)
  2. Auto-Retry Progress Tracking (live updates)
  3. Auto-Retry Timeout Options (extended choices)
  4. Proactive Warning Modal (configuration page)
  5. Quota Exceeded Error (quota management)
  6. Success Notification & Redirect (completion)

- **Rationale**: Provisioning errors require clear problem explanation + multiple recovery paths. Auto-retry needs progress tracking with ability to modify strategy. Proactive warnings prevent failures. Quota management handles capacity limits. Each state guides users through infrastructure challenges with transparency and control.

=== END PROMPT FR: FR3.1.3 ===

---

=== BEGIN PROMPT FR: FR3.2.1 ===

Title
- FR3.2.1 Wireframes — Spot Instance Interruption Recovery — Stage 3

Context Summary
- This feature implements robust automatic checkpoint-based recovery from spot instance interruptions. When spot GPUs are reclaimed by cloud providers (10-30% chance), the system automatically saves training state every 100 steps, detects interruption via webhooks, provisions replacement GPUs, downloads checkpoints, and resumes training seamlessly. The UI must transform infrastructure interruptions from catastrophic failures into transparent, confidence-building recovery moments, showing users that spot instances (70% cheaper) are reliable despite interruptions. Target users need assurance that automatic recovery works consistently (<10 min resume time, 95%+ success rate).

Journey Integration
- Stage 3 user goals: Trust spot instance cost savings, witness automatic recovery without intervention, understand interruption impact on timeline/cost, maintain confidence during interruptions
- Key emotions: Initial anxiety when interrupted → Relief as auto-recovery initiates → Confidence as training resumes → Trust in system reliability
- Progressive disclosure levels:
  * Basic: "Interrupted → Auto-recovering..." notification, resume confirmation
  * Advanced: Interruption timeline, checkpoint details, downtime tracking, cost impact
  * Expert: Recovery analytics, checkpoint management, interruption patterns
- Persona adaptations: Serves engineers and budget managers who need transparency on spot reliability and cost/reliability trade-offs

Journey-Informed Design Elements
- User Goals: Understand what happened during interruption, trust auto-recovery will work, see training resume successfully, validate no data lost, track cost impact
- Emotional Requirements: Immediate reassurance that recovery is automatic, transparency about downtime, confidence in checkpoint reliability, celebration of successful resume
- Progressive Disclosure:
  * Basic: "Training interrupted. Auto-recovery in progress... No action needed."
  * Advanced: "Interrupted at step 850 → Resumed at step 850 (9 min downtime). Loss curve continuous."
  * Expert: "2 interruptions, 16 min total downtime, +$0.75 recovery overhead, 96.3% system success rate"
- Success Indicators: User receives interruption notification immediately, sees training resume within 10 minutes, loss curve shows continuity, cost tracking includes recovery overhead

Wireframe Goals
- Display clear notification when interruption occurs with auto-recovery status
- Show real-time progress during recovery (provisioning → downloading checkpoint → resuming)
- Present interruption history with timeline, downtime, and recovery duration per event
- Visualize loss curve continuity with interruption markers
- Track cost accurately including interruption overhead
- Display interruption badge and detailed interruption log
- Show recovery failure escalation options if multiple retries fail

Explicit UI Requirements (from acceptance criteria)

**Interruption Notification (Immediate):**
- Toast notification appears: "Training interrupted at {percentage}% complete (step {step}). Auto-recovery in progress..."
- Notification style: Informational (not error), orange/yellow color
- Auto-dismiss after 5 seconds or user dismisses
- Link: "Track Status" → Redirects to job dashboard
- Email + Slack notification (if configured): "Training interrupted at 42% complete. Auto-recovery starting..."

**Job Dashboard During Recovery:**
- Status badge updates: "Interrupted → Recovering → Training (Resumed)"
- Status badge color: Orange (interrupted), Blue (recovering), Green (resumed)
- Recovery status message: "Auto-recovery in progress: Provisioning new GPU..."
- Progress stages shown:
  1. "Detecting interruption..." (complete, checkmark)
  2. "Provisioning replacement GPU..." (in progress, spinner)
  3. "Downloading checkpoint..." (pending)
  4. "Restoring training state..." (pending)
  5. "Resuming training..." (pending)
- Estimated time remaining: "Est. recovery time: 5-8 minutes"

**Resume Success Notification:**
- Toast notification: "✓ Training resumed from checkpoint (Step 850). Estimated completion: 8h 15m remaining."
- Email + Slack: "Training resumed successfully. Downtime: 9 minutes."
- Dashboard banner (if user viewing): "✓ Training resumed from checkpoint. Interruption recovered in 8 min."

**Interruption Badge (Job Dashboard):**
- Badge displayed prominently: "Interrupted 2× (auto-recovered)" with orange background + checkmark icon
- Click badge → Opens interruption details modal
- Badge tooltip: "This job was interrupted 2 times and recovered automatically"

**Interruption Details Modal:**
- Header: "Interruption History - {job_name}"
- Timeline view showing each interruption chronologically
- Per-interruption card:
  - "Interruption #1"
  - "Interrupted at: Step 500 (3h 42m elapsed)"
  - "Resumed at: Step 500 (3h 51m elapsed)"
  - "Downtime: 9 minutes"
  - "Recovery duration: 9 min (within 10 min target ✓)"
  - Reason: "Spot instance reclaimed by cloud provider"
- Total summary card:
  - "Total interruptions: 2"
  - "Total downtime: 16 minutes (0.27 hours)"
  - "Active training time: 12h 18m"
  - "Total elapsed time: 12h 34m (including interruptions)"
- Close button

**Loss Curve Interruption Markers:**
- Vertical dotted lines at interruption steps (e.g., step 500, step 1200)
- Line color: Orange/yellow dashed
- Tooltip on hover: "Interrupted at step 500, resumed 9 min later"
- Loss curve remains continuous (no gaps) - training resumed seamlessly from checkpoint

**Cost Tracking with Interruptions:**
- Cost breakdown card on job dashboard:
  - "GPU Training Time: 12.3 hours × $2.49/hr = $30.63"
  - "Interruption Overhead: 0.3 hours × $2.49/hr = $0.75 (2 recoveries)"
  - "Total Cost: $31.38"
- Comparison to estimate: "Estimated: $48-60, Actual: $31.38 (35% under estimate due to efficient training)"

**Recovery Failure Escalation (After 3 Failed Attempts):**
- Modal appears: "Spot Instance Recovery Failed"
- Header: "⚠️ Unable to Recover After 3 Attempts"
- Message: "Unable to provision replacement spot GPU after 3 attempts (datacenter capacity issues)"
- Options presented:
  - Option 1: "Continue trying spot (may take hours during peak demand)" - keeps retrying
  - Option 2: "Switch to on-demand GPU (guaranteed recovery, +$5.50/hr)" - recommended for jobs >50% complete
  - Option 3: "Cancel job and retry later"
- Cost comparison: "Wasted cost so far: $22.18. Switching to on-demand adds +$XX for remaining work."
- Recommended action badge: "Recommended: Switch to on-demand"

**States to Show:**
- Training active → Interruption detected
- Auto-recovery initiated (progress stages)
- Recovery in progress (provisioning, downloading, resuming)
- Training resumed successfully
- Multiple interruptions (2, 3, 4+ times)
- Recovery failure (after 3 attempts)
- Switch to on-demand (fallback from failed recovery)

Interactions and Flows
1. User monitoring training → Spot instance interrupted → Interruption toast appears
2. Status badge updates: "Interrupted" → User clicks → Sees recovery progress stages
3. System provisions new GPU → Downloads checkpoint → Restores state → Resumes training
4. Training resumes → Resume success notification → User sees "Interrupted 1× (auto-recovered)" badge
5. Second interruption occurs → Same recovery process → Badge updates to "Interrupted 2×"
6. User clicks badge → Interruption details modal opens → Reviews downtime per interruption
7. User reviews loss curve → Sees interruption markers → Tooltips explain each interruption
8. Recovery failure: 3 attempts fail → Escalation modal → User switches to on-demand → Training resumes

Visual Feedback
- Interruption notification: Orange toast with informational icon
- Recovery progress: Blue progress indicator with checkmarks for completed stages
- Resume success: Green toast with checkmark
- Interruption badge: Orange with checkmark icon
- Loss curve markers: Orange dashed vertical lines
- Cost breakdown: Separate line item for "Interruption Overhead"
- Recovery failure: Warning modal with recommended action highlighted

Accessibility Guidance
- Interruption notifications announced by screen reader: "Training interrupted. Automatic recovery in progress."
- Recovery progress stages announced as they complete
- Resume success announced: "Training resumed successfully from checkpoint."
- Interruption badge: ARIA label "Job interrupted 2 times, recovered automatically. Click for details."
- Modal keyboard accessible, focus trapped, Escape closes
- Loss curve markers have text labels for screen readers

Information Architecture
- **Notification Layer**: Immediate interruption + resume notifications
- **Dashboard Status**: Real-time recovery progress + status badge
- **Interruption Details**: Historical timeline + downtime tracking
- **Loss Curve**: Visual markers showing interruption points
- **Cost Tracking**: Overhead calculation + accurate totals

Page Plan
1. **Interruption Notification & Recovery Progress** (Job Dashboard Active State)
   - Purpose: Show real-time recovery progress during interruption
   - Key elements: Status badge, recovery stages, progress indicator, time estimate
   - States: Detecting → Provisioning → Downloading → Restoring → Resuming

2. **Resume Success Confirmation** (Job Dashboard Resumed State)
   - Purpose: Confirm successful resume and show updated estimates
   - Key elements: Resume notification, updated progress, recalculated ETA
   - States: Training resumed, loss curve continuous

3. **Interruption Details Modal** (Historical View)
   - Purpose: Show complete interruption history with timelines
   - Key elements: Timeline cards per interruption, total summary, downtime tracking
   - States: 1 interruption, 2 interruptions, 3+ interruptions

4. **Loss Curve with Interruption Markers** (Progress Dashboard)
   - Purpose: Visualize training continuity despite interruptions
   - Key elements: Loss curve graph, vertical markers at interruption steps, tooltips
   - States: Active training, interrupted points marked, hover tooltips

5. **Cost Breakdown with Overhead** (Job Details Cost Card)
   - Purpose: Show accurate cost including recovery overhead
   - Key elements: Training time cost, interruption overhead, total cost
   - States: In progress (accumulating), completed (final totals)

6. **Recovery Failure Escalation** (Error Modal)
   - Purpose: Offer fallback options after 3 failed recovery attempts
   - Key elements: Failure message, 3 options, cost comparison, recommendation
   - States: 3 attempts failed, user choosing option, switching to on-demand

Annotations (Mandatory)
- Attach notes mapping acceptance criteria to UI components:
  - "Interruption notification" → US3.2.1: "Notification: Training interrupted at 42% complete. Auto-recovery in progress..."
  - "Recovery stages" → FR3.2.1: "Recovery workflow: 1) Provision GPU 2) Download checkpoint 3) Restore state 4) Resume training"
  - "Interruption badge" → US3.2.1: "Dashboard display: Interrupted 2× (auto-recovered)"
  - "Loss curve markers" → FR3.2.1: "Visual interruption indicators: Vertical dotted lines, tooltip shows downtime"
  - "Cost tracking" → FR3.2.1: "Cost breakdown: GPU time + Interruption overhead"

Acceptance Criteria → UI Component Mapping
1. **Checkpoint Saving** (Backend, no direct UI) → Enables recovery
2. **Interruption Detection** → Status badge "Interrupted", toast notification
3. **Recovery Progress** → Progress stages, status updates, time estimate
4. **Interruption Badge** → Orange badge with count, click opens modal
5. **Interruption Details Modal** → Timeline view, downtime per event, total summary
6. **Loss Curve Markers** → Vertical lines at interruption steps, tooltips
7. **Cost Tracking** → Breakdown showing overhead, accurate totals
8. **Resume Notifications** → Toast + email/Slack messages
9. **Recovery Failure** → Escalation modal with options after 3 attempts

Non-UI Acceptance Criteria
- Checkpoint saving every 100 steps (backend)
- Webhook handling for interruption events (backend)
- Automatic GPU provisioning (backend)
- Checkpoint download and integrity verification (backend)
- Training state restoration (backend)
- Recovery success rate tracking (analytics)

Estimated Page Count
- **6 screens/states**: Interruption notification → Recovery progress → Resume success → Interruption history modal → Loss curve view → Recovery failure escalation
- **Rationale**: Automatic recovery requires real-time progress visibility, historical tracking for transparency, failure handling for edge cases. Users need confidence that spot instances are reliable despite interruptions.

=== END PROMPT FR: FR3.2.1 ===

---

=== BEGIN PROMPT FR: FR3.2.2 ===

Title
- FR3.2.2 Wireframes — Manual Checkpoint Resume — Stage 3

Context Summary
- This feature enables users to manually resume failed training jobs from saved checkpoints by displaying resume options, opening pre-configured modals, allowing strategic configuration adjustments (GPU type, batch size, epochs, learning rate), calculating accurate cost estimates for remaining work, creating linked continuation jobs, and tracking resume lineage. The UI transforms partial progress into recoverable value, enabling users to salvage investments from failed jobs (OOM errors, spot interruption loops, budget limits) and continue training with optimized configurations.

Journey Integration
- Stage 3 user goals: Recover from failures without losing partial progress, adjust configuration to prevent repeat failures, minimize wasted cost, complete training successfully
- Key emotions: Relief at recovering partial work, confidence in adjustment options, control over continuation strategy, satisfaction upon successful completion
- Progressive disclosure levels:
  * Basic: "Resume from Checkpoint" button, pre-filled config, remaining work estimate
  * Advanced: Configuration adjustments (GPU type, batch size, epochs), cost comparison, remaining work calculation
  * Expert: LR schedule options, checkpoint integrity details, resume success patterns
- Persona adaptations: Serves engineers recovering from failures who need flexibility to adjust strategies

Journey-Informed Design Elements
- User Goals: Resume from last checkpoint, adjust config to prevent repeat failure, estimate remaining cost, complete training without starting over
- Emotional Requirements: Reassurance that checkpoint is valid, confidence in adjustments, transparency about remaining work, satisfaction at salvaging progress
- Progressive Disclosure:
  * Basic: "Resume from step 850 (42% complete). ~8 hours remaining."
  * Advanced: "Adjust batch size 4→2 to prevent OOM. Switch to on-demand for reliability."
  * Expert: "Resume LR schedule or restart warmup. Checkpoint: 450MB, saved 15min ago."
- Success Indicators: User finds resume option quickly, understands remaining work, makes informed adjustments, continuation completes successfully

Wireframe Goals
- Display "Resume from Checkpoint" button on failed jobs with checkpoints
- Show resume modal with original job summary and remaining work calculation
- Enable configuration adjustments: GPU type, batch size, epochs, LR schedule
- Calculate real-time cost estimates as user adjusts configuration
- Provide context-specific recommendations based on failure type
- Link resumed jobs to original jobs with clear lineage tracking

Explicit UI Requirements (from acceptance criteria)

**Resume Button Display:**
- Button appears on failed job details page if checkpoint available
- Label: "Resume from Step {checkpoint_step}" (e.g., "Resume from Step 850")
- Icon: ▶️ (play/resume icon)
- Position: Next to "Retry Job" button in header area
- Styling: Prominent, blue, primary action
- Tooltip: "Continue training from last saved checkpoint ({percentage}% complete)"
- Hidden if no checkpoint: Display message "No checkpoint available. This job failed before first checkpoint (step 100)."

**Resume Configuration Modal:**
- Full-screen modal
- Header: "Resume Training from Checkpoint"
- Subheader: "Continue training from step {checkpoint_step} ({percentage}% complete)"
- Close button (X) - dismissable

**Original Job Summary Section:**
- Card showing original job details:
  - Job name: "{original_job_name}"
  - Status: "Failed" (red badge) + failure reason
  - Original configuration: Preset, GPU type, hyperparameters (r, lr, epochs, batch_size)
  - Training progress before failure: "Completed {checkpoint_step} of {total_steps} steps ({percentage}%)"
  - Training time elapsed: "{hours}h {minutes}m"
  - Cost spent so far: "${cost}"
  - Checkpoint details: "Last checkpoint: Step {step}, saved {time_ago} ago, {size}MB"

**Remaining Work Calculation:**
- Prominently displayed card:
  - "Remaining Work: {remaining_steps} steps (~{remaining_epochs} epochs)"
  - "Estimated Duration: {hours_min}h - {hours_max}h"
  - "Estimated Cost: ${cost_min} - ${cost_max} (based on {gpu_type})"

**Configuration Adjustment Options:**

1. **GPU Type Selection:**
   - Toggle: [Spot Instance] [On-Demand Instance]
   - Pre-selected based on context:
     - If original failed from spot interruptions (≥3): Default to on-demand with note "Recommended: Switch to on-demand to avoid further interruptions"
     - If OOM failure: Keep same GPU type
     - If spot with <2 interruptions: Default to spot
   - Cost impact: "Cost change: Spot $XX-YY → On-Demand $ZZ-WW (+$AA premium)"

2. **Batch Size Adjustment** (if OOM failure):
   - Shown if original error_type = 'OutOfMemoryError'
   - Current: batch_size = {original}
   - Suggested: batch_size = {suggested} (calculated to fit VRAM)
   - Slider or dropdown to select
   - Explanation: "Reducing batch_size from {X} to {Y} will prevent OOM error"
   - VRAM estimate: "Estimated VRAM: {original}GB (exceeded 80GB) → {new}GB (within capacity)"

3. **Epochs Adjustment:**
   - Slider: "Resume with {remaining_epochs} epochs" → adjustable down to 1 epoch
   - Can reduce remaining epochs to finish faster/cheaper
   - Display impact: "Reducing to 1 epoch: Duration -6h, Cost -$XX"
   - Cannot increase total epochs beyond original

4. **Learning Rate Schedule:**
   - Radio buttons:
     - "Continue LR schedule from checkpoint" (default, recommended)
     - "Restart LR schedule (warmup again)"
   - Tooltip: "Continuing schedule maintains training continuity. Restarting may help if training stalled."

5. **Locked Parameters:**
   - Display grayed-out fields:
     - "LoRA Rank (r): {X} - Cannot change (model architecture must match checkpoint)"
     - "Target Modules: {...} - Locked"
     - "LoRA Alpha: {Y} - Locked"
   - Explanation: "These parameters define model architecture and cannot be changed when resuming."

**Cost Estimate (Real-Time Updates):**
- Updates within 300ms of any configuration change
- Cost comparison card:
  - "Original job cost: ${spent_so_far}"
  - "Estimated additional cost: ${remaining_cost}"
  - "Total projected cost: ${total} vs original estimate ${original_estimate}"
  - Cost savings: "Switching to spot saves $XX vs original on-demand plan" (if applicable)

**Resume Confirmation Section:**
- Required checkbox: "☐ I understand this will create a new training job that continues from step {checkpoint_step}"
- Configuration changes summary:
  - "Configuration Changes: {list of changes}"
  - Example: "GPU type: Spot → On-Demand, Batch size: 4 → 2, Remaining epochs: 1.5"
- Warning if no changes: "ℹ️ You haven't modified the configuration. If the original job failed, it may fail again with the same settings."
- Context-specific recommendation: "💡 Suggestion: {advice}" (e.g., "For OOM error, we recommend reducing batch_size to 2")

**Action Buttons:**
- "Resume Training" (primary, green): Disabled until checkbox checked, creates continuation job
- "Reset to Original Configuration" (secondary): Reverts all changes
- "Cancel" (tertiary): Closes modal

**Dashboard Display for Resumed Jobs:**
- Status badge: "Training (Resumed from {original_job_name})"
- Resume indicator: "▶️ Resumed from step {checkpoint_step} of original job"
- Link to original: "View original job: {original_job_name}"
- Configuration changes highlighted: "Modified configuration: GPU type: Spot → On-Demand, Batch size: 4 → 2"
- Progress tracking: Shows continuation progress (0-100% of remaining work)
- Overall progress label: "Overall: 42% → 100% (resumed at 42%)"
- Step counter: "Step 850 → 2000 (resumed from 850)"
- Cost tracking: "Original job cost: $XX.XX (first 42%), Continuation cost: $YY.YY (remaining 58%), Total: $ZZ.ZZ"
- Loss curve: Combined curve showing both original and continuation, vertical marker at resume point with tooltip "Training resumed at step 850 after {failure_reason}"

**States to Show:**
- Failed job with checkpoint available (resume button visible)
- Resume modal opened (configuration options displayed)
- Configuration adjusted (real-time cost updates)
- Resume confirmed (creating continuation job)
- Resumed job active (training from checkpoint)
- Resumed job completed (success with combined metrics)

Interactions and Flows
1. User views failed job → Sees "Resume from Step 850" button → Clicks
2. Resume modal opens → Reviews original job summary → Sees "42% complete, 8h remaining"
3. User sees failure was OOM → Adjusts batch size 4→2 → Cost estimate updates
4. User reviews changes: "batch_size: 4 → 2, GPU: Spot → On-Demand"
5. User checks confirmation box → Clicks "Resume Training"
6. System creates continuation job → Downloads checkpoint → Resumes from step 851
7. Job dashboard shows resume indicator + combined progress → Training completes successfully

Visual Feedback
- Resume button: Blue, prominent, with play icon
- Configuration changes: Diff highlighting (old value crossed out, new value bold green)
- Cost updates: Real-time recalculation with comparison arrows
- Locked parameters: Grayed out with lock icon
- Confirmation checkbox: Must be checked to enable "Resume Training" button
- Success toast: "✓ Continuation job created! Resuming from step 850..."

Accessibility Guidance
- Resume button: ARIA label "Resume training from checkpoint at step 850, 42% complete"
- Modal keyboard navigation: Tab through fields, Enter activates buttons
- Configuration sliders: Arrow keys adjust values
- Screen reader announces: "Configuration option: Batch size, current 4, suggested 2 to prevent out of memory error"
- Checkbox: Must be checked (keyboard accessible via Space)

Information Architecture
- **Original Job Summary**: Context of what happened
- **Remaining Work**: What's left to complete
- **Configuration Adjustments**: Modifications to prevent repeat failure
- **Cost Estimates**: Financial impact of remaining work
- **Confirmation**: Agreement to proceed with changes

Page Plan
1. **Failed Job Page with Resume Button** - Shows resume option if checkpoint exists
2. **Resume Configuration Modal - Summary View** - Original job details + remaining work
3. **Resume Configuration Modal - Adjustments View** - Interactive config changes with real-time cost updates
4. **Resume Confirmation** - Changes summary + checkbox + create button
5. **Resumed Job Dashboard** - Shows continuation progress + combined metrics
6. **Resumed Job Completion** - Success with full job history (original + continuation)

Annotations (Mandatory)
- "Resume button" → US3.2.2: "Resume from Checkpoint button on failed jobs with available checkpoints"
- "Configuration adjustments" → US3.2.2: "Allow adjustments: Switch GPU type, adjust epochs, change LR schedule, modify batch size"
- "Remaining work calculation" → FR3.2.2: "Calculate remaining_steps, remaining_epochs, estimated_remaining_hours"
- "Cost estimate updates" → FR3.2.2: "Real-time cost calculation as user adjusts config, display updates within 300ms"

Acceptance Criteria → UI Component Mapping
1. **Resume Button** → Checkpoint availability detection + button display
2. **Resume Modal** → Original job summary + remaining work + config options
3. **GPU Type Toggle** → Switch spot↔on-demand with cost comparison
4. **Batch Size Adjustment** → Slider/dropdown (if OOM), VRAM estimates
5. **Epochs Adjustment** → Slider to reduce remaining epochs
6. **LR Schedule Options** → Radio buttons (continue vs restart)
7. **Cost Estimates** → Real-time calculation + comparison display
8. **Confirmation** → Checkbox + changes summary + create button
9. **Resumed Job Display** → Status indicator + combined progress + linked jobs

Non-UI Acceptance Criteria
- Checkpoint download and integrity verification
- Job continuation creation and linking
- Container startup with checkpoint resume
- Configuration application (batch size, GPU type, epochs)
- Training state restoration with modified config
- Resume success tracking and analytics

Estimated Page Count
- **6 screens/states**: Failed job with resume button → Resume modal (summary) → Resume modal (adjustments) → Confirmation → Resumed job active → Resumed job completed
- **Rationale**: Manual resume requires configuration flexibility, cost transparency, and clear decision-making. Users need to understand original failure, make informed adjustments, and track combined progress across linked jobs.

=== END PROMPT FR: FR3.2.2 ===

---

=== BEGIN PROMPT FR: FR3.3.1 ===

Title
- FR3.3.1 Wireframes — One-Click Retry with Same Configuration — Stage 3

Context Summary
- This feature implements streamlined one-click retry functionality for failed jobs by cloning configurations, auto-incrementing retry counters, linking retry chains, displaying confirmation modals with failure analysis, enabling optional editing, auto-starting retried jobs, and tracking retry success rates. The UI transforms transient failures (network timeouts, provisioning delays) into quick recovery paths while educating users about when simple retry is appropriate vs when configuration changes are needed.

Journey Integration
- Stage 3 user goals: Quickly retry after transient failures, avoid reconfiguring everything, understand if retry will succeed, minimize time to recovery
- Key emotions: Frustration relief through quick action, confidence from success rate data, efficiency from one-click approach, learning about transient vs persistent errors
- Progressive disclosure levels:
  * Basic: "Retry Job" button, one-click clone + restart
  * Advanced: Failure analysis, success rate by error type, configuration preview
  * Expert: Retry chain tracking, aggregate success metrics, retry limits
- Persona adaptations: Serves engineers recovering from transient failures who value speed over customization

Journey-Informed Design Elements
- User Goals: Retry failed job immediately, understand failure cause, avoid wasting time on doomed retries, track retry history
- Emotional Requirements: Quick path to retry, reassurance about transient errors, warning about persistent errors, satisfaction from successful retry
- Progressive Disclosure:
  * Basic: "Retry Job" → Confirmation → New job created
  * Advanced: "Retry recommended for network timeouts (92% success). Not recommended for OOM (12% success)."
  * Expert: "This is retry #3. 7 of 9 retries in your history succeeded (78%)."
- Success Indicators: User retries in <30 seconds, understands retry recommendation, successful retry completes without changes

Wireframe Goals
- Display "Retry Job" button on failed jobs with clear labeling
- Show confirmation modal with failure context and configuration summary
- Provide fresh cost estimate for retry attempt
- Explain when retry is recommended vs when configuration changes are needed
- Auto-generate job name with retry counter (Retry #1, #2, etc.)
- Track retry success rates and display guidance based on error type
- Link retry chain for traceability (Original → Retry #1 → Retry #2)

Explicit UI Requirements (from acceptance criteria)

**Retry Button Display:**
- Button on failed job details page
- Label: "Retry Job" with 🔄 icon
- Position: Header area, prominent placement
- Styling: Secondary action (blue/gray)
- Enabled for: status IN ('failed', 'cancelled')
- Disabled tooltip for successful jobs: "Job completed successfully, no retry needed"
- If checkpoint available: Both "Retry Job" and "Resume from Checkpoint" buttons visible (user chooses)

**Retry Confirmation Modal:**
- Modal header: "Retry Training Job?"
- Subheader: "Create a new job with identical configuration from the failed job"
- Dismissable with X button

**Original Job Summary Section:**
- Failure context card:
  - Job name: "{original_job_name}"
  - Status: "Failed" (red badge)
  - Failure reason: "{error_type}: {error_message}" (e.g., "OutOfMemoryError: CUDA out of memory")
  - Failed at: "Step {step} ({percentage}% complete)"
  - Elapsed time before failure: "{hours}h {minutes}m"
  - Cost spent: "${cost}"
  - Failure timestamp: "Failed {relative_time} ago (Dec 15, 2025 at 2:34 PM)"
  - Link: "View original job details"

**Retry Configuration Display:**
- Shows complete configuration being reused:
  - Training file: "{training_file_name}" ({conversation_count} conversations)
  - Hyperparameter preset: "{preset_name}" badge
  - GPU type: "Spot H100" or "On-Demand H100"
  - Key hyperparameters: "Rank: {r}, LR: {lr}, Epochs: {epochs}, Batch Size: {batch_size}"
  - All metadata: Same tags, client/project, description/notes
- Visual indicator: "✓ Configuration cloned from original job"
- Explanation: "This retry will use the exact same settings. For adjusted retry, use 'Retry with Suggested Fix' button."

**Fresh Cost Estimate:**
- Calculate new estimate (not reusing original):
  - "Estimated duration: {min}h - {max}h"
  - "Estimated cost: ${min} - ${max}"
- Comparison to original:
  - "Original estimate: ${original_est}"
  - "Original spent before failure: ${spent}"
- Warning if high cost: "⚠️ This retry will cost an additional ${estimate}. Consider 'Retry with Suggested Fix' to reduce cost."

**Retry Reasoning Display:**
- Explanation of when simple retry makes sense:
  - "Retry recommended for:"
    - "✓ Transient network errors (timeout, connection reset)"
    - "✓ Temporary GPU provisioning delays"
    - "✓ Spot interruptions without saved checkpoint (<step 100)"
    - "✓ Infrastructure hiccups (datacenter transient issues)"
  - "Retry may not help for:"
    - "✗ OutOfMemoryError (likely to fail again with same config)"
    - "✗ Dataset validation errors (data issue not fixed)"
    - "✗ Repeated spot interruption loops (same risk)"
    - "→ For these errors, use 'Retry with Suggested Fix' or 'Resume from Checkpoint'"

**Configuration Edit Option:**
- Link/button: "Edit Configuration Before Retry"
- Click opens job configuration form pre-filled with original settings
- User can modify: GPU type, hyperparameters, batch size, epochs, training file
- After edits: Proceeds to normal job creation flow
- If no edits: Emphasize "Retry with Same Config" as primary action

**Job Naming Convention:**
- Auto-generated name:
  - If original not a retry: "{original_job_name} (Retry #1)"
  - If already a retry: Increment counter "{job_name} (Retry #3)"
- Editable: User can change name in confirmation modal
- Default description: "Retry of job {original_job_id} which failed with {error_type}"

**Action Buttons:**
- "Retry Job" (primary, blue): Creates retry job, shows loading state "Creating retry job..."
- "Edit Configuration" (secondary): Opens config editor
- "Cancel" (tertiary): Closes modal

**Retry Job Display:**
- New job details page shows:
  - Status: "Queued" (starting soon)
  - Retry indicator badge: "Retry #2 of original job"
  - Link to original: "Original job: {original_job_name} [View]"
  - Configuration: "Configuration cloned from: {original_job_id}"
  - Original failure note: "Original failure: {error_type} at step {step}"
  - Expectation message: "This retry uses identical configuration. Success depends on whether original error was transient."
- Independent progress tracking: 0-100% of new attempt

**Retry Count Tracking:**
- Database fields: retry_attempt_number, retry_of_job_id
- Job history shows chain: "Original Job → Retry #1 → Retry #2 → Retry #3"
- UI displays: "This is retry attempt #2"
- Links: "Previous attempt: {job_id} (failed with {error})", "Next retry (if exists): {job_id} (status: {status})"

**Retry Success Tracking & Guidance:**
- Display insights based on historical data:
  - "85% of retried jobs complete successfully overall"
  - "For {error_type}: {X}% retry success rate"
  - "Your retry history: 7 of 9 retries successful (78%)"
- Guidance based on error type:
  - If high success rate (>80%): "✓ Jobs failing with {error_type} have {X}% retry success rate. Retry recommended."
  - If low success rate (<50%): "⚠️ Jobs failing with {error_type} have only {X}% retry success rate. Consider 'Retry with Suggested Fix' instead."

**Retry Limit Enforcement:**
- Max retries: 5 attempts per original job
- After 5 failed retries:
  - Disable "Retry Job" button
  - Display: "Maximum retry limit reached (5 attempts). Contact support for assistance."
  - Alternative: "Create New Job" (fresh start, not linked as retry)
- Warning at attempt 3+: "This is retry attempt #3. Consider reviewing configuration or contacting support if repeated failures occur."

**Cost Tracking Across Retries:**
- Aggregate cost display on original job:
  - "Total cost including retries: ${total}"
  - "Original attempt: ${cost1}, Retry #1: ${cost2}, Retry #2: ${cost3}"
  - "Total retries cost: ${retry_total} (additional expense)"
- Budget impact warning: "You've spent ${X} on retries this month. Review failure patterns to reduce retry costs."

**States to Show:**
- Failed job (retry button enabled)
- Retry confirmation modal (reviewing details)
- Creating retry job (loading)
- Retry job queued (waiting to start)
- Retry job training (independent progress)
- Retry successful (completion with link to original)
- Retry limit reached (disabled button, max attempts)

Interactions and Flows
1. User views failed job → Clicks "Retry Job" → Confirmation modal opens
2. User reviews failure reason + configuration → Sees "Network timeout (92% retry success)"
3. User clicks "Retry Job" → System clones config → Creates new job → Auto-starts
4. User redirected to new job dashboard → Monitors progress → Job completes successfully
5. Alternative: User clicks "Edit Configuration" → Modifies batch size → Proceeds to manual job creation

Visual Feedback
- Retry button: Blue with 🔄 icon
- Success rate indicators: Green (>80%), Yellow (50-80%), Red (<50%)
- Loading state: Spinner with "Creating retry job..."
- Success toast: "✓ Retry job created: {job_name}"
- Retry badge: "Retry #2" with link to original
- Cost breakdown: Separate cost lines per attempt

Accessibility Guidance
- Retry button: ARIA label "Retry failed job with same configuration"
- Modal keyboard navigation: Tab through elements
- Success rate: Announced by screen reader with recommendation
- Retry counter: "This is retry attempt 2 of 5 maximum attempts"

Information Architecture
- **Original Job Context**: What failed and why
- **Configuration Preview**: What will be retried
- **Cost Estimate**: Financial impact of retry
- **Retry Guidance**: Success likelihood and recommendations
- **Action Buttons**: Retry, edit, or cancel

Page Plan
1. **Failed Job Page with Retry Button** - Shows retry option
2. **Retry Confirmation Modal** - Failure context + config + cost + guidance
3. **Creating Retry Job** - Loading state
4. **Retry Job Dashboard** - Shows new job with retry indicator
5. **Retry Success/Failure** - Outcome with link to original
6. **Retry Limit Reached** - Max attempts message with alternatives

Annotations (Mandatory)
- "Retry button" → US3.3.1: "Failed jobs show 'Retry Job' button"
- "Configuration cloning" → US3.3.1: "Click creates new job with identical configuration: Same file, preset, GPU, name with suffix (Retry #2)"
- "Job naming" → FR3.3.1: "Auto-generated: {name} (Retry #1), increment counter for subsequent retries"
- "Success tracking" → US3.3.1: "Track retry count, success rate metric: 85% of retried jobs complete successfully"

Non-UI Acceptance Criteria
- Deep clone job configuration
- Create new job record with retry linkage
- Auto-start job (no additional confirmation)
- Track retry outcomes and success rates
- Enforce retry limits
- Aggregate cost calculations

Estimated Page Count
- **5 screens/states**: Failed job with retry button → Confirmation modal → Creating job → Retry job active → Success/failure outcome
- **Rationale**: One-click retry optimizes for speed while providing sufficient context to make informed decisions. Success rate guidance educates users. Retry limits prevent infinite loops.

=== END PROMPT FR: FR3.3.1 ===

---

=== BEGIN PROMPT FR: FR3.3.2 ===

Title
- FR3.3.2 Wireframes — Retry with Suggested Adjustments — Stage 3

Context Summary
- This feature implements intelligent retry functionality with context-aware configuration suggestions by analyzing failure patterns, generating evidence-based parameter adjustments, displaying configuration diffs, providing confidence ratings based on historical success rates, enabling users to accept recommendations or manually edit, tracking suggestion effectiveness, and optimizing for common failure modes (OOM, timeouts, spot loops). The UI transforms failures into learning moments that guide users to successful resolution with data-driven recommendations.

Journey Integration
- Stage 3 user goals: Retry with fixes that prevent repeat failure, understand why suggested changes help, learn to configure better in future, achieve high success rate on retry
- Key emotions: Confidence from intelligent guidance, learning without trial-and-error, trust in data-driven suggestions, satisfaction from successful retry
- Progressive Disclosure levels:
  * Basic: Primary suggested fix with one-click apply, confidence rating
  * Advanced: Multiple fix options with trade-offs, configuration diff viewer, cost/duration impacts
  * Expert: Historical success patterns, suggestion effectiveness tracking, ML-driven refinements
- Persona adaptations: Serves engineers who need guidance to fix failures efficiently, values learning over just quick fixes

Journey-Informed Design Elements
- User Goals: Understand what to change to prevent repeat failure, evaluate fix options with confidence ratings, apply suggested fixes easily, learn why changes help
- Emotional Requirements: Guidance without feeling patronized, confidence in recommendations, transparency about trade-offs, control over final decisions
- Progressive Disclosure:
  * Basic: "Your previous job failed with OOM. Retry with batch_size=2 (suggested) for 95% success rate?"
  * Advanced: "Fix #1: Reduce batch_size 4→2 (95% confidence). +15% longer, prevents OOM. Fix #2: Conservative preset (98% confidence)."
  * Expert: "427 similar jobs succeeded with this fix. Success rate improved from 12% to 95%."
- Success Indicators: User selects appropriate fix confidently, retry succeeds on first attempt, user learns to prevent similar failures in future jobs

Wireframe Goals
- Display "Retry with Suggested Fix" button for errors with known solutions
- Show intelligent fixes ranked by confidence and effectiveness
- Present configuration diffs with clear highlighting of changes
- Provide confidence ratings based on historical success data
- Enable selection of multiple complementary fixes
- Track suggestion effectiveness to refine recommendations
- Include educational content explaining why fixes work

Explicit UI Requirements (from acceptance criteria)

**Suggested Fix Button Display:**
- Button on failed job details page (alongside "Retry Job")
- Label: "Retry with Suggested Fix" with 🔧✨ or 🤖 icon
- Styling: Primary action (green/blue), more prominent than "Retry Job"
- Badge overlay: "Recommended" for high-confidence suggestions
- Enabled for: OutOfMemoryError, Spot Interruption Loop (≥3), Provisioning Timeout, Dataset Validation Errors, Training Timeout, Loss Plateau
- Position: Next to "Retry Job", or as primary if suggestions available

**Retry with Suggested Fix Modal:**
- Modal header: "Retry with Intelligent Fixes"
- Subheader: "We've analyzed your failure and recommend these changes"
- Icon: 🔧✨ or 🤖
- Dismissable

**Failure Analysis Section:**
- Error diagnosis card:
  - Error Type badge: "{error_type}"
  - Root Cause: "Your configuration exceeded GPU memory capacity by ~{X}GB"
  - Specific Issue: "batch_size=4 with rank=32 requires ~92GB VRAM (H100 capacity: 80GB)"
  - Impact: "Training could not proceed past step {step}"
  - Historical context: "OOM errors with this configuration fail 94% of the time"
  - User history: "2 of your last 3 jobs with Aggressive preset had OOM errors"

**Suggested Fixes Section (Ranked Cards):**

**Fix #1 - Primary Recommendation** (green highlighted card):
- Badge: "Recommended" + "95% success rate"
- Title: "Reduce Batch Size"
- Change visualization: "batch_size: 4 → 2" (strikethrough 4 in red, bold 2 in green)
- Explanation: "Reducing batch size from 4 to 2 will reduce VRAM usage by ~12GB, bringing total to 72GB (within 80GB capacity)"
- Impact bullets:
  - "+ Higher likelihood of success"
  - "+ Prevents OOM error"
  - "- Training will take ~15% longer (~2 hours)"
- Cost impact: "Cost: $48-60 (similar to original estimate)"
- Confidence visualization: Progress bar 95% (dark green)
- Historical data: "427 similar jobs succeeded with this fix (95% success)"
- Checkbox: "☑ Apply this fix" (checked by default)
- Large green button: "Apply Suggested Fixes & Retry"

**Fix #2 - Alternative** (blue card):
- Badge: "Alternative" + "98% success rate"
- Title: "Switch to Conservative Preset"
- Change: "Preset: Aggressive → Conservative"
- Detailed changes:
  - "rank: 32 → 8"
  - "learning_rate: 0.0003 → 0.0002"
  - "batch_size: 4 → 2"
- Explanation: "Conservative preset uses lower rank and batch size, significantly reducing memory requirements"
- Impact bullets:
  - "+ Very safe, 98% success rate"
  - "- Lower model capacity, may reduce quality by ~5-10%"
  - "- Training faster (~10h instead of 14h)"
- Cost: "$35-45 (cheaper than original)"
- Confidence bar: 98% (dark green)
- Checkbox: "☐ Apply this fix" (unchecked, user can select instead of Fix #1)

**Fix #3 - Advanced** (yellow/gray card, collapsible):
- Title: "Manual Configuration Adjustments"
- Description: "Fine-tune parameters yourself"
- Button: "Edit Configuration Manually" (opens config editor with suggested values pre-filled)

**Configuration Diff Viewer:**
- Interactive diff display:
  - Side-by-side comparison: "Original Configuration | Suggested Configuration"
  - Changed parameters highlighted:
    - "batch_size: 4 | 2" (red for old, green for new)
  - Unchanged parameters grayed: "epochs: 3 (same)"
- Explanation tooltips on hover:
  - "Why this change?", "What's the impact?", "What's the confidence?"
- Visual summary: "3 parameters changed, 7 unchanged", "Success rate increase: 12% → 95%"

**Cost & Duration Impact:**
- Recalculated estimates based on suggested config:
  - "Original Estimate: $48-60, 12-14 hours"
  - "Suggested Configuration: $52-65, 13-15 hours (+$4, +1h)"
- Explanation: "Longer duration due to smaller batch size, but highly likely to succeed"
- Trade-off visualization:
  - Success Probability: 12% → 95% ✓ (large green up arrow)
  - Duration: 12h → 13h ↑ (small yellow up arrow)
  - Cost: $48 → $52 ↑ (small yellow up arrow)
  - Overall assessment: "Worth the slight increase for 95% success vs 12%"

**Multiple Fix Selection:**
- Checkboxes allow combining fixes (if compatible):
  - "☑ Reduce batch_size"
  - "☐ Switch to Conservative preset"
  - "☐ Switch to on-demand GPU"
- System validates compatibility:
  - If incompatible: "Cannot combine 'Conservative preset' with 'Reduce batch_size only' (Conservative already includes reduced batch_size)"
  - Auto-adjust: If user selects Conservative preset, uncheck individual batch_size change (redundant)
- Combined impact: "Combined success rate: 97%", "Combined cost: $55-70"

**Confidence Rating Methodology:**
- Confidence tiers with badges:
  - 90-100%: "Very High Confidence" (dark green)
  - 75-89%: "High Confidence" (green)
  - 60-74%: "Medium Confidence" (yellow)
  - <60%: "Low Confidence" (orange), "Experimental" tag
- Minimum sample size note: If <20 historical cases: "Confidence: Experimental (limited data). Help us improve by trying this fix."
- Confidence calculation shown in tooltip: "Based on 427 retries with this fix, 407 succeeded (95%)"

**User Decision Actions:**
- "Apply Suggested Fixes & Retry" (primary, green): Disabled until ≥1 fix selected, shows loading "Creating retry job with suggested fixes..."
- "Edit Manually" (secondary): Opens config editor with suggested values pre-filled
- "Retry Without Changes" (tertiary, text link): Fallback to simple retry with warning "Not recommended - original configuration likely to fail again"
- "Cancel" (close modal)

**Retry Job Display with Suggestions:**
- New job shows:
  - Status: "Queued (with suggested fixes)"
  - Retry indicator: "Intelligent Retry of {original_job_name}"
  - Applied Fixes section:
    - "Applied Suggestions:"
    - "• Batch size reduced: 4 → 2 (95% confidence)"
    - "• GPU switched: Spot → On-Demand (99% confidence)"
  - Expected success rate: "Based on similar fixes: 95% likely to succeed"
  - Link: "View original failed job"
- Special monitoring:
  - "Monitoring for previously failed step ({failed_step})..."
  - If passes failed step: "✓ Passed step {failed_step} successfully! Suggestion worked."
  - If completes: "✓ Training completed! Suggested fixes resolved the issue."

**Suggestion Effectiveness Tracking:**
- After retry completes, update suggestion analytics:
  - Track: retry_outcome, retry_successful, actual_cost, actual_duration
  - Calculate: success_rate per suggestion_type
  - Compare: suggested_success_rate vs simple_retry_success_rate
- Use data to refine future suggestions:
  - If consistently successful (>90%): Promote to "Recommended" tier
  - If rarely successful (<50%): Demote or flag for engineering review
- Display to managers: "Top Suggested Fixes: Reduce batch_size (23 times, 95% success), Switch to on-demand (12 times, 100% success)"

**Educational Content:**
- Each suggestion includes:
  - "Why does this help?" section with plain-language explanation
  - "Trade-offs to consider" with realistic pros/cons
  - "Learn more" link to documentation
- Builds user expertise over time, reduces repeat errors

**States to Show:**
- Failed job with suggested fix button available
- Suggestion modal with ranked fixes
- Multiple fixes selected (combined impact)
- Configuration diff preview
- Creating retry with suggestions
- Retry job with suggestions active
- Success with celebration of fix effectiveness

Interactions and Flows
1. User views failed OOM job → Sees "Retry with Suggested Fix" button (recommended) → Clicks
2. Modal opens → Reviews failure analysis → Sees Fix #1 (batch_size 4→2, 95% confidence)
3. User reviews impact: "+Success, -15% longer, similar cost" → Decides to apply
4. User clicks "Apply Suggested Fixes & Retry" → System creates job with batch_size=2
5. Job starts → Passes step 450 (where original failed) → Success notification
6. Job completes → Celebration: "✓ Suggested fix worked! 95% confidence was accurate."

Visual Feedback
- Suggested fix button: Green/blue with sparkle icon, "Recommended" badge
- Confidence ratings: Color-coded progress bars (green=high)
- Configuration diff: Red strikethrough (old), green bold (new)
- Trade-off visualization: Arrows (↑↓) with color coding
- Success rate trends: Large arrows showing improvement
- Applied fixes: Green checkmarks next to each suggestion
- Success celebration: Animated checkmark with "Suggestion worked!" message

Accessibility Guidance
- Button: ARIA label "Retry with AI-suggested configuration fixes for 95% success rate"
- Modal: Screen reader announces fixes count and primary recommendation
- Confidence ratings: Announced as percentages with context
- Diff viewer: Old/new values clearly announced
- Checkboxes: Keyboard accessible, Space to toggle

Information Architecture
- **Failure Analysis**: What went wrong
- **Suggested Fixes**: Ranked solutions with confidence
- **Configuration Diff**: Precise changes visualization
- **Impact Analysis**: Cost/time/success trade-offs
- **Educational Content**: Why fixes work
- **Action Selection**: Choose fixes and apply

Page Plan
1. **Failed Job with Suggested Fix Button** - Recommended action
2. **Suggestion Modal - Failure Analysis** - Root cause explanation
3. **Suggestion Modal - Fix Options** - Ranked suggestions with confidence
4. **Configuration Diff Preview** - Detailed changes visualization
5. **Retry Job with Suggestions Active** - Monitoring for success at previously failed step
6. **Success Celebration** - Fix effectiveness confirmation

Annotations (Mandatory)
- "Suggested fix button" → US3.3.2: "For specific error types, offer 'Retry with Suggested Fix' button"
- "OOM suggestions" → US3.3.2: "Reduce batch_size: 4 → 2, highlight changes"
- "Confidence ratings" → FR3.3.2: "Historical success rate calculation, 95% = 407 of 427 succeeded"
- "Configuration diff" → US3.3.2: "Show diff of configuration changes with strikethrough/bold"
- "Effectiveness tracking" → US3.3.2: "Track success rate of suggested fixes, learn from patterns"

Non-UI Acceptance Criteria
- Suggestion generation engine (analyzes error + config)
- Historical success rate calculation
- Configuration diff algorithm
- Job creation with applied suggestions
- Suggestion effectiveness tracking
- ML-driven refinement (future)

Estimated Page Count
- **6 screens/states**: Failed job with button → Suggestion modal (analysis) → Suggestion modal (fixes) → Diff preview → Retry with suggestions active → Success celebration
- **Rationale**: Intelligent retry requires failure analysis, fix presentation with confidence data, configuration diff transparency, and success tracking. Educational elements build user expertise. Effectiveness tracking enables continuous improvement.

=== END PROMPT FR: FR3.3.2 ===

---

**END OF FIGMA WIREFRAME PROMPTS FOR STAGE 3**

All 8 FR wireframe prompts for Stage 3 — Error Handling & Recovery have been generated.

Total prompts: 8
- FR3.1.1: Out of Memory Error Handling
- FR3.1.2: Dataset Format Error Handling
- FR3.1.3: GPU Provisioning Error Handling
- FR3.2.1: Spot Instance Interruption Recovery
- FR3.2.2: Manual Checkpoint Resume
- FR3.3.1: One-Click Retry with Same Configuration
- FR3.3.2: Retry with Suggested Adjustments

Each prompt is self-contained and ready for Figma Make AI without requiring external file access.

