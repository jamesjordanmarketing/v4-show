# Module Extension Blueprint Meta-Prompt

**Version:** 2.0
**Purpose:** Generate extension documentation for adding a new module to an existing production codebase
**Input:** Structured specification (feature requirements) + Existing codebase directory
**Output:** Three extension documents (Infrastructure Inventory, Extension Strategy, Implementation Guide)

---

## CRITICAL FRAMING: EXTENSION, NOT INTEGRATION

**READ THIS FIRST - THIS DEFINES THE ENTIRE APPROACH**

You are NOT comparing two independent applications for compatibility.
You are NOT looking for "mismatches" or "incompatibilities" between tech stacks.
You are NOT recommending building a separate application.

**You ARE:**
- Analyzing an existing production codebase to understand what infrastructure it provides
- Reading a structured specification to understand what FEATURES need to be built
- Determining how to ADD these new features as a MODULE that sits alongside existing code
- Using the EXISTING infrastructure (auth, database, storage, components) for ALL new features
- Specifying exactly what to CREATE NEW (tables, APIs, pages, components) using existing patterns

**The Goal:**
> Build the new module as an extension that sits alongside existing code, with direct access to existing objects, artifacts, and interfaces, functioning holistically as part of the same application.

**Key Mindset Shift:**
- The structured spec describes FEATURES (what to build)
- The structured spec's infrastructure choices (Prisma, NextAuth, S3, etc.) are IRRELEVANT
- Your job is to implement the spec's FEATURES using the EXISTING codebase's infrastructure
- The core technologies of the existing codebase are to be built on top of. They always take priority over the structured spec, unless the structured spec has some functionality that cannot be achieved using the current technologies in the existing codebase

**NEVER recommend building separately.** The new module WILL be added to the existing codebase.

---

## INPUT FILES

### Input 1: Structured Specification (Feature Requirements)
**File Path**: `{{STRUCTURED_SPEC_PATH}}`

This file describes FEATURES to be built. It may reference specific technologies (Prisma, NextAuth, etc.) but those are examples, not requirements. Your job is to extract the FEATURE REQUIREMENTS and implement them using the existing codebase's infrastructure.

**How to Read the Spec:**
- **Extract WHAT to build** (data models, APIs, UI pages, workflows)
- **Ignore HOW it's built** (ignore Prisma syntax, NextAuth setup, etc.)
- **Focus on business logic** (what the user does, what data is stored, what APIs are needed)

### Input 2: Existing Production Codebase
**Directory Path**: `{{CODEBASE_PATH}}`

This is your implementation target. The new module WILL be added here. Everything you specify must use this codebase's patterns, conventions, and infrastructure.

### Output Destination
**Directory Path**: `{{OUTPUT_PATH}}`

You will create three markdown documents:
1. `04d-infrastructure-inventory_v1.md` - What exists in the codebase for you to USE
2. `04d-extension-strategy_v1.md` - How the new module uses existing infrastructure
3. `04d-implementation-guide_v1.md` - Exactly what to add (new tables, APIs, pages, components)

---

## CORE PRINCIPLES

1. **Extension-First**: The new module extends the existing app, it does not compete with it
2. **Use Existing Infrastructure**: Authentication, database client, storage, and components already exist - USE them
3. **Pattern Consistency**: All new code matches existing patterns exactly (naming, structure, style)
4. **Additive Only**: Only CREATE NEW what doesn't exist (new tables, new APIs, new pages)
5. **Zero Breaking Changes**: Existing features continue working unchanged
6. **Feature Focus**: Extract features from spec, ignore spec's infrastructure choices

---

## PHASE 1: INFRASTRUCTURE INVENTORY

**Goal**: Document what EXISTS in the codebase that the new module will USE.

**Critical Mindset**: This is NOT a comparison. This is an inventory of available tools and patterns. Everything you find here is what the new module WILL use.

### Step 1.1: Authentication Infrastructure

**Questions to Answer:**
- What authentication system is in place?
- How are users identified and sessions managed?
- What patterns are used to protect API routes?
- What patterns are used to protect pages?

