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



---

## INPUT FILES PROVIDED

### Input 1: Structured Specification

```markdown
# BrightRun LoRA Training Platform - Progressive Structured Specification

**Version:** 1.0  
**Source Document:** `iteration-8-multi-chat-figma-conversion.md`  
**Date:** December 22, 2024  
**Framework:** Next.js 14 (App Router) with TypeScript  
**Status:** Production Implementation Ready

---

## EXECUTIVE SUMMARY

This progressive structured specification transforms the BrightRun LoRA Training Platform from wireframe to production-ready implementation. The platform enables AI engineers to transform conversation datasets into trained LoRA models through a complete pipeline: dataset upload → validation → training configuration → real-time monitoring → artifact delivery.

### Platform Overview
- **Purpose**: Fine-tune LLMs using LoRA (Low-Rank Adaptation) with user-provided conversation datasets
- **Architecture**: Next.js 14 full-stack application with PostgreSQL, Redis, S3 storage, and external GPU cluster integration
- **User Journey**: 5-stage pipeline (P01-P05 pages) from dataset upload to model download
- **Timeline**: 8-week development cycle for 2-3 developers

### Technology Stack
- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes, PostgreSQL, Prisma ORM, NextAuth.js v5
- **Real-time**: Server-Sent Events (SSE) for training progress streaming
- **Storage**: S3-compatible object storage (AWS S3, Cloudflare R2, or Supabase Storage)
- **Queue**: BullMQ + Redis for job orchestration
- **External**: GPU cluster API integration for LoRA training execution

---

## TABLE OF CONTENTS

1. [Section Structure Plan](#section-structure-plan)
2. [Section 1: Foundation & Authentication](#section-1-foundation--authentication)
3. [Section 2: Dataset Management](#section-2-dataset-management)
4. [Section 3: Training Configuration](#section-3-training-configuration)
5. [Section 4: Training Execution & Monitoring](#section-4-training-execution--monitoring)
6. [Section 5: Model Artifacts & Delivery](#section-5-model-artifacts--delivery)
7. [Section 6: Cost Tracking & Notifications](#section-6-cost-tracking--notifications)
8. [Section 7: Complete System Integration](#section-7-complete-system-integration)
9. [Appendices](#appendices)

---

## SECTION STRUCTURE PLAN

### Total Sections: 7
### Structuring Approach: User Flow Stages + Cross-Cutting Concerns

This specification follows the natural user journey through the platform, with each section delivering incremental value. The structure ensures each section explicitly builds upon previous sections with zero redundancy.

---

### Section 1: Foundation & Authentication
- **Primary Purpose**: Establish core infrastructure, database schema, authentication, and base application structure
- **Key Features**:
  - Next.js 14 App Router project structure
  - PostgreSQL database with Prisma ORM
  - NextAuth.js authentication system
  - Base layouts and routing structure
  - User management and session handling
  - API authentication middleware
- **Estimated Development Time**: 16-20 hours
- **User Value Delivered**: Users can create accounts, log in, and access the authenticated dashboard

---

### Section 2: Dataset Management
- **Primary Purpose**: Enable users to upload, validate, and manage conversation datasets
- **Key Features**:
  - Dataset upload with S3 presigned URLs
  - Format validation (BrightRun LoRA v3/v4)
  - Dataset statistics and preview
  - Dataset CRUD operations
  - P02 - Datasets Manager page
- **Dependencies on Section 1**:
  - User model from database schema
  - Authentication middleware for API routes
  - Dashboard layout for page wrapper
  - S3 storage configuration
- **Estimated Development Time**: 24-28 hours
- **User Value Delivered**: Users can upload datasets, see validation results, and manage their dataset library

---

### Section 3: Training Configuration
- **Primary Purpose**: Allow users to configure training jobs with hyperparameter presets and GPU selection
- **Key Features**:
  - Hyperparameter preset system (Conservative/Balanced/Aggressive)
  - Advanced settings panel with custom parameters
  - GPU configuration and selection
  - Cost estimation calculator
  - P03 - Training Configurator page
- **Dependencies on Section 1**: Database schema for TrainingJob, User authentication
- **Dependencies on Section 2**: Dataset model, dataset selection flow from P02
- **Estimated Development Time**: 20-24 hours
- **User Value Delivered**: Users can configure sophisticated training jobs with accurate cost estimates

---

### Section 4: Training Execution & Monitoring
- **Primary Purpose**: Execute training jobs and provide real-time progress monitoring
- **Key Features**:
  - BullMQ job queue integration
  - External GPU cluster API integration
  - Server-Sent Events (SSE) for real-time updates
  - P04 - Training Monitor page with live metrics
  - Job lifecycle management (queue, run, complete, fail, cancel)
  - Metrics history and loss curve visualization
- **Dependencies on Section 1**: Job queue setup, database schema for MetricsPoint/Checkpoint/JobLog
- **Dependencies on Section 2**: Dataset S3 keys for training input
- **Dependencies on Section 3**: Training configuration data, hyperparameters, GPU config
- **Estimated Development Time**: 32-40 hours
- **User Value Delivered**: Users can launch training jobs and monitor progress in real-time with detailed metrics

---

### Section 5: Model Artifacts & Delivery
- **Primary Purpose**: Store, display, and deliver trained model artifacts
- **Key Features**:
  - Model artifact storage in S3
  - Quality metrics calculation and display
  - Presigned download URLs
  - P05 - Model Artifacts page
  - Model version history
  - Optional deployment integration
- **Dependencies on Section 1**: ModelArtifact database schema
- **Dependencies on Section 2**: Dataset lineage tracking
- **Dependencies on Section 3**: Training configuration reference
- **Dependencies on Section 4**: Job completion triggers, artifact upload from GPU cluster
- **Estimated Development Time**: 20-24 hours
- **User Value Delivered**: Users can view quality metrics and download their trained models

---

### Section 6: Cost Tracking & Notifications
- **Primary Purpose**: Track costs in real-time and notify users of important events
- **Key Features**:
  - Real-time cost calculation and tracking
  - Cost breakdown by type (compute, storage, data transfer)
  - Budget alerts and thresholds
  - Notification system (job completion, failures, cost alerts)
  - Cost analytics and reporting
- **Dependencies on Section 1**: CostRecord and Notification database schemas
- **Dependencies on Section 2**: Dataset storage costs
- **Dependencies on Section 3**: Cost estimation algorithms
- **Dependencies on Section 4**: Real-time cost updates during training
- **Dependencies on Section 5**: Storage costs for model artifacts
- **Estimated Development Time**: 16-20 hours
- **User Value Delivered**: Users have full visibility into costs and receive timely notifications

---

### Section 7: Complete System Integration
- **Primary Purpose**: Validate all sections work together, document end-to-end flows, and provide testing strategy
- **Key Features**:
  - Integration matrix across all sections
  - Complete user flow documentation
  - System-wide testing strategy
  - Performance optimization
  - Deployment checklist
- **Dependencies**: All previous sections (1-6)
- **Estimated Development Time**: 24-32 hours
- **User Value Delivered**: Confidence in a production-ready, fully integrated system

---

**Total Estimated Development Time**: 152-188 hours (19-24 days for 2 developers, 6-8 weeks calendar time)

---

## SECTION 1: Foundation & Authentication

### Overview

- **Section Purpose**: Establish the foundational infrastructure for the entire BrightRun platform, including project structure, database schema, authentication system, and base application layouts
- **Builds Upon**: N/A (Foundation section)
- **New Capabilities Introduced**:
  - Next.js 14 App Router project with TypeScript and Tailwind CSS
  - PostgreSQL database with comprehensive schema via Prisma ORM
  - NextAuth.js v5 authentication with JWT sessions
  - Protected route middleware
  - Base application layouts (root layout, dashboard layout)
  - API authentication middleware
  - User account management
  - P01 - Dashboard (home page)
- **User Value**: Users can create accounts, authenticate, and access a secured dashboard interface

---

### Integration with Previous Sections

**N/A** - This is the foundation section.

---

### Features & Requirements

#### FR-1.1.1: Next.js 14 Project Setup

**Type**: Infrastructure Setup

**Description**: Initialize a Next.js 14 project with App Router, TypeScript, Tailwind CSS v4, and all required dependencies for the BrightRun platform.

**Prerequisites from Previous Sections**: N/A

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Next.js 14 project created with App Router architecture
2. TypeScript configured with strict mode
3. Tailwind CSS v4.0 configured with custom theme
4. All shadcn/ui components available in `/components/ui/`
5. ESLint and Prettier configured
6. Project builds without errors
7. Development server runs on `localhost:3000`

**Technical Specifications**:

*Project Structure*:
```
/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Dashboard (P01)
│   ├── globals.css                # Global styles + Tailwind
│   ├── (auth)/                    # Auth route group (public)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/               # Dashboard route group (protected)
│   │   ├── layout.tsx             # Dashboard layout wrapper
│   │   └── [feature pages...]
│   └── api/                       # API routes
│       └── auth/[...nextauth]/route.ts
├── components/
│   ├── layout/                    # Layout components
│   ├── ui/                        # shadcn/ui components
│   └── [feature components...]
├── lib/
│   ├── db.ts                      # Prisma client
│   ├── auth.ts                    # NextAuth config
│   ├── utils.ts                   # Utility functions
│   └── storage.ts                 # S3 client (Section 2)
├── hooks/                         # Custom React hooks
├── types/                         # TypeScript definitions
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/                        # Static assets
├── .env.local                     # Environment variables
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

*Dependencies*:
```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "@prisma/client": "^5.18.0",
    "next-auth": "^5.0.0-beta.20",
    "bcryptjs": "^2.4.3",
    "@aws-sdk/client-s3": "^3.621.0",
    "@aws-sdk/s3-request-presigner": "^3.621.0",
    "bullmq": "^5.12.0",
    "ioredis": "^5.4.0",
    "swr": "^2.2.5",
    "zod": "^3.23.8",
    "lucide-react": "^0.428.0",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "canvas-confetti": "^1.9.3",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-tabs": "^1.1.0"
  },
  "devDependencies": {
    "prisma": "^5.18.0",
    "tailwindcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0"
  }
}
```

---

#### FR-1.2.1: PostgreSQL Database Schema

**Type**: Data Model

**Description**: Complete PostgreSQL database schema supporting all platform features including users, datasets, training jobs, metrics, models, costs, and notifications.

**Prerequisites from Previous Sections**: N/A

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Prisma schema defines all 12 database models
2. All relationships (foreign keys) properly configured
3. Indexes created for performance-critical queries
4. Enums defined for status fields
5. Cascading delete rules configured appropriately
6. Timestamps (createdAt, updatedAt) on all models
7. Migration can run successfully on fresh database

**Technical Specifications**:

*Database Table: `User`*

**Purpose**: Store user accounts, authentication data, and subscription information

**Schema**:
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  organization  String?
  role          UserRole  @default(USER)
  
  // Subscription & billing
  subscriptionTier  SubscriptionTier @default(FREE)
  monthlyBudget     Decimal?         @db.Decimal(10, 2)
  
  // Relationships
  datasets      Dataset[]
  jobs          TrainingJob[]
  models        ModelArtifact[]
  notifications Notification[]
  costRecords   CostRecord[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}

enum UserRole {
  USER
  ADMIN
  BILLING_ADMIN
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}
```

**Relationships**:
- **Has Many**: `Dataset` (user's uploaded datasets)
- **Has Many**: `TrainingJob` (user's training jobs)
- **Has Many**: `ModelArtifact` (user's trained models)
- **Has Many**: `Notification` (user's notifications)
- **Has Many**: `CostRecord` (user's cost records)

**Validation Rules**:
1. `email`: Must be valid email format, unique across all users
2. `passwordHash`: Must be bcrypt hashed with salt rounds ≥ 10
3. `name`: Required, min 2 characters, max 100 characters
4. `monthlyBudget`: Optional, if set must be > 0

**Indexes**:
```sql
CREATE INDEX idx_users_email ON "User"(email);
```

---

*Database Table: `Dataset`*

**Purpose**: Store dataset metadata, validation status, and S3 storage information

**Schema**:
```prisma
model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Metadata
  name        String
  description String        @db.Text
  format      DatasetFormat
  status      DatasetStatus @default(UPLOADING)
  
  // Storage
  s3Bucket    String
  s3Key       String        @unique
  fileSize    BigInt
  fileName    String
  
  // Dataset statistics
  totalTrainingPairs     Int?
  totalValidationPairs   Int?
  totalTokens            BigInt?
  avgTurnsPerConversation Float?
  avgTokensPerTurn       Float?
  
  // Validation
  trainingReady Boolean     @default(false)
  validatedAt   DateTime?
  validationErrors Json?     // Array of validation errors
  
  // Sample data (for preview)
  sampleData    Json?       // First 3 conversations
  
  // Processing timestamps
  uploadedAt    DateTime    @default(now())
  processedAt   DateTime?
  
  // Error tracking
  errorMessage  String?     @db.Text
  
  // Soft delete
  deletedAt     DateTime?
  
  // Relationships
  jobs          TrainingJob[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@index([userId, status])
  @@index([userId, createdAt])
}

enum DatasetFormat {
  BRIGHTRUN_LORA_V4
  BRIGHTRUN_LORA_V3
}

enum DatasetStatus {
  UPLOADING
  VALIDATING
  READY
  ERROR
}
```

**Relationships**:
- **Belongs To**: `User` (dataset owner)
- **Has Many**: `TrainingJob` (training jobs using this dataset)

**Validation Rules**:
1. `name`: Required, max 200 characters
2. `s3Key`: Must be unique, format: `datasets/{userId}/{datasetId}/dataset.jsonl`
3. `fileSize`: Must be > 0, max 10GB (10737418240 bytes)
4. `format`: Must be valid enum value

---

*Database Table: `TrainingJob`*

**Purpose**: Track training jobs, configuration, progress, and status

**Schema**:
```prisma
model TrainingJob {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  datasetId   String
  dataset     Dataset         @relation(fields: [datasetId], references: [id], onDelete: Restrict)
  
  // Configuration
  presetId    String          // 'conservative' | 'balanced' | 'aggressive' | 'custom'
  hyperparameters Json        // HyperparameterConfig object
  gpuConfig   Json            // GPUConfig object
  
  // Status & Progress
  status      JobStatus       @default(QUEUED)
  currentStage JobStage       @default(QUEUED)
  progress    Decimal         @default(0) @db.Decimal(5, 2) // 0-100
  
  // Training progress
  currentEpoch Int?
  totalEpochs  Int
  currentStep  Int?
  totalSteps   Int?
  
  // Current metrics (denormalized for quick access)
  currentMetrics Json?        // CurrentMetrics object
  
  // Time tracking
  queuedAt    DateTime        @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  estimatedCompletionAt DateTime?
  
  // Cost tracking
  currentCost          Decimal @default(0) @db.Decimal(10, 2)
  estimatedTotalCost   Decimal @db.Decimal(10, 2)
  finalCost            Decimal? @db.Decimal(10, 2)
  
  // Error handling
  errorMessage String?        @db.Text
  errorStack   String?        @db.Text
  retryCount   Int            @default(0)
  
  // External training service
  externalJobId String?       @unique // ID from GPU cluster API
  
  // Artifact reference
  artifactId  String?         @unique
  artifact    ModelArtifact?  @relation(fields: [artifactId], references: [id])
  
  // Relationships
  metricsHistory MetricsPoint[]
  checkpoints    Checkpoint[]
  logs           JobLog[]
  costRecords    CostRecord[]
  
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  @@index([userId, status])
  @@index([status, queuedAt])
  @@index([externalJobId])
}

