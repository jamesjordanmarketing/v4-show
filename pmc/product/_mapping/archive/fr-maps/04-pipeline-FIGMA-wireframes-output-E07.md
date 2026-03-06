# LoRA Pipeline - FIGMA Wireframes Output (E07)
**Version:** 1.0  
**Date:** 12/18/2025  
**Section:** E07 - Stage 7 — Cost Management & Budget Control  
**Generated From:** FR7.1.1, FR7.1.2, FR7.2.1, FR7.2.2, FR7.3.1, FR7.3.2

This file contains Figma-ready wireframe prompts for all Cost Management & Budget Control FRs.

---

=== BEGIN PROMPT FR: FR7.1.1 ===

Title
- FR FR7.1.1 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements real-time cost tracking for active training jobs, displaying current spend, hourly rates, elapsed time, cost estimate comparisons, and projected final costs. Engineers need continuous visibility into cost accumulation to make informed decisions about whether to continue or cancel expensive training runs. The interface must update every 60 seconds, provide clear visual indicators (green/yellow/red zones), trigger threshold-based warnings, and offer immediate cancellation access to prevent budget overruns.

Journey Integration
- Stage 7 user goals: Monitor cost accumulation in real-time, maintain budget awareness, make cost-based continuation decisions, prevent surprise overages
- Key emotions: Anxiety reduction through transparency, confidence in budget control, empowerment through immediate action capability
- Progressive disclosure levels:
  * Basic: Current spend vs estimate with visual indicator
  * Advanced: Detailed cost breakdown by component (GPU, interruptions, storage)
  * Expert: Historical cost tracking mini-chart, savings comparison vs on-demand
- Persona adaptations: Unified interface serving AI engineers (primary users) and budget managers (oversight users)

### Journey-Informed Design Elements
- User Goals: Real-time cost visibility, Budget control, Proactive intervention, Informed decision-making
- Emotional Requirements: Anxiety reduction through transparency, Confidence in cost predictions, Control through immediate cancellation access, Trust through accurate calculations
- Progressive Disclosure:
  * Basic: Large cost display with progress indicator and simple status
  * Advanced: Expandable cost breakdown showing GPU compute, spot interruption overhead, storage costs
  * Expert: Mini line chart showing cost accumulation trend, comparison to on-demand pricing
- Success Indicators: Cost updates every 60 seconds, Clear threshold warnings at 80%/100%/120%, One-click cancellation access, Accurate cost calculations within ±2%
  
Wireframe Goals
- Display real-time cost information updating every 60 seconds without full page reload
- Provide immediate visual feedback on budget status using color-coded indicators (green/yellow/red)
- Enable proactive budget control through threshold-based warnings and immediate cancellation
- Show comprehensive cost breakdown with expandable sections for technical details
- Compare actual costs against estimates with variance indicators
- Support both desktop and mobile responsive layouts with appropriate information density

Explicit UI Requirements (from acceptance criteria)

**Cost Tracker Card Placement & Structure**
- Card positioned prominently in top-right quadrant of job dashboard, above fold
- Card dimensions: 350px × 280px (responsive), sticky positioning on desktop
- Card header: "Cost Tracking" title with 💰 icon, last updated timestamp ("Updated 23 seconds ago"), small refresh spinner when fetching

**Primary Cost Display (Large, Prominent)**
- Current Spend: Large bold "$22.18" with circular progress ring showing 49% of estimate
- Progress ring color based on threshold: Green (<80%), Yellow (80-100%), Red (>100%)
- Estimated Cost Range: Smaller gray text "Estimated: $45-55"
- Variance indicator: "↓ $2.82 below estimate" (green) or "↑ $4.18 over estimate" (red)
- Hourly Rate: "Rate: $2.49/hr (spot)" with spot/on-demand badge
- Comparison text: "vs $7.99/hr on-demand (saving $5.50/hr)"

**Time & Projection Display**
- Elapsed time: "Elapsed: 6h 23m" with timer icon, updates every second client-side
- Time breakdown: "Active: 6h 15m, Paused: 8m" (if applicable)
- Projected final cost: "Projected: $47.32" with ±15% confidence indicator
- Completion estimate: "Est. final in 8h 15m → Total: $47.32"

**Visual Threshold Indicators**
- Green Zone (<80%): Green 2px card border, green progress ring, ✓ checkmark icon, "On track" message
- Yellow Zone (80-100%): Yellow/orange 2px border, yellow progress ring, ⚠️ warning icon, "Approaching estimate" message, dismissable alert banner
- Red Zone (>100%): Red 3px thick border, red progress ring, 🚨 icon, "Over budget" message, persistent non-dismissable alert banner

**Threshold Warning Alerts (In-Card)**
- 80% Alert: Dismissable yellow banner "Job approaching cost estimate ($36 of $45). Monitor closely."
- 100% Alert: Persistent orange banner "Job exceeded cost estimate ($46 of $45). Consider cancelling if necessary."
- 120% Alert: Persistent red banner "Job significantly over budget ($54 of $45). Review immediately."

**Immediate Cancellation Access**
- "Cancel Job" button below cost details, always visible, destructive styling (red outline)
- Disabled appearance if job not active
- Click opens simplified modal: "Cancel Training?" with job name, current cost shown, "Cancel" and "Continue Training" buttons
- Confirmation leads to immediate job termination, final cost locked

**Cost Breakdown Expandable Section**
- "View Cost Breakdown" link/button to expand itemized details
- GPU Compute Cost section:
  - Active training: "6h 15m @ $2.49/hr = $15.57"
  - Model loading: "15 min @ $2.49/hr = $0.62"
  - Preprocessing: "5 min @ $2.49/hr = $0.21"
  - Total GPU: "$16.40"
- Spot Interruption Overhead section:
  - List each interruption: "Interruption #1: 8 min recovery @ $2.49/hr = $0.33"
  - Total interruptions: "$0.75"
- Storage Costs section:
  - Checkpoints: "4.2GB stored = $0.00 (included)"
  - Total storage: "$0.00"
- Grand Total: "$17.15" (matches Current Spend display)

**Cost Comparison to On-Demand**
- "Savings vs On-Demand" section shows equivalent on-demand cost
- If spot: "On-demand equivalent: $52.82", "Your savings: $30.64 (58% cheaper)" in green
- If on-demand: "Cost with spot: $16.40 (estimated)", note about reliability premium

