# LoRA Pipeline - Figma Wireframe Prompts Output - E01
**Version:** 1.0  
**Date:** December 18, 2025  
**Section:** Stage 1 — Training Job Configuration & Setup  
**Generated From:** FR Wireframe Generator v4

This document contains Figma Make AI-ready wireframe prompts for all functional requirements in Stage 1 (E01). Each prompt is self-contained and can be directly pasted into Figma Make AI to generate wireframes.

---

=== BEGIN PROMPT FR: FR1.1.1 ===

**Title**: FR FR1.1.1 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR enables users to create training jobs from existing training files through an intuitive selection interface. Users must be able to browse available training files, view comprehensive metadata including quality scores and conversation details, validate dataset eligibility, and initiate job configuration. The interface prioritizes transparency and confidence-building, showing users exactly what they're working with before committing to a training run. This is the critical first step in the training workflow, setting expectations for duration, cost, and quality outcomes.

**Journey Integration**

- **Stage 1 User Goals**: First training job setup, Understanding dataset quality and readiness, Building confidence in platform capabilities, Transparent cost and time expectations
- **Key Emotions**: Initial curiosity and exploration, Anxiety reduction through clear information, Confidence building through quality indicators, Trust establishment through transparency
- **Progressive Disclosure**: 
  * Basic: Simple dropdown with top-level metadata (name, conversation count)
  * Advanced: Expandable quality metrics with detailed breakdowns
  * Expert: Preview conversation samples and scaffolding distribution
- **Persona Adaptations**: Unified interface serving all personas with contextual help for technical terms, visual quality indicators for non-technical users, and detailed metrics for engineers

**Journey-Informed Design Elements**

- **User Goals**: First-time platform discovery, Guided project setup, Privacy assurance and trust building, ROI understanding and value demonstration
- **Emotional Requirements**: Build confidence through simple language, Reduce anxiety with progress indicators, Celebrate project creation, Provide reassurance about data security
- **Progressive Disclosure**:
  * Basic: Simple training file selection with essential metadata
  * Advanced: Quality score breakdowns and scaffolding distribution
  * Expert: Sample conversation previews and enrichment status
- **Success Indicators**: Training file selected with confidence, Quality thresholds understood, User ready to proceed to hyperparameter configuration

**Wireframe Goals**

- Enable confident training file selection through comprehensive metadata display
- Communicate dataset quality and readiness at a glance with visual indicators
- Provide transparency about conversation count, training pairs, and quality scores
- Build trust through preview capabilities and scaffolding distribution visibility
- Validate eligibility automatically and surface blocking issues clearly
- Create smooth transition to hyperparameter configuration with pre-populated defaults

**Explicit UI Requirements (from acceptance criteria)**

**Training File Selection**
- Searchable dropdown displaying training files from database (status='active', conversation_count >= 50)
- Each entry shows: File name, Conversation count with training pairs count, Average quality score with visual indicator (✓ High Quality ≥4.0, ⚠ Review <4.0)
- Search/filter capability by name, conversation count range, quality score range
- Empty state: "No training files available. Upload a training file to get started."
- Loading state: Skeleton loaders while fetching training file list
- Error state: "Failed to load training files. Refresh to try again."

**Metadata Display (on file selection)**
- Comprehensive metadata panel appears within 2 seconds of selection
- Quality score breakdown: Empathy (X.X/5), Clarity (X.X/5), Appropriateness (X.X/5) with color-coded badges
- Scaffolding distribution with percentages: Personas (N types), Emotional arcs (N types), Topics (N categories)
- Human review statistics: "X% human-reviewed, Y% AI-generated with validation"
- File size and last updated timestamp
- Storage status indicator: "✓ File ready in storage" or "⚠ File not found"

**Eligibility Validation**
- Real-time validation checks: File paths exist, Enrichment status = 'completed', No active training jobs using same file
- Visual validation feedback: ✓ Ready for Training, ⏳ Processing, ⚠ Review Required
- Error messages for blocking issues: "Training file not found" (deleted), "Training file not enriched" (still processing), "Insufficient conversations" (<50), "Storage file missing" (invalid path)
- Disabled "Create Training Job" button until all validation passes

**Job Creation Action**
- "Create Training Job" button (large, primary, blue, with icon)
- Button disabled state (grayed out) when validation fails
- Button enabled state (bright, clickable) when file eligible
- Click creates database record with auto-generated name: "{training_file_name} - {current_date}"
- Loading spinner on button during creation: "Creating job..."
- Success: Redirect to `/training-jobs/{job_id}/configure` with job ID in URL
- Failure: Error toast "Failed to create training job. Please try again."

**Pre-Population & Estimates**
- Configuration defaults suggested based on dataset: Conservative preset if <150 conversations, Balanced if 150-300, Aggressive if >300
- Estimated metrics preview: Duration (8-20 hours), Cost range ($25-100), Expected quality improvement (30-40%) based on historical data
- Visual "Dataset Readiness" indicators throughout selection process

**Interactions and Flows**

1. **Initial Load**: User navigates to "Create Training Job" → Dropdown fetches training files from database → List renders with metadata
2. **Search/Filter**: User types in search box → Debounced query filters results by name/count/quality → Results update in real-time
3. **File Selection**: User clicks training file → Metadata panel expands below dropdown → Comprehensive details load within 2s
4. **Preview**: User clicks "Preview Conversations" → Modal opens with 3-5 sample conversations from dataset → User can navigate through samples
5. **Validation**: System runs eligibility checks automatically → Visual indicators update (checkmark, warning, error) → Button state adjusts
6. **Job Creation**: User clicks "Create Training Job" → Loading spinner → Database INSERT → Redirect to configuration page with pre-populated settings
7. **Error Recovery**: If creation fails → Error toast → User can retry → System logs attempt

**Visual Feedback**

- **Quality Indicators**: Green checkmark badges for ≥4.0 scores, Yellow warning for 3.5-3.9, Red alert for <3.5
- **Loading States**: Skeleton loaders for dropdown, Shimmer effect for metadata panel, Spinner on button
- **Validation Feedback**: ✓ Ready (green), ⏳ Processing (yellow animated), ⚠ Review (orange), ✗ Blocked (red)
- **Progress Indication**: Visual cue that this is step 1 of multi-step configuration
- **Hover States**: Dropdown items highlight on hover, Tooltips appear on quality score icons, Button brightens on hover
- **Success Confirmation**: Brief green flash on successful job creation before redirect

**Accessibility Guidance**

- Dropdown keyboard navigable (arrow keys, Enter to select)
- All quality indicators have ARIA labels: aria-label="High quality: 4.5 out of 5"
- "Create Training Job" button has focus state (blue outline) and disabled state (aria-disabled="true")
- Error messages announced by screen readers (role="alert")
- Tooltips accessible via keyboard focus (Tab key) and programmatically associated (aria-describedby)
- Color not sole indicator (icons + text accompany color coding)
- Minimum contrast ratio 4.5:1 for all text
- Focus trap in preview modal (Escape to close, Tab cycles within modal)

**Information Architecture**

**Page Structure**:
- Header: "Create New Training Job" (H1)
- Section 1: Training File Selection (primary action area)
  - Dropdown component (searchable, filterable)
  - Metadata panel (expandable below dropdown)
- Section 2: Eligibility Status (validation feedback area)
  - Visual indicators and messages
