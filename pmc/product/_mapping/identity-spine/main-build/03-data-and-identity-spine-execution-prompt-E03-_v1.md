# Data & Identity Spine — Execution Prompt E03: HIGH & MEDIUM Route/Service Fixes

**Version:** 1.0
**Date:** 2026-02-22
**Section:** E03 — HIGH Route & Service Fixes (Phase 5) + MEDIUM Fixes (Phase 6)
**Prerequisites:** E01 (DB migration) + E02 (CRITICAL routes + service layer) must be complete
**Builds Upon:** E01 + E02 artifacts
**Specification Source:** `02-data-and-identity-spine-detailed-specification_v6.md`

---

## Division of Work Across All 4 Prompts

| Prompt | Phases | Description |
|--------|--------|-------------|
| **E01** (complete) | 0, 1, 2, 3 | Preflight verification, auth infrastructure, DB schema migration, data backfill |
| **E02** (complete) | 4 + service layer | CRITICAL route security fixes (C1–C16), batch-job-service & conversation-service refactoring |
| **E03 (this file)** | 5, 6 | HIGH route/service fixes (H1–H15), MEDIUM fixes (M1–M13), RAG gap fixes |
| **E04** | 7, 8 + tests | Database constraints & RLS, cleanup, deprecated code removal, testing |

---

========================


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Verify E01 + E02 artifacts exist** before proceeding (see Preflight section below)

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application.

### Key Codebase Paths

```
v4-show/src/
├── app/api/
│   ├── generation-logs/          # 2 route files (H6)
│   ├── failed-generations/       # 2 route files (H7)
│   ├── templates/                # test route (H5)
│   ├── documents/                # 5 route files (H10, H11)
│   ├── performance/              # 1 route file (H8)
│   ├── training-files/           # route + download (H9, M1)
│   ├── export/                   # remaining export routes (H12–H15)
│   ├── conversations/            # download sub-routes (M12, M13)
│   ├── cron/                     # 5 cron routes (M6)
│   └── categories/               # categories route (cleanup)
├── lib/
│   ├── rag/services/
│   │   ├── rag-ingestion-service.ts  # GAP-R1 fix (1054 lines)
│   │   └── rag-retrieval-service.ts  # GAP-R3 fix (1694 lines)
│   ├── services/
│   │   ├── batch-job-service.ts      # Already updated in E02 (mandatory userId)
│   │   ├── conversation-service.ts   # Already updated in E02 (injected client)
│   │   └── training-file-service.ts  # M7 fix
│   └── supabase-server.ts            # requireAuth, requireAuthOrCron (from E01)
└── inngest/functions/
    └── process-rag-document.ts       # GAP-R2 fix (614 lines)
```

---

## SAOL — Mandatory for All Database Operations

**SAOL is a CLI tool, NOT imported into the codebase.** Use for any SQL DDL/DML operations:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`YOUR_SQL\`,dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## Gold Standard Reference Pattern

```typescript
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;
  // ... scope queries to user.id
}
```

**Status code convention:**
- **Single resource by ID:** Return `404` for non-owned resources
- **Bulk operations:** Skip non-owned; return count
- **Downloads:** Return `404`

---

## E01 + E02 Artifact Verification (Preflight)

Before starting E03 work, verify previous prompts completed:

```bash
# 1. Verify requireAuth is used in CRITICAL routes (E02 artifact)
grep -rn "requireAuth" src/app/api/conversations/route.ts src/app/api/batch-jobs/route.ts src/app/api/pipeline/jobs/ --include="*.ts" | head -10

# 2. Verify batch-job-service has mandatory userId
grep -n "getAllJobs\|getJobById\|cancelJob\|deleteJob" src/lib/services/batch-job-service.ts | head -10

# 3. Verify conversation-service uses injected client
grep -n "constructor\|supabase.*SupabaseClient" src/lib/services/conversation-service.ts | head -5

# 4. Verify requireAuthOrCron exists (E01 artifact)
grep -n "requireAuthOrCron" src/lib/supabase-server.ts

# 5. Verify user_id columns exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT table_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='user_id'
AND table_name IN ('conversations','batch_jobs','training_files','generation_logs','documents');\`,transport:'pg'});
console.log(r.rows?.length,'tables have user_id');})();"
```

