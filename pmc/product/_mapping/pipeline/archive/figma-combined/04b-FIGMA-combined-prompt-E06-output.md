# LoRA Pipeline - Stage 6 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 6 — Model Quality Validation  
**Section ID:** E06  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E06.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E06.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E06-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 6 — Model Quality Validation - Complete Integrated Wireframe System

**Context Summary**

This stage enables users to validate trained LoRA model quality through comprehensive automated evaluation across four dimensions: perplexity improvement (technical quality), emotional intelligence benchmarks (EI quality), financial knowledge retention (safety validation), and brand voice consistency (personality alignment). Engineers can view objective quality metrics, identify improvement areas, receive actionable recommendations, and make confident delivery decisions. The interface prioritizes clear quality gate visualization with progressive disclosure of detailed analysis.

**Journey Integration**

- **Stage 6 User Goals:** Validate model quality objectively, demonstrate measurable improvements, ensure no knowledge degradation, confirm brand personality acquisition, make confident delivery decisions
- **Key Emotions:** Anticipation during validation, relief/pride when metrics pass, concern requiring action if issues detected, confidence for client delivery
- **Progressive Disclosure:** 
  * Basic: Combined quality scorecard with pass/fail indicators for each dimension
  * Advanced: Expanded sections with dimension breakdowns and top examples
  * Expert: Detailed drill-downs, before/after comparisons, full metric analysis
- **Persona Adaptations:** AI Engineers see technical metrics and debugging context; Business Owners see executive summaries and ROI proof; Quality Analysts see detailed validation methodology

**Wireframe Goals**

- Display combined quality scorecard showing all validation metrics at a glance
- Provide perplexity improvement visualization with quality tier classification (FR6.1.1)
- Show category-level perplexity analysis with best/worst performers (FR6.1.2)
- Present emotional intelligence benchmark results with dimension breakdown (FR6.2.1)
- Alert users to EI regression issues with affected scenario count (FR6.2.2)
- Display financial knowledge retention test results with topic breakdown (FR6.3.1)
- Show domain-specific knowledge acquisition validation (FR6.3.2)
- Present brand voice consistency scoring with personality dimension analysis (FR6.4.1/6.4.2)
- Enable quality gate decision workflow (approve/review/block)
- Support export of comprehensive validation report combining all metrics

**Explicit UI Requirements**

**COMBINED QUALITY SCORECARD (Dashboard Header)**
- Positioned prominently at top of validation dashboard
- Four metric cards displayed horizontally:
  * **Perplexity Card:** Improvement % (e.g., "31%"), quality tier (Production Ready/Acceptable/Below Threshold), color-coded (green/yellow/red)
  * **EI Card:** Improvement % (e.g., "41%"), quality tier (Exceptional/Strong/Moderate/Needs Improvement), color-coded
  * **Knowledge Card:** Retention % (e.g., "93%"), status (Retained/Minor Loss/Significant Loss), color-coded
  * **Voice Card:** Consistency % (e.g., "88%"), status (Strong/Moderate/Weak), color-coded
- **Overall Quality Score:** Aggregated badge showing combined assessment "✓ Production Ready" or "⚠ Review Required" or "✗ Blocked"
- Calculation: Average of applicable metrics meeting minimum thresholds
- Click any card → scrolls to expanded section for that metric

**SECTION 1: Perplexity Improvement (FR6.1.1 + FR6.1.2 Simplified)**

**Perplexity Results Card:**
- Card header: "Model Quality: Perplexity Improvement"
- Quality tier badge: Large, prominent with icon
  * "✓ Production Ready" (≥30% improvement, green)
  * "⚠ Acceptable Quality" (20-29%, yellow)
  * "✗ Below Threshold" (<20%, red)
- Three-column results display:
  * Column 1 - Baseline: "24.5" with label "Llama 3 70B (baseline)"
  * Column 2 - Trained: "16.8" with label "Trained Model" (green if improved)
  * Column 3 - Improvement: "31.4%" large and bold, "Target: ≥30%" indicator
- Bar chart visualization: Two horizontal bars (Baseline blue, Trained green), 30% threshold line
- Interpretation text: "31% lower perplexity indicates significantly better prediction quality"
- Expandable "View Details ▼" section