**Historical Cost Tracking Mini-Chart**
- Small line chart showing cost accumulation over time
- X-axis: Time, Y-axis: Cost
- Shows cost curve (should be roughly linear)
- Helps identify anomalies (sudden spikes)

**Loading & Update States**
- Skeleton/shimmer effect while initial data loads
- Subtle animation on cost value updates (no jarring changes)
- Never blocks user interaction during updates
- "Updating..." indicator during 60-second refresh cycles

**Empty/Error States**
- If no cost data available: "Cost tracking will begin once training starts"
- If cost calculation error: "Unable to calculate current cost. Refresh or contact support."
- If connection lost: "Cost updates paused. Reconnecting..." with retry button

Interactions and Flows

**Primary Flow: Continuous Cost Monitoring**
1. User opens active training job dashboard
2. Cost Tracker Card loads with current data (skeleton → populated)
3. Large current spend amount displayed prominently
4. Progress ring shows percentage of estimate consumed
5. Every 60 seconds, card refreshes with updated cost (smooth transition)
6. If threshold crossed (80%, 100%, 120%), warning banner appears
7. User can expand "View Cost Breakdown" to see itemized costs
8. User monitors until completion or decides to cancel

**Cancellation Flow**
1. User observes cost exceeding budget (red zone, >100%)
2. User clicks "Cancel Job" button in cost card
3. Modal appears: "Cancel Training? Job: [Name], Current cost: $54.18"
4. User confirms cancellation
5. Job immediately terminates, final cost locked at current amount
6. Success toast: "Job cancelled. Final cost: $54.18"

**Cost Breakdown Exploration Flow**
1. User clicks "View Cost Breakdown" link
2. Section expands inline showing itemized costs
3. User reviews GPU compute breakdown by stage
4. User sees spot interruption overhead details
5. User compares actual vs on-demand costs
6. User collapses section or leaves expanded

**Threshold Alert Flow**
1. Cost reaches 80% of estimate
2. Yellow dismissable banner appears: "Approaching estimate"
3. User acknowledges and dismisses banner
4. Cost reaches 100% of estimate
5. Orange persistent banner appears: "Exceeded estimate"
6. User monitors but continues training
7. Cost reaches 120% of estimate
8. Red persistent banner appears: "Significantly over budget"
9. User decides to cancel or continue

Visual Feedback

**Real-Time Updates**
- Cost amounts fade in/out smoothly when updating (no jarring number changes)
- Progress ring animates smoothly as percentage increases
- Elapsed time timer updates every second without flicker
- Loading spinner appears briefly when fetching updates

**Threshold Transitions**
- Card border color transitions smoothly when crossing thresholds (green → yellow → red)
- Icon changes when entering new zone (✓ → ⚠️ → 🚨)
- Alert banners slide in from top of card
- Sound/vibration notification on critical threshold (100%, 120%) - optional

**Status Indicators**
- Pulsing dot next to "Updated X seconds ago" when actively updating
- Success checkmark animation when cost update completes
- Warning triangle icon pulses when in yellow/red zones
- Green highlight on "Your savings" text when using spot instances

**Interaction Feedback**
- "Cancel Job" button shows hover state (darker red)
- "View Cost Breakdown" link shows underline on hover
- Expandable section slides open/closed smoothly
- Modal overlay fades in/out with backdrop blur

Accessibility Guidance

**Screen Reader Support**
- Cost amounts announced: "Current cost: twenty-two dollars and eighteen cents, which is forty-nine percent of estimated cost"
- Threshold changes announced: "Warning: Cost has exceeded estimated amount"
- Timer updates announced every minute (not every second to avoid spam)
- Modal focus trapped: When cancel modal opens, focus moves to modal and cycles within

**Keyboard Navigation**
- Tab through card elements: Current spend → Breakdown link → Cancel button
- Enter key activates links and buttons
- Escape key closes expanded breakdown section
- Escape key closes cancel modal

**Visual Indicators**
- Not color-only: Red threshold also shows "Over budget" text and 🚨 icon
- High contrast support: Card borders visible in high-contrast mode
- Icons have text labels: "⚠️ Warning" not just icon
- Progress ring has text percentage backup: "49% of estimate"

**Focus Management**
- Visible focus indicators on all interactive elements (2px outline)
- Focus remains on same element after cost update (no focus stealing)
- Cancel button receives focus when modal opens
- Focus returns to trigger element when modal closes

Information Architecture

**Primary Level (Always Visible)**
- Current Spend (largest, most prominent)
- Progress indicator (visual and numeric)
- Estimated cost range
- Hourly rate with GPU type
- Elapsed time
- Projected final cost
- Cancel Job button

**Secondary Level (Prominent but Smaller)**
- Last updated timestamp
- Variance indicator (above/below estimate)
- Savings vs on-demand comparison
- Completion time estimate
- Threshold warning banners (when applicable)

**Tertiary Level (Expandable/On-Demand)**
- Detailed cost breakdown (expand to view)
- Historical cost chart (mini version)
- Cost calculation methodology explanation
- Each interruption itemized

**Visual Hierarchy**
- Size: Current spend largest → Progress/estimate → Details → Breakdown
- Color: Primary costs (dark) → Estimates (gray) → Savings (green) → Warnings (red/yellow)
- Weight: Bold for actuals → Regular for estimates → Light for explanatory text
- Position: Top = most important → Bottom = least critical

Page Plan

1. **Training Job Dashboard - Active Job View**
   - Purpose: Monitor active training job with real-time cost tracking
   - Contains: Cost Tracker Card (top-right), progress metrics, loss curves, job status
   - States: Loading (skeleton), Active (updating every 60s), Completed (final costs)
   - Cost Card States: Green zone, Yellow zone, Red zone, Breakdown collapsed, Breakdown expanded

2. **Training Job Dashboard - Cost Breakdown Expanded View**
   - Purpose: Show itemized cost breakdown for transparency and understanding
   - Contains: Same dashboard with cost card breakdown section expanded
   - Shows: GPU compute by stage, spot interruptions detailed, storage costs, total calculation
   - States: Expanded view with all line items visible

3. **Cancel Training Modal (Overlay)**
   - Purpose: Confirm job cancellation with cost awareness
   - Contains: Modal overlay with job name, current cost, cancellation warning
   - Actions: Cancel (destructive), Continue Training (safe default)
   - States: Normal, Submitting (spinner), Error (cancellation failed)