**Expected:** All verification checks pass. If any fail, stop and report — E01/E02 must be re-run.

---

## What This Prompt Implements

### Phase 5 — HIGH Route & Service Fixes (H1–H15)

| Change | File | Gap Ref |
|--------|------|---------|
| 5.1 | `generation-logs/route.ts` | H6 |
| 5.2 | `generation-logs/stats/route.ts` | H6 |
| 5.3 | `failed-generations/route.ts` | H7 |
| 5.4 | `failed-generations/[id]/route.ts` | H7 |
| 5.5 | `templates/route.ts` | H4 |
| 5.6 | `templates/test/route.ts` | H5 |
| 5.7 | `documents/route.ts` | H10 |
| 5.8 | `documents/[id]/route.ts` | H11 |
| 5.9 | `performance/route.ts` | H8 |
| 5.10 | `training-files/[id]/download/route.ts` | H9 |
| 5.11–5.15 | Export routes (history, status, templates, scenarios, edge-cases) | H12–H15 |
| 5.17 | `rag-ingestion-service.ts` (getDocument) | GAP-R1 |
| 5.19 | RLS: notifications, cost_records | H13, H14 |
| 5.20 | RLS: metrics_points | H15 |

### Phase 6 — MEDIUM Fixes (M1–M13)

| Change | File | Gap Ref |
|--------|------|---------|
| 6.1 | `training-files/route.ts` | M1 |
| 6.2 | `conversations/[id]/download/raw/route.ts` | M12 |
| 6.3 | `conversations/[id]/download/enriched/route.ts` | M13 |
| 6.4 | `conversations/batch/[id]/status/route.ts` | M5 |
| 6.5 | 5 cron routes | M6 |
| 6.6 | `process-rag-document.ts` (Inngest) | GAP-R2 |
| 6.7 | `rag-retrieval-service.ts` (LoRA endpoint) | GAP-R3 |
| 6.8 | `training-file-service.ts` | M7 |

**Build Artifacts Produced for E04:**
- All HIGH and MEDIUM routes secured
- RAG service gaps closed (GAP-R1, GAP-R2, GAP-R3)
- Cron routes fail-closed via `requireAuthOrCron`
- RLS enabled on `notifications`, `cost_records`, `metrics_points`
- `training-file-service.ts` has mandatory `userId` parameter

---

## Phase 5 — HIGH Route & Service Fixes

### Change 5.1: `src/app/api/generation-logs/route.ts` — Add Auth + User Scoping (H6)

**Current state (verified 2026-02-22):** 150 lines. GET: ZERO auth. POST line ~103: `x-user-id` + NIL UUID fallback.

**Modifications:**
1. Add `import { requireAuth } from '@/lib/supabase-server';`
2. **GET handler:**
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Add `.eq('created_by', user.id)` to the listing query.

