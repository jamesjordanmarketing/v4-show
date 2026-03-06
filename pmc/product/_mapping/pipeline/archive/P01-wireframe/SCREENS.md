# BrightRun LoRA Pipeline - Screen Documentation

## Screen Overview

This document describes all the screens and states implemented in the P01 wireframe.

---

## 1. Dashboard Overview (Desktop - Default State)

**Route**: `/` (activeSection: 'dashboard')

**Layout Components**:
- Full sidebar (240px width)
- Header bar with all indicators
- Main content area

**Content**:
- 4 metric cards (Active Training, Total Jobs, Success Rate, Models Trained)
- Active Training Jobs section (shows 2 active jobs)
- Recent Activity feed (5 recent events)
- Quick Actions (3 action buttons)

**Status Indicators**:
- Active training: 2 jobs (pulsing indicator)
- Notifications: 2 unread
- Cost: $47.23 (up 12.5%)
- Environment: Development

**Mock Data Visible**:
- Customer Support LoRA v2.1 (67% complete, Epoch 2/3)
- Technical Documentation Assistant (34% complete, Epoch 1/3)
- 5 recent activity items with timestamps
- User: Sarah Chen

---

## 2. Dashboard with Active Training Dropdown Expanded

**Route**: `/` (activeSection: 'dashboard')

**Interaction**: User clicks "Training: 2 active" in header

**Dropdown Content**:
- Header: "Active Training Jobs"
- Job 1: Customer Support LoRA v2.1
  - 67% progress bar
  - A100 80GB, 2h 15m elapsed
  - Epoch 2/3
- Job 2: Technical Documentation Assistant
  - 34% progress bar
  - A100 40GB, 1h 0m elapsed
  - Epoch 1/3
- Footer: "View All Training Jobs" button

**Animation**: 
- Dropdown slides down with fade-in
- Progress bars animate on render
- Job 1 has pulsing blue status dot

---

## 3. Training Jobs Page (Active Tab)

**Route**: `/training` (activeSection: 'training')

**Layout**:
- Breadcrumb: Home > Training Jobs
- Page header with "Start New Training" button
- Tab navigation: Active (2) | Queued (1) | Completed (3)

**Active Tab Content**:
- 2 job cards in grid layout
- Each card shows:
  - Job name with status icon (pulsing rocket)
  - Status badge (Training)
  - Dataset name
  - Progress bar
  - GPU type, elapsed time, cost/hour
  - Epoch counter

**Interactions**:
- Click card to view job details
- Hover effect on cards
- Click "Start New Training" opens dialog (toast notification)

---

## 4. Training Jobs Page (Completed Tab)

**Route**: `/training` (activeSection: 'training')

**Tab**: Completed (3)

**Content**:
- 3 job cards in grid layout:
  1. Customer Support LoRA v2.0 (✅ Completed)
     - 100% progress, A100 80GB, 4h 23m
  2. Product Description Generator (✅ Completed)
     - 100% progress, A100 40GB, 3h 45m
  3. Code Review Assistant (❌ Failed)
     - 45% progress, A100 40GB

**Status Badges**:
- Completed: Green badge
- Failed: Red destructive badge

---

## 5. Datasets Page (Empty State)

**Route**: `/datasets` (activeSection: 'datasets')

**Layout**:
- Breadcrumb: Home > Datasets
- Page header with "Upload Dataset" button
- Main empty state card

**Empty State**:
- Large database icon (gray, 50% opacity)
- Heading: "No datasets yet"
- Description: Upload conversation datasets message
- CTA: "Upload Your First Dataset" button

**Info Cards**:
- Dataset Requirements (format, min/max size)
- Recent Datasets (empty)

---

## 6. Models Page

**Route**: `/models` (activeSection: 'models')

**Layout**:
- Breadcrumb: Home > Models
- 3 metric cards (Production, Testing, Total)
- Models grid (3 columns)

**Content**:
- 3 model cards:
  1. Customer Support LoRA v2.0
     - 🟢 Production, 94.5% accuracy, 2.3 GB
  2. Product Description Generator
     - 🟢 Production, 91.2% accuracy, 1.8 GB
  3. Technical Documentation Assistant
     - 🟡 Testing, 88.7% accuracy, 2.1 GB

**Actions**:
- Download button (all models)
- Deploy button (testing models only)

---

## 7. Settings Page (RunPod Tab)

**Route**: `/settings` (activeSection: 'settings')

**Tab Navigation**: RunPod | API Keys | Notifications | Billing

**RunPod Tab Content**:
- Connection status badge: 🟢 Connected
- API Key input (password field, filled with bullets)
- Default GPU Type input (A100 80GB)
- Auto-scale toggle (enabled)
- Save Changes button

