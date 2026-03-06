# Integration Merge Meta-Prompt

**Version:** 1.0  
**Date:** December 23, 2025  
**Purpose:** Transform a structured specification into an integrated extension specification by merging it with existing codebase infrastructure knowledge  
**Scope:** Product and module agnostic - works with any structured spec following the progressive specification format

---

## OVERVIEW

This meta-prompt transforms a **generic structured specification** into an **integrated extension specification** by replacing all generic infrastructure references with patterns from an existing production codebase.

**Input**: 4 documents
1. Structured Specification (features described with generic infrastructure)
2. Infrastructure Inventory (what exists in the codebase)
3. Extension Strategy (how features map to existing infrastructure)
4. Implementation Guide (exact code patterns to follow)

**Output**: 1 document
- Integrated Extension Specification (features described with existing codebase patterns)

**Key Transformation**: Replace ALL generic infrastructure choices with existing codebase patterns while preserving business logic and feature requirements.

---

## CRITICAL CONTEXT: EXTENSION, NOT REPLACEMENT

### Read This First

You are NOT creating a new application.  
You are NOT comparing two competing architectures.  
You are NOT looking for "incompatibilities" or "mismatches".

**You ARE:**
- Taking FEATURES from a structured spec
- Implementing those FEATURES using EXISTING infrastructure
- Adding NEW code (tables, APIs, pages) that uses existing patterns
- Creating an extension specification that treats the existing codebase as the foundation

**Mindset:**
> "The structured spec tells me WHAT to build. The integration documents tell me HOW to build it using what already exists."

---

## INPUT FILES

### Input 1: Structured Specification
**Path**: `{{STRUCTURED_SPEC_PATH}}`

**Format**: Progressive structured specification with:
- Multiple sections (typically 5-7)
- Each section has Feature Requirements (FR-X.Y format)
- Each FR describes: Purpose, Implementation, Database, API, UI, Testing
- May reference generic technologies (Prisma, NextAuth, S3, BullMQ, etc.)

**How to Read**:
- ✅ Extract the BUSINESS LOGIC (what the feature does)
- ✅ Extract the DATA MODELS (what information is stored)
- ✅ Extract the USER FLOWS (what the user does)
- ✅ Extract the API CONTRACTS (what endpoints exist)
- ❌ IGNORE the infrastructure choices (Prisma, NextAuth, etc.)
- ❌ IGNORE the code examples (they use wrong infrastructure)

**Example of Extracting Features**:
```
SPEC SAYS:
"FR-2.1: Dataset Upload
Users can upload conversation datasets using presigned S3 URLs generated via AWS SDK.

Implementation:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: 'us-east-1' });
```
"

YOU EXTRACT:
- Feature: Dataset upload with presigned URLs
- Data: dataset_id, user_id, file_name, file_size, storage_path
- API: POST /api/datasets, POST /api/datasets/[id]/confirm
- UI: Upload button, progress bar, success message
- Infrastructure: IGNORE "AWS SDK" - will use existing storage pattern
```

---

### Input 2: Infrastructure Inventory
**Path**: `{{INFRASTRUCTURE_INVENTORY_PATH}}`

**Contents**: Documentation of existing codebase infrastructure
- Authentication system and patterns
- Database client and query patterns
- Storage client and upload patterns
- API route templates
- Component library
- State management patterns
- Error handling patterns

**How to Use**:
- This is your SOURCE OF TRUTH for infrastructure
- Every infrastructure need must use patterns from this document
- Copy exact code patterns when transforming the spec
- Reference exact file paths and function names

---

### Input 3: Extension Strategy
**Path**: `{{EXTENSION_STRATEGY_PATH}}`

**Contents**: Mapping of spec features to existing infrastructure
- Which existing infrastructure each feature uses
- What new tables/APIs/pages need to be created
- What existing patterns to follow for each feature

**How to Use**:
- This bridges the spec's features with the inventory's infrastructure
- Use this to determine HOW each feature integrates with existing code
- Follow the decisions made about what to create vs. what to reuse

---

### Input 4: Implementation Guide
**Path**: `{{IMPLEMENTATION_GUIDE_PATH}}`

**Contents**: Exact code to add
- SQL migrations for new tables
- TypeScript interfaces for new types
- API route implementations
- Component implementations
- Integration points

**How to Use**:
- This provides concrete examples following existing patterns
- Use as reference when writing transformed implementations
- Ensure consistency with these exact patterns

---

## TRANSFORMATION RULES

### Rule 1: Section Structure Preservation

**Preserve from original spec**:
- ✅ Section numbering and names
- ✅ Section purpose and overview
- ✅ Feature requirement numbering (FR-X.Y)
- ✅ Feature names and descriptions
- ✅ User value statements
- ✅ Acceptance criteria
- ✅ Testing requirements

**Transform in each section**:
- ❌ Infrastructure references → Use existing patterns
- ❌ Code examples → Rewrite with existing patterns
- ❌ Technology stack mentions → Replace with existing stack
- ❌ Setup instructions → Replace with extension instructions

---

### Rule 2: Database Transformation

**Generic Spec Pattern**:
```markdown
### Database Schema

