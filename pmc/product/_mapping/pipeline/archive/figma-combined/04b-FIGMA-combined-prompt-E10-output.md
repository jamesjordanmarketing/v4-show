# LoRA Pipeline - Stage 10 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** January 4, 2026  
**Stage:** Stage 10 — Results Dashboard & Traceability (Complete New Page)  
**Section ID:** E10  
**Optimization:** Proof-of-Concept (POC) - Comprehensive results analysis with full traceability

**Generated From:**
- Source Document: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\model-training-philosophy_v1.md
- Section: UI Requirements (lines 2115-2316), Results Dashboard implementation
- Philosophy: Measurable excellence, complete traceability, research-grade documentation

---

## Prompt for Figma Make AI

**Title:** Stage 10 — Results Dashboard & Traceability - Complete Integrated Wireframe System

**Context Summary**

This stage introduces a comprehensive results dashboard page that provides complete visibility into training outcomes, detailed metrics analysis, and full traceability information. After training completes successfully, users navigate to a dedicated results page where they can view summary metrics in prominent cards, analyze training loss progression through time-series charts, explore all collected metrics (universal, domain, specialized) in organized tables, access measurement methodology documentation for every metric, download model adapter files, view complete traceability information (framework version, engine used, dataset, timestamps), and export results in multiple formats (CSV, JSON, PDF). The interface prioritizes satisfaction through tangible results, confidence through measurable outcomes, professionalism through comprehensive documentation, and trust through complete transparency and traceability.

**Journey Integration**

- **Stage 10 User Goals:** 
  - Validate training success through objective metrics
  - Understand final model quality and performance
  - Access trained model files for deployment
  - Generate reports for stakeholders and clients
  - Trace exact configuration and methodology used
  - Export results for further analysis
  - Archive training documentation for compliance
  - Compare results against baselines and previous runs

- **Key Emotions:** 
  - Relief (training completed successfully) → Satisfaction (tangible results delivered) → Confidence (metrics validate quality) → Pride (measurable improvements achieved) → Professionalism (comprehensive documentation available) → Trust (complete traceability ensures reproducibility)

- **Progressive Disclosure:** 
  - **Basic:** Summary cards with key metrics, download adapters button, time-series loss chart
  - **Advanced:** Detailed metrics tables with all measurements, methodology links, traceability panel
  - **Expert:** (Reserved for future - metric correlation analysis, comparative baselines, reproducibility packages)

- **Persona Adaptations:** 
  - AI Engineers need technical metrics, model files, and methodology documentation for validation
  - Quality Analysts need detailed metrics breakdown, comparison data, and measurement protocols
  - Business Owners need executive summaries, client-ready reports, and ROI justification
  - Operations Managers need traceability information, cost summaries, and archival documentation
  - All personas benefit from clear, professional, comprehensive results presentation

**Wireframe Goals**

- Display training outcomes prominently through summary metric cards (Final Loss, Training Time, Cost, etc.)
- Visualize training progression through interactive loss chart showing improvement over time
- Organize all collected metrics into clear categories (Universal, Domain, Specialized) with tabbed interface
- Enable metric exploration through sortable, searchable detailed metrics table
- Provide methodology transparency through inline documentation links and metric detail modals
- Display complete traceability information (framework version, engine, dataset, configuration, timestamps)
- Support multiple export formats (CSV for analysis, JSON for APIs, PDF for reports)
- Enable immediate model file access through prominent download buttons with file size information
- Maintain professional design suitable for client presentations and stakeholder reports
- Ensure responsive design works on desktop, tablet, and mobile for on-the-go access

**Explicit UI Requirements**

---

## SECTION 1: Page Layout & Navigation

**Page URL:** `/training/jobs/[jobId]/results`

**Accessibility:** 
- Available only for jobs with status='completed'
- Redirects to job detail page if job not completed
- Breadcrumb: Home → Training Jobs → [Job Name] → Results

