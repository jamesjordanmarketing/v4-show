# LoRA Training Infrastructure - Complete Testing Tutorial

## Overview
This tutorial will guide you through testing **every feature** of the BrightRun LoRA Training Infrastructure application. You'll follow a complete training workflow from start to finish, testing all functionality across the five wireframes (P01-P05).

**Estimated Time:** 30-45 minutes  
**Technical Level:** No technical knowledge required  
**What You'll Do:** Create a trained LoRA model from a conversation dataset

---

## Tutorial Structure

This tutorial follows the natural workflow of training a LoRA model:

1. **P01 - Dashboard Shell** (Start here)
2. **P02 - Dataset Management** (Select your data)
3. **P03 - Training Configurator** (Configure training)
4. **P04 - Training Monitor** (Watch it train)
5. **P05 - Model Artifacts** (Get your trained model)

---

## Before You Start

### Prerequisites
- Application is running and accessible in your browser
- You have the application open in a browser window

### What to Expect
- All data you see is **mock data** (simulated for testing)
- No real training happens - everything is simulated
- You can safely click any button without breaking anything
- Some features show "Coming Soon" alerts - this is expected

---

# PART 1: Dashboard Shell & Global Navigation (P01)

## Section 1.1: Initial Dashboard View

### Test 1: View the Main Dashboard
**What to test:** The overall layout and shell

**Steps:**
1. Open the application homepage
2. Observe the main layout

**What you should see:**
- ✅ Left sidebar with navigation menu
- ✅ Top header bar
- ✅ Main content area showing dashboard
- ✅ "BrightRun LoRA Training" logo in the top-left

**Success:** You can see all four main areas of the interface

---

## Section 1.2: Sidebar Navigation

### Test 2: Navigate Through All Menu Items
**What to test:** All navigation links work

**Steps:**
1. Look at the left sidebar
2. Click each navigation item one by one:
   - 📊 **Dashboard** (Overview icon)
   - 📁 **Datasets** (Database icon)
   - ⚙️ **Training Jobs** (Settings icon)
   - 🤖 **Models** (Package icon)

**What you should see:**
- ✅ Each click changes the main content area
- ✅ The clicked item highlights in blue
- ✅ Previous item unhighlights
- ✅ Content area updates to show relevant information

**Success:** All four navigation items are clickable and show different content

---

### Test 3: View Active Training Indicator
**What to test:** Header shows active training jobs

**Steps:**
1. Look at the top header bar (right side)
2. Find the "Active Training" indicator

**What you should see:**
- ✅ Orange/amber badge showing "2 Active"
- ✅ Clicking it shows a dropdown with active jobs
- ✅ Each job shows:
  - Job name
  - Progress percentage
  - Current stage
  - "View" button

**Success:** You can see active training jobs and click "View" on any job

---

## Section 1.3: Header Features

### Test 4: View Cost Tracker
**What to test:** Current spending display

**Steps:**
1. Look at the top header bar
2. Find the cost display (dollar sign icon)

**What you should see:**
- ✅ Current spending amount (e.g., "$127.45")
- ✅ Green/yellow/red color based on spending level
- ✅ Clicking opens a dropdown showing:
  - This month's spending
  - Cost breakdown
  - Budget alerts (if any)

**Success:** Cost tracker displays and dropdown opens

---

### Test 5: View Notifications
**What to test:** Notification bell and alerts

**Steps:**
1. Look at the top header bar (right side)
2. Click the bell icon (🔔)

**What you should see:**
- ✅ Red badge showing number of unread notifications
- ✅ Dropdown panel opens showing:
  - Training completions
  - Cost warnings
  - System alerts
- ✅ Each notification has a timestamp
- ✅ "Mark all as read" button at bottom

**Success:** Notification panel opens and shows alerts

---

### Test 6: User Profile Menu
**What to test:** User account access

**Steps:**
1. Look at the top-right corner
2. Click the user avatar/initials (e.g., "JD")

**What you should see:**
- ✅ Dropdown menu opens showing:
  - User name and email
  - "Profile" option
  - "Settings" option
  - "Sign Out" option
- ✅ Each option is clickable (may show "Coming Soon" for some)

**Success:** User menu opens with all options

---

## Section 1.4: Breadcrumb Navigation

### Test 7: View and Use Breadcrumbs
**What to test:** Breadcrumb trail for navigation

**Steps:**
1. Navigate to any sub-page (e.g., click "Datasets")
2. Look at the top of the main content area
3. Observe the breadcrumb trail (e.g., "Home > Datasets")

**What you should see:**
- ✅ Breadcrumb path showing current location
- ✅ Each breadcrumb item is clickable
- ✅ Clicking "Home" returns to dashboard

**Success:** Breadcrumbs show your location and allow navigation

---

# PART 2: Dataset Management View (P02)

## Section 2.1: Viewing Datasets

### Test 8: Access Dataset Management
**What to test:** Navigate to datasets view

**Steps:**
1. Click "Datasets" in the left sidebar
2. Wait for the page to load

**What you should see:**
- ✅ Page title: "Dataset Management"
- ✅ Grid of dataset cards (3-4 cards visible)
- ✅ "Upload Dataset" button in top-right
- ✅ Breadcrumb: "Home > Datasets"

**Success:** Dataset management page loads with multiple dataset cards

---

### Test 9: Examine Dataset Cards
**What to test:** Dataset card information display

**Steps:**
1. Look at the first dataset card (should be "Healthcare Consultant Conversations")
2. Examine all information displayed

**What you should see on each card:**
- ✅ Dataset name as title
- ✅ Consultant name and title (e.g., "Elena Morales, CFP")
- ✅ Creation date
- ✅ Number of training pairs (e.g., "1,567 pairs")
- ✅ Quality score (e.g., "92% Ready")
- ✅ Progress bars for:
  - Persona Coverage (87%)
  - Arc Coverage (92%)
- ✅ Status badge (e.g., "Ready", "Processing")
- ✅ "View Details" button
- ✅ "Start Training" button

**Success:** All dataset information is clearly visible

---

### Test 10: Filter and Search Datasets
**What to test:** Dataset filtering functionality

**Steps:**
1. Look for filter/search controls at the top
2. Try filtering by:
   - Status (Ready, Processing, Draft)
   - Vertical (Healthcare, Finance, Legal)
3. Try the search box (if present)

**What you should see:**
- ✅ Filter dropdown menus work
- ✅ Dataset cards update based on filters
- ✅ Card count changes with filters
- ✅ "Clear filters" option available

**Success:** Filtering changes which datasets are displayed

---

### Test 11: View Dataset Details (Modal)
**What to test:** Detailed dataset information

**Steps:**
1. Click "View Details" on the "Healthcare Consultant Conversations" dataset
2. Wait for modal/detail view to open

**What you should see:**
- ✅ Modal dialog opens overlaying the page
- ✅ Full dataset information:
  - Complete name
  - Consultant profile with photo/avatar
  - Total conversation pairs
  - Quality metrics
  - Scaffolding analysis details
