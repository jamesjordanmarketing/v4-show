# Combined Figma Wireframe Analysis — Stage 4 (E04)

**Stage:** Stage 4 — Model Artifacts & Downloads  
**Section ID:** E04  
**Date:** 2025-12-19  
**Input File:** `04-pipeline-FIGMA-wireframes-output-E04.md`

---

## PHASE 1: Deep Analysis

### Individual FR Catalog

---

### FR4.1.1: Download Trained LoRA Adapters
- **Purpose:** Enable one-click download of trained LoRA adapters after successful training
- **Core Functionality:** ZIP file download with adapter files, progress tracking, link expiration and regeneration
- **UI Components:**
  - Download Adapters button (green, prominent)
  - ZIP contents display (adapter_model.bin, adapter_config.json, README.txt, training_summary.json)
  - Download progress bar with percentage and estimated time
  - Signed URL expiration indicator (24-hour validity)
  - Link regeneration button
  - Download counter with timestamps
  - Success notification toast
  - README preview modal (expandable)
  - File metadata panel (sizes, upload timestamp, storage path)
- **UI States:** Ready for download, Download in progress, Download completed, Link expired, README preview open
- **User Interactions:** Click download, View progress, Regenerate expired link, Preview README, View download history
- **Page Count:** 5 pages
- **Dependencies:** None (starting point for Stage 4)

---

### FR4.1.2: Adapter Storage and Versioning
- **Purpose:** Comprehensive storage management for trained LoRA adapters
- **Core Functionality:** View storage details, track versions, manage retention, bulk operations, storage cost projections
- **UI Components:**
  - Storage bucket display ("Stored in: model-artifacts bucket")
  - Folder structure display (copyable path)
  - File list with individual sizes
  - Retention policy display with edit option
  - Version indicator (Job number and date)
  - Metadata panel (path, sizes, timestamp, download count)
  - Delete Adapters button (destructive, requires confirmation)
  - Storage dashboard (total used, model count, avg size, cost estimate)
  - Bulk operations (multi-select checkboxes, Delete Selected button)
  - Cost projections chart
- **UI States:** Storage visible, Delete confirmation modal, Dashboard loaded, Bulk selection active
- **User Interactions:** View storage details, Copy storage path, Delete adapters, Bulk delete, View cost projections
- **Page Count:** 6 pages
- **Dependencies:** FR4.1.1 (adapters must exist to manage storage)

---

### FR4.2.1: Export Training Metrics as CSV/JSON
- **Purpose:** Export comprehensive training metrics for analysis and reporting
- **Core Functionality:** CSV/JSON export with format selection, optional chart embedding, instant download
- **UI Components:**
  - Export Metrics button
  - Format selector (CSV/JSON radio buttons)
  - CSV columns list preview
  - JSON structure preview (nested structure)
  - Include Charts checkbox (embeds PNG loss curves)
  - File naming preview
  - Download button
  - Export counter for audit trail
  - Export history table
- **UI States:** Export available, Format selected (CSV vs JSON), Charts included, Download in progress, Export completed
- **User Interactions:** Click export, Select format, Toggle chart inclusion, Download file, View export history
- **Page Count:** 6 pages
- **Dependencies:** None (completed job provides metrics data)

---

### FR4.2.2: Generate Training Report PDF
- **Purpose:** Generate professional PDF training reports for client deliverables
- **Core Functionality:** PDF generation with comprehensive sections, preview, shareable secure links
- **UI Components:**
  - Generate Report button
  - Report sections list (Cover, Executive Summary, Training Metrics, Cost Breakdown, Appendix)
  - Generation progress bar (5-10 seconds with steps)
  - Preview modal with PDF viewer
  - Page navigation and zoom controls
  - Download PDF button
  - Generate Share Link button
  - Share link modal with expiration (30-day)
  - Link usage tracking
  - Report history
- **UI States:** Report available, Generating (with progress), Preview open, Download ready, Share link generated
- **User Interactions:** Generate report, View preview, Navigate pages, Download PDF, Generate share link, Copy link
- **Page Count:** 7 pages
- **Dependencies:** FR4.2.1 (uses same metrics data)

---