3. **POST handler:**
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   // REMOVE: x-user-id header read and NIL UUID fallback
   const userId = user.id;
   ```
   Ensure `created_by: userId` and `user_id: userId` are set on insert.

---

### Change 5.2: `src/app/api/generation-logs/stats/route.ts` — Add Auth + User Scoping (H6)

**Current state:** ZERO auth. Returns global stats across all users.

**Modifications:**
1. Add `requireAuth` guard.
2. Scope all aggregate queries to `created_by = user.id` so users only see their own generation stats.

---

### Change 5.3: `src/app/api/failed-generations/route.ts` — Add Auth + User Scoping (H7)

**Current state:** ZERO auth.

**Modifications:**
1. Add `requireAuth` guard.
2. Add `.eq('created_by', user.id)` to the listing query.

---

### Change 5.4: `src/app/api/failed-generations/[id]/route.ts` — Add Auth + Ownership (H7)

**Current state:** ZERO auth.

**Modifications:**
1. Add `requireAuth` guard.
2. After fetching record by ID, add ownership check:
   ```typescript
   if (!record || record.created_by !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

---

### Change 5.5: `src/app/api/templates/route.ts` — Add Auth to GET (H4)

**Current state:** GET: ZERO auth. Templates are shared resources — all authenticated users can read all templates.

**Modifications:**
1. Add authentication check to GET (require login, but don't scope by user — templates are shared):
   ```typescript
   import { createServerSupabaseClientFromRequest } from '@/lib/supabase-server';
   
   const { supabase } = createServerSupabaseClientFromRequest(request);
   const { data: { user }, error: authError } = await supabase.auth.getUser();
   if (authError || !user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```
   
   **Note:** We use `supabase.auth.getUser()` here instead of `requireAuth` because templates are shared — we just need to verify the caller is authenticated, not scope results to a specific user.

---

### Change 5.6: `src/app/api/templates/test/route.ts` — Add Auth (H5)

**Current state:** 276 lines. ZERO auth. Line ~114: `userId: 'test_user'`. This route triggers Claude API calls, incurring cost.

**Modifications:**
1. Add `requireAuth` guard.
2. Replace `'test_user'` with `user.id`:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   // ...
   userId: user.id, // REMOVE: 'test_user'
   ```

---

### Change 5.7: `src/app/api/documents/route.ts` — Replace Module-Scope Singleton + Add Auth (H10)

**Current state (verified 2026-02-22):** 144 lines. Module-scope `createClient()` singleton (service role — bypasses RLS). GET: ZERO auth, returns ALL documents. POST: Bearer token auth.

**Modifications:**
1. **REMOVE** the module-level singleton Supabase client.
2. **GET handler:**
   ```typescript
   import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';
   
   const { user, response } = await requireAuth(request);
   if (response) return response;
   
   const { supabase } = createServerSupabaseClientFromRequest(request);
   const { data } = await supabase
     .from('documents')
     .select('*')
     .eq('author_id', user.id) // Use author_id until user_id is fully backfilled
     .order('created_at', { ascending: false });
   ```
   
   **Note:** Use `author_id` for now. After E04 completes Phase 7, can switch to `user_id`.

3. **POST handler:** Replace Bearer token auth with `requireAuth`. Set both `author_id: user.id` and `user_id: user.id` on insert.

---

### Change 5.8: `src/app/api/documents/[id]/route.ts` — Normalize Auth Pattern (H11)

**Current state (verified 2026-02-22):** 444 lines. Bearer token auth. Module-scope admin singleton. Ownership check returns 403.

**Modifications:**
1. **REMOVE** module-scope singleton.
2. Replace Bearer auth with `requireAuth`.
3. Change ownership failure from 403 to **404** (don't reveal existence):
   ```typescript
   if (!document || document.author_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```
4. Apply to ALL handlers in this file (GET, PATCH, DELETE if present).

---

### Change 5.9: `src/app/api/performance/route.ts` — Add Auth (H8)

**Current state (verified 2026-02-22):** 66 lines. ZERO auth. Exposes database performance metrics to anyone.

**Modifications:**
1. Add `requireAuth` guard:
   ```typescript
   import { requireAuth } from '@/lib/supabase-server';
   
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   
   **Note:** Performance data is system-wide — just require authentication, don't scope to user.

---

### Change 5.10: `src/app/api/training-files/[id]/download/route.ts` — Add Ownership Check (H9)

**Current state (verified 2026-02-22):** 70 lines. Auth present via `getUser()`. NO ownership check — any authenticated user can download any training file.

**Modifications:**
After fetching the training file, add ownership check:
```typescript
if (!trainingFile || trainingFile.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

### Changes 5.11–5.15: Export Routes — Replace Spoofable Auth

| Change | File | Current Pattern | Line |
|--------|------|----------------|------|
| 5.11 | `src/app/api/export/history/route.ts` | `x-user-id` + NIL UUID | ~L58 |
| 5.12 | `src/app/api/export/status/[id]/route.ts` | `x-user-id` + NIL UUID | ~L62 |
| 5.13 | `src/app/api/export/templates/route.ts` | ZERO auth | — |
| 5.14 | `src/app/api/export/scenarios/route.ts` | ZERO auth | — |
| 5.15 | `src/app/api/export/edge-cases/route.ts` | ZERO auth | — |

**Modifications for 5.11 & 5.12:** Replace `x-user-id` header read with `requireAuth`. Remove NIL UUID fallback. The existing ownership checks become valid because `userId` now comes from auth.

**Modifications for 5.13, 5.14, 5.15:** Add `requireAuth` guard. Scope queries to user's records.

---

### Change 5.17: `src/lib/rag/services/rag-ingestion-service.ts` — Add `userId` to `getDocument()` (GAP-R1)

**Current state (verified 2026-02-22, 1054 lines):**
- `getDocument(documentId: string)` at **line ~627** does NOT filter by `user_id`
- Returns `{ success: boolean; data?: RAGDocument; error?: string }`
- `getDocuments({ knowledgeBaseId, userId })` at **~L598** correctly filters both `knowledge_base_id` AND `user_id`

**Modifications:**

```typescript
export async function getDocument(
  documentId: string,
  userId: string // ← ADDED: mandatory ownership verification
): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('rag_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId) // ← ADDED
    .single();

  if (error || !data) return { success: false, error: 'Document not found' };
  return { success: true, data: mapRowToDocument(data) };
}
```

**Update ALL callers** — search for `getDocument(`:
```bash
grep -rn "getDocument(" src/ --include="*.ts" | grep -v "node_modules\|__tests__"
```

Every caller must now pass `userId`:
- In RAG route handlers: use `user.id` from `requireAuth`
- In Inngest pipeline: use `event.data.userId`
- In internal service calls: thread `userId` through from the caller

**Acceptance Criteria:**
- **GIVEN** `getDocument(docId, userAId)` called with User B's document **THEN** `{ success: false, error: 'Document not found' }`
- **GIVEN** missing `userId` argument **THEN** TypeScript compilation error

---

### Change 5.19: Add RLS to `notifications` and `cost_records` (H13, H14)

**Current state (verified 2026-02-22):**
- `notifications`: `user_id NOT NULL`, RLS **disabled**, 0 policies
- `cost_records`: `user_id NOT NULL`, RLS **disabled**, 0 policies

**Execute via SAOL — dry-run first, then apply:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
-- notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"notifications_select_own\" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY \"notifications_insert_service\" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY \"notifications_update_own\" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY \"notifications_delete_own\" ON notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY \"notifications_service_all\" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- cost_records RLS
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"cost_records_select_own\" ON cost_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY \"cost_records_service_all\" ON cost_records FOR ALL USING (auth.role() = 'service_role');
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:', r.success, r.summary);}
})();"
```

---

### Change 5.20: Add RLS to `metrics_points` (H15)

**Current state:** NO `user_id` column. NO RLS. 0 policies. Ownership determined via JOIN to `pipeline_training_jobs`.

**Execute via SAOL:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"metrics_points_select_via_job\" ON metrics_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pipeline_training_jobs
    WHERE pipeline_training_jobs.id = metrics_points.job_id
    AND pipeline_training_jobs.user_id = auth.uid()
  ));
CREATE POLICY \"metrics_points_service_all\" ON metrics_points FOR ALL USING (auth.role() = 'service_role');
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:', r.success, r.summary);}
})();"
```

---

## Phase 6 — MEDIUM Fixes

### Change 6.1: `src/app/api/training-files/route.ts` — Add User Scoping to GET (M1)

**Current state (verified 2026-02-22):** 120 lines. Auth present via `supabase.auth.getUser()`. GET fetches ALL `status: 'active'` files regardless of user.

**Modifications:**
Add `.eq('created_by', user.id)` to the training files listing query so users only see their own training files.

---

### Change 6.2: `src/app/api/conversations/[id]/download/raw/route.ts` — Add Ownership Check (M12)

**Current state:** Auth present via `requireAuth` (~L59). NO ownership check — any authenticated user can download any conversation's raw data.

**Modifications:**
After fetching the conversation, add:
```typescript
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

