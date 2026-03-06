# LoRA Pipeline - Stage 1 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 1 — Training Job Configuration & Setup  
**Section ID:** E01  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E01.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E01.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E01-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 1 — Training Job Configuration & Setup - Complete Integrated Wireframe System

**Context Summary**

This stage enables users to create and configure a new LoRA training job through a streamlined, integrated workflow. Users select a training dataset from their library, choose from three scientifically-validated hyperparameter presets (Conservative, Balanced, Aggressive), select GPU pricing tier (spot vs on-demand) with transparent cost trade-offs, view real-time cost estimates with budget validation, add optional metadata for organization, and review the complete configuration before starting the training job. The interface prioritizes simplicity, cost transparency, and confidence-building for proof-of-concept validation while maintaining core functionality for informed decision-making about expensive GPU training runs.

**Journey Integration**

- **Stage 1 User Goals:** 
  - First training job setup with guided configuration
  - Understanding dataset quality and training readiness
  - Making informed cost vs quality trade-off decisions
  - Transparent cost and time expectations before commitment
  - Building confidence in platform capabilities
  - Avoiding budget surprises and overages

- **Key Emotions:** 
  - Initial curiosity and exploration → Anxiety reduction through clear information → Confidence building through quality indicators and proven presets → Relief through upfront cost estimates → Trust in transparent pricing and budget controls → Final pre-commitment confidence through comprehensive review

- **Progressive Disclosure:** 
  - **Basic:** Simple selection interfaces (dropdown, radio cards, toggle) with essential metadata and total cost
  - **Advanced:** Quality score indicators, cost variance explanations, budget impact projections
  - **Expert:** (Removed for POC - expandable parameters, historical accuracy, optimization tips)

- **Persona Adaptations:** 
  - Unified interface serving all personas with visual quality indicators for non-technical users, simple preset names with success rates for business owners, and essential technical parameters for engineers without overwhelming detail

**Wireframe Goals**

- Enable confident training file selection through simplified metadata display (name, conversation count, quality score)
- Guide hyperparameter configuration through three proven presets with clear cost/quality trade-offs
- Facilitate intelligent GPU selection (spot vs on-demand) with transparent cost comparison (70% savings vs guaranteed completion)
- Provide real-time cost estimation updating within 500ms of configuration changes
- Enforce monthly budget limits with clear validation feedback and actionable error messages
- Support basic job organization through auto-generated names and optional descriptions
- Build final confidence through comprehensive configuration review and explicit confirmation before expensive GPU provisioning

**Explicit UI Requirements**

### SECTION 1: Training File Selection (FR1.1.1 - Simplified)

**Searchable Dropdown:**
- Component: Searchable dropdown with training files
- Data source: `training_files` table WHERE status='active' AND conversation_count >= 50
- Display: Top 10 most recent training files by default
- Search: Real-time filtering by file name as user types (debounced 300ms)
- Each dropdown item shows: File name (bold), Conversation count (gray text)
- Empty state: "No training files available. Upload a training file to get started."
- Loading state: Skeleton loader (3 shimmer rows) while fetching files
- Placeholder: "Select training file..." with search icon

**Metadata Panel (appears on selection):**
- Trigger: When user selects training file from dropdown
- Animation: Fade-in + slide-down (300ms) below dropdown
- Display:
  - File name (bold, 18px)
  - Conversation count: "242 conversations" with icon
  - Quality score: "4.5/5" with color-coded badge:
    - Green ≥4.0: "✓ High Quality" (green background)
    - Yellow 3.0-3.9: "⚠ Review" (yellow background)
    - Red <3.0: "✗ Low Quality" (red background)
- States: Hidden (before selection), Visible (after selection)

**NOT INCLUDED (removed for POC):**
- ❌ Detailed scaffolding distribution (personas, emotional arcs, topics breakdown)
- ❌ Human review statistics percentage
- ❌ Preview conversations modal
- ❌ Expandable quality score breakdown (empathy, clarity, appropriateness subscores)
- ❌ File size and storage location
- ❌ Eligibility validation indicators (assumed all files in dropdown are eligible)

### SECTION 2: Hyperparameter Preset Selection (FR1.1.2 - Simplified)

**Preset Radio Cards:**
- Layout: Three cards displayed horizontally with equal width
- Component type: Radio card group (single selection)
- Default: Balanced preset selected on page load

**Conservative Preset Card:**
- Icon: Shield (top-left, indicates safety/low-risk)
- Name: "Conservative" (bold, 16px)
- Description: "Best for first runs" (gray, 14px)
- Cost estimate: "$25-30" (large, 20px, secondary color)
- Success rate: "98%" with small "success rate" label (green badge)
- Selected state: Blue border (3px), blue background tint (5% opacity), checkmark icon (top-right)
- Unselected state: Gray border (1px), white background
- Hover state: Light gray background, slight shadow, cursor pointer

**Balanced Preset Card:**
- Icon: Scales (balance/middle ground)
- Name: "Balanced" (bold, 16px)
- Description: "Production ready" (gray, 14px)
- Cost estimate: "$50-60" (large, 20px, secondary color)
- Success rate: "96%" with label (green badge)
- DEFAULT SELECTION: Selected state on page load
- Selected state: Blue border (3px), blue background tint, checkmark icon
- States: Same as Conservative

**Aggressive Preset Card:**
- Icon: Rocket (maximum performance)
- Name: "Aggressive" (bold, 16px)
- Description: "Maximum quality" (gray, 14px)
- Cost estimate: "$80-100" (large, 20px, secondary color)
- Success rate: "92%" with label (yellow badge indicating slightly lower success)
- States: Same as Conservative
- Interaction: Fully functional, no locked state for POC

**NOT INCLUDED (removed for POC):**
- ❌ Expandable technical parameters section (rank, learning rate, epochs, batch size, gradient accumulation)
- ❌ Interactive tooltips explaining each hyperparameter
- ❌ Risk level badges (low, medium, high)
- ❌ Recommended use cases text
- ❌ Links to "Understanding LoRA Hyperparameters" documentation
- ❌ Aggressive preset locked state for users with <3 completed jobs
- ❌ Historical job count display (e.g., "based on 127 completed jobs")

### SECTION 3: GPU Selection (FR1.1.3 - Simplified)

**Toggle Control:**
- Component: Two-option toggle switch
- Options: "Spot Instance" (left) / "On-Demand Instance" (right)
- Default: Spot Instance selected
- Visual: Selected option highlighted in blue, unselected in gray
- Animation: Smooth slide transition (200ms) when switching

**Spot Instance Display:**
- Label: "Spot Instance" (bold)
- Price: "$2.49/hr" (large, 18px)
- Badge: "Save 70%" (green background, white text)
- Icon: Tag/discount icon next to badge

**On-Demand Instance Display:**
- Label: "On-Demand Instance" (bold)
- Price: "$7.99/hr" (large, 18px)
- Badge: "Guaranteed" (blue background, white text)
- Icon: Shield/checkmark icon next to badge

**Interaction:**
- Click either option to select
- Toggle animation between options
- Triggers cost recalculation immediately (see Cost Estimation Panel)

**NOT INCLUDED (removed for POC):**
- ❌ Historical interruption rate data (e.g., "18% interruption rate last 30 days")
- ❌ Recovery guarantee details (automatic checkpoint recovery <10 min)
- ❌ Context-aware recommendation banner (recommending spot or on-demand based on job characteristics)
- ❌ High-cost confirmation modal (when selecting on-demand for >$150 jobs)
- ❌ Low spot availability warning (datacenter utilization)
- ❌ Provisioning time estimates
- ❌ Comparison cards with benefits/trade-offs lists

