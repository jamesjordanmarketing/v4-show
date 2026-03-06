# LoRA Pipeline - FIGMA Wireframes Output - Stage 8 (Team Collaboration & Notifications)

**Version:** 1.0  
**Date:** 2025-12-18  
**Section ID:** E08  
**Stage Name:** Stage 8 — Team Collaboration & Notifications

This file contains Figma-ready wireframe prompts for all functional requirements in Stage 8.

---

=== BEGIN PROMPT FR: FR8.1.1 ===

Title
- FR FR8.1.1 Wireframes — Stage 8 — Team Collaboration & Notifications — Job Creator Attribution

Context Summary
- This feature enables team coordination and accountability by automatically tagging training jobs with creator information, displaying team activity dashboards, and providing filtering capabilities. Engineers and technical leads need to see who created which jobs, track team productivity, and learn from successful configurations. The system must display creator attribution prominently throughout the UI, support filtering by creator, and provide team activity metrics without requiring manual data entry.

Journey Integration
- Stage 6 user goals: Optimize training configurations through comparison, build team knowledge base, improve collaboration
- Key emotions: Confidence in team coordination, satisfaction with transparency, pride in individual contributions, learning from peers
- Progressive disclosure levels: Basic (my jobs view), Advanced (team dashboard with metrics), Expert (team leaderboards and analytics)
- Persona adaptations: Unified interface serving AI Engineers (primary), Technical Leads (coordination), Business Owners (oversight)

### Journey-Informed Design Elements
- User Goals: Coordinate team work, avoid duplicate efforts, learn from successful configurations, track accountability
- Emotional Requirements: Confidence in transparency, satisfaction with collaboration, pride in contributions, learning opportunities
- Progressive Disclosure:
  * Basic: Filter "my jobs" vs "all team jobs", see creator on job list
  * Advanced: Team activity dashboard showing jobs per member, success rates, costs
  * Expert: Leaderboards ranking team members by productivity, cost efficiency, quality
- Success Indicators: No duplicate work, knowledge sharing enabled, team coordination improved, clear accountability established
  
Wireframe Goals
- Display creator attribution automatically on all training jobs (no manual entry required)
- Provide filtering options to view jobs by creator (my jobs, all team, specific user)
- Show team activity dashboard with productivity metrics (jobs created, success rates, costs per member)
- Enable coordination use cases: "John is already training this dataset, I'll work on another"
- Support learning use cases: "Sarah's jobs have 98% success rate, let me see her configurations"
- Establish accountability: "Who started this expensive job?"

Explicit UI Requirements (from acceptance criteria)
- **Job List Table**: "Created By" column with user name and avatar displayed for every job
- **Filter Controls**: Dropdown or tabs with options: "Show only my jobs" / "Show all team jobs" / "Show [specific user] jobs"
- **Job Details Page - Creator Section**: Prominent display showing:
  - Creator name and email (e.g., "Created by: John Smith (john@brightrun.ai)")
  - Creation timestamp (e.g., "Created on: 2025-12-15 14:23 PST")
  - Job notes/context (e.g., "Notes: Testing aggressive LR for high-emotion dataset")
- **Team Activity Dashboard**: Card or page section displaying:
  - Jobs created per team member (current month) - bar chart or list
  - Average success rate per team member - percentage with visual indicator
  - Average cost per team member - dollar amount
  - Leaderboard cards: "Most productive team member", "Most cost-efficient", "Highest quality"
- **States**:
  - Empty state: "No team activity this month" (if dashboard is empty)
  - Loading state: Skeleton loaders for dashboard metrics while fetching data
  - Filter active state: Clear visual indication which filter is applied ("Showing: My Jobs (23)")
  - Creator info unavailable: Fallback to "System" or "Unknown" if creator data missing

Interactions and Flows
- **Primary Flow - View My Jobs**:
  1. User lands on training jobs list page
  2. Default filter shows "All team jobs"
  3. User clicks filter dropdown → selects "Show only my jobs"
  4. List updates to show only jobs created by current user
  5. "Created By" column shows current user's name with highlighted styling
- **Secondary Flow - View Team Dashboard**:
  1. User clicks "Team Activity" tab or dashboard link
  2. Page displays team metrics dashboard
  3. User sees monthly activity summary (jobs, costs, success rates)
  4. User clicks on team member name
  5. Job list filters to that team member's jobs
- **Tertiary Flow - Learn from High Performers**:
  1. User views leaderboard showing "Sarah: 98% success rate"
  2. User clicks on Sarah's name or "View Jobs" button
  3. List filters to Sarah's jobs
  4. User clicks on a successful job to view configuration details
  5. User uses "Clone Configuration" to replicate Sarah's setup

Visual Feedback
- Creator avatar and name badge on each job row (visual scan-ability)
- Active filter indicator with count (e.g., "My Jobs (23)")
- Team dashboard cards with visual metrics (charts, percentages, dollar amounts)
- Leaderboard rankings with position indicators (1st, 2nd, 3rd badges)
- Success rate indicators: green >95%, yellow 85-95%, red <85%
- Loading skeletons for dashboard metrics during data fetch

Accessibility Guidance
- Creator name text has sufficient color contrast (WCAG AA)
- Filter controls keyboard navigable (Tab, Enter to select)
- Team dashboard cards have clear headings for screen readers
- Leaderboard rankings announced by screen readers (e.g., "Sarah Kim, ranked first, 98% success rate")
- Avatar images have alt text with creator name

Information Architecture
- **Job List Page**:
  - Header: Page title, filter controls, search
  - Table: Job Name | Status | Configuration | Created By | Started At | Duration | Cost | Actions
  - "Created By" column: 4th position (after core job info, before timing/cost)
- **Job Details Page**:
  - Overview section: Job metadata including creator info prominently at top
  - Creator subsection: Name, email, timestamp, notes
- **Team Activity Dashboard**:
  - Header: "Team Activity - December 2025"
  - Summary cards: Total jobs, total cost, average success rate
  - Detail sections: Jobs per member, Success rates, Cost analysis
  - Leaderboard: Top performers in separate cards

Page Plan
1. **Training Jobs List Page (with Creator Attribution)**
   - Purpose: Display all training jobs with creator information
   - Components: Table with "Created By" column, filter dropdown, creator avatars
   - States: Default view (all jobs), filtered by user, empty state
2. **Team Activity Dashboard**
   - Purpose: Show team-wide productivity and performance metrics
   - Components: Summary cards, bar charts (jobs per member), success rate indicators, leaderboard cards
   - States: Current month view, loading state, empty state (no activity)
3. **Job Details Page (Creator Section)**
   - Purpose: Display detailed creator information for a specific job
   - Components: Creator card with name, email, timestamp, notes field
   - States: Normal view, creator info unavailable (fallback)
4. **Team Member Detail View**
   - Purpose: Filter jobs list to specific team member for learning/coordination
   - Components: Filtered job list, team member profile header, performance summary
   - States: Jobs available, no jobs by this member, loading state

Annotations (Mandatory)
- Attach notes on UI elements citing acceptance criteria:
  - "Created By" column → US8.1.1: "Job list displays 'Created By' column with user name and avatar"
  - Filter dropdown → US8.1.1: "Filter jobs by creator: 'Show only my jobs' / 'Show all team jobs' / 'Show [specific user] jobs'"
  - Team activity dashboard → US8.1.1: "Team activity dashboard: Jobs created per team member, average success rate, average cost, leaderboard"
  - Creator info card → US8.1.1: "Job details page prominently displays creator info: Created by, Created on, Notes"
- Include "Mapping Table" frame in Figma showing:
  - Criterion: "All training jobs automatically tagged with creator" → Screen: Jobs List → Component: "Created By" column → State: Always visible
  - Criterion: "Filter jobs by creator" → Screen: Jobs List → Component: Filter dropdown → State: Active filter applied
  - Criterion: "Team activity dashboard" → Screen: Team Dashboard → Components: Summary cards, charts, leaderboard → State: Current month data
  - Criterion: "Job details page creator info" → Screen: Job Details → Component: Creator card → State: Displaying creator data

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **All training jobs automatically tagged with creator (current user)**
   - Source: US8.1.1
   - Screen(s): Training Jobs List, Job Details
   - Component(s): "Created By" table column, Creator info card
   - State(s): Always visible, displays current user's name for their jobs
   - Notes: No manual entry required; system captures creator from authentication context

2. **Job list displays "Created By" column with user name and avatar**
   - Source: US8.1.1
   - Screen(s): Training Jobs List
   - Component(s): Table column (4th position), Avatar image, Name text
   - State(s): Visible for all jobs, highlights current user's name
   - Notes: Avatar provides visual scan-ability; name is clickable to filter by that user

3. **Filter jobs by creator: "Show only my jobs" / "Show all team jobs" / "Show [specific user] jobs"**
   - Source: US8.1.1
   - Screen(s): Training Jobs List
   - Component(s): Filter dropdown/tabs above table
   - State(s): Default (all jobs), my jobs filter active, specific user filter active
   - Notes: Filter updates URL for shareable links; count displays in filter label

