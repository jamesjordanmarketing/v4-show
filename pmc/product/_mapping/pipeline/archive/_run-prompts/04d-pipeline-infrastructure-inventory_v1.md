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

