# LoRA Pipeline - FIGMA Wireframes Output - Stage 4 (E04)

**Version:** 1.0  
**Date:** 12/18/2025  
**Stage:** Stage 4 — Model Artifacts & Downloads  
**Section ID:** E04

This file contains Figma-ready wireframe prompts for all FRs in Stage 4 (Model Artifacts & Downloads).

---

=== BEGIN PROMPT FR: FR4.1.1 ===

Title
- FR FR4.1.1 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR enables users to download trained LoRA adapters (adapter_model.bin, adapter_config.json) with one click after successful training completion. The feature provides immediate access to trained model artifacts in a convenient ZIP format including integration instructions, final metrics, and metadata. This is the critical deliverable that transforms training into tangible assets ready for client integration or inference deployment.

Journey Integration
- Stage 4 user goals: Validate model quality, download trained artifacts, prepare for client delivery, document training outcomes
- Key emotions: Relief (training succeeded), satisfaction (tangible deliverable), confidence (quality validated), eagerness (ready to deploy)
- Progressive disclosure levels:
  * Basic: One-click download with README
  * Advanced: View file details, storage metadata, download history
  * Expert: Direct storage access, versioning, audit trails
- Persona adaptations: AI Engineers need quick downloads for integration; Business Owners need professional packaging for client delivery

### Journey-Informed Design Elements
- User Goals: Download trained adapters, access integration instructions, verify file integrity, track download history
- Emotional Requirements: Celebration of completion, confidence in deliverable quality, ease of access, professional presentation
- Progressive Disclosure:
  * Basic: Prominent download button, automatic ZIP packaging
  * Advanced: File size indicators, download progress, expiration warnings
  * Expert: Storage paths, version tracking, regenerate links
- Success Indicators: Download completes successfully, README accessible, files ready for integration, audit trail captured
  
Wireframe Goals
- Provide immediate, one-click access to trained adapters
- Display clear file metadata (sizes, contents, upload timestamps)
- Show download progress for large files (200-500MB)
- Include integration instructions and quick-start guidance
- Track download history for audit and reference
- Handle expired links with regeneration options

Explicit UI Requirements (from acceptance criteria)
- **Download Button**: Prominent green "Download Adapters" button on completed jobs
- **Download Trigger**: Click initiates ZIP file download named `{job_name}-adapters-{job_id}.zip`
- **ZIP Contents Display**: List showing: adapter_model.bin (200-500MB), adapter_config.json, README.txt, training_summary.json
- **Progress Indicator**: Download progress bar for large files with percentage and estimated time
- **Signed URL Security**: Generate signed URL valid for 24 hours with expiration timestamp shown
- **Link Regeneration**: After 24 hours, show "Regenerate Download Link" button
- **Download Counter**: Display "Downloaded 3 times" with timestamps
- **Success Notification**: Toast notification: "Adapters downloaded. See README.txt for integration instructions."
- **README Preview**: Expandable preview showing integration steps and dependencies
- **File Metadata Panel**: Shows file sizes, upload timestamp, storage path, validation status

Interactions and Flows
1. **Primary Flow**: User views completed job → Clicks "Download Adapters" → Progress indicator appears → ZIP downloads → Success notification shows
2. **Expired Link Flow**: User views old job (>24hrs) → Sees "Link Expired" badge → Clicks "Regenerate Link" → New link generated → Download enabled
3. **Preview Flow**: User clicks "Preview README" → Modal shows integration instructions → User can copy sample code → Close or proceed to download
4. **Audit Trail**: User views "Download History" section → Sees list of past downloads with timestamps and users → Tracks who downloaded when

Visual Feedback
- **Button States**: Download button (enabled/disabled), loading spinner during link generation, success checkmark after download
- **Progress Bar**: Linear progress indicator with percentage: "Downloading... 42% (150MB of 358MB)"
- **Status Badges**: "Ready for Download" (green), "Link Expires in 6 hours" (yellow), "Link Expired" (red)
- **Toast Notifications**: Success: "Download started", Warning: "Link expires soon", Error: "Download failed - retry"
- **File Icons**: Distinct icons for .bin (database), .json (code), .txt (document) files

Accessibility Guidance
- Download button: aria-label="Download trained LoRA adapters", keyboard accessible (Enter/Space)
- Progress bar: aria-live="polite", aria-valuenow updates with percentage
- Expiration warning: role="alert" for imminent expiration
- File list: Semantic table with headers (File Name, Size, Type, Description)
- Color contrast: Green button meets WCAG AA, status badges have text labels (not color-only)

Information Architecture
- **Job Details Page** (parent context)
  - **Model Artifacts Section** (FR4.1.1 focus)
    - Artifacts Summary Card
      - Download button (primary action)
      - Expiration status
      - File list with sizes
    - README Preview (collapsible)
    - Download History (collapsible)
  - **Storage Details Section** (FR4.1.2)
  - **Metrics Export Section** (FR4.2.x)

Page Plan
1. **Page 1: Job Details - Model Artifacts Ready State**
   - Purpose: Show completed job with download option
   - Components: Job header, status badge (Completed), artifacts summary card with download button, file list, README preview link
   - States: Download enabled, link valid, no downloads yet

2. **Page 2: Download In Progress State**
   - Purpose: Show download progress feedback
   - Components: Progress modal with bar, file size indicator, cancel option, estimated time remaining
   - States: Download active (42%), network activity indicator

3. **Page 3: Download Success & History**
   - Purpose: Confirm download success and show history
   - Components: Success notification toast, updated download counter, download history table (timestamp, user, file size)
   - States: Download completed, history expanded, audit trail visible

4. **Page 4: Expired Link & Regeneration**
   - Purpose: Handle expired downloads gracefully
   - Components: Expired link warning, regenerate button, expiration timestamp, new link generation flow
   - States: Link expired (>24hrs), regeneration in progress, new link ready

5. **Page 5: README Integration Instructions Modal**
   - Purpose: Preview integration steps before downloading
   - Components: README content display, code samples with copy buttons, support links, close/download actions
   - States: Modal open, code copyable, links clickable

Annotations (Mandatory)
- Attach notes on each UI element citing acceptance criteria (e.g., "Download button - US4.1.1: Completed jobs show Download Adapters button")
- Include mapping table frame in Figma showing: Criterion → Screen → Component → State
- Mark file size indicators with note: "US4.1.1: Shows 200-500MB range for adapter_model.bin"
- Label progress bar with: "US4.1.1: Download progress indicator for large files"
- Tag notification with: "US4.1.1: Success notification after download"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"Completed jobs show Download Adapters button (prominent, green)"**
   - Source: US4.1.1
   - Screens: Page 1
   - Components: Primary action button (green, prominent placement)
   - States: Enabled (job completed), Disabled (job running/failed)
   - Notes: Button appears only when job status = completed

2. **"Click initiates ZIP file download: {job_name}-adapters-{job_id}.zip"**
   - Source: US4.1.1
   - Screens: Page 1 → Page 2
   - Components: Download button, browser download dialog
   - States: Click triggered, download initiated, file saving
   - Notes: Filename format includes job name and ID for uniqueness

3. **"ZIP contains: adapter_model.bin (200-500MB), adapter_config.json, README.txt, training_summary.json"**
   - Source: US4.1.1
   - Screens: Page 1, Page 5
   - Components: File list table, file icons, size indicators
   - States: Files listed with sizes and descriptions
   - Notes: Show expected contents before download

4. **"Download progress indicator for large files"**
   - Source: US4.1.1
   - Screens: Page 2
   - Components: Progress modal, progress bar, percentage text, estimated time
   - States: Downloading (0-100%), completed, failed
   - Notes: Essential for 200-500MB files (can take 1-5 minutes)

5. **"Generate signed URL valid for 24 hours (security)"**
   - Source: US4.1.1
   - Screens: Page 1, Page 4
   - Components: Expiration timestamp, countdown indicator
   - States: Valid (<24hrs), Expires soon (<6hrs, yellow warning), Expired (>24hrs, red badge)
   - Notes: Show "Expires in 5 hours 32 minutes" or similar

6. **"After 24 hours: Regenerate download link"**
   - Source: US4.1.1
   - Screens: Page 4
   - Components: "Link Expired" badge, "Regenerate Link" button, regeneration progress
   - States: Expired shown, regeneration in progress, new link ready
   - Notes: Prevents security issues with long-lived URLs

7. **"Track download count and timestamp for audit trail"**
   - Source: US4.1.1
   - Screens: Page 3
   - Components: Download counter badge ("Downloaded 3×"), history table (timestamp, user)
   - States: Zero downloads, multiple downloads, history expanded/collapsed
   - Notes: Audit requirement for tracking who downloaded when

8. **"Notification after download: 'Adapters downloaded. See README.txt for integration instructions.'"**
   - Source: US4.1.1
   - Screens: Page 3
   - Components: Success toast notification, dismissible, auto-dismiss after 5 seconds
   - States: Notification shown, user dismissed, auto-dismissed
   - Notes: Guides user to next step (reading README)

