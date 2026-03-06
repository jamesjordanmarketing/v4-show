# Integration Merge Meta-Prompt

**Version**: 1.0  
**Date**: December 23, 2025  
**Purpose**: Transform structured specification into integrated extension specification by replacing generic infrastructure references with existing codebase patterns

---

## OBJECTIVE

You are an AI agent tasked with merging a structured specification with integration knowledge to produce an **Integrated Extension Specification**. 

**What you will do**:
1. Read the structured specification (defines WHAT to build)
2. Read three integration documents (define HOW to build using existing infrastructure)
3. Transform each section of the spec by replacing generic infrastructure with existing codebase patterns
4. Output a new specification where all infrastructure choices match the existing codebase

**What you will NOT do**:
- Do NOT change the features or requirements
- Do NOT remove functionality
- Do NOT add new features not in the original spec
- Do NOT skip sections

---

## INPUT FILES

You will receive four input files:

### Input 1: Structured Specification
**Purpose**: Defines WHAT to build (features, requirements, user flows)  
**Contains**: 7 sections with detailed feature requirements  
**Infrastructure Used**: Generic (Prisma, NextAuth, S3, BullMQ) - IGNORE THESE  
**What to Extract**: Feature descriptions, acceptance criteria, user flows, data models

### Input 2: Infrastructure Inventory
**Purpose**: Documents what EXISTS in the codebase to USE  
**Contains**: Authentication patterns, database patterns, storage patterns, API templates, component library  
**What to Extract**: Exact code patterns, function names, file paths, usage examples

### Input 3: Extension Strategy
**Purpose**: Maps each feature area to existing infrastructure  
**Contains**: Feature-to-infrastructure mapping, what to create vs what to use  
**What to Extract**: Infrastructure decisions, alternatives chosen, integration approach

### Input 4: Implementation Guide
**Purpose**: Provides exact implementation patterns  
**Contains**: Phase-by-phase instructions, complete code examples, migration templates  
**What to Extract**: Exact code to use, table schemas, API route patterns, component patterns

---

## TRANSFORMATION RULES

Apply these rules systematically to transform each section:

### Rule 1: Database Schema Transformation

**FROM (Structured Spec - Generic)**:
```prisma
model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(...)
  name        String
  status      DatasetStatus
  createdAt   DateTime      @default(now())
}
```

**TO (Integrated Spec - Supabase)**:
```sql
-- Migration: supabase/migrations/YYYYMMDD_create_datasets.sql
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'uploading',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);

-- RLS Policy
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);
```

**Key Changes**:
- Prisma model → SQL migration
- `@id @default(cuid())` → `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `userId` → `user_id` (snake_case)
- Add RLS policies for security
- Add indexes for performance
- Add `updated_at` with trigger

---

### Rule 2: Authentication Transformation

**FROM (Structured Spec - NextAuth)**:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = session.user.id;
  // ... proceed with authenticated request
}
```

**TO (Integrated Spec - Supabase Auth)**:
```typescript
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Authentication using existing pattern
  const { user, response } = await requireAuth(request);
  if (response) return response; // Returns 401 if not authenticated
  
  // user.id is now available
  const userId = user.id;
  // ... proceed with authenticated request
}
```

**Key Changes**:
- `getServerSession()` → `requireAuth()`
- `authOptions` → not needed (handled internally)
- `session.user.id` → `user.id`
- Cleaner error handling (response returned directly)

---

### Rule 3: Storage Transformation

**FROM (Structured Spec - S3 SDK)**:
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Generate presigned upload URL
const command = new PutObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: `datasets/${userId}/${datasetId}/file.jsonl`,
});

const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
```

**TO (Integrated Spec - Supabase Storage)**:
```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

// Generate presigned upload URL
const supabase = createServerSupabaseAdminClient();

const storagePath = `datasets/${userId}/${datasetId}/file.jsonl`;

const { data, error } = await supabase
  .storage
  .from('lora-datasets') // Bucket name
  .createSignedUploadUrl(storagePath);

if (error) {
  return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
}

const uploadUrl = data.signedUrl;
```

**Key Changes**:
- S3 SDK → Supabase Storage client
- `S3Client` → `createServerSupabaseAdminClient()`
- `PutObjectCommand` → `.storage.from(bucket).createSignedUploadUrl()`
- Bucket from env → Bucket name as string
- Error handling via `{ data, error }` pattern

---

### Rule 4: Database Query Transformation

**FROM (Structured Spec - Prisma)**:
```typescript
import { prisma } from "@/lib/db";