- ✅ Sample conversation pairs (at least 2-3 examples)
- ✅ Each sample shows:
  - User message
  - Assistant response
  - Persona/Arc tags
- ✅ Quality indicators for each sample
- ✅ "Close" button (X or Cancel)
- ✅ "Start Training" button in modal

**Success:** Modal opens with complete dataset details and samples

---

### Test 12: View Scaffolding Analysis
**What to test:** Persona and Arc coverage analysis

**Steps:**
1. Inside the dataset details modal, find the "Scaffolding Analysis" section
2. Examine the coverage information

**What you should see:**
- ✅ Persona Coverage percentage (e.g., 87%)
- ✅ Arc Coverage percentage (e.g., 92%)
- ✅ Visual progress bars
- ✅ List or breakdown of covered personas:
  - Empathetic Advisor
  - Analytical Consultant
  - Supportive Guide
- ✅ List or breakdown of covered arcs:
  - Discovery
  - Problem-Solving
  - Decision-Making
  - Follow-up

**Success:** Scaffolding coverage shows what conversation patterns are included

---

### Test 13: Close Dataset Details Modal
**What to test:** Modal close functionality

**Steps:**
1. While viewing dataset details, click the "X" or "Close" button
2. Alternatively, click outside the modal (on the darkened background)

**What you should see:**
- ✅ Modal closes smoothly
- ✅ You return to the dataset grid view
- ✅ No data is lost

**Success:** Modal closes and returns to main view

---

## Section 2.2: Starting Training from Dataset

### Test 14: Initiate Training Job
**What to test:** Starting training from a dataset

**Steps:**
1. From the dataset grid, find "Healthcare Consultant Conversations"
2. Click the "Start Training" button on that card

**What you should see:**
- ✅ Page transitions to Training Configurator (P03)
- ✅ Dataset name is pre-filled
- ✅ Breadcrumb updates to: "Home > Datasets > Training Configuration"
- ✅ You're ready to configure training

**Success:** Clicking "Start Training" takes you to P03 configuration

---

# PART 3: Training Job Configurator (P03)

## Section 3.1: Initial Configuration View

### Test 15: View Training Configuration Page
**What to test:** Configuration page layout

**Steps:**
1. You should now be on the Training Configuration page (from previous test)
2. Examine the page layout

**What you should see:**
- ✅ Page title: "Configure Training Job"
- ✅ Selected dataset displayed prominently:
  - Dataset name
  - Number of pairs
  - Quality score
- ✅ Three main sections visible:
  - Preset Selection
  - Advanced Settings (collapsed)
  - Cost Estimation (right sidebar)
- ✅ "Start Training" button (primary, bottom-right)
- ✅ "Cancel" or "Back" button

**Success:** Configuration page loads with all sections visible

---

## Section 3.2: Preset Selection

### Test 16: View Training Presets
**What to test:** Three preset options

**Steps:**
1. Look at the "Select Training Preset" section
2. Examine all three preset cards

**What you should see (3 cards):**

**Conservative Preset:**
- ✅ Title: "Conservative"
- ✅ Description: "Safer, slower training"
- ✅ Estimated cost: "$25-35"
- ✅ Estimated time: "6-8 hours"
- ✅ Risk level: "Low"
- ✅ Radio button or select option

**Balanced Preset (Recommended):**
- ✅ Title: "Balanced"
- ✅ Badge: "Recommended"
- ✅ Description: "Good balance of speed and quality"
- ✅ Estimated cost: "$45-55"
- ✅ Estimated time: "8-12 hours"
- ✅ Risk level: "Medium"
- ✅ Radio button or select option (default selected)

**Aggressive Preset:**
- ✅ Title: "Aggressive"
- ✅ Description: "Fastest training, higher resource usage"
- ✅ Estimated cost: "$80-100"
- ✅ Estimated time: "4-6 hours"
- ✅ Risk level: "High"
- ✅ Radio button or select option

**Success:** All three presets are clearly visible with costs and times

---

### Test 17: Switch Between Presets
**What to test:** Preset selection updates estimates

**Steps:**
1. Click on "Conservative" preset
2. Watch the Cost Estimation sidebar (right side)
3. Click on "Aggressive" preset
4. Watch the Cost Estimation update again
5. Return to "Balanced" preset

**What you should see:**
- ✅ Clicking a preset highlights that card
- ✅ Cost Estimation sidebar updates immediately:
  - Estimated cost range changes
  - Estimated duration changes
  - GPU configuration may change
- ✅ Only one preset can be selected at a time

**Success:** Switching presets updates cost estimates in real-time

---

## Section 3.3: Advanced Settings

### Test 18: Expand Advanced Settings
**What to test:** Advanced configuration panel

**Steps:**
1. Find the "Advanced Settings" section (should be collapsed by default)
2. Click to expand it

**What you should see:**
- ✅ Panel expands smoothly
- ✅ Multiple hyperparameter controls appear:
  - **LoRA Rank (r):** Slider (8-64)
  - **LoRA Alpha (α):** Slider (16-128)
  - **Learning Rate:** Dropdown or input (1e-5 to 5e-4)
  - **Number of Epochs:** Slider (1-5)
  - **Batch Size:** Dropdown (2, 4, 8)
  - **Dropout:** Slider (0.0-0.2)
- ✅ Each control shows current value
- ✅ Help text or tooltips explain each parameter

**Success:** Advanced settings panel opens and shows all hyperparameters

---

### Test 19: Adjust Hyperparameters
**What to test:** Changing individual settings

**Steps:**
1. With Advanced Settings open, adjust the LoRA Rank slider
2. Change the Learning Rate
3. Adjust Number of Epochs

**What you should see:**
- ✅ Slider values update as you drag
- ✅ Current value displays next to slider
- ✅ Cost Estimation updates when you change values
- ✅ Warning appears if you use extreme values
- ✅ Visual feedback shows you're editing

**Success:** Hyperparameters are adjustable and update cost estimates

---

### Test 20: View Hyperparameter Tooltips
**What to test:** Help information for parameters

**Steps:**
1. Hover over or click the "?" or "info" icon next to "LoRA Rank"
2. Try the same for other parameters

**What you should see:**
- ✅ Tooltip or info popup appears
- ✅ Explanation of what the parameter does
- ✅ Recommended values
- ✅ Impact on training (e.g., "Higher = more capacity")

**Success:** Help tooltips explain each hyperparameter

---

### Test 21: Collapse Advanced Settings
**What to test:** Collapsing the panel

**Steps:**
1. Click the Advanced Settings header again to collapse
2. Observe the result

**What you should see:**
- ✅ Panel collapses smoothly
- ✅ Your changes are saved
- ✅ Cost estimates remain updated
- ✅ You can re-expand to see your settings

**Success:** Advanced settings collapse without losing changes

---

## Section 3.4: Cost Estimation

### Test 22: View Cost Estimation Breakdown
**What to test:** Detailed cost calculation

**Steps:**
1. Look at the Cost Estimation card/sidebar (right side)
2. Examine all displayed information