**Output Format:**
```markdown
### Authentication Available for New Module

**System**: [Supabase Auth / NextAuth / Custom / etc.]
**Version**: [Package version]

**User Object Available**:
```typescript
// Show the actual user object structure new module will receive
interface User {
  id: string;
  email: string;
  // ... all available fields
}
```

**API Route Protection Pattern (USE THIS):**
```typescript
// Show exact pattern from codebase that new module will copy
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user; // Error response

  // user is now available - new module uses this exact pattern
}
```

**Page Protection Pattern (USE THIS):**
```typescript
// Show exact pattern for protecting pages
```

**Files to Import From:**
- `/lib/auth.ts` or equivalent - [What functions are available]
- `/middleware.ts` - [What protection is already configured]

**INSTRUCTION FOR NEW MODULE**: Use the patterns shown above. Do NOT create new authentication.
```

---

### Step 1.2: Database Infrastructure

**Questions to Answer:**
- What database client is used?
- How are queries structured?
- How are types generated?
- What existing tables might relate to new features?

**Output Format:**
```markdown
### Database Available for New Module

**Client**: [Supabase Client / Prisma / Drizzle / etc.]
**Database**: [PostgreSQL / MySQL / etc.]
**Version**: [Package version]

**Database Client Pattern (USE THIS):**
```typescript
// Show exact pattern from codebase
import { createServerSupabaseClient } from '@/lib/supabase-server';
// OR
import { db } from '@/lib/db';

// Show actual query pattern
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
```

**Type Definition Pattern:**
```typescript
// Show how types are defined/generated in codebase
// New module follows same pattern
```

**Existing Tables That May Be Referenced:**
| Table | Purpose | Key Fields | Relationship to New Features |
|-------|---------|------------|------------------------------|
| users | User accounts | id, email | New module references user_id |
| [other relevant tables] | [Purpose] | [Fields] | [Relationship] |

**Migration Pattern:**
- Location: [Where migrations live]
- How to create: [Command or process]
- Naming convention: [Pattern]

**Files to Import From:**
- `/lib/supabase-client.ts` or equivalent - Client-side database access
- `/lib/supabase-server.ts` or equivalent - Server-side database access
- `/lib/types/` - Type definitions to extend

**INSTRUCTION FOR NEW MODULE**: Create new tables using same migration pattern. Use same client for queries.
```

---

### Step 1.3: Storage Infrastructure

**Questions to Answer:**
- What file storage system is used?
- How are uploads handled?
- How are downloads/signed URLs generated?
- What existing buckets exist?

**Output Format:**
```markdown
### Storage Available for New Module

**Provider**: [Supabase Storage / S3 / R2 / etc.]
**Configuration Location**: [File path]

**Upload Pattern (USE THIS):**
```typescript
// Show exact upload pattern from codebase
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(path, file, options);
```

**Download/Signed URL Pattern (USE THIS):**
```typescript
// Show exact pattern
const { data } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(path, expirySeconds);
```

**Existing Buckets:**
| Bucket | Purpose | Can New Module Use? |
|--------|---------|---------------------|
| [bucket-name] | [Purpose] | [Yes/No/Create new] |

**Files to Import From:**
- [Relevant storage utility files]

**INSTRUCTION FOR NEW MODULE**: Use same storage client. Create new bucket if needed.
```

---

### Step 1.4: API Architecture

**Questions to Answer:**
- What API patterns are established?
- What response formats are used?
- What validation approach is used?
- What existing endpoints exist?

**Output Format:**
```markdown
### API Patterns for New Module

**Location**: `/app/api/` (App Router) or `/pages/api/` (Pages Router)

**Standard Response Format (USE THIS):**
```typescript
// Show exact success response format
{
  success: true,
  data: T,
  meta?: { /* pagination, etc */ }
}

// Show exact error response format
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

**Validation Pattern (USE THIS):**
```typescript
// Show how validation is done (Zod, Yup, etc.)
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  // ...
});
```

**API Route Template (USE THIS):**
```typescript
// Show a complete API route example that new module will copy
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    // Query database
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
```

**Existing API Namespaces:**
- `/api/conversations/*` - [Purpose]
- `/api/templates/*` - [Purpose]
- [List all existing API namespaces]

**Available Namespaces for New Module:**
- `/api/datasets/*` - Available (no conflict)
- `/api/training/*` - Available (no conflict)
- `/api/models/*` - Available (no conflict)

**INSTRUCTION FOR NEW MODULE**: Create new API routes following exact patterns above.
```

---

### Step 1.5: Component Library

**Questions to Answer:**
- What UI component library is used?
- What components are available?
- What styling patterns are used?
- What layout components exist?

**Output Format:**
```markdown
### Components Available for New Module

