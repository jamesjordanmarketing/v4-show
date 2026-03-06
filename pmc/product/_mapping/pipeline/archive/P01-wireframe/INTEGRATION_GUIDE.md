# Integration Guide for Prompts P02-P05

This guide provides quick reference for integrating with the P01 foundation.

## Quick Start

### 1. Import the Layout

```typescript
import { DashboardLayout } from './components/layout/DashboardLayout';
import { NavSection } from './components/layout/AppSidebar';
import type { BreadcrumbItem } from './components/layout/AppHeader';
```

### 2. Import Mock Data Types

```typescript
import type {
  TrainingJob,
  Notification,
  CostData,
  UserData,
  RecentActivity
} from './data/mockData';

import {
  mockActiveJobs,
  mockNotifications,
  mockCostData,
  mockUserData
} from './data/mockData';
```

### 3. Render Your Page

```typescript
export function YourNewPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Your Page Title</h1>
        <p className="text-muted-foreground mt-1">
          Your page description
        </p>
      </div>
      
      {/* Your content here */}
    </div>
  );
}
```

## Navigation Integration

### Add New Section

1. Update `NavSection` type in `AppSidebar.tsx`:
```typescript
export type NavSection = 'dashboard' | 'datasets' | 'training' | 'models' | 'settings' | 'your-new-section';
```

2. Add navigation item in `AppSidebar.tsx`:
```typescript
{
  id: 'your-new-section',
  label: 'Your Section',
  icon: <YourIcon className="size-5" />
}
```

3. Add route handler in `App.tsx`:
```typescript
const renderPage = () => {
  switch (activeSection) {
    case 'your-new-section':
      return <YourNewPage />;
    // ... other cases
  }
};
```

4. Update breadcrumbs in `App.tsx`:
```typescript
const getBreadcrumbs = (): BreadcrumbItem[] => {
  // ...
  case 'your-new-section':
    breadcrumbs.push({ label: 'Your Section' });
    break;
};
```

## Notifications

### Show Toast Notification

```typescript
import { toast } from 'sonner';

// Success
toast.success('Training completed successfully!');

// Error
toast.error('Training failed due to insufficient GPU memory');

// Warning
toast.warning('Your costs are approaching the monthly limit');

// Info
toast.info('New dataset is ready for training');
```

### Add to Notification Panel

Update `mockNotifications` in `/src/app/data/mockData.ts`:

```typescript
{
  id: 'notif-new',
  type: 'success', // 'success' | 'warning' | 'error' | 'info'
  title: 'Your Notification Title',
  message: 'Your notification message here',
  timestamp: '2025-12-20T14:00:00Z',
  read: false,
  actionUrl: '/your-section',
  actionLabel: 'View Details'
}
```

## Cost Tracking

### Update Costs

Modify `mockCostData` in `/src/app/data/mockData.ts`:

```typescript
export const mockCostData: CostData = {
  currentMonth: 52.45, // Update total
  trend: 'up', // 'up' | 'down' | 'stable'
  trendPercentage: 15.2, // Percentage change
  breakdown: {
    training: 42.30, // Update individual costs
    storage: 6.15,
    api: 4.00
  }
};
```

## Training Jobs

### Add Active Job

Update `mockActiveJobs` in `/src/app/data/mockData.ts`:

```typescript
{
  id: 'job-new',
  name: 'Your New Training Job',
  status: 'training', // 'training' | 'queued' | 'completed' | 'failed' | 'warning'
  progress: 45,
  startTime: '2025-12-20T13:00:00Z',
  estimatedCompletion: '2025-12-20T16:30:00Z',
  currentEpoch: 2,
  totalEpochs: 4,
  gpuType: 'A100 80GB',
  costPerHour: 2.49,
  elapsedTime: '1h 30m',
  dataset: 'your-dataset-name'
}
```

## Design Tokens

### Use Consistent Colors

```typescript
// Status colors
className="text-blue-500"   // Training active
className="text-green-500"  // Completed/Success
className="text-amber-500"  // Queued/Warning
className="text-red-500"    // Failed/Error
className="text-gray-500"   // Neutral/Pending
```

### Use Consistent Spacing