**What you should see:**
- ✅ **Estimated Cost Range:** "$45-55" (large, prominent)
- ✅ **Estimated Duration:** "8-12 hours"
- ✅ **GPU Configuration:**
  - GPU type (e.g., "H100 PCIe 80GB")
  - Instance type badge ("Spot" or "On-Demand")
  - Hourly rate (e.g., "$2.49/hr")
- ✅ **Cost Breakdown:**
  - Compute cost
  - Storage cost
  - Total estimated
- ✅ **Savings indicator:** If using Spot instances
- ✅ Color coding (green for good, yellow for expensive)

**Success:** Complete cost breakdown is visible and understandable

---

### Test 23: Change GPU Instance Type
**What to test:** Spot vs On-Demand pricing

**Steps:**
1. Look for instance type selector in Cost Estimation
2. Toggle between "Spot" and "On-Demand"

**What you should see:**
- ✅ Toggle or dropdown switches between types
- ✅ Cost estimate updates:
  - Spot: Lower cost (e.g., "$45-55")
  - On-Demand: Higher cost (e.g., "$120-140")
- ✅ Hourly rate changes
- ✅ Warning about Spot interruption risk
- ✅ Recommendation badge

**Success:** Switching instance types updates costs dramatically

---

## Section 3.5: Validation Checklist

### Test 24: View Pre-Flight Validation
**What to test:** Training readiness checks

**Steps:**
1. Scroll down to find the "Validation Checklist" section
2. Examine all checklist items

**What you should see (checklist items):**
- ✅ "Dataset selected and validated" (green checkmark)
- ✅ "Sufficient training pairs (>100)" (green checkmark)
- ✅ "GPU resources available" (green checkmark or yellow warning)
- ✅ "Configuration valid" (green checkmark)
- ✅ "Cost within budget" (green or yellow based on amount)
- ✅ "Required fields complete" (green checkmark)

**Each item shows:**
- ✅ Green checkmark = passed
- ✅ Yellow warning = attention needed
- ✅ Red X = blocking issue

**Success:** Validation checklist shows all requirements

---

### Test 25: Trigger Validation Warning
**What to test:** Validation failure state

**Steps:**
1. Expand Advanced Settings
2. Set LoRA Rank to maximum (64)
3. Set Epochs to maximum (5)
4. Set Batch Size to maximum (8)
5. Check validation checklist

**What you should see:**
- ✅ "Cost within budget" may turn yellow/red
- ✅ Warning message appears
- ✅ Estimated cost is very high (e.g., "$150-200")
- ✅ "Start Training" button may show warning color

**Success:** System warns about expensive configurations

---

## Section 3.6: Launching Training

### Test 26: Review Launch Summary
**What to test:** Pre-launch confirmation

**Steps:**
1. Reset to "Balanced" preset (if you changed settings)
2. Click the "Start Training" button
3. Wait for confirmation modal

**What you should see:**
- ✅ Confirmation modal/dialog opens
- ✅ Modal title: "Confirm Training Job"
- ✅ Summary of configuration:
  - Dataset name
  - Preset used
  - Estimated cost
  - Estimated duration
- ✅ Final validation checks
- ✅ Two buttons:
  - "Cancel" or "Go Back"
  - "Confirm & Start Training" (primary/green)

**Success:** Confirmation modal shows complete training summary

---

### Test 27: Launch Training Job
**What to test:** Starting the training process

**Steps:**
1. In the confirmation modal, click "Confirm & Start Training"
2. Watch for the response

**What you should see:**
- ✅ Modal closes
- ✅ Success message/toast appears: "Training job started!"
- ✅ Confetti animation (celebration) 🎉
- ✅ Page automatically navigates to Training Monitor (P04)
- ✅ Breadcrumb updates to: "Home > Training Jobs > [Job Name]"
- ✅ Training job is now running

**Success:** Training launches and you're taken to the monitoring page

---

# PART 4: Training Progress Monitor (P04)

## Section 4.1: Initial Monitor View

### Test 28: View Training Monitor Dashboard
**What to test:** Monitor page layout and initial state

**Steps:**
1. You should now be on the Training Monitor page (from previous test)
2. Examine the page layout

**What you should see:**
- ✅ Page title: "Training Monitor"
- ✅ Job ID displayed (e.g., "job-1734643200-abc123")
- ✅ Five main sections:
  1. Progress Header Card
  2. Stage Progression Indicator
  3. Loss Curve Graph
  4. Current Metrics Table
  5. Cost Tracker Card
- ✅ "Refresh" button (top-right)
- ✅ "Cancel Job" button (red, prominent)

**Success:** Training monitor loads showing all sections

---

## Section 4.2: Progress Header

### Test 29: View Overall Progress
**What to test:** Progress header information

**Steps:**
1. Look at the top Progress Header Card
2. Examine all displayed information

**What you should see:**
- ✅ **Job Name:** "Healthcare Consultant - Balanced"
- ✅ **Dataset Info:** "Training on: Healthcare Consultant Conversations (1,567 pairs)"
- ✅ **Status Badge:** "Training" (blue, pulsing animation)
- ✅ **Progress Bar:** Animated, showing percentage (e.g., 42%)
- ✅ **Progress Percentage:** Large number (e.g., "42%")
- ✅ **Current Step:** "850 / 2,000"
- ✅ **Current Epoch:** "2 / 3"
- ✅ **Elapsed Time:** "6h 23m"
- ✅ **Estimated Remaining:** "8h 15m remaining" (blue text)
- ✅ **Current Losses:** Training and Validation loss preview

**Success:** Progress header shows complete training status at a glance

---

### Test 30: Monitor Progress Changes
**What to test:** Progress updates over time

**Steps:**
1. Wait 10 seconds (the app auto-completes training in demo)
2. Watch the progress header

**What you should see (if auto-completion triggers):**
- ✅ Progress percentage increases
- ✅ Progress bar fills
- ✅ Status badge changes to "Completed" (green)
- ✅ Confetti animation appears 🎉
- ✅ Success banner appears at top

**Success:** Progress updates automatically (in real system, this happens every 60 seconds)

---

## Section 4.3: Stage Progression

### Test 31: View Training Stages
**What to test:** Four-stage progression indicator

**Steps:**
1. Find the "Training Stages" section
2. Examine the horizontal stage indicator

**What you should see (4 stages):**

**Stage 1 - Preprocessing:**
- ✅ Green circle with checkmark ✓
- ✅ "Completed" label
- ✅ Duration shown: "3m 42s"

**Stage 2 - Model Loading:**
- ✅ Green circle with checkmark ✓
- ✅ "Completed" label
- ✅ Duration shown: "11m 18s"

**Stage 3 - Training:**
- ✅ Blue circle with spinning loader
- ✅ "In Progress" label (pulsing)
- ✅ Substatus message: "Epoch 2/3 - Step 850/2000 - Loss converging"

**Stage 4 - Finalization:**
- ✅ Gray circle with number
- ✅ "Pending" label
- ✅ Estimated time: "5-10m"

