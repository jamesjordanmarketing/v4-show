# Component Architecture

## Component Hierarchy

```
App.tsx (Root)
└── DashboardLayout
    ├── AppSidebar (Desktop)
    │   ├── Logo Area
    │   ├── Navigation Items (5)
    │   │   ├── Dashboard
    │   │   ├── Datasets
    │   │   ├── Training Jobs (with badge)
    │   │   ├── Models
    │   │   └── Settings
    │   └── Connection Status Footer
    │
    ├── MobileSidebar (Mobile/Tablet)
    │   └── Sheet
    │       └── AppSidebar
    │
    ├── AppHeader
    │   ├── Mobile Menu Button
    │   ├── Breadcrumb Navigation
    │   ├── Environment Badge
    │   ├── ActiveTrainingIndicator
    │   │   └── Dropdown
    │   │       └── Job Cards (2)
    │   ├── CostTracker
    │   │   └── Dropdown
    │   │       └── Cost Breakdown
    │   ├── NotificationPanel
    │   │   └── Dropdown
    │   │       └── Notification Items (5)
    │   └── User Avatar Menu
    │       └── Dropdown
    │           ├── Profile
    │           └── Sign Out
    │
    └── Main Content Area
        └── [Current Page Component]
            ├── DashboardPage
            │   ├── Stats Cards (4)
            │   ├── Active Jobs Card
            │   ├── Recent Activity Card
            │   └── Quick Actions Card
            │
            ├── DatasetsPage
            │   ├── Page Header
            │   ├── Empty State Card
            │   └── Info Cards (2)
            │
            ├── TrainingJobsPage
            │   ├── Page Header
            │   └── Tabs
            │       ├── Active Tab
            │       │   └── Job Cards (2)
            │       ├── Queued Tab
            │       │   └── Job Cards (1)
            │       └── Completed Tab
            │           └── Job Cards (3)
            │
            ├── ModelsPage
            │   ├── Stats Cards (3)
            │   └── Model Cards Grid (3)
            │
            └── SettingsPage
                └── Tabs
                    ├── RunPod Tab
                    │   ├── Config Form
                    │   └── GPU Availability
                    ├── API Keys Tab
                    ├── Notifications Tab
                    └── Billing Tab
```

## Component Dependencies

### Layout Components

```typescript
DashboardLayout
  ├── Depends on:
  │   ├── AppSidebar
  │   ├── AppHeader
  │   └── MobileSidebar
  └── Props:
      ├── activeSection: NavSection
      ├── breadcrumbs: BreadcrumbItem[]
      ├── activeJobs: TrainingJob[]
      ├── notifications: Notification[]
      ├── costData: CostData
      └── userData: UserData
```

```typescript
AppSidebar
  ├── Depends on:
  │   ├── Badge (ui)
  │   └── Icons (lucide-react)
  └── Props:
      ├── activeSection: NavSection
      ├── onNavigate: (section) => void
      ├── collapsed?: boolean
      └── activeJobCount?: number
```

```typescript
AppHeader
  ├── Depends on:
  │   ├── Breadcrumb (ui)
  │   ├── DropdownMenu (ui)
  │   ├── Avatar (ui)
  │   ├── ActiveTrainingIndicator
  │   ├── NotificationPanel
  │   └── CostTracker
  └── Props:
      ├── breadcrumbs: BreadcrumbItem[]
      ├── activeJobs: TrainingJob[]
      ├── notifications: Notification[]
      ├── costData: CostData
      ├── userData: UserData
      └── event handlers
```

### Indicator Components

```typescript
ActiveTrainingIndicator
  ├── Depends on:
  │   ├── Button (ui)
  │   ├── Progress (ui)
  │   └── Badge (ui)
  └── Props:
      ├── jobs: TrainingJob[]
      └── onJobClick?: (jobId) => void
```

```typescript
NotificationPanel
  ├── Depends on:
  │   ├── Button (ui)
  │   ├── Badge (ui)
  │   └── ScrollArea (ui)
  └── Props:
      ├── notifications: Notification[]
      ├── onNotificationClick?: (notification) => void
      ├── onMarkAllRead?: () => void
      └── onDismiss?: (id) => void
```

```typescript
CostTracker
  ├── Depends on:
  │   ├── Button (ui)
  │   └── Progress (ui)
  └── Props:
      ├── costData: CostData
      └── onViewDetails?: () => void
```

### Page Components

```typescript
DashboardPage
  ├── Depends on:
  │   ├── Card (ui)
  │   ├── Badge (ui)
  │   ├── Progress (ui)
  │   └── Button (ui)
  └── Props:
      ├── activeJobs: TrainingJob[]
      ├── completedJobs: TrainingJob[]
      ├── recentActivity: RecentActivity[]
      └── navigation handlers
```

```typescript
TrainingJobsPage
  ├── Depends on:
  │   ├── Card (ui)
  │   ├── Tabs (ui)
  │   ├── Badge (ui)
  │   ├── Progress (ui)
  │   └── Button (ui)
  └── Props:
      ├── activeJobs: TrainingJob[]
      ├── queuedJobs: TrainingJob[]
      ├── completedJobs: TrainingJob[]
      └── event handlers
```

## Data Flow

```
mockData.ts (Source of Truth)
    ↓
App.tsx (State Management)
    ↓
DashboardLayout (Distribution)
    ├→ AppHeader
    │   ├→ ActiveTrainingIndicator
    │   ├→ NotificationPanel
    │   └→ CostTracker
    └→ Current Page Component
        └→ Displays data
```