```typescript
className="p-6 space-y-6"    // Page container
className="p-4 space-y-4"    // Card content
className="gap-4"            // Grid gaps
className="gap-2"            // Small gaps (flex items)
```

### Use Consistent Typography

Don't override default typography unless necessary:
```typescript
<h1>Page Title</h1>                    // 24px, weight 600
<h2>Section Title</h2>                 // 20px, weight 600
<h3>Subsection Title</h3>              // 16px, weight 600
<p className="text-muted-foreground">  // Body text with muted color
```

## Common Components

### Card Layout

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Your content */}
  </CardContent>
</Card>
```

### Button with Icon

```typescript
import { Button } from '../ui/button';
import { YourIcon } from 'lucide-react';

<Button onClick={handleClick}>
  <YourIcon className="size-4 mr-2" />
  Button Text
</Button>
```

### Badge

```typescript
import { Badge } from '../ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Progress Bar

```typescript
import { Progress } from '../ui/progress';

<Progress value={65} className="h-2" />
```

### Tabs

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

## Empty States

```typescript
<Card>
  <CardContent className="pt-6">
    <div className="text-center py-12">
      <YourIcon className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="mb-2">Empty State Heading</h3>
      <p className="text-muted-foreground mb-6">
        Empty state description
      </p>
      <Button>
        <YourIcon className="size-4 mr-2" />
        Call to Action
      </Button>
    </div>
  </CardContent>
</Card>
```

## Responsive Grid Layouts

```typescript
{/* 1 column mobile, 2 tablet, 3 desktop */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>

{/* 1 column mobile, 2 desktop */}
<div className="grid gap-6 lg:grid-cols-2">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

## Time Formatting

```typescript
import { formatTimeAgo } from './data/mockData';

// Use in your component
<span>{formatTimeAgo('2025-12-20T10:30:00Z')}</span>
// Output: "2h ago"
```

## TypeScript Types

### Training Job

```typescript
interface TrainingJob {
  id: string;
  name: string;
  status: 'training' | 'queued' | 'completed' | 'failed' | 'warning';
  progress: number;
  startTime: string;
  estimatedCompletion?: string;
  currentEpoch?: number;
  totalEpochs?: number;
  gpuType?: string;
  costPerHour?: number;
  elapsedTime?: string;
  dataset?: string;
}
```

### Notification

```typescript
interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}
```

## Icon Verification

Before using any Lucide icon, verify it exists:

```bash
grep "export { default as YourIcon }" lucide-react/dist/esm/icons/index.js
```

Common icons used:
- LayoutDashboard, Database, Rocket, Brain, Settings
- Bell, Menu, X, ChevronDown
- User, LogOut, DollarSign, TrendingUp, TrendingDown
- Upload, Download, Play, Save, Key
- CircleCheck, CircleX, CircleAlert, TriangleAlert, Info
- Activity, Clock, FileText, Trash2

## Best Practices

1. **Always use TypeScript**: Add proper types for all props and data
2. **Use mock data**: Never connect to real APIs, use mock files
3. **Follow design tokens**: Use established colors, spacing, typography
4. **Maintain consistency**: Use existing components and patterns
5. **Make it responsive**: Test on mobile, tablet, desktop
6. **Add empty states**: Handle zero data scenarios
7. **Show loading states**: Use skeletons or placeholders
8. **Toast notifications**: Use for user feedback
9. **Accessibility**: Add ARIA labels, keyboard support
10. **Documentation**: Comment complex logic

## File Locations

```
/src/app/
  ├── components/
  │   ├── layout/           # Layout components (sidebar, header)
  │   ├── pages/            # Page components (add yours here)
  │   └── ui/               # Shadcn components
  ├── data/
  │   ├── mockData.ts       # All mock data (update this)
  │   └── designSystem.ts   # Design system docs
  └── App.tsx               # Main app (add routes here)
```

## Need Help?

1. Check `/IMPLEMENTATION.md` for full documentation
2. Check `/SCREENS.md` for screen examples
3. Check `/src/app/data/designSystem.ts` for design tokens
4. Check existing page components for patterns
5. All Shadcn components are in `/src/app/components/ui/`

---

**Remember**: This is P01 foundation. Build on it, don't recreate it!