9. **"Example README content: integration steps, dependencies, support link"**
   - Source: US4.1.1
   - Screens: Page 5
   - Components: README preview modal, code blocks, copy buttons, support link
   - States: Modal open, code copied, link clicked
   - Notes: Shows actual content from README for preview

Non-UI Acceptance Criteria

**Backend/API Criteria:**
1. **"ZIP file generation and packaging"**
   - Impact: Backend must generate ZIP on-demand or pre-generate on job completion
   - UI Hint: Show generation progress if created on-demand (rare, usually pre-generated)

2. **"Signed URL generation with 24-hour expiration"**
   - Impact: Backend generates secure temporary URLs
   - UI Hint: Display expiration timestamp, handle expired state gracefully

3. **"Storage in Supabase Storage"**
   - Impact: Files stored in specific bucket and path structure
   - UI Hint: Show storage path in metadata section (for power users)

4. **"Download count tracking in database"**
   - Impact: Increment counter on each download, log timestamp and user
   - UI Hint: Display current count and history in UI

Estimated Page Count
- 5 pages total
- Rationale: Cover all states (ready, downloading, success, expired, preview) with clear flows and transitions. Each state represents distinct user experience requiring separate wireframe.

=== END PROMPT FR: FR4.1.1 ===

---

=== BEGIN PROMPT FR: FR4.1.2 ===

Title
- FR FR4.1.2 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR provides comprehensive storage management for trained LoRA adapters, enabling users to view storage details, track versions, manage retention, and perform bulk operations. Users can see where adapters are stored (Supabase Storage bucket), monitor storage usage across all jobs, and clean up old adapters to free space. This supports long-term artifact management and organizational needs beyond immediate downloads.

Journey Integration
- Stage 4 user goals: Manage model artifact storage, track versions across training runs, monitor storage costs, clean up old artifacts
- Key emotions: Control (manage storage), confidence (versioning safety), efficiency (bulk operations), awareness (usage visibility)
- Progressive disclosure levels:
  * Basic: View storage path and file sizes
  * Advanced: See retention policies, download counts, version history
  * Expert: Bulk delete, storage usage analytics, cost projections
- Persona adaptations: AI Engineers need version tracking; Technical Leads need storage oversight and cost management

### Journey-Informed Design Elements
- User Goals: View storage metadata, manage storage space, track artifact versions, perform cleanup operations
- Emotional Requirements: Confidence in data safety, control over storage, awareness of costs, efficiency in management
- Progressive Disclosure:
  * Basic: Storage path, file sizes, upload timestamps
  * Advanced: Retention policies, version lists, download history
  * Expert: Storage dashboard, bulk operations, cost estimates
- Success Indicators: Storage visible, versions tracked, cleanup successful, costs predictable
  
Wireframe Goals
- Display storage metadata for each job (path, sizes, timestamps)
- Show aggregate storage usage across all jobs
- Enable version comparison across multiple training runs
- Provide bulk deletion with safety confirmations
- Visualize storage cost projections
- Maintain audit trail for all storage operations

Explicit UI Requirements (from acceptance criteria)
- **Storage Bucket Display**: Show "Stored in: model-artifacts bucket"
- **Folder Structure**: Display path: `{job_id}/adapters/` with copyable text
- **File List**: Show files: adapter_model.bin, adapter_config.json, training_summary.json with individual sizes
- **Retention Policy**: Display "Retention: Permanent (configurable)" with edit option
- **Version Indicator**: Show "Version: Job #47 created 2025-12-15"
- **Metadata Panel**: Storage path, File sizes (e.g., "adapter_model.bin: 442 MB"), Upload timestamp, Download count
- **Delete Option**: "Delete Adapters" button (destructive, requires confirmation) with audit log note
- **Storage Dashboard**: Total storage used (15.3 GB), Number of stored models (23), Average model size (665 MB), Storage cost estimate
- **Bulk Operations**: Multi-select checkbox list, "Delete Selected" button with count preview

Interactions and Flows
1. **View Storage Details**: Job details page → Storage section → Expand to see path, sizes, timestamps
2. **Delete Single Adapter**: Click "Delete Adapters" → Confirmation modal (show impact) → Confirm → Delete → Audit log entry → Success message
3. **Storage Dashboard Access**: Navigate to Storage Dashboard → View aggregate stats → Filter by date range → See cost projections
4. **Bulk Delete Flow**: Storage dashboard → Select multiple old jobs (checkboxes) → "Delete Selected (5 jobs)" → Confirmation showing total space freed → Confirm → Batch delete → Update dashboard
5. **Version Comparison**: Select 2+ jobs → "Compare Versions" → Side-by-side view of storage details and configurations

Visual Feedback
- **Storage Indicators**: Usage bar showing 15.3GB / 100GB with percentage
- **Delete Confirmation**: Modal with red warning icon, impact preview ("This will free 442 MB"), checkbox "I understand this is permanent"
- **Audit Badge**: "Logged to audit trail" note on delete confirmation
- **Cost Projections**: Chart showing "Current: $2.45/month" → "Projected (6 months): $14.70" with growth curve
- **Bulk Selection**: Checkbox selection count: "5 jobs selected (3.2 GB total)"

Accessibility Guidance
- Storage path: Copyable with keyboard (Ctrl+C on focus), screen reader announces "Storage path"
- Delete button: aria-label="Delete adapters permanently", requires confirmation
- Confirmation modal: Focus trap, Escape key dismisses, primary/secondary buttons clearly labeled
- Storage dashboard: Data table with sortable headers, keyboard navigation (arrow keys)
- Bulk checkboxes: aria-label with job name, space key toggles selection

Information Architecture
- **Job Details Page**
  - Model Artifacts Section (FR4.1.1)
  - **Storage Details Section** (FR4.1.2 focus)
    - Storage Path (copyable)
    - File Metadata Table
    - Retention Policy
    - Delete Option
  - Metrics Export Section (FR4.2.x)
- **Storage Dashboard** (separate page)
  - Usage Summary Cards
  - Cost Projections Chart
  - Job List with Bulk Actions
  - Filter and Sort Controls

Page Plan
1. **Page 1: Job Details - Storage Metadata Section**
   - Purpose: Show storage details for individual job
   - Components: Storage path (copyable), file list with sizes, upload timestamp, download count, retention policy, delete button
   - States: Storage visible, delete enabled

2. **Page 2: Delete Confirmation Modal**
   - Purpose: Confirm adapter deletion with impact preview
   - Components: Warning icon, confirmation message, impact summary (442 MB freed), audit trail note, confirmation checkbox, Cancel/Delete buttons
   - States: Modal open, checkbox unchecked (delete disabled), checkbox checked (delete enabled)

3. **Page 3: Storage Dashboard - Overview**
   - Purpose: Aggregate storage usage across all jobs
   - Components: Summary cards (Total: 15.3GB, Models: 23, Avg size: 665MB, Cost: $2.45/mo), usage chart, filters (date range, status)
   - States: Dashboard loaded, filters inactive

4. **Page 4: Storage Dashboard - Bulk Operations**
   - Purpose: Multi-select jobs for bulk deletion
   - Components: Job list table with checkboxes, "Select All" header checkbox, "Delete Selected (5)" button, total space preview (3.2 GB)
   - States: 5 jobs selected, bulk delete button enabled

5. **Page 5: Bulk Delete Confirmation**
   - Purpose: Confirm bulk deletion with aggregate impact
   - Components: List of selected jobs, total space freed (3.2 GB), permanent deletion warning, confirmation checkbox, Cancel/Delete All buttons
   - States: Modal open, job list displayed, confirmation required

6. **Page 6: Storage Cost Projections**
   - Purpose: Visualize storage growth and costs
   - Components: Line chart (storage over time), cost projections (current → 6 months), recommended cleanup actions, export data button
   - States: Chart rendered, projections calculated

Annotations (Mandatory)
- Label each storage field with source criterion (e.g., "Storage path - US4.1.2: Folder structure {job_id}/adapters/")
- Mark delete button with: "US4.1.2: Requires confirmation, creates audit log entry"
- Tag dashboard cards with: "US4.1.2: Storage usage dashboard shows total used, model count, avg size, cost"
- Note bulk operations: "US4.1.2: Bulk operations - Delete multiple old adapters"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"All adapter files stored in Supabase Storage bucket: model-artifacts"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: Storage location label: "Stored in: model-artifacts bucket"
   - States: Always visible on job details
   - Notes: Informs user where files live (technical detail)

2. **"Folder structure: {job_id}/adapters/"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: Storage path field (copyable text), copy button
   - States: Path displayed, copied to clipboard (feedback)
   - Notes: Format example: "job_abc123xyz/adapters/"