enum JobStatus {
  QUEUED
  INITIALIZING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum JobStage {
  QUEUED
  INITIALIZING
  TRAINING
  VALIDATING
  SAVING
  COMPLETED
}
```

---

*Database Table: `MetricsPoint`*

**Purpose**: Store time-series training metrics for loss curves and performance tracking

**Schema**:
```prisma
model MetricsPoint {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  timestamp DateTime    @default(now())
  
  // Progress
  epoch     Int
  step      Int
  
  // Loss metrics
  trainingLoss   Decimal  @db.Decimal(10, 6)
  validationLoss Decimal? @db.Decimal(10, 6)
  
  // Training metrics
  learningRate   Decimal  @db.Decimal(12, 10)
  gradientNorm   Decimal? @db.Decimal(10, 6)
  
  // Performance metrics
  throughput     Decimal? @db.Decimal(10, 2) // tokens/sec
  gpuUtilization Decimal? @db.Decimal(5, 2)  // percentage
  
  @@index([jobId, timestamp])
  @@index([jobId, step])
}
```

---

*Database Table: `Checkpoint`*

**Purpose**: Store training checkpoint metadata and S3 locations

**Schema**:
```prisma
model Checkpoint {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  step      Int
  epoch     Int
  loss      Decimal     @db.Decimal(10, 6)
  
  // Storage
  s3Bucket  String
  s3Key     String
  fileSize  BigInt
  
  createdAt DateTime    @default(now())
  
  @@index([jobId, step])
}
```

---

*Database Table: `JobLog`*

**Purpose**: Store training job logs for debugging and monitoring

**Schema**:
```prisma
model JobLog {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  timestamp DateTime    @default(now())
  level     LogLevel
  message   String      @db.Text
  metadata  Json?
  
  @@index([jobId, timestamp])
}

enum LogLevel {
  INFO
  WARNING
  ERROR
}
```

---

*Database Table: `ModelArtifact`*

**Purpose**: Store trained model metadata, quality metrics, and artifact locations

**Schema**:
```prisma
model ModelArtifact {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobId       String      @unique
  job         TrainingJob?
  
  datasetId   String
  
  // Metadata
  name        String
  version     String
  description String?     @db.Text
  
  // Status
  status      ModelStatus @default(STORED)
  deployedAt  DateTime?
  
  // Quality metrics
  qualityMetrics Json      // QualityMetrics object
  
  // Training summary
  trainingSummary Json     // TrainingSummary object
  
  // Configuration reference
  configuration Json       // Configuration object
  
  // Artifacts storage
  artifacts   Json         // Artifacts object with S3 keys
  
  // Version lineage
  parentModelId String?
  parentModel   ModelArtifact? @relation("ModelVersions", fields: [parentModelId], references: [id])
  childModels   ModelArtifact[] @relation("ModelVersions")
  
  // Soft delete
  deletedAt   DateTime?
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([userId, status])
  @@index([userId, createdAt])
}

enum ModelStatus {
  STORED
  DEPLOYED
  ARCHIVED
}
```

---

*Database Table: `CostRecord`*

**Purpose**: Track costs for billing and analytics

**Schema**:
```prisma
model CostRecord {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobId     String?
  job       TrainingJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  
  // Cost breakdown
  costType  CostType
  amount    Decimal     @db.Decimal(10, 2)
  
  // Details
  details   Json?       // Additional cost details (GPU hours, storage GB, etc.)
  
  // Time period
  billingPeriod DateTime  // Start of billing period (day/week/month)
  recordedAt    DateTime  @default(now())
  
  @@index([userId, billingPeriod])
  @@index([jobId])
}

enum CostType {
  COMPUTE
  STORAGE
  DATA_TRANSFER
  API_CALLS
}
```

---

*Database Table: `Notification`*

**Purpose**: Store user notifications for job completions, failures, and alerts

**Schema**:
```prisma
model Notification {
  id        String             @id @default(cuid())
  userId    String
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      NotificationType
  title     String
  message   String             @db.Text
  priority  NotificationPriority @default(MEDIUM)
  
  read      Boolean            @default(false)
  actionUrl String?
  
  metadata  Json?              // Additional notification data
  
  createdAt DateTime           @default(now())
  
  @@index([userId, read, createdAt])
}

enum NotificationType {
  JOB_COMPLETE
  JOB_FAILED
  COST_ALERT
  SYSTEM
  DATASET_READY
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

---

**Migration Dependencies**: N/A (initial migration)

**Complete Prisma Schema File**: See Appendix A for the complete `schema.prisma` file.

---

#### FR-1.3.1: NextAuth.js Authentication System

**Type**: Authentication & Authorization

**Description**: Implement NextAuth.js v5 with credentials provider, JWT sessions, and secure password hashing.

**Prerequisites from Previous Sections**: N/A

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. NextAuth.js v5 configured with credentials provider
2. User registration creates hashed passwords (bcrypt, salt rounds ≥ 10)
3. Login validates credentials and returns JWT session
4. JWT includes user ID and role
5. Session accessible in both client and server components
6. Logout clears session properly
7. Protected routes redirect unauthenticated users to login

**Technical Specifications**:

*NextAuth Configuration*:

**File**: `/lib/auth.ts`

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    signUp: "/signup",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
```

**Integration Points**:
- **Prisma Client**: Uses `prisma` from `/lib/db.ts`
- **User Model**: Queries `User` table defined in database schema
- **Session Data**: Returns user ID and role in JWT for use throughout application

---

*Route Protection Middleware*:

**File**: `/middleware.ts`

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/signup");

  // Redirect unauthenticated users to login (except on auth pages)
  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Behavior**:
- Unauthenticated users accessing protected routes → Redirect to `/login`
- Authenticated users accessing `/login` or `/signup` → Redirect to `/` (dashboard)
- API routes handled separately in API route protection

---

*API Route Protection*:

**File**: `/lib/api-auth.ts`

```typescript
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: "UNAUTHORIZED", 
          message: "Authentication required" 
        } 
      },
      { status: 401 }
    );
  }
  
  return session.user;
}

export async function requireRole(request: NextRequest, role: string) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;
  
  if (user.role !== role && user.role !== "ADMIN") {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: "FORBIDDEN", 
          message: "Insufficient permissions" 
        } 
      },
      { status: 403 }
    );
  }
  
  return user;
}
```

**Usage in API Routes**:
```typescript
// app/api/datasets/route.ts
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user; // Auth error response
  
  // Proceed with authenticated request
  const datasets = await prisma.dataset.findMany({
    where: { userId: user.id },
  });
  
  return NextResponse.json({ success: true, data: { datasets } });
}
```

---

#### FR-1.4.1: User Registration API

**Type**: API Endpoint

**Description**: Create new user accounts with validation and secure password hashing.

**Prerequisites from Previous Sections**: 
- Section 1, FR-1.2.1: User database model

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Accepts email, password, name, and optional organization
2. Validates email format and uniqueness
3. Validates password strength (min 8 characters)
4. Hashes password with bcrypt (salt rounds = 10)
5. Creates user record in database
6. Returns success response with user data (no password)
7. Returns appropriate error for duplicate email or validation failures

**Technical Specifications**:

**Endpoint**: `POST /api/auth/signup`

**Authentication**: Not Required (public endpoint)

**Request Schema**:
```typescript
interface SignupRequest {
  email: string;
  password: string;
  name: string;
  organization?: string;
}
```

**Validation Rules**:
```typescript
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  organization: z.string().max(200).optional(),
});
```

**Response Schema**:

*Success Response (201)*:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: string; // ISO timestamp
    }
  }
}
```

*Error Response (400)*:
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR" | "EMAIL_EXISTS";
    message: string;
    fields?: {
      [fieldName: string]: string[];
    };
  }
}
```

**Implementation**:

**File**: `/app/api/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  organization: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            fields: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }
    
    const { email, password, name, organization } = validation.data;
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
          },
        },
        { status: 400 }
      );
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        organization,
        role: "USER",
        subscriptionTier: "FREE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred during registration",
        },
      },
      { status: 500 }
    );
  }
}
```

**Business Logic Flow**:
1. Parse and validate request body with Zod schema
2. Check if email already exists in database
3. Hash password using bcrypt with 10 salt rounds
4. Create user record with default role (USER) and tier (FREE)
5. Return user data (excluding password hash)

**Dependencies**:
- **Database**: Prisma client from `/lib/db.ts`
- **User Model**: From database schema (FR-1.2.1)

**Side Effects**:
- Creates new user record in `User` table
- Password is hashed and never stored in plain text

---

#### FR-1.4.2: User Login API

**Type**: API Endpoint

**Description**: Authenticate users via NextAuth.js credentials provider.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.2.1: User database model
- Section 1, FR-1.3.1: NextAuth.js configuration

**Extends/Enhances**: NextAuth.js built-in authentication

**Acceptance Criteria**:
1. Uses NextAuth.js credentials provider configured in FR-1.3.1
2. Validates email and password against database
3. Returns JWT session token on successful authentication
4. Returns appropriate error for invalid credentials
5. Session persists across page refreshes
6. Session accessible in both client and server components

**Technical Specifications**:

**Endpoint**: `POST /api/auth/signin` (NextAuth.js built-in)

**Authentication**: Not Required (public endpoint)

**Request Schema**:
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response Schema**:

*Success*: NextAuth.js handles session creation and redirects

*Error*: Returns CredentialsSignin error

**Implementation**:

NextAuth.js handles this automatically via the configuration in FR-1.3.1. Client-side integration:

**File**: `/app/(auth)/login/page.tsx`

```typescript
'use client';

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to BrightRun
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Integration with NextAuth**:
- Uses `signIn()` from `next-auth/react`
- Credentials validated by `authorize()` function in FR-1.3.1
- Session created automatically by NextAuth.js
- Router refresh updates session state

---

#### FR-1.5.1: Root Layout Component

**Type**: UI Component

**Description**: Root layout for the entire application providing global providers and styles.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.3.1: NextAuth.js authentication

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Wraps entire application with SessionProvider
2. Loads global CSS and fonts
3. Includes toast notification provider (Sonner)
4. Sets HTML lang attribute
5. Applies base Tailwind styles
6. Renders children without layout interference

**Technical Specifications**:

**Component Name**: `RootLayout`

**Location**: `/app/layout.tsx`

**Props Interface**:
```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}
```

**Implementation**:

```typescript
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BrightRun LoRA Training Platform",
  description: "Train custom LoRA models for LLM fine-tuning",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Visual Hierarchy**:
```
<html>
  <body>
    <SessionProvider>
      {children}  ← All pages render here
      <Toaster /> ← Toast notifications
    </SessionProvider>
  </body>
</html>
```

**State Management**:
- **Global Provider**: SessionProvider for NextAuth.js session access
- **Toast State**: Managed by Sonner (imported from "sonner")

**Integrates With**:
- NextAuth.js session management (FR-1.3.1)
- All child pages and layouts

**Accessibility**:
- `lang="en"` attribute for screen readers
- Toast notifications have ARIA live regions (built into Sonner)

---

#### FR-1.5.2: Dashboard Layout Component

**Type**: UI Component

**Description**: Layout wrapper for all authenticated dashboard pages providing sidebar navigation and header.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.3.1: Session authentication
- Section 1, FR-1.5.1: Root layout

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Displays sidebar navigation with links to all main pages
2. Shows user profile in header with dropdown menu
3. Highlights active route in sidebar
4. Provides logout functionality
5. Responsive layout (collapses sidebar on mobile)
6. Main content area scrolls independently
7. Consistent across all dashboard pages

**Technical Specifications**:

**Component Name**: `DashboardLayout`

**Location**: `/app/(dashboard)/layout.tsx`

**Props Interface**:
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}
```

**Layout Structure**:
```
┌─────────────────────────────────────────────────────┐
│ Header (User Profile, Notifications)               │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  Main Content Area                       │
│          │  (children)                              │
│          │                                          │
│ - Home   │  ┌────────────────────────────────────┐ │
│ - Datasets│  │                                    │ │
│ - Training│  │  Page Content Renders Here         │ │
│ - Models │  │                                    │ │
│ - Settings│  └────────────────────────────────────┘ │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Implementation**:

```typescript
'use client';

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <AppSidebar currentPath={pathname} />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <AppHeader user={session?.user} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Component Hierarchy**:
- Root: `DashboardLayout`
  - Child: `AppSidebar` (from Section 1, FR-1.5.3)
  - Child: `AppHeader` (from Section 1, FR-1.5.4)
  - Child: `main` (renders page-specific content)

**State Management**:
- **Session**: Retrieved via `useSession()` hook from NextAuth.js
- **Active Route**: Tracked via `usePathname()` hook from Next.js

**Data Flow**:
```
NextAuth Session → useSession() → AppHeader (user data)
Next.js Router → usePathname() → AppSidebar (active route)
Page Components → children prop → Main content area
```

**Responsive Behavior**:
- Desktop (>1024px): Sidebar visible, width 240px
- Tablet (768-1024px): Sidebar collapsible with toggle
- Mobile (<768px): Sidebar drawer overlay

---

#### FR-1.5.3: Sidebar Navigation Component

**Type**: UI Component

**Description**: Sidebar navigation with links to all main platform sections.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.5.2: Dashboard layout

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Displays navigation links: Dashboard, Datasets, Training, Models, Settings
2. Highlights active route
3. Shows icons for each section (Lucide React)
4. Collapsible on mobile devices
5. Smooth transitions on hover/active states

**Technical Specifications**:

**Component Name**: `AppSidebar`

**Location**: `/components/layout/AppSidebar.tsx`

**Props Interface**:
```typescript
interface AppSidebarProps {
  currentPath: string;
}
```

**Implementation**:

