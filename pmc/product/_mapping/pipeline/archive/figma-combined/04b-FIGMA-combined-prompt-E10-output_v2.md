# LoRA Pipeline - Stage 10 Combined Figma Wireframe Prompt
**Version:** 2.0  
**Date:** January 8, 2026  
**Stage:** Stage 10 — Training Results Dashboard (Lay-Person Accessible)  
**Section ID:** E10_v2  
**Optimization:** Proof-of-Concept (POC) - Comprehensive results with lay-person terminology

**Builds Upon:** 
- [E08_v2](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/pipeline/figma-combined/04b-FIGMA-combined-prompt-E08-output_v2.md) — Training Configuration
- [E09_v2](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/pipeline/figma-combined/04b-FIGMA-combined-prompt-E09-output_v2.md) — Training Progress

**Based On:**
- Definitive Specification: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\LoRA-training-lay-person-interface-changes_v3.md
- Original: 04b-FIGMA-combined-prompt-E10-output.md

**Key Changes from E10 v1:**
- References E08_v2 and E09_v2 components by exact same IDs
- NEW "Training Quality Evaluation" section for post-training metrics
- Specialized metrics (Emotional Arc Fidelity, Empathy Score) displayed as OUTCOMES
- Traceability uses lay-person terminology (Training Sensitivity, not Learning Rate)
- Removed Rank/Alpha/Dropout from traceability display

---

## Prompt for Figma Make AI

**Title:** Stage 10 — Training Results Dashboard (Lay-Person Accessible) - Complete Integrated Wireframe System

> **⚠️ IMPORTANT:** This wireframe builds upon E08_v2 (configuration) and E09_v2 (progress monitoring). All component IDs and terminology must match those documents exactly.

**Context Summary**

This stage provides a comprehensive results dashboard after training completes. Users can view summary metrics, analyze training loss progression, access trained model files, and critically — see the **Training Quality Evaluation** results that were automatically computed post-training. The specialized evaluation metrics (like Emotional Arc Fidelity and Empathy Score) appear HERE, not during configuration or training, because they can only be computed after training completes. The interface prioritizes satisfaction through tangible results, confidence through measurable outcomes, and trust through complete traceability using consistent lay-person terminology.

**Journey Integration**

- **Stage 10 User Goals:** 
  - Validate training success through objective metrics
  - View specialized evaluation results (Emotional Arc Fidelity, Empathy Score)
  - Understand what the training achieved in business terms
  - Access trained model files for deployment
  - Review full traceability with lay-person terminology
  - Generate stakeholder-ready reports

- **Key Emotions:** 
  - Relief (training completed) → Satisfaction (tangible results) → Confidence (quality metrics) → Pride (measurable improvements) → Trust (complete traceability)

- **Progressive Disclosure:** 
  - **Basic:** Summary cards, Training Quality Evaluation, download adapters
  - **Advanced:** Detailed metrics tables, traceability panel, export options
  - **Expert:** (Reserved for future - comparative analysis, reproducibility packages)

**Wireframe Goals**

- Display training outcomes prominently (Final Loss, Training Time, Cost)
- **NEW: Training Quality Evaluation section with specialized post-training metrics**
- Show which engine features were active during training
- Provide complete traceability using lay-person terminology from E08_v2
- Enable model file downloads and result exports
- Use SAME component IDs and terminology as E08_v2 and E09_v2

**Explicit UI Requirements**

---

## SECTION 1: Page Layout & Navigation

**Page URL:** `/training/jobs/[jobId]/results`

**Accessibility:** 
- Available only for jobs with status='completed'
- Redirects to job detail page if job not completed

**Page Header:**
- Back button: Returns to job detail page
- Title: "Training Results" (H1, 32px, bold)
- Subtitle: "Job completed successfully" (gray, 14px)
- Timestamp: "Completed 2 hours ago" (gray, 14px)

**Header Actions (Right-aligned):**
- Button: "Export Results" (outline button, blue)
- Button: "View Training Job" (outline button, gray)

---

## SECTION 2: Summary Metrics Cards

**Section Title:** "Training Summary" (H2, 24px, semibold)

**Card Grid Layout:**
- Columns: 4 cards on desktop, 2 on tablet, 1 on mobile
- Gap: 20px between cards

### Card 1: Final Loss
- Icon: Chart line down (blue, 24px)
- Label: "Final Loss" (gray, 13px, uppercase)
- Value: "0.0892 nats" (32px, bold)
- Trend: "82% improvement from start" (green, 14px)