3. **"Files: adapter_model.bin, adapter_config.json, training_summary.json"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: File list table (File Name, Size, Type columns)
   - States: Files listed with individual sizes and icons
   - Notes: Same list as FR4.1.1 but with storage metadata focus

4. **"Storage retention: Permanent by default (configurable)"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: Retention policy display, "Edit Policy" link
   - States: Current policy shown (Permanent), edit opens modal/dropdown
   - Notes: Future enhancement: configure per-job retention (30/60/90 days, permanent)

5. **"Versioning: Each training job creates unique version"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: Version indicator: "Version: Job #47 (Dec 15, 2025)"
   - States: Version number and date displayed
   - Notes: Links to job list for version comparison

6. **"Job details page shows: Storage path, File sizes, Upload timestamp, Download count"**
   - Source: US4.1.2
   - Screens: Page 1
   - Components: Metadata panel with labeled fields
   - States: All metadata visible, copyable path
   - Notes: Consolidates storage information in one section

7. **"Option to delete adapters (free up storage): Requires confirmation, creates audit log entry"**
   - Source: US4.1.2
   - Screens: Page 1 → Page 2
   - Components: "Delete Adapters" button (red), confirmation modal with warning and audit note
   - States: Delete enabled, confirmation required, audit logged
   - Notes: Permanent action with safety checks

8. **"Storage usage dashboard: Total storage used: 15.3 GB, Number of stored models: 23, Average model size: 665 MB, Storage cost estimate"**
   - Source: US4.1.2
   - Screens: Page 3, Page 6
   - Components: Summary cards (4 cards), usage visualization (bar/chart), cost calculator
   - States: Dashboard loaded, real-time data displayed
   - Notes: Aggregate view across all jobs in workspace

9. **"Bulk operations: Delete multiple old adapters to free storage"**
   - Source: US4.1.2
   - Screens: Page 4 → Page 5
   - Components: Job list with checkboxes, "Delete Selected" button, bulk confirmation modal
   - States: Jobs selectable, bulk action triggered, confirmation shown
   - Notes: Efficient cleanup for managing many old models

Non-UI Acceptance Criteria

**Backend/Storage Criteria:**
1. **"Supabase Storage bucket configuration and permissions"**
   - Impact: Backend manages storage bucket access and security
   - UI Hint: Storage path indicates which bucket (informational only)

2. **"Folder naming convention: {job_id}/adapters/"**
   - Impact: Consistent file organization for retrieval
   - UI Hint: Display path helps users understand structure

3. **"Permanent retention by default"**
   - Impact: Files not auto-deleted unless user requests
   - UI Hint: Show retention policy clearly (no surprises)

4. **"Audit log for delete operations"**
   - Impact: Every deletion logged with timestamp, user, reason
   - UI Hint: Note in confirmation modal that action is audited

5. **"Storage cost calculation"**
   - Impact: Backend calculates based on GB usage and pricing
   - UI Hint: Display estimated cost in dashboard

Estimated Page Count
- 6 pages total
- Rationale: Cover individual job storage details (2 pages), aggregate dashboard (2 pages), bulk operations (2 pages). Comprehensive storage management requires multiple views for different user needs (single job vs workspace-level management).

=== END PROMPT FR: FR4.1.2 ===

---

=== BEGIN PROMPT FR: FR4.2.1 ===

Title
- FR FR4.2.1 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR enables users to export comprehensive training metrics (loss curves, learning rates, perplexity, GPU utilization) as CSV or JSON files for detailed analysis, reporting, and quality assurance. Engineers can analyze performance in spreadsheets, data scientists can process metrics programmatically, and quality analysts can create custom reports. The export includes all historical data from training start to completion with optional embedded charts.

Journey Integration
- Stage 4 user goals: Analyze training performance, create detailed reports, validate model quality, document outcomes for stakeholders
- Key emotions: Thoroughness (complete data access), empowerment (self-service analytics), professionalism (exportable reports)
- Progressive disclosure levels:
  * Basic: One-click CSV export for spreadsheet analysis
  * Advanced: JSON export with nested structure, chart embedding
  * Expert: Programmatic access, custom analysis pipelines
- Persona adaptations: Quality Analysts need CSV for spreadsheet analysis; Data Scientists need JSON for code integration; Business Owners need charts for presentations

### Journey-Informed Design Elements
- User Goals: Export training metrics, analyze performance data, generate custom reports, validate quality claims
- Emotional Requirements: Confidence in data completeness, ease of export, format flexibility, professional output
- Progressive Disclosure:
  * Basic: "Export Metrics" button with format selection
  * Advanced: Preview data structure, include/exclude options
  * Expert: API access, automated export pipelines
- Success Indicators: Metrics exported successfully, data complete, format usable, analysis enabled
  
Wireframe Goals
- Provide instant export of complete training metrics
- Support both CSV (human-readable) and JSON (programmatic) formats
- Preview data structure before downloading
- Include optional chart embedding (PNG images)
- Track export history for audit
- Maintain consistent data formatting and completeness

Explicit UI Requirements (from acceptance criteria)
- **Export Button**: "Export Metrics" button on job details page
- **Format Selector**: Radio buttons or dropdown: "CSV (Spreadsheet)" / "JSON (Programmatic)"
- **CSV Columns List**: Display columns: step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds
- **JSON Structure Preview**: Show nested structure example with job_metadata, training_metrics array, final_metrics summary
- **Include Charts Option**: Checkbox: "Include loss curves as embedded PNG"
- **File Naming Preview**: Show generated filename: `{job_name}-metrics-{timestamp}.{csv|json}`
- **Download Trigger**: "Download" button initiates file download
- **Export Counter**: Track export count for audit trail: "Exported 2 times"
- **No Generation Delay**: Instant download (files pre-generated or quickly assembled)

Interactions and Flows
1. **Primary Export Flow**: Job details page → Click "Export Metrics" → Format selection modal opens → Choose CSV/JSON → Optional: check "Include charts" → Click "Download" → File downloads instantly
2. **CSV Export**: Select CSV format → Preview column list → Download → Open in Excel/Google Sheets
3. **JSON Export**: Select JSON format → Preview structure → Download → Process with Python/JavaScript
4. **Chart Embedding**: Check "Include charts" → System packages loss curve PNG in ZIP → Download ZIP with metrics + images
5. **Export History**: View "Export History" section → See past exports (timestamp, format, user) → Re-download previous exports

Visual Feedback
- **Format Icons**: CSV icon (table/grid), JSON icon (brackets/code)
- **Preview Panel**: Shows first 5-10 rows/items of data structure
- **Download Progress**: Brief loading indicator for chart embedding (<2 seconds)
- **Success Toast**: "Metrics exported successfully. File saved to Downloads."
- **Export Badge**: Counter showing "2 exports" with timestamp of last export

Accessibility Guidance
- Export button: aria-label="Export training metrics", keyboard accessible
- Format radio buttons: Keyboard navigable (arrow keys), labels associated with inputs
- Preview panel: Scrollable with keyboard, screen reader announces data structure
- Download button: aria-live="polite" announces download start
- Export history table: Sortable headers, keyboard navigation

Information Architecture
- **Job Details Page**
  - Model Artifacts Section (FR4.1.x)
  - **Metrics Export Section** (FR4.2.1 focus)
    - Export Button (primary action)
    - Format Selector
    - Options (charts, date range filters)
    - Export History (collapsible)
  - Report Generation Section (FR4.2.2)

Page Plan
1. **Page 1: Job Details - Metrics Export Section**
   - Purpose: Show export option on job details page
   - Components: "Export Metrics" button, export counter badge, export history link
   - States: Export available (job completed), disabled (job running)

2. **Page 2: Export Configuration Modal**
   - Purpose: Configure export format and options
   - Components: Format selector (CSV/JSON radio buttons), column/structure preview, "Include charts" checkbox, filename preview, Cancel/Download buttons
   - States: CSV selected (default), preview updates based on selection

3. **Page 3: CSV Format Selected**
   - Purpose: Preview CSV structure and columns
   - Components: Format radio (CSV selected), column list display, sample data preview (first 5 rows), filename: "{job_name}-metrics-{timestamp}.csv"
   - States: CSV format active, preview rendered

4. **Page 4: JSON Format Selected**
   - Purpose: Preview JSON structure and nested data
   - Components: Format radio (JSON selected), structure preview (job_metadata, training_metrics array, final_metrics), sample JSON snippet, filename: "{job_name}-metrics-{timestamp}.json"
   - States: JSON format active, nested structure visible

5. **Page 5: Download In Progress with Charts**
   - Purpose: Show brief packaging process when charts included
   - Components: Progress indicator: "Packaging metrics and charts...", status: "Generating loss curve PNG...", estimated time: "2-3 seconds"
   - States: Charts being embedded, ZIP file assembling

6. **Page 6: Export Success & History**
   - Purpose: Confirm export and show history
   - Components: Success toast notification, updated export counter (now "3 exports"), export history table (timestamp, format, user, actions: "Re-download")
   - States: Export completed, history updated, audit trail visible