**Additional:**
- ✅ Connecting lines between stages
- ✅ Green line shows completed progress
- ✅ Gray line shows remaining progress

**Success:** All four stages visible with clear status indicators

---

### Test 32: View Active Stage Details
**What to test:** Substatus information

**Steps:**
1. Look below the stage progression indicator
2. Find the active stage substatus box

**What you should see:**
- ✅ Blue highlighted box
- ✅ Current stage name: "Training"
- ✅ Detailed substatus: "Epoch 2/3 - Step 850/2000 - Loss converging"
- ✅ Updates with stage progress

**Success:** Active stage shows detailed status information

---

## Section 4.4: Loss Curve Graph

### Test 33: View Loss Curve Chart
**What to test:** Training and validation loss visualization

**Steps:**
1. Find the "Loss Curve" card
2. Examine the graph

**What you should see:**
- ✅ **Chart Title:** "Loss Curve"
- ✅ **Subtitle:** "Training and validation loss over time"
- ✅ **Two Lines:**
  - Blue solid line = Training Loss
  - Orange dashed line = Validation Loss
- ✅ **X-axis:** Training steps (0 to current step)
- ✅ **Y-axis:** Loss values (decreasing trend)
- ✅ **Legend:** Shows both line types
- ✅ **Export Button:** "Export PNG" (top-right)

**Success:** Graph displays with both loss curves clearly visible

---

### Test 34: Interact with Loss Curve
**What to test:** Interactive chart features

**Steps:**
1. Hover your mouse over the loss curve lines
2. Move along different points

**What you should see:**
- ✅ Tooltip appears on hover
- ✅ Tooltip shows:
  - Step number
  - Training loss value (4 decimal places)
  - Validation loss value (4 decimal places)
- ✅ Vertical line follows your cursor
- ✅ Exact values displayed

**Success:** Hovering shows exact loss values at each step

---

### Test 35: Export Loss Curve
**What to test:** Chart export functionality

**Steps:**
1. Click the "Export PNG" button on the loss curve card

**What you should see:**
- ✅ Alert or message: "Chart export feature would download a 2000x1200px PNG here"
- ✅ (In real app, a PNG file would download)

**Success:** Export button is functional (shows placeholder in demo)

---

## Section 4.5: Current Metrics Table

### Test 36: View Training Metrics
**What to test:** Detailed metrics display

**Steps:**
1. Find the "Current Metrics" table
2. Examine all rows

**What you should see (7 metric rows):**

| Metric | Value | Trend |
|--------|-------|-------|
| **Training Loss** | 0.3420 | ↓ -12.1% (green) |
| **Validation Loss** | 0.3580 | ↓ -13.1% (green) |
| **Learning Rate** | 0.000182 | (trend arrow) |
| **GPU Utilization** | 87% | (trend arrow) |
| **GPU Memory** | 68GB / 80GB (85%) | - |
| **Perplexity** | 1.43 | ↓ (green) |
| **Tokens/Second** | 1,247 | (trend arrow) |

**For each metric:**
- ✅ Metric name (left column)
- ✅ Current value (middle, bold)
- ✅ Trend indicator (right):
  - Green ↓ arrow = improvement
  - Red ↑ arrow = worsening
  - Gray - = stable
- ✅ Percentage change shown

**Success:** All metrics visible with trends clearly indicated

---

### Test 37: Understand Metric Trends
**What to test:** Trend indicators meaning

**Steps:**
1. Look at Training Loss trend (should be green down arrow)
2. Look at Perplexity trend (should be green down arrow)
3. Note the percentage changes

**What you should understand:**
- ✅ **Green ↓** = Good (loss decreasing)
- ✅ **Red ↑** = Bad (loss increasing)
- ✅ **Percentage** = Change from last update
- ✅ **For loss/perplexity:** Lower is better
- ✅ **For GPU utilization:** Higher is better

**Success:** You understand what trends mean

---

### Test 38: View Metrics Update Notice
**What to test:** Update frequency information

**Steps:**
1. Scroll to bottom of metrics table
2. Find the info message

**What you should see:**
- ✅ Gray info box
- ✅ Message: "Metrics update every 60 seconds during training. Trends show change from previous update."

**Success:** Update frequency is clearly communicated

---

## Section 4.6: Cost Tracker

### Test 39: View Real-Time Cost Tracking
**What to test:** Cost accumulation display

**Steps:**
1. Find the "Cost Tracker" card (usually right sidebar)
2. Examine all cost information

**What you should see:**
- ✅ **Card Title:** "Cost Tracker"
- ✅ **Subtitle:** "Real-time spending"
- ✅ **Instance Type Badge:** "Spot" (green) or "On-Demand"
- ✅ **Current Spend:** "$22.18" (large, bold, blue)
- ✅ **Progress Bar:** Showing percentage of estimate
- ✅ **Percentage:** "49% of estimate"
- ✅ **Estimated Range:** "$45-55" (gray)
- ✅ **Hourly Rate:** "$2.49/hr"
- ✅ **Projected Final:** "$47.32"

**Success:** All cost information is clearly displayed

---

### Test 40: Interpret Cost Progress Bar
**What to test:** Cost status visualization

**Steps:**
1. Look at the cost progress bar color
2. Note the percentage

**What you should see:**
- ✅ **Green bar** = Under 80% of estimate (good)
- ✅ **Yellow bar** = 80-100% of estimate (warning)
- ✅ **Red bar** = Over 100% of estimate (exceeded)
- ✅ Current example: Green at 49%

**Success:** Color coding shows cost status at a glance

---

### Test 41: View Cost Warning (If Testing Cost Warning State)
**What to test:** Cost exceeded alert

**Note:** To test this, you need to view the cost warning demo state. This might require a special parameter or switching datasets.

**What you should see (if cost exceeds estimate):**
- ✅ **Red border** on cost tracker card
- ✅ **Pulsing animation** on card
- ✅ **Alert banner:**
  - Red background
  - ⚠️ Warning icon
  - "Cost Exceeding Estimate!" message
  - Explanation text
- ✅ Current spend shown in red (e.g., "$54.23")
- ✅ Percentage over 100% (e.g., "121%")

**Success:** Cost warnings are highly visible and clear

---

## Section 4.7: Control Actions

### Test 42: Manual Refresh
**What to test:** Manual metrics update

**Steps:**
1. Find the "Refresh" button (top-right)
2. Click it

**What you should see:**
- ✅ Button briefly shows loading state
- ✅ Toast notification: "Metrics updated"
- ✅ All metrics refresh
- ✅ Loss curve adds new points
- ✅ "Last update" timestamp updates

**Success:** Manual refresh updates all metrics

---

### Test 43: Open Cancel Job Modal
**What to test:** Training cancellation interface

**Steps:**
1. Find the "Cancel Job" button (red, top-right)
2. Click it

**What you should see:**
- ✅ Modal dialog opens
- ✅ Title: "Cancel Training Job" with ⚠️ icon
- ✅ Warning message about cancellation
- ✅ **Current Progress Summary:**
  - Progress: "42% Complete"
  - Cost Incurred: "$22.18"
  - Current Loss: "0.3420"
  - Current Epoch: "2 / 3"