```typescript
'use client';

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  PlayCircle,
  Package,
  Settings,
} from "lucide-react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Datasets",
    href: "/datasets",
    icon: Database,
  },
  {
    name: "Training",
    href: "/training/jobs",
    icon: PlayCircle,
  },
  {
    name: "Models",
    href: "/models",
    icon: Package,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ currentPath }: AppSidebarProps) {
  return (
    <aside className="w-60 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">BrightRun</h1>
      </div>
      <nav className="space-y-1 p-4">
        {navigationItems.map((item) => {
          const isActive = currentPath === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

**Visual Specifications**:
- **Width**: 240px (desktop), full width overlay (mobile)
- **Background**: White (#FFFFFF)
- **Border**: 1px solid gray-200 on right edge
- **Active State**: Blue-50 background, Blue-700 text
- **Hover State**: Gray-50 background, Gray-900 text
- **Transition**: 150ms ease-in-out for all color changes

**Interactive Elements**:
- Each navigation link is clickable and navigates using Next.js Link component
- Active route highlighted based on `currentPath` prop
- Icons from Lucide React library

**Accessibility**:
- `<nav>` landmark for screen readers
- Links have descriptive text
- Sufficient color contrast (WCAG AA compliant)
- Keyboard navigable (native `<Link>` behavior)

---

#### FR-1.5.4: Header Component

**Type**: UI Component

**Description**: Top header bar with user profile and logout functionality.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.3.1: NextAuth.js signOut function
- Section 1, FR-1.5.2: Dashboard layout

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Displays user name and email
2. Shows user avatar or initials
3. Dropdown menu with logout option
4. Logout calls NextAuth.js signOut()
5. Responsive (stacks on mobile)

**Technical Specifications**:

**Component Name**: `AppHeader`

**Location**: `/components/layout/AppHeader.tsx`

**Props Interface**:
```typescript
interface AppHeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}
```

**Implementation**:

```typescript
'use client';

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppHeader({ user }: AppHeaderProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex-1" />
      
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

**User Interactions**:
1. **Trigger Button**: Click to open dropdown menu
   - **Action**: Opens DropdownMenu
   - **Visual Feedback**: Hover state changes background
2. **Logout Menu Item**: Click to log out
   - **Action**: Calls `signOut()` from NextAuth.js
   - **Navigation**: Redirects to `/login`
   - **Side Effect**: Clears session cookie

**Visual Specifications**:
- **Height**: 64px (h-16)
- **Background**: White
- **Border Bottom**: 1px solid gray-200
- **Avatar**: 32px circle with initials
- **Font**: Text-sm (14px) for name

**State Management**:
- **User Data**: Passed via props from parent DashboardLayout
- **Dropdown State**: Managed by shadcn/ui DropdownMenu component

**Integrates With**:
- NextAuth.js `signOut()` function (FR-1.3.1)
- shadcn/ui components (DropdownMenu, Button, Avatar)

---

#### FR-1.6.1: Dashboard Home Page (P01)

**Type**: UI Component / Page

**Description**: Main dashboard page showing overview of user's datasets, training jobs, and models.

**Prerequisites from Previous Sections**:
- Section 1, FR-1.5.2: Dashboard layout wrapper
- Section 1, FR-1.2.1: Database schema for stats queries

**Extends/Enhances**: N/A

**Acceptance Criteria**:
1. Displays summary cards: Total Datasets, Active Jobs, Completed Models, Total Cost
2. Shows recent datasets list
3. Shows active training jobs list
4. Navigation links to detailed views
5. Real-time updates (refresh data on focus)
6. Loading states while fetching data

**Technical Specifications**:

**Page Route**: `/`

**File**: `/app/page.tsx`

**Component Hierarchy**:
```
DashboardPage (from layout.tsx wrapper)
├── StatsCards
│   ├── StatCard (Total Datasets)
│   ├── StatCard (Active Jobs)
│   ├── StatCard (Completed Models)
│   └── StatCard (Total Cost)
├── RecentDatasetsSection
│   └── DatasetCard[] (from Section 2)
└── ActiveJobsSection
    └── JobCard[] (from Section 4)
```

**Implementation**:

```typescript
'use client';

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Database, PlayCircle, Package, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: session } = useSession();
  
  // Fetch dashboard stats
  const { data: stats, isLoading } = useSWR('/api/dashboard/stats', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          Welcome back, {session?.user?.name}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Datasets"
          value={stats?.totalDatasets || 0}
          icon={Database}
          href="/datasets"
        />
        <StatsCard
          title="Active Jobs"
          value={stats?.activeJobs || 0}
          icon={PlayCircle}
          href="/training/jobs"
        />
        <StatsCard
          title="Completed Models"
          value={stats?.completedModels || 0}
          icon={Package}
          href="/models"
        />
        <StatsCard
          title="Total Spend"
          value={`$${stats?.totalCost?.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          href="/costs"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/datasets">
            <Button>Upload Dataset</Button>
          </Link>
          <Link href="/training/configure">
            <Button variant="outline">Configure Training</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity - Will be populated in later sections */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Your recent datasets and training jobs will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, href }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**API Dependency**:

**Endpoint**: `GET /api/dashboard/stats`

**File**: `/app/api/dashboard/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  // Fetch aggregated stats
  const [totalDatasets, activeJobs, completedModels, costSum] = await Promise.all([
    prisma.dataset.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.trainingJob.count({
      where: { userId: user.id, status: { in: ['QUEUED', 'INITIALIZING', 'RUNNING'] } },
    }),
    prisma.modelArtifact.count({
      where: { userId: user.id, status: { in: ['STORED', 'DEPLOYED'] } },
    }),
    prisma.costRecord.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalDatasets,
      activeJobs,
      completedModels,
      totalCost: costSum._sum.amount || 0,
    },
  });
}
```

**Data Flow**:
```
User loads dashboard → 
SWR hook calls /api/dashboard/stats → 
API queries database (4 parallel queries) → 
Aggregated stats returned → 
StatsCards render with data → 
Auto-refresh every 30 seconds
```

**State Management**:
- **Stats Data**: Fetched via SWR hook with 30-second refresh interval
- **Session Data**: Retrieved via `useSession()` hook

**Loading & Error States**:
- **Loading**: Skeleton cards with pulse animation
- **Error**: (Will add error boundary in Section 7)
- **Empty State**: Shows zeros for all stats

**Integrates With**:
- Section 1, FR-1.3.1: User session for personalized greeting
- Section 1, FR-1.2.1: Database queries for stats
- Section 2: Dataset count (will link to datasets page)
- Section 4: Active jobs count (will link to training monitor)
- Section 5: Model count (will link to models page)
- Section 6: Cost sum (will link to cost dashboard)

---

### State Management

**Global State Structure**:

This section establishes the foundation for application state. Subsequent sections will extend this.

```typescript
// Session State (managed by NextAuth.js)
interface SessionState {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN' | 'BILLING_ADMIN';
  };
  expires: string;
}
```

**State Updates in This Section**:

1. **Authentication State**: Managed by NextAuth.js
   - **Actions**: signIn(), signOut()
   - **Persisted**: Yes (JWT cookie)
   - **Triggers**: Login redirects to dashboard, logout redirects to login page

---

### Testing Strategy

**Unit Tests**:

```typescript
// lib/__tests__/api-auth.test.ts
import { requireAuth } from '../api-auth';
import { NextRequest } from 'next/server';

describe('requireAuth', () => {
  it('should return user object when authenticated', async () => {
    // Mock authenticated request
    const request = new NextRequest('http://localhost/api/test');
    // ... test implementation
  });

  it('should return 401 response when not authenticated', async () => {
    // Mock unauthenticated request
    const request = new NextRequest('http://localhost/api/test');
    const response = await requireAuth(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
```

**Integration Tests**:

```typescript
// app/api/auth/signup/__tests__/route.test.ts
import { POST } from '../route';
import { prisma } from '@/lib/db';

describe('POST /api/auth/signup', () => {
  it('should create user and return success', async () => {
    const request = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('test@example.com');
  });

  it('should return error for duplicate email', async () => {
    // Create user first
    await prisma.user.create({
      data: {
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        name: 'User',
      },
    });

    const request = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.code).toBe('EMAIL_EXISTS');
  });
});
```

**E2E Tests**:

```typescript
// e2e/authentication.spec.ts
import { test, expect } from '@playwright/test';

test('complete authentication flow', async ({ page }) => {
  // Sign up
  await page.goto('/signup');
  await page.fill('[name="name"]', 'E2E Test User');
  await page.fill('[name="email"]', 'e2e@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Should redirect to login
  await expect(page).toHaveURL('/login');

  // Log in
  await page.fill('[name="email"]', 'e2e@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toContainText('Welcome back');

  // Log out
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Log out');

  // Should redirect to login
  await expect(page).toHaveURL('/login');
});
```

---

### Development Task Breakdown

**T-1.1: Project Setup & Dependencies**

**Estimated Time**: 4 hours

**Prerequisites**: N/A

**Steps**:
1. Create Next.js 14 project with `create-next-app`
2. Install all dependencies from FR-1.1.1
3. Configure TypeScript with strict mode
4. Set up Tailwind CSS v4
5. Configure ESLint and Prettier
6. Create folder structure

**Deliverables**:
- [ ] Project builds successfully
- [ ] Dev server runs on `localhost:3000`
- [ ] All dependencies installed

**Validation Criteria**:
- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts development server
- [ ] TypeScript strict mode enabled

---

**T-1.2: Database Schema & Prisma Setup**

**Estimated Time**: 6 hours

**Prerequisites**:
- T-1.1 completed

**Steps**:
1. Install Prisma and PostgreSQL adapter
2. Create `schema.prisma` with all 12 models
3. Configure database connection string
4. Generate Prisma client
5. Create initial migration
6. Run migration on development database
7. Create `/lib/db.ts` Prisma client singleton

**Deliverables**:
- [ ] Prisma schema complete with all models
- [ ] Migration created and applied
- [ ] Database client accessible

**Validation Criteria**:
- [ ] Can query database via Prisma client
- [ ] All relationships work correctly
- [ ] Indexes created successfully

---

**T-1.3: Authentication System**

**Estimated Time**: 6 hours

**Prerequisites**:
- T-1.2 completed

**Steps**:
1. Install NextAuth.js v5 and bcryptjs
2. Create `/lib/auth.ts` with NextAuth configuration
3. Implement credentials provider
4. Create `/middleware.ts` for route protection
5. Create `/lib/api-auth.ts` helpers
6. Test authentication flow

**Deliverables**:
- [ ] NextAuth configured and working
- [ ] Route protection middleware active
- [ ] API auth helpers functional

**Validation Criteria**:
- [ ] Can sign in and receive session
- [ ] Protected routes redirect when not authenticated
- [ ] API routes validate authentication

---

**T-1.4: Authentication API Endpoints**

**Estimated Time**: 4 hours

**Prerequisites**:
- T-1.3 completed

**Steps**:
1. Create `/app/api/auth/signup/route.ts`
2. Implement validation with Zod
3. Implement password hashing
4. Test signup flow
5. Create login page UI
6. Create signup page UI

**Deliverables**:
- [ ] Signup API functional
- [ ] Login page complete
- [ ] Signup page complete

**Validation Criteria**:
- [ ] Can create new user account
- [ ] Duplicate email prevented
- [ ] Password hashed in database

---

**T-1.5: Layout Components**

**Estimated Time**: 8 hours

**Prerequisites**:
- T-1.3 completed

**Steps**:
1. Create root layout (`/app/layout.tsx`)
2. Create dashboard layout (`/app/(dashboard)/layout.tsx`)
3. Create `AppSidebar` component
4. Create `AppHeader` component
5. Add responsive behavior
6. Test navigation

**Deliverables**:
- [ ] Root layout with providers
- [ ] Dashboard layout with sidebar and header
- [ ] Navigation working

**Validation Criteria**:
- [ ] Sidebar highlights active route
- [ ] Header shows user information
- [ ] Logout functionality works

---

**T-1.6: Dashboard Home Page**

**Estimated Time**: 6 hours

**Prerequisites**:
- T-1.5 completed

**Steps**:
1. Create dashboard page (`/app/page.tsx`)
2. Create stats API endpoint (`/app/api/dashboard/stats/route.ts`)
3. Implement SWR data fetching
4. Create stats cards
5. Add loading states
6. Test with real database data

**Deliverables**:
- [ ] Dashboard page displays stats
- [ ] Stats API returns correct data
- [ ] Auto-refresh working

**Validation Criteria**:
- [ ] All 4 stats cards display
- [ ] Stats update on page focus
- [ ] Loading states render correctly

---

### Documentation Requirements

**Code Documentation**:
- All API routes have TSDoc comments explaining purpose, authentication requirements, and return types
- Database models documented in Prisma schema with comments
- Authentication flow documented in `/lib/auth.ts`

**Integration Documentation**:
- Database schema ERD diagram (to be created in Section 7)
- Authentication flow diagram showing login/signup/session management
- API authentication middleware usage guide

**User Documentation**:
- Getting started guide (account creation)
- Navigation guide (dashboard overview)

---

### Environment Variables Required

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/brightrun"

# Authentication
NEXTAUTH_SECRET="generated-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# S3 Storage (for Section 2)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_NAME="brightrun-lora-storage"

# Redis (for Section 4)
REDIS_URL="redis://localhost:6379"

# GPU Cluster API (for Section 4)
GPU_CLUSTER_API_URL="https://gpu-cluster.example.com/api"
GPU_CLUSTER_API_KEY="your-api-key"
```

---

## END OF SECTION 1

**Section 1 Summary**:
- ✅ Next.js 14 project structure established
- ✅ Complete PostgreSQL database schema with 12 models
- ✅ NextAuth.js authentication with JWT sessions
- ✅ Protected routes and API authentication middleware
- ✅ Dashboard layout with sidebar navigation and header
- ✅ P01 Dashboard page with stats overview
- ✅ User registration and login functionality

**What's Available for Subsequent Sections**:
- `User` model for user associations
- Authentication middleware (`requireAuth`, `requireRole`)
- Database client (`prisma` from `/lib/db.ts`)
- Dashboard layout wrapper for all pages
- Base routing structure (`/app/(dashboard)/`)
- Session management via NextAuth.js

---

## SECTION 2: Dataset Management

### Overview

- **Section Purpose**: Enable users to upload, validate, and manage conversation datasets for LoRA training
- **Builds Upon**:
  - Section 1: User authentication, database schema (Dataset model), dashboard layout
- **New Capabilities Introduced**:
  - S3-compatible object storage integration
  - Dataset file upload with presigned URLs
  - Format validation (BrightRun LoRA v3/v4)
  - Dataset statistics calculation and visualization  
  - Dataset CRUD operations (Create, Read, Update, Delete)
  - P02 - Datasets Manager page
  - Dataset preview with sample conversations
- **User Value**: Users can upload conversation datasets, validate formats, view statistics, and manage their dataset library

---

### Integration with Previous Sections

**From Section 1 (Foundation & Authentication)**:

- **Database Model**: `Dataset`
  - **Integration Point**: Uses the Dataset model defined in Section 1, FR-1.2.1
  - **Data Flow**: Creates and queries Dataset records linked to authenticated user
  - **Foreign Key**: `userId` references `User.id` from Section 1

- **Authentication**: NextAuth.js middleware and API auth helpers
  - **Integration Point**: All dataset API routes use `requireAuth()` from Section 1, FR-1.3.1
  - **Data Flow**: User session determines ownership of datasets
  - **Authorization**: Users can only access their own datasets

- **Dashboard Layout**: `DashboardLayout` wrapper
  - **Integration Point**: P02 Datasets page renders within dashboard layout from Section 1, FR-1.5.2
  - **UI Connection**: Sidebar navigation includes "Datasets" link
  - **Navigation**: Clicking "Datasets" in sidebar navigates to `/datasets`

- **User Model**: For associating datasets with users
  - **Integration Point**: Dataset records reference User via `userId` foreign key
  - **Relationship**: `User hasMany Dataset`, `Dataset belongsTo User`

---

**NOTE ON SPECIFICATION SCOPE**: This progressive structured specification provides comprehensive detail for production implementation. Each section includes all required elements from the template: Features & Requirements, API Specifications, UI Components, Database Integration, Testing Strategy, and Development Tasks. Sections 2-6 follow a streamlined format that maintains all critical technical details while optimizing for readability and implementability.

---

### Features & Requirements Summary

This section implements:
- **FR-2.1**: S3 Storage Integration (presigned URLs, upload/download)
- **FR-2.2**: Dataset Upload Flow (create, upload, confirm)
- **FR-2.3**: Dataset Validation System (format validation, statistics calculation)
- **FR-2.4**: Dataset Management APIs (CRUD operations)
- **FR-2.5**: P02 Datasets Page (UI for dataset management)

**Key Integrations with Section 1**:
- All APIs use `requireAuth()` from Section 1, FR-1.3.1
- Dataset model queries via `prisma` from Section 1, FR-1.2.1
- Page renders in `DashboardLayout` from Section 1, FR-1.5.2

---

### API Endpoints Summary

**POST `/api/datasets`** - Create dataset and get upload URL
- **Auth**: Required
- **Input**: name, description, format, fileSize, fileName
- **Output**: datasetId, uploadUrl (presigned S3 URL)
- **Flow**: Validate → Create DB record → Generate S3 upload URL → Return

**POST `/api/datasets/[id]/confirm`** - Confirm upload complete
- **Auth**: Required
- **Input**: datasetId (URL param)
- **Output**: Validation started message
- **Flow**: Update status to VALIDATING → Queue validation job

**GET `/api/datasets`** - List user's datasets
- **Auth**: Required
- **Query Params**: page, pageSize, sortBy, format, trainingReady, search
- **Output**: Paginated dataset list with stats
- **Flow**: Build filters → Query DB → Return with pagination

**GET `/api/datasets/[id]`** - Get single dataset details
- **Auth**: Required
- **Output**: Full dataset details including sample data

**PATCH `/api/datasets/[id]`** - Update dataset metadata
- **Auth**: Required
- **Input**: name, description
- **Output**: Updated dataset

**DELETE `/api/datasets/[id]`** - Soft delete dataset
- **Auth**: Required
- **Output**: Deletion confirmation
- **Side Effect**: Sets deletedAt timestamp

---

### Background Processes

**Dataset Validation Worker** (BullMQ + Redis)

- **Trigger**: `/api/datasets/[id]/confirm` queues validation job
- **Process**:
  1. Download dataset from S3
  2. Parse JSONL format
  3. Validate structure (conversation_id, turns array, roles)
  4. Calculate statistics (token counts, conversation counts)
  5. Extract first 3 conversations for preview
  6. Update DB record with results or errors
- **Status Transitions**: VALIDATING → READY (success) or ERROR (failure)
- **Implementation**: `/lib/validation-queue.ts` + `/lib/dataset-validator.ts`

---

### UI Components

**P02 - Datasets Page** (`/app/(dashboard)/datasets/page.tsx`)

**Component Hierarchy**:
```
DatasetsPage
├── PageHeader (title, upload button)
├── FilterBar (search, format filter, status filter)
├── DatasetGrid
│   └── DatasetCard[] (for each dataset)
│       ├── DatasetIcon (format badge)
│       ├── DatasetInfo (name, stats)
│       ├── StatusBadge (status indicator)
│       └── ActionButtons (view, train, delete)
└── Pagination
```

**Key Features**:
- Real-time status updates via SWR polling
- Upload modal with drag-and-drop
- Format validation preview before upload
- Statistics visualization (conversation count, token count)
- Quick action: "Start Training" button navigates to Section 3

**Data Flow**:
```
SWR hook → GET /api/datasets → Render cards →
User clicks "Upload" → Open modal → Select file →
POST /api/datasets → Upload to S3 → POST confirm →
Poll status until READY → Update UI
```

**Integrates With**:
- Section 1: Dashboard layout, authentication
- Section 3: "Start Training" button navigates to configurator with datasetId

---

### State Management

```typescript
// Dataset State (managed via SWR)
interface DatasetState {
  datasets: Dataset[];
  isLoading: boolean;
  error?: Error;
  mutate: () => void;
}

// Upload State (local component state)
interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  errorMessage?: string;
}
```

---

### Testing Strategy

**Unit Tests**:
- S3 URL generation functions
- Dataset validation logic (format parsing, statistics calculation)
- Pagination helper functions

**Integration Tests**:
- POST /api/datasets creates record and returns valid URL
- Validation worker processes dataset correctly
- GET /api/datasets applies filters correctly

**E2E Tests**:
```typescript
test('complete dataset upload flow', async ({ page }) => {
  await page.goto('/datasets');
  await page.click('text=Upload Dataset');
  await page.setInputFiles('input[type="file"]', 'test-dataset.jsonl');
  await page.fill('[name="name"]', 'Test Dataset');
  await page.click('text=Upload');
  
  // Wait for validation
  await page.waitForSelector('text=Ready', { timeout: 30000 });
  
  // Verify dataset appears in list
  await expect(page.locator('text=Test Dataset')).toBeVisible();
});
```

---

### Development Tasks

**T-2.1: S3 Storage Setup** (4 hours)
- Configure S3 client in `/lib/storage.ts`
- Implement presigned URL generation
- Test upload/download operations

**T-2.2: Dataset Creation API** (6 hours)
- Implement POST `/api/datasets`
- Implement POST `/api/datasets/[id]/confirm`
- Test with real S3 bucket

**T-2.3: Validation System** (8 hours)
- Set up BullMQ + Redis
- Implement validation worker
- Implement dataset validator logic
- Test with various dataset formats

**T-2.4: Dataset Management APIs** (6 hours)
- Implement GET `/api/datasets` with pagination
- Implement GET `/api/datasets/[id]`
- Implement PATCH and DELETE endpoints
- Add comprehensive error handling

**T-2.5: Datasets UI Page** (10 hours)
- Create DatasetsPage component
- Create DatasetCard component
- Implement upload modal with drag-and-drop
- Add filtering and search
- Implement real-time status polling
- Test complete upload flow

---

## END OF SECTION 2

**Section 2 Summary**:
- ✅ S3 storage integration for file uploads
- ✅ Dataset upload flow with presigned URLs
- ✅ Background validation system with BullMQ
- ✅ Complete dataset CRUD APIs
- ✅ P02 Datasets Manager page

**What's Available for Subsequent Sections**:
- Dataset model with validation status
- S3 storage functions (`generateUploadUrl`, `generateDownloadUrl`)
- Dataset validation system
- P02 Datasets page for dataset selection
- Dataset statistics for training configuration

---

## SECTION 3: Training Configuration

### Overview

- **Section Purpose**: Enable users to configure training jobs with hyperparameter presets, advanced settings, and GPU selection
- **Builds Upon**:
  - Section 1: TrainingJob model, authentication
  - Section 2: Dataset selection (requires validated dataset)
- **New Capabilities Introduced**:
  - Hyperparameter preset system (Conservative/Balanced/Aggressive/Custom)
  - Advanced training settings panel
  - GPU configuration and cost estimation
  - P03 - Training Configurator page
  - Training job creation API
- **User Value**: Users can configure sophisticated training jobs with confidence through preset configurations and accurate cost estimates

---

### Integration with Previous Sections

**From Section 1**:
- TrainingJob database model (FR-1.2.1)
- Authentication (`requireAuth`)
- Dashboard layout wrapper

**From Section 2**:
- Dataset model - training requires validated dataset
- Dataset selection flow (user navigates from P02 with datasetId)
- Dataset statistics for training estimates

---

### Features & Requirements Summary

- **FR-3.1**: Hyperparameter Preset System
- **FR-3.2**: GPU Configuration Options
- **FR-3.3**: Cost Estimation Calculator
- **FR-3.4**: Training Job Creation API
- **FR-3.5**: P03 Training Configurator Page

---

### API Endpoints Summary

**POST `/api/jobs/estimate`** - Estimate training cost and duration
- **Auth**: Required
- **Input**: datasetId, hyperparameters, gpuConfig
- **Output**: Cost breakdown, duration estimate, tokens/sec
- **Calculation**: Based on dataset size, GPU type, epochs

**POST `/api/jobs`** - Create and queue training job
- **Auth**: Required
- **Input**: datasetId, presetId, hyperparameters, gpuConfig
- **Output**: jobId, queuePosition, estimated cost/duration
- **Flow**: Validate → Create DB record → Queue job (Section 4) → Return
- **Integrates**: Uses Dataset from Section 2, creates job for Section 4

---

### Hyperparameter Presets

```typescript
const HYPERPARAMETER_PRESETS = {
  conservative: {
    learningRate: 0.0001,
    batchSize: 4,
    numEpochs: 3,
    loraRank: 8,
    loraAlpha: 16,
    loraDropout: 0.05,
  },
  balanced: {
    learningRate: 0.0002,
    batchSize: 8,
    numEpochs: 5,
    loraRank: 16,
    loraAlpha: 32,
    loraDropout: 0.1,
  },
  aggressive: {
    learningRate: 0.0003,
    batchSize: 16,
    numEpochs: 10,
    loraRank: 32,
    loraAlpha: 64,
    loraDropout: 0.1,
  },
};
```

---

### UI Components

**P03 - Training Configurator** (`/app/(dashboard)/training/configure/page.tsx`)

**Layout**:
```
┌──────────────────────────────────────────┐
│ Dataset Info (from Section 2)           │
│ - Name, stats, validation status        │
├──────────────────────────────────────────┤
│ Preset Selector                          │
│ [Conservative] [Balanced] [Aggressive]   │
├──────────────────────────────────────────┤
│ Advanced Settings (expandable)           │
│ - Learning Rate slider                   │
│ - Batch Size slider                      │
│ - Epochs input                           │
│ - LoRA parameters                        │
├──────────────────────────────────────────┤
│ GPU Configuration                        │
│ - Instance Type dropdown                 │
│ - Number of GPUs                         │
├──────────────────────────────────────────┤
│ Cost Estimation Panel                    │
│ - Compute cost                           │
│ - Storage cost                           │
│ - Total estimate                         │
│ - Estimated duration                     │
├──────────────────────────────────────────┤
│ [Cancel] [Start Training]                │
└──────────────────────────────────────────┘
```

**Key Features**:
- Real-time cost estimation as user changes settings
- Preset selection overwrites current settings
- Advanced settings panel for custom configuration
- Validation warnings for extreme values
- "Start Training" creates job and navigates to P04 (Section 4)

**Data Flow**:
```
Load page with datasetId →
Fetch dataset details (Section 2 API) →
User selects preset →
Update form values →
Real-time cost estimation (debounced) →
User clicks "Start Training" →
POST /api/jobs →
Navigate to /training/jobs/{jobId} (Section 4)
```

---

### Development Tasks

**T-3.1: Cost Estimation Logic** (4 hours)
- Implement cost calculation algorithm
- Implement duration estimation
- Create POST `/api/jobs/estimate` endpoint

**T-3.2: Job Creation API** (6 hours)
- Implement POST `/api/jobs`
- Validate hyperparameters
- Create TrainingJob record
- Queue job for Section 4

**T-3.3: Configurator UI** (12 hours)
- Create P03 page with preset selector
- Implement advanced settings panel
- Add GPU configuration UI
- Integrate real-time cost estimation
- Test complete configuration flow

---

## END OF SECTION 3

**What's Available for Subsequent Sections**:
- Training job creation API
- Hyperparameter configurations
- Cost estimation logic
- TrainingJob records ready for execution (Section 4)

---

## SECTION 4: Training Execution & Monitoring

### Overview

- **Section Purpose**: Execute training jobs and provide real-time progress monitoring
- **Builds Upon**:
  - Section 1: Job queue setup, MetricsPoint/Checkpoint/JobLog models
  - Section 2: Dataset S3 keys for training input
  - Section 3: Training configuration and job creation
- **New Capabilities Introduced**:
  - BullMQ job queue processing
  - External GPU cluster API integration
  - Server-Sent Events (SSE) for real-time updates
  - P04 - Training Monitor page with live metrics
  - Job lifecycle management (queue → run → complete/fail)
  - Metrics history and loss curve visualization
- **User Value**: Real-time visibility into training progress with detailed metrics and cost tracking

---

### Integration with Previous Sections

**From Section 1**:
- TrainingJob, MetricsPoint, Checkpoint, JobLog models
- BullMQ queue infrastructure

**From Section 2**:
- Dataset S3 keys for input to GPU cluster

**From Section 3**:
- TrainingJob records created by configurator
- Hyperparameter and GPU configurations

---

### Features & Requirements Summary

- **FR-4.1**: Training Job Queue Worker
- **FR-4.2**: External GPU Cluster Integration
- **FR-4.3**: Real-time SSE Streaming
- **FR-4.4**: Job Management APIs
- **FR-4.5**: P04 Training Monitor Page

---

### API Endpoints Summary

**GET `/api/jobs`** - List user's training jobs
- Pagination, filtering by status

**GET `/api/jobs/[id]`** - Get job details with full metrics history

**GET `/api/jobs/[id]/stream`** - SSE stream for real-time updates
- Events: progress, metrics, cost, stage, complete, error
- Polls database every 2 seconds
- Closes on completion or failure

**POST `/api/jobs/[id]/cancel`** - Cancel running/queued job

---

### Background Processes

**Training Job Worker** (`/lib/queue.ts`)

**Process Flow**:
1. Job created in Section 3 → Queued in BullMQ
2. Worker picks up job
3. Update status: QUEUED → INITIALIZING
4. Submit to external GPU cluster API
5. Store externalJobId in database
6. Update status: INITIALIZING → RUNNING
7. Poll GPU cluster for updates (every 5 seconds)
8. Store metrics in MetricsPoint table
9. Update currentMetrics and progress
10. On completion:
    - Download artifacts from GPU cluster
    - Upload to S3 (Section 5)
    - Create ModelArtifact record (Section 5)
    - Update status: RUNNING → COMPLETED
11. On failure: Update status to FAILED with error message

---

### UI Components

**P04 - Training Monitor** (`/app/(dashboard)/training/jobs/[jobId]/page.tsx`)

**Layout**:
```
┌──────────────────────────────────────────┐
│ Job Header                               │
│ Status: RUNNING | Progress: 45%          │
│ Dataset: {name} | Preset: Balanced       │
├──────────────────────────────────────────┤
│ Stage Indicator                          │
│ Queued → Initializing → Training →      │
│           Validating → Saving            │
├──────────────────────────────────────────┤
│ Current Metrics Card                     │
│ Training Loss: 0.234                     │
│ Validation Loss: 0.267                   │
│ Learning Rate: 0.0001                    │
│ Throughput: 1,250 tokens/sec             │
├──────────────────────────────────────────┤
│ Loss Curve Graph (Recharts)             │
│ Training Loss vs Validation Loss         │
├──────────────────────────────────────────┤
│ Cost Tracker                             │
│ Current: $12.45 | Estimated: $48.50      │
├──────────────────────────────────────────┤
│ Logs Panel (scrollable)                  │
└──────────────────────────────────────────┘
```

**Real-time Updates via SSE**:
```typescript
// hooks/useJobStream.ts
const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  updateProgress(data);
});

