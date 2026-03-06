# Integration Merge Meta-Prompt

**Version:** 1.0  
**Date:** December 23, 2025  
**Purpose:** Transform structured specification into integrated extension specification by replacing generic infrastructure with existing codebase patterns

---

## CRITICAL FRAMING

You are transforming a **structured specification** (which describes FEATURES using generic infrastructure) into an **integrated extension specification** (which describes the SAME FEATURES using the EXISTING codebase's infrastructure).

**What you are doing:**
- Extracting FEATURES from the structured spec (WHAT to build)
- Replacing generic infrastructure references (Prisma, NextAuth, S3, BullMQ) with existing codebase patterns (Supabase)
- Producing a spec that is ready for progressive segmentation into execution prompts

**What you are NOT doing:**
- Comparing two applications for compatibility
- Deciding whether to use existing infrastructure (decision is MADE - always use existing)
- Creating new infrastructure setup instructions

---

## INPUT FILES

### Input 1: Structured Specification
**File**: `{{STRUCTURED_SPEC_PATH}}`

This file contains 7 sections of feature requirements organized as:
- Section 1: Foundation & Authentication
- Section 2: Dataset Management
- Section 3: Training Configuration
- Section 4: Training Execution & Monitoring
- Section 5: Model Artifacts & Delivery
- Section 6: Cost Tracking & Notifications
- Section 7: Complete System Integration

**How to Read:**
- Extract the FEATURES from each section (data models, APIs, UI pages, workflows)
- IGNORE the infrastructure setup instructions (Prisma schema, NextAuth config, S3 setup, BullMQ workers)
- Focus on WHAT the user does, WHAT data is stored, WHAT APIs are needed

### Input 2: Infrastructure Inventory
**File**: `{{INFRASTRUCTURE_INVENTORY_PATH}}`

This file documents what EXISTS in the codebase for you to USE:
- Authentication patterns (Supabase Auth with `requireAuth()`)
- Database patterns (Supabase Client with direct queries)
- Storage patterns (Supabase Storage with on-demand signed URLs)
- API patterns (Next.js API routes with consistent response format)
- Component patterns (shadcn/ui components)
- State management patterns (React Query with custom hooks)

**How to Use:**
- For every infrastructure need in the structured spec, find the corresponding pattern from this inventory
- Copy the exact pattern (code, imports, structure)
- Replace spec's infrastructure with inventory's patterns

### Input 3: Extension Strategy
**File**: `{{EXTENSION_STRATEGY_PATH}}`

This file maps each feature area to existing infrastructure:
- Lists all features extracted from the spec
- Defines which existing infrastructure each feature uses
- Specifies what NEW to create (tables, APIs, pages, components)
- Specifies what NOT to create (existing infrastructure)

**How to Use:**
- Use this as a cross-reference to ensure you're mapping features correctly
- Check that your transformations align with the decisions in this strategy

### Input 4: Implementation Guide
**File**: `{{IMPLEMENTATION_GUIDE_PATH}}`

This file provides exact code patterns for:
- Database migrations (SQL with RLS policies)
- Type definitions (TypeScript interfaces)
- API routes (complete implementations)
- Components (complete implementations)
- Pages (complete implementations)

**How to Use:**
- Reference these patterns when transforming code examples in the spec
- Ensure consistency with the exact patterns shown here

---

## TRANSFORMATION RULES

### Rule 1: Section Header Transformation

**Original (from spec):**
```markdown
## SECTION [N]: [Section Name]
```

**Transformed (in integrated spec):**
```markdown
## SECTION [N]: [Section Name] - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: [List what spec used]  
**Actual Infrastructure**: [List what we're using from codebase]
```

---

### Rule 2: Database Schema Transformation

**Original (from spec):**
```prisma
model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(...)
  name        String
  status      String
  createdAt   DateTime      @default(now())
}
```

**Transformed (in integrated spec):**
```markdown
**Database Schema (INTEGRATED):**

Instead of Prisma, use **Supabase Client** with direct SQL migration:

**Migration File**: `supabase/migrations/YYYYMMDD_create_datasets_table.sql`

```sql
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'uploading',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);
```

**TypeScript Interface:**

```typescript
// File: src/lib/types/lora-training.ts
export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  status: 'uploading' | 'validating' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}
```
```

---

### Rule 3: Authentication Transformation

**Original (from spec):**
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = session.user.id;
  // ... rest of logic
}
```

**Transformed (in integrated spec):**
```markdown
**Authentication (INTEGRATED):**