```prisma
model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  name        String
  createdAt   DateTime      @default(now())
}
```
```

**Transformed Pattern** (example using Supabase):
```markdown
### Database Schema

**Implementation**: Use existing Supabase PostgreSQL database

**Migration File**: `supabase/migrations/YYYYMMDD_create_datasets.sql`

```sql
-- Create datasets table following existing RLS patterns
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (following existing pattern)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Policies (following existing pattern)
CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Query Pattern** (use existing database client):
```typescript
// From Infrastructure Inventory: use createServerSupabaseClient()
const supabase = await createServerSupabaseClient();

const { data, error } = await supabase
  .from('datasets')
  .select('*')
  .eq('user_id', user.id);
```
```

**Transformation Steps**:
1. Convert Prisma model → SQL CREATE TABLE
2. Replace `@id` with appropriate primary key pattern from existing codebase
3. Replace `@default(cuid())` with existing ID generation pattern
4. Replace `@relation` with appropriate foreign key syntax
5. Add RLS policies following existing codebase patterns
6. Show query examples using existing database client

---

### Rule 3: Authentication Transformation

**Generic Spec Pattern**:
```markdown
### Authentication

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Use session.user.id
}
```
```

**Transformed Pattern** (example - adapt to actual existing pattern):
```markdown
### Authentication

**Implementation**: Use existing authentication system

**Pattern** (from Infrastructure Inventory):
```typescript
import { requireAuth } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  
  if (response) return response; // Authentication failed
  
  // Use user.id for queries
  const data = await fetchData(user.id);
  
  return NextResponse.json({ success: true, data });
}
```

**Files to Import From**: `@/lib/supabase-server` (per Infrastructure Inventory)
```

**Transformation Steps**:
1. Replace NextAuth imports → existing auth imports
2. Replace `getServerSession()` → existing auth function
3. Replace `session.user` → existing user object
4. Use exact pattern from Infrastructure Inventory
5. Reference correct import paths

---

### Rule 4: Storage Transformation

**Generic Spec Pattern**:
```markdown
### File Upload

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `uploads/${userId}/${filename}`,
  Body: fileBuffer
}));
```
```

**Transformed Pattern** (example - adapt to actual existing pattern):
```markdown
### File Upload

**Implementation**: Use existing storage system

**Pattern** (from Infrastructure Inventory):
```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

const supabase = await createServerSupabaseClient();

// Upload file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(`${userId}/${filename}`, fileBuffer, {
    contentType: file.type,
    upsert: false
  });

if (error) {
  return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
}