eventSource.addEventListener('metrics', (e) => {
  const data = JSON.parse(e.data);
  updateMetrics(data);
  addToLossCurve(data);
});

eventSource.addEventListener('complete', (e) => {
  showSuccessNotification();
  navigate(`/models/${e.data.artifactId}`);
});
```

---

### Development Tasks

**T-4.1: Job Queue Worker** (10 hours)
- Implement BullMQ worker in `/lib/queue.ts`
- Handle job lifecycle transitions
- Implement retry logic

**T-4.2: GPU Cluster Integration** (8 hours)
- Implement `/lib/training-client.ts`
- Submit jobs to external API
- Poll for status updates
- Handle callbacks

**T-4.3: SSE Streaming** (6 hours)
- Implement `/app/api/jobs/[id]/stream/route.ts`
- Set up EventSource connection
- Test with multiple concurrent streams

**T-4.4: Job Management APIs** (6 hours)
- Implement GET `/api/jobs`
- Implement GET `/api/jobs/[id]`
- Implement POST `/api/jobs/[id]/cancel`

**T-4.5: Training Monitor UI** (12 hours)
- Create P04 page
- Implement real-time charts with Recharts
- Add SSE connection with `useJobStream` hook
- Test with simulated training updates

---

## END OF SECTION 4

**What's Available for Subsequent Sections**:
- Completed training jobs with status COMPLETED
- Training metrics history in database
- External GPU cluster integration
- Job completion triggers artifact creation (Section 5)

---

## SECTION 5: Model Artifacts & Delivery

### Overview

- **Section Purpose**: Store, display, and deliver trained model artifacts
- **Builds Upon**:
  - Section 1: ModelArtifact database model
  - Section 2: S3 storage infrastructure
  - Section 3: Training configuration reference
  - Section 4: Job completion triggers artifact creation
- **New Capabilities Introduced**:
  - Model artifact storage in S3
  - Quality metrics calculation and display
  - Presigned download URLs
  - P05 - Model Artifacts page
  - Model version history
  - Optional deployment integration
- **User Value**: Users can view training results, quality metrics, and download trained models

---

### Integration with Previous Sections

**From Section 4**:
- Training job completion triggers artifact creation
- Training metrics used for quality scoring
- Job references stored in artifact metadata

**From Section 2**:
- S3 storage functions for artifact upload/download

**From Section 1**:
- ModelArtifact database model

---

### Features & Requirements Summary

- **FR-5.1**: Artifact Storage and Management
- **FR-5.2**: Quality Metrics Calculation
- **FR-5.3**: Download APIs
- **FR-5.4**: P05 Model Artifacts Page

---

### API Endpoints Summary

**GET `/api/models`** - List user's models
- Pagination, sorting by creation date or quality score

**GET `/api/models/[id]`** - Get model details
- Full metrics, configuration, lineage

**GET `/api/models/[id]/download`** - Generate presigned download URLs
- Query param: artifact type (all | adapter-model | adapter-config | tokenizer)

**PATCH `/api/models/[id]`** - Update model metadata
- Update name, description, status

**DELETE `/api/models/[id]`** - Soft delete model

---

### Artifact Creation Flow

Triggered by job completion (Section 4):

1. GPU cluster uploads artifacts (adapter_model.safetensors, adapter_config.json, tokenizer.json)
2. Worker downloads from GPU cluster
3. Worker uploads to S3: `models/{artifactId}/{fileName}`
4. Calculate quality metrics from training history
5. Create ModelArtifact record in database
6. Update TrainingJob.artifactId
7. Create notification (Section 6)

---

### UI Components

**P05 - Model Artifacts Page** (`/app/(dashboard)/models/[artifactId]/page.tsx`)

**Layout**:
```
┌──────────────────────────────────────────┐
│ Model Header                             │
│ Name | Version | Status                  │
├──────────────────────────────────────────┤
│ Quality Metrics Card                     │
│ ★★★★☆ Convergence Quality: Excellent     │
│ Final Training Loss: 0.189               │
│ Final Validation Loss: 0.223             │
│ Perplexity: 1.25                         │
├──────────────────────────────────────────┤
│ Training Summary                         │
│ Dataset: {name}                          │
│ Duration: 2h 34m                         │
│ Total Cost: $47.82                       │
│ GPU: 2x A100-80GB                        │
├──────────────────────────────────────────┤
│ Download Panel                           │
│ [Download All] [Download Adapter Model]  │
│ [Download Config] [Download Tokenizer]   │
├──────────────────────────────────────────┤
│ Metrics History Graph                    │
│ (Loss curve from training)               │
└──────────────────────────────────────────┘
```

---

### Development Tasks

**T-5.1: Artifact Management** (6 hours)
- Implement artifact creation in job completion handler
- Implement S3 upload for artifacts

**T-5.2: Quality Metrics** (4 hours)
- Implement quality scoring algorithm
- Calculate from training metrics

**T-5.3: Model APIs** (6 hours)
- Implement GET `/api/models`
- Implement GET `/api/models/[id]`
- Implement download URL generation

**T-5.4: Model Artifacts UI** (8 hours)
- Create P05 page
- Display quality metrics
- Implement download buttons
- Show training history

---

## END OF SECTION 5

---

## SECTION 6: Cost Tracking & Notifications

### Overview

- **Section Purpose**: Track costs in real-time and notify users of important events
- **Builds Upon** all previous sections
- **New Capabilities**:
  - Real-time cost calculation and tracking
  - Cost breakdown by type
  - Budget alerts
  - Notification system
  - Cost analytics

---

### Features & Requirements Summary

- **FR-6.1**: Cost Tracking System
- **FR-6.2**: Budget Alerts
- **FR-6.3**: Notification System
- **FR-6.4**: Cost Dashboard

---

### API Endpoints

**GET `/api/costs`** - Get cost data with filtering

**GET `/api/costs/summary`** - Current month summary and alerts

**GET `/api/notifications`** - User notifications

**PATCH `/api/notifications/[id]/read`** - Mark as read

---

### Cost Calculation

```typescript
// Real-time cost tracking during training
export async function trackJobCost(
  jobId: string,
  userId: string,
  costType: CostType,
  amount: number
) {
  await prisma.costRecord.create({
    data: {
      userId,
      jobId,
      costType,
      amount,
      billingPeriod: startOfDay(new Date()),
    },
  });
  
  // Check budget alerts
  await checkBudgetAlerts(userId);
}
```

---

### Notification Types

- Job Complete (high priority)
- Job Failed (high priority)
- Cost Alert - 80% budget (high priority)
- Cost Alert - 100% budget (critical priority)
- Dataset Ready (medium priority)

---

### Development Tasks

**T-6.1**: Cost tracking system (6 hours)
**T-6.2**: Budget alert logic (4 hours)
**T-6.3**: Notification APIs (6 hours)
**T-6.4**: Cost dashboard UI (6 hours)

---

## END OF SECTION 6

---

## SECTION 7: Complete System Integration

### Overview

This section validates all previous sections work together as a cohesive system.

---

### Integration Matrix

| Section | Integrates With | Key Integration Points |
|---------|----------------|------------------------|
| 1       | N/A            | Foundation             |
| 2       | 1              | Auth, Dataset model, Layout |
| 3       | 1, 2           | Auth, Job model, Dataset selection |
| 4       | 1, 2, 3        | Job processing, Dataset input, Metrics storage |
| 5       | 1, 2, 3, 4     | Artifacts from jobs, S3 storage |
| 6       | 1-5            | Cost tracking across all operations |

---

### End-to-End User Flows

**Complete Training Pipeline**:

1. **Section 1**: User logs in → Dashboard
2. **Section 2**: Navigate to Datasets → Upload dataset → Wait for validation
3. **Section 3**: Click "Start Training" → Configure job → Submit
4. **Section 4**: Navigate to monitor → Watch real-time progress → Job completes
5. **Section 5**: View model artifacts → Download model
6. **Section 6**: Receive notifications, view costs

---

### System-Wide Testing

**Regression Test Suite**:
- Verify authentication across all pages
- Test complete pipeline from upload to download
- Verify cost tracking updates correctly
- Test notifications trigger appropriately

**Performance Testing**:
- Load test: 100 concurrent users
- SSE connections: 50 concurrent streams
- Database query performance
- API response times < 500ms (p95)

---

### Deployment Checklist

- [ ] Database migrations run
- [ ] S3 bucket configured with CORS
- [ ] Redis instance provisioned
- [ ] Environment variables set
- [ ] Worker processes running
- [ ] GPU cluster API connected
- [ ] Monitoring and logging configured
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Backups automated

---

## APPENDICES

### Appendix A: Complete Prisma Schema

(See Section 1, FR-1.2.1 for full schema)

### Appendix B: Complete API Reference

| Endpoint | Method | Purpose | Section |
|----------|--------|---------|---------|
| `/api/auth/signup` | POST | User registration | 1 |
| `/api/datasets` | GET/POST | Dataset management | 2 |
| `/api/datasets/[id]` | GET/PATCH/DELETE | Dataset operations | 2 |
| `/api/datasets/[id]/confirm` | POST | Confirm upload | 2 |
| `/api/jobs` | GET/POST | Job management | 3, 4 |
| `/api/jobs/[id]` | GET/PATCH | Job details | 4 |
| `/api/jobs/[id]/stream` | GET | Real-time updates | 4 |
| `/api/jobs/[id]/cancel` | POST | Cancel job | 4 |
| `/api/models` | GET | List models | 5 |
| `/api/models/[id]` | GET/PATCH/DELETE | Model operations | 5 |
| `/api/models/[id]/download` | GET | Download URLs | 5 |
| `/api/costs` | GET | Cost data | 6 |
| `/api/costs/summary` | GET | Cost summary | 6 |
| `/api/notifications` | GET | Notifications | 6 |

### Appendix C: Component Library

All components from original wireframe preserved:
- `/components/ui/` - 30+ shadcn/ui components
- `/components/layout/` - Layout components
- `/components/datasets/` - Dataset management components
- `/components/training/` - Training configuration components
- `/components/training-monitor/` - Real-time monitoring components
- `/components/model-artifacts/` - Model display components

### Appendix D: Environment Variables Reference

See Section 1 for complete list of required environment variables.

### Appendix E: Development Timeline

**Total Estimated Time**: 152-188 hours (19-24 days for 2 developers)

- Section 1: 34 hours
- Section 2: 34 hours
- Section 3: 22 hours
- Section 4: 42 hours
- Section 5: 24 hours
- Section 6: 22 hours
- Section 7: 28 hours (integration and testing)

---

## QUALITY CHECKLIST

### Progressive Building
- [x] Each section explicitly references previous sections
- [x] No functionality duplicated
- [x] Clear integration points documented
- [x] Dependencies explicitly stated

### Technical Completeness
- [x] All UI components specified with wireframe detail
- [x] All APIs have complete schemas
- [x] Database schema complete with relationships
- [x] All integrations bi-directionally documented

### Consistency
- [x] Naming conventions consistent
- [x] TypeScript interfaces compatible
- [x] API patterns consistent
- [x] UI/UX patterns consistent

### Testability
- [x] Clear acceptance criteria
- [x] Integration test scenarios defined
- [x] E2E flows documented
- [x] Performance requirements specified

### Implementability
- [x] Realistic time estimates
- [x] Clear dependency ordering
- [x] Granular development tasks
- [x] All prerequisites specified

---

## CONCLUSION

This progressive structured specification provides a complete blueprint for implementing the BrightRun LoRA Training Platform. Each section builds incrementally on previous work with explicit integration points, zero redundancy, and production-ready detail.

**Key Achievements**:
- ✅ 7 comprehensive sections covering complete platform
- ✅ Explicit progressive integration across all sections
- ✅ Wireframe-level UI specifications
- ✅ Complete API documentation
- ✅ Production-ready database schema
- ✅ Comprehensive testing strategy
- ✅ Detailed development timeline

**Implementation Confidence**: This specification provides everything needed for a development team to build a production-ready platform with confidence. All integration points are explicit, all dependencies are clear, and the progressive structure ensures each deliverable builds naturally on previous work.

---

**Document Version:** 1.0  
**Completion Date:** December 22, 2024  
**Total Specification Length:** ~4,500 lines  
**Status:** Ready for Implementation



```

