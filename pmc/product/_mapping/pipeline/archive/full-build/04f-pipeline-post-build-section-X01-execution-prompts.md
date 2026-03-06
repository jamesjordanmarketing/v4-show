# PIPELINE - Section X01: Missing Pages Implementation - Execution Prompts

**Product:** PIPELINE  
**Section:** X01 - Post-Build Missing Pages  
**Generated:** December 31, 2025  
**Total Prompts:** 1  
**Estimated Total Time:** 6-7 hours  
**Source:** Missing pages identified from E01-E07 execution prompts  
**Version:** 1.0 - Initial implementation

---

## Section Overview

This section implements pages that were specified in Sections E01-E07 but were not created during the initial build. These pages are critical for complete application functionality and proper user experience.

**User Value:** Complete the LoRA Training Platform with all essential user-facing pages for dataset management, training monitoring, and cost analytics.

---

## Missing Pages Identified

From comprehensive review of E01-E07 execution prompts:

1. **Dataset Detail Page** (`/datasets/[id]`) - Specified in E02, E07
2. **Training Jobs List Page** (`/training/jobs`) - Natural extension of `/training/jobs/[jobId]`
3. **Costs Analytics Page** (`/costs`) - Specified in E06

**All APIs already exist** - only frontend pages are missing.

---

## Prompt Sequence for This Section

This section has **1 comprehensive prompt**:

1. **Prompt P01: Implement Missing Pages** (6-7h)
   - Features: 3 new pages with full functionality
   - Key Deliverables: Dataset detail view, jobs list, cost analytics dashboard

---

## Integration Context

### Dependencies

**From Section E01:** Database tables, type definitions, auth system  
**From Section E02:** Dataset API endpoints (`GET /api/datasets/[id]`)  
**From Section E03:** Training jobs creation  
**From Section E04:** Job monitoring API (`GET /api/jobs`, `GET /api/jobs/[jobId]`)  
**From Section E06:** Cost tracking API (`GET /api/costs`)  

### What Already Exists

✅ All required API endpoints  
✅ React hooks for data fetching  
✅ UI component library (shadcn/ui)  
✅ Type definitions  
✅ Authentication system  
✅ Existing page patterns to follow  

### What We're Building

🆕 `src/app/(dashboard)/datasets/[id]/page.tsx` - Dataset detail page  
🆕 `src/app/(dashboard)/training/jobs/page.tsx` - Training jobs list  
🆕 `src/app/(dashboard)/costs/page.tsx` - Cost analytics page  

---

# PROMPT 1: Implement Missing Pages

**Generated:** 2025-12-31  
**Section:** X01 - Missing Pages Implementation  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 6-7 hours  
**Prerequisites:** Sections E01-E07 completed

---

## 🎯 Mission Statement

Implement the three missing pages that were specified in the original execution prompts but not created during the initial build. All necessary APIs and backend infrastructure already exist - this prompt focuses solely on creating the frontend pages following established patterns.

---

## 📦 Context

### Existing Patterns to Follow

All pages in this app follow consistent patterns. Study these examples:

**List Page Pattern:**
- Example: `src/app/(dashboard)/datasets/page.tsx`
- Pattern: Search, filters, grid/list view, loading states

**Detail Page Pattern:**  
- Example: `src/app/(dashboard)/training/jobs/[jobId]/page.tsx`
- Pattern: Param extraction, data fetching, sections, actions

**Hooks Pattern:**
- Example: `src/hooks/use-datasets.ts`
- Uses: `@tanstack/react-query`, `toast` from `sonner`

---

## 🔗 Integration Points

### APIs You'll Use

**Dataset Detail:**
```typescript
// GET /api/datasets/[id]
// Returns: Dataset with validation results, stats, sample data
const { data, isLoading } = useDataset(datasetId);
```

**Training Jobs List:**
```typescript
// GET /api/jobs?status=X&sort=X
// Returns: Array of training jobs
const { data, isLoading } = useTrainingJobs({ status, sort });
```

**Costs Analytics:**
```typescript
// GET /api/costs?start_date=X&end_date=X
// Returns: Cost records, aggregates, breakdown
const { data, isLoading } = useCosts({ startDate, endDate });
```

### Components You'll Use

All from `@/components/ui`:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Button`
- `Badge`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Skeleton`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

### Icons (lucide-react)

Use these existing icons:
- `Database`, `Loader2`, `Download`, `ArrowLeft`
- `TrendingUp`, `TrendingDown`, `DollarSign`
- `CheckCircle`, `XCircle`, `Clock`

---

## 🎯 Implementation Requirements

### Task 1: Dataset Detail Page

