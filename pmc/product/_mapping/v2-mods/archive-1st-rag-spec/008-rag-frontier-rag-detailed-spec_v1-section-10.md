## SECTION 10: Chunks Module Replacement & System Integration

**Extension Status**: REPLACE existing chunks module pages/routes + UPDATE navigation + NEW integration verification checklist

---

### Overview

This section completes the Frontier RAG module integration by removing the deprecated chunks module, updating navigation and routing to point to the new RAG module, and providing a comprehensive integration verification checklist that confirms every component across all 10 sections works together end-to-end.

**User value delivered:**
- Clean codebase with no dead/deprecated chunks pages
- Root URL (`/`) redirects to the new RAG dashboard instead of the old chunks dashboard
- Navigation updated to reflect the new feature set
- Confidence that the full system works via a structured verification checklist
- Complete environment variable documentation for onboarding

**What already exists (being removed):**
- `/dashboard` page -- chunks dashboard (`src/app/(dashboard)/dashboard/page.tsx`)
- `/upload` page -- chunks upload (`src/app/(dashboard)/upload/page.tsx`)
- Chunks API routes under `src/app/api/chunks/` (8 route files)
- `next.config.js` root redirect to `/dashboard`

**What already exists (being kept -- DO NOT DELETE):**
- `/pipeline/` pages and all sub-routes (training pipeline)
- `/pipeline/chat/` (multi-turn chat testing)
- `/api/pipeline/` routes (all pipeline API routes)
- `/conversations/`, `/datasets/`, `/models/`, `/training/`, `/batch-jobs/`, `/bulk-generator/`, `/costs/`, `/training-files/` (all existing feature pages)
- Dashboard layout (`src/app/(dashboard)/layout.tsx`)

**What is being added (new):**
- Updated `next.config.js` redirect (from `/dashboard` to `/rag`)
- Integration verification checklist
- Environment variable documentation

### Dependencies

- **Codebase Prerequisites**: All previous sections (1-9) must be implemented and functional
- **Previous Section Prerequisites**: Section 8 (RAG pages must exist at `/rag/*` before redirect is changed), Section 9 (quality system must work for end-to-end verification)

---

### Features & Requirements

#### FR-10.1: Delete Chunks Module Pages and Routes

**Type**: Codebase Cleanup

**Description**: Remove all chunks module pages and API routes that are being replaced by the Frontier RAG module. Each file is listed with its full path and a safety analysis confirming no other features depend on it.

**Implementation Strategy**: REPLACE existing (delete old, new RAG pages from Section 8 replace them)

---

##### Files to Delete: Dashboard Pages

**1. Chunks Dashboard Page**

**File to delete**: `src/app/(dashboard)/dashboard/page.tsx`

- **What it does**: Displays the "Document Categorization" landing page with links to upload, conversations, training files, and pipeline. This is the old chunks workflow entry point.
- **Safety analysis**: This page is the chunks module's main dashboard. It imports `DocumentSelectorServer` from the chunks module. No other feature pages link to or depend on this page. The root redirect (`/` -> `/dashboard`) will be updated to point to `/rag` instead.
- **Replaced by**: `src/app/(dashboard)/rag/page.tsx` (Section 8, FR-8.1 -- RAG Dashboard)
- **Verdict**: SAFE TO DELETE

**2. Chunks Upload Page**

**File to delete**: `src/app/(dashboard)/upload/page.tsx`

- **What it does**: Upload interface for the chunks workflow. Uses `UploadDropzone`, `UploadQueue`, and `UploadStats` components from `src/components/upload/`.
- **Safety analysis**: This page is exclusively for the chunks upload workflow. The upload components it imports (`upload-dropzone`, `upload-queue`, `upload-stats`) are chunks-specific and not used by any other feature. No pipeline or training features reference this page.
- **Replaced by**: `src/app/(dashboard)/rag/upload/page.tsx` (Section 8, FR-8.2 -- Document Upload page)
- **Verdict**: SAFE TO DELETE