---

### Input 2: Infrastructure Inventory

```markdown
# Infrastructure Inventory - BrightRun LoRA Training Module

**Date**: December 23, 2024  
**Codebase**: `src/`  
**Purpose**: Document existing infrastructure that new LoRA Training module will USE  
**Target Module**: LoRA Fine-Tuning Pipeline (Dataset Upload → Training Configuration → Job Execution → Model Delivery)

---

## EXECUTIVE SUMMARY

This document inventories the existing BrightHub conversation generation platform infrastructure available for the new LoRA Training module to use. All new features will be implemented using this existing infrastructure.

**Available Infrastructure**:
- ✅ **Authentication**: Supabase Auth with cookie-based sessions - Ready to use
- ✅ **Database**: Supabase PostgreSQL with direct client - Ready to use  
- ✅ **Storage**: Supabase Storage with on-demand signed URLs - Ready to use
- ✅ **Components**: 47+ shadcn/ui components - Ready to use
- ✅ **State Management**: React Query with custom hooks pattern - Ready to use
- ✅ **API Architecture**: Next.js API routes with consistent patterns - Ready to use
- ✅ **Layout System**: Dashboard layout with navigation - Ready to extend

**Approach**: The new LoRA Training module will EXTEND this existing application by adding new tables, new API routes, new pages, and new components - all using the patterns documented below.

---

## 1. AUTHENTICATION INFRASTRUCTURE

### Authentication Available for New Module

**System**: Supabase Auth  
**Version**: `@supabase/ssr` v0.7.0, `@supabase/supabase-js` v2.46.1  
**Type**: Cookie-based authentication with SSR support  
**Location**: `src/lib/supabase-server.ts`, `src/lib/supabase-client.ts`, `src/lib/auth-service.ts`

**User Object Available**:
```typescript
// From Supabase Auth - available in all authenticated contexts
interface User {
  id: string;
  email: string;
  aud: string;
  role: string;
  created_at: string;
  updated_at: string;
  // Additional Supabase auth metadata fields
}
```

**API Route Protection Pattern (USE THIS):**
```typescript
// File: src/lib/supabase-server.ts (lines 147-164)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  
  // If response is not null, authentication failed
  if (response) return response; // Returns 401 with error message
  
  // user is now available - new module uses this exact pattern
  // Proceed with authenticated request logic
  const data = await fetchUserData(user.id);
  
  return NextResponse.json({ success: true, data });
}
```

**Client-Side Authentication Pattern (USE THIS):**
```typescript
// File: src/lib/auth-service.ts (lines 7-36)
import { AuthService } from '@/lib/auth-service';

// Get current user in client components
const user = await AuthService.getCurrentUser();

// Get session
const session = await AuthService.getSession();

// Get auth token
const token = await AuthService.getAuthToken();

// Sign out
await AuthService.signOut();
```

**Server Component Authentication Pattern (USE THIS):**
```typescript
// File: src/lib/supabase-server.ts (lines 34-62)
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function ServerComponent() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    // Handle unauthenticated state
    redirect('/signin');
  }
  
  // User is authenticated, proceed
  return <div>Welcome {user.email}</div>;
}
```

**Page Protection Pattern (USE THIS):**
```typescript
// File: src/app/(dashboard)/layout.tsx (lines 11-32)
'use client'

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);
  
  if (isLoading || !isAuthenticated) return <LoadingSpinner />;
  
  return <div>{children}</div>;
}
```

**Middleware Configuration:**
- **File**: `src/middleware.ts`
- **Pattern**: Refreshes Supabase session on every request automatically
- **Matcher**: All routes except static files (`_next/static`, images, etc.)
- **Behavior**: Session refresh is automatic, no additional configuration needed for new routes

**Files to Import From:**
- `/lib/supabase-server.ts` - Server-side auth: `requireAuth()`, `createServerSupabaseClient()`, `getAuthenticatedUser()`
- `/lib/supabase-client.ts` - Client-side auth: `getSupabaseClient()`, `createClientSupabaseClient()`
- `/lib/auth-service.ts` - Client utilities: `AuthService.getCurrentUser()`, `AuthService.getSession()`, `AuthService.signOut()`
- `/lib/auth-context.tsx` - React context: `useAuth()` hook with `isAuthenticated`, `isLoading`

**INSTRUCTION FOR NEW MODULE**: Use the patterns shown above. Do NOT create new authentication. All new API routes must use `requireAuth()`. All new pages under `(dashboard)` are automatically protected by the layout.

---

## 2. DATABASE INFRASTRUCTURE

### Database Available for New Module

**Client**: Supabase PostgreSQL Client  
**Database**: PostgreSQL (via Supabase)  
**Version**: `@supabase/supabase-js` v2.46.1  
**Schema Location**: `supabase/migrations/`  
**Type System**: TypeScript interfaces (no ORM - direct queries)

**Database Client Pattern (USE THIS):**
```typescript
// Server-side (API routes)
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  
  const supabase = await createServerSupabaseClient();
  
  // Query pattern
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json(
      { error: 'Database error', details: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ success: true, data });
}
```

**Insert Pattern (USE THIS):**
```typescript
const { data: newRecord, error } = await supabase
  .from('datasets')
  .insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    name: 'My Dataset',
    status: 'uploading',
    created_at: new Date().toISOString(),
  })
  .select()
  .single();
```

**Update Pattern (USE THIS):**
```typescript
const { data, error } = await supabase
  .from('datasets')
  .update({ status: 'ready', updated_at: new Date().toISOString() })
  .eq('id', datasetId)
  .eq('user_id', user.id) // Security: ensure user owns record
  .select()
  .single();
```

**Delete Pattern (USE THIS):**
```typescript
// Soft delete (preferred)
const { error } = await supabase
  .from('datasets')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', datasetId)
  .eq('user_id', user.id);

// Hard delete (use sparingly)
const { error } = await supabase
  .from('datasets')
  .delete()
  .eq('id', datasetId)
  .eq('user_id', user.id);
```

**Type Definition Pattern:**
```typescript
// File: src/lib/types/lora-training.ts (NEW FILE TO CREATE)
// Define TypeScript interfaces that match database schema

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'uploading' | 'validating' | 'ready' | 'error';
  storage_path: string;
  file_size: number;
  total_training_pairs: number | null;
  created_at: string;
  updated_at: string;
}

// Input type for creating dataset
export interface CreateDatasetInput {
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
}
```

**Existing Tables That May Be Referenced:**

| Table | Purpose | Key Fields | Relationship to New Features |
|-------|---------|------------|------------------------------|
| (No existing tables to reference) | - | - | New module is independent, no foreign keys to existing tables needed |

**Note**: The existing codebase has `conversations`, `templates`, `scenarios`, `batch_jobs` tables for the conversation generation system. The LoRA training module is a separate feature set and will not reference these tables.

**Migration Pattern:**
- **Location**: `supabase/migrations/`
- **Naming Convention**: `YYYYMMDD_descriptive_name.sql`
- **How to create**: Create SQL file directly in `supabase/migrations/` folder
- **How to run**: Use Supabase CLI: `supabase db push` or apply via Supabase Dashboard

**Migration Example Structure:**
```sql
-- Migration: Create LoRA Training Tables
-- Date: 2024-12-23

BEGIN;

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'uploading',
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);

COMMENT ON TABLE datasets IS 'LoRA training datasets uploaded by users';

COMMIT;
```

**Files to Import From:**
- `/lib/supabase-server.ts` - Server-side database client: `createServerSupabaseClient()`
- `/lib/supabase-client.ts` - Client-side database client: `getSupabaseClient()`
- `/lib/types/` - Type definitions (create new file: `lora-training.ts`)

**INSTRUCTION FOR NEW MODULE**: Create new tables using same migration pattern. Use same Supabase client for queries. Define TypeScript interfaces in `/lib/types/lora-training.ts`. All queries use Supabase query builder (NOT raw SQL).

---

## 3. STORAGE INFRASTRUCTURE

### Storage Available for New Module

**Provider**: Supabase Storage  
**Configuration Location**: Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)  
**Existing Bucket**: `conversation-files` (for conversations)  
**Pattern**: On-demand signed URL generation (URLs NOT stored in database)

**Upload Pattern (USE THIS):**
```typescript
// Step 1: Generate presigned upload URL (Server-side API route)
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  
  const { fileName, fileSize } = await request.json();
  
  // Generate unique storage path
  const datasetId = crypto.randomUUID();
  const storagePath = `datasets/${user.id}/${datasetId}/${fileName}`;
  
  // Use admin client for presigned URL generation
  const supabase = createServerSupabaseAdminClient();
  
  // Create signed upload URL (valid for 1 hour)
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('lora-datasets') // New bucket to create
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
      datasetId: datasetId,
    }
  });
}

// Step 2: Client uploads directly to Supabase Storage
// In React component:
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/octet-stream',
  },
  body: file,
});
```

**Download Pattern (USE THIS):**
```typescript
// Server-side API route
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  
  // Get dataset from database
  const supabaseDb = await createServerSupabaseClient();
  const { data: dataset } = await supabaseDb
    .from('datasets')
    .select('storage_path, file_name, file_size')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .single();
  
  if (!dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  }
  
  // Generate signed download URL (valid for 1 hour)
  const supabaseStorage = createServerSupabaseAdminClient();
  const { data: downloadData, error } = await supabaseStorage
    .storage
    .from('lora-datasets')
    .createSignedUrl(dataset.storage_path, 3600); // 1 hour expiry
  
  if (error) {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      downloadUrl: downloadData.signedUrl,
      fileName: dataset.file_name,
      fileSize: dataset.file_size,
      expiresIn: 3600,
    }
  });
}
```

**Existing Buckets:**

| Bucket | Purpose | Can New Module Use? |
|--------|---------|---------------------|
| `conversation-files` | Stores generated conversation JSON files | No - create new bucket |

**New Buckets to Create:**
- `lora-datasets` - For uploaded training dataset files (.jsonl, .json)
- `lora-models` - For trained model artifacts (.safetensors, configs)

**Bucket Creation:**
- **Method**: Via Supabase Dashboard → Storage → New Bucket
- **Settings**: 
  - Public: No (private bucket)
  - File size limit: 5GB per file
  - Allowed MIME types: `application/json`, `application/octet-stream`, `application/x-tar`

**Storage Best Practices (FOLLOW THESE):**
1. **Never store URLs in database** - Always store `storage_path` only
2. **Generate signed URLs on-demand** - Via API routes when user requests download
3. **Use user_id in path** - Pattern: `{bucket}/{user_id}/{resource_id}/{filename}`
4. **Set appropriate expiry** - 1 hour (3600 seconds) for download URLs
5. **Use admin client for signing** - Regular client cannot create signed URLs

**Files to Import From:**
- `/lib/supabase-server.ts` - Admin client: `createServerSupabaseAdminClient()`
- `/utils/supabase/info.tsx` - Project info: `projectId`, `publicAnonKey`

**INSTRUCTION FOR NEW MODULE**: Use same storage client. Create new buckets (`lora-datasets`, `lora-models`) via Dashboard. Store only `storage_path` in database. Generate signed URLs on-demand via API routes.

---

## 4. API ARCHITECTURE

### API Patterns for New Module

**Location**: `src/app/api/` (Next.js App Router API routes)  
**Pattern**: Route handlers in `route.ts` files  
**Existing API Namespaces**: `/api/conversations`, `/api/templates`, `/api/batch-jobs`, `/api/training-files`, etc.

**Standard Response Format (USE THIS):**
```typescript
// Success response
{
  success: true,
  data: {
    // Resource data
    datasets: [...],
    total: 10
  }
}

// Error response
{
  error: string,           // Short error code/message
  details?: string         // Detailed error message
}
```

**API Route Template (USE THIS):**
```typescript
// File: app/api/datasets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/datasets - List user's datasets
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status');
    
    // Database query
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        datasets: data,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
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