**Category Summary (Simplified FR6.1.2):**
- Displayed below perplexity card when expanded
- Summary table with columns: Category | Improvement % | Status
- Only show top 3 and bottom 3 performers:
  * "🏆 Anxious Investor: 42% (Excellent)" green
  * "Hopeful Planner: 32% (Good)" green
  * "Skepticism-to-Trust: 33% (Good)" green
  * "⚠ Pragmatic Skeptic: 23% (Needs Attention)" red
  * "⚠ Debt Management: 29% (Below Target)" yellow
- Recommendation callout: "Add 10+ more Pragmatic Skeptic conversations to improve performance"
- "[Export Perplexity Report]" button

**SECTION 2: Emotional Intelligence Benchmarks (FR6.2.1 + FR6.2.2 Simplified)**

**EI Results Card:**
- Card header: "Emotional Intelligence Benchmarks"
- Quality tier badge: Large with icon
  * "✓ Exceptional EI" (≥40% improvement, dark green)
  * "✓ Strong EI" (30-39%, green)
  * "⚠ Moderate EI" (20-29%, yellow)
  * "✗ Needs Improvement" (<20%, red)
- Overall score display: "3.2/5 → 4.5/5 = 41% improvement"
- Three dimension sub-cards (horizontal):
  * Empathy: "4.6/5 (48% ↑)" green
  * Clarity: "4.5/5 (32% ↑)" green
  * Appropriateness: "4.4/5 (42% ↑)" green
- Radar chart: 3-axis visualization (Empathy, Clarity, Appropriateness), blue outline for baseline, green filled for trained
- Expandable "View Examples ▼" section

**Before/After Examples (when expanded):**
- Display top 3 improvements only
- For each example:
  * Scenario prompt (truncated to 80 chars)
  * Baseline response card: Gray background, score "2.7/5"
  * Trained response card: Light green background, score "4.7/5"
  * Improvement badge: "+2.0 points (74% improvement)" green
- "[View All 50 Scenarios]" link (modal trigger)
- "[Export EI Report]" button

**Regression Alert (FR6.2.2 Conditional):**
- Only displayed if any dimension regressed
- Yellow/orange warning banner: "⚠ EI Regression Detected: X scenarios show decreased performance"
- Severity indicator: Critical / Moderate / Minor
- Affected dimensions listed: "Appropriateness: 5 scenarios regressed"
- "[View Regression Details]" link (modal trigger)
- If no regression: Green checkmark "✓ No regressions detected"

**SECTION 3: Knowledge Validation (FR6.3.1 + FR6.3.2 Simplified)**

**Financial Knowledge Retention Card:**
- Card header: "Financial Knowledge Retention Test"
- Pass/fail badge:
  * "✓ Knowledge Retained" (≥95%, green)
  * "⚠ Minor Knowledge Loss" (90-94%, yellow)
  * "✗ Significant Knowledge Loss" (<90%, red)
- Score display: "28/30 correct = 93% retention"
- Comparison: "Baseline: 29/30 (97%) | This run: 28/30 (93%) | -2 questions"
- Topic summary table (collapsed, show on expand):
  * Compound Interest: 5/5 ✓
  * Risk-Return: 5/6 ⚠
  * Diversification: 6/6 ✓
  * Tax Basics: 4/5 ✓
  * Retirement: 8/8 ✓
- Failed questions summary: "2 questions failed - 1 critical gap in diversification concepts"
- "[View Failed Questions]" link (modal trigger)

**Domain Knowledge Card:**
- Card header: "Domain-Specific Knowledge Validation"
- Success badge:
  * "✓ Knowledge Acquired" (≥80%, green)
  * "⚠ Partial Knowledge" (60-79%, yellow)
  * "✗ Knowledge Gaps" (<60%, red)
- Score display: "32/40 correct = 80% domain knowledge"
- Gain indicator: "Baseline: 12/40 (30%) → Trained: 32/40 (80%) | +50pp gain"
- Topic mastery summary:
  * Proprietary Products: 90% ✓ Mastered
  * Compliance Requirements: 70% ⚠ Partial
  * Client Scenarios: 90% ✓ Mastered
  * Industry Regulations: 70% ⚠ Partial