// Store ONLY the storage_path in database (never store URLs)
// Generate signed URLs on-demand when needed
```

**Presigned Download URL Pattern** (from Infrastructure Inventory):
```typescript
// Generate download URL when user requests file
const { data: { signedUrl }, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(storagePath, 3600); // 1 hour expiry
```

**CRITICAL**: Never store signed URLs in database. Store only `storage_path` and generate URLs on-demand.
```

**Transformation Steps**:
1. Replace S3 imports → existing storage imports
2. Replace S3Client → existing storage client
3. Replace AWS bucket names → existing bucket names or new buckets to create
4. Follow existing presigned URL pattern (generate on-demand, never store)
5. Update database schema to store `storage_path` not URLs

---

### Rule 5: API Route Transformation

**Generic Spec Pattern**:
```markdown
### API Route: GET /api/datasets

```typescript
// Generic implementation
export async function GET(request: Request) {
  // Authentication
  // Database query
  // Return response
}
```
```

**Transformed Pattern**:
```markdown
### API Route: GET /api/datasets

**Implementation**: Follow existing API route pattern

**File**: `src/app/api/datasets/route.ts`

**Pattern** (from Infrastructure Inventory):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // 1. Authentication (existing pattern)
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    // 2. Database query (existing pattern)
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    // 3. Response (existing format)
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('GET /api/datasets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Response Format** (from existing codebase):
- Success: `{ success: true, data: T }`
- Error: `{ success: false, error: string, details?: string }`
```

**Transformation Steps**:
1. Use exact file path convention from existing codebase
2. Apply existing auth pattern (requireAuth)
3. Apply existing database client pattern
4. Use existing response format
5. Follow existing error handling pattern
6. Match existing import paths

---

### Rule 6: Component Transformation

**Generic Spec Pattern**:
```markdown
### UI Component

```typescript
import { Button } from '@/components/ui/button';

export function DatasetUploader() {
  return (
    <div>
      <Button>Upload</Button>
    </div>
  );
}
```
```

**Transformed Pattern**:
```markdown
### UI Component

**Implementation**: Use existing component library

**File**: `src/components/datasets/DatasetUploader.tsx`

**Pattern** (from Infrastructure Inventory):
```typescript
'use client'

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function DatasetUploader() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      // Upload logic
      toast({
        title: 'Success',
        description: 'Dataset uploaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleUpload} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Available Components** (from Infrastructure Inventory):
- Use exact import paths from existing component library
- Follow existing component composition patterns
- Use existing hooks (`useToast`, `useAuth`, etc.)
```

**Transformation Steps**:
1. Identify which existing components to use
2. Use exact import paths from Infrastructure Inventory
3. Follow existing component structure and patterns
4. Use existing hooks for state management
5. Match existing styling patterns

---

### Rule 7: State Management Transformation

**Generic Spec Pattern**:
```markdown
### Data Fetching

```typescript
import useSWR from 'swr';

export function useDatasets() {
  const { data, error } = useSWR('/api/datasets', fetcher);
  return { datasets: data, isLoading: !error && !data, error };
}
```
```

**Transformed Pattern** (example - adapt to actual pattern):
```markdown
### Data Fetching

**Implementation**: Use existing state management pattern

**Pattern** (from Infrastructure Inventory):
```typescript
'use client'

import { useQuery } from '@tanstack/react-query';

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await fetch('/api/datasets');
      if (!response.ok) throw new Error('Failed to fetch datasets');
      const result = await response.json();
      return result.data;
    }
  });
}
```

**Usage**:
```typescript
const { data: datasets, isLoading, error } = useDatasets();
```

**Mutations** (from Infrastructure Inventory):
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (datasetData) => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        body: JSON.stringify(datasetData),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to create dataset');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    }
  });
}
```
```

**Transformation Steps**:
1. Replace SWR → existing state management library
2. Follow existing query hook patterns
3. Use existing mutation patterns
4. Follow existing cache invalidation patterns
5. Match existing hook naming conventions

---

### Rule 8: Page Structure Transformation

**Generic Spec Pattern**:
```markdown
### Page: Datasets Manager

```typescript
export default function DatasetsPage() {
  return (
    <div>
      <h1>Datasets</h1>
      {/* Content */}
    </div>
  );
}
```
```

