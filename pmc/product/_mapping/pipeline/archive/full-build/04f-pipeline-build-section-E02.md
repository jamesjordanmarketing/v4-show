# Build Section E02

**Product**: PIPELINE  
**Section**: 2 - Dataset Management  
**Generated**: 2025-12-26  
**Source**: 04e-pipeline-integrated-extension-spec_v1.md

---

## SECTION 2: Dataset Management - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: S3 presigned URLs, BullMQ validation workers  
**Actual Infrastructure**: Supabase Storage on-demand signed URLs, Edge Functions for validation

---

### Overview (from original spec)

Enable users to upload, validate, and manage conversation datasets for LoRA training.

**User Value**: Users can upload conversation datasets, validate formats, view statistics, and manage their dataset library

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Supabase Auth (`requireAuth()` function from `@/lib/supabase-server`)
- ✅ Supabase Storage configured (buckets created)
- ✅ Database tables created (from Section 1)
- ✅ DashboardLayout component

**Previous Section Prerequisites**:
- Section 1: Dataset table, storage buckets, type definitions

---

### Features & Requirements (INTEGRATED)

#### FR-2.1: Dataset Upload with Presigned URLs

**Type**: Storage Integration

**Description**: Allow users to upload large dataset files directly to Supabase Storage using presigned upload URLs.

**Implementation Strategy**: EXTENSION (using existing Supabase Storage)

---

**API Routes (INTEGRATED)**:

Instead of AWS S3 SDK, use **Supabase Storage** with existing patterns:

**File**: `src/app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CreateDatasetSchema } from '@/lib/types/lora-training';

/**
 * POST /api/datasets - Create dataset and generate presigned upload URL
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication (existing pattern)
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse and validate request
    const body = await request.json();
    const validation = CreateDatasetSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, format = 'brightrun_lora_v4', file_name, file_size } = validation.data;

    // Check file size limit (500MB)
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (file_size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit', details: 'Maximum file size is 500MB' },
        { status: 400 }
      );
    }

    // Generate unique dataset ID and storage path
    const datasetId = crypto.randomUUID();
    const storagePath = `${user.id}/${datasetId}/${file_name}`;

    // Create dataset record in database
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error: dbError } = await supabase
      .from('datasets')
      .insert({
        id: datasetId,
        user_id: user.id,
        name,
        description,
        format,
        storage_bucket: 'lora-datasets',
        storage_path: storagePath,  // Store path only, NOT URL
        file_name,
        file_size,
        status: 'uploading',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create dataset', details: dbError.message },
        { status: 500 }
      );
    }

    // Generate presigned upload URL (valid for 1 hour)
    const supabaseAdmin = createServerSupabaseAdminClient();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('lora-datasets')
      .createSignedUploadUrl(storagePath);

    if (uploadError) {
      console.error('Storage error:', uploadError);
      // Rollback dataset creation
      await supabase.from('datasets').delete().eq('id', datasetId);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: uploadError.message },
        { status: 500 }
      );
    }

    // Return dataset info and upload URL
    return NextResponse.json(
      {
        success: true,
        data: {
          dataset,
          uploadUrl: uploadData.signedUrl,  // Client uploads directly to this URL
          storagePath,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/datasets - List user's datasets with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Database query (existing pattern)
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: datasets, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: error.message },
        { status: 500 }
      );
    }

    // Response format (existing pattern)
    return NextResponse.json({
      success: true,
      data: {
        datasets: datasets || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 3 - Storage Infrastructure, Section 4 - API Architecture

**Storage Best Practices** (from inventory):
- Never store URLs in database - store only `storage_path`
- Generate signed URLs on-demand via API routes
- Use admin client for signing operations
- Set appropriate expiry (3600 seconds = 1 hour)

---

**Client-Side Upload Flow**:

```typescript
// In React component
const { mutate: createDataset } = useCreateDataset();