### FR4.3.1: Create Complete Deployment Package
- **Purpose:** Provide complete deployment package for client integration
- **Core Functionality:** ZIP package with adapters, inference script, dependencies, README, examples, summary
- **UI Components:**
  - Download Deployment Package button
  - Package contents checklist (6 items with descriptions)
  - File size indicator (~650 MB)
  - GPU requirement badge
  - README preview (collapsible sections: Setup, Usage, Deployment, Troubleshooting)
  - Requirements preview (pinned dependency versions)
  - Example prompts preview (10 domain-specific samples)
  - System requirements display
  - Signed URL expiration (48-hour validity)
  - Download progress bar
  - What's Next guide
- **UI States:** Package available, Contents preview open, README expanded, Download in progress, Success with next steps
- **User Interactions:** View contents preview, Preview README, View requirements, View examples, Download package
- **Page Count:** 7 pages
- **Dependencies:** FR4.1.1 (includes adapter files)

---

### FR4.3.2: API Inference Endpoint Template
- **Purpose:** Provide API server templates for microservice deployment (FUTURE ENHANCEMENT)
- **Core Functionality:** FastAPI application, Docker configs, Kubernetes yamls, cloud deployment guides
- **UI Components:**
  - API Template section header
  - Future Enhancement badge (blue)
  - Planned features preview list
  - Estimated availability timeline (Q1 2026)
  - Notify Me When Available button
  - (Future State:) Template structure file tree
  - API endpoints specification cards
  - FastAPI app.py code preview
  - Docker/Kubernetes config tabs
  - Deployment guide sections
  - Example API request with curl command
- **UI States:** Future enhancement notice, Features listed, (Future:) Template available, Endpoints documented
- **User Interactions:** View planned features, Request early access, (Future:) Download template, View code previews
- **Page Count:** 8 pages (2 current state, 6 future state)
- **Dependencies:** FR4.3.1 (builds on deployment package concept)

---

## FR Relationships & Integration Points

### Sequential Flow (User Journey through Stage 4)
```
Job Completed → FR4.1.1 (Download Adapters) 
             → FR4.1.2 (Manage Storage)
             → FR4.2.1 (Export Metrics)
             → FR4.2.2 (Generate Report)
             → FR4.3.1 (Deployment Package)
             → FR4.3.2 (API Template - Future)
```

### Complementary Features (Same Page - Job Details)
- **Model Artifacts Section:** FR4.1.1, FR4.1.2
- **Metrics & Reports Section:** FR4.2.1, FR4.2.2
- **Deployment Section:** FR4.3.1, FR4.3.2

### State Dependencies
- FR4.1.1 download → FR4.1.2 download count updates
- FR4.2.1 metrics data → FR4.2.2 uses same data for PDF charts
- FR4.1.1 adapters → FR4.3.1 includes adapters folder
- All FRs → Require job status = 'completed'

### UI Component Sharing
- Download progress bar pattern (FR4.1.1, FR4.2.1, FR4.3.1)
- Signed URL expiration indicator (FR4.1.1, FR4.3.1)
- Preview modal pattern (FR4.1.1 README, FR4.2.2 PDF, FR4.3.1 README)
- File list/contents display (FR4.1.1, FR4.1.2, FR4.3.1)
- Success toast notification (all FRs)
- Export/download counter badge (FR4.1.1, FR4.2.1, FR4.2.2, FR4.3.1)

---

## Overlaps & Duplications to Consolidate

### 1. Download Progress Pattern
- **FR4.1.1** has download progress for adapters (200-500MB)
- **FR4.2.1** has brief loading for chart embedding (<2 seconds)
- **FR4.3.1** has download progress for deployment package (500-700MB)
- **CONSOLIDATION:** Use single progress bar component design, vary by file size

### 2. README/Documentation Preview
- **FR4.1.1** has README preview modal with integration instructions
- **FR4.3.1** has README preview with setup, usage, deployment, troubleshooting
- **CONSOLIDATION:** FR4.3.1 README is superset, includes FR4.1.1 content; use single pattern

### 3. File Size and Expiration Indicators
- **FR4.1.1** shows file sizes + 24-hour signed URL expiration
- **FR4.3.1** shows package size + 48-hour signed URL expiration
- **CONSOLIDATION:** Same visual pattern, different values; combine in one design

### 4. Download Counter/History
- **FR4.1.1** tracks download count and timestamps
- **FR4.2.1** tracks export count for audit
- **FR4.2.2** tracks report generation and share link views
- **FR4.3.1** tracks package downloads
- **CONSOLIDATION:** Same audit trail pattern across all; show once in unified design