// Query datasets
const datasets = await prisma.dataset.findMany({
  where: {
    userId: user.id,
    status: "ready",
    deletedAt: null,
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 25,
  skip: (page - 1) * 25,
});

// Count total
const total = await prisma.dataset.count({
  where: { userId: user.id, deletedAt: null },
});
```

**TO (Integrated Spec - Supabase Client)**:
```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

const supabase = await createServerSupabaseClient();

// Query datasets
const { data: datasets, error } = await supabase
  .from('datasets')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'ready')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .range((page - 1) * 25, page * 25 - 1);

if (error) {
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
}

// Count total (separate query)
const { count, error: countError } = await supabase
  .from('datasets')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .is('deleted_at', null);
```

**Key Changes**:
- `prisma.dataset.findMany()` → `supabase.from('datasets').select()`
- `where: { userId }` → `.eq('user_id', userId)`
- `orderBy: { createdAt: "desc" }` → `.order('created_at', { ascending: false })`
- `take/skip` → `.range(start, end)`
- Separate count query
- Error handling via `{ data, error }` pattern

---

### Rule 5: API Response Format Transformation

**FROM (Structured Spec - Generic)**:
```typescript
// Success
return NextResponse.json({
  success: true,
  data: { datasets },
});

// Error
return NextResponse.json({
  success: false,
  error: { code: "NOT_FOUND", message: "Dataset not found" },
}, { status: 404 });
```

**TO (Integrated Spec - Existing Pattern)**:
```typescript
// Success (same pattern - keep as is)
return NextResponse.json({
  success: true,
  data: { datasets },
});

// Error (simplified - match existing codebase)
return NextResponse.json({
  error: "Dataset not found",
  details: "No dataset found with the provided ID",
}, { status: 404 });
```

**Key Changes**:
- Success response: Keep `{ success: true, data }` pattern
- Error response: Simplify to `{ error, details }` (match existing codebase)
- Remove nested error objects

---

### Rule 6: Component Import Transformation

**FROM (Structured Spec - Generic shadcn/ui)**:
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

**TO (Integrated Spec - Existing Components)**:
```typescript
// Same imports - existing codebase already has these components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

// Note: All shadcn/ui components are already available in the codebase
// See Infrastructure Inventory for complete list of 47+ available components
```

**Key Changes**:
- No changes needed for component imports
- Add comment noting components already exist
- Reference Infrastructure Inventory for full list

---

### Rule 7: State Management Transformation

**FROM (Structured Spec - SWR)**:
```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useDatasets() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/datasets',
    fetcher,
    { refreshInterval: 30000 }
  );
  
  return { datasets: data?.data, error, isLoading, mutate };
}
```

**TO (Integrated Spec - React Query)**:
```typescript
import { useQuery } from '@tanstack/react-query';

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await fetch('/api/datasets');
      if (!response.ok) throw new Error('Failed to fetch datasets');
      const json = await response.json();
      return json.data;
    },
    staleTime: 60000, // 60 seconds (existing codebase default)
    retry: 1,
  });
}

// Usage in component:
const { data: datasets, error, isLoading } = useDatasets();
```

**Key Changes**:
- `useSWR` → `useQuery` from React Query
- `refreshInterval` → `staleTime` (different semantics)
- `mutate` → use `useMutation` for mutations (separate hook)
- Match existing codebase configuration (60s stale time, 1 retry)

---

### Rule 8: Background Processing Transformation

**FROM (Structured Spec - BullMQ + Redis)**:
```typescript
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL);

const validationQueue = new Queue("dataset-validation", { connection });

// Add job to queue
await validationQueue.add("validate", { datasetId });

// Worker
const worker = new Worker("dataset-validation", async (job) => {
  const { datasetId } = job.data;
  // ... validation logic
}, { connection });
```

**TO (Integrated Spec - Supabase Edge Functions)**:
```typescript
// Instead of BullMQ, use Supabase Edge Function triggered by database event
// or cron schedule

// File: supabase/functions/validate-dataset/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { datasetId } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Fetch dataset
  const { data: dataset } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', datasetId)
    .single();
  
  // ... validation logic
  
  // Update dataset with results
  await supabase
    .from('datasets')
    .update({
      status: 'ready',
      validated_at: new Date().toISOString(),
      training_ready: true,
    })
    .eq('id', datasetId);
  
  return new Response('OK');
});

// Trigger: Call this Edge Function from API route after upload
// OR: Set up database trigger to call function when status changes
```

**Key Changes**:
- BullMQ + Redis → Supabase Edge Functions
- Queue system → Direct function invocation or database triggers
- Worker → Deno-based Edge Function
- Simpler architecture, no Redis dependency

---

## OUTPUT STRUCTURE

For each section in the structured spec, produce an integrated section with this structure:

```markdown
## SECTION [N]: [Section Name] - INTEGRATED

