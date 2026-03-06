# E06 Combined Wireframe Analysis Worksheet
**Stage:** Stage 6 — Model Quality Validation  
**Section ID:** E06  
**Date:** 2025-12-19

---

## PHASE 1: Deep Analysis

### Individual FR Catalog

#### FR6.1.1: Calculate Perplexity Improvement
- **Purpose:** Display perplexity improvement metrics with quality tier classification
- **Core Functionality:** Automated perplexity evaluation comparing baseline Llama 3 70B vs trained model, calculating improvement percentage (target ≥30%)
- **UI Components:**
  - Perplexity Section Card with quality tier badge (Production Ready/Acceptable/Below Threshold)
  - Three-column results grid (Baseline PPL, Trained PPL, Improvement %)
  - Bar chart comparing baseline vs trained perplexity
  - Expandable detailed metrics breakdown
  - Quality gate workflow banners with recommendations
  - Export buttons (PDF/CSV)
  - Trend tracking chart
  - Team analytics (manager view)
- **UI States:** Loading (validation running), Production Ready (≥30%), Acceptable (20-29%), Below Threshold (<20%)
- **User Interactions:** View details, export report, retry training, accept anyway with approval
- **Page Count:** 3 pages
- **Dependencies:** None (first validation metric)

---

#### FR6.1.2: Perplexity by Category Analysis
- **Purpose:** Granular perplexity analysis by persona, emotional arc, and training topic
- **Core Functionality:** Category breakdowns, persona×arc heatmap, data gap identification, actionable recommendations
- **UI Components:**
  - Tab navigation (By Persona | By Emotional Arc | By Topic | Heatmap | Recommendations)
  - Category tables with best/worst highlighting
  - Persona×Emotional Arc heatmap (color-coded cells)
  - Data gap callout boxes
  - Prioritized recommendations with severity badges
  - Per-conversation drill-down
  - Trend comparison across runs
  - Export category analysis
- **UI States:** Default view, filtered, heatmap problem-area filter, drill-down
- **User Interactions:** Tab switching, table sorting, heatmap hover/click, export
- **Page Count:** 3 pages
- **Dependencies:** FR6.1.1 (extends perplexity results)

---

#### FR6.2.1: Run Emotional Intelligence Benchmarks
- **Purpose:** Comprehensive EI evaluation using 50-scenario test suite
- **Core Functionality:** Score responses across empathy, clarity, appropriateness dimensions using LLM-as-judge
- **UI Components:**
  - EI Benchmark Card with quality tier badge (Exceptional/Strong/Moderate/Needs Improvement)
  - Overall EI score section
  - Dimension breakdown (3 sub-cards: Empathy, Clarity, Appropriateness)
  - Radar chart visualization
  - Top 10 before/after examples
  - Category-level analysis (empathy detection, emotional awareness, supportive responses, conflict handling)
  - Difficulty-level analysis
  - LLM-as-judge methodology (expandable)
  - Export EI Benchmarks & Sales Enablement Report
- **UI States:** Default, scenarios expanded, filtered by category
- **User Interactions:** View scenarios, expand methodology, export reports
- **Page Count:** 3 pages
- **Dependencies:** FR6.1.1 (displays after perplexity)

---

#### FR6.2.2: EI Regression Detection
- **Purpose:** Detect scenarios where trained model scores lower than baseline on EI dimensions
- **Core Functionality:** Identify regressions, display before/after comparisons, provide root cause analysis
- **UI Components:**
  - Regression alert banner (conditional)
  - Regression summary card
  - Dimension-specific regression breakdown
  - Regressed scenarios table
  - Before/after comparison with highlighting
  - Root cause analysis section
  - Pattern identification callouts
  - Actionable recommendations
  - Delivery impact assessment
  - Export regression report