Annotations (Mandatory)
- Each wireframe element must include annotation notes citing specific acceptance criteria
- Include a "Mapping Table" frame in Figma with columns: Criterion → Screen → Component(s) → State(s)
- Link visual elements to their source requirements using numbered annotations
- Indicate which acceptance criteria are satisfied by each component
- Mark required states: Default, Loading, Hover, Focus, Disabled, Error, Success
- Note responsive behavior: Desktop (>768px), Tablet (768-1023px), Mobile (<768px)

Acceptance Criteria → UI Component Mapping

**US7.1.1-01: Cost Tracker Card on job dashboard (prominent, top-right)**
- Source: US (User Story Acceptance Criteria)
- Screen: Training Job Dashboard - Active Job View
- Components: Cost Tracker Card (entire card component)
- States: Default, Loading, Updating, Green Zone, Yellow Zone, Red Zone
- Notes: Card positioned top-right, sticky on desktop, 350px × 280px, visible above fold

**US7.1.1-02: Estimated cost: $45-55**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Estimated Cost Range Text (in Cost Tracker Card)
- States: Default
- Notes: Smaller gray text below current spend, shows cost range from initial estimate

**US7.1.1-03: Current spend: $22.18 (49% of estimate)**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Current Spend Amount (large bold text), Progress Ring/Bar (circular progress indicator), Percentage Text ("49% of estimate")
- States: Default, Updating (fade animation)
- Notes: Largest text element in card, updates every 60 seconds

**US7.1.1-04: Hourly rate: $2.49/hr (spot)**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Hourly Rate Text, GPU Type Badge ("spot" or "on-demand")
- States: Default
- Notes: Shows current GPU pricing tier, includes badge indicating spot vs on-demand

**US7.1.1-05: Elapsed time: 6h 23m**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Elapsed Time Display, Timer Icon, Time Breakdown Text ("Active: 6h 15m, Paused: 8m")
- States: Default, Ticking (updates every second)
- Notes: Client-side timer, shows breakdown if paused time exists

**US7.1.1-06: Projected final cost: $47.32 (within estimate)**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Projected Final Cost Text, Confidence Indicator ("±15%"), Completion Estimate ("Est. final in 8h 15m")
- States: Default, Updating
- Notes: Calculated based on remaining steps and current rate

**US7.1.1-07: Update frequency: Every 60 seconds**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Entire Cost Tracker Card, Last Updated Timestamp
- States: Updating (shows spinner), Updated (shows timestamp)
- Notes: Polling every 60s or WebSocket push, shows "Updated 23 seconds ago"

**US7.1.1-08: Visual indicators - Green: Current spend <80% of estimate**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Card Border (2px green), Progress Ring (green fill), Status Icon (✓ checkmark), Status Message ("On track")
- States: Green Zone (<80%)
- Notes: Multiple visual cues (not color-only) for accessibility

**US7.1.1-09: Visual indicators - Yellow: Current spend 80-100% of estimate**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Card Border (2px yellow/orange), Progress Ring (yellow fill), Status Icon (⚠️ warning), Status Message ("Approaching estimate"), Dismissable Alert Banner
- States: Yellow Zone (80-100%)
- Notes: Alert banner dismissable, warning icon pulsing

**US7.1.1-10: Visual indicators - Red: Current spend >100% of estimate**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Card Border (3px red, thicker), Progress Ring (red fill), Status Icon (🚨), Status Message ("Over budget"), Persistent Alert Banner
- States: Red Zone (>100%)
- Notes: Alert banner persistent (cannot dismiss), urgent styling

**US7.1.1-11: Warning at 80%: "Job approaching cost estimate ($36 of $45). Monitor closely."**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Yellow Alert Banner (dismissable), Warning Message Text, Dismiss Button (X)
- States: Visible (when 80% reached), Dismissed
- Notes: Triggers when current_cost >= (estimated_cost_min × 0.8)

**US7.1.1-12: Warning at 100%: "Job exceeded cost estimate ($46 of $45). Consider cancelling."**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Orange Alert Banner (persistent), Warning Message Text
- States: Visible (when 100% reached)
- Notes: Cannot be dismissed, triggers when current_cost >= estimated_cost_max

**US7.1.1-13: Warning at 120%: "Job significantly over budget ($54 of $45). Review immediately."**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Red Alert Banner (persistent), Urgent Warning Message Text
- States: Visible (when 120% reached)
- Notes: Most urgent styling, triggers when current_cost >= (estimated_cost_max × 1.2)

**US7.1.1-14: "Cancel Job" button readily accessible**
- Source: US
- Screen: Training Job Dashboard - Active Job View
- Components: Cancel Job Button (destructive styling, red outline), Cancel Modal (overlay)
- States: Default, Hover, Disabled (if job not active), Confirming (modal open)
- Notes: Always visible in card, click opens simplified confirmation modal

**US7.1.1-15: Cost breakdown - GPU compute: $21.00 (8.4 hrs @ $2.49/hr)**
- Source: US
- Screen: Training Job Dashboard - Cost Breakdown Expanded View
- Components: Cost Breakdown Expandable Section, GPU Compute Line Items (Active training, Model loading, Preprocessing), GPU Total
- States: Collapsed (link only), Expanded (full breakdown)
- Notes: "View Cost Breakdown" link expands section inline

**US7.1.1-16: Cost breakdown - Spot interruption overhead: $1.18 (2 interruptions)**
- Source: US
- Screen: Training Job Dashboard - Cost Breakdown Expanded View
- Components: Spot Interruption Overhead Section, Interruption List ("Interruption #1: 8 min recovery"), Interruption Total
- States: Expanded
- Notes: Lists each interruption individually with recovery time and cost

**US7.1.1-17: Cost breakdown - Storage (checkpoints): $0.00 (included)**
- Source: US
- Screen: Training Job Dashboard - Cost Breakdown Expanded View
- Components: Storage Costs Section, Checkpoint Storage Line, Artifact Storage Line, Storage Total
- States: Expanded
- Notes: Shows $0.00 with explanation "included in base pricing"

**US7.1.1-18: Cost breakdown - Total: $22.18**
- Source: US
- Screen: Training Job Dashboard - Cost Breakdown Expanded View
- Components: Grand Total Line (bold), Calculation Summary
- States: Expanded
- Notes: Matches "Current Spend" display exactly, sum of all components