Annotations (Mandatory)
- Label export button with: "US4.2.1: Export Metrics button on job details page"
- Mark format options with: "US4.2.1: Format options - CSV (spreadsheet analysis) / JSON (programmatic access)"
- Tag column list with: "US4.2.1: CSV includes columns - step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds"
- Note JSON structure with: "US4.2.1: JSON includes nested structure - job_metadata, training_metrics array, final_metrics summary"
- Mark chart option with: "US4.2.1: Option to include charts (loss curves) as embedded PNG"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"Export Metrics button on job details page"**
   - Source: US4.2.1
   - Screens: Page 1
   - Components: Secondary action button in Metrics section
   - States: Enabled (job completed), Disabled (job running/failed)
   - Notes: Appears alongside download adapters button

2. **"Format options: CSV (spreadsheet analysis) / JSON (programmatic access)"**
   - Source: US4.2.1
   - Screens: Page 2, Page 3, Page 4
   - Components: Radio button group or toggle, format descriptions
   - States: CSV selected (default), JSON selected
   - Notes: Default to CSV for most common use case

3. **"CSV Export includes columns: step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds"**
   - Source: US4.2.1
   - Screens: Page 3
   - Components: Column list display, sample data preview (table)
   - States: Columns listed with descriptions, sample rows visible
   - Notes: Show 5-10 sample rows to illustrate data structure

4. **"JSON Export includes nested structure: job_metadata, training_metrics array, final_metrics"**
   - Source: US4.2.1
   - Screens: Page 4
   - Components: JSON structure preview (code block with syntax highlighting)
   - States: Nested structure visible, expandable/collapsible sections
   - Notes: Show example with actual data values from job

5. **"Export includes all historical data from training start to completion"**
   - Source: US4.2.1
   - Screens: Page 2
   - Components: Data completeness indicator: "Contains 2,000 steps of metrics"
   - States: Full dataset confirmed
   - Notes: Reassure user nothing is truncated

6. **"File naming: {job_name}-metrics-{timestamp}.{csv|json}"**
   - Source: US4.2.1
   - Screens: Page 2, Page 3, Page 4
   - Components: Filename preview field (read-only, copyable)
   - States: Filename updates based on format selection
   - Notes: Example: "Elena-Financial-Balanced-metrics-2025-12-18.csv"

7. **"One-click download, no generation delay"**
   - Source: US4.2.1
   - Screens: Page 2 → Page 6
   - Components: Download button, instant file delivery
   - States: Click → immediate download start (<1 second)
   - Notes: Files should be pre-generated or quickly assembled

8. **"Option to include charts (loss curves) as embedded PNG in export package"**
   - Source: US4.2.1
   - Screens: Page 2, Page 5
   - Components: Checkbox: "Include loss curves as PNG images", ZIP packaging indicator
   - States: Unchecked (metrics only), Checked (metrics + charts in ZIP)
   - Notes: When checked, adds 2-3 seconds for chart generation and ZIP packaging

9. **"Track export count for audit trail"**
   - Source: US4.2.1
   - Screens: Page 1, Page 6
   - Components: Export counter badge, export history table
   - States: Zero exports, multiple exports, history expanded
   - Notes: Similar to download tracking in FR4.1.1

Non-UI Acceptance Criteria

**Backend/Data Criteria:**
1. **"Metrics data persistence during training"**
   - Impact: Backend logs all metrics to database during training
   - UI Hint: Show data completeness indicator (2,000 steps logged)

2. **"CSV formatting with proper headers and data types"**
   - Impact: Backend generates valid CSV with headers, numeric formatting, timestamps
   - UI Hint: Preview shows properly formatted data

3. **"JSON schema validation"**
   - Impact: Backend ensures JSON structure is valid and parseable
   - UI Hint: Preview shows valid JSON syntax

4. **"Chart image generation (PNG)"**
   - Impact: Backend renders loss curves as PNG images using matplotlib or similar
   - UI Hint: Show brief "Generating charts..." indicator if not pre-generated

5. **"ZIP packaging when charts included"**
   - Impact: Backend creates ZIP file containing metrics file + PNG images
   - UI Hint: Filename changes to .zip when charts included

Estimated Page Count
- 6 pages total
- Rationale: Cover export configuration (3 pages for formats), download process (2 pages), success and history (1 page). Multiple format options require separate wireframes to show different previews and structures.

=== END PROMPT FR: FR4.2.1 ===

---

=== BEGIN PROMPT FR: FR4.2.2 ===

Title
- FR FR4.2.2 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR enables generation of professional PDF training reports with comprehensive summaries, loss curves, metrics tables, and cost breakdowns for client deliverables and stakeholder presentations. Quality analysts can create polished reports showcasing model performance, business owners can present validation results to clients, and technical leads can document training outcomes for records. The report includes Bright Run branding and shareable secure links.

Journey Integration
- Stage 4 user goals: Generate client-ready reports, document training outcomes, present validation results, create professional deliverables
- Key emotions: Professionalism (polished output), confidence (comprehensive documentation), pride (shareable achievements), credibility (branded reports)
- Progressive disclosure levels:
  * Basic: One-click report generation with standard sections
  * Advanced: Report preview before download, customization options
  * Expert: Custom branding, white-labeling, API-generated reports
- Persona adaptations: Quality Analysts need comprehensive metrics; Business Owners need executive summaries; Clients need proof of value

### Journey-Informed Design Elements
- User Goals: Generate PDF reports, preview before downloading, share with stakeholders, document training success
- Emotional Requirements: Professional presentation, comprehensive coverage, easy sharing, credibility
- Progressive Disclosure:
  * Basic: "Generate Report" button with standard template
  * Advanced: Report preview, section selection, custom notes
  * Expert: Template customization, white-labeling, automated generation
- Success Indicators: Report generated successfully, all sections included, shareable link created, professional appearance
  
Wireframe Goals
- Provide one-click PDF report generation
- Preview report before downloading
- Include all key sections (cover, summary, metrics, cost, appendix)
- Generate shareable secure links (30-day expiration)
- Track report generation history
- Maintain professional Bright Run branding

Explicit UI Requirements (from acceptance criteria)
- **Generate Button**: "Generate Report" button on completed job details page
- **Report Sections List**: Preview includes: Cover Page, Executive Summary (1 page), Training Metrics (2 pages), Cost Breakdown (1 page), Appendix
- **Executive Summary Content**: Training file details, Configuration summary, Duration, Final loss with improvement percentage, Cost, Status
- **Metrics Section Content**: Loss curves graph (training + validation), Learning rate schedule graph, Metrics table (loss, perplexity, GPU util), Convergence analysis
- **Cost Breakdown Content**: GPU cost breakdown, Spot interruption overhead, Storage costs, Total cost, Cost efficiency comparison
- **Report Generation Time**: 5-10 seconds with progress indicator
- **Preview Option**: "Preview Report" before downloading
- **File Naming**: `{job_name}-training-report-{timestamp}.pdf`
- **Shareable Link**: Generate secure link with 30-day expiration, shareable via email/Slack

Interactions and Flows
1. **Primary Generation Flow**: Job details page → Click "Generate Report" → Progress indicator (5-10 seconds) → Preview modal opens → Review report → Download or Share
2. **Preview Flow**: Report generated → Preview modal shows cover + first few pages → Scroll through sections → Click "Download PDF" or "Generate Share Link"
3. **Share Link Flow**: Click "Share Report" → Link generation modal → Copy link or send via email/Slack → Link expires in 30 days
4. **Re-generate Flow**: View old report in history → Click "Re-generate" → Fresh report created with current timestamp → Preview → Download

Visual Feedback
- **Generation Progress**: Progress bar with steps: "Rendering charts..." → "Generating PDF..." → "Finalizing report..." (5-10 seconds total)
- **Preview Window**: PDF viewer embedded in modal showing actual report pages
- **Share Link Badge**: "Shareable link expires Dec 25, 2025" with countdown
- **Report Ready Toast**: "Training report ready. Preview or download now."
- **Download Icon**: PDF icon next to filename

Accessibility Guidance
- Generate button: aria-label="Generate training report PDF", keyboard accessible
- Progress indicator: aria-live="polite", announces generation steps
- Preview modal: Focus trap, Escape key closes, keyboard scrolling (Page Up/Down)
- PDF viewer: Zoom controls accessible via keyboard (+/- keys)
- Share link: Copyable with keyboard (Ctrl+C), screen reader announces "Link copied"

Information Architecture
- **Job Details Page**
  - Model Artifacts Section (FR4.1.x)
  - Metrics Export Section (FR4.2.1)
  - **Report Generation Section** (FR4.2.2 focus)
    - Generate Report Button (primary action)
    - Report History (past generated reports)
    - Share Link Management
  - Deployment Package Section (FR4.3.x)

