# PIPELINE - Section E02: Dataset Management - Execution Prompts

**Product:** PIPELINE  
**Section:** 2 - Dataset Management  
**Generated:** December 26, 2025  
**Total Prompts:** 1  
**Estimated Total Time:** 5 hours  
**Source Section File:** 04f-pipeline-build-section-E02.md

---

## Section Overview

Enable users to upload, validate, and manage conversation datasets for LoRA training.

**User Value**: Users can upload conversation datasets, validate formats, view statistics, and manage their dataset library

**Implementation Approach**: This section builds upon the database foundation from Section E01, adding:
- API routes for dataset upload with presigned URLs (Supabase Storage)
- Edge Function for background validation
- React Query hooks for data fetching
- UI components and pages for dataset management

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Dataset Upload, Validation & Management UI** (5h)
   - Features: FR-2.1 (Dataset Upload), FR-2.2 (Dataset Validation)
   - Key Deliverables:
     - API routes: POST/GET /api/datasets, POST /api/datasets/[id]/confirm
     - Edge Function: validate-datasets
     - React hooks: useDatasets, useCreateDataset, useConfirmDatasetUpload, useDeleteDataset
     - Components: DatasetCard
     - Page: /datasets (listing with filters)

---

## Integration Context

### Dependencies from Previous Sections

**From Section E01 (Foundation & Authentication):**
- Database tables: `datasets` table with full schema
- TypeScript types: `Dataset`, `DatasetStatus`, `CreateDatasetSchema` from `@/lib/types/lora-training`
- Storage buckets: `lora-datasets` bucket (configured in Supabase)
- Auth infrastructure: `requireAuth()` from `@/lib/supabase-server`

### Provides for Next Sections

**For Section E03 (Training Job Configuration):**
- Complete dataset management system
- Dataset validation and statistics
- API endpoints for querying ready datasets
- UI components for dataset selection

**For Section E04 (Training Execution):**
- Validated datasets ready for training
- Dataset statistics for training preparation
- Storage path references for training jobs

---

## Dependency Flow (This Section)

```
E01 (Database + Types)
  ↓
E02-P01 (Dataset Upload API)
  ↓
E02-P01 (Validation Edge Function)
  ↓
E02-P01 (React Hooks + UI)
```

**Note:** All features in a single prompt since they form a cohesive vertical slice (5 hours total).

---

# PROMPT 1: Dataset Upload, Validation & Management UI

**Generated:** December 26, 2025  
**Section:** 2 - Dataset Management  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 5 hours  
**Prerequisites:** Section E01 complete (database schema, types, storage buckets)

---

## 🎯 Mission Statement

Implement a complete dataset management system that allows users to upload large dataset files directly to Supabase Storage, automatically validate them in the background using Edge Functions, and manage their dataset library through a modern UI. This builds the foundation for the training pipeline by ensuring all datasets are properly validated and ready for LoRA training.

---

## 📦 Section Context

### This Section's Goal

Enable users to upload, validate, and manage conversation datasets for LoRA training. Users should be able to:
- Upload dataset files up to 500MB using presigned URLs
- Have datasets automatically validated for format correctness
- View statistics (training pairs, tokens, etc.) after validation
- Browse and filter their dataset library
- Prepare datasets for training jobs

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E02. It implements:
- **FR-2.1**: Dataset Upload with Presigned URLs
- **FR-2.2**: Dataset Validation (Edge Function)
- Complete UI for dataset management

---

## 🔗 Integration with Previous Work

### From Previous Sections

#### Section E01: Foundation & Authentication

**Database Tables We'll Use:**
- `datasets` table - Full schema created in E01
  - Columns: id, user_id, name, description, format, status, storage_bucket, storage_path, file_name, file_size, total_training_pairs, total_validation_pairs, total_tokens, training_ready, validated_at, validation_errors, sample_data, etc.
  - RLS policies: Users can only access their own datasets
  - We'll INSERT new records, UPDATE status/validation results, SELECT for listing

**Storage Buckets We'll Use:**
- `lora-datasets` bucket (created in E01)
  - Purpose: Store uploaded dataset files
  - Configuration: Private, 500MB limit, JSONL files
  - We'll generate presigned upload URLs and download files for validation

