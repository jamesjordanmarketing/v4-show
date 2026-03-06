# PIPELINE - Section DATA-BRIDGE: Training Files to Datasets Migration - Execution Prompts

**Product:** PIPELINE  
**Section:** DATA-BRIDGE - Training Files to Datasets Migration  
**Generated:** December 27, 2025  
**Total Prompts:** 1  
**Estimated Total Time:** 2-3 hours  
**Insertion Point:** Between E03 and E04

---

## 📌 Critical Context: Why This Section Exists

**Problem Identified:** Section E02 introduced a NEW `datasets` table for LoRA training, but the application ALREADY HAS training data in the `training_files` table from the existing conversation generation system. Without a bridge, users cannot use their existing training files with the new LoRA pipeline.

**Solution:** Create a data migration bridge that imports existing `training_files` records into the `datasets` table, making them immediately available for training job configuration.

---

## Section Overview

Enable users to access their existing training files from the new LoRA training pipeline by migrating records from `training_files` to `datasets` table.

**User Value**: Users can immediately use their existing, validated training files to configure and run training jobs without having to re-upload data.

**Implementation Approach**: This section creates a one-time migration API and UI that:
- Copies `training_files` records to `datasets` table
- Maps storage paths correctly (training_files are in 'training-files' bucket, not 'lora-datasets')
- Sets appropriate status flags (status='ready', training_ready=true)
- Calculates missing fields (total_tokens, avg_tokens_per_turn)
- Provides UI to view available training files and import them

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### Setup & Usage

**Installation**: Already available in project
```bash
# SAOL is installed and configured
# Located in supa-agent-ops/ directory
```

**CRITICAL: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path:** supa-agent-ops
**Quick Start:** QUICK_START.md (READ THIS FIRST)
**Troubleshooting:** TROUBLESHOOTING.md

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

```bash
# Query conversations (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check schema (Deep Introspection)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversations',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Verify datasets table (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);console.log('Policies:',r.tables[0].policies.length);}})();"

# Query datasets (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,total_training_pairs',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"
```

### Common Queries

**Check conversations (specific columns, with filtering)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',select:'id,conversation_id,enrichment_status,title',where:[{column:'enrichment_status',operator:'eq',value:'completed'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Success:',r.success,'Count:',r.data.length);r.data.forEach(c=>console.log('-',c.conversation_id.slice(0,8),'/',c.enrichment_status));})();"
```

**Check training files**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_files',select:'id,name,conversation_count,total_training_pairs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Files:',r.data.length);r.data.forEach(f=>console.log('-',f.name,'(',f.conversation_count,'convs)'));})();"
```

**Check prompt templates (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'prompt_templates',select:'template_name,tier,emotional_arc_type',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case templates:',r.data.length);r.data.forEach(t=>console.log('-',t.template_name));})();"
```

**Check emotional arcs (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'emotional_arcs',select:'arc_key,name,tier',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case arcs:',r.data.length);r.data.forEach(a=>console.log('-',a.arc_key,'→',a.name));})();"
```

### SAOL Parameter Formats (Both Work)

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: ['template_name', 'tier', 'emotional_arc_type'],  // Array
  where: [{ column: 'tier', operator: 'eq', value: 'edge_case' }],  // where + column
  orderBy: [{ column: 'created_at', asc: false }]
});
```

**Backward Compatible Format**:
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: 'template_name,tier,emotional_arc_type',  // String
  filters: [{ field: 'tier', operator: 'eq', value: 'edge_case' }],  // filters + field
  orderBy: [{ column: 'created_at', asc: false }]
});
```

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Training Files Migration API & UI** (2-3h)
   - Features: Migration API, Import UI, Bulk Import
   - Key Deliverables:
     - API route: POST /api/datasets/import-from-training-file
     - API route: GET /api/training-files/available-for-import
     - React hook: useImportTrainingFile
     - UI Component: Training Files Import page
     - Bulk import support

---

## Integration Context

### Dependencies from Previous Sections

**From Section E01 (Foundation & Authentication):**
- Database tables: `datasets` table schema
- Database tables: `training_files` table (existing)
- TypeScript types: `Dataset` interface
- Auth infrastructure: `requireAuth()`

**From Section E02 (Dataset Management):**
- Dataset validation patterns
- Storage bucket configuration

