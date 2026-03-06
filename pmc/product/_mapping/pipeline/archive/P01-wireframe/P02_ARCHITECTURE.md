# P02 Component Architecture

## Component Tree

```
App.tsx
└── DashboardLayout (from P01)
    ├── AppSidebar (from P01)
    │   └── "Datasets" nav item [ACTIVE]
    │
    ├── AppHeader (from P01)
    │   ├── Breadcrumbs: "Home > Datasets"
    │   ├── ActiveTrainingIndicator
    │   ├── CostTracker
    │   ├── NotificationPanel
    │   └── UserMenu
    │
    └── DatasetsPage ⭐ NEW
        ├── Page Header
        │   ├── Title: "Datasets"
        │   ├── Description
        │   └── "Create Dataset" Button
        │
        ├── Stats Bar (4 metrics)
        │   ├── Total Datasets
        │   ├── Ready for Training
        │   ├── Total Conversations
        │   └── Total Training Pairs
        │
        ├── Controls Row
        │   ├── Search Input (with icon)
        │   ├── Sort Select (8 options)
        │   └── Filter DropdownMenu
        │       ├── Format filters (all/v4/v3)
        │       ├── Readiness filters (all/ready/needs review)
        │       └── "Clear All Filters" button
        │
        ├── Active Filters Pills (conditional)
        │   └── Removable Badge per active filter
        │
        ├── Results Count
        │
        ├── Dataset Grid (responsive 1-3 cols)
        │   └── DatasetCard (×6) ⭐ NEW
        │       ├── Card Header
        │       │   ├── Dataset Name
        │       │   ├── Created Date
        │       │   └── Format Badge (v3/v4)
        │       │
        │       ├── Metrics Row 1
        │       │   ├── Conversations (with icon)
        │       │   ├── Training Pairs (with icon)
        │       │   └── Quality Score (with icon + color)
        │       │
        │       ├── Vertical Badge
        │       ├── Consultant Info
        │       │
        │       ├── Readiness Indicator
        │       │   ├── Green: "Ready for Training"
        │       │   └── Yellow: "Review Recommended" + issues list
        │       │
        │       ├── Scaffolding Preview
        │       │   ├── Horizontal bar chart (3 colors)
        │       │   └── Legend (3 personas)
        │       │
        │       ├── File Info (size + review %)
        │       │
        │       └── Action Buttons
        │           ├── "View Details" (outline)
        │           └── "Start Training" (primary, conditional disabled)
        │
        ├── Empty State (conditional)
        │   ├── Database Icon
        │   ├── "No datasets found" message
        │   └── CTA button
        │
        └── DatasetDetailModal ⭐ NEW
            ├── Modal Header
            │   ├── Dataset Name (title)
            │   ├── Vertical + Consultant (description)
            │   └── Format Badge
            │
            ├── Tabs
            │   ├── TabsList (4 tabs)
            │   │
            │   ├── Tab 1: Overview
            │   │   ├── 4 Metric Cards
            │   │   ├── Training Readiness Checklist
            │   │   │   └── 4 Criteria (checkmark or X)
            │   │   └── Dates Grid
            │   │
            │   ├── Tab 2: Scaffolding
            │   │   └── 3 Persona Sections
            │   │       ├── Persona Header (name + total)
            │   │       └── 7 Arc Progress Bars
            │   │           ├── Arc name
            │   │           ├── Pair count
            │   │           └── Progress bar (color-coded)
            │   │
            │   ├── Tab 3: Conversations
            │   │   ├── 3 Sample Conversations
            │   │   │   ├── Title
            │   │   │   ├── Persona dot + name
            │   │   │   ├── Arc name
            │   │   │   ├── Turn count badge
            │   │   │   └── Date
            │   │   └── "View All" Button
            │   │
            │   └── Tab 4: Metadata
            │       ├── File Information Card
            │       │   ├── Storage Path
            │       │   ├── File Size
            │       │   └── Format Version
            │       ├── JSON Preview (scrollable)
            │       └── "Export Metadata" Button
            │
            └── Modal Footer
                ├── "Close" Button
                └── "Start Training" Button (conditional disabled)
```

## Data Flow

```
Mock Data (datasetMockData.ts)
    ↓
DatasetsPage State
    ├── sortBy: SortOption
    ├── filters: DatasetFilters
    ├── selectedDataset: Dataset | null
    └── isDetailModalOpen: boolean
    ↓
useMemo(filterAndSortDatasets)
    ↓
filteredDatasets: Dataset[]
    ↓
Map to DatasetCard components
    ↓
User Interactions:
    ├── onViewDetails → Open modal + set selectedDataset
    ├── onStartTraining → Show alert (future: navigate to P03)
    ├── Search change → Update filters.searchQuery
    ├── Sort change → Update sortBy
    └── Filter change → Update filters.format/trainingReady
```

## State Management

### DatasetsPage Local State
```typescript
const [sortBy, setSortBy] = useState<SortOption>('date-desc');
const [filters, setFilters] = useState<DatasetFilters>({
  format: 'all',
  trainingReady: 'all',
  searchQuery: '',
});
const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
```

### Computed State (useMemo)
```typescript
const filteredDatasets = useMemo(
  () => filterAndSortDatasets(mockDatasets, filters, sortBy),
  [filters, sortBy]
);
```

