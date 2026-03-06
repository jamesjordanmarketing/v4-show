# LoRA Pipeline - Stage 9 Combined Figma Wireframe Prompt
**Version:** 1.0  
**Date:** January 4, 2026  
**Stage:** Stage 9 — Enhanced Job Monitoring (Real-time Metrics & Engine Info)  
**Section ID:** E09  
**Optimization:** Proof-of-Concept (POC) - Essential features with real-time visibility

**Generated From:**
- Source Document: C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\model-training-philosophy_v1.md
- Section: UI Requirements (lines 1817-2316), Enhanced Job Monitoring
- Philosophy: Transparency through real-time metrics, modularity through metric categories

---

## Prompt for Figma Make AI

**Title:** Stage 9 — Enhanced Job Monitoring (Real-time Metrics & Engine Info) - Complete Integrated Wireframe System

**Context Summary**

This stage enhances the existing training job monitoring dashboard (E02) with detailed engine visibility and structured real-time metrics display. Users can see which specific training engine is executing their job, view real-time metrics organized by category (Universal, Domain, Specialized), understand metric trends through visual indicators, and access methodology documentation for transparency. The interface prioritizes anxiety reduction through transparency, confidence building through visible progress in multiple dimensions, and trust through complete visibility into the training process. This builds upon E02's foundation while adding modular metric categories that support the new advanced training framework.

**Journey Integration**

- **Stage 9 User Goals:** 
  - Verify correct engine is running (matches configuration selection)
  - Monitor training progress across multiple metric dimensions
  - Understand metric trends (improving, stable, degrading)
  - Access metric methodology for validation and debugging
  - Confirm specialized metrics are being collected
  - Track training health through comprehensive metric view
  - Build confidence through transparent real-time visibility

- **Key Emotions:** 
  - Initial verification (is it running correctly?) → Relief through engine confirmation → Confidence building through visible metrics → Trust through transparency → Satisfaction when specialized metrics show progress → Control through comprehensive monitoring

- **Progressive Disclosure:** 
  - **Basic:** Engine name, universal metrics (loss, time), overall progress
  - **Advanced:** Metric categories (tabs), trend indicators, specialized metrics values
  - **Expert:** (Reserved for future - metric correlation, anomaly detection, optimization suggestions)

- **Persona Adaptations:** 
  - AI Engineers need technical metrics and engine details for validation and debugging
  - Operations Managers need high-level health indicators and progress percentages
  - Quality Analysts need specialized metrics visibility and methodology access
  - All personas benefit from transparent, anxiety-reducing real-time visibility

**Wireframe Goals**

- Display engine information prominently to confirm correct configuration execution
- Organize metrics into clear categories (Universal, Domain, Specialized) using tab interface
- Show metric trends through visual indicators (up/down/stable arrows with color coding)
- Provide real-time updates (5-second polling for active jobs) without overwhelming users
- Enable metric methodology access through help icons and links
- Integrate seamlessly with existing E02 monitoring dashboard without disrupting established workflow
- Maintain consistency with E02 design patterns while enhancing information architecture
- Support future extensibility through modular metric display components

**Explicit UI Requirements**

---

## SECTION 1: Integration with Existing E02 Job Detail Page

**Page Context:** `/training/jobs/[jobId]`  
**Existing Components from E02:** 
- Job header with name and status badge
- Progress bar with epoch/step information
- Stage progression indicator (Preprocessing → Model Loading → Training → Finalization)
- Event log with filtering
- Cost tracking card
- Action buttons (Cancel Job, etc.)

**New Components Added in E09:**
- Engine Information Panel (new card, positioned after progress card)
- Enhanced Real-time Metrics Panel (replaces or enhances existing metrics display)

**Layout Order (Top to Bottom):**
1. Job Header (existing E02)
2. Progress Card (existing E02)
3. **Engine Information Panel (NEW - E09)**
4. **Enhanced Real-time Metrics Panel (NEW - E09)**
5. Stage Progression (existing E02)
6. Event Log (existing E02)
7. Cost Tracking (existing E02)

