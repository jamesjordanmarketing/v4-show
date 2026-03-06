# 08 — UX Containers Implementation Specification v1

**Date:** February 27, 2026
**Source Requirements:** `pmc/product/_mapping/ux-3/07-internal-ux-decisions_v4.md`
**Target Codebase:** `src/` (Next.js 14 App Router)
**Estimated Scope:** 13–18 days across 5 phases

---

## 1. Background & Context for Implementing Agent

### 1.1 What Is BrightRun?

BrightRun is a Next.js 14 App Router application (TypeScript, Tailwind CSS, shadcn/UI) with two product paths:

| Path | User-Facing Name | Flow |
|------|-------------------|------|
| **LoRA Training** | "Fine Tuning" | Generate Conversations → Auto-Enrich → Aggregate Training Set → Train LoRA Adapter → Auto-Deploy to HF + RunPod → Worker Refresh → A/B Chat |
| **RAG Frontier** | "Fact Training" | Upload Document → 6-Pass Inngest Ingestion → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector) |
| Storage | Supabase Storage bucket `lora-models` |
| UI | shadcn/UI + Tailwind CSS + Radix UI primitives |
| State | React Query v5 (TanStack Query) + Zustand (2 stores) |
| Background Jobs | Inngest (4 registered functions) |
| Deployment | Vercel (frontend + API routes) |
| Inference | RunPod (dual mode: pods/serverless via `INFERENCE_MODE` env var) |
| DB Operations | **SAOL (mandatory for all agent terminal/script DB ops)** — `supa-agent-ops/` |

### 1.3 What This Spec Implements

This spec replaces the current flat module-card navigation with a **Work Base architecture** — a single organizing entity that owns conversations, documents, adapters, and chat. It covers:

1. **Database schema changes** — new `workbases` table, new `conversation_comments` table, FK migrations on 8 existing tables
2. **New route structure** — all pages under `/workbase/[id]/` with persistent sidebar navigation
3. **Page consolidation** — current 12+ pages collapse to 8 pages + 1 home
4. **New Inngest functions** — `refreshInferenceWorkers` (D11), `autoEnrichConversation` (D8)
5. **Modified Inngest function** — `autoDeployAdapter` gains worker-refresh event emission
6. **UI fixes** — modal backgrounds (D10)
7. **Test script** — `scripts/test-worker-refresh.ts` for RunPod worker cycling validation

### 1.4 Current Codebase Structure (Pre-Implementation)

```
src/
├── app/
│   ├── (auth)/signin/, signup/              # Auth pages (KEEP)
│   ├── (dashboard)/
│   │   ├── layout.tsx                       # Auth guard layout (MODIFY)
│   │   ├── dashboard/page.tsx               # Module card grid (REPLACE with /home)
│   │   ├── conversations/page.tsx           # Conversation library (MOVE)
│   │   ├── datasets/page.tsx                # Dataset management (ABSORB)
│   │   ├── training-files/                  # Training file export (ABSORB)
│   │   ├── batch-jobs/                      # Batch monitoring (ABSORB)
│   │   ├── pipeline/
│   │   │   ├── configure/page.tsx           # Training config (ABSORB into Launch Tuning)
│   │   │   └── jobs/page.tsx                # Job list (ABSORB into Launch Tuning)
│   │   │       └── [jobId]/
│   │   │           ├── page.tsx             # Job detail (ABSORB)
│   │   │           ├── chat/               # Multi-turn A/B chat (MOVE to Behavior Chat)
│   │   │           ├── test/               # Adapter testing (ABSORB)
│   │   │           └── results/            # Training results (ABSORB)
│   │   ├── rag/
│   │   │   ├── page.tsx                     # KB selection + doc management (REPLACE)
│   │   │   ├── [id]/page.tsx               # Document detail (MOVE)
│   │   │   └── [id]/quality/              # Quality dashboard (MOVE)
│   │   └── models/                         # Model management (KEEP, low priority)
│   └── api/                                # API routes (EXTEND)
├── components/
│   ├── rag/                                # 13 RAG components (REUSE, modify props)
│   ├── pipeline/                           # 15 pipeline components (REUSE)
│   │   └── chat/                          # 12 multi-turn chat components (REUSE)
│   └── ui/                                # shadcn/UI base components (FIX modals)
├── hooks/                                  # 22 custom hooks (EXTEND, modify some)
├── inngest/
│   ├── client.ts                          # Event types (EXTEND)
│   └── functions/                         # 4 functions (ADD 2, MODIFY 1)
├── lib/
│   ├── supabase-server.ts                 # requireAuth, admin client (KEEP)
│   ├── services/                          # 45+ service files (EXTEND some)
│   └── rag/services/                      # 7 RAG services (MODIFY for workbase_id)
├── stores/                                # 2 Zustand stores (KEEP)
└── types/                                 # Type definitions (EXTEND)
```

### 1.5 Current Database Tables (Relevant)

| Table | Key Columns | Notes |
|-------|------------|-------|
| `conversations` | `id, user_id, conversation_id, title, status, tier, enrichment_status, created_by` | No `workbase_id` yet |
| `training_files` | `id, user_id, name, conversation_count, total_training_pairs` | No `workbase_id` yet |
| `pipeline_training_jobs` | `id, user_id, job_name, dataset_id, status, hf_adapter_path, runpod_job_id` | No `workbase_id` yet |
| `pipeline_inference_endpoints` | `id, job_id, user_id, endpoint_type, status, ready_at, adapter_path` | Status currently set to `'ready'` immediately |
| `rag_knowledge_bases` | `id, user_id, name, description, status, document_count` | To be DROPPED (replaced by `workbases`) |
| `rag_documents` | `id, knowledge_base_id, user_id, file_name, status` | `knowledge_base_id` → rename to `workbase_id` |
| `rag_embeddings` | `id, knowledge_base_id, document_id, user_id` | `knowledge_base_id` → rename to `workbase_id` |
| `rag_facts` | `id, document_id, section_id, user_id, knowledge_base_id` | `knowledge_base_id` → rename to `workbase_id` |
| `rag_sections` | `id, document_id, user_id, knowledge_base_id` | `knowledge_base_id` → rename to `workbase_id` |
| `rag_queries` | `id, knowledge_base_id, document_id, user_id` | `knowledge_base_id` → rename to `workbase_id` |

### 1.6 Existing Auth Pattern (All API Routes MUST Use)

```typescript
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401 if unauthenticated
  // user is guaranteed non-null below
}
```

### 1.7 Existing Hook Pattern (All Data Fetching)

All hooks use TanStack React Query v5:
- Query key factories: `{ all, list(...), detail(id) }`
- `staleTime`: 10–60s depending on data freshness needs
- Mutations: invalidate relevant query keys on success
- Optimistic updates: used in `use-conversations.ts` (snapshot → apply → rollback on error)

### 1.8 SAOL — Mandatory for All Agent Database Operations

**SAOL (Supabase Agent Ops Library)** at `supa-agent-ops/` is required for all schema changes, data migrations, and database introspection done from the terminal.

**Application code** (Inngest functions, API routes) uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server` — NOT SAOL. SAOL is for agent-driven terminal operations only.

**Key SAOL commands:**

```bash
# Introspect table schema
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'TABLE_NAME',includeColumns:true,includeIndexes:true,includePolicies:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Execute DDL (dry-run first, then set dryRun: false)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log('Success:',r.success,'Summary:',r.summary);})();"
```

**Rules:**
1. Always `dryRun: true` first, then `dryRun: false`
2. Always `transport: 'pg'` for DDL
3. Always `transaction: true` for auto-rollback
4. Verify with `agentIntrospectSchema()` after every change

---

## 2. Implementation Phases

### Phase 0: Pre-Work (Immediate Fixes)
### Phase 1: Database + Work Base Foundation + Worker Refresh
### Phase 2: Route Structure + Layout
### Phase 3: Fine Tuning Pages
### Phase 4: Fact Training Pages
### Phase 5: QuickStart + Polish + Testing

---

## 3. Phase 0 — Pre-Work

### 3.1 Fix Modal Backgrounds (D10)

**Problem:** All modals use `bg-background` which resolves to a CSS variable that may be transparent or semi-transparent, making modal content unreadable when overlaying dark pages.

**Files to modify:**

#### 3.1.1 `src/components/ui/dialog.tsx`

**Current `DialogOverlay` class:**
```
fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out ...
```

**Change to:**
```
fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out ...
```

**Current `DialogContent` class:**
```
... z-50 ... bg-background ...
```

**Change to:**
```
... z-50 ... bg-zinc-900 text-zinc-50 border-zinc-700 ...
```

#### 3.1.2 `src/components/ui/alert-dialog.tsx`

Apply identical changes to `AlertDialogOverlay` and `AlertDialogContent`:

**`AlertDialogOverlay`:** `bg-black/50` → `bg-black/80 backdrop-blur-sm`

**`AlertDialogContent`:** `bg-background` → `bg-zinc-900 text-zinc-50 border-zinc-700`

**Acceptance Criteria:**
- All 15+ existing modals inherit the fix automatically (they use these primitives)
- Modal content panels are opaque `bg-zinc-900` with near-white text
- Overlay is 80% black with slight blur

### 3.2 Rename User-Facing Labels

These renames apply to page titles, headings, and navigation text only. No logic changes.

| Current Label | New Label | Files Affected |
|--------------|-----------|---------------|
| "Pipeline" | "Fine Tuning" | Pipeline page titles, dashboard cards |
| "RAG Frontier" | "Fact Training" | RAG page titles, dashboard cards |
| "Knowledge Base" | "Work Base" | All KB references in UI text |
| "Training Jobs" | "Launch Tuning" | Pipeline jobs page headings |

These renames will be applied during Phase 2–4 as pages are rebuilt. No standalone rename pass needed.

---

## 4. Phase 1 — Database + Work Base Foundation + Worker Refresh

### 4.1 Create `workbases` Table

**Use SAOL** to execute this DDL:

```sql
CREATE TABLE IF NOT EXISTS workbases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  active_adapter_job_id UUID REFERENCES pipeline_training_jobs(id),
  document_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE workbases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workbases_select_own" ON workbases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "workbases_insert_own" ON workbases FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "workbases_update_own" ON workbases FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "workbases_delete_own" ON workbases FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "workbases_service_all" ON workbases FOR ALL USING (auth.role() = 'service_role');