4. **Job details page prominently displays creator info: Created by, Created on, Notes**
   - Source: US8.1.1
   - Screen(s): Job Details Page
   - Component(s): Creator info card in overview section
   - State(s): Normal (creator data available), Fallback ("Unknown" if data missing)
   - Notes: Positioned at top of job details for immediate visibility; notes display full text with expand option

5. **Team activity dashboard: Jobs created per team member (current month)**
   - Source: US8.1.1
   - Screen(s): Team Activity Dashboard
   - Component(s): Horizontal bar chart or list, each row = team member
   - State(s): Current month data, loading state, empty state (no activity)
   - Notes: Chart is interactive; clicking member name filters job list

6. **Team activity dashboard: Average success rate per team member**
   - Source: US8.1.1
   - Screen(s): Team Activity Dashboard
   - Component(s): Success rate column in team member list, percentage badges
   - State(s): Visual indicators (green >95%, yellow 85-95%, red <85%)
   - Notes: Calculated from completed + failed jobs; excludes in-progress jobs

7. **Team activity dashboard: Average cost per team member**
   - Source: US8.1.1
   - Screen(s): Team Activity Dashboard
   - Component(s): Cost column in team member list, dollar amounts
   - State(s): Normal display with currency formatting
   - Notes: Calculated from all completed/failed jobs in current month; excludes active jobs

8. **Leaderboard: Most productive team member, most cost-efficient, highest quality**
   - Source: US8.1.1
   - Screen(s): Team Activity Dashboard
   - Component(s): Three leaderboard cards (Productivity, Efficiency, Quality)
   - State(s): Winner highlighted, runner-ups visible, empty state (insufficient data)
   - Notes: Productivity = most jobs completed; Efficiency = lowest avg cost; Quality = highest avg success rate

Non-UI Acceptance Criteria

**Backend/System Criteria:**

1. **All training jobs automatically tagged with creator (current user)**
   - Impact: Database must capture user_id from authentication context on job creation
   - UI Hint: Display creator info automatically; no form field required

2. **Use cases: Coordination, Learning, Accountability**
   - Impact: These are behavioral outcomes enabled by the UI, not explicit UI requirements
   - UI Hint: Ensure filtering and dashboard features support these use cases through clear information display and easy navigation

Estimated Page Count
- **4 pages total**
- Rationale: 
  - Page 1: Training Jobs List with "Created By" column and filter controls (satisfies criteria 2-3)
  - Page 2: Team Activity Dashboard with charts and leaderboards (satisfies criteria 5-8)
  - Page 3: Job Details Page showing creator info prominently (satisfies criterion 4)
  - Page 4: Team Member Detail View showing filtered job list (supports learning use case)
- This count ensures all UI-relevant criteria are visualized with appropriate flows and states

=== END PROMPT FR: FR8.1.1 ===

---

=== BEGIN PROMPT FR: FR8.1.2 ===

Title
- FR FR8.1.2 Wireframes — Stage 8 — Team Collaboration & Notifications — Job Sharing & Collaboration

Context Summary
- This feature enables engineers to share training job details with teammates via shareable links, supporting knowledge sharing and collaboration. Engineers need to share job configurations for review, replicate successful setups, or show clients training progress. The system must generate secure shareable links with visibility controls (public, team, private), support multiple sharing channels (copy link, email, Slack), and display shared job views with full details and clone options.

Journey Integration
- Stage 6 user goals: Build team knowledge base, share successful configurations, enable client transparency
- Key emotions: Pride in sharing achievements, confidence in collaboration, excitement about replication success
- Progressive disclosure levels: Basic (copy link), Advanced (share via email/Slack), Expert (public client-facing links)
- Persona adaptations: AI Engineers (primary sharers), Technical Leads (configuration review), Business Owners (client sharing)

### Journey-Informed Design Elements
- User Goals: Share configurations quickly, enable configuration replication, show client progress, document successful approaches
- Emotional Requirements: Pride in sharing, confidence in security, satisfaction with collaboration, excitement about team learning
- Progressive Disclosure:
  * Basic: Copy link to clipboard, share with team
  * Advanced: Email/Slack integration, visibility controls
  * Expert: Public client-facing links, clone configuration
- Success Indicators: Configurations replicated, team learning accelerated, clients kept informed, knowledge preserved
  