Page Plan
1. **Page 1: Job Details - Report Generation Section**
   - Purpose: Show report generation option on job details page
   - Components: "Generate Report" button, report history list (past reports with download links), shareable links status
   - States: Report available (job completed), generating disabled (job running)

2. **Page 2: Report Generation In Progress**
   - Purpose: Show generation progress with estimated time
   - Components: Progress bar, current step indicator ("Rendering loss curves..."), estimated time remaining ("8 seconds remaining"), generation logs (optional expand)
   - States: Rendering charts (step 1/4), generating PDF (step 2/4), finalizing (step 4/4)

3. **Page 3: Report Preview Modal - Cover & Executive Summary**
   - Purpose: Preview report content before downloading
   - Components: PDF viewer embedded, page navigation (1 of 5), zoom controls, sections outline, Download/Share buttons
   - States: Preview open, showing pages 1-2 (cover + executive summary), scrollable

4. **Page 4: Report Preview - Training Metrics Section**
   - Purpose: Show detailed metrics pages in preview
   - Components: PDF viewer showing pages 3-4 (loss curves graph, learning rate graph, metrics table, convergence analysis), page navigation
   - States: Viewing metrics section, charts visible

5. **Page 5: Report Preview - Cost Breakdown & Appendix**
   - Purpose: Show cost details and appendix in preview
   - Components: PDF viewer showing page 5 (cost breakdown table, efficiency comparison, full configuration details, checkpoint history), page navigation
   - States: Viewing final pages, complete report preview

6. **Page 6: Report Download & Share Options**
   - Purpose: Provide download and sharing actions
   - Components: "Download PDF" button (primary), "Generate Share Link" button (secondary), filename display: "Elena-Financial-Balanced-training-report-2025-12-18.pdf", success toast
   - States: Report ready, actions enabled

7. **Page 7: Share Link Generation Modal**
   - Purpose: Create and manage shareable link
   - Components: "Generate Secure Link" button, link output field (copyable), expiration info: "Expires in 30 days (Jan 17, 2026)", share options (Email, Slack, Copy), link usage tracking: "Viewed 3 times"
   - States: Link generation form, link generated and copyable, usage stats visible

Annotations (Mandatory)
- Label generate button with: "US4.2.2: Generate Report button on completed job details page"
- Mark progress indicator with: "US4.2.2: Report generation takes 5-10 seconds"
- Tag preview with: "US4.2.2: Preview report before download"
- Note sections with: "US4.2.2: PDF includes Cover Page, Executive Summary, Training Metrics (2 pages), Cost Breakdown, Appendix"
- Mark share link with: "US4.2.2: Shareable via secure link (30-day expiration)"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"Generate Report button on completed job details page"**
   - Source: US4.2.2
   - Screens: Page 1
   - Components: Primary action button in Report section
   - States: Enabled (job completed), Disabled (job running/failed)
   - Notes: Positioned alongside other export options

2. **"PDF report includes: Cover Page, Executive Summary (1 page), Training Metrics (2 pages), Cost Breakdown (1 page), Appendix"**
   - Source: US4.2.2
   - Screens: Page 3, Page 4, Page 5
   - Components: PDF page viewer, section outline, page counter (1 of 5+)
   - States: All sections visible in preview, navigable
   - Notes: Standard 5+ page report structure

3. **"Executive Summary: Training file details, Configuration, Duration, Final loss with improvement, Cost, Status"**
   - Source: US4.2.2
   - Screens: Page 3
   - Components: Executive summary page content in PDF preview
   - States: Summary rendered with actual job data
   - Notes: Example: "Duration: 13.2 hours, Final loss: 0.287 (baseline: 1.423) - 80% improvement, Cost: $48.32, Status: Completed successfully"

4. **"Training Metrics: Loss curves graph, Learning rate schedule graph, Metrics table, Convergence analysis"**
   - Source: US4.2.2
   - Screens: Page 4
   - Components: Metrics pages in PDF preview showing charts and tables
   - States: Graphs rendered from actual training data
   - Notes: Example convergence analysis: "Loss plateaued at epoch 2.5, indicating optimal training completion"

5. **"Cost Breakdown: GPU cost, Spot interruptions overhead, Storage costs, Total cost, Cost efficiency"**
   - Source: US4.2.2
   - Screens: Page 5
   - Components: Cost breakdown page in PDF preview with itemized table
   - States: Cost details rendered with actual job costs
   - Notes: Example: "GPU cost: $33.12 (spot H100, 13.2hrs @ $2.49/hr), Interruptions: 2 (overhead: $1.20), Storage: $0.15, Total: $48.32, Efficiency: 68% cheaper than on-demand ($146 estimate)"

6. **"Appendix: Full configuration details, Checkpoint history, Event log summary"**
   - Source: US4.2.2
   - Screens: Page 5
   - Components: Appendix pages in PDF preview
   - States: Technical details rendered for reference
   - Notes: Comprehensive technical documentation for power users

7. **"Report generation takes 5-10 seconds"**
   - Source: US4.2.2
   - Screens: Page 2
   - Components: Progress bar, step indicators, time estimate
   - States: Generation in progress, steps advancing, countdown updating
   - Notes: Typical time: 5-7 seconds for standard reports

8. **"Preview report before download"**
   - Source: US4.2.2
   - Screens: Page 3, Page 4, Page 5, Page 6
   - Components: PDF preview modal with viewer, navigation controls
   - States: Preview open, pages scrollable, zoom adjustable
   - Notes: Allows user to review before committing to download

9. **"File naming: {job_name}-training-report-{timestamp}.pdf"**
   - Source: US4.2.2
   - Screens: Page 6
   - Components: Filename display (read-only, copyable)
   - States: Filename generated based on job name and current date
   - Notes: Example: "Elena-Financial-Balanced-training-report-2025-12-18.pdf"

10. **"Shareable via secure link (30-day expiration)"**
    - Source: US4.2.2
    - Screens: Page 7
    - Components: Share link generation modal, link output field, expiration countdown, usage tracking
    - States: Link generated, copyable, expiration visible, view count tracked
    - Notes: Use case: Share with clients, team members, stakeholders without requiring login

Non-UI Acceptance Criteria

**Backend/Report Generation Criteria:**
1. **"PDF rendering engine (e.g., puppeteer, wkhtmltopdf, LaTeX)"**
   - Impact: Backend generates PDF from HTML/LaTeX template
   - UI Hint: Show generation progress during rendering

2. **"Chart image generation for report (PNG/SVG)"**
   - Impact: Backend renders loss curves, learning rate graphs as images embedded in PDF
   - UI Hint: Progress step: "Rendering charts..."

3. **"Bright Run branding (logo, colors, fonts)"**
   - Impact: PDF includes branded cover page and headers
   - UI Hint: Cover page visible in preview shows branding

4. **"Secure shareable link with expiration"**
   - Impact: Backend generates signed URL with 30-day expiration
   - UI Hint: Show expiration date and countdown in UI

5. **"Report template configuration"**
   - Impact: Backend uses standardized template for all reports
   - UI Hint: Consistent section structure across all generated reports

Estimated Page Count
- 7 pages total
- Rationale: Cover report generation (2 pages), preview all sections (3 pages), download and share (2 pages). Professional report feature requires comprehensive preview and sharing capabilities.

=== END PROMPT FR: FR4.2.2 ===

---

=== BEGIN PROMPT FR: FR4.3.1 ===

Title
- FR FR4.3.1 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR provides a complete deployment package including LoRA adapters, inference script, dependencies file, comprehensive README, example prompts, and training summary for seamless client integration. Client integration engineers receive everything needed to deploy the trained model without reverse-engineering requirements. The package enables immediate testing with runnable examples and clear deployment instructions for various platforms.

Journey Integration
- Stage 4 user goals: Deliver production-ready deployment package, enable client self-service integration, reduce support burden, accelerate time-to-deployment
- Key emotions: Completeness (everything included), confidence (deployment-ready), professionalism (polished deliverable), ease (no confusion)
- Progressive disclosure levels:
  * Basic: One-click download with README and examples
  * Advanced: View package contents before downloading, customization options
  * Expert: API templates, Docker configurations, cloud deployment guides
- Persona adaptations: Client Engineers need turnkey deployment; Technical Leads need deployment flexibility; Business Owners need professional packaging

### Journey-Informed Design Elements
- User Goals: Download complete deployment package, understand integration requirements, test locally, deploy to production
- Emotional Requirements: Confidence in completeness, clarity of instructions, ease of deployment, professional presentation
- Progressive Disclosure:
  * Basic: Download package with runnable examples
  * Advanced: Preview README and requirements, package customization
  * Expert: API templates, containerization, cloud deployment
- Success Indicators: Package downloaded, local testing successful, deployment instructions clear, production deployment ready
  
Wireframe Goals
- Provide comprehensive deployment package in single download
- Display package contents clearly before downloading
- Preview README instructions and example usage
- Show system requirements and dependencies
- Generate deployment-ready artifacts (500-700MB)
- Track package downloads for client success metrics