**Note:** E02 may have already secured the parent `conversations/[id]/download/route.ts`. Check if `download/raw/` and `download/enriched/` routes were included in E02's Change 4.17. If already done, skip this change.

---

### Change 6.3: `src/app/api/conversations/[id]/download/enriched/route.ts` — Add Ownership Check (M13)

**Modifications:** Identical to Change 6.2 — add ownership check after fetching conversation.

---

### Change 6.4: `src/app/api/conversations/batch/[id]/status/route.ts` — Add Auth + Ownership (M5)

**Note:** E02's Change 4.17 may have already secured this route. Verify first:
```bash
grep -n "requireAuth" src/app/api/conversations/batch/[id]/status/route.ts
```
If already secured, skip. Otherwise, add `requireAuth` + verify batch job belongs to user via `batchJobService.getJobById(params.id, user.id)`.

---

### Change 6.5: Cron Routes — Fail Closed with `requireAuthOrCron` (M6)

**Files:** 5 routes. All currently fail-open when `CRON_SECRET` is not configured.

| File | Current Problem |
|------|-----------------|
| `src/app/api/cron/daily-maintenance/route.ts` | `if (cronSecret && authHeader !== Bearer)` — fail-open |
| `src/app/api/cron/export-file-cleanup/route.ts` | Warns and skips auth when CRON_SECRET missing |
| `src/app/api/cron/export-log-cleanup/route.ts` | Same |
| `src/app/api/cron/export-metrics-aggregate/route.ts` | Same |
| `src/app/api/cron/hourly-monitoring/route.ts` | Same as daily-maintenance |