async function handleUpload(file: File) {
  // Step 1: Create dataset record and get upload URL
  const response = await createDataset({
    name: datasetName,
    file_name: file.name,
    file_size: file.size,
  });

  const { uploadUrl, dataset } = response.data;

  // Step 2: Upload file directly to Supabase Storage
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file');
  }

  // Step 3: Confirm upload to trigger validation
  await fetch(`/api/datasets/${dataset.id}/confirm`, {
    method: 'POST',
  });
}
```

---

#### FR-2.2: Dataset Validation

**Type**: Background Processing

**Description**: Validate uploaded datasets for format correctness and calculate statistics.

**Implementation Strategy**: EXTENSION (using Edge Functions instead of BullMQ)

---

**Background Processing (INTEGRATED)**:

Instead of BullMQ + Redis, use **Supabase Edge Functions** with Cron:

**File**: `supabase/functions/validate-datasets/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch datasets pending validation
  const { data: datasets } = await supabase
    .from('datasets')
    .select('*')
    .eq('status', 'validating');

  for (const dataset of datasets || []) {
    try {
      // Download dataset file
      const { data: fileData } = await supabase.storage
        .from('lora-datasets')
        .download(dataset.storage_path);

      if (!fileData) {
        throw new Error('Failed to download file');
      }

      // Parse and validate JSONL format
      const text = await fileData.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      let totalPairs = 0;
      let totalTokens = 0;
      const errors: any[] = [];
      const sampleData: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const conversation = JSON.parse(lines[i]);
          
          // Validate structure
          if (!conversation.conversation_id || !Array.isArray(conversation.turns)) {
            errors.push({
              line: i + 1,
              error: 'Invalid structure',
              suggestion: 'Each line must have conversation_id and turns array',
            });
            continue;
          }

          // Count training pairs
          totalPairs += conversation.turns.length;
          
          // Estimate tokens (rough estimation)
          totalTokens += conversation.turns.reduce((sum: number, turn: any) => {
            return sum + (turn.content?.split(' ').length || 0) * 1.3;
          }, 0);

          // Sample first 3 conversations
          if (sampleData.length < 3) {
            sampleData.push(conversation);
          }
        } catch (parseError) {
          errors.push({
            line: i + 1,
            error: 'JSON parse error',
            suggestion: 'Ensure each line is valid JSON',
          });
        }
      }

      // Update dataset with validation results
      const updateData: any = {
        validated_at: new Date().toISOString(),
      };

      if (errors.length > 0) {
        updateData.status = 'error';
        updateData.validation_errors = errors.slice(0, 10);  // First 10 errors
        updateData.training_ready = false;
      } else {
        updateData.status = 'ready';
        updateData.training_ready = true;
        updateData.total_training_pairs = totalPairs;
        updateData.total_tokens = Math.round(totalTokens);
        updateData.sample_data = sampleData;
        updateData.avg_turns_per_conversation = totalPairs / lines.length;
      }

      await supabase
        .from('datasets')
        .update(updateData)
        .eq('id', dataset.id);

      // Create notification
      if (updateData.status === 'ready') {
        await supabase.from('notifications').insert({
          user_id: dataset.user_id,
          type: 'dataset_ready',
          title: 'Dataset Ready',
          message: `Your dataset "${dataset.name}" is ready for training`,
          priority: 'medium',
          action_url: `/datasets/${dataset.id}`,
        });
      }
    } catch (error) {
      console.error(`Validation error for dataset ${dataset.id}:`, error);
      
      await supabase
        .from('datasets')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Validation failed',
        })
        .eq('id', dataset.id);
    }
  }

  return new Response('OK');
});
```

**Deployment**: Via Supabase CLI (`supabase functions deploy validate-datasets`)

**Cron Trigger**: Configure in Supabase Dashboard  
- Function: `validate-datasets`
- Schedule: `* * * * *` (every 1 minute)

**Reason for Change**: BullMQ + Redis adds infrastructure complexity. Supabase Edge Functions + Cron provides equivalent functionality with less overhead.

**Pattern Source**: Extension Strategy Section - Background Processing

---

**Data Fetching (INTEGRATED)**:

Instead of SWR, use **React Query** with existing patterns:

**File**: `src/hooks/use-datasets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Dataset, CreateDatasetInput } from '@/lib/types/lora-training';