**Note on `/workflow/[id]/stage1/page.tsx` and `/chunks/[id]/page.tsx`**: These files were listed in the master spec as candidates for deletion. However, they do **not exist** in the current codebase (verified via glob search). The workflow and chunks detail pages were likely removed in a previous cleanup. No action needed for these paths.

##### Files to Delete: API Routes

**3. Chunks API Route Group**

All 8 files under `src/app/api/chunks/` are chunks-specific and must be deleted:

| # | File to Delete | What It Does | Safety Analysis |
|---|---------------|--------------|-----------------|
| 3a | `src/app/api/chunks/route.ts` | Main chunks CRUD endpoint | Chunks-only. No pipeline or RAG references. SAFE TO DELETE |
| 3b | `src/app/api/chunks/extract/route.ts` | Text extraction for chunks workflow | Chunks-only. RAG module has its own extraction in Section 3. SAFE TO DELETE |
| 3c | `src/app/api/chunks/dimensions/route.ts` | Chunk dimension metadata | Chunks-only. Not used by any other feature. SAFE TO DELETE |
| 3d | `src/app/api/chunks/generate-dimensions/route.ts` | Generate dimension data for chunks | Chunks-only. Not used by any other feature. SAFE TO DELETE |
| 3e | `src/app/api/chunks/regenerate/route.ts` | Regenerate chunks | Chunks-only. Not used by any other feature. SAFE TO DELETE |
| 3f | `src/app/api/chunks/runs/route.ts` | Chunk processing run management | Chunks-only. Not used by any other feature. SAFE TO DELETE |
| 3g | `src/app/api/chunks/status/route.ts` | Chunk processing status | Chunks-only. Not used by any other feature. SAFE TO DELETE |
| 3h | `src/app/api/chunks/templates/route.ts` | Chunk templates | Chunks-only. Not used by any other feature. SAFE TO DELETE |

**Replaced by**: 10 new API routes under `src/app/api/rag/` (Section 6, FR-6.1 through FR-6.10)

##### Files to Potentially Clean Up (Optional, Not Blocking)

These files are chunks-related components that are no longer referenced after deleting the pages above. They can be cleaned up in a follow-up pass but are not blocking:

- `src/components/upload/upload-dropzone.tsx` -- Used only by deleted `/upload` page
- `src/components/upload/upload-queue.tsx` -- Used only by deleted `/upload` page
- `src/components/upload/upload-stats.tsx` -- Used only by deleted `/upload` page
- `src/components/server/DocumentSelectorServer.tsx` -- Used only by deleted `/dashboard` page

**Recommendation**: Delete these in a separate commit after verifying no other imports reference them. Run `grep -r "upload-dropzone\|upload-queue\|upload-stats\|DocumentSelectorServer" src/` to confirm before deletion.

##### Complete Deletion Command

```bash
# From the src/ directory of the project
# Step 1: Delete chunks dashboard page
rm src/app/\(dashboard\)/dashboard/page.tsx

# Step 2: Delete chunks upload page
rm src/app/\(dashboard\)/upload/page.tsx

# Step 3: Delete all chunks API routes
rm -rf src/app/api/chunks/

# Step 4 (optional): Delete orphaned chunks components
# Only after verifying no other imports reference them:
# rm src/components/upload/upload-dropzone.tsx
# rm src/components/upload/upload-queue.tsx
# rm src/components/upload/upload-stats.tsx
# rm src/components/server/DocumentSelectorServer.tsx
```

---

**Acceptance Criteria**:

1. `src/app/(dashboard)/dashboard/page.tsx` no longer exists
2. `src/app/(dashboard)/upload/page.tsx` no longer exists
3. The entire `src/app/api/chunks/` directory no longer exists
4. No TypeScript compilation errors after deletion (run `npx tsc --noEmit`)
5. All pipeline pages still function (`/pipeline/*`, `/pipeline/chat/*`)
6. All existing feature pages still function (`/conversations`, `/datasets`, `/models`, `/training`, `/batch-jobs`, `/bulk-generator`, `/costs`, `/training-files`)
7. No console errors in the browser when navigating to remaining pages