**TypeScript Types We'll Reuse:**
- `Dataset` interface from `@/lib/types/lora-training.ts`
- `DatasetStatus` type: 'uploading' | 'validating' | 'ready' | 'error'
- `CreateDatasetSchema` for validation (from types file)
- `ValidationError` interface for error reporting

**Authentication Functions We'll Import:**
- `requireAuth()` from `@/lib/supabase-server` - Protects API routes
- `createServerSupabaseClient()` from `@/lib/supabase-server` - Database queries
- `createServerSupabaseAdminClient()` from `@/lib/supabase-server` - Storage signing operations

### From Previous Prompts (This Section)

This is the first prompt in Section E02. No previous prompts in this section.

---

## 🔍 Supabase Agent Ops Library (SAOL) - Database Operations Tool

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### ⚠️ CRITICAL: Use SAOL for ALL Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations in this prompt.**  
Do not use raw `supabase-js` or manual PostgreSQL scripts for database verification or testing. SAOL is safe, robust, and handles edge cases automatically.

### What is SAOL?

SAOL is a tested, production-ready library for database operations that:
- ✅ Handles special characters and edge cases automatically
- ✅ Provides consistent error handling
- ✅ Includes deep schema introspection
- ✅ Works with Service Role Key for admin operations
- ✅ No manual SQL escaping required

**Library Location:** `supa-agent-ops/`  
**Documentation:** `supa-agent-ops/QUICK_START.md` (READ THIS FIRST)  
**Troubleshooting:** `supa-agent-ops/TROUBLESHOOTING.md`

---

### Setup & Prerequisites

**Installation Status:** ✅ Already available in project

**Environment Required:**
```bash
# Ensure these are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Key Rules:**
1. **Use Service Role Key:** SAOL operations require admin privileges
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data
3. **No Manual Escaping:** SAOL handles special characters automatically
4. **Parameter Flexibility:** Accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible)

---

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

#### Verify Tables Exist (After Migration)

```bash
# Check if datasets table exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.data.columns.map(c=>c.name).join(', '));}})();"

# Check all LoRA training tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t+':',r.success?'✅':'❌');}})();"
```

#### Query Tables (Verify Data)

```bash
# Check datasets table (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check datasets with specific columns and filtering
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,created_at',where:[{column:'status',operator:'eq',value:'ready'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Ready datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Check training_jobs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,progress,current_epoch,total_epochs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.progress+'%'));})();"
```

#### Deep Schema Introspection

```bash
# Get complete schema details for datasets table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Check RLS policies on datasets
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:',r.data.policies.length);}})();"
```

---

### SAOL API Reference (Quick)

#### agentQuery - Query Data

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: ['id', 'name', 'status', 'created_at'],  // Array or comma-separated string
  where: [
    { column: 'status', operator: 'eq', value: 'ready' },
    { column: 'training_ready', operator: 'eq', value: true }
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

**Backward Compatible Format:**
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: 'id,name,status,created_at',  // String
  filters: [  // 'filters' instead of 'where'
    { field: 'status', operator: 'eq', value: 'ready' }  // 'field' instead of 'column'
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

#### agentIntrospectSchema - Deep Schema Analysis

```javascript
const result = await saol.agentIntrospectSchema({
  table: 'datasets',
  transport: 'pg'  // Use PostgreSQL introspection (more detailed)
});

// Returns:
// {
//   success: true,
//   data: {
//     tableName: 'datasets',
//     columns: [...],
//     primaryKey: [...],
//     foreignKeys: [...],
//     indexes: [...],
//     rlsEnabled: true,
//     policies: [...]
//   }
// }
```

#### agentPreflight - Pre-Operation Check

```javascript
// Always run before mutations
const preflight = await saol.agentPreflight({
  table: 'datasets'
});

if (!preflight.success) {
  console.error('Preflight failed:', preflight.error);
  return;
}