**UI Library**: [shadcn/ui / Material-UI / Chakra / etc.]
**Styling**: [Tailwind / CSS Modules / styled-components]
**Icons**: [Lucide / HeroIcons / etc.]

**Available UI Components (REUSE THESE):**
| Component | Location | Purpose |
|-----------|----------|---------|
| Button | `/components/ui/button.tsx` | Primary action buttons |
| Card | `/components/ui/card.tsx` | Content containers |
| Dialog | `/components/ui/dialog.tsx` | Modals |
| [List all UI components] | | |

**Layout Components (EXTEND THESE):**
| Component | Location | Purpose | Extension Needed |
|-----------|----------|---------|------------------|
| DashboardLayout | `/app/(dashboard)/layout.tsx` | Dashboard wrapper | Add new nav items |
| Sidebar | `/components/sidebar.tsx` | Navigation | Add new sections |

**Component Pattern (USE THIS):**
```typescript
// Show typical component structure from codebase
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  // Props
}

export function ComponentName({ ... }: ComponentProps) {
  return (
    // JSX using UI components
  );
}
```

**INSTRUCTION FOR NEW MODULE**: Reuse all UI components. Create feature-specific components following same pattern.
```

---

### Step 1.6: State Management & Data Fetching

**Questions to Answer:**
- What state management is used?
- What data fetching pattern is used?
- What caching strategy is in place?

**Output Format:**
```markdown
### State & Data Fetching for New Module

**Global State**: [Zustand / Redux / Context / etc.]
**Data Fetching**: [React Query / SWR / Native fetch]

**Data Fetching Pattern (USE THIS):**
```typescript
// Show exact pattern
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => fetch('/api/datasets').then(r => r.json()),
  });
}
```

**Mutation Pattern (USE THIS):**
```typescript
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => fetch('/api/datasets', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
```

**INSTRUCTION FOR NEW MODULE**: Create hooks following same pattern for new data.
```

---

### Step 1.7: Utilities & Helpers

**Questions to Answer:**
- What utility functions exist?
- What custom hooks are available?
- What type definitions exist?

**Output Format:**
```markdown
### Utilities Available for New Module

**Utility Functions (USE THESE):**
| Function | Location | Purpose |
|----------|----------|---------|
| cn() | `/lib/utils.ts` | Merge Tailwind classes |
| formatDate() | `/lib/utils.ts` | Date formatting |
| [List all utilities] | | |

**Custom Hooks (USE THESE):**
| Hook | Location | Purpose |
|------|----------|---------|
| useDebounce | `/hooks/use-debounce.ts` | Debounce values |
| [List all hooks] | | |

**Type Definition Location:**
- `/lib/types/` - Add new types here for new module

**INSTRUCTION FOR NEW MODULE**: Import and use existing utilities. Add new utilities following same patterns.
```

---

### Step 1.8: Testing Infrastructure

**Output Format:**
```markdown
### Testing for New Module

**Framework**: [Jest / Vitest / etc.]
**Component Testing**: [React Testing Library / etc.]
**E2E**: [Playwright / Cypress / None]

**Test Location Pattern**: [__tests__/ / *.test.ts / etc.]

**Test Pattern (USE THIS):**
```typescript
// Show example test structure
describe('Feature', () => {
  it('should work', () => {
    // Test
  });
});
```

**INSTRUCTION FOR NEW MODULE**: Add tests following same patterns in same locations.
```

---

### Step 1.9: Environment Variables

**Output Format:**
```markdown
### Environment for New Module

**Existing Variables (ALREADY AVAILABLE):**
- `NEXT_PUBLIC_SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access
- [List all relevant existing variables]

**New Variables Needed:**
Based on spec features, new module may need:
- `GPU_CLUSTER_API_URL` - For training job submission
- `GPU_CLUSTER_API_KEY` - Authentication for GPU cluster
- [List any new external services needed]

**Configuration Location**: `.env.local`

**INSTRUCTION FOR NEW MODULE**: Use existing variables. Add new ones only for new external services.
```

---

## PHASE 2: EXTENSION STRATEGY

**Goal**: Define exactly how the new module uses each piece of existing infrastructure.

**Critical Mindset**: Every decision is "how does new module USE this" not "does this match the spec".

### Step 2.1: Feature Extraction from Spec