**Verification Steps**:

1. Delete the files using the commands above
2. Run `npx tsc --noEmit` from `src/` to verify no compilation errors
3. Start the dev server (`npm run dev`) and navigate to each existing page to confirm they load
4. Navigate to `/dashboard` -- should show a 404 (page deleted)
5. Navigate to `/upload` -- should show a 404 (page deleted)
6. Navigate to `/api/chunks` -- should show a 404 (routes deleted)
7. Navigate to `/pipeline/configure` -- should load normally (NOT deleted)
8. Navigate to `/pipeline/jobs` -- should load normally (NOT deleted)

---

#### FR-10.2: Update Navigation and Routing

**Type**: Configuration Change

**Description**: Update the root redirect in `next.config.js` to point to the new RAG dashboard instead of the deleted chunks dashboard. Update any navigation components or sidebar links to include RAG pages and remove chunks references.

**Implementation Strategy**: REPLACE existing

---

> **HUMAN ACTION REQUIRED**
>
> **What:** Update root redirect in `next.config.js` from `/dashboard` to `/rag`
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\src\next.config.js`
> **Values:** Change `destination: '/dashboard'` to `destination: '/rag'`
> **Why:** The old chunks dashboard (`/dashboard`) is being deleted. The new RAG dashboard at `/rag` becomes the default landing page.

---

**File**: `src/next.config.js`

Current code (lines 7-15):
```javascript
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },
```

Updated code:
```javascript
  async redirects() {
    return [
      {
        source: '/',
        destination: '/rag',
        permanent: false,
      },
    ]
  },
```

**Change summary**: Only the `destination` value changes from `'/dashboard'` to `'/rag'`. No other changes to `next.config.js`.

---

##### Navigation Component Updates

The current dashboard layout (`src/app/(dashboard)/layout.tsx`) is a minimal auth-guard wrapper with no sidebar navigation. Individual pages handle their own navigation (e.g., the dashboard page had buttons linking to `/conversations`, `/training-files`, etc.).

The new RAG module introduces its own `RAGLayout` component (Section 8, FR-8.15) that provides sidebar navigation for RAG pages. This layout is nested under the dashboard layout:

```
src/app/(dashboard)/layout.tsx          <-- Auth guard (existing, no changes needed)
  src/app/(dashboard)/rag/layout.tsx    <-- RAG sidebar navigation (Section 8, new)
    src/app/(dashboard)/rag/page.tsx    <-- RAG Dashboard
    src/app/(dashboard)/rag/upload/...  <-- Upload
    src/app/(dashboard)/rag/chat/...    <-- Chat
    src/app/(dashboard)/rag/quality/... <-- Quality
```

**No changes are needed to the existing dashboard layout.** The RAG layout from Section 8 handles its own navigation. Existing pages (pipeline, conversations, etc.) continue to work with their own navigation patterns.

---

**Acceptance Criteria**:

1. Navigating to `/` redirects to `/rag` (not `/dashboard`)
2. The redirect is non-permanent (`permanent: false`) so browsers do not cache it
3. The RAG dashboard loads when visiting `/rag`
4. No changes were made to the dashboard layout auth guard
5. Existing pages that are NOT part of the RAG module continue to work at their current URLs

**Verification Steps**:

1. Update `next.config.js` as shown above
2. Restart the dev server (`npm run dev`)
3. Open the browser to `http://localhost:3000/`
4. Verify redirect to `http://localhost:3000/rag`
5. Verify the RAG dashboard page loads
6. Navigate to `http://localhost:3000/pipeline/jobs` -- verify it still works
7. Navigate to `http://localhost:3000/conversations` -- verify it still works

---

#### FR-10.3: Integration Verification Checklist

**Type**: Testing / Verification

**Description**: A comprehensive checklist covering every integration point across all 10 sections. This checklist should be run through completely after implementing all sections to confirm the system works end-to-end.

**Implementation Strategy**: NEW (verification artifact, not code)

---

##### Database Integration