- ✅ **Impact Warning:**
  - Training stops immediately
  - Progress lost
  - Still charged for GPU time
  - Dataset unaffected
- ✅ **Reason Selection:** (required)
  - ○ Cost exceeding budget
  - ○ Poor training performance
  - ○ Incorrect configuration
  - ○ No longer needed
  - ○ Other reason

**Success:** Cancellation modal shows complete impact summary

---

### Test 44: Select Cancellation Reason
**What to test:** Reason requirement

**Steps:**
1. In the cancel modal, try clicking "Confirm Cancellation" without selecting a reason
2. Then select a reason (e.g., "Cost exceeding budget")
3. Try clicking "Confirm Cancellation" again

**What you should see:**
- ✅ Button is disabled when no reason selected
- ✅ Selecting a reason enables the button
- ✅ Selected reason highlights
- ✅ Can only select one reason

**Success:** Cancellation requires selecting a reason

---

### Test 45: Confirm Cancellation
**What to test:** Actually cancelling the job

**Steps:**
1. With a reason selected, click "Confirm Cancellation"
2. Watch the process

**What you should see:**
- ✅ Button shows loading state: "Cancelling..."
- ✅ Brief delay (simulating API call)
- ✅ Modal closes
- ✅ Status badge changes to "Cancelled"
- ✅ Toast notification: "Training Job Cancelled"
- ✅ Reason shown in notification
- ✅ All progress stops
- ✅ "Cancel Job" button disappears

**Success:** Job is cancelled and status updates

**Note:** For continued testing, you may need to refresh the page or start a new training job.

---

### Test 46: Cancel Modal Without Confirming
**What to test:** Closing modal without action

**Steps:**
1. Open the cancel modal again
2. Click "Keep Training" or the X button
3. Or click outside the modal

**What you should see:**
- ✅ Modal closes
- ✅ No changes to training job
- ✅ Training continues normally
- ✅ No notification appears

**Success:** Can close modal without cancelling

---

## Section 4.8: Completion State

### Test 47: View Training Completion
**What to test:** Successful completion display

**Note:** The demo app auto-completes after 10 seconds. Wait for this or refresh to see completion state.

**Steps:**
1. Wait for training to complete (or use completion demo state)
2. Observe all changes

**What you should see:**
- ✅ **Progress:** 100%
- ✅ **Status Badge:** "Completed" (green)
- ✅ **Confetti Animation:** 🎉
- ✅ **Completion Banner:**
  - Green background
  - 🎉 "Training Complete!" message
  - "Final loss: 0.312" displayed
  - Large success indicator
- ✅ **All Stages Green:**
  - Preprocessing ✓
  - Model Loading ✓
  - Training ✓
  - Finalization ✓
- ✅ **Final Metrics Displayed:**
  - Final Training Loss: 0.312
  - Final Validation Loss: 0.328
  - Final Perplexity: 1.39
- ✅ **Action Buttons:**
  - "View LoRA Model" (primary, green)
  - "Download Artifacts" (secondary)

**Success:** Completion is celebrated and clearly indicated

---

### Test 48: Navigate to Model Artifacts
**What to test:** Transition to P05

**Steps:**
1. With training completed, click "View LoRA Model" button

**What you should see:**
- ✅ Toast notification: "Navigating to model artifacts..."
- ✅ Page transitions to Model Artifacts page (P05)
- ✅ Breadcrumb updates to: "Home > Models > [Model Name]"
- ✅ Model information loads

**Success:** "View LoRA Model" button takes you to P05

---

# PART 5: Model Artifacts Manager (P05)

## Section 5.1: Model Overview

### Test 49: View Model Artifacts Page
**What to test:** Model artifacts page layout

**Steps:**
1. You should now be on the Model Artifacts page (from previous test)
2. Examine the page layout

**What you should see:**
- ✅ Page title: "Model Artifacts"
- ✅ Subtitle: "Trained LoRA adapter ready for deployment"
- ✅ "Show Version History" button (top-right)
- ✅ **Model Card Header:**
  - Model name (e.g., "Healthcare-Balanced-20241213")
  - Status badge (e.g., "Stored")
  - Creation date
  - Base model (e.g., "Llama 3 70B Instruct")
  - Quick stats (Job ID, pairs, duration, cost)
- ✅ Main content divided into two columns:
  - Left: Download, Quality, Training Summary
  - Right: Configuration, Lineage, Actions

**Success:** Complete model artifacts page loads

---

## Section 5.2: Download Section

### Test 50: View Download Options
**What to test:** Download interface

**Steps:**
1. Find the Download Section (should be prominent, blue border)
2. Examine all information

**What you should see:**
- ✅ Blue highlighted card (most prominent on page)
- ✅ Download icon
- ✅ Title: "Download LoRA Adapter"
- ✅ Description: "Ready-to-use LoRA adapter..."
- ✅ **Large Download Button:**
  - Blue/primary color
  - "Download LoRA Adapter (246 MB)"
  - Download icon
- ✅ **Files Included List:**
  - `adapter_model.bin` (246 MB)
  - `adapter_config.json` (2 KB)
- ✅ **Secondary Action:**
  - "Download Training Logs" link

**Success:** Download section is clear and prominent

---

### Test 51: Download LoRA Adapter
**What to test:** Adapter download process

**Steps:**
1. Click the "Download LoRA Adapter (246 MB)" button
2. Watch the download process

**What you should see:**
- ✅ Button changes to loading state
- ✅ Progress bar appears
- ✅ Percentage increases: "45%... 67%... 89%... 100%"
- ✅ Success state appears:
  - Green background
  - Checkmark icon
  - "Download complete! adapter_model.bin (246 MB)"
- ✅ Toast notification: "Download Complete! 🎉"
- ✅ Small confetti animation
- ✅ Success state visible for 3 seconds

**Success:** Download simulates with progress and confirmation

---

### Test 52: Download Training Logs
**What to test:** Secondary download option

**Steps:**
1. Click "Download Training Logs" link

**What you should see:**
- ✅ Console message or toast (this is a placeholder)
- ✅ Indication that logs would download
- ✅ (In real app, logs file would download)

**Success:** Training logs download option is available

---

## Section 5.3: Quality Metrics

### Test 53: View Quality Rating
**What to test:** Overall quality assessment

**Steps:**
1. Find the "Quality Metrics" card
2. Examine the quality rating

**What you should see:**
- ✅ **Star Rating:** ⭐⭐⭐⭐ (4 out of 5 stars filled)
- ✅ **Quality Label:** "Good" badge
- ✅ **Description:** "Strong performance, suitable for most use cases"
- ✅ Color-coded (blue for "Good")

**Success:** Quality rating is prominently displayed with context

---

### Test 54: View Validation Loss Metric
**What to test:** Validation loss with context

**Steps:**
1. In Quality Metrics card, find Validation Loss section
2. Examine all information

