# Dataset Management Components (P02)

This directory contains the Dataset Management View components that integrate with the P01 dashboard shell.

## Components

### DatasetCard
Displays a single dataset with:
- Dataset name, created date, and format badge
- Key metrics (conversations, training pairs, quality score)
- Vertical and consultant information
- Training readiness indicator
- Scaffolding distribution preview
- Action buttons (View Details, Start Training)

### DatasetDetailModal
Full dataset inspection modal with tabs:
- **Overview**: Key metrics and training readiness criteria
- **Scaffolding**: Detailed distribution by persona and emotional arc
- **Conversations**: Sample conversations from the dataset
- **Metadata**: File information and JSON export

## Integration Points

### From P01 (Dashboard Shell)
- Renders in the main content area
- Uses sidebar navigation (Datasets = active)
- Uses header breadcrumbs: "Home > Datasets"
- Uses notification system for alerts

### To P03 (Training Configurator)
- "Start Training" button passes dataset_id
- Navigation: `/training/new?dataset_id={uuid}`
- Passes dataset metadata for training configuration

## Mock Data

All data is sourced from `/src/app/data/datasetMockData.ts`:
- 6 sample datasets with varying quality and readiness
- Scaffolding distributions across 3 personas × 7 emotional arcs
- Training readiness criteria validation
- Filter and sort utilities

## Features

- **Search**: Filter by name, consultant, or vertical
- **Sort**: 8 sort options (date, name, quality, size)
- **Filter**: Format (v3/v4), readiness status
- **Responsive**: Grid adapts from 1 col (mobile) to 3 cols (desktop)
- **Empty State**: Shows when no datasets or filters return nothing

## Usage

```tsx
import { DatasetsPage } from './pages/DatasetsPage';

// In your router or App component:
<DatasetsPage />
```

The page is fully self-contained with its own state management and mock data.