- Interpretation: "Model successfully acquired client-specific knowledge. Compliance topics need reinforcement."
- "[Export Knowledge Report]" button

**SECTION 4: Brand Voice Consistency (FR6.4.1 or FR6.4.2 Simplified)**

**Voice Consistency Card:**
- Card header: "Brand Voice: Elena Morales Consistency" (or "[Client Name] Brand Voice")
- Subtitle: "Warm | Professional | Clear | Empathetic | Empowering"
- Alignment badge:
  * "✓ Strong Alignment" (≥85%, green)
  * "⚠ Moderate Alignment" (70-84%, yellow)
  * "✗ Weak Alignment" (<70%, red)
- Score display: "88% Voice Consistency Score" with circular progress indicator
- Target comparison: "Target: 85% | Your model: 88% | ✓ Exceeds standards"
- Five dimension scores (horizontal bar or cards):
  * Warmth: 86% ✓
  * Professionalism: 90% ✓
  * Clarity: 84% ⚠ (slightly below)
  * Empathy: 92% ✓
  * Empowerment: 78% ⚠ (needs work)
- Radar chart: 5-axis visualization with 85% target line
- Expandable "View Voice Examples ▼" section

**Voice Examples (when expanded):**
- Display top 3 examples only
- For each example:
  * Scenario prompt
  * Response text with inline annotations: "[EMPATHY] I understand your concern... [CLARITY] Let me explain..."
  * Voice score: "4.7/5 (94%)"
- If voice drift detected: "⚠ Empowerment shows drift - model provides solutions directly instead of guiding client discovery"
- "[Export Voice Report]" button

**SECTION 5: Quality Gate Decision Footer**

**Decision Card:**
- Card header: "Quality Gate Decision"
- Positioned at bottom of dashboard, always visible
- Overall status banner:
  * "✓ Production Ready - All critical metrics pass" (green banner)
  * "⚠ Review Required - One or more metrics need attention" (yellow banner)
  * "✗ Delivery Blocked - Critical issues detected" (red banner)
- Issue summary (if applicable): "Minor knowledge loss (93%) - review before delivery"
- Action buttons:
  * "[Export Full Validation Report]" - generates combined PDF with all sections
  * "[Approve & Deploy]" - primary action, enabled if all metrics pass, green styling
  * "[Request Review]" - secondary action, triggers manager approval workflow
  * "[Retry with Recommendations]" - tertiary action, navigates to job configuration with suggestions

**Recommendations Summary (if issues detected):**
- Prioritized list of top 3-5 recommendations combining insights from all metrics:
  1. "Critical: Add 10+ Pragmatic Skeptic conversations (perplexity category underperforming)"
  2. "High: Include diversification training examples to restore financial knowledge"
  3. "Medium: Add empowerment-focused conversations to strengthen voice dimension"
- Each recommendation shows: Issue, Current value, Target value, Suggested action

**Interactions and Flows**

1. **Page Load:**
   - User navigates to completed training job details
   - Validation dashboard loads with combined scorecard visible
   - All sections in collapsed/summary state initially
   - Quality gate decision visible at bottom

2. **View Combined Scorecard:**
   - Four metric cards show summary scores
   - Overall quality badge shows combined assessment
   - Click any card → auto-scrolls to that section
   - Color coding indicates pass/warning/fail for each

3. **Expand Section:**
   - Click "View Details ▼" on any section
   - Section smoothly expands (300ms animation)
   - Additional content appears: charts, breakdowns, examples
   - Other sections remain collapsed

4. **View Before/After Examples:**
   - Click "View Examples ▼" in EI or Voice sections
   - Top 3 examples appear with comparison cards
   - Baseline (gray) vs Trained (green) side-by-side
   - Improvement badge shows score delta

5. **Open Detail Modal:**
   - Click "[View All 50 Scenarios]" → Full scenarios modal opens
   - Click "[View Failed Questions]" → Failed questions modal opens
   - Click "[View Regression Details]" → Regression analysis modal opens
   - Modal overlays dashboard, dims background
   - "X" or click outside to close modal