**FR7.1.1-01: Card Header with icon and timestamp**
- Source: FR (Functional Requirements Acceptance Criteria)
- Screen: Training Job Dashboard - Active Job View
- Components: Card Header ("Cost Tracking"), 💰 Icon, Last Updated Timestamp ("Updated 23 seconds ago"), Refresh Spinner
- States: Default, Refreshing (spinner visible)
- Notes: Header always visible, timestamp shows relative time

**FR7.1.1-02: Comparison indicator: "↓ $2.82 below estimate"**
- Source: FR
- Screen: Training Job Dashboard - Active Job View
- Components: Variance Indicator Text with Up/Down Arrow
- States: Below Estimate (green with ↓), Above Estimate (red with ↑)
- Notes: Shows dollar difference from estimate midpoint

**FR7.1.1-03: Comparison to on-demand: "vs $7.99/hr on-demand (saving $5.50/hr)"**
- Source: FR
- Screen: Training Job Dashboard - Active Job View
- Components: On-Demand Comparison Text (if using spot), Savings Amount (green highlight)
- States: Visible (if spot), Hidden (if on-demand)
- Notes: Only shown when using spot instances

**FR7.1.1-04: Savings vs On-Demand section**
- Source: FR
- Screen: Training Job Dashboard - Cost Breakdown Expanded View
- Components: Savings Section, On-Demand Equivalent Cost, Your Savings Amount (green highlight)
- States: Expanded (spot users), Expanded (on-demand users show premium paid)
- Notes: If spot: shows savings, If on-demand: shows reliability premium note

**FR7.1.1-05: Historical Cost Tracking mini-chart**
- Source: FR
- Screen: Training Job Dashboard - Active Job View (within Cost Tracker Card)
- Components: Mini Line Chart (X-axis: Time, Y-axis: Cost), Cost Accumulation Curve
- States: Default (shows cost history), Loading (skeleton)
- Notes: Small chart showing cost over time, should be roughly linear

**FR7.1.1-06: Mobile Responsive - Desktop (>768px)**
- Source: FR
- Screen: Training Job Dashboard - Active Job View (Desktop)
- Components: Full Cost Tracker Card (all details visible)
- States: Desktop Layout
- Notes: 350px × 280px card, sticky positioning, breakdown collapsed by default

**FR7.1.1-07: Mobile Responsive - Tablet (768-1023px)**
- Source: FR
- Screen: Training Job Dashboard - Active Job View (Tablet)
- Components: Slightly Condensed Cost Tracker Card, Breakdown Collapsed by Default
- States: Tablet Layout
- Notes: Condensed spacing, breakdown must be expanded manually

**FR7.1.1-08: Mobile Responsive - Mobile (<768px)**
- Source: FR
- Screen: Training Job Dashboard - Active Job View (Mobile)
- Components: Simplified Cost View (current cost large, estimate comparison, elapsed time), "View Details" Expands Full Breakdown, Cancel Button Prominent
- States: Mobile Layout
- Notes: Minimal initial view, expand to see all details

**FR7.1.1-09: Skeleton loading state**
- Source: FR
- Screen: Training Job Dashboard - Active Job View
- Components: Cost Tracker Card Skeleton (shimmer effect on all text and chart areas)
- States: Loading (initial page load)
- Notes: Never blocks interaction, shows loading placeholders

**FR7.1.1-10: Cancellation modal**
- Source: FR
- Screen: Cancel Training Modal
- Components: Modal Overlay, Modal Content ("Cancel Training?"), Job Name Display, Current Cost Display, Cancel Button (destructive), Continue Training Button (primary)
- States: Open, Submitting (spinner on Cancel button), Closed
- Notes: Simplified modal for quick action, no extensive form

Non-UI Acceptance Criteria

**US7.1.1-19: Cost calculation: (elapsed_time_hours × gpu_hourly_rate) + spot_interruption_overhead**
- Impact: Backend calculation determines displayed costs
- UI Hint: Ensure cost display matches backend calculation exactly, show breakdown to user

**US7.1.1-20: Update frequency implementation: Polling or WebSocket**
- Impact: Technical implementation choice
- UI Hint: Loading states during fetch, never block user interaction

**FR7.1.1-11: Cost Calculation Engine (server-side logic)**
- Impact: Complex backend calculation for elapsed GPU time, interruption overhead, storage costs
- UI Hint: Display calculated results, show confidence intervals for estimates

**FR7.1.1-12: Update Frequency (polling every 60s or WebSocket push)**
- Impact: Network communication pattern
- UI Hint: Show connection status, "Updating..." indicator, reconnection logic

**FR7.1.1-13: Performance Optimization (server-side calculation, 60s cache)**
- Impact: Backend optimization to reduce server load
- UI Hint: Minimal payload, optimized queries, client-side timer for elapsed time

**FR7.1.1-14: Accessibility - Screen reader announcements**
- Impact: Screen readers must announce cost changes appropriately
- UI Hint: Use ARIA live regions for cost updates, don't spam with every second of timer

**FR7.1.1-15: Cost snapshot storage (every 5 minutes for history)**
- Impact: Database storage of cost history for chart
- UI Hint: Historical chart displays stored snapshots

Estimated Page Count
- 3 pages/states required to satisfy all UI-relevant criteria
- Page 1: Training Job Dashboard with Cost Tracker Card in green zone (default state)
- Page 2: Training Job Dashboard with Cost Tracker Card in red zone with breakdown expanded (over budget state)
- Page 3: Cancel Training Modal overlay (confirmation state)
- Rationale: Minimum 3 pages cover primary monitoring flow, breakdown exploration, and cancellation confirmation. Additional states (yellow zone, loading, mobile views) can be shown as variants on these base pages.

=== END PROMPT FR: FR7.1.1 ===


=== BEGIN PROMPT FR: FR7.1.2 ===

Title
- FR FR7.1.2 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements intelligent cost and time projection for active training jobs, calculating remaining duration based on actual training speed, projecting final costs with confidence intervals, and providing scenario analysis (best/expected/worst case). Engineers need to understand whether their job will complete within budget and make informed decisions about continuing or cancelling based on projections. The interface displays projection algorithms transparently, tracks historical accuracy, and offers decision support recommendations when projections exceed budget thresholds.