-- Performance index
CREATE INDEX idx_workbases_user_id ON workbases(user_id);
```

**Verification (SAOL):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'workbases',includeColumns:true,includeIndexes:true,includePolicies:true,transport:'pg'});console.log('Exists:',r.tables[0]?.exists);console.log('Columns:',r.tables[0]?.columns?.map(c=>c.name));console.log('RLS:',r.tables[0]?.rlsEnabled);console.log('Policies:',r.tables[0]?.policies?.length);})();"
```

**Expected result:** Table exists, 9 columns (`id, user_id, name, description, active_adapter_job_id, document_count, status, created_at, updated_at`), RLS enabled, 5 policies.

### 4.2 Create `conversation_comments` Table (D9)

```sql
CREATE TABLE IF NOT EXISTS conversation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE conversation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_comments_select_own" ON conversation_comments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_insert_own" ON conversation_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "conversation_comments_update_own" ON conversation_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_delete_own" ON conversation_comments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_service_all" ON conversation_comments FOR ALL USING (auth.role() = 'service_role');

-- Performance indexes
CREATE INDEX idx_conversation_comments_user_id ON conversation_comments(user_id);
CREATE INDEX idx_conversation_comments_conversation_id ON conversation_comments(conversation_id);
```

**Verification:** Same SAOL `agentIntrospectSchema` pattern. Expected: 6 columns, RLS enabled, 5 policies, 2 indexes.

### 4.3 Add `workbase_id` FK to Existing Tables

Execute each ALTER separately to isolate failures:

```sql
-- Step 1: Add columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workbase_id UUID REFERENCES workbases(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS workbase_id UUID REFERENCES workbases(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS workbase_id UUID REFERENCES workbases(id);

-- Step 2: Create performance indexes (CONCURRENTLY for production safety)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_workbase_id ON conversations(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_files_workbase_id ON training_files(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_training_jobs_workbase_id ON pipeline_training_jobs(workbase_id);
```

**Note:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Execute each index statement separately with `transaction: false` parameter in SAOL.

### 4.4 Rename `knowledge_base_id` → `workbase_id` on RAG Tables

**CRITICAL:** This is a breaking change. All 5 RAG tables and all code referencing `knowledge_base_id` must be updated atomically.

```sql
-- Step 1: Rename columns on all 5 RAG tables
ALTER TABLE rag_documents RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_embeddings RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_facts RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_sections RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_queries RENAME COLUMN knowledge_base_id TO workbase_id;

-- Step 2: Add FK constraint to workbases
ALTER TABLE rag_documents ADD CONSTRAINT fk_rag_documents_workbase
  FOREIGN KEY (workbase_id) REFERENCES workbases(id);

-- Step 3: Rename existing indexes (if they reference old column name)
-- First introspect to see current index names, then rename as needed
```

**Before executing Step 2**, the existing `knowledge_base_id` values in these tables reference UUIDs from `rag_knowledge_bases`. You must **migrate existing data** first:

1. For each existing `rag_knowledge_bases` row, create a corresponding `workbases` row with the same `id`, `user_id`, `name`, `description`, `status`
2. Then the FK constraint will pass validation

**Data Migration Script (SAOL):**

```javascript
// Run from supa-agent-ops/
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  // 1. Read all existing knowledge bases
  const kbs = await saol.agentQuery({
    table: 'rag_knowledge_bases',
    select: 'id,user_id,name,description,status,document_count,created_at,updated_at'
  });

  if (!kbs.success || !kbs.data.length) {
    console.log('No knowledge bases to migrate');
    return;
  }

  // 2. For each KB, create a workbase with the SAME id
  for (const kb of kbs.data) {
    const result = await saol.agentExecuteDDL({
      sql: `INSERT INTO workbases (id, user_id, name, description, document_count, status, created_at, updated_at)
            VALUES ('${kb.id}', '${kb.user_id}', '${kb.name.replace(/'/g, "''")}', ${kb.description ? `'${kb.description.replace(/'/g, "''")}'` : 'NULL'}, ${kb.document_count || 0}, '${kb.status || 'active'}', '${kb.created_at}', '${kb.updated_at}')
            ON CONFLICT (id) DO NOTHING;`,
      transaction: true,
      transport: 'pg'
    });
    console.log(`Migrated KB ${kb.id}: ${result.success}`);
  }

  console.log('Migration complete. Now safe to add FK constraints.');
})();
```

### 4.5 Drop `rag_knowledge_bases` Table

**Only after** all data is migrated and FK constraints are in place:

```sql
DROP TABLE IF EXISTS rag_knowledge_bases CASCADE;
```

### 4.6 Code Changes for `knowledge_base_id` → `workbase_id` Rename

All references to `knowledge_base_id` in the codebase must be updated. These are the files that need changes:

#### 4.6.1 Type Definitions

**File: `src/types/rag.ts`**

All interfaces using `knowledgeBaseId` must be updated:

| Interface | Field | Change |
|-----------|-------|--------|
| `RAGDocument` | `knowledgeBaseId` | → `workbaseId` |
| `RAGQuery` | `knowledgeBaseId` | → `workbaseId` |
| `RAGKnowledgeBase` | entire interface | → Rename to `Workbase` (see Section 4.7) |
| `CreateKnowledgeBaseRequest` | `name, description` | → `CreateWorkbaseRequest` |
| `UploadDocumentRequest` | `knowledgeBaseId` | → `workbaseId` |
| `RAGQueryRequest` | `knowledgeBaseId` | → `workbaseId` |
| All `*Row` interfaces | `knowledge_base_id` | → `workbase_id` |

#### 4.6.2 RAG Services

**Files to update:**
- `src/lib/rag/services/rag-db-mappers.ts` — all mapper functions referencing `knowledge_base_id`/`knowledgeBaseId`
- `src/lib/rag/services/rag-ingestion-service.ts` — document creation/listing queries
- `src/lib/rag/services/rag-retrieval-service.ts` — query scoping by `workbase_id`
- `src/lib/rag/services/rag-embedding-service.ts` — embedding queries
- `src/lib/rag/services/rag-expert-qa-service.ts` — question queries
- `src/lib/rag/services/rag-quality-service.ts` — quality queries

**Pattern:** In each file, find-and-replace:
- `knowledge_base_id` → `workbase_id` (snake_case, Supabase queries)
- `knowledgeBaseId` → `workbaseId` (camelCase, TypeScript interfaces)

#### 4.6.3 API Routes

**Files to update:**
- `src/app/api/rag/documents/route.ts` — query param and body field
- `src/app/api/rag/query/route.ts` — query scoping
- `src/app/api/rag/knowledge-bases/route.ts` — **DELETE this file** (replaced by `/api/workbases/`)

#### 4.6.4 Hooks

**Files to update:**
- `src/hooks/useRAGKnowledgeBases.ts` — **Rename to `src/hooks/useWorkbases.ts`** (see Section 4.7)
- `src/hooks/useRAGDocuments.ts` — `knowledgeBaseId` → `workbaseId` in key factory and fetch params
- `src/hooks/useRAGChat.ts` — `knowledgeBaseId` → `workbaseId` in key factory and mutation params

#### 4.6.5 Components

**Files to update:**
- `src/components/rag/DocumentUploader.tsx` — props: `knowledgeBaseId` → `workbaseId`
- `src/components/rag/RAGChat.tsx` — props: `knowledgeBaseId` → `workbaseId`
- `src/components/rag/CreateKnowledgeBaseDialog.tsx` — **DELETE** (replaced by Work Base creation flow)
- `src/components/rag/KnowledgeBaseDashboard.tsx` — **DELETE** (replaced by Home page Work Base list)

### 4.7 New TypeScript Types

**File: `src/types/workbase.ts`** (NEW)

```typescript
// ============================================
// Work Base Types
// ============================================

export type WorkbaseStatus = 'active' | 'archived';

export interface Workbase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  activeAdapterJobId: string | null;
  documentCount: number;
  status: WorkbaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkbaseRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  active_adapter_job_id: string | null;
  document_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkbaseRequest {
  name: string;
  description?: string;
}

export interface UpdateWorkbaseRequest {
  name?: string;
  description?: string;
  status?: WorkbaseStatus;
}

export interface WorkbaseResponse {
  success: boolean;
  data?: Workbase;
  error?: string;
}

export interface WorkbaseListResponse {
  success: boolean;
  data?: Workbase[];
  error?: string;
}

// ============================================
// Conversation Comment Types (D9)
// ============================================