6. **Export Report:**
   - Click any "[Export Report]" button → Format selection modal
   - Options: PDF (full report), CSV (raw data)
   - Click "Download" → Report generated, download initiated
   - For combined report: "[Export Full Validation Report]" generates all-in-one PDF

7. **Make Decision:**
   - If all metrics pass: Click "Approve & Deploy" → Confirmation modal → Job marked approved
   - If issues detected: Click "Request Review" → Manager approval workflow triggered
   - If critical issues: "Approve & Deploy" disabled, must address issues or request override

8. **Warning/Error States:**
   - Metric below threshold: Card shows yellow/red styling
   - Section shows specific warnings with recommendations
   - Quality gate shows overall warning/blocked status
   - Action buttons adapt based on severity

**Visual Feedback**

- **Loading States:** Skeleton screens while validation calculates, "Calculating [metric]..." with progress
- **Quality Tier Badges:** Consistent styling - icon + text + color (Green ≥target, Yellow warning, Red critical)
- **Improvement Indicators:** Green upward arrows "↑" for improvements, red downward "↓" for regressions
- **Card Backgrounds:** White/light for normal, light yellow for warnings, light red for critical issues
- **Charts:** Bar charts use blue (baseline) vs green (trained), threshold lines dashed red
- **Radar Charts:** Blue outline for baseline, green filled area for trained, gray target line
- **Comparison Cards:** Baseline = gray background, Trained = light green background
- **Expand/Collapse:** Smooth 300ms transitions, chevron icon rotates on expand
- **Button States:** Primary (green for approve), Secondary (gray for review), Destructive (red for block)
- **Export Buttons:** Show loading spinner during generation, checkmark when complete
- **Alert Banners:** Warning = yellow/orange, Error = red, Success = green, with appropriate icons

**Accessibility Guidance**

- All quality badges include both icon AND text label for screen readers
  - aria-label="Production Ready: Perplexity improvement 31 percent exceeds 30 percent target"
- Metric values have semantic labels: aria-label="Baseline perplexity: 24.5, Trained perplexity: 16.8, Improvement: 31.4 percent"
- Charts have text alternatives: alt="Bar chart comparing baseline perplexity 24.5 to trained 16.8"
- Expandable sections keyboard accessible: Tab to focus, Enter to expand/collapse
- Color coding always supplemented with text (not color-alone)
- Focus indicators visible on all interactive elements (2px blue outline)
- ARIA live regions announce status changes: "Validation complete", "Quality gate passed"
- Modal focus trapping: Tab cycles within modal, Escape closes
- Tables announce structure to screen readers with proper headers

**Information Architecture**

**Page Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Training Job #abc123 - Validation Results               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ COMBINED QUALITY SCORECARD (always visible)                 │ │
│ │ [Perplexity] [EI] [Knowledge] [Voice] [Overall Badge]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION 1: Perplexity Improvement (expandable)              │ │
│ │ [Summary] → [Details on expand] → [Category Summary]        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION 2: Emotional Intelligence (expandable)              │ │
│ │ [Summary] → [Dimensions on expand] → [Examples]             │ │
│ │ [Regression Alert if applicable]                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION 3: Knowledge Validation (expandable)                │ │
│ │ [Retention Summary] [Domain Summary] → [Details on expand]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SECTION 4: Brand Voice (expandable)                         │ │
│ │ [Summary] → [5 Dimensions on expand] → [Examples]           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FOOTER: Quality Gate Decision (always visible)              │ │
│ │ [Status] [Recommendations] [Action Buttons]                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Component Hierarchy:**
- ValidationDashboard (parent)
  - HeaderSection (job name, overall status)
  - CombinedQualityScorecard
    - MetricCard × 4 (Perplexity, EI, Knowledge, Voice)
    - OverallQualityBadge
  - PerplexitySection (expandable)
    - SummaryCard (quality badge, scores, chart)
    - CategorySummary (top/bottom performers)
    - ExportButton
  - EISection (expandable)
    - SummaryCard (quality badge, dimension breakdown)
    - RadarChart
    - BeforeAfterExamples (top 3)
    - RegressionAlert (conditional)
    - ExportButton
  - KnowledgeSection (expandable)
    - RetentionCard (pass/fail, topic summary)
    - DomainCard (acquisition %, topic mastery)
    - ExportButton
  - VoiceSection (expandable)
    - ConsistencyCard (5 dimensions, radar chart)
    - VoiceExamples (top 3)
    - ExportButton
  - QualityGateFooter
    - StatusBanner
    - RecommendationsList (conditional)
    - ActionButtons (Export, Approve, Review)
  - Modals (overlay, conditional)
    - AllScenariosModal
    - FailedQuestionsModal
    - RegressionDetailsModal
    - ExportPreviewModal

