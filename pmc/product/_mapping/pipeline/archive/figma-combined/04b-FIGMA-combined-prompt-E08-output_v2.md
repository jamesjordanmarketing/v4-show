# LoRA Pipeline - Stage 8 Combined Figma Wireframe Prompt
**Version:** 2.0  
**Date:** January 8, 2026  
**Stage:** Stage 8 — Training Configuration (Lay-Person Accessible)  
**Section ID:** E08_v2  
**Optimization:** Proof-of-Concept (POC) - Essential features with lay-person accessibility

**Based On:**
- Definitive Specification: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\LoRA-training-lay-person-interface-changes_v3.md
- Original: 04b-FIGMA-combined-prompt-E08-output.md

**Key Changes from E08 v1:**
- Hyperparameter labels changed to lay-person terms
- Engine selection removed (single engine architecture)
- Display-only features section added
- Training data summary card added
- Specialized metrics checkboxes replaced with info display

---

## Prompt for Figma Make AI

**Title:** Stage 8 — Training Configuration (Lay-Person Accessible) - Complete Integrated Wireframe System

**Context Summary**

This stage provides training configuration capabilities designed for non-technical users (target: first-year college students familiar with PCs but not ML). Users configure three understandable hyperparameters using business-impact language, view their training data summary, see what features the currently loaded training engine provides, and understand what post-training evaluations will run automatically. The interface prioritizes accessibility through lay-person language, confidence through transparent business-impact tradeoffs, and simplicity through a single-engine architecture with no complex choices.

**Journey Integration**

- **Stage 8 User Goals:** 
  - Confirm their training data is correctly loaded
  - Understand training parameter tradeoffs in business terms
  - See what capabilities the current training engine provides
  - Understand what evaluations will happen after training
  - Feel confident starting training without ML expertise

- **Key Emotions:** 
  - Initial uncertainty ("I don't know ML") → Comfort through familiar language → Confidence through business-impact explanations → Trust through transparency → Empowerment through informed configuration

- **Progressive Disclosure:** 
  - **Basic:** Training data summary, three simple parameters with helpful defaults
  - **Advanced:** Rollover tooltips explaining tradeoffs, engine features display
  - **Expert:** (Reserved for future - Expert Mode toggle for Rank/Alpha/Dropout)

- **Persona Adaptations:** 
  - Non-technical users need business-impact language and clear defaults
  - Business Owners need cost transparency and simple configuration
  - Quality Analysts can access methodology via info links

**Wireframe Goals**

- Display training data summary prominently at top of configuration
- Present three configurable hyperparameters with lay-person labels and business-impact tooltips
- Show engine features as informational display (not interactive selection)
- Display automatic post-training evaluation info (not configurable checkboxes)
- Integrate seamlessly with existing E01 design patterns
- Hide technical complexity (Rank, Alpha, Dropout) from user interface

**Explicit UI Requirements**

---

## SECTION 1: Your Training Data Summary Card (NEW)

**Location:** Training Configuration Page  
**Position:** TOP of page, before any configuration options

**Component ID:** `training-data-summary-card`

**Card Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 20px
- Shadow: Subtle (same as other cards)
- Margin-bottom: 24px

**Card Header:**
- Title: "Your Training Data" (semibold, 18px)
- Edit button: Blue text link, right-aligned, "[Edit]"

**Content (When File Selected):**
- File icon: 📁 (24px)
- Filename: "emotional-alignment-v3.jsonl" (bold, 16px)
- Validation badges (green checkmarks):
  - "✓ 242 training conversations" (14px, gray text, green checkmark)
  - "✓ Emotional arc scaffolding detected" (14px, gray text, green checkmark)
- Action buttons (bottom):
  - "[Preview Data]" (blue text link, 14px)
  - "[Upload Different File]" (blue text link, 14px)