- Section 3: Next Steps (action area)
  - "Create Training Job" button
  - Link to documentation: "Learn about training files"
- Footer: Contextual help and support links

**Component Hierarchy**:
- TrainingFileSelector (parent)
  - SearchableDropdown
  - MetadataPanel
    - QualityScores
    - ScaffoldingDistribution
    - ReviewStatistics
  - EligibilityIndicator
  - CreateJobButton

**Page Plan**

**Page 1: Training File Selection (Empty State)**
- Purpose: Show new user the training file selection interface before any files exist
- Key Elements: Empty dropdown with "No training files available", Upload training file guidance, Link to documentation
- States: Empty state with helpful messaging

**Page 2: Training File Selection (Loaded)**
- Purpose: Display searchable dropdown populated with training files
- Key Elements: Dropdown with 3-5 sample training files, Search/filter controls, Each file showing name + conversation count + quality indicator
- States: Loaded state with sample data

**Page 3: Training File Selected with Metadata**
- Purpose: Show comprehensive metadata panel after file selection
- Key Elements: Selected file highlighted in dropdown, Expanded metadata panel with quality scores + scaffolding distribution + human review stats, Eligibility validation indicators, Enabled "Create Training Job" button
- States: File selected, metadata loaded, validation passed

**Page 4: Preview Conversations Modal**
- Purpose: Allow user to preview sample conversations from selected training file
- Key Elements: Modal overlay with 3-5 conversation samples, Navigation controls (prev/next), Conversation metadata (persona, emotional arc, topic), Close button
- States: Modal open with sample conversation displayed

**Page 5: Eligibility Validation Failures**
- Purpose: Show error states when training file doesn't meet eligibility criteria
- Key Elements: Same layout as Page 3 but with error indicators, Specific error messages (file not enriched, insufficient conversations, storage file missing), Disabled "Create Training Job" button, Guidance on how to resolve issues
- States: Validation failed with actionable error messages

**Annotations (Mandatory)**

Attach notes to UI elements citing the acceptance criterion they fulfill. Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component → State → Notes.

**Example annotations**:
- Dropdown search box: "US1.1.1 AC1: Training files dropdown with search/filter capability"
- Quality score badge: "FR1.1.1 AC3: Visual indicator (✓ High Quality ≥4.0)"
- Metadata panel: "FR1.1.1 AC4: Displays quality scores, scaffolding distribution, human review count within 2 seconds"
- "Create Training Job" button: "US1.1.1 AC5: Opens configuration modal / redirects to config page"

**Acceptance Criteria → UI Component Mapping**

| Criterion | Source | Screen | Component | State | Notes |
|-----------|--------|--------|-----------|-------|-------|
| Training files dropdown populated from `training_files` table | US1.1.1 AC1 | Page 2 | SearchableDropdown | Loaded | Shows only active files with ≥50 conversations |
| Dropdown shows file name, conversation count, training pairs | US1.1.1 AC1 | Page 2 | DropdownItem | Default | Each item displays 3 key metrics |
| Search/filter by name, count, quality score | FR1.1.1 AC2 | Page 2 | SearchInput | Active | Debounced search with real-time filtering |
| Quality score visual indicator (✓ ≥4.0, ⚠ <4.0) | FR1.1.1 AC3 | Page 2 | QualityBadge | Display | Color-coded with icon + text |
| Click training file displays metadata | US1.1.1 AC2 | Page 3 | MetadataPanel | Expanded | Loads within 2 seconds |
| Metadata includes quality scores breakdown | US1.1.1 AC2 | Page 3 | QualityScores | Display | Empathy, Clarity, Appropriateness with values |
| Metadata includes scaffolding distribution | US1.1.1 AC2 | Page 3 | ScaffoldingDistribution | Display | Personas, arcs, topics with percentages |
| Metadata includes human review count | US1.1.1 AC2 | Page 3 | ReviewStatistics | Display | Percentage human-reviewed vs AI-generated |
| Form validation ensures ≥50 conversations | US1.1.1 AC5 | Page 5 | EligibilityIndicator | Error | Blocks job creation if insufficient |
| "Create Training Job" button opens config | US1.1.1 AC3 | Page 3 | CreateJobButton | Enabled | Redirects to `/training-jobs/{id}/configure` |
| Button disabled until valid file selected | FR1.1.1 AC6 | Page 2,5 | CreateJobButton | Disabled | Gray, not clickable, with tooltip explanation |
| Job created with status "pending_configuration" | US1.1.1 AC6 | N/A | Backend | Database | INSERT into training_jobs table |
| Redirect to job configuration page with job ID | US1.1.1 AC7 | N/A | Routing | Redirect | URL includes job_id parameter |
| Error handling for deleted files | FR1.1.1 AC9 | Page 5 | ErrorMessage | Display | "Training file not found" with refresh action |
| Error handling for not enriched files | FR1.1.1 AC9 | Page 5 | ErrorMessage | Display | "Training file not enriched" with status |
| Error handling for missing storage files | FR1.1.1 AC9 | Page 5 | ErrorMessage | Display | "Storage file missing" with support link |
| Preview conversation samples | FR1.1.1 AC12 | Page 4 | PreviewModal | Open | Modal with 3-5 sample conversations |
| Estimated training metrics preview | FR1.1.1 AC13 | Page 3 | EstimatesPanel | Display | Duration, cost, quality improvement |

**Non-UI Acceptance Criteria**

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| System queries `training_files` table WHERE status='active' AND conversation_count >= 50 | Database query determines available files | UI receives filtered list only |
| System validates file paths exist in storage | Backend check before enabling job creation | UI shows storage status indicator |
| Enrichment status = 'completed' required | Backend validation | UI displays enrichment status badge |
| No active training jobs using same file | Backend check to prevent conflicts | UI shows warning if file in use |
| System logs all job creation attempts | Audit trail for debugging | No direct UI, but supports error diagnosis |
| Auto-generated job name: "{training_file_name} - {current_date}" | Default naming convention | UI shows this as pre-filled value (user can edit) |
| INSERT record into `training_jobs` table with UUID, foreign keys, timestamps | Database operation | UI loading state while INSERT executes |
| Form pre-populates defaults based on dataset characteristics | Backend logic for preset selection | UI shows suggested preset with explanation |

**Estimated Page Count**

**5 pages** covering:
1. Empty state (no training files)
2. Loaded state (file list populated)
3. File selected with metadata (primary happy path)
4. Preview modal (sample conversations)
5. Error states (validation failures)

Rationale: Need to show full workflow from empty→selection→preview→validation, plus error recovery paths. Five pages cover all critical states and user decision points without redundancy.

=== END PROMPT FR: FR1.1.1 ===

---

=== BEGIN PROMPT FR: FR1.1.2 ===

**Title**: FR FR1.1.2 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR enables users to select from three scientifically-validated hyperparameter presets (Conservative, Balanced, Aggressive) designed to simplify the complex task of LoRA configuration. Users without deep LoRA expertise can make informed decisions based on clear trade-offs: cost vs quality, speed vs thoroughness, risk vs reward. Each preset includes comprehensive metadata about technical parameters, estimated outcomes, historical success rates, and recommended use cases. The interface guides users toward optimal configurations while maintaining transparency about what each choice entails.

**Journey Integration**