### 5. Future Enhancement Notice
- **FR4.3.2** shows "Coming Soon" for API templates
- **CONSOLIDATION:** Reduce to single simple notice page, remove detailed future state wireframes for POC

---

## PHASE 2: Integration Planning

### Unified UX Flow Design

**Job Details Page Structure:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: Training Job Details - [Job Name]                           │
│ Status: ✓ Completed | Duration: 13.2 hours | Cost: $48.32           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ SECTION 1: Model Artifacts (FR4.1.1 + FR4.1.2)                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Download Adapters] (green)  [Download Deployment Package]      │ │
│ │                                                                  │ │
│ │ Adapter Files:                      Storage Details:             │ │
│ │ • adapter_model.bin (442 MB)       Path: job_abc123/adapters/   │ │
│ │ • adapter_config.json (2 KB)       Retention: Permanent         │ │
│ │ • training_summary.json (5 KB)     Downloaded: 3 times          │ │
│ │                                                                  │ │
│ │ Link expires in 23 hours           [Delete Adapters]            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ SECTION 2: Metrics & Reports (FR4.2.1 + FR4.2.2)                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Export Metrics]           [Generate Report]    [Share Report]  │ │
│ │                                                                  │ │
│ │ Last export: Dec 18, 2025 (CSV)    Report ready: Preview →      │ │
│ │ 2,000 steps of metrics available   Share link: Expires Jan 17   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ SECTION 3: Deployment (FR4.3.1 + FR4.3.2)                           │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Deployment Package                  API Template                 │ │
│ │ ~650 MB • Requires GPU             (Coming Q1 2026)             │ │
│ │ [View Contents] [Download]          [Notify Me]                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│ [View Storage Dashboard] (link to FR4.1.2 dashboard)                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Map

#### 1. DownloadAdaptersButton (FR4.1.1)
**onClick → Triggers:**
- Generate signed URL (24-hour expiration)
- Open download progress modal
- Update download counter on completion
- Show success toast with README reminder

#### 2. DownloadDeploymentPackageButton (FR4.3.1)
**onClick → Triggers:**
- Package contents preview modal opens first
- User reviews contents, clicks Download
- Generate signed URL (48-hour expiration)
- Open download progress modal (larger file, longer time)
- Show success toast with next steps

#### 3. ExportMetricsButton (FR4.2.1)
**onClick → Triggers:**
- Export configuration modal opens
- User selects format (CSV/JSON)
- User optionally enables chart embedding
- Click Download → instant file delivery
- Update export counter

#### 4. GenerateReportButton (FR4.2.2)
**onClick → Triggers:**
- Generation progress indicator (5-10 seconds)
- Preview modal opens automatically
- User can download PDF or generate share link

#### 5. DeleteAdaptersButton (FR4.1.2)
**onClick → Triggers:**
- Confirmation modal with impact preview
- User must check acknowledgment checkbox
- Confirm → delete from storage → audit log entry
- Update storage dashboard stats

#### 6. StorageDashboardLink (FR4.1.2)
**onClick → Navigates to:**
- Separate dashboard page showing all stored models
- Aggregate stats, bulk operations, cost projections

---

## PHASE 3: POC Simplification

### Features to KEEP (Essential for POC)

1. ✅ **Download Adapters** (FR4.1.1)
   - One-click download button
   - Progress indicator for large files
   - Success notification
   - Link expiration indicator
   
2. ✅ **Storage Metadata** (FR4.1.2 - Simplified)
   - File list with sizes
   - Storage path (copyable)
   - Download count
   - Delete option with confirmation
   
3. ✅ **Export Metrics** (FR4.2.1 - Simplified)
   - Format selection (CSV/JSON)
   - Preview structure
   - One-click download
   
4. ✅ **Generate Report** (FR4.2.2 - Simplified)
   - Generation with progress
   - PDF preview
   - Download and share link
   
5. ✅ **Deployment Package** (FR4.3.1 - Simplified)
   - Contents preview
   - README snippet
   - Download with progress
   
6. ✅ **API Template Notice** (FR4.3.2)
   - Simple "Coming Soon" indicator

### Features to SIMPLIFY

1. 🔽 **README Preview (FR4.1.1):**
   - REMOVE: Full modal with sections
   - KEEP: "See README in ZIP" note only
   