**Transformed Pattern**:
```markdown
### Page: Datasets Manager

**Implementation**: Follow existing page structure

**File**: `src/app/(dashboard)/datasets/page.tsx`

**Pattern** (from Infrastructure Inventory):
```typescript
import { Metadata } from 'next';
import { DatasetsList } from '@/components/datasets/DatasetsList';
import { DatasetUploader } from '@/components/datasets/DatasetUploader';

export const metadata: Metadata = {
  title: 'Datasets | BrightRun',
  description: 'Manage your training datasets'
};

export default function DatasetsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Datasets</h1>
        <p className="text-muted-foreground">
          Manage your training datasets
        </p>
      </div>

      <div className="space-y-6">
        <DatasetUploader />
        <DatasetsList />
      </div>
    </div>
  );
}
```

**Notes**:
- Page automatically protected by `(dashboard)` layout (from Infrastructure Inventory)
- Uses existing container and spacing utilities
- Follows existing metadata pattern
- Composes existing components
```

**Transformation Steps**:
1. Use correct file path for dashboard pages
2. Add metadata following existing pattern
3. Use existing layout wrappers
4. Compose with existing components
5. Follow existing styling conventions

---

## OUTPUT STRUCTURE

### Overall Format

The output integrated extension specification must follow this structure:

```markdown
# [Module Name] - Integrated Extension Specification

**Version:** 1.0  
**Date:** [Date]  
**Source Specification**: [Path to original structured spec]  
**Integration Documents**:
- Infrastructure Inventory: [Path]
- Extension Strategy: [Path]
- Implementation Guide: [Path]

---

## INTEGRATION SUMMARY

### Existing Infrastructure Used

List all existing infrastructure that this module uses:
- **Authentication**: [System name] - [How it's used]
- **Database**: [System name] - [How it's used]
- **Storage**: [System name] - [How it's used]
- **Components**: [Library name] - [What's available]
- **State Management**: [System name] - [Pattern used]

### New Infrastructure Created

List what's being added:
- **Tables**: [List new tables]
- **API Routes**: [List new routes]
- **Pages**: [List new pages]
- **Components**: [List new components]

### Technology Stack (Actual)

Document the ACTUAL technology stack being used (from existing codebase):
- **Framework**: [e.g., Next.js 14 App Router]
- **Database**: [e.g., PostgreSQL via Supabase]
- **Auth**: [e.g., Supabase Auth]
- **Storage**: [e.g., Supabase Storage]
- **UI**: [e.g., shadcn/ui]
- **State**: [e.g., React Query]

---

## SECTION [N]: [Section Name] - INTEGRATED

### Overview

[Copy section overview from original spec - preserve user value and purpose]

### Dependencies

**Existing Infrastructure Prerequisites** (MUST exist before this section):
- [List infrastructure from existing codebase this section uses]

**Previous Section Prerequisites** (MUST be completed first):
- [List what from previous sections this section depends on]

### Features & Requirements

#### FR-[N].[M]: [Feature Name]

**Type**: [Feature type from original spec]

**Purpose**: [User-facing purpose from original spec]

**Business Logic**: [What the feature does - from original spec]

**Implementation** (INTEGRATED):

[This is where transformation happens]

**Database Changes**:

[Transformed database schema using existing patterns]

**API Routes**:

[Transformed API implementation using existing patterns]

**Components**:

[Transformed component implementation using existing patterns]

**State Management**:

[Transformed hooks/queries using existing patterns]

**Acceptance Criteria**:

[Preserved from original spec]

**Testing Requirements**:

[Preserved from original spec, adapted to existing test infrastructure]

---

[Repeat for all features in section]

---

[Repeat for all sections]

---

## APPENDIX: IMPLEMENTATION SEQUENCE

### Recommended Build Order

For each section, follow this sequence:
1. Database migrations
2. Type definitions
3. API routes
4. React hooks
5. Components
6. Pages
7. Navigation updates
8. Testing

### Progressive Dependencies

[Document the progressive build sequence showing dependencies]

```
Section 1 → Section 2 → Section 3 → ...
  ↓           ↓           ↓