Journey Integration
- Stage 7 user goals: Understand completion timeline, forecast final costs before overspending, make data-driven continuation decisions, plan resource allocation
- Key emotions: Confidence through predictive visibility, anxiety reduction through scenario planning, trust through historical accuracy transparency
- Progressive disclosure levels:
  * Basic: Projected final cost and completion time
  * Advanced: Best/expected/worst case scenario analysis with probabilities
  * Expert: Projection methodology explanation, sensitivity analysis, historical accuracy metrics
- Persona adaptations: Unified interface serving AI engineers (operational decisions) and budget managers (financial planning)

### Journey-Informed Design Elements
- User Goals: Cost forecasting, Timeline prediction, Risk assessment, Informed decision-making
- Emotional Requirements: Confidence in projections, Understanding of uncertainty, Trust in accuracy, Empowerment through scenarios
- Progressive Disclosure:
  * Basic: Simple projection display with single expected value
  * Advanced: Three scenarios with probability indicators and assumptions
  * Expert: Projection methodology, sensitivity analysis, historical accuracy tracking
- Success Indicators: Projections within ±15% accuracy, Clear scenario differentiation, Actionable decision support recommendations
  
Wireframe Goals
- Display intelligent cost and time projections based on actual training progress
- Show three scenario projections (best/expected/worst case) with probabilities
- Provide decision support recommendations when projections exceed thresholds
- Explain projection methodology transparently to build trust
- Track and display historical projection accuracy
- Integrate with budget alerts when projected costs exceed monthly limits

Explicit UI Requirements (from acceptance criteria)

**Projection Display Section (Main Card/Panel)**
- Positioned below Cost Tracker Card on job dashboard
- Section header: "Cost & Time Projections" with calculation methodology icon
- "At current rate, job will complete in 8.2 hours" - large, prominent
- "Projected final cost: $47.32 (±15% variance)" - bold with confidence band
- "Expected completion: Today at 11:45 PM" - formatted based on proximity

**Projection Algorithm Display (Time Remaining)**
- Current progress indicators: "Step 850 of 2,000" (current_step / total_steps)
- Average speed calculation: "127 steps/hour" (derived from completed work)
- Remaining work display: "1,150 steps remaining"
- Time estimate: "9.1 hours estimated" (remaining_steps × avg_time_per_step)
- Overhead addition: "+ 15 min finalization" for model saving and validation
- Total remaining: "8.2 hours" formatted as "8h 12m" or "1d 3h" based on duration

**Projection Algorithm Display (Final Cost)**
- Current spend reference: "$22.18" (from FR7.1.1 Cost Tracker)
- Remaining cost calculation breakdown:
  - GPU cost remaining: "$20.42" (8.2 hrs × $2.49/hr)
  - Interruption buffer (if spot): "$1.02" (5% overhead assumption)
  - Total remaining: "$21.44"
- Projected final: "$43.62" (current + remaining)
- Confidence interval: "$37-50" (±15% band)

**Expected Completion Time Display**
- Calculated completion timestamp with timezone: "Today at 11:45 PM PST"
- Proximity-based formatting:
  - <12 hours: "Today at 11:45 PM"
  - 12-36 hours: "Tomorrow at 2:15 PM"
  - >36 hours: "Thursday, Dec 19 at 9:30 AM"
- Relative time: "in 8 hours 15 minutes"
- Updates every 60 seconds with cost updates

**Scenario Analysis Display (Three Scenarios)**
- Card section header: "Projection Scenarios" with info icon
- Three columns or rows showing:

**Best Case Scenario (20% probability)**
- Badge: "Best Case" with green indicator, "20% probability"
- Assumptions listed:
  - "Training accelerates in later epochs"
  - "Fewer validation runs than expected"
  - "No spot interruptions" (if spot) or "1 interruption max"
- Time: "7.1 hours" with "13% faster" label
- Cost: "$42.50" with "10% cheaper" label
- Completion: "Today at 10:30 PM"
- Visual: Left position in horizontal bar range

**Expected Case Scenario (60% probability)**
- Badge: "Expected Case" with blue indicator, "60% probability" (default/baseline)
- Assumptions listed:
  - "Current rate continues"
  - "Typical spot interruption rate" (1-2 interruptions)
  - "Standard validation frequency"
- Time: "8.2 hours" (baseline, no modifier)
- Cost: "$47.32" (baseline, no modifier)
- Completion: "Today at 11:45 PM"
- Visual: Center marker position in range

**Worst Case Scenario (20% probability)**
- Badge: "Worst Case" with orange indicator, "20% probability"
- Assumptions listed:
  - "Training slows down (loss plateau)"
  - "Higher spot interruption rate" (3-4 interruptions)
  - "Additional validation runs"
- Time: "9.8 hours" with "20% slower" label
- Cost: "$55.20" with "17% more expensive" label
- Completion: "Tomorrow at 1:15 AM"
- Visual: Right position in horizontal bar range

**Scenario Visual Representation**
- Horizontal bar chart showing range from best to worst case
- Bar segments colored: Green (best) → Blue (expected) → Orange (worst)
- Marker indicating expected case position (60% probability)
- Cost range axis: $42.50 (left) to $55.20 (right)
- Time range axis: 7.1 hrs (left) to 9.8 hrs (right)

**Decision Support Recommendations (Context-Aware)**
- Algorithm evaluates projected_final vs estimated_max:

**Significantly Over Budget (projected > estimate × 1.2)**
- Alert badge: ⚠️ "Projected cost significantly exceeds estimate"
- Message: "Projected cost ($55) significantly exceeds estimate ($45-55)"
- Recommendations section:
  - "Consider: Cancelling this job and retrying with more efficient configuration (Conservative preset, smaller batch size)"
  - "Switching to on-demand GPU if cost overrun due to spot interruptions"
  - "Accepting higher cost if job critical and near completion (>70% done)"
- Action buttons: ["Cancel Job"] ["Continue Anyway"] ["View Cost History"]

**Slightly Over Budget (projected > estimate_max)**
- Alert badge: ⚠ "Projected cost slightly over estimate"
- Message: "Projected cost ($52) slightly over estimate ($45-55, +$2)"
- Note: "Monitor closely. Acceptable variance given training uncertainty."
- Action buttons: ["Continue Monitoring"]

**On Track (projected within estimate)**
- Success badge: ✓ "On track"
- Message: "Projected cost ($47) within estimate range ($45-55)"
- No action buttons needed