**GPU Availability Card**:
- A100 80GB: $2.49/hr (Available)
- A100 40GB: $1.89/hr (Available)
- RTX 4090: $0.69/hr (Limited)

---

## 8. Settings Page (Notifications Tab)

**Route**: `/settings` (activeSection: 'settings')

**Tab**: Notifications

**Content**:
- 4 notification preference toggles:
  1. Training Completed (✅ enabled)
  2. Training Failed (✅ enabled)
  3. Cost Alerts (✅ enabled)
  4. Weekly Summary (❌ disabled)
- Each with descriptive subtitle
- Save Preferences button

---

## 9. Notification Panel Expanded

**Interaction**: User clicks bell icon in header

**Dropdown Content**:
- Header: "Notifications" with "2 unread" count
- "Mark all read" button
- Scrollable list of 5 notifications:
  1. ✅ Training Completed (unread, blue highlight)
     - "View Results" action link
     - 1d ago
  2. ⚠️ High Cost Alert (unread, blue highlight)
     - "Review Budget" action link
     - 3h ago
  3. ❌ Training Failed (read)
     - "View Details" action link
     - 3d ago
  4. ℹ️ New Dataset Ready (read)
     - "View Dataset" action link
     - 4d ago
  5. ✅ Model Deployed (read)
     - "View Model" action link
     - 2d ago

**Visual Elements**:
- Unread have blue left border accent
- Color-coded icons (green, amber, red, blue)
- Dismiss X button on each
- Timestamps formatted as "Xd/h/m ago"

---

## 10. Cost Tracker Expanded

**Interaction**: User clicks "$47.23 +12.5%" in header

**Dropdown Content**:
- Header: "Monthly Costs" with trend icon
- Large total: $47.23
- Trend text: "Up 12.5% from last month" (amber)
- Cost breakdown with progress bars:
  - Training: $38.50 (81.5% of total)
  - Storage: $5.23 (11.1% of total)
  - API Calls: $3.50 (7.4% of total)
- "View Detailed Report" button

---

## 11. Mobile View (< 768px)

**Layout Changes**:
- Sidebar hidden
- Hamburger menu button in header
- Simplified header (icons only, no labels)
- Full-width content area
- Breadcrumbs hidden

**Mobile Drawer**:
- Sheet component slides in from left
- Full navigation sidebar (240px)
- Overlay backdrop
- Tap outside to close

---

## 12. Tablet View (768px - 1279px)

**Layout Changes**:
- Sidebar collapsed to 72px (icons only)
- Hover to temporarily expand
- Header shows abbreviated labels
- Content area fluid width
- Grid layouts adjust (2 columns instead of 3)

---

## Screen States Summary

| Screen | Route | Active Nav | Key Elements | Mock Data Count |
|--------|-------|-----------|--------------|-----------------|
| Dashboard | / | dashboard | Metrics, Active Jobs, Activity | 2 jobs, 5 activities |
| Datasets | /datasets | datasets | Empty State, Upload CTA | 0 datasets |
| Training Jobs | /training | training | Tabs, Job Cards | 2 active, 1 queued, 3 completed |
| Models | /models | models | Model Grid, Stats | 3 models |
| Settings | /settings | settings | Tabs, Form Fields | - |

## Interactive Elements

### Always Visible (in Header):
1. **Active Training Indicator**: Shows count, expandable dropdown
2. **Notification Bell**: Shows unread count (2), expandable panel
3. **Cost Tracker**: Shows monthly total and trend, expandable breakdown
4. **User Avatar**: Dropdown menu (Profile, Sign Out)
5. **Environment Badge**: Development/Production indicator

### Navigation:
- 5 sidebar items (Dashboard, Datasets, Training, Models, Settings)
- Breadcrumb navigation in header
- Mobile hamburger menu

### Page-Specific:
- Training Jobs: 3 tabs (Active, Queued, Completed)
- Settings: 4 tabs (RunPod, API Keys, Notifications, Billing)
- Various CTA buttons throughout

## Animation States

1. **Pulsing**: Active training indicators, connection status
2. **Hover**: Cards, buttons, navigation items
3. **Transitions**: Navigation changes (200ms ease-out)
4. **Dropdowns**: Fade in with slide down
5. **Progress Bars**: Animated on render

## Data Visualization

- **Progress Bars**: Training job progress (0-100%)
- **Cost Breakdown**: Horizontal progress bars showing percentages
- **Metrics Cards**: Large numbers with trends
- **Status Badges**: Color-coded (green, amber, red, blue)
- **Status Dots**: Pulsing animations for active states

---

**Total Screens Implemented**: 12 distinct views/states
**Total Components**: 20+ reusable components
**Mock Data Points**: 50+ individual data items
**Responsive Breakpoints**: 3 (mobile, tablet, desktop)
