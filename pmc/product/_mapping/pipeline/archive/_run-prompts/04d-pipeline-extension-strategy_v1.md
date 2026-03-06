# Extension Strategy - BrightRun LoRA Training Module

**Date**: December 23, 2024  
**Structured Spec**: `pmc/product/_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md`  
**Infrastructure Inventory**: `04d-infrastructure-inventory_v1.md`  
**Approach**: EXTENSION (using existing infrastructure)

---

## EXECUTIVE SUMMARY

This document defines how the new BrightRun LoRA Training module EXTENDS the existing BrightHub conversation generation platform by using existing infrastructure to implement the features specified in the structured specification.

**Critical Understanding**:
- **Structured Spec describes**: FEATURES to build (dataset upload, training configuration, job execution, model delivery)
- **Structured Spec's tech choices**: IGNORED (Prisma → use Supabase, NextAuth → use Supabase Auth, S3 → use Supabase Storage, BullMQ → use alternative)
- **Existing Codebase provides**: INFRASTRUCTURE to use (authentication, database, storage, components)
- **This Strategy defines**: HOW to implement spec's FEATURES using existing INFRASTRUCTURE

**Key Decisions**:
1. ✅ Use existing **Supabase Auth** for all authentication (ignore spec's NextAuth)
2. ✅ Use existing **Supabase PostgreSQL** for all database operations (ignore spec's Prisma)
3. ✅ Use existing **Supabase Storage** for all file operations (ignore spec's S3)
4. ✅ Use existing **shadcn/ui components** for all UI (ignore spec's component setup)
5. ✅ Use existing **React Query** for state management (ignore spec's SWR)
6. ❌ Skip **BullMQ + Redis** job queue (use simpler polling + cron jobs or Edge Functions)
7. ✅ Only CREATE NEW: tables, API routes, pages, components specific to LoRA training features

---

## FEATURES EXTRACTED FROM SPEC

### Section 1: Foundation & Authentication (SKIP - Already Exists)

**Spec Describes**: NextAuth.js setup, user management, session handling  
**Our Reality**: Already have Supabase Auth  
**Action**: SKIP this section entirely, use existing auth

---

### Section 2: Dataset Management

**Spec Describes**: Upload datasets, validate format, calculate statistics, manage CRUD

| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F2.1 | Upload dataset with presigned URLs | Dataset metadata, file storage | POST /api/datasets, POST /api/datasets/[id]/confirm | /datasets, upload modal |
| F2.2 | Validate dataset format (BrightRun LoRA v3/v4) | Validation results, error messages | Background validation worker | Validation status display |
| F2.3 | Calculate dataset statistics | Token counts, conversation counts, avg metrics | Stats calculation during validation | Dataset detail view |
| F2.4 | List and filter datasets | Dataset list with status, pagination | GET /api/datasets with filters | /datasets list page |
| F2.5 | View dataset details | Full dataset info, sample conversations | GET /api/datasets/[id] | /datasets/[id] detail page |
| F2.6 | Update dataset metadata | Name, description | PATCH /api/datasets/[id] | Edit modal |
| F2.7 | Delete datasets | Soft delete flag | DELETE /api/datasets/[id] | Delete confirmation |

**Ignore from Spec**: BullMQ validation worker, Redis setup  
**Alternative**: Use Supabase Edge Functions or simple cron-triggered validation

---

### Section 3: Training Configuration

**Spec Describes**: Configure training jobs with hyperparameter presets, GPU selection, cost estimation

| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F3.1 | Hyperparameter preset system | Preset definitions (Conservative/Balanced/Aggressive) | Preset selection logic | /training/configure preset selector |
| F3.2 | Advanced hyperparameter editing | Learning rate, batch size, epochs, LoRA params | Form state management | Advanced settings panel |
| F3.3 | GPU configuration selection | GPU types, counts | GPU options config | GPU selector dropdown |
| F3.4 | Cost estimation calculator | Cost per GPU-hour, duration estimate | POST /api/jobs/estimate | Real-time cost display |
| F3.5 | Create training job | Job configuration | POST /api/jobs | Submit button → navigate to monitor |

---

### Section 4: Training Execution & Monitoring

**Spec Describes**: Execute training jobs on external GPU cluster, real-time progress monitoring

| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F4.1 | Submit job to external GPU cluster | Job config, dataset S3 key | Integration with GPU cluster API | Background job submission |
| F4.2 | Poll GPU cluster for status updates | Job status, progress, metrics | Polling logic in cron/Edge Function | N/A (server-side) |
| F4.3 | Store metrics history | Training loss, validation loss, GPU util | MetricsPoint inserts | N/A (server-side) |
| F4.4 | Real-time progress updates | Current status, epoch, loss, cost | GET /api/jobs/[id] with polling | /training/jobs/[id] monitor page |
| F4.5 | Display loss curves | Metrics time series | Chart data from MetricsPoint | Recharts line chart |
| F4.6 | Cancel running jobs | Cancel request to GPU cluster | POST /api/jobs/[id]/cancel | Cancel button |
| F4.7 | Handle job completion | Create model artifact, cleanup | Job completion handler | Redirect to models page |
| F4.8 | Handle job failure | Store error message, retry logic | Error handling | Error display |

**Ignore from Spec**: BullMQ worker, Redis queue, SSE streaming  
**Alternative**: Use React Query polling (every 5 seconds) for real-time updates. Simpler and works well for this use case.

---

### Section 5: Model Artifacts & Delivery

**Spec Describes**: Store trained models, display quality metrics, provide downloads

| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F5.1 | Store model artifacts in storage | Model files (adapter, config, tokenizer) | Upload to Supabase Storage | N/A (server-side) |
| F5.2 | Calculate quality metrics | Final loss, convergence, perplexity | Quality calculation from metrics | Quality display |
| F5.3 | List user's models | Model metadata, quality scores | GET /api/models | /models list page |
| F5.4 | View model details | Full training summary, config, metrics | GET /api/models/[id] | /models/[id] detail page |
| F5.5 | Generate download URLs | Presigned URLs for artifacts | GET /api/models/[id]/download | Download buttons |
| F5.6 | Track model versions | Parent-child relationships | Version tracking in DB | Version history display |

---

### Section 6: Cost Tracking & Notifications

**Spec Describes**: Track costs in real-time, send notifications

| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F6.1 | Real-time cost tracking | Cost records by type | Cost inserts during training | Cost display on job monitor |
| F6.2 | Cost breakdown | Compute, storage, data transfer | Cost aggregation queries | Cost breakdown view |
| F6.3 | Budget alerts | User budget threshold, current spend | Alert check logic | Budget alert banner |
| F6.4 | Job notifications | Job complete, job failed | Notification inserts | Notification dropdown/page |
| F6.5 | Cost analytics | Historical cost data, trends | GET /api/costs | /costs analytics page (optional) |

---

## INFRASTRUCTURE MAPPING

For each infrastructure component from existing codebase, define how new features use it:

---

### Authentication

**Existing**: Supabase Auth (cookie-based, SSR-ready)  
**Functions Available**: `requireAuth()`, `useAuth()`, `AuthService`

**New Module Uses It For**:
- ✅ All API route authentication
- ✅ User identification (dataset ownership, job ownership)
- ✅ Page protection (all dashboard routes)
- ✅ Session management

**No Changes Needed**: Use existing `requireAuth()` pattern in all new API routes  
**Pattern to Follow**:
```typescript
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  // user.id available for queries
}
```

---

### Database

**Existing**: Supabase PostgreSQL with direct client (no ORM)  
**Functions Available**: `createServerSupabaseClient()`, query builder

**New Module Uses It For**: All new tables and queries

**New Tables to Add**:

| Table | Purpose | Key Fields | Relationships |
|-------|---------|------------|---------------|
| `datasets` | Store uploaded dataset metadata | id, user_id, name, status, storage_path, file_size, total_training_pairs, created_at | user_id → auth.users(id) |
| `training_jobs` | Track training job status and progress | id, user_id, dataset_id, status, config (JSONB), current_metrics (JSONB), external_job_id, created_at | user_id → auth.users(id), dataset_id → datasets(id) |
| `metrics_points` | Store time-series training metrics | id, job_id, timestamp, epoch, step, training_loss, validation_loss, learning_rate | job_id → training_jobs(id) |
| `checkpoints` | Store checkpoint metadata | id, job_id, step, epoch, loss, storage_path | job_id → training_jobs(id) |
| `model_artifacts` | Store trained model metadata | id, user_id, job_id, name, status, quality_metrics (JSONB), storage_paths (JSONB), created_at | user_id → auth.users(id), job_id → training_jobs(id) |
| `cost_records` | Track costs by type | id, user_id, job_id, cost_type, amount, recorded_at | user_id → auth.users(id), job_id → training_jobs(id) |
| `notifications` | User notifications | id, user_id, type, title, message, read, created_at | user_id → auth.users(id) |

**Query Pattern**: Same as existing (Supabase query builder)

---

### Storage

**Existing**: Supabase Storage with on-demand signed URLs  
**Buckets Available**: `conversation-files` (for existing feature)

**New Module Uses It For**: Dataset file uploads, model artifact storage

**New Buckets to Create**:
- ✅ `lora-datasets` - For uploaded training data files (.jsonl, .json)
  - Private bucket
  - Max file size: 500MB
  - Path pattern: `{user_id}/{dataset_id}/{filename}`
- ✅ `lora-models` - For trained model files (.safetensors, .json)
  - Private bucket
  - Max file size: 5GB
  - Path pattern: `{user_id}/{model_id}/{artifact_type}/{filename}`

**Pattern to Follow**: On-demand signed URL generation (same as existing)
- Store only `storage_path` in database (never URLs)
- Generate signed URLs via API routes when user requests download
- Use `createServerSupabaseAdminClient()` for signing

---

### API Routes

**Existing**: Next.js API routes with consistent response format  
**Pattern**: `{ success: true, data }` or `{ error, details }`

**New Module Uses It For**: All new endpoints

**New Endpoints to Create**:

**Datasets API** (`/api/datasets/*`):
- `POST /api/datasets` - Create dataset, return upload URL
- `POST /api/datasets/[id]/confirm` - Confirm upload, trigger validation
- `GET /api/datasets` - List datasets with pagination/filtering
- `GET /api/datasets/[id]` - Get dataset details
- `PATCH /api/datasets/[id]` - Update dataset metadata
- `DELETE /api/datasets/[id]` - Soft delete dataset

**Training API** (`/api/training/*` or `/api/jobs/*`):
- `POST /api/jobs/estimate` - Estimate training cost and duration
- `POST /api/jobs` - Create and submit training job
- `GET /api/jobs` - List training jobs with filters
- `GET /api/jobs/[id]` - Get job details with full metrics
- `POST /api/jobs/[id]/cancel` - Cancel running job
- `GET /api/jobs/[id]/metrics` - Get metrics history for charts

**Models API** (`/api/models/*`):
- `GET /api/models` - List user's trained models
- `GET /api/models/[id]` - Get model details
- `GET /api/models/[id]/download` - Generate presigned download URLs
- `PATCH /api/models/[id]` - Update model metadata
- `DELETE /api/models/[id]` - Soft delete model

**Costs API** (`/api/costs/*`):
- `GET /api/costs` - Get cost records with filtering
- `GET /api/costs/summary` - Get current month summary

**Notifications API** (`/api/notifications/*`):
- `GET /api/notifications` - List user's notifications
- `PATCH /api/notifications/[id]/read` - Mark notification as read

---

### Components

**Existing**: 47+ shadcn/ui components (Button, Card, Dialog, Table, Progress, Badge, etc.)  
**Pattern**: Use `cn()` for class merging, Tailwind CSS for styling

**New Module Uses It For**: All UI

**Components to Reuse** (from `/components/ui/`):
- Button, Card, Dialog, Alert, Badge, Progress, Table, Tabs, Select, Input, Textarea, Label, Checkbox, RadioGroup, Switch, Slider, Toast (Sonner), DropdownMenu, Popover, Tooltip, Skeleton, ScrollArea, Separator, Sheet, Accordion, AlertDialog, Calendar, Chart (Recharts)

**New Components to Create** (in `/components/datasets/`, `/components/training/`, `/components/models/`):

**Dataset Components** (`/components/datasets/`):
- `DatasetCard` - Display dataset summary card
- `DatasetUploadForm` - Multi-step upload form with drag-and-drop
- `DatasetDetailView` - Full dataset information display
- `DatasetStatsPanel` - Statistics visualization
- `DatasetStatusBadge` - Status indicator with colors
- `DatasetValidationReport` - Validation errors/warnings display

**Training Components** (`/components/training/`):
- `PresetSelector` - Hyperparameter preset buttons
- `HyperparameterForm` - Advanced settings form with sliders
- `GPUConfigSelector` - GPU type and count selection
- `CostEstimator` - Real-time cost calculation display
- `TrainingConfigSummary` - Review configuration before submission

**Job Monitor Components** (`/components/training/`):
- `JobStatusCard` - Current job status and progress
- `JobStageIndicator` - Visual stage progress (queued → running → complete)
- `MetricsDisplay` - Current metrics (loss, learning rate, throughput)
- `LossCurveChart` - Line chart with Recharts (training vs validation loss)
- `CostTracker` - Real-time cost accumulation
- `JobLogsPanel` - Scrollable log display (if available)

**Model Components** (`/components/models/`):
- `ModelArtifactCard` - Model summary card with quality score
- `ModelDetailView` - Full model information
- `QualityMetricsPanel` - Quality metrics visualization
- `TrainingSummaryPanel` - Training job summary
- `DownloadPanel` - Download buttons for each artifact type
- `ModelVersionHistory` - Parent-child model versions

**Common Components** (`/components/common/` or `/components/shared/`):
- `StatsCard` - Reusable stat display card
- `StatusBadge` - Generic status badge with color mapping
- `EmptyState` - Empty state with call-to-action
- `ErrorDisplay` - Error message display
- `LoadingSpinner` - Loading indicator

---

### State/Data Fetching

**Existing**: React Query v5.90.5 with custom hooks pattern  
**Configuration**: 60-second stale time, 1 retry, no refetch on focus

**New Module Uses It For**: All data fetching for new features

**New Hooks to Create** (in `/hooks/`):

**Dataset Hooks** (`/hooks/use-datasets.ts`):
- `useDatasets(filters?)` - Fetch datasets list with optional filters
- `useDataset(id)` - Fetch single dataset details
- `useCreateDataset()` - Create dataset mutation
- `useUpdateDataset()` - Update dataset mutation
- `useDeleteDataset()` - Delete dataset mutation
- `useDatasetUploadUrl(datasetId)` - Get presigned upload URL

**Training Job Hooks** (`/hooks/use-training-jobs.ts`):
- `useTrainingJobs(filters?)` - Fetch jobs list
- `useTrainingJob(id)` - Fetch single job (with polling if running)
- `useJobMetrics(id)` - Fetch metrics history for charts
- `useEstimateCost(config)` - Estimate cost (debounced)
- `useCreateTrainingJob()` - Create job mutation
- `useCancelTrainingJob()` - Cancel job mutation

**Model Hooks** (`/hooks/use-models.ts`):
- `useModels(filters?)` - Fetch models list
- `useModel(id)` - Fetch single model details
- `useModelDownloadUrls(id)` - Get presigned download URLs
- `useUpdateModel()` - Update model mutation
- `useDeleteModel()` - Delete model mutation

**Cost Hooks** (`/hooks/use-costs.ts`):
- `useCosts(filters?)` - Fetch cost records
- `useCostSummary()` - Fetch current month summary

**Notification Hooks** (`/hooks/use-notifications.ts`):
- `useNotifications()` - Fetch notifications (with polling)
- `useMarkNotificationRead()` - Mark notification as read mutation

**Polling Pattern** (for real-time updates):
```typescript
export function useTrainingJob(jobId: string) {
  return useQuery({
    queryKey: ['training-jobs', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job');
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll every 5 seconds if job is running
      const status = data?.data?.status;
      if (status === 'queued' || status === 'initializing' || status === 'running') {
        return 5000;
      }
      // Stop polling if completed/failed
      return false;
    },
  });
}
```

---

## PAGE STRUCTURE

Define new pages that will be added to the application:

**Route Group**: `(dashboard)` (protected by existing layout)

**New Routes:**

```
/datasets                           → Datasets list page
/datasets/new                       → Upload new dataset (modal or page)
/datasets/[id]                      → Dataset detail page
/training/configure                 → Training configuration page
  ?datasetId=[id]                   → Pre-select dataset via query param
/training/jobs                      → Training jobs list page
/training/jobs/[id]                 → Job monitor page (real-time)
/models                             → Trained models list page
/models/[id]                        → Model detail/download page
/costs (optional)                   → Cost analytics page
/notifications (optional)           → Notifications page (or dropdown in header)
```

**Navigation Updates**:

Need to extend sidebar navigation (if sidebar exists) or add top navigation items:
- "Datasets" → `/datasets`
- "Training" → `/training/jobs` (or submenu: Jobs, Configure)
- "Models" → `/models`

**Layout**:
- All pages use existing `DashboardLayout` from `(dashboard)` route group
- No new layouts needed
- Sidebar/Header may need new navigation items

---

## BACKGROUND PROCESSING

**Spec Recommends**: BullMQ + Redis queue for dataset validation and job status polling

**Our Decision**: SKIP BullMQ/Redis (too complex for this use case)

**Alternative Approach**:

1. **Dataset Validation** (when user uploads file):
   - **Option A**: Trigger Supabase Edge Function immediately after upload confirmed
   - **Option B**: Use Next.js API route that processes validation synchronously (if fast enough)
   - **Option C**: Use cron job that checks for `status='uploaded'` and validates in batches
   - **Recommendation**: Option A (Edge Function) - runs validation asynchronously without queue

2. **Training Job Status Polling** (poll external GPU cluster for updates):
   - **Option A**: Supabase Edge Function triggered every 30 seconds via Supabase Cron
   - **Option B**: Next.js cron API route (vercel.json cron config)
   - **Option C**: Client-side polling only (inefficient but simple)
   - **Recommendation**: Option A (Edge Function + Cron) - server-side polling updates database

**Supabase Edge Function Example**:
```typescript
// supabase/functions/poll-training-jobs/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Fetch running jobs
  const { data: jobs } = await supabase
    .from('training_jobs')
    .select('*')
    .in('status', ['queued', 'initializing', 'running']);
  
  // Poll GPU cluster for each job
  for (const job of jobs) {
    const gpuStatus = await fetch(`${GPU_API_URL}/jobs/${job.external_job_id}`);
    const statusData = await gpuStatus.json();
    
    // Update job in database
    await supabase
      .from('training_jobs')
      .update({
        status: statusData.status,
        current_metrics: statusData.metrics,
        progress: statusData.progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    
    // Insert metrics point
    if (statusData.metrics) {
      await supabase
        .from('metrics_points')
        .insert({
          job_id: job.id,
          timestamp: new Date().toISOString(),
          epoch: statusData.metrics.epoch,
          step: statusData.metrics.step,
          training_loss: statusData.metrics.training_loss,
          validation_loss: statusData.metrics.validation_loss,
          learning_rate: statusData.metrics.learning_rate,
        });
    }
  }
  
  return new Response('OK');
});
```

**Cron Trigger** (in Supabase Dashboard → Edge Functions → Cron):
- Function: `poll-training-jobs`
- Schedule: `*/30 * * * * *` (every 30 seconds)

---

## WHAT TO CREATE

### New Database Tables (7 tables)
1. ✅ `datasets` - Dataset metadata and validation status
2. ✅ `training_jobs` - Training job configuration and status
3. ✅ `metrics_points` - Time-series training metrics
4. ✅ `checkpoints` - Checkpoint metadata (optional - may skip if not needed)
5. ✅ `model_artifacts` - Trained model metadata
6. ✅ `cost_records` - Cost tracking records
7. ✅ `notifications` - User notifications

### New Storage Buckets (2 buckets)
1. ✅ `lora-datasets` - Dataset files
2. ✅ `lora-models` - Model artifacts

### New API Routes (~25 routes)
- Datasets: 6 routes
- Training Jobs: 6 routes
- Models: 5 routes
- Costs: 2 routes (optional)
- Notifications: 2 routes (optional)

### New Pages (8-10 pages)
- `/datasets` - List page
- `/datasets/[id]` - Detail page
- `/training/configure` - Configuration page
- `/training/jobs` - Jobs list page
- `/training/jobs/[id]` - Monitor page
- `/models` - List page
- `/models/[id]` - Detail page
- `/costs` - Analytics page (optional)

### New Components (~25-30 components)
- Dataset components: 6
- Training components: 10
- Model components: 6
- Common components: 5

### New Hooks (~15 hooks)
- Dataset hooks: 6
- Training hooks: 6
- Model hooks: 5
- Cost hooks: 2
- Notification hooks: 2

### New Types (1 file)
- `/lib/types/lora-training.ts` - All interfaces for LoRA training module

### New Background Processing
- 1-2 Supabase Edge Functions (validation, job polling)
- Cron triggers configured in Supabase Dashboard

---

## WHAT NOT TO CREATE

### ❌ Do NOT Create New Authentication
- **Reason**: Supabase Auth already exists and works perfectly
- **Ignore from spec**: All NextAuth.js setup, JWT configuration, session management

### ❌ Do NOT Create New Database Client
- **Reason**: Supabase client already exists
- **Ignore from spec**: All Prisma setup, schema.prisma file, Prisma migrations, Prisma client generation

### ❌ Do NOT Create BullMQ + Redis Queue
- **Reason**: Too complex for this use case, adds infrastructure dependency
- **Ignore from spec**: BullMQ worker setup, Redis configuration, job queue management
- **Alternative**: Use Supabase Edge Functions with cron triggers

### ❌ Do NOT Create SSE Streaming Infrastructure
- **Reason**: React Query polling works well enough for this use case
- **Ignore from spec**: Server-Sent Events endpoints, EventSource connections
- **Alternative**: Use React Query with `refetchInterval` for real-time updates

### ❌ Do NOT Create New Component Library
- **Reason**: 47+ shadcn/ui components already available
- **Ignore from spec**: Any component installation instructions, shadcn CLI usage

### ❌ Do NOT Create New State Management System
- **Reason**: React Query already configured
- **Ignore from spec**: SWR setup from spec (use React Query instead)

### ❌ Do NOT Create Separate S3 Integration
- **Reason**: Supabase Storage already works and is simpler
- **Ignore from spec**: AWS S3 SDK, S3 bucket configuration, IAM credentials

### ❌ Do NOT Create Separate Application
- **Reason**: This is an EXTENSION, not a separate app
- **Action**: Add new tables to existing database, new routes to existing API, new pages to existing app

---

## TECHNOLOGY SUBSTITUTIONS

**Spec Says → We Use**:

| Spec Technology | Our Technology | Reason |
|----------------|----------------|--------|
| Prisma ORM | Supabase Client (direct queries) | Already in use, no need for ORM |
| NextAuth.js | Supabase Auth | Already in use, feature-complete |
| AWS S3 | Supabase Storage | Already in use, simpler API |
| BullMQ + Redis | Supabase Edge Functions + Cron | Simpler, no infrastructure overhead |
| Server-Sent Events (SSE) | React Query polling | Simpler, works well for 5-second intervals |
| SWR | React Query | Already in use |

---

## INTEGRATION POINTS

**How New Module Connects to Existing App**:

1. **Database**: New tables in same Supabase project, share `auth.users` via foreign keys
2. **Authentication**: All new API routes use existing `requireAuth()` function
3. **Storage**: New buckets in same Supabase project, same client
4. **Layout**: New pages render inside existing `(dashboard)` layout
5. **Navigation**: Add new items to sidebar/header navigation
6. **Components**: Import and reuse all shadcn/ui components
7. **State**: Use existing React Query provider, create new hooks
8. **Styling**: Use existing Tailwind config, same design tokens

---

## DEPLOYMENT CONSIDERATIONS

**No Infrastructure Changes Needed**:
- ✅ Same Supabase project
- ✅ Same Next.js app (Vercel deployment)
- ✅ Same domain/subdomain
- ✅ Same authentication cookies

**New Environment Variables Needed**:
```bash
GPU_CLUSTER_API_URL=https://gpu-cluster.example.com/api
GPU_CLUSTER_API_KEY=[api-key]
MAX_DATASET_SIZE_MB=500  # Optional, can have default
```

**New Supabase Resources to Create**:
- 2 storage buckets (via Dashboard)
- 7 database tables (via migrations)
- 1-2 Edge Functions (via Supabase CLI)
- Cron triggers (via Dashboard)

---

## FEATURE PRIORITY

**Phase 1 (MVP)**: Core dataset and training workflow
- ✅ Dataset upload and validation
- ✅ Training configuration
- ✅ Job submission to GPU cluster
- ✅ Basic job monitoring (polling)
- ✅ Model artifact storage and download

**Phase 2 (Enhanced)**: Better UX and monitoring
- ✅ Real-time job progress with charts
- ✅ Cost tracking
- ✅ Notifications

**Phase 3 (Optional)**: Advanced features
- ⚪ Model versioning and comparison
- ⚪ Hyperparameter search/optimization
- ⚪ Cost analytics and reporting
- ⚪ Dataset versioning

---

## VALIDATION

**Before Implementation, Verify**:
- [ ] All new API routes use `requireAuth()` from existing codebase
- [ ] All new database tables use Supabase client (not Prisma)
- [ ] All new storage operations use Supabase Storage (not S3)
- [ ] All new components import from `/components/ui/` (shadcn)
- [ ] All new hooks use React Query (not SWR)
- [ ] All new pages render in `(dashboard)` route group
- [ ] No BullMQ/Redis infrastructure created
- [ ] No NextAuth setup created
- [ ] No Prisma setup created

---

## SUMMARY

**Approach**: EXTENSION (using existing infrastructure)

**Key Principles**:
1. ✅ Extract FEATURES from spec (dataset management, training, monitoring, delivery)
2. ✅ Implement features using EXISTING infrastructure (Supabase Auth, Supabase DB, Supabase Storage, shadcn/ui, React Query)
3. ✅ Ignore spec's infrastructure choices (Prisma, NextAuth, S3, BullMQ)
4. ✅ Only CREATE NEW what's specific to LoRA training (tables, APIs, pages, components)
5. ✅ Zero breaking changes to existing features

**Result**: A cohesive LoRA Training module that sits alongside the existing conversation generation features, sharing the same authentication, database, storage, and component library.

**Next Step**: Proceed to Implementation Guide for exact code to write.

---

**Document Version**: 1.0  
**Date**: December 23, 2024  
**Status**: Complete - Ready for Implementation Guide

