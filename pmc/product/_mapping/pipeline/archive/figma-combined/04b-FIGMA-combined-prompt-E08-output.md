# LoRA Pipeline - Stage 8 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** January 4, 2026  
**Stage:** Stage 8 — Advanced Training Configuration (Engine & Metrics Selection)  
**Section ID:** E08  
**Optimization:** Proof-of-Concept (POC) - Essential features with modular extensibility

**Generated From:**
- Source Document: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\model-training-philosophy_v1.md
- Section: UI Requirements (lines 1817-2316)
- Philosophy: Modular architecture with UI-first implementation approach

---

## Prompt for Figma Make AI

**Title:** Stage 8 — Advanced Training Configuration (Engine & Metrics Selection) - Complete Integrated Wireframe System

**Context Summary**

This stage introduces advanced training configuration capabilities that enable users to select specific training engines and configure which metrics to collect during training. Users can choose between automatic engine selection and specific engines (TRL Standard, TRL Advanced), select specialized metrics beyond universal defaults based on their dataset type, understand the cost and time impact of metric collection, and preview measurement methodologies. The interface prioritizes informed decision-making through transparent cost implications, progressive disclosure of advanced options, and clear explanations of specialized capabilities like emotional arc weighting and curriculum learning.

**Journey Integration**

- **Stage 8 User Goals:** 
  - Understand which training engine will power their job
  - Select appropriate engine based on dataset type and model requirements
  - Choose specialized metrics for advanced training validation
  - Understand cost/time implications of metric collection
  - Access measurement methodology documentation for transparency
  - Configure advanced training options when needed
  - Maintain confidence through clear explanations and recommendations

- **Key Emotions:** 
  - Initial curiosity about advanced options → Confidence building through auto-select recommendations → Empowerment through granular control → Relief through cost transparency → Trust in methodology documentation → Final confidence through informed configuration

- **Progressive Disclosure:** 
  - **Basic:** Auto-select engine, universal metrics (always collected), simple toggle for advanced options
  - **Advanced:** Engine comparison cards with features, specialized metrics with descriptions, cost impact display
  - **Expert:** (Reserved for future - engine performance history, metric correlation analysis, optimization suggestions)

- **Persona Adaptations:** 
  - AI Engineers need engine feature details and specialized metrics for experimental training
  - Business Owners need cost transparency and auto-select recommendations for simplicity
  - Quality Analysts need measurement methodology access and metric validation understanding

**Wireframe Goals**

- Enable confident engine selection through clear feature comparison and auto-select recommendations
- Support informed metric configuration through cost/time impact display and methodology access
- Provide progressive disclosure via collapsible "Advanced Options" section on training config page
- Integrate seamlessly with existing preset selection, GPU configuration, and hyperparameter controls
- Display real-time cost updates when metrics selection changes (matches existing cost estimation pattern)
- Maintain consistency with E01 design patterns while introducing new modular capabilities
- Support future extensibility through component architecture (new engines, new metrics)

**Explicit UI Requirements**

---

## SECTION 1: Advanced Options Collapsible Section (Integration Point)

**Location:** Training Configuration Page (existing E01 page)  
**Position:** Below "Hyperparameters" section, above "Cost Estimate" section