**From Section E03 (Training Configuration):**
- Dataset selection interface
- Training job configuration flow

### Provides for Next Sections

**For Section E04 (Training Execution):**
- Populated `datasets` table with existing training files
- Ready-to-use datasets for immediate training
- No waiting for new uploads

**For Section E05+ (All Future Sections):**
- Historical training data accessible in new pipeline
- Continuity between old and new systems

---

## Dependency Flow (This Section)

```
E01 (Database Schema) + E02 (Dataset Management) + E03 (Training Configuration)
  ↓
DATA-BRIDGE (Import Existing Training Files)
  ↓
E04 (Training Execution - can now use imported datasets)
```

**Note:** This section must run AFTER E03 and BEFORE E04, because E04 assumes datasets exist and are ready for training.

---

# PROMPT 1: Training Files Migration API & UI

**Generated:** December 27, 2025  
**Section:** DATA-BRIDGE - Training Files to Datasets Migration  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 2-3 hours  
**Prerequisites:** Section E01, E02, and E03 complete

---

## 🎯 Mission Statement

Implement a migration system that allows users to import their existing `training_files` records into the new `datasets` table, making them immediately available for training job configuration in the LoRA pipeline. This bridges the gap between the legacy conversation generation system and the new LoRA training system.

---

## 📦 Section Context

### This Section's Goal

Create a seamless migration path for existing training files so users can:
- View their existing training files that haven't been imported yet
- Import individual training files as datasets
- Bulk import all training files at once
- Use imported datasets immediately in training job configuration

### This Prompt's Scope

This is **Prompt 1 of 1** in Section DATA-BRIDGE. It implements:
- Migration API that copies training_files to datasets
- API to list training files available for import
- React hooks for import operations
- UI page for viewing and importing training files

---

## 🔗 Integration with Previous Work

### From Section E01: Foundation & Authentication

**Database Tables:**
- `datasets` table - Target table for imported records
- `training_files` table - Source table with existing data

**TypeScript Types:**
- `Dataset` interface from `@/lib/types/lora-training.ts`

**Authentication:**
- `requireAuth()` from `@/lib/supabase-server`

### From Section E02: Dataset Management

**Patterns:**
- Dataset validation and statistics calculation
- Storage path handling

### From Section E03: Training Configuration

**Integration:**
- Imported datasets will appear in dataset selection for training configuration
- No changes needed to E03 code - it will automatically see the new datasets

---

## 🔍 Data Mapping Analysis

### Source: training_files Table

**Schema:**
```sql
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- jsonl_file_path (TEXT) - e.g., "8d71fcb6-876e-4ffd-9d9e-c7cf3e1473f0/training.jsonl"
- storage_bucket (VARCHAR) - "training-files"
- conversation_count (INTEGER)
- total_training_pairs (INTEGER)
- jsonl_file_size (BIGINT)
- created_by (UUID) - user_id
- created_at (TIMESTAMPTZ)
```

### Target: datasets Table

**Schema:**
```sql
- id (UUID) - NEW UUID
- user_id (UUID) - from training_files.created_by
- name (VARCHAR) - from training_files.name
- description (TEXT) - from training_files.description
- format (VARCHAR) - 'brightrun_lora_v4'
- status (VARCHAR) - 'ready'
- storage_bucket (VARCHAR) - 'training-files' (IMPORTANT: use existing bucket)
- storage_path (TEXT) - from training_files.jsonl_file_path
- file_name (VARCHAR) - extract from jsonl_file_path
- file_size (BIGINT) - from training_files.jsonl_file_size
- total_training_pairs (INTEGER) - from training_files.total_training_pairs
- total_tokens (BIGINT) - CALCULATE: total_training_pairs * 200 (estimate)
- avg_turns_per_conversation (DECIMAL) - from training_files.total_training_pairs / conversation_count
- avg_tokens_per_turn (DECIMAL) - CALCULATE: total_tokens / total_training_pairs
- training_ready (BOOLEAN) - TRUE
- validated_at (TIMESTAMPTZ) - NOW()
- created_at (TIMESTAMPTZ) - NOW()
```

### Key Mapping Notes