Explicit UI Requirements (from acceptance criteria)
- **Download Button**: "Download Deployment Package" button on completed jobs
- **Package Contents List**: Display:
  1. adapters/ folder (adapter_model.bin, adapter_config.json)
  2. inference.py (runnable script with CLI)
  3. requirements.txt (pinned dependency versions)
  4. README.md (setup, usage, deployment, troubleshooting)
  5. example_prompts.json (10 domain-specific samples)
  6. training_summary.json (job metadata and metrics)
- **File Size Indicator**: "Package size: ~650 MB (GPU required for inference)"
- **Requirements Preview**: Show dependencies: transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0
- **README Preview**: Expandable preview showing setup instructions, usage examples, deployment options
- **Example Prompts Preview**: Show 2-3 sample prompts (e.g., "What are the benefits of a Roth IRA?")
- **System Requirements**: Display GPU requirements, VRAM usage, inference speed estimates
- **Download Filename**: `{job_name}-deployment-package-{job_id}.zip`
- **Signed URL Expiration**: 48-hour validity with regeneration option

Interactions and Flows
1. **Primary Download Flow**: Job details page → Click "Download Deployment Package" → Package contents modal opens → Preview README and requirements → Click "Download ZIP" → 650MB download starts → Success notification
2. **README Preview Flow**: Click "Preview README" → Modal shows formatted markdown with sections (Setup, Usage, Deployment, Troubleshooting) → Copy code snippets → Close or proceed to download
3. **Requirements Preview Flow**: Click "View Dependencies" → Modal shows requirements.txt contents → Check compatibility with client environment → Close or proceed to download
4. **Example Prompts Preview Flow**: Click "View Example Prompts" → Modal shows 10 sample prompts with expected responses → Copy prompts for testing → Close
5. **Link Expiration Flow**: Return after 48 hours → See "Link Expired" badge → Click "Regenerate Link" → New 48-hour link created → Download enabled

Visual Feedback
- **Package Icon**: ZIP file icon with size badge (650 MB)
- **Contents Checklist**: Visual list with checkmarks for each included file
- **Download Progress**: Progress bar for large file download (650 MB, 2-5 minutes)
- **README Sections**: Collapsible sections in preview (Setup ▼, Usage ▼, Deployment ▼)
- **GPU Requirement Badge**: Yellow badge: "Requires GPU (16GB+ VRAM)"
- **Success Toast**: "Deployment package downloaded. Run: pip install -r requirements.txt"

Accessibility Guidance
- Download button: aria-label="Download complete deployment package", keyboard accessible
- Contents list: Semantic list with descriptions, screen reader announces each item
- README preview: Copyable code blocks with keyboard (Ctrl+C), headings properly structured (h2, h3)
- Progress bar: aria-live="polite", announces download progress
- GPU requirement warning: role="alert" for visibility

Information Architecture
- **Job Details Page**
  - Model Artifacts Section (FR4.1.x)
  - Metrics Export Section (FR4.2.x)
  - **Deployment Package Section** (FR4.3.1 focus)
    - Download Package Button (primary action)
    - Package Contents Preview
    - System Requirements
    - README Preview
    - Example Prompts Preview
    - Download History
  - API Template Section (FR4.3.2)

Page Plan
1. **Page 1: Job Details - Deployment Package Section**
   - Purpose: Show deployment package option on job details page
   - Components: "Download Deployment Package" button, package size indicator (650 MB), GPU requirement badge, quick preview links (README, Requirements, Examples)
   - States: Package available (job completed), disabled (job running)

2. **Page 2: Package Contents & Preview Modal**
   - Purpose: Show complete package contents before downloading
   - Components: Package contents checklist (6 items with descriptions), size breakdown (adapters: 500MB, dependencies: 150MB), system requirements panel, README snippet, Download button
   - States: Modal open, contents listed, previews expandable

3. **Page 3: README Preview Expanded**
   - Purpose: Show comprehensive README instructions
   - Components: Formatted README sections (Setup Instructions, Usage Examples, Deployment Options, Troubleshooting), code blocks with copy buttons, support links
   - States: README fully visible, sections expandable/collapsible, code copyable
   - Notes: Example content:
     - Setup: Create venv, install deps (pip install -r requirements.txt)
     - Usage: Run inference.py "What are the benefits of a Roth IRA?"
     - Deployment: Local, cloud (AWS/GCP/Azure), API endpoint
     - GPU: Requires 16GB+ VRAM, A10G/A100/H100 recommended
     - Support: docs.brightrun.ai/deployment

4. **Page 4: Requirements & Dependencies Preview**
   - Purpose: Show exact dependency versions and compatibility
   - Components: requirements.txt contents (list of packages with pinned versions), Python version requirement (Python 3.10+), compatibility notes, environment setup command
   - States: Dependencies listed, versions visible, copyable

5. **Page 5: Example Prompts Preview**
   - Purpose: Show sample prompts for testing model
   - Components: 10 example prompts list (domain-specific to financial advisory), expected response quality indicators, copy buttons, testing instructions
   - States: Prompts displayed, copyable individually or all at once
   - Notes: Example prompts:
     - "What are the benefits of a Roth IRA?"
     - "Explain asset allocation for a 35-year-old investor"
     - "How should I prepare for retirement if I'm 50?"
     - (7 more domain-specific examples)

6. **Page 6: Download In Progress**
   - Purpose: Show download progress for large package
   - Components: Progress bar, file size downloaded (320 MB of 650 MB), download speed (5 MB/s), estimated time remaining (1 minute 6 seconds), cancel option
   - States: Download active, progress updating, network activity indicator

7. **Page 7: Download Success & Next Steps**
   - Purpose: Confirm download and guide next steps
   - Components: Success message, filename display, "What's Next" guide (1. Extract ZIP, 2. Install dependencies, 3. Run inference.py, 4. Test with examples, 5. Deploy), documentation link, download history updated
   - States: Download completed, next steps visible, package ready for use

Annotations (Mandatory)
- Label download button with: "US4.3.1: Download Deployment Package button on completed jobs"
- Mark contents list with: "US4.3.1: Package contents - adapters/, inference.py, requirements.txt, README.md, example_prompts.json, training_summary.json"
- Tag requirements with: "US4.3.1: Exact Python dependencies with versions - transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0"
- Note README with: "US4.3.1: Setup instructions, usage examples, deployment options, troubleshooting, support"
- Mark file size with: "US4.3.1: Package size ~500-700MB"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"Download Deployment Package button on completed jobs"**
   - Source: US4.3.1
   - Screens: Page 1
   - Components: Primary action button in Deployment section
   - States: Enabled (job completed), Disabled (job running/failed)
   - Notes: Distinguished from simple adapter download (FR4.1.1)

2. **"ZIP file: {job_name}-deployment-package-{job_id}.zip"**
   - Source: US4.3.1
   - Screens: Page 2, Page 7
   - Components: Filename display, ZIP icon
   - States: Filename generated, downloadable
   - Notes: Example: "Elena-Financial-Balanced-deployment-package-job_abc123.zip"

3. **"Package contents: 1. adapters/ folder, 2. inference.py, 3. requirements.txt, 4. README.md, 5. example_prompts.json, 6. training_summary.json"**
   - Source: US4.3.1
   - Screens: Page 2
   - Components: Checklist with descriptions, icons for each file type
   - States: All 6 items listed with brief descriptions
   - Notes: Visual hierarchy: adapters/ (largest), scripts, config files, documentation

4. **"inference.py: Runnable Python script, accepts prompt as CLI argument, outputs model response, configurable temperature and max_tokens"**
   - Source: US4.3.1
   - Screens: Page 3, Page 7
   - Components: Script description, usage example command, parameter options
   - States: Usage example visible: "python inference.py 'What are the benefits of a Roth IRA?'"
   - Notes: Shows actual runnable command for quick testing

5. **"requirements.txt: Exact Python dependencies with versions - transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0"**
   - Source: US4.3.1
   - Screens: Page 4
   - Components: Dependency list display, version numbers, installation command
   - States: All dependencies listed with pinned versions, copyable
   - Notes: Critical for reproducible deployments

6. **"README.md: Setup instructions (create venv, install deps), Usage examples (run inference.py), Deployment options (local, cloud, API), Troubleshooting, Support contact"**
   - Source: US4.3.1
   - Screens: Page 3
   - Components: Formatted markdown preview, collapsible sections, code blocks
   - States: All sections visible, code copyable
   - Notes: Comprehensive guide for deployment

7. **"example_prompts.json: 10 sample prompts matching training domain (financial advisory), expected response quality examples"**
   - Source: US4.3.1
   - Screens: Page 5
   - Components: Prompts list, quality indicators, copy buttons
   - States: 10 prompts displayed, copyable
   - Notes: Domain-specific examples help verify model quality