**Page Plan**

**Total Wireframe Pages: 10**

1. **Validation Dashboard - Overview State**
   - Purpose: Show all validation metrics in summary view with combined scorecard
   - Key Elements: Combined scorecard with 4 metrics + overall badge, all 4 sections collapsed showing summaries, quality gate footer with action buttons
   - States: All sections collapsed, scorecard prominent
   
2. **Validation Dashboard - Perplexity Section Expanded**
   - Purpose: Show detailed perplexity analysis with category breakdown
   - Key Elements: Perplexity section expanded (bar chart, category summary), other sections collapsed, quality gate footer visible
   - States: Section 1 expanded, sections 2-4 collapsed

3. **Validation Dashboard - EI Section Expanded**
   - Purpose: Show EI benchmark details with before/after examples
   - Key Elements: EI section expanded (dimension breakdown, radar chart, top 3 examples), regression alert (if applicable), other sections collapsed
   - States: Section 2 expanded, sections 1,3,4 collapsed

4. **Validation Dashboard - Knowledge Section Expanded**
   - Purpose: Show combined knowledge validation details
   - Key Elements: Both retention and domain cards expanded, topic breakdowns visible, failed questions summary
   - States: Section 3 expanded, sections 1,2,4 collapsed

5. **Validation Dashboard - Voice Section Expanded**
   - Purpose: Show brand voice consistency with dimension analysis
   - Key Elements: Voice section expanded (5 dimensions, radar chart, top 3 examples), voice drift note if applicable
   - States: Section 4 expanded, sections 1-3 collapsed

6. **Validation Dashboard - Warning State**
   - Purpose: Show dashboard when one or more metrics need attention
   - Key Elements: Yellow warning styling on affected scorecard card(s), warning banner in quality gate footer, recommendations visible, "Approve" button conditional
   - States: Warning state (e.g., knowledge at 93% minor loss)

7. **Validation Dashboard - Critical Error State**
   - Purpose: Show dashboard when critical issues block delivery
   - Key Elements: Red styling on critical scorecard card(s), red blocked banner in footer, "Approve & Deploy" disabled, "Retry" prominent
   - States: Blocked state (e.g., EI regression detected, perplexity below threshold)

8. **Before/After Example Modal**
   - Purpose: Show detailed comparison for individual example (works for EI, knowledge, or voice)
   - Key Elements: Modal overlay, scenario prompt, baseline response card (gray), trained response card (green), detailed scores, improvement explanation
   - States: Single example view, navigation to browse examples

9. **Export Report Preview Modal**
   - Purpose: Preview and download combined validation report
   - Key Elements: Modal overlay, format selector (PDF/CSV), report preview pane showing cover and sections, download button
   - States: Format selection, generating, preview ready

10. **Mobile Layout - Dashboard**
    - Purpose: Show responsive single-column layout for mobile devices
    - Key Elements: Stacked metric cards, collapsible sections below, fixed action footer, touch-optimized buttons
    - States: Mobile viewport, single column, simplified scorecard

**Annotations (Mandatory)**

Attach notes to UI elements in Figma citing:
1. **Which FR(s)** the element fulfills (e.g., "FR6.1.1 + FR6.1.2: Perplexity metrics and category analysis")
2. **Acceptance criteria number** it maps to
3. **State variations** this element has

Include a **"Mapping Table"** frame in Figma with columns:
- **Criterion** (text of acceptance criterion)
- **Source** (FR number)
- **Screen(s)** (which wireframe page)
- **Component(s)** (UI element name)
- **State(s)** (loading, error, success, etc.)
- **Notes** (implementation details)