---

## SECTION 2: Engine Information Panel (FR9.1.1 - New)

**Component Type:** Information card (read-only, non-interactive except for help icon)

**Card Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 20px
- Shadow: Subtle (matches existing E02 cards)
- Margin-bottom: 24px (spacing before next component)

**Card Header:**
- Title: "Engine Information" (semibold, 16px)
- Subtitle: "Training engine powering this job" (gray, 13px)
- Help icon: Question mark circle (right-aligned), opens engine details modal

**Content Layout:**
- Grid: 2 columns on desktop, 1 column on mobile
- Row gap: 12px
- Each row: Label (left/gray) + Value (right/bold)

**Information Rows:**

### Row 1: Engine Name
- Label: "Engine" (gray, 14px, regular weight)
- Value: "TRL Standard" (black, 14px, semibold)
- Badge (inline, next to value): "v1.0.0" (gray background, 11px)
- Visual: Engine icon (gear) before value

### Row 2: Model Name
- Label: "Model" (gray, 14px)
- Value: "mistralai/Mistral-7B-Instruct-v0.3" (black, 14px, semibold)
- Visual: Model icon (cube) before value
- Truncation: Ellipsis if model name too long, full name in tooltip on hover

### Row 3: Quantization Method
- Label: "Quantization" (gray, 14px)
- Value: "4-bit (QLoRA)" (black, 14px, semibold)
- Info icon (inline): Tooltip explains "4-bit quantization reduces memory usage while maintaining quality"

### Row 4: LoRA Configuration
- Label: "LoRA Config" (gray, 14px)
- Value: "Rank: 16 | Alpha: 32" (black, 14px, semibold)
- Format: Inline configuration summary

### Row 5: Special Features (conditional)
- Label: "Features" (gray, 14px)
- Value: Feature badges (if engine has special features)
  - Example: "Role Alternation Fixing" (green badge), "Emotional Arc Weighting" (purple badge)
- Layout: Badges wrap to multiple lines if needed

**Engine Status Indicator:**
- Position: Top-right corner of card (badge)
- States:
  - "Running" (green badge with pulse animation)
  - "Initializing" (blue badge with loading animation)
  - "Completed" (gray badge, no animation)
  - "Failed" (red badge, no animation)

**Responsive Design:**
- Desktop: 2-column grid for information rows
- Tablet: 2-column grid (slightly narrower)
- Mobile: 1-column stack, full width

**Empty/Error States:**
- Loading: Skeleton loader (5 shimmer rows while fetching engine info)
- Error: "Unable to load engine information" with retry button
- Fallback: If engine_id not specified, shows "TRL Standard (Default)"

---

## SECTION 3: Enhanced Real-time Metrics Panel (FR9.1.2 - New)

**Component Type:** Tabbed metrics display with real-time updates