8. **"training_summary.json: Job metadata, configuration, final metrics"**
   - Source: US4.3.1
   - Screens: Page 2
   - Components: Summary file description, metadata preview (job ID, config, metrics)
   - States: Summary metadata visible
   - Notes: Provides traceability from training to deployment

9. **"Inference script works with: pip install -r requirements.txt && python inference.py 'prompt'"**
   - Source: US4.3.1
   - Screens: Page 3, Page 7
   - Components: Quick start command example, copy button
   - States: Command copyable, runnable immediately after download
   - Notes: Verifies turnkey deployment capability

10. **"README includes GPU requirements, VRAM usage, inference speed estimates"**
    - Source: US4.3.1
    - Screens: Page 1, Page 3
    - Components: GPU requirement badge, VRAM indicator (16GB+), speed estimate (2-3 sec/response)
    - States: Requirements clearly visible before download
    - Notes: Prevents deployment failures due to insufficient resources

11. **"Package size: ~500-700MB"**
    - Source: US4.3.1
    - Screens: Page 1, Page 2, Page 6
    - Components: File size indicator, download time estimate (2-5 minutes)
    - States: Size shown before download, progress during download
    - Notes: Typical size: 650MB (adapters: 500MB, dependencies: 150MB)

12. **"Generate signed URL, valid 48 hours"**
    - Source: US4.3.1
    - Screens: Page 1, Page 2
    - Components: Expiration indicator, countdown timer, regenerate option
    - States: Valid (<48hrs), Expires soon (<12hrs, yellow), Expired (>48hrs, red)
    - Notes: Longer validity than simple adapter download (48hrs vs 24hrs) due to larger file size

Non-UI Acceptance Criteria

**Backend/Packaging Criteria:**
1. **"ZIP file generation with all components"**
   - Impact: Backend assembles all 6 components into single ZIP
   - UI Hint: Show packaging progress if on-demand (rare, usually pre-packaged)

2. **"inference.py script generation with model-specific paths"**
   - Impact: Backend creates runnable script with correct model ID and configuration
   - UI Hint: Usage example shows actual command with job-specific details

3. **"requirements.txt with pinned versions for reproducibility"**
   - Impact: Backend generates requirements file with exact versions used during training
   - UI Hint: Display versions to verify compatibility

4. **"README.md template population with job-specific details"**
   - Impact: Backend fills README template with actual job data (GPU used, duration, metrics)
   - UI Hint: Preview shows job-specific content, not generic template

5. **"example_prompts.json generation from training domain"**
   - Impact: Backend selects or generates domain-appropriate example prompts
   - UI Hint: Prompts match training data domain (financial advisory examples)

6. **"Signed URL with 48-hour expiration"**
   - Impact: Backend generates secure temporary URL, longer validity for large downloads
   - UI Hint: Show expiration countdown, regeneration option

Estimated Page Count
- 7 pages total
- Rationale: Cover deployment package overview (2 pages), detailed previews (3 pages), download process (2 pages). Comprehensive deployment package requires extensive previews to ensure client engineers understand contents and requirements before committing to large download.

=== END PROMPT FR: FR4.3.1 ===

---

=== BEGIN PROMPT FR: FR4.3.2 ===

Title
- FR FR4.3.2 Wireframes — Stage 4 — Model Artifacts & Downloads

Context Summary
- This FR provides API server templates (FastAPI, Docker, Kubernetes) enabling client engineers to deploy trained models as REST API microservices without writing API code. The deployment package includes production-ready application code, containerization configuration, deployment guides for major cloud platforms, and API endpoint specifications. This accelerates client integration from weeks to hours by providing battle-tested infrastructure templates.

Journey Integration
- Stage 4 user goals: Deploy model as API service, enable microservice architecture, scale inference endpoints, integrate with client applications
- Key emotions: Empowerment (turnkey deployment), confidence (production-ready code), efficiency (no boilerplate writing), scalability (cloud-ready)
- Progressive disclosure levels:
  * Basic: API server template with basic endpoints
  * Advanced: Docker containerization, Kubernetes configs, cloud deployment guides
  * Expert: Custom authentication, rate limiting, load balancing, monitoring
- Persona adaptations: Client Engineers need API templates; DevOps Teams need container configs; Technical Leads need cloud deployment guides

### Journey-Informed Design Elements
- User Goals: Download API templates, deploy as microservice, integrate with applications, scale inference endpoints
- Emotional Requirements: Confidence in production readiness, clarity of deployment steps, flexibility for customization
- Progressive Disclosure:
  * Basic: API server template with endpoints
  * Advanced: Docker/Kubernetes configs, deployment guides
  * Expert: Monitoring, logging, authentication, rate limiting
- Success Indicators: API deployed successfully, endpoints accessible, integration complete, production-ready
  
Wireframe Goals
- Provide comprehensive API server templates
- Show API endpoint specifications and examples
- Display Docker and Kubernetes configurations
- Preview deployment guides for cloud platforms
- Demonstrate API usage with example requests
- Track template downloads for client success

Explicit UI Requirements (from acceptance criteria)
- **API Template Section**: Expandable section "API Inference Endpoint Template" in deployment package
- **Package Contents**: Display api_server/ folder containing:
  - app.py (FastAPI application)
  - Dockerfile (container image)
  - docker-compose.yml (local testing)
  - deploy_guide.md (deployment instructions)
- **API Endpoints List**: Show:
  - POST /api/v1/chat (send prompt, receive response)
  - GET /api/v1/health (health check)
  - GET /api/v1/model-info (model metadata)
- **API Features List**: Display: Request validation, Response streaming (SSE), Authentication (API key), Logging (request/response tracking)
- **Performance Specs**: Docker image size <5GB, Startup time <60 seconds, Inference latency <2 seconds per response
- **Deployment Platforms**: Cloud deployment guide covers: Local testing (docker-compose up), AWS ECS, GCP Cloud Run, Azure Container Instances, GPU support (A10G/A100/H100)
- **Example Request**: Show curl command with API key, prompt, max_tokens
- **Priority Badge**: "Low (Future Enhancement)" with availability timeline

Interactions and Flows
1. **Discovery Flow**: Deployment package section → See "API Template (Future Enhancement)" badge → Expand to view planned features → Request early access
2. **Template Preview Flow**: (When available) Click "Preview API Template" → Modal shows api_server/ structure → View app.py code → View Dockerfile → Preview deployment guide
3. **Local Testing Flow**: (When available) Download package → Extract api_server/ → Run docker-compose up → API starts on localhost:8000 → Test with curl command
4. **Deployment Flow**: (When available) Follow deploy_guide.md → Choose cloud platform (AWS/GCP/Azure) → Deploy container → Configure GPU support → Test endpoints → Production ready

Visual Feedback
- **Future Enhancement Badge**: Blue info badge: "Coming Soon - API Templates"
- **Template Structure**: File tree showing api_server/ folder hierarchy
- **Code Preview**: Syntax-highlighted FastAPI app.py snippet
- **Docker Icon**: Container icon next to Dockerfile
- **Cloud Platform Logos**: AWS, GCP, Azure logos in deployment guide
- **API Request Example**: Formatted curl command with copy button

Accessibility Guidance
- Future enhancement section: Expandable/collapsible, keyboard accessible (Enter/Space)
- Code previews: Copyable with keyboard (Ctrl+C), syntax highlighting maintains readable contrast
- File tree: Keyboard navigable (arrow keys), screen reader announces structure
- Example request: Copyable, aria-label="Example API request"
- Priority badge: Color + text label (not color-only)

Information Architecture
- **Job Details Page**
  - Model Artifacts Section (FR4.1.x)
  - Metrics Export Section (FR4.2.x)
  - Deployment Package Section (FR4.3.1)
  - **API Template Section** (FR4.3.2 focus)
    - Future Enhancement Notice
    - Planned Features Preview
    - Early Access Request (optional)
    - When Available: Template Download

Page Plan
1. **Page 1: Deployment Section - API Template Notice**
   - Purpose: Show API template as future enhancement
   - Components: "API Inference Endpoint Template" section header, "Future Enhancement" badge (blue), brief description, "Notify Me When Available" button, planned features preview (collapsed)
   - States: Future enhancement, not yet available, early access interest capture

2. **Page 2: API Template Features Preview (Collapsed)**
   - Purpose: Show planned features without full template
   - Components: Expandable "Planned Features" section, bullet list (FastAPI application, Docker configs, Kubernetes yamls, Cloud deployment guides, Authentication, Streaming, Logging), estimated availability: "Q1 2026"
   - States: Features listed, timeline visible, early access option

3. **Page 3: API Template Structure Preview (Future State)**
   - Purpose: Show complete API template structure when available
   - Components: File tree showing api_server/ folder (app.py, Dockerfile, docker-compose.yml, deploy_guide.md), size indicator (~50 MB), "Download API Template" button
   - States: Template available, structure visible, downloadable
   - Notes: Future state wireframe showing what will be available