**Read the structured spec and extract FEATURES only:**

```markdown
### Features to Implement

**From Spec Section 1: [Section Name]**
| Feature ID | Feature Description | Data Needed | APIs Needed | UI Pages Needed |
|------------|---------------------|-------------|-------------|-----------------|
| F1.1 | [Feature description] | [Data entities] | [API endpoints] | [Pages] |
| F1.2 | [Feature description] | [Data entities] | [API endpoints] | [Pages] |

**From Spec Section 2: [Section Name]**
[Repeat for each section]

**IGNORE from Spec:**
- Infrastructure setup (Prisma, NextAuth, S3, BullMQ, Redis)
- Package installation instructions
- Configuration files for tools we're not using
- Example code using different tech stack
```

---

### Step 2.2: Infrastructure Mapping

For each existing infrastructure component, define how new features use it:

```markdown
### How New Module Uses Existing Infrastructure

#### Authentication
**Existing**: [Supabase Auth]
**New Module Uses It For**: All API authentication, user identification, session management
**No Changes Needed**: Use existing `requireAuth()` pattern in all new API routes

#### Database
**Existing**: [Supabase Client with PostgreSQL]
**New Module Uses It For**: All new tables (datasets, training_jobs, etc.)
**New Tables to Add**:
| Table | Purpose | Fields Summary |
|-------|---------|----------------|
| datasets | Store uploaded training datasets | id, user_id, name, status, storage_path, ... |
| training_jobs | Track training job status | id, user_id, dataset_id, status, config, ... |
| [more tables] | | |

#### Storage
**Existing**: [Supabase Storage]
**New Module Uses It For**: Dataset file uploads, model artifact downloads
**New Buckets to Create**:
- `datasets` - For uploaded training data files
- `model-artifacts` - For trained model files

#### API Routes
**Existing**: REST API pattern with specific response format
**New Module Uses It For**: All new endpoints
**New Endpoints to Create**:
- POST `/api/datasets` - Upload new dataset
- GET `/api/datasets` - List user's datasets
- POST `/api/training/jobs` - Start training job
- GET `/api/training/jobs/[id]/status` - Get job status
- [more endpoints]

#### Components
**Existing**: shadcn/ui + custom components
**New Module Uses It For**: All UI
**Components to Reuse**: Button, Card, Dialog, Table, Progress, Badge, etc.
**New Components to Create**:
- `DatasetCard` - Display dataset info
- `TrainingConfigForm` - Configure training
- `JobMonitor` - Real-time job status
- [more components]

#### State/Data Fetching
**Existing**: [React Query]
**New Module Uses It For**: All data fetching for new features
**New Hooks to Create**:
- `useDatasets()` - Fetch datasets
- `useTrainingJob(id)` - Fetch job status
- `useCreateDataset()` - Create dataset mutation
- [more hooks]
```

---

### Step 2.3: Page Structure

Define new pages that will be added:

```markdown
### New Pages to Add

**Route Group**: `(dashboard)` (protected routes)

**New Routes:**
```
/datasets                → Datasets list page
/datasets/[id]           → Dataset detail page
/datasets/new            → New dataset upload page
/training                → Training jobs list
/training/configure      → Configure new training job
/training/jobs/[id]      → Job monitor page
/models                  → Trained models list
/models/[id]             → Model detail/download page
```

**Navigation Updates:**
- Add "Datasets" to sidebar navigation
- Add "Training" to sidebar navigation
- Add "Models" to sidebar navigation

**Layout:**
- All pages use existing `DashboardLayout`
- No new layouts needed
```

---

## PHASE 3: IMPLEMENTATION GUIDE

**Goal**: Provide exact, copy-pasteable instructions for what to create.

### Step 3.1: Database Additions

```markdown
### New Database Tables

**Migration File**: `supabase/migrations/YYYYMMDD_add_lora_training_tables.sql`

```sql
-- ============================================
-- DATASETS TABLE
-- ============================================
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'uploading',
  -- status: uploading → validating → ready → error

  -- Storage (using existing Supabase Storage)
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,

  -- Validation results
  total_training_pairs INTEGER,
  total_tokens BIGINT,
  validation_errors JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (following existing pattern)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);