## State Management

```typescript
App.tsx maintains:
  ├── activeSection: NavSection
  └── Derived state:
      ├── breadcrumbs (computed from activeSection)
      └── currentPage (rendered based on activeSection)

Mock data (stateless):
  ├── mockActiveJobs
  ├── mockQueuedJobs
  ├── mockCompletedJobs
  ├── mockNotifications
  ├── mockCostData
  ├── mockUserData
  └── mockRecentActivity
```

## UI Component Library (Shadcn)

All available in `/src/app/components/ui/`:

```
Core Components:
  ├── Badge
  ├── Button
  ├── Card (CardHeader, CardTitle, CardDescription, CardContent)
  ├── Avatar (Avatar, AvatarFallback)
  ├── Progress
  ├── Tabs (Tabs, TabsList, TabsTrigger, TabsContent)
  └── Input/Label/Switch

Layout Components:
  ├── Sheet (for mobile drawer)
  ├── ScrollArea
  ├── Separator
  └── Breadcrumb

Overlay Components:
  ├── DropdownMenu
  ├── Dialog
  ├── Popover
  └── Tooltip

Form Components:
  ├── Input
  ├── Label
  ├── Switch
  ├── Select
  └── Textarea
```

## Icon Usage

From `lucide-react`:

```typescript
Navigation:
  ├── LayoutDashboard
  ├── Database
  ├── Rocket
  ├── Brain
  └── Settings

Actions:
  ├── Upload
  ├── Download
  ├── Play
  ├── Save
  └── Trash2

Status:
  ├── CircleCheck (success)
  ├── CircleX (failed)
  ├── CircleAlert (error)
  ├── TriangleAlert (warning)
  └── Info (info)

Interface:
  ├── Menu (hamburger)
  ├── X (close)
  ├── ChevronDown (dropdown)
  ├── Bell (notifications)
  ├── User (profile)
  ├── LogOut
  └── Key (API keys)

Metrics:
  ├── TrendingUp
  ├── TrendingDown
  ├── DollarSign
  ├── Activity
  └── Clock
```

## Responsive Behavior

```
Desktop (>1280px):
  ├── Sidebar: 240px (expanded)
  ├── Header: Full labels
  └── Content: Max width

Tablet (768-1279px):
  ├── Sidebar: 72px (collapsed, hover to expand)
  ├── Header: Abbreviated
  └── Content: Fluid width

Mobile (<768px):
  ├── Sidebar: Hidden (hamburger menu)
  ├── Header: Icons only
  └── Content: Full width
```

## Animation States

```
Transitions (200ms ease-out):
  ├── Navigation changes
  ├── Dropdown expansions
  ├── Hover states
  └── Tab switches

Pulse Animations (2s loop):
  ├── Active training indicator
  ├── Connection status dot
  └── Status indicators

On-mount Animations:
  └── Progress bars (animate from 0 to value)
```

## Event Flow

```
User Action → Handler → State Update → Re-render

Examples:

1. Navigation:
   Click Nav Item → onNavigate(section) → setActiveSection → Page Change

2. Notification:
   Click Bell → Toggle Panel → Show Notifications

3. Training Job:
   Click Job Card → onJobClick(id) → Navigate to Details

4. Cost Tracker:
   Click Cost → Toggle Dropdown → Show Breakdown
```

## TypeScript Type System

```typescript
Core Types (mockData.ts):
  ├── TrainingJob
  ├── Notification
  ├── CostData
  ├── UserData
  └── RecentActivity

Component Props Types:
  ├── DashboardLayoutProps
  ├── AppSidebarProps
  ├── AppHeaderProps
  ├── ActiveTrainingIndicatorProps
  ├── NotificationPanelProps
  ├── CostTrackerProps
  └── Page component props

UI Types:
  ├── NavSection (union type)
  ├── BreadcrumbItem (interface)
  └── Badge variants
```

## Color System

```
Semantic Colors:
  ├── Blue (#2563EB): Training active, primary actions
  ├── Green (#10B981): Success, completed
  ├── Amber (#F59E0B): Warning, queued
  ├── Red (#EF4444): Error, failed
  └── Gray (#6B7280): Neutral, disabled

Tailwind Classes:
  ├── text-blue-500, bg-blue-500
  ├── text-green-500, bg-green-500
  ├── text-amber-500, bg-amber-500
  ├── text-red-500, bg-red-500
  └── text-gray-500, bg-gray-500

Theme Variables (theme.css):
  ├── --background
  ├── --foreground
  ├── --muted-foreground
  ├── --primary
  ├── --destructive
  └── 40+ more CSS variables
```

## Component Sizes

```
Icons:
  ├── Small: size-4 (16px)
  ├── Medium: size-5 (20px)
  └── Large: size-16 (64px)

Buttons:
  ├── size="sm"
  ├── size="default"
  └── size="lg"

Cards:
  ├── Padding: p-4 or p-6
  └── Gaps: space-y-3, space-y-4, space-y-6

Grids:
  ├── gap-4: Standard grid gap
  └── gap-6: Larger grid gap
```

---

**Component Count**: 20+ components
**Total Lines of Code**: ~3,500 lines
**Mock Data Items**: 50+ items
**TypeScript Types**: 15+ interfaces/types
**Screens**: 12 distinct views