P01-DB      P01-DB      P01-DB
  ↓           ↓           ↓
P02-API     P02-API     P02-API
  ↓           ↓           ↓
P03-UI      P03-UI      P03-UI
```
```

---

## TRANSFORMATION PROCESS

### Step 1: Read All Inputs Thoroughly

1. Read entire structured specification - understand ALL features
2. Read entire infrastructure inventory - understand ALL existing patterns
3. Read entire extension strategy - understand ALL integration decisions
4. Read entire implementation guide - understand ALL code examples

### Step 2: Process Section by Section

For each section in the structured spec:

1. **Copy Section Header**: Preserve section number, name, overview
2. **Update Dependencies**: Replace generic dependencies with actual existing infrastructure
3. **Transform Each FR**: Go through every feature requirement and transform it
4. **Preserve Business Logic**: Ensure the WHAT doesn't change, only the HOW

### Step 3: Transform Each Feature Requirement

For each FR-X.Y:

1. **Extract Feature Purpose**: What does this feature do for the user?
2. **Identify Infrastructure Needs**: Auth? Database? Storage? APIs? UI?
3. **Find Existing Patterns**: Look up each infrastructure need in Infrastructure Inventory
4. **Apply Transformation Rules**: Use Rules 1-8 above
5. **Write Integrated FR**: Same feature, using existing infrastructure

### Step 4: Validate Transformation

After transforming all sections:

- ✅ All Prisma references replaced with actual database client
- ✅ All NextAuth references replaced with actual auth system
- ✅ All S3 references replaced with actual storage system
- ✅ All generic imports replaced with actual import paths
- ✅ All code examples use actual existing patterns
- ✅ All API routes follow actual existing template
- ✅ All components use actual existing component library
- ✅ All pages follow actual existing page structure
- ✅ No generic infrastructure references remain
- ✅ Business logic and features preserved exactly

### Step 5: Add Integration Context

At the end of the integrated spec, add:

```markdown
## INTEGRATION NOTES

### Files That Must Exist (From Existing Codebase)

List all files that the new module imports from:
- `@/lib/supabase-server.ts` - Auth and database client
- `@/lib/auth-service.ts` - Client-side auth utilities
- `@/components/ui/*` - Component library
- [etc.]

### Files That Will Be Created (New Module)

List all new files this module adds:
- `supabase/migrations/YYYYMMDD_*.sql` - Database migrations
- `src/app/api/[new-routes]/route.ts` - API routes
- `src/app/(dashboard)/[new-pages]/page.tsx` - Pages
- `src/components/[new-components]/*.tsx` - Components
- [etc.]

### Integration Testing Checklist

- [ ] New tables created successfully
- [ ] RLS policies working correctly
- [ ] API routes authenticate properly
- [ ] Storage buckets configured
- [ ] Pages load within dashboard layout
- [ ] Components render with existing theme
- [ ] State management working with existing patterns
- [ ] End-to-end user flows functional
```

---

## EXAMPLE TRANSFORMATION

### Before (From Structured Spec)

```markdown
## SECTION 2: Dataset Management

### Features & Requirements

#### FR-2.1: Dataset Upload

**Type**: Core Feature

**Purpose**: Allow users to upload conversation datasets for training

**Implementation**:

```typescript
// Generic implementation
import { S3Client } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';

const s3 = new S3Client({ region: 'us-east-1' });

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: 'datasets',
    Key: `${session.user.id}/dataset.json`,
    Body: file
  }));
}
```

**Database**:
```prisma
model Dataset {
  id        String   @id @default(cuid())
  userId    String
  name      String
  s3Key     String
  createdAt DateTime @default(now())
}
```
```

### After (Integrated Extension Spec)

```markdown
## SECTION 2: Dataset Management - INTEGRATED

### Overview

[Same as original]

### Dependencies

**Existing Infrastructure Prerequisites**:
- Supabase Auth (for user identification)
- Supabase Storage (for file uploads)
- Supabase PostgreSQL (for metadata storage)
- shadcn/ui components (for UI)

**Previous Section Prerequisites**:
- Section 1: User authentication system operational

### Features & Requirements

#### FR-2.1: Dataset Upload

**Type**: Core Feature

**Purpose**: Allow users to upload conversation datasets for training

**Business Logic**: Users select a file, it uploads to storage, metadata is saved to database, validation occurs, and user sees upload status.

**Implementation** (INTEGRATED):

**Database Changes**:

**Migration File**: `supabase/migrations/20241223_create_datasets.sql`

```sql
-- Create datasets table following existing RLS patterns
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'lora-datasets',
  storage_path TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (following existing pattern)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
```

**API Routes**:

**File**: `src/app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  // 1. Authentication (existing pattern from Infrastructure Inventory)
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 2. Upload to Supabase Storage (existing pattern)
    const supabase = await createServerSupabaseClient();
    const storagePath = `${user.id}/${crypto.randomUUID()}/${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lora-datasets')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      );
    }

    // 3. Save metadata to database (existing pattern)
    const { data: dataset, error: dbError } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        name: file.name,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      );
    }

    // 4. Response (existing format from Infrastructure Inventory)
    return NextResponse.json({ success: true, data: dataset });

  } catch (error) {
    console.error('POST /api/datasets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Components**:

**File**: `src/components/datasets/DatasetUploader.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useCreateDataset } from '@/hooks/use-datasets';

export function DatasetUploader() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const createDataset = useCreateDataset();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      await createDataset.mutateAsync(formData);
      
      toast({
        title: 'Success',
        description: 'Dataset uploaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Upload failed',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          accept=".json,.jsonl"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </CardContent>
    </Card>
  );
}
```

**State Management**:

**File**: `src/hooks/use-datasets.ts`

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    }
  });
}
```

**Acceptance Criteria**:
[Same as original spec - no changes needed]

**Testing Requirements**:
[Same as original spec - no changes needed]
```

---

## EXECUTION INSTRUCTIONS

### Prerequisites

Before running this meta-prompt:
1. ✅ Structured specification exists (follows progressive spec format)
2. ✅ Infrastructure Inventory completed (documents existing codebase)
3. ✅ Extension Strategy completed (maps features to infrastructure)
4. ✅ Implementation Guide completed (provides code examples)

### Running the Transformation

1. **Load all 4 input documents into context**
2. **Read them thoroughly** - spend time understanding the existing codebase
3. **Start with Section 1** of the structured spec
4. **For each section**:
   - Copy section header and overview
   - Update dependencies to reference actual existing infrastructure
   - Transform each FR using the transformation rules
   - Preserve business logic and feature requirements
   - Update all code examples to use existing patterns
5. **Validate the transformation** - check that no generic infrastructure remains
6. **Add integration notes** - document what exists vs. what's new

### Quality Checklist

Before considering the integrated spec complete:

- [ ] Every section from original spec is present
- [ ] Every FR from original spec is present
- [ ] All Prisma/ORM references replaced with actual database client
- [ ] All auth references (NextAuth, etc.) replaced with actual auth system
- [ ] All storage references (S3, etc.) replaced with actual storage system
- [ ] All component references use actual component library
- [ ] All import paths are correct for the actual codebase
- [ ] All API routes follow actual existing template
- [ ] All database schemas use actual migration format
- [ ] All business logic preserved from original spec
- [ ] All acceptance criteria preserved from original spec
- [ ] Dependencies correctly reference existing infrastructure
- [ ] Integration notes added at the end

---

## VERSION HISTORY

**v1.0** (December 23, 2025)
- Initial version
- Product and module agnostic
- Supports progressive structured specification format
- Comprehensive transformation rules for all infrastructure types

---

**End of Meta-Prompt**