-- ============================================
-- TRAINING_JOBS TABLE
-- ============================================
CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

  -- Configuration
  model_name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL, -- hyperparameters

  -- Status
  status VARCHAR(50) DEFAULT 'queued',
  -- status: queued → preparing → training → completed → failed
  progress DECIMAL(5,2) DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER,

  -- Results
  output_path TEXT,
  error_message TEXT,

  -- Costs
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON training_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON training_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- [Additional tables as needed: metrics_points, model_artifacts, etc.]
```

**Run Migration:**
```bash
# If using Supabase CLI
supabase migration new add_lora_training_tables
# Copy SQL above into the generated file
supabase db push
```
```

---

### Step 3.2: API Routes to Create

For each new API route, provide complete implementation:

```markdown
### API Route: POST /api/datasets

**File**: `app/api/datasets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const createDatasetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fileName: z.string(),
  fileSize: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Authentication (using existing pattern)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const parsed = createDatasetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { name, description, fileName, fileSize } = parsed.data;

    // Generate storage path
    const datasetId = crypto.randomUUID();
    const storagePath = `${user.id}/${datasetId}/${fileName}`;

    // Create dataset record
    const { data: dataset, error } = await supabase
      .from('datasets')
      .insert({
        id: datasetId,
        user_id: user.id,
        name,
        description,
        file_name: fileName,
        file_size: fileSize,
        storage_path: storagePath,
        status: 'uploading',
      })
      .select()
      .single();

    if (error) {
      console.error('Dataset creation error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to create dataset' } },
        { status: 500 }
      );
    }

    // Generate signed upload URL (using existing Supabase Storage)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('datasets')
      .createSignedUploadUrl(storagePath);

    if (uploadError) {
      // Rollback dataset creation
      await supabase.from('datasets').delete().eq('id', datasetId);
      return NextResponse.json(
        { success: false, error: { code: 'STORAGE_ERROR', message: 'Failed to generate upload URL' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dataset,
        uploadUrl: uploadData.signedUrl,
        uploadToken: uploadData.token,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Query datasets
    const { data: datasets, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { datasets, total: datasets.length }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

[Repeat for each API route: GET /api/datasets/[id], POST /api/training/jobs, etc.]
```

---

### Step 3.3: Type Definitions to Add

```markdown
### Type Definitions

**File**: `lib/types/lora-training.ts`

```typescript
// Dataset types
export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: DatasetStatus;
  storage_path: string;
  file_name: string;
  file_size: number;
  total_training_pairs?: number;
  total_tokens?: number;
  validation_errors?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatasetCreateInput {
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
}

// Training job types
export type TrainingJobStatus = 'queued' | 'preparing' | 'training' | 'completed' | 'failed';

export interface TrainingConfig {
  baseModel: string;
  learningRate: number;
  epochs: number;
  batchSize: number;
  loraRank: number;
  loraAlpha: number;
  // ... other hyperparameters
}

export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  model_name: string;
  config: TrainingConfig;
  status: TrainingJobStatus;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  output_path?: string;
  error_message?: string;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// API response types (following existing pattern)
export interface DatasetListResponse {
  success: true;
  data: {
    datasets: Dataset[];
    total: number;
  };
}

export interface DatasetCreateResponse {
  success: true;
  data: {
    dataset: Dataset;
    uploadUrl: string;
    uploadToken: string;
  };
}
```
```

---

### Step 3.4: React Hooks to Create

```markdown
### Data Fetching Hooks

**File**: `hooks/use-datasets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dataset, DatasetCreateInput, DatasetListResponse, DatasetCreateResponse } from '@/lib/types/lora-training';

// Fetch all datasets
export function useDatasets() {
  return useQuery<DatasetListResponse>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await fetch('/api/datasets');
      if (!response.ok) throw new Error('Failed to fetch datasets');
      return response.json();
    },
  });
}

// Fetch single dataset
export function useDataset(id: string) {
  return useQuery<{ success: true; data: Dataset }>({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      return response.json();
    },
    enabled: !!id,
  });
}

// Create dataset
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation<DatasetCreateResponse, Error, DatasetCreateInput>({
    mutationFn: async (data) => {
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

// Delete dataset
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete dataset');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
```

**File**: `hooks/use-training-jobs.ts`
[Similar pattern for training jobs]
```

---

### Step 3.5: Components to Create

```markdown
### Feature Components

**File**: `components/datasets/DatasetCard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { Dataset } from '@/lib/types/lora-training';

interface DatasetCardProps {
  dataset: Dataset;
  onSelect?: (dataset: Dataset) => void;
  onDelete?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  uploading: 'bg-yellow-100 text-yellow-800',
  validating: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

export function DatasetCard({ dataset, onSelect, onDelete }: DatasetCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(dataset)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{dataset.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <Badge className={statusColors[dataset.status] || 'bg-gray-100'}>
            {dataset.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {dataset.total_training_pairs && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Training pairs:</span>
              <span className="font-medium">{dataset.total_training_pairs.toLocaleString()}</span>
            </div>
          )}
          {dataset.total_tokens && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total tokens:</span>
              <span className="font-medium">{dataset.total_tokens.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">File size:</span>
            <span className="font-medium">{(dataset.file_size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>
        {onDelete && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(dataset.id); }}
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

[Continue with other components: DatasetUploadForm, TrainingConfigForm, JobMonitor, etc.]
```

---

### Step 3.6: Pages to Create

```markdown
### Page: Datasets List

**File**: `app/(dashboard)/datasets/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets';
import { DatasetCard } from '@/components/datasets/DatasetCard';
import { DatasetUploadDialog } from '@/components/datasets/DatasetUploadDialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import type { Dataset } from '@/lib/types/lora-training';

export default function DatasetsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data, isLoading, error } = useDatasets();
  const deleteDataset = useDeleteDataset();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        Error loading datasets. Please try again.
      </div>
    );
  }

  const datasets = data?.data?.datasets ?? [];

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage your training datasets for LoRA fine-tuning
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Dataset
        </Button>
      </div>

      {datasets.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground mb-4">No datasets yet</p>
          <Button onClick={() => setUploadDialogOpen(true)}>
            Upload your first dataset
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset: Dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onDelete={(id) => deleteDataset.mutate(id)}
            />
          ))}
        </div>
      )}

      <DatasetUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