**What you should see:**
- ✅ **Metric Name:** "Validation Loss"
- ✅ **Info Icon:** Hoverable for explanation
- ✅ **Status Badge:** "Good" or "Excellent" (green/blue)
- ✅ **Value:** 0.3120 (large, bold)
- ✅ **Context Text:** "Good - acceptable loss" or similar
- ✅ **Explanation:** "Lower is better. Values below 0.5 indicate good performance."

**Success:** Validation loss shown with helpful context

---

### Test 55: Hover Info Icons
**What to test:** Metric explanations

**Steps:**
1. Hover over the info icon (ℹ️) next to "Validation Loss"
2. Try the same for "Perplexity"

**What you should see:**
- ✅ Tooltip appears on hover
- ✅ **Validation Loss tooltip:**
  - "Measures how well the model performs on unseen data"
  - "Lower is better"
  - "Values below 0.5 indicate good performance"
- ✅ **Perplexity tooltip:**
  - "Measures model uncertainty in predictions"
  - "Lower is better"
  - "Values below 2.0 indicate good language modeling"

**Success:** Info tooltips provide clear explanations

---

### Test 56: View Perplexity Metric
**What to test:** Perplexity display

**Steps:**
1. Find the Perplexity metric in Quality Metrics
2. Examine the display

**What you should see:**
- ✅ **Metric Name:** "Perplexity"
- ✅ **Info Icon:** (hover for explanation)
- ✅ **Status Badge:** "Good" or "Excellent"
- ✅ **Value:** 1.28 (large, bold)
- ✅ **Context:** "Excellent - very low perplexity" or similar

**Success:** Perplexity metric clearly displayed

---

### Test 57: View Training Improvement
**What to test:** Progress indicator

**Steps:**
1. Find the "Training Improvement" section (green box)
2. Examine the improvement data

**What you should see:**
- ✅ Green background box
- ✅ Trending down icon
- ✅ "Training Improvement" label
- ✅ **Improvement Text:**
  - "Started at 1.2400"
  - "Ended at 0.3120"
  - "(75% improvement)"
- ✅ Shows training was successful

**Success:** Improvement from start to finish is clear

---

## Section 5.4: Training Summary

### Test 58: View Training Summary Details
**What to test:** Complete training information

**Steps:**
1. Find the "Training Summary" card
2. Examine all displayed information

**What you should see:**
- ✅ Card Title: "Training Summary"
- ✅ "View Full Training" button (link to P04)
- ✅ **Completion Info:**
  - Green checkmark
  - "Training Completed"
  - Date and time
- ✅ **Stats Grid (4 items):**
  - **Duration:** "11h 28m"
  - **Total Cost:** "$47.23" with estimate "$45-55"
  - **GPU Used:** "H100 PCIe 80GB" with "Spot" badge
  - **Progress:** "2,000 / 2,000 steps" and "3 / 3 epochs"
- ✅ **Cost Comparison:**
  - Green box: "✓ Cost within estimate (86% of max)"
  - OR Yellow box if exceeded

**Success:** Complete training summary with all key metrics

---

### Test 59: Navigate to Training Job
**What to test:** Link back to P04

**Steps:**
1. Click "View Full Training" button in Training Summary

**What you should see:**
- ✅ Toast notification: "Navigating to training job..."
- ✅ Console message showing target URL
- ✅ (In real app, would navigate to P04 with job details)

**Success:** Link to training job (P04) is functional

---

## Section 5.5: Configuration Reference

### Test 60: View Training Configuration Used
**What to test:** Configuration details from P03

**Steps:**
1. Find the "Training Configuration" card (right sidebar)
2. Examine all settings

**What you should see:**
- ✅ Settings icon
- ✅ Card title: "Training Configuration"
- ✅ "View Full Config" button
- ✅ **Preset Badge:** "Balanced Preset" (blue)
- ✅ **Key Hyperparameters Grid:**
  - LoRA Rank (r): 16
  - LoRA Alpha (α): 32
  - Dropout: 0.05
  - Batch Size: 4
- ✅ **Learning Rate:** "2e-4" with "Cosine Schedule" badge
- ✅ **Epochs:** 3 (blue highlighted box)

**Success:** All training configuration parameters displayed

---

### Test 61: View Full Configuration
**What to test:** Link to P03

**Steps:**
1. Click "View Full Config" button

**What you should see:**
- ✅ Toast notification: "Opening configuration..."
- ✅ Console message showing navigation intent
- ✅ (In real app, would open P03 in read-only mode)

**Success:** Link to view configuration (P03) is functional

---

## Section 5.6: Dataset Lineage

### Test 62: View Source Dataset Information
**What to test:** Dataset lineage tracking

**Steps:**
1. Find the "Dataset Lineage" card (right sidebar)
2. Examine all lineage information

**What you should see:**
- ✅ Database icon
- ✅ Card title: "Dataset Lineage"
- ✅ "View Dataset" button
- ✅ **Dataset Name:** "Healthcare Consultant Conversations" (clickable link)
- ✅ **Training Pairs:** "1,567" with file icon
- ✅ **Consultant Profile:**
  - User icon
  - Name: "Elena Morales"
  - Title: "CFP"
- ✅ **Vertical:** "Healthcare" (blue box with briefcase icon)
- ✅ **Scaffolding Coverage:**
  - Persona Coverage: 87% (progress bar)
  - Arc Coverage: 92% (progress bar)

**Success:** Complete dataset lineage is traceable

---

### Test 63: View Lineage Path
**What to test:** Pipeline visualization

**Steps:**
1. Scroll to bottom of Dataset Lineage card
2. Find "Complete Lineage Path"

**What you should see:**
- ✅ Breadcrumb-style path:
  - **Dataset** (gray, clickable)
  - → arrow
  - **Configuration** (gray)
  - → arrow
  - **Training** (gray)
  - → arrow
  - **Model Artifact** (blue, current)
- ✅ Each step is visually separated
- ✅ Current step highlighted

**Success:** Complete pipeline path is visualized

---

### Test 64: Navigate to Source Dataset
**What to test:** Link back to P02

**Steps:**
1. Click "View Dataset" button OR click the dataset name link
2. Watch the response

**What you should see:**
- ✅ Toast notification: "Navigating to dataset..."
- ✅ Console message showing target URL
- ✅ (In real app, would navigate to P02 dataset detail)

**Success:** Link to source dataset (P02) is functional

---

## Section 5.7: Model Actions

### Test 65: View Available Actions
**What to test:** Model lifecycle management

**Steps:**
1. Find the "Model Actions" card (right sidebar)
2. Examine all action buttons

**What you should see (4 action buttons):**
- ✅ **Test Model:**
  - Flask icon
  - "Test Model" text
  - Enabled (for Stored/Testing status)
- ✅ **Deploy to Production:**
  - Rocket icon
  - "Deploy to Production" text
  - Enabled (if not already deployed)
- ✅ **Archive:**
  - Archive icon
  - "Archive Model" text
  - Enabled (if not already archived)