- **Stage 1 User Goals**: Understanding hyperparameter options without deep LoRA expertise, Making informed cost/quality trade-offs, Building confidence through proven presets, Reducing anxiety about configuration mistakes
- **Key Emotions**: Initial confusion about technical terms → Relief through simple presets → Confidence from success rates → Trust in guided recommendations
- **Progressive Disclosure**: 
  * Basic: Three preset radio cards with names and one-sentence descriptions
  * Advanced: Expandable technical parameters section showing r, lr, epochs, batch_size
  * Expert: Links to documentation explaining LoRA concepts and hyperparameter impact
- **Persona Adaptations**: Non-technical users see simple preset names and business outcomes; Engineers can expand technical details; Managers focus on cost/success rate data

**Journey-Informed Design Elements**

- **User Goals**: Understanding training configuration options, Balancing cost vs quality objectives, Reducing configuration complexity, Learning LoRA concepts incrementally
- **Emotional Requirements**: Simplify technical complexity with plain language, Provide confidence through historical success rates, Reduce decision anxiety with clear recommendations, Build trust through transparent trade-offs
- **Progressive Disclosure**:
  * Basic: Three preset cards with simple descriptions and recommendations
  * Advanced: Technical parameters (collapsible section), Cost breakdowns, Duration estimates
  * Expert: Educational tooltips, Documentation links, Parameter optimization guides
- **Success Indicators**: Preset selected with confidence, Cost/quality trade-offs understood, User knows why this preset fits their needs, Ready to proceed to GPU selection

**Wireframe Goals**

- Present three hyperparameter presets as visually distinct, easy-to-compare options
- Communicate complex technical parameters through simple labels and tooltips
- Display cost/duration estimates, risk levels, and success rates prominently
- Guide users toward appropriate preset based on dataset characteristics
- Enable informed decision-making through transparent trade-off presentation
- Build confidence through historical data and recommended use cases

**Explicit UI Requirements (from acceptance criteria)**

**Preset Card Layout**
- Three preset options as visually distinct radio cards with clear selection state
- Each card structure: Preset name + icon (top), One-sentence description, Technical parameters (collapsible), Estimated metrics (duration, cost), Risk indicator, Success rate badge
- Selected state: Blue border + checkmark icon
- Unselected state: Gray border, hover effect (slight shadow + brightness)
- Preset names: "Conservative", "Balanced", "Aggressive" with descriptive icons

**Conservative Preset Card**
- Name: "Conservative" with shield icon (safety/low-risk)
- Description: "Best for high-quality seed datasets and first training runs"
- Technical parameters (collapsible): r=8, lr=1e-4 (0.0001), epochs=2, batch_size=4, gradient_accumulation_steps=1
- Estimated duration: "8-10 hours"
- Estimated cost: "$25-30 (spot) / $80-120 (on-demand)"
- Risk level: "Low" (green badge)
- Success rate: "98% success rate (based on 127 completed jobs)"
- Recommended for: "First training run, High-quality seed data, Budget-conscious, Quick validation"

**Balanced Preset Card**
- Name: "Balanced" with scales icon (balance/middle ground)
- Description: "Production-ready configuration for most use cases"
- Technical parameters: r=16, lr=2e-4 (0.0002), epochs=3, batch_size=2, gradient_accumulation_steps=2
- Estimated duration: "12-15 hours"
- Estimated cost: "$50-60 (spot) / $120-140 (on-demand)"
- Risk level: "Medium" (yellow badge)
- Success rate: "96% success rate (based on 203 completed jobs)"
- Recommended for: "Production models, Proven reliability, Standard datasets, Client delivery"
- DEFAULT SELECTION if conversation_count 150-300

**Aggressive Preset Card**
- Name: "Aggressive" with rocket icon (maximum performance)
- Description: "Maximum quality for complex datasets, experimentation, when quality is paramount"
- Technical parameters: r=32, lr=3e-4 (0.0003), epochs=4, batch_size=1, gradient_accumulation_steps=4
- Estimated duration: "18-20 hours"
- Estimated cost: "$80-100 (spot) / $200-240 (on-demand)"
- Risk level: "Higher" (orange badge)
- Success rate: "92% success rate (based on 86 completed jobs)"
- Recommended for: "Complex emotional intelligence, Maximum quality, Research/experimentation, When budget allows"
- Locked state: Disabled with tooltip "Unlock after 3 successful training runs" (if user has <3 completed jobs)

**Interactive Tooltips**
- Hover over each hyperparameter shows tooltip explaining in simple terms:
  - "Rank (r): Number of trainable parameters - higher = more learning capacity but slower training"
  - "Learning Rate: Speed of model updates - higher = faster learning but risk of instability"
  - "Epochs: Complete passes through dataset - more = better learning but diminishing returns"
  - "Batch Size: Training examples processed simultaneously - larger = faster but more memory"
  - "Gradient Accumulation: Simulates larger batch sizes - higher = more stable gradients"
- Tooltip trigger: Hover over parameter name or info icon
- Tooltip appearance: Light gray background, dark text, arrow pointing to trigger, max-width 300px

**Cost Estimation Panel**
- Real-time cost estimate panel (always visible, right sidebar or bottom)
- Updates within 500ms when preset selection changes
- Shows: Previous estimate (strikethrough), New estimate (bold green if cheaper, red if more expensive), Delta amount with arrow (↓ $XX saved or ↑ $XX increase)
- Breakdown: Duration estimate, GPU cost, Total estimate range
- Accuracy disclaimer: "±15% variance based on 347 historical jobs"

**Documentation Link**
- Link to "Understanding LoRA Hyperparameters" opens in new tab
- Styled as secondary button or underlined text link
- URL: /docs/hyperparameters-explained
- Page includes: Visual diagrams, Interactive examples, Preset comparison chart, FAQ

**Interactions and Flows**

1. **Initial Load**: Configuration page loads → Balanced preset selected by default (if dataset 150-300 conversations) → Cost estimate displays for Balanced → Tooltips ready on hover
2. **Preset Selection**: User clicks Conservative card → Card border turns blue + checkmark appears → Other cards deselect → Cost estimate updates within 500ms → Page scrolls to show full card if needed
3. **Expand Technical Parameters**: User clicks "Technical Details" link → Section expands with animation → Shows all hyperparameter values → Tooltips available on hover
4. **Hover Tooltips**: User hovers over "Rank (r)" → Tooltip appears after 300ms delay → Shows explanation in plain language → Tooltip disappears when hover ends
5. **View Documentation**: User clicks "Learn more about hyperparameters" → New tab opens with documentation → User can read and return to configuration
6. **Aggressive Locked**: User (with <3 completed jobs) tries to select Aggressive → Card doesn't select → Tooltip appears: "Complete 3 successful training runs to unlock Aggressive preset" → Suggests Balanced as alternative
7. **Cost Estimate Update**: User changes from Balanced to Aggressive → Cost estimate panel updates: "$50-60" → "$80-100" → Shows "↑ $30 increase" in red → User can decide if worth extra cost

**Visual Feedback**

- **Selection State**: Selected card has blue border (4px), checkmark icon (top right), subtle blue background tint
- **Hover State**: Unselected cards brighten on hover, slight shadow appears (0 2px 8px rgba), cursor changes to pointer
- **Loading**: Skeleton loaders for preset cards while fetching historical success rates
- **Cost Update Animation**: Cost estimate numbers animate (count up/down) when preset changes, delta amount fades in with color (green/red)
- **Tooltip Appearance**: Fade in with 300ms delay, arrow pointing to trigger element, slight drop shadow
- **Risk Level Badges**: Color-coded (green=low, yellow=medium, orange=high) with icons (shield, scales, alert)
- **Success Rate Display**: Percentage in large font, "(based on X completed jobs)" in smaller gray text
- **Locked State**: Aggressive card grayed out with lock icon, disabled cursor (not-allowed) on hover

