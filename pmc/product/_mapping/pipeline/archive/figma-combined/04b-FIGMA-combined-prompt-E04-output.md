# LoRA Pipeline - Stage 4 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** 2025-12-19  
**Stage:** Stage 4 — Model Artifacts & Downloads  
**Section ID:** E04  
**Optimization:** Proof-of-Concept (POC) - Essential features only

**Generated From:**
- Input File: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FIGMA-wireframes-output-E04.md
- FR Specifications: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\fr-maps\04-pipeline-FR-wireframes-E04.md
- Analysis: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-E04-WORKSHEET.md

---

## Prompt for Figma Make AI

**Title:** Stage 4 — Model Artifacts & Downloads - Complete Integrated Wireframe System

**Context Summary**

This stage provides users with comprehensive access to all training job outputs and deliverables after successful training completion. Users can download trained LoRA adapters in convenient ZIP format, manage storage and versioning, export detailed training metrics in CSV or JSON format for analysis, generate professional PDF reports for client presentations, and download complete deployment packages with inference scripts and documentation. The interface prioritizes immediate access to tangible training outcomes, transparent artifact management, and professional deliverables that transform training investment into deployable assets and client-ready documentation.

**Journey Integration**

- **Stage 4 User Goals:** 
  - Download trained LoRA adapters for immediate use
  - Access complete training metrics for analysis and validation
  - Generate professional reports for client deliverables
  - Obtain deployment-ready packages for production integration
  - Manage storage efficiently across multiple training runs
  - Share training outcomes with stakeholders securely

- **Key Emotions:** 
  - Relief (training succeeded, tangible results) → Satisfaction (deliverables ready) → Confidence (quality validated, metrics accessible) → Professionalism (client-ready reports) → Eagerness (deployment-ready packages)

- **Progressive Disclosure:** 
  - **Basic:** One-click downloads with essential metadata (file sizes, package contents)
  - **Advanced:** Format selection for exports, preview options, storage management
  - **Expert:** (Removed for POC - bulk operations, cost projections, API templates)

- **Persona Adaptations:** 
  - AI Engineers need quick adapter downloads and deployment packages for integration
  - Quality Analysts need CSV exports for spreadsheet analysis and validation
  - Business Owners need PDF reports for client presentations and professional deliverables
  - Technical Leads need storage oversight and deployment package management

**Wireframe Goals**

- Enable immediate one-click download of trained LoRA adapters with progress feedback
- Provide transparent storage metadata and simple artifact management
- Support flexible metrics export in CSV or JSON format
- Generate professional PDF reports with preview and sharing capabilities
- Deliver complete deployment packages with inference scripts and documentation
- Indicate upcoming API template features without blocking current workflow
- Handle large file downloads (200-700MB) with clear progress indicators
- Maintain secure access with signed URL expiration and regeneration

**Explicit UI Requirements**

### SECTION 1: Model Artifacts Overview (FR4.1.1 + FR4.1.2 - Simplified)

**Section Container:**
- Position: Top section of Job Details page
- Background: White card with subtle shadow
- Title: "Model Artifacts" (H2, 20px, bold)
- Subtitle: "Download trained adapters and manage storage" (gray, 14px)