- **UI States:** No regression (hidden), Minor/Moderate/Critical regression (displayed)
- **User Interactions:** View regression details, drill-down scenarios, block delivery, export
- **Page Count:** 3 pages
- **Dependencies:** FR6.2.1 (extension of EI results when regression detected)

---

#### FR6.3.1: Financial Knowledge Retention Test
- **Purpose:** Detect catastrophic forgetting by testing retention of fundamental financial knowledge
- **Core Functionality:** 30-question test covering core financial topics, compare trained vs baseline
- **UI Components:**
  - Knowledge Retention Card with pass/fail badge (≥95% retained, 90-94% minor loss, <90% significant loss)
  - Overall retention score display
  - Topic-level breakdown table (Compound Interest, Risk-Return, Diversification, Taxes, Retirement)
  - Failed questions detail section
  - Severity assessment (critical vs minor gaps)
  - Knowledge gap pattern analysis
  - Actionable recommendations
  - Delivery impact assessment
  - Trend chart
  - Export knowledge retention report
- **UI States:** Pass, Minor loss, Significant loss
- **User Interactions:** View failed questions, drill-down, block delivery, compliance review
- **Page Count:** 3 pages
- **Dependencies:** FR6.2.1 (displays after EI)

---

#### FR6.3.2: Domain-Specific Knowledge Probes
- **Purpose:** Validate client-specific domain knowledge acquisition
- **Core Functionality:** 40-question test on proprietary products, compliance, scenarios, regulations
- **UI Components:**
  - Domain Knowledge Card with success badge (≥80% acquired, 60-79% partial, <60% gaps)
  - Overall knowledge acquisition score
  - Topic-level mastery breakdown table
  - Knowledge depth analysis (surface/moderate/deep pie chart)
  - Successfully acquired knowledge examples
  - Knowledge gap analysis with recommendations
  - Training data correlation analysis
  - Export domain knowledge report
- **UI States:** Success, Partial, Insufficient
- **User Interactions:** View topic details, drill-down gaps, export
- **Page Count:** 3 pages
- **Dependencies:** FR6.3.1 (displays after general knowledge)

---

#### FR6.4.1: Elena Morales Voice Consistency Scoring
- **Purpose:** Evaluate brand voice adherence to Elena Morales personality characteristics
- **Core Functionality:** 20-scenario test scoring 5 personality dimensions (warm, professional, clear, empathetic, empowering)
- **UI Components:**
  - Voice Consistency Card with alignment badge (≥85% strong, 70-84% moderate, <70% weak)
  - Overall voice consistency score
  - Personality dimension breakdown (5 cards)
  - Radar chart visualization
  - Voice characteristics examples with annotations
  - Voice drift analysis (conditional)
  - Scenario consistency breakdown
  - Training data voice correlation
  - Brand alignment proof statement
  - Export voice report
- **UI States:** Strong alignment, Moderate, Weak
- **User Interactions:** View dimensions, examples, drift analysis, export
- **Page Count:** 3 pages
- **Dependencies:** FR6.3.2 (displays after knowledge validation)

---

#### FR6.4.2: Client Brand Customization
- **Purpose:** Validate custom client brand voice beyond Elena Morales
- **Core Functionality:** Test against client-defined traits, calculate customization success
- **UI Components:**
  - Custom Brand Card with client name and alignment badge
  - Overall brand alignment score
  - Client-defined trait breakdown (5-7 variable cards)
  - Radar chart
  - Brand voice comparison (generic vs custom)
  - Custom brand examples with annotations
  - Brand deviation analysis (conditional)
  - Customization effectiveness metrics
  - Multiple brand profile selector (if applicable)
  - Export custom brand report
- **UI States:** Strong match, Moderate, Weak
- **User Interactions:** Switch profiles, view traits, compare with generic, export
- **Page Count:** 3 pages
- **Dependencies:** FR6.4.1 (alternative to Elena Morales for custom clients)

---

## FR Relationships & Integration Points