**Empty State (No File Selected):**
- Icon: Upload cloud icon (48px, gray)
- Message: "No training file selected" (gray, 16px)
- Sub-message: "Upload a training file to continue" (gray, 14px)
- Primary button: "Upload Training File" (blue, large)

**Visual Design:**
- Subtle highlight border when file validated (green tint on left edge)
- Clear visual hierarchy with file info prominent

---

## SECTION 2: Training Parameters Section

**Location:** Below Training Data Summary Card  
**Position:** Main configuration area

**Section Header:**
- Title: "Training Parameters" (bold, 18px)
- Subtitle: "Adjust how the training process runs" (gray, 14px)
- Help icon: Links to documentation

---

### Parameter 1: Training Sensitivity (formerly Learning Rate)

**Component ID:** `training-sensitivity-control`

**Label:** "Training Sensitivity" (semibold, 16px)

**Rollover/Tooltip Text:**
> Lower sensitivity means less reasoning. This means less likely to lose track of the training goals but more likely to need more Training Repetition.
>
> VS.
>
> High sensitivity means more reasoning. This means it is more likely to need fewer Training Repetitions but will have a higher risk of hallucinating.
>
> **Technical term:** Learning Rate

**Input Type:** Slider with labeled endpoints

**Visual Design:**
- Slider track: Full width of control area
- Left endpoint label: "More Stable" (gray, 12px)
- Right endpoint label: "More Adaptive" (gray, 12px)
- Current value display: "Medium" above slider center (14px, semibold)
- Info icon: (?) triggers tooltip on hover/click

**Value Mapping (Hidden from User):**
| UI Setting | Display | Technical Value |
|------------|---------|-----------------|
| Very Low | "Very Stable" | 0.00001 |
| Low | "Stable" | 0.00005 |
| Medium | "Balanced" | 0.0001 |
| High | "Adaptive" | 0.0005 |
| Very High | "Very Adaptive" | 0.001 |

**Default:** Medium (Balanced)

---

### Parameter 2: Training Progression (formerly Batch Size)

**Component ID:** `training-progression-control`

**Label:** "Training Progression" (semibold, 16px)

**Rollover/Tooltip Text:**
> Higher progression means a more stable and consistent training process leading to more overall knowledge.
>
> VS.
>
> Lower progression means more likely to think about advanced topics which means a better understanding of complex ideas.
>
> **Technical term:** Batch Size

**Input Type:** Slider with labeled endpoints

**Visual Design:**
- Slider track: Full width of control area
- Left endpoint label: "Deep Thinking" (gray, 12px)
- Right endpoint label: "Broad Learning" (gray, 12px)
- Current value display: "Medium" above slider center (14px, semibold)
- Info icon: (?) triggers tooltip on hover/click

**Value Mapping (Hidden from User):**
| UI Setting | Display | Technical Value |
|------------|---------|-----------------|
| Low | "Deep Thinking" | 1-2 |
| Medium | "Balanced" | 4-8 |
| High | "Broad Learning" | 16+ |

**Default:** Medium (Balanced)

---

### Parameter 3: Training Repetition (formerly Epochs)

**Component ID:** `training-repetition-control`

**Label:** "Training Repetition" (semibold, 16px)

**Rollover/Tooltip Text:**
> More repetition means more training iterations which means it is more likely to achieve your training goals.
>
> VS.
>
> Too much repetition means more unnecessary iterations which can lead to higher costs & knowledge which is too rigid.
>
> **Technical term:** Epochs

**Input Type:** Numeric stepper or slider

**Visual Design:**
- Stepper control with -/+ buttons OR slider
- Current value display: "3 (Standard)" center (14px, semibold)
- Estimated impact: "Est. time: 4h 30m" (gray, 12px) — updates as value changes
- Info icon: (?) triggers tooltip on hover/click

**Value Options:**
| UI Setting | Display | Technical Value |
|------------|---------|-----------------|
| Quick | "1 (Quick)" | 1 epoch |
| Standard | "3 (Standard)" | 3 epochs |
| Thorough | "5 (Thorough)" | 5 epochs |
| Deep | "10+ (Deep)" | 10+ epochs |