export interface ConversationComment {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationCommentRow {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CommentListResponse {
  success: boolean;
  data?: ConversationComment[];
  error?: string;
}

// ============================================
// Training Set Types
// ============================================

export type TrainingSetStatus = 'processing' | 'ready' | 'failed';

export interface TrainingSet {
  id: string;
  workbaseId: string;
  userId: string;
  name: string;
  conversationIds: string[];
  conversationCount: number;
  trainingPairCount: number;
  status: TrainingSetStatus;
  jsonlPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Mapper Functions
// ============================================

export function mapRowToWorkbase(row: WorkbaseRow): Workbase {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    activeAdapterJobId: row.active_adapter_job_id,
    documentCount: row.document_count,
    status: row.status as WorkbaseStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToComment(row: ConversationCommentRow): ConversationComment {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**File: `src/types/index.ts`** — add export:
```typescript
export * from './workbase';
```

### 4.8 New API Route: `POST/GET /api/workbases`

**File: `src/app/api/workbases/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToWorkbase } from '@/types/workbase';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRowToWorkbase),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Name is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) }, { status: 201 });
}
```

### 4.9 New API Route: `GET/PATCH /api/workbases/[id]`

**File: `src/app/api/workbases/[id]/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToWorkbase } from '@/types/workbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServerSupabaseAdminClient();

  // Ownership check: eq user_id ensures 404 if not owner (never 403)
  const { data, error } = await supabase
    .from('workbases')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) });
}
```

### 4.10 New API Route: Conversation Comments (D9)

**File: `src/app/api/conversations/[id]/comments/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToComment } from '@/types/workbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversation_comments')
    .select('*')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRowToComment),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversation_comments')
    .insert({
      conversation_id: params.id,
      user_id: user.id,
      content: body.content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: mapRowToComment(data) }, { status: 201 });
}
```

**File: `src/app/api/conversations/[id]/comments/[commentId]/route.ts`** (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { error } = await supabase
    .from('conversation_comments')
    .delete()
    .eq('id', params.commentId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### 4.11 New Hook: `useWorkbases`

**File: `src/hooks/useWorkbases.ts`** (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workbase, CreateWorkbaseRequest, UpdateWorkbaseRequest } from '@/types/workbase';

export const workbaseKeys = {
  all: ['workbases'] as const,
  list: () => [...workbaseKeys.all, 'list'] as const,
  detail: (id: string) => [...workbaseKeys.all, 'detail', id] as const,
};

async function fetchWorkbases(): Promise<Workbase[]> {
  const res = await fetch('/api/workbases');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch workbases');
  return json.data;
}

async function fetchWorkbase(id: string): Promise<Workbase> {
  const res = await fetch(`/api/workbases/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Workbase not found');
  return json.data;
}

export function useWorkbases() {
  return useQuery({
    queryKey: workbaseKeys.list(),
    queryFn: fetchWorkbases,
    staleTime: 30_000,
  });
}

export function useWorkbase(id: string | null) {
  return useQuery({
    queryKey: workbaseKeys.detail(id!),
    queryFn: () => fetchWorkbase(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWorkbaseRequest) => {
      const res = await fetch('/api/workbases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Workbase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.all });
    },
  });
}

export function useUpdateWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkbaseRequest }) => {
      const res = await fetch(`/api/workbases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Workbase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.all });
      queryClient.setQueryData(workbaseKeys.detail(data.id), data);
    },
  });
}
```

### 4.12 New Hook: `useConversationComments`

**File: `src/hooks/useConversationComments.ts`** (NEW)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConversationComment, CreateCommentRequest } from '@/types/workbase';

export const commentKeys = {
  all: ['conversation-comments'] as const,
  list: (conversationId: string) => [...commentKeys.all, conversationId] as const,
};

export function useConversationComments(conversationId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(conversationId!),
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/comments`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ConversationComment[];
    },
    enabled: !!conversationId,
    staleTime: 15_000,
  });
}

export function useCreateComment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCommentRequest) => {
      const res = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ConversationComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(conversationId) });
    },
  });
}

export function useDeleteComment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(conversationId) });
    },
  });
}
```

### 4.13 Inngest: Add `pipeline/adapter.deployed` Event Type (D11)

**File: `src/inngest/client.ts`**

Add to the `InngestEvents` type, after the existing `'pipeline/adapter.ready'` event:

```typescript
  /**
   * Fired after auto-deploy-adapter successfully updates LORA_MODULES on RunPod.
   * Triggers the refreshInferenceWorkers function to cycle workers so new
   * LORA_MODULES take effect.
   */
  'pipeline/adapter.deployed': {
    data: {
      jobId: string;
      adapterName: string;
      endpointId: string;
      originalWorkersMin: number;
      originalWorkersMax: number;
    };
  };

  /**
   * Fired after a conversation is generated and saved to the database.
   * Triggers the autoEnrichConversation function (D8).
   */
  'conversation/generation.completed': {
    data: {
      conversationId: string;
      userId: string;
    };
  };
```

### 4.14 Inngest: Modify `autoDeployAdapter` (D11)

**File: `src/inngest/functions/auto-deploy-adapter.ts`**

Three changes to the existing function:

#### Change A: Step 4 (`update-runpod-lora-modules`) must return `originalWorkersMin` and `originalWorkersMax`

The current step fetches the endpoint via GraphQL and already has access to `workersMin` and `workersMax` from the response. Add these to the return value:

**Current return (in the success path):**
```typescript
return { loraModules };
```

**New return:**
```typescript
return { loraModules, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

**Current return (idempotent/no-change path):**
```typescript
return { loraModules, noChange: true };
```

**New return:**
```typescript
return { loraModules, noChange: true, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

**Capture the result:** The step's return value must be captured:
```typescript
const loraModulesResult = await step.run('update-runpod-lora-modules', async () => { ... });
```

#### Change B: New Step 4b — Emit Worker Refresh Event

Insert a new step between the current `update-runpod-lora-modules` step and `vllm-hot-reload`:

```typescript
// =====================================================
// Step 4b: Trigger worker refresh cycle
// =====================================================
await step.run('emit-worker-refresh', async () => {
  // Skip if LORA_MODULES were not changed
  if (loraModulesResult.noChange) {
    return { emitted: false, reason: 'LORA_MODULES unchanged' };
  }

  await inngest.send({
    name: 'pipeline/adapter.deployed',
    data: {
      jobId: event.data.jobId,
      adapterName: `adapter-${event.data.jobId.slice(0, 8)}`,
      endpointId: process.env.RUNPOD_INFERENCE_ENDPOINT_ID || '780tauhj7c126b',
      originalWorkersMin: loraModulesResult.originalWorkersMin,
      originalWorkersMax: loraModulesResult.originalWorkersMax,
    },
  });

  return { emitted: true };
});
```

#### Change C: Step 6 (`update-inference-endpoints-db`) — Status `'ready'` → `'deploying'`

In the INSERT path:
```typescript
// BEFORE:
status: 'ready',
ready_at: now,

// AFTER:
status: 'deploying',
ready_at: null,
```

In the UPDATE path:
```typescript
// BEFORE:
status: 'ready',
ready_at: now,

// AFTER:
status: 'deploying',
ready_at: null,
```

### 4.15 Inngest: New Function `refreshInferenceWorkers` (D11)

**File: `src/inngest/functions/refresh-inference-workers.ts`** (NEW)

```typescript
import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Refresh Inference Workers
 *
 * After autoDeployAdapter updates LORA_MODULES on RunPod, this function
 * cycles workers (scale down to 0, wait, scale back up) so they cold-start
 * with the new env vars. Then marks endpoints as 'ready'.
 *
 * Concurrency: 1 (only one refresh at a time on the shared endpoint)
 * Retries: 1 (avoid infinite worker cycling)
 */
export const refreshInferenceWorkers = inngest.createFunction(
  {
    id: 'refresh-inference-workers',
    name: 'Refresh Inference Workers After Adapter Deploy',
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: 'pipeline/adapter.deployed' },
  async ({ event, step }) => {
    const {
      jobId,
      adapterName,
      endpointId,
      originalWorkersMin,
      originalWorkersMax,
    } = event.data;

    const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
    const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
    const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

    // Helper: RunPod GraphQL request
    async function graphql(query: string, variables?: Record<string, unknown>) {
      const res = await fetch(
        `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        }
      );
      return res.json();
    }

    // Helper: Poll endpoint health
    async function getWorkerState(): Promise<{
      ready: number; idle: number; running: number; initializing: number;
    }> {
      try {
        const res = await fetch(`${INFERENCE_API_URL}/health`, {
          headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
        });
        const data = await res.json();
        return {
          ready: data.workers?.ready || 0,
          idle: data.workers?.idle || 0,
          running: data.workers?.running || 0,
          initializing: data.workers?.initializing || 0,
        };
      } catch {
        return { ready: 0, idle: 0, running: 0, initializing: 0 };
      }
    }

    // ========================================
    // Step 1: Scale down workers to 0
    // ========================================
    const endpointState = await step.run('scale-down-workers', async () => {
      // Fetch current full endpoint config (MUST pass ALL fields back)
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      // Save endpoint with workersMin=0
      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: 0,
        workersMax: ep.workersMax,
        templateId: ep.templateId,
        env: ep.env.map((e: { key: string; value: string }) => ({
          key: e.key,
          value: e.value,
        })),
      };

      await graphql(mutation, { input });
      return { previousWorkersMin: ep.workersMin, allEnv: ep.env };
    });

    // ========================================
    // Step 2: Wait for all workers to terminate
    // ========================================
    await step.run('wait-for-workers-terminated', async () => {
      const startMs = Date.now();
      const timeoutMs = 90_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        const total = state.ready + state.idle + state.running + state.initializing;
        console.log(`[worker-refresh] Waiting for termination: total=${total} (R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing})`);
        if (total === 0) return { waitedMs: Date.now() - startMs };
        await new Promise(r => setTimeout(r, pollMs));
      }

      // Timeout — restore workers before throwing
      throw new Error(`Workers did not terminate within ${timeoutMs / 1000}s`);
    });

    // ========================================
    // Step 3: Scale up workers with MAX_LORAS=5
    // ========================================
    await step.run('scale-up-workers', async () => {
      // Fetch current endpoint state again (in case env changed)
      const fetchQuery = `
        query GetEndpoint {
          myself {
            endpoint(id: "${endpointId}") {
              id name gpuIds idleTimeout locations
              networkVolumeId scalerType scalerValue
              workersMin workersMax templateId
              env { key value }
            }
          }
        }
      `;
      const fetchResult = await graphql(fetchQuery);
      const ep = fetchResult.data?.myself?.endpoint;
      if (!ep) throw new Error(`Endpoint ${endpointId} not found`);

      // Update MAX_LORAS to 5
      let updatedEnv = ep.env.map((e: { key: string; value: string }) =>
        e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : { key: e.key, value: e.value }
      );
      if (!updatedEnv.some((e: { key: string }) => e.key === 'MAX_LORAS')) {
        updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
      }

      const mutation = `
        mutation SaveEndpointEnv($input: EndpointInput!) {
          saveEndpoint(input: $input) { id }
        }
      `;
      const input = {
        id: ep.id,
        name: ep.name,
        gpuIds: ep.gpuIds,
        idleTimeout: ep.idleTimeout,
        locations: ep.locations,
        networkVolumeId: ep.networkVolumeId,
        scalerType: ep.scalerType,
        scalerValue: ep.scalerValue,
        workersMin: originalWorkersMin,
        workersMax: originalWorkersMax,
        templateId: ep.templateId,
        env: updatedEnv,
      };

      await graphql(mutation, { input });
      return { restoredWorkersMin: originalWorkersMin, maxLoras: 5 };
    });

    // ========================================
    // Step 4: Wait for workers to become ready
    // ========================================
    await step.run('wait-for-workers-ready', async () => {
      const startMs = Date.now();
      const timeoutMs = 180_000;
      const pollMs = 5_000;

      while (Date.now() - startMs < timeoutMs) {
        const state = await getWorkerState();
        console.log(`[worker-refresh] Waiting for ready: R:${state.ready} I:${state.idle} Ru:${state.running} In:${state.initializing}`);
        if (state.ready > 0 || state.idle > 0) {
          return { waitedMs: Date.now() - startMs, state };
        }
        await new Promise(r => setTimeout(r, pollMs));
      }

      console.warn('[worker-refresh] Workers did not reach ready state within timeout — proceeding anyway');
      return { waitedMs: 180_000, timedOut: true };
    });

    // ========================================
    // Step 5: Verify adapter is available (non-fatal)
    // ========================================
    await step.run('verify-adapter-available', async () => {
      try {
        const res = await fetch(`${INFERENCE_API_URL}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              openai_route: '/v1/chat/completions',
              openai_input: {
                model: adapterName,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5,
              },
            },
          }),
        });
        const data = await res.json();
        if (data.status === 'COMPLETED') {
          return { verified: true };
        }
        console.warn(`[worker-refresh] Adapter verification returned status: ${data.status}`);
        return { verified: false, status: data.status };
      } catch (err) {
        console.warn('[worker-refresh] Adapter verification failed (non-fatal):', err);
        return { verified: false, error: String(err) };
      }
    });

    // ========================================
    // Step 6: Mark endpoints as ready in DB
    // ========================================
    await step.run('mark-endpoints-ready', async () => {
      try {
        const supabase = createServerSupabaseAdminClient();
        const { error } = await supabase
          .from('pipeline_inference_endpoints')
          .update({
            status: 'ready',
            ready_at: new Date().toISOString(),
          })
          .eq('job_id', jobId);

        if (error) {
          console.warn('[worker-refresh] Failed to mark endpoints ready:', error.message);
          return { updated: false, error: error.message };
        }
        return { updated: true };
      } catch (err) {
        console.warn('[worker-refresh] DB update failed (non-fatal):', err);
        return { updated: false, error: String(err) };
      }
    });

    return {
      success: true,
      jobId,
      adapterName,
      endpointId,
    };
  }
);
```

### 4.16 Inngest: New Function `autoEnrichConversation` (D8)

**File: `src/inngest/functions/auto-enrich-conversation.ts`** (NEW)

```typescript
import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Auto-Enrich Conversation (D8)
 *
 * Triggered after a conversation is generated and saved.
 * Runs the enrichment pipeline automatically instead of requiring
 * a manual "Enrich All" button click.
 *
 * Concurrency: 3 (allow parallel enrichment of different conversations)
 */