### Sequential Flow (Validation Dashboard)
FR6.1.1 → FR6.1.2 → FR6.2.1 → FR6.2.2 → FR6.3.1 → FR6.3.2 → FR6.4.1 (or FR6.4.2)

### Complementary Features (Same Page/Section)
- **Group 1 (Perplexity Metrics):** FR6.1.1 (Overall), FR6.1.2 (Category Analysis)
- **Group 2 (Emotional Intelligence):** FR6.2.1 (Benchmarks), FR6.2.2 (Regression Detection)
- **Group 3 (Knowledge Validation):** FR6.3.1 (Retention), FR6.3.2 (Domain Knowledge)
- **Group 4 (Brand Voice):** FR6.4.1 (Elena Morales), FR6.4.2 (Custom Brand)

### State Dependencies
- FR6.1.1 completion → triggers FR6.1.2 availability
- FR6.2.1 results → conditionally triggers FR6.2.2 if regressions detected
- All Group 1-4 metrics → feed into combined Overall Quality Score dashboard
- Quality thresholds → drive delivery gate decisions

### UI Component Sharing
- Quality tier badge pattern shared across all FRs
- Export workflow (PDF/CSV) consistent across all sections
- Threshold-based color coding (green/yellow/red) uniform
- Expandable detail sections pattern consistent
- Recommendation list format standardized

---

## Overlaps & Duplications to Consolidate

### 1. Quality Tier Badges
- **Duplication:** Each FR has its own quality badge with thresholds
- **CONSOLIDATION:** Create unified badge component, vary text/thresholds per metric type

### 2. Export Functionality
- **Duplication:** Each FR has "Export Report" button with PDF/CSV options
- **CONSOLIDATION:** Single export workflow pattern, context-aware report generation

### 3. Recommendation Lists
- **Duplication:** Each FR generates prioritized recommendations
- **CONSOLIDATION:** Unified recommendation component with severity badges

### 4. Before/After Comparisons
- **FR6.2.1** (EI before/after), **FR6.2.2** (regression before/after), **FR6.3.1** (knowledge before/after), **FR6.3.2** (knowledge transfer), **FR6.4.1/2** (voice examples)
- **CONSOLIDATION:** Single comparison card component, reused across contexts

### 5. Trend Charts
- **Duplication:** FR6.1.1, FR6.2.2, FR6.3.1 all have trend tracking
- **CONSOLIDATION:** Unified trend visualization component

### 6. Delivery Impact Assessment
- **Duplication:** FR6.1.1, FR6.2.2, FR6.3.1 have delivery impact sections
- **CONSOLIDATION:** Combine into Overall Quality Dashboard delivery decision

---

## POC Simplification Opportunities

### Features to KEEP (Essential for POC)
1. ✅ **Overall Quality Dashboard** with combined metrics (aggregated view)
2. ✅ **Perplexity improvement display** with quality tier (FR6.1.1 simplified)
3. ✅ **EI benchmark summary** with dimension breakdown (FR6.2.1 simplified)
4. ✅ **Knowledge retention score** with pass/fail indicator (FR6.3.1 simplified)
5. ✅ **Brand voice consistency score** (FR6.4.1 simplified)
6. ✅ **Export validation report** (combined single export)
7. ✅ **Quality gate decision** (approve/review/block)

### Features to SIMPLIFY (Reduce Complexity)
1. 🔽 **Perplexity Category Analysis (FR6.1.2):**
   - REMOVE: Persona×Arc heatmap, trend comparisons across runs, team analytics
   - KEEP: Summary table of top/bottom performing categories
2. 🔽 **EI Benchmarks (FR6.2.1):**
   - REMOVE: All 50 scenarios view, difficulty-level analysis, LLM-as-judge methodology
   - KEEP: Overall score, 3 dimension scores, top 3 before/after examples
3. 🔽 **EI Regression (FR6.2.2):**
   - REMOVE: Root cause analysis, pattern identification, regression tracking history
   - KEEP: Regression alert banner, affected dimension count, top 3 regressed scenarios