**Example annotations:**
- Combined Scorecard: "All FR 6.x.x: Unified quality overview combining perplexity, EI, knowledge, and voice metrics"
- Perplexity Card: "FR6.1.1 AC1-3: Quality tier badge (≥30% production, 20-29% acceptable, <20% below), three-column metrics display"
- Category Summary: "FR6.1.2 AC1-2: Top/bottom performing categories with best/worst badges and recommendations"
- EI Dimension Cards: "FR6.2.1 AC3: Empathy/Clarity/Appropriateness scores with improvement percentages"
- Regression Alert: "FR6.2.2 AC1-3: Conditional alert when trained < baseline, shows affected dimensions and count"
- Knowledge Retention Card: "FR6.3.1 AC1-5: Pass/fail badge (≥95% pass), topic breakdown, failed questions summary"
- Domain Knowledge Card: "FR6.3.2 AC1-7: Acquisition %, topic mastery, gain from baseline comparison"
- Voice Consistency Card: "FR6.4.1 AC1-6: 5 personality dimension scores, radar chart, voice examples"
- Quality Gate Footer: "All FR 6.x.x: Combined delivery decision based on all metric thresholds"

**Acceptance Criteria → UI Component Mapping**

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Perplexity improvement % display | FR6.1.1 AC1-3 | Pages 1-7 | PerplexityCard in Scorecard, PerplexitySection | Default, Expanded | Shows 31.4% improvement, quality tier badge |
| Perplexity quality tier classification | FR6.1.1 AC4 | Pages 1-7 | QualityTierBadge | Production Ready ≥30%, Acceptable 20-29%, Below <20% | Color-coded green/yellow/red |
| Bar chart baseline vs trained | FR6.1.1 AC5 | Page 2 | PerplexityBarChart | Expanded view | Blue baseline, green trained, 30% threshold line |
| Category performance breakdown | FR6.1.2 AC1-3 | Page 2 | CategorySummaryTable | Expanded view | Top 3 + bottom 3, best/worst badges |
| Category recommendations | FR6.1.2 AC4 | Page 2 | RecommendationCallout | Conditional (issues present) | "Add 10+ conversations" guidance |
| EI improvement % with quality tier | FR6.2.1 AC1-4 | Pages 1-7 | EICard in Scorecard, EISection | Default, Expanded | 41% improvement, Exceptional/Strong/Moderate/Needs badge |
| 3-dimension breakdown | FR6.2.1 AC5 | Page 3 | DimensionSubCards | Expanded view | Empathy/Clarity/Appropriateness scores |
| Radar chart visualization | FR6.2.1 AC6 | Page 3 | RadarChart | Expanded view | 3-axis, baseline outline vs trained filled |
| Before/after examples (top 10→3) | FR6.2.1 AC7 | Pages 3, 8 | BeforeAfterExamples | Expanded, Modal | Scenario, baseline/trained cards, improvement badge |
| Regression detection alert | FR6.2.2 AC1-3 | Pages 3, 7 | RegressionAlertBanner | Conditional (regression exists) | Yellow/red warning, affected count |
| Knowledge retention % with pass/fail | FR6.3.1 AC1-4 | Pages 1-7 | KnowledgeCard in Scorecard, RetentionCard | Default, Expanded | 93% retention, Minor Loss badge |
| Topic-level breakdown | FR6.3.1 AC5 | Page 4 | TopicSummaryTable | Expanded view | 5 topics with pass/fail indicators |
| Failed questions summary | FR6.3.1 AC6 | Pages 4, 8 | FailedQuestionsLink, Modal | Expanded, Modal | "2 questions failed - 1 critical" |
| Domain knowledge acquisition % | FR6.3.2 AC1-3 | Pages 1-7 | DomainCard | Default, Expanded | 80% acquired, +50pp gain indicator |
| Topic mastery breakdown | FR6.3.2 AC4-5 | Page 4 | TopicMasteryTable | Expanded view | Mastered/Partial/Gaps badges |
| Voice consistency % with alignment badge | FR6.4.1 AC1-3 | Pages 1-7 | VoiceCard in Scorecard, VoiceSection | Default, Expanded | 88% consistency, Strong/Moderate/Weak badge |
| 5 personality dimension scores | FR6.4.1 AC4-5 | Page 5 | DimensionScores, RadarChart | Expanded view | Warmth/Prof/Clarity/Empathy/Empower |
| Voice examples with annotations | FR6.4.1 AC6 | Pages 5, 8 | VoiceExamples | Expanded, Modal | [EMPATHY], [CLARITY] inline tags |
| Voice drift identification | FR6.4.1 AC7 | Page 5 | VoiceDriftNote | Conditional (drift detected) | "Empowerment shows drift - 78%" |
| Combined quality scorecard | All FR6.x | Pages 1-7 | CombinedQualityScorecard | Always visible | 4 metric cards + overall badge |
| Quality gate decision workflow | All FR6.x | Pages 1-7, 10 | QualityGateFooter | Pass/Warning/Blocked | Status banner, action buttons |
| Export combined report | All FR6.x | Pages 1-9 | ExportButton, ExportModal | Click, Preview, Download | PDF with all sections |