```

[Continue with other pages: /datasets/[id], /training, /training/configure, etc.]
```

---

### Step 3.7: Navigation Updates

```markdown
### Navigation Integration

**File to Modify**: `components/sidebar.tsx` (or equivalent)

Add new navigation items:

```typescript
const navItems = [
  // Existing items
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Training Files', href: '/training-files', icon: FileJson },

  // NEW: LoRA Training Module
  { type: 'separator', label: 'LoRA Training' },
  { name: 'Datasets', href: '/datasets', icon: Database },
  { name: 'Training Jobs', href: '/training', icon: Cpu },
  { name: 'Trained Models', href: '/models', icon: Package },
];
```
```

---

## OUTPUT DOCUMENT 1: INFRASTRUCTURE INVENTORY

**File**: `04d-infrastructure-inventory_v1.md`

**Structure**:
```markdown
# Infrastructure Inventory - [Module Name]

**Date**: [Date]
**Codebase**: [Path]
**Purpose**: Document existing infrastructure that new module will USE

---

## Summary

This document inventories the existing codebase infrastructure available for the new [Module Name] to use. All new features will be implemented using this existing infrastructure.

**Available Infrastructure**:
- Authentication: [System] - Ready to use
- Database: [Client] - Ready to use
- Storage: [Provider] - Ready to use
- Components: [Library] - Ready to use
- [etc.]

---

## 1. Authentication Infrastructure
[Output from Step 1.1]

## 2. Database Infrastructure
[Output from Step 1.2]

## 3. Storage Infrastructure
[Output from Step 1.3]

## 4. API Patterns
[Output from Step 1.4]

## 5. Component Library
[Output from Step 1.5]

## 6. State & Data Fetching
[Output from Step 1.6]

## 7. Utilities
[Output from Step 1.7]

## 8. Testing
[Output from Step 1.8]

## 9. Environment
[Output from Step 1.9]

---

## Usage Checklist

Before implementing new features, verify:
- [ ] I understand the authentication pattern to use
- [ ] I understand the database query pattern to use
- [ ] I understand the API response format to use
- [ ] I understand the component patterns to follow
- [ ] I know where to add new types
- [ ] I know where to add new migrations
```

---

## OUTPUT DOCUMENT 2: EXTENSION STRATEGY

**File**: `04d-extension-strategy_v1.md`