1. **Storage Bucket**: Keep files in 'training-files' bucket (don't copy to 'lora-datasets')
2. **Status**: Set to 'ready' since training_files are already validated
3. **Training Ready**: Set to TRUE since files are production-ready
4. **Total Tokens**: Estimate as total_training_pairs × 200 (typical conversation length)
5. **File Name**: Extract from jsonl_file_path (e.g., "training.jsonl")

---

## 🎯 Implementation Requirements

### Feature DB-1: Import Training File API

**Type:** API Endpoint  
**Strategy:** NEW - data migration endpoint

#### Description

Import a single training file record into the datasets table with proper field mapping and calculated statistics.

#### Implementation Details

**File:** `src/app/api/datasets/import-from-training-file/route.ts`

**Endpoint:** `POST /api/datasets/import-from-training-file`

**Purpose:** Import a training_files record into datasets table

**Request Body:**
```json
{
  "training_file_id": "uuid-of-training-file"
}
```

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

const ImportRequestSchema = z.object({
  training_file_id: z.string().uuid(),
});

/**
 * POST /api/datasets/import-from-training-file
 * Import an existing training file as a dataset for the LoRA pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const validation = ImportRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { training_file_id } = validation.data;
    const supabase = createServerSupabaseClient();

    // Fetch training file record
    const { data: trainingFile, error: fetchError } = await supabase
      .from('training_files')
      .select('*')
      .eq('id', training_file_id)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !trainingFile) {
      return NextResponse.json(
        { error: 'Training file not found or access denied' },
        { status: 404 }
      );
    }

    // Check if already imported
    const { data: existingDataset } = await supabase
      .from('datasets')
      .select('id')
      .eq('user_id', user.id)
      .eq('storage_path', trainingFile.jsonl_file_path)
      .single();

    if (existingDataset) {
      return NextResponse.json(
        { 
          error: 'Already imported',
          details: 'This training file has already been imported as a dataset',
          dataset_id: existingDataset.id
        },
        { status: 409 }
      );
    }

    // Calculate statistics
    const totalTokens = (trainingFile.total_training_pairs || 0) * 200; // Estimate
    const avgTurnsPerConversation = trainingFile.conversation_count > 0
      ? parseFloat((trainingFile.total_training_pairs / trainingFile.conversation_count).toFixed(2))
      : 0;
    const avgTokensPerTurn = trainingFile.total_training_pairs > 0
      ? parseFloat((totalTokens / trainingFile.total_training_pairs).toFixed(2))
      : 0;

    // Extract file name from path
    const fileName = trainingFile.jsonl_file_path.split('/').pop() || 'training.jsonl';

    // Create dataset record
    const { data: dataset, error: insertError } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        name: trainingFile.name,
        description: trainingFile.description || `Imported from training file: ${trainingFile.name}`,
        format: 'brightrun_lora_v4',
        status: 'ready',
        storage_bucket: 'training-files', // IMPORTANT: Keep in original bucket
        storage_path: trainingFile.jsonl_file_path,
        file_name: fileName,
        file_size: trainingFile.jsonl_file_size,
        total_training_pairs: trainingFile.total_training_pairs,
        total_validation_pairs: 0, // Training files don't have validation split
        total_tokens: totalTokens,
        avg_turns_per_conversation: avgTurnsPerConversation,
        avg_tokens_per_turn: avgTokensPerTurn,
        training_ready: true, // Training files are pre-validated
        validated_at: new Date().toISOString(),
        validation_errors: null,
        sample_data: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Dataset import error:', insertError);
      return NextResponse.json(
        { error: 'Failed to import training file', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dataset,
      message: `Successfully imported "${trainingFile.name}" as a dataset`,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import training file', details: error.message },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Validates user owns the training file
- Checks for duplicate imports (same storage_path)
- Calculates missing statistics (total_tokens, averages)
- Keeps files in 'training-files' bucket (no copy needed)
- Sets status='ready' and training_ready=true
- Returns HTTP 409 if already imported

---

### Feature DB-2: List Available Training Files API

**Type:** API Endpoint  
**Strategy:** NEW - query endpoint for import candidates

#### Description

List training files that haven't been imported yet, allowing users to see what's available for import.

#### Implementation Details

**File:** `src/app/api/training-files/available-for-import/route.ts`

**Endpoint:** `GET /api/training-files/available-for-import`

**Purpose:** List training files not yet imported to datasets

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/training-files/available-for-import
 * List training files that haven't been imported as datasets yet
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();

    // Get all user's training files
    const { data: trainingFiles, error: filesError } = await supabase
      .from('training_files')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { error: 'Failed to fetch training files', details: filesError.message },
        { status: 500 }
      );
    }

    // Get all user's imported datasets (by storage_path)
    const { data: datasets, error: datasetsError } = await supabase
      .from('datasets')
      .select('storage_path')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (datasetsError) {
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: datasetsError.message },
        { status: 500 }
      );
    }

    // Create set of imported storage paths for fast lookup
    const importedPaths = new Set(datasets?.map(d => d.storage_path) || []);

    // Filter training files that haven't been imported
    const availableForImport = (trainingFiles || []).filter(
      tf => !importedPaths.has(tf.jsonl_file_path)
    );

    // Add import status to all files
    const enrichedFiles = (trainingFiles || []).map(tf => ({
      ...tf,
      is_imported: importedPaths.has(tf.jsonl_file_path),
      can_import: !importedPaths.has(tf.jsonl_file_path),
    }));

    return NextResponse.json({
      success: true,
      data: {
        available_for_import: availableForImport,
        all_training_files: enrichedFiles,
        summary: {
          total_training_files: trainingFiles?.length || 0,
          already_imported: importedPaths.size,
          available_for_import: availableForImport.length,
        },
      },
    });

  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training files', details: error.message },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Fetches all user's training files
- Fetches all user's datasets
- Compares storage paths to identify non-imported files
- Returns enriched data with import status flags
- Provides summary statistics

---

### Feature DB-3: React Hooks for Import Operations

**Type:** React Hooks  
**Strategy:** NEW - React Query hooks for import

#### Implementation Details

**File:** `src/hooks/useTrainingFileImport.ts`

**Purpose:** React Query hooks for training file import operations

**Implementation:**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook for importing a training file as a dataset
 */
export function useImportTrainingFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trainingFileId: string) => {
      const response = await fetch('/api/datasets/import-from-training-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training_file_id: trainingFileId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-files-available'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success(data.message || 'Training file imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import training file');
    },
  });
}