**Modifications for EACH cron route:**

1. Add import:
   ```typescript
   import { requireAuthOrCron } from '@/lib/supabase-server';
   ```

2. Replace the existing auth check block with:
   ```typescript
   const { isCron, response } = await requireAuthOrCron(request);
   if (response) return response;
   ```

3. Remove the old `CRON_SECRET` checking logic entirely (the `if (cronSecret && ...)` blocks and the warning logs about missing `CRON_SECRET`).

**Acceptance Criteria:**
- **GIVEN** `CRON_SECRET` is NOT set **WHEN** request hits cron endpoint **THEN** 500 returned (NOT 200)
- **GIVEN** valid Bearer token with correct `CRON_SECRET` **THEN** 200 (proceeds normally)
- **GIVEN** invalid Bearer token **THEN** 401

---

### Change 6.6: `src/inngest/functions/process-rag-document.ts` — Verify Document Ownership (GAP-R2)

**Current state (verified 2026-02-22, 614 lines):**
- Trusts `userId` from event payload without verification (~L55)
- Uses `createServerSupabaseAdminClient()`
- Fetches document by `documentId` only — no `user_id` check
- The QA phase expanded the pipeline to ~614 lines covering 6 extraction passes, embedding generation, KB summary regeneration, and `knowledge_base_id` denormalization.

**Why critical:** A crafted Inngest event with a stolen `documentId` could contaminate sections, facts, embeddings, and the KB summary across 5 tables.

**Modifications:** After extracting `{ documentId, userId }` from event payload and after the admin Supabase client is created, add ownership verification:

```typescript
// Verify document ownership before processing
const { data: ownerCheck } = await adminClient
  .from('rag_documents')
  .select('user_id')
  .eq('id', documentId)
  .single();

if (!ownerCheck || ownerCheck.user_id !== userId) {
  throw new Error(`[Inngest] Document ${documentId} does not belong to user ${userId} — aborting`);
}
```

**Place this check in the first step of the Inngest pipeline** (the "fetch-document" step at ~L55–L76), immediately after fetching the document record and before any processing begins.

**Acceptance Criteria:**
- **GIVEN** event has `userId: A` but document belongs to User B **THEN** processing aborted immediately; no data written
- **GIVEN** event has correct `userId` **THEN** processing continues normally

---

### Change 6.7: `src/lib/rag/services/rag-retrieval-service.ts` — LoRA Endpoint Ownership Verification (GAP-R3)

**Current state (1694 lines, function `generateLoRAResponse` at ~L730):**

At **~L798**, endpoint lookup:
```typescript
const { data: endpoint } = await supabase
  .from('pipeline_inference_endpoints')
  .select('runpod_endpoint_id, adapter_path')
  .eq('job_id', jobId)
  .eq('endpoint_type', 'adapted')
  .eq('status', 'ready')
  .single();
```

**Gap:** No verification that the `pipeline_training_jobs` record for this endpoint belongs to the requesting user.

**Modifications:**