4. 🔽 **Knowledge Retention (FR6.3.1):**
   - REMOVE: Per-topic drill-down, pattern analysis, compliance workflow
   - KEEP: Overall retention %, topic summary, top 2 failed questions
5. 🔽 **Domain Knowledge (FR6.3.2):**
   - REMOVE: Depth analysis, training data correlation, knowledge transfer examples
   - KEEP: Overall acquisition %, topic mastery summary
6. 🔽 **Brand Voice (FR6.4.1/2):**
   - REMOVE: Voice drift analysis, scenario consistency breakdown, training data correlation
   - KEEP: Overall consistency %, 5 dimension scores, top 3 examples

### Features to REMOVE (Nice-to-Have for Full Product)
1. ❌ Team Analytics (FR6.1.1)
2. ❌ Persona×Arc Heatmap (FR6.1.2)
3. ❌ Per-conversation drill-down (FR6.1.2)
4. ❌ All 50 scenarios accordion (FR6.2.1)
5. ❌ Client Sales Enablement Report with branding (FR6.2.1)
6. ❌ Root cause analysis (FR6.2.2)
7. ❌ Delivery Decision Workflow Screen (FR6.2.2, FR6.3.1)
8. ❌ Compliance Review Workflow (FR6.3.1)
9. ❌ Knowledge depth pie chart (FR6.3.2)
10. ❌ Training data correlation scatter plots (FR6.3.2, FR6.4.1)
11. ❌ Multiple brand profile selector (FR6.4.2)
12. ❌ Brand voice comparison modal (FR6.4.2)

### Rationale
- **POC Goal:** Demonstrate complete validation workflow (perplexity → EI → knowledge → voice)
- **Essential:** Quality tier decisions, key metrics visibility, actionable summary
- **Non-Essential:** Deep drill-downs, advanced analytics, enterprise approval workflows

---

## PHASE 2: Integration Planning

### Unified UX Flow Design

**Single Validation Dashboard Concept:**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Training Job #abc123 - Validation Results                           │
│ Status: ✓ Validation Complete | Overall Quality: 34% improvement (Strong)   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ COMBINED QUALITY SCORECARD                                              │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────┐ │
│ │ │Perplexity│ │   EI    │ │Knowledge│ │  Voice  │ │ OVERALL QUALITY    │ │
│ │ │   31%   │ │   41%   │ │   93%   │ │   88%   │ │ ✓ Production Ready │ │
│ │ │  ↑ Prod │ │↑ Except.│ │⚠ Minor │ │ ✓ Strong│ │     34% avg        │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────────────┘ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION 1: Perplexity Improvement (FR6.1.1 Simplified)                  │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Quality: ✓ Production Ready (31.4% improvement)                   │    │ │
│ │ │ Baseline: 24.5 → Trained: 16.8 | Target: ≥30%                    │    │ │
│ │ │ [View Category Breakdown ▼] [Export Report]                       │    │ │
│ │ └──────────────────────────────────────────────────────────────────┘    │ │
│ │ Category Summary (FR6.1.2 Simplified):                                  │ │
│ │   🏆 Best: Anxious Investor (42%) | ⚠ Needs Work: Pragmatic Skeptic (23%)│
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION 2: Emotional Intelligence Benchmarks (FR6.2.1/2 Simplified)     │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Quality: ✓ Exceptional EI (41% improvement)                       │    │ │
│ │ │ 3.2/5 → 4.5/5 | Empathy: 48% ↑ | Clarity: 32% ↑ | Approp: 42% ↑   │    │ │
│ │ │ [View Before/After Examples ▼] [Export Report]                    │    │ │
│ │ └──────────────────────────────────────────────────────────────────┘    │ │
│ │ ⚠ Regression Alert: 0 scenarios show regression (no issues detected)   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION 3: Knowledge Validation (FR6.3.1/2 Simplified)                  │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Financial Knowledge: ⚠ Minor Loss (93% retained)                  │    │ │
│ │ │ 28/30 correct | Baseline: 97% | 2 questions failed                │    │ │
│ │ │ Domain Knowledge: ✓ Acquired (80%)                                │    │ │
│ │ │ 32/40 correct | +50pp gain from baseline                          │    │ │
│ │ │ [View Failed Questions ▼] [Export Report]                         │    │ │
│ │ └──────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION 4: Brand Voice Consistency (FR6.4.1 Simplified)                 │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐    │ │
│ │ │ Voice: ✓ Strong Alignment (88% consistency)                       │    │ │
│ │ │ Warmth: 86% | Prof: 90% | Clarity: 84% | Empathy: 92% | Empower: 78% │ │
│ │ │ [View Voice Examples ▼] [Export Report]                           │    │ │
│ │ └──────────────────────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ FOOTER: Quality Gate Decision                                           │ │
│ │ ┌────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Status: ✓ Production Ready | All critical metrics pass              │ │ │
│ │ │ [Export Full Validation Report] [Approve & Deploy] [Request Review] │ │ │
│ │ └────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### User Interaction Flow
1. **Page Load:** User navigates to completed training job → Validation dashboard loads
2. **View Overview:** All 4 metric sections visible with summary scores
3. **Drill Down (Optional):** Click expandable sections for more details
4. **Export:** Single "Export Full Validation Report" covers all metrics
5. **Decision:** Approve & Deploy or Request Review based on quality gates