/**
 * POST /api/datasets - Create new dataset
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body = await request.json();
    
    // Validation (use Zod schema)
    // ... validation logic ...
    
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        ...body,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create dataset', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: dataset },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Validation Pattern (USE THIS):**
```typescript
import { z } from 'zod';

// Define schema
const createDatasetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  file_name: z.string(),
  file_size: z.number().positive(),
});

// Validate in API route
const validation = createDatasetSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    {
      error: 'Validation error',
      details: validation.error.flatten().fieldErrors
    },
    { status: 400 }
  );
}

const { name, description, file_name, file_size } = validation.data;
```

**Existing API Namespaces:**
- `/api/conversations/*` - Conversation generation and management
- `/api/templates/*` - Template CRUD
- `/api/scenarios/*` - Scenario CRUD
- `/api/batch-jobs/*` - Batch processing
- `/api/training-files/*` - Training file exports
- `/api/chunks/*` - Document chunk management
- `/api/export/*` - Export operations

**Available Namespaces for New Module:**
- `/api/datasets/*` - **AVAILABLE** (no conflict)
- `/api/training/*` - **AVAILABLE** (no conflict)
- `/api/jobs/*` - **AVAILABLE** (no conflict)
- `/api/models/*` - **AVAILABLE** (no conflict)

**HTTP Status Codes (USE THESE):**
- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Validation error
- `401` - Unauthorized (no auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

**INSTRUCTION FOR NEW MODULE**: Create new API routes following exact patterns above. Use `/api/datasets`, `/api/training`, `/api/jobs`, `/api/models` namespaces. Always use `requireAuth()`. Always return consistent response format.

---

## 5. COMPONENT LIBRARY

### Components Available for New Module

**UI Library**: shadcn/ui v2.x (Radix UI primitives + Tailwind CSS)  
**Styling**: Tailwind CSS v3.4.1  
**Icons**: Lucide React v0.460.0  
**Location**: `src/components/ui/`

**Available UI Components (REUSE THESE):**

| Component | Location | Purpose |
|-----------|----------|---------|
| Button | `/components/ui/button.tsx` | Primary action buttons with variants |
| Card | `/components/ui/card.tsx` | Content containers with header/footer |
| Dialog | `/components/ui/dialog.tsx` | Modal dialogs |
| Alert | `/components/ui/alert.tsx` | Alert messages |
| Badge | `/components/ui/badge.tsx` | Status indicators |
| Progress | `/components/ui/progress.tsx` | Progress bars |
| Table | `/components/ui/table.tsx` | Data tables |
| Tabs | `/components/ui/tabs.tsx` | Tab navigation |
| Select | `/components/ui/select.tsx` | Dropdown selects |
| Input | `/components/ui/input.tsx` | Text inputs |
| Textarea | `/components/ui/textarea.tsx` | Multi-line text |
| Label | `/components/ui/label.tsx` | Form labels |
| Checkbox | `/components/ui/checkbox.tsx` | Checkboxes |
| RadioGroup | `/components/ui/radio-group.tsx` | Radio buttons |
| Switch | `/components/ui/switch.tsx` | Toggle switches |
| Slider | `/components/ui/slider.tsx` | Range sliders |
| Toast (Sonner) | `/components/ui/sonner.tsx` | Toast notifications |
| DropdownMenu | `/components/ui/dropdown-menu.tsx` | Dropdown menus |
| Popover | `/components/ui/popover.tsx` | Popovers |
| Tooltip | `/components/ui/tooltip.tsx` | Tooltips |
| Skeleton | `/components/ui/skeleton.tsx` | Loading skeletons |
| ScrollArea | `/components/ui/scroll-area.tsx` | Scrollable areas |
| Separator | `/components/ui/separator.tsx` | Dividers |
| Sheet | `/components/ui/sheet.tsx` | Side sheets |
| Accordion | `/components/ui/accordion.tsx` | Accordions |
| AlertDialog | `/components/ui/alert-dialog.tsx` | Confirmation dialogs |
| AspectRatio | `/components/ui/aspect-ratio.tsx` | Aspect ratio containers |
| Avatar | `/components/ui/avatar.tsx` | User avatars |
| Breadcrumb | `/components/ui/breadcrumb.tsx` | Breadcrumb navigation |
| Calendar | `/components/ui/calendar.tsx` | Date picker calendar |
| Carousel | `/components/ui/carousel.tsx` | Image/content carousels |
| Chart | `/components/ui/chart.tsx` | Charts (Recharts wrapper) |
| Collapsible | `/components/ui/collapsible.tsx` | Collapsible sections |
| Command | `/components/ui/command.tsx` | Command palette |
| ContextMenu | `/components/ui/context-menu.tsx` | Right-click menus |
| Drawer | `/components/ui/drawer.tsx` | Bottom drawers |
| Form | `/components/ui/form.tsx` | Form wrapper |
| HoverCard | `/components/ui/hover-card.tsx` | Hover cards |
| InputOTP | `/components/ui/input-otp.tsx` | OTP inputs |
| Menubar | `/components/ui/menubar.tsx` | Menu bars |
| NavigationMenu | `/components/ui/navigation-menu.tsx` | Nav menus |
| Pagination | `/components/ui/pagination.tsx` | Pagination controls |
| Resizable | `/components/ui/resizable.tsx` | Resizable panels |
| Sidebar | `/components/ui/sidebar.tsx` | Sidebar components |
| Toggle | `/components/ui/toggle.tsx` | Toggle buttons |
| ToggleGroup | `/components/ui/toggle-group.tsx` | Toggle button groups |

**Total**: 47+ components available

**Layout Components (EXTEND THESE):**

| Component | Location | Purpose | Extension Needed |
|-----------|----------|---------|------------------|
| DashboardLayout | `/app/(dashboard)/layout.tsx` | Protected route wrapper | None - already protects all (dashboard) routes |
| RootLayout | `/app/layout.tsx` | Root app wrapper with providers | None - already provides React Query, Auth, Toasts |

**Component Pattern (USE THIS):**
```typescript
// File: components/datasets/DatasetCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DatasetCardProps {
  dataset: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  };
  onSelect?: (id: string) => void;
}

export function DatasetCard({ dataset, onSelect }: DatasetCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <CardDescription className="text-sm">
              Created {new Date(dataset.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge>{dataset.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => onSelect?.(dataset.id)}
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

**Styling Utilities:**
```typescript
// File: components/ui/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage:
<div className={cn("base-class", isActive && "active-class", className)} />
```

**Toast Notifications (USE THIS):**
```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Dataset uploaded successfully');

// Error toast
toast.error('Failed to upload dataset');

// Info toast
toast.info('Processing your request...');

// Loading toast
const loadingToast = toast.loading('Uploading...');
// Later: toast.dismiss(loadingToast);
```

**INSTRUCTION FOR NEW MODULE**: Reuse all UI components from `/components/ui/`. Create feature-specific components in `/components/datasets/`, `/components/training/`, `/components/models/` following same pattern. Use `cn()` for class merging. Use Sonner for toasts.

---

## 6. STATE & DATA FETCHING

### State & Data Fetching for New Module

**Global State**: Zustand v5.0.8 (for complex state) - Located in `/stores/`  
**Data Fetching**: React Query v5.90.5 (@tanstack/react-query)  
**Pattern**: Custom hooks for data fetching, Zustand for UI state

**Data Fetching Pattern (USE THIS):**
```typescript
// File: hooks/use-datasets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    staleTime: 60 * 1000, // 60 seconds (default from config)
  });
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      return response.json();
    },
    enabled: !!id, // Only fetch if ID exists
  });
}
```

**Mutation Pattern (USE THIS):**
```typescript
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
      // Invalidate datasets list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset created successfully');
    },
    onError: (error) => {
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
  });
}
```

**React Query Configuration:**
```typescript
// File: providers/react-query-provider.tsx (lines 23-44)
// Existing configuration - new module uses same settings
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // Consider data fresh for 60 seconds
      refetchOnWindowFocus: false, // Don't auto-refetch on window focus
      retry: 1,                     // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})
```

**Polling Pattern (USE THIS):**
```typescript
// For real-time updates (e.g., training job status)
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
      if (data?.data?.status === 'running') return 5000;
      // Stop polling if completed or failed
      return false;
    },
  });
}
```

**Optimistic Updates Pattern (USE THIS):**
```typescript
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Dataset> }) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update dataset');
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['datasets', id] });

      // Snapshot previous value
      const previousDataset = queryClient.getQueryData(['datasets', id]);

      // Optimistically update
      queryClient.setQueryData(['datasets', id], (old: any) => ({
        ...old,
        data: { ...old.data, ...updates }
      }));

      return { previousDataset };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      queryClient.setQueryData(['datasets', id], context?.previousDataset);
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['datasets', id] });
    },
  });
}
```

**INSTRUCTION FOR NEW MODULE**: Create hooks following same pattern in `/hooks/`. Use React Query for all server data fetching. Use Zustand only for complex UI state (modals, filters, multi-step forms). Hooks should be named `use[Resource]` and `use[Action][Resource]`.

---

## 7. UTILITIES & HELPERS

### Utilities Available for New Module

**Utility Functions (USE THESE):**

| Function | Location | Purpose |
|----------|----------|---------|
| cn() | `/components/ui/utils.ts` | Merge Tailwind CSS classes |
| Various | `/lib/utils.ts` | (If exists - check for date formatting, string utils, etc.) |

**Custom Hooks (USE THESE):**

| Hook | Location | Purpose |
|------|----------|---------|
| useDebounce | `/hooks/use-debounce.ts` | Debounce values (e.g., search input) |
| useOnlineStatus | `/hooks/use-online-status.ts` | Detect online/offline status |
| (More hooks in `/hooks/` directory) | Various | Reusable logic |

**Date/Time Utilities:**
```typescript
// Package: date-fns v4.1.0
import { format, formatDistanceToNow } from 'date-fns';

// Format date
const formatted = format(new Date(), 'PPpp'); // "Apr 29, 2024, 10:30 AM"

// Relative time
const relative = formatDistanceToNow(new Date(created_at), { addSuffix: true });
// "2 hours ago"
```

**UUID Generation:**
```typescript
// Package: uuid v13.0.0
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"

// Or use crypto (built-in)
const id = crypto.randomUUID();
```

**Validation (Zod):**
```typescript
// Package: zod v4.1.12
import { z } from 'zod';

// Already documented in Section 4 (API Architecture)
```

**Type Definition Location:**
- `/lib/types/` - Add new file: `lora-training.ts` for all LoRA-related types
- Follow pattern from `/lib/types/conversations.ts` (see file for reference)

**INSTRUCTION FOR NEW MODULE**: Import and use existing utilities. Add new utilities to `/lib/utils/` if needed (create subdirectories like `/lib/utils/training-helpers.ts`). Define all types in `/lib/types/lora-training.ts`.

---

## 8. TESTING INFRASTRUCTURE

### Testing for New Module

**Framework**: Jest v29.7.0  
**Component Testing**: React Testing Library v14.1.2  
**E2E**: Custom scripts (see `/scripts/e2e-tests.js`, `/scripts/performance-tests.js`)  
**Location**: `__tests__/` directories (co-located with code)

**Test Location Pattern**:
- Unit tests: `src/lib/__tests__/[module].test.ts`
- Integration tests: `src/__tests__/integration/[feature].test.ts`
- API tests: `src/app/api/[route]/__tests__/route.test.ts` (pattern to follow)

**Test Pattern (USE THIS):**
```typescript
// File: src/lib/__tests__/dataset-validator.test.ts
import { validateDataset } from '../dataset-validator';

describe('Dataset Validator', () => {
  it('should validate correct JSONL format', () => {
    const validData = JSON.stringify({ conversation_id: '123', turns: [] });
    const result = validateDataset(validData);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid format', () => {
    const invalidData = 'not json';
    const result = validateDataset(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid JSON');
  });
});
```

**Component Test Pattern:**
```typescript
// File: components/datasets/__tests__/DatasetCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DatasetCard } from '../DatasetCard';

describe('DatasetCard', () => {
  const mockDataset = {
    id: '123',
    name: 'Test Dataset',
    status: 'ready',
    created_at: '2024-01-01T00:00:00Z',
  };

  it('renders dataset information', () => {
    render(<DatasetCard dataset={mockDataset} />);
    expect(screen.getByText('Test Dataset')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('calls onSelect when button clicked', () => {
    const onSelect = jest.fn();
    render(<DatasetCard dataset={mockDataset} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('View Details'));
    expect(onSelect).toHaveBeenCalledWith('123');
  });
});
```

**Test Scripts (available):**
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
```

**INSTRUCTION FOR NEW MODULE**: Add tests following same patterns in same locations. Use Jest for unit tests. Use React Testing Library for component tests. Aim for >80% coverage on critical paths (data validation, API routes, core business logic).

---

## 9. ENVIRONMENT VARIABLES

### Environment for New Module

**Configuration Location**: `.env.local` (local dev) / Vercel Environment Variables (production)

**Existing Variables (ALREADY AVAILABLE):**
```bash
# Supabase (Authentication & Database & Storage)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Other existing vars for conversation generation
ANTHROPIC_API_KEY=[key]  # For Claude AI (not needed for LoRA training)
```

**New Variables Needed for LoRA Training Module:**
```bash
# GPU Cluster API (External service for training execution)
GPU_CLUSTER_API_URL=https://gpu-cluster.example.com/api
GPU_CLUSTER_API_KEY=[your-gpu-cluster-api-key]

# Training Configuration (Optional - can have defaults)
MAX_DATASET_SIZE_MB=500
MAX_TRAINING_DURATION_HOURS=48
```

**Usage Pattern:**
```typescript
// Access in Server Components / API Routes
const gpuApiUrl = process.env.GPU_CLUSTER_API_URL;
const gpuApiKey = process.env.GPU_CLUSTER_API_KEY;

// Access in Client Components (must be prefixed with NEXT_PUBLIC_)
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```

**INSTRUCTION FOR NEW MODULE**: Use existing Supabase variables. Add new variables for GPU cluster API. Document all new variables in `.env.example` file. Never commit actual keys to Git.

---

## USAGE CHECKLIST

Before implementing new features, verify:

- [ ] I understand the authentication pattern to use (`requireAuth()` for API routes)
- [ ] I understand the database query pattern to use (Supabase client, not Prisma)
- [ ] I understand the storage pattern to use (on-demand signed URLs, not pre-generated)
- [ ] I understand the API response format to use (`{ success, data }` or `{ error, details }`)
- [ ] I understand the component patterns to follow (shadcn/ui with `cn()` utility)
- [ ] I understand the data fetching pattern to use (React Query with custom hooks)
- [ ] I know where to add new types (`/lib/types/lora-training.ts`)
- [ ] I know where to add new migrations (`supabase/migrations/`)
- [ ] I know which UI components are available (`/components/ui/` - 47+ components)
- [ ] I know which buckets to create (`lora-datasets`, `lora-models`)

---

## SUMMARY

**What EXISTS and is READY to USE:**

1. ✅ **Authentication**: Supabase Auth with `requireAuth()`, `useAuth()`, and protected layouts
2. ✅ **Database**: Supabase PostgreSQL with direct queries (no ORM)
3. ✅ **Storage**: Supabase Storage with on-demand signed URLs
4. ✅ **Components**: 47+ shadcn/ui components ready to reuse
5. ✅ **State Management**: React Query for server data, Zustand for UI state
6. ✅ **API Infrastructure**: Next.js API routes with consistent patterns
7. ✅ **Utilities**: Date formatting, UUID generation, Zod validation, class merging
8. ✅ **Testing**: Jest + React Testing Library setup

**What needs to be CREATED for LoRA Training Module:**

1. ❌ Database tables: `datasets`, `training_jobs`, `metrics_points`, `checkpoints`, `model_artifacts`, `cost_records`, `notifications`
2. ❌ Storage buckets: `lora-datasets`, `lora-models`
3. ❌ API routes: `/api/datasets/*`, `/api/training/*`, `/api/jobs/*`, `/api/models/*`
4. ❌ Pages: `/datasets`, `/datasets/[id]`, `/training/configure`, `/training/jobs/[id]`, `/models`, `/models/[id]`
5. ❌ Components: `DatasetCard`, `DatasetUploadForm`, `TrainingConfigForm`, `JobMonitor`, `ModelArtifactCard`, etc.
6. ❌ Hooks: `useDatasets()`, `useTrainingJobs()`, `useModels()`, etc.
7. ❌ Types: All interfaces in `/lib/types/lora-training.ts`

**Next Step**: Proceed to Extension Strategy document to define HOW the new module uses this infrastructure.

---

**Document Version**: 1.0  
**Date**: December 23, 2024  
**Status**: Complete - Ready for Extension Strategy


```

---

### Input 3: Extension Strategy

```markdown
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


```

---

### Input 4: Implementation Guide

```markdown
# Implementation Guide - BrightRun LoRA Training Module

**Date**: December 23, 2024  
**Structured Spec**: `04c-pipeline-structured-from-wireframe_v1.md`  
**Extension Strategy**: `04d-extension-strategy_v1.md`  
**Infrastructure Inventory**: `04d-infrastructure-inventory_v1.md`

---

## PURPOSE

This document provides exact implementation instructions for adding the BrightRun LoRA Training module to the existing BrightHub codebase. Follow sections in order for systematic implementation.

**Implementation Approach**:
1. Database setup (migrations)
2. Type definitions (TypeScript interfaces)
3. API routes (backend logic)
4. React hooks (data fetching)
5. Components (UI building blocks)
6. Pages (full views)
7. Navigation (app integration)
8. Background processing (Edge Functions)

---

## TABLE OF CONTENTS

1. [Phase 1: Database Setup](#phase-1-database-setup)
2. [Phase 2: Type Definitions](#phase-2-type-definitions)
3. [Phase 3: API Routes](#phase-3-api-routes)
4. [Phase 4: React Hooks](#phase-4-react-hooks)
5. [Phase 5: Components](#phase-5-components)
6. [Phase 6: Pages](#phase-6-pages)
7. [Phase 7: Navigation Updates](#phase-7-navigation-updates)
8. [Phase 8: Background Processing](#phase-8-background-processing)
9. [Phase 9: Testing](#phase-9-testing)
10. [Implementation Checklist](#implementation-checklist)

---

## PHASE 1: DATABASE SETUP

### Step 1.1: Create Database Migration

**File**: `supabase/migrations/20241223_create_lora_training_tables.sql`

```sql
-- ============================================
-- BrightRun LoRA Training Module
-- Migration: Create LoRA Training Tables
-- Date: 2024-12-23
-- ============================================

BEGIN;

-- ============================================
-- DATASETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  name VARCHAR(200) NOT NULL,
  description TEXT,
  format VARCHAR(50) DEFAULT 'brightrun_lora_v4', -- 'brightrun_lora_v4' | 'brightrun_lora_v3'
  status VARCHAR(50) DEFAULT 'uploading', -- 'uploading' | 'validating' | 'ready' | 'error'

  -- Storage (Supabase Storage)
  storage_bucket VARCHAR(100) DEFAULT 'lora-datasets',
  storage_path TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,

  -- Dataset statistics (populated after validation)
  total_training_pairs INTEGER,
  total_validation_pairs INTEGER,
  total_tokens BIGINT,
  avg_turns_per_conversation DECIMAL(10, 2),
  avg_tokens_per_turn DECIMAL(10, 2),

  -- Validation
  training_ready BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_errors JSONB, -- Array of error objects

  -- Sample data (for preview)
  sample_data JSONB, -- First 3 conversations

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete

);

-- Indexes
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_datasets_created_at ON datasets(created_at DESC);

-- RLS Policies (if Supabase RLS is enabled)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE datasets IS 'LoRA training datasets uploaded by users';
COMMENT ON COLUMN datasets.storage_path IS 'Supabase Storage path - generate signed URLs on-demand';
COMMENT ON COLUMN datasets.validation_errors IS 'Array of validation error objects: [{ line, error, suggestion }]';

-- ============================================
-- TRAINING_JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,

  -- Configuration
  preset_id VARCHAR(50) NOT NULL, -- 'conservative' | 'balanced' | 'aggressive' | 'custom'
  hyperparameters JSONB NOT NULL, -- HyperparameterConfig object
  gpu_config JSONB NOT NULL, -- GPUConfig object

  -- Status & Progress
  status VARCHAR(50) DEFAULT 'queued', -- 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled'
  current_stage VARCHAR(50) DEFAULT 'queued', -- 'queued' | 'initializing' | 'training' | 'validating' | 'saving' | 'completed'
  progress DECIMAL(5, 2) DEFAULT 0, -- 0-100

  -- Training progress
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER NOT NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,

  -- Current metrics (denormalized for quick access)
  current_metrics JSONB, -- { training_loss, validation_loss, learning_rate, throughput, gpu_utilization }

  -- Time tracking
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,

  -- Cost tracking
  current_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_total_cost DECIMAL(10, 2) NOT NULL,
  final_cost DECIMAL(10, 2),

  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- External training service
  external_job_id VARCHAR(255) UNIQUE, -- ID from GPU cluster API

  -- Artifact reference
  artifact_id UUID, -- Foreign key added later

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_jobs_user_id ON training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_dataset_id ON training_jobs(dataset_id);
CREATE INDEX idx_training_jobs_external_id ON training_jobs(external_job_id);
CREATE INDEX idx_training_jobs_created_at ON training_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE training_jobs IS 'LoRA training jobs configuration and status';
COMMENT ON COLUMN training_jobs.external_job_id IS 'Job ID from external GPU cluster API';
COMMENT ON COLUMN training_jobs.current_metrics IS 'Latest metrics for quick display without querying metrics_points';

-- ============================================
-- METRICS_POINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS metrics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Progress
  epoch INTEGER NOT NULL,
  step INTEGER NOT NULL,

  -- Loss metrics
  training_loss DECIMAL(10, 6) NOT NULL,
  validation_loss DECIMAL(10, 6),

  -- Training metrics
  learning_rate DECIMAL(12, 10) NOT NULL,
  gradient_norm DECIMAL(10, 6),

  -- Performance metrics
  throughput DECIMAL(10, 2), -- tokens/sec
  gpu_utilization DECIMAL(5, 2) -- percentage
);

-- Indexes
CREATE INDEX idx_metrics_points_job_id ON metrics_points(job_id);
CREATE INDEX idx_metrics_points_timestamp ON metrics_points(job_id, timestamp DESC);
CREATE INDEX idx_metrics_points_step ON metrics_points(job_id, step DESC);

-- RLS Policies
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for own jobs"
  ON metrics_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_jobs
      WHERE training_jobs.id = metrics_points.job_id
      AND training_jobs.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE metrics_points IS 'Time-series training metrics for loss curves and performance tracking';

-- ============================================
-- MODEL_ARTIFACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE REFERENCES training_jobs(id) ON DELETE RESTRICT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,

  -- Metadata
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  description TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'stored', -- 'stored' | 'deployed' | 'archived'
  deployed_at TIMESTAMPTZ,

  -- Quality metrics (calculated from training)
  quality_metrics JSONB NOT NULL, -- { final_training_loss, final_validation_loss, convergence_quality, perplexity }

  -- Training summary
  training_summary JSONB NOT NULL, -- { duration_seconds, total_epochs, final_learning_rate, gpu_hours, total_cost }

  -- Configuration reference
  configuration JSONB NOT NULL, -- Copy of job config for reference

  -- Artifacts storage (Supabase Storage paths - NEVER URLs)
  artifacts JSONB NOT NULL, -- { adapter_model_path, adapter_config_path, tokenizer_path }

  -- Version lineage
  parent_model_id UUID REFERENCES model_artifacts(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Indexes
CREATE INDEX idx_model_artifacts_user_id ON model_artifacts(user_id);
CREATE INDEX idx_model_artifacts_job_id ON model_artifacts(job_id);
CREATE INDEX idx_model_artifacts_status ON model_artifacts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_model_artifacts_created_at ON model_artifacts(created_at DESC);

-- RLS Policies
ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON model_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON model_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE model_artifacts IS 'Trained LoRA model artifacts metadata and storage paths';
COMMENT ON COLUMN model_artifacts.artifacts IS 'Storage paths only - generate signed URLs on-demand';

-- Add foreign key from training_jobs to model_artifacts
ALTER TABLE training_jobs
ADD CONSTRAINT fk_training_jobs_artifact
FOREIGN KEY (artifact_id) REFERENCES model_artifacts(id);

-- ============================================
-- COST_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,

  -- Cost breakdown
  cost_type VARCHAR(50) NOT NULL, -- 'compute' | 'storage' | 'data_transfer'
  amount DECIMAL(10, 2) NOT NULL,

  -- Details
  details JSONB, -- { gpu_hours, storage_gb, transfer_gb, unit_cost }

  -- Time period
  billing_period DATE NOT NULL, -- Start of billing period
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cost_records_user_id ON cost_records(user_id);
CREATE INDEX idx_cost_records_job_id ON cost_records(job_id);
CREATE INDEX idx_cost_records_billing_period ON cost_records(user_id, billing_period DESC);

-- RLS Policies
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own costs"
  ON cost_records FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE cost_records IS 'Cost tracking records for billing and analytics';

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'job_complete' | 'job_failed' | 'cost_alert' | 'dataset_ready'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'

  read BOOLEAN DEFAULT FALSE,
  action_url TEXT, -- URL to navigate to on click

  metadata JSONB, -- Additional notification data

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE notifications IS 'User notifications for job events and alerts';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_jobs_updated_at BEFORE UPDATE ON training_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_artifacts_updated_at BEFORE UPDATE ON model_artifacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('datasets', 'training_jobs', 'metrics_points', 'model_artifacts', 'cost_records', 'notifications')
ORDER BY table_name;

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('datasets', 'training_jobs', 'metrics_points', 'model_artifacts', 'cost_records', 'notifications')
ORDER BY indexname;
```

### Step 1.2: Run Migration

**Using Supabase CLI**:
```bash
# Navigate to project root
cd /path/to/v4-show

# Apply migration
supabase db push
```

**OR using Supabase Dashboard**:
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste migration SQL
4. Run query

### Step 1.3: Create Storage Buckets

**Supabase Dashboard → Storage → Create Bucket**:

**Bucket 1: `lora-datasets`**
- Name: `lora-datasets`
- Public: No (private)
- File size limit: 500 MB
- Allowed MIME types: `application/json`, `application/x-jsonlines`

**Bucket 2: `lora-models`**
- Name: `lora-models`
- Public: No (private)
- File size limit: 5 GB
- Allowed MIME types: `application/octet-stream`, `application/x-tar`, `application/json`

---

## PHASE 2: TYPE DEFINITIONS

### Step 2.1: Create Type Definitions File

**File**: `src/lib/types/lora-training.ts`

```typescript
/**
 * Type Definitions for BrightRun LoRA Training Module
 * Matches database schema and API contracts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type DatasetFormat = 'brightrun_lora_v4' | 'brightrun_lora_v3';

export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';

export type JobStatus = 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';

export type JobStage = 'queued' | 'initializing' | 'training' | 'validating' | 'saving' | 'completed';

export type ModelStatus = 'stored' | 'deployed' | 'archived';

export type CostType = 'compute' | 'storage' | 'data_transfer';

export type NotificationType = 'job_complete' | 'job_failed' | 'cost_alert' | 'dataset_ready';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type PresetId = 'conservative' | 'balanced' | 'aggressive' | 'custom';

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: DatasetFormat;
  status: DatasetStatus;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  total_training_pairs: number | null;
  total_validation_pairs: number | null;
  total_tokens: number | null;
  avg_turns_per_conversation: number | null;
  avg_tokens_per_turn: number | null;
  training_ready: boolean;
  validated_at: string | null;
  validation_errors: ValidationError[] | null;
  sample_data: any | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  status: JobStatus;
  current_stage: JobStage;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number | null;
  current_metrics: CurrentMetrics | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion_at: string | null;
  current_cost: number;
  estimated_total_cost: number;
  final_cost: number | null;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  external_job_id: string | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricsPoint {
  id: string;
  job_id: string;
  timestamp: string;
  epoch: number;
  step: number;
  training_loss: number;
  validation_loss: number | null;
  learning_rate: number;
  gradient_norm: number | null;
  throughput: number | null;
  gpu_utilization: number | null;
}

export interface ModelArtifact {
  id: string;
  user_id: string;
  job_id: string;
  dataset_id: string;
  name: string;
  version: string;
  description: string | null;
  status: ModelStatus;
  deployed_at: string | null;
  quality_metrics: QualityMetrics;
  training_summary: TrainingSummary;
  configuration: JobConfiguration;
  artifacts: ArtifactPaths;
  parent_model_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CostRecord {
  id: string;
  user_id: string;
  job_id: string | null;
  cost_type: CostType;
  amount: number;
  details: CostDetails | null;
  billing_period: string;
  recorded_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  action_url: string | null;
  metadata: any | null;
  created_at: string;
}

// ============================================================================
// NESTED OBJECTS
// ============================================================================

export interface ValidationError {
  line: number;
  error: string;
  suggestion?: string;
}

export interface HyperparameterConfig {
  base_model: string; // e.g., "mistralai/Mistral-7B-v0.1"
  learning_rate: number;
  batch_size: number;
  num_epochs: number;
  lora_rank: number;
  lora_alpha: number;
  lora_dropout: number;
  warmup_steps?: number;
  weight_decay?: number;
  gradient_accumulation_steps?: number;
  max_grad_norm?: number;
}

export interface GPUConfig {
  gpu_type: string; // e.g., "A100-80GB", "H100-80GB", "A6000-48GB"
  num_gpus: number;
  gpu_memory_gb: number;
  cost_per_gpu_hour: number;
}

export interface CurrentMetrics {
  training_loss: number;
  validation_loss?: number;
  learning_rate: number;
  throughput?: number; // tokens/sec
  gpu_utilization?: number; // percentage
  tokens_processed?: number;
}

export interface QualityMetrics {
  final_training_loss: number;
  final_validation_loss: number;
  convergence_quality: 'excellent' | 'good' | 'fair' | 'poor';
  perplexity?: number;
  best_epoch?: number;
  best_validation_loss?: number;
}

export interface TrainingSummary {
  duration_seconds: number;
  total_epochs: number;
  final_learning_rate: number;
  gpu_hours: number;
  total_cost: number;
  avg_throughput?: number;
  total_tokens_processed?: number;
}

export interface JobConfiguration {
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  dataset_name: string;
}

export interface ArtifactPaths {
  adapter_model_path: string; // Storage path for adapter_model.safetensors
  adapter_config_path: string; // Storage path for adapter_config.json
  tokenizer_path: string; // Storage path for tokenizer files
  file_sizes: {
    adapter_model: number;
    adapter_config: number;
    tokenizer: number;
  };
}

export interface CostDetails {
  gpu_hours?: number;
  storage_gb?: number;
  transfer_gb?: number;
  unit_cost?: number;
  description?: string;
}

// ============================================================================
// INPUT TYPES (FOR API)
// ============================================================================

export interface CreateDatasetInput {
  name: string;
  description?: string;
  format?: DatasetFormat;
  file_name: string;
  file_size: number;
}

export interface UpdateDatasetInput {
  name?: string;
  description?: string;
}

export interface CreateTrainingJobInput {
  dataset_id: string;
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
}

export interface EstimateCostInput {
  dataset_id: string;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
}

export interface UpdateModelInput {
  name?: string;
  description?: string;
  status?: ModelStatus;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface DatasetListResponse {
  success: true;
  data: {
    datasets: Dataset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DatasetDetailResponse {
  success: true;
  data: Dataset;
}

export interface DatasetUploadResponse {
  success: true;
  data: {
    dataset: Dataset;
    uploadUrl: string; // Presigned upload URL
    storagePath: string;
  };
}

export interface TrainingJobListResponse {
  success: true;
  data: {
    jobs: TrainingJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TrainingJobDetailResponse {
  success: true;
  data: {
    job: TrainingJob;
    dataset: Pick<Dataset, 'id' | 'name' | 'total_training_pairs'>;
    metricsCount: number;
  };
}

export interface MetricsHistoryResponse {
  success: true;
  data: {
    metrics: MetricsPoint[];
    total: number;
  };
}

export interface CostEstimateResponse {
  success: true;
  data: {
    estimated_cost: number;
    estimated_duration_hours: number;
    cost_breakdown: {
      compute: number;
      storage: number;
      data_transfer: number;
    };
    gpu_hours: number;
  };
}

export interface ModelListResponse {
  success: true;
  data: {
    models: ModelArtifact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ModelDetailResponse {
  success: true;
  data: {
    model: ModelArtifact;
    job: Pick<TrainingJob, 'id' | 'created_at' | 'completed_at'>;
    dataset: Pick<Dataset, 'id' | 'name'>;
  };
}

export interface ModelDownloadResponse {
  success: true;
  data: {
    downloads: {
      adapter_model: { url: string; expires_in: number };
      adapter_config: { url: string; expires_in: number };
      tokenizer: { url: string; expires_in: number };
    };
  };
}

export interface CostSummaryResponse {
  success: true;
  data: {
    current_month: {
      total: number;
      by_type: Record<CostType, number>;
    };
    budget_alert: {
      has_budget: boolean;
      budget_limit?: number;
      percent_used?: number;
      alert_threshold_reached?: boolean;
    };
  };
}

export interface NotificationListResponse {
  success: true;
  data: {
    notifications: Notification[];
    unread_count: number;
    total: number;
  };
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface DatasetFilters {
  status?: DatasetStatus;
  format?: DatasetFormat;
  training_ready?: boolean;
  search?: string;
}

export interface TrainingJobFilters {
  status?: JobStatus;
  dataset_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ModelFilters {
  status?: ModelStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// ============================================================================
// VALIDATION SCHEMAS (ZOD)
// ============================================================================

export const DatasetFormatSchema = z.enum(['brightrun_lora_v4', 'brightrun_lora_v3']);

export const CreateDatasetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  format: DatasetFormatSchema.optional(),
  file_name: z.string().min(1, 'File name is required'),
  file_size: z.number().positive('File size must be positive'),
});

export const HyperparameterConfigSchema = z.object({
  base_model: z.string().min(1),
  learning_rate: z.number().positive(),
  batch_size: z.number().int().positive(),
  num_epochs: z.number().int().positive(),
  lora_rank: z.number().int().positive(),
  lora_alpha: z.number().int().positive(),
  lora_dropout: z.number().min(0).max(1),
  warmup_steps: z.number().int().nonnegative().optional(),
  weight_decay: z.number().nonnegative().optional(),
  gradient_accumulation_steps: z.number().int().positive().optional(),
  max_grad_norm: z.number().positive().optional(),
});

export const GPUConfigSchema = z.object({
  gpu_type: z.string().min(1),
  num_gpus: z.number().int().positive(),
  gpu_memory_gb: z.number().positive(),
  cost_per_gpu_hour: z.number().positive(),
});

export const CreateTrainingJobSchema = z.object({
  dataset_id: z.string().uuid(),
  preset_id: z.enum(['conservative', 'balanced', 'aggressive', 'custom']),
  hyperparameters: HyperparameterConfigSchema,
  gpu_config: GPUConfigSchema,
});

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const HYPERPARAMETER_PRESETS: Record<PresetId, HyperparameterConfig> = {
  conservative: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0001,
    batch_size: 4,
    num_epochs: 3,
    lora_rank: 8,
    lora_alpha: 16,
    lora_dropout: 0.05,
    warmup_steps: 100,
    weight_decay: 0.01,
  },
  balanced: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
    warmup_steps: 200,
    weight_decay: 0.01,
  },
  aggressive: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0003,
    batch_size: 16,
    num_epochs: 10,
    lora_rank: 32,
    lora_alpha: 64,
    lora_dropout: 0.1,
    warmup_steps: 500,
    weight_decay: 0.01,
  },
  custom: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
};

export const GPU_OPTIONS: GPUConfig[] = [
  {
    gpu_type: 'A6000-48GB',
    num_gpus: 1,
    gpu_memory_gb: 48,
    cost_per_gpu_hour: 1.50,
  },
  {
    gpu_type: 'A100-80GB',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 3.00,
  },
  {
    gpu_type: 'A100-80GB',
    num_gpus: 2,
    gpu_memory_gb: 160,
    cost_per_gpu_hour: 6.00,
  },
  {
    gpu_type: 'H100-80GB',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 5.00,
  },
];
```

---

## PHASE 3: API ROUTES

Due to length constraints, I'll provide the most critical API routes. Follow this pattern for all routes.

### Step 3.1: Datasets API - Create Dataset

**File**: `src/app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CreateDatasetSchema } from '@/lib/types/lora-training';
import type { CreateDatasetInput } from '@/lib/types/lora-training';

/**
 * POST /api/datasets - Create new dataset and get presigned upload URL
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body: CreateDatasetInput = await request.json();
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

    // Generate unique dataset ID
    const datasetId = crypto.randomUUID();
    const storagePath = `${user.id}/${datasetId}/${file_name}`;

    // Create dataset record
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
        storage_path: storagePath,
        file_name,
        file_size,
        status: 'uploading',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating dataset:', dbError);
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
      console.error('Storage error generating upload URL:', uploadError);
      // Rollback dataset creation
      await supabase.from('datasets').delete().eq('id', datasetId);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          dataset,
          uploadUrl: uploadData.signedUrl,
          storagePath,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/datasets:', error);
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
 * GET /api/datasets - List user's datasets with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status');
    const format = searchParams.get('format');
    const training_ready = searchParams.get('training_ready');
    const search = searchParams.get('search');

    // Build query
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('datasets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (format) query = query.eq('format', format);
    if (training_ready === 'true') query = query.eq('training_ready', true);
    if (search) query = query.ilike('name', `%${search}%`);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: datasets, error, count } = await query;

    if (error) {
      console.error('Database error fetching datasets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch datasets', details: error.message },
        { status: 500 }
      );
    }

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
    console.error('Unexpected error in GET /api/datasets:', error);
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

### Step 3.2: Datasets API - Confirm Upload

**File**: `src/app/api/datasets/[id]/confirm/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/datasets/[id]/confirm - Confirm upload and trigger validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const datasetId = params.id;

    // Update dataset status to 'validating'
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error } = await supabase
      .from('datasets')
      .update({ status: 'validating' })
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error confirming dataset:', error);
      return NextResponse.json(
        { error: 'Failed to confirm dataset', details: error.message },
        { status: 500 }
      );
    }

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found', details: 'Dataset does not exist or you do not have access' },
        { status: 404 }
      );
    }

    // Trigger validation (via Edge Function or background job)
    // For now, just return success. Validation will be handled by Edge Function
    // that polls for status='validating'

    return NextResponse.json({
      success: true,
      data: {
        dataset,
        message: 'Validation started. This may take a few minutes.',
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/datasets/[id]/confirm:', error);
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

### Step 3.3: Training Jobs API - Create Job

**File**: `src/app/api/jobs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CreateTrainingJobSchema } from '@/lib/types/lora-training';
import type { CreateTrainingJobInput } from '@/lib/types/lora-training';

/**
 * POST /api/jobs - Create and submit training job
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    // Parse and validate request body
    const body: CreateTrainingJobInput = await request.json();
    const validation = CreateTrainingJobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, preset_id, hyperparameters, gpu_config } = validation.data;

    // Verify dataset exists and is ready
    const supabase = await createServerSupabaseClient();
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('id, training_ready, status')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found', details: 'Dataset does not exist or you do not have access' },
        { status: 404 }
      );
    }

    if (!dataset.training_ready || dataset.status !== 'ready') {
      return NextResponse.json(
        { error: 'Dataset not ready', details: 'Dataset must be validated and ready for training' },
        { status: 400 }
      );
    }

    // Calculate estimated cost and duration
    const estimated_cost = calculateEstimatedCost(hyperparameters, gpu_config);
    const estimated_duration_hours = calculateEstimatedDuration(hyperparameters, gpu_config);

    // Create training job
    const { data: job, error: jobError } = await supabase
      .from('training_jobs')
      .insert({
        user_id: user.id,
        dataset_id,
        preset_id,
        hyperparameters,
        gpu_config,
        total_epochs: hyperparameters.num_epochs,
        estimated_total_cost: estimated_cost,
        estimated_completion_at: new Date(
          Date.now() + estimated_duration_hours * 60 * 60 * 1000
        ).toISOString(),
        status: 'queued',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Database error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create training job', details: jobError.message },
        { status: 500 }
      );
    }

    // Submit job to external GPU cluster (would call external API here)
    // For now, just create the job record
    // const externalJobId = await submitToGPUCluster(job);
    // await supabase.from('training_jobs').update({ external_job_id: externalJobId }).eq('id', job.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          job,
          estimated_cost,
          estimated_duration_hours,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/jobs:', error);
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
 * GET /api/jobs - List user's training jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const status = searchParams.get('status');
    const dataset_id = searchParams.get('dataset_id');

    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from('training_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (dataset_id) query = query.eq('dataset_id', dataset_id);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('Database error fetching jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/jobs:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateEstimatedCost(hyperparameters: any, gpu_config: any): number {
  // Simple estimation formula
  const estimated_hours = calculateEstimatedDuration(hyperparameters, gpu_config);
  return estimated_hours * gpu_config.cost_per_gpu_hour * gpu_config.num_gpus;
}

function calculateEstimatedDuration(hyperparameters: any, gpu_config: any): number {
  // Simple estimation: ~0.5 hours per epoch for baseline
  const base_hours_per_epoch = 0.5;
  const gpu_speedup = gpu_config.num_gpus * 0.8; // 80% efficiency with multi-GPU
  return (hyperparameters.num_epochs * base_hours_per_epoch) / gpu_speedup;
}
```

---

## IMPLEMENTATION SUMMARY

**What This Guide Provides**:

1. ✅ **Complete Database Schema** - 7 tables with indexes, RLS policies, and relationships
2. ✅ **Type System** - Full TypeScript types, Zod schemas, preset configurations
3. ✅ **Core API Routes** - Complete examples for datasets and training jobs creation/listing
4. ✅ **Pattern Templates** - Clear patterns to follow for remaining routes

**Remaining Implementation** (following same patterns):
- Additional API routes for jobs detail, models, costs, notifications
- React Query hooks for models, costs, notifications
- Additional UI components (upload form, config form, job monitor)
- Full pages for each feature area
- Edge Functions for background processing
- Navigation integration
- Comprehensive testing

**Implementation Approach**:
Follow the established patterns shown in this guide for all remaining features. Every API route, hook, component, and page should use the same authentication, database query, response format, and styling patterns demonstrated.

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Database ✅
- [ ] Created migration file `20241223_create_lora_training_tables.sql`
- [ ] Ran migration via Supabase CLI or Dashboard
- [ ] Verified all 7 tables created
- [ ] Created storage bucket `lora-datasets`
- [ ] Created storage bucket `lora-models`
- [ ] Configured bucket permissions (private)

### Phase 2: Types ✅
- [ ] Created file `src/lib/types/lora-training.ts`
- [ ] Defined all interfaces matching database schema
- [ ] Defined Zod validation schemas
- [ ] Exported preset configurations
- [ ] Exported GPU options

### Phase 3: API Routes 
- [ ] Created `POST /api/datasets` - Create dataset ✅
- [ ] Created `GET /api/datasets` - List datasets ✅
- [ ] Created `GET /api/datasets/[id]` - Get dataset details
- [ ] Created `PATCH /api/datasets/[id]` - Update dataset
- [ ] Created `DELETE /api/datasets/[id]` - Delete dataset
- [ ] Created `POST /api/datasets/[id]/confirm` - Confirm upload ✅
- [ ] Created `POST /api/jobs` - Create training job ✅
- [ ] Created `GET /api/jobs` - List jobs ✅
- [ ] Created `GET /api/jobs/[id]` - Get job details
- [ ] Created `POST /api/jobs/[id]/cancel` - Cancel job
- [ ] Created `POST /api/jobs/estimate` - Estimate cost
- [ ] Created `GET /api/models` - List models
- [ ] Created `GET /api/models/[id]` - Get model details
- [ ] Created `GET /api/models/[id]/download` - Download URLs

### Phase 4: React Hooks 
- [ ] Created `src/hooks/use-datasets.ts` with all dataset hooks
- [ ] Created `src/hooks/use-training-jobs.ts` with all job hooks
- [ ] Created `src/hooks/use-models.ts` with all model hooks
- [ ] Created `src/hooks/use-costs.ts` with cost hooks
- [ ] Created `src/hooks/use-notifications.ts` with notification hooks
- [ ] Configured polling for real-time updates

### Phase 5: Components 
- [ ] Created `DatasetCard` component
- [ ] Created `DatasetUploadForm` component
- [ ] Created `TrainingConfigForm` component
- [ ] Created `JobMonitor` component
- [ ] Created `ModelArtifactCard` component
- [ ] Created shared/common components

### Phase 6: Pages 
- [ ] Created `/datasets` page - List view
- [ ] Created `/datasets/new` page - Upload flow
- [ ] Created `/datasets/[id]` page - Detail view
- [ ] Created `/training/configure` page - Configuration
- [ ] Created `/training/jobs` page - Jobs list
- [ ] Created `/training/jobs/[id]` page - Monitor view
- [ ] Created `/models` page - Models list
- [ ] Created `/models/[id]` page - Model detail

### Phase 7: Navigation 
- [ ] Added "Datasets" to navigation
- [ ] Added "Training Jobs" to navigation
- [ ] Added "Trained Models" to navigation
- [ ] Added icons (Database, Cpu, Package from Lucide)
- [ ] Tested navigation routing

### Phase 8: Background Processing 
- [ ] Created `validate-dataset` Edge Function
- [ ] Deployed Edge Function to Supabase
- [ ] Configured cron trigger (every 1 minute)
- [ ] Created `poll-training-jobs` Edge Function (optional)
- [ ] Tested validation flow end-to-end

### Phase 9: Testing 
- [ ] Added API route tests
- [ ] Added component tests
- [ ] Added hook tests
- [ ] Achieved >70% test coverage
- [ ] All tests passing

### Phase 10: Integration Testing 
- [ ] Tested complete upload flow (upload → validate → ready)
- [ ] Tested training configuration flow
- [ ] Tested job submission and monitoring
- [ ] Tested model download flow
- [ ] Tested error states
- [ ] Verified all existing features still work

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment ✅
- [ ] All tests passing
- [ ] No linter errors
- [ ] Environment variables configured
- [ ] Database migration applied to production
- [ ] Storage buckets created in production

### Deployment ✅
- [ ] Deploy to Vercel/production environment
- [ ] Verify Edge Functions deployed
- [ ] Verify cron triggers configured
- [ ] Test in production with small dataset

### Post-Deployment ✅
- [ ] Monitor error logs
- [ ] Verify real-time polling working
- [ ] Test complete workflow end-to-end
- [ ] Document any issues

---

## NEXT STEPS FOR DEVELOPERS

1. **Start with Database**: Run the migration to create all tables
2. **Add Types**: Copy the complete type definitions file
3. **Implement Core APIs**: Start with datasets POST and GET routes
4. **Build One Feature End-to-End**: Complete datasets feature (API → hooks → components → page) before moving to next feature
5. **Follow Patterns**: Use the provided examples as templates for remaining features
6. **Test Incrementally**: Test each feature as you build it
7. **Integrate Navigation**: Add nav items once pages are working
8. **Add Background Processing**: Implement Edge Functions last

---

## SUMMARY

**What You've Built**:

1. ✅ Complete database schema (7 tables)
2. ✅ Full type system with Zod validation
3. ✅ Pattern templates for 15+ API routes
4. ✅ Example hooks with React Query and polling
5. ✅ Example components using shadcn/ui
6. ✅ Complete page example with filters and pagination
7. ✅ Background processing pattern via Edge Functions
8. ✅ Complete integration with existing infrastructure

**Result**: A comprehensive implementation guide for building a LoRA Training module that extends the existing conversation generation platform, reusing all existing infrastructure (Supabase Auth, Database, Storage, shadcn/ui components, React Query).

**Development Estimates**:
- Database + Types: 8 hours
- Core APIs (Datasets, Jobs): 20 hours
- Remaining APIs (Models, Costs): 12 hours
- Hooks: 10 hours
- Components: 15 hours
- Pages: 20 hours
- Background Processing: 8 hours
- Testing: 15 hours
- Integration & Bug Fixes: 12 hours
- **Total: 120 hours** (3 weeks for 2 developers)

---

**Document Version**: 1.0 (Complete)  
**Date**: December 23, 2024  
**Status**: Complete - Ready for Implementation  
**Pages**: Infrastructure Inventory, Extension Strategy, Implementation Guide - All Complete


---

## PHASE 4: REACT HOOKS

### Step 4.1: Dataset Hooks

**File**: `src/hooks/use-datasets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Dataset,
  CreateDatasetInput,
  UpdateDatasetInput,
  DatasetFilters,
} from '@/lib/types/lora-training';

/**
 * Fetch list of datasets with optional filters
 */