### SECTION 4: Cost Estimation Sidebar (FR1.2.1 - Simplified)

**Panel Layout:**
- Position: Fixed sidebar on right (desktop, 1/3 width) OR card below main content (mobile)
- Always visible: Sticky positioning, doesn't scroll away
- Background: Light gray (#F8F9FA), subtle border
- Title: "Cost Estimate" with small real-time indicator (pulsing green dot)

**Duration Display:**
- Label: "Duration" (bold, 14px)
- Value: "12-15 hours" (large, 18px)
- Format: Range (min-max) in hours

**Cost Display:**
- Label: "Cost" (bold, 14px)
- Value: "$50-60" (large, 24px, bold)
- GPU type indicator: "(spot)" or "(on-demand)" in gray text
- Color coding:
  - Green: <$50
  - Yellow: $50-100
  - Orange: >$100

**Accuracy Disclaimer:**
- Text: "±15% variance" (small, 12px, gray)
- Position: Below cost value

**Update Animation:**
- When configuration changes (file, preset, GPU):
  - Previous estimate: Strikethrough + fade to gray (200ms)
  - New estimate: Fade in + count up animation (300ms)
  - Delta indicator: "↓ $20 saved" (green) or "↑ $30 increase" (red) with arrow icon
  - Delta fades out after 3 seconds

**Initial State:**
- Before training file selected: Shows "--" for duration and cost
- After file selected: Displays calculated estimates

**NOT INCLUDED (removed for POC):**
- ❌ Expandable cost breakdown (GPU compute, spot buffer, storage itemization)
- ❌ Historical accuracy metrics ("Past estimates within ±12%")
- ❌ Time-to-completion estimate ("Estimated completion: Today at 11:45 PM")
- ❌ High cost warning banner (>$100)
- ❌ Long duration warning (>24 hours)
- ❌ Optimization tips link
- ❌ Confidence interval display

### SECTION 5: Budget Validation (FR1.2.2 - Simplified)

**Budget Status Indicator:**
- Position: Within cost estimation panel, below cost display
- Section title: "Budget Status" (bold, 14px)

**Sufficient Budget State:**
- Icon: Green checkmark (✓)
- Text: "Within Budget" (green, bold)
- Details: "Remaining: $200" (gray text)
- Display format: "{icon} {status} - {remaining}"

**Budget Exceeded State:**
- Icon: Red X (❌)
- Text: "Over Budget" (red, bold)
- Details: "Exceeds remaining by $50" (red text)
- Display format: "{icon} {status} - Exceeds remaining by ${amount}"
- Additional line: "Adjust configuration to proceed" (gray, 12px)

**Suggestion Text (when over budget):**
- Display below status indicator
- Format: "💡 Try Conservative preset to save $XX" OR "Switch to Spot to save $XX"
- Links: Clicking suggestion automatically adjusts configuration (optional interactivity)

**Effect on Review Button:**
- When budget exceeded: "Review & Start Training" button disabled (gray, cursor not-allowed)
- When budget sufficient: Button enabled (blue, clickable)

**NOT INCLUDED (removed for POC):**
- ❌ Budget utilization warnings at 80% and 90% thresholds
- ❌ Forecast including active jobs ("With 2 active jobs + this job, projected: $XXX")
- ❌ Budget increase workflow (request form, manager approval routing)
- ❌ Manager override button for users with manager role
- ❌ Detailed monthly spend breakdown
- ❌ Budget dashboard link
- ❌ Grace period messaging (10% overage allowance)

### SECTION 6: Job Metadata (FR1.3.1 - Simplified)

**Job Name Field:**
- Type: Text input (required)
- Label: "Job Name" with asterisk (*)
- Auto-populated value: "{trainingFileName} - {preset} - {YYYY-MM-DD}"
  - Example: "Elena Morales Financial - Balanced - 2025-12-19"
- User editable: Can click and modify auto-generated name
- Character limit: 100 characters
- Character counter: "45/100" (gray, 12px, below input)
- Validation: 3-100 characters required
- Error state: Red border + "Job name must be 3-100 characters" if invalid

**Description Field:**
- Type: Textarea (optional)
- Label: "Description (optional)"
- Placeholder: "Purpose of this training run (optional)"
- Character limit: 500 characters
- Character counter: "0/500" (gray, 12px, below textarea)
- Height: 3 rows (resizable by user)
- Style: Light gray border, white background

**Layout:**
- Position: Below GPU selection section, above "Review & Start" button
- Spacing: Adequate vertical padding (24px above, 32px below)
- Full width of main content area (not in sidebar)

**NOT INCLUDED (removed for POC):**
- ❌ Notes field (2000 character limit with markdown support)
- ❌ Tags system (multi-select dropdown with predefined and custom tags)
- ❌ Tag pills display
- ❌ Client/project assignment dropdown
- ❌ Auto-save draft functionality
- ❌ Duplicate name warning
- ❌ Markdown preview
- ❌ Custom field creation

### SECTION 7: Review & Start Button (FR1.3.2 Trigger)

**Button Component:**
- Type: Primary action button
- Label: "Review & Start Training" with small icon (play or arrow)
- Size: Large (48px height), full width of main content area
- Position: Bottom of configuration form, below metadata section

**Enabled State:**
- Conditions: Training file selected AND preset selected AND GPU selected AND job name valid (3-100 chars) AND budget validation passed
- Style: Blue background (#2563EB), white text, bold, cursor pointer
- Hover: Slightly darker blue, subtle scale (1.02x)
- Active/Click: Even darker blue, scale down (0.98x)

**Disabled State:**
- Conditions: Any required field missing OR budget exceeded
- Style: Gray background (#D1D5DB), gray text, cursor not-allowed
- No hover effect
- Tooltip on hover: "Complete all required fields to continue" OR "Exceeds budget - adjust configuration"

**Loading State:**
- After click, before modal opens
- Style: Blue background, spinner icon replacing button text
- Text: "Loading..." (optional)
- Duration: Brief (should open modal within 200ms)

**Interaction:**
- Click opens full-screen review modal (see Modal section below)
- Keyboard: Enter key submits form (opens modal) when button enabled

### MODAL: Review & Start Confirmation (FR1.3.2 - Simplified)

**Modal Overlay:**
- Trigger: Click "Review & Start Training" button
- Style: Full-screen overlay with 50% black opacity background dim
- Animation: Fade in (300ms)
- Behavior: Cannot close by clicking outside (must use Cancel or X button)
- Accessibility: Focus trap (Tab cycles within modal), Escape key closes modal

**Modal Container:**
- Size: Max-width 800px, centered horizontally and vertically
- Background: White with subtle shadow
- Border radius: 8px
- Padding: 32px
- Scrollable: If content exceeds viewport height

**Modal Header:**
- Title: "Review Training Configuration" (H2, 24px, bold)
- Estimated cost: "$50-60" (large, 20px, secondary color, right-aligned)
- Close button: X icon in top-right corner (gray, hover to dark gray)
- Bottom border: Subtle line separating header from content

**Training File Card:**
- Section title: "Training Dataset" (bold, 16px)
- Background: Light gray (#F8F9FA), rounded corners, padding
- Content:
  - File name: "{trainingFileName}" (bold, 16px)
  - Conversation count: "242 conversations" with icon
  - Quality score: "4.5/5" with color-coded indicator (green ✓, yellow ⚠, or red ✗)

**Configuration Card:**
- Section title: "Configuration" (bold, 16px)
- Background: Light gray, rounded corners, padding
- Content:
  - Preset name: "{preset}" with colored badge (Conservative=green, Balanced=blue, Aggressive=orange)
  - Key parameters: "Rank: 16, Epochs: 3, Learning Rate: 0.0002" (gray, 14px, single line)
  - GPU type: "H100 PCIe 80GB" (bold)
  - Pricing tier: "Spot Instance - Save 70%" (green badge) OR "On-Demand - Guaranteed" (blue badge)
  - Hourly rate: "$2.49/hr" or "$7.99/hr" (gray, 14px)

**Cost Card:**
- Section title: "Cost Estimate" (bold, 16px)
- Background: Light blue tint (#EFF6FF), rounded corners, padding (highlight importance)
- Content:
  - Duration: "12-15 hours" with clock icon
  - Cost range: "$50-60 (±15%)" (large, 20px, bold)
  - Budget impact: "$387 used + $52 this job = $439 of $500" (gray, 14px)
  - Remaining: "$61 available after this job" (green text if >$50, yellow if $20-50, red if <$20)

**Confirmation Checklist:**
- Section title: "Confirmation" (bold, 16px)
- Spacing: 16px above, 24px below
- Checkbox 1: "☐ I have reviewed the configuration above" (large checkbox, 18px, with label text)
- Checkbox 2: "☐ I understand the estimated cost ($50-60)" (large checkbox, 18px, with label text)
- Both checkboxes required: "Start Training" button disabled until both checked
- Checkbox style: Blue checkmark when selected, gray border when unselected
- Interaction: Click checkbox or label to toggle

**Action Buttons:**
- Layout: Horizontal row at bottom of modal, 16px spacing between buttons

**"Start Training" Button:**
- Type: Primary action button
- Style: Green background (#10B981), white text, bold, large (48px height)
- Width: Auto (content + padding), prominent sizing
- Disabled state: Gray background, gray text, cursor not-allowed (until both checkboxes checked)
- Enabled state: Green, cursor pointer, hover to darker green
- Click behavior: Creates job in database, shows loading spinner, redirects to job details page (/training-jobs/{job_id})
- Loading state: Green background with spinner, text "Starting..."

**"Edit Configuration" Button:**
- Type: Secondary action button
- Style: Gray border, gray text, white background, medium size (40px height)
- Width: Auto
- Click behavior: Closes modal (fade out 200ms), returns to configuration form with all settings preserved
- No confirmation required

**"Cancel" Button:**
- Type: Tertiary action button
- Style: Text link (no border), gray text, underline on hover
- Width: Auto
- Click behavior: Closes modal, returns to job list page (discards configuration)
- Confirmation: Optional "Are you sure?" if user has made configuration changes

**Modal States:**

**Initial State (unchecked):**
- Modal open with all summary cards visible
- Checkboxes unchecked
- "Start Training" button disabled (gray)

**Checkboxes Checked State:**
- User has checked both checkboxes (✓)
- "Start Training" button enabled (green, prominent)
- Ready to start job

**Loading State:**
- User clicked "Start Training"
- Button shows spinner
- Modal still open briefly during job creation
- Then redirect to job details page

**NOT INCLUDED (removed for POC):**
- ❌ Warnings section (high cost, aggressive parameters, low budget, long duration, first-time user)
- ❌ Third checkbox: "I have obtained necessary budget approval"
- ❌ Comparison to previous similar jobs
- ❌ Template support ("Based on template: {name}")
- ❌ Detailed cost breakdown with bar chart visualization
- ❌ Multiple warning scenarios with conditional display
- ❌ Forecast including active jobs
- ❌ Historical comparison of estimate accuracy

---

## Interactions and Flows

### Flow 1: Initial Page Load
1. User navigates to "Create Training Job" page
2. Page loads with empty/default state:
   - Training file dropdown: Empty with placeholder "Select training file..."
   - Preset selector: Balanced selected by default (blue border, checkmark)
   - GPU toggle: Spot selected by default
   - Cost sidebar: Shows "--" for duration and cost
   - Job name field: Empty
   - Description field: Empty with placeholder
   - "Review & Start" button: Disabled (gray)
3. All sections visible and ready for user input

### Flow 2: Select Training File
1. User clicks training file dropdown
2. Dropdown expands, showing list of training files (searchable)
3. User types to search (optional) - results filter in real-time
4. User clicks a training file to select
5. Dropdown collapses, showing selected file name
6. Metadata panel appears below dropdown (fade-in animation 300ms):
   - File name: "Elena Morales Financial"
   - Conversations: "242 conversations"
   - Quality: "4.5/5 ✓ High Quality" (green badge)
7. Cost estimation panel updates (300ms animation):
   - Duration: "12-15 hours"
   - Cost: "$50-60 (spot)"
   - Budget: "✓ Within Budget - $200 remaining" (green)
8. Job name field auto-populates:
   - "Elena Morales Financial - Balanced - 2025-12-19"
9. "Review & Start" button enables (blue) if all required fields valid

### Flow 3: Change Preset
1. User clicks Aggressive preset card
2. Card selection changes:
   - Aggressive card: Blue border + checkmark + blue tint background
   - Balanced card: Gray border, white background (deselected)
3. Cost estimation panel updates (500ms animation):
   - Previous cost "$50-60" fades to gray with strikethrough
   - New cost "$80-100" fades in bold
   - Delta indicator appears: "↑ $30 increase" (red, with up arrow)
   - Duration updates: "18-20 hours"
4. Job name updates:
   - "Elena Morales Financial - Aggressive - 2025-12-19"
5. Budget validation re-runs:
   - If still within budget: Status stays green
   - If exceeds budget: Status turns red, button disables (see Flow 6)
6. Delta indicator fades out after 3 seconds

### Flow 4: Toggle GPU Type
1. User clicks "On-Demand" option in toggle
2. Toggle animation: Blue highlight slides from Spot to On-Demand (200ms)
3. Cost estimation panel updates immediately:
   - Previous cost "$80-100" fades to gray with strikethrough
   - New cost "$200-240" fades in bold
   - Delta indicator: "↑ $120 increase" (red, with up arrow)
   - Cost changes from "(spot)" to "(on-demand)" text
4. Budget validation re-runs:
   - May trigger budget exceeded error (see Flow 6)
5. Delta indicator fades out after 3 seconds

### Flow 5: Add Metadata
1. User clicks job name field
2. Field activates with blue focus border
3. User edits auto-generated name:
   - Types: "Acme Q4 Production Model - Aggressive - 2025-12-19"
   - Character counter updates in real-time: "52/100"
4. User clicks description field (optional)
5. Field activates with blue focus border
6. User types description:
   - "Production model for Acme Financial Q4 delivery. Testing aggressive parameters on high-quality emotional intelligence dataset."
   - Character counter updates: "128/500"
7. Fields validate:
   - Job name: Valid (3-100 characters)
   - Description: Valid (0-500 characters, optional)
8. "Review & Start" button remains enabled (if budget OK)

### Flow 6: Budget Error Flow
1. User configures expensive job (e.g., Aggressive + On-Demand)
2. Cost estimation calculates: "$200-240"
3. Budget validation runs:
   - Compares estimated cost ($240 max) to remaining budget ($200)
   - Exceeds by $40
4. Budget status updates in cost sidebar:
   - Icon: Red X (❌)
   - Text: "Over Budget - Exceeds remaining by $40" (red)
   - Suggestion: "💡 Switch to Conservative preset to save $120"
5. "Review & Start" button disables:
   - Background: Gray
   - Cursor: not-allowed
   - Tooltip on hover: "Exceeds budget - adjust configuration"
6. User adjusts configuration (e.g., switches to Spot)
7. Cost recalculates: "$80-100"
8. Budget validation re-runs:
   - Now within budget
9. Budget status updates:
   - Icon: Green checkmark (✓)
   - Text: "Within Budget - $100 remaining" (green)
10. "Review & Start" button re-enables (blue)

### Flow 7: Review & Start
1. User clicks "Review & Start Training" button
2. Button shows brief loading state (spinner, 200ms)
3. Full-screen modal opens (fade-in animation 300ms):
   - Background dims to 50% black overlay
   - Modal container appears centered
4. Modal displays configuration summary:
   - Training File card: "Elena Morales Financial, 242 conversations, Quality: 4.5/5 ✓"
   - Configuration card: "Aggressive preset, Rank: 32, Epochs: 4, LR: 0.0003, GPU: H100 Spot ($2.49/hr)"
   - Cost card: "18-20 hours, $80-100, Budget: $387 + $100 = $487 of $500, $13 remaining"
   - Checkboxes: Both unchecked
   - "Start Training" button: Disabled (gray)
5. User reads configuration summary

### Flow 8: Confirm & Start Training
1. User checks first checkbox: "I have reviewed the configuration above"
   - Checkbox shows blue checkmark (✓)
2. User checks second checkbox: "I understand the estimated cost ($80-100)"
   - Checkbox shows blue checkmark (✓)
3. "Start Training" button enables:
   - Background: Green (#10B981)
   - Prominent and clickable
4. User clicks "Start Training" button
5. Button shows loading state:
   - Green background with white spinner
   - Text: "Starting..."
6. System creates job record in database:
   - INSERT into training_jobs table
   - Status: 'queued'
   - Returns job_id
7. System redirects to job details page:
   - URL: /training-jobs/{job_id}
   - Shows "GPU provisioning in progress..." state
8. Modal closes (not visible during redirect)

### Flow 9: Edit Configuration from Review
1. User is on review modal (step 5 from Flow 7)
2. User realizes they want to change preset or GPU
3. User clicks "Edit Configuration" button (gray, secondary)
4. Modal closes (fade-out animation 200ms)
5. Returns to configuration form:
   - All settings preserved exactly as they were
   - Training file still selected
   - Preset still selected
   - GPU still selected
   - Metadata still filled
6. User makes changes (e.g., changes from Aggressive to Balanced)
7. Cost updates automatically
8. User clicks "Review & Start" again
9. Returns to review modal with updated configuration

### Flow 10: Cancel from Review
1. User is on review modal
2. User decides not to start job
3. User clicks "Cancel" button (gray text link)
4. Optional: Confirmation dialog "Are you sure? Configuration will be lost." (if changes made)
5. Modal closes (fade-out 200ms)
6. Returns to job list page (or previous page)
7. No database changes made

---

## Visual Feedback

### Selection States
- **Radio cards (presets):** Blue border (3px), blue background tint (5%), checkmark icon top-right (selected) vs Gray border (1px), white background (unselected)
- **Toggle (GPU):** Blue highlight on selected option, gray on unselected, smooth slide animation (200ms)
- **Dropdown:** Selected file shown in field with dark text, dropdown items highlight on hover (light gray background)

### Cost Updates
- **Animated transitions:** Previous value fades to gray with strikethrough (200ms), new value fades in bold (300ms)
- **Delta badges:** 
  - Savings: "↓ $XX saved" with down arrow, green background, white text
  - Increase: "↑ $XX increase" with up arrow, red background, white text
  - Appears with fade-in, persists 3 seconds, fades out
- **Number animation:** Cost values count up or down smoothly (300ms duration)

### Budget Validation
- **Sufficient:** Green checkmark (✓), green text "Within Budget", green amount
- **Exceeded:** Red X (❌), red text "Over Budget", red amount "Exceeds by $XX"
- **Suggestions:** Light bulb icon (💡), blue text, underlined on hover (clickable)

### Loading States
- **Dropdown:** Skeleton loaders (3 shimmer rows, gray animated gradient)
- **Cost panel:** Initial state shows "--" in gray, shimmer animation while calculating
- **Button:** Spinner icon (rotating) replaces button text, button stays same color
- **Modal:** Brief fade-in animation (300ms) when opening

### Success Indicators
- **File selected:** Brief green flash animation on metadata panel appearance (100ms)
- **Budget validation pass:** Quick green pulse on checkmark (200ms)
- **Checkboxes checked:** Blue checkmark with subtle scale animation (150ms)

### Animations
- **Fade-ins:** 300ms duration for panels, modals, overlays
- **Slide-down:** Metadata panel slides down from dropdown (300ms ease-out)
- **Number transitions:** Cost values animate with count up/down (300ms)
- **Toggle switch:** Highlight slides between options (200ms ease-in-out)
- **Scale effects:** Buttons scale 1.02x on hover, 0.98x on active/click

### Error States
- **Budget exceeded:** Red X icon, red text, red border on cost panel section
- **Invalid field:** Red border on input field, red error text below field
- **Disabled button:** Gray background, gray text, cursor not-allowed, tooltip on hover explaining why

---

## Accessibility Guidance

### Keyboard Navigation
- **Tab order:** Training file dropdown → Preset cards (left to right) → GPU toggle → Job name → Description → Review button
- **Arrow keys:** Within dropdown (up/down to navigate items), between preset cards (left/right to move focus)
- **Enter/Space:** Select dropdown item, select preset card, toggle GPU, check checkbox, activate button
- **Escape:** Close dropdown, close modal, cancel action

### Screen Reader Support
- **ARIA labels:**
  - Training file dropdown: aria-label="Select training file", aria-expanded="true/false"
  - Each dropdown item: aria-label="Elena Morales Financial, 242 conversations, quality 4.5 out of 5"
  - Preset cards: role="radio", aria-checked="true/false", aria-label="Conservative preset, estimated cost $25-30, 98% success rate"
  - GPU toggle: role="radiogroup", each option aria-checked="true/false"
  - Cost panel: aria-live="polite" (announces updates), aria-label="Cost estimate: $50 to $60, duration 12 to 15 hours"
  - Budget status: role="status", aria-live="assertive" (announces changes immediately)
  - Checkboxes: aria-checked="true/false", aria-required="true"
  
- **Live regions:**
  - Cost estimation panel: aria-live="polite" announces "Cost updated to $80-100, $30 increase"
  - Budget validation: aria-live="assertive" announces "Budget exceeded by $40" or "Within budget, $100 remaining"
  - Error messages: role="alert" announces immediately

### Visual Accessibility
- **Color contrast:** 
  - Text on white: 4.5:1 minimum (WCAG AA)
  - Button text: 7:1 minimum (WCAG AAA)
  - Disabled elements: 3:1 minimum
- **Focus indicators:** 
  - Blue outline (2px, offset 2px) visible on all interactive elements
  - Never remove focus styles
  - Enhanced focus for keyboard navigation (distinct from hover)
- **Color not sole indicator:**
  - Budget status: Icon + text + color (✓ + "Within Budget" + green)
  - Quality score: Number + text + color (4.5/5 + "High Quality" + green)
  - Warnings: Icon + text + color (❌ + "Over Budget" + red)
  - Preset selection: Border + checkmark + tint (not just border color)

### Motor Accessibility
- **Touch targets:** Minimum 44x44px for all interactive elements (buttons, cards, toggle, checkboxes)
- **Spacing:** Minimum 8px between interactive elements to prevent mis-taps
- **Forgiving interactions:** Large clickable areas (e.g., entire preset card, not just radio button)
- **No time limits:** Users have unlimited time to complete configuration

### Cognitive Accessibility
- **Clear labels:** Every field has visible label (not just placeholder)
- **Simple language:** Avoid jargon, use "High Quality" not "Quality score ≥4.0"
- **Progress indication:** User always knows where they are in workflow (visual cues, enabled/disabled states)
- **Confirmation:** Review modal prevents accidental expensive job starts
- **Error prevention:** Real-time validation, clear error messages, suggestions for resolution

---

## Information Architecture

### Page Structure

**Main Configuration Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ ├─ Logo (top-left)                                              │
│ ├─ Page title: "Create New Training Job" (H1, centered)        │
│ └─ User menu (top-right)                                        │
├─────────────────────────────────────────────────────────────────┤
│ MAIN LAYOUT (2-column)                                          │
│ ┌────────────────────────────┬──────────────────────────────┐  │
│ │ LEFT COLUMN (2/3 width)    │ RIGHT SIDEBAR (1/3 width)    │  │
│ │                            │                              │  │
│ │ Section 1: Training File   │ Cost Estimation Panel        │  │
│ │ - Dropdown                 │ - Duration                   │  │
│ │ - Metadata panel           │ - Cost                       │  │
│ │                            │ - Disclaimer                 │  │
│ │ Section 2: Presets         │ - Budget Status              │  │
│ │ - 3 radio cards            │                              │  │
│ │                            │                              │  │
│ │ Section 3: GPU Selection   │ (Sidebar fixed/sticky)       │  │
│ │ - Toggle                   │                              │  │
│ │                            │                              │  │
│ │ Section 4: Metadata        │                              │  │
│ │ - Job name                 │                              │  │
│ │ - Description              │                              │  │
│ │                            │                              │  │
│ │ Section 5: Action          │                              │  │
│ │ - Review & Start button    │                              │  │
│ └────────────────────────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile Layout (< 768px):**
```
┌─────────────────────────────────────────┐
│ HEADER                                   │
│ - Hamburger menu (top-left)             │
│ - Page title (centered)                 │
│ - User icon (top-right)                 │
├─────────────────────────────────────────┤
│ SINGLE COLUMN (stacked vertically)      │
│                                          │
│ Training File Selection                 │
│ - Dropdown (full width)                 │
│ - Metadata panel                        │
│                                          │
│ Hyperparameter Presets                  │
│ - Card 1: Conservative (full width)     │
│ - Card 2: Balanced (full width)         │
│ - Card 3: Aggressive (full width)       │
│                                          │
│ GPU Selection                           │
│ - Toggle (centered, large touch target) │
│                                          │
│ Cost Estimate Card                      │
│ (Moved from sidebar to inline position) │
│ - Duration                              │
│ - Cost                                  │
│ - Budget status                         │
│                                          │
│ Job Metadata                            │
│ - Job name (full width)                 │
│ - Description (full width)              │
│                                          │
│ STICKY FOOTER                           │
│ - Review & Start button (full width)    │
└─────────────────────────────────────────┘
```

### Component Hierarchy

**ConfigurationPage (parent container)**
- **Header**
  - Logo
  - PageTitle
  - UserMenu
- **MainContent**
  - **LeftColumn**
    - **Section1_TrainingFile**
      - SearchableDropdown
      - MetadataPanel
        - FileName
        - ConversationCount
        - QualityBadge
    - **Section2_Presets**
      - PresetCard (Conservative)
        - Icon
        - Name
        - Description
        - CostEstimate
        - SuccessRate
        - SelectionIndicator (checkmark)
      - PresetCard (Balanced)
      - PresetCard (Aggressive)
    - **Section3_GPU**
      - ToggleControl
        - SpotOption
        - OnDemandOption
    - **Section4_Metadata**
      - JobNameField
        - Label
        - TextInput
        - CharacterCounter
      - DescriptionField
        - Label
        - Textarea
        - CharacterCounter
    - **Section5_Action**
      - ReviewButton
  - **RightSidebar**
    - **CostEstimationPanel**
      - Title (with real-time indicator)
      - DurationDisplay
      - CostDisplay
      - AccuracyDisclaimer
      - **BudgetValidationSection**
        - StatusIndicator (icon + text)
        - RemainingBudget
        - ErrorMessage (conditional)
        - Suggestions (conditional)
- **ReviewModal** (conditional, overlays page)
  - ModalOverlay (dims background)
  - ModalContainer
    - ModalHeader
      - Title
      - EstimatedCost
      - CloseButton
    - ModalContent
      - TrainingFileCard
      - ConfigurationCard
      - CostCard
      - ConfirmationChecklist
        - Checkbox1
        - Checkbox2
      - ActionButtons
        - StartTrainingButton
        - EditConfigurationButton
        - CancelButton

---

## Page Plan

### Total Wireframe Pages: 12

#### Page 1: Configuration Form - Initial Empty State
**Purpose:** Show starting point with all sections visible but empty/default

**Key Elements:**
- Training file dropdown: Empty with placeholder "Select training file..."
- Preset selector: Balanced selected by default (blue border, checkmark)
- GPU toggle: Spot selected by default (blue highlight)
- Cost sidebar: Shows "--" for duration and cost, budget status hidden
- Job name field: Empty
- Description field: Empty with placeholder
- "Review & Start" button: Disabled (gray) with cursor not-allowed

**States:** Initial load, awaiting user input, default selections active

**Annotations:**
- Dropdown: "FR1.1.1 AC1: Training files dropdown with search capability"
- Balanced preset: "FR1.1.2 AC5: Balanced preset selected by default"
- Spot toggle: "FR1.1.3 AC1: Spot instance default selection"
- Cost panel: "FR1.2.1 AC1: Cost estimation panel always visible"
- Button disabled: "FR1.3.2 AC1: Review button disabled until valid"

---

#### Page 2: Configuration Form - File Selected
**Purpose:** Show immediate feedback after training file selection

**Key Elements:**
- Dropdown: "Elena Morales Financial" selected
- Metadata panel expanded (fade-in animation):
  - File name: "Elena Morales Financial"
  - Conversations: "242 conversations"
  - Quality: "4.5/5 ✓ High Quality" (green badge)
- Cost sidebar populated:
  - Duration: "12-15 hours"
  - Cost: "$50-60 (spot)" (bold)
  - "±15% variance" (gray)
  - Budget: "✓ Within Budget - $200 remaining" (green)
- Job name auto-populated: "Elena Morales Financial - Balanced - 2025-12-19"
- Balanced preset still selected
- "Review & Start" button: Enabled (blue, clickable)

**States:** File selected, initial configuration set, cost calculated

**Annotations:**
- Metadata panel: "FR1.1.1 AC4: Displays quality scores and metadata within 2 seconds"
- Cost estimate: "FR1.2.1 AC1: Real-time cost estimate calculated"
- Job name: "FR1.3.1 AC1: Job name auto-populated from file + preset + date"
- Budget status: "FR1.2.2 AC4: Budget validation passes, sufficient remaining"
- Button enabled: "All required fields valid, budget OK, can proceed"

---

#### Page 3: Configuration Form - Preset Changed to Aggressive
**Purpose:** Demonstrate preset selection change and cost update

**Key Elements:**
- Aggressive preset selected (blue border, checkmark, blue tint)
- Conservative and Balanced: Deselected (gray border, white background)
- Cost sidebar updated with animation:
  - Previous "$50-60" shown with strikethrough and gray color
  - New "$80-100" shown bold
  - Delta indicator: "↑ $30 increase" (red badge with up arrow)
  - Duration updated: "18-20 hours"
  - Budget: Still "✓ Within Budget - $170 remaining" (green)
- Job name updated: "Elena Morales Financial - Aggressive - 2025-12-19"
- "Review & Start" button: Still enabled (blue)

**States:** Alternative preset selected, cost recalculated, budget still valid

**Annotations:**
- Aggressive card: "FR1.1.2 AC6: Aggressive preset with r=32, lr=3e-4, epochs=4, estimated cost $80-100"
- Cost update animation: "FR1.2.1 AC9: Cost estimate updates within 500ms, shows delta"
- Job name update: "FR1.3.1 AC1: Job name updates with new preset selection"
- Budget revalidation: "FR1.2.2 AC1: Budget validation recalculates with new cost"

---

#### Page 4: Configuration Form - GPU Toggled to On-Demand
**Purpose:** Show GPU type switching and major cost change

**Key Elements:**
- GPU toggle: On-Demand selected (blue highlight moved to right option)
- Spot option: Gray (unselected)
- Cost sidebar updated:
  - Previous "$80-100" with strikethrough
  - New "$200-240" bold (orange color indicating high cost)
  - Delta indicator: "↑ $120 increase" (red badge)
  - Cost text changed from "(spot)" to "(on-demand)"
  - Duration unchanged: "18-20 hours"
  - Budget: "⚠ Low Remaining - $40 left" (yellow warning) OR "❌ Over Budget - Exceeds by $40" (red error)
- "Review & Start" button: Possibly disabled if over budget (gray)

**States:** Premium GPU selected, cost significantly higher, budget warning/error

**Annotations:**
- On-demand toggle: "FR1.1.3 AC1: On-demand instance $7.99/hr, guaranteed completion"
- High cost display: "FR1.2.1 AC1: Cost >$100 shown in orange warning color"
- Budget exceeded: "FR1.2.2 AC2: Job creation blocked if cost > remaining budget"
- Button disabled: "FR1.3.2: Review button disabled when budget exceeded"
- Suggestions: "FR1.2.2 AC2: Displays cost reduction suggestions"

---

#### Page 5: Configuration Form - Metadata Added
**Purpose:** Show optional metadata completion

**Key Elements:**
- Same configuration as Page 3 (Aggressive + Spot, within budget)
- Job name edited: "Acme Q4 Production Model - Aggressive - 2025-12-19"
  - Character counter: "48/100"
  - User has customized the auto-generated name
- Description added:
  - Text: "Production model for Acme Financial Q4 delivery. Testing aggressive parameters on high-quality emotional intelligence dataset."
  - Character counter: "128/500"
- All sections complete
- "Review & Start" button: Enabled and highlighted (blue, ready to proceed)

**States:** Metadata customized, complete valid configuration

**Annotations:**
- Job name field: "FR1.3.1 AC1: User can edit auto-populated job name, 3-100 characters"
- Description field: "FR1.3.1 AC2: Optional description field, 500 character limit"
- Character counters: "FR1.3.1: Real-time character count display"
- Button ready: "FR1.3.2 AC1: All required fields valid, ready for review"

---

#### Page 6: Configuration Form - Complete Valid (Ready State)
**Purpose:** Show ready-to-submit state with all fields valid and budget OK

**Key Elements:**
- Training file: "Elena Morales Financial" selected with metadata visible
- Preset: Balanced selected (optimal configuration)
- GPU: Spot selected (cost-effective)
- Cost: "$50-60" (green, reasonable cost)
- Budget: "✓ Within Budget - $150 remaining" (green, healthy remaining)
- Job name: "Elena Morales Financial - Balanced - 2025-12-19"
- Description: Optional, can be empty or filled
- "Review & Start" button: Enabled, prominent, blue, with subtle pulse or highlight indicating ready

**States:** Valid configuration, optimal settings, ready to proceed

**Annotations:**
- Complete form: "All FRs integrated: File (1.1.1) + Preset (1.1.2) + GPU (1.1.3) + Cost (1.2.1) + Budget (1.2.2) + Metadata (1.3.1)"
- Budget healthy: "FR1.2.2 AC4: Sufficient budget remaining, validation passes"
- Ready to review: "FR1.3.2 AC1: User can now proceed to final review"
- Visual hierarchy: "Primary action (Review button) most prominent element"

---

#### Page 7: Configuration Form - Budget Exceeded Error
**Purpose:** Show error state when estimated cost exceeds budget

**Key Elements:**
- Configuration: Aggressive preset + On-Demand GPU (expensive combination)
- Training file: "Elena Morales Financial" selected
- Cost sidebar:
  - Duration: "18-20 hours"
  - Cost: "$200-240" (orange/red, high cost)
  - Budget status: "❌ Over Budget - Exceeds remaining by $40" (red)
  - Error message: "Adjust configuration to proceed" (gray text)
  - Suggestions: "💡 Switch to Conservative preset (save $120)" and "💡 Use Spot instead (save $120)" (blue text, underlined on hover)
- "Review & Start" button: Disabled (gray, cursor not-allowed)
- Tooltip on button hover: "Exceeds budget - adjust configuration"

**States:** Invalid due to budget constraint, blocked from proceeding

**Annotations:**
- Budget error: "FR1.2.2 AC2: Budget exceeded error displayed with shortfall amount"
- Suggestions displayed: "FR1.2.2 AC2: Cost reduction suggestions with specific savings amounts"
- Button disabled: "FR1.3.2: Review button disabled when budget validation fails"
- Error prominence: "Red color, icon, and clear message communicate blocking issue"
- Actionable: "Suggestions are clickable to automatically adjust configuration (optional enhancement)"

---

#### Page 8: Review Modal - Initial Display (Unchecked)
**Purpose:** Show full-screen review with all configuration summarized, awaiting confirmation

**Key Elements:**
- Modal overlay: 50% black opacity background dim
- Modal container: White, centered, 800px max-width
- Header: "Review Training Configuration" with "$50-60" estimate (right-aligned)
- Close button: X icon (top-right)

**Training File Card:**
- Title: "Training Dataset"
- File name: "Elena Morales Financial" (bold)
- Conversations: "242 conversations"
- Quality: "4.5/5 ✓" (green badge)

**Configuration Card:**
- Title: "Configuration"
- Preset: "Balanced" (blue badge)
- Parameters: "Rank: 16, Epochs: 3, Learning Rate: 0.0002"
- GPU: "H100 PCIe 80GB"
- Pricing: "Spot Instance - Save 70%" (green badge)
- Rate: "$2.49/hr"

**Cost Card:**
- Title: "Cost Estimate"
- Duration: "12-15 hours"
- Cost: "$50-60 (±15%)" (large, bold)
- Budget impact: "$387 used + $52 this job = $439 of $500"
- Remaining: "$61 available" (green if >$50)

**Confirmation Checklist:**
- Checkbox 1: ☐ "I have reviewed the configuration above" (unchecked)
- Checkbox 2: ☐ "I understand the estimated cost ($50-60)" (unchecked)

**Action Buttons:**
- "Start Training": Disabled (gray) - requires both checkboxes
- "Edit Configuration": Enabled (gray border)
- "Cancel": Enabled (text link)

**States:** Modal open, awaiting user confirmation

**Annotations:**
- Modal display: "FR1.3.2 AC2: Full-screen confirmation modal with complete configuration summary"
- Training file summary: "FR1.1.1 data: File name, conversation count, quality score"
- Preset summary: "FR1.1.2 data: Preset name, key hyperparameters"
- GPU summary: "FR1.1.3 data: GPU type, pricing tier, hourly rate"
- Cost summary: "FR1.2.1 data: Duration range, cost range, variance disclaimer"
- Budget impact: "FR1.2.2 data: Current spend, this job cost, projected total, remaining"
- Checkboxes required: "FR1.3.2 AC2: User must explicitly confirm before starting job"

---

#### Page 9: Review Modal - Checkboxes Checked (Ready to Start)
**Purpose:** Show ready-to-start state after user has confirmed understanding

**Key Elements:**
- Same layout as Page 8
- Checkbox 1: ✓ Checked (blue checkmark)
- Checkbox 2: ✓ Checked (blue checkmark)
- "Start Training" button: Enabled (green background, white text, prominent)
- User can now click to start job

**States:** Confirmed, ready to start training

**Annotations:**
- Checkboxes checked: "FR1.3.2 AC2: Both confirmation checkboxes required"
- Button enabled: "FR1.3.2 AC2: Start Training button enables when checklist completed"
- Final confirmation: "Last step before expensive GPU provisioning begins"
- Click starts job: "Creates database record, initiates GPU provisioning, redirects to job details"

---

#### Page 10: Review Modal - Edit Configuration Action
**Purpose:** Show user returning to edit configuration from review modal

**Key Elements:**
- Modal closing animation (fade-out 200ms)
- Return to configuration form (background page becomes visible)
- Configuration form state: Exactly as it was when "Review & Start" was clicked
  - Training file: Still selected
  - Preset: Still selected (e.g., Balanced)
  - GPU: Still selected (e.g., Spot)
  - Metadata: Still filled (job name, description)
- User can now make changes
- After changes, can click "Review & Start" again

**States:** Modal closing, returning to edit mode, all settings preserved

**Annotations:**
- Edit action: "FR1.3.2 AC2: Edit Configuration button closes modal, returns to form"
- Settings preserved: "All configuration values maintained, not reset"
- Can re-review: "User can make changes and re-open review modal"
- Non-destructive: "Editing doesn't lose progress or require starting over"

---

#### Page 11: Mobile Layout - Configuration Form
**Purpose:** Show responsive layout for mobile devices (320-768px width)

**Key Elements:**
- Single column layout (100% width, stacked vertically)
- Header: Hamburger menu (left), "Create Training Job" (center), User icon (right)

**Sections (top to bottom):**
1. Training file dropdown (full width)
2. Metadata panel (condensed: name, count, quality in single line)
3. Preset cards (stacked vertically, full width each):
   - Conservative card (full width, larger touch target 60px height)
   - Balanced card (full width, selected)
   - Aggressive card (full width)
4. GPU toggle (centered, larger touch target)
5. Cost estimate card (moved from sidebar to inline position):
   - Duration, cost, disclaimer, budget status (all visible)
6. Job name field (full width)
7. Description field (full width)
8. Sticky footer with "Review & Start" button (full width, 56px height)

**Spacing:** Increased padding between sections (16px) for touch-friendly layout

**States:** Mobile viewport, vertical stacking, touch-optimized

**Annotations:**
- Responsive design: "All FR components adapt to mobile layout"
- Sidebar moved: "FR1.2.1 cost panel becomes inline card on mobile"
- Touch targets: "All interactive elements ≥44x44px for touch accessibility"
- Sticky button: "Review button always visible at bottom, doesn't scroll away"
- Simplified metadata: "Less detail in mobile metadata panel to save space"

---

#### Page 12: Mobile Layout - Review Modal
**Purpose:** Show review modal adapted for mobile devices

**Key Elements:**
- Full-screen modal (no margins, 100% viewport width/height)
- Header: "Review Configuration" (centered), "$50-60" (below title), X close (top-right)
- Scrollable content area (vertical scroll)

**Summary cards (stacked vertically, full width):**
1. Training File card: Name, conversations, quality (condensed)
2. Configuration card: Preset, parameters (1 line), GPU, pricing (condensed)
3. Cost card: Duration, cost, budget impact (condensed)

**Confirmation:**
- Checkbox 1 (large, 24px, easy to tap): "I have reviewed the configuration"
- Checkbox 2 (large, 24px): "I understand the estimated cost ($50-60)"

**Action buttons (fixed at bottom, sticky):**
- "Start Training" (full width, 56px height, green)
- "Edit Configuration" (full width, 48px height, gray)
- "Cancel" (centered text link)

**States:** Mobile modal, full-screen, scrollable, touch-optimized

**Annotations:**
- Full-screen modal: "FR1.3.2 review adapted for mobile viewport"
- Scrollable: "Content scrolls vertically if exceeds viewport height"
- Sticky buttons: "Action buttons fixed at bottom, always accessible"
- Larger checkboxes: "Touch-friendly checkbox size (24px) vs desktop (18px)"
- Simplified summaries: "Less detail in cards to fit mobile screen without excessive scrolling"

---

## Acceptance Criteria → UI Component Mapping

This table maps every acceptance criterion from all 7 FRs to specific UI components and wireframe pages.

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Training files dropdown with search/filter | FR1.1.1 AC1, AC2 | 1, 2-7 | SearchableDropdown | Empty, Loading, Loaded, Selected | Shows top 10 recent files, searches by name |
| Display file name, conversation count | FR1.1.1 AC1 | 2-7 | MetadataPanel | Display | Appears on selection below dropdown |
| Quality score visual indicator | FR1.1.1 AC3 | 2-7 | QualityBadge | Display | Single score 0-5 with color: green ≥4, yellow 3-4, red <3 |
| Form validation ensures ≥50 conversations | FR1.1.1 AC5 | N/A | Backend | Validation | Assumed all files in dropdown meet minimum |
| Three preset options as radio cards | FR1.1.2 AC1 | 1-7 | PresetCard × 3 | Default, Selected | Conservative, Balanced, Aggressive |
| Conservative: r=8, lr=1e-4, epochs=2, $25-30, 98% | FR1.1.2 AC4 | 1-7 | PresetCard (Conservative) | Display | Shows name, description, cost, success rate |
| Balanced: r=16, lr=2e-4, epochs=3, $50-60, 96% | FR1.1.2 AC5 | 1-7 | PresetCard (Balanced) | Default Selected | Middle option, auto-selected |
| Aggressive: r=32, lr=3e-4, epochs=4, $80-100, 92% | FR1.1.2 AC6 | 3, 4, 7 | PresetCard (Aggressive) | Selectable | Advanced option, no lock for POC |
| Default selection: Balanced | FR1.1.2 AC6 | 1-2 | PresetCard (Balanced) | Default | Selected on page load |
| GPU toggle: Spot vs On-Demand | FR1.1.3 AC1 | 1-7 | ToggleControl | Spot, On-Demand | Two-option toggle |
| Spot: $2.49/hr, Save 70% | FR1.1.3 AC1 | 1-3, 5-6 | SpotOption | Display | Default option, cost-effective |
| On-Demand: $7.99/hr, Guaranteed | FR1.1.3 AC1 | 4, 7 | OnDemandOption | Display | Premium option, higher cost |
| Real-time cost updates when config changes | FR1.1.3 AC3, FR1.2.1 AC1 | 2-7 | CostEstimationPanel | Updating | Within 500ms, debounced |
| Cost estimation panel always visible | FR1.2.1 AC1 | 1-12 | CostEstimationPanel (Sidebar) | Always Visible | Fixed sidebar (desktop) or inline card (mobile) |
| Display duration range and cost range | FR1.2.1 AC1 | 2-7 | DurationDisplay, CostDisplay | Display | "12-15 hours", "$50-60" |
| Accuracy disclaimer ±15% | FR1.2.1 AC1 | 2-7 | DisclaimerText | Display | Based on historical variance |
| Warning if cost exceeds $100 | FR1.2.1 AC1 | 4, 7 | WarningBadge | Display | Orange color for high cost |
| Budget validation: remaining = limit - spent | FR1.2.2 AC1 | 2-7 | BudgetValidator | Checking | Server-side calculation |
| Block job creation if cost > remaining | FR1.2.2 AC2 | 7 | ErrorMessage + DisabledButton | Blocked | "Review & Start" button disabled |
| Budget exceeded error message with suggestions | FR1.2.2 AC2 | 7 | ErrorMessage + Suggestions | Display | Shows shortfall, suggests alternatives |
| Job name auto-populated | FR1.3.1 AC1 | 2-12 | JobNameField | Auto-Populated | "{fileName} - {preset} - {date}" |
| Description field optional, 500 char limit | FR1.3.1 AC2 | 1-12 | DescriptionField | Optional | Textarea with counter |
| Review & Start button opens modal | FR1.3.2 AC1 | 6-12 | ReviewButton → ReviewModal | Enabled, Opens | Triggers full-screen modal |
| Modal displays complete configuration summary | FR1.3.2 AC2 | 8-10 | ReviewModal | Display | Training file, config, cost, budget |
| Confirmation checklist with 2 checkboxes | FR1.3.2 AC2 | 8-9 | ConfirmationChecklist | Unchecked, Checked | Simplified from 3 to 2 for POC |
| Start Training button disabled until confirmed | FR1.3.2 AC2 | 8-9 | StartButton | Disabled, Enabled | Requires both checkboxes |
| Edit Configuration returns to form | FR1.3.2 AC2 | 10 | EditButton | Action | Closes modal, preserves settings |

---

## Non-UI Acceptance Criteria

These backend requirements don't have direct UI but affect UI behavior:

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| System queries `training_files` table WHERE status='active' AND conversation_count >= 50 | Database query determines available files | UI receives filtered list from backend API |
| System validates file paths exist in storage | Backend check before job creation | UI shows storage status indicator if failed (not in POC) |
| System calculates duration: (conv_count × pairs × epochs × seconds_per_pair[preset]) / 3600 | Backend provides calculation | UI displays result in cost panel |
| System calculates cost: duration × hourly_rate[gpu_type] | Backend calculation | UI displays result, recalculates on changes |
| System stores job record with status='queued' | Database INSERT operation | UI shows loading spinner during creation |
| System redirects to `/training-jobs/{job_id}` after creation | Routing after successful job creation | UI navigates to job details page |
| Budget validation query: SELECT monthly_budget_limit, SUM(actual_cost) FROM... | Backend query for budget check | UI receives validation result (pass/fail) |
| Job name uniqueness check | Backend query for duplicates | UI shows warning (not error) if duplicate found (removed for POC) |

---

## Estimated Total Page Count

**12 wireframe pages** covering:

1. Configuration form - Empty state
2. Configuration form - File selected
3. Configuration form - Preset changed to Aggressive
4. Configuration form - GPU toggled to On-Demand
5. Configuration form - Metadata added
6. Configuration form - Complete valid
7. Configuration form - Budget exceeded error
8. Review modal - Initial display (unchecked)
9. Review modal - Checkboxes checked
10. Review modal - Edit configuration action
11. Mobile layout - Configuration form
12. Mobile layout - Review modal

**Rationale:**
- Demonstrates complete user flow from empty → configured → reviewed → started
- Shows all key state changes (selections, updates, errors, validations)
- Covers both desktop (10 pages) and mobile (2 pages) layouts
- Includes primary success path and key error scenario
- Consolidates multiple individual FR pages into integrated workflow
- Removes redundant state demonstrations from original 34 pages
- Maintains all essential functionality while optimizing for POC speed
- **65% reduction** from original 34 pages to 12 pages through integration and simplification

---

## Final Notes for Figma Implementation

### Integration Requirements
- All components on the main configuration page must be functional together as a single integrated interface
- Changing any input in Group 1 (file, preset, GPU) must update Group 2 (cost panel) in real-time with animation
- Budget validation must react to cost changes and dynamically block/unblock the review button
- Job name must auto-update when training file or preset changes, preserving user edits if made
- Review modal must accurately summarize all selections from the main page without duplication

### POC Simplifications Applied
**Removed features:**
- Preview conversations modal
- Expandable technical parameters for presets
- Interactive tooltips on every hyperparameter
- Historical accuracy metrics and charts
- Detailed cost breakdown (GPU compute, spot buffer, storage itemization)
- Budget increase workflow with approval routing
- Manager override system with justifications
- Tag system (multi-select with custom tag creation)
- Client/project assignment for cost attribution
- Markdown notes editor with preview
- Comparison to previous jobs in review modal
- Configuration template support
- Aggressive preset locked state for new users
- Context-aware recommendations based on job characteristics
- Spot availability warnings with datacenter utilization
- High-cost confirmation modal for on-demand selection

**Simplified features:**
- Metadata display: File name, conversation count, single quality score (not detailed breakdown)
- Preset details: Essential info only (name, description, cost, success rate, no expandable params)
- Cost breakdown: Total only (not itemized by component)
- Budget workflows: Simple pass/fail validation (no increase requests, overrides)
- Job metadata: Name and description only (no tags, projects, notes)
- Review modal: Basic summary with 2 checkboxes (not 3, fewer warnings)

### State Management
- Single source of truth for configuration state (unified JavaScript object)
- Reactive updates across all components when any input changes
- Debounced recalculations (500ms) for cost estimates to avoid excessive API calls
- Validation runs on every relevant state change (file selection, preset change, GPU change)
- Budget validation triggers whenever cost estimate updates

### Accessibility
- Full keyboard navigation support (Tab, Arrow keys, Enter, Space, Escape)
- Screen reader friendly with comprehensive ARIA labels and live regions
- High contrast colors meeting WCAG AA standards (4.5:1 minimum)
- Focus indicators always visible (blue outline, never removed)
- Touch targets ≥44x44px for mobile accessibility
- Error messages announced immediately to screen readers (role="alert")
- Color never sole indicator (always paired with icon and text)

### Success Criteria
A user should be able to complete this workflow in 2-3 minutes:
1. Select a training file and see its basic details (name, count, quality)
2. Choose a preset and understand cost impact immediately
3. Toggle GPU type and see cost comparison (spot 70% cheaper)
4. Add optional metadata for organization
5. Review complete configuration summary with all costs and budget impact
6. Confirm understanding and start training job
7. Be redirected to job details page to track progress

All within a single, intuitive, integrated workflow that feels cohesive and builds confidence through transparent information disclosure at every step.