---

## PHASE 3: POC-Optimized Feature Set

### Page Count Optimization

**Original Total: 24 pages across 8 FRs**
- FR6.1.1: 3 pages
- FR6.1.2: 3 pages
- FR6.2.1: 3 pages
- FR6.2.2: 3 pages
- FR6.3.1: 3 pages
- FR6.3.2: 3 pages
- FR6.4.1: 3 pages
- FR6.4.2: 3 pages

**Combined & Simplified: 10 pages**

1. **Validation Dashboard - Overview** (1 page)
   - Combined quality scorecard with all 4 metrics
   - All sections collapsed, showing summary scores
   - Quality gate decision footer

2. **Validation Dashboard - Perplexity Expanded** (1 page)
   - Perplexity section expanded with details
   - Bar chart, category summary visible
   - Other sections collapsed

3. **Validation Dashboard - EI Expanded** (1 page)
   - EI section expanded with dimension breakdown
   - Top 3 before/after examples visible
   - Other sections collapsed

4. **Validation Dashboard - Knowledge Expanded** (1 page)
   - Knowledge section expanded
   - Retention + domain acquisition visible
   - Failed questions summary

5. **Validation Dashboard - Voice Expanded** (1 page)
   - Voice section expanded
   - 5 dimension scores, top 3 examples
   - Other sections collapsed

6. **Validation Dashboard - Quality Gate Warning** (1 page)
   - One or more metrics below threshold
   - Warning banner, action buttons visible
   - Recommendations summary

7. **Before/After Example Modal** (1 page)
   - Detail view of single comparison
   - Works for EI, knowledge, and voice examples

8. **Export Report Preview Modal** (1 page)
   - Combined report preview
   - PDF format with all sections

9. **Mobile Layout - Dashboard** (1 page)
   - Responsive single-column layout
   - Stacked metric cards

10. **Mobile Layout - Expanded Section** (1 page)
    - Mobile view with one section expanded

**Reduction: 24 → 10 pages (58% reduction)**

---

## Reduction Strategy Summary
- Consolidated 8 FR validation cards into single dashboard with expandable sections
- Removed separate detailed drill-down screens (modals handle detail views)
- Combined export workflows into single unified export
- Simplified quality gate to overview + warning state
- Mobile layouts condensed to essential views