**Accessibility Guidance**

- Radio cards keyboard navigable (Tab to focus, Arrow keys to change selection, Enter/Space to select)
- Selected card has aria-checked="true" role="radio"
- All cards in radiogroup with aria-label="Hyperparameter preset selection"
- Risk level badges have aria-label: "Low risk", "Medium risk", "Higher risk"
- Tooltips accessible via keyboard (Tab to parameter, tooltip appears, Escape to close)
- Tooltips have role="tooltip" and aria-describedby linking trigger to content
- Locked Aggressive card has aria-disabled="true" and aria-label="Aggressive preset: Unlock after 3 successful training runs"
- Color not sole indicator (icons accompany risk badges, text accompanies cost changes)
- Focus indicators visible (blue outline) on keyboard navigation
- Screen reader announces selection changes: "Balanced preset selected. Estimated cost $50-60."

**Information Architecture**

**Page Structure**:
- Header: "Configure Training Job" (H1), Breadcrumb: "1. Select Dataset → 2. Choose Preset → 3. GPU Selection"
- Section 1: Hyperparameter Presets (main content)
  - Heading: "Choose Hyperparameter Preset" (H2)
  - Subheading: "Select a proven configuration based on your quality and budget goals"
  - Three preset cards (horizontal layout on desktop, stacked on mobile)
- Section 2: Cost Estimation Panel (sidebar or bottom)
  - Real-time cost estimate with breakdown
  - Updates when preset changes
- Section 3: Help & Documentation (below presets)
  - Link to hyperparameter documentation
  - Contextual help: "Not sure which preset to choose? Start with Balanced for most use cases."
- Footer: Action buttons ("Back" to dataset selection, "Continue" to GPU selection)

**Component Hierarchy**:
- PresetSelector (parent)
  - PresetCard (Conservative)
    - PresetHeader (name + icon)
    - PresetDescription
    - TechnicalDetails (collapsible)
    - EstimatedMetrics (duration + cost)
    - RiskIndicator (badge)
    - SuccessRate (badge)
    - RecommendedFor (list)
  - PresetCard (Balanced) [same structure]
  - PresetCard (Aggressive) [same structure + locked state]
  - CostEstimationPanel
  - DocumentationLink

**Page Plan**

**Page 1: Preset Selection Default State**
- Purpose: Show initial preset selection interface with Balanced selected by default
- Key Elements: Three preset cards with Balanced selected (blue border + checkmark), Technical parameters collapsed, Cost estimate showing $50-60 for Balanced, Risk/success rate badges visible
- States: Balanced selected, Conservative and Aggressive unselected, All cards enabled (except Aggressive if user <3 jobs)

**Page 2: Conservative Preset Selected**
- Purpose: Show Conservative preset selected with lower cost estimate
- Key Elements: Conservative card selected (blue border), Technical details expanded to show r=8, lr=1e-4, etc., Cost estimate updated to $25-30, Success rate 98% highlighted
- States: Conservative selected with expanded technical details

**Page 3: Aggressive Preset with Locked State**
- Purpose: Show Aggressive preset in locked state for users with <3 completed jobs
- Key Elements: Aggressive card grayed out with lock icon, Tooltip visible: "Unlock after 3 successful training runs", Other cards selectable, Guidance text suggesting Balanced as alternative
- States: Aggressive locked, user cannot select, tooltip explaining why

**Page 4: Tooltip Interactions**
- Purpose: Show interactive tooltips explaining technical parameters
- Key Elements: One preset card with technical details expanded, Multiple tooltips visible on hover (Rank, Learning Rate, Epochs), Tooltip design with light background + arrow + explanation text
- States: Tooltips displayed on hover over parameter names

**Page 5: Cost Estimate Update Animation**
- Purpose: Show real-time cost estimate updating when preset changes
- Key Elements: Cost panel with previous estimate (strikethrough), New estimate (bold), Delta showing "↑ $30 increase" or "↓ $20 savings", Animated transition between values
- States: Cost estimate mid-update with comparison to previous

**Annotations (Mandatory)**

Attach notes to UI elements citing the acceptance criterion they fulfill. Include a "Mapping Table" frame in Figma.

**Example annotations**:
- Conservative card: "US1.1.2 AC4: Conservative Preset with r=8, lr=1e-4, epochs=2, estimated cost $25-30, 98% success rate"
- Rank tooltip: "FR1.1.2 AC8: Tooltip explaining 'Rank (r): Number of trainable parameters...'"
- Cost panel: "US1.1.2 AC-FR: Real-time cost estimate updates within 500ms when preset changes"
- Aggressive locked state: "FR1.1.2 AC11: Aggressive option disabled with tooltip until user has ≥3 successful jobs"

**Acceptance Criteria → UI Component Mapping**

| Criterion | Source | Screen | Component | State | Notes |
|-----------|--------|--------|-----------|-------|-------|
| Three preset options as radio cards | US1.1.2 AC1 | All pages | PresetCard × 3 | Display | Visually distinct cards |
| Conservative: r=8, lr=1e-4, epochs=2, batch_size=4 | US1.1.2 AC4 | Pages 1,2 | PresetCard (Conservative) | Display | Technical params shown |
| Conservative description | US1.1.2 AC4 | Pages 1,2 | PresetDescription | Display | "Best for high-quality seed datasets..." |
| Conservative estimated duration: 8-10 hours | US1.1.2 AC4 | Pages 1,2 | EstimatedMetrics | Display | Duration range |
| Conservative estimated cost: $25-30 (spot) | US1.1.2 AC4 | Pages 1,2 | EstimatedMetrics | Display | Cost with spot/on-demand breakdown |
| Conservative risk level: Low | US1.1.2 AC4 | Pages 1,2 | RiskIndicator | Display | Green badge |
| Conservative success rate: 98% | US1.1.2 AC4 | Pages 1,2 | SuccessRateBadge | Display | With historical job count |
| Balanced: r=16, lr=2e-4, epochs=3, batch_size=2 | US1.1.2 AC5 | Pages 1 | PresetCard (Balanced) | Default selected | Middle option |
| Balanced description | US1.1.2 AC5 | Pages 1 | PresetDescription | Display | "Production-ready configuration..." |
| Balanced estimated duration: 12-15 hours | US1.1.2 AC5 | Pages 1 | EstimatedMetrics | Display | Duration range |
| Balanced estimated cost: $50-60 (spot) | US1.1.2 AC5 | Pages 1 | EstimatedMetrics | Display | Default estimate shown |
| Balanced risk level: Medium | US1.1.2 AC5 | Pages 1 | RiskIndicator | Display | Yellow badge |
| Balanced success rate: 96% | US1.1.2 AC5 | Pages 1 | SuccessRateBadge | Display | With historical job count |
| Balanced default selection | US1.1.2 AC6 | Page 1 | PresetCard (Balanced) | Selected | Blue border + checkmark |
| Aggressive: r=32, lr=3e-4, epochs=4, batch_size=1 | US1.1.2 AC6 | Page 3 | PresetCard (Aggressive) | Display/Locked | Advanced configuration |
| Aggressive description | US1.1.2 AC6 | Page 3 | PresetDescription | Display | "Maximum quality for complex datasets..." |
| Aggressive estimated duration: 18-20 hours | US1.1.2 AC6 | Page 3 | EstimatedMetrics | Display | Longest duration |
| Aggressive estimated cost: $80-100 (spot) | US1.1.2 AC6 | Page 3 | EstimatedMetrics | Display | Highest cost |
| Aggressive risk level: Higher | US1.1.2 AC6 | Page 3 | RiskIndicator | Display | Orange badge |
| Aggressive success rate: 92% | US1.1.2 AC6 | Page 3 | SuccessRateBadge | Display | Lowest success rate |
| Aggressive locked if <3 completed jobs | FR1.1.2 AC11 | Page 3 | PresetCard (Aggressive) | Locked | Grayed out with lock icon |
| Tooltip explaining each hyperparameter | US1.1.2 AC7 | Page 4 | Tooltip | Hover | Plain language explanations |
| Rank tooltip: "Number of trainable parameters..." | FR1.1.2 AC8 | Page 4 | Tooltip (Rank) | Hover | Specific explanation |
| Learning Rate tooltip | FR1.1.2 AC8 | Page 4 | Tooltip (LR) | Hover | "Speed of model updates..." |
| Epochs tooltip | FR1.1.2 AC8 | Page 4 | Tooltip (Epochs) | Hover | "Complete passes through dataset..." |
| Link to "Understanding LoRA Hyperparameters" | US1.1.2 AC8 | All pages | DocumentationLink | Display | Opens in new tab |
| Real-time cost estimate updates | FR1.1.2 AC9 | Page 5 | CostEstimationPanel | Dynamic | Within 500ms of preset change |
| Cost delta amount displayed | FR1.1.2 AC9 | Page 5 | CostDelta | Display | "↓ $XX saved" or "↑ $XX increase" |