**Route:** `/datasets/[id]`  
**File:** `src/app/(dashboard)/datasets/[id]/page.tsx`  
**API:** `GET /api/datasets/[id]` (already exists)

#### Description

Shows comprehensive details about a specific dataset including validation status, statistics, errors, and sample data.

#### What Already Exists
- ✅ API endpoint returns all needed data
- ✅ Type definition: `Dataset` in `@/lib/types/lora-training.ts`
- ✅ Hook may exist: check `use-datasets.ts` for `useDataset(id)`

#### What We're Building
- 🆕 Dataset detail page component
- 🆕 Hook `useDataset(id)` if doesn't exist
- 🆕 Sample data display component (optional)

#### Implementation

**Step 1: Check if hook exists**

```bash
# Check if useDataset already exists
grep -n "useDataset" src/hooks/use-datasets.ts
```

If it doesn't exist, add to `src/hooks/use-datasets.ts`:

```typescript
export function useDataset(id: string | null) {
  return useQuery({
    queryKey: ['dataset', id],
    queryFn: async () => {
      if (!id) throw new Error('Dataset ID required');
      
      const response = await fetch(`/api/datasets/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      
      return response.json();
    },
    enabled: !!id,
  });
}
```

**Step 2: Create the page**

**File:** `src/app/(dashboard)/datasets/[id]/page.tsx`

```typescript
'use client';