**Default:** 3 (Standard)

---

## SECTION 3: Training Engine Features (Display-Only)

**Location:** Below Training Parameters  
**Position:** Informational panel, NOT interactive

**Component ID:** `engine-features-panel`

**Card Container:**
- Background: Light blue tint (#EFF6FF)
- Border: 1px solid blue (#93C5FD)
- Border radius: 8px
- Padding: 20px

**Card Header:**
- Title: "Training Engine Features" (semibold, 16px)
- Subtitle: "(Current Engine: Emotional Alignment)" (gray, 14px)

**Content:**
- Intro text: "This training system is optimized for:" (gray, 14px)
- Engine type: "Emotional Alignment Training" (bold, 18px, blue color)

- Feature list (with checkmarks):
  - "✓ Emotional Arc Pattern Recognition" (14px)
  - "✓ Empathetic Response Optimization" (14px)
  - "✓ Progression-Aware Training" (14px)

- Learn more link: "[Learn How These Features Work]" (blue text, 14px)

**Visual State:**
- Read-only display — no interactive elements except doc link
- Subtle info icon if hover/tap available for feature explanations
- All features are DISPLAY-ONLY, not toggleable

**Note:** Features shown are determined by the CURRENTLY LOADED engine. This is a product offering, not a user choice. Engine swapping is a Product Owner operation.

---

## SECTION 4: Post-Training Evaluation Info (Display-Only)

**Location:** Below Engine Features  
**Position:** Informational panel about automatic evaluations

**Component ID:** `post-training-evaluation-info`

**Card Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 20px

**Card Header:**
- Title: "Post-Training Evaluation" (semibold, 16px)
- Badge: "Automatic" (gray badge, right-aligned)

**Content:**
- Intro text: "These evaluations will run automatically after training completes:" (gray, 14px)

- Evaluation list (with checkmarks and time estimates):
  - "✓ Emotional Arc Fidelity (+5 min)" (14px)
  - "✓ Empathy Score (+3 min)" (14px)

- Footer text: "These results will appear in your Training Results page." (gray, 12px)

**Visual State:**
- Read-only display — NOT configurable checkboxes
- Informational only — tells user what WILL happen
- Evaluations are determined by the currently loaded engine

**Note:** This replaces the old "Specialized Metrics (Optional)" section with checkboxes. Users do NOT select which evaluations run — they are automatic based on the engine.

---

## SECTION 5: Cost Estimate Section (Existing E01 Component)

**Integration:**
- Existing cost estimate component from E01
- Updates in real-time as Training Repetition changes
- Includes evaluation time in duration estimate
- Shows breakdown: Compute Cost + Metric Evaluation Cost

**Cost Breakdown Display:**
- Compute Cost: $XX.XX
- Evaluation Cost: $X.XX (based on automatic evaluations)
- **Total Estimated Cost: $XX.XX**
- "Includes ~8 minutes for automatic evaluations"

---

## SECTION 6: Form Validation & Error States

**Validation Rules:**

### Training Data Validation
- Must have training file selected before "Start Training"
- File must pass format validation (JSONL, correct schema)
- Error: "Please upload a valid training file to continue"

### Parameter Validation
- All parameters have valid defaults — no validation needed
- Values are constrained by slider/stepper controls

**Error Display:**
- Inline errors: Red text below component with error icon
- File errors: Red border on Training Data Summary Card
- Toast notifications: For backend validation failures

---

## SECTION 7: Hidden Hyperparameters (NOT DISPLAYED)

**The following are NOT shown in the UI:**

~~Rank (r)~~ — Set automatically by system  
~~Alpha~~ — Set automatically (typically 2x Rank)  
~~Dropout~~ — Set automatically to sensible default

**Future Enhancement:** An "Expert Mode" toggle (hidden by default) could expose these for advanced users.

---

## SECTION 8: Removed Components (from E08 v1)

**The following components from E08 v1 are REMOVED:**

1. ~~Engine Selection Radio Card Group~~ — Single engine architecture
2. ~~Auto-Select Engine Card~~ — No engine selection
3. ~~TRL Standard Engine Card~~ — No engine selection
4. ~~TRL Advanced Engine Card~~ — No engine selection
5. ~~Engine compatibility warnings~~ — N/A
6. ~~Specialized Metrics Checkboxes~~ — Replaced with info display
7. ~~Metric cost selection impact~~ — Automatic, not selectable

---

## SECTION 9: Responsive Design Requirements

**Desktop (≥1024px):**
- Training Data Summary: Full width
- Parameters: Vertical stack, full width sliders
- Engine Features: Full width card
- Evaluation Info: Full width card

**Tablet (768px - 1023px):**
- Same layout, slightly compressed padding

**Mobile (<768px):**
- All sections stack vertically
- Sliders remain full width
- Cards have reduced padding (16px)
- Touch-friendly slider controls (larger hit targets)

---

## SECTION 10: Accessibility Requirements

**Keyboard Navigation:**
- Tab order: Training Data → Training Sensitivity → Training Progression → Training Repetition → Start Training button
- Arrow keys: Adjust slider values
- Enter: Activate buttons

**Screen Reader Support:**
- Training Sensitivity: "Slider, Training Sensitivity, current value Medium. Lower sensitivity means less reasoning..."
- Engine Features: "Information panel, Training Engine Features. Current engine is Emotional Alignment. Active features: Emotional Arc Pattern Recognition, Empathetic Response Optimization, Progression-Aware Training"
- Evaluation Info: "Information panel, Post-Training Evaluation automatic. Emotional Arc Fidelity plus 5 minutes, Empathy Score plus 3 minutes"

**Color Contrast:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Slider tracks have sufficient contrast
- Info panel backgrounds don't rely on color alone

---

## SECTION 11: State Variables & Component IDs

**For Cross-Prompt Consistency (E09_v2 and E10_v2 must reference these):**

| Component ID | Purpose | State Variable |
|--------------|---------|----------------|
| `training-data-summary-card` | Training file display | `selectedFile`, `fileValidation` |
| `training-sensitivity-control` | Learning rate slider | `trainingSensitivity` |
| `training-progression-control` | Batch size slider | `trainingProgression` |
| `training-repetition-control` | Epochs stepper | `trainingRepetition` |
| `engine-features-panel` | Engine capabilities display | `engineFeatures[]` |
| `post-training-evaluation-info` | Automatic evaluations | `autoEvaluations[]` |

---

## Design System Consistency

**Components Reused from E01-E07:**
- Card styling (borders, shadows, padding)
- Button styles (primary, secondary, outline)
- Slider components (track, thumb, labels)
- Typography scale (H1-H6, body, helper text)
- Color palette (primary blue, gray scale, semantic colors)
- Icon set (consistent icon style and sizing)
- Tooltip components (hover/click reveals)
- Loading states (spinners, skeleton loaders)

**New Components Introduced in E08_v2:**
- Training Data Summary Card
- Lay-person parameter sliders with endpoint labels
- Display-only feature panel (informational, not interactive)
- Automatic evaluation info panel

**Color Coding:**
- Blue: Primary actions, info panels, interactive elements
- Green: Success states, validation passed, checkmarks
- Gray: Disabled, read-only, helper text
- Orange: Warnings (if needed)

---

**End of E08_v2 Wireframe Prompt**

This wireframe prompt provides complete specifications for the lay-person accessible training configuration interface, following v3 specification decisions for hyperparameter labeling, single-engine architecture, and display-only feature panels. All component IDs and state variables are defined for cross-prompt consistency with E09_v2 and E10_v2.