**Card Container:**
- Background: White
- Border: 1px solid gray (#E5E7EB)
- Border radius: 8px
- Padding: 20px
- Shadow: Subtle (matches existing E02 cards)
- Margin-bottom: 24px

**Card Header:**
- Title: "Training Metrics" (semibold, 18px)
- Subtitle: "Real-time measurements updated every 5 seconds" (gray, 13px)
- Last update indicator: "Updated 3s ago" (gray, 12px, right-aligned)
- Loading indicator: Small spinner (animated) when fetching updates

**Tab Navigation:**
- Position: Below card header, above metrics content
- Layout: Horizontal tab list (horizontal scroll on mobile if needed)
- Tab styling:
  - Active tab: Blue underline (3px), bold text, black color
  - Inactive tabs: No underline, regular weight, gray color
  - Hover: Light gray background
- Tab labels with counts:
  - "Universal (4)" - always present
  - "Domain (2)" - conditional, only if domain metrics available
  - "Specialized (3)" - conditional, only if specialized metrics selected and available

**Tab Behavior:**
- Default: Universal tab selected on page load
- Click: Switches active tab, displays corresponding metrics
- URL persistence: Tab selection persisted in URL query parameter (?metrics=universal)
- State preservation: Active tab persists when navigating away and returning

---

## SECTION 4: Universal Metrics Tab Content (FR9.1.3)

**Tab Content Container:**
- Padding: 16px (internal padding within tab content area)
- Background: White (same as card)

**Metrics Display Format:** Metric Table

**Table Layout:**
- Columns: Metric Name | Current Value | Trend | Last Updated
- Column widths: 35% | 25% | 20% | 20%
- Header row: Semibold, 13px, gray background
- Data rows: Regular, 14px, white background, border-bottom (1px, light gray)
- Row hover: Light gray background

**Column 1: Metric Name**
- Format: Metric name (semibold, 14px)
- Sub-text: Brief description (gray, 12px, below name)
- Icon: Small icon representing metric type (left of name)
- Help icon: Question mark circle (inline, right), opens metric detail modal

**Column 2: Current Value**
- Format: Large, readable number (16px, semibold)
- Unit: Small text (12px, gray, inline after value)
- Formatting:
  - Numbers: Up to 4 decimal places (0.2345)
  - Percentages: Integer + % (95%)
  - Durations: Human-readable (2h 34m)
  - Sizes: Auto-scaling (1.2GB, 450MB)

**Column 3: Trend Indicator**
- Visual: Arrow icon + percentage change
- States:
  - **Improving:** Green down arrow (↓) for loss-type metrics, green up arrow (↑) for quality metrics
    - Text: "-12%" or "+8%" (green color, 13px)
  - **Degrading:** Red up arrow (↑) for loss-type metrics, red down arrow (↓) for quality metrics
    - Text: "+15%" or "-5%" (red color, 13px)
  - **Stable:** Horizontal dash (−) with gray color
    - Text: "±2%" (gray color, 13px)
  - **No trend:** Empty (if insufficient data for trend calculation)
    - Text: "—" (gray)
- Tooltip: "Change since last epoch" on hover

**Column 4: Last Updated**
- Format: Relative time (e.g., "3s ago", "1m ago")
- Color: Gray (12px)
- Updates: Every 5 seconds when new data arrives
- Stale data indicator: Orange color if >30s old (suggests polling issue)

**Universal Metrics (Example Rows):**

### Metric 1: Training Loss
- Name: "Training Loss"
- Description: "Cross-entropy loss during training"
- Icon: Chart line down
- Current Value: "0.2345 nats"
- Trend: Green down arrow, "-8%"
- Last Updated: "5s ago"

### Metric 2: Learning Rate
- Name: "Learning Rate"
- Description: "Current optimizer learning rate"
- Icon: Speedometer
- Current Value: "0.00005"
- Trend: Horizontal dash, "±0%" (stable)
- Last Updated: "5s ago"

### Metric 3: Tokens per Second
- Name: "Throughput"
- Description: "Training tokens processed per second"
- Icon: Lightning bolt
- Current Value: "1,250 tok/s"
- Trend: Green up arrow, "+5%"
- Last Updated: "5s ago"

### Metric 4: GPU Utilization
- Name: "GPU Utilization"
- Description: "Percentage of GPU compute used"
- Icon: GPU chip
- Current Value: "95%"
- Trend: Horizontal dash, "±1%" (stable)
- Last Updated: "5s ago"

### Metric 5: Memory Usage
- Name: "Memory Used"
- Description: "Current GPU memory consumption"
- Icon: Memory chip
- Current Value: "68 GB / 80 GB"
- Trend: No trend (absolute value)
- Last Updated: "5s ago"

**Table Behavior:**
- Sorting: Not implemented in POC (future enhancement)
- Filtering: Not needed (all universal metrics always shown)
- Refresh: Automatic every 5 seconds via polling
- Manual refresh: Refresh button in card header (optional)

**Empty State:**
- Icon: Loading spinner (animated)
- Text: "Waiting for metrics..." (gray, 14px)
- Sub-text: "Metrics will appear once training begins" (gray, 12px)
- Shown during: Job queued, initializing, or first few seconds of training

**Error State:**
- Icon: Warning triangle (orange)
- Text: "Unable to load metrics" (gray, 14px)
- Action: "Retry" button (blue outline)
- Shown when: API request fails or times out

---

## SECTION 5: Specialized Metrics Tab Content (FR9.1.4 - Conditional)

**Visibility:** Only shown if specialized metrics were selected during job configuration

**Tab Content Container:**
- Same styling as Universal Metrics tab
- Uses identical metric table layout

**Specialized Metrics (Example Rows):**

### Metric 1: Emotional Arc Fidelity
- Name: "Emotional Arc Fidelity"
- Description: "Adherence to emotional arc progression"
- Icon: Heart with chart
- Current Value: "0.87"
- Trend: Green up arrow, "+3%"
- Last Updated: "12s ago" (may update less frequently than universal metrics)
- Help icon: Links to measurement methodology

### Metric 2: Empathy Score
- Name: "Empathy Score"
- Description: "Empathetic language detection"
- Icon: Two hands
- Current Value: "0.79"
- Trend: Green up arrow, "+5%"
- Last Updated: "12s ago"

### Metric 3: Multi-Perspective Consensus
- Name: "Consensus Score"
- Description: "Quality of multi-perspective synthesis"
- Icon: People group
- Current Value: "0.82"
- Trend: Horizontal dash, "±1%"
- Last Updated: "12s ago"

**Update Frequency:**
- Universal metrics: Every 5 seconds (high-frequency)
- Specialized metrics: Every 10-15 seconds (lower frequency, more expensive to compute)
- Visual indicator: "Evaluating..." badge appears briefly when specialized metrics are being computed

**No Specialized Metrics Selected:**
- Empty state displayed in tab:
  - Icon: Info circle (gray)
  - Text: "No specialized metrics selected for this job" (gray, 14px)
  - Sub-text: "Specialized metrics can be configured when creating a training job" (gray, 12px)
  - Link: "Learn about specialized metrics" (blue, opens documentation)

**Evaluation Status (During Training):**
- Badge: "Evaluating specialized metrics..." (blue badge with pulse animation)
- Position: Top of specialized metrics tab content
- Shown when: Specialized metrics are being actively computed
- Auto-dismisses: When evaluation completes

---

## SECTION 6: Domain Metrics Tab Content (FR9.1.5 - Conditional)

**Visibility:** Only shown if domain-specific metrics are available (e.g., language modeling domain)

**Tab Content Container:**
- Same styling as Universal Metrics tab
- Uses identical metric table layout

**Domain Metrics - Language Modeling Example:**

### Metric 1: Perplexity
- Name: "Perplexity"
- Description: "Model prediction quality measure"
- Icon: Book with chart
- Current Value: "12.34"
- Trend: Green down arrow, "-6%" (lower is better)
- Last Updated: "8s ago"

### Metric 2: Token Accuracy
- Name: "Token Accuracy"
- Description: "Percentage of correctly predicted tokens"
- Icon: Target with checkmark
- Current Value: "87.5%"
- Trend: Green up arrow, "+2%"
- Last Updated: "8s ago"

**No Domain Metrics Available:**
- Tab hidden (not shown in tab list)
- Or tab shown with empty state: "No domain metrics available for this model type"

---

## SECTION 7: Metric Detail Modal (FR9.1.6 - Accessible from Any Metric)

**Trigger:** User clicks help icon (?) on any metric row

**Modal Design:**
- Overlay: Semi-transparent black (60% opacity)
- Container: 700px width, centered, white background
- Shadow: Large drop shadow
- Close: X button (top-right) + click overlay to close + ESC key

**Modal Header:**
- Metric name (bold, 22px)
- Metric level badge: "Universal" / "Domain" / "Specialized" (color-coded)
- Close button (X icon, top-right)

**Modal Content:**

### Section 1: What This Measures
- Title: "Description" (semibold, 16px)
- Text: Full description (14px, line-height: 1.6)
- Example: "Training Loss measures the cross-entropy loss between the model's predictions and the actual training data. Lower values indicate the model is learning to match the training data more accurately."

### Section 2: Current Status
- Title: "Current Value" (semibold, 16px, margin-top: 20px)
- Large value display: Current metric value (32px, bold)
- Trend indicator: Arrow + percentage (same styling as table)
- Context: "This is [good/excellent/concerning] based on typical ranges for this model size"

### Section 3: Interpretation Guide
- Title: "Interpreting This Metric" (semibold, 16px, margin-top: 20px)
- Visual range indicator:
  - Green zone: "Excellent" (e.g., Loss <0.5)
  - Blue zone: "Good" (e.g., Loss 0.5-1.0)
  - Yellow zone: "Fair" (e.g., Loss 1.0-2.0)
  - Red zone: "Concerning" (e.g., Loss >2.0)
- Current value marker on range indicator

### Section 4: Trend Analysis (if available)
- Title: "Trend History" (semibold, 16px, margin-top: 20px)
- Mini line chart: Last 20 data points
- Trend direction: "Improving steadily" / "Plateauing" / "Degrading"

### Section 5: Measurement Details
- Title: "How It's Measured" (semibold, 16px, margin-top: 20px)
- Bulleted list:
  - Update frequency (e.g., "Every 5 seconds")
  - Calculation method (brief explanation)
  - Data source (e.g., "Computed during backpropagation")

### Section 6: Actions (if applicable)
- Title: "Related Actions" (semibold, 16px, margin-top: 20px)
- Links:
  - "View in Event Log" (filters event log to this metric's updates)
  - "Export Metric History" (downloads CSV of this metric over time)

**Modal Footer:**
- Primary action: "Got It" button (blue, closes modal)
- Secondary link: "Read Full Documentation" (opens `/docs/metrics/{metric_id}` in new tab)
- Alignment: Right

**Responsive Design:**
- Desktop: 700px width
- Tablet: 90% width, max 600px
- Mobile: Full width with 16px margin

---

## SECTION 8: Real-time Update Mechanism

**Polling Strategy:**
- Active jobs (status = 'running', 'initializing'): Poll every 5 seconds
- Completed/failed jobs: No polling (static data)
- User away (tab not focused): Reduce polling to every 15 seconds (battery saving)
- Connection issues: Exponential backoff (5s → 10s → 20s → 40s)

**Visual Indicators:**

### Update Animation
- When new data arrives: Brief flash/highlight (light blue background for 300ms)
- Updated rows: Subtle border pulse on changed values
- No disruption: User can continue reading without being distracted

### Live Indicator
- Position: Card header, right side
- States:
  - "Live" (green dot, pulsing) - Actively polling and receiving updates
  - "Paused" (gray dot) - Polling paused (user left tab)
  - "Reconnecting..." (yellow dot, pulsing) - Connection issues, retrying
  - "Offline" (red dot) - Unable to connect after retries

### Connection Error Handling
- Transient errors (<3 failures): Silent retry with exponential backoff
- Persistent errors (≥3 failures): Show error banner
  - "Unable to fetch updates. Retrying..."
  - "Check connection" button (manual refresh)
- Resume on success: Automatically resumes normal polling when connection restored

**Data Freshness:**
- Each metric shows "Last updated: Xs ago"
- Stale data (>30s old): Orange text color
- Very stale data (>2m old): Red text color + warning icon
- Tooltip on hover: "Data may be stale. Check connection."

---

## SECTION 9: Integration with Existing E02 Components

**Compatibility Requirements:**
- Must coexist with existing E02 components without layout conflicts
- Should not duplicate existing functionality (e.g., progress bar stays, enhanced with engine info)
- Maintains existing E02 navigation and action buttons

**Replacement Strategy:**
- **Replace:** If E02 has basic metrics display, replace it with enhanced metrics panel
- **Add:** If E02 doesn't show metrics, add as new panel
- **Enhance:** If E02 shows progress only, keep progress and add metrics below

**Shared State:**
- Job status (running, completed, failed) determines component behavior
- Cost tracking (existing E02) and metrics panel both consume same job data
- Event log (existing E02) can be filtered by metric-related events

**Navigation:**
- Breadcrumb: Home → Training Jobs → [Job Name] → (no change from E02)
- Back button: Returns to jobs list (E02 behavior preserved)
- Tab within page: Metrics tabs are local to metrics panel, don't affect main navigation

---

## SECTION 10: Responsive Design & Mobile Optimization

**Desktop (≥1024px):**
- Engine info panel: Full width, 2-column grid for info rows
- Metrics table: Full width, all 4 columns visible
- Tab navigation: Horizontal, all tabs visible
- Modal: 700px width, centered

**Tablet (768px - 1023px):**
- Engine info panel: Full width, 2-column grid (slightly narrower)
- Metrics table: Full width, all 4 columns visible (slightly compressed)
- Tab navigation: Horizontal, may need horizontal scroll if many tabs
- Modal: 90% width, max 600px

**Mobile (<768px):**
- Engine info panel: Full width, 1-column stack
  - Label + value stacked vertically for readability
- Metrics table: Transformed to card layout
  - Each metric is a card (border, padding)
  - Cards stack vertically
  - Trend indicator and value displayed prominently
  - "Last updated" shown as relative time badge
- Tab navigation: Horizontal scroll with visible scroll indicators
- Modal: Full width with 16px margin, scrollable content

**Mobile Metrics Card Design:**
- Card border: 1px solid gray
- Border radius: 8px
- Padding: 16px
- Margin-bottom: 12px (between cards)
- Layout:
  - Top: Metric name (semibold, 16px) + help icon
  - Middle: Current value (large, 24px, bold) + trend badge
  - Bottom: Description (gray, 12px) + "Last updated" (gray, 11px)

---

## SECTION 11: Accessibility Requirements

**Keyboard Navigation:**
- Tab key: Navigate through tabs, metric rows, help icons, modal close button
- Enter/Space: Activate tab selection, open metric detail modal
- Arrow keys: Navigate between tabs (left/right)
- Escape: Close metric detail modal

**Screen Reader Support:**
- Engine info panel: "Region, Engine Information. Engine: TRL Standard..."
- Metrics table: "Table, Training Metrics. 5 rows, 4 columns."
- Metric row: "Row 1 of 5. Training Loss: 0.2345 nats, Improving, down 8%, Updated 5 seconds ago"
- Tab navigation: "Tab list, Training Metrics. Universal selected, 4 metrics. Domain, 2 metrics. Specialized, 3 metrics."
- Live indicator: "Status, Live updates active"
- Trend arrows: "Improving, down 8%" or "Degrading, up 15%"

**Visual Accessibility:**
- Color contrast: All text meets WCAG AA (4.5:1 minimum)
- Trend indicators: Not color-only (uses arrows + percentages)
- Focus indicators: 2px blue outline on all interactive elements
- Large touch targets: Minimum 44x44px for help icons, buttons

**Motion & Animation:**
- Respects `prefers-reduced-motion` system setting
- When enabled: No animations, instant transitions, no pulse effects
- Live indicator: Still functional, but no pulsing animation

---

## SECTION 12: Error Handling & Edge Cases

**No Metrics Available:**
- Reason: Job queued but not started
- Display: "Waiting for training to start..." with loading animation
- Resolution: Automatically shows metrics when job starts

**Stale Data:**
- Detection: Last update >30 seconds ago
- Visual: Orange text for "Last updated" timestamp
- Action: "Refresh" button in card header
- Automatic: Continues retrying with backoff

**Metrics Evaluation Error:**
- Reason: Specialized metric computation failed
- Display: Error icon next to metric name, "Evaluation failed" in value column
- Tooltip: Error message (e.g., "Classifier unavailable")
- Action: Link to event log for details

**No Specialized Metrics (User Didn't Select Any):**
- Tab visibility: Specialized tab still shown
- Content: Empty state with explanation
- Message: "No specialized metrics selected for this job"
- Action: Link to documentation about specialized metrics

**Engine Info Unavailable:**
- Reason: Job created before engine tracking was added
- Display: "Engine: TRL Standard (Default)" with info icon
- Tooltip: "Engine information not available for older jobs"
- No error: Graceful fallback to default values

---

## SECTION 13: Performance Optimization

**Data Management:**
- Metrics data cached in component state
- Only fetch deltas (changed metrics) when possible
- Batch multiple metric updates into single render
- Debounce rapid updates (max 1 render per 100ms)

**Rendering Optimization:**
- Virtual scrolling: Not needed for POC (small metric count)
- Memo: Metric rows memoized to prevent unnecessary re-renders
- Lazy load: Metric history chart only loaded when modal opened
- Conditional rendering: Domain/specialized tabs only rendered when active

**Network Optimization:**
- Single API call fetches all metrics (not separate calls per metric)
- Compression: Response gzipped by server
- Caching: ETags used for conditional requests
- Polling: Stops when user leaves page, resumes on return

---

## SECTION 14: Testing & Validation

**Component Testing:**
- Engine info panel displays all fields correctly
- Metrics table shows all metrics with correct formatting
- Tab navigation switches between tabs
- Trend indicators show correct direction and color
- Real-time updates reflect in UI within 5 seconds

**Integration Testing:**
- Polling starts when job status is 'running'
- Polling stops when job completes or fails
- Metrics data updates trigger UI refresh
- Cost estimate (E02) and metrics panel don't conflict
- Event log (E02) can be filtered by metric events

**Accessibility Testing:**
- Keyboard-only navigation works completely
- Screen reader announces all state changes
- Focus management correct when opening/closing modal
- Color contrast passes WCAG AA validation

**Performance Testing:**
- UI remains responsive during polling (no jank)
- Memory doesn't leak with long-running jobs (8+ hours)
- Network traffic reasonable (<100KB per poll)
- Battery impact acceptable on mobile devices

---

## Design System Consistency

**Reused Components from E01-E07:**
- Card styling (white background, borders, shadows)
- Table styling (headers, rows, hover states)
- Tab navigation (underline active state, gray inactive)
- Badge components (status indicators, counts)
- Icons (consistent style and sizing)
- Loading states (spinners, skeleton loaders)
- Modal styling (overlay, container, header/footer)
- Typography (H1-H6, body, helper text)

**New Components Introduced in E09:**
- Metric table with trend indicators
- Real-time update mechanism with live indicator
- Tabbed metrics display (reusable pattern)
- Engine information grid (reusable for other info panels)
- Metric detail modal (documentation pattern)

**Color Coding:**
- Green: Improving metrics, healthy state
- Red: Degrading metrics, concerning state
- Gray: Stable metrics, neutral state
- Blue: Active/selected state, informational
- Orange: Warnings, stale data
- Purple: Advanced/specialized features

---

**End of E09 Wireframe Prompt**

This wireframe prompt provides complete specifications for enhancing the job monitoring experience with engine visibility and structured real-time metrics, building on E02's foundation while introducing modular metric categories aligned with the advanced training framework's transparency and measurability principles.