- [ ] pgvector extension is enabled (`SELECT extname FROM pg_extension WHERE extname = 'vector'` returns 1 row)
- [ ] All 8 `rag_*` tables exist (`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'rag_%'` returns 8 rows)
- [ ] RLS is active on all 8 tables (`SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'rag_%' AND relkind = 'r'` -- all show `true`)
- [ ] Each table has SELECT, INSERT, UPDATE, DELETE policies (32 policies total)
- [ ] HNSW vector index exists on `rag_embeddings.embedding`
- [ ] `match_rag_embeddings` function exists for vector similarity search (if created in Section 5)
- [ ] `update_updated_at` triggers function on mutable tables (5 triggers for `rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_expert_questions`)
- [ ] Foreign key cascades work: deleting a knowledge base removes all related documents, sections, facts, questions, embeddings, queries, and quality scores
- [ ] `rag_quality_scores` columns enforce 0.00-1.00 range via CHECK constraints

##### Storage Integration

- [ ] `rag-documents` storage bucket exists in Supabase Storage
- [ ] Bucket is private (not public)
- [ ] File size limit is set to 100MB
- [ ] MIME type restrictions are active (PDF, DOCX, TXT, MD only)
- [ ] Upload a test PDF -- file appears at `{user_id}/{doc_id}/{filename}.pdf`
- [ ] Download the test PDF via Supabase Storage signed URL -- file is intact
- [ ] Storage RLS policies enforce user-folder isolation (user A cannot read user B's files)
- [ ] File paths stored in `rag_documents.file_path` are storage paths, not URLs

##### API Integration

- [ ] `POST /api/rag/documents` -- Upload and create document (returns 201 with document object)
- [ ] `GET /api/rag/documents` -- List documents (returns array of document objects)
- [ ] `POST /api/rag/documents/[id]/process` -- Trigger processing (returns 200 with processing status)
- [ ] `GET /api/rag/documents/[id]/questions` -- Get expert questions (returns array)
- [ ] `POST /api/rag/documents/[id]/questions` -- Submit answers (returns updated questions)
- [ ] `POST /api/rag/documents/[id]/verify` -- Generate verification samples (returns samples)
- [ ] `POST /api/rag/query` -- Query the knowledge base (returns response with citations)
- [ ] `GET /api/rag/quality` -- Get quality metrics (returns aggregated metrics)
- [ ] `GET /api/rag/documents/[id]` -- Get document details (returns single document)
- [ ] `DELETE /api/rag/documents/[id]` -- Delete document (returns 200 confirmation)
- [ ] All routes return 401 for unauthenticated requests
- [ ] All routes validate required fields and return 400 for invalid input
- [ ] Response format is consistent: `{ success: true, data: ... }` or `{ success: false, error: ... }`
- [ ] Error responses include meaningful error messages

##### UI Integration

- [ ] RAG Dashboard (`/rag`) loads and displays document list or empty state
- [ ] Document Upload (`/rag/upload`) allows file selection and upload
- [ ] Upload progress indicator shows during file upload
- [ ] Processing status updates in real-time (or on polling)
- [ ] Expert Q&A page (`/rag/documents/[id]/questions`) displays generated questions
- [ ] Expert can type answers and submit them
- [ ] "Skip Q&A" (fast mode) button works and skips to chat
- [ ] RAG Chat (`/rag/chat`) loads with mode selector
- [ ] Mode selector allows switching between RAG Only, LoRA Only, and RAG + LoRA
- [ ] Chat input accepts text and sends queries
- [ ] Chat responses display with citations (source references)
- [ ] Quality Dashboard (`/rag/quality`) displays composite score, per-metric scores, and trend chart
- [ ] Mode comparison card shows side-by-side data for all three modes
- [ ] Query history table shows recent queries with their scores
- [ ] Navigation sidebar (RAG layout) links to all RAG pages
- [ ] Navigating between RAG pages preserves state (via Zustand store)

##### Provider Integration

- [ ] Claude LLM provider is functional (`getLLMProvider()` returns a working Claude implementation)
- [ ] LLM provider can call Claude Sonnet for document reading (200K context)
- [ ] LLM provider can call Claude Haiku for quality evaluation (fast, cheap)
- [ ] OpenAI embedding provider is functional (`getEmbeddingProvider()` returns a working OpenAI implementation)
- [ ] Embedding provider generates 1536-dimension vectors from text
- [ ] Provider factory returns correct implementations based on env vars (`LLM_PROVIDER`, `EMBEDDING_PROVIDER`)
- [ ] Default providers work without setting optional env vars (Claude + OpenAI are defaults)

##### End-to-End Flows

**Flow 1: Full Flow (with Expert Q&A)**
- [ ] Upload a PDF document via `/rag/upload`
- [ ] Document appears in the dashboard with "pending" status
- [ ] Trigger processing -- status changes to "processing"
- [ ] Processing completes -- status changes to "needs_questions" (or "ready" if fast mode)
- [ ] Navigate to Expert Q&A page -- 3-8 questions are displayed
- [ ] Answer all questions and submit
- [ ] Document status changes to "ready"
- [ ] Navigate to Chat page
- [ ] Ask a question in "RAG Only" mode -- get a response with citations
- [ ] Ask the same question in "LoRA Only" mode -- get a response (may be lower quality)
- [ ] Ask the same question in "RAG + LoRA" mode -- get a response (should be highest quality)
- [ ] Navigate to Quality Dashboard -- all three responses have quality scores
- [ ] Mode comparison shows three modes with different average scores
- [ ] The composite score is visible and makes intuitive sense

**Flow 2: Fast Mode (skip Expert Q&A)**
- [ ] Upload a document with fast mode enabled
- [ ] Trigger processing -- status goes directly to "ready" (skips "needs_questions")
- [ ] Navigate to Chat -- can ask questions immediately
- [ ] Quality scores are computed for responses

**Flow 3: All Three Modes Produce Responses**
- [ ] RAG Only: Response uses retrieved context (citations present)
- [ ] LoRA Only: Response uses the fine-tuned LoRA model (no citations, uses inference service)
- [ ] RAG + LoRA: Response uses both retrieved context and LoRA model
- [ ] All three modes have quality scores computed and stored

**Flow 4: Quality Measurement**
- [ ] After multiple queries, quality scores are visible on the dashboard
- [ ] Trend chart shows quality over time
- [ ] Per-metric breakdown shows 5 individual scores
- [ ] Mode comparison shows improvement percentages
- [ ] Query history table is populated and sortable

##### Cleanup Verification

- [ ] `/dashboard` returns 404 (page deleted)
- [ ] `/upload` returns 404 (page deleted)
- [ ] `/api/chunks/*` returns 404 (routes deleted)
- [ ] `/` redirects to `/rag` (not `/dashboard`)
- [ ] No TypeScript compilation errors (`npx tsc --noEmit` passes)
- [ ] No console errors when navigating the application
- [ ] Pipeline features still work (`/pipeline/configure`, `/pipeline/jobs`, `/pipeline/jobs/[id]/chat`)
- [ ] Other existing features still work (`/conversations`, `/datasets`, `/models`, `/training`)

---

**Acceptance Criteria**:

1. Every checkbox in the integration verification checklist has been tested
2. All end-to-end flows complete without errors
3. No existing features are broken by the chunks module removal
4. The checklist is structured by category (Database, Storage, API, UI, Provider, E2E, Cleanup)

**Verification Steps**:

1. Print or copy the checklist
2. Work through each item sequentially after all sections are implemented
3. Mark each item as pass/fail
4. Any failing item must be resolved before the module is considered complete
5. Re-run failing items after fixes until all pass

---

#### FR-10.4: Environment Variable Documentation

**Type**: Documentation

**Description**: Complete list of all environment variables needed for the Frontier RAG module, including which ones already exist, which must be added, and which have defaults.

**Implementation Strategy**: NEW (documentation artifact)

---

##### Existing Environment Variables (Already Configured)

These variables already exist in `.env.local` and are used by the existing application. The RAG module reuses them -- no changes needed.

```bash
# Supabase Configuration (used by all features)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key for client-side Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Service role key for server-side admin operations

# Anthropic API (used by conversation generation + RAG module)
ANTHROPIC_API_KEY=sk-ant-...           # Claude API key for LLM operations
```

**Used by RAG module for:**
- Supabase client initialization (all database and storage operations)
- Claude API calls (document reading, question generation, response generation, quality evaluation)

##### New Environment Variables (Must Be Added)

These variables must be added to `.env.local` before the RAG module will function.

```bash
# OpenAI API (NEW -- required for embedding generation)
OPENAI_API_KEY=sk-...
# Obtain from: https://platform.openai.com/api-keys
# Used by: OpenAI Embedding Provider (text-embedding-3-small)
# Cost: ~$0.02 per 1M tokens (very cheap)
# Note: Server-side only. Do NOT add NEXT_PUBLIC_ prefix.

# Database URL (NEW -- required for SAOL pg transport operations)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# Obtain from: Supabase Dashboard -> Settings -> Database -> Connection string -> URI
# Used by: SAOL agentIntrospectSchema, agentExecuteDDL
# Note: Use the pooled connection string (port 6543), not direct (port 5432)
```

##### Optional Environment Variables (Defaults Exist)

These variables have sensible defaults and do not need to be set unless you want to override the default behavior.

```bash
# LLM Provider Selection (optional -- defaults to 'claude')
LLM_PROVIDER=claude
# Options: 'claude' (default)
# Future: 'gemini', 'openai' (Phase 2+)
# Used by: getLLMProvider() factory function

# Embedding Provider Selection (optional -- defaults to 'openai')
EMBEDDING_PROVIDER=openai
# Options: 'openai' (default)
# Future: 'bge-m3' (self-hosted, Phase 2+)
# Used by: getEmbeddingProvider() factory function
```

##### Environment Variable Summary Table

| Variable | Status | Required | Default | Used By |
|----------|--------|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Existing | Yes | -- | Supabase client (all operations) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing | Yes | -- | Supabase client (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing | Yes | -- | Supabase admin client (server-side) |
| `ANTHROPIC_API_KEY` | Existing | Yes | -- | Claude LLM provider (reading, generation, evaluation) |
| `OPENAI_API_KEY` | **New** | Yes | -- | OpenAI embedding provider (text-embedding-3-small) |
| `DATABASE_URL` | **New** | Yes | -- | SAOL pg transport (schema introspection, DDL) |
| `LLM_PROVIDER` | **New** | No | `claude` | LLM provider factory |
| `EMBEDDING_PROVIDER` | **New** | No | `openai` | Embedding provider factory |

##### Security Notes

- `OPENAI_API_KEY` is server-side only. It must NOT have the `NEXT_PUBLIC_` prefix. Embedding generation happens exclusively in API routes, never in client-side code.
- `DATABASE_URL` contains the database password. Never expose it to the client.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS -- used only by `createServerSupabaseAdminClient()`. The RAG module uses the regular Supabase client with RLS for all user-facing operations.

---

**Acceptance Criteria**:

1. All required environment variables are documented with their source and purpose
2. New variables (`OPENAI_API_KEY`, `DATABASE_URL`) are clearly distinguished from existing ones
3. Optional variables have documented defaults
4. Security notes explain which variables must remain server-side only
5. The summary table provides a quick reference for all variables

**Verification Steps**:

1. Open `.env.local` and verify all required variables are present
2. Verify `OPENAI_API_KEY` does NOT have `NEXT_PUBLIC_` prefix
3. Verify `DATABASE_URL` uses the pooled connection string (port 6543)
4. Start the dev server and verify no "missing env var" errors in the console
5. Test the embedding provider: make a test API call that generates embeddings -- verify it succeeds
6. Test the LLM provider: make a test API call that calls Claude -- verify it succeeds

---

### Section Summary

**What Was Added:**
- Updated `next.config.js` root redirect (`/` -> `/rag` instead of `/` -> `/dashboard`)
- Integration verification checklist (70+ items across 7 categories)
- Environment variable documentation (8 variables total: 4 existing, 2 new required, 2 new optional)

**What Was Removed:**
- `src/app/(dashboard)/dashboard/page.tsx` -- Old chunks dashboard page
- `src/app/(dashboard)/upload/page.tsx` -- Old chunks upload page
- `src/app/api/chunks/route.ts` -- Chunks CRUD endpoint
- `src/app/api/chunks/extract/route.ts` -- Chunks text extraction
- `src/app/api/chunks/dimensions/route.ts` -- Chunks dimension metadata
- `src/app/api/chunks/generate-dimensions/route.ts` -- Chunks dimension generation
- `src/app/api/chunks/regenerate/route.ts` -- Chunks regeneration
- `src/app/api/chunks/runs/route.ts` -- Chunks processing runs
- `src/app/api/chunks/status/route.ts` -- Chunks processing status
- `src/app/api/chunks/templates/route.ts` -- Chunks templates
- **Total: 2 pages + 8 API routes = 10 files deleted**

**What Was Kept (confirmed safe):**
- `src/app/(dashboard)/layout.tsx` -- Dashboard auth guard layout (no changes)
- All `/pipeline/*` pages and routes
- All `/conversations/*`, `/datasets/*`, `/models/*`, `/training/*`, `/batch-jobs/*`, `/bulk-generator/*`, `/costs/*`, `/training-files/*` pages
- All `/api/pipeline/*` routes

**Integration Points:**
- This section depends on ALL previous sections (1-9) being complete
- The redirect change in `next.config.js` depends on Section 8 (RAG pages must exist at `/rag`)
- The integration checklist validates work from every section
- After this section is complete, the entire Frontier RAG module is operational

---

### Human Actions Checklist (Section 10)

| # | Action | Where | Status |
|---|--------|-------|--------|
| 1 | Update root redirect in `next.config.js` | `src/next.config.js` | Change `destination: '/dashboard'` to `destination: '/rag'` |
| 2 | Install `openai` npm package | Terminal in `src/` | Run `npm install openai` |
| 3 | Delete chunks dashboard page | `src/app/(dashboard)/dashboard/page.tsx` | Delete file |
| 4 | Delete chunks upload page | `src/app/(dashboard)/upload/page.tsx` | Delete file |
| 5 | Delete chunks API routes | `src/app/api/chunks/` | Delete entire directory (8 files) |
| 6 | Run TypeScript compilation check | Terminal in `src/` | Run `npx tsc --noEmit` -- must pass with no errors |
| 7 | Run through integration verification checklist | Development environment | Test all 70+ items |

---

### Consolidated Human Actions from All Sections

This is the complete ordered list of all manual steps across the entire specification. Complete them in this order.

| # | Section | Action | Where |
|---|---------|--------|-------|
| 1 | S1 | Enable pgvector extension | Supabase Dashboard -> Database -> Extensions |
| 2 | S1 | Add `DATABASE_URL` to `.env.local` | `.env.local` file |
| 3 | S1 | Run migration SQL (8 tables) | Supabase Dashboard -> SQL Editor |
| 4 | S1 | Create `rag-documents` storage bucket | Supabase Dashboard -> Storage -> New Bucket |
| 5 | S1 | Create storage RLS policies | Supabase Dashboard -> SQL Editor |
| 6 | S2 | Add `OPENAI_API_KEY` to `.env.local` | `.env.local` file |
| 7 | S10 | Install `openai` npm package | Terminal: `npm install openai` |
| 8 | S10 | Delete chunks dashboard page | Delete `src/app/(dashboard)/dashboard/page.tsx` |
| 9 | S10 | Delete chunks upload page | Delete `src/app/(dashboard)/upload/page.tsx` |
| 10 | S10 | Delete chunks API routes directory | Delete `src/app/api/chunks/` |
| 11 | S10 | Update `next.config.js` redirect | Change `/dashboard` to `/rag` |
| 12 | S10 | Run TypeScript compilation check | `npx tsc --noEmit` |
| 13 | S10 | Run integration verification checklist | Test all items |