1. **Update `generateLoRAResponse` function signature** to accept `userId`:
   ```typescript
   async function generateLoRAResponse(params: {
     queryText: string;
     assembledContext: string | null;
     mode: RAGQueryMode;
     jobId: string;
     userId: string; // ← ADDED
   }): Promise<{
     responseText: string;
     citations: RAGCitation[];
     effectiveContext: string | null;
   }>
   ```

2. **Update the endpoint query** to include user ownership join:
   ```typescript
   const { data: endpoint } = await supabase
     .from('pipeline_inference_endpoints')
     .select(`
       runpod_endpoint_id,
       adapter_path,
       pipeline_training_jobs!inner ( user_id )
     `)
     .eq('job_id', params.jobId)
     .eq('endpoint_type', 'adapted')
     .eq('status', 'ready')
     .eq('pipeline_training_jobs.user_id', params.userId) // ← ADDED
     .single();
   ```

3. **Update the call site in `queryRAG`** (at ~L1162) to pass `userId`:
   Search for where `generateLoRAResponse` is called and add `userId: params.userId`.

**Acceptance Criteria:**
- **GIVEN** User A calls `queryRAG` with `modelJobId` owned by User B **THEN** endpoint lookup returns null → graceful error message returned
- **GIVEN** User A calls with their own `modelJobId` **THEN** normal operation

---

### Change 6.8: `src/lib/services/training-file-service.ts` — Mandatory `userId` Parameter (M7)

**Modifications:**
1. Add mandatory `userId` parameter to query methods like `listTrainingFiles()`:
   ```typescript
   async listTrainingFiles(userId: string, filters?: { status?: string }): Promise<TrainingFile[]> {
     let query = this.supabase.from('training_files').select('*').eq('created_by', userId);
     // ... apply filters
   }
   ```

2. Update callers in route handlers to pass `user.id`.

---

## Checkpoint Verification — After Phase 5 & 6

### Test T8 — Service Layer Scoping:
- `getDocument(docId, userA.id)` returns `{ success: false }` when doc belongs to User B
- Training file listing scoped to user

### Test T10 — RLS Verification:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const r=await saol.agentExecuteDDL({sql:\`
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('notifications','cost_records','metrics_points');
\`,transport:'pg'});console.log('RLS enabled:', JSON.stringify(r.rows));})();"
```
**Expected:** All three tables show `rowsecurity: true`.

### Test T-RAG — RAG Service Identity:
- `getDocument(docId, wrongUserId)` returns `{ success: false, error: 'Document not found' }`
- `queryRAG({ modelJobId: B-job, userId: A, mode: 'rag_and_lora' })` — endpoint lookup returns null → graceful error

### Verification Commands:

```bash
# Verify no x-user-id reads remain in HIGH routes
grep -rn "x-user-id" src/app/api/generation-logs/ src/app/api/export/history/ src/app/api/export/status/ --include="*.ts"

# Verify no NIL UUID in HIGH routes
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/generation-logs/ --include="*.ts"

# Verify no test_user in templates
grep -rn "'test_user'" src/app/api/templates/ --include="*.ts"

# Verify cron routes use requireAuthOrCron
grep -rn "requireAuthOrCron" src/app/api/cron/ --include="*.ts" | wc -l
# Expected: 5

# Verify getDocument now requires userId
grep -n "getDocument(" src/lib/rag/services/rag-ingestion-service.ts

# Verify process-rag-document has ownership check
grep -n "user_id.*userId\|ownerCheck\|does not belong" src/inngest/functions/process-rag-document.ts

# Verify generateLoRAResponse has userId param
grep -n "userId.*string" src/lib/rag/services/rag-retrieval-service.ts | head -5

# TypeScript compilation check
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit 2>&1 | head -30
```

**Expected:** All checks pass. Zero spoofable patterns remain in HIGH/MEDIUM routes.

---

## Summary of Files Modified