export function useDatasets(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['datasets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      
      const response = await fetch(`/api/datasets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds (from existing config)
  });
}

export function useDataset(id: string | null) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDatasetInput) => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useConfirmDatasetUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      const response = await fetch(`/api/datasets/${datasetId}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to confirm upload');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Validation started');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete dataset');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset deleted');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 6 - State & Data Fetching

---

**Components (INTEGRATED)**:

Use exact patterns from Infrastructure Inventory Section 5:

**File**: `src/components/datasets/DatasetCard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import type { Dataset } from '@/lib/types/lora-training';

interface DatasetCardProps {
  dataset: Dataset;
  onSelect?: (dataset: Dataset) => void;
  onDelete?: (id: string) => void;
}

export function DatasetCard({ dataset, onSelect, onDelete }: DatasetCardProps) {
  const statusColor = {
    uploading: 'bg-blue-500',
    validating: 'bg-yellow-500',
    ready: 'bg-green-500',
    error: 'bg-red-500',
  }[dataset.status];

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">{dataset.name}</CardTitle>
              <CardDescription className="text-sm">
                {dataset.file_name}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColor}>{dataset.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {dataset.training_ready && (
          <div className="mb-3 text-sm text-gray-600">
            <p>{dataset.total_training_pairs} training pairs</p>
            {dataset.total_tokens && (
              <p>{(dataset.total_tokens / 1000).toFixed(1)}K tokens</p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => onSelect?.(dataset)}
            variant="outline"
            className="flex-1"
          >
            View Details
          </Button>
          {dataset.status === 'ready' && (
            <Button 
              onClick={() => onSelect?.(dataset)}
              className="flex-1"
            >
              Start Training
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 - Component Library

**Available Components**: All 47+ shadcn/ui components from `/components/ui/`

---

**Pages (INTEGRATED)**:

**File**: `src/app/(dashboard)/datasets/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets';
import { DatasetCard } from '@/components/datasets/DatasetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function DatasetsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useDatasets({ 
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { mutate: deleteDataset } = useDeleteDataset();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const datasets = data?.data?.datasets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-gray-500">
            Manage your training datasets
          </p>
        </div>
        <Link href="/datasets/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dataset Grid */}
      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
          <p className="text-gray-500 mb-4">
            Upload your first dataset to start training
          </p>
          <Link href="/datasets/new">
            <Button>Upload Dataset</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset: any) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onSelect={(d) => window.location.href = `/datasets/${d.id}`}
              onDelete={deleteDataset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 - Component Library, Section 6 - Data Fetching

---

**Acceptance Criteria** (adjusted for infrastructure):

1. ✅ User can upload dataset files up to 500MB
2. ✅ Presigned upload URL generated via Supabase Storage
3. ✅ Dataset record created in database with status tracking
4. ✅ Edge Function validates dataset format automatically
5. ✅ Statistics calculated and stored (training pairs, tokens)
6. ✅ User notified when validation completes
7. ✅ Datasets page displays all user's datasets with filters

**Verification Steps**:

1. ✅ Storage: Upload file via presigned URL works
2. ✅ Database: Dataset record created correctly
3. ✅ Edge Function: Validation runs and updates status
4. ✅ API: List endpoint returns paginated results
5. ✅ Components: UI renders correctly with shadcn/ui
6. ✅ Integration: Complete upload flow works end-to-end

---

### Section Summary

**What Was Added**:
- API route: POST /api/datasets (create with upload URL)
- API route: GET /api/datasets (list with pagination)
- API route: POST /api/datasets/[id]/confirm (trigger validation)
- Edge Function: validate-datasets (background validation)
- React hooks: useDatasets, useCreateDataset, useConfirmDatasetUpload, useDeleteDataset
- Components: DatasetCard
- Page: /datasets (list view)

**What Was Reused**:
- Supabase Storage for file uploads
- Supabase Auth for user identification
- shadcn/ui components (Card, Badge, Button, etc.)
- React Query for data fetching
- Existing API response format

**Integration Points**:
- Uses requireAuth() from existing auth system
- Stores files in Supabase Storage (same as existing features)
- Uses same database client and query patterns
- Follows existing API and component conventions

---