4. **Page 4: API Endpoints Specification (Future State)**
   - Purpose: Show API endpoint details and specifications
   - Components: Three endpoint cards:
     - POST /api/v1/chat: "Send prompt, receive model response", request body (prompt, max_tokens, temperature), response format (text, streaming option)
     - GET /api/v1/health: "Health check endpoint", response (status: healthy, uptime)
     - GET /api/v1/model-info: "Model metadata", response (training_job_id, version, metrics)
   - States: Endpoints documented, request/response formats visible

5. **Page 5: FastAPI app.py Code Preview (Future State)**
   - Purpose: Show actual API server code snippet
   - Components: Code block with syntax highlighting, FastAPI application structure, endpoint definitions, authentication middleware, logging setup, copy button
   - States: Code visible, copyable, runnable after download
   - Notes: Shows production-ready code quality

6. **Page 6: Docker & Kubernetes Configuration (Future State)**
   - Purpose: Show containerization and orchestration configs
   - Components: Two tabs (Docker / Kubernetes):
     - Docker tab: Dockerfile preview (base image, dependencies, copy adapters, expose port), docker-compose.yml (services, volumes, environment vars)
     - Kubernetes tab: deployment.yaml (replicas, resources, GPU requests), service.yaml (load balancer, ports)
   - States: Configs visible, copyable, deployment-ready

7. **Page 7: Deployment Guide Preview (Future State)**
   - Purpose: Show cloud deployment instructions
   - Components: Deploy guide sections:
     - Local testing: "docker-compose up" (1 command)
     - Cloud platforms: AWS ECS (step-by-step), GCP Cloud Run (commands), Azure Container Instances (portal + CLI)
     - GPU support: Specify requirements (A10G: 16GB, A100: 40GB, H100: 80GB), optimize for performance
   - States: Guide sections visible, platform-specific instructions, copy commands

8. **Page 8: API Usage Example & Testing (Future State)**
   - Purpose: Show example API request and response
   - Components: Example curl request (with API key, prompt, max_tokens), expected response (model output), testing instructions (local: localhost:8000, cloud: production URL), Postman collection link
   - States: Example visible, copyable, testable
   - Notes: Demonstrates immediate usability after deployment

Annotations (Mandatory)
- Label section with: "US4.3.2: Future Enhancement - API Inference Endpoint Template"
- Mark features with: "US4.3.2: Deployment package includes api_server/ folder - app.py (FastAPI), Dockerfile, docker-compose.yml, deploy_guide.md"
- Tag endpoints with: "US4.3.2: API endpoints - POST /api/v1/chat, GET /api/v1/health, GET /api/v1/model-info"
- Note features with: "US4.3.2: Request validation, Response streaming (SSE), Authentication (API key), Logging"
- Mark performance with: "US4.3.2: Docker image <5GB, Startup <60s, Inference latency <2s per response"

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**
1. **"Deployment package includes api_server/ folder: app.py, Dockerfile, docker-compose.yml, deploy_guide.md"**
   - Source: US4.3.2
   - Screens: Page 3 (Future State)
   - Components: File tree display, folder structure, file icons
   - States: Future enhancement, structure preview visible
   - Notes: When implemented, shows in deployment package alongside inference.py

2. **"API endpoints: POST /api/v1/chat, GET /api/v1/health, GET /api/v1/model-info"**
   - Source: US4.3.2
   - Screens: Page 4 (Future State)
   - Components: Endpoint cards, HTTP method badges, request/response specs
   - States: Endpoints documented, specs visible
   - Notes: Standard RESTful API design

3. **"API features: Request validation, Response streaming (SSE), Authentication (API key), Logging"**
   - Source: US4.3.2
   - Screens: Page 2, Page 5
   - Components: Features list, code implementation preview
   - States: Features listed, code shows implementation
   - Notes: Production-ready features included

4. **"Docker image size: <5GB"**
   - Source: US4.3.2
   - Screens: Page 6
   - Components: Docker config preview, image size indicator
   - States: Size estimate visible
   - Notes: Includes base model + adapters + dependencies

5. **"Startup time: <60 seconds (model loading)"**
   - Source: US4.3.2
   - Screens: Page 7
   - Components: Performance specs, startup sequence description
   - States: Timing visible in deployment guide
   - Notes: Most time spent loading Llama 3 70B model into VRAM

6. **"Inference latency: <2 seconds per response"**
   - Source: US4.3.2
   - Screens: Page 8
   - Components: Performance specs, example response time
   - States: Expected latency visible
   - Notes: Actual latency depends on GPU (H100 faster than A10G)

7. **"Deployment guide covers: Local testing (docker-compose up), Cloud deployment (AWS ECS, GCP Cloud Run, Azure Container Instances), GPU support (A10G/A100/H100)"**
   - Source: US4.3.2
   - Screens: Page 7
   - Components: Deploy guide sections, platform-specific instructions, GPU requirements table
   - States: All platforms documented, GPU options visible
   - Notes: Comprehensive multi-cloud deployment support

8. **"Example API request: curl -X POST http://localhost:8000/api/v1/chat -H 'Authorization: Bearer <api_key>' -H 'Content-Type: application/json' -d '{\"prompt\": \"Explain asset allocation\", \"max_tokens\": 500}'"**
   - Source: US4.3.2
   - Screens: Page 8
   - Components: Code block with curl command, copy button, parameter explanations
   - States: Example visible, copyable, testable
   - Notes: Shows actual usage, helps developers integrate quickly

9. **"Priority: Low (Future Enhancement)"**
   - Source: US4.3.2
   - Screens: Page 1, Page 2
   - Components: Priority badge (blue "Future Enhancement"), availability timeline
   - States: Not currently available, roadmap item
   - Notes: Planned for Q1 2026 or later based on customer demand

Non-UI Acceptance Criteria

**Backend/Implementation Criteria:**
1. **"FastAPI application development"**
   - Impact: Build production-ready API server with all endpoints
   - UI Hint: Code preview shows FastAPI framework usage

2. **"Dockerfile creation with GPU support"**
   - Impact: Create container image with CUDA, PyTorch, model loading
   - UI Hint: Dockerfile preview shows GPU base image, dependencies

3. **"Kubernetes deployment configuration"**
   - Impact: Create deployments, services, resource requests for GPU pods
   - UI Hint: K8s yaml previews show GPU resource requests

4. **"Cloud platform deployment guides"**
   - Impact: Document step-by-step for AWS ECS, GCP Cloud Run, Azure ACI
   - UI Hint: Deploy guide shows platform-specific commands and configurations

5. **"Authentication middleware (API key)"**
   - Impact: Implement API key validation for security
   - UI Hint: Example requests show "Authorization: Bearer <api_key>"

6. **"Response streaming (Server-Sent Events)"**
   - Impact: Stream model output token-by-token for better UX
   - UI Hint: API features list mentions SSE support

7. **"Request/response logging"**
   - Impact: Log all API calls for monitoring and debugging
   - UI Hint: API features list mentions logging

Estimated Page Count
- 8 pages total
- Rationale: Current state (2 pages showing future enhancement notice), future state (6 pages showing complete template structure, code, deployment). Comprehensive API template requires extensive documentation covering code, containerization, deployment, and usage examples. As future enhancement, show both "coming soon" state and planned complete feature set.

=== END PROMPT FR: FR4.3.2 ===

---

## Summary

This file contains 6 comprehensive Figma-ready wireframe prompts for Stage 4 (Model Artifacts & Downloads):

1. **FR4.1.1**: Download Trained LoRA Adapters (5 pages) - One-click adapter downloads with progress tracking, expiration management, and README instructions
2. **FR4.1.2**: Adapter Storage and Versioning (6 pages) - Storage management dashboard, version tracking, bulk operations, cost projections
3. **FR4.2.1**: Export Training Metrics as CSV/JSON (6 pages) - Metrics export in multiple formats with optional chart embedding
4. **FR4.2.2**: Generate Training Report PDF (7 pages) - Professional PDF reports with comprehensive sections, preview, and shareable links
5. **FR4.3.1**: Create Complete Deployment Package (7 pages) - Turnkey deployment package with inference scripts, dependencies, README, examples
6. **FR4.3.2**: API Inference Endpoint Template (8 pages) - Future enhancement for API server templates with Docker, Kubernetes, cloud deployment

**Total Pages**: 39 wireframe pages covering all FR4.x.x requirements

Each prompt includes:
- Context summary and journey integration
- Explicit UI requirements from acceptance criteria
- Interactions and flows
- Visual feedback specifications
- Accessibility guidance
- Information architecture
- Page plan with detailed descriptions
- Acceptance criteria → UI component mapping
- Non-UI acceptance criteria
- Estimated page count with rationale

**Ready for Figma Make AI**: Each prompt is self-contained and can be pasted directly into Figma Make AI to generate wireframes without requiring external file access.