**Collapsible Container:**
- Component: Collapsible panel with chevron indicator
- Header: "Advanced Options" (bold, 16px) with info icon
- Info tooltip: "Configure training engine and specialized metrics for advanced use cases"
- Default state: Collapsed (to maintain simplicity for basic users)
- Expanded state: Shows Engine Selection + Metrics Configuration sections
- Border: Subtle border (1px, #E5E7EB) to visually separate from other sections
- Padding: 24px internal padding when expanded
- Animation: Smooth 300ms expand/collapse with fade-in

**Visibility Rules:**
- Always visible for all users (basic progressive disclosure principle)
- Collapsed by default for first-time users
- Persists user's last state (collapsed/expanded) in session storage
- Badge indicator: Shows "Auto" when collapsed if using auto-select engine

**Integration with Existing Flow:**
- Does NOT block or interrupt basic configuration workflow
- Optional enhancement to existing E01 training configuration
- Cost estimate (existing E01 component) updates when metrics selection changes
- Validation occurs at same point as existing configuration (on submit)

---

## SECTION 2: Engine Selection Component (FR8.1.1 - New)

**Section Header:**
- Title: "Training Engine" (bold, 16px)
- Subtitle: "Select the engine that will power your training" (gray, 14px)
- Help icon: Links to "/docs/training-engines" for detailed comparison

**Engine Radio Card Group:**
- Layout: Vertical stack of radio cards (easier scanning than horizontal for detailed content)
- Component type: Radio button group (single selection)
- Default selection: "Auto-Select" (recommended for most users)
- Spacing: 12px gap between cards

### Card 1: Auto-Select (Recommended)

**Visual Design:**
- Border: 2px solid, highlighted with subtle green tint (#10B981 at 10% opacity)
- Badge: "Recommended" (green background, white text, top-right corner)
- Radio button: Large (20px), left-aligned
- Icon: Magic wand icon (left of title, indicates intelligent selection)

**Content:**
- Title: "Auto-Select" (bold, 16px)
- Description: "System automatically selects the best engine for your model and dataset type" (gray, 14px)
- Features list (gray, 12px, bulleted):
  - ✓ Optimized for your configuration
  - ✓ Handles all model sizes
  - ✓ Best reliability and performance balance

**States:**
- Selected: Blue border (2px, #3B82F6), blue radio fill
- Unselected: Gray border (1px, #D1D5DB), empty radio
- Hover: Subtle shadow, cursor pointer

**Behavior:**
- When selected: Shows "(Will select TRL Standard for this configuration)" in small gray text below card
- Selection logic communicated through helper text, not hidden

### Card 2: TRL Standard

**Visual Design:**
- Border: 1px solid gray (#D1D5DB) when unselected
- Radio button: Large (20px), left-aligned
- Icon: Gear icon (represents production-grade, reliable)

**Content:**
- Title: "TRL Standard (QLoRA)" (bold, 16px)
- Description: "Production-grade training with TRL + PEFT using 4-bit quantization" (gray, 14px)
- Features section:
  - Label: "Key Features" (semibold, 13px)
  - Feature badges (inline, small chips with icons):
    - "4-bit Quantization" (blue badge)
    - "Role Alternation Fixing" (green badge)
    - "Stable & Proven" (gray badge)
- Supports section:
  - Label: "Supported Models" (semibold, 13px, margin-top: 8px)
  - Model list: "Mistral, Llama, Qwen, GPT" (gray, 12px)
- Estimated speed: "Balanced" with speedometer icon (gray, 12px)

**Additional Info:**
- Expandable "Learn More" link (blue text, 12px)
- Expands inline to show: "Best for: Standard fine-tuning with proven reliability. Memory efficient through 4-bit quantization. Handles role alternation issues automatically."

**States:**
- Selected: Blue border (2px), blue radio fill, slight background tint
- Unselected: Gray border, empty radio
- Hover: Subtle shadow, cursor pointer

### Card 3: TRL Advanced

**Visual Design:**
- Border: 1px solid gray (#D1D5DB) when unselected
- Badge: "Advanced" (purple background, white text, top-right corner)
- Radio button: Large (20px), left-aligned
- Icon: Atom/science icon (represents research-grade, experimental)

**Content:**
- Title: "TRL Advanced" (bold, 16px)
- Description: "Advanced TRL with custom loss functions and research features" (gray, 14px)
- Features section:
  - Label: "Advanced Features" (semibold, 13px)
  - Feature badges (inline, small chips with icons):
    - "Emotional Arc Weighting" (purple badge)
    - "Curriculum Learning" (purple badge)
    - "Custom Metrics" (purple badge)
- Supports section:
  - Label: "Supported Models" (semibold, 13px, margin-top: 8px)
  - Model list: "Mistral, Llama, Qwen" (gray, 12px)
- Estimated speed: "Balanced" with speedometer icon (gray, 12px)
- Requirements notice (orange background, small padding):
  - Icon: Warning icon
  - Text: "Requires specialized dataset format (emotional alignment, multi-perspective)" (12px)

**Additional Info:**
- Expandable "Learn More" link (blue text, 12px)
- Expands inline to show: "Best for: Research-grade training with emotional intelligence, multi-perspective deliberation, or custom training objectives. Provides complete control over loss calculation and training progression."

**States:**
- Selected: Blue border (2px), blue radio fill, slight background tint
- Unselected: Gray border, empty radio
- Disabled: Gray background if dataset type incompatible (with tooltip: "Your dataset type doesn't support this engine")
- Hover: Subtle shadow, cursor pointer

**Validation & Feedback:**
- If user selects TRL Advanced without compatible dataset: Show warning banner
  - "Your dataset may not be compatible with TRL Advanced features. Continue anyway?"
  - Primary action: "Continue" | Secondary: "Choose Auto-Select"

**Future Extensibility:**
- New engine cards can be added to this vertical stack
- Card component is modular and reusable
- Feature badges are dynamic based on engine capabilities

---

## SECTION 3: Metrics Configuration Component (FR8.1.2 - New)

**Section Header:**
- Title: "Metrics to Collect" (bold, 16px)
- Subtitle: "Choose what measurements to collect during training" (gray, 14px)
- Help icon: Links to "/docs/metrics-methodology" for measurement protocols

**Section Layout:**
- Two subsections: Universal Metrics (read-only) + Specialized Metrics (configurable)
- Clear visual separation between subsections
- Cost impact indicator at bottom (updates in real-time)

### Subsection 1: Universal Metrics (Always Collected)

**Container:**
- Background: Light gray (#F9FAFB) to indicate non-interactive
- Border: None (background color provides sufficient separation)
- Padding: 16px
- Margin-bottom: 24px

**Header:**
- Title: "Universal Metrics (Always Collected)" (semibold, 14px)
- Icon: Checkmark circle (green, indicates always active)

**Metric Items (List):**
- Layout: Vertical list, 8px gap between items
- Each item displays:
  - Left: Metric name (semibold, 13px) + description (gray, 12px, below name)
  - Right: Green checkmark icon (16px, indicates collected)

**Example Metrics:**
1. **Training Loss**
   - Description: "Cross-entropy loss during training"
   - Always collected: ✓

2. **Training Time**
   - Description: "Total time spent training in seconds"
   - Always collected: ✓

3. **GPU Utilization**
   - Description: "Percentage of GPU compute used"
   - Always collected: ✓

4. **Memory Usage**
   - Description: "Peak GPU memory consumption in GB"
   - Always collected: ✓

**Visual State:**
- All items have same styling (no hover, no selection, no interaction)
- Communicates "these are included by default" clearly

### Subsection 2: Specialized Metrics (Optional)

**Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Padding: 16px

**Header:**
- Title: "Specialized Metrics (Optional)" (semibold, 14px)
- Subtitle: "These metrics are specific to your training data type" (gray, 12px, margin-bottom: 12px)

**Empty State (If No Specialized Metrics Available):**
- Icon: Info circle (gray)
- Message: "No specialized metrics available for your dataset type" (gray, 14px)
- Helper text: "Specialized metrics are available for emotional alignment and multi-perspective datasets" (gray, 12px)

**Metric Items (Checkboxes - Interactive):**
- Layout: Vertical list, 12px gap between items
- Each item is a checkbox card with detailed information

**Metric Checkbox Card Design:**
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 16px
- Layout: Checkbox + Content + Help icon (horizontal)

**Checkbox Card Components:**

1. **Checkbox** (left-aligned):
   - Size: 20px
   - Unchecked: Empty box with gray border
   - Checked: Blue fill with white checkmark
   - Click target: Entire card (not just checkbox)

2. **Content** (center, takes most width):
   - **Metric Name** (semibold, 14px)
   - **Description** (gray, 13px, margin-top: 4px)
   - **Measurement Method** (gray, 12px, margin-top: 8px)
     - Label: "Measurement:" (semibold)
     - Text: Brief explanation of how metric is computed
   - **Additional Cost** (orange badge, 12px, margin-top: 8px)
     - Example: "+5 minutes" or "+$2.00"
     - Only shown if metric adds significant cost/time

3. **Help Icon** (right-aligned):
   - Icon: Question mark circle (gray, 20px)
   - Hover state: Cursor pointer, tooltip appears
   - Click behavior: Opens metric detail modal (see Section 4)

**Example Specialized Metrics:**

### Metric Card 1: Emotional Arc Fidelity

**Content:**
- Name: "Emotional Arc Fidelity"
- Description: "Measures how well the model follows intended emotional arc progression"
- Measurement: "Evaluates model outputs against expected emotional states using classifier"
- Additional cost: "+5 minutes" (orange badge)
- Availability: Only for datasets with emotional_arc scaffolding

**States:**
- Unchecked: Gray border, empty checkbox
- Checked: Blue border (2px), blue checkbox, slight blue background tint
- Hover: Subtle shadow, cursor pointer
- Disabled: Gray background, tooltip explains incompatibility

### Metric Card 2: Empathy Score

**Content:**
- Name: "Empathy Score"
- Description: "Degree to which model acknowledges and validates emotions"
- Measurement: "Analyzes responses for empathetic language using NLI model"
- Additional cost: "+3 minutes" (orange badge)
- Availability: Only for emotional alignment datasets

### Metric Card 3: Multi-Perspective Consensus

**Content:**
- Name: "Multi-Perspective Consensus Score"
- Description: "Quality of consensus achieved across expert perspectives"
- Measurement: "Analyzes output for synthesis quality using trained judge model"
- Additional cost: "+8 minutes" (orange badge)
- Availability: Only for multi-perspective datasets

### Metric Card 4: Perspective Coverage

**Content:**
- Name: "Perspective Coverage"
- Description: "Completeness of perspective representation in outputs"
- Measurement: "Checks if all required perspectives are addressed"
- Additional cost: "+2 minutes" (orange badge)
- Availability: Only for multi-perspective datasets

**Selection Behavior:**
- Users can select 0 to all specialized metrics
- No minimum or maximum restrictions
- Each selection updates cost estimate in real-time
- Selected metrics passed to training job configuration

**Visual Feedback:**
- Counter badge: "3 metrics selected" (gray badge, updated dynamically)
- Position: Below metric list

### Cost Impact Display (Bottom of Subsection)

**Container:**
- Background: Light blue (#EFF6FF) - info background
- Border: 1px solid blue (#93C5FD)
- Border radius: 8px
- Padding: 12px
- Margin-top: 16px

**Content:**
- Icon: Info circle (blue, 16px, left-aligned)
- Text (gray, 13px):
  - "Collecting {N} specialized metrics will add approximately {X} minutes to training time for evaluation."
  - Example: "Collecting 3 specialized metrics will add approximately 16 minutes to training time for evaluation."
- If no metrics selected: "No additional cost. Select metrics above to see impact."

**Dynamic Updates:**
- Updates immediately when metrics selection changes
- Calculates total additional time by summing individual metric costs
- Also triggers update to main cost estimate component (existing E01 component)

---

## SECTION 4: Metric Detail Modal (FR8.1.3 - New)

**Trigger:** User clicks help icon (?) on any specialized metric card

**Modal Design:**
- Full-screen overlay with semi-transparent background
- Modal container: 600px width, centered, white background
- Shadow: Large shadow for depth
- Close: X button (top-right) + click outside to close

**Modal Header:**
- Metric name (bold, 20px)
- Level badge: "Specialized" (purple background, white text)
- Close button (X icon, 24px, top-right)

**Modal Content Sections:**

### 1. Description Section
- Title: "What This Measures" (semibold, 16px)
- Text: Full description of metric (14px, line-height: 1.6)
- Example: "Emotional Arc Fidelity measures how well the trained model follows the intended emotional progression defined in your training data. This is crucial for applications requiring emotional intelligence and empathetic responses."

### 2. Measurement Method Section
- Title: "How It's Measured" (semibold, 16px, margin-top: 24px)
- Text: Detailed explanation of measurement process (14px)
- Numbered steps if applicable
- Example:
  1. Model generates outputs for test prompts with known emotional arcs
  2. Emotional state classifier analyzes each output
  3. Predicted states compared to expected progression
  4. Fidelity score calculated as match rate (0.0 to 1.0)

### 3. Interpretation Section
- Title: "Interpreting Results" (semibold, 16px, margin-top: 24px)
- Score ranges with visual indicators:
  - 0.85 - 1.0: "Excellent" (green badge) - Model follows emotional arcs very accurately
  - 0.70 - 0.84: "Good" (blue badge) - Model shows understanding with minor deviations
  - 0.50 - 0.69: "Fair" (yellow badge) - Model needs improvement in emotional consistency
  - Below 0.50: "Poor" (red badge) - Model not capturing emotional progressions

### 4. Requirements Section
- Title: "Requirements" (semibold, 16px, margin-top: 24px)
- Bulleted list:
  - Dataset must include emotional_arc scaffolding
  - Requires emotional state classifier (provided by system)
  - Adds ~5 minutes to training for evaluation
  - Results available in detailed results dashboard

### 5. Documentation Link
- Button: "Read Full Methodology" (blue outline button, 14px)
- Icon: External link icon
- Links to: `/docs/metrics/emotional-arc-fidelity`
- Opens in new tab

**Modal Footer:**
- Primary action: "Got It" button (blue, closes modal)
- Alignment: Right

**Responsive Design:**
- Desktop: 600px width
- Tablet: 90% width, max 500px
- Mobile: Full width with small margin

---

## SECTION 5: Integration with Cost Estimate (Existing E01 Component)

**Requirement:** Metrics selection must update existing cost estimate display

**Integration Points:**

### 1. Cost Breakdown Update
Existing cost estimate component (from E01) displays:
- Compute Cost: $XX.XX (existing)
- Storage Cost: $X.XX (existing)
- **Metric Evaluation Cost: $X.XX** (NEW - only shown if specialized metrics selected)
- **Total Estimated Cost: $XX.XX** (updated to include metrics)

**Metric Evaluation Cost Calculation:**
- Based on number of selected metrics and estimated evaluation time
- Displayed as separate line item for transparency
- Shows "N/A" or hidden if no specialized metrics selected

### 2. Duration Estimate Update
Existing duration display updates to include evaluation time:
- "Estimated Duration: X hours Y minutes" (includes metric evaluation time)
- Tooltip: "Includes ~Z minutes for metric evaluation" (if metrics selected)

### 3. Real-time Updates
- Debounced updates (500ms) when metrics selection changes
- Same update mechanism as existing hyperparameter changes
- Loading state: Brief spinner or skeleton loader during calculation
- Error state: "Unable to calculate impact. Default estimate shown."

### 4. Visual Emphasis
When specialized metrics are selected:
- Cost estimate component briefly highlights (subtle blue border flash)
- Draws user's attention to updated cost
- Helps users understand the cost impact of their metric selection

---

## SECTION 6: Form Validation & Error States

**Validation Rules:**

### Engine Selection Validation
- Must select exactly one engine (enforced by radio group)
- Default: Auto-Select (always valid)
- TRL Advanced selection: Warns if dataset incompatible, but allows continuation

**Warning Banner (Dataset Incompatibility):**
- Position: Below engine selection, above metrics configuration
- Background: Orange (#FEF3C7)
- Border: 1px solid orange (#F59E0B)
- Icon: Warning triangle (orange)
- Text: "Your dataset type may not support TRL Advanced features. The engine will fall back to standard training if advanced features are unavailable."
- Actions: 
  - "I Understand" (dismisses warning, allows continuation)
  - "Switch to Auto-Select" (changes engine selection, dismisses warning)

### Metrics Selection Validation
- No validation required (selecting 0 specialized metrics is valid)
- No maximum limit enforced (user can select all)

### Combined Configuration Validation
- Validation occurs on "Start Training" button click (existing E01 flow)
- Engine + Metrics configuration passed to backend as part of job configuration
- Backend performs final validation and returns errors if needed

**Error Display:**
- Inline errors: Red text below component with error icon
- Toast notifications: For backend validation failures
- Retry mechanism: User can fix errors and resubmit

---

## SECTION 7: State Persistence & User Experience

**Session Storage:**
- Advanced Options expanded/collapsed state persists across page refreshes
- Engine selection persists in session (lost on browser close)
- Metrics selection persists in session

**Default Behavior:**
- First visit: Advanced Options collapsed, Auto-Select chosen, no specialized metrics
- Return visit (same session): Restores previous selections
- New training job (from template): Can pre-fill engine and metrics from template

**Loading States:**
- Engine list: Skeleton loader (3 card shapes) while fetching available engines
- Metrics list: Skeleton loader (4 card shapes) while fetching available metrics
- Cost estimate: Existing spinner/skeleton from E01

**Empty States:**
- No engines available: "Unable to load training engines. Please try again."
- No specialized metrics: Info message (shown in Subsection 2 empty state)

**Error States:**
- Failed to load engines: Error banner with retry button
- Failed to load metrics: Error banner with retry button
- Failed to update cost: Warning banner, shows last known estimate

---

## SECTION 8: Responsive Design Requirements

**Desktop (≥1024px):**
- Advanced Options section: Full width
- Engine cards: Vertical stack, full width
- Metrics cards: Vertical stack, full width
- Modal: 600px width, centered

**Tablet (768px - 1023px):**
- Advanced Options section: Full width
- Engine cards: Vertical stack, full width
- Metrics cards: Vertical stack, full width
- Modal: 90% width, max 500px

**Mobile (<768px):**
- Advanced Options section: Full width
- Engine cards: Vertical stack, full width, reduced padding
- Metrics cards: Vertical stack, full width, reduced padding
- Feature badges: Wrap to multiple lines if needed
- Modal: Full width with 16px margin

---

## SECTION 9: Accessibility Requirements

**Keyboard Navigation:**
- Tab order: Advanced Options toggle → Engine radio buttons → Metrics checkboxes → Help icons
- Enter/Space: Toggle Advanced Options, select radio/checkbox, open modal
- Escape: Close metric detail modal

**Screen Reader Support:**
- Advanced Options: "Button, Advanced Options, collapsed/expanded"
- Engine cards: "Radio button, [Engine Name], [Description], [Selected/Not selected]"
- Metrics cards: "Checkbox, [Metric Name], [Description], [Checked/Unchecked]"
- Help icons: "Button, Show details for [Metric Name]"
- Cost impact: "Alert, Collecting N metrics will add approximately X minutes"

**Color Contrast:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Badge colors have sufficient contrast
- Border colors visible for low-vision users

**Focus Indicators:**
- All interactive elements have visible focus ring (2px blue outline)
- Focus ring visible on keyboard navigation, hidden on mouse click

---

## SECTION 10: API Integration Requirements

**GET /api/engines**
- Returns: List of available training engines
- Response format:
```json
{
  "engines": [
    {
      "id": "auto",
      "name": "Auto-Select",
      "description": "System automatically selects...",
      "recommended": true,
      "features": [],
      "supports_models": ["*"],
      "estimated_speed": "balanced"
    },
    {
      "id": "trl-standard",
      "name": "TRL Standard",
      "description": "Production-grade training...",
      "features": ["4-bit quantization", "role-alternation-fixing"],
      "supports_models": ["mistral-*", "llama-*", "qwen-*"],
      "estimated_speed": "balanced"
    }
  ]
}
```

**GET /api/metrics/available?datasetType={type}**
- Returns: Available metrics for dataset type
- Response format:
```json
{
  "universal": [
    {
      "id": "training_loss",
      "name": "Training Loss",
      "description": "Cross-entropy loss...",
      "auto_collected": true
    }
  ],
  "specialized": [
    {
      "id": "emotional_arc_fidelity",
      "name": "Emotional Arc Fidelity",
      "description": "Measures how well...",
      "measurement_method": "Evaluates model outputs...",
      "additional_cost_minutes": 5,
      "additional_cost_usd": 1.25,
      "available_for_datasets": ["emotional-alignment"],
      "methodology_link": "/docs/metrics/emotional-arc-fidelity"
    }
  ]
}
```

**POST /api/jobs (Updated)**
- Request body now includes:
```json
{
  "dataset_id": "...",
  "preset_id": "...",
  "hyperparameters": {...},
  "gpu_config": {...},
  "engine_id": "trl-standard",
  "metrics_to_collect": ["training_loss", "emotional_arc_fidelity"],
  "estimated_cost": 28.50
}
```

---

## Design System Consistency

**Components to Reuse from Existing E01-E07:**
- Card styling (borders, shadows, padding)
- Button styles (primary, secondary, outline)
- Badge components (color-coded status badges)
- Typography scale (H1-H6, body text, helper text)
- Color palette (primary blue, gray scale, semantic colors)
- Icon set (consistent icon style and sizing)
- Form controls (inputs, dropdowns, sliders)
- Loading states (spinners, skeleton loaders)
- Modal styling (overlay, container, header/footer)

**New Components Introduced:**
- Radio card group (vertical stack with detailed content)
- Checkbox card (interactive card with checkbox + content)
- Metric detail modal (documentation-style modal)
- Cost impact indicator (info banner with dynamic updates)
- Collapsible section (chevron indicator with smooth animation)

**Color Coding Consistency:**
- Green: Recommended, success, collected
- Blue: Primary actions, selected state, info
- Orange: Warnings, cost impact, attention needed
- Purple: Advanced features, specialized capabilities
- Gray: Disabled, read-only, helper text
- Red: Errors, critical warnings, poor metrics

---

## Success Metrics & Validation

**User Flow Success:**
- User can expand Advanced Options → Select engine → Select metrics → See cost update → Continue to training
- Average time to configure: <60 seconds for advanced users
- Configuration completion rate: >90%

**Component Validation:**
- Engine selection: One engine always selected (radio group enforced)
- Metrics selection: 0-N metrics valid
- Cost estimate updates within 500ms of selection change
- Modal opens/closes smoothly without layout shift

**Accessibility Validation:**
- All components keyboard navigable
- Screen reader announces all state changes
- Focus indicators visible throughout flow
- Color contrast meets WCAG AA

---

**End of E08 Wireframe Prompt**

This wireframe prompt provides complete specifications for implementing advanced training configuration with engine and metrics selection, following the established design patterns from E01-E07 while introducing modular new capabilities aligned with the philosophical framework's UI-first, measurable, and extensible approach.