Wireframe Goals
- Provide "Share Job" button on job details page (prominent, discoverable)
- Generate shareable links with unique identifiers (format: https://app.brightrun.ai/training-jobs/{job_id})
- Support visibility controls: Public, Team, Private (default)
- Enable sharing via multiple channels: Copy link, Email, Slack
- Display shared job view with full configuration, progress, results, and creator attribution
- Provide "Clone Configuration" option to replicate shared job setups

Explicit UI Requirements (from acceptance criteria)
- **Share Job Button**: Prominent button on job details page, placed near other actions (e.g., Download, Export)
- **Share Dialog/Modal**: Opens when "Share Job" clicked, contains:
  - Generated shareable link display (read-only text field)
  - Visibility selector: Radio buttons or dropdown for Public / Team / Private
  - Share channel buttons: "Copy Link", "Email", "Slack"
  - Visibility descriptions:
    - Public: "Anyone with link can view, no authentication required"
    - Team: "Only team members can view"
    - Private: "Default, only creator can view"
- **Copy Link Button**: Copies link to clipboard, shows confirmation toast ("Link copied!")
- **Email Share**: Opens email compose with pre-filled subject and body containing link
- **Slack Share**: Opens Slack channel selector, posts link with job summary
- **Shared Job View Page**: Accessible via shared link, displays:
  - Full configuration details (dataset, hyperparameters, GPU selection)
  - Progress indicator (if job active): progress %, current stage, estimated completion
  - Results (if completed): final metrics, loss curves, validation scores
  - Creator attribution: Name, creation date, notes
  - "Clone Configuration" button: Pre-fills job creation form with shared job's settings
- **States**:
  - Link not yet generated: Button shows "Generate Shareable Link"
  - Link generated: Display link with copy button
  - Copy success: Toast notification "Link copied to clipboard"
  - Email share: Opens email client or shows confirmation
  - Slack share: Channel selector modal, then success confirmation
  - Shared view unauthorized: "This job is private. You don't have permission to view it."
  - Shared view loading: Skeleton loaders for job details

Interactions and Flows
- **Primary Flow - Share Job with Team**:
  1. User views job details page for a successful training run
  2. User clicks "Share Job" button
  3. Share dialog opens showing generated link and visibility options
  4. User selects "Team" visibility (default)
  5. User clicks "Copy Link" button
  6. System copies link to clipboard, shows "Link copied!" toast
  7. User pastes link in team chat or email
  8. Teammate clicks link → Opens shared job view
  9. Teammate sees full configuration and results
  10. Teammate clicks "Clone Configuration" → Redirected to job creation form with settings pre-filled
- **Secondary Flow - Email Share**:
  1. User clicks "Share Job" button on successful job
  2. Share dialog opens
  3. User clicks "Email" button
  4. Email compose window opens with:
     - Subject: "Check out my training job: [job_name]"
     - Body: Brief summary + shareable link
  5. User enters recipient email and sends
  6. Recipient clicks link in email → Opens shared job view
- **Tertiary Flow - Public Client Share**:
  1. User (Business Owner or Engineer) wants to show client training progress
  2. User clicks "Share Job" on job details page
  3. Share dialog opens
  4. User selects "Public" visibility
  5. Confirmation prompt: "This will allow anyone with the link to view job details. Continue?"
  6. User confirms
  7. User copies link and sends to client via email
  8. Client (unauthenticated) clicks link → Opens public shared job view
  9. Client sees progress/results without needing account

Visual Feedback
- "Share Job" button with share icon (visual discoverability)
- Share dialog with clear visibility radio buttons and descriptions
- Copy button changes to checkmark briefly after successful copy
- Toast notification "Link copied to clipboard" with 3-second auto-dismiss
- Email/Slack buttons show integration status (connected/not connected)
- Shared job view shows "Shared by [Creator Name]" banner at top
- "Clone Configuration" button visually distinct (e.g., blue, prominent)
- Public shared view shows "Public View" badge (informs viewer of access level)

Accessibility Guidance
- "Share Job" button keyboard accessible (Tab, Enter to activate)
- Share dialog focus trapped (Tab cycles through controls, Esc closes)
- Visibility radio buttons keyboard navigable (arrow keys, Space to select)
- Copy button provides audio feedback ("Link copied") for screen readers
- Shared job view has clear heading hierarchy for screen reader navigation
- "Clone Configuration" button has descriptive aria-label: "Clone configuration from this training job"

Information Architecture
- **Job Details Page**:
  - Header: Job name, status badge, action buttons (Download, Export, Share)
  - "Share Job" button positioned with other actions (top-right or toolbar)
- **Share Dialog**:
  - Section 1: Generated link display (read-only field + copy button)
  - Section 2: Visibility selector (radio buttons with descriptions)
  - Section 3: Share channel buttons (Copy Link, Email, Slack)
  - Footer: Cancel button
- **Shared Job View Page**:
  - Header: "Shared by [Creator]" banner, visibility badge (Public/Team)
  - Configuration section: Dataset, hyperparameters, GPU type
  - Progress section (if active): progress bar, current stage, ETA
  - Results section (if completed): metrics, loss curves, validation
  - Actions: "Clone Configuration" button

Page Plan
1. **Job Details Page (with Share Button)**
   - Purpose: Primary page where user initiates sharing
   - Components: "Share Job" button in actions toolbar
   - States: Normal view, share button hover/active
2. **Share Dialog Modal**
   - Purpose: Configure sharing settings and copy link
   - Components: Link display, visibility selector, share channel buttons
   - States: Link generated, copy success toast, email/Slack integration
3. **Shared Job View Page (Team Access)**
   - Purpose: Display job details to authenticated team members via shared link
   - Components: Full job configuration, progress (if active), results (if completed), creator attribution, "Clone Configuration" button
   - States: Loading, job active, job completed, unauthorized access
4. **Shared Job View Page (Public Access)**
   - Purpose: Display job details to unauthenticated viewers via public link
   - Components: Same as team access but with "Public View" badge, no team-specific actions
   - States: Loading, job active, job completed
5. **Clone Configuration Flow**
   - Purpose: Pre-fill job creation form with shared job's settings
   - Components: Job creation form with all fields populated from shared job
   - States: Form pre-filled, user can edit before submitting

Annotations (Mandatory)
- Attach notes on UI elements citing acceptance criteria:
  - "Share Job" button → US8.1.2: "'Share Job' button on job details page"
  - Link display → US8.1.2: "Generate shareable link: `https://app.brightrun.ai/training-jobs/{job_id}`"
  - Visibility selector → US8.1.2: "Link options: Public / Team / Private (default)"
  - Share buttons → US8.1.2: "Share via: Copy link to clipboard, Email, Slack"
  - Shared view components → US8.1.2: "Shared job view shows: Full configuration, Progress, Results, Creator attribution, Clone option"
- Include "Mapping Table" frame in Figma:
  - Criterion: "'Share Job' button on job details page" → Screen: Job Details → Component: Share button → State: Always visible
  - Criterion: "Generate shareable link" → Screen: Share Dialog → Component: Link display field → State: Link generated
  - Criterion: "Visibility options" → Screen: Share Dialog → Component: Radio buttons → State: Team (default), Public, Private
  - Criterion: "Share via Copy/Email/Slack" → Screen: Share Dialog → Components: Action buttons → State: Interactive, success feedback
  - Criterion: "Shared job view with full details" → Screen: Shared View → Components: Config, Progress, Results, Clone button → State: Based on job status
  - Criterion: "Clone Configuration" → Screen: Shared View → Component: Clone button → State: Enabled (redirects to form)

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **"Share Job" button on job details page**
   - Source: US8.1.2
   - Screen(s): Job Details Page
   - Component(s): Button in actions toolbar
   - State(s): Normal, hover, active (opening dialog)
   - Notes: Positioned with Download/Export buttons for consistency

2. **Generate shareable link: `https://app.brightrun.ai/training-jobs/{job_id}`**
   - Source: US8.1.2
   - Screen(s): Share Dialog
   - Component(s): Read-only text field displaying generated link
   - State(s): Link generated and displayed, copy button adjacent
   - Notes: Link format follows standard URL pattern; {job_id} is unique identifier

3. **Link options: Public (anyone with link) / Team (team members only) / Private (creator only)**
   - Source: US8.1.2
   - Screen(s): Share Dialog
   - Component(s): Radio button group with three options, each with description
   - State(s): Private (default selected), Team, Public (with confirmation)
   - Notes: Descriptions clarify authentication requirements for each visibility level

4. **Share via: Copy link to clipboard**
   - Source: US8.1.2
   - Screen(s): Share Dialog
   - Component(s): "Copy Link" button
   - State(s): Normal, success (checkmark + toast notification)
   - Notes: Instant feedback with toast "Link copied to clipboard"

5. **Share via: Email (send link directly)**
   - Source: US8.1.2
   - Screen(s): Share Dialog
   - Component(s): "Email" button
   - State(s): Normal, opens email compose
   - Notes: Pre-fills subject and body with job summary + link

6. **Share via: Slack (post to channel)**
   - Source: US8.1.2
   - Screen(s): Share Dialog
   - Component(s): "Slack" button
   - State(s): Normal, opens channel selector modal, success confirmation
   - Notes: Requires Slack integration setup; shows connection status

7. **Shared job view shows: Full configuration details**
   - Source: US8.1.2
   - Screen(s): Shared Job View
   - Component(s): Configuration section (dataset, hyperparameters, GPU type)
   - State(s): Read-only display of complete job configuration
   - Notes: Same data structure as job details page but formatted for sharing

8. **Shared job view shows: Progress (if active)**
   - Source: US8.1.2
   - Screen(s): Shared Job View
   - Component(s): Progress bar, current stage, percentage, ETA
   - State(s): Visible only if job status is "active" or "training"
   - Notes: Updates in real-time if viewer refreshes page

9. **Shared job view shows: Results (if completed)**
   - Source: US8.1.2
   - Screen(s): Shared Job View
   - Component(s): Final metrics, loss curves, validation scores
   - State(s): Visible only if job status is "completed"
   - Notes: Read-only display; download actions not available to viewers

10. **Shared job view shows: Creator attribution**
    - Source: US8.1.2
    - Screen(s): Shared Job View
    - Component(s): "Shared by [Name]" banner, creation date, notes
    - State(s): Always visible
    - Notes: Provides context about job origin and purpose

11. **Option to "Clone Configuration" (start new job with same settings)**
    - Source: US8.1.2
    - Screen(s): Shared Job View
    - Component(s): "Clone Configuration" button
    - State(s): Enabled (for authenticated team members), disabled (for public viewers)
    - Notes: Redirects to job creation form with settings pre-filled; user must be authenticated

Non-UI Acceptance Criteria

**Backend/System Criteria:**

1. **Generate shareable link with unique identifier**
   - Impact: Backend must create unique, non-guessable job_id or share_token
   - UI Hint: Display generated link in read-only field; ensure link is permanent (doesn't expire)

2. **Visibility controls enforce access rules**
   - Impact: Backend must validate viewer permissions based on visibility setting (public, team, private)
   - UI Hint: Show unauthorized message if viewer doesn't have access; redirect to login for team-only links

3. **Use cases: Configuration review, replication, client transparency**
   - Impact: These are behavioral outcomes; ensure UI supports these workflows
   - UI Hint: "Clone Configuration" enables replication; full details support review; public links enable client transparency

Estimated Page Count
- **5 pages total**
- Rationale:
  - Page 1: Job Details with "Share Job" button (initiates sharing)
  - Page 2: Share Dialog modal (configure visibility and copy link)
  - Page 3: Shared Job View - Team Access (authenticated viewers)
  - Page 4: Shared Job View - Public Access (unauthenticated viewers)
  - Page 5: Clone Configuration Flow (job creation form pre-filled from shared job)
- This count covers all sharing flows, visibility states, and the clone action

=== END PROMPT FR: FR8.1.2 ===

---

=== BEGIN PROMPT FR: FR8.2.1 ===

Title
- FR FR8.2.1 Wireframes — Stage 8 — Team Collaboration & Notifications — Training Completion Notifications

Context Summary
- This feature delivers email and Slack notifications when training jobs complete or fail, enabling engineers to avoid constantly checking dashboards and achieve true "weekend freedom." Engineers need timely notifications with actionable information (success metrics, error details, cost) across multiple channels. The system must send notifications for key events (completion, failure, cancellation, interruptions), support per-user notification preferences, and include action links (view details, download adapters, retry).

Journey Integration
- Stage 6 user goals: Optimize workflow efficiency, eliminate manual monitoring, enable unattended training
- Key emotions: Relief from anxiety (no constant checking), confidence in awareness, satisfaction with automation, excitement about weekend freedom
- Progressive disclosure levels: Basic (email notifications), Advanced (Slack integration + preferences), Expert (digest mode + event filtering)
- Persona adaptations: AI Engineers (primary recipients), Technical Leads (oversight notifications), Business Owners (completion summaries)

### Journey-Informed Design Elements
- User Goals: Receive timely job updates, eliminate dashboard checking, respond to failures quickly, download results immediately
- Emotional Requirements: Relief from monitoring anxiety, confidence in notifications, satisfaction with automation, excitement about freedom
- Progressive Disclosure:
  * Basic: Email notifications on completion/failure
  * Advanced: Slack integration, notification preferences UI
  * Expert: Digest mode (daily summaries), event filtering (completions only, failures only, all events)
- Success Indicators: Zero missed notifications, engineers can disconnect, failures addressed within 1 hour, weekend freedom achieved
  
Wireframe Goals
- Send email notifications on training completion (success) with key metrics and action links
- Send email notifications on training failure with error details and suggested fixes
- Support Slack notifications (optional) posted to channels or DMs
- Provide notification preferences UI for per-user configuration (email on/off, Slack on/off, event filtering)
- Include actionable information: job name, duration, cost, metrics/errors, action buttons
- Enable "weekend freedom" use case: start job Friday, receive notification Saturday/Sunday when complete

Explicit UI Requirements (from acceptance criteria)
- **Email Notification (Training Completed)**: HTML email template containing:
  - Subject: "✓ Training Job Completed: {job_name}"
  - Body:
    - Job name and configuration summary (preset, GPU type)
    - Duration: 13.2 hours
    - Final cost: $48.32
    - Final metrics: Training loss 0.287, Perplexity improvement 31%
    - Quality badge: "✓ Production Ready"
    - Action buttons: [View Job Details] [Download Adapters] [Generate Report]
- **Email Notification (Training Failed)**: HTML email template containing:
  - Subject: "✗ Training Job Failed: {job_name}"
  - Body:
    - Job name, error type, error message
    - Suggested fixes (if applicable, e.g., "reduce batch_size to 2")
    - Elapsed time before failure: 2.3 hours
    - Cost spent: $8.42
    - Action buttons: [View Error Details] [Retry with Suggested Fix] [Contact Support]
- **Slack Notification (Training Completed)**: Message format:
  - "✓ Training completed: **{job_name}** (13.2hrs, $48.32, 31% perplexity improvement) [View Job]"
  - Posted to designated channel or sent as DM
  - Includes clickable link to job details page
- **Notification Preferences Page**: UI section or dedicated page with:
  - Email toggle: On/Off, Digest mode option (daily summary)
  - Slack toggle: On/Off, Channel selection dropdown
  - Event filtering: Checkboxes for "Completions only" / "Failures only" / "All events"
  - Save button to apply preferences
- **Notification Triggers** (visible in preferences UI):
  - Training completed successfully
  - Training failed (with error details)
  - Training cancelled (by user or system)
  - Spot instance interrupted (if manual intervention needed)
- **States**:
  - Notification sent: Confirmation message in preferences UI ("Notifications enabled")
  - Email delivery failure: Retry mechanism, admin alert
  - Slack not connected: Prompt to connect Slack integration
  - Digest mode active: Daily summary email instead of per-event emails
  - No events: "No notifications sent this week" status message

Interactions and Flows
- **Primary Flow - Training Completion Notification (Email)**:
  1. Training job reaches "completed" status
  2. System triggers notification service
  3. Notification service fetches final metrics (loss, cost, perplexity)
  4. System generates HTML email with job summary and action buttons
  5. Email sent to job creator's email address
  6. User receives email on phone/laptop
  7. User clicks "View Job Details" button
  8. Browser opens job details page (authenticated link)
  9. User reviews results and clicks "Download Adapters"
- **Secondary Flow - Training Failure Notification (Email + Slack)**:
  1. Training job fails with "OutOfMemoryError"
  2. System triggers notification service with error details
  3. Notification service generates error summary + suggested fix
  4. Email sent to creator's email address
  5. Slack message posted to configured channel (if enabled)
  6. User sees Slack notification on phone
  7. User clicks "Retry with Suggested Fix" link
  8. Browser opens retry modal with batch_size=2 pre-filled
  9. User confirms and restarts job
- **Tertiary Flow - Configure Notification Preferences**:
  1. User navigates to Settings → Notifications (or Profile → Notifications)
  2. Notification preferences page displays current settings
  3. User toggles Email: On, Slack: On
  4. User selects Slack channel from dropdown ("# training-updates")
  5. User checks event filters: "Completions only" (unchecks failures)
  6. User clicks "Save Preferences"
  7. System validates Slack connection (if selected)
  8. Confirmation message: "Notification preferences saved"
  9. Future completions trigger email + Slack, failures don't trigger notifications

Visual Feedback
- Email notifications use clear visual indicators: ✓ (success), ✗ (failure)
- Action buttons in emails styled as prominent CTAs (blue for View, green for Download, red for Retry)
- Slack messages include emoji for quick scan: ✓ ✗ ⚠️
- Notification preferences page shows connection status: "Slack: Connected ✓" or "Slack: Not connected [Connect]"
- Digest mode indicator: "Daily summary enabled (next summary at 8 AM)"
- Event filtering shows checkboxes with labels and descriptions

Accessibility Guidance
- Email HTML templates use semantic structure (headings, paragraphs, tables)
- Action buttons in emails have descriptive text (not just icons)
- Email templates tested in major email clients (Gmail, Outlook, Apple Mail)
- Notification preferences toggles keyboard accessible (Tab, Space to toggle)
- Slack channel dropdown keyboard navigable (arrow keys, Enter to select)
- Email templates have plain-text fallback for screen readers/text-only clients

Information Architecture
- **Email Notification (Success)**:
  - Header: Job name with success icon ✓
  - Summary section: Duration, Cost, Key metrics
  - Quality section: Perplexity improvement, Quality badge
  - Action buttons: View Details, Download Adapters, Generate Report
  - Footer: Unsubscribe link, Bright Run branding
- **Email Notification (Failure)**:
  - Header: Job name with failure icon ✗
  - Error section: Error type, Error message
  - Suggested fixes: Bulleted list of recommendations
  - Cost section: Elapsed time, Cost spent (not full estimate)
  - Action buttons: View Error, Retry, Contact Support
  - Footer: Unsubscribe link, Bright Run branding
- **Notification Preferences Page**:
  - Section 1: Email preferences (On/Off, Digest mode)
  - Section 2: Slack preferences (On/Off, Channel selection)
  - Section 3: Event filtering (checkboxes for event types)
  - Section 4: Preview (example notification based on current settings)
  - Footer: Save button, Cancel button

Page Plan
1. **Email Notification Template (Training Completed)**
   - Purpose: Notify user of successful training completion with metrics and actions
   - Components: HTML email with header, summary section, action buttons, footer
   - States: Success notification with metrics, quality badge
2. **Email Notification Template (Training Failed)**
   - Purpose: Notify user of training failure with error details and suggested fixes
   - Components: HTML email with error summary, suggested fixes, action buttons
   - States: Failure notification with specific error type and fixes
3. **Slack Notification Message (Completion)**
   - Purpose: Post training completion summary to Slack channel or DM
   - Components: Message with emoji, job name, duration, cost, perplexity, link
   - States: Success message with clickable link
4. **Notification Preferences Page**
   - Purpose: Configure per-user notification settings (channels, event filtering)
   - Components: Email toggle, Slack toggle + channel selector, event filter checkboxes, save button
   - States: Default preferences, Slack connected/not connected, preferences saved confirmation
5. **Notification History Page (Optional)**
   - Purpose: View log of sent notifications for debugging/audit
   - Components: Table of sent notifications (timestamp, type, recipient, status)
   - States: Recent notifications, filtered by type, empty state

Annotations (Mandatory)
- Attach notes on UI elements citing acceptance criteria:
  - Email success template → US8.2.1: "Email Notification (training completed): Subject, Body with duration, cost, metrics, actions"
  - Email failure template → US8.2.1: "Email Notification (training failed): Subject, Body with error details, suggested fixes, actions"
  - Slack message → US8.2.1: "Slack Notification (training completed): Message format with job name, metrics, link"
  - Notification preferences → US8.2.1: "Notification Preferences: Email On/Off, Slack On/Off, Event filtering"
- Include "Mapping Table" frame in Figma:
  - Criterion: "Email notification on completion" → Screen: Email Template (Success) → Components: Header, metrics, actions → State: Training completed
  - Criterion: "Email notification on failure" → Screen: Email Template (Failure) → Components: Error details, fixes, actions → State: Training failed
  - Criterion: "Slack notification" → Screen: Slack Message → Components: Message text, link → State: Posted to channel/DM
  - Criterion: "Notification preferences" → Screen: Preferences Page → Components: Toggles, channel selector, filters → State: User configurable
  - Criterion: "Event filtering" → Screen: Preferences Page → Component: Checkboxes → State: Completions/Failures/All events

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **Notification Triggers: Training completed successfully**
   - Source: US8.2.1
   - Screen(s): Email Template (Success), Slack Message
   - Component(s): Email HTML, Slack message text
   - State(s): Sent when job status changes to "completed"
   - Notes: Triggered automatically by backend; no user action required

2. **Notification Triggers: Training failed (with error details)**
   - Source: US8.2.1
   - Screen(s): Email Template (Failure)
   - Component(s): Email HTML with error section
   - State(s): Sent when job status changes to "failed"
   - Notes: Includes specific error type and suggested fixes

3. **Notification Triggers: Training cancelled (by user or system)**
   - Source: US8.2.1
   - Screen(s): Email Template (Cancellation) - similar to failure template
   - Component(s): Email HTML with cancellation reason
   - State(s): Sent when job status changes to "cancelled"
   - Notes: Includes who cancelled (user or system) and partial progress/cost

4. **Notification Triggers: Spot instance interrupted (if manual intervention needed)**
   - Source: US8.2.1
   - Screen(s): Email Template (Interruption) - informational
   - Component(s): Email HTML with interruption details
   - State(s): Sent if auto-recovery fails or manual intervention required
   - Notes: Less urgent than failure; includes recovery status

5. **Email Notification (training completed): Subject "✓ Training Job Completed: {job_name}"**
   - Source: US8.2.1
   - Screen(s): Email Template (Success)
   - Component(s): Email subject line
   - State(s): Standard success subject format
   - Notes: Emoji ✓ provides instant visual indication in inbox

6. **Email Body: Job name, configuration summary, Duration, Final cost, Final metrics, Quality badge, Action buttons**
   - Source: US8.2.1
   - Screen(s): Email Template (Success)
   - Component(s): Multiple sections in email HTML
   - State(s): All sections populated with actual job data
   - Notes: Action buttons link to authenticated job details page

7. **Slack Notification (training completed): Message with job name, duration, cost, perplexity, link**
   - Source: US8.2.1
   - Screen(s): Slack Message
   - Component(s): Slack message text (markdown formatted)
   - State(s): Posted to designated channel or DM
   - Notes: Link opens job details page (requires authentication if team-only)

8. **Email Notification (training failed): Subject "✗ Training Job Failed: {job_name}"**
   - Source: US8.2.1
   - Screen(s): Email Template (Failure)
   - Component(s): Email subject line
   - State(s): Standard failure subject format
   - Notes: Emoji ✗ indicates failure at a glance

9. **Email Body (failure): Error type, error message, suggested fixes, elapsed time, cost spent, action buttons**
   - Source: US8.2.1
   - Screen(s): Email Template (Failure)
   - Component(s): Multiple sections in email HTML
   - State(s): Error-specific content (e.g., OOM vs timeout)
   - Notes: Suggested fixes provide actionable next steps

10. **Notification Preferences: Email On/Off, Digest mode (daily summary)**
    - Source: US8.2.1
    - Screen(s): Notification Preferences Page
    - Component(s): Email toggle switch, Digest mode checkbox
    - State(s): Enabled/disabled, digest mode active
    - Notes: Digest mode sends single daily email with all events

11. **Notification Preferences: Slack On/Off, Channel selection**
    - Source: US8.2.1
    - Screen(s): Notification Preferences Page
    - Component(s): Slack toggle switch, channel dropdown
    - State(s): Connected/not connected, channel selected
    - Notes: Requires Slack app integration; shows connection status

12. **Notification Preferences: Event filtering (Completions only / Failures only / All events)**
    - Source: US8.2.1
    - Screen(s): Notification Preferences Page
    - Component(s): Radio buttons or checkboxes for event types
    - State(s): One or more event types selected
    - Notes: Allows users to reduce notification noise based on preferences

13. **Weekend Freedom: Engineers can start jobs Friday, receive notification Saturday/Sunday when complete**
    - Source: US8.2.1
    - Screen(s): N/A (this is a behavioral outcome)
    - Component(s): Reliable notification delivery system
    - State(s): Notifications sent regardless of day/time
    - Notes: No UI element; ensures engineers don't need to check dashboard on weekends

Non-UI Acceptance Criteria

**Backend/System Criteria:**

1. **Notification delivery system (email and Slack)**
   - Impact: Backend must reliably send notifications via email service (e.g., SendGrid) and Slack API
   - UI Hint: Email templates must be responsive HTML; Slack messages use markdown formatting

2. **Per-user notification preferences storage**
   - Impact: Database must store preferences per user (email_enabled, slack_enabled, slack_channel, event_filters)
   - UI Hint: Preferences page reads/writes these settings; defaults to email=on, slack=off

3. **Notification retry mechanism**
   - Impact: If email delivery fails, retry up to 3 times with exponential backoff
   - UI Hint: No direct UI for this; admin can view delivery status in logs

4. **Weekend Freedom (behavioral outcome)**
   - Impact: System must reliably trigger notifications 24/7, including weekends
   - UI Hint: Notifications enable engineers to disconnect; no weekend-specific UI needed

Estimated Page Count
- **5 pages total**
- Rationale:
  - Page 1: Email Notification Template - Training Completed (HTML email design)
  - Page 2: Email Notification Template - Training Failed (HTML email with error details)
  - Page 3: Slack Notification Message (message format and design)
  - Page 4: Notification Preferences Page (configure channels, event filtering)
  - Page 5: Notification History Page (optional, for debugging/audit)
- This count covers all notification templates, configuration UI, and audit capability

=== END PROMPT FR: FR8.2.1 ===

---

=== BEGIN PROMPT FR: FR8.2.2 ===

Title
- FR FR8.2.2 Wireframes — Stage 8 — Team Collaboration & Notifications — Job Notes and Experiment Documentation

Context Summary
- This feature enables engineers to document training experiments by adding detailed notes to jobs, capturing hypotheses, expected outcomes, learnings, and context. Engineers need to preserve knowledge for future reference, document experimental rationale, and make past jobs searchable by notes content. The system must provide a notes field during job creation, allow editing notes after creation with timestamps, display notes prominently on job details, and include notes in search and exports.

Journey Integration
- Stage 6 user goals: Build team knowledge base, document successful approaches, learn from experiments
- Key emotions: Satisfaction with documentation, confidence in knowledge preservation, pride in thoroughness, clarity about past decisions
- Progressive disclosure levels: Basic (add notes on creation), Advanced (edit notes with updates), Expert (search by notes, export in reports)
- Persona adaptations: AI Engineers (primary documenters), Technical Leads (review notes for insights), Quality Analysts (reference notes in reports)

### Journey-Informed Design Elements
- User Goals: Document experiment reasoning, preserve context, enable future reference, support team learning
- Emotional Requirements: Satisfaction with thoroughness, confidence in documentation, clarity about decisions, pride in knowledge sharing
- Progressive Disclosure:
  * Basic: Add notes during job creation, view notes on job details
  * Advanced: Edit notes after creation, add updates with timestamps
  * Expert: Search jobs by notes content, include notes in exported reports
- Success Indicators: Experiments documented, context preserved, team can find relevant past jobs, knowledge shared effectively
  
Wireframe Goals
- Provide notes field on job creation form (optional, 2000 character limit)
- Allow editing notes after job creation (add observations during/after training)
- Display notes prominently on job details page with creation/update timestamps
- Enable searching jobs by notes content on job list page
- Include notes in exported reports (CSV, PDF) for documentation
- Support use cases: experiment tracking, learning documentation, client context

Explicit UI Requirements (from acceptance criteria)
- **Notes Field (Job Creation Form)**: Optional multiline text area with:
  - Character limit: 2000 characters (display counter)
  - Placeholder text: "Document your experiment: hypothesis, expected outcomes, variables being tested"
  - Markdown support indicator: "Markdown supported for formatting"
  - Validation: No required field, shows character count (e.g., "432 / 2000")
- **Edit Notes (Job Details Page)**: "Edit Notes" button that:
  - Opens notes editor modal or inline editor
  - Allows adding observations during training or after completion
  - Example prompt: "Add update: Loss plateaued at epoch 2.5, suggests optimal stopping point"
  - Saves with timestamp for each update
- **Notes Display (Job Details Page)**: Prominent section showing:
  - Creation notes with timestamp: "Initial notes (2025-12-15 14:23): Testing aggressive LR..."
  - Update notes with timestamps: "Update (2025-12-16 08:45): Completed successfully, 31% perplexity improvement..."
  - Markdown rendered for formatting (headings, lists, code blocks)
  - Expand/collapse for long notes
- **Search by Notes (Job List Page)**: Search box that:
  - Includes notes in search query (in addition to job name, tags)
  - Shows matching jobs with notes preview
  - Highlights matched terms: "aggressive learning rate" in results
  - Example searches: "aggressive learning rate", "high emotion dataset", "client delivery"
- **Notes in Reports**: Export options that:
  - Include notes in CSV exports (dedicated column)
  - Include notes in PDF reports (formatted section)
  - Preserve markdown formatting in PDF exports
- **States**:
  - Notes empty: Placeholder text visible, character counter shows "0 / 2000"
  - Notes present: Display full text with formatting, show character count
  - Notes being edited: Inline editor or modal with save/cancel buttons
  - Notes saved: Confirmation toast "Notes saved" with timestamp
  - Notes in search results: Preview snippet with matched terms highlighted
  - Notes in exports: Full text included with formatting

Interactions and Flows
- **Primary Flow - Document Experiment at Creation**:
  1. User configures new training job (dataset, preset, GPU)
  2. User reaches notes field on configuration form
  3. User types hypothesis: "Testing whether r=32 improves quality on emotional datasets. Expecting 35%+ perplexity improvement vs baseline r=16."
  4. Character counter updates: "128 / 2000"
  5. User continues with job creation
  6. Notes automatically saved with job
  7. Job details page displays initial notes with creation timestamp
- **Secondary Flow - Add Observation After Completion**:
  1. Training job completes successfully
  2. User views job details page
  3. User clicks "Edit Notes" button
  4. Notes editor opens showing existing creation notes
  5. User adds update: "\n\n**Update:** Completed with 38% perplexity improvement (exceeded expectations). Balanced preset was optimal for this dataset size. Recommend for future similar projects."
  6. User clicks "Save"
  7. System appends update with timestamp
  8. Notes section now shows both creation notes and update with separate timestamps
- **Tertiary Flow - Search Jobs by Notes Content**:
  1. User wants to find past jobs about "retirement planning"
  2. User navigates to training jobs list page
  3. User types "retirement planning" in search box
  4. System searches job names, tags, and notes content
  5. Results display jobs with matched terms in notes
  6. Preview snippet shows: "...Training for Acme Financial Q1 project, focus on **retirement planning** scenarios..."
  7. User clicks job to view full notes and configuration
  8. User uses "Clone Configuration" to replicate successful setup
- **Quaternary Flow - Export Notes in Report**:
  1. User views completed job details
  2. User clicks "Generate Report" → "PDF"
  3. System generates PDF including notes section
  4. PDF displays notes with markdown formatting preserved
  5. User downloads PDF for client delivery or internal documentation
  6. Notes provide context about experimental approach and outcomes

Visual Feedback
- Character counter updates as user types, turns yellow at 90% (1800/2000), red at 100%
- "Edit Notes" button with edit icon (pencil)
- Notes section on job details has clear heading "Experiment Notes" or "Job Documentation"
- Timestamps displayed in subdued color next to each notes section
- Search results show matched terms highlighted in bold or background color
- Save confirmation toast: "Notes saved" with checkmark icon
- Markdown formatting rendered: headings, bold, italic, lists, code blocks

Accessibility Guidance
- Notes textarea has aria-label "Job notes" or "Experiment documentation"
- Character counter aria-live region announces count at milestones (50%, 75%, 90%, 100%)
- "Edit Notes" button keyboard accessible (Tab, Enter to activate)
- Notes editor modal focus trapped, Esc to cancel
- Markdown formatting explained in tooltip or help text
- Search box includes notes in aria-describedby: "Search by job name, tags, or notes"

Information Architecture
- **Job Creation Form**:
  - Section: Configuration (dataset, preset, GPU)
  - Section: Metadata (job name, tags, notes)
  - Notes field: Below job name/tags, above final review
- **Job Details Page**:
  - Section: Overview (status, progress, creator)
  - Section: Configuration (hyperparameters, GPU)
  - Section: Experiment Notes (creation notes, updates with timestamps)
  - Section: Results (metrics, loss curves)
  - "Edit Notes" button: In notes section header or actions toolbar
- **Job List Page**:
  - Search box: Top of page, above filters
  - Search results: Job cards or table rows with notes preview
  - Preview snippet: Truncated notes text (100 chars) with "..." if longer

Page Plan
1. **Job Creation Form (with Notes Field)**
   - Purpose: Capture initial experiment documentation at job creation
   - Components: Notes textarea (2000 char limit), character counter, placeholder text, markdown hint
   - States: Empty (placeholder), typing (counter updates), character limit reached (warning)
2. **Job Details Page (Notes Display)**
   - Purpose: Display notes prominently with creation/update timestamps
   - Components: Notes section heading, creation notes with timestamp, update notes with timestamps, "Edit Notes" button
   - States: Notes present (expanded/collapsed), no notes (empty state message), markdown rendered
3. **Notes Editor Modal/Inline**
   - Purpose: Allow editing notes after job creation with timestamp tracking
   - Components: Textarea with existing notes, character counter, save/cancel buttons
   - States: Editing, saving (disabled buttons), saved confirmation
4. **Job List Page (Search by Notes)**
   - Purpose: Find jobs by searching notes content
   - Components: Search box, results with notes preview, matched terms highlighted
   - States: No search (all jobs), search active (filtered results), no matches (empty state)
5. **PDF Report (Notes Included)**
   - Purpose: Export job documentation including notes for reference
   - Components: PDF section with notes text, markdown formatting preserved
   - States: Notes included in report, formatted for readability

Annotations (Mandatory)
- Attach notes on UI elements citing acceptance criteria:
  - Notes field (creation form) → US8.3.1: "Notes Field on job creation form: Optional, 2000 character limit, placeholder, markdown support"
  - Edit Notes button → US8.3.1: "Edit Notes after job creation: 'Edit Notes' button on job details page"
  - Notes display → US8.3.1: "Notes Display: Shows creation notes + updates with timestamps"
  - Search box → US8.3.1: "Search by Notes: Job list page search box includes notes in query"
  - Export reports → US8.3.1: "Notes in Reports: Include notes in exported CSV/PDF reports"
- Include "Mapping Table" frame in Figma:
  - Criterion: "Notes field on job creation form" → Screen: Job Creation Form → Component: Textarea → State: Optional, 2000 char limit
  - Criterion: "Edit notes after creation" → Screen: Job Details → Component: Edit Notes button → State: Opens editor
  - Criterion: "Display notes with timestamps" → Screen: Job Details → Component: Notes section → State: Creation + update notes visible
  - Criterion: "Search by notes" → Screen: Job List → Component: Search box → State: Searches notes content
  - Criterion: "Notes in reports" → Screen: PDF Export → Component: Notes section → State: Included in report

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **Notes Field on job creation form: Optional, multiline text area (2000 character limit)**
   - Source: US8.3.1
   - Screen(s): Job Creation Form
   - Component(s): Textarea field in metadata section
   - State(s): Empty (placeholder), typing (counter updates), limit reached (warning)
   - Notes: Not required; character counter provides visual feedback

2. **Placeholder: "Document your experiment: hypothesis, expected outcomes, variables being tested"**
   - Source: US8.3.1
   - Screen(s): Job Creation Form
   - Component(s): Placeholder text in notes textarea
   - State(s): Visible when field is empty
   - Notes: Guides user on what to document; disappears when typing starts

3. **Markdown support for formatting**
   - Source: US8.3.1
   - Screen(s): Job Creation Form, Notes Editor, Job Details
   - Component(s): Notes textarea (input), Notes display (rendered output)
   - State(s): Input accepts markdown syntax, display renders markdown
   - Notes: Support for headings, bold, italic, lists, code blocks; show markdown hint near field

4. **"Edit Notes" button on job details page**
   - Source: US8.3.1
   - Screen(s): Job Details Page
   - Component(s): Button in notes section header or actions toolbar
   - State(s): Normal, opens editor modal or inline editor
   - Notes: Available at any time (during training or after completion)

5. **Add observations during training or after completion**
   - Source: US8.3.1
   - Screen(s): Notes Editor Modal
   - Component(s): Textarea with existing notes, allows appending
   - State(s): Editing mode, save/cancel actions
   - Notes: Example provided: "Update: Loss plateaued at epoch 2.5, suggests optimal stopping point"

6. **Notes Display: Shows creation notes + any updates with timestamps**
   - Source: US8.3.1
   - Screen(s): Job Details Page
   - Component(s): Notes section with multiple timestamp-labeled blocks
   - State(s): Creation notes visible, update notes appended with timestamps
   - Notes: Example format: "Initial notes (2025-12-15 14:23): ...", "Update (2025-12-16 08:45): ..."

7. **Search by Notes: Job list page search box includes notes in query**
   - Source: US8.3.1
   - Screen(s): Job List Page
   - Component(s): Search box, search results
   - State(s): Search active, matched terms highlighted in results
   - Notes: Searches across job name, tags, and notes content simultaneously

8. **Find jobs by searching notes: "aggressive learning rate", "high emotion dataset", "client delivery"**
   - Source: US8.3.1
   - Screen(s): Job List Page
   - Component(s): Search results with notes preview
   - State(s): Filtered results showing matched jobs
   - Notes: Preview snippet shows context around matched terms (e.g., "...testing **aggressive learning rate** for high-emotion dataset...")

9. **Notes in Reports: Include notes in exported CSV/PDF reports**
   - Source: US8.3.1
   - Screen(s): Export outputs (CSV file, PDF report)
   - Component(s): Notes column (CSV), Notes section (PDF)
   - State(s): Notes text included in exports with formatting preserved
   - Notes: Useful for documenting successful configurations in external systems

10. **Use cases: Experiment tracking, Learning documentation, Client context**
    - Source: US8.3.1
    - Screen(s): All notes-related screens
    - Component(s): Notes field, display, search
    - State(s): Various use cases supported
    - Notes: These are behavioral outcomes; UI should support these workflows naturally

Non-UI Acceptance Criteria

**Backend/System Criteria:**

1. **Notes automatically saved with job creation**
   - Impact: Database stores notes in job record; no separate save action required
   - UI Hint: Notes field is part of job creation form submission

2. **Edit notes appends updates with timestamps**
   - Impact: Backend tracks notes history (creation, updates) with timestamps for each change
   - UI Hint: Display multiple notes blocks with corresponding timestamps

3. **Search includes notes content**
   - Impact: Backend search query must include full-text search on notes field
   - UI Hint: Search results highlight matched terms in notes preview

4. **Notes included in exports (CSV, PDF)**
   - Impact: Export generation includes notes field in output format
   - UI Hint: Notes appear as dedicated column (CSV) or section (PDF)

Estimated Page Count
- **5 pages total**
- Rationale:
  - Page 1: Job Creation Form with Notes Field (capture initial documentation)
  - Page 2: Job Details Page with Notes Display (show creation notes + updates)
  - Page 3: Notes Editor Modal (edit notes after creation)
  - Page 4: Job List Page with Search by Notes (find jobs by notes content)
  - Page 5: PDF Report with Notes Section (export documentation)
- This count covers all notes-related UI touchpoints from creation to export

=== END PROMPT FR: FR8.2.2 ===

---

=== BEGIN PROMPT FR: FR8.3.1 ===

Title
- FR FR8.3.1 Wireframes — Stage 8 — Team Collaboration & Notifications — Team Knowledge Base Integration (Future)

Context Summary
- This future-enhancement feature transforms successful training jobs into reusable knowledge base entries, enabling systematic team learning and onboarding. Technical leads need to capture best practices, proven configurations, and troubleshooting insights from past jobs. The system must provide an "Add to Knowledge Base" button on successful jobs, allow categorization and tagging, make entries searchable, and auto-suggest relevant articles when creating new jobs.

Journey Integration
- Stage 6 user goals: Build team knowledge base, amplify organizational learning, accelerate onboarding
- Key emotions: Pride in knowledge sharing, confidence in best practices, excitement about team growth, satisfaction with systematization
- Progressive disclosure levels: Basic (add job to knowledge base), Advanced (search and browse entries), Expert (auto-suggestions on job creation)
- Persona adaptations: Technical Leads (curate knowledge base), AI Engineers (contribute and consume), New Engineers (onboarding with knowledge base)

### Journey-Informed Design Elements
- User Goals: Preserve successful approaches, enable rapid onboarding, systematize learning, avoid repeating mistakes
- Emotional Requirements: Pride in contribution, confidence in knowledge, excitement about team capability, satisfaction with organization
- Progressive Disclosure:
  * Basic: Add successful job to knowledge base with title and category
  * Advanced: Search knowledge base for relevant entries, link related jobs
  * Expert: Auto-suggest knowledge base articles when configuring new jobs
- Success Indicators: Best practices preserved, new engineers find relevant examples quickly, successful configurations replicated, team capability scales
  
Wireframe Goals
- Provide "Add to Knowledge Base" button on successful job details pages
- Create knowledge base entry form with title, category, tags, content fields
- Display knowledge base as searchable library (grid or list view)
- Enable search: "How to train models on emotional datasets"
- Support auto-suggest: When creating job, suggest related knowledge base articles
- Link related successful jobs from knowledge base entries

Explicit UI Requirements (from acceptance criteria)
- **"Add to Knowledge Base" Button**: Visible on job details pages for successful jobs (status = "completed", success rate or quality metrics meet threshold)
- **Knowledge Base Entry Form**: Modal or page with fields:
  - Title: Auto-filled with job name, editable (e.g., "High-Quality Emotional Dataset Training - Balanced Preset")
  - Category: Dropdown with options: "Best practices", "Experiments", "Client deliveries", "Troubleshooting"
  - Tags: Multi-select or token input: "Aggressive LR", "High emotion", "Financial domain", etc.
  - Content: Auto-populated with:
    - Configuration summary (preset, hyperparameters, GPU type)
    - Results (final metrics, perplexity improvement, cost)
    - Key learnings (from job notes if available)
    - Job notes (if present)
  - Related jobs: Link to similar successful jobs (optionally auto-detected)
  - Save button creates knowledge base entry
- **Knowledge Base Library Page**: Browsable repository showing:
  - Grid or list view of entries
  - Each entry card/row displays: Title, Category badge, Tags, Preview snippet, Author, Date added
  - Filter controls: Category (all, best practices, experiments, etc.), Tags (multi-select), Author
  - Sort options: Date added (newest first), Most viewed, Highest rated
  - Search box: Full-text search across title, tags, content
- **Knowledge Base Entry Detail Page**: Full view of entry showing:
  - Title, category, tags
  - Configuration summary (hyperparameters, GPU, cost)
  - Results (metrics, charts if available)
  - Key learnings section
  - Related jobs: Clickable links to referenced training jobs
  - "Use This Configuration" button: Pre-fills job creation form with entry's settings
  - Comments section (optional): Team members can add observations
- **Knowledge Base Search Results**: Display matching entries with:
  - Matched terms highlighted in title/content
  - Relevance score or ranking
  - Preview snippet showing context around matched terms
  - Example query: "How to train models on emotional datasets" → Returns entries tagged with "emotional", "dataset", "training"
- **Auto-Suggest on Job Creation**: When user configures new training job:
  - System detects dataset/configuration similarity to knowledge base entries
  - Show suggestion panel or card: "Similar setup succeeded in: [Entry Title] (view article)"
  - User clicks suggestion → Opens knowledge base entry in sidebar or new tab
  - User can apply suggested configuration with one click
- **States**:
  - "Add to KB" button enabled (on successful jobs), disabled (on failed/in-progress jobs)
  - Knowledge base empty: "No entries yet. Add your first successful job to get started."
  - Search results empty: "No entries match '[search term]'. Try different keywords."
  - Auto-suggest available: Suggestion panel visible with relevant entries
  - Auto-suggest none found: No suggestions (panel hidden or shows "No similar entries found")

Interactions and Flows
- **Primary Flow - Add Successful Job to Knowledge Base**:
  1. User views job details page for completed successful training job
  2. User clicks "Add to Knowledge Base" button
  3. Knowledge base entry form opens (modal or new page)
  4. Form auto-populated with:
     - Title: Job name (editable)
     - Category: "Best practices" (default, changeable)
     - Tags: Extracted from job (dataset type, preset, domain)
     - Content: Configuration + results + job notes
  5. User reviews/edits content, adds key learnings section:
     - "This Balanced preset works excellently for 200+ conversation emotional datasets. Perplexity improved 35%, EI improved 42%. Cost: $52. Recommend for similar projects."
  6. User selects related jobs (if applicable): Links to 2-3 similar successful jobs
  7. User clicks "Save to Knowledge Base"
  8. System creates knowledge base entry
  9. Confirmation: "Added to knowledge base. View entry → [link]"
  10. Entry now searchable by team members
- **Secondary Flow - Search Knowledge Base for Guidance**:
  1. New engineer wants to train model on retirement planning dataset
  2. User navigates to Knowledge Base page
  3. User types "retirement planning training" in search box
  4. Search results display 5 relevant entries:
     - "Retirement Planning Training - Conservative Preset (98% success)"
     - "High-Quality Financial Advisory Model - Balanced (Client: Acme Financial)"
     - etc.
  5. User clicks entry: "Retirement Planning Training - Conservative Preset"
  6. Entry detail page displays:
     - Configuration: Conservative preset, r=8, lr=1e-4, 2 epochs, spot instance
     - Results: 32% perplexity improvement, 95% success rate, $42 cost
     - Key learnings: "Conservative preset optimal for retirement planning due to dense domain knowledge. Aggressive LR risks overfitting."
     - Related jobs: Links to 3 similar successful jobs
  7. User clicks "Use This Configuration"
  8. Job creation form opens with settings pre-filled
  9. User adjusts dataset (their retirement planning dataset), starts job
  10. Success: New engineer replicates proven configuration without trial-and-error
- **Tertiary Flow - Auto-Suggest During Job Creation**:
  1. User starts configuring new training job
  2. User selects dataset: "Financial Advisory - Emotional Intelligence (250 conversations)"
  3. System analyzes dataset characteristics (domain, size, emotional focus)
  4. System searches knowledge base for similar entries
  5. Auto-suggest panel appears: "Similar setup succeeded in: 'High-Quality Emotional Dataset Training - Balanced Preset' (view article)"
  6. User clicks "view article"
  7. Knowledge base entry opens in sidebar or modal
  8. User reviews configuration and results
  9. User clicks "Use This Configuration"
  10. Job creation form updates with suggested settings (Balanced preset, r=16, etc.)
  11. User proceeds with confidence, knowing this approach succeeded previously
- **Quaternary Flow - Browse Knowledge Base by Category**:
  1. User wants to see all "Best practices" entries
  2. User navigates to Knowledge Base page
  3. User clicks category filter: "Best practices"
  4. Grid view displays entries filtered by category
  5. User sees 12 best practice entries (grid cards)
  6. User sorts by "Most viewed" to see most popular entries
  7. User clicks top entry to learn from proven approaches
  8. User absorbs insights and applies to future jobs

Visual Feedback
- "Add to Knowledge Base" button with bookmark or star icon
- Knowledge base entry cards with category color-coding (e.g., Best Practices = green, Troubleshooting = red)
- Tags displayed as colored chips or badges
- Search results highlight matched terms in bold
- Auto-suggest panel styled as informational card (blue border, lightbulb icon)
- "Use This Configuration" button prominent (blue, CTA styling)
- Entry view count indicator: "Viewed 23 times"
- Related jobs shown as linked cards with thumbnails (status badges)

Accessibility Guidance
- "Add to KB" button keyboard accessible (Tab, Enter)
- Knowledge base entry form focus managed (Tab through fields, Esc to close)
- Search box aria-label "Search knowledge base"
- Entry cards keyboard navigable (Tab, Enter to open)
- Category filters keyboard accessible (arrow keys, Space to select)
- Auto-suggest panel announced by screen readers when appears
- "Use This Configuration" button has descriptive aria-label

Information Architecture
- **Job Details Page**:
  - Actions toolbar: Download, Export, Share, **Add to Knowledge Base**
- **Knowledge Base Entry Form**:
  - Section 1: Basic info (title, category, tags)
  - Section 2: Content (configuration, results, learnings)
  - Section 3: Related jobs (links to similar jobs)
  - Footer: Save/Cancel buttons
- **Knowledge Base Library Page**:
  - Header: Page title, search box
  - Filters: Category, Tags, Author, Sort
  - Content: Grid or list of entry cards
  - Each card: Title, category badge, tags, preview, author, date
- **Knowledge Base Entry Detail Page**:
  - Header: Title, category, tags, author, date added, view count
  - Section: Configuration summary
  - Section: Results (metrics, charts)
  - Section: Key learnings
  - Section: Related jobs (linked cards)
  - Actions: "Use This Configuration", Edit (if owner), Delete (if owner)
- **Auto-Suggest Panel (Job Creation)**:
  - Appears as sidebar or inline card during job configuration
  - Title: "Similar successful setup found"
  - Entry preview: Title, key metrics, "view article" link
  - "Use This Configuration" button

Page Plan
1. **Job Details Page (with "Add to KB" Button)**
   - Purpose: Initiate knowledge base entry creation from successful job
   - Components: "Add to Knowledge Base" button in actions toolbar
   - States: Button enabled (successful job), disabled (failed/in-progress)
2. **Knowledge Base Entry Form**
   - Purpose: Create knowledge base entry with configuration, results, learnings
   - Components: Title, category, tags, content fields, related jobs, save button
   - States: Form with auto-populated fields, user editing, saved confirmation
3. **Knowledge Base Library Page**
   - Purpose: Browse and search team knowledge base entries
   - Components: Search box, filters, grid/list of entry cards, sort controls
   - States: All entries, filtered by category/tags, search results, empty state
4. **Knowledge Base Entry Detail Page**
   - Purpose: View full knowledge base entry with configuration, results, learnings
   - Components: Entry details, configuration summary, results, learnings, related jobs, "Use This Configuration" button
   - States: Entry displayed, user reading, clicks "Use Config" (redirects to form)
5. **Auto-Suggest Panel (Job Creation)**
   - Purpose: Suggest relevant knowledge base entries during job configuration
   - Components: Suggestion card with entry preview, "view article" link, "Use This Configuration" button
   - States: Suggestions available, no suggestions found, suggestion clicked (sidebar opens)
6. **Knowledge Base Search Results Page**
   - Purpose: Display search results with matched entries
   - Components: Search query display, results list with previews, matched terms highlighted
   - States: Results available, no results (empty state), refine search prompt

Annotations (Mandatory)
- Attach notes on UI elements citing acceptance criteria:
  - "Add to KB" button → US8.3.2: "'Add to Knowledge Base' button on successful jobs"
  - Entry form → US8.3.2: "Create knowledge base entry: Title, Category, Tags, Content, Related jobs"
  - KB library page → US8.3.2: "Knowledge base searchable: 'How to train models on emotional datasets'"
  - Entry detail page → US8.3.2: "Use case: New engineer searches 'retirement planning training' → finds 5 past successful jobs"
  - Auto-suggest panel → US8.3.2: "Auto-suggest: When creating new job, suggest related knowledge base articles"
- Include "Mapping Table" frame in Figma:
  - Criterion: "'Add to Knowledge Base' button" → Screen: Job Details → Component: Button → State: Enabled for successful jobs
  - Criterion: "Create KB entry with title, category, tags, content" → Screen: KB Entry Form → Components: Form fields → State: Auto-populated from job
  - Criterion: "KB searchable by query" → Screen: KB Library → Component: Search box → State: Full-text search
  - Criterion: "KB entry displays configuration, results, learnings, related jobs" → Screen: Entry Detail → Components: Sections → State: Full content visible
  - Criterion: "Auto-suggest during job creation" → Screen: Job Creation Form → Component: Auto-suggest panel → State: Suggestions displayed

Acceptance Criteria → UI Component Mapping

**UI-Relevant Criteria:**

1. **"Add to Knowledge Base" button on successful jobs**
   - Source: US8.3.2
   - Screen(s): Job Details Page
   - Component(s): Button in actions toolbar
   - State(s): Enabled for completed successful jobs, disabled for failed/in-progress
   - Notes: Determines eligibility based on job status and quality thresholds

2. **Create knowledge base entry: Title (job name)**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Entry Form
   - Component(s): Title text input field
   - State(s): Auto-populated with job name, user can edit
   - Notes: Example: "High-Quality Emotional Dataset Training - Balanced Preset"

3. **Create knowledge base entry: Category (Best practices, Experiments, Client deliveries, Troubleshooting)**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Entry Form
   - Component(s): Category dropdown or radio buttons
   - State(s): One category selected (default: "Best practices")
   - Notes: Category determines visual styling and filtering in library

4. **Create knowledge base entry: Tags (Aggressive LR, High emotion, Financial domain, etc.)**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Entry Form
   - Component(s): Multi-select tags input or token field
   - State(s): Multiple tags selected, auto-suggested from job metadata
   - Notes: Tags enable filtering and search in knowledge base

5. **Create knowledge base entry: Content (Configuration summary, results, key learnings, notes)**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Entry Form
   - Component(s): Rich text editor or markdown textarea
   - State(s): Auto-populated from job data, user can edit and add learnings
   - Notes: Content includes configuration, metrics, perplexity improvement, cost, job notes

6. **Create knowledge base entry: Related jobs (Link to similar successful jobs)**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Entry Form
   - Component(s): Related jobs selector (search and add)
   - State(s): 0-5 related jobs linked, displayed as cards
   - Notes: Auto-detection optional; user can manually add related jobs

7. **Knowledge base searchable: "How to train models on emotional datasets"**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Library Page
   - Component(s): Search box with full-text search capability
   - State(s): Search active, results displayed with matched terms highlighted
   - Notes: Searches across title, tags, content fields

8. **Use case: New engineer searches "retirement planning training" → finds 5 past successful jobs with notes and configurations**
   - Source: US8.3.2
   - Screen(s): Knowledge Base Library (search results)
   - Component(s): Search results list with entry previews
   - State(s): Multiple matching entries displayed
   - Notes: Enables rapid onboarding by providing proven examples

9. **Auto-suggest: When creating new job, suggest related knowledge base articles: "Similar setup succeeded in Job XYZ"**
   - Source: US8.3.2
   - Screen(s): Job Creation Form
   - Component(s): Auto-suggest panel or card
   - State(s): Suggestions displayed when similarity detected, hidden if no matches
   - Notes: Proactively guides users to proven configurations

10. **Knowledge base entry displays: Configuration summary, results, key learnings, notes, related jobs**
    - Source: US8.3.2 (inferred from content structure)
    - Screen(s): Knowledge Base Entry Detail Page
    - Component(s): Multiple sections displaying entry content
    - State(s): Full entry visible, related jobs clickable
    - Notes: Comprehensive view enables learning from past successes

11. **"Use This Configuration" action (implicit from use case)**
    - Source: US8.3.2 (inferred from replication use case)
    - Screen(s): Knowledge Base Entry Detail Page
    - Component(s): "Use This Configuration" button
    - State(s): Enabled, redirects to job creation form with settings pre-filled
    - Notes: Enables one-click replication of proven configurations

Non-UI Acceptance Criteria

**Backend/System Criteria:**

1. **Knowledge base entry creation from training job**
   - Impact: Backend must transform job data into knowledge base entry structure
   - UI Hint: Entry form auto-populated with job configuration, results, notes

2. **Full-text search across knowledge base entries**
   - Impact: Backend search engine must index title, tags, content fields
   - UI Hint: Search box queries across all indexed fields, returns ranked results

3. **Auto-suggest similarity detection**
   - Impact: Backend algorithm compares new job configuration to knowledge base entries, calculates similarity scores
   - UI Hint: Auto-suggest panel displays when similarity exceeds threshold

4. **Related jobs linking**
   - Impact: Backend maintains relationships between knowledge base entries and training jobs
   - UI Hint: Entry detail page displays related jobs as clickable links

5. **This is a future enhancement feature**
   - Impact: May not be implemented in initial release; design should be thorough for future development
   - UI Hint: All UI elements should be fully specified even if implementation is deferred

Estimated Page Count
- **6 pages total**
- Rationale:
  - Page 1: Job Details with "Add to Knowledge Base" button (initiate entry creation)
  - Page 2: Knowledge Base Entry Form (create entry with metadata and content)
  - Page 3: Knowledge Base Library Page (browse and search entries)
  - Page 4: Knowledge Base Entry Detail Page (view full entry content)
  - Page 5: Auto-Suggest Panel on Job Creation Form (proactive suggestions)
  - Page 6: Knowledge Base Search Results Page (display matched entries)
- This count ensures comprehensive coverage of the future knowledge base feature

=== END PROMPT FR: FR8.3.1 ===

---