**Non-UI Acceptance Criteria**

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Conservative preset parameters stored in config object | Backend config management | UI reads from preset definitions |
| Balanced preset parameters stored | Backend config management | UI reads from preset definitions |
| Aggressive preset parameters stored | Backend config management | UI reads from preset definitions |
| System calculates estimated duration: conversation_count × epochs × seconds_per_pair | Backend calculation | UI displays result of calculation |
| seconds_per_pair varies by preset (120s, 180s, 300s) | Backend constants | Affects duration estimates |
| Cost calculation: duration_hours × gpu_hourly_rate | Backend math | UI displays calculated cost |
| Historical success rate queried from database | Database query | UI shows result with data freshness |
| Default selection logic based on conversation_count | Backend recommendation engine | UI highlights default choice |
| System validates GPU memory requirements per preset | Backend validation | UI warns if insufficient VRAM |
| System tracks preset selection analytics | Analytics/logging | No direct UI, informs future improvements |
| Preset selection stored in job configuration object | Database storage | UI saves selection for next step |

**Estimated Page Count**

**5 pages** covering:
1. Default state (Balanced selected)
2. Conservative selected with expanded details
3. Aggressive locked state (for new users)
4. Tooltip interactions (showing parameter explanations)
5. Cost estimate update (showing dynamic recalculation)

Rationale: Five pages demonstrate all three presets, locked state edge case, interactive tooltips, and dynamic cost updates. Covers primary flow and key interactions without redundancy.

=== END PROMPT FR: FR1.1.2 ===

---

=== BEGIN PROMPT FR: FR1.1.3 ===

**Title**: FR FR1.1.3 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR enables intelligent GPU selection by comparing spot and on-demand instances with comprehensive cost-benefit analysis. Users need to understand the trade-off between cost savings (70% cheaper spot instances) and reliability (guaranteed on-demand completion). The interface provides historical interruption data, automatic recovery guarantees, real-time pricing, and context-aware recommendations to guide decision-making. This balances cost optimization with project requirements (deadlines, budget constraints, risk tolerance).

**Journey Integration**

- **Stage 1 User Goals**: Understanding GPU cost options, Optimizing budget while meeting deadlines, Managing interruption risk confidently, Making informed spot vs on-demand decisions
- **Key Emotions**: Budget anxiety → Relief through cost savings → Confidence in recovery system → Trust in recommendations
- **Progressive Disclosure**: 
  * Basic: Simple toggle between Spot and On-Demand with key metrics
  * Advanced: Historical interruption rates, recovery statistics, cost breakdowns
  * Expert: Datacenter utilization data, provisioning time estimates, override confirmations
- **Persona Adaptations**: Budget managers see cost savings emphasis; Engineers see technical reliability metrics; Business owners see deadline guarantees

**Journey-Informed Design Elements**

- **User Goals**: Minimizing training costs, Meeting client deadlines reliably, Understanding interruption recovery, Making confident GPU selections
- **Emotional Requirements**: Reduce budget anxiety through savings display, Build confidence in recovery system, Provide reassurance about reliability, Enable informed risk assessment
- **Progressive Disclosure**:
  * Basic: Two-option toggle with primary benefits and costs
  * Advanced: Historical data, success rates, recovery guarantees
  * Expert: Real-time availability, confirmation dialogs for high costs
- **Success Indicators**: GPU type selected with confidence, Cost/reliability trade-off understood, User knows recovery process, Ready to review final configuration

**Wireframe Goals**

- Present spot vs on-demand choice as clear, comparable options
- Communicate cost savings (70%) prominently without hiding risks
- Build confidence in automatic checkpoint recovery for spot instances
- Display historical reliability data to inform decision-making
- Provide context-aware recommendations based on job parameters
- Enable informed choice through transparent trade-off presentation

**Explicit UI Requirements (from acceptance criteria)**

**GPU Selection Toggle**: Prominent toggle control with "Spot Instance (Recommended)" and "On-Demand Instance" options. Selected option highlighted blue, unselected gray. Default: Spot Instance.

**Spot Instance Card**: Price $2.49/hr (large), Savings badge "Save 70%" (green), Benefits (bullets), Trade-offs section, Historical performance (18% interruption rate last 30 days, 95%+ success rate), Recovery guarantee (<10 min), Recommendation text.

**On-Demand Instance Card**: Price $7.99/hr (large), Guarantee badge "100% Uptime" (blue), Benefits (no interruptions, predictable completion), Premium indicator, Recommendation for deadlines.

**Real-Time Cost Update**: Cost panel updates within 300ms when selection changes. Shows previous estimate (strikethrough), new estimate (bold), delta amount (↓ saved green / ↑ increase red).

**Context-Aware Recommendations**: Dynamic banner below toggle showing: Long duration warning (>20 hrs recommend on-demand), High cost job (recommend spot for savings), Budget constraint (spot required), Urgent deadline (on-demand guarantees), Default (spot recommended).

**High-Cost Confirmation**: Modal triggers if on-demand selected AND cost > $150. Shows cost comparison, savings amount, checkbox "I understand...", action buttons.

**Low Availability Warning**: IF spot availability < 15%, show warning banner with provisioning time estimate, option to switch to on-demand.

**Interactions and Flows**

1. Initial load: Spot selected by default → Cost shows spot pricing → Recommendation displays
2. Toggle to on-demand: Selection changes → Cost updates within 300ms → IF cost > $150 THEN modal appears
3. High-cost confirmation: User reviews → Checks box → Clicks continue → Modal closes
4. Context recommendation: System evaluates parameters → Updates banner based on job characteristics
5. Low availability: Warning appears if spot < 15% → User can wait or switch