/**
 * Hook for fetching training files available for import
 */
export function useAvailableTrainingFiles() {
  return useQuery({
    queryKey: ['training-files-available'],
    queryFn: async () => {
      const response = await fetch('/api/training-files/available-for-import');
      
      if (!response.ok) {
        throw new Error('Failed to fetch training files');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for bulk importing all available training files
 */
export function useBulkImportTrainingFiles() {
  const queryClient = useQueryClient();
  const importSingle = useImportTrainingFile();

  return useMutation({
    mutationFn: async (trainingFileIds: string[]) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const id of trainingFileIds) {
        try {
          const result = await importSingle.mutateAsync(id);
          results.push({ id, success: true, data: result });
          successCount++;
        } catch (error: any) {
          results.push({ id, success: false, error: error.message });
          errorCount++;
        }
      }

      return { results, successCount, errorCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-files-available'] });
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      
      if (data.errorCount === 0) {
        toast.success(`Successfully imported all ${data.successCount} training files`);
      } else {
        toast.warning(
          `Imported ${data.successCount} files, ${data.errorCount} failed`,
          { description: 'Check the list for details' }
        );
      }
    },
  });
}
```

**Key Points:**
- `useImportTrainingFile` - Import single file
- `useAvailableTrainingFiles` - Fetch importable files
- `useBulkImportTrainingFiles` - Import multiple files at once
- Auto-invalidates both training-files and datasets queries
- Toast notifications for user feedback

---

### Feature DB-4: Training Files Import UI

**Type:** UI Page  
**Strategy:** NEW - import management interface

#### Implementation Details

**File:** `src/app/(dashboard)/datasets/import/page.tsx`

**Route:** `/datasets/import`

**Purpose:** UI for importing training files as datasets

**Implementation:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAvailableTrainingFiles, useImportTrainingFile, useBulkImportTrainingFiles } from '@/hooks/useTrainingFileImport';
import { Loader2, Download, CheckCircle, AlertCircle, ArrowLeft, Package } from 'lucide-react';

export default function ImportTrainingFilesPage() {
  const router = useRouter();
  const { data, isLoading } = useAvailableTrainingFiles();
  const importFile = useImportTrainingFile();
  const bulkImport = useBulkImportTrainingFiles();
  const [importing, setImporting] = useState<Set<string>>(new Set());

  const handleImport = async (fileId: string) => {
    setImporting(prev => new Set(prev).add(fileId));
    try {
      await importFile.mutateAsync(fileId);
    } finally {
      setImporting(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleBulkImport = async () => {
    if (!data?.data.available_for_import) return;
    const ids = data.data.available_for_import.map((f: any) => f.id);
    await bulkImport.mutateAsync(ids);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const summary = data?.data.summary;
  const availableFiles = data?.data.available_for_import || [];
  const allFiles = data?.data.all_training_files || [];

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/datasets')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Training Files</h1>
          <p className="text-gray-600 mt-1">
            Import your existing training files as datasets for the LoRA pipeline
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            Overview of your training files and import status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Training Files</div>
              <div className="text-2xl font-bold">{summary?.total_training_files || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Already Imported</div>
              <div className="text-2xl font-bold text-green-600">{summary?.already_imported || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Available to Import</div>
              <div className="text-2xl font-bold text-blue-600">{summary?.available_for_import || 0}</div>
            </div>
          </div>

          {availableFiles.length > 0 && (
            <div className="mt-6">
              <Button
                onClick={handleBulkImport}
                disabled={bulkImport.isPending}
                className="w-full"
              >
                {bulkImport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Import All {availableFiles.length} Training Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Files Available */}
      {allFiles.length === 0 && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            No training files found. Create training files from your conversations first.
          </AlertDescription>
        </Alert>
      )}

      {/* All Files Already Imported */}
      {allFiles.length > 0 && availableFiles.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            All your training files have been imported as datasets. You can now configure training jobs!
          </AlertDescription>
        </Alert>
      )}

      {/* Training Files List */}
      {allFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training Files</CardTitle>
            <CardDescription>
              {availableFiles.length > 0 
                ? `${availableFiles.length} file(s) available for import` 
                : 'All files imported'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allFiles.map((file: any) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{file.name}</h3>
                      {file.is_imported ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Imported
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Available
                        </Badge>
                      )}
                    </div>
                    {file.description && (
                      <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{file.conversation_count} conversations</span>
                      <span>{file.total_training_pairs} training pairs</span>
                      <span>{(file.jsonl_file_size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {!file.is_imported && (
                    <Button
                      onClick={() => handleImport(file.id)}
                      disabled={importing.has(file.id)}
                      size="sm"
                    >
                      {importing.has(file.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.push('/datasets')}
          className="flex-1"
        >
          Back to Datasets
        </Button>
        <Button 
          onClick={() => router.push('/training/configure')}
          disabled={summary?.already_imported === 0}
          className="flex-1"
        >
          Configure Training Job
        </Button>
      </div>
    </div>
  );
}
```

**Key Points:**
- Shows summary statistics (total, imported, available)
- Bulk import button for importing all files at once
- List of all training files with import status badges
- Individual import buttons for each file
- Loading states during import operations
- Navigation to datasets and training configuration

---

## ✅ Acceptance Criteria

### Functional Requirements

**FR-DB-1: Import Training File API**
- [ ] POST /api/datasets/import-from-training-file works
- [ ] Validates user owns the training file
- [ ] Checks for duplicate imports (409 status)
- [ ] Correctly maps all fields from training_files to datasets
- [ ] Calculates total_tokens estimate (training_pairs × 200)
- [ ] Calculates averages (turns per conv, tokens per turn)
- [ ] Sets status='ready' and training_ready=true
- [ ] Keeps files in 'training-files' bucket
- [ ] Returns created dataset record

**FR-DB-2: List Available Training Files API**
- [ ] GET /api/training-files/available-for-import works
- [ ] Returns all user's training files
- [ ] Identifies which files are already imported
- [ ] Provides summary statistics
- [ ] Filters by user_id (RLS enforced)

**FR-DB-3: React Hooks**
- [ ] useImportTrainingFile hook works
- [ ] useAvailableTrainingFiles hook works
- [ ] useBulkImportTrainingFiles hook works
- [ ] Auto-invalidates queries after import
- [ ] Toast notifications show success/error messages

**FR-DB-4: Import UI**
- [ ] Page loads and displays training files
- [ ] Shows import status for each file
- [ ] Individual import buttons work
- [ ] Bulk import button imports all files
- [ ] Loading states show during operations
- [ ] Navigation to datasets and training config works
- [ ] Handles empty state (no training files)
- [ ] Handles all-imported state

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All imports resolve correctly
- [ ] Follows existing patterns (API, React Query, UI)
- [ ] Zod validation for API requests
- [ ] Proper error handling

### Integration Requirements

- [ ] Imported datasets appear in datasets list (E02)
- [ ] Imported datasets work with training configuration (E03)
- [ ] RLS policies enforced (users see only own data)
- [ ] No duplicate imports (same file imported twice)

---

## 🧪 Testing & Validation

### Manual Testing Steps

#### 1. API Testing: Import Single Training File

```bash
# Get available training files
curl -X GET http://localhost:3000/api/training-files/available-for-import \
  -H "Cookie: your-auth-cookie"

# Import a training file
curl -X POST http://localhost:3000/api/datasets/import-from-training-file \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "training_file_id": "uuid-of-training-file"
  }'

# Verify duplicate protection
curl -X POST http://localhost:3000/api/datasets/import-from-training-file \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "training_file_id": "same-uuid"
  }'
# Should return 409 Conflict
```

#### 2. Database Verification

```bash
# Use SAOL to verify dataset created
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && \
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{\
const r=await saol.agentQuery({table:'datasets',select:'id,name,storage_bucket,storage_path,total_training_pairs,training_ready,status',orderBy:[{column:'created_at',asc:false}],limit:5});\
if(r.success){console.log('Imported datasets:',r.data.length);\
r.data.forEach(d=>console.log('-',d.name,'|',d.storage_bucket,'|',d.status,'|',d.training_ready));\
}})();"
```

#### 3. UI Testing: Import Page

1. Navigate to: `http://localhost:3000/datasets/import`
2. Verify:
   - Summary statistics display correctly
   - Training files list shows all files
   - Import status badges show correctly
   - Bulk import button is visible
3. Click individual "Import" button
   - Loading state shows
   - Success toast appears
   - File badge changes to "Imported"
   - File disappears from available list
4. Click "Import All" button
   - All files import sequentially
   - Progress shown in UI
   - Summary updates

#### 4. Integration Testing

1. Import a training file
2. Navigate to `/datasets`
   - Imported file appears in datasets list
3. Navigate to `/training/configure?datasetId={imported-dataset-id}`
   - Configuration page loads correctly
   - Can configure training job with imported dataset

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `src/app/api/datasets/import-from-training-file/route.ts` - Import API
- [ ] `src/app/api/training-files/available-for-import/route.ts` - List API
- [ ] `src/hooks/useTrainingFileImport.ts` - React Query hooks (3 hooks)
- [ ] `src/app/(dashboard)/datasets/import/page.tsx` - Import UI page

### API Endpoints

- [ ] `POST /api/datasets/import-from-training-file` - Import single file
- [ ] `GET /api/training-files/available-for-import` - List importable files

### React Hooks

- [ ] `useImportTrainingFile` - Import single file
- [ ] `useAvailableTrainingFiles` - Fetch importable files
- [ ] `useBulkImportTrainingFiles` - Import multiple files

### UI Pages

- [ ] `/datasets/import` - Training files import interface

---

## 🔜 What's Next

### After This Section

**Sequence Continuation:** 
- ✅ E01: Database Foundation
- ✅ E02: Dataset Management  
- ✅ E03: Training Configuration
- ✅ **DATA-BRIDGE: Import Existing Training Files** ← YOU ARE HERE
- ⏳ E04: Training Execution (can now use imported datasets)
- ⏳ E05: Job Monitoring
- ⏳ E06: Model Management
- ⏳ E07: Cost Tracking & Analytics

### For Section E04

Section E04 can now assume:
- ✅ Datasets table is populated with imported training files
- ✅ Users have datasets ready for training immediately
- ✅ No waiting for new uploads to test training functionality

---

## ⚠️ Important Reminders

1. **Storage Bucket**: Keep files in 'training-files' bucket - DO NOT copy to 'lora-datasets'
2. **Duplicate Prevention**: Check storage_path before importing
3. **Statistics Calculation**: Estimate total_tokens as training_pairs × 200
4. **Status Flags**: Set status='ready' and training_ready=true
5. **User Isolation**: Enforce RLS - users only import own training files
6. **No Data Loss**: Import is non-destructive - original training_files remain unchanged

---

**End of Section DATA-BRIDGE Execution Prompts**