export const autoEnrichConversation = inngest.createFunction(
  {
    id: 'auto-enrich-conversation',
    name: 'Auto-Enrich Generated Conversation',
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: 'conversation/generation.completed' },
  async ({ event, step }) => {
    const { conversationId, userId } = event.data;

    // Step 1: Fetch conversation and verify it needs enrichment
    const conversation = await step.run('fetch-conversation', async () => {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('conversations')
        .select('id, enrichment_status, status')
        .eq('id', conversationId)
        .single();

      if (error || !data) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Skip if already enriched
      if (data.enrichment_status === 'completed') {
        return { skip: true, reason: 'already enriched' };
      }

      return { skip: false, conversation: data };
    });

    if (conversation.skip) {
      return { skipped: true, reason: conversation.reason };
    }

    // Step 2: Run enrichment
    await step.run('run-enrichment', async () => {
      // Import the enrichment orchestrator dynamically to avoid circular deps
      const { enrichConversation } = await import(
        '@/lib/services/enrichment-pipeline-orchestrator'
      );
      await enrichConversation(conversationId);
      return { enriched: true };
    });

    return { success: true, conversationId };
  }
);
```

### 4.17 Inngest: Register New Functions

**File: `src/inngest/functions/index.ts`**

Replace the current content with:

```typescript
import { processRAGDocument } from './process-rag-document';
import { dispatchTrainingJob, dispatchTrainingJobFailureHandler } from './dispatch-training-job';
import { autoDeployAdapter } from './auto-deploy-adapter';
import { refreshInferenceWorkers } from './refresh-inference-workers';
import { autoEnrichConversation } from './auto-enrich-conversation';

export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
];