### Route Files:
| File | Change | Gap |
|------|--------|-----|
| `src/app/api/generation-logs/route.ts` | `requireAuth` + user scoping | H6 |
| `src/app/api/generation-logs/stats/route.ts` | `requireAuth` + user scoping | H6 |
| `src/app/api/failed-generations/route.ts` | `requireAuth` + user scoping | H7 |
| `src/app/api/failed-generations/[id]/route.ts` | `requireAuth` + ownership | H7 |
| `src/app/api/templates/route.ts` | Auth check on GET | H4 |
| `src/app/api/templates/test/route.ts` | `requireAuth`, remove `test_user` | H5 |
| `src/app/api/documents/route.ts` | Remove singleton, `requireAuth` | H10 |
| `src/app/api/documents/[id]/route.ts` | Normalize auth, 404 not 403 | H11 |
| `src/app/api/performance/route.ts` | `requireAuth` | H8 |
| `src/app/api/training-files/[id]/download/route.ts` | Add ownership check | H9 |
| `src/app/api/export/history/route.ts` | Replace `x-user-id` | H12 |
| `src/app/api/export/status/[id]/route.ts` | Replace `x-user-id` | H12 |
| `src/app/api/export/templates/route.ts` | Add `requireAuth` | H13 |
| `src/app/api/export/scenarios/route.ts` | Add `requireAuth` | H14 |
| `src/app/api/export/edge-cases/route.ts` | Add `requireAuth` | H15 |
| `src/app/api/training-files/route.ts` | Add user scoping to GET | M1 |
| `src/app/api/conversations/[id]/download/raw/route.ts` | Add ownership check | M12 |
| `src/app/api/conversations/[id]/download/enriched/route.ts` | Add ownership check | M13 |
| 5 cron routes (`src/app/api/cron/*/route.ts`) | `requireAuthOrCron` | M6 |

### Service & RAG Files:
| File | Change | Gap |
|------|--------|-----|
| `src/lib/rag/services/rag-ingestion-service.ts` | `getDocument()` + mandatory `userId` | GAP-R1 |
| `src/lib/rag/services/rag-retrieval-service.ts` | `generateLoRAResponse()` + `userId` + ownership join | GAP-R3 |
| `src/inngest/functions/process-rag-document.ts` | Ownership verification at pipeline start | GAP-R2 |
| `src/lib/services/training-file-service.ts` | Mandatory `userId` on query methods | M7 |

### Database Changes (via SAOL):
| Table | Change |
|-------|--------|
| `notifications` | RLS enabled + 5 policies |
| `cost_records` | RLS enabled + 2 policies |
| `metrics_points` | RLS enabled + 2 policies (JOIN-based) |

---

## Warnings

### W11: Multi-Document Retrieval Functions Are Identity-Aware (Unchanged)
`classifyQuery`, `assembleMultiHopContext`, `enrichCitationsWithDocumentInfo`, `rerankSections`, `balanceMultiDocCoverage` — all called within `queryRAG` which receives verified `userId`. No additional enforcement needed.

### W12: KB Summary Auto-Generation Respects Ownership
KB summary regeneration in `process-rag-document.ts` writes to `rag_knowledge_bases` via admin client, scoped to a specific `knowledgeBaseId`. GAP-R2 fix (Change 6.6) adds ownership verification at pipeline start before any writes occur.

### W13: `getDocument()` Gap Affects Multi-Doc Code Paths
Until Change 5.17 is deployed, any internal call to `getDocument(documentId)` without the `userId` parameter can access cross-user documents at the service layer. Route-level and RLS protections provide defense-in-depth.

### W14: `generateLoRAResponse` Endpoint Lookup
Severity LOW. The frontend only exposes the user's own deployed jobs, so exploitation requires knowledge of another user's `jobId` UUID. Change 6.7 adds the ownership join.

### W15: New Functions Are Stateless — No Identity Gaps
`parseCitationsFromText` (~L858) and `selfEvaluate` (~L879) access no database and have no identity implications.

---

## What E04 Expects From E03

E04 will begin by verifying these artifacts:
1. All HIGH routes use `requireAuth` or equivalent auth
2. All MEDIUM routes secured (user scoping, ownership checks)
3. All 5 cron routes use `requireAuthOrCron` (fail-closed)
4. `getDocument()` requires `userId` parameter
5. `generateLoRAResponse()` includes user ownership join
6. `process-rag-document.ts` verifies ownership before processing
7. RLS enabled on `notifications`, `cost_records`, `metrics_points`
8. TypeScript compiles without errors
9. Zero orphan user_id values in all tables (prerequisite for NOT NULL constraints)


++++++++++++++++++