**Historical Accuracy Tracking Section**
- Expandable section: "Projection Accuracy" with info icon
- Display: "Projections typically ±12% accurate based on 47 completed jobs"
- Breakdown by configuration:
  - Conservative preset: ±8% (more predictable)
  - Balanced preset: ±12%
  - Aggressive preset: ±18% (higher variance)
- Breakdown by GPU type:
  - Spot: ±15% (interruption variability)
  - On-demand: ±9% (more predictable)

**Visual Projection Timeline**
- Horizontal timeline visualization:
  - Past section (gray): Elapsed time with epoch milestones
  - Present marker: "Now" indicator showing current position
  - Future section (blue): Projected remaining time to completion
  - Confidence band (light blue shading): ±15% variance range
- Interactive elements:
  - Hover shows details at each epoch marker
  - Click epoch shows per-epoch cost breakdown
  - Zoom controls to 
focus on specific time ranges

**Cost Trajectory Chart**
- Line graph showing cost accumulation over time:
  - X-axis: Time (hours into training, 0-20 hours)
  - Y-axis: Cost ($0-$60 range)
  - Historical line (solid blue): Actual cost so far
  - Projected line (dashed blue): Expected cost trajectory
  - Confidence band (light blue shaded area): ±15% variance
  - Original estimate line (horizontal dashed red): Shows $45-55 range
  - Alert zone shading (red): Area where projection exceeds estimate
- Chart updates every 60 seconds with new actual datapoint
- Smooth animations (no jarring jumps)

**Projection Sensitivity Analysis (Expandable)**
- "What if?" section showing projection changes:
  - "If training accelerates by 10%: $43 final cost (↓ $4)"
  - "If one more spot interruption: $49 final cost (↑ $2)"
  - "If validation takes 30 min longer: $51 final cost (↑ $4)"
- Helps understand projection volatility
- Builds confidence in expected case realism

**Export Projection Data**
- "Export Projections" button (small, secondary button style)
- Generates CSV download

**Integration with Budget Alerts**
- Warning banner if projected cost exceeds monthly remaining budget

**Projection Explanation Section**
- "Why this projection?" expandable panel with simple methodology explanation

Page Plan
1. **Training Job Dashboard - Projection Default View** (expected case, on-track)
2. **Training Job Dashboard - Projection Scenarios Expanded** (all three scenarios visible)
3. **Training Job Dashboard - Projection Over Budget Warning** (decision support)
4. **Training Job Dashboard - Projection Methodology Expanded** (transparency)

=== END PROMPT FR: FR7.1.2 ===


=== BEGIN PROMPT FR: FR7.2.1 ===

Title
- FR FR7.2.1 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements a comprehensive monthly budget dashboard at /dashboard/training-budget showing spending summaries, job breakdowns, trend graphs, forecast analysis, and budget controls. Budget managers need visibility into monthly consumption, remaining budgets, per-job costs, and projection forecasts to prevent overages and plan capacity. The interface provides summary cards, spending trend visualizations, per-job tables, budget controls, and historical comparisons.

Journey Integration
- Stage 7 user goals: Monitor monthly budget status, track spending trends, manage budget limits, forecast month-end spending, prevent budget overages
- Key emotions: Control through visibility, confidence through forecasting, anxiety reduction through proactive alerts
- Progressive disclosure: Basic (summary cards) → Advanced (trend graphs, forecasts) → Expert (historical analysis, optimization tips)

Wireframe Goals
- Display comprehensive monthly budget status with spending, remaining, job counts, averages
- Show spending trend graph with budget limit line and projection forecast
- Provide per-job breakdown table sorted by cost with filters
- Enable budget control configuration (limits, periods, alerts, job blocking)
- Compare historical spending across 6 months with trend analysis

Explicit UI Requirements

**Page Access & Navigation**
- Accessible at /dashboard/training-budget
- Prominent link in main dashboard sidebar: 💰 Budget
- Page loads within 2 seconds

**Summary Cards Row (4 cards across top)**
- Card 1: Monthly Spending - "$487.32 / $500.00 (97% used)" with progress bar
- Card 2: Remaining Budget - "$12.68" (red if negative, yellow if <20%, green otherwise)
- Card 3: Jobs This Month - "12" with breakdown "10 completed, 2 active"
- Card 4: Average Cost per Job - "$40.61" with trend vs last month

**Spending Trend Graph (main visualization)**
- Line chart: X-axis days of month, Y-axis cumulative cost
- Primary line: Actual spending (solid blue) with datapoints
- Budget limit line: Horizontal dashed red at $500
- Projected spending line: Dotted gray extrapolating to month-end
- Alert zone shading: Red above limit, yellow 80-100%, green below 80%
- Interactive: Hover tooltips, click datapoint shows day's jobs

**Per-Job Breakdown Table**
- Columns: Job Name | Status | Cost | % of Budget | Created By | Date | Actions
- Default sort: Cost descending
- Color-coded costs: >$100 red, $50-100 yellow, <$50 green
- Pagination: 25 jobs per page
- Search and filter: By status, date range, creator, cost range

**Budget vs Forecast Panel**
- Current Status: "Current Spend: $487.32", "Budget Used: 97%"
- Active Jobs Impact: "2 jobs in progress", "Estimated Remaining: $42-58"
- Month-End Forecast: "Forecasted: $529-545", "Projected to exceed by $29-45" (warning)
- Recommendations: Action items if over budget

**Budget Controls Section (expandable)**
- Set Monthly Budget Limit: Input field, min $50, max $10,000, requires confirmation
- Budget Period Type: Radio buttons (Calendar Month / Rolling 30 Days)
- Budget Alert Thresholds: Checkboxes at 80%, 95%, 100%, 110%
- Job Blocking Settings: Toggle to block new jobs when budget exceeded

**Historical Comparison Section**
- 6-Month Trend Bar Chart: Bars for each month with spending amount
- Trend Analysis: Text summary of spending patterns
- Growth Projections: Next month forecast based on trend
- Export Historical Data: CSV download button

Page Plan
1. **Monthly Budget Dashboard - Default View** (summary cards, trend graph, job table)
2. **Monthly Budget Dashboard - Over Budget State** (red warnings, forecast alerts, recommendations)
3. **Monthly Budget Dashboard - Controls Expanded** (budget settings configuration)

=== END PROMPT FR: FR7.2.1 ===