// Proceed with operation...
```

---

### Common Use Cases for This Section

#### 1. Verify Migration Applied Successfully

```bash
# After running migration, verify all tables exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];console.log('Verifying migration...');for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log('✓',t,'-',r.success?'EXISTS':'MISSING');}})();"
```

#### 2. Check Table Structure

```bash
# Verify datasets table has correct columns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('Columns:');r.data.columns.forEach(c=>console.log('-',c.name,':',c.type));}})();"
```

#### 3. Verify RLS Policies

```bash
# Check RLS is enabled and policies exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:');r.data.policies.forEach(p=>console.log('-',p.name,'(',p.command,')'));}})();"
```

#### 4. Test Data Insertion

```bash
# Query to verify test data (after manual insert)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:1});console.log('Sample dataset:',JSON.stringify(r.data[0],null,2));})();"
```

---

### When to Use SAOL in This Prompt

Use SAOL commands for:

1. ✅ **After Migration** - Verify tables exist and have correct structure
2. ✅ **Database Verification** - Check data was inserted correctly
3. ✅ **Schema Validation** - Confirm columns, indexes, foreign keys
4. ✅ **RLS Testing** - Verify policies are enabled and working
5. ✅ **Debugging** - Query tables to understand data state

**Do NOT use SAOL for:**
- ❌ Running migrations (use `supabase migration up` or Dashboard)
- ❌ Creating storage buckets (use Dashboard)
- ❌ Application code (use regular Supabase client)

---

### Important Notes

1. **Service Role Key Required:** SAOL uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
2. **Read-Only Recommended:** Use SAOL primarily for verification, not mutations
3. **Path Matters:** Always `cd` to `supa-agent-ops/` directory before running commands
4. **Env File:** Ensure `.env.local` is in parent directory with correct variables
5. **Windows Paths:** Use forward slashes in paths: `c:/Users/james/...`

---


## 🎯 Implementation Requirements

### Feature FR-2.1: Dataset Upload with Presigned URLs

**Type:** Storage Integration + API Routes  
**Strategy:** EXTENSION - building on existing Supabase Storage infrastructure

#### Description

Allow users to upload large dataset files (up to 500MB) directly to Supabase Storage using presigned upload URLs. This avoids sending large files through our API server and provides a secure, scalable upload mechanism.

#### What Already Exists (Don't Rebuild)

- ✅ Supabase Storage infrastructure
- ✅ `lora-datasets` storage bucket (created in E01)
- ✅ `datasets` database table with full schema
- ✅ Authentication system (`requireAuth()`)
- ✅ TypeScript types (`Dataset`, `DatasetStatus`)

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/datasets/route.ts` - API routes for dataset creation and listing
- 🆕 `src/app/api/datasets/[id]/confirm/route.ts` - Confirm upload and trigger validation
- 🆕 `src/hooks/use-datasets.ts` - React Query hooks for data fetching

#### Implementation Details

##### API Route: Create Dataset + Generate Upload URL

**File:** `src/app/api/datasets/route.ts`

**Endpoints:** 
- `POST /api/datasets` - Create dataset record and generate presigned upload URL
- `GET /api/datasets` - List user's datasets with pagination and filters

**Implementation:**

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

**Key Points:**
- Uses `requireAuth()` from Section E01 for authentication
- Never stores URLs in database - only `storage_path`
- Uses admin client (`createServerSupabaseAdminClient()`) for signing operations
- Follows existing API response format: `{ success, data }` or `{ error, details }`
- Includes rollback logic if upload URL generation fails

##### API Route: Confirm Upload

**File:** `src/app/api/datasets/[id]/confirm/route.ts`

**Endpoint:** `POST /api/datasets/[id]/confirm`