**Structure**:
```markdown
# Extension Strategy - [Module Name]

**Date**: [Date]
**Structured Spec**: [Reference]
**Infrastructure Inventory**: [Reference]

---

## Summary

This document defines how the new [Module Name] extends the existing application by using existing infrastructure.

**Approach**: EXTENSION (using existing infrastructure)

**Key Decisions**:
1. Use existing [Auth System] for all authentication
2. Use existing [DB Client] for all database operations
3. Use existing [Storage] for all file operations
4. Use existing [Component Library] for all UI
5. Only CREATE NEW: [tables, APIs, pages, components specific to new features]

---

## Features from Spec
[Output from Step 2.1]

## Infrastructure Mapping
[Output from Step 2.2]

## Page Structure
[Output from Step 2.3]

---

## What to Create

### New Database Tables
- datasets
- training_jobs
- [etc.]

### New API Routes
- POST /api/datasets
- GET /api/datasets
- [etc.]

### New Pages
- /datasets
- /training
- [etc.]

### New Components
- DatasetCard
- TrainingConfigForm
- [etc.]

---

## What NOT to Create

- ❌ New authentication system
- ❌ New database client
- ❌ New storage client
- ❌ New UI component library
- ❌ Anything that already exists
```

---

## OUTPUT DOCUMENT 3: IMPLEMENTATION GUIDE

**File**: `04d-implementation-guide_v1.md`

**Structure**:
```markdown
# Implementation Guide - [Module Name]

**Date**: [Date]
**Structured Spec**: [Reference]
**Extension Strategy**: [Reference]

---

## Purpose

This document provides exact implementation instructions for adding [Module Name] to the existing codebase. Follow sections in order.

---

## Phase 1: Database Setup
[Output from Step 3.1 - Complete SQL migrations]

## Phase 2: Type Definitions
[Output from Step 3.3 - Complete TypeScript types]

## Phase 3: API Routes
[Output from Step 3.2 - Complete API implementations]

## Phase 4: React Hooks
[Output from Step 3.4 - Complete hook implementations]

## Phase 5: Components
[Output from Step 3.5 - Complete component implementations]

## Phase 6: Pages
[Output from Step 3.6 - Complete page implementations]

## Phase 7: Navigation
[Output from Step 3.7 - Navigation updates]

---

## Implementation Checklist

### Database
- [ ] Created migration file
- [ ] Ran migration
- [ ] Verified tables exist
- [ ] RLS policies working

### API
- [ ] Created all API routes
- [ ] Authentication working
- [ ] Validation working
- [ ] Error handling consistent

### Frontend
- [ ] Created types
- [ ] Created hooks
- [ ] Created components
- [ ] Created pages
- [ ] Updated navigation

### Testing
- [ ] Added tests for new APIs
- [ ] Added tests for new components
- [ ] All existing tests still pass

### Validation
- [ ] New features work as specified
- [ ] Existing features unaffected
- [ ] No console errors
- [ ] Performance acceptable
```

---

## QUALITY CHECKLIST

Before finalizing your three documents:

### Infrastructure Inventory
- [ ] Each section shows exact patterns TO USE (not just describe)
- [ ] Code examples are from actual codebase (not generic)
- [ ] Clear instructions: "USE THIS" for each pattern
- [ ] File paths are specific and accurate

### Extension Strategy
- [ ] Features extracted from spec (ignoring spec's infrastructure)
- [ ] Each infrastructure mapping shows "new module uses X for Y"
- [ ] Clear list of what to CREATE NEW
- [ ] Clear list of what NOT to create

### Implementation Guide
- [ ] SQL migrations are complete and copy-pasteable
- [ ] API routes are complete implementations
- [ ] Components are complete implementations
- [ ] All code follows patterns from Infrastructure Inventory
- [ ] Developer can follow step-by-step

### Overall
- [ ] No recommendation to "build separately" - module IS being added
- [ ] All new code uses existing infrastructure
- [ ] Framing is "extension" not "integration"
- [ ] Language throughout: "add", "extend", "use existing"

---

## REMEMBER

**You are NOT comparing two applications.**
**You are documenting how to ADD features to an existing application.**

The structured spec describes WHAT to build (features).
The existing codebase provides HOW to build it (infrastructure).
Your job is to map features to infrastructure and provide implementation instructions.

**The new module WILL be added. There is no alternative recommendation.**

Begin your analysis now.

---

**Meta-Prompt Version**: 2.0
**Date**: December 23, 2025
**Status**: Ready for Generator Script
**Key Change from v1**: Extension-first framing instead of integration-comparison framing