**Download Adapters Button:**
- Type: Primary action button
- Style: Green background (#10B981), white text, bold, large (44px height)
- Label: "Download Adapters" with download icon (left of text)
- Position: Prominent, left side of section
- States:
  - Enabled: Green, cursor pointer
  - Loading: Green with spinner, text "Downloading..."
  - Disabled: Gray (if link expired, show "Regenerate" instead)

**Download Deployment Package Button:**
- Type: Secondary action button
- Style: Blue outline, blue text, large (44px height)
- Label: "Download Deployment Package" with package icon
- Position: Next to adapters button
- Additional info: "~650 MB" badge below button (gray text, 12px)

**Adapter Files Display:**
- Layout: Vertical list with icons
- Items:
  - `adapter_model.bin` — 442 MB (database icon)
  - `adapter_config.json` — 2 KB (code icon)
  - `training_summary.json` — 5 KB (document icon)
  - `README.txt` — 8 KB (text icon)
- Format: File name (bold, 14px) + size (gray, 12px) per row
- Total: "Total: 449 MB" (bottom of list)

**Storage Details Panel:**
- Layout: Light gray background (#F8F9FA), right side of section
- Content:
  - Storage path: `job_abc123xyz/adapters/` (copyable with button)
  - Retention: "Permanent" with "Edit" link
  - Downloads: "Downloaded 3 times" with timestamp link
  - Version: "Job #47 — Dec 18, 2025"
- Copy button: Icon-only button, tooltip "Copy storage path"

**Link Expiration Indicator:**
- Position: Below download buttons
- Format: "Link expires in 23 hours" (yellow text with clock icon)
- States:
  - Valid (>12 hrs): Gray text
  - Expires soon (<12 hrs): Yellow text with warning icon
  - Expired: Red text "Link Expired" with "Regenerate" button

**Delete Adapters Button:**
- Type: Destructive tertiary button
- Style: Red text, no background, "Delete Adapters" with trash icon
- Position: Bottom-right of section
- Behavior: Opens confirmation modal (see Modal section)

**NOT INCLUDED (removed for POC):**
- ❌ Download history table with timestamps and users
- ❌ README preview modal with collapsible sections
- ❌ Bulk selection checkboxes for multi-delete
- ❌ Version comparison side-by-side view
- ❌ Storage cost projections chart
- ❌ Retention policy configuration modal

### SECTION 2: Metrics & Reports (FR4.2.1 + FR4.2.2 - Simplified)

**Section Container:**
- Position: Second section of Job Details page
- Background: White card with subtle shadow
- Title: "Metrics & Reports" (H2, 20px, bold)
- Subtitle: "Export training data and generate client reports" (gray, 14px)

**Export Metrics Button:**
- Type: Secondary action button
- Style: Gray outline, dark text, medium size (40px height)
- Label: "Export Metrics" with table icon
- Position: Left side of section
- Behavior: Opens export configuration modal

**Generate Report Button:**
- Type: Secondary action button
- Style: Gray outline, dark text, medium size (40px height)
- Label: "Generate Report" with document icon
- Position: Next to export button
- Behavior: Opens generation progress, then preview

**Share Report Button:**
- Type: Tertiary button (text link style)
- Style: Blue text, underline on hover
- Label: "Share Report" with share icon
- Position: Next to generate button
- Behavior: Opens share link modal
- State: Disabled until report generated

**Metrics Summary:**
- Layout: Inline stats with icons
- Content:
  - "2,000 steps logged" (chart icon)
  - "Final loss: 0.287" (trending-down icon, green)
  - "Improvement: 80%" (up arrow, green badge)
- Format: Gray text, 14px

**Report Status:**
- If report exists: "Report ready — Preview →" (blue link)
- If report not generated: "No report yet — Generate to create PDF"
- If share link exists: "Share link expires Jan 17, 2026" (gray text)

**NOT INCLUDED (removed for POC):**
- ❌ Chart embedding option for exports
- ❌ JSON structure preview (nested format)
- ❌ Full PDF viewer with page navigation
- ❌ Export history table
- ❌ Report regeneration from history
- ❌ Share link usage tracking (view count)

### SECTION 3: Deployment (FR4.3.1 + FR4.3.2 - Simplified)

**Section Container:**
- Position: Third section of Job Details page
- Background: White card with subtle shadow
- Title: "Deployment" (H2, 20px, bold)
- Subtitle: "Production-ready packages and integration guides" (gray, 14px)

**Deployment Package Card:**
- Layout: Left 2/3 of section
- Background: Light blue tint (#EFF6FF)
- Content:
  - Title: "Complete Deployment Package" (bold, 16px)
  - Description: "Everything needed for production deployment" (gray, 14px)
  - Contents list (smaller text, 12px):
    - ✓ adapters/ folder (trained model files)
    - ✓ inference.py (runnable script)
    - ✓ requirements.txt (pinned dependencies)
    - ✓ README.md (setup and deployment guide)
    - ✓ example_prompts.json (10 domain samples)
    - ✓ training_summary.json (job metadata)
  - Size badge: "~650 MB" (gray, 12px)
  - GPU requirement: "Requires GPU (16GB+ VRAM)" (yellow warning badge)
- Buttons:
  - "View Contents" (secondary, opens preview modal)
  - "Download Package" (primary, green)

**API Template Card:**
- Layout: Right 1/3 of section
- Background: Light gray (#F8F9FA)
- Content:
  - Title: "API Server Template" (bold, 16px)
  - Badge: "Coming Q1 2026" (blue background, white text)
  - Description: "FastAPI, Docker, and Kubernetes templates for microservice deployment" (gray, 14px)
- Button: "Notify Me When Available" (secondary, gray outline)

**NOT INCLUDED (removed for POC):**
- ❌ README preview with collapsible sections
- ❌ Requirements.txt file preview
- ❌ Example prompts preview
- ❌ API template file tree structure
- ❌ API endpoints specification cards
- ❌ FastAPI code preview
- ❌ Docker/Kubernetes config tabs
- ❌ Cloud deployment guide sections
- ❌ Example API request with curl command

### MODAL: Download Progress (FR4.1.1, FR4.3.1)

**Modal Overlay:**
- Trigger: Click "Download Adapters" or "Download Package"
- Style: Centered modal, 400px width, white background, 8px border radius
- Overlay: 50% black opacity background

**Modal Content:**
- Title: "Downloading Adapters..." or "Downloading Deployment Package..."
- Progress bar: Linear, blue fill, gray background, rounded corners
- Percentage: "42%" (large, 24px, bold, right of progress bar)
- Details: "150 MB of 358 MB" (gray, 14px)
- Speed: "Download speed: 5 MB/s" (gray, 12px)
- Time remaining: "Estimated time: 1 minute 6 seconds" (gray, 12px)
- Cancel button: "Cancel" (red text, tertiary button)

**States:**
- In progress: Progress bar animating, percentage updating
- Completed: Progress bar full, checkmark icon, "Download complete!"
- Failed: Red X icon, "Download failed — Try again" with retry button

### MODAL: Export Metrics Configuration (FR4.2.1 - Simplified)

**Modal Overlay:**
- Trigger: Click "Export Metrics"
- Style: Centered modal, 500px width, white background, 8px border radius

**Modal Header:**
- Title: "Export Training Metrics" (H3, 18px, bold)
- Close button: X icon in top-right corner

**Format Selection:**
- Label: "Select Format" (bold, 14px)
- Radio buttons (vertical):
  - ◉ **CSV** — "Spreadsheet-compatible format for Excel, Google Sheets"
  - ○ **JSON** — "Structured data format for programmatic access"
- Default: CSV selected

**Preview Panel:**
- If CSV selected:
  - Title: "CSV Columns" (bold, 14px)
  - List: step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds
  - Note: "Contains 2,000 rows of training data" (gray, 12px)
- If JSON selected:
  - Title: "JSON Structure" (bold, 14px)
  - Brief: job_metadata, training_metrics[], final_metrics
  - Note: "Nested structure with complete job data" (gray, 12px)

**Filename Preview:**
- Label: "Filename" (gray, 12px)
- Value: "Elena-Financial-Balanced-metrics-2025-12-19.csv" (monospace font, copyable)

**Action Buttons:**
- "Download" (primary, blue, large)
- "Cancel" (secondary, gray outline)

### MODAL: Report Preview (FR4.2.2 - Simplified)

**Modal Overlay:**
- Trigger: Report generation completes or click "Preview →" link
- Style: Centered modal, 600px width, white background, scrollable

**Modal Header:**
- Title: "Training Report Preview" (H3, 18px, bold)
- Subtitle: "Elena Morales Financial — Balanced — Dec 18, 2025" (gray, 14px)
- Close button: X icon

**Report Thumbnail:**
- Display: Cover page image (scaled preview, max 300px height)
- Caption: "Professional PDF report — 5 pages" (gray, 12px)
- Sections listed:
  - Cover Page
  - Executive Summary (1 page)
  - Training Metrics (2 pages)
  - Cost Breakdown (1 page)
  - Appendix

**Action Buttons:**
- "Download PDF" (primary, green)
- "Generate Share Link" (secondary, blue outline)
- "Close" (tertiary, gray text)

### MODAL: Share Link (FR4.2.2 - Simplified)

**Modal Overlay:**
- Trigger: Click "Generate Share Link"
- Style: Centered modal, 450px width, white background

**Modal Header:**
- Title: "Share Training Report" (H3, 18px, bold)
- Close button: X icon

**Link Display:**
- Label: "Shareable Link" (bold, 14px)
- Input field: Read-only, full link text (truncated with ellipsis)
- Copy button: "Copy" (icon + text, blue)
- Feedback: "Copied!" toast on click (brief, 2 seconds)

**Expiration Info:**
- Text: "Link expires in 30 days (Jan 17, 2026)" (gray, 14px, clock icon)
- Note: "Anyone with this link can view the report" (gray, 12px)

**Share Options:**
- Email button: Opens mailto: with link
- Copy button: Copies link to clipboard (already mentioned above)

**Action Button:**
- "Done" (primary, blue)

### MODAL: Delete Confirmation (FR4.1.2 - Simplified)

**Modal Overlay:**
- Trigger: Click "Delete Adapters"
- Style: Centered modal, 450px width, white background
- Icon: Large red warning triangle at top

**Modal Header:**
- Title: "Delete Adapters Permanently?" (H3, 18px, bold, red)

**Warning Content:**
- Message: "This action cannot be undone. The following files will be permanently deleted:"
- File list:
  - adapter_model.bin (442 MB)
  - adapter_config.json (2 KB)
  - training_summary.json (5 KB)
  - README.txt (8 KB)
- Impact: "This will free 449 MB of storage." (gray, 14px)
- Audit note: "This action will be logged to the audit trail." (gray, 12px)

**Confirmation Checkbox:**
- Checkbox: "☐ I understand this deletion is permanent"
- Required: Delete button disabled until checked

**Action Buttons:**
- "Delete Permanently" (destructive, red background, disabled until checkbox checked)
- "Cancel" (secondary, gray outline)

### MODAL: Deployment Package Contents (FR4.3.1 - Simplified)

**Modal Overlay:**
- Trigger: Click "View Contents"
- Style: Centered modal, 550px width, white background, scrollable

**Modal Header:**
- Title: "Deployment Package Contents" (H3, 18px, bold)
- Package size: "~650 MB total" (gray badge)
- Close button: X icon

**Contents Checklist:**
- Layout: Vertical list with checkmarks and descriptions
- Items:
  1. ✓ **adapters/** — Trained LoRA adapter files (442 MB)
     - adapter_model.bin, adapter_config.json
  2. ✓ **inference.py** — Runnable Python script with CLI (4 KB)
     - Usage: `python inference.py "Your prompt here"`
  3. ✓ **requirements.txt** — Pinned dependencies (1 KB)
     - transformers, peft, torch, accelerate
  4. ✓ **README.md** — Complete deployment guide (15 KB)
     - Setup, Usage, Deployment options, Troubleshooting
  5. ✓ **example_prompts.json** — 10 domain prompts (5 KB)
     - Financial advisory examples for testing
  6. ✓ **training_summary.json** — Job metadata (5 KB)
     - Configuration, metrics, timestamps

**System Requirements:**
- Label: "System Requirements" (bold, 14px)
- Requirements:
  - Python 3.10+
  - GPU with 16GB+ VRAM (A10G, A100, H100)
  - ~5GB disk space for model + dependencies
- Badge: "GPU Required" (yellow warning)

**Quick Start Command:**
- Code block: `pip install -r requirements.txt && python inference.py "What are the benefits of a Roth IRA?"`
- Copy button: Icon-only (copies command)

**Action Buttons:**
- "Download Package" (primary, green, large)
- "Close" (secondary, gray outline)

---

## Interactions and Flows

### Flow 1: Initial Job Details Page Load
1. User navigates to completed training job details page
2. Page loads with three sections visible:
   - Model Artifacts section with download buttons
   - Metrics & Reports section with export options
   - Deployment section with package info
3. All primary action buttons enabled (green/blue)
4. Status indicators show initial state:
   - Link expires in X hours
   - No report generated yet
   - Deployment package ready

### Flow 2: Download Adapters
1. User clicks "Download Adapters" button (green)
2. Button shows loading spinner briefly
3. Download progress modal opens
4. Progress bar animates (0% → 100%)
5. Progress shows: "42%" + "150 MB of 358 MB"
6. On completion: Checkmark icon, "Download complete!"
7. Modal closes automatically (or user clicks X)
8. Toast notification: "Adapters downloaded. See README.txt for integration instructions."
9. Download count updates: "Downloaded 4 times"
10. Browser downloads ZIP file: `Elena-Financial-Balanced-adapters-job_abc123.zip`

### Flow 3: Export Metrics
1. User clicks "Export Metrics" button
2. Export configuration modal opens
3. Default: CSV format selected, preview shows columns
4. User optionally clicks JSON radio button
5. Preview updates to show JSON structure
6. User clicks "Download" button
7. File downloads instantly (no progress modal needed, small file)
8. Toast notification: "Metrics exported successfully."
9. Modal closes
10. Browser downloads: `Elena-Financial-Balanced-metrics-2025-12-19.csv`

### Flow 4: Generate and Preview Report
1. User clicks "Generate Report" button
2. Button shows "Generating..." with spinner
3. Progress indicator appears below button (5-10 seconds):
   - "Rendering charts..." (step 1)
   - "Generating PDF..." (step 2)
   - "Finalizing report..." (step 3)
4. On completion: Preview modal opens automatically
5. Modal shows thumbnail of cover page + section list
6. User clicks "Download PDF" button
7. Browser downloads: `Elena-Financial-Balanced-training-report-2025-12-19.pdf`
8. User can also click "Generate Share Link" for sharing flow

### Flow 5: Share Report
1. User clicks "Generate Share Link" button (or "Share Report" link after report exists)
2. Share link modal opens
3. Link generated and displayed in read-only input
4. User clicks "Copy" button
5. "Copied!" feedback appears briefly (2 seconds)
6. Link copied to clipboard
7. User clicks "Done" to close modal
8. Share link status updates: "Share link expires Jan 17, 2026"

### Flow 6: Delete Adapters
1. User clicks "Delete Adapters" text button (red)
2. Confirmation modal opens with warning icon
3. File list shown with sizes
4. Impact shown: "This will free 449 MB of storage."
5. Delete button disabled initially
6. User checks confirmation checkbox
7. Delete button enables (red background)
8. User clicks "Delete Permanently"
9. Loading spinner on button
10. Files deleted from storage
11. Modal closes
12. Toast notification: "Adapters deleted successfully."
13. Section updates: Download buttons disabled, "No adapters available"

### Flow 7: View and Download Deployment Package
1. User clicks "View Contents" button
2. Package contents modal opens
3. User reviews checklist (6 items with descriptions)
4. User notes system requirements (GPU required)
5. User optionally copies quick start command
6. User clicks "Download Package" button
7. Modal stays open, download progress begins
8. Progress bar shows ~650 MB download
9. On completion: "Download complete!" message
10. User clicks "Close"
11. Browser downloads: `Elena-Financial-Balanced-deployment-package-job_abc123.zip`

### Flow 8: Link Expiration and Regeneration
1. User returns to job details after 24+ hours
2. Link expiration indicator shows: "Link Expired" (red)
3. "Download Adapters" button disabled
4. "Regenerate Link" button appears instead
5. User clicks "Regenerate Link"
6. Brief loading state (generating new signed URL)
7. Success: "Link regenerated. Expires in 24 hours."
8. Download button re-enabled
9. User can download normally

---

## Visual Feedback

### Button States
- **Primary enabled:** Green background, white text, cursor pointer, shadow
- **Primary hover:** Darker green, slight scale (1.02x)
- **Primary loading:** Green with white spinner, text changes to "Downloading..." or "Generating..."
- **Primary disabled:** Gray background, gray text, cursor not-allowed
- **Secondary enabled:** Gray outline, dark text, cursor pointer
- **Secondary hover:** Light gray fill, outline darkens
- **Destructive enabled:** Red text, no background
- **Destructive hover:** Light red background tint

### Progress Indicators
- **Progress bar:** Linear, blue fill (#2563EB), gray background (#E5E7EB), 8px height, rounded
- **Percentage:** Large text (24px) next to or above progress bar
- **Animated fill:** Smooth animation as percentage increases
- **Completion:** Green checkmark icon replaces progress bar, "Complete!" text

### Status Indicators
- **Link valid:** Gray text "Expires in 23 hours" with clock icon
- **Link expiring soon:** Yellow text "Expires in 6 hours" with warning icon
- **Link expired:** Red text "Link Expired" with X icon
- **Download counter:** Gray badge "Downloaded 3 times" with number updating on new download

### Toast Notifications
- **Success:** Green left border, checkmark icon, message text, auto-dismiss 5 seconds
- **Error:** Red left border, X icon, error message, retry link, user dismissable
- **Position:** Bottom-right of viewport, stacked if multiple

### Copy Feedback
- **Copy button:** Icon changes to checkmark briefly (2 seconds)
- **Tooltip:** "Copied!" appears next to button

---

## Accessibility Guidance

### Keyboard Navigation
- **Tab order:** Download Adapters → Download Package → file list → storage details → Export → Generate Report → Share → deployment section → API template
- **Arrow keys:** Within modals for radio buttons, within file lists
- **Enter/Space:** Activate buttons, select radio options, toggle checkboxes
- **Escape:** Close all modals, cancel actions

### Screen Reader Support
- **ARIA labels:**
  - Download buttons: aria-label="Download trained LoRA adapters (449 MB)"
  - Progress bar: aria-valuenow="42", aria-valuemin="0", aria-valuemax="100"
  - Link expiration: aria-live="polite" announces expiration updates
  - File list: aria-label="Adapter files: 4 files, 449 MB total"
  - Modals: aria-modal="true", role="dialog", aria-labelledby pointing to title
  - Destructive actions: aria-describedby pointing to warning message

- **Live regions:**
  - Progress updates: aria-live="polite" announces "Download 42% complete"
  - Toast notifications: role="alert" for immediate announcement
  - Copy confirmation: aria-live="assertive" announces "Link copied"

### Visual Accessibility
- **Color contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Focus indicators:** Blue outline (2px, offset 2px) on all interactive elements
- **Color not sole indicator:**
  - Link status: Color + icon + text ("Link Expired" + red X + red text)
  - Download status: Color + icon + text (green checkmark + "Complete!")
  - Warning badges: Yellow background + text label ("GPU Required")

### Touch Targets
- **Minimum size:** 44x44px for all buttons and interactive elements
- **Spacing:** 8px minimum between adjacent interactive elements
- **Large hit areas:** Entire button area clickable, not just text

---

## Information Architecture

### Job Details Page Structure

**Desktop Layout (≥768px):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                               │
│ ├─ Breadcrumb: Jobs > Elena Morales Financial - Balanced            │
│ ├─ Job title (H1): Training Job #47                                  │
│ └─ Status badges: ✓ Completed | 13.2 hours | $48.32                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ SECTION 1: Model Artifacts                                           │
│ ┌───────────────────────────────────┬───────────────────────────┐   │
│ │ LEFT (2/3 width)                   │ RIGHT (1/3 width)         │   │
│ │                                    │                           │   │
│ │ [Download Adapters] [Download      │ Storage Details           │   │
│ │  Deployment Package]               │ Path: job_abc123/...      │   │
│ │                                    │ Retention: Permanent      │   │
│ │ Adapter Files:                     │ Downloaded: 3 times       │   │
│ │ • adapter_model.bin   442 MB       │                           │   │
│ │ • adapter_config.json   2 KB       │ [Delete Adapters]         │   │
│ │ • training_summary.json 5 KB       │                           │   │
│ │ • README.txt            8 KB       │                           │   │
│ │                                    │                           │   │
│ │ Link expires in 23 hours           │                           │   │
│ └───────────────────────────────────┴───────────────────────────┘   │
│                                                                      │
│ SECTION 2: Metrics & Reports                                         │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ [Export Metrics] [Generate Report] [Share Report]             │   │
│ │                                                                │   │
│ │ 2,000 steps logged | Final loss: 0.287 | Improvement: 80%    │   │
│ │ Report ready — Preview →                                       │   │
│ │ Share link expires Jan 17, 2026                               │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ SECTION 3: Deployment                                                │
│ ┌─────────────────────────────────────────┬─────────────────────┐   │
│ │ Deployment Package Card (2/3)            │ API Template (1/3)  │   │
│ │ Complete Deployment Package             │ Coming Q1 2026      │   │
│ │ ~650 MB | GPU Required                   │                     │   │
│ │ ✓ adapters/  ✓ inference.py            │ [Notify Me]         │   │
│ │ ✓ requirements.txt  ✓ README.md        │                     │   │
│ │ ✓ example_prompts.json                  │                     │   │
│ │ [View Contents] [Download Package]      │                     │   │
│ └─────────────────────────────────────────┴─────────────────────┘   │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│ [View Storage Dashboard →]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile Layout (<768px):**
```
┌─────────────────────────────────────┐
│ HEADER                               │
│ ← Back | Job #47                     │
│ ✓ Completed | 13.2 hrs | $48.32     │
├─────────────────────────────────────┤
│                                      │
│ Model Artifacts                      │
│ ────────────────                     │
│ [Download Adapters]        (full w)  │
│ [Download Deployment Pack] (full w)  │
│                                      │
│ Files: 4 files, 449 MB total         │
│ Expires in 23 hours                  │
│                                      │
│ Storage: job_abc123/... [Copy]       │
│ Downloaded 3 times                   │
│ [Delete Adapters]                    │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ Metrics & Reports                    │
│ ─────────────────                    │
│ [Export Metrics]           (full w)  │
│ [Generate Report]          (full w)  │
│                                      │
│ 2,000 steps | Loss: 0.287 | +80%    │
│ [Share Report] (link)                │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ Deployment                           │
│ ──────────                           │
│ Complete Package (~650 MB)           │
│ GPU Required                         │
│ [View Contents]                      │
│ [Download Package]         (full w)  │
│                                      │
│ API Template — Coming Q1 2026        │
│ [Notify Me]                          │
│                                      │
└─────────────────────────────────────┘
```

### Component Hierarchy

**JobDetailsPage (parent container)**
- **Header**
  - Breadcrumb
  - JobTitle
  - StatusBadges (Completed, Duration, Cost)
- **ModelArtifactsSection**
  - ActionButtons
    - DownloadAdaptersButton
    - DownloadPackageButton
  - FileList
    - FileListItem × 4
  - ExpirationIndicator
  - StorageDetailsPanel
    - StoragePath (copyable)
    - RetentionPolicy
    - DownloadCounter
  - DeleteButton
- **MetricsReportsSection**
  - ActionButtons
    - ExportMetricsButton
    - GenerateReportButton
    - ShareReportLink
  - MetricsSummary
  - ReportStatus
- **DeploymentSection**
  - DeploymentPackageCard
    - ContentsList
    - RequirementsBadge
    - ViewContentsButton
    - DownloadButton
  - APITemplateCard
    - ComingSoonBadge
    - NotifyMeButton
- **StorageDashboardLink**

**Modals (conditional)**
- DownloadProgressModal
- ExportConfigModal
- ReportPreviewModal
- ShareLinkModal
- DeleteConfirmationModal
- PackageContentsModal

---

## Page Plan

**Total Wireframe Pages: 15**

### Page 1: Job Details - Model Artifacts Overview
- **Purpose:** Show completed job with all Stage 4 sections visible
- **Key Elements:** Header with job status, Model Artifacts section with download buttons and file list, storage details, expiration indicator
- **States:** All download buttons enabled, link valid, initial state

### Page 2: Download Adapters - In Progress
- **Purpose:** Show download progress feedback
- **Key Elements:** Progress modal overlaying page, progress bar at 42%, file size indicator (150 MB of 358 MB), cancel option
- **States:** Download active, progress animating

### Page 3: Download Adapters - Success
- **Purpose:** Confirm download completion
- **Key Elements:** Modal with checkmark, "Download complete!" message, success toast notification, updated download counter (now 4)
- **States:** Download completed, modal closing

### Page 4: Storage Details - Metadata View
- **Purpose:** Show detailed storage information
- **Key Elements:** Expanded storage details panel, storage path with copy button, retention policy, version info, download history count
- **States:** Details visible, copy button ready

### Page 5: Storage Dashboard - Simple View
- **Purpose:** Show aggregate storage across all jobs
- **Key Elements:** Summary cards (Total: 15.3 GB, Models: 23, Avg: 665 MB), simple job list, no bulk operations
- **States:** Dashboard loaded, stats displayed

### Page 6: Delete Confirmation Modal
- **Purpose:** Confirm permanent adapter deletion
- **Key Elements:** Warning icon, file list with sizes, impact summary (449 MB freed), confirmation checkbox, Delete/Cancel buttons
- **States:** Checkbox unchecked (delete disabled), checkbox checked (delete enabled)

### Page 7: Export Metrics - Configuration Modal
- **Purpose:** Configure export format before downloading
- **Key Elements:** Format radio buttons (CSV selected, JSON), column preview for CSV, filename preview, Download button
- **States:** CSV selected (default), JSON selected (alternate)

### Page 8: Generate Report - In Progress
- **Purpose:** Show report generation progress
- **Key Elements:** Progress indicator below Generate button, step indicators (Rendering... Generating... Finalizing...), estimated time
- **States:** Generation in progress, steps advancing

### Page 9: Report Preview Modal
- **Purpose:** Preview generated report before downloading
- **Key Elements:** Cover page thumbnail, section list (5 pages), Download PDF button, Generate Share Link button
- **States:** Preview open, actions available

### Page 10: Share Link Modal
- **Purpose:** Generate and copy shareable link
- **Key Elements:** Generated link in input field, Copy button, expiration info (30 days), sharing note
- **States:** Link generated, copy button ready, "Copied!" feedback shown

### Page 11: Deployment Package - Contents Preview
- **Purpose:** Preview package contents before large download
- **Key Elements:** Contents checklist (6 items with descriptions), system requirements, quick start command, Download button
- **States:** Contents modal open, ready for download

### Page 12: Deployment Package - Download Progress
- **Purpose:** Show progress for large file download
- **Key Elements:** Progress modal with bar, file size (320 MB of 650 MB), download speed, time remaining
- **States:** Download in progress (slower than adapters due to larger size)

### Page 13: API Template - Future Notice
- **Purpose:** Show upcoming feature with notification option
- **Key Elements:** Coming Soon badge (blue), planned features list, estimated timeline (Q1 2026), Notify Me button
- **States:** Feature unavailable, notification capture available

### Page 14: Mobile Layout - Job Details
- **Purpose:** Show responsive layout for mobile devices
- **Key Elements:** Stacked sections vertically, full-width buttons, condensed file lists, storage details collapsed
- **States:** Mobile viewport, all functionality accessible

### Page 15: Error States Collection
- **Purpose:** Show various error scenarios
- **Key Elements:**
  - Download failed (network error with retry button)
  - Link expired (red badge with Regenerate button)
  - Report generation failed (error message with retry)
  - Insufficient storage (warning when downloading)
- **States:** Multiple error scenarios on single page for reference

---

## Annotations (Mandatory)

Attach notes to UI elements in Figma citing:

### Model Artifacts Section
- Download Adapters button: "FR4.1.1 AC1: Completed jobs show Download Adapters button (prominent, green)"
- ZIP contents display: "FR4.1.1 AC3: ZIP contains adapter_model.bin (200-500MB), adapter_config.json, README.txt, training_summary.json"
- Progress indicator: "FR4.1.1 AC4: Download progress indicator for large files"
- Expiration indicator: "FR4.1.1 AC5: Generate signed URL valid for 24 hours (security)"
- Regenerate button: "FR4.1.1 AC6: After 24 hours, Regenerate download link"
- Download counter: "FR4.1.1 AC7: Track download count and timestamp for audit trail"
- Storage path: "FR4.1.2 AC2: Folder structure {job_id}/adapters/"
- File list: "FR4.1.2 AC3: Files: adapter_model.bin, adapter_config.json, training_summary.json"
- Retention policy: "FR4.1.2 AC4: Storage retention: Permanent by default (configurable)"
- Delete button: "FR4.1.2 AC7: Option to delete adapters - requires confirmation, creates audit log entry"

### Metrics & Reports Section
- Export Metrics button: "FR4.2.1 AC1: Export Metrics button on job details page"
- Format selector: "FR4.2.1 AC2: Format options - CSV (spreadsheet analysis) / JSON (programmatic access)"
- CSV columns: "FR4.2.1 AC3: CSV includes columns - step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds"
- Generate Report button: "FR4.2.2 AC1: Generate Report button on completed job details page"
- Report sections: "FR4.2.2 AC2: PDF includes Cover Page, Executive Summary, Training Metrics (2 pages), Cost Breakdown, Appendix"
- Generation time: "FR4.2.2 AC7: Report generation takes 5-10 seconds"
- Preview modal: "FR4.2.2 AC8: Preview report before download"
- Share link: "FR4.2.2 AC10: Shareable via secure link (30-day expiration)"

### Deployment Section
- Download Package button: "FR4.3.1 AC1: Download Deployment Package button on completed jobs"
- Package contents: "FR4.3.1 AC3: Package contents - adapters/, inference.py, requirements.txt, README.md, example_prompts.json, training_summary.json"
- Requirements list: "FR4.3.1 AC5: requirements.txt - transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0"
- GPU requirement: "FR4.3.1 AC10: README includes GPU requirements, VRAM usage, inference speed estimates"
- Package size: "FR4.3.1 AC11: Package size ~500-700MB"
- API template notice: "FR4.3.2 AC9: Priority: Low (Future Enhancement)"

---

## Acceptance Criteria → UI Component Mapping

| Criterion | Source | Screen(s) | Component(s) | State(s) | Notes |
|-----------|--------|-----------|--------------|----------|-------|
| Download Adapters button (prominent, green) | FR4.1.1 AC1 | Page 1 | Primary button | Enabled, Loading, Disabled | Appears only when job completed |
| ZIP contains adapter files | FR4.1.1 AC3 | Page 1, Modal | FileList | Display | Shows sizes for each file |
| Download progress indicator | FR4.1.1 AC4 | Page 2 | ProgressModal | Downloading, Complete | For 200-500MB files |
| Signed URL valid 24 hours | FR4.1.1 AC5 | Page 1 | ExpirationIndicator | Valid, Expiring, Expired | Shows countdown |
| Regenerate link after expiry | FR4.1.1 AC6 | Page 15 | RegenerateButton | Enabled | Replaces download button |
| Download count tracking | FR4.1.1 AC7 | Page 1, 3 | DownloadCounter | Display | Updates on each download |
| Storage path copyable | FR4.1.2 AC2 | Page 1, 4 | StoragePath + CopyButton | Display | Format: job_id/adapters/ |
| Delete with confirmation | FR4.1.2 AC7 | Page 6 | DeleteModal | Unchecked, Checked | Requires checkbox |
| Export Metrics button | FR4.2.1 AC1 | Page 1 | SecondaryButton | Enabled, Disabled | In Metrics section |
| Format options CSV/JSON | FR4.2.1 AC2 | Page 7 | RadioButtons | CSV, JSON | CSV default |
| CSV column list | FR4.2.1 AC3 | Page 7 | ColumnPreview | Display | 9 columns listed |
| Generate Report button | FR4.2.2 AC1 | Page 1 | SecondaryButton | Enabled, Generating | In Reports section |
| PDF report sections | FR4.2.2 AC2 | Page 9 | SectionList | Display | 5+ pages |
| Report preview | FR4.2.2 AC8 | Page 9 | PreviewModal | Open | Thumbnail + sections |
| Share link 30 days | FR4.2.2 AC10 | Page 10 | ShareModal | Generated | Expiration shown |
| Deployment package contents | FR4.3.1 AC3 | Page 11 | ContentsChecklist | Display | 6 items with descriptions |
| Package size 500-700MB | FR4.3.1 AC11 | Page 1, 11 | SizeBadge | Display | ~650 MB typical |
| API template future | FR4.3.2 AC9 | Page 13 | ComingSoonBadge | Display | Q1 2026 estimate |

---

## Non-UI Acceptance Criteria

| Criterion | Impact | UI Hint |
|-----------|--------|---------|
| ZIP file generation and packaging | Backend generates ZIP on-demand or pre-generates | Show progress if on-demand |
| Signed URL generation with expiration | Backend generates secure temporary URLs | Display expiration timestamp |
| Supabase Storage bucket operations | Files stored in model-artifacts bucket | Show storage path |
| Download count tracking in database | Increment counter on each download | Display count in UI |
| CSV/JSON formatting and generation | Backend generates valid export files | Preview shows structure |
| PDF rendering engine | Backend renders charts and generates PDF | Show generation progress |
| Secure shareable link with expiration | Backend generates signed URL for reports | Display expiration date |
| Audit log for delete operations | Every deletion logged with timestamp, user | Note in confirmation modal |

---

## Final Notes for Figma Implementation

**Integration Requirements:**
- All sections appear on single Job Details page for completed jobs
- Download buttons trigger progress modals for large files
- Export modal allows format selection before download
- Report generation shows progress before preview
- Share link modal captures secure link distribution
- Delete confirmation prevents accidental data loss

**POC Simplifications Applied:**
- Removed: Download history tables, README previews, bulk operations, cost projections, chart embedding, full PDF viewer, detailed API template wireframes
- Simplified: Storage dashboard to summary only, export to format selection only, report preview to thumbnail only
- Maintained: Core downloads with progress, format selection, report generation, share links, confirmation modals

**State Management:**
- Job status determines button availability (completed → enabled)
- Link expiration tracked with countdown
- Download/export counters update after successful operations
- Report generated status enables share link button

**Accessibility:**
- Full keyboard navigation support
- Screen reader announcements for progress and status changes
- High contrast colors and visible focus indicators
- Touch-optimized button sizes

**Success Criteria:**
A user should be able to:
1. Download trained adapters with progress feedback
2. View storage details and delete if needed
3. Export metrics in preferred format (CSV/JSON)
4. Generate and preview professional PDF reports
5. Share reports via secure expiring links
6. Download complete deployment packages
7. Understand API templates are coming soon

All within a unified Job Details page where Stage 4 outputs are organized into clear, accessible sections.