**Non-UI Acceptance Criteria**

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| Automatic validation triggering on job completion | Validation runs without manual action | Status shows "Validation in progress" then results |
| Perplexity calculation algorithm | Backend computes improvement % | UI displays calculated result from API |
| LLM-as-judge scoring methodology | Objective EI/knowledge scoring | Methodology expandable in detail modals |
| 80/20 validation set split | Consistent validation results | Validation set size shown in details |
| Store all metrics in database | Historical tracking | Enables trend analysis in full product |
| Manager approval workflow | Governance for below-threshold | "Request Review" triggers notification |

**Estimated Total Page Count**

**10 wireframe pages** covering:
1. Validation Dashboard - Overview (all collapsed)
2. Dashboard - Perplexity Expanded
3. Dashboard - EI Expanded  
4. Dashboard - Knowledge Expanded
5. Dashboard - Voice Expanded
6. Dashboard - Warning State
7. Dashboard - Critical Error State
8. Before/After Example Modal
9. Export Report Preview Modal
10. Mobile Responsive Layout

**Rationale:**
- Consolidates 8 individual FR displays (24 pages) into unified dashboard (10 pages) - **58% reduction**
- Shows complete validation flow through expandable sections
- Covers all key states (success, warning, error)
- Includes both desktop and mobile layouts
- Provides modal for detail views without separate full screens
- Maintains all essential functionality while optimizing for POC

---

## Final Notes for Figma Implementation

**Integration Requirements:**
- Combined scorecard always visible at top, providing at-a-glance quality status
- Four validation sections must work independently (expand/collapse) while contributing to overall score
- Quality gate footer always visible, adapts based on combined metrics
- Export generates comprehensive report including all sections

**POC Simplifications Applied:**
- Removed: Team analytics, persona×arc heatmap, all 50 scenarios view, root cause analysis, compliance workflows, multiple brand profiles
- Simplified: Category analysis to top/bottom 3, before/after to top 3, trend charts removed, approval workflows condensed
- Maintained: All 4 core validation dimensions, quality tier classification, actionable recommendations, export functionality

**State Management:**
- Each section tracks own expanded/collapsed state
- Combined scorecard computes overall status from 4 dimension scores
- Quality gate footer reacts to combined assessment
- Conditional elements (regression alert, voice drift) appear based on metric results

**Accessibility:**
- Full keyboard navigation for all interactive elements
- Screen reader friendly with ARIA labels and live regions
- Color never used alone for meaning (always paired with text/icons)
- Focus indicators visible on navigation
- Modals trap focus appropriately

**Success Criteria:**
A user should be able to:
1. View combined quality scorecard showing all validation metrics
2. Expand any section to see detailed analysis
3. Understand quality tier for each dimension (production-ready, warning, blocked)
4. View before/after examples demonstrating model improvements
5. See actionable recommendations for any issues detected
6. Export comprehensive validation report
7. Make informed delivery decision based on quality gates

All within a single, integrated validation dashboard that provides progressive disclosure from overview to detail.