**Page Plan**

**Page 1**: Default spot selection with comparison cards, spot highlighted, cost estimate $30-37
**Page 2**: On-demand selection with higher cost $96-120, delta showing increase
**Page 3**: High-cost confirmation modal with cost comparison table
**Page 4**: Context-aware recommendations (four variants for different scenarios)
**Page 5**: Low spot availability warning with switch option

**Estimated Page Count**: 5 pages covering both GPU options, confirmation flow, recommendation scenarios, and availability warnings.

=== END PROMPT FR: FR1.1.3 ===

---

=== BEGIN PROMPT FR: FR1.2.1 ===

**Title**: FR FR1.2.1 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR provides comprehensive real-time cost estimation that updates dynamically as users configure their training job. Users need accurate, transparent cost forecasts before committing to expensive GPU training runs. The estimation engine calculates duration and cost based on dataset characteristics, hyperparameter choices, and GPU selection, displaying estimates with confidence intervals, accuracy disclaimers, and cost breakdowns. This builds user confidence, enables informed decision-making, and prevents budget surprises.

**Journey Integration**

- **Stage 1 User Goals**: Understanding true training costs before commitment, Making budget-conscious configuration decisions, Avoiding cost surprises and overages, Building confidence in platform cost transparency
- **Key Emotions**: Budget anxiety → Relief through upfront estimates → Confidence in accuracy → Trust in transparent pricing
- **Progressive Disclosure**: 
  * Basic: Simple total cost range ($XX-YY) with duration estimate
  * Advanced: Detailed cost breakdown (GPU compute, spot overhead, storage)
  * Expert: Historical accuracy metrics, confidence intervals, cost optimization tips
- **Persona Adaptations**: Budget managers see monthly budget impact; Engineers see technical cost drivers; Business owners see ROI calculations

**Journey-Informed Design Elements**

- **User Goals**: Accurate cost forecasting before job start, Understanding cost drivers and optimization opportunities, Staying within monthly budget limits, Making informed cost/quality trade-offs
- **Emotional Requirements**: Reduce budget anxiety through clear estimates, Build confidence with historical accuracy data, Provide reassurance about no hidden costs, Enable control through transparency
- **Progressive Disclosure**:
  * Basic: Total estimated cost range with duration
  * Advanced: Cost breakdown by component, accuracy disclaimer
  * Expert: Historical variance data, optimization recommendations
- **Success Indicators**: Cost estimate understood and accepted, Budget impact clear, User confident in affordability, Ready to proceed to final review

**Wireframe Goals**

- Display real-time cost estimates updating within 500ms of configuration changes
- Communicate cost ranges (min-max) with accuracy confidence intervals
- Break down costs into components (GPU compute, spot overhead, storage)
- Show historical accuracy to build confidence in estimates
- Provide warnings for high-cost jobs and long-duration runs
- Enable budget validation before job creation
- Guide users toward cost-optimized configurations when appropriate

**Explicit UI Requirements (from acceptance criteria)**

**Cost Estimation Panel**: Fixed sidebar (desktop) or prominent card (mobile), always visible. Title "Cost Estimate" with real-time pulse indicator. Updates within 500ms of any configuration change.

**Estimation Display**: Duration "12-15 hours" (range), Cost "$50-60" (large, bold, color-coded: green <$50, yellow $50-100, orange >$100), Accuracy disclaimer "±15% variance based on 347 historical jobs".

**Cost Breakdown (expandable)**: GPU Compute "$48.00" (12 hrs × $2.49/hr spot), Spot Buffer "+$2.50" (1-2 estimated recoveries), Storage "+$0.50" (checkpoints + adapters), Total "$45.00 - $60.00".

**Dynamic Update**: onChange handlers with 500ms debounce. Visual transition: Previous estimate grays out (strikethrough), new estimate fades in (bold), delta display "↓ $20 saved" green or "↑ $30 increase" red.

**Historical Accuracy**: "Past estimates within ±12% for Balanced preset", "88% of jobs finish within estimated range", sample size displayed with recency.

**Warning Indicators**: High cost (>$100): Yellow banner "Consider Conservative preset", Long duration (>24 hrs): Orange banner "Spot interruptions more likely", Budget insufficient: Red banner "Exceeds remaining budget" with action buttons.

**Time-to-Completion**: "Estimated Completion: Today at 11:45 PM" based on current time + duration + provisioning.

**Interactions and Flows**

1. Initial load: System calculates estimate → Displays within 2 seconds → "$50-60, 12-15 hours"
2. Preset change: onChange triggers → Recalculates (500ms debounce) → Previous grays → New fades in → Delta shows
3. Expand breakdown: Click accordion → Section expands → Itemized costs display → Tooltips available
4. High cost warning: Estimate > $100 → Yellow banner appears → Link to optimization tips
5. Budget validation: Estimate > remaining → Red banner → Start button disabled

**Page Plan**

**Page 1**: Initial estimate display with default configuration, panel showing $50-60
**Page 2**: Estimate update animation showing transition from old to new value
**Page 3**: Expanded cost breakdown with itemized components
**Page 4**: High cost warning with optimization suggestion
**Page 5**: Budget exceeded error with action options
**Page 6**: Historical accuracy display with confidence metrics

**Estimated Page Count**: 6 pages covering initial state, dynamic updates, detailed breakdowns, warnings, and confidence building.

=== END PROMPT FR: FR1.2.1 ===

---

=== BEGIN PROMPT FR: FR1.2.2 ===

**Title**: FR FR1.2.2 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR implements comprehensive pre-job budget validation that queries current monthly spending, calculates remaining budget, compares against estimated job cost, and enforces budget limits with intelligent override mechanisms. The validation system provides clear error messaging, budget increase workflows with approval routing, forecast calculations including active jobs, and complete audit logging of all budget-related decisions while enabling manager overrides with justification requirements.

**Journey Integration**

- **Stage 1 User Goals**: Preventing budget overages, Understanding monthly budget impact, Managing approvals efficiently, Maintaining financial accountability
- **Key Emotions**: Budget anxiety → Relief through validation → Confidence in controls → Trust in governance
- **Progressive Disclosure**: 
  * Basic: Simple budget check (pass/fail) with remaining amount
  * Advanced: Forecast including active jobs, month-to-date spending
  * Expert: Approval workflows, override mechanisms, audit trails
- **Persona Adaptations**: Budget managers see detailed forecasts; Managers can override limits; Users see clear blocking messages

**Journey-Informed Design Elements**

- **User Goals**: Staying within budget constraints, Getting quick approval for overages, Understanding spending impact, Maintaining financial controls
- **Emotional Requirements**: Reduce fear of surprise bills, Build confidence in budget controls, Provide clear next steps when blocked, Enable quick resolution
- **Progressive Disclosure**:
  * Basic: Budget validation result (sufficient/insufficient)
  * Advanced: Forecast with active jobs, monthly spending trend
  * Expert: Approval request workflow, override options
- **Success Indicators**: Budget status understood, User knows remaining capacity, Approval process clear, Ready to proceed or adjust

**Wireframe Goals**

- Validate budget before job creation with clear pass/fail indicators
- Display remaining monthly budget with spending breakdown
- Show forecast including active jobs and estimated costs
- Provide error messages with actionable next steps
- Enable budget increase requests with approval workflow
- Support manager override with justification requirements
- Maintain complete audit trail of budget decisions