export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,
  autoEnrichConversation,
};
```

### 4.18 Test Script: `scripts/test-worker-refresh.ts`

**File: `scripts/test-worker-refresh.ts`** (NEW)

This standalone script validates the worker refresh cycle outside of Inngest.

```typescript
/**
 * Test Worker Refresh Cycle
 *
 * Usage: npx tsx scripts/test-worker-refresh.ts
 *
 * Validates:
 * 1. Fetching current endpoint state via GraphQL
 * 2. Setting workersMin=0 and waiting for termination
 * 3. Restoring workersMin and waiting for ready
 * 4. Rapid-fire test (0 then immediately 2)
 * 5. Endpoint creation research (dry-run only)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RUNPOD_GRAPHQL_API_KEY = process.env.RUNPOD_GRAPHQL_API_KEY!;
const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const ENDPOINT_ID = process.env.RUNPOD_INFERENCE_ENDPOINT_ID || '780tauhj7c126b';
const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;

async function graphql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(
    `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    }
  );
  return res.json();
}

async function getHealth() {
  try {
    const res = await fetch(`${INFERENCE_API_URL}/health`, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    });
    return await res.json();
  } catch (err) {
    return { workers: { ready: 0, idle: 0, running: 0, initializing: 0 }, error: String(err) };
  }
}

function logWorkers(label: string, w: { ready: number; idle: number; running: number; initializing: number }) {
  console.log(`  ${label} Ready: ${w.ready}, Idle: ${w.idle}, Running: ${w.running}, Initializing: ${w.initializing}`);
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function setWorkersMin(endpointData: Record<string, unknown>, workersMin: number) {
  const mutation = `
    mutation SaveEndpointEnv($input: EndpointInput!) {
      saveEndpoint(input: $input) { id }
    }
  `;
  const ep = endpointData as any;
  const input = {
    id: ep.id,
    name: ep.name,
    gpuIds: ep.gpuIds,
    idleTimeout: ep.idleTimeout,
    locations: ep.locations,
    networkVolumeId: ep.networkVolumeId,
    scalerType: ep.scalerType,
    scalerValue: ep.scalerValue,
    workersMin,
    workersMax: ep.workersMax,
    templateId: ep.templateId,
    env: ep.env.map((e: { key: string; value: string }) => ({ key: e.key, value: e.value })),
  };
  return graphql(mutation, { input });
}

async function main() {
  console.log('=== Worker Refresh Test Script ===\n');

  // Step 1: Fetch endpoint state
  console.log('[1/6] Fetching current endpoint state...');
  const fetchQuery = `
    query GetEndpoint {
      myself {
        endpoint(id: "${ENDPOINT_ID}") {
          id name gpuIds idleTimeout locations
          networkVolumeId scalerType scalerValue
          workersMin workersMax templateId
          env { key value }
        }
      }
    }
  `;
  const fetchResult = await graphql(fetchQuery);
  const ep = fetchResult.data?.myself?.endpoint;
  if (!ep) {
    console.error('ERROR: Endpoint not found:', fetchResult);
    process.exit(1);
  }
  console.log(`  Endpoint: ${ep.name} (${ep.id})`);
  console.log(`  Current workersMin: ${ep.workersMin}, workersMax: ${ep.workersMax}`);
  const maxLoras = ep.env.find((e: any) => e.key === 'MAX_LORAS');
  console.log(`  Current MAX_LORAS: ${maxLoras?.value || 'not set'}`);

  const originalWorkersMin = ep.workersMin;

  // Step 2: Current worker state
  console.log('\n[2/6] Current worker state:');
  const health = await getHealth();
  logWorkers('', health.workers || { ready: 0, idle: 0, running: 0, initializing: 0 });

  // Step 3: Set workersMin=0
  console.log('\n[3/6] Setting workersMin=0...');
  await setWorkersMin(ep, 0);
  console.log('  workersMin set to 0');

  // Step 4: Poll until terminated
  console.log('\n[4/6] Polling until all workers terminated...');
  const start1 = Date.now();
  for (let i = 0; i < 18; i++) { // 90s max
    await sleep(5000);
    const h = await getHealth();
    const w = h.workers || { ready: 0, idle: 0, running: 0, initializing: 0 };
    const elapsed = Math.round((Date.now() - start1) / 1000);
    logWorkers(`[${elapsed}s]`, w);
    if (w.ready + w.idle + w.running + w.initializing === 0) {
      console.log(`  All workers terminated after ${elapsed}s`);
      break;
    }
  }

  // Step 5: Restore workersMin
  console.log(`\n[5/6] Setting workersMin=${originalWorkersMin || 2} (restoring)...`);
  await setWorkersMin(ep, originalWorkersMin || 2);
  console.log(`  workersMin set to ${originalWorkersMin || 2}`);

  // Step 6: Poll until ready
  console.log('\n[6/6] Polling until workers ready...');
  const start2 = Date.now();
  for (let i = 0; i < 36; i++) { // 180s max
    await sleep(5000);
    const h = await getHealth();
    const w = h.workers || { ready: 0, idle: 0, running: 0, initializing: 0 };
    const elapsed = Math.round((Date.now() - start2) / 1000);
    logWorkers(`[${elapsed}s]`, w);
    if (w.ready > 0 || w.idle > 0) {
      console.log(`  Workers ready after ${elapsed}s`);
      break;
    }
  }

  // Rapid-fire test
  console.log('\n[RAPID-FIRE TEST] Setting workersMin=0 then immediately workersMin=2...');
  await setWorkersMin(ep, 0);
  console.log('  Sent workersMin=0');
  await setWorkersMin(ep, 2);
  console.log('  Sent workersMin=2 (immediately after)');
  await sleep(10000);
  const rapidHealth = await getHealth();
  logWorkers('  After 10s:', rapidHealth.workers || { ready: 0, idle: 0, running: 0, initializing: 0 });

  // Restore to original
  await setWorkersMin(ep, originalWorkersMin);
  console.log(`\n  Restored workersMin to ${originalWorkersMin}`);

  // Research: endpoint creation
  console.log('\n[RESEARCH] Endpoint creation capability:');
  console.log(`  templateId: ${ep.templateId}`);
  console.log(`  Full env:`, ep.env.map((e: any) => `${e.key}=${e.value}`).join(', '));
  console.log(`  createEndpoint mutation would look like:`);
  console.log(`    mutation { createEndpoint(input: {`);
  console.log(`      name: "clone-of-${ep.name}",`);
  console.log(`      templateId: "${ep.templateId}",`);
  console.log(`      gpuIds: "${ep.gpuIds}",`);
  console.log(`      workersMin: ${ep.workersMin},`);
  console.log(`      workersMax: ${ep.workersMax},`);
  console.log(`      idleTimeout: ${ep.idleTimeout},`);
  console.log(`      env: [${ep.env.map((e: any) => `{key:"${e.key}",value:"${e.value}"}`).join(', ')}]`);
  console.log(`    }) { id } }`);

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
```

---

## 5. Phase 2 — Route Structure + Layout

### 5.1 New Route File Tree

Create these files under `src/app/`:

```
src/app/
├── (dashboard)/
│   ├── home/page.tsx                                 # NEW — Home page
│   ├── workbase/[id]/
│   │   ├── layout.tsx                                # NEW — Sidebar layout
│   │   ├── page.tsx                                  # NEW — Overview
│   │   ├── fine-tuning/
│   │   │   ├── conversations/
│   │   │   │   ├── page.tsx                          # NEW — Conversation Library + Training Sets
│   │   │   │   └── [convId]/page.tsx                 # NEW — Conversation Detail + Feedback
│   │   │   ├── launch/page.tsx                       # NEW — Launch Tuning
│   │   │   └── chat/page.tsx                         # NEW — Behavior Chat
│   │   ├── fact-training/
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx                          # NEW — Document Upload + List
│   │   │   │   └── [docId]/page.tsx                  # NEW — Document Detail
│   │   │   ├── chat/page.tsx                         # NEW — Fact Training Chat
│   │   │   └── quality/page.tsx                      # NEW — Quality Dashboard
│   │   └── settings/page.tsx                         # NEW — Work Base Settings
```

### 5.2 Work Base Layout with Sidebar

**File: `src/app/(dashboard)/workbase/[id]/layout.tsx`** (NEW)

This layout provides persistent sidebar navigation for all Work Base pages.

```tsx
'use client';

import { Suspense } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useWorkbase } from '@/hooks/useWorkbases';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Rocket,
  MessagesSquare,
  FileText,
  MessageCircle,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function WorkbaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);

  const basePath = `/workbase/${workbaseId}`;

  const navSections: NavSection[] = [
    {
      title: '',
      items: [
        { label: 'Overview', href: basePath, icon: LayoutDashboard },
      ],
    },
    {
      title: 'FINE TUNING',
      items: [
        { label: 'Conversations', href: `${basePath}/fine-tuning/conversations`, icon: MessageSquare },
        { label: 'Launch Tuning', href: `${basePath}/fine-tuning/launch`, icon: Rocket },
        { label: 'Behavior Chat', href: `${basePath}/fine-tuning/chat`, icon: MessagesSquare },
      ],
    },
    {
      title: 'FACT TRAINING',
      items: [
        { label: 'Documents', href: `${basePath}/fact-training/documents`, icon: FileText },
        { label: 'Chat', href: `${basePath}/fact-training/chat`, icon: MessageCircle },
        { label: 'Quality', href: `${basePath}/fact-training/quality`, icon: BarChart3 },
      ],
    },
    {
      title: '',
      items: [
        { label: 'Settings', href: `${basePath}/settings`, icon: Settings },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <Link href="/home" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm mb-2">
            <ChevronLeft className="h-4 w-4" />
            All Work Bases
          </Link>
          <h2 className="font-semibold text-zinc-50 truncate">
            {isLoading ? '...' : workbase?.name || 'Work Base'}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="mb-2">
              {section.title && (
                <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-zinc-800 text-zinc-50 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
```

### 5.3 Home Page

**File: `src/app/(dashboard)/home/page.tsx`** (NEW)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWorkbases, useCreateWorkbase } from '@/hooks/useWorkbases';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, FolderOpen, MessageSquare, FileText } from 'lucide-react';
import { Workbase } from '@/types/workbase';

export default function HomePage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const { data: workbases, isLoading } = useWorkbases();
  const createMutation = useCreateWorkbase();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  async function handleCreate() {
    if (!newName.trim()) return;
    const wb = await createMutation.mutateAsync({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
    setShowCreateDialog(false);
    setNewName('');
    setNewDescription('');
    router.push(`/workbase/${wb.id}`);
  }

  function handleSelectWorkbase(wb: Workbase) {
    router.push(`/workbase/${wb.id}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-50">BrightHub</h1>
              <p className="text-zinc-400">
                Welcome back, {profile?.full_name || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-400">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* QuickStart tile (shown when 0 workbases) */}
        {!isLoading && (!workbases || workbases.length === 0) && (
          <Card className="mb-8 border-dashed border-zinc-700 bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-zinc-500 mb-4" />
              <h3 className="text-xl font-semibold text-zinc-50 mb-2">
                Chat with your documents in minutes
              </h3>
              <p className="text-zinc-400 mb-6 text-center max-w-md">
                Create a Work Base to upload documents, generate training conversations,
                and chat with your AI.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Work Base list */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-50">Your Work Bases</h2>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Work Base
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workbases?.map((wb) => (
              <Card
                key={wb.id}
                className="cursor-pointer hover:border-primary transition-colors bg-zinc-900 border-zinc-800"
                onClick={() => handleSelectWorkbase(wb)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-50 truncate">{wb.name}</CardTitle>
                  {wb.description && (
                    <p className="text-sm text-zinc-400 truncate">{wb.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {wb.activeAdapterJobId ? 'Adapter Live' : 'No Adapter'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {wb.documentCount} docs
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Work Base Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Work Base</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-zinc-200">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Claims Processing Manual"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-200">Description (optional)</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this Work Base for?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 5.4 Work Base Overview Page

**File: `src/app/(dashboard)/workbase/[id]/page.tsx`** (NEW)

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Rocket,
  FileText,
  Upload,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

export default function WorkbaseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!workbase) {
    return (
      <div className="p-8 text-center text-zinc-400">Work Base not found.</div>
    );
  }

  const hasAdapter = !!workbase.activeAdapterJobId;
  const hasDocs = (workbase.documentCount || 0) > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-50 mb-2">{workbase.name}</h1>
      {workbase.description && (
        <p className="text-zinc-400 mb-8">{workbase.description}</p>
      )}

      {/* Empty state */}
      {!hasAdapter && !hasDocs && (
        <Card className="mb-8 border-dashed border-zinc-700 bg-zinc-900">
          <CardContent className="py-8 text-center">
            <p className="text-zinc-400 mb-4">
              Upload documents to start chatting, or create conversations to start training.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Conversations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fine Tuning Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Rocket className="h-5 w-5" />
              Fine Tuning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Adapter Status</span>
                <Badge variant={hasAdapter ? 'default' : 'secondary'}>
                  {hasAdapter ? 'Live' : 'None'}
                </Badge>
              </div>
              <div className="text-sm text-zinc-500">
                Conversations → Launch Tuning
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fact Training Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <FileText className="h-5 w-5" />
              Fact Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Documents</span>
                <span className="text-sm text-zinc-200">
                  {workbase.documentCount || 0} uploaded
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  router.push(
                    hasDocs
                      ? `/workbase/${workbaseId}/fact-training/chat`
                      : `/workbase/${workbaseId}/fact-training/documents`
                  )
                }
              >
                {hasDocs ? 'Open Chat' : 'Upload Documents'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Behavior Chat shortcut */}
      {(hasAdapter || hasDocs) && (
        <Card className="mt-6 bg-zinc-900 border-zinc-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-zinc-50">Chat with your AI</p>
                <p className="text-sm text-zinc-400">
                  {hasAdapter && hasDocs
                    ? 'Behavior + Documents available'
                    : hasAdapter
                    ? 'Behavior mode available'
                    : 'Documents mode available'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/chat`)}
            >
              Open Chat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 5.5 Settings Page

**File: `src/app/(dashboard)/workbase/[id]/settings/page.tsx`** (NEW)

```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase, useUpdateWorkbase } from '@/hooks/useWorkbases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function WorkbaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);
  const updateMutation = useUpdateWorkbase();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form when workbase loads
  if (workbase && !initialized) {
    setName(workbase.name);
    setDescription(workbase.description || '');
    setInitialized(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id: workbaseId,
        updates: { name: name.trim(), description: description.trim() || undefined },
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  }

  async function handleArchive() {
    if (!confirm('Are you sure you want to archive this Work Base?')) return;
    try {
      await updateMutation.mutateAsync({
        id: workbaseId,
        updates: { status: 'archived' },
      });
      toast.success('Work Base archived');
      router.push('/home');
    } catch (err) {
      toast.error('Failed to archive');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-50 mb-8">Settings</h1>

      {/* General */}
      <Card className="mb-6 bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-50">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-200">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-200">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Endpoint info (read-only) */}
      {workbase?.activeAdapterJobId && (
        <Card className="mb-6 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-50">Active Adapter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              Adapter Job ID: <code className="text-zinc-200">{workbase.activeAdapterJobId}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-red-900/50 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleArchive}>
            Archive Work Base
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5.6 Redirect Root Dashboard to Home

**File: `src/app/(dashboard)/dashboard/page.tsx`** — modify to redirect:

Add a redirect at the top of the component:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home');
  }, [router]);
  return null;
}
```

---

## 6. Phase 3 — Fine Tuning Pages

### 6.1 Conversations Page

**File: `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`** (NEW)

This page combines the current Conversations page + Training Files page + Datasets page + Data Shaping page into one.

**Layout:**
- **Section A (top):** Conversation Library — table with checkboxes, filters, "New Conversation" CTA, "Build Training Set" bulk action
- **Section B (bottom):** Training Sets — list of aggregated training sets with status, download, "Use for Launch Tuning" action

**Data sources:**
- Section A: `useConversations()` hook (existing, add `workbaseId` filter when FK migration is complete)
- Section B: New `useTrainingSets(workbaseId)` hook → `GET /api/workbase/[id]/training-sets`

**Key component reuse:**
- Existing `ConversationTable` patterns from `src/app/(dashboard)/conversations/page.tsx`
- Checkbox multi-select pattern (new)
- Stepper component (new, simple 2-step)

**Component structure:**

```tsx
// Page: WorkbaseConversationsPage
// ├── StepIndicator (Conversations → Launch Tuning)
// ├── Section A: ConversationLibrary
// │   ├── Header + Search + Filters
// │   ├── ConversationTable (with checkboxes)
// │   └── BulkActionBar (Build Training Set, Retry Enrichments)
// └── Section B: TrainingSets
//     ├── Header
//     └── TrainingSetList (name, count, status, actions)
```

**New API route for Training Sets:**

**File: `src/app/api/workbase/[id]/training-sets/route.ts`** (NEW)

```typescript
// GET: List training sets for this workbase
// POST: Create a training set from selected conversation IDs
//   Body: { name?: string, conversationIds: string[] }
//   - Validates all conversations belong to this workbase
//   - Aggregates training pairs from selected conversations
//   - Creates JSONL file in Supabase Storage
//   - Returns new training set record
```

**New hook: `src/hooks/useTrainingSets.ts`** (NEW)

Query key factory: `{ all, list(workbaseId), detail(id) }`
- `useTrainingSets(workbaseId)` — list training sets
- `useCreateTrainingSet(workbaseId)` — create from selected conversations
- `useDeleteTrainingSet(workbaseId)` — delete

### 6.2 Conversation Detail Page (D9)

**File: `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/[convId]/page.tsx`** (NEW)

**Purpose:** View-only conversation display with feedback section.

**Layout:**
- **Back button:** "← Back to Conversations"
- **Header:** Conversation title + status badge
- **Context bar:** Persona, Arc, Topic, Quality, Turns (horizontal strip)
- **Conversation thread:** Chat-style bubbles (user turns left, assistant turns right) with emotional state pills
- **Your Feedback section:**
  - Text area for adding feedback
  - Comment list (reverse-chronological) with delete button
  - Uses `useConversationComments()` and `useCreateComment()` hooks

**Data sources:**
- `useConversation(convId)` — existing hook for conversation + turns
- `useConversationComments(convId)` — new hook from Section 4.12

**Component structure:**

```tsx
// Page: ConversationDetailPage
// ├── BackButton
// ├── ConversationHeader (title, status badge)
// ├── ContextBar (persona, arc, topic, quality, turns)
// ├── ConversationThread
// │   └── ChatBubble[] (user left, assistant right, emotional state pill)
// └── FeedbackSection
//     ├── CommentInput (textarea + submit button)
//     └── CommentList (reverse-chrono, delete button per comment)
```

### 6.3 Launch Tuning Page

**File: `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`** (NEW)

**Purpose:** Configure + Train + Deploy on a single page. Replaces: pipeline/configure, pipeline/jobs, pipeline/jobs/[id], pipeline/jobs/[id]/results.

**Layout:**
- **Stepper:** Conversations → Launch Tuning (current step highlighted)
- **Banner:** Active adapter status (`Not launched | Training X% | Deploying | Live`)
- **Section A:** Training Input — auto-selected training set, change dropdown, view JSONL
- **Section B:** Training Settings — 3 sliders (`TrainingParameterSlider` existing component), job name input
- **Section C:** Cost & Launch — `CostEstimateCard` (existing component), "Train & Publish" CTA, inline progress
- **Section D:** Adapter History — list of past launches, rollback action

**Key component reuse:**
- `TrainingParameterSlider` — existing, no changes needed
- `CostEstimateCard` — existing, no changes needed
- `TrainingProgressPanel` — existing, reuse for inline progress
- `EndpointStatusBanner` — existing, shows "deploying" during worker refresh

**Data sources:**
- `useTrainingSets(workbaseId)` — for training set selection
- `usePipelineJobs({ workbaseId })` — modified to filter by workbase (add `workbaseId` query param)
- `usePipelineJob(jobId)` — existing hook for real-time job polling
- `useCreatePipelineJob()` — existing mutation
- `useTrainingConfig()` — existing hook for slider state

### 6.4 Behavior Chat Page

**File: `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx`** (NEW)

**Purpose:** The user-reward page — chat with their trained AI, optionally grounded in documents.

**Layout:**
- **Availability banner** (top, conditional per D4 5-state logic)
- **Deploying banner** (D11): shown when `pipeline_inference_endpoints.status = 'deploying'`
- **Mode selector:** `ModeSelector` component (existing), with disabled states per availability
- **Chat UI:** `MultiTurnChat` component (existing), modified to accept `workbaseId`

**5-state availability logic:**

```typescript
// Computed in the page from workbase data + endpoint status
const hasAdapter = !!workbase.activeAdapterJobId;
const adapterStatus = endpointData?.adaptedEndpoint?.status; // 'deploying' | 'ready' | etc.
const hasDocs = (workbase.documentCount || 0) > 0;

type AvailabilityState =
  | 'empty'           // !hasAdapter && !hasDocs
  | 'rag_only'        // !hasAdapter && hasDocs
  | 'deploying'       // hasAdapter && adapterStatus === 'deploying'
  | 'lora_only'       // hasAdapter && adapterStatus === 'ready' && !hasDocs
  | 'full';           // hasAdapter && adapterStatus === 'ready' && hasDocs
```

**ModeSelector modifications:**

The existing `ModeSelector` component needs a new optional `disabledModes` prop:

```typescript
interface ModeSelectorProps {
  value: RAGQueryMode;
  onChange: (mode: RAGQueryMode) => void;
  disabledModes?: RAGQueryMode[];  // NEW: modes to grey out
}
```

**MultiTurnChat modifications:**

The existing `MultiTurnChat` component accepts `jobId`. It needs a new alternate prop path:

```typescript
interface MultiTurnChatProps {
  jobId?: string;         // Existing: direct job ID
  workbaseId?: string;    // NEW: resolve active adapter from workbase
}
```

When `workbaseId` is provided instead of `jobId`, the component fetches the workbase's `active_adapter_job_id` and uses that.

---

## 7. Phase 4 — Fact Training Pages

### 7.1 Documents Page

**File: `src/app/(dashboard)/workbase/[id]/fact-training/documents/page.tsx`** (NEW)

Replaces the KB-selection flow in the current RAG page. Uses the workbase ID directly as the document scope.

**Layout:**
- **Header:** "Documents" + "Upload documents to teach your AI about your business."
- **Upload area:** `DocumentUploader` component (existing, prop change: `knowledgeBaseId` → `workbaseId`)
- **Document list:** `DocumentList` component (existing, prop change: `knowledgeBaseId` → `workbaseId`)
- **CTA:** "Chat with Documents" → routes to `/workbase/[id]/fact-training/chat`

**DocumentUploader prop change:**
```typescript
// BEFORE:
interface DocumentUploaderProps {
  knowledgeBaseId: string;
}

// AFTER:
interface DocumentUploaderProps {
  workbaseId: string;
}
```

**useRAGDocuments hook change:**
```typescript
// BEFORE:
export function useRAGDocuments(knowledgeBaseId: string)
// fetch: GET /api/rag/documents?knowledgeBaseId=X

// AFTER:
export function useRAGDocuments(workbaseId: string)
// fetch: GET /api/rag/documents?workbaseId=X
```

### 7.2 Document Detail Page

**File: `src/app/(dashboard)/workbase/[id]/fact-training/documents/[docId]/page.tsx`** (NEW)

Content preserved from current `src/app/(dashboard)/rag/[id]/page.tsx`. Tabs: Detail, Expert Q&A, Chat, Diagnostic, Quality. Route changes only.

### 7.3 Fact Training Chat Page

**File: `src/app/(dashboard)/workbase/[id]/fact-training/chat/page.tsx`** (NEW)

```tsx
'use client';

import { useParams } from 'next/navigation';
import { RAGChat } from '@/components/rag/RAGChat';

export default function FactTrainingChatPage() {
  const params = useParams();
  const workbaseId = params.id as string;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-50">Chat</h1>
        <p className="text-sm text-zinc-400">Chat with all documents in this Work Base</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RAGChat workbaseId={workbaseId} />
      </div>
    </div>
  );
}
```

**RAGChat prop change:**
```typescript
// BEFORE:
interface RAGChatProps {
  documentId?: string;
  knowledgeBaseId?: string;
  documentName?: string;
}

// AFTER:
interface RAGChatProps {
  documentId?: string;
  workbaseId?: string;
  documentName?: string;
}
```

### 7.4 Quality Page

**File: `src/app/(dashboard)/workbase/[id]/fact-training/quality/page.tsx`** (NEW)

Wraps the existing `QualityDashboard` component. Content preserved from `src/app/(dashboard)/rag/[id]/quality/`.

```tsx
'use client';

import { useParams } from 'next/navigation';
import { QualityDashboard } from '@/components/rag/QualityDashboard';

export default function QualityPage() {
  const params = useParams();
  const workbaseId = params.id as string;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Quality</h1>
      <QualityDashboard workbaseId={workbaseId} />
    </div>
  );
}
```

---

## 8. Phase 5 — QuickStart + Polish + Testing

### 8.1 QuickStart Wizard

Not a separate page — it's a modal/drawer launched from the Home page's "Get Started" button. Steps:

1. **Name** — Input field for Work Base name
2. **Upload** — Document drop zone (uses `DocumentUploader`)
3. **Processing** — Shows document processing progress (polls `rag_documents` status)
4. **Chat** — Redirects to `/workbase/[id]/fact-training/chat` when document is ready

### 8.2 Empty States

Each page needs an empty state when no data exists:

| Page | Empty State Text | CTA |
|------|-----------------|-----|
| Conversations | "Create training conversations to teach your AI new behaviors." | "New Conversation" |
| Launch Tuning | "Build a Training Set from your conversations first." | "Go to Conversations" |
| Behavior Chat | (varies by availability state — see D4) | context-dependent |
| Documents | "Upload documents to get started." | "Upload Document" |
| Fact Training Chat | "Upload and process at least one document to start chatting." | "Go to Documents" |
| Quality | "Run some queries first to see quality metrics." | "Go to Chat" |

### 8.3 End-to-End Deployment Test (D11)

1. Trigger a test deploy via `node scripts/retrigger-adapter-deploy.js`
2. Watch Inngest dashboard: `auto-deploy-adapter` completes Steps 1–7
3. New step `emit-worker-refresh` emits `pipeline/adapter.deployed`
4. `refresh-inference-workers` runs its 6 steps
5. `pipeline_inference_endpoints.status` transitions: `deploying` → `ready`
6. Behavior Chat page shows correct status throughout

### 8.4 Inference Service Comment Update (D12 — Change 9)

**File: `src/lib/services/inference-service.ts`**

Add/expand the comment block at the top:

```typescript
/**
 * INFERENCE_MODE Configuration
 *
 * "serverless" (default):
 *   - Uses RunPod Serverless vLLM endpoints
 *   - Workers auto-scale (workersMin/workersMax)
 *   - Adapters loaded via LORA_MODULES env var at worker cold-start
 *   - Cost: pay per second of active compute
 *   - Endpoint URL: INFERENCE_API_URL (e.g. https://api.runpod.ai/v2/780tauhj7c126b)
 *   - Shared by BOTH Pipeline adapter testing AND RAG LoRA queries
 *
 * "pods" (permanent instance):
 *   - Uses dedicated RunPod Pods with direct OpenAI-compatible API
 *   - Requires two separate pods: one for base model, one with adapter loaded
 *   - Adapters loaded via vLLM CLI args (--lora-modules) at pod startup
 *   - Cost: ~$0.50-5.00/hour continuous (GPU-dependent), faster cold-start
 *   - Endpoint URLs: INFERENCE_API_URL (control) + INFERENCE_API_URL_ADAPTED (adapted)
 *   - To add new adapters: restart the adapted pod with updated --lora-modules
 *
 * Switching: Set INFERENCE_MODE env var in Vercel + .env.local
 */
```

---

## 9. Implementation Checklist

Each item below is an atomic work unit. Check them off as you complete them.

### Phase 0: Pre-Work
- [ ] **P0-1:** Update `dialog.tsx` — overlay to `bg-black/80 backdrop-blur-sm`, content to `bg-zinc-900 text-zinc-50 border-zinc-700`
- [ ] **P0-2:** Update `alert-dialog.tsx` — same overlay and content changes
- [ ] **P0-3:** Create `scripts/test-worker-refresh.ts` (Section 4.18)
- [ ] **P0-4:** Validate test script runs: `npx tsx scripts/test-worker-refresh.ts`

### Phase 1: Database + Foundation
- [ ] **P1-1:** Create `workbases` table via SAOL (Section 4.1)
- [ ] **P1-2:** Verify `workbases` table with `agentIntrospectSchema`
- [ ] **P1-3:** Create `conversation_comments` table via SAOL (Section 4.2)
- [ ] **P1-4:** Verify `conversation_comments` table
- [ ] **P1-5:** Add `workbase_id` FK column to `conversations` (Section 4.3)
- [ ] **P1-6:** Add `workbase_id` FK column to `training_files`
- [ ] **P1-7:** Add `workbase_id` FK column to `pipeline_training_jobs`
- [ ] **P1-8:** Create indexes on all 3 new FK columns (Section 4.3) — use `transaction: false` for CONCURRENTLY
- [ ] **P1-9:** Run data migration script (Section 4.4) — migrate `rag_knowledge_bases` rows to `workbases`
- [ ] **P1-10:** Rename `knowledge_base_id` → `workbase_id` on 5 RAG tables (Section 4.4)
- [ ] **P1-11:** Add FK constraint `fk_rag_documents_workbase` (Section 4.4)
- [ ] **P1-12:** Drop `rag_knowledge_bases` table (Section 4.5)
- [ ] **P1-13:** Create `src/types/workbase.ts` (Section 4.7)
- [ ] **P1-14:** Update `src/types/rag.ts` — rename all `knowledgeBaseId` → `workbaseId` (Section 4.6.1)
- [ ] **P1-15:** Update RAG services (6 files) — `knowledge_base_id` → `workbase_id` (Section 4.6.2)
- [ ] **P1-16:** Delete `src/app/api/rag/knowledge-bases/route.ts`
- [ ] **P1-17:** Create `src/app/api/workbases/route.ts` (Section 4.8)
- [ ] **P1-18:** Create `src/app/api/workbases/[id]/route.ts` (Section 4.9)
- [ ] **P1-19:** Create `src/app/api/conversations/[id]/comments/route.ts` (Section 4.10)
- [ ] **P1-20:** Create `src/app/api/conversations/[id]/comments/[commentId]/route.ts` (Section 4.10)
- [ ] **P1-21:** Create `src/hooks/useWorkbases.ts` (Section 4.11)
- [ ] **P1-22:** Create `src/hooks/useConversationComments.ts` (Section 4.12)
- [ ] **P1-23:** Delete `src/hooks/useRAGKnowledgeBases.ts`
- [ ] **P1-24:** Update `src/hooks/useRAGDocuments.ts` — `knowledgeBaseId` → `workbaseId` (Section 4.6.4)
- [ ] **P1-25:** Update `src/hooks/useRAGChat.ts` — `knowledgeBaseId` → `workbaseId` (Section 4.6.4)
- [ ] **P1-26:** Delete `src/components/rag/CreateKnowledgeBaseDialog.tsx`
- [ ] **P1-27:** Delete `src/components/rag/KnowledgeBaseDashboard.tsx`
- [ ] **P1-28:** Update `src/components/rag/DocumentUploader.tsx` — props `knowledgeBaseId` → `workbaseId` (Section 4.6.5)
- [ ] **P1-29:** Update `src/components/rag/RAGChat.tsx` — props `knowledgeBaseId` → `workbaseId` (Section 4.6.5)
- [ ] **P1-30:** Update `src/inngest/client.ts` — add 2 new event types (Section 4.13)
- [ ] **P1-31:** Modify `src/inngest/functions/auto-deploy-adapter.ts` — 3 changes (Section 4.14)
- [ ] **P1-32:** Create `src/inngest/functions/refresh-inference-workers.ts` (Section 4.15)
- [ ] **P1-33:** Create `src/inngest/functions/auto-enrich-conversation.ts` (Section 4.16)
- [ ] **P1-34:** Update `src/inngest/functions/index.ts` — register 2 new functions (Section 4.17)
- [ ] **P1-35:** Update `src/lib/services/inference-service.ts` — add INFERENCE_MODE comment (Section 8.4)

### Phase 2: Route Structure + Layout
- [ ] **P2-1:** Create sidebar layout `src/app/(dashboard)/workbase/[id]/layout.tsx` (Section 5.2)
- [ ] **P2-2:** Create home page `src/app/(dashboard)/home/page.tsx` (Section 5.3)
- [ ] **P2-3:** Create overview page `src/app/(dashboard)/workbase/[id]/page.tsx` (Section 5.4)
- [ ] **P2-4:** Create settings page `src/app/(dashboard)/workbase/[id]/settings/page.tsx` (Section 5.5)
- [ ] **P2-5:** Redirect `/dashboard` to `/home` (Section 5.6)

### Phase 3: Fine Tuning Pages
- [ ] **P3-1:** Create conversations page `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` (Section 6.1)
- [ ] **P3-2:** Create training sets API `src/app/api/workbase/[id]/training-sets/route.ts` (Section 6.1)
- [ ] **P3-3:** Create `src/hooks/useTrainingSets.ts` (Section 6.1)
- [ ] **P3-4:** Create conversation detail page `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/[convId]/page.tsx` (Section 6.2)
- [ ] **P3-5:** Create launch tuning page `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` (Section 6.3)
- [ ] **P3-6:** Create behavior chat page `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx` (Section 6.4)
- [ ] **P3-7:** Update `ModeSelector` — add `disabledModes` prop (Section 6.4)
- [ ] **P3-8:** Update `MultiTurnChat` — add `workbaseId` prop path (Section 6.4)

### Phase 4: Fact Training Pages
- [ ] **P4-1:** Create documents page `src/app/(dashboard)/workbase/[id]/fact-training/documents/page.tsx` (Section 7.1)
- [ ] **P4-2:** Create document detail page `src/app/(dashboard)/workbase/[id]/fact-training/documents/[docId]/page.tsx` (Section 7.2)
- [ ] **P4-3:** Create fact training chat page `src/app/(dashboard)/workbase/[id]/fact-training/chat/page.tsx` (Section 7.3)
- [ ] **P4-4:** Create quality page `src/app/(dashboard)/workbase/[id]/fact-training/quality/page.tsx` (Section 7.4)
- [ ] **P4-5:** Update RAG API routes — query params `knowledgeBaseId` → `workbaseId`

### Phase 5: Polish + Testing
- [ ] **P5-1:** Add empty states to all pages (Section 8.2)
- [ ] **P5-2:** E2E deployment test (Section 8.3)
- [ ] **P5-3:** Verify all Identity Spine compliance (user_id FK, RLS, indexes on every new table)
- [ ] **P5-4:** Build and deploy to verify no compilation errors

---

## 10. Warnings (Read Before Implementing)

1. **Do NOT use SAOL for application DB operations.** Inngest functions and API routes use `createServerSupabaseAdminClient()` from `@/lib/supabase-server`. SAOL is for agent terminal/script operations only.

2. **Do NOT change the RunPod GraphQL URL or auth pattern.** The existing code uses `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}` (API key as query param, no Authorization header). Do not switch to Bearer auth — the RunPod GraphQL API uses query param auth.

3. **Do NOT set `workersMin` to a hardcoded value** in `refreshInferenceWorkers`. Always use `originalWorkersMin` from the event data.

4. **Do NOT make the adapter verification step (Step 5 of refresh) fatal.** Log a warning and continue. The adapter may take a few seconds to load.

5. **Do NOT remove Step 5 (`vllm-hot-reload`) from `auto-deploy-adapter`.** Keep it as-is (non-fatal).

6. **Do NOT run the GraphQL `saveEndpoint` mutation without passing ALL original endpoint fields.** RunPod replaces the entire endpoint config. Always fetch first, then pass all fields back with only changed values modified.

7. **Do NOT increase `workersMax` beyond its current value.** Only `workersMin` and `MAX_LORAS` are changed.

8. **Do NOT create the RunPod endpoint programmatically.** The research deliverable (test script section) is documentation only.

9. **Do NOT use `CREATE INDEX CONCURRENTLY` inside a transaction.** PostgreSQL does not support this. Use `transaction: false` in SAOL for concurrent index creation.

10. **API route ownership check: return 404, never 403.** Do not reveal the existence of resources owned by other users. Always filter by `user_id = user.id` and return 404 if no rows match.

---

## 11. File Index (All New/Modified Files)

### New Files (28)

| # | File Path | Type | Phase |
|---|-----------|------|-------|
| 1 | `src/types/workbase.ts` | Types | P1 |
| 2 | `src/app/api/workbases/route.ts` | API | P1 |
| 3 | `src/app/api/workbases/[id]/route.ts` | API | P1 |
| 4 | `src/app/api/conversations/[id]/comments/route.ts` | API | P1 |
| 5 | `src/app/api/conversations/[id]/comments/[commentId]/route.ts` | API | P1 |
| 6 | `src/hooks/useWorkbases.ts` | Hook | P1 |
| 7 | `src/hooks/useConversationComments.ts` | Hook | P1 |
| 8 | `src/inngest/functions/refresh-inference-workers.ts` | Inngest | P1 |
| 9 | `src/inngest/functions/auto-enrich-conversation.ts` | Inngest | P1 |
| 10 | `scripts/test-worker-refresh.ts` | Script | P0 |
| 11 | `src/app/(dashboard)/home/page.tsx` | Page | P2 |
| 12 | `src/app/(dashboard)/workbase/[id]/layout.tsx` | Layout | P2 |
| 13 | `src/app/(dashboard)/workbase/[id]/page.tsx` | Page | P2 |
| 14 | `src/app/(dashboard)/workbase/[id]/settings/page.tsx` | Page | P2 |
| 15 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Page | P3 |
| 16 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/[convId]/page.tsx` | Page | P3 |
| 17 | `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | Page | P3 |
| 18 | `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx` | Page | P3 |
| 19 | `src/app/(dashboard)/workbase/[id]/fact-training/documents/page.tsx` | Page | P4 |
| 20 | `src/app/(dashboard)/workbase/[id]/fact-training/documents/[docId]/page.tsx` | Page | P4 |
| 21 | `src/app/(dashboard)/workbase/[id]/fact-training/chat/page.tsx` | Page | P4 |
| 22 | `src/app/(dashboard)/workbase/[id]/fact-training/quality/page.tsx` | Page | P4 |
| 23 | `src/hooks/useTrainingSets.ts` | Hook | P3 |
| 24 | `src/app/api/workbase/[id]/training-sets/route.ts` | API | P3 |

### Modified Files (20)

| # | File Path | Changes | Phase |
|---|-----------|---------|-------|
| 1 | `src/components/ui/dialog.tsx` | Overlay + content bg/text/border classes | P0 |
| 2 | `src/components/ui/alert-dialog.tsx` | Overlay + content bg/text/border classes | P0 |
| 3 | `src/types/rag.ts` | All `knowledgeBaseId` → `workbaseId`, remove KB types | P1 |
| 4 | `src/lib/rag/services/rag-db-mappers.ts` | `knowledge_base_id` → `workbase_id` | P1 |
| 5 | `src/lib/rag/services/rag-ingestion-service.ts` | Column name change | P1 |
| 6 | `src/lib/rag/services/rag-retrieval-service.ts` | Column name change | P1 |
| 7 | `src/lib/rag/services/rag-embedding-service.ts` | Column name change | P1 |
| 8 | `src/lib/rag/services/rag-expert-qa-service.ts` | Column name change | P1 |
| 9 | `src/lib/rag/services/rag-quality-service.ts` | Column name change | P1 |
| 10 | `src/hooks/useRAGDocuments.ts` | `knowledgeBaseId` → `workbaseId` | P1 |
| 11 | `src/hooks/useRAGChat.ts` | `knowledgeBaseId` → `workbaseId` | P1 |
| 12 | `src/components/rag/DocumentUploader.tsx` | Props `knowledgeBaseId` → `workbaseId` | P1 |
| 13 | `src/components/rag/RAGChat.tsx` | Props `knowledgeBaseId` → `workbaseId` | P1 |
| 14 | `src/components/rag/ModeSelector.tsx` | Add `disabledModes` prop | P3 |
| 15 | `src/components/pipeline/chat/MultiTurnChat.tsx` | Add `workbaseId` prop | P3 |
| 16 | `src/inngest/client.ts` | Add 2 event types | P1 |
| 17 | `src/inngest/functions/auto-deploy-adapter.ts` | Step 4 returns, Step 4b emit, Step 6 status | P1 |
| 18 | `src/inngest/functions/index.ts` | Register 2 new functions | P1 |
| 19 | `src/lib/services/inference-service.ts` | Add INFERENCE_MODE comment block | P1 |
| 20 | `src/app/(dashboard)/dashboard/page.tsx` | Redirect to /home | P2 |

### Deleted Files (4)

| # | File Path | Reason | Phase |
|---|-----------|--------|-------|
| 1 | `src/app/api/rag/knowledge-bases/route.ts` | Replaced by `/api/workbases/` | P1 |
| 2 | `src/hooks/useRAGKnowledgeBases.ts` | Replaced by `useWorkbases.ts` | P1 |
| 3 | `src/components/rag/CreateKnowledgeBaseDialog.tsx` | Replaced by Home page dialog | P1 |
| 4 | `src/components/rag/KnowledgeBaseDashboard.tsx` | Replaced by Home page Work Base list | P1 |

---

*End of Specification*