**Page Header:**
- Back button: Returns to job detail page (`/training/jobs/[jobId]`)
- Title: "Training Results" (H1, 32px, bold)
- Subtitle: "Job ID: {jobId}" (gray, 14px, mono font for ID)
- Job name: "{Job Name}" (gray, 16px, below subtitle)
- Timestamp: "Completed {timestamp}" (gray, 14px, relative time format)

**Header Actions (Right-aligned):**
- Button: "Export Results" (outline button, blue)
  - Icon: Download icon
  - Click: Opens export format selection dropdown
  - Options: "Export as CSV", "Export as JSON", "Generate PDF Report"
- Button: "View Training Job" (outline button, gray)
  - Icon: External link
  - Click: Opens job detail page in new tab

**Page Layout:**
- Max width: 1280px (centered)
- Sections stack vertically with consistent spacing (32px gap)
- Background: Light gray (#F9FAFB) for page, white cards for content

---

## SECTION 2: Summary Metrics Cards (FR10.1.1)

**Section Title:** "Training Summary" (H2, 24px, semibold, margin-bottom: 16px)

**Card Grid Layout:**
- Columns: 4 cards on desktop, 2 on tablet, 1 on mobile
- Gap: 20px between cards
- Card styling: White background, border (1px gray), rounded (8px), shadow (subtle)

**Card Design Pattern (All cards share this structure):**
- Height: 140px (fixed for visual consistency)
- Padding: 20px
- Layout: Icon (top-left) + Label (below icon) + Value (large, prominent) + Trend (if applicable)

### Card 1: Final Loss

**Content:**
- Icon: Chart line down (blue, 24px)
- Label: "Final Loss" (gray, 13px, uppercase)
- Value: "0.0892 nats" (32px, bold, black)
- Trend: Green down arrow + "82% improvement" (green, 14px)
  - Calculated as: (initial_loss - final_loss) / initial_loss * 100
- Context: "Initial: 0.4521" (gray, 12px, small text below trend)

**States:**
- Good: Loss < 0.5 (green trend)
- Fair: Loss 0.5-1.5 (blue trend)
- Concerning: Loss > 1.5 (orange trend)

### Card 2: Training Time

**Content:**
- Icon: Clock (purple, 24px)
- Label: "Training Time" (gray, 13px, uppercase)
- Value: "4h 23m" (32px, bold, black)
- Comparison: "vs. estimated 4h 45m" (gray, 14px)
- Status: "Under estimate" with green checkmark (green, 12px)

**Calculation:**
- Formats seconds into human-readable duration
- Shows comparison to initial estimate from E01 configuration
- Indicates if under/over estimate

### Card 3: Total Cost

**Content:**
- Icon: Dollar sign (green, 24px)
- Label: "Total Cost" (gray, 13px, uppercase)
- Value: "$27.45" (32px, bold, black)
- Comparison: "vs. estimated $28.50" (gray, 14px)
- Status: "Under budget" with green checkmark (green, 12px)
- Breakdown link: "View breakdown" (blue, 12px, underlined)
  - Click: Scrolls to cost details section (future enhancement)

**Calculation:**
- Sum of compute cost + storage cost + metric evaluation cost
- Compares to estimated cost from E01 configuration

### Card 4: Specialized Metric (Conditional)

**Visibility:** Only shown if specialized metrics were collected

**Content (Example: Emotional Arc Fidelity):**
- Icon: Heart with chart (purple, 24px)
- Label: "Emotional Arc Fidelity" (gray, 13px, uppercase)
- Value: "87.2%" (32px, bold, black)
- Rating: "Excellent" (green badge, 12px)
- Help icon: Opens metric detail modal

**Rating Thresholds:**
- Excellent: ≥85% (green)
- Good: 70-84% (blue)
- Fair: 50-69% (yellow)
- Poor: <50% (red)

**Alternative (if no specialized metrics):**
- Card 4 shows: "Throughput" or "GPU Efficiency" or other relevant metric

---

## SECTION 3: Training Loss Chart (FR10.1.2)

**Section Title:** "Training Loss Over Time" (H2, 24px, semibold, margin-bottom: 16px)

**Card Container:**
- Background: White
- Border: 1px gray
- Border radius: 8px
- Padding: 24px
- Height: 400px (chart area ~350px after padding)

**Chart Type:** Line chart (time-series)

**Chart Configuration:**
- X-axis: Training steps (or epochs, user-selectable)
- Y-axis: Loss value
- Line: Blue (#3B82F6), 2px width, smooth curves
- Data points: Small circles (4px) on line, visible on hover
- Grid: Light gray horizontal lines for readability
- Background: White

**Chart Features:**

### Hover Interaction
- Tooltip appears on hover over data point
- Content:
  - Step: "Step 1,250"
  - Loss: "0.2345 nats"
  - Epoch: "Epoch 2 of 5"
  - Timestamp: "2026-01-04 14:23:15"
- Style: White card with shadow, positioned above cursor

### Zoom & Pan
- Mouse wheel: Zoom in/out on X-axis
- Click + drag: Pan along X-axis
- Double-click: Reset zoom to full view
- Zoom controls: +/- buttons in top-right of chart

### Axis Toggle
- Toggle button: "View by Steps" / "View by Epochs" (top-right)
- Changes X-axis granularity
- Default: Steps (more detailed)

### Additional Lines (Optional)
- Validation loss: Red dashed line (if validation data available)
- Legend: Top-right corner, toggleable lines
- Baseline: Gray horizontal line (if baseline comparison available)

**Data Points:**
- Frequency: Every N steps (e.g., every 100 steps for readability)
- Total points: Max 200 points (downsampled for performance)
- Smoothing: Optional smoothing toggle (removes noise)

**Empty State:**
- Message: "Loss data not available"
- Icon: Chart icon (gray)
- Reason: "Loss history was not recorded for this job"

**Error State:**
- Message: "Unable to load chart data"
- Action: "Retry" button
- Fallback: Shows table of loss values if chart fails

**Export:**
- Button: "Export Chart Data" (top-right, small)
- Format: CSV with columns: step, epoch, loss, timestamp
- Filename: `training-loss-{jobId}.csv`

---

## SECTION 4: Detailed Metrics Table (FR10.1.3)

**Section Title:** "All Collected Metrics" (H2, 24px, semibold, margin-bottom: 8px)  
**Subtitle:** "Complete measurements with methodology and traceability" (gray, 14px, margin-bottom: 16px)

**Card Container:**
- Background: White
- Border: 1px gray
- Border radius: 8px
- Padding: 24px

**Metrics Organization:** Tabbed interface (same pattern as E09)

**Tab Navigation:**
- Layout: Horizontal tabs below section title
- Tabs: "Universal (4)" | "Domain (2)" | "Specialized (3)"
- Active tab: Blue underline, bold text
- Inactive tabs: Gray text, regular weight
- Tab counts: Number of metrics in each category

**Table Structure (Within Each Tab):**

### Table Columns
1. **Metric Name** (35% width)
   - Format: Bold metric name (14px)
   - Sub-text: Brief description (gray, 12px)
   - Help icon: Opens methodology modal

2. **Value** (20% width)
   - Format: Large number (16px, bold)
   - Unit: Small text (12px, gray)
   - Color-coded based on quality (green=good, red=poor)

3. **Unit** (15% width)
   - Format: Text (13px, gray)
   - Examples: "nats", "seconds", "score", "percentage"

4. **Interpretation** (20% width)
   - Format: Badge with rating
   - Examples: "Excellent" (green), "Good" (blue), "Fair" (yellow), "Poor" (red)

5. **Actions** (10% width)
   - Icon button: "View Details" (eye icon)
   - Icon button: "View Methodology" (book icon)

### Table Features

**Sorting:**
- Click column header: Sort ascending/descending
- Default sort: By metric name (alphabetical)
- Sort indicator: Arrow icon in header
- Multi-column sort: Not supported in POC

**Search/Filter:**
- Search box: Above table, right-aligned
- Placeholder: "Search metrics..."
- Searches: Metric name and description
- Debounced: 300ms delay
- Clear button: X icon appears when text entered

**Row Hover:**
- Background: Light gray (#F3F4F6)
- Cursor: Pointer (entire row clickable)
- Click: Opens metric detail modal

**Responsive:**
- Desktop: All 5 columns visible
- Tablet: Actions column icons smaller, name/value prioritized
- Mobile: Transforms to card layout (same as E09)

### Universal Metrics Tab Content (Example)

**Metrics Displayed:**
1. **Training Loss**
   - Value: 0.0892 nats
   - Interpretation: "Excellent" (green badge)
   - Description: Cross-entropy loss on training data

2. **Training Time**
   - Value: 4h 23m
   - Interpretation: "Within estimate" (blue badge)
   - Description: Total time spent training

3. **GPU Utilization**
   - Value: 94.5%
   - Interpretation: "Excellent" (green badge)
   - Description: Average GPU compute utilization

4. **Memory Peak**
   - Value: 72.3 GB
   - Interpretation: "Good" (blue badge)
   - Description: Peak GPU memory consumption

5. **Throughput**
   - Value: 1,285 tok/s
   - Interpretation: "Good" (blue badge)
   - Description: Average tokens processed per second

### Specialized Metrics Tab Content (Example)

**Metrics Displayed (if collected):**
1. **Emotional Arc Fidelity**
   - Value: 0.872 score
   - Interpretation: "Excellent" (green badge)
   - Description: Adherence to emotional arc progression

2. **Empathy Score**
   - Value: 0.791 score
   - Interpretation: "Good" (blue badge)
   - Description: Empathetic language quality

3. **Multi-Perspective Consensus**
   - Value: 0.823 score
   - Interpretation: "Good" (blue badge)
   - Description: Quality of multi-perspective synthesis

**Empty State (if no specialized metrics):**
- Icon: Info circle (gray)
- Message: "No specialized metrics were collected for this training job"
- Link: "Learn about specialized metrics" (blue, opens docs)

---

## SECTION 5: Metric Detail Modal (FR10.1.4)

**Trigger:** Click metric row in table, or click "View Details" icon

**Modal Design:**
- Overlay: Semi-transparent black (60% opacity)
- Container: 800px width, max-height 90vh, scrollable
- Background: White
- Shadow: Large drop shadow
- Close: X button (top-right) + ESC key + click overlay

**Modal Structure:**

### Header Section
- Metric name (H2, 28px, bold)
- Metric level badge: "Universal" / "Domain" / "Specialized" (color-coded)
- Close button (X icon, 28px, top-right)

### Section 1: Current Result
- Background: Light blue (#EFF6FF)
- Padding: 20px
- Border-radius: 8px
- Content:
  - Label: "Result for this training job" (gray, 13px)
  - Value: Large display (48px, bold, black)
  - Interpretation: Badge (e.g., "Excellent", green background)
  - Context: "This places the model in the top 15% of similar training runs" (gray, 14px)

### Section 2: Description
- Title: "What This Metric Measures" (H3, 18px, semibold, margin-top: 24px)
- Text: Full description (15px, line-height: 1.6, black)
- Use case: When this metric is important and why

### Section 3: Measurement Methodology
- Title: "How It Was Measured" (H3, 18px, semibold, margin-top: 24px)
- Content:
  - Method description (15px)
  - Numbered steps if complex process
  - Data sources used
  - Calculation formula (if applicable, in code block)
  - Update frequency during training

### Section 4: Interpretation Guide
- Title: "Interpreting This Result" (H3, 18px, semibold, margin-top: 24px)
- Visual range indicator:
  - Horizontal bar showing ranges
  - Color zones: Green (excellent), Blue (good), Yellow (fair), Red (poor)
  - Marker indicating current value position
  - Range labels with thresholds
- Contextual guidance:
  - What excellent/good/fair/poor means for this metric
  - When to be concerned
  - What actions to take if poor

### Section 5: Historical Context (if available)
- Title: "Historical Comparison" (H3, 18px, semibold, margin-top: 24px)
- Mini chart: Last 10 training runs for this dataset type
- Your result: Highlighted bar or point
- Average: Horizontal line showing average
- Text: "Your result is 12% better than average for this dataset type"

### Section 6: Measurement Metadata
- Title: "Measurement Details" (H3, 18px, semibold, margin-top: 24px)
- Metadata table:
  - Framework version: "1.0.0"
  - Measured at: "2026-01-04 18:45:32 UTC"
  - Measurement duration: "45 seconds"
  - Data points used: "1,250 test samples"
  - Measurement confidence: "High (100% data coverage)"

### Section 7: Related Documentation
- Title: "Learn More" (H3, 18px, semibold, margin-top: 24px)
- Links:
  - "Full Methodology Documentation" (opens in new tab)
  - "Research Paper Reference" (if applicable)
  - "Example Use Cases" (internal documentation)
  - "Community Discussions" (if applicable)

**Modal Footer:**
- Primary action: "Got It" button (blue, large, closes modal)
- Secondary action: "Export Metric Report" (outline button, generates single-metric PDF)
- Alignment: Right

---

## SECTION 6: Model Files Section (FR10.1.5)

**Section Title:** "Trained Model Files" (H2, 24px, semibold, margin-bottom: 16px)

**Card Container:**
- Background: White
- Border: 1px gray
- Border radius: 8px
- Padding: 24px

**Layout:** Two-column layout (left: actions, right: file details)

### Left Column: Primary Actions

**Download Adapters Button:**
- Type: Primary button (large)
- Style: Green background (#10B981), white text, 48px height
- Label: "Download LoRA Adapters"
- Icon: Download icon (left of text)
- Badge: File size "442 MB" (gray, 12px, below button)
- Click: Initiates download of ZIP file

**Download Progress (if active):**
- Replaces button during download
- Progress bar: Blue, animated
- Text: "Downloading... 45% (195 MB of 442 MB)"
- Cancel button: Small, gray, below progress bar

**Download Deployment Package Button:**
- Type: Secondary button (large)
- Style: Blue outline, blue text, 48px height
- Label: "Download Deployment Package"
- Icon: Package icon (left of text)
- Badge: File size "650 MB" (gray, 12px, below button)
- Tooltip: "Includes adapters + inference scripts + documentation"

### Right Column: File Details

**Files Included List:**
- Title: "Adapter Files" (semibold, 14px, margin-bottom: 12px)
- Layout: Vertical list with file icons

**File Items:**
1. `adapter_model.safetensors` — 442 MB
   - Icon: Database file icon
   - Format: Bold filename + gray file size

2. `adapter_config.json` — 2 KB
   - Icon: Code file icon
   - Preview: Click to view JSON in modal

3. `training_summary.json` — 5 KB
   - Icon: Document icon
   - Contains: All metrics + configuration

4. `README.txt` — 8 KB
   - Icon: Text file icon
   - Contains: Usage instructions

**Total:** "Total size: 449 MB" (gray, 12px, below list)

**Storage Information:**
- Subsection title: "Storage Details" (semibold, 14px, margin-top: 20px)
- Storage path: `job_{jobId}/adapters/` (mono font, 12px)
  - Copy button: Clipboard icon (copies path)
- Retention: "Permanent (until manually deleted)" (gray, 12px)
- Downloads: "Downloaded 3 times" (gray, 12px)
  - Last download: "Last: 2 hours ago" (gray, 11px)

**Download Links Expiration:**
- Signed URLs: Valid for 7 days
- Expiration notice: "Links expire: Jan 11, 2026" (orange text, 12px)
- Regenerate button: "Regenerate Links" (small, outline button)
  - Shown if links expired or about to expire (<24h remaining)

---

## SECTION 7: Traceability Information Panel (FR10.1.6)

**Section Title:** "Traceability Information" (H2, 24px, semibold, margin-bottom: 8px)  
**Subtitle:** "Complete provenance for reproducibility and compliance" (gray, 14px, margin-bottom: 16px)

**Card Container:**
- Background: Light gray (#F9FAFB) - distinctive from other white cards
- Border: 2px solid blue (#3B82F6) - emphasizes importance
- Border radius: 8px
- Padding: 24px

**Layout:** Grid with sections (2 columns on desktop, 1 on mobile)

### Column 1: Training Configuration

**Subsection Title:** "Training Configuration" (semibold, 16px, margin-bottom: 12px)

**Information Rows:**
- Framework Version: "BrightRun Training Framework v1.0.0"
- Engine: "TRL Standard v1.0.0"
- Engine Features: Badges for "4-bit QLoRA", "Role Alternation Fixing"
- Model: "mistralai/Mistral-7B-Instruct-v0.3"
- Quantization: "4-bit NF4 with double quantization"
- LoRA Config: "Rank: 16, Alpha: 32, Dropout: 0.1"

**Format:**
- Label: Gray, 13px, regular weight
- Value: Black, 13px, semibold
- Row spacing: 8px
- Copyable: Click icon to copy individual values

### Column 2: Dataset & Execution

**Subsection Title:** "Dataset & Execution" (semibold, 16px, margin-bottom: 12px)

**Information Rows:**
- Dataset: "emotional-alignment-v3" (link to dataset page)
- Dataset Version: "v3.2.1 (snapshot at training time)"
- Conversations: "242 training pairs"
- Preset: "Balanced" (link shows full hyperparameters)
- GPU Configuration: "2x NVIDIA A100 80GB"
- Infrastructure: "RunPod Secure Cloud"

### Column 3: Metrics Configuration (Full Width)

**Subsection Title:** "Metrics Configuration" (semibold, 16px, margin-top: 20px, margin-bottom: 12px)

**Information:**
- Universal Metrics: "4 metrics (always collected)"
- Specialized Metrics: "3 metrics selected: Emotional Arc Fidelity, Empathy Score, Consensus Score"
- Measurement Framework: "v1.0.0"
- Measurement Timestamp: "2026-01-04 18:45:32 UTC"

### Column 4: Timestamps & Tracking (Full Width)

**Subsection Title:** "Execution Timeline" (semibold, 16px, margin-top: 20px, margin-bottom: 12px)

**Timeline Display:**
- Created: "2026-01-04 10:00:00 UTC" (gray)
- Started: "2026-01-04 10:15:32 UTC" (+15m queue time)
- Completed: "2026-01-04 14:38:47 UTC" (4h 23m training)
- Measured: "2026-01-04 14:45:32 UTC" (+7m evaluation)

**Format:** Vertical timeline with connecting lines

**Additional Tracking:**
- Job ID: `job_{jobId}` (mono font, copyable)
- Created by: "{user_email}" (link to user profile)
- Organization: "{org_name}" (if applicable)
- Tags: Badges for any tags (e.g., "production", "experiment-42")

### Actions

**Export Traceability Report:**
- Button: "Export Full Traceability Report" (blue, outline, full width)
- Icon: Document with checkmark
- Format: Generates comprehensive PDF with all traceability data
- Use cases: Compliance, audits, research publication

**Copy Configuration:**
- Button: "Copy Configuration JSON" (gray, outline, full width)
- Icon: Clipboard
- Action: Copies complete configuration as JSON to clipboard
- Use cases: Reproducing training, documentation, debugging

---

## SECTION 8: Export Functionality (FR10.1.7)

**Trigger:** Click "Export Results" button in page header

**Dropdown Menu:**
- Position: Below export button
- Background: White, shadow
- Border: 1px gray
- Options:
  1. "Export as CSV"
  2. "Export as JSON"
  3. "Generate PDF Report"

### Export Option 1: CSV

**Action:** Downloads CSV file  
**Filename:** `training-results-{jobId}-{timestamp}.csv`

**CSV Structure:**
```
Metric Category,Metric Name,Value,Unit,Interpretation
Universal,Training Loss,0.0892,nats,Excellent
Universal,Training Time,15780,seconds,Within estimate
Specialized,Emotional Arc Fidelity,0.872,score,Excellent
...
```

**Use Case:** Import into Excel/Google Sheets for analysis

### Export Option 2: JSON

**Action:** Downloads JSON file  
**Filename:** `training-results-{jobId}-{timestamp}.json`

**JSON Structure:**
```json
{
  "job_id": "job-abc123",
  "completed_at": "2026-01-04T14:38:47Z",
  "summary": {
    "final_loss": 0.0892,
    "training_time_seconds": 15780,
    "total_cost_usd": 27.45
  },
  "metrics": {
    "universal": [...],
    "specialized": [...]
  },
  "traceability": {...},
  "files": [...]
}
```

**Use Case:** API integration, programmatic analysis, archival

### Export Option 3: PDF Report

**Action:** Generates comprehensive PDF report (may take 5-10 seconds)

**Progress Indicator:**
- Loading overlay: "Generating PDF report..."
- Progress bar or spinner
- Cannot be cancelled once started

**PDF Structure:**
1. Cover page with job name, timestamp, organization logo
2. Executive summary (1 page)
   - Key metrics summary
   - Training outcome (success/quality rating)
   - High-level recommendations
3. Detailed metrics (2-3 pages)
   - All metrics tables
   - Loss chart visualization
   - Interpretation guides
4. Traceability information (1 page)
   - Complete configuration
   - Timeline
   - Reproducibility statement
5. Appendix
   - Methodology references
   - Technical specifications
   - File manifest

**Filename:** `training-report-{jobId}-{timestamp}.pdf`

**Use Cases:** Client deliverables, stakeholder reports, archival documentation

**Styling:** Professional, clean design with organization branding (if configured)

---

## SECTION 9: Responsive Design

**Desktop (≥1024px):**
- Summary cards: 4 columns
- Metrics table: All columns visible
- Traceability: 2 columns
- Model files: 2 columns
- Modals: 800px width

**Tablet (768px - 1023px):**
- Summary cards: 2 columns
- Metrics table: Condensed, 4 columns (actions smaller)
- Traceability: 1 column
- Model files: Stacked layout
- Modals: 90% width

**Mobile (<768px):**
- Summary cards: 1 column, full width
- Chart: Full width, touch-friendly zoom
- Metrics table: Card layout (similar to E09 mobile)
- Traceability: 1 column, collapsed sections
- Model files: Stacked, buttons full width
- Modals: Full width, 16px margin

**Mobile Optimizations:**
- Larger touch targets (48x48px minimum)
- Simplified chart interactions (pinch to zoom)
- Collapsible sections for traceability
- Sticky header with export button always accessible

---

## SECTION 10: Loading & Error States

**Page Loading:**
- Skeleton loaders for all sections
- Summary cards: 4 shimmer rectangles
- Chart: Large shimmer rectangle (400px height)
- Tables: Shimmer rows (5 rows per table)
- Loads sections progressively (summary first, chart second, etc.)

**Partial Load Errors:**
- Section fails to load: Show error state in that section only
- Error message: "Unable to load {section name}"
- Action: "Retry" button
- Rest of page remains functional

**Complete Load Failure:**
- Error page: "Unable to load training results"
- Possible reasons: Job not found, results not available, permissions issue
- Actions: "Return to Job Detail", "Retry Loading"

**Export Errors:**
- CSV/JSON export fails: Toast notification with error message
- PDF generation fails: Modal with detailed error and "Try Again" option
- Network timeout: Retry mechanism with exponential backoff

**Download Errors:**
- File download fails: Toast notification "Download failed. Please try again."
- Expired links: Banner "Download links expired" with "Regenerate" button
- Storage access error: "Unable to access model files. Contact support."

---

## SECTION 11: Accessibility

**Keyboard Navigation:**
- Tab order: Header actions → Summary cards → Chart → Metrics table → Files section → Traceability
- Enter/Space: Activate buttons, open modals, export actions
- Arrow keys: Navigate metrics table rows
- ESC: Close modals

**Screen Reader:**
- Page: "Main region, Training Results for job {jobId}"
- Summary cards: "4 summary cards. Card 1 of 4, Final Loss: 0.0892 nats, Excellent result, 82% improvement"
- Chart: "Interactive line chart showing training loss over time. Final loss: 0.0892 at step 10,000"
- Metrics table: "Table, All Collected Metrics, 12 metrics across 3 categories"
- Export: "Button, Export Results, opens menu with 3 options"

**Focus Management:**
- Modal opens: Focus moves to modal close button
- Modal closes: Focus returns to trigger element
- Table row click: Focus moves to modal
- Export completes: Focus returns to export button

**Color Contrast:**
- All text: WCAG AA compliant (4.5:1 minimum)
- Chart: High contrast colors, not color-only (also uses shapes)
- Badges: Sufficient contrast for text on background

**Motion:**
- Respects `prefers-reduced-motion`
- Chart animations: Disabled if motion preference set
- Loading animations: Static indicators instead of spinners

---

## SECTION 12: Performance Optimization

**Initial Load:**
- Critical content first: Summary cards and chart
- Lazy load: Detailed metrics tables load when visible
- Image optimization: No images in POC (future: optimized PNG for charts)
- Code splitting: Chart library loaded separately

**Data Management:**
- Metrics data: Cached in component state
- Chart data: Downsampled to max 200 points for performance
- Large files: Download links pre-signed, no server processing
- Exports: Generated on-demand, not pre-computed

**Rendering:**
- Virtualization: Not needed (tables are small in POC)
- Memoization: Summary cards and metrics rows memoized
- Debouncing: Search input debounced 300ms

**Network:**
- Single API call: Fetches all results data at once
- No polling: Results are static (training completed)
- Compression: Gzip enabled for all responses
- CDN: Model files served from S3/CDN

---

## SECTION 13: Testing & Validation

**Functionality Testing:**
- All metrics display correctly with proper formatting
- Charts render with accurate data
- Export generates valid CSV/JSON/PDF files
- Model file downloads work correctly
- Modals open/close properly
- Links navigate correctly

**Data Accuracy:**
- Metric values match backend calculations
- Traceability information matches job configuration
- Timestamps display in correct timezone
- File sizes accurate

**User Experience:**
- Page loads within 2 seconds on 3G connection
- Charts are interactive and responsive
- Export completes within 10 seconds
- No layout shift during progressive loading
- Mobile experience smooth and usable

**Edge Cases:**
- No specialized metrics: UI handles gracefully
- Very long job names: Truncate with ellipsis
- Extremely high/low metric values: Formats correctly
- Missing data: Shows appropriate empty states
- Old jobs (created before traceability): Shows fallback values

---

## Design System Consistency

**Reused from E01-E09:**
- Card styling (borders, shadows, padding, radius)
- Button styles (primary, secondary, outline)
- Badge components (status, category indicators)
- Tab navigation (underline active, gray inactive)
- Table styling (headers, rows, hover)
- Modal structure (overlay, container, header/footer)
- Typography scale (H1-H6, body, helper text)
- Color palette (blues, grays, semantic colors)
- Icons (consistent style across all sections)

**New Patterns Introduced in E10:**
- Summary metric cards (icon + label + value + trend)
- Interactive time-series chart
- Traceability information grid
- Export format selection dropdown
- File download progress indicators
- Comprehensive methodology modals

**Color Coding:**
- Green: Excellent results, positive trends
- Blue: Good results, informational
- Yellow/Orange: Fair results, warnings
- Red: Poor results, errors
- Gray: Neutral, secondary information
- Purple: Specialized metrics, advanced features

---

**End of E10 Wireframe Prompt**

This wireframe prompt provides complete specifications for the comprehensive results dashboard and traceability page, delivering measurable excellence through detailed metrics analysis, complete transparency through full traceability information, and professional documentation suitable for client deliverables and research publication. The design follows established E01-E09 patterns while introducing new capabilities aligned with the philosophical framework's emphasis on measurability, reproducibility, and research-grade rigor.