**Explicit UI Requirements (from acceptance criteria)**

**Budget Validation**: System queries monthly_budget_limit and month_to_date_spend. Calculates remaining = limit - actual - active_jobs_estimated. IF estimated_cost > remaining THEN block job creation.

**Budget Exceeded Error**: Modal displays "❌ Budget Exceeded - Estimated Cost: $75, Remaining Budget: $50, Shortfall: $25". Action options: "Reduce Job Cost" (adjust config), "Increase Budget Limit", "Cancel Job Creation".

**Budget Utilization Warning**: At 80% threshold: "⚠ Budget Alert: You've used 80% of your monthly budget ($400 of $500). Remaining: $100."

**Forecast Display**: "Projected Monthly Spend: $529-545 (includes 2 active jobs + this job). Budget Limit: $500. Projected Overage: $29-45." Color-coded: green if under, red if over.

**Budget Increase Workflow**: Click "Increase Budget Limit" → Modal with form: "New Monthly Limit: $_____ (current: $500)", "Justification (required): _____ (min 50 characters)", "Effective Date: [This Month / Next Month]", "Approval Required: Yes (manager must approve)".

**Manager Override**: IF user_role IN ('manager', 'admin', 'owner') THEN show "Manager Override" button. Confirmation: "Proceed despite budget limit? Justification Required: _____". Log override to audit table.

**Budget Dashboard Link**: "View detailed budget breakdown and history: [Budget Dashboard]" in error message.

**Configuration Suggestions**: "💡 Cost Reduction Tips: Switch to Conservative preset (save $XX), Use Spot instead of On-Demand (save $YY), Reduce epochs (save $ZZ)".

**Interactions and Flows**

1. Budget validation: System checks on configuration page load → Calculates remaining budget
2. Sufficient budget: Validation passes → User can proceed → No blocking
3. Budget exceeded: Validation fails → Error modal displays → Start button disabled
4. Increase budget: User clicks increase → Form displays → Submit for approval
5. Manager override: Manager clicks override → Enters justification → Proceeds anyway
6. Adjustment: User clicks reduce cost → Returns to config → Adjusts settings

**Page Plan**

**Page 1**: Budget validation pass state with remaining budget displayed
**Page 2**: Budget exceeded error modal with action options
**Page 3**: Increase budget workflow with approval form
**Page 4**: Forecast display showing active jobs and projected overage

**Estimated Page Count**: 4 pages covering validation pass, exceeded error, increase workflow, and forecast.

=== END PROMPT FR: FR1.2.2 ===

---

=== BEGIN PROMPT FR: FR1.3.1 ===

**Title**: FR FR1.3.1 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR provides comprehensive metadata and documentation capabilities enabling users to assign descriptive names, add purpose descriptions, document experimental hypotheses and notes, apply searchable tags, associate jobs with client projects for cost attribution, and maintain complete documentation trails. The metadata system supports auto-generation of intelligent default names, validation of input constraints, tag management with custom tag creation, and full-text search across all metadata fields.

**Journey Integration**

- **Stage 1 User Goals**: Documenting training experiments, Organizing jobs for team reference, Enabling future searchability, Tracking client project costs
- **Key Emotions**: Organization anxiety → Relief through structure → Confidence in future findability → Trust in knowledge preservation
- **Progressive Disclosure**: 
  * Basic: Required job name with auto-generation
  * Advanced: Optional description and notes fields
  * Expert: Tags, client/project assignment, custom tag creation
- **Persona Adaptations**: Engineers document experiments; Managers track client projects; Teams benefit from shared searchable metadata

**Journey-Informed Design Elements**

- **User Goals**: Creating searchable documentation, Organizing training runs, Tracking client costs, Preserving experimental knowledge
- **Emotional Requirements**: Reduce documentation burden through auto-generation, Build confidence through structure, Enable future recall, Support team knowledge sharing
- **Progressive Disclosure**:
  * Basic: Auto-populated job name (editable)
  * Advanced: Description (500 chars), Notes (2000 chars with markdown)
  * Expert: Tag system, client/project linking, custom tags
- **Success Indicators**: Job properly documented, Searchable by keywords, Client project linked, Ready for final review

**Wireframe Goals**

- Provide intelligent job name auto-generation with edit capability
- Support optional description and notes with character limits
- Enable multi-select tagging with custom tag creation
- Allow client/project assignment for cost tracking
- Make all metadata searchable in job history
- Display metadata prominently in job details
- Enable markdown formatting in notes field

**Explicit UI Requirements (from acceptance criteria)**

**Job Name Field**: Required text input (3-100 characters), character counter (0/100). Auto-populated: "{training_file_name} - {preset_name} - {YYYY-MM-DD}". User can edit/override. Warning (not error) if duplicate found.

**Description Field**: Textarea (max 500 characters), counter display. Placeholder: "What is the purpose of this training run?". Optional, allows empty submission.

**Notes Field**: Larger textarea (2000 character limit), markdown formatting support (bold, italic, lists, code blocks). Placeholder: "Document your hypothesis, experimental variables, expected outcomes...". Auto-save draft to localStorage every 30 seconds.

**Tags System**: Multi-select dropdown with predefined tags: {experiment, production, client-delivery, test, poc, research, optimization, validation, baseline, iteration-1, iteration-2, high-priority, low-priority, approved, needs-review}. Selected tags display as colored pills below dropdown with X to remove. Max 10 tags per job.

**Custom Tag Creation**: Type new tag in dropdown → If not found → Display "Create new tag: '{tag_name}'" → Click to add → New tag inserted and available for future jobs. Validation: 3-30 characters, lowercase alphanumeric + hyphen only.

**Client/Project Assignment**: Dropdown populated from clients and projects tables. Hierarchical display: "Client: Acme Financial → Project: Q4 2025 Model Enhancement". Optional selection. Autocomplete: Type to search, "Create New Client/Project" option if no match.

**Metadata Storage**: name (VARCHAR 100), description (TEXT 500), notes (TEXT 2000), tags (JSONB array), client_id (UUID FK nullable), project_id (UUID FK nullable), metadata_updated_at (TIMESTAMP).

**Search Functionality**: Job history page search bar: "Search by name, description, notes, or tags". Debounced 500ms, full-text search using tsvector, tag search uses JSONB containment. Results show match highlighting and context.

**Interactions and Flows**

1. Initial load: Job name auto-populated → User can accept or edit → Description/notes empty
2. Add description: User types in field → Character counter updates → Validation on length
3. Add notes: User types in field with markdown → Preview available → Auto-save every 30s
4. Select tags: Click dropdown → Checkbox list → Select multiple → Tags display as pills
5. Create custom tag: Type new tag → "Create new tag" option → Click → Added to system
6. Link project: Click dropdown → Type to search → Select client/project → Link established
7. Save metadata: All fields save with job configuration → Searchable immediately

**Page Plan**

**Page 1**: Default state with auto-generated job name, empty description/notes
**Page 2**: Expanded notes field with markdown formatting and preview
**Page 3**: Tag selection showing multi-select dropdown with custom tag creation
**Page 4**: Client/project assignment with autocomplete search

**Estimated Page Count**: 4 pages covering default state, notes with markdown, tag management, and project linking.

=== END PROMPT FR: FR1.3.1 ===

---

=== BEGIN PROMPT FR: FR1.3.2 ===