2. 🔽 **Storage Dashboard (FR4.1.2):**
   - REMOVE: Bulk operations, cost projections chart
   - KEEP: Summary stats, simple list view
   
3. 🔽 **Chart Embedding (FR4.2.1):**
   - REMOVE: Optional chart embedding flow
   - KEEP: Basic CSV/JSON export
   
4. 🔽 **Report Preview (FR4.2.2):**
   - REMOVE: Full PDF viewer with page navigation
   - KEEP: Thumbnail preview, download button
   
5. 🔽 **Deployment Package (FR4.3.1):**
   - REMOVE: Detailed README preview, requirements preview, example prompts preview
   - KEEP: Contents checklist, size indicator, download button
   
6. 🔽 **API Template (FR4.3.2):**
   - REMOVE: All future state wireframes (6 pages)
   - KEEP: Simple notice with "Notify Me" button (1 page)

### Features to REMOVE (Nice-to-Have)

1. ❌ Link regeneration flow (FR4.1.1)
2. ❌ Download history table (FR4.1.1, FR4.2.1, FR4.3.1)
3. ❌ Version comparison side-by-side (FR4.1.2)
4. ❌ Bulk delete with multi-select (FR4.1.2)
5. ❌ Cost projections chart (FR4.1.2)
6. ❌ Chart embedding option (FR4.2.1)
7. ❌ JSON structure preview (FR4.2.1)
8. ❌ Full PDF page navigation (FR4.2.2)
9. ❌ Share link usage tracking (FR4.2.2)
10. ❌ Example prompts preview (FR4.3.1)
11. ❌ Requirements.txt preview (FR4.3.1)
12. ❌ All future state screens (FR4.3.2)

### Rationale
- **POC Goal:** Demonstrate core artifact access (download, export, deploy)
- **Essential:** One-click downloads, format selection, progress feedback, confirmation
- **Non-Essential:** Advanced features, detailed previews, enterprise features

---

## Page Count Optimization

### Original Total: 39 pages across 6 FRs
- FR4.1.1: 5 pages (Adapter Download)
- FR4.1.2: 6 pages (Storage Management)
- FR4.2.1: 6 pages (Metrics Export)
- FR4.2.2: 7 pages (PDF Reports)
- FR4.3.1: 7 pages (Deployment Package)
- FR4.3.2: 8 pages (API Template)

### Combined & Simplified: 15 pages

1. **Job Details - Overview State** (1 page)
   - All Stage 4 sections visible
   - Job completed status
   - All action buttons ready

2. **Download Adapters - In Progress** (1 page)
   - Progress modal with bar
   - File size indicator
   - Cancel option

3. **Download Adapters - Success** (1 page)
   - Success notification toast
   - Updated download counter
   - README reminder

4. **Storage Metadata - Details View** (1 page)
   - File list with sizes
   - Storage path
   - Retention policy
   - Delete button

5. **Storage Dashboard - Simple View** (1 page)
   - Summary stats cards
   - Models list (no bulk ops)

6. **Delete Confirmation Modal** (1 page)
   - Warning message
   - Impact preview
   - Confirmation checkbox

7. **Export Metrics - Config Modal** (1 page)
   - Format selector (CSV/JSON)
   - Column/structure preview
   - Download button

8. **Generate Report - In Progress** (1 page)
   - Progress bar with steps
   - Time estimate

9. **Report Preview - Thumbnail** (1 page)
   - Thumbnail of cover page
   - Download and Share buttons

10. **Share Link Modal** (1 page)
    - Generated link (copyable)
    - Expiration info
    - Share options

11. **Deployment Package - Contents** (1 page)
    - Package contents checklist
    - Size and GPU requirement
    - Download button

12. **Deployment Package - Download Progress** (1 page)
    - Progress bar for 650MB
    - Estimated time

13. **API Template - Future Notice** (1 page)
    - Coming Soon badge
    - Planned features list
    - Notify Me button

14. **Mobile Layout - Job Details** (1 page)
    - Stacked sections
    - Touch-optimized buttons

15. **Error States Collection** (1 page)
    - Download failed
    - Link expired
    - Generation failed

### Reduction Strategy
- Consolidated FR4.1.1 + FR4.1.2 on same job details page
- Consolidated FR4.2.1 + FR4.2.2 in same section
- Removed duplicate state demonstrations
- Removed future state wireframes (FR4.3.2)
- Simplified modals and previews
- Combined error states into single page