- ✅ **Delete:**
  - Trash icon
  - "Delete Model" text
  - Red text color
  - Always enabled

**Info Box:**
- ✅ Note about archiving vs deleting

**Success:** All lifecycle actions are available

---

### Test 66: Test Model (Coming Soon)
**What to test:** Test model action

**Steps:**
1. Click "Test Model" button

**What you should see:**
- ✅ Alert popup appears
- ✅ Message: "Test Model feature coming soon!"
- ✅ Description: "This will launch an inference interface where you can test the LoRA adapter with sample prompts."
- ✅ OK button to dismiss

**Success:** Test model shows coming soon notice

---

### Test 67: Deploy to Production
**What to test:** Production deployment

**Steps:**
1. Click "Deploy to Production" button
2. Watch the response

**What you should see:**
- ✅ Status badge changes from "Stored" to "Production" (green)
- ✅ Success toast: "Model Deployed to Production! 🚀"
- ✅ Description: "Your LoRA model is now live and ready for inference"
- ✅ Confetti animation 🎉
- ✅ "Deploy to Production" button becomes disabled
- ✅ Button shows "(Already deployed)" label

**Success:** Model status updates to Production with celebration

---

### Test 68: Open Archive Confirmation
**What to test:** Archive modal

**Steps:**
1. Click "Archive Model" button
2. Examine the confirmation dialog

**What you should see:**
- ✅ Modal dialog opens
- ✅ Archive icon (amber/orange)
- ✅ Title: "Archive Model"
- ✅ Description: "Are you sure you want to archive this model?"
- ✅ **Model Summary:**
  - Model name
  - Status change: "production" → "archived"
- ✅ **Info Box:**
  - Amber background
  - "ℹ️ Info:" prefix
  - Explanation: Archived models not available for deployment but can be restored
  - Files remain in storage
- ✅ **Buttons:**
  - "Cancel" (outline)
  - "Archive Model" (amber/orange, primary)

**Success:** Archive confirmation shows impact clearly

---

### Test 69: Confirm Archiving
**What to test:** Actually archiving the model

**Steps:**
1. In archive modal, click "Archive Model" button
2. Watch the process

**What you should see:**
- ✅ Modal closes
- ✅ Status badge changes to "Archived" (amber)
- ✅ Toast notification: "Model Archived"
- ✅ Description: "Model moved to archived status. You can restore it anytime."
- ✅ Some action buttons become disabled

**Success:** Model successfully archived

---

### Test 70: Open Delete Confirmation
**What to test:** Delete modal with safety check

**Steps:**
1. Click "Delete Model" button (red)
2. Examine the confirmation dialog

**What you should see:**
- ✅ Modal dialog opens
- ✅ Red warning icon
- ✅ Title: "Delete Model Permanently"
- ✅ Description: "This action cannot be undone..."
- ✅ **Warning Box (red):**
  - Alert icon
  - "Warning: Permanent Deletion" title
  - List of consequences:
    - Model files permanently deleted
    - Training history preserved
    - Action cannot be reversed
    - Need to retrain to recreate
- ✅ **Confirmation Input:**
  - Label: "Type the model name to confirm"
  - Shows model name to type
  - Text input field
- ✅ **Buttons:**
  - "Cancel" (outline)
  - "Delete Permanently" (red, destructive, DISABLED initially)

**Success:** Delete modal shows severe warnings and requires confirmation

---

### Test 71: Type Model Name for Deletion
**What to test:** Delete safety mechanism

**Steps:**
1. In delete modal, try clicking "Delete Permanently" (should be disabled)
2. Type the wrong name in the input field
3. Type the correct model name (shown above the input)
4. Watch the button state

**What you should see:**
- ✅ Button disabled when input is empty
- ✅ Button disabled when name doesn't match
- ✅ Button **enabled** when exact name is typed
- ✅ No other validation

**Success:** Must type exact name to enable delete

---

### Test 72: Confirm Deletion
**What to test:** Actually deleting the model

**Steps:**
1. With correct name typed, click "Delete Permanently"
2. Watch the process

**What you should see:**
- ✅ Modal closes
- ✅ Toast notification: "Model Deleted"
- ✅ Description: "Model files have been permanently removed from storage"
- ✅ Page begins to navigate away (simulated)
- ✅ Console message about navigation
- ✅ (In real app, would return to models list)

**Success:** Model deleted with confirmation

---

## Section 5.8: Version History

### Test 73: Show Version History
**What to test:** Version comparison feature

**Steps:**
1. Click "Show Version History" button (top-right of page)
2. Wait for Version History section to appear

**What you should see:**
- ✅ New "Version History" card appears below other cards
- ✅ Card title: "Version History"
- ✅ Badge showing version count (e.g., "3 versions")
- ✅ **Three version cards** (or however many exist):
  - Version 3 (most recent)
  - Version 2 (current - highlighted)
  - Version 1 (oldest)

**Success:** Version history section displays

---

### Test 74: Examine Version Cards
**What to test:** Version comparison information

**Steps:**
1. Look at each version card in the history
2. Compare information across versions

**What you should see on each version card:**
- ✅ **Version Number:** "Version 3", "Version 2", etc.
- ✅ **Current Badge:** Blue "Current" badge on active version
- ✅ **Creation Date:** (with calendar icon)
- ✅ **Star Rating:** ⭐⭐⭐⭐⭐ (1-5 stars)
- ✅ **Statistics Grid:**
  - Preset: "Aggressive", "Balanced", or "Conservative" badge
  - Validation Loss: e.g., "0.2890"
  - Cost: e.g., "$89.45"
  - File Size: e.g., "512 MB"
- ✅ **View Button:** "View Version" (not on current version)

**Success:** All versions show comparable information

---

### Test 75: Compare Version Quality
**What to test:** Understanding version differences

**Steps:**
1. Compare star ratings across versions
2. Compare validation losses
3. Compare costs

**What you should notice:**
- ✅ **Version 3 (Aggressive):**
  - 5 stars (Excellent)
  - Lowest loss (0.289)
  - Highest cost ($89.45)
  - Largest file (512 MB)
- ✅ **Version 2 (Balanced) - CURRENT:**
  - 4 stars (Good)
  - Medium loss (0.312)
  - Medium cost ($47.23)
  - Medium file (246 MB)
- ✅ **Version 1 (Conservative):**
  - 2 stars (Poor)
  - Highest loss (0.487)
  - Lowest cost ($28.76)
  - Smallest file (128 MB)

**Success:** You can compare quality vs cost tradeoffs

---

### Test 76: Switch to Different Version
**What to test:** Viewing other versions

**Steps:**
1. Click "View Version" button on Version 3 (Aggressive)
2. Watch the page update

**What you should see:**
- ✅ Page content updates
- ✅ Toast: "Version Loaded - Viewing version: Healthcare-Aggressive-20241210"
- ✅ All cards update to show Version 3 data:
  - Model name changes
  - Status may be "Production" (green)
  - Quality rating: 5 stars
  - Different metrics
  - Different configuration