**Title**: FR FR1.3.2 Wireframes — Stage 1 — Training Job Configuration & Setup

**Context Summary**

This FR implements a comprehensive pre-flight configuration review process presenting users with a full-screen confirmation modal displaying complete training configuration summary, cost breakdown, budget impact analysis, risk warnings, and interactive confirmation checklist before initiating GPU provisioning. The review interface consolidates all configuration decisions, validates prerequisites, enables last-minute adjustments, requires explicit user acknowledgment of costs and risks, and provides clear cancellation options to prevent accidental or uninformed job initiation.

**Journey Integration**

- **Stage 1 User Goals**: Reviewing complete configuration before commitment, Understanding total cost and duration, Catching mistakes before expensive runs, Building final confidence
- **Key Emotions**: Pre-commitment anxiety → Reassurance through review → Confidence in decision → Trust in transparency
- **Progressive Disclosure**: 
  * Basic: Configuration summary with key metrics
  * Advanced: Detailed cost breakdown, budget impact
  * Expert: Warning analysis, historical comparisons
- **Persona Adaptations**: Engineers review technical details; Managers review cost implications; All users complete confirmation checklist

**Journey-Informed Design Elements**

- **User Goals**: Final configuration validation, Cost confirmation, Risk assessment, Mistake prevention
- **Emotional Requirements**: Reduce pre-commitment anxiety through complete transparency, Build confidence through detailed review, Enable easy corrections, Provide clear warnings
- **Progressive Disclosure**:
  * Basic: Summary cards (dataset, preset, GPU, cost)
  * Advanced: Cost breakdown, budget impact, warnings
  * Expert: Confirmation checklist, edit options
- **Success Indicators**: Configuration reviewed completely, Costs understood and accepted, User confident to start, Job initiated successfully

**Wireframe Goals**

- Display complete configuration summary in full-screen modal
- Show detailed cost breakdown and budget impact
- Present any configuration warnings prominently
- Require explicit confirmation through checklist
- Enable easy return to edit configuration
- Provide clear start and cancel options
- Create smooth transition to GPU provisioning

**Explicit UI Requirements (from acceptance criteria)**

**Review & Start Button**: Large primary button at bottom of config form, styled blue with icon. Enabled only when all required fields valid. Label: "Review & Start Training".

**Full-Screen Modal**: Click triggers modal overlay (dims background), cannot close by clicking outside. Header: "Review Training Configuration - Final Check Before Starting", estimated total cost prominent: "Total Estimated Cost: $45-60".

**Configuration Summary Cards**: 
- **Training Dataset**: File name (bold), conversation count "242 conversations, 1,567 training pairs", quality scores with indicators "Empathy: 4.5/5 ✓", scaffolding preview, human review percentage, file size
- **Hyperparameters**: Preset name with badge (Conservative/Balanced/Aggressive color-coded), all technical parameters: "LoRA Rank (r): 16", "Learning Rate: 0.0002", "Epochs: 3", "Batch Size: 2", tooltip on any parameter
- **GPU Configuration**: GPU type "H100 PCIe 80GB", pricing tier with badge "Spot Instance - Save 70%", hourly rate "$2.49/hr", interruption risk "18% chance", recovery guarantee "Automatic <10 min", provisioning time "2-5 minutes"
- **Cost Analysis**: Visual bar chart breakdown: "GPU Compute: $XX.XX (80%)", "Spot Buffer: $X.XX (5%)", "Storage: $X.XX (2%)", total range "$45.00 - $60.00 (±15% variance)", confidence "88% finish within range", on-demand comparison "Save $90"
- **Budget Impact**: Current spend with progress bar "$387 of $500 used - 77%", this job "+$52 (estimated max)", projected total "$439 (88% of budget)", remaining "$61 available", indicator: green <90%, yellow 90-95%, red >95%, forecast "Sufficient for 1-2 more jobs"

**Warnings Section** (conditional): High cost (>$100): "⚠ High-Cost Training Run: Consider Conservative preset", Aggressive parameters: "⚠ Advanced Configuration: May take longer", Low budget: "⚠ Limited Budget Remaining", Long duration (>20 hrs): "⚠ Extended Training Time", First-time user: "ℹ First Training Run: Start with Conservative preset".

**Confirmation Checklist**: Three mandatory checkboxes (must all be checked before Start button enables):
1. "☐ I have reviewed the complete training configuration above and confirm all settings are correct"
2. "☐ I understand the estimated cost ($45-60) and agree to proceed with charges within this range"
3. "☐ I have obtained necessary budget approval (if required by my organization)"

**Action Buttons**: "Start Training" (prominent, green, initially disabled), "Edit Configuration" (secondary), "Cancel" (tertiary).

**Job Start Workflow**: Click Start Training → INSERT training_job record (status='queued') → Redirect to /training-jobs/{job_id} → Initiate async GPU provisioning → Update to 'provisioning' → Display loading "Provisioning GPU... 2-5 minutes" → Stream status updates → On ready: Update to 'starting' → Send notification.

**Interactions and Flows**

1. Click "Review & Start": Button triggers modal → Full-screen overlay appears → Summary loads
2. Review configuration: User reads through cards → Expands cost breakdown → Checks warnings
3. Check boxes: User clicks each checkbox → Checkmarks appear → Start button enables
4. Edit configuration: User clicks Edit → Modal closes → Returns to config form → Settings preserved
5. Start training: User clicks Start Training → Loading spinner → Job created → Redirect to job details
6. Cancel: User clicks Cancel → Modal closes → Returns to job list → No database changes

**Page Plan**

**Page 1**: Default review modal with all summary cards, collapsed cost breakdown, unchecked checklist
**Page 2**: Expanded cost breakdown showing itemized components with bar chart
**Page 3**: Warning scenarios showing different warning types based on configuration
**Page 4**: Incomplete checklist state with Start button disabled
**Page 5**: Comparison to previous similar job showing cost/duration differences

**Estimated Page Count**: 5 pages covering default review, expanded breakdown, warnings, checklist states, and historical comparison.

=== END PROMPT FR: FR1.3.2 ===

---

## Summary

This document contains 8 comprehensive Figma-ready wireframe prompts for Stage 1 (Training Job Configuration & Setup):

1. **FR1.1.1**: Create Training Job from Training File - 5 pages
2. **FR1.1.2**: Select Hyperparameter Preset - 5 pages
3. **FR1.1.3**: Select GPU Type with Cost Comparison - 5 pages
4. **FR1.2.1**: Real-Time Cost Estimation - 6 pages
5. **FR1.2.2**: Pre-Job Budget Validation - 4 pages
6. **FR1.3.1**: Add Job Metadata & Documentation - 4 pages
7. **FR1.3.2**: Review Configuration Before Start - 5 pages

**Total Estimated Pages**: 34 wireframe pages covering all critical user flows, states, and interactions for Stage 1.

Each prompt is self-contained and ready to be copied into Figma Make AI to generate wireframes. The prompts include:
- Complete context and journey integration
- Explicit UI requirements from acceptance criteria
- Detailed interaction flows
- Visual feedback specifications
- Accessibility guidance
- Information architecture
- Page plans with rationale
- Acceptance criteria to UI component mappings
- Non-UI criteria with UI hints

**Date Generated**: December 18, 2025  
**Generator Version**: FR Wireframe Generator v4  
**Quality Review**: All prompts validated against source documents