=== BEGIN PROMPT FR: FR7.2.2 ===

Title
- FR FR7.2.2 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements comprehensive budget alert system with threshold-based triggers (80%, 95%, 100%), multi-channel delivery (email, Slack, in-app), escalating severity, and budget increase workflows. Budget managers need proactive notifications when approaching or exceeding limits to prevent surprise overages and enable rapid budget adjustments. The interface handles alert configuration, budget increase requests with approval workflows, and complete audit logging.

Journey Integration
- Stage 7 user goals: Receive proactive budget alerts, quickly increase budgets when needed, maintain budget oversight, prevent surprise overages
- Key emotions: Confidence through early warnings, control through rapid adjustment capability, trust through transparent audit trails
- Progressive disclosure: Basic (alert notifications) → Advanced (multi-channel alerts, workflows) → Expert (alert configuration, audit logs)

Wireframe Goals
- Display clear, actionable budget alerts at 80%, 95%, 100% thresholds
- Enable quick budget increase workflows with justification and approval
- Show multi-channel alert delivery (email, Slack, in-app banners)
- Provide alert configuration interface for threshold and recipient management
- Track complete audit log of all budget changes

Explicit UI Requirements

**In-App Banner Notifications (critical)**
- Persistent banner across top of dashboard
- Color coding: Yellow (80%), Orange (95%), Red (100%)
- 80% Alert: "⚠️ You've used 80% of monthly budget ($400 of $500)"
- 95% Alert: "⚠️ You've used 95% of monthly budget ($475 of $500)" with action buttons
- 100% Alert: "🚨 Monthly budget exceeded ($505 of $500). Immediate action required."
- Expandable: Click banner shows full details and options

**Email Alert Templates (sent to stakeholders)**
- Professional HTML with company branding
- Summary section: Budget status bar, key metrics, alert reason
- Detailed analysis: Active jobs list, spending trend mini-chart
- Action buttons: [Increase Budget Limit] [Cancel Active Jobs] [View Dashboard]
- Footer: Notification preferences link, support contact

**Slack Alert Integration**
- Slack app with channel selection
- 80%: Simple message, no @ mentions
- 95%: Message with @budgetmanager mention
- 100%: @channel mention in #training-budget
- Interactive buttons for quick actions
- Thread with detailed breakdown

**Budget Increase Workflow Modal**
- Triggered by "Increase Budget Limit" button
- Form fields:
  - Current limit: "$500" (display only)
  - New limit: Input field (min = current_spend, suggested = current × 1.2)
  - Justification: Textarea (required, min 50 characters)
  - Approval required: Auto-checked if >20% increase or >$1000
  - Approver: Dropdown (select manager if approval needed)
- Submit creates request or applies immediately based on permissions
- Confirmation notification: "Budget limit increased to $X"

**Budget Override Audit Log Page**
- Table at /dashboard/budget/audit-log
- Columns: Date | Changed By | Old Limit | New Limit | Change % | Justification | Approver
- Sort by date (newest first)
- Filter: By user, date range, approval status
- Export CSV for finance/compliance

**Alert Configuration Page**
- Settings at /dashboard/settings/budget-notifications
- Per-threshold recipient configuration:
  - "80% Alert Recipients: [email@] [Add Recipient]"
  - "95% Alert Recipients: [email1@] [email2@] [team-lead@]"
  - "100% Alert Recipients: [all-stakeholders@] [finance@]"
- Notification methods per recipient: Email, Slack, SMS (enterprise)
- Channel preferences and quiet hours configuration

Page Plan
1. **Dashboard with 80% Budget Alert Banner** (dismissable warning)
2. **Dashboard with 100% Critical Budget Alert Banner** (persistent, with budget increase workflow)
3. **Budget Increase Request Modal** (form with justification and approval)
4. **Budget Override Audit Log Page** (complete change history)

=== END PROMPT FR: FR7.2.2 ===


=== BEGIN PROMPT FR: FR7.3.1 ===

Title
- FR FR7.3.1 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements spot vs on-demand cost analysis reporting total savings, equivalent costs, per-job comparisons, interruption impact analysis, and ROI projections. Budget managers and technical leads need to demonstrate cost efficiency, justify infrastructure investments, and guide GPU selection strategy. The interface shows comprehensive savings metrics, per-job breakdowns, interruption analysis, strategic recommendations, and exportable reports.

Journey Integration
- Stage 7 user goals: Demonstrate cost efficiency, justify spot instance strategy, calculate ROI, guide GPU selection decisions
- Key emotions: Pride in cost savings, confidence in strategy, validation of infrastructure decisions
- Progressive disclosure: Basic (total savings) → Advanced (per-job analysis, interruption impact) → Expert (ROI projections, strategic recommendations)

Wireframe Goals
- Display total spot instance savings with equivalent on-demand costs
- Show per-job cost comparison table with interruptions and savings
- Analyze interruption impact on overall savings
- Calculate ROI and annualized projections
- Provide strategic recommendations for GPU selection
- Export professional PDF reports

Explicit UI Requirements

**Cost Optimization Report Section (on budget dashboard)**
- Section header: "💰 Cost Optimization: Spot vs On-Demand"
- Expandable panel (collapsed by default)
- Date range filter: Current month, Last 30/90 days, All time

**Spot Instance Savings Summary Card**
- Total Spot Cost: "$387.32" (12 spot jobs)
- Equivalent On-Demand Cost: "$1,243.18" (hypothetical if all on-demand)
- Total Savings: "$855.86" huge, bold, green with "69% cheaper"
- Visual: Horizontal stacked bar chart (spot blue $387, savings green $855)

**Per-Job Cost Comparison Table**
- Columns: Job Name | GPU Type | Actual Cost | On-Demand Equivalent | Savings | Interruptions | Status
- Example rows showing spot vs on-demand jobs with savings percentages
- Sort by savings descending (highest savings first)
- Highlight: 0 interruptions (green), >3 interruptions (yellow)
- Filter: Show spot only / on-demand only / all

**Interruption Impact Analysis Section**
- Total Interruptions: "23 interruptions across 12 spot jobs"
- Average: "1.9 interruptions per job"
- Distribution Histogram: X-axis interruption count, Y-axis job count
- Recovery Overhead Cost: "$28.42" (interruption time × rate)
- Net Savings After Overhead: "$827.44" (still 67% cheaper)
- Success metric: "75% of spot jobs had ≤2 interruptions (acceptable)"