### Overview
[Copy section purpose and user value from original spec - unchanged]

### Dependencies

**Codebase Infrastructure Used**:
- Authentication: Supabase Auth via `requireAuth()` from `/lib/supabase-server.ts`
- Database: Supabase PostgreSQL via `createServerSupabaseClient()` from `/lib/supabase-server.ts`
- Storage: Supabase Storage via `createServerSupabaseAdminClient()` from `/lib/supabase-server.ts`
- Components: shadcn/ui components from `/components/ui/*` (47+ components available)
- State Management: React Query from `@tanstack/react-query`

**Previous Section Prerequisites**:
[List what from previous sections this section needs]

### Features & Requirements

#### FR-[N].[M]: [Feature Name]

**Type**: [Original type]

**Description**: [Original description - unchanged]

**Implementation (INTEGRATED)**:

**Database Schema**:
```sql
-- Migration: supabase/migrations/YYYYMMDD_[name].sql
[Transformed SQL using Supabase patterns]
```

**API Route**:
```typescript
// File: src/app/api/[route]/route.ts
[Transformed TypeScript using existing patterns from Infrastructure Inventory]
```

**React Hook**:
```typescript
// File: src/hooks/use-[feature].ts
[Transformed hook using React Query]
```

**UI Component**:
```typescript
// File: src/app/(dashboard)/[page]/page.tsx
[Transformed component using existing shadcn/ui components]
```

**Acceptance Criteria**:
[Copy from original spec - unchanged]

---

[Repeat for each FR in section]

### Testing Strategy
[Copy from original spec, update test examples to use Supabase patterns]

### Development Tasks
[Copy from original spec, update task descriptions to reference Supabase tools]

---

## END OF SECTION [N]

**Section Summary**:
[Summarize what was integrated in this section]

**Available for Next Section**:
[List what this section provides for subsequent sections]

---

[Repeat for all 7 sections]
```

---

## VALIDATION CHECKLIST

After transformation, verify each section:

- [ ] ✅ No Prisma references remain (replaced with Supabase Client)
- [ ] ✅ No NextAuth references remain (replaced with Supabase Auth)
- [ ] ✅ No S3 SDK references remain (replaced with Supabase Storage)
- [ ] ✅ No BullMQ/Redis references remain (replaced with Edge Functions or removed)
- [ ] ✅ No SWR references remain (replaced with React Query)
- [ ] ✅ All database operations use Supabase query builder
- [ ] ✅ All auth operations use `requireAuth()` or `useAuth()`
- [ ] ✅ All storage operations use Supabase Storage with signed URLs
- [ ] ✅ All API routes follow existing response format
- [ ] ✅ All components use existing shadcn/ui imports
- [ ] ✅ All migrations use Supabase SQL syntax with RLS policies
- [ ] ✅ All type definitions use TypeScript interfaces (not Prisma types)
- [ ] ✅ Feature descriptions unchanged from original spec
- [ ] ✅ Acceptance criteria unchanged from original spec
- [ ] ✅ User value propositions unchanged from original spec

---

## SECTION-BY-SECTION GUIDANCE

### Section 1: Foundation & Authentication

**Action**: SKIP most of this section - authentication already exists

**What to Keep**:
- Database schema definitions (transform to SQL migrations)
- Any NEW tables needed for LoRA training features

**What to Skip**:
- NextAuth setup (already have Supabase Auth)
- User model (already exists in auth.users)
- Login/signup pages (already exist)
- Session management (already exists)
- Middleware configuration (already exists)

**Output for Section 1**:
```markdown
## SECTION 1: Foundation & Authentication - INTEGRATED

### Overview
This section establishes database schema for LoRA training features. Authentication infrastructure already exists in the codebase using Supabase Auth.

### Dependencies
**Existing Infrastructure** (no changes needed):
- Authentication: Supabase Auth (cookie-based sessions)
- User Management: auth.users table
- Session Handling: Automatic via middleware
- Protected Routes: Automatic via (dashboard) layout

### New Database Tables

[Only include NEW tables for LoRA training - transform to SQL]

