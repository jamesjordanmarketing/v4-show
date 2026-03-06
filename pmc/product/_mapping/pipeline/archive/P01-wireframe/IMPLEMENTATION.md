# BrightRun LoRA Training Pipeline - Dashboard Shell & Global Navigation

## Overview

This is the foundational wireframe (P01) for the BrightRun LoRA Training Infrastructure. It establishes the global layout, navigation, and design system that all subsequent prompts (P02-P05) will inherit and build upon.

## Technology Stack

- **TypeScript**: Primary development language
- **React 18**: UI framework
- **Tailwind CSS v4**: Utility-first styling
- **Shadcn UI**: Component library
- **Vite**: Build tool
- **Lucide React**: Icon library

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx      # Main application wrapper
│   │   │   ├── AppSidebar.tsx           # Navigation sidebar
│   │   │   ├── AppHeader.tsx            # Top header bar
│   │   │   ├── MobileSidebar.tsx        # Mobile navigation drawer
│   │   │   ├── ActiveTrainingIndicator.tsx  # Active jobs indicator
│   │   │   ├── NotificationPanel.tsx    # Notification dropdown
│   │   │   └── CostTracker.tsx          # Cost tracking display
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx        # Dashboard overview
│   │   │   ├── DatasetsPage.tsx         # Dataset management
│   │   │   ├── TrainingJobsPage.tsx     # Training jobs view
│   │   │   ├── ModelsPage.tsx           # Model artifacts
│   │   │   └── SettingsPage.tsx         # Application settings
│   │   └── ui/                          # Shadcn UI components
│   ├── data/
│   │   ├── mockData.ts                  # All mock data
│   │   └── designSystem.ts              # Design system documentation
│   └── App.tsx                          # Main application entry
└── styles/
    ├── theme.css                        # CSS variables & tokens
    ├── tailwind.css                     # Tailwind configuration
    └── fonts.css                        # Font imports
```

## Features Implemented

### 1. Global Layout Shell
- ✅ Fixed sidebar navigation (240px desktop, collapsible)
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Top header bar with breadcrumbs
- ✅ Main content area for page rendering
- ✅ Mobile hamburger menu

### 2. Navigation System
- ✅ 5 main sections:
  - Dashboard (overview with metrics)
  - Datasets (conversation files, training files)
  - Training Jobs (active, queued, completed)
  - Models (LoRA artifacts, deployment status)
  - Settings (RunPod config, API keys)
- ✅ Active state indicators
- ✅ Badge notifications on navigation items
- ✅ Smooth transitions between sections

### 3. Header Components
- ✅ Breadcrumb navigation
- ✅ Environment badge (Development/Production)
- ✅ Active training indicator with dropdown
- ✅ Cost tracker with monthly breakdown
- ✅ Notification panel with unread count
- ✅ User avatar menu

### 4. Active Training Indicator
- ✅ Shows count of active jobs
- ✅ Pulsing animation when training
- ✅ Expandable dropdown with job details
- ✅ Progress bars and status indicators
- ✅ Quick navigation to training jobs

### 5. Notification System
- ✅ Bell icon with unread count badge
- ✅ Dropdown panel with notifications
- ✅ Success, warning, error, info types
- ✅ Action links for each notification
- ✅ Mark all read functionality
- ✅ Dismiss individual notifications

### 6. Cost Tracker
- ✅ Monthly cost display
- ✅ Trend indicator (up/down with percentage)
- ✅ Cost breakdown (training, storage, API)
- ✅ Visual progress bars
- ✅ Link to detailed report

### 7. Page Components
- ✅ Dashboard: Overview with stats and recent activity
- ✅ Datasets: Empty state with upload functionality
- ✅ Training Jobs: Tabs for active, queued, completed
- ✅ Models: Grid view of trained models
- ✅ Settings: Tabs for RunPod, API keys, notifications, billing

### 8. Mock Data
- ✅ 2 active training jobs with progress
- ✅ 1 queued job
- ✅ 3 completed jobs (including 1 failed)
- ✅ 5 notifications (2 unread)
- ✅ Cost data with breakdown
- ✅ Recent activity feed
- ✅ User profile data

## Design System

### Color Tokens
```typescript
primaryBlue: #2563EB      // Training active, primary actions
successGreen: #10B981     // Completed, connected
warningAmber: #F59E0B     // Queued, cost warning
errorRed: #EF4444         // Failed, critical
neutralGray: #6B7280      // Pending, disabled
```

### Typography Scale
- Heading 1: 24px/32px, weight 600
- Heading 2: 20px/28px, weight 600
- Heading 3: 16px/24px, weight 600
- Body: 14px/20px, weight 400
- Small: 12px/16px, weight 400

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Layout Dimensions
- Sidebar: 240px (expanded), 72px (collapsed)
- Header: 60px height
- Logo area: 80px height

### Responsive Breakpoints
- Desktop: >1280px (full sidebar + content)
- Tablet: 768-1279px (collapsed sidebar)
- Mobile: <768px (hamburger menu)

## Interface Points for P02-P05

### 1. Content Area Container
All subsequent prompts should render their content inside the `<main>` element in `DashboardLayout`.

### 2. Breadcrumb Component
Pass breadcrumb data using the `BreadcrumbItem[]` type:
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

### 3. Sidebar Active State
Use the `NavSection` type to indicate active section:
```typescript
type NavSection = 'dashboard' | 'datasets' | 'training' | 'models' | 'settings';
```

### 4. Notification System
Use `toast()` from Sonner for new notifications:
```typescript
import { toast } from 'sonner';
toast.success('Training completed!');
```

### 5. Cost Tracker Integration
Update `mockCostData` in `mockData.ts` to reflect new costs.

## Key Components

### DashboardLayout
Main wrapper component that provides the shell structure.

**Props:**
- `activeSection`: Current navigation section
- `breadcrumbs`: Breadcrumb trail
- `activeJobs`: List of active training jobs
- `notifications`: List of notifications
- `costData`: Cost tracking data
- `userData`: User profile data
- `environment`: 'development' | 'production'
- Event handlers for navigation and interactions

### AppSidebar
Fixed sidebar navigation component.

**Features:**
- Logo area
- Navigation items with icons
- Active state indicator
- Badge support
- Collapse/expand functionality
- Connection status footer

### AppHeader
Top header bar with all status indicators.

**Features:**
- Breadcrumb navigation
- Environment badge
- Active training indicator
- Cost tracker
- Notification panel
- User avatar menu

### ActiveTrainingIndicator
Displays active training jobs in header.

**Features:**
- Job count display
- Pulsing animation
- Expandable dropdown
- Progress bars
- Quick navigation

### NotificationPanel
Notification management system.

**Features:**
- Bell icon with count badge
- Dropdown panel
- Type-based icons
- Action links
- Mark read/dismiss

### CostTracker
Monthly cost tracking display.

**Features:**
- Current month total
- Trend indicator
- Cost breakdown
- Visual progress bars

## Mock Data

All mock data is centralized in `/src/app/data/mockData.ts`:

- **mockActiveJobs**: 2 training jobs in progress
- **mockQueuedJobs**: 1 job waiting to start
- **mockCompletedJobs**: 3 historical jobs
- **mockNotifications**: 5 notifications (2 unread)
- **mockCostData**: Monthly costs with breakdown
- **mockRecentActivity**: 5 recent events
- **mockUserData**: User profile information

Helper functions:
- `getUnreadNotificationCount()`
- `getActiveJobCount()`
- `formatTimeAgo(timestamp)`

## Usage

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Adding New Pages

1. Create page component in `/src/app/components/pages/`
2. Add navigation item to `AppSidebar.tsx`
3. Update `NavSection` type
4. Add route handler in `App.tsx`
5. Update breadcrumbs logic

### Navigation Example

```typescript
const handleNavigate = (section: NavSection) => {
  setActiveSection(section);
};