- ✅ Version History updates:
  - Version 3 now has "Current" badge
  - Version 2 now has "View Version" button

**Success:** Can switch between versions and see different data

---

### Test 77: Hide Version History
**What to test:** Toggling version display

**Steps:**
1. Click "Hide Version History" button (top-right)
2. Watch the section

**What you should see:**
- ✅ Version History card smoothly disappears
- ✅ Button text changes to "Show Version History"
- ✅ Other cards remain unchanged

**Success:** Version history is toggleable

---

## Section 5.9: Pipeline Completion

### Test 78: View Pipeline Completion Banner
**What to test:** Completion celebration

**Note:** This appears when model status is "Stored" (not Production/Archived)

**Steps:**
1. If model is Stored status, scroll to bottom of page
2. Look for the completion banner

**What you should see:**
- ✅ Large banner with gradient background (blue to purple)
- ✅ Blue border
- ✅ 🎯 Target emoji icon (large)
- ✅ **Title:** "Training Pipeline Complete!"
- ✅ **Description:**
  - "You've successfully completed the full training pipeline:"
  - "Dataset → Configuration → Training → Model Artifact"
  - "Your trained LoRA adapter is ready to use."
- ✅ **Action Buttons:**
  - "Deploy to Production" (blue, primary)
  - "Train Another Model" (outline, secondary)

**Success:** Completion banner celebrates finishing the full pipeline

---

### Test 79: Deploy from Completion Banner
**What to test:** Quick deploy action

**Steps:**
1. Click "Deploy to Production" button in completion banner

**What you should see:**
- ✅ Same result as Test 67 (Deploy to Production)
- ✅ Status changes to Production
- ✅ Confetti celebration
- ✅ Success toast

**Success:** Can deploy directly from completion banner

---

### Test 80: Train Another Model
**What to test:** Return to datasets

**Steps:**
1. Click "Train Another Model" button in completion banner

**What you should see:**
- ✅ Toast: "Navigating to dataset..."
- ✅ Console shows navigation to datasets
- ✅ (In real app, would return to P02 to start new training)

**Success:** Can restart the training pipeline

---

# COMPREHENSIVE CHECKLIST

## P01 - Dashboard Shell ✅
- [ ] View main dashboard layout
- [ ] Navigate all sidebar items (Dashboard, Datasets, Training, Models)
- [ ] View active training indicator
- [ ] View cost tracker
- [ ] View notifications panel
- [ ] Access user profile menu
- [ ] Use breadcrumb navigation

## P02 - Dataset Management ✅
- [ ] Access dataset management page
- [ ] View all dataset cards
- [ ] Filter datasets by status and vertical
- [ ] View dataset details modal
- [ ] Examine scaffolding analysis
- [ ] View sample conversation pairs
- [ ] Close dataset modal
- [ ] Start training from dataset

## P03 - Training Configurator ✅
- [ ] View configuration page layout
- [ ] Examine all three presets (Conservative, Balanced, Aggressive)
- [ ] Switch between presets
- [ ] View cost estimate updates
- [ ] Expand advanced settings
- [ ] Adjust hyperparameters (LoRA Rank, Learning Rate, Epochs, etc.)
- [ ] View hyperparameter tooltips
- [ ] Collapse advanced settings
- [ ] View cost estimation breakdown
- [ ] Change GPU instance type (Spot/On-Demand)
- [ ] View validation checklist
- [ ] Trigger validation warnings
- [ ] Open launch confirmation modal
- [ ] Launch training job

## P04 - Training Monitor ✅
- [ ] View training monitor dashboard
- [ ] View overall progress header
- [ ] Monitor progress changes
- [ ] View all four training stages
- [ ] View active stage substatus
- [ ] View loss curve graph
- [ ] Interact with loss curve (hover tooltips)
- [ ] Export loss curve
- [ ] View all training metrics
- [ ] Understand metric trends
- [ ] View metrics update notice
- [ ] View real-time cost tracking
- [ ] Interpret cost progress bar
- [ ] View cost warnings (if applicable)
- [ ] Manual refresh metrics
- [ ] Open cancel job modal
- [ ] Select cancellation reason
- [ ] Confirm cancellation OR cancel without confirming
- [ ] View training completion state
- [ ] Navigate to model artifacts

## P05 - Model Artifacts ✅
- [ ] View model artifacts page
- [ ] View download options
- [ ] Download LoRA adapter (with progress)
- [ ] Download training logs
- [ ] View quality rating (stars)
- [ ] View validation loss metric
- [ ] Hover info icons for explanations
- [ ] View perplexity metric
- [ ] View training improvement
- [ ] View training summary details
- [ ] Navigate to training job (P04)
- [ ] View configuration used
- [ ] View full configuration (P03)
- [ ] View source dataset information
- [ ] View lineage path
- [ ] Navigate to source dataset (P02)
- [ ] View all model actions
- [ ] Test "Test Model" (coming soon)
- [ ] Deploy to production
- [ ] Open archive confirmation
- [ ] Confirm archiving
- [ ] Open delete confirmation
- [ ] Type model name for deletion
- [ ] Confirm deletion
- [ ] Show version history
- [ ] Examine version cards
- [ ] Compare version quality
- [ ] Switch to different version
- [ ] Hide version history
- [ ] View pipeline completion banner
- [ ] Deploy from completion banner
- [ ] Start training another model

---

# WORKFLOW TESTING SUMMARY

You have now tested the **complete LoRA Training Infrastructure workflow**:

## The Full Journey:
1. **P01**: Started at the dashboard and navigated the interface
2. **P02**: Selected a dataset for training
3. **P03**: Configured training with presets and hyperparameters
4. **P04**: Monitored training progress in real-time
5. **P05**: Downloaded and managed the trained model

## Total Features Tested: **80+ functional requirements**

## Mock Data Used:
- **Dataset**: Healthcare Consultant Conversations (1,567 pairs)
- **Configuration**: Balanced preset (LoRA rank 16, 3 epochs)
- **Training**: Simulated 11h 28m training job
- **Cost**: $47.23 (within $45-55 estimate)
- **Model**: 4-star quality rating, 0.312 validation loss

---

# TROUBLESHOOTING

## If something doesn't work:

### Modal won't open:
- Refresh the page
- Check browser console for errors
- Try clicking the button again

### Progress not updating:
- Click manual "Refresh" button
- Wait 60 seconds for auto-update
- Check that status is "running"

### Navigation not working:
- Look for console messages (they show where navigation would go)
- In demo mode, some navigation is simulated
- Check breadcrumbs to confirm current location

### Can't see all features:
- Make sure you're following the tutorial sequence
- Some features only appear in certain states (e.g., completion banner only when status is "Stored")
- Try different demo states by refreshing and selecting different options

---

# CONGRATULATIONS! 🎉

You have successfully tested every major feature of the LoRA Training Infrastructure application. You've gone through the complete workflow from dataset selection to trained model artifact, testing all functionality along the way.

The application is ready for the next phase of development where these mock features will be connected to real backend systems.