import { use} from 'react';
import { useDataset } from '@/hooks/use-datasets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, ArrowLeft, Trash2, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Dataset, ValidationError } from '@/lib/types/lora-training';

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useDataset(id);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load dataset</h3>
        <p className="text-gray-500 mb-4">
          {error instanceof Error ? error.message : 'Dataset not found'}
        </p>
        <Button onClick={() => router.push('/datasets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Datasets
        </Button>
      </div>
    );
  }

  const dataset: Dataset = data.data.dataset;

  // Status badge configuration
  const statusConfig = {
    uploading: { color: 'bg-blue-500', label: 'Uploading' },
    validating: { color: 'bg-yellow-500', label: 'Validating' },
    ready: { color: 'bg-green-500', label: 'Ready' },
    error: { color: 'bg-red-500', label: 'Error' },
  };

  const status = statusConfig[dataset.status] || statusConfig.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/datasets')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-gray-500 mt-1">{dataset.file_name}</p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Description */}
      {dataset.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{dataset.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {dataset.training_ready && (
        <Card>
          <CardHeader>
            <CardTitle>Dataset Statistics</CardTitle>
            <CardDescription>Summary of training data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Training Pairs</div>
                <div className="text-2xl font-bold">
                  {dataset.total_training_pairs?.toLocaleString() || '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Validation Pairs</div>
                <div className="text-2xl font-bold">
                  {dataset.total_validation_pairs?.toLocaleString() || '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Tokens</div>
                <div className="text-2xl font-bold">
                  {dataset.total_tokens?.toLocaleString() || '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Avg Turns</div>
                <div className="text-2xl font-bold">
                  {dataset.avg_turns_per_conversation?.toFixed(1) || '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {dataset.status === 'error' && dataset.validation_errors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Validation Errors</CardTitle>
            <CardDescription>
              {dataset.validation_errors.length} error(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataset.validation_errors.map((err: ValidationError, idx: number) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-red-800">Line {err.line}</div>
                  <div className="text-sm text-red-700">{err.error}</div>
                  {err.suggestion && (
                    <div className="text-sm text-red-600 mt-1">
                      💡 {err.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Preview */}
      {dataset.sample_data && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Data</CardTitle>
            <CardDescription>Preview of dataset content</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
              {JSON.stringify(dataset.sample_data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Format:</span>
              <span className="ml-2 font-medium">{dataset.format}</span>
            </div>
            <div>
              <span className="text-gray-600">File Size:</span>
              <span className="ml-2 font-medium">
                {(dataset.file_size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 font-medium">
                {new Date(dataset.created_at).toLocaleString()}
              </span>
            </div>
            {dataset.validated_at && (
              <div>
                <span className="text-gray-600">Validated:</span>
                <span className="ml-2 font-medium">
                  {new Date(dataset.validated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button
          onClick={() => router.push('/datasets')}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Datasets
        </Button>
        {dataset.status === 'ready' && (
          <Button
            onClick={() => router.push(`/training/configure?datasetId=${dataset.id}`)}
            className="flex-1"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Training
          </Button>
        )}
        <Button
          variant="destructive"
          size="icon"
          onClick={() => {
            if (confirm(`Delete dataset "${dataset.name}"?`)) {
              // Implement delete
              fetch(`/api/datasets/${dataset.id}`, { method: 'DELETE' })
                .then(() => router.push('/datasets'));
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 2: Training Jobs List Page

**Route:** `/training/jobs`  
**File:** `src/app/(dashboard)/training/jobs/page.tsx`  
**API:** `GET /api/jobs` (already exists)

#### Description

Lists all training jobs with filtering, sorting, and navigation to individual job details.

#### What Already Exists
- ✅ API endpoint returns jobs list
- ✅ Individual job page exists at `/training/jobs/[jobId]`
- ✅ Hook may exist: check for `useTrainingJobs()`

#### What We're Building
- 🆕 Training jobs list page
- 🆕 Hook `useTrainingJobs()` if doesn't exist
- 🆕 Job card component (optional)

#### Implementation

**Step 1: Check for existing hooks**

Check `src/hooks/` for any `useTrainingJobs` or `useJobs` hooks.

If doesn't exist, create `src/hooks/use-training-jobs.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

interface UseTrainingJobsParams {
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useTrainingJobs(params?: UseTrainingJobsParams) {
  return useQuery({
    queryKey: ['training-jobs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/jobs?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch training jobs');
      }
      
      return response.json();
    },
  });
}
```

**Step 2: Create the page**

**File:** `src/app/(dashboard)/training/jobs/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useTrainingJobs } from '@/hooks/use-training-jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, TrendingUp, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TrainingJob } from '@/lib/types/lora-training';

export default function TrainingJobsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data, isLoading, error } = useTrainingJobs({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load jobs</h3>
        <p className="text-gray-500">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  const jobs: TrainingJob[] = data?.data?.jobs || [];

  // Status badge configuration
  const statusConfig = {
    queued: { color: 'bg-gray-500', label: 'Queued' },
    initializing: { color: 'bg-blue-500', label: 'Initializing' },
    running: { color: 'bg-yellow-500', label: 'Running' },
    completed: { color: 'bg-green-500', label: 'Completed' },
    failed: { color: 'bg-red-500', label: 'Failed' },
    cancelled: { color: 'bg-gray-400', label: 'Cancelled' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Training Jobs</h1>
          <p className="text-gray-500 mt-1">Monitor all your training jobs</p>
        </div>
        <Button onClick={() => router.push('/training/configure')}>
          New Training Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Total Jobs</div>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Running</div>
              <div className="text-2x font-bold text-yellow-600">
                {jobs.filter(j => j.status === 'running').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">
                {jobs.filter(j => j.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {jobs.filter(j => j.status === 'failed').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No training jobs yet</h3>
          <p className="text-gray-500 mb-4">
            Start your first training job to see it here
          </p>
          <Button onClick={() => router.push('/training/configure')}>
            Configure Training
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/training/jobs/${job.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {job.preset_id.charAt(0).toUpperCase() + job.preset_id.slice(1)} Training
                    </CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(job.queued_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge className={statusConfig[job.status]?.color}>
                    {statusConfig[job.status]?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress */}
                {job.status === 'running' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">GPU</div>
                    <div className="font-medium">{job.gpu_config.gpu_type}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Cost</div>
                    <div className="font-medium flex items-center">
                      <DollarSign className="h-3 w-3" />
                      {job.status === 'completed' 
                        ? job.final_cost?.toFixed(2)
                        : job.current_cost.toFixed(2)}
                    </div>
                  </div>
                  {job.status === 'running' && (
                    <>
                      <div>
                        <div className="text-gray-600">Epoch</div>
                        <div className="font-medium">
                          {job.current_epoch}/{job.total_epochs}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Step</div>
                        <div className="font-medium">
                          {job.current_step}/{job.total_steps || '—'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Error message */}
                {job.status === 'failed' && job.error_message && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {job.error_message}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Task 3: Cost Analytics Page

**Route:** `/costs`  
**File:** `src/app/(dashboard)/costs/page.tsx`  
**API:** `GET /api/costs` (already exists)

#### Description

Displays cost analytics dashboard with charts, filters, and breakdown tables.

#### What Already Exists
- ✅ API endpoint returns cost data with aggregates
- ✅ `recharts` library in dependencies
- ✅ Type definitions for cost records

#### What We're Building  
- 🆕 Cost analytics dashboard page
- 🆕 Hook `useCosts()` if doesn't exist
- 🆕 Simple charts using recharts

#### Implementation

**Step 1: Create hook if needed**

Check for existing cost hooks. If none, create `src/hooks/use-costs.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

interface UseCostsParams {
  startDate?: string;
  endDate?: string;
}

export function useCosts(params?: UseCostsParams) {
  return useQuery({
    queryKey: ['costs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set('start_date', params.startDate);
      if (params?.endDate) searchParams.set('end_date', params.endDate);

      const response = await fetch(`/api/costs?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch costs');
      }
      
      return response.json();
    },
  });
}
```

**Step 2: Create the page**

**File:** `src/app/(dashboard)/costs/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useCosts } from '@/hooks/use-costs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, Download } from 'lucide-react';
import type { CostRecord } from '@/lib/types/lora-training';

export default function CostsPage() {
  const [timeRange, setTimeRange] = useState<string>('30');
  
  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, isLoading, error } = useCosts({ startDate, endDate });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load costs</h3>
        <p className="text-gray-500">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
      </div>
    );
  }

  const costs: CostRecord[] = data?.data?.costs || [];
  const summary = data?.data?.summary || {
    total_cost: 0,
    job_count: 0,
    avg_cost_per_job: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Cost Analytics</h1>
          <p className="text-gray-500 mt-1">Track your training costs</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center">
              <DollarSign className="h-6 w-6" />
              {summary.total_cost.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Training Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.job_count}</div>
            <p className="text-xs text-gray-500 mt-1">
              Completed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg per Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center">
              <DollarSign className="h-6 w-6" />
              {summary.avg_cost_per_job.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Detailed cost records</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Simple CSV export
                const csv = [
                  ['Date', 'Type', 'Amount', 'Job ID'].join(','),
                  ...costs.map(c => [
                    c.recorded_at,
                    c.cost_type,
                    c.amount,
                    c.job_id || 'N/A'
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `costs-${startDate}-to-${endDate}.csv`;
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {costs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No cost records in this time period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      {new Date(cost.recorded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {cost.cost_type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cost.details && (
                        <div className="text-sm text-gray-600">
                          {cost.details.gpu_type} × {cost.details.gpu_count}
                          {cost.details.duration_hours && (
                            <> ({cost.details.duration_hours.toFixed(1)}h)</>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${cost.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Manual Testing

**For Each Page:**

1. **Build Verification**
```bash
cd src
npm run build
```

2. **Start Dev Server**
```bash
npm run dev
```

3. **Test Navigation**
- Navigate to page
- Verify no console errors
- Test all interactive elements
- Verify data displays correctly

### Specific Tests

**Dataset Detail Page:**
- [ ] Navigate to `/datasets/[id]` with valid ID
- [ ] Verify dataset name, status badge, description show
- [ ] Verify statistics display (if ready)
- [ ] Verify validation errors display (if error status)
- [ ] Click "Start Training" → navigates to `/training/configure?datasetId=X`
- [ ] Click "Back" → navigates to `/datasets`
- [ ] Click Delete → shows confirmation, deletes dataset

**Training Jobs List:**
- [ ] Navigate to `/training/jobs`
- [ ] Verify jobs list displays
- [ ] Test status filter (each option)
- [ ] Verify stats cards show correct counts
- [ ] Click job card → navigates to `/training/jobs/[jobId]`
- [ ] If no jobs, verify empty state displays

**Costs Page:**
- [ ] Navigate to `/costs`
- [ ] Verify summary cards display
- [ ] Test time range selector (7/30/90 days)
- [ ] Verify cost table populates
- [ ] Click "Export CSV" → downloads file
- [ ] Verify CSV contains correct data

---

## 📝 Completion Checklist

### Before Calling This Done

- [ ] All 3 pages created
- [ ] All hooks created (if needed)
- [ ] Build succeeds (`npm run build` in `src/`)
- [ ] No TypeScript errors
- [ ] No console errors when navigating to pages
- [ ] Manually tested each page functionality
- [ ] Navigation between pages works
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly (where applicable)

---

## 🎯 Success Criteria

**You're done when:**

1. ✅ All 3 pages exist and render without errors
2. ✅ All navigation links work correctly
3. ✅ Data fetching and display works
4. ✅ User can complete these flows:
   - View dataset details → Start training
   - Browse training jobs → View job details
   - View cost analytics → Export CSV
5. ✅ Build completes successfully
6. ✅ No TypeScript/lint errors

---

## 📚 Reference Patterns

**Study These Files:**
- `src/app/(dashboard)/datasets/page.tsx` - List page pattern
- `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` - Detail page pattern
- `src/hooks/use-datasets.ts` - Hook pattern
- `src/app/api/datasets/route.ts` - API pattern

**Don't Reinvent:**
- Use existing components from `@/components/ui`
- Follow existing hook patterns with `@tanstack/react-query`
- Use `sonner` for toast notifications
- Match existing styling and layouts

---

**Good luck! 🚀**