<DashboardLayout
  activeSection={activeSection}
  onNavigate={handleNavigate}
  // ... other props
>
  {renderCurrentPage()}
</DashboardLayout>
```

## Important Notes

1. **No Supabase**: All data uses local mock files only
2. **TypeScript Required**: All components use TypeScript
3. **Design System**: Follow documented color tokens and spacing
4. **Responsive**: Works on desktop, tablet, and mobile
5. **Accessibility**: Proper ARIA labels and keyboard navigation
6. **Mock Data**: Robust data for testing all functionality

## Future Integration (P02-P05)

The following prompts will build upon this foundation:

- **P02**: Dataset management and conversation generation
- **P03**: Training job configuration and launch
- **P04**: Real-time training monitoring
- **P05**: Model artifacts and deployment

All subsequent prompts must:
- Use the established layout shell
- Follow the design system
- Integrate with navigation
- Update mock data appropriately
- Maintain TypeScript types

## Component Dependencies

### Required Shadcn Components
All components are already installed and available in `/src/app/components/ui/`:

- Badge
- Button
- Card
- Avatar
- Dropdown Menu
- Sheet (for mobile drawer)
- Progress
- Tabs
- Input
- Label
- Switch
- Scroll Area
- Breadcrumb
- Toast (Sonner)

## Status Indicators

### Training Job Status
- `training`: Blue with pulse animation
- `queued`: Amber
- `completed`: Green
- `failed`: Red
- `warning`: Amber with pulse

### Environment Badge
- `development`: 🟡 Secondary variant
- `production`: 🟢 Default variant

### Connection Status
- `connected`: 🟢 Green dot with pulse
- `disconnected`: 🔴 Red dot

## Animations

### Pulse Animation
Used for:
- Active training indicator
- Connection status
- Unread notification badge

### Transitions
- Navigation: 200ms ease-out
- Dropdown expansion: 200ms ease-out
- Hover states: 150ms ease-out

## Accessibility

- ✅ Semantic HTML elements
- ✅ ARIA labels on icons
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Screen reader friendly
- ✅ Proper heading hierarchy
- ✅ Color contrast compliant (WCAG AA)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Internal project for BrightRun LoRA Training Infrastructure.

---

**Created**: December 20, 2025
**Version**: P01 - Foundation
**Status**: ✅ Complete