export function useDatasets(filters?: DatasetFilters) {
  return useQuery({
    queryKey: ['datasets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.format) params.set('format', filters.format);
      if (filters?.training_ready !== undefined) {
        params.set('training_ready', String(filters.training_ready));
      }
      if (filters?.search) params.set('search', filters.search);

      const response = await fetch(`/api/datasets?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch single dataset details
 */
export function useDataset(id: string | null) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Create new dataset and get upload URL
 */
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

/**
 * Confirm dataset upload
 */
export function useConfirmDatasetUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      const response = await fetch(`/api/datasets/${datasetId}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to confirm upload');
      }
      return response.json();
    },
    onSuccess: (_, datasetId) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] });
      toast.success('Validation started');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Update dataset metadata
 */
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateDatasetInput }) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update dataset');
      }
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', id] });
      toast.success('Dataset updated');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Delete dataset (soft delete)
 */
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }
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

### Step 4.2: Training Job Hooks

**File**: `src/hooks/use-training-jobs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  TrainingJob,
  CreateTrainingJobInput,
  TrainingJobFilters,
} from '@/lib/types/lora-training';

/**
 * Fetch list of training jobs with polling for active jobs
 */
export function useTrainingJobs(filters?: TrainingJobFilters) {
  return useQuery({
    queryKey: ['training-jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.dataset_id) params.set('dataset_id', filters.dataset_id);

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    },
    refetchInterval: (data) => {
      // Poll every 10 seconds if any jobs are running
      const hasActiveJobs = data?.data?.jobs?.some((job: TrainingJob) =>
        ['queued', 'initializing', 'running'].includes(job.status)
      );
      return hasActiveJobs ? 10000 : false;
    },
  });
}

/**
 * Fetch single training job with polling if running
 */
export function useTrainingJob(id: string | null) {
  return useQuery({
    queryKey: ['training-jobs', id],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Poll every 5 seconds if job is active
      const job = data?.data?.job;
      if (job && ['queued', 'initializing', 'running'].includes(job.status)) {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * Create and submit training job
 */
export function useCreateTrainingJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTrainingJobInput) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast.success('Training job created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Cancel running job
 */
export function useCancelTrainingJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['training-jobs', jobId] });
      toast.success('Job cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

---

## PHASE 5: COMPONENTS (Sample)

### Step 5.1: Dataset Card Component

**File**: `src/components/datasets/DatasetCard.tsx`

```typescript
'use client';

import {
  Card,
 

```

---

## YOUR TASK

Using the transformation rules and guidance provided in this meta-prompt, transform the Structured Specification (Input 1) into an Integrated Extension Specification.

For each section:
1. Extract the features and requirements
2. Apply the transformation rules to replace generic infrastructure with Supabase patterns
3. Reference the Infrastructure Inventory (Input 2) for exact code patterns
4. Reference the Extension Strategy (Input 3) for infrastructure decisions
5. Reference the Implementation Guide (Input 4) for implementation examples
6. Output the integrated section following the output structure template

**Start with Section 1 and proceed through Section 7 sequentially.**

**Output the complete integrated specification as a single markdown document.**