**ROI Calculation & Projection Panel**
- Monthly Savings: "$855.86 saved this month"
- Annualized Projection: "$10,270" (monthly × 12)
- ROI Narrative: "Your spot strategy saves $10k+ annually vs on-demand-only"
- Cumulative Savings Chart: Line showing savings accumulation over time

**Strategic Recommendations Section**
- Current Strategy Summary: "Your mix: 85% spot, 15% on-demand"
- Context-aware recommendations:
  - If spot <80%: "💡 Increase spot usage to 95% for additional $X savings"
  - If spot 80-95%: "✓ Current strategy optimal. Continue using spot for 90%+ of jobs"
  - If interruption rate >30%: "⚠️ High interruption rate. Consider off-peak scheduling"

**Export Cost Optimization Report**
- "Export Report" button generates PDF
- Professional formatted report with charts, tables, ROI analysis
- Use case: Board presentations, finance reporting, budget justification

Page Plan
1. **Budget Dashboard - Cost Optimization Section Expanded** (savings summary, per-job table)
2. **Cost Optimization - Interruption Analysis View** (detailed interruption breakdown and impact)
3. **Cost Optimization - ROI & Recommendations View** (projections and strategic guidance)

=== END PROMPT FR: FR7.3.1 ===


=== BEGIN PROMPT FR: FR7.3.2 ===

Title
- FR FR7.3.2 Wireframes — Stage 7 — Cost Management & Budget Control

Context Summary
- This FR implements cost attribution enabling client and project tagging, attribution reports, profitability calculations, pricing insights, and budget allocation by priority. Business owners and budget managers need to track costs per client/project for accurate billing, profitability analysis, and strategic pricing decisions. The interface provides tagging during job creation, attribution reports (by client/project), profitability dashboards, and export capabilities.

Journey Integration
- Stage 7 user goals: Track costs by client/project, calculate project profitability, justify pricing, allocate budgets by priority, export for accounting
- Key emotions: Confidence in profitability data, control through attribution, clarity for strategic pricing
- Progressive disclosure: Basic (client/project tags) → Advanced (attribution reports, profitability) → Expert (pricing insights, budget allocation)

Wireframe Goals
- Enable client and project tagging during training job creation
- Display cost attribution reports by client and by project
- Calculate and show project profitability with revenue, costs, margins
- Provide pricing insights with cost-to-revenue ratios
- Support budget allocation by client priority tiers
- Export attribution data for accounting systems

Explicit UI Requirements

**Client/Project Tagging (Job Creation Form)**
- Optional section: "Cost Attribution"
- Client Assignment dropdown: Existing clients OR "➕ Create New Client"
  - If new: Inline form (name, client code, industry, priority tier)
- Project Assignment dropdown: Filtered by selected client OR "➕ Create New Project"
  - If new: Inline form (name, client, project code, dates, projected revenue)
- Metadata displayed on job details: "Client: Acme Financial", "Project: Q1 2025 AI Enhancement"

**Cost Attribution Report Page (/dashboard/cost-attribution)**
- Dual view tabs: "By Client" | "By Project"
- Date range filter: Last 30 days, Last 90 days, All time, Custom
- Export button: "Export Attribution Report" (CSV/PDF)

**By Client View**
- Table columns: Client Name | Industry | Jobs | Total Cost | Avg Cost/Job | Date Range | Actions
- Example: "Acme Financial | Financial Services | 5 jobs | $287.32 | $57.46 | Jan-Mar 2025"
- Sort by total cost descending
- Summary row: "Total: 28 jobs, $1,229.16 across 4 clients"
- Click row expands to show all jobs for that client

**By Project View**
- Table: Project Name | Client | Status | Jobs | Total Cost | Revenue | Profit | Margin % | Date Range
- Example: "Q1 2025 AI Enhancement | Acme Financial | Completed | 5 | $287.32 | $25,000 | $22,712.68 | 91%"
- Sort by margin % descending (most profitable first)
- Color-coded margins: >70% green, 40-70% yellow, <40% red

**Project Profitability Calculation Display**
- Training Cost: Auto-calculated sum of job costs
- Other Costs: User input (labor, infrastructure, third-party)
- Revenue: User input (contract value)
- Profit: revenue - training_cost - other_costs
- Margin %: (profit / revenue) × 100
- Large display: "Profit: $22,712.68 (91% margin)" with color indicator

**Pricing Insights Dashboard Section**
- Average Training Cost: "$52.18" (mean across clients)
- Cost-to-Revenue Ratios: "Typical: $287 training → $25k revenue = 87× multiplier"
- Recommended Pricing Bands:
  - If training_cost <$50: "Recommended: $10k-20k"
  - If $50-150: "Recommended: $20k-40k"
  - If >$150: "Recommended: $40k-80k+"
- Current Margins: "Your projects: 87%, 91%, 94%, 99%", "Average: 92%"

**Budget Allocation by Client Priority**
- Priority Tiers: Priority A ($200/month), Priority B ($150/month), Priority C ($100/month)
- Allocation Dashboard Table: Client | Priority | Allocated | Spent (MTD) | Remaining | Utilization %
- Allocation Alerts: "⚠️ Acme Financial at 92% of allocated budget ($184 of $200)"
- Monthly Rollover option: Carry unused budget to next month

**Client Detail Page (/dashboard/clients/{id})**
- Client profile: Name, industry, priority tier
- All jobs for this client with costs
- Total spend: "Total: $287.32 across 5 jobs", "Average per job: $57.46"
- Projects list with profitability
- Cost trend: Line chart showing cumulative cost over time
- Actions: "Create New Project", "Export Client Cost Report"

**Export Cost Attribution Data**
- CSV Export: Columns (Client, Project, Job, Cost, Date, Duration, GPU, Creator, Status)
- PDF Report: Executive summary, profitability table, charts (cost by client pie chart, margin by project bar chart)
- Use case: Import into accounting software (QuickBooks, Xero), financial reporting

Page Plan
1. **Cost Attribution Report - By Client View** (client table with totals and drill-down)
2. **Cost Attribution Report - By Project View** (project profitability table with margins)
3. **Client Detail Page** (comprehensive client cost overview with jobs and projects)
4. **Project Profitability Detail** (revenue, costs, profit calculation breakdown)

=== END PROMPT FR: FR7.3.2 ===