### Card 2: Training Time
- Icon: Clock (purple, 24px)
- Label: "Training Time" (gray, 13px, uppercase)
- Value: "4h 23m" (32px, bold)
- Comparison: "vs. estimated 4h 45m — Under estimate ✓" (green, 12px)

### Card 3: Total Cost
- Icon: Dollar sign (green, 24px)
- Label: "Total Cost" (gray, 13px, uppercase)
- Value: "$27.45" (32px, bold)
- Comparison: "vs. estimated $28.50 — Under budget ✓" (green, 12px)

### Card 4: Primary Evaluation Score
- Icon: Chart with checkmark (purple, 24px)
- Label: "Emotional Arc Fidelity" (gray, 13px, uppercase)
- Value: "87.2%" (32px, bold)
- Rating: "Excellent" (green badge)
- Note: This shows the PRIMARY specialized metric from the loaded engine

---

## SECTION 3: Training Quality Evaluation (NEW - Critical Section)

**Purpose:** Display the specialized post-training evaluation metrics that were automatically computed

**Component ID:** `training-quality-evaluation`

**Position:** Immediately after Summary Cards — HIGH VISIBILITY placement

**Card Container:**
- Background: White
- Border: 2px solid green (#10B981) — Highlights successful evaluation
- Border radius: 8px
- Padding: 24px
- Shadow: Slightly elevated

**Card Header:**
- Title: "Training Quality Evaluation" (semibold, 20px)
- Badge: "Completed" (green badge with checkmark)
- Subtitle: "Automatic post-training analysis based on the loaded engine" (gray, 14px)

**Content:**

### Results Table

| Metric | Score | Rating | Details |
|--------|-------|--------|---------|
| Emotional Arc Fidelity | 87.2% | Excellent (green) | [View Details] |
| Empathy Score | 79.1% | Good (blue) | [View Details] |

**Table Design:**
- Columns: Metric Name (40%) | Score (20%) | Rating (20%) | Actions (20%)
- Rows styled as cards with subtle borders
- Color-coded rating badges

### Metric Row Details:

**Emotional Arc Fidelity:**
- Name: "Emotional Arc Fidelity" (semibold, 16px)
- Description: "How well the model follows intended emotional progressions" (gray, 13px)
- Score: "87.2%" (bold, 20px)
- Rating Badge: "Excellent" (green background, white text)
- Help icon: Opens methodology modal
- "View Details" link: Opens full metric analysis

**Empathy Score:**
- Name: "Empathy Score" (semibold, 16px)
- Description: "Quality of empathetic language in model responses" (gray, 13px)
- Score: "79.1%" (bold, 20px)
- Rating Badge: "Good" (blue background, white text)
- Help icon: Opens methodology modal
- "View Details" link: Opens full metric analysis

**Rating Thresholds (shown in tooltip):**
- Excellent: ≥85%
- Good: 70-84%
- Fair: 50-69%
- Poor: <50%

**Context Text:**
"These evaluations ran automatically after training completed. They measure how well the trained model performs on held-out test prompts, using specialized classifiers based on the Emotional Alignment training engine."

**Engine Attribution:**
"Evaluations determined by: **Emotional Alignment Engine**" (with info icon)
- References: `engine-features-panel` from E08_v2

---

## SECTION 4: Training Loss Chart

**Same as E10 v1 with these updates:**

**Section Title:** "Training Loss Over Time" (H2, 24px, semibold)

- Chart shows loss decreasing over epochs/steps
- Interactive with zoom and hover
- Export chart data option

**Chart Labels Use Lay-Person Terms Where Applicable:**
- X-axis can show "Training Repetition 1 of 3" instead of "Epoch 1"

---

## SECTION 5: Detailed Metrics Table

**Section Title:** "All Collected Metrics" (H2, 24px, semibold)
**Subtitle:** "Complete measurements from training and evaluation" (gray, 14px)

**Tab Navigation:**
- Tab 1: "Universal (5)" — Standard training metrics
- Tab 2: "Evaluation (2)" — Post-training specialized metrics

> **Note:** Tab label changed from "Specialized" to "Evaluation" for clarity

### Universal Metrics Tab Content:

**Metrics Displayed:**
1. **Final Training Loss**
   - Value: 0.0892 nats
   - Interpretation: "Excellent"

2. **Training Time**
   - Value: 4h 23m
   - Interpretation: "Within estimate"

3. **GPU Utilization (Average)**
   - Value: 94.5%
   - Interpretation: "Excellent efficiency"

4. **Memory Peak**
   - Value: 72.3 GB
   - Interpretation: "Good"

5. **Processing Speed (Average)**
   - Value: 1,285 tok/s
   - Interpretation: "Good throughput"

### Evaluation Metrics Tab Content:

**Header Text:**
"These metrics were computed automatically after training using the Emotional Alignment Engine's evaluation protocols."

**Metrics Displayed:**
1. **Emotional Arc Fidelity**
   - Value: 0.872 (87.2%)
   - Interpretation: "Excellent"
   - Methodology link: [View How This Was Measured]

2. **Empathy Score**
   - Value: 0.791 (79.1%)
   - Interpretation: "Good"
   - Methodology link: [View How This Was Measured]

---

## SECTION 6: Evaluation Metric Detail Modal

**Trigger:** Click "View Details" on any evaluation metric

**Modal Design:**
- Width: 800px
- Overlay: Semi-transparent

**Modal Content:**

### Header
- Metric name: "Emotional Arc Fidelity" (H2, 28px)
- Badge: "Post-Training Evaluation" (purple)

### Section 1: Your Result
- Large value display: "87.2%" (48px, bold)
- Rating: "Excellent" (green badge)
- Context: "This result places your model in the top 20% for emotional alignment training"

### Section 2: What This Measures
"Emotional Arc Fidelity measures how well your trained model follows the intended emotional progression defined in your training data. When faced with test scenarios, does the model guide conversations from initial emotional states to target resolutions?"

### Section 3: How It Was Measured
1. After training completed, the model was given 50 test prompts with known emotional arcs
2. Model responses were analyzed by an emotional state classifier
3. Predicted emotional progressions were compared to expected journeys
4. Fidelity score = match rate (0% to 100%)

### Section 4: Score Interpretation
- Visual range bar showing score position
- 85-100%: "Excellent — Model reliably follows emotional arcs"
- 70-84%: "Good — Model usually follows arcs with minor deviations"
- 50-69%: "Fair — Model needs improvement in emotional consistency"
- Below 50%: "Poor — Consider retraining with different parameters"

### Section 5: Related to Your Configuration
- "Training Sensitivity: Medium (Balanced)"
- "Training Progression: Medium (Balanced)"
- "Training Repetition: 3 (Standard)"
- References: `training-sensitivity-control`, `training-progression-control`, `training-repetition-control` from E08_v2

**Modal Footer:**
- "Got It" (primary button)
- "Export This Metric" (secondary button)
- "Full Methodology Docs" (link)

---

## SECTION 7: Model Files Section

**Same as E10 v1:**

**Section Title:** "Trained Model Files" (H2, 24px, semibold)

**Download Buttons:**
- "Download LoRA Adapters" (green, large) — 442 MB
- "Download Deployment Package" (blue outline) — 650 MB

**Files Included:**
- adapter_model.safetensors — 442 MB
- adapter_config.json — 2 KB
- training_summary.json — 5 KB
- README.txt — 8 KB

---

## SECTION 8: Traceability Information Panel (UPDATED)

**Section Title:** "Traceability Information" (H2, 24px, semibold)
**Subtitle:** "Complete provenance for reproducibility" (gray, 14px)

**Card Container:**
- Background: Light gray (#F9FAFB)
- Border: 2px solid blue (#3B82F6)
- Padding: 24px

**CRITICAL: Use Lay-Person Terminology**

### Column 1: Training Configuration

**Subsection Title:** "Training Configuration" (semibold, 16px)

**Information Rows (using E08_v2 terminology):**
- Framework Version: "BrightRun Training Framework v1.0.0"
- Engine: "Emotional Alignment Engine v1.0.0"
- Engine Features: "✓ Emotional Arc Pattern Recognition, ✓ Empathetic Response Optimization"
- Model: "mistralai/Mistral-7B-Instruct-v0.3"
- Quantization: "4-bit optimized"

**Training Parameters (LAY-PERSON LABELS):**
- **Training Sensitivity:** "Medium (Balanced)" — References `training-sensitivity-control`
  - Technical value shown in tooltip: "(Learning Rate: 0.0001)"
- **Training Progression:** "Medium (Balanced)" — References `training-progression-control`
  - Technical value shown in tooltip: "(Batch Size: 4)"
- **Training Repetition:** "3 (Standard)" — References `training-repetition-control`
  - Technical value shown in tooltip: "(Epochs: 3)"

**REMOVED from Traceability:**
- ~~"LoRA Config: Rank: 16, Alpha: 32, Dropout: 0.1"~~ — Technical details hidden from lay users
- These values are still stored in backend, just not displayed

### Column 2: Dataset & Execution

**Subsection Title:** "Dataset & Execution" (semibold, 16px)

**Information Rows:**
- Dataset: "emotional-alignment-v3.jsonl" — References `training-data-summary-card`
- Conversations: "242 training pairs"
- GPU Configuration: "2x NVIDIA A100 80GB"
- Infrastructure: "RunPod Secure Cloud"

### Column 3: Evaluations Performed

**Subsection Title:** "Evaluations Performed" (semibold, 16px)

**Information Rows:**
- Evaluation Engine: "Emotional Alignment Engine v1.0.0"
- Evaluations Run: "Emotional Arc Fidelity, Empathy Score"
- Evaluation Time: "8 minutes"
- Evaluation Framework: "v1.0.0"

### Column 4: Timeline

**Subsection Title:** "Execution Timeline" (semibold, 16px)

**Timeline Display:**
- Created: "Jan 8, 2026 10:00 AM"
- Started: "Jan 8, 2026 10:15 AM" (+15m queue)
- Training Completed: "Jan 8, 2026 2:38 PM" (4h 23m)
- Evaluations Completed: "Jan 8, 2026 2:46 PM" (+8m)

**Export Actions:**
- "Export Traceability Report" (blue outline button)
- "Copy Configuration JSON" (gray outline button)

---

## SECTION 9: Cross-Reference to E08_v2 and E09_v2 Components

**Component ID Consistency Check:**

| Component | Defined In | Referenced In E10_v2 |
|-----------|------------|----------------------|
| `training-data-summary-card` | E08_v2 | Traceability "Dataset" row |
| `training-sensitivity-control` | E08_v2 | Traceability + Metric Detail Modal |
| `training-progression-control` | E08_v2 | Traceability + Metric Detail Modal |
| `training-repetition-control` | E08_v2 | Traceability + Metric Detail Modal |
| `engine-features-panel` | E08_v2 | Engine attribution in Evaluation section |
| `post-training-evaluation-info` | E08_v2 | Now shown as actual results |
| `training-quality-evaluation` | E10_v2 | NEW — Main evaluation results |

**Terminology Consistency:**
- ✓ "Training Sensitivity" (not "Learning Rate" as label)
- ✓ "Training Progression" (not "Batch Size" as label)
- ✓ "Training Repetition" (not "Epochs" as label)
- ✓ No Rank/Alpha/Dropout in displayed UI
- ✓ Evaluation metrics shown as post-training OUTCOMES

---

## SECTION 10: Export Functionality

**Same as E10 v1 with updated terminology:**

**Export Options:**
1. **CSV** — Includes all metrics with lay-person labels
2. **JSON** — Full data with both lay-person and technical values
3. **PDF Report** — Professional format using lay-person terminology

**PDF Report Contents (Updated):**
1. Cover page with job summary
2. Training Quality Evaluation results (prominent)
3. Summary metrics
4. Training parameters (lay-person labels)
5. Traceability information
6. Methodology appendix

---

## SECTION 11: Responsive Design

**Desktop (≥1024px):**
- Summary cards: 4 columns
- Training Quality Evaluation: Full width
- Traceability: 4-column grid

**Tablet (768px - 1023px):**
- Summary cards: 2 columns
- Training Quality Evaluation: Full width
- Traceability: 2-column grid

**Mobile (<768px):**
- Summary cards: 1 column
- Training Quality Evaluation: Stacked card layout
- Traceability: 1-column stacked sections

---

## SECTION 12: Accessibility

**Keyboard Navigation:**
- Tab through: Summary cards → Training Quality Evaluation → Charts → Metrics table → Files → Traceability
- Enter: Open modals, activate buttons
- ESC: Close modals

**Screen Reader Support:**
- Training Quality Evaluation: "Section, Training Quality Evaluation, completed. Emotional Arc Fidelity: 87.2 percent, Excellent. Empathy Score: 79.1 percent, Good."
- Traceability: Reads all configuration using lay-person terms

---

## Design System Consistency

**Reused from E01-E09:**
- Card styling
- Table styling
- Badge components
- Modal patterns
- Typography scale
- Color palette

**Components from E08_v2 and E09_v2:**
- Uses same terminology definitions
- References same component IDs
- Consistent visual language

**New in E10_v2:**
- `training-quality-evaluation` section (prominent post-training metrics)
- Evaluation metric detail modals
- Lay-person traceability display

---

**End of E10_v2 Wireframe Prompt**

This wireframe prompt completes the E08_v2 → E09_v2 → E10_v2 progression, maintaining exact component IDs and lay-person terminology throughout. The Training Quality Evaluation section prominently displays the specialized metrics that were computed post-training, fulfilling the v3 specification requirement that these appear ONLY in results (not during configuration or training).