Instead of NextAuth, use **Supabase Auth** with existing patterns:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Use existing auth pattern
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401 if not authenticated
  
  const userId = user.id;
  // ... rest of logic
}
```

**Pattern Source**: Infrastructure Inventory Section 1 - Authentication
```

---

### Rule 4: Storage Transformation

**Original (from spec):**
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Generate presigned URL
const command = new PutObjectCommand({
  Bucket: 'datasets-bucket',
  Key: `${userId}/${datasetId}/${fileName}`,
  ContentType: 'application/json',
});

const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
```

**Transformed (in integrated spec):**
```markdown
**Storage (INTEGRATED):**

Instead of AWS S3, use **Supabase Storage** with existing patterns:

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  
  const supabase = createServerSupabaseAdminClient();
  
  // Generate storage path
  const storagePath = `${user.id}/${datasetId}/${fileName}`;
  
  // Create presigned upload URL
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('lora-datasets') // Bucket name
    .createSignedUploadUrl(storagePath);
  
  if (uploadError) {
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: uploadError.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      uploadUrl: uploadData.signedUrl,
      storagePath: storagePath,
    }
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 3 - Storage

**Storage Best Practices**:
- Never store URLs in database - store only `storage_path`
- Generate signed URLs on-demand via API routes
- Use admin client for signing operations
- Set appropriate expiry (3600 seconds = 1 hour)
```

---

### Rule 5: API Route Transformation

**Original (from spec):**
```typescript
// Generic API route structure
export async function GET(request: NextRequest) {
  // Auth check
  // Database query
  // Return response
}
```

**Transformed (in integrated spec):**
```markdown
**API Route (INTEGRATED):**

Use exact pattern from Infrastructure Inventory Section 4:

**File**: `src/app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/datasets - List user's datasets
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication (existing pattern)
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    // Query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Database query (existing pattern)
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
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
        datasets: data,
        total: count || 0,
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 - API Architecture
```

---

### Rule 6: Component Transformation

**Original (from spec):**
```tsx
// Generic component structure
import { Button } from '@/components/ui/button';

export function DatasetCard() {
  return <div>...</div>;
}
```

**Transformed (in integrated spec):**
```markdown
**Component (INTEGRATED):**

Use exact patterns from Infrastructure Inventory Section 5:

**File**: `src/components/datasets/DatasetCard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Dataset } from '@/lib/types/lora-training';

interface DatasetCardProps {
  dataset: Dataset;
  onSelect?: (dataset: Dataset) => void;
}