### END OF SECTION 1
```

---

### Section 2: Dataset Management

**Action**: FULLY TRANSFORM this section

**Key Transformations**:
- Prisma Dataset model → SQL CREATE TABLE with RLS
- S3 presigned URLs → Supabase Storage signed URLs
- BullMQ validation worker → Edge Function
- SWR hooks → React Query hooks
- API routes → Use `requireAuth()` pattern

**Focus Areas**:
- Dataset upload flow (presigned URL generation)
- Dataset validation (Edge Function instead of worker)
- Dataset CRUD APIs (Supabase query builder)
- Dataset list page (React Query + existing components)

---

### Section 3: Training Configuration

**Action**: FULLY TRANSFORM this section

**Key Transformations**:
- TrainingJob model → SQL CREATE TABLE
- Cost estimation API → Standard API route with Supabase
- Configuration page → Use existing form components
- React Query for real-time cost updates

**Focus Areas**:
- Hyperparameter preset system (client-side logic)
- GPU configuration (client-side logic)
- Cost estimation calculator (API route + React Query)
- Training job creation (API route with Supabase insert)

---

### Section 4: Training Execution & Monitoring

**Action**: FULLY TRANSFORM this section

**Key Transformations**:
- BullMQ job queue → Edge Function with cron trigger
- SSE streaming → React Query polling (simpler)
- MetricsPoint inserts → Supabase inserts from Edge Function
- Real-time updates → React Query refetchInterval

**Focus Areas**:
- Job submission to GPU cluster (API route)
- Status polling (Edge Function triggered by cron)
- Metrics storage (Supabase inserts)
- Real-time UI updates (React Query polling every 5 seconds)

---

### Section 5: Model Artifacts & Delivery

**Action**: FULLY TRANSFORM this section

**Key Transformations**:
- ModelArtifact model → SQL CREATE TABLE
- S3 artifact storage → Supabase Storage
- Download URLs → Supabase signed URLs
- Quality metrics calculation (server-side logic)

**Focus Areas**:
- Artifact storage after training completion
- Quality metrics calculation from training history
- Download URL generation (on-demand signed URLs)
- Model detail page (React Query + existing components)

---

### Section 6: Cost Tracking & Notifications

**Action**: FULLY TRANSFORM this section

**Key Transformations**:
- CostRecord model → SQL CREATE TABLE
- Notification model → SQL CREATE TABLE
- Cost tracking (Supabase inserts during training)
- Budget alerts (check in Edge Function)

**Focus Areas**:
- Real-time cost tracking during training
- Cost breakdown queries (Supabase aggregations)
- Notification creation (Supabase inserts)
- Notification display (React Query + existing components)

---

### Section 7: Complete System Integration

**Action**: UPDATE with Supabase-specific integration points

**Key Transformations**:
- Update integration matrix to reference Supabase components
- Update testing strategy to use Supabase test utilities
- Update deployment checklist for Supabase (no Redis, no BullMQ)

---

## CRITICAL REMINDERS

1. **DO NOT change features** - Only change HOW they're implemented, not WHAT is implemented
2. **DO NOT remove functionality** - Find Supabase equivalents for all features
3. **DO NOT add new features** - Only transform what's in the original spec
4. **DO reference exact files** - Use file paths from Infrastructure Inventory
5. **DO use exact patterns** - Copy code patterns from Infrastructure Inventory and Implementation Guide
6. **DO maintain progressive structure** - Each section builds on previous sections
7. **DO preserve acceptance criteria** - Copy unchanged from original spec
8. **DO preserve user value** - Copy unchanged from original spec

---

## OUTPUT FILE

**Filename**: `04e-integrated-extension-spec_v1.md`

**Structure**:
```markdown
# BrightRun LoRA Training Platform - Integrated Extension Specification

**Version:** 1.0 (Integrated)
**Source Document:** `04c-pipeline-structured-from-wireframe_v1.md`
**Integration Date:** [Current Date]
**Framework:** Next.js 14 (App Router) with TypeScript
**Infrastructure:** Supabase (Auth, PostgreSQL, Storage)
**Status:** Ready for Segmentation

---

## EXECUTIVE SUMMARY

[Copy from original spec, update tech stack section to reflect Supabase]

---

## TABLE OF CONTENTS

[Same as original spec]

---

## SECTION 1: Foundation & Authentication - INTEGRATED

[Transformed section 1]

---

## SECTION 2: Dataset Management - INTEGRATED

[Transformed section 2]

---

[... Continue for all 7 sections ...]

---

## APPENDICES

[Update appendices with Supabase-specific information]

---

**Document Status**: INTEGRATED - Ready for Segmentation
**Next Step**: Run segmentation script to generate execution prompts
```

---

## BEGIN TRANSFORMATION

You are now ready to begin the transformation process. Follow these steps:

1. Read all four input files completely
2. For each section in the structured spec:
   a. Extract feature requirements
   b. Apply transformation rules
   c. Reference Infrastructure Inventory for exact patterns
   d. Reference Extension Strategy for infrastructure decisions
   e. Reference Implementation Guide for code examples
   f. Output integrated section
3. Validate each section against checklist
4. Output complete integrated specification

**Start with Section 1 and proceed sequentially through Section 7.**

Good luck! 🚀