**Purpose:** Mark upload as complete and trigger validation

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const datasetId = params.id;

    // Update dataset status to trigger validation
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .update({ status: 'validating' })
      .eq('id', datasetId)
      .eq('user_id', user.id)  // Ensure user owns this dataset
      .select()
      .single();

    if (error || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { dataset },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

##### React Query Hooks

**File:** `src/hooks/use-datasets.ts`

**Hooks:** useDatasets, useDataset, useCreateDataset, useConfirmDatasetUpload, useDeleteDataset

**Implementation:**

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

**Pattern Source:** Infrastructure Inventory Section 6 - State & Data Fetching

**Key Points:**
- Uses React Query (existing pattern in codebase)
- Automatic cache invalidation with `invalidateQueries`
- Toast notifications using `sonner` (existing toast library)
- Follows existing hook naming conventions

---

### Feature FR-2.2: Dataset Validation

**Type:** Background Processing (Edge Function) + UI Components  
**Strategy:** EXTENSION - using Supabase Edge Functions instead of BullMQ

#### Description

Automatically validate uploaded datasets for format correctness in the background. Parse JSONL files, validate structure, calculate statistics (training pairs, tokens), and update the database with validation results. Users can view validation status and statistics in the UI.

#### What Already Exists (Don't Rebuild)

- ✅ Supabase Edge Functions infrastructure
- ✅ Dataset table with validation columns
- ✅ Storage bucket with uploaded files
- ✅ shadcn/ui components (Card, Badge, Button, Input, Select, etc.)

#### What We're Building (New in This Prompt)

- 🆕 `supabase/functions/validate-datasets/index.ts` - Edge Function for validation
- 🆕 `src/components/datasets/DatasetCard.tsx` - Dataset display component
- 🆕 `src/app/(dashboard)/datasets/page.tsx` - Datasets listing page

#### Implementation Details

##### Edge Function: Validate Datasets

**File:** `supabase/functions/validate-datasets/index.ts`

**Purpose:** Background validation triggered by Cron (every 1 minute)

**Implementation:**

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

**Deployment:**
```bash
# Deploy Edge Function
supabase functions deploy validate-datasets

# Configure Cron Trigger in Supabase Dashboard:
# - Function: validate-datasets
# - Schedule: * * * * * (every 1 minute)
```

**Key Points:**
- Runs every minute via Cron trigger
- Downloads files from storage for validation
- Parses JSONL format (one JSON object per line)
- Validates conversation structure (conversation_id, turns array)
- Calculates statistics (training pairs, tokens)
- Updates database with results
- Creates notification on success

##### UI Component: Dataset Card

**File:** `src/components/datasets/DatasetCard.tsx`

**Purpose:** Display dataset information with status badge and actions

**Implementation:**

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

**Pattern Source:** Infrastructure Inventory Section 5 - Component Library

**Key Points:**
- Uses shadcn/ui components (Card, Badge, Button) from existing library
- Status-based color coding
- Conditional display of statistics
- Action buttons (View Details, Start Training)
- Follows existing component patterns

##### Page: Datasets Listing

**File:** `src/app/(dashboard)/datasets/page.tsx`

**Purpose:** Display user's datasets with search and filters

**Implementation:**

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

**Pattern Source:** Infrastructure Inventory Section 5 - Component Library

**Key Points:**
- Uses hooks from this prompt (`useDatasets`, `useDeleteDataset`)
- Loading states with Skeleton components
- Empty state with helpful message
- Grid layout for dataset cards
- Search and status filtering

---

## ✅ Acceptance Criteria

### Functional Requirements

**FR-2.1: Dataset Upload**
- [ ] User can create dataset record via POST /api/datasets
- [ ] Presigned upload URL generated with 1-hour expiry
- [ ] File size limit enforced (500MB max)
- [ ] Dataset record created with status 'uploading'
- [ ] Storage path stored in database (NOT URL)
- [ ] User can list datasets via GET /api/datasets with pagination
- [ ] Filters work (status, search by name)

**FR-2.2: Dataset Validation**
- [ ] Edge Function deploys successfully
- [ ] Cron trigger configured (every 1 minute)
- [ ] Validation processes datasets in 'validating' status
- [ ] JSONL format parsed correctly
- [ ] Conversation structure validated (conversation_id, turns)
- [ ] Statistics calculated (training pairs, tokens)
- [ ] Database updated with validation results
- [ ] Notification created on successful validation
- [ ] Error handling for invalid formats

**UI Requirements**
- [ ] DatasetCard component renders correctly
- [ ] Status badges display with correct colors
- [ ] Statistics shown for ready datasets
- [ ] Datasets page displays all user's datasets
- [ ] Search and filters work
- [ ] Empty state displays when no datasets
- [ ] Loading states show skeletons

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All imports resolve correctly
- [ ] Follows existing patterns:
  - API response format: `{ success, data }` or `{ error, details }`
  - React Query hooks with proper cache invalidation
  - shadcn/ui components
  - Authentication with `requireAuth()`

### Integration Requirements

- [ ] Successfully imports `Dataset` type from E01
- [ ] Successfully queries `datasets` table from E01
- [ ] Successfully uses `requireAuth()` from E01
- [ ] Successfully uses Supabase Storage from E01
- [ ] Storage operations use admin client for signing
- [ ] RLS policies enforced (users only see own datasets)

---

## 🧪 Testing & Validation

### Manual Testing Steps

#### 1. API Testing: Create Dataset

```bash
# Test dataset creation
curl -X POST http://localhost:3000/api/datasets \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Test Dataset",
    "description": "Test description",
    "file_name": "test.jsonl",
    "file_size": 1024000
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "dataset": { ... },
#     "uploadUrl": "https://...",
#     "storagePath": "user-id/dataset-id/test.jsonl"
#   }
# }
```

#### 2. Storage Testing: Upload File

```bash
# Upload file to presigned URL
curl -X PUT "<uploadUrl-from-previous-step>" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@test-dataset.jsonl"

# Expected: 200 OK
```

#### 3. API Testing: Confirm Upload

```bash
# Trigger validation
curl -X POST http://localhost:3000/api/datasets/<dataset-id>/confirm \
  -H "Cookie: your-auth-cookie"

# Expected: Dataset status changes to 'validating'
```

#### 4. Database Verification

```sql
-- Verify dataset created
SELECT id, name, status, storage_path, file_size
FROM datasets
WHERE user_id = 'your-user-id';

-- Expected: One row with status 'validating'
```

#### 5. Edge Function Testing

```bash
# Deploy Edge Function
supabase functions deploy validate-datasets

# Manually invoke (for testing)
supabase functions invoke validate-datasets

# Expected: Datasets with status 'validating' processed
```

#### 6. UI Testing

1. Navigate to: `http://localhost:3000/datasets`
2. Expected behavior:
   - Datasets page loads
   - Datasets displayed in grid
   - Status badges show correct colors
   - Search and filters work
3. Verify:
   - Loading states show skeletons
   - Empty state displays if no datasets
   - Dataset cards clickable

#### 7. Integration Testing

1. Complete upload flow end-to-end
2. Verify dataset moves through statuses: uploading → validating → ready
3. Check notification created when ready
4. Verify statistics displayed in UI

### Expected Outputs

After completing this prompt, you should have:

- [ ] API route file: `src/app/api/datasets/route.ts` (POST, GET handlers)
- [ ] API route file: `src/app/api/datasets/[id]/confirm/route.ts` (POST handler)
- [ ] Hooks file: `src/hooks/use-datasets.ts` (5 hooks)
- [ ] Edge Function: `supabase/functions/validate-datasets/index.ts`
- [ ] Component: `src/components/datasets/DatasetCard.tsx`
- [ ] Page: `src/app/(dashboard)/datasets/page.tsx`
- [ ] Application runs without errors
- [ ] All features testable and working
- [ ] Edge Function deployed with Cron trigger

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `src/app/api/datasets/route.ts` - Create and list datasets API
- [ ] `src/app/api/datasets/[id]/confirm/route.ts` - Confirm upload API
- [ ] `src/hooks/use-datasets.ts` - React Query hooks
- [ ] `supabase/functions/validate-datasets/index.ts` - Validation Edge Function
- [ ] `src/components/datasets/DatasetCard.tsx` - Dataset card component
- [ ] `src/app/(dashboard)/datasets/page.tsx` - Datasets listing page

### Existing Files Modified

None (all files are new in this section)

### Database Changes

No schema changes (using tables from E01)

**Operations:**
- INSERT into `datasets` table
- UPDATE `datasets` status and validation results
- SELECT from `datasets` with filters and pagination
- INSERT into `notifications` table

### Storage Operations

- Generate presigned upload URL via `createSignedUploadUrl()`
- Download files for validation via `storage.from().download()`

### API Endpoints

- [ ] `POST /api/datasets` - Create dataset and get upload URL
- [ ] `GET /api/datasets` - List datasets with pagination
- [ ] `POST /api/datasets/[id]/confirm` - Confirm upload and trigger validation

### Edge Functions

- [ ] `validate-datasets` - Background validation (Cron: every 1 minute)

### Components

- [ ] `DatasetCard` - Dataset display card

### Pages

- [ ] `/datasets` - Datasets listing with filters

---

## 🔜 What's Next

### For Next Prompt in This Section

**Section Complete:** This is the final prompt in Section E02.

### For Next Section

**Next Section:** E03: Training Job Configuration

The next section will build upon this section's deliverables:

**From This Section:**
- Dataset listing API (`GET /api/datasets`) - Used to select datasets for training
- Dataset validation system - Ensures only ready datasets can be used
- Dataset statistics (training pairs, tokens) - Used to estimate training time/cost
- Dataset type definitions - Reused in training job creation

**What Next Section Will Add:**
- Training job creation API
- Hyperparameter presets and configuration UI
- GPU selection and cost estimation
- Training job listing and monitoring

---

## ⚠️ Important Reminders

1. **Follow the Spec Exactly:** All code provided in this prompt comes from the integrated specification. Implement it as written.

2. **Reuse Existing Infrastructure:** Don't recreate what already exists. Import and use:
   - Database: `datasets` table from Section E01
   - Types: `Dataset`, `DatasetStatus` from `@/lib/types/lora-training`
   - Auth: `requireAuth()` from `@/lib/supabase-server`
   - Storage: `lora-datasets` bucket from E01
   - Components: All shadcn/ui components from `@/components/ui/*`
   - Data fetching: React Query (already configured)

3. **Integration Points:** When importing from previous work, add comments:
   ```typescript
   // From Section E01 - database schema
   import { Dataset, DatasetStatus } from '@/lib/types/lora-training';
   
   // From Section E01 - authentication
   import { requireAuth } from '@/lib/supabase-server';
   ```

4. **Pattern Consistency:** Match existing patterns:
   - API responses: `{ success: true, data }` or `{ error, details }`
   - React Query: `staleTime: 30 * 1000` for list queries
   - Toast notifications: `toast.success()` and `toast.error()`
   - Component structure: Use shadcn/ui patterns

5. **Storage Best Practices:**
   - NEVER store URLs in database - only `storage_path`
   - Generate signed URLs on-demand via admin client
   - Set appropriate expiry (3600 seconds = 1 hour for uploads)
   - Use `createSignedUploadUrl()` for client uploads
   - Use `download()` for Edge Function validation

6. **Edge Function Deployment:**
   ```bash
   # Deploy function
   supabase functions deploy validate-datasets
   
   # Configure Cron in Supabase Dashboard:
   # Function: validate-datasets
   # Schedule: * * * * * (every 1 minute)
   ```

7. **Don't Skip Steps:** Implement all features listed in this prompt before moving to the next section.

---

## 📚 Reference Materials

### Files from Previous Work

#### Section E01: Foundation & Authentication

**Database Schema:**
- Table: `datasets` - Stores dataset metadata
- Columns: id, user_id, name, description, format, status, storage_bucket, storage_path, file_name, file_size, total_training_pairs, total_tokens, training_ready, validated_at, validation_errors, sample_data, created_at, updated_at

**TypeScript Types:**
- `src/lib/types/lora-training.ts`:
  - `Dataset` interface
  - `DatasetStatus` type
  - `CreateDatasetInput` type (for validation)
  - `ValidationError` interface

**Authentication:**
- `@/lib/supabase-server`:
  - `requireAuth()` - Protects API routes, returns user
  - `createServerSupabaseClient()` - For database queries
  - `createServerSupabaseAdminClient()` - For storage signing

**Storage:**
- Bucket: `lora-datasets` - For dataset file storage

### Infrastructure Patterns

**Authentication Pattern:**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
// user is now authenticated
```

**Database Query Pattern:**
```typescript
const supabase = await createServerSupabaseClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```

**Storage Signing Pattern:**
```typescript
const supabaseAdmin = createServerSupabaseAdminClient();
const { data, error } = await supabaseAdmin.storage
  .from('bucket-name')
  .createSignedUploadUrl(path);
```

**API Response Pattern:**
```typescript
// Success
return NextResponse.json({
  success: true,
  data: { ... }
});

// Error
return NextResponse.json({
  error: 'Error message',
  details: 'Detailed explanation'
}, { status: 400 });
```

**React Query Hook Pattern:**
```typescript
export function useExample() {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => { ... },
    staleTime: 30 * 1000,
  });
}
```

---