## File Structure

```
/src/app/
├── App.tsx (imports DatasetsPage)
├── pages/
│   └── DatasetsPage.tsx ⭐ Main page component
├── components/
│   ├── datasets/
│   │   ├── DatasetCard.tsx ⭐ Card component
│   │   ├── DatasetDetailModal.tsx ⭐ Modal component
│   │   └── README.md ⭐ Documentation
│   ├── layout/ (from P01)
│   │   ├── DashboardLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   └── AppHeader.tsx
│   └── ui/ (Shadcn components)
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── tabs.tsx
│       ├── select.tsx
│       ├── dropdown-menu.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       └── ... (other UI components)
├── data/
│   ├── mockData.ts (from P01)
│   └── datasetMockData.ts ⭐ Dataset mock data
└── utils/
    └── datasetUtils.ts ⭐ Helper functions
```

## Integration Points

### Receives from P01
- ✅ Dashboard layout shell
- ✅ Sidebar with "Datasets" active state
- ✅ Header with breadcrumbs
- ✅ Notification system (toast)

### Provides to P03
- Dataset ID (via URL parameter or state)
- Dataset metadata (name, pairs, quality, format)
- Scaffolding distribution data
- File storage path

### Navigation Flow
```
User Journey:
1. Click "Datasets" in P01 sidebar
   ↓
2. DatasetsPage renders with 6 datasets
   ↓
3. User searches/filters/sorts to find desired dataset
   ↓
4. User clicks "View Details" to inspect
   ↓
5. User reviews scaffolding, quality, conversations
   ↓
6. User clicks "Start Training"
   ↓
7. [Future] Navigate to P03: /training/new?dataset_id={uuid}
   [Current] Alert shows dataset info
```

## Component Props

### DatasetCard
```typescript
interface DatasetCardProps {
  dataset: Dataset;
  onViewDetails: (dataset: Dataset) => void;
  onStartTraining: (dataset: Dataset) => void;
}
```

### DatasetDetailModal
```typescript
interface DatasetDetailModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
  onStartTraining: (dataset: Dataset) => void;
}
```

### DatasetsPage
```typescript
// No props - fully self-contained
export function DatasetsPage() { ... }
```

## Key Features by Component

### DatasetsPage
- ✅ Search functionality
- ✅ Sort by 8 criteria
- ✅ Filter by format/readiness
- ✅ Stats dashboard
- ✅ Responsive grid layout
- ✅ Empty state handling
- ✅ Active filter pills

### DatasetCard
- ✅ Compact metric display
- ✅ Quality score color coding
- ✅ Training readiness badge
- ✅ Scaffolding preview bar
- ✅ Hover effects
- ✅ Conditional button states

### DatasetDetailModal
- ✅ 4-tab layout
- ✅ Training readiness checklist
- ✅ Persona/arc distribution charts
- ✅ Sample conversations
- ✅ JSON metadata export
- ✅ Scrollable content area

## TypeScript Interfaces

### Core Types
```typescript
interface Dataset {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  format: 'brightrun-lora-v4' | 'brightrun-lora-v3';
  totalConversations: number;
  totalTrainingPairs: number;
  qualityScore: number;
  vertical: string;
  consultantName: string;
  consultantTitle: string;
  trainingReady: boolean;
  readinessIssues: string[];
  scaffoldingDistribution: ScaffoldingDistribution[];
  humanReviewPercent: number;
  fileStoragePath: string;
  fileSizeBytes: number;
}

interface ScaffoldingDistribution {
  persona: string;
  arc: string;
  topics: number;
  count: number;
}

type SortOption = 
  | 'date-desc' | 'date-asc'
  | 'name-asc' | 'name-desc'
  | 'quality-desc' | 'quality-asc'
  | 'size-desc' | 'size-asc';

interface DatasetFilters {
  format?: 'brightrun-lora-v4' | 'brightrun-lora-v3' | 'all';
  qualityMin?: number;
  qualityMax?: number;
  dateFrom?: string;
  dateTo?: string;
  trainingReady?: boolean | 'all';
  searchQuery?: string;
}
```

## Performance Considerations

### Optimizations
- ✅ `useMemo` for filtering/sorting (prevents unnecessary recalculation)
- ✅ Conditional rendering (empty state, filter pills)
- ✅ Lazy modal content (only renders when open)
- ✅ Efficient array operations (reduce, flatMap)

### Scalability
- Current: 6 mock datasets (instant)
- Expected: 50-100 datasets (still fast with useMemo)
- Large scale: 1000+ datasets (would need virtualization)

## Testing Coverage

### Unit Test Targets
- ✅ `filterAndSortDatasets` utility function
- ✅ `validateDatasetReadiness` utility function
- ✅ Date/size formatting functions
- ✅ Component rendering with different props

### Integration Test Targets
- ✅ Search → filter → sort chain
- ✅ Modal open → tab switch → close
- ✅ Empty state when no results
- ✅ Navigation to P03 (alert)

### E2E Test Scenarios
- ✅ Full user journey (browse → search → view details → start training)
- ✅ Filter combinations
- ✅ Responsive layout changes
- ✅ Keyboard navigation

---

**Architecture Status**: ✅ Clean, Modular, Scalable, Well-Documented