export function DatasetCard({ dataset, onSelect }: DatasetCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{dataset.name}</CardTitle>
          <Badge>{dataset.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => onSelect?.(dataset)}
          variant="outline"
          className="w-full"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Pattern Source**: Infrastructure Inventory Section 5 - Component Library

**Available Components**: All 47+ shadcn/ui components from `/components/ui/`
```

---

### Rule 7: Data Fetching Transformation

**Original (from spec):**
```typescript
import useSWR from 'swr';

export function useDatasets() {
  const { data, error } = useSWR('/api/datasets', fetcher);
  return { data, error };
}
```

**Transformed (in integrated spec):**
```markdown
**Data Fetching (INTEGRATED):**

Instead of SWR, use **React Query** with existing patterns:

**File**: `src/hooks/use-datasets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dataset } from '@/lib/types/lora-training';

export function useDatasets(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['datasets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      
      const response = await fetch(`/api/datasets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      return response.json();
    },
    staleTime: 60 * 1000, // 60 seconds (existing config)
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
      if (!response.ok) throw new Error('Failed to create dataset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
```

**Pattern Source**: Infrastructure Inventory Section 6 - State & Data Fetching
```

---

### Rule 8: Background Processing Transformation

**Original (from spec):**
```typescript
// BullMQ worker setup
import { Worker } from 'bullmq';

const worker = new Worker('dataset-validation', async (job) => {
  // Validation logic
});
```

**Transformed (in integrated spec):**
```markdown
**Background Processing (INTEGRATED):**

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
    .eq('status', 'uploaded');
  
  for (const dataset of datasets) {
    // Perform validation
    const validationResult = await validateDataset(dataset);
    
    // Update dataset
    await supabase
      .from('datasets')
      .update({
        status: validationResult.isValid ? 'ready' : 'error',
        validation_errors: validationResult.errors,
        total_training_pairs: validationResult.stats?.total_pairs,
        validated_at: new Date().toISOString(),
      })
      .eq('id', dataset.id);
  }
  
  return new Response('OK');
});
```

**Deployment**: Via Supabase CLI (`supabase functions deploy validate-datasets`)

**Cron Trigger**: Configure in Supabase Dashboard  
- Function: `validate-datasets`
- Schedule: `*/5 * * * *` (every 5 minutes)

**Reason for Change**: BullMQ + Redis adds infrastructure complexity. Supabase Edge Functions + Cron provides equivalent functionality with less overhead.

**Pattern Source**: Extension Strategy Section - Background Processing
```

---

## OUTPUT STRUCTURE

For each section in the structured spec, produce an integrated section with this structure:

```markdown
## SECTION [N]: [Section Name] - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: [List technologies from spec]  
**Actual Infrastructure**: [List what we're using from codebase]

---

### Overview (from original spec)

[Copy the section purpose and user value unchanged]

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- [List existing infrastructure this section USES]
- [Reference to specific files/functions from Infrastructure Inventory]

**Previous Section Prerequisites**:
- [List what from previous sections this section needs]

---

### Features & Requirements (INTEGRATED)

#### FR-[N].[M]: [Feature Name]

**Type**: [Original type from spec]

**Description**: [Original description from spec]

**Implementation Strategy**: EXTENSION (using existing infrastructure)

---

**Database Changes (INTEGRATED)**:

[Apply Rule 2: Database Schema Transformation]

---

**API Routes (INTEGRATED)**:

[Apply Rule 5: API Route Transformation]

---

**Components (INTEGRATED)**:

[Apply Rule 6: Component Transformation]

---

**Data Fetching (INTEGRATED)**:

[Apply Rule 7: Data Fetching Transformation]

---

**Acceptance Criteria** (from spec):

[Copy acceptance criteria from spec, adjust for infrastructure changes]

---

**Verification Steps**:

1. ✅ Database: Migration applied, tables exist, RLS policies active
2. ✅ API: Endpoints respond correctly, authentication works
3. ✅ Components: UI renders correctly, uses shadcn/ui components
4. ✅ Integration: Feature works end-to-end with existing infrastructure

---

[Repeat for each FR in section]

---

### Section Summary

**What Was Added**:
- [List new tables]
- [List new API routes]
- [List new components]
- [List new pages]
- [List new hooks]

**What Was Reused**:
- [List existing infrastructure used]

**Integration Points**:
- [How this section connects to existing codebase]

---

```

---

## VALIDATION CHECKLIST

After transformation, verify for EACH section:

### Infrastructure Validation
- [ ] ✅ No Prisma references remain (use Supabase Client)
- [ ] ✅ No NextAuth references remain (use Supabase Auth)
- [ ] ✅ No direct S3 SDK references remain (use Supabase Storage)
- [ ] ✅ No BullMQ/Redis references remain (use Edge Functions)
- [ ] ✅ No SWR references remain (use React Query)

### Pattern Consistency Validation
- [ ] ✅ All database operations use Supabase query builder
- [ ] ✅ All auth uses `requireAuth()` pattern
- [ ] ✅ All storage uses on-demand signed URLs
- [ ] ✅ All API routes follow existing response format
- [ ] ✅ All components import from `/components/ui/`
- [ ] ✅ All hooks use React Query patterns

### Documentation Validation
- [ ] ✅ Each FR references Infrastructure Inventory section
- [ ] ✅ Pattern sources are cited
- [ ] ✅ Exact code patterns match inventory
- [ ] ✅ Dependencies are explicit and accurate

---

## SECTION PROCESSING ORDER

Process sections sequentially (dependencies matter):

1. **Section 1: Foundation & Authentication**
   - Transform to use existing Supabase Auth (SKIP most of it - already exists)
   - Transform database schema to Supabase migrations
   - Keep only NEW tables needed for LoRA training

2. **Section 2: Dataset Management**
   - Depends on Section 1 (auth, base schema)
   - Transform storage to Supabase Storage
   - Transform validation workers to Edge Functions

3. **Section 3: Training Configuration**
   - Depends on Section 1 (auth) and Section 2 (datasets)
   - Transform configuration storage to JSONB columns

4. **Section 4: Training Execution & Monitoring**
   - Depends on Sections 1-3
   - Transform BullMQ to Edge Functions + Cron
   - Transform SSE to React Query polling

5. **Section 5: Model Artifacts & Delivery**
   - Depends on Section 4 (job completion)
   - Transform S3 artifacts to Supabase Storage

6. **Section 6: Cost Tracking & Notifications**
   - Depends on all previous sections
   - Transform to simple database inserts

7. **Section 7: Complete System Integration**
   - Depends on all previous sections
   - Validate all transformations are consistent

---

## SPECIAL HANDLING

### Section 1 Special Case
Section 1 of the spec is "Foundation & Authentication" which sets up NextAuth, Prisma, and base infrastructure. Since our codebase ALREADY HAS all of this (Supabase Auth, Supabase DB), you should:

**SKIP** most of Section 1 infrastructure setup

**KEEP** from Section 1:
- New database tables specific to LoRA training (datasets, training_jobs, etc.)
- Dashboard page structure (if different from existing)
- Any LoRA-specific models not in existing codebase

**TRANSFORM** Section 1 to:
```markdown
## SECTION 1: Foundation & Authentication - INTEGRATED

**Extension Status**: ✅ Most infrastructure ALREADY EXISTS - only adding LoRA-specific tables

**What Already Exists**:
- ✅ Next.js 14 App Router with TypeScript
- ✅ Supabase Auth with protected routes
- ✅ Supabase PostgreSQL database
- ✅ Supabase Storage
- ✅ shadcn/ui components
- ✅ Dashboard layout and routing

**What We're Adding** (LoRA Training specific):
- New database tables: datasets, training_jobs, metrics_points, model_artifacts, cost_records, notifications
- New storage buckets: lora-datasets, lora-models

[Then provide only the NEW table migrations]
```

---

## BEGIN TRANSFORMATION

Process each section of the structured specification sequentially:

1. Read Section [N] from structured spec
2. Identify all features and requirements
3. For each infrastructure component mentioned, find the replacement pattern from Infrastructure Inventory
4. Apply transformation rules (Rules 1-8)
5. Generate integrated section following Output Structure
6. Run Validation Checklist
7. Move to next section

**Output File**: {{OUTPUT_PATH}}

**Structure**:
```markdown
# BrightRun LoRA Training Platform - Integrated Extension Specification

**Version:** 1.0  
**Date:** [Current Date]  
**Source:** 04c-pipeline-structured-from-wireframe_v1.md  
**Integration Basis:** Infrastructure Inventory v1, Extension Strategy v1, Implementation Guide v1

---

## INTEGRATION SUMMARY

This specification describes how to implement the BrightRun LoRA Training Platform as an EXTENSION to the existing BrightHub application.

**Approach**: EXTENSION (not separate application)

**Infrastructure Decisions**:
- ✅ Use existing Supabase Auth (not NextAuth)
- ✅ Use existing Supabase PostgreSQL (not Prisma)
- ✅ Use existing Supabase Storage (not S3)
- ✅ Use existing shadcn/ui components
- ✅ Use existing React Query (not SWR)
- ✅ Use Edge Functions + Cron (not BullMQ + Redis)

**What We're Adding**:
- 7 new database tables
- 2 new storage buckets
- ~25 new API routes
- ~8-10 new pages
- ~25-30 new components
- ~15 new hooks
- 2 Edge Functions

**What We're NOT Creating**:
- ❌ New authentication system
- ❌ New database client
- ❌ New storage client
- ❌ Job queue infrastructure
- ❌ Component library

---

[SECTION 1: Foundation & Authentication - INTEGRATED]

[SECTION 2: Dataset Management - INTEGRATED]

[SECTION 3: Training Configuration - INTEGRATED]

[SECTION 4: Training Execution & Monitoring - INTEGRATED]

[SECTION 5: Model Artifacts & Delivery - INTEGRATED]

[SECTION 6: Cost Tracking & Notifications - INTEGRATED]

[SECTION 7: Complete System Integration - INTEGRATED]

---

## APPENDIX: Integration Reference

### Infrastructure Inventory Cross-Reference
[Quick reference to key patterns from inventory]

### Extension Strategy Alignment
[Confirmation that all transformations align with strategy]

### Implementation Guide Patterns
[Index of exact patterns used]

---

**Document Status**: READY FOR SEGMENTATION  
**Next Step**: Run segmentation script (04f-segment-integrated-spec_v1.js)
```

---

**Meta-Prompt Version**: 1.0  
**Date**: December 23, 2025  
**Status**: Ready for Execution  
**Input File Paths**: To be provided at runtime
